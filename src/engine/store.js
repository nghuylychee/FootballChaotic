/* Store — tích hợp cửa hàng đang chạy (SFC_STORE): SDK, ngôn ngữ của cửa hàng, báo đang chơi / nghỉ.
 * Cửa hàng không có tích hợp (none / steam / itch): mọi hàm không làm gì, locale() = null.
 *  - ready(): Promise, xong khi SDK đã init (hoặc lỗi / quá initTimeout) — main.js chờ trước khi boot
 *  - locale(): ngôn ngữ cửa hàng báo ('es-ES'...) hoặc null
 *  - gameplay(on): đang trong trận (true) / ra menu, tạm dừng (false); chỉ gửi khi đổi
 * crazygames (config/store.config.js): SDK v3 nạp lúc chạy từ sdk.crazygames.com.
 */
window.SFC = window.SFC || {};

(function () {
  const CFG = () => SFC_CONFIG.store[SFC_STORE];

  const Store = {
    sdk: null,        // window.CrazyGames.SDK sau khi init xong
    playing: false,

    ready() {
      if (SFC_STORE !== 'crazygames' || !CFG()) return Promise.resolve();
      const init = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = CFG().sdk;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      }).then(() => window.CrazyGames.SDK.init()).then(() => { this.sdk = window.CrazyGames.SDK; });
      const timeout = new Promise((resolve) => setTimeout(resolve, CFG().initTimeout * 1000));
      // SDK lỗi / chậm: vẫn vào game, chỉ mất phần tích hợp
      return Promise.race([init, timeout]).catch((e) => console.warn('Store: CrazyGames SDK không dùng được', e));
    },

    locale() {
      try {
        const loc = this.sdk && this.sdk.user.systemInfo.locale;
        return typeof loc === 'string' && loc ? loc : null;
      } catch (e) { return null; }
    },

    gameplay(on) {
      if (on === this.playing) return;
      this.playing = on;
      if (!this.sdk) return;
      try {
        if (on) this.sdk.game.gameplayStart();
        else this.sdk.game.gameplayStop();
      } catch (e) { /* SDK lỗi: bỏ qua */ }
    },
  };

  SFC.Store = Store;
})();
