/* Core Giai đoạn 3 — Core mới (docs/CORE_DESIGN.md mục 6), gắn vào SFC.CoreBehaviors (systems/cores.js).
 * Hook giống cores.js: (sys, team, params, ...). Hình ghép từ VFX Kit (systems/vfxkit.js), vẽ ở render/vfx.js.
 * Một số Core cần móc sâu vào actions / match (Nắm Đấm Khổng Lồ, Tâng Người, Dậm Đất, Song Phi...) — xem các hàm
 * truy vấn trong CoreSystem (bigPunch, uppercut, juggle, slamLand, unstealable, keeperPenalty...).
 */
window.SFC = window.SFC || {};

(function () {
  const U = SFC.U;
  const B = SFC.CoreBehaviors, H = SFC.CoreHelpers;
  const RES = () => SFC_CONFIG.cores.resources;
  const Act = () => SFC.Actions;
  const fv = (p) => ({ x: Math.cos(p.facing), y: Math.sin(p.facing) });

  function nearestOpp(g, team, pt, filter) {
    let best = null, bd = Infinity;
    for (const o of g.teams[1 - team].players) {
      if (filter && !filter(o)) continue;
      const d = U.dist(o, pt);
      if (d < bd) { bd = d; best = o; }
    }
    return best;
  }
  const targetable = (g) => (o) => o.state !== 'meteor' && !g.isProtected(o);

  // hất tung o ra xa khỏi điểm from (bỏ qua miễn nhiễm sau choáng — dùng cho Tuyệt kỹ / nổ)
  function blast(o, from, kb, up, stun, src, d = null) {
    d = d || U.norm(o.x - from.x, o.y - from.y + 0.01);
    o.hitImmune = 0;
    return o.hit({ stun, kbx: d.x * kb, kby: d.y * kb, launch: up, source: src, type: 'hard' });
  }

  // ngân sách hiệu ứng: slow-mo / impact frame tối đa 1 lần mỗi 4s (Tuyệt kỹ không tính)
  function bigMoment(g) {
    if (g.time - (g.bigFxT == null ? -99 : g.bigFxT) < 4) return false;
    g.bigFxT = g.time;
    return true;
  }

  // va phải là bay (Xe Ủi, Hoá Khổng Lồ). ahead = chỉ người đứng phía trước hướng chạy (Xe Ủi)
  // cost = true: mỗi lần hất tiêu 1 Giáp (Xe Ủi)
  function trample(sys, team, pl, prm, word, ahead = false, cost = false) {
    const g = sys.g, E = g.effects;
    const sp = Math.hypot(pl.vx, pl.vy);
    if (ahead && sp < 40) return;
    for (const o of g.teams[1 - team].players) {
      if (o.state === 'stun' || o.airZ > 4 || g.isProtected(o) || (o.trampleT || 0) > g.time) continue;
      if (U.dist(o, pl) > pl.radius + o.radius + 2) continue;
      if (ahead && ((o.x - pl.x) * pl.vx + (o.y - pl.y) * pl.vy) / (sp * U.dist(o, pl) || 1) < 0.3) continue;
      if (Act().dodged(g, o)) continue;
      if (cost && pl.res.guard <= 0) return;
      o.trampleT = g.time + (prm.every || 0.8);
      if (cost) pl.res.guard--;
      const had = o.hasBall;
      if (blast(o, pl, prm.knock, prm.launch, prm.stun, pl)) {
        E.comic(o.x, o.y - 30, word, '#ffd23f', 0.9, 0.5);
        E.burst(o.x, o.y, 8, '#ffffff', 10, 110, 0.4);
        E.shake(3, 0.2);
        g.sfx('hit');
        if (had) sys.steal(pl);
      }
    }
  }

  // phân thân của người sở hữu (Ảnh Phân Thân / Đại Phân Thân): cản người, chặn đường chuyền, chạm vào là nổ khói
  function cloneBlock(sys, team, owner) {
    const g = sys.g, E = g.effects, b = g.ball;
    for (const c of E.V.clones) {
      if (c.team !== team || c.pid !== owner.id || c.t < 0.05) continue;
      for (const o of g.teams[1 - team].players) {
        if (o.airZ > 4 || U.dist(o, c) > 10) continue;
        const d = U.norm(o.x - c.x, o.y - c.y + 0.01);
        o.kbx += d.x * 90; o.kby += d.y * 90;
        E.popClone(c.pid, c.x, c.y);
        break;
      }
      if (c.t < 0.05) continue;
      if (!b.owner && b.kind === 'pass' && b.lastKickTeam === 1 - team && b.z < 10 && U.dist(b, c) < 9) {
        b.vx *= -0.35; b.vy *= -0.35; b.rotate(U.rand(-0.8, 0.8));
        b.kind = null; b.passTarget = null; b.passPoint = null; b.lastKickTeam = -1;
        E.comic(c.x, c.y - 26, 'BLOCK!', '#9d7bff', 0.7, 0.5);
        E.popClone(c.pid, c.x, c.y);
        g.sfx('touch');
      }
    }
  }

  // Core DÙNG Giáp: người sở hữu tự có tối thiểu 1 Giáp mỗi lần giao bóng (không thành lá chết khi chưa có Core TẠO Giáp)
  const guardFloor = {
    onAdd(sys, team, prm) { prm.owner.res.guard = Math.max(prm.owner.res.guard, 1); },
    onKickoff(sys, team, prm) { prm.owner.res.guard = Math.max(prm.owner.res.guard, 1); },
  };

  Object.assign(B, {
    /* ================= 🏃 TỐC ĐỘ ================= */
    burst_start: {
      onSprintStart(sys, team, prm, pl) {
        const g = sys.g, E = g.effects;
        if (g.time < (pl.burstT || 0)) return;
        pl.burstT = g.time + prm.cooldown;
        H.addMomentum(sys, pl, prm.momentum);
        pl.buffs.push({ speed: prm.boost, t: prm.time });
        const a = Math.hypot(pl.vx, pl.vy) > 5 ? Math.atan2(pl.vy, pl.vx) : pl.facing;
        E.wave(pl.x, pl.y, 26, '#ffffff', 0.35, 2);
        E.burst(pl.x, pl.y, 0, '#d9cbb0', 10, 90, 0.5);
        E.decal('skid', pl.x, pl.y, 0.8, 1.5, a);
        E.afterimage(pl, 0.3);
        g.sfx('whoosh');
      },
    },
    sonic_boom: {
      update(sys, team, prm) {
        const g = sys.g, E = g.effects, max = sys.resMax(prm.owner, 'momentum');
        for (const pl of [prm.owner]) {
          if (!pl.hasBall || !pl.sprinting || pl.state !== 'normal' || pl.res.momentum < max || g.time < (pl.sonicT || 0)) continue;
          const sp = Math.hypot(pl.vx, pl.vy);
          if (sp < 60) continue;
          for (const o of g.teams[1 - team].players) {
            if (o.state === 'stun' || o.airZ > 0 || g.isProtected(o)) continue;
            if (U.dist(pl, o) - pl.radius - o.radius > prm.gap) continue;
            if (Act().dodged(g, o)) continue;
            // hất sang bên so với hướng chạy
            const side = pl.vx * (o.y - pl.y) - pl.vy * (o.x - pl.x) >= 0 ? 1 : -1;
            const n = { x: (-pl.vy / sp) * side, y: (pl.vx / sp) * side };
            const had = o.hasBall;
            if (o.hit({ stun: prm.stun, kbx: n.x * prm.knock, kby: n.y * prm.knock, launch: prm.launch, source: pl, type: 'hard' })) {
              pl.res.momentum = 0;   // DÙNG: tiêu hết Đà
              E.comic(o.x, o.y - 28, 'BOOM!', '#ffffff', 1, 0.5);
              E.wave(pl.x, pl.y, 24, '#ffffff', 0.3, 2);
              E.shake(3, 0.2);
              g.sfx('hit');
              if (had) sys.steal(pl);
            }
            pl.sonicT = g.time + prm.cooldown;
            break;
          }
        }
      },
    },
    freight_train: {
      update(sys, team, prm) {
        const g = sys.g, E = g.effects;
        for (const pl of [prm.owner]) {
          if (pl.state !== 'normal' || pl.res.momentum < prm.minMomentum || g.time < (pl.trainT || 0)) continue;
          const sp = Math.hypot(pl.vx, pl.vy);
          if (sp < prm.minSpeed) continue;
          const dv = { x: pl.vx / sp, y: pl.vy / sp };
          for (const o of g.teams[1 - team].players) {
            if (o.state === 'stun' || o.airZ > 0 || g.isProtected(o)) continue;
            const d = U.dist(pl, o);
            if (d > pl.radius + o.radius + 3) continue;
            if (((o.x - pl.x) * dv.x + (o.y - pl.y) * dv.y) / (d || 1) < 0.6) continue;   // chỉ va trực diện
            pl.trainT = g.time + prm.cooldown;
            if (Act().dodged(g, o)) break;
            const had = o.hasBall && !sys.unstealable(o);
            if (had) g.looseBall(o, dv.x, dv.y, 140);
            if (o.hit({ stun: prm.stun, kbx: dv.x * prm.knock, kby: dv.y * prm.knock, launch: prm.launch * sys.pmod(pl, 'launch'), source: pl, type: 'hard' })) {
              pl.res.momentum = Math.max(0, pl.res.momentum - prm.cost);
              g.hitStop(0.08);
              E.comic(o.x, o.y - 30, 'BAM!', '#3ff6ff', 1.3, 0.6);
              E.decal('skid', o.x, o.y, 1.4, 3, Math.atan2(dv.y, dv.x));
              E.burst(o.x, o.y, 8, '#ffffff', 12, 130, 0.45);
              E.shake(5, 0.3);
              g.sfx('hit');
              if (had) sys.steal(pl);
            }
            break;
          }
        }
      },
    },

    /* ================= 🎼 TIKI-TAKA ================= */
    // Mắt Đại Bàng: mods (passAccuracy, interceptTaken) + nét phấn ở render/vfx.js
    one_touch: {
      onPass(sys, team, prm, pl) {
        const g = sys.g;
        if (!(pl.recvT >= 0) || g.time - pl.recvT > prm.window) return;
        const b = g.ball;
        b.fx.ghost = true;
        b.skin = 'light';
        if (sys.resActive(pl, 'rhythm')) { g.rhythm[team] = Math.min(RES().rhythm.max, g.rhythm[team] + prm.rhythm); g.rhythmT[team] = 0; }
        g.effects.burst(b.x, b.y, 4, '#fff6c0', 10, 70, 0.4);
        g.effects.ring(b.x, b.y - 4, '#fff6c0');
        g.sfx('pick');
      },
    },
    phantom_pass: {
      onPass(sys, team, prm, pl, target, mode) {
        const g = sys.g, b = g.ball, E = g.effects;
        if (mode !== 'through' || g.rhythm[team] < prm.cost) return;
        g.rhythm[team] -= prm.cost;
        b.vx *= prm.speedMult; b.vy *= prm.speedMult;
        b.fx.ghost = true; b.fx.string = true;
        b.skin = 'light';
        const a = Math.atan2(b.vy, b.vx);
        const len = b.passPoint ? Math.min(320, U.dist(b, b.passPoint) + 20) : 200;
        E.beam(b.x, b.y - 3, a, len, 6, '#ffd23f', 0.5);
        E.flash(0.2);
        E.comic(pl.x, pl.y - 28, 'PHASE!', '#ffd23f', 0.7, 0.6);
        if (target) { target.buffs.push({ speed: prm.boost, t: prm.time }); target.glow('#ffd23f', prm.time); }
        g.sfx('zap');
      },
    },
    symphony: {
      onShoot(sys, team, prm, pl, ball) {
        const g = sys.g, E = g.effects, n = g.rhythm[team];
        if (n < prm.min) return;
        ball.vx *= 1 + n * prm.powerPer; ball.vy *= 1 + n * prm.powerPer;
        ball.gkMod += n * prm.gkPer;
        ball.fx.string = true;
        ball.skin = 'light';
        g.rhythm[team] = 0;
        E.burst(ball.x, ball.y, 10, '#ffd23f', 18, 100, 0.6);
        E.wave(ball.x, ball.y, 30, '#ffd23f', 0.45, 2);
        E.comic(pl.x, pl.y - 30, 'SYMPHONY!', '#ffd23f', 0.8 + n * 0.06, 0.7);
        g.sfx('pick');
      },
    },
    endless_tiki: {
      aiUse(sys, team, prm) {
        const g = sys.g, b = g.ball, me = prm.owner;
        if (!b.owner || b.owner.team !== team || b.owner.state !== 'normal' || me.state !== 'normal') return null;
        return g.teams[team].players.some((m) => m !== b.owner && m.state === 'normal') ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, b = g.ball, f = g.field, dir = g.teams[team].dir;
        // cầm bóng: người đang giữ bóng của đội; không thì "cướp" bóng về người ra chiêu
        let a = b.owner && b.owner.team === team ? b.owner : pl;
        if (b.owner && b.owner.team !== team) { g.looseBall(b.owner, 0, 0, 0); sys.steal(a); }
        if (b.owner !== a) { b.owner = null; g.gainPossession(a); }
        const m = g.teams[team].players.find((x) => x !== a && x.state !== 'stun');
        if (!m) return;
        E.tint('#704214', 2.4, 0.3);
        E.callout('TIKI-TAKA!', '#ffd23f', 1.2);
        g.rhythm[team] = RES().rhythm.max;
        for (const o of g.teams[1 - team].players) { o.buffs.push({ speed: prm.slow, t: prm.slowTime }); o.charging = false; }
        const step = (i) => {
          if (g.state !== 'play') return;
          const from = i % 2 === 0 ? a : m, to = i % 2 === 0 ? m : a;
          if (b.owner !== from || to.state === 'stun') return finish();
          // người nhận băng lên một nhịp -> các đường chuyền vẽ thành hình sao
          E.afterimage(to, 0.4);
          to.x = U.clamp(to.x + dir * 26, f.x + 12, f.x + f.w - 12);
          to.y = U.clamp(to.y + (f.cy - to.y) * 0.25 + U.rand(-10, 10), f.y + 12, f.y + f.h - 12);
          const ang = Math.atan2(to.y - from.y, to.x - from.x);
          E.beam(from.x, from.y - 4, ang, U.dist(from, to), 4, '#ffd23f', 1.2);
          E.burst(to.x, to.y, 12, '#ffd23f', 8, 60, 0.5);
          b.owner = null;
          g.gainPossession(to);
          g.sfx('pass');
          g.later(prm.gap, () => (i + 1 < prm.passes ? step(i + 1) : finish()));
        };
        const finish = () => {
          if (g.state !== 'play') return;
          const s = b.owner && b.owner.team === team ? b.owner : null;
          if (!s || s.state !== 'normal') return;
          const goal = g.attackGoal(team);
          s.facing = Math.atan2(goal.y - s.y, goal.x - s.x);
          Act().shoot(g, s, 1.0, U.rand(-0.7, 0.7));
          b.gkMod += prm.gk;
          b.fx.string = true;
          b.skin = 'light';
          E.comic(s.x, s.y - 32, 'SYMPHONY!', '#ffd23f', 1.2, 0.8);
          E.wave(s.x, s.y, 36, '#ffd23f', 0.5, 3);
          E.shake(5, 0.3);
          g.rhythm[team] = 0;
        };
        g.later(0.1, () => step(0));
      },
    },

    /* ================= 🎯 SÁT THỦ ================= */
    energy_wave: {
      onChargedShot(sys, team, prm, pl, ball, held) {
        if (held < prm.minCharge) return;
        const g = sys.g, E = g.effects, a = Math.atan2(ball.vy, ball.vx), d = { x: Math.cos(a), y: Math.sin(a) };
        const x0 = pl.x + d.x * 8, y0 = pl.y + d.y * 8;
        E.beam(x0, y0 - 6, a, prm.len, prm.width * 1.2, '#7fe7ff', 0.7);
        E.comic(pl.x, pl.y - 30, 'WAVE BLAST!', '#7fe7ff', 0.9, 0.7);
        E.shake(5, 0.5);
        g.sfx('zap');
        for (const o of g.teams[1 - team].players) {
          const rx = o.x - x0, ry = o.y - y0, along = rx * d.x + ry * d.y, perp = rx * -d.y + ry * d.x;
          if (along < 0 || along > prm.len || Math.abs(perp) > prm.width || g.isProtected(o)) continue;
          const s = perp >= 0 ? 1 : -1;
          // người trông khung chỉ bị đẩy, không choáng (tránh bàn thắng chắc chắn)
          const gk = g.inKeeperZone(o);
          o.hit({ stun: gk ? 0 : prm.stun, kbx: -d.y * s * prm.knock * (gk ? 0.4 : 1) + d.x * 60, kby: d.x * s * prm.knock * (gk ? 0.4 : 1) + d.y * 60, source: pl, type: 'slash' });
          E.burst(o.x, o.y, 8, '#7fe7ff', 8, 80, 0.4);
        }
      },
    },
    black_hole: {
      onChargedShot(sys, team, prm, pl, ball, held) {
        if (held < prm.minCharge) return;
        const g = sys.g, E = g.effects;
        ball.skin = 'blackhole';
        E.vortex(0, 0, prm.radius * 0.7, prm.time, 'ball');
        E.comic(pl.x, pl.y - 30, 'VWOOM!', '#9d7bff', 1, 0.7);
        E.shake(3, 0.5);
        g.sfx('zap');
        let T = prm.time;
        sys.task((dt) => {
          T -= dt;
          const b = g.ball;
          if (T <= 0 || b.owner || b.skin !== 'blackhole') return true;
          for (const o of g.teams[1 - team].players) {
            const dd = Math.hypot(o.x - b.x, o.y - b.y);
            if (dd >= prm.radius || dd < 3 || o.airZ > 4) continue;
            const k = (1 - dd / prm.radius) * prm.pull * dt;
            o.kbx += ((b.x - o.x) / dd) * k; o.kby += ((b.y - o.y) / dd) * k;
            // bị hút lệch nhưng không chạm được bóng (người trông khung vẫn được cứu thua)
            if (!g.inKeeperZone(o)) b.noPickup.set(o.id, 0.15);
          }
          return false;
        });
      },
    },
    meteor_strike: {
      aiUse(sys, team, prm) {
        const g = sys.g, b = g.ball, o = b.owner, me = prm.owner;
        if (!o || o.team !== team || o.state !== 'normal' || me.state !== 'normal') return null;
        return Math.abs(g.attackGoal(team).x - o.x) < 280 ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, b = g.ball;
        const s = b.owner && b.owner.team === team ? b.owner : pl;
        if (b.owner && b.owner.team !== team) { g.looseBall(b.owner, 0, 0, 0); sys.steal(s); }
        if (b.owner !== s) { b.owner = null; g.gainPossession(s); }
        s.airVz = prm.jump; s.airZ = 0.5;
        s.state = 'recover'; s.stateT = prm.delay + 0.5;
        b.kick(s, 0, 0, prm.jump);
        b.skin = 'fireball';
        for (const q of g.players) b.noPickup.set(q.id, prm.delay + 0.1);   // không ai chạm được bóng đang bay lên
        E.burst(s.x, s.y, 0, '#8a7f70', 14, 90);
        E.wave(s.x, s.y, 24, '#ffffff', 0.4, 2);
        g.sfx('whoosh');
        g.later(prm.delay - 0.17, () => {
          if (g.state !== 'play') return;
          g.slowMo(0.25, 0.4);
          E.speedLines(0.5, s.x, s.y - s.airZ, '#ffd8b0');
          E.zoom(s.x, s.y - s.airZ, 0.18, 0.5);
        });
        g.later(prm.delay, () => {
          if (g.state !== 'play' || b.owner) return;
          const goal = g.attackGoal(team), f = g.field;
          const ty = goal.y + U.rand(-1, 1) * (f.goalWidth / 2 - 8);
          const dx = goal.x - b.x, dy = ty - b.y, d = Math.hypot(dx, dy) || 1;
          const spd = prm.speed * sys.pmod(s, 'shotPower');
          b.kick(s, (dx / d) * spd, (dy / d) * spd, -40);
          b.kind = 'shot';
          b.skin = 'fireball';
          b.fx.meteor = true;
          b.gkMod += prm.gk;
          H.applyFire(sys, team, b, SFC_CONFIG.cores.list.fire_shot.params);
          E.comic(b.x, b.y - b.z - 10, 'BOOM!', '#ff6a1f', 1.2, 0.6);
          E.shake(5, 0.3);
          g.sfx('kick', 1);
        });
      },
      // lưới nổ tung khi sao băng vào
      onGoalScored(sys) {
        const g = sys.g, b = g.ball, E = g.effects;
        if (!b.fx.meteor) return;
        E.impactFrame();
        E.shake(8, 0.5);
        E.burst(b.x, b.y, 10, '#ffd23f', 30, 180, 0.8);
        E.wave(b.x, b.y, 40, '#ff6a1f', 0.5, 3);
        E.netFire(b.x > g.field.cx ? 1 : -1);
      },
      // thủ môn bắt được vẫn bị hất văng
      onKeeperSave(sys, team, prm, keeper, ball) {
        if (!ball.fx.meteor) return false;
        const g = sys.g, E = g.effects;
        blast(keeper, { x: keeper.x - ball.vx * 0.01, y: keeper.y - ball.vy * 0.01 }, 300, 220, 1.2, ball.lastTouch, U.norm(ball.vx, ball.vy));
        g.deflect(keeper, 0.5);
        g.hitStop(0.1);
        E.impactFrame();
        E.comic(keeper.x, keeper.y - 30, 'BOOM!', '#ff6a1f', 1.2);
        E.shake(6, 0.4);
        g.sfx('hit');
        return true;
      },
    },

    /* ================= 🥊 ĐẤU SĨ ================= */
    fist_storm: {
      onLightAttack(sys, team, prm, pl) {
        const g = sys.g, E = g.effects;
        for (let i = 1; i < prm.hits; i++) {
          g.later(0.07 + prm.gap * i, () => {
            if (g.state !== 'play' || pl.state === 'stun') return;
            const d = fv(pl), last = i === prm.hits - 1;
            E.stretch(pl.id, pl.x + d.x * U.rand(14, 22) + U.rand(-4, 4), pl.y + d.y * 12 + U.rand(-6, 6), 0.1);
            for (const o of Act().inFront(g, pl, prm.range, 60, sys.has(pl, 'juggle'))) {
              if (Act().dodged(g, o)) continue;
              // Tâng Người: chuỗi đấm tâng tiếp người đang bay (Long Quyền -> Bão Đấm)
              if (o.airZ > 0) { sys.juggle(pl, o); continue; }
              const n = U.norm(o.x - pl.x, o.y - pl.y);
              o.kbx += n.x * (last ? prm.push : 40); o.kby += n.y * (last ? prm.push : 40);
              E.burst(o.x, o.y, 10, '#fff6a0', 5, 70, 0.3);
              sys.lightHit(pl, o);
              if (last) { E.comic(o.x, o.y - 28, 'SLAM!', '#ff3d5a', 1, 0.5); g.sfx('hit'); }
            }
            g.sfx('tackle');
          });
        }
      },
    },
    giant_fist: {
      onLightAttack(sys, team, prm, pl) {
        if (!pl.bigPunch) return;
        const d = fv(pl), E = sys.g.effects;
        E.stretch(pl.id, pl.x + d.x * 24, pl.y + d.y * 18, 0.32, 2.5);
        E.shake(2, 0.15);
      },
      onLightHit(sys, team, prm, a, v) {
        if (!a.lastPunch || !a.lastPunch.big) return;
        const g = sys.g, E = g.effects;
        g.hitStop(0.1);
        E.impactFrame();
        E.zoom(v.x, v.y, 0.15, 0.3);
        E.comic(v.x, v.y - 30, 'GIANT!', '#ff3d5a', 1.2, 0.7);
        E.shake(6, 0.35);
        g.sfx('hit');
      },
    },
    hundred_fists: {
      aiUse(sys, team, prm) {
        const g = sys.g;
        for (const p of [prm.owner]) {
          if (p.state !== 'normal' || p.airZ > 0) continue;
          const o = nearestOpp(g, team, p, (q) => targetable(g)(q) && q.airZ <= 0);
          if (o && U.dist(o, p) < prm.range * 0.6 && (o.hasBall || Math.random() < 0.3)) return p;
        }
        return null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, f = g.field;
        const o = nearestOpp(g, team, pl, targetable(g));
        if (!o) return;
        const side = pl.x < o.x ? -1 : 1;
        E.afterimage(pl, 0.4);
        pl.x = U.clamp(o.x + side * 14, f.x + 8, f.x + f.w - 8); pl.y = o.y;
        pl.facing = side > 0 ? Math.PI : 0;
        if (g.ball.owner === pl) g.ball.follow(0);
        pl.state = 'recover'; pl.stateT = prm.hits * prm.gap + 0.3;
        if (o.hasBall) { g.looseBall(o, -side, 0, 30); sys.steal(pl); }
        o.hitImmune = 0; o.hit({ stun: 1.6, source: pl, type: 'light' }); o.kbx = o.kby = 0;
        o.airZ = 0; o.airVz = 0;
        E.tint('#300000', 1.3, 0.35);
        E.speedLines(1.2, o.x, o.y - 8, '#ffcfcf');
        let n = 0;
        const punch = () => {
          if (g.state !== 'play') return;
          n++;
          E.stretch(pl.id, o.x + U.rand(-6, 6), o.y + U.rand(-8, 4), 0.1);
          E.burst(o.x + U.rand(-4, 4), o.y - 8 + U.rand(-6, 6), 8, '#fff6a0', 4, 60, 0.3);
          if (n % 4 === 0) E.combo(o.x, o.y - 30, n);
          if (n % 3 === 0) E.shake(1.5, 0.05);
          if (n % 2) g.sfx('tackle');
          o.state = 'stun'; o.stateT = Math.max(o.stateT, 0.5); o.kbx = o.kby = 0;
          pl.state = 'recover'; pl.stateT = Math.max(pl.stateT, 0.2);
          if (n < prm.hits) g.later(prm.gap, punch); else g.later(0.08, finisher);
        };
        const finisher = () => {
          if (g.state !== 'play') return;
          g.hitStop(0.14);
          E.impactFrame();
          E.combo(o.x, o.y - 30, prm.hits);
          sys.moment(team, 'hundred_fists', prm.hits + ' HIT!', 80);
          E.zoom(o.x, o.y, 0.2, 0.35);
          E.shake(8, 0.4);
          // văng về phía tường trên / dưới gần nhất -> chắc chắn BONK
          const toTop = o.y - f.y < f.y + f.h - o.y;
          // nạn nhân đang choáng vì chuỗi đấm -> Player.hit bỏ qua đòn mới (chống khoá choáng). Thả choáng trước để cú kết
          // thật sự hất văng + choáng prm.stun (không thì chỉ còn ~0.5s choáng của cú đấm cuối)
          o.state = 'normal'; o.stateT = 0;
          blast(o, pl, prm.knock, 200, prm.stun, pl, U.norm(-side * 0.35, toTop ? -1 : 1));
          sys.lightHit(pl, o);
          g.sfx('hit');
          sys.task(() => {
            const r = o.radius + 1;
            if (o.y <= f.y + r || o.y >= f.y + f.h - r || o.x <= f.x + r || o.x >= f.x + f.w - r) {
              E.decal(o.x <= f.x + r || o.x >= f.x + f.w - r ? 'crack' : 'wallcrack', o.x, o.y, 1.4, 5);
              E.burst(o.x, o.y, 10, '#d9cbb0', 16, 100);
              return true;
            }
            return o.state !== 'stun';
          });
        };
        punch();
      },
    },

    /* ================= 🦵 VÕ SĨ ĐÁ ================= */
    heavy_boot: {
      onHardAttack(sys, team, prm, pl) {
        if (pl.state !== 'kick') return;
        const d = fv(pl), E = sys.g.effects;
        E.decal('crack', pl.x + d.x * 10, pl.y + d.y * 6, 0.7, 3);
        E.burst(pl.x + d.x * 8, pl.y, 2, '#ffd23f', 6, 80, 0.3);
      },
    },
    // Tâng Người: CoreSystem.juggle (gọi từ Actions.lightHit)
    wall_slam: {
      onWallBonk(sys, team, prm, attacker, victim) {
        const g = sys.g, E = g.effects, f = g.field, b = g.ball;
        victim.stateT += prm.stun;
        const nearTB = Math.min(victim.y - f.y, f.y + f.h - victim.y) < 14;
        E.decal(nearTB ? 'wallcrack' : 'crack', victim.x, victim.y, 1.3, 5);
        E.burst(victim.x, victim.y, 10, '#b0624a', 14, 100, 0.6);
        E.burst(victim.x, victim.y, 6, '#d9cbb0', 10, 70, 0.8);
        E.comic(victim.x, victim.y - 32, 'CRACK!', '#ffffff', 1, 0.6);
        E.shake(5, 0.3);
        if (attacker && !b.owner && U.dist(b, victim) < 50) {
          const d = U.norm(attacker.x - b.x, attacker.y - b.y);
          b.vx = d.x * prm.ballSpeed; b.vy = d.y * prm.ballSpeed; b.vz = 60;
          b.lastKickTeam = -1; b.kind = null;
        }
      },
    },
    ground_slam: {
      land(sys, team, prm, p) {
        const g = sys.g, E = g.effects, R = prm.radius;
        g.hitStop(0.08);
        E.zoom(p.x, p.y - 6, 0.14, 0.3);
        E.wave(p.x, p.y, R + 8, '#ffffff', 0.55, 3);
        E.wave(p.x, p.y, R * 0.6, '#b46bff', 0.4, 2);
        E.decal('crack', p.x, p.y, 1.8, 4);
        E.shake(6, 0.35);
        E.burst(p.x, p.y, 0, '#8a7f70', 22, 140, 0.7);
        E.comic(p.x, p.y - 34, 'SLAM!', '#ffe14f', 1.2, 0.6);
        g.sfx('hit');
        for (const o of g.teams[1 - team].players) {
          if (U.dist(o, p) > R + o.radius || g.isProtected(o) || o.state === 'meteor') continue;
          if (Act().dodged(g, o)) continue;
          const had = o.hasBall && !sys.unstealable(o);
          if (had) g.looseBall(o, p.x - o.x, p.y - o.y, 60);   // bóng rơi về chân người dậm
          const d = U.norm(o.x - p.x, o.y - p.y + 0.01);
          if (o.hit({ stun: prm.stun, kbx: d.x * prm.knock, kby: d.y * prm.knock, launch: prm.launch * sys.pmod(p, 'launch'), source: p, type: 'hard' })) sys.hardHit(p, o);
          if (had) { sys.dispatch(team, 'onTackleWin', p, o); sys.steal(p); }
        }
        p.state = 'recover'; p.stateT = prm.recover;
      },
    },
    meteor_drop: {
      aiUse(sys, team, prm) {
        const b = sys.g.ball, me = prm.owner;
        if (!b.owner || b.owner.team === team) return null;
        return me.state === 'normal' && me.airZ <= 0 ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, f = g.field;
        if (g.ball.owner === pl) g.looseBall(pl, 0, 0, 10);
        E.burst(pl.x, pl.y, 0, '#8a7f70', 16, 110);
        E.wave(pl.x, pl.y, 24, '#ffffff', 0.4, 2);
        E.comic(pl.x, pl.y - 30, 'WHOOSH!', '#ff6a1f', 1, 0.5);
        g.sfx('whoosh');
        pl.state = 'meteor'; pl.stateT = prm.aim;
        pl.airZ = 320; pl.airVz = 0; pl.charging = false;
        let phase = 0, T = prm.aim, ringT = 0;
        sys.task((dt) => {
          if (phase === 0) {
            if (pl.state !== 'meteor') return true;
            T -= dt;
            // điều khiển tâm ngắm: người chơi bằng mũi tên, AI bám người cầm bóng / đối thủ gần nhất
            let mx = 0, my = 0;
            if (g.isHuman(team) && pl.isControlled) { mx = pl.intent.mx; my = pl.intent.my; }
            else {
              const b = g.ball, tgt = b.owner && b.owner.team !== team ? b.owner : nearestOpp(g, team, pl);
              if (tgt) { const d = Math.hypot(tgt.x - pl.x, tgt.y - pl.y); if (d > 2) { mx = ((tgt.x - pl.x) / d) * Math.min(1, d / 20); my = ((tgt.y - pl.y) / d) * Math.min(1, d / 20); } }
            }
            pl.x = U.clamp(pl.x + mx * prm.speed * dt, f.x + 10, f.x + f.w - 10);
            pl.y = U.clamp(pl.y + my * prm.speed * dt, f.y + 10, f.y + f.h - 10);
            if ((ringT -= dt) <= 0) { ringT = 0.16; E.wave(pl.x, pl.y, 30, '#ff3d5a', 0.28, 1); }
            if (T > 0) return false;
            phase = 1;
            pl.state = 'slam'; pl.slamKind = 'meteor'; pl.stateT = 3; pl.airVz = -700;
            return false;
          }
          // đang rơi: đuôi lửa
          if (pl.state !== 'slam') return true;
          E.burst(pl.x, pl.y, pl.airZ + 6, Math.random() < 0.5 ? '#ff6a1f' : '#ffd23f', 3, 50, 0.4);
          return false;
        }, () => { if (pl.state === 'meteor') { pl.state = 'normal'; pl.airZ = 0; } });
      },
      land(sys, team, prm, p) {
        const g = sys.g, E = g.effects, R = prm.radius;
        g.hitStop(0.13);
        E.impactFrame();
        E.shake(10, 0.5);
        E.zoom(p.x, p.y, 0.2, 0.4);
        E.wave(p.x, p.y, R, '#ff6a1f', 0.6, 4);
        E.wave(p.x, p.y, R * 0.6, '#ffffff', 0.45, 2);
        E.decal('crater', p.x, p.y, 1.8, 5);
        E.burst(p.x, p.y, 4, '#ff6a1f', 30, 190, 0.9);
        E.burst(p.x, p.y, 2, '#6a6470', 20, 80, 1.2);
        E.comic(p.x, p.y - 40, 'KRAKOOM!!', '#ff6a1f', 1.5);
        g.sfx('hit');
        for (const o of g.teams[1 - team].players) {
          if (U.dist(o, p) > R + o.radius || g.isProtected(o)) continue;
          const had = o.hasBall;
          if (blast(o, p, prm.knock, prm.launch, prm.stun, p) && had) sys.steal(p);
        }
        p.state = 'recover'; p.stateT = 0.4;
      },
    },

    /* ================= 🌀 ẢO ẢNH ================= */
    quick_feet: {
      onSkillMove(sys, team, prm, pl) {
        const E = sys.g.effects;
        E.burst(pl.x, pl.y, 6, '#d8d0e0', 10, 70, 0.4);
        E.comic(pl.x, pl.y - 24, 'POOF', '#d8d0e0', 0.55, 0.4);
      },
    },
    witch_time: {
      onDodge(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, st = sys.st(pl, 'witch_time');
        if (st.cd > 0) return;
        st.cd = prm.cooldown;
        g.slowMo(prm.scale, prm.time);
        E.tint('#6a3dff', prm.time + 0.3, 0.28);
        E.comic(pl.x, pl.y - 30, 'DODGE!', '#c9b5ff', 1.2, 0.8);
        E.speedLines(0.6, pl.x, pl.y, '#c9b5ff');
        pl.cd.skill = 0;
        // riêng người né vẫn nhanh (bù lại slow-mo toàn sân)
        pl.buffs.push({ speed: prm.boost, t: prm.time * prm.scale + 0.1 });
        pl.glow('#c9b5ff', prm.time * prm.scale + 0.3);
        g.sfx('whoosh');
      },
    },
    shadow_clone: {
      onSkillMove(sys, team, prm, pl, d) {
        const E = sys.g.effects, a0 = Math.atan2(d.y, d.x);
        for (let i = 0; i < prm.count; i++) {
          const a = a0 + (i % 2 ? 1 : -1) * prm.spread * (1 + Math.floor(i / 2) * 0.6);
          E.clone(pl.id, pl.x, pl.y, Math.cos(a) * prm.speed, Math.sin(a) * prm.speed, prm.time);
        }
      },
      update(sys, team, prm) { cloneBlock(sys, team, prm.owner); },
    },
    clone_army: {
      aiUse(sys, team, prm) {
        const g = sys.g, b = g.ball, o = b.owner, me = prm.owner;
        if (!o || me.state !== 'normal') return null;
        if (o.team === team) return o === me && Math.abs(g.attackGoal(team).x - o.x) < 260 ? me : null;
        return U.dist(me, o) < prm.range ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, b = g.ball, dir = g.teams[team].dir;
        const cst = sys.st(team, 'clone_army');   // cả đội sút được hưởng (thủ môn bị lừa), lưu mức trừ theo chỉ số người ra chiêu
        cst.t = g.time + prm.time; cst.gk = prm.gkPenalty;
        E.callout('CLONES!', '#9d7bff', 1.0);
        E.burst(pl.x, pl.y, 6, '#d8d0e0', 24, 120, 0.7);
        E.comic(pl.x, pl.y - 30, 'POOF!', '#d8d0e0', 1, 0.6);
        g.sfx('whoosh');
        if (b.owner === pl) {
          // có bóng: 4 ảo ảnh toả lên phía trước, mỗi cái dắt 1 bóng giả -> hậu vệ bị lừa
          const decoys = [];
          for (const k of [-1.1, -0.45, 0.45, 1.1]) {
            const a = (dir > 0 ? 0 : Math.PI) + k;
            decoys.push(E.decoy(pl, b.x, b.y, Math.cos(a) * 150, Math.sin(a) * 150, prm.time));
          }
          for (const o of g.teams[1 - team].players) if (!o.isControlled) o.confused = { decoy: U.pick(decoys), t: prm.time * 0.7 };
          return;
        }
        // không có bóng: bao vây + cùng đấm người cầm bóng (hoặc đối thủ gần nhất)
        const o = b.owner && b.owner.team !== team ? b.owner : nearestOpp(g, team, pl, targetable(g));
        if (!o) return;
        for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
          const tx = o.x + Math.cos(a) * 24, ty = o.y + Math.sin(a) * 16;
          E.clone(pl.id, pl.x, pl.y, (tx - pl.x) * 2.2, (ty - pl.y) * 2.2, 1.4);
        }
        g.later(0.55, () => {
          if (g.state !== 'play') return;
          g.hitStop(0.1);
          E.impactFrame();
          E.shake(5, 0.3);
          E.combo(o.x, o.y - 30, 4);
          E.burst(o.x, o.y, 10, '#fff6a0', 16, 120);
          if (o.hasBall) {
            const d = U.norm(pl.x - o.x, pl.y - o.y);
            g.looseBall(o, d.x, d.y, 150);
            sys.steal(pl);
          }
          o.hitImmune = 0;
          o.hit({ stun: prm.stun, kbx: 0, kby: 0, source: pl, type: 'light' });
          g.sfx('hit');
        });
      },
      update(sys, team, prm) { cloneBlock(sys, team, prm.owner); },
    },

    /* ================= 🛡 THÉP ================= */
    bulldozer: {
      ...guardFloor,
      update(sys, team, prm) {
        const g = sys.g, E = g.effects;
        for (const pl of [prm.owner]) {
          if (!pl.hasBall || pl.res.guard <= 0 || pl.state !== 'normal') continue;
          if (pl.sizeMul < 1.05 && pl.sizeTarget <= 1) { E.burst(pl.x, pl.y, 8, '#c7ccd6', 10, 80, 0.4); g.sfx('block'); }
          pl.sizeTarget = Math.max(pl.sizeTarget, prm.scale); pl.sizeT = Math.max(pl.sizeT, 0.15);
          if (Math.hypot(pl.vx, pl.vy) > 30 && g.time > (pl.stompT || 0)) {
            pl.stompT = g.time + 0.3;
            E.burst(pl.x, pl.y, 0, '#8a7f70', 4, 40, 0.4);
          }
          trample(sys, team, pl, prm, 'STRIKE!', true, true);
        }
      },
    },
    giant_keeper: {
      ...guardFloor,
      update(sys, team, prm) {
        const g = sys.g, E = g.effects, b = g.ball, goal = g.ownGoal(team), dir = g.teams[team].dir;
        const threat = (b.owner && b.owner.team !== team && Math.abs(b.owner.x - goal.x) < prm.near)
          || (!b.owner && b.lastKickTeam === 1 - team && Math.abs(b.x - goal.x) < prm.near * 1.3 && b.vx * dir < -60);
        if (!threat) return;
        for (const pl of [prm.owner]) {
          if (!g.inKeeperZone(pl) || pl.res.guard <= 0 || pl.state === 'stun') continue;
          if (pl.sizeMul < 1.05 && g.time > (pl.gkPoofT || 0)) {
            pl.gkPoofT = g.time + 2;
            E.comic(pl.x, pl.y - 44, 'POOF!', '#c7ccd6', 0.9, 0.5);
            E.burst(pl.x, pl.y, 8, '#ffffff', 12, 90, 0.4);
          }
          pl.sizeTarget = Math.max(pl.sizeTarget, prm.scale); pl.sizeT = Math.max(pl.sizeT, 0.35);
        }
      },
    },
    titan: {
      aiUse(sys, team, prm) {
        const b = sys.g.ball, me = prm.owner;
        if (me.state !== 'normal') return null;
        return b.owner === me || U.dist(me, b) < 80 ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects;
        pl.titanT = prm.time;
        pl.sizeTarget = prm.scale; pl.sizeT = prm.time;
        E.burst(pl.x, pl.y, 8, '#ffffff', 14, 90);
        E.callout('GIANT!', '#ffd23f', 1.1);
        E.shake(6, 0.4);
        E.wave(pl.x, pl.y, 40, '#ffd23f', 0.5, 3);
        g.sfx('hit');
        let stepT = 0;
        sys.task((dt) => {
          if (pl.titanT <= 0) return true;
          if ((stepT -= dt) <= 0 && Math.hypot(pl.vx, pl.vy) > 20) {
            stepT = 0.32;
            E.shake(2.5, 0.12);
            E.decal('crack', pl.x, pl.y, 0.6, 1.5);
            E.burst(pl.x, pl.y, 0, '#8a7f70', 5, 40);
            g.sfx('wall');
          }
          trample(sys, team, pl, prm, 'BONK!');
          return false;
        }, () => { pl.titanT = 0; pl.sizeTarget = 1; pl.sizeT = 0; });
      },
    },

    /* ================= 🔗 CẦU NỐI ================= */
    rubber_arm: {
      onLightAttack(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, b = g.ball, L = SFC_CONFIG.game.combat.light;
        if (pl.bigPunch) return;
        // đối thủ trong tầm đấm thường -> đấm thường
        if (Act().inFront(g, pl, L.range * sys.mod(team, 'tackleRange', pl), L.arc).length) return;
        const d = fv(pl), cos = Math.cos(0.6);
        const inCone = (q) => { const dx = q.x - pl.x, dy = q.y - pl.y, dd = Math.hypot(dx, dy) || 1; return dd <= prm.reach && (dx * d.x + dy * d.y) / dd >= cos; };
        const ballT = !b.owner && b.z < 14 && inCone(b) ? b : null;
        const opp = ballT ? null : nearestOpp(g, team, pl, (o) => o.airZ <= 0 && inCone(o) && targetable(g)(o));
        const tgt = ballT || opp;
        if (!tgt || g.time < (pl.rubberT || 0)) return;
        pl.rubberT = g.time + prm.cooldown;
        E.stretch(pl.id, tgt.x, tgt.y, 0.4);
        g.later(0.16, () => {
          if (g.state !== 'play' || pl.state === 'stun') return;
          if (ballT) {
            if (b.owner || U.dist(b, pl) > prm.reach + 12) return;
            const stolen = b.lastKickTeam === 1 - team;
            b.owner = null;
            g.gainPossession(pl);
            if (stolen) sys.steal(pl);
            E.comic(pl.x, pl.y - 28, 'BOING!', '#ff8ac0', 1, 0.6);
            g.sfx('pass');
            return;
          }
          if (U.dist(opp, pl) > prm.reach + 12 || Act().dodged(g, opp)) return;
          const n = U.norm(pl.x - opp.x, pl.y - opp.y);
          let chance = prm.steal * sys.pmod(pl, 'tackleChance');
          if (sys.ironFist(pl) || pl.counterT > g.time) chance = 1;
          const had = opp.hasBall && Math.random() < chance && !sys.unstealable(opp);
          if (had) g.looseBall(opp, n.x, n.y, 120);
          g.hitStop(0.06);
          E.zoom(opp.x, opp.y, 0.1, 0.25);
          E.comic(opp.x, opp.y - 26, 'BOING!', '#ff8ac0', 1, 0.6);
          E.burst(opp.x, opp.y, 10, '#fff6a0', 10, 90);
          opp.hit({ stun: prm.stun * sys.pmod(pl, 'lightStun'), kbx: n.x * prm.pull, kby: n.y * prm.pull, source: pl, type: 'light' });
          sys.lightHit(pl, opp);
          if (had) { sys.dispatch(team, 'onTackleWin', pl, opp); sys.steal(pl); }
          g.sfx('tackle');
        });
      },
    },
    uppercut: {
      onLightHit(sys, team, prm, a, v) {
        if (!a.lastPunch || !a.lastPunch.upper) return;
        const g = sys.g, E = g.effects;
        a.airVz = prm.jump; a.airZ = Math.max(a.airZ, 0.5);
        for (let i = 0; i < 6; i++) E.burst(v.x + Math.sin(i * 1.3) * 5, v.y, i * 7, i % 2 ? '#ff6a1f' : '#ffd23f', 4, 40, 0.55);
        E.comic(v.x, v.y - 34, 'UPPERCUT!', '#ff6a1f', 1, 0.7);
        g.hitStop(0.06);
        E.shake(4, 0.25);
        g.sfx('hit');
      },
    },
    iron_fist: {
      ...guardFloor,
      onLightHit(sys, team, prm, a, v) {
        if (a.res.guard <= 0) return;
        const E = sys.g.effects;
        if (sys.resActive(a, 'rage')) a.res.rage = Math.min(RES().rage.max, a.res.rage + prm.rage);
        E.burst((a.x + v.x) / 2, (a.y + v.y) / 2, 10, '#ffffff', 8, 110, 0.3);
        E.burst((a.x + v.x) / 2, (a.y + v.y) / 2, 10, '#ffd23f', 4, 90, 0.3);
        if (!sys.has(a, 'street_fighter')) E.comic(v.x, v.y - 26, 'CLANG!', '#c7ccd6', 0.7, 0.45);
      },
    },
    one_two: {
      onChargedShot(sys, team, prm, pl, ball) {
        if (!pl.volley) return;
        const E = sys.g.effects;
        ball.fx.duo = true;
        E.comic(pl.x, pl.y - 28, 'VOLLEY!', '#ffb13d', 0.9, 0.55);
        E.wave(pl.x, pl.y, 14, '#ffb13d', 0.25, 2);
      },
    },
    captain: {
      onPassReceived(sys, team, prm, rc) {
        const g = sys.g;
        if (g.time < (rc.capT || 0) || rc.res.guard >= RES().guard.max) return;
        rc.res.guard++;
        rc.capT = g.time + prm.cooldown;
        g.effects.shield(rc.x, rc.y - 8, 11, '#ffd23f', 0.45);
        g.effects.burst(rc.x, rc.y, 10, '#ffd23f', 6, 50, 0.4);
      },
    },
    counter_strike: {
      onDodge(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, st = sys.st(pl, 'counter_strike');
        pl.counterT = g.time + prm.window;
        pl.cd.light = 0;
        pl.glow('#ff3d5a', prm.window);
        if (!(st.cd > 0)) {
          st.cd = prm.cooldown;
          E.impactFrame();
          E.callout('COUNTER!', '#ff3d5a', 0.8);
        } else E.comic(pl.x, pl.y - 28, 'COUNTER!', '#ff3d5a', 0.8, 0.5);
      },
      onLightHit(sys, team, prm, a, v) {
        if (!a.lastPunch || !a.lastPunch.counter) return;
        if (sys.resActive(a, 'rage')) a.res.rage = Math.min(RES().rage.max, a.res.rage + prm.rage);
        sys.g.hitStop(0.06);
        sys.g.effects.comic(v.x, v.y - 30, 'CRACK!', '#ff3d5a', 1, 0.5);
      },
    },
    flying_kick: {
      onHardAttack(sys, team, prm, pl) {
        if (!(pl.flyMul > 1) || pl.state !== 'kick') return;
        const g = sys.g, E = g.effects;
        E.afterimage(pl, 0.4);
        E.decal('skid', pl.x, pl.y, 1.2, 2, pl.facing);
        E.comic(pl.x, pl.y - 28, 'FLYING KICK!', '#ff6a1f', 0.8, 0.5);
        if (pl.flyMul >= 1.8 && bigMoment(g)) E.speedLines(0.35, pl.x, pl.y, '#ffd8b0');
        let k = 0;
        sys.task(() => {
          if (pl.state !== 'kick') return true;
          if (k++ % 2 === 0) E.burst(pl.x, pl.y, 6, Math.random() < 0.5 ? '#ff6a1f' : '#ffd23f', 3, 40, 0.4);
          return false;
        });
      },
    },
    ghost_ball: {
      onShoot(sys, team, prm, pl, ball) {
        const g = sys.g, E = g.effects;
        const srcs = E.V.clones.filter((c) => c.pid === pl.id && c.t > 0.1).concat(E.decoys.filter((d) => d.srcId === pl.id && d.alive));
        if (!srcs.length) return;
        const goal = g.attackGoal(team), f = g.field;
        for (const s of srcs.slice(0, prm.max)) {
          const ty = goal.y + U.rand(-1, 1) * (f.goalWidth / 2 - 6);
          const d = U.norm(goal.x - s.x, ty - s.y);
          E.decoy(null, s.x, s.y, d.x * prm.speed, d.y * prm.speed, 1.1);
          E.burst(s.x, s.y, 6, '#d8d0e0', 8, 60, 0.4);
        }
        ball.gkMod += prm.gkPenalty;
        E.comic(pl.x, pl.y - 30, 'GHOST!', '#9d7bff', 0.9, 0.6);
      },
    },
    scissor_kick: {
      onScissor(sys, team, prm, pl, b) {
        const g = sys.g, E = g.effects, K = SFC_CONFIG.game.kick, f = g.field;
        const goal = g.attackGoal(team);
        const ty = goal.y + U.rand(-0.6, 0.6) * (f.goalWidth / 2);
        const d = U.norm(goal.x - b.x, ty - b.y);
        const spd = K.shotMaxSpeed * prm.speed * pl.stats.power * sys.pmod(pl, 'shotPower');
        b.kick(pl, d.x * spd, d.y * spd, 40);
        b.kind = 'shot';
        b.fx.scissor = { stun: prm.stun };
        b.pierce = prm.pierce;
        pl.facing = Math.atan2(d.y, d.x);
        sys.chargedShot(pl, b, 1);
        const st = sys.st(pl, 'scissor_kick');
        if (!(st.cd > 0)) { st.cd = prm.cooldown; g.slowMo(0.3, 0.3); }
        E.wave(b.x, b.y, 18, '#ffffff', 0.35, 2);
        E.comic(pl.x, pl.y - 30, 'SCISSOR KICK!', '#b46bff', 1, 0.6);
        E.shake(4, 0.25);
        g.sfx('kick', 1);
        let T = 0.8, k = 0;
        sys.task((dt) => {
          T -= dt;
          if (T <= 0 || b.owner || !b.fx.scissor) return true;
          if (k++ % 4 === 0) E.wave(b.x, b.y, 10, '#dffbff', 0.25, 1);
          return false;
        });
      },
    },

    /* ================= 🎲 HỖN LOẠN ================= */
    bomb_ball: {
      onKickoff(sys, team, prm) { const st = sys.st(prm.owner, 'bomb_ball'); st.t = 0; st.fuse = 0; },
      update(sys, team, prm, dt) {
        const g = sys.g, E = g.effects, b = g.ball, st = sys.st(prm.owner, 'bomb_ball');
        if (!st.fuse) {
          st.t = (st.t || 0) + dt;
          if (st.t < prm.every) return;
          st.fuse = prm.fuse; st.last = Math.ceil(prm.fuse) + 1;
          E.comic(b.x, b.y - b.z - 18, 'BOMB!', '#ff3d5a', 1, 0.6);
        }
        st.fuse -= dt;
        b.skin = 'bomb';   // giữ hình bom kể cả khi có người khống chế bóng
        const n = Math.ceil(st.fuse);
        if (n < st.last && n > 0) { st.last = n; E.comic(b.x, b.y - b.z - 16, String(n), '#ff3d5a', 1.1, 0.5); g.sfx('menu'); }
        if (st.fuse > 0) return;
        st.fuse = 0; st.t = 0;
        b.skin = null;
        const x = b.owner ? b.owner.x : b.x, y = b.owner ? b.owner.y : b.y;
        g.hitStop(0.1);
        E.impactFrame();
        E.shake(9, 0.5);
        E.wave(x, y, prm.radius, '#ff6a1f', 0.55, 4);
        E.decal('scorch', x, y, 2, 5);
        E.decal('crack', x, y, 1.2, 4);
        E.burst(x, y, 6, '#ff6a1f', 30, 180, 0.8);
        E.burst(x, y, 4, '#6a6470', 20, 70, 1.2);
        E.comic(x, y - 36, 'KABOOM!', '#ff6a1f', 1.5);
        if (b.owner) g.looseBall(b.owner, U.rand(-1, 1), U.rand(-1, 1), 200);
        for (const q of g.players) if (U.dist(q, { x, y }) < prm.radius && q.state !== 'meteor') blast(q, { x, y: y + 1 }, prm.knock, prm.launch, prm.stun, null);
        g.sfx('hit');
      },
    },
  });
})();
