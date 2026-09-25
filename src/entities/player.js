/* Player — di chuyển, trạng thái (normal/stun/slide/dash/tackle/recover), nhận đòn */
window.SFC = window.SFC || {};

(function () {
  const U = SFC.U;

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
      this.cd = { tackle: 0, slide: 0, skill: 0, body: 0 };
      this.stamina = SFC_CONFIG.game.player.staminaMax;
      this.sprinting = false;
      this.charging = false;
      this.charge = 0;
      this.passMode = null;   // đang nạp lực chuyền: ground | through | lob
      this.passCharge = 0;
      this.passKey = null;
      this.passLock = null;   // người nhận đang được chọn
      this.tackleImmune = 0;
      this.hitImmune = 0;
      this.ironCd = 0;
      this.flash = 0;
      this.buffs = [];       // {speed, t}
      this.confused = null;  // {decoy, t}
      this.anim = Math.random() * 10;
      this.intent = { mx: 0, my: 0, sprint: false };
      this.ai = { t: 0, runTo: null, runT: 0, requestedPass: null, holdT: 0, chargeTarget: 0.6, aimY: 0, dir: { x: 0, y: 0 }, sprint: false };
      this.slideHits = new Set();
    }

    get hasBall() { return this.game.ball.owner === this; }
    get isControlled() { return this.game.controlled === this; }
    get teamRef() { return this.game.teams[this.team]; }

    maxSpeed() {
      const C = SFC_CONFIG.game, g = this.game, cores = g.cores;
      let s = C.player.speed * this.stats.speed * cores.mod(this.team, 'speed');
      if (this.hasBall) s *= C.player.dribbleSpeedMult * (0.85 + this.stats.dribble * 0.15);
      else s *= cores.mod(this.team, 'offBallSpeed');
      if (this.sprinting) s *= C.player.sprintMult;
      if (this.charging) s *= C.player.chargeMoveMult;
      for (const b of this.buffs) s *= b.speed || 1;
      if (g.finalPush) s *= C.match.finalPushSpeedMult;
      if (this.role === 'GK' && !this.isControlled) s *= C.player.gkSpeedMult;
      if (this.team !== g.humanTeam || !this.isControlled) s *= g.aiProfile(this.team).speedMult;
      return s;
    }

    update(dt) {
      const C = SFC_CONFIG.game, g = this.game, f = g.field;
      for (const k in this.cd) this.cd[k] = Math.max(0, this.cd[k] - dt);
      this.tackleImmune = Math.max(0, this.tackleImmune - dt);
      this.hitImmune = Math.max(0, this.hitImmune - dt);
      this.ironCd = Math.max(0, this.ironCd - dt);
      this.flash = Math.max(0, this.flash - dt);
      if (this.buffs.length) {
        this.buffs.forEach((b) => (b.t -= dt));
        this.buffs = this.buffs.filter((b) => b.t > 0);
      }
      if (this.confused) { this.confused.t -= dt; if (this.confused.t <= 0) this.confused = null; }
      this.anim += dt;
      this.kbx = U.damp(this.kbx, C.combat.knockbackDamp, dt);
      this.kby = U.damp(this.kby, C.combat.knockbackDamp, dt);

      switch (this.state) {
        case 'stun':
          this.stateT -= dt;
          this.vx = U.damp(this.vx, 8, dt); this.vy = U.damp(this.vy, 8, dt);
          if (this.stateT <= 0) { this.state = 'normal'; this.hitImmune = Math.max(this.hitImmune, C.combat.hitImmuneBonus); }
          break;
        case 'slide':
          this.stateT -= dt;
          this.vx = this.dashX; this.vy = this.dashY;
          SFC.Actions.slideUpdate(g, this);
          if (this.stateT <= 0) { this.state = 'recover'; this.stateT = C.combat.slideRecover; }
          break;
        case 'dash':
          this.stateT -= dt;
          this.vx = this.dashX; this.vy = this.dashY;
          if (this.stateT <= 0) { this.state = 'normal'; this.vx *= 0.5; this.vy *= 0.5; }
          break;
        case 'tackle':
        case 'recover':
          this.stateT -= dt;
          this.vx = U.damp(this.vx, 9, dt); this.vy = U.damp(this.vy, 9, dt);
          if (this.stateT <= 0) this.state = 'normal';
          break;
        default:
          this.moveNormal(dt);
      }

      this.x += (this.vx + this.kbx) * dt;
      this.y += (this.vy + this.kby) * dt;

      // giữ trong sân
      const r = this.radius;
      let minX = f.x + r, maxX = f.x + f.w - r;
      if (this.role === 'GK' && !this.isControlled) {
        if (this.teamRef.dir > 0) maxX = f.x + f.boxDepth; else minX = f.x + f.w - f.boxDepth;
      }
      this.x = U.clamp(this.x, minX, maxX);
      this.y = U.clamp(this.y, f.y + r, f.y + f.h - r);
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
