
    /* P6 the Titan friend: he goes giant and runs straight through his own two teammates first */
    pa_titan() {
      const { g, P, F, E, b } = pvp({});
      const tb = P.tuanbeo, me = P.NGH, kt = P.kaito_04;
      const idle = crowd(g, [[P.zzz_mi, 548, 203], [P.xX_vex_Xx, 430, 175], [P.bigboss99, 445, 240]]);
      place(tb, 236, 206, 0); place(me, 292, 198, 0); place(kt, 330, 214, 0);
      give(g, tb);
      keep(g, me, kt, P.zzz_mi, P.xX_vex_Xx, P.bigboss99);
      at(0.15, () => E.comic(me.x, me.y - 26, 'PASS?', '#ffffff', 0.8, 0.7));
      let fired = false;
      const hitBy = new Set();
      B.dir = (dt, g, t) => {
        idle(t, new Set([tb, me, kt, P.xX_vex_Xx, P.bigboss99]));
        for (const o of [P.xX_vex_Xx, P.bigboss99]) if (o.state === 'normal') { still(o); face(o, tb); }
        if (!fired) { still(tb); face(tb, me); tb.res.ult = 1; if (t > 0.3) { fired = g.cores.activateUltimate(tb); if (fired) mark('ult'); } }
        for (const q of [me, kt]) if (q.state === 'normal' && !hitBy.has(q)) { still(q); if (fired && B.t - B.marks.ult > 0.75) face(q, tb); else q.facing = 0; }
        if (!fired || B.t - B.marks.ult < 0.85) return;
        if (tb.state === 'normal') { tb.intent.mx = 1; tb.intent.my = 0.02; tb.intent.sprint = true; }
        for (const q of [me, kt]) {
          if (hitBy.has(q) || U.dist(tb, q) > 6 * (tb.sizeMul || 1) + q.radius + 4) continue;
          hitBy.add(q); mark(q === me ? 'squish1' : 'squish2');
          smash(q, 160, q.y < tb.y ? -260 : 260, 230, 2.5, tb);
          E.comic(q.x, q.y - 30, q === me ? 'SQUISH!' : 'BONK!', '#ff3d5a', 1.2, 0.8); E.shake(5, 0.25); g.sfx('hit', 'hard');
        }
      };
      B.focusFn = () => ({ x: tb.x + 30, y: 206 });
    },

    /* P7 "don't dropkick me": so I didn't. HUNDRED FISTS instead, the finisher blasts him into the wall */
    pa_dontdk() {
      const { g, P, F, E, b } = pvp({ home: 'neon_strikers', away: 'cyber_united', me: 'xX_vex_Xx' });
      const me = P.xX_vex_Xx, mo = P.mochi;
      const idle = crowd(g, [[P.zzz_mi, 140, 230], [P.bigboss99, 230, 290], [P.DUKE, 548, 203], [P['panda.exe'], 470, 280]]);
      place(me, 292, 128, 0); place(mo, 350, 128, PI);
      give(g, mo);
      keep(g, P.zzz_mi, P.bigboss99, P.DUKE, P['panda.exe']);
      at(0.1, () => E.comic(mo.x, mo.y - 28, "DON'T", '#ffffff', 0.9, 0.9));
      let fired = false, slam = null;
      B.dir = (dt, g, t) => {
        idle(t);
        if (!fired) { still(me); face(me, mo); if (mo.state === 'normal') { still(mo); face(mo, me); } me.res.ult = 1;
          if (t > 0.6) { fired = g.cores.activateUltimate(me); if (fired) mark('ult'); } return; }
        if (me.state === 'normal') still(me);
        if (mo.state === 'normal') still(mo);
        if (!slam && mo.y <= F.y + mo.radius + 2 && B.t - B.marks.ult > 1.2) { slam = { x: mo.x, y: mo.y + 30 }; mark('slam'); }
      };
      B.focusFn = () => slam || t0focus(me, mo);
    },

    /* P8 trash talk vs reality: he dribbles by the top wall... dropkick, WALL SLAM, CRACK, the ball bounces back to us */
    pa_trash() {
      const { g, P, F, E, b } = pvp({ home: 'street_kings', away: 'underground_fc', me: 'tuanbeo' });
      const me = P.tuanbeo, jx = P.jinx;
      g.cores.add(me, 'heavy_boot'); g.cores.add(me, 'wall_slam');
      const idle = crowd(g, [[P.NGH, 330, 270], [P.kaito_04, 200, 220], [P.m0le, 556, 203], [P.ratking, 380, 230]]);
      place(me, 452, 194, -PI / 2); place(jx, 462, 138, PI / 2);
      give(g, jx);
      keep(g, P.NGH, P.kaito_04, P.m0le, P.ratking);
      let kicked = false, stash = 0, back = false;
      B.dir = (dt, g, t) => {
        idle(t);
        if (!kicked) {
          if (jx.state === 'normal') { jx.intent.mx = Math.sin(t * 4.2) * 0.32; jx.intent.my = 0; jx.intent.sprint = false; }
          if (t < 0.95) { still(me); face(me, jx); return; }
          steer(me, jx.x - 2, jx.y + 30, false);
          if (U.dist(me, jx) < 40) { face(me, { x: jx.x + 3, y: jx.y - 10 }); me.cd.hard = 0; kicked = Act.hardAttack(g, me); if (kicked) mark('kick'); }
          return;
        }
        keep(g, jx);
        if (jx.state === 'stun' && B.marks.hit == null) { mark('hit'); if (!b.owner) { b.vx = jx.kbx * 0.15; b.vy = Math.min(-150, jx.kby * 0.6); } }
        if (B.marks.hit != null && B.marks.bonk == null && jx.y <= F.y + jx.radius + 1) mark('bonk');
        if (B.marks.bonk != null && !back) {
          if (!stash) { stash = 1; b.vx = 0; b.vy = -230; }
          else if (b.vy > 0) { const d = U.norm(me.x - b.x, me.y + 3 - b.y), sp = Math.max(140, Math.hypot(b.vx, b.vy)); b.vx = d.x * sp; b.vy = d.y * sp; b.lastKickTeam = -1; b.kind = null; b.noPickup.set(me.id, 0); back = true; mark('back'); }
        }
        if (me.state !== 'normal') return;
        if (b.owner === me) { mark('own'); still(me); face(me, jx); } else if (!b.owner && B.marks.bonk != null) steer(me, b.x, b.y, false); else still(me);
      };
      B.focusFn = () => ({ x: 460, y: 156 });
    },

    /* P9 duo steals the goal: my shot is rolling into the empty net, my duo sprints in and taps it over the line. MINE! */
    pa_steal() {
      const { g, P, F, E, b } = pvp({});
      const me = P.NGH, tb = P.tuanbeo, kp = P.zzz_mi;
      const G = g.attackGoal(0);
      const idle = crowd(g, [[P.kaito_04, 250, 250], [P.bigboss99, G.x - 180, G.y + 100], [P.xX_vex_Xx, 330, 150]]);
      place(me, G.x - 100, G.y + 40, 0); place(tb, G.x - 190, G.y - 48, 0); place(kp, G.x - 30, G.y + 30, PI);
      give(g, me);
      keep(g, tb, kp, P.kaito_04, P.bigboss99, P.xX_vex_Xx);
      let shot = false, tapped = false, dived = false;
      B.dir = (dt, g, t) => {
        idle(t);
        if (!shot) { still(me); face(me, G); still(tb); face(tb, G); if (kp.state === 'normal') { still(kp); face(kp, me); } }
        if (!shot && t > 0.4) { Act.shoot(g, me, 0, -0.5); shot = true; mark('shot'); }
        if (!shot) return;
        keep(g, me);
        if (me.state === 'normal') { still(me); face(me, b); }
        if (!dived && B.t - B.marks.shot > 0.12) { dived = true; Act.dive(g, kp, 40); mark('dive'); }
        if (dived && kp.state === 'normal') { still(kp); kp.poseEnd = 99; }
        if (!tapped && !b.owner) {
          const tx = G.x + 6, ty = G.y - 22, d = U.norm(tx - b.x, ty - b.y);
          const sp = Math.max(46, 110 - (B.t - B.marks.shot) * 160);
          b.vx = d.x * sp; b.vy = d.y * sp; b.z = Math.min(b.z, 2); b.vz = 0;
        }
        if (!tapped) {
          if (B.t - B.marks.shot > 0.2) { steer(tb, b.x - 4, b.y, true); tb.stamina = 99; } else still(tb);
          if (U.dist(tb, b) < 9 && b.x > G.x - 22) {
            tapped = true; mark('tap'); b.noPickup.set(tb.id, 0); g.gainPossession(tb); face(tb, G); Act.shoot(g, tb, 0, -0.4);
            E.comic(tb.x, tb.y - 30, 'MINE!', '#ffe14f', 1.1, 0.8);
          }
        } else if (tb.state === 'normal') still(tb);
      };
      B.focusFn = () => (B.marks.tap != null ? { x: G.x - 40, y: G.y - 10 } : { x: Math.max(b.x, G.x - 90) - 20, y: b.y - 6 });
    },

    /* P10 the meteor lands: their DUKE leaps off the map, the shadow follows our three... METEOR DROP on all of us */
    pa_meteor() {
      const { g, P, F, E, b } = pvp({ home: 'street_kings', away: 'cyber_united' });
      const me = P.NGH, tb = P.tuanbeo, kt = P.kaito_04, dk = P.DUKE;
      const idle = crowd(g, [[P.mochi, 470, 150], [P['panda.exe'], 490, 262]]);
      place(me, 318, 206, 0); place(tb, 336, 184, 0); place(kt, 334, 230, 0); place(dk, 405, 206, PI);
      give(g, me);
      keep(g, tb, kt, dk, P.mochi, P['panda.exe']);
      let fired = false;
      B.dir = (dt, g, t) => {
        idle(t);
        if (!fired) { still(dk); face(dk, me); dk.res.ult = 1; if (t > 0.25) { fired = g.cores.activateUltimate(dk); if (fired) mark('ult'); } }
        if (dk.state === 'meteor') { mark('air'); steer(dk, (me.x + tb.x + kt.x) / 3, (me.y + tb.y + kt.y) / 3, true); }
        if (B.marks.land == null && fired && dk.state !== 'meteor' && B.marks.air != null) mark('land');
        // our three: keep jogging on... then panic and bunch up
        const k = fired ? B.t - B.marks.ult : -1;
        for (const [q, oy] of [[me, 0], [tb, -20], [kt, 22]]) {
          if (q.state !== 'normal') continue;
          if (k < 0.9) { if (q === me) { q.intent.mx = 0.25; q.intent.my = 0; } else steer(q, me.x + 16, me.y + oy, false); }
          else { const a = t * 9 + q.id; q.intent.mx = Math.cos(a) * 0.5; q.intent.my = Math.sin(a) * 0.5; q.intent.sprint = false; }
        }
      };
      B.focusFn = () => ({ x: (me.x + tb.x + kt.x) / 3 + 10, y: 206 });
    },

    /* P11 3 friends vs 3 strangers: their striker has the ball, the three of us dropkick him at once, then walk it in */
    pa_strangers() {
      const { g, P, F, E, b } = pvp({ home: 'street_kings', away: 'underground_fc' });
      const me = P.NGH, tb = P.tuanbeo, kt = P.kaito_04, rk = P.ratking, kp = P.m0le;
      const G = g.attackGoal(0);
      for (const q of [me, tb, kt]) g.cores.add(q, 'heavy_boot');
      const idle = crowd(g, [[P.jinx, 330, 118], [kp, G.x - 22, G.y]]);
      place(rk, 420, 205, PI); place(me, 376, 207, 0); place(tb, 424, 162, PI / 2); place(kt, 424, 250, -PI / 2);
      give(g, rk);
      keep(g, tb, kt, P.jinx, kp);
      let kicked = false, shot = false;
      B.dir = (dt, g, t) => {
        idle(t, new Set(shot ? [] : [kp]));
        if (!shot && kp.state === 'normal') { steer(kp, G.x - 22, G.y + Math.sin(t * 2) * 6, false); face(kp, b); }
        if (shot && kp.state === 'normal') { steer(kp, G.x - 24, G.y + 44, true); keep(g, kp); }
        if (!kicked) {
          if (rk.state === 'normal') { still(rk); face(rk, me); }
          for (const q of [me, tb, kt]) { still(q); face(q, rk); }
          if (t > 0.75) { for (const q of [me, tb, kt]) { q.cd.hard = 0; face(q, rk); Act.hardAttack(g, q); } kicked = true; mark('kick'); }
          return;
        }
        keep(g, rk);
        if (rk.state === 'stun' && B.marks.fly == null) { mark('fly'); rk.kbx = 330; rk.kby = -30; rk.airVz = Math.max(rk.airVz, 260); E.comic(rk.x, rk.y - 36, 'TRIPLE!', '#ffe14f', 1.5, 0.9); }
        for (const q of [tb, kt]) if (q.state === 'normal') still(q);
        if (me.state !== 'normal') return;
        if (shot) { still(me); return; }
        if (b.owner !== me) { if (B.marks.fly != null) steer(me, b.x, b.y, false); return; }
        mark('own');
        if (B.t - B.marks.own < 0.3) { me.intent.mx = 0.4; me.intent.my = 0; return; }
        face(me, G); Act.shoot(g, me, 0.8, -0.35); shot = true; mark('shot');
      };
      B.focusFn = () => (shot ? { x: Math.max(b.x, 470), y: 203 } : B.marks.fly != null ? { x: U.clamp((me.x + rk.x) / 2, 420, 480), y: 203 } : { x: 410, y: 206 });
    },

    /* P12 rage quit: I dropkick him off the ball, he LEFT (the game's own banner)... and the AI that takes over steals it and scores */
    pa_ragequit() {
      const { g, P, F, E, b } = pvp({});
      const me = P.NGH, vx = P.xX_vex_Xx, kp = P.kaito_04;
      const H = g.ownGoal(0);
      g.cores.add(me, 'heavy_boot');
      const idle = crowd(g, [[P.tuanbeo, 250, 120], [P.bigboss99, 300, 270], [P.zzz_mi, 520, 203]]);
      place(vx, 222, 206, PI); place(me, 176, 210, 0); place(kp, H.x + 22, H.y, 0);
      give(g, vx);
      keep(g, kp, P.tuanbeo, P.bigboss99, P.zzz_mi);
      let kicked = false, back = false, stole = false, shot = false;
      B.dir = (dt, g, t) => {
        idle(t);
        if (!shot && kp.state === 'normal') { steer(kp, H.x + 22, U.clamp(b.y, H.y - 20, H.y + 20), false); face(kp, b); }
        if (!kicked) {
          if (vx.state === 'normal') { vx.intent.mx = -0.3; vx.intent.my = 0; }
          still(me); face(me, vx);
          if (t > 0.3 && U.dist(me, vx) < 34) { me.cd.hard = 0; face(me, vx); kicked = Act.hardAttack(g, me); if (kicked) mark('kick'); }
          return;
        }
        if (vx.state === 'stun' && B.marks.fly == null) { mark('fly'); vx.kbx = Math.max(vx.kbx, 200); }
        if (B.marks.left == null && B.marks.fly != null && B.t - B.marks.fly > 0.75) { mark('left'); SFC.UI.banner('xX_vex_Xx LEFT', 'AI takes over', '#9aa3b5', 1.6); }
        // the AI takes over: straight up, straight at me
        if (!back && B.marks.left != null && B.t - B.marks.left > 0.55) { back = true; mark('ai'); vx.state = 'normal'; vx.stateT = 0; vx.airZ = 0; vx.kbx = vx.kby = 0; }
        if (!stole) {
          free(g, me); keep(g, vx);
          if (me.state === 'normal') { if (b.owner !== me) steer(me, b.x, b.y, false); else { me.intent.mx = 0.22; me.intent.my = 0; } }
          if (back && vx.state === 'normal') {
            steer(vx, me.x + 14, me.y, true);
            if (U.dist(vx, me) < 24 && b.owner === me) { vx.cd.light = 0; vx.stats = Object.assign({}, vx.stats, { tackle: 9 }); face(vx, me); if (Act.lightAttack(g, vx)) { stole = true; mark('steal'); } }
          }
          return;
        }
        keep(g, me); free(g, vx);
        if (me.state === 'normal') still(me);
        if (vx.state !== 'normal' || shot) { if (shot) still(vx); return; }
        if (b.owner !== vx) { steer(vx, b.x, b.y, true); return; }
        mark('own');
        if (B.t - B.marks.own < 0.2) { still(vx); face(vx, H); return; }
        face(vx, H); Act.shoot(g, vx, 0.9, -0.5); shot = true; mark('shot'); keep(g, kp);
        if (kp.state === 'normal') { kp.cd.skill = 0; Act.dive(g, kp, 30); }
      };
      B.focusFn = () => (shot ? { x: Math.min(Math.max(b.x, 110), 200), y: 203 } : { x: U.clamp((me.x + vx.x) / 2, 150, 260), y: 206 });
    },
