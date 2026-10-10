/* Room — phòng online phía chạy trận (không đụng UI): phòng chờ, slot, vào trận, vòng lặp mô phỏng + gửi snapshot.
 * Dùng chung cho 2 mô hình (cùng 1 bản luật, không lệch nhau):
 *  - Người chơi làm host (src/net/session.js): có ghế local { id: 'host', pf() } = người chơi tại máy này
 *  - Máy chủ riêng (server/index.js, Node): không có ghế local, mọi người đều là khách
 * Gói tin: xem session.js. Thêm so với khách -> host: begin{area} (chủ phòng bấm START) · toLobby (chủ phòng về phòng chờ).
 * Chủ phòng (lobby.owner) = người được START / về phòng chờ: host (người chơi làm host) / người tạo phòng (máy chủ riêng);
 * chủ phòng rời đi -> người có mặt vào sớm nhất còn lại.
 * Kết nối lại (net.reconnectGrace giây, 0 = tắt): vào phòng được cấp mã bí mật you{tok}. Mất kết nối giữa trận -> "vắng mặt"
 * (AI đá thay, gửi drop{seat,o,away}); hello{tok} trong hạn -> lấy lại slot, nhận start{opts.resume, opts.lobby}, mọi người nhận back{seat,o}.
 * Quá hạn -> rời hẳn như cũ. Máy chạy Room gọi expire(Date.now()) định kỳ.
 *
 * new SFC.Room({ send(msg, id?), drop(id), local?, snapshotEvery, hooks? })
 *  - send: bỏ id = gửi mọi khách (bên gửi tự JSON 1 lần rồi phát cho từng người)
 *  - hooks (đều tuỳ chọn): changed() · joined(name) · left(name) · dropped(name, away) · back(name) · toLobby() · start(game) ·
 *    events(g) · localRole(role)
 */
window.SFC = window.SFC || {};

(function () {
  const N = () => SFC_CONFIG.net;
  const Sync = () => SFC.Sync;
  const ROLES = () => SFC_CONFIG.game.roles;
  const clampInt = (v, a, b) => Math.max(a, Math.min(b, Math.round(+v) || 0));
  // CLB của đội có người trong trận online (đăng ký vào teams.list lúc vào trận — Room.registerClubs)
  const CLUBS = ['online_p1', 'online_p2'];
  // mã bí mật để kết nối lại (crypto có ở trình duyệt + Node 19+)
  const token = () => {
    const c = globalThis.crypto;
    if (c && c.getRandomValues) return Array.from(c.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join('');
    return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  };
  const GRACE = () => Math.max(0, +N().reconnectGrace || 0);

  /* ---------- luật slot (dùng chung với session.js để vẽ phòng chờ) ---------- */
  const Slots = {
    n() { return ROLES().length * 2; },
    team(s) { return Math.floor(s / ROLES().length); },
    role(s) { return ROLES()[s % ROLES().length]; },
    of(team, role) { return team * ROLES().length + Math.max(0, ROLES().indexOf(role)); },
    // slot -1 = GUEST: ghế chờ (không ra sân, nhiều người ngồi được) — để đổi chỗ khi phòng đủ người
    memberAt(L, s) { return s < 0 ? null : L.members.find((m) => m.slot === s) || null; },
    benched(L) { return L.members.filter((m) => m.slot < 0); },
    // các đội có người: [đội 0, đội 1] -> danh sách thành viên
    byTeam(L) { return [0, 1].map((t) => L.members.filter((m) => Slots.team(m.slot) === t)); },
    // versus (2 đội đều có người) · coop (chỉ 1 đội có người, đội kia bot)
    mode(L) { return Slots.byTeam(L).filter((l) => l.length).length > 1 ? 'versus' : 'coop'; },
    // đủ người và không ai còn ngồi GUEST
    ready(L) { return L.members.length >= (N().minPlayers || 2) && !Slots.benched(L).length; },
    // slot trống theo thứ tự ưu tiên: (đội, vị trí) muốn -> vị trí khác cùng đội -> đội kia cùng vị trí -> còn lại
    free(L, team, role) {
      const other = ROLES().find((r) => r !== role) || role;
      const order = [Slots.of(team, role), Slots.of(team, other), Slots.of(1 - team, role), Slots.of(1 - team, other)];
      for (let s = 0; s < Slots.n(); s++) order.push(s);
      return order.find((s) => !Slots.memberAt(L, s)) ?? -1;
    },
  };

  class Room {
    constructor(o) {
      this.send = o.send;
      this.drop = o.drop;
      this.local = o.local || null;          // { id, pf() } — người chơi làm host
      this.snapshotEvery = o.snapshotEvery || 1;
      this.hooks = o.hooks || {};
      this.lobby = { members: [], owner: null };   // [{ id, pf, slot }] · owner = id chủ phòng
      this.status = 'lobby';                 // lobby | playing
      this.game = null;
      this.remotes = {};
      this.seatIds = [];
      this.seatOf = {};
      this.frame = 0;
      this.endSent = false;
      this.introWait = new Set();
      this.introLeft = 0;
      this.myIntro = false;
      if (this.local) {
        this.lobby.members.push({ id: this.local.id, pf: this.local.pf(), slot: Slots.of(0, this.local.pf().role || 'FWD') });
        this.lobby.owner = this.local.id;
      }
    }

    hook(name, ...a) { const h = this.hooks[name]; if (h) return h(...a); }
    member(id) { return this.lobby.members.find((x) => x.id === id) || null; }
    // còn người vắng mặt chờ kết nối lại (máy chủ: chưa xoá phòng dù không còn kết nối nào)
    get hasAway() { return this.lobby.members.some((m) => m.away); }
    // trận đang chạy cần mô phỏng (hết trận đã gửi snapshot cuối -> đứng yên tới khi về phòng chờ)
    get active() { return this.status === 'playing' && !!this.game && !this.endSent; }

    // hồ sơ trận mới nhất của người chơi làm host
    refreshLocal() {
      const m = this.local && this.member(this.local.id);
      if (m) m.pf = this.local.pf();
    }

    sendLobby() {
      const L = this.lobby;
      this.send({ t: 'lobby', m: this.publicMembers(), o: L.owner });
    }
    // danh sách gửi đi: không kèm mã bí mật
    publicMembers() { return this.lobby.members.map(({ id, pf, slot }) => ({ id, pf, slot })); }
    // chủ phòng mới: người có mặt vào sớm nhất
    passOwner() {
      const next = this.lobby.members.find((x) => !x.away);
      this.lobby.owner = next ? next.id : null;
    }

    // đổi slot 1 người (slot phải trống; GUEST luôn được)
    moveMember(id, s) {
      const m = this.member(id);
      if (!m || this.status !== 'lobby' || s < -1 || s >= Slots.n() || Slots.memberAt(this.lobby, s)) return;
      m.slot = s;
      if (this.local && id === this.local.id && s >= 0) { this.hook('localRole', Slots.role(s)); m.pf = this.local.pf(); }
      this.sendLobby();
      this.hook('changed');
    }

    refuse(id, type) {
      this.send({ t: type }, id);
      setTimeout(() => this.drop(id), 300);
    }

    onData(m, id) {
      if (!m || !m.t) return;
      const L = this.lobby, who = this.member(id);
      switch (m.t) {
        case 'hello': {
          if (m.v !== N().protocol) return this.refuse(id, 'version');
          // kết nối lại giữa trận bằng mã bí mật
          const back = typeof m.tok === 'string' && this.status === 'playing' && L.members.find((x) => x.away && x.tok === m.tok);
          if (back) return this.rejoin(back, id);
          if (this.status !== 'lobby') return this.refuse(id, m.tok ? 'expired' : 'started');
          const pf = SFC.Profile.sanitizePublic(m.pf) || SFC.Profile.sanitizePublic({});
          // người vào sau: mặc định sang đội kia (versus) đúng vị trí họ chọn; hết chỗ thì slot trống bất kỳ
          const slot = Slots.free(L, L.members.length ? 1 : 0, pf.role || 'FWD');
          if (slot < 0) return this.refuse(id, 'full');
          if (!who) {
            const tok = token();
            L.members.push({ id, pf, slot, tok, away: 0 });
            if (!this.isLocal(id)) this.send({ t: 'you', tok }, id);
          }
          if (!L.owner) L.owner = id;
          this.refreshLocal();
          this.sendLobby();
          this.hook('joined', pf.name);
          break;
        }
        case 'pf':
          if (this.status !== 'lobby' || !who) return;
          who.pf = SFC.Profile.sanitizePublic(m.pf) || who.pf;
          this.sendLobby();
          this.hook('changed');
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
        // chủ phòng không phải máy chạy trận (máy chủ riêng): xin START / về phòng chờ
        case 'begin':
          if (id === L.owner && this.status === 'lobby') this.startMatch(m.area);
          break;
        case 'toLobby':
          if (id === L.owner && this.status === 'playing') this.backToLobby();
          break;
        case 'bye':
          this.drop(id);
          this.gone(id, true);
          break;
      }
    }

    // 1 người mất kết nối. bye = tự rời phòng (không chờ kết nối lại)
    gone(id, bye = false) {
      const L = this.lobby, m = this.member(id);
      if (!m || m.away) return;   // chưa kịp hello (sai phiên bản / phòng đầy) / đang vắng mặt
      // giữa trận: vắng mặt, AI đá thay, chờ kết nối lại trong net.reconnectGrace giây
      if (this.status === 'playing' && !bye && GRACE() > 0) {
        m.away = Date.now() + GRACE() * 1000;
        const seat = this.seatOf[id];
        delete this.remotes[id];
        this.introWait.delete(id);
        if (L.owner === id) this.passOwner();
        if (this.game && seat != null) this.game.dropSeat(seat);
        this.send({ t: 'drop', seat, o: L.owner, away: GRACE() });
        this.hook('dropped', (m.pf && m.pf.name) || 'A player', true);
        return;
      }
      this.remove(m);
    }

    // người vắng mặt quá hạn kết nối lại -> rời hẳn. now = Date.now()
    expire(now) {
      for (const m of this.lobby.members.slice()) if (m.away && now > m.away) this.remove(m);
    }

    // xoá hẳn 1 người khỏi phòng (rời / vắng mặt quá hạn)
    remove(m) {
      const L = this.lobby, id = m.id, wasAway = !!m.away;
      L.members = L.members.filter((x) => x !== m);
      if (L.owner === id || !L.owner) this.passOwner();
      const name = (m.pf && m.pf.name) || 'A player';
      if (this.status === 'playing') {
        // vắng mặt quá hạn: slot đã giao AI từ lúc mất kết nối -> còn ít nhất 2 người thì đá tiếp, không báo lại
        if (wasAway && L.members.length > 1) return;
        // còn ít nhất 2 người: AI đá thay người vừa rời, trận tiếp tục. Không thì về phòng chờ
        if (!wasAway && L.members.length > 1) {
          const seat = this.seatOf[id];
          delete this.remotes[id];
          this.introWait.delete(id);
          if (this.game && seat != null) this.game.dropSeat(seat);
          // o = chủ phòng (có thể vừa đổi nếu chủ phòng rời — máy chủ riêng). Không gửi lobby giữa trận: khách sẽ về phòng chờ
          this.send({ t: 'drop', seat, o: L.owner });
          this.hook('dropped', name);
          return;
        }
        this.toLobbyState();
      }
      this.sendLobby();
      this.hook('left', name);
    }

    /* ================= VÀO TRẬN ================= */
    // area = Area cao nhất chủ phòng đã tới (chọn đội bot / sân), kẹp trong số Area có thật
    startMatch(area) {
      const L = this.lobby, roles = ROLES();
      if (this.status !== 'lobby' || !Slots.ready(L)) return;
      area = clampInt(area, 0, SFC.MainPath.areas().length - 1);
      this.refreshLocal();
      const ms = L.members.slice();
      // mỗi người = 1 slot trong trận (thứ tự = P1..P4): character + vị trí theo slot + bộ Core đã mở khoá
      const seats = ms.map((m) => {
        const pf = m.pf || SFC.Profile.sanitizePublic({}), role = Slots.role(m.slot);
        return {
          team: Slots.team(m.slot), idx: roles.indexOf(role),
          avatar: Object.assign({}, pf, { role, mate: undefined, cores: undefined }),
          cores: pf.cores || null,
        };
      });
      const byTeam = Slots.byTeam(L);
      const botTeam = byTeam.findIndex((l) => !l.length);
      const bot = botTeam >= 0 ? Room.pickBot(area) : null;
      // đội có đúng 1 người: đồng đội đang chọn của người đó đá vị trí còn lại (đội 2 người: không có AI)
      const mates = byTeam.map((l) => {
        if (l.length !== 1 || !l[0].pf || !l[0].pf.mate) return null;
        const role = Slots.role(l[0].slot);
        return Object.assign({}, l[0].pf.mate, { role: roles.find((r) => r !== role) || null });
      });
      const clubs = byTeam.map((l, t) => (l.length ? { name: l[0].pf.name, away: botTeam < 0 && t === 1 } : { id: bot.id }));
      const opts = {
        online: true, difficulty: N().difficulty, mateDifficulty: SFC_CONFIG.mainPath.teammate,
        draftTimeLimit: N().draftTimeLimit, seats, mates, clubs,
        // co-op: độ khó + sân theo đội bot; versus: sân ngẫu nhiên trong các Area chủ phòng đã tới
        aiProfile: bot ? bot.aiProfile : undefined,
        arena: bot ? bot.arena : Room.pickArena(area),
      };
      const [home, away] = Room.registerClubs(clubs);
      this.startOpts = opts;   // người kết nối lại giữa trận dựng lại trận "gương" từ đây
      this.seatIds = ms.map((m) => m.id);
      this.seatOf = {};
      ms.forEach((m, i) => { this.seatOf[m.id] = i; });
      // máy chủ riêng không có góc nhìn: me = -1 (không slot nào là "tại máy này")
      const me = this.local ? this.seatOf[this.local.id] : -1;
      this.game = new SFC.Game(Object.assign({ home, away, me, humanTeam: me >= 0 ? seats[me].team : -1 }, opts));
      Sync().capture(this.game);
      this.remotes = {};
      for (const id of this.seatIds) if (!this.isLocal(id)) this.remotes[id] = new (Sync().RemoteInput)();
      this.frame = 0;
      this.endSent = false;
      this.status = 'playing';
      // màn giới thiệu 2 đội: trận đứng yên tới khi mọi máy xem xong (hoặc quá giờ chờ)
      this.holdIntro(Room.wantsIntro(opts));
      for (const id of this.seatIds) if (!this.isLocal(id)) this.send({ t: 'start', opts: Object.assign({}, opts, { me: this.seatOf[id] }) }, id);
      this.hook('start', this.game);
    }

    isLocal(id) { return !!this.local && id === this.local.id; }

    // người vắng mặt kết nối lại (id = kết nối mới): lấy lại slot, nhận trận đang đá (không màn giới thiệu)
    rejoin(m, id) {
      const old = m.id, seat = this.seatOf[old];
      m.id = id;
      m.away = 0;
      if (seat != null) {
        delete this.seatOf[old];
        this.seatOf[id] = seat;
        this.seatIds[seat] = id;
        this.remotes[id] = new (Sync().RemoteInput)();
        this.game.resumeSeat(seat);
      }
      const opts = Object.assign({}, this.startOpts, { me: seat, resume: 1, lobby: { m: this.publicMembers(), o: this.lobby.owner } });
      this.send({ t: 'start', opts }, id);
      this.send({ t: 'back', seat, o: this.lobby.owner });
      this.hook('back', (m.pf && m.pf.name) || 'A player');
    }

    backToLobby() {
      if (this.status !== 'playing') return;
      // người vắng mặt lỡ trận -> rời phòng (vào lại bằng mã phòng như người mới)
      this.lobby.members = this.lobby.members.filter((m) => !m.away);
      if (!this.member(this.lobby.owner)) this.passOwner();
      this.toLobbyState();
      this.refreshLocal();
      this.sendLobby();
    }

    toLobbyState() {
      this.status = 'lobby';
      this.game = null;
      this.introLeft = 0;
      this.hook('toLobby');
    }

    /* ---------- màn giới thiệu 2 đội (config/intro.config.js, mode 'online') ---------- */
    // giữ trận tới khi mọi máy xem xong; quá duration + outro + onlineWait giây thì chạy luôn
    holdIntro(on) {
      const I = SFC_CONFIG.intro;
      this.myIntro = on && !!this.local;
      this.introWait = new Set(on ? this.seatIds.filter((id) => !this.isLocal(id)) : []);
      this.introLeft = on ? I.duration + I.outro + (I.onlineWait || 4) : 0;
    }
    get introHold() { return (this.myIntro || this.introWait.size > 0) && this.introLeft > 0; }
    introClock(dt) { if (this.introLeft > 0) this.introLeft -= dt; }
    // người chơi làm host xem xong màn giới thiệu
    localIntroDone() { this.myIntro = false; }

    /* ================= VÒNG LẶP (60 bước/giây) ================= */
    // local = phím người chơi làm host (máy chủ riêng: null)
    step(dt, local) {
      const g = this.game;
      if (!this.active) return;
      const remotes = Object.values(this.remotes);
      for (const r of remotes) r.beginFrame();
      // phím theo slot: slot local = bàn phím máy này, slot khách = phím nhận qua mạng
      const inputs = this.seatIds.map((id) => (this.isLocal(id) ? local || Sync().NULL_INPUT : this.remotes[id] || Sync().NULL_INPUT));
      if (g.state !== 'ended') g.update(dt, inputs);
      for (const r of remotes) r.endFrame();
      Sync().collectEvents(g);
      // không có UI tiêu thụ sự kiện (máy chủ riêng) -> bỏ, đã gom vào gói gửi đi
      if (this.hooks.events) this.hooks.events(g);
      else g.events.length = 0;
      const ended = g.state === 'ended';
      if (++this.frame % this.snapshotEvery === 0 || g.netOut.ev.length || ended) {
        const pack = Sync().drain(g);
        this.send({ t: 's', f: this.frame, s: Sync().snapshot(g), fx: pack.fx, sfx: pack.sfx, ev: pack.ev });
        // hết trận: snapshot cuối đã gửi -> ngừng mô phỏng + gửi tới khi về phòng chờ
        if (ended) this.endSent = true;
      }
    }

    /* ---------- tiện ích dùng chung (host, khách, máy chủ riêng) ---------- */
    // giống SFC.Intro.wants (ui/intro.js gọi hàm này) — Room chạy được cả khi không có UI
    static wantsIntro(opts) {
      const I = SFC_CONFIG.intro;
      if (!I || !I.enabled || opts.resume) return false;   // kết nối lại giữa trận: không chiếu lại
      const mode = opts.online ? 'online' : opts.mainPath ? 'mainPath' : opts.training ? 'training' : 'single';
      return I.modes.includes(mode);
    }

    // CLB riêng của người chơi (mainPath.playerTeam): tên theo character, chỉ số đội trung tính
    // away = áo sân khách (versus: đội 1) · tag = dòng phụ
    static club(name, away, tag) {
      const P = SFC_CONFIG.mainPath.playerTeam;
      name = name || 'PLAYER';
      return Object.assign({}, SFC_CONFIG.teams.list[P.id], {
        name: P.nameFormat.replace('{name}', name),
        short: name.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || 'YOU',
        tagline: tag || (away ? 'AWAY CLUB' : 'HOME CLUB'),   // host có thể đứng bất kỳ đội nào -> gọi theo sân
        kit: away ? P.awayKit : P.kit,
      });
    }

    // đăng ký CLB 2 đội trước khi dựng trận (host + khách đều gọi, cùng dữ liệu):
    // clubs[t] = { id } (đội bot = đội có sẵn) | { name, away } (CLB riêng của người đầu tiên trong đội)
    // (máy chủ riêng nhiều phòng dùng chung teams.list: Game giữ object CLB lúc khởi tạo nên phòng sau ghi đè không ảnh hưởng)
    static registerClubs(clubs) {
      const coop = clubs.some((c) => c.id);
      return clubs.map((c, t) => {
        if (c.id && !CLUBS.includes(c.id) && SFC_CONFIG.teams.list[c.id]) return c.id;
        SFC_CONFIG.teams.list[CLUBS[t]] = Room.club(c.name, !!c.away, coop ? 'CO-OP SQUAD' : null);
        return CLUBS[t];
      });
    }

    // sân versus: ngẫu nhiên trong các sân của Area 0..area
    static pickArena(area) {
      const list = SFC.MainPath.areas().slice(0, area + 1).map((a) => a.arena).filter((id) => SFC_CONFIG.arenas[id]);
      return list.length ? SFC.U.pick(list) : undefined;
    }

    // đội bot co-op (net.bots): 1 đội thường ngẫu nhiên của 1 Area trong 0..area, độ khó ở 1 mức Elo ngẫu nhiên trong khoảng span
    // (phần khoảng Elo của Area, 0 = đầu Area, 1 = cuối Area), sân của Area đó
    static pickBot(area) {
      const MP = SFC.MainPath, a = Math.floor(Math.random() * (area + 1)), A = MP.area(a);
      const [lo, hi] = (N().bots && N().bots.span) || [0, 1];
      const elo = Math.round(A.elo + (lo + Math.random() * (hi - lo)) * MP.span(a));
      return { id: SFC.U.pick(A.teams), aiProfile: MP.aiProfile(elo), arena: SFC_CONFIG.arenas[A.arena] ? A.arena : undefined };
    }
  }

  Room.Slots = Slots;
  SFC.Room = Room;
})();
