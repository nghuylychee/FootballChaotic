/* Ảnh động xem trước Core (docs/CORE_DESIGN.md mục 9) — dùng trên lá chọn Core, túi đồ, màn mở hộp, màn kết quả.
 * Mỗi ảnh là một trận mini THẬT (SFC.Game với noAI / noDraft, g.preview = true) chạy kịch bản ngắn của Core đó rồi lặp lại,
 * vẽ bằng chính Renderer + VFX Kit vào canvas phụ 640x360, sau đó cắt khung quanh "máy quay" (1:1, giữ pixel sắc nét).
 *   <canvas data-preview="fire_shot" width="132" height="58"></canvas>  +  SFC.CorePreview.scan(rootEl)
 * Canvas bị gỡ khỏi DOM thì tự dừng.
 */
window.SFC = window.SFC || {};

(function () {
  const U = SFC.U;
  const Act = () => SFC.Actions;
  const STEP = 1 / 60;
  const PI = Math.PI;

  /* ---------- kịch bản ---------- */
  // toạ độ mốc (sân 56..584 x 80..326): A = giữa sân, G = khung thành bên phải (đội 0 tấn công sang phải)
  const A = { x: 320, y: 203 }, G = { x: 584, y: 203 };

  // sút: người vàng cầm bóng trước khung, người trông khung đứng giữa khung; nạp lực rồi sút vào góc
  const shot = (o = {}) => ({
    len: o.len || 2.6, cores: o.cores, opp: o.opp, team: o.team,
    focus: (s) => (s.shot ? s.g.ball : s.me),
    init(s) {
      const d = o.dist || 120;
      s.place(s.me, G.x - d, G.y + (o.y != null ? o.y : 12), 0);
      s.place(s.o1, G.x - 16, G.y, PI);
      s.place(s.o2, G.x - d + 55, G.y + (o.lane ? 10 : 42), PI);
      s.give(s.me);
      if (o.init) o.init(s);
    },
    tick(s) {
      const from = o.from || 0.15, to = o.at || 0.85, c = o.charge != null ? o.charge : 1;
      if (!s.shot && s.t >= from && !o.noCharge) { s.me.charging = true; s.me.charge = Math.min(c, (c * (s.t - from)) / Math.max(0.1, to - from - 0.05)); }
      if (o.tick) o.tick(s);
    },
    at: [[o.at || 0.85, (s) => s.shoot(o.charge != null ? o.charge : 1, o.aimY != null ? o.aimY : 0.75)]].concat(o.more || []),
  });

  // đấm: đối thủ cầm bóng đứng sát trước mặt
  const punch = (o = {}) => ({
    len: o.len || 2.2, cores: o.cores, opp: o.opp, team: o.team,
    init(s) {
      s.place(s.me, A.x - 30, A.y, 0);
      s.place(s.o1, A.x - 30 + (o.dist || 15), A.y, PI);
      s.o1.stats.dribble = 0.3;   // cú đấm chắc chắn làm rơi bóng -> ảnh luôn ra đúng khoảnh khắc
      if (o.ball !== false) s.give(s.o1);
      if (o.init) o.init(s);
    },
    tick: o.tick,
    at: [[o.at || 0.35, (s) => { s.face(s.me, s.o1); Act().lightAttack(s.g, s.me); }]].concat(o.more || []),
  });

  // đá (Hard attack)
  const kick = (o = {}) => ({
    len: o.len || 2.4, cores: o.cores, opp: o.opp,
    focus: o.focus,
    init(s) {
      s.place(s.me, A.x - 40, A.y, 0);
      s.place(s.o1, A.x - 40 + (o.dist || 26), A.y, PI);
      if (o.ball !== false) s.give(s.o1);
      if (o.init) o.init(s);
    },
    tick: o.tick,
    at: [[o.at || 0.25, (s) => { s.face(s.me, s.o1); Act().hardAttack(s.g, s.me); }]].concat(o.more || []),
  });

  // chạy nước rút sang phải
  const run = (o = {}) => ({
    len: o.len || 2.2, cores: o.cores,
    init(s) {
      s.place(s.me, A.x - 80, A.y, 0);
      if (o.ball) s.give(s.me);
      if (o.init) o.init(s);
    },
    tick(s) {
      const go = s.t >= (o.from || 0.2);
      s.me.intent.mx = go ? 1 : 0; s.me.intent.my = 0; s.me.intent.sprint = go;
      s.me.stamina = 100;
      if (o.tick) o.tick(s);
    },
    at: o.more || [],
  });

  // lướt Z khi cầm bóng
  const dash = (o = {}) => ({
    len: o.len || 2.2, cores: o.cores,
    init(s) { s.place(s.me, A.x - 30, A.y, 0); s.give(s.me); s.place(s.o1, A.x + 10, A.y, PI); if (o.init) o.init(s); },
    at: [[o.at || 0.35, (s) => Act().skill(s.g, s.me, 1, -0.9)]].concat(o.more || []),
  });

  // chuyền cho đồng đội
  const pass = (o = {}) => ({
    len: o.len || 2.2, cores: o.cores,
    focus: (s) => (s.passed ? s.mid(s.me, s.mate) : s.me),
    init(s) {
      s.place(s.me, A.x - 55, A.y + 10, 0);
      s.place(s.mate, A.x + 55, A.y - 20, PI);
      s.give(s.me);
      if (o.init) o.init(s);
    },
    tick: o.tick,
    at: [[o.at || 0.4, (s) => { s.passed = true; Act().passTo(s.g, s.me, s.mate, o.mode || 'ground'); }]].concat(o.more || []),
  });

  // Tuyệt kỹ (bỏ cut-in: gọi thẳng hành vi)
  const ult = (o = {}) => ({
    len: o.len || 3, cores: o.cores, focus: o.focus,
    init(s) {
      s.place(s.me, A.x - 40, A.y, 0);
      s.place(s.o1, A.x + 20, A.y + 4, PI);
      s.place(s.o2, A.x + 60, A.y - 18, PI);
      if (o.ball !== false) s.give(s.me);
      if (o.init) o.init(s);
    },
    tick: o.tick,
    at: [[o.at || 0.35, (s) => s.ult()]].concat(o.more || []),
  });

  const SCENES = {
    /* 🏃 TỐC ĐỘ */
    speed_demon: run(),
    burst_start: run({ from: 0.35 }),
    sonic_boom: run({ init: (s) => { s.me.res.momentum = 7; s.place(s.o1, A.x - 10, A.y + 13, PI); } }),
    freight_train: run({ init: (s) => { s.me.res.momentum = 5; s.place(s.o1, A.x - 10, A.y, PI); } }),
    fake_run: run({ ball: true, init: (s) => s.place(s.o1, A.x + 10, A.y + 10, PI) }),
    lightning_dash: ult({ init: (s) => s.place(s.me, A.x - 90, A.y, 0), at: 0.3 }),
    counter_attack: punch(),
    flying_kick: kick({ dist: 55, init: (s) => { s.me.res.momentum = 5; } }),

    /* 🎼 TIKI-TAKA */
    maestro: pass(),
    eagle_eye: pass({
      at: 1.0,
      tick: (s) => { if (!s.passed && s.t > 0.1) { const m = s.me; m.passMode = 'lob'; m.passLock = s.mate; m.passKey = 'lob'; m.passCharge = Math.min(1, (s.t - 0.1) * 0.8); } },
    }),
    one_touch: pass({
      at: 9,
      init: (s) => { s.give(s.mate); },
      tick: (s) => { if (s.me.hasBall && !s.passed) { s.passed = true; Act().passTo(s.g, s.me, s.mate, 'ground'); } },
      more: [[0.2, (s) => { Act().passTo(s.g, s.mate, s.me, 'ground'); }]],
      len: 2.4,
    }),
    phantom_pass: pass({ mode: 'through', init: (s) => { s.g.rhythm[0] = 5; s.place(s.o1, A.x, A.y - 5, PI); } }),
    symphony: shot({ charge: 0.7, init: (s) => { s.g.rhythm[0] = 5; } }),
    endless_tiki: ult({ len: 3.2, init: (s) => { s.place(s.mate, A.x + 10, A.y - 34, 0); s.place(s.o1, A.x + 50, A.y + 20, PI); }, focus: (s) => s.g.ball }),
    rubber_arm: punch({ dist: 55 }),
    one_two: shot({
      noCharge: true, at: 9, dist: 130,
      init: (s) => { s.place(s.mate, G.x - 190, G.y - 50, 0); s.give(s.mate); },
      tick: (s) => { if (s.me.hasBall && !s.shot && s.t > 0.3) s.shoot(0.3, 0.7); },
      more: [[0.2, (s) => Act().passTo(s.g, s.mate, s.me, 'ground')]],
    }),
    captain: pass(),

    /* 🎯 SÁT THỦ */
    sniper_foot: shot({ charge: 0.9, at: 1.1, aimY: -0.7 }),
    banana_kick: shot({ charge: 0.8, aimY: 0.1 }),
    fire_shot: shot(),
    thunder_kick: shot({ lane: true, aimY: 0.3 }),
    energy_wave: shot({ lane: true, aimY: 0.3 }),
    black_hole: shot({ lane: true, len: 3, aimY: 0.3, init: (s) => s.place(s.o2, G.x - 60, G.y + 24, PI) }),
    meteor_strike: ult({ len: 3, init: (s) => { s.place(s.me, G.x - 150, G.y + 10, 0); s.place(s.o1, G.x - 16, G.y, PI); }, focus: (s) => (s.t > 0.8 ? s.g.ball : s.me) }),
    chaos_ball: shot({ charge: 0.8 }),
    ghost_ball: shot({ cores: ['shadow_clone'], at: 0.8, more: [[0.2, (s) => Act().skill(s.g, s.me, 0.3, -1)]], from: 0.5 }),
    scissor_kick: {
      len: 2.4, focus: (s) => (s.t > 0.5 ? s.g.ball : s.me),
      init(s) { s.place(s.me, G.x - 150, G.y + 8, 0); s.loose(G.x - 132, G.y + 8); s.place(s.o2, G.x - 90, G.y + 8, PI); s.place(s.o1, G.x - 16, G.y, PI); },
      at: [[0.2, (s) => Act().hardAttack(s.g, s.me)]],
    },

    /* 🥊 ĐẤU SĨ */
    street_fighter: punch({ init: (s) => { s.me.res.rage = 3; } }),
    fist_storm: punch(),
    giant_fist: punch({ init: (s) => { s.me.res.rage = 5; s.place(s.o1, A.x - 12, A.y, PI); } }),
    hundred_fists: ult({ ball: false, len: 3.4, init: (s) => { s.place(s.o1, A.x + 10, A.y, PI); s.place(s.o2, A.x + 150, A.y + 60, PI); }, focus: (s) => s.o1 }),
    uppercut: punch({ init: (s) => { s.me.res.rage = 5; } }),
    iron_fist: punch({ init: (s) => { s.me.res.guard = 1; } }),
    counter_strike: punch({
      at: 0.6, len: 2.4,
      init: (s) => { s.place(s.o2, A.x - 16, A.y, PI); s.place(s.o1, A.x + 6, A.y + 12, PI); s.give(s.o1); },
      more: [
        [0.2, (s) => { s.face(s.o2, s.me); Act().lightAttack(s.g, s.o2); }],
        [0.25, (s) => Act().skill(s.g, s.me, 1, 0.3)],
      ],
    }),

    /* 🦵 VÕ SĨ ĐÁ */
    heavy_boot: kick(),
    juggle: punch({
      ball: false, len: 2.6, at: 0.22,
      more: [
        [0.05, (s) => { s.o1.hitImmune = 0; s.o1.hit({ stun: 1.2, kbx: 0, kby: 0, launch: 240, type: 'hard' }); }],
        [0.5, (s) => { s.me.cd.light = 0; s.face(s.me, s.o1); Act().lightAttack(s.g, s.me); }],
        [0.78, (s) => { s.me.cd.light = 0; s.face(s.me, s.o1); Act().lightAttack(s.g, s.me); }],
      ],
    }),
    wall_slam: kick({
      focus: (s) => s.o1,
      init: (s) => { s.place(s.me, A.x, 80 + 48, -PI / 2); s.place(s.o1, A.x, 80 + 26, PI / 2); s.give(s.o1); },
      at: 9, more: [[0.25, (s) => { s.me.facing = -PI / 2; Act().hardAttack(s.g, s.me); }]],
    }),
    ground_slam: kick({ dist: 18, init: (s) => s.place(s.o2, A.x - 30, A.y + 22, PI) }),
    blade_runner: kick({ dist: 90 }),
    meteor_drop: ult({
      ball: false, len: 3.4,
      init: (s) => { s.place(s.o1, A.x + 30, A.y + 6, PI); s.place(s.o2, A.x + 45, A.y - 14, PI); s.give(s.o1); },
      tick: (s) => { if (s.me.state === 'meteor') { const d = U.norm(s.o1.x - s.me.x, s.o1.y - s.me.y); const k = Math.min(1, U.dist(s.o1, s.me) / 10); s.me.intent.mx = d.x * k; s.me.intent.my = d.y * k; } },
      focus: (s) => s.me,
    }),

    /* 🌀 ẢO ẢNH */
    quick_feet: dash(),
    phantom_step: dash(),
    shadow_clone: dash(),
    witch_time: punch({
      ball: false, at: 9, len: 2.4,
      init: (s) => { s.place(s.o2, A.x - 16, A.y, PI); s.place(s.o1, A.x + 170, A.y + 90, PI); },
      more: [[0.2, (s) => { s.face(s.o2, s.me); Act().lightAttack(s.g, s.o2); }], [0.25, (s) => Act().skill(s.g, s.me, 1, -0.2)]],
    }),
    clone_army: ult({ ball: false, len: 2.8, init: (s) => { s.place(s.o1, A.x + 30, A.y, PI); s.give(s.o1); }, focus: (s) => s.o1 }),

    /* 🛡 THÉP */
    iron_body: punch({
      ball: false, at: 9,
      init: (s) => { s.me.res.guard = 1; },
      more: [[0.3, (s) => { s.face(s.o1, s.me); Act().lightAttack(s.g, s.o1); }]],
    }),
    bulldozer: run({ ball: true, from: 0.1, init: (s) => { s.me.res.guard = 1; s.place(s.o1, A.x - 20, A.y, PI); } }),
    giant_keeper: shot({ team: 1, aimY: 0.35, charge: 0.8 }),
    aegis_wall: shot({ team: 1 }),
    emp_trap: punch({
      at: 0.2, len: 2.6,
      init: (s) => s.place(s.o1, A.x + 20, A.y, PI),
      tick: (s) => { if (s.t > 0.35) { s.me.intent.my = -1; s.o1.intent.mx = -0.9; } },
    }),
    titan: ult({
      len: 3.4, at: 0.3,
      init: (s) => { s.place(s.o1, A.x + 10, A.y + 4, PI); s.place(s.o2, A.x + 40, A.y - 12, PI); },
      tick: (s) => { if (s.t > 0.6) { s.me.intent.mx = 1; s.me.intent.my = 0; } },
    }),

    /* 🎲 HỖN LOẠN */
    warp_walls: {
      len: 2.4, focus: (s) => s.g.ball,
      init(s) { s.place(s.me, A.x - 40, 80 + 60, 0); s.give(s.me); },
      at: [[0.3, (s) => { const b = s.g.ball; b.kick(s.me, 70, -380, 0); b.kind = 'shot'; }]],
    },
    bomb_ball: {
      len: 3.8,
      init(s) {
        s.place(s.me, A.x - 60, A.y, 0); s.give(s.me);
        s.place(s.o1, A.x + 10, A.y + 4, PI);
        const st = s.g.cores.st(0, 'bomb_ball'); st.t = s.g.cores.params('bomb_ball').every - 0.05;
      },
      tick(s) { s.me.intent.mx = s.t < 1.2 ? 0.8 : 0; },
      at: [[1.4, (s) => s.give(s.o1)]],
    },
  };
  const FALLBACK = run();

  /* ---------- một ảnh xem trước ---------- */
  class Preview {
    constructor(cv, id) {
      this.cv = cv;
      this.ctx = cv.getContext('2d');
      this.ctx.imageSmoothingEnabled = false;
      this.id = id;
      this.scn = SCENES[id] || FALLBACK;
      this.reset();
    }

    reset() {
      const g = new SFC.Game({ home: 'street_kings', away: 'neon_strikers', difficulty: 'normal', humanTeam: 0, humans: [0, 1], silent: true, noDraft: true, noAI: true });
      g.preview = true;
      g.state = 'play'; g.stateT = 0;
      const t0 = g.teams[0].players, t1 = g.teams[1].players;
      const s = this.s = {
        g, t: 0, me: t0[1], mate: t0[0], o1: t1[0], o2: t1[1], done: 0, shot: false, passed: false,
        place(p, x, y, facing) { Object.assign(p, { x, y, vx: 0, vy: 0, kbx: 0, kby: 0, facing: facing != null ? facing : p.team ? PI : 0, state: 'normal', airZ: 0 }); },
        give(p) { g.ball.owner = null; g.gainPossession(p); },
        loose(x, y) { const b = g.ball; b.owner = null; b.x = x; b.y = y; b.z = 0; b.vx = b.vy = b.vz = 0; },
        face(p, q) { p.facing = Math.atan2(q.y - p.y, q.x - p.x); },
        mid(p, q) { return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }; },
        shoot(charge, aimY) {
          if (g.ball.owner !== s.me) return;
          const goal = g.attackGoal(0);
          s.me.facing = Math.atan2(goal.y - s.me.y, goal.x - s.me.x);
          Act().shoot(g, s.me, charge, aimY);
          s.shot = true;
        },
        ult: () => {
          const b = SFC.CoreBehaviors[this.id];
          if (b && b.onUltimate) b.onUltimate(g.cores, 0, g.cores.params(this.id), s.me);
        },
      };
      // mặc định: mọi người đứng xa, bóng ở chân đồng đội
      s.place(s.mate, A.x - 150, A.y - 80, 0);
      s.place(s.me, A.x - 20, A.y, 0);
      s.place(s.o1, A.x + 170, A.y + 90, PI);
      s.place(s.o2, A.x + 200, A.y - 90, PI);
      s.give(s.mate);
      const team = this.scn.team || 0;
      g.cores.add(team, this.id);
      for (const id of this.scn.cores || []) g.cores.add(team, id);
      for (const id of this.scn.opp || []) g.cores.add(1 - team, id);
      if (this.scn.init) this.scn.init(s);
      this.cam = this.focusPt();
    }

    focusPt() {
      const f = this.scn.focus ? this.scn.focus(this.s) : this.s.me;
      return { x: f.x, y: f.y - 8 };
    }

    step() {
      const s = this.s, scn = this.scn;
      s.t += STEP;
      const at = scn.at || [];
      while (s.done < at.length && s.t >= at[s.done][0]) { at[s.done][1](s); s.done++; }
      if (scn.tick) scn.tick(s);
      s.g.update(STEP, null);
      s.g.events.length = 0;
      if (s.t >= (scn.len || 2.4)) this.reset();
    }

    draw(off, rend) {
      const w = this.cv.width, h = this.cv.height;
      const f = this.focusPt();
      this.cam.x += (f.x - this.cam.x) * 0.18;
      this.cam.y += (f.y - this.cam.y) * 0.18;
      rend.render(this.s.g);
      const sx = Math.round(U.clamp(this.cam.x - w / 2, 0, 640 - w)), sy = Math.round(U.clamp(this.cam.y - h / 2, 0, 360 - h));
      this.ctx.drawImage(off, sx, sy, w, h, 0, 0, w, h);
    }
  }

  // sắp mốc thời gian của mọi kịch bản (more có thể chen trước mốc chính)
  for (const k in SCENES) if (SCENES[k].at) SCENES[k].at.sort((a, b) => a[0] - b[0]);
  if (FALLBACK.at) FALLBACK.at.sort((a, b) => a[0] - b[0]);

  /* ---------- vòng lặp chung ---------- */
  const live = [];
  let off = null, rend = null, raf = 0, last = 0, acc = 0, sharedBg = null, frame = 0;

  function ensureRenderer() {
    if (rend) return;
    off = document.createElement('canvas');
    rend = Object.create(SFC.Renderer);
    rend.init(off);
    // nền sân dùng chung cho mọi ảnh (cùng 2 đội)
    const render = rend.render;
    rend.render = function (g) {
      if (!sharedBg) sharedBg = SFC.Background.build(g);
      this.bg = sharedBg; this.bgFor = g;
      return render.call(this, g);
    };
  }

  function loop(now) {
    raf = 0;
    for (let i = live.length - 1; i >= 0; i--) if (!live[i].cv.isConnected) live.splice(i, 1);
    if (!live.length) return;
    acc += Math.min(0.1, last ? (now - last) / 1000 : STEP);
    last = now;
    let n = 0;
    while (acc >= STEP && n < 6) { for (const p of live) p.step(); acc -= STEP; n++; }
    // vẽ 30 khung / giây (mô phỏng vẫn 60 bước / giây) — nhẹ cho trận đang chạy phía sau
    if ((frame++ & 1) === 0) for (const p of live) p.draw(off, rend);
    raf = requestAnimationFrame(loop);
  }

  const CorePreview = {
    SCENES,
    // gắn ảnh cho mọi canvas[data-preview] mới trong root
    scan(root) {
      if (!root) return;
      ensureRenderer();
      root.querySelectorAll('canvas[data-preview]').forEach((cv) => {
        if (cv._preview) return;
        const id = cv.dataset.preview;
        if (!SFC_CONFIG.cores.list[id]) return;
        try { cv._preview = new Preview(cv, id); live.push(cv._preview); } catch (e) { console.warn('CorePreview', id, e); }
      });
      if (live.length && !raf) { last = 0; raf = requestAnimationFrame(loop); }
    },
    // html canvas xem trước (w x h theo pixel của sân)
    html(id, w = 132, h = 58, cls = '') {
      return `<canvas class="cpv ${cls}" data-preview="${id}" width="${w}" height="${h}" style="width:${w}px;height:${h}px"></canvas>`;
    },
  };

  SFC.CorePreview = CorePreview;
})();
