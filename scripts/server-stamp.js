/* Dấu vân tay code máy chủ: đổi bất cứ thứ gì máy chủ chạy = phải tăng phiên bản máy chủ (server/package.json version).
 *   node scripts/server-stamp.js                  in phiên bản + dấu đang ghi / dấu hiện tại
 *   node scripts/server-stamp.js --check          lệch thì báo + exit 1 (server:image / server:deploy tự chạy)
 *   node scripts/server-stamp.js --check --staged như trên nhưng đọc bản đã git add (hook pre-commit, .githooks/pre-commit)
 *   npm run server:bump [-- minor]                tăng patch (hoặc minor) + ghi dấu mới. net.protocol đổi -> <protocol>.0.0
 * Dấu = sha256 của: thứ tự + nội dung mọi file 'server' trong scripts/manifest.js (config/ + shared/), server/*.js, server/Dockerfile,
 * server/package-lock.json, server/package.json (bỏ version + stamp). File .js qua Terser bỏ comment + khoảng trắng trước khi băm:
 * sửa chú thích không bắt tăng phiên bản. Ghi ở server/package.json "stamp".
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { minify } = require('terser');
const manifest = require('./manifest');

const ROOT = path.join(__dirname, '..');
const PKG = 'server/package.json';
const SERVER_OWN = ['server/index.js', 'server/sim.js', 'server/Dockerfile', 'server/package-lock.json'];
const args = process.argv.slice(2);
const STAGED = args.includes('--staged');

// đọc file ở thư mục làm việc, hoặc bản trong index git (--staged). Xuống dòng về \n: Windows checkout ra CRLF, git / CI là LF
const read = (f) => (STAGED ? execFileSync('git', ['show', ':' + f], { cwd: ROOT, encoding: 'utf8' }) : fs.readFileSync(path.join(ROOT, f), 'utf8')).replace(/\r\n/g, '\n');
const pkgOf = (text) => JSON.parse(text);

function inputs() {
  return [...manifest.files('server'), ...SERVER_OWN];
}

async function stamp() {
  const h = crypto.createHash('sha256');
  for (const f of inputs()) {
    let text = read(f);
    if (f.endsWith('.js')) text = (await minify(text, { compress: false, mangle: false, format: { comments: false } })).code;
    h.update(f + '\0' + text + '\0');
  }
  const { version, stamp: old, ...rest } = pkgOf(read(PKG));
  h.update(PKG + '\0' + JSON.stringify(rest));
  return h.digest('hex').slice(0, 16);
}

// net.protocol của bản game hiện tại (số đầu của phiên bản máy chủ phải bằng nó)
function protocol() {
  const m = read('config/net.config.js').match(/protocol:\s*(\d+)/);
  return m ? +m[1] : null;
}

function nextVersion(v, kind) {
  const [maj, min, pat] = v.split('.').map(Number), p = protocol();
  if (maj !== p) return `${p}.0.0`;
  return kind === 'minor' ? `${maj}.${min + 1}.0` : `${maj}.${min}.${pat + 1}`;
}

(async () => {
  if (args.includes('--bump')) {
    const kind = args.find((a) => !a.startsWith('--')) || 'patch';
    if (!['patch', 'minor'].includes(kind)) { console.error('Usage: npm run server:bump [-- patch|minor]'); process.exit(1); }
    const raw = fs.readFileSync(path.join(ROOT, PKG), 'utf8'), pkg = pkgOf(raw);
    const s = await stamp();
    if (pkg.stamp === s && +pkg.version.split('.')[0] === protocol()) { console.log(`[stamp] server code unchanged since ${pkg.version}, nothing to bump`); return; }
    const from = pkg.version;
    pkg.version = nextVersion(from, kind);
    pkg.stamp = s;
    fs.writeFileSync(path.join(ROOT, PKG), JSON.stringify(pkg, null, 2) + (raw.endsWith('\n') ? '\n' : ''));
    console.log(`[stamp] server ${from} -> ${pkg.version} (stamp ${s})`);
    return;
  }
  if (STAGED) {
    // commit không đụng file nào máy chủ chạy -> bỏ qua, khỏi băm
    const staged = execFileSync('git', ['diff', '--cached', '--name-only'], { cwd: ROOT, encoding: 'utf8' }).split('\n');
    const watched = new Set([...inputs(), PKG, 'scripts/manifest.js']);
    if (!staged.some((f) => watched.has(f))) return;
  }
  const pkg = pkgOf(read(PKG)), s = await stamp();
  const ok = pkg.stamp === s;
  if (!args.includes('--check')) { console.log(`[stamp] server ${pkg.version} · stamp ${pkg.stamp || '(none)'} · now ${s}${ok ? ' · up to date' : ' · CHANGED'}`); return; }
  if (!ok) {
    console.error(`[stamp] server code changed since server ${pkg.version}${STAGED ? ' (staged files)' : ''}. Bump the server version: npm run server:bump`);
    process.exit(1);
  }
})().catch((e) => { console.error('[stamp]', e.message); process.exit(1); });
