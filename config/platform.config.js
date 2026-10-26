/* =========================================================
 * PLATFORM CONFIG — nền tảng phát hành (SFC_STORE, config/build.config.js). Code: src/platform/*.js (SFC.Platform)
 * rules: luật riêng của từng cửa hàng, theo SFC_STORE của bản build ('none' = chạy từ repo). Đọc qua SFC.Platform, không đọc thẳng.
 * crazygames: SDK v3 (https://docs.crazygames.com/sdk/). Mở game trên localhost: SDK trả giá trị mặc định.
 * Bản build nào = target (web / desktop) + cửa hàng nào: scripts/targets.js
 * ========================================================= */
window.SFC_CONFIG = window.SFC_CONFIG || {};

(function () {
  const BASE = {
    restrictedKeys: [],        // phím cửa hàng cấm: gỡ khỏi mọi action lúc Input.init; gợi ý 'Esc' trên UI tự đổi sang phím còn lại
    fakeSocial: true,          // bạn bè / party / chat GIẢ (config/social.config.js)
    autoWishlist: true,        // được tự mở màn WISHLIST (bản DEMO: bấm PRIVATE MATCH khi khoá, hết Area ở Main Path)
    demoPrivateMatch: false,   // bản DEMO vẫn mở PRIVATE MATCH (bản đủ luôn mở)
  };

  SFC_CONFIG.platform = {
    rules: {
      none: BASE,
      steam: BASE,
      itch: BASE,
      // Esc = thoát toàn màn hình · bạn bè giả trông như người thật -> tắt · link cửa hàng chỉ ở menu chính / hết demo ·
      // PRIVATE MATCH mở để thử mời bạn bè qua CrazyGames (phạm vi demo chưa chốt)
      crazygames: Object.assign({}, BASE, { restrictedKeys: ['Escape'], fakeSocial: false, autoWishlist: false, demoPrivateMatch: true }),
    },
    crazygames: {
      sdk: 'https://sdk.crazygames.com/crazygames-sdk-v3.js',
      initTimeout: 6,       // giây: SDK chưa tải / init xong thì vào game luôn, không có SDK (ngôn ngữ: hiện popup chọn)
    },
    presenceEvery: 1,       // giây: Session báo phòng đang ở cho nền tảng (Platform.room) — chỉ gửi khi đổi
  };
})();
