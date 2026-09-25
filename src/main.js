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
    sel: { team: 0, opp: 0, diff: 1 },
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
        opts = { home, away, difficulty: o.diffs[this.sel.diff], humanTeam: 0 };
      }
      this.mode = 'single';
      this.lastOpts = opts;
      this.game = new SFC.Game(opts);
      this.beginMatch(opts);
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
      SFC.UI.banner('KICK OFF', `${SFC_CONFIG.teams.list[opts.home].name} vs ${SFC_CONFIG.teams.list[opts.away].name}`, '#ffe14f', 1.4);
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
    Input.init(SFC_CONFIG.controls.bindings);
    SFC.Renderer.init(document.getElementById('game'));
    app.newDemo();
    SFC.UI.init(app);
    SFC.Menu.init(app);
    SFC.UI.show('menu');
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
