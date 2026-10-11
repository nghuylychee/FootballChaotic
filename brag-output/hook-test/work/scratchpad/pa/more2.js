
    /* P13 never passes: he dribbles on, we shout PASS three times... both of us dropkick him at once, then the ball finally moves */
    pa_nopass() {
      const { g, P, F, E, b } = pvp({});
      const tb = P.tuanbeo, me = P.NGH, kt = P.kaito_04;
      for (const q of [me, kt]) g.cores.add(q, 'heavy_boot');
      const G = g.attackGoal(0);
      const idle = crowd(g, [[P.zzz_mi, G.x - 22, G.y], [P.xX_vex_Xx, 450, 150], [P.bigboss99, 470, 262]]);
      place(tb, 236, 206, 0); place(me, 262, 158, 0); place(kt, 262, 256, 0);
      give(g, tb);
      keep(g, me, kt, P.zzz_mi, P.xX_vex_Xx, P.bigboss99);
      B.traitor = me;
      at(0.2, () => E.comic(me.x, me.y - 24, 'PASS!', '#ffffff', 0.9, 0.7));
      at(0.6, () => E.comic(kt.x, kt.y - 24, 'PASS!!', '#ffffff', 1.0, 0.7));
      at(1.0, () => E.comic(me.x, me.y - 24, 'PASS!!!', '#ff3d5a', 1.15, 0.7));
      let kicked = false;
      B.dir = (dt, g, t) => {
        idle(t);
        if (!kicked) {
          if (b.owner === tb) { tb.intent.mx = 0.5; tb.intent.my = 0; tb.intent.sprint = false; }
          if (t < 1.2) { steer(me, tb.x + 18, 158, false); steer(kt, tb.x + 18, 256, false); return; }
          steer(me, tb.x + 4, tb.y - 22, true); steer(kt, tb.x + 4, tb.y + 22, true);
          if (U.dist(me, tb) < 30 && me.state === 'normal') { for (const q of [me, kt]) { q.cd.hard = 0; face(q, tb); Act.hardAttack(g, q); } kicked = true; mark('kick'); }
          return;
        }
        if (tb.state === 'stun' && B.marks.hit == null) { mark('hit'); tb.kbx = 120; tb.kby = 40; tb.airVz = Math.max(tb.airVz, 230); E.comic(tb.x, tb.y - 34, 'DOUBLE!', '#ffe14f', 1.4, 0.9); }
        if (B.marks.hit == null && kicked && B.t - B.marks.kick > 0.32 && tb.state === 'normal') { mark('hit'); smash(tb, 120, 40, 230, 2.5, me); E.comic(tb.x, tb.y - 34, 'DOUBLE!', '#ffe14f', 1.4, 0.9); }
        free(g, me);
        if (me.state === 'normal') { if (b.owner === me) { if (B.marks.pass == null && B.t - B.marks.kick > 0.9) { Act.passTo(g, me, kt, 'ground'); mark('pass'); } else still(me); } else if (!b.owner) steer(me, b.x, b.y, false); else still(me); }
        if (kt.state === 'normal') { if (B.marks.pass != null) free(g, kt); if (b.owner === kt) { kt.intent.mx = 0.4; kt.intent.my = 0; } else still(kt); }
      };
      B.focusFn = () => (B.marks.hit != null ? { x: U.clamp((me.x + tb.x) / 2, 280, 400), y: 206 } : { x: tb.x + 20, y: 206 });
    },

    /* P14 "I'd score from here": a full charge from the halfway line becomes a black hole that drags the defender and their keeper into the net */
    pa_bet() {
      const { g, P, F, E, b } = pvp({});
      const me = P.NGH, kp = P.bigboss99, d1 = P.xX_vex_Xx, d2 = P.zzz_mi;
      g.cores.add(me, 'black_hole');
      const G = g.attackGoal(0);
      const idle = crowd(g, [[P.tuanbeo, 230, 270], [P.kaito_04, 150, 160]]);
      place(me, G.x - 262, G.y + 4, 0); place(d1, G.x - 150, G.y - 34, PI); place(d2, G.x - 112, G.y + 36, PI); place(kp, G.x - 18, G.y, PI);
      give(g, me);
      keep(g, kp, d1, d2, P.tuanbeo, P.kaito_04);
      let shot = false;
      B.dir = (dt, g, t) => {
        idle(t);
        if (!shot) {
          for (const o of [d1, d2]) { still(o); face(o, me); }
          steer(kp, G.x - 18, G.y + Math.sin(t * 2) * 5, false); face(kp, me);
          me.intent.mx = 0.35; me.intent.my = 0;
          if (t > 0.6) { face(me, G); Act.shoot(g, me, 1, 0); shot = true; mark('shot'); }
          return;
        }
        still(me);
        if (b.x < G.x + 4 && B.marks.goal == null) { b.owner = null; b.vx = B.t - B.marks.shot < 0.25 ? Math.max(b.vx * 0.9, 100) : 100; b.vy = (G.y - b.y) * 1.2; b.z = Math.min(b.z, 2); }
        for (const o of [d1, d2, kp]) {
          const d = Math.hypot(b.x - o.x, b.y - o.y);
          if (d < 90 && b.x < G.x) { if (o.state === 'normal') { o.state = 'stun'; if (B.marks['grab_' + o.name] == null) mark('grab_' + o.name); } o.stateT = Math.max(o.stateT, 0.4); o.x += (b.x - o.x) * Math.min(1, dt * 3.2); o.y += (b.y - o.y) * Math.min(1, dt * 3.2); o.facing += dt * 14; }
        }
      };
      B.focusFn = () => (shot ? { x: Math.min(b.x - 20, G.x - 60), y: b.y } : me);
    },

    /* P15 best friends, different teams: I'm through on goal, my best friend is in their box... he sprints off his line and dropkicks me */
    pa_bestie() {
      const { g, P, F, E, b } = pvp({});
      const me = P.NGH, kp = P.zzz_mi;
      const G = g.attackGoal(0);
      g.cores.add(kp, 'heavy_boot');
      const idle = crowd(g, [[P.tuanbeo, 340, 140], [P.kaito_04, 250, 250], [P.bigboss99, 380, 262], [P.xX_vex_Xx, 330, 196]]);
      place(me, 440, 212, 0); place(kp, G.x - 22, G.y, PI);
      give(g, me);
      keep(g, P.tuanbeo, P.kaito_04, P.bigboss99, P.xX_vex_Xx);
      let kicked = false;
      B.dir = (dt, g, t) => {
        idle(t);
        if (!kicked) {
          if (b.owner === me) { me.intent.mx = 0.4; me.intent.my = -0.03; me.intent.sprint = false; }
          if (t < 0.55) { steer(kp, G.x - 22, G.y + Math.sin(t * 5) * 8, false); face(kp, me); return; }
          steer(kp, me.x + 12, me.y, true);
          if (U.dist(kp, me) < 34 && kp.state === 'normal') { face(kp, me); kp.cd.hard = 0; kicked = Act.hardAttack(g, kp); if (kicked) mark('kick'); }
          return;
        }
        if (me.state === 'stun' && B.marks.hit == null) { mark('hit'); me.kbx = Math.min(me.kbx, -260); me.airVz = Math.max(me.airVz, 200); }
        if (me.state === 'normal') still(me);
        if (kp.state === 'normal') { if (B.marks.hit != null && B.marks.sorry == null && B.t - B.marks.hit > 0.5) { mark('sorry'); E.comic(kp.x, kp.y - 28, 'SORRY!', '#ffffff', 1.0, 1.0); } if (b.owner === kp) { still(kp); face(kp, me); } else if (!b.owner) steer(kp, b.x, b.y, false); else still(kp); }
      };
      B.focusFn = () => (B.marks.hit != null ? { x: U.clamp((me.x + kp.x) / 2, 420, 500), y: 208 } : t0focus(me, { x: Math.max(kp.x - 30, me.x + 40), y: kp.y }));
    },

    /* P16 aura farming: he just stands there glowing; I walk up to take the ball and faint before I touch him */
    pa_aura() {
      const { g, P, F, E, b } = pvp({ me: 'kaito_04' });
      const me = P.kaito_04, bb = P.bigboss99;
      const idle = crowd(g, [[P.NGH, 230, 140], [P.tuanbeo, 210, 270], [P.zzz_mi, 548, 203], [P.xX_vex_Xx, 470, 140]]);
      place(me, 312, 206, 0); place(bb, 392, 202, PI);
      give(g, bb);
      keep(g, P.NGH, P.tuanbeo, P.zzz_mi, P.xX_vex_Xx);
      let fired = false, fell = false;
      B.dir = (dt, g, t) => {
        idle(t);
        if (!fired) { bb.res.ult = 1; if (t > 0.12) { fired = g.cores.activateUltimate(bb); if (fired) mark('ult'); } }
        if (bb.state === 'normal' && (!fell || B.t - B.marks.faint < 0.9)) { still(bb); face(bb, me); }
        else if (bb.state === 'normal' && b.owner === bb) { bb.intent.mx = -0.3; bb.intent.my = 0.12; }
        if (!fell && me.state === 'normal') { if (t < 0.85) { still(me); face(me, bb); } else steer(me, bb.x - 4, bb.y, true); }
        if (!fell && t > 0.85 && U.dist(me, bb) < 26) {
          fell = true; mark('faint');
          smash(me, -70, 40, 70, 3, bb);
          E.comic(me.x, me.y - 28, '*faints*', '#ffe14f', 1.0, 1.1);
        }
      };
      B.focusFn = () => ({ x: (me.x + Math.min(bb.x, 420)) / 2, y: 204 });
    },

    /* P17 the whole lobby only dropkicks: six at the centre circle, whistle, all six dropkick at once, all six fly... the ball rolls in alone */
    pa_lobby() {
      const { g, P, F, E, b } = pvp({});
      const pairs = [[P.NGH, P.xX_vex_Xx, -34], [P.tuanbeo, P.bigboss99, 0], [P.kaito_04, P.zzz_mi, 34]];
      for (const p of g.players) g.cores.add(p, 'heavy_boot');
      for (const [a, c, dy] of pairs) { place(a, F.cx - 30, F.cy + dy, 0); place(c, F.cx + 30, F.cy + dy, PI); }
      loose(g, F.cx, F.cy);
      keep(g, ...g.players);
      at(0.3, () => { g.sfx('whistle'); mark('whistle'); });
      let go = false;
      B.dir = (dt, g, t) => {
        for (const [a, c] of pairs) for (const [x, y] of [[a, c], [c, a]]) {
          if (t < 0.35) { still(x); face(x, y); continue; }
          if (B.marks.kick == null && x.state === 'normal') steer(x, y.x, y.y, true);
        }
        if (t >= 0.35 && !go) { go = true; mark('go'); }
        if (go && B.marks.kick == null && U.dist(P.NGH, P.xX_vex_Xx) < 34) {
          for (const [a, c] of pairs) for (const [x, y] of [[a, c], [c, a]]) { face(x, y); x.cd.hard = 0; Act.hardAttack(g, x); }
          mark('kick');
        }
        if (B.marks.kick != null && B.marks.boom == null && B.t - B.marks.kick > 0.18) {
          mark('boom');
          for (const [a, c, dy] of pairs) { const sy = dy < 0 ? -1 : dy > 0 ? 1 : 0.15; smash(a, -230, sy * 170, 190, 3.2); smash(c, 230, sy * 170 + (dy === 0 ? -20 : 0), 190, 3.2); }
          E.comic(F.cx, F.cy - 40, 'SMASH!!', '#ff3d5a', 1.6, 0.9); E.flash(0.5); E.shake(7, 0.4); g.sfx('hit', 'hard');
        }
        if (B.marks.kick != null) for (const p of g.players) if (p.state === 'normal') still(p);
        if (B.marks.boom != null && B.t - B.marks.boom > 1.1 && B.marks.roll == null) { mark('roll'); b.vx = 150; b.vy = 0; }
        if (B.marks.roll != null && B.marks.goal == null) { const G0 = g.attackGoal(0); b.owner = null; b.vx = Math.max(b.vx, 120); b.vy = (G0.y - b.y) * 0.8; }
      };
      B.focusFn = () => (B.marks.roll != null && B.t - B.marks.roll > 0.2 ? { x: Math.max(b.x, F.cx), y: F.cy } : { x: F.cx, y: F.cy });
    },

    /* P18 AFK: my friend stands frozen in front of their goal; their keeper's clearance smacks him in the head and goes in */
    pa_afk() {
      const { g, P, F, E, b } = pvp({});
      const afk = P.kaito_04, kp = P.zzz_mi, me = P.NGH;
      const G = g.attackGoal(0);
      const idle = crowd(g, [[P.tuanbeo, 300, 260], [P.bigboss99, 380, 250], [P.xX_vex_Xx, 400, 140]]);
      place(afk, G.x - 62, G.y + 2, PI / 2); place(kp, G.x - 22, G.y, PI); place(me, G.x - 140, G.y - 60, 0);
      give(g, kp);
      keep(g, afk, me, P.tuanbeo, P.bigboss99, P.xX_vex_Xx);
      at(0.15, () => E.comic(afk.x, afk.y - 26, 'AFK', '#9aa3b5', 0.9, 2.2));
      let cleared = false, bonk = false;
      B.dir = (dt, g, t) => {
        idle(t);
        still(afk); afk.facing = PI / 2; afk.anim = 0;
        if (me.state === 'normal') { if (!bonk) steer(me, G.x - 120, G.y - 40, false); else still(me); face(me, b); }
        if (!cleared) { if (kp.state === 'normal') { still(kp); face(kp, afk); } if (t > 0.9) { b.kick(kp, -330, (afk.y - kp.y) * 2, 28); b.kind = 'pass'; Act.startAttack(kp, 'shoot'); g.sfx('kick', 0.9); cleared = true; mark('clear'); keep(g, kp); } return; }
        if (!bonk && U.dist(b, afk) < 10) {
          bonk = true; mark('bonk');
          b.kick(afk, 300, (G.y + 14 - b.y) * 2.2, 40); b.kind = 'shot';
          E.comic(afk.x, afk.y - 32, 'BONK', '#ffffff', 1.1, 0.8); g.sfx('hit', 'light');
          if (kp.state === 'normal') { kp.cd.skill = 0; Act.dive(g, kp, -40); }
        }
        if (bonk && kp.state === 'normal') { still(kp); kp.poseEnd = 99; }
      };
      B.focusFn = () => ({ x: G.x - 58, y: G.y });
    },
