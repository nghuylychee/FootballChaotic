/* AI — điều khiển mọi cầu thủ không do người chơi điều khiển */
window.SFC = window.SFC || {};

(function () {
  const U = SFC.U;
  const A = () => SFC_CONFIG.game.ai;
  const Act = () => SFC.Actions;
  // kỹ thuật LEGEND cho cầu thủ AI đeo LEGEND (legends.ai; legends.js chỉ nạp ở bản game, máy chủ không có)
  const LGS = () => SFC.Legends;
  const LAI = () => SFC_CONFIG.legends && SFC_CONFIG.legends.ai;
  const legTech = (g, p, id) => !!LGS() && LGS().aiTech(g, p, id);

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

  // điểm bóng có xoáy (cú cứa lòng, Ball.curve) cắt đường x = lineX: chạy thử từng bước 1/60s (tối đa 1.2s). null = không tới
  function curveCross(b, lineX) {
    const k = SFC_CONFIG.game.ball.groundFriction * b.frictionMult * b.shotFm(), dt = 1 / 60, ca = Math.cos(b.curve * dt), sa = Math.sin(b.curve * dt);
    let x = b.x, y = b.y, vx = b.vx, vy = b.vy;
    for (let i = 1; i <= 72; i++) {
      const nx = vx * ca - vy * sa; vy = vx * sa + vy * ca; vx = nx;
      x += vx * dt; y += vy * dt;
      vx = U.damp(vx, k, dt); vy = U.damp(vy, k, dt);
      if ((lineX - x) * (lineX - b.x) <= 0) return { y, t: i * dt };
    }
    return null;
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
      this.watchBall(g);
      for (const p of g.players) {
        if (p.isControlled && g.isHuman(p.team)) continue;
        // trận mơ PROLOGUE: kịch bản điều khiển thay AI tuỳ bài (src/game/tutorial.js)
        if (g.aiHook && g.aiHook(p, dt)) continue;
        p.ai.t -= dt;
        if (p.state === 'windup' && g.ball.owner && g.ball.owner.team !== p.team) {
          // đang gồng Hard attack: xoay theo người cầm bóng
          const c = g.ball.owner;
          const d = U.norm(c.x - p.x, c.y - p.y);
          p.intent.mx = d.x; p.intent.my = d.y; p.intent.sprint = false;
          continue;
        }
        if (p.state !== 'normal') { stop(p); continue; }
        // bị SÚT GIẢ lừa (Actions.fakeShot): khựng tại chỗ
        if (p.ai.fakedT > 0) { p.ai.fakedT -= dt; stop(p); continue; }
        // RAINBOW FLICK đang bay vòng qua đầu: cứ chạy tiếp hướng cũ, bóng tự rơi về chân (Legends.rainbowStep)
        if (p.rainbow) { p.intent.mx = p.ai.dir.x; p.intent.my = p.ai.dir.y; p.intent.sprint = p.ai.sprint; continue; }
        const own = g.ball.owner;
        if (!own) this.firstTime(g, p);
        if (own === p) this.carrier(dt, g, p);
        else if (own && own.team === p.team) this.support(dt, g, p);
        else if (own) { p.ai.runT = 0; this.defend(dt, g, p); }
        else this.loose(dt, g, p);
      }
    },

    // bóng lỏng đổi hướng đột ngột không do cú đá (ai.scramble): đánh số lần bật (g.aiBall.n) + thời điểm, loose() đọc để trễ phản ứng
    watchBall(g) {
      const S = A().scramble, b = g.ball;
      const w = g.aiBall || (g.aiBall = { n: 0, at: 0, hx: 0, hy: 0, k: -1, ok: false });
      const spd = Math.hypot(b.vx, b.vy);
      if (!S || b.owner || spd < S.minSpeed) { w.ok = false; return; }
      const hx = b.vx / spd, hy = b.vy / spd;
      if (w.ok && w.k === b.kickN && hx * w.hx + hy * w.hy < Math.cos(S.turn)) { w.n++; w.at = g.time; }
      Object.assign(w, { hx, hy, k: b.kickN, ok: true });
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
        if (Act().shotPower(g, p, p.charge) >= p.ai.chargeTarget) { this.legendShot(g, p); Act().shoot(g, p, p.charge, p.ai.aimY); }
        return;
      }
      // BRUISER RUN: đối thủ sát bên đang ra đòn -> giật chỏ để phản (xét mỗi bước, không chờ lượt quyết định)
      if (legTech(g, p, 'bruiser') && this.bruiserParry(g, p, opps)) return;

      // bắt được bóng trong vòng cấm nhà -> đứng ôm bóng rồi phát bóng như thủ môn
      if (g.isProtected(p)) {
        stop(p);
        if (p.ai.holdT > cfg.gkHoldTime && !settling) {
          const t = Act().findPassTarget(g, p, g.teams[p.team].dir, 0);
          if (this.shouldPunt(g, p, t)) { const s = this.puntSpot(g, p); Act().punt(g, p, s.x, s.y); }
          else if (this.shouldHoof(g, p, t)) this.hoof(g, p, t);
          else Act().passTo(g, p, t, t && !Act().laneClear(g, p, t.x, t.y, 12) ? 'lob' : 'ground');
        }
        return;
      }

      // đồng đội AI ĐÁ LÙI vừa giành được bóng: chuyền nhanh cho người chơi nếu người chơi đứng phía trên (1 lần mỗi lần giành bóng)
      const O = cfg.outletPass;
      if (O && !M && g.isHuman(p.team) && !settling && !p.ai.outletDone && p.ai.holdT >= O.delay) {
        p.ai.outletDone = true;
        const fwd = g.ctrl[p.team];
        if (fwd && fwd !== p && fwd.state === 'normal' && (fwd.x - p.x) * g.teams[p.team].dir > O.ahead) {
          if (this.shouldHoof(g, p, fwd)) this.hoof(g, p, fwd);
          else Act().passTo(g, p, fwd, Act().laneClear(g, p, fwd.x, fwd.y, 10) ? 'ground' : 'lob');
          return;
        }
      }

      const near = nearest(opps, p, (o) => o.state !== 'stun');
      const dG = Math.hypot(goal.x - p.x, goal.y - p.y);
      // đang khựng sau khi cắt bóng nhưng đã sát khung đối phương: vẫn được sút (pass.intercept.aiDelayGoalDist)
      const shotSettling = settling && dG >= SFC_CONFIG.game.pass.intercept.aiDelayGoalDist;

      if (p.ai.t <= 0) {
        p.ai.t = D.reaction * U.rand(0.7, 1.3);
        // đội có Core SÁT THỦ: dám sút từ xa hơn (mỗi Core +12% tầm)
        const range = M ? f.w / 2 : cfg.shootRange * (g.cores.has(p, 'sniper_foot') ? g.cores.params('sniper_foot').aiRangeMult : 1) * (1 + g.cores.tagCount(p, 'striker') * 0.12);
        const clear = Act().laneClear(g, p, goal.x, goal.y, 12);
        // đồng đội AI: cơ hội mười mươi (khung trống) -> quyết định 1 lần có sút nhanh lực nhẹ hay không
        if (M && !shotSettling && !(p.shotLockT > 0)) {
          const open = this.mateOpenGoal(g, p, dG, clear);
          if (!open) p.ai.openSeen = false;
          else if (!p.ai.openSeen) {
            p.ai.openSeen = true;
            if (Math.random() < M.quickShotChance) {
              p.charging = true; p.charge = 0;
              const [lo, hi] = M.quickShotPower;
              p.ai.chargeTarget = Math.max(Act().shotBasePower(g, p) + 0.02, U.lerp(lo, hi, U.clamp(dG / M.quickShotRange, 0, 1)));
              p.ai.aimY = U.rand(-0.4, 0.4);
              p.shotTarget = p.ai.chargeTarget;
              return;
            }
          }
        }
        // TẠT CÁNH (firstTime.cross): đang ở hành lang cánh 1/3 cuối, có đồng đội trong vòng cấm -> tạt bổng cho người đó
        const FA = SFC_CONFIG.game.firstTime;
        if (!settling && FA && FA.enabled) {
          const xt = this.crossTarget(g, p);
          if (xt && Math.random() < FA.ai.crossChance) { Act().passTo(g, p, xt, 'lob'); return; }
        }
        // vừa đấm cướp được bóng: chưa sút (combat.light.stealShotLock)
        const shoot = shotSettling || p.shotLockT > 0 ? false : M ? this.mateShoots(g, p, dG, clear) : dG < range && (clear || dG < cfg.shootRangeGood || Math.random() < 0.25);

        if (shoot) {
          p.charging = true; p.charge = 0;
          p.ai.chargeTarget = U.clamp(0.4 + (dG / range) * 0.55 + U.rand(-0.1, 0.1), 0.35, 1.0);
          // đội có Core sút (Hoả Cầu, Lôi Cước, Lỗ Đen...): thường giữ đủ lực để kích hoạt
          const cc = g.cores.aiShotCharge(p);
          if (cc && near.d > 45 && Math.random() < 0.75) p.ai.chargeTarget = Math.max(p.ai.chargeTarget, Act().shotPower(g, p, cc) + 0.01);
          const gk = nearest(opps, goal, (o) => g.inKeeperZone(o)).p;
          p.ai.aimY = (gk && gk.y > f.cy ? -1 : 1) * U.rand(0.35, 0.95);
          p.shotTarget = p.ai.chargeTarget;
          return;
        }

        // kỹ thuật LEGEND khi bị áp sát: RAINBOW FLICK qua đầu người chắn trước · BRUISER RUN giật chỏ lúc đang chạy nhanh
        if (!settling && this.legendDribble(g, p, near)) return;

        if (!settling && (near.d < cfg.passPressure || p.ai.holdT > (M ? M.holdTime : 2.8))) {
          const t = Act().findPassTarget(g, p, goal.x - p.x, goal.y - p.y);
          if (t && Math.random() < (M ? M.passChance : 0.75)) {
            const ahead = (t.x - p.x) * g.teams[p.team].dir > 20, clearLane = Act().laneClear(g, p, t.x, t.y, 10);
            let mode = !clearLane ? 'lob' : ahead && Math.random() < 0.4 ? 'through' : 'ground';
            // LOFTED THROUGH (LEGEND): chọc khe bổng qua đầu — đường chuyền lên trên bị chắn: luôn dùng, chọc khe thường: thỉnh thoảng
            if (ahead && legTech(g, p, 'lobthrough') && (mode === 'lob' || (mode === 'through' && Math.random() < LAI().lobthrough))) mode = 'lobthrough';
            Act().passTo(g, p, t, mode);
            if (mode === 'lobthrough') LGS().techFx(g, p, 'lobthrough');
            return;
          }
        }

        // đồng đội AI: quyết định né 1 lần cho mỗi lần bị áp sát (đối thủ vào trong 26px, rời xa quá 40px thì tính lần mới)
        if (M) {
          if (!near.p || near.d > 40) p.ai.dodgeFor = null;
          else if (near.d < 26 && p.ai.dodgeFor !== near.p) { p.ai.dodgeFor = near.p; p.ai.dodgeYes = Math.random() < M.skillChance * D.aggression; }
        }
        const dodge = near.d < 26 && p.cd.skill <= 0 && (M ? p.ai.dodgeFor === near.p && p.ai.dodgeYes : Math.random() < 0.35 * D.aggression * g.cores.aiDodgeMult(p));
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
        // ở cánh gần 1/3 cuối: đi bóng dọc biên (giữ độ dạt) để tạt, thay vì cắt thẳng vào giữa. Tới sát đường biên ngang thì thôi
        if (FA && FA.enabled && this.crossSpot(g, p, 0.15)) {
          const prog = g.teams[p.team].dir > 0 ? (p.x - f.x) / f.w : (f.x + f.w - p.x) / f.w;
          if (p.ai.wing == null) p.ai.wing = Math.random() < FA.ai.wingChance;
          if (prog > 0.9) p.ai.wing = false;
          if (p.ai.wing) {
            const wy = f.cy + Math.sign(p.y - f.cy) * Math.max(FA.cross.wide + 10, Math.abs(p.y - f.cy));
            dir = U.norm(goal.x - p.x, (wy - p.y) * 3);
          }
        }
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
    // c = người cầm bóng; bóng đang chuyền cho đồng đội (loose) thì c = người nhận — đội hình di chuyển liền mạch qua đường chuyền
    support(dt, g, p, c = g.ball.owner) {
      const f = g.field, dir = g.teams[p.team].dir;
      if (p.ai.runT > 0 && p.ai.runTo) {
        p.ai.runT -= dt;
        // tới nơi rồi: đứng chờ bóng (vẫn tính là đang chạy chỗ tới hết runT, người chơi kịp thấy mũi tên)
        if (moveTo(p, p.ai.runTo.x, p.ai.runTo.y, true)) p.facing += U.angleDiff(p.facing, Math.atan2(c.y - p.y, c.x - p.x)) * 0.25;
        return;
      }
      const wob = Math.sin(g.time * 0.9 + p.id) * 14;
      let tx, ty;
      const progress = ((c.x - f.x) / f.w - 0.5) * dir + 0.5;
      // 3v3+: nhiều người không cầm bóng -> chia vai theo vị trí (roles): thấp nhất CHỐT sau lưng bóng, cao nhất BĂNG lên
      // phía cánh đối diện bóng, ở giữa dạt CÙNG cánh làm phương án gần (không ai đứng chồng lên nhau)
      const mates = g.teams[p.team].players.filter((o) => o !== c).sort((a, b) => a.idx - b.idx);
      if (mates.length > 1) {
        const k = mates.indexOf(p), last = mates.length - 1, S = A().support3 || {};
        if (k === 0) {
          tx = c.x - dir * A().restDefenseDist * (progress < A().restDefenseFrom ? (S.anchorBack || 0.55) : 1);
          ty = f.cy + (c.y - f.cy) * 0.3 + wob;
        } else if (k === last && this.crossSpot(g, c, 0.08)) {
          // đồng đội đang ở cánh 1/3 cuối: chạy vào vòng cấm, hơi lệch về cột xa, chờ quả tạt
          const X = SFC_CONFIG.game.firstTime.cross, goal = g.attackGoal(p.team);
          tx = goal.x - dir * X.runDepth;
          ty = f.cy + (c.y < f.cy ? 1 : -1) * X.runSide + wob * 0.3;
        } else if (k === last) {
          tx = c.x + dir * A().supportAhead * (S.runnerAhead || 1.4);
          ty = (c.y < f.cy ? f.cy + f.h * 0.28 : f.cy - f.h * 0.28) + wob;
          if (this.tryRun(g, p, c, 'behind', ty)) return;
        } else {
          tx = c.x + dir * A().supportAhead * (S.wideAhead || 0.4);
          ty = (c.y < f.cy ? f.y + f.h * 0.16 : f.y + f.h * 0.84) + wob;
          if (this.tryRun(g, p, c, 'overlap', ty)) return;
        }
        tx = U.clamp(tx, f.x + 40, f.x + f.w - 40);
        ty = U.clamp(ty, f.y + 24, f.y + f.h - 24);
        const sp = this.openSpot(g, p, c, tx, ty);
        moveTo(p, sp.x, sp.y, U.dist(p, sp) > 90, 6);
        return;
      }
      // chỉ 1 người hỗ trợ (2v2: trận mơ / xem trước Core): người cầm bóng còn ở phần sân nhà -> băng lên làm phương án;
      // đã qua phần sân đối phương -> lùi lại chốt phía sau (chống phản công, sẵn sàng về trông khung)
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

    // ĐIỂM ĐỨNG HỖ TRỢ (ai.openSpot): quanh điểm vai trò (rx, ry) chọn chỗ đường chuyền từ c thoáng + xa đối phương; giữ chỗ cũ nếu không kém nhiều
    openSpot(g, p, c, rx, ry) {
      const O = A().openSpot, f = g.field;
      if (!O) return { x: rx, y: ry };
      const opps = g.teams[1 - p.team].players.filter((o) => o.state !== 'stun');
      const score = (x, y) => {
        let lane = O.laneCap, space = O.spaceCap;
        for (const o of opps) {
          lane = Math.min(lane, U.segDist(o.x, o.y, c.x, c.y, x, y));
          space = Math.min(space, Math.hypot(o.x - x, o.y - y));
        }
        return lane * O.lane + space * O.space - Math.hypot(x - rx, y - ry) * O.drift;
      };
      const S = p.ai.spot;
      // điểm vai trò dịch theo người cầm bóng -> chỗ đã chọn đi theo dưới dạng độ lệch so với điểm vai trò
      if (S && g.time < S.next) return { x: U.clamp(rx + S.ox, f.x + 30, f.x + f.w - 30), y: U.clamp(ry + S.oy, f.y + 18, f.y + f.h - 18) };
      let best = { ox: 0, oy: 0, s: score(rx, ry) };
      for (const r of O.radius) {
        for (let i = 0; i < O.dirs; i++) {
          const a = (i / O.dirs) * Math.PI * 2, ox = Math.cos(a) * r, oy = Math.sin(a) * r;
          const x = rx + ox, y = ry + oy;
          if (x < f.x + 30 || x > f.x + f.w - 30 || y < f.y + 18 || y > f.y + f.h - 18) continue;
          const sc = score(x, y);
          if (sc > best.s) best = { ox, oy, s: sc };
        }
      }
      // giữ chỗ cũ (chống nhảy qua lại) trừ khi chỗ mới hơn hẳn
      if (S) {
        const old = score(rx + S.ox, ry + S.oy);
        if (best.s < old + O.keep) best = { ox: S.ox, oy: S.oy, s: old };
      }
      p.ai.spot = { ox: best.ox, oy: best.oy, next: g.time + O.every };
      return { x: U.clamp(rx + best.ox, f.x + 30, f.x + f.w - 30), y: U.clamp(ry + best.oy, f.y + 18, f.y + f.h - 18) };
    },

    // bắt đầu chạy chỗ (ai.runs): chạy nước rút tới (x, y) trong time s
    startRun(g, p, x, y, time) {
      const f = g.field;
      p.ai.runTo = { x: U.clamp(x, f.x + 24, f.x + f.w - 24), y: U.clamp(y, f.y + 18, f.y + f.h - 18) };
      p.ai.runT = time;
      p.ai.spot = null;
    },

    // ĐI-TRẢ (ai.runs.giveGo): người vừa chuyền (AI) băng lên phía trước nhận lại — gọi từ Actions.passTo
    giveGo(g, p) {
      const R = A().runs && A().runs.giveGo, f = g.field, dir = g.teams[p.team].dir;
      if (!R || p.state !== 'normal' || Math.random() >= R.chance) return;
      const progress = ((p.x - f.x) / f.w - 0.5) * dir + 0.5;
      if (progress < R.minProgress) return;
      const o = nearest(g.teams[1 - p.team].players, p, (q) => q.state !== 'stun').p;
      const side = o ? Math.sign(p.y - o.y) || 1 : Math.sign(f.cy - p.y) || 1;
      this.startRun(g, p, p.x + dir * R.ahead, p.y + side * R.side, R.time);
    },

    // chạy sau lưng hậu vệ (behind, người BĂNG) / chạy chồng biên (overlap, người DẠT) — ai.runs. ly = làn dọc của người chạy
    tryRun(g, p, c, kind, ly) {
      const RS = A().runs, R = RS && RS[kind];
      if (!R || g.ball.owner !== c || g.time < (p.ai.runNext || 0)) return false;
      p.ai.runNext = g.time + RS.every;
      if (g.time < (p.ai.runCd || 0)) return false;
      const f = g.field, dir = g.teams[p.team].dir, goal = g.attackGoal(p.team);
      if (Math.cos(c.facing) * dir < R.faceCos) return false;
      if (kind === 'behind') {
        const progress = ((c.x - f.x) / f.w - 0.5) * dir + 0.5;
        if (progress < R.progress[0] || progress > R.progress[1]) return false;
        // hậu vệ cuối = đối phương (không đứng trông khung) gần khung của họ nhất
        let line = null;
        for (const o of g.teams[1 - p.team].players) {
          if (o.state === 'stun' || g.inKeeperZone(o)) continue;
          if (line == null || o.x * dir > line * dir) line = o.x;
        }
        if (line == null) return false;
        let tx = line + dir * R.depth;
        if ((tx - (goal.x - dir * R.goalGap)) * dir > 0) tx = goal.x - dir * R.goalGap;
        if ((tx - p.x) * dir < 20 || Math.random() >= R.chance) return false;
        this.startRun(g, p, tx, ly, R.time);
      } else {
        if (Math.abs(c.y - f.cy) > f.h * R.mid || Math.random() >= R.chance) return false;
        this.startRun(g, p, c.x + dir * R.ahead, ly, R.time);
      }
      p.ai.runCd = g.time + R.cooldown;
      return true;
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

      // ÁP SÁT (ai.press): vừa mất bóng (phản pressing) hoặc người cầm bóng đi sát mình -> lao vào đánh, trừ người trông khung
      // đang trong vòng nguy hiểm. Không cả đội bu vào: chỉ khi ít hơn maxPressers đồng đội đang gần người cầm bóng hơn mình
      const PR = cfg.press, protectedGK = g.isProtected(c);
      const counter = !!PR && p.ai.cpUntil > g.time && p !== ctl;
      if (PR && p !== presser && p !== ctl && !protectedGK && !(danger && p === keeper)) {
        const dc = U.dist(p, c);
        const closer = tm.players.filter((o) => o !== p && o.state !== 'stun' && U.dist(o, c) < dc).length;
        if ((counter || dc < PR.engage) && closer < PR.maxPressers) presser = p;
      }

      if (p === presser) {
        let target = c;
        if (p.confused && p.confused.decoy.alive) target = p.confused.decoy;
        const gd = U.norm(ownGoal.x - target.x, ownGoal.y - target.y);
        const d = U.dist(p, target);
        const gap = protectedGK ? 40 : 7; // thủ môn ôm bóng: đứng chờ đón đường phát bóng
        // kỹ thuật LEGEND khi áp sát: ENGINE PRESS tự đuổi + chọc bóng · SLIDE TACKLE xoạc từ xa
        if (target === c && !protectedGK && this.legendPress(g, p, c, d, dt)) return;
        const tv = Math.hypot(target.vx || 0, target.vy || 0);
        // bị vượt qua (mình ở phía xa khung nhà hơn người cầm bóng): đuổi thẳng tới chỗ người đó sắp tới, không chạy vòng lên trước
        const beaten = PR && !protectedGK && (p.x - target.x) * gd.x + (p.y - target.y) * gd.y < -4;
        const sprint = PR ? d > PR.sprintDist || tv > PR.walkSpeed : d > 36;
        if (beaten) moveTo(p, target.x + (target.vx || 0) * PR.chaseLead, target.y + (target.vy || 0) * PR.chaseLead, sprint, 1);
        else moveTo(p, target.x + gd.x * gap, target.y + gd.y * gap, sprint, 2);
        if (target !== c || p.ai.t > 0 || protectedGK) return;
        p.ai.t = D.reaction * U.rand(0.8, 1.4) * (counter ? PR.counterReact : 1);
        const dc = U.dist(p, c);
        p.facing = Math.atan2(c.y - p.y, c.x - p.x);
        const style = tm.cfg.aiStyle || { light: 1, hard: 1 };
        // đồng đội AI của người chơi: tỉ lệ đấm riêng (ai.mate.lightChance), không theo aiStyle của đội
        const lightP = (humanTeam ? cfg.mate.lightChance * D.aggression : Math.min(0.9, 0.6 * D.aggression * style.light)) * (counter ? PR.counterPunch : 1);
        // Tay Cao Su: đấm được từ xa
        const reach = Math.max(C.light.range, g.cores.lightReach(p) * 0.8);
        if (dc < reach + p.radius * 2 && Math.random() < lightP) Act().lightAttack(g, p);
        else if (dc > cfg.hardDistMin && dc < cfg.hardDistMax && Math.random() < 0.1 * D.aggression * style.hard * g.cores.aiHardMult(p)) Act().hardAttack(g, p);
        return;
      }

      // chỉ 1 người trông khung: người được chọn (keeperOf) — đồng đội AI lối chơi ai.mate tự xét (mateDanger: chưa ai đứng trong vòng cấm).
      // Người còn lại (3v3) đi kèm người bên dưới, không chạy về đứng chung khung thành
      if (danger && (M || p === keeper)) return this.goalkeeper(dt, g, p);

      // kèm người: đứng giữa đối thủ được giao và khung thành. 3v3+: mỗi người kèm 1 đối thủ khác nhau — người kèm (không cầm quyền điều
      // khiển, không áp sát, không trông khung) xếp theo vị trí, đối thủ xếp theo độ nguy hiểm (gần khung nhà trước); thiếu đối thủ thì
      // người dư lùi chắn giữa bóng và khung
      const threats = g.teams[1 - p.team].players.filter((o) => o !== c)
        .sort((a, b) => Math.abs(a.x - ownGoal.x) - Math.abs(b.x - ownGoal.x));
      const markers = tm.players.filter((o) => o !== ctl && o !== presser && o !== keeper && o.state !== 'stun').sort((a, b) => a.idx - b.idx);
      const mi = Math.max(0, markers.indexOf(p));
      const t = threats[Math.min(mi, threats.length - 1)];
      if (!t) return stop(p);
      if (mi >= threats.length && markers.length > threats.length) {
        const cover = { x: U.lerp(ownGoal.x, c.x, 0.35), y: U.lerp(ownGoal.y, c.y, 0.35) };
        return moveTo(p, cover.x, cover.y, U.dist(p, cover) > 80, 5);
      }
      const gd = U.norm(ownGoal.x - t.x, ownGoal.y - t.y);
      moveTo(p, t.x + gd.x * cfg.markDistance, t.y + gd.y * cfg.markDistance, U.dist(p, t) > 80, 5);
    },

    /* ---------- kỹ thuật LEGEND của cầu thủ AI (legends.ai, user 2026-10-30) ---------- */
    // cú sút sắp ra: POWER SHOT / FINESSE SHOT / TRIVELA (Actions.shoot đọc p.shotStyle)
    legendShot(g, p) {
      const LA = LAI();
      if (!LA) return;
      for (const id of ['power', 'finesse', 'trivela']) if (legTech(g, p, id) && Math.random() < LA.shot) { p.shotStyle = id; return; }
    },
    // BRUISER RUN phản đòn: đối thủ trong tầm giật chỏ đang gồng / tung đòn
    bruiserParry(g, p, opps) {
      const B = SFC_CONFIG.legends.tuning.bruiser;
      const hit = opps.some((o) => (o.state === 'jab' || o.state === 'windup') && Math.hypot(o.x - p.x, o.y - p.y) <= B.range + (o.radius || 6));
      return hit && LGS().bruiser(g, p);
    },
    // cầm bóng bị áp sát (lượt quyết định): RAINBOW FLICK khi người chắn ở phía trước · BRUISER RUN khi đang chạy nhanh mà đối thủ sát bên
    legendDribble(g, p, near) {
      const LA = LAI(), o = near.p;
      if (!LA || !o || p.shotLockT > 0) return false;
      const ahead = (o.x - p.x) * g.teams[p.team].dir > 0;
      if (legTech(g, p, 'rainbow') && ahead && near.d < LA.rainbow.near && Math.random() < LA.rainbow.chance) return LGS().rainbow(g, p);
      const B = SFC_CONFIG.legends.tuning.bruiser;
      if (legTech(g, p, 'bruiser') && p.ai.sprint && near.d <= B.range + (o.radius || 6) && Math.random() < LA.bruiser) return LGS().bruiser(g, p);
      return false;
    },
    // người áp sát người cầm bóng c (cách d px): ENGINE PRESS (còn thể lực: tự đuổi + chọc bóng, hết thì đấm như thường)
    // · SLIDE TACKLE (c trong [min, max] px: xoạc về chỗ c sắp tới). true = đã xử lý bước này
    legendPress(g, p, c, d, dt) {
      const LA = LAI();
      if (!LA) return false;
      if (legTech(g, p, 'engine') && p.stamina > LA.engine.stamina) return LGS().engine(g, p, dt);
      const S = LA.slide;
      if (legTech(g, p, 'slide') && d >= S.min && d <= S.max && g.time >= (p.ai.slideNext || 0)) {
        p.ai.slideNext = g.time + S.every;
        if (Math.random() < S.chance) return LGS().slide(g, p, c.x + (c.vx || 0) * 0.15 - p.x, c.y + (c.vy || 0) * 0.15 - p.y);
      }
      return false;
    },

    /* ---------- dứt điểm 1 chạm + tạt cánh (game.firstTime) ---------- */
    // c đang ở hành lang cánh trong 1/3 sân đối phương (early: tính sớm hơn chừng này tỉ lệ sân, để người BĂNG lên kịp chạy vào)
    crossSpot(g, c, early = 0) {
      const F = SFC_CONFIG.game.firstTime, X = F && F.cross, f = g.field;
      if (!X || !F.enabled) return false;
      const dir = g.teams[c.team].dir;
      const prog = dir > 0 ? (c.x - f.x) / f.w : (f.x + f.w - c.x) / f.w;
      return prog >= X.zone - early && Math.abs(c.y - f.cy) >= X.wide;
    },

    // người nhận quả tạt: đồng đội gần khung nhất, không bị kèm sát
    crossTarget(g, p) {
      if (!this.crossSpot(g, p)) return null;
      const goal = g.attackGoal(p.team), opps = g.teams[1 - p.team].players;
      let best = null, bd = Infinity;
      for (const m of g.teams[p.team].players) {
        if (m === p || m.state !== 'normal' || !Act().crossFrom(g, p, m)) continue;
        if (nearest(opps, m, (o) => o.state !== 'stun' && !g.inKeeperZone(o)).d < 14) continue;
        const d = U.dist(m, goal);
        if (d < bd) { bd = d; best = m; }
      }
      return best;
    },

    // bóng đang tới cầu thủ AI: quyết định 1 lần cho mỗi quả bóng có chờ đá 1 chạm không (tấn công: sút 1 chạm / đánh đầu;
    // phòng ngự: phá quả tạt của đối phương). Lực chờ ngẫu nhiên trong firstTime.ai.charge, nhắm góc xa thủ môn
    firstTime(g, p) {
      const F = SFC_CONFIG.game.firstTime, b = g.ball;
      if (!F || !F.enabled || p.ot || p.ai.ftFor === b.kickN || !Act().ballIncoming(g, p)) return;
      p.ai.ftFor = b.kickN;
      const FA = F.ai, D = g.aiProfile(p.team), goal = g.attackGoal(p.team), dG = U.dist(p, goal);
      const opp = b.lastKickTeam >= 0 && b.lastKickTeam !== p.team;
      let chance = 0, pass = null;
      if (opp) { if (b.cross && !g.inKeeperZone(p)) chance = FA.clearChance; }
      else if (b.passTarget === p && dG < FA.range) {
        if (b.cross) chance = FA.headerChance;
        else if (Act().laneClear(g, p, goal.x, goal.y, 12)) chance = FA.oneTouchChance;
      }
      // BICYCLE KICK (LEGEND): bóng bổng tới mình trong tầm sút (rộng hơn) -> chờ đá, Actions.firstTime tự thành móc xe đạp
      const LB = LAI() && LAI().bicycle;
      if (!opp && !chance && legTech(g, p, 'bicycle') && dG < FA.range * LB.range && Act().highBall(g, p)) chance = LB.chance;
      // đường chuyền bổng tới mình mà không sút: ĐÁNH ĐẦU CHUYỀN cho đồng đội (thay vì chờ bóng rơi xuống chân)
      if (!opp && !chance && b.passTarget === p && FA.headerPassChance && Act().highBall(g, p)) { chance = FA.headerPassChance; pass = 'ground'; }
      if (!chance || Math.random() >= Math.min(0.95, chance * (0.6 + 0.4 * D.aggression))) return;
      if (!Act().armFirstTime(g, p, pass)) return;
      if (pass) { p.ot.aim = { x: g.teams[p.team].dir, y: 0 }; return; }   // chuyền về phía khung đối phương
      p.ot.target = U.rand(FA.charge[0], FA.charge[1]);
      const f = g.field, gk = nearest(g.teams[1 - p.team].players, goal, (o) => g.inKeeperZone(o)).p;
      p.ot.aimY = (gk && gk.y > f.cy ? -1 : 1) * U.rand(0.3, 0.9);
    },

    // đội của p vừa giành được bóng: cầu thủ AI đội kia ở gần người cầm bóng mới -> phản pressing (ai.press.counterTime)
    lostBall(g, p) {
      const PR = A().press;
      if (!PR) return;
      for (const o of g.teams[1 - p.team].players) {
        if (o.state !== 'stun' && U.dist(o, p) < PR.counterDist) o.ai.cpUntil = g.time + PR.counterTime;
      }
    },

    // Đồng đội AI ĐÁ LÙI định chuyền cho người chơi (t) mà đang bị áp sát + đường chuyền bị chắn -> phất bóng lên (ai.hoof)
    shouldHoof(g, p, t) {
      const H = A().hoof;
      if (!H || !t || !g.isHuman(p.team) || mateStyle(g, p)) return false;
      const opps = g.teams[1 - p.team].players.filter((o) => o.state !== 'stun');
      if (!opps.some((o) => U.dist(o, p) < H.pressDist)) return false;
      return opps.some((o) => U.segDist(o.x, o.y, p.x, p.y, t.x, t.y) < H.laneWidth);
    },

    // Thủ môn AI ôm bóng: phất lên trời thay vì chuyền? (ai.gkPunt) Người nhận gặp nguy = đối phương áp sát
    // (ở phần sân nhà tính rộng hơn) -> gần như luôn phất; an toàn thì thỉnh thoảng
    shouldPunt(g, p, t) {
      const P = A().gkPunt;
      if (!P) return false;
      let danger = !t;
      if (t) {
        const d = nearest(g.teams[1 - p.team].players, t, (o) => o.state !== 'stun').d;
        danger = d < P.markDist || (g.inOwnHalf(t) && d < P.ownHalfMarkDist);
      }
      return Math.random() < (danger ? P.dangerChance : P.chance);
    },

    // điểm rơi khi phất bóng: thử vài chỗ phía trên, chọn chỗ đồng đội tới gần hơn đối phương rõ nhất (+ chút ngẫu nhiên)
    puntSpot(g, p) {
      const P = A().gkPunt, f = g.field, dir = g.teams[p.team].dir;
      const mates = g.teams[p.team].players.filter((o) => o !== p && o.state !== 'stun');
      const opps = g.teams[1 - p.team].players.filter((o) => o.state !== 'stun');
      let best = null, bs = -Infinity;
      for (let i = 0; i < P.tries; i++) {
        const s = {
          x: U.clamp(p.x + dir * U.rand(P.dist[0], P.dist[1]), f.x + P.edge, f.x + f.w - P.edge),
          y: U.rand(f.y + P.edge, f.y + f.h - P.edge),
        };
        const score = nearest(opps, s).d - (mates.length ? nearest(mates, s).d : 0) + U.rand(0, P.noise);
        if (score > bs) { bs = score; best = s; }
      }
      return best;
    },

    // phất bóng lên phía trước: thử các góc trong kick.clearAngle, chọn góc thoáng đối phương nhất, nghiêng về phía người chơi
    hoof(g, p, t) {
      const K = SFC_CONFIG.game.kick, dir = g.teams[p.team].dir;
      const opps = g.teams[1 - p.team].players.filter((o) => o.state !== 'stun');
      let best = 0, bs = -Infinity;
      for (let i = -4; i <= 4; i++) {
        const dy = i / 4, ang = Math.atan2(dy * K.clearAngle, dir);
        const ex = p.x + Math.cos(ang) * 90, ey = p.y + Math.sin(ang) * 90;
        let room = 40;
        for (const o of opps) room = Math.min(room, U.segDist(o.x, o.y, p.x, p.y, ex, ey));
        const s = room - Math.abs(ey - t.y) * 0.1;
        if (s > bs) { bs = s; best = dy; }
      }
      Act().clearance(g, p, best);
    },

    // Đồng đội AI ĐÁ LÙI kẹp người cầm bóng cùng người chơi: mình ở gần + người chơi đang áp sát (cả khi gần khung nhà),
    // hoặc người cầm bóng đã vào phần sân nhà nhưng chưa tới mức nguy hiểm
    helpPress(g, p, c, ctl, danger) {
      const H = A().helpPress;
      if (!H || p.state === 'stun') return false;
      if (U.dist(p, c) < H.near && U.dist(ctl, c) < H.ctlNear) return true;
      // bị phản công: người cầm bóng đã vượt qua người chơi (người chơi không còn chắn giữa bóng và khung nhà)
      // -> lên áp sát người cầm bóng, không đứng kèm người còn lại
      if (H.beaten != null && !danger && (ctl.x - c.x) * g.teams[p.team].dir > H.beaten) return true;
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
      // bóng vừa bật bất ngờ (ai.scramble): chưa kịp phản ứng thì giữ nguyên hướng chạy cũ; phản ứng rồi vẫn đoán lệch hướng bóng một lúc
      const S = A().scramble, w = g.aiBall;
      let err = 0;
      if (S && w && w.n) {
        if (p.ai.scrN !== w.n) {
          const D = g.aiProfile(p.team);
          p.ai.scrN = w.n;
          p.ai.scrT = w.at + S.reactBase + D.reaction * S.reactMul + U.dist(p, b) * S.distMul + U.rand(0, S.reactRand);
          p.ai.scrErr = U.rand(-1, 1) * (S.errBase + (1 - D.shotAccuracy) * S.errMul);
        }
        if (g.time < p.ai.scrT) return;
        err = p.ai.scrErr * U.clamp(1 - (g.time - p.ai.scrT) / S.errFade, 0, 1);
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
      if (p === chaser.p && !passToMate) {
        // người đuổi bóng chạy tới chỗ mình đoán (lệch err), còn việc ai đuổi thì cả đội vẫn chọn theo pred thật
        if (!err) return moveTo(p, pred.x, pred.y, true, 1);
        const c = Math.cos(err), s = Math.sin(err);
        return moveTo(p, U.clamp(b.x + (b.vx * c - b.vy * s) * 0.3, f.x + 6, f.x + f.w - 6), U.clamp(b.y + (b.vx * s + b.vy * c) * 0.3, f.y + 6, f.y + f.h - 6), true, 1);
      }
      // bóng đang chuyền cho đồng đội: người còn lại hỗ trợ quanh người nhận (chạy chỗ, điểm đứng thoáng) thay vì về vị trí đội hình
      if (passToMate) return this.support(dt, g, p, b.passTarget);

      // 1 người không đuổi bóng lùi về trông khung (người gần khung nhà nhất, trừ người đuổi bóng / người chơi đang điều khiển).
      // Đội máy / đồng đội AI ĐÁ LÙI: bóng lỏng ở phần sân nhà (hoặc đang bay về khung thành nhà).
      // Đồng đội AI ĐÁ CAO: chỉ khi bóng đã sát khung nhà và người chơi không đứng trong vòng cấm nhà. Người còn lại giữ vị trí đội hình
      const keeper = nearest(tm.players, g.ownGoal(p.team), (o) => o !== ctl && o !== chaser.p && o.state !== 'stun').p;
      const cover = M
        ? U.dist(b, g.ownGoal(p.team)) < A().mate.dangerDist && !(ctl && g.inKeeperZone(ctl))
        : (b.x - f.cx) * dir < 0 || b.vx * dir < -120;
      if (!passToMate && cover && (M || p === keeper)) return this.goalkeeper(dt, g, p);

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

      const incoming = !b.owner && (b.vx * dir < -120 || (b.fx.chip && b.vx * dir < 0));   // sút bổng bay chậm vẫn tính là đang tới
      if (incoming) {
        const t = (lineX - b.x) / b.vx;
        // đọc cú sút (ai.keeper): mỗi cú bốc 1 lần độ trễ + sai số theo độ khó; chưa hết trễ thì đứng nguyên chỗ
        const K = A().keeper, prof = g.aiProfile(p.team);
        let gr = p.ai.gkRead;
        if (!gr || gr.n !== b.kickN) {
          const err = K.errBase + (1 - prof.shotAccuracy) * K.errMul;
          gr = p.ai.gkRead = { n: b.kickN, y0: p.y, at: g.time + K.reactBase + prof.reaction * K.reactMul, err: U.rand(-err, err) };   // y0: chỗ đứng lúc thấy cú sút (độ vươn, Game.tryControl)
        }
        if (g.time < gr.at) { tx = p.x; ty = p.y; }
        else if (b.fx.chip) { tx = p.x; ty = U.clamp(b.y + b.vy * Math.max(0, t), f.gTop, f.gBot); sprint = true; }   // bị lob: không kịp lùi về vạch, chỉ dịch ngang
        else if (t > 0 && t < 1.2) {
          let ry = b.y + b.vy * t;   // điểm bóng qua vạch thật -> đoán lệch theo tỉ lệ quãng phải đi
          // cú cứa lòng (technique.finesse): đọc được đường cong theo shotAccuracy (Elo thấp đoán như bóng đi thẳng)
          const cc = b.curve ? curveCross(b, lineX) : null;
          if (cc) ry += (cc.y - ry) * U.clamp(prof.shotAccuracy * SFC_CONFIG.game.technique.finesseRead, 0, 1);
          const iy = U.clamp(p.y + (ry - p.y) * (1 + gr.err), f.gTop - 8, f.gBot + 8);
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
