/* =========================================================
 * STORE CONFIG — tích hợp riêng theo cửa hàng (SFC_STORE, config/build.config.js). Code: src/engine/store.js
 * crazygames: SDK v3 (https://docs.crazygames.com/sdk/). Mở game trên localhost: SDK trả giá trị mặc định.
 * ========================================================= */
window.SFC_CONFIG = window.SFC_CONFIG || {};

SFC_CONFIG.store = {
  crazygames: {
    sdk: 'https://sdk.crazygames.com/crazygames-sdk-v3.js',
    initTimeout: 6,   // giây: SDK chưa tải / init xong thì vào game luôn, không có SDK (ngôn ngữ: hiện popup chọn)
  },
};
