/* sd scenes (S49–S60 staged skits): added to BRAG.SCENES after scenes.js loads (capture.py injects every scenes_*.js).
   Every scene name starts with sd_. Nothing runs at load time except Object.assign; render / update patches are
   installed by the scene that needs them and only act on that scene's own game instance (B.sdDraw.g / B.sdCheer.g). */
(function () {
  const { U, Act, PI, app, place, give, face, steer, still, mark, match, cast, ult, at, noAttack, extra, t0focus } = BRAG.lib;
  const B = BRAG;
  const lerp = (a, b, k) => a + (b - a) * k;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = (k, p = 2.2) => 1 - Math.pow(1 - clamp(k, 0, 1), p);
  const noPick = (g, ...ps) => { for (const q of ps) g.ball.noPickup.set(q.id, 99); };
  // a fresh stun hit that always lands (clears the immunity the last hit left)
  const smack = (q, o) => { if (q.state === 'stun') q.state = 'normal'; q.hitImmune = 0; return q.hit(o); };
  // loose ball on rails: velocity that puts it exactly at (x, y) after this sim step
  const drive = (b, x, y, dt) => { b.owner = null; b.vx = (x - b.x) / dt; b.vy = (y - b.y) / dt; };
  // keep one comic of a kind on screen
  const solo = (E, re) => { E.V.comics = E.V.comics.filter((c) => !re.test(c.str || '')); };
  // fall flat along the y axis (the keeper-dive pose, held while keepLying runs): dir +1 = toward the camera, -1 = away
  const topple = (q, dir, dist = 12, time = 0.2) => {
    q.state = 'dash'; q.stateT = time; q.dashX = 0; q.dashY = (dir * dist) / time; q.trailLeft = 0; q.vx = q.vy = 0;
    Act.startAttack(q, dir > 0 ? 'diveD' : 'diveU'); q.poseEnd = 99; q.lying = true;
  };
  const keepLying = (...ps) => { for (const q of ps) if (q.lying && q.state === 'normal') { q.poseEnd = 99; still(q); } };
  const setSize = (p, s) => { p.sizeMul = p.sizeTarget = s; p.sizeT = 0; p.radius = 6 * s; };
  // per-step hook on THIS game only, in every state (B.dir only runs in 'play'; the GOAL pause needs this). Skips hit-stop steps.
  const always = (g, fn) => { const up0 = g.update; g.update = function (dt, inp) { const fr = this.freezeT > 0; up0.call(this, dt, inp); if (!fr) fn(dt, this); }; };
  // during the GOAL pause the ball stays in the right-hand net (it would bounce back out onto the pitch)
  const holdNet = (g) => always(g, () => {
    if (g.state !== 'goal') return;
    const b = g.ball, line = g.field.x + g.field.w;
    if (b.x > line - 8 && b.vx < 0) { b.vx = 0; b.x = Math.max(b.x, line + b.r + 1); }
    if (b.x > line) { b.vx *= 0.9; b.vy *= 0.9; }
  });
  const oneCombo = (E) => { const h = E.V.comics.filter((c) => / HIT!$/.test(c.str || '')); if (h.length > 1) E.V.comics = E.V.comics.filter((c) => !/ HIT!$/.test(c.str || '') || c === h[h.length - 1]); };
  // extra things drawn in the renderer's depth-sorted entity pass (2nd ball, fight cloud), for one game only:
  // they ride on SFC.VFX.clones(g) and draw themselves through item.__sd(ctx, g)
  const drawHook = (g, items) => {
    const V = SFC.VFX;
    if (!V.__sd) {
      V.__sd = true;
      const cl0 = V.clones, dc0 = V.drawClone;
      V.clones = function (gg) { const L = cl0.call(this, gg), D = B.sdDraw; return D && D.g === gg ? L.concat(D.items()) : L; };
      V.drawClone = function (ctx, gg, c) { return c && c.__sd ? c.__sd(ctx, gg) : dc0.call(this, ctx, gg, c); };
    }
    B.sdDraw = { g, items };
  };
  // the crowd cheers as if a goal went in (render only), for one game only
  const cheer = (g, on) => {
    const C = SFC.Crowd;
    if (!C.__sd) {
      C.__sd = true;
      const d0 = C.draw;
      C.draw = function (ctx, gg) {
        const S = B.sdCheer;
        if (!S || S.g !== gg || !S.on || gg.state === 'goal') return d0.call(this, ctx, gg);
        const st = gg.state, sb = gg.scoredBy;
        gg.state = 'goal'; gg.scoredBy = -1;
        try { return d0.call(this, ctx, gg); } finally { gg.state = st; gg.scoredBy = sb; }
      };
    }
    B.sdCheer = { g, on };
  };

  Object.assign(B.SCENES, {
    /* S49 1v1 with the keeper... he powers up (golden hair, aura), then HUNDRED FISTS on the striker */
    sd_keeper_fists() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const G = g.attackGoal(0), E = g.effects, b = g.ball;
      ult(g, o2, 'hundred_fists');
      place(me, G.x - 150, G.y + 6, 0); place(o2, G.x - 18, G.y, PI); place(mate, 230, 280, 0); place(o1, 300, 118, PI);
      give(g, me);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate); noPick(g, o1, o2, mate);
      let power = false, fired = false, saved = false;
      B.dir = (dt, g, t) => {
        steer(mate, 230, 280, false); steer(o1, 300, 118, false);
        if (!fired) {
          if (!power) {
            if (me.state === 'normal' && b.owner === me) { me.intent.mx = 0.5; me.intent.my = -0.03; me.intent.sprint = false; }
            steer(o2, G.x - 18, G.y + (me.y - G.y) * 0.4, false); face(o2, me);
          } else { still(me); face(me, o2); still(o2); face(o2, me); }
          if (!power && t > 0.85) {
            power = true; mark('power');
            o2.auraFarmT = 6; o2.glow('#ffe14f', 6);
            E.burst(o2.x, o2.y - 10, 10, '#ffe14f', 26, 130, 0.8); E.wave(o2.x, o2.y, 46, '#ffe14f', 0.5, 3); E.wave(o2.x, o2.y, 28, '#ffffff', 0.4, 2);
            E.speedLines(0.6, o2.x, o2.y - 10, '#fff3b0'); E.shake(6, 0.5); E.flash(0.35);
            E.comic(o2.x - 6, o2.y - 36, 'HAAAA!', '#ffe14f', 1.2, 1.0);
            g.sfx('upgrade'); g.sfx('whoosh');
            g.later(0.35, () => E.comic(me.x, me.y - 26, '?!', '#ffffff', 1.0, 0.7));
          }
          if (power && B.t - B.marks.power > 0.85) { fired = g.cores.activateUltimate(o2); if (fired) mark('ult'); }
          return;
        }
        if (me.state === 'normal') still(me);
        oneCombo(E);
        // after the finisher the keeper strolls over and picks it up
        if (!saved && B.t - B.marks.ult > 2.0) {
          b.noPickup.set(o2.id, 0); b.noPickup.set(me.id, 99);
          if (o2.state === 'normal') {
            if (b.owner === o2) { saved = true; mark('save'); E.text(o2.x, o2.y - 26, 'SAVE!', '#9dff3d'); g.sfx('save'); }
            else steer(o2, b.x, b.y, false);
          }
        }
        if (saved && o2.state === 'normal') { still(o2); o2.facing = PI / 2; }
      };
      B.focusFn = () => t0focus(me, o2);
    },

    /* S50 the shot splits in two mid-air: one ball each side of the keeper, both in, 2-0 */
    sd_split() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const G = g.attackGoal(0), E = g.effects, b = g.ball, F = g.field;
      place(me, G.x - 150, G.y + 2, 0); place(o2, G.x - 17, G.y, PI); place(mate, 230, 276, 0); place(o1, G.x - 270, G.y - 92, PI);
      give(g, me);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate); noPick(g, o1, o2, mate);
      // the second ball: drawn by the renderer like the real one (trail + ball), moved here
      const b2 = { x: 0, y: 0, z: 0, vx: 0, vy: 0, roll: 0, fx: {}, skin: null, trail: [], owner: null, on: false, done: false };
      Object.defineProperty(b2, 'speed', { get() { return Math.hypot(this.vx, this.vy); } });
      b2.__sd = (ctx) => { SFC.Renderer.ballTrail(ctx, b2); SFC.Sprites.drawBall(ctx, b2); };
      drawHook(g, () => (b2.on ? [b2] : []));
      holdNet(g);
      always(g, (dt) => {
        if (!b2.on) return;
        b2.x += b2.vx * dt; b2.y += b2.vy * dt; b2.roll += b2.speed * dt;
        if (!b2.done && b2.x > F.x + F.w + 3) { b2.done = true; mark('goal2'); g.teams[0].score += 1; g.sfx('goal'); E.burst(F.x + F.w, b2.y, 6, '#ffffff', 16, 120, 0.8); }
        const back = F.x + F.w + F.goalDepth - 3;
        if (b2.x > back) { b2.x = back; b2.vx = -Math.abs(b2.vx) * 0.25; }
        if (b2.done && b2.x < F.x + F.w + 4) { b2.x = F.x + F.w + 4; b2.vx = 0; }
        if (b2.done) { b2.vx *= Math.exp(-3 * dt); b2.vy *= Math.exp(-3 * dt); b2.y = clamp(b2.y, F.gTop + 4, F.gBot - 4); }
        b2.trail.unshift({ x: b2.x, y: b2.y, z: b2.z }); if (b2.trail.length > 8) b2.trail.pop();
      });
      let shot = false, split = false;
      B.dir = (dt, g, t) => {
        steer(mate, 230, 276, false); steer(o1, G.x - 270, G.y - 92, false);
        if (!shot) {
          me.intent.mx = 0.45; me.intent.my = 0;
          steer(o2, G.x - 17, G.y, false); face(o2, me);
          if (t > 0.6) { face(me, G); Act.shoot(g, me, 0.55, 0); shot = true; mark('shot'); b.noPickup.set(me.id, 99); b.vy = (G.y - b.y) * 1.5; }
          return;
        }
        if (me.state === 'normal') { still(me); face(me, b); }
        if (!split && b.x > G.x - 82) {
          split = true; mark('split');
          b2.on = true; b2.x = b.x; b2.y = b.y; b2.z = b.z; b2.roll = b.roll;
          E.burst(b.x, b.y, b.z + 4, '#ffffff', 18, 120, 0.45); E.burst(b.x, b.y, b.z + 4, '#7fe7ff', 12, 90, 0.45);
          E.ring(b.x, b.y - b.z, '#7fe7ff'); E.comic(b.x, b.y - 24, 'SPLIT!', '#7fe7ff', 1.15, 0.8);
          g.sfx('zap'); g.sfx('whoosh'); E.shake(3, 0.15);
        }
        if (split) {
          // one ball each side of him
          const sp = 300;
          if (B.marks.goal == null) { const d = U.norm(G.x + 10 - b.x, G.y - 27 - b.y); b.vx = d.x * sp; b.vy = d.y * sp; b.z = Math.min(b.z, 5); b.vz = 0; }
          if (!b2.done) { const d = U.norm(G.x + 10 - b2.x, G.y + 27 - b2.y); b2.vx = d.x * (sp + 30); b2.vy = d.y * (sp + 30); b2.z = Math.min(b.z, 5); }
          // the keeper can't pick
          if (o2.state === 'normal') { still(o2); const k = B.t - B.marks.split; face(o2, k < 0.12 ? b : k < 0.24 ? b2 : k < 0.36 ? b : b2); }
          if (B.marks.huh == null && B.t - B.marks.split > 0.08) { mark('huh'); E.comic(o2.x - 4, o2.y - 28, '?!', '#ffffff', 1.0, 0.8); }
        }
      };
      B.focusFn = () => (!shot ? t0focus(me, { x: G.x - 40, y: G.y }) : { x: Math.max(b.x, G.x - 110) - 10, y: G.y });
    },

    /* S51 their keeper POOFs into three... and all three dive the same way: synchronized diving, 10 / 10 / 10 */
    sd_triple_keeper() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const G = g.attackGoal(0), E = g.effects, b = g.ball;
      const [k1, k2] = extra(g, 1, 2);
      for (const k of [k1, k2]) { k.look = o2.look; k.name = o2.name; }
      const KX = G.x - 16, ks = [k1, o2, k2], ys = [G.y - 26, G.y, G.y + 26];
      place(o2, KX, G.y, PI); place(k1, KX - 0.5, G.y - 0.5, PI); place(k2, KX - 0.5, G.y + 0.5, PI);
      place(me, G.x - 112, G.y + 6, 0); place(mate, 220, 276, 0); place(o1, G.x - 250, G.y - 92, PI);
      give(g, me); holdNet(g);
      B.puppets = new Set([o1, o2, mate, k1, k2]); noAttack(o1, o2, mate, k1, k2); noPick(g, o1, o2, mate, k1, k2);
      at(0.12, () => { E.burst(KX, G.y, 8, '#d8d0e0', 28, 120, 0.6); E.comic(KX - 26, G.y - 42, 'POOF!', '#d8d0e0', 1.1, 0.6); g.sfx('whoosh'); mark('poof'); });
      let shot = false, dove = false, judged = false;
      B.dir = (dt, g, t) => {
        steer(mate, 220, 276, false); steer(o1, G.x - 250, G.y - 92, false);
        ks.forEach((k, i) => { if (!dove && k.state === 'normal') { steer(k, KX, (t < 0.12 ? G.y : ys[i]) + Math.sin(t * 7) * 1.5, true); face(k, me); } });
        keepLying(...ks);
        if (!shot) {
          still(me); face(me, G);
          if (t > 1.45) { Act.shoot(g, me, 0.45, 0.9); shot = true; mark('shot'); b.noPickup.set(me.id, 99); }
          return;
        }
        if (me.state === 'normal') still(me);
        if (!dove && B.t - B.marks.shot > 0.07) { dove = true; mark('dive'); for (const k of ks) { k.state = 'normal'; k.lying = true; Act.dive(g, k, -40); } g.sfx('whoosh'); }
        if (B.marks.goal == null && !b.owner) { b.vy = (G.y + 31 - b.y) * 3; b.vx = Math.max(b.vx, 230); b.z = Math.min(b.z, 4); b.vz = 0; }
      };
      // the judges hold up their cards during the GOAL pause (focusFn runs every frame, B.dir doesn't)
      B.focusFn = () => {
        keepLying(...ks);
        if (!judged && B.marks.goal != null && B.t - B.marks.goal > 0.45) {
          judged = true; mark('judges'); E.V.comics.length = 0;
          ks.forEach((k, i) => g.later(i * 0.12, () => E.comic(k.x - 26, k.y - 10, '10', '#ffffff', 1.2, 2.6)));
        }
        return { x: G.x - 46, y: G.y + 2 };
      };
    },

    /* S52 a 10-man wall (all the same guy) jumps... the free kick goes under them */
    sd_wall_jump() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const G = g.attackGoal(0), E = g.effects, b = g.ball;
      const wall = [o1, ...extra(g, 1, 9)];
      for (const q of wall) { q.look = o1.look; q.name = o1.name; }
      const WX = G.x - 80, spot = (k) => G.y - 54 + k * 12;
      wall.forEach((q, k) => place(q, WX, spot(k), PI));
      const BX = G.x - 140, BY = G.y + 6;
      place(me, BX - 26, BY + 3, 0); place(o2, G.x - 16, G.y - 8, PI); place(mate, 200, 282, 0);
      b.owner = null; b.x = BX; b.y = BY; b.z = 0; b.vx = b.vy = b.vz = 0; holdNet(g);
      // soft landing (no bounce: ten simultaneous thuds would shake the screen during the goal)
      always(g, () => { for (const q of wall) if (q.airZ > 0 && q.airZ < 9 && q.airVz < -130) q.airVz = -120; });
      B.puppets = new Set([...wall, o2, mate]); noAttack(...wall, o2, mate); noPick(g, ...wall, o2, mate, me);
      at(0.3, () => g.sfx('whistle'));
      let shot = false, jumped = false;
      B.dir = (dt, g, t) => {
        steer(mate, 200, 282, false);
        wall.forEach((q, k) => { if (q.airZ <= 0 && q.state === 'normal') { steer(q, WX, spot(k) + (jumped ? 0 : Math.sin(t * 8 + k) * 0.6), false); q.facing = PI; } });
        if (o2.state === 'normal') { still(o2); face(o2, b); }
        if (!shot) {
          if (t < 0.85) { still(me); face(me, b); return; }
          steer(me, BX - 3, BY, false);
          if (!jumped && U.dist(me, b) < 14) {
            jumped = true; mark('jump');
            wall.forEach((q, k) => { q.airVz = 252 + (k % 3) * 6; q.airZ = 0.5; });
            g.sfx('whoosh');
          }
          if (U.dist(me, b) < 9) {
            shot = true; mark('shot'); Act.startAttack(me, 'shoot');
            const d = U.norm(G.x + 10 - b.x, G.y + 31 - b.y);
            b.kick(me, d.x * 300, d.y * 300, 0); b.kind = 'shot'; g.sfx('kick', 0.8); E.burst(b.x, b.y, 2, '#ffffff', 8, 90);
          }
          return;
        }
        if (me.state === 'normal') still(me);
        if (B.marks.goal == null && !b.owner) { const d = U.norm(G.x + 10 - b.x, G.y + 31 - b.y); b.vx = d.x * 300; b.vy = d.y * 300; b.z = 0; b.vz = 0; }
        if (B.marks.under == null && b.x > WX) mark('under');
      };
      // after the goal they land and turn round to look (focusFn runs during the GOAL pause)
      B.focusFn = () => {
        if (B.marks.goal != null && B.t - B.marks.goal > 0.35) for (const q of wall) if (q.airZ <= 0) q.facing = 0;
        if (B.marks.goal != null && B.marks.look == null && B.t - B.marks.goal > 0.4) { mark('look'); E.comic(WX + 2, G.y - 66, '?', '#ffffff', 1.3, 1.2); }
        return { x: G.x - 78, y: G.y + 2 };
      };
    },

    /* S53 he's through on our empty net... our guy from the other half throws a punch: the arm crosses the pitch and yanks the ball back */
    sd_long_arm() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const H = g.ownGoal(0), E = g.effects, b = g.ball;   // our goal, x = 56
      place(o1, H.x + 160, H.y + 8, PI); place(me, H.x + 430, H.y - 16, PI); place(mate, H.x + 250, H.y + 96, PI); place(o2, 560, 140, PI);
      give(g, o1);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate); noPick(g, mate, o2, me);
      const T = 1.15;   // arm out 40 %, hold 20 %, back 40 %
      let punched = false, grabbed = false, home = false, tx = 0, ty = 0, arm = null;
      B.dir = (dt, g, t) => {
        steer(o2, 560, 140, false); if (mate.state === 'normal') { still(mate); face(mate, o1); }
        if (!grabbed) { if (o1.state === 'normal' && b.owner === o1) { o1.intent.mx = -0.55; o1.intent.my = 0; o1.intent.sprint = false; } }
        else if (o1.state === 'normal' || o1.state === 'recover') {
          still(o1);
          const k = B.t - B.marks.grab;
          if (k < 0.5) face(o1, H); else face(o1, me);
        }
        if (!punched) {
          if (t < 0.95) { me.intent.mx = -0.3; me.intent.my = 0; return; }
          still(me); face(me, o1);
          if (t > 1.25) {
            punched = true; mark('punch');
            tx = b.x + o1.vx * 0.46; ty = b.y;
            E.stretch(me.id, tx, ty, T, 1.4); arm = E.V.arms[E.V.arms.length - 1]; Act.startAttack(me, 'light'); me.state = 'recover'; me.stateT = T + 0.1;
            g.sfx('swing'); g.sfx('whoosh');
          }
          return;
        }
        const k = arm && arm.t > 0 ? 1 - (arm.t - dt) / arm.max : (B.t - B.marks.punch) / T;
        if (!grabbed && k >= 0.4) {
          grabbed = true; mark('grab');
          b.owner = null; noPick(g, o1); b.x = tx; b.y = ty; b.vx = b.vy = 0;
          Act.startAttack(o1, 'shoot'); o1.state = 'recover'; o1.stateT = 0.35;   // he swings at it... nothing there
          E.comic(tx, ty - 26, 'BOING!', '#ff8ac0', 1.2, 0.7); E.burst(tx, ty, 4, '#fff6a0', 10, 90); g.sfx('pass');
          g.later(0.4, () => E.text(o1.x, o1.y - 30, 'MISS', '#9aa3b5'));
          g.later(0.75, () => E.comic(o1.x, o1.y - 28, '?', '#ffffff', 1.2, 0.9));
        }
        if (grabbed && !home) {
          // the ball rides back on the fist
          const ext = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
          const sx = me.x + (tx >= me.x ? 4 : -4), sy = me.y - 8;
          const fx = sx + (tx - sx) * ext, fy = sy + (ty - 8 - sy) * ext;
          b.owner = null; b.x = fx; b.y = fy + 14; b.vx = b.vy = 0; b.z = 0; b.vz = 0;
          if (k >= 1) { home = true; mark('home'); b.noPickup.set(me.id, 0); b.owner = null; g.gainPossession(me); E.comic(me.x, me.y - 28, 'MINE.', '#ffe14f', 1.0, 0.8); }
        }
        if (home && me.state === 'normal') { still(me); face(me, o1); }
      };
      B.focusFn = () => (B.marks.punch == null ? { x: Math.max(o1.x - 30, 120), y: H.y } : grabbed && !home ? b : B.marks.home != null ? me : o1);
    },

    /* S54 four of them, one loose ball: a cartoon fight cloud... one walks out with the ball (#1 victory royale) */
    sd_royale() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const E = g.effects, b = g.ball;
      const C = { x: 320, y: 206 };
      const four = [me, o1, mate, o2];
      place(me, C.x - 62, C.y - 46, 0); place(o1, C.x + 62, C.y - 46, PI); place(mate, C.x - 62, C.y + 46, 0); place(o2, C.x + 62, C.y + 46, PI);
      b.owner = null; b.x = C.x; b.y = C.y; b.z = 0; b.vx = b.vy = b.vz = 0;
      B.puppets = new Set([o1, o2, mate]); noAttack(...four); noPick(g, ...four);
      // the fight cloud: puffy discs drawn just in front of the brawl
      const cloud = { x: C.x, y: C.y + 3, on: false, r: 0, T: 0 };
      cloud.__sd = (ctx, gg) => {
        const { disc, OUT } = SFC.Sprites, t = gg.time, r = cloud.r;
        if (r < 1) return;
        const pts = [];
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * PI * 2 + t * 2.2, rr = r * (0.75 + 0.25 * Math.sin(t * 13 + i * 1.9));
          pts.push([cloud.x + Math.cos(a) * rr * 1.2, cloud.y - 12 + Math.sin(a) * rr * 0.75, r * (0.5 + 0.18 * Math.sin(t * 17 + i * 2.3))]);
        }
        pts.push([cloud.x, cloud.y - 12, r * 0.85]);
        for (const [x, y, rr] of pts) disc(ctx, Math.round(x), Math.round(y), Math.max(1, Math.round(rr)) + 1, OUT);
        for (const [x, y, rr] of pts) disc(ctx, Math.round(x), Math.round(y), Math.max(1, Math.round(rr)), '#d9d2c3');
        for (const [x, y, rr] of pts) disc(ctx, Math.round(x - rr * 0.25), Math.round(y - rr * 0.3), Math.max(1, Math.round(rr * 0.55)), '#f4f0e6');
      };
      drawHook(g, () => (cloud.on ? [cloud] : []));
      const words = [['POW!', '#ffe14f'], ['BAM!', '#ff3d5a'], ['WHAM!', '#7fe7ff'], ['SMACK!', '#ff8ac0'], ['BONK!', '#ffffff'], ['KAPOW!', '#9dff3d']];
      let phase = 0, wn = 0, nextW = 0, sfxT = 0;
      const DUR = 1.75;
      B.dir = (dt, g, t) => {
        if (phase === 0) {
          // everyone flat out at the ball
          if (t < 0.35) { for (const q of four) { still(q); face(q, b); } return; }
          for (const q of four) { steer(q, C.x, C.y, true); q.stamina = 99; }
          if (four.every((q) => U.dist(q, C) < 26)) {
            phase = 1; cloud.on = true; cloud.T = t; mark('cloud');
            E.impactFrame(); E.flash(0.4); E.shake(7, 0.4); E.burst(C.x, C.y, 6, '#d9d2c3', 40, 160, 0.6);
            g.sfx('hit', 'hard'); g.sfx('punch');
          }
          return;
        }
        const s = t - cloud.T;
        if (phase === 1) {
          cloud.r = Math.min(19, 7 + s * 70);
          // the cloud wanders, the four spin in and out of it
          cloud.x = C.x + Math.sin(s * 5.3) * 7; cloud.y = C.y + 3 + Math.sin(s * 3.7) * 4;
          four.forEach((q, i) => {
            const a = (i / 4) * PI * 2 + s * 6.5 + Math.sin(s * 9 + i) * 0.5, rr = 17 + Math.sin(s * 11 + i * 2) * 4;
            q.x = cloud.x + Math.cos(a) * rr * 1.1; q.y = cloud.y - 4 + Math.sin(a) * rr * 0.6;
            q.vx = q.vy = q.kbx = q.kby = 0; q.state = 'stun'; q.stateT = 9; q.hitImmune = 9;
            q.airZ = 4 + Math.abs(Math.sin(s * 10 + i * 1.3)) * 9; q.airVz = 0;
          });
          b.owner = null; b.x = cloud.x + Math.sin(s * 23) * 5; b.y = cloud.y - 2; b.z = 2; b.vx = b.vy = 0;
          if (s >= nextW) {
            const [w, c] = words[wn++ % words.length], a = Math.random() * PI * 2;
            E.comic(cloud.x + Math.cos(a) * 28, cloud.y - 16 + Math.sin(a) * 20, w, c, 0.85 + Math.random() * 0.25, 0.32);
            nextW = s + 0.13;
          }
          if ((sfxT -= dt) <= 0) { sfxT = 0.09; g.sfx(Math.random() < 0.5 ? 'punch' : 'hit'); E.burst(cloud.x + U.rand(-14, 14), cloud.y - 10 + U.rand(-8, 8), 6, '#fff6a0', 4, 80, 0.3); E.shake(2, 0.08); }
          E.burst(cloud.x + U.rand(-16, 16), cloud.y + U.rand(-4, 4), 0, '#b8ad98', 2, 40, 0.5);
          if (s > DUR) {
            phase = 2; mark('clear'); cloud.on = false;
            E.burst(cloud.x, cloud.y - 10, 8, '#d9d2c3', 50, 150, 0.8); E.burst(cloud.x, cloud.y, 2, '#b8ad98', 30, 110, 0.9); E.V.comics.length = 0;
            // three of them are out cold; one walks out with the ball
            const spots = [[cloud.x - 31, cloud.y + 4, -1], [cloud.x + 30, cloud.y + 2, 1], [cloud.x + 10, cloud.y + 34, 1]];
            [o1, mate, o2].forEach((q, i) => { q.x = spots[i][0]; q.y = spots[i][1]; q.flat = spots[i][2]; q.state = 'stun'; q.stateT = 9; q.hitImmune = 9; q.facing = PI / 2; });
            place(me, cloud.x - 2, cloud.y + 8, PI / 2); b.noPickup.set(me.id, 0); b.owner = null; b.z = 0; g.gainPossession(me);
            g.sfx('land');
          }
          return;
        }
        // out cold: drawn side-on, flat on the floor (the airborne pose, rotated 90 degrees, a hair off the ground)
        for (const q of [o1, mate, o2]) { q.vx = q.vy = q.kby = 0; q.kbx = q.flat * 0.01; q.stateT = 9; q.airZ = 0.6; q.airVz = 0; q.anim = PI / 26 - dt; }
        if (me.state === 'normal') { still(me); me.facing = PI / 2; }
        if (B.marks.crown == null && t - cloud.T > DUR + 0.25) { mark('crown'); E.comic(me.x, me.y - 34, '#1', '#ffd23f', 1.5, 2.0); E.wave(me.x, me.y, 30, '#ffd23f', 0.5, 2); g.sfx('upgrade'); }
      };
      B.focusFn = () => ({ x: C.x, y: C.y - 8 });
    },

    /* S55 a dropkick by the top wall: he flies over it into the stands... and the crowd surfs him away */
    sd_stands() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const E = g.effects, b = g.ball, F = g.field;
      const Y0 = F.y + 20;
      place(o1, 236, Y0, PI); place(me, 290, Y0 + 26, PI); place(mate, 150, 262, 0); place(o2, 520, 230, PI);
      give(g, o1);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate); noPick(g, mate, o2);
      // this one player may leave the pitch: flight over the wall, then crowd-surfing on the top stand (render only, no physics)
      const CY = F.y - 49;
      let mode = 0, fl = 0, x0 = 0, y0 = 0, sx = 0;
      const up = o1.update.bind(o1);
      o1.update = (dt) => {
        if (!mode) return up(dt);
        fl += dt;
        o1.state = 'stun'; o1.stateT = 9; o1.hitImmune = 9; o1.vx = o1.vy = o1.kbx = o1.kby = 0; o1.airVz = 0;
        if (mode === 1) {
          const k = Math.min(1, fl / 0.8);
          o1.x = lerp(x0, x0 - 30, k); o1.y = lerp(y0, CY, ease(k, 1.6)); o1.airZ = 27 * Math.sin(k * PI) + 3 * k + 0.5;
          o1.anim += dt; o1.kbx = -1;   // spin on the way up
          if (k >= 1) { mode = 2; fl = 0; sx = o1.x; mark('land'); }
        } else {
          // passed along by the crowd, flat on his back
          o1.x = sx + fl * 34; o1.y = CY; o1.airZ = 3 + Math.sin(fl * 11) * 1.2;
          o1.anim = PI / 26; o1.kbx = 1;
        }
      };
      // the crowd's hands holding him up while he surfs
      const SK = ['#f1c27d', '#c68642', '#8d5524', '#ffdbac'];
      const hands = { y: CY - 0.5, __sd: (ctx, gg) => {
        if (mode !== 2) return;
        const { px, OUT } = SFC.Sprites;
        for (let i = 0; i < 4; i++) {
          const hx = Math.round(o1.x - 7 + i * 4.5), lift = Math.round(Math.sin(gg.time * 11 + i * 1.7) * 1.5), top = Math.round(CY - 10 - lift);
          px(ctx, hx - 1, top - 1, 3, 9, OUT); px(ctx, hx, top, 1, 8, SK[i]);
        }
      } };
      drawHook(g, () => [hands]);
      let kicked = false;
      B.dir = (dt, g, t) => {
        steer(mate, 150, 262, false); steer(o2, 520, 230, false);
        if (!kicked) {
          if (o1.state === 'normal' && b.owner === o1) { o1.intent.mx = -0.42; o1.intent.my = 0; o1.intent.sprint = false; }
          if (t > 0.3) steer(me, o1.x + 12, o1.y + 22, true); else still(me);
          if (t > 0.75 && U.dist(me, o1) < 30 && me.state === 'normal') { face(me, { x: o1.x - 4, y: o1.y - 6 }); kicked = Act.hardAttack(g, me); if (kicked) mark('kick'); }
          return;
        }
        if (!mode && o1.state === 'stun') {
          mode = 1; fl = 0; x0 = o1.x; y0 = o1.y; mark('fly');
          E.comic(o1.x + 10, o1.y - 30, 'YEET!', '#ff3d5a', 1.3, 0.8); E.flash(0.3); E.shake(6, 0.35);
          b.noPickup.set(me.id, 99);
        }
        if (B.marks.land != null && B.marks.roar == null) {
          mark('roar'); cheer(g, true);
          E.comic(o1.x + 4, F.y - 18, 'ROCK ON!', '#ffe14f', 1.0, 1.4); E.burst(o1.x, CY, 10, '#ffffff', 10, 70, 0.6); g.sfx('land');
          B.sfx.push({ t: B.t, name: 'crowdRoar', arg: 0.3 });
        }
        if (me.state === 'normal') { still(me); face(me, { x: o1.x, y: F.y - 30 }); }
      };
      B.focusFn = () => (mode ? { x: o1.x + 4, y: Math.max(o1.y, F.y - 40) + 30 } : t0focus(me, o1));
    },

    /* S56 last kick of the game: post... post... in */
    sd_last_second() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const G = g.attackGoal(0), E = g.effects, b = g.ball, F = g.field;
      g.teams[0].score = 2; g.teams[1].score = 2; g.finalPush = true;
      const END = g.cfg.match.duration;
      g.elapsed = END - 3.0;
      place(me, G.x - 128, G.y + 34, 0); place(o2, G.x - 16, G.y - 4, PI); place(mate, 260, 270, 0); place(o1, G.x - 205, G.y - 50, 0);
      give(g, me);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate); noPick(g, o1, o2, mate);
      const P1 = { x: G.x - 1.5, y: F.gTop + 2 }, P2 = { x: G.x - 3.5, y: F.gBot - 2 }, IN = { x: G.x + 12, y: G.y + 12 };
      let shot = false, phase = 0, T0 = 0, x0 = 0, y0 = 0, dove = false;
      holdNet(g);
      B.dir = (dt, g, t) => {
        g.elapsed = Math.min(g.elapsed, END - 0.05);   // the clock never runs out before the ball does
        steer(mate, 260, 270, false); if (o1.state === 'normal') steer(o1, me.x - 40, me.y - 30, true);
        if (!shot) {
          me.intent.mx = 0.35; me.intent.my = -0.05;
          if (o2.state === 'normal') { steer(o2, G.x - 16, G.y - 4, false); face(o2, me); }
          if (t > 0.65) { face(me, P1); Act.shoot(g, me, 0.9, -1); shot = true; mark('shot'); b.noPickup.set(me.id, 99); T0 = t; x0 = b.x; y0 = b.y; }
          return;
        }
        if (me.state === 'normal') { still(me); face(me, b); }
        if (!dove && t - T0 > 0.1 && o2.state === 'normal') { dove = true; Act.dive(g, o2, 70); mark('dive'); }
        if (o2.state === 'normal' && dove) { still(o2); o2.poseEnd = 99; }
        const s = t - T0;
        if (phase === 0) {
          const k = Math.min(1, (s + dt) / 0.3);
          drive(b, lerp(x0, P1.x, k), lerp(y0, P1.y, k), dt); b.z = lerp(3, 9, k); b.vz = 0;
          if (k >= 1) { phase = 1; T0 = t; mark('post1'); E.comic(P1.x - 20, P1.y - 26, 'CLANG!', '#ffe14f', 1.3, 0.7); E.burst(P1.x, P1.y, 8, '#ffffff', 12, 100, 0.4); E.shake(5, 0.25); g.sfx('clang'); }
          return;
        }
        if (phase === 1) {
          // back out and across the face of goal...
          const k = Math.min(1, (s + dt) / 0.42);
          drive(b, lerp(P1.x, P2.x, k) - Math.sin(k * PI) * 13, lerp(P1.y, P2.y, k), dt); b.z = 9 - 6 * k + Math.sin(k * PI) * 5; b.vz = 0;
          if (k >= 1) { phase = 2; T0 = t; mark('post2'); solo(E, /CLANG/); E.comic(P2.x - 24, P2.y + 16, 'CLANG!!', '#ff8a3f', 1.35, 0.7); E.burst(P2.x, P2.y, 4, '#ffffff', 12, 100, 0.4); E.shake(6, 0.25); g.sfx('clang'); }
          return;
        }
        if (phase === 2 && B.marks.goal == null) {
          const k = Math.min(1, (s + dt) / 0.24);
          drive(b, lerp(P2.x, IN.x, k), lerp(P2.y, IN.y, k), dt); b.z = 3; b.vz = 0;
          if (k >= 1) { phase = 3; b.vx = 60; b.vy = -20; }
        }
      };
      let whistled = false;
      B.focusFn = () => {
        if (!whistled && B.marks.goal != null && B.t - B.marks.goal > 0.5) { whistled = true; g.sfx('whistle'); }   // full time
        return !shot ? { x: me.x + 46, y: G.y + 12 } : { x: G.x - 40, y: G.y + 4 };
      };
    },

    /* S57 goal... my teammate won't celebrate with me, so I POOF eight of me and we dance in a ring */
    sd_clone_party() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const G = g.attackGoal(0), E = g.effects, b = g.ball;
      place(me, G.x - 64, G.y + 16, 0); place(o2, G.x - 14, G.y - 34, PI); place(mate, G.x - 128, G.y + 46, 0); place(o1, G.x - 230, G.y - 80, PI);
      give(g, me);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate); noPick(g, o1, o2, mate);
      let shot = false, gs = 0, poofed = false;
      holdNet(g);
      const ring = [], N = 8, CX = () => me.x, CY = () => me.y;
      B.dir = (dt, g, t) => {
        if (o1.state === 'normal') steer(o1, G.x - 230, G.y - 80, false);
        if (o2.state === 'normal') { still(o2); face(o2, b); }
        still(mate); face(mate, me);
        if (!shot) { still(me); face(me, G); if (t > 0.3) { Act.shoot(g, me, 0.4, 0.4); shot = true; mark('shot'); b.noPickup.set(me.id, 99); } return; }
        still(me);
      };
      // the celebration runs during the GOAL pause: driven from a per-step hook on this game
      always(g, (dt) => {
        if (g.state !== 'goal') return;
        g.stateT = Math.max(g.stateT, 1);   // the party doesn't stop
        gs += dt;
        // the teammate: turns his back
        if (gs < 0.3) face(mate, me); else mate.facing = -PI / 2;
        if (B.marks.meh == null && gs > 0.45) { mark('meh'); E.comic(mate.x, mate.y - 28, 'meh.', '#9aa3b5', 1.0, 1.0); }
        if (gs < 1.05) { me.facing = gs < 0.75 ? PI / 2 : Math.atan2(mate.y - me.y, mate.x - me.x); if (B.marks.huh == null && gs > 0.8) { mark('huh'); E.comic(me.x + 4, me.y - 28, '...', '#ffffff', 1.0, 0.6); } return; }
        if (!poofed) {
          poofed = true; mark('poof');
          for (let k = 0; k < N; k++) { const a = (k / N) * PI * 2; E.clone(me.id, me.x + Math.cos(a) * 4, me.y + Math.sin(a) * 3, 0, 0, 9); ring.push(E.V.clones[E.V.clones.length - 1]); }
          E.burst(me.x, me.y, 8, '#d8d0e0', 30, 130, 0.6); E.comic(me.x, me.y - 40, 'POOF!', '#d8d0e0', 1.2, 0.6); g.sfx('whoosh'); E.shake(3, 0.2);
        }
        const s = gs - 1.05, R = Math.min(1, s / 0.25);
        ring.forEach((c, k) => {
          const a = (k / N) * PI * 2 + s * 2.6, tx = CX() + Math.cos(a) * 37 * R, ty = CY() + Math.sin(a) * 22 * R;
          c.vx = (tx - c.x) / dt; c.vy = (ty - c.y) / dt;
          c.facing = Math.floor(s * 4 + k) % 2 ? Math.atan2(c.vy, c.vx) : PI / 2;   // step, turn to the camera, step...
          c.t = Math.max(c.t, 2);
        });
        // him in the middle: jumping
        me.facing = PI / 2;
        if (me.airZ <= 0 && s > 0.2) { me.airVz = 132; me.airZ = 0.5; }
        if (B.marks.party == null && s > 0.4) { mark('party'); E.comic(me.x, me.y - 46, 'PARTY!', '#ff8ac0', 1.2, 1.2); }
      });
      B.focusFn = () => ({ x: G.x - 84, y: G.y + 14 });
    },

    /* S58 the keeper catches it... it's a bomb (3, 2, 1): KABOOM, the ball trickles in */
    sd_bomb_keeper() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const G = g.attackGoal(0), E = g.effects, b = g.ball;
      place(me, G.x - 122, G.y + 6, 0); place(o2, G.x - 18, G.y, PI); place(mate, 230, 276, 0); place(o1, G.x - 260, G.y - 90, PI);
      give(g, me); holdNet(g);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate); noPick(g, o1, o2, mate);
      // the fuse only counts down once he's holding it: 3 (catch +0.1), 2, 1, KABOOM (catch +1.65)
      const TICKS = [[0.22, '3'], [0.7, '2'], [1.18, '1']], BOOM = 1.68;
      let tick = 0, shot = false, caught = false, boom = false, cT = 0;
      at(0.05, () => E.comic(b.x + 2, b.y - 20, 'BOMB!', '#ff3d5a', 1.0, 0.9));
      B.dir = (dt, g, t) => {
        steer(mate, 230, 276, false); steer(o1, G.x - 260, G.y - 90, false);
        if (!boom) b.skin = 'bomb';
        if (!shot) {
          me.intent.mx = 0.4; me.intent.my = -0.02;
          steer(o2, G.x - 18, G.y + (b.y - G.y) * 0.5, false); face(o2, me);
          if (t > 0.55) { face(me, o2); Act.shoot(g, me, 0.35, 0); shot = true; mark('shot'); b.noPickup.set(me.id, 99); b.skin = 'bomb'; }
          return;
        }
        if (me.state === 'normal') { still(me); face(me, o2); }
        if (!caught) {
          if (o2.state === 'normal') { still(o2); face(o2, b); }
          b.z = Math.min(b.z, 8);
          if (!b.owner && U.dist(b, o2) < 10) {
            caught = true; cT = t; mark('catch');
            b.noPickup.set(o2.id, 0); b.owner = null; g.gainPossession(o2); b.skin = 'bomb';
            E.text(o2.x, o2.y - 26, 'SAVE!', '#9dff3d'); g.sfx('save');
          }
          return;
        }
        if (!boom) {
          const k = t - cT;
          if (tick < TICKS.length && k >= TICKS[tick][0]) { solo(E, /^\d$/); E.comic(o2.x + 17, o2.y - 16, TICKS[tick][1], '#ff3d5a', 1.3, 0.5); g.sfx('menu'); tick++; }
          if (o2.state === 'normal') {
            if (k < 0.5) { still(o2); o2.facing = PI / 2; }                                  // proud, to the camera
            else { const a = (k - 0.5) * 10; steer(o2, G.x - 28 + Math.cos(a) * 11, G.y + Math.sin(a) * 9, true); }   // PANIC
          }
          if (B.marks.notice == null && k > 0.66) { mark('notice'); E.comic(o2.x - 14, o2.y - 34, '!?', '#ffffff', 1.2, 0.8); }
          if (k >= BOOM) {
            boom = true; mark('boom'); b.skin = null;
            const x = o2.x, y = o2.y;
            g.hitStop(0.1); E.impactFrame(); E.shake(10, 0.6); E.flash(0.6);
            E.wave(x, y, 46, '#ff6a1f', 0.55, 4); E.decal('scorch', x, y, 2, 5); E.decal('crack', x, y, 1.2, 4);
            E.burst(x, y, 6, '#ff6a1f', 34, 190, 0.8); E.burst(x, y, 4, '#6a6470', 24, 80, 1.2); E.burst(x, y, 8, '#ffd23f', 20, 150, 0.6);
            E.V.comics.length = 0; E.comic(x, y - 38, 'KABOOM!', '#ff6a1f', 1.6, 1.1);
            b.owner = null; b.x = x + 6; b.y = y; b.z = 4; b.vx = 40; b.vy = 0; b.vz = 60; noPick(g, o2, me);
            smack(o2, { stun: 4, kbx: -50, kby: -10, launch: 290, source: null, type: 'hard' });
            g.sfx('hit', 'hard'); g.sfx('wall');
          }
          return;
        }
        // ...and the ball dribbles over the line
        if (B.marks.goal == null) { b.owner = null; b.vx = Math.max(b.vx, 44); b.vy = (G.y + 4 - b.y) * 0.8; }
      };
      B.focusFn = () => (!shot ? t0focus(me, o2) : { x: G.x - 42, y: G.y - 6 });
    },

    /* S59 METEOR SHOT: both defenders and the keeper dive out of its way... it goes in, the net goes up in flames */
    sd_dodge() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const G = g.attackGoal(0), E = g.effects, b = g.ball;
      const [x1] = extra(g, 1, 1);
      ult(g, me, 'meteor_strike');
      place(me, G.x - 196, G.y + 2, 0); place(o1, G.x - 132, G.y - 3, PI); place(x1, G.x - 78, G.y + 4, PI); place(o2, G.x - 17, G.y, PI); place(mate, 200, 280, 0);
      give(g, me);
      const def = [o1, x1, o2], dirs = [-1, 1, -1];
      B.puppets = new Set([o1, o2, x1, mate]); noAttack(o1, o2, x1, mate); noPick(g, o1, o2, x1, mate);
      let fired = false, seen = false, flames = 0;
      const gone = new Set();
      B.dir = (dt, g, t) => {
        steer(mate, 200, 280, false);
        def.forEach((q, i) => { if (!gone.has(q) && q.state === 'normal') { still(q); face(q, me); } });
        keepLying(...def);
        if (!fired) { still(me); face(me, G); if (t > 0.4) { fired = g.cores.activateUltimate(me); if (fired) mark('ult'); } return; }
        if (me.state === 'normal') still(me);
        noPick(g, o1, o2, x1, mate);
        // they look up at him in the sky...
        if (!seen && me.airZ > 30) { seen = true; mark('seen'); def.forEach((q, i) => g.later(i * 0.05, () => E.text(q.x, q.y - 28, '!', '#ff3d5a'))); }
        // ...and the moment it's struck, nobody wants it
        if (b.fx.meteor && !b.owner) {
          mark('meteor'); b.vy = (G.y - b.y) * 5;
          const zmax = Math.max(3, (G.x - b.x) * 0.3); if (b.z > zmax) { b.z = zmax; b.vz = 0; }
          def.forEach((q, i) => {
            if (gone.has(q) || b.x < q.x - 120 + i * 18) return;
            gone.add(q); q.lying = true; q.state = 'normal'; Act.dive(g, q, dirs[i] * 44); mark('dodge' + i);
            E.comic(q.x, q.y + (dirs[i] < 0 ? -40 : 34), 'NOPE!', '#ffe14f', 0.9, 0.7);
          });
        }
      };
      // the net burns (the Meteor's own net fire, plus some more)
      B.focusFn = () => {
        keepLying(...def);
        if (B.marks.goal != null && B.t - B.marks.goal < 2.6 && flames++ % 2 === 0) {
          const f = g.field;
          E.burst(G.x + 4 + Math.random() * 14, f.gTop + Math.random() * f.goalWidth, 6 + Math.random() * 20, Math.random() < 0.5 ? '#ff6a1f' : '#ffd23f', 3, 40, 0.5);
          if (B.marks.fwoosh == null && B.t - B.marks.goal > 0.3) { mark('fwoosh'); E.comic(G.x - 6, G.y - 50, 'FWOOSH!', '#ff6a1f', 1.3, 1.2); }
        }
        return B.marks.ult == null || B.t - B.marks.ult < 0.6 ? { x: G.x - 110, y: G.y } : { x: Math.max(b.x, G.x - 110), y: G.y };
      };
    },

    /* S60 penalty: Titan-size keeper, pocket-size striker... the shot rolls between his legs */
    sd_tiny_pen() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const G = g.attackGoal(0), E = g.effects, b = g.ball;
      const KX = G.x - 20, KY = G.y;
      place(o2, KX, KY, PI); setSize(o2, 2.7); o2.titanT = 99;
      place(me, G.x - 100, G.y + 1, 0); setSize(me, 0.55);
      place(mate, G.x - 175, G.y + 74, 0); place(o1, G.x - 175, G.y - 74, PI);
      b.owner = null; b.x = G.x - 70; b.y = KY + 1; b.z = 0; b.vx = b.vy = b.vz = 0;
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate); noPick(g, o1, o2, mate, me);
      at(0.3, () => g.sfx('whistle'));
      let shot = false, meg = false, stepT = 0;
      B.dir = (dt, g, t) => {
        steer(mate, G.x - 175, G.y + 74, false); steer(o1, G.x - 175, G.y - 74, false);
        o2.x = KX; o2.y = KY; o2.vx = o2.vy = 0;
        if (!shot) {
          face(o2, me);
          // the giant: a stomp or two to scare him
          if (t > 0.5 && t < 1.3 && (stepT -= dt) <= 0) { stepT = 0.4; E.shake(4, 0.15); E.decal('crack', KX, KY, 0.8, 3); E.burst(KX, KY, 0, '#8a7f70', 10, 60); g.sfx('wall'); }
          if (t < 1.4) { still(me); face(me, b); return; }
          steer(me, b.x - 3, b.y, false);
          if (U.dist(me, b) < 4.5) {
            shot = true; mark('shot'); Act.startAttack(me, 'shoot');
            b.kick(me, 105, 0, 0); b.kind = 'shot'; g.sfx('kick', 0.3); E.burst(b.x, b.y, 2, '#ffffff', 5, 50);
          }
          return;
        }
        if (me.state === 'normal') { still(me); face(me, b); }
        if (B.marks.goal == null && !b.owner) { b.vx = Math.max(b.vx, 95); b.vy = (KY + 1 - b.y) * 4; b.z = 0; b.vz = 0; }
        // he waits for it... it rolls right between his feet
        face(o2, b.x < KX - 4 ? b : { x: KX, y: KY + 40 });
        if (!meg && b.x > KX - 3) { meg = true; mark('meg'); E.comic(KX, KY - 50, 'NUTMEG!', '#ffe14f', 1.3, 1.2); g.sfx('whoosh'); }
        if (meg && B.marks.huh == null && b.x > KX + 8) { mark('huh'); E.comic(KX + 14, KY - 70, '?', '#ffffff', 1.3, 1.0); }
      };
      B.focusFn = () => ({ x: G.x - 48, y: G.y - 8 });
    },
  });
})();
