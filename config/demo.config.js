/* =========================================================
 * DEMO — bản itch.io (web + desktop) và CrazyGames. Bật bằng SFC_DEMO (config/build.config.js): bản build nào là demo ghi ở
 * scripts/targets.js (strip-debug.js ghi khi đóng gói); bản dev / steam để false. Dev: SETTINGS > TEST > DEMO MODE.
 *  - Main Path: chỉ đá được `areas` Area đầu. Thắng thăng hạng Area cuối của demo -> màn WISHLIST (src/ui/menu.js)
 *  - PRIVATE MATCH khoá (bấm vào ra màn WISHLIST), trừ cửa hàng có rules.demoPrivateMatch (config/platform.config.js)
 *  - FOOTBALL STORY: chỉ chơi được `stories` Story đầu (src/meta/cup.js -> demoLocked)
 * ========================================================= */
window.SFC_CONFIG = window.SFC_CONFIG || {};

SFC_CONFIG.demo = {
  areas: 2,                                                    // số Area đá được (Area 3 trở đi khoá)
  stories: 1,                                                  // số Story của FOOTBALL STORY chơi được
  runActs: 1,                                                  // GOAT PATH: số act chơi được (hạ boss act cuối được chơi = DEMO COMPLETE)
  steamUrl: '',     // link trang Steam (https://store.steampowered.com/app/<APPID>/). Để trống: menu ghi COMING SOON TO STEAM, nút không mở gì
};
