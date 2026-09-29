/* Online — phiên PvP 1:1: phòng chờ, vòng lặp host (mô phỏng + gửi snapshot), vòng lặp khách (gửi phím + vẽ).
 * Host luôn là đội 0 (bên trái), khách là đội 1 (bên phải).
 *
 * Gói tin:
 *   khách -> host : hello{v,pf} · pf{pf} (đổi vị trí / đồng đội) · intro (xem xong màn giới thiệu) ·
 *                   i{d,p} (phím) · pick{i} · reroll · bye
 *   host  -> khách: lobby{hp} · start{opts} · s{f,s,fx,sfx,ev} (snapshot) · toLobby · full · bye
 *   pf / hp = hồ sơ trận công khai — xem SFC.Profile.matchPublic(): tên, level, ngoại hình, Core đã mở,
 *             vị trí + chỉ số / OVR của character, đồng đội đang chọn (Mates.spec)
 *
 * Luật trận giống Main Path: mỗi người đá cho CLB riêng (mainPath.playerTeam — không chọn đội; host áo nhà, khách áo
 * sân khách), chỉ điều khiển character của mình (vị trí tự chọn), đồng đội đang chọn
 * (NHÂN VẬT > TEAM) do AI đá vị trí còn lại, bốc Core trong deck riêng; character bốc Core trong bộ đã mở khoá.
 */
window.SFC = window.SFC || {};

(function () {
  const N = () => SFC_CONFIG.net;
  const Net = () => SFC.Net;
  const Sync = () => SFC.Sync;
  // CLB của 2 người trong trận online (đăng ký vào teams.list lúc vào trận — Online.registerClubs)
  const CLUBS = ['online_p1', 'online_p2'];

  const Online = {
    role: null,          // 'host' | 'guest'
    status: 'idle',      // idle | busy | lobby | playing
    code: null,
    lobby: { guestIn: false, hostPf: null, guestPf: null },
    game: null,          // host: trận thật · khách: trận "gương"
    overlay: false,      // đang mở menu trong trận (không tạm dừng)

    get active() { return this.status !== 'idle'; },
    get isHost() { return this.role === 'host'; },

    /* ================= PHÒNG ================= */
    createRoom() {
      if (this.status === 'busy') return;
      this.status = 'busy';
      SFC.Menu.go('online', 'Creating room...');
      Net().on(this.handlers());
      Net().host().then((code) => {
        this.role = 'host';
        this.code = code;
        this.lobby = { guestIn: false, hostPf: this.myPf(), guestPf: null };
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
        this.lobby = { guestIn: true, hostPf: null, guestPf: this.myPf() };
        this.status = 'lobby';
        Net().send({ t: 'hello', v: N().protocol, pf: this.lobby.guestPf });
        SFC.Menu.go('lobby', 'Waiting for room info...');
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
      this.lobby = { guestIn: false, hostPf: null, guestPf: null };
      this.buf = []; this.remote = null;
      this.myIntro = this.peerIntro = false; this.introLeft = 0;
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
        this.lobby.guestIn = false; this.lobby.guestPf = null;
        this.status = 'lobby'; this.game = null; this.overlay = false; this.introLeft = 0;
        if (wasPlaying) SFC.Menu.app.toMenu('lobby');
        SFC.Menu.go('lobby', 'Your opponent left the room.', true);
      } else {
        const code = this.code;
        Net().close();
        this.reset();
        SFC.Menu.app.toMenu('online');
        SFC.Menu.setMsg(`Host ${code || ''} closed the room.`, true);
      }
    },

    // CLB riêng của người chơi (mainPath.playerTeam): tên theo character, chỉ số đội trung tính; t = 0 host (áo nhà) / 1 khách (áo sân khách)
    club(t, name) {
      const P = SFC_CONFIG.mainPath.playerTeam;
      name = name || 'PLAYER';
      return Object.assign({}, SFC_CONFIG.teams.list[P.id], {
        name: P.nameFormat.replace('{name}', name),
        short: name.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || 'P' + (t + 1),
        tagline: t ? 'GUEST CLUB' : 'HOST CLUB',
        kit: t ? P.awayKit : P.kit,
      });
    },
    // đăng ký 2 CLB vào teams.list trước khi dựng trận (host + khách đều gọi, cùng tên -> cùng dữ liệu)
    registerClubs(names) {
      CLUBS.forEach((id, t) => { SFC_CONFIG.teams.list[id] = this.club(t, names[t]); });
      return CLUBS;
    },

    // hồ sơ trận của người chơi tại máy này: vị trí đang chọn (menu sel.ctrl, dùng chung Main Path) + đồng đội đang chọn
    myPf() {
      const app = SFC.Menu.app, roles = SFC_CONFIG.game.roles;
      const idx = app.sel.ctrl ? app.sel.ctrl - 1 : roles.indexOf('FWD');
      return SFC.Profile.matchPublic(roles[idx], app.mateSpec(idx));
    },

    // đổi vị trí / đồng đội trong phòng chờ -> báo máy kia
    updatePf() {
      const pf = this.myPf();
      if (this.isHost) { this.lobby.hostPf = pf; this.sendLobby(); }
      else { this.lobby.guestPf = pf; Net().send({ t: 'pf', pf }); }
      SFC.Menu.render();
    },

    sendLobby() {
      Net().send({ t: 'lobby', hp: this.lobby.hostPf });
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
          L.guestPf = SFC.Profile.sanitizePublic(m.pf);
          L.hostPf = this.myPf();
          this.sendLobby();
          SFC.Menu.go('lobby', 'Your opponent joined!');
          SFC.Audio.pick();
          break;
        case 'pf':
          if (this.status !== 'lobby') return;
          L.guestPf = SFC.Profile.sanitizePublic(m.pf);
          SFC.Menu.render();
          break;
        case 'intro':
          this.peerIntro = false;
          break;
        case 'i':
          if (this.remote) this.remote.receive(m.d, m.p);
          break;
        case 'pick':
          if (this.game) this.game.pickCore(m.i | 0, 1);
          break;
        case 'reroll':
          if (this.game) this.game.rerollDraft(1);
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
          this.lobby.guestIn = true;
          this.lobby.hostPf = SFC.Profile.sanitizePublic(m.hp);
          if (this.status === 'playing') {
            this.status = 'lobby'; this.game = null; SFC.Menu.app.toMenu('lobby');
            // sau trận có thể đã lên level / đổi chỉ số -> gửi lại hồ sơ trận
            Net().send({ t: 'pf', pf: (this.lobby.guestPf = this.myPf()) });
          }
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
      if (!this.isHost || !L.guestIn) return;
      const roles = SFC_CONFIG.game.roles;
      const pfs = [(L.hostPf = this.myPf()), L.guestPf || SFC.Profile.sanitizePublic({})];
      const opts = {
        online: true, difficulty: N().difficulty, mateDifficulty: SFC_CONFIG.mainPath.teammate,
        humanTeam: 0, humans: [0, 1], draftTimeLimit: N().draftTimeLimit,
        // như Main Path: mỗi người chỉ điều khiển character của mình ở vị trí đã chọn, không đổi người
        solo: pfs.map((pf) => Math.max(0, roles.indexOf(pf.role || 'FWD'))),
        // character (ngoại hình + vị trí + chỉ số riêng) của mỗi người
        avatars: pfs.map((pf) => Object.assign({}, pf, { role: pf.role || 'FWD', mate: undefined })),
        // đồng đội đang chọn của mỗi người: AI đá vị trí còn lại, bốc Core trong deck riêng
        mates: pfs.map((pf) => pf.mate || null),
        // character chỉ bốc Core đã mở khoá (bộ có sẵn + Main Path)
        coreUnlocks: pfs.map((pf) => pf.cores || null),
        arena: this.pickArena(),
      };
      [opts.home, opts.away] = this.registerClubs(pfs.map((pf) => pf.name));
      this.game = new SFC.Game(opts);
      Sync().capture(this.game);
      this.remote = new (Sync().RemoteInput)();
      this.frame = 0;
      this.status = 'playing';
      // màn giới thiệu 2 đội: trận đứng yên tới khi 2 máy xem xong (hoặc quá giờ chờ)
      this.holdIntro(SFC.Intro.wants(opts));
      Net().send({ t: 'start', opts });
      SFC.Menu.app.enterOnline(this.game);
    },

    guestStart(m) {
      const o = m.opts || {};
      const avatars = (o.avatars || []).map((a) => SFC.Profile.sanitizePublic(a));
      const [home, away] = this.registerClubs(avatars.map((a) => a && a.name));
      // trận "gương": cùng đội hình / character như host, nhưng góc nhìn đội 1
      this.game = new SFC.Game({
        home, away, online: true, humanTeam: 1, humans: [0, 1], difficulty: N().difficulty, mateDifficulty: o.mateDifficulty,
        draftTimeLimit: o.draftTimeLimit, solo: o.solo, coreUnlocks: o.coreUnlocks,
        avatars,
        mates: (o.mates || []).map((m) => SFC.Profile.sanitizeMate(m)),
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

    // sân online: ngẫu nhiên trong các sân Area chủ phòng đã tới (Area chưa mở không lộ ra)
    pickArena() {
      const MP = SFC.MainPath, areas = MP.areas(), best = Math.min(areas.length - 1, Math.floor(MP.state.best / MP.nDiv()));
      const list = areas.slice(0, best + 1).map((a) => a.arena).filter((id) => SFC_CONFIG.arenas[id]);
      return list.length ? SFC.U.pick(list) : undefined;
    },

    /* ---------- màn giới thiệu 2 đội (config/intro.config.js, mode 'online') ---------- */
    // host: giữ trận tới khi cả 2 máy xem xong; quá duration + outro + onlineWait giây thì chạy luôn
    holdIntro(on) {
      const I = SFC_CONFIG.intro;
      this.myIntro = on; this.peerIntro = on;
      this.introLeft = on ? I.duration + I.outro + (I.onlineWait || 4) : 0;
    },
    get introHold() { return this.isHost && (this.myIntro || this.peerIntro) && this.introLeft > 0; },

    // máy này xem xong màn giới thiệu (main.js beginMatch)
    introDone() {
      if (!this.isHost) { Net().send({ t: 'intro' }); return; }
      this.myIntro = false;
      if (this.introHold) SFC.UI.banner('GET READY', 'Waiting for your opponent...', '#9aa3b5', 1.4);
    },

    backToLobby() {
      if (!this.isHost) return;
      this.status = 'lobby';
      this.game = null;
      this.overlay = false;
      this.lobby.hostPf = this.myPf();
      this.sendLobby();
      SFC.Menu.app.toMenu('lobby');
    },

    /* ================= VÒNG LẶP (60 bước/giây) ================= */
    tick(dt, input) {
      const g = this.game;
      if (!g) return;
      // màn giới thiệu đang chiếu / host đang chờ máy kia xem xong: trận đứng yên (không mô phỏng, không gửi snapshot)
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
      if (this.isHost) { g.pickCore(i, 0); return; }
      if (g.draft.localPick != null) return;
      g.draft.localPick = i;
      g.draft.picked[g.humanTeam] = 1;
      Net().send({ t: 'pick', i });
    },

    // người chơi tại máy này đổi 3 lá Core
    reroll() {
      const g = this.game;
      if (!g || !g.draft) return;
      if (this.isHost) { g.rerollDraft(0); return; }
      if (g.draft.localPick != null) return;
      Net().send({ t: 'reroll' });
    },
  };

  SFC.Online = Online;
})();
