/* Net — lớp kết nối dùng chung cho 3 backend (cùng giao diện, session.js không cần biết đang chạy cái nào):
 *  - SFC.NetServer (transport-server.js): WebSocket tới máy chủ riêng (net.server.url). Máy chủ chạy trận, máy này luôn là khách.
 *  - SFC.NetSteam  (transport-steam.js):  Steam lobby + P2P qua relay của Steam. Dùng khi chạy bản Electron và Steam đã mở.
 *  - SFC.NetPeer   (transport-peer.js):   WebRTC qua PeerJS. Bản web, hoặc bản Electron khi không có Steam.
 * Giao diện: on(handlers), host() -> mã phòng, join(code), send(msg, id?), drop(id), close(), id.
 * Handler (on): open(id), data(msg, id), close(id), error(err) — id = id của khách (host) / 'host' (khách)
 * SFC.Net = backend của phòng hiện tại, session.js chọn mỗi lần tạo / vào phòng (NetCommon.use).
 * Người chơi làm host: NetCommon.p2p() = Steam nếu có, không thì PeerJS. Tắt Steam: net.config.js -> useSteam = false.
 */
window.SFC = window.SFC || {};

(function () {
  const N = () => SFC_CONFIG.net;

  // lỗi của từng backend -> lý do trung tính (session.js gửi cho UI trong sự kiện closed{reason}).
  // Không lộ cách kết nối: mọi lỗi kết nối (máy chủ / Steam / PeerJS / WebRTC) đều là 'connect'. Chữ hiển thị: src/ui/online.js
  const KINDS = {
    'peer-unavailable': 'not-found', 'room-missing': 'not-found',
    'full': 'full', 'started': 'started', 'version': 'version',
    'server-full': 'busy', 'server-closing': 'busy',
    'expired': 'expired', 'rejoin-failed': 'rejoin-failed', 'cancelled': 'cancelled',
    'browser-incompatible': 'unsupported', 'unavailable-id': 'in-use',
  };

  const SERVER_FIRST = () => (N().server && N().server.codeFirst) || '';

  SFC.NetCommon = {
    kind(err) {
      const type = (err && (err.type || err.message)) || '';
      return KINDS[type] || 'connect';
    },

    // mã phòng ngẫu nhiên (PeerJS): ký tự đầu tránh net.server.codeFirst (dành cho mã phòng máy chủ riêng)
    randomCode() {
      const c = N().codeChars, first = c.split('').filter((ch) => !SERVER_FIRST().includes(ch)).join('');
      let s = first[Math.floor(Math.random() * first.length)];
      for (let i = 1; i < N().codeLength; i++) s += c[Math.floor(Math.random() * c.length)];
      return s;
    },

    // phiên bản đầy đủ của game: <phiên bản game>-<net.protocol>, vd. 1.1.0-5 (bản dev: dev-5). Gửi kèm gói bắt tay với máy chủ
    clientVersion() { return `${typeof SFC_VERSION_STRING === 'string' ? SFC_VERSION_STRING : 'dev'}-${N().protocol}`; },

    // mã phòng máy chủ riêng? (cùng độ dài với mọi mã, nhận ra bằng ký tự đầu)
    isServerCode(code) {
      return typeof code === 'string' && code.length === N().codeLength && SERVER_FIRST().includes(code[0]);
    },

    // số nguyên 32 bit <-> mã phòng: cơ số = số ký tự codeChars (32 ký tự x 7 = 35 bit), chữ số lớn đứng trước
    encodeCode(n) {
      const c = N().codeChars, base = c.length;
      let s = '';
      for (let i = 0; i < N().codeLength; i++) { s = c[n % base] + s; n = Math.floor(n / base); }
      return s;
    },

    // mã sai độ dài / ký tự lạ / vượt 32 bit -> null
    decodeCode(code) {
      const c = N().codeChars, base = c.length;
      if (typeof code !== 'string' || code.length !== N().codeLength) return null;
      let n = 0;
      for (const ch of code) {
        const d = c.indexOf(ch);
        if (d < 0) return null;
        n = n * base + d;
      }
      return n <= 0xffffffff ? n : null;
    },
  };

  // thống kê kết nối của phiên online (hiện ở SETTINGS > SOUND & DISPLAY > NETWORK STATS, src/ui/online.js):
  // byte gửi / nhận = độ dài gói JSON (trước nén / khung của từng backend) · rtt = ping (ms) tới máy chạy trận, làm mượt
  SFC.NetStats = {
    up: 0, down: 0,            // tổng byte từ lúc vào phòng
    upRate: 0, downRate: 0,    // byte / giây (đo mỗi giây)
    rtt: null,                 // ms · null = chưa đo được
    wu: 0, wd: 0, wt: 0,
    out(n) { this.up += n; this.wu += n; },
    in(n) { this.down += n; this.wd += n; },
    // giờ gửi trong ping làm tròn tới ms -> mạng rất nhanh có thể ra số âm nhỏ: coi là 0
    pong(ms) { if (ms > -2 && ms < 60000) { ms = Math.max(0, ms); this.rtt = this.rtt == null ? ms : this.rtt * 0.7 + ms * 0.3; } },
    // gọi trước khi đọc upRate / downRate
    roll(now = Date.now()) {
      if (!this.wt) this.wt = now;
      const dt = now - this.wt;
      if (dt < 1000) return;
      this.upRate = (this.wu * 1000) / dt; this.downRate = (this.wd * 1000) / dt;
      this.wu = this.wd = 0; this.wt = now;
    },
    reset() { this.up = this.down = this.upRate = this.downRate = this.wu = this.wd = this.wt = 0; this.rtt = null; },
  };
  // độ dài gói (backend nhận gói đã giải mã thành object: PeerJS)
  SFC.NetStats.size = (msg) => { try { return JSON.stringify(msg).length; } catch (e) { return 0; } };

  let backend = null;
  // backend người chơi làm host
  SFC.NetCommon.p2p = () => (N().useSteam && SFC.NetSteam && SFC.NetSteam.available() ? SFC.NetSteam : SFC.NetPeer);
  // có máy chủ riêng không (net.server.url trống = chỉ người chơi làm host)
  SFC.NetCommon.serverOn = () => !!(N().server && N().server.url && SFC.NetServer);
  SFC.NetCommon.use = (b) => { backend = b; };
  Object.defineProperty(SFC, 'Net', {
    get() {
      if (!backend) backend = SFC.NetCommon.p2p();
      return backend;
    },
  });
})();
