/* Phục vụ game trên máy này (mọi hệ điều hành, chỉ cần Node):
 *   npm run serve                        -> game: http://localhost:8080 (online = người chơi làm host, như bản phát hành)
 *   npm run online                       -> game + máy chủ trận riêng ws://localhost:8081 (thử phòng máy chủ riêng)
 *   npm run serve -- --port 3000         · npm run online -- --port 3000 --server-port 3001
 * --online:
 * - Bật server/index.js (cài ws lần đầu nếu chưa có), in thống kê mỗi 5 giây
 * - Khi trả config/net.config.js thì nối thêm 1 dòng gắn net.server.url = máy chủ trên -> file gốc giữ url trống
 * - Ctrl+C tắt cả 2 (máy chủ tắt ngay, không chờ trận đang đá)
 * Thử 2 người: 1 cửa sổ thường + 1 cửa sổ ẩn danh (khác hồ sơ), đặt cạnh nhau (tab nền bị trình duyệt hãm).
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn, execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SERVER_DIR = path.join(ROOT, 'server');
const arg = (name, d) => { const i = process.argv.indexOf('--' + name); return i > 0 && process.argv[i + 1] ? +process.argv[i + 1] : d; };
const ONLINE = process.argv.includes('--online');
const PORT = arg('port', 8080);
const SERVER_PORT = arg('server-port', 8081);
const SERVER_URL = `ws://localhost:${SERVER_PORT}`;

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav',
};

// danh sách script (scripts/manifest.js): trang HTML nào lệch thì ghi lại luôn trước khi phục vụ
try {
  const changed = require('./manifest').write();
  if (changed.length) console.log(`[serve] script list updated from scripts/manifest.js: ${changed.join(', ')}`);
} catch (e) { console.warn('[serve] manifest:', e.message); }

/* ---------- máy chủ trận (--online) ---------- */
let child = null, stopping = false;
if (ONLINE) {
  if (!fs.existsSync(path.join(SERVER_DIR, 'node_modules', 'ws'))) {
    console.log('[serve] installing match server dependencies (first run)...');
    execSync('npm install --no-audit --no-fund', { cwd: SERVER_DIR, stdio: 'inherit' });
  }
  child = spawn(process.execPath, [path.join(SERVER_DIR, 'index.js')], {
    stdio: 'inherit',
    env: Object.assign({}, process.env, { PORT: String(SERVER_PORT), LOG_STATS: '5', SHUTDOWN_GRACE: '0' }),
  });
  child.on('exit', (code) => { if (!stopping) { console.log(`[serve] match server exited (${code})`); process.exit(code || 1); } });
}

/* ---------- phục vụ game ---------- */
const web = http.createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
  let body = fs.readFileSync(file);
  // gắn máy chủ trên máy này vào config khi phục vụ (file trên đĩa không đổi)
  if (ONLINE && rel.replace(/\\/g, '/') === 'config/net.config.js') {
    body = Buffer.concat([body, Buffer.from(`\n// npm run online\nSFC_CONFIG.net.server.url = '${SERVER_URL}';\n`)]);
  }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
  res.end(body);
});
web.on('error', (e) => {
  console.error(`[serve] port ${PORT}: ${e.message}${e.code === 'EADDRINUSE' ? ' (already running? or use --port <port>)' : ''}`);
  stop(1);
});
web.listen(PORT, () => {
  console.log(`[serve] game: http://localhost:${PORT}/` + (ONLINE ? `  (server rooms -> ${SERVER_URL})` : ''));
  if (ONLINE) console.log('[serve] open it in a normal window + a private window, side by side. Ctrl+C stops everything.');
});

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  web.close();
  if (child && child.exitCode === null) child.kill();
  setTimeout(() => process.exit(code), 200);
}
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
