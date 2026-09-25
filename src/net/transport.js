/* Net — lớp kết nối P2P (WebRTC qua PeerJS), tải thư viện khi cần.
 * Host: tạo peer id = prefix + mã phòng, chờ 1 khách.  Khách: connect tới id đó.
 * Handler (on): open (đã nối với đối phương), data(msg), close, error(err)
 */
window.SFC = window.SFC || {};

(function () {
  const N = () => SFC_CONFIG.net;

  // thông báo lỗi PeerJS -> tiếng Việt
  const ERRORS = {
    'peer-unavailable': 'Không tìm thấy phòng. Kiểm tra lại mã.',
    'network': 'Mất kết nối tới máy chủ bắt tay.',
    'server-error': 'Máy chủ bắt tay đang lỗi, thử lại sau.',
    'socket-error': 'Không kết nối được máy chủ bắt tay.',
    'socket-closed': 'Kết nối máy chủ bắt tay bị đóng.',
    'browser-incompatible': 'Trình duyệt không hỗ trợ WebRTC.',
    'webrtc': 'Lỗi WebRTC — mạng có thể chặn kết nối P2P.',
    'unavailable-id': 'Mã phòng đang được dùng.',
    'timeout': 'Hết thời gian chờ kết nối.',
    'load': 'Không tải được thư viện mạng (PeerJS). Kiểm tra Internet.',
    'full': 'Phòng đã đủ người.',
    'version': 'Hai máy đang chạy phiên bản game khác nhau.',
  };

  const Net = {
    peer: null,
    conn: null,
    code: null,
    handlers: {},

    message(err) {
      const type = (err && (err.type || err.message)) || '';
      return ERRORS[type] || 'Lỗi kết nối' + (type ? ` (${type})` : '') + '.';
    },

    load() {
      if (window.Peer) return Promise.resolve();
      if (this._loading) return this._loading;
      this._loading = new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = N().peerjsUrl;
        s.onload = () => res();
        s.onerror = () => { this._loading = null; s.remove(); rej({ type: 'load' }); };
        document.head.appendChild(s);
      });
      return this._loading;
    },

    makeCode() {
      const c = N().codeChars;
      let s = '';
      for (let i = 0; i < N().codeLength; i++) s += c[Math.floor(Math.random() * c.length)];
      return s;
    },

    on(handlers) { this.handlers = handlers || {}; },
    emit(name, arg) { const h = this.handlers[name]; if (h) h(arg); },
    get connected() { return !!(this.conn && this.conn.open); },

    /** Tạo phòng -> resolve(mã phòng) */
    async host() {
      await this.load();
      this.close();
      return new Promise((resolve, reject) => {
        let tries = 0, ready = false;
        const attempt = () => {
          const code = this.makeCode();
          const peer = new window.Peer(N().roomPrefix + code, N().peerOptions);
          this.peer = peer;
          peer.on('open', () => { ready = true; this.code = code; resolve(code); });
          peer.on('connection', (conn) => this.accept(conn));
          peer.on('disconnected', () => { if (this.peer === peer && !peer.destroyed) try { peer.reconnect(); } catch (e) { /* bỏ qua */ } });
          peer.on('error', (e) => {
            if (!ready && e.type === 'unavailable-id' && tries++ < 5) { peer.destroy(); attempt(); return; }
            if (!ready) { this.close(); reject(e); } else this.emit('error', e);
          });
        };
        attempt();
      });
    },

    accept(conn) {
      if (this.conn) {
        // phòng 1:1 — khách thứ 2 bị từ chối
        conn.on('open', () => { conn.send({ t: 'full' }); setTimeout(() => conn.close(), 400); });
        return;
      }
      this.bind(conn);
    },

    bind(conn) {
      this.conn = conn;
      conn.on('open', () => this.emit('open'));
      conn.on('data', (d) => this.emit('data', d));
      conn.on('close', () => { if (this.conn === conn) { this.conn = null; this.emit('close'); } });
      conn.on('error', (e) => this.emit('error', e));
    },

    /** Vào phòng theo mã -> resolve khi kênh dữ liệu đã mở */
    async join(code) {
      await this.load();
      this.close();
      return new Promise((resolve, reject) => {
        let done = false;
        const fail = (e) => { if (done) return; done = true; clearTimeout(timer); this.close(); reject(e); };
        const timer = setTimeout(() => fail({ type: 'timeout' }), N().connectTimeout * 1000);
        const peer = new window.Peer(N().peerOptions);
        this.peer = peer;
        peer.on('open', () => {
          const conn = peer.connect(N().roomPrefix + code, { reliable: true, serialization: 'json' });
          this.bind(conn);
          conn.on('open', () => { if (done) return; done = true; clearTimeout(timer); this.code = code; resolve(); });
        });
        peer.on('error', (e) => { if (!done) fail(e); else this.emit('error', e); });
      });
    },

    send(msg) {
      if (this.connected) this.conn.send(msg);
    },

    // đóng kết nối với đối phương (host vẫn giữ phòng mở)
    dropConn() {
      const c = this.conn;
      this.conn = null;
      if (c) try { c.close(); } catch (e) { /* bỏ qua */ }
    },

    close() {
      this.dropConn();
      if (this.peer) try { this.peer.destroy(); } catch (e) { /* bỏ qua */ }
      this.peer = null;
      this.code = null;
    },
  };

  SFC.Net = Net;
})();
