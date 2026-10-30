/* Batch 3 capture director (2026-10-30). Injected after the real game boots; drives the REAL simulation.
 * 10 scenes, one Ultimate each, none used in an earlier clip:
 *   openers: rage (plaza), titan (stadium), fists (market), hurricane (rooftop), magnet (pirate cove)
 *   seconds: moon (cyber), chicken (harbor), storm (village), ghost (school), meteor (alley)
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
    own.push(id); p.ult = id; p.ultLv = lv; p.res.ult = 1;
    const b = SFC.CoreBehaviors[id];
    if (b && b.onAdd) b.onAdd(cs, p.team, cs.sp(id, p));
  };
  const hurt = (p) => p.state !== 'normal' || p.airZ > 0.5;

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
      pl: g ? g.players.map((p) => [p.team, r1(p.x), r1(p.y), Math.round(p.airZ), p.state]) : null,
      track: B.track ? { x: r1(B.track.x), y: r1(B.track.y) } : null,
    };
  };

  /* One scene = one Ultimate. cfg:
   *   away, arena, ult, H: [dx, dy] caster (a1) from the centre, opp: [[dx, dy] x3] (o0, o1, o2), carrier: 'o1' | 'H',
   *   drift: carrier's slow walk before the cast, mates: [[dx, dy] a0, [dx, dy] a2] (absolute from field corner if abs),
   *   after(g, ctx, t): what the caster does after the cast (default: stand still), shoot: take the loose ball and score */
  function scene(cfg) {
    return () => {
      const g = match(cfg.away, cfg.arena);
      const f = g.field, [a0, a1, a2] = team(g, 0), O = team(g, 1);
      const Hh = a1, ctx = { phase: 'wait', Hh, O, f };
      giveUlt(g, Hh, cfg.ult);
      place(Hh, f.cx + cfg.H[0], f.cy + cfg.H[1], cfg.Hface || 0);
      cfg.opp.forEach((d, i) => place(O[i], f.cx + d[0], f.cy + d[1], PI));
      place(a0, f.x + 30, f.cy, 0);
      place(a2, f.cx + (cfg.a2 || [-170, -110])[0], f.cy + (cfg.a2 || [-170, -110])[1], 0);
      const carrier = cfg.carrier === 'H' ? Hh : O[1];
      give(g, carrier);
      const target = O[1];
      B.dir = (dt, g, t) => {
        still(a0); still(a2); face(a2, g.ball);
        for (const p of O) { if (p !== carrier || ctx.phase !== 'wait') still(p); if (p.state === 'normal' && p !== carrier) face(p, Hh); }
        let n = 0; for (const p of O) if (hurt(p)) n++;
        if (n >= 1) mark('hit1'); if (n >= 2) mark('hit2'); if (n >= 3) mark('hit3');
        if (ctx.phase === 'wait') {
          if (g.ball.owner === carrier && carrier !== Hh) { const d = cfg.drift || [-0.12, 0]; carrier.intent.mx = d[0]; carrier.intent.my = d[1]; }
          still(Hh); if (cfg.Hface == null) face(Hh, target);
          if (t > 0.4 && g.cores.activateUltimate(Hh)) { mark('cast'); ctx.phase = 'cast'; ctx.t0 = t; }
          return;
        }
        if (cfg.after) { cfg.after(g, ctx, t); return; }
        if (cfg.shoot) {
          if (ctx.phase === 'cast' && t - ctx.t0 > cfg.shoot.wait && Hh.state === 'normal' && Hh.airZ <= 0) ctx.phase = 'take';
          if (ctx.phase === 'take') {
            if (g.ball.owner !== Hh) { steer(Hh, g.ball.x, g.ball.y, 1, true); return; }
            mark('take');
            if (B.t - B.marks.take < 0.3) { Hh.intent.mx = 1; Hh.intent.my = cfg.shoot.my || 0; Hh.intent.sprint = true; return; }
            Hh.facing = 0; Act.shoot(g, Hh, 0.95, cfg.shoot.aim || 0); mark('shot'); ctx.phase = 'done';
            return;
          }
        }
        still(Hh);
      };
      B.onFrame = (g) => { if (g.state === 'goal') mark('goal'); };
    };
  }

  const SCENES = {
    /* plaza: ours goes full ape in the middle of their three; three STOMP! rings launch them */
    rage: scene({ away: 'crane_crushers', arena: 'plaza', ult: 'rage', H: [-10, 4],
      opp: [[-56, -40], [40, 6], [14, 54]], carrier: 'o1', a2: [-200, -120] }),
    /* stadium: ours grows GIANT with the ball and bowls straight through their three in a row, then scores */
    titan: scene({ away: 'iron_knuckles', arena: 'stadium', ult: 'titan', H: [-150, 4], Hface: 0,
      opp: [[-70, -2], [-10, 8], [50, -4]], carrier: 'H', a2: [-200, -110],
      after(g, c, t) {
        const H = c.Hh;
        if (c.phase === 'cast') { still(H); if (t - c.t0 > 0.55) c.phase = 'run'; return; }
        if (c.phase === 'run') {
          if (g.ball.owner !== H) { steer(H, g.ball.x, g.ball.y, 1, true); return; }
          H.intent.mx = 1; H.intent.my = 0.02; H.intent.sprint = true;
          if (H.x > c.f.cx + 150) { H.facing = 0; Act.shoot(g, H, 0.95, 0.2); mark('shot'); c.phase = 'done'; }
          return;
        }
        still(H);
      } }),
    /* market: ours rushes their ball carrier: punch barrage, then the blast sends him into his mates; ours scores */
    fists: scene({ away: 'noodle_kickers', arena: 'market', ult: 'hundred_fists', H: [-60, 4],
      opp: [[96, -30], [16, 2], [104, 34]], carrier: 'o1', shoot: { wait: 1.6, aim: -0.25 } }),
    /* rooftop: ours spins into a HURRICANE KICK that swallows the two in his way and the ball carrier */
    hurricane: scene({ away: 'sky_hoppers', arena: 'rooftop', ult: 'hurricane_kick', H: [-80, 2],
      opp: [[-36, -2], [6, 4], [48, -2]], carrier: 'o1', drift: [-0.06, 0] }),
    /* pirate cove: a MEGA MAGNET drops between their three spread-out players and drags them into one heap */
    magnet: scene({ away: 'trash_pandas', arena: 'pirate_cove', ult: 'mega_magnet', H: [-110, 6],
      opp: [[0, -70], [50, 4], [110, 56]], carrier: 'o1', shoot: { wait: 2.3, aim: 0.2 } }),

    /* cyber: MOON STOMP, their three float up helplessly around ours */
    moon: scene({ away: 'glitch_squad', arena: 'cyber', ult: 'moon_stomp', H: [0, 4],
      opp: [[-30, -24], [34, 6], [4, 36]], carrier: 'o1' }),
    /* harbor: CHICKEN RAY through their ball carrier and the two lined up behind him */
    chicken: scene({ away: 'chain_gang', arena: 'harbor', ult: 'chicken_ray', H: [-110, 4],
      opp: [[50, -2], [-30, 4], [120, 8]], carrier: 'o1', drift: [-0.05, 0] }),
    /* village: THUNDERSTORM, bolts drop on each of their players */
    storm: scene({ away: 'paddy_kickers', arena: 'village', ult: 'thunderstorm', H: [-130, 10],
      opp: [[-10, -60], [30, 10], [90, 60]], carrier: 'o1', drift: [-0.04, 0] }),
    /* school: GHOST HANDS burst from the ground under all three of them */
    ghost: scene({ away: 'detention_club', arena: 'school', ult: 'ghost_hands', H: [-70, 4],
      opp: [[10, -40], [36, 14], [90, -12]], carrier: 'o1', drift: [-0.04, 0] }),
    /* alley: ours, on the ball just past halfway, leaps for METEOR SHOT and smashes it down into the goal
       (closer than ~250 px the fireball is still above the bar when it reaches the goal) */
    meteor: scene({ away: 'lantern_crew', arena: 'alley', ult: 'meteor_strike', H: [-40, 10], Hface: 0,
      opp: [[214, -66], [90, -26], [80, 44]], carrier: 'H', a2: [-160, -100] }),
  };

  B.setup = function (name) { SCENES[name](); };
})();
