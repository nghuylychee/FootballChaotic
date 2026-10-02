/* =========================================================
 * DEMO — bản itch.io (web + desktop). Bật bằng SFC_DEMO (config/build.config.js): scripts/build-web.js và
 * scripts/build-itch.js ghi SFC_DEMO = true khi đóng gói; bản Steam và bản dev để false. Dev: SETTINGS > TEST > DEMO MODE.
 *  - Main Path: chỉ đá được `areas` Area đầu. Thắng thăng hạng Area cuối của demo -> màn WISHLIST (src/ui/menu.js)
 *  - Nút ONLINE ở trang chủ bị khoá (bấm vào cũng ra màn WISHLIST)
 * ========================================================= */
window.SFC_CONFIG = window.SFC_CONFIG || {};

SFC_CONFIG.demo = {
  areas: 2,                                                    // số Area đá được (Area 3 trở đi khoá)
  steamUrl: '',     // link trang Steam (https://store.steampowered.com/app/<APPID>/). Để trống: menu ghi COMING SOON TO STEAM, nút không mở gì
};
