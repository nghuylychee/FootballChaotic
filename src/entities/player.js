/* Player — di chuyển, trạng thái (normal/stun/jab/windup/kick/dash/recover), nhận đòn
 * jab = Light attack (đấm) đang lấy đà · windup = Hard attack đang gồng co chân · kick = đang vung chân
 * airZ = độ cao khi bị Hard attack hất tung */
window.SFC = window.SFC || {};

(function () {
  const U = SFC.U;

  const ATTACK_STATES = { jab: 1, windup: 1, kick: 1, recover: 1 };
  const DIVE = { diveU: 1, diveD: 1 };
  const FT_POSE = { volley: 1, header: 1 };   // tư thế dứt điểm 1 chạm (game.firstTime.volley / header .pose)   // thủ môn đổ người (Actions.dive): lên / xuống màn hình

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
      this.res = { ult: 0 };   // năng lượng Tuyệt kỹ (0..1)
      this.ultLv = 1;         // cấp Tuyệt kỹ: 1 gốc · 2 = dạng thức tỉnh X4 (cores.config.js -> ults, list[id].awaken)
      // trạng thái Core nhìn thấy được (CoreSystem.updateStates): TOÉ ĐIỆN, nắm tay sáng (Nắm Đấm Khổng Lồ / Nắm Đấm Sắt),
      // Xe Ủi hoá to (giây còn lại), miễn choáng tới lúc (Nắm Đấm Sắt / Đội Trưởng), cú đấm trúng gần nhất + combo
      this.sprintT = 0; this.surge = false; this.fistRdy = false; this.ballT = 0; this.bullT = 0; this.armorT = 0;
      this.ghostT = 0;        // Smoke Bomb: giây tàng hình còn lại (đối thủ không thấy)
      // trạng thái Tuyệt kỹ đợt 4 (cores-ult2.js Stat): không ra đòn / chuyền / sút / lướt được · hoảng sợ (phím di chuyển đảo ngược) ·
      // hoá gà · con rối (chạy theo hướng người giật dây: puppet = { by: Player })
      this.noActT = 0; this.panicT = 0; this.chickenT = 0; this.puppet = null; this.puppetT = 0;
      this.landT = -1; this.punchCombo = 0;
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
      // dứt điểm 1 chạm (game.firstTime): đang giữ D chờ bóng tới -> { charge, held, t, miss, aim, aimY, target } · null = không chờ.
      // Thanh lực vẫn vẽ qua charging / charge (đồng bộ online)
      this.ot = null;
      this.shotTarget = 0;    // AI đang nạp lực: mức lực sẽ sút (0..1) — vạch trên thanh lực để người chơi căn Đọc Cú Sút; 0 = không có
      this.passMode = null;   // đang nạp lực chuyền: ground | through | lob
      this.passLoft = false;  // kỹ thuật: đang nạp chọc khe mà bấm skill -> chọc khe bổng (game.technique.lobThrough)
      this.shotStyle = null;  // kỹ thuật: kiểu cú sút đang nạp: finesse (cứa lòng) | chip (sút bổng) | null (game.technique)
      this.fakeCd = 0;        // hồi sút giả (giây)
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
      this.auraFarmT = 0;     // AURA FARMING: còn bao lâu (tóc vàng + hào quang lửa, đồng bộ online)
      this.juggleN = 0;       // Tâng Người: số lần bị tâng trong 1 lần bay
      this.slamKind = null;   // đang nhảy: ground (Dậm Đất) | meteor (Thiên Thạch Giáng)
      this.auraC = '';      // hào quang Core (màu) — vẽ ở render/vfx.js, đồng bộ online
      this.auraT = 0;
      this.flash = 0;
      this.freezeT = 0;      // hitstop cục bộ (fx.hitStop): còn bao lâu đứng hình — cả sân vẫn chạy, chỉ người này khựng
      this.buffs = [];       // {speed, t}
      this.confused = null;  // {decoy, t}
      this.anim = Math.random() * 10;
      this.seat = null;      // slot người chơi đang khóa vào cầu thủ này (Game.seats) — null = AI / điều khiển cả đội
      this.intent = { mx: 0, my: 0, sprint: false };
      this.ai = { t: 0, runTo: null, runT: 0, requestedPass: null, holdT: 0, interceptT: 0, chargeTarget: 0.6, aimY: 0, dir: { x: 0, y: 0 }, sprint: false };
      this.kickHits = new Set();
      // thống kê cá nhân trong trận (bảng tỉ số + MVP sau trận)
      this.mstats = { goals: 0, assists: 0, saves: 0, shots: 0 };
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
      if (this.hasBall) s *= C.player.dribbleSpeedMult * (0.85 + this.stats.dribble * cores.mod(this, 'dribble') * 0.15);   // Kiểm Soát Bóng
      else s *= cores.mod(this.team, 'offBallSpeed', this);
      if (this.sprinting) s *= C.player.sprintMult;
      if (this.charging && this.hasBall) s *= C.player.chargeMoveMult;   // chờ đá 1 chạm (không có bóng): không chậm lại
      if (this.bracing) s *= C.read.braceMoveMult;
      for (const b of this.buffs) s *= b.speed || 1;
      if (g.finalPush) s *= C.match.finalPushSpeedMult;
      if (!this.isControlled && this.keeper) s *= C.player.gkSpeedMult;
      // con rối (Puppet Master) chạy theo người giật dây: không theo hệ số tốc độ AI của đội mình
      if ((!g.isHuman(this.team) || !this.isControlled) && !this.puppet) s *= g.aiProfile(this.team).speedMult;
      return s;
    }

    update(dt) {
      const C = SFC_CONFIG.game, g = this.game, f = g.field;
      // hitstop cục bộ: đứng yên hoàn toàn (tư thế, nháy trắng, lực văng đều giữ nguyên, hết khựng mới bay đi)
      if (this.freezeT > 0) { this.freezeT -= dt; return; }
      for (const k in this.cd) this.cd[k] = Math.max(0, this.cd[k] - dt);
      this.tackleImmune = Math.max(0, this.tackleImmune - dt);
      this.keeperHold = Math.max(0, this.keeperHold - dt);
      this.hitImmune = Math.max(0, this.hitImmune - dt);
      this.shotLockT = Math.max(0, this.shotLockT - dt);
      if (this.auraT > 0 && (this.auraT -= dt) <= 0) { this.auraT = 0; this.auraC = ''; }
      if (this.titanT > 0) this.titanT = Math.max(0, this.titanT - dt);
      if (this.auraFarmT > 0) this.auraFarmT = Math.max(0, this.auraFarmT - dt);
      this.flash = Math.max(0, this.flash - dt);
      if (this.buffs.length) {
        this.buffs.forEach((b) => (b.t -= dt));
        this.buffs = this.buffs.filter((b) => b.t > 0);
      }
      if (this.confused) { this.confused.t -= dt; if (this.confused.t <= 0) this.confused = null; }
      if (this.fakeCd > 0) this.fakeCd -= dt;
      if (this.noActT > 0) this.noActT = Math.max(0, this.noActT - dt);
      if (this.panicT > 0) this.panicT = Math.max(0, this.panicT - dt);
      if (this.chickenT > 0) this.chickenT = Math.max(0, this.chickenT - dt);
      if (this.puppetT > 0 && (this.puppetT -= dt) <= 0) { this.puppetT = 0; this.puppet = null; }
      this.anim += dt;
      if (this.atkType) this.atkT += dt;
      if (this.ot) this.tickFirstTime(dt);
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
        : FT_POSE[this.atkType] ? this.state === 'normal' && this.atkT < C.firstTime[this.atkType].pose
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
        g.effects.pop(nx, ny - 26, 'BONK!', 'light', '#ffffff');
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
      // con rối (Puppet Master): chạy theo đúng hướng người giật dây đang chạy, bỏ qua phím / AI của chính mình
      if (this.puppet) {
        const m = this.puppet, sp = Math.hypot(m.vx, m.vy);
        mx = sp > 12 ? m.vx / sp : 0; my = sp > 12 ? m.vy / sp : 0;
        this.intent.sprint = sp > C.speed * 1.1;
      }
      // hoảng sợ (Panic Ball): mọi hướng di chuyển đảo ngược
      if (this.panicT > 0) { mx = -mx; my = -my; }
      const len = Math.hypot(mx, my);
      if (len > 1) { mx /= len; my /= len; }
      const moving = len > 0.1;

      // walkT: luật trận bắt đi bộ (OWL'S GAZE: đồng đội AI tuân luật khi mắt cú mở), MatchMods đặt lại mỗi bước
      if (this.walkT > 0) this.walkT -= dt;
      const wantSprint = this.intent.sprint && moving && !(this.walkT > 0);
      const was = this.sprinting;
      this.sprinting = wantSprint && this.stamina > (this.sprinting ? 0 : C.staminaMinToSprint);
      if (this.sprinting && !was) this.game.cores.dispatch(this.team, 'onSprintStart', this);
      if (this.inj && SFC.Hurt) SFC.Hurt.move(this, dt);   // GOAT PATH: chấn thương cổ chân / đùi -> khựng lại khi chạy nước rút
      if (this.sprinting) this.stamina -= C.staminaDrain * dt;
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

    // đang chờ đá 1 chạm: nạp lực khi còn giữ D (AI: tự thả khi đủ ot.target), huỷ khi bị choáng / chờ quá lâu / bóng đi chỗ khác
    tickFirstTime(dt) {
      const F = SFC_CONFIG.game.firstTime, o = this.ot, g = this.game;
      o.t += dt;
      if (o.held) o.charge = Math.min(1, o.charge + dt / g.chargeTime(this));
      if (o.held && o.target != null && o.charge >= o.target) o.held = false;
      o.miss = SFC.Actions.ballIncoming(g, this) ? 0 : o.miss + dt;
      const ok = (this.state === 'normal' || this.state === 'dash') && !(this.airZ > 0) && !(this.noActT > 0);
      if (!ok || !F.enabled || g.ball.owner || o.t > F.armTime || o.miss > F.missTime) { SFC.Actions.disarm(this); return; }
      this.charging = true;
      this.charge = o.charge;
    }

    // hitstop cục bộ t giây (fx.hitStop): không cộng dồn, lấy mức dài hơn
    freeze(t) { if (t > 0) this.freezeT = Math.max(this.freezeT, t); }

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
      this.passLoft = false;
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
     * Nhận đòn. opts: {stun, kbx, kby, source, type, quiet}
     * stun = 0 -> chỉ đẩy lùi, không mất bóng.
     */
    hit(opts) {
      const g = this.game;
      const stun = (opts.stun || 0) * (opts.stun > 0 ? g.cores.stunTaken(this) : 1);   // Da Thép
      if (this.state === 'meteor') return false;   // đang ở ngoài màn hình (Thiên Thạch Giáng)
      if (stun > 0 && (this.hitImmune > 0 || this.state === 'stun')) return false;
      if (stun > 0 && g.mod && SFC.MatchMods.armor(g, this, opts)) return false;   // luật trận FOOTBALL STORY: boss có giáp (KING LEO 1976)
      if (stun > 0 && g.cores.blockHit(this, opts)) {
        this.kbx += (opts.kbx || 0) * 0.3; this.kby += (opts.kby || 0) * 0.3;
        return false;
      }
      const kt = g.cores.knockTaken(this) * (this.legend && SFC.Legends ? SFC.Legends.knockMul(this) : 1);   // Da Thép · LEGEND nhỏ con: văng xa hơn
      this.kbx += (opts.kbx || 0) * kt;
      this.kby += (opts.kby || 0) * kt;
      if (stun <= 0) return true;

      if (this.hasBall) g.looseBall(this, opts.kbx || U.rand(-1, 1), opts.kby || U.rand(-1, 1));
      this.lastHitBy = opts.source || null;
      if (opts.launch) { this.airVz = opts.launch; this.airZ = Math.max(this.airZ, 0.5); }
      this.state = 'stun';
      this.stateT = stun * (this.legend && SFC.Legends ? SFC.Legends.stunMul(this) : 1);   // GOAT PATH: LEGEND ăn vạ nằm lâu hơn
      this.charging = false;
      this.charge = 0;
      this.ot = null;
      this.cancelPass();
      this.flash = 0.12;
      this.hitImmune = stun;
      if (g.drill && SFC.Drills) SFC.Drills.hit(g, this, opts);   // GOAT PATH SKILL GAME (STREET BRAWL): đếm lần hạ gục
      // quiet: không phải bị đánh (trượt ngã...) -> bỏ tia lửa, rung màn, tiếng đấm; nơi gọi tự lo hình + tiếng
      if (!opts.quiet) {
        g.effects.burst(this.x, this.y, 14, '#fff6a0', 6, 60);
        g.effects.shake(SFC_CONFIG.game.fx.shakeHit);
        g.sfx('hit', opts.type);
      }
      if (g.mod) SFC.MatchMods.hitBy(g, this, opts);   // luật trận FOOTBALL STORY (trọng tài bắt lỗi)
      return true;
    }
  }

  SFC.Player = Player;
})();
