/* Player — di chuyển, trạng thái (normal/stun/jab/windup/kick/dash/recover), nhận đòn
 * jab = Light attack (đấm) đang lấy đà · windup = Hard attack đang gồng co chân · kick = đang vung chân
 * airZ = độ cao khi bị Hard attack hất tung */
window.SFC = window.SFC || {};

(function () {
  const U = SFC.U;

  const ATTACK_STATES = { jab: 1, windup: 1, kick: 1, recover: 1 };

  class Player {
    constructor(game, team, role, idx) {
      const tcfg = team.cfg;
      this.game = game;
      this.team = team.index;
      this.role = role;
      this.idx = idx;
      this.id = team.index * 10 + idx;
      this.name = tcfg.players[idx] || role;
      this.stats = Object.assign({ speed: 1, power: 1, pass: 1, tackle: 1, dribble: 1, accuracy: 1 }, tcfg.stats);
      this.radius = SFC_CONFIG.game.player.radius;

      const skins = SFC_CONFIG.teams.skins;
      this.look = {
        skin: skins[(team.index * 3 + idx * 2) % skins.length],
        hair: tcfg.kit.hair[idx % tcfg.kit.hair.length],
      };

      this.x = 0; this.y = 0; this.vx = 0; this.vy = 0;
      this.kbx = 0; this.kby = 0;
      this.dashX = 0; this.dashY = 0;
      this.facing = team.dir > 0 ? 0 : Math.PI;
      this.state = 'normal';
      this.stateT = 0;
      this.cd = { light: 0, hard: 0, skill: 0 };
      this.hardLanded = false;
      this.atkType = null;    // anim đòn đang ra: light | hard
      this.atkT = 0;          // thời gian từ lúc bắt đầu ra đòn (s)
      this.airZ = 0;          // bị hất tung: độ cao + vận tốc lên
      this.airVz = 0;
      this.stamina = SFC_CONFIG.game.player.staminaMax;
      this.sprinting = false;
      this.charging = false;
      this.charge = 0;
      this.passMode = null;   // đang nạp lực chuyền: ground | through | lob
      this.passCharge = 0;
      this.passKey = null;
      this.passLock = null;   // người nhận đang được chọn
      this.tackleImmune = 0;
      this.keeperHold = 0;    // còn bao lâu được bảo vệ khi ôm bóng trong vòng cấm nhà
      this.hitImmune = 0;
      this.ironCd = 0;
      this.flash = 0;
      this.buffs = [];       // {speed, t}
      this.confused = null;  // {decoy, t}
      this.anim = Math.random() * 10;
      this.intent = { mx: 0, my: 0, sprint: false };
      this.ai = { t: 0, runTo: null, runT: 0, requestedPass: null, holdT: 0, chargeTarget: 0.6, aimY: 0, dir: { x: 0, y: 0 }, sprint: false };
      this.kickHits = new Set();
    }

    get hasBall() { return this.game.ball.owner === this; }
    get isControlled() { return this.game.ctrl[this.team] === this; }
    get teamRef() { return this.game.teams[this.team]; }
    // đang đứng trong vòng cấm nhà -> có cơ chế thủ môn
    get keeper() { return this.game.inKeeperZone(this); }

    maxSpeed() {
      const C = SFC_CONFIG.game, g = this.game, cores = g.cores;
      let s = C.player.speed * this.stats.speed * cores.mod(this.team, 'speed');
      if (this.hasBall) s *= C.player.dribbleSpeedMult * (0.85 + this.stats.dribble * 0.15);
      else s *= cores.mod(this.team, 'offBallSpeed');
      if (this.sprinting) s *= C.player.sprintMult;
      if (this.charging) s *= C.player.chargeMoveMult;
      for (const b of this.buffs) s *= b.speed || 1;
      if (g.finalPush) s *= C.match.finalPushSpeedMult;
      if (!this.isControlled && this.keeper) s *= C.player.gkSpeedMult;
      if (!g.isHuman(this.team) || !this.isControlled) s *= g.aiProfile(this.team).speedMult;
      return s;
    }

    update(dt) {
      const C = SFC_CONFIG.game, g = this.game, f = g.field;
      for (const k in this.cd) this.cd[k] = Math.max(0, this.cd[k] - dt);
      this.tackleImmune = Math.max(0, this.tackleImmune - dt);
      this.keeperHold = Math.max(0, this.keeperHold - dt);
      this.hitImmune = Math.max(0, this.hitImmune - dt);
      this.ironCd = Math.max(0, this.ironCd - dt);
      this.flash = Math.max(0, this.flash - dt);
      if (this.buffs.length) {
        this.buffs.forEach((b) => (b.t -= dt));
        this.buffs = this.buffs.filter((b) => b.t > 0);
      }
      if (this.confused) { this.confused.t -= dt; if (this.confused.t <= 0) this.confused = null; }
      this.anim += dt;
      if (this.atkType) this.atkT += dt;
      const air = this.airZ > 0;
      const kd = air ? C.combat.airDamp : C.combat.knockbackDamp;
      this.kbx = U.damp(this.kbx, kd, dt);
      this.kby = U.damp(this.kby, kd, dt);
      if (air) this.updateAir(dt);

      switch (this.state) {
        case 'stun':
          this.stateT -= dt;
          this.vx = U.damp(this.vx, 8, dt); this.vy = U.damp(this.vy, 8, dt);
          // bị hất tung: còn trên không thì chưa hết choáng
          if (this.stateT <= 0 && this.airZ <= 0) { this.state = 'normal'; this.hitImmune = Math.max(this.hitImmune, C.combat.hitImmuneBonus); }
          break;
        case 'jab':
          this.stateT -= dt;
          this.vx = U.damp(this.vx, 6, dt); this.vy = U.damp(this.vy, 6, dt);
          if (this.stateT <= 0) SFC.Actions.lightHit(g, this);
          break;
        case 'windup': {
          // gồng Hard attack: đứng lại, vẫn xoay được theo hướng phím để nhắm
          this.stateT -= dt;
          this.vx = U.damp(this.vx, 10, dt); this.vy = U.damp(this.vy, 10, dt);
          const { mx, my } = this.intent;
          if (Math.hypot(mx, my) > 0.1) this.turnTo(Math.atan2(my, mx), dt);
          if (this.stateT <= 0) SFC.Actions.hardRelease(g, this);
          break;
        }
        case 'kick':
          this.stateT -= dt;
          this.vx = this.dashX; this.vy = this.dashY;
          SFC.Actions.hardUpdate(g, this);
          if (this.stateT <= 0) SFC.Actions.hardEnd(g, this);
          break;
        case 'dash':
          this.stateT -= dt;
          this.vx = this.dashX; this.vy = this.dashY;
          // lướt (Z): để lại bóng mờ dọc đường (skill.afterimages)
          if (this.trailLeft > 0 && (this.trailT -= dt) <= 0) {
            this.trailLeft--;
            this.trailT += C.skill.dashTime / C.skill.afterimages;
            g.effects.afterimage(this);
          }
          if (this.stateT <= 0) { this.state = 'normal'; this.trailLeft = 0; this.vx *= 0.5; this.vy *= 0.5; }
          break;
        case 'recover':
          this.stateT -= dt;
          this.vx = U.damp(this.vx, 9, dt); this.vy = U.damp(this.vy, 9, dt);
          if (this.stateT <= 0) this.state = 'normal';
          break;
        default:
          this.moveNormal(dt);
      }
      // hết đòn (hoặc bị ngắt) -> dừng anim ra đòn
      if (this.atkType && !ATTACK_STATES[this.state]) this.atkType = null;

      this.x += (this.vx + this.kbx) * dt;
      this.y += (this.vy + this.kby) * dt;

      // giữ trong sân; bị hất văng mạnh vào tường -> bật ngược lại
      const r = this.radius;
      const nx = U.clamp(this.x, f.x + r, f.x + f.w - r);
      const ny = U.clamp(this.y, f.y + r, f.y + f.h - r);
      if ((nx !== this.x && Math.abs(this.kbx) > 120) || (ny !== this.y && Math.abs(this.kby) > 120)) {
        if (nx !== this.x) this.kbx = -this.kbx * C.combat.wallBounce;
        if (ny !== this.y) this.kby = -this.kby * C.combat.wallBounce;
        g.effects.burst(nx, ny, this.airZ + 6, '#d9cbb0', 10, 80);
        g.effects.text(nx, ny - 26, 'BONK!', '#ffffff');
        g.effects.shake(SFC_CONFIG.game.fx.shakeHit * 1.5);
        g.sfx('hit');
      }
      this.x = nx;
      this.y = ny;
    }

    // đang bay sau cú đá: rơi theo trọng lực, chạm đất nảy nhẹ + tung bụi
    updateAir(dt) {
      const C = SFC_CONFIG.game.combat, g = this.game;
      this.airVz -= C.airGravity * dt;
      this.airZ += this.airVz * dt;
      if (this.airZ > 0) return;
      this.airZ = 0;
      if (this.airVz < -140) {
        this.airVz = -this.airVz * 0.3;
        this.airZ = 0.01;
        g.effects.burst(this.x, this.y, 0, '#8a7f70', 10, 70);
        g.effects.shake(SFC_CONFIG.game.fx.shakeHit);
        g.sfx('hit');
      } else {
        this.airVz = 0;
        g.effects.burst(this.x, this.y, 0, '#6d6457', 6, 40);
      }
    }

    moveNormal(dt) {
      const C = SFC_CONFIG.game.player;
      let { mx, my } = this.intent;
      const len = Math.hypot(mx, my);
      if (len > 1) { mx /= len; my /= len; }
      const moving = len > 0.1;

      const wantSprint = this.intent.sprint && moving;
      this.sprinting = wantSprint && this.stamina > (this.sprinting ? 0 : C.staminaMinToSprint);
      if (this.sprinting) this.stamina -= C.staminaDrain * dt;
      else this.stamina += C.staminaRegen * this.game.cores.mod(this.team, 'sprintRegen') * dt;
      this.stamina = U.clamp(this.stamina, 0, C.staminaMax);

      const ms = this.maxSpeed();
      const tx = mx * ms, ty = my * ms;
      const dvx = tx - this.vx, dvy = ty - this.vy;
      const dl = Math.hypot(dvx, dvy);
      const a = (moving ? C.accel : C.decel) * dt;
      if (dl <= a) { this.vx = tx; this.vy = ty; }
      else { this.vx += (dvx / dl) * a; this.vy += (dvy / dl) * a; }

      if (moving) this.turnTo(Math.atan2(my, mx), dt);
    }

    cancelPass() {
      this.passMode = null;
      this.passCharge = 0;
      this.passBase = 0;
      this.passKey = null;
      this.passLock = null;
    }

    turnTo(angle, dt) {
      const d = U.angleDiff(this.facing, angle);
      const step = SFC_CONFIG.game.player.turnRate * dt;
      this.facing += U.clamp(d, -step, step);
    }

    /**
     * Nhận đòn. opts: {stun, kbx, kby, source, type}
     * stun = 0 -> chỉ đẩy lùi, không mất bóng.
     */
    hit(opts) {
      const g = this.game;
      const stun = opts.stun || 0;
      if (stun > 0 && (this.hitImmune > 0 || this.state === 'stun')) return false;
      if (stun > 0 && g.cores.blockHit(this, opts)) {
        this.kbx += (opts.kbx || 0) * 0.3; this.kby += (opts.kby || 0) * 0.3;
        return false;
      }
      this.kbx += opts.kbx || 0;
      this.kby += opts.kby || 0;
      if (stun <= 0) return true;

      if (this.hasBall) g.looseBall(this, opts.kbx || U.rand(-1, 1), opts.kby || U.rand(-1, 1));
      if (opts.launch) { this.airVz = opts.launch; this.airZ = Math.max(this.airZ, 0.5); }
      this.state = 'stun';
      this.stateT = stun;
      this.charging = false;
      this.charge = 0;
      this.cancelPass();
      this.flash = 0.12;
      this.hitImmune = stun;
      g.effects.burst(this.x, this.y, 14, '#fff6a0', 6, 60);
      g.effects.shake(SFC_CONFIG.game.fx.shakeHit);
      g.sfx('hit');
      return true;
    }
  }

  SFC.Player = Player;
})();
