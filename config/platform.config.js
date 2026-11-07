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
    langPopup: true,           // chưa chọn ngôn ngữ, nền tảng không báo ngôn ngữ có gói: popup chọn · false = vào thẳng English
    guestName: false,          // người chơi mới chưa đăng nhập: true = tự đặt tên PLAYER + 4 số (đổi được sau), bỏ màn đặt tên
    shortIntro: false,         // PROLOGUE: true = cut scene mở đầu ngắn (ftue.scenes.introShort) để vào trận mơ nhanh
  };

  SFC_CONFIG.platform = {
    rules: {
      none: BASE,
      steam: BASE,
      itch: BASE,
      // Esc = thoát toàn màn hình · bạn bè giả trông như người thật -> tắt · link cửa hàng chỉ ở menu chính / hết demo ·
      // bản DEMO khoá mạng như itch.io (mời bạn bè qua CrazyGames chỉ chạy ở bản đủ) ·
      // người chơi mới vào thẳng trận: ngôn ngữ mặc định English, khách được tên tự đặt (đã đăng nhập: tên tài khoản), intro ngắn
      // (CrazyGames đo thời gian từ Play Now tới gameplayStart đầu tiên, phải <= 20 s)
      crazygames: Object.assign({}, BASE, { restrictedKeys: ['Escape'], fakeSocial: false, autoWishlist: false, langPopup: false, guestName: true, shortIntro: true }),
    },
    crazygames: {
      sdk: 'https://sdk.crazygames.com/crazygames-sdk-v3.js',
      initTimeout: 6,       // giây: SDK chưa tải / init xong thì vào game luôn, không có SDK (ngôn ngữ: hiện popup chọn)
    },
    presenceEvery: 1,       // giây: Session báo phòng đang ở cho nền tảng (Platform.room) — chỉ gửi khi đổi
  };
})();
