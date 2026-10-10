/* NetServer — backend máy chủ riêng: 1 WebSocket tới net.server.url (server/index.js). Giao diện chung: xem transport.js.
 * Máy chủ chạy trận (SFC.Room) nên máy này luôn là khách: mọi gói nhận được đều từ 'host'.
 * Bắt tay: create{v} / join{code,v} -> máy chủ trả room{code,id} (id = id máy chủ cấp cho máy này) hoặc err{e}.
 * Sau đó mọi gói đi thẳng tới Room trên máy chủ (hello, i, pick...; xem session.js).
 * Dùng WebSocket có sẵn của trình duyệt / Electron, không cần thư viện.
 * Máy chủ có thể đang "ngủ" (gói miễn phí của nhà cung cấp tắt máy khi không ai dùng, bật lại mất ~1 phút):
 *  - wake(): gọi /healthz cho máy chủ dậy sớm (mở trang ONLINE)
 *  - host() / join(code, { wait }) thử lại mỗi 2 giây tới net.server.wakeTimeout giây; onWait(giây còn lại) để hiện đếm ngược
 *  - cancel(): bỏ chờ -> reject { type: 'cancelled' }
 * Tìm trận xếp hạng: queue(vé) -> queue{v,elo,role,pf}; queued = đã vào hàng (hết hạn kết nối), room{code,id} = ghép xong (resolve),
 * solo = không ghép được (reject { type: 'solo' }). Chỉ thử 1 lần: máy chủ đang ngủ nghĩa là không ai đang tìm trận.
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

    on(handlers) { this.handlers = handlers || {}; },
    emit(name, a, b) { const h = this.handlers[name]; if (h) h(a, b); },
    get connected() { return this.joined && !!this.ws && this.ws.readyState === 1; },
    get id() { return this.myId; },

    /** Tạo phòng trên máy chủ -> resolve(mã phòng). Chờ máy chủ dậy tới wakeTimeout giây, không được thì reject (session.js tự host) */
    host(onWait) { return this.until({ t: 'create', v: N().protocol }, onWait); },

    /** Vào phòng theo mã -> resolve khi máy chủ xác nhận. wait: chờ máy chủ dậy (VÀO PHÒNG); không: thử 1 lần (kết nối lại) */
    join(code, opts = {}) {
      const first = { t: 'join', code, v: N().protocol };
      return (opts.wait ? this.until(first, opts.onWait) : this.open(first, S().connectTimeout)).then(() => undefined);
    },

    /** Vào hàng chờ trận xếp hạng -> resolve(mã phòng) khi ghép xong. cancel() -> reject { type: 'cancelled' } */
    queue(ticket) {
      this.cancelled = false;
      return new Promise((resolve, reject) => {
        this.abort = () => { this.abort = null; reject({ type: 'cancelled' }); };
        this.open(Object.assign({ t: 'queue', v: N().protocol }, ticket), S().connectTimeout)
          .then((code) => { this.abort = null; resolve(code); }, (e) => { this.abort = null; reject(e); });
      });
    },

    // thử kết nối mỗi 2 giây tới hạn; chỉ lỗi "không tới được" mới thử lại (sai mã / đầy / sai phiên bản thì báo ngay)
    until(first, onWait) {
      const deadline = Date.now() + (S().wakeTimeout || S().connectTimeout) * 1000;
      this.cancelled = false;
      return new Promise((resolve, reject) => {
        // cancel() kết thúc lần chờ ngay (cả khi đang giữa 1 lần thử hoặc đang đợi 2 giây)
        this.abort = () => { this.abort = null; reject({ type: 'cancelled' }); };
        const ok = (v) => { this.abort = null; resolve(v); };
        const attempt = () => {
          if (this.cancelled) { reject({ type: 'cancelled' }); return; }
          this.open(first, S().connectTimeout).then(ok, (e) => {
            const left = Math.ceil((deadline - Date.now()) / 1000);
            if (this.cancelled) reject({ type: 'cancelled' });
            else if (e.type !== 'server-unreachable' || left <= 0) reject(e);
            else { if (onWait) onWait(left); this.retry = setTimeout(attempt, 2000); }
          });
        };
        attempt();
      });
    },

    cancel() {
      this.cancelled = true;
      clearTimeout(this.retry);
      this.close();
      if (this.abort) this.abort();
    },

    // đánh thức máy chủ đang ngủ (không cần kết quả); tối đa 1 lần / phút
    wake() {
      if (!S().url || Date.now() - (this.wokeAt || 0) < 60000) return;
      this.wokeAt = Date.now();
      try {
        const http = S().url.replace(/^ws/, 'http');
        fetch(new URL('/healthz', http).href, { mode: 'no-cors', cache: 'no-store' }).catch(() => {});
      } catch (e) { /* bỏ qua */ }
    },

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
          } else if (msg.t === 'queued') clearTimeout(timer);   // đã vào hàng chờ: chờ ghép bao lâu cũng được
          else if (msg.t === 'solo') fail({ type: 'solo' });
          else if (msg.t === 'err') fail({ type: msg.e || 'server-error' });
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
