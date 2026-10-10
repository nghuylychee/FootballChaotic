/* NetServer — backend máy chủ riêng: 1 WebSocket tới net.server.url (server/index.js). Giao diện chung: xem transport.js.
 * Máy chủ chạy trận (SFC.Room) nên máy này luôn là khách: mọi gói nhận được đều từ 'host'.
 * Bắt tay: create{v} / join{code,v} -> máy chủ trả room{code,id} (id = id máy chủ cấp cho máy này) hoặc err{e}.
 * Sau đó mọi gói đi thẳng tới Room trên máy chủ (hello, i, pick...; xem online.js).
 * Dùng WebSocket có sẵn của trình duyệt / Electron, không cần thư viện.
 */
window.SFC = window.SFC || {};

(function () {
  const N = () => SFC_CONFIG.net;
  const S = () => SFC_CONFIG.net.server;

  const NetServer = {
    ws: null,
    joined: false,
    myId: null,
    code: null,
    handlers: {},

    message(err) { return SFC.NetCommon.message(err); },
    on(handlers) { this.handlers = handlers || {}; },
    emit(name, a, b) { const h = this.handlers[name]; if (h) h(a, b); },
    get connected() { return this.joined && !!this.ws && this.ws.readyState === 1; },
    get id() { return this.myId; },

    /** Tạo phòng trên máy chủ -> resolve(mã phòng). Hết net.server.connectTimeout giây -> reject (online.js chuyển sang tự host) */
    host() { return this.open({ t: 'create', v: N().protocol }, S().connectTimeout); },

    /** Vào phòng theo mã -> resolve khi máy chủ xác nhận */
    join(code) { return this.open({ t: 'join', code, v: N().protocol }, N().connectTimeout).then(() => undefined); },

    open(first, timeoutSec) {
      this.close();
      return new Promise((resolve, reject) => {
        let done = false, ws;
        const fail = (e) => { if (done) return; done = true; clearTimeout(timer); this.close(); reject(e); };
        const timer = setTimeout(() => fail({ type: 'server-unreachable' }), timeoutSec * 1000);
        try { ws = new WebSocket(S().url); } catch (e) { fail({ type: 'server-unreachable' }); return; }
        this.ws = ws;
        ws.onopen = () => ws.send(JSON.stringify(first));
        ws.onerror = () => fail({ type: 'server-unreachable' });
        ws.onclose = () => {
          if (this.ws !== ws) return;
          if (!done) { fail({ type: 'server-unreachable' }); return; }
          const was = this.joined;
          this.reset();
          if (was) this.emit('close', 'host');
        };
        ws.onmessage = (ev) => {
          let msg;
          try { msg = JSON.parse(ev.data); } catch (e) { return; }
          if (!msg || !msg.t) return;
          if (this.joined) { this.emit('data', msg, 'host'); return; }
          // bắt tay
          if (msg.t === 'room') {
            done = true;
            clearTimeout(timer);
            this.joined = true;
            this.myId = String(msg.id);
            this.code = String(msg.code);
            resolve(this.code);
          } else if (msg.t === 'err') fail({ type: msg.e || 'server-error' });
        };
      });
    },

    send(msg) {
      if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(msg));
    },

    // máy này không bao giờ làm host trên máy chủ riêng
    drop() {},

    reset() {
      this.ws = null;
      this.joined = false;
      this.myId = null;
      this.code = null;
    },

    close() {
      const ws = this.ws;
      this.reset();
      if (ws) try { ws.close(); } catch (e) { /* bỏ qua */ }
    },
  };

  SFC.NetServer = NetServer;
})();
