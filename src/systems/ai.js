/* AI — điều khiển mọi cầu thủ không do người chơi điều khiển */
window.SFC = window.SFC || {};

(function () {
  const U = SFC.U;
  const A = () => SFC_CONFIG.game.ai;
  const Act = () => SFC.Actions;

  function stop(p) { p.intent.mx = 0; p.intent.my = 0; p.intent.sprint = false; }

  function moveTo(p, x, y, sprint, arrive = 4) {
    const dx = x - p.x, dy = y - p.y, d = Math.hypot(dx, dy);
    if (d < arrive) { stop(p); return true; }
    const s = Math.min(1, d / 18);
    p.intent.mx = (dx / d) * s;
    p.intent.my = (dy / d) * s;
    p.intent.sprint = !!sprint && p.stamina > 25;
    return false;
  }

  function nearest(list, pt, filter) {
    let best = null, bd = Infinity;
    for (const o of list) {
      if (filter && !filter(o)) continue;
      const d = U.dist(o, pt);
      if (d < bd) { bd = d; best = o; }
    }
    return { p: best, d: bd };
  }

  const AI = {
    update(dt, g) {
      for (const p of g.players) {
        if (p === g.controlled) continue;
        p.ai.t -= dt;
        if (p.state !== 'normal') { stop(p); continue; }
        const own = g.ball.owner;
        if (own === p) this.carrier(dt, g, p);
        else if (p.role === 'GK') this.goalkeeper(dt, g, p);
        else if (own && own.team === p.team) this.support(dt, g, p);
        else if (own) this.defend(dt, g, p);
        else this.loose(dt, g, p);
      }
    },

    /* ---------- có bóng ---------- */
    carrier(dt, g, p) {
      const D = g.aiProfile(p.team), cfg = A(), f = g.field;
      const goal = g.attackGoal(p.team);
      const opps = g.teams[1 - p.team].players;
      p.ai.holdT += dt;

      if (p.ai.requestedPass) {
        const r = p.ai.requestedPass; p.ai.requestedPass = null;
        Act().passTo(g, p, r.target, r.mode);
        return;
      }

      if (p.charging) {
        p.charge += dt / g.chargeTime(p);
        moveTo(p, goal.x, goal.y, false);
        if (p.charge >= p.ai.chargeTarget) Act().shoot(g, p, p.charge, p.ai.aimY);
        return;
      }

      // thủ môn cầm bóng -> phát bóng
      if (p.role === 'GK') {
        stop(p);
        if (p.ai.holdT > cfg.gkHoldTime) {
          const t = Act().findPassTarget(g, p, g.teams[p.team].dir, 0);
          Act().passTo(g, p, t, t && !Act().laneClear(g, p, t.x, t.y, 12) ? 'lob' : 'ground');
        }
        return;
      }

      const near = nearest(opps, p, (o) => o.state !== 'stun');
      const dG = Math.hypot(goal.x - p.x, goal.y - p.y);

      if (p.ai.t <= 0) {
        p.ai.t = D.reaction * U.rand(0.7, 1.3);
        const range = cfg.shootRange * (g.cores.has(p.team, 'sniper_foot') ? g.cores.params('sniper_foot').aiRangeMult : 1);
        const clear = Act().laneClear(g, p, goal.x, goal.y, 12);

        if (dG < range && (clear || dG < cfg.shootRangeGood || Math.random() < 0.25)) {
          p.charging = true; p.charge = 0;
          p.ai.chargeTarget = U.clamp(0.4 + (dG / range) * 0.55 + U.rand(-0.1, 0.1), 0.35, 1.0);
          const gk = nearest(opps, goal, (o) => o.role === 'GK').p;
          p.ai.aimY = (gk && gk.y > f.cy ? -1 : 1) * U.rand(0.35, 0.95);
          return;
        }

        if (near.d < cfg.passPressure || p.ai.holdT > 2.8) {
          const t = Act().findPassTarget(g, p, goal.x - p.x, goal.y - p.y);
          if (t && Math.random() < 0.75) {
            const ahead = (t.x - p.x) * g.teams[p.team].dir > 20;
            const mode = !Act().laneClear(g, p, t.x, t.y, 10) ? 'lob' : ahead && Math.random() < 0.4 ? 'through' : 'ground';
            Act().passTo(g, p, t, mode);
            return;
          }
        }

        if (near.d < 26 && p.cd.skill <= 0 && Math.random() < 0.35 * D.aggression) {
          const dx = p.x - near.p.x, dy = p.y - near.p.y;
          const side = U.norm(-dy, dx);
          const s = Math.random() < 0.5 ? 1 : -1;
          Act().skill(g, p, side.x * s + g.teams[p.team].dir * 0.6, side.y * s);
          return;
        }

        // rê bóng về khung thành, né hậu vệ trước mặt
        let dir = U.norm(goal.x - p.x, goal.y - p.y);
        if (near.p && near.d < cfg.dribbleAvoid) {
          const ox = near.p.x - p.x, oy = near.p.y - p.y;
          if (ox * dir.x + oy * dir.y > 0) {
            const perp = { x: -dir.y, y: dir.x };
            const side = ox * perp.x + oy * perp.y > 0 ? -1 : 1;
            dir = U.norm(dir.x + perp.x * side * 1.2, dir.y + perp.y * side * 1.2);
          }
        }
        p.ai.dir = dir;
        p.ai.sprint = near.d > 36 && p.stamina > 30 && Math.random() < 0.7 * D.aggression + 0.2;
      }
      p.intent.mx = p.ai.dir.x; p.intent.my = p.ai.dir.y; p.intent.sprint = p.ai.sprint;
    },

    /* ---------- đồng đội có bóng ---------- */
    support(dt, g, p) {
      const f = g.field, c = g.ball.owner, dir = g.teams[p.team].dir;
      if (p.ai.runT > 0 && p.ai.runTo) {
        p.ai.runT -= dt;
        moveTo(p, p.ai.runTo.x, p.ai.runTo.y, true);
        return;
      }
      const wob = Math.sin(g.time * 0.9 + p.id) * 14;
      let tx, ty;
      if (p.role === 'FWD' || c.role === 'DEF') {
        tx = c.x + dir * A().supportAhead;
        ty = (c.y < f.cy ? f.cy + f.h * 0.24 : f.cy - f.h * 0.24) + wob;
      } else {
        tx = c.x - dir * 45;
        ty = f.cy + (c.y - f.cy) * 0.3 + wob;
      }
      tx = U.clamp(tx, f.x + 40, f.x + f.w - 40);
      moveTo(p, tx, ty, U.dist(p, { x: tx, y: ty }) > 90, 6);
    },

    /* ---------- phòng ngự ---------- */
    defend(dt, g, p) {
      const D = g.aiProfile(p.team), cfg = A(), C = SFC_CONFIG.game.combat;
      const c = g.ball.owner, tm = g.teams[p.team];
      const ownGoal = g.ownGoal(p.team);
      const humanTeam = p.team === g.humanTeam;
      const outfield = (o) => o.role !== 'GK' && o.state !== 'stun' && o !== g.controlled;

      let presser = null;
      if (!humanTeam) presser = nearest(tm.players, c, (o) => o.role !== 'GK').p;
      else if (g.pressureCall || U.dist(g.controlled, c) > 110) presser = nearest(tm.players, c, outfield).p;

      if (p === presser) {
        let target = c;
        if (p.confused && p.confused.decoy.alive) target = p.confused.decoy;
        const gd = U.norm(ownGoal.x - target.x, ownGoal.y - target.y);
        const d = U.dist(p, target);
        const protectedGK = g.isProtected(c);
        const gap = protectedGK ? 40 : 7; // thủ môn ôm bóng: đứng chờ đón đường phát bóng
        moveTo(p, target.x + gd.x * gap, target.y + gd.y * gap, d > 36, 2);
        if (target !== c || p.ai.t > 0 || protectedGK) return;
        p.ai.t = D.reaction * U.rand(0.8, 1.4);
        const dc = U.dist(p, c);
        p.facing = Math.atan2(c.y - p.y, c.x - p.x);
        const style = tm.cfg.aiStyle || { slide: 1, body: 1 };
        if (dc < C.tackleRange + p.radius * 2 + 2 && Math.random() < 0.55 * D.aggression) Act().tackle(g, p);
        else if (dc < C.bodyCheckRange + p.radius * 2 && Math.random() < 0.18 * D.aggression * style.body) Act().bodyCheck(g, p);
        else if (dc > cfg.slideDistMin && dc < cfg.slideDistMax && Math.random() < 0.1 * D.aggression * style.slide) Act().slide(g, p);
        return;
      }

      // kèm người: đứng giữa cầu thủ nguy hiểm nhất và khung thành
      const threats = g.teams[1 - p.team].players.filter((o) => o !== c && o.role !== 'GK');
      let t = threats[0];
      for (const o of threats) if (Math.abs(o.x - ownGoal.x) < Math.abs(t.x - ownGoal.x)) t = o;
      if (!t) return stop(p);
      const gd = U.norm(ownGoal.x - t.x, ownGoal.y - t.y);
      moveTo(p, t.x + gd.x * cfg.markDistance, t.y + gd.y * cfg.markDistance, U.dist(p, t) > 80, 5);
    },

    /* ---------- bóng lỏng ---------- */
    loose(dt, g, p) {
      const b = g.ball, f = g.field, tm = g.teams[p.team];
      const pred = {
        x: U.clamp(b.x + b.vx * 0.3, f.x + 6, f.x + f.w - 6),
        y: U.clamp(b.y + b.vy * 0.3, f.y + 6, f.y + f.h - 6),
      };
      // người nhận đường chuyền luôn chạy đón bóng
      if (b.passTarget === p) return moveTo(p, pred.x, pred.y, true, 1);

      let chaser = nearest(tm.players, pred, (o) => o.role !== 'GK' && o.state === 'normal' && o !== g.controlled);
      if (p.team === g.humanTeam && g.controlled && U.dist(g.controlled, pred) < chaser.d) chaser = { p: null };
      if (p === chaser.p) return moveTo(p, pred.x, pred.y, true, 1);

      const home = g.formationPos(p);
      moveTo(p, home.x + (b.x - f.cx) * 0.35, home.y + (b.y - f.cy) * 0.25, false, 6);
    },

    /* ---------- thủ môn ---------- */
    goalkeeper(dt, g, p) {
      const f = g.field, b = g.ball, dir = g.teams[p.team].dir;
      const own = g.ownGoal(p.team);
      const lineX = own.x + dir * 10;
      let tx = lineX;
      let ty = U.clamp(f.cy + (b.y - f.cy) * 0.7, f.gTop + 3, f.gBot - 3);
      let sprint = false;

      const incoming = !b.owner && b.vx * dir < -120;
      if (incoming) {
        const t = (lineX - b.x) / b.vx;
        if (t > 0 && t < 1.2) {
          const iy = U.clamp(b.y + b.vy * t, f.gTop - 8, f.gBot + 8);
          ty = iy; sprint = true;
          if (t < 0.35 && Math.abs(iy - p.y) > 8 && p.ai.t <= 0) {
            p.ai.t = 0.6;
            if (Math.random() < g.aiProfile(p.team).shotAccuracy + 0.15) Act().dive(g, p, iy - p.y);
          }
        }
      } else if (!b.owner) {
        const inBox = Math.abs(b.x - own.x) < f.boxDepth && Math.abs(b.y - f.cy) < f.boxWidth / 2;
        if (inBox) {
          const oppNear = nearest(g.teams[1 - p.team].players, b).d;
          if (U.dist(p, b) < oppNear + 10) { tx = b.x; ty = b.y; sprint = true; }
        }
      } else if (b.owner.team !== p.team && Math.abs(b.owner.x - own.x) < 100) {
        tx = own.x + dir * 22;
        ty = U.clamp(b.owner.y, f.gTop - 4, f.gBot + 4);
        if (U.dist(p, b.owner) < 18 && p.ai.t <= 0) { p.ai.t = 0.5; Act().tackle(g, p); }
      }
      moveTo(p, tx, ty, sprint, 2);
      if (Math.hypot(p.intent.mx, p.intent.my) < 0.1) p.facing = dir > 0 ? 0 : Math.PI;
    },
  };

  SFC.AI = AI;
})();
