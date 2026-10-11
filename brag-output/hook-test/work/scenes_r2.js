/* r2 scenes: in-game echoes for the batch-2 real hooks (R11-R60). Added to BRAG.SCENES after scenes.js loads. */
(function () {
  const { U, Act, PI, place, give, face, steer, still, mark, match, cast, ult, at, noAttack, t0focus } = BRAG.lib;
  const B = BRAG;
  const keep = (g, ...ps) => { for (const q of ps) g.ball.noPickup.set(q.id, 99); };

  Object.assign(B.SCENES, {
    /* dropkick sideways: he flies flat across the pitch into the far wall (kung-fu kick echo) */
    r2_dk_side() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(me, 'heavy_boot'); g.cores.add(me, 'wall_slam');
      place(me, 280, 205, 0); place(o1, 312, 205, PI); place(mate, 160, 270, 0); place(o2, 540, 140, PI);
      give(g, o1);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate);
      let kicked = false;
      B.dir = (dt, g, t) => {
        steer(mate, 160, 270, false); steer(o2, 540, 140, false);
        if (o1.state === 'normal') { o1.intent.mx = -0.15; o1.intent.my = 0; }
        if (!kicked) { face(me, o1); if (t > 0.3) { kicked = Act.hardAttack(g, me); if (kicked) mark('kick'); } return; }
        if (o1.state === 'stun' && B.marks.fly == null) { mark('fly'); o1.kbx = Math.max(o1.kbx, 420); o1.kby = 0; }
        if (me.state === 'normal') still(me);
      };
      B.focusFn = () => (B.marks.fly != null && B.t - B.marks.fly > 0.12 ? o1 : me);
    },

    /* dropkick from above: he's driven down into the bottom wall */
    r2_dk_down() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(me, 'heavy_boot'); g.cores.add(me, 'wall_slam');
      place(me, 320, 230, PI / 2); place(o1, 322, 262, -PI / 2); place(mate, 180, 150, 0); place(o2, 500, 150, PI);
      give(g, o1);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate);
      let kicked = false;
      B.dir = (dt, g, t) => {
        steer(mate, 180, 150, false); steer(o2, 500, 150, false);
        if (o1.state === 'normal') still(o1);
        if (!kicked) { face(me, o1); if (t > 0.3) { kicked = Act.hardAttack(g, me); if (kicked) mark('kick'); } return; }
        if (me.state === 'normal') still(me);
      };
      B.focusFn = () => t0focus(me, o1);
    },

    /* flying kick: a long run-up, he takes off and flies feet-first into the carrier */
    r2_dk_flying() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(me, 'flying_kick'); g.cores.add(me, 'heavy_boot');
      place(me, 200, 205, 0); place(o1, 330, 205, PI); place(mate, 140, 280, 0); place(o2, 540, 150, PI);
      give(g, o1);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate);
      let kicked = false;
      B.dir = (dt, g, t) => {
        steer(mate, 140, 280, false); steer(o2, 540, 150, false);
        if (o1.state === 'normal') { still(o1); face(o1, me); }
        me.res.momentum = 5;
        if (!kicked) {
          steer(me, o1.x - 10, o1.y, true);
          if (t > 0.4 && U.dist(me, o1) < 70) { face(me, o1); kicked = Act.hardAttack(g, me); if (kicked) mark('kick'); }
          return;
        }
        if (me.state === 'normal') still(me);
      };
      B.focusFn = () => (B.marks.kick != null && B.t - B.marks.kick > 0.45 ? o1 : me);
    },

    /* the Neymar roll: the lightest touch, and he rolls... and rolls... and rolls */
    r2_flop_roll() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      place(me, 290, 210, 0); place(o1, 306, 205, 0); place(mate, 160, 270, 0); place(o2, 540, 150, PI);
      give(g, o1);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate); keep(g, o1, o2, mate);
      let touched = false, n = 0, next = 0;
      B.dir = (dt, g, t) => {
        steer(mate, 160, 270, false); steer(o2, 540, 150, false);
        if (!touched) {
          if (g.ball.owner === o1) { o1.intent.mx = 0.35; o1.intent.my = 0; }
          steer(me, o1.x - 6, o1.y + 4, false);
          if (t > 0.6 && U.dist(me, o1) < 14) {
            touched = true; mark('touch'); next = t + 0.12;
            o1.hit({ stun: 3.5, kbx: 60, kby: 0, launch: 60, source: me, type: 'light' });
            g.effects.comic(me.x, me.y - 24, 'tap', '#ffffff', 0.6, 0.5);
          }
          return;
        }
        if (me.state === 'normal') { if (g.ball.owner === me) { me.intent.mx = 0.2; me.intent.my = 0; } else steer(me, g.ball.x, g.ball.y, false); }
        // rolling: a hop, a spin, a groan, again
        if (n < 6 && t >= next && o1.airZ <= 0.5) {
          n++; next = t + 0.3; mark('roll' + n);
          o1.state = 'stun'; o1.stateT = Math.max(o1.stateT, 1.2);
          o1.airVz = 70; o1.airZ = 1; o1.kbx = 110; o1.kby = 0;
          if (n === 2) g.effects.comic(o1.x, o1.y - 24, 'AAARGH', '#ffe14f', 0.9, 0.6);
          if (n === 5) g.effects.comic(o1.x, o1.y - 24, '*rolls*', '#ffffff', 0.9, 0.6);
        }
        if (n > 0 && n < 7) o1.facing += dt * 16;
      };
      B.focusFn = () => (touched ? t0focus(me, o1) : me);
    },

    /* keeper full-stretch save */
    r2_keeper_save() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const G = g.attackGoal(0);
      place(me, G.x - 150, G.y + 20, 0); place(o2, G.x - 18, G.y, PI); place(mate, 220, 270, 0); place(o1, G.x - 200, G.y - 70, PI);
      give(g, me);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate);
      let shot = false, dove = false;
      B.dir = (dt, g, t) => {
        steer(mate, 220, 270, false); steer(o1, G.x - 200, G.y - 70, false);
        const b = g.ball;
        if (!shot) { me.intent.mx = 0.4; me.intent.my = -0.05; steer(o2, G.x - 18, G.y + Math.sin(t * 3) * 6, false); }
        if (!shot && t > 0.7) { face(me, G); Act.shoot(g, me, 1, -0.85); shot = true; mark('shot'); return; }
        if (!shot) return;
        still(me);
        if (!dove && B.t - B.marks.shot > 0.06) { dove = true; mark('dive'); Act.dive(g, o2, -34); }
        if (B.marks.save == null && U.dist(b, o2) < 16 && b.x > o2.x - 20) {
          mark('save'); b.vx = -Math.abs(b.vx) * 0.5; b.vy = -160; b.vz = 120;
          g.effects.comic(o2.x, o2.y - 30, 'SAVED!', '#7fe7ff', 1.3, 0.9); g.effects.flash(0.3); g.effects.shake(4, 0.25); g.sfx('save');
        }
      };
      B.focusFn = () => (shot ? { x: Math.min(g.ball.x, G.x - 40), y: g.ball.y } : me);
    },

    /* keeper clears it with a dropkick (scorpion-kick echo): the striker shoots, the keeper volleys it back out */
    r2_keeper_kick() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(o2, 'heavy_boot');
      const G = g.attackGoal(0);
      place(me, G.x - 170, G.y, 0); place(o2, G.x - 30, G.y, PI); place(mate, 220, 270, 0); place(o1, G.x - 220, G.y - 70, PI);
      give(g, me);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, mate); keep(g, o2);
      let shot = false, kicked = false;
      B.dir = (dt, g, t) => {
        steer(mate, 220, 270, false); steer(o1, G.x - 220, G.y - 70, false);
        const b = g.ball;
        if (!shot) { me.intent.mx = 0.3; me.intent.my = 0; still(o2); face(o2, me); }
        if (!shot && t > 0.6) { face(me, G); Act.shoot(g, me, 0.3, 0); shot = true; mark('shot'); return; }
        if (!shot) return;
        still(me);
        if (!kicked && U.dist(b, o2) < 75 && b.x < o2.x) { face(o2, b); o2.cd.hard = 0; kicked = Act.hardAttack(g, o2); if (kicked) mark('kick'); }
        if (kicked && B.marks.clear == null && o2.state !== 'kick' && b.x > o2.x - 22) { b.vx = Math.min(b.vx, 40); }   // hold it up for the kick
        if (kicked && B.marks.clear == null && o2.state === 'kick' && U.dist(b, o2) < 60) { mark('clear'); b.owner = null; b.vx = -380; b.vy = -60; b.vz = 160; g.effects.comic(o2.x, o2.y - 30, 'NOPE!', '#ffe14f', 1.2, 0.8); g.sfx('kick', 1); }
        if (!kicked && o2.state === 'normal') still(o2);
      };
      B.focusFn = () => (B.marks.clear != null ? { x: Math.max(g.ball.x, 300), y: g.ball.y } : t0focus(me, o2));
    },

    /* SIUUU: he jumps for the celebration... and gets dropkicked mid-air */
    r2_siuu() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(o1, 'heavy_boot');
      place(me, 320, 210, PI / 2); place(o1, 250, 205, 0); place(mate, 200, 280, 0); place(o2, 520, 150, PI);
      give(g, me);
      B.puppets = new Set([o1, o2, mate]); noAttack(o2, mate); keep(g, o1, o2, mate);
      let kicked = false;
      B.dir = (dt, g, t) => {
        steer(mate, 200, 280, false); steer(o2, 520, 150, false);
        if (B.marks.jump == null) { still(me); me.facing = PI / 2; still(o1); face(o1, me); }
        if (B.marks.jump == null && t > 0.35) { mark('jump'); me.airVz = 250; me.airZ = 1; g.effects.comic(me.x, me.y - 30, 'SIUUU!', '#ffe14f', 1.6, 1.2); me.glow('#ffe14f', 1.2); }
        if (B.marks.jump != null && !kicked) {
          steer(o1, me.x - 14, me.y, true);
          if (U.dist(o1, me) < 34) { face(o1, me); o1.cd.hard = 0; kicked = Act.hardAttack(g, o1); if (kicked) mark('kick'); }
        }
        if (kicked && B.marks.hit == null && o1.state === 'kick' && U.dist(o1, me) < 30) {
          mark('hit'); me.state = 'normal'; me.hitImmune = 0;
          me.hit({ stun: 2.5, kbx: 330, kby: 20, launch: 120, source: o1, type: 'hard' });
          g.effects.comic(me.x, me.y - 40, 'SMASH!', '#ff3d5a', 1.3, 0.8); g.effects.flash(0.4); g.effects.shake(6, 0.3);
        }
        if (me.state === 'normal' && B.marks.hit != null) still(me);
        if (kicked && o1.state === 'normal') still(o1);
      };
      B.focusFn = () => (B.marks.hit != null ? t0focus(me, o1) : me);
    },

    /* the miss: empty net, a metre out... off the post */
    r2_miss() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const G = g.attackGoal(0);
      place(me, G.x - 70, G.y - 10, 0); place(o2, G.x - 60, G.y + 110, 0); place(mate, 260, 270, 0); place(o1, G.x - 200, G.y - 70, PI);
      give(g, me);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate); keep(g, o1, o2, mate);
      let shot = false;
      B.dir = (dt, g, t) => {
        steer(mate, 260, 270, false); steer(o1, G.x - 200, G.y - 70, false); still(o2); face(o2, me);
        const b = g.ball;
        if (!shot) { me.intent.mx = 0.25; me.intent.my = 0; }
        if (!shot && t > 0.8) { face(me, G); Act.shoot(g, me, 0.9, -1); shot = true; mark('shot'); return; }
        if (!shot) return;
        still(me);
        // aimed at the post: make sure it hits it and bounces out
        if (B.marks.post == null && b.x > G.x - 8) { mark('post'); b.x = G.x - 8; b.vx = -Math.abs(b.vx) * 0.6; b.vy = -b.vy * 0.4 - 40; g.effects.comic(G.x - 10, g.field.gTop - 16, 'CLANG', '#c7ccd6', 1.2, 0.8); g.sfx('clang'); g.effects.shake(3, 0.2); }
        if (B.marks.post != null && B.marks.facepalm == null && B.t - B.marks.post > 0.5) { mark('facepalm'); g.effects.comic(me.x, me.y - 26, '...', '#ffffff', 1.2, 1.0); }
      };
      B.focusFn = () => (shot ? t0focus(me, g.ball) : me);
    },

    /* own goal: the defender clears it... into his own net */
    r2_own_goal() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      const G = g.attackGoal(0);
      g.cores.add(o1, 'heavy_boot');
      place(o1, G.x - 80, G.y + 4, 0); place(o2, G.x - 110, G.y + 70, PI); place(me, G.x - 200, G.y, 0); place(mate, 220, 270, 0);
      const b = g.ball; b.owner = null; b.x = G.x - 130; b.y = G.y; b.z = 0; b.vx = 120; b.vy = 0;
      B.puppets = new Set([o1, o2, mate]); noAttack(o2, mate); keep(g, o1, o2, mate, me);
      let kicked = false;
      B.dir = (dt, g, t) => {
        steer(mate, 220, 270, false); still(me); face(me, b); still(o2); face(o2, b);
        if (!kicked) { o1.facing = 0; still(o1); if (b.x > o1.x - 30) { o1.cd.hard = 0; kicked = Act.hardAttack(g, o1); if (kicked) mark('kick'); } }   // racing back toward his own goal, the ball comes from behind
        if (kicked && B.marks.boot == null && U.dist(b, o1) < 16) { b.vx = Math.min(b.vx, 15); }
        if (kicked && B.marks.boot == null && o1.state === 'kick' && U.dist(b, o1) < 34) { mark('boot'); b.owner = null; b.vx = 360; b.vy = 0; b.vz = 40; g.sfx('kick', 1); }
        if (B.marks.goal != null && B.marks.oops == null) { mark('oops'); g.effects.comic(o1.x, o1.y - 26, 'oops', '#ffffff', 1.1, 1.0); }
      };
      B.focusFn = () => (B.marks.boot != null ? { x: Math.max(b.x - 40, o1.x), y: G.y } : t0focus(o1, b));
    },

    /* headbutt: a lunge, a BONK, he drops */
    r2_headbutt() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      place(me, 300, 205, 0); place(o1, 322, 205, PI); place(mate, 160, 270, 0); place(o2, 540, 150, PI);
      give(g, o1);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate);
      let butt = false;
      B.dir = (dt, g, t) => {
        steer(mate, 160, 270, false); steer(o2, 540, 150, false);
        if (o1.state === 'normal') { still(o1); face(o1, me); }
        if (!butt) {
          still(me); face(me, o1);
          if (t > 0.55) {
            butt = true; mark('butt');
            me.vx = 160; me.state = 'jab'; me.stateT = 0.15; Act.startAttack(me, 'light');
            g.later(0.08, () => {
              o1.hit({ stun: 3, kbx: 260, kby: 0, launch: 130, source: me, type: 'hard' });
              g.effects.comic((me.x + o1.x) / 2, o1.y - 30, 'BONK!', '#ffffff', 1.5, 0.9); g.effects.flash(0.4); g.effects.shake(6, 0.3); g.effects.impactFrame();
            });
          }
          return;
        }
        if (me.state === 'normal') still(me);
      };
      B.focusFn = () => t0focus(me, o1);
    },

    /* bicycle kick: a lofted ball, he flips and fires it through two defenders (Scissor Kick) */
    r2_scissor() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(me, 'scissor_kick');
      const G = g.attackGoal(0);
      place(me, G.x - 150, G.y + 6, 0); place(o1, G.x - 80, G.y - 26, PI); place(o2, G.x - 24, G.y + 4, PI); place(mate, G.x - 260, G.y + 60, 0);
      const b = g.ball; b.owner = null; b.x = G.x - 230; b.y = G.y + 6; b.z = 30; b.vx = 120; b.vy = 0; b.vz = 40;
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate); keep(g, o1, o2, mate);
      let kicked = false;
      B.dir = (dt, g, t) => {
        steer(mate, G.x - 260, G.y + 60, false); still(o1); face(o1, me); if (!kicked) { still(o2); face(o2, b); }
        still(me); face(me, G);
        if (!kicked && U.dist(b, me) < 40) { me.cd.hard = 0; kicked = Act.hardAttack(g, me); if (kicked) mark('kick'); }
        if (kicked && B.marks.shot == null && U.dist(b, me) < 18) { b.vx = Math.min(b.vx, 20); b.z = Math.min(b.z, 6); }   // waits at his feet for the swing
        if (kicked && B.marks.shot == null && me.state === 'kick' && U.dist(b, me) < 30) { mark('shot'); b.owner = null; b.vx = 520; b.vy = (G.y - b.y) * 2; b.vz = 30; g.effects.comic(me.x, me.y - 30, 'BICYCLE!', '#ff7a3d', 1.3, 0.8); g.effects.flash(0.4); g.sfx('kick', 1); for (const q of [o1, o2]) g.later(0.04 + (q.x - me.x) / 520, () => q.hit({ stun: 2, kbx: 160, kby: q.y < G.y ? -90 : 90, launch: 120, source: me, type: 'hard' })); }
      };
      B.focusFn = () => (B.marks.shot != null ? { x: Math.max(g.ball.x, me.x), y: G.y } : t0focus(me, b));
    },

    /* the curve: Dragon Curl bends it round the keeper into the far corner */
    r2_curve() {
      const g = match({});
      const { mate, me, o1, o2 } = cast(g);
      g.cores.add(me, 'banana_kick');
      const G = g.attackGoal(0);
      place(me, G.x - 230, G.y + 60, 0); place(o2, G.x - 20, G.y + 10, PI); place(o1, G.x - 160, G.y + 30, PI); place(mate, 220, 260, 0);
      give(g, me);
      B.puppets = new Set([o1, o2, mate]); noAttack(o1, o2, mate); keep(g, o1);
      let shot = false;
      B.dir = (dt, g, t) => {
        steer(mate, 220, 260, false); still(o1); face(o1, me);
        if (!shot) { me.intent.mx = 0.35; me.intent.my = 0; steer(o2, G.x - 20, G.y + 10, false); }
        if (!shot && t > 0.6) { face(me, G); Act.shoot(g, me, 1, 0.2); shot = true; mark('shot'); return; }
        if (shot) { still(me); still(o2); face(o2, g.ball); keep(g, o2); }
      };
      B.focusFn = () => (shot ? { x: Math.max(g.ball.x - 30, me.x), y: G.y } : me);
    },
  });
})();
