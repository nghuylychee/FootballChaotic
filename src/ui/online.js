/* OnlineUI — giao diện của chế độ online: nghe sự kiện của SFC.Session (src/net/session.js) rồi quyết định trang menu, chữ báo,
 * banner, âm thanh; điều phối phím trong trận online (menu tạm dừng, chọn Core, màn kết quả, màn giới thiệu).
 * Sửa giao diện online ở đây (hoặc menu.js / ui.js) thoải mái: session.js không biết gì về UI, chỉ phát sự kiện + mã lý do.
 * Quy tắc: chữ hiển thị KHÔNG được lộ cách kết nối (máy chủ riêng / người chơi làm host / Steam / PeerJS) —
 * server/test/client-test.js kiểm mọi chữ người chơi thấy.
 * main.js gọi OnlineUI.tick / view khi đang ở chế độ online.
 */
window.SFC = window.SFC || {};

(function () {
  const O = () => SFC.Session;
  const Menu = () => SFC.Menu;
  const app = () => SFC.Menu.app;
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
  };

  /* ================= DỮ LIỆU GAME CHO PHÒNG ================= */
  O().provide({
    // hồ sơ trận: vị trí character đang chọn (app.myRole, dùng chung Main Path) + đồng đội đang chọn (đá vị trí còn lại)
    profile() {
      const R = ROLES();
      let idx = R.indexOf(app().myRole());
      if (idx < 0) idx = Math.max(0, R.indexOf('FWD'));
      return SFC.Profile.matchPublic(R[idx], app().mateSpec(idx));
    },
    // Area cao nhất đã tới (Area chưa mở không lộ ra): chủ phòng chọn đội bot / sân theo đây
    area() {
      const MP = SFC.MainPath;
      return Math.min(MP.areas().length - 1, MP.state.best);
    },
    // Main Path hiện tại (tìm trận xếp hạng + opts.mainPath): thưởng theo Area của mình như MainPath.matchmake
    rank() {
      const st = SFC.MainPath.state;
      return { area: st.area, elo: st.elo, reward: SFC.MainPath.area(st.area).reward };
    },
  });

  /* ================= SỰ KIỆN ONLINE -> GIAO DIỆN ================= */
  const on = (name, fn) => O().on(name, fn);

  on('busy', ({ action, code }) => {
    if (action === 'create') Menu().go('online', TEXT.creating);
    else Menu().setMsg(TEXT.connecting(code));
  });
  on('waiting', ({ action, code }) => Menu().setMsg((action === 'create' ? TEXT.creating : TEXT.connecting(code)) + TEXT.cancelHint()));

  on('lobby', ({ entered, pending }) => {
    if (entered) { Menu().go('lobby', pending ? TEXT.waitingInfo : ''); return; }
    // nhận được danh sách phòng: bỏ chữ "đang chờ", giữ các chữ báo khác
    if (Menu().page === 'lobby' && Menu().msg === TEXT.waitingInfo) Menu().go('lobby', '');
    else Menu().render();
  });
  on('notice', ({ kind, name }) => {
    if (kind === 'joined') { Menu().go('lobby', TEXT.joined(name)); SFC.Audio.pick(); }
    else Menu().go('lobby', TEXT.left(name), true);
  });
  // nhảy slot -> vị trí character theo slot (menu Main Path cũng nhớ vị trí này)
  on('role', ({ role }) => {
    const i = ROLES().indexOf(role);
    if (i >= 0) app().sel.ctrl = i + 1;
  });

  // tìm trận xếp hạng: ghép được -> MATCH FOUND trên phòng chờ PLAY (menu.js) rồi mới vào trận; không -> người chơi giả
  on('solo', () => Menu().searchSolo());
  on('start', ({ game, resume }) => {
    OnlineUI.overlay = false;
    if (O().ranked && !resume) { Menu().searchFound(game); return; }
    app().enterOnline(game);
    if (resume) banner('RECONNECTED', 'Back in the match', GREEN, 1.4);
  });
  on('toLobby', () => { OnlineUI.overlay = false; app().toMenu('lobby'); });
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
    app().toMenu(from === 'join' && reason !== 'left' ? 'join' : 'online');
    if (reason !== 'left') Menu().setMsg(OnlineUI.reasonText(reason), true);
  });

  SFC.OnlineUI = OnlineUI;
})();
