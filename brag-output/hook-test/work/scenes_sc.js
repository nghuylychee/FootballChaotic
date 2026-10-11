/* sc scenes (S37–S48 staged skits): added to BRAG.SCENES after scenes.js loads (capture.py injects every scenes_*.js).
   Every scene name starts with sc_. Runtime patches (renderer, ball, checkGoal...) are made inside their scene only:
   each capture is a fresh page, so they never leak into another scene. */
(function () {
  const { U, Act, PI, place, give, face, steer, still, mark, match, cast, ult, at, noAttack, extra, t0focus } = BRAG.lib;
  const B = BRAG;
  const lerp = (a, b, k) => a + (b - a) * k;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = (k, p = 2.2) => 1 - Math.pow(1 - clamp(k, 0, 1), p);
  const noPick = (g, ...ps) => { for (const q of ps) g.ball.noPickup.set(q.id, 99); };
  // loose ball on rails: velocity that puts it exactly at (x, y) after this sim step
  const drive = (b, x, y, dt) => { b.owner = null; b.vx = (x - b.x) / dt; b.vy = (y - b.y) / dt; };
  // fall flat along the y axis (the keeper-dive pose, held while keepLying runs): dir +1 = toward the camera, -1 = away
  const topple = (q, dir, dist = 12, time = 0.2) => {
    q.state = 'dash'; q.stateT = time; q.dashX = 0; q.dashY = (dir * dist) / time; q.trailLeft = 0; q.vx = q.vy = 0; q.kbx = q.kby = 0;
    Act.startAttack(q, dir > 0 ? 'diveD' : 'diveU'); q.poseEnd = 99; q.lying = true;
  };
  const keepLying = (...ps) => { for (const q of ps) if (q.lying && q.state === 'normal') { q.poseEnd = 99; still(q); } };
  const getUp = (q) => { if (q.flatA != null) unflat(q); q.lying = false; q.poseEnd = 0; q.atkType = null; if (q.state === 'dash') { q.state = 'normal'; q.stateT = 0; } };
  // lie flat on the ground sideways (rotated sprite, reads better than the keeper-dive pose): dir +1 = head to the right
  const patchFlat = () => {
    const R = SFC.Renderer;
    if (R._scFlat) return; R._scFlat = true;
    const air0 = R.airborne;
    R.airborne = function (ctx, p, gg) {
      if (p.flatA == null) return air0.call(this, ctx, p, gg);
      const S = SFC.Sprites;
      S.ellipse(ctx, Math.round(p.x + Math.sign(p.flatA) * 3), Math.round(p.y) + 1, 10, 2.5, 'rgba(0,0,0,0.38)');
      ctx.save(); ctx.translate(Math.round(p.x), Math.round(p.y - 3)); ctx.rotate(p.flatA);
      S.drawPlayer(ctx, Object.assign({}, p, { x: 0, y: 8, keeper: false, vx: 0, vy: 0, state: p.flatKO ? 'stun' : 'normal', atkType: null }), gg, 0.999);
      ctx.restore();
      return Math.round(p.y - 3) - 8;
    };
  };
  const flat = (q, dir, ko = true) => {
    patchFlat();
    Object.assign(q, { flatA: dir * PI / 2, flatKO: ko, state: 'normal', stateT: 0, atkType: null, vx: 0, vy: 0, kbx: 0, kby: 0, airZ: 0.01, airVz: 0, lying: true });
    q.updateAir = () => { q.airZ = 0.01; q.airVz = 0; };
    still(q);
  };
  const unflat = (q) => { q.flatA = null; q.lying = false; q.airZ = 0; delete q.updateAir; };
  // a fresh stun hit that always lands (clears the immunity the last hit left)
  const smack = (q, o) => { if (q.state === 'stun') q.state = 'normal'; q.hitImmune = 0; return q.hit(o); };
  // keep one comic of a kind on screen
  const solo = (E, re) => { E.V.comics = E.V.comics.filter((c) => !re.test(c.str || '')); };

  Object.assign(B.SCENES, {
    /* S37 PENALTY: the striker steps up... the keeper sprints off his line and dropkicks him before he gets there. SAVE! */
    sc_keeper_dk() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const G = g.attackGoal(0), E = g.effects, b = g.ball;
      g.cores.add(o2, 'heavy_boot');
      const SPOT = { x: G.x - 66, y: G.y };
      place(me, G.x - 122, G.y + 4, 0); place(mate, G.x - 175, G.y + 78, 0); place(o1, G.x - 175, G.y - 74, PI); place(o2, G.x - 16, G.y, PI);
      b.owner = null; b.x = SPOT.x; b.y = SPOT.y; b.z = 0; b.vx = b.vy = 0;
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, mate, me); o2.cd.light = 99; noPick(g, me, o1, o2, mate);
      let kicked = false, saved = false, held = false;
      at(0.32, () => g.sfx('whistle'));
      B.dir = (dt, g, t) => {
        steer(mate, G.x - 175, G.y + 78, false); steer(o1, G.x - 175, G.y - 74, false); face(mate, b); face(o1, b);
        if (!kicked) {
          // the keeper bounces on his line... then just goes for it
          if (o2.state === 'normal') {
            if (t < 0.72) { steer(o2, G.x - 16, G.y + Math.sin(t * 7) * 9, false); face(o2, me); }
            else { steer(o2, me.x + 4, me.y, true); face(o2, me); }
          }
          // the striker: deep breath, then a slow run-up
          if (t < 0.55) { still(me); face(me, SPOT); } else { const d = U.norm(SPOT.x - 9 - me.x, SPOT.y - me.y); me.intent.mx = d.x * 0.8; me.intent.my = d.y * 0.8; me.intent.sprint = false; }
          if (t > 0.7 && o2.state === 'normal' && U.dist(o2, me) < 31) { face(o2, me); kicked = Act.hardAttack(g, o2); if (kicked) mark('windup'); }
          return;
        }
        if (me.state === 'normal' && B.marks.kick == null) still(me);
        if (me.state === 'stun' && B.marks.kick == null) {
          mark('kick'); me.kbx = -330; me.kby = -20; me.airVz = Math.max(me.airVz, 230);
          E.comic(me.x - 6, me.y - 34, 'SMASH!!', '#ff3d5a', 1.4, 0.6); E.flash(0.4); E.shake(7, 0.4); E.impactFrame();
        }
        if (B.marks.kick != null && !saved && B.t - B.marks.kick > 0.62) {
          saved = true; mark('save'); solo(E, /SMASH/);
          E.comic(o2.x + 2, o2.y - 34, 'SAVE!', '#9dff3d', 1.2, 1.0); g.sfx('save');
        }
        // the keeper strolls over, picks the ball up and goes back to his line
        if (B.marks.kick != null && o2.state === 'normal' && B.t - B.marks.kick > 0.45) {
          if (!held) { steer(o2, b.x + 6, b.y, false); if (U.dist(o2, b) < 10) { held = true; mark('held'); b.noPickup.set(o2.id, 0); g.gainPossession(o2); } }
          else if (o2.x < G.x - 22) { steer(o2, G.x - 16, G.y, false); }
          else { still(o2); o2.facing = PI; if (B.marks.next == null) { mark('next'); E.comic(o2.x - 4, o2.y - 30, 'NEXT!', '#ffffff', 1.1, 1.2); } }
        } else if (o2.state === 'normal') still(o2);
      };
      B.focusFn = () => (B.marks.kick == null ? t0focus(me, o2) : { x: Math.max(o2.x - 30, G.x - 110), y: G.y });
    },

    /* S38 SPAWN KILL: kickoff, dropkicked instantly. He respawns. Dropkicked. Respawns. Dropkicked. RAGE QUIT. */
    sc_spawn() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const E = g.effects, b = g.ball, F = g.field;
      g.cores.add(me, 'heavy_boot');
      const C = { x: F.cx, y: F.cy };
      const SP = { x: C.x + 10, y: C.y }, HOME = { x: C.x - 26, y: C.y };
      place(o1, SP.x, SP.y, PI); place(me, HOME.x, HOME.y, 0); place(mate, C.x - 120, C.y + 70, 0); place(o2, 560, 203, PI);
      give(g, o1);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate); noPick(g, me, mate, o2);
      const spawns = [1.35, 2.45, 3.45];
      let n = 0, armed = true, launched = true, gone = false;
      const spawn = (k) => {
        place(o1, SP.x, SP.y, PI); o1.hitImmune = 0; o1.state = 'normal';
        b.owner = null; b.x = SP.x - 8; b.y = SP.y; b.z = 0; b.vx = b.vy = b.vz = 0; b.skin = null; b.noPickup.set(o1.id, 0); g.gainPossession(o1);
        E.burst(SP.x, SP.y, 8, '#7fe7ff', 18, 90, 0.5); E.wave(SP.x, SP.y, 16, '#7fe7ff', 0.35, 2); E.shield(SP.x, SP.y - 8, 13, '#7fe7ff', 0.45);
        solo(E, /RESPAWN/); E.comic(SP.x + 4, SP.y - 32, 'RESPAWN', '#7fe7ff', 0.8, 0.32); g.sfx('zap');
        armed = true; launched = false; mark('spawn' + k);
      };
      at(0.25, () => g.sfx('whistle'));
      spawns.slice(0, 2).forEach((s, k) => at(s, () => spawn(k + 1)));
      at(spawns[2], () => {
        // third respawn... he's had enough
        gone = true; mark('quit');
        E.burst(SP.x, SP.y, 8, '#9aa3b5', 22, 70, 0.8); E.comic(SP.x - 6, SP.y - 34, 'RAGE QUIT', '#ff3d5a', 1.15, 2.2); g.sfx('whoosh');
        g.later(0.35, () => E.text(SP.x, SP.y - 8, '#9 left the match', '#c7ccd6'));
        g.players = g.players.filter((q) => q !== o1);
        b.owner = null; b.x = SP.x; b.y = SP.y; b.vx = b.vy = 0; noPick(g, me);
      });
      B.dir = (dt, g, t) => {
        steer(mate, C.x - 120, C.y + 70, false); steer(o2, 560, 203, false);
        if (gone) { if (me.state === 'normal') { steer(me, HOME.x, HOME.y, false); if (U.dist(me, HOME) < 2) { still(me); me.facing = PI / 2; } } return; }
        if (o1.state === 'normal' && armed) { still(o1); o1.facing = PI; }
        // he kicks the instant the whistle goes / the instant he respawns
        const go = n === 0 ? t > 0.27 : B.t - B.marks['spawn' + n] > 0.04;
        if (armed && go && me.state === 'normal') { face(me, o1); me.cd.hard = 0; if (Act.hardAttack(g, me)) { armed = false; launched = false; mark('windup' + (n + 1)); } }
        if (!armed && !launched && o1.state === 'stun') {
          launched = true; n++; mark('kick' + n);
          o1.kbx = 560; o1.kby = (n === 2 ? -60 : 50); o1.airVz = Math.max(o1.airVz, 260);
          noPick(g, o1);
          E.V.comics = E.V.comics.filter((c) => !/^x\d|RESPAWN/.test(c.str || ''));
          if (n > 1) E.comic(C.x - 4, C.y - 66, 'x' + n, '#ff3d5a', 1.2 + n * 0.2, 1.0);
        }
        // walk back to the spawn point and wait
        if (!armed && me.state === 'normal') { if (U.dist(me, HOME) > 3) steer(me, HOME.x, HOME.y, true); else { still(me); face(me, SP); } }
        if (!b.owner && !gone && o1.state !== 'normal') { b.vx *= 0.9; b.vy *= 0.9; }
      };
      B.focusFn = () => ({ x: C.x, y: C.y - 6 });
    },

    /* S39 HOME RUN: the pitcher lobs it in, a Giant Fist swing, the ball leaves the stadium; he trots round the bases */
    sc_homerun() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const E = g.effects, b = g.ball, F = g.field;
      g.cores.add(me, 'giant_fist');
      const M = { x: 300, y: 232 };
      place(me, M.x, M.y, 0); place(o1, M.x + 74, M.y - 4, PI); place(mate, M.x - 20, M.y + 10, 0); place(o2, 560, 203, PI);
      give(g, o1);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate); noPick(g, me, mate, o2);
      me.res.rage = 5;
      // the ball may leave the pitch over the top wall
      const cw = b.collideWalls.bind(b); b.collideWalls = function () { if (!B.homer) cw(); };
      const T_THROW = 1.0, FLY = 0.62;
      let thrown = false, swung = false, hit = false, x0 = 0, y0 = 0, T0 = 0, gone = false, k = 0;
      const base = [[M.x + 28, M.y - 26], [M.x + 56, M.y], [M.x + 28, M.y + 26], [M.x, M.y]];
      B.dir = (dt, g, t) => {
        steer(o2, 560, 203, false);
        if (!hit) { still(mate); face(mate, o1); }
        if (!thrown) {
          still(o1); face(o1, me); still(me); face(me, o1); me.res.rage = 5;
          if (t > T_THROW) { thrown = true; mark('throw'); b.noPickup.set(o1.id, 99); g.looseBall(o1, -1, 0, 0); x0 = b.x; y0 = b.y; T0 = t; Act.startAttack(o1, 'shoot'); g.sfx('pass'); }
          return;
        }
        if (!hit) {
          // a nice slow lob, right into the strike zone
          const kk = Math.min(1, (t - T0 + dt) / FLY);
          drive(b, lerp(x0, M.x + 15, kk), lerp(y0, M.y - 1, kk), dt); b.z = 6 + Math.sin(kk * PI) * 26 + kk * 6; b.vz = 0;
          if (!swung && kk > 0.86) { swung = true; face(me, { x: M.x + 30, y: M.y - 12 }); me.cd.light = 0; Act.lightAttack(g, me); mark('swing'); }
          if (kk >= 1) {
            hit = true; mark('hit'); B.homer = true;
            E.impactFrame(); E.flash(0.6); E.shake(9, 0.5); g.hitStop(0.12);
            E.comic(b.x + 4, b.y - 30, 'CRACK!!', '#ffe14f', 1.6, 0.9); E.burst(b.x, b.y, b.z, '#ffffff', 20, 160, 0.5); E.wave(b.x, b.y - 10, 22, '#ffe14f', 0.35, 3);
            g.sfx('kick', 1); g.sfx('hit', 'hard');
            x0 = b.x; y0 = b.y; T0 = t;
          }
          if (o1.state === 'normal') { still(o1); face(o1, b); }
          return;
        }
        // up, up and out of the stadium
        if (!gone) {
          const s = t - T0;
          b.owner = null; b.vx = b.vy = b.vz = 0;
          b.x = x0 + 50 * s; b.y = y0 - 110 * s; b.z = 12 + 290 * s + 60 * s * s;
          E.burst(b.x, b.y, b.z, '#ffffff', 2, 18, 0.45); if (Math.random() < 0.5) E.burst(b.x, b.y, b.z, '#ffe14f', 1, 12, 0.35);
          if (b.y - b.z < 14) {
            gone = true; mark('gone');
            b.x = -500; b.y = -500;
            const ex = x0 + 50 * s; E.burst(ex, 24, 0, '#ffffff', 14, 50, 0.7); E.ring(ex, 24, '#ffffff'); E.ring(ex, 24, '#ffe14f');
            E.comic(M.x + 30, 150, 'HOME RUN!!', '#ffe14f', 0.95, 1.5); g.sfx('zap');
            B.sfx.push({ t: B.t, name: 'crowdRoar', arg: 0.3 });
          }
        }
        // everyone looks up... except him: he's running the bases
        for (const q of [o1, mate]) if (q.state === 'normal') { still(q); q.facing = -PI / 2 + (q === o1 ? -0.4 : 0.3); }
        if (me.state !== 'normal' || B.t - B.marks.hit < 0.9) { if (me.state === 'normal') { still(me); me.facing = -PI / 2; } return; }
        if (k < base.length) {
          const [bx, by] = base[k];
          steer(me, bx, by, false); me.intent.mx *= 0.75; me.intent.my *= 0.75;
          if (Math.hypot(bx - me.x, by - me.y) < 3) { k++; mark('base' + k); }
        } else { still(me); me.facing = PI / 2; }
      };
      B.focusFn = () => ({ x: M.x + 30, y: M.y - 22 });
    },

    /* S40 WHY ALWAYS ME: he's just standing there. A shot hits him. A clearance hits him. A pass hits him. */
    sc_always_me() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const E = g.effects, b = g.ball;
      const V = { x: 330, y: 200 };
      place(o1, V.x, V.y, PI / 2); place(me, V.x - 84, V.y + 4, 0); place(mate, V.x - 70, V.y + 92, -0.9); place(o2, 560, 203, PI);
      give(g, me);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate, me); noPick(g, o1, o2, mate, me);
      // three balls from three directions, all at his head: [launch time, from, flight time, comic]
      const hits = [
        { t: 0.55, from: () => ({ x: me.x + 8, y: me.y }), fly: 0.24, str: 'BONK!' },
        { t: 1.55, from: () => ({ x: V.x + 110, y: V.y - 30 }), fly: 0.26, str: 'BONK!!' },
        { t: 2.55, from: () => ({ x: mate.x + 6, y: mate.y - 4 }), fly: 0.24, str: 'BONK!!!' },
      ];
      let k = -1, T0 = 0, x0 = 0, y0 = 0, down = false;
      at(0.3, () => E.comic(o1.x + 10, o1.y - 30, '♪', '#ffffff', 0.8, 0.8));
      B.dir = (dt, g, t) => {
        steer(o2, 560, 203, false);
        keepLying(o1);
        // the victim: just standing there, minding his business
        if (o1.state === 'normal' && !o1.lying) {
          still(o1);
          // between hits: who did that?
          o1.facing = B.marks.bonk2 != null ? 0 : B.marks.bonk1 != null ? PI : PI / 2;
          if (B.marks.bonk1 != null && B.marks.q1 == null) { mark('q1'); E.text(o1.x - 4, o1.y - 28, '?', '#ffffff'); }
          if (B.marks.bonk2 != null && B.marks.q2 == null) { mark('q2'); E.text(o1.x + 4, o1.y - 28, '??', '#ffffff'); }
        }
        if (k < hits.length - 1 && t >= hits[k + 1].t) {
          k++; T0 = t; mark('launch' + (k + 1));
          const p0 = hits[k].from(); b.owner = null; b.x = p0.x; b.y = p0.y; b.z = 2; x0 = b.x; y0 = b.y; b.skin = null;
          if (k === 0) { Act.startAttack(me, 'shoot'); g.sfx('kick', 0.7); }
          if (k === 1) g.sfx('kick', 1);
          if (k === 2) { Act.startAttack(mate, 'shoot'); g.sfx('pass'); }
        }
        if (k >= 0) {
          const h = hits[k], s = t - T0, kk = Math.min(1, (s + dt) / h.fly);
          if (kk < 1 || B.marks['bonk' + (k + 1)] == null) {
            drive(b, lerp(x0, o1.x, kk), lerp(y0, o1.y, kk), dt); b.z = lerp(2, 15, kk) + Math.sin(kk * PI) * 6; b.vz = 0;
          }
          if (kk >= 1 && B.marks['bonk' + (k + 1)] == null) {
            mark('bonk' + (k + 1));
            const d = U.norm(o1.x - x0, o1.y - y0);
            E.comic(o1.x + 2, o1.y - 34 - k * 3, h.str, k === 2 ? '#ff3d5a' : '#ffffff', 1.1 + k * 0.2, 0.8);
            E.burst(o1.x, o1.y, 16, '#fff6a0', 10 + k * 4, 110, 0.4); E.shake(3 + k * 2, 0.25); g.sfx('hit', k === 2 ? 'hard' : 'light');
            if (k === 2) { E.flash(0.4); E.impactFrame(); }
            // the ball pops off his head, away from where it came from
            b.vx = -d.x * 90 + (k === 1 ? 0 : 20); b.vy = -d.y * 90 - 30; b.vz = 120; b.z = 15;
            if (k < 2) { smack(o1, { stun: 0.55, kbx: d.x * 50, kby: d.y * 50, launch: 0, source: null, type: 'light' }); }
            else { down = true; smack(o1, { stun: 9, kbx: d.x * 22, kby: d.y * 10, launch: 120, source: null, type: 'hard' }); o1.fallDir = d.x >= 0 ? 1 : -1; }
          }
        }
        if (down && o1.flatA == null && o1.airZ <= 0 && o1.airVz <= 0 && B.t - B.marks.bonk3 > 0.12) { flat(o1, o1.fallDir); mark('flat'); }
        if (down && B.marks.why == null && B.t - B.marks.bonk3 > 0.6) { mark('why'); E.comic(clamp(o1.x, V.x - 26, V.x + 6), o1.y - 30, 'WHY ALWAYS ME?', '#ffe14f', 0.95, 1.6); }
        if (me.state === 'normal') { still(me); face(me, o1); }
        if (mate.state === 'normal') { still(mate); face(mate, o1); }
      };
      B.focusFn = () => ({ x: V.x - 10, y: V.y + 4 });
    },

    /* S41 50/50: both go for the loose ball, both punch, both reset... ROUND 2, ROUND 3, FINAL ROUND: double dropkick, double K.O. */
    sc_fifty() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const E = g.effects, b = g.ball;
      const C = { x: 320, y: 208 };
      place(me, C.x - 30, C.y, 0); place(o1, C.x + 30, C.y, PI); place(mate, 150, 290, 0); place(o2, 560, 203, PI);
      b.owner = null; b.x = C.x; b.y = C.y + 1; b.z = 0; b.vx = b.vy = 0;
      B.puppets = new Set([o1, o2, mate]); noAttack(mate, o2); noPick(g, me, o1, mate, o2);
      // the rounds: [start time, kind]
      const rounds = [[0.35, 'light'], [1.25, 'light'], [2.05, 'light'], [2.85, 'hard']];
      const names = ['ROUND 1', 'ROUND 2', 'ROUND 3', 'FINAL ROUND'];
      let r = -1, swung = false, landed = false, swingT = 0;
      B.dir = (dt, g, t) => {
        steer(mate, 150, 290, false); steer(o2, 560, 203, false);
        b.x = C.x; b.y = C.y + 1; b.vx = b.vy = 0;
        if (r < rounds.length - 1 && t >= rounds[r + 1][0] && me.state === 'normal' && o1.state === 'normal') {
          r++; swung = false; landed = false; mark('round' + (r + 1));
          if (r > 0) { solo(E, /ROUND|POW/); E.comic(C.x, C.y - 58, names[r], r === 3 ? '#ff3d5a' : '#ffffff', 0.95, 0.75); }
        }
        if (r < 0) { still(me); still(o1); face(me, o1); face(o1, me); return; }
        const kind = rounds[r][1];
        const reach = kind === 'hard' ? 34 : 24;
        if (!swung) {
          // both charge the ball
          for (const [p, q, side] of [[me, o1, -1], [o1, me, 1]]) if (p.state === 'normal') { steer(p, C.x + side * 8, C.y, true); face(p, q); }
          if (B.t - B.marks['round' + (r + 1)] > 0.12 && U.dist(me, o1) < reach && me.state === 'normal' && o1.state === 'normal' && me.airZ <= 0 && o1.airZ <= 0) {
            swung = true; swingT = B.t; mark('swing' + (r + 1));
            for (const p of [me, o1]) { face(p, p === me ? o1 : me); p.cd.light = p.cd.hard = 0; if (kind === 'hard') Act.hardAttack(g, p); else Act.lightAttack(g, p); }
          }
          return;
        }
        // whoever gets hit first, the other one gets it too: nobody wins a 50/50 (and if both whiff, they still trade)
        if (!landed && (me.state === 'stun' || o1.state === 'stun' || B.t - swingT > (kind === 'hard' ? 0.42 : 0.16))) {
          landed = true; mark('hit' + (r + 1));
          const hard = kind === 'hard';
          for (const [p, dx] of [[me, -1], [o1, 1]]) {
            smack(p, { stun: hard ? 9 : 0.42, kbx: 0, kby: 0, launch: hard ? 230 : 40, source: null, type: hard ? 'hard' : 'light' });
            p.kbx = dx * (hard ? 95 : 120); p.kby = 0; p.koDir = dx;   // the same flight for both
          }
          if (hard) {
            E.impactFrame(); E.flash(0.5); E.shake(8, 0.45); E.comic(C.x, C.y - 40, 'SMASH!!', '#ff3d5a', 1.5, 0.9);
            g.later(0.85, () => { solo(E, /SMASH|ROUND/); E.comic(C.x, C.y - 44, 'DOUBLE K.O.', '#ff3d5a', 1.15, 1.8); mark('ko'); g.sfx('whistle'); });
          } else { E.shake(3 + r, 0.2); E.burst(C.x, C.y, 12, '#fff6a0', 10, 90, 0.35); solo(E, /POW/); E.comic(C.x, C.y - 32, 'POW' + '!'.repeat(r + 1), '#ffcf3f', 1.0 + r * 0.12, 0.55); }
        }
        for (const p of [me, o1]) {
          if (p.lying) { still(p); continue; }
          if (p.state === 'normal' || p.state === 'recover') { still(p); face(p, p === me ? o1 : me); }
          if (p.state === 'stun' && p.airZ <= 0) { p.kbx *= 0.8; p.kby *= 0.8; }
          if (kind === 'hard' && landed && p.state === 'stun' && p.airZ <= 0 && p.airVz <= 0 && B.t - swingT > 0.5) flat(p, p.koDir);
        }
        E.texts = E.texts.filter((x) => x.str !== 'POW!');   // our comic says it once
      };
      B.focusFn = () => ({ x: C.x, y: C.y - 4 });
    },

    /* S42 CATCH THE CHICKEN: the ball is a chicken. Two dive at it and bonk heads, one faceplants, it hops the keeper and scores */
    sc_chicken_run() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const G = g.attackGoal(0), E = g.effects, b = g.ball;
      // the chicken faces where it runs and has little legs (draw patch for this scene only)
      const dB = SFC.Sprites.drawBall;
      let cdir = 1;
      SFC.Sprites.drawBall = function (ctx, bb, alpha = 1) {
        if (bb !== g.ball || bb.skin !== 'chicken') return dB.call(this, ctx, bb, alpha);
        const x = Math.round(bb.x), by = Math.round(bb.y - bb.z - 3);
        if (Math.abs(bb.vx) > 8) cdir = bb.vx < 0 ? -1 : 1;
        const run = Math.hypot(bb.vx, bb.vy) > 10, st = run ? Math.floor(B.t * 18) % 2 : 0;
        const P = SFC.Sprites.px;
        P(ctx, x - 2 + st, by + 3, 1, 3, '#ff8a3f'); P(ctx, x + 1 - st, by + 3, 1, 3, '#ff8a3f');
        ctx.save(); ctx.translate(x, 0); ctx.scale(cdir, 1); ctx.translate(-x, 0);
        dB.call(this, ctx, bb, alpha);
        ctx.restore();
      };
      const S0 = { x: 300, y: 206 };
      place(me, S0.x - 46, S0.y - 4, 0); place(o1, S0.x + 46, S0.y - 4, PI); place(mate, S0.x - 10, S0.y + 70, -PI / 2); place(o2, G.x - 16, G.y, PI);
      b.owner = null; b.x = S0.x; b.y = S0.y; b.z = 0; b.vx = b.vy = 0; b.skin = 'chicken';
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate, me); noPick(g, me, o1, o2, mate);
      // the chicken's run: [time, x, y, hop height]
      const path = [[0.0, S0.x, S0.y, 0], [0.62, S0.x, S0.y, 0], [0.86, S0.x + 4, S0.y - 34, 12], [1.25, S0.x + 40, S0.y - 30, 0], [1.75, S0.x + 92, S0.y - 6, 0],
        [2.05, S0.x + 104, S0.y + 2, 0], [2.4, S0.x + 150, S0.y + 6, 0], [2.95, G.x - 70, G.y + 4, 0], [3.3, G.x - 22, G.y + 2, 24], [3.6, G.x + 10, G.y, 0]];
      const at2 = (t) => {
        let i = 0; while (i < path.length - 2 && t > path[i + 1][0]) i++;
        const [ta, xa, ya] = path[i], [tb, xb, yb, h] = path[i + 1];
        const k = clamp((t - ta) / (tb - ta), 0, 1);
        return { x: lerp(xa, xb, k), y: lerp(ya, yb, k), z: h ? Math.sin(k * PI) * h : Math.abs(Math.sin(t * 22)) * 1.5 };
      };
      let dove = false, bonk = false, mdove = false, kdove = false;
      b.lastTouch = { name: 'CHICKEN', team: 0, id: -1 };
      at(0.12, () => { E.comic(S0.x + 4, S0.y - 22, 'BAWK!', '#ffffff', 1.0, 0.6); g.sfx('whoosh'); });
      B.dir = (dt, g, t) => {
        keepLying(mate);
        const p = at2(t + dt);
        if (B.marks.goal == null) { drive(b, p.x, p.y, dt); b.z = p.z; b.vz = 0; b.lastTouch = { name: 'CHICKEN', team: 0, id: -1 }; }
        // two of them dive at it from both sides... and meet each other
        if (!dove) {
          for (const [q, s] of [[me, -1], [o1, 1]]) { if (t > 0.42) steer(q, S0.x + s * 4, S0.y, true); else if (t > 0.1) { steer(q, S0.x + s * 30, S0.y, false); q.intent.mx *= 0.35; q.intent.my *= 0.35; face(q, b); } else { still(q); face(q, b); } }
          if (t > 0.5 && U.dist(me, o1) < 46) { dove = true; mark('dive'); for (const [q, s] of [[me, 1], [o1, -1]]) { q.cd.skill = 0; Act.skill(g, q, s, 0); } }
        } else if (!bonk && U.dist(me, o1) < 15) {
          bonk = true; mark('bonk');
          for (const [q, s] of [[me, -1], [o1, 1]]) smack(q, { stun: 2.2, kbx: s * 110, kby: 20, launch: 150, source: null, type: 'hard' });
          E.comic(S0.x, S0.y - 40, 'BONK!', '#ffffff', 1.4, 0.8); E.flash(0.3); E.shake(6, 0.3); E.impactFrame();
        } else if (bonk) { for (const q of [me, o1]) if (q.state === 'normal') { still(q); face(q, b); } }
        // the third one: a full-length dive... it stops dead and he slides straight past
        if (!mdove && mate.state === 'normal') {
          if (t > 0.9) steer(mate, b.x - 30, b.y + 4, true); else { still(mate); face(mate, b); }
          if (t > 1.6 && U.dist(mate, b) < 40) { mdove = true; mark('mdive'); mate.cd.skill = 0; Act.skill(g, mate, 1, 0.1); g.later(0.17, () => { flat(mate, 1); E.text(mate.x, mate.y - 26, 'MISS', '#9aa3b5'); }); }
        }
        // the keeper: dives... it hops right over him
        if (o2.state === 'normal' && !kdove) { steer(o2, G.x - 18, clamp(b.y, G.y - 26, G.y + 26), false); face(o2, b); if (t > 3.05) { kdove = true; mark('kdive'); o2.cd.skill = 0; Act.dive(g, o2, 30); } }
        if (kdove && o2.state === 'normal') { still(o2); o2.poseEnd = 99; }
        if (B.marks.hop == null && t > 3.2) { mark('hop'); E.comic(G.x - 20, G.y - 34, 'BAWK!', '#ffe14f', 1.1, 0.7); }
      };
      B.focusFn = () => { if (kdove && o2.state === 'normal') o2.poseEnd = 99; keepLying(mate);
        if (B.marks.goal != null) { B.lib.hush(); if (B.marks.gin == null) { mark('gin'); E.comic(G.x - 26, G.y - 30, 'GOAL?!', '#ffe14f', 1.4, 1.6); g.later(0.5, () => E.comic(G.x - 8, G.y - 8, 'BAWK!', '#ffffff', 1.0, 0.8)); } }
        return { x: Math.min(Math.max(b.x, S0.x + 10), G.x - 70), y: 200 }; };
    },

    /* S43 1% BATTERY: the keeper is asleep on his line (Zzz)... the shot wakes him, he dropkicks it the length of the pitch, back to sleep */
    sc_sleepy_keeper() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const G = g.attackGoal(0), H = g.ownGoal(0), E = g.effects, b = g.ball;
      g.cores.add(o2, 'heavy_boot');
      place(me, G.x - 175, G.y + 8, 0); place(o1, G.x - 260, G.y - 70, PI); place(mate, H.x + 18, H.y, 0); place(o2, G.x - 20, G.y - 6, PI);
      give(g, me);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, mate, me); o2.cd.light = 99; noPick(g, o1, o2, mate);
      topple(o2, 1, 0.5, 0.04);
      let shot = false, woke = false, kicked = false, slept = false, zt = 0.2, zk = 0, T0 = 0, x0 = 0, y0 = 0;
      const zzz = () => { if (B.t >= zt) { zt = B.t + 0.42; zk++; solo(E, /^z/i); E.comic(o2.x + 8 + (zk % 2) * 3, o2.y - 18, zk % 3 === 0 ? 'Zzz' : zk % 3 === 1 ? 'z' : 'zZ', '#c7ccd6', 0.7 + (zk % 3) * 0.1, 0.5); } };
      B.dir = (dt, g, t) => {
        keepLying(o2);
        if (o1.state === 'normal') steer(o1, G.x - 260, G.y - 70, false);
        if (!woke || slept) zzz();
        if (!shot) {
          me.intent.mx = 0.48; me.intent.my = -0.03; me.intent.sprint = false;
          if (t > 1.45) { face(me, { x: G.x, y: G.y - 4 }); Act.shoot(g, me, 0.5, 0); shot = true; mark('shot'); T0 = t; x0 = b.x; y0 = b.y; noPick(g, me); }
          if (mate.state === 'normal') { steer(mate, H.x + 18, H.y + Math.sin(t * 2) * 6, false); face(mate, me); }
          return;
        }
        if (me.state === 'normal') { still(me); face(me, b); }
        // the shot... at a sleeping keeper
        if (!kicked) {
          const kk = Math.min(1, (t - T0 + dt) / 0.42);
          drive(b, lerp(x0, o2.x - 14, kk), lerp(y0, o2.y + 2, kk), dt); b.z = 3; b.vz = 0;
          if (!woke && t - T0 > 0.08) {
            woke = true; mark('wake'); getUp(o2); o2.facing = PI;
            solo(E, /^z/i); E.comic(o2.x, o2.y - 30, '!', '#ff3d5a', 1.4, 0.5); E.burst(o2.x, o2.y, 8, '#ffffff', 10, 80, 0.3);
            o2.glow('#9dff3d', 0.9); E.wave(o2.x, o2.y, 26, '#9dff3d', 0.35, 2); E.bolt(o2.x - 6, o2.y - 40, o2.x, o2.y - 10, '#d8ffb0', 0.3);
            o2.cd.hard = 0; face(o2, b); Act.hardAttack(g, o2); g.sfx('zap');
          }
          if (woke && o2.state === 'kick' && U.dist(o2, b) < 22) {
            kicked = true; mark('kick'); T0 = t; x0 = b.x; y0 = b.y;
            E.impactFrame(); E.flash(0.5); E.shake(8, 0.4); E.comic(b.x - 6, b.y - 30, 'BOOM!', '#ff6a1f', 1.5, 0.8); E.speedLines(0.5, 320, 180, '#ffffff');
            E.burst(b.x, b.y, 4, '#ffffff', 16, 140, 0.4); g.sfx('kick', 1); g.sfx('hit', 'hard');
          }
          return;
        }
        // a laser the whole length of the pitch
        if (B.marks.goal == null) {
          const kk = Math.min(1, (t - T0 + dt) / 0.95);
          drive(b, lerp(x0, H.x - 8, kk), lerp(y0, H.y - 8, kk), dt); b.z = 4 + Math.sin(kk * PI) * 10; b.vz = 0; b.fx.thunder = true;
          if (kk > 0.82 && B.marks.mdive == null && mate.state === 'normal') { mark('mdive'); Act.dive(g, mate, 40); }
        }
        // ...and straight back to sleep
        if (!slept && o2.state === 'normal' && B.t - B.marks.kick > 0.45) { slept = true; mark('sleep'); still(o2); o2.facing = PI; topple(o2, 1, 3, 0.12); zt = B.t + 0.25; }
      };
      B.focusFn = () => {
        if (B.marks.goal != null) { B.lib.hush(); if (B.marks.gin == null) { mark('gin'); E.comic(H.x + 30, H.y - 34, 'GOAL!', '#ff3d5a', 1.3, 1.2); } }
        if (slept) { keepLying(o2); zzz(); } return !shot ? { x: me.x + 70, y: G.y } : !kicked ? { x: G.x - 70, y: G.y } : b.owner || B.marks.goal == null ? g.ball : g.ball; };
    },

    /* S44 TIME STOP: a dropkick and a diving keeper inches from him... time stops; he walks it in; time resumes: GOAL out of nowhere */
    sc_time_stop() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const G = g.attackGoal(0), E = g.effects, b = g.ball;
      const P0 = { x: G.x - 92, y: G.y + 8 };
      place(me, P0.x, P0.y, 0); place(o1, G.x - 26, G.y - 28, PI); place(o2, G.x - 40, G.y + 56, PI); place(mate, 200, 270, 0);
      give(g, me);
      B.puppets = new Set([o1, o2, mate]); noAttack(o2, mate); o1.cd.light = 99; noPick(g, o1, o2, mate);
      o1.kickHits.add(me.id);
      const cg = g.checkGoal.bind(g), tc = g.tickClock.bind(g);
      let frozen = false, resumed = false, snaps = null, step = 0, released = false;
      g.checkGoal = () => (frozen ? false : cg());
      g.tickClock = (dt) => { if (!frozen) tc(dt); };
      const KEYS = ['x', 'y', 'facing', 'state', 'stateT', 'atkType', 'atkT', 'anim', 'vx', 'vy', 'kbx', 'kby', 'airZ', 'airVz', 'dashX', 'dashY', 'poseEnd', 'sprinting', 'flash'];
      const snap = (q) => { const o = {}; for (const k of KEYS) o[k] = q[k]; return o; };
      // his stroll while the world is frozen: up and round the top of the defender, to the line, tap it in, lean on the post
      const route = [[P0.x + 4, P0.y - 40], [G.x - 30, G.y - 44], [G.x - 13, G.y - 12]];
      const after = [[G.x - 16, G.y - 50]];
      const walk = (x, y) => { steer(me, x, y, false); if (Math.hypot(x - me.x, y - me.y) < 3) { step++; return true; } return false; };
      B.dir = (dt, g, t) => {
        if (frozen) {
          for (const [q, s] of snaps) { Object.assign(q, s); still(q); q.kickHits && q.kickHits.add(me.id); }
          if (me.state === 'normal') {
            if (step < route.length) { if (walk(...route[step])) mark('step' + step); }
            else if (!released) { released = true; mark('tap'); face(me, { x: G.x + 10, y: G.y - 6 }); Act.startAttack(me, 'shoot'); b.kick(me, 48, 4, 0); b.noPickup.set(me.id, 99); g.sfx('pass'); }
            else if (step - route.length < after.length) { if (B.t - B.marks.tap < 0.3) still(me); else if (walk(...after[step - route.length])) mark('pose'); }
            else { still(me); me.facing = PI / 2; if (B.t - B.marks.pose > 0.35) { resumed = true; frozen = false; mark('resume'); E.tint('#ffffff', 0.12, 0.3); E.wave(me.x, me.y, 160, '#ffffff', 0.5, 3); g.sfx('zap'); } }
          }
          if (!b.owner) { b.vz = 0; b.z = 0; }
          return;
        }
        if (o1.state === 'kick') o1.kickHits.add(me.id);   // (hardRelease clears the list) the boot never lands
        if (resumed) { still(me); me.facing = PI / 2; return; }
        // the trap closes: a dropkick from the front, the keeper flying in from below
        if (g.ball.owner === me) { if (B.marks.windup == null) { me.intent.mx = 0.22; me.intent.my = 0; } else still(me); }
        if (o1.state === 'normal') {
          steer(o1, me.x + 30, me.y - 8, true); face(o1, me);
          if (t > 0.3 && U.dist(o1, me) < 52) { face(o1, me); o1.vx = o1.vy = 0; Act.hardAttack(g, o1); mark('windup'); }
        } else if (o1.state === 'windup') { still(o1); face(o1, me); o1.vx *= 0.5; o1.vy *= 0.5; }
        if (o2.state === 'normal') { steer(o2, me.x + 10, me.y + 40, true); face(o2, me); }
        if (o1.state === 'kick' && B.marks.kick0 == null) { mark('kick0'); if (o2.state === 'normal') { o2.facing = PI; Act.dive(g, o2, -60); mark('dive'); } }
        if (B.marks.kick0 != null && B.t - B.marks.kick0 >= 0.03 && !frozen) {
          frozen = true; mark('stop');
          snaps = [[o1, snap(o1)], [o2, snap(o2)], [mate, snap(mate)]];
          E.impactFrame(0.1); E.comic(me.x, me.y - 36, 'TIME STOP!', '#cdb8ff', 1.25, 1.3); g.sfx('upgrade');
          E.tint('#7a68b8', 99, 0.38); E.wave(me.x, me.y, 160, '#cdb8ff', 0.6, 3);
        }
      };
      B.focusFn = () => {
        if (B.marks.goal != null) {
          B.lib.hush();
          if (B.marks.gin == null) {
            mark('gin'); E.comic(G.x - 24, G.y - 30, 'GOAL!', '#ffe14f', 1.4, 1.4);
            g.later(0.45, () => { E.text(o1.x, o1.y - 28, '?', '#ffffff'); E.text(o2.x + 4, o2.y - 24, '??', '#ffffff'); });
            g.later(0.9, () => E.comic(me.x + 6, me.y - 30, '♪', '#ffffff', 0.8, 1.0));
          }
          me.facing = PI / 2;
        }
        return { x: G.x - 56, y: G.y - 6 };
      };
    },

    /* S45 BOWLING PART 2: strike... no, one pin stays up. He sprints in and dropkicks the last pin into the net. SPARE. */
    sc_spare() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const G = g.attackGoal(0), E = g.effects, b = g.ball, F = g.field;
      g.cores.add(me, 'heavy_boot');
      const pins = [o1, o2, ...extra(g, 1, 4)];
      const spots = [[0, 0], [16, -9], [16, 9], [32, -18], [32, 0], [32, 18]];
      const LAST = 3;   // the back-left pin survives
      const px0 = G.x - 104;
      pins.forEach((q, k) => place(q, px0 + spots[k][0], G.y + spots[k][1], PI));
      place(me, G.x - 205, G.y + 2, 0); place(mate, 150, 280, 0);
      give(g, me);
      B.puppets = new Set([...pins, mate]); noAttack(...pins, mate); noPick(g, ...pins, mate);
      const pin = pins[LAST];
      // the last pin may fly through the goal mouth into the net
      const up = pin.update.bind(pin); let netOK = false;
      pin.update = (dt) => {
        const x = pin.x, kb = pin.kbx; up(dt);
        if (!netOK || Math.abs(pin.y - G.y) > F.goalWidth / 2 - 7 || kb < 40) return;
        const want = x + kb * dt;
        if (want > pin.x) { pin.x = Math.min(G.x + 10, want); pin.kbx = kb; if (pin.x >= G.x + 9.9 && B.marks.net == null) { mark('net'); pin.kbx = 0; } }
      };
      let shot = false, n = 0, kicked = false, wob = 0;
      const down = new Set();
      B.dir = (dt, g, t) => {
        steer(mate, 150, 280, false);
        pins.forEach((q, k) => { if (!down.has(q) && q.state === 'normal' && !(k === LAST && wob)) { steer(q, px0 + spots[k][0], G.y + spots[k][1], false); q.facing = PI; } });
        for (const q of down) if (!q.lying && q.state === 'stun' && q.airZ <= 0 && q.airVz <= 0 && B.t - q.downT > 0.25) { q.hitImmune = 0; flat(q, q.fallDir || 1); }
        keepLying(...pins);
        if (B.marks.net != null) { pin.x = G.x + 10; pin.kbx = 0; }
        if (!shot) { me.intent.mx = 0.42; me.intent.my = 0; if (t > 0.6) { face(me, G); Act.shoot(g, me, 0.6, 0); b.skin = 'bowling'; b.z = 0; b.vz = 0; shot = true; mark('shot'); noPick(g, me); } return; }
        const knock = (q, fx, fy) => {
          if (q === pin) { if (!wob) { wob = B.t; mark('wobble'); } return; }
          down.add(q); n++; q.downT = B.t;
          const a = Math.atan2(q.y - fy, q.x - fx) * 0.7 + (Math.random() - 0.5) * 0.3; q.fallDir = Math.cos(a) >= 0 ? 1 : -1;
          smack(q, { stun: 4, kbx: 30 + Math.cos(a) * 95, kby: Math.sin(a) * 120 + 30, launch: 150 + Math.random() * 70, source: me, type: 'hard' });
          if (n === 1) mark('pin1');
          for (const r of pins) if (!down.has(r) && Math.hypot(r.x - q.x, r.y - q.y) < 22) g.later(0.05 + Math.random() * 0.05, () => { if (!down.has(r)) knock(r, q.x, q.y); });
        };
        // the ball: straight through the middle... and it drifts low, past the last pin
        if (B.marks.pin1 == null || b.x < G.x - 50) {
          const ty = b.x < px0 ? G.y + 2 : G.y + 34;
          b.vx = Math.max(b.vx, 150); b.vy = (ty - b.y) * 4; b.z = 0; b.vz = 0; b.owner = null;
        } else { b.vx *= 0.9; b.vy *= 0.9; }
        for (const q of pins) if (!down.has(q) && q !== pin && Math.hypot(b.x - q.x, b.y - q.y) < 13 + q.radius) knock(q, b.x, b.y);
        // the last pin: wobbles... wobbles... stays up
        if (wob && !kicked && pin.state === 'normal') {
          const w = B.t - wob, a = Math.max(0, 1 - w / 0.75);
          pin.x = px0 + spots[LAST][0] + Math.sin(w * 20) * 3.2 * a; pin.y = G.y + spots[LAST][1]; pin.vx = pin.vy = 0; still(pin); pin.facing = PI;
          if (w > 0.85 && B.marks.stay == null) { mark('stay'); E.comic(pin.x, pin.y - 28, '...', '#ffffff', 1.0, 0.8); }
        }
        if (kicked && pin.state === 'stun' && B.marks.kick == null) {
          mark('kick'); netOK = true; pin.kbx = 330; pin.kby = (G.y - pin.y) * 1.2; pin.airVz = Math.max(pin.airVz, 160);
          E.flash(0.4); E.shake(6, 0.35); E.impactFrame();
          g.later(0.35, () => { E.comic(G.x - 40, G.y - 46, 'SPARE!', '#ffe14f', 1.7, 1.4); E.burst(G.x - 4, G.y, 10, '#ffe14f', 20, 120, 0.7); g.sfx('wall'); mark('spare'); });
        }
        // the bowler: not having it
        if (me.state !== 'normal') return;
        if (B.marks.stay == null) { still(me); face(me, pin); return; }
        if (!kicked) {
          steer(me, pin.x - 26, pin.y, true);
          if (U.dist(me, pin) < 36) { face(me, pin); me.cd.hard = 0; if (Act.hardAttack(g, me)) { kicked = true; mark('windup'); } }
          return;
        }
        still(me);
      };
      B.focusFn = () => (!shot ? { x: me.x + 60, y: G.y } : { x: Math.max(Math.min(b.x, G.x - 80), me.x + 30), y: G.y });
    },

    /* S46 OSCAR WORTHY: the tiniest touch, a five-roll dive, everyone gathers round... he gets up and scores */
    sc_oscar() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const G = g.attackGoal(0), E = g.effects, b = g.ball;
      place(me, G.x - 210, G.y + 6, 0); place(o1, G.x - 232, G.y - 14, 0); place(o2, G.x - 16, G.y, PI); place(mate, 170, 280, 0);
      give(g, me);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate, me); noPick(g, o1, o2, mate);
      let touched = false, rolling = false, lying = false, up = false, shot = false, bx0 = 0, by0 = 0;
      B.dir = (dt, g, t) => {
        steer(mate, 170, 280, false);
        keepLying(me);
        if (!touched) {
          if (g.ball.owner === me) { me.intent.mx = 0.5; me.intent.my = 0; }
          steer(o1, me.x - 8, me.y - 11, t > 0.3);
          if (o2.state === 'normal') { steer(o2, G.x - 16, G.y + Math.sin(t * 2) * 6, false); face(o2, me); }
          if (t > 0.85 && U.dist(o1, me) < 16) {
            touched = true; rolling = true; mark('touch');
            E.comic(o1.x + 8, o1.y - 24, 'tap', '#ffffff', 0.6, 0.6);
            g.looseBall(me, 1, 0.1, 55); noPick(g, me); bx0 = b.x; by0 = b.y;
            smack(me, { stun: 9, kbx: 150, kby: 22, launch: 30, source: o1, type: 'light' });
            g.later(0.15, () => E.comic(me.x, me.y - 34, 'AAAAH!!', '#ffffff', 1.1, 0.9));
            g.later(0.8, () => { solo(E, /AAAA/); E.comic(me.x, me.y - 34, 'MY LEG!!', '#ff3d5a', 1.1, 0.8); });
          }
          return;
        }
        // the roll: low to the ground, round and round
        if (rolling) {
          const s = B.t - B.marks.touch;
          me.airZ = 1.2 + Math.abs(Math.sin(s * 9)) * 2.5; me.airVz = 0; me.kbx = Math.max(25, 150 - s * 85); me.kby = 18 - s * 10; me.stateT = 9;
          if (s > 1.35) { rolling = false; lying = true; mark('lie'); me.kbx = me.kby = 0; flat(me, 1, false); }
        }
        if (!b.owner && !up) { const kb = Math.min(1, (B.t - B.marks.touch + dt) / 1.5); drive(b, lerp(bx0, G.x - 62, ease(kb, 1.8)), lerp(by0, G.y + 12, kb), dt); b.z = 0; b.vz = 0; }
        // everyone stops: the defender can't believe it, the keeper wanders out to check on him
        const s2 = B.t - B.marks.touch;
        if (o1.state === 'normal') { if (s2 > 1.62 && B.marks.huh == null) { mark('huh'); E.comic(o1.x, o1.y - 30, '?!', '#ffe14f', 1.1, 0.9); } if (s2 > 1.0 && !up) steer(o1, me.x - 18, me.y - 16, false); else { still(o1); face(o1, me); } }
        if (o2.state === 'normal' && !up) { if (s2 > 1.0) steer(o2, me.x + 20, me.y - 12, false); else { still(o2); face(o2, me); } if (U.dist(o2, me) < 24) { still(o2); face(o2, me); } }
        if (up && o2.state === 'normal') { still(o2); face(o2, b); }
        // miraculous recovery
        if (lying && !up && B.t - B.marks.lie > 0.95) { up = true; mark('up'); getUp(me); E.comic(me.x, me.y - 30, '!', '#9dff3d', 1.2, 0.5); b.noPickup.set(me.id, 0); }
        if (up && me.state === 'normal' && !shot) {
          if (b.owner !== me) { steer(me, b.x, b.y, true); return; }
          mark('own'); face(me, G); Act.shoot(g, me, 0.7, -0.2); shot = true; mark('shot');
          E.comic(o1.x - 8, o1.y - 20, 'HEY!', '#ff3d5a', 0.9, 0.8);
        }
        if (shot && me.state === 'normal') still(me);
      };
      B.focusFn = () => (B.marks.goal != null && (B.lib.hush(), B.marks.gin == null) && (mark('gin'), E.comic(G.x - 22, G.y - 48, 'GOAL!', '#ffe14f', 1.3, 1.4)), B.marks.shot != null ? { x: Math.max(b.x, G.x - 80), y: G.y } : B.marks.touch == null ? { x: me.x + 30, y: me.y - 6 } : { x: Math.min(me.x + 20, G.x - 70), y: me.y - 6 });
    },

    /* S47 PERFECT CROSS: a looping cross from the wing, a bicycle kick into the top corner... and he lands flat on his back */
    sc_bicycle() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const G = g.attackGoal(0), E = g.effects, b = g.ball;
      // the flip: draw him rotated (no stun stars, kicking leg out) while flipA is set; lieK 0..1 = how flat on the ground
      const R = SFC.Renderer, air0 = R.airborne;
      let flipA = null, lieK = 0;
      R.airborne = function (ctx, p, gg) {
        if (p !== me || flipA == null) return air0.call(this, ctx, p, gg);
        const S = SFC.Sprites;
        const k = Math.max(0.35, 1 - p.airZ / 70);
        S.ellipse(ctx, Math.round(p.x), Math.round(p.y) + 1, (6 + lieK * 3) * k, 2.5 * k, 'rgba(0,0,0,0.38)');
        const cy = p.y - p.airZ - lerp(8, 3, lieK);
        ctx.save(); ctx.translate(Math.round(p.x), Math.round(cy)); ctx.rotate(flipA);
        S.drawPlayer(ctx, Object.assign({}, p, { x: 0, y: 8, keeper: false, state: 'normal', vx: 0, vy: 0 }), gg, 0.999);
        ctx.restore();
        return Math.round(cy) - 8;
      };
      // no gravity on him while the scene flies him
      const ua = me.updateAir.bind(me); me.updateAir = (dt) => { if (flipA == null) ua(dt); };
      const K = { x: G.x - 80, y: G.y - 2 };   // where it all happens
      place(me, K.x, K.y, PI); place(mate, G.x - 62, G.y + 96, -PI / 2); place(o1, K.x + 26, K.y + 30, PI); place(o2, G.x - 16, G.y + 6, PI);
      give(g, mate);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate, me); noPick(g, o1, o2, mate, me);
      const T_CROSS = 0.55, FLY = 1.0, JUMP = 0.42, H = 20, LAND = 0.36;
      let crossed = false, struck = false, T0 = 0, x0 = 0, y0 = 0, TJ = null, TS = null, landed = false;
      // his whole flight, from the scene clock (runs in B.dir and in focusFn, so it carries on through the GOAL pause)
      const pose = () => {
        if (TJ == null) return;
        me.state = 'recover'; me.stateT = 9; me.vx = me.vy = 0; me.kbx = me.kby = 0; me.airVz = 0; me.facing = PI; me.atkType = 'hard';
        if (TS == null) {
          const j = Math.min(1, (B.t - TJ) / JUMP);
          me.airZ = Math.max(0.5, Math.sin(j * PI * 0.5) * H); flipA = ease(j, 1.6) * 2.45; me.atkT = 0.3 + j * 0.06; lieK = 0;
          return;
        }
        const s = Math.min(1, (B.t - TS) / LAND);
        flipA = lerp(2.45, 1.62, ease(s, 1.5)); me.atkT = s < 0.4 ? 0.38 + s * 0.2 : 0.7; lieK = s;
        me.airZ = Math.max(0.5, H * (1 - s * s));
        if (s >= 1 && !landed) {
          landed = true; mark('land');
          E.comic(me.x - 2, me.y - 24, 'OOF', '#ffffff', 1.0, 0.9); E.shake(4, 0.2); E.burst(me.x, me.y, 0, '#8a7f70', 14, 70, 0.5); g.sfx('land');
        }
      };
      B.dir = (dt, g, t) => {
        if (o1.state === 'normal') { steer(o1, K.x + 26, K.y + 30, false); face(o1, b); }
        if (!struck && o2.state === 'normal') { steer(o2, G.x - 16, G.y + 6, false); face(o2, b); }
        pose();
        if (!crossed) {
          still(me); me.facing = PI; still(mate); face(mate, K);
          if (t > T_CROSS) { crossed = true; mark('cross'); g.looseBall(mate, 0, -1, 0); x0 = b.x; y0 = b.y; T0 = t; Act.startAttack(mate, 'shoot'); g.sfx('kick', 0.6); }
          return;
        }
        if (mate.state === 'normal') { still(mate); face(mate, b); }
        const s = t - T0;
        if (!struck) {
          // the cross: a big lazy loop onto his boot
          const kk = Math.min(1, (s + dt) / FLY);
          drive(b, lerp(x0, K.x + 3, kk), lerp(y0, K.y, kk), dt); b.z = lerp(0, H + 12, kk) + Math.sin(kk * PI) * 70; b.vz = 0;
          if (TJ == null && s > FLY - JUMP) { TJ = B.t; mark('jump'); g.sfx('whoosh'); E.burst(me.x, me.y, 0, '#8a7f70', 8, 60); }
          if (kk >= 1) {
            struck = true; TS = B.t; mark('strike'); T0 = t; x0 = b.x; y0 = b.y;
            E.impactFrame(); E.flash(0.5); E.shake(7, 0.4); E.comic(K.x + 8, K.y - 54, 'SCISSOR KICK!', '#b46bff', 0.95, 0.9);
            E.wave(b.x, b.y - b.z, 20, '#ffffff', 0.35, 2); E.burst(b.x, b.y, b.z, '#ffffff', 14, 140, 0.4); g.sfx('kick', 1);
          }
          return;
        }
        // the volley: back over his own head into the top corner
        if (B.marks.goal == null) {
          const kk = Math.min(1, (t - T0 + dt) / 0.3);
          drive(b, lerp(x0, G.x + 8, kk), lerp(y0, G.y - 30, kk), dt); b.z = lerp(H + 12, 18, kk); b.vz = 0; b.fx.thunder = true;
          if (B.marks.kdive == null && t - T0 > 0.07) { mark('kdive'); Act.dive(g, o2, -40); }
        }
      };
      B.focusFn = () => {
        pose();
        if (B.marks.goal != null) { B.lib.hush(); b.vx *= 0.7; b.vy *= 0.7; }
        return { x: K.x + 24, y: K.y - 6 };
      };
    },

    /* S48 HE WAS OPEN: wide open, the pass is on its way... a defender flies in from off-screen, flying kick, gone */
    sc_was_open() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const G = g.attackGoal(0), E = g.effects, b = g.ball;
      const M = { x: G.x - 120, y: G.y + 34 };
      place(me, M.x, M.y, PI); place(mate, M.x - 150, M.y - 4, 0); place(o1, M.x - 240, M.y - 96, 0); place(o2, G.x - 16, G.y, PI);
      give(g, mate);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate, me); noPick(g, o1, o2, mate, me);
      const T_PASS = 0.95, FLY = 0.95, LEAD = 0.5;
      let passed = false, flying = false, hit = false, T0 = 0, x0 = 0, y0 = 0, ox0 = 0, oy0 = 0, TF = 0;
      at(0.15, () => E.comic(me.x, me.y - 28, "I'M OPEN!", '#ffffff', 0.9, 0.6));
      at(0.6, () => E.comic(me.x, me.y - 28, "I'M OPEN!!", '#ffffff', 1.05, 0.6));
      B.dir = (dt, g, t) => {
        if (o2.state === 'normal') { steer(o2, G.x - 16, G.y, false); face(o2, b); }
        if (!passed) {
          still(me); me.facing = t % 0.5 < 0.25 ? PI : PI * 0.75; still(mate); face(mate, me); still(o1); o1.facing = 0.3;
          if (t > T_PASS) { passed = true; mark('pass'); g.looseBall(mate, 1, 0, 0); x0 = b.x; y0 = b.y; T0 = t; Act.startAttack(mate, 'shoot'); g.sfx('pass'); }
          return;
        }
        const s = t - T0;
        if (!hit) {
          const kk = Math.min(1, (s + dt) / FLY);
          drive(b, lerp(x0, M.x - 9, kk), lerp(y0, M.y, kk), dt); b.z = 0; b.vz = 0;
          if (me.state === 'normal') { still(me); face(me, b); }
          // from way over there: a flying kick
          if (!flying && s > FLY - LEAD) { flying = true; TF = t; mark('fly'); ox0 = o1.x; oy0 = o1.y; E.speedLines(0.6, M.x, M.y - 10, '#ffffff'); g.sfx('whoosh'); E.burst(o1.x, o1.y, 0, '#8a7f70', 10, 70); }
          if (flying) {
            const j = Math.min(1, (t - TF + dt) / LEAD);
            const tx = M.x - 10, ty = M.y - 3;
            o1.state = 'recover'; o1.stateT = 9; o1.atkType = 'hard'; o1.atkT = 0.3 + 0.07;
            o1.x = lerp(ox0, tx, j); o1.y = lerp(oy0, ty, j); o1.vx = o1.vy = 0; o1.airZ = 4 + Math.sin(j * PI) * 10; o1.airVz = 0; o1.facing = Math.atan2(ty - oy0, tx - ox0);
            if (j >= 1) {
              hit = true; mark('hit');
              o1.airZ = 2; o1.state = 'normal'; o1.atkType = null;
              const d = U.norm(me.x - ox0, me.y - oy0);
              smack(me, { stun: 3, kbx: d.x * 170, kby: d.y * 120, launch: 330, source: o1, type: 'hard' });
              E.comic(me.x, me.y - 40, 'SMASH!!', '#ff3d5a', 1.5, 0.9); E.impactFrame(); E.flash(0.5); E.shake(9, 0.45);
              E.burst(me.x, me.y, 10, '#ffffff', 14, 150, 0.4); E.burst(me.x, me.y, 10, '#ff6a3d', 10, 120, 0.5); g.sfx('hit', 'hard');
              b.owner = null; b.vx = 20; b.vy = -10; b.vz = 0; b.noPickup.set(o1.id, 0);
            }
          }
          return;
        }
        // he just takes the ball and jogs off
        if (o1.state === 'normal') { if (b.owner !== o1) steer(o1, b.x, b.y, false); else { o1.intent.mx = -0.4; o1.intent.my = -0.25; o1.intent.sprint = false; } }
        if (mate.state === 'normal') { still(mate); face(mate, me); }
      };
      B.focusFn = () => ({ x: M.x + 14, y: M.y - 18 });
    },
  });
})();
