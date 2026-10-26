/* Adapter Steam — có Steam (bản Electron, steamworks.js khởi động được, net.useSteam). Giao diện: src/platform/platform.js.
 * Mời bạn bè bằng overlay Steam: chỉ mời được vào lobby Steam (phòng đang dùng transport NetSteam), nên inviteMode xem p.net.
 * Bạn nhận lời:
 *  - game đang chạy -> callback GameLobbyJoinRequested { lobby_steam_id, friend_steam_id }. steamworks.js 0.4.0 build với napi6:
 *    số > 2^53 trong callback tới dưới dạng bigint, nên lobby id chính xác -> ra mã phòng (NetSteam.codeOfLobby). Bản build nào trả
 *    về number (đã bị làm tròn) thì bỏ qua lời mời (mã sẽ sai), không vào nhầm phòng.
 *  - game chưa chạy -> Steam mở game với tham số +connect_lobby <id> (electron/main.js đọc, preload đưa vào SFC_STEAM.launchLobby).
 */
window.SFC = window.SFC || {};

(function () {
  const S = () => window.SFC_STEAM;
  const NS = () => SFC.NetSteam;
  const GameLobbyJoinRequested = 8;   // callback.SteamCallback

  SFC.Platform.add('steam', {
    inviteCb: null,     // callback GameLobbyJoinRequested (đăng ký 1 lần, không gỡ khi đóng phòng)

    available() { return !!(SFC_CONFIG.net.useSteam && NS() && NS().available()); },
    get live() { return this.available(); },

    // ngôn ngữ người chơi đặt cho game trong Steam ('english', 'brazilian'...)
    gameLanguage() {
      const apps = S().client.apps;
      return typeof apps.currentGameLanguage === 'function' ? apps.currentGameLanguage() : null;
    },

    // đang ở trong 1 lobby Steam (host hay khách đều mời được: bạn nhận lời vào cùng lobby rồi tự nối tới host)
    inviteMode(p) { return p.net === NS() && NS().lobby ? 'dialog' : null; },
    invite(p) {
      if (this.inviteMode(p) !== 'dialog') return Promise.resolve(false);
      try { NS().lobby.openInviteDialog(); return Promise.resolve('opened'); }
      catch (e) { console.warn('[steam] openInviteDialog', e); return Promise.resolve(false); }
    },

    onInvite(fn) {
      if (this.inviteCb) this.inviteCb.disconnect();
      this.inviteCb = NS().client.callback.register(GameLobbyJoinRequested, (v) => {
        const code = NS().codeOfLobby(v && v.lobby_steam_id);
        if (code) fn(code);
        else console.warn('[steam] lời mời có lobby id không đọc được', v && v.lobby_steam_id);
      });
    },
    launchInvite() {
      const raw = S().launchLobby;
      S().launchLobby = null;
      return NS().codeOfLobby(raw);
    },
  });
})();
