/* ga scenes (G11-G23): one Core per clip, added to BRAG.SCENES after scenes.js loads (capture.py injects every scenes_*.js).
   Every scene name starts with ga_. Nothing here runs at load time except Object.assign. */
(function () {
  const { U, Act, PI, place, give, face, steer, still, mark, match, cast, noAttack, extra, t0focus } = BRAG.lib;
  const B = BRAG;

  // the director drives our player itself: switch off keyboard handling (it would release a charge we hold by hand)
  // patched lazily, only when one of these scenes is set up, so other batches' captures are untouched
  const noHuman = () => {
    if (!SFC.Human.__ga) {
      const h0 = SFC.Human.update;
      SFC.Human.update = function () { if (B.gaNoHuman) return; return h0.apply(this, arguments); };
      SFC.Human.__ga = true;
    }
    B.gaNoHuman = true;
  };
  // hold the shot button: the charge bar fills (Core charge VFX show on the player)
  const hold = (p, k) => { p.charging = true; p.charge = Math.max(0, Math.min(1, k)); };
  const comics = (g) => g.effects.V.comics;

  Object.assign(B.SCENES, {
    /* G11 FIREBALL: a charged shot skims the floor and leaves a line of fire; both defenders run into it */
    ga_fireball() {
      noHuman();
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(me, 'fire_shot');
      const G = g.attackGoal(0);
      const [o3] = extra(g, 1, 1);
      place(me, G.x - 205, G.y + 4, 0); place(mate, 200, 275, 0);
      place(o1, G.x - 118, G.y - 36, PI); place(o3, G.x - 92, G.y + 38, PI); place(o2, G.x - 20, G.y, PI);
      give(g, me);
      B.puppets = new Set([o1, o2, o3, mate]); noAttack(o1, o2, o3, mate);
      const b = g.ball;
      for (const q of [o1, o2, o3, mate]) b.noPickup.set(q.id, 99);
      let shot = false;
      const prev = new Map(), words = ['HOT!', 'OUCH!', 'HOT!!', 'AAH!'];
      let w = 0;
      B.dir = (dt, g, t) => {
        steer(mate, 200, 275, false);
        if (!shot) {
          me.intent.mx = 0.3; me.intent.my = 0; hold(me, t / 0.45);
          for (const o of [o1, o3]) { still(o); face(o, me); }
          steer(o2, G.x - 20, G.y + Math.sin(t * 2) * 6, false);
          if (t > 0.5) { face(me, G); Act.shoot(g, me, 1, 0.15); shot = true; mark('shot'); }
          return;
        }
        still(me);
        // the fireball stays on the floor so its whole path burns; past the defenders it slows to a crawl (still burning)
        if (B.marks.goal == null && b.x < G.x + 4) {
          b.z = Math.min(b.z, 2); b.vz = Math.min(b.vz, 0);
          const v = b.x < G.x - 105 ? 265 : 80;
          const s = Math.hypot(b.vx, b.vy) || 1; b.vx *= v / s; b.vy *= v / s;
        }
        // keeper wants nothing to do with it
        if (G.x - b.x < 90 && B.marks.goal == null) steer(o2, G.x - 22, G.y - 40, true); else if (B.marks.goal == null) still(o2);
        // the defenders rush back at him... straight across the flames
        const go = B.t - B.marks.shot > 0.3;
        for (const o of [o1, o3]) {
          if (o.state === 'normal' && go) steer(o, me.x + 30, me.y + (o === o1 ? 26 : -26), true);
          else if (o.state === 'normal') still(o);
          if (o.state === 'stun' && prev.get(o) !== 'stun') {
            mark(o === o1 ? 'burn1' : 'burn3');
            o.airVz = Math.max(o.airVz, 150); o.airZ = Math.max(o.airZ, 0.5);
            g.effects.comic(o.x, o.y - 28, words[w++ % words.length], '#ff9a3d', 0.9, 0.55);
          }
          prev.set(o, o.state);
        }
      };
      B.focusFn = () => (shot ? { x: G.x - 112, y: G.y } : { x: me.x + 70, y: G.y });
    },

    /* G12 THUNDER KICK: long charge, the lightning ball goes straight through the defender in the lane */
    ga_thunder() {
      noHuman();
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(me, 'thunder_kick');
      const G = g.attackGoal(0);
      place(me, G.x - 190, G.y + 2, 0); place(o1, G.x - 116, G.y + 2, PI); place(o2, G.x - 18, G.y, PI); place(mate, 200, 275, 0);
      give(g, me);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate);
      const b = g.ball;
      for (const q of [o2, mate]) b.noPickup.set(q.id, 99);
      let shot = false, zapped = false;
      B.dir = (dt, g, t) => {
        steer(mate, 200, 275, false);
        if (!shot) {
          still(me); face(me, G); hold(me, (t - 0.05) / 0.7);
          still(o1); face(o1, me);
          steer(o2, G.x - 18, G.y + Math.sin(t * 2) * 5, false);
          if (t > 0.9) { Act.shoot(g, me, 1, 0.06); shot = true; mark('shot'); }
          return;
        }
        still(me);
        if (B.marks.goal == null && b.x < G.x + 4) { b.z = Math.min(b.z, 3); b.vz = Math.min(b.vz, 0); }
        if (!zapped && o1.state === 'stun') { zapped = true; mark('zap'); }
        // he keeps crackling for a moment
        if (zapped && o1.state === 'stun' && Math.random() < 0.3) g.effects.bolt(o1.x - 5 + Math.random() * 10, o1.y - 26, o1.x + (Math.random() - 0.5) * 10, o1.y - 2, '#bdf4ff', 0.12);
        if (o1.state === 'normal') still(o1);
        if (zapped && B.marks.goal == null) steer(o2, G.x - 20, G.y - 36, true); else if (B.marks.goal == null) still(o2);
      };
      B.focusFn = () => (shot && B.t - B.marks.shot > 0.08 ? { x: Math.min(Math.max(b.x, o1.x), G.x - 70), y: G.y } : t0focus(me, o1));
    },

    /* G13 DRAGON CURL: the shot leaves heading wide of the post... and bends round the wall into the far corner on its own */
    ga_curl() {
      noHuman();
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(me, 'banana_kick');
      const G = g.attackGoal(0);
      const [o3] = extra(g, 1, 1);
      // a two-man wall straight between him and the goal, keeper on the near (top) side
      place(me, G.x - 205, G.y - 8, 0); place(o1, G.x - 150, G.y - 4, PI); place(o3, G.x - 128, G.y + 8, PI);
      place(o2, G.x - 20, G.y - 8, PI); place(mate, 200, 275, 0);
      give(g, me);
      B.puppets = new Set([o1, o2, o3, mate]); noAttack(o1, o2, o3, mate);
      const b = g.ball;
      for (const q of [o1, o2, o3, mate]) b.noPickup.set(q.id, 99);
      let shot = false;
      const SPD = 205;
      B.dir = (dt, g, t) => {
        steer(mate, 200, 275, false);
        if (!shot) {
          me.intent.mx = 0.25; me.intent.my = 0;
          for (const o of [o1, o3]) { still(o); face(o, me); }
          steer(o2, G.x - 20, G.y - 8 + Math.sin(t * 2) * 4, false);
          if (t > 0.4) {
            face(me, G); Act.shoot(g, me, 0.75, 0.6);
            // it leaves almost straight up the pitch, nowhere near the goal; the Core's homing has to bring it back
            const want = Math.atan2(b.homing.y - b.y, b.homing.x - b.x), a = want - 1.4;
            b.vx = Math.cos(a) * SPD; b.vy = Math.sin(a) * SPD;
            // a longer tail so the "green dragon" from the Core's description reads at phone size (cosmetic, this scene only)
            SFC_CONFIG.game.ball.trailLength = 20;
            shot = true; mark('shot');
          }
          return;
        }
        still(me);
        if (B.marks.goal == null && b.x < G.x + 4) {
          b.z = Math.min(b.z, 6); b.vz = Math.min(b.vz, 0);
          const s = Math.hypot(b.vx, b.vy) || 1; b.vx *= SPD / s; b.vy *= SPD / s;
        }
        for (const o of [o1, o3]) if (o.state === 'normal') { still(o); face(o, b); }
        // the keeper covers the top where it went... it comes back low to the far side
        if (B.marks.goal == null) { steer(o2, G.x - 20, Math.max(G.y - 34, Math.min(G.y - 4, b.y)), false); face(o2, b); }
      };
      B.focusFn = () => (shot && B.t - B.marks.shot > 0.05 ? { x: Math.min(Math.max(b.x, G.x - 150), G.x - 80), y: G.y - 22 } : { x: me.x + 50, y: me.y - 16 });
    },

    /* G14 PHANTOM STEP: Z = teleport; the defender charges the illusion left behind and punches thin air */
    ga_phantom() {
      noHuman();
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(me, 'phantom_step');
      const G = g.attackGoal(0);
      place(me, G.x - 215, G.y + 14, 0); place(o1, G.x - 120, G.y + 12, PI); place(mate, 200, 285, 0); place(o2, G.x - 20, G.y, PI);
      give(g, me);
      B.puppets = new Set([o1, o2, mate]); noAttack(o2, mate); o1.cd.light = 99;
      const b = g.ball;
      for (const q of [o1, o2, mate]) b.noPickup.set(q.id, 99);
      const E = g.effects;
      let stepped = false, ghost = null, kicked = false, popped = false, shot = false;
      B.dir = (dt, g, t) => {
        steer(mate, 200, 285, false);
        me.stamina = 100;
        if (!stepped) {
          me.intent.mx = 0.35; me.intent.my = 0;
          steer(o2, G.x - 20, G.y + Math.sin(t * 2) * 5, false);
          if (o1.state === 'normal') steer(o1, me.x + 4, me.y, true);
          if (t > 0.3 && U.dist(me, o1) < 46) { ghost = { x: me.x, y: me.y }; Act.skill(g, me, 0.25, -1); stepped = me.state === 'dash'; if (stepped) mark('step'); }
          return;
        }
        // he's committed: flying kick... into the illusion
        if (!kicked) {
          if (o1.state === 'normal') { face(o1, ghost); o1.cd.hard = 0; kicked = Act.hardAttack(g, o1); if (kicked) mark('kick'); }
        } else if (!popped && o1.state === 'kick' && U.dist(o1, ghost) < 12) {
          popped = true; mark('poof');
          for (const c of E.V.clones) if (c.pid === me.id) E.popClone(me.id, c.x, c.y);
          E.comic(ghost.x - 4, ghost.y - 26, 'POOF', '#d8d0e0', 1.0, 0.6);
          g.sfx('whoosh');
        } else if (popped) {
          if (o1.state === 'normal') { still(o1); o1.facing = PI + Math.sin(B.t * 7) * 1.3; }
          if (B.marks.huh == null && B.t - B.marks.poof > 0.45) { mark('huh'); E.comic(o1.x, o1.y - 28, '???', '#ffffff', 1.1, 1.4); }
        }
        // meanwhile he strolls in and scores
        if (shot) { still(me); if (B.marks.goal == null) steer(o2, G.x - 22, G.y + 36, true); return; }
        steer(o2, G.x - 20, G.y + Math.sin(t * 2) * 5, false);
        if (me.state !== 'normal') return;
        if (b.owner !== me) { steer(me, b.x, b.y, false); return; }
        if (B.t - B.marks.step < 0.9) { me.intent.mx = 0.5; me.intent.my = 0.05; me.intent.sprint = false; return; }
        if (G.x - me.x > 95) { steer(me, G.x - 90, G.y - 14, false); return; }
        face(me, G); Act.shoot(g, me, 0.7, -0.6); shot = true; mark('shot');
      };
      B.focusFn = () => (shot ? { x: Math.min(g.ball.x, G.x - 70), y: G.y - 8 } : B.marks.huh != null && B.t - B.marks.huh > 0.4 ? { x: Math.min(me.x + 45, G.x - 75), y: G.y - 8 } : stepped ? { x: (me.x + ghost.x) / 2 + 12, y: (me.y + ghost.y) / 2 + 4 } : t0focus(me, o1));
    },

    /* G15 FAKE RUN: he bursts away, a purple fake with a fake ball runs the other way, both defenders (and the keeper) follow it */
    ga_fakerun() {
      noHuman();
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(me, 'fake_run');
      const G = g.attackGoal(0);
      const [o3] = extra(g, 1, 1);
      place(me, 352, 206, 0); place(o1, 398, 192, PI); place(o3, 402, 222, PI); place(o2, G.x - 20, G.y, PI); place(mate, 200, 280, 0);
      give(g, me);
      B.puppets = new Set([o1, o2, o3, mate]); noAttack(o1, o2, o3, mate);
      const b = g.ball;
      for (const q of [o1, o2, o3, mate]) b.noPickup.set(q.id, 99);
      const E = g.effects;
      let decoy = null, shot = false, gone = false;
      B.dir = (dt, g, t) => {
        steer(mate, 200, 280, false);
        me.stamina = 100;
        if (!decoy) {
          me.intent.mx = 0.25; me.intent.my = 0; me.intent.sprint = false;
          for (const o of [o1, o3]) steer(o, me.x + 24, me.y + (o === o1 ? -10 : 10), false);
          steer(o2, G.x - 20, G.y, false);
          if (t > 0.5) { me.intent.mx = 0.55; me.intent.my = 0.85; me.intent.sprint = true; }
          if (E.decoys.length) { decoy = E.decoys[E.decoys.length - 1]; mark('fake'); }
          return;
        }
        // the fake heads up-field; everybody buys it
        if (decoy.alive) {
          decoy.vx = 40; decoy.vy = -74;
          if (decoy.runner) decoy.runner.facing = Math.atan2(decoy.vy, decoy.vx);
          // they chase it a step behind, so the fake stays in plain sight
          for (const o of [o1, o3]) if (o.state === 'normal') steer(o, decoy.x + (o === o1 ? -9 : 9), decoy.y + 17, true);
          steer(o2, G.x - 26, Math.max(G.y - 40, decoy.y), true);
        } else {
          if (!gone) { gone = true; mark('gone'); E.comic(decoy.x, decoy.y - 24, 'POOF', '#9d7bff', 0.9, 0.6); E.comic(o1.x + 8, o1.y - 30, '???', '#ffffff', 1.1, 1.2); g.sfx('whoosh'); }
          for (const o of [o1, o3]) { still(o); o.facing = PI / 2 + Math.sin(B.t * 6 + o.id) * 1.4; }
          if (!shot) steer(o2, G.x - 22, G.y, true); else still(o2);
        }
        if (me.state !== 'normal') return;
        if (shot) { still(me); return; }
        if (b.owner !== me) { steer(me, b.x, b.y, true); return; }
        const tx = G.x - 72, ty = G.y + 26;
        if ((U.dist(me, { x: tx, y: ty }) > 10 || !gone) && B.t - B.marks.fake < 2.4) { if (U.dist(me, { x: tx, y: ty }) > 10) steer(me, tx, ty, B.t - B.marks.fake < 1.0); else still(me); return; }
        face(me, G); Act.shoot(g, me, 0.8, 0.1); shot = true; mark('shot');
      };
      B.focusFn = () => (shot ? { x: Math.min(b.x, G.x - 60), y: Math.max(b.y, 175) } : decoy && decoy.alive ? { x: (me.x + decoy.x) / 2 + 8, y: (me.y + decoy.y) / 2 + 6 } : decoy ? { x: me.x + 30, y: me.y - 30 } : { x: me.x + 20, y: me.y });
    },

    /* G16 WIND BLADE: he dropkicks thin air from way out ("MISS")... the wind slash flies on and drops both of them */
    ga_blade() {
      noHuman();
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(me, 'blade_runner');
      const [o3] = extra(g, 1, 1);
      place(me, 270, 205, 0); place(o1, 392, 205, PI); place(o3, 410, 205, PI); place(mate, 170, 280, 0); place(o2, 562, 203, PI);
      give(g, o1);
      B.puppets = new Set([o1, o2, o3, mate]); noAttack(o1, o2, o3, mate);
      const b = g.ball;
      for (const q of [o2, o3, mate]) b.noPickup.set(q.id, 99);
      let kicked = false;
      const down = new Set();
      B.dir = (dt, g, t) => {
        steer(mate, 170, 280, false); steer(o2, 562, 203, false);
        // carrier shuffles in, his mate right behind him: way out of kicking range
        for (const o of [o1, o3]) {
          if (o.state === 'stun' && !down.has(o)) { down.add(o); mark(o === o1 ? 'slash' : 'slash2'); }
          if (o.state !== 'normal') continue;
          if (B.marks.slash == null) { if (o === o1) { o1.intent.mx = -0.12; o1.intent.my = 0; o1.intent.sprint = false; } else steer(o3, o1.x + 17, o1.y, false); face(o, me); }
          else still(o);
        }
        if (!kicked) { still(me); face(me, o1); if (t > 0.3) { kicked = Act.hardAttack(g, me); if (kicked) mark('windup'); } return; }
        if (me.state !== 'normal') return;
        if (B.marks.slash == null || B.t - B.marks.slash < 0.5) { still(me); return; }
        // then he walks round them and takes it
        b.noPickup.set(o1.id, 99);
        if (b.owner !== me) steer(me, b.x - 4, b.y + (Math.abs(me.x - o1.x) < 30 ? 22 : 0), false); else { me.intent.mx = 0.35; me.intent.my = 0; me.intent.sprint = false; }
      };
      B.focusFn = () => (B.marks.slash != null && B.t - B.marks.slash > 0.4 ? { x: (me.x + b.x) / 2 + 10, y: 205 } : { x: (me.x + o1.x) / 2 + 6, y: 205 });
    },

    /* G17 AEGIS SHIELD: our mate dropkicks their keeper out of the goal, open net, tap-in... AEGIS! */
    ga_aegis() {
      noHuman();
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(1, 'aegis_wall');
      g.cores.add(mate, 'heavy_boot');
      const G = g.attackGoal(0);
      place(me, G.x - 128, G.y - 6, 0); place(o2, G.x - 16, G.y + 16, PI); place(mate, G.x - 20, G.y + 50, -PI / 2); place(o1, G.x - 260, G.y - 70, PI);
      give(g, me);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2);
      const b = g.ball;
      for (const q of [o1, o2, mate]) b.noPickup.set(q.id, 99);
      const E = g.effects;
      let kicked = false, shot = false;
      B.dir = (dt, g, t) => {
        steer(o1, G.x - 260, G.y - 70, false);
        if (o2.state === 'normal' && !kicked) { steer(o2, G.x - 16, G.y + 16 + Math.sin(t * 2) * 3, false); face(o2, me); }
        else if (o2.state === 'normal') still(o2);
        // the mate clears the keeper out of the way
        if (!kicked) {
          if (mate.state === 'normal') { face(mate, o2); if (t > 0.1) { kicked = Act.hardAttack(g, mate); if (kicked) mark('kick'); } }
        } else { if (mate.state === 'recover') mate.state = 'normal'; if (mate.state === 'normal') steer(mate, G.x - 70, G.y - 84, true); }
        if (!shot) {
          if (t < 0.95) { me.intent.mx = 0.35; me.intent.my = 0; return; }
          face(me, G); Act.shoot(g, me, 0.62, -0.4); shot = true; mark('shot');
          b.noPickup.set(me.id, 99);
          return;
        }
        still(me);
        if (B.marks.shot != null && B.marks.block == null && b.vx < 0) mark('block');
        if (B.marks.block != null && B.marks.huh == null && B.t - B.marks.block > 0.45) { mark('huh'); E.comic(me.x, me.y - 28, '???', '#ffffff', 1.1, 1.3); }
      };
      B.focusFn = () => (shot ? { x: G.x - 62, y: G.y } : { x: G.x - 70, y: G.y });
    },

    /* G18 EMP MINE: a punch drops a mine at his feet; the carrier dribbles over it -> ZAP, ball gone */
    ga_emp() {
      noHuman();
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(me, 'emp_trap');
      const [o3] = extra(g, 1, 1);
      place(me, 300, 206, 0); place(o1, 372, 206, PI); place(o3, 436, 238, PI); place(mate, 170, 285, 0); place(o2, 562, 203, PI);
      give(g, o1);
      B.puppets = new Set([o1, o2, o3, mate]); noAttack(o1, o2, o3, mate);
      const b = g.ball;
      for (const q of [o2, o3, mate]) b.noPickup.set(q.id, 99);
      const E = g.effects;
      let mine = null, mine2 = null, side = null;
      B.dir = (dt, g, t) => {
        steer(mate, 170, 285, false); steer(o2, 562, 203, false);
        // 1) a punch at nothing: the mine drops where he stood
        if (!mine) { still(me); face(me, o1); if (t > 0.2 && Act.lightAttack(g, me)) { mark('mine'); mine = E.mines[E.mines.length - 1]; } }
        // the carrier walks straight at him... and over the mine
        if (B.marks.zap == null) {
          if (o1.state === 'normal') { if (mine && t > 0.4) steer(o1, mine.x - 30, mine.y, false); else { o1.intent.mx = -0.3; o1.intent.my = 0; } }
          if (o1.state === 'stun') { mark('zap'); b.noPickup.set(o1.id, 99); }
        } else if (o1.state === 'normal') still(o1);
        // 2) his mate charges in to help... same trick
        if (B.marks.zap2 == null) {
          if (o3.state === 'stun') mark('zap2');
          else if (o3.state === 'normal') {
            if (mine2 && mine2.t > 0) { if (mine2.arm > 0.05 && U.dist(o3, mine2) < 40) { still(o3); face(o3, me); } else steer(o3, mine2.x - 28, mine2.y + 2, mine2.arm <= 0.05); }
            else if (B.marks.zap != null && B.t - B.marks.zap > 0.4) steer(o3, me.x + 6, me.y + 4, true);
            else { still(o3); face(o3, me); }
          }
        } else if (o3.state === 'normal') still(o3);
        if (!mine || me.state !== 'normal') return;
        if (B.marks.zap == null) { steer(me, 286, 172, false); face(me, o1); return; }
        if (b.owner !== me && !mine2) { steer(me, b.x, b.y, true); return; }
        if (!mine2) {
          // step away from the first victim before setting the second trap
          if (me.x < 338 && U.dist(me, o3) > 70) { steer(me, 344, 198, false); return; }
          if (U.dist(me, o3) < 88) { face(me, o3); g.cores.st(me, 'emp_trap').cd = 0; me.cd.light = 0; if (Act.lightAttack(g, me)) { mark('mine2'); mine2 = E.mines[E.mines.length - 1]; side = { x: me.x - 16, y: me.y - 34 }; } }
          else { still(me); face(me, o3); }
          return;
        }
        if (B.marks.zap2 == null) { steer(me, side.x, side.y, false); return; }
        if (b.owner === me) { me.intent.mx = 0.3; me.intent.my = 0.05; } else steer(me, b.x, b.y, false);
      };
      B.focusFn = () => (mine2 ? { x: mine2.x + 14, y: mine2.y - 10 } : mine ? { x: mine.x + 12, y: mine.y - 8 } : { x: 330, y: 200 });
    },

    /* G19 PHANTOM PASS: 5 Rhythm, through pass -> a golden beam straight through three defenders (vertical: the crop sees all of it) */
    ga_ppass() {
      noHuman();
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(me, 'phantom_pass');
      const G = g.attackGoal(0);
      const [o3, o4] = extra(g, 1, 2);
      place(me, 300, 300, -PI / 2); place(mate, 300, 112, PI / 2);
      place(o1, 316, 252, -PI / 2); place(o3, 326, 208, -PI / 2); place(o4, 337, 164, -PI / 2); place(o2, G.x - 20, G.y, PI);
      give(g, me);
      B.puppets = new Set([mate, o1, o2, o3, o4]); noAttack(o2);
      const b = g.ball;
      b.noPickup.set(o2.id, 99);
      const defs = [o1, o3, o4];
      const spots = defs.map((o) => ({ x: o.x, y: o.y }));
      let passed = false;
      const swung = new Set();
      B.dir = (dt, g, t) => {
        if (!passed) g.rhythm[0] = 5;
        steer(o2, G.x - 20, G.y, false);
        defs.forEach((o, k) => {
          if (o.state !== 'normal') return;
          if (!passed) { steer(o, spots[k].x, spots[k].y, false); face(o, me); return; }
          // everyone lunges at the ball as it goes by
          if (!swung.has(o)) {
            steer(o, b.x, b.y, true);
            if (U.dist(o, b) < 20) { face(o, b); o.cd.light = 0; if (Act.lightAttack(g, o)) swung.add(o); }
          } else still(o);
        });
        if (!passed) { still(me); still(mate); face(me, mate); if (t > 0.55) { Act.passTo(g, me, mate, 'through'); passed = true; mark('pass'); } return; }
        if (me.state === 'normal') still(me);
        if (mate.state !== 'normal') return;
        if (B.marks.shot != null) { still(mate); if (B.marks.goal == null) steer(o2, G.x - 22, G.y + 40, true); return; }
        if (b.owner === mate) {
          mark('recv'); mate.stamina = 100;
          // golden speed boost: straight at goal, finish
          if (G.x - mate.x > 95) steer(mate, G.x - 88, G.y - 26, true);
          else { face(mate, G); Act.shoot(g, mate, 0.85, -0.5); mark('shot'); }
        }
        else if (!b.owner) steer(mate, b.x, b.y, true);
        else still(mate);
      };
      B.focusFn = () => (B.marks.shot != null ? { x: Math.min(b.x, G.x - 70), y: G.y - 20 } : B.marks.recv != null ? { x: Math.max(318, mate.x), y: Math.max(150, mate.y + 30) } : { x: 318, y: 205 });
    },

    /* G20 SONIC BOOM: max Momentum, sprinting with the ball: he only brushes past them and they get blasted away */
    ga_sonic() {
      noHuman();
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(me, 'sonic_boom');
      const G = g.attackGoal(0);
      const [o3] = extra(g, 1, 1);
      place(me, 236, 205, 0); place(o1, 318, 190, PI); place(o3, 388, 221, PI); place(o2, G.x - 20, G.y, PI); place(mate, 150, 280, 0);
      give(g, me);
      B.puppets = new Set([o1, o2, o3, mate]); noAttack(o1, o2, o3, mate);
      const b = g.ball;
      for (const q of [o1, o2, o3, mate]) b.noPickup.set(q.id, 99);
      const hits = new Set();
      let shot = false;
      B.dir = (dt, g, t) => {
        steer(mate, 150, 280, false);
        me.stamina = 100;
        if (hits.size < 2) me.res.momentum = g.cores.resMax(me, 'momentum');
        for (const o of [o1, o3]) {
          if (o.state === 'stun' && !hits.has(o)) { hits.add(o); mark('boom' + hits.size); me.sonicT = 0; }
          if (o.state === 'normal' && !hits.has(o)) { steer(o, o.x - 0.4, o === o1 ? 190 : 221, false); face(o, me); }
          else if (o.state === 'normal') still(o);
        }
        if (shot) { still(me); if (B.marks.goal == null) steer(o2, G.x - 22, G.y - 40, true); return; }
        steer(o2, G.x - 20, G.y + Math.sin(t * 2) * 5, false);
        if (me.state !== 'normal' || b.owner !== me) return;
        me.intent.mx = 1; me.intent.my = (205 - me.y) * 0.05; me.intent.sprint = t > 0.1;
        if (hits.size >= 2 && G.x - me.x < 110) { face(me, G); Act.shoot(g, me, 0.9, -0.5); shot = true; mark('shot'); }
      };
      B.focusFn = () => (shot ? { x: Math.min(b.x, G.x - 70), y: G.y } : { x: me.x + 34, y: me.y });
    },

    /* G21 FREIGHT TRAIN: 5 Momentum, head-on into the carrier -> BAM, he flies into the bottom wall (vertical run so the crop holds both) */
    ga_freight() {
      noHuman();
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(me, 'freight_train');
      const G = g.attackGoal(0);
      place(me, 320, 128, PI / 2); place(o1, 322, 268, -PI / 2); place(mate, 170, 290, 0); place(o2, G.x - 20, G.y, PI);
      give(g, o1);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate);
      const b = g.ball;
      for (const q of [o2, mate]) b.noPickup.set(q.id, 99);
      let bam = false;
      B.dir = (dt, g, t) => {
        steer(mate, 170, 290, false); steer(o2, G.x - 20, G.y, false);
        me.stamina = 100;
        if (!bam) {
          me.res.momentum = Math.max(me.res.momentum, 5);
          if (t > 0.1) { me.intent.mx = (o1.x - me.x) * 0.04; me.intent.my = 1; me.intent.sprint = true; } else still(me);
          if (o1.state === 'normal') { o1.intent.mx = 0; o1.intent.my = -0.35; o1.intent.sprint = false; o1.facing = -PI / 2; }
          if (o1.state === 'stun') { bam = true; mark('bam'); b.noPickup.set(o1.id, 99); }
          return;
        }
        if (o1.state === 'normal') still(o1);
        if (me.state !== 'normal') return;
        if (b.owner !== me) steer(me, b.x, b.y, true); else { me.intent.mx = 0.6; me.intent.my = -0.2; me.intent.sprint = false; }
      };
      B.focusFn = () => (bam ? { x: (me.x + o1.x) / 2, y: Math.max(me.y, o1.y) - 30 } : { x: 322, y: (me.y + o1.y) / 2 });
    },

    /* G22 ENERGY WAVE: full charge, the beam fires with the ball and throws everyone in the lane aside */
    ga_wave() {
      noHuman();
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(me, 'energy_wave');
      const G = g.attackGoal(0);
      const [o3] = extra(g, 1, 1);
      place(me, G.x - 210, G.y + 2, 0); place(o1, G.x - 150, G.y - 6, PI); place(o3, G.x - 104, G.y + 8, PI); place(o2, G.x - 18, G.y, PI); place(mate, 200, 280, 0);
      give(g, me);
      B.puppets = new Set([o1, o2, o3, mate]); noAttack(o1, o2, o3, mate);
      const b = g.ball;
      for (const q of [o1, o2, o3, mate]) b.noPickup.set(q.id, 99);
      let shot = false;
      B.dir = (dt, g, t) => {
        steer(mate, 200, 280, false);
        if (!shot) {
          still(me); face(me, G); hold(me, (t - 0.05) / 0.75);
          for (const o of [o1, o3]) { still(o); face(o, me); }
          steer(o2, G.x - 18, G.y + Math.sin(t * 2) * 4, false);
          if (t > 0.95) { Act.shoot(g, me, 1, 0.0); shot = true; mark('shot'); }
          return;
        }
        still(me);
        if (B.marks.goal == null && b.x < G.x + 4) { b.z = Math.min(b.z, 8); b.vz = Math.min(b.vz, 0); }
        for (const o of [o1, o2, o3]) if (o.state === 'normal' && B.t - B.marks.shot > 0.3) still(o);
      };
      B.focusFn = () => (shot && B.t - B.marks.shot > 0.12 ? { x: Math.min(b.x, G.x - 80), y: G.y } : { x: me.x + 60, y: me.y });
    },

    /* G23 FIST STORM: every punch is a 4-hit combo; one on the carrier, one on the guy who comes to help */
    ga_fists() {
      noHuman();
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(me, 'fist_storm');
      const [o3] = extra(g, 1, 1);
      place(me, 300, 206, 0); place(o1, 316, 206, PI); place(o3, 392, 176, PI); place(mate, 170, 285, 0); place(o2, 562, 203, PI);
      o1.stats.dribble = 0.3;
      give(g, o1);
      B.puppets = new Set([o1, o2, o3, mate]); noAttack(o1, o2, o3, mate);
      const b = g.ball;
      for (const q of [o2, o3, mate]) b.noPickup.set(q.id, 99);
      const E = g.effects;
      let n = 0, rage = 0, round = 0, target = o1;
      B.dir = (dt, g, t) => {
        steer(mate, 170, 285, false); steer(o2, 562, 203, false);
        // count the hits: every connecting punch of the storm adds 1 Rage
        if (me.res.rage > rage) {
          n++; rage = me.res.rage;
          comics(g).splice(0, comics(g).length, ...comics(g).filter((c) => !/ HIT!$/.test(c.str || '')));
          E.combo(target.x + 12, target.y - 42, n);
          mark('hit' + round + '_' + n);
        }
        if (o1.state === 'normal' && round === 0) { still(o1); face(o1, me); }
        else if (o1.state === 'normal') still(o1);
        if (round === 1 && o3.state === 'normal' && B.t - B.marks.storm1 > 0.75) steer(o3, me.x + 15, me.y, true);
        else if (o3.state === 'normal') { still(o3); face(o3, me); }
        if (me.state !== 'normal') return;
        if (round === 0) { still(me); face(me, o1); if (t > 0.3 && Act.lightAttack(g, me)) { round = 1; mark('storm1'); } return; }
        if (round === 1 && B.t - B.marks.storm1 > 0.6) {
          // second customer
          if (n >= 4 && B.marks.reset1 == null) { mark('reset1'); n = 0; me.res.rage = 0; rage = 0; target = o3; }
          if (U.dist(me, o3) < 20) { face(me, o3); me.cd.light = 0; if (Act.lightAttack(g, me)) { round = 2; mark('storm2'); } return; }
          if (b.owner === me) { me.intent.mx = 0.15; me.intent.my = -0.1; } else steer(me, b.x, b.y, false);
          return;
        }
        if (round === 2) { if (b.owner !== me) steer(me, b.x, b.y, false); else still(me); }
        else if (b.owner !== me && !b.owner) steer(me, b.x, b.y, false); else still(me);
      };
      B.focusFn = () => (round === 2 || (round === 1 && B.t - B.marks.storm1 > 0.8) ? t0focus(me, o3) : t0focus(me, o1));
    },
  });
})();
