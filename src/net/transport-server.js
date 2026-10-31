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
 * Nhiều máy chủ (net.server.urls, mỗi vùng 1 máy): probe() đo ping tới /healthz của từng máy (máy đang ngủ / khác net.protocol /
 * đầy = bỏ qua lần này) -> host() / queue() ở máy ping thấp nhất, join(mã) thử lần lượt các máy (phòng ở máy nào thì vào máy đó),
 * kết nối lại = đúng máy đang giữ phòng (home). queue() đang chờ một mình thì chuyển sang máy khác có người đang chờ (hopQueue).
 * Không máy nào trả lời đo ping (đang ngủ, hoặc máy chủ cũ chưa có CORS ở /healthz) -> như 1 máy: chờ máy đầu danh sách dậy.
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

  // tín hiệu huỷ fetch sau ms (AbortSignal.timeout chưa có ở trình duyệt cũ)
  const timeoutSignal = (ms) => {
    if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) return AbortSignal.timeout(ms);
    const c = new AbortController();
    setTimeout(() => c.abort(), ms);
    return c.signal;
  };
  const usable = (s) => s.ok && !s.h.full;   // tạo phòng / tìm trận được ở máy này

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
    target: null,        // url máy chủ của lần kết nối hiện tại
    home: null,          // { url, code }: phòng đang ở -> kết nối lại vào đúng máy này
    probed: null,        // lần đo ping gần nhất { at, list }

    urls() { return SFC.NetCommon.serverUrls(); },

    on(handlers) { this.handlers = handlers || {}; },
    emit(name, a, b) { const h = this.handlers[name]; if (h) h(a, b); },
    get connected() { return this.joined && !!this.ws && this.ws.readyState === 1; },
    get id() { return this.myId; },

    /** Tạo phòng trên máy chủ -> resolve(mã phòng). Chờ máy chủ dậy tới wakeTimeout giây, không được thì reject (session.js tự host).
     *  coop = { story, run, maxPing }: phòng co-op (FOOTBALL STORY / GOAT PATH) — chỉ máy đang thức có ping <= maxPing ms, không chờ máy
     *  đang ngủ; không có máy nào đủ nhanh -> reject { type: 'slow' } (session.js tự host) */
    host(onWait, coop = null) {
      const first = Object.assign({ t: 'create', v: N().protocol }, coop ? { story: coop.story || undefined, run: coop.run ? 1 : undefined } : {});
      return this.guard(async (op) => {
        const live = (await this.probe()).filter(usable);
        if (op.dead) throw { type: 'cancelled' };
        if (coop) {
          const fast = live.filter((s) => s.ping <= coop.maxPing);
          if (!fast.length) throw { type: 'slow' };
          return this.tryEach(fast, first);
        }
        // 1 máy / không máy nào trả lời đo ping: chờ máy (đầu danh sách) dậy như trước
        if (!live.length || this.urls().length === 1) { this.target = (live[0] || { url: this.urls()[0] }).url; return this.until(first, onWait); }
        return this.tryEach(live, first);   // ping thấp trước; đầy / lỗi -> máy kế
      });
    },

    /** Vào phòng theo mã -> resolve khi máy chủ xác nhận. wait: chờ máy chủ dậy (VÀO PHÒNG); không: thử 1 lần (kết nối lại) */
    join(code, opts = {}) {
      const first = { t: 'join', code, v: N().protocol };
      // kết nối lại: đúng máy đang giữ phòng
      if (!opts.wait && this.home && this.home.code === code) { this.target = this.home.url; return this.open(first, S().connectTimeout).then(() => undefined); }
      if (this.urls().length === 1) {
        this.target = this.urls()[0];
        return (opts.wait ? this.until(first, opts.onWait) : this.open(first, S().connectTimeout)).then(() => undefined);
      }
      // nhiều máy: máy đang thức trước (ping thấp trước), rồi các máy không trả lời đo ping. Không có phòng ở máy này / không tới được /
      // khác phiên bản / đang tắt -> máy kế; lỗi khác (phòng đầy, đã vào trận...) = đúng phòng đó -> báo luôn
      const next = ['room-missing', 'server-unreachable', 'version', 'server-closing'];
      return this.guard(async (op) => {
        const list = await this.probe();
        if (op.dead) throw { type: 'cancelled' };
        return this.tryEach(list, first, (e) => !next.includes(e.type));
      }).then(() => undefined);
    },

    /** Vào hàng chờ trận xếp hạng -> resolve(mã phòng) khi ghép xong. cancel() -> reject { type: 'cancelled' } */
    queue(ticket) {
      const first = Object.assign({ t: 'queue', v: N().protocol }, ticket);
      return this.guard(async (op) => {
        const live = (await this.probe()).filter(usable);
        if (op.dead) throw { type: 'cancelled' };
        // 1 máy / không máy nào trả lời đo ping: máy đang ngủ -> thử lại tới queueWake giây (người tìm cùng lúc đều chờ nó dậy mới gặp nhau)
        if (!live.length || this.urls().length === 1) { this.target = (live[0] || { url: this.urls()[0] }).url; return this.until(first, null, S().queueWake); }
        return this.hopQueue(first, live[0].url);
      });
    },

    // tìm trận nhiều máy chủ: vào hàng ở máy ping thấp nhất (ưu tiên ghép ở đây).
    //  - đang chờ một mình: mỗi hopEvery giây xem các máy khác (healthz.queue), máy nào có người đang chờ thì chuyển sang (ping thấp trước).
    //    2 người cùng chờ một mình ở 2 máy: chỉ người ở máy đứng sau trong danh sách chuyển (index), tránh 2 người đổi chỗ cho nhau
    //  - máy hiện tại trả solo (hết giờ chờ) / không vào được: sang máy khác còn người chờ (không vào được: máy kế bất kỳ), hết -> solo
    //  - tổng thời gian tối đa searchMax giây
    hopQueue(first, url) {
      return new Promise((resolve, reject) => {
        const deadline = Date.now() + S().searchMax * 1000, tried = new Set();
        let gen = 0, cur = null, over = false, timer = null;
        const finish = (fn, v) => { if (over) return; over = true; clearInterval(timer); this.stopHop = null; fn(v); };
        this.stopHop = () => finish(reject, { type: 'cancelled' });
        const go = (u) => {
          const my = ++gen;
          cur = u; tried.add(u); this.target = u; this.inQueue = false;
          this.open(first, S().connectTimeout).then((code) => { if (my === gen) finish(resolve, code); }, (e) => { if (my === gen) fallback(e); });
        };
        const fallback = async (e) => {
          if (over) return;
          const list = await this.probe({ fresh: true, quick: true });
          if (over) return;
          const alt = e.type === 'solo'
            ? list.find((s) => usable(s) && s.url !== cur && s.h.queue > 0)
            : list.find((s) => usable(s) && !tried.has(s.url));
          if (alt && Date.now() < deadline) go(alt.url); else finish(reject, e.type === 'solo' ? e : { type: 'solo' });
        };
        timer = setInterval(async () => {
          if (over) return;
          if (Date.now() > deadline) { this.close(); finish(reject, { type: 'solo' }); return; }
          if (!this.inQueue) return;
          const at = gen, list = await this.probe({ fresh: true, quick: true });
          if (over || at !== gen || !this.inQueue) return;
          const me = list.find((s) => s.url === cur);
          if (!me || !me.ok || me.h.queue > 1) return;   // có người khác cùng chờ ở máy này: ở lại, máy chủ tự ghép
          const alt = list.filter((s) => usable(s) && s.url !== cur && s.h.queue > 0 && (s.h.queue > me.h.queue || s.index < me.index))
            .sort((a, b) => a.ping - b.ping)[0];
          if (alt) go(alt.url);   // open() đóng kết nối cũ -> máy cũ tự bỏ vé
        }, S().hopEvery * 1000);
        go(url);
      });
    },

    // chạy 1 việc kết nối huỷ được bằng cancel() (cả khi đang đo ping / giữa các lần thử).
    // op.dead = đã huỷ: run phải kiểm sau mỗi lần await (huỷ lúc đang đo ping mà vẫn kết nối tiếp = vé ma nằm lại trong hàng chờ)
    guard(run) {
      this.cancelled = false;
      const op = { dead: false };
      return new Promise((resolve, reject) => {
        let done = false;
        const end = (fn) => (v) => { if (done) return; done = true; this.abort = null; fn(v); };
        this.abort = end(() => { op.dead = true; reject({ type: 'cancelled' }); });
        run(op).then(end(resolve), end(reject));
      });
    },

    // thử lần lượt từng máy (mỗi máy 1 lần); stop(lỗi) = dừng luôn thay vì thử máy kế. Hết máy: báo lỗi có nghĩa nhất (không tới được = cuối)
    async tryEach(list, first, stop) {
      let last = { type: 'server-unreachable' };
      for (const s of list) {
        if (this.cancelled) throw { type: 'cancelled' };
        this.target = s.url;
        try { return await this.open(first, S().connectTimeout); } catch (e) {
          if (this.cancelled) throw { type: 'cancelled' };
          if (stop && stop(e)) throw e;
          if (e.type !== 'server-unreachable' || last.type === 'server-unreachable') last = e;
        }
      }
      throw last;
    },

    // đo ping tới /healthz của mọi máy chủ (song song): mỗi máy 2 lần, lấy lần nhanh nhất (lần đầu tốn thêm bắt tay TCP / TLS).
    // ok = trả lời trong probeTimeout giây, không đang tắt, đúng net.protocol. Danh sách xếp: máy ok trước, ping thấp trước.
    // Giữ 15 giây (fresh = đo lại). quick = 1 lần, không lưu (đọc số người đang chờ khi tìm trận). Gọi cũng là đánh thức máy đang ngủ
    probe({ fresh = false, quick = false } = {}) {
      if (!fresh && this.probed && Date.now() - this.probed.at < 15000) return Promise.resolve(this.probed.list);
      if (!fresh && this.probing) return this.probing;
      const one = async (url, index) => {
        let ping = Infinity, h = null;
        try {
          const http = new URL('/healthz', url.replace(/^ws/, 'http')).href;
          for (let i = 0; i < (quick ? 1 : 2); i++) {
            const t0 = performance.now();
            const r = await fetch(http, { cache: 'no-store', signal: timeoutSignal(S().probeTimeout * 1000) });
            h = await r.json();
            ping = Math.min(ping, performance.now() - t0);
          }
        } catch (e) { /* không trả lời / chưa có CORS (máy chủ cũ) */ }
        return { url, index, ping, h: h || {}, ok: !!h && h.ok === true && h.protocol === N().protocol };
      };
      const none = () => this.urls().map((url, index) => ({ url, index, ping: Infinity, h: {}, ok: false }));
      const p = (typeof fetch === 'function' ? Promise.all(this.urls().map(one)) : Promise.resolve(none()))
        .then((list) => {
          list.sort((a, b) => (b.ok - a.ok) || (a.ping - b.ping) || (a.index - b.index));
          if (!quick) this.probed = { at: Date.now(), list };
          return list;
        });
      if (!quick) { this.probing = p; p.then(() => { if (this.probing === p) this.probing = null; }); }
      return p;
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
      if (this.stopHop) this.stopHop();
      clearTimeout(this.retry);
      this.close();
      if (this.abort) this.abort();
    },

    // mở trang ONLINE / PLAY: đo ping trước (cũng đánh thức máy đang ngủ) -> TẠO PHÒNG / tìm trận chọn máy ngay; tối đa 1 lần / phút
    wake() {
      if (!this.urls().length || Date.now() - (this.wokeAt || 0) < 60000) return;
      this.wokeAt = Date.now();
      this.probe({ fresh: true });
    },

    open(first, timeoutSec) {
      this.close();
      return new Promise((resolve, reject) => {
        let done = false, ws;
        const fail = (e) => { if (done) return; done = true; clearTimeout(timer); this.close(); reject(e); };
        const timer = setTimeout(() => fail({ type: 'server-unreachable' }), timeoutSec * 1000);
        try { ws = new WebSocket(this.target || this.urls()[0]); } catch (e) { fail({ type: 'server-unreachable' }); return; }
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
            this.home = { url: this.target, code: this.code };
            resolve(this.code);
          } else if (msg.t === 'queued') { clearTimeout(timer); this.inQueue = true; }   // đã vào hàng chờ: chờ ghép bao lâu cũng được
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
