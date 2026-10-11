    /* P6 the Titan friend (again): TITAN, double size, he bowls their whole defence over and walks it in */
    pa_titan() {
      const { g, P, F, E, b } = pvp({});
      const tb = P.tuanbeo, kp = P.zzz_mi, o1 = P.xX_vex_Xx, o2 = P.bigboss99;
      const G = g.attackGoal(0);
      const idle = crowd(g, [[P.NGH, 250, 140], [P.kaito_04, 205, 262]]);
      place(tb, 262, 206, 0); place(o1, 352, 198, PI); place(o2, 400, 214, PI); place(kp, G.x - 22, G.y, PI);
      give(g, tb);
      keep(g, P.NGH, P.kaito_04, o1, o2, kp);
      let fired = false, shot = false;
      B.dir = (dt, g, t) => {
        idle(t);
        if (!shot && kp.state === 'normal') { steer(kp, G.x - 22, G.y + Math.sin(t * 2) * 6, false); face(kp, tb); }
        if (shot && kp.state === 'normal') steer(kp, G.x - 24, G.y - 40, true);
        for (const o of [o1, o2]) {
          if (o.state === 'stun' && B.marks['bowl_' + o.name] == null) mark('bowl_' + o.name);
          if (o.state !== 'normal') continue;
          if (fired && B.t - B.marks.ult > 0.75 && B.marks['bowl_' + o.name] == null) steer(o, tb.x + 14, tb.y + (o === o1 ? -4 : 6), true); else { still(o); face(o, tb); }
        }
        if (!fired) { still(tb); face(tb, G); tb.res.ult = 1; if (t > 0.3) { fired = g.cores.activateUltimate(tb); if (fired) mark('ult'); } return; }
        if (tb.state !== 'normal' || shot) { if (shot) still(tb); return; }
        if (B.t - B.marks.ult < 0.75) { still(tb); return; }
        if (b.owner !== tb) { steer(tb, b.x, b.y, true); return; }
        if (G.x - tb.x > 100) { tb.intent.mx = 1; tb.intent.my = (G.y - tb.y) * 0.02; tb.intent.sprint = true; return; }
        face(tb, G); Act.shoot(g, tb, 0.9, -0.3); shot = true; mark('shot'); keep(g, kp);
      };
      B.focusFn = () => (shot ? { x: Math.max(b.x - 20, 440), y: 205 } : { x: tb.x + 40, y: 206 });
    },
    /* P7 "don't dropkick me": so I didn't. HUNDRED FISTS instead (bigboss99's signature), the finisher blasts him into the wall */
    pa_dontdk() {
      const { g, P, F, E, b } = pvp({ home: 'neon_strikers', away: 'cyber_united', me: 'bigboss99' });
      const me = P.bigboss99, mo = P.mochi;
      const idle = crowd(g, [[P.zzz_mi, 140, 230], [P.xX_vex_Xx, 230, 290], [P.DUKE, 548, 203], [P['panda.exe'], 470, 280]]);
      place(me, 292, 128, 0); place(mo, 350, 128, PI);
      give(g, mo);
      keep(g, P.zzz_mi, P.xX_vex_Xx, P.DUKE, P['panda.exe']);
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
    /* P10 the meteor lands: their panda.exe leaves the map (METEOR DROP), the shadow follows our three... on all of us */
    pa_meteor() {
      const { g, P, F, E, b } = pvp({ home: 'street_kings', away: 'cyber_united' });
      const me = P.NGH, tb = P.tuanbeo, kt = P.kaito_04, dk = P['panda.exe'];
      const idle = crowd(g, [[P.mochi, 470, 150], [P.DUKE, 490, 262]]);
      place(me, 318, 206, 0); place(tb, 336, 184, 0); place(kt, 334, 230, 0); place(dk, 405, 206, PI);
      give(g, me);
      keep(g, tb, kt, dk, P.mochi, P.DUKE);
      let fired = false;
      B.dir = (dt, g, t) => {
        idle(t);
        if (!fired) { still(dk); face(dk, me); dk.res.ult = 1; if (t > 0.25) { fired = g.cores.activateUltimate(dk); if (fired) mark('ult'); } }
        if (dk.state === 'meteor') { mark('air'); steer(dk, (me.x + tb.x + kt.x) / 3, (me.y + tb.y + kt.y) / 3, true); }
        if (B.marks.land == null && fired && dk.state !== 'meteor' && B.marks.air != null) mark('land');
        const k = fired ? B.t - B.marks.ult : -1;
        for (const [q, oy] of [[me, 0], [tb, -20], [kt, 22]]) {
          if (q.state !== 'normal') continue;
          if (k < 0.9) { if (q === me) { q.intent.mx = 0.25; q.intent.my = 0; } else steer(q, me.x + 16, me.y + oy, false); }
          else { const a = t * 9 + q.id; q.intent.mx = Math.cos(a) * 0.5; q.intent.my = Math.sin(a) * 0.5; q.intent.sprint = false; }
        }
      };
      B.focusFn = () => ({ x: (me.x + tb.x + kt.x) / 3 + 10, y: 206 });
    },
    /* P12 rage quit: I punch the ball off him, he LEFT (the game's own banner)... the AI that takes over punches it back and scores */
    pa_ragequit() {
      const { g, P, F, E, b } = pvp({});
      const me = P.NGH, vx = P.xX_vex_Xx, kp = P.kaito_04;
      const H = g.ownGoal(0);
      const idle = crowd(g, [[P.tuanbeo, 250, 120], [P.bigboss99, 300, 270], [P.zzz_mi, 520, 203]]);
      place(vx, 214, 206, PI); place(me, 176, 210, 0); place(kp, H.x + 22, H.y, 0);
      vx.stats = Object.assign({}, vx.stats, { dribble: 0.05 });   // both steals land first time (no HOLD)
      me.stats = Object.assign({}, me.stats, { dribble: 0.05 });
      give(g, vx);
      keep(g, kp, P.tuanbeo, P.bigboss99, P.zzz_mi);
      let punched = false, back = false, stole = false, shot = false;
      B.dir = (dt, g, t) => {
        idle(t);
        if (!shot && kp.state === 'normal') { steer(kp, H.x + 22, U.clamp(b.y, H.y - 20, H.y + 20), false); face(kp, b); }
        if (!punched) {
          if (vx.state === 'normal') { vx.intent.mx = -0.3; vx.intent.my = 0; }
          still(me); face(me, vx);
          if (t > 0.3 && U.dist(me, vx) < 24) { me.cd.light = 0; face(me, vx); punched = Act.lightAttack(g, me); if (punched) mark('punch'); }
          return;
        }
        if (B.marks.left == null && B.t - B.marks.punch > 0.6) { mark('left'); SFC.UI.banner('xX_vex_Xx LEFT', 'AI takes over', '#9aa3b5', 1.6); }
        if (!back && B.marks.left != null && B.t - B.marks.left > 0.3 && vx.state === 'normal') { back = true; mark('ai'); }
        if (!stole) {
          free(g, me); keep(g, vx);
          if (me.state === 'normal') { if (b.owner !== me) steer(me, b.x, b.y, false); else { still(me); face(me, vx); } }
          if (vx.state === 'normal') {
            if (!back) { still(vx); face(vx, me); }
            else {
              steer(vx, me.x + 14, me.y, true);
              if (U.dist(vx, me) < 24 && b.owner === me) { vx.cd.light = 0; face(vx, me); if (Act.lightAttack(g, vx)) { stole = true; mark('steal'); } }
            }
          }
          return;
        }
        keep(g, me); free(g, vx);
        if (me.state === 'normal') still(me);
        if (vx.state !== 'normal' || shot) { if (shot) still(vx); return; }
        if (b.owner !== vx) { steer(vx, b.x, b.y, true); return; }
        mark('own');
        if (B.t - B.marks.own < 0.12) { still(vx); face(vx, H); return; }
        face(vx, H); Act.shoot(g, vx, 0.9, -0.5); shot = true; mark('shot'); keep(g, kp);
        if (kp.state === 'normal') { kp.cd.skill = 0; Act.dive(g, kp, 30); }
      };
      B.focusFn = () => (shot ? { x: Math.min(Math.max(b.x, 110), 200), y: 203 } : { x: U.clamp((me.x + vx.x) / 2, 150, 260), y: 206 });
    },
    /* P13 the friend who never passes: two of us wide open shouting PASS... two of theirs dropkick him off the ball */
    pa_nopass() {
      const { g, P, F, E, b } = pvp({});
      const tb = P.tuanbeo, me = P.NGH, kt = P.kaito_04, o1 = P.xX_vex_Xx, o2 = P.bigboss99;
      for (const q of [o1, o2]) g.cores.add(q, 'heavy_boot');
      const G = g.attackGoal(0);
      const idle = crowd(g, [[P.zzz_mi, G.x - 22, G.y]]);
      place(tb, 236, 206, 0); place(me, 262, 152, 0); place(kt, 262, 260, 0); place(o1, 372, 190, PI); place(o2, 380, 224, PI);
      give(g, tb);
      keep(g, me, kt, P.zzz_mi, o1, o2);
      at(0.2, () => E.comic(me.x, me.y - 24, 'PASS!', '#ffffff', 0.9, 0.7));
      at(0.6, () => E.comic(kt.x, kt.y - 24, 'PASS!!', '#ffffff', 1.0, 0.7));
      at(1.0, () => E.comic(me.x, me.y - 24, 'PASS!!!', '#ff3d5a', 1.15, 0.7));
      let kicked = false;
      B.dir = (dt, g, t) => {
        idle(t);
        if (!kicked) {
          if (b.owner === tb) { tb.intent.mx = 0.5; tb.intent.my = 0; tb.intent.sprint = false; }
          steer(me, tb.x + 22, 152, false); steer(kt, tb.x + 22, 260, false);
          for (const o of [o1, o2]) { if (t < 0.85) { still(o); face(o, tb); } else steer(o, tb.x + 18, tb.y + (o === o1 ? -7 : 7), true); }
          if (t > 0.85 && U.dist(o1, tb) < 32 && U.dist(o2, tb) < 36) { for (const o of [o1, o2]) { o.cd.hard = 0; face(o, tb); Act.hardAttack(g, o); } kicked = true; mark('kick'); }
          return;
        }
        for (const o of [o1, o2]) if (o.state === 'kick' || o.state === 'windup') o.hardLanded = true;
        if (tb.state === 'stun' && B.marks.hit == null) { mark('hit'); E.comic(tb.x, tb.y - 34, 'DOUBLE!', '#ffe14f', 1.4, 0.9); }
        for (const q of [me, kt]) if (q.state === 'normal') { still(q); face(q, tb); }
        if (B.marks.hit != null) {
          free(g, o1);
          if (o1.state === 'normal') { if (b.owner === o1) { o1.intent.mx = -0.4; o1.intent.my = 0.05; } else if (!b.owner) steer(o1, b.x, b.y, false); else still(o1); }
          if (o2.state === 'normal') still(o2);
        }
      };
      B.focusFn = () => (B.marks.hit != null ? { x: U.clamp((tb.x + o1.x) / 2, 250, 380), y: 206 } : { x: tb.x + 30, y: 206 });
    },
    /* P14 "I'd score from here": a full charge from the halfway line, BLACK HOLE SHOT: it drags the defenders and their keeper along with it */
    pa_bet() {
      const { g, P, F, E, b } = pvp({});
      const me = P.NGH, kp = P.bigboss99, d1 = P.xX_vex_Xx, d2 = P.zzz_mi;
      g.cores.add(me, 'black_hole');
      const G = g.attackGoal(0);
      const idle = crowd(g, [[P.tuanbeo, 230, 270], [P.kaito_04, 150, 160]]);
      place(me, G.x - 262, G.y + 4, 0); place(d1, G.x - 170, G.y - 22, PI); place(d2, G.x - 112, G.y + 24, PI); place(kp, G.x - 18, G.y, PI);
      give(g, me);
      keep(g, kp, d1, d2, P.tuanbeo, P.kaito_04);
      let shot = false;
      B.dir = (dt, g, t) => {
        idle(t);
        for (const o of [d1, d2, kp]) if (o.state === 'normal' && Math.hypot(o.kbx, o.kby) > 60 && B.marks['grab_' + o.name] == null) mark('grab_' + o.name);
        if (!shot) {
          for (const o of [d1, d2]) { still(o); face(o, me); }
          steer(kp, G.x - 18, G.y + Math.sin(t * 2) * 5, false); face(kp, me);
          me.intent.mx = 0.35; me.intent.my = 0;
          if (t > 0.6) { face(me, G); Act.shoot(g, me, 1, 0); shot = true; mark('shot'); }
          return;
        }
        still(me);
        for (const o of [d1, d2]) if (o.state === 'normal') still(o);
        if (kp.state === 'normal') still(kp);
      };
      B.focusFn = () => (shot ? { x: Math.min(b.x - 20, G.x - 60), y: b.y } : me);
    },
    /* P16 aura farming: he just stands there glowing; I go in with a dropkick... he steps aside, I whiff into nothing */
    pa_aura() {
      const { g, P, F, E, b } = pvp({ me: 'kaito_04' });
      const me = P.kaito_04, zm = P.zzz_mi;
      const idle = crowd(g, [[P.NGH, 230, 140], [P.tuanbeo, 210, 270], [P.bigboss99, 470, 140], [P.xX_vex_Xx, 548, 203]]);
      place(me, 322, 206, 0); place(zm, 398, 202, PI);
      give(g, zm);
      keep(g, P.NGH, P.tuanbeo, P.bigboss99, P.xX_vex_Xx, me);
      let fired = false, kicked = false, dodged = false;
      B.dir = (dt, g, t) => {
        idle(t);
        if (!fired) { zm.res.ult = 1; if (t > 0.12) { fired = g.cores.activateUltimate(zm); if (fired) mark('ult'); } }
        if (!kicked) {
          if (zm.state === 'normal') { still(zm); face(zm, me); }
          if (t < 0.8) { still(me); face(me, zm); return; }
          steer(me, zm.x - 4, zm.y, true);
          if (U.dist(me, zm) < 40 && me.state === 'normal') { face(me, zm); me.cd.hard = 0; kicked = Act.hardAttack(g, me); if (kicked) mark('kick'); }
          return;
        }
        // the moment the boot swings, one calm step aside: the kick finds nothing
        if (!dodged && me.state === 'kick') { dodged = true; mark('dodge'); zm.cd.skill = 0; Act.skill(g, zm, 0, -1); }
        if (me.state === 'normal' && B.marks.dodge != null) { still(me); face(me, zm); }
        if (zm.state === 'normal' && dodged) {
          if (B.t - B.marks.dodge < 0.7) { still(zm); face(zm, me); }
          else if (b.owner === zm) { zm.intent.mx = -0.35; zm.intent.my = 0.12; zm.intent.sprint = false; }
        }
      };
      B.focusFn = () => ({ x: (me.x + Math.min(zm.x, 420)) / 2 + 6, y: 202 });
    },
    /* P18 AFK: my friend stands frozen in our box... street 3v3, whoever's in the box keeps: their shot hits him and he saves it */
    pa_afk() {
      const { g, P, F, E, b } = pvp({});
      const afk = P.kaito_04, sh = P.xX_vex_Xx, me = P.NGH;
      const H = g.ownGoal(0);
      const idle = crowd(g, [[P.tuanbeo, 230, 128], [P.bigboss99, 300, 272], [P.zzz_mi, 520, 203]]);
      place(afk, H.x + 24, H.y + 2, PI / 2); place(sh, H.x + 160, H.y - 6, PI); place(me, H.x + 215, H.y + 38, PI);
      give(g, sh);
      keep(g, me, P.tuanbeo, P.bigboss99, P.zzz_mi);
      at(0.15, () => E.comic(afk.x, afk.y - 26, 'AFK', '#9aa3b5', 0.9, 2.2));
      let shot = false;
      B.dir = (dt, g, t) => {
        idle(t);
        still(afk); afk.facing = PI / 2;
        if (me.state === 'normal') steer(me, sh.x + 30, sh.y + 10, true);
        if (b.owner === afk && B.marks.save == null) mark('save');
        if (!shot) { if (sh.state === 'normal') { sh.intent.mx = -0.35; sh.intent.my = 0.02; }
          if (t > (B.paShotT || 0.85)) { face(sh, afk); Act.shoot(g, sh, B.paPow != null ? B.paPow : 0.55, 0); shot = true; mark('shot'); } return; }
        if (sh.state === 'normal') still(sh);
      };
      B.focusFn = () => ({ x: H.x + 82, y: H.y });
    },
    /* P19 celebrating in my face: he shoots, turns round for the SIUUU before it's in... our keeper saves it, I dropkick him mid-pose */
    pa_celebrate() {
      const { g, P, F, E, b } = pvp({ home: 'street_kings', away: 'underground_fc' });
      const me = P.NGH, ml = P.m0le, kp = P.kaito_04;
      const H = g.ownGoal(0);
      g.cores.add(me, 'heavy_boot');
      const idle = crowd(g, [[P.tuanbeo, 230, 120], [P.jinx, 300, 270], [P.ratking, 330, 160]]);
      place(ml, H.x + 118, H.y + 18, PI); place(kp, H.x + 22, H.y, 0); place(me, H.x + 196, H.y + 8, PI);
      give(g, ml);
      keep(g, me, P.tuanbeo, P.jinx, P.ratking);
      let shot = false, kicked = false;
      B.dir = (dt, g, t) => {
        idle(t);
        if (b.owner === kp && B.marks.save == null) mark('save');
        if (kp.state === 'normal') { if (B.marks.save == null) { steer(kp, H.x + 22, U.clamp(b.y, H.y - 18, H.y + 18), false); face(kp, b); } else still(kp); }
        if (!shot) { still(ml); face(ml, H); still(me); face(me, ml);
          if (t > 0.2) { Act.shoot(g, ml, B.paPow != null ? B.paPow : 0.45, 0.15); shot = true; mark('shot'); keep(g, ml); } return; }
        // he turns away for the celebration before the ball gets there
        if (B.marks.pose == null && B.t - B.marks.shot > 0.12) { mark('pose'); E.comic(ml.x, ml.y - 30, 'SIUUU!', '#ffe14f', 1.5, 1.4); }
        if (ml.state === 'normal') { still(ml); ml.facing = PI / 2; }
        if (!kicked) {
          if (me.state === 'normal') { if (B.t - B.marks.shot < 0.25) still(me); else steer(me, ml.x + 24, ml.y + 2, true); }
          if (B.t - B.marks.shot > 0.25 && U.dist(me, ml) < 34 && me.state === 'normal') { face(me, ml); me.cd.hard = 0; kicked = Act.hardAttack(g, me); if (kicked) mark('kick'); }
          return;
        }
        if (ml.state === 'stun' && B.marks.hit == null) mark('hit');
        if (me.state === 'normal') still(me);
      };
      B.focusFn = () => ({ x: U.clamp((me.x + ml.x) / 2 - 20, 110, 220), y: H.y + 6 });
    },
    /* P22 the duo syncs: DUKE's ENDLESS TIKI-TAKA, the other team slows to a crawl, four golden one-touch passes with mochi, max shot */
    pa_sync() {
      const { g, P, F, E, b } = pvp({ home: 'cyber_united', away: 'neon_strikers', me: 'DUKE' });
      const me = P.DUKE, pd = P.mochi, kp = P.zzz_mi, o1 = P.bigboss99;
      const G = g.attackGoal(0);
      const idle = crowd(g, [[P['panda.exe'], 230, 255], [P.xX_vex_Xx, 480, 140]]);
      place(me, 410, 184, 0); place(pd, 400, 232, 0); place(o1, 452, 208, PI); place(kp, G.x - 20, G.y, PI);
      give(g, me);
      keep(g, P['panda.exe'], P.xX_vex_Xx);
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
    /* P24 "what does your ultimate do?": mochi's CLONE ARMY, four of him pour out and mug me for the ball */
    pa_reveal() {
      const { g, P, F, E, b } = pvp({ home: 'street_kings', away: 'cyber_united' });
      const me = P.NGH, zm = P.mochi;
      const idle = crowd(g, [[P.tuanbeo, 220, 130], [P.kaito_04, 200, 270], [P.DUKE, 470, 270], [P['panda.exe'], 560, 203]]);
      place(me, 300, 208, 0); place(zm, 368, 202, PI);
      give(g, me);
      keep(g, P.tuanbeo, P.kaito_04, P.DUKE, P['panda.exe']);
      let fired = false;
      B.dir = (dt, g, t) => {
        idle(t);
        if (!fired) { still(zm); face(zm, me); zm.res.ult = 1; if (t > 0.55) { fired = g.cores.activateUltimate(zm); if (fired) mark('ult'); } }
        if (me.state === 'normal') { if (b.owner === me) { me.intent.mx = fired ? 0.12 : 0.05; me.intent.my = 0; } else still(me); }
        if (fired && me.state === 'stun' && B.marks.mugged == null) mark('mugged');
        if (B.marks.mugged != null && B.marks.take == null && B.t - B.marks.mugged > 0.25) { mark('take'); keep(g, me); b.owner = null; g.gainPossession(zm); }
        if (fired && zm.state === 'normal' && B.t - B.marks.ult > 0.7) { if (b.owner === zm) { if (B.t - B.marks.take < 0.3) { still(zm); face(zm, me); } else { zm.intent.mx = 0.65; zm.intent.my = 0.15; zm.intent.sprint = false; } } else if (!b.owner) steer(zm, b.x, b.y, false); else still(zm); }
        else if (zm.state === 'normal') still(zm);
      };
      B.focusFn = () => ({ x: U.clamp((me.x + zm.x) / 2, 300, 360), y: 205 });
    },
    /* P25 last second, 2-2: their defender races back and hoofs the loose ball away... into his own top corner. GOAL x2 */
    pa_lastsecond() {
      const { g, P, F, E, b } = pvp({});
      const bb = P.bigboss99, kp = P.zzz_mi, me = P.NGH, vx = P.xX_vex_Xx;
      const G = g.attackGoal(0);
      g.teams[0].score = 2; g.teams[1].score = 2;
      g.elapsed = g.cfg.match.duration - (B.paRem || 3.4); g.finalPush = true; g.cfg.match.goldenGoal = false;
      g.cores.add(bb, 'heavy_boot');
      const idle = crowd(g, [[P.tuanbeo, 400, 128], [P.kaito_04, 300, 262], [vx, G.x - 150, G.y + 80]]);
      place(bb, G.x - 96, G.y + 6, 0); place(kp, G.x - 18, G.y - 8, PI); place(me, G.x - 230, G.y + 4, 0);
      give(g, me);
      keep(g, bb, kp, vx, P.tuanbeo, P.kaito_04);
      let passed = false, kicked = false, booted = false;
      B.dir = (dt, g, t) => {
        idle(t);
        if (kp.state === 'normal' && !booted) { still(kp); face(kp, b); }
        if (!passed) { still(bb); bb.facing = 0; if (me.state === 'normal') { me.intent.mx = 0.3; me.intent.my = 0; }
          if (t > 0.45) { Act.startAttack(me, 'shoot'); b.owner = null; b.kick(me, 205, -2, 0); b.kind = 'pass'; g.sfx('kick', 0.6); passed = true; mark('pass'); keep(g, me); }
          return; }
        if (me.state === 'normal') still(me);
        // racing back toward his own goal, the ball arrives from behind him: he swings at it to clear
        if (!kicked) { bb.facing = 0; if (bb.state === 'normal') { bb.intent.mx = 0.25; bb.intent.my = 0; }
          if (b.x > bb.x - 34) { bb.cd.hard = 0; bb.facing = -0.12; kicked = Act.hardAttack(g, bb); if (kicked) mark('kick'); } return; }
        if (!booted && b.owner == null && b.lastTouch === bb && Math.hypot(b.vx, b.vy) > 150) { booted = true; mark('boot'); }
        if (booted && B.marks.goal == null) { keep(g, kp); if (kp.state === 'normal' && B.marks.dive == null) { mark('dive'); kp.cd.skill = 0; Act.dive(g, kp, 40); } }
        if (bb.state === 'normal') still(bb);
        if (B.marks.goal != null && B.marks.oops == null) { mark('oops'); E.comic(bb.x, bb.y - 26, 'oops', '#ffffff', 1.1, 1.0); }
      };
      B.focusFn = () => ({ x: G.x - 82, y: G.y + 4 });
    },
