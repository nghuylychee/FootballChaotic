/* =========================================================
 * BUILD — SFC_DEBUG = true: bật nút test / cheat (DRILL TEST, PROLOGUE).
 * Lúc đóng gói (npm run build:* -> scripts/strip-debug.js) file này bị ghi đè thành false
 * và xoá hẳn các nhánh `if (SFC_DEBUG)` / `SFC_DEBUG ? … : …` khỏi file đóng gói.
 * SFC_STORE: bản này phát hành ở cửa hàng nào — 'none' (chạy từ repo) | 'steam' | 'itch' (web + desktop) | 'crazygames' (web).
 *   strip-debug.js ghi giá trị thật khi đóng gói. Bản desktop / Steam vẫn nhận biết lúc chạy qua window.SFC_DESKTOP / SFC_STEAM.
 * SFC_DEMO = true: bản demo, khoá Area 3+ và ONLINE (config/demo.config.js). Bản itch + crazygames bật;
 *   dev / steam: false.
 * SFC_VERSION_STRING: phiên bản game (semver, = "version" trong package.json). Bản dev: 'dev'; strip-debug.js ghi số thật khi đóng gói.
 * Phiên bản đầy đủ hiện / gửi đi = SFC_VERSION_STRING + '-' + net.protocol (vd. 1.1.0-5): xem NetCommon.clientVersion().
 * Nạp trước mọi script khác.
 * ========================================================= */
var SFC_DEBUG = true;
var SFC_STORE = 'none';
// bản dev: index.html?store=crazygames -> chạy thử như bản cửa hàng đó (SDK, phím bị cấm...). Bản đóng gói: file này bị ghi đè, mất dòng này
if (typeof location !== 'undefined') SFC_STORE = new URLSearchParams(location.search).get('store') || SFC_STORE;
var SFC_DEMO = false;
var SFC_VERSION_STRING = 'dev';
