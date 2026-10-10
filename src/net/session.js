/* Session — phiên online của người chơi: phòng 4 slot (2 đội x vị trí DEF / FWD) phía người chơi: phòng chờ, vào trận, vòng lặp khách (gửi phím + nội suy).
 * KHÔNG CÓ UI: không gọi Menu / UI / Audio / Intro, không có chữ hiển thị. Báo mọi thay đổi qua sự kiện (Session.on) với mã
 * trung tính; giao diện (src/ui/online.js) tự quyết trang nào, chữ gì, banner nào -> sửa UI thoải mái không đụng tới online.
 * Dữ liệu của game cần cho phòng (hồ sơ trận, Area đã tới) lấy qua Session.provide({ profile, area }).
 *
 * 2 mô hình, cùng 1 bản luật phòng (src/net/room.js):
 *  - Máy chủ riêng (net.server.url, transport-server.js): máy chủ chạy trận, người tạo phòng chỉ là khách có quyền chủ phòng.
 *    TẠO PHÒNG thử máy chủ trước (đang ngủ thì chờ dậy); không được thì tự chuyển sang người chơi làm host.
 *  - Người chơi làm host (Steam / PeerJS): máy này chạy Room (ghế local 'host') và nối sao tới tối đa net.maxPlayers - 1 khách.
 *  VÀO PHÒNG: mã bắt đầu bằng net.server.codeFirst = phòng máy chủ riêng, còn lại = phòng người chơi làm host.
 *  Người chơi KHÔNG được biết đang dùng cách nào: sự kiện + mã lỗi giống nhau ở cả 2 cách.
 *
 * Sự kiện (Session.on(tên, fn(data))):
 *   busy {action: 'create'|'join', code?}   bắt đầu tạo / vào phòng      · waiting {action, code?}  vẫn đang chờ kết nối (huỷ được: cancel())
 *   lobby {entered?, pending?}              vào / phòng chờ đổi (pending: chưa nhận danh sách phòng)
 *   notice {kind: 'joined'|'left', name}    người khác vào / rời phòng chờ (máy làm host)
 *   role {role}                             vị trí của mình đổi theo slot (game cập nhật lựa chọn, profile() trả vị trí mới)
 *   start {game, resume}                    vào trận (resume: kết nối lại giữa trận) · toLobby  hết trận, về phòng chờ
 *   player {kind: 'away'|'left'|'back', name}  người khác mất kết nối / rời trận / quay lại · owner  chủ phòng đổi
 *   reconnecting                            mình mất kết nối giữa trận, đang thử vào lại · getReady  xem xong giới thiệu, chờ người khác
 *   closed {reason, from: 'create'|'join'|'room', ranked}  hết phiên online. reason: left · closed · lost · cancelled · not-found ·
 *                                           full · started · version · busy · expired · rejoin-failed · unsupported · in-use · connect
 *   solo                                    tìm trận xếp hạng không ghép được người thật (không ai đang tìm / không kết nối được /
 *                                           máy chủ bận): game tự ghép người chơi giả (MainPath.matchmake) như khi chơi một mình
 *
 * Tìm trận xếp hạng (Main Path, chỉ máy chủ riêng): queue() -> máy chủ ghép (src/net/matchmaker.js) -> vào phòng xếp hạng như khách
 * (không có phòng chờ, không sự kiện lobby) -> start {game} như trận thường (opts.ranked + opts.mainPath) | solo. cancelQueue() = bỏ tìm.
 *
 * Gói tin:
 *   khách -> host : hello{v,pf,tok?} · pf{pf} (đổi đồng đội / chỉ số) · slot{s} (nhảy slot) · intro (xem xong màn giới thiệu) ·
 *                   i{d,p} (phím) · pick{i} · reroll · bye · begin{area} / toLobby (chủ phòng, phòng máy chủ riêng) · ka (giữ thức)
 *   khách -> máy chủ (trước khi vào phòng): queue{v,elo,role,pf} · unqueue — xem transport-server.js
 *   host  -> khách: you{tok} (mã kết nối lại) · lobby{m:[{id,pf,slot}],o} · start{opts} · s{f,s,fx,sfx,ev} (snapshot) ·
 *                   drop{seat,o,away?} (1 người rời / mất kết nối) · back{seat,o} (người đó kết nối lại) ·
 *                   full · started · expired · version · bye
 *   Kết nối lại (net.reconnectGrace): mất kết nối giữa trận -> giữ trận, thử vào lại phòng mỗi 2 giây với tok (room.js)
 *   pf = hồ sơ trận công khai — xem SFC.Profile.matchPublic(): tên, level, ngoại hình, Core đã mở,
 *        vị trí + chỉ số / OVR của character, đồng đội đang chọn (Mates.spec)
 *   id = 'host' | id khách (peer id / steamId / id máy chủ cấp) · o = id chủ phòng ·
 *   slot s = đội x số vị trí + chỉ số vị trí (game.config.js -> roles)
 *
 * Luật trận giống Main Path: mỗi người chỉ điều khiển character của mình (vị trí = slot), bốc Core trong bộ đã mở khoá;
 * Core riêng từng người (co-op cũng vậy). Đội có người đá cho CLB riêng (mainPath.playerTeam, tên theo người đầu tiên của đội).
 */
window.SFC = window.SFC || {};

(function () {
  const N = () => SFC_CONFIG.net;
  const Net = () => SFC.Net;
  const NC = () => SFC.NetCommon;
  const Sync = () => SFC.Sync;
  const Slots = () => SFC.Room.Slots;
  const ROLES = () => SFC_CONFIG.game.roles;
  const clampInt = (v, a, b) => Math.max(a, Math.min(b, Math.round(+v) || 0));

  const listeners = {};

  const Session = {
    role: null,          // 'host' (máy này chạy trận) | 'guest'
    status: 'idle',      // idle | busy | searching (tìm trận xếp hạng) | lobby | playing
    ranked: false,       // phiên tìm / đá trận xếp hạng
    code: null,
    room: null,          // host: SFC.Room
    lobby: { members: [], owner: null },   // [{ id, pf, slot }] · host: chính là room.lobby
    game: null,          // host: trận thật · khách: trận "gương"
    NO_INPUT: null,      // phím rỗng (UI truyền vào tick khi đang mở menu / chọn Core / hết trận)

    /* ================= GHÉP VỚI GAME ================= */
    on(name, fn) { (listeners[name] || (listeners[name] = [])).push(fn); return () => { listeners[name] = listeners[name].filter((f) => f !== fn); }; },
    emit(name, data) { for (const fn of listeners[name] || []) fn(data || {}); },
    // profile(): hồ sơ trận công khai của người chơi (vị trí đang chọn + đồng đội) · area(): Area cao nhất đã tới (đội bot / sân)
    // rank(): Main Path của người chơi { area, elo, reward } (tìm trận xếp hạng + opts.mainPath của trận xếp hạng)
    provider: { profile: () => SFC.Profile.sanitizePublic({}), area: () => 0, rank: () => ({ area: 0, elo: 0, reward: 1 }) },
    provide(p) { Object.assign(this.provider, p); },
    myPf() { return this.provider.profile(); },
    // sắp vào online (mở menu ONLINE): khởi động trước những gì cần (máy chủ đang ngủ thì đánh thức)
    prepare() { if (NC().serverOn()) SFC.NetServer.wake(); },

    get active() { return this.status !== 'idle'; },
    get isHost() { return this.role === 'host'; },
    // chủ phòng: được START / về phòng chờ (người chơi làm host, hoặc người tạo phòng máy chủ riêng)
    get isOwner() { return !!this.lobby.owner && this.lobby.owner === Net().id; },
    get onServer() { return Net() === SFC.NetServer; },
    // đang chờ kết nối (tạo / vào phòng) và huỷ được
    get cancellable() { return this.status === 'busy' && !!this.waitingServer; },
    // máy làm host đang giữ trận đứng yên chờ mọi người xem xong giới thiệu
    get holding() { return this.isHost && !!this.room && this.room.introHold; },

    /* ================= SLOT ================= */
    get nSlots() { return Slots().n(); },
    slotTeam(s) { return Slots().team(s); },
    slotRole(s) { return Slots().role(s); },
    slotOf(team, role) { return Slots().of(team, role); },
    memberAt(s) { return Slots().memberAt(this.lobby, s); },
    get benched() { return Slots().benched(this.lobby); },
    get mine() { return this.lobby.members.find((m) => m.id === Net().id) || null; },
    byTeam() { return Slots().byTeam(this.lobby); },
    get mode() { return Slots().mode(this.lobby); },

    /* ================= PHÒNG ================= */
    // máy chủ riêng trước (nếu có; đang ngủ thì chờ dậy), không được -> người chơi làm host (Steam / PeerJS)
    createRoom() {
      if (this.status === 'busy') return;
      this.status = 'busy';
      this.emit('busy', { action: 'create' });
      if (!NC().serverOn()) { this.hostLocally(); return; }
      this.waitingServer = true;
      this.use(SFC.NetServer).host(() => this.emit('waiting', { action: 'create' }))
        .then((code) => { this.waitingServer = false; this.enterAsGuest(code); })
        .catch((e) => {
          this.waitingServer = false;
          SFC.NetServer.close();
          if (this.status !== 'busy') return;
          if (e && e.type === 'cancelled') { this.fail(e, 'create'); return; }
          this.hostLocally();
        });
    },

    hostLocally() {
      this.use(NC().p2p()).host().then((c) => this.enterAsHost(c)).catch((e) => this.fail(e, 'create'));
    },

    joinRoom(code) {
      if (this.status === 'busy') return;
      this.status = 'busy';
      this.emit('busy', { action: 'join', code });
      const server = NC().serverOn() && NC().isServerCode(code);
      const opts = server ? { wait: true, onWait: () => this.emit('waiting', { action: 'join', code }) } : {};
      this.waitingServer = server;
      this.use(server ? SFC.NetServer : NC().p2p()).join(code, opts)
        .then(() => { this.waitingServer = false; this.enterAsGuest(code); })
        .catch((e) => { this.waitingServer = false; this.fail(e, 'join'); });
    },

    // huỷ tạo / vào phòng đang chờ kết nối
    cancel() {
      if (this.cancellable) SFC.NetServer.cancel();
    },

    /* ================= TÌM TRẬN XẾP HẠNG ================= */
    // vào hàng chờ trên máy chủ riêng. Mọi đường không ghép được người thật -> solo (không báo lỗi)
    queue() {
      if (this.status !== 'idle' || !NC().serverOn()) { this.emit('solo'); return; }
      this.status = 'searching';
      this.ranked = true;
      this.role = 'guest';
      const pf = this.myPf();
      this.use(SFC.NetServer).queue({ elo: this.provider.rank().elo, role: pf.role, pf })
        .then((code) => {
          if (this.status !== 'searching') return;
          this.code = code;
          this.keepAlive();
          Net().send({ t: 'hello', v: N().protocol, pf: this.myPf() });
        })
        .catch(() => this.solo());
    },

    // bỏ tìm (rời trang tìm trận / CANCEL). Đã ghép xong mà chưa vào trận cũng bỏ luôn (AI đá thay ghế đó)
    cancelQueue() {
      if (this.status !== 'searching') return;
      SFC.NetServer.cancel();
      this.reset();
    },

    // không ghép được người thật: đóng kết nối, game tự ghép người chơi giả
    solo() {
      if (this.status !== 'searching') return;
      Net().close();
      this.reset();
      this.emit('solo');
    },

    // phòng máy chủ riêng: gói nhỏ định kỳ để máy chủ gói miễn phí không "ngủ" khi cả phòng ngồi yên (phòng chờ / màn kết quả)
    keepAlive() {
      clearInterval(this.ka);
      if (this.onServer && N().server.keepAlive > 0) this.ka = setInterval(() => { if (this.onServer && this.status !== 'idle') Net().send({ t: 'ka' }); }, N().server.keepAlive * 1000);
    },

    // chọn backend cho phòng này + gắn handler
    use(backend) {
      NC().use(backend);
      backend.on(this.handlers());
      return backend;
    },

    // máy này chạy trận (người chơi làm host)
    enterAsHost(code) {
      this.role = 'host';
      this.code = code;
      this.room = new SFC.Room({
        send: (m, id) => Net().send(m, id),
        drop: (id) => Net().drop(id),
        local: { id: 'host', pf: () => this.myPf() },
        snapshotEvery: N().snapshotEvery,
        hooks: this.roomHooks(),
      });
      this.lobby = this.room.lobby;
      this.status = 'lobby';
      this.emit('lobby', { entered: true });
    },

    // khách (phòng người chơi làm host, hoặc mọi người ở phòng máy chủ riêng)
    enterAsGuest(code) {
      this.role = 'guest';
      this.keepAlive();
      this.code = code;
      this.lobby = { members: [], owner: null };
      this.status = 'lobby';
      Net().send({ t: 'hello', v: N().protocol, pf: this.myPf() });
      this.emit('lobby', { entered: true, pending: true });
    },

    // Room (người chơi làm host) -> sự kiện. Sự kiện trận (g.events) để lại cho UI tiêu thụ
    roomHooks() {
      return {
        changed: () => this.emit('lobby'),
        joined: (name) => this.emit('notice', { kind: 'joined', name }),
        left: (name) => this.emit('notice', { kind: 'left', name }),
        dropped: (name, away) => this.emit('player', { kind: away ? 'away' : 'left', name }),
        back: (name) => this.emit('player', { kind: 'back', name }),
        toLobby: () => { this.status = 'lobby'; this.game = null; this.emit('toLobby'); },
        start: (game) => { this.game = game; this.status = 'playing'; this.emit('start', { game, resume: false }); },
        events: () => {},
        localRole: (role) => this.emit('role', { role }),
      };
    },

    // hết phiên vì lỗi / bị từ chối / huỷ. from: đang làm gì (create | join | room)
    fail(e, from = 'room') {
      if (this.status === 'searching') { this.solo(); return; }   // phòng xếp hạng từ chối trước khi vào trận
      const ranked = this.ranked;
      Net().close();
      this.reset();
      this.emit('closed', { reason: NC().kind(e), from, ranked });
    },

    // rời phòng chủ động
    leave() {
      if (this.status === 'idle') return;
      if (this.status === 'searching') { this.cancelQueue(); return; }
      const net = Net(), ranked = this.ranked;
      net.send({ t: 'bye' });
      setTimeout(() => net.close(), 150);
      this.reset();
      this.emit('closed', { reason: 'left', from: 'room', ranked });
    },

    reset() {
      this.role = null; this.status = 'idle'; this.code = null; this.game = null; this.ranked = false;
      this.room = null;
      this.lobby = { members: [], owner: null };
      this.buf = [];
      this.tok = null;             // mã kết nối lại do phòng cấp (you{tok})
      this.waitingServer = false;  // đang chờ máy chủ dậy (huỷ được)
      this.roomClosed = false;     // phòng đóng hẳn (bye) -> closed{reason: 'closed'} thay vì 'lost'
      clearInterval(this.ka);
      this.rejoining = null;       // đang kết nối lại: hạn chót (Date.now())
      clearTimeout(this.retry);
    },

    handlers() {
      return {
        open: () => { /* host: chờ gói hello của khách */ },
        data: (m, id) => this.onData(m, id),
        close: (id) => this.onPeerGone(id),
        error: (e) => { if (this.status === 'playing' || this.status === 'lobby') console.warn('[net]', e); },
      };
    },

    onPeerGone(id) {
      if (this.status === 'idle') return;
      if (this.isHost) { if (this.room) this.room.gone(id); return; }
      if (this.status === 'searching') { this.solo(); return; }
      // trận xếp hạng đã hết (phòng đóng sau trận): không cần vào lại
      const over = this.ranked && this.game && this.game.state === 'ended';
      // mất kết nối giữa trận: thử vào lại thay vì về menu
      if (this.status === 'playing' && this.tok && N().reconnectGrace > 0 && !over) { this.reconnect(); return; }
      const closed = this.roomClosed, ranked = this.ranked;
      Net().close();
      this.reset();
      this.emit('closed', { reason: closed ? 'closed' : 'lost', from: 'room', ranked });
    },

    // khách mất kết nối giữa trận: giữ nguyên trận, vào lại phòng (cùng backend, cùng mã) mỗi 2 giây với tok
    // tới khi phòng gửi start{resume} (guestStart) hoặc quá net.reconnectGrace giây
    reconnect() {
      const net = Net(), code = this.code;
      clearTimeout(this.retry);
      if (!this.rejoining) {
        this.rejoining = Date.now() + N().reconnectGrace * 1000;
        this.emit('reconnecting');
      }
      const attempt = () => {
        if (!this.rejoining || this.status !== 'playing') return;
        if (Date.now() > this.rejoining) { this.fail({ type: 'rejoin-failed' }); return; }
        net.on(this.handlers());
        net.join(code)
          .then(() => net.send({ t: 'hello', v: N().protocol, pf: this.myPf(), tok: this.tok }))
          .catch(() => { if (this.rejoining) this.retry = setTimeout(attempt, 2000); });
      };
      this.retry = setTimeout(attempt, 500);
    },

    // hồ sơ của mình đổi (đồng đội / vị trí / chỉ số) -> báo phòng
    updateProfile() {
      if (this.status !== 'lobby') return;
      if (this.isHost) { this.room.refreshLocal(); this.room.sendLobby(); }
      else Net().send({ t: 'pf', pf: this.myPf() });
      this.emit('lobby');
    },

    // nhảy vào slot s (slot trống / -1 = GUEST)
    requestSlot(s) {
      const me = this.mine;
      if (this.status !== 'lobby' || s < -1 || s >= this.nSlots || this.memberAt(s) || (me && me.slot === s)) return;
      if (this.isHost) this.room.moveMember('host', s);
      else Net().send({ t: 'slot', s });
    },
    // vòng qua các slot trống theo chiều d, GUEST đứng cuối vòng (luôn chọn được)
    cycleSlot(d) {
      const me = this.mine;
      if (!me) return;
      const list = [...Array(this.nSlots).keys(), -1], n = list.length, i = list.indexOf(me.slot);
      for (let k = 1; k < n; k++) {
        const s = list[(((i + d * k) % n) + n) % n];
        if (!this.memberAt(s)) return this.requestSlot(s);
      }
    },

    onData(m, id) {
      if (!m || !m.t) return;
      if (this.isHost) return this.room && this.room.onData(m, id);
      return this.guestData(m);
    },

    guestData(m) {
      switch (m.t) {
        case 'lobby': {
          this.lobby.members = this.sanitizeMembers(m.m);
          this.lobby.owner = typeof m.o === 'string' ? m.o : null;
          if (this.status === 'playing') {
            this.status = 'lobby'; this.game = null;
            this.emit('toLobby');
            // sau trận có thể đã lên level / đổi chỉ số -> gửi lại hồ sơ trận
            Net().send({ t: 'pf', pf: this.myPf() });
          }
          // vị trí character theo slot đang đứng
          if (this.mine && this.mine.slot >= 0) {
            const role = this.slotRole(this.mine.slot);
            if (role !== this.myPf().role) { this.emit('role', { role }); Net().send({ t: 'pf', pf: this.myPf() }); }
          }
          this.emit('lobby');
          break;
        }
        case 'you': if (typeof m.tok === 'string') this.tok = m.tok; break;
        case 'start': this.guestStart(m); break;
        case 's': if (this.status === 'playing') this.buf.push(m); break;
        case 'drop':
          if (typeof m.o === 'string') this.setOwner(m.o);
          if (this.game) {
            const p = this.game.seatPlayer(m.seat | 0);
            this.game.dropSeat(m.seat | 0);
            this.emit('player', { kind: m.away ? 'away' : 'left', name: p ? p.name : '' });
          }
          break;
        case 'back':
          if (typeof m.o === 'string') this.setOwner(m.o);
          if (this.game) {
            this.game.resumeSeat(m.seat | 0);
            const p = this.game.seatPlayer(m.seat | 0);
            if (m.seat !== this.game.me) this.emit('player', { kind: 'back', name: p ? p.name : '' });
          }
          break;
        case 'expired': this.fail({ type: 'expired' }); break;
        case 'full': this.fail({ type: 'full' }, 'join'); break;
        case 'started': this.fail({ type: 'started' }, 'join'); break;
        case 'version': this.fail({ type: 'version' }, 'join'); break;
        // phòng đóng hẳn (host rời / máy chủ đóng phòng): không thử kết nối lại
        case 'bye': this.tok = null; this.roomClosed = true; Net().close(); this.onPeerGone('host'); break;
      }
    },

    // chủ phòng đổi giữa trận (người chủ cũ rời / mất kết nối)
    setOwner(id) {
      if (this.lobby.owner === id) return;
      this.lobby.owner = id;
      this.emit('owner');
    },

    sanitizeMembers(list) {
      const out = [];
      for (const x of Array.isArray(list) ? list.slice(0, N().maxPlayers) : []) {
        if (!x || typeof x.id !== 'string') continue;
        const slot = clampInt(x.slot, -1, this.nSlots - 1);
        if (out.some((o) => (slot >= 0 && o.slot === slot) || o.id === x.id)) continue;
        out.push({ id: x.id, pf: SFC.Profile.sanitizePublic(x.pf) || SFC.Profile.sanitizePublic({}), slot });
      }
      return out;
    },

    /* ================= VÀO TRẬN ================= */
    // chủ phòng, đủ người và không ai còn ngồi GUEST
    get canStart() { return this.status === 'lobby' && this.isOwner && Slots().ready(this.lobby); },

    startMatch() {
      if (!this.canStart) return;
      const area = this.provider.area();
      if (this.isHost) this.room.startMatch(area);
      else Net().send({ t: 'begin', area });
    },

    guestStart(m) {
      const o = m.opts || {}, roles = ROLES(), list = SFC_CONFIG.cores.list;
      const seats = (Array.isArray(o.seats) ? o.seats.slice(0, N().maxPlayers) : []).map((s) => ({
        team: s && s.team === 1 ? 1 : 0,
        idx: clampInt(s && s.idx, 0, roles.length - 1),
        avatar: SFC.Profile.sanitizePublic(s && s.avatar),
        cores: s && Array.isArray(s.cores) ? s.cores.filter((id) => list[id]) : null,
      }));
      if (!seats.length) return;
      const me = clampInt(o.me, 0, seats.length - 1);
      const clubs = [0, 1].map((t) => {
        const c = (Array.isArray(o.clubs) && o.clubs[t]) || {};
        return c.id ? { id: String(c.id) } : { name: SFC.Profile.cleanName(String(c.name || '')).trim() || 'PLAYER', away: !!c.away };
      });
      const [home, away] = SFC.Room.registerClubs(clubs);
      // đồng đội AI mỗi đội: 1 người, hoặc mảng (trận xếp hạng: đội không ai vào được = 2 người chơi giả)
      const mate = (x) => (Array.isArray(x) ? x.slice(0, roles.length).map((y) => SFC.Profile.sanitizeMate(y)).filter(Boolean) : SFC.Profile.sanitizeMate(x));
      // trận xếp hạng: Main Path của máy này (Area / Elo / thưởng) + Elo trung bình 2 đội phòng gửi (mỗi người tự tính Elo sau trận)
      const mp = o.ranked && o.mainPath && typeof o.mainPath === 'object' ? Object.assign({}, this.provider.rank(), {
        myElo: Math.max(0, +o.mainPath.myElo || 0), oppElo: Math.max(0, +o.mainPath.oppElo || 0),
      }) : undefined;
      // trận "gương": cùng đội hình / character / slot như host, nhưng góc nhìn slot của máy này
      this.game = new SFC.Game({
        home, away, online: true, me, humanTeam: seats[me].team, seats,
        difficulty: N().difficulty, aiProfile: this.sanitizeAi(o.aiProfile), mateProfile: this.sanitizeAi(o.mateProfile),
        mateDifficulty: SFC_CONFIG.game.ai.difficulty[o.mateDifficulty] ? o.mateDifficulty : undefined,
        draftTimeLimit: +o.draftTimeLimit || 0,
        mates: (Array.isArray(o.mates) ? o.mates.slice(0, 2) : []).map(mate),
        arena: SFC_CONFIG.arenas[o.arena] ? o.arena : undefined,
        resume: o.resume ? 1 : undefined,
        ranked: mp ? 1 : undefined, mainPath: mp,
      });
      this.game.events.length = 0;
      this.buf = [];
      this.renderF = null;
      this.lastTick = null;
      this.pressedMask = 0;
      this.sentDown = -1;
      this.status = 'playing';
      // kết nối lại giữa trận: phòng gửi kèm danh sách phòng chờ (gói lobby giữa trận sẽ đưa khách về phòng chờ)
      const resume = !!o.resume;
      if (resume && o.lobby) {
        this.lobby.members = this.sanitizeMembers(o.lobby.m);
        this.lobby.owner = typeof o.lobby.o === 'string' ? o.lobby.o : null;
      }
      this.rejoining = null;
      clearTimeout(this.retry);
      this.emit('start', { game: this.game, resume });
    },

    // độ khó AI đội bot (MainPath.aiProfile): chỉ giữ số hợp lệ
    sanitizeAi(a) {
      if (!a || typeof a !== 'object') return undefined;
      const out = {};
      for (const k in a) if (typeof a[k] === 'number' && isFinite(a[k])) out[k] = a[k];
      return Object.keys(out).length ? out : undefined;
    },

    // máy này xem xong màn giới thiệu
    introDone() {
      if (!this.isHost) { Net().send({ t: 'intro' }); return; }
      this.room.localIntroDone();
      if (this.room.introHold) this.emit('getReady');
    },

    backToLobby() {
      if (this.isHost) this.room.backToLobby();
      else if (this.isOwner) Net().send({ t: 'toLobby' });
    },

    /* ================= VÒNG LẶP (60 bước/giây) ================= */
    // đồng hồ của phòng (màn giới thiệu, người vắng mặt quá hạn) — chạy cả khi trận đang đứng yên
    clock(dt) {
      if (this.isHost && this.room) { this.room.introClock(dt); this.room.expire(Date.now()); }
    },

    // 1 bước: input = phím người chơi tại máy này (UI tự đưa NO_INPUT khi phím không được vào trận)
    tick(dt, input) {
      if (!this.game) return;
      this.clock(dt);
      if (this.holding) return;
      if (this.isHost) this.room.step(dt, input);
      else this.guestTick(input);
    },

    guestTick(input) {
      this.pressedMask |= Sync().encode((a) => input.wasPressed(a));
      this.downMask = Sync().encode((a) => input.isDown(a));
    },

    // gọi mỗi khung hình (trước khi vẽ) -> trả về trận cần vẽ. Sự kiện trận (g.events) để lại cho UI tiêu thụ
    view(now) {
      const g = this.game;
      if (!g || this.isHost) return g;

      // gửi phím (chỉ khi thay đổi)
      if (this.downMask !== this.sentDown || this.pressedMask) {
        Net().send({ t: 'i', d: this.downMask | 0, p: this.pressedMask });
        this.sentDown = this.downMask;
        this.pressedMask = 0;
      }

      const buf = this.buf;
      const dt = this.lastTick == null ? 0 : Math.min(0.1, (now - this.lastTick) / 1000);
      this.lastTick = now;
      g.effects.updateCosmetic(dt);
      g.effects.updateOverlay(dt);
      if (!buf.length) return g;

      // đồng hồ vẽ chạy sau snapshot mới nhất một khoảng interpDelay
      const newest = buf[buf.length - 1].f;
      const delay = this.onServer ? N().server.interpDelay || N().interpDelay : N().interpDelay;
      const target = newest - delay * 60;
      if (this.renderF == null || Math.abs(this.renderF - target) > 12) this.renderF = target;
      else this.renderF += dt * 60 + (target - this.renderF) * 0.08;

      // phát hiệu ứng / âm thanh / sự kiện của các snapshot đã tới lượt
      while (buf.length > 1 && buf[1].f <= this.renderF) this.consumeSnap(buf.shift());
      const a = buf[0];
      this.consumeSnap(a);
      Sync().apply(g, a.s);
      const b = buf[1];
      if (b) Sync().blend(g, a.s, b.s, Math.min(1, Math.max(0, (this.renderF - a.f) / (b.f - a.f))));
      Sync().trail(g);
      return g;
    },

    consumeSnap(m) {
      if (m.played) return;
      m.played = true;
      Sync().apply(this.game, m.s);
      Sync().replay(this.game, m);
    },

    // người chơi tại máy này chọn Core
    pick(i) {
      const g = this.game;
      if (!g || !g.draft) return;
      if (this.isHost) { g.pickCore(i, g.me); return; }
      if (g.draft.localPick != null) return;
      g.draft.localPick = i;
      g.draft.picked[g.me] = 1;
      Net().send({ t: 'pick', i });
    },

    // người chơi tại máy này đổi 3 lá Core
    reroll() {
      const g = this.game;
      if (!g || !g.draft) return;
      if (this.isHost) { g.rerollDraft(g.me); return; }
      if (g.draft.localPick != null) return;
      Net().send({ t: 'reroll' });
    },
  };

  Session.reset();
  Object.defineProperty(Session, 'NO_INPUT', { get: () => Sync().NULL_INPUT });
  SFC.Session = Session;
})();
