/* Online — phòng 4 slot (2 đội x vị trí DEF / FWD): phòng chờ, vòng lặp host (mô phỏng + gửi snapshot), vòng lặp khách (gửi phím + vẽ).
 * Host chạy trận thật và nối sao tới tối đa net.maxPlayers - 1 khách. Người chơi tự nhảy qua lại giữa các slot trống:
 *  - 2 đội đều có người = VERSUS · mọi người cùng 1 đội = CO-OP, đội kia là đội bot ngẫu nhiên (net.bots)
 *  - slot trống của đội có đúng 1 người = đồng đội đang chọn (NHÂN VẬT > TEAM) của người đó, AI đá
 *
 * Gói tin:
 *   khách -> host : hello{v,pf} · pf{pf} (đổi đồng đội / chỉ số) · slot{s} (nhảy slot) · intro (xem xong màn giới thiệu) ·
 *                   i{d,p} (phím) · pick{i} · reroll · bye
 *   host  -> khách: lobby{m:[{id,pf,slot}]} · start{opts} · s{f,s,fx,sfx,ev} (snapshot) · drop{seat} (1 người rời trận) ·
 *                   toLobby · full · started · version · bye
 *   pf = hồ sơ trận công khai — xem SFC.Profile.matchPublic(): tên, level, ngoại hình, Core đã mở,
 *        vị trí + chỉ số / OVR của character, đồng đội đang chọn (Mates.spec)
 *   id = 'host' | peer id của khách · slot s = đội x số vị trí + chỉ số vị trí (game.config.js -> roles)
 *
 * Luật trận giống Main Path: mỗi người chỉ điều khiển character của mình (vị trí = slot), bốc Core trong bộ đã mở khoá;
 * Core riêng từng người (co-op cũng vậy). Đội có người đá cho CLB riêng (mainPath.playerTeam, tên theo người đầu tiên của đội).
 */
window.SFC = window.SFC || {};

(function () {
  const N = () => SFC_CONFIG.net;
  const Net = () => SFC.Net;
  const Sync = () => SFC.Sync;
  const ROLES = () => SFC_CONFIG.game.roles;
  const clampInt = (v, a, b) => Math.max(a, Math.min(b, Math.round(+v) || 0));
  // CLB của đội có người trong trận online (đăng ký vào teams.list lúc vào trận — Online.registerClubs)
  const CLUBS = ['online_p1', 'online_p2'];

  const Online = {
    role: null,          // 'host' | 'guest'
    status: 'idle',      // idle | busy | lobby | playing
    code: null,
    lobby: { members: [] },   // [{ id, pf, slot }] — host đứng đầu
    game: null,          // host: trận thật · khách: trận "gương"
    overlay: false,      // đang mở menu trong trận (không tạm dừng)

    get active() { return this.status !== 'idle'; },
    get isHost() { return this.role === 'host'; },

    /* ================= SLOT ================= */
    get nSlots() { return ROLES().length * 2; },
    slotTeam(s) { return Math.floor(s / ROLES().length); },
    slotRole(s) { return ROLES()[s % ROLES().length]; },
    slotOf(team, role) { return team * ROLES().length + Math.max(0, ROLES().indexOf(role)); },
    // slot -1 = GUEST: ghế chờ (không ra sân, nhiều người ngồi được) — để đổi chỗ khi phòng đủ người
    memberAt(s) { return s < 0 ? null : this.lobby.members.find((m) => m.slot === s) || null; },
    get benched() { return this.lobby.members.filter((m) => m.slot < 0); },
    get mine() { return this.lobby.members.find((m) => m.id === Net().id) || null; },
    // các đội có người: [đội 0, đội 1] -> danh sách thành viên
    byTeam() { return [0, 1].map((t) => this.lobby.members.filter((m) => this.slotTeam(m.slot) === t)); },
    // versus (2 đội đều có người) · coop (chỉ 1 đội có người, đội kia bot)
    get mode() { return this.byTeam().filter((l) => l.length).length > 1 ? 'versus' : 'coop'; },

    // slot trống theo thứ tự ưu tiên: (đội, vị trí) muốn -> vị trí khác cùng đội -> đội kia cùng vị trí -> còn lại
    freeSlot(team, role) {
      const other = ROLES().find((r) => r !== role) || role;
      const order = [this.slotOf(team, role), this.slotOf(team, other), this.slotOf(1 - team, role), this.slotOf(1 - team, other)];
      for (let s = 0; s < this.nSlots; s++) order.push(s);
      return order.find((s) => !this.memberAt(s)) ?? -1;
    },

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
    createRoom() {
      if (this.status === 'busy') return;
      this.status = 'busy';
      SFC.Menu.go('online', 'Creating room...');
      Net().on(this.handlers());
      Net().host().then((code) => {
        this.role = 'host';
        this.code = code;
        this.lobby = { members: [{ id: 'host', pf: this.myPf(), slot: this.slotOf(0, this.myRole()) }] };
        this.status = 'lobby';
        SFC.Menu.go('lobby');
      }).catch((e) => this.fail(e));
    },

    joinRoom(code) {
      if (this.status === 'busy') return;
      this.status = 'busy';
      SFC.Menu.setMsg('Connecting to room ' + code + '...');
      Net().on(this.handlers());
      Net().join(code).then(() => {
        this.role = 'guest';
        this.code = code;
        this.lobby = { members: [] };
        this.status = 'lobby';
        Net().send({ t: 'hello', v: N().protocol, pf: this.myPf() });
        SFC.Menu.go('lobby', 'Waiting for room info...');
      }).catch((e) => this.fail(e, 'join'));
    },

    fail(e, page = 'online') {
      Net().close();
      this.reset();
      SFC.Menu.app.toMenu(page);
      SFC.Menu.setMsg(Net().message(e), true);
    },

    // rời phòng chủ động
    leave() {
      Net().send({ t: 'bye' });
      setTimeout(() => Net().close(), 150);
      this.reset();
      SFC.Menu.app.toMenu('online');
    },

    reset() {
      this.role = null; this.status = 'idle'; this.code = null; this.game = null; this.overlay = false;
      this.lobby = { members: [] };
      this.buf = []; this.remotes = {}; this.seatIds = []; this.seatOf = {};
      this.myIntro = false; this.introWait = new Set(); this.introLeft = 0;
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
      if (!this.isHost) {
        const code = this.code;
        Net().close();
        this.reset();
        SFC.Menu.app.toMenu('online');
        SFC.Menu.setMsg(`Host ${code || ''} closed the room.`, true);
        return;
      }
      const L = this.lobby, m = L.members.find((x) => x.id === id);
      if (!m) return;   // khách chưa kịp hello (sai phiên bản / phòng đầy)
      L.members = L.members.filter((x) => x !== m);
      const name = (m.pf && m.pf.name) || 'A player';
      if (this.status === 'playing') {
        // còn khách khác: AI đá thay người vừa rời, trận tiếp tục. Không còn ai: về phòng chờ như trước
        if (L.members.length > 1) {
          const seat = this.seatOf[id];
          delete this.remotes[id];
          this.introWait.delete(id);
          if (this.game && seat != null) this.game.dropSeat(seat);
          Net().send({ t: 'drop', seat });
          SFC.UI.banner(`${name} LEFT`, 'AI takes over', '#9aa3b5', 1.6);
          return;
        }
        this.status = 'lobby'; this.game = null; this.overlay = false; this.introLeft = 0;
        SFC.Menu.app.toMenu('lobby');
      }
      this.sendLobby();
      SFC.Menu.go('lobby', `${name} left the room.`, true);
    },

    // CLB riêng của người chơi (mainPath.playerTeam): tên theo character, chỉ số đội trung tính
    // away = áo sân khách (versus: đội 1) · tag = dòng phụ
    club(name, away, tag) {
      const P = SFC_CONFIG.mainPath.playerTeam;
      name = name || 'PLAYER';
      return Object.assign({}, SFC_CONFIG.teams.list[P.id], {
        name: P.nameFormat.replace('{name}', name),
        short: name.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || 'YOU',
        tagline: tag || (away ? 'AWAY CLUB' : 'HOME CLUB'),   // host có thể đứng bất kỳ đội nào -> gọi theo sân
        kit: away ? P.awayKit : P.kit,
      });
    },
    // đăng ký CLB 2 đội trước khi dựng trận (host + khách đều gọi, cùng dữ liệu):
    // clubs[t] = { id } (đội bot = đội có sẵn) | { name, away } (CLB riêng của người đầu tiên trong đội)
    registerClubs(clubs) {
      const coop = clubs.some((c) => c.id);
      return clubs.map((c, t) => {
        if (c.id && !CLUBS.includes(c.id) && SFC_CONFIG.teams.list[c.id]) return c.id;
        SFC_CONFIG.teams.list[CLUBS[t]] = this.club(c.name, !!c.away, coop ? 'CO-OP SQUAD' : null);
        return CLUBS[t];
      });
    },

    // hồ sơ trận của người chơi tại máy này: vị trí đang chọn + đồng đội đang chọn (đá vị trí còn lại)
    myPf() {
      const idx = ROLES().indexOf(this.myRole());
      return SFC.Profile.matchPublic(ROLES()[idx], SFC.Menu.app.mateSpec(idx));
    },

    // đổi đồng đội trong phòng chờ -> báo máy kia
    updatePf() {
      const pf = this.myPf();
      if (this.isHost) { const m = this.mine; if (m) m.pf = pf; this.sendLobby(); }
      else Net().send({ t: 'pf', pf });
      SFC.Menu.render();
    },

    // nhảy vào slot s (bấm slot trống / GUEST / ←→ ở mục SLOT)
    requestSlot(s) {
      const me = this.mine;
      if (this.status !== 'lobby' || s < -1 || s >= this.nSlots || this.memberAt(s) || (me && me.slot === s)) return;
      if (this.isHost) this.moveMember('host', s);
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
    // host: đổi slot 1 người (slot phải trống; GUEST luôn được)
    moveMember(id, s) {
      const m = this.lobby.members.find((x) => x.id === id);
      if (!m || this.status !== 'lobby' || s < -1 || s >= this.nSlots || this.memberAt(s)) return;
      m.slot = s;
      if (id === 'host' && s >= 0) { this.syncRole(this.slotRole(s)); m.pf = this.myPf(); }
      this.sendLobby();
      SFC.Menu.render();
    },

    sendLobby() {
      if (!this.isHost) return;
      Net().send({ t: 'lobby', m: this.lobby.members.map(({ id, pf, slot }) => ({ id, pf, slot })) });
    },

    onData(m, id) {
      if (!m || !m.t) return;
      if (this.isHost) return this.hostData(m, id);
      return this.guestData(m);
    },

    hostData(m, id) {
      const L = this.lobby, who = L.members.find((x) => x.id === id);
      switch (m.t) {
        case 'hello': {
          if (m.v !== N().protocol) return this.refuse(id, 'version');
          if (this.status !== 'lobby') return this.refuse(id, 'started');
          const pf = SFC.Profile.sanitizePublic(m.pf) || SFC.Profile.sanitizePublic({});
          // khách mới: mặc định sang đội kia (versus) đúng vị trí họ chọn; hết chỗ thì slot trống bất kỳ
          const slot = this.freeSlot(1, pf.role || 'FWD');
          if (slot < 0) return this.refuse(id, 'full');
          if (!who) L.members.push({ id, pf, slot });
          const mine = this.mine;
          if (mine) mine.pf = this.myPf();
          this.sendLobby();
          SFC.Menu.go('lobby', `${pf.name} joined!`);
          SFC.Audio.pick();
          break;
        }
        case 'pf':
          if (this.status !== 'lobby' || !who) return;
          who.pf = SFC.Profile.sanitizePublic(m.pf) || who.pf;
          this.sendLobby();
          SFC.Menu.render();
          break;
        case 'slot':
          if (who) this.moveMember(id, m.s | 0);
          break;
        case 'intro':
          this.introWait.delete(id);
          break;
        case 'i': {
          const r = this.remotes[id];
          if (r) r.receive(m.d, m.p);
          break;
        }
        case 'pick':
          if (this.game && this.seatOf[id] != null) this.game.pickCore(m.i | 0, this.seatOf[id]);
          break;
        case 'reroll':
          if (this.game && this.seatOf[id] != null) this.game.rerollDraft(this.seatOf[id]);
          break;
        case 'bye':
          Net().drop(id);
          this.onPeerGone(id);
          break;
      }
    },

    refuse(id, type) {
      Net().send({ t: type }, id);
      setTimeout(() => Net().drop(id), 300);
    },

    guestData(m) {
      switch (m.t) {
        case 'lobby':
          this.lobby.members = this.sanitizeMembers(m.m);
          if (this.status === 'playing') {
            this.status = 'lobby'; this.game = null; SFC.Menu.app.toMenu('lobby');
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
        case 'start': this.guestStart(m); break;
        case 's': if (this.status === 'playing') this.buf.push(m); break;
        case 'drop':
          if (this.game) {
            const p = this.game.seatPlayer(m.seat | 0);
            this.game.dropSeat(m.seat | 0);
            SFC.UI.banner(`${p ? p.name : 'A PLAYER'} LEFT`, 'AI takes over', '#9aa3b5', 1.6);
          }
          break;
        case 'full': this.fail({ type: 'full' }, 'join'); break;
        case 'started': this.fail({ type: 'started' }, 'join'); break;
        case 'version': this.fail({ type: 'version' }, 'join'); break;
        case 'bye': Net().close(); this.onPeerGone('host'); break;
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
    // đủ người và không ai còn ngồi GUEST
    get canStart() { return this.isHost && this.lobby.members.length >= (N().minPlayers || 2) && !this.benched.length; },

    startMatch() {
      const L = this.lobby, roles = ROLES();
      if (!this.canStart) return;
      const mine = this.mine;
      if (mine) mine.pf = this.myPf();
      const ms = L.members.slice();
      // mỗi người = 1 slot trong trận (thứ tự = P1..P4): character + vị trí theo slot + bộ Core đã mở khoá
      const seats = ms.map((m) => {
        const pf = m.pf || SFC.Profile.sanitizePublic({}), role = this.slotRole(m.slot);
        return {
          team: this.slotTeam(m.slot), idx: roles.indexOf(role),
          avatar: Object.assign({}, pf, { role, mate: undefined, cores: undefined }),
          cores: pf.cores || null,
        };
      });
      const byTeam = this.byTeam();
      const botTeam = byTeam.findIndex((l) => !l.length);
      const bot = botTeam >= 0 ? this.pickBot() : null;
      // đội có đúng 1 người: đồng đội đang chọn của người đó đá vị trí còn lại (đội 2 người: không có AI)
      const mates = byTeam.map((l) => {
        if (l.length !== 1 || !l[0].pf || !l[0].pf.mate) return null;
        const role = this.slotRole(l[0].slot);
        return Object.assign({}, l[0].pf.mate, { role: roles.find((r) => r !== role) || null });
      });
      const clubs = byTeam.map((l, t) => (l.length ? { name: l[0].pf.name, away: botTeam < 0 && t === 1 } : { id: bot.id }));
      const opts = {
        online: true, difficulty: N().difficulty, mateDifficulty: SFC_CONFIG.mainPath.teammate,
        draftTimeLimit: N().draftTimeLimit, seats, mates, clubs,
        // co-op: độ khó + sân theo đội bot; versus: sân ngẫu nhiên trong các Area chủ phòng đã tới
        aiProfile: bot ? bot.aiProfile : undefined,
        arena: bot ? bot.arena : this.pickArena(),
      };
      const [home, away] = this.registerClubs(clubs);
      this.seatIds = ms.map((m) => m.id);
      this.seatOf = {};
      ms.forEach((m, i) => { this.seatOf[m.id] = i; });
      const me = this.seatOf.host;
      this.game = new SFC.Game(Object.assign({ home, away, me, humanTeam: seats[me].team }, opts));
      Sync().capture(this.game);
      this.remotes = {};
      for (const id of this.seatIds) if (id !== 'host') this.remotes[id] = new (Sync().RemoteInput)();
      this.frame = 0;
      this.status = 'playing';
      // màn giới thiệu 2 đội: trận đứng yên tới khi mọi máy xem xong (hoặc quá giờ chờ)
      this.holdIntro(SFC.Intro.wants(opts));
      for (const id of this.seatIds) if (id !== 'host') Net().send({ t: 'start', opts: Object.assign({}, opts, { me: this.seatOf[id] }) }, id);
      SFC.Menu.app.enterOnline(this.game);
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
      const [home, away] = this.registerClubs(clubs);
      // trận "gương": cùng đội hình / character / slot như host, nhưng góc nhìn slot của máy này
      this.game = new SFC.Game({
        home, away, online: true, me, humanTeam: seats[me].team, seats,
        difficulty: N().difficulty, aiProfile: this.sanitizeAi(o.aiProfile),
        mateDifficulty: SFC_CONFIG.game.ai.difficulty[o.mateDifficulty] ? o.mateDifficulty : undefined,
        draftTimeLimit: +o.draftTimeLimit || 0,
        mates: (Array.isArray(o.mates) ? o.mates.slice(0, 2) : []).map((x) => SFC.Profile.sanitizeMate(x)),
        arena: SFC_CONFIG.arenas[o.arena] ? o.arena : undefined,
      });
      this.game.events.length = 0;
      this.buf = [];
      this.renderF = null;
      this.lastTick = null;
      this.pressedMask = 0;
      this.sentDown = -1;
      this.status = 'playing';
      SFC.Menu.app.enterOnline(this.game);
    },

    // độ khó AI đội bot (MainPath.aiProfile): chỉ giữ số hợp lệ
    sanitizeAi(a) {
      if (!a || typeof a !== 'object') return undefined;
      const out = {};
      for (const k in a) if (typeof a[k] === 'number' && isFinite(a[k])) out[k] = a[k];
      return Object.keys(out).length ? out : undefined;
    },

    // Area cao nhất chủ phòng đã tới (Area chưa mở không lộ ra)
    bestArea() {
      const MP = SFC.MainPath;
      return Math.min(MP.areas().length - 1, Math.floor(MP.state.best / MP.nDiv()));
    },

    // sân versus: ngẫu nhiên trong các sân Area chủ phòng đã tới
    pickArena() {
      const list = SFC.MainPath.areas().slice(0, this.bestArea() + 1).map((a) => a.arena).filter((id) => SFC_CONFIG.arenas[id]);
      return list.length ? SFC.U.pick(list) : undefined;
    },

    // đội bot co-op (net.bots): 1 đội thường ngẫu nhiên của 1 Area đã tới, độ khó 1 hạng ngẫu nhiên trong khoảng divs, sân của Area đó
    pickBot() {
      const MP = SFC.MainPath, a = Math.floor(Math.random() * (this.bestArea() + 1)), A = MP.area(a);
      const n = MP.nDiv(), [lo, hi] = (N().bots && N().bots.divs) || [0, n - 1];
      const d0 = clampInt(lo, 0, n - 1), d1 = clampInt(hi, d0, n - 1);
      const div = d0 + Math.floor(Math.random() * (d1 - d0 + 1));
      return { id: SFC.U.pick(A.teams), aiProfile: MP.aiProfile(a, div, false), arena: SFC_CONFIG.arenas[A.arena] ? A.arena : undefined };
    },

    /* ---------- màn giới thiệu 2 đội (config/intro.config.js, mode 'online') ---------- */
    // host: giữ trận tới khi mọi máy xem xong; quá duration + outro + onlineWait giây thì chạy luôn
    holdIntro(on) {
      const I = SFC_CONFIG.intro;
      this.myIntro = on;
      this.introWait = new Set(on ? this.seatIds.filter((id) => id !== 'host') : []);
      this.introLeft = on ? I.duration + I.outro + (I.onlineWait || 4) : 0;
    },
    get introHold() { return this.isHost && (this.myIntro || this.introWait.size > 0) && this.introLeft > 0; },

    // máy này xem xong màn giới thiệu (main.js beginMatch)
    introDone() {
      if (!this.isHost) { Net().send({ t: 'intro' }); return; }
      this.myIntro = false;
      if (this.introHold) SFC.UI.banner('GET READY', 'Waiting for other players...', '#9aa3b5', 1.4);
    },

    backToLobby() {
      if (!this.isHost) return;
      this.status = 'lobby';
      this.game = null;
      this.overlay = false;
      const mine = this.mine;
      if (mine) mine.pf = this.myPf();
      this.sendLobby();
      SFC.Menu.app.toMenu('lobby');
    },

    /* ================= VÒNG LẶP (60 bước/giây) ================= */
    tick(dt, input) {
      const g = this.game;
      if (!g) return;
      // màn giới thiệu đang chiếu / host đang chờ máy khác xem xong: trận đứng yên (không mô phỏng, không gửi snapshot)
      if (this.isHost && this.introLeft > 0) this.introLeft -= dt;
      if (SFC.Menu.app.screen === 'intro') { SFC.Intro.update(dt, input); return; }
      if (this.introHold) return;
      if (input.wasPressed('pause') && g.state !== 'ended') {
        this.overlay ? SFC.Menu.app.resume() : SFC.Menu.app.pause();
        return;
      }
      // xét trước khi menu xử lý phím: nút đóng menu (B) không lọt vào trận thành chuyền bổng / đá bay
      const play = this.overlay || g.state === 'draft' || g.state === 'ended' ? Sync().NULL_INPUT : input;
      if (this.overlay) SFC.UI.pauseInput(input);
      else if (g.state === 'draft') SFC.UI.draftInput(input, g);
      else if (g.state === 'ended') SFC.UI.endInput(input);
      if (this.isHost) this.hostTick(dt, g, play);
      else this.guestTick(play);
    },

    hostTick(dt, g, local) {
      const remotes = Object.values(this.remotes);
      for (const r of remotes) r.beginFrame();
      // phím theo slot: slot host = bàn phím máy này, slot khách = phím nhận qua mạng
      const inputs = this.seatIds.map((id) => (id === 'host' ? local : this.remotes[id] || Sync().NULL_INPUT));
      if (g.state !== 'ended') g.update(dt, inputs);
      for (const r of remotes) r.endFrame();
      Sync().collectEvents(g);
      SFC.UI.consume(g);
      if (++this.frame % N().snapshotEvery === 0 || g.netOut.ev.length) {
        const pack = Sync().drain(g);
        Net().send({ t: 's', f: this.frame, s: Sync().snapshot(g), fx: pack.fx, sfx: pack.sfx, ev: pack.ev });
      }
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
      const target = newest - N().interpDelay * 60;
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
