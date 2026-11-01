/* Batch 4 capture director (2026-11-01). Injected after the real game boots; drives the REAL simulation.
 * 4 scenes, one Ultimate each, none used in an earlier clip:
 *   clip A (impact-first): cannon (harbor) opener, boomer (rooftop) second
 *   clip B (setup-first):  sling (street) opener, light (cyber) second
 * sling has a real setup: ours carries the ball up to their wall for ~1.3 s before the cast, so clip B can open on it.
 * Video-only tweaks, nothing written to the repo: every player is a puppet of this script, Ultimates granted at runtime,
 * no celebration zoom (the comp does its own camera), no vignette. Since 2026-10-31 the cut-in doesn't freeze the match. */
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

  const SCENES = {
    /* harbor: ours, on the ball well outside their box, fires CANNONBALL; the bomb lands among their three, KABOOM, ball on into the net */
    cannon() {
      const g = match('moped_boys', 'harbor');
      const f = g.field, [a0, H, a2] = team(g, 0), O = team(g, 1), GL = g.attackGoal(0);
      giveUlt(g, H, 'cannonball');
      place(H, GL.x - 270, GL.y + 6, 0);
      place(O[0], GL.x - 104, GL.y - 14, PI); place(O[1], GL.x - 74, GL.y + 16, PI); place(O[2], GL.x - 34, GL.y - 2, PI);
      place(a0, f.x + 30, f.cy, 0); place(a2, GL.x - 330, GL.y - 70, 0);
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

    /* rooftop: their carrier walks it up; ours throws MEGA BOOMERANG, it laps the roof and WHACKs all three (each placed on its path) */
    boomer() {
      const g = match('pigeon_gang', 'rooftop');
      const f = g.field, [a0, H, a2] = team(g, 0), O = team(g, 1), MB = SFC.CoreBehaviors.mega_boomerang;
      giveUlt(g, H, 'mega_boomerang');
      place(H, f.cx - 150, f.cy + 34, 0);
      const th0 = Math.atan2((H.y - f.cy) / (f.h / 2 - 24), (H.x - f.cx) / (f.w / 2 - 34));
      const path = (T) => MB.at(g, H.x, H.y, th0, H, T / SFC_CONFIG.cores.list.mega_boomerang.params.time);
      [0.8, 1.35, 1.95].forEach((T, i) => { const p = path(T); place(O[i], p.x, p.y, PI); });
      place(a0, f.cx - 36, f.cy - 12, 0); place(a2, f.cx + 24, f.cy + 22, 0);
      give(g, O[0]);
      let phase = 'wait';
      B.dir = (dt, g, t) => {
        still(a0); still(a2); face(a0, g.ball); face(a2, g.ball);
        for (const p of O) { still(p); if (p.state === 'normal') face(p, H); }
        hits(O);
        still(H);
        if (phase === 'wait') { face(H, O[0]); if (t > 0.4 && cast(g, H)) { mark('cast'); phase = 'cast'; } }
      };
      B.onFrame = (g) => {
        if (g.state === 'goal') mark('goal');
        const o = g.effects.V.props.find((x) => x.kind === 'boomer');
        B.track = o ? MB.at(g, o.x, o.y, o.b, H, Math.min(1, (o.max - o.t) / o.max)) : null;
      };
    },

    /* street: ours carries the ball up to their wall of three with his mate jogging beside him (the setup, ~1.3 s);
       SLINGSHOT: arms stretch, grab the mate, BOING! he flies through two of them with the ball, lands and scores */
    sling() {
      const g = match('block_wardens', 'street');
      const f = g.field, [a0, H, M] = team(g, 0), O = team(g, 1), GL = g.attackGoal(0);
      giveUlt(g, H, 'slingshot');
      place(H, f.cx - 150, f.cy + 8, 0); place(M, f.cx - 176, f.cy - 22, 0); place(a0, f.x + 30, f.cy, 0);
      place(O[0], f.cx - 40, f.cy - 20, PI); place(O[1], f.cx + 22, f.cy - 15, PI); place(O[2], f.cx - 44, f.cy + 22, PI);
      give(g, H);
      let phase = 'walk', t0 = 0;
      B.dir = (dt, g, t) => {
        still(a0);
        for (const p of O) { still(p); if (p.state === 'normal') face(p, H); }
        hits(O);
        if (phase === 'walk') {
          H.intent.mx = 0.42; H.intent.my = 0; H.intent.sprint = false;
          steer(M, H.x - 26, H.y - 30, 0.9);
          if (t > 1.3 && cast(g, H)) { mark('cast'); phase = 'cast'; t0 = t; }
          return;
        }
        still(H);
        if (phase === 'cast') {
          still(M);
          if (M.state !== 'normal') mark('fly');
          if (t - t0 > 1.3 && M.state === 'normal' && g.ball.owner === M) { mark('land'); phase = 'aim'; t0 = t; }
          return;
        }
        if (phase === 'aim') {
          if (t - t0 < 0.12) { M.intent.mx = 1; M.intent.my = 0; return; }
          M.facing = 0; Act.shoot(g, M, 0.95, 0.15); mark('shot'); phase = 'done';
          return;
        }
        still(M);
      };
      goalWatch();
    },

    /* cyber: their three walk the ball at our goal; LIGHT CYCLE: ours sprints a neon wall across their path, they walk into it, ZZT! x3 */
    light() {
      const g = match('night_owls', 'cyber');
      const f = g.field, [a0, H, a2] = team(g, 0), O = team(g, 1);
      giveUlt(g, H, 'light_cycle');
      place(H, f.cx - 30, f.cy - 92, PI / 2);
      place(O[0], f.cx + 40, f.cy - 40, PI); place(O[1], f.cx + 54, f.cy + 2, PI); place(O[2], f.cx + 38, f.cy + 42, PI);
      place(a0, f.x + 30, f.cy, 0); place(a2, f.cx - 170, f.cy + 60, 0);
      give(g, O[1]);
      let phase = 'wait', t0 = 0;
      B.dir = (dt, g, t) => {
        still(a0); still(a2); face(a2, g.ball);
        for (const p of O) {
          if (p.state === 'normal' && t > 0.5) { p.intent.mx = -0.42; p.intent.my = 0; p.intent.sprint = false; } else still(p);
        }
        hits(O);
        if (phase === 'wait') { still(H); H.facing = PI / 2; if (t > 0.4 && cast(g, H)) { mark('cast'); phase = 'cast'; t0 = t; } return; }
        if (phase === 'cast') { still(H); if (t - t0 > 0.6) phase = 'run'; return; }
        if (phase === 'run') { if (steer(H, f.cx - 30, f.cy + 96, 1, true)) phase = 'done'; return; }
        still(H);
      };
      goalWatch();
    },
  };

  B.setup = function (name) { SCENES[name](); };
})();
