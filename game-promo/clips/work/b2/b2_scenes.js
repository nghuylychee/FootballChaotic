/* Batch 2 capture director (2026-10-29). Injected after the real game boots; drives the REAL simulation.
 * Scenes: dragon (Rising Dragon -> goal), hammer (Iron Hammer), pinball (Pinball Kick -> goal), spike (Earth Spike x2).
 * Video-only tweaks, nothing written to the repo: every player is a puppet of this script, Ultimates granted at runtime,
 * no celebration zoom (the comp does its own camera), no vignette. */
(function () {
  const U = SFC.U, Act = SFC.Actions, PI = Math.PI;
  const app = SFC.app;
  const B = (window.BRAG = { sfx: [], t: 0, stepT: 0, dir: null, timeline: [], done: 0, marks: {}, track: null });
  SFC_CONFIG.intro.enabled = false;
  const G = SFC_CONFIG.game;
  G.celebration.camera.zoom = 1;
  G.render.vignette = 0;
  SFC.Renderer.vig = SFC.Background.vignette();
  G.match.kickoffVary = null;

  // every sound the game fires -> soundtrack hit points + offline game audio
  const sfx0 = SFC.Game.prototype.sfx;
  SFC.Game.prototype.sfx = function (name, arg) { if (!this.silent) B.sfx.push({ t: B.t, name, arg: arg == null ? null : arg }); return sfx0.call(this, name, arg); };

  const ai0 = SFC.AI.update.bind(SFC.AI);
  SFC.AI.update = (dt, g) => { ai0(dt, g); B.stepT += dt; if (B.dir) B.dir(dt, g, B.stepT); };

  const place = (p, x, y, facing) => Object.assign(p, {
    x, y, vx: 0, vy: 0, kbx: 0, kby: 0, airZ: 0, airVz: 0, state: 'normal', stateT: 0, hitImmune: 0,
    facing: facing != null ? facing : p.team ? PI : 0,
  });
  const face = (p, q) => { p.facing = Math.atan2(q.y - p.y, q.x - p.x); };
  const steer = (p, x, y, v = 1, sprint = false) => {
    const d = Math.hypot(x - p.x, y - p.y);
    if (d < 1.5) { p.intent.mx = 0; p.intent.my = 0; p.intent.sprint = false; return true; }
    const n = U.norm(x - p.x, y - p.y), k = Math.min(1, d / 14) * v;
    p.intent.mx = n.x * k; p.intent.my = n.y * k; p.intent.sprint = !!sprint;
    return false;
  };
  const still = (p) => { p.intent.mx = 0; p.intent.my = 0; p.intent.sprint = false; };
  const give = (g, p) => { if (g.ball.owner && g.ball.owner !== p) g.ball.owner = null; g.gainPossession(p); };
  const mark = (k) => { if (B.marks[k] == null) B.marks[k] = B.t; };
  // Ultimate straight into the Core list (same as the dev ULT TEST room: no ULT BOOK entry, no discovery banner)
  const giveUlt = (g, p, id, lv = 1) => {
    const cs = g.cores, own = cs.own[p.id] || (cs.own[p.id] = []);
    own.push(id); p.ult = id; p.ultLv = lv; p.res.ult = 1;
    const b = SFC.CoreBehaviors[id];
    if (b && b.onAdd) b.onAdd(cs, p.team, cs.sp(id, p));
  };

  function match(away, arena) {
    app.startMatch({ home: 'street_kings', away, difficulty: 'normal', humanTeam: -1, noDraft: true, arena });
    const g = app.game;
    g.state = 'play'; g.stateT = 0;
    B.puppets = new Set(g.players);
    g.aiHook = (p) => B.puppets.has(p);
    for (const p of g.players) { p.cd.light = p.cd.hard = p.cd.skill = 999; }
    return g;
  }
  const team = (g, t) => g.teams[t].players;

  B.frame = function (t) {
    B.t = t;
    while (B.done < B.timeline.length && t >= B.timeline[B.done][0]) { B.timeline[B.done][1](); B.done++; }
    const g = app.game;
    if (g && B.onFrame) B.onFrame(g, t);
    const r1 = (v) => Math.round(v * 10) / 10;
    return {
      state: g ? g.state : null,
      ball: g ? [r1(g.ball.x), r1(g.ball.y), Math.round(g.ball.z)] : null,
      score: g ? [g.teams[0].score, g.teams[1].score] : null,
      pl: g ? g.players.map((p) => [p.team, r1(p.x), r1(p.y), Math.round(p.airZ)]) : null,
      track: B.track ? { x: r1(B.track.x), y: r1(B.track.y) } : null,
    };
  };

  const SCENES = {
    /* street: their winger dribbles along the top; ours casts RISING DRAGON (uppercut, then dragon kick into the wall),
       lands with the ball and scores */
    dragon() {
      const g = match('metro_express', 'street');
      const f = g.field, [a0, a1, a2] = team(g, 0), [o0, o1, o2] = team(g, 1);
      const Hh = a1, O = o1;
      giveUlt(g, Hh, 'rising_dragon');
      place(O, f.cx + 30, f.y + 56, PI); give(g, O);
      place(Hh, f.cx - 20, f.y + 96, 0);
      place(a0, f.x + 40, f.cy, 0); place(a2, f.cx - 90, f.cy + 70, 0);
      place(o0, f.cx - 60, f.y + f.h - 50, PI); place(o2, f.cx + 40, f.y + f.h - 40, PI);
      let phase = 'wait';
      B.dir = (dt, g, t) => {
        still(a0); still(a2); face(a2, g.ball);
        for (const p of [o0, o2]) { still(p); if (p.state === 'normal') face(p, g.ball); }
        if (phase === 'wait') {
          if (g.ball.owner === O) { O.intent.mx = -0.18; O.intent.my = 0; }
          still(Hh); face(Hh, O);
          if (t > 0.4 && g.cores.activateUltimate(Hh)) { mark('cast'); phase = 'combo'; }
          return;
        }
        still(O);
        if (O.airZ > 0) mark('up');
        if (phase === 'combo') {
          if (B.marks.up != null && Hh.state === 'normal' && Hh.airZ <= 0) phase = 'take';
          return;
        }
        if (phase === 'take') {
          if (g.ball.owner !== Hh) { steer(Hh, g.ball.x, g.ball.y, 1, true); return; }
          mark('take');
          if (B.t - B.marks.take < 0.3) { Hh.intent.mx = 1; Hh.intent.my = 0.4; Hh.intent.sprint = true; return; }
          Hh.facing = 0; Act.shoot(g, Hh, 0.9, 0.3); mark('shot'); phase = 'done';
          return;
        }
        still(Hh);
      };
      B.onFrame = (g) => { if (g.state === 'goal') mark('goal'); };
    },

    /* domino hall: three of theirs in a row, the first one on the ball; ours swings the IRON HAMMER and slams a quake through all of them */
    hammer() {
      const g = match('block_bosses', 'domino_hall');
      const f = g.field, [a0, a1, a2] = team(g, 0), [o0, o1, o2] = team(g, 1);
      const Hh = a2;
      giveUlt(g, Hh, 'iron_hammer');
      place(Hh, f.cx - 100, f.cy + 4, 0);
      place(o1, f.cx - 34, f.cy + 2, PI); give(g, o1);
      place(o0, f.cx + 26, f.cy - 8, PI); place(o2, f.cx + 86, f.cy + 8, PI);
      place(a0, f.x + 40, f.cy, 0); place(a1, f.cx - 150, f.cy - 80, 0);
      let phase = 'wait';
      B.dir = (dt, g, t) => {
        still(a0); still(a1); face(a1, Hh);
        for (const p of [o0, o2]) { still(p); if (p.state === 'normal') face(p, Hh); }
        if (phase === 'wait') {
          if (g.ball.owner === o1) { o1.intent.mx = -0.12; o1.intent.my = 0; }
          still(Hh); face(Hh, o1);
          if (t > 0.4 && g.cores.activateUltimate(Hh)) { mark('cast'); phase = 'slam'; }
          return;
        }
        still(o1); still(Hh);
        let n = 0; for (const p of [o0, o1, o2]) if (p.state === 'stun' || p.airZ > 0) n++;
        if (n) mark('hit1');
        if (n >= 3) mark('hit3');
      };
    },

    /* school: their captain dribbles at us; ours kicks him into a human PINBALL that bowls over his mates, takes the ball the other way and scores */
    pinball() {
      const g = match('hall_monitors', 'school');
      const f = g.field, [a0, a1, a2] = team(g, 0), [o0, o1, o2] = team(g, 1);
      const Hh = a1, O = o1;
      giveUlt(g, Hh, 'pinball_kick');
      place(O, f.cx - 10, f.cy + 2, 0); give(g, O);
      place(Hh, f.cx + 56, f.cy + 6, PI);
      // both of his mates stand on the pinball's line (it flies straight away from the kicker)
      place(o0, f.cx - 96, f.cy - 4, 0); place(o2, f.cx - 170, f.cy - 10, 0);
      place(a0, f.x + 40, f.cy, 0); place(a2, f.cx + 120, f.cy - 80, PI);
      let phase = 'wait';
      B.dir = (dt, g, t) => {
        still(a0); still(a2); face(a2, g.ball);
        for (const p of [o0, o2]) { still(p); if (p.state === 'normal') face(p, O); }
        if (phase === 'wait') {
          if (g.ball.owner === O) { O.intent.mx = 0.12; O.intent.my = 0; }
          still(Hh); face(Hh, O);
          if (t > 0.4 && g.cores.activateUltimate(Hh)) { mark('cast'); phase = 'kick'; }
          return;
        }
        still(O);
        if (O.state === 'stun') mark('boing');
        if ([o0, o2].some((p) => p.state === 'stun' || p.airZ > 0)) mark('strike');
        if (phase === 'kick') {
          if (B.marks.boing != null && Hh.state === 'normal') phase = 'take';
          return;
        }
        if (phase === 'take') {
          if (g.ball.owner !== Hh) { steer(Hh, g.ball.x, g.ball.y, 1, true); return; }
          mark('take');
          if (B.t - B.marks.take < 0.35) { Hh.intent.mx = 1; Hh.intent.my = 0; Hh.intent.sprint = true; return; }
          Hh.facing = 0; Act.shoot(g, Hh, 0.95, -0.3); mark('shot'); phase = 'done';
          return;
        }
        still(Hh);
      };
      B.onFrame = (g) => { if (g.state === 'goal') mark('goal'); };
    },

    /* alley: ours raises EARTH SPIKE rock walls twice: first through their ball carrier, then through the next one */
    spike() {
      const g = match('alley_cats', 'alley');
      const f = g.field, [a0, a1, a2] = team(g, 0), [o0, o1, o2] = team(g, 1);
      const Hh = a1;
      giveUlt(g, Hh, 'earth_spike');
      place(Hh, f.cx - 80, f.cy + 10, 0);
      place(o1, f.cx - 4, f.cy + 12, PI); give(g, o1);
      place(o0, f.cx - 30, f.cy - 66, PI); place(o2, f.cx + 110, f.cy + 40, PI);
      place(a0, f.x + 40, f.cy, 0); place(a2, f.cx - 140, f.cy + 90, 0);
      let phase = 'wait';
      B.dir = (dt, g, t) => {
        still(a0); still(a2); face(a2, Hh); still(o2); if (o2.state === 'normal') face(o2, Hh);
        if (phase === 'wait') {
          if (g.ball.owner === o1) { o1.intent.mx = -0.1; o1.intent.my = 0; }
          still(o0); face(o0, Hh); still(Hh); face(Hh, o1);
          if (t > 0.4 && g.cores.activateUltimate(Hh)) { mark('cast'); phase = 'one'; }
          return;
        }
        still(o1); still(Hh);
        if (o1.state === 'stun' || o1.airZ > 0) mark('crack1');
        if (phase === 'one') {
          // their second player walks in to help; the second wall goes through him
          if (o0.state === 'normal') steer(o0, Hh.x + 40, Hh.y - 20, 0.5);
          if (B.marks.crack1 != null && B.t - B.marks.crack1 > 0.5 && g.cores.activateUltimate(Hh)) { mark('cast2'); phase = 'two'; }
          return;
        }
        still(o0);
        if (o0.state === 'stun' || o0.airZ > 0) mark('crack2');
      };
    },
  };

  B.setup = function (name) { SCENES[name](); };
})();
