/* Ma trận bản build — nguồn duy nhất: mỗi bản = target (web / desktop) x cửa hàng (SFC_STORE) + DEMO + có Steam không.
 *   target  web     = trang tĩnh (index.html ở gốc zip) · desktop = Electron (electron-builder, Windows)
 *   store   steam | itch | crazygames -> config/build.config.js SFC_STORE (luật cửa hàng: config/platform.config.js rules)
 *   demo    SFC_DEMO (config/demo.config.js)
 *   steamworks  desktop: đóng gói steamworks.js (chỉ bản Steam; không có thì preload không nạp Steam -> PeerJS như web)
 *   zip     desktop: nén thư mục game ra dist/street-football-chaos-<tên>-<version>.zip (web luôn nén)
 * Lúc chạy, game tự biết target (SFC.Target: có window.SFC_DESKTOP hay không) và cửa hàng (SFC_STORE ghi lúc đóng gói).
 * Dùng: node scripts/build.js <tên> (npm run build:<tên>) · strip-debug.js đọc SFC_BUILD để ghi cờ cho bản desktop.
 * Ghép cửa hàng với target không có trong STORES = lỗi (vd. crazygames desktop).
 */
const STORES = {
  steam: ['desktop'],
  itch: ['web', 'desktop'],
  crazygames: ['web'],
};

const TARGETS = {
  steam: { target: 'desktop', store: 'steam', demo: false, steamworks: true, zip: false },
  'itch-web': { target: 'web', store: 'itch', demo: true },
  'itch-desktop': { target: 'desktop', store: 'itch', demo: true, steamworks: false, zip: true },
  crazygames: { target: 'web', store: 'crazygames', demo: true },
};

// bản build theo tên, đã kiểm hợp lệ
function get(name) {
  const t = TARGETS[name];
  if (!t) throw new Error(`build: không có bản "${name}". Có: ${Object.keys(TARGETS).join(' | ')}`);
  if (!STORES[t.store]) throw new Error(`build ${name}: cửa hàng không hợp lệ: ${t.store}`);
  if (!STORES[t.store].includes(t.target)) throw new Error(`build ${name}: ${t.store} không phát hành bản ${t.target}`);
  if (t.steamworks && (t.target !== 'desktop' || t.store !== 'steam')) throw new Error(`build ${name}: steamworks chỉ cho bản desktop Steam`);
  return Object.assign({ name, steamworks: false, zip: t.target === 'web' }, t);
}

module.exports = { STORES, TARGETS, get };
