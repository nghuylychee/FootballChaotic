
    /* P19 celebrating in front of me: he scores, runs over and does the SIUUU jump right in my face... dropkick mid-air */
    pa_celebrate() {
      const { g, P, F, E, b } = pvp({ home: 'street_kings', away: 'underground_fc' });
      const me = P.NGH, ml = P.m0le, kp = P.kaito_04;
      const H = g.ownGoal(0);
      g.cores.add(me, 'heavy_boot');
      const idle = crowd(g, [[P.tuanbeo, 230, 120], [P.jinx, 300, 270], [P.ratking, 330, 160]]);
      place(ml, H.x + 92, H.y + 30, PI); place(kp, H.x + 20, H.y - 8, 0); place(me, H.x + 150, H.y + 6, PI);
      give(g, ml);
      keep(g, kp, me, P.tuanbeo, P.jinx, P.ratking);
      let shot = false, resumed = false, jumped = false, kicked = false;
      B.dir = (dt, g, t) => {
        idle(t);
        if (!shot) {
          still(ml); face(ml, H); still(kp); face(kp, ml); still(me); face(me, ml);
          if (t > 0.15) { face(ml, { x: H.x, y: H.y + 18 }); Act.shoot(g, ml, 0.9, 0.4); shot = true; mark('shot'); keep(g, kp, ml); kp.cd.skill = 0; Act.dive(g, kp, -40);
            g.later(0.75, () => { if (g.state === 'goal') { g.state = 'play'; resumed = true; mark('resume'); give(g, kp); keep(g, kp); } }); }
          return;
        }
        if (!resumed) return;
        if (kp.state === 'normal') { still(kp); }
        // he runs out to me...
        if (!jumped) {
          if (ml.state === 'normal') steer(ml, me.x - 26, me.y - 2, true);
          still(me); face(me, ml);
          if (U.dist(ml, me) < 32) { jumped = true; mark('jump'); still(ml); ml.facing = PI / 2; ml.airVz = 250; ml.airZ = 1; E.comic(ml.x, ml.y - 30, 'SIUUU!', '#ffe14f', 1.6, 1.2); ml.glow('#6bff4f', 1.2); }
          return;
        }
        if (!kicked && B.t - B.marks.jump > 0.12) { face(me, ml); me.cd.hard = 0; kicked = Act.hardAttack(g, me); if (kicked) mark('kick'); }
        if (kicked && B.marks.hit == null && me.state === 'kick' && U.dist(me, ml) < 30) {
          mark('hit'); smash(ml, -330, -20, 120, 2.5, me);
          E.comic(ml.x, ml.y - 40, 'SMASH!', '#ff3d5a', 1.3, 0.8); E.flash(0.4); E.shake(6, 0.3);
        }
        if (me.state === 'normal' && kicked) still(me);
        if (ml.state === 'normal' && B.marks.hit == null) still(ml);
      };
      B.focusFn = () => (B.marks.resume == null ? { x: H.x + 100, y: H.y + 6 } : { x: U.clamp((me.x + ml.x) / 2, 120, 220), y: H.y });
    },

    /* P20 "I'm a pro": a slick dodge past the defender, open net from 5 metres... off the post */
    pa_pro() {
      const { g, P, F, E, b } = pvp({ home: 'cyber_united', away: 'underground_fc', me: 'mochi' });
      const me = P.mochi, jx = P.jinx, kp = P.m0le;
      const G = g.attackGoal(0);
      const idle = crowd(g, [[P.DUKE, 300, 150], [P['panda.exe'], 330, 275], [P.ratking, 360, 120], [kp, G.x - 70, G.y - 95]]);
      place(me, 404, 214, 0); place(jx, 470, 212, PI);
      give(g, me);
      keep(g, jx, kp, P.DUKE, P['panda.exe'], P.ratking);
      let dodged = false, shot = false;
      B.dir = (dt, g, t) => {
        idle(t, new Set([jx]));
        if (jx.state === 'normal') { if (!dodged) { steer(jx, me.x + 16, me.y, false); } else { still(jx); face(jx, me); } }
        if (me.state !== 'normal') return;
        if (shot) { still(me); }
        else if (b.owner === me) {
          if (t < 0.3) { still(me); face(me, jx); }
          else if (!dodged && U.dist(me, jx) < 30) { me.cd.skill = 0; Act.skill(g, me, 0.5, -1); dodged = true; mark('dodge'); }
          else if (dodged && B.t - B.marks.dodge > 0.25 && me.x > G.x - 90) { face(me, { x: G.x, y: F.gBot - 2 }); Act.shoot(g, me, 0.85, 1); shot = true; mark('shot'); }
          else steer(me, G.x - 80, G.y + 18, dodged);
        } else if (!shot) steer(me, b.x, b.y, true);
        if (shot && B.marks.post == null && b.x > G.x - 8) {
          mark('post'); b.x = G.x - 8; b.y = Math.min(b.y, F.gBot + 2); b.vx = -Math.abs(b.vx) * 0.55; b.vy = 60; b.z = Math.min(b.z, 6);
          E.comic(G.x - 10, F.gBot + 14, 'CLANG', '#c7ccd6', 1.2, 0.8); g.sfx('clang'); E.shake(3, 0.2);
        }
        if (B.marks.post != null && B.marks.dots == null && B.t - B.marks.post > 0.5) { mark('dots'); E.comic(me.x, me.y - 26, '...', '#ffffff', 1.2, 1.2); }
      };
      B.focusFn = () => (shot ? { x: G.x - 50, y: U.clamp(b.y, 200, 240) } : { x: Math.max(me.x + 20, 430), y: 214 });
    },

    /* P21 the quiet one: says nothing all game... LIGHTNING DASH through all three of them, walks it in */
    pa_quiet() {
      const { g, P, F, E, b } = pvp({ me: 'kaito_04' });
      const me = P.kaito_04;
      const G = g.attackGoal(0);
      const idle = crowd(g, [[P.NGH, 230, 140], [P.tuanbeo, 220, 275]]);
      const foes = [[P.xX_vex_Xx, 372, 200], [P.bigboss99, 424, 212], [P.zzz_mi, 474, 198]];
      for (const [q, x, y] of foes) place(q, x, y, PI);
      place(me, 304, 205, 0);
      give(g, me);
      keep(g, P.NGH, P.tuanbeo, ...foes.map((f) => f[0]));
      let fired = false, shot = false;
      B.dir = (dt, g, t) => {
        idle(t);
        for (const [q] of foes) if (q.state === 'normal') { if (!fired) steer(q, me.x + 50 + (q.x - me.x) * 0.0, q.y, false); else still(q); face(q, me); }
        if (me.state !== 'normal') return;
        if (!fired) { me.intent.mx = 0.25; me.intent.my = 0; me.res.ult = 1; if (t > 0.6) { fired = g.cores.activateUltimate(me); if (fired) mark('ult'); } return; }
        if (shot) { still(me); return; }
        if (b.owner !== me) { if (!b.owner) steer(me, b.x, b.y, false); return; }
        if (B.t - B.marks.ult < 0.7) { me.intent.mx = 0.6; me.intent.my = 0; return; }
        mark('own');
        if (G.x - me.x > 70) { steer(me, G.x - 60, G.y, false); return; }
        face(me, G); Act.shoot(g, me, 0.5, 0.2); shot = true; mark('shot');
      };
      B.focusFn = () => (shot ? { x: Math.max(b.x - 30, 460), y: 205 } : { x: Math.max(me.x + 40, 360), y: 205 });
    },

    /* P22 the duo syncs: ENDLESS TIKI-TAKA, the other team slows to a crawl, four golden one-touch passes between the two of them, max shot */
    pa_sync() {
      const { g, P, F, E, b } = pvp({ home: 'cyber_united', away: 'neon_strikers', me: 'mochi' });
      const me = P.mochi, pd = P['panda.exe'], kp = P.zzz_mi, o1 = P.bigboss99;
      const G = g.attackGoal(0);
      const idle = crowd(g, [[P.DUKE, 220, 250], [P.xX_vex_Xx, 480, 140]]);
      place(me, 410, 184, 0); place(pd, 400, 232, 0); place(o1, 452, 208, PI); place(kp, G.x - 20, G.y, PI);
      give(g, me);
      keep(g, P.DUKE, P.xX_vex_Xx);
      let fired = false;
      B.dir = (dt, g, t) => {
        idle(t);
        if (!fired) { still(me); face(me, G); still(pd); me.res.ult = 1; if (t > 0.3) { fired = g.cores.activateUltimate(me); if (fired) mark('ult'); } }
        if (o1.state === 'normal') steer(o1, b.x, b.y, true);
        if (b.kind === 'shot' && b.owner == null && B.marks.ult != null && B.t - B.marks.ult > 1.0) mark('shot');
        if (B.marks.shot != null) { keep(g, kp, o1); steer(kp, G.x - 22, b.y > G.y ? G.y - 40 : G.y + 40, true); }
        else steer(kp, G.x - 20, G.y + Math.sin(t * 2) * 6, false);
        if (fired) { if (me.state === 'normal' && b.owner !== me) still(me); if (pd.state === 'normal' && b.owner !== pd) still(pd); }
      };
      B.focusFn = () => (B.marks.shot != null ? g.ball : { x: (me.x + pd.x) / 2 + 20, y: (me.y + pd.y) / 2 });
    },

    /* P23 nobody keeps: street 3v3 has no fixed keeper. All three of us step out of the box at once; their striker walks it in */
    pa_keeper() {
      const { g, P, F, E, b } = pvp({ home: 'street_kings', away: 'underground_fc' });
      const me = P.NGH, tb = P.tuanbeo, kt = P.kaito_04, rk = P.ratking;
      const H = g.ownGoal(0);
      const idle = crowd(g, [[P.jinx, 290, 120], [P.m0le, 470, 220]]);
      place(kt, H.x + 30, H.y + 4, 0); place(tb, H.x + 52, H.y - 44, 0); place(me, H.x + 56, H.y + 50, 0); place(rk, 238, 198, PI);
      give(g, rk);
      keep(g, kt, tb, me, P.jinx, P.m0le);
      const outs = [[kt, H.x + 112, H.y - 6], [tb, H.x + 100, H.y - 96], [me, H.x + 104, H.y + 92]];
      at(0.95, () => { for (const [q] of outs) E.comic(q.x, q.y - 24, 'NOT ME', '#ffffff', 0.75, 0.8); mark('notme'); });
      let shot = false;
      B.dir = (dt, g, t) => {
        idle(t);
        for (const [q, x, y] of outs) if (q.state === 'normal') { if (t < 1.0) { still(q); face(q, rk); } else { steer(q, x, y, true); } }
        if (rk.state !== 'normal') return;
        if (shot) { still(rk); return; }
        if (t < 1.25) { rk.intent.mx = -0.3; rk.intent.my = 0.02; rk.intent.sprint = false; return; }
        if (rk.x > H.x + 110) { rk.intent.mx = -0.55; rk.intent.my = 0; return; }
        face(rk, H); Act.shoot(g, rk, 0.25, 0); shot = true; mark('shot');
      };
      B.focusFn = () => ({ x: U.clamp(Math.min(rk.x, b.x) - 40, 120, 200), y: 203 });
    },

    /* P24 "what does your ultimate do?": CLONE ARMY, four of him pour out and mug me for the ball */
    pa_reveal() {
      const { g, P, F, E, b } = pvp({});
      const me = P.NGH, zm = P.zzz_mi;
      const idle = crowd(g, [[P.tuanbeo, 220, 130], [P.kaito_04, 200, 270], [P.bigboss99, 470, 270], [P.xX_vex_Xx, 560, 203]]);
      place(me, 300, 208, 0); place(zm, 368, 202, PI);
      give(g, me);
      keep(g, P.tuanbeo, P.kaito_04, P.bigboss99, P.xX_vex_Xx);
      let fired = false;
      B.dir = (dt, g, t) => {
        idle(t);
        if (!fired) { still(zm); face(zm, me); zm.res.ult = 1; if (t > 0.55) { fired = g.cores.activateUltimate(zm); if (fired) mark('ult'); } }
        if (me.state === 'normal') { if (b.owner === me) { me.intent.mx = fired ? 0.12 : 0.05; me.intent.my = 0; } else still(me); }
        if (fired && me.state === 'stun' && B.marks.mugged == null) mark('mugged');
        if (fired && zm.state === 'normal' && B.t - B.marks.ult > 0.7) { if (b.owner === zm) { zm.intent.mx = -0.25; zm.intent.my = 0.1; } else if (!b.owner) steer(zm, b.x, b.y, false); else still(zm); }
        else if (zm.state === 'normal') still(zm);
      };
      B.focusFn = () => ({ x: U.clamp((me.x + zm.x) / 2, 300, 360), y: 205 });
    },

    /* P25 last second, 2-2: their defender's huge clearance hits his own teammate in the back... and flies into their own net. GOAL x2 */
    pa_lastsecond() {
      const { g, P, F, E, b } = pvp({});
      const bb = P.bigboss99, vx = P.xX_vex_Xx, kp = P.zzz_mi, me = P.NGH;
      const G = g.attackGoal(0);
      g.teams[0].score = 2; g.teams[1].score = 2;
      g.elapsed = g.cfg.match.duration - (B.paRem || 3.2); g.finalPush = true; g.cfg.match.goldenGoal = false;
      g.cores.add(bb, 'heavy_boot');
      const idle = crowd(g, [[P.tuanbeo, 400, 140], [P.kaito_04, 300, 260]]);
      place(bb, G.x - 92, G.y + 4, PI); place(vx, G.x - 122, G.y + 2, PI); place(kp, G.x - 22, G.y - 6, PI); place(me, G.x - 190, G.y + 40, 0);
      loose(g, G.x - 200, G.y + 10); b.vx = 150; b.vy = -4;
      keep(g, ...g.players);
      let kicked = false, booted = false, bonk = false;
      B.dir = (dt, g, t) => {
        idle(t);
        if (me.state === 'normal') { steer(me, G.x - 170, G.y + 30, false); face(me, b); }
        if (kp.state === 'normal' && !bonk) { still(kp); face(kp, b); }
        if (vx.state === 'normal' && !bonk) { still(vx); vx.facing = PI; }
        if (!kicked) { still(bb); face(bb, b); if (b.x > bb.x - 52) { bb.cd.hard = 0; face(bb, b); kicked = Act.hardAttack(g, bb); if (kicked) mark('kick'); } return; }
        if (!booted && bb.state === 'kick' && U.dist(b, bb) < 36) { booted = true; mark('boot'); b.kick(bb, -380, (vx.y - b.y) * 2, 26); b.kind = 'pass'; g.sfx('kick', 1); }
        if (booted && !bonk && U.dist(b, vx) < 10) {
          bonk = true; mark('bonk');
          b.kick(vx, 420, (G.y - 12 - b.y) * 2.4, 30); b.kind = 'shot';
          E.comic(vx.x, vx.y - 30, 'BONK', '#ffffff', 1.1, 0.8); g.sfx('hit', 'light');
          if (kp.state === 'normal') { kp.cd.skill = 0; Act.dive(g, kp, 40); }
        }
        if (bonk) { if (kp.state === 'normal') { still(kp); kp.poseEnd = 99; } }
        if (bb.state === 'normal') still(bb);
      };
      B.focusFn = () => ({ x: G.x - 80, y: G.y });
    },
