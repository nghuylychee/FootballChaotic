/* Deploy image máy chủ trận lên mọi web service trên Render (thay cho đổi tag + Deploy bằng tay từng service):
 *   npm run server:deploy                    -> deploy team41sfc/sfc-server:<phiên bản server/package.json> lên mọi service tên sfc-server*
 *   npm run server:deploy -- 10.0.1          -> tag khác
 *   npm run server:deploy -- --only sfc-server-sg,sfc-server   -> chỉ vài service
 *   npm run server:deploy -- --dry           -> chỉ liệt kê service + image đang chạy, không deploy
 * Chỉ chạy khi người dùng yêu cầu (deploy thật lên máy chủ đang chạy). Image phải đã push (npm run server:image -- --push).
 * Khoá API: biến môi trường RENDER_API_KEY (GitHub Actions: secret cùng tên). Không ghi khoá vào file trong repo.
 * Mỗi service: POST /v1/services/{id}/deploys { imageUrl } -> chờ deploy live -> /healthz phải báo đúng phiên bản.
 * Lọc tên service khác: SFC_RENDER_PREFIX=... · đổi image: SFC_IMAGE=user/repo
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const API = 'https://api.render.com/v1';
const IMAGE = process.env.SFC_IMAGE || 'team41sfc/sfc-server';
const PREFIX = process.env.SFC_RENDER_PREFIX || 'sfc-server';
const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const onlyAt = args.indexOf('--only');
const ONLY = onlyAt >= 0 ? (args[onlyAt + 1] || '').split(',').filter(Boolean) : null;
const VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, 'server', 'package.json'), 'utf8')).version;
const TAG = args.find((a, i) => !a.startsWith('--') && i !== onlyAt + 1) || VERSION;
const IMAGE_URL = `docker.io/${IMAGE}:${TAG}`;
const DEPLOY_TIMEOUT = 10 * 60e3, HEALTH_TIMEOUT = 3 * 60e3;   // free plan: máy ngủ phải khởi động lại -> chờ lâu
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const KEY = (process.env.RENDER_API_KEY || '').trim();

async function api(method, url, body) {
  const r = await fetch(API + url, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`${method} ${url} -> ${r.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

// mọi web service chạy image có tên bắt đầu bằng PREFIX (hoặc đúng danh sách --only)
async function services() {
  const all = [];
  for (let cursor = ''; ;) {
    const page = await api('GET', `/services?limit=100&type=web_service${cursor ? '&cursor=' + cursor : ''}`);
    all.push(...page.map((p) => p.service));
    if (page.length < 100) break;
    cursor = page[page.length - 1].cursor;
  }
  return all.filter((s) => (ONLY ? ONLY.includes(s.name) : s.name.startsWith(PREFIX)) && s.serviceDetails && s.serviceDetails.env === 'image');
}

const healthz = async (url) => {
  try {
    const r = await fetch(url + '/healthz', { signal: AbortSignal.timeout(15e3) });
    return r.ok ? await r.json() : null;
  } catch (e) { return null; }
};

const DONE = { live: 'ok', build_failed: 'fail', update_failed: 'fail', pre_deploy_failed: 'fail', canceled: 'fail', deactivated: 'fail' };

async function deployOne(s) {
  const tag = `[${s.name}]`;
  const { deploy } = await api('POST', `/services/${s.id}/deploys`, { imageUrl: IMAGE_URL }).then((d) => (d.deploy ? d : { deploy: d }));
  console.log(`${tag} deploy ${deploy.id} started (${s.imagePath} -> ${IMAGE_URL})`);
  let status = deploy.status;
  for (const end = Date.now() + DEPLOY_TIMEOUT; !DONE[status]; ) {
    if (Date.now() > end) throw new Error(`${tag} deploy still "${status}" after ${DEPLOY_TIMEOUT / 60e3} min: ${s.dashboardUrl}`);
    await sleep(5000);
    status = (await api('GET', `/services/${s.id}/deploys/${deploy.id}`)).status;
  }
  if (DONE[status] === 'fail') throw new Error(`${tag} deploy ${status}: ${s.dashboardUrl}`);
  // /healthz phải báo đúng phiên bản (tag thử nghiệm kiểu 10.0.1-test: chỉ cần ok)
  const url = s.serviceDetails.url, want = /^\d+\.\d+\.\d+$/.test(TAG) ? TAG : null;
  let h = null;
  for (const end = Date.now() + HEALTH_TIMEOUT; !(h && h.ok && (!want || h.version === want)); ) {
    if (Date.now() > end) throw new Error(`${tag} live but /healthz reports ${h ? `version ${h.version}` : 'nothing'}, expected ${want || 'ok'}`);
    await sleep(3000);
    h = await healthz(url);
  }
  console.log(`${tag} live: ${url} version ${h.version}, protocol ${h.protocol}`);
}

(async () => {
  if (!KEY) { console.error('[deploy] no Render API key: set the RENDER_API_KEY environment variable'); process.exit(1); }
  if (!/^[\w.-]+$/.test(TAG) || (onlyAt >= 0 && !ONLY.length)) {
    console.error('Usage: npm run server:deploy [-- <tag>] [--only name1,name2] [--dry]   (tag defaults to server/package.json version)');
    process.exit(1);
  }
  const list = await services();
  if (ONLY) for (const n of ONLY) if (!list.some((s) => s.name === n)) { console.error(`[deploy] no image-backed web service named "${n}"`); process.exit(1); }
  if (!list.length) { console.error(`[deploy] no image-backed web services named ${PREFIX}*`); process.exit(1); }
  for (const s of list) console.log(`[deploy] ${s.name} (${s.serviceDetails.region}${s.suspended === 'suspended' ? ', SUSPENDED' : ''}) runs ${s.imagePath}`);
  if (DRY) { console.log(`[deploy] dry run: would deploy ${IMAGE_URL} to ${list.length} service(s)`); return; }

  const res = await Promise.allSettled(list.filter((s) => s.suspended !== 'suspended').map(deployOne));
  const failed = res.filter((r) => r.status === 'rejected');
  for (const f of failed) console.error('[deploy]', f.reason.message);
  if (failed.length) process.exit(1);
  console.log(`[deploy] ${IMAGE_URL} live on ${res.length} service(s)`);
})().catch((e) => { console.error('[deploy]', e.message); process.exit(1); });
