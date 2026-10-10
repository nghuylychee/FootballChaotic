/* Main — khởi tạo, vòng lặp fixed-timestep, điều hướng màn hình */
(function () {
  const C = SFC_CONFIG.game;
  const Input = SFC.Input;
  const STEP = 1 / 60;

  const app = {
    screen: 'menu',     // menu | game | pause | intro | story (cut scene PROLOGUE)
    mode: 'single',     // single | online
    game: null,
    demo: null,
    // ctrl: i > 0 = chỉ điều khiển cầu thủ thứ i - 1 (character của bạn), mặc định ĐÁ CAO.
    // 0 = cả đội — logic vẫn còn nhưng menu không cho chọn nữa (người chơi chỉ điều khiển 1 character)
    sel: { team: 0, opp: 0, diff: 1, ctrl: C.roles.indexOf('FWD') + 1 },
    train: { mine: 1, opp: 0 },                  // luyện tập: số người đội bạn (1 / 2) · đội đối thủ (0 / 2)
    lastOpts: null,

    // trận demo chạy nền ở menu: sân + 2 đội bot của Area người chơi đang đứng trên Main Path (đổi Area -> toMenu dựng lại)
    newDemo() {
      const MP = SFC.MainPath, A = SFC.Profile.data && MP.area(MP.state.area);
      const order = A && A.teams.length > 1 ? A.teams : SFC_CONFIG.teams.order;
      const a = SFC.U.pick(order);
      const b = SFC.U.pick(order.filter((t) => t !== a));
      this.demoArea = A ? MP.state.area : -1;
      this.demo = new SFC.Game({ home: a, away: b, difficulty: 'normal', humanTeam: -1, silent: true, arena: A && SFC_CONFIG.arenas[A.arena] ? A.arena : undefined });
    },

    // Main Path: vào màn tìm trận (matchmaking giả, src/ui/menu.js -> search). Tìm xong -> startRanked
    startMainPath() {
      // bản DEMO: đã tới Area bị khoá -> màn WISHLIST thay vì vào trận (cả nút NEXT MATCH ở màn kết quả)
      if (SFC.MainPath.demoOver()) return this.toMenu('wishlist');
      if (this.screen !== 'menu') this.toMenu('party');
      SFC.Menu.startSearch();
    },
    // vị trí character đang chọn (POSITION)
    myRole() { return C.roles[this.sel.ctrl ? this.sel.ctrl - 1 : C.roles.indexOf('FWD')]; },

    // trận Main Path 2v2: character của bạn + đồng đội giả vs 2 đối thủ giả (bot đóng vai người chơi, lb = MainPath.matchmake)
    startRanked(lb) {
      const MP = SFC_CONFIG.mainPath, st = SFC.MainPath.state;
      const soloIdx = C.roles.indexOf(this.myRole());
      const avatar = Object.assign(SFC.Profile.avatar(), { role: C.roles[soloIdx] }, this.avatarStats());
      SFC_CONFIG.teams.list[MP.playerTeam.id].name = MP.playerTeam.nameFormat.replace('{name}', avatar.name);
      this.startMatch({
        home: MP.playerTeam.id, away: SFC.MainPath.rivalClub(lb.opps[0].name), difficulty: 'normal',
        aiProfile: lb.aiProfile, mateProfile: lb.aiProfile,
        humanTeam: 0, solo: [soloIdx, null], avatars: [avatar, null], arena: lb.arena,
        // Core mở khoá (Core thường + Tuyệt kỹ đã mở) · Core vừa mở ưu tiên hiện ở lượt chọn
        coreUnlocks: [SFC.Profile.unlockedCores(), null], coreFresh: [st.fresh.slice(), null],
        mates: [lb.mate, lb.opps],
        mainPath: { area: st.area, elo: st.elo, reward: lb.reward, myElo: lb.myElo, oppElo: lb.oppElo, party: lb.party },
      });
    },

    // bỏ trận Main Path giữa chừng (Pause > FORFEIT): tính là thua
    forfeit() {
      const g = this.game, mp = g && g.opts.mainPath;
      let msg = '';
      if (mp && g.state !== 'ended' && SFC_CONFIG.mainPath.forfeitCountsAsLoss) {
        const r = SFC.MainPath.record('lose', mp);
        const st = SFC.Profile.data.stats;
        st.matches++; st.losses++;
        SFC.Profile.save();
        msg = r.delta ? SFC.t('Forfeit counts as a loss ({n} ELO).', { n: r.delta }) : SFC.t('Forfeit counts as a loss.');
      }
      this.toMenu('party');
      if (msg) SFC.Menu.setMsg(msg, true);
    },

    // chỉ số riêng của character (chỉ Main Path / Luyện tập — online đi qua Profile.avatar(), không kèm chỉ số)
    // đồng đội đang chọn vào trận: đá vị trí còn lại so với character
    mateSpec(soloIdx) {
      const m = SFC.Mates.active();
      return m ? SFC.Mates.spec(m, C.roles.find((r, i) => i !== soloIdx) || null) : null;
    },

    avatarStats() { return { stats: SFC.Profile.avatarStats(), ovr: SFC.Profile.ovr() }; },

    startMatch(opts) {
      this.mode = 'single';
      this.lastOpts = opts;
      this.game = new SFC.Game(opts);
      this.beginMatch(opts);
    },

    // Luyện tập: không giờ trận, không chọn Core, không thưởng. Đội bạn 1 người (character đá ĐÁ CAO) hoặc 2 người
    // (điều khiển như Chơi đơn); đối thủ 0 hoặc 2 người (đội + độ khó như Chơi đơn)
    startTraining() {
      const o = SFC.Menu.options(), s = this.sel, t = this.train;
      const home = o.order[s.team];
      let away = o.opp[s.opp];
      if (away === 'random') away = SFC.U.pick(o.order.filter((id) => id !== home));
      const two = t.mine === 2;
      const soloIdx = !two ? 0 : s.ctrl ? s.ctrl - 1 : null;
      const role = !two || soloIdx == null ? 'FWD' : C.roles[soloIdx];
      this.startMatch({
        home, away, difficulty: o.diffs[s.diff], humanTeam: 0, training: true, teamSize: [t.mine, t.opp],
        solo: [soloIdx, null], avatars: [Object.assign(SFC.Profile.avatar(), { role }, this.avatarStats()), null],
        mates: [two ? this.mateSpec(C.roles.indexOf(role)) : null, null],   // 2 người: đồng đội đang chọn đá cùng
        coreUnlocks: [SFC.Profile.unlockedCores(), null],
      });
    },

    // trận online: host truyền trận thật, khách truyền trận "gương"
    enterOnline(game) {
      this.mode = 'online';
      this.game = game;
      this.beginMatch(game.opts);
    },

    beginMatch(opts) {
      this.screen = 'game';
      SFC.Input.textHandler = null;
      SFC.UI.hudCache = {};
      // Main Path: không cho đá lại trận đang thua — chỉ tiếp tục hoặc bỏ trận (tính thua)
      // dịch lúc vào trận (đổi ngôn ngữ chỉ làm được ở menu)
      const _t = SFC.t;
      SFC.UI.pauseItems = this.mode === 'online' ? [['resume', _t('BACK TO MATCH')], ['leave', _t('LEAVE ROOM')]]
        : opts.tutorial ? [['resume', _t('RESUME')], ['skiptut', _t('SKIP PROLOGUE')]]
        : opts.mainPath ? [['resume', _t('RESUME')], ['forfeit', _t('FORFEIT (LOSS)')]]
        : [['resume', _t('RESUME')], ['restart', _t('RESTART')], ['menu', _t('MAIN MENU')]];
      SFC.UI.clearToasts();
      SFC.UI.show(null);
      const L = SFC_CONFIG.teams.list, mp = opts.mainPath;
      const kickoff = () => {
        if (opts.resume) return;   // kết nối lại giữa trận (online.js): trận đang đá dở
        const vsAway = _t('vs {team}', { team: L[opts.away].name });
        const vs = opts.training && opts.teamSize && !opts.teamSize[1]
          ? _t('{team} · no opponent', { team: L[opts.home].name })
          : _t('{home} vs {away}', { home: L[opts.home].name, away: L[opts.away].name });
        if (opts.tutorial) SFC.UI.banner(_t('THE DREAM'), _t('PROLOGUE'), '#b9a8ff', 2);
        else if (mp) SFC.UI.banner(_t('KICK OFF'), `${SFC.MainPath.area(mp.area).name} · ${vsAway}`, '#ffe14f', 1.6);
        else SFC.UI.banner(opts.training ? _t('TRAINING') : _t('KICK OFF'), vs, '#ffe14f', 1.4);
        SFC.Audio.upgrade();
      };
      // màn giới thiệu lực lượng 2 đội (config/intro.config.js): trận đứng yên tới khi xong, rồi mới chọn Core / giao bóng
      SFC.Intro.abort();
      // online: 2 máy cùng chiếu; host giữ trận đứng yên tới khi cả 2 xem xong (SFC.Online.introDone)
      if (SFC.Intro.wants(opts)) {
        this.screen = 'intro';
        SFC.Intro.start(this.game, () => {
          this.screen = 'game';
          if (this.mode === 'online') SFC.Online.introDone();
          kickoff();
        });
      } else kickoff();
    },

    // Main Path: "đá lại" = sang trận kế tiếp theo tiến trình mới
    restart() {
      if (this.mode !== 'single') return;
      if (this.lastOpts && this.lastOpts.mainPath) this.startMainPath();
      else this.startMatch(this.lastOpts);
    },

    pickCore(i) {
      if (this.mode === 'online') SFC.Online.pick(i);
      else if (this.game) this.game.pickCore(i);
    },

    rerollCore() {
      if (this.mode === 'online') SFC.Online.reroll();
      else if (this.game) this.game.rerollDraft();
    },

    resume() {
      if (this.mode === 'online') SFC.Online.overlay = false;
      this.screen = 'game';
      const g = this.game;
      SFC.UI.show(g && g.state === 'draft' ? 'draft' : g && g.state === 'ended' ? 'end' : null);
    },

    pause() {
      if (this.mode === 'online') SFC.Online.overlay = true;
      else this.screen = 'pause';
      SFC.UI.pauseSel = 0;
      SFC.UI.renderPause();
      SFC.UI.show('pause');
    },

    // về menu; page = trang menu muốn mở (home / online / lobby)
    toMenu(page = 'home') {
      SFC.Intro.abort();
      SFC.Story.abort();
      SFC.Tutorial.cleanup();
      SFC.Drill.close();
      this.game = null;
      this.screen = 'menu';
      if (page !== 'lobby') this.mode = 'single';
      SFC.UI.clearToasts();
      SFC.UI.show('menu');
      if (SFC.Profile.data && this.demoArea !== SFC.MainPath.state.area) this.newDemo();   // đổi Area -> đổi sân nền menu
      SFC.Menu.go(page);
    },
  };

  // đổi bàn phím <-> tay cầm: vẽ lại màn đang mở để nhãn phím khớp thiết bị (thanh kỹ năng tự vẽ lại qua hudCache)
  let deviceRev = 0;
  function refreshLabels() {
    const UI = SFC.UI, g = app.game;
    if (SFC.Drill.active) SFC.Drill.render();
    if (SFC.LangPick.active) SFC.LangPick.update();
    if (app.screen === 'menu') return SFC.Menu.render();
    if (UI.current === 'pause') UI.renderPause();
    else if (UI.current === 'draft' && g) UI.renderDraft(g);
  }

  function tick(dt) {
    if (Input.deviceRev !== deviceRev) { deviceRev = Input.deviceRev; refreshLabels(); }
    if (Input.wasPressed('mute') && !Input.textHandler) {
      const m = SFC.Audio.toggleMute();
      if (app.screen !== 'menu') SFC.UI.banner(m ? SFC.t('MUTED') : SFC.t('SOUND ON'), '', '#9aa3b5', 0.8);
    }

    // cut scene PROLOGUE (src/ui/story.js)
    if (app.screen === 'story') { SFC.Story.update(dt, Input); return; }

    if (app.screen === 'menu') {
      app.demo.update(dt, null);
      app.demo.events.length = 0;
      if (app.demo.state === 'ended') app.newDemo();
      SFC.Menu.animate(dt);
      // popup chọn ngôn ngữ / màn DRILL mở trên menu (CHARACTER / STATS): nhận phím thay menu
      if (SFC.LangPick.active) SFC.LangPick.input(Input);
      else if (SFC.Drill.active) SFC.Drill.update(dt, Input);
      else SFC.Menu.input(Input);
      return;
    }

    if (app.mode === 'online') { SFC.Online.tick(dt, Input); return; }

    // màn giới thiệu đội hình: trận chưa chạy, sự kiện (lượt chọn Core đầu trận) chờ tới khi xong
    if (app.screen === 'intro') { SFC.Intro.update(dt, Input); return; }

    const g = app.game;
    if (app.screen === 'pause') { SFC.UI.pauseInput(Input); return; }
    // màn DRILL mở trên màn kết quả: nhận phím thay các nút kết quả
    if (SFC.Drill.active) { SFC.Drill.update(dt, Input); return; }

    if (g.state === 'ended') {
      if (SFC.Reveal.active) SFC.Reveal.update(dt, Input);   // màn mở thẻ phần thưởng Main Path
      else SFC.UI.endInput(Input);
    } else if (g.state === 'draft') {
      if (Input.wasPressed('pause')) return app.pause();
      SFC.UI.draftInput(Input, g);
    } else {
      if (Input.wasPressed('pause')) return app.pause();
      g.update(dt, Input);
    }
    // trận mơ PROLOGUE: kịch bản đọc sự kiện trước khi UI lấy đi
    if (g.opts.tutorial) SFC.Tutorial.update(dt, Input, g);
    SFC.UI.consume(g);
  }

  function fit() {
    const stage = document.getElementById('stage');
    const s = Math.min(window.innerWidth / C.render.width, window.innerHeight / C.render.height);
    const scale = s >= 1 ? Math.max(1, Math.floor(s * 4) / 4) : s;
    stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }

  function boot() {
    const langChosen = SFC.I18n.init();   // ngôn ngữ đã chọn / đoán theo máy -> dịch config trước khi vẽ bất cứ gì
    SFC.Profile.load();
    SFC.Settings.apply();   // âm lượng + cỡ cửa sổ đã lưu (SETTINGS)
    Input.init(SFC_CONFIG.controls.bindings);
    SFC.Renderer.init(document.getElementById('game'));
    app.newDemo();
    SFC.UI.init(app);
    SFC.Menu.init(app);
    SFC.UI.show('menu');
    const start = () => {
      // lần đầu chơi: đặt tên cho character trước khi vào trang chủ -> PROLOGUE.
      // Đã đặt tên nhưng chưa xem xong PROLOGUE (tắt giữa chừng) -> xem lại từ đầu
      if (!SFC.Profile.hasName) SFC.Menu.go('name');
      else if (SFC.Tutorial.wanted()) SFC.Tutorial.begin(app);
      // hồ sơ đã xong PROLOGUE từ trước khi có bí kíp gia truyền: phát đoạn ông nội trao AURA FARMING 1 lần
      else if (SFC.Tutorial.heirloomWanted()) SFC.Tutorial.playHeirloom(app);
    };
    // chưa chọn ngôn ngữ (lần đầu mở game, kể cả hồ sơ cũ từ trước khi có đa ngôn ngữ): popup chọn ngôn ngữ trước tiên,
    // menu phía sau ẩn đi; chọn xong mới tới đặt tên / PROLOGUE
    if (langChosen) start();
    else {
      SFC.Menu.el.classList.add('hidden');
      SFC.LangPick.open({ first: true, done: () => { SFC.Menu.el.classList.remove('hidden'); SFC.Menu.render(); start(); } });
    }
    fit();
    window.addEventListener('resize', fit);

    let last = performance.now(), acc = 0;
    function step(now, draw) {
      acc += Math.min(0.1, (now - last) / 1000);
      last = now;
      while (acc >= STEP) {
        Input.poll();
        tick(STEP);
        Input.endFrame();
        acc -= STEP;
      }
      let g = null;
      if (app.screen === 'story') g = null;
      else if (app.screen === 'menu') g = app.demo;
      else if (app.mode === 'online') g = SFC.Online.view(now);
      else g = app.game;
      if (g && draw) {
        SFC.Renderer.render(g);
        if (app.screen !== 'menu') SFC.UI.updateHud(g);
      }
      // nhạc nền: chỉ phát ở ngoài trận (config/music.config.js)
      if (draw) SFC.Music.update(app.screen === 'menu');
      // âm thanh khán giả của trận đang hiện (menu: im lặng; tạm dừng / menu online: nhỏ lại)
      if (draw) SFC.Crowd.sound(app.screen === 'menu' || app.screen === 'story' ? null : g, app.screen === 'pause' || (app.mode === 'online' && SFC.Online.overlay));
    }
    let lastRaf = performance.now();
    function frame(now) {
      lastRaf = performance.now();
      step(now, true);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    // Trận online: tab bị ẩn / thu nhỏ thì requestAnimationFrame dừng -> dùng đồng hồ Worker
    // (không bị trình duyệt hãm) để host vẫn mô phỏng và khách vẫn nhận / gửi dữ liệu.
    try {
      const src = 'setInterval(function(){postMessage(0)},16)';
      const clock = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
      clock.onmessage = () => {
        const now = performance.now();
        if (app.mode === 'online' && app.screen !== 'menu' && now - lastRaf > 50) step(now, false);
      };
    } catch (e) { /* file:// có thể chặn Worker — khi đó trận online chỉ chạy lúc tab đang mở */ }
    window.SFC.app = app; // debug
  }

  // chờ font pixel tải xong để background vẽ chữ đúng font
  if (document.fonts && document.fonts.load) {
    Promise.race([
      Promise.all([document.fonts.load('8px "Press Start 2P"'), document.fonts.load('16px "VT323"')]),
      new Promise((r) => setTimeout(r, 1500)),
    ]).finally(boot);
  } else boot();
})();
