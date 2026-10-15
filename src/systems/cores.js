/* Core Upgrade System (docs/CORE_DESIGN.md, docs/ULT_RECIPE.md)
 * - Trường phái (tags) -> công thức Tuyệt kỹ (cores.config.js -> ults): đạt mốc Core cùng trường phái thì đổi / tiến hoá Tuyệt kỹ (phím X).
 *   Không còn tài nguyên trường phái (Đà / Nhịp / Nộ / Giáp) và Cộng hưởng: Core kích hoạt bằng trạng thái nhìn thấy được
 *   (TOÉ ĐIỆN khi chạy nước rút đủ lâu, combo đấm, chuỗi chuyền, hồi chiêu...)
 * - mods thụ động lấy từ config (cores.config.js -> mods); pmod(p, key) = mods + bonus động (TOÉ ĐIỆN, Hoá Khổng Lồ, Xe Ủi...)
 * - hành vi đặc biệt: object Behaviors, key = id core, value = các hook (sys, team, params, ...):
 *   onShoot(player, ball, charge) · onChargedShot(player, ball, held) · onPass(player, target, mode) · onPassReceived(receiver, passer)
 *   onSkillMove(player, dir) · onSprintStart(player) · onHardAttack(player) · onTackle(player) · onTackleWin(player, victim)
 *   onLightHit(attacker, victim) · onHardHit(attacker, victim) · onWallBonk(attacker?, victim) · onDodge(player)
 *   onSteal(player) · onGoalScored(scorer) · onKickoff() · onPossessionGained(player)
 *   onHit(victim, opts) -> true = chặn đòn · onGoalLine(ball) -> true = chặn bóng vào lưới · onWallHit(ball, side) -> true = đã xử lý
 *   onUltimate(player) — Tuyệt kỹ (sau cut-in) · aiUse(team) -> cầu thủ ra Tuyệt kỹ hoặc null (AI quyết định lúc nào dùng)
 *   onLightAttack(player) — bắt đầu cú đấm
 * - Core Giai đoạn 3 (37 Core mới) ở systems/cores-new.js, gắn vào SFC.CoreBehaviors
 * - sys.task(fn(dt) -> true = xong, onEnd): việc chạy mỗi bước mô phỏng (Tuyệt kỹ nhiều nhịp, lực hút...), huỷ khi giao bóng
 */
window.SFC = window.SFC || {};

(function () {
  const U = SFC.U;
  const DEF = () => SFC_CONFIG.cores;

  function applyFire(sys, team, ball, p) {
    ball.fx.fire = { team, stun: p.stun, knockback: p.knockback, interval: p.trailInterval, duration: p.trailDuration, radius: p.trailRadius };
  }
  function applyThunder(ball, p) {
    ball.fx.thunder = { stun: p.stun, gkPenalty: p.gkPenalty };
    ball.pierce = p.pierce;
  }
  function spawnDecoy(sys, team, player, params) {
    const g = sys.g, b = g.ball, E = g.effects;
    const base = Math.hypot(player.vx, player.vy) > 10 ? Math.atan2(player.vy, player.vx) : player.facing;
    const a = base + U.randSign() * (params.angle || 0.8);
    const spd = Math.max(90, Math.hypot(player.vx, player.vy));
    const decoy = E.decoy(player, b.x, b.y, Math.cos(a) * spd, Math.sin(a) * spd, params.duration || 1.6);
    for (const o of g.teams[1 - team].players) {
      if (!g.inKeeperZone(o) && U.dist(o, player) < (params.confuseRadius || 90) && !o.isControlled) {
        o.confused = { decoy, t: params.confuseTime || 1.2 };
      }
    }
    E.burst(player.x, player.y, 8, '#9d7bff', 12, 80, 0.45);
    E.comic(player.x, player.y - 28, 'FAKE!', '#9d7bff', 0.7, 0.6);
  }

  const PUNCH_WORDS = ['POW!', 'BAM!', 'WHAM!', 'BOP!'];
  const CHAOS_SKINS = ['melon', 'bowling', 'chicken', 'wheel', 'cube'];
  const CHAOS_LABEL = { curve: 'CURVE!', rocket: 'ROCKET!', fire: 'FIRE!', thunder: 'ZAP!', split: 'x2!' };

  const Behaviors = SFC.CoreBehaviors = {
    /* ---------- 🎯 SÁT THỦ ---------- */
    // Hoả Cầu: sút tụ lực -> quả cầu lửa, sân cháy theo đường bay, vào lưới thì lưới bốc cháy
    fire_shot: {
      onChargedShot(sys, team, p, pl, ball) {
        applyFire(sys, team, ball, p);
        const E = sys.g.effects;
        E.burst(ball.x, ball.y, 4, '#ff9a3d', 14, 120, 0.5);
        E.burst(ball.x, ball.y, 4, '#ffe070', 8, 80, 0.4);
        E.shake(3, 0.2);
        sys.g.sfx('fire');
      },
      onGoalScored(sys, team) {
        if (sys.g.ball.fx.fire) sys.g.effects.netFire(sys.g.teams[team].dir > 0 ? 1 : -1);
      },
    },
    // Mắt Thiện Xạ: bóng ít ma sát, bay xa (tia laser khi ngắm vẽ ở render/vfx.js)
    sniper_foot: {
      onShoot(sys, team, p, pl, ball) {
        ball.frictionMult = p.frictionMult;
        ball.vx *= p.speedMult; ball.vy *= p.speedMult;
        ball.fx.laser = true;
      },
    },
    // Lôi Cước: tụ lực lâu -> chân phóng sét, bóng sét xuyên người
    thunder_kick: {
      onChargedShot(sys, team, p, pl, ball, held) {
        if (held < p.minCharge) return;
        applyThunder(ball, p);
        ball.vx *= p.speedMult; ball.vy *= p.speedMult;
        const E = sys.g.effects;
        E.bolt(pl.x, pl.y - 22, pl.x, pl.y - 2, '#bdf4ff', 0.3);
        E.bolt(pl.x, pl.y - 4, ball.x + ball.vx * 0.08, ball.y + ball.vy * 0.08 - 4, '#7fe7ff', 0.3);
        E.flash(0.35);
        E.shake(3, 0.2);
        sys.g.sfx('zap');
      },
    },
    // Xoáy Rồng: bóng bẻ cong về góc khung, kéo vệt xoắn ốc xanh lá
    banana_kick: {
      onShoot(sys, team, p, pl, ball) {
        const f = sys.g.field, dir = sys.g.teams[team].dir;
        ball.homing = { x: dir > 0 ? f.x + f.w + 10 : f.x - 10, y: f.cy + (ball.y < f.cy ? 1 : -1) * f.goalWidth * 0.3, strength: p.strength };
        ball.fx.spiral = true;
      },
    },

    /* ---------- 🏃 TỐC ĐỘ · 🌀 ẢO ẢNH ---------- */
    // Quỷ Tốc Độ: TOÉ ĐIỆN sớm hơn (mods.surgeTime) — vệt tàn ảnh xanh vẽ ở render/vfx.js
    // Thuấn Bộ: biến mất trong khói, dịch chuyển xa thêm, để lại ảo ảnh tại chỗ cũ
    phantom_step: {
      onSkillMove(sys, team, p, pl, d) {
        const g = sys.g, f = g.field, E = g.effects;
        const ox = pl.x, oy = pl.y;
        E.clone(pl.id, ox, oy, 0, 0, p.illusion);
        // đang cầm bóng: đối thủ (máy) gần đó lao vào ảo ảnh
        const st = sys.st(pl, 'phantom_step');
        if (pl.hasBall && !(st.cd > 0)) {
          st.cd = p.lureCooldown;
          const lure = { x: ox, y: oy, alive: true };
          g.later(p.lure, () => { lure.alive = false; });
          let near = null, nd = p.lureRadius;   // chỉ lừa được 1 người gần nhất
          for (const o of g.teams[1 - team].players) {
            if (!o.isControlled && !g.inKeeperZone(o) && U.dist(o, pl) < nd) { nd = U.dist(o, pl); near = o; }
          }
          if (near) near.confused = { decoy: lure, t: p.lure };
        }
        E.burst(ox, oy, 8, '#d8d0e0', 14, 80, 0.5);
        pl.x = U.clamp(pl.x + d.x * p.distance, f.x + 8, f.x + f.w - 8);
        pl.y = U.clamp(pl.y + d.y * p.distance, f.y + 8, f.y + f.h - 8);
        E.burst(pl.x, pl.y, 8, '#9d7bff', 12, 70, 0.45);
        E.ring(pl.x, pl.y, '#9d7bff');
        if (pl.hasBall) g.ball.follow(0);
      },
    },
    // Chạy Giả: ảo ảnh tím dắt bóng giả chạy hướng khác
    fake_run: {
      onSprintStart(sys, team, p, pl) { this.trigger(sys, team, p, pl); },
      onSkillMove(sys, team, p, pl) { this.trigger(sys, team, p, pl); },
      trigger(sys, team, p, pl) {
        const st = sys.st(pl, 'fake_run');
        if ((st.cd || 0) > 0 || !pl.hasBall) return;
        st.cd = p.cooldown;
        spawnDecoy(sys, team, pl, p);
      },
    },

    /* ---------- 🥊 ĐẤU SĨ · 🛡 THÉP · 🦵 VÕ SĨ ĐÁ ---------- */
    // Võ Đường Phố: chữ comic to (combo đấm liên tiếp: chữ đỏ, to dần)
    street_fighter: {
      onLightHit(sys, team, p, a, v) {
        if (a.lastPunch && (a.lastPunch.big || a.lastPunch.upper)) return;   // cú đặc biệt có chữ riêng
        const r = Math.min(4, a.punchCombo || 0);
        sys.g.effects.comic(v.x + U.rand(-6, 6), v.y - 24, U.pick(PUNCH_WORDS), r >= 3 ? '#ff3d5a' : r >= 2 ? '#ff7a3d' : '#ffe14f', 0.7 + r * 0.08, 0.55);
      },
    },
    // Da Thép: choáng ngắn hơn, bị đẩy lùi ít hơn (stunTaken / knockTaken) — trúng đòn bắn tia lửa thép
    iron_body: {
      onHit(sys, team, p, victim) {
        if (victim !== p.owner) return false;
        const E = sys.g.effects;
        E.burst(victim.x, victim.y - 8, 6, '#ffffff', 8, 90, 0.3);
        E.burst(victim.x, victim.y - 8, 6, '#c7ccd6', 6, 70, 0.35);
        E.text(victim.x, victim.y - 28, 'TINK', '#c7ccd6');
        return false;
      },
    },
    // Cước Phong: lưỡi gió trăng khuyết (hazard ở systems/effects.js)
    blade_runner: {
      onHardAttack(sys, team, p, pl) {
        sys.g.effects.slash(pl, p);
        sys.g.effects.burst(pl.x, pl.y, 6, '#dffbff', 8, 90, 0.35);
        sys.g.sfx('zap');
      },
    },
    // Khiên Aegis: khiên lục giác trên vạch vôi, chặn bóng thì vỡ vụn + hit-stop
    aegis_wall: {
      onAdd(sys, team) { sys.st(team, 'aegis_wall').ready = true; },
      onGoalLine(sys, team, p, ball) {
        const st = sys.st(team, 'aegis_wall');
        if (!st.ready) return false;
        st.ready = false;
        st.cd = p.cooldown;
        ball.vy += U.rand(-60, 60);
        ball.vz = 60;
        ball.clearFx();
        const g = sys.g, f = g.field, E = g.effects;
        const x = team === 0 ? f.x : f.x + f.w, s = team === 0 ? 1 : -1;
        g.hitStop(0.1);
        E.shield(x, ball.y - 6, 20, '#7fe7ff', 0.55, 1);
        E.burst(x, ball.y, 10, '#7fe7ff', 16, 130);
        E.burst(x, ball.y, 10, '#ffffff', 10, 160, 0.4);
        E.comic(x + s * 36, f.cy - 38, 'AEGIS!', '#7fe7ff', 1);
        E.shake(4, 0.3);
        g.sfx('block');
        return true;
      },
      update(sys, team, p, dt) {
        const st = sys.st(team, 'aegis_wall');
        if (!st.ready) { st.cd -= dt; if (st.cd <= 0) st.ready = true; }
      },
    },
    // Phản Công: cướp được bóng -> tăng tốc + lực sút, hào quang xanh, callout
    counter_attack: {
      onSteal(sys, team, p, pl) {
        const g = sys.g, E = g.effects;
        (sys.buffs[pl.id] || (sys.buffs[pl.id] = [])).push({ speed: p.speedMult, shotPower: p.shotMult, t: p.duration });
        pl.glow('#3ff6ff', p.duration);
        const st = sys.st(pl, 'counter_attack');
        if (!(st.cd > 0)) {
          st.cd = p.calloutCd;
          E.callout('COUNTER!', '#3ff6ff', 1);
          E.speedLines(0.45, pl.x, pl.y, '#bdf4ff');
          g.sfx('whistle');
        } else E.comic(pl.x, pl.y - 28, 'COUNTER!', '#3ff6ff', 0.75, 0.6);
      },
    },
    // Mìn EMP: mìn + nổ điện ở systems/effects.js
    emp_trap: {
      onTackle(sys, team, p, pl) {
        const st = sys.st(pl, 'emp_trap');
        if ((st.cd || 0) > 0) return;
        st.cd = p.cooldown;
        sys.g.effects.mine(pl.x, pl.y, team, p, pl);
      },
    },
    // Nhạc Trưởng: bóng kéo dây đàn vàng; người nhận hào quang vàng + tăng tốc
    maestro: {
      onPass(sys) { sys.g.ball.fx.string = true; },
      onPassReceived(sys, team, p, rc) {
        const g = sys.g;
        rc.buffs.push({ speed: p.speedMult, t: p.duration });
        rc.glow('#ffd23f', p.duration);
        g.effects.ring(rc.x, rc.y - 6, '#ffd23f');
        g.effects.burst(rc.x, rc.y, 12, '#ffd23f', 6, 50, 0.5);
      },
    },

    /* ---------- 🎲 HỖN LOẠN ---------- */
    // Bóng Hỗn Loạn: bóng biến hình + 1 hiệu ứng ngẫu nhiên mỗi cú đá
    chaos_ball: {
      roll(sys, team, p, pl, ball, isShot) {
        const opts = isShot ? ['curve', 'rocket', 'fire', 'thunder', 'split'] : ['curve', 'rocket', 'split'];
        const pick = U.pick(opts);
        const lib = DEF().list;
        if (pick === 'curve') ball.curve = U.randSign() * p.curve;
        if (pick === 'rocket') { ball.vx *= p.rocketMult; ball.vy *= p.rocketMult; }
        if (pick === 'fire') applyFire(sys, team, ball, lib.fire_shot.params);
        if (pick === 'thunder') applyThunder(ball, lib.thunder_kick.params);
        if (pick === 'split') {
          const a = Math.atan2(ball.vy, ball.vx) + U.randSign() * 0.5;
          sys.g.effects.decoy(null, ball.x, ball.y, Math.cos(a) * ball.speed, Math.sin(a) * ball.speed, 1.2);
        }
        // lửa / sét giữ hình bóng nguyên tố, còn lại bóng biến thành đồ vật ngẫu nhiên
        if (pick !== 'fire' && pick !== 'thunder') ball.skin = U.pick(CHAOS_SKINS);
        sys.g.effects.burst(ball.x, ball.y, 4, '#c63dff', 8, 70, 0.4);
        sys.g.effects.comic(pl.x, pl.y - 26, CHAOS_LABEL[pick], '#c63dff', 0.6, 0.6);
      },
      onShoot(sys, team, p, pl, ball) { this.roll(sys, team, p, pl, ball, true); },
      onPass(sys, team, p, pl) { if (Math.random() < 0.5) this.roll(sys, team, p, pl, sys.g.ball, false); },
    },
    // Cổng Dịch Chuyển: cổng xoáy tím mở trên tường, bóng chui sang tường đối diện
    warp_walls: {
      onWallHit(sys, team, p, ball, side) {
        const g = sys.g, f = g.field, E = g.effects;
        const yIn = side === 'top' ? f.y : f.y + f.h, yOut = side === 'top' ? f.y + f.h : f.y;
        E.portal(ball.x, yIn, 0.7);
        E.portal(ball.x, yOut, 0.7);
        E.burst(ball.x, ball.y, ball.z, '#c63dff', 8, 60);
        ball.y = side === 'top' ? f.y + f.h - ball.r - 1 : f.y + ball.r + 1;
        E.burst(ball.x, ball.y, ball.z, '#c63dff', 8, 60);
        g.sfx('zap');
        return true;
      },
    },
  };

  SFC.CoreHelpers = { applyFire, applyThunder, spawnDecoy };

  const ARCH = () => DEF().archetypes;
  const ULTS = () => DEF().ults;

  // x là cầu thủ (Player) hay số đội
  const isP = (x) => !!(x && typeof x === 'object' && x.stats && x.team != null);

  /* Core thuộc về TỪNG CẦU THỦ (không còn dùng chung cả đội): mỗi người có Core, Cộng hưởng, trạng thái, buff, Tuyệt kỹ riêng.
   * Các truy vấn nhận cầu thủ (Player) hoặc số đội: số đội = hỏi chung cả đội (có ai có / mức cao nhất trong đội) —
   * dùng cho thứ vẫn là của đội: khiên khung thành, Đại Phân Thân...
   * Hook của Core nhận params đã nhân theo chỉ số của người sở hữu: prm.owner = cầu thủ sở hữu Core đó. */
  class CoreSystem {
    constructor(g) {
      this.g = g;
      this.own = {};          // id cầu thủ -> [id Core]
      this.state = {};        // 'p<id>' / 't<đội>' -> { id Core -> trạng thái }
      this.buffs = {};        // id cầu thủ -> [{ key: hệ số, t }] (Phản Công...)
      this.aiUltT = {};       // id cầu thủ -> hẹn giờ AI ra Tuyệt kỹ
      this.tasks = [];
      this.newShown = {};     // id cầu thủ -> Set Core mới mở (opts.coreFresh) đã hiện ở lượt chọn -> nhãn NEW
      this.spCache = new Map();                  // params đã nhân theo chỉ số: 'id|người' -> params (chỉ số không đổi trong trận)
    }
    // việc chạy mỗi bước mô phỏng (chỉ lúc đang đá); fn(dt) trả true = xong; onEnd chạy khi xong / bị huỷ lúc giao bóng
    task(fn, onEnd) { this.tasks.push({ fn, onEnd }); }
    endTasks() {
      const list = this.tasks; this.tasks = [];
      for (const t of list) if (t.onEnd) t.onEnd();
    }
    def(id) { return DEF().list[id]; }
    params(id) { return (this.def(id) && this.def(id).params) || {}; }
    // cầu thủ của x: Player -> [x], số đội -> cả đội
    plist(x) { return isP(x) ? [x] : x >= 0 && this.g.teams[x] ? this.g.teams[x].players : []; }
    coresOf(p) { return (p && this.own[p.id]) || []; }
    // mọi Core của đội (gộp các cầu thủ, không trùng) — HUD / màn kết quả
    teamCores(team) { return [...new Set(this.plist(team).flatMap((p) => this.coresOf(p)))]; }
    has(x, id) { return this.plist(x).some((p) => this.coresOf(p).includes(id)); }
    // cầu thủ người chơi tại máy / online đang điều khiển (chọn Core bằng tay) — null nếu đội do AI
    // (co-op: đội có 2 slot -> slot đầu tiên; từng người xem seatOwner)
    humanOwner(team) {
      const g = this.g;
      if (team < 0 || !g.isHuman(team)) return null;
      const i = (g.seats || []).findIndex((s) => s.team === team && !s.gone);
      return i < 0 ? null : this.seatOwner(i);
    }
    // cầu thủ nhận Core của slot người chơi i
    seatOwner(i) {
      const g = this.g, s = g.seats && g.seats[i];
      if (!s || s.gone) return null;
      const ps = g.teams[s.team].players;
      return s.p || g.ctrl[s.team] || ps.find((p) => p.avatar) || ps[0] || null;
    }
    isHumanOwner(p) {
      if (!p) return false;
      const seats = this.g.seats || [];
      for (let i = 0; i < seats.length; i++) if (seats[i].team === p.team && this.seatOwner(i) === p) return true;
      return false;
    }

    /* ---------- Core scale theo chỉ số (cores.config.js -> statScale, archetypes[].stat, list[].scale) ---------- */
    // người "cầm" Core của đội cho hiệu ứng cấp đội: character của người chơi; đội AI -> null (dùng trung bình đội)
    owner(team) {
      if (team < 0) return null;
      return this.g.teams[team].players.find((p) => p.avatar) || null;
    }
    // hệ số độ mạnh / hồi chiêu của Core id khi người who dùng (who: Player | số đội | null). Ảnh xem trước: luôn 1
    power(id, who) { return SFC.CoreScale.power(this.rating(id, who)); }
    cdMult(id, who) { return SFC.CoreScale.cooldown(this.rating(id, who)); }
    rating(id, who) {
      if (this.g.preview || this.g.opts.noScale) return SFC.CoreScale.cfg().anchor;
      const stats = SFC.CoreScale.statsOf(id);
      const force = this.g.opts.coreRating;   // giả lập cân bằng: ép rating scale Core theo đội [đội 0, đội 1]
      if (!stats.length) return SFC.CoreScale.cfg().anchor;
      const team = typeof who === 'number' ? who : who && who.team;
      if (force && force[team] != null) return force[team];
      const p = typeof who === 'number' || !who ? this.owner(team) : who;
      const list = p ? [p] : team >= 0 ? this.g.teams[team].players : [];
      if (!list.length) return SFC.CoreScale.cfg().anchor;
      let sum = 0;
      for (const q of list) for (const st of stats) sum += SFC.CoreScale.ratingOf(q.stats, st);
      return sum / (list.length * stats.length);
    }
    // params của Core id đã nhân theo chỉ số của who (cache theo trận); owner = cầu thủ sở hữu (null nếu who là đội)
    // Tuyệt kỹ tiến hoá (cấp who.ultLv >= 2): ghép list[id].evolve[cấp - 2] lên params gốc trước khi nhân theo chỉ số
    sp(id, who) {
      const lv = isP(who) && this.def(id) && this.def(id).role === 'ult' ? who.ultLv || 1 : 1;
      const key = id + '|' + (isP(who) ? 'p' + who.id : 't' + (typeof who === 'number' ? who : 'x')) + '|' + lv;
      let out = this.spCache.get(key);
      if (!out) {
        const r = this.rating(id, who), ev = lv > 1 && (this.def(id).evolve || [])[lv - 2];
        const base = ev ? Object.assign({}, this.params(id), ev) : this.params(id);
        out = SFC.CoreScale.apply(id, base, r);
        if (out === this.params(id)) out = Object.assign({}, out);
        Object.defineProperty(out, 'owner', { value: isP(who) ? who : null, enumerable: false });
        this.spCache.set(key, out);
      }
      return out;
    }
    // trạng thái riêng của Core: theo cầu thủ (Player) hoặc theo đội (số đội — khiên khung thành, Đại Phân Thân...)
    st(x, id) {
      const k = isP(x) ? 'p' + x.id : 't' + x;
      const s = this.state[k] || (this.state[k] = {});
      return s[id] || (s[id] = {});
    }
    tagsOf(id) { const d = this.def(id); return (d && d.tags) || []; }

    // thêm Core cho cầu thủ p (số đội: cho mọi cầu thủ trong đội — ảnh xem trước / sandbox)
    add(p, id) {
      if (!isP(p)) { for (const q of this.plist(p)) this.add(q, id); return; }
      if (!this.def(id) || this.coresOf(p).includes(id)) return;
      (this.own[p.id] || (this.own[p.id] = [])).push(id);
      const b = Behaviors[id];
      if (b && b.onAdd) b.onAdd(this, p.team, this.sp(id, p));
      // Core thường: có thể vừa đạt công thức Tuyệt kỹ mới
      if (this.def(id).role !== 'ult' && this.recipesOn()) {
        const r = this.bestRecipe(p, null, id);
        if (r) this.setUlt(p, r.id, r.lv);
      }
    }

    // bỏ Core (sandbox): x = cầu thủ hoặc số đội
    remove(x, id) {
      for (const p of this.plist(x)) {
        const l = this.own[p.id];
        if (l && l.includes(id)) { l.splice(l.indexOf(id), 1); delete this.st(p, id).cd; }
      }
    }
    clearCores(x) { for (const p of this.plist(x)) { this.own[p.id] = []; delete this.state['p' + p.id]; } }

    /* ---------- trường phái (theo từng cầu thủ; số đội = người cao nhất đội) ---------- */
    // Tuyệt kỹ không tính vào số Core trường phái
    tagCount(x, tag) {
      let best = 0;
      for (const p of this.plist(x)) {
        let n = 0;
        for (const id of this.coresOf(p)) if (this.def(id).role !== 'ult' && this.tagsOf(id).includes(tag)) n++;
        if (n > best) best = n;
      }
      return best;
    }
    // số Core từng trường phái của 1 cầu thủ: [{ tag, count }] (HUD / Pause), bỏ HỖN LOẠN
    schools(x) {
      return Object.keys(ARCH()).filter((t) => !ARCH()[t].noSet)
        .map((tag) => ({ tag, count: this.tagCount(x, tag) }))
        .filter((c) => c.count > 0)
        .sort((a, b) => b.count - a.count);
    }
    // hình thái Tuyệt kỹ nâng cấp (cấp cao nhất, X4): cầu thủ đổi ngoại hình theo trường phái của Tuyệt kỹ (render/vfx.js -> form)
    formOf(x) {
      const p = isP(x) ? x : this.ultOrder(x)[0];
      const id = p && p.ultLv >= ULTS().tiers.length && p.ultLv > 1 && this.ultOf(p);
      return id ? this.tagsOf(id)[0] : null;
    }

    /* ---------- hệ số ---------- */
    // mods của Core người đó (phần thưởng nhân theo chỉ số) x buff của Core (Phản Công...). mod(p, key) hoặc mod(đội, key, p)
    mod(a, key, b) {
      const p = isP(a) ? a : isP(b) ? b : null;
      if (!p || p.team < 0) return 1;
      let m = 1;
      for (const id of this.coresOf(p)) {
        const mods = this.def(id).mods;
        if (mods && mods[key] != null) m *= SFC.CoreScale.scaleMod(id, key, mods[key], () => this.rating(id, p));
      }
      for (const bf of this.buffs[p.id] || []) if (bf[key]) m *= bf[key];
      return m;
    }

    // hệ số theo cầu thủ = mods của người đó x bonus động theo trạng thái (TOÉ ĐIỆN, Xe Ủi, Hoá Khổng Lồ)
    pmod(p, key) {
      let m = this.mod(p, key);
      if (p.team < 0) return m;
      switch (key) {
        case 'speed':
          if (p.surge) m *= DEF().surge.speed;
          if (p.titanT > 0) m *= this.sp('titan', p).slow || 1;   // Hoá Khổng Lồ: nặng nề, hậu vệ vẫn chạy kịp chắn
          if (p.bullT > 0) m *= this.params('bulldozer').slow;   // Xe Ủi: nặng nề
          break;
        case 'shotPower':
          if (p.titanT > 0) m *= this.sp('titan', p).shot;
          break;
      }
      return m;
    }

    // ngưỡng "Sút tụ lực" (giữ bao nhiêu thanh lực)
    chargedThreshold() { return DEF().chargedShot; }
    // TOÉ ĐIỆN: có Core TỐC ĐỘ + chạy nước rút liên tục đủ lâu (surge.time x mods surgeTime)
    surgeTime(p) { return DEF().surge.time * this.mod(p, 'surgeTime'); }

    /* ---------- AI dùng Core (systems/ai.js) ---------- */
    // mức "giữ lực" cần để kích hoạt Core sút của cầu thủ (Hoả Cầu / Lôi Cước / Chưởng Sóng / Lỗ Đen...), 0 = không có
    aiShotCharge(p) {
      let c = 0;
      if (this.has(p, 'fire_shot') || this.has(p, 'one_two')) c = Math.max(c, this.chargedThreshold(p));
      if (this.has(p, 'thunder_kick')) c = Math.max(c, this.params('thunder_kick').minCharge);
      for (const id of ['energy_wave', 'black_hole']) if (this.has(p, id)) c = Math.max(c, this.params(id).minCharge);
      return c ? Math.min(1, c + 0.03) : 0;
    }
    // có Core VÕ SĨ ĐÁ -> ra đòn Hard nhiều hơn; ẢO ẢNH -> lướt Z nhiều hơn
    aiHardMult(p) { return 1 + this.tagCount(p, 'launcher') * 0.8; }
    aiDodgeMult(p) { return 1 + this.tagCount(p, 'trickster') * 0.5; }

    /* ---------- truy vấn cho actions / match (Core Giai đoạn 3) ---------- */
    // tầm với của cú đấm (Tay Cao Su: vươn xa)
    lightReach(p) { return this.has(p, 'rubber_arm') ? this.sp('rubber_arm', p).reach : 0; }
    // Một-Hai: sút ngay sau khi nhận đường chuyền = sút tụ lực tối đa
    volleyCharge(p) {
      if (!this.has(p, 'one_two') || !(p.recvT >= 0)) return 0;
      return this.g.time - p.recvT <= this.sp('one_two', p).window ? 1 : 0;
    }
    // không thể bị cướp bóng: Xe Ủi (đang hoá to), Hoá Khổng Lồ
    unstealable(o) { return o.titanT > 0 || o.bullT > 0; }
    // Nắm Đấm Khổng Lồ: nắm tay sáng (hồi chiêu xong) -> cú đấm kế tiếp thành nắm đấm khổng lồ
    bigPunch(p) {
      const st = this.st(p, 'giant_fist');
      if (!this.has(p, 'giant_fist') || st.cd > 0) return false;
      st.cd = this.sp('giant_fist', p).cooldown;
      return true;
    }
    // Long Quyền: cú đấm thứ 2 liên tiếp (trong window giây sau cú đấm trúng trước) -> móc hàm hất tung
    uppercut(p) {
      const st = this.st(p, 'uppercut');
      if (!this.has(p, 'uppercut') || st.cd > 0 || !(p.landT >= 0)) return false;
      const prm = this.sp('uppercut', p);
      if (this.g.time - p.landT > prm.window) return false;
      st.cd = prm.cooldown;
      return true;
    }
    // Steel Formation (Tuyệt kỹ lai): đường chuyền của đội không bị cắt
    // Iron Chain: đường chuyền của đội không bị cắt khi xích còn nối
    passGuarded(team) { return team >= 0 && this.st(team, 'iron_chain').t > this.g.time; }
    // Nắm Đấm Sắt: nắm tay thép sẵn sàng -> người cầm bóng không trụ được (dùng ở onLightHit của iron_fist)
    ironFist(p) { return this.has(p, 'iron_fist') && !(this.st(p, 'iron_fist').cd > 0); }
    // Dậm Đất: tiếp đất sau cú nhảy
    slamLand(p) {
      const b = Behaviors.ground_slam;
      if (b && b.land) b.land(this, p.team, this.sp('ground_slam', p), p);
    }
    // khoảnh khắc đáng nhớ (màn kết quả "Khoảnh khắc của trận"): combo HIT cao, Tuyệt kỹ...
    moment(team, id, text, score) { this.g.emit('moment', { team, id, text, score }); }
    // Tâng Người: đấm trúng người đang bay -> tâng lên tiếp
    juggle(a, o) {
      const g = this.g, E = g.effects, prm = this.sp('juggle', a);
      o.airVz = Math.max(o.airVz, prm.lift);
      o.stateT = Math.max(o.stateT, prm.stun);
      o.kbx *= 0.4; o.kby *= 0.4;
      o.juggleN = (o.juggleN || 1) + 1;
      E.combo(o.x, o.y - o.airZ - 22, o.juggleN);
      if (o.juggleN >= 3) this.moment(a.team, 'juggle', o.juggleN + ' HIT!', o.juggleN * 12);
      E.ring(o.x, o.y - o.airZ - 8, '#b46bff');
      E.burst(o.x, o.y, o.airZ + 8, '#fff6a0', 8, 80, 0.35);
      g.hitStop(0.04);
      g.sfx('tackle');
      this.lightHit(a, o);
    }
    // hệ số thời gian bị choáng / lực bị đẩy lùi (Da Thép)
    stunTaken(p) { return p.team >= 0 && this.has(p, 'iron_body') ? this.sp('iron_body', p).stun : 1; }
    knockTaken(p) { return p.team >= 0 && this.has(p, 'iron_body') ? this.sp('iron_body', p).knock : 1; }
    // trừ tỉ lệ bắt bóng của thủ môn theo cú sút (Giao Hưởng, Bóng Ma, Sao Băng, Đại Phân Thân...)
    keeperPenalty(ball) {
      let k = ball.gkMod || 0;
      const t = ball.lastKickTeam;
      if (t >= 0 && this.st(t, 'clone_army').t > this.g.time) k += this.st(t, 'clone_army').gk || 0;
      return k;
    }

    // gọi hook của Core. Tham số đầu là cầu thủ cùng đội (người ra chiêu / người bị đánh) -> chỉ Core của người đó;
    // còn lại (giao bóng, bóng chạm vạch / tường...) -> Core của mọi cầu thủ trong đội
    dispatch(team, hook, ...args) {
      if (team < 0) return false;
      const first = args[0];
      const owners = isP(first) && first.team === team ? [first] : this.g.teams[team].players;
      let res = false;
      for (const o of owners) if (this.dispatchFor(o, hook, ...args)) res = true;
      return res;
    }
    // gọi hook trên Core của đúng 1 cầu thủ
    dispatchFor(owner, hook, ...args) {
      let res = false;
      for (const id of this.coresOf(owner)) {
        const b = Behaviors[id];
        if (b && b[hook] && b[hook].call(b, this, owner.team, this.sp(id, owner), ...args)) res = true;
      }
      return res;
    }

    // miễn choáng (Hoá Khổng Lồ / armorT: Nắm Đấm Sắt, Đội Trưởng) trước khi tới các Core có onHit
    blockHit(victim, opts) {
      // Hoá Khổng Lồ: miễn choáng
      if (victim.titanT > 0 && (opts.stun || 0) > 0) {
        this.g.effects.burst(victim.x, victim.y, 12, '#ffd23f', 6, 60, 0.3);
        return true;
      }
      if (victim.armorT > this.g.time && (opts.stun || 0) > 0) {
        const E = this.g.effects;
        E.comic(victim.x, victim.y - 28, 'CLANG!', '#c7ccd6', 0.9);
        E.shield(victim.x, victim.y - 8, 12, '#c7ccd6', 0.4);
        E.burst(victim.x, victim.y, 8, '#ffffff', 10, 90);
        E.ring(victim.x, victim.y - 8, '#c7ccd6');
        this.g.sfx('block');
        return true;
      }
      return this.dispatch(victim.team, 'onHit', victim, opts);
    }
    goalLine(ball, defTeam) { return this.dispatch(defTeam, 'onGoalLine', ball); }
    wallHit(ball, side) {
      if (ball.lastKickTeam < 0) return false;
      const k = ball.lastTouch && ball.lastTouch.team === ball.lastKickTeam ? ball.lastTouch : null;   // Core của người vừa đá
      return k ? this.dispatchFor(k, 'onWallHit', ball, side) : this.dispatch(ball.lastKickTeam, 'onWallHit', ball, side);
    }
    shieldReady(team) { return this.has(team, 'aegis_wall') && !!this.st(team, 'aegis_wall').ready; }

    /* ---------- sự kiện từ gameplay (match / actions / player gọi vào) ---------- */
    // đường chuyền tới chân đồng đội -> chuỗi chuyền của đội (Giao Hưởng); hook chạy trên Core của NGƯỜI CHUYỀN
    passReceived(receiver, passer) {
      const t = receiver.team, g = this.g;
      receiver.recvT = g.time;
      if (passer) {
        g.passChain[t]++;
        // có Giao Hưởng trong đội: hiện số đường chuyền liên tiếp (số vàng + vòng sáng) trên đầu người nhận
        if (g.passChain[t] >= 2 && this.has(t, 'symphony')) {
          g.effects.text(receiver.x, receiver.y - 30, String(g.passChain[t]), '#ffd23f');
          g.effects.ring(receiver.x, receiver.y - 6, '#ffd23f');
        }
        this.dispatchFor(passer, 'onPassReceived', receiver, passer);
      }
    }
    // đội mất quyền kiểm soát bóng -> mất chuỗi chuyền
    possessionLost(team) { this.g.passChain[team] = 0; }
    lightHit(attacker, victim) {
      // combo đấm: cú đấm trúng trong ~1.2s sau cú trước (Võ Đường Phố to chữ dần, Long Quyền xem landT)
      const g = this.g;
      attacker.punchCombo = attacker.landT >= 0 && g.time - attacker.landT <= 1.2 ? (attacker.punchCombo || 0) + 1 : 1;
      attacker.landT = g.time;
      // năng lượng Tuyệt kỹ từ đấm trúng: tối đa 1 lần mỗi lightHitCooldown giây (Bão Đấm / Tâng Người đánh nhiều nhịp không nạp dồn)
      const ul = this.st(attacker, '_ultLight'), U2 = DEF().ultimate;
      if (!(ul.cd > 0)) { ul.cd = U2.lightHitCooldown || 0; this.gainUlt(attacker, U2.gainLightHit || 0); }
      this.dispatch(attacker.team, 'onLightHit', attacker, victim);
    }
    hardHit(attacker, victim) { this.dispatch(attacker.team, 'onHardHit', attacker, victim); }
    // bị hất văng vào tường: attacker = người gây ra (có thể null)
    wallBonk(victim, attacker) {
      const t = attacker ? attacker.team : 1 - victim.team;
      this.dispatch(t, 'onWallBonk', attacker, victim);
    }
    // Z xuyên qua đòn đánh
    dodge(p) { this.dispatch(p.team, 'onDodge', p); }
    chargedShot(p, ball, held) { this.dispatch(p.team, 'onChargedShot', p, ball, held); }
    steal(p) {
      // năng lượng Tuyệt kỹ từ cướp bóng: tối đa 1 lần mỗi stealCooldown giây (mỗi người)
      const st = this.st(p, '_ultSteal'), U2 = DEF().ultimate;
      if (!(st.cd > 0)) {
        st.cd = U2.stealCooldown || 0;
        // chữ "+ULT" trên đầu người cướp được bóng (năng lượng Tuyệt kỹ của người đó vừa tăng)
        if (this.ultOf(p) && this.ultE(p) < 1 && !(this.st(p, '_ultLock').cd > 0)) this.g.effects.text(p.x, p.y - 34, '+ULT', '#ffd23f');
        this.gainUlt(p, U2.gainSteal);
      }
      this.dispatch(p.team, 'onSteal', p);
    }
    goalScored(team, scorer) {
      const U2 = DEF().ultimate;
      for (const p of this.g.teams[team].players) this.gainUlt(p, U2.gainGoal);
      for (const p of this.g.teams[1 - team].players) this.gainUlt(p, U2.gainConceded || 0);   // đội bị thủng lưới cũng được nạp
      this.dispatch(team, 'onGoalScored', scorer);
    }
    kickoff() {
      this.endTasks();
      for (const p of this.g.players) { p.sprintT = 0; p.surge = false; p.ballT = 0; p.bullT = 0; p.armorT = 0; p.ghostT = 0; p.landT = -1; p.punchCombo = 0; }
      for (let t = 0; t < 2; t++) this.dispatch(t, 'onKickoff');
    }

    /* ---------- Tuyệt kỹ (mỗi cầu thủ 1 Tuyệt kỹ, năng lượng riêng: p.res.ult 0..1) ---------- */
    // Tuyệt kỹ của cầu thủ; số đội -> Tuyệt kỹ của người điều khiển / người đầu tiên có (HUD)
    ultOf(x) {
      for (const p of isP(x) ? [x] : this.ultOrder(x)) {
        const id = this.coresOf(p).find((c) => this.def(c).role === 'ult');
        if (id) return id;
      }
      return null;
    }
    ultOrder(team) {
      const h = this.humanOwner(team), list = this.plist(team);
      return h ? [h].concat(list.filter((p) => p !== h)) : list;
    }
    ultE(p) { return (p && p.res.ult) || 0; }
    // năng lượng Tuyệt kỹ hiển thị cho đội (HUD): người điều khiển nếu có Tuyệt kỹ, không thì người có năng lượng cao nhất
    teamUlt(team) {
      let v = 0;
      for (const p of this.ultOrder(team)) {
        if (!this.ultOf(p)) continue;
        if (this.isHumanOwner(p)) return this.ultE(p);
        v = Math.max(v, this.ultE(p));
      }
      return v;
    }
    // năng lượng Tuyệt kỹ: trận có công thức thì nạp cả khi chưa có Tuyệt kỹ (nạp ngầm, vừa đạt công thức là dùng được ngay);
    // đổi Tuyệt kỹ giữ năng lượng. Trận mơ / không công thức: chỉ nạp khi đã có Tuyệt kỹ
    gainUlt(p, amt) {
      if (!isP(p) || (!this.ultOf(p) && !this.recipesOn()) || this.st(p, '_ultLock').cd > 0) return;   // dùng xong: khoá nạp ultimate.lockout giây
      p.res.ult = Math.min(1, this.ultE(p) + amt);
    }
    ultReady(p) { return isP(p) && !!this.ultOf(p) && this.ultE(p) >= 1; }
    // Tuyệt kỹ cần bóng (list[id].needsBall): chỉ dùng được khi đội mình đang cầm bóng (không bao giờ giật bóng)
    // noBall (Iron Hammer): ngược lại, chỉ dùng được khi chính mình KHÔNG cầm bóng
    ultBlocked(p) {
      const id = this.ultOf(p), b = this.g.ball;
      if (!id) return false;
      const d = this.def(id);
      return !!((d.needsBall && !(b.owner && b.owner.team === p.team)) || (d.noBall && b.owner === p));
    }

    /* ---------- Tuyệt kỹ theo công thức (cores.config.js -> ults, docs/ULT_RECIPE.md) ---------- */
    // trận mơ PROLOGUE tự trao Tuyệt kỹ theo kịch bản; ảnh xem trước / sandbox (noUlts) không đổi Tuyệt kỹ
    recipesOn() { const o = this.g.opts || {}; return !o.tutorial && !o.noUlts && !this.g.preview; }
    // khoá công thức 'id:cấp' (sổ Tuyệt kỹ — Profile.data.ultBook)
    static ultKey(id, lv) { return id + ':' + (lv || 1); }
    // số Core từng trường phái của p (+ extra: lá giả định thêm vào — xem trước ở lượt chọn); bỏ Tuyệt kỹ + HỖN LOẠN
    schoolCounts(p, extra) {
      const n = {};
      for (const id of this.coresOf(p).concat(extra && !this.coresOf(p).includes(extra) ? [extra] : [])) {
        const d = this.def(id);
        if (!d || d.role === 'ult') continue;
        for (const t of d.tags) if (ARCH()[t] && !ARCH()[t].noSet) n[t] = (n[t] || 0) + 1;
      }
      return n;
    }
    // mọi công thức đang thoả với bảng số Core counts: [{ id, lv, n (số Core công thức cần), tags }]
    recipes(counts) {
      const R = ULTS(), out = [];
      for (const tag in R.base) {
        const c = counts[tag] || 0;
        let lv = 0;
        R.tiers.forEach((m, i) => { if (c >= m) lv = i + 1; });
        if (lv) out.push({ id: R.base[tag], lv, n: R.tiers[lv - 1], tags: [tag] });
      }
      for (const h of R.hybrids || []) {
        const m = R.hybridTier || 2;   // X2 + Y2
        if (h.tags.every((t) => (counts[t] || 0) >= m)) out.push({ id: h.id, lv: 1, n: m * h.tags.length, tags: h.tags });
      }
      return out.filter((r) => this.def(r.id));
    }
    // Tuyệt kỹ p sẽ có (sau khi thêm extra, nếu có): công thức dùng nhiều Core nhất; bằng nhau -> công thức có trường phái
    // của lá vừa lấy (last), rồi tới Tuyệt kỹ đang có. Trả { id, lv } khi KHÁC Tuyệt kỹ hiện tại, không thì null
    bestRecipe(p, extra, last) {
      const list = this.recipes(this.schoolCounts(p, extra));
      if (!list.length) return null;
      const lt = this.tagsOf(last || extra), cur = this.ultOf(p), lv = p.ultLv || 1;
      const score = (r) => r.n * 10 + (r.tags.some((t) => lt.includes(t)) ? 2 : 0) + (r.id === cur ? 1 : 0);
      const best = list.reduce((a, b) => (score(b) > score(a) ? b : a));
      return best.id === cur && best.lv === lv ? null : { id: best.id, lv: best.lv };
    }
    // đổi Tuyệt kỹ của p (giữ năng lượng) + báo sự kiện 'ultUnlock' (UI: banner, sổ Tuyệt kỹ)
    setUlt(p, id, lv = 1) {
      const own = this.own[p.id] || (this.own[p.id] = []);
      const prev = this.ultOf(p), prevLv = p.ultLv || 1;
      for (let i = own.length - 1; i >= 0; i--) if (this.def(own[i]).role === 'ult') own.splice(i, 1);
      own.push(id);
      p.ult = id;
      p.ultLv = lv;
      const b = Behaviors[id];
      if (b && b.onAdd) b.onAdd(this, p.team, this.sp(id, p));
      this.g.emit('ultUnlock', { team: p.team, pid: p.id, id, lv, evolved: prev === id && lv > prevLv });
    }
    // Tuyệt kỹ khởi đầu của mọi cầu thủ (chưa đạt công thức nào)
    startUlt() { const id = ULTS().start; return this.def(id) ? id : null; }

    // ra Tuyệt kỹ: cut-in (dừng hình) rồi mới thực hiện. activateUltimate(p) hoặc activateUltimate(đội, p)
    activateUltimate(a, b) {
      const p = isP(a) ? a : b;
      const g = this.g, id = p && this.ultOf(p);
      // Tuyệt kỹ nhiều lần dùng (Earth Spike): còn lượt thì bấm X là ra tiếp, không cần năng lượng / cut-in
      const rb = id && Behaviors[id];
      if (rb && rb.recast && g.state === 'play' && !(g.stopT > 0) && rb.recast(this, p.team, this.sp(id, p), p)) return true;
      if (!id || this.ultE(p) < 1 || g.state !== 'play' || g.stopT > 0 || p.state !== 'normal' || p.airZ > 0 || this.ultBlocked(p)) return false;
      const team = p.team, def = this.def(id), U2 = DEF().ultimate, lv = p.ultLv || 1;
      const color = def.color || (ARCH()[def.tags[0]] ? ARCH()[def.tags[0]].color : '#ffe14f');
      p.res.ult = 0;
      this.st(p, '_ultLock').cd = U2.lockout || 0;
      // cut-in: tên + sao tiến hoá (cut-in hiện tên Tuyệt kỹ của mọi người, kể cả đối thủ — người chơi thấy là muốn thử)
      g.effects.cutIn(p.id, def.name.toUpperCase() + (lv > 1 ? ' ' + '★'.repeat(lv) : ''), color, U2.cutIn);
      g.hitStop(U2.cutIn);
      g.sfx('upgrade');
      g.later(U2.cutIn, () => {
        const bh = Behaviors[id];
        if (!bh || !bh.onUltimate || g.state !== 'play') return;
        // dạng nâng cấp: thêm lớp hình (vòng sóng màu trường phái, chớp sáng, hào quang)
        if (lv >= 2) {
          g.effects.wave(p.x, p.y, 34 + lv * 10, color, 0.5, lv);
          g.effects.burst(p.x, p.y, 10, color, 10 + lv * 6, 120, 0.6);
          g.effects.flash(0.3);
          p.glow(color, 2);
        }
        bh.onUltimate(this, team, this.sp(id, p), p);
      });
      g.emit('ultimate', { team, id, player: p.name });
      return true;
    }

    /* ---------- cập nhật mỗi bước ---------- */
    update(dt) {
      const g = this.g;
      if (this.tasks.length) {
        for (const t of this.tasks.slice()) {
          if (t.fn(dt)) { this.tasks.splice(this.tasks.indexOf(t), 1); if (t.onEnd) t.onEnd(); }
        }
      }
      for (const k in this.state) {
        const s = this.state[k];
        for (const id in s) if (s[id].cd > 0 && id !== 'aegis_wall') s[id].cd -= dt;
      }
      for (let t = 0; t < 2; t++) {
        for (const p of g.teams[t].players) {
          for (const id of this.coresOf(p)) {
            const b = Behaviors[id];
            if (b && b.update) b.update(this, t, this.sp(id, p), dt);
          }
          const bf = this.buffs[p.id];
          if (bf && bf.length) {
            bf.forEach((x) => (x.t -= dt));
            this.buffs[p.id] = bf.filter((x) => x.t > 0);
          }
          this.updateStates(p, dt);
          this.aiUltimate(p, dt);
        }
      }
    }

    // trạng thái nhìn thấy được thay cho tài nguyên: TOÉ ĐIỆN, Xe Ủi hoá to, nắm tay sáng (máy khách online đọc p.surge / p.fistRdy / sizeMul)
    updateStates(p, dt) {
      const g = this.g;
      // chạy nước rút liên tục (đứng lại / bị choáng là về 0)
      p.sprintT = p.sprinting && p.state === 'normal' ? (p.sprintT || 0) + dt : 0;
      p.surge = (p.sprintT >= this.surgeTime(p) && this.tagCount(p, 'runner') > 0) || (g.preview && !!p.previewSurge && p.sprinting);   // ảnh xem trước: toé điện ngay
      // Mirage Sprint: hết giờ tàng hình
      if (p.ghostT > 0) p.ghostT = Math.max(0, p.ghostT - dt);
      // giữ bóng liên tục (Xe Ủi)
      p.ballT = p.hasBall ? (p.ballT || 0) + dt : 0;
      if (this.has(p, 'bulldozer')) {
        const prm = this.sp('bulldozer', p), st = this.st(p, 'bulldozer');
        if (p.bullT > 0) {
          p.bullT -= dt;
          if (!p.hasBall || p.state !== 'normal') p.bullT = 0;
          if (p.bullT <= 0) { p.bullT = 0; st.cd = prm.cooldown; }
        } else if (p.ballT >= prm.hold && !(st.cd > 0) && p.state === 'normal') {
          p.bullT = prm.time;
          g.effects.burst(p.x, p.y, 8, '#c7ccd6', 10, 80, 0.4);
          g.sfx('block');
        }
      }
      p.fistRdy = (this.has(p, 'giant_fist') && !(this.st(p, 'giant_fist').cd > 0)) || this.ironFist(p);
    }

    // AI tự ra Tuyệt kỹ (mọi cầu thủ không do người điều khiển — cả đồng đội của người chơi) sau một khoảng trễ ngẫu nhiên
    aiUltimate(p, dt) {
      const g = this.g, k = p.id;
      if (this.isHumanOwner(p) || g.state !== 'play' || !this.ultReady(p)) { this.aiUltT[k] = 0; return; }
      if (!this.aiUltT[k]) { const d = DEF().ultimate.aiDelay; this.aiUltT[k] = U.rand(d[0], d[1]); return; }
      if ((this.aiUltT[k] -= dt) > 0) return;
      const id = this.ultOf(p), b = Behaviors[id];
      // aiUse trả về người ra chiêu; Tuyệt kỹ là của riêng p nên chỉ nhận khi đúng là p
      const who = b && b.aiUse ? b.aiUse(this, p.team, this.sp(id, p)) : null;
      if (who === p) this.activateUltimate(p);
      else this.aiUltT[k] = 0.4; // chưa có thời cơ -> thử lại sau
    }

    /* ---------- chọn Core (mỗi cầu thủ bốc riêng) ---------- */
    // Core cầu thủ được bốc: người chơi = Core đã mở khoá (opts.coreUnlocks theo đội); đồng đội có deck = deck; còn lại = tất cả
    // (slot online: p.unlocks = Core đã mở khoá của character ở slot đó, giữ cả khi người chơi rời trận)
    allowList(p) {
      if (p.deck) return p.deck;
      if (p.unlocks) return p.unlocks;
      const u = this.g.opts && this.g.opts.coreUnlocks;
      return this.isHumanOwner(p) && u ? u[p.team] || null : null;
    }
    // trọng số 1 lá: độ hiếm x (1 + buildWeight x số Core cùng trường phái của người đó) x thiên hướng đội
    weight(p, id) {
      const D = DEF().draft, c = this.def(id);
      const style = this.g.teams[p.team].cfg.coreWeights || {};
      const shared = c.tags.reduce((n, tag) => Math.max(n, this.tagCount(p, tag)), 0);
      const lean = c.tags.reduce((m, tag) => Math.max(m, style[tag] || 1), 0);
      // boss cầm Core đặc trưng: nghiêng về trường phái của Core đó (đủ lá cho Cộng hưởng / Tuyệt kỹ)
      const sig = this.signature(p), sigLean = sig && c.tags.some((tag) => this.tagsOf(sig).includes(tag)) ? 2 : 1;
      return (D.rarityWeight[c.rarity] || 1) * (1 + D.buildWeight * shared) * lean * sigLean;
    }
    // Core đặc trưng (boss trận thăng hạng): thuộc về ngôi sao của đội = cầu thủ ĐÁ CAO (không có thì người đầu)
    signature(p) {
      const s = this.g.opts && this.g.opts.signature, id = s && s[p.team];
      if (!id || !this.def(id)) return null;
      const list = this.g.teams[p.team].players, star = list.find((q) => q.role === 'FWD') || list[0];
      return star === p ? id : null;
    }
    // Tuyệt kỹ không còn là lá để chọn: mở theo công thức (bestRecipe)
    eligible(p, id) { return this.def(id).role !== 'ult'; }
    pool(p, exclude = []) {
      const allow = this.allowList(p);
      return Object.keys(DEF().list).filter((id) => !this.has(p, id) && !exclude.includes(id)
        && (!allow || allow.includes(id)) && this.eligible(p, id));
    }

    // N lá theo trọng số build (không bảo đảm có lá cùng hướng — ra đúng build là may mắn)
    rollOptions(p, n, exclude = []) {
      let pool = this.pool(p, exclude);
      if (pool.length < n) pool = this.pool(p); // hết bài mới thì cho ra lại lá vừa đổi
      const out = [];
      while (out.length < n && pool.length) {
        const id = U.weightedPick(pool, (x) => this.weight(p, x));
        out.push(id);
        pool = pool.filter((x) => x !== id);
      }
      const ownedTags = new Set(this.coresOf(p).flatMap((id) => this.tagsOf(id)));
      const matches = (id) => this.tagsOf(id).some((tag) => ownedTags.has(tag));
      // Core vừa mở khoá (opts.coreFresh, chỉ người chơi): lượt nào cũng đưa 1 lá chưa hiện vào, nhãn NEW
      const fresh = this.isHumanOwner(p) && this.g.opts && this.g.opts.coreFresh && this.g.opts.coreFresh[p.team];
      const shown = this.newShown[p.id] || (this.newShown[p.id] = new Set());
      const nu = fresh && fresh.find((id) => !shown.has(id) && !exclude.includes(id) && this.pool(p).includes(id));
      if (nu && !out.includes(nu)) {
        // bỏ 1 lá không khớp build (giữ lá hợp hướng), lá NEW đứng đầu
        if (out.length >= n) { const k = out.findIndex((id) => !matches(id)); out.splice(k >= 0 ? k : out.length - 1, 1); }
        out.unshift(nu);
      }
      if (nu) shown.add(nu);
      return out;
    }

    // AI (đồng đội + đối thủ): bốc 3 lá rồi chọn lá khớp build nhất (lá mở / tiến hoá Tuyệt kỹ được ưu tiên)
    aiPick(p) {
      // boss: tới lượt signatureRound thì lấy thẳng Core đặc trưng (Tuyệt kỹ: bỏ qua điều kiện 2 Core cùng trường phái)
      const sig = this.signature(p);
      if (sig && !this.has(p, sig) && !(this.def(sig).role === 'ult' && this.ultOf(p))) {
        const R = SFC_CONFIG.mainPath.signatureRound || {};
        if (this.g.upgradeIdx >= (this.def(sig).role === 'ult' ? R.ult || 3 : R.core || 1)) { this.add(p, sig); return sig; }
      }
      const opts = this.rollOptions(p, SFC_CONFIG.game.match.upgradeChoices);
      if (!opts.length) return null;
      const id = U.weightedPick(opts, (x) => (this.recipesOn() && this.bestRecipe(p, x) ? 4 : 1) * this.weight(p, x));
      this.add(p, id);
      return id;
    }
  }

  SFC.CoreSystem = CoreSystem;
})();
