/* Net — lớp kết nối dùng chung cho 3 backend (cùng giao diện, online.js không cần biết đang chạy cái nào):
 *  - SFC.NetServer (transport-server.js): WebSocket tới máy chủ riêng (net.server.url). Máy chủ chạy trận, máy này luôn là khách.
 *  - SFC.NetSteam  (transport-steam.js):  Steam lobby + P2P qua relay của Steam. Dùng khi chạy bản Electron và Steam đã mở.
 *  - SFC.NetPeer   (transport-peer.js):   WebRTC qua PeerJS. Bản web, hoặc bản Electron khi không có Steam.
 * Giao diện: on(handlers), host() -> mã phòng, join(code), send(msg, id?), drop(id), close(), message(err), id.
 * Handler (on): open(id), data(msg, id), close(id), error(err) — id = id của khách (host) / 'host' (khách)
 * SFC.Net = backend của phòng hiện tại, online.js chọn mỗi lần tạo / vào phòng (NetCommon.use).
 * Người chơi làm host: NetCommon.p2p() = Steam nếu có, không thì PeerJS. Tắt Steam: net.config.js -> useSteam = false.
 */
window.SFC = window.SFC || {};

(function () {
  const N = () => SFC_CONFIG.net;

  // mã lỗi -> câu báo cho người chơi. Không lộ cách kết nối (máy chủ riêng / người chơi làm host / Steam / PeerJS):
  // mọi lỗi kết nối cùng 1 câu, người chơi chỉ cần biết làm gì tiếp
  const CANT_CONNECT = 'Could not connect to online play. Check your connection and try again.';
  const BUSY = 'Online play is busy right now. Try again in a minute.';
  const ERRORS = {
    'peer-unavailable': 'Room not found. Check the code.',
    'room-missing': 'Room not found. Check the code.',
    'network': CANT_CONNECT,
    'server-error': CANT_CONNECT,
    'socket-error': CANT_CONNECT,
    'socket-closed': CANT_CONNECT,
    'webrtc': CANT_CONNECT,
    'load': CANT_CONNECT,
    'timeout': CANT_CONNECT,
    'steam-lobby': CANT_CONNECT,
    'steam-offline': CANT_CONNECT,
    'server-unreachable': CANT_CONNECT,
    'browser-incompatible': 'This browser does not support online play.',
    'unavailable-id': 'That room code is already in use.',
    'full': 'The room is full.',
    'started': 'The match has already started. Try again when the room is back in the lobby.',
    'version': 'This room is on a different game version. Update the game and try again.',
    'server-full': BUSY,
    'server-closing': BUSY,
    'expired': 'You were away too long and the match moved on without you.',
    'rejoin-failed': 'Lost connection and could not rejoin the match.',
    'cancelled': 'Cancelled.',
  };

  const SERVER_FIRST = () => (N().server && N().server.codeFirst) || '';

  SFC.NetCommon = {
    message(err) {
      const type = (err && (err.type || err.message)) || '';
      return ERRORS[type] || CANT_CONNECT;
    },

    // mã phòng ngẫu nhiên (PeerJS): ký tự đầu tránh net.server.codeFirst (dành cho mã phòng máy chủ riêng)
    randomCode() {
      const c = N().codeChars, first = c.split('').filter((ch) => !SERVER_FIRST().includes(ch)).join('');
      let s = first[Math.floor(Math.random() * first.length)];
      for (let i = 1; i < N().codeLength; i++) s += c[Math.floor(Math.random() * c.length)];
      return s;
    },

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
