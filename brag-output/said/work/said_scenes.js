/* "THEY SAID" capture director: pre-match interviews vs what really happens on the pitch. Injected after the real game boots;
 * drives the REAL simulation (MatchMods pitch rules: stools, pigeons, refs, King Leo 1976) and draws the interview portraits with the game's own sprites.
 * Video-only tweaks (nothing written to the repo): rule timings so each gag lands on cue, longer stun / card time, no celebration zoom. */
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
  // THE KID: bucket hat, band-aid, tube socks (set on the avatar directly: the test profile owns none of them)
  // (sprite look: cut = hairstyle / hat, hair = hair colour; Profile.lookOf converts the saved look)
  const kidLook = () => Object.assign({}, SFC.Profile.lookOf(), { cut: 'bucket', face: 'bandaid', shoes: 'socks', fx: 'nofx', cel: 'nap' });

  function match(away, arena, extra) {
    const rd = roundOf(away);
    SFC.Profile.data.name = 'KID';
    app.startMatch(Object.assign({
      home: SFC_CONFIG.mainPath.playerTeam.id, away, difficulty: 'normal', humanTeam: 0, solo: [2, null], noDraft: true, arena,
      avatars: [{ name: 'KID', look: kidLook(), role: 'FWD' }, null],
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
    /* village pitch: THE KID dribbles alone (the Uncles are already 1-0 up), one grabs a plastic stool and throws it. BONK. */
    village() {
      const g = match('ward_uncles', 'village');
      const f = g.field, me = kid(g), M = g.mod, c = M.cfg;
      // u1 = the thrower = their captain UNCLE SAU (players[2]), the one interviewed
      const mates = g.teams[0].players.filter((p) => p !== me), [u0, u2, u1] = g.teams[1].players;
      place(me, f.cx - 80, f.cy + 14, 0); give(g, me);
      place(mates[0], f.x + 40, f.cy - 40, 0); place(mates[1], f.x + 70, f.cy + 70, 0);
      place(u0, f.x + f.w - 34, f.cy, PI); place(u1, f.cx + 46, f.cy - 44, PI); place(u2, f.cx + 34, f.cy + 52, PI);
      // stools: one right next to the thrower, two more as scenery
      for (const s of M.list) if (!s.dead) g.effects.propOff(s.id, 0);
      M.list = [];
      const stool = (x, y) => { const s = { x, y, r: c.r, id: SFC.CoreHelpers.propId(g) }; M.list.push(s); g.effects.prop(s.id, 'stool', x, y, U.rand(-1, 1), 0, 9999, c.color); return s; };
      const mine = stool(u1.x - 14, u1.y + 12);
      stool(f.cx - 150, f.cy - 70); stool(f.cx + 150, f.cy + 80);
      const T_PICK = 1.2;
      let thrown = false;
      B.dir = (dt, g, t) => {
        for (const p of mates) still(p);
        for (const p of [u0, u2]) { still(p); if (p.state === 'normal') face(p, me); }
        if (t < T_PICK) { still(u1); face(u1, me); } else if (!u1.carry && !thrown) steer(u1, mine.x, mine.y, 1, true); else still(u1);
        if (M.flying.length && !thrown) { thrown = true; mark('throw'); }
        if (me.state === 'stun') mark('bonk');
        if (B.marks.bonk == null) { if (g.ball.owner === me) { me.intent.mx = t < 0.9 ? 0.32 : 0.18; me.intent.my = -0.02; me.intent.sprint = false; } }
        else still(me);
      };
      B.focusFn = () => me;
    },

    /* rooftop: the flock drops a carpet of bombs around the loose ball; THE KID walks over to it and steps right in one */
    rooftop() {
      Object.assign(MODS.pigeons, { first: 0.4, every: [30, 40], n: 5, spread: 30, stun: 1.8, slide: 110 });
      const g = match('pigeon_gang', 'rooftop');
      const f = g.field, me = kid(g), M = g.mod;
      const mates = g.teams[0].players.filter((p) => p !== me), opp = g.teams[1].players;
      place(me, f.cx - 76, f.cy + 16, 0);
      drop(g, f.cx + 4, f.cy + 16);
      place(mates[0], f.x + 50, f.cy - 50, 0); place(mates[1], f.x + 60, f.cy + 70, 0);
      place(opp[0], f.x + f.w - 34, f.cy, PI); place(opp[1], f.cx + 90, f.cy + 70, PI); place(opp[2], f.cx + 70, f.cy - 46, PI);
      B.dir = (dt, g, t) => {
        for (const p of mates) still(p);
        for (const p of opp) { still(p); if (p.state === 'normal') face(p, me); }
        if (M.drops.length) mark('flock');
        const landed = B.marks.flock != null && !M.drops.length && M.splats.length;
        if (landed) mark('landed');
        if (me.state === 'stun') mark('flop');
        if (B.marks.flop != null) { still(me); return; }
        // he walks over to the ball... via the splat right next to it
        if (B.marks.landed != null && t - B.marks.landed > 0.2 && M.splats.length) {
          const b = g.ball, s = M.splats.reduce((a, q) => (Math.hypot(q.x - b.x, q.y - b.y) < Math.hypot(a.x - b.x, a.y - b.y) ? q : a));
          steer(me, s.x, s.y, 0.6); mark('walk');
        }
        else { still(me); face(me, g.ball); }
      };
      B.focusFn = () => me;
    },

    /* plaza: a Retired Ref flattens THE KID with a sliding kick (no whistle). THE KID gets up, gives him the tiniest shove: WHISTLE, FOUL!, yellow card. */
    refs() {
      Object.assign(MODS.refs, { yellowTime: 3.2 });
      const g = match('retired_refs', 'plaza');
      const f = g.field, me = kid(g), M = g.mod;
      // r0 = the ref who fouls = their captain VAR (players[2]), the one interviewed
      const mates = g.teams[0].players.filter((p) => p !== me), [r2, r1, r0] = g.teams[1].players;
      place(me, f.cx - 70, f.cy + 10, 0); give(g, me);
      place(mates[0], f.x + 40, f.cy - 50, 0); place(mates[1], f.x + 60, f.cy + 70, 0);
      place(r0, f.cx + 10, f.cy - 46, PI / 2); place(r1, f.cx + 120, f.cy + 60, PI); place(r2, f.x + f.w - 40, f.cy, PI);
      me.stats.dribble = 0.01;   // the ref's sliding kick always takes the ball
      let phase = 'dribble';
      B.dir = (dt, g, t) => {
        for (const p of mates) still(p);
        for (const p of [r1, r2]) { still(p); if (p.state === 'normal') face(p, me); }
        if (phase === 'dribble') {
          if (g.ball.owner === me) { me.intent.mx = 0.3; me.intent.my = 0; }
          // the ref steps in from the side and kicks him off the ball
          const d = Math.hypot(me.x - r0.x, me.y - r0.y);
          if (t > 0.35 && d > 30) steer(r0, me.x + 10, me.y - 6, 1, true);
          else if (t > 0.35) { still(r0); face(r0, me); r0.cd.hard = 0; if (Act.hardAttack(g, r0)) { mark('slide'); phase = 'down'; } }
          else { still(r0); face(r0, me); }
          return;
        }
        if (phase === 'down') {
          still(me);
          if (me.state === 'stun' || me.airZ > 0) mark('hit');
          // the ref picks up the ball and stands there, very official
          if (r0.state === 'normal') { if (g.ball.owner !== r0) steer(r0, g.ball.x, g.ball.y, 0.7); else { still(r0); face(r0, me); } }
          if (B.marks.hit != null && me.state === 'normal' && me.airZ <= 0) { mark('up'); phase = 'walk'; }
          return;
        }
        if (phase === 'walk') {
          still(r0); if (r0.state === 'normal') face(r0, me);
          if (t - B.marks.up < 0.6) { still(me); face(me, r0); return; }
          // one small step, one tiny shove
          const d = Math.hypot(me.x - r0.x, me.y - r0.y);
          if (d > 17) { steer(me, r0.x, r0.y, 0.45); return; }
          still(me); face(me, r0);
          me.cd.light = 0;
          if (Act.lightAttack(g, me)) { mark('shove'); phase = 'card'; }
          return;
        }
        still(me); still(r0);
        if (M.cards[me.id]) mark('card');
        if (r0.state === 'normal') face(r0, me);
      };
      B.focusFn = () => me;
    },

    /* stadium: King Leo turns back into his 1976 self, the Legends FUSE, and he goes through THE KID like lightning */
    leo() {
      Object.assign(MODS.leo, { first: 0.9, every: [60, 80], hp: 99 });
      const g = match('old_legends', 'stadium');
      const f = g.field, me = kid(g), opp = g.teams[1].players, leo = opp[opp.length - 1];
      const mates = g.teams[0].players.filter((p) => p !== me);
      place(me, f.cx - 30, f.cy + 10, 0); give(g, me);
      place(mates[0], f.x + 60, f.cy - 50, 0); place(mates[1], f.x + 70, f.cy + 70, 0);
      place(opp[0], f.cx + 120, f.cy - 50, PI); place(opp[1], f.cx + 110, f.cy + 60, PI); place(leo, f.cx + 50, f.cy, PI);
      B.dir = (dt, g, t) => {
        const L = g.mod.leo;
        if (L) mark('cast');
        if (L && L.phase === 'run') { mark('run'); B.puppets.delete(leo); }   // fused: the rule's own AI drives him
        for (const p of g.players) {
          if (!B.puppets.has(p)) continue;
          still(p);
          if (p.state === 'normal' && p !== leo) face(p, leo);
        }
        if (me.state === 'stun') mark('bump');
      };
      B.onFrame = (g) => { if (g.state === 'goal') mark('goal'); };
      B.focusFn = () => leo;
    },
  };

  B.setup = function (name) { SCENES[name](); };

  /* interview portraits: the game's own standing sprite (40x44), n frames at 30 fps, as one PNG strip */
  B.portraits = function (n) {
    const T = (id) => SFC.MainPath.team(id);
    const cap = (id, i) => ({ look: SFC.MainPath.teamLook(id, i), kit: T(id).kit });
    const legends = ST.list.find((s) => s.id === 'legends_cup').narrator;
    const who = {
      uncle: cap('ward_uncles', 2),
      feathers: cap('pigeon_gang', 2),
      var: cap('retired_refs', 2),
      kid: { look: kidLook(), kit: SFC_CONFIG.mainPath.playerTeam.kit },
      grandpa: { look: legends.look, kit: legends.kit },
    };
    const out = {};
    for (const [k, w] of Object.entries(who)) {
      const one = document.createElement('canvas'); one.width = 40; one.height = 44;
      const strip = document.createElement('canvas'); strip.width = 40 * n; strip.height = 44;
      const sx = strip.getContext('2d');
      const look = Object.assign({}, w.look, { fx: 'nofx' });   // no particles over the face
      for (let i = 0; i < n; i++) { SFC.Sprites.drawAvatar(one, look, w.kit, i / 30, PI / 2); sx.drawImage(one, i * 40, 0); }
      out[k] = strip.toDataURL('image/png');
    }
    return out;
  };
})();
