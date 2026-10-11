    pa_lastsecond() {
      const { g, P, F, E, b } = pvp({});
      const bb = P.bigboss99, vx = P.xX_vex_Xx, kp = P.zzz_mi, me = P.NGH;
      const G = g.attackGoal(0);
      g.teams[0].score = 2; g.teams[1].score = 2;
      g.elapsed = g.cfg.match.duration - (B.paRem || 3.4); g.finalPush = true; g.cfg.match.goldenGoal = false;
      const idle = crowd(g, [[P.tuanbeo, 400, 128], [P.kaito_04, 300, 262]]);
      place(me, G.x - 214, G.y + 34, 0); place(bb, G.x - 96, G.y + 14, PI); place(vx, G.x - 128, G.y + 6, PI); place(kp, G.x - 22, G.y - 4, PI);
      give(g, me);
      keep(g, bb, vx, kp, P.tuanbeo, P.kaito_04);
      let shot = false, got = false, cleared = false, bonk = false;
      B.dir = (dt, g, t) => {
        idle(t);
        if (kp.state === 'normal' && !bonk) { still(kp); face(kp, b); }
        if (vx.state === 'normal' && !bonk) { still(vx); face(vx, b.owner === bb ? me : b); }
        if (!shot) { still(bb); face(bb, me); if (me.state === 'normal') { me.intent.mx = 0.3; me.intent.my = -0.04; }
          if (t > 0.5) { const d = U.norm(bb.x - me.x, bb.y - me.y); me.facing = Math.atan2(d.y, d.x); Act.startAttack(me, 'shoot'); b.owner = null; b.kick(me, d.x * 330, d.y * 330, 12); b.kind = 'shot'; g.sfx('kick', 0.8); shot = true; mark('shot'); keep(g, me); }
          return; }
        if (me.state === 'normal') still(me);
        if (!got) { still(bb); face(bb, b); if (U.dist(b, bb) < 11) { got = true; mark('block'); b.owner = null; g.gainPossession(bb); } return; }
        // the big clearance... straight into his own teammate's back
        if (!cleared) { still(bb); face(bb, vx); if (B.t - B.marks.block > 0.28) { const d = U.norm(vx.x - bb.x, vx.y - bb.y); Act.startAttack(bb, 'shoot'); b.owner = null; b.kick(bb, d.x * 430, d.y * 430, 14); b.kind = 'pass'; g.sfx('kick', 1); cleared = true; mark('clear'); E.comic(bb.x, bb.y - 28, 'CLEAR!', '#ffffff', 0.9, 0.6); } return; }
        if (!bonk && U.dist(b, vx) < 12) {
          bonk = true; mark('bonk');
          const d = U.norm(G.x + 8 - b.x, G.y - 14 - b.y);
          b.kick(vx, d.x * 440, d.y * 440, 18); b.kind = 'shot';
          E.comic(vx.x, vx.y - 30, 'BONK', '#ffffff', 1.1, 0.8); g.sfx('hit', 'light');
          if (kp.state === 'normal') { kp.cd.skill = 0; Act.dive(g, kp, 40); }
        }
        if (bonk && kp.state === 'normal') { still(kp); kp.poseEnd = 99; }
        if (bb.state === 'normal') still(bb);
      };
      B.focusFn = () => ({ x: G.x - 92, y: G.y + 8 });
    },
