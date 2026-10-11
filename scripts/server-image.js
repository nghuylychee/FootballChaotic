/* Đóng gói máy chủ trận thành Docker image (server/Dockerfile) để deploy lên Render (Existing Image):
 *   npm run server:image -- 5            -> build team41sfc/sfc-server:5 + chạy thử (KHÔNG push)
 *   npm run server:image -- 5 --push     -> như trên rồi push lên Docker Hub (chỉ khi đã chốt deploy: hạn chế số lần push)
 * Chạy thử: bật container ở cổng tạm, chờ /healthz trả ok với đúng net.protocol của bản game hiện tại, rồi tắt.
 * Sau khi push: Render > service > Settings > Image -> đổi tag sang bản mới -> Deploy.
 * Cần Docker (Docker Desktop / Docker Engine) và đã `docker login` (tài khoản team41sfc) nếu push.
 * Đổi tên image: SFC_IMAGE=user/repo npm run server:image -- 5
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const IMAGE = process.env.SFC_IMAGE || 'team41sfc/sfc-server';
const args = process.argv.slice(2);
const PUSH = args.includes('--push');
const TAG = args.find((a) => !a.startsWith('--'));

// docker: lấy trong PATH; Windows mới cài Docker Desktop (terminal cũ chưa có PATH mới) -> đường dẫn cài đặt mặc định
function dockerBin() {
  const ok = (bin) => spawnSync(bin, ['--version'], { stdio: 'ignore' }).status === 0;
  if (ok('docker')) return 'docker';
  if (process.platform === 'win32') {
    const local = path.join(process.env.LOCALAPPDATA || '', 'Programs', 'DockerDesktop', 'resources', 'bin', 'docker.exe');
    const global = path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Docker', 'Docker', 'resources', 'bin', 'docker.exe');
    for (const p of [local, global]) if (fs.existsSync(p) && ok(p)) return p;
  }
  return null;
}

function run(bin, a, quiet) {
  const r = spawnSync(bin, a, { cwd: ROOT, stdio: quiet ? 'pipe' : 'inherit', encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`${path.basename(bin)} ${a.join(' ')} failed${quiet && r.stderr ? ':\n' + r.stderr.trim() : ''}`);
  return (r.stdout || '').trim();
}

const healthz = (port) => new Promise((res) => {
  const req = http.get({ host: 'localhost', port, path: '/healthz', timeout: 1000 }, (r) => {
    let body = '';
    r.on('data', (d) => { body += d; });
    r.on('end', () => { try { res(JSON.parse(body)); } catch (e) { res(null); } });
  });
  req.on('error', () => res(null));
  req.on('timeout', () => { req.destroy(); res(null); });
});

// net.protocol của bản game hiện tại (máy chủ phải khớp)
function protocol() {
  const src = fs.readFileSync(path.join(ROOT, 'config', 'net.config.js'), 'utf8');
  const m = src.match(/protocol:\s*(\d+)/);
  return m ? +m[1] : null;
}

(async () => {
  if (!TAG || !/^[\w.-]+$/.test(TAG)) {
    console.error('Usage: npm run server:image -- <tag> [--push]   (e.g. npm run server:image -- 5)');
    process.exit(1);
  }
  const docker = dockerBin();
  if (!docker) { console.error('Docker not found. Install Docker Desktop (or Docker Engine) and open a new terminal.'); process.exit(1); }
  const ref = `${IMAGE}:${TAG}`;

  run(process.execPath, [path.join(ROOT, 'scripts', 'manifest.js'), '--check']);
  console.log(`[image] building ${ref}`);
  run(docker, ['build', '-f', 'server/Dockerfile', '-t', ref, '.']);

  // chạy thử ở cổng tạm
  const port = 18000 + Math.floor(Math.random() * 2000), name = `sfc-image-check-${process.pid}`;
  run(docker, ['run', '-d', '--rm', '--name', name, '-p', `${port}:8080`, ref], true);
  let h = null;
  try {
    for (let i = 0; i < 40 && !(h && h.ok); i++) { await new Promise((r) => setTimeout(r, 250)); h = await healthz(port); }
  } finally {
    spawnSync(docker, ['rm', '-f', name], { stdio: 'ignore' });
  }
  const want = protocol();
  if (!h || !h.ok) { console.error('[image] check failed: /healthz did not answer'); process.exit(1); }
  if (h.protocol !== want) { console.error(`[image] check failed: server protocol ${h.protocol}, game protocol ${want}`); process.exit(1); }
  console.log(`[image] check OK: /healthz ok, protocol ${h.protocol}`);

  if (!PUSH) {
    console.log(`[image] built ${ref} (not pushed). To publish: npm run server:image -- ${TAG} --push`);
    return;
  }
  console.log(`[image] pushing ${ref}`);
  run(docker, ['push', ref]);
  console.log(`[image] pushed ${ref}. On Render: Settings > Image > tag ${TAG} > Deploy`);
})().catch((e) => { console.error('[image]', e.message); process.exit(1); });
