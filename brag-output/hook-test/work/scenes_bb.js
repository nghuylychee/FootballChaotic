/* bb scenes (bodies B7-B11): added to BRAG.SCENES after scenes.js loads (capture.py injects every scenes_*.js).
   Every scene name starts with bb_. Nothing here runs at load time except Object.assign.
   The game is 3v3 with signature ultimates since f37a64b; these scenes play 2v2 without default ultimates (teamSize / noUlts),
   like every take captured before, and only draft Cores that the current draft really offers (no ultimates). */
(function () {
  const { U, Act, PI, app, place, give, face, steer, still, mark, match, cast, ult, at, noAttack, extra, t0focus } = BRAG.lib;
  const B = BRAG;
  const M22 = { teamSize: [2, 2], noUlts: true };
  const xs = [158, 320, 482];

  // a real draft screen: build = cores already picked (round 1 picks them), then the round we show; the cursor walks hops, then picks
  function draft({ build, opts, sel0, hops, pickT }) {
    SFC.Profile.data.name = 'NGH';
    app.startMatch(Object.assign({ home: 'street_kings', away: 'neon_strikers', difficulty: 'hard', humanTeam: 0, solo: [1, null] }, M22));
    const g = app.game;
    let sel = sel0;
    at(0, () => {
      B.lib.hush();
      if (g.state !== 'draft') g.startDraft(true);
      if (build) {
        g.draft.options[g.me] = [build, 'phantom_step', 'maestro'];
        g.pickCore(0);
        if (g.state !== 'draft') g.startDraft(false);
      }
      g.draft.options[g.me] = opts.slice();
      SFC.UI.draftSel = sel0; SFC.UI.renderDraft(g); SFC.UI.show('draft');
      B.lib.hush();
    });
    hops.forEach(([t, i]) => at(t, () => { SFC.UI.setDraftSel(i); sel = i; B.sfx.push({ t: B.t, name: 'pass', arg: null }); mark('sel' + i); }));
    at(pickT, () => { SFC.UI.pick(g, sel); mark('pick'); });
    B.focusFn = () => ({ x: xs[sel], y: 182 });
  }

  Object.assign(B.SCENES, {
    /* B7 pick 1: STARTING CORE 1/5, the cursor walks across, picks Black Hole Shot */
    bb_draft1() { draft({ build: null, opts: ['giant_fist', 'phantom_step', 'black_hole'], sel0: 0, hops: [[0.5, 1], [1.0, 2]], pickT: 1.6 }); },
    /* B7 pick 2: CORE UPGRADE 2/5 (build: Black Hole Shot), Fireball */
    bb_draft2() { draft({ build: 'black_hole', opts: ['ghost_ball', 'fire_shot', 'wall_slam'], sel0: 0, hops: [[0.5, 1]], pickT: 1.15 }); },
    /* B8 the revenge pick: CORE UPGRADE 2/5 (build: Street Fighter), Giant Fist */
    bb_draft3() { draft({ build: 'street_fighter', opts: ['sonic_boom', 'giant_fist', 'shadow_clone'], sel0: 0, hops: [[0.5, 1]], pickT: 1.15 }); },

    /* B7 stacked: Black Hole Shot + Fireball on one charged shot: a burning black hole drags both defenders and the keeper into the net */
    bb_stack() {
      const g = match(M22);
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(me, 'black_hole'); g.cores.add(me, 'fire_shot');
      const G = g.attackGoal(0);
      const [gk] = extra(g, 1, 1);
      place(me, G.x - 250, G.y + 4, 0); place(mate, 190, 270, 0); place(o1, G.x - 150, G.y - 34, PI); place(o2, G.x - 112, G.y + 36, PI); place(gk, G.x - 18, G.y, PI);
      give(g, me);
      B.puppets = new Set([o1, o2, mate, gk]); noAttack(o1, o2, mate, gk);
      const b = g.ball;
      for (const q of [o1, o2, mate, gk]) b.noPickup.set(q.id, 99);
      let shot = false;
      B.dir = (dt, g, t) => {
        steer(mate, 190, 270, false);
        if (!shot) {
          for (const o of [o1, o2]) { still(o); face(o, me); }
          steer(gk, G.x - 18, G.y + Math.sin(t * 2) * 5, false);
          me.intent.mx = 0.5; me.intent.my = 0;
          if (t > 0.6) { face(me, G); Act.shoot(g, me, 1, 0); shot = true; mark('shot'); }
          return;
        }
        still(me);
        // the black hole crawls toward goal and everything near it gets dragged along (as in g_blackhole)
        if (b.x < G.x + 4 && B.marks.goal == null) { b.owner = null; b.vx = B.t - B.marks.shot < 0.25 ? Math.max(b.vx * 0.9, 95) : 95; b.vy = (G.y - b.y) * 1.2; b.z = Math.min(b.z, 2); }
        for (const o of [o1, o2, gk]) {
          const d = Math.hypot(b.x - o.x, b.y - o.y);
          if (d < 90 && b.x < G.x) { o.state = o.state === 'normal' ? 'stun' : o.state; o.stateT = Math.max(o.stateT, 0.4); o.x += (b.x - o.x) * Math.min(1, dt * 3.2); o.y += (b.y - o.y) * Math.min(1, dt * 3.2); o.facing += dt * 14; }
        }
      };
      B.focusFn = () => (shot ? { x: Math.min(b.x - 20, G.x - 60), y: b.y } : me);
    },

    /* B8 rival: he dropkicks me off the ball, takes it (EZ) and strolls past me... I get up: GIANT FIST, he flies into his own goal area, I score */
    bb_revenge() {
      const g = match(M22);
      const { mate, me, o1, o2 } = cast(g);
      const E = g.effects, b = g.ball, G = g.attackGoal(0);
      g.cores.add(me, 'street_fighter'); g.cores.add(me, 'giant_fist');
      place(me, 300, 206, 0); place(o1, 272, 206, 0); place(mate, 170, 280, 0); place(o2, G.x - 20, G.y - 8, PI);
      give(g, me);
      B.puppets = new Set([o1, o2, mate]); noAttack(o2, mate);
      for (const q of [o2, mate]) b.noPickup.set(q.id, 99);
      o1.cd.light = 99;
      let kicked = false, punched = false, shot = false;
      B.dir = (dt, g, t) => {
        steer(mate, 170, 280, false);
        if (!shot) steer(o2, G.x - 20, G.y - 8 + Math.sin(t * 2) * 4, false);
        else if (B.marks.goal == null) steer(o2, G.x - 22, G.y - 44, true);
        // 1. the dropkick from behind
        if (!kicked) {
          me.intent.mx = 0.15; me.intent.my = 0; still(o1); face(o1, me);
          if (t > 0.3) { kicked = Act.hardAttack(g, o1); if (kicked) { mark('kick'); o1.cd.hard = 99; } }
          return;
        }
        if (me.state === 'stun' && B.marks.fly == null) { mark('fly'); me.kbx = 260; me.kby = 0; }
        // 2. he takes it, shows off, then strolls past me with it
        if (!punched && o1.state === 'normal') {
          if (b.owner !== o1) { if (B.marks.fly != null && B.t - B.marks.fly > 0.15) steer(o1, b.x, b.y, false); else still(o1); }
          else {
            if (B.marks.ez == null) { mark('ez'); E.comic(o1.x - 4, o1.y - 32, 'EZ', '#ffffff', 1.2, 1.0); }
            if (B.t - B.marks.ez < 0.7) { still(o1); o1.facing = PI / 2; }
            else { o1.intent.mx = 0.42; o1.intent.my = 0.02; o1.intent.sprint = false; }
          }
        }
        // 3. me: back up once he is past -> 5 Rage -> GIANT FIST from behind
        if (!punched) {
          if (me.state !== 'normal' || B.marks.fly == null) return;
          me.res.rage = 5; me.cd.light = 0;
          if (o1.x < me.x + 14 || b.owner !== o1) { still(me); face(me, o1); return; }
          mark('up');
          steer(me, o1.x - 20, o1.y, true);
          if (U.dist(me, o1) < 30) { face(me, o1); punched = Act.lightAttack(g, me); if (punched) mark('punch'); }
          return;
        }
        b.noPickup.set(o1.id, 99);
        if (o1.state === 'stun' && B.marks.payback == null) {
          mark('payback'); o1.kbx = 330; o1.kby = -30; o1.airVz = Math.max(o1.airVz, 180);
          E.comic(o1.x + 10, o1.y - 50, 'REVENGE!', '#ff3d5a', 1.5, 1.1);
        }
        // 4. the ball, the shot
        if (me.state !== 'normal') return;
        if (shot) { still(me); return; }
        if (b.owner !== me) { steer(me, b.x, b.y, true); return; }
        mark('own');
        if (B.t - B.marks.own < 0.25) { still(me); face(me, G); return; }
        face(me, G); Act.shoot(g, me, 1, 0.6); shot = true; mark('shot');
      };
      B.focusFn = () => (shot && B.t - B.marks.shot > 0.08 ? { x: Math.min(b.x, G.x - 60), y: G.y }
        : B.marks.payback != null ? { x: (me.x + Math.min(o1.x, G.x)) / 2, y: 206 } : t0focus(me, o1));
    },

    /* B11 clutch: 1-2, 5 seconds left, FINAL PUSH (goals x2): steal, CLONE ARMY, the keeper bites on a decoy, GOAL x2 -> 3-2 */
    bb_clutch() {
      const g = match(M22);
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(me, 'clone_army'); me.res.ult = 0.9;
      g.teams[0].score = 1; g.teams[1].score = 2;
      g.elapsed = g.cfg.match.duration - (B.bbRem || 5.0);
      for (const p of [mate, o2]) p.cd.light = p.cd.hard = 99;
      const G = g.attackGoal(0);
      place(me, 330, 200, 0); place(mate, 236, 262, 0); place(o1, 378, 196, PI); place(o2, G.x - 40, G.y, PI);
      give(g, o1);
      o1.stats = Object.assign({}, o1.stats, { dribble: 0.1 });   // the steal must land first time (no HOLD)
      let punched = false, fired = false, shot = false;
      B.puppets = new Set([o1, o2, mate]);
      B.dir = (dt, g, t) => {
        if (!punched) {
          o1.intent.mx = -0.4; o1.intent.my = 0;
          if (t > 0.35) steer(me, o1.x - 16, o1.y, true); else still(me);
          if (t > 0.6 && U.dist(me, o1) < 24) { face(me, o1); punched = Act.lightAttack(g, me); if (punched) mark('punch'); }
          return;
        }
        o1.cd.light = o1.cd.hard = 99;
        if (B.marks.own == null) for (const q of [o1, o2, mate]) g.ball.noPickup.set(q.id, 1);
        if (o1.state === 'normal') still(o1);
        if (fired) steer(o2, G.x - 26, G.y + 34, true);   // keeper bites on a decoy
        else steer(o2, G.x - 22, G.y + Math.sin(t * 2) * 6, false);
        steer(mate, 290, 270, false);
        if (me.state !== 'normal') return;
        if (!fired) {
          if (g.ball.owner !== me) { steer(me, g.ball.x, g.ball.y, false); return; }
          mark('own');
          me.intent.mx = 0.42; me.intent.my = 0;
          if (B.t - B.marks.own > 0.3 && !g.cores.ultReady(me)) me.res.ult = 1;
          if (B.t >= (B.bbUltT || 2.25) && g.cores.ultReady(me)) { fired = g.cores.activateUltimate(me); if (fired) mark('ult'); }
          return;
        }
        if (!shot && g.ball.owner === me) {
          if (G.x - me.x > 70) steer(me, G.x - 60, G.y + 22, true);
          else { face(me, G); Act.shoot(g, me, 0.95, -0.9); shot = true; mark('shot'); }
        } else if (shot) still(me);
      };
      B.focusFn = () => (shot ? g.ball : me);
    },
  });
})();
