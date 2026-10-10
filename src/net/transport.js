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

  // mã lỗi -> câu báo cho người chơi
  const ERRORS = {
    'peer-unavailable': 'Room not found. Check the code.',
    'network': 'Lost connection to the handshake server.',
    'server-error': 'The handshake server is having trouble, try again later.',
    'socket-error': 'Could not reach the handshake server.',
    'socket-closed': 'The handshake server connection was closed.',
    'browser-incompatible': 'This browser does not support WebRTC.',
    'webrtc': 'WebRTC error: your network may be blocking P2P connections.',
    'unavailable-id': 'That room code is already in use.',
    'timeout': 'Connection timed out.',
    'load': 'Could not load the network library (PeerJS).',
    'full': 'The room is full.',
    'started': 'The match has already started. Try again when the room is back in the lobby.',
    'version': 'The machines are running different game versions.',
    'steam-lobby': 'Could not create a Steam room.',
    'steam-offline': 'Steam is not connected.',
    'server-unreachable': 'Could not reach the game server.',
    'room-missing': 'Room not found. Check the code.',
    'server-full': 'The game server is full, try again later.',
  };

  SFC.NetCommon = {
    message(err) {
      const type = (err && (err.type || err.message)) || '';
      return ERRORS[type] || 'Connection error' + (type ? ` (${type})` : '') + '.';
    },

    randomCode() {
      const c = N().codeChars;
      let s = '';
      for (let i = 0; i < N().codeLength; i++) s += c[Math.floor(Math.random() * c.length)];
      return s;
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
