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
      Object.assign(this, {
        x, y, z: 0, vx: 0, vy: 0, vz: 0,
        owner: null, lastTouch: null, lastKickTeam: -1,
        passTarget: null, passPoint: null, kind: null, roll: 0, trailT: 0,
        netSide: 0, shieldChecked: false,
      });
      this.noPickup.clear();
      this.trail.length = 0;
      this.clearFx();
    }

    clearFx() {
      this.fx = {};          // fire / thunder
      this.curve = 0;        // rad/s
      this.pierce = 0;
      this.homing = null;    // {x, y, strength}
      this.frictionMult = 1;
    }

    get speed() { return Math.hypot(this.vx, this.vy); }

    setOwner(p) {
      this.owner = p;
      this.lastTouch = p;
      this.vx = this.vy = this.vz = 0;
      this.z = 0;
      this.passTarget = null;
      this.passPoint = null;
      this.kind = null;
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
      this.kind = null;
      this.shieldChecked = false;
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

      if (this.owner) { this.follow(dt); this.trail.length = 0; return; }

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
      this.vz -= C.gravity * dt;
      this.z += this.vz * dt;
      if (this.z <= 0) {
        this.z = 0;
        if (this.vz < -50) {
          this.vz = -this.vz * C.bounce;
          this.vx *= 0.78; this.vy *= 0.78;
        } else this.vz = 0;
      }

      const k = (this.z > 0.5 ? C.airDrag : C.groundFriction) * this.frictionMult;
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
    }

    // bóng dính chân người giữ bóng
    follow(dt) {
      const p = this.owner, f = this.g.field;
      const off = SFC_CONFIG.game.ball.dribbleOffset;
      const spd = Math.hypot(p.vx, p.vy);
      const pulse = spd > 20 ? Math.abs(Math.sin(p.anim * 10)) * 2 : 0;
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

        if (!inMouth) { this.bounceSide(lineX, side); continue; }

        // đang đi vào khung thành -> kiểm tra khiên (Aegis Wall)
        if (!this.shieldChecked && this.vx * side > 0) {
          this.shieldChecked = true;
          if (this.g.cores.goalLine(this, defTeam)) { this.bounceSide(lineX, side); continue; }
        }
        if (centerIn) { this.netSide = side; this.constrainNet(side, lineX); }
      }
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
      if (this.speed > 120) {
        this.g.sfx('wall');
        this.g.effects.burst(this.x, this.y, this.z, '#d8d0c0', 3, 40);
      }
      this.shieldChecked = false;
    }
  }

  SFC.Ball = Ball;
})();
