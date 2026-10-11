/* gc scenes (G37-G48): one Core / screen per clip, added to BRAG.SCENES after scenes.js loads (capture.py injects every scenes_*.js).
   Every scene name starts with gc_. Nothing here runs at load time except Object.assign. */
(function () {
  const { U, Act, PI, app, place, give, face, steer, still, mark, match, cast, ult, at, noAttack, extra, t0focus } = BRAG.lib;
  const B = BRAG;

  // menu screens: SFC.Audio cues are not game sfx -> log them so the soundtrack can play them (names audio.py knows)
  const logMenuAudio = () => {
    const A = SFC.Audio;
    if (A.__gc) return;
    A.__gc = true;
    const map = { tick: 'pass', reveal: 'upgrade', whoosh: 'whoosh', pick: 'pick', menu: 'pass', dismantle: 'kick' };
    for (const k of Object.keys(map)) {
      const f0 = A[k];
      if (typeof f0 !== 'function') continue;
      A[k] = function () { B.sfx.push({ t: B.t, name: map[k], arg: null }); return f0.apply(this, arguments); };
    }
  };
  const menu = (page) => {
    SFC.Profile.data.name = 'NGH';
    logMenuAudio();
    app.toMenu('home');
    if (page) SFC.Menu.go(page);
    return SFC.Menu;
  };
  // the director drives our player itself: switch off keyboard handling (same trick as scenes_ga.js, own flag)
  const noHuman = () => {
    if (!SFC.Human.__gc) {
      const h0 = SFC.Human.update;
      SFC.Human.update = function () { if (B.gcNoHuman) return; return h0.apply(this, arguments); };
      SFC.Human.__gc = true;
    }
    B.gcNoHuman = true;
  };
  const one = (g, re) => { const E = g.effects; E.V.comics = E.V.comics.filter((c) => !re.test(c.str || '')); };

  Object.assign(B.SCENES, {
    /* G37 CHAOS BALL: every pass / shot rolls the ball into something else: melon, cube, wheel -> goal */
    gc_chaos() {
      noHuman();
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(me, 'chaos_ball'); g.cores.add(mate, 'chaos_ball');
      const G = g.attackGoal(0);
      place(me, 430, 132, PI / 2); place(mate, 440, 276, -PI / 2); place(o1, 392, 206, 0); place(o2, G.x - 20, G.y, PI);
      give(g, me);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate);
      const b = g.ball;
      for (const q of [o1, o2]) b.noPickup.set(q.id, 99);
      // rig the dice (the Core still rolls, shows its own label + purple burst; we only choose the faces)
      const CB = SFC.CoreBehaviors.chaos_ball, roll0 = CB.roll;
      const plan = B.gcChaosPlan || [['curve', 'melon'], ['curve', 'cube'], ['rocket', 'wheel']];
      const PSPD = B.gcPassSpd || 250;
      // a pass in flight: keep it readable (slower), and let it home in on the receiver after the curve kicks in
      const fly = (to, dt) => {
        if (b.owner) return;
        const d = U.norm(to.x - b.x, to.y - b.y), s0 = Math.hypot(b.vx, b.vy) || 1;
        const k = Math.min(1, dt * (B.gcHome || 7));
        const vx = b.vx / s0 * (1 - k) + d.x * k, vy = b.vy / s0 * (1 - k) + d.y * k, n = Math.hypot(vx, vy) || 1;
        b.vx = vx / n * PSPD; b.vy = vy / n * PSPD; b.z = Math.min(b.z, 3); b.vz = Math.min(b.vz, 0);
      };
      let k = 0;
      CB.roll = function () {
        const want = plan[k++] || [];
        const pk0 = U.pick; let n = 0;
        U.pick = (arr) => (want[n] != null && arr.includes(want[n]) ? want[n++] : (n++, pk0(arr)));
        try { return roll0.apply(this, arguments); } finally { U.pick = pk0; }
      };
      CB.onPass = function (sys, team, p, pl) { this.roll(sys, team, p, pl, sys.g.ball, false); };
      let step = 0, recv = 0, shot = false;
      B.dir = (dt, g, t) => {
        if (!shot) { steer(o2, G.x - 20, G.y + Math.sin(t * 2) * 5, false); face(o2, b); }
        if (o1.state === 'normal') { still(o1); face(o1, b); }
        // label the object once it is one
        if (b.skin && B.marks['skin_' + b.skin] == null) mark('skin_' + b.skin);
        if (step === 0) { still(me); still(mate); face(me, mate); face(mate, me); if (t > 0.3) { Act.quickPass(g, me, mate.x - me.x, mate.y - me.y); step = 1; mark('pass1'); } return; }
        if (step === 1) { still(me); face(me, b); if (b.owner === mate) { step = 2; recv = B.t; mark('recv1'); } else { fly(mate, dt); still(mate); face(mate, b); } return; }
        if (step === 2) { still(mate); still(me); face(mate, me); if (B.t - recv > 0.35) { Act.quickPass(g, mate, me.x - mate.x, me.y - mate.y); step = 3; mark('pass2'); } return; }
        if (step === 3) { still(mate); face(mate, b); if (b.owner === me) { step = 4; recv = B.t; mark('recv2'); } else { fly(me, dt); still(me); face(me, b); } return; }
        if (step === 4) { still(me); face(me, G); if (B.t - recv > 0.32) { Act.shoot(g, me, 0.7, -0.1); shot = true; step = 5; mark('shot'); } return; }
        still(me); still(mate);
        // keeper: what is THAT -> steps out of its way
        if (B.marks.goal == null) { steer(o2, G.x - 22, G.y + 44, true); }
        if (B.marks.goal == null && b.x < G.x + 4) { b.z = Math.min(b.z, 2); b.vz = Math.min(b.vz, 0); const s1 = Math.hypot(b.vx, b.vy) || 1; if (s1 > 260) { b.vx *= 260 / s1; b.vy *= 260 / s1; } }
      };
      B.focusFn = () => (b.owner ? { x: b.owner.x + 4, y: b.owner.y } : { x: Math.min(b.x, G.x - 40), y: b.y });
    },

    /* G38 WARP WALLS: shot at the top wall... it comes out of the bottom wall and in */
    gc_warp() {
      noHuman();
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(me, 'warp_walls');
      const G = g.attackGoal(0), F0 = g.field;
      const [o3, o4] = extra(g, 1, 2);
      const x0 = 420, y0 = 252;
      place(me, x0, y0, 0); place(mate, 260, 280, 0);
      // a wall straight in front of him, keeper set
      place(o1, 468, 236, PI); place(o3, 478, 212, PI); place(o4, 488, 188, PI); place(o2, G.x - 20, G.y - 6, PI);
      give(g, me);
      B.puppets = new Set([o1, o2, o3, o4, mate]); noAttack(o1, o2, o3, o4, mate);
      const b = g.ball;
      for (const q of [o1, o2, o3, o4, mate]) b.noPickup.set(q.id, 99);
      const wall = [o1, o3, o4], spots = wall.map((o) => ({ x: o.x, y: o.y }));
      const SPD = B.gcWarpSpd || 290;
      // aim: through the top wall, out of the bottom one, into the goal
      const s = (G.x + 6 - x0) / (y0 - F0.y + (F0.y + F0.h - G.y));
      const dir = U.norm(s, -1);
      let shot = false;
      B.dir = (dt, g, t) => {
        steer(mate, 260, 280, false);
        wall.forEach((o, k) => { if (o.state === 'normal') { steer(o, spots[k].x, spots[k].y, false); face(o, B.marks.out != null ? b : me); } });
        if (!shot) {
          still(me); face(me, { x: me.x + dir.x, y: me.y + dir.y });
          steer(o2, G.x - 20, G.y - 6 + Math.sin(t * 2) * 4, false); face(o2, me);
          if (t > (B.gcWarpT || 0.9)) { Act.shoot(g, me, 0.8, 0); b.vx = dir.x * SPD; b.vy = dir.y * SPD; b.vz = 0; b.z = Math.min(b.z, 3); shot = true; mark('shot'); }
          return;
        }
        still(me);
        if (B.marks.goal == null && b.x < G.x + 6) {
          // a flat, straight shot (no bounce, no friction): it is the wall that does the trick
          b.z = Math.min(b.z, 3); b.vz = 0; b.vx = dir.x * SPD; b.vy = dir.y * SPD;
          if (B.marks.warp == null && b.y > F0.y + F0.h - 30) mark('warp');
          if (B.marks.warp != null && B.marks.out == null) mark('out');
        }
        // the keeper watches the top wall where it went...
        if (B.marks.goal == null) { if (B.marks.warp == null) { steer(o2, G.x - 20, G.y - 30, false); face(o2, { x: b.x, y: F0.y }); } else { still(o2); face(o2, b); } b.noPickup.set(o2.id, 99); }
      };
      B.focusFn = () => ({ x: 500, y: 203 });
    },

    /* G39 COUNTER ATTACK: punch the carrier mid-attack -> COUNTER! -> he and his mate surge the length of the pitch -> goal */
    gc_counter() {
      noHuman();
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(me, 'counter_attack');
      const G = g.attackGoal(0);
      const [o3] = extra(g, 1, 1);
      // they are all forward: carrier + runner in our half, keeper far away
      place(me, 214, 214, 0); place(mate, 196, 150, 0); place(o1, 268, 210, PI); place(o3, 250, 268, PI); place(o2, G.x - 20, G.y, PI);
      o1.stats.dribble = 0.05;
      give(g, o1);
      B.puppets = new Set([o1, o2, o3, mate]); noAttack(o1, o2, o3, mate);
      const b = g.ball;
      for (const q of [o2, o3, mate]) b.noPickup.set(q.id, 99);
      let punched = false, shot = false;
      B.dir = (dt, g, t) => {
        me.stamina = 100; mate.stamina = 100;
        if (!punched) {
          o1.intent.mx = -0.45; o1.intent.my = 0; o1.intent.sprint = false;
          steer(o3, o3.x - 3, 268, false);
          still(mate); face(mate, o1);
          steer(me, o1.x - 15, o1.y, false);
          if (t > 0.35 && U.dist(me, o1) < 24 && me.state === 'normal') { face(me, o1); me.cd.light = 0; if (Act.lightAttack(g, me)) mark('swing'); }
          if (B.marks.swing != null && b.owner !== o1) { punched = true; mark('punch'); }
          steer(o2, G.x - 20, G.y, false);
          return;
        }
        if (B.marks.own == null && b.owner === me) mark('own');
        b.noPickup.set(o1.id, 99);
        // everyone turns round... too late
        if (o1.state === 'normal') steer(o1, me.x - 30, me.y, false);
        if (o3.state === 'normal') steer(o3, me.x - 40, me.y + 30, B.t - B.marks.punch > 0.5);
        if (shot) { still(me); steer(mate, G.x - 70, G.y - 40, false); if (B.marks.goal == null) steer(o2, G.x - 22, G.y + 40, true); b.noPickup.set(o2.id, 99); return; }
        steer(o2, G.x - 20, G.y + Math.sin(t * 2) * 5, false);
        // the mate surges too
        if (B.marks.own != null) steer(mate, Math.min(me.x + 10, G.x - 80), 150, true); else still(mate);
        if (me.state !== 'normal') return;
        if (b.owner !== me) { steer(me, b.x, b.y, true); return; }
        if (G.x - me.x > 105) { steer(me, G.x - 95, G.y + 12, true); return; }
        face(me, G); Act.shoot(g, me, 1, -0.55); shot = true; mark('shot');
      };
      B.focusFn = () => (shot && B.t - B.marks.shot > 0.1 ? { x: Math.min(b.x, G.x - 70), y: G.y } : { x: me.x + 40, y: (me.y + 205) / 2 });
    },

    /* G40 BOMB BALL: hot potato. The bomb keeps coming back to him... KABOOM on him */
    gc_bomb() {
      noHuman();
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(o1, 'bomb_ball');
      const st = g.cores.st(o1, 'bomb_ball');
      st.t = g.cores.params('bomb_ball').every - 0.12;
      const C = { x: 318, y: 206 };
      const [m2] = extra(g, 0, 1);
      place(me, C.x, C.y, 0); place(mate, C.x - 4, C.y - 64, PI / 2); place(m2, C.x + 2, C.y + 64, -PI / 2); place(o1, C.x + 72, C.y + 2, PI); place(o2, 564, 203, PI);
      give(g, me);
      B.puppets = new Set([o1, o2, mate, m2]); noAttack(o1, o2, mate, m2);
      const b = g.ball;
      b.noPickup.set(o1.id, 99); b.noPickup.set(o2.id, 99);
      const others = [mate, m2, o1];
      const home = new Map([[mate, { x: C.x - 4, y: C.y - 64 }], [m2, { x: C.x + 2, y: C.y + 64 }], [o1, { x: C.x + 72, y: C.y + 2 }]]);
      // hot potato: he passes it away, it always comes straight back
      const seq = B.gcBombSeq || [[me, mate], [mate, me], [me, m2], [m2, me], [me, mate], [mate, me]];
      let k = 0, got = 0, holder = me, boom = false;
      const words = ['NO!', 'NOPE!', 'NO NO!', 'TAKE IT!'];
      B.dir = (dt, g, t) => {
        if (st.fuse > 0) mark('fuse');
        if (B.marks.fuse != null && st.fuse <= 0 && !boom) { boom = true; mark('boom'); }
        // everybody else backs off right before it goes
        const late = st.fuse > 0 && st.fuse < (B.gcLate || 0.45);
        steer(o2, 564, 203, false);
        for (const q of others) {
          if (q.state !== 'normal') continue;
          const h = home.get(q);
          if (late || boom) { const d = U.norm(q.x - me.x, q.y - me.y); steer(q, me.x + d.x * 120, me.y + d.y * 120, true); }
          else if (b.owner !== q) { steer(q, h.x, h.y, false); face(q, b.owner || b); }
        }
        if (me.state === 'normal' && !boom) { if (b.owner !== me && !b.owner && U.dist(b, me) < 30) steer(me, b.x, b.y, false); else still(me); face(me, b.owner && b.owner !== me ? b.owner : b); }
        if (boom) { if (me.state === 'normal') still(me); return; }
        if (B.marks.fuse == null) return;
        if (b.owner && b.owner !== holder) { holder = b.owner; got = B.t; mark('got' + k); if (holder !== me) g.effects.comic(holder.x, holder.y - 26, words[(k >> 1) % words.length], '#ffffff', 0.85, 0.45); }
        const nx = seq[k];
        if (!nx || b.owner !== nx[0]) return;
        const hold = B.gcHold || 0.16;
        if (B.t - got < hold || (k === 0 && B.t - B.marks.fuse < (B.gcFirst || 0.3))) return;
        const [a, to] = nx;
        Act.passTo(g, a, to, 'ground'); k++; mark('pass' + k);
        for (const q of [mate, m2, me]) if (q !== to) b.noPickup.set(q.id, 0.35);
      };
      B.focusFn = () => ({ x: C.x + 4, y: C.y });
    },

    /* G45 FINAL PUSH: down 1-2, the last 30 s start (goals x2), one goal -> 3-2 */
    gc_final() {
      noHuman();
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      g.teams[0].score = 1; g.teams[1].score = 2;
      g.elapsed = g.cfg.match.duration - 30 - (B.gcPushIn || 0.45);
      const G = g.attackGoal(0);
      place(me, 372, 214, 0); place(mate, 250, 262, 0); place(o1, 440, 176, PI); place(o2, G.x - 20, G.y, PI);
      give(g, me);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate);
      const b = g.ball;
      for (const q of [o1, o2, mate]) b.noPickup.set(q.id, 99);
      let shot = false;
      B.dir = (dt, g, t) => {
        me.stamina = 100;
        steer(mate, 290, 262, false);
        if (o1.state === 'normal') steer(o1, me.x + 26, me.y - 30, false);
        if (shot) { still(me); if (B.marks.goal == null) steer(o2, G.x - 22, G.y - 40, true); return; }
        steer(o2, G.x - 20, G.y + Math.sin(t * 2) * 5, false);
        if (me.state !== 'normal' || b.owner !== me) return;
        if (t < (B.gcGoT || 1.3)) { me.intent.mx = 0.3; me.intent.my = -0.03; me.intent.sprint = false; return; }
        if (G.x - me.x > 100) { steer(me, G.x - 90, G.y + 14, true); return; }
        face(me, G); Act.shoot(g, me, 1, 0.55); shot = true; mark('shot');
      };
      B.focusFn = () => (shot && B.t - B.marks.shot > 0.1 ? { x: Math.min(b.x, G.x - 70), y: G.y } : { x: me.x + 30, y: me.y - 10 });
    },

    /* G46 TITAN vs TITAN: both go giant, stomp through the little guys and crash into each other */
    gc_titans() {
      noHuman();
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      ult(g, me, 'titan'); ult(g, o1, 'titan');
      const C = { x: 320, y: 206 };
      place(me, C.x - 78, C.y, 0); place(o1, C.x + 78, C.y, PI); place(mate, C.x + 24, C.y - 14, PI); place(o2, C.x - 24, C.y + 14, 0);
      const b = g.ball;
      b.owner = null; b.x = C.x; b.y = C.y; b.z = 0; b.vx = b.vy = 0;
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate, me);
      for (const q of [me, o1, o2, mate]) b.noPickup.set(q.id, 99);
      let f1 = false, f2 = false, clash = false;
      B.dir = (dt, g, t) => {
        me.stamina = 100; o1.stamina = 100;
        if (!f1 && t > (B.gcT1 || 0.25)) { f1 = g.cores.activateUltimate(me); if (f1) mark('ult1'); }
        if (f1 && !f2 && B.t - B.marks.ult1 > (B.gcT2 || 0.15)) { f2 = g.cores.activateUltimate(o1); if (f2) mark('ult2'); }
        // the little guys: stuck in the middle, looking up
        for (const q of [mate, o2]) if (q.state === 'normal') { still(q); face(q, q === mate ? o1 : me); }
        const grown = me.titanT > 0 && o1.titanT > 0 && me.sizeMul > 1.6 && o1.sizeMul > 1.6;
        if (grown && B.marks.grown == null) mark('grown');
        if (!clash) {
          if (B.marks.grown != null && B.t - B.marks.grown > (B.gcWait || 0.35)) {
            steer(me, C.x, C.y + 2, true); steer(o1, C.x, C.y - 2, true); face(me, o1); face(o1, me);
          } else { still(me); still(o1); face(me, o1); face(o1, me); }
          const r = (me.radius * me.sizeMul + o1.radius * o1.sizeMul) * 0.75;
          if (B.marks.grown != null && U.dist(me, o1) < Math.max(18, r)) {
            clash = true; mark('clash');
            const E = g.effects, m = t0focus(me, o1);
            g.hitStop(0.14); E.impactFrame(); E.shake(11, 0.6); E.flash(0.6);
            E.wave(m.x, m.y, 70, '#ffd23f', 0.6, 4); E.burst(m.x, m.y, 10, '#ffffff', 26, 170, 0.7); E.burst(m.x, m.y, 2, '#8a7f70', 18, 90, 1.0);
            E.decal('crack', m.x, m.y, 1.6, 4);
            E.comic(m.x, m.y - 64, 'KRAKOOM!!', '#ff6a1f', 1.7, 1.2);
            g.sfx('hit'); g.sfx('wall');
            // titans can't be stunned... they still bounce off each other
            for (const [p, d] of [[me, -1], [o1, 1]]) { p.kbx = d * (B.gcKb || 230); p.kby = 0; p.airVz = 150; p.airZ = Math.max(p.airZ, 1); }
            b.kick(null, 0, -170, 120);
          }
          return;
        }
        for (const p of [me, o1]) if (p.state === 'normal') still(p);
      };
      B.focusFn = () => (B.marks.clash != null ? { x: C.x, y: C.y - 14 } : { x: (me.x + o1.x) / 2, y: C.y - 14 });
    },

    /* G47 METEOR DROP, 2 for 1: they close in from both sides, he leaps off the map, they bonk heads, the meteor gets both */
    gc_drop2() {
      noHuman();
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      ult(g, me, 'meteor_drop');
      const [o3] = extra(g, 1, 1);
      const P0 = { x: 320, y: 214 };
      place(me, P0.x, P0.y, 0); place(o1, P0.x + 84, P0.y - 4, PI); place(o3, P0.x - 84, P0.y + 4, 0); place(mate, 170, 285, 0); place(o2, 564, 203, PI);
      give(g, me);
      B.puppets = new Set([o1, o2, o3, mate]); noAttack(o1, o2, o3, mate);
      const b = g.ball;
      for (const q of [o2, mate, o1, o3]) b.noPickup.set(q.id, 99);
      let fired = false, bonk = false;
      B.dir = (dt, g, t) => {
        steer(mate, 170, 285, false); steer(o2, 564, 203, false);
        const pair = [o1, o3];
        if (!fired) {
          still(me);
          for (const o of pair) if (o.state === 'normal') { steer(o, me.x + (o === o1 ? 14 : -14), me.y, t > 0.15); face(o, me); }
          if (t > (B.gcFire || 0.4) && U.dist(me, o1) < (B.gcFireD || 36)) { fired = g.cores.activateUltimate(me); if (fired) mark('ult'); }
          return;
        }
        // he's gone: they both lunge at where he was... and bonk
        if (!bonk) {
          for (const o of pair) if (o.state === 'normal') { steer(o, P0.x + (o === o1 ? 4 : -4), P0.y, true); face(o, o === o1 ? o3 : o1); }
          if (me.state === 'meteor' && U.dist(o1, o3) < 15) {
            bonk = true; mark('bonk');
            const m = t0focus(o1, o3);
            for (const [o, d] of [[o1, 1], [o3, -1]]) { o.kbx += d * 60; o.airVz = 70; o.airZ = Math.max(o.airZ, 0.5); }
            g.effects.comic(m.x, m.y - 28, 'BONK!', '#ffffff', 1.0, 0.6); g.effects.burst(m.x, m.y - 10, 8, '#fff6a0', 10, 80, 0.4); g.sfx('hit');
          }
        }
        // aim the crash right between them
        if (me.state === 'meteor') { const m = t0focus(o1, o3); steer(me, m.x, m.y + 2, false); }
        else if (me.state === 'normal') still(me);
        if (me.state === 'slam' && B.marks.slam == null) mark('slam');
        if (B.marks.slam != null && me.state !== 'slam' && B.marks.land == null) mark('land');
        // dazed: they just wobble on the spot until the sky falls on them
        for (const o of pair) if (o.state === 'normal' && bonk) { still(o); o.facing = (o === o1 ? 0 : PI) + Math.sin(B.t * 9 + (o === o1 ? 0 : 2)) * 1.2; }
        if (B.marks.land != null) b.noPickup.set(me.id, 0);
      };
      B.focusFn = () => ({ x: P0.x, y: P0.y - 10 });
    },

    /* G48 LIGHTNING DASH from the kickoff: whistle, ult, lightning through both, goal before the clock moves */
    gc_dash() {
      noHuman();
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      ult(g, me, 'lightning_dash');
      const F0 = g.field, G = g.attackGoal(0);
      g.kickoff(0);
      const [o3] = extra(g, 1, 1);
      place(me, F0.cx - 4, F0.cy, 0); place(mate, F0.cx - 90, F0.cy + 50, 0);
      place(o1, F0.cx + 70, F0.cy - 4, PI); place(o3, F0.cx + 128, F0.cy + 6, PI); place(o2, G.x - 20, G.y, PI);
      const b = g.ball;
      b.owner = null; b.x = F0.cx + 2; b.y = F0.cy; b.vx = b.vy = 0;
      B.puppets = new Set([o1, o2, o3, mate]); noAttack(o1, o2, o3, mate);
      for (const q of [o1, o2, o3, mate]) b.noPickup.set(q.id, 99);
      let fired = false, shot = false;
      B.dir = (dt, g, t) => {
        for (const o of [o1, o3]) if (o.state === 'normal') { still(o); face(o, me); }
        still(mate);
        if (g.state !== 'play') { still(me); return; }
        mark('play');
        if (shot) { still(me); if (B.marks.goal == null) steer(o2, G.x - 22, G.y + 40, true); b.noPickup.set(o2.id, 99); return; }
        steer(o2, G.x - 20, G.y + Math.sin(t * 2) * 5, false);
        if (b.owner !== me) { if (me.state === 'normal') steer(me, b.x, b.y, false); return; }
        if (!fired) { me.intent.mx = 1; me.intent.my = 0; if (B.t - B.marks.play > (B.gcDashT || 0.12)) { fired = g.cores.activateUltimate(me); if (fired) mark('ult'); } return; }
        if (me.state !== 'normal') return;
        if (B.marks.dash == null) mark('dash');
        face(me, G); Act.shoot(g, me, 1, 0.5); shot = true; mark('shot');
      };
      B.focusFn = () => (shot && B.t - B.marks.shot > 0.08 ? { x: Math.min(b.x, G.x - 70), y: G.y } : { x: me.x + 40, y: me.y });
    },

    /* ---------- screens (menus driven through their own code) ---------- */
    /* G41 LEGEND BOX: shop -> open the Legend Box -> the reel spins -> LEGENDARY (the pull is rigged to a legendary) */
    gc_box() {
      const M = menu(null), PF = SFC.Profile, Gc = SFC.Gacha;
      Gc.shopBack = 'home'; M.go('shop');
      Gc.boxSel = SFC_CONFIG.progression.boxOrder.indexOf('legend'); M.render();
      const win = B.gcWin || 'flamehair';
      const r0 = PF.roll; let first = true;
      PF.roll = function (id) { if (first) { first = false; return { kind: 'item', id: win, rarity: SFC_CONFIG.progression.items[win].rarity }; } return r0.call(this, id); };
      at(B.gcOpenT || 0.35, () => { Gc.openBox(M, 'legend'); mark('open'); });
      B.focusFn = () => (B.marks.open == null ? { x: 293, y: 140 } : { x: 320, y: 150 });
    },

    /* G42 DRIP CHECK: APPEARANCE screen, the outfit swaps on the beat, ends on the mythic set */
    gc_drip() {
      const PF = SFC.Profile, P = SFC_CONFIG.progression;
      for (const id in P.items) if (!P.items[id].default) PF.data.items[id] = 1;
      Object.assign(PF.data.look, { hair: 'classic', face: 'none', shoes: 'kicks', fx: 'nofx' });
      const M = menu('look');
      const fits = B.gcFits || [
        ['cowboy', 'mustache', 'boots', 'dust'],
        ['cap', 'eyepatch', 'slides', 'bubbles'],
        ['afro', 'shades', 'hightop', 'notes'],
        ['mohawk', 'clown', 'clogs', 'hearts'],
        ['santa', 'beard', 'rainboot', 'snow'],
        ['bandana', 'ninja', 'camo', 'smoke'],
        ['helmet', 'nerd', 'rollers', 'sparkle'],
        ['flamehair', 'skull', 'rocket', 'fire'],
        ['crown', 'lasereyes', 'flame', 'aura'],
      ];
      const t0 = B.gcFit0 || 0.35, dt = B.gcFitDt || 0.3;
      fits.forEach((f, i) => at(t0 + i * dt, () => {
        const [hair, face, shoes, fx] = f;
        Object.assign(PF.data.look, { hair, face, shoes, fx });
        M.render(); M.animT = 0;
        B.sfx.push({ t: B.t, name: i === fits.length - 1 ? 'upgrade' : 'pass', arg: null });
        mark('fit' + i);
      }));
      B.focusFn = () => ({ x: 443, y: 210 });
    },

    /* G43 CORE DRAFT: three superpowers, the cursor hops across them, pick the last one */
    gc_draft() {
      SFC.Profile.data.name = 'NGH';
      app.startMatch({ home: 'street_kings', away: 'neon_strikers', difficulty: 'hard', humanTeam: 0, solo: [1, null] });
      const g = app.game;
      const opts = B.gcDraft || ['titan', 'lightning_dash', 'black_hole'];
      const xs = [158, 320, 482];
      let sel = 0;
      at(0, () => {
        B.lib.hush();
        if (g.state !== 'draft') g.startDraft(true);
        g.draft.options[g.me] = opts.slice();
        SFC.UI.draftSel = 0; SFC.UI.renderDraft(g); SFC.UI.show('draft');
      });
      const hop = B.gcHop || [0.75, 1.3];
      at(hop[0], () => { SFC.UI.setDraftSel(1); sel = 1; mark('sel1'); });
      at(hop[1], () => { SFC.UI.setDraftSel(2); sel = 2; mark('sel2'); });
      at(B.gcPickT || 1.95, () => { SFC.UI.pick(g, 2); mark('pick'); });
      B.focusFn = () => ({ x: xs[sel], y: 182 });
    },

    /* G44a STORY: the PROLOGUE cut scene ("I HAVE A DREAM..." -> "...TO BE THE GOAT") */
    gc_story() {
      menu(null);
      app.screen = 'story';
      SFC.Story.play('intro', () => {}, 'eyes');
      B.focusFn = () => ({ x: 320, y: 180 });
    },

    /* G44b MAIN PATH: flip through the 10 Areas; the ones not reached yet are silhouettes */
    gc_path() {
      const M = menu(null);
      SFC.MainPath.state.area = B.gcArea != null ? B.gcArea : 4;
      M.go('path');
      M.pathView = 0; M.render();
      const t0 = B.gcFlip0 || 0.3, dt = B.gcFlipDt || 0.3;
      for (let v = 1; v < 10; v++) at(t0 + (v - 1) * dt, () => { M.pathView = v; M.render(); B.sfx.push({ t: B.t, name: 'pass', arg: null }); mark('area' + v); });
      B.focusFn = () => ({ x: 441, y: 180 });
    },
  });
})();
