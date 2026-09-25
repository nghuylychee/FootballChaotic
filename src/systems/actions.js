/* Actions — mọi hành động bóng đá/combat, dùng chung cho người chơi & AI */
window.SFC = window.SFC || {};

(function () {
  const U = SFC.U;
  const G = () => SFC_CONFIG.game;

  function facingVec(p) { return { x: Math.cos(p.facing), y: Math.sin(p.facing) }; }

  const Actions = {
    // Chọn đồng đội phù hợp nhất theo hướng (dx, dy)
    findPassTarget(g, p, dx, dy) {
      const dir = Math.hypot(dx, dy) > 0.2 ? U.norm(dx, dy) : facingVec(p);
      const opps = g.teams[1 - p.team].players;
      let best = null, bestS = -Infinity;
      for (const m of g.teams[p.team].players) {
        if (m === p || m.state === 'stun') continue;
        const tx = m.x - p.x, ty = m.y - p.y;
        const d = Math.hypot(tx, ty) || 1;
        const dot = (tx * dir.x + ty * dir.y) / d;
        let s = dot * 2.2 - d / 260;
        let oppD = Infinity;
        for (const o of opps) {
          oppD = Math.min(oppD, U.dist(o, m));
          if (U.segDist(o.x, o.y, p.x, p.y, m.x, m.y) < 10) s -= 0.7;
        }
        s += Math.min(oppD, 60) / 60 * 0.6;
        if (m.role === 'GK') s -= 0.8;
        if (s > bestS) { bestS = s; best = m; }
      }
      return best;
    },

    laneClear(g, p, x, y, width) {
      for (const o of g.teams[1 - p.team].players) {
        if (o.role === 'GK') continue;
        if (U.segDist(o.x, o.y, p.x, p.y, x, y) < width) return false;
      }
      return true;
    },

    pass(g, p, mode, dx, dy) {
      if (g.ball.owner !== p) return;
      const target = this.findPassTarget(g, p, dx, dy);
      this.passTo(g, p, target, mode, dx, dy);
    },

    passTo(g, p, target, mode, dx = 0, dy = 0) {
      const b = g.ball, K = G().kick, f = g.field;
      if (b.owner !== p) return;
      let aimX, aimY;
      if (!target) {
        const dir = Math.hypot(dx, dy) > 0.2 ? U.norm(dx, dy) : facingVec(p);
        aimX = p.x + dir.x * 120; aimY = p.y + dir.y * 120;
      } else if (mode === 'through') {
        const ad = g.teams[p.team].dir;
        const tv = U.norm(target.vx * 0.5 + ad * 60, target.vy * 0.5);
        aimX = U.clamp(target.x + tv.x * K.throughLead, f.x + 12, f.x + f.w - 12);
        aimY = U.clamp(target.y + tv.y * K.throughLead, f.y + 12, f.y + f.h - 12);
        target.ai.runTo = { x: aimX, y: aimY };
        target.ai.runT = 1.2;
      } else {
        const t = U.dist(p, target) / 260;
        aimX = target.x + target.vx * t * 0.8;
        aimY = target.y + target.vy * t * 0.8;
      }

      const ddx = aimX - b.x, ddy = aimY - b.y;
      const d = Math.hypot(ddx, ddy) || 1;
      const mult = p.stats.pass * g.cores.mod(p.team, 'passSpeed');

      if (mode === 'lob') {
        const T = U.clamp(d / K.lobSpeed, 0.45, 1.4);
        const vh = (d / T) * 0.92;
        b.kick(p, (ddx / d) * vh, (ddy / d) * vh, (G().ball.gravity * T) / 2);
      } else {
        let spd = U.clamp(60 + d * G().ball.groundFriction * 1.35, K.passMinSpeed, K.passMaxSpeed) * mult;
        if (mode === 'through') spd *= K.throughSpeedMult;
        b.kick(p, (ddx / d) * spd, (ddy / d) * spd, 0);
      }
      b.passTarget = target;
      b.kind = 'pass';
      p.charging = false; p.charge = 0;
      p.facing = Math.atan2(ddy, ddx);
      g.cores.dispatch(p.team, 'onPass', p, target, mode);
      if (target && p.team === g.humanTeam && g.controlled === p) g.setControlled(target);
      g.sfx('pass');
    },

    shoot(g, p, charge, aimY) {
      const b = g.ball, K = G().kick, f = g.field;
      if (b.owner !== p) return;
      const tm = g.teams[p.team];
      const gx = tm.dir > 0 ? f.x + f.w + 6 : f.x - 6;
      const ay = U.clamp(aimY || 0, -1, 1);
      const gy = f.cy + ay * (f.goalWidth / 2 - 6);
      const c = Math.min(charge, 1);
      const over = Math.max(0, charge - 1);

      const acc = p.stats.accuracy * g.cores.mod(p.team, 'accuracy');
      let spread = K.shotSpread / acc + over * K.overchargeSpread;
      if (!p.isControlled) spread *= 2 - g.aiProfile(p.team).shotAccuracy;
      const ang = Math.atan2(gy - b.y, gx - b.x) + U.rand(-spread, spread);

      const spd = U.lerp(K.shotMinSpeed, K.shotMaxSpeed, c) * p.stats.power * g.cores.mod(p.team, 'shotPower');
      const vz = U.lerp(K.shotLiftMin, K.shotLiftMax, c * c) + over * K.overchargeLift;
      b.kick(p, Math.cos(ang) * spd, Math.sin(ang) * spd, vz);
      b.kind = 'shot';
      p.facing = ang;
      p.charging = false; p.charge = 0;
      g.cores.dispatch(p.team, 'onShoot', p, b, c);
      g.effects.burst(b.x, b.y, 2, '#ffffff', 5 + Math.round(c * 6), 80);
      g.effects.shake(G().fx.shakeShot * c);
      g.sfx('kick', c);
    },

    tackle(g, p) {
      const C = G().combat;
      if (p.cd.tackle > 0 || p.state !== 'normal') return;
      p.cd.tackle = C.tackleCooldown;
      const fv = facingVec(p);
      p.state = 'tackle'; p.stateT = 0.2;
      p.vx += fv.x * C.tackleLunge; p.vy += fv.y * C.tackleLunge;
      g.sfx('tackle');
      g.cores.dispatch(p.team, 'onTackle', p);

      const b = g.ball, carrier = b.owner;
      const range = C.tackleRange * g.cores.mod(p.team, 'tackleRange') + p.radius * 2;
      if (carrier && carrier.team !== p.team && U.dist(p, carrier) < range) {
        if (g.isProtected(carrier)) { g.effects.text(carrier.x, carrier.y - 26, 'SAFE', '#ffffff'); return; }
        if (carrier.tackleImmune > 0) { g.effects.text(carrier.x, carrier.y - 26, 'DODGE', '#3ff6ff'); return; }
        let chance = C.tackleChance * (p.stats.tackle / carrier.stats.dribble) * g.cores.mod(p.team, 'tackleChance');
        if (!p.isControlled) chance *= g.aiProfile(p.team).tackleMult;
        if (Math.random() < chance) {
          g.looseBall(carrier, p.x - carrier.x + fv.x * 10, p.y - carrier.y + fv.y * 10, 90);
          carrier.hit({ stun: C.tackleVictimStagger, kbx: fv.x * 40, kby: fv.y * 40, source: p, type: 'tackle' });
          g.cores.dispatch(p.team, 'onTackleWin', p, carrier);
          g.effects.text(p.x, p.y - 26, 'TACKLE!', '#ffcf3f');
        } else {
          p.state = 'recover'; p.stateT = C.tackleFailRecover;
          g.effects.text(p.x, p.y - 26, 'MISS', '#9aa3b5');
        }
      } else if (!carrier && b.z < 10 && U.dist(p, b) < range) {
        g.gainPossession(p);
      }
    },

    slide(g, p) {
      const C = G().combat;
      if (p.cd.slide > 0 || p.state !== 'normal') return;
      p.cd.slide = C.slideCooldown;
      const fv = facingVec(p);
      const s = C.slideSpeed * g.cores.mod(p.team, 'slideSpeed');
      p.state = 'slide'; p.stateT = C.slideTime;
      p.dashX = fv.x * s; p.dashY = fv.y * s;
      p.slideHits.clear();
      g.effects.burst(p.x, p.y, 1, '#8a7f70', 6, 50);
      g.sfx('whoosh');
      g.cores.dispatch(p.team, 'onSlideStart', p);
      g.cores.dispatch(p.team, 'onTackle', p);
    },

    slideUpdate(g, p) {
      const C = G().combat, b = g.ball;
      const d = U.norm(p.dashX, p.dashY);
      if (Math.random() < 0.5) g.effects.burst(p.x, p.y, 0, '#6d6457', 1, 20);
      if (!b.owner && b.z < 8 && !p.slideHits.has('ball') && U.dist(p, b) < p.radius + b.r + 5) {
        p.slideHits.add('ball');
        b.kick(p, d.x * C.slideBallKick, d.y * C.slideBallKick, 30);
      }
      for (const o of g.teams[1 - p.team].players) {
        if (p.slideHits.has(o.id) || U.dist(p, o) > C.slideHitRange + o.radius) continue;
        p.slideHits.add(o.id);
        if (g.isProtected(o)) continue;
        if (o.tackleImmune > 0) { g.effects.text(o.x, o.y - 26, 'DODGE', '#3ff6ff'); continue; }
        const had = o.hasBall;
        if (had) g.looseBall(o, d.x, d.y, C.slideBallKick);
        o.hit({ stun: C.slideStun, kbx: d.x * 90, kby: d.y * 90, source: p, type: 'slide' });
        if (had) g.cores.dispatch(p.team, 'onTackleWin', p, o);
      }
    },

    bodyCheck(g, p) {
      const C = G().combat;
      if (p.cd.body > 0 || p.state !== 'normal') return;
      p.cd.body = C.bodyCheckCooldown;
      const fv = facingVec(p);
      p.state = 'tackle'; p.stateT = 0.18;
      p.vx += fv.x * 90; p.vy += fv.y * 90;
      g.sfx('tackle');
      const kbMult = g.cores.mod(p.team, 'knockback');
      for (const o of g.teams[1 - p.team].players) {
        const dx = o.x - p.x, dy = o.y - p.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d > C.bodyCheckRange + p.radius + o.radius) continue;
        if ((dx * fv.x + dy * fv.y) / d < -0.2 || g.isProtected(o)) continue;
        const kb = C.bodyCheckKnockback * kbMult;
        if (o.hasBall) {
          if (Math.random() < C.bodyCheckStealChance * p.stats.tackle) {
            g.looseBall(o, fv.x, fv.y, 80);
            o.hit({ stun: C.bodyCheckStun, kbx: (dx / d) * kb, kby: (dy / d) * kb, source: p, type: 'body' });
            g.cores.dispatch(p.team, 'onTackleWin', p, o);
          } else {
            o.hit({ stun: 0, kbx: (dx / d) * kb * 0.6, kby: (dy / d) * kb * 0.6, source: p, type: 'body' });
          }
        } else {
          o.hit({ stun: C.bodyCheckStun, kbx: (dx / d) * kb, kby: (dy / d) * kb, source: p, type: 'body' });
        }
        g.effects.text(o.x, o.y - 26, 'BAM!', '#ff6a3d');
      }
    },

    skill(g, p, dx, dy) {
      const S = G().skill;
      if (p.cd.skill > 0 || p.state !== 'normal') return;
      let d;
      if (Math.hypot(dx, dy) > 0.2) d = U.norm(dx, dy);
      else {
        const fv = facingVec(p);
        const s = U.randSign();
        d = p.hasBall ? U.norm(fv.x - fv.y * s, fv.y + fv.x * s) : fv;
      }
      p.cd.skill = S.cooldown;
      p.state = 'dash'; p.stateT = S.dashTime;
      p.dashX = d.x * S.dashSpeed; p.dashY = d.y * S.dashSpeed;
      p.tackleImmune = S.tackleImmune;
      p.charging = false;
      p.facing = Math.atan2(d.y, d.x);
      g.effects.afterimage(p);
      g.sfx('whoosh');
      g.cores.dispatch(p.team, 'onSkillMove', p, d);
    },

    // Thủ môn đổ người
    dive(g, p, dy) {
      const P = G().player;
      if (p.state !== 'normal') return;
      // thời gian đổ người tỉ lệ với khoảng cách cần bay (không bay quá đà)
      p.state = 'dash';
      p.stateT = U.clamp(Math.abs(dy) / P.gkDiveSpeed, 0.05, P.gkDiveTime);
      p.dashX = 0; p.dashY = Math.sign(dy) * P.gkDiveSpeed;
      g.effects.afterimage(p);
    },
  };

  SFC.Actions = Actions;
})();
