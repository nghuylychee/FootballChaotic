/* Diver capture director: "yep. that's me." — THE KID vs the pitch rules. Injected after the real game boots;
 * drives the REAL simulation (MatchMods pitch rules, Chicken Ray, celebrations) and the real cut-scene player (TV / film tells).
 * Video-only tweaks (nothing written to the repo): rule timings so each gag lands on cue, longer stun / chicken time, no celebration zoom. */
(function () {
  const U = SFC.U, Act = SFC.Actions, PI = Math.PI;
  const app = SFC.app;
  const B = (window.BRAG = { sfx: [], t: 0, stepT: 0, dir: null, timeline: [], done: 0, marks: {} });
  SFC_CONFIG.intro.enabled = false;
  const G = SFC_CONFIG.game, MODS = SFC_CONFIG.stories.mods, ST = SFC_CONFIG.stories;
  G.celebration.camera.zoom = 1;   // the comp page does its own camera
  G.render.vignette = 0;
  SFC.Renderer.vig = SFC.Background.vignette();
  G.match.kickoffVary = null;

  // log every sound the game fires, with its argument (ult recipe key) -> soundtrack hit points + offline game audio
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
  const drop = (g, x, y) => { const o = g.ball.owner; if (o) g.looseBall(o, 0, 0, 0); g.ball.reset(x, y); g.ball.owner = null; };
  const mark = (k) => { if (B.marks[k] == null) B.marks[k] = B.t; };
  const say = (g, p, text, color) => g.effects.pop(p.x, p.y - 34, text, 'talk', color);
  const roundOf = (team) => { for (const s of ST.list) for (const r of s.rounds) if (r.team === team) return r; return {}; };
  const kid = (g) => g.teams[0].players.find((p) => p.role === 'FWD');
  const KIT = (g, t) => g.teams[t].cfg.kit.shirt;

  function match(away, arena, extra) {
    const rd = roundOf(away);
    SFC.Profile.data.name = 'KID';
    // THE KID: bucket hat, band-aid, tube socks, naps after scoring (set on the avatar directly: the test profile owns none of them)
    // (sprite look: cut = hairstyle / hat, hair = hair colour; Profile.lookOf converts the saved look)
    const look = Object.assign({}, SFC.Profile.lookOf(), { cut: 'bucket', face: 'bandaid', shoes: 'socks', fx: 'nofx', cel: 'nap' });
    app.startMatch(Object.assign({
      home: SFC_CONFIG.mainPath.playerTeam.id, away, difficulty: 'normal', humanTeam: 0, solo: [2, null], noDraft: true, arena,
      avatars: [{ name: 'KID', look, role: 'FWD' }, null],
      mod: rd.mod || null, barks: rd.barks || null, score: rd.score || null, knockout: true,
    }, extra));
    const g = app.game;
    g.state = 'play'; g.stateT = 0;
    B.puppets = new Set(g.players);
    const modHook = g.aiHook;
    g.aiHook = (p) => B.puppets.has(p) || (modHook ? modHook(p) : false);
    for (const p of g.players) { p.cd.light = p.cd.hard = p.cd.skill = 999; }
    if (g.mod) g.mod.barkT = 1e9;   // no automatic barks: the director says each line on cue
    return g;
  }

  B.frame = function (t) {
    B.t = t;
    while (B.done < B.timeline.length && t >= B.timeline[B.done][0]) { B.timeline[B.done][1](); B.done++; }
    const g = app.screen === 'story' ? null : app.game;
    if (g && B.onFrame) B.onFrame(g, t);   // runs in every match state (the AI hook does not run during 'goal')
    const f = B.focusFn ? B.focusFn(g) : null;
    const r1 = (v) => Math.round(v * 10) / 10;
    return {
      focus: f ? { x: r1(f.x), y: r1(f.y) } : null, state: g ? g.state : null,
      ball: g ? [r1(g.ball.x), r1(g.ball.y), Math.round(g.ball.z)] : null,
      score: g ? [g.teams[0].score, g.teams[1].score] : null,
      kid: g ? (() => { const k = kid(g); return [r1(k.x), r1(k.y), Math.round(k.airZ)]; })() : null,
      pl: g ? g.players.map((p) => [p.team, r1(p.x), r1(p.y), Math.round(p.airZ)]) : null,
    };
  };

  const SCENES = {
    /* village pitch: THE KID dribbles alone, the Uncles watch (already 0-1 up), one grabs a plastic stool and throws it. BONK. */
    village() {
      const g = match('ward_uncles', 'village');
      const f = g.field, me = kid(g), M = g.mod, c = M.cfg;
      const mates = g.teams[0].players.filter((p) => p !== me), [u0, u1, u2] = g.teams[1].players;
      place(me, f.cx - 80, f.cy + 14, 0); give(g, me);
      place(mates[0], f.x + 40, f.cy - 40, 0); place(mates[1], f.x + 70, f.cy + 70, 0);
      place(u0, f.x + f.w - 34, f.cy, PI); place(u1, f.cx + 46, f.cy - 44, PI); place(u2, f.cx + 34, f.cy + 52, PI);
      // stools: one right next to the thrower, two more as scenery
      for (const s of M.list) if (!s.dead) g.effects.propOff(s.id, 0);
      M.list = [];
      const stool = (x, y) => { const s = { x, y, r: c.r, id: SFC.CoreHelpers.propId(g) }; M.list.push(s); g.effects.prop(s.id, 'stool', x, y, U.rand(-1, 1), 0, 9999, c.color); return s; };
      const mine = stool(u1.x - 14, u1.y + 12);
      stool(f.cx - 150, f.cy - 70); stool(f.cx + 150, f.cy + 80);
      const T_PICK = 2.2;
      let thrown = false;
      B.dir = (dt, g, t) => {
        for (const p of mates) still(p);
        for (const p of [u0, u2]) { still(p); if (p.state === 'normal') face(p, me); }
        if (t < T_PICK) { still(u1); face(u1, me); } else if (!u1.carry && !thrown) steer(u1, mine.x, mine.y, 1, true); else still(u1);
        if (M.flying.length && !thrown) { thrown = true; mark('throw'); say(g, u1, 'Sit down, kids!', KIT(g, 1)); }
        if (me.state === 'stun') mark('bonk');
        if (B.marks.bonk == null) { if (g.ball.owner === me) { me.intent.mx = t < 1.8 ? 0.32 : 0.18; me.intent.my = -0.02; me.intent.sprint = false; } }
        else still(me);
        if (B.marks.bonk != null && me.state === 'normal' && B.marks.up == null) { mark('up'); say(g, me, '...', '#f3ead7'); }
      };
      B.focusFn = () => me;
    },

    /* rooftop: the pigeons drop three bombs around the loose ball; THE KID walks over to it and steps right in one */
    rooftop() {
      Object.assign(MODS.pigeons, { first: 0.5, every: [30, 40], n: 3, spread: 18, stun: 1.8, slide: 110 });
      const g = match('pigeon_gang', 'rooftop');
      const f = g.field, me = kid(g), M = g.mod;
      const mates = g.teams[0].players.filter((p) => p !== me), opp = g.teams[1].players, cap = opp[opp.length - 1];
      place(me, f.cx - 76, f.cy + 16, 0);
      drop(g, f.cx + 4, f.cy + 16);
      place(mates[0], f.x + 50, f.cy - 50, 0); place(mates[1], f.x + 60, f.cy + 70, 0);
      place(opp[0], f.x + f.w - 34, f.cy, PI); place(opp[1], f.cx + 90, f.cy + 70, PI); place(cap, f.cx + 70, f.cy - 46, PI);
      B.dir = (dt, g, t) => {
        for (const p of mates) still(p);
        for (const p of opp) { still(p); if (p.state === 'normal') face(p, me); }
        if (M.drops.length && B.marks.flock == null) { mark('flock'); say(g, cap, 'Bombs away!', KIT(g, 1)); }
        const landed = B.marks.flock != null && !M.drops.length && M.splats.length;
        if (landed) mark('landed');
        if (me.state === 'stun') mark('flop');
        if (B.marks.flop != null) { still(me); if (me.state === 'normal' && B.marks.up == null) { mark('up'); say(g, me, '...', '#f3ead7'); } return; }
        // he walks over to the ball... via the splat right next to it
        if (B.marks.landed != null && t - B.marks.landed > 0.3 && M.splats.length) {
          const b = g.ball, s = M.splats.reduce((a, q) => (Math.hypot(q.x - b.x, q.y - b.y) < Math.hypot(a.x - b.x, a.y - b.y) ? q : a));
          steer(me, s.x, s.y, 0.6); mark('walk');
        }
        else { still(me); face(me, g.ball); }
      };
      B.focusFn = () => me;
    },

    /* night market: giant chopsticks pluck THE KID into the noodle pot; he bounces out, fires Chicken Ray through three aunties, walks it in, naps */
    market() {
      Object.assign(MODS.chopsticks, { first: 0.4, every: [60, 80], trailing: 1, aiDodge: 0 });
      Object.assign(SFC_CONFIG.cores.list.chicken_ray.params, { time: 7 });
      const g = match('market_mamas', 'market');
      const f = g.field, me = kid(g), M = g.mod;
      const mates = g.teams[0].players.filter((p) => p !== me), [a0, a1, a2] = g.teams[1].players;
      const goal = g.attackGoal(0);
      place(me, f.x + f.w * 0.13, f.cy + 24, 0); give(g, me);
      place(mates[0], f.x + 30, f.cy + 70, 0); place(mates[1], f.x + 40, f.cy - 70, 0);
      place(a0, f.x + f.w - 40, f.cy, PI); place(a1, f.cx + 40, f.cy + 10, PI); place(a2, f.cx + 90, f.cy - 50, PI);
      let phase = 'run', line = null, land = null;
      B.dir = (dt, g, t) => {
        for (const p of mates) still(p);
        const grab = M.grabs[0];
        if (phase === 'run') {
          if (me.state === 'normal' && g.ball.owner === me) { me.intent.mx = 0.55; me.intent.my = -0.04; me.intent.sprint = false; } else still(me);
          for (const p of [a0, a2]) { still(p); face(p, me); }
          still(a1); face(a1, me);
          if (grab && grab.phase === 'carry') { mark('grab'); phase = 'carry'; }
          return;
        }
        if (phase === 'carry') {
          // an auntie strolls over and takes the loose ball
          if (g.ball.owner !== a1) steer(a1, g.ball.x, g.ball.y, 1, true); else still(a1);
          for (const p of [a0, a2]) still(p);
          if (grab && grab.phase === 'pot') mark('pot');
          if (grab && grab.phase === 'fly') {
            mark('fly');
            phase = 'fly';
            // fixed landing spot (the rule picks a random one): first fly step has barely moved him, so no visible jump
            grab.lx = goal.x - 205; grab.ly = f.cy + 14;
            land = { x: grab.lx, y: grab.ly };
            // three aunties line up between where he lands and the goal: the beam will go through all of them
            const d = U.norm(goal.x - 70 - land.x, f.cy - land.y);
            line = { d, spots: [62, 92, 122].map((k) => ({ x: land.x + d.x * k, y: land.y + d.y * k })) };
          }
          return;
        }
        if (phase === 'fly') {
          [a1, a2, a0].forEach((p, i) => { if (steer(p, line.spots[i].x, line.spots[i].y, 1, true)) face(p, me); });
          if (!grab && me.state === 'normal' && me.airZ <= 0) { mark('land'); phase = 'stand'; }
          return;
        }
        const tl = t - B.marks.land;
        if (phase === 'stand') {
          [a1, a2, a0].forEach((p, i) => { if (steer(p, line.spots[i].x, line.spots[i].y, 0.8)) face(p, me); });
          still(me); face(me, a1);
          if (tl > 0.25 && B.marks.sweat == null) { mark('sweat'); say(g, me, '...', '#f3ead7'); }
          if (tl > 0.9 && B.marks.armed == null) {
            // same as the Ultimate test room: straight into the Core list, no ULT BOOK / discovery banner
            mark('armed');
            const cs = g.cores, own = cs.own[me.id] || (cs.own[me.id] = []);
            own.push('chicken_ray'); me.ult = 'chicken_ray'; me.ultLv = 1; me.res.ult = 1;
          }
          const lined = [a1, a2, a0].every((p, i) => Math.hypot(p.x - line.spots[i].x, p.y - line.spots[i].y) < 4) && g.ball.owner === a1;
          if (tl > 1.5 && (lined || tl > 3.2)) {
            for (const p of [a1, a2, a0]) { still(p); p.vx = p.vy = 0; }
            if (g.cores.activateUltimate(me)) { mark('ult'); phase = 'ult'; }
          }
          return;
        }
        if (phase === 'ult') {
          for (const p of [a1, a2, a0]) still(p);
          still(me);
          if ([a1, a2, a0].some((p) => p.chickenT > 0)) { mark('chickens'); phase = 'walk'; }
          return;
        }
        // chickens scatter in a panic (zigzag), clear of his path: one stays close enough to complain on camera
        if (B.marks.chickens != null) {
          const T = t - B.marks.chickens;
          const flee = [[a1, f.cx - 10, f.y + 34], [a2, goal.x - 120, f.cy - 46], [a0, goal.x - 60, f.y + f.h - 30]];
          for (const [p, x, y] of flee) { if (p.state !== 'normal') continue; steer(p, x + Math.sin(T * 7 + p.id) * 14, y + Math.cos(T * 5 + p.id) * 10, 1); }
        }
        if (phase === 'walk') {
          if (g.ball.owner !== me) steer(me, g.ball.x, g.ball.y, 0.85);
          else {
            mark('gotball');
            const gx = goal.x - 46, gy = f.cy + (me.y - f.cy) * 0.3;
            if (steer(me, gx, gy, 0.85) || Math.hypot(gx - me.x, gy - me.y) < 6) {
              face(me, goal);
              const sp = G.kick.shotSpread; G.kick.shotSpread = 0; Act.shoot(g, me, 0.3, 0); G.kick.shotSpread = sp;
              mark('shot'); phase = 'shot';
            }
          }
          return;
        }
        if (phase === 'shot') still(me);
      };
      B.onFrame = (g, t) => {
        if (g.state === 'goal') mark('goal');
        if (B.marks.goal != null && t - B.marks.goal > 0.7 && B.marks.refund == null) { mark('refund'); say(g, a2, 'I want a refund!', KIT(g, 1)); }
      };
      B.focusFn = () => me;
    },

    /* stadium: King Leo turns back into his 1976 self and the Legends FUSE */
    leo() {
      Object.assign(MODS.leo, { first: 0.9, every: [60, 80] });
      const g = match('old_legends', 'stadium');
      const f = g.field, me = kid(g), opp = g.teams[1].players, leo = opp[opp.length - 1];
      const mates = g.teams[0].players.filter((p) => p !== me);
      place(me, f.cx - 40, f.cy + 20, 0); give(g, me);
      place(mates[0], f.x + 60, f.cy - 40, 0); place(mates[1], f.x + 70, f.cy + 60, 0);
      place(opp[0], f.cx + 120, f.cy - 50, PI); place(opp[1], f.cx + 110, f.cy + 60, PI); place(leo, f.cx + 50, f.cy, PI);
      B.dir = (dt, g, t) => {
        for (const p of g.players) { still(p); if (p.state === 'normal' && p !== leo) face(p, leo); }
        if (g.mod.leo) mark('cast');
      };
      B.focusFn = () => leo;
    },

    /* the real TV-show tell (NIGHT MARKET CUP): Uncle Noodle live on NMTV */
    tv() {
      const s = ST.list.find((x) => x.id === 'market_cup'), N = s.narrator;
      const base = { color: s.color, stage: s.stages[4], channel: s.channel, ticker: (s.ticker || []).join('   ★   ') };
      const scenes = [
        Object.assign({}, base, { card: true, dur: 1.1, lines: [] }),
        Object.assign({}, base, { art: 'cupHost', who: 'host', host: N, theme: s.theme, trophy: s.trophy, fillers: s.fillers, dur: 9,
          lines: [{ at: 0.2, who: 'host', text: "Tonight's special... YOU!", style: 'caption' }] }),
      ];
      app.screen = 'story';
      SFC.Story.play(scenes, null, null, { speaker: () => ({ name: N.name, color: s.color }), music: false, tell: 'tv' });
    },

    /* the real film-reel tell (GRANDPA'S LEGENDS): sepia flashback */
    film() {
      const s = ST.list.find((x) => x.id === 'legends_cup'), N = s.narrator;
      const base = { color: s.color, stage: s.stages[4] };
      const scenes = [
        Object.assign({}, base, { card: true, dur: 1.0, lines: [] }),
        Object.assign({}, base, { art: 'cupMemory', who: 'host', host: N, theme: s.theme, trophy: s.trophy, fillers: s.fillers, dur: 9, young: true, team: 'legends_76',
          lines: [{ at: 0.2, who: 'host', text: 'Fifty years ago, it was him and me.', style: 'caption' }] }),
      ];
      app.screen = 'story';
      SFC.Story.play(scenes, null, null, { speaker: () => ({ name: N.name, color: s.color }), music: false, tell: 'film' });
    },
  };

  B.setup = function (name) { SCENES[name](); };
})();
