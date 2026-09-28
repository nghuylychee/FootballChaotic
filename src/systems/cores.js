/* Core Upgrade System (docs/CORE_DESIGN.md)
 * - Trường phái (tags) + Cộng hưởng 2 / 3 / 4 (SET_RULES), tài nguyên (Đà, Nhịp, Nộ, Giáp), Tuyệt kỹ (phím X, năng lượng g.ult)
 * - mods thụ động lấy từ config (cores.config.js -> mods); pmod(p, key) = mods + bonus động theo tài nguyên / Cộng hưởng
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
  // cộng tài nguyên Đà cho cầu thủ (chỉ khi đội có trường phái TỐC ĐỘ) và giữ Đà thêm hold giây
  function addMomentum(sys, pl, n, hold = 0) {
    if (!sys.resActive(pl.team, 'momentum')) return;
    pl.res.momentum = Math.min(sys.resMax(pl.team, 'momentum'), pl.res.momentum + n);
    pl.resT.idle = -hold;
  }

  const PUNCH_WORDS = ['POW!', 'BAM!', 'WHAM!', 'BOP!'];
  const CHAOS_SKINS = ['melon', 'bowling', 'chicken', 'wheel', 'cube'];
  const CHAOS_LABEL = { curve: 'CONG!', rocket: 'TÊN LỬA!', fire: 'LỬA!', thunder: 'SÉT!', split: 'x2!' };

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
    // Quỷ Tốc Độ: Đà gấp đôi (mods.momentumGain) — vệt tàn ảnh xanh vẽ ở render/vfx.js
    // Thuấn Bộ: biến mất trong khói, dịch chuyển xa thêm, để lại ảo ảnh tại chỗ cũ
    phantom_step: {
      onSkillMove(sys, team, p, pl, d) {
        const g = sys.g, f = g.field, E = g.effects;
        const ox = pl.x, oy = pl.y;
        E.clone(pl.id, ox, oy, 0, 0, p.illusion + (sys.tier(team, 'trickster') >= 2 ? 1 : 0));
        // đang cầm bóng: đối thủ (máy) gần đó lao vào ảo ảnh
        const st = sys.st(team, 'phantom_step');
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
    // Chạy Giả: ảo ảnh tím dắt bóng giả chạy hướng khác + 2 Đà
    fake_run: {
      onSprintStart(sys, team, p, pl) { this.trigger(sys, team, p, pl); },
      onSkillMove(sys, team, p, pl) { this.trigger(sys, team, p, pl); },
      trigger(sys, team, p, pl) {
        const st = sys.st(team, 'fake_run');
        if ((st.cd || 0) > 0 || !pl.hasBall) return;
        st.cd = p.cooldown;
        spawnDecoy(sys, team, pl, p);
        addMomentum(sys, pl, p.momentum);
      },
    },

    /* ---------- 🥊 ĐẤU SĨ · 🛡 THÉP · 🦵 VÕ SĨ ĐÁ ---------- */
    // Võ Đường Phố: chữ comic to theo Nộ (nắm tay bốc lửa vẽ ở render/vfx.js), cướp bóng +1 Nộ
    street_fighter: {
      onLightHit(sys, team, p, a, v) {
        if (a.lastPunch && (a.lastPunch.big || a.lastPunch.upper)) return;   // cú đặc biệt có chữ riêng
        const r = a.res.rage;
        sys.g.effects.comic(v.x + U.rand(-6, 6), v.y - 24, U.pick(PUNCH_WORDS), r >= 4 ? '#ff3d5a' : r >= 2 ? '#ff7a3d' : '#ffe14f', 0.7 + r * 0.08, 0.55);
      },
      onTackleWin(sys, team, p, a) {
        if (sys.resActive(team, 'rage')) a.res.rage = Math.min(RES().rage.max, a.res.rage + p.rageOnSteal);
      },
    },
    // Da Thép: mỗi cầu thủ 1 Giáp, mất thì tự hồi sau regen giây
    iron_body: {
      onAdd(sys, team) { for (const pl of sys.g.teams[team].players) pl.res.guard = Math.max(pl.res.guard, 1); },
      update(sys, team, p, dt) {
        for (const pl of sys.g.teams[team].players) {
          if (pl.res.guard >= 1) { pl.resT.iron = 0; continue; }
          if ((pl.resT.iron += dt) >= p.regen) {
            pl.resT.iron = 0;
            pl.res.guard = 1;
            sys.g.effects.shield(pl.x, pl.y - 8, 10, '#c7ccd6', 0.35);
          }
        }
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
    // Phản Công: cướp được bóng -> cả đội +3 Đà, tăng tốc + lực sút, hào quang xanh, callout
    counter_attack: {
      onSteal(sys, team, p, pl) {
        const g = sys.g, E = g.effects;
        sys.buffs[team].push({ speed: p.speedMult, shotPower: p.shotMult, t: p.duration });
        for (const m of g.teams[team].players) {
          addMomentum(sys, m, p.momentum, 2);
          m.glow('#3ff6ff', p.duration);
        }
        const st = sys.st(team, 'counter_attack');
        if (!(st.cd > 0)) {
          st.cd = p.calloutCd;
          E.callout('PHẢN CÔNG!', '#3ff6ff', 1);
          E.speedLines(0.45, pl.x, pl.y, '#bdf4ff');
          g.sfx('whistle');
        } else E.comic(pl.x, pl.y - 28, 'COUNTER!', '#3ff6ff', 0.75, 0.6);
      },
    },
    // Mìn EMP: mìn + nổ điện ở systems/effects.js
    emp_trap: {
      onTackle(sys, team, p, pl) {
        const st = sys.st(team, 'emp_trap');
        if ((st.cd || 0) > 0) return;
        st.cd = p.cooldown;
        sys.g.effects.mine(pl.x, pl.y, team, p, pl);
      },
    },
    // Nhạc Trưởng: bóng kéo dây đàn vàng; người nhận hào quang vàng + tăng tốc + 1 Nhịp
    maestro: {
      onPass(sys) { sys.g.ball.fx.string = true; },
      onPassReceived(sys, team, p, rc) {
        const g = sys.g;
        rc.buffs.push({ speed: p.speedMult, t: p.duration });
        rc.glow('#ffd23f', p.duration);
        g.rhythm[team] = Math.min(RES().rhythm.max, g.rhythm[team] + p.rhythm);
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
    // Tuyệt kỹ thí điểm: Tia Chớp Xuyên Sân
    lightning_dash: {
      aiUse(sys, team) {
        const b = sys.g.ball;
        return b.owner && b.owner.team === team && b.owner.state === 'normal' ? b.owner : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, f = g.field, E = g.effects;
        // hướng: phím đang giữ, không giữ thì lao về phía khung thành đối phương
        let dx = pl.intent.mx, dy = pl.intent.my;
        if (Math.hypot(dx, dy) < 0.2) { const goal = g.attackGoal(team); dx = goal.x - pl.x; dy = goal.y - pl.y; }
        const d = U.norm(dx, dy);
        const x0 = pl.x, y0 = pl.y;
        const x1 = U.clamp(x0 + d.x * prm.distance, f.x + 8, f.x + f.w - 8), y1 = U.clamp(y0 + d.y * prm.distance, f.y + 8, f.y + f.h - 8);
        E.tint('#0a1830', 0.5, 0.4);
        g.slowMo(0.35, 0.3);
        for (let i = 0; i < 3; i++) E.bolt(x0, y0 - 8 + i * 2, x1, y1 - 6, i ? '#7fe7ff' : '#ffffff', 0.5);
        const len = Math.hypot(x1 - x0, y1 - y0);
        for (let k = 0; k < len; k += 14) E.decal('scorch', x0 + (d.x * k), y0 + (d.y * k), 0.7, 2.5);
        for (const o of g.teams[1 - team].players) {
          if (U.segDist(o.x, o.y, x0, y0, x1, y1) > prm.width || g.isProtected(o)) continue;
          const side = (o.x - x0) * -d.y + (o.y - y0) * d.x >= 0 ? 1 : -1;
          o.hitImmune = 0;
          o.hit({ stun: prm.stun, kbx: -d.y * side * prm.knock, kby: d.x * side * prm.knock, source: pl, type: 'slash' });
          E.bolt(o.x, o.y - 22, o.x, o.y - 2, '#bdf4ff', 0.4);
          E.burst(o.x, o.y, 8, '#bdf4ff', 12, 90);
        }
        E.afterimage(pl);
        pl.x = x1; pl.y = y1;
        if (g.ball.owner === pl) g.ball.follow(0);
        g.hitStop(0.08);
        E.impactFrame();
        E.speedLines(0.4);
        E.shake(6, 0.35);
        g.sfx('zap');
      },
    },
  };

  SFC.CoreHelpers = { applyFire, applyThunder, addMomentum, spawnDecoy };

  /* ---------- Cộng hưởng: luật theo trường phái + bậc (2 / 3 / 4) ---------- */
  const ARCH = () => DEF().archetypes;
  const RES = () => DEF().resources;

  class CoreSystem {
    constructor(g) {
      this.g = g;
      this.owned = [[], []];
      this.state = [{}, {}];
      this.buffs = [[], []];
      this.aiUltT = [0, 0];
      this.tasks = [];
    }
    // việc chạy mỗi bước mô phỏng (chỉ lúc đang đá); fn(dt) trả true = xong; onEnd chạy khi xong / bị huỷ lúc giao bóng
    task(fn, onEnd) { this.tasks.push({ fn, onEnd }); }
    endTasks() {
      const list = this.tasks; this.tasks = [];
      for (const t of list) if (t.onEnd) t.onEnd();
    }
    def(id) { return DEF().list[id]; }
    has(team, id) { return this.owned[team].includes(id); }
    params(id) { return (this.def(id) && this.def(id).params) || {}; }
    st(team, id) { return this.state[team][id] || (this.state[team][id] = {}); }
    tagsOf(id) { const d = this.def(id); return (d && d.tags) || []; }

    add(team, id) {
      if (!this.def(id) || this.has(team, id)) return;
      this.owned[team].push(id);
      const b = Behaviors[id];
      if (b && b.onAdd) b.onAdd(this, team, this.params(id));
    }

    /* ---------- trường phái / Cộng hưởng ---------- */
    tagCount(team, tag) {
      if (team < 0) return 0;
      let n = 0;
      for (const id of this.owned[team]) if (this.tagsOf(id).includes(tag)) n++;
      return n;
    }
    // bậc Cộng hưởng đang có: 0 (chưa có) · 2 · 3 · 4
    tier(team, tag) {
      if (ARCH()[tag] && ARCH()[tag].noSet) return 0;
      const n = this.tagCount(team, tag);
      return n >= 4 ? 4 : n >= 3 ? 3 : n >= 2 ? 2 : 0;
    }
    // danh sách Cộng hưởng đang kích hoạt: [{ tag, count, tier }]
    traits(team) {
      return Object.keys(ARCH()).filter((t) => !ARCH()[t].noSet)
        .map((tag) => ({ tag, count: this.tagCount(team, tag), tier: this.tier(team, tag) }))
        .filter((x) => x.count > 0)
        .sort((a, b) => b.count - a.count);
    }
    // trường phái đạt bậc 4 (đổi hình thái cả đội)
    formOf(team) { const t = this.traits(team).find((x) => x.tier >= 4); return t ? t.tag : null; }
    // tài nguyên chạy khi đội có Core của trường phái sinh ra nó
    resActive(team, res) {
      return Object.keys(ARCH()).some((tag) => ARCH()[tag].resource === res && this.tagCount(team, tag) > 0);
    }
    resMax(team, res) {
      const m = RES()[res].max;
      return res === 'momentum' && this.tier(team, 'runner') >= 2 ? m + 1 : m;
    }

    /* ---------- hệ số ---------- */
    mod(team, key) {
      if (team < 0) return 1;
      let m = 1;
      for (const id of this.owned[team]) {
        const mods = this.def(id).mods;
        if (mods && mods[key] != null) m *= mods[key];
      }
      for (const b of this.buffs[team]) if (b[key]) m *= b[key];
      return m;
    }

    // hệ số theo cầu thủ = mods của đội x bonus động (tài nguyên đang có + Cộng hưởng)
    pmod(p, key) {
      const t = p.team;
      let m = this.mod(t, key);
      if (t < 0) return m;
      const R = RES(), mo = p.res.momentum, runner4 = this.tier(t, 'runner') >= 4;
      switch (key) {
        case 'speed':
          m *= 1 + mo * R.momentum.speedPer + p.res.rage * R.rage.speedPer;
          if (p.hasBall && p.res.guard > 0 && this.has(t, 'bulldozer')) m *= this.params('bulldozer').slow;   // Xe Ủi: nặng nề
          break;
        case 'shotPower':
          if (this.tier(t, 'striker') >= 2) m *= 1.15;
          if (p.titanT > 0) m *= this.params('titan').shot;
          if (runner4) m *= 1 + mo * 0.01;
          break;
        case 'passSpeed':
          m *= 1 + this.g.rhythm[t] * R.rhythm.passSpeedPer;
          if (runner4) m *= 1 + mo * 0.01;
          break;
        case 'tackleChance': m *= 1 + p.res.rage * R.rage.stealPer; break;
        case 'launch': if (this.tier(t, 'launcher') >= 2) m *= 1.25; break;
        case 'hardCooldown':
          if (this.tier(t, 'launcher') >= 2) m *= 0.85;
          if (this.tier(t, 'launcher') >= 4) m *= 0.6;
          break;
        case 'lightStun': if (this.tier(t, 'brawler') >= 4) m *= 1.5; break;
        case 'keeperSave': if (this.tier(t, 'iron') >= 4) m *= 1.2; break;
      }
      return m;
    }

    // ngưỡng "Sút tụ lực" (giữ bao nhiêu thanh lực)
    chargedThreshold(team) { return this.tier(team, 'striker') >= 3 ? 0.4 : DEF().chargedShot; }
    // hệ số tốn thể lực khi chạy nước rút (TỐC ĐỘ 3 khi Đà tối đa: -25%)
    sprintDrain(p) { return p.team >= 0 && this.tier(p.team, 'runner') >= 3 && p.res.momentum >= this.resMax(p.team, 'momentum') ? 0.75 : 1; }
    // TIKI-TAKA 4: đủ 5 Nhịp thì đường chuyền không thể bị cắt
    passShielded(team) { return team >= 0 && this.tier(team, 'playmaker') >= 4 && this.g.rhythm[team] >= RES().rhythm.max; }

    /* ---------- AI dùng Core (systems/ai.js) ---------- */
    // mức "giữ lực" cần để kích hoạt Core sút của đội (Hoả Cầu / Lôi Cước / Chưởng Sóng / Lỗ Đen...), 0 = không có
    aiShotCharge(team) {
      let c = 0;
      if (this.has(team, 'fire_shot') || this.has(team, 'one_two')) c = Math.max(c, this.chargedThreshold(team));
      if (this.has(team, 'thunder_kick')) c = Math.max(c, this.params('thunder_kick').minCharge);
      for (const id of ['energy_wave', 'black_hole']) if (this.has(team, id)) c = Math.max(c, this.params(id).minCharge);
      return c ? Math.min(1, c + 0.03) : 0;
    }
    // có Core VÕ SĨ ĐÁ -> ra đòn Hard nhiều hơn; ẢO ẢNH -> lướt Z nhiều hơn
    aiHardMult(team) { return 1 + this.tagCount(team, 'launcher') * 0.8; }
    aiDodgeMult(team) { return 1 + this.tagCount(team, 'trickster') * 0.5; }

    /* ---------- truy vấn cho actions / match (Core Giai đoạn 3) ---------- */
    // tầm với của cú đấm (Tay Cao Su: vươn xa)
    lightReach(p) { return this.has(p.team, 'rubber_arm') ? this.params('rubber_arm').reach : 0; }
    // Một-Hai: sút ngay sau khi nhận đường chuyền = sút tụ lực tối đa
    volleyCharge(p) {
      if (!this.has(p.team, 'one_two') || !(p.recvT >= 0)) return 0;
      return this.g.time - p.recvT <= this.params('one_two').window ? 1 : 0;
    }
    // không thể bị cướp bóng: Xe Ủi (khi còn Giáp — đòn đánh kế đó vẫn tiêu Giáp như thường), Hoá Khổng Lồ
    unstealable(o) {
      return o.titanT > 0 || (o.team >= 0 && this.has(o.team, 'bulldozer') && o.res.guard > 0);
    }
    // Nắm Đấm Khổng Lồ: đủ Nộ thì cú đấm kế tiếp thành nắm đấm khổng lồ (tiêu hết Nộ)
    bigPunch(p) {
      if (!this.has(p.team, 'giant_fist') || p.res.rage < RES().rage.max) return false;
      p.res.rage = 0;
      return true;
    }
    // Long Quyền: đủ Nộ -> cú móc hàm hất tung (tiêu hết Nộ)
    uppercut(p) {
      if (!this.has(p.team, 'uppercut') || p.res.rage < RES().rage.max) return false;
      p.res.rage = 0;
      return true;
    }
    // Nắm Đấm Sắt: có Giáp -> người cầm bóng không trụ được
    ironFist(p) { return this.has(p.team, 'iron_fist') && p.res.guard > 0; }
    // Dậm Đất / Thiên Thạch Giáng: tiếp đất sau cú nhảy
    slamLand(p) {
      const b = Behaviors[p.slamKind === 'meteor' ? 'meteor_drop' : 'ground_slam'];
      if (b && b.land) b.land(this, p.team, this.params(p.slamKind === 'meteor' ? 'meteor_drop' : 'ground_slam'), p);
    }
    // khoảnh khắc đáng nhớ (màn kết quả "Khoảnh khắc của trận"): combo HIT cao, Tuyệt kỹ...
    moment(team, id, text, score) { this.g.emit('moment', { team, id, text, score }); }
    // Tâng Người: đấm trúng người đang bay -> tâng lên tiếp
    juggle(a, o) {
      const g = this.g, E = g.effects, prm = this.params('juggle');
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
    // hệ số thời gian bị choáng (Nắm Đấm Sắt: mỗi Nộ -8%)
    stunTaken(p) {
      if (p.team < 0 || !this.has(p.team, 'iron_fist')) return 1;
      return Math.max(0.5, 1 - p.res.rage * this.params('iron_fist').stunPerRage);
    }
    // trừ tỉ lệ bắt bóng của thủ môn theo cú sút (Giao Hưởng, Bóng Ma, Sao Băng, Đại Phân Thân...)
    keeperPenalty(ball) {
      let k = ball.gkMod || 0;
      const t = ball.lastKickTeam;
      if (t >= 0 && this.st(t, 'clone_army').t > this.g.time) k += this.params('clone_army').gkPenalty;
      return k;
    }

    dispatch(team, hook, ...args) {
      if (team < 0) return false;
      let res = false;
      for (const id of this.owned[team]) {
        const b = Behaviors[id];
        if (b && b[hook] && b[hook].call(b, this, team, this.params(id), ...args)) res = true;
      }
      return res;
    }

    // Giáp chặn 1 lần choáng trước khi tới các Core có onHit
    blockHit(victim, opts) {
      // Hoá Khổng Lồ: miễn choáng
      if (victim.titanT > 0 && (opts.stun || 0) > 0) {
        this.g.effects.burst(victim.x, victim.y, 12, '#ffd23f', 6, 60, 0.3);
        return true;
      }
      if (victim.res.guard > 0 && (opts.stun || 0) > 0) {
        victim.res.guard--;
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
    wallHit(ball, side) { return ball.lastKickTeam >= 0 && this.dispatch(ball.lastKickTeam, 'onWallHit', ball, side); }
    shieldReady(team) { return this.has(team, 'aegis_wall') && !!this.st(team, 'aegis_wall').ready; }

    /* ---------- sự kiện từ gameplay (match / actions / player gọi vào) ---------- */
    // đường chuyền tới chân đồng đội -> Nhịp
    passReceived(receiver, passer) {
      const t = receiver.team, g = this.g;
      receiver.recvT = g.time;
      if (this.resActive(t, 'rhythm')) {
        const gain = 1 + (this.tier(t, 'playmaker') >= 2 ? 1 : 0);
        g.rhythm[t] = Math.min(RES().rhythm.max, g.rhythm[t] + gain);
        g.rhythmT[t] = 0;
      }
      this.dispatch(t, 'onPassReceived', receiver, passer);
    }
    // đội mất quyền kiểm soát bóng -> mất Nhịp (TIKI-TAKA 3: 1 lần được giữ, hồi 10s)
    possessionLost(team) {
      const g = this.g;
      if (!g.rhythm[team]) return;
      const st = this.st(team, '_rhythmShield');
      if (this.tier(team, 'playmaker') >= 3 && !(st.cd > 0)) { st.cd = 10; return; }
      g.rhythm[team] = Math.max(0, g.rhythm[team] - RES().rhythm.turnoverLoss);
    }
    lightHit(attacker, victim) {
      const t = attacker.team;
      if (this.resActive(t, 'rage')) {
        const max = RES().rage.max;
        const before = attacker.res.rage;
        attacker.res.rage = Math.min(max, attacker.res.rage + 1);
        attacker.resT.rage = 0;
        // ĐẤU SĨ 3: chạm 5 Nộ -> đấm không hồi chiêu trong 2s
        if (before < max && attacker.res.rage >= max && this.tier(t, 'brawler') >= 3) {
          attacker.resT.frenzy = 2;
          this.g.effects.comic(attacker.x, attacker.y - 30, 'NỘ!', '#ff3d5a', 1.1);
        }
      }
      // ĐẤU SĨ 4: đấm trúng hồi thể lực
      if (this.tier(t, 'brawler') >= 4) attacker.stamina = Math.min(SFC_CONFIG.game.player.staminaMax, attacker.stamina + 5);
      this.dispatch(t, 'onLightHit', attacker, victim);
    }
    hardHit(attacker, victim) { this.dispatch(attacker.team, 'onHardHit', attacker, victim); }
    // bị hất văng vào tường: attacker = người gây ra (có thể null)
    wallBonk(victim, attacker) {
      const t = attacker ? attacker.team : 1 - victim.team;
      // VÕ SĨ ĐÁ 3: choáng lan ra đồng đội của nạn nhân ở gần
      if (this.tier(t, 'launcher') >= 3) {
        for (const o of this.g.teams[victim.team].players) {
          if (o === victim || Math.hypot(o.x - victim.x, o.y - victim.y) > 30) continue;
          o.hit({ stun: 0.6, kbx: 0, kby: 0, source: attacker, type: 'bonk' });
        }
        this.g.effects.wave(victim.x, victim.y, 30, '#b46bff', 0.35, 2);
      }
      this.dispatch(t, 'onWallBonk', attacker, victim);
    }
    // Z xuyên qua đòn đánh
    dodge(p) {
      if (this.tier(p.team, 'trickster') >= 3) p.cd.skill = 0; // ẢO ẢNH 3: né xong hồi Z ngay
      this.dispatch(p.team, 'onDodge', p);
    }
    chargedShot(p, ball, held) {
      // SÁT THỦ 2: sút tụ lực khó bắt hơn
      if (this.tier(p.team, 'striker') >= 2) ball.gkMod += 0.12;
      this.dispatch(p.team, 'onChargedShot', p, ball, held);
    }
    // SÁT THỦ 4: sút trúng khung (vào lưới / bị cứu) -> hồi chiêu cả đội giảm 30%
    shotOnTarget(team) {
      if (team < 0 || this.tier(team, 'striker') < 4) return;
      for (const p of this.g.teams[team].players) { p.cd.light *= 0.7; p.cd.hard *= 0.7; p.cd.skill *= 0.7; }
    }
    steal(p) {
      // năng lượng Tuyệt kỹ từ cướp bóng: tối đa 1 lần mỗi stealCooldown giây (mỗi đội)
      const st = this.st(p.team, '_ultSteal'), U2 = DEF().ultimate;
      if (!(st.cd > 0)) {
        st.cd = U2.stealCooldown || 0;
        // chữ "+ULT" trên đầu người cướp được bóng (năng lượng Tuyệt kỹ của đội vừa tăng)
        if (this.ultOf(p.team) && this.g.ult[p.team] < 1 && !(this.st(p.team, '_ultLock').cd > 0)) this.g.effects.text(p.x, p.y - 34, '+ULT', '#ffd23f');
        this.gainUlt(p.team, U2.gainSteal);
      }
      this.dispatch(p.team, 'onSteal', p);
    }
    goalScored(team, scorer) {
      this.gainUlt(team, DEF().ultimate.gainGoal);
      this.dispatch(team, 'onGoalScored', scorer);
    }
    kickoff() {
      this.endTasks();
      for (let t = 0; t < 2; t++) {
        // THÉP 2: +1 Giáp mỗi lần giao bóng
        if (this.tier(t, 'iron') >= 2) for (const p of this.g.teams[t].players) p.res.guard = Math.min(RES().guard.max, p.res.guard + 1);
        this.dispatch(t, 'onKickoff');
      }
    }

    /* ---------- Tuyệt kỹ ---------- */
    ultOf(team) { return team >= 0 ? this.owned[team].find((id) => this.def(id).role === 'ult') || null : null; }
    // năng lượng Tuyệt kỹ chỉ tích khi đội đã có Tuyệt kỹ
    gainUlt(team, amt) {
      if (team < 0 || !this.ultOf(team) || this.st(team, '_ultLock').cd > 0) return;   // dùng xong: khoá nạp ultimate.lockout giây
      this.g.ult[team] = Math.min(1, this.g.ult[team] + amt);
    }
    ultReady(team) { return !!this.ultOf(team) && this.g.ult[team] >= 1; }

    // ra Tuyệt kỹ: cut-in (dừng hình) rồi mới thực hiện
    activateUltimate(team, p) {
      const g = this.g, id = this.ultOf(team);
      if (!id || g.ult[team] < 1 || g.state !== 'play' || !p || p.state !== 'normal' || p.airZ > 0) return false;
      const def = this.def(id), U2 = DEF().ultimate;
      const color = ARCH()[def.tags[0]] ? ARCH()[def.tags[0]].color : '#ffe14f';
      g.ult[team] = 0;
      this.st(team, '_ultLock').cd = U2.lockout || 0;
      g.effects.cutIn(p.id, def.name.toUpperCase(), color, U2.cutIn);
      g.hitStop(U2.cutIn);
      g.sfx('upgrade');
      g.later(U2.cutIn, () => {
        const b = Behaviors[id];
        if (b && b.onUltimate && g.state === 'play') b.onUltimate(this, team, this.params(id), p);
      });
      g.emit('ultimate', { team, id, player: p.name });
      return true;
    }

    /* ---------- cập nhật mỗi bước ---------- */
    update(dt) {
      const g = this.g, R = RES();
      if (this.tasks.length) {
        for (const t of this.tasks.slice()) {
          if (t.fn(dt)) { this.tasks.splice(this.tasks.indexOf(t), 1); if (t.onEnd) t.onEnd(); }
        }
      }
      for (let t = 0; t < 2; t++) {
        for (const id in this.state[t]) {
          const s = this.state[t][id];
          if (s.cd > 0 && id !== 'aegis_wall') s.cd -= dt;
        }
        for (const id of this.owned[t]) {
          const b = Behaviors[id];
          if (b && b.update) b.update(this, t, this.params(id), dt);
        }
        if (this.buffs[t].length) {
          this.buffs[t].forEach((b) => (b.t -= dt));
          this.buffs[t] = this.buffs[t].filter((b) => b.t > 0);
        }
        this.updateResources(t, dt);
        // Nhịp giảm dần khi lâu không chuyền
        // quá grace giây không chuyền -> mỗi decayEvery giây mất 1
        if (g.rhythm[t] > 0 && (g.rhythmT[t] += dt) >= R.rhythm.grace + R.rhythm.decayEvery) { g.rhythm[t]--; g.rhythmT[t] = R.rhythm.grace; }
        this.aiUltimate(t, dt);
      }
    }

    updateResources(t, dt) {
      const R = RES();
      const mo = this.resActive(t, 'momentum'), ra = this.resActive(t, 'rage');
      const moGain = this.mod(t, 'momentumGain');   // Quỷ Tốc Độ: nạp Đà nhanh hơn
      const moMax = this.resMax(t, 'momentum'), hold = R.momentum.grace + (this.tier(t, 'runner') >= 4 ? 2 : 0);
      const rageEvery = R.rage.decayEvery * (this.tier(t, 'brawler') >= 2 ? 2 : 1);
      const ironRegen = this.tier(t, 'iron') >= 3;
      const dash4 = this.tier(t, 'trickster') >= 4;
      for (const p of this.g.teams[t].players) {
        const r = p.res, T = p.resT;
        if (mo) {
          const stun = p.state === 'stun';
          // vừa bị choáng: mất stunLoss Đà (1 lần mỗi lần choáng)
          if (stun && !T.stunned) r.momentum = Math.max(0, r.momentum - R.momentum.stunLoss);
          T.stunned = stun;
          if (stun) T.idle = Math.min(T.idle, hold);
          else if (p.sprinting) {
            T.idle = 0;
            if ((T.sprint += dt) >= R.momentum.gainEvery / moGain) { T.sprint = 0; r.momentum = Math.min(moMax, r.momentum + 1); }
          } else if (r.momentum > 0 && (T.idle += dt) >= hold + R.momentum.decayEvery) { r.momentum--; T.idle = hold; }
        }
        // Nộ: quá grace giây không đấm trúng -> mỗi decayEvery giây mất 1
        if (ra && r.rage > 0 && (T.rage += dt) >= R.rage.grace + rageEvery) { r.rage--; T.rage = R.rage.grace; }
        if (T.frenzy > 0) T.frenzy -= dt;
        if (dash4 && p.cd.skill <= 0) p.extraDash = 1;
        if (ironRegen && r.guard < R.guard.max && (T.guard += dt) >= 8) { r.guard++; T.guard = 0; }
      }
    }

    // AI tự ra Tuyệt kỹ (đội không do người điều khiển) sau một khoảng trễ ngẫu nhiên khi năng lượng đầy
    aiUltimate(t, dt) {
      const g = this.g;
      if (g.isHuman(t) || g.state !== 'play' || !this.ultReady(t)) { this.aiUltT[t] = 0; return; }
      if (!this.aiUltT[t]) { const d = DEF().ultimate.aiDelay; this.aiUltT[t] = U.rand(d[0], d[1]); return; }
      if ((this.aiUltT[t] -= dt) > 0) return;
      const id = this.ultOf(t), b = Behaviors[id];
      const p = b && b.aiUse ? b.aiUse(this, t, this.params(id)) : null;
      if (p) this.activateUltimate(t, p);
      else this.aiUltT[t] = 0.4; // chưa có thời cơ -> thử lại sau
    }

    /* ---------- chọn Core ---------- */
    // trọng số 1 lá: độ hiếm x (1 + buildWeight x số Core cùng trường phái) x thiên hướng đội
    weight(team, id) {
      const D = DEF().draft, c = this.def(id);
      const style = this.g.teams[team].cfg.coreWeights || {};
      const shared = c.tags.reduce((n, tag) => Math.max(n, this.tagCount(team, tag)), 0);
      const lean = c.tags.reduce((m, tag) => Math.max(m, style[tag] || 1), 0);
      return (D.rarityWeight[c.rarity] || 1) * (1 + D.buildWeight * shared) * lean;
    }
    // Tuyệt kỹ chỉ xuất hiện khi có >= 2 Core cùng trường phái và đội chưa có Tuyệt kỹ nào
    eligible(team, id) {
      const c = this.def(id);
      if (c.role !== 'ult') return true;
      return !this.ultOf(team) && c.tags.some((tag) => this.tagCount(team, tag) >= 2);
    }
    pool(team, exclude = []) {
      // người chơi chỉ bốc được Core đã mở khoá (opts.coreUnlocks); AI được bốc tất cả
      const allow = this.g.opts && this.g.opts.coreUnlocks && this.g.opts.coreUnlocks[team];
      return Object.keys(DEF().list).filter((id) => !this.has(team, id) && !exclude.includes(id)
        && (!allow || allow.includes(id)) && this.eligible(team, id));
    }

    // N lá theo trọng số build; từ lượt guaranteeFromRound: ít nhất 1 lá cùng trường phái với Core đang có
    rollOptions(team, n, exclude = []) {
      let pool = this.pool(team, exclude);
      if (pool.length < n) pool = this.pool(team); // hết bài mới thì cho ra lại lá vừa đổi
      const out = [];
      while (out.length < n && pool.length) {
        const id = U.weightedPick(pool, (x) => this.weight(team, x));
        out.push(id);
        pool = pool.filter((x) => x !== id);
      }
      const ownedTags = new Set(this.owned[team].flatMap((id) => this.tagsOf(id)));
      const matches = (id) => this.tagsOf(id).some((tag) => ownedTags.has(tag));
      if (this.g.upgradeIdx >= DEF().draft.guaranteeFromRound && ownedTags.size && out.length && !out.some(matches)) {
        const cand = pool.filter(matches);
        if (cand.length) out[out.length - 1] = U.weightedPick(cand, (x) => this.weight(team, x));
      }
      // lượt chọn cuối: đủ điều kiện Tuyệt kỹ -> luôn có lá Tuyệt kỹ (của trường phái đang có nhiều Core nhất; kể cả khi vừa đổi bài)
      const ult = this.finalUltOption(team);
      if (ult && !out.some((id) => this.def(id).role === 'ult')) {
        if (out.includes(ult)) out.splice(out.indexOf(ult), 1);
        if (out.length >= n) out.pop();
        out.push(ult);
      }
      return out;
    }

    finalUltOption(team) {
      if (this.g.upgradeIdx < SFC_CONFIG.game.match.maxUpgrades || this.ultOf(team)) return null;
      const allow = this.g.opts && this.g.opts.coreUnlocks && this.g.opts.coreUnlocks[team];
      const ults = Object.keys(DEF().list).filter((id) => this.def(id).role === 'ult' && (!allow || allow.includes(id)) && this.eligible(team, id));
      if (!ults.length) return null;
      return ults.reduce((a, b) => (this.tagCount(team, this.tagsOf(b)[0]) > this.tagCount(team, this.tagsOf(a)[0]) ? b : a));
    }

    // AI: bốc 3 lá rồi chọn lá khớp build nhất (Tuyệt kỹ luôn được ưu tiên)
    aiPick(team) {
      const opts = this.rollOptions(team, SFC_CONFIG.game.match.upgradeChoices);
      if (!opts.length) return null;
      const id = U.weightedPick(opts, (x) => (this.def(x).role === 'ult' ? 20 : 1) * this.weight(team, x));
      this.add(team, id);
      return id;
    }
  }

  SFC.CoreSystem = CoreSystem;
})();
