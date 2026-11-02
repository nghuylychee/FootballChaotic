/* Ball — vật lý 2.5D (x, y trên sân + z chiều cao) */
window.SFC = window.SFC || {};

(function () {
  const U = SFC.U;

  class Ball {
    constructor(game) {
      this.g = game;
      this.r = SFC_CONFIG.game.ball.radius;
      this.noPickup = new Map(); // playerId -> giây không được nhặt bóng
      this.trail = [];
      this.reset(0, 0);
    }

    reset(x, y) {
      this.r = SFC_CONFIG.game.ball.radius;   // Boulder Shot phóng to bóng -> giao bóng trả về cỡ thường
      Object.assign(this, {
        x, y, z: 0, vx: 0, vy: 0, vz: 0,
        owner: null, lastTouch: null, lastKickTeam: -1,
        passTarget: null, passPoint: null, sloppy: false, lob: false, kind: null, roll: 0, trailT: 0, skin: null,
        netSide: 0, shieldChecked: false, woodT: 0, read: null, freezeT: 0, missT: 0, cross: false, kickN: 0, endBounce: false,
      });
      this.noPickup.clear();
      this.trail.length = 0;
      this.clearFx();
    }

    clearFx() {
      this.fx = {};          // fire / thunder + cờ hình của Core: string (Nhạc Trưởng), spiral (Xoáy Rồng), laser (Mắt Thiện Xạ)
      this.curve = 0;        // rad/s
      this.pierce = 0;
      this.homing = null;    // {x, y, strength}
      this.frictionMult = 1;
      this.gkMod = 0;        // trừ tỉ lệ bắt bóng của thủ môn (Giao Hưởng, Bóng Ma, Sao Băng...)
      this.knuckle = null;   // KNUCKLEBALL (LEGEND, Actions.shoot): { t, T, t1, t2, peak, g1, g3, sx, hx, sz, hz, ox, oz } — xem knuckleStep
    }

    get speed() { return Math.hypot(this.vx, this.vy); }

    // cú sút giữ tốc độ (ball.shotFriction) tới khi dội vạch cuối sân / có người chạm (setOwner, deflect xoá kind)
    shotFm() { return this.kind === 'shot' && !this.endBounce ? SFC_CONFIG.game.ball.shotFriction || 1 : 1; }
    // đường chuyền sệt / chọc khe có người nhận giữ tốc độ (pass.friction) tới khi bóng đi qua điểm nhận (passPoint) / có người chạm
    passFm() { return this.keepPace && this.passPoint && this.kind === 'pass' ? SFC_CONFIG.game.pass.friction || 1 : 1; }

    setOwner(p) {
      this.owner = p;
      this.lastTouch = p;
      this.legTech = null;
      this.vx = this.vy = this.vz = 0;
      this.z = 0;
      this.passTarget = null;
      this.passPoint = null;
      this.sloppy = false;
      this.lob = false;
      this.kind = null;
      this.skin = null;
      this.read = null;
      this.cross = false;
      this.endBounce = false;
      this.oneTouch = false;
      this.keepPace = false;
      this.through = false;
      this.clearFx();
    }

    kick(p, vx, vy, vz) {
      this.owner = null;
      this.vx = vx; this.vy = vy; this.vz = vz || 0;
      this.z = Math.max(this.z, 0.5);
      this.lastTouch = p;
      this.lastKickTeam = p ? p.team : -1;
      if (p) this.noPickup.set(p.id, SFC_CONFIG.game.ball.selfPickupDelay);
      this.passTarget = null;
      this.passPoint = null;
      this.sloppy = false;
      this.lob = false;       // chuyền bổng (A) — thủ môn đối phương bắt như cú sút (Game.tryControl)
      this.kind = null;
      this.read = null;       // Đọc Cú Sút: {pid, grade, bonus} của thủ môn đã đọc cú sút này
      this.shieldChecked = false;
      this.freezeT = 0;
      this.cross = false;     // tạt cánh (game.firstTime.cross) — passTo bật lại sau khi đá
      this.legTech = null;    // kỹ thuật LEGEND của cú đá này (power / knuckle / finesse / bicycle / lobthrough) — LEGEND TRIAL đếm (drills.js)
      this.oneTouch = false;  // đường chuyền 1 chạm (pass.oneTouch) — passTo bật lại sau khi đá
      this.endBounce = false; // đã dội vạch cuối sân (bounceSide) -> hết ma sát riêng của cú sút (ball.shotFriction)
      this.keepPace = false;  // đường chuyền giữ tốc độ (pass.friction) — passTo bật, bóng qua điểm nhận thì tắt
      this.through = false;   // chọc khe có người nhận (passTo): người nhận chạy thẳng tới điểm nhận
      this.flightT = 0;       // (s) bóng đã bay bao lâu từ lần chạm cuối — thủ môn cần thời gian phản xạ (player.gkReflex, Game.tryControl)
      this.kickN++;           // số lần đá: AI quyết định dứt điểm 1 chạm 1 lần cho mỗi quả bóng · AI thủ môn đọc mỗi cú sút 1 lần (ai.keeper)
      this.clearFx();
    }

    rotate(a) {
      const c = Math.cos(a), s = Math.sin(a);
      const vx = this.vx * c - this.vy * s;
      this.vy = this.vx * s + this.vy * c;
      this.vx = vx;
    }

    update(dt) {
      const C = SFC_CONFIG.game.ball;
      for (const [k, v] of this.noPickup) {
        if (v - dt <= 0) this.noPickup.delete(k); else this.noPickup.set(k, v - dt);
      }
      this.woodT = Math.max(0, this.woodT - dt);
      this.missT = Math.max(0, this.missT - dt);

      if (this.owner) { this.freezeT = 0; this.follow(dt); this.trail.length = 0; return; }
      this.pushId = null;   // bóng rời chân: lần cầm sau bóng lấy đà sút mạnh (follow) bắt đầu từ 0
      this.flightT = (this.flightT || 0) + dt;
      // hitstop cục bộ của cú sút mạnh (fx.hitStop.shot): bóng nằm yên ở chân một nhịp rồi mới bay
      if (this.freezeT > 0) { this.freezeT -= dt; return; }

      const spd = this.speed;
      if (this.curve && spd > 60) this.rotate(this.curve * dt);
      if (this.homing && spd > 80) {
        const h = this.homing;
        const want = Math.atan2(h.y - this.y, h.x - this.x);
        const cur = Math.atan2(this.vy, this.vx);
        const d = U.angleDiff(cur, want);
        if (Math.abs(d) < 1.6) this.rotate(U.clamp(d, -h.strength * dt, h.strength * dt));
      }

      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.vz -= (this.knuckle ? this.knuckleStep(dt) : C.gravity) * dt;
      this.z += this.vz * dt;
      if (this.z <= 0) {
        this.z = 0;
        if (this.vz < -50) {
          this.g.sfx('bounce', Math.min(1, -this.vz / 300));   // rơi càng mạnh tiếng càng to
          this.vz = -this.vz * C.bounce;
          const kb = this.shotFm() < 1 ? C.shotBounceKeep : 0.78;   // bóng sút nảy đất ít mất tốc độ hơn
          this.vx *= kb; this.vy *= kb;
        } else this.vz = 0;
      }

      // bóng chuyền đã đi qua điểm nhận mà chưa ai chạm: hết giữ tốc độ, lăn chậm dần như bóng thường
      if (this.keepPace && this.passPoint && (this.passPoint.x - this.x) * this.vx + (this.passPoint.y - this.y) * this.vy <= 0) this.keepPace = false;
      const k = (this.z > C.airDragMinZ ? C.airDrag : C.groundFriction) * this.frictionMult * this.shotFm() * this.passFm();
      this.vx = U.damp(this.vx, k, dt);
      this.vy = U.damp(this.vy, k, dt);
      if (this.z === 0 && this.speed < 4) { this.vx = this.vy = 0; }
      this.roll += this.speed * dt;

      this.collideWalls();

      this.trail.unshift({ x: this.x, y: this.y, z: this.z });
      if (this.trail.length > C.trailLength) this.trail.pop();

      // vệt lửa (Fire Shot)
      if (this.fx.fire && this.speed > 70 && this.z < 14) {
        this.trailT -= dt;
        if (this.trailT <= 0) {
          this.trailT = this.fx.fire.interval;
          this.g.effects.fire(this.x, this.y, this.fx.fire);
        }
      }
      if (this.z === 0 && this.speed < 60 && (this.fx.fire || this.fx.thunder)) this.clearFx();
      else if (this.speed < 40) { delete this.fx.string; delete this.fx.spiral; delete this.fx.laser; delete this.fx.duo; delete this.fx.ghost; }
    }

    // KNUCKLEBALL (config/legends.config.js tuning.knuckle): bóng không xoáy, 3 đoạn: tới t1 vọt lên bằng trọng lực g1 (vừa tới đỉnh peak)
    // -> t1..t2 lơ lửng (không trọng lực, giữ ở đỉnh) -> sau t2 cắm xuống bằng trọng lực g3 (gắt). Từ lúc bay tới t2 lượn theo trục X (dọc
    // sân) và trục Z (độ cao): dời vị trí, biên độ to dần rồi về 0 đúng lúc t2 -> đường bóng tới khung vẫn như đã nhắm; không lượn theo
    // trục Y. Trả về trọng lực bước này. Chạm đất / dội tường / quá giờ: về bóng thường
    knuckleStep(dt) {
      const N = this.knuckle, t0 = N.t;
      N.t += dt;
      const k = N.t / N.t2, env = k < 1 ? Math.sin(k * Math.PI) : 0, w = N.t * Math.PI * 2;
      const ox = N.sx * env * Math.sin(w * N.hx), oz = N.sz * env * Math.sin(w * N.hz + 1.3);
      this.x += ox - N.ox; this.z += oz - N.oz;
      N.ox = ox; N.oz = oz;
      // đổi đoạn: bỏ vận tốc dọc dư (sai số tích phân) -> lơ lửng đúng đỉnh, cắm xuống từ đứng yên
      if (t0 < N.t1 && N.t >= N.t1) { this.vz = 0; this.z = N.peak + oz; }
      if (t0 < N.t2 && N.t >= N.t2) this.vz = 0;
      const g = N.t < N.t1 ? N.g1 : N.t < N.t2 ? 0 : N.g3;
      if (N.t > N.T + 0.4 || (this.z <= 0 && N.t > 0.1)) this.knuckle = null;
      return g;
    }

    // bóng dính chân người giữ bóng
    follow(dt) {
      const p = this.owner, f = this.g.field;
      // người chơi đang chạy lấy đà sút mạnh (Actions.powerPushes): bóng ra xa chân thêm kick.powerPush px, ra / về mượt (powerPushK); đổi người cầm thì về 0
      const K = SFC_CONFIG.game.kick, want = SFC.Actions.powerPushes(this.g, p) ? K.powerPush : 0;
      if (this.pushId !== p.id) { this.pushId = p.id; this.pushGap = 0; }
      this.pushGap += (want - this.pushGap) * (1 - Math.exp(-K.powerPushK * dt));
      const push = this.pushGap, off = SFC_CONFIG.game.ball.dribbleOffset + push;
      const spd = Math.hypot(p.vx, p.vy);
      const pulse = spd > 20 && !(push > 0.5) ? Math.abs(Math.sin(p.anim * 10)) * 2 : 0;
      const cx = Math.cos(p.facing), cy = Math.sin(p.facing);
      this.x = U.clamp(p.x + cx * (off + pulse), f.x + this.r, f.x + f.w - this.r);
      this.y = U.clamp(p.y + cy * (off + pulse) * 0.85 + 1, f.y + this.r, f.y + f.h - this.r);
      this.z = 0;
      this.roll += spd * dt;
    }

    bounceSide(lineX, side) {
      const C = SFC_CONFIG.game.ball;
      this.x = lineX - side * this.r;
      this.vx = -side * Math.abs(this.vx) * C.wallBounce;
      this.endBounce = true;
      this.onWall();
    }

    collideWalls() {
      const f = this.g.field, r = this.r, C = SFC_CONFIG.game.ball;

      // tường trên / dưới
      if (this.y - r < f.y) {
        if (!this.g.cores.wallHit(this, 'top')) { this.y = f.y + r; this.vy = Math.abs(this.vy) * C.wallBounce; this.onWall(); }
      } else if (this.y + r > f.y + f.h) {
        if (!this.g.cores.wallHit(this, 'bottom')) { this.y = f.y + f.h - r; this.vy = -Math.abs(this.vy) * C.wallBounce; this.onWall(); }
      }

      // tường trái / phải + khung thành
      const inMouth = this.y > f.gTop && this.y < f.gBot && this.z < f.goalHeight;
      for (const side of [-1, 1]) {
        const lineX = side < 0 ? f.x : f.x + f.w;
        const defTeam = side < 0 ? 0 : 1;
        const touching = side < 0 ? this.x - r < lineX : this.x + r > lineX;
        const centerIn = side < 0 ? this.x < lineX : this.x > lineX;

        if (this.netSide === side) {
          if (!centerIn) { this.netSide = 0; continue; }
          this.constrainNet(side, lineX);
          continue;
        }
        if (!touching) continue;
        this.checkWoodwork(side);

        if (!inMouth) { this.checkNearMiss(side); this.bounceSide(lineX, side); continue; }

        // đang đi vào khung thành -> kiểm tra khiên (Aegis Wall)
        if (!this.shieldChecked && this.vx * side > 0) {
          this.shieldChecked = true;
          if (this.g.cores.goalLine(this, defTeam)) { this.bounceSide(lineX, side); continue; }
        }
        // luật trận FOOTBALL STORY: khung đang bị khoá (KING LEO 1976 đang cast) -> dội ra như chạm tường
        if (this.g.mod && this.vx * side > 0 && SFC.MatchMods.sealed(this.g, defTeam, this)) { this.bounceSide(lineX, side); continue; }
        if (centerIn) { this.netSide = side; this.constrainNet(side, lineX); }
      }
    }

    // bóng chạm cột dọc / xà ngang khi tới vạch vôi -> chữ WOODWORK (chỉ hiển thị, đường bóng giữ nguyên)
    checkWoodwork(side) {
      const f = this.g.field, r = this.r;
      if (this.woodT > 0 || this.vx * side <= 0 || this.speed < 60) return;
      const post = Math.min(Math.abs(this.y - f.gTop), Math.abs(this.y - f.gBot)) <= r + 1 && this.z < f.goalHeight + r;
      const bar = this.y > f.gTop && this.y < f.gBot && Math.abs(this.z - f.goalHeight) <= r;
      if (!post && !bar) return;
      this.woodT = 0.6;
      this.g.effects.pop(this.x - side * 28, this.y - this.z - 12, 'WOODWORK', 'info', '#ffe14f');
      this.g.sfx('clang');
    }

    // cú sút đi ra ngoài sát cột dọc / sát xà (ball.nearMiss px) -> khán giả "ồồ" (không chữ). Chạm cột đã có WOODWORK
    checkNearMiss(side) {
      const f = this.g.field, N = SFC_CONFIG.game.ball.nearMiss;
      if (!N || this.kind !== 'shot' || this.woodT > 0 || this.missT > 0 || this.vx * side <= 0) return;
      const out = this.y < f.gTop ? f.gTop - this.y : this.y > f.gBot ? this.y - f.gBot : 0;
      const near = out > 0 ? out <= N && this.z < f.goalHeight + N : this.z - f.goalHeight <= N;
      if (!near) return;
      this.missT = 1;
      this.g.sfx('nearMiss');
    }

    constrainNet(side, lineX) {
      const f = this.g.field, r = this.r, C = SFC_CONFIG.game.ball;
      const back = lineX + side * (f.goalDepth - r);
      if (side < 0 ? this.x < back : this.x > back) { this.x = back; this.vx = -this.vx * C.netDamp; }
      if (this.y - r < f.gTop) { this.y = f.gTop + r; this.vy = Math.abs(this.vy) * C.netDamp; }
      if (this.y + r > f.gBot) { this.y = f.gBot - r; this.vy = -Math.abs(this.vy) * C.netDamp; }
      if (this.z > f.goalHeight - r) { this.z = f.goalHeight - r; this.vz = -Math.abs(this.vz) * 0.3; }
    }

    onWall() {
      this.knuckle = null;
      if (this.speed > 120) {
        this.g.sfx('wall');
        this.g.effects.burst(this.x, this.y, this.z, '#d8d0c0', 3, 40);
      }
      this.shieldChecked = false;
    }
  }

  SFC.Ball = Ball;
})();
