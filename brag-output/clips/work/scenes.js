/* Clip-pack director (Aura Farming + Meteor Shot + Hundred Fists): injected after the real game boots by ../../tools/clip-pack/capture.py, same pattern as ../../work/shorts_scenes.js.
   Raw footage for editing: no captions, HUD kept. Logs every sfx (with arg) + goal roars so the soundtrack is the game's own. */
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
  };

  B.setup =(name) => { B.timeline.length = 0; B.done = 0; B.dir = null; B.focusFn = null; B.stepT = 0; SCENES[name](); B.timeline.sort((a, b) => a[0] - b[0]); };
  B.SCENES = SCENES;
})();
