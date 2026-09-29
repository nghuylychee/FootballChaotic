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
    // ctrl: i > 0 = chỉ điều khiển cầu thủ thứ i - 1 (character của bạn), mặc định ĐÁ CAO.
    // 0 = cả đội — logic vẫn còn nhưng menu không cho chọn nữa (người chơi chỉ điều khiển 1 character)
    sel: { team: 0, opp: 0, diff: 1, ctrl: C.roles.indexOf('FWD') + 1 },
    train: { mine: 1, opp: 0 },                  // luyện tập: số người đội bạn (1 / 2) · đội đối thủ (0 / 2)
    lastOpts: null,

    newDemo() {
      const order = SFC_CONFIG.teams.order;
      const a = SFC.U.pick(order);
      const b = SFC.U.pick(order.filter((t) => t !== a));
      this.demo = new SFC.Game({ home: a, away: b, difficulty: 'normal', humanTeam: -1, silent: true });
    },

    // Main Path: trận kế tiếp theo tiến trình (đối thủ / độ khó / sân do Area + hạng quyết định).
    // Người chơi đá cho đội riêng (mainPath.playerTeam), character đá đúng vị trí đã chọn, đồng đội AI đá vị trí còn lại
    startMainPath() {
      const MP = SFC_CONFIG.mainPath, m = SFC.MainPath.nextMatch();
      const soloIdx = this.sel.ctrl ? this.sel.ctrl - 1 : C.roles.indexOf('FWD');
      const avatar = Object.assign(SFC.Profile.avatar(), { role: C.roles[soloIdx] }, this.avatarStats());
      SFC_CONFIG.teams.list[MP.playerTeam.id].name = MP.playerTeam.nameFormat.replace('{name}', avatar.name);
      this.startMatch({
        home: MP.playerTeam.id, away: m.away, difficulty: 'normal', aiProfile: m.aiProfile, mateDifficulty: MP.teammate,
        humanTeam: 0, solo: [soloIdx, null], avatars: [avatar, null], arena: m.arena,
        // Core mở khoá (bộ có sẵn + Main Path) · Core vừa mở ưu tiên hiện ở lượt chọn · boss trận thăng hạng cầm Core đặc trưng
        coreUnlocks: [SFC.Profile.unlockedCores(), null], coreFresh: [SFC.MainPath.state.fresh.slice(), null],
        signature: m.promo ? [null, m.signature] : null,
        mainPath: { area: m.area, div: m.div, promo: m.promo, final: m.final, reward: m.reward },
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
        msg = `Forfeit counts as a loss${r.delta ? ` (${r.delta} ★)` : ''}.`;
      }
      this.toMenu('path');
      if (msg) SFC.Menu.setMsg(msg, true);
    },

    // chỉ số riêng của character (chỉ Main Path / Luyện tập — online đi qua Profile.avatar(), không kèm chỉ số)
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
      SFC.UI.pauseItems = this.mode === 'online' ? [['resume', 'BACK TO MATCH'], ['leave', 'LEAVE ROOM']]
        : opts.mainPath ? [['resume', 'RESUME'], ['forfeit', 'FORFEIT (LOSS)']]
        : [['resume', 'RESUME'], ['restart', 'RESTART'], ['menu', 'MAIN MENU']];
      SFC.UI.clearToasts();
      SFC.UI.show(null);
      const L = SFC_CONFIG.teams.list, mp = opts.mainPath;
      const kickoff = () => {
        const vs = opts.training && opts.teamSize && !opts.teamSize[1]
          ? `${L[opts.home].name} · no opponent`
          : `${L[opts.home].name} vs ${L[opts.away].name}`;
        if (mp && mp.promo) SFC.UI.banner(mp.final ? 'CHAMPIONSHIP FINAL' : 'PROMOTION MATCH', `vs ${L[opts.away].name}`, '#ffd23f', 2.2);
        else if (mp) SFC.UI.banner('KICK OFF', `${SFC.MainPath.divName(mp.area, mp.div)} · vs ${L[opts.away].name}`, '#ffe14f', 1.6);
        else SFC.UI.banner(opts.training ? 'TRAINING' : 'KICK OFF', vs, '#ffe14f', 1.4);
        SFC.Audio.upgrade();
      };
      // màn giới thiệu lực lượng 2 đội (config/intro.config.js): trận đứng yên tới khi xong, rồi mới chọn Core / giao bóng
      SFC.Intro.abort();
      if (this.mode !== 'online' && SFC.Intro.wants(opts)) {
        this.screen = 'intro';
        SFC.Intro.start(this.game, () => { this.screen = 'game'; kickoff(); });
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
      this.game = null;
      this.screen = 'menu';
      if (page !== 'lobby') this.mode = 'single';
      SFC.UI.clearToasts();
      SFC.UI.show('menu');
      SFC.Menu.go(page);
    },
  };

  // đổi bàn phím <-> tay cầm: vẽ lại màn đang mở để nhãn phím khớp thiết bị (thanh kỹ năng tự vẽ lại qua hudCache)
  let deviceRev = 0;
  function refreshLabels() {
    const UI = SFC.UI, g = app.game;
    if (app.screen === 'menu') return SFC.Menu.render();
    if (UI.current === 'pause') UI.renderPause();
    else if (UI.current === 'draft' && g) UI.renderDraft(g);
  }

  function tick(dt) {
    if (Input.deviceRev !== deviceRev) { deviceRev = Input.deviceRev; refreshLabels(); }
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

    // màn giới thiệu đội hình: trận chưa chạy, sự kiện (lượt chọn Core đầu trận) chờ tới khi xong
    if (app.screen === 'intro') { SFC.Intro.update(dt, Input); return; }

    const g = app.game;
    if (app.screen === 'pause') { SFC.UI.pauseInput(Input); return; }

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
        Input.poll();
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
      // nhạc nền: chỉ phát ở ngoài trận (config/music.config.js)
      if (draw) SFC.Music.update(app.screen === 'menu');
      // âm thanh khán giả của trận đang hiện (menu: im lặng; tạm dừng / menu online: nhỏ lại)
      if (draw) SFC.Crowd.sound(app.screen === 'menu' ? null : g, app.screen === 'pause' || (app.mode === 'online' && SFC.Online.overlay));
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
