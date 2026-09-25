/* Main — khởi tạo, vòng lặp fixed-timestep, điều hướng màn hình */
(function () {
  const C = SFC_CONFIG.game;
  const Input = SFC.Input;
  const STEP = 1 / 60;

  const app = {
    screen: 'menu',     // menu | game | pause
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
        const o = SFC.UI.menuOptions();
        const home = o.order[this.sel.team];
        let away = o.opp[this.sel.opp];
        if (away === 'random') away = SFC.U.pick(o.order.filter((t) => t !== home));
        opts = { home, away, difficulty: o.diffs[this.sel.diff], humanTeam: 0 };
      }
      this.lastOpts = opts;
      this.game = new SFC.Game(opts);
      this.screen = 'game';
      SFC.UI.hudCache = {};
      SFC.UI.show(null);
      SFC.UI.banner('KICK OFF', `${SFC_CONFIG.teams.list[opts.home].name} vs ${SFC_CONFIG.teams.list[opts.away].name}`, '#ffe14f', 1.4);
      SFC.Audio.upgrade();
    },
    restart() { this.startMatch(this.lastOpts); },
    resume() {
      this.screen = 'game';
      SFC.UI.show(this.game && this.game.state === 'draft' ? 'draft' : null);
    },
    pause() {
      this.screen = 'pause';
      SFC.UI.pauseSel = 0;
      SFC.UI.renderPause();
      SFC.UI.show('pause');
    },
    toMenu() {
      this.game = null;
      this.screen = 'menu';
      SFC.UI.renderMenu();
      SFC.UI.show('menu');
    },
  };

  function tick(dt) {
    if (Input.wasPressed('mute')) {
      const m = SFC.Audio.toggleMute();
      if (app.screen !== 'menu') SFC.UI.banner(m ? 'MUTED' : 'SOUND ON', '', '#9aa3b5', 0.8);
    }

    if (app.screen === 'menu') {
      app.demo.update(dt, null);
      app.demo.events.length = 0;
      if (app.demo.state === 'ended') app.newDemo();
      SFC.UI.menuInput(Input);
      return;
    }

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
    SFC.UI.show('menu');
    fit();
    window.addEventListener('resize', fit);

    let last = performance.now(), acc = 0;
    function frame(now) {
      acc += Math.min(0.1, (now - last) / 1000);
      last = now;
      while (acc >= STEP) {
        tick(STEP);
        Input.endFrame();
        acc -= STEP;
      }
      const g = app.screen === 'menu' ? app.demo : app.game;
      if (g) {
        SFC.Renderer.render(g);
        if (app.screen !== 'menu') SFC.UI.updateHud(g);
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
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
