/* Room — phòng online phía chạy trận (không đụng UI): phòng chờ, slot, vào trận, vòng lặp mô phỏng + gửi snapshot.
 * Dùng chung cho 2 mô hình (cùng 1 bản luật, không lệch nhau):
 *  - Người chơi làm host (src/net/session.js): có ghế local { id: 'host', pf() } = người chơi tại máy này
 *  - Máy chủ riêng (server/index.js, Node): không có ghế local, mọi người đều là khách
 * Gói tin: xem session.js. Thêm so với khách -> host: begin{area} (chủ phòng bấm START) · toLobby (chủ phòng về phòng chờ) ·
 * ground{a} (chủ phòng chọn sân: chỉ số Area, -1 = ngẫu nhiên).
 * Chủ phòng (lobby.owner) = người được START / về phòng chờ: host (người chơi làm host) / người tạo phòng (máy chủ riêng);
 * chủ phòng rời đi -> người có mặt vào sớm nhất còn lại.
 * Kết nối lại (net.reconnectGrace giây, 0 = tắt): vào phòng được cấp mã bí mật you{tok}. Mất kết nối giữa trận -> "vắng mặt"
 * (AI đá thay, gửi drop{seat,o,away}); hello{tok} trong hạn -> lấy lại slot, nhận start{opts.resume, opts.lobby}, mọi người nhận back{seat,o}.
 * Quá hạn -> rời hẳn như cũ. Máy chạy Room gọi expire(Date.now()) định kỳ.
 *
 * Ping cả trận (màn kết quả): mỗi khách gửi mp{ms} (ping trung vị từ đầu trận) mỗi net.pingShare giây + lúc hết trận; Room phát
 * pg{p:{id cầu thủ: ms}} cùng nhịp đó, lúc hết trận và mỗi lần nhận mp sau khi hết trận. Người chơi làm host: ping của mình qua hook myPing().
 * Trận xếp hạng: người chơi giả cũng có ping (theo ping người thật trong trận, lệch ngẫu nhiên cố định) -> không phân biệt được người thật.
 * Người rời / mất kết nối giữ ping cuối. Máy chủ cũ không biết mp (bỏ qua), khách cũ không biết pg (bỏ qua): không cần tăng protocol.
 *
 * Trận xếp hạng (máy chủ riêng, ranked = Matchmaker.lineup): không phòng chờ, không chủ phòng. Ai trong đội hình hello thì vào
 * đúng ghế đã xếp; đủ người (hoặc quá net.queue.joinWait giây) là vào trận, ghế còn trống = người chơi giả. Người rời giữa trận:
 * AI đá thay, trận đá tới hết dù còn bao nhiêu người. start{opts} kèm ranked + mainPath{myElo, oppElo} của đội người nhận.
 *
 * Phòng FOOTBALL STORY (story = id Story — docs/FOOTBALL_STORY.md "Co-op online"): mọi người cùng đội 0
 * (tối đa số vị trí), ghế trống = đồng đội AI. Trạng thái cup (lượt chơi của host, src/meta/cup.js) đi trong gói lobby: c (hook cupState),
 * k = id Story. Giữa 2 trận phòng ở 'lobby' (người mới vào được, nhận ghế còn trống). Host dựng trận bằng startStory(o).
 * Cut scene trước trận chiếu cùng lúc: cueScenes(kind) gửi cs{k} -> khách chiếu xong gửi csd; host chờ (scenesPending) rồi mới vào trận.
 *
 * Phòng GOAT PATH co-op (run = true — docs/RUN_DESIGN.md "Co-op"): luật ghế như phòng Story (coop). Run nằm ở
 * máy host (src/meta/run.js); gói lobby thêm rn = 1 + r (hook runState: bản sao run cho khách). Khách gửi ra{a,...} (bỏ phiếu, chọn BADGE,
 * mua đồ...) -> hook runAction(id, m) (host áp vào run rồi gửi lobby mới). Cut scene: cueScenes('run:<act>:<intro|boss|after>').
 * Skill game chỉ 1 người đá: startStory(o) với o.only = [id] -> những người còn lại nhận start{opts.watch} (me = -1, chỉ xem).
 *
 * Phòng co-op trên máy chủ riêng (2026-10-31, máy chủ ping đủ thấp: net.server.coopMaxPing): cup / run vẫn nằm ở máy NGƯỜI TẠO PHÒNG
 * (chủ phòng, không đổi suốt phòng — "máy giữ" = lead). Máy giữ là khách của Room nên gửi lên những gì host tự làm tại chỗ:
 * co{c} (trạng thái cup / bản sao run mới: Room giữ coopState, gửi trong lobby; giữa trận chỉ giữ, về phòng chờ mới gửi) ·
 * cue{k} (chiếu cut scene; mọi người khác xem xong / hết giờ -> máy chủ báo máy giữ csr) · story{o} (dựng trận: cleanCoop lọc lại,
 * luật trận / câu nói / chiêu của đối thủ lấy từ config) · seat{r} (vị trí của máy giữ = vị trí character trong run).
 * Khách gửi ra{...} -> chuyển tiếp cho máy giữ ra{a,k,v,i,f: id, u: mã hồ sơ}. Máy giữ rời phòng (hoặc vắng quá hạn) = đóng phòng
 * (hook close), như host rời phòng người chơi làm host.
 *
 * new SFC.Room({ send(msg, id?), drop(id), local?, snapshotEvery, ranked?, story?, run?, hooks? })
 *  - send: bỏ id = gửi mọi khách (bên gửi tự JSON 1 lần rồi phát cho từng người)
 *  - hooks (đều tuỳ chọn): changed() · joined(name) · left(name) · dropped(name, away) · back(name) · toLobby() · start(game) ·
 *    events(g) · localRole(role) · pong(id, c) · pings(bảng) · myPing() -> ms | null · cupState() -> trạng thái cup (phòng Story) ·
 *    runState() -> bản sao run (phòng run) · runAction(id, m) (phòng run, khách thao tác)
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
  const avg = (list) => list.reduce((s, x) => s + x, 0) / Math.max(1, list.length);

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
    // phòng Story: chỉ đội 0, vị trí muốn trước rồi vị trí còn trống khác (hết chỗ: -1)
    coopFree(L, role) {
      const order = [Slots.of(0, role)].concat(ROLES().map((r) => Slots.of(0, r)));
      return order.find((s) => !Slots.memberAt(L, s)) ?? -1;
    },
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
      this.ranked = o.ranked || null;        // trận xếp hạng: đội hình đã ghép (Matchmaker.lineup)
      this.story = o.story || null;          // phòng FOOTBALL STORY: id Story (co-op)
      this.run = !!o.run;                    // phòng GOAT PATH co-op
      this.coopState = null;                 // phòng co-op trên máy chủ riêng: trạng thái cup / bản sao run máy giữ gửi lên (co)
      this.watchIds = [];                    // đang trong trận: người trong phòng không có ghế (chỉ xem — Skill game 1 người)
      this.csWait = new Set();               // phòng Story: khách chưa chiếu xong cut scene trước trận
      this.csUntil = 0;
      this.createdAt = Date.now();
      this.lobby = { members: [], owner: null, ground: -1 };   // [{ id, pf, slot }] · owner = id chủ phòng · ground = sân (Area, -1 = ngẫu nhiên)
      this.status = 'lobby';                 // lobby | playing
      this.game = null;
      this.remotes = {};
      this.seatIds = [];
      this.seatOf = {};
      this.frame = 0;
      this.endSent = false;
      this.pings = {};                       // slot -> ping trung vị khách báo (mp)
      this.botLag = {};                      // trận xếp hạng: id cầu thủ giả -> hệ số ping so với người thật
      this.introWait = new Set();
      this.introLeft = 0;
      this.myIntro = false;
      if (this.local) {
        this.lobby.members.push({ id: this.local.id, pf: this.local.pf(), slot: Slots.of(0, this.local.pf().role || 'FWD') });
        this.lobby.owner = this.local.id;
      }
    }

    hook(name, ...a) { const h = this.hooks[name]; if (h) return h(...a); }
    // phòng co-op 1 đội (Story / GOAT PATH): cả phòng đội 0, ghế trống = AI, vào được giữa 2 trận
    get coop() { return !!this.story || this.run; }
    // máy giữ cup / run của phòng co-op: người chơi làm host, hoặc chủ phòng (người tạo) ở phòng máy chủ riêng
    isLead(id) { return this.local ? id === this.local.id : this.coop && id === this.lobby.owner; }
    // phòng co-op trên máy chủ riêng (máy giữ là khách)
    get remoteLead() { return this.coop && !this.local; }
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
      if (this.ranked) return;   // trận xếp hạng không có phòng chờ
      const msg = { t: 'lobby', m: this.publicMembers(), o: L.owner, g: L.ground };
      const st = () => (this.local ? this.hook(this.story ? 'cupState' : 'runState') || null : this.coopState);
      if (this.story) { msg.k = this.story; msg.c = st(); }
      if (this.run) { msg.rn = 1; msg.r = st(); }
      this.send(msg);
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
      if (this.coop && (s < 0 || Slots.team(s) !== 0)) return;   // phòng Story / run: cả phòng 1 đội, không ghế GUEST
      if (this.run && this.isLead(id)) return;   // phòng run: vị trí của máy giữ = vị trí character trong run (seatHost)
      m.slot = s;
      if (this.local && id === this.local.id && s >= 0) { this.hook('localRole', Slots.role(s)); m.pf = this.local.pf(); }
      this.sendLobby();
      this.hook('changed');
    }

    // phòng run: máy giữ (host / chủ phòng máy chủ riêng: id) đứng đúng vị trí của character trong run (người đang đứng đó dời sang ô trống khác)
    seatHost(role, id = this.local && this.local.id) {
      const L = this.lobby, me = id != null && this.member(id), s = Slots.of(0, role);
      if (!me || !this.run || this.status !== 'lobby' || me.slot === s) return;
      const other = Slots.memberAt(L, s);
      if (other) other.slot = me.slot;
      me.slot = s;
      if (this.isLocal(id)) { this.hook('localRole', role); me.pf = this.local.pf(); }
      this.sendLobby();
      this.hook('changed');
    }

    // chủ phòng chọn sân: chỉ số Area (sân của Area đó), -1 = ngẫu nhiên. Area chủ phòng chưa tới -> lúc vào trận coi như ngẫu nhiên
    setGround(id, a) {
      if (id !== this.lobby.owner || this.status !== 'lobby' || this.ranked) return;
      this.lobby.ground = clampInt(a, -1, SFC.MainPath.areas().length - 1);
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
          if (this.ranked) return this.rankedHello(id, pf);
          // người vào sau: mặc định sang đội kia (versus) đúng vị trí họ chọn; hết chỗ thì slot trống bất kỳ
          // (phòng Story: cùng đội 0, vào được cả giữa 2 trận của cup)
          const slot = this.coop ? Slots.coopFree(L, pf.role || 'FWD') : Slots.free(L, L.members.length ? 1 : 0, pf.role || 'FWD');
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
          if (this.status !== 'lobby' || !who || this.ranked) return;
          who.pf = SFC.Profile.sanitizePublic(m.pf) || who.pf;
          this.sendLobby();
          this.hook('changed');
          break;
        case 'slot':
          if (who && !this.ranked) this.moveMember(id, m.s | 0);
          break;
        case 'intro':
          this.introWait.delete(id);
          break;
        case 'csd':   // phòng Story / run: khách chiếu xong cut scene
          this.csWait.delete(id);
          this.scenesReady();
          break;
        case 'ra':    // phòng run: khách thao tác trên run (bỏ phiếu, chọn BADGE, mua đồ...) — máy giữ kiểm tra + áp vào run
          if (!this.run || !who || this.status !== 'lobby') break;
          if (this.local) this.hook('runAction', id, m);
          else if (id !== L.owner) this.send(Room.cleanAction(m, id, who), L.owner);
          break;
        /* ---------- máy giữ của phòng co-op trên máy chủ riêng (chủ phòng) ---------- */
        case 'co':    // trạng thái cup / bản sao run mới (null = hết cup / chưa có run). Giữa trận: giữ lại, về phòng chờ mới gửi
          if (!this.remoteLead || id !== L.owner || (m.c !== null && typeof m.c !== 'object')) break;
          this.coopState = m.c;
          if (this.status === 'lobby') { this.sendLobby(); this.hook('changed'); }
          break;
        case 'cue':
          if (this.remoteLead && id === L.owner && this.status === 'lobby' && typeof m.k === 'string' && /^(before|run:\d:(intro|boss|after))$/.test(m.k)) this.cueScenes(m.k);
          break;
        case 'story':
          if (this.remoteLead && id === L.owner) this.startStory(Room.cleanCoop(m.o, this));
          break;
        case 'seat':
          if (this.remoteLead && this.run && id === L.owner && ROLES().includes(m.r)) this.seatHost(m.r, id);
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
          if (id === L.owner && this.status === 'lobby' && !this.ranked && !this.coop) this.startMatch(m.area);
          break;
        case 'ground':
          this.setGround(id, m.a);
          break;
        // đo ping: khách ping máy chạy trận -> trả ngay · host ping khách -> khách trả pong (session.js tính)
        case 'ping':
          if (typeof m.c === 'number') this.send({ t: 'pong', c: m.c }, id);
          break;
        case 'pong':
          if (typeof m.c === 'number') this.hook('pong', id, m.c);
          break;
        // ping trung vị của khách từ đầu trận -> bảng ping màn kết quả. Hết trận rồi vẫn nhận (lần báo cuối) -> phát lại ngay
        case 'mp':
          if (this.status === 'playing' && this.seatOf[id] != null && typeof m.ms === 'number') {
            this.pings[this.seatOf[id]] = clampInt(m.ms, 0, 9999);
            if (this.endSent) this.sharePings();
          }
          break;
        case 'toLobby':
          if (id === L.owner && this.status === 'playing' && !this.ranked) this.backToLobby();
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
      this.csWait.delete(id);
      // giữa trận: vắng mặt, AI đá thay, chờ kết nối lại trong net.reconnectGrace giây
      if (this.status === 'playing' && !bye && GRACE() > 0) {
        m.away = Date.now() + GRACE() * 1000;
        const seat = this.seatOf[id];
        delete this.remotes[id];
        this.introWait.delete(id);
        if (L.owner === id && !this.remoteLead) this.passOwner();   // phòng co-op máy chủ riêng: máy giữ vẫn là chủ phòng, chờ kết nối lại
        if (this.game && seat != null) this.game.dropSeat(seat);
        this.send({ t: 'drop', seat, o: L.owner, away: GRACE() });
        this.hook('dropped', (m.pf && m.pf.name) || 'A player', true);
        return;
      }
      this.remove(m);
    }

    // người vắng mặt quá hạn kết nối lại -> rời hẳn. now = Date.now()
    // trận xếp hạng: quá net.queue.joinWait giây mà chưa đủ người -> vào trận luôn, người chơi giả thế chỗ
    expire(now) {
      for (const m of this.lobby.members.slice()) if (m.away && now > m.away) this.remove(m);
      if (this.ranked && this.status === 'lobby' && now - this.createdAt > (N().queue.joinWait || 5) * 1000) this.startRanked();
    }

    // xoá hẳn 1 người khỏi phòng (rời / vắng mặt quá hạn)
    remove(m) {
      const L = this.lobby, id = m.id, wasAway = !!m.away;
      // phòng co-op trên máy chủ riêng: máy giữ cup / run đi rồi -> hết phòng (như host rời phòng người chơi làm host)
      if (this.remoteLead && id === L.owner) {
        L.members = [];
        this.status = 'lobby';
        this.game = null;
        this.hook('close');
        return;
      }
      L.members = L.members.filter((x) => x !== m);
      if (L.owner === id || !L.owner) this.passOwner();
      const name = (m.pf && m.pf.name) || 'A player';
      if (this.status === 'playing') {
        // trận xếp hạng / Story luôn đá tới hết (AI đá thay); phòng thường: còn ít nhất 2 người thì đá tiếp, không thì về phòng chờ
        const keep = !!this.ranked || this.coop || L.members.length > 1;
        // vắng mặt quá hạn: slot đã giao AI từ lúc mất kết nối -> không báo lại
        if (wasAway && keep) return;
        // AI đá thay người vừa rời, trận tiếp tục
        if (!wasAway && keep) {
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
        // sân chủ phòng chọn (Area đã tới); ngẫu nhiên: co-op theo đội bot, versus trong các Area chủ phòng đã tới. Độ khó co-op theo đội bot
        aiProfile: bot ? bot.aiProfile : undefined,
        arena: Room.groundArena(L.ground, area) || (bot ? bot.arena : Room.pickArena(area)),
      };
      this.launch(ms.map((m) => m.id), opts);
    }

    /* ---------- phòng FOOTBALL STORY ---------- */
    // host dựng trận cup cho cả phòng. o (game dựng, src/ui/cup.js): { match: opts trận của vòng (đội đối thủ, độ khó, luật trận...),
    //   away: id đội đối thủ, mates: đồng đội AI cho các vị trí không có người (Mates.spec, đã gắn role) }
    //   Phòng run thêm: seat: { vị trí: { stats, ovr, inj, legend } } (chỉ số trong run của ô đội hình, đè lên hồ sơ người đứng đó) ·
    //   only: [id] = chỉ những người này ra sân (Skill game 1 người), người còn lại xem (watch)
    startStory(o) {
      const L = this.lobby, roles = ROLES();
      if (!this.coop || this.status !== 'lobby' || !o) return;
      this.refreshLocal();
      const here = L.members.filter((m) => m.slot >= 0 && Slots.team(m.slot) === 0 && !m.away);
      const ms = Array.isArray(o.only) ? here.filter((m) => o.only.includes(m.id)) : here;
      if (!ms.length) return;
      // mỗi người mang character của mình (ngoại hình, chỉ số, Core đã mở) vào đúng vị trí đang đứng
      // đội ít người hơn số vị trí (Skill game: teamSize) -> ghế theo thứ tự cầu thủ có trên sân thay vì theo vị trí
      const size = o.match && o.match.teamSize ? o.match.teamSize[0] : roles.length;
      const seats = ms.map((m, k) => {
        const pf = m.pf || SFC.Profile.sanitizePublic({}), role = Slots.role(m.slot), patch = (o.seat && o.seat[role]) || {};
        return { team: 0, idx: size < roles.length ? k : roles.indexOf(role), avatar: Object.assign({}, pf, { role, mate: undefined, cores: undefined }, patch), cores: pf.cores || null };
      });
      this.watchIds = here.filter((m) => !ms.includes(m)).map((m) => m.id);
      const owner = this.member(L.owner) || ms[0];
      const mates = Array.isArray(o.mates) && o.mates.length ? o.mates : null;
      this.csWait.clear();
      this.launch(ms.map((m) => m.id), Object.assign({}, o.match, {
        online: true, seats, mates: [mates, null], clubs: [{ name: owner.pf.name }, { id: o.away }], draftTimeLimit: N().draftTimeLimit,
      }));
    }

    // chiếu cut scene cùng lúc: báo khách (kind: before = trước trận Story · run:<act>:<intro|boss|after>), chờ khách báo csd tối đa net.sceneWait giây
    cueScenes(kind) {
      if (!this.coop) return;
      this.csWait = new Set(this.lobby.members.filter((m) => !m.away && !this.isLead(m.id)).map((m) => m.id));
      this.csUntil = Date.now() + (N().sceneWait || 25) * 1000;
      this.send({ t: 'cs', k: kind });
      this.scenesReady();
    }
    // phòng co-op máy chủ riêng: mọi người khác xem xong cut scene -> báo máy giữ (csr) để vào trận (máy giữ tự đếm giờ chờ tối đa)
    scenesReady() {
      if (this.remoteLead && !this.csWait.size && this.member(this.lobby.owner)) this.send({ t: 'csr' }, this.lobby.owner);
    }
    get scenesPending() { return this.csWait.size > 0 && Date.now() < this.csUntil; }

    /* ---------- trận xếp hạng (máy chủ riêng) ---------- */
    // người trong đội hình vào phòng: ngồi đúng ghế đã xếp; đủ người -> vào trận
    rankedHello(id, pf) {
      const R = this.ranked, seat = R.seats.find((s) => s.id === id);
      if (!seat) return this.refuse(id, 'full');
      if (this.member(id)) return;
      const tok = token();
      this.lobby.members.push({ id, pf, slot: Slots.of(seat.team, seat.role), tok, away: 0 });
      this.send({ t: 'you', tok }, id);
      this.hook('joined', pf.name);
      if (R.seats.every((s) => this.member(s.id))) this.startRanked();
    }

    // vào trận với những người đã vào phòng; ghế của người chưa vào = người chơi giả cùng Elo / vị trí
    startRanked() {
      const R = this.ranked, roles = ROLES();
      if (!R || this.status !== 'lobby') return;
      const here = R.seats.filter((s) => this.member(s.id));
      if (!here.length) return;   // chưa ai vào: máy chủ tự xoá phòng
      const taken = R.taken.slice(), fakes = R.fakes.map((l) => l.slice());
      for (const s of R.seats) if (!this.member(s.id)) fakes[s.team].push(SFC.Matchmaker.fake(s.elo, s.role, taken));
      const seats = here.map((s) => {
        const pf = this.member(s.id).pf || SFC.Profile.sanitizePublic({});
        return {
          team: s.team, idx: roles.indexOf(s.role),
          avatar: Object.assign({}, pf, { role: s.role, elo: s.elo, mate: undefined, cores: undefined }),
          cores: pf.cores || null,
        };
      });
      // Elo trung bình từng đội lúc ghép (người thật + người giả): mỗi người tự tính Elo cộng / trừ (MainPath.record)
      this.teamElo = [0, 1].map((t) => avg(R.seats.filter((s) => s.team === t).map((s) => s.elo).concat(R.fakes[t].map((f) => f.elo))));
      // CLB mỗi đội mang tên người thật đầu tiên của đội (không có thì người giả), đội 1 mặc áo sân khách
      const clubs = [0, 1].map((t) => {
        const s = here.find((x) => x.team === t);
        return { name: s ? this.member(s.id).pf.name : (fakes[t][0] && fakes[t][0].name) || 'PLAYER', away: t === 1 };
      });
      this.launch(here.map((s) => s.id), {
        online: true, ranked: 1, difficulty: N().difficulty, aiProfile: R.aiProfile, mateProfile: R.aiProfile,
        draftTimeLimit: N().draftTimeLimit, seats, mates: fakes.map((l) => (l.length ? l : null)), clubs, arena: R.arena,
      });
    }

    // dựng trận + báo từng khách (opts chung cho mọi máy; me / mainPath riêng từng người: optsFor)
    launch(ids, opts) {
      const [home, away] = Room.registerClubs(opts.clubs);
      this.startOpts = opts;   // người kết nối lại giữa trận dựng lại trận "gương" từ đây
      this.seatIds = ids.slice();
      this.seatOf = {};
      ids.forEach((id, i) => { this.seatOf[id] = i; });
      // máy chủ riêng không có góc nhìn: me = -1 (không slot nào là "tại máy này")
      const me = this.local && this.seatOf[this.local.id] != null ? this.seatOf[this.local.id] : -1;   // host không ra sân (Skill game của người khác): chỉ xem
      this.game = new SFC.Game(Object.assign({ home, away, me, humanTeam: me >= 0 ? opts.seats[me].team : -1 }, opts));
      // máy chủ riêng: không ai xem -> bỏ hiệu ứng hình ảnh (vẫn ghi lại gửi khách). Phải trước capture
      if (!this.local) this.game.effects.headless();
      Sync().capture(this.game);
      this.remotes = {};
      for (const id of this.seatIds) if (!this.isLocal(id)) this.remotes[id] = new (Sync().RemoteInput)();
      this.frame = 0;
      this.endSent = false;
      this.pings = {};
      // trận xếp hạng: mỗi cầu thủ không phải người thật có ping riêng = ping người thật * hệ số cố định cả trận
      const human = new Set(this.game.seats.map((s) => s.p).filter(Boolean));
      this.botLag = {};
      if (this.ranked) for (const p of this.game.players) if (!human.has(p)) this.botLag[p.id] = 0.7 + Math.random() * 0.7;
      this.status = 'playing';
      // màn giới thiệu 2 đội: trận đứng yên tới khi mọi máy xem xong (hoặc quá giờ chờ)
      this.holdIntro(Room.wantsIntro(opts));
      for (const id of this.seatIds) if (!this.isLocal(id)) this.send({ t: 'start', opts: this.optsFor(id) }, id);
      // không có ghế (Skill game 1 người của phòng run): xem trận, không gửi phím
      for (const id of this.watchIds) if (!this.isLocal(id) && this.member(id)) this.send({ t: 'start', opts: Object.assign({}, this.startOpts, { me: -1, watch: 1 }) }, id);
      this.hook('start', this.game);
    }

    // opts gửi cho 1 người: slot của họ (me); trận xếp hạng thêm Elo trung bình đội mình / đội kia
    optsFor(id, extra) {
      const seat = this.seatOf[id], o = Object.assign({}, this.startOpts, { me: seat }, extra);
      if (this.ranked && seat != null) {
        const t = this.startOpts.seats[seat].team;
        o.mainPath = { myElo: this.teamElo[t], oppElo: this.teamElo[1 - t] };
      }
      return o;
    }

    isLocal(id) { return !!this.local && id === this.local.id; }

    // người vắng mặt kết nối lại (id = kết nối mới): lấy lại slot, nhận trận đang đá (không màn giới thiệu)
    rejoin(m, id) {
      const old = m.id, seat = this.seatOf[old];
      m.id = id;
      m.away = 0;
      if (this.lobby.owner === old) this.lobby.owner = id;   // phòng co-op máy chủ riêng: máy giữ kết nối lại vẫn là chủ phòng
      if (seat != null) {
        delete this.seatOf[old];
        this.seatOf[id] = seat;
        this.seatIds[seat] = id;
        this.remotes[id] = new (Sync().RemoteInput)();
        this.game.resumeSeat(seat);
      }
      this.send({ t: 'start', opts: this.optsFor(id, { resume: 1, lobby: { m: this.publicMembers(), o: this.lobby.owner } }) }, id);
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
      this.watchIds = [];
      this.game = null;
      this.introLeft = 0;
      this.hook('toLobby');
    }

    /* ---------- màn giới thiệu 2 đội (config/intro.config.js, mode 'online') ---------- */
    // giữ trận tới khi mọi máy xem xong; quá duration + outro + onlineWait giây thì chạy luôn
    // (trận xếp hạng: máy khách hiện MATCH FOUND trước màn giới thiệu như khi ghép người chơi giả -> chờ thêm khoảng đó)
    holdIntro(on) {
      const I = SFC_CONFIG.intro, M = SFC_CONFIG.mainPath.matchmaking;
      this.myIntro = on && !!this.local;
      this.introWait = new Set(on ? this.seatIds.filter((id) => !this.isLocal(id)) : []);
      this.introLeft = on ? I.duration + I.outro + (I.onlineWait || 4) + (this.ranked ? M.foundHold + M.searchTime[0] : 0) : 0;
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
      if (ended || this.frame % Math.round((N().pingShare || 5) * 60) === 0) this.sharePings();
    }

    // bảng ping { id cầu thủ: ms } -> mọi khách + máy này (hook pings). Không có số nào thì không gửi
    sharePings() {
      const g = this.game;
      if (!g) return;
      const mine = this.local ? this.hook('myPing') : null;
      if (this.local && mine != null && this.seatOf[this.local.id] != null) this.pings[this.seatOf[this.local.id]] = clampInt(mine, 0, 9999);
      const p = {}, real = [];
      g.seats.forEach((s, i) => { if (s.p && this.pings[i] != null) { p[s.p.id] = this.pings[i]; real.push(this.pings[i]); } });
      if (!real.length) return;
      const base = real.slice().sort((a, b) => a - b)[Math.floor(real.length / 2)];
      for (const id in this.botLag) if (p[id] == null) p[id] = clampInt(Math.max(12, base) * this.botLag[id], 8, 400);
      this.send({ t: 'pg', p });
      this.hook('pings', p);
    }

    /* ---------- phòng co-op trên máy chủ riêng: lọc dữ liệu máy giữ / khách gửi lên ---------- */
    // o của startStory do máy giữ gửi (story{o}) -> chỉ giữ trường hợp lệ, số kẹp trong khoảng an toàn; luật trận / câu nói / chiêu riêng
    // của đối thủ lấy từ config theo vòng cup (phòng Story) / đội đối thủ (phòng run, Run.opp) như guestStart. Không hợp lệ -> null
    static cleanCoop(o, room) {
      if (!o || typeof o !== 'object' || !o.match || typeof o.match !== 'object') return null;
      const C = SFC_CONFIG, PF = SFC.Profile, roles = ROLES(), x = o.match;
      const away = typeof o.away === 'string' && C.teams.list[o.away] && !CLUBS.includes(o.away) ? o.away : null;
      if (!away) return null;
      const num = (v, a, b, d) => (typeof v === 'number' && isFinite(v) ? Math.max(a, Math.min(b, v)) : d);
      const pair = (v, a, b, int) => (Array.isArray(v) ? [0, 1].map((t) => (int ? clampInt(v[t], a, b) : num(v[t], a, b, 0))) : undefined);
      // [đội bạn, null]: chỉ đội 0 (đội người chơi) được BADGE
      const mine = (v, a, b, int) => (Array.isArray(v) ? [int ? clampInt(v[0], a, b) : num(v[0], a, b, 1), int ? 0 : null] : undefined);
      const ai = (a) => {
        if (!a || typeof a !== 'object') return undefined;
        const out = {};
        for (const k of Object.keys(a).slice(0, 12)) if (typeof a[k] === 'number' && isFinite(a[k])) out[k] = Math.max(0, Math.min(5, a[k]));
        return Object.keys(out).length ? out : undefined;
      };
      const seat = {};
      for (const r of roles) {
        const v = o.seat && o.seat[r];
        if (!v || typeof v !== 'object') continue;
        const p = {}, st = PF.sanitizeStats(v.stats), inj = PF.sanitizeInj(v.inj), leg = PF.sanitizeLegend(v.legend);
        if (st) { p.stats = st; p.ovr = clampInt(v.ovr, 1, 99); }
        if (inj) p.inj = inj;
        if (leg) p.legend = leg;
        seat[r] = Object.assign(p, Room.cleanGear(v));
      }
      const mates = (Array.isArray(o.mates) ? o.mates.slice(0, roles.length) : [])
        .map((m) => { const v = PF.sanitizeMate(m); return v && Object.assign(v, Room.cleanGear(m)); }).filter(Boolean);
      const only = Array.isArray(o.only) ? o.only.filter((id) => typeof id === 'string' && room.member(id)).slice(0, roles.length) : null;
      const match = {
        difficulty: C.game.ai.difficulty[x.difficulty] ? x.difficulty : 'normal', humanTeam: 0,
        aiProfile: ai(x.aiProfile), mateProfile: ai(x.mateProfile),
        arena: C.arenas[x.arena] ? x.arena : undefined, statMul: pair(x.statMul, 0.3, 3),
      };
      if (room.story) {
        const cs = x.cup && C.stories.list.find((v) => v.id === room.story && v.id === x.cup.id && !v.soon);
        if (!cs) return null;
        const r = clampInt(x.cup.round, 0, cs.rounds.length - 1), rd = cs.rounds[r];
        Object.assign(match, { cup: { id: cs.id, round: r }, knockout: true, signature: [null, rd.signature || null], mod: rd.mod || null, barks: rd.barks || null, score: rd.score || null });
      } else {
        const RC = C.run, ro = x.run && typeof x.run === 'object' ? x.run : null;
        if (!RC || !ro || !SFC.Run) return null;
        const drill = RC.drills[x.drill] ? x.drill : undefined, trial = drill && SFC.Run.legend(x.trial) ? x.trial : undefined;
        match.run = { nonce: String(ro.nonce || '').slice(0, 12), act: clampInt(ro.act, 0, RC.acts.length - 1), node: String(ro.node || '').slice(0, 8),
          kind: RC.nodes[ro.kind] || ro.kind === 'legend' ? ro.kind : 'match', drill, trial };
        if (drill) {
          Object.assign(match, { drill, trial, drillEase: num(x.drillEase, 0, 0.8, 0), drillSeed: clampInt(x.drillSeed, 0, 2 ** 31), teamSize: SFC.Run.drillSize(drill, trial), noDraft: true });
        } else {
          const rd = SFC.Run.opp(away) || {};
          Object.assign(match, { knockout: true, signature: [null, rd.signature || null], mod: rd.mod || null, barks: rd.barks || null });
          // BADGE của đội (Run.matchOpts): tỉ số khởi đầu, nạp Tuyệt kỹ, lượt chọn Core, VAR, bù giờ
          if (Array.isArray(x.score)) match.score = pair(x.score, 0, 9, true);
          if (x.ultGain) match.ultGain = mine(x.ultGain, 0.5, 3);
          if (x.draftCards) match.draftCards = mine(x.draftCards, 0, 3, true);
          if (x.rerollBonus) match.rerollBonus = mine(x.rerollBonus, 0, 9, true);
          if (x.draftBonus) match.draftBonus = mine(x.draftBonus, 0, 3, true);
          if (x.addedTime) match.addedTime = mine(x.addedTime, 0, 120, true);
          const V = Array.isArray(x.varCheck) && x.varCheck[0];
          if (V && typeof V === 'object') match.varCheck = [{ n: clampInt(V.n, 0, 5), chance: num(V.chance, 0, 1, 0) }, null];
        }
      }
      return { away, mates, seat, only: only && only.length ? only : null, match };
    }

    // GEAR trường phái của 1 ghế / đồng đội (Run.gearCore): { trường phái: số } — chỉ trường phái có thật, số kẹp
    static cleanGear(v) {
      const A = SFC_CONFIG.cores.archetypes || {}, out = {};
      for (const k of ['gearBoost', 'gearBias']) {
        const g = v && v[k];
        if (!g || typeof g !== 'object') continue;
        const o = {};
        for (const s of Object.keys(g)) if (A[s] && typeof g[s] === 'number' && isFinite(g[s])) o[s] = Math.max(0, Math.min(5, g[s]));
        if (Object.keys(o).length) out[k] = o;
      }
      return out.gearBoost && out.gearBias ? out : {};
    }

    // thao tác run của khách -> chuyển tiếp cho máy giữ: chỉ các trường runmap.js dùng (a, k, v, i), kèm id + mã hồ sơ người gửi
    static cleanAction(m, id, who) {
      const str = (v) => (typeof v === 'string' ? v.slice(0, 24) : typeof v === 'number' && isFinite(v) ? v : undefined);
      return { t: 'ra', a: String(m.a || '').slice(0, 16), k: str(m.k), v: str(m.v), i: str(m.i), f: id, u: (who.pf && who.pf.uid) || id };
    }

    /* ---------- tiện ích dùng chung (host, khách, máy chủ riêng) ---------- */
    // giống SFC.Intro.wants (ui/intro.js gọi hàm này) — Room chạy được cả khi không có UI
    static wantsIntro(opts) {
      const I = SFC_CONFIG.intro;
      if (!I || !I.enabled || opts.resume || opts.drill) return false;   // kết nối lại giữa trận: không chiếu lại · SKILL GAME: không có màn giới thiệu
      const mode = opts.online ? 'online' : opts.mainPath ? 'mainPath' : opts.cup || (opts.run && !opts.drill) ? 'story' : opts.drill ? 'training' : opts.training ? 'training' : 'single';
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

    // sân của Area g chủ phòng chọn (chỉ khi g <= area = Area cao nhất chủ phòng đã tới); không hợp lệ -> undefined
    static groundArena(g, area) {
      if (!(g >= 0 && g <= area)) return undefined;
      const id = SFC.MainPath.area(g).arena;
      return SFC_CONFIG.arenas[id] ? id : undefined;
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
