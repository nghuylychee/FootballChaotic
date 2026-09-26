/* Actions — mọi hành động bóng đá/combat, dùng chung cho người chơi & AI */
window.SFC = window.SFC || {};

(function () {
  const U = SFC.U;
  const G = () => SFC_CONFIG.game;

  function facingVec(p) { return { x: Math.cos(p.facing), y: Math.sin(p.facing) }; }

  const Actions = {
    /**
     * Chọn người nhận: ưu tiên hướng phím, khoảng cách khớp với lực (nếu có), độ trống.
     * power = null -> không xét lực (AI). prev = mục tiêu đang khóa (chống nhảy mục tiêu).
     * cone (độ) -> chỉ xét đồng đội nằm trong vùng quanh hướng; không có ai -> null.
     */
    findPassTarget(g, p, dx, dy, power = null, mode = 'ground', prev = null, cone = null) {
      const P = G().pass;
      const dir = Math.hypot(dx, dy) > 0.2 ? U.norm(dx, dy) : facingVec(p);
      const maxAng = cone == null ? Infinity : (cone * Math.PI) / 180;
      const pref = power == null ? null : U.lerp(P.minDist, P.maxDist, power);
      const opps = g.teams[1 - p.team].players;
      let best = null, bestS = -Infinity;
      for (const m of g.teams[p.team].players) {
        if (m === p || m.state === 'stun') continue;
        const tx = m.x - p.x, ty = m.y - p.y;
        const d = Math.hypot(tx, ty) || 1;
        const ang = Math.acos(U.clamp((tx * dir.x + ty * dir.y) / d, -1, 1));
        if (ang > maxAng) continue;
        let s = -ang * P.angleWeight;
        s -= pref == null ? d / 300 : (Math.abs(d - pref) / 200) * P.distWeight;
        let oppD = Infinity;
        for (const o of opps) {
          oppD = Math.min(oppD, U.dist(o, m));
          if (mode !== 'lob' && o.role !== 'GK' && U.segDist(o.x, o.y, p.x, p.y, m.x, m.y) < 10) s -= 0.5;
        }
        s += (Math.min(oppD, 60) / 60) * 0.4;
        if (m.role === 'GK') s -= 1.6;
        if (m === prev) s += P.switchMargin;
        if (s > bestS) { bestS = s; best = m; }
      }
      return best;
    },

    /**
     * Tính đường chuyền tới người nhận: điểm nhận bóng + vận tốc bóng.
     * power = null -> lực lý tưởng (AI). exact = true -> bỏ sai số (dùng cho preview).
     */
    passPlan(g, p, target, mode, power, dx = 0, dy = 0, exact = false) {
      const P = G().pass, B = G().ball, f = g.field, b = g.ball;
      const mult = p.stats.pass * g.cores.mod(p.team, 'passSpeed');
      const clampPt = (pt) => ({ x: U.clamp(pt.x, f.x + 10, f.x + f.w - 10), y: U.clamp(pt.y, f.y + 10, f.y + f.h - 10) });
      const idealOf = (d) => U.clamp((d - P.minDist) / (P.maxDist - P.minDist), 0, 1);
      // lực mặc định = lực lý tưởng theo khoảng cách; giữ vượt mức đó -> bóng căng hơn
      const powerFactor = (ideal) => {
        if (power == null || power <= ideal) return 1;
        return 1 + (power - ideal) * (1 - P.powerAssist) * P.powerSensitivity;
      };

      // không có người nhận trong vùng hướng -> chuyền thẳng theo hướng mũi tên, lực = quãng đường
      if (!target) {
        const dir = Math.hypot(dx, dy) > 0.2 ? U.norm(dx, dy) : facingVec(p);
        let pw = power == null ? 0.5 : power;
        if (mode === 'through') pw = Math.max(P.throughBase, pw);
        const D = U.lerp(P.freeMinDist, P.freeMaxDist, pw) * mult;
        const point = clampPt({ x: b.x + dir.x * D, y: b.y + dir.y * D });
        if (mode === 'lob') {
          const T = U.lerp(P.lobTimeMin, P.lobTimeMax, pw);
          const vh = (B.airDrag * D) / (1 - Math.exp(-B.airDrag * T));
          return { point, vx: dir.x * vh, vy: dir.y * vh, vz: (B.gravity * T) / 2, T };
        }
        const arrive = mode === 'through' ? P.freeThroughArrive * mult : 30;
        const spd = U.clamp(B.groundFriction * D + arrive, P.minSpeed, P.maxSpeed * mult);
        return { point, vx: dir.x * spd, vy: dir.y * spd, vz: 0, T: 1 };
      }

      let point, spd, vz = 0, T = 0.5;
      const k = B.groundFriction;
      if (mode === 'through') {
        // bóng vào khoảng trống phía trước người nhận; lực quyết định độ sâu
        const goal = g.attackGoal(p.team);
        const run = U.norm(g.teams[p.team].dir, U.clamp((goal.y - target.y) / 250, -0.6, 0.6));
        const depth = U.lerp(P.throughLeadMin, P.throughLeadMax, power == null ? 0.5 : Math.max(P.throughBase, power));
        point = clampPt({ x: target.x + run.x * depth, y: target.y + run.y * depth });
        const d = U.dist(b, point) || 1;
        // lực mặc định cao như chuyền sệt: bóng tới điểm nhận vẫn còn throughArriveSpeed,
        // người nhận chủ động băng lên đón (receiveMove) thay vì bóng lăn chậm chờ người
        spd = U.clamp(P.throughArriveSpeed * mult + k * d, P.minSpeed, P.maxSpeed * mult);
        T = -Math.log(Math.max(0.02, 1 - (k * d) / spd)) / k;
      } else if (mode === 'lob') {
        let d = 1;
        for (let i = 0; i < 4; i++) {
          point = clampPt({ x: target.x + target.vx * P.receiverLead * T, y: target.y + target.vy * P.receiverLead * T });
          d = U.dist(b, point) || 1;
          T = U.lerp(P.lobTimeMin, P.lobTimeMax, idealOf(d));
        }
        const ka = B.airDrag;
        spd = ((ka * d) / (1 - Math.exp(-ka * T))) * powerFactor(idealOf(d));
        vz = (B.gravity * T) / 2;
      } else {
        // chuyền sệt: v(x) = v0 - k*x  ->  v0 = tốc độ tới chân + k*d
        for (let i = 0; i < 4; i++) {
          point = clampPt({ x: target.x + target.vx * P.receiverLead * T, y: target.y + target.vy * P.receiverLead * T });
          const d = U.dist(b, point) || 1;
          spd = (P.arriveSpeed * mult + k * d) * powerFactor(idealOf(d));
          spd = U.clamp(spd, P.minSpeed, P.maxSpeed * mult);
          T = k * d < spd * 0.98 ? -Math.log(1 - (k * d) / spd) / k : 1.5;
        }
      }

      // hỗ trợ hướng: 1 = căn chuẩn vào điểm nhận
      let dir = U.norm(point.x - b.x, point.y - b.y);
      if (P.aimAssist < 1 && Math.hypot(dx, dy) > 0.2) {
        const inp = U.norm(dx, dy);
        dir = U.norm(U.lerp(inp.x, dir.x, P.aimAssist), U.lerp(inp.y, dir.y, P.aimAssist));
      }
      if (!exact) {
        const e = U.rand(-1, 1) * P.spread / p.stats.pass;
        const c = Math.cos(e), s = Math.sin(e);
        dir = { x: dir.x * c - dir.y * s, y: dir.x * s + dir.y * c };
      }
      return { point, vx: dir.x * spd, vy: dir.y * spd, vz, T };
    },

    laneClear(g, p, x, y, width) {
      for (const o of g.teams[1 - p.team].players) {
        if (o.role === 'GK') continue;
        if (U.segDist(o.x, o.y, p.x, p.y, x, y) < width) return false;
      }
      return true;
    },

    // Chỉ khi giữ lực có chủ đích mới ưu tiên người ở xa; chạm nhẹ -> chọn thuần theo hướng
    targetBias(power) {
      return power != null && power > G().pass.farTargetCharge ? power : null;
    },

    // Lực mặc định (0..1) cho người nhận hiện tại — hiển thị làm mốc trên thanh lực
    passBasePower(g, p, target, mode) {
      const P = G().pass;
      if (!target) return 0;
      if (mode === 'through') return P.throughBase;
      return U.clamp((U.dist(g.ball, target) - P.minDist) / (P.maxDist - P.minDist), 0, 1);
    },

    // Người chơi: chỉ khóa người nhận nằm trong vùng hướng mũi tên; không có ai -> chuyền theo hướng
    pass(g, p, mode, dx, dy, power = null) {
      if (g.ball.owner !== p) return;
      const lock = p.passLock && p.passLock.state !== 'stun' ? p.passLock : null;
      const target = lock || this.findPassTarget(g, p, dx, dy, this.targetBias(power), mode, null, G().pass.coneAngle);
      this.passTo(g, p, target, mode, dx, dy, power);
    },

    // Người nhận chủ động đón bóng: chạy tới điểm đón sớm nhất trên quỹ đạo, đứng chờ thì quay mặt về bóng
    receiveMove(g, p) {
      const b = g.ball;
      const ip = this.interceptPoint(g, p);
      const dx = ip.x - p.x, dy = ip.y - p.y, d = Math.hypot(dx, dy);
      if (d > 1.5) {
        const s = Math.min(1, d / 14);
        p.intent.mx = (dx / d) * s;
        p.intent.my = (dy / d) * s;
      } else {
        p.intent.mx = 0;
        p.intent.my = 0;
        const want = Math.atan2(b.y - p.y, b.x - p.x);
        p.facing += U.angleDiff(p.facing, want) * 0.25;
      }
      p.intent.sprint = d > 24;
      return ip;
    },

    /**
     * Mô phỏng trước quỹ đạo bóng, trả về điểm sớm nhất cầu thủ p có thể chạm bóng.
     * { x, y, t } — t = thời điểm (s) bóng tới điểm đó.
     */
    interceptPoint(g, p, maxT = 2) {
      const b = g.ball, B = G().ball, f = g.field, r = b.r;
      let x = b.x, y = b.y, z = b.z, vx = b.vx, vy = b.vy, vz = b.vz;
      const dt = 1 / 30;
      const speed = G().player.speed * p.stats.speed * G().player.sprintMult * 0.9;
      const reach = p.radius + r + B.pickupRange;
      for (let t = dt; t <= maxT; t += dt) {
        x += vx * dt; y += vy * dt;
        vz -= B.gravity * dt; z += vz * dt;
        if (z <= 0) {
          z = 0;
          if (vz < -50) { vz = -vz * B.bounce; vx *= 0.78; vy *= 0.78; } else vz = 0;
        }
        const damp = Math.exp(-(z > 0.5 ? B.airDrag : B.groundFriction) * b.frictionMult * dt);
        vx *= damp; vy *= damp;
        if (y < f.y + r || y > f.y + f.h - r) { vy = -vy * B.wallBounce; y = U.clamp(y, f.y + r, f.y + f.h - r); }
        if (x < f.x + r || x > f.x + f.w - r) { vx = -vx * B.wallBounce; x = U.clamp(x, f.x + r, f.x + f.w - r); }
        if (z > B.pickupHeight) continue;
        const need = Math.max(0, Math.hypot(x - p.x, y - p.y) - reach) / speed + 0.08;
        if (need <= t) return { x, y, t };
        if (z === 0 && Math.hypot(vx, vy) < 5) return { x, y, t: need };
      }
      return { x, y, t: maxT };
    },

    passTo(g, p, target, mode, dx = 0, dy = 0, power = null) {
      const b = g.ball;
      if (b.owner !== p) return;
      const plan = this.passPlan(g, p, target, mode, power, dx, dy);
      b.kick(p, plan.vx, plan.vy, plan.vz);
      // chuyền vào khoảng trống: đồng đội đón được bóng sớm nhất trở thành người nhận
      if (!target) {
        let best = null, bestT = G().pass.freeReceiverMaxTime;
        for (const m of g.teams[p.team].players) {
          if (m === p || m.role === 'GK' || m.state === 'stun') continue;
          const ip = this.interceptPoint(g, m, bestT);
          if (ip.t < bestT) { bestT = ip.t; best = m; }
        }
        target = best;
      }
      b.passTarget = target;
      b.passPoint = plan.point;
      b.kind = 'pass';
      p.charging = false; p.charge = 0;
      p.cancelPass();
      p.facing = Math.atan2(plan.vy, plan.vx);
      g.cores.dispatch(p.team, 'onPass', p, target, mode);
      if (target && g.isHuman(p.team) && p.isControlled) {
        g.setControlled(target);
        // mũi tên người chơi đang giữ là hướng chuyền, không phải lệnh cho người nhận -> khóa tới khi thả phím
        g.receiveLock[p.team] = true;
      }
      g.sfx('pass');
    },

    // Lực sút mặc định (0..1) theo khoảng cách tới khung thành — mốc trên thanh lực sút
    shotBasePower(g, p) {
      const K = G().kick, goal = g.attackGoal(p.team);
      const k = U.clamp((U.dist(p, goal) - K.shotBaseNearDist) / (K.shotBaseFarDist - K.shotBaseNearDist), 0, 1);
      return U.lerp(K.shotBaseNear, K.shotBaseFar, k);
    },

    // Lực sút thực tế: lực mặc định + phần giữ thêm lấp đầy phần còn lại của thanh
    shotPower(g, p, charge) {
      const base = this.shotBasePower(g, p);
      return base + (1 - base) * Math.min(charge, 1);
    },

    /**
     * Hướng sút theo hướng phím (dx, dy) người chơi giữ lúc thả:
     * tia từ bóng theo hướng phím, giới hạn trong "cửa sổ góc" giữa hai cột dọc.
     * Trả về { angle: góc sút (thế giới), off: góc (rad) hướng phím lệch ra ngoài khung thành }
     */
    shotAim(g, p, dx, dy) {
      const b = g.ball, f = g.field, dir = g.teams[p.team].dir;
      const m = f.goalWidth / 2 - 6;
      // quy về khung "tấn công sang phải": lật trục x theo dir
      const depth = Math.max(1, ((dir > 0 ? f.x + f.w : f.x) - b.x) * dir);
      const top = Math.atan2(f.cy - m - b.y, depth), bot = Math.atan2(f.cy + m - b.y, depth);
      const want = Math.atan2(dy, dx * dir);
      const a = U.clamp(want, top, bot);
      return { angle: dir > 0 ? a : Math.PI - a, off: Math.abs(want - a) };
    },

    // aim = hướng phím người chơi giữ lúc thả ({x, y}) hoặc null -> nhắm theo aimY (-1..1, 0 = giữa khung; AI dùng)
    shoot(g, p, charge, aimY, aim = null) {
      const b = g.ball, K = G().kick, f = g.field;
      if (b.owner !== p) return;
      const tm = g.teams[p.team];
      const held = Math.min(charge, 1);   // phần người chơi thực sự giữ (Core Fire/Thunder dựa vào mức này)
      const c = this.shotPower(g, p, charge);
      const over = Math.max(0, charge - 1);

      let base, awk = 0;
      if (aim) {
        // hướng phím chỉ ra ngoài khung thành -> tư thế gượng, lệch càng nhiều sai số càng lớn
        const s = this.shotAim(g, p, aim.x, aim.y);
        base = s.angle;
        const a0 = (K.awkwardMinAngle * Math.PI) / 180, a1 = (K.awkwardMaxAngle * Math.PI) / 180;
        awk = K.awkwardSpread * U.clamp((s.off - a0) / (a1 - a0), 0, 1);
      } else {
        const gx = tm.dir > 0 ? f.x + f.w + 6 : f.x - 6;
        const gy = f.cy + U.clamp(aimY || 0, -1, 1) * (f.goalWidth / 2 - 6);
        base = Math.atan2(gy - b.y, gx - b.x);
      }

      const acc = p.stats.accuracy * g.cores.mod(p.team, 'accuracy');
      let spread = (K.shotSpread + awk) / acc + over * K.overchargeSpread;
      if (!p.isControlled) spread *= 2 - g.aiProfile(p.team).shotAccuracy;
      const ang = base + U.rand(-spread, spread);

      const spd = U.lerp(K.shotMinSpeed, K.shotMaxSpeed, c) * p.stats.power * g.cores.mod(p.team, 'shotPower');
      const vz = U.lerp(K.shotLiftMin, K.shotLiftMax, c * c) + over * K.overchargeLift;
      b.kick(p, Math.cos(ang) * spd, Math.sin(ang) * spd, vz);
      b.kind = 'shot';
      p.facing = ang;
      p.charging = false; p.charge = 0;
      g.cores.dispatch(p.team, 'onShoot', p, b, held);
      g.effects.burst(b.x, b.y, 2, '#ffffff', 5 + Math.round(c * 6), 80);
      g.effects.shake(G().fx.shakeShot * c);
      g.sfx('kick', c);
    },

    // Phá bóng: bóng bổng, mạnh, luôn về phía trước — ↑/↓ chỉ chỉnh góc (không phá ngược về khung thành nhà)
    clearance(g, p, dy) {
      const b = g.ball, K = G().kick;
      if (b.owner !== p) return;
      const ang = Math.atan2(U.clamp(dy || 0, -1, 1) * K.clearAngle, g.teams[p.team].dir) + U.rand(-K.clearSpread, K.clearSpread);
      const spd = K.clearSpeed * p.stats.power;
      b.kick(p, Math.cos(ang) * spd, Math.sin(ang) * spd, K.clearLift);
      b.kind = 'clear';
      p.facing = ang;
      p.charging = false; p.charge = 0;
      p.cancelPass();
      g.effects.burst(b.x, b.y, 2, '#ffffff', 8, 80);
      g.effects.shake(G().fx.shakeShot);
      g.sfx('kick', 0.8);
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
