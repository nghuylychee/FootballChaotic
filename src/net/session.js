/* Session — phiên online của người chơi: phòng 4 slot (2 đội x vị trí DEF / FWD) phía người chơi: phòng chờ, vào trận, vòng lặp khách (gửi phím + nội suy).
 * KHÔNG CÓ UI: không gọi Menu / UI / Audio / Intro, không có chữ hiển thị. Báo mọi thay đổi qua sự kiện (Session.on) với mã
 * trung tính; giao diện (src/ui/online.js) tự quyết trang nào, chữ gì, banner nào -> sửa UI thoải mái không đụng tới online.
 * Dữ liệu của game cần cho phòng (hồ sơ trận, Area đã tới) lấy qua Session.provide({ profile, area }).
 *
 * 2 mô hình, cùng 1 bản luật phòng (src/net/room.js):
 *  - Máy chủ riêng (net.server.urls / url, transport-server.js; nhiều máy: chọn máy ping thấp nhất): máy chủ chạy trận, người tạo phòng chỉ là khách có quyền chủ phòng.
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
 *   cup {state}                             phòng FOOTBALL STORY: trạng thái cup của host vừa tới (khách; null = chưa / hết cup)
 *   scenes {kind}                           phòng Story: host bắt đầu chiếu cut scene (kind: before) -> chiếu xong gọi scenesDone()
 *   invite {code}                           bạn bè mời vào phòng và mình đã nhận lời ở ngoài game (chỉ backend có bảng mời: Steam) -> UI chọn
 *                                           lúc vào (rời phòng đang ở trước) rồi joinRoom(code). Mời: canInvite / invite()
 *   solo                                    tìm trận xếp hạng không ghép được người thật (không ai đang tìm / không kết nối được /
 *                                           máy chủ bận): game tự ghép người chơi giả (MainPath.matchmake) như khi chơi một mình
 *
 * Tìm trận xếp hạng (Main Path, chỉ máy chủ riêng): queue() -> máy chủ ghép (src/net/matchmaker.js) -> vào phòng xếp hạng như khách
 * (không có phòng chờ, không sự kiện lobby) -> start {game} như trận thường (opts.ranked + opts.mainPath) | solo. cancelQueue() = bỏ tìm.
 *
 * Gói tin:
 *   khách -> host : hello{v,pf,tok?} · pf{pf} (đổi đồng đội / chỉ số) · slot{s} (nhảy slot) · intro (xem xong màn giới thiệu) ·
 *                   i{d,p} (phím) · pick{i} · reroll · bye · begin{area} / toLobby / ground{a} (chủ phòng, phòng máy chủ riêng) · ka (giữ thức)
 *   khách -> host : mp{ms} (ping trung vị từ đầu trận, mỗi net.pingShare giây + lúc hết trận) · host -> khách: pg{p:{id cầu thủ: ms}} (bảng ping)
 *   cả 2 chiều    : ping{c} -> pong{c} (đo ping mỗi net.pingEvery giây, c = giờ của bên gửi; SFC.NetStats)
 *   khách -> máy chủ (trước khi vào phòng): queue{v,elo,role,pf} · unqueue — xem transport-server.js
 *   Phòng FOOTBALL STORY (createRoom({ story }), chỉ người chơi làm host): lobby thêm k (id Story) + c (trạng thái cup, src/meta/cup.js share) ·
 *                   host -> khách cs{k} (chiếu cut scene) · khách -> host csd (chiếu xong). Trận cup: start{opts.cup}, khách dựng lại luật trận theo config
 *   host  -> khách: you{tok} (mã kết nối lại) · lobby{m:[{id,pf,slot}],o,g} (g = sân: chỉ số Area, -1 = ngẫu nhiên) · start{opts} · s{f,s,fx,sfx,ev} (snapshot) ·
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
    lobby: { members: [], owner: null, ground: -1 },   // [{ id, pf, slot }] · ground = sân chủ phòng chọn (Area, -1 = ngẫu nhiên) · host: chính là room.lobby
    game: null,          // host: trận thật · khách: trận "gương"
    pings: {},           // bảng ping trận đang đá { id cầu thủ: ms } (màn kết quả) — sự kiện 'pings' mỗi lần đổi
    NO_INPUT: null,      // phím rỗng (UI truyền vào tick khi đang mở menu / chọn Core / hết trận)

    /* ================= GHÉP VỚI GAME ================= */
    on(name, fn) { (listeners[name] || (listeners[name] = [])).push(fn); return () => { listeners[name] = listeners[name].filter((f) => f !== fn); }; },
    emit(name, data) { for (const fn of listeners[name] || []) fn(data || {}); },
    // profile(): hồ sơ trận công khai của người chơi (vị trí đang chọn + đồng đội) · area(): Area cao nhất đã tới (đội bot / sân)
    // rank(): Main Path của người chơi { area, elo, reward } (tìm trận xếp hạng + opts.mainPath của trận xếp hạng)
    // cup(): trạng thái cup của máy làm host gửi cả phòng Story (null = chưa bắt đầu / đã hết)
    provider: { profile: () => SFC.Profile.sanitizePublic({}), area: () => 0, rank: () => ({ area: 0, elo: 0, reward: 1 }), cup: () => null },
    provide(p) { Object.assign(this.provider, p); },
    myPf() { return this.provider.profile(); },
    // sắp vào online (mở menu ONLINE): khởi động trước những gì cần (máy chủ đang ngủ thì đánh thức)
    prepare() { if (NC().serverOn()) SFC.NetServer.wake(); },

    get active() { return this.status !== 'idle'; },
    get isHost() { return this.role === 'host'; },
    // chủ phòng: được START / về phòng chờ (người chơi làm host, hoặc người tạo phòng máy chủ riêng)
    get isOwner() { return !!this.lobby.owner && this.lobby.owner === Net().id; },
    get onServer() { return Net() === SFC.NetServer; },
    // tên ngắn nơi chạy trận (ô PING): máy chủ riêng = alias trong net.server.urls (RS, RO...; chưa đặt: ''),
    // người chơi làm host = PS (Steam P2P) / PP (PeerJS) -> phòng nào cũng có tên, không lộ cách kết nối
    get serverAlias() {
      if (this.status === 'idle') return '';
      if (this.onServer) return SFC.NetServer.home ? NC().serverAlias(SFC.NetServer.home.url) : '';
      return Net() === SFC.NetSteam ? 'PS' : 'PP';
    },
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
    // opts.direct: người chơi chọn tự làm host (PRIVATE MATCH › CONNECTION: DIRECT) -> bỏ qua máy chủ riêng
    // opts.story: phòng FOOTBALL STORY (id Story) — luôn người chơi làm host (máy chủ riêng không mở phòng Story)
    createRoom(opts = {}) {
      if (this.status === 'busy') return;
      this.status = 'busy';
      this.story = opts.story || null;
      this.emit('busy', { action: 'create', story: this.story });
      if (opts.direct || this.story || !NC().serverOn()) { this.hostLocally(); return; }
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

    /* ================= MỜI BẠN BÈ ================= */
    // phòng đang ở mở được bảng mời bạn bè (backend người chơi làm host có invite: Steam; máy chủ riêng / PeerJS: không -> chỉ có mã phòng)
    get canInvite() {
      const net = Net();
      return this.status === 'lobby' && !this.onServer && !!net && typeof net.invite === 'function' && net.canInvite();
    },
    invite() { return this.canInvite && Net().invite(); },
    // nghe lời mời đã nhận ở ngoài game (gọi 1 lần lúc mở game): đang chạy -> sự kiện invite ngay;
    // mở game bằng lời mời -> sự kiện invite ở lượt sau (UI đã gắn xong handler)
    watchInvites() {
      const st = SFC.NetSteam;
      if (this.invitesOn || !N().useSteam || !st || !st.available()) return;
      this.invitesOn = true;
      st.onInvite((code) => this.emit('invite', { code }));
      const code = st.launchInvite();
      if (code) setTimeout(() => this.emit('invite', { code }), 0);
    },

    // huỷ tạo / vào phòng đang chờ kết nối
    cancel() {
      if (this.cancellable) SFC.NetServer.cancel();
    },

    /* ================= TÌM TRẬN XẾP HẠNG ================= */
    // vào hàng chờ trên máy chủ riêng (role = vị trí mong muốn, mặc định theo hồ sơ). Mọi đường không ghép được người thật -> solo
    queue(role) {
      if (this.status !== 'idle' || !NC().serverOn()) { this.emit('solo'); return; }
      this.status = 'searching';
      this.ranked = true;
      this.role = 'guest';
      const pf = Object.assign({}, this.myPf(), role ? { role } : {});
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
      this.pinger();
    },

    // đo ping + đếm byte (SFC.NetStats) từ lúc vào phòng: khách ping máy chạy trận, host ping các khách (trung bình)
    pinger() {
      clearInterval(this.pingT);
      SFC.NetStats.reset();
      const every = N().pingEvery || 0;
      let n = 0, sentEnd = null;
      if (every > 0) this.pingT = setInterval(() => {
        if ((this.status === 'lobby' || this.status === 'playing') && !this.rejoining) Net().send({ t: 'ping', c: Math.round(performance.now()) });
        // khách: báo ping trung vị cả trận mỗi pingShare giây + 1 lần ngay khi thấy hết trận (bảng ping cuối chính xác)
        if (this.status !== 'playing' || this.isHost || this.rejoining || !this.game) return;
        const ms = SFC.NetStats.matchPing(), end = this.game.state === 'ended';
        if (ms == null) return;
        if (end ? sentEnd !== this.game : ++n % Math.max(1, Math.round((N().pingShare || 5) / every)) === 0) {
          if (end) sentEnd = this.game;
          Net().send({ t: 'mp', ms });
        }
      }, every * 1000);
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
        story: this.story,
        hooks: this.roomHooks(),
      });
      this.lobby = this.room.lobby;
      this.status = 'lobby';
      this.pinger();
      this.emit('lobby', { entered: true });
    },

    // khách (phòng người chơi làm host, hoặc mọi người ở phòng máy chủ riêng)
    enterAsGuest(code) {
      this.role = 'guest';
      this.keepAlive();
      this.code = code;
      this.lobby = { members: [], owner: null, ground: -1 };
      this.roleSent = null;
      this.status = 'lobby';
      Net().send({ t: 'hello', v: N().protocol, pf: this.myPf() });
      this.emit('lobby', { entered: true, pending: true });
    },

    // Room (người chơi làm host) -> sự kiện. Sự kiện trận (g.events) để lại cho UI tiêu thụ
    roomHooks() {
      return {
        changed: () => this.emit('lobby'),
        pong: (id, c) => SFC.NetStats.pong(performance.now() - c),
        myPing: () => SFC.NetStats.matchPing(),
        pings: (p) => { this.pings = p; this.emit('pings'); },
        joined: (name) => this.emit('notice', { kind: 'joined', name }),
        left: (name) => this.emit('notice', { kind: 'left', name }),
        dropped: (name, away) => this.emit('player', { kind: away ? 'away' : 'left', name }),
        back: (name) => this.emit('player', { kind: 'back', name }),
        toLobby: () => { this.status = 'lobby'; this.game = null; this.emit('toLobby'); },
        start: (game) => { this.game = game; this.status = 'playing'; this.pings = {}; SFC.NetStats.matchStart(); this.emit('start', { game, resume: false }); },
        events: () => {},
        localRole: (role) => this.emit('role', { role }),
        cupState: () => this.provider.cup(),
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
      this.story = null;           // phòng FOOTBALL STORY: id Story
      this.cup = null;             // khách phòng Story: trạng thái cup host gửi (chưa kiểm tra — src/meta/cup.js mirror lọc)
      this.room = null;
      this.lobby = { members: [], owner: null, ground: -1 };
      this.roleSent = null;
      this.buf = [];
      this.jit = null;             // đo độ giật snapshot (đệm nội suy tự điều chỉnh)
      this.pred = null;            // dự đoán cầu thủ của mình (predict.js)
      this.tok = null;             // mã kết nối lại do phòng cấp (you{tok})
      this.waitingServer = false;  // đang chờ máy chủ dậy (huỷ được)
      this.roomClosed = false;     // phòng đóng hẳn (bye) -> closed{reason: 'closed'} thay vì 'lost'
      clearInterval(this.ka);
      clearInterval(this.pingT);
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
      if (this.story && (s < 0 || this.slotTeam(s) !== 0)) return;
      if (this.isHost) this.room.moveMember('host', s);
      else Net().send({ t: 'slot', s });
    },
    // vòng qua các slot trống theo chiều d, GUEST đứng cuối vòng (luôn chọn được)
    cycleSlot(d) {
      const me = this.mine;
      if (!me) return;
      // phòng Story: chỉ các vị trí của đội 0, không có GUEST
      const list = this.story ? ROLES().map((r) => this.slotOf(0, r)) : [...Array(this.nSlots).keys(), -1], n = list.length, i = list.indexOf(me.slot);
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
          this.lobby.ground = clampInt(m.g == null ? -1 : m.g, -1, SFC.MainPath.areas().length - 1);
          // phòng FOOTBALL STORY: id Story + trạng thái cup của host (báo trước toLobby để màn cup vẽ đúng vòng mới)
          this.story = typeof m.k === 'string' ? m.k.slice(0, 40) : null;
          if (this.story) { this.cup = m.c && typeof m.c === 'object' ? m.c : null; this.emit('cup', { state: this.cup }); }
          if (this.status === 'playing') {
            this.status = 'lobby'; this.game = null;
            this.emit('toLobby');
            // sau trận có thể đã lên level / đổi chỉ số -> gửi lại hồ sơ trận
            Net().send({ t: 'pf', pf: this.myPf() });
          }
          // vị trí character theo slot đang đứng
          if (this.mine && this.mine.slot >= 0) {
            // mỗi vị trí chỉ báo 1 lần: hồ sơ vẫn chưa theo kịp slot thì không gửi lại liên tục (pf -> lobby -> pf... -> quá giới hạn gói, bị ngắt)
            const role = this.slotRole(this.mine.slot);
            if (role !== this.myPf().role && role !== this.roleSent) { this.roleSent = role; this.emit('role', { role }); Net().send({ t: 'pf', pf: this.myPf() }); }
          }
          this.emit('lobby');
          break;
        }
        case 'you': if (typeof m.tok === 'string') this.tok = m.tok; break;
        case 'ping': if (typeof m.c === 'number') Net().send({ t: 'pong', c: m.c }); break;
        case 'pong': if (typeof m.c === 'number') SFC.NetStats.pong(performance.now() - m.c); break;
        case 'start': this.guestStart(m); break;
        case 'cs': if (this.story && this.status === 'lobby' && m.k === 'before') this.emit('scenes', { kind: 'before' }); break;
        case 'pg': if (m.p && typeof m.p === 'object') { this.pings = this.cleanPings(m.p); this.emit('pings'); } break;
        case 's': if (this.status === 'playing') { this.buf.push(m); this.jitter(m.f); } break;
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

    // bảng ping nhận qua mạng: chỉ số nguyên 0..9999, tối đa 12 người
    cleanPings(p) {
      const out = {};
      for (const k of Object.keys(p).slice(0, 12)) if (typeof p[k] === 'number' && isFinite(p[k])) out[k] = clampInt(p[k], 0, 9999);
      return out;
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

    // chủ phòng chọn sân: a = chỉ số Area (trong Area đã tới, provider.area()), -1 = ngẫu nhiên
    setGround(a) {
      if (this.status !== 'lobby' || !this.isOwner) return;
      a = clampInt(a, -1, this.provider.area());
      if (this.isHost) this.room.setGround(this.room.local.id, a);
      else { this.lobby.ground = a; Net().send({ t: 'ground', a }); this.emit('lobby'); }
    },

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
        // tên CLB = tên character của người chơi -> lọc như tên người chơi (config/namefilter.config.js)
        return c.id ? { id: String(c.id) } : { name: SFC.Profile.publicName(String(c.name || '')), away: !!c.away };
      });
      const [home, away] = SFC.Room.registerClubs(clubs);
      // đồng đội AI mỗi đội: 1 người, hoặc mảng (trận xếp hạng: đội không ai vào được = 2 người chơi giả)
      const mate = (x) => (Array.isArray(x) ? x.slice(0, roles.length).map((y) => SFC.Profile.sanitizeMate(y)).filter(Boolean) : SFC.Profile.sanitizeMate(x));
      // trận xếp hạng: Main Path của máy này (Area / Elo / thưởng) + Elo trung bình 2 đội phòng gửi (mỗi người tự tính Elo sau trận)
      const mp = o.ranked && o.mainPath && typeof o.mainPath === 'object' ? Object.assign({}, this.provider.rank(), {
        myElo: Math.max(0, +o.mainPath.myElo || 0), oppElo: Math.max(0, +o.mainPath.oppElo || 0),
      }) : undefined;
      // trận FOOTBALL STORY: chỉ nhận id Story + vòng, luật trận / câu nói lấy từ config của máy này (không tin dữ liệu gửi tới)
      const St = SFC_CONFIG.stories, cs = o.cup && St && St.list.find((x) => x.id === o.cup.id && !x.soon);
      const cr = cs ? clampInt(o.cup.round, 0, cs.rounds.length - 1) : 0, rd = cs && cs.rounds[cr];
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
        cup: rd ? { id: cs.id, round: cr } : undefined, knockout: rd ? true : undefined,
        mod: rd ? rd.mod || null : undefined, barks: rd ? rd.barks || null : undefined, mirror: 1,
      });
      this.game.events.length = 0;
      this.buf = [];
      this.jit = null;   // khung trận mới đếm lại từ 0 -> đo độ giật lại từ đầu
      this.pred = null;  // dự đoán cầu thủ của mình: trận mới bắt đầu lại
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
      if (!resume) { SFC.NetStats.matchStart(); this.pings = {}; }
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

    /* ================= PHÒNG FOOTBALL STORY ================= */
    // host: trạng thái cup đổi (bắt đầu / thoát cup) -> gửi lại phòng chờ kèm trạng thái mới
    shareCup() { if (this.isHost && this.room && this.status === 'lobby') this.room.sendLobby(); },
    // host: chiếu cut scene trước trận cùng lúc ở mọi máy
    cueScenes(kind) { if (this.isHost && this.room && this.status === 'lobby') this.room.cueScenes(kind); },
    // host: còn khách chưa chiếu xong (chờ tối đa net.sceneWait giây)
    get scenesPending() { return this.isHost && !!this.room && this.room.scenesPending; },
    // khách: chiếu xong cut scene host yêu cầu
    scenesDone() { if (!this.isHost && this.story && this.status === 'lobby') Net().send({ t: 'csd' }); },
    // host: vào trận vòng hiện tại (o: xem Room.startStory)
    startStory(o) { if (this.isHost && this.room && this.status === 'lobby') this.room.startStory(o); },

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
      for (const p of g.players) {
        p.anim += dt;   // đồng hồ hoạt ảnh tự đếm ở máy khách (không có trong snapshot)
        if (p.celId && g.state === 'goal') p.celT += dt;   // động tác ăn mừng bàn thắng (khi 'ended' thì Renderer tự đếm cho mọi chế độ)
      }
      if (!buf.length) return g;

      // đồng hồ vẽ chạy sau snapshot mới nhất một khoảng interpDelay
      const newest = buf[buf.length - 1].f;
      const base = this.onServer ? N().server.interpDelay || N().interpDelay : N().interpDelay;
      const delay = Math.max(base, this.jit ? this.jit.delay : 0);
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
      // dự đoán cầu thủ của mình (src/net/predict.js): chạy ngay theo phím, tự sửa theo máy chủ
      if (SFC.Predict) (this.pred || (this.pred = new SFC.Predict())).step(g, g.seatPlayer(g.me), this.downMask | 0, dt, now, SFC.NetStats.rtt, buf[buf.length - 1]);
      Sync().trail(g);
      return g;
    },

    // đo độ giật của snapshot: lệch = giờ nhận - giờ "đáng lẽ" (khung * 1/60 s). Trong ~2 giây gần nhất, gói tới sớm nhất làm mốc;
    // đệm cần = phân vị jitterPct của (lệch - mốc) + 1 khoảng giữa 2 snapshot + jitterPad. Tăng ngay khi mạng xấu đi, giảm từ từ
    jitter(f) {
      const now = performance.now(), J = this.jit || (this.jit = { offs: [], lastF: null, step: 2, delay: 0, n: 0 });
      if (J.lastF != null && f > J.lastF) J.step = Math.min(30, f - J.lastF);
      J.lastF = f;
      J.offs.push(now - (f * 1000) / 60);
      if (J.offs.length > 64) J.offs.shift();
      if (++J.n % 4 || J.offs.length < 8) return;
      const min = Math.min(...J.offs), sorted = J.offs.map((o) => o - min).sort((a, b) => a - b);
      const spread = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * (N().jitterPct || 0.95)))] / 1000;
      const want = Math.min(N().interpMax || 0.3, spread + J.step / 60 + (N().jitterPad || 0));
      J.delay = want > J.delay ? want : J.delay + (want - J.delay) * 0.05;
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
