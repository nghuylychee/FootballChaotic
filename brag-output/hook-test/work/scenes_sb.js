/* sb scenes (S24–S36): added to BRAG.SCENES after scenes.js loads (capture.py injects every scenes_*.js).
   Every scene name starts with sb_. Runtime patches (friendly fire, flying into the net) live inside their scene only. */
(function () {
  const { U, Act, PI, place, give, face, steer, still, mark, match, cast, at, noAttack, extra, t0focus } = BRAG.lib;
  const B = BRAG;
  const lerp = (a, b, k) => a + (b - a) * k;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = (k, p = 2.2) => 1 - Math.pow(1 - clamp(k, 0, 1), p);
  // loose ball on rails: velocity that puts it exactly at (x, y) after this sim step
  const drive = (b, x, y, dt) => { b.owner = null; b.vx = (x - b.x) / dt; b.vy = (y - b.y) / dt; };
  // scripted ultimate banner (same cut-in + freeze the game plays), for ultimates the scene performs itself
  const fakeUlt = (g, p, name, color) => { g.effects.cutIn(p.id, name, color, 0.8); g.hitStop(0.6); g.sfx('upgrade'); };
  // keep one comic of a kind on screen (counters, ?)
  const solo = (E, re) => { E.V.comics = E.V.comics.filter((c) => !re.test(c.str || '')); };
  const fire = (g, p) => { p.res.ult = 1; return g.cores.activateUltimate(p); };

  Object.assign(B.SCENES, {
    /* S24 the ball rolls to the goal line, stops dead, wobbles... then tips in as the keeper dives */
    sb_line_wobble() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const G = g.attackGoal(0), E = g.effects, b = g.ball;
      place(me, G.x - 118, G.y + 24, 0); place(mate, 250, 272, 0); place(o1, G.x - 215, G.y - 70, 0); place(o2, G.x - 16, G.y - 2, PI);
      give(g, me);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate);
      for (const q of [o1, o2, mate]) b.noPickup.set(q.id, 99);
      const SX = G.x - 5, SY = G.y - 20, RUN = 1.3, WOB = 1.9;
      let shot = false, x0 = 0, y0 = 0, T0 = 0, phase = 0, T1 = 0, q = 0, lunge = false;
      B.dir = (dt, g, t) => {
        steer(mate, 250, 272, false); steer(o1, G.x - 205, G.y - 60, false);
        if (!shot) {
          me.intent.mx = 0.42; me.intent.my = 0;
          steer(o2, G.x - 16, G.y - 2, false); face(o2, me);
          if (t > 0.5) { face(me, { x: SX, y: SY }); Act.shoot(g, me, 0, 0.5); shot = true; mark('shot'); x0 = b.x; y0 = b.y; T0 = t; b.noPickup.set(me.id, 99); }
          return;
        }
        still(me); face(me, b);
        if (phase === 0) {
          if (B.marks.dive == null && t - T0 > 0.12 && o2.state === 'normal') { Act.dive(g, o2, 46); mark('dive'); }
          const k = (t - T0) / RUN;
          if (k < 1) { const e = ease(k, 2.6); drive(b, lerp(x0, SX, e), lerp(y0, SY, e), dt); b.z = 0; b.vz = 0; }
          else { phase = 1; T1 = t; mark('line'); b.x = SX; b.y = SY; b.vx = b.vy = 0; }
          return;
        }
        if (phase === 1) {
          // on the line: it rocks forward... and back... (never past x = G.x, so no goal yet)
          const w = t - T1, a = 0.5 + 1.4 * Math.min(1, w / WOB);
          b.vx = b.vy = 0; b.z = 0; b.vz = 0;
          b.x = SX - 0.2 - a + Math.min(a, 1.6) + Math.sin(w * 11) * a; b.y = SY;
          b.roll = Math.sin(w * 11) * 2.2;
          if (w > 0.3 + q * 0.45 && q < 3) { q++; solo(E, /^\?/); E.comic(b.x - 22, b.y - 34, '?'.repeat(q), '#ffffff', 0.6 + q * 0.1, 0.5); }
          // the keeper picks himself up and scrambles back... late
          if (o2.state === 'normal' && !lunge && w > 1.05) steer(o2, b.x - 7, b.y + 30, true);
          if (!lunge && w > WOB - 0.14 && o2.state === 'normal') { lunge = true; still(o2); face(o2, b); Act.dive(g, o2, b.y - o2.y - 2); mark('lunge'); }
          if (w >= WOB) { phase = 2; mark('tip'); b.vx = 30; b.vy = 0; b.roll += 1; }
          return;
        }
        if (o2.state === 'normal') still(o2);
      };
      B.focusFn = () => (shot ? { x: b.x - 18, y: b.y - 4 } : t0focus(me, { x: G.x - 40, y: G.y }));
    },

    /* S25 the keeper walks off, the net is empty... and he hits the post from 5 metres */
    sb_no_keeper() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const G = g.attackGoal(0), F = g.field, E = g.effects, b = g.ball;
      place(me, G.x - 150, G.y + 22, 0); place(mate, 230, 262, 0); place(o1, 300, 116, PI); place(o2, G.x - 16, G.y, PI);
      give(g, me);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate);
      for (const q of [o1, o2, mate]) b.noPickup.set(q.id, 99);
      at(0.2, () => { E.comic(o2.x - 6, o2.y - 28, 'BRB', '#ffffff', 1.1, 1.0); g.sfx('whoosh'); });
      const PY = F.y + (F.h - F.goalWidth) / 2 - 2.4;   // a hair outside the top post
      let shot = false, post = false;
      B.dir = (dt, g, t) => {
        steer(mate, 230, 262, false); steer(o1, 300, 116, false);
        // the keeper strolls off to the corner and turns his back on the game
        if (t > 0.25) { if (o2.y > 104 && !post) steer(o2, G.x - 42, 98, false); else { still(o2); o2.facing = -PI / 2; } }
        else { still(o2); face(o2, me); }
        if (!shot) {
          if (t < 1.75) { me.intent.mx = 0.55; me.intent.my = -0.12; }
          else {
            face(me, { x: G.x, y: PY }); Act.shoot(g, me, 0.2, -1);
            const d = U.norm(G.x - 2 - b.x, PY - b.y); b.vx = d.x * 330; b.vy = d.y * 330; b.z = 1; b.vz = 0;
            b.noPickup.set(me.id, 99); shot = true; mark('shot');
          }
          return;
        }
        still(me);
        if (!post && b.vx < 0) {
          post = true; mark('post');
          b.vx = -150; b.vy = 64; b.vz = 70;
          E.comic(G.x - 12, PY - 22, 'CLANG!', '#ffe14f', 1.4, 0.9); E.shake(4, 0.3); g.sfx('clang');
          E.burst(G.x, PY, 6, '#ffffff', 10, 90, 0.4);
        }
      };
      B.focusFn = () => (shot ? { x: G.x - 50, y: 188 } : { x: me.x + 30, y: 190 });
    },

    /* S26 two Meteor Shots on the same ball: mid-air clash, KABOOM, both blasted away, the ball just drops */
    sb_meteor_clash() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const E = g.effects, b = g.ball;
      const CX = 320, CY = 212;
      place(me, CX - 34, CY, 0); place(o1, CX + 34, CY, PI); place(mate, 140, 285, 0); place(o2, 566, 203, PI);
      b.owner = null; b.x = CX; b.y = CY; b.z = 0; b.vx = b.vy = b.vz = 0;
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate, me);
      for (const q of [me, o1, o2, mate]) b.noPickup.set(q.id, 99);
      at(0.25, () => { fakeUlt(g, me, 'METEOR SHOT', '#ff6a1f'); mark('cut1'); });
      at(0.95, () => { fakeUlt(g, o1, 'METEOR SHOT', '#7f6bff'); mark('cut2'); });
      let T0 = null, phase = 0, TK = 0, TB = 0, n = 0;
      const H = 64;
      const pose = (p, x, z, atkT) => { p.x = x; p.y = CY; p.vx = p.vy = 0; p.airZ = z; p.airVz = 0; p.state = 'recover'; p.stateT = 1; p.atkType = 'hard'; p.atkT = atkT; };
      B.dir = (dt, g, t) => {
        steer(mate, 140, 285, false); steer(o2, 566, 203, false);
        if (B.marks.cut2 == null || B.t < 1.6) { if (B.marks.cut2 == null) { face(me, o1); face(o1, me); still(me); still(o1); } return; }
        if (T0 == null) { T0 = t; mark('leap'); g.sfx('whoosh'); E.burst(me.x, me.y, 0, '#8a7f70', 12, 80); E.burst(o1.x, o1.y, 0, '#8a7f70', 12, 80); E.wave(CX, CY, 30, '#ffffff', 0.4, 2); }
        const s = t - T0;
        if (phase === 0) {
          // up they go, the ball between them
          const h = H * Math.sin(Math.min(1, s / 0.42) * PI / 2);
          pose(me, CX - 34, h, 0.02); pose(o1, CX + 34, h, 0.02); me.facing = 0; o1.facing = PI;
          me.atkType = o1.atkType = null;
          b.x = CX; b.y = CY; b.z = h + 4; b.vx = b.vy = 0; b.vz = 0; b.skin = 'fireball';
          if (s > 0.5) { phase = 1; TK = s; mark('swing'); }
          return;
        }
        if (phase === 1) {
          // both swing at it from either side
          const k = Math.min(1, (s - TK) / 0.16);
          pose(me, CX - 34 + 18 * ease(k), H, 0.3 + k * 0.1); pose(o1, CX + 34 - 18 * ease(k), H, 0.3 + k * 0.1); me.facing = 0; o1.facing = PI;
          b.x = CX; b.z = H + 4; b.vz = 0;
          if (k >= 1) { phase = 2; TB = s; mark('clash'); E.comic(CX, CY - H - 26, 'CLASH!!', '#ffffff', 1.4, 0.9); E.impactFrame(); E.flash(0.5); E.shake(6, 0.3); g.sfx('hit', 'hard'); g.sfx('kick', 1); }
          return;
        }
        if (phase === 2) {
          // the struggle: neither ball nor boots give an inch
          const w = s - TB, j = Math.sin(w * 60) * 1.2;
          pose(me, CX - 16 + j * 0.6, H + Math.sin(w * 47) * 0.8, 0.42); pose(o1, CX + 16 + j * 0.6, H - Math.sin(w * 51) * 0.8, 0.42); me.facing = 0; o1.facing = PI;
          b.x = CX + j; b.y = CY; b.z = H + 4 + Math.sin(w * 73) * 0.8; b.vz = 0;
          E.shake(3.5, 0.1);
          if (Math.floor(w / 0.05) > n) { n = Math.floor(w / 0.05);
            E.burst(CX - 3, CY, H + 4, '#ff6a1f', 4, 120, 0.35); E.burst(CX + 3, CY, H + 4, '#9d7bff', 4, 120, 0.35);
            if (n % 3 === 0) { E.wave(CX, CY - H - 6, 14 + (n % 9), n % 2 ? '#ff6a1f' : '#9d7bff', 0.3, 2); g.sfx('zap'); }
            if (n % 6 === 0) { E.speedLines(0.3, CX, CY - H - 6, n % 12 ? '#ffd8b0' : '#d8c8ff'); E.tint(n % 12 ? '#ff6a1f' : '#7f6bff', 0.12, 0.12); }
          }
          if (w > 0.95) {
            phase = 3; mark('boom');
            E.impactFrame(); E.flash(0.9); E.shake(10, 0.7);
            E.V.comics.length = 0; E.comic(CX, CY - H + 6, 'KABOOM!!', '#ff3d5a', 1.9, 1.4);
            E.burst(CX, CY, H, '#ffd23f', 40, 220, 0.9); E.burst(CX, CY, H, '#ff6a1f', 30, 180, 0.8); E.burst(CX, CY, H, '#9d7bff', 20, 160, 0.7);
            E.wave(CX, CY - H, 60, '#ffd23f', 0.6, 3); E.wave(CX, CY, 70, '#ffffff', 0.7, 2);
            g.sfx('hit', 'hard'); g.sfx('goal');
            for (const [p, dx] of [[me, -1], [o1, 1]]) { p.state = 'normal'; p.atkType = null; p.hitImmune = 0; p.hit({ stun: 3.5, kbx: dx * 125, kby: 10, launch: 110, source: null, type: 'hard' }); }
            b.vx = 0; b.vy = 0; b.vz = 40;
          }
          return;
        }
        // aftermath: the ball drops between them like nothing happened
        if (b.z <= 0.01 && b.skin) { b.skin = null; E.burst(b.x, b.y, 2, '#9a9a9a', 12, 50, 0.9); }
        b.vx = b.vy = 0;
        for (const p of [me, o1]) if (p.state === 'normal') still(p);
      };
      B.focusFn = () => ({ x: CX, y: CY - (phase >= 1 && phase < 3 ? H * 0.75 : T0 != null && phase === 0 ? 30 : 6) });
    },

    /* S27 clone wars: two armies of 8 identical clones face off behind their originals, charge,
       wind up all at once... and everybody gets wrecked */
    sb_clone_wars() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const E = g.effects, b = g.ball;
      const LX = 266, RX = 374, CY = 205, rows = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => CY + (k - 3.5) * 29);
      place(me, LX - 36, CY, 0); place(o1, RX + 36, CY, PI); place(mate, 110, 290, 0); place(o2, 566, 203, PI);
      b.owner = null; b.x = 150; b.y = 318; b.z = 0; b.vx = b.vy = 0;
      B.puppets = new Set([o2, mate, o1]); noAttack(o2, mate, o1, me);
      for (const q of [me, o1, o2, mate]) b.noPickup.set(q.id, 99);
      const army = [[], []];
      for (const [src, ti, x] of [[me, 0, LX], [o1, 1, RX]]) {
        extra(g, ti, 8).forEach((q, r) => {
          q.look = src.look; q.name = src.name;
          place(q, x, rows[r], ti ? PI : 0);
          B.puppets.add(q); b.noPickup.set(q.id, 99); q.cd.light = q.cd.hard = 99;
          army[ti].push(q);
        });
      }
      at(0.5, () => { E.comic(me.x, me.y - 30, 'CHARGE!', '#9d7bff', 1.0, 0.7); E.comic(o1.x, o1.y - 30, 'CHARGE!', '#ff3d5a', 1.0, 0.7); g.sfx('whistle'); mark('shout'); });
      let wound = false, n = 0;
      const back = new Set();
      B.dir = (dt, g, t) => {
        steer(mate, 110, 290, false); steer(o2, 566, 203, false);
        // the two originals stay back like generals
        for (const p of [me, o1]) { still(p); p.facing = p.team ? PI : 0; }
        if (B.t < 0.72) { for (const q of army[0].concat(army[1])) if (q.state === 'normal') { still(q); q.facing = q.team ? PI : 0; } return; }
        mark('charge');
        if (!wound) {
          for (let r = 0; r < 8; r++) { const a = army[0][r], c = army[1][r]; steer(a, c.x, c.y, true); steer(c, a.x, a.y, true); }
          let gap = 0; for (let r = 0; r < 8; r++) gap += army[1][r].x - army[0][r].x;
          if (gap / 8 < 40) {
            wound = true; mark('windup');
            for (const q of army[0].concat(army[1])) { still(q); q.facing = q.team ? PI : 0; q.cd.hard = 0; Act.hardAttack(g, q); }
          }
          return;
        }
        for (const q of army[0].concat(army[1])) if (q.state === 'windup' || q.state === 'normal') { still(q); q.facing = q.team ? PI : 0; }
        // boots meet everywhere at once: whoever got hit first hits back (nobody wins)
        for (let r = 0; r < 8; r++) {
          const a = army[0][r], c = army[1][r];
          for (const [p, q, dx] of [[a, c, -1], [c, a, 1]]) if (q.state === 'stun' && !back.has(p) && p.state !== 'stun') {
            back.add(p); back.add(q);
            p.hitImmune = 0; p.state = 'normal';
            p.hit({ stun: 0.8, kbx: dx * 150, kby: (Math.random() - 0.5) * 300, launch: 190, source: q, type: 'hard' });
            E.text(p.x, p.y - 30, 'SMASH!', '#ff3d5a');
            if (!n++) { mark('wipe'); E.impactFrame(); E.flash(0.6); E.shake(9, 0.6); E.comic(320, CY - 40, 'KA-BLAM!!', '#ff3d5a', 1.7, 1.2); g.sfx('hit', 'hard'); }
          }
        }
        // short flights (the carnage stays on screen)... and they stay down
        for (const q of army[0].concat(army[1])) if (q.state === 'stun') { if (Math.abs(q.kbx) > 150) q.kbx = Math.sign(q.kbx) * 150; if (q.airZ <= 0) q.stateT = Math.max(q.stateT, 2); }
      };
      B.focusFn = () => ({ x: 320, y: CY });
    },

    /* S28 titan vs titan... and the normal guy standing between them: SQUISH, off to space, THUD */
    sb_titan_sandwich() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const E = g.effects, b = g.ball;
      const CX = 320, CY = 214;
      place(me, CX - 78, CY, 0); place(o1, CX + 78, CY, PI); place(o2, CX, CY, PI / 2); place(mate, 130, 288, 0);
      // both already Titans (2x, stun immune) from frame 0
      for (const p of [me, o1]) { p.titanT = 99; p.sizeTarget = 2; p.sizeT = 0; p.sizeMul = 2; p.radius = 12; }
      b.owner = null; b.x = 150; b.y = 300; b.z = 0;
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate, me);
      for (const q of [me, o1, o2, mate]) b.noPickup.set(q.id, 99);
      at(0.3, () => E.text(o2.x, o2.y - 26, '?', '#ffffff'));
      at(0.75, () => E.comic(o2.x, o2.y - 28, '?!', '#ffe14f', 0.9, 0.7));
      let squish = false, landed = false, stepT = 0;
      B.dir = (dt, g, t) => {
        steer(mate, 130, 288, false);
        if (!squish) {
          // the little guy looks left... looks right...
          if (t < 0.55) face(o2, me); else if (t < 0.85) face(o2, o1); else o2.facing = PI / 2;
          still(o2); o2.x = CX; o2.y = CY;
          if (t > 0.95) {
            steer(me, CX, CY, true); steer(o1, CX, CY, true); mark('run');
            if ((stepT -= dt) <= 0) { stepT = 0.28; E.shake(3, 0.12); for (const p of [me, o1]) { E.decal('crack', p.x, p.y, 0.6, 2); E.burst(p.x, p.y, 0, '#8a7f70', 5, 40); } g.sfx('wall'); }
          } else { still(me); still(o1); face(me, o2); face(o1, o2); }
          if (U.dist(me, o2) < 21 && U.dist(o1, o2) < 21) {
            squish = true; mark('squish');
            o2.hitImmune = 0; o2.hit({ stun: 6, kbx: 0, kby: 0, launch: 560, source: me, type: 'hard' });
            E.comic(CX, CY - 40, 'SQUISH!', '#ff3d5a', 1.6, 1.0); E.impactFrame(); E.flash(0.6); E.shake(9, 0.5);
            E.wave(CX, CY, 50, '#ffd23f', 0.5, 3); E.burst(CX, CY, 10, '#ffffff', 24, 160, 0.6); E.decal('crack', CX, CY, 1.2, 4);
            g.sfx('hit', 'hard');
            me.kbx = -150; o1.kbx = 150;
          }
          return;
        }
        still(me); still(o1);
        // both giants look up at the sky where he went... then down at him
        const ws = B.t - B.marks.squish;
        if (!landed) { me.facing = ws < 0.5 ? 0 : -PI / 2; o1.facing = ws < 0.6 ? PI : -PI / 2; }
        else { face(me, o2); face(o1, o2); }
        if (!landed && o2.airZ < 1 && ws > 1) {
          landed = true; mark('land');
          E.comic(o2.x, o2.y - 30, 'THUD', '#ffffff', 1.3, 0.9); E.shake(7, 0.4); E.burst(o2.x, o2.y, 0, '#b8a890', 20, 120, 0.7); E.decal('crater', o2.x, o2.y, 0.8, 4);
          g.sfx('land');
        }
      };
      B.focusFn = () => ({ x: CX, y: CY - 14 });
    },

    /* S29 kickoff -> Lightning Dash -> goal */
    sb_fast_goal() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const G = g.attackGoal(0), E = g.effects, b = g.ball;
      g.kickoff(0); g.stateT = 0.4;
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate);
      g.cores.add(me, 'lightning_dash');
      let fired = false, shot = false;
      B.dir = (dt, g, t) => {
        if (!B.marks.play) { mark('play'); mark(b.owner === me ? 'meOwns' : 'otherOwns'); }
        for (const p of [o1, mate]) if (p.state === 'normal') still(p);
        if (o2.state === 'normal') { if (!shot) { still(o2); face(o2, me); } else { steer(o2, G.x - 20, G.y - 40, true); b.noPickup.set(o2.id, 99); } }
        if (!fired) { me.intent.mx = 0; me.intent.my = 0; fired = fire(g, me); if (fired) mark('ult'); return; }
        if (me.state !== 'normal' || shot) { still(me); return; }
        if (b.owner === me && me.x > 400) { face(me, G); Act.shoot(g, me, 1, 0.55); shot = true; mark('shot'); b.noPickup.set(o2.id, 99); }
      };
      B.focusFn = () => (shot ? b : me);
    },

    /* S30 two defenders dropkick him from both sides; he takes one step back; friendly fire */
    sb_double_team() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const E = g.effects, b = g.ball;
      const CX = 300, CY = 198;
      place(me, CX, CY, PI / 2); place(o1, CX - 64, CY, 0); place(o2, CX + 64, CY, PI); place(mate, 150, 288, 0);
      give(g, me);
      B.puppets = new Set([o1, o2, mate]); noAttack(mate);
      for (const q of [o1, o2, mate]) b.noPickup.set(q.id, 99);
      // friendly fire: both defenders' boots only find their own teammate
      const ff = new Set([o1, o2]), inF = Act.inFront;
      Act.inFront = function (g2, p, range, arc, air) {
        if (!ff.has(p)) return inF.call(this, g2, p, range, arc, air);
        const keep = B.traitor; B.traitor = p;
        try { return inF.call(this, g2, p, range, arc, air); } finally { B.traitor = keep; }
      };
      let wound = false, back = false, clash = false;
      B.dir = (dt, g, t) => {
        steer(mate, 150, 288, false);
        if (!wound) {
          for (const [p, dx] of [[o1, -1], [o2, 1]]) { steer(p, me.x + dx * 31, CY, false); }
          if (t < 0.45) { me.facing = PI; } else { me.facing = 0; }
          still(me);
          if (t > 0.6 && U.dist(o1, me) < 34 && U.dist(o2, me) < 34) {
            face(o1, o2); face(o2, o1); o1.cd.hard = o2.cd.hard = 0;
            wound = Act.hardAttack(g, o1) && Act.hardAttack(g, o2); mark('windup');
          }
          return;
        }
        // one calm step back (towards the camera)
        if (!back && B.t - B.marks.windup > 0.08) { back = true; mark('step'); }
        if (back && !clash && me.y < CY + 26) { steer(me, CX, CY + 60, false); me.facing = PI / 2; } else if (!clash || B.t - B.marks.clash < 0.6) still(me);
        if (o1.state === 'windup') { still(o1); face(o1, o2); }
        if (o2.state === 'windup') { still(o2); face(o2, o1); }
        if (!clash && (o1.state === 'stun' || o2.state === 'stun')) {
          clash = true; mark('clash');
          // the boots meet: whoever got hit second gets it too
          for (const [p, q, dx] of [[o1, o2, -1], [o2, o1, 1]]) if (p.state !== 'stun') {
            p.hitImmune = 0; p.state = 'normal';
            p.hit({ stun: 0.8, kbx: dx * 130, kby: 0, launch: 170, source: q, type: 'hard' });
            E.text(p.x, p.y - 30, 'SMASH!', '#ff3d5a');
          }
          // short flights: both land right there, seeing stars
          o1.kbx = -130; o2.kbx = 130; o1.kby = o2.kby = 0;
          E.comic(CX, CY - 34, 'BONK!', '#ffffff', 1.4, 0.9); E.impactFrame(); E.flash(0.4); E.shake(7, 0.4);
        }
        for (const p of [o1, o2]) if (clash && p.state === 'stun' && p.airZ <= 0) p.stateT = Math.max(p.stateT, 1.5);
        if (clash && B.t - B.marks.clash > 1.6) { mark('walk'); me.intent.mx = 0.4; me.intent.my = -0.15; }
        else if (clash && B.t - B.marks.clash > 0.6) { still(me); me.facing = B.t - B.marks.clash < 1.1 ? PI : 0; }
      };
      B.focusFn = () => ({ x: me.x, y: CY + 6 });
    },

    /* S31 a shot off five walls and in */
    sb_trick_shot() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const G = g.attackGoal(0), F = g.field, E = g.effects, b = g.ball;
      const top = F.y + b.r, bot = F.y + F.h - b.r, span = bot - top;
      const SX = 168, SY = 214;
      place(me, SX - 12, SY, 0); place(mate, 120, 290, 0); place(o1, 380, 190, PI); place(o2, G.x - 16, G.y, PI);
      give(g, me);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate);
      for (const q of [o1, o2, mate]) b.noPickup.set(q.id, 99);
      const EX = G.x + 4, EY = G.y + 6;
      const V = (SY - top) + 4 * span + (EY - top), Hd = EX - SX, L = Math.hypot(V, Hd), SPD = 500, DUR = L / SPD;
      const at2 = (u) => {   // position after travelling u along the folded path (5 bounces: top, bottom, top, bottom, top)
        const k = u / L, x = SX + Hd * k, v = V * k, s = v - (SY - top);
        if (s < 0) return { x, y: SY - v, n: 0 };
        const m = Math.floor(s / span), r = s - m * span;
        return { x, y: m % 2 ? bot - r : top + r, n: m + 1 };
      };
      let shot = false, T0 = 0, n = 0, dove = false;
      B.dir = (dt, g, t) => {
        steer(mate, 120, 290, false);
        if (!shot) {
          still(me); face(me, { x: SX + 30, y: top });
          still(o1); face(o1, me); still(o2); face(o2, me);
          if (t > 0.55) { Act.shoot(g, me, 0.8, 0); shot = true; T0 = t; mark('shot'); b.noPickup.set(me.id, 99); b.x = SX; b.y = SY; }
          return;
        }
        still(me); face(me, b);
        if (o1.state === 'normal') { still(o1); face(o1, b); }
        const u = (t - T0) * SPD;
        if (u < L - 4) {
          const p = at2(u + SPD * dt);
          drive(b, p.x, p.y, dt); b.z = 0; b.vz = 0;
          if (p.n > n) {
            n = p.n; mark('wall' + n);
            const wy = n % 2 ? F.y + 2 : F.y + F.h - 2;
            E.burst(p.x, wy, 4, '#d8d0c0', 10, 90, 0.4); g.sfx('wall'); E.shake(2.5, 0.15);
            solo(E, /^\d!$/); E.comic(p.x, n % 2 ? wy + 34 : wy - 40, n + '!', n === 5 ? '#ff3d5a' : '#ffe14f', 1.0 + n * 0.12, 0.7);
          }
        } else if (B.marks.goal == null) { b.vx = Math.max(b.vx, 150); }
        // the keeper tries to follow it... and gets it wrong at the end
        if (o2.state === 'normal') {
          if (n < 5) { steer(o2, G.x - 16, clamp(b.y, G.y - 30, G.y + 30), true); face(o2, b); b.noPickup.set(o2.id, 99); }
          else if (!dove) { dove = true; Act.dive(g, o2, 44); mark('dive'); }
        }
      };
      B.focusFn = () => (shot ? { x: Math.max(b.x, 215), y: 203 } : { x: 215, y: 203 });
    },

    /* S32 BONK: the shot hits the keeper in the face, pops up, lands on his head again, dribbles in */
    sb_face_save() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const G = g.attackGoal(0), E = g.effects, b = g.ball;
      const KX = G.x - 15, KY = G.y + 2;
      place(me, G.x - 150, G.y + 4, 0); place(o2, KX, KY, PI); place(o1, G.x - 240, G.y - 78, PI); place(mate, 230, 272, 0);
      give(g, me);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate);
      for (const q of [o1, o2, mate]) b.noPickup.set(q.id, 99);
      let shot = false, T0 = 0, x0 = 0, y0 = 0, phase = 0, T1 = 0, hx = 0, T2 = 0;
      const FLY = 0.3, POP = 0.95, FACE = 15;
      B.dir = (dt, g, t) => {
        steer(mate, 230, 272, false); steer(o1, G.x - 240, G.y - 78, false);
        if (!shot) {
          me.intent.mx = 0.4; me.intent.my = 0;
          steer(o2, KX, KY, false); face(o2, me);
          if (t > 0.5) { face(me, o2); Act.shoot(g, me, 1, 0); shot = true; T0 = t; x0 = b.x; y0 = b.y; mark('shot'); b.noPickup.set(me.id, 99); }
          return;
        }
        still(me);
        const s = t - T0;
        if (phase === 0) {
          still(o2); face(o2, b);
          const k = Math.min(1, (s + dt) / FLY);
          drive(b, lerp(x0, KX - 4, k), lerp(y0, KY, k), dt); b.z = lerp(3, FACE, k); b.vz = 0;
          if (k >= 1) {
            phase = 1; T1 = s; mark('bonk1');
            o2.hitImmune = 0; o2.hit({ stun: 4, kbx: 70, kby: 0, launch: 110, source: me, type: 'hard' });
            E.comic(KX - 30, KY - 18, 'BONK!', '#ffffff', 1.6, 0.9); E.impactFrame(); E.flash(0.5); E.shake(7, 0.4);
            E.burst(KX - 3, KY, FACE, '#fff6a0', 14, 120, 0.5); g.sfx('hit', 'hard');
            hx = b.x;
          }
          return;
        }
        if (phase === 1) {
          // up... and right back down on his head
          const k = Math.min(1, (s - T1 + dt) / POP), tx = Math.min(o2.x, G.x - 6);
          drive(b, lerp(hx, tx, k), lerp(KY, o2.y, k), dt);
          b.z = lerp(FACE, 17, k) + 4 * 46 * k * (1 - k); b.vz = 0;
          if (k >= 1) {
            phase = 2; T2 = s; mark('bonk2');
            o2.stateT = Math.max(o2.stateT, 2.5);
            E.comic(o2.x - 2, o2.y - 36, 'BONK!!', '#ffe14f', 1.7, 0.9); E.flash(0.4); E.shake(6, 0.3);
            E.burst(o2.x, o2.y, 17, '#fff6a0', 12, 110, 0.5); g.sfx('hit', 'hard');
            b.vx = 30; b.vy = 0; b.vz = 30;
          }
          return;
        }
        if (B.marks.goal == null && b.x < G.x + 8) { b.vx = Math.max(b.vx, 26); b.vy = 0; }
      };
      B.focusFn = () => (shot ? { x: Math.max(b.x, G.x - 70) - 12, y: KY - 8 } : t0focus(me, o2));
    },

    /* S33 dropkicked a random guy for no reason... he came back as a Titan */
    sb_revenge() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const E = g.effects, b = g.ball;
      g.cores.add(o1, 'titan');
      place(me, 300, 206, PI); place(o1, 272, 206, 0); place(mate, 150, 288, 0); place(o2, 566, 203, PI);
      give(g, me);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate);
      for (const q of [o1, o2, mate]) b.noPickup.set(q.id, 99);
      o1.trampleT = 0;
      let kicked = false, giant = false, smash = false;
      B.dir = (dt, g, t) => {
        steer(mate, 150, 288, false); steer(o2, 566, 203, false);
        if (!kicked) {
          if (o1.state === 'normal') { still(o1); face(o1, me); }
          still(me); face(me, o1);
          if (t > 0.3) { kicked = Act.hardAttack(g, me); if (kicked) mark('kick'); }
          return;
        }
        if (o1.state === 'stun' && B.marks.fly == null) { mark('fly'); o1.kbx = -250; o1.kby = 0; }
        // him: lies there... gets up... and goes Titan
        if (o1.state === 'normal' && B.marks.fly != null) {
          if (!giant) { still(o1); face(o1, me); if (B.t - B.marks.fly > 1.45) { giant = fire(g, o1); if (giant) mark('ult'); } }
          else if (o1.titanT > 0 && B.t - B.marks.ult > 0.75 && !smash) { steer(o1, me.x + 4, me.y, true); mark('chase'); }
          else still(o1);
        }
        if (!smash && me.state === 'stun') { smash = true; mark('smash'); me.kbx = Math.sign(me.kbx || 1) * 250; o1.trampleT = 1e9; E.comic(me.x - 10, me.y - 52, 'REVENGE!', '#ff3d5a', 1.5, 1.1); E.flash(0.4); E.shake(8, 0.4); E.impactFrame(); }
        if (me.state !== 'normal') return;
        if (smash) { still(me); return; }
        if (B.t - B.marks.kick < 0.75) { still(me); return; }
        // showboating, back turned to him
        if (B.marks.ez == null) { mark('ez'); E.comic(me.x + 6, me.y - 30, 'EZ', '#ffffff', 1.2, 1.0); }
        if (B.t - B.marks.ez < 0.9) { still(me); me.facing = PI / 2; }
        else { me.intent.mx = 0.2; me.intent.my = 0; me.intent.sprint = false; }
      };
      B.focusFn = () => (smash ? { x: (o1.x + me.x) / 2, y: 205 } : B.marks.fly == null ? t0focus(me, o1) : { x: (me.x + o1.x) / 2, y: 205 });
    },

    /* S34 aura farming: four defenders surround him and faint one by one */
    sb_aura_ring() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const [o3, o4] = extra(g, 1, 2);
      const E = g.effects, b = g.ball;
      const CX = 320, CY = 206, R0 = 56, R1 = 23;
      const ring = [[o1, 0], [o3, PI / 2], [o2, PI], [o4, -PI / 2]];
      for (const [q, a] of ring) { place(q, CX + Math.cos(a) * R0, CY + Math.sin(a) * R0 * 0.9, a + PI); }
      place(me, CX, CY, PI / 2); place(mate, 130, 288, 0);
      g.cores.add(me, 'aura_farming');
      give(g, me);
      B.puppets = new Set([o1, o2, o3, o4, mate]); noAttack(o1, o2, o3, o4, mate);
      for (const q of [o1, o2, o3, o4, mate]) b.noPickup.set(q.id, 99);
      let fired = false, k = 0, next = 0;
      B.dir = (dt, g, t) => {
        steer(mate, 130, 288, false);
        for (const [q, a] of ring) if (q.state === 'normal') { const r = t < 0.2 ? R0 : R1; steer(q, CX + Math.cos(a) * r, CY + Math.sin(a) * r * 0.9, false); if (U.dist(q, me) < R1 + 4) face(q, me); }
        if (!fired) {
          still(me); me.facing = t < 0.35 ? PI : t < 0.6 ? 0 : PI / 2;
          if (t > 0.75) { fired = fire(g, me); if (fired) { mark('ult'); next = 0; } }
          return;
        }
        if (me.auraFarmT <= 0) { still(me); me.facing = PI / 2; return; }
        if (B.marks.aura == null) { mark('aura'); next = B.t + 0.55; }
        // they look at him... and drop, one by one
        if (k < 4 && B.t >= next) {
          const [q, a] = ring[[1, 0, 3, 2][k]];
          q.hitImmune = 0; q.hit({ stun: 6, kbx: Math.cos(a) * 105, kby: Math.sin(a) * 120, launch: 120, source: me, type: 'light' });
          E.text(q.x + Math.cos(a) * 22, q.y + Math.sin(a) * 18 - 26, '*faints*', '#ffe14f'); g.sfx('land');
          k++; next = B.t + 0.24; mark('faint' + k);
          if (k === 4) { E.comic(CX, CY - 40, 'K.O. x4', '#ffe14f', 1.4, 1.2); E.wave(CX, CY, 40, '#ffe14f', 0.5, 2); }
        }
        if (k < 4 || B.t - B.marks.faint4 < 0.7) { still(me); me.facing = PI / 2; return; }
        mark('walk'); me.intent.mx = 0.32; me.intent.my = 0.05; me.intent.sprint = false;
      };
      B.focusFn = () => ({ x: Math.max(CX, me.x - 20), y: CY - 4 });
    },

    /* S35 "PASS!" ... the teammate turns around and passes it to the opponent */
    sb_bad_pass() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const E = g.effects, b = g.ball;
      place(mate, 296, 214, 0); place(o1, 262, 226, 0); place(me, 376, 168, PI); place(o2, 566, 203, PI);
      give(g, mate);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate);
      for (const q of [o2, me]) b.noPickup.set(q.id, 99);
      at(0.25, () => E.comic(me.x, me.y - 26, 'PASS!', '#ffffff', 0.9, 0.7));
      at(0.95, () => E.comic(me.x, me.y - 26, 'PASS!!', '#ffffff', 1.05, 0.7));
      let passed = false, got = false;
      B.dir = (dt, g, t) => {
        steer(o2, 566, 203, false);
        still(me); face(me, mate);
        if (!passed) {
          if (t < 1.25) { mate.intent.mx = 0.25; mate.intent.my = -0.05; steer(o1, mate.x - 30, mate.y + 10, false); }
          else { still(mate); face(mate, o1); still(o1); face(o1, mate); }
          if (t > 1.55) { b.noPickup.set(mate.id, 99); b.noPickup.set(o1.id, 99); Act.passTo(g, mate, o1, 'ground'); passed = true; mark('pass'); }
          return;
        }
        still(mate); face(mate, o1);
        if (!got) {
          still(o1); face(o1, b);
          if (U.dist(b, o1) < 11) { got = true; b.owner = null; b.noPickup.set(o1.id, 0); g.gainPossession(o1); mark('got'); E.comic(o1.x, o1.y - 28, 'THX!', '#ff3d5a', 1.1, 0.9); }
          return;
        }
        if (B.marks.np == null && B.t - B.marks.got > 0.45) { mark('np'); E.comic(mate.x + 4, mate.y - 28, 'NP!', '#ffffff', 1.1, 0.9); }
        if (B.marks.bro == null && B.t - B.marks.got > 1.05) { mark('bro'); E.comic(me.x, me.y - 28, 'BRO?!', '#ffe14f', 1.2, 1.0); }
        if (B.t - B.marks.got > 0.3) { o1.intent.mx = -0.6; o1.intent.my = 0.1; o1.intent.sprint = true; } else still(o1);
      };
      B.focusFn = () => ({ x: 322, y: 196 });
    },

    /* S36 the striker walks it into the empty net... the defender dropkicks HIM into the net instead */
    sb_line_kick() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const E = g.effects, b = g.ball, F = g.field, OG = g.ownGoal(0);
      g.cores.add(me, 'heavy_boot');
      place(o1, OG.x + 74, OG.y + 4, PI); place(me, OG.x + 160, OG.y + 16, PI); place(mate, OG.x + 60, OG.y - 70, 0); place(o2, 450, 170, PI);
      give(g, o1);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate);
      for (const q of [o2, mate]) b.noPickup.set(q.id, 99);
      at(0.02, () => { mate.hitImmune = 0; mate.hit({ stun: 9, kbx: 0, kby: 0, source: o1, type: 'light' }); });
      // once kicked, he may fly past the goal line into the net (only this player, only in the mouth)
      const up = o1.update.bind(o1);
      let netX = null, inNet = false;
      o1.update = (dt) => {
        const x = o1.x, kb = o1.kbx, vx = o1.vx;
        up(dt);
        if (inNet) { o1.x = netX; o1.kbx = 0; return; }
        if (netX == null || Math.abs(o1.y - OG.y) > F.goalWidth / 2 - 7 || kb > -40) return;
        const want = x + (kb + vx) * dt;
        if (want >= o1.x) return;               // the wall clamp didn't stop him: nothing to do
        o1.x = Math.max(netX, want); o1.kbx = kb; // through the goal mouth (undo the wall bounce)...
        if (o1.x <= netX + 0.01) {                 // ...into the back of the net
          inNet = true; o1.kbx = 0; mark('net');
          E.comic(o1.x + 8, o1.y - 30, 'BONK!', '#ffffff', 1.2, 0.8); E.shake(5, 0.3); E.burst(o1.x - 4, o1.y, 8, '#ffffff', 10, 80); g.sfx('hit');
        }
      };
      let kicked = false, cleared = false;
      B.dir = (dt, g, t) => {
        if (o2.state === 'normal') still(o2);
        if (mate.state === 'normal') still(mate);
        if (!kicked) {
          if (o1.state === 'normal' && g.ball.owner === o1) { o1.intent.mx = -0.32; o1.intent.my = -0.03; o1.intent.sprint = false; }
          if (t > 0.3) steer(me, o1.x + 22, o1.y, true); else still(me);
          if (t > 0.9 && U.dist(me, o1) < 34 && me.state === 'normal') { face(me, o1); kicked = Act.hardAttack(g, me); if (kicked) { mark('kick'); netX = F.x - 12; } }
          return;
        }
        if (o1.state === 'stun' && B.marks.fly == null) { mark('fly'); o1.kbx = -360; o1.kby = (OG.y - o1.y) * 2; b.noPickup.set(o1.id, 99); }
        // the ball squirts out sideways, away from the goal
        if (B.marks.fly != null && B.t - B.marks.fly < 0.1 && !b.owner) { b.vx = 55; b.vy = -70; b.vz = 70; }
        if (me.state !== 'normal') return;
        if (cleared) { still(me); return; }
        if (g.ball.owner !== me) { if (!g.ball.owner) steer(me, b.x, b.y, true); return; }
        mark('own');
        if (B.t - B.marks.own < 0.35) { still(me); face(me, { x: 600, y: me.y - 40 }); return; }
        face(me, { x: 600, y: me.y - 60 }); Act.shoot(g, me, 1, -0.6); cleared = true; mark('clear');
      };
      B.focusFn = () => (B.marks.fly != null ? { x: OG.x + 50, y: OG.y } : t0focus(me, o1));
    },
  });
})();
