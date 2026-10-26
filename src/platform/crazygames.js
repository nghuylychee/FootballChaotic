/* Adapter CrazyGames (SFC_STORE === 'crazygames') — SDK v3 nạp lúc chạy (config/platform.config.js). Giao diện: src/platform/platform.js.
 * Mở game trên localhost: SDK chạy chế độ local, trả giá trị mặc định. Mọi lệnh gửi SDK đều ghi log '[cg] ...' (kiểm ở bản xem trước).
 *  - ngôn ngữ: user.systemInfo.locale · đang chơi: game.gameplayStart / gameplayStop
 *  - tài khoản: user.getUser() lấy 1 lần lúc init (khách chưa đăng nhập / nền tảng không có tài khoản: null)
 *  - phòng: game.updateRoom({ roomId, isJoinable, inviteParams: { room } }) · game.leftRoom() — thanh bạn bè của CrazyGames dùng để
 *    mời / vào cùng. Bạn vào: game.addJoinRoomListener (game đang chạy) hoặc game.inviteParams (mở game bằng lời mời / link)
 *  - link mời: game.inviteLink({ room }) · vào chơi cùng nhóm ngay: game.isInstantMultiplayer
 * https://docs.crazygames.com/sdk/game/ · https://docs.crazygames.com/sdk/user/ · https://docs.crazygames.com/requirements/multiplayer/
 */
window.SFC = window.SFC || {};

(function () {
  const CFG = () => SFC_CONFIG.platform.crazygames;
  const log = (...a) => console.info('[cg]', ...a);

  SFC.Platform.add('crazygames', {
    sdk: null,          // window.CrazyGames.SDK sau khi init xong
    playing: false,
    account: null,      // { name } tài khoản CrazyGames đang đăng nhập
    reported: null,     // phòng đã báo lần cuối ('mã|0/1'), null = không ở phòng nào
    launched: false,    // đã đọc lời mời lúc mở game

    get live() { return !!this.sdk; },

    ready() {
      if (this.started) return this.started;
      const load = window.CrazyGames && window.CrazyGames.SDK ? Promise.resolve() : new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = CFG().sdk;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
      const init = load.then(() => window.CrazyGames.SDK.init())
        .then(() => { this.sdk = window.CrazyGames.SDK; log('init', this.sdk.environment || ''); return this.fetchUser(); });
      const timeout = new Promise((resolve) => setTimeout(resolve, CFG().initTimeout * 1000));
      // SDK lỗi / chậm: vẫn vào game, chỉ mất phần tích hợp
      this.started = Promise.race([init, timeout]).catch((e) => console.warn('Platform: CrazyGames SDK không dùng được', e));
      return this.started;
    },

    fetchUser() {
      const u = this.sdk.user;
      if (!u || !u.isUserAccountAvailable) return Promise.resolve();
      return Promise.resolve(u.getUser()).then((user) => {
        this.account = user && user.username ? { name: String(user.username) } : null;
        log('user', this.account ? this.account.name : '(guest)');
      }).catch(() => {});
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

    user() { return this.account; },
    get instant() {
      try { return !!(this.sdk && this.sdk.game.isInstantMultiplayer); } catch (e) { return false; }
    },

    room(p) {
      if (!this.sdk) return;
      const key = p ? `${p.code}|${p.joinable ? 1 : 0}` : null;
      if (key === this.reported) return;
      try {
        if (p) {
          const opts = { roomId: p.code, isJoinable: !!p.joinable, inviteParams: { room: p.code } };
          log('updateRoom', JSON.stringify(opts));
          this.sdk.game.updateRoom(opts);
        } else {
          log('leftRoom');
          this.sdk.game.leftRoom();
        }
        this.reported = key;
      } catch (e) { console.warn('[cg] room', e); }
    },

    inviteMode(p) { return this.sdk && p.code ? 'link' : null; },
    invite(p) {
      return Promise.resolve(this.sdk.game.inviteLink({ room: p.code }))
        .then((link) => { log('inviteLink', link); return SFC.Platform.copy(link); })
        .then((ok) => (ok ? 'copied' : false));
    },

    onInvite(fn) {
      if (!this.sdk) return;
      this.sdk.game.addJoinRoomListener((params) => {
        log('join', JSON.stringify(params));
        const code = SFC.Platform.code(params && params.room);
        if (code) fn(code);
      });
    },
    launchInvite() {
      if (!this.sdk || this.launched) return null;
      this.launched = true;
      let params = null;
      try { params = this.sdk.game.inviteParams; } catch (e) { /* bỏ qua */ }
      if (params) log('inviteParams', JSON.stringify(params));
      return SFC.Platform.code(params && params.room);
    },
  });
})();
