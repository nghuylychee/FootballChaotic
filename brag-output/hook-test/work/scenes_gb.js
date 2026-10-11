/* gb scenes (G24-G36, one Core per clip): added to BRAG.SCENES after scenes.js loads (capture.py injects every scenes_*.js). */
(function () {
  const { U, Act, PI, app, place, give, face, steer, still, mark, match, cast, ult, at, noAttack, extra, t0focus } = BRAG.lib;
  const B = BRAG;
  Object.assign(B.SCENES, {
    /* G24 GIANT FIST: the carrier walks at him, one punch 4x his size, he flies diagonally across the pitch into the top wall */
    gb_giant_fist() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(me, 'giant_fist'); me.res.rage = 5;
      const A = -PI / 4;   // punch direction: up-right
      place(me, 300, 246, A); place(o1, 340, 206, A + PI); place(mate, 170, 290, 0); place(o2, 540, 180, PI);
      give(g, o1);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate);
      let punched = false;
      B.dir = (dt, g, t) => {
        steer(mate, 170, 290, false); steer(o2, 540, 180, false);
        if (!punched) {
          if (o1.state === 'normal') { o1.intent.mx = -0.22; o1.intent.my = 0.22; o1.intent.sprint = false; }
          still(me); me.facing = A; me.res.rage = 5; me.cd.light = 0;
          if (t > 0.45 && U.dist(me, o1) < 36 && Act.lightAttack(g, me)) { punched = true; mark('punch'); }
          return;
        }
        g.ball.noPickup.set(o1.id, 99);
        if (o1.state === 'stun' && B.marks.fly == null) { mark('fly'); o1.kbx = 340; o1.kby = -340; o1.airVz = Math.max(o1.airVz, 240); }
        if (B.marks.fly != null && B.marks.bonk == null && o1.y <= g.field.y + o1.radius + 1) { mark('bonk'); o1.kbx *= 0.15; }   // the wall caught him
        if (me.state !== 'normal') return;
        if (g.ball.owner === me) { if (B.marks.bonk != null && B.t - B.marks.bonk > 0.5) steer(me, o1.x - 30, o1.y + 34, false); else { still(me); me.facing = A; } }
        else if (!g.ball.owner) steer(me, g.ball.x, g.ball.y, false); else still(me);
      };
      B.focusFn = () => (B.marks.fly == null ? { x: 326, y: 222 } : { x: U.clamp(o1.x, 326, 420), y: U.clamp(o1.y + 30, 150, 222) });
    },

    /* G25 WALL SLAM: dropkick the carrier into the top wall, CRACK, the ball bounces back to him, he scores */
    gb_wall_slam() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(me, 'heavy_boot'); g.cores.add(me, 'wall_slam');
      const G = g.attackGoal(0);
      place(me, 455, 186, -PI / 2); place(o1, 460, 140, PI / 2); place(mate, 300, 280, 0); place(o2, G.x - 22, G.y, PI);
      give(g, o1);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate);
      let kicked = false, shot = false, stash = 0, back = false;
      B.dir = (dt, g, t) => {
        steer(mate, 300, 280, false);
        const b = g.ball;
        for (const q of [o1, o2, mate]) b.noPickup.set(q.id, 99);
        if (!shot) { steer(o2, G.x - 22, G.y + Math.sin(t * 2) * 6, false); face(o2, b); }
        else steer(o2, G.x - 26, G.y + 45, true);
        if (!kicked) {
          if (o1.state === 'normal') { o1.intent.mx = -0.25; o1.intent.my = 0; o1.intent.sprint = false; }
          steer(me, o1.x - 2, o1.y + 30, false);
          if (t > 0.4 && U.dist(me, o1) < 40) { face(me, { x: o1.x + 3, y: o1.y - 10 }); kicked = Act.hardAttack(g, me); if (kicked) mark('kick'); }
          return;
        }
        if (o1.state === 'stun' && B.marks.hit == null) {
          mark('hit');
          // the loose ball rides with him into the wall (so the Core can bounce it back)
          if (!b.owner) { b.vx = o1.kbx * 0.15; b.vy = Math.min(-150, o1.kby * 0.6); }
        }
        if (B.marks.hit != null && B.marks.bonk == null && o1.y <= g.field.y + o1.radius + 1) mark('bonk');
        // the ball smashes into the wall with him and the Core bounces it straight back to his feet
        if (B.marks.bonk != null && !back) {
          if (!stash) { stash = 1; b.vx = 0; b.vy = -230; mark('up'); }
          else if (b.vy > 0) { const d = U.norm(me.x - b.x, me.y + 3 - b.y), sp = Math.max(140, Math.hypot(b.vx, b.vy)); b.vx = d.x * sp; b.vy = d.y * sp; b.lastKickTeam = -1; b.kind = null; b.noPickup.set(me.id, 0); back = true; mark('back'); }
        }
        if (me.state !== 'normal' || shot) { if (shot) still(me); return; }
        if (b.owner !== me) { if (B.marks.bonk != null && !b.owner) steer(me, b.x, b.y, false); else still(me); return; }
        mark('own');
        if (B.t - B.marks.own < 0.35) { still(me); return; }
        if (G.x - me.x > 70 || Math.abs(me.y - G.y) > 60) { steer(me, G.x - 60, G.y - 30, true); return; }
        face(me, G); Act.shoot(g, me, 0.85, -0.4); shot = true; mark('shot');
      };
      B.focusFn = () => (shot ? g.ball : B.marks.own != null ? me : { x: 462, y: 150 });
    },

    /* G26 GROUND SLAM: five of them escort the ball, he leaps into the middle, SLAM, all five fly */
    gb_ground_slam() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(me, 'ground_slam');
      const ex = extra(g, 1, 3);
      const pack = [o1, o2, ...ex];
      const C = { x: 400, y: 205 };
      const spots = [[0, 0], [16, -16], [16, 16], [-12, -20], [-12, 20]];
      pack.forEach((q, k) => place(q, C.x + spots[k][0], C.y + spots[k][1], PI));
      place(me, 300, 205, 0); place(mate, 180, 280, 0);
      give(g, o1);
      B.puppets = new Set([...pack, mate]); noAttack(...pack, mate);
      let kicked = false;
      B.dir = (dt, g, t) => {
        steer(mate, 180, 280, false);
        const b = g.ball;
        if (B.marks.land == null) pack.forEach((q, k) => { if (q.state === 'normal') { steer(q, C.x - t * 14 + spots[k][0], C.y + spots[k][1], false); } });
        else for (const q of pack) { if (q.state === 'normal') still(q); b.noPickup.set(q.id, 99); }
        if (!kicked) { still(me); face(me, o1); if (t > 0.35) { kicked = Act.hardAttack(g, me); if (kicked) mark('windup'); } return; }
        if (me.state === 'slam') mark('jump');
        if (B.marks.jump != null && B.marks.land == null && me.state !== 'slam') mark('land');
        if (B.marks.land == null || me.state !== 'normal') return;
        if (b.owner !== me) { if (!b.owner) steer(me, b.x, b.y, false); else still(me); } else still(me);
      };
      B.focusFn = () => ({ x: 372, y: 205 });
    },

    /* G27 PERFECT DODGE: the defender dropkicks, he dodges through it, the whole pitch slows down, he strolls past and scores */
    gb_dodge() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(me, 'witch_time'); g.cores.add(o1, 'heavy_boot');
      const G = g.attackGoal(0);
      place(me, 372, 210, 0); place(o1, 440, 206, PI); place(mate, 250, 270, 0); place(o2, G.x - 22, G.y, PI);
      give(g, me);
      B.puppets = new Set([o1, o2, mate]); noAttack(o2, mate); o1.cd.light = 99; o1.cd.hard = 0;
      let kicked = false, dodged = false, shot = false;
      B.dir = (dt, g, t) => {
        steer(mate, 250, 270, false);
        const b = g.ball;
        if (shot) { steer(o2, G.x - 24, G.y + 46, true); b.noPickup.set(o2.id, 99); }
        else { steer(o2, G.x - 22, G.y + Math.sin(t * 2) * 6, false); face(o2, b); }
        if (!kicked) {
          if (o1.state === 'normal') { steer(o1, me.x + 30, me.y, false); face(o1, me); }
          if (t > 0.35 && U.dist(me, o1) < 52) { face(o1, me); kicked = Act.hardAttack(g, o1); if (kicked) mark('windup'); }
        } else if (o1.state === 'normal' || o1.state === 'recover') still(o1);
        if (kicked && !dodged && o1.state === 'kick') { dodged = Act.skill(g, me, 1, -0.55) !== false; mark('dodge'); return; }
        if (me.state !== 'normal') return;
        if (!kicked) { me.intent.mx = 0.4; me.intent.my = 0; me.intent.sprint = false; return; }
        if (!dodged) { still(me); return; }
        if (shot) { still(me); return; }
        if (b.owner !== me) { steer(me, b.x, b.y, false); return; }
        if (G.x - me.x > 95) { steer(me, G.x - 85, G.y - 18, false); return; }
        face(me, G); Act.shoot(g, me, 0.75, 0.55); shot = true; mark('shot');
      };
      B.focusFn = () => (shot ? g.ball : me);
    },

    /* G28 SHADOW CLONE: Z with the ball, three of him run abreast, each defender dropkicks a clone, the real one walks through */
    gb_clone() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(me, 'shadow_clone');
      const LANE = 34;
      place(me, 262, 205, 0); place(o1, 392, 205 - LANE - 1, PI); place(o2, 392, 205 + LANE + 1, PI); place(mate, 160, 285, 0);
      give(g, me);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate);
      const E = g.effects;
      let nz = 0;
      B.dir = (dt, g, t) => {
        steer(mate, 160, 285, false);
        const b = g.ball;
        for (const q of [o1, o2]) b.noPickup.set(q.id, 99);
        const cl = E.V.clones.filter((c) => c.pid === me.id && c.t > 0.05);
        if (nz && B.t - B.marks['z' + nz] > 0.1) {
          // the clones run the outside lanes, abreast with him
          for (const c of cl) { const lane = c.y < me.y ? -LANE : LANE; c.x += (me.x - c.x) * Math.min(1, dt * 8); c.vx = me.vx; c.vy = (me.y + lane - c.y) * 7; c.facing = 0; }
        }
        for (const q of [o1, o2]) {
          if (q.state !== 'normal') continue;
          const c = cl.find((k) => (q === o1 ? k.y < me.y - 10 : k.y > me.y + 10));
          if (nz === 1 && c && !q.swung && c.x > q.x - 46) { face(q, { x: q.x - 10, y: q.y }); q.cd.hard = 0; if (Act.hardAttack(g, q)) { q.swung = true; mark('swing'); } continue; }
          still(q); if (!q.swung) q.facing = PI;
        }
        if (me.state !== 'normal') return;
        if (nz === 0 && t > 0.3) { if (Act.skill(g, me, 1, 0) !== false) { nz = 1; mark('z1'); } return; }
        if (nz === 1 && t > 2.3) { me.cd.skill = 0; if (Act.skill(g, me, 1, 0) !== false) { nz = 2; mark('z2'); } return; }
        if (b.owner === me) { me.intent.mx = 0.62; me.intent.my = (205 - me.y) * 0.06; me.intent.sprint = false; } else steer(me, b.x, b.y, false);
      };
      B.focusFn = () => ({ x: me.x + 22, y: 205 });
    },

    /* G29 BULLDOZER: he grows with the ball, a dropkick bounces off him (CLANG), he bowls both defenders over and scores */
    gb_bulldozer() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(me, 'bulldozer'); me.res.guard = 2;
      const G = g.attackGoal(0);
      place(me, 262, 206, 0); place(o1, 350, 203, PI); place(o2, 440, 212, PI); place(mate, 160, 280, 0);
      give(g, me);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate);
      let kicked = false, punched = false, shot = false, lastGuard = 2, holdT = 0;
      const was = new Map();
      B.dir = (dt, g, t) => {
        steer(mate, 160, 280, false);
        const b = g.ball;
        for (const q of [o1, o2, mate]) b.noPickup.set(q.id, 99);
        // a tackle just bounced off him (CLANG): he doesn't even flinch, one beat, then he walks through them
        if (me.res.guard < lastGuard && B.t - (B.marks.strike_2 != null ? 99 : 0) > 0 && holdT <= 0 && !(B.marks.strike_1 != null && B.marks.clang2 == null && B.marks.punch == null)) {
          if (B.marks.strike_1 == null && B.marks.clang1 == null) { mark('clang1'); holdT = 0.28; }
          else if (B.marks.punch != null && B.marks.clang2 == null) { mark('clang2'); holdT = Math.max(holdT, 0.2); }
        }
        if (me.res.guard < 1) { me.res.guard = 1; mark('topup'); }
        lastGuard = me.res.guard; holdT -= dt;
        for (const q of [o1, o2]) {
          // bowled over: a touch more air so the STRIKE reads
          if (q.state === 'stun' && was.get(q) !== 'stun' && U.dist(q, me) < 22) { q.kbx += 170; q.kby += (q.y < me.y ? -60 : 60); q.airVz = Math.max(q.airVz, 170); mark('strike_' + (q === o1 ? 1 : 2)); }
          was.set(q, q.state);
        }
        if (o1.state === 'normal') { still(o1); face(o1, me); if (!kicked && U.dist(me, o1) < 64) { o1.cd.hard = 0; kicked = Act.hardAttack(g, o1); if (kicked) mark('kick'); } }
        if (o2.state === 'normal') {
          if (B.marks.plant != null && !punched) steer(o2, me.x + 10, me.y, false); else if (B.marks.strike_1 != null && B.marks.strike_2 == null) steer(o2, me.x + 20, me.y, false); else still(o2);
          face(o2, me);
          if (B.marks.plant == null && B.marks.strike_1 != null && U.dist(me, o2) < 40) { mark('plant'); holdT = 0.3; me.vx *= 0.2; me.vy *= 0.2; }
          if (!punched && B.marks.plant != null && U.dist(me, o2) < 27) { o2.cd.light = 0; punched = Act.lightAttack(g, o2); if (punched) { mark('punch'); holdT = Math.max(holdT, 0.24); } }
        }
        if (me.state !== 'normal' || shot) { if (shot) still(me); return; }
        if (b.owner !== me) { if (!b.owner) steer(me, b.x, b.y, true); return; }
        if (B.marks.strike_2 != null && G.x - me.x < 75) { face(me, G); Act.shoot(g, me, 0.6, -0.2); shot = true; mark('shot'); return; }
        if (holdT > 0) { still(me); return; }
        me.intent.mx = 1; me.intent.my = (206 - me.y) * 0.05; me.intent.sprint = true;
      };
      B.focusFn = () => (shot ? g.ball : { x: me.x + 30, y: 205 });
    },

    /* G30 GIANT KEEPER: they break through on our goal, our keeper POOFs bigger and swallows the shot */
    gb_giant_keeper() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(mate, 'giant_keeper'); mate.res.guard = 1;
      const H = g.ownGoal(0);
      place(mate, H.x + 14, H.y, 0); place(o1, 250, 192, PI); place(me, 300, 260, PI); place(o2, 340, 150, PI);
      give(g, o1);
      B.puppets = new Set([o1, o2, mate, me]); noAttack(o1, o2, mate, me);
      let shot = false;
      B.dir = (dt, g, t) => {
        const b = g.ball;
        steer(o2, 330, 150, false); steer(me, o1.x + 40, o1.y + 50, true);
        // the keeper tracks the ball on his line
        if (mate.state === 'normal') { steer(mate, H.x + 14, U.clamp(b.y, H.y - 26, H.y + 26), false); face(mate, b); }
        if (mate.sizeMul > 1.05) mark('grow');
        if (!shot) {
          if (o1.state === 'normal') { o1.intent.mx = -0.8; o1.intent.my = 0.05; o1.intent.sprint = true; }
          if (H.x - o1.x > -125 && t > 0.6) { face(o1, { x: H.x, y: H.y + 6 }); Act.shoot(g, o1, 0.7, 0.15); shot = true; mark('shot'); }
          return;
        }
        if (o1.state === 'normal') still(o1);
        if (b.owner === mate) mark('save');
      };
      B.focusFn = () => ({ x: H.x + 70, y: H.y });
    },

    /* G31 RUBBER ARM: yanks a loose ball from 3 bodies away, then yanks the defender who came for it (GET OVER HERE) and punches him */
    gb_rubber_arm() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(me, 'rubber_arm');
      place(me, 300, 210, 0); place(o1, 446, 204, PI); place(mate, 180, 280, 0); place(o2, 540, 150, PI);
      const b = g.ball;
      b.owner = null; b.x = 338; b.y = 209; b.z = 0; b.vx = 6; b.vy = 0; b.vz = 0;
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate);
      for (const q of [o1, o2, mate, me]) b.noPickup.set(q.id, 99);
      let first = false, second = false, third = false;
      B.dir = (dt, g, t) => {
        steer(mate, 180, 280, false); steer(o2, 540, 150, false);
        if (!first) b.noPickup.set(me.id, 99);
        if (o1.state === 'normal') {
          if (!first) steer(o1, b.x + 4, b.y, true);
          else if (B.t - B.marks.yank1 < 0.25) { o1.intent.mx *= 0.85; o1.intent.my = 0; }
          else if (B.t - B.marks.yank1 < 0.9) { still(o1); face(o1, me); if (B.marks.huh == null) { mark('huh'); g.effects.comic(o1.x, o1.y - 26, '?', '#ffffff', 1.0, 0.7); } }
          else if (!second) { steer(o1, me.x + 48, me.y - 2, false); face(o1, me); }
          else still(o1);
        }
        if (me.state !== 'normal') return;
        if (!first) { still(me); me.facing = Math.atan2(b.y - me.y, b.x - me.x); if (t > 0.42) { b.noPickup.set(me.id, 0); first = Act.lightAttack(g, me); if (first) mark('yank1'); } return; }
        still(me); face(me, o1);
        if (!second && B.t - B.marks.yank1 > 2.02 && U.dist(me, o1) < 54) { me.cd.light = 0; second = Act.lightAttack(g, me); if (second) mark('yank2'); return; }
        if (second && !third && B.t - B.marks.yank2 > 0.45 && U.dist(me, o1) < 26) { me.cd.light = 0; third = Act.lightAttack(g, me); if (third) mark('pow'); }
      };
      B.focusFn = () => ({ x: 352, y: 208 });
    },

    /* G32 DRAGON UPPERCUT: 5 rage, one punch launches the carrier into the sky, the ball drops at his feet */
    gb_uppercut() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(me, 'uppercut'); me.res.rage = 5;
      place(me, 310, 236, 0); place(o1, 352, 232, PI); place(mate, 180, 290, 0); place(o2, 530, 170, PI);
      give(g, o1);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate);
      let punched = false;
      B.dir = (dt, g, t) => {
        steer(mate, 180, 290, false); steer(o2, 530, 170, false);
        const b = g.ball;
        for (const q of [o1, o2, mate]) b.noPickup.set(q.id, 99);
        if (!punched) {
          if (o1.state === 'normal') { o1.intent.mx = -0.3; o1.intent.my = 0; o1.intent.sprint = false; }
          me.res.rage = 5; still(me); face(me, o1);
          if (t > 0.4 && U.dist(me, o1) < 26 && Act.lightAttack(g, me)) { punched = true; mark('punch'); }
          return;
        }
        if (o1.airZ > 2) mark('air');
        if (B.marks.air != null && B.marks.down == null && o1.airZ <= 0) mark('down');
        if (me.state !== 'normal') return;
        if (b.owner !== me && !b.owner) steer(me, b.x, b.y, false); else still(me);
      };
      B.focusFn = () => ({ x: 330, y: 200 });
    },

    /* G33 SCISSOR KICK: a ball drops in, bicycle kick, it goes straight through two defenders and in */
    gb_scissor() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(me, 'scissor_kick');
      const G = g.attackGoal(0);
      const [e1] = extra(g, 1, 1);
      place(me, 398, 206, 0); place(o1, 478, 205, PI); place(e1, 508, 204, PI); place(o2, G.x - 14, G.y, PI); place(mate, 300, 270, 0);
      const b = g.ball;
      b.owner = null; b.x = 414; b.y = 120; b.z = 40; b.vx = 4; b.vy = 140; b.vz = 70;
      B.puppets = new Set([o1, o2, e1, mate]); noAttack(o1, o2, e1, mate);
      for (const q of [o2, mate, me]) b.noPickup.set(q.id, 99);
      let kicked = false, fixed = false;
      B.dir = (dt, g, t) => {
        steer(mate, 300, 270, false);
        for (const q of [o1, e1]) if (q.state === 'normal') { still(q); face(q, b); }
        if (B.marks.shot == null) { steer(o2, G.x - 14, G.y + Math.sin(t * 2) * 5, false); face(o2, b); }
        else { steer(o2, G.x - 18, G.y - 44, true); b.noPickup.set(o2.id, 99); }
        if (!kicked) {
          still(me); me.facing = 0;
          // time the windup so the boot meets the ball as it comes down in front of him
          if (b.y > 150 && b.y < 206) { b.vy = Math.max(0, (205 - b.y) * 4.2); }
          if (t > 0.05 && b.y > 168) { kicked = Act.hardAttack(g, me); if (kicked) mark('windup'); }
          return;
        }
        if (!fixed && b.fx && b.fx.scissor) {
          fixed = true; mark('shot');
          const sp = Math.hypot(b.vx, b.vy), d = U.norm(G.x + 6 - b.x, G.y + 2 - b.y);
          b.vx = d.x * sp; b.vy = d.y * sp;   // straight down the line of defenders
        }
        if (me.state === 'normal') still(me);
      };
      B.focusFn = () => (B.marks.shot != null ? { x: Math.min(Math.max(g.ball.x, 470), 520), y: 205 } : { x: 450, y: 196 });
    },

    /* G34 GHOST BALL: Z leaves two clones running abreast, the shot fires three balls, the keeper dives at a fake */
    gb_ghost_ball() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(me, 'shadow_clone'); g.cores.add(me, 'ghost_ball');
      const G = g.attackGoal(0), LANE = 30;
      place(me, G.x - 236, G.y + 2, 0); place(o1, G.x - 330, G.y - 90, 0); place(o2, G.x - 18, G.y, PI); place(mate, 220, 290, 0);
      give(g, me);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate);
      const E = g.effects;
      let z = false, shot = false, fake = null;
      B.dir = (dt, g, t) => {
        steer(mate, 220, 290, false); steer(o1, G.x - 330, G.y - 90, false);
        const b = g.ball;
        const cl = E.V.clones.filter((c) => c.pid === me.id && c.t > 0.05);
        if (z && !shot && B.t - B.marks.z > 0.1) for (const c of cl) { const lane = c.y < me.y ? -LANE : LANE; c.x += (me.x - c.x) * Math.min(1, dt * 8); c.vx = me.vx; c.vy = (me.y + lane - c.y) * 7; c.facing = 0; }
        if (!shot) { steer(o2, G.x - 18, G.y + Math.sin(t * 2.2) * 5, false); face(o2, me); }
        else {
          b.noPickup.set(o2.id, 99);
          // the keeper commits to a fake: the one that ends up furthest from the real ball
          if (!fake) {
            const at = (d) => d.y + d.vy * (G.x - d.x) / Math.max(1, d.vx);
            const ds = E.decoys.filter((d) => d.srcId === -1 && d.alive);
            fake = ds.sort((p, q) => Math.abs(at(q) - G.y) - Math.abs(at(p) - G.y))[0] || null;
            if (fake) fake.aim = at(fake);
          }
          if (fake && B.marks.dive == null && G.x - fake.x < 70 && o2.state === 'normal') { Act.dive(g, o2, U.clamp(fake.aim, G.y - 34, G.y + 34) - o2.y); mark('dive'); }
          else if (B.marks.dive == null) still(o2);
        }
        if (me.state !== 'normal') return;
        if (!z) { me.intent.mx = 0.5; me.intent.my = 0; if (t > 0.25) { z = Act.skill(g, me, 1, 0) !== false; if (z) mark('z'); } return; }
        if (!shot && b.owner === me) {
          if (B.t - B.marks.z < 0.8) { me.intent.mx = 0.6; me.intent.my = (G.y + 2 - me.y) * 0.05; return; }
          face(me, G); Act.shoot(g, me, 0.12, 0); shot = true; mark('shot'); return;
        }
        still(me);
      };
      B.focusFn = () => (shot ? { x: G.x - 72, y: G.y } : { x: me.x + 34, y: G.y });
    },

    /* G35 FLYING KICK: full Momentum, he flies into the carrier, then the carrier flies the length of the pitch */
    gb_flying_kick() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(me, 'flying_kick'); me.res.momentum = 5;
      const G = g.attackGoal(0);
      place(me, 220, 206, 0); place(o1, 330, 204, PI); place(mate, 150, 280, 0); place(o2, G.x - 20, G.y - 44, PI);
      give(g, o1);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate);
      let kicked = false;
      B.dir = (dt, g, t) => {
        steer(mate, 150, 280, false); steer(o2, G.x - 20, G.y - 44, false);
        const b = g.ball;
        if (!kicked) {
          me.res.momentum = 5;
          if (o1.state === 'normal') { o1.intent.mx = -0.3; o1.intent.my = 0; o1.intent.sprint = false; }
          me.intent.mx = 1; me.intent.my = 0; me.intent.sprint = true;
          if (t > 0.35 && U.dist(me, o1) < 92) { face(me, o1); kicked = Act.hardAttack(g, me); if (kicked) mark('windup'); }
          return;
        }
        if (me.state === 'kick') mark('fly');
        if (o1.state === 'stun') { mark('hit'); for (const q of [o1, o2, mate]) b.noPickup.set(q.id, 99); }
        if (B.marks.hit != null && B.marks.bonk == null && o1.x >= g.field.x + g.field.w - o1.radius - 1) mark('bonk');
        if (me.state !== 'normal') return;
        if (!b.owner) steer(me, b.x, b.y, false);
        else if (b.owner === me && B.marks.bonk != null) steer(me, o1.x - 46, o1.y + 6, false);
        else still(me);
      };
      B.focusFn = () => (B.marks.hit != null && B.t - B.marks.hit > 0.1 ? { x: Math.min(o1.x, 520), y: 205 } : me);
    },

    /* G36 ENDLESS TIKI-TAKA: ult, the opponents slow to a crawl, 4 golden one-touch passes, then the max shot */
    gb_tiki() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      ult(g, me, 'endless_tiki');
      const G = g.attackGoal(0);
      place(me, 410, 184, 0); place(mate, 400, 232, 0); place(o1, 452, 208, PI); place(o2, G.x - 20, G.y, PI);
      give(g, me);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate);
      let fired = false;
      B.dir = (dt, g, t) => {
        const b = g.ball;
        if (!fired) { still(me); face(me, G); still(mate); if (t > 0.3) { fired = g.cores.activateUltimate(me); if (fired) mark('ult'); } }
        // the opponents try to get to the ball (slowed by the Core)
        if (o1.state === 'normal') steer(o1, b.x, b.y, true);
        if (b.kind === 'shot' && b.owner == null && B.marks.ult != null && B.t - B.marks.ult > 1.0) mark('shot');
        if (B.marks.shot != null) { b.noPickup.set(o2.id, 99); b.noPickup.set(o1.id, 99); steer(o2, G.x - 22, b.y > G.y ? G.y - 40 : G.y + 40, true); }
        else steer(o2, G.x - 20, G.y + Math.sin(t * 2) * 6, false);
        if (fired) { if (me.state === 'normal' && b.owner !== me) still(me); if (mate.state === 'normal' && b.owner !== mate) still(mate); }
      };
      B.focusFn = () => (B.marks.shot != null ? g.ball : { x: (me.x + mate.x) / 2 + 20, y: (me.y + mate.y) / 2 });
    },
  });
})();
