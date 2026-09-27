/* Main — khởi tạo, vòng lặp fixed-timestep, điều hướng màn hình */
(function () {
  const C = SFC_CONFIG.game;
  const Input = SFC.Input;
  const STEP = 1 / 60;

  const app = {
    screen: 'menu',     // menu | game | pause
    mode: 'single',     // single | online
    game: null,
    demo: null,
    sel: { team: 0, opp: 0, diff: 1, ctrl: 0 },   // ctrl: 0 = cả đội, i > 0 = chỉ cầu thủ thứ i - 1
    train: { mine: 1, opp: 0 },                  // luyện tập: số người đội bạn (1 / 2) · đội đối thủ (0 / 2)
    lastOpts: null,

    newDemo() {
      const order = SFC_CONFIG.teams.order;
      const a = SFC.U.pick(order);
      const b = SFC.U.pick(order.filter((t) => t !== a));
      this.demo = new SFC.Game({ home: a, away: b, difficulty: 'normal', humanTeam: -1, silent: true });
    },

    startMatch(opts) {
      if (!opts) {
        const o = SFC.Menu.options();
        const home = o.order[this.sel.team];
        let away = o.opp[this.sel.opp];
        if (away === 'random') away = SFC.U.pick(o.order.filter((t) => t !== home));
        // 1 CẦU THỦ: character của bạn đá đúng vị trí đã chọn (cầu thủ AI của đội đá vị trí còn lại); CẢ ĐỘI: character đá ĐÁ CAO
        const soloIdx = this.sel.ctrl ? this.sel.ctrl - 1 : null;
        const avatar = Object.assign(SFC.Profile.avatar(), { role: soloIdx == null ? 'FWD' : C.roles[soloIdx] });
        opts = {
          home, away, difficulty: o.diffs[this.sel.diff], humanTeam: 0, solo: [soloIdx, null],
          avatars: [avatar, null], coreUnlocks: [SFC.Profile.unlockedCores(), null],
        };
      }
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
        solo: [soloIdx, null], avatars: [Object.assign(SFC.Profile.avatar(), { role }), null],
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
      SFC.UI.pauseItems = this.mode === 'online' ? [['resume', 'VỀ TRẬN'], ['leave', 'RỜI PHÒNG']] : [['resume', 'TIẾP TỤC'], ['restart', 'ĐÁ LẠI'], ['menu', 'VỀ MENU']];
      SFC.UI.clearToasts();
      SFC.UI.show(null);
      const vs = opts.training && opts.teamSize && !opts.teamSize[1]
        ? `${SFC_CONFIG.teams.list[opts.home].name} · không đối thủ`
        : `${SFC_CONFIG.teams.list[opts.home].name} vs ${SFC_CONFIG.teams.list[opts.away].name}`;
      SFC.UI.banner(opts.training ? 'LUYỆN TẬP' : 'KICK OFF', vs, '#ffe14f', 1.4);
      SFC.Audio.upgrade();
    },

    restart() { if (this.mode === 'single') this.startMatch(this.lastOpts); },

    pickCore(i) {
      if (this.mode === 'online') SFC.Online.pick(i);
      else if (this.game) this.game.pickCore(i);
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
      this.game = null;
      this.screen = 'menu';
      if (page !== 'lobby') this.mode = 'single';
      SFC.UI.clearToasts();
      SFC.UI.show('menu');
      SFC.Menu.go(page);
    },
  };

  function tick(dt) {
    if (Input.wasPressed('mute') && !Input.textHandler) {
      const m = SFC.Audio.toggleMute();
      if (app.screen !== 'menu') SFC.UI.banner(m ? 'MUTED' : 'SOUND ON', '', '#9aa3b5', 0.8);
    }

    if (app.screen === 'menu') {
      app.demo.update(dt, null);
      app.demo.events.length = 0;
      if (app.demo.state === 'ended') app.newDemo();
      SFC.Menu.animate(dt);
      SFC.Menu.input(Input);
      return;
    }

    if (app.mode === 'online') { SFC.Online.tick(dt, Input); return; }

    const g = app.game;
    if (app.screen === 'pause') { SFC.UI.pauseInput(Input); return; }

    if (g.state === 'ended') {
      SFC.UI.endInput(Input);
    } else if (g.state === 'draft') {
      if (Input.wasPressed('pause')) return app.pause();
      SFC.UI.draftInput(Input, g);
    } else {
      if (Input.wasPressed('pause')) return app.pause();
      g.update(dt, Input);
    }
    SFC.UI.consume(g);
  }

  function fit() {
    const stage = document.getElementById('stage');
    const s = Math.min(window.innerWidth / C.render.width, window.innerHeight / C.render.height);
    const scale = s >= 1 ? Math.max(1, Math.floor(s * 4) / 4) : s;
    stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }

  function boot() {
    SFC.Profile.load();
    Input.init(SFC_CONFIG.controls.bindings);
    SFC.Renderer.init(document.getElementById('game'));
    app.newDemo();
    SFC.UI.init(app);
    SFC.Menu.init(app);
    SFC.UI.show('menu');
    // lần đầu chơi: đặt tên cho character trước khi vào trang chủ
    if (!SFC.Profile.hasName) SFC.Menu.go('name');
    fit();
    window.addEventListener('resize', fit);

    let last = performance.now(), acc = 0;
    function step(now, draw) {
      acc += Math.min(0.1, (now - last) / 1000);
      last = now;
      while (acc >= STEP) {
        tick(STEP);
        Input.endFrame();
        acc -= STEP;
      }
      let g = null;
      if (app.screen === 'menu') g = app.demo;
      else if (app.mode === 'online') g = SFC.Online.view(now);
      else g = app.game;
      if (g && draw) {
        SFC.Renderer.render(g);
        if (app.screen !== 'menu') SFC.UI.updateHud(g);
      }
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
