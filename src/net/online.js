/* Online — phiên PvP 1:1: phòng chờ, vòng lặp host (mô phỏng + gửi snapshot), vòng lặp khách (gửi phím + vẽ).
 * Host luôn là đội 0 (bên trái), khách là đội 1 (bên phải).
 *
 * Gói tin:
 *   khách -> host : hello{v} · team{id} · i{d,p} (phím) · pick{i} · bye
 *   host  -> khách: lobby{host,guest} · start{home,away} · s{f,s,fx,sfx,ev} (snapshot) · toLobby · full · bye
 */
window.SFC = window.SFC || {};

(function () {
  const N = () => SFC_CONFIG.net;
  const Net = () => SFC.Net;
  const Sync = () => SFC.Sync;
  const TEAMS = () => SFC_CONFIG.teams.order;

  const Online = {
    role: null,          // 'host' | 'guest'
    status: 'idle',      // idle | busy | lobby | playing
    code: null,
    lobby: { host: null, guest: null, guestIn: false },
    game: null,          // host: trận thật · khách: trận "gương"
    overlay: false,      // đang mở menu trong trận (không tạm dừng)

    get active() { return this.status !== 'idle'; },
    get isHost() { return this.role === 'host'; },

    /* ================= PHÒNG ================= */
    createRoom() {
      if (this.status === 'busy') return;
      this.status = 'busy';
      SFC.Menu.go('online', 'Đang tạo phòng...');
      Net().on(this.handlers());
      Net().host().then((code) => {
        this.role = 'host';
        this.code = code;
        const first = TEAMS()[SFC.Menu.app.sel.team] || TEAMS()[0];
        this.lobby = { host: first, guest: null, guestIn: false };
        this.status = 'lobby';
        SFC.Menu.go('lobby');
      }).catch((e) => this.fail(e));
    },

    joinRoom(code) {
      if (this.status === 'busy') return;
      this.status = 'busy';
      SFC.Menu.setMsg('Đang kết nối tới phòng ' + code + '...');
      Net().on(this.handlers());
      Net().join(code).then(() => {
        this.role = 'guest';
        this.code = code;
        this.lobby = { host: null, guest: null, guestIn: true };
        this.status = 'lobby';
        Net().send({ t: 'hello', v: N().protocol });
        SFC.Menu.go('lobby', 'Đang chờ thông tin phòng...');
      }).catch((e) => this.fail(e, 'join'));
    },

    fail(e, page = 'online') {
      this.reset();
      SFC.Menu.go(page, Net().message(e), true);
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
      this.lobby = { host: null, guest: null, guestIn: false };
      this.buf = []; this.remote = null;
    },

    handlers() {
      return {
        open: () => { /* host: chờ gói hello của khách */ },
        data: (m) => this.onData(m),
        close: () => this.onPeerGone(),
        error: (e) => { if (this.status === 'playing' || this.status === 'lobby') console.warn('[net]', e); },
      };
    },

    onPeerGone() {
      if (this.status === 'idle') return;
      if (this.isHost) {
        // khách rời: host về phòng chờ, phòng vẫn mở cho người khác vào
        const wasPlaying = this.status === 'playing';
        this.lobby.guest = null; this.lobby.guestIn = false;
        this.status = 'lobby'; this.game = null; this.overlay = false;
        if (wasPlaying) SFC.Menu.app.toMenu('lobby');
        SFC.Menu.go('lobby', 'Đối thủ đã rời phòng.', true);
      } else {
        const code = this.code;
        Net().close();
        this.reset();
        SFC.Menu.app.toMenu('online');
        SFC.Menu.setMsg(`Chủ phòng ${code || ''} đã đóng phòng.`, true);
      }
    },

    setTeam(delta) {
      const order = TEAMS(), L = this.lobby;
      const mine = this.isHost ? L.host : L.guest, other = this.isHost ? L.guest : L.host;
      if (!mine) return;
      let i = order.indexOf(mine);
      do { i = (i + delta + order.length) % order.length; } while (order[i] === other);
      if (this.isHost) { L.host = order[i]; this.sendLobby(); }
      else { L.guest = order[i]; Net().send({ t: 'team', id: order[i] }); }
      SFC.Menu.render();
    },

    sendLobby() {
      Net().send({ t: 'lobby', host: this.lobby.host, guest: this.lobby.guest });
    },

    onData(m) {
      if (!m || !m.t) return;
      if (this.isHost) return this.hostData(m);
      return this.guestData(m);
    },

    hostData(m) {
      const L = this.lobby;
      switch (m.t) {
        case 'hello':
          if (m.v !== N().protocol) { Net().send({ t: 'version' }); setTimeout(() => Net().dropConn(), 300); return; }
          L.guestIn = true;
          L.guest = TEAMS().find((t) => t !== L.host);
          this.sendLobby();
          SFC.Menu.go('lobby', 'Đối thủ đã vào phòng!');
          SFC.Audio.pick();
          break;
        case 'team':
          if (this.status !== 'lobby' || !TEAMS().includes(m.id) || m.id === L.host) { this.sendLobby(); return; }
          L.guest = m.id;
          this.sendLobby();
          SFC.Menu.render();
          break;
        case 'i':
          if (this.remote) this.remote.receive(m.d, m.p);
          break;
        case 'pick':
          if (this.game) this.game.pickCore(m.i | 0, 1);
          break;
        case 'bye':
          Net().dropConn();
          this.onPeerGone();
          break;
      }
    },

    guestData(m) {
      switch (m.t) {
        case 'lobby':
          this.lobby.host = m.host; this.lobby.guest = m.guest; this.lobby.guestIn = true;
          if (this.status === 'playing') { this.status = 'lobby'; this.game = null; SFC.Menu.app.toMenu('lobby'); }
          if (SFC.Menu.page === 'lobby') SFC.Menu.go('lobby');
          break;
        case 'start': this.guestStart(m); break;
        case 's': if (this.status === 'playing') this.buf.push(m); break;
        case 'full': this.fail({ type: 'full' }, 'join'); break;
        case 'version': this.fail({ type: 'version' }, 'join'); break;
        case 'bye': Net().close(); this.onPeerGone(); break;
      }
    },

    /* ================= VÀO TRẬN ================= */
    startMatch() {
      const L = this.lobby;
      if (!this.isHost || !L.guestIn || !L.guest) return;
      const opts = {
        home: L.host, away: L.guest, difficulty: N().difficulty,
        humanTeam: 0, humans: [0, 1], draftTimeLimit: N().draftTimeLimit,
      };
      this.game = new SFC.Game(opts);
      Sync().capture(this.game);
      this.remote = new (Sync().RemoteInput)();
      this.frame = 0;
      this.status = 'playing';
      Net().send({ t: 'start', home: L.host, away: L.guest });
      SFC.Menu.app.enterOnline(this.game);
    },

    guestStart(m) {
      this.game = new SFC.Game({ home: m.home, away: m.away, humanTeam: 1, humans: [0, 1], difficulty: N().difficulty });
      this.game.events.length = 0;
      this.buf = [];
      this.renderF = null;
      this.lastTick = null;
      this.pressedMask = 0;
      this.sentDown = -1;
      this.status = 'playing';
      SFC.Menu.app.enterOnline(this.game);
    },

    backToLobby() {
      if (!this.isHost) return;
      this.status = 'lobby';
      this.game = null;
      this.overlay = false;
      this.sendLobby();
      SFC.Menu.app.toMenu('lobby');
    },

    /* ================= VÒNG LẶP (60 bước/giây) ================= */
    tick(dt, input) {
      const g = this.game;
      if (!g) return;
      if (input.wasPressed('pause') && g.state !== 'ended') {
        this.overlay ? SFC.Menu.app.resume() : SFC.Menu.app.pause();
        return;
      }
      if (this.overlay) SFC.UI.pauseInput(input);
      else if (g.state === 'draft') SFC.UI.draftInput(input, g);
      else if (g.state === 'ended') SFC.UI.endInput(input);
      const play = this.overlay || g.state === 'draft' || g.state === 'ended' ? Sync().NULL_INPUT : input;
      if (this.isHost) this.hostTick(dt, g, play);
      else this.guestTick(play);
    },

    hostTick(dt, g, local) {
      this.remote.beginFrame();
      if (g.state !== 'ended') g.update(dt, [local, this.remote]);
      this.remote.endFrame();
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
      if (this.isHost) { g.pickCore(i, 0); return; }
      if (g.draft.localPick != null) return;
      g.draft.localPick = i;
      g.draft.picked[g.humanTeam] = 1;
      Net().send({ t: 'pick', i });
    },
  };

  SFC.Online = Online;
})();
