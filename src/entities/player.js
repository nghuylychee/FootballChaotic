/* Player — di chuyển, trạng thái (normal/stun/jab/windup/kick/dash/recover), nhận đòn
 * jab = Light attack (đấm) đang lấy đà · windup = Hard attack đang gồng co chân · kick = đang vung chân
 * airZ = độ cao khi bị Hard attack hất tung */
window.SFC = window.SFC || {};

(function () {
  const U = SFC.U;

  const ATTACK_STATES = { jab: 1, windup: 1, kick: 1, recover: 1 };
  const DIVE = { diveU: 1, diveD: 1 };   // thủ môn đổ người (Actions.dive): lên / xuống màn hình

  class Player {
    constructor(game, team, role, idx) {
      const tcfg = team.cfg;
      this.game = game;
      this.team = team.index;
      this.role = role;
      this.idx = idx;
      this.id = team.index * 10 + idx;
      this.name = tcfg.players[idx] || role;
      // stamina / knock / keeper: chỉ character mới khác 1 (chỉ số character, progression.attrs)
      this.stats = Object.assign({ speed: 1, power: 1, pass: 1, tackle: 1, dribble: 1, accuracy: 1, stamina: 1, knock: 1, keeper: 1 }, tcfg.stats);
      this.radius = SFC_CONFIG.game.player.radius;
      this.res = { momentum: 0, rage: 0, guard: 0, ult: 0 };   // tài nguyên Core (Đà, Nộ, Giáp) + năng lượng Tuyệt kỹ (0..1) — Nhịp là của cả đội (g.rhythm)
      this.resT = { sprint: 0, idle: 0, rage: 0, frenzy: 0, guard: 0, iron: 0 };
      this.extraDash = 0;     // ẢO ẢNH 4: thêm 1 lần Z
      this.lastHitBy = null;  // người vừa đánh trúng (tính BONK cho đúng đội)
      this.sizeMul = 1;       // VFX Kit khổng lồ: tỉ lệ vẽ + va chạm hiện tại
      this.sizeTarget = 1;
      this.sizeT = 0;

      const skins = SFC_CONFIG.teams.skins;
      this.look = {
        skin: skins[(team.index * 3 + idx * 2) % skins.length],
        hair: tcfg.kit.hair[idx % tcfg.kit.hair.length],
      };
      // costume riêng của đội (đội Main Path: looks theo vị trí)
      const L = tcfg.looks && tcfg.looks[idx];
      if (L) {
        Object.assign(this.look, { cut: L.cut, face: L.face, shoes: L.shoes, fx: L.fx });
        if (L.skin != null) this.look.skin = skins[L.skin % skins.length];
      }

      this.x = 0; this.y = 0; this.vx = 0; this.vy = 0;
      this.kbx = 0; this.kby = 0;
      this.dashX = 0; this.dashY = 0;
      this.facing = team.dir > 0 ? 0 : Math.PI;
      this.state = 'normal';
      this.stateT = 0;
      this.cd = { light: 0, hard: 0, skill: 0, read: 0 };
      this.hardLanded = false;
      this.atkType = null;    // anim đòn đang ra: light | hard | shoot (tư thế vung chân sút, kick.poseTime)
      this.atkT = 0;          // thời gian từ lúc bắt đầu ra đòn (s)
      this.airZ = 0;          // bị hất tung: độ cao + vận tốc lên
      this.airVz = 0;
      this.stamina = SFC_CONFIG.game.player.staminaMax;
      this.sprinting = false;
      this.charging = false;
      this.charge = 0;
      this.shotTarget = 0;    // AI đang nạp lực: mức lực sẽ sút (0..1) — vạch trên thanh lực để người chơi căn Đọc Cú Sút; 0 = không có
      this.passMode = null;   // đang nạp lực chuyền: ground | through | lob
      this.passCharge = 0;
      this.passKey = null;
      this.passLock = null;   // người nhận đang được chọn
      this.tackleImmune = 0;
      this.keeperHold = 0;    // còn bao lâu được bảo vệ khi ôm bóng trong vòng cấm nhà
      this.bracing = false;   // Đọc Cú Sút: đang giữ W trong vòng cấm nhà
      this.readAt = -1;       // lúc thả W (chờ cú sút trong cửa sổ đọc); -1 = không chờ
      this.hitImmune = 0;
      this.punchStealT = -99; // lúc đấm rơi bóng của đối phương gần nhất
      this.shotLockT = 0;     // vừa đấm cướp được bóng: còn bao lâu chưa sút được (combat.light.stealShotLock)
      this.shotHold = false;  //   + D giữ từ cú đấm chưa thả ra
      this.recvT = -1;        // lúc nhận đường chuyền (Một-Hai, Chạm Một)
      this.counterT = 0;      // Phản Đòn: hạn cú đấm miễn phí
      this.titanT = 0;        // Hoá Khổng Lồ: còn bao lâu
      this.juggleN = 0;       // Tâng Người: số lần bị tâng trong 1 lần bay
      this.slamKind = null;   // đang nhảy: ground (Dậm Đất) | meteor (Thiên Thạch Giáng)
      this.auraC = '';      // hào quang Core (màu) — vẽ ở render/vfx.js, đồng bộ online
      this.auraT = 0;
      this.flash = 0;
      this.buffs = [];       // {speed, t}
      this.confused = null;  // {decoy, t}
      this.anim = Math.random() * 10;
      this.seat = null;      // slot người chơi đang khóa vào cầu thủ này (Game.seats) — null = AI / điều khiển cả đội
      this.intent = { mx: 0, my: 0, sprint: false };
      this.ai = { t: 0, runTo: null, runT: 0, requestedPass: null, holdT: 0, interceptT: 0, chargeTarget: 0.6, aimY: 0, dir: { x: 0, y: 0 }, sprint: false };
      this.kickHits = new Set();
    }

    get hasBall() { return this.game.ball.owner === this; }
    // người điều khiển: cầu thủ khóa vào 1 slot người chơi (co-op: 2 người cùng đội) hoặc người đang cầm quyền của đội
    get isControlled() { return this.seat != null || this.game.ctrl[this.team] === this; }
    get teamRef() { return this.game.teams[this.team]; }
    // đang đứng trong vòng cấm nhà -> có cơ chế thủ môn
    get keeper() { return this.game.inKeeperZone(this); }

    maxSpeed() {
      const C = SFC_CONFIG.game, g = this.game, cores = g.cores;
      let s = C.player.speed * this.stats.speed * cores.pmod(this, 'speed');   // gồm Đà
      if (this.hasBall) s *= C.player.dribbleSpeedMult * (0.85 + this.stats.dribble * 0.15);
      else s *= cores.mod(this.team, 'offBallSpeed', this);
      if (this.sprinting) s *= C.player.sprintMult;
      if (this.charging) s *= C.player.chargeMoveMult;
      if (this.bracing) s *= C.read.braceMoveMult;
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
      this.shotLockT = Math.max(0, this.shotLockT - dt);
      if (this.auraT > 0 && (this.auraT -= dt) <= 0) { this.auraT = 0; this.auraC = ''; }
      if (this.titanT > 0) this.titanT = Math.max(0, this.titanT - dt);
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
      if (air && this.state !== 'meteor') this.updateAir(dt);
      // khổng lồ: phình / co lại mượt, bán kính va chạm theo tỉ lệ
      if (this.sizeT > 0 && (this.sizeT -= dt) <= 0) this.sizeTarget = 1;
      if (this.sizeMul !== this.sizeTarget) {
        this.sizeMul += (this.sizeTarget - this.sizeMul) * Math.min(1, dt * 10);
        if (Math.abs(this.sizeMul - this.sizeTarget) < 0.01) this.sizeMul = this.sizeTarget;
        this.radius = SFC_CONFIG.game.player.radius * this.sizeMul;
      }

      switch (this.state) {
        case 'stun':
          // bị hất tung (Hard, nổ bom...): choáng chỉ trôi khi đã tiếp đất (combat.airStunPause) — bay lâu không ăn bớt choáng
          if (this.airZ <= 0 || !C.combat.airStunPause) this.stateT -= dt;
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
            g.effects.afterimage(this, this.trailLife || 0.3);
          }
          if (this.stateT <= 0) {
            this.state = 'normal'; this.trailLeft = 0; this.vx *= 0.5; this.vy *= 0.5;
            // đổ người xong: nằm sõng soài thêm gkDivePose giây (chỉ là anim)
            if (DIVE[this.atkType]) this.poseEnd = this.atkT + C.player.gkDivePose;
          }
          break;
        case 'slam':
          // đang bật nhảy (Dậm Đất / Thiên Thạch Giáng) — tiếp đất xử lý ở updateAir
          this.stateT -= dt;
          // Dậm Đất: giữ nguyên đà lao tới điểm tiếp đất
          if (this.slamKind !== 'ground') { this.vx = U.damp(this.vx, 3, dt); this.vy = U.damp(this.vy, 3, dt); }
          if (this.stateT <= 0) this.state = 'normal';
          break;
        case 'meteor':
          // Thiên Thạch Giáng: lơ lửng ngoài màn hình, bóng đổ (tâm ngắm) do Core điều khiển
          this.stateT -= dt;
          this.vx = 0; this.vy = 0;
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
      // tư thế sút: giữ kick.poseTime giây khi còn đứng bình thường · đổ người: suốt lúc bay + tư thế nằm (gkDivePose)
      const keep = this.atkType === 'shoot' ? this.state === 'normal' && this.atkT < C.kick.poseTime
        : DIVE[this.atkType] ? this.state === 'dash' || (this.state === 'normal' && this.atkT < this.poseEnd)
        : ATTACK_STATES[this.state];
      if (this.atkType && !keep) this.atkType = null;

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
        if (this.state === 'stun') g.cores.wallBonk(this, this.lastHitBy);
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
      this.juggleN = 0;
      if (this.state === 'slam') { this.airVz = 0; g.cores.slamLand(this); return; }
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
      const was = this.sprinting;
      this.sprinting = wantSprint && this.stamina > (this.sprinting ? 0 : C.staminaMinToSprint);
      if (this.sprinting && !was) this.game.cores.dispatch(this.team, 'onSprintStart', this);
      if (this.sprinting) this.stamina -= C.staminaDrain * this.game.cores.sprintDrain(this) * dt;
      else this.stamina += C.staminaRegen * this.stats.stamina * this.game.cores.mod(this.team, 'sprintRegen', this) * dt;
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

    // hào quang Core (Phản Công, Nhạc Trưởng...): màu + thời gian
    glow(color, t) { this.auraC = color; this.auraT = Math.max(this.auraT, t); }

    // VFX Kit GI: phóng to scale lần trong t giây (0 = tới khi gọi lại với scale 1)
    giant(scale, t) {
      this.sizeTarget = scale;
      this.sizeT = t;
      this.game.effects.burst(this.x, this.y, 8, '#ffffff', 14, 90);
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
      const stun = (opts.stun || 0) * (opts.stun > 0 ? g.cores.stunTaken(this) : 1);   // Nắm Đấm Sắt
      if (this.state === 'meteor') return false;   // đang ở ngoài màn hình (Thiên Thạch Giáng)
      if (stun > 0 && (this.hitImmune > 0 || this.state === 'stun')) return false;
      if (stun > 0 && g.cores.blockHit(this, opts)) {
        this.kbx += (opts.kbx || 0) * 0.3; this.kby += (opts.kby || 0) * 0.3;
        return false;
      }
      this.kbx += opts.kbx || 0;
      this.kby += opts.kby || 0;
      if (stun <= 0) return true;

      if (this.hasBall) g.looseBall(this, opts.kbx || U.rand(-1, 1), opts.kby || U.rand(-1, 1));
      this.lastHitBy = opts.source || null;
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
