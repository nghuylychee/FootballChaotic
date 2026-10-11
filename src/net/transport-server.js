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
 * solo = không ghép được (reject { type: 'solo' }). Máy chủ đang ngủ: thử lại tới net.server.queueWake giây rồi mới solo
 * (mở màn PLAY đã đánh thức sẵn; 2 người tìm cùng lúc lúc máy chủ ngủ vẫn gặp được nhau).
 * Phiên bản: gói đầu kèm cv (NetCommon.clientVersion, vd. 1.1.0-5); máy chủ trả sv (phiên bản máy chủ, vd. 5.1.0) trong
 * room{code,id,sv} / err{e,sv} -> NetServer.serverVersion (chỉ để chẩn đoán, không hiện cho người chơi).
 * Nén trong game: trình duyệt có DecompressionStream('deflate-raw') thì gói đầu kèm z:1 -> gói chung của phòng tới dạng nhị phân
 * (1 luồng deflate-raw chung của phòng, bắt đầu từ 1 điểm FULL_FLUSH, mỗi gói = JSON + '\n'; xem server/index.js), gói gửi riêng
 * máy này (room, you, start, pong, err...) tới dạng chữ. Xử lý cả 2 theo đúng thứ tự nhận (inflater). Không xin nén: mọi gói là chữ.
 */
window.SFC = window.SFC || {};

(function () {
  const N = () => SFC_CONFIG.net;
  const S = () => SFC_CONFIG.net.server;

  // trình duyệt giải nén được luồng deflate-raw? (Chrome 103+, Firefox 113+, Safari 16.4+, Electron)
  const canInflate = () => {
    try { return typeof DecompressionStream === 'function' && typeof TextDecoder === 'function' && !!new DecompressionStream('deflate-raw'); } catch (e) { return false; }
  };

  // hàng xử lý gói theo ĐÚNG THỨ TỰ NHẬN (gói chữ + gói nhị phân). Gói nhị phân = 1 đoạn luồng nén chung của phòng chứa trọn vẹn
  // >= 1 gói tin (máy chủ flush sau mỗi gói) -> giải xong hết mới xử lý gói kế (gói chữ gửi riêng không vượt lên trước gói chung).
  // push(chuỗi | Uint8Array); onLine(chuỗi JSON) cho từng gói; drain() = chờ xử lý hết phần đã nhận
  function inflater(onLine, onError) {
    const dec = new TextDecoder(), q = [];
    let w = null, r = null, rest = '', busy = false, dead = false, idle = [];
    const lines = () => {
      let i, got = false;
      while ((i = rest.indexOf('\n')) >= 0) { const line = rest.slice(0, i); rest = rest.slice(i + 1); got = true; onLine(line); }
      return got;
    };
    const bin = async (bytes) => {
      if (!w) { const ds = new DecompressionStream('deflate-raw'); w = ds.writable.getWriter(); r = ds.readable.getReader(); }
      const wrote = w.write(bytes);
      for (let got = false; !got || rest;) {
        const { value, done } = await r.read();
        if (done) throw new Error('stream ended');
        rest += dec.decode(value, { stream: true });
        if (lines()) got = true;
      }
      await wrote;
    };
    const pump = async () => {
      busy = true;
      try {
        while (q.length && !dead) { const it = q.shift(); if (typeof it === 'string') onLine(it); else await bin(it); }
      } catch (e) { dead = true; onError(e); }
      busy = false;
      const done = idle; idle = [];
      for (const fn of done) fn();
    };
    return {
      push(item) { if (dead) return; q.push(item); if (!busy) pump(); },
      drain() { return busy || q.length ? new Promise((res) => idle.push(res)) : Promise.resolve(); },
      close() { dead = true; if (w) w.abort().catch(() => {}); },
    };
  }

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
        // máy chủ đang ngủ: thử lại tới queueWake giây (người tìm trận cùng lúc đều phải chờ nó dậy mới gặp được nhau)
        this.until(Object.assign({ t: 'queue', v: N().protocol }, ticket), null, S().queueWake)
          .then((code) => { this.abort = null; resolve(code); }, (e) => { this.abort = null; reject(e); });
      });
    },

    // thử kết nối mỗi 2 giây tới hạn; chỉ lỗi "không tới được" mới thử lại (sai mã / đầy / sai phiên bản thì báo ngay)
    until(first, onWait, timeoutSec) {
      const deadline = Date.now() + (timeoutSec || S().wakeTimeout || S().connectTimeout) * 1000;
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
        // nén trong game: gói nhị phân -> giải theo thứ tự -> handle như gói chữ
        const z = canInflate() ? inflater((text) => parse(text), () => { try { ws.close(); } catch (e) { /* bỏ qua */ } }) : null;
        if (z) ws.binaryType = 'arraybuffer';
        this.compressed = !!z;
        const hi = Object.assign({ cv: SFC.NetCommon.clientVersion() }, z ? { z: 1 } : {}, first);
        ws.onopen = () => ws.send(JSON.stringify(hi));
        ws.onerror = () => fail({ type: 'server-unreachable' });
        ws.onclose = () => {
          // gói cuối (vd. bye) có thể còn đang giải nén: xử lý hết rồi mới báo mất kết nối
          const closed = () => {
            if (z) z.close();
            if (this.ws !== ws) return;
            if (!done) { fail({ type: 'server-unreachable' }); return; }
            const was = this.joined;
            this.reset();
            if (was) this.emit('close', 'host');
          };
          if (z) z.drain().then(closed); else closed();
        };
        ws.onmessage = (ev) => {
          if (typeof ev.data === 'string') {
            SFC.NetStats.in(ev.data.length);
            if (z) z.push(ev.data); else parse(ev.data);   // có luồng nén: xếp hàng sau phần nhị phân đang giải
            return;
          }
          if (!z) return;
          SFC.NetStats.in(ev.data.byteLength);
          z.push(new Uint8Array(ev.data));
        };
        const parse = (text) => {
          if (this.ws !== ws) return;
          let msg;
          try { msg = JSON.parse(text); } catch (e) { return; }
          if (!msg || !msg.t) return;
          if (this.joined) { this.emit('data', msg, 'host'); return; }
          if (typeof msg.sv === 'string') this.serverVersion = msg.sv;
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
      if (!this.ws || this.ws.readyState !== 1) return;
      const s = JSON.stringify(msg);
      this.ws.send(s);
      SFC.NetStats.out(s.length);
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
