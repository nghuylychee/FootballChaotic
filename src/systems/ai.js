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

  // người trông khung của đội: cầu thủ AI (không phải người đang được điều khiển) gần khung thành nhà nhất
  function keeperOf(g, team) {
    const ctl = g.isHuman(team) ? g.ctrl[team] : null;
    return nearest(g.teams[team].players, g.ownGoal(team), (o) => o !== ctl && o.state !== 'stun').p;
  }

  // lối chơi ai.mate: đồng đội AI của người chơi ở vị trí thuộc mate.roles (mặc định ĐÁ CAO) -> cấu hình mate; còn lại null.
  // Đồng đội AI ĐÁ LÙI giữ lối chơi thủ: trông khung, kèm người, chuyền nhiều (như đội máy)
  function mateStyle(g, p) {
    const M = A().mate;
    return g.isHuman(p.team) && (!M.roles || M.roles.includes(p.role)) ? M : null;
  }

  const AI = {
    update(dt, g) {
      for (const p of g.players) {
        if (p.isControlled && g.isHuman(p.team)) continue;
        p.ai.t -= dt;
        if (p.state === 'windup' && g.ball.owner && g.ball.owner.team !== p.team) {
          // đang gồng Hard attack: xoay theo người cầm bóng
          const c = g.ball.owner;
          const d = U.norm(c.x - p.x, c.y - p.y);
          p.intent.mx = d.x; p.intent.my = d.y; p.intent.sprint = false;
          continue;
        }
        if (p.state !== 'normal') { stop(p); continue; }
        const own = g.ball.owner;
        if (own === p) this.carrier(dt, g, p);
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
      // đồng đội AI ĐÁ CAO của người chơi: ưu tiên rê bóng + dứt điểm, ít chuyền (ai.mate)
      const M = mateStyle(g, p);
      p.ai.holdT += dt;
      // vừa cắt được đường chuyền: khựng một nhịp — vẫn rê bóng / né, chưa chuyền / sút (kể cả khi người chơi đòi bóng)
      p.ai.interceptT = Math.max(0, p.ai.interceptT - dt);
      const settling = p.ai.interceptT > 0;

      if (p.ai.requestedPass && !settling) {
        const r = p.ai.requestedPass; p.ai.requestedPass = null;
        Act().passTo(g, p, r.target, r.mode);
        return;
      }

      if (p.charging) {
        p.charge += dt / g.chargeTime(p);
        moveTo(p, goal.x, goal.y, false);
        if (Act().shotPower(g, p, p.charge) >= p.ai.chargeTarget) Act().shoot(g, p, p.charge, p.ai.aimY);
        return;
      }

      // bắt được bóng trong vòng cấm nhà -> đứng ôm bóng rồi phát bóng như thủ môn
      if (g.isProtected(p)) {
        stop(p);
        if (p.ai.holdT > cfg.gkHoldTime && !settling) {
          const t = Act().findPassTarget(g, p, g.teams[p.team].dir, 0);
          Act().passTo(g, p, t, t && !Act().laneClear(g, p, t.x, t.y, 12) ? 'lob' : 'ground');
        }
        return;
      }

      // đồng đội AI ĐÁ LÙI vừa giành được bóng: chuyền nhanh cho người chơi nếu người chơi đứng phía trên (1 lần mỗi lần giành bóng)
      const O = cfg.outletPass;
      if (O && !M && g.isHuman(p.team) && !settling && !p.ai.outletDone && p.ai.holdT >= O.delay) {
        p.ai.outletDone = true;
        const fwd = g.ctrl[p.team];
        if (fwd && fwd !== p && fwd.state === 'normal' && (fwd.x - p.x) * g.teams[p.team].dir > O.ahead) {
          Act().passTo(g, p, fwd, Act().laneClear(g, p, fwd.x, fwd.y, 10) ? 'ground' : 'lob');
          return;
        }
      }

      const near = nearest(opps, p, (o) => o.state !== 'stun');
      const dG = Math.hypot(goal.x - p.x, goal.y - p.y);

      if (p.ai.t <= 0) {
        p.ai.t = D.reaction * U.rand(0.7, 1.3);
        // đội có Core SÁT THỦ: dám sút từ xa hơn (mỗi Core +12% tầm)
        const range = M ? f.w / 2 : cfg.shootRange * (g.cores.has(p.team, 'sniper_foot') ? g.cores.params('sniper_foot').aiRangeMult : 1) * (1 + g.cores.tagCount(p.team, 'striker') * 0.12);
        const clear = Act().laneClear(g, p, goal.x, goal.y, 12);
        // đồng đội AI: cơ hội mười mươi (khung trống) -> quyết định 1 lần có sút nhanh lực nhẹ hay không
        if (M && !settling) {
          const open = this.mateOpenGoal(g, p, dG, clear);
          if (!open) p.ai.openSeen = false;
          else if (!p.ai.openSeen) {
            p.ai.openSeen = true;
            if (Math.random() < M.quickShotChance) {
              p.charging = true; p.charge = 0;
              const [lo, hi] = M.quickShotPower;
              p.ai.chargeTarget = Math.max(Act().shotBasePower(g, p) + 0.02, U.lerp(lo, hi, U.clamp(dG / M.quickShotRange, 0, 1)));
              p.ai.aimY = U.rand(-0.4, 0.4);
              return;
            }
          }
        }
        const shoot = settling ? false : M ? this.mateShoots(g, p, dG, clear) : dG < range && (clear || dG < cfg.shootRangeGood || Math.random() < 0.25);

        if (shoot) {
          p.charging = true; p.charge = 0;
          p.ai.chargeTarget = U.clamp(0.4 + (dG / range) * 0.55 + U.rand(-0.1, 0.1), 0.35, 1.0);
          // đội có Core sút (Hoả Cầu, Lôi Cước, Lỗ Đen...): thường giữ đủ lực để kích hoạt
          const cc = g.cores.aiShotCharge(p.team);
          if (cc && near.d > 45 && Math.random() < 0.75) p.ai.chargeTarget = Math.max(p.ai.chargeTarget, Act().shotPower(g, p, cc) + 0.01);
          const gk = nearest(opps, goal, (o) => g.inKeeperZone(o)).p;
          p.ai.aimY = (gk && gk.y > f.cy ? -1 : 1) * U.rand(0.35, 0.95);
          return;
        }

        if (!settling && (near.d < cfg.passPressure || p.ai.holdT > (M ? M.holdTime : 2.8))) {
          const t = Act().findPassTarget(g, p, goal.x - p.x, goal.y - p.y);
          if (t && Math.random() < (M ? M.passChance : 0.75)) {
            const ahead = (t.x - p.x) * g.teams[p.team].dir > 20;
            const mode = !Act().laneClear(g, p, t.x, t.y, 10) ? 'lob' : ahead && Math.random() < 0.4 ? 'through' : 'ground';
            Act().passTo(g, p, t, mode);
            return;
          }
        }

        // đồng đội AI: quyết định né 1 lần cho mỗi lần bị áp sát (đối thủ vào trong 26px, rời xa quá 40px thì tính lần mới)
        if (M) {
          if (!near.p || near.d > 40) p.ai.dodgeFor = null;
          else if (near.d < 26 && p.ai.dodgeFor !== near.p) { p.ai.dodgeFor = near.p; p.ai.dodgeYes = Math.random() < M.skillChance * D.aggression; }
        }
        const dodge = near.d < 26 && p.cd.skill <= 0 && (M ? p.ai.dodgeFor === near.p && p.ai.dodgeYes : Math.random() < 0.35 * D.aggression * g.cores.aiDodgeMult(p.team));
        if (dodge) {
          if (M) p.ai.dodgeYes = false;
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
      // người cầm bóng còn ở phần sân nhà -> băng lên làm phương án;
      // đã qua phần sân đối phương -> lùi lại chốt phía sau (chống phản công, sẵn sàng về trông khung)
      const progress = ((c.x - f.x) / f.w - 0.5) * dir + 0.5;
      if (progress < A().restDefenseFrom) {
        tx = c.x + dir * A().supportAhead;
        ty = (c.y < f.cy ? f.cy + f.h * 0.24 : f.cy - f.h * 0.24) + wob;
      } else {
        tx = c.x - dir * A().restDefenseDist;
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
      const humanTeam = g.isHuman(p.team);
      const M = mateStyle(g, p);
      const ctl = humanTeam ? g.ctrl[p.team] : null;
      // đội máy / đồng đội AI ĐÁ LÙI: đối phương cầm bóng đã tới gần -> người gần khung nhất trông khung, người còn lại áp sát
      // đồng đội AI ĐÁ CAO: luôn áp sát, chỉ về trông khung khi nguy hiểm rõ ràng (ai.mate)
      const danger = M ? this.mateDanger(g, p, c) : Math.abs(c.x - ownGoal.x) < (humanTeam ? cfg.mateKeeperCoverDist : cfg.keeperCoverDist);
      const keeper = danger && !M ? keeperOf(g, p.team) : null;

      let presser = null;
      if (!humanTeam) presser = nearest(tm.players, c, (o) => o !== keeper).p;
      else if (M) { if (!danger) presser = p; }
      // đồng đội AI ĐÁ LÙI: lên áp sát khi bóng chưa tới gần khung nhà và người chơi ở xa người cầm bóng,
      // hoặc cùng người chơi kẹp người cầm bóng (helpPress)
      else if (ctl && this.helpPress(g, p, c, ctl, danger)) presser = p;
      else if (!ctl || (!danger && U.dist(ctl, c) > cfg.keeperPressDist)) presser = nearest(tm.players, c, (o) => o.state !== 'stun' && o !== ctl).p;

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
        const style = tm.cfg.aiStyle || { light: 1, hard: 1 };
        // đồng đội AI của người chơi: tỉ lệ đấm riêng (ai.mate.lightChance), không theo aiStyle của đội
        const lightP = humanTeam ? cfg.mate.lightChance * D.aggression : Math.min(0.9, 0.6 * D.aggression * style.light);
        // Tay Cao Su: đấm được từ xa
        const reach = Math.max(C.light.range, g.cores.lightReach(p) * 0.8);
        if (dc < reach + p.radius * 2 && Math.random() < lightP) Act().lightAttack(g, p);
        else if (dc > cfg.hardDistMin && dc < cfg.hardDistMax && Math.random() < 0.1 * D.aggression * style.hard * g.cores.aiHardMult(p.team)) Act().hardAttack(g, p);
        return;
      }

      if (danger) return this.goalkeeper(dt, g, p);

      // kèm người: đứng giữa cầu thủ nguy hiểm nhất và khung thành
      const threats = g.teams[1 - p.team].players.filter((o) => o !== c);
      let t = threats[0];
      for (const o of threats) if (Math.abs(o.x - ownGoal.x) < Math.abs(t.x - ownGoal.x)) t = o;
      if (!t) return stop(p);
      const gd = U.norm(ownGoal.x - t.x, ownGoal.y - t.y);
      moveTo(p, t.x + gd.x * cfg.markDistance, t.y + gd.y * cfg.markDistance, U.dist(p, t) > 80, 5);
    },

    // Đồng đội AI ĐÁ LÙI kẹp người cầm bóng cùng người chơi: mình ở gần + người chơi đang áp sát (cả khi gần khung nhà),
    // hoặc người cầm bóng đã vào phần sân nhà nhưng chưa tới mức nguy hiểm
    helpPress(g, p, c, ctl, danger) {
      const H = A().helpPress;
      if (!H || p.state === 'stun') return false;
      if (U.dist(p, c) < H.near && U.dist(ctl, c) < H.ctlNear) return true;
      return H.ownHalf && !danger && (c.x - g.field.cx) * g.teams[p.team].dir < 0;
    },

    // Đồng đội AI: nguy hiểm rõ ràng =người cầm bóng đã vào gần khung nhà và người chơi không đứng trong vòng cấm nhà -> về trông khung.
    // Lúc nguy hiểm bắt đầu mà đang áp sát sát người (stickDist) thì cứ áp sát; đã quyết định về trông khung thì giữ tới khi hết nguy hiểm
    // (không đổi ý khi chạy ngang qua người cầm bóng trên đường về)
    mateDanger(g, p, c) {
      const M = A().mate, ctl = g.ctrl[p.team];
      const near = U.dist(c, g.ownGoal(p.team)) < M.dangerDist && !(ctl && ctl !== p && g.inKeeperZone(ctl));
      const covering = p.ai.coverT != null && g.time - p.ai.coverT < 0.2;
      if (!near || (!covering && U.dist(p, c) <= M.stickDist)) return false;
      p.ai.coverT = g.time;
      return true;
    },

    // Đồng đội AI: cơ hội mười mươi = phần sân đối phương, gần khung, đường sút thoáng, không đối phương nào trông khung
    mateOpenGoal(g, p, dG, clear) {
      if (g.inOwnHalf(p) || !clear || dG > A().mate.quickShotRange) return false;
      return !g.teams[1 - p.team].players.some((o) => o.state !== 'stun' && g.inKeeperZone(o));
    },

    // Đồng đội AI sút ở bất kỳ đâu trên phần sân đối phương; càng xa khung càng ít sút
    mateShoots(g, p, dG, clear) {
      const M = A().mate;
      if (g.inOwnHalf(p)) return false;
      const k = U.clamp((dG - M.shootNear) / (g.field.w / 2 - M.shootNear), 0, 1);
      let chance = U.lerp(M.shootFarChance, M.shootNearChance, (1 - k) * (1 - k));
      if (!clear) chance *= M.blockedMult;
      return Math.random() < chance;
    },

    /* ---------- bóng lỏng ---------- */
    loose(dt, g, p) {
      const b = g.ball, f = g.field, tm = g.teams[p.team];
      const pred = {
        x: U.clamp(b.x + b.vx * 0.3, f.x + 6, f.x + f.w - 6),
        y: U.clamp(b.y + b.vy * 0.3, f.y + 6, f.y + f.h - 6),
      };
      const mate = g.isHuman(p.team), M = mateStyle(g, p);
      // người nhận đường chuyền: chủ động chạy tới điểm đón bóng sớm nhất
      if (b.passTarget === p) {
        const ip = Act().receiveMove(g, p);
        // đồng đội AI của người chơi: chạy nước rút tới bóng (chuyền lỗi: luôn chạy; chuyền chuẩn: thỉnh thoảng đi bộ)
        if (mate) p.intent.sprint = U.dist(p, ip) > 6 && (b.sloppy || !p.ai.recvWalk);
        return;
      }
      // bóng đang bay về khung thành nhà -> người gần khung nhất chặn trên đường bay
      // (đội máy / đồng đội AI ĐÁ LÙI: cú sút / phá bóng của đối phương; đồng đội AI ĐÁ CAO: chỉ khi là cú sút)
      const dir = tm.dir;
      const threat = b.lastKickTeam === 1 - p.team && b.vx * dir < -150 && (!M || b.kind === 'shot');
      if (threat && p === keeperOf(g, p.team)) return this.goalkeeper(dt, g, p);
      // bóng đang được chuyền cho đồng đội -> không đuổi theo, giữ vị trí
      const passToMate = b.passTarget && b.passTarget.team === p.team && b.passTarget.state !== 'stun';

      const ctl = mate ? g.ctrl[p.team] : null;
      let chaser = nearest(tm.players, pred, (o) => o.state === 'normal' && o !== ctl);
      if (ctl && U.dist(ctl, pred) < chaser.d) chaser = { p: null };
      if (p === chaser.p && !passToMate) return moveTo(p, pred.x, pred.y, true, 1);

      // người không đuổi bóng lùi về trông khung. Đội máy / đồng đội AI ĐÁ LÙI: bóng lỏng ở phần sân nhà (hoặc đang bay về khung thành nhà).
      // Đồng đội AI ĐÁ CAO: chỉ khi bóng đã sát khung nhà và người chơi không đứng trong vòng cấm nhà
      const cover = M
        ? U.dist(b, g.ownGoal(p.team)) < A().mate.dangerDist && !(ctl && g.inKeeperZone(ctl))
        : (b.x - f.cx) * dir < 0 || b.vx * dir < -120;
      if (!passToMate && cover) return this.goalkeeper(dt, g, p);

      const home = g.formationPos(p);
      moveTo(p, home.x + (b.x - f.cx) * 0.35, home.y + (b.y - f.cy) * 0.25, false, 6);
    },

    /* ---------- trông khung thành (vòng cấm nhà) ---------- */
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
        if (U.dist(p, b.owner) < 18 && p.ai.t <= 0) {
          p.ai.t = 0.5;
          p.facing = Math.atan2(b.owner.y - p.y, b.owner.x - p.x);
          Act().lightAttack(g, p);
        }
      }
      moveTo(p, tx, ty, sprint || U.dist(p, { x: tx, y: ty }) > 40, 2);
      if (Math.hypot(p.intent.mx, p.intent.my) < 0.1) p.facing = dir > 0 ? 0 : Math.PI;
    },
  };

  SFC.AI = AI;
})();
