/* Net — lớp kết nối P2P (WebRTC qua PeerJS), tải thư viện khi cần.
 * Host: tạo peer id = prefix + mã phòng, nhận tối đa maxPlayers - 1 khách (nối sao, mỗi khách 1 kênh).
 * Khách: connect tới id đó (1 kênh tới host).
 * Handler (on): open(id), data(msg, id), close(id), error(err) — id = peer id của khách (host) / 'host' (khách)
 */
window.SFC = window.SFC || {};

(function () {
  const N = () => SFC_CONFIG.net;

  // thông báo lỗi PeerJS -> tiếng Việt
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
    'load': 'Could not load the network library (PeerJS). Check your Internet.',
    'full': 'The room is full.',
    'started': 'The match has already started. Try again when the room is back in the lobby.',
    'version': 'The machines are running different game versions.',
  };

  const Net = {
    peer: null,
    conn: null,          // khách: kênh tới host
    conns: new Map(),    // host: peer id khách -> kênh
    hosting: false,
    code: null,
    handlers: {},

    message(err) {
      const type = (err && (err.type || err.message)) || '';
      return ERRORS[type] || 'Connection error' + (type ? ` (${type})` : '') + '.';
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
    emit(name, a, b) { const h = this.handlers[name]; if (h) h(a, b); },
    get connected() { return this.hosting ? this.conns.size > 0 : !!(this.conn && this.conn.open); },
    // peer id của máy này (khách dùng để nhận ra mình trong danh sách phòng)
    get id() { return this.hosting ? 'host' : this.peer && this.peer.id; },

    /** Tạo phòng -> resolve(mã phòng) */
    async host() {
      await this.load();
      this.close();
      this.hosting = true;
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

    // host: phòng đầy (maxPlayers) -> từ chối khách mới
    accept(conn) {
      if (this.conns.size >= N().maxPlayers - 1) { this.refuse(conn, 'full'); return; }
      const id = conn.peer;
      this.conns.set(id, conn);
      conn.on('open', () => this.emit('open', id));
      conn.on('data', (d) => this.emit('data', d, id));
      conn.on('close', () => { if (this.conns.get(id) === conn) { this.conns.delete(id); this.emit('close', id); } });
      conn.on('error', (e) => this.emit('error', e));
    },

    refuse(conn, type) {
      conn.on('open', () => { conn.send({ t: type }); setTimeout(() => conn.close(), 400); });
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
          this.conn = conn;
          conn.on('data', (d) => this.emit('data', d, 'host'));
          conn.on('close', () => { if (this.conn === conn) { this.conn = null; this.emit('close', 'host'); } });
          conn.on('error', (e) => this.emit('error', e));
          conn.on('open', () => { if (done) return; done = true; clearTimeout(timer); this.code = code; resolve(); });
        });
        peer.on('error', (e) => { if (!done) fail(e); else this.emit('error', e); });
      });
    },

    // khách: gửi cho host · host: gửi cho khách id (bỏ id = gửi mọi khách)
    send(msg, id) {
      if (!this.hosting) { if (this.conn && this.conn.open) this.conn.send(msg); return; }
      if (id != null) { const c = this.conns.get(id); if (c && c.open) c.send(msg); return; }
      for (const c of this.conns.values()) if (c.open) c.send(msg);
    },

    // host: đóng kết nối với 1 khách (phòng vẫn mở)
    drop(id) {
      const c = this.conns.get(id);
      this.conns.delete(id);
      if (c) try { c.close(); } catch (e) { /* bỏ qua */ }
    },

    close() {
      for (const id of [...this.conns.keys()]) this.drop(id);
      const c = this.conn;
      this.conn = null;
      if (c) try { c.close(); } catch (e) { /* bỏ qua */ }
      if (this.peer) try { this.peer.destroy(); } catch (e) { /* bỏ qua */ }
      this.peer = null;
      this.code = null;
      this.hosting = false;
    },
  };

  SFC.Net = Net;
})();
