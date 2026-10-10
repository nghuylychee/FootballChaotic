/* Nạp code game dùng chung (config + mô phỏng trận + SFC.Room) vào Node, không có trình duyệt.
 * Danh sách file + thứ tự: scripts/manifest.js, các file có nơi nạp 'server' (chỉ mô phỏng: không vẽ, UI, âm thanh, input).
 * Trả về window.SFC; SFC_CONFIG nằm ở global.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// thư mục gốc game: mặc định thư mục cha của server/ (Docker: /app)
const ROOT = process.env.GAME_ROOT || path.join(__dirname, '..');

const manifest = require(path.join(ROOT, 'scripts', 'manifest.js'));

function load() {
  const g = globalThis;
  g.window = g;
  // vài API trình duyệt mà code dùng chung chạm tới lúc nạp (không có tác dụng ở máy chủ)
  const mem = {};
  g.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
  if (!g.navigator) g.navigator = { language: 'en', userAgent: 'node', getGamepads: () => [] };
  g.document = { addEventListener() {}, createElement: () => ({ getContext: () => null, style: {} }), getElementById: () => null, querySelector: () => null, body: {}, documentElement: { lang: 'en' } };
  g.addEventListener = () => {};
  // máy chủ không phát âm thanh / rung tay cầm, không lưu gì (vfxkit.js đọc Storage ngay lúc nạp -> stub có trước)
  g.SFC = { Audio: {}, Pad: null, Storage: { getJSON: (k, d) => d, setJSON() {}, remove() {} } };

  const files = manifest.files('server');
  for (const f of files) vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f });

  const SFC = g.SFC;
  // bản build dùng: luôn là bản đầy đủ (DEMO chỉ khoá menu phía người chơi)
  if (typeof g.SFC_DEMO === 'undefined') g.SFC_DEMO = false;
  return { SFC, files };
}

module.exports = { load, ROOT };
