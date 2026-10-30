/* Chill capture director: "sunday league" — 5v5 on a village grass pitch at golden hour.
 * Injected after the real game boots; drives the REAL simulation (passes, shot, keeper, celebration).
 * Video-only tweaks (nothing written to the repo): 5 roles + 1-2-1-1 formation, a 'meadow' arena,
 * no vignette, no in-game goal camera (the comp page does its own camera). */
(function () {
  const U = SFC.U, Act = SFC.Actions, PI = Math.PI;
  const app = SFC.app;
  const B = (window.BRAG = { sfx: [], t: 0, stepT: 0, dir: null, timeline: [], done: 0, marks: {} });
  SFC_CONFIG.intro.enabled = false;

  // ---- video-only config ----
  const G = SFC_CONFIG.game;
  G.render.vignette = 0;
  SFC.Renderer.vig = SFC.Background.vignette();
  G.celebration.camera.zoom = 1;
  // no screen shake / white flash: they would move or tint only the game frame inside the comp's painted sky
  SFC.Effects.prototype.shake = function () {};
  SFC.Effects.prototype.flash = function () {};
  G.match.kickoffVary = null;
  G.roles = ['GK', 'LB', 'RB', 'MID', 'FWD'];
  G.formation = {
    GK: { x: 0.035, y: 0.5 }, LB: { x: 0.17, y: 0.25 }, RB: { x: 0.17, y: 0.75 }, MID: { x: 0.31, y: 0.5 }, FWD: { x: 0.45, y: 0.5 },
  };
  const T = SFC_CONFIG.teams.list;
  T.street_kings.players = ['BRUNO', 'TANK', 'KAI', 'RICO', 'MANU'];
  T.cyber_united.players = ['BYTE', 'NOVA', 'ECHO', 'PIX', 'JUNO'];

  SFC_CONFIG.arenas.meadow = {
    void: '#3d6a2c',
    floor: { style: 'turf', stripe: 24, colors: ['#4e9a3a', '#56a341'], speckD: '#468c34', speckL: '#63b04c', crack: '#468c34', cracks: 0, paint: 0 },
    line: 'rgba(255,255,240,0.82)',
    logo: ' ',
    wall: { style: 'bamboo', colors: ['#c9a85a', '#b8984c', '#d4b466', '#ad8d42'], node: '#86692c', rope: '#6b4a2a', edge: '#3f5a26' },
    rim: { base: '#3a6429', light: '#467531', dark: '#335a24' },
    backdrop: { style: 'fields', sky: ['#ff9f5a', '#ffe0a0'], sun: '#fff3c0', hills: ['#8a7a6a', '#6f6a5a'], paddy: ['#7fbf4a', '#6fae3f', '#8cc65a'], water: 'rgba(200,230,255,0.35)' },
    lights: { style: 'sun', glow: '255,200,120' },
    graffiti: { tags: [] },
    net: 'rgba(255,255,255,0.55)', hole: '#24401a',
    props: [{ t: 'hay', x: 0, dx: -10, dy: 8 }, { t: 'chicken', x: 0.2, dx: 0, dy: 10 }, { t: 'sack', x: 0.62, dx: 0, dy: 10 },
      { t: 'chicken', x: 0.66, dx: 10, dy: 11 }, { t: 'hay', x: 1, dx: 10, dy: 8 }],
    crowd: { sound: 0.1, regions: ['top'], rows: 1, density: 0.07, span: 'field', colors: ['#e8dcc0', '#8a6a44', '#5a7aa0', '#b04a3a', '#f2f2e8'], teamColors: 0.2, cheer: 0.35, flashes: 0, hat: { shape: 'cone', chance: 0.6, colors: ['#f2e2a8', '#e8d49a'] } },
  };

  // log every sound effect the game fires (drives the soundtrack's hit points)
  const sfx0 = SFC.Game.prototype.sfx;
  SFC.Game.prototype.sfx = function (name, arg) { if (!this.silent) B.sfx.push({ t: B.t, name }); return sfx0.call(this, name, arg); };

  // director runs after the AI each sim step
  const ai0 = SFC.AI.update.bind(SFC.AI);
  SFC.AI.update = (dt, g) => { ai0(dt, g); B.stepT += dt; if (B.dir) B.dir(dt, g, B.stepT); };

  // free = may walk outside the pitch (players coming out of the tunnel below the touchline)
  const up0 = SFC.Player.prototype.update;
  SFC.Player.prototype.update = function (dt) {
    if (!this.free) return up0.call(this, dt);
    const x = this.x, y = this.y;
    up0.call(this, dt);
    this.x = x + this.vx * dt; this.y = y + this.vy * dt;
  };

  const place = (p, x, y, facing) => Object.assign(p, {
    x, y, vx: 0, vy: 0, kbx: 0, kby: 0, airZ: 0, airVz: 0, state: 'normal', stateT: 0, hitImmune: 0,
    facing: facing != null ? facing : p.team ? PI : 0,
  });
  const face = (p, q) => { p.facing = Math.atan2(q.y - p.y, q.x - p.x); };
  // walk / jog toward (x, y); v = intent magnitude (1 = full run speed)
  const steer = (p, x, y, v = 1, sprint = false) => {
    const d = Math.hypot(x - p.x, y - p.y);
    if (d < 1.5) { p.intent.mx = 0; p.intent.my = 0; p.intent.sprint = false; return true; }
    const n = U.norm(x - p.x, y - p.y), k = Math.min(1, d / 14) * v;
    p.intent.mx = n.x * k; p.intent.my = n.y * k; p.intent.sprint = !!sprint;
    return false;
  };
  const still = (p) => { p.intent.mx = 0; p.intent.my = 0; p.intent.sprint = false; };
  const hush = () => { const el = document.getElementById('banner'); if (el) { el.classList.remove('show'); el.innerHTML = ''; } if (SFC.UI.clearToasts) SFC.UI.clearToasts(); };
  const mark = (k) => { if (B.marks[k] == null) B.marks[k] = B.t; };
  const at = (t, fn) => B.timeline.push([t, fn]);

  function match(opts) {
    app.startMatch(Object.assign({
      home: 'street_kings', away: 'cyber_united', difficulty: 'normal', humanTeam: -1, noDraft: true, noUlts: true, arena: 'meadow',
    }, opts));
    const g = app.game;
    g.state = 'play'; g.stateT = 0;
    g.elapsed = 0;
    B.puppets = new Set(g.players);
    g.aiHook = (p) => B.puppets.has(p);
    for (const p of g.players) { p.cd.light = p.cd.hard = p.cd.skill = 999; }
    hush();
    return g;
  }
  const byRole = (g, t) => Object.fromEntries(g.teams[t].players.map((p) => [p.role, p]));

  B.frame = function (t) {
    B.t = t;
    while (B.done < B.timeline.length && t >= B.timeline[B.done][0]) { B.timeline[B.done][1](); B.done++; }
    const g = app.game;
    hush();
    const f = B.focusFn ? B.focusFn(g) : null;
    return {
      focus: f ? { x: Math.round(f.x * 10) / 10, y: Math.round(f.y * 10) / 10 } : null, state: g ? g.state : null,
      ball: g ? [Math.round(g.ball.x * 10) / 10, Math.round(g.ball.y * 10) / 10, Math.round(g.ball.z)] : null,
      score: g ? [g.teams[0].score, g.teams[1].score] : null,
      pl: g ? g.players.map((p) => [p.team, p.role, Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10]) : null,
    };
  };

  const SCENES = {
    /* the whole "sunday league" take, one continuous shot */
    sunday() {
      const g = match({});
      const f = g.field;
      const red = byRole(g, 0), blue = byRole(g, 1);
      const R = g.teams[0].players, Bl = g.teams[1].players;
      // formation spots (red attacks right). Blue's striker waits outside the centre circle.
      const spot = new Map();
      for (const p of g.players) spot.set(p, g.formationPos(p));
      spot.set(red.FWD, { x: f.cx - 9, y: f.cy });
      spot.set(blue.FWD, { x: f.cx + 46, y: f.cy - 14 });
      spot.set(blue.MID, { x: f.cx + 104, y: f.cy + 6 });

      // everybody waits in the tunnel below the bottom touchline (off frame), ball on the centre spot
      g.ball.reset(f.cx, f.cy);
      g.ball.owner = null;
      const tunnelY = 420;
      const order = ['GK', 'LB', 'RB', 'MID', 'FWD'];
      for (const p of g.players) {
        const i = order.indexOf(p.role);
        place(p, p.team ? f.cx + 9 : f.cx - 9, tunnelY + i * 15, -PI / 2);
        p.free = true;
        p.look.cel = 'airplane';
      }
      const WALK_T0 = 2.4, GAP = 0.42;   // first pair leaves the tunnel at WALK_T0, then one pair every GAP s
      const KICK = 11.6;                 // referee whistle
      const lineY = f.y + f.h - 30;      // walk up the middle to here, then peel off to the spot

      let phase = 'walk';
      let stage = 0, stageT = 0;
      const go = (s) => { stage = s; stageT = B.t; };

      B.dir = (dt, g, t) => {
        if (phase === 'walk') {
          for (const p of g.players) {
            const i = order.indexOf(p.role), t0 = WALK_T0 + i * GAP;
            if (t < t0) { still(p); continue; }
            const s = spot.get(p);
            if (!p.peeled) {
              // up the middle in two files, then peel off
              const ty = lineY - i * 6;
              if (steer(p, p.team ? f.cx + 9 : f.cx - 9, ty, 0.62) || p.y < ty + 2) p.peeled = true;
            } else if (steer(p, s.x, s.y, 0.62)) { p.facing = p.team ? PI : 0; }
            if (p.y < f.y + f.h - 8) p.free = false;
          }
          if (t >= KICK - 0.25) {
            for (const p of g.players) { const s = spot.get(p); place(p, s.x, s.y, p.team ? PI : 0); still(p); p.free = false; }
            g.ball.reset(f.cx, f.cy); g.ball.owner = null;
            phase = 'ready';
          }
          return;
        }
        if (phase === 'ready') {
          for (const p of g.players) still(p);
          if (t >= KICK) {
            g.sfx('whistle'); mark('kick');
            g.gainPossession(red.FWD);
            phase = 'play'; go(0);
          }
          return;
        }
        if (phase === 'play') {
          const b = g.ball, st = t - stageT;
          const goal = g.attackGoal(0);
          // blue: a lazy zonal shuffle, never a tackle
          for (const p of Bl) {
            const s = spot.get(p);
            if (p === blue.GK) { if (p.state === 'normal') steer(p, s.x - 3, f.cy + (b.y - f.cy) * 0.25, 0.5); continue; }
            const amp = p === blue.MID ? 0.22 : p === blue.FWD ? 0.3 : 0.12;
            steer(p, s.x + (b.x - s.x) * amp, s.y + (b.y - s.y) * amp * 0.5, 0.5);
          }
          steer(red.GK, spot.get(red.GK).x + 8, f.cy + (b.y - f.cy) * 0.2, 0.4);
          steer(red.RB, f.cx - 40 + (stage >= 2 ? 70 : 0), f.y + f.h - 48, 0.5);
          if (stage === 0) {
            // kickoff: striker rolls it back to the midfielder
            still(red.FWD); still(red.MID); still(red.LB);
            if (st > 0.45 && b.owner === red.FWD) { Act.passTo(g, red.FWD, red.MID, 'ground'); mark('p1'); go(1); }
          } else if (stage === 1) {
            steer(red.FWD, f.cx + 40, f.cy + 8, 0.45);
            steer(red.LB, f.cx - 46, f.y + 40, 0.6);
            if (b.owner === red.MID) {
              mark('r1');
              steer(red.MID, f.cx - 60, f.cy - 8, 0.5);
              if (t - B.marks.r1 > 0.9) { Act.passTo(g, red.MID, red.LB, 'ground'); mark('p2'); go(2); }
            } else steer(red.MID, b.x, b.y, 0.55);
          } else if (stage === 2) {
            steer(red.MID, f.cx + 10, f.cy - 6, 0.5);
            steer(red.FWD, goal.x - 112, f.cy + 22, 0.62);
            if (b.owner === red.LB) {
              mark('r2');
              steer(red.LB, f.cx + 100, f.y + 36, 0.75);
              if (t - B.marks.r2 > 1.6) { Act.passTo(g, red.LB, red.FWD, 'ground'); mark('p3'); go(3); }
            } else steer(red.LB, b.x, b.y, 0.65);
          } else if (stage === 3) {
            steer(red.LB, f.cx + 120, f.y + 50, 0.35);
            steer(red.MID, f.cx + 50, f.cy - 10, 0.45);
            if (b.owner === red.FWD) {
              mark('r3');
              steer(red.FWD, goal.x - 60, f.cy + 12, 0.72);
              if (t - B.marks.r3 > 1.1) { face(red.FWD, goal); const sp = G.kick.shotSpread; G.kick.shotSpread = 0; Act.shoot(g, red.FWD, 0.5, 0.85); G.kick.shotSpread = sp; mark('shot'); go(4); }
            } else steer(red.FWD, b.x, b.y, 0.7);
          } else if (stage === 4) {
            still(red.FWD);
            // keeper guesses the wrong way
            if (blue.GK.state === 'normal' && B.marks.dive == null && t - B.marks.shot > 0.12) { Act.dive(g, blue.GK, -40); mark('dive'); }
          }
          if (g.state === 'goal') { mark('goal'); phase = 'goal'; }
          if (B.marks.shot != null && !B.dbg) { B.dbg = 1; B.shotPos = g.players.map((p) => [p.team, p.role, Math.round(p.x), Math.round(p.y)]); }
          return;
        }
        if (phase === 'goal') {
          if (g.state !== 'goal') phase = 'after';
          return;
        }
        if (phase === 'after') {
          // everybody strolls back for the restart
          for (const p of g.players) {
            const s = spot.get(p);
            if (steer(p, s.x, s.y, 0.42)) p.facing = p.team ? PI : 0;
          }
        }
      };
      // after the celebration: no kickoff teleport, the match just keeps "playing" while players walk back
      g.afterGoal = function () { this.state = 'play'; for (const p of this.players) { p.celId = null; still(p); } phase = 'after'; mark('restart'); };
      B.focusFn = () => g.ball;
    },
  };

  B.setup = function (name, arena) {
    B.arena = arena || 'meadow';
    SCENES[name]();
  };
})();
