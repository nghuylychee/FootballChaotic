/* Shorts capture director: injected after the real game boots. Drives the REAL game code (per-player Cores, p.res.ult). */
(function () {
  const U = SFC.U, Act = SFC.Actions, PI = Math.PI;
  const app = SFC.app;
  const B = (window.BRAG = { sfx: [], t: 0, stepT: 0, dir: null, timeline: [], done: 0, marks: {} });
  SFC_CONFIG.intro.enabled = false;

  // log every sound effect the game fires (drives the soundtrack's hit points)
  const sfx0 = SFC.Game.prototype.sfx;
  SFC.Game.prototype.sfx = function (name, arg) { if (!this.silent) B.sfx.push({ t: B.t, name }); return sfx0.call(this, name, arg); };

  // director runs after the AI each sim step: override intents of scripted players
  const ai0 = SFC.AI.update.bind(SFC.AI);
  SFC.AI.update = (dt, g) => { ai0(dt, g); B.stepT += dt; if (B.dir) B.dir(dt, g, B.stepT); };

  const place = (p, x, y, facing) => Object.assign(p, {
    x, y, vx: 0, vy: 0, kbx: 0, kby: 0, airZ: 0, airVz: 0, state: 'normal', stateT: 0, hitImmune: 0,
    facing: facing != null ? facing : p.team ? PI : 0,
  });
  const give = (g, p) => { g.ball.owner = null; g.gainPossession(p); };
  const face = (p, q) => { p.facing = Math.atan2(q.y - p.y, q.x - p.x); };
  const steer = (p, x, y, sprint) => { const d = U.norm(x - p.x, y - p.y); const k = Math.min(1, Math.hypot(x - p.x, y - p.y) / 12); p.intent.mx = d.x * k; p.intent.my = d.y * k; p.intent.sprint = !!sprint; };
  const still = (p) => { p.intent.mx = 0; p.intent.my = 0; p.intent.sprint = false; };
  const hush = () => { const el = document.getElementById('banner'); el.classList.remove('show'); el.innerHTML = ''; SFC.UI.clearToasts(); };
  const mark = (k) => { if (B.marks[k] == null) B.marks[k] = B.t; };

  function match(opts) {
    SFC.Profile.data.name = 'NGH';
    const look = Object.assign({}, SFC.Profile.data.look, { hair: 'spiky', fx: 'nofx' });
    app.startMatch(Object.assign({
      home: 'street_kings', away: 'neon_strikers', difficulty: 'hard', humanTeam: 0, solo: [1, null], noDraft: true, arena: B.arena,
      avatars: [{ name: 'NGH', look, role: 'FWD' }, null],
    }, opts));
    const g = app.game;
    g.state = 'play'; g.stateT = 0;
    B.puppets = new Set();
    g.aiHook = (p) => B.puppets.has(p);   // puppets skip the real AI entirely (director sets their intents)
    hush();
    return g;
  }
  const at = (t, fn) => B.timeline.push([t, fn]);
  const cast = (g) => { const [mate, me] = g.teams[0].players, [o1, o2] = g.teams[1].players; return { mate, me, o1, o2 }; };
  const ult = (g, p, id) => { g.cores.add(p, id); p.res.ult = 1; };

  const FPSV = 30, NOKEY = { wasPressed: () => false, isDown: () => false, down: () => false };
  B.frame = function (t) {
    B.t = t;
    while (B.done < B.timeline.length && t >= B.timeline[B.done][0]) { B.timeline[B.done][1](); B.done++; }
    const g = app.game;
    if (B.driveReveal && SFC.Reveal.active) SFC.Reveal.update(1 / FPSV, NOKEY);
    const f = B.focusFn ? B.focusFn(g) : null;
    return { focus: f ? { x: f.x, y: f.y } : null, state: g ? g.state : null, ball: g ? [Math.round(g.ball.x), Math.round(g.ball.y), Math.round(g.ball.z)] : null,
      score: g ? [g.teams[0].score, g.teams[1].score] : null, rem: g ? Math.round(g.remaining * 10) / 10 : null };
  };

  const SCENES = {
    /* normal-looking attack, then the dropkick into the wall */
    hook() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(me, 'heavy_boot'); g.cores.add(me, 'wall_slam');
      place(me, 250, 250, 0); place(mate, 150, 150, 0);
      place(o1, 400, 222, PI); place(o2, 540, 203, PI);
      give(g, o1);
      let kicked = false;
      B.dir = (dt, g, t) => {
        o1.intent.mx = -0.75; o1.intent.my = -0.1; o1.intent.sprint = false;
        if (!kicked) {
          steer(me, o1.x - 22, o1.y + 3, true);
          if (t > 0.45 && U.dist(me, o1) < 34) { face(me, o1); kicked = Act.hardAttack(g, me); if (kicked) mark('windup'); }
        } else if (me.state === 'normal') still(me);
      };
      B.focusFn = () => (kicked ? o1 : me);
    },

    /* "just a normal football game": calm one-twos, nobody fights */
    calm() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      place(me, 300, 230, 0); place(mate, 230, 170, 0); place(o1, 420, 190, PI); place(o2, 500, 240, PI);
      give(g, mate);
      const passes = [[0.25, mate, me], [1.35, me, mate], [2.45, mate, me], [3.55, me, mate]];
      let k = 0;
      B.dir = (dt, g, t) => {
        if (k < passes.length && t >= passes[k][0]) {
          const [, a, b] = passes[k];
          if (g.ball.owner === a) { Act.quickPass(g, a, b.x - a.x, b.y - a.y); k++; }
        }
        // everyone just jogs a little: nobody presses
        const drift = Math.sin(t * 1.3) * 0.18;
        for (const p of [o1, o2]) { p.intent.mx = drift * 0.6; p.intent.my = drift * 0.4; p.intent.sprint = false; }
        for (const p of [me, mate]) if (g.ball.owner !== p) { p.intent.mx = 0.12; p.intent.my = (p === me ? 0.05 : -0.05); p.intent.sprint = false; }
          else { p.intent.mx = 0.15; p.intent.my = 0; }
      };
      B.focusFn = () => g.ball;
    },

    /* punch the carrier (steal), then dropkick the second defender */
    punch_kick() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      place(me, 260, 205, 0); place(mate, 150, 250, 0); place(o1, 330, 205, PI); place(o2, 380, 175, PI);
      give(g, o1);
      B.puppets = new Set([o2]); o2.cd.light = o2.cd.hard = 99;
      let punched = false, kicked = false;
      B.dir = (dt, g, t) => {
        if (!punched) {
          o1.intent.mx = -0.45; o1.intent.my = 0; o1.intent.sprint = false;
          steer(me, o1.x - 16, o1.y, true);
          if (t > 0.3 && U.dist(me, o1) < 24) { face(me, o1); punched = Act.lightAttack(g, me); if (punched) mark('punch'); }
          steer(o2, o2.x - 5, o2.y + 2, false);
        } else if (!kicked) {
          if (me.state === 'normal') {
            steer(o2, me.x + 12, me.y - 3, true);
            if (t - B.marks.punch > 0.8 && U.dist(me, o2) < 30) { face(me, o2); kicked = Act.hardAttack(g, me); if (kicked) mark('kick'); }
            else if (g.ball.owner === me) { me.intent.mx = 0.25; me.intent.my = -0.1; }
          }
        } else if (me.state === 'normal') still(me);
      };
      B.focusFn = () => (kicked && B.t - B.marks.kick > 0.4 ? o2 : me);
    },

    /* Fireball Core: a charged shot becomes a fireball -> GOAL */
    fire_goal() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(me, 'fire_shot');
      const G = g.attackGoal(0);
      place(me, G.x - 190, G.y + 30, 0); place(mate, 250, 260, 0); place(o1, G.x - 120, G.y - 70, PI); place(o2, G.x - 20, G.y, PI);
      give(g, me);
      B.puppets = new Set([o2, o1]);
      let shot = false;
      B.dir = (dt, g, t) => {
        steer(o2, G.x - 22, G.y + 22, false); steer(o1, me.x + 40, me.y - 30, false);
        if (!shot) { me.intent.mx = 0.7; me.intent.my = -0.1; }
        if (!shot && t > 0.9) { Act.shoot(g, me, 1, -0.75); shot = true; mark('shot'); }
        else if (shot) still(me);
      };
      B.focusFn = () => (shot ? g.ball : me);
    },

    /* Meteor Shot ultimate -> GOAL */
    meteor_goal() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      ult(g, me, 'meteor_strike');
      place(me, 245, 206, 0); place(mate, 150, 150, 0); place(o1, 568, 203, PI); place(o2, 400, 262, PI);
      give(g, me);
      let fired = false;
      B.dir = (dt, g, t) => {
        if (!fired) { me.intent.mx = 0.6; me.intent.my = -0.1; }
        if (!fired && t > 0.35) { fired = g.cores.activateUltimate(me); if (fired) mark('ult'); }
      };
      B.focusFn = () => (fired ? g.ball : me);
    },

    /* Hundred Fists on the carrier, keep the ball, walk it in */
    fists_goal() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      ult(g, me, 'hundred_fists');
      place(me, 290, 190, 0); place(mate, 160, 250, 0); place(o1, 350, 185, PI); place(o2, 520, 230, PI);
      give(g, o1);
      const G = g.attackGoal(0);
      o2.cd.light = o2.cd.hard = 99;
      let fired = false, dodged = false, shot = false;
      B.puppets = new Set([o2]);
      B.dir = (dt, g, t) => {
        // keeper: holds the line, then rushes out at the carrier
        if (g.ball.owner === me && !dodged && G.x - me.x < 190) steer(o2, me.x + 6, me.y, true);
        else if (!dodged) steer(o2, G.x - 26, G.y + 6, false);
        else still(o2);
        if (!fired) { o1.intent.mx = -0.3; o1.intent.my = 0; }
        if (!fired && t > 0.3) { fired = g.cores.activateUltimate(me); if (fired) mark('ult'); }
        if (!fired || me.state !== 'normal') return;
        if (g.ball.owner !== me && !shot) { steer(me, g.ball.x, g.ball.y, false); return; }
        if (g.ball.owner === me && !shot) {
          mark('own');
          if (!dodged && U.dist(me, o2) < 40) { dodged = Act.skill(g, me, 0.35, -1) !== false; mark('skill'); return; }
          if (dodged && B.t - B.marks.skill > 0.35) { face(me, G); Act.shoot(g, me, 0.7, 0.1); shot = true; mark('shot'); return; }
          steer(me, G.x - 40, G.y - 8, B.t - B.marks.own > 0.8);
        } else if (shot) still(me);
      };
      B.focusFn = () => (shot ? g.ball : B.marks.own != null ? me : o1);
    },

    /* ---------- TAIL: ultimates + skills showcase ---------- */
    t_drop() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      ult(g, me, 'meteor_drop');
      place(me, 260, 205, 0); place(mate, 150, 150, 0); place(o1, 350, 210, PI); place(o2, 368, 188, PI);
      give(g, o1);
      B.puppets = new Set([o1, o2]);
      let fired = false;
      B.dir = (dt, g, t) => {
        if (!fired && t > 0.3) { fired = g.cores.activateUltimate(me); if (fired) mark('ult'); }
        if (me.state === 'meteor') steer(me, o1.x, o1.y);
        if (o1.state === 'normal') { o1.intent.mx = -0.3; o1.intent.my = 0; }
        if (o2.state === 'normal') { o2.intent.mx = -0.28; o2.intent.my = 0.05; }
      };
      B.focusFn = () => me;
    },
    t_titan() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      ult(g, me, 'titan');
      place(me, 250, 205, 0); place(mate, 150, 250, 0); place(o1, 330, 200, PI); place(o2, 390, 222, PI);
      give(g, me);
      B.puppets = new Set([o1, o2]); o1.cd.light = o1.cd.hard = o2.cd.light = o2.cd.hard = 99;
      let fired = false;
      B.dir = (dt, g, t) => {
        if (!fired && t > 0.25) { fired = g.cores.activateUltimate(me); if (fired) mark('ult'); }
        if (fired && t > 1.1) { me.intent.mx = 1; me.intent.my = 0; me.intent.sprint = true; } else still(me);
        for (const o of [o1, o2]) if (o.state === 'normal') steer(o, me.x + 20, me.y + (o === o1 ? -4 : 8));
      };
      B.focusFn = () => me;
    },
    t_lightning() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      ult(g, me, 'lightning_dash');
      place(me, 200, 205, 0); place(mate, 150, 280, 0); place(o1, 300, 200, PI); place(o2, 350, 212, PI);
      give(g, me);
      B.puppets = new Set([o1, o2]);
      let fired = false;
      B.dir = (dt, g, t) => {
        if (!fired) { me.intent.mx = 0.5; me.intent.my = 0; }
        else if (me.state === 'normal') { me.intent.mx = 0.6; me.intent.my = 0; }
        if (!fired && t > 0.3) { fired = g.cores.activateUltimate(me); if (fired) mark('ult'); }
        for (const o of [o1, o2]) if (o.state === 'normal') still(o);
      };
      B.focusFn = () => me;
    },
    t_aura() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      ult(g, me, 'aura_farming');
      place(me, 230, 205, 0); place(mate, 150, 260, 0); place(o1, 330, 190, PI); place(o2, 380, 225, PI);
      give(g, me);
      B.puppets = new Set([o1, o2]); o1.cd.light = o1.cd.hard = o2.cd.light = o2.cd.hard = 99;
      let fired = false;
      B.dir = (dt, g, t) => {
        if (!fired && t > 0.25) { fired = g.cores.activateUltimate(me); if (fired) mark('ult'); }
        if (fired && t > 1.0) { me.intent.mx = 0.95; me.intent.my = t < 1.6 ? -0.35 : 0.25; me.intent.sprint = true; } else still(me);
        for (const o of [o1, o2]) if (o.state === 'normal') steer(o, me.x + 30, me.y + (o === o1 ? -10 : 10), false);
      };
      B.focusFn = () => me;
    },
    t_blackhole() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(me, 'black_hole');
      const G = g.attackGoal(0);
      place(me, G.x - 170, G.y - 10, 0); place(mate, 250, 260, 0); place(o1, G.x - 70, G.y - 40, PI); place(o2, G.x - 90, G.y + 30, PI);
      give(g, me);
      B.puppets = new Set([o1, o2]); o1.cd.light = o1.cd.hard = o2.cd.light = o2.cd.hard = 99;
      let shot = false;
      B.dir = (dt, g, t) => {
        for (const o of [o1, o2]) if (o.state === 'normal') still(o);
        if (!shot) { me.intent.mx = 0.6; me.intent.my = 0; }
        if (!shot && t > 0.6) { Act.shoot(g, me, 1, 0.1); shot = true; mark('shot'); }
        else if (shot) still(me);
      };
      B.focusFn = () => (shot ? g.ball : me);
    },
    t_bomb() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(o1, 'bomb_ball');
      const st = g.cores.st(o1, 'bomb_ball');
      st.t = g.cores.params('bomb_ball').every - 0.05;
      place(o1, 330, 200, PI); place(me, 290, 185, 0); place(mate, 280, 225, 0); place(o2, 370, 210, PI);
      give(g, o1);
      B.puppets = new Set([o1, o2, mate]); for (const p of [o1, o2, mate]) p.cd.light = p.cd.hard = 99;
      let short = false;
      B.dir = (dt, g, t) => {
        if (!short && st.fuse > 0) { st.fuse = Math.min(st.fuse, 1.25); short = true; mark('fuse'); }
        o1.intent.mx = -0.15; o1.intent.my = 0.05;
        steer(me, o1.x - 14, o1.y - 6, false); steer(mate, o1.x - 12, o1.y + 10, false); steer(o2, o1.x + 14, o1.y + 4, false);
      };
      B.focusFn = () => g.ball;
    },

    /* the draft: pick a Core mid-match */
    draft() {
      SFC.Profile.data.name = 'NGH';
      app.startMatch({ home: 'street_kings', away: 'neon_strikers', difficulty: 'hard', humanTeam: 0, solo: [1, null], arena: B.arena });
      const g = app.game;
      at(0, () => {
        hush();
        if (g.state !== 'draft') g.startDraft(true);
        g.draft.options[g.me] = ['bomb_ball', 'hundred_fists', 'meteor_strike'];
        SFC.UI.draftSel = 0; SFC.UI.renderDraft(g); SFC.UI.show('draft');
      });
      at(0.9, () => SFC.UI.setDraftSel(1));
      at(1.5, () => SFC.UI.setDraftSel(2));
      at(2.3, () => { SFC.UI.pick(g, 2); });
    },

    /* Main Path map (locked Areas = silhouettes) */
    mainpath() {
      app.toMenu('home');
      SFC.Menu.go('path');
    },

    /* full-field AI vs AI chaos with stacks of Cores: outro plate */
    chaos() {
      const g = match({ humanTeam: -1, humans: [], solo: [null, null], avatars: null });
      const [a, b] = g.teams[0].players, [c, d] = g.teams[1].players;
      for (const [p, ids] of [[a, ['chaos_ball', 'street_fighter']], [b, ['fire_shot', 'heavy_boot']], [c, ['bomb_ball', 'uppercut']], [d, ['thunder_kick', 'sonic_boom']]])
        for (const id of ids) g.cores.add(p, id);
      document.getElementById('hud').classList.add('hidden');
      document.getElementById('abar') && document.getElementById('abar').classList.add('hidden');
      B.focusFn = () => g.ball;
    },

    /* ================= STEAM TRAILER ================= */
    /* one-two: pass to the mate, get it back in stride, shoot -> GOAL */
    combo_goal() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const G = g.attackGoal(0);
      place(me, G.x - 250, G.y + 34, 0); place(mate, G.x - 175, G.y - 52, 0); place(o1, G.x - 150, G.y + 40, PI); place(o2, G.x - 24, G.y, PI);
      give(g, me);
      B.puppets = new Set([o1, o2, mate]); for (const p of [o1, o2]) p.cd.light = p.cd.hard = 99;
      let k = 0;
      B.dir = (dt, g, t) => {
        if (o1.state === 'normal') steer(o1, me.x + 46, me.y - 6, false);
        if (o2.state === 'normal') steer(o2, G.x - 24, G.y + 16, false);
        if (k < 3) for (const q of [o1, o2]) g.ball.noPickup.set(q.id, 0.2);
        if (k === 0) { me.intent.mx = 0.55; me.intent.my = -0.05; steer(mate, G.x - 190, G.y - 56, false);
          if (t > 0.55 && g.ball.owner === me) { Act.quickPass(g, me, mate.x - me.x, mate.y - me.y); k = 1; mark('pass1'); } }
        else if (k === 1) { steer(me, G.x - 130, G.y + 20, true);
          if (g.ball.owner === mate) { mark('recv'); if (B.t - B.marks.recv > 0.2) { Act.quickPass(g, mate, me.x + 40 - mate.x, me.y + 6 - mate.y); k = 2; mark('pass2'); } }
          else steer(mate, g.ball.x, g.ball.y, false); }
        else if (k === 2) { steer(mate, G.x - 150, G.y - 70, false);
          if (g.ball.owner === me) { me.intent.mx = 0.8; me.intent.my = -0.1; if (G.x - me.x < 105 || B.t - B.marks.pass2 > 0.9) { face(me, G); Act.shoot(g, me, 0.85, -0.55); k = 3; mark('shot'); } }
          else steer(me, g.ball.x, g.ball.y, true); }
        else { still(me); steer(mate, G.x - 150, G.y - 70, false); }
      };
      B.focusFn = () => (B.marks.shot != null ? g.ball : { x: (g.ball.x * 2 + me.x) / 3, y: (g.ball.y * 2 + me.y) / 3 });
    },

    /* AI vs AI with Cores, HUD on (arena montage / online plate) */
    montage() {
      const g = match({ humanTeam: -1, humans: [], solo: [null, null], avatars: null });
      const [a, b] = g.teams[0].players, [c, d] = g.teams[1].players;
      for (const [p, ids] of [[a, ['fire_shot', 'street_fighter']], [b, ['heavy_boot', 'wall_slam']], [c, ['bomb_ball', 'uppercut']], [d, ['thunder_kick', 'sonic_boom']]])
        for (const id of ids) g.cores.add(p, id);
      g.elapsed = 40;
      B.focusFn = () => g.ball;
    },
    online() {
      const P = SFC.Profile.data;
      const g = match({ humanTeam: -1, humans: [], solo: [null, null], difficulty: 'hard',
        avatars: [{ name: 'NGH', look: Object.assign({}, P.look, { hair: 'spiky', fx: 'fire' }), role: 'FWD' },
                  { name: 'TUAN', look: Object.assign({}, P.look, { hair: 'afro', face: 'shades', fx: 'lightning', hairColor: 3 }), role: 'FWD' }] });
      const [a, b] = g.teams[0].players, [c, d] = g.teams[1].players;
      for (const [p, ids] of [[a, ['iron_fist', 'street_fighter']], [b, ['fire_shot', 'heavy_boot']], [c, ['uppercut', 'giant_fist']], [d, ['thunder_kick', 'flying_kick']]])
        for (const id of ids) g.cores.add(p, id);
      g.elapsed = 60;
      B.focusFn = () => g.ball;
    },

    /* Endless Tiki-Taka ult */
    t_tiki() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      ult(g, me, 'endless_tiki');
      place(me, 250, 205, 0); place(mate, 300, 150, 0); place(o1, 340, 200, PI); place(o2, 420, 230, PI);
      give(g, me);
      let fired = false;
      B.dir = (dt, g, t) => {
        if (!fired && t > 0.3) { fired = g.cores.activateUltimate(me); if (fired) mark('ult'); }
        if (!fired) still(me);
      };
      B.focusFn = () => g.ball;
    },

    /* Main Path map: progress up to Night Market, browse the Areas */
    path_map() {
      const MP = SFC.MainPath, P = SFC.Profile.data;
      P.path = Object.assign(MP.blank(), { area: 4, id: MP.area(4).id, div: 1, stars: 1, best: 4 * MP.nDiv() + 1, peak: 0, cores: [] });
      app.toMenu('home');
      SFC.Menu.pathView = 0;
      SFC.Menu.go('path');
      [0, 1, 2, 3, 4, 5].forEach((v, i) => at(0.15 + i * 0.42, () => { SFC.Menu.pathView = v; SFC.Menu.sel = 3; SFC.Menu.render(); }));
    },

    /* pre-match intro of a PROMOTION match vs the Area boss */
    vs_intro() {
      const MP = SFC.MainPath, P = SFC.Profile.data, a = 4;
      P.path = Object.assign(MP.blank(), { area: a, id: MP.area(a).id, div: MP.nDiv() - 1, stars: MP.need(a, MP.nDiv() - 1), best: a * MP.nDiv() + MP.nDiv() - 1, cores: [] });
      SFC_CONFIG.intro.enabled = true;
      app.toMenu('path');
      app.startMainPath();
    },

    /* CHAMPIONSHIP FINAL intro vs the last boss (World Stage) */
    vs_final() {
      const MP = SFC.MainPath, P = SFC.Profile.data, a = MP.areas().length - 1;
      P.path = Object.assign(MP.blank(), { area: a, id: MP.area(a).id, div: MP.nDiv() - 1, stars: MP.need(a, MP.nDiv() - 1), best: a * MP.nDiv() + MP.nDiv() - 1, cores: [] });
      SFC_CONFIG.intro.enabled = true;
      app.toMenu('path');
      app.startMainPath();
    },

    /* TCG card reveal: new Core unlocked */
    reveal() {
      app.toMenu('home');
      B.driveReveal = true;
      SFC.Reveal.open([{ kind: 'core', id: B.revealId || 'black_hole', src: 'star', area: 4, div: 1 }], () => {});
      at(0.75, () => SFC.Reveal.advance());
    },

    /* TEAM > SCOUT: plane flying over the pixel world map */
    scout_map() {
      app.toMenu('home');
      SFC.Mates.T.scout = null;
      SFC.Mates.startScout();
      SFC.Mates.T.scout.start = Date.now() - 6 * 60000;
      SFC.Team.open(SFC.Menu, 1);
    },
    scout_report() {
      app.toMenu('home');
      SFC.Mates.T.scout = null;
      SFC.Mates.startScout();
      SFC.Mates.T.scout.end = Date.now() - 1;
      SFC.Team.offerSel = 0;
      SFC.Menu.go('report');
      at(0.8, () => { SFC.Team.offerSel = 1; SFC.Audio.menu && SFC.Audio.menu(); SFC.Menu.render(); });
      at(1.6, () => { SFC.Team.offerSel = 2; SFC.Audio.menu && SFC.Audio.menu(); SFC.Menu.render(); });
    },

    /* SHOP: Legend box reel spin */
    gacha() {
      const P = SFC.Profile;
      P.data.gold = 99999;
      app.toMenu('home');
      SFC.Gacha.shopBack = 'home';
      SFC.Menu.go('shop');
      SFC.Gacha.boxSel = 1;
      SFC.Menu.render();
      SFC_CONFIG.progression.reelTime = 2.0;
      at(0.3, () => SFC.Gacha.openBox(SFC.Menu, 'legend'));
    },

    /* CHARACTER: cycle costume combos */
    custom() {
      const P = SFC.Profile;
      const LOOKS = [
        { hair: 'crown', face: 'lasereyes', shoes: 'flame', fx: 'aura', hairColor: 3 },
        { hair: 'cowboy', face: 'shades', shoes: 'rollers', fx: 'coins', hairColor: 1 },
        { hair: 'viking', face: 'skull', shoes: 'rocket', fx: 'fire', hairColor: 5 },
        { hair: 'afro', face: 'clown', shoes: 'rainbowkick', fx: 'rainbow', hairColor: 7 },
        { hair: 'halo', face: 'visor', shoes: 'iceboot', fx: 'galaxy', hairColor: 4 },
        { hair: 'headphones', face: 'goldtooth', shoes: 'goldboot', fx: 'lightning', hairColor: 6 },
        { hair: 'flamehair', face: 'ninja', shoes: 'neonkick', fx: 'neon', hairColor: 0 },
        { hair: 'santa', face: 'monocle', shoes: 'camo', fx: 'snow', hairColor: 2 },
      ];
      const wear = (i) => { P.data.look = Object.assign({}, P.data.look, LOOKS[i % LOOKS.length]); SFC.Menu.render(); };
      app.toMenu('home');
      SFC.Menu.go('char');
      wear(0);
      for (let i = 1; i < 14; i++) at(i * 0.32, () => wear(i));
    },

    /* ONLINE lobby: friends drop into the 4 slots -> VERSUS */
    lobby() {
      const O = SFC.Online;
      app.toMenu('home');
      Object.assign(O, { role: 'host', status: 'lobby', code: 'K7Q2X' });
      const me = { id: 'host', pf: O.myPf(), slot: 1 };
      Object.defineProperty(O, 'mine', { get: () => me, configurable: true });
      const pf = (name, level, ovr, look) => Object.assign(O.myPf(), { name, level, ovr, look: Object.assign({}, O.myPf().look, look) });
      const join = [
        { id: 'g1', pf: pf('MAI', 9, 63, { cut: 'bun' }), slot: 0 },
        { id: 'g2', pf: pf('TUAN', 14, 66, { cut: 'afro' }), slot: 3 },
        { id: 'g3', pf: pf('LINH', 7, 61, { cut: 'cap' }), slot: 2 },
      ];
      O.lobby = { members: [me] };
      SFC.Menu.go('lobby');
      join.forEach((m, i) => at(0.35 + i * 0.5, () => { O.lobby.members.push(m); SFC.Audio.menu && SFC.Audio.menu(); SFC.Menu.render(); }));
    },

    /* C1: free goal at the death... then a dropkick from off-screen */
    c1_dropkicked() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(o1, 'heavy_boot'); g.cores.add(o1, 'wall_slam');
      g.teams[0].score = 2; g.teams[1].score = 2;
      g.elapsed = g.cfg.match.duration - 7.0; g.finalPush = true; g.cfg.match.goldenGoal = false;
      for (const p of [mate, o2]) p.cd.light = p.cd.hard = 99;
      place(me, 200, 215, 0); place(mate, 120, 280, 0); place(o1, 70, 250, 0); place(o2, 140, 120, PI);
      give(g, me);
      let kicked = false;
      B.dir = (dt, g, t) => {
        if (!kicked) {
          if (g.ball.owner === me) { me.intent.mx = 0.72; me.intent.my = -0.02; me.intent.sprint = false; }
          if (t > 0.6) steer(o1, me.x - 24, me.y + 14, true); else still(o1);
          if (U.dist(me, o1) < 32 && t > 2.4) { face(o1, me); kicked = Act.hardAttack(g, o1); if (kicked) mark('kick'); }
          steer(o2, 160, 140, false); steer(mate, 150, 270, false);
        } else {
          // o1 strolls off with the ball while the clock runs out; nobody else bothers
          if (g.ball.owner === o1) { o1.intent.mx = -0.5; o1.intent.my = 0.08; o1.intent.sprint = false; }
          else if (o1.state === 'normal' && B.t - B.marks.kick > 0.6) steer(o1, g.ball.x, g.ball.y, false);
          steer(o2, 200, 150, false); steer(mate, 170, 280, false);
        }
      };
      B.focusFn = () => me;
    },

    /* C2: down 2-3, 10s left, FINAL PUSH (goals x2): punch steal -> ult up -> Clone Army -> goal */
    c2_clutch() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(me, 'clone_army'); me.res.ult = 0.9;
      g.teams[0].score = 2; g.teams[1].score = 3;
      g.elapsed = g.cfg.match.duration - (B.c2rem || 5.8);
      for (const p of [mate, o2]) p.cd.light = p.cd.hard = 99;
      const G = g.attackGoal(0);
      place(me, 290, 200, 0); place(mate, 200, 260, 0); place(o1, 345, 196, PI); place(o2, G.x - 40, G.y, PI);
      give(g, o1);
      let punched = false, fired = false, shot = false;
      B.puppets = new Set([o1, o2, mate]);
      B.dir = (dt, g, t) => {
        if (!punched) {
          o1.intent.mx = -0.4; o1.intent.my = 0;
          if (t > 0.9) steer(me, o1.x - 16, o1.y, true); else still(me);
          if (t > 1.2 && U.dist(me, o1) < 24) { face(me, o1); punched = Act.lightAttack(g, me); if (punched) mark('punch'); }
          return;
        }
        o1.cd.light = o1.cd.hard = 99;
        if (B.marks.own == null) for (const q of [o1, o2, mate]) g.ball.noPickup.set(q.id, 1);
        if (o1.state === 'normal') still(o1);
        if (fired) steer(o2, G.x - 26, G.y + 34, true);   // keeper bites on a decoy
        else steer(o2, G.x - 22, G.y + Math.sin(t * 2) * 6, false);
        steer(mate, 260, 270, false);
        if (me.state !== 'normal') return;
        if (!fired) {
          if (g.ball.owner !== me) { steer(me, g.ball.x, g.ball.y, false); return; }
          mark('own');
          me.intent.mx = 0.5; me.intent.my = 0;
          if (B.t - B.marks.own > 0.5 && !g.cores.ultReady(me)) me.res.ult = 1;
          if (B.t - B.marks.own > 1.0 && g.cores.ultReady(me)) { fired = g.cores.activateUltimate(me); if (fired) mark('ult'); }
          return;
        }
        if (!shot && g.ball.owner === me) {
          if (G.x - me.x > 70) steer(me, G.x - 60, G.y + 22, true);
          else { face(me, G); Act.shoot(g, me, 0.95, -0.9); shot = true; mark('shot'); }
        } else if (shot) still(me);
      };
      B.focusFn = () => (shot ? g.ball : me);
    },
  };

  B.setup = (name, arena) => { B.arena = arena || 'street'; B.timeline.length = 0; B.done = 0; B.dir = null; B.focusFn = null; B.stepT = 0; SCENES[name](); B.timeline.sort((a, b) => a[0] - b[0]); };
  B.SCENES = SCENES;
})();
