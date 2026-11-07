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

  // độ gắt áp sát (ai.press) theo độ hung hăng AI: aggression >= press.fullAt -> đủ mức; AI non tay (Area đầu, act 1 GOAT PATH) nhẹ hẳn
  function pressK(D, PR) { return U.clamp((D.aggression || 0) / (PR.fullAt || 1), 0, 1); }
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

  // người trông khung của đội: cầu thủ AI được giữ khung (g.canKeep: chỉ ĐÁ LÙI, user 2026-11-01), không phải người đang được điều khiển.
  // Người chơi đang điều khiển ĐÁ LÙI -> không AI nào về trông khung (FWD / MID chỉ tắc bóng)
  function keeperOf(g, team) {
    const ctl = g.isHuman(team) ? g.ctrl[team] : null;
    return nearest(g.teams[team].players, g.ownGoal(team), (o) => o !== ctl && o.state !== 'stun' && g.canKeep(o)).p;
  }

  // ĐÁ LÙI đội máy giữ khung (ai.keeperStay): đội máy không cầm bóng -> người giữ khung luôn trông khung, chỉ lên khi đội mình cầm bóng.
  // Không áp cho đội của người chơi (đồng đội AI có luật riêng), Skill game, đội chỉ còn 1 người (không ai khác áp sát)
  function keeperStays(g, team) {
    return !!A().keeperStay && !g.isHuman(team) && !g.drill && g.teams[team].players.length > 1;
  }
  // ĐÁ LÙI AI CỦA NGƯỜI CHƠI VỀ KHUNG KHI MẤT BÓNG (ai.keeperRecover, user 2026-11-07): đội người chơi không cầm bóng -> đồng đội AI giữ khung
  // lập tức về trông khung ở mọi khoảng cách (như keeperStay của đội máy), chỉ rời khung tắc người cầm bóng khi người đó chưa có ai kèm
  function keeperRecovers(g, team) {
    const R = A().keeperRecover;
    return !!(R && R.mates) && g.isHuman(team) && !g.drill && g.teams[team].players.length > 1;
  }
  // người giữ khung AI của đội (đội máy: keeperStay · đội người chơi: keeperRecover.mates) — null nếu đội không áp luật trông khung
  function aiKeeper(g, team) {
    return keeperStays(g, team) || keeperRecovers(g, team) ? keeperOf(g, team) : null;
  }
  // THỦ MÔN LAO LÊN KICKDOWN (ai.keeperHome.rush): phần sân nhà không còn đồng đội nào khác đứng được (kể cả người chơi) và người cầm bóng
  // đối phương c đã vào phần sân nhà, cách khung nhà dưới rush.dist
  function keeperRush(g, p, c) {
    const H = A().keeperHome, R = H && H.rush;
    if (!R || !c || c.team === p.team || (c.x - g.field.cx) * g.teams[p.team].dir >= 0 || U.dist(c, g.ownGoal(p.team)) > R.dist) return false;   // c ở phần sân nhà của p
    return !g.teams[p.team].players.some((o) => o !== p && o.state !== 'stun' && g.inOwnHalf(o));
  }
  // người cầm bóng c đã có đồng đội của p (kể cả người chơi) kèm sát (keeperRecover.marked px)
  function carrierMarked(g, p, c) {
    const R = A().keeperRecover;
    return g.teams[p.team].players.some((o) => o !== p && o.state !== 'stun' && U.dist(o, c) < R.marked);
  }

  // NGƯỜI CẦM BÓNG ĐỨNG YÊN (ai.stillCarrier): đã đứng yên bao lâu (s, 0 = đang chạy). Theo dõi ở AI.update (g.aiStill)
  function stillFor(g, c) {
    const S = g.aiStill;
    return S && c && S.id === c.id ? g.time - S.at : 0;
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
      this.watchStill(g);
      // vùng nguy hiểm của luật trận (FOOTBALL STORY / Elite, shared/systems/matchmods.js) — AI đội bị nhắm né (avoid)
      const hz = g.mod && SFC.MatchMods ? SFC.MatchMods.hazards(g) : null;
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
        if (hz && p.team !== hz.team) this.avoid(dt, g, p, hz.list);
      }
    },

    // người cầm bóng chạy chậm hơn stillCarrier.speed: ghi lúc bắt đầu đứng yên (g.aiStill = { id, at }); chạy lại / đổi người cầm -> xoá
    watchStill(g) {
      const S = A().stillCarrier, c = g.ball.owner;
      if (!S || !c || Math.hypot(c.vx, c.vy) >= S.speed) { g.aiStill = null; return; }
      if (!g.aiStill || g.aiStill.id !== c.id) g.aiStill = { id: c.id, at: g.time };
    },
    // người cầm bóng c đã đứng yên đủ lâu (ai.stillCarrier.time)
    carrierStill(g, c) {
      const S = A().stillCarrier;
      return !!S && stillFor(g, c) >= S.time;
    },

    // NÉ LUẬT SÂN (ai.avoid): sửa p.intent vừa quyết xong. Khoảng cách có dấu tới vùng (âm = đang trong) + hướng ra ngoài (nx, ny)
    hazardDist(h, x, y) {
      if (h.c) {
        const dx = x - h.c[0], dy = y - h.c[1], L = Math.hypot(dx, dy) || 0.001;
        return { d: L - h.r, nx: dx / L, ny: dy / L };
      }
      if (h.s) {
        const [x1, y1, x2, y2] = h.s, vx = x2 - x1, vy = y2 - y1, l2 = vx * vx + vy * vy || 1;
        const k = U.clamp(((x - x1) * vx + (y - y1) * vy) / l2, 0, 1), cx = x1 + vx * k, cy = y1 + vy * k;
        let dx = x - cx, dy = y - cy, L = Math.hypot(dx, dy);
        // nằm đúng trên đường: thoát theo pháp tuyến
        if (L < 0.001) { const n = U.norm(-vy, vx); dx = n.x; dy = n.y; L = 0.001; }
        return { d: L - h.w, nx: dx / (L || 1), ny: dy / (L || 1) };
      }
      const [x0, y0, x1, y1] = h.b, inside = x > x0 && x < x1 && y > y0 && y < y1;
      if (inside) {
        // ra mép gần nhất
        const e = [[x - x0, -1, 0], [x1 - x, 1, 0], [y - y0, 0, -1], [y1 - y, 0, 1]].reduce((a, b) => (b[0] < a[0] ? b : a));
        return { d: -e[0], nx: e[1], ny: e[2] };
      }
      const cx = U.clamp(x, x0, x1), cy = U.clamp(y, y0, y1), dx = x - cx, dy = y - cy, L = Math.hypot(dx, dy) || 0.001;
      return { d: L, nx: dx / L, ny: dy / L };
    },
    avoid(dt, g, p, list) {
      const V = A().avoid;
      if (!V || p.state !== 'normal' || p.airZ > 0) return;
      let worst = null;
      for (const h of list) { const r = this.hazardDist(h, p.x, p.y); if (!worst || r.d < worst.d) worst = Object.assign(r, { h }); }
      if (!worst) return;
      const it = p.intent, m = V.margin + p.radius;   // luật trúng đòn tính cả bán kính người
      // đang đứng trong / sát vùng (không tính vùng soft: đi ra từ từ là được) -> chạy thẳng ra, vùng sắp trúng thì lướt
      if (worst.d < m && !(worst.h.soft && worst.d > m - V.margin)) {
        if (worst.h.hit && worst.d < p.radius && p.cd.skill <= 0 && Math.random() < V.dash * dt) Act().skill(g, p, worst.nx, worst.ny);
        const n = U.norm(worst.nx + it.mx * 0.3, worst.ny + it.my * 0.3);
        it.mx = n.x; it.my = n.y;
        if (!worst.h.soft) it.sprint = p.stamina > 10;
        return;
      }
      // nhìn trước dọc đường đi (4 điểm tới look s — 1 điểm thì nhảy qua mất vũng nhỏ): sắp bước vào vùng -> bỏ phần hướng đi vào, trượt dọc mép
      const sp = SFC_CONFIG.game.player.speed * (it.sprint ? SFC_CONFIG.game.player.sprintMult : 1) * V.look;
      for (const k of [0.25, 0.5, 0.75, 1]) {
        const qx = p.x + it.mx * sp * k, qy = p.y + it.my * sp * k;
        for (const h of list) {
          const r = this.hazardDist(h, qx, qy);
          if (r.d >= m) continue;
          const into = it.mx * r.nx + it.my * r.ny;
          if (into < 0) { it.mx -= into * r.nx; it.my -= into * r.ny; }
        }
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
        // cú sút mạnh (định nạp tới kick.powerPose trở lên): tư thế lấy đà như người chơi suốt lúc nạp. Chỉ là hình: di chuyển / lúc sút / vị trí bóng giữ nguyên
        if (p.ai.chargeTarget >= SFC_CONFIG.game.kick.powerPose) Act().powerStart(g, p);
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
        let shoot = shotSettling || p.shotLockT > 0 ? false : M ? this.mateShoots(g, p, dG, clear) : dG < range && (clear || dG < cfg.shootRangeGood || Math.random() < 0.25);
        // KNUCKLEBALL: đứng xa khung ở phần sân đối thủ -> thỉnh thoảng dội từ xa (bóng vọt qua đầu người chắn, legendShot chọn kiểu sút)
        const knuckle = !shoot && !shotSettling && !(p.shotLockT > 0) && this.longKnuckle(g, p, dG);
        if (knuckle) shoot = true;

        if (shoot) {
          p.charging = true; p.charge = 0;
          p.ai.knuckle = knuckle;
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
      // THỦ MÔN AI Ở NHÀ (ai.keeperHome.home): đội mình cầm bóng -> người giữ khung vẫn đứng trước khung, không lên CHỐT / chạy chỗ (step: dâng làm CHỐT tới maxX)
      const KH = A().keeperHome, gk = KH && KH.home ? aiKeeper(g, p.team) : null;
      if (gk && p === gk) {
        p.ai.runT = 0;
        const own = g.ownGoal(p.team), ST = KH.step;
        // DEF DÂNG LÀM CHỐT (ai.keeperHome.step): đứng sau lưng bóng như người CHỐT 3 người, kẹp trong [depth, maxX x chiều dài sân] tính từ vạch nhà
        if (ST && (g.isHuman(p.team) ? ST.mates : ST.bots)) {
          const S = A().support3 || {}, prog = ((c.x - f.x) / f.w - 0.5) * dir + 0.5;
          const back = A().restDefenseDist * (prog < A().restDefenseFrom ? (S.anchorBack || 0.55) : 1);
          const d = U.clamp((c.x - dir * back - own.x) * dir, KH.depth, (ST.maxX || 0.45) * f.w);
          const sp = this.openSpot(g, p, c, own.x + dir * d, f.cy + (c.y - f.cy) * 0.3);
          moveTo(p, sp.x, sp.y, U.dist(p, sp) > 90, 6);
          if (Math.hypot(p.intent.mx, p.intent.my) < 0.1) p.facing = Math.atan2(c.y - p.y, c.x - p.x);
          return;
        }
        const ty = U.clamp(f.cy + (c.y - f.cy) * KH.track, f.gTop - 4, f.gBot + 4);
        moveTo(p, own.x + dir * KH.depth, ty, U.dist(p, { x: own.x + dir * KH.depth, y: ty }) > 60, 4);
        if (Math.hypot(p.intent.mx, p.intent.my) < 0.1) p.facing = Math.atan2(c.y - p.y, c.x - p.x);
        return;
      }
      if (p.ai.runT > 0 && p.ai.runTo) {
        p.ai.runT -= dt;
        // CHẠY CHỒNG BIÊN 2 chặng (ai.runs.overlap): chặng 1 vòng ra ngoài mở góc (runVia), tới nơi / đã vượt qua vạch đó thì băng thẳng lên runTo
        const V = p.ai.runVia;
        if (V && U.dist(p, V) > 12 && (V.x - p.x) * dir > 0) { moveTo(p, V.x, V.y, true); return; }
        p.ai.runVia = null;
        // tới nơi rồi: đứng chờ bóng (vẫn tính là đang chạy chỗ tới hết runT, người chơi kịp thấy mũi tên)
        if (moveTo(p, p.ai.runTo.x, p.ai.runTo.y, true)) p.facing += U.angleDiff(p.facing, Math.atan2(c.y - p.y, c.x - p.x)) * 0.25;
        return;
      }
      const wob = Math.sin(g.time * 0.9 + p.id) * 14;
      let tx, ty;
      const progress = ((c.x - f.x) / f.w - 0.5) * dir + 0.5;
      // 3v3+: nhiều người không cầm bóng -> chia vai theo vị trí (roles): thấp nhất CHỐT sau lưng bóng, cao nhất BĂNG lên
      // phía cánh đối diện bóng, ở giữa dạt CÙNG cánh làm phương án gần (không ai đứng chồng lên nhau)
      // thủ môn ở nhà (keeperHome) không nhận vai: nó đã là chốt chặn sau cùng -> chỉ chia vai cho những người còn lại
      const mates = g.teams[p.team].players.filter((o) => o !== c && o !== gk).sort((a, b) => a.idx - b.idx);
      // người cầm bóng quay về phía mình: chạy vào khoảng trống mở đường chuyền (ai.runs.lane) — trừ người CHỐT khi đội có từ 2 người hỗ trợ
      if ((mates.length < 2 || mates.indexOf(p) > 0) && this.laneRun(g, p, c)) return;
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
          ({ x: tx, y: ty } = this.wideSpot(g, c, wob));
          if (this.tryRun(g, p, c, 'overlap', ty)) return;
        }
        tx = U.clamp(tx, f.x + 40, f.x + f.w - 40);
        ty = U.clamp(ty, f.y + 24, f.y + f.h - 24);
        const sp = this.openSpot(g, p, c, tx, ty);
        moveTo(p, sp.x, sp.y, U.dist(p, sp) > 90, 6);
        return;
      }
      // 3v3 có thủ môn ở nhà: còn đúng 1 người hỗ trợ -> tự chọn DẠT / BĂNG theo tình huống (không lùi chốt, thủ môn đã lo)
      if (gk) return this.flexSupport(g, p, c, wob);
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

    // VAI LINH HOẠT (ai.support3.flex, user 2026-11-07): người hỗ trợ duy nhất (thủ môn đứng nhà) chọn giữa 2 vai, chấm điểm chỗ đứng của mỗi vai
    // (đường chuyền từ bóng thoáng + xa đối thủ, như openSpot): DẠT = cùng cánh với bóng, sát biên, hơi trước bóng (phương án gần, chạy chồng biên) ·
    // BĂNG = cánh đối diện, trước bóng xa (phương án sâu, chạy sau lưng hậu vệ). Chọn lại mỗi every s / khi đổi người cầm bóng; vai cũ giữ nếu
    // vai mới hơn chưa tới keep điểm. Đồng đội cầm bóng ở cánh 1/3 cuối: vào vòng cấm chờ tạt như người BĂNG 3 người
    flexSupport(g, p, c, wob) {
      const f = g.field, dir = g.teams[p.team].dir, S = A().support3 || {}, F = S.flex || {};
      const clampPt = (x, y) => ({ x: U.clamp(x, f.x + 40, f.x + f.w - 40), y: U.clamp(y, f.y + 24, f.y + f.h - 24) });
      if (this.crossSpot(g, c, 0.08)) {
        const X = SFC_CONFIG.game.firstTime.cross, goal = g.attackGoal(p.team);
        const pt = clampPt(goal.x - dir * X.runDepth, f.cy + (c.y < f.cy ? 1 : -1) * X.runSide + wob * 0.3);
        p.ai.flex = null;
        return moveTo(p, pt.x, pt.y, U.dist(p, pt) > 90, 6);
      }
      const runner = clampPt(c.x + dir * A().supportAhead * (S.runnerAhead || 1.4), (c.y < f.cy ? f.cy + f.h * 0.28 : f.cy - f.h * 0.28) + wob);
      const ws = this.wideSpot(g, c, wob), wide = clampPt(ws.x, ws.y);
      let R = p.ai.flex;
      if (!R || R.c !== c.id || g.time >= R.next) {
        const sr = this.laneScore(g, p, c, runner.x, runner.y) + (F.runnerBias || 0), sw = this.laneScore(g, p, c, wide.x, wide.y);
        let k = sr >= sw ? 'runner' : 'wide';
        if (R && R.c === c.id && R.k !== k && Math.abs(sr - sw) < (F.keep || 0)) k = R.k;
        if (!R || R.k !== k) p.ai.spot = null;   // đổi vai: bỏ độ lệch chỗ đứng cũ của openSpot
        R = p.ai.flex = { k, c: c.id, next: g.time + (F.every || 1.5) };
      }
      const pt = R.k === 'runner' ? runner : wide;
      if (this.tryRun(g, p, c, R.k === 'runner' ? 'behind' : 'overlap', pt.y)) return;
      const sp = this.openSpot(g, p, c, pt.x, pt.y);
      moveTo(p, sp.x, sp.y, U.dist(p, sp) > 90, 6);
    },
    // người cầm bóng c đang ở cánh (cách trục giữa sân > ai.runs.overlap.wing x chiều ngang sân)
    onWing(g, c) {
      const R = A().runs && A().runs.overlap;
      return !!(R && R.wing) && Math.abs(c.y - g.field.cy) > g.field.h * R.wing;
    },
    // chỗ đứng người DẠT khi c cầm bóng. c còn ở giữa: cùng cánh với bóng, sát biên, hơi trước bóng (phương án gần) ·
    // c đã ra cánh (user 2026-11-07): không đứng chồng lên c ở đường biên mà lùi sau lưng + vào trong (ai.runs.overlap.hold) — góc chuyền về,
    // và là chỗ xuất phát để vòng ra ngoài chạy chồng biên (tryRun 'overlap')
    wideSpot(g, c, wob) {
      const f = g.field, dir = g.teams[c.team].dir, S = A().support3 || {}, H = A().runs && A().runs.overlap && A().runs.overlap.hold;
      if (H && this.onWing(g, c)) {
        const side = c.y < f.cy ? -1 : 1;
        return { x: c.x - dir * H.back, y: c.y - side * H.inside + wob * 0.3 };
      }
      return { x: c.x + dir * A().supportAhead * (S.wideAhead || 0.4), y: (c.y < f.cy ? f.y + f.h * 0.16 : f.y + f.h * 0.84) + wob };
    },
    // điểm chỗ đứng (x, y) khi c cầm bóng: đường chuyền thoáng (kẹp laneCap) x lane + khoảng cách tới đối thủ gần nhất (kẹp spaceCap) x space (ai.openSpot)
    laneScore(g, p, c, x, y) {
      const O = A().openSpot || { laneCap: 30, spaceCap: 60, lane: 1, space: 0.4 };
      let lane = O.laneCap, space = O.spaceCap;
      for (const o of g.teams[1 - p.team].players) {
        if (o.state === 'stun') continue;
        lane = Math.min(lane, U.segDist(o.x, o.y, c.x, c.y, x, y));
        space = Math.min(space, Math.hypot(o.x - x, o.y - y));
      }
      return lane * O.lane + space * O.space;
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
      p.ai.runVia = null;
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

    // MỞ ĐƯỜNG CHUYỀN (ai.runs.lane): người cầm bóng c quay mặt về phía p -> p chạy nước rút tới khoảng trống có đường chuyền thoáng nhất
    laneRun(g, p, c) {
      const RS = A().runs, R = RS && RS.lane;
      if (!R || g.ball.owner !== c || g.time < (p.ai.laneNext || 0)) return false;
      p.ai.laneNext = g.time + RS.every;
      if (g.time < (p.ai.runCd || 0)) return false;
      const tx = p.x - c.x, ty = p.y - c.y, d = Math.hypot(tx, ty) || 1;
      if ((tx * Math.cos(c.facing) + ty * Math.sin(c.facing)) / d < R.faceCos || d > R.maxDist || Math.random() >= R.chance) return false;
      const f = g.field, dir = g.teams[p.team].dir, goal = g.attackGoal(p.team);
      const opps = g.teams[1 - p.team].players.filter((o) => o.state !== 'stun');
      let best = null, bs = -Infinity;
      for (const r of R.dist) for (const deg of R.angles) {
        const a = (deg * Math.PI) / 180;
        let x = p.x + Math.cos(a) * dir * r, y = p.y + Math.sin(a) * r;
        if ((x - (goal.x - dir * R.goalGap)) * dir > 0) x = goal.x - dir * R.goalGap;
        if (x < f.x + 24 || x > f.x + f.w - 24 || y < f.y + 18 || y > f.y + f.h - 18) continue;
        let lane = R.laneCap, space = R.spaceCap;
        for (const o of opps) {
          lane = Math.min(lane, U.segDist(o.x, o.y, c.x, c.y, x, y));
          space = Math.min(space, Math.hypot(o.x - x, o.y - y));
        }
        const s = lane * R.lane + space * R.space + (x - p.x) * dir * R.fwd;
        if (s > bs) { bs = s; best = { x, y }; }
      }
      if (!best) return false;
      this.startRun(g, p, best.x, best.y, R.time);
      p.ai.runCd = g.time + R.cooldown;
      return true;
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
        // CHẠY CHỒNG BIÊN (user 2026-11-07): đồng đội đã ra cánh -> từ sau lưng / ngang hàng (cách <= maxDist) vòng ra phía biên mở góc
        // (chặng 1: sau lưng c back px, làn ngoài cách c out px; biên không đủ minRoom px thì vòng vào trong) rồi băng vượt lên trước c ahead px
        const progress = ((c.x - f.x) / f.w - 0.5) * dir + 0.5;
        if (!this.onWing(g, c) || progress < R.progress[0] || progress > R.progress[1]) return false;
        if ((p.x - c.x) * dir > R.level || U.dist(p, c) > R.maxDist || Math.random() >= R.chance) return false;
        const side = c.y < f.cy ? -1 : 1, room = side < 0 ? c.y - (f.y + 18) : f.y + f.h - 18 - c.y;
        const lane = room >= R.minRoom ? c.y + side * Math.min(R.out, room) : c.y - side * R.out;
        this.startRun(g, p, c.x + dir * R.ahead, lane, R.time);
        const via = { x: c.x - dir * R.back, y: lane };
        if ((via.x - p.x) * dir > 0) p.ai.runVia = via;
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
      // đội máy (ai.keeperStay) / đồng đội AI của người chơi (ai.keeperRecover): người giữ khung trông khung ở mọi khoảng cách khi đối phương cầm bóng
      const rec = keeperRecovers(g, p.team), stay = keeperStays(g, p.team) || rec, KR = A().keeperRecover;
      const keeper = (danger || stay) && !M ? keeperOf(g, p.team) : null;
      // người cầm bóng đứng yên (ai.stillCarrier): đội máy thêm 1 người áp sát (người gần thứ 2, trừ người giữ khung)
      const still = !humanTeam && this.carrierStill(g, c), SC = cfg.stillCarrier;

      let presser = null;
      if (!humanTeam) {
        const order = tm.players.filter((o) => o !== keeper && o.state !== 'stun').sort((a, b) => U.dist(a, c) - U.dist(b, c));
        presser = order[0] || nearest(tm.players, c, (o) => o !== keeper).p;
        if (still && order[1] === p) presser = p;
      }
      else if (M) { if (!danger) presser = p; }
      // người giữ khung về khung khi mất bóng (keeperRecover): chỉ lao ra tắc khi người cầm bóng đã tới gần (engage px) mà chưa ai kèm
      else if (rec && p === keeper) { if (U.dist(c, ownGoal) < KR.zone && U.dist(p, c) < KR.engage && !carrierMarked(g, p, c)) presser = p; }
      // đồng đội AI ĐÁ LÙI: lên áp sát khi bóng chưa tới gần khung nhà và người chơi ở xa người cầm bóng,
      // hoặc cùng người chơi kẹp người cầm bóng (helpPress)
      else if (ctl && this.helpPress(g, p, c, ctl, danger)) presser = p;
      else if (!ctl || (!danger && U.dist(ctl, c) > cfg.keeperPressDist)) presser = nearest(tm.players, c, (o) => o.state !== 'stun' && o !== ctl && !(rec && o === keeper)).p;

      // ÁP SÁT (ai.press): vừa mất bóng (phản pressing) hoặc người cầm bóng đi sát mình -> lao vào đánh, trừ người trông khung
      // đang trong vòng nguy hiểm. Không cả đội bu vào: chỉ khi ít hơn maxPressers đồng đội đang gần người cầm bóng hơn mình
      const PR = cfg.press, protectedGK = g.isProtected(c), pk = PR ? pressK(D, PR) : 0;
      const counter = !!PR && p.ai.cpUntil > g.time && p !== ctl;
      if (PR && p !== presser && p !== ctl && !protectedGK && p !== keeper) {
        const dc = U.dist(p, c);
        const closer = tm.players.filter((o) => o !== p && o.state !== 'stun' && U.dist(o, c) < dc).length;
        if ((counter || dc < PR.engage * pk) && closer < PR.maxPressers) presser = p;
      }

      // HẬU VỆ CUỐI (ai.lastMan): đồng đội AI phải 1 chọi 1 khi người chơi đã bị vượt qua -> tắc luôn thay vì chạy về khung
      // người giữ khung (keeperRecover): người cầm bóng đã có đồng đội kèm thì không lao vào, cứ trông khung
      if (humanTeam && p !== ctl && p !== presser && (p === keeper || (M && danger)) && !(rec && p === keeper && (carrierMarked(g, p, c) || U.dist(c, ownGoal) >= KR.zone)) && this.lastMan(g, p, c)) presser = p;
      // THỦ MÔN LAO LÊN (ai.keeperHome.rush): sân nhà không còn ai -> người giữ khung lao lên kickdown người cầm bóng
      const rush = p === keeper && p !== ctl && keeperRush(g, p, c);
      if (rush) presser = p;

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
        // AI non tay (pk thấp): chỉ chạy nước rút khi còn xa / người cầm bóng chạy rất nhanh, như trước khi có ai.press
        const sprint = PR ? d > U.lerp(36, PR.sprintDist, pk) || tv > PR.walkSpeed / Math.max(0.05, pk) : d > 36;
        if (beaten) moveTo(p, target.x + (target.vx || 0) * PR.chaseLead, target.y + (target.vy || 0) * PR.chaseLead, sprint, 1);
        else moveTo(p, target.x + gd.x * gap, target.y + gd.y * gap, sprint, 2);
        if (target !== c || p.ai.t > 0 || protectedGK) return;
        p.ai.t = D.reaction * U.rand(0.8, 1.4) * (counter ? U.lerp(1, PR.counterReact, pk) : 1) * (p.ai.lastManAt === g.time ? 0.5 : 1) * (still ? SC.react : 1);
        const dc = U.dist(p, c);
        p.facing = Math.atan2(c.y - p.y, c.x - p.x);
        const style = tm.cfg.aiStyle || { light: 1, hard: 1 };
        // đồng đội AI của người chơi: tỉ lệ đấm riêng (ai.mate.lightChance), không theo aiStyle của đội
        // hậu vệ cuối (ai.lastMan): không còn ai chắn sau lưng -> tới tầm là ra đòn luôn
        const last = p.ai.lastManAt === g.time;
        // thủ môn lao lên: tới tầm là KICKDOWN (Hard attack), sát người mà chưa kick được thì đấm
        if (rush) {
          const KR2 = A().keeperHome.rush;
          if (dc >= KR2.kick[0] && dc <= KR2.kick[1] && Math.random() < KR2.kickChance && Act().hardAttack(g, p)) return;
          if (dc < C.light.range + p.radius * 2) Act().lightAttack(g, p);
          return;
        }
        let lightP = last ? 1 : (humanTeam ? cfg.mate.lightChance * D.aggression : Math.min(0.9, 0.6 * D.aggression * style.light)) * (counter ? U.lerp(1, PR.counterPunch, pk) : 1);
        // người cầm bóng đứng yên: đấm ít nhất stillCarrier.lightChance (AI non tay cũng không đứng nhìn)
        if (still) lightP = Math.max(lightP, SC.lightChance);
        // Tay Cao Su: đấm được từ xa
        const reach = Math.max(C.light.range, g.cores.lightReach(p) * 0.8);
        if (dc < reach + p.radius * 2 && Math.random() < lightP) Act().lightAttack(g, p);
        else if (dc > cfg.hardDistMin && dc < cfg.hardDistMax && Math.random() < 0.1 * D.aggression * style.hard * g.cores.aiHardMult(p) * (still ? SC.hardMult : 1)) Act().hardAttack(g, p);
        return;
      }

      // chỉ 1 người trông khung: người được chọn (keeperOf) — đồng đội AI lối chơi ai.mate tự xét (mateDanger: chưa ai đứng trong vòng cấm).
      // Người còn lại (3v3) đi kèm người bên dưới, không chạy về đứng chung khung thành
      if ((danger || stay) && (M ? g.canKeep(p) : p === keeper)) return this.goalkeeper(dt, g, p);

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
    // cú sút sắp ra: POWER SHOT / FINESSE SHOT / KNUCKLEBALL (Actions.shoot đọc p.shotStyle). KNUCKLEBALL chỉ khi đủ xa khung
    // (knuckle.min px: bóng cần đường để vọt lên rồi cắm xuống); cú dội từ xa đã định (longKnuckle) thì luôn ra knuckle
    legendShot(g, p) {
      const LA = LAI(), long = p.ai.knuckle;
      p.ai.knuckle = false;
      if (!LA) return;
      for (const id of ['power', 'finesse']) if (legTech(g, p, id) && Math.random() < LA.shot) { p.shotStyle = id; return; }
      if (legTech(g, p, 'knuckle') && (long || (this.goalDist(g, p) >= LA.knuckle.min && Math.random() < LA.shot))) p.shotStyle = 'knuckle';
    },
    goalDist(g, p) { const gl = g.attackGoal(p.team); return Math.hypot(gl.x - p.x, gl.y - p.y); },
    // lượt quyết định khi chưa định sút: cầu thủ AI có KNUCKLEBALL đứng ở phần sân đối thủ, cách khung knuckle.min..max px -> knuckle.chance dội từ xa
    longKnuckle(g, p, dG) {
      const K = LAI() && LAI().knuckle;
      return !!K && legTech(g, p, 'knuckle') && !g.inOwnHalf(p) && dG >= K.min && dG <= K.max && Math.random() < K.chance;
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
      let chance = 0, pass = null, block = false;
      if (opp) {
        if (b.cross && !g.inKeeperZone(p)) chance = FA.clearChance;
        // ĐÁNH ĐẦU CẢN CÚ SÚT (firstTime.ai.block, user 2026-11-07): cú sút của đối phương bay về khung nhà, tới chỗ mình ở trên tầm khống chế
        // (cao quá đầu) -> chạy vào đường bóng, bật nhảy đánh đầu phá ra. Người giữ khung trong vòng cấm thì bắt như thường
        else if (FA.block && b.kind === 'shot' && b.vx * g.teams[p.team].dir < 0 && !g.inKeeperZone(p) && Act().highBall(g, p)) { chance = FA.block.chance; block = true; }
      }
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
      if (block) { p.ot.block = true; p.ot.target = U.rand(FA.block.charge[0], FA.block.charge[1]); return; }   // phá về phía trước, không nhắm góc
      p.ot.target = U.rand(FA.charge[0], FA.charge[1]);
      const f = g.field, gk = nearest(g.teams[1 - p.team].players, goal, (o) => g.inKeeperZone(o)).p;
      p.ot.aimY = (gk && gk.y > f.cy ? -1 : 1) * U.rand(0.3, 0.9);
    },

    // đội của p vừa giành được bóng: cầu thủ AI đội kia ở gần người cầm bóng mới -> phản pressing (ai.press.counterTime)
    lostBall(g, p) {
      const PR = A().press;
      if (!PR) return;
      const k = pressK(g.aiProfile(1 - p.team), PR);
      for (const o of g.teams[1 - p.team].players) {
        if (o.state !== 'stun' && U.dist(o, p) < PR.counterDist) o.ai.cpUntil = g.time + PR.counterTime * k;
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

    // hậu vệ cuối: p ở gần người cầm bóng (lastMan.engage), đứng giữa bóng và khung nhà, và không đồng đội nào khác chắn gần khung hơn
    lastMan(g, p, c) {
      const L = A().lastMan, own = g.ownGoal(p.team);
      const held = p.ai.lastManAt != null && g.time - p.ai.lastManAt < 0.3;   // vừa lao vào ở bước trước: giữ quyết định
      if (!L || p.state !== 'normal' || g.isProtected(c) || U.dist(p, c) > L.engage * (held ? L.keep : 1)) return false;
      const dc = U.dist(c, own);
      if (U.dist(p, own) > dc + L.engage * 0.25) return false;   // bị bỏ lại phía sau: không đuổi từ sau lưng
      if (g.teams[p.team].players.some((o) => o !== p && o.state !== 'stun' && U.dist(o, own) < dc - L.slack)) return false;
      p.ai.lastManAt = g.time;
      return true;
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
      // đang chờ đánh đầu cản cú sút (firstTime.ai.block): chạy tới chỗ đón bóng ngang đầu trên đường bay (Actions.receiveMove)
      if (p.ot && p.ot.block) { Act().receiveMove(g, p); return; }
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
      // đội máy (ai.keeperStay): người giữ khung không đuổi bóng lỏng ngoài vòng cấm (trong vòng cấm: goalkeeper tự lao ra nếu tới trước)
      // đồng đội AI của người chơi (ai.keeperRecover): như trên, vừa mất bóng thì người giữ khung về khung luôn, không đuổi bóng lỏng
      const stay = keeperStays(g, p.team) || (!M && keeperRecovers(g, p.team)), gk = stay ? keeperOf(g, p.team) : null;
      let chaser = nearest(tm.players, pred, (o) => o.state === 'normal' && o !== ctl && o !== gk);
      if (!chaser.p) chaser = nearest(tm.players, pred, (o) => o.state === 'normal' && o !== ctl);
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
      const keeper = nearest(tm.players, g.ownGoal(p.team), (o) => o !== ctl && o !== chaser.p && o.state !== 'stun' && g.canKeep(o)).p;
      const cover = M
        ? U.dist(b, g.ownGoal(p.team)) < A().mate.dangerDist && !(ctl && g.inKeeperZone(ctl))
        : stay || (b.x - f.cx) * dir < 0 || b.vx * dir < -120;
      if (!passToMate && cover && (M ? g.canKeep(p) : p === keeper)) return this.goalkeeper(dt, g, p);

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
          // đường bóng đi thẳng vào người (lệch không quá gkStraight, cùng thước đo với Game.keeperBrace): đứng yên đỡ tại chỗ,
          // không chạy theo điểm bóng qua vạch (thủ môn đứng trước vạch thì sút chéo góc vào người qua vạch lệch sang bên) và không đổ người
          const hold = !cc && g.shotOffset(p).d <= SFC_CONFIG.game.player.gkStraight;
          if (hold) { tx = p.x; ty = p.y; } else { ty = iy; sprint = true; }
          if (!hold && t < 0.35 && Math.abs(iy - p.y) > 8 && p.ai.t <= 0) {
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
        // người cầm bóng đã có đồng đội kèm (ai.keeperRecover.marked, user 2026-11-07): đứng trên vạch che góc, không bước ra
        // (bước ra = bỏ trống khung, người kèm đã lo tranh bóng). Người cầm bóng áp sát tận nơi thì vẫn đấm
        if (!(A().keeperRecover && carrierMarked(g, p, b.owner))) {
          tx = own.x + dir * 22;
          ty = U.clamp(b.owner.y, f.gTop - 4, f.gBot + 4);
        }
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
