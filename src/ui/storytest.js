/* PHÒNG TEST FOOTBALL STORY (chỉ bản dev, SFC_DEBUG): xem nhanh cut scene + đá thẳng vòng bất kỳ của Story bất kỳ, không cần đá từ đầu.
 * Mở: SETTINGS › TEST › STORY TEST (trang menu 'storytest'), hoặc index.html?storytest (mở trang), ?storytest=market_cup.2 (đá thẳng
 * bán kết Night Market Cup, bỏ cut scene; số vòng 0..3).
 * Trang: chọn STORY · VÒNG, rồi MATCH (vào trận ngay) · BEFORE + MATCH (cut scene trước trận rồi đá) · AFTER (cut scene thắng vòng đó)
 * · INTRO / OUTRO · WHOLE STORY (mọi cut scene nối liền).
 * Trong trận test: 7 = luật trận ra tay ngay · 8 = bạn +1 bàn · 9 = đối thủ +1 bàn (thử leo thang khi bị dẫn) · 0 = thắng luôn
 * · - = đá lại vòng này. Kết quả trận ghi vào hồ sơ như trận thật (gold, sao, thành tích của Story).
 * STORY cuối danh sách = GOAT PATH ELITES: đá thử 6 đội Elite (config/elites.config.js, ?storytest=elite.<0..5>), Elo = giữa act + eliteElo;
 * trận thường (không ghi vào run).
 * Bản đóng gói: cả file thành rỗng (scripts/strip-debug.js xoá nhánh SFC_DEBUG, MARKERS có 'STORY TEST').
 */
window.SFC = window.SFC || {};

if (SFC_DEBUG) (function () {
  const CUP = () => SFC.Cup;
  const wrap = (v, n) => ((v % n) + n) % n;
  const playable = () => CUP().list().filter((s) => !s.soon);
  const elites = () => Object.keys(SFC_CONFIG.run.elites || {});

  const StoryTest = {
    si: 0, ri: 0,
    active: false,

    story() { return playable()[this.si]; },
    elite() { return this.si >= playable().length; },   // mục cuối: GOAT PATH ELITES
    // lượt chơi giả đang ở vòng r (bracket thật, kết quả các vòng trước giả lập: bạn thắng 2-1)
    setup(r) {
      const s = this.story();
      CUP().start(s.id);
      for (let i = 0; i < r; i++) { CUP().run.round = i; CUP().closeRound({ my: 2, op: 1 }); }
      CUP().run.round = r;
      SFC.CupUI.reset();
      return s;
    },

    /* ---------- trang menu ---------- */
    items(menu) {
      if (this.elite()) {
        const id = elites()[this.ri % elites().length], o = SFC_CONFIG.run.elites[id], mod = SFC_CONFIG.stories.mods[o.mod];
        return [
          { kind: 'pick', label: 'STORY', value: 'GOAT PATH ELITES', danger: true, change: (d) => { this.si = wrap(this.si + d, playable().length + 1); this.ri = Math.min(this.ri, 3); } },
          { kind: 'pick', label: 'ELITE', value: (SFC_CONFIG.teams.list[id] || {}).name || id, danger: true, change: (d) => { this.ri = wrap(this.ri + d, elites().length); } },
          { kind: 'btn', label: 'MATCH', sub: `Kick off now · rule ${mod ? mod.name : '-'}`, danger: true, act: () => this.match(menu.app, false) },
        ];
      }
      const s = this.story(), rd = s.rounds[this.ri], team = SFC_CONFIG.teams.list[rd.team] || {};
      const mod = rd.mod && SFC_CONFIG.stories.mods[rd.mod];
      return [
        { kind: 'pick', label: 'STORY', value: s.name, danger: true, change: (d) => { this.si = wrap(this.si + d, playable().length + 1); this.ri = Math.min(this.ri, 3); } },
        { kind: 'pick', label: 'ROUND', value: `${CUP().roundName(this.ri)} · ${team.name || rd.team}`, danger: true, change: (d) => { this.ri = wrap(this.ri + d, 4); } },
        { kind: 'btn', label: 'MATCH', sub: mod ? `Kick off now · rule ${mod.name}` : 'Kick off now', danger: true, act: () => this.match(menu.app, false) },
        { kind: 'btn', label: 'BEFORE + MATCH', sub: 'Pre-match scenes, then kick off', danger: true, act: () => this.match(menu.app, true) },
        { kind: 'btn', label: 'AFTER SCENES', sub: 'Scenes after winning this round', danger: true, act: () => this.scenes('after') },
        { kind: 'btn', label: 'INTRO', sub: 'Opening scenes of the cup', danger: true, act: () => this.scenes('intro') },
        { kind: 'btn', label: 'OUTRO', sub: 'Final win + lifting the cup', danger: true, act: () => this.scenes('outro') },
        { kind: 'btn', label: 'WHOLE STORY', sub: 'Every scene back to back · hold to skip', danger: true, act: () => this.scenes('all') },
      ];
    },

    // chiếu cut scene, xong quay lại trang STORY TEST
    scenes(kind) {
      const s = this.setup(this.ri), UI = SFC.CupUI, rd = s.rounds[this.ri];
      let list;
      if (kind === 'intro') list = UI.scenes(s.intro, 'intro');
      else if (kind === 'outro') { CUP().run.round = 3; list = UI.scenes(s.rounds[3].after, 'after', s.rounds[3].team, 3).concat(UI.scenes(s.outro, 'outro')); }
      else if (kind === 'after') list = UI.scenes(rd.after, 'after', rd.team, this.ri);
      else {
        list = UI.scenes(s.intro, 'intro');
        s.rounds.forEach((r, i) => { CUP().run.round = i; list = list.concat(UI.scenes(r.before, 'before', r.team, i), UI.scenes(r.after, 'after', r.team, i)); });
        list = list.concat(UI.scenes(s.outro, 'outro'));
      }
      const app = SFC.Menu.app;
      app.screen = 'story';
      SFC.Story.play(list, () => { CUP().abort(); app.screen = 'menu'; SFC.Menu.go('storytest'); }, null, { speaker: (w, sc) => UI.speaker(w, sc), music: true, tell: s.tell });
    },

    // vào trận vòng đang chọn (withScenes: chiếu cut scene trước trận rồi mới đá, như bấm KICK OFF)
    match(app, withScenes) {
      if (this.elite()) return this.eliteMatch(app);
      const s = this.setup(this.ri), rd = s.rounds[this.ri];
      this.armed = true;
      if (withScenes) return SFC.CupUI.cut(SFC.CupUI.scenes(rd.before, 'before', rd.team), 'kick');
      app.startCupMatch();
    },

    // đội Elite đang chọn: trận thường dựng như trận GOAT PATH (luật trận + câu nói + Core đặc trưng), Elo giữa act + eliteElo
    eliteMatch(app) {
      const id = elites()[this.ri % elites().length], o = SFC_CONFIG.run.elites[id], RC = SFC_CONFIG.run, MP = SFC_CONFIG.mainPath;
      const A = RC.acts.find((a) => (a.elite || []).includes(id)) || RC.acts[0], ai = SFC.MainPath.aiProfile((A.elo[0] + A.elo[1]) / 2 + RC.eliteElo);
      const avatar = SFC.Profile.avatar();
      this.armed = true;
      app.startMatch({
        home: MP.playerTeam.id, away: id, difficulty: 'normal', aiProfile: ai, mateProfile: ai,
        humanTeam: 0, solo: [Math.max(0, SFC_CONFIG.game.roles.indexOf(app.myRole())), null], avatars: [avatar, null], arena: o.arena,
        coreUnlocks: [SFC.Profile.unlockedCores(), null], signature: [null, o.signature || null],
        knockout: true, mod: o.mod || null, barks: o.barks || null,
      });
      this.onMatch(app);
    },

    // index.html?storytest[=id.vòng]: mở trang, hoặc đá thẳng
    boot(app, arg) {
      const [id, r] = String(arg || '').split('.');
      if (id === 'elite') { this.si = playable().length; this.ri = Math.max(0, +r || 0) % elites().length; return this.match(app, false); }
      const i = playable().findIndex((s) => s.id === id);
      if (i >= 0) { this.si = i; this.ri = Math.max(0, Math.min(3, +r || 0)); return this.match(app, false); }
      SFC.Menu.go('storytest');
    },

    /* ---------- trong trận: phím tắt + bảng nhỏ ---------- */
    // main.js startCupMatch gọi sau khi dựng trận cup
    onMatch(app) {
      if (!this.armed) return;
      this.armed = false;
      this.app = app; this.g = app.game; this.active = true;
      this.mount();
      if (!this.timer) this.timer = setInterval(() => this.tick(), 200);
    },
    tick() {
      if (!this.active) return;
      if (!this.app || this.app.game !== this.g) return this.stop();
      this.render();
    },
    stop() {
      this.active = false;
      clearInterval(this.timer); this.timer = 0;
      if (this.el) { this.el.remove(); this.el = null; }
    },
    mount() {
      if (this.el) this.el.remove();
      const el = this.el = document.createElement('div');
      el.style.cssText = 'position:absolute;left:6px;top:30px;z-index:50;max-width:200px;padding:3px 5px;background:rgba(20,12,22,.78);'
        + 'border:1px solid #ff9a3d;color:#c7ccd6;font:8px/1.4 "Press Start 2P",monospace;pointer-events:none';
      document.getElementById('stage').appendChild(el);
      if (!this.keyed) { this.keyed = true; window.addEventListener('keydown', (e) => this.key(e), true); }
      this.render();
    },
    render() {
      if (!this.el || !this.g) return;
      const M = this.g.mod, c = M && M.cfg;
      this.el.innerHTML = `<div style="color:#ff9a3d">STORY TEST</div>`
        + `<div style="color:#fff">${c ? c.name : 'NO RULE'}</div>`
        + `<div>HITS ON YOU: ${M ? M.hits : 0}</div>`
        + `<div style="margin-top:2px">7 RULE NOW · 8 YOU+1</div><div>9 THEM+1 · 0 WIN · - REDO</div>`;
    },
    // luật trận ra tay ngay: đặt mọi hẹn giờ của luật về 0 (luật không có hẹn giờ thì bỏ qua)
    trigger() {
      const M = this.g.mod;
      if (!M) return;
      for (const k of ['next', 'bell', 'aiNext']) if (typeof M[k] === 'number') M[k] = 0.01;
      if (M.id === 'stools') for (const p of this.g.players) if (p.carry && p.carry.t != null) p.carry.t = 99;
    },
    key(e) {
      if (!this.active || !this.app || this.app.screen !== 'game' || this.app.game !== this.g) return;
      const g = this.g, me = g.humanTeam;
      const goal = (team) => { g.teams[team].score++; g.emit('banner', { text: `TEST ${g.teams[0].score} - ${g.teams[1].score}`, color: '#ff9a3d' }); };
      let used = true;
      if (e.code === 'Digit7') this.trigger();
      else if (e.code === 'Digit8') goal(me);
      else if (e.code === 'Digit9') goal(1 - me);
      else if (e.code === 'Digit0') { if (g.state !== 'ended') { const t = g.teams; t[me].score = Math.max(t[me].score, t[1 - me].score + 1); g.end(); } }
      else if (e.code === 'Minus') { this.stop(); this.match(this.app, false); }
      else used = false;
      if (used) { e.preventDefault(); e.stopPropagation(); this.render(); }
    },
  };

  SFC.StoryTest = StoryTest;
})();
