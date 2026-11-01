/* Batch 5 capture director (2026-11-01). Injected after the real game boots; drives the REAL simulation.
 * The Titan recipe ("one of ours goes through all three of them and scores"), three nearby options; one Ultimate per scene, none used before:
 *   boulder (stadium) + comet (harbor) · bullet (pirate cove) + panic (cage) · phase (cyber) + clones (school)
 * Video-only tweaks, nothing written to the repo: every player is a puppet of this script, Ultimates granted at runtime (energy only on
 * the scripted cast frame), no celebration zoom, no vignette. */
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
  const giveUlt = (g, p, id, lv = 1) => {
    const cs = g.cores, own = cs.own[p.id] || (cs.own[p.id] = []);
    own.push(id); p.ult = id; p.ultLv = lv; p.res.ult = 0;   // energy only on the scripted cast frame, so the AI can't fire it first
    const b = SFC.CoreBehaviors[id];
    if (b && b.onAdd) b.onAdd(cs, p.team, cs.sp(id, p));
  };
  const cast = (g, p) => { p.res.ult = 1; return g.cores.activateUltimate(p); };
  const hurt = (p) => p.state !== 'normal' || p.airZ > 0.5;
  const hits = (O) => { let n = 0; for (const p of O) if (hurt(p)) n++; if (n >= 1) mark('hit1'); if (n >= 2) mark('hit2'); if (n >= 3) mark('hit3'); };

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
  const goalWatch = () => { B.onFrame = (g) => { if (g.state === 'goal') mark('goal'); }; };

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
      pl: g ? g.players.map((p) => [p.team, r1(p.x), r1(p.y), Math.round(p.airZ), p.state]) : null,
      track: B.track ? { x: r1(B.track.x), y: r1(B.track.y) } : null,
    };
  };

  // ours takes the ball (or keeps it), runs at their goal and shoots once past xShoot (used after each opener's Ultimate)
  const finishRun = (g, H, ctx, xShoot, aim) => {
    if (g.ball.owner !== H) { if (!g.ball.owner) steer(H, g.ball.x, g.ball.y, 1, true); else still(H); return; }
    mark('take');
    H.intent.mx = 1; H.intent.my = (g.field.cy - H.y) / 120; H.intent.sprint = true;
    if (H.x > xShoot) { H.facing = 0; Act.shoot(g, H, 0.95, aim || 0); mark('shot'); ctx.phase = 'done'; }
  };

  const SCENES = {
    /* stadium: ours summons BOULDER RIDER, grows it to MAX (BIGGER! x2, MAX!), ROLL OUT!: it runs over all three (SQUASH!),
       steals the ball off their carrier on the way; when it crumbles ours runs it in and scores.
       Video-only: aiHit = 1, every rhythm press lands (a player who hits the timing gets the same) */
    boulder() {
      SFC_CONFIG.cores.list.boulder_shot.params.aiHit = 1;
      const g = match('rust_buckets', 'stadium');
      const f = g.field, [a0, H, a2] = team(g, 0), O = team(g, 1), ctx = { phase: 'wait' };
      giveUlt(g, H, 'boulder_shot');
      place(H, f.cx - 170, f.cy + 6, 0);
      place(O[1], f.cx - 50, f.cy + 6, PI); place(O[0], f.cx + 30, f.cy + 22, PI); place(O[2], f.cx + 110, f.cy - 8, PI);
      place(a0, f.x + 30, f.cy, 0); place(a2, f.cx - 210, f.cy - 100, 0);
      give(g, O[1]);
      B.dir = (dt, g, t) => {
        still(a0); still(a2); face(a2, g.ball);
        for (const p of O) { still(p); if (p.state === 'normal') face(p, H); }
        hits(O);
        if (ctx.phase === 'wait') { still(H); face(H, O[1]); if (t > 0.4 && cast(g, H)) { mark('cast'); ctx.phase = 'cast'; } return; }
        if (ctx.phase === 'cast') { still(H); if (H.state === 'normal' && B.marks.hit3 != null && !(H.armorT > g.time)) ctx.phase = 'run'; return; }
        if (ctx.phase === 'run') { finishRun(g, H, ctx, f.cx + 140, 0.15); return; }
        still(H);
      };
      goalWatch();
    },

    /* pirate cove: ours on the ball, their three lined up between him and the goal; BULLET TIME: the world slows, he zips past all
       three, time snaps back, they all slip, spiral shot into the net */
    bullet() {
      const g = match('retired_refs', 'pirate_cove');
      const f = g.field, [a0, H, a2] = team(g, 0), O = team(g, 1), GL = g.attackGoal(0);
      giveUlt(g, H, 'bullet_time');
      place(H, GL.x - 500, GL.y + 4, 0);
      place(O[0], GL.x - 430, GL.y + 29, PI); place(O[1], GL.x - 352, GL.y - 21, PI); place(O[2], GL.x - 276, GL.y + 28, PI);
      place(a0, f.x + 30, f.cy, 0); place(a2, GL.x - 560, GL.y - 90, 0);
      give(g, H);
      let phase = 'wait';
      B.dir = (dt, g, t) => {
        still(a0); still(a2); face(a2, g.ball);
        for (const p of O) { still(p); if (p.state === 'normal') face(p, H); }
        hits(O);
        still(H);
        if (phase === 'wait') { H.facing = 0; if (t > 0.4 && cast(g, H)) { mark('cast'); phase = 'cast'; } }
      };
      goalWatch();
    },

    /* cyber: ours on the ball facing their wall of three; PHASE STEP: BLINK! through portals again and again, a decoy left at each gate,
       out the other side, scores */
    phase() {
      const g = match('fortune_tellers', 'cyber');
      const f = g.field, [a0, H, a2] = team(g, 0), O = team(g, 1), ctx = { phase: 'wait' };
      giveUlt(g, H, 'phase_step');
      place(H, f.cx - 130, f.cy + 2, 0);
      place(O[0], f.cx - 80, f.cy - 22, PI); place(O[1], f.cx - 70, f.cy + 24, PI); place(O[2], f.cx + 10, f.cy + 2, PI);
      place(a0, f.x + 30, f.cy, 0); place(a2, f.cx - 200, f.cy - 90, 0);
      give(g, H);
      B.dir = (dt, g, t) => {
        still(a0); still(a2); face(a2, g.ball);
        for (const p of O) { still(p); if (p.state === 'normal') face(p, H); }
        hits(O);
        if (ctx.phase === 'wait') { still(H); H.facing = 0; if (t > 0.4 && cast(g, H)) { mark('cast'); ctx.phase = 'cast'; ctx.t0 = t; } return; }
        if (ctx.phase === 'cast') { still(H); if (t - ctx.t0 > 0.6) { ctx.phase = 'blink'; ctx.t1 = t; } return; }
        if (ctx.phase === 'blink') { still(H); if (t - ctx.t1 > 0.9) ctx.phase = 'run'; return; }
        if (ctx.phase === 'run') { finishRun(g, H, ctx, f.cx + 130, -0.1); return; }
        still(H);
      };
      goalWatch();
    },

    /* harbor: ours on the ball near their box; COMET ONE-TWO: one-two with his mate, the mate pops it up (BOING!), ours flips into a
       bicycle kick through their keeper and into the net */
    comet() {
      const g = match('market_mamas', 'harbor');
      const f = g.field, [a0, H, M] = team(g, 0), O = team(g, 1), GL = g.attackGoal(0);
      giveUlt(g, H, 'comet_onetwo');
      place(H, GL.x - 180, GL.y + 12, 0); place(M, GL.x - 125, GL.y - 44, PI); place(a0, f.x + 30, f.cy, 0);
      place(O[0], GL.x - 46, GL.y - 58, PI); place(O[1], GL.x - 90, GL.y + 46, PI); place(O[2], GL.x - 240, GL.y - 60, 0);
      give(g, H);
      let phase = 'wait';
      B.dir = (dt, g, t) => {
        still(a0); still(M);
        for (const p of O) { still(p); if (p.state === 'normal') face(p, g.ball); }
        hits(O);
        still(H);
        if (phase === 'wait') { H.facing = 0; if (t > 0.4 && cast(g, H)) { mark('cast'); phase = 'cast'; } }
      };
      goalWatch();
    },

    /* cage: ours on the ball, their three closing in; PANIC BALL: the ball turns into a ghost and chases each of them, BOO! x3,
       then flies back to his feet */
    panic() {
      const g = match('school_ghosts', 'cage');
      const f = g.field, [a0, H, a2] = team(g, 0), O = team(g, 1);
      giveUlt(g, H, 'panic_ball');
      place(H, f.cx - 40, f.cy + 4, 0);
      place(O[0], f.cx + 110, f.cy - 30, PI); place(O[1], f.cx + 200, f.cy + 50, PI); place(O[2], f.cx + 90, f.cy + 90, PI);
      place(a0, f.x + 30, f.cy, 0); place(a2, f.cx - 150, f.cy - 70, 0);
      give(g, H);
      let phase = 'wait';
      B.dir = (dt, g, t) => {
        still(a0); still(a2); face(a2, g.ball);
        for (const p of O) { still(p); if (p.state === 'normal') face(p, g.ball); }
        hits(O);
        still(H);
        if (phase === 'wait') { H.facing = 0; if (t > 0.4 && cast(g, H)) { mark('cast'); phase = 'cast'; } }
      };
      goalWatch();
    },

    /* school: their carrier walks it up; CLONE ARMY: four clones of ours rush in from every side and gang-punch him, ball stolen */
    clones() {
      const g = match('grandpa_squad', 'school');
      const f = g.field, [a0, H, a2] = team(g, 0), O = team(g, 1);
      giveUlt(g, H, 'clone_army');
      place(H, f.cx - 60, f.cy + 10, 0);
      place(O[1], f.cx + 30, f.cy - 4, PI); place(O[0], f.cx + 90, f.cy - 60, PI); place(O[2], f.cx + 100, f.cy + 60, PI);
      place(a0, f.x + 30, f.cy, 0); place(a2, f.cx - 160, f.cy - 70, 0);
      give(g, O[1]);
      let phase = 'wait';
      B.dir = (dt, g, t) => {
        still(a0); still(a2); face(a2, g.ball);
        for (const p of O) {
          if (p === O[1] && p.state === 'normal' && g.ball.owner === p) { p.intent.mx = -0.25; p.intent.my = 0; } else still(p);
          if (p.state === 'normal' && p !== O[1]) face(p, g.ball);
        }
        hits(O);
        still(H);
        if (phase === 'wait') { face(H, O[1]); if (t > 0.4 && cast(g, H)) { mark('cast'); phase = 'cast'; } }
      };
      goalWatch();
    },
  };

  B.setup = function (name) { SCENES[name](); };
})();
