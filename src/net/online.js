/* Online — phòng 4 slot (2 đội x vị trí DEF / FWD) phía người chơi: phòng chờ, vào trận, vòng lặp khách (gửi phím + vẽ).
 * 2 mô hình, cùng 1 bản luật phòng (src/net/room.js):
 *  - Máy chủ riêng (net.server.url, transport-server.js): máy chủ chạy trận, người tạo phòng chỉ là khách có quyền chủ phòng.
 *    TẠO PHÒNG thử máy chủ trước; không tới được thì tự chuyển sang người chơi làm host.
 *  - Người chơi làm host (Steam / PeerJS): máy này chạy Room (ghế local 'host') và nối sao tới tối đa net.maxPlayers - 1 khách.
 *  VÀO PHÒNG: mã bắt đầu bằng net.server.codeFirst = phòng máy chủ riêng, còn lại = phòng người chơi làm host.
 *  Người chơi KHÔNG được biết đang dùng cách nào: mọi thông báo, mã phòng, nhãn trong phòng chờ giống nhau ở cả 2 cách.
 * Người chơi tự nhảy qua lại giữa các slot trống:
 *  - 2 đội đều có người = VERSUS · mọi người cùng 1 đội = CO-OP, đội kia là đội bot ngẫu nhiên (net.bots)
 *  - slot trống của đội có đúng 1 người = đồng đội đang chọn (NHÂN VẬT > TEAM) của người đó, AI đá
 *
 * Gói tin:
 *   khách -> host : hello{v,pf,tok?} · pf{pf} (đổi đồng đội / chỉ số) · slot{s} (nhảy slot) · intro (xem xong màn giới thiệu) ·
 *                   i{d,p} (phím) · pick{i} · reroll · bye · begin{area} / toLobby (chủ phòng, phòng máy chủ riêng)
 *   host  -> khách: you{tok} (mã kết nối lại) · lobby{m:[{id,pf,slot}],o} · start{opts} · s{f,s,fx,sfx,ev} (snapshot) ·
 *                   drop{seat,o,away?} (1 người rời / mất kết nối) · back{seat,o} (người đó kết nối lại) ·
 *                   full · started · expired · version · bye
 *   Kết nối lại (net.reconnectGrace): mất kết nối giữa trận -> giữ màn trận, thử vào lại phòng mỗi 2 giây với tok (room.js)
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
  // phím "quay lại" để hiện trong thông báo (tay cầm / bàn phím)
  const backKey = () => (SFC.Input && SFC.Input.key ? SFC.Input.key('back', 'Esc') : 'Esc');

  const Online = {
    role: null,          // 'host' (máy này chạy trận) | 'guest'
    status: 'idle',      // idle | busy | lobby | playing
    code: null,
    room: null,          // host: SFC.Room
    lobby: { members: [], owner: null },   // [{ id, pf, slot }] · host: chính là room.lobby
    game: null,          // host: trận thật · khách: trận "gương"
    overlay: false,      // đang mở menu trong trận (không tạm dừng)

    get active() { return this.status !== 'idle'; },
    get isHost() { return this.role === 'host'; },
    // chủ phòng: được START / về phòng chờ (người chơi làm host, hoặc người tạo phòng máy chủ riêng)
    get isOwner() { return !!this.lobby.owner && this.lobby.owner === Net().id; },
    get onServer() { return Net() === SFC.NetServer; },

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

    // vị trí character chọn ở menu (sel.ctrl, dùng chung Main Path)
    myRole() {
      const app = SFC.Menu.app;
      return ROLES()[app.sel.ctrl ? app.sel.ctrl - 1 : ROLES().indexOf('FWD')] || 'FWD';
    },
    // nhảy slot -> vị trí character theo slot (menu Main Path cũng nhớ vị trí này)
    syncRole(role) {
      const i = ROLES().indexOf(role);
      if (i >= 0) SFC.Menu.app.sel.ctrl = i + 1;
    },

    /* ================= PHÒNG ================= */
    // máy chủ riêng trước (nếu có; đang ngủ thì chờ dậy), không được -> người chơi làm host (Steam / PeerJS), không báo gì khác.
    // Esc khi đang chờ = huỷ tạo phòng
    createRoom() {
      if (this.status === 'busy') return;
      this.status = 'busy';
      const msg = 'Creating room...';
      SFC.Menu.go('online', msg);
      if (!NC().serverOn()) { this.hostLocally(); return; }
      this.waitingServer = true;
      this.use(SFC.NetServer).host(() => SFC.Menu.setMsg(`${msg} · ${backKey()} cancel`))
        .then((code) => { this.waitingServer = false; this.enterAsGuest(code); })
        .catch((e) => {
          this.waitingServer = false;
          SFC.NetServer.close();
          if (this.status !== 'busy') return;
          if (e && e.type === 'cancelled') { this.fail(e); return; }
          this.hostLocally();
        });
    },

    hostLocally() {
      this.use(NC().p2p()).host().then((c) => this.enterAsHost(c)).catch((e) => this.fail(e));
    },

    joinRoom(code) {
      if (this.status === 'busy') return;
      this.status = 'busy';
      SFC.Menu.setMsg('Connecting to room ' + code + '...');
      const server = NC().serverOn() && NC().isServerCode(code);
      const opts = server ? { wait: true, onWait: () => SFC.Menu.setMsg(`Connecting to room ${code}... · ${backKey()} cancel`) } : {};
      this.waitingServer = server;
      this.use(server ? SFC.NetServer : NC().p2p()).join(code, opts)
        .then(() => { this.waitingServer = false; this.enterAsGuest(code); })
        .catch((e) => { this.waitingServer = false; this.fail(e, 'join'); });
    },

    // Esc khi đang chờ máy chủ dậy: huỷ TẠO / VÀO PHÒNG
    cancelWait() {
      if (this.waitingServer) SFC.NetServer.cancel();
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
      SFC.Menu.go('lobby');
    },

    // khách (phòng người chơi làm host, hoặc mọi người ở phòng máy chủ riêng)
    enterAsGuest(code) {
      this.role = 'guest';
      // phòng máy chủ riêng: gói nhỏ định kỳ để máy chủ gói miễn phí không "ngủ" khi cả phòng ngồi yên (phòng chờ / màn kết quả)
      clearInterval(this.ka);
      if (this.onServer && N().server.keepAlive > 0) this.ka = setInterval(() => { if (this.onServer && this.status !== 'idle') Net().send({ t: 'ka' }); }, N().server.keepAlive * 1000);
      this.code = code;
      this.lobby = { members: [], owner: null };
      this.status = 'lobby';
      Net().send({ t: 'hello', v: N().protocol, pf: this.myPf() });
      SFC.Menu.go('lobby', 'Waiting for room info...');
    },

    // Room (người chơi làm host) -> UI máy này
    roomHooks() {
      return {
        changed: () => SFC.Menu.render(),
        joined: (name) => { SFC.Menu.go('lobby', `${name} joined!`); SFC.Audio.pick(); },
        left: (name) => SFC.Menu.go('lobby', `${name} left the room.`, true),
        dropped: (name, away) => SFC.UI.banner(away ? `${name} DISCONNECTED` : `${name} LEFT`, away ? 'AI plays until they reconnect' : 'AI takes over', '#9aa3b5', 1.6),
        back: (name) => SFC.UI.banner(`${name} RECONNECTED`, 'Back in control', '#7dff9a', 1.4),
        toLobby: () => { this.status = 'lobby'; this.game = null; this.overlay = false; SFC.Menu.app.toMenu('lobby'); },
        start: (game) => { this.game = game; this.status = 'playing'; SFC.Menu.app.enterOnline(game); },
        events: (g) => SFC.UI.consume(g),
        localRole: (role) => this.syncRole(role),
      };
    },

    fail(e, page = 'online') {
      Net().close();
      this.reset();
      SFC.Menu.app.toMenu(page);
      SFC.Menu.setMsg(Net().message(e), true);
    },

    // rời phòng chủ động
    leave() {
      const net = Net();
      net.send({ t: 'bye' });
      setTimeout(() => net.close(), 150);
      this.reset();
      SFC.Menu.app.toMenu('online');
    },

    reset() {
      this.role = null; this.status = 'idle'; this.code = null; this.game = null; this.overlay = false;
      this.room = null;
      this.lobby = { members: [], owner: null };
      this.buf = [];
      this.tok = null;             // mã kết nối lại do phòng cấp (you{tok})
      this.waitingServer = false;  // đang chờ máy chủ dậy (Esc huỷ được)
      this.roomClosed = false;     // phòng đóng hẳn (bye) -> câu "The room was closed." thay vì mất kết nối
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
      // mất kết nối giữa trận: thử vào lại thay vì về menu
      if (this.status === 'playing' && this.tok && N().reconnectGrace > 0) { this.reconnect(); return; }
      const closed = this.roomClosed;
      Net().close();
      this.reset();
      SFC.Menu.app.toMenu('online');
      SFC.Menu.setMsg(closed ? 'The room was closed.' : 'Lost connection to the room.', true);
    },

    // khách mất kết nối giữa trận: giữ nguyên màn trận, vào lại phòng (cùng backend, cùng mã) mỗi 2 giây với tok
    // tới khi phòng gửi start{resume} (guestStart) hoặc quá net.reconnectGrace giây
    reconnect() {
      const net = Net(), code = this.code;
      clearTimeout(this.retry);
      if (!this.rejoining) {
        this.rejoining = Date.now() + N().reconnectGrace * 1000;
        SFC.UI.banner('CONNECTION LOST', 'Reconnecting...', '#ff6b6b', 2);
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

    // hồ sơ trận của người chơi tại máy này: vị trí đang chọn + đồng đội đang chọn (đá vị trí còn lại)
    myPf() {
      const idx = ROLES().indexOf(this.myRole());
      return SFC.Profile.matchPublic(ROLES()[idx], SFC.Menu.app.mateSpec(idx));
    },

    // đổi đồng đội trong phòng chờ -> báo máy kia
    updatePf() {
      if (this.isHost) { this.room.refreshLocal(); this.room.sendLobby(); }
      else Net().send({ t: 'pf', pf: this.myPf() });
      SFC.Menu.render();
    },

    // nhảy vào slot s (bấm slot trống / GUEST / ←→ ở mục SLOT)
    requestSlot(s) {
      const me = this.mine;
      if (this.status !== 'lobby' || s < -1 || s >= this.nSlots || this.memberAt(s) || (me && me.slot === s)) return;
      if (this.isHost) this.room.moveMember('host', s);
      else Net().send({ t: 'slot', s });
    },
    // ←→: vòng qua các slot trống theo chiều d, GUEST đứng cuối vòng (luôn chọn được)
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
        case 'lobby':
          this.lobby.members = this.sanitizeMembers(m.m);
          this.lobby.owner = typeof m.o === 'string' ? m.o : null;
          if (this.status === 'playing') {
            this.status = 'lobby'; this.game = null; this.overlay = false; SFC.Menu.app.toMenu('lobby');
            // sau trận có thể đã lên level / đổi chỉ số -> gửi lại hồ sơ trận
            Net().send({ t: 'pf', pf: this.myPf() });
          }
          // vị trí character theo slot đang đứng
          if (this.mine && this.mine.slot >= 0) {
            const role = this.slotRole(this.mine.slot);
            if (role !== this.myRole()) { this.syncRole(role); Net().send({ t: 'pf', pf: this.myPf() }); }
          }
          if (SFC.Menu.page === 'lobby') SFC.Menu.go('lobby', SFC.Menu.msg === 'Waiting for room info...' ? '' : SFC.Menu.msg, SFC.Menu.msgErr);
          break;
        case 'you': if (typeof m.tok === 'string') this.tok = m.tok; break;
        case 'start': this.guestStart(m); break;
        case 's': if (this.status === 'playing') this.buf.push(m); break;
        case 'drop':
          if (typeof m.o === 'string') this.lobby.owner = m.o;
          if (this.game) {
            const p = this.game.seatPlayer(m.seat | 0);
            this.game.dropSeat(m.seat | 0);
            const name = p ? p.name : 'A PLAYER';
            if (m.away) SFC.UI.banner(`${name} DISCONNECTED`, 'AI plays until they reconnect', '#9aa3b5', 1.6);
            else SFC.UI.banner(`${name} LEFT`, 'AI takes over', '#9aa3b5', 1.6);
            if (this.game.state === 'ended') SFC.UI.renderEndItems();   // vừa thành chủ phòng: hiện nút BACK TO LOBBY
          }
          break;
        case 'back':
          if (typeof m.o === 'string') this.lobby.owner = m.o;
          if (this.game) {
            this.game.resumeSeat(m.seat | 0);
            const p = this.game.seatPlayer(m.seat | 0);
            if (m.seat !== this.game.me) SFC.UI.banner(`${p ? p.name : 'A PLAYER'} RECONNECTED`, 'Back in control', '#7dff9a', 1.4);
            if (this.game.state === 'ended') SFC.UI.renderEndItems();
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
      if (this.isHost) this.room.startMatch(this.bestArea());
      else Net().send({ t: 'begin', area: this.bestArea() });
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
      // trận "gương": cùng đội hình / character / slot như host, nhưng góc nhìn slot của máy này
      this.game = new SFC.Game({
        home, away, online: true, me, humanTeam: seats[me].team, seats,
        difficulty: N().difficulty, aiProfile: this.sanitizeAi(o.aiProfile),
        mateDifficulty: SFC_CONFIG.game.ai.difficulty[o.mateDifficulty] ? o.mateDifficulty : undefined,
        draftTimeLimit: +o.draftTimeLimit || 0,
        mates: (Array.isArray(o.mates) ? o.mates.slice(0, 2) : []).map((x) => SFC.Profile.sanitizeMate(x)),
        arena: SFC_CONFIG.arenas[o.arena] ? o.arena : undefined,
        resume: o.resume ? 1 : undefined,
      });
      this.game.events.length = 0;
      this.buf = [];
      this.renderF = null;
      this.lastTick = null;
      this.pressedMask = 0;
      this.sentDown = -1;
      this.status = 'playing';
      // kết nối lại giữa trận: phòng gửi kèm danh sách phòng chờ (gói lobby giữa trận sẽ đưa khách về phòng chờ)
      const resumed = !!o.resume;
      if (resumed && o.lobby) {
        this.lobby.members = this.sanitizeMembers(o.lobby.m);
        this.lobby.owner = typeof o.lobby.o === 'string' ? o.lobby.o : null;
      }
      this.rejoining = null;
      clearTimeout(this.retry);
      SFC.Menu.app.enterOnline(this.game);
      if (resumed) SFC.UI.banner('RECONNECTED', 'Back in the match', '#7dff9a', 1.4);
    },

    // độ khó AI đội bot (MainPath.aiProfile): chỉ giữ số hợp lệ
    sanitizeAi(a) {
      if (!a || typeof a !== 'object') return undefined;
      const out = {};
      for (const k in a) if (typeof a[k] === 'number' && isFinite(a[k])) out[k] = a[k];
      return Object.keys(out).length ? out : undefined;
    },

    // Area cao nhất người chơi tại máy này đã tới (chọn đội bot / sân khi là chủ phòng; Area chưa mở không lộ ra)
    bestArea() {
      const MP = SFC.MainPath;
      return Math.min(MP.areas().length - 1, MP.state.best);
    },

    // máy này xem xong màn giới thiệu (main.js beginMatch)
    introDone() {
      if (!this.isHost) { Net().send({ t: 'intro' }); return; }
      this.room.localIntroDone();
      if (this.room.introHold) SFC.UI.banner('GET READY', 'Waiting for other players...', '#9aa3b5', 1.4);
    },

    backToLobby() {
      if (this.isHost) this.room.backToLobby();
      else if (this.isOwner) Net().send({ t: 'toLobby' });
    },

    /* ================= VÒNG LẶP (60 bước/giây) ================= */
    tick(dt, input) {
      const g = this.game;
      if (!g) return;
      // màn giới thiệu đang chiếu / host đang chờ máy khác xem xong: trận đứng yên (không mô phỏng, không gửi snapshot)
      if (this.isHost) { this.room.introClock(dt); this.room.expire(Date.now()); }
      if (SFC.Menu.app.screen === 'intro') { SFC.Intro.update(dt, input); return; }
      if (this.isHost && this.room.introHold) return;
      if (input.wasPressed('pause') && g.state !== 'ended') {
        this.overlay ? SFC.Menu.app.resume() : SFC.Menu.app.pause();
        return;
      }
      // xét trước khi menu xử lý phím: nút đóng menu (B) không lọt vào trận thành chuyền bổng / đá bay
      const play = this.overlay || g.state === 'draft' || g.state === 'ended' ? Sync().NULL_INPUT : input;
      if (this.overlay) SFC.UI.pauseInput(input);
      else if (g.state === 'draft') SFC.UI.draftInput(input, g);
      else if (g.state === 'ended') SFC.UI.endInput(input);
      if (this.isHost) this.room.step(dt, play);
      else this.guestTick(play);
    },

    guestTick(input) {
      this.pressedMask |= Sync().encode((a) => input.wasPressed(a));
      this.downMask = Sync().encode((a) => input.isDown(a));
    },

    // gọi mỗi khung hình (trước khi vẽ) -> trả về trận cần vẽ
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
      SFC.UI.consume(g);
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

  Online.reset();
  SFC.Online = Online;
})();
