/* Platform — dịch vụ của nền tảng người chơi đang dùng (Adapter pattern): tài khoản, ngôn ngữ, báo đang chơi, bạn bè / lời mời.
 * Khác với transport (src/net/transport*.js: gói tin đi đường nào). 2 họ adapter độc lập: người chơi CrazyGames có thể ở phòng
 * máy chủ riêng hay phòng PeerJS, mời bạn vẫn như nhau. Mọi nơi khác (main, i18n, Session, UI) chỉ gọi SFC.Platform, không gọi SDK.
 *
 * Trục thứ 2 là target (web / desktop, SFC.Target, src/target/target.js); bản build nào ghép trục nào: scripts/targets.js.
 *
 * Adapter (đăng ký bằng SFC.Platform.add(id, adapter)): chỉ cần viết hàm mình hỗ trợ, phần còn lại lấy từ BASE (không làm gì).
 *   none        chạy từ repo không có Steam
 *   itch        bản itch (web + desktop): không có SDK, chỉ khác luật
 *   steam       src/platform/steam.js — có Steam (bản Steam, cả bản dev chạy Electron có Steam). Mời: overlay Steam, chỉ vào lobby Steam
 *   crazygames  src/platform/crazygames.js — SDK v3. Mời: thanh bạn bè của CrazyGames + link mời
 * Chọn adapter mỗi lần gọi (rẻ; không cache để file nạp sau như steam.js vẫn được chọn): theo SFC_STORE của bản build,
 * bản steam / dev thì Steam đang chạy mới là steam. Luật cửa hàng (platform.config.js rules) luôn theo SFC_STORE: bản Steam
 * mà Steam chưa bật vẫn là luật Steam.
 *
 * Giao diện:
 *   id                       'none' | 'steam' | 'crazygames'
 *   live                     adapter dùng được ngay (Steam đã khởi động / SDK đã init) — Session.watchInvites chờ cái này
 *   ready()       -> Promise khởi động SDK (main.js chờ trước khi boot; tự chịu initTimeout, lỗi vẫn resolve)
 *   locale()      -> string|null   ngôn ngữ nền tảng báo ('es-ES'...)
 *   gameplay(on)             đang trong trận (true) / menu, tạm dừng (false); chỉ gửi khi đổi
 *   gameLanguage() -> string|null   ngôn ngữ người chơi đặt cho game trên nền tảng (Steam: 'brazilian'...; khớp với pack.steam)
 *   user()        -> { name } | null   tài khoản nền tảng (đã đăng nhập)
 *   instant                  mở game để vào chơi online cùng nhóm ngay (CrazyGames isInstantMultiplayer)
 *   luật (facade, từ platform.config.js rules[SFC_STORE]): restrictedKeys · fakeSocial · autoWishlist ·
 *   privateMatch (bản này mở PRIVATE MATCH: bản đủ luôn mở, bản DEMO theo demoPrivateMatch)
 *   room(p)                  báo phòng đang ở. p = Session.presence: { code, joinable, net } | null (không ở phòng nào)
 *   inviteMode(p) -> 'dialog' | 'link' | null   mời bạn kiểu gì ở phòng p (dialog: bảng mời của nền tảng · link: chép link mời)
 *   invite(p)     -> Promise<'opened' | 'copied' | false>
 *   onInvite(fn(code))       bạn mời / bấm vào phòng của bạn lúc game đang chạy -> mã phòng (đã kiểm)
 *   launchInvite() -> code|null   mở game bằng lời mời; chỉ trả 1 lần
 * Thêm nền tảng mới = thêm 1 file adapter + 1 dòng chọn trong pick().
 */
window.SFC = window.SFC || {};

(function () {
  const N = () => SFC_CONFIG.net;

  const BASE = {
    id: 'none',
    live: false,
    ready() { return Promise.resolve(); },
    locale() { return null; },
    gameplay() {},
    gameLanguage() { return null; },
    user() { return null; },
    instant: false,
    room() {},
    inviteMode() { return null; },
    invite() { return Promise.resolve(false); },
    onInvite() {},
    launchInvite() { return null; },
  };

  const adapters = { none: BASE };
  const RULES = () => SFC_CONFIG.platform.rules;

  const Platform = {
    // chép cả getter (live, instant...) — Object.assign sẽ đọc getter 1 lần rồi giữ giá trị cũ mãi
    add(id, adapter) {
      const a = Object.defineProperties(Object.create(BASE), Object.getOwnPropertyDescriptors(adapter));
      a.id = id;
      adapters[id] = a;
    },
    pick() {
      if (SFC_STORE === 'crazygames' || SFC_STORE === 'itch') return adapters[SFC_STORE] || adapters.none;
      if (adapters.steam && adapters.steam.available()) return adapters.steam;   // bản steam + bản dev chạy Electron có Steam
      return adapters.none;
    },

    get id() { return this.pick().id; },
    get live() { return this.pick().live; },
    ready() { return this.pick().ready(); },
    locale() { return this.pick().locale(); },
    gameplay(on) { this.pick().gameplay(on); },
    gameLanguage() { try { return this.pick().gameLanguage(); } catch (e) { return null; } },
    user() { return this.pick().user(); },
    get instant() { return !!this.pick().instant; },

    /* ---------- luật cửa hàng (platform.config.js rules, theo SFC_STORE) ---------- */
    get rules() { return RULES()[SFC_STORE] || RULES().none; },
    get restrictedKeys() { return this.rules.restrictedKeys; },
    get fakeSocial() { return this.rules.fakeSocial; },
    get autoWishlist() { return this.rules.autoWishlist; },
    get privateMatch() { return !SFC_DEMO || this.rules.demoPrivateMatch; },
    room(p) { this.pick().room(p); },
    inviteMode(p) { return p ? this.pick().inviteMode(p) : null; },
    invite(p) { return p ? Promise.resolve(this.pick().invite(p)).catch(() => false) : Promise.resolve(false); },
    onInvite(fn) { this.pick().onInvite(fn); },
    launchInvite() { return this.pick().launchInvite(); },

    /* ---------- dùng chung cho các adapter ---------- */
    // mã phòng nhận từ ngoài (link mời...) -> mã đúng định dạng hoặc null
    code(raw) {
      const s = typeof raw === 'string' ? raw.trim().toUpperCase() : '';
      const chars = N().codeChars;
      return s.length === N().codeLength && [...s].every((c) => chars.includes(c)) ? s : null;
    },
    // chép chữ vào clipboard -> Promise<bool>. Trong iframe có thể bị chặn: thử cách cũ (execCommand)
    copy(text) {
      const old = () => {
        try {
          const t = document.createElement('textarea');
          t.value = text;
          t.style.position = 'fixed';
          t.style.opacity = '0';
          document.body.appendChild(t);
          t.select();
          const ok = document.execCommand('copy');
          t.remove();
          return ok;
        } catch (e) { return false; }
      };
      if (!text) return Promise.resolve(false);
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text).then(() => true, old);
      }
      return Promise.resolve(old());
    },
  };

  // itch: không có SDK / bạn bè; khác bản chạy từ repo ở luật (rules.itch)
  Platform.add('itch', {});

  SFC.Platform = Platform;
})();
