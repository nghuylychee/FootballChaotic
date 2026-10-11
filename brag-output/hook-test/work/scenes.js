/* Hook-test director: injected after the real game boots by ../../tools/clip-pack/capture.py.
   Scenes from ../../clips/work/scenes.js + ../../work/shorts_scenes.js, plus the hook-test echoes and staged skits below.
   Raw footage: no captions, HUD kept. Logs every sfx (with arg) + goal roars so the soundtrack is the game's own. */
(function () {
  const U = SFC.U, Act = SFC.Actions, PI = Math.PI;
  const app = SFC.app;
  const B = (window.BRAG = { sfx: [], t: 0, stepT: 0, dir: null, timeline: [], done: 0, marks: {} });
  SFC_CONFIG.intro.enabled = false;

  const sfx0 = SFC.Game.prototype.sfx;
  SFC.Game.prototype.sfx = function (name, arg) { if (!this.silent) B.sfx.push({ t: B.t, name, arg: arg == null ? null : arg }); return sfx0.call(this, name, arg); };

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
  const noAttack = (...ps) => { for (const p of ps) p.cd.light = p.cd.hard = 99; };
  // extra bodies on a team (bowling pins...): real Player objects, puppeted by the director
  const extra = (g, ti, n) => { const T = g.teams[ti], out = []; for (let k = 0; k < n; k++) { const p = new SFC.Player(g, T, 'DEF', T.players.length); T.players.push(p); if (g.players && !g.players.includes(p)) g.players.push(p); out.push(p); } return out; };
  const t0focus = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  // S1: one player may hit his own teammates (the director sets B.traitor)
  const inFront0 = Act.inFront;
  Act.inFront = function (g, p, range, arcDeg, air = false) {
    if (B.traitor !== p) return inFront0.call(this, g, p, range, arcDeg, air);
    const fx = Math.cos(p.facing), fy = Math.sin(p.facing), cosArc = Math.cos((arcDeg * Math.PI) / 180);
    return g.teams[p.team].players.filter((o) => { if (o === p) return false; const dx = o.x - p.x, dy = o.y - p.y, d = Math.hypot(dx, dy) || 1;
      return o.airZ <= 0 && d <= range + p.radius + o.radius && (dx * fx + dy * fy) / d >= cosArc; });
  };

  function match(opts) {
    SFC.Profile.data.name = 'NGH';
    const look = Object.assign({}, SFC.Profile.data.look, { hair: 'spiky', fx: 'nofx' });
    app.startMatch(Object.assign({
      home: 'street_kings', away: 'neon_strikers', difficulty: 'hard', humanTeam: 0, solo: [1, null], noDraft: true,
      avatars: [{ name: 'NGH', look, role: 'FWD' }, null],
    }, opts));
    const g = app.game;
    g.state = 'play'; g.stateT = 0;
    B.puppets = new Set();
    g.aiHook = (p) => B.puppets.has(p);
    hush();
    return g;
  }
  const cast = (g) => { const [mate, me] = g.teams[0].players, [o1, o2] = g.teams[1].players; return { mate, me, o1, o2 }; };
  const ult = (g, p, id) => { g.cores.add(p, id); p.res.ult = 1; };
  const at = (t, fn) => B.timeline.push([t, fn]);

  // helpers for the batch files (scenes_*.js add scenes with Object.assign(BRAG.SCENES, {...}) using these)
  B.lib = { U, Act, PI, app, place, give, face, steer, still, hush, mark, match, cast, ult, at, noAttack, extra, t0focus };

  B.frame = function (t) {
    B.t = t;
    while (B.done < B.timeline.length && t >= B.timeline[B.done][0]) { B.timeline[B.done][1](); B.done++; }
    const g = app.game;
    if (g && g.state === 'goal' && B.prevState !== 'goal') { B.sfx.push({ t, name: 'crowdRoar', arg: 0.3 }); mark('goal'); }
    B.prevState = g && g.state;
    const f = B.focusFn ? B.focusFn(g) : null;
    return { focus: f ? { x: f.x, y: f.y - (f.airZ || 0) - (f.z || 0) * 0.5 } : null, state: g ? g.state : null,
      score: g ? [g.teams[0].score, g.teams[1].score] : null };
  };

  const SCENES = {
    /* METEOR from the centre circle: jump, fireball hangs, full-length strike at the goal (seed decides goal vs keeper blast) */
    meteor_mid() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      ult(g, me, 'meteor_strike');
      place(me, 245, 206, 0); place(mate, 150, 150, 0); place(o1, 568, 203, PI); place(o2, 400, 262, PI);
      give(g, me);
      let fired = false;
      B.dir = (dt, g, t) => {
        if (!fired) { me.intent.mx = 0.6; me.intent.my = -0.1; }
        else still(me);
        if (!fired && t > 0.35) { fired = g.cores.activateUltimate(me); if (fired) mark('ult'); }
      };
      B.focusFn = () => (fired && B.t - B.marks.ult > 0.9 ? g.ball : me);
    },

    /* METEOR on the angle from the right channel: keeper set on the line, defender too late */
    meteor_angle() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      ult(g, me, 'meteor_strike');
      const G = g.attackGoal(0);
      place(me, G.x - 340, G.y + 85, 0); place(mate, G.x - 430, G.y - 60, 0); place(o1, G.x - 230, G.y + 40, PI); place(o2, G.x - 24, G.y, PI);
      give(g, me);
      B.puppets = new Set([o1, o2]); noAttack(o1, o2);
      let fired = false;
      B.dir = (dt, g, t) => {
        steer(o2, G.x - 24, G.y + Math.sin(t * 2.4) * 10, false);
        if (o1.state === 'normal') steer(o1, me.x + 30, me.y - 10, true);
        if (!fired) { me.intent.mx = 0.5; me.intent.my = -0.15; }
        else still(me);
        if (!fired && t > 0.5) { fired = g.cores.activateUltimate(me); if (fired) mark('ult'); }
      };
      B.focusFn = () => (fired && B.t - B.marks.ult > 0.9 ? g.ball : me);
    },

    /* AURA FARMING, the meme version: ult, then just stand there glowing while the defender freezes... then cook him */
    aura_pose() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      ult(g, me, 'aura_farming');
      const G = g.attackGoal(0);
      place(me, G.x - 330, G.y + 10, 0); place(mate, G.x - 450, G.y + 80, 0); place(o1, G.x - 200, G.y - 10, PI); place(o2, G.x - 24, G.y, PI);
      give(g, me);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2);
      let fired = false, shot = false;
      const GO = 3.0;   // seconds of pure aura before he moves
      B.dir = (dt, g, t) => {
        steer(mate, G.x - 450, G.y + 80, false);
        if (!fired && t > 0.4) { fired = g.cores.activateUltimate(me); if (fired) mark('ult'); }
        // defender walks up, then stops dead a few steps away
        if (t < GO + 0.2) { if (U.dist(o1, me) > 62) steer(o1, me.x + 55, me.y, false); else { still(o1); face(o1, me); } }
        else still(o1);
        steer(o2, shot ? G.x - 24 : G.x - 24, shot ? G.y + 40 : G.y + Math.sin(t * 2) * 6, shot);
        if (t < GO) { still(me); face(me, o1); return; }
        if (me.state !== 'normal') return;
        mark('go');
        if (!shot && g.ball.owner === me) {
          if (me.x < o1.x + 20) steer(me, o1.x + 30, o1.y - 55, true);   // swing around him
          else if (G.x - me.x > 150) steer(me, G.x - 140, G.y - 20, true);
          else { face(me, G); Act.shoot(g, me, 1, -0.6); shot = true; mark('shot'); }
        } else still(me);
      };
      B.focusFn = () => (shot && B.t - B.marks.shot > 0.15 ? g.ball : me);
    },

    /* AURA FARMING, the run: ult on the move, gold hair, blow past two defenders with a Z dodge, finish */
    aura_run() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      ult(g, me, 'aura_farming');
      const G = g.attackGoal(0);
      place(me, 260, 205, 0); place(mate, 170, 270, 0); place(o1, 400, 200, PI); place(o2, G.x - 24, G.y, PI);
      give(g, me);
      B.puppets = new Set([o1, o2]); noAttack(o1, o2);
      let fired = false, dodged = false, shot = false;
      B.dir = (dt, g, t) => {
        if (!fired && t > 0.3) { fired = g.cores.activateUltimate(me); if (fired) mark('ult'); }
        if (o1.state === 'normal') { if (!dodged) steer(o1, me.x + 14, me.y, true); else still(o1); }
        const rush = g.ball.owner === me && G.x - me.x < 220;
        if (shot) steer(o2, G.x - 22, G.y - 36, true);
        else if (rush) steer(o2, me.x + 10, me.y, true);
        else steer(o2, G.x - 24, G.y, false);
        if (me.state !== 'normal' || !fired) { if (!fired) { me.intent.mx = 0.4; me.intent.my = 0; } return; }
        if (shot || g.ball.owner !== me) { if (!shot && g.ball.owner == null) steer(me, g.ball.x, g.ball.y, true); else still(me); return; }
        if (!dodged && U.dist(me, o1) < 34) { dodged = Act.skill(g, me, 0.5, -1) !== false; mark('dodge'); return; }
        if (G.x - me.x > 130) { steer(me, G.x - 120, G.y + 25, true); return; }
        face(me, G); Act.shoot(g, me, 1, -0.8); shot = true; mark('shot');
      };
      B.focusFn = () => (shot && B.t - B.marks.shot > 0.15 ? g.ball : me);
    },

    /* HUNDRED FISTS, the fight: stand-off with the carrier by the top wall, rush, 20 punches, finisher blasts him into the wall */
    fists_wall() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      ult(g, me, 'hundred_fists');
      place(me, 300, 125, 0); place(mate, 180, 260, 0); place(o1, 360, 125, PI); place(o2, 560, 200, PI);
      give(g, o1);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2);
      let fired = false, slam = null;
      B.dir = (dt, g, t) => {
        steer(mate, 180, 260, false); steer(o2, 560, 200, false);
        if (!fired) { still(me); face(me, o1); if (o1.state === 'normal') { still(o1); face(o1, me); } }
        if (!fired && t > 1.0) { fired = g.cores.activateUltimate(me); if (fired) mark('ult'); }
        if (fired && me.state === 'normal') still(me);
        if (fired && o1.state === 'normal') still(o1);
        if (B.marks.ult != null && !slam && o1.y <= g.field.y + o1.radius + 2) { slam = { x: o1.x, y: o1.y + 30 }; mark('slam'); }
      };
      B.focusFn = () => slam || o1;   // camera parks on the wall crack once he hits it
    },

    /* HUNDRED FISTS, the steal: combo on the carrier, keep the ball, dodge the keeper, walk it in (from ../../work/shorts_scenes.js fists_goal) */
    fists_goal() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      ult(g, me, 'hundred_fists');
      place(me, 290, 190, 0); place(mate, 160, 250, 0); place(o1, 350, 185, PI); place(o2, 520, 230, PI);
      give(g, o1);
      const G = g.attackGoal(0);
      noAttack(o2);
      let fired = false, dodged = false, shot = false;
      B.puppets = new Set([o2]);
      B.dir = (dt, g, t) => {
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
      app.startMatch({ home: 'street_kings', away: 'neon_strikers', difficulty: 'hard', humanTeam: 0, solo: [1, null] });
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
    /* ---------- HOOK-TEST ---------- */
    /* G10 JUGGLE: a punch pops him up, then every punch keeps him in the air (2 HIT, 3 HIT, ... 10 HIT) */
    juggle() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(me, 'juggle');
      place(me, 300, 212, 0); place(mate, 170, 270, 0); place(o1, 316, 212, PI); place(o2, 540, 150, PI);
      give(g, o1);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate);
      for (const q of [o1, o2, mate]) g.ball.noPickup.set(q.id, 99);
      let first = false, popped = false;
      B.dir = (dt, g, t) => {
        steer(mate, 170, 270, false); steer(o2, 540, 150, false);
        if (o1.state === 'normal' && !first) still(o1);
        if (first && !popped && o1.state === 'stun') {
          popped = true; mark('pop');
          o1.airVz = 250; o1.airZ = Math.max(o1.airZ, 1); o1.kbx = o1.kby = 0;
          g.effects.comic(o1.x, o1.y - 30, 'UPPERCUT!', '#ff7a3d', 1.2, 0.6);
        }
        // keep him pinned right in front of the puncher while he's up
        if (popped && o1.airZ > 0) { o1.x = me.x + 13; o1.y = me.y; o1.kbx = o1.kby = 0; o1.vx = o1.vy = 0; o1.stateT = Math.max(o1.stateT, 0.5); }
        if (me.state !== 'normal') return;
        me.cd.light = 0; still(me); face(me, o1);
        if (!first) { if (t > 0.35 && Act.lightAttack(g, me)) { first = true; mark('punch'); } return; }
        if (popped && o1.airZ > 4 && o1.airZ < 40 && o1.airVz < 60 && (o1.juggleN || 1) < 12 && Act.lightAttack(g, me)) mark('juggle');
      };
      B.focusFn = () => ({ x: me.x + 7, y: me.y - 16 });
    },

    /* G5 BLACK HOLE, slow: a long shot turns into a black hole that drags both defenders into the net with it */
    g_blackhole() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(me, 'black_hole');
      const G = g.attackGoal(0);
      place(me, G.x - 250, G.y + 4, 0); place(mate, 200, 270, 0); place(o1, G.x - 150, G.y - 34, PI); place(o2, G.x - 110, G.y + 36, PI);
      give(g, me);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate);
      let shot = false;
      B.dir = (dt, g, t) => {
        steer(mate, 200, 270, false);
        const b = g.ball;
        if (!shot) { for (const o of [o1, o2]) { still(o); face(o, me); } me.intent.mx = 0.5; me.intent.my = 0; }
        if (!shot && t > 0.6) { face(me, G); Act.shoot(g, me, 1, 0); shot = true; mark('shot'); return; }
        if (!shot) return;
        still(me);
        // the black hole crawls toward goal and everything near it gets dragged along
        if (b.x < G.x + 4 && B.marks.goal == null) { b.owner = null; b.vx = B.t - B.marks.shot < 0.25 ? Math.max(b.vx * 0.9, 95) : 95; b.vy = (G.y - b.y) * 1.2; b.z = Math.min(b.z, 2); }
        for (const o of [o1, o2]) {
          b.noPickup.set(o.id, 99);
          const d = Math.hypot(b.x - o.x, b.y - o.y);
          if (d < 90 && b.x < G.x) { o.state = o.state === 'normal' ? 'stun' : o.state; o.stateT = Math.max(o.stateT, 0.4); o.x += (b.x - o.x) * Math.min(1, dt * 3.2); o.y += (b.y - o.y) * Math.min(1, dt * 3.2); o.facing += dt * 14; }
        }
      };
      B.focusFn = () => (shot ? { x: g.ball.x - 20, y: g.ball.y } : me);
    },

    /* R1 echo: one giant punch by the wall, he flips backwards into it */
    echo_punch() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(me, 'giant_fist'); me.res.rage = 5;
      const F0 = g.field;
      place(me, 300, F0.y + 40, 0); place(o1, 318, F0.y + 40, PI); place(mate, 170, 270, 0); place(o2, 520, 230, PI);
      give(g, o1);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate);
      let punched = false;
      B.dir = (dt, g, t) => {
        steer(mate, 170, 270, false); steer(o2, 520, 230, false);
        if (!punched) { if (o1.state === 'normal') { still(o1); face(o1, me); } still(me); face(me, o1); me.res.rage = 5; me.cd.light = 0;
          if (t > 0.45 && Act.lightAttack(g, me)) { punched = true; mark('punch'); } return; }
        if (o1.state === 'stun' && B.marks.fly == null) { mark('fly'); o1.kbx = 300; o1.kby = 60; o1.airVz = Math.max(o1.airVz, 230); g.effects.comic(o1.x, o1.y - 30, 'POW!!', '#ffcf3f', 1.4, 0.7); }
        if (me.state === 'normal') still(me);
      };
      B.focusFn = () => (B.marks.fly != null ? t0focus(me, o1) : me);
    },

    /* R5 echo: the smallest shoulder bump... and he flies across the pitch */
    echo_bump() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      place(me, 196, 212, 0); place(o1, 212, 200, 0); place(mate, 140, 280, 0); place(o2, 540, 150, PI);
      give(g, o1);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate);
      for (const q of [o1, o2, mate]) g.ball.noPickup.set(q.id, 99);
      let bumped = false;
      B.dir = (dt, g, t) => {
        steer(mate, 140, 280, false); steer(o2, 540, 150, false);
        if (!bumped) {
          if (g.ball.owner === o1) { o1.intent.mx = 0.45; o1.intent.my = 0; o1.intent.sprint = false; }
          steer(me, o1.x - 2, o1.y + 10, true);
          if (t > 0.75 && U.dist(me, o1) < 20) {
            bumped = true; mark('bump');
            o1.hit({ stun: 2.5, kbx: 520, kby: -20, launch: 170, source: me, type: 'hard' });
            g.effects.comic(o1.x, o1.y - 26, 'BUMP', '#ffffff', 0.8, 0.5); g.effects.flash(0.3); g.effects.shake(5, 0.3);
          }
          return;
        }
        if (me.state === 'normal') { if (g.ball.owner === me) { me.intent.mx = 0.3; me.intent.my = 0; } else steer(me, g.ball.x, g.ball.y, false); }
      };
      B.focusFn = () => (B.marks.bump != null && B.t - B.marks.bump > 0.15 ? o1 : me);
    },

    /* R9 echo: pure aura. He charges in... and collapses before he even touches him */
    aura_faint() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      ult(g, me, 'aura_farming');
      place(me, 330, 205, 0); place(o1, 420, 160, PI); place(mate, 200, 270, 0); place(o2, 560, 200, PI);
      give(g, me);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate);
      let fired = false, fell = false;
      B.dir = (dt, g, t) => {
        steer(mate, 200, 270, false); steer(o2, 560, 200, false);
        still(me); face(me, o1);
        if (!fired && t > 0.1) { fired = g.cores.activateUltimate(me); if (fired) mark('ult'); }
        if (!fell && o1.state === 'normal') steer(o1, me.x + 4, me.y, t > 0.9);
        if (!fell && t > 0.9 && U.dist(me, o1) < 24) {
          fell = true; mark('faint');
          o1.hit({ stun: 3, kbx: 70, kby: 50, launch: 70, source: me, type: 'light' });
          g.effects.comic(o1.x, o1.y - 28, '*faints*', '#ffe14f', 1.0, 1.0);
        }
      };
      B.focusFn = () => t0focus(me, o1);
    },

    /* S1 POV: you didn't pass. Your own teammate dropkicks you and takes the ball */
    nopass() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(mate, 'heavy_boot');
      const G = g.attackGoal(0);
      place(me, 250, 215, 0); place(mate, 270, 165, 0); place(o1, 430, 205, PI); place(o2, G.x - 22, G.y, PI);
      give(g, me);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2);
      for (const q of [o1, o2]) g.ball.noPickup.set(q.id, 99);
      B.traitor = mate;
      let kicked = false, shot = false;
      at(0.55, () => g.effects.comic(mate.x, mate.y - 24, 'PASS!', '#ffffff', 0.9, 0.7));
      at(1.35, () => g.effects.comic(mate.x, mate.y - 24, 'PASS!!', '#ffffff', 1.0, 0.7));
      at(2.05, () => g.effects.comic(mate.x, mate.y - 24, 'PASS!!!', '#ff3d5a', 1.15, 0.7));
      B.dir = (dt, g, t) => {
        steer(o2, G.x - 22, G.y + Math.sin(t * 2) * 8, false);
        if (o1.state === 'normal') steer(o1, o1.x - 2, o1.y, false);
        if (!kicked) {
          if (g.ball.owner === me) { me.intent.mx = 0.55; me.intent.my = -0.02; me.intent.sprint = false; }
          if (t < 2.3) steer(mate, me.x + 20, 165, false);
          else { steer(mate, me.x - 2, me.y - 18, true); if (U.dist(mate, me) < 30 && mate.state === 'normal') { face(mate, me); kicked = Act.hardAttack(g, mate); if (kicked) mark('kick'); } }
          return;
        }
        if (me.state === 'normal') still(me);
        if (mate.state !== 'normal' || shot) { if (shot) still(mate); return; }
        if (g.ball.owner !== mate) { steer(mate, g.ball.x, g.ball.y, true); return; }
        mark('own');
        if (G.x - mate.x > 120) { steer(mate, G.x - 110, G.y - 10, true); return; }
        face(mate, G); Act.shoot(g, mate, 1, -0.7); shot = true; mark('shot');
      };
      B.focusFn = () => (shot ? g.ball : kicked && B.marks.own != null ? mate : me);
    },

    /* S2 PENALTY: walk past the ball, dropkick the keeper into the net, tap it in */
    penalty() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(me, 'heavy_boot');
      const G = g.attackGoal(0);
      place(me, G.x - 112, G.y + 4, 0); place(mate, G.x - 170, G.y + 70, 0); place(o1, G.x - 170, G.y - 70, PI); place(o2, G.x - 16, G.y, PI);
      g.ball.owner = null; g.ball.x = G.x - 66; g.ball.y = G.y; g.ball.z = 0; g.ball.vx = g.ball.vy = 0;
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate);
      for (const q of [me, o1, o2, mate]) g.ball.noPickup.set(q.id, 99);
      let kicked = false, back = false, shot = false;
      at(0.3, () => g.sfx('whistle'));
      B.dir = (dt, g, t) => {
        steer(mate, G.x - 170, G.y + 70, false); steer(o1, G.x - 170, G.y - 70, false);
        if (!kicked) {
          if (o2.state === 'normal') { steer(o2, G.x - 16, G.y + Math.sin(t * 5) * 9, false); face(o2, me); }
          if (t < 1.0) { still(me); face(me, o2); return; }
          steer(me, o2.x - 20, o2.y, false);
          if (U.dist(me, o2) < 32 && me.state === 'normal') { face(me, o2); kicked = Act.hardAttack(g, me); if (kicked) mark('kick'); }
          return;
        }
        if (o2.state === 'normal') still(o2);
        if (me.state !== 'normal' || shot) { if (shot) still(me); return; }
        if (!back) { if (B.t - B.marks.kick < 1.2) { still(me); face(me, o2); return; } back = true; mark('back'); g.ball.noPickup.set(me.id, 0); }
        if (g.ball.owner !== me) { steer(me, g.ball.x - 8, g.ball.y, false); return; }
        mark('own');
        if (B.t - B.marks.own < 0.5) { me.intent.mx = 0.2; me.intent.my = 0; return; }
        face(me, G); Act.shoot(g, me, 0.25, 0); shot = true; mark('shot');
      };
      B.focusFn = () => (shot ? g.ball : kicked && !back ? o2 : me);
    },

    /* S3 CHICKEN: the shot turns into a chicken mid-air, the keeper dives out of the way */
    chicken() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const G = g.attackGoal(0);
      place(me, G.x - 250, G.y + 6, 0); place(mate, 250, 260, 0); place(o1, G.x - 120, G.y - 80, PI); place(o2, G.x - 20, G.y, PI);
      give(g, me);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate);
      let shot = false, turned = false;
      B.dir = (dt, g, t) => {
        steer(mate, 250, 260, false); if (o1.state === 'normal') steer(o1, G.x - 130, G.y - 80, false);
        if (!shot) { me.intent.mx = 0.6; me.intent.my = -0.05; steer(o2, G.x - 20, G.y + Math.sin(t * 3) * 8, false); }
        if (!shot && t > 0.8) { face(me, G); Act.shoot(g, me, 0.45, 0); shot = true; mark('shot'); return; }
        if (!shot) return;
        still(me);
        const b = g.ball;
        if (!turned && B.t - B.marks.shot > 0.15) {
          turned = true; mark('chicken'); b.skin = 'chicken';
          g.effects.burst(b.x, b.y, 6, '#ffffff', 16, 90, 0.5);
          g.effects.comic(b.x, b.y - 20, 'BAWK!', '#ffffff', 1.1, 0.8);
          g.sfx('whoosh');
        }
        // a chicken flies slow and wobbly
        if (turned && b.x < G.x + 6) { b.vx = 118; b.vy = (G.y + 4 - b.y) * 1.2; b.z = 9 + Math.abs(Math.sin(B.t * 9)) * 7; b.vz = 0; }
        if (turned && B.marks.nope == null && G.x - b.x < 75) { mark('nope'); g.effects.comic(o2.x, o2.y - 26, 'NOPE!', '#ffe14f', 1.1, 0.8); }
        if (B.marks.nope != null) { steer(o2, G.x - 30, G.y + 60, true); b.noPickup.set(o2.id, 99); }
        else if (turned) { still(o2); face(o2, b); }
      };
      B.focusFn = () => (shot ? g.ball : me);
    },

    /* S4 BOWLING: 6 defenders set up like pins, a bowling ball, STRIKE */
    bowling() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const G = g.attackGoal(0);
      const pins = [o1, o2, ...extra(g, 1, 4)];
      const spots = [[0, 0], [16, -9], [16, 9], [32, -18], [32, 0], [32, 18]];
      const px0 = G.x - 110;
      pins.forEach((q, k) => place(q, px0 + spots[k][0], G.y + spots[k][1], PI));
      place(me, G.x - 300, G.y, 0); place(mate, 150, 280, 0);
      give(g, me);
      B.puppets = new Set([...pins, mate]); noAttack(...pins, mate);
      for (const q of pins) g.ball.noPickup.set(q.id, 99);
      let shot = false, n = 0;
      const down = new Set();
      B.dir = (dt, g, t) => {
        steer(mate, 150, 280, false);
        pins.forEach((q, k) => { if (!down.has(q) && q.state === 'normal') { steer(q, px0 + spots[k][0], G.y + spots[k][1], false); q.facing = PI; } });
        if (!shot) { me.intent.mx = 0.45; me.intent.my = 0; }
        if (!shot && t > 1.1) { face(me, G); Act.shoot(g, me, 0.7, 0); g.ball.skin = 'bowling'; g.ball.z = 0; g.ball.vz = 0; shot = true; mark('shot'); return; }
        if (!shot) return;
        still(me);
        const b = g.ball;
        const topple = (q, fx, fy) => {
          down.add(q); n++;
          const a = Math.atan2(q.y - fy, q.x - fx) * 0.7 + (Math.random() - 0.5) * 0.4;
          q.hit({ stun: 2.5, kbx: 90 + Math.cos(a) * 200, kby: Math.sin(a) * 220, launch: 150 + Math.random() * 90, source: me, type: 'hard' });
          if (n === 1) mark('pin1');
          if (n === pins.length) { mark('strike'); g.effects.comic(G.x - 80, G.y - 46, 'STRIKE!', '#ffe14f', 1.7, 1.6); g.effects.flash(0.4); g.effects.shake(6, 0.4); }
          // pins knock down the pins behind them
          for (const r of pins) if (!down.has(r) && Math.hypot(r.x - q.x, r.y - q.y) < 22) g.later(0.05 + Math.random() * 0.05, () => { if (!down.has(r)) topple(r, q.x, q.y); });
        };
        for (const q of pins) if (!down.has(q) && Math.hypot(b.x - q.x, b.y - q.y) < 13 + q.radius) topple(q, b.x, b.y);
        if (b.x < G.x - 20) { b.vx = Math.max(b.vx, 150); b.vy *= 0.9; b.z = 0; b.vz = 0; }   // a bowling ball doesn't stop for pins
      };
      B.focusFn = () => (shot ? { x: Math.max(g.ball.x, G.x - 130), y: G.y } : me);
    },

    /* S5 GIANT KEEPER: their keeper is 4x bigger and fills the goal... Meteor Shot blasts him into the net */
    giant_keeper() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      ult(g, me, 'meteor_strike');
      const G = g.attackGoal(0);
      place(me, G.x - 260, G.y + 10, 0); place(mate, 160, 260, 0); place(o1, G.x - 170, G.y - 80, PI); place(o2, G.x - 26, G.y, PI);
      give(g, me);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate);
      at(0.05, () => { o2.giant(4, 0); });
      let fired = false, blasted = false;
      B.dir = (dt, g, t) => {
        steer(mate, 160, 260, false); if (o1.state === 'normal') steer(o1, G.x - 170, G.y - 80, false);
        if (!blasted && o2.state === 'normal') { steer(o2, G.x - 26, G.y + Math.sin(t * 1.6) * 5, false); face(o2, me); }
        if (!fired) { if (t < 1.6) { still(me); face(me, o2); } else { me.intent.mx = 0.4; me.intent.my = 0; } }
        if (!fired && t > 2.0) { fired = g.cores.activateUltimate(me); if (fired) mark('ult'); }
        if (fired && me.state === 'normal') still(me);
        const b = g.ball;
        if (fired && !blasted && !b.owner && b.x > o2.x - 40 && Math.abs(b.y - o2.y) < 50 && b.z < 30) {
          blasted = true; mark('blast');
          o2.hit({ stun: 3, kbx: 420, kby: -40, launch: 120, source: me, type: 'hard' });
          g.effects.comic(o2.x, o2.y - 60, 'KRAKOOM!!', '#ff6a1f', 1.6, 1.0); g.effects.shake(8, 0.5); g.effects.flash(0.5);
          b.noPickup.set(o2.id, 99);
        }
        // the meteor goes straight through where he was standing
        if (blasted && B.marks.goal == null && b.x < G.x + 10) { b.owner = null; b.vx = 330; b.vy = (G.y - b.y) * 3; b.z = Math.min(b.z, 6); }
      };
      B.focusFn = () => (fired && B.t - B.marks.ult > 0.9 ? { x: Math.max(g.ball.x, G.x - 90), y: G.y } : t0focus(me, o2));
    },

    /* S6 KICKOFF: whistle, and all four dropkick each other at once */
    kickoff() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const F = g.field;
      for (const q of [mate, me, o1, o2]) g.cores.add(q, 'heavy_boot');
      place(me, F.cx - 30, F.cy - 22, 0); place(o1, F.cx + 30, F.cy - 22, PI);
      place(mate, F.cx - 30, F.cy + 26, 0); place(o2, F.cx + 30, F.cy + 26, PI);
      g.ball.owner = null; g.ball.x = F.cx; g.ball.y = F.cy; g.ball.z = 0; g.ball.vx = g.ball.vy = 0;
      B.puppets = new Set([mate, o1, o2]);
      for (const q of [mate, me, o1, o2]) g.ball.noPickup.set(q.id, 99);
      const pairs = [[me, o1], [o1, me], [mate, o2], [o2, mate]];
      let go = false;
      at(0.6, () => g.sfx('whistle'));
      B.dir = (dt, g, t) => {
        for (const [a, b] of pairs) {
          if (t < 0.75) { still(a); face(a, b); continue; }
          if (go && a.state === 'normal' && B.marks.kick == null) steer(a, b.x, b.y, true);
        }
        if (t >= 0.75 && !go) { go = true; mark('go'); }
        if (go && B.marks.kick == null && U.dist(me, o1) < 34) {
          for (const [a, b] of pairs) { face(a, b); a.cd.hard = 0; Act.hardAttack(g, a); }
          mark('kick');
        }
        // everybody loses: all four go flying, each away from the man who kicked him
        if (B.marks.kick != null && B.marks.boom == null && B.t - B.marks.kick > 0.18) {
          mark('boom');
          const dirs = [[me, -1, -0.7], [o1, 1, -0.7], [mate, -1, 0.7], [o2, 1, 0.7]];
          for (const [q, dx, dy] of dirs) { q.state = 'normal'; q.hitImmune = 0; q.hit({ stun: 3.2, kbx: dx * 230, kby: dy * 170, launch: 190, source: null, type: 'hard' }); }
          g.effects.comic(F.cx, F.cy - 34, 'SMASH!!', '#ff3d5a', 1.5, 0.9); g.effects.flash(0.5); g.effects.shake(7, 0.4);
        }
        if (B.marks.kick != null) for (const q of [mate, me, o1, o2]) if (q.state === 'normal') still(q);
        if (B.marks.kick != null && B.t - B.marks.kick > 1.6 && B.marks.roll == null) { mark('roll'); g.ball.vx = 150; g.ball.vy = 0; }
        // ...and the ball strolls into the empty net on its own while all four are out cold
        if (B.marks.roll != null && B.marks.goal == null) { const G0 = g.attackGoal(0); g.ball.owner = null; g.ball.vx = Math.max(g.ball.vx, 95); g.ball.vy = (G0.y - g.ball.y) * 0.8; }
      };
      B.focusFn = () => (B.marks.roll != null && B.t - B.marks.roll > 0.2 ? g.ball : { x: F.cx, y: F.cy });
    },

    /* S7 DAVID vs GOLIATH: a 3x giant stomps in, one dropkick and he flies across the pitch */
    goliath() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(me, 'heavy_boot'); g.cores.add(me, 'wall_slam');
      place(me, 250, 210, 0); place(mate, 140, 280, 0); place(o1, 400, 200, PI); place(o2, 540, 140, PI);
      give(g, o1);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate);
      at(0.05, () => { o1.giant(3, 0); });
      let kicked = false, step = 0;
      B.dir = (dt, g, t) => {
        steer(mate, 140, 280, false); steer(o2, 540, 140, false);
        if (!kicked && o1.state === 'normal') {
          o1.intent.mx = -0.28; o1.intent.my = 0.02; o1.intent.sprint = false;
          if (t > 0.3 && Math.floor(t / 0.55) > step) { step = Math.floor(t / 0.55); g.effects.shake(3.5, 0.15); g.sfx('land'); g.effects.burst(o1.x, o1.y + 4, 0, '#b8a890', 8, 60, 0.4); }
        }
        if (!kicked) {
          if (t < 1.9) { still(me); face(me, o1); return; }
          steer(me, o1.x - 30, o1.y, true);
          if (U.dist(me, o1) < 48 && me.state === 'normal') { face(me, o1); kicked = Act.hardAttack(g, me); if (kicked) mark('kick'); }
          return;
        }
        if (o1.state === 'stun' && B.marks.fly == null) { mark('fly'); o1.kbx = 520; o1.kby = -30; o1.airVz = Math.max(o1.airVz, 260); g.effects.comic(o1.x, o1.y - 50, 'BOOM!', '#ff3d5a', 1.5, 0.8); }
        if (me.state === 'normal') still(me);
      };
      B.focusFn = () => (B.marks.fly != null ? o1 : t0focus(me, o1));
    },

    /* S8 CLONE FAMILY: he summons 8 clones, they all chase one guy, Lightning Dash through every one of them */
    clones() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      ult(g, me, 'lightning_dash');
      const G = g.attackGoal(0);
      place(me, 200, 205, 0); place(mate, 130, 280, 0); place(o1, 360, 205, PI); place(o2, G.x - 22, G.y, PI);
      give(g, me);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate);
      const E = g.effects;
      let fired = false, shot = false, px = me.x, py = me.y;
      at(0.5, () => {
        E.callout('CLONES!', '#9d7bff', 1.0); E.comic(o1.x, o1.y - 30, 'POOF!', '#d8d0e0', 1.2, 0.7); g.sfx('whoosh');
        for (let k = 0; k < 8; k++) { const a = PI / 2 + (k - 3.5) * 0.36; E.clone(o1.id, o1.x + Math.cos(a) * 6, o1.y + Math.sin(a) * 6, Math.cos(a) * 160, Math.sin(a) * 120, 9); }
        mark('clones');
      });
      B.dir = (dt, g, t) => {
        steer(mate, 130, 280, false);
        if (shot) { steer(o2, G.x - 22, G.y - 50, true); g.ball.noPickup.set(o2.id, 99); } else steer(o2, G.x - 22, G.y + Math.sin(t * 2) * 6, false);
        if (o1.state === 'normal') steer(o1, me.x + 26, me.y, false);
        // clones: fan out, then all close in on him; the dash zaps every clone along its path
        if (B.marks.clones != null) {
          const k0 = B.t - B.marks.clones;
          const sx = me.x - px, sy = me.y - py, sl = sx * sx + sy * sy || 1;
          for (const c of E.V.clones) {
            if (c.t < 0.05) continue;
            if (k0 > 0.45) { const d = U.norm(me.x - c.x, me.y - c.y); const sp = fired ? 0 : 70; c.vx = d.x * sp; c.vy = d.y * sp; c.facing = Math.atan2(d.y, d.x); }
            if (!fired) continue;
            const u = Math.max(0, Math.min(1, ((c.x - px) * sx + (c.y - py) * sy) / sl));
            if (Math.hypot(c.x - (px + sx * u), c.y - (py + sy * u)) < 26) { const cx = c.x, cy = c.y; E.popClone(c.pid, cx, cy); E.comic(cx, cy - 18, 'ZAP!', '#7fe7ff', 0.8, 0.5); E.bolt(cx, cy - 30, cx, cy, '#bdf4ff', 0.3); }
          }
        }
        px = me.x; py = me.y;
        if (!fired) { still(me); face(me, o1); if (t > 2.2) { me.intent.mx = 1; fired = g.cores.activateUltimate(me); if (fired) mark('ult'); } return; }
        if (me.state !== 'normal') return;
        if (!shot && g.ball.owner === me) { if (G.x - me.x > 110) { steer(me, G.x - 100, G.y - 10, true); return; } face(me, G); Act.shoot(g, me, 1, 0.7); shot = true; mark('shot'); }
        else still(me);
      };
      B.focusFn = () => (shot ? g.ball : me);
    },

    /* S9 HUNDRED FISTS, but on the ball */
    fists_ball() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const G = g.attackGoal(0);
      place(me, G.x - 170, G.y + 4, 0); place(mate, 200, 270, 0); place(o1, G.x - 260, G.y - 80, 0); place(o2, G.x - 22, G.y, PI);
      const b = g.ball;
      b.owner = null; b.x = G.x - 152; b.y = G.y + 4; b.z = 0; b.vx = b.vy = 0;
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate);
      for (const q of [me, o1, o2, mate]) b.noPickup.set(q.id, 99);
      const E = g.effects;
      let n = 0, nextHit = 0.95, done = false;
      at(0.4, () => { E.cutIn(me.id, 'HUNDRED FISTS', '#ff3d5a', 0.8); g.sfx('whoosh'); mark('cutin'); });
      B.dir = (dt, g, t) => {
        steer(mate, 200, 270, false); steer(o1, G.x - 260, G.y - 80, false);
        if (!done) { steer(o2, G.x - 22, G.y + Math.sin(t * 2) * 6, false); face(o2, b); }
        still(me); face(me, b);
        if (!done) { b.vx = b.vy = 0; b.x = G.x - 152 + (n % 2 ? 1.5 : -1.5) * Math.min(1, n / 4); }
        if (!done && t >= nextHit && n < 20) {
          n++; nextHit = t + 0.05;
          me.state = 'jab'; me.stateT = 0.04; Act.startAttack(me, 'light');
          E.burst(b.x, b.y, 4, '#fff6a0', 6, 90, 0.25);
          if (n % 2 === 0) g.sfx('punch');
          E.V.comics = E.V.comics.filter((c) => !/ HIT!$/.test(c.str || ''));   // one counter on screen, not a pile of them
          E.combo(b.x, b.y - 18, n);
          if (n === 1) mark('fists');
        }
        if (!done && n >= 20 && t > nextHit + 0.25) {
          done = true; mark('blast');
          E.impactFrame(); E.shake(7, 0.4); E.flash(0.5);
          E.comic(b.x, b.y - 26, 'ORAAA!!', '#ff3d5a', 1.5, 0.9);
          b.kick(me, 560, -8, 40);
          g.sfx('kick', 1);
        }
        if (done) steer(o2, G.x - 22, G.y - 44, true);
      };
      B.focusFn = () => (done && B.t - B.marks.blast > 0.1 ? b : { x: b.x - 10, y: b.y });
    },

    /* S10 ORBIT: a dropkick so hard he leaves the screen... and lands on their keeper 3 seconds later */
    orbit() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(me, 'heavy_boot');
      const G = g.attackGoal(0);
      place(me, 250, 200, 0); place(mate, 150, 270, 0); place(o1, 290, 200, PI); place(o2, G.x - 22, G.y, PI);
      give(g, o1);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate);
      let kicked = false, launched = false, landed = false, x0 = 0, y0 = 0;
      B.dir = (dt, g, t) => {
        steer(mate, 150, 270, false);
        if (!landed && o2.state === 'normal') steer(o2, G.x - 22, G.y + Math.sin(t * 2) * 6, false);
        if (!kicked) { o1.intent.mx = -0.25; o1.intent.my = 0; if (t > 0.35) { face(me, o1); kicked = Act.hardAttack(g, me); if (kicked) mark('kick'); } return; }
        if (!launched && o1.state === 'stun') {
          launched = true; mark('launch'); x0 = o1.x; y0 = o1.y;
          o1.kbx = 0; o1.kby = 0; o1.airVz = 980; o1.airZ = Math.max(o1.airZ, 2);
          g.effects.comic(o1.x, o1.y - 40, 'BYE!', '#ffe14f', 1.4, 0.8);
        }
        if (launched && !landed) {
          // fly him over to their keeper while he's in the air, stun stays on
          o1.stateT = Math.max(o1.stateT, 1); o1.kbx = o1.kby = 0;
          const k = Math.min(1, (B.t - B.marks.launch) / 3.0);
          o1.x = x0 + (o2.x - x0) * k; o1.y = y0 + (o2.y - y0) * k;
          if (B.t - B.marks.launch > 1.0 && o1.airZ <= 0.5) {
            landed = true; mark('land');
            o2.hit({ stun: 3, kbx: 60, kby: 0, launch: 120, source: o1, type: 'hard' });
            g.effects.comic(o2.x, o2.y - 40, 'KRAKOOM!!', '#ff6a1f', 1.5, 1.0); g.effects.shake(8, 0.5); g.effects.flash(0.5);
            g.effects.burst(o2.x, o2.y, 0, '#b8a890', 20, 140, 0.7);
            g.sfx('hit', 'hard');
          }
        }
        if (me.state === 'normal' && kicked) still(me);
      };
      B.focusFn = () => (B.marks.launch != null && B.t - B.marks.launch > 0.5 ? o2 : me);
    },


  };

  B.setup =(name) => { B.timeline.length = 0; B.done = 0; B.dir = null; B.focusFn = null; B.stepT = 0; SCENES[name](); B.timeline.sort((a, b) => a[0] - b[0]); };
  B.SCENES = SCENES;
})();
