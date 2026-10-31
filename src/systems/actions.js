/* Actions — mọi hành động bóng đá/combat, dùng chung cho người chơi & AI */
window.SFC = window.SFC || {};

(function () {
  const U = SFC.U;
  const G = () => SFC_CONFIG.game;

  function facingVec(p) { return { x: Math.cos(p.facing), y: Math.sin(p.facing) }; }

  // mô phỏng trước quỹ đạo bóng (trọng lực, nảy, ma sát, dội tường) — dùng cho điểm đón bóng + điểm rơi
  function flightState(b) { return { x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, vz: b.vz, fm: b.frictionMult * b.shotFm(), shot: b.shotFm() < 1 }; }
  // 1 bước; trả về true nếu bước này bóng rơi chạm sân
  function flightStep(g, s, dt) {
    const B = G().ball, f = g.field, r = g.ball.r;
    const wasAir = s.z > 0;
    s.x += s.vx * dt; s.y += s.vy * dt;
    s.vz -= B.gravity * dt; s.z += s.vz * dt;
    const landed = wasAir && s.z <= 0;
    if (s.z <= 0) {
      s.z = 0;
      if (s.vz < -50) { const kb = s.fm < 1 && s.shot ? B.shotBounceKeep : 0.78; s.vz = -s.vz * B.bounce; s.vx *= kb; s.vy *= kb; } else s.vz = 0;
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
      const P = G().pass, PA = P.assist;
      const dir = Math.hypot(dx, dy) > 0.2 ? U.norm(dx, dy) : facingVec(p);
      // HỖ TRỢ CHUYỀN (pass.assist): người chơi chọn người nhận trong vùng rộng hơn theo PASSING, né đường chuyền dễ bị cắt
      const human = this.passAssisted(g, p), k = human ? this.passSkill(g, p) : 0;
      if (human && cone != null) cone = U.lerp(PA.cone[0], PA.cone[1], k);
      const pref = power == null ? null : U.lerp(P.minDist, P.maxDist, power);
      const opps = g.teams[1 - p.team].players, ground = mode !== 'lob' && mode !== 'lobthrough';
      const laneW = human ? U.lerp(PA.laneWeight[0], PA.laneWeight[1], k) : 0;
      const scan = (maxAng) => {
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
            if (ground && !human && U.segDist(o.x, o.y, p.x, p.y, m.x, m.y) < 10) s -= 0.5;
          }
          // chọc khe: bóng vào khoảng trống theo mũi tên, không tới chỗ người nhận đang đứng -> không trừ điểm đường chuyền tới họ
          if (ground && human && mode !== 'through') s -= this.laneRisk(g, p, m.x, m.y) * laneW;
          s += (Math.min(oppD, 60) / 60) * 0.4;
          if (m === prev) s += P.switchMargin;
          if (s > bestS) { bestS = s; best = m; }
        }
        return best;
      };
      let best = scan(cone == null ? Infinity : (cone * Math.PI) / 180);
      // TRẢ BÓNG (pass.returnPass): không ai trong vùng hướng mà người vừa chuyền cho mình nằm trong vùng rộng hơn -> trả lại người đó
      const RP = P.returnPass, r = p.retFrom;
      if (!best && cone != null && RP && r && r.team === p.team && r.state !== 'stun' && g.time - p.gotT < RP.window) {
        const tx = r.x - p.x, ty = r.y - p.y, d = Math.hypot(tx, ty) || 1;
        if (Math.acos(U.clamp((tx * dir.x + ty * dir.y) / d, -1, 1)) <= (RP.cone * Math.PI) / 180) best = r;
      }
      // vẫn không ai: chuyền sệt / bổng của người chơi tìm tiếp trong vùng rộng (fallback) trước khi phát vào khoảng trống
      if (!best && human && cone != null && (mode === 'ground' || mode === 'lob')) best = scan((U.lerp(PA.fallback[0], PA.fallback[1], k) * Math.PI) / 180);
      return best;
    },
    // đường chuyền có hỗ trợ (pass.assist): người chơi đang điều khiển
    passAssisted(g, p) { const PA = G().pass.assist; return !!PA && PA.enabled && p.isControlled && g.isHuman(p.team); },
    // 0..1 theo PASSING (pass.assist.acc), gồm Core / BADGE chỉnh độ chuẩn chuyền
    passSkill(g, p) {
      const PA = G().pass.assist, acc = p.stats.pass * g.cores.mod(p.team, 'passAccuracy', p);
      return U.clamp((acc - PA.acc[0]) / (PA.acc[1] - PA.acc[0]), 0, 1);
    },
    // 0..1: nguy cơ đường chuyền sệt từ bóng tới (x, y) bị cắt — đối thủ nào đứng trong tầm với của đường bóng, tính cả quãng họ kịp
    // bước tới (pass.assist.close px/s) trong lúc bóng lăn tới chỗ đó (ballSpeed px/s). Bỏ qua người đứng sau lưng / sát chỗ nhận
    laneRisk(g, p, x, y) {
      const b = g.ball, PA = G().pass.assist, reach = p.radius + b.r + G().ball.pickupRange;
      const L = Math.hypot(x - b.x, y - b.y) || 1, ux = (x - b.x) / L, uy = (y - b.y) / L;
      let risk = 0;
      for (const o of g.teams[1 - p.team].players) {
        if (o.state === 'stun') continue;
        const along = (o.x - b.x) * ux + (o.y - b.y) * uy;
        if (along < 0 || along > L - 4) continue;
        const perp = Math.abs((o.x - b.x) * uy - (o.y - b.y) * ux);
        const gap = perp - reach - PA.close * (along / PA.ballSpeed);
        risk = Math.max(risk, U.clamp(1 - gap / PA.margin, 0, 1));
      }
      return risk;
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
      // HỖ TRỢ CHUYỀN (pass.assist): người chơi — giảm lực thừa nhiều hơn + dịch điểm nhận né chân đối thủ, theo PASSING
      const PA = P.assist, human = this.passAssisted(g, p), ak = human ? this.passSkill(g, p) : 0;
      const pAssist = human ? U.lerp(PA.power[0], PA.power[1], ak) : P.powerAssist;
      // lực mặc định = lực lý tưởng theo khoảng cách; giữ vượt mức đó -> bóng căng hơn
      const powerFactor = (ideal) => {
        if (power == null || power <= ideal) return 1;
        return 1 + (power - ideal) * (1 - pAssist) * P.powerSensitivity;
      };

      // không có người nhận trong vùng hướng -> chuyền thẳng theo hướng mũi tên, lực = quãng đường
      if (!target) {
        const dir = Math.hypot(dx, dy) > 0.2 ? U.norm(dx, dy) : facingVec(p);
        let pw = power == null ? 0.5 : power;
        if (mode === 'through' || mode === 'lobthrough') pw = Math.max(P.throughBase, pw);
        const D = U.lerp(P.freeMinDist, P.freeMaxDist, pw) * mult;
        const point = clampPt({ x: b.x + dir.x * D, y: b.y + dir.y * D });
        if (mode === 'lob' || mode === 'lobthrough') {
          const T = U.lerp(P.lobTimeMin, P.lobTimeMax, pw);
          const vh = (B.airDrag * D) / (1 - Math.exp(-B.airDrag * T));
          return { point, vx: dir.x * vh, vy: dir.y * vh, vz: (B.gravity * T) / 2, T };
        }
        const arrive = mode === 'through' ? P.freeThroughArrive * mult : 30;
        const spd = U.clamp(B.groundFriction * D + arrive, P.minSpeed, P.maxSpeed * mult);
        return { point, vx: dir.x * spd, vy: dir.y * spd, vz: 0, T: 1 };
      }

      let point, spd, vz = 0, T = 0.5, cross = false;
      const k = B.groundFriction;
      // điểm rơi chọc khe, depth px vào khoảng trống. AI / không bấm hướng: phía trước người nhận theo hướng tấn công.
      // Người chơi có mũi tên (pass.throughAim, user 2026-10-31): bóng đi theo hướng mũi tên, sâu hơn người nhận depth px;
      // người nhận chỉ kéo điểm rơi lệch ngang khỏi đường mũi tên (1 - throughAim) — ý đồ chuyền là của người chơi, không bám người
      const throughPoint = (depth) => {
        const aim = human && Math.hypot(dx, dy) > 0.2 ? U.norm(dx, dy) : null;
        if (!aim) {
          const goal = g.attackGoal(p.team);
          const run = U.norm(g.teams[p.team].dir, U.clamp((goal.y - target.y) / 250, -0.6, 0.6));
          return clampPt({ x: target.x + run.x * depth, y: target.y + run.y * depth });
        }
        const tx = target.x - b.x, ty = target.y - b.y;
        const along = Math.max(0, tx * aim.x + ty * aim.y), keep = 1 - P.throughAim;
        return clampPt({ x: b.x + aim.x * (along + depth) + (tx - aim.x * along) * keep, y: b.y + aim.y * (along + depth) + (ty - aim.y * along) * keep });
      };
      if (mode === 'lobthrough') {
        // CHỌC KHE BỔNG (game.technique.lobThrough): điểm rơi như chọc khe (+ lead px, âm = nông hơn), bóng bay bổng qua đầu hậu vệ
        const depth = U.lerp(P.throughLeadMin, P.throughLeadMax, power == null ? 0.5 : Math.max(P.throughBase, power)) + G().technique.lobThrough.lead;
        point = throughPoint(depth);
        const d = U.dist(b, point) || 1, ka = B.airDrag, LT = G().technique.lobThrough;
        T = U.lerp(LT.timeMin, LT.timeMax, idealOf(d));
        spd = (ka * d) / (1 - Math.exp(-ka * T));
        vz = (B.gravity * T) / 2;
      } else if (mode === 'through') {
        // bóng vào khoảng trống phía trước người nhận; lực quyết định độ sâu
        const depth = U.lerp(P.throughLeadMin, P.throughLeadMax, power == null ? 0.5 : Math.max(P.throughBase, power));
        point = throughPoint(depth);
        const d = U.dist(b, point) || 1;
        // lực mặc định cao như chuyền sệt: bóng tới điểm nhận vẫn còn throughArriveSpeed,
        // người nhận chủ động băng lên đón (receiveMove) thay vì bóng lăn chậm chờ người
        spd = U.clamp(P.throughArriveSpeed * mult + k * d, P.minSpeed, P.maxSpeed * mult);
        T = -Math.log(Math.max(0.02, 1 - (k * d) / spd)) / k;
      } else if (mode === 'lob') {
        // tạt cánh (firstTime.cross): bóng tới điểm đón ở độ cao ngang đầu (X.z) thay vì rơi xuống chân
        const X = this.crossFrom(g, p, target) ? G().firstTime.cross : null;
        const lead = X ? X.lead : P.receiverLead;
        let d = 1;
        for (let i = 0; i < 4; i++) {
          point = clampPt({ x: target.x + target.vx * lead * T, y: target.y + target.vy * lead * T });
          d = U.dist(b, point) || 1;
          T = X ? U.lerp(X.timeMin, X.timeMax, idealOf(d)) : U.lerp(P.lobTimeMin, P.lobTimeMax, idealOf(d));
        }
        const ka = B.airDrag;
        spd = ((ka * d) / (1 - Math.exp(-ka * T))) * powerFactor(idealOf(d));
        vz = X ? (X.z - 0.5 + (B.gravity * T * T) / 2) / T : (B.gravity * T) / 2;
        cross = !!X;
      } else {
        // chuyền sệt: v(x) = v0 - k*x  ->  v0 = tốc độ tới chân + k*d
        const speedTo = (pt) => {
          const d = U.dist(b, pt) || 1;
          spd = U.clamp((P.arriveSpeed * mult + k * d) * powerFactor(idealOf(d)), P.minSpeed, P.maxSpeed * mult);
          T = k * d < spd * 0.98 ? -Math.log(1 - (k * d) / spd) / k : 1.5;
        };
        for (let i = 0; i < 4; i++) {
          point = clampPt({ x: target.x + target.vx * P.receiverLead * T, y: target.y + target.vy * P.receiverLead * T });
          speedTo(point);
        }
        // có chân đối thủ chắn đường bóng: thử dịch điểm nhận sang ngang (người nhận tự chạy đón), lấy chỗ ít nguy cơ nhất
        const S = human ? U.lerp(PA.shift[0], PA.shift[1], ak) : 0;
        if (S > 0) {
          let r0 = this.laneRisk(g, p, point.x, point.y);
          if (r0 > 0) {
            const L = U.dist(b, point) || 1, nx = -(point.y - b.y) / L, ny = (point.x - b.x) / L;
            let best = point;
            for (const o of [S * 0.5, -S * 0.5, S, -S]) {
              const q = clampPt({ x: point.x + nx * o, y: point.y + ny * o }), r = this.laneRisk(g, p, q.x, q.y);
              if (r < r0 - 0.05) { r0 = r; best = q; }
            }
            if (best !== point) { point = best; speedTo(point); }
            // vẫn còn nguy cơ: chuyền căng hơn (zip)
            if (r0 > 0) spd = Math.min(P.maxSpeed * mult, spd * (1 + r0 * U.lerp(PA.zip[0], PA.zip[1], ak)));
          }
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
      return { point, vx: dir.x * spd, vy: dir.y * spd, vz, T, cross };
    },

    // Tạt cánh (firstTime.cross): người chuyền ở hành lang cánh trong 1/3 sân đối phương, người nhận gần khung + ở phía trong hơn
    crossFrom(g, p, target) {
      const X = G().firstTime && G().firstTime.cross, f = g.field;
      if (!X || !target || !G().firstTime.enabled) return false;
      const dir = g.teams[p.team].dir;
      const prog = dir > 0 ? (p.x - f.x) / f.w : (f.x + f.w - p.x) / f.w;
      const wide = Math.abs(p.y - f.cy);
      return prog >= X.zone && wide >= X.wide && U.dist(target, g.attackGoal(p.team)) <= X.boxDist && Math.abs(target.y - f.cy) < wide;
    },

    /* ---------- DỨT ĐIỂM 1 CHẠM (game.firstTime) ---------- */
    // bóng đang tới p: đường chuyền nhắm p, hoặc đường lăn / bay của bóng đi qua gần p trong firstTime.incomingTime giây
    ballIncoming(g, p) {
      const b = g.ball, F = G().firstTime;
      if (b.owner) return false;
      if (b.passTarget === p && b.speed > 20) return true;
      const v2 = b.vx * b.vx + b.vy * b.vy;
      if (v2 < 400) return U.dist(b, p) < F.incomingDist;
      const t = U.clamp(((p.x - b.x) * b.vx + (p.y - b.y) * b.vy) / v2, 0, F.incomingTime);
      return Math.hypot(b.x + b.vx * t - p.x, b.y + b.vy * t - p.y) < F.incomingDist;
    },

    canFirstTime(g, p) {
      const F = G().firstTime;
      return !!F && F.enabled && !p.ot && (p.state === 'normal' || p.state === 'dash') && !(p.airZ > 0) && !(p.noActT > 0) && this.ballIncoming(g, p);
    },

    // bắt đầu chờ đá: thanh lực từ 0, nạp khi còn giữ D (Player.tickFirstTime)
    // pass = ground | through | lob -> chờ CHUYỀN 1 chạm (đánh đầu chuyền / vô-lê chuyền) thay vì sút, không có thanh lực
    armFirstTime(g, p, pass = null) {
      if (!this.canFirstTime(g, p)) return false;
      p.ot = { charge: 0, held: !pass, t: 0, miss: 0, aim: null, aimY: 0, target: null, pass };
      p.charging = !pass; p.charge = 0;
      return true;
    },

    // bóng đang tới p sẽ tới chỗ đón ở trên tầm khống chế (ball.pickupHeight) -> phải đánh đầu / vô-lê
    highBall(g, p) {
      const F = G().firstTime;
      return this.interceptPoint(g, p, 1.5, F.maxZ).z > G().ball.pickupHeight;
    },

    // BẬT NHẢY ĐÁNH ĐẦU (firstTime.header): đang chờ đá, bóng sẽ tới ở độ cao đánh đầu trong lead s -> nhảy trước khi chạm
    // (Player.tickFirstTime gọi mỗi bước). Tư thế đồng bộ online qua atkType / atkT như mọi tư thế khác
    headerJump(g, p) {
      const F = G().firstTime, H = F.header;
      if (!H.hop || p.atkType === 'header' || p.atkType === 'volley' || g.ball.owner) return;
      const ip = this.interceptPoint(g, p, H.lead + 0.05, F.maxZ + H.jumpZ);
      if (ip.t > H.lead || ip.z < F.headerZ - 3) return;
      if (U.dist(p, ip) > p.radius + g.ball.r + F.reach + 8) return;
      this.startAttack(p, 'header');
      g.effects.burst(p.x, p.y, 0, '#d8d0c0', 5, 40);   // bụi lúc bật nhảy
    },

    // tư thế đánh đầu lúc chạm bóng: đang nhảy sẵn thì giữ cú nhảy (chạm sớm: lên tới gần đỉnh), chưa nhảy thì bật lên từ giữa đà
    headerPose(p) {
      const P = G().firstTime.header.pose;
      if (p.atkType === 'header') p.atkT = Math.max(p.atkT, P * 0.42);
      else { this.startAttack(p, 'header'); p.atkT = P * 0.3; }
    },

    // CHUYỀN 1 CHẠM bằng đầu / vô-lê (p.ot.pass): người nhận theo mũi tên lúc chạm (người chơi: trong pass.coneAngle, có trả bóng
    // pass.returnPass; AI: đồng đội hợp nhất theo hướng tấn công), lực lý tưởng. Bóng rời đầu ở độ cao lúc chạm
    airPass(g, p, mode, aim, ft) {
      const human = g.isHuman(p.team) && p.isControlled;
      const dx = aim ? aim.x : 0, dy = aim ? aim.y : 0;
      const target = this.findPassTarget(g, p, dx, dy, null, mode, null, human && aim ? G().pass.coneAngle : null);
      this.passTo(g, p, target, mode, dx, dy, null);
      const b = g.ball;
      b.z = Math.max(b.z, ft.z);
      if (ft.kind === 'header') { this.headerPose(p); g.sfx('header'); } else if (ft.kind === 'volley') this.startAttack(p, 'volley');
      g.effects.burst(b.x, b.y, ft.z, '#ffffff', 4, 50);
    },

    disarm(p) {
      if (!p.ot) return;
      p.ot = null;
      p.charging = false; p.charge = 0;
    },

    // bóng chạm người đang chờ đá (Game.updatePossession -> Game.strike): đá luôn theo độ cao bóng
    firstTime(g, p) {
      const b = g.ball, F = G().firstTime, o = p.ot;
      if (!o) return;
      const ft = { kind: b.z >= F.headerZ ? 'header' : b.z >= F.volleyZ ? 'volley' : 'ground', z: b.z, vx: b.vx, vy: b.vy, spd: b.speed };
      // GOAT PATH (LEGEND Ibrakadabra, kỹ thuật BICYCLE KICK): bóng cao -> bay lên móc xe đạp (tự nhắm khung thành, lực mạnh hơn)
      if (SFC.Legends && p.legend && b.z >= SFC_CONFIG.legends.tuning.bicycle.minZ && SFC.Legends.tech(g, p, 'bicycle')) ft.kind = 'bicycle';
      const aim = ft.kind === 'bicycle' ? null : o.aim && Math.hypot(o.aim.x, o.aim.y) > 0.2 ? o.aim : null;
      const charge = o.charge, aimY = o.aimY || 0;
      g.gainPossession(p);   // kiến tạo, chuỗi chuyền, Core khi nhận bóng... như nhận bóng thường (xoá p.ot)
      if (o.pass) return this.airPass(g, p, o.pass, aim, ft);
      this.shoot(g, p, charge, aimY, aim, ft);
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
      if (g.ball.owner !== p || p.noActT > 0) return;   // noActT: hoá gà / con rối (Tuyệt kỹ) — không ra đòn / chuyền / sút / lướt
      const lock = p.passLock && p.passLock.state !== 'stun' ? p.passLock : null;
      const target = lock || this.findPassTarget(g, p, dx, dy, this.targetBias(power), mode, null, G().pass.coneAngle);
      this.passTo(g, p, target, mode, dx, dy, power);
    },

    // S (pass.quick): chuyền sệt tự động, lực lý tưởng. Mũi tên chỉ vào đồng đội -> chuyền chuẩn cho người đó;
    // không bấm hướng / chỉ lệch khỏi đồng đội -> chuyền cho người gần nhất, cộng sai số hướng + lực
    quickPass(g, p, dx, dy) {
      if (g.ball.owner !== p || p.noActT > 0) return;
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
      const b = g.ball, F = G().firstTime;
      // quả tạt / đang chờ đá: chạy tới chỗ đón bóng ở ngang đầu, không đợi bóng rơi xuống chân
      const ip = this.interceptPoint(g, p, 2, F && (p.ot || b.cross) ? F.headerZ + 6 : null);
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
    // zMax: độ cao chạm được (mặc định ball.pickupHeight; chờ đá 1 chạm / quả tạt: tới ngang đầu)
    interceptPoint(g, p, maxT = 2, zMax = null) {
      const B = G().ball, s = flightState(g.ball);
      const top = zMax != null ? zMax : B.pickupHeight;
      const dt = 1 / 30;
      const speed = G().player.speed * p.stats.speed * G().player.sprintMult * 0.9;
      const reach = p.radius + g.ball.r + B.pickupRange;
      for (let t = dt; t <= maxT; t += dt) {
        flightStep(g, s, dt);
        if (s.z > top) continue;
        const need = Math.max(0, Math.hypot(s.x - p.x, s.y - p.y) - reach) / speed + 0.08;
        if (need <= t) return { x: s.x, y: s.y, t, z: s.z };
        if (s.z === 0 && Math.hypot(s.vx, s.vy) < 5) return { x: s.x, y: s.y, t: need, z: 0 };
      }
      return { x: s.x, y: s.y, t: maxT, z: s.z };
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
      b.lob = mode === 'lob' || mode === 'lobthrough';
      if (mode === 'lobthrough' && p.legend) b.legTech = 'lobthrough';   // LEGEND TRIAL (Pirlow): đồng đội đón được = 1 lần
      b.cross = !!plan.cross;
      b.oneTouch = !!target && g.time - (p.gotT == null ? -9 : p.gotT) < G().pass.oneTouch.window;
      // đồng đội AI của người chơi đón đường chuyền chuẩn: thỉnh thoảng đi bộ thay vì chạy nước rút (ai.mate)
      if (target) target.ai.recvWalk = Math.random() < G().ai.mate.receiveWalkChance;
      p.charging = false; p.charge = 0;
      p.cancelPass();
      p.facing = Math.atan2(plan.vy, plan.vx);
      g.cores.dispatch(p.team, 'onPass', p, target, mode === 'lobthrough' ? 'lob' : mode);
      if (target && g.isHuman(p.team) && p.isControlled) {
        const prev = g.ctrl[p.team];
        g.setControlled(target);
        // mũi tên người chơi đang giữ là hướng chuyền, không phải lệnh cho người nhận -> khóa tới khi thả phím
        // (chế độ 1 cầu thủ / co-op: quyền điều khiển không chuyển sang người nhận -> không khóa)
        if (prev !== target && g.ctrl[p.team] === target) g.receiveLock[p.team] = true;
      }
      // người chuyền giờ do AI đá: băng lên nhận lại (ai.runs.giveGo)
      if (target && SFC.AI && !(g.isHuman(p.team) && p.isControlled)) SFC.AI.giveGo(g, p);
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

    // phần nạp quá đà (0..maxOvercharge − 1 − overGrace): thanh đầy rồi còn kick.overGrace mới bắt đầu tính
    overcharge(charge) {
      const K = G().kick;
      return Math.max(0, charge - 1 - (K.overGrace || 0));
    },

    // Độ bổng cú sút (vz) theo khoảng cách tới vạch vôi (kick.loftFrom..shotLoft): lực nhỏ = bóng sệt, đầy lực = bóng qua vạch vôi
    // ở shotLoft x xà dù đứng xa hay gần (xa thì vồng lên rồi chúc xuống), quá đà cộng overLoft x xà -> vọt xà
    // z0 = độ cao bóng lúc chạm (vô-lê: bóng đi từ ngang hông)
    shotLift(g, p, ang, spd, c, over, z0 = 0) {
      const K = G().kick, B = G().ball, f = g.field;
      const k = Math.pow(U.clamp((c - K.loftFrom) / (1 - K.loftFrom), 0, 1), K.loftPow);
      if (k <= 0) return K.shotLiftMin;
      const gx = g.teams[p.team].dir > 0 ? f.x + f.w : f.x, cos = Math.abs(Math.cos(ang));
      const d = Math.max(20, Math.abs(gx - g.ball.x) / Math.max(0.2, cos));
      // thời gian bóng bay tới vạch vôi (cản gió x ma sát riêng của cú sút)
      const ka = B.airDrag * B.shotFriction, r = (ka * d) / Math.max(1, spd);
      const t = r < 0.95 ? -Math.log(1 - r) / ka : (d / Math.max(1, spd)) * 1.5;
      const om = K.maxOvercharge - 1 - (K.overGrace || 0), oq = om > 0 ? Math.min(1, over / om) : 0;
      const h = f.goalHeight * U.lerp(K.shotLoft, K.overLoft, oq * oq) - z0;
      const arc = Math.min(K.shotLiftCap, (h + (B.gravity * t * t) / 2) / t);
      return U.lerp(K.shotLiftMin, Math.max(K.shotLiftMin, arc), k);
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

    // HỖ TRỢ NHẮM SÚT (kick.assist): chọn phía khung (mũi tên lên / xuống; thẳng / không bấm = phía thủ môn để trống hơn), điểm nhắm
    // cách cột theo SHOOTING (k = 0..1), rồi kéo hướng sút raw về điểm đó theo strength. Trả về góc mới
    assistAim(g, p, raw, aim, k) {
      const AS = G().kick.assist, b = g.ball, f = g.field, dir = g.teams[p.team].dir;
      const gx = dir > 0 ? f.x + f.w : f.x, m = f.goalWidth / 2 - 6;
      let side = aim && Math.abs(aim.y) >= AS.side ? Math.sign(aim.y) : 0;
      if (!side) {
        // thủ môn đối phương (đứng trong vòng cấm của họ, gần khung nhất): sút về phía khoảng trống lớn hơn
        let gk = null, bd = Infinity;
        for (const o of g.teams[1 - p.team].players) {
          if (!g.inKeeperZone(o)) continue;
          const d = Math.abs(o.x - gx);
          if (d < bd) { bd = d; gk = o; }
        }
        // không có ai trông khung: cột xa so với chỗ đứng
        side = gk ? (gk.y - (f.cy - m) > f.cy + m - gk.y ? -1 : 1) : b.y > f.cy ? -1 : 1;
      }
      const ty = f.cy + side * (m - U.lerp(AS.inset[0], AS.inset[1], k));
      const want = Math.atan2(ty - b.y, gx - b.x);
      return raw + U.angleDiff(raw, want) * U.lerp(AS.strength[0], AS.strength[1], k);
    },

    // aim = hướng phím người chơi giữ lúc thả ({x, y}) hoặc null -> nhắm theo aimY (-1..1, 0 = giữa khung; AI dùng)
    // ft = dứt điểm 1 chạm (Actions.firstTime): { kind: ground | volley | header, z, vx, vy, spd } của bóng lúc chạm
    shoot(g, p, charge, aimY, aim = null, ft = null) {
      const b = g.ball, K = G().kick, f = g.field, F = G().firstTime;
      if (b.owner !== p || p.noActT > 0) return;
      const tm = g.teams[p.team];
      // One-Two: dứt điểm 1 chạm luôn đầy lực, không bị phạt sai số
      const volley = !!ft && g.cores.volleyCharge(p) > 0;
      if (volley) { charge = 1; p.volley = true; }
      p.ftKind = ft ? ft.kind : null;
      // kỹ thuật (game.technique, chỉ người chơi bấm tổ hợp): finesse = cứa lòng · chip = sút bổng. Dứt điểm 1 chạm thì bỏ qua
      const style = ft ? null : p.shotStyle;
      p.shotStyle = null;
      const TQ = G().technique;
      const held = Math.min(charge, 1);   // phần người chơi thực sự giữ (Core Fire/Thunder dựa vào mức này)
      const c = this.shotPower(g, p, charge);
      const over = this.overcharge(charge);

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
      // HỖ TRỢ NHẮM (kick.assist): người chơi, trừ sút xe đạp (ft bicycle tự nhắm)
      const AS = K.assist, human = p.isControlled && g.isHuman(p.team);
      const assist = !!AS && AS.enabled && human && !(ft && ft.kind === 'bicycle');
      const ak = assist ? U.clamp((acc - AS.acc[0]) / (AS.acc[1] - AS.acc[0]), 0, 1) : 0;
      if (assist) base = this.assistAim(g, p, base, aim, ak);
      let spread = (K.shotSpread + awk) / acc + over * K.overchargeSpread;
      if (assist) spread *= U.lerp(AS.spread[0], AS.spread[1], ak);
      if (!p.isControlled) spread *= 2 - g.aiProfile(p.team).shotAccuracy;
      // dứt điểm 1 chạm: kém chuẩn hơn (vô-lê nhiều nhất, đánh đầu ít nhất), bóng tới càng nhanh càng khó
      if (ft && !volley) {
        spread *= ft.kind === 'header' ? F.header.spread : ft.kind === 'volley' ? F.volley.spread : F.spread;
        spread *= 1 + U.clamp((ft.spd - F.fastFrom) / F.fastRange, 0, 1) * F.fastSpread;
      }
      // kỹ thuật LEGEND (config/legends.config.js tuning): power = POWER SHOT · trivela = TRIVELA · ft bicycle = BICYCLE KICK
      const LT = SFC_CONFIG.legends && SFC_CONFIG.legends.tuning;
      if (style === 'finesse') spread *= TQ.finesse.spread;
      else if (style === 'chip') spread *= TQ.chip.spread;
      else if (style === 'power') spread *= LT.power.spread;
      else if (style === 'trivela') spread *= LT.trivela.spread;
      if (ft && ft.kind === 'bicycle') spread *= LT.bicycle.spread;
      let ang = base + U.rand(-spread, spread);
      if (p.inj && SFC.Hurt) ang += SFC.Hurt.shank(g, p);   // GOAT PATH: đau ngón chân -> thỉnh thoảng sút trượt chân

      let spd = U.lerp(K.shotMinSpeed, K.shotMaxSpeed, c) * p.stats.power;
      // người chơi chạm nhẹ D: bóng chậm hơn đầu thanh lực, theo SHOOTING; giữ thêm tới shotTapWindow thì về lực của thanh
      if (K.shotTapWindow > 0 && held < K.shotTapWindow && p.isControlled && g.isHuman(p.team)) {
        const tap = K.shotTapSpeed * (1 + (p.stats.power - 1) * K.shotTapScale);
        spd = U.lerp(Math.min(tap, spd), spd, held / K.shotTapWindow);
      }
      spd *= g.cores.pmod(p, 'shotPower');
      let vz = this.shotLift(g, p, ang, spd, c, over, ft ? ft.z : 0);
      let curve = 0;
      if (style === 'power') { spd *= LT.power.speed; vz *= LT.power.lift; }
      if (style === 'finesse' || style === 'trivela') {
        // CỨA LÒNG: bóng chậm hơn, xuất phát chệch ra ngoài rồi cong đều vào trong (cung tròn) — tới vạch vôi đúng hướng đã nhắm.
        // Cong về phía góc nhắm (nhắm giữa khung: cong vào góc xa so với chỗ đứng). TRIVELA (má ngoài): cong ngược phía, mạnh hơn
        const tri = style === 'trivela';
        spd *= tri ? LT.trivela.speed : TQ.finesse.speed;
        vz = K.shotLiftMin;
        const dirX = tm.dir, gx = dirX > 0 ? f.x + f.w : f.x;
        const dist = Math.max(20, Math.abs((gx - b.x) / Math.cos(ang)));
        const ty = b.y + Math.tan(ang) * (gx - b.x);
        const side = (Math.sign(ty - f.cy) || Math.sign(f.cy - b.y) || 1) * (tri ? -1 : 1);
        const k = G().ball.groundFriction * G().ball.shotFriction;   // bóng sút: ma sát riêng (ball.shotFriction)
        const t = k * dist < spd * 0.95 ? -Math.log(1 - (k * dist) / spd) / k : dist / spd;
        const bend = TQ.finesse.bend * (tri ? LT.trivela.bend : 1);
        ang += side * dirX * bend / 2;
        curve = -side * dirX * bend / t;
      } else if (style === 'chip') {
        // SÚT BỔNG: vồng cao, rơi xuống sau vạch vôi (chip.depth) ở độ cao landZ (dưới xà). Bay lâu theo khoảng cách, nạp đầy thì nhanh hơn
        const gx = (tm.dir > 0 ? f.x + f.w : f.x) + tm.dir * TQ.chip.depth, d = Math.max(30, Math.abs((gx - b.x) / Math.cos(ang)));
        const T = U.lerp(TQ.chip.timeMin, TQ.chip.timeMax, U.clamp(d / 260, 0, 1)) * (1 - TQ.chip.quick * held);
        const ka = G().ball.airDrag * G().ball.shotFriction;
        spd = (ka * d) / (1 - Math.exp(-ka * T));
        vz = (TQ.chip.landZ + (G().ball.gravity * T * T) / 2) / T;
      }
      if (ft && ft.kind === 'header') { spd = U.lerp(F.header.speedMin, F.header.speedMax, c) * p.stats.power * g.cores.pmod(p, 'shotPower'); vz = F.header.vz; }
      else if (ft && ft.kind === 'volley') { spd *= F.volley.power; vz *= F.volley.lift; }
      else if (ft && ft.kind === 'bicycle') { spd *= F.volley.power * LT.bicycle.power; vz = K.shotLiftMin; }
      b.kick(p, Math.cos(ang) * spd, Math.sin(ang) * spd, vz);
      if (ft) b.z = Math.max(b.z, ft.z);   // vô-lê / đánh đầu: bóng đi từ độ cao lúc chạm
      b.kind = 'shot';
      if (style === 'finesse' || style === 'trivela') { b.curve = curve; b.fx.finesse = true; }
      if (style === 'chip') {
        // thủ môn bị lob (Game.updatePossession): ghi khoảng cách tới vạch vôi của người trông khung lúc bóng rời chân
        const off = {}, lx = g.ownGoal(1 - p.team).x;
        for (const o of g.teams[1 - p.team].players) if (g.inKeeperZone(o)) off[o.id] = Math.abs(o.x - lx);
        b.fx.chip = { off };
      }
      if (p.mstats && !g.opts.training) p.mstats.shots++;
      p.facing = ang;
      p.charging = false; p.charge = 0; p.shotTarget = 0;
      if (ft && ft.kind === 'header') this.headerPose(p);   // đánh đầu: giữ cú bật nhảy (headerJump)
      else this.startAttack(p, ft && ft.kind !== 'ground' ? (ft.kind === 'bicycle' ? 'volley' : ft.kind) : 'shoot'); // tư thế vung chân sút (kick.poseTime) / vô-lê
      // GOAT PATH: kỹ thuật LEGEND vừa ra -> diễn riêng (src/systems/legends.js techFx, hình render/legenddraw.js)
      if (SFC.Legends && p.legend) {
        const tk = ft && ft.kind === 'bicycle' ? 'bicycle' : style, L = SFC.Legends.def(p);
        if (tk && L && L.tech === tk) { SFC.Legends.techFx(g, p, tk); b.legTech = tk; }
      }
      g.cores.dispatch(p.team, 'onShoot', p, b, held);
      if (held >= g.cores.chargedThreshold(p)) g.cores.chargedShot(p, b, held);
      p.volley = false;
      p.recvT = -1;
      if (ft) {
        // bóng bị đổi hướng gắt: thủ môn phải dịch người -> khó bắt hơn; đánh đầu chúc xuống nảy lên: khó bắt thêm
        const turn = Math.abs(U.angleDiff(Math.atan2(ft.vy, ft.vx), ang)) * 180 / Math.PI;
        if (ft.spd > 40) b.gkMod += F.redirectGk * U.clamp((turn - F.redirectMin) / (F.redirectMax - F.redirectMin), 0, 1);
        if (ft.kind === 'header') b.gkMod += F.header.gk;
      }
      this.readShot(g, p);
      g.effects.burst(b.x, b.y, 2 + (ft ? ft.z : 0), '#ffffff', 5 + Math.round(c * 6), 80);
      g.effects.shake(G().fx.shakeShot * c);
      g.sfx(ft && ft.kind === 'header' ? 'header' : 'kick', c);
      // sút mạnh: người sút + bóng khựng một nhịp (bóng "dính" chân) rồi mới bay; vô-lê / đánh đầu luôn khựng nhẹ
      const HS = G().fx.hitStop;
      const stop = Math.max(HS && HS.shot > 0 && c >= HS.shotMin ? HS.shot : 0, ft && ft.kind !== 'ground' ? F.hitStop : 0);
      if (stop > 0) { p.freeze(stop); b.freezeT = stop; }
    },

    // SÚT GIẢ (game.technique.fake): huỷ cú sút / chuyền bổng đang nạp, diễn 3 nhịp: gồng (đứng, bóng dưới chân) -> vung chân không chạm
    // bóng (đối thủ AI phía trước khựng lại, thủ môn AI có thể đổ người theo hướng giả — Elo thấp dễ bị lừa hơn) -> lướt nhẹ một đoạn
    // dắt bóng theo. Người chơi đối thủ chỉ thấy động tác — tự đọc
    fakeShot(g, p, dx = 0, dy = 0) {
      const b = g.ball, FK = G().technique.fake;
      if (b.owner !== p || p.noActT > 0 || p.fakeCd > 0 || p.state !== 'normal') return false;
      p.fakeCd = FK.cooldown + FK.windup + FK.swing + FK.glideTime;
      p.charging = false; p.charge = 0; p.shotTarget = 0; p.shotStyle = null;
      p.shotHold = true;   // phím sút còn giữ: phải thả ra rồi bấm lại mới nạp cú sút mới (không tự bắn khi thả)
      p.cancelPass();
      // hướng lướt: theo phím đang giữ; không giữ -> bước ngang (vuông góc hướng mặt) né người đứng gần nhất
      let glide = Math.hypot(dx, dy) > 0.2 ? U.norm(dx, dy) : null;
      if (!glide) {
        const fv0 = facingVec(p), near = g.teams[1 - p.team].players.reduce((m, o) => (!m || U.dist(o, p) < U.dist(m, p) ? o : m), null);
        const s = near && ((near.x - p.x) * -fv0.y + (near.y - p.y) * fv0.x) > 0 ? -1 : 1;
        glide = { x: -fv0.y * s, y: fv0.x * s };
      }
      // nhịp 1: gồng (đứng chôn chân, giữ nguyên hướng đang nhắm)
      p.state = 'recover'; p.stateT = FK.windup + FK.swing;
      p.vx = p.vy = 0;
      g.later(FK.windup, () => {
        if (g.state !== 'play' || b.owner !== p || p.state === 'stun') return;
        // nhịp 2: vung chân như sút thật (không chạm bóng)
        this.startAttack(p, 'shoot');
        g.sfx('kickSwing');
        g.effects.pop(p.x, p.y - 30, 'FAKE!', 'info', '#ffffff');
        this.fakeBite(g, p, dy);
        g.later(FK.swing, () => {
          if (g.state !== 'play' || b.owner !== p || p.state === 'stun') return;
          // nhịp 3: lướt nhẹ dắt bóng (như skill move nhưng ngắn + chậm, không miễn đòn, không tốn hồi skill)
          p.state = 'dash'; p.stateT = FK.glideTime;
          p.dashX = glide.x * FK.glideSpeed; p.dashY = glide.y * FK.glideSpeed;
          p.facing = Math.atan2(glide.y, glide.x);
          p.trailLife = 0.25;
          g.effects.afterimage(p, p.trailLife);
          p.trailLeft = 1; p.trailT = FK.glideTime / 2;
          g.sfx('whoosh');
        });
      });
      return true;
    },
    // đối thủ AI phía trước người sút giả cắn câu (lúc vung chân)
    fakeBite(g, p, dy) {
      const FK = G().technique.fake;
      const fv = facingVec(p), opp = g.teams[1 - p.team], aimY = g.field.cy + U.clamp(dy || U.rand(-1, 1), -1, 1) * (g.field.goalWidth / 2 - 6);
      for (const o of opp.players) {
        if (o.state !== 'normal' || (o.isControlled && g.isHuman(o.team)) || (o.ai.fakeImmT || 0) > g.time) continue;
        const ox = o.x - p.x, oy = o.y - p.y, d = Math.hypot(ox, oy);
        const gk = g.inKeeperZone(o);
        if (!gk && (d > FK.range || (ox * fv.x + oy * fv.y) / (d || 1) < 0.2)) continue;
        o.ai.fakeImmT = g.time + FK.immune;
        const prof = g.aiProfile(o.team);
        if (gk) {
          // thủ môn: cắn câu thì đổ người về phía cú sút giả
          if (Math.random() < FK.biteBase - prof.shotAccuracy * FK.biteAcc) this.dive(g, o, aimY - o.y);
          continue;
        }
        o.ai.fakedT = FK.freeze;
        o.facing = Math.atan2(p.y - o.y, p.x - o.x);
      }
      return true;
    },

    // Phất bóng lên trời (thủ môn AI, ai.gkPunt): bóng vọt cao, rơi ở (tx, ty) ± kick.puntError thành bóng lỏng.
    // Lực ngang tính ngược từ thời gian bay + airDrag để rơi đúng chỗ
    punt(g, p, tx, ty) {
      const b = g.ball, K = G().kick, B = G().ball;
      if (b.owner !== p || p.noActT > 0) return false;
      const e = U.rand(0, K.puntError), ea = U.rand(0, Math.PI * 2);
      tx += Math.cos(ea) * e; ty += Math.sin(ea) * e;
      const T = 2 * K.puntLift / B.gravity, k = B.airDrag;
      const d = Math.hypot(tx - p.x, ty - p.y), n = U.norm(tx - p.x, ty - p.y);
      const spd = d * k / (1 - Math.exp(-k * T));
      b.kick(p, n.x * spd, n.y * spd, K.puntLift);
      b.kind = 'clear';
      p.facing = Math.atan2(n.y, n.x);
      p.charging = false; p.charge = 0;
      p.cancelPass();
      this.startAttack(p, 'shoot');
      g.effects.burst(b.x, b.y, 2, '#ffffff', 8, 80);
      g.effects.shake(G().fx.shakeShot);
      g.sfx('kick', 0.9);
      return true;
    },

    // Phá bóng: bóng bổng, mạnh, luôn về phía trước — ↑/↓ chỉ chỉnh góc (không phá ngược về khung thành nhà)
    clearance(g, p, dy) {
      const b = g.ball, K = G().kick;
      if (b.owner !== p || p.noActT > 0) return;
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
      if (o.tackleImmune > 0) { g.effects.pop(o.x, o.y - 30, 'DODGE!', 'good', '#3ff6ff'); g.cores.dodge(o); return true; }
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
      if (p.cd.light > 0 || p.state !== 'normal' || p.airZ > 0 || p.noActT > 0) return false;
      // đấm dồn (light.chain): ra đòn ngay khi vừa hồi chiêu xong -> thêm nấc, hồi chiêu lần này dài hơn
      const CH = L.chain, n = CH && g.time - p.punchReady < CH.window ? Math.min(CH.max, p.punchN + 1) : 0;
      p.punchN = n;
      // Phản Đòn sau khi né -> gần như không hồi chiêu
      p.cd.light = p.counterT > g.time ? 0.15 : this.cooldown(g, p, 'light', (L.cooldown + (CH ? n * CH.add : 0)) * g.cores.mod(p.team, 'lightCooldown', p));
      p.punchReady = g.time + p.cd.light;
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
      const punchStop = (G().fx.hitStop || {}).punch || 0;
      const weak = !big && p.inj && SFC.Hurt ? SFC.Hurt.weak(g, p) : false;   // GOAT PATH: đau cổ tay -> cú đấm xịt
      for (const o of this.inFront(g, p, range, big ? 100 : L.arc, C.has(p, 'juggle'))) {
        if (this.dodged(g, o)) continue;
        if (o.legend && SFC.Legends && SFC.Legends.parry(g, o, p)) continue;   // GOAT PATH: BRUISER RUN giật chỏ đúng lúc -> người đấm văng ngược
        hit = true;
        if (g.mod && SFC.MatchMods.shrug(g, p, o)) continue;   // luật trận khổng lồ (FOOTBALL STORY): đấm nhẹ không tác dụng
        const d = U.norm(o.x - p.x, o.y - p.y);
        if (weak) {
          // cú đấm xịt: chỉ đẩy nhẹ, không choáng, không làm rơi bóng (bụi xám thay tia lửa)
          const wk = SFC_CONFIG.run.hurt.weak.knock;
          o.hit({ stun: 0, kbx: d.x * kb * wk, kby: d.y * kb * wk, source: p, type: 'light' });
          g.effects.burst((p.x + o.x) / 2, (p.y + o.y) / 2, 6, '#c7ccd6', 5, 40, 0.3);
          continue;
        }
        o.freeze(punchStop);   // người trúng đòn khựng (cả khi trụ được bóng)
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
        // vừa giành bóng (light.stealGuard): cú đấm thường chỉ đẩy lùi
        if (o.hasBall && !(sure || upper) && o.guardT > g.time) {
          o.hit({ stun: 0, kbx: d.x * kb * 0.6, kby: d.y * kb * 0.6, source: p, type: 'light' });
          g.effects.pop(o.x, o.y - 30, 'HOLD', 'info', '#9aa3b5');
          continue;
        }
        if (o.hasBall) {
          let chance = L.stealChance * (p.stats.tackle / (o.stats.dribble * C.mod(o, 'dribble'))) * C.pmod(p, 'tackleChance');   // gồm Kiểm Soát Bóng của người bị đấm
          if (!p.isControlled) chance *= g.aiProfile(p.team).tackleMult;
          if (sure || upper) chance = 1;
          if (Math.random() >= chance) {
            // người cầm bóng trụ được: chỉ bị đẩy lùi
            o.hit({ stun: 0, kbx: d.x * kb * 0.6, kby: d.y * kb * 0.6, source: p, type: 'light' });
            g.effects.pop(o.x, o.y - 30, 'HOLD', 'info', '#9aa3b5');
            continue;
          }
          // Xe Ủi / Hoá Khổng Lồ: không rời bóng
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
        if (!C.has(p, 'street_fighter') && !big && !upper) g.effects.pop(o.x, o.y - 30, 'POW!', 'light', '#ffcf3f');
      }
      if (counter) p.counterT = 0;
      p.lastPunch = null;
      if (hit) { g.sfx('punch'); g.effects.shake(G().fx.shakeHit * 0.6); p.freeze(punchStop); }
      // đấm hụt (light.whiff): hồi chiêu thêm + khựng lâu hơn
      const W = !hit && L.whiff;
      if (W) { p.cd.light += W.cooldown; p.punchReady += W.cooldown; }
      p.state = 'recover'; p.stateT = W ? W.recover : L.recover;
    },

    /* ---------- A — HARD ATTACK: gồng co chân rồi vung chân đá ---------- */
    hardAttack(g, p) {
      const H = G().combat.hard;
      if (p.cd.hard > 0 || p.state !== 'normal' || p.noActT > 0) return false;
      p.cd.hard = this.cooldown(g, p, 'hard', H.cooldown * g.cores.pmod(p, 'hardCooldown'));
      p.state = 'windup'; p.stateT = H.windup * g.cores.mod(p.team, 'hardWindup', p);   // Giày Sắt: gồng nhanh hơn
      this.startAttack(p, 'hard');
      p.charging = false;
      g.effects.pop(p.x, p.y - 30, '!', 'status', '#ff3d5a');
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
      // Phi Cước: đá khi đang chạy nước rút -> bay xa + hất xa hơn (đang TOÉ ĐIỆN: xa hơn nữa)
      p.flyMul = 1;
      if (C.has(p, 'flying_kick') && (p.sprinting || p.previewSurge)) {
        const FK = C.sp('flying_kick', p);
        p.flyMul = p.surge ? FK.surgeFly : FK.fly;
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
        if (o.legend && SFC.Legends && SFC.Legends.parry(g, o, p)) continue;   // GOAT PATH: BRUISER RUN giật chỏ đúng lúc -> người đá văng ngược
        p.hardLanded = true;
        // hướng văng: giữa hướng chân đá và hướng từ người đá tới nạn nhân
        const to = U.norm(o.x - p.x, o.y - p.y);
        const d = U.norm(to.x + fv.x, to.y + fv.y);
        const had = o.hasBall && !g.cores.unstealable(o);
        if (had) {
          // bóng văng lệch sang một bên so với hướng người bị đá bay (hard.ballAngle), không bay cùng người
          const [a0, a1] = H.ballAngle;
          const ang = Math.atan2(d.y, d.x) + (Math.random() < 0.5 ? -1 : 1) * U.rand(a0, a1) * Math.PI / 180;
          g.looseBall(o, Math.cos(ang), Math.sin(ang), H.ballKick * 0.7);
        }
        if (o.hit({ stun: H.stun, kbx: d.x * kb, kby: d.y * kb, launch: H.launch * g.cores.pmod(p, 'launch') * Math.sqrt(fly), source: p, type: 'hard' })) {
          g.cores.hardHit(p, o);
          g.effects.pop(o.x, o.y - 30, 'SMASH!', 'heavy', '#ff3d5a');
          g.effects.burst(o.x, o.y, 10, '#ffffff', 10, 140, 0.4);
          g.effects.burst(o.x, o.y, 10, '#ff6a3d', 8, 110, 0.5);
          g.effects.flash(0.25);
          g.effects.shake(G().fx.shakeHit * 2.2, 0.3);
          // hitstop cục bộ: người đá + người bị đá khựng lại rồi mới bay đi
          const hs = (G().fx.hitStop || {}).smash || 0;
          o.freeze(hs); p.freeze(hs);
        }
        if (had) { g.cores.dispatch(p.team, 'onTackleWin', p, o); g.cores.steal(p); }
      }
    },

    // hết vung chân: trượt thì khựng lâu hơn (bị phản đòn)
    hardEnd(g, p) {
      const H = G().combat.hard;
      p.state = 'recover';
      p.stateT = p.hardLanded ? H.recover : H.whiffRecover;
      if (!p.hardLanded) g.effects.pop(p.x, p.y - 30, 'MISS', 'info', '#9aa3b5');
      p.hardLanded = false;
    },

    skill(g, p, dx, dy) {
      const S = G().skill;
      if (p.state !== 'normal' || p.airZ > 0 || p.noActT > 0) return false;
      if (p.cd.skill > 0) return false;
      let d;
      if (Math.hypot(dx, dy) > 0.2) d = U.norm(dx, dy);
      else {
        const fv = facingVec(p);
        const s = U.randSign();
        d = p.hasBall ? U.norm(fv.x - fv.y * s, fv.y + fv.x * s) : fv;
      }
      const C = g.cores;
      // Bộ Pháp Ninja (mods)
      p.cd.skill = this.cooldown(g, p, 'skill', S.cooldown * C.mod(p.team, 'skillCooldown', p));
      p.state = 'dash'; p.stateT = S.dashTime;
      if (p.atkType === 'diveU' || p.atkType === 'diveD') p.atkType = null;   // lướt ngay sau khi đổ người: bỏ tư thế nằm
      p.dashX = d.x * S.dashSpeed; p.dashY = d.y * S.dashSpeed;
      // Bộ Pháp Ninja: né lâu hơn
      p.tackleImmune = S.tackleImmune + (C.has(p, 'quick_feet') ? C.sp('quick_feet', p).dodgeBonus : 0);
      p.charging = false;
      p.facing = Math.atan2(d.y, d.x);
      // bóng mờ đầu tiên ở điểm xuất phát, các bóng còn lại rải đều dọc đường lướt (Player.update, state dash)
      p.trailLife = 0.3;
      g.effects.afterimage(p, p.trailLife);
      p.trailLeft = Math.max(0, (S.afterimages || 1) - 1);
      p.trailT = S.dashTime / (S.afterimages || 1);
      g.sfx('whoosh');
      g.cores.dispatch(p.team, 'onSkillMove', p, d);
      return true;
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
        fx.pop(ox, oy, off < 0 ? 'TOO EARLY' : 'TOO LATE', 'info', '#9aa3b5');
        fx.shield(p.x, p.y - 4, 10, '#9aa3b5', 0.4, 1);
        return;
      }
      b.read = { pid: p.id, grade: gr.id, bonus: gr.bonus + R.posBonus * pos, noStretch: !!gr.noStretch };
      // GOAT PATH (LEGEND Neuermann, kỹ thuật SWEEPER SPIN): đọc trúng -> bắt được bóng trong ít giây tới thì xoay người phát động tấn công
      if (p.legend && SFC.Legends && SFC.Legends.tech(g, p, 'sweeper')) p.sweepUntil = g.time + SFC_CONFIG.legends.tuning.sweeper.window;
      if (gr.dive) this.readDive(g, p);
      const x = p.x, y = p.y;
      if (gr.id === 'perfect') {
        g.hitStop(0.06);
        g.slowMo(0.35, 0.35);
        fx.zoom(x, y - 10, 0.18, 0.45);
        fx.speedLines(0.35, x, y - 10, '#ffe14f');
        fx.wave(x, y, 34, '#ffe14f', 0.45, 3);
        fx.pop(ox, oy, 'PERFECT READ!', 'good', '#ffe14f');
      } else if (gr.id === 'great') {
        fx.zoom(x, y - 10, 0.08, 0.3);
        fx.wave(x, y, 26, '#3ff6ff', 0.4, 2);
        fx.pop(ox, oy, 'GREAT READ', 'good', '#3ff6ff');
      } else {
        fx.pop(ox, oy, 'GOOD READ', 'good', '#9dff3d');
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
