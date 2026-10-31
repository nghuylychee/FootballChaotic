/* OnlineUI — giao diện của chế độ online: nghe sự kiện của SFC.Session (src/net/session.js) rồi quyết định trang menu, chữ báo,
 * banner, âm thanh; điều phối phím trong trận online (menu tạm dừng, chọn Core, màn kết quả, màn giới thiệu).
 * Sửa giao diện online ở đây (hoặc menu.js / matchui.js và các file gắn vào SFC.UI) thoải mái: session.js không biết gì về UI, chỉ phát sự kiện + mã lý do.
 * Quy tắc: chữ hiển thị KHÔNG được lộ cách kết nối (máy chủ riêng / người chơi làm host / Steam / PeerJS) —
 * server/test/client-test.js kiểm mọi chữ người chơi thấy.
 * main.js gọi OnlineUI.tick / view khi đang ở chế độ online.
 */
window.SFC = window.SFC || {};

(function () {
  const O = () => SFC.Session;
  const Menu = () => SFC.Menu;
  const app = () => SFC.Menu && SFC.Menu.app;
  const ROLES = () => SFC_CONFIG.game.roles;
  // phím "quay lại" để hiện trong chữ báo (tay cầm / bàn phím)
  const backKey = () => (SFC.Input && SFC.Input.key ? SFC.Input.key('back', 'Esc') : 'Esc');

  /* ---------- chữ hiển thị ---------- */
  const TEXT = {
    creating: 'Creating room...',
    connecting: (code) => `Connecting to room ${code}...`,
    cancelHint: () => ` · ${backKey()} cancel`,
    waitingInfo: 'Waiting for room info...',
    joined: (name) => `${name} joined!`,
    left: (name) => `${name} left the room.`,
  };
  // closed{reason} -> chữ báo (left = tự rời: không báo gì)
  const CANT_CONNECT = 'Could not connect to online play. Check your connection and try again.';
  const REASONS = {
    closed: 'The room was closed.',
    lost: 'Lost connection to the room.',
    cancelled: 'Cancelled.',
    'not-found': 'Room not found. Check the code.',
    full: 'The room is full.',
    started: 'The match has already started. Try again when the room is back in the lobby.',
    version: 'This room is on a different game version. Update the game and try again.',
    busy: 'Online play is busy right now. Try again in a minute.',
    expired: 'You were away too long and the match moved on without you.',
    'rejoin-failed': 'Lost connection and could not rejoin the match.',
    unsupported: 'This browser does not support online play.',
    'in-use': 'That room code is already in use.',
    connect: CANT_CONNECT,
  };
  const banner = (title, sub, color, t) => SFC.UI.banner(title, sub, color, t);
  const GREY = '#9aa3b5', GREEN = '#7dff9a', RED = '#ff6b6b';

  const OnlineUI = {
    overlay: false,      // đang mở menu trong trận online (trận không tạm dừng)
    TEXT, REASONS,
    reasonText(reason) { return REASONS[reason] || CANT_CONNECT; },

    /* ================= VÒNG LẶP (main.js, 60 bước/giây) ================= */
    tick(dt, input) {
      const on = O(), g = on.game || this.finished();
      if (!g) return;
      // màn giới thiệu đang chiếu / máy làm host chờ người khác xem xong: trận đứng yên
      if (app().screen === 'intro') { SFC.Intro.update(dt, input); on.clock(dt); return; }
      if (on.holding) { on.clock(dt); return; }
      if (input.wasPressed('pause') && g.state !== 'ended') {
        this.overlay ? app().resume() : app().pause();
        on.clock(dt);
        return;
      }
      // xét trước khi menu xử lý phím: nút đóng menu (B) không lọt vào trận thành chuyền bổng / đá bay
      const play = this.overlay || g.state === 'draft' || g.state === 'ended' ? on.NO_INPUT : input;
      if (this.overlay) SFC.UI.pauseInput(input);
      else if (g.state === 'draft') SFC.UI.draftInput(input, g);
      // màn kết quả (trận xếp hạng có thêm màn mở thẻ phần thưởng + LEVEL UP của DRILL như chơi đơn)
      else if (g.state === 'ended') {
        if (SFC.Drill.active) SFC.Drill.update(dt, input);
        else if (SFC.Reveal.active) SFC.Reveal.update(dt, input);
        else SFC.UI.endInput(input);
      }
      if (!on.game) return;   // vừa rời trận (FORFEIT / NEXT MATCH / LOBBY)
      on.tick(dt, play);
      // máy làm host: sự kiện trận (bàn thắng, banner...) sinh ra ở bước vừa chạy
      if (on.isHost && on.game) SFC.UI.consume(on.game);
    },

    // mỗi khung hình (trước khi vẽ) -> trận cần vẽ
    view(now) {
      const on = O(), g = on.view(now);
      if (g && !on.isHost) SFC.UI.consume(g);
      return g || this.finished();
    },

    // trận xếp hạng đã hết mà phòng đã đóng (Session không còn trận): vẫn ở màn kết quả tới khi người chơi chọn NEXT MATCH / LOBBY
    finished() {
      const g = app().game;
      return app().mode === 'online' && g && g.opts.mainPath && g.state === 'ended' ? g : null;
    },

    /* ================= MỜI BẠN BÈ ================= */
    inviteCode: null,    // lời mời đã nhận ở ngoài game, chờ lúc vào được (Session 'invite')
    instant: false,      // mở game để chơi cùng nhóm ngay (Platform.instant, CrazyGames): rảnh ở menu là tạo phòng riêng
    // đang trên đường vào phòng của bạn bè / tạo phòng cho nhóm: người chơi mới bỏ qua PROLOGUE lần này (main.js, menu.js submitName)
    get joining() { return !!this.inviteCode || this.instant; },

    // nút INVITE FRIENDS (phòng chờ PRIVATE MATCH + phòng Story): dialog = bảng mời của nền tảng · link = chép link mời
    invite(menu) {
      const mode = O().inviteMode;
      O().invite().then((r) => {
        if (r === 'copied') menu.setMsg(SFC.t('Invite link copied. Send it to your friends.'));
        else if (r) menu.render();
        else if (mode === 'link') menu.setMsg(SFC.t('Could not copy the invite link. Share the room code instead.'), true);
        else menu.setMsg(SFC.t('Could not open your friend list. Share the room code instead.'), true);
      });
    },

    // vào phòng được mời khi đang rảnh ở menu: hết trận / cut scene / màn giới thiệu, đã đặt tên, không mở popup ngôn ngữ
    // (người chơi mới được mời thì bỏ qua PROLOGUE: xem joining). Đang tìm trận / ở phòng khác: bỏ tìm / rời phòng trước,
    // lượt sau (Session đã idle, kết nối cũ đã đóng) mới vào. Không có lời mời mà đang instant: tạo phòng riêng cho nhóm
    tryInvite() {
      const code = this.inviteCode;
      if ((!code && !this.instant) || !SFC.Menu) return;
      const a = app(), M = Menu(), on = O();
      if (!a || !M.el) return;
      if (a.screen !== 'menu' || M.page === 'name' || !SFC.Profile.hasName || (SFC.LangPick && SFC.LangPick.active)) return;
      if (on.status === 'busy') return;
      if (!code) {
        if (on.active || M.search) { this.instant = false; return; }   // đã tự vào phòng / tìm trận: thôi
        this.instant = false;
        M.go('online');
        on.createRoom({ direct: SFC.Settings.roomDirect });
        return;
      }
      if (on.active && on.code === code) { this.inviteCode = null; return; }   // đã ở trong phòng đó
      if (M.search) { M.cancelSearch(); return; }
      if (on.active) { on.leave(); return; }
      this.inviteCode = null;
      this.instant = false;   // lời mời của bạn bè thắng: vào phòng bạn, không tạo phòng mới
      M.joinFrom = ['story', 'cup', 'slobby'].includes(M.page) ? 'story' : ['run', 'runmap'].includes(M.page) ? 'run' : 'online';
      M.go('join');
      M.code = code;
      on.joinRoom(code);
    },
  };

  /* ================= DỮ LIỆU GAME CHO PHÒNG ================= */
  O().provide({
    // hồ sơ trận: vị trí character = vị trí của slot đang đứng trong phòng (chưa có slot: app.myRole) + đồng đội đang chọn (đá vị trí còn lại)
    profile() {
      const R = ROLES(), me = O().mine;
      let idx = R.indexOf(me && me.slot >= 0 ? O().slotRole(me.slot) : app().myRole());
      if (idx < 0) idx = Math.max(0, R.indexOf('FWD'));
      return SFC.Profile.matchPublic(R[idx], app().mateSpec(idx));
    },
    // Area cao nhất đã tới (Area chưa mở không lộ ra): chủ phòng chọn đội bot / sân theo đây
    area() {
      const MP = SFC.MainPath;
      return Math.min(MP.areas().length - 1, MP.state.best);
    },
    // phòng FOOTBALL STORY (máy giữ cup: host / người tạo phòng trên máy chủ riêng): lượt chơi cup gửi cả phòng (src/meta/cup.js share)
    cup() { return SFC.Cup.share(); },
    // phòng GOAT PATH co-op (máy làm host): cập nhật ví / ô đội hình theo người trong phòng rồi gửi bản sao run (src/meta/run.js share)
    runState() { SFC.RunUI.syncRoom(); return SFC.Run.share(); },
    // khách thao tác trên run -> host áp (uid = mã hồ sơ của khách)
    runAction(id, uid, m) { SFC.RunUI.apply(uid, m); },
    // Main Path hiện tại (tìm trận xếp hạng + opts.mainPath): thưởng theo Area của mình như MainPath.matchmake
    rank() {
      const st = SFC.MainPath.state;
      return { area: st.area, elo: st.elo, reward: SFC.MainPath.area(st.area).reward };
    },
  });

  /* ================= SỰ KIỆN ONLINE -> GIAO DIỆN ================= */
  const on = (name, fn) => O().on(name, fn);

  /* ================= NETWORK STATS (SETTINGS > SOUND & DISPLAY) ================= */
  // Góc dưới trái (thông báo #toasts dời lên trên nó). Mọi trận online (phòng riêng + xếp hạng online): luôn hiện ping. Bật NETWORK STATS: cả dòng đầy đủ (ping + KB/s
  // gửi / nhận + tổng từ lúc vào phòng), cả ở phòng chờ. Trận xếp hạng đá với người giả (offline) không có ping — người dùng chấp nhận
  // điểm khác biệt này (ngoại lệ của luật "không phân biệt được người thật / AI")
  // dưới 1 KB ghi theo byte (gói phím gửi đi chỉ vài chục B/s, ghi KB sẽ luôn là 0.0)
  const size = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : n >= 1024 ? `${(n / 1024).toFixed(1)} KB` : `${Math.round(n)} B`);
  setInterval(() => {
    const el = typeof document !== 'undefined' && document.getElementById('netstats');
    if (!el) return;
    const st = O().status, full = !!(SFC.Settings && SFC.Settings.netStats) && (st === 'lobby' || st === 'playing');
    const show = full || st === 'playing';
    el.classList.toggle('hidden', !show);
    if (!show) return;
    const S = SFC.NetStats;
    S.roll();
    const alias = O().serverAlias;   // máy chủ đang giữ phòng (RS, RO...)
    const ping = `${SFC.t('PING')} ${S.rtt == null ? '--' : Math.round(S.rtt)} ms${alias ? ` · ${alias}` : ''}`;
    el.textContent = full ? `${ping} · ↑ ${size(S.upRate)}/s ↓ ${size(S.downRate)}/s · ↑ ${size(S.up)} ↓ ${size(S.down)}` : ping;
  }, 500);

  // bảng ping cả trận (màn kết quả)
  on('pings', () => { if (SFC.UI.updatePings) SFC.UI.updatePings(); });

  // phòng FOOTBALL STORY: trang phòng chờ riêng ('slobby', src/ui/cup.js) · đang có lượt chơi cup thì màn cup
  const storyPage = () => (SFC.Cup.run ? 'cup' : 'slobby');
  on('busy', ({ action, code, story, run }) => {
    if (action === 'create' && (story || run)) Menu().setMsg(TEXT.creating);
    else if (action === 'create') Menu().go('online', TEXT.creating);
    else Menu().setMsg(TEXT.connecting(code));
  });
  // khách phòng Story: trạng thái cup của host -> bản sao (vào phòng giữa cup: bỏ qua cut scene của các vòng đã đá)
  on('cup', ({ state }) => {
    const r = SFC.Cup.mirror(state);
    if (r.fresh && SFC.Cup.run && SFC.Cup.run.results.length) SFC.CupUI.skipTo();
    if (r.fresh && SFC.Cup.run && !SFC.Cup.run.results.length) SFC.CupUI.reset();
    if (app().screen !== 'menu') return;   // đang trong trận / cut scene: toLobby / cut scene xong tự vẽ lại
    if (!SFC.Cup.run && Menu().page === 'cup') Menu().go('slobby');
    else if (SFC.Cup.run && Menu().page === 'slobby') Menu().go('cup');
    else if (Menu().page === 'cup') Menu().render();
  });
  // host chiếu cut scene trước trận -> khách chiếu cùng (phòng run: cut scene của act)
  on('scenes', ({ kind }) => (kind.startsWith('run:') ? SFC.RunUI.remoteScenes(kind) : SFC.CupUI.remoteScenes(kind)));
  // khách phòng GOAT PATH co-op: bản sao run của host -> vẽ lại map (đang trong trận / cut scene: lúc về menu tự vẽ)
  on('run', ({ state }) => {
    SFC.RunUI.roomRun = true;
    SFC.RunUI.joining = false;
    SFC.Run.mirror(state);
    if (app().screen !== 'menu') return;
    if (Menu().page === 'runmap') Menu().render();
    else if (Menu().page === 'lobby' || Menu().page === 'join' || Menu().page === 'run') Menu().go('runmap', '');
  });
  on('waiting', ({ action, code }) => Menu().setMsg((action === 'create' ? TEXT.creating : TEXT.connecting(code)) + TEXT.cancelHint()));

  on('lobby', ({ entered, pending }) => {
    const O_ = O();
    if (O_.story) SFC.CupUI.roomStory = O_.story;   // nhớ lại lúc phòng đóng (Session đã xoá)
    if (O_.run) SFC.RunUI.roomRun = true;
    // phòng GOAT PATH co-op: host vào phòng với run đang có -> đứng đúng vị trí character trong run; mọi thứ ở màn map
    if (O_.run && O_.isLead && SFC.Run.run) O_.seatHost(SFC.Run.run.squad[0].role);
    // vào phòng từ JOIN trên tab GOAT PATH: ở lại tab tới khi biết loại phòng (gói lobby đầu tiên)
    const RJ = SFC.RunUI && SFC.RunUI.joining;
    if (entered) { Menu().go(O_.story ? storyPage() : O_.run ? 'runmap' : RJ ? 'run' : 'lobby', pending ? TEXT.waitingInfo : ''); return; }
    if (RJ && O_.lobby.members.length && !O_.run) { SFC.RunUI.joining = false; Menu().go(O_.story ? storyPage() : 'lobby', ''); return; }
    if (O_.run) { if (app().screen === 'menu') Menu().go('runmap', Menu().msg === TEXT.waitingInfo ? '' : Menu().msg, Menu().msgErr); return; }
    // khách vừa biết đây là phòng Story (gói lobby đầu tiên): sang trang phòng Story
    if (O_.story && Menu().page === 'lobby') { Menu().go(storyPage(), ''); return; }
    // nhận được danh sách phòng: bỏ chữ "đang chờ", giữ các chữ báo khác
    if (Menu().msg === TEXT.waitingInfo && (Menu().page === 'lobby' || Menu().page === 'slobby' || Menu().page === 'cup')) Menu().go(Menu().page, '');
    else if (app().screen === 'menu') Menu().render();
  });
  on('notice', ({ kind, name }) => {
    // phòng Story: báo ở trang đang mở (phòng chờ / màn cup), không đổi trang · phòng run: màn map
    const page = O().story ? (Menu().page === 'cup' || Menu().page === 'slobby' ? Menu().page : storyPage()) : O().run ? 'runmap' : 'lobby';
    if (kind === 'joined') { if (app().screen === 'menu') Menu().go(page, TEXT.joined(name)); SFC.Audio.pick(); }
    else if (app().screen === 'menu') Menu().go(page, TEXT.left(name), true);
  });
  // nhảy slot -> vị trí character theo slot (menu Main Path cũng nhớ vị trí này)
  on('role', ({ role }) => {
    const i = ROLES().indexOf(role);
    if (i >= 0) app().sel.ctrl = i + 1;
  });

  // bạn bè mời (nhận lời ở ngoài game): đang đá -> báo sẽ vào sau trận; vào ngay khi rảnh (tryInvite, kiểm lại mỗi 0.5 giây)
  on('invite', ({ code }) => {
    if (SFC.Platform ? !SFC.Platform.privateMatch : SFC_DEMO) return;   // bản DEMO khoá phòng riêng (tuỳ nền tảng)
    OnlineUI.inviteCode = code;
    const sc = app() && app().screen;
    if (sc === 'game' || sc === 'pause') banner(SFC.t('INVITE ACCEPTED'), SFC.t('Joining after this match'), GREEN, 1.8);
    OnlineUI.tryInvite();
  });
  setInterval(() => OnlineUI.tryInvite(), 500);
  O().watchInvites();

  // tìm trận xếp hạng: ghép được -> MATCH FOUND trên phòng chờ PLAY (menu.js) rồi mới vào trận; không -> người chơi giả
  on('solo', () => Menu().searchSolo());
  on('start', ({ game, resume }) => {
    OnlineUI.overlay = false;
    if (SFC.Story && SFC.Story.active) SFC.Story.abort();   // phòng Story: khách còn đang xem cut scene thì vào trận luôn
    if (O().ranked && !resume) { Menu().searchFound(game); return; }
    app().enterOnline(game);
    if (resume) banner('RECONNECTED', 'Back in the match', GREEN, 1.4);
  });
  on('toLobby', () => { OnlineUI.overlay = false; app().toMenu(O().story ? storyPage() : O().run ? 'runmap' : 'lobby'); });
  on('getReady', () => banner('GET READY', 'Waiting for other players...', GREY, 1.4));
  on('reconnecting', () => banner('CONNECTION LOST', 'Reconnecting...', RED, 2));
  on('player', ({ kind, name }) => {
    if (O().ranked) return;   // trận xếp hạng: như trận với người chơi giả, không báo ai rời / vào lại (AI đá thay)
    name = name || 'A PLAYER';
    if (kind === 'away') banner(`${name} DISCONNECTED`, 'AI plays until they reconnect', GREY, 1.6);
    else if (kind === 'left') banner(`${name} LEFT`, 'AI takes over', GREY, 1.6);
    else banner(`${name} RECONNECTED`, 'Back in control', GREEN, 1.4);
  });
  // chủ phòng đổi khi đang ở màn kết quả: hiện / ẩn nút BACK TO LOBBY
  on('owner', () => { const g = O().game; if (g && g.state === 'ended') SFC.UI.renderEndItems(); });

  on('closed', ({ reason, from, ranked }) => {
    OnlineUI.overlay = false;
    if (ranked) {
      // tự rời (NEXT MATCH / LOBBY / FORFEIT: nơi gọi tự chuyển trang) · đã hết trận: ở lại màn kết quả
      const g = app().game;
      if (reason === 'left' || !g || app().mode !== 'online' || g.state === 'ended') return;
      // mất kết nối hẳn giữa trận: tính thua như FORFEIT
      app().forfeit();
      return;
    }
    // phòng GOAT PATH co-op: khách thôi xem bản sao (run riêng của máy này còn nguyên), host giữ run để chơi tiếp một mình -> về tab GOAT PATH
    const RU = SFC.RunUI;
    // vào phòng từ JOIN trên tab GOAT PATH không được: ở lại tab, giữ ô mã để gõ lại
    if (RU && RU.joining && !RU.roomRun) {
      RU.joining = from === 'join' && reason !== 'left';
      app().toMenu('run');
      if (reason !== 'left') Menu().setMsg(OnlineUI.reasonText(reason), true);
      return;
    }
    if (RU && RU.roomRun) {
      RU.roomRun = false;
      RU.joining = false;
      if (!SFC.Run.mirrorOn && SFC.Run.run) { SFC.Run.syncRoom([]); SFC.Profile.save(); }   // host: khách đi hết, run chơi tiếp một mình
      SFC.Run.leaveMirror();
      RU.reset();
      app().toMenu(from === 'join' && reason !== 'left' ? 'join' : 'run');
      if (reason !== 'left') Menu().setMsg(OnlineUI.reasonText(reason), true);
      return;
    }
    // phòng Story: hết phòng = hết cup (lượt chơi nằm ở máy làm host) -> về tab FOOTBALL STORY
    const CU = SFC.CupUI || {}, story = CU.roomStory;
    CU.roomStory = null;
    if (story) { SFC.Cup.abort(); CU.reset(); }
    app().toMenu(story && reason === 'left' ? 'story' : from === 'join' && reason !== 'left' ? 'join' : story ? 'story' : 'online');
    if (reason !== 'left') Menu().setMsg(OnlineUI.reasonText(reason), true);
  });

  SFC.OnlineUI = OnlineUI;
})();
