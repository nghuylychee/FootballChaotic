/* sa scenes (S11–S23 staged skits): added to BRAG.SCENES after scenes.js loads (capture.py injects every scenes_*.js). */
(function () {
  const { U, Act, PI, place, give, face, steer, still, mark, match, cast, ult, at, noAttack, extra, t0focus } = BRAG.lib;
  const B = BRAG;
  const noPick = (g, ...ps) => { for (const q of ps) g.ball.noPickup.set(q.id, 99); };
  // fall flat along the y axis (the keeper-dive pose, held while B.dir keeps poseEnd up): dir +1 = toward the camera, -1 = away
  const topple = (q, dir, dist = 12, time = 0.2) => {
    q.state = 'dash'; q.stateT = time; q.dashX = 0; q.dashY = (dir * dist) / time; q.trailLeft = 0; q.vx = q.vy = 0;
    Act.startAttack(q, dir > 0 ? 'diveD' : 'diveU'); q.poseEnd = 99; q.lying = true;
  };
  const keepLying = (...ps) => { for (const q of ps) if (q.lying && q.state === 'normal') { q.poseEnd = 99; still(q); } };
  // a fresh stun hit that always lands (clears the immunity the last hit left)
  const smack = (q, o) => { if (q.state === 'stun') q.state = 'normal'; q.hitImmune = 0; return q.hit(o); };

  Object.assign(B.SCENES, {
    /* S11 MELON: the shot turns into a watermelon mid-air and SPLATs on the keeper's face; the melon rolls in */
    sa_melon() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const G = g.attackGoal(0), E = g.effects, b = g.ball;
      place(me, G.x - 215, G.y + 4, 0); place(mate, 230, 275, 0); place(o1, G.x - 115, G.y - 88, PI); place(o2, G.x - 24, G.y, PI);
      give(g, me);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate); noPick(g, o1, o2, mate);
      let shot = false, melon = false, splat = false, x0 = 0, y0 = 0;
      B.dir = (dt, g, t) => {
        steer(mate, 230, 275, false); if (o1.state === 'normal') { steer(o1, G.x - 115, G.y - 88, false); face(o1, b); }
        if (!splat && o2.state === 'normal') { steer(o2, G.x - 24, G.y + Math.sin(t * 2.6) * 5, false); face(o2, b); }
        if (!shot) { me.intent.mx = 0.5; me.intent.my = -0.02; }
        if (!shot && t > 0.75) { face(me, G); Act.shoot(g, me, 0.45, 0); shot = true; mark('shot'); return; }
        if (!shot) return;
        if (me.state === 'normal') still(me);
        noPick(g, me);
        if (!melon && B.t - B.marks.shot > 0.1) {
          melon = true; mark('melon'); b.skin = 'melon'; x0 = b.x; y0 = b.y;
          E.burst(b.x, b.y, 8, '#6bff4f', 16, 90, 0.5); E.burst(b.x, b.y, 8, '#ffffff', 8, 70, 0.4);
          E.comic(b.x, b.y - 24, 'MELON?!', '#6bff4f', 1.0, 0.8); g.sfx('whoosh');
        }
        if (melon && !splat) {
          // a melon is heavy: slow, lobbed, dead straight at his face
          const tx = o2.x - 4, k = U.clamp((b.x - x0) / (tx - x0), 0, 1);
          b.vx = 175; b.vy = (o2.y - b.y) * 2; b.z = 6 + k * 9 + Math.sin(k * PI) * 16; b.vz = 0;
          if (b.x >= tx) {
            splat = true; mark('splat');
            const hx = o2.x, hy = o2.y - 14;
            E.burst(hx, o2.y, 15, '#ff3d5a', 60, 220, 1.3); E.burst(hx, o2.y, 15, '#ff8ac0', 30, 160, 1.1);
            E.burst(hx, o2.y, 15, '#6bff4f', 24, 190, 1.1); E.burst(hx, o2.y, 15, '#2f8f2a', 20, 150, 1.1); E.burst(hx, o2.y, 15, '#111111', 16, 140, 1.0);
            E.wave(hx, o2.y, 34, '#ff3d5a', 0.45, 3);
            E.comic(hx - 6, hy - 22, 'SPLAT!', '#ff3d5a', 1.7, 1.2);
            E.flash(0.35); E.shake(6, 0.35); E.impactFrame();
            smack(o2, { stun: 3.2, kbx: 110, kby: -10, launch: 150, source: me, type: 'hard' });
            g.sfx('hit', 'hard'); g.sfx('land');
            b.vx = 30; b.vy = 0; b.vz = 20; b.z = 10;
          }
        }
        // what's left of the melon dribbles over the line
        if (splat && B.marks.goal == null && B.t - B.marks.splat > 0.35) { b.owner = null; b.vx = Math.max(b.vx, 34); b.vy = (G.y + 6 - b.y) * 0.8; }
      };
      B.focusFn = () => (!shot ? me : splat ? { x: G.x - 40, y: G.y - 4 } : { x: Math.max(b.x, G.x - 120), y: (b.y + o2.y) / 2 });
    },

    /* S12 CUBE: the shot turns into a cube and tumbles at the goal, clunk... clunk... stops on the line... clunk. in. */
    sa_cube() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const G = g.attackGoal(0), E = g.effects, b = g.ball;
      place(me, G.x - 175, G.y - 4, 0); place(mate, 220, 270, 0); place(o1, G.x - 120, G.y - 80, PI); place(o2, G.x - 18, G.y - 30, PI);
      give(g, me);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate); noPick(g, o1, o2, mate);
      let shot = false, cube = false, k = -1, phaseT = 0, sx = 0, plan = [];
      const MOVE = 0.12, REST = 0.16;
      B.dir = (dt, g, t) => {
        steer(mate, 220, 270, false);
        if (o1.state === 'normal') { steer(o1, G.x - 120, G.y - 80, false); face(o1, b); }
        if (o2.state === 'normal') { steer(o2, G.x - 18, G.y - 30, false); face(o2, b); }
        if (!shot) { me.intent.mx = 0.5; me.intent.my = 0; }
        if (!shot && t > 0.45) { face(me, G); Act.shoot(g, me, 0.3, 0.05); shot = true; mark('shot'); return; }
        if (!shot) return;
        if (me.state === 'normal') { still(me); face(me, b); }
        noPick(g, me);
        if (!cube && B.t - B.marks.shot > 0.08) {
          cube = true; mark('cube'); b.skin = 'cube';
          E.burst(b.x, b.y, 4, '#3f8cff', 12, 80, 0.5); g.sfx('whoosh');
          // flops shrink toward the line; the last one leaves it 2 px short
          const d = G.x - 4 - b.x, w = [9, 8, 7, 6, 5, 4, 3], s = w.reduce((a, c) => a + c, 0);
          plan = w.map((c) => (c / s) * d); k = 0; phaseT = 0; sx = b.x;
        }
        if (!cube || B.marks.goal != null) return;
        b.owner = null;
        phaseT += dt;
        const last = k >= plan.length;           // the final flop after the pause
        const rest = k === plan.length - 1 ? 0.95 : REST;
        if (k <= plan.length) {
          const dist = last ? 18 : plan[k];
          if (phaseT < MOVE) { const u = phaseT / MOVE; b.vx = dist / MOVE; b.vy = (G.y - 2 - b.y) * 3; b.z = Math.sin(u * PI) * (3 + dist * 0.12); b.vz = 0; b.roll += 10 * dt / MOVE; }
          else {
            if (b.vx !== 0) {
              b.vx = 0; b.vy = 0; b.z = 0; b.vz = 0; b.x = sx + dist; sx = b.x;
              E.burst(b.x, b.y + 2, 0, '#8a7f70', 6, 50, 0.35); E.shake(1.6, 0.08); g.sfx('land');
              E.V.comics = E.V.comics.filter((c) => c.str !== 'CLUNK');
              E.comic(b.x, b.y - 16, 'CLUNK', '#c7ccd6', 0.75, 0.3);
              mark('flop' + k);
            }
            b.vx = 0; b.vy = 0;
            if (phaseT >= MOVE + rest) { k++; phaseT = 0; if (k === plan.length) mark('pause'); }
          }
        } else { b.vx = 60; b.vy = 0; }
        if (k === plan.length - 1 && phaseT > MOVE + 0.35 && B.marks.huh == null) { mark('huh'); E.comic(o2.x, o2.y - 26, '?', '#ffffff', 1.2, 0.8); }
      };
      B.focusFn = () => (!shot ? me : { x: Math.min(b.x + 22, G.x - 30), y: G.y - 10 });
    },

    /* S13 WHEEL: the ball turns into a wheel and runs off round the centre circle, all four chase it in a line... and it laps them */
    sa_wheel() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const E = g.effects, b = g.ball;
      const C = { x: 320, y: 205 }, RX = 50, RY = 84;
      const pt = (a) => ({ x: C.x + RX * Math.cos(a), y: C.y + RY * Math.sin(a) });
      const all = [o1, me, o2, mate];
      const T0 = PI, LAG = 0.24, WC = 1.7;
      // scrum at the top of the loop, the four already in a line behind the ball
      all.forEach((q, k) => { const p0 = pt(T0 - 0.32 - LAG * k); place(q, p0.x, p0.y, 0); });
      give(g, me); place(me, pt(T0 - 0.32 - LAG).x, pt(T0 - 0.32 - LAG).y, 0);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate, me);
      let free = false, th = T0, tc = T0 - 0.32;
      const down = new Set();
      at(0.4, () => {
        free = true; mark('wheel');
        g.looseBall(me, 1, 0, 40); b.skin = 'wheel'; noPick(g, ...all);
        const p0 = pt(th); b.x = p0.x; b.y = p0.y;
        E.burst(b.x, b.y, 4, '#c7ccd6', 14, 90, 0.5); E.comic(b.x + 6, b.y - 22, 'WHEEL?!', '#c7ccd6', 1.0, 0.8); g.sfx('whoosh');
      });
      B.dir = (dt, g, t) => {
        if (!free) { for (const q of all) { still(q); face(q, b); } return; }
        noPick(g, ...all);
        b.owner = null;
        // the wheel: off round the circle, faster and faster, never tired
        const k = B.t - B.marks.wheel;
        const w = down.size === all.length ? Math.max(1.6, 3.8 - (B.t - B.marks.bonk4) * 2.5) : Math.min(3.8, 1.4 + k * 4);
        th += w * dt;
        const p = pt(th);
        b.vx = -RX * Math.sin(th) * w; b.vy = RY * Math.cos(th) * w; b.x = p.x; b.y = p.y; b.z = 0; b.vz = 0;
        // the four: a conga line round the loop, flat out
        if (k > 0.15) tc += Math.min(WC, (k - 0.15) * 6) * dt;
        all.forEach((q, i) => {
          if (down.has(q)) return;
          const a = tc - LAG * i, wq = k > 0.15 ? Math.min(WC, (k - 0.15) * 6) : 0;
          if (q.state === 'normal') {
            const pq = pt(a); q.x = pq.x; q.y = pq.y;
            if (wq > 0) { q.vx = -RX * Math.sin(a) * wq; q.vy = RY * Math.cos(a) * wq; q.facing = Math.atan2(q.vy, q.vx); q.sprinting = true; q.intent.mx = Math.cos(q.facing); q.intent.my = Math.sin(q.facing); q.intent.sprint = true; }
            else { still(q); face(q, b); }
          }
          // a lap later it comes round behind them
          if (k > 1.0 && U.dist(q, b) < 11) {
            down.add(q); if (down.size === 1) mark('bonk1'); if (down.size === all.length) mark('bonk4');
            const r = U.norm(q.x - C.x, q.y - C.y);
            smack(q, { stun: 3, kbx: r.x * 35 + b.vx * 0.08, kby: r.y * 35 + b.vy * 0.08, launch: 230, source: null, type: 'hard' });
            E.V.comics = E.V.comics.filter((c) => c.str !== 'BONK!');
            E.comic(q.x, q.y - 26, 'BONK!', '#ffffff', 1.1, 0.5); E.shake(3, 0.15);
          }
        });
      };
      B.focusFn = () => ({ x: C.x, y: C.y });
    },

    /* S14 PARKED BUS: all six of them on the goal line, Meteor Shot goes through the lot */
    sa_bus() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const G = g.attackGoal(0), E = g.effects, b = g.ball;
      ult(g, me, 'meteor_strike');
      const wall = [o1, o2, ...extra(g, 1, 4)];
      const spot = (k) => [G.x - 12, G.y + (k - 2.5) * 13];
      wall.forEach((q, k) => place(q, ...spot(k), PI));
      place(me, G.x - 160, G.y + 2, 0); place(mate, 170, 270, 0);
      give(g, me);
      B.puppets = new Set([...wall, mate]); noAttack(...wall, mate); noPick(g, ...wall, mate);
      let fired = false, blasted = false;
      B.dir = (dt, g, t) => {
        steer(mate, 170, 270, false);
        wall.forEach((q, k) => { if (!blasted && q.state === 'normal') { const [x, y] = spot(k); steer(q, x, y + Math.sin(t * 7 + k) * 1.2, false); q.facing = PI; } });
        if (!fired) { if (t < 1.1) { still(me); face(me, G); } else { me.intent.mx = 0.35; me.intent.my = 0; } }
        if (!fired && t > 1.45) { fired = g.cores.activateUltimate(me); if (fired) mark('ult'); }
        if (fired && me.state === 'normal') still(me);
        if (!fired) return;
        noPick(g, ...wall, mate);
        // aim the meteor dead centre
        if (!blasted && !b.owner && b.fx.meteor) { mark('meteor'); b.vy = (G.y - b.y) * 4; }
        if (!blasted && !b.owner && b.fx.meteor && b.x > G.x - 26) {
          blasted = true; mark('blast');
          wall.forEach((q, k) => {
            const side = k - 2.5;
            g.later(Math.abs(side) * 0.025, () => smack(q, { stun: 3, kbx: -40 + Math.random() * 60, kby: side * 70 + (Math.random() - 0.5) * 40, launch: 230 + Math.random() * 80, source: me, type: 'hard' }));
          });
          E.comic(G.x - 40, G.y - 52, 'KRAKOOM!!', '#ff6a1f', 1.7, 1.2); E.impactFrame(); E.shake(9, 0.6); E.flash(0.6);
          E.burst(G.x - 14, G.y, 10, '#ffd23f', 30, 180, 0.8); E.wave(G.x - 14, G.y, 50, '#ff6a1f', 0.5, 3);
          g.sfx('hit', 'hard'); g.sfx('wall');
        }
        if (blasted && B.marks.goal == null && b.x < G.x + 12) { b.owner = null; b.vx = 330; b.vy = (G.y - b.y) * 3; b.z = Math.min(b.z, 6); }
      };
      B.focusFn = () => (fired && B.t - B.marks.ult > 0.9 ? { x: Math.max(b.x, G.x - 90), y: G.y } : { x: G.x - 80, y: G.y });
    },

    /* S15 BUDGET KEEPER: their keeper is 0.4x size; the shot hits him and carries him back to the line */
    sa_tiny() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const G = g.attackGoal(0), E = g.effects, b = g.ball;
      place(me, G.x - 74, G.y + 2, 0); place(mate, G.x - 190, G.y + 80, 0); place(o1, G.x - 170, G.y - 75, PI); place(o2, G.x - 18, G.y, PI);
      o2.sizeMul = o2.sizeTarget = 0.45; o2.sizeT = 0; o2.radius = 6 * 0.45;
      give(g, me);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate); noPick(g, o1, o2, mate);
      let shot = false, dived = false;
      B.dir = (dt, g, t) => {
        steer(mate, G.x - 190, G.y + 80, false); steer(o1, G.x - 170, G.y - 75, false);
        if (!dived && o2.state === 'normal') { steer(o2, G.x - 18, G.y + Math.sin(t * 7) * 6, true); face(o2, me); }
        if (dived && o2.state === 'normal') { still(o2); o2.poseEnd = 99; }
        if (!shot) { still(me); face(me, o2); }
        if (!shot && t > 1.5) { Act.shoot(g, me, 0.3, 0.6); shot = true; mark('shot'); }
        if (!shot) return;
        noPick(g, me, o2);
        if (me.state === 'normal') still(me);
        // full-stretch dive... with tiny legs
        if (!dived && B.t - B.marks.shot > 0.06) { dived = true; mark('dive'); topple(o2, 1, 10, 0.2); }
        if (B.marks.goal == null && !b.owner) { b.vy = (G.y + 24 - b.y) * 3; b.vx = Math.max(b.vx, 200); b.z = Math.min(b.z, 6); }
      };
      // focusFn also runs during the GOAL pause (B.dir doesn't): keep him lying where he landed
      B.focusFn = () => { if (dived && o2.state === 'normal') o2.poseEnd = 99; return { x: G.x - 40, y: G.y + 4 }; };
    },

    /* S16 CELEBRATED TOO EARLY: shoots, turns away for the SIUUU before it goes in, the keeper catches it, a dropkick mid-jump */
    sa_siuuu() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const G = g.attackGoal(0), E = g.effects, b = g.ball;
      g.cores.add(o1, 'heavy_boot');
      place(me, G.x - 118, G.y + 22, 0); place(mate, 200, 270, 0); place(o1, G.x - 200, G.y + 50, 0); place(o2, G.x - 22, G.y, PI);
      give(g, me);
      B.puppets = new Set([o1, o2, mate]); noAttack(o2, mate); noPick(g, o1, o2, mate);
      let shot = false, jumped = false, saved = false, kicked = false;
      B.dir = (dt, g, t) => {
        steer(mate, 200, 270, false);
        if (!saved) { steer(o2, G.x - 22, b.owner ? G.y : U.clamp(b.y, G.y - 30, G.y + 30), false); face(o2, b); }
        else if (o2.state === 'normal') { still(o2); face(o2, me); }
        if (!shot) { still(me); face(me, G); if (t > 0.45) { Act.shoot(g, me, 0.0, -0.25); shot = true; mark('shot'); b.vx *= 0.75; b.vy *= 0.75; } return; }
        // slow shot at the keeper; he catches it
        if (!saved && !b.owner) { b.vz = Math.max(b.vz, 0); b.z = Math.min(b.z, 8); if (U.dist(b, o2) < 9) { saved = true; mark('save'); b.noPickup.set(o2.id, 0); g.gainPossession(o2); E.text(o2.x, o2.y - 26, 'SAVE!', '#9dff3d'); g.sfx('save'); } }
        // the celebration: turn to the camera, run, jump
        if (me.state === 'normal' && !jumped) {
          if (B.t - B.marks.shot < 0.12) still(me);
          else { steer(me, me.x - 10, me.y + 30, false); me.facing = PI / 2; }
          if (B.t - B.marks.shot > 0.42) { jumped = true; mark('jump'); me.airVz = 250; me.airZ = 0.5; E.comic(me.x, me.y - 40, 'SIUUU', '#ffe14f', 1.2, 0.9); }
        }
        if (jumped && me.state === 'normal' && me.airZ <= 0) still(me);
        // the defender runs in and dropkicks him at the top of the jump
        if (!kicked) {
          if (shot && B.t - B.marks.shot > 0.15 && o1.state === 'normal') steer(o1, me.x - 26, me.y + 4, true);
          if (jumped && saved && o1.state === 'normal' && U.dist(o1, me) < 34) { face(o1, me); o1.cd.hard = 0; kicked = Act.hardAttack(g, o1); if (kicked) mark('windup'); }
        } else if (o1.state === 'kick' && B.marks.kick == null) {
          mark('kick'); o1.hardLanded = true;
          const d = U.norm(me.x - o1.x, me.y - o1.y);
          smack(me, { stun: 3, kbx: d.x * 420, kby: d.y * 420, launch: 260, source: o1, type: 'hard' });
          E.comic(me.x, me.y - me.airZ - 30, 'POW!', '#ff3d5a', 1.5, 0.9); E.flash(0.4); E.shake(7, 0.4); E.impactFrame();
          E.burst(me.x, me.y, me.airZ + 10, '#ffffff', 12, 150, 0.4);
        } else if (o1.state === 'normal') still(o1);
      };
      B.focusFn = () => (B.marks.kick != null ? me : { x: (me.x + o2.x) / 2 - 10, y: (me.y + G.y) / 2 });
    },

    /* S17 TAP-IN THIEF: my shot is rolling into the empty net, my teammate sprints in and taps it over the line */
    sa_tapin() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const G = g.attackGoal(0), E = g.effects, b = g.ball;
      place(me, G.x - 100, G.y + 40, 0); place(mate, G.x - 200, G.y - 45, 0); place(o1, G.x - 175, G.y + 95, PI); place(o2, G.x - 30, G.y + 30, PI);
      give(g, me);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate); noPick(g, o1, o2, mate);
      let shot = false, tapped = false, dived = false;
      B.dir = (dt, g, t) => {
        if (o1.state === 'normal') steer(o1, G.x - 175, G.y + 95, false);
        if (!shot) { still(me); face(me, G); still(mate); face(mate, G); if (o2.state === 'normal') { still(o2); face(o2, me); } }
        if (!shot && t > 0.35) { Act.shoot(g, me, 0, -0.5); shot = true; mark('shot'); }
        if (!shot) return;
        noPick(g, me);
        if (me.state === 'normal') { still(me); face(me, b); }
        // the keeper dives the wrong way
        if (!dived && B.t - B.marks.shot > 0.12) { dived = true; Act.dive(g, o2, 40); mark('dive'); }
        if (dived && o2.state === 'normal') { still(o2); o2.poseEnd = 99; }
        // the ball rolls... slowly... into the empty net
        if (!tapped && !b.owner) {
          const tx = G.x + 6, ty = G.y - 22, d = U.norm(tx - b.x, ty - b.y);
          const sp = Math.max(46, 110 - (B.t - B.marks.shot) * 160);
          b.vx = d.x * sp; b.vy = d.y * sp; b.z = Math.min(b.z, 2); b.vz = 0;
        }
        // ...and my teammate sprints in from nowhere
        if (!tapped) {
          if (B.t - B.marks.shot > 0.2) { steer(mate, b.x - 4, b.y, true); mate.stamina = 99; } else still(mate);
          if (U.dist(mate, b) < 9 && b.x > G.x - 22) {
            tapped = true; mark('tap'); b.noPickup.set(mate.id, 0); g.gainPossession(mate); face(mate, G); Act.shoot(g, mate, 0, -0.4);
            E.comic(mate.x, mate.y - 30, 'MINE!', '#ffe14f', 1.1, 0.8);
            g.later(0.45, () => E.comic(me.x, me.y - 26, '...', '#ffffff', 1.0, 1.2));
          }
        } else if (mate.state === 'normal') still(mate);
      };
      B.focusFn = () => (B.marks.tap != null ? { x: G.x - 40, y: G.y - 10 } : { x: Math.max(b.x, G.x - 90) - 20, y: b.y - 6 });
    },

    /* S18 WRONG GOAL: the dribble of his life: past both of them, past the keeper... into his own net */
    sa_wronggoal() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const H = g.ownGoal(0), E = g.effects, b = g.ball;   // our own goal, x = 56
      place(me, 318, 205, PI); place(o1, 232, 198, 0); place(o2, 160, 214, 0); place(mate, H.x + 20, H.y, 0);
      give(g, me);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate); noPick(g, o1, o2, mate);
      let dodges = 0, shot = false;
      const foes = [o1, o2, mate];
      B.dir = (dt, g, t) => {
        // everyone tries to stop him
        for (const q of [o1, o2]) if (q.state === 'normal') { if (U.dist(q, me) < 70 && me.x > q.x - 8) steer(q, me.x - 6, me.y, false); else { still(q); face(q, me); } }
        if (mate.state === 'normal' && !shot) { steer(mate, H.x + 18, U.clamp(me.y, H.y - 25, H.y + 25), false); face(mate, me); }
        if (shot && mate.state === 'normal') { still(mate); mate.poseEnd = 99; }
        if (!shot && B.marks.no == null && me.x < H.x + 120) { mark('no'); E.comic(mate.x + 4, mate.y - 28, 'NO NO NO', '#ff3d5a', 1.0, 1.4); }
        if (me.state !== 'normal') return;
        if (shot) { still(me); return; }
        if (g.ball.owner !== me) { steer(me, b.x, b.y, true); return; }
        const next = foes[dodges];
        if (next && U.dist(me, next) < 30) { me.cd.skill = 0; Act.skill(g, me, -0.6, dodges % 2 ? 1 : -1); dodges++; mark('dodge' + dodges); return; }
        if (dodges >= 3 || (dodges >= 2 && me.x < H.x + 45)) {
          shot = true; mark('shot');
          me.facing = PI; Act.startAttack(me, 'shoot');
          b.kick(me, -330, (H.y - b.y) * 2.2, 25); b.kind = 'shot'; g.sfx('kick', 0.8);
          noPick(g, me, mate);
          if (mate.state === 'normal') { mate.cd.skill = 0; Act.dive(g, mate, 40); }
          // he thinks it's the goal of the season
          g.later(0.3, () => { me.state = 'normal'; me.airVz = 230; me.airZ = 0.5; me.facing = PI / 2; E.comic(me.x, me.y - 40, 'GOLAZO!', '#ffe14f', 1.2, 1.2); });
          return;
        }
        steer(me, H.x + 10, H.y + (dodges === 1 ? 14 : -6), true);
      };
      B.focusFn = () => (shot ? { x: Math.max(b.x, H.x + 70), y: H.y } : me);
    },

    /* S19 FINALLY GETS THE BALL: four of them around him, the pass arrives... all four dropkick at once */
    sa_finally() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const E = g.effects, b = g.ball;
      const [x1, x2] = extra(g, 1, 2);
      const four = [o1, o2, x1, x2];
      const M = { x: 340, y: 196 };
      const ring = [[-26, -22], [26, -22], [-26, 22], [26, 22]];
      place(me, M.x, M.y, PI); four.forEach((q, k) => place(q, M.x + ring[k][0], M.y + ring[k][1], 0)); place(mate, M.x - 100, M.y + 30, 0);
      for (const q of four) g.cores.add(q, 'heavy_boot');
      give(g, mate);
      B.puppets = new Set([...four, mate]); noAttack(mate); for (const q of four) q.cd.light = 99;
      let passed = false, recv = false, flew = false;
      at(0.25, () => E.comic(me.x, me.y - 26, 'PASS!', '#ffffff', 0.9, 0.6));
      B.dir = (dt, g, t) => {
        if (!recv) four.forEach((q, k) => { if (q.state === 'normal') { steer(q, me.x + ring[k][0], me.y + ring[k][1], false); face(q, me); } });
        if (!passed) { still(mate); face(mate, me); still(me); face(me, mate); if (t > 0.75) { Act.quickPass(g, mate, me.x - mate.x, me.y - mate.y); passed = true; mark('pass'); } return; }
        if (me.state === 'normal' && !recv) { still(me); face(me, b); }
        if (!recv && b.owner === me) {
          recv = true; mark('recv');
          for (const q of four) { face(q, me); q.cd.hard = 0; Act.hardAttack(g, q); }
        }
        if (recv && !flew && me.state === 'stun') {
          flew = true; mark('fly'); for (const q of four) q.hardLanded = true;
          me.kbx = 0; me.kby = 0; me.airVz = 420; me.airZ = Math.max(me.airZ, 2);
          E.comic(me.x, me.y - 40, '4 HIT!', '#ff3d5a', 1.6, 1.0); E.impactFrame(); E.flash(0.5); E.shake(8, 0.4);
        }
        if (flew) { me.kbx = 0; me.kby = 0; for (const q of four) if (q.state === 'normal' || q.state === 'recover') still(q); }
        if (flew) still(mate);
      };
      B.focusFn = () => ({ x: M.x - 6, y: M.y - 6 });
    },

    /* S20 DOMINOES: nine of them in a U, one punch... it runs down, round and back up... the last one lands on him */
    sa_domino() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const E = g.effects;
      const ps = [o1, o2, ...extra(g, 1, 7)];
      const XL = 300, XR = 336, Y0 = 152, S = 22;
      // left column down, the turn, right column back up
      const spots = [[XL, Y0], [XL, Y0 + S], [XL, Y0 + 2 * S], [XL, Y0 + 3 * S], [(XL + XR) / 2, Y0 + 3 * S + 20], [XR, Y0 + 3 * S], [XR, Y0 + 2 * S], [XR, Y0 + S], [XR, Y0]];
      const dirs = [1, 1, 1, 1, 0, -1, -1, -1, -1];
      ps.forEach((q, k) => place(q, spots[k][0], spots[k][1], dirs[k] > 0 ? PI / 2 : dirs[k] < 0 ? -PI / 2 : 0));
      place(me, XL, Y0 - 20, PI / 2); place(mate, 160, 280, 0);
      g.ball.owner = null; g.ball.x = 200; g.ball.y = 120; g.ball.vx = g.ball.vy = 0;
      B.puppets = new Set([...ps, mate]); noAttack(...ps, mate); noPick(g, ...ps, mate, me);
      let punched = false, n = 0, nextT = 0;
      B.dir = (dt, g, t) => {
        steer(mate, 160, 280, false);
        ps.forEach((q, k) => { if (!q.lying && q.state === 'normal') { steer(q, spots[k][0], spots[k][1], false); q.facing = dirs[k] > 0 ? PI / 2 : dirs[k] < 0 ? -PI / 2 : 0; } });
        keepLying(...ps, me);
        if (!punched) { still(me); me.facing = PI / 2; if (t > 0.9 && Act.lightAttack(g, me)) { punched = true; mark('punch'); nextT = B.t + 0.08; } return; }
        if (n < ps.length && B.t >= nextT) {
          const q = ps[n];
          if (dirs[n]) topple(q, dirs[n], 13, 0.2);
          else { smack(q, { stun: 9, kbx: 70, kby: -10, launch: 90, source: me, type: 'light' }); }
          g.sfx('land'); E.burst(q.x, q.y + dirs[n] * 8, 0, '#8a7f70', 6, 50, 0.4);
          n++; nextT = B.t + 0.17; mark('d' + n);
        }
        // he strolls over, pleased with himself... right to the end of the line
        if (punched && me.state === 'normal' && !me.lying) {
          if (B.t - B.marks.punch < 0.35) still(me);
          else { steer(me, XR, Y0 - 21, false); if (Math.abs(me.x - XR) < 2) me.facing = PI / 2; }
        }
        if (B.marks.d9 != null && B.marks.karma == null && B.t - B.marks.d9 > 0.13) {
          mark('karma'); me.state = 'normal'; me.x = XR; topple(me, -1, 10, 0.22);
          E.comic(me.x, me.y - 30, 'BONK!', '#ff3d5a', 1.3, 0.9); E.shake(4, 0.25); g.sfx('hit');
          E.burst(me.x, me.y - 10, 10, '#ffe14f', 10, 70, 0.6);
        }
      };
      B.focusFn = () => ({ x: (XL + XR) / 2, y: Y0 + 26 });
    },

    /* S21 PINBALL: one shot, and the ball goes off the walls, two bumpers (players) and a portal... JACKPOT */
    sa_pinball() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const G = g.attackGoal(0), E = g.effects, b = g.ball, F = g.field;
      const [x1] = extra(g, 1, 1);
      const top = F.y + 3, bot = F.y + F.h - 3;
      place(me, 205, 262, -1.2); place(mate, 120, 150, 0); place(o1, 324, 200, PI); place(x1, 438, 196, PI); place(o2, G.x - 20, G.y + 26, PI);
      give(g, me);
      B.puppets = new Set([o1, o2, x1, mate]); noAttack(o1, o2, x1, mate); noPick(g, o1, o2, x1, mate);
      // the table: [x, y, what happens there]
      const path = [[256, top, 'wall'], [318, 197, o1], [370, bot, 'warp'], [432, 193, x1], [480, bot, 'wall'], [532, top, 'wall'], [G.x + 12, G.y - 6, 'in']];
      let shot = false, k = 0, spd = 330;
      const pop = (x, y, str, col, size = 1.0) => E.comic(x, y, str, col, size, 0.7);
      B.dir = (dt, g, t) => {
        steer(mate, 120, 150, false);
        for (const q of [o1, x1]) if (q.state === 'normal') { still(q); face(q, b); }
        if (o2.state === 'normal') { steer(o2, G.x - 20, G.y + 26, false); face(o2, b); }
        if (!shot) {
          still(me); me.facing = Math.atan2(path[0][1] - me.y, path[0][0] - me.x);
          if (t > 0.45) { shot = true; mark('shot'); Act.startAttack(me, 'shoot'); b.kick(me, 0, 0, 0); b.kind = 'shot'; g.sfx('kick', 1); E.burst(b.x, b.y, 2, '#ffffff', 8, 90); E.comic(me.x - 4, me.y - 30, 'PLUNK!', '#ffffff', 0.8, 0.5); }
          return;
        }
        if (me.state === 'normal') still(me);
        noPick(g, me, o1, o2, x1, mate);
        if (B.marks.goal != null) return;
        b.owner = null; b.z = 0; b.vz = 0;
        const [tx, ty, what] = path[Math.min(k, path.length - 1)];
        const d = U.norm(tx - b.x, ty - b.y);
        b.vx = d.x * spd; b.vy = d.y * spd;
        if (k < path.length - 1 && Math.hypot(tx - b.x, ty - b.y) < spd * dt + 1) {
          b.x = tx; b.y = ty; k++; mark('hit' + k); spd = Math.min(430, spd + 18);
          if (what === 'wall') { E.ring(tx, ty, '#7fe7ff'); E.burst(tx, ty, 0, '#7fe7ff', 10, 90, 0.4); g.sfx('wall'); E.shake(2.5, 0.12); pop(tx, ty + (ty < 200 ? 26 : -18), '+100', '#7fe7ff', 0.9); }
          else if (what === 'warp') {
            E.portal(tx, F.y + F.h, 0.9); E.portal(tx, F.y, 0.9); E.burst(tx, ty, 0, '#c63dff', 12, 80, 0.5);
            b.y = top + 1; b.x = tx; g.sfx('zap'); pop(tx, top + 30, 'WARP!', '#c63dff', 1.0);
            E.burst(tx, b.y, 0, '#c63dff', 12, 80, 0.5);
          } else if (what && what.hit) {
            const v = U.norm(b.vx, b.vy);
            smack(what, { stun: 2.5, kbx: v.x * 120, kby: v.y * 120, launch: 170, source: me, type: 'hard' });
            E.ring(what.x, what.y - 6, '#ff3dbd'); E.flash(0.2); E.shake(4, 0.2); pop(what.x, what.y - 30, '+500', '#ff3dbd', 1.2);
          }
        }
        if (k === path.length - 1 && B.marks.jackpot == null && b.x > G.x - 10) { mark('jackpot'); pop(G.x - 50, G.y - 40, 'JACKPOT!', '#ffd23f', 1.6); E.flash(0.4); E.shake(6, 0.4); }
      };
      B.focusFn = () => ({ x: shot ? b.x : me.x + 40, y: 205 });
    },

    /* S22 ZERO-G: mid-move, everyone (and the ball) floats up off the pitch... gravity comes back for the players. not the ball. */
    sa_gravity() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const E = g.effects, b = g.ball;
      place(me, 296, 222, 0); place(o1, 350, 200, PI); place(mate, 262, 176, 0); place(o2, 372, 254, PI);
      give(g, me);
      const all = [me, o1, mate, o2];
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate, me);
      const rate = new Map([[me, 37], [o1, 41], [mate, 34], [o2, 39]]), spin = new Map([[me, 0.05], [o1, 0.07], [mate, 0.045], [o2, 0.06]]), drift = new Map([[me, [-2, 0]], [o1, [3, -2]], [mate, [-2, -1]], [o2, [1, 2]]]);
      const T0 = 0.55, T1 = 2.75;
      let off = false, back = false;
      B.dir = (dt, g, t) => {
        if (t < T0) {
          if (g.ball.owner === me) { me.intent.mx = 0.5; me.intent.my = -0.05; }
          steer(o1, me.x + 52, me.y - 22, false); steer(mate, me.x - 36, me.y - 46, false); steer(o2, me.x + 76, me.y + 32, false);
          return;
        }
        if (!off) {
          off = true; mark('off'); g.looseBall(me, 1, 0, 8); noPick(g, ...all);
          for (const q of all) { q.vx *= 0.3; q.vy *= 0.3; q.kbx = q.kby = 0; still(q); q.state = 'stun'; q.stateT = 9; q.anim = 0; }
          E.tint('#7fe7ff', 2.2, 0.1); g.sfx('whoosh');
        }
        noPick(g, ...all);
        const k = t - T0;
        if (!back) {
          for (const q of all) {
            q.airZ = Math.max(0.5, rate.get(q) * Math.pow(k, 1.25)); q.airVz = 0;
            const [dx, dy] = drift.get(q); q.kbx = dx; q.kby = dy; q.vx = q.vy = 0; still(q);
            q.state = 'stun'; q.stateT = 9; q.anim -= dt * (1 - spin.get(q));   // a slow astronaut tumble, starting upright
          }
          if (t >= T1) { back = true; mark('back'); for (const q of all) { q.airVz = -420; q.kbx = q.kby = 0; } }
        } else {
          for (const q of all) if (!q.lying && q.airZ <= 0.02) { q.state = 'normal'; topple(q, q.y > 210 ? 1 : -1, 6, 0.12); }
          keepLying(...all);
          if (B.marks.thud == null && all.some((q) => q.lying)) { mark('thud'); E.shake(9, 0.5); E.comic(320, 196, 'THUD!', '#ffffff', 1.5, 0.9); E.burst(320, 214, 0, '#8a7f70', 24, 120, 0.6); g.sfx('land'); }
        }
        // the ball never got the memo
        b.owner = null; b.z = 22 * Math.pow(k, 1.25); b.vz = 0; b.vx = 5; b.vy = -1;
      };
      B.focusFn = () => ({ x: 322, y: 205 });
    },

    /* S23 BIG GUY JUMPS: Titan, a tiny hop... the whole pitch shakes and everyone goes down */
    sa_titan() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const E = g.effects, b = g.ball;
      const [x1, x2] = extra(g, 1, 2);
      me.sizeMul = me.sizeTarget = 2.6; me.sizeT = 0; me.radius = 6 * 2.6; me.titanT = 9;
      const M = { x: 316, y: 214 };
      place(me, M.x, M.y, 0); place(o1, M.x + 44, M.y - 22, PI); place(o2, M.x + 36, M.y + 36, PI); place(mate, M.x - 42, M.y + 26, 0);
      place(x1, M.x - 30, M.y - 46, 0.5); place(x2, M.x + 64, M.y + 4, PI);
      g.ball.owner = null; b.x = M.x + 22; b.y = M.y + 4; b.vx = b.vy = 0;
      const others = [o1, o2, mate, x1, x2];
      B.puppets = new Set([o1, o2, mate, x1, x2]); noAttack(...others); noPick(g, ...others, me);
      let jumped = false, landed = false;
      B.dir = (dt, g, t) => {
        for (const q of others) if (q.state === 'normal' && !landed) { still(q); face(q, me); }
        if (landed) for (const q of others) if (!q.lying && q.state === 'stun' && q.airZ <= 0 && q.airVz <= 0 && B.t - B.marks.land > 0.3) { q.state = 'normal'; topple(q, q.y > me.y ? 1 : -1, 5, 0.1); }
        keepLying(...others);
        if (me.state === 'normal' && me.airZ <= 0) { still(me); me.facing = PI / 2; }
        if (!jumped && t > 1.0) { jumped = true; mark('jump'); me.airVz = 200; me.airZ = 0.5; g.sfx('whoosh'); }
        if (jumped && !landed && me.airVz < 0 && me.airZ < 1.5) {
          landed = true; mark('land');
          E.impactFrame(); E.shake(14, 1.1); E.flash(0.55); E.zoom(me.x, me.y, 0.12, 0.4);
          E.wave(me.x, me.y, 130, '#ffffff', 0.7, 4); E.wave(me.x, me.y, 80, '#ffd23f', 0.55, 3);
          E.decal('crack', me.x, me.y, 3.5, 8); E.decal('crater', me.x, me.y, 1.6, 8);
          E.burst(me.x, me.y, 0, '#8a7f70', 40, 170, 0.9);
          E.comic(me.x, me.y - 70, 'BOOM!!', '#ff6a1f', 1.8, 1.2);
          g.sfx('wall'); g.sfx('hit', 'hard');
          for (const q of others) {
            const d = U.dist(q, me), a = U.norm(q.x - me.x, q.y - me.y);
            g.later(d / 320, () => { smack(q, { stun: 3.5, kbx: a.x * 90, kby: a.y * 90, launch: 190 + Math.random() * 70, source: me, type: 'hard' }); });
          }
          g.later(0.08, () => { b.vz = 230; b.vx = 30; b.vy = -20; });
        }
      };
      B.focusFn = () => ({ x: M.x + 8, y: M.y - 10 });
    },
  });
})();
