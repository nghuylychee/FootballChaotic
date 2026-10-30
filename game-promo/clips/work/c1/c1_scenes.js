/* Cycle 1 capture director (variant A, impact hook). Injected after the real game boots; drives the REAL simulation.
 * Scenes: cage (sprint dropkick into the cage wall -> loose ball -> pass -> goal), medusa, rocket, truck (Ultimates nobody has filmed yet).
 * Video-only tweaks, nothing written to the repo: every player is a puppet of this script, Cores / Ultimates granted at runtime,
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
    /* cage: their winger dribbles along the top fence; ours sprints in and dropkicks him into it (Flying Kick + Wall Slam).
       Ball pops loose, we pick it up, one pass, one-touch finish. */
    cage() {
      const g = match('cyber_united', 'cage');
      const f = g.field, [a0, a1, a2] = team(g, 0), [o0, o1, o2] = team(g, 1);
      const A = a1, V = o1, M = a2;   // A = the dropkicker, V = victim, M = the finisher
      g.cores.add(A, 'flying_kick'); g.cores.add(A, 'wall_slam');
      place(V, f.cx + 30, f.y + 30, PI); give(g, V);
      place(A, f.cx - 70, f.y + 120, -PI / 4);
      place(M, f.cx - 10, f.cy + 70, 0);
      place(a0, f.x + 40, f.cy, 0);
      place(o0, f.cx - 120, f.cy + 40, PI); place(o2, f.x + f.w - 90, f.y + 46, PI);
      let phase = 'run';
      B.dir = (dt, g, t) => {
        still(a0); face(a0, g.ball);
        for (const p of [o0, o2]) { still(p); if (p.state === 'normal') face(p, g.ball); }
        if (phase === 'run') {
          // V dribbles slowly toward our half along the fence
          if (g.ball.owner === V) { V.intent.mx = -0.28; V.intent.my = 0; }
          still(M); face(M, V);
          const d = Math.hypot(V.x - A.x, V.y - A.y);
          if (d > 30) steer(A, V.x - 4, V.y + 6, 1, true);
          else { A.cd.hard = 0; face(A, { x: V.x - 2, y: V.y - 4 }); if (Act.hardAttack(g, A)) { mark('windup'); phase = 'kick'; } }
          return;
        }
        if (phase === 'kick') {
          if (V.state === 'stun' || V.airZ > 0) mark('smash');
          if (B.marks.smash != null) { still(V); }
          else if (g.ball.owner === V) { V.intent.mx = -0.2; V.intent.my = 0; }
          // the finisher starts his run as soon as the ball is loose
          if (B.marks.smash != null) steer(M, f.x + f.w - 70, f.cy - 10, 0.85, true);
          if (B.marks.smash != null && A.state === 'normal') phase = 'collect';
          return;
        }
        still(V);
        if (phase === 'collect') {
          steer(M, f.x + f.w - 70, f.cy - 10, 0.8, false);
          if (g.ball.owner === A) { mark('collect'); phase = 'carry'; return; }
          steer(A, g.ball.x, g.ball.y, 1, true);
          return;
        }
        if (phase === 'carry') {
          steer(M, f.x + f.w - 70, f.cy - 10, 0.7, false);
          A.intent.mx = 0.6; A.intent.my = 0.15; A.intent.sprint = true;
          if (B.t - B.marks.collect > 0.35) { face(A, M); Act.passTo(g, A, M, 'ground'); mark('pass'); phase = 'finish'; }
          return;
        }
        if (phase === 'finish') {
          still(A);
          if (g.ball.owner === M) { M.facing = 0; Act.shoot(g, M, 0.9, 0.55); mark('shot'); phase = 'done'; }
          else if (!g.ball.owner) steer(M, g.ball.x, g.ball.y, 0.9);
          return;
        }
        still(A); still(M);
      };
      B.onFrame = (g) => { if (g.state === 'goal') mark('goal'); };
    },

    /* pirate cove: their captain dribbles at us with two mates; our girl glares: all three turn to stone, she walks the ball in */
    medusa() {
      const g = match('crane_crushers', 'pirate_cove');
      const f = g.field, [a0, a1, a2] = team(g, 0), [o0, o1, o2] = team(g, 1);
      const Hh = a2;
      giveUlt(g, Hh, 'medusa_gaze');
      place(Hh, f.cx - 60, f.cy + 6, 0);
      place(o1, f.cx + 40, f.cy + 2, PI); give(g, o1);
      place(o0, f.cx + 66, f.cy - 38, PI); place(o2, f.cx + 72, f.cy + 44, PI);
      place(a0, f.x + 40, f.cy, 0); place(a1, f.cx - 120, f.cy - 70, 0);
      let phase = 'wait';
      B.dir = (dt, g, t) => {
        still(a0); still(a1); face(a1, Hh);
        if (phase === 'wait') {
          for (const p of [o0, o1, o2]) { p.intent.mx = -0.22; p.intent.my = 0; }
          still(Hh); face(Hh, o1);
          if (t > 0.5 && g.cores.activateUltimate(Hh)) { mark('cast'); phase = 'gaze'; }
          return;
        }
        for (const p of [o0, o1, o2]) still(p);
        if (phase === 'gaze') {
          if (o1.stoneT > 0 || o0.stoneT > 0 || [o0, o1, o2].some((p) => p.state === 'stun')) mark('stone');
          if (B.marks.stone != null && Hh.state === 'normal' && !Hh.holdT) phase = 'walk';
          return;
        }
        if (phase === 'walk') {
          if (g.ball.owner !== Hh) {
            // go around the statue in the middle: first drop to the ball's height, then straight at it
            const b = g.ball;
            if (Math.abs(Hh.y - b.y) > 8 && b.x - Hh.x > 24) steer(Hh, Hh.x + 10, b.y, 1, true);
            else steer(Hh, b.x, b.y, 1, true);
            return;
          }
          mark('take');
          // run between the statues before they thaw, then finish into the empty net
          if (Hh.x < f.cx + 70) { Hh.intent.mx = 1; Hh.intent.my = (f.cy - Hh.y) / 40; Hh.intent.sprint = true; }
          else { Hh.facing = 0; Act.shoot(g, Hh, 0.8, -0.2); mark('shot'); phase = 'done'; }
          return;
        }
        still(Hh);
      };
      B.onFrame = (g) => { if (g.state === 'goal') mark('goal'); };
    },

    /* cyber: their striker is way over on the far side; ours fires her fist across the whole pitch */
    rocket() {
      const g = match('chrome_wolves', 'cyber');
      const f = g.field, [a0, a1, a2] = team(g, 0), [o0, o1, o2] = team(g, 1);
      const Hh = a1, T = o2;
      giveUlt(g, Hh, 'rocket_punch');
      place(Hh, f.cx - 120, f.cy + 46, 0);
      place(T, f.cx + 130, f.cy - 36, PI); give(g, T);
      place(o0, f.cx + 60, f.cy + 80, PI); place(o1, f.x + f.w - 40, f.cy, PI);
      place(a0, f.x + 40, f.cy, 0); place(a2, f.cx - 30, f.cy - 80, 0);
      let phase = 'wait';
      B.dir = (dt, g, t) => {
        still(a0); still(a2); face(a2, T); still(o0); face(o0, Hh); still(o1);
        if (phase === 'wait') {
          if (g.ball.owner === T) { T.intent.mx = -0.12; T.intent.my = 0.02; }
          still(Hh); face(Hh, T);
          if (t > 0.45 && g.cores.activateUltimate(Hh)) { mark('cast'); phase = 'fly'; }
          return;
        }
        if (T.state === 'stun' || T.airZ > 0) mark('kapow');
        if (B.marks.kapow == null && g.ball.owner === T) { T.intent.mx = -0.08; T.intent.my = 0; } else still(T);
        still(Hh);
      };
      // camera hint: the fist (live rocket projectile in the VFX kit)
      B.onFrame = (g) => {
        const r = ((g.effects.V && g.effects.V.shots) || []).filter((q) => q.kind === 'rocket' && q.t > 0).pop();
        B.track = r ? { x: r.x, y: r.y } : null;
      };
    },

    /* harbor: three of theirs in a row with the ball; ours calls the Monster Truck */
    truck() {
      const g = match('iron_harbor', 'harbor');
      const f = g.field, [a0, a1, a2] = team(g, 0), [o0, o1, o2] = team(g, 1);
      const Hh = a2;
      giveUlt(g, Hh, 'monster_truck');
      g.effects.callout = () => {};   // screen-space banner would be sliced by the vertical crop; the cut-in already names it
      place(Hh, f.cx - 110, f.cy + 10, 0);
      place(o1, f.cx - 20, f.cy + 4, PI); give(g, o1);
      place(o0, f.cx + 40, f.cy - 30, PI); place(o2, f.cx + 70, f.cy + 36, PI);
      place(a0, f.x + 40, f.cy, 0); place(a1, f.cx - 150, f.cy - 80, 0);
      let phase = 'wait';
      B.dir = (dt, g, t) => {
        still(a0); still(a1); face(a1, Hh);
        for (const p of [o0, o2]) { still(p); if (p.state === 'normal') face(p, Hh); }
        if (phase === 'wait') {
          if (g.ball.owner === o1) { o1.intent.mx = -0.18; o1.intent.my = 0; }
          still(Hh); face(Hh, o1);
          if (t > 0.45 && g.cores.activateUltimate(Hh)) { mark('cast'); phase = 'drive'; }
          return;
        }
        // the truck task drives the hero (AI steering, humanTeam -1); the rest just stand there in shock
        B.puppets.delete(Hh);
        if (o1.state === 'normal' && g.ball.owner === o1) still(o1);
        let n = 0; for (const p of [o0, o1, o2]) if (p.state === 'stun') n++;
        if (n) mark('squash1');
        if (n >= 2) mark('squash2');
        if (n >= 3) mark('squash3');
      };
      B.onFrame = (g) => { if (g.state === 'goal') mark('goal'); };
    },
  };

  B.setup = function (name) { SCENES[name](); };
})();
