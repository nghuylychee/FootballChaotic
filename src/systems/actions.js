/* Actions — mọi hành động bóng đá/combat, dùng chung cho người chơi & AI */
window.SFC = window.SFC || {};

(function () {
  const U = SFC.U;
  const G = () => SFC_CONFIG.game;

  function facingVec(p) { return { x: Math.cos(p.facing), y: Math.sin(p.facing) }; }

  // mô phỏng trước quỹ đạo bóng (trọng lực, nảy, ma sát, dội tường) — dùng cho điểm đón bóng + điểm rơi
  function flightState(b) { return { x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, vz: b.vz, fm: b.frictionMult }; }
  // 1 bước; trả về true nếu bước này bóng rơi chạm sân
  function flightStep(g, s, dt) {
    const B = G().ball, f = g.field, r = g.ball.r;
    const wasAir = s.z > 0;
    s.x += s.vx * dt; s.y += s.vy * dt;
    s.vz -= B.gravity * dt; s.z += s.vz * dt;
    const landed = wasAir && s.z <= 0;
    if (s.z <= 0) {
      s.z = 0;
      if (s.vz < -50) { s.vz = -s.vz * B.bounce; s.vx *= 0.78; s.vy *= 0.78; } else s.vz = 0;
    }
    const damp = Math.exp(-(s.z > B.airDragMinZ ? B.airDrag : B.groundFriction) * s.fm * dt);
    s.vx *= damp; s.vy *= damp;
    if (s.y < f.y + r || s.y > f.y + f.h - r) { s.vy = -s.vy * B.wallBounce; s.y = U.clamp(s.y, f.y + r, f.y + f.h - r); }
    if (s.x < f.x + r || s.x > f.x + f.w - r) { s.vx = -s.vx * B.wallBounce; s.x = U.clamp(s.x, f.x + r, f.x + f.w - r); }
    return landed;
  }

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
          if (mode !== 'lob' && U.segDist(o.x, o.y, p.x, p.y, m.x, m.y) < 10) s -= 0.5;
        }
        s += (Math.min(oppD, 60) / 60) * 0.4;
        if (m === prev) s += P.switchMargin;
        if (s > bestS) { bestS = s; best = m; }
      }
      return best;
    },

    /**
     * Tính đường chuyền tới người nhận: điểm nhận bóng + vận tốc bóng.
     * power = null -> lực lý tưởng (AI). exact = true -> bỏ sai số (dùng cho preview).
     * err = { miss: [min, max], pace: [min, max] } -> thay sai số mặc định bằng sai số luôn có
     *       (chuyền tự động không nhắm, pass.quick.sloppy): lệch ngang = miss x quãng chuyền, lực sai ±pace
     */
    passPlan(g, p, target, mode, power, dx = 0, dy = 0, exact = false, err = null) {
      const P = G().pass, B = G().ball, f = g.field, b = g.ball;
      const mult = p.stats.pass * g.cores.pmod(p, 'passSpeed');   // gồm Nhịp
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
        const acc = p.stats.pass * g.cores.mod(p.team, 'passAccuracy', p);   // Mắt Đại Bàng
        const e = err
          ? U.randSign() * Math.atan(U.rand(err.miss[0], err.miss[1]) / acc)
          : U.rand(-1, 1) * P.spread / acc;
        const c = Math.cos(e), s = Math.sin(e);
        dir = { x: dir.x * c - dir.y * s, y: dir.x * s + dir.y * c };
        if (err) spd *= 1 + U.randSign() * U.rand(err.pace[0], err.pace[1]) / acc;
      }
      return { point, vx: dir.x * spd, vy: dir.y * spd, vz, T };
    },

    laneClear(g, p, x, y, width) {
      for (const o of g.teams[1 - p.team].players) {
        if (g.inKeeperZone(o)) continue;
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

    // S (pass.quick): chuyền sệt tự động, lực lý tưởng. Mũi tên chỉ vào đồng đội -> chuyền chuẩn cho người đó;
    // không bấm hướng / chỉ lệch khỏi đồng đội -> chuyền cho người gần nhất, cộng sai số hướng + lực
    quickPass(g, p, dx, dy) {
      if (g.ball.owner !== p) return;
      const Q = G().pass.quick;
      let target = Math.hypot(dx, dy) > 0.2 ? this.findPassTarget(g, p, dx, dy, null, 'ground', null, Q.aimCone) : null;
      const aimed = !!target;
      if (!target) {
        let bd = Infinity;
        for (const m of g.teams[p.team].players) {
          if (m === p || m.state === 'stun') continue;
          const d = U.dist(p, m);
          if (d < bd) { bd = d; target = m; }
        }
      }
      // không còn đồng đội nào nhận được (đều bị choáng) -> chuyền theo hướng như cũ
      this.passTo(g, p, target, 'ground', dx, dy, null, aimed ? null : Q.sloppy);
      // chuyền lỗi: người nhận không tự chạy đón bóng -> sai số giữ nguyên kể cả khi không có ai áp sát
      if (!aimed && target) g.ball.sloppy = true;
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
      const B = G().ball, s = flightState(g.ball);
      const dt = 1 / 30;
      const speed = G().player.speed * p.stats.speed * G().player.sprintMult * 0.9;
      const reach = p.radius + g.ball.r + B.pickupRange;
      for (let t = dt; t <= maxT; t += dt) {
        flightStep(g, s, dt);
        if (s.z > B.pickupHeight) continue;
        const need = Math.max(0, Math.hypot(s.x - p.x, s.y - p.y) - reach) / speed + 0.08;
        if (need <= t) return { x: s.x, y: s.y, t };
        if (s.z === 0 && Math.hypot(s.vx, s.vy) < 5) return { x: s.x, y: s.y, t: need };
      }
      return { x: s.x, y: s.y, t: maxT };
    },

    /** Điểm bóng bổng chạm sân lần đầu (vòng điểm rơi) — { x, y, t } hoặc null nếu không chạm trong maxT */
    landingPoint(g, maxT = 3) {
      const s = flightState(g.ball), dt = 1 / 60;
      for (let t = dt; t <= maxT; t += dt) if (flightStep(g, s, dt)) return { x: s.x, y: s.y, t };
      return null;
    },

    passTo(g, p, target, mode, dx = 0, dy = 0, power = null, err = null) {
      const b = g.ball;
      if (b.owner !== p) return;
      const plan = this.passPlan(g, p, target, mode, power, dx, dy, false, err);
      b.kick(p, plan.vx, plan.vy, plan.vz);
      // chuyền vào khoảng trống: đồng đội đón được bóng sớm nhất trở thành người nhận
      if (!target) {
        let best = null, bestT = G().pass.freeReceiverMaxTime;
        for (const m of g.teams[p.team].players) {
          if (m === p || m.state === 'stun') continue;
          const ip = this.interceptPoint(g, m, bestT);
          if (ip.t < bestT) { bestT = ip.t; best = m; }
        }
        target = best;
      }
      b.passTarget = target;
      b.passPoint = plan.point;
      b.kind = 'pass';
      b.lob = mode === 'lob';
      // đồng đội AI của người chơi đón đường chuyền chuẩn: thỉnh thoảng đi bộ thay vì chạy nước rút (ai.mate)
      if (target) target.ai.recvWalk = Math.random() < G().ai.mate.receiveWalkChance;
      p.charging = false; p.charge = 0;
      p.cancelPass();
      p.facing = Math.atan2(plan.vy, plan.vx);
      g.cores.dispatch(p.team, 'onPass', p, target, mode);
      if (target && g.isHuman(p.team) && p.isControlled) {
        const prev = g.ctrl[p.team];
        g.setControlled(target);
        // mũi tên người chơi đang giữ là hướng chuyền, không phải lệnh cho người nhận -> khóa tới khi thả phím
        // (chế độ 1 cầu thủ / co-op: quyền điều khiển không chuyển sang người nhận -> không khóa)
        if (prev !== target && g.ctrl[p.team] === target) g.receiveLock[p.team] = true;
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
      // Một-Hai: sút ngay sau khi nhận đường chuyền = sút tụ lực tối đa (vô-lê)
      const volley = g.cores.volleyCharge(p) > 0 && charge < 1;
      if (volley) { charge = 1; p.volley = true; }
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

      const acc = p.stats.accuracy * g.cores.mod(p.team, 'accuracy', p);
      let spread = (K.shotSpread + awk) / acc + over * K.overchargeSpread;
      if (!p.isControlled) spread *= 2 - g.aiProfile(p.team).shotAccuracy;
      const ang = base + U.rand(-spread, spread);

      let spd = U.lerp(K.shotMinSpeed, K.shotMaxSpeed, c) * p.stats.power;
      // người chơi chạm nhẹ D: bóng chậm hơn đầu thanh lực, theo SHOOTING; giữ thêm tới shotTapWindow thì về lực của thanh
      if (K.shotTapWindow > 0 && held < K.shotTapWindow && p.isControlled && g.isHuman(p.team)) {
        const tap = K.shotTapSpeed * (1 + (p.stats.power - 1) * K.shotTapScale);
        spd = U.lerp(Math.min(tap, spd), spd, held / K.shotTapWindow);
      }
      spd *= g.cores.pmod(p, 'shotPower');
      const vz = U.lerp(K.shotLiftMin, K.shotLiftMax, c * c) + over * K.overchargeLift;
      b.kick(p, Math.cos(ang) * spd, Math.sin(ang) * spd, vz);
      b.kind = 'shot';
      p.facing = ang;
      p.charging = false; p.charge = 0; p.shotTarget = 0;
      this.startAttack(p, 'shoot'); // tư thế vung chân sút (kick.poseTime)
      g.cores.dispatch(p.team, 'onShoot', p, b, held);
      if (held >= g.cores.chargedThreshold(p)) g.cores.chargedShot(p, b, held);
      p.volley = false;
      p.recvT = -1;
      this.readShot(g, p);
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
      this.startAttack(p, 'shoot');
      g.effects.burst(b.x, b.y, 2, '#ffffff', 8, 80);
      g.effects.shake(G().fx.shakeShot);
      g.sfx('kick', 0.8);
    },

    // Né đòn: đang lướt (Z) hoặc được bảo vệ (ôm bóng trong vòng cấm) -> đòn không có tác dụng
    dodged(g, o) {
      if (g.isProtected(o)) return true;
      if (o.tackleImmune > 0) { g.effects.text(o.x, o.y - 26, 'DODGE', '#3ff6ff'); g.cores.dodge(o); return true; }
      return false;
    },

    // các đối thủ nằm trong vùng hình quạt trước mặt p (tầm tính từ mép người)
    // air = true: tính cả người đang bay thấp (Tâng Người)
    inFront(g, p, range, arcDeg, air = false) {
      const fv = facingVec(p), cosArc = Math.cos((arcDeg * Math.PI) / 180);
      return g.teams[1 - p.team].players.filter((o) => {
        const dx = o.x - p.x, dy = o.y - p.y, d = Math.hypot(dx, dy) || 1;
        return (air ? o.airZ < 40 : o.airZ <= 0) && d <= range + p.radius + o.radius && (dx * fv.x + dy * fv.y) / d >= cosArc;
      });
    },

    startAttack(p, type) { p.atkType = type; p.atkT = 0; },

    // hồi chiêu: đồng đội AI của người chơi hồi lâu hơn người chơi (ai.mate.cooldownMult)
    cooldown(g, p, key, base) {
      if (p.isControlled || !g.isHuman(p.team)) return base;
      const m = G().ai.mate.cooldownMult;
      return base * ((m && m[key]) || 1);
    },

    /* ---------- D — LIGHT ATTACK: cú đấm thẳng ---------- */
    lightAttack(g, p) {
      const L = G().combat.light;
      if (p.cd.light > 0 || p.state !== 'normal' || p.airZ > 0) return false;
      // ĐẤU SĨ 3: đang "nổi Nộ" / Phản Đòn sau khi né -> gần như không hồi chiêu
      p.cd.light = p.resT.frenzy > 0 || p.counterT > g.time ? 0.15 : this.cooldown(g, p, 'light', L.cooldown * g.cores.mod(p.team, 'lightCooldown', p));
      const fv = facingVec(p);
      p.state = 'jab'; p.stateT = L.startup;
      this.startAttack(p, 'light');
      p.vx += fv.x * L.lunge; p.vy += fv.y * L.lunge;
      p.bigPunch = g.cores.bigPunch(p);
      g.sfx('swing');
      g.cores.dispatch(p.team, 'onLightAttack', p);
      g.cores.dispatch(p.team, 'onTackle', p);
      return true;
    },

    // nắm đấm chạm tới: đánh mọi đối thủ trong vùng trước mặt
    lightHit(g, p) {
      const L = G().combat.light, C = g.cores;
      const fv = facingVec(p);
      const big = !!p.bigPunch;            // Nắm Đấm Khổng Lồ
      const counter = p.counterT > g.time; // Phản Đòn
      p.bigPunch = false;
      const GF = big && C.sp('giant_fist', p);   // Nắm Đấm Khổng Lồ: tầm x range, lực đẩy x knock (scale theo FIGHT)
      const range = L.range * C.mod(p.team, 'tackleRange', p) * (big ? GF.range : 1);
      const kb = L.knockback * p.stats.knock * C.mod(p.team, 'knockback', p) * (big ? GF.knock : 1);
      let hit = false;
      for (const o of this.inFront(g, p, range, big ? 100 : L.arc, C.has(p, 'juggle'))) {
        if (this.dodged(g, o)) continue;
        hit = true;
        const d = U.norm(o.x - p.x, o.y - p.y);
        // tia va chạm ở điểm nắm đấm chạm người
        g.effects.burst((p.x + o.x) / 2, (p.y + o.y) / 2, 10, '#fff6a0', 7, 90, 0.35);
        // Tâng Người: người đang bay bị tâng lên tiếp
        if (o.airZ > 0) { C.juggle(p, o); continue; }
        const upper = !big && C.uppercut(p);                  // Long Quyền
        const sure = big || counter || C.ironFist(p);          // chắc chắn làm rơi bóng
        const stun = L.stun * C.pmod(p, 'lightStun') * (big ? 3 : upper ? 2.5 : 1);
        const hopts = upper
          ? { stun, kbx: d.x * 40, kby: d.y * 40, launch: C.sp('uppercut', p).launch * C.pmod(p, 'launch'), source: p, type: 'light' }
          : { stun, kbx: d.x * kb, kby: d.y * kb, launch: big ? 150 : 0, source: p, type: 'light' };
        p.lastPunch = { big, upper, counter };
        if (o.hasBall) {
          let chance = L.stealChance * (p.stats.tackle / o.stats.dribble) * C.pmod(p, 'tackleChance');   // gồm Nộ
          if (!p.isControlled) chance *= g.aiProfile(p.team).tackleMult;
          if (sure || upper) chance = 1;
          if (Math.random() >= chance) {
            // người cầm bóng trụ được: chỉ bị đẩy lùi
            o.hit({ stun: 0, kbx: d.x * kb * 0.6, kby: d.y * kb * 0.6, source: p, type: 'light' });
            g.effects.text(o.x, o.y - 26, 'HOLD', '#9aa3b5');
            continue;
          }
          // Xe Ủi / Hoá Khổng Lồ: không rời bóng (đòn vẫn tiêu Giáp)
          const keep = C.unstealable(o);
          if (!keep) {
            // đấm rơi bóng: người bị đấm choáng lâu hơn (stealStun) để người đấm kịp lấy bóng
            hopts.stun *= L.stealStun / L.stun;
            p.punchStealT = g.time;   // lấy được bóng ngay sau đó -> chưa sút được (light.stealShotLock, Game.gainPossession)
            if (upper) g.looseBall(o, p.x - o.x, p.y - o.y, 40);   // Long Quyền: bóng rơi xuống chân người đấm
            else if (Math.random() < L.instantSteal) { g.looseBall(o, p.x - o.x, p.y - o.y, 0); g.gainPossession(p); }
            else {
              // bóng bật về phía người đấm, lệch sang một bên; người bị đấm văng hướng ngược lại (kbx / kby)
              const [a0, a1] = L.stealBallAngle;
              const ang = Math.atan2(p.y - o.y, p.x - o.x) + (Math.random() < 0.5 ? -1 : 1) * U.rand(a0, a1) * Math.PI / 180;
              g.looseBall(o, Math.cos(ang), Math.sin(ang), L.stealBallSpeed);
            }
          }
          o.hit(hopts);
          if (!keep) { C.dispatch(p.team, 'onTackleWin', p, o); C.steal(p); }
        } else {
          o.hit(hopts);
        }
        C.lightHit(p, o);
        // Võ Đường Phố thay bằng chữ comic to
        if (!C.has(p, 'street_fighter') && !big && !upper) g.effects.text(o.x, o.y - 26, 'POW!', '#ffcf3f');
      }
      if (counter) p.counterT = 0;
      p.lastPunch = null;
      if (hit) { g.sfx('punch'); g.effects.shake(G().fx.shakeHit * 0.6); }
      p.state = 'recover'; p.stateT = L.recover;
    },

    /* ---------- A — HARD ATTACK: gồng co chân rồi vung chân đá ---------- */
    hardAttack(g, p) {
      const H = G().combat.hard;
      if (p.cd.hard > 0 || p.state !== 'normal') return false;
      p.cd.hard = this.cooldown(g, p, 'hard', H.cooldown * g.cores.pmod(p, 'hardCooldown'));
      p.state = 'windup'; p.stateT = H.windup * g.cores.mod(p.team, 'hardWindup', p);   // Giày Sắt: gồng nhanh hơn
      this.startAttack(p, 'hard');
      p.charging = false;
      g.effects.text(p.x, p.y - 26, '!', '#ff3d5a');
      g.sfx('windup');
      return true;
    },

    // hết gồng -> bước tới, vung chân theo hướng đang nhìn
    hardRelease(g, p) {
      const H = G().combat.hard, C = g.cores;
      const fv = facingVec(p);
      // Dậm Đất: Hard attack thành cú bật nhảy rồi dậm xuống
      if (C.has(p, 'ground_slam')) {
        // lao về đối thủ gần nhất trước mặt (tới đúng lúc tiếp đất), không có ai thì nhảy tới trước
        const P = C.sp('ground_slam', p), air = (2 * P.jump) / G().combat.airGravity;
        let best = null, bd = P.leap + 60;
        for (const o of g.teams[1 - p.team].players) {
          const dx = o.x - p.x, dy = o.y - p.y, dd = Math.hypot(dx, dy);
          if (dd < bd && o.airZ <= 0 && (dx * fv.x + dy * fv.y) / (dd || 1) > 0.3) { bd = dd; best = o; }
        }
        let vx = fv.x * (P.leap * 0.5) / air, vy = fv.y * (P.leap * 0.5) / air;
        if (best) {
          const tx = best.x + best.vx * air * 0.5 - p.x, ty = best.y + best.vy * air * 0.5 - p.y;
          const sp = Math.min(P.maxSpeed, Math.hypot(tx, ty) / air), n = U.norm(tx, ty);
          vx = n.x * sp; vy = n.y * sp;
          p.facing = Math.atan2(ty, tx);
        }
        this.jumpSlam(p, 'ground', P.jump);
        p.vx = vx; p.vy = vy;
        g.sfx('whoosh');
        C.dispatch(p.team, 'onHardAttack', p);
        C.dispatch(p.team, 'onTackle', p);
        return;
      }
      let s = H.step * C.mod(p.team, 'slideSpeed', p);
      // Phi Cước: tiêu hết Đà, mỗi Đà bay xa + hất xa thêm
      p.flyMul = 1;
      if (C.has(p, 'flying_kick') && p.res.momentum > 0) {
        p.flyMul = 1 + C.sp('flying_kick', p).perMomentum * p.res.momentum;
        p.res.momentum = 0;
        s *= p.flyMul;
      }
      p.state = 'kick'; p.stateT = H.kickTime;
      p.dashX = fv.x * s; p.dashY = fv.y * s;
      p.kickHits.clear();
      p.hardLanded = false;
      g.sfx('kickSwing');
      g.cores.dispatch(p.team, 'onHardAttack', p);
      g.cores.dispatch(p.team, 'onTackle', p);
    },

    // bật nhảy (Dậm Đất / Thiên Thạch Giáng): tiếp đất -> CoreSystem.slamLand
    jumpSlam(p, kind, vz) {
      p.state = 'slam'; p.stateT = 3;
      p.slamKind = kind;
      p.airVz = vz; p.airZ = Math.max(p.airZ, 0.5);
      p.vx *= 0.3; p.vy *= 0.3;
      p.charging = false;
    },

    // đang vung chân: sút bóng lỏng trong tầm chân, đá bay đối thủ trúng chân
    hardUpdate(g, p) {
      const H = G().combat.hard, b = g.ball;
      const fv = facingVec(p);
      const hRange = H.range * g.cores.mod(p.team, 'hardRange', p);   // Giày Sắt: tầm chân dài hơn
      const reach = p.radius + hRange;
      if (!b.owner && b.z < 10 && !p.kickHits.has('ball') && U.dist(p, b) < reach + b.r) {
        const dx = b.x - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy) || 1;
        if ((dx * fv.x + dy * fv.y) / d > 0) {
          p.kickHits.add('ball');
          // Song Phi: bóng lỏng thành cú sút tụ lực tối đa bay thẳng về khung
          if (g.cores.has(p, 'scissor_kick')) g.cores.dispatch(p.team, 'onScissor', p, b);
          else { b.kick(p, fv.x * H.ballKick, fv.y * H.ballKick, 60); g.sfx('kick', 0.5); }
        }
      }
      const fly = p.flyMul || 1;
      const kb = H.knockback * p.stats.knock * g.cores.mod(p.team, 'knockback', p) * g.cores.pmod(p, 'launch') * fly;
      for (const o of this.inFront(g, p, hRange, H.arc)) {
        if (p.kickHits.has(o.id)) continue;
        p.kickHits.add(o.id);
        if (this.dodged(g, o)) continue;
        p.hardLanded = true;
        // hướng văng: giữa hướng chân đá và hướng từ người đá tới nạn nhân
        const to = U.norm(o.x - p.x, o.y - p.y);
        const d = U.norm(to.x + fv.x, to.y + fv.y);
        const had = o.hasBall && !g.cores.unstealable(o);
        // VÕ SĨ ĐÁ 2: bóng rơi về chân người đá (cướp bóng thật) thay vì văng theo nạn nhân
        const back = had && g.cores.tier(p, 'launcher') >= 2;
        if (had) {
          // bóng văng lệch sang một bên so với hướng người bị đá bay (hard.ballAngle), không bay cùng người
          const [a0, a1] = H.ballAngle;
          const ang = Math.atan2(d.y, d.x) + (Math.random() < 0.5 ? -1 : 1) * U.rand(a0, a1) * Math.PI / 180;
          if (back) g.looseBall(o, p.x - o.x, p.y - o.y, 70);
          else g.looseBall(o, Math.cos(ang), Math.sin(ang), H.ballKick * 0.7);
        }
        if (o.hit({ stun: H.stun, kbx: d.x * kb, kby: d.y * kb, launch: H.launch * g.cores.pmod(p, 'launch') * Math.sqrt(fly), source: p, type: 'hard' })) {
          g.cores.hardHit(p, o);
          g.effects.text(o.x, o.y - 30, 'SMASH!', '#ff3d5a');
          g.effects.burst(o.x, o.y, 10, '#ffffff', 10, 140, 0.4);
          g.effects.burst(o.x, o.y, 10, '#ff6a3d', 8, 110, 0.5);
          g.effects.flash(0.25);
          g.effects.shake(G().fx.shakeHit * 2.2, 0.3);
        }
        if (had) { g.cores.dispatch(p.team, 'onTackleWin', p, o); g.cores.steal(p); }
      }
    },

    // hết vung chân: trượt thì khựng lâu hơn (bị phản đòn)
    hardEnd(g, p) {
      const H = G().combat.hard;
      p.state = 'recover';
      p.stateT = p.hardLanded ? H.recover : H.whiffRecover;
      if (!p.hardLanded) g.effects.text(p.x, p.y - 26, 'MISS', '#9aa3b5');
      p.hardLanded = false;
    },

    skill(g, p, dx, dy) {
      const S = G().skill;
      if (p.state !== 'normal' || p.airZ > 0) return;
      if (p.cd.skill > 0) {
        // ẢO ẢNH 4: còn 1 lần Z dự trữ
        if (!(p.extraDash > 0)) return;
        p.extraDash--;
      }
      let d;
      if (Math.hypot(dx, dy) > 0.2) d = U.norm(dx, dy);
      else {
        const fv = facingVec(p);
        const s = U.randSign();
        d = p.hasBall ? U.norm(fv.x - fv.y * s, fv.y + fv.x * s) : fv;
      }
      const C = g.cores;
      // Bộ Pháp Ninja (mods) · ẢO ẢNH 2: hồi chiêu Z −20%
      p.cd.skill = this.cooldown(g, p, 'skill', S.cooldown * C.mod(p.team, 'skillCooldown', p) * (C.tier(p, 'trickster') >= 2 ? 0.8 : 1));
      p.state = 'dash'; p.stateT = S.dashTime;
      if (p.atkType === 'diveU' || p.atkType === 'diveD') p.atkType = null;   // lướt ngay sau khi đổ người: bỏ tư thế nằm
      p.dashX = d.x * S.dashSpeed; p.dashY = d.y * S.dashSpeed;
      // Bộ Pháp Ninja: né lâu hơn
      p.tackleImmune = S.tackleImmune + (C.has(p, 'quick_feet') ? C.sp('quick_feet', p).dodgeBonus : 0);
      p.charging = false;
      p.facing = Math.atan2(d.y, d.x);
      // bóng mờ đầu tiên ở điểm xuất phát, các bóng còn lại rải đều dọc đường lướt (Player.update, state dash)
      // ẢO ẢNH 2: tàn ảnh lâu hơn
      p.trailLife = g.cores.tier(p, 'trickster') >= 2 ? 1.3 : 0.3;
      g.effects.afterimage(p, p.trailLife);
      p.trailLeft = Math.max(0, (S.afterimages || 1) - 1);
      p.trailT = S.dashTime / (S.afterimages || 1);
      g.sfx('whoosh');
      g.cores.dispatch(p.team, 'onSkillMove', p, d);
    },

    // Đổ người (AI trông khung thành trong vòng cấm)
    dive(g, p, dy) {
      const P = G().player;
      if (p.state !== 'normal') return;
      // thời gian đổ người tỉ lệ với khoảng cách cần bay (không bay quá đà)
      p.state = 'dash';
      p.trailLeft = 0; // đổ người: chỉ 1 bóng mờ
      p.stateT = U.clamp(Math.abs(dy) / P.gkDiveSpeed, 0.05, P.gkDiveTime);
      p.dashX = 0; p.dashY = Math.sign(dy) * P.gkDiveSpeed;
      // anim bay người: diveU / diveD = bay lên / xuống màn hình (vẽ ở Renderer.diving, đồng bộ online qua atkType)
      this.startAttack(p, dy < 0 ? 'diveU' : 'diveD');
      g.effects.afterimage(p);
    },

    /* ---------- ĐỌC CÚ SÚT: giữ W trong vòng cấm nhà, thả đúng lúc đối phương sút ---------- */
    // 0..1: p đứng gần đường thẳng từ (ox, oy) theo hướng (dx, dy) tới đâu (đứng phía sau điểm xuất phát = 0)
    readAlign(p, ox, oy, dx, dy) {
      const R = G().read, d = U.norm(dx, dy);
      if ((p.x - ox) * d.x + (p.y - oy) * d.y <= 0) return 0;
      const perp = Math.abs((p.x - ox) * d.y - (p.y - oy) * d.x);
      return 1 - U.clamp((perp - R.lineFull) / (R.lineZero - R.lineFull), 0, 1);
    },

    // điểm vị trí lúc bóng rời chân (0..1): đứng trên đường bóng × người sút ở đủ xa (có thời gian chọn chỗ)
    readPosition(g, p, shooter) {
      const R = G().read, b = g.ball;
      const range = U.lerp(R.rangeMin, 1, U.clamp((U.dist(p, shooter) - R.rangeNear) / (R.rangeFar - R.rangeNear), 0, 1));
      return this.readAlign(p, b.x, b.y, b.vx, b.vy) * range;
    },

    // gọi ngay sau khi bóng rời chân người sút: ghi lại cú sút cho người chơi đang điều khiển bên phòng ngự,
    // chấm điểm luôn nếu người đó đã thả W từ trước (đọc sớm)
    readShot(g, shooter) {
      g.lastShot = null;
      if (!G().read.enabled) return;
      // co-op: 2 người cùng phòng ngự -> ưu tiên người đang thủ thế / đã thả W, rồi người đứng trong vòng cấm nhà
      const def = g.pilots(1 - shooter.team);
      const q = def.find((o) => o.bracing || o.readAt >= 0) || def.find((o) => g.inKeeperZone(o)) || def[0];
      if (!q) return;
      const P = this.readPosition(g, q, shooter);
      g.lastShot = { t: g.time, team: shooter.team, pid: q.id, sid: shooter.id, P };
      if (q.readAt >= 0) {
        const off = q.readAt - g.time;
        q.readAt = -1;
        this.read(g, q, off, P, false, shooter);
      }
    },

    // thả W: cú sút vừa xảy ra -> chấm điểm (đọc muộn); chưa có -> chờ cú sút trong cửa sổ đọc (Human.update hết hạn)
    // miss = true: bóng chạm người khi vẫn còn giữ W -> luôn là TOO LATE
    readRelease(g, p, miss = false) {
      const R = G().read, b = g.ball, s = g.lastShot;
      if (s && s.pid === p.id && s.team !== p.team && g.time - s.t <= R.lateLimit && b.kind === 'shot' && b.lastKickTeam === s.team && !b.read) {
        g.lastShot = null;
        this.read(g, p, g.time - s.t, s.P, miss, g.players.find((o) => o.id === s.sid));
      } else if (!miss) p.readAt = g.time;
    },

    // off = lúc thả − lúc sút (âm = thả sớm), P = điểm vị trí lúc sút, miss = bắt buộc đọc hụt
    // shooter = người sút (hoặc đang cầm bóng): chữ GOOD / GREAT / TOO EARLY / TOO LATE hiện trên đầu người đó —
    // chỗ người chơi đang nhìn thanh lực, không đè lên SAVE! / PARRY của thủ môn
    read(g, p, off, P, miss = false, shooter = null) {
      const R = G().read, b = g.ball, fx = g.effects;
      const gr = miss ? null : R.grades.find((it) => Math.abs(off) <= it.window) || null;
      const pos = gr ? P : 0; // vị trí chỉ được tính khi căn thời gian đạt
      const o = shooter || p, ox = o.x, oy = o.y - 44;
      if (!gr) {
        p.cd.read = R.cooldown;
        fx.text(ox, oy, off < 0 ? 'TOO EARLY' : 'TOO LATE', '#9aa3b5');
        fx.shield(p.x, p.y - 4, 10, '#9aa3b5', 0.4, 1);
        return;
      }
      b.read = { pid: p.id, grade: gr.id, bonus: gr.bonus + R.posBonus * pos, noStretch: !!gr.noStretch };
      if (gr.dive) this.readDive(g, p);
      const x = p.x, y = p.y;
      if (gr.id === 'perfect') {
        g.hitStop(0.06);
        g.slowMo(0.35, 0.35);
        fx.zoom(x, y - 10, 0.18, 0.45);
        fx.speedLines(0.35, x, y - 10, '#ffe14f');
        fx.wave(x, y, 34, '#ffe14f', 0.45, 3);
        fx.comic(ox, oy, 'PERFECT READ!', '#ffe14f', 0.8, 0.8);
      } else if (gr.id === 'great') {
        fx.zoom(x, y - 10, 0.08, 0.3);
        fx.wave(x, y, 26, '#3ff6ff', 0.4, 2);
        fx.comic(ox, oy, 'GREAT READ', '#3ff6ff', 0.65, 0.7);
      } else {
        fx.text(ox, oy, 'GOOD READ', '#9dff3d');
      }
      g.sfx('read', R.grades.indexOf(gr));
    },

    // đọc chuẩn: tự đổ người về đường bay của bóng (như thủ môn AI, giới hạn bởi gkDiveTime)
    readDive(g, p) {
      const b = g.ball;
      if (Math.abs(b.vx) < 1) return;
      const t = (p.x - b.x) / b.vx;
      if (t <= 0) return;
      const dy = b.y + b.vy * t - p.y;
      if (Math.abs(dy) > 4) this.dive(g, p, dy);
    },
  };

  SFC.Actions = Actions;
})();
