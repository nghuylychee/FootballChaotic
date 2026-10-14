/* Tuyệt kỹ lai (docs/ULT_RECIPE.md): mở khi đạt X2 + Y2 (cores.config.js -> ults.hybrids), gắn vào SFC.CoreBehaviors.
 * Hook giống cores.js: aiUse(sys, team, prm) -> người ra chiêu | null · onUltimate(sys, team, prm, pl) (sau cut-in).
 * Hình ghép từ VFX Kit (systems/vfxkit.js) + helper của cores-new.js (SFC.CoreHelpers: nearestOpp, targetable, blast).
 * Luật (user duyệt 2026-10-13): chiêu cần bóng có needsBall (CoreSystem.ultBlocked) và không bao giờ giật bóng;
 * mọi đòn có báo trước sau cut-in + né được bằng Z (Actions.dodged); trạng thái bất khả xâm phạm ngắn.
 * Trạng thái mới: Steel Formation = CoreSystem.passGuarded + armorT · Mirage Sprint = p.ghostT (chỉ vẽ mờ, vẫn đánh trúng được).
 * 13 cặp sau (2026-10-14) chỉ dùng viên gạch VFX + cờ bóng sẵn có -> online không cần đổi định dạng gói tin.
 */
window.SFC = window.SFC || {};

(function () {
  const U = SFC.U;
  const B = SFC.CoreBehaviors, H = SFC.CoreHelpers;
  const Act = () => SFC.Actions;
  const fv = (p) => ({ x: Math.cos(p.facing), y: Math.sin(p.facing) });

  // người đang cầm bóng của đội (Tuyệt kỹ needsBall). Mất bóng trong lúc cut-in -> null: chiêu xịt, không giật bóng
  function teamBall(sys, team) {
    const b = sys.g.ball;
    return b.owner && b.owner.team === team ? b.owner : null;
  }
  // đồng đội gần nhất còn đứng được (không tính người bị choáng / đang ở ngoài màn hình)
  function nearestMate(g, team, p) {
    let best = null, bd = Infinity;
    for (const m of g.teams[team].players) {
      if (m === p || m.state === 'stun' || m.state === 'meteor') continue;
      const d = U.dist(m, p);
      if (d < bd) { bd = d; best = m; }
    }
    return best;
  }
  // hướng lao: người chơi đang giữ phím -> theo phím; không thì về phía target (hoặc khung thành đối phương)
  function aimDir(g, team, pl, target) {
    let dx = pl.intent.mx, dy = pl.intent.my;
    if (!(g.isHuman(team) && pl.isControlled) || Math.hypot(dx, dy) < 0.2) {
      const t = target || g.attackGoal(team);
      dx = t.x - pl.x; dy = t.y - pl.y;
    }
    return U.norm(dx, dy);
  }
  const nearGoal = (g, team, p, d) => Math.abs(g.attackGoal(team).x - p.x) < d;
  // khoá người trong lúc chiêu đang diễn (không tự chuyền / sút / bị điều khiển), t giây; unlock() trả lại ngay
  const hold = (p, t) => { p.state = 'recover'; p.stateT = Math.max(p.stateT || 0, t); p.charging = false; };
  const unlock = (p) => { if (p.state === 'recover') { p.state = 'normal'; p.stateT = 0; } };
  // văng về phía tường trên / dưới gần nhất -> vết nứt khi chạm tường (như Bách Quyền)
  function wallCrack(sys, o) {
    const g = sys.g, f = g.field, E = g.effects;
    sys.task(() => {
      const r = o.radius + 1;
      if (o.y <= f.y + r || o.y >= f.y + f.h - r || o.x <= f.x + r || o.x >= f.x + f.w - r) {
        E.decal(o.x <= f.x + r || o.x >= f.x + f.w - r ? 'crack' : 'wallcrack', o.x, o.y, 1.4, 5);
        E.burst(o.x, o.y, 10, '#d9cbb0', 16, 100);
        return true;
      }
      return o.state !== 'stun';
    });
  }

  const TAU = Math.PI * 2;
  // đồng đội đứng cao nhất về phía khung thành đối phương (không tính s, người choáng / đang ở ngoài màn hình)
  function forwardMate(g, team, s) {
    const dir = g.teams[team].dir;
    let best = null, bx = -Infinity;
    for (const m of g.teams[team].players) {
      if (m === s || m.state === 'stun' || m.state === 'meteor') continue;
      if (m.x * dir > bx) { bx = m.x * dir; best = m; }
    }
    return best;
  }
  // đối thủ nhắm được, đang đứng dưới đất, trong bán kính r quanh p (gần trước)
  function targetsNear(g, team, p, r) {
    return g.teams[1 - team].players.filter((o) => H.targetable(g)(o) && o.airZ <= 0 && U.dist(o, p) <= r).sort((a, b) => U.dist(a, p) - U.dist(b, p));
  }
  // đối thủ đứng trên đoạn (x0, y0) -> (x1, y1) bị sét giật văng sang bên (né Z / đang được bảo vệ thì thôi)
  function zapLine(sys, team, src, x0, y0, x1, y1, prm) {
    const g = sys.g, E = g.effects, d = U.norm(x1 - x0, y1 - y0);
    for (const o of g.teams[1 - team].players) {
      if (U.segDist(o.x, o.y, x0, y0, x1, y1) > prm.width || g.isProtected(o) || o.state === 'meteor' || Act().dodged(g, o)) continue;
      const side = (o.x - x0) * -d.y + (o.y - y0) * d.x >= 0 ? 1 : -1;
      o.hitImmune = 0;
      o.hit({ stun: prm.stun, kbx: -d.y * side * prm.knock, kby: d.x * side * prm.knock, source: src, type: 'slash' });
      E.bolt(o.x, o.y - 22, o.x, o.y - 2, '#bdf4ff', 0.4);
      E.burst(o.x, o.y, 8, '#bdf4ff', 12, 90);
      E.comic(o.x, o.y - 30, 'ZZT!', '#7fe7ff', 0.8, 0.5);
    }
  }
  // người cầm bóng sút thẳng về khung thành đối phương (dùng chung cho các Tuyệt kỹ sút)
  function shootGoal(g, team, s) {
    unlock(s);
    const goal = g.attackGoal(team);
    s.facing = Math.atan2(goal.y - s.y, goal.x - s.x);
    Act().shoot(g, s, 1, U.rand(-0.7, 0.7));
  }

  Object.assign(B, {
    /* 🎯 SÁT THỦ + 🎼 TIKI-TAKA — Comet One-Two: bóng hoá tia vàng sang đồng đội rồi bật về, vô-lê tối đa xuyên người */
    comet_onetwo: {
      aiUse(sys, team, prm) {
        const g = sys.g, me = prm.owner;
        return g.ball.owner === me && me.state === 'normal' && nearGoal(g, team, me, 300) && nearestMate(g, team, me) ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, b = g.ball;
        const s = teamBall(sys, team);
        if (!s) return;
        const m = nearestMate(g, team, s);
        E.callout('ONE-TWO!', '#ffb13d', 0.9);
        // bóng "dịch chuyển" dọc tia vàng: không ai cắt được
        const beam = (from, to) => {
          E.beam(from.x, from.y - 4, Math.atan2(to.y - from.y, to.x - from.x), U.dist(from, to), 5, '#ffd23f', 0.6);
          E.burst(to.x, to.y, 10, '#ffd23f', 10, 70, 0.4);
          E.ring(to.x, to.y - 6, '#ffd23f');
          g.sfx('pass');
        };
        const volley = () => {
          if (g.state !== 'play' || b.owner !== s || s.state === 'stun') return;
          unlock(s);
          const goal = g.attackGoal(team);
          s.facing = Math.atan2(goal.y - s.y, goal.x - s.x);
          Act().shoot(g, s, 1, U.rand(-0.7, 0.7));
          b.vx *= prm.speed; b.vy *= prm.speed;
          b.gkMod += prm.gk;
          b.fx.scissor = { stun: prm.stun }; b.pierce = prm.pierce;   // bóng xuyên người (dùng chung với Song Phi)
          b.fx.duo = true;
          g.hitStop(0.06);
          E.impactFrame();
          E.comic(s.x, s.y - 32, 'VOLLEY!', '#ffb13d', 1.2, 0.7);
          E.wave(s.x, s.y, 30, '#ffb13d', 0.45, 3);
          E.shake(5, 0.3);
          g.sfx('kick', 1);
        };
        if (!m) { volley(); return; }
        const total = 0.05 + prm.gap * 1.6 + 0.1;
        hold(s, total); hold(m, prm.gap + 0.1);
        g.later(0.05, () => {
          if (g.state !== 'play' || b.owner !== s) return;
          beam(s, m); b.owner = null; g.gainPossession(m);
          g.later(prm.gap, () => {
            if (g.state !== 'play' || b.owner !== m || s.state === 'stun') return;
            unlock(m);
            beam(m, s); b.owner = null; g.gainPossession(s);
            g.later(prm.gap * 0.6, volley);
          });
        });
      },
    },

    /* 🥊 ĐẤU SĨ + 🦵 VÕ SĨ ĐÁ — Rising Dragon: lao tới, móc hàm hất lên, nhảy theo đá văng vào tường, bóng rơi về chân */
    rising_dragon: {
      aiUse(sys, team, prm) {
        const g = sys.g, me = prm.owner;
        if (me.state !== 'normal' || me.airZ > 0) return null;
        const o = H.nearestOpp(g, team, me, (q) => H.targetable(g)(q) && q.airZ <= 0);
        return o && U.dist(o, me) < prm.range * 0.6 && (o.hasBall || Math.random() < 0.3) ? me : null;
      },
      // lao tới (nhìn thấy được, mục tiêu lướt Z kịp thì trượt) rồi mới móc hàm
      onUltimate(sys, team, prm, pl) {
        const o = H.nearestOpp(sys.g, team, pl, H.targetable(sys.g));
        if (!o) return;
        sys.g.effects.speedLines(0.3, pl.x, pl.y, '#ffd8b0');
        H.rush(sys, pl, o, prm.rush, prm.range / prm.rush + 0.15, () => this.combo(sys, team, prm, pl, o));
      },
      combo(sys, team, prm, pl, o) {
        const g = sys.g, E = g.effects, f = g.field, b = g.ball;
        const side = pl.x < o.x ? -1 : 1;
        pl.facing = side > 0 ? Math.PI : 0;
        if (b.owner === pl) b.follow(0);
        if (o.hasBall && !sys.unstealable(o)) { g.looseBall(o, pl.x - o.x, pl.y - o.y, 40); sys.steal(pl); }   // bóng rơi về chân
        // móc hàm: hất thẳng lên + cột lửa + rồng lửa cuộn xoắn bay lên quanh người bị hất
        o.hitImmune = 0; o.state = 'normal'; o.stateT = 0;
        o.hit({ stun: 1.2, kbx: 0, kby: 0, launch: prm.launch, source: pl, type: 'light' });
        E.dragon(o.x, o.y + 2, o.x, o.y - 115, 1.0, '#ff6a1f', 1.3, 16);
        E.wave(o.x, o.y, 26, '#ff6a1f', 0.4, 2);
        for (let i = 0; i < 8; i++) E.burst(o.x + Math.sin(i * 1.3) * 5, o.y, i * 8, i % 2 ? '#ff6a1f' : '#ffd23f', 4, 40, 0.6);
        E.comic(o.x, o.y + 26, 'RISING DRAGON!', '#ff6a1f', 1.2, 0.8);   // chữ dưới chân, không che con rồng bay lên
        g.hitStop(0.08);
        E.shake(5, 0.3);
        g.sfx('hit');
        // người ra chiêu bật lên theo
        pl.airVz = prm.launch * 0.75; pl.airZ = Math.max(pl.airZ, 0.5);
        pl.state = 'recover'; pl.stateT = prm.delay + 0.4;
        g.later(prm.delay, () => {
          if (g.state !== 'play') return;
          // cú đá bay: văng về phía tường trên / dưới gần nhất -> chắc chắn BONK
          const toTop = o.y - f.y < f.y + f.h - o.y, kd = U.norm(-side * 0.4, toTop ? -1 : 1);
          // rồng thứ hai lao bổ xuống theo cú đá, đẩy nạn nhân về phía tường
          E.dragon(pl.x, pl.y - pl.airZ - 12, o.x + kd.x * 100, o.y + kd.y * 100, 0.65, '#ff3d5a', 0.7, 8);
          o.state = 'normal'; o.stateT = 0;
          H.blast(o, pl, prm.knock, 60, prm.stun, pl, kd);
          g.hitStop(0.12);
          E.impactFrame();
          E.zoom(o.x, o.y - o.airZ, 0.18, 0.35);
          E.comic(o.x, o.y - o.airZ - 30, 'DRAGON KICK!', '#ff3d5a', 1.3, 0.7);
          E.afterimage(pl, 0.3);
          E.shake(8, 0.4);
          g.sfx('hit');
          sys.moment(team, 'rising_dragon', 'RISING DRAGON!', 70);
          wallCrack(sys, o);
        });
      },
    },

    /* 🏃 TỐC ĐỘ + 🦵 VÕ SĨ ĐÁ — Comet Dropkick: phóng ngang sân thành cú đá bay bốc lửa, hất tung mọi người trên đường */
    comet_dropkick: {
      aiUse(sys, team, prm) {
        const b = sys.g.ball, me = prm.owner;
        if (me.state !== 'normal' || me.airZ > 0 || !b.owner || b.owner.team === team) return null;
        return U.dist(me, b.owner) < prm.distance * 0.8 ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, f = g.field, b = g.ball;
        const tgt = b.owner && b.owner.team !== team ? b.owner : H.nearestOpp(g, team, pl, H.targetable(g));
        const d = aimDir(g, team, pl, tgt);
        if (b.owner === pl) g.looseBall(pl, d.x, d.y, 170);   // đang cầm bóng: đá bóng đi trước, người bay theo
        const x0 = pl.x, y0 = pl.y;
        const x1 = U.clamp(x0 + d.x * prm.distance, f.x + 8, f.x + f.w - 8), y1 = U.clamp(y0 + d.y * prm.distance, f.y + 8, f.y + f.h - 8);
        // báo trước: vạch lửa mảnh dọc đường bay + người ra chiêu lấy đà -> đối thủ kịp tránh / lướt Z
        E.beam(x0, y0 - 3, Math.atan2(y1 - y0, x1 - x0), Math.hypot(x1 - x0, y1 - y0), 3, '#ff6a1f', prm.telegraph + 0.1);
        E.burst(x0, y0, 0, '#ff6a1f', 10, 60, prm.telegraph);
        pl.state = 'recover'; pl.stateT = prm.telegraph + 0.05; pl.charging = false;
        g.later(prm.telegraph, () => {
          if (g.state !== 'play' || pl.state === 'stun') return;
          this.fly(sys, team, prm, pl, d, x0, y0, x1, y1);
        });
      },
      fly(sys, team, prm, pl, d, x0, y0, x1, y1) {
        const g = sys.g, E = g.effects;
        const len = Math.hypot(x1 - x0, y1 - y0);
        E.tint('#3a0a00', 0.4, 0.3);
        g.slowMo(0.3, 0.25);
        // vệt lửa + tàn ảnh dọc đường bay
        for (let k = 0; k < len; k += 12) {
          E.decal('scorch', x0 + d.x * k, y0 + d.y * k, 0.8, 3);
          E.burst(x0 + d.x * k, y0 + d.y * k, 6, k % 24 ? '#ff6a1f' : '#ffd23f', 3, 50, 0.5);
        }
        for (let k = 0; k < len; k += 40) E.afterimage(Object.assign({}, pl, { x: x0 + d.x * k, y: y0 + d.y * k, facing: Math.atan2(d.y, d.x) }), 0.35);
        for (const o of g.teams[1 - team].players) {
          if (U.segDist(o.x, o.y, x0, y0, x1, y1) > prm.width || g.isProtected(o) || o.state === 'meteor' || Act().dodged(g, o)) continue;
          const s = (o.x - x0) * -d.y + (o.y - y0) * d.x >= 0 ? 1 : -1;
          const had = o.hasBall && !sys.unstealable(o);
          if (H.blast(o, pl, prm.knock, prm.launch, prm.stun, pl, U.norm(d.x - d.y * s * 0.8, d.y + d.x * s * 0.8))) {
            E.comic(o.x, o.y - 30, 'BOOM!', '#ff6a1f', 1, 0.5);
            E.burst(o.x, o.y, 8, '#ffd23f', 12, 110, 0.5);
            if (had) sys.steal(pl);
          }
        }
        pl.x = x1; pl.y = y1; pl.facing = Math.atan2(d.y, d.x);
        pl.state = 'recover'; pl.stateT = 0.35;
        g.hitStop(0.08);
        E.impactFrame();
        E.speedLines(0.4, pl.x, pl.y, '#ffd8b0');
        E.shake(6, 0.35);
        E.comic(pl.x, pl.y - 30, 'COMET!', '#ff6a1f', 1.2, 0.6);
        g.sfx('whoosh');
        g.sfx('hit');
      },
    },

    /* 🌀 ẢO ẢNH + 🎯 SÁT THỦ — Phantom Barrage: bạn + phân thân cùng sút một lúc, chỉ 1 quả thật */
    phantom_barrage: {
      aiUse(sys, team, prm) {
        const g = sys.g, me = prm.owner;
        return g.ball.owner === me && me.state === 'normal' && nearGoal(g, team, me, 280) ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, b = g.ball, f = g.field;
        const s = teamBall(sys, team), dir = g.teams[team].dir;
        if (!s) return;
        E.callout('BARRAGE!', '#9d7bff', 0.9);
        E.burst(s.x, s.y, 6, '#d8d0e0', 20, 110, 0.6);
        g.sfx('whoosh');
        // phân thân toả sang hai bên, lùi nhẹ ra sau người sút
        const offs = [-38, 38, -76, 76, -114].slice(0, prm.clones);
        const spots = offs.map((k) => ({ x: U.clamp(s.x - dir * 10, f.x + 10, f.x + f.w - 10), y: U.clamp(s.y + k, f.y + 10, f.y + f.h - 10) }));
        for (const p of spots) E.clone(s.id, s.x, s.y, (p.x - s.x) * 3, (p.y - s.y) * 3, prm.delay + 0.5);
        hold(s, prm.delay + 0.1);
        g.later(prm.delay, () => {
          if (g.state !== 'play' || b.owner !== s || s.state === 'stun') return;
          unlock(s);
          const goal = g.attackGoal(team);
          s.facing = Math.atan2(goal.y - s.y, goal.x - s.x);
          Act().shoot(g, s, 1, U.rand(-0.7, 0.7));
          b.gkMod += prm.gk;
          for (const p of spots) {
            const ty = goal.y + U.rand(-1, 1) * (f.goalWidth / 2 - 6);
            const d = U.norm(goal.x - p.x, ty - p.y);
            E.decoy(null, p.x, p.y, d.x * prm.speed, d.y * prm.speed, 1.1);
            E.burst(p.x, p.y, 6, '#d8d0e0', 8, 60, 0.4);
            E.popClone(s.id, p.x, p.y);
          }
          E.comic(s.x, s.y - 32, 'GHOST!', '#9d7bff', 1.2, 0.6);
          E.shake(4, 0.25);
          g.sfx('kick', 1);
        });
      },
    },

    /* 🛡 THÉP + 🎼 TIKI-TAKA — Steel Formation: cả đội hoá bạc, miễn choáng, đường chuyền không bị cắt */
    steel_formation: {
      aiUse(sys, team, prm) {
        const b = sys.g.ball, me = prm.owner;
        return me.state === 'normal' && b.owner ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects;
        sys.st(team, 'steel_formation').t = g.time + prm.time;
        E.callout('STEEL FORMATION!', '#c7ccd6', 1.1);
        E.tint('#c7ccd6', 0.5, 0.2);
        for (const m of g.teams[team].players) {
          m.armorT = Math.max(m.armorT || 0, g.time + prm.time);
          m.glow('#c7ccd6', prm.time);
          E.shield(m.x, m.y - 8, 14, '#c7ccd6', 0.6);
          E.burst(m.x, m.y, 10, '#ffffff', 10, 90, 0.4);
        }
        if (pl) E.wave(pl.x, pl.y, 50, '#c7ccd6', 0.5, 3);
        E.shake(4, 0.3);
        g.sfx('block');
      },
    },

    /* 🥊 ĐẤU SĨ + 🛡 THÉP — Iron Hammer: nắm đấm thép khổng lồ nện xuống phía trước, choáng hết, bóng rơi về chân */
    iron_hammer: {
      aiUse(sys, team, prm) {
        const g = sys.g, me = prm.owner;
        if (me.state !== 'normal' || me.airZ > 0) return null;
        const o = H.nearestOpp(g, team, me, H.targetable(g));
        return o && U.dist(o, me) < prm.range && (o.hasBall || Math.random() < 0.4) ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects;
        const o = H.nearestOpp(g, team, pl, H.targetable(g));
        if (o) pl.facing = Math.atan2(o.y - pl.y, o.x - pl.x);
        const d = fv(pl), cx = pl.x + d.x * prm.range * 0.6, cy = pl.y + d.y * prm.range * 0.6;
        pl.armorT = Math.max(pl.armorT || 0, g.time + prm.armor);
        pl.glow('#c7ccd6', prm.armor);
        pl.state = 'recover'; pl.stateT = prm.windup + 0.35;
        // báo trước: giơ nắm đấm thép khổng lồ lên cao + vòng bóng đổ nơi sắp nện -> đối thủ kịp chạy ra / lướt Z
        E.stretch(pl.id, cx, cy - 26, prm.windup + 0.1, 3.5);
        E.wave(cx, cy, prm.range * 0.55, '#8a93a3', prm.windup, 1);
        E.decal('crater', cx, cy, 0.6, prm.windup + 0.1);
        E.comic(pl.x, pl.y - 34, 'IRON HAMMER!', '#c7ccd6', 1.1, 0.7);
        g.sfx('whoosh');
        g.later(prm.windup, () => {
          if (g.state !== 'play') return;
          E.stretch(pl.id, cx, cy, 0.3, 3.5);
          g.hitStop(0.12);
          E.impactFrame();
          E.zoom(cx, cy, 0.18, 0.35);
          E.decal('crack', cx, cy, 2, 5);
          E.wave(cx, cy, prm.range * 0.8, '#c7ccd6', 0.5, 3);
          E.burst(cx, cy, 2, '#8a7f70', 24, 140, 0.8);
          E.comic(cx, cy - 30, 'CLANG!!', '#ffffff', 1.4, 0.6);
          E.shake(9, 0.45);
          for (const q of Act().inFront(g, pl, prm.range, prm.arc)) {
            if (g.isProtected(q) || q.state === 'meteor' || Act().dodged(g, q)) continue;
            if (q.hasBall && !sys.unstealable(q)) { g.looseBall(q, pl.x - q.x, pl.y - q.y, 50); sys.steal(pl); }
            q.hitImmune = 0;
            if (q.state === 'stun') { q.state = 'normal'; q.stateT = 0; }
            q.hit({ stun: prm.stun, kbx: 0, kby: 0, source: pl, type: 'hard' });
            E.burst(q.x, q.y, 10, '#ffffff', 8, 80, 0.4);
          }
          g.sfx('hit');
          g.sfx('block');
        });
      },
    },

    /* 🏃 TỐC ĐỘ + 🌀 ẢO ẢNH — Mirage Sprint: tàng hình (vẽ mờ, vẫn đánh trúng được — đọc ra người thật là cướp được), bầy ảo ảnh dắt bóng giả toả ra */
    mirage_sprint: {
      aiUse(sys, team, prm) {
        const g = sys.g, me = prm.owner;
        if (g.ball.owner !== me || me.state !== 'normal') return null;
        const o = H.nearestOpp(g, team, me);
        return o && U.dist(o, me) < 90 ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects;
        pl.ghostT = prm.time;
        pl.buffs.push({ speed: prm.boost, t: prm.time });
        E.burst(pl.x, pl.y, 6, '#d8d0e0', 22, 110, 0.6);
        E.comic(pl.x, pl.y - 30, 'MIRAGE!', '#9d7bff', 1.1, 0.7);
        const base = Math.hypot(pl.vx, pl.vy) > 10 ? Math.atan2(pl.vy, pl.vx) : pl.facing;
        const decoys = [];
        for (let i = 0; i < prm.decoys; i++) {
          const a = base + (i - (prm.decoys - 1) / 2) * 0.7;
          decoys.push(E.decoy(pl, pl.x, pl.y, Math.cos(a) * prm.speed, Math.sin(a) * prm.speed, prm.time));
        }
        // đối thủ do máy điều khiển đuổi theo ảo ảnh
        for (const o of g.teams[1 - team].players) if (!o.isControlled && !g.inKeeperZone(o)) o.confused = { decoy: U.pick(decoys), t: prm.time * 0.8 };
        g.sfx('whoosh');
      },
    },

    /* 🥊 ĐẤU SĨ + 🎼 TIKI-TAKA — Slingshot: vươn tay túm đồng đội, bắn họ (cùng quả bóng) như ná về phía khung thành */
    slingshot: {
      aiUse(sys, team, prm) {
        const g = sys.g, b = g.ball, me = prm.owner;
        if (me.state !== 'normal' || !b.owner || b.owner.team !== team) return null;
        return nearGoal(g, team, b.owner, 380) ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, b = g.ball, f = g.field;
        if (!teamBall(sys, team)) return;
        const m = nearestMate(g, team, pl) || pl;   // không có đồng đội: tự bắn mình
        if (m !== pl) E.stretch(pl.id, m.x, m.y, prm.grab + 0.15);
        E.comic(pl.x, pl.y - 30, 'SLINGSHOT!', '#ff8ac0', 1.1, 0.7);
        g.sfx('whoosh');
        g.later(prm.grab, () => {
          if (g.state !== 'play' || m.state === 'stun') return;
          if (b.owner && b.owner !== m && b.owner.team === team) { b.owner = null; g.gainPossession(m); }   // bóng bay cùng người
          const goal = g.attackGoal(team), d = U.norm(goal.x - m.x, goal.y - m.y);
          const x0 = m.x, y0 = m.y;
          const x1 = U.clamp(x0 + d.x * prm.distance, f.x + 10, f.x + f.w - 10), y1 = U.clamp(y0 + d.y * prm.distance, f.y + 10, f.y + f.h - 10);
          m.state = 'recover'; m.stateT = prm.flight + 0.2; m.charging = false;
          E.wave(x0, y0, 22, '#ff8ac0', 0.35, 2);
          E.comic(x0, y0 - 28, 'BOING!', '#ff8ac0', 1, 0.5);
          g.sfx('pass');
          let T = 0, k0 = 0;
          sys.task((dt) => {
            T += dt;
            const k = Math.min(1, T / prm.flight);
            m.x = U.lerp(x0, x1, k); m.y = U.lerp(y0, y1, k);
            m.vx = (d.x * prm.distance) / prm.flight; m.vy = (d.y * prm.distance) / prm.flight;
            m.facing = Math.atan2(d.y, d.x);
            if (b.owner === m) b.follow(0);
            if (k - k0 >= 0.2) { k0 = k; E.afterimage(m, 0.3); }
            for (const o of g.teams[1 - team].players) {
              if (o.state === 'stun' || g.isProtected(o) || U.dist(o, m) > m.radius + o.radius + 4 || (o.slingT || 0) > g.time) continue;
              o.slingT = g.time + 1;
              if (Act().dodged(g, o)) continue;
              if (H.blast(o, m, prm.knock, prm.launch, prm.stun, m)) { E.comic(o.x, o.y - 28, 'BONK!', '#ff8ac0', 0.9, 0.5); g.sfx('hit'); }
            }
            return k >= 1;
          }, () => {
            m.vx *= 0.3; m.vy *= 0.3;
            if (m.state === 'recover') { m.state = 'normal'; m.stateT = 0; }
          });
        });
      },
    },
    /* 🏃 TỐC ĐỘ + 🎼 TIKI-TAKA — Lightning Relay: bóng hoá tia sét sang đồng đội đứng cao nhất, người nhận bứt tốc toé điện */
    lightning_relay: {
      aiUse(sys, team, prm) {
        const g = sys.g, me = prm.owner, s = teamBall(sys, team);
        if (!s || s.state !== 'normal' || me.state !== 'normal') return null;
        const m = forwardMate(g, team, s);
        return m && (m.x - s.x) * g.teams[team].dir > 40 ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, b = g.ball;
        const s = teamBall(sys, team);
        if (!s) return;
        const m = forwardMate(g, team, s) || s;
        // báo trước: vạch sét mảnh từ người cầm bóng tới người nhận -> đối thủ đứng chắn kịp tránh / lướt Z
        if (m !== s) E.beam(s.x, s.y - 4, Math.atan2(m.y - s.y, m.x - s.x), U.dist(s, m), 2, '#bdf4ff', prm.telegraph + 0.1);
        E.bolt(s.x, s.y - 22, s.x, s.y - 2, '#bdf4ff', prm.telegraph);
        hold(s, prm.telegraph + 0.05);
        g.sfx('zap');
        g.later(prm.telegraph, () => {
          if (g.state !== 'play' || b.owner !== s) return;
          unlock(s);
          if (m !== s && m.state !== 'stun') {
            for (let i = 0; i < 3; i++) E.bolt(s.x, s.y - 6 + (i - 1) * 2, m.x, m.y - 6, i ? '#7fe7ff' : '#ffffff', 0.45);
            zapLine(sys, team, s, s.x, s.y, m.x, m.y, prm);
            b.owner = null; g.gainPossession(m);
          }
          const r = b.owner && b.owner.team === team ? b.owner : s;
          r.buffs.push({ speed: prm.boost, t: prm.time });
          r.glow('#3ff6ff', prm.time);
          E.burst(r.x, r.y, 10, '#bdf4ff', 14, 110, 0.5);
          E.ring(r.x, r.y - 6, '#3ff6ff');
          E.speedLines(0.4, r.x, r.y, '#bdf4ff');
          E.comic(r.x, r.y - 30, 'LIGHTNING RELAY!', '#3ff6ff', 1.1, 0.8);
          g.hitStop(0.06);
          E.shake(4, 0.25);
          g.sfx('pass');
        });
      },
    },

    /* 🏃 TỐC ĐỘ + 🎯 SÁT THỦ — Flash Strike: người cầm bóng hoá tia sét lao lên (vạch trước), tới nơi sút sấm xuyên người */
    flash_strike: {
      aiUse(sys, team, prm) {
        const g = sys.g, me = prm.owner, s = teamBall(sys, team);
        return s && s.state === 'normal' && me.state === 'normal' && nearGoal(g, team, s, 340) ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, b = g.ball, f = g.field;
        const s = teamBall(sys, team);
        if (!s) return;
        const d = aimDir(g, team, s, null), x0 = s.x, y0 = s.y;
        const x1 = U.clamp(x0 + d.x * prm.distance, f.x + 10, f.x + f.w - 10), y1 = U.clamp(y0 + d.y * prm.distance, f.y + 10, f.y + f.h - 10);
        const len = Math.hypot(x1 - x0, y1 - y0);
        E.beam(x0, y0 - 4, Math.atan2(y1 - y0, x1 - x0), len, 2, '#bdf4ff', prm.telegraph + 0.1);
        E.bolt(s.x, s.y - 22, s.x, s.y - 2, '#ff7a3d', prm.telegraph);
        hold(s, prm.telegraph + 0.1);
        g.sfx('zap');
        g.later(prm.telegraph, () => {
          if (g.state !== 'play' || b.owner !== s || s.state === 'stun') return;
          E.tint('#0a1830', 0.4, 0.35);
          for (let i = 0; i < 3; i++) E.bolt(x0, y0 - 8 + (i - 1) * 2, x1, y1 - 6, i ? '#7fe7ff' : '#ffffff', 0.45);
          for (let k = 0; k < len; k += 14) E.decal('scorch', x0 + d.x * k, y0 + d.y * k, 0.7, 2.5);
          zapLine(sys, team, s, x0, y0, x1, y1, prm);
          E.afterimage(s, 0.3);
          s.x = x1; s.y = y1;
          b.follow(0);
          shootGoal(g, team, s);
          H.applyThunder(b, { stun: prm.stun, gkPenalty: prm.gk, pierce: prm.pierce });
          g.hitStop(0.08);
          E.impactFrame();
          E.speedLines(0.4, s.x, s.y, '#bdf4ff');
          E.comic(s.x, s.y - 32, 'FLASH STRIKE!', '#3ff6ff', 1.2, 0.7);
          E.shake(6, 0.35);
          g.sfx('kick', 1);
        });
      },
    },

    /* 🏃 TỐC ĐỘ + 🥊 ĐẤU SĨ — Thunder Rush: lao zigzag (nhìn thấy được, né Z) qua tối đa 3 đối thủ, mỗi người 1 cú đấm sét */
    thunder_rush: {
      aiUse(sys, team, prm) {
        const g = sys.g, me = prm.owner;
        if (me.state !== 'normal' || me.airZ > 0) return null;
        const near = targetsNear(g, team, me, prm.range);
        return near.length >= 2 || (near[0] && near[0].hasBall && U.dist(near[0], me) < prm.range * 0.7) ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects;
        const list = targetsNear(g, team, pl, prm.range).slice(0, prm.hits);
        if (!list.length) return;
        E.callout('THUNDER RUSH!', '#3ff6ff', 0.9);
        pl.glow('#3ff6ff', 1.2);
        const go = (i) => {
          if (g.state !== 'play' || pl.state === 'stun') return;
          if (i >= list.length) { pl.state = 'recover'; pl.stateT = 0.3; return; }
          const o = list[i], last = i === list.length - 1;
          E.bolt(pl.x, pl.y - 8, o.x, o.y - 8, '#bdf4ff', 0.2);   // báo trước: tia sét nối tới người sắp bị đấm
          g.sfx('zap');
          H.rush(sys, pl, o, prm.rush, U.dist(pl, o) / prm.rush + 0.15, () => {
            if (o.hasBall && !sys.unstealable(o)) { g.looseBall(o, pl.x - o.x, pl.y - o.y, 40); sys.steal(pl); }
            H.blast(o, pl, prm.knock, 40, prm.stun, pl);
            E.stretch(pl.id, o.x, o.y - 4, 0.12);
            E.burst(o.x, o.y, 10, '#bdf4ff', 12, 100, 0.4);
            E.bolt(o.x, o.y - 22, o.x, o.y - 2, '#bdf4ff', 0.3);
            E.comic(o.x, o.y - 30, last ? 'SMASH!' : 'POW!', '#3ff6ff', last ? 1.2 : 0.9, 0.5);
            g.hitStop(last ? 0.1 : 0.05);
            if (last) E.impactFrame();
            E.shake(last ? 6 : 3, 0.2);
            g.sfx('hit');
            g.later(0.08, () => go(i + 1));
          }, () => {
            E.comic(pl.x, pl.y - 28, 'MISS', '#9aa3b5', 0.9, 0.5);
            g.later(0.08, () => go(i + 1));
          });
        };
        go(0);
      },
    },

    /* 🏃 TỐC ĐỘ + 🛡 THÉP — Steel Express: hoá thép (miễn choáng chỉ trong lúc lao), húc thẳng qua mọi người trên đường (vạch trước) */
    steel_express: {
      aiUse(sys, team, prm) {
        const g = sys.g, b = g.ball, me = prm.owner;
        if (me.state !== 'normal' || me.airZ > 0) return null;
        if (b.owner && b.owner.team !== team) return U.dist(me, b.owner) < prm.distance * 0.8 ? me : null;
        if (b.owner !== me) return null;
        const o = H.nearestOpp(g, team, me, H.targetable(g));
        return o && U.dist(o, me) < 80 ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, b = g.ball, f = g.field;
        const d = aimDir(g, team, pl, b.owner && b.owner.team !== team ? b.owner : null);
        const x0 = pl.x, y0 = pl.y;
        const x1 = U.clamp(x0 + d.x * prm.distance, f.x + 10, f.x + f.w - 10), y1 = U.clamp(y0 + d.y * prm.distance, f.y + 10, f.y + f.h - 10);
        const len = Math.hypot(x1 - x0, y1 - y0), travel = Math.max(0.05, len / prm.speed);
        E.beam(x0, y0 - 3, Math.atan2(y1 - y0, x1 - x0), len, 3, '#c7ccd6', prm.telegraph + 0.1);
        E.shield(pl.x, pl.y - 8, 14, '#c7ccd6', prm.telegraph + 0.1);
        pl.armorT = Math.max(pl.armorT || 0, g.time + prm.telegraph + travel + 0.2);
        pl.glow('#c7ccd6', prm.telegraph + travel + 0.2);
        hold(pl, prm.telegraph + 0.05);
        E.comic(pl.x, pl.y - 30, 'STEEL EXPRESS!', '#c7ccd6', 1.1, 0.7);
        g.sfx('block');
        g.later(prm.telegraph, () => {
          if (g.state !== 'play' || pl.state === 'stun') return;
          const hit = new Set();
          let T = 0, k = 0;
          pl.state = 'recover'; pl.stateT = travel + 0.3; pl.charging = false;
          E.speedLines(0.4, pl.x, pl.y, '#e8ecf5');
          g.sfx('whoosh');
          sys.task((dt) => {
            if (g.state !== 'play' || pl.state === 'stun') return true;
            T += dt;
            const kk = Math.min(1, T / travel);
            pl.x = U.lerp(x0, x1, kk); pl.y = U.lerp(y0, y1, kk);
            pl.vx = d.x * prm.speed; pl.vy = d.y * prm.speed; pl.facing = Math.atan2(d.y, d.x);
            if (b.owner === pl) b.follow(0);
            if ((k += dt) >= 0.04) { k = 0; E.afterimage(pl, 0.25); E.decal('skid', pl.x, pl.y, 0.6, 2, pl.facing); }
            for (const o of g.teams[1 - team].players) {
              if (hit.has(o) || U.dist(o, pl) > pl.radius + o.radius + prm.width * 0.4 || g.isProtected(o) || o.state === 'meteor') continue;
              hit.add(o);
              if (Act().dodged(g, o)) continue;
              const sd = (o.x - pl.x) * -d.y + (o.y - pl.y) * d.x >= 0 ? 1 : -1;
              const had = o.hasBall && !sys.unstealable(o);
              if (H.blast(o, pl, prm.knock, prm.launch, prm.stun, pl, U.norm(d.x - d.y * sd * 0.9, d.y + d.x * sd * 0.9))) {
                E.comic(o.x, o.y - 30, 'BONK!', '#c7ccd6', 1, 0.5);
                E.burst(o.x, o.y, 8, '#ffffff', 12, 110, 0.4);
                E.shake(4, 0.2);
                g.sfx('hit');
                if (had) sys.steal(pl);
              }
            }
            return kk >= 1;
          }, () => { pl.vx *= 0.3; pl.vy *= 0.3; unlock(pl); });
        });
      },
    },

    /* 🎼 TIKI-TAKA + 🦵 VÕ SĨ ĐÁ — Sky Volley: bổng bóng lên trời về phía đồng đội đứng cao nhất, người đó bật lên đá móc vào khung,
       sóng chấn dưới chân hất tung đối thủ đứng gần (vòng báo trước suốt lúc bóng bay) */
    sky_volley: {
      aiUse(sys, team, prm) {
        const g = sys.g, me = prm.owner, s = teamBall(sys, team);
        if (!s || s.state !== 'normal' || me.state !== 'normal') return null;
        return nearGoal(g, team, forwardMate(g, team, s) || s, 300) ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, b = g.ball;
        const s = teamBall(sys, team);
        if (!s) return;
        const m = forwardMate(g, team, s) || s;
        hold(s, 0.15);
        hold(m, prm.lob + 0.35);
        b.kick(s, (m.x - b.x) / prm.lob, (m.y - b.y) / prm.lob, prm.jump);
        b.fx.string = true;
        for (const q of g.players) b.noPickup.set(q.id, prm.lob + 0.1);   // không ai chạm được bóng đang bay
        E.wave(m.x, m.y, prm.radius, '#b46bff', prm.lob, 1);
        E.decal('crater', m.x, m.y, 0.5, prm.lob + 0.2);
        E.comic(s.x, s.y - 28, 'SKY VOLLEY!', '#ffd23f', 1.1, 0.7);
        g.sfx('pass');
        g.later(Math.max(0, prm.lob - 0.3), () => {   // người đá bật lên đón bóng
          if (g.state !== 'play' || m.state === 'stun') return;
          m.airVz = prm.jump * 0.8; m.airZ = Math.max(m.airZ, 0.5);
          E.burst(m.x, m.y, 0, '#8a7f70', 10, 80);
          g.sfx('whoosh');
        });
        g.later(prm.lob, () => {
          if (g.state !== 'play' || b.owner || m.state === 'stun') return;
          const goal = g.attackGoal(team), f = g.field;
          const ty = goal.y + U.rand(-1, 1) * (f.goalWidth / 2 - 8);
          const dx = goal.x - b.x, dy = ty - b.y, dd = Math.hypot(dx, dy) || 1;
          const spd = prm.speed * sys.pmod(m, 'shotPower');
          m.facing = Math.atan2(dy, dx);
          b.kick(m, (dx / dd) * spd, (dy / dd) * spd, -40);
          b.kind = 'shot';
          b.fx.spiral = true;
          b.gkMod += prm.gk;
          E.wave(m.x, m.y, prm.radius, '#b46bff', 0.45, 3);
          E.decal('crack', m.x, m.y, 1.2, 4);
          E.comic(b.x, b.y - b.z - 10, 'SMASH!', '#b46bff', 1.3, 0.6);
          g.hitStop(0.08);
          E.impactFrame();
          E.shake(6, 0.35);
          g.sfx('kick', 1);
          for (const o of g.teams[1 - team].players) {
            if (U.dist(o, m) > prm.radius + o.radius || g.isProtected(o) || o.state === 'meteor' || Act().dodged(g, o)) continue;
            H.blast(o, m, prm.knock, prm.launch, prm.stun, m);
          }
        });
      },
    },

    /* 🎼 TIKI-TAKA + 🌀 ẢO ẢNH — Ghost Pass: phân thân chuyền bóng giả toả mọi hướng (AI đối thủ đuổi nhầm),
       đường chuyền thật tới đồng đội đứng cao nhất bay xuyên qua người cắt */
    ghost_pass: {
      aiUse(sys, team, prm) {
        const g = sys.g, me = prm.owner, s = teamBall(sys, team);
        if (!s || s.state !== 'normal' || me.state !== 'normal' || !forwardMate(g, team, s)) return null;
        const o = H.nearestOpp(g, team, s);
        return o && U.dist(o, s) < 80 ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, b = g.ball;
        const s = teamBall(sys, team);
        if (!s) return;
        const m = forwardMate(g, team, s);
        const real = m ? Math.atan2(m.y - s.y, m.x - s.x) : s.facing;
        E.callout('GHOST PASS!', '#9d7bff', 0.9);
        E.burst(s.x, s.y, 6, '#d8d0e0', 18, 110, 0.6);
        const decoys = [];
        for (let i = 0; i < prm.decoys; i++) {
          const a = real + (i % 2 ? 1 : -1) * (0.7 + Math.floor(i / 2) * 0.75);
          decoys.push(E.decoy(null, b.x, b.y, Math.cos(a) * prm.speed, Math.sin(a) * prm.speed, prm.time));
          E.clone(s.id, s.x, s.y, Math.cos(a) * 70, Math.sin(a) * 70, 0.5);   // phân thân "chuyền" quả giả
        }
        for (const o of g.teams[1 - team].players) if (!o.isControlled && !g.inKeeperZone(o)) o.confused = { decoy: U.pick(decoys), t: prm.confuse };
        if (m) {
          Act().passTo(g, s, m, 'ground');
          b.vx *= prm.passSpeed; b.vy *= prm.passSpeed;
          b.fx.ghost = true;   // xuyên qua người cắt (Game.tryControl)
          m.glow('#9d7bff', 1);
        }
        E.comic(s.x, s.y - 30, 'FAKE!', '#9d7bff', 1, 0.6);
        g.sfx('whoosh');
        g.sfx('pass');
      },
    },

    /* 🎯 SÁT THỦ + 🥊 ĐẤU SĨ — Knockout Volley: gồng (vòng đỏ = tầm đấm), đấm văng mọi đối thủ quanh người rồi sút lửa */
    knockout_volley: {
      aiUse(sys, team, prm) {
        const g = sys.g, me = prm.owner, s = teamBall(sys, team);
        if (!s || s.state !== 'normal' || me.state !== 'normal' || !nearGoal(g, team, s, 320)) return null;
        const o = H.nearestOpp(g, team, s, H.targetable(g));
        return o && U.dist(o, s) < prm.radius * 1.5 ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, b = g.ball;
        const s = teamBall(sys, team);
        if (!s) return;
        hold(s, prm.windup + 0.1);
        s.glow('#ff3d5a', prm.windup + 0.2);
        E.wave(s.x, s.y, prm.radius, '#ff3d5a', prm.windup, 1);
        E.comic(s.x, s.y - 30, 'KNOCKOUT VOLLEY!', '#ff3d5a', 1.1, 0.7);
        g.sfx('whoosh');
        g.later(prm.windup, () => {
          if (g.state !== 'play' || b.owner !== s || s.state === 'stun') return;
          E.wave(s.x, s.y, prm.radius, '#ff7a3d', 0.4, 3);
          for (const o of g.teams[1 - team].players) {
            if (U.dist(o, s) > prm.radius + o.radius || g.isProtected(o) || o.state === 'meteor' || o.airZ > 4 || Act().dodged(g, o)) continue;
            E.stretch(s.id, o.x, o.y - 4, 0.2, 1.6);
            H.blast(o, s, prm.knock, 60, prm.stun, s);
            E.burst(o.x, o.y, 10, '#fff6a0', 10, 90, 0.4);
            E.comic(o.x, o.y - 28, 'POW!', '#ff3d5a', 1, 0.5);
          }
          shootGoal(g, team, s);
          H.applyFire(sys, team, b, SFC_CONFIG.cores.list.fire_shot.params);
          b.skin = 'fireball';
          b.gkMod += prm.gk;
          g.hitStop(0.08);
          E.impactFrame();
          E.shake(6, 0.35);
          g.sfx('hit');
          g.sfx('kick', 1);
        });
      },
    },

    /* 🎯 SÁT THỦ + 🦵 VÕ SĨ ĐÁ — Cannonball: bóng hoá quả bom, nổ (hố + hất tung) ở chỗ chạm đối thủ đầu tiên, kể cả tay thủ môn;
       vào lưới thì lưới nổ. Đồng đội đỡ được thì tháo ngòi */
    cannonball: {
      aiUse(sys, team, prm) {
        const g = sys.g, me = prm.owner, s = teamBall(sys, team);
        return s && s.state === 'normal' && me.state === 'normal' && nearGoal(g, team, s, 360) ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, b = g.ball, st = sys.st(team, 'cannonball');
        const s = teamBall(sys, team);
        if (!s) return;
        hold(s, prm.windup + 0.1);
        E.wave(s.x, s.y, 22, '#b46bff', prm.windup, 2);
        E.comic(s.x, s.y - 30, 'CANNONBALL!', '#b46bff', 1.1, 0.7);
        g.sfx('whoosh');
        g.later(prm.windup, () => {
          if (g.state !== 'play' || b.owner !== s || s.state === 'stun') return;
          shootGoal(g, team, s);
          b.vx *= prm.speed; b.vy *= prm.speed;
          b.skin = 'bomb';
          st.live = true;
          g.hitStop(0.06);
          E.shake(5, 0.3);
          g.sfx('kick', 1);
          const boom = (x, y) => {
            st.live = false;
            b.skin = null;
            if (b.owner && b.owner.team !== team) g.looseBall(b.owner, U.rand(-1, 1), U.rand(-1, 1), 70);   // thủ môn / người đỡ cũng bị nổ
            g.hitStop(0.1);
            E.impactFrame();
            E.zoom(x, y, 0.18, 0.35);
            E.shake(9, 0.45);
            E.wave(x, y, prm.radius, '#b46bff', 0.55, 4);
            E.wave(x, y, prm.radius * 0.6, '#ffffff', 0.4, 2);
            E.decal('crater', x, y, 1.5, 5);
            E.burst(x, y, 4, '#ff6a1f', 26, 180, 0.8);
            E.burst(x, y, 2, '#6a6470', 16, 80, 1.1);
            E.comic(x, y - 34, 'KABOOM!', '#ff6a1f', 1.5, 0.8);
            g.sfx('hit');
            const c = { x, y };
            for (const o of g.teams[1 - team].players) {
              if (U.dist(o, c) > prm.radius + o.radius || g.isProtected(o) || o.state === 'meteor' || Act().dodged(g, o)) continue;
              H.blast(o, c, prm.knock, prm.launch, prm.stun, s);
            }
            if (!b.owner) { b.vx *= 0.3; b.vy *= 0.3; }
          };
          let T = 0;
          sys.task((dt) => {
            if (g.state !== 'play' || !st.live || b.skin !== 'bomb') return true;
            T += dt;
            if (b.owner) {
              if (b.owner.team === team) { st.live = false; b.skin = null; return true; }   // đồng đội đỡ: tháo ngòi
              boom(b.owner.x, b.owner.y);
              return true;
            }
            const near = g.teams[1 - team].players.some((q) => q.airZ <= 4 && b.z < 16 && U.dist(q, b) < q.radius + b.r + 6);
            if (near || T >= prm.fuse || (T > 0.3 && b.speed < 90)) { boom(b.x, b.y); return true; }
            return false;
          });
        });
      },
      // vào lưới: lưới nổ tung
      onGoalScored(sys, team) {
        const st = sys.st(team, 'cannonball');
        if (!st.live) return;
        st.live = false;
        const g = sys.g, b = g.ball, E = g.effects;
        E.impactFrame();
        E.shake(8, 0.5);
        E.burst(b.x, b.y, 10, '#ff6a1f', 30, 180, 0.8);
        E.wave(b.x, b.y, 40, '#b46bff', 0.5, 3);
        E.comic(b.x, b.y - 30, 'KABOOM!', '#ff6a1f', 1.5, 0.8);
        E.netFire(b.x > g.field.cx ? 1 : -1);
      },
      onKickoff(sys, team) { sys.st(team, 'cannonball').live = false; },
    },

    /* 🎯 SÁT THỦ + 🛡 THÉP — Wrecking Ball: người sút hoá thép, bắn quả bóng sắt nặng (chậm hơn) xuyên qua 4 người, nứt sân dọc đường */
    wrecking_ball: {
      aiUse(sys, team, prm) {
        const g = sys.g, me = prm.owner, s = teamBall(sys, team);
        return s && s.state === 'normal' && me.state === 'normal' && nearGoal(g, team, s, 340) ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, b = g.ball;
        const s = teamBall(sys, team);
        if (!s) return;
        s.armorT = Math.max(s.armorT || 0, g.time + prm.armor);
        s.glow('#c7ccd6', prm.armor);
        hold(s, prm.windup + 0.1);
        E.shield(s.x, s.y - 8, 14, '#c7ccd6', prm.windup + 0.2);
        E.wave(s.x, s.y, 24, '#c7ccd6', prm.windup, 2);
        E.comic(s.x, s.y - 30, 'WRECKING BALL!', '#c7ccd6', 1.1, 0.7);
        g.sfx('block');
        g.later(prm.windup, () => {
          if (g.state !== 'play' || b.owner !== s || s.state === 'stun') return;
          shootGoal(g, team, s);
          b.vx *= prm.speed; b.vy *= prm.speed;
          b.skin = 'bowling';
          b.fx.scissor = { stun: prm.stun }; b.pierce = prm.pierce;   // xuyên người (dùng chung với Song Phi)
          b.gkMod += prm.gk;
          g.hitStop(0.08);
          E.impactFrame();
          E.shake(7, 0.4);
          g.sfx('kick', 1);
          g.sfx('wall');
          let k = 0;
          sys.task((dt) => {
            if (g.state !== 'play' || b.owner || b.skin !== 'bowling' || b.speed < 60) return true;
            if ((k += dt) >= 0.07) { k = 0; E.decal('crack', b.x, b.y, 0.5, 2); E.burst(b.x, b.y, 0, '#8a7f70', 3, 40, 0.3); }
            return false;
          });
        });
      },
    },

    /* 🥊 ĐẤU SĨ + 🌀 ẢO ẢNH — Shadow Ambush: phân thân hiện sau lưng tối đa 3 đối thủ (báo trước), cùng đấm văng họ về phía bạn */
    shadow_ambush: {
      aiUse(sys, team, prm) {
        const g = sys.g, me = prm.owner;
        if (me.state !== 'normal') return null;
        const near = targetsNear(g, team, me, prm.range);
        return near.length >= 2 || (near[0] && near[0].hasBall) ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, f = g.field;
        const list = targetsNear(g, team, pl, prm.range).slice(0, prm.targets);
        if (!list.length) return;
        E.callout('SHADOW AMBUSH!', '#9d7bff', 0.9);
        E.burst(pl.x, pl.y, 6, '#d8d0e0', 16, 100, 0.5);
        g.sfx('whoosh');
        const spots = list.map((o) => {
          const d = U.norm(o.x - pl.x, o.y - pl.y + 0.01);
          const x = U.clamp(o.x + d.x * 14, f.x + 8, f.x + f.w - 8), y = U.clamp(o.y + d.y * 14, f.y + 8, f.y + f.h - 8);
          E.clone(pl.id, x, y, 0, 0, prm.delay + 0.35);
          E.wave(o.x, o.y, 14, '#9d7bff', prm.delay, 1);
          return { o, x, y };
        });
        g.later(prm.delay, () => {
          if (g.state !== 'play') return;
          let n = 0;
          for (const { o, x, y } of spots) {
            E.popClone(pl.id, x, y);
            if (o.state === 'meteor' || g.isProtected(o) || Act().dodged(g, o)) continue;
            if (o.hasBall && !sys.unstealable(o)) { g.looseBall(o, pl.x - o.x, pl.y - o.y, 60); sys.steal(pl); }
            H.blast(o, { x, y }, prm.knock, 40, prm.stun, pl);
            E.burst(o.x, o.y, 10, '#fff6a0', 10, 90, 0.4);
            E.comic(o.x, o.y - 30, 'POW!', '#9d7bff', 1.1, 0.5);
            n++;
          }
          if (n) { g.hitStop(0.08); E.impactFrame(); E.shake(6, 0.3); g.sfx('hit'); }
        });
      },
    },

    /* 🦵 VÕ SĨ ĐÁ + 🌀 ẢO ẢNH — Crossfire Kicks: 3 phân thân vây quanh 1 đối thủ, vạch đường đá (báo trước) rồi cùng đá bay xuyên qua */
    crossfire_kicks: {
      target(sys, team, pl, prm) {
        const g = sys.g, b = g.ball;
        if (b.owner && b.owner.team !== team && H.targetable(g)(b.owner) && U.dist(b.owner, pl) <= prm.range) return b.owner;
        return targetsNear(g, team, pl, prm.range)[0] || null;
      },
      aiUse(sys, team, prm) {
        const me = prm.owner;
        if (me.state !== 'normal') return null;
        const o = this.target(sys, team, me, prm);
        return o && (o.hasBall || Math.random() < 0.3) && U.dist(o, me) < prm.range * 0.8 ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, f = g.field;
        const o = this.target(sys, team, pl, prm);
        if (!o) return;
        const base = Math.atan2(pl.y - o.y, pl.x - o.x), tx = o.x, ty = o.y;
        const lanes = [];
        for (let i = 0; i < prm.clones; i++) {
          const a = base + (i * TAU) / prm.clones;
          const x = U.clamp(tx + Math.cos(a) * prm.dist, f.x + 8, f.x + f.w - 8), y = U.clamp(ty + Math.sin(a) * prm.dist, f.y + 8, f.y + f.h - 8);
          const d = U.norm(tx - x, ty - y + 0.01), len = Math.hypot(tx - x, ty - y) * 2;
          E.clone(pl.id, x, y, 0, 0, prm.aim + 0.05);
          E.beam(x, y - 4, Math.atan2(d.y, d.x), len, 2, '#b46bff', prm.aim + 0.1);
          lanes.push({ x, y, d, len });
        }
        E.callout('CROSSFIRE!', '#b46bff', 0.9);
        g.sfx('whoosh');
        g.later(prm.aim, () => {
          if (g.state !== 'play') return;
          const seen = new Set();
          let n = 0;
          for (const L of lanes) {
            E.clone(pl.id, L.x, L.y, (L.d.x * L.len) / 0.22, (L.d.y * L.len) / 0.22, 0.22);
            for (const q of g.teams[1 - team].players) {
              if (seen.has(q) || U.segDist(q.x, q.y, L.x, L.y, L.x + L.d.x * L.len, L.y + L.d.y * L.len) > prm.width) continue;
              if (q.state === 'meteor' || g.isProtected(q)) continue;
              seen.add(q);
              if (Act().dodged(g, q)) continue;
              if (q.hasBall && !sys.unstealable(q)) { g.looseBall(q, pl.x - q.x, pl.y - q.y, 60); sys.steal(pl); }
              H.blast(q, L, prm.knock, prm.launch, prm.stun, pl, L.d);
              E.burst(q.x, q.y, 10, '#b46bff', 12, 110, 0.5);
              n++;
            }
          }
          E.comic(tx, ty - 34, n ? 'BAM!' : 'MISS', n ? '#b46bff' : '#9aa3b5', n ? 1.3 : 0.9, 0.6);
          if (n) { g.hitStop(0.1); E.impactFrame(); E.zoom(tx, ty, 0.15, 0.3); E.shake(7, 0.35); g.sfx('hit'); }
        });
      },
    },

    /* 🦵 VÕ SĨ ĐÁ + 🛡 THÉP — Iron Quake: hoá thép, 3 cú dậm tiến dần về phía trước (vết lõm báo trước), mỗi cú hất tung người đứng gần */
    iron_quake: {
      aiUse(sys, team, prm) {
        const g = sys.g, me = prm.owner;
        if (me.state !== 'normal' || me.airZ > 0) return null;
        const o = H.nearestOpp(g, team, me, H.targetable(g));
        return o && U.dist(o, me) < 22 + prm.step * (prm.stomps - 1) + prm.radius * 0.7 && (o.hasBall || Math.random() < 0.4) ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, f = g.field, b = g.ball;
        const tgt = b.owner && b.owner.team !== team ? b.owner : H.nearestOpp(g, team, pl, H.targetable(g));
        const d = aimDir(g, team, pl, tgt);
        const pts = [];
        for (let i = 0; i < prm.stomps; i++) {
          pts.push({ x: U.clamp(pl.x + d.x * (22 + prm.step * i), f.x + 8, f.x + f.w - 8), y: U.clamp(pl.y + d.y * (22 + prm.step * i), f.y + 8, f.y + f.h - 8) });
        }
        const total = prm.telegraph + prm.gap * (prm.stomps - 1);
        pl.armorT = Math.max(pl.armorT || 0, g.time + Math.min(prm.armor, total + 0.3));
        pl.glow('#c7ccd6', total + 0.3);
        pl.facing = Math.atan2(d.y, d.x);
        hold(pl, total + 0.3);
        E.comic(pl.x, pl.y - 30, 'IRON QUAKE!', '#b46bff', 1.1, 0.7);
        g.sfx('block');
        pts.forEach((c, i) => {
          const at = prm.telegraph + prm.gap * i, last = i === pts.length - 1;
          E.decal('crater', c.x, c.y, 0.7, at + 0.1);   // báo trước: vết lõm + vòng nơi sắp dậm
          E.wave(c.x, c.y, prm.radius, '#8a93a3', at, 1);
          g.later(Math.max(0, at - 0.2), () => { if (g.state === 'play' && pl.state !== 'stun') { pl.airVz = 110; pl.airZ = Math.max(pl.airZ, 0.5); } });
          g.later(at, () => {
            if (g.state !== 'play' || pl.state === 'stun') return;
            E.wave(c.x, c.y, prm.radius, '#b46bff', 0.45, 3);
            E.decal('crack', c.x, c.y, 1.3, 4);
            E.burst(c.x, c.y, 2, '#8a7f70', 16, 120, 0.7);
            E.comic(c.x, c.y - 28, last ? 'KRAKOOM!!' : 'SLAM!', '#b46bff', last ? 1.4 : 1, 0.5);
            g.hitStop(last ? 0.1 : 0.05);
            if (last) E.impactFrame();
            E.shake(5 + i * 2, 0.3);
            g.sfx('hit');
            g.sfx('wall');
            for (const o of g.teams[1 - team].players) {
              if (U.dist(o, c) > prm.radius + o.radius || g.isProtected(o) || o.state === 'meteor' || o.airZ > 4 || Act().dodged(g, o)) continue;
              const had = o.hasBall && !sys.unstealable(o);
              if (H.blast(o, c, prm.knock, prm.launch, prm.stun, pl) && had) sys.steal(pl);
            }
          });
        });
      },
    },

    /* 🌀 ẢO ẢNH + 🛡 THÉP — Mirror Wall: hàng phân thân thép chắn giữa bóng và khung thành nhà: bóng đối thủ đá trúng bật lại,
       người đối thủ không đi xuyên qua được (không gây choáng) */
    mirror_wall: {
      aiUse(sys, team, prm) {
        const g = sys.g, b = g.ball, me = prm.owner;
        if (me.state !== 'normal' || !b.owner || b.owner.team === team) return null;
        return U.dist(b, g.attackGoal(1 - team)) < 300 ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, b = g.ball, f = g.field;
        const src = b.owner || b, own = g.attackGoal(1 - team), n = U.norm(own.x - src.x, own.y - src.y + 0.01);
        const cx = U.clamp(src.x + n.x * prm.ahead, f.x + 14, f.x + f.w - 14), cy = U.clamp(src.y + n.y * prm.ahead, f.y + 14, f.y + f.h - 14);
        const wall = [];
        for (let i = 0; i < prm.clones; i++) {
          const k = (i - (prm.clones - 1) / 2) * prm.gap;
          const x = U.clamp(cx - n.y * k, f.x + 8, f.x + f.w - 8), y = U.clamp(cy + n.x * k, f.y + 8, f.y + f.h - 8);
          E.clone(pl.id, x, y, 0, 0, prm.time);
          E.shield(x, y - 8, 10, '#c7ccd6', 0.6);
          wall.push({ x, y, cd: 0 });
        }
        E.callout('MIRROR WALL!', '#c7ccd6', 1.0);
        E.wave(cx, cy, 30, '#9d7bff', 0.5, 2);
        g.sfx('block');
        let T = prm.time, glint = 0;
        sys.task((dt) => {
          if (g.state !== 'play' || (T -= dt) <= 0) return true;
          if ((glint -= dt) <= 0) { glint = 0.5; const c = U.pick(wall); E.shield(c.x, c.y - 8, 9, '#c7ccd6', 0.3); }
          for (const c of wall) {
            c.cd -= dt;
            if (c.cd <= 0 && !b.owner && b.lastKickTeam === 1 - team && b.z < 16 && Math.hypot(b.x - c.x, b.y - c.y) < 10) {
              c.cd = 0.3;
              b.vx = -b.vx * 0.45; b.vy = -b.vy * 0.45;
              b.kind = null; b.passTarget = null; b.passPoint = null; b.lastKickTeam = -1;
              E.shield(c.x, c.y - 8, 11, '#c7ccd6', 0.35);
              E.burst(c.x, c.y - 6, 6, '#ffffff', 10, 90, 0.35);
              E.comic(c.x, c.y - 26, 'CLANG!', '#c7ccd6', 0.9, 0.5);
              g.sfx('block');
            }
            for (const o of g.teams[1 - team].players) {
              if (o.airZ > 4) continue;
              const dx = o.x - c.x, dy = o.y - c.y, dd = Math.hypot(dx, dy);
              if (dd > 11 || dd < 0.01) continue;
              o.x = c.x + (dx / dd) * 11; o.y = c.y + (dy / dd) * 11;   // không đi xuyên qua phân thân thép
            }
          }
          return false;
        });
      },
    },

    /* ================= 🎲 HỖN LOẠN + 7 hệ (2026-10-14) ================= */
    /* 🎲 + 🏃 — Wormhole Dash: cửa ra xoáy tím hiện trước (báo trước), lặn vào hố sâu rồi trồi ra xa phía trước, nổ hất người quanh cửa ra */
    wormhole_dash: {
      aiUse(sys, team, prm) {
        const g = sys.g, b = g.ball, me = prm.owner;
        if (me.state !== 'normal' || me.airZ > 0) return null;
        if (b.owner === me) { const o = H.nearestOpp(g, team, me, H.targetable(g)); return o && U.dist(o, me) < 70 ? me : null; }
        return b.owner && b.owner.team !== team && U.dist(me, b.owner) < prm.distance && U.dist(me, b.owner) > 60 ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, b = g.ball, f = g.field;
        const tgt = b.owner && b.owner.team !== team ? b.owner : null;
        const d = aimDir(g, team, pl, tgt);
        const dist = tgt ? Math.min(prm.distance, U.dist(pl, tgt)) : prm.distance;
        const x1 = U.clamp(pl.x + d.x * dist, f.x + 10, f.x + f.w - 10), y1 = U.clamp(pl.y + d.y * dist, f.y + 10, f.y + f.h - 10);
        E.vortex(pl.x, pl.y, 12, prm.telegraph + 0.2);
        E.vortex(x1, y1, prm.radius * 0.6, prm.telegraph + 0.3);   // báo trước: cửa ra
        E.wave(x1, y1, prm.radius, '#c63dff', prm.telegraph, 1);
        E.comic(pl.x, pl.y - 30, 'WORMHOLE DASH!', '#c63dff', 1.1, 0.7);
        hold(pl, prm.telegraph + 0.15);
        pl.ghostT = prm.telegraph;   // đang chui trong hố: vẽ mờ (vẫn đánh trúng được)
        g.sfx('zap');
        g.later(prm.telegraph, () => {
          if (g.state !== 'play' || pl.state === 'stun') return;
          E.afterimage(pl, 0.3);
          pl.x = x1; pl.y = y1; pl.ghostT = 0;
          if (b.owner === pl) b.follow(0);
          unlock(pl);
          g.hitStop(0.06);
          E.impactFrame();
          E.wave(x1, y1, prm.radius, '#c63dff', 0.45, 3);
          E.burst(x1, y1, 4, '#c63dff', 20, 150, 0.6);
          E.burst(x1, y1, 4, '#3ff6ff', 10, 120, 0.5);
          E.shake(5, 0.3);
          g.sfx('hit');
          for (const o of g.teams[1 - team].players) {
            if (U.dist(o, pl) > prm.radius + o.radius || g.isProtected(o) || o.state === 'meteor' || Act().dodged(g, o)) continue;
            const had = o.hasBall && !sys.unstealable(o);
            if (had) { g.looseBall(o, pl.x - o.x, pl.y - o.y, 50); sys.steal(pl); }
            H.blast(o, pl, prm.knock, prm.launch, prm.stun, pl);
          }
        });
      },
    },

    /* 🎲 + 🎼 — Wild Card Pass: đường chuyền không cắt được (bóng hoá đồ vật ngẫu nhiên) tới đồng đội đứng cao nhất,
       người nhận bốc 1 buff ngẫu nhiên (tốc độ / lực sút / chuyền) */
    wild_pass: {
      aiUse(sys, team, prm) {
        const g = sys.g, me = prm.owner, s = teamBall(sys, team);
        if (!s || s.state !== 'normal' || me.state !== 'normal') return null;
        const m = forwardMate(g, team, s);
        return m && (m.x - s.x) * g.teams[team].dir > 30 ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, b = g.ball;
        const s = teamBall(sys, team);
        if (!s) return;
        const m = forwardMate(g, team, s);
        if (!m) return;
        Act().passTo(g, s, m, 'ground');
        b.vx *= prm.passSpeed; b.vy *= prm.passSpeed;
        b.fx.ghost = true;
        b.skin = U.pick(['melon', 'bowling', 'chicken', 'wheel', 'cube']);
        E.comic(s.x, s.y - 30, 'WILD CARD!', '#c63dff', 1.1, 0.7);
        E.burst(s.x, s.y, 4, '#c63dff', 12, 90, 0.4);
        g.sfx('pass');
        const cards = [
          { key: 'speed', v: prm.speed, word: SFC.N_('SPEED UP!'), color: '#3ff6ff' },
          { key: 'shotPower', v: prm.shot, word: SFC.N_('POWER UP!'), color: '#ff7a3d' },
          { key: 'passSpeed', v: prm.pass, word: SFC.N_('PASS UP!'), color: '#ffd23f' },
        ];
        const c = U.pick(cards);
        let T = 0;
        sys.task((dt) => {
          T += dt;
          if (g.state !== 'play' || T > 1.6 || (b.owner && b.owner !== m)) return true;
          if (b.owner !== m) return false;
          (sys.buffs[m.id] || (sys.buffs[m.id] = [])).push({ [c.key]: c.v, t: prm.time });
          m.glow(c.color, prm.time);
          E.comic(m.x, m.y - 30, c.word, c.color, 1, 0.8);
          E.burst(m.x, m.y - 10, 8, c.color, 14, 100, 0.5);
          E.ring(m.x, m.y - 6, c.color);
          g.sfx('upgrade');
          return true;
        });
      },
    },

    /* 🎲 + 🎯 — Jackpot Shot: sút tối đa, bóng bốc picks năng lực khác nhau cùng lúc (chữ hiện từng năng lực) */
    jackpot_shot: {
      aiUse(sys, team, prm) {
        const g = sys.g, me = prm.owner, s = teamBall(sys, team);
        return s && s.state === 'normal' && me.state === 'normal' && nearGoal(g, team, s, 320) ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, b = g.ball, L = SFC_CONFIG.cores.list;
        const s = teamBall(sys, team);
        if (!s) return;
        shootGoal(g, team, s);
        const all = ['fire', 'thunder', 'curve', 'rocket', 'split', 'blind'], picks = [];
        while (picks.length < Math.min(prm.picks, all.length)) { const k = U.pick(all); if (!picks.includes(k)) picks.push(k); }
        const words = { fire: 'FIRE!', thunder: 'ZAP!', curve: 'CURVE!', rocket: 'ROCKET!', split: 'x2!', blind: 'GHOST!' };
        for (const k of picks) {
          if (k === 'fire') { H.applyFire(sys, team, b, L.fire_shot.params); b.skin = 'fireball'; }
          if (k === 'thunder') H.applyThunder(b, L.thunder_kick.params);
          if (k === 'curve') b.curve = U.randSign() * prm.curve;
          if (k === 'rocket') { b.vx *= prm.rocket; b.vy *= prm.rocket; }
          if (k === 'split') for (const sg of [-1, 1]) { const a = Math.atan2(b.vy, b.vx) + sg * 0.35; E.decoy(null, b.x, b.y, Math.cos(a) * b.speed, Math.sin(a) * b.speed, 1.2); }
          if (k === 'blind') b.gkMod += prm.gk;
        }
        picks.forEach((k, i) => E.comic(s.x + (i ? 18 : -18), s.y - 30 - i * 8, words[k], '#c63dff', 1, 0.8));
        E.comic(s.x, s.y - 50, 'JACKPOT!', '#ffe14f', 1.3, 0.8);
        E.burst(s.x, s.y, 6, '#ffe14f', 16, 120, 0.5);
        g.hitStop(0.08);
        E.impactFrame();
        E.shake(6, 0.35);
        g.sfx('kick', 1);
        g.sfx('upgrade');
      },
    },

    /* 🎲 + 🥊 — Wild Haymaker: lao tới (nhìn thấy được, né Z) rồi 1 cú đấm kết quả ngẫu nhiên: bay lên trời · văng vào tường · choáng xoay */
    wild_haymaker: {
      aiUse(sys, team, prm) {
        const g = sys.g, me = prm.owner;
        if (me.state !== 'normal' || me.airZ > 0) return null;
        const o = H.nearestOpp(g, team, me, (q) => H.targetable(g)(q) && q.airZ <= 0);
        return o && U.dist(o, me) < prm.range * 0.6 && (o.hasBall || Math.random() < 0.3) ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, o = H.nearestOpp(g, team, pl, (q) => H.targetable(g)(q) && U.dist(q, pl) <= prm.range);
        if (!o) return;
        g.effects.comic(pl.x, pl.y - 30, 'WILD HAYMAKER!', '#c63dff', 1.1, 0.7);
        H.rush(sys, pl, o, prm.rush, U.dist(pl, o) / prm.rush + 0.15, () => {
          const E = g.effects, f = g.field, kind = U.pick(['sky', 'wall', 'dizzy']);
          if (o.hasBall && !sys.unstealable(o)) { g.looseBall(o, pl.x - o.x, pl.y - o.y, 40); sys.steal(pl); }
          E.stretch(pl.id, o.x, o.y - 4, 0.25, 2.2);
          g.hitStop(0.1);
          E.impactFrame();
          E.zoom(o.x, o.y, 0.15, 0.3);
          E.shake(7, 0.35);
          g.sfx('hit');
          if (kind === 'sky') {   // bay thẳng lên trời
            H.blast(o, { x: o.x, y: o.y + 1 }, 20, prm.launch, prm.stun, pl);
            E.comic(o.x, o.y - 30, 'TO THE MOON!', '#c63dff', 1.2, 0.8);
            E.burst(o.x, o.y, 0, '#c9b5ff', 14, 110, 0.6);
          } else if (kind === 'wall') {   // văng về tường trên / dưới gần nhất
            const toTop = o.y - f.y < f.y + f.h - o.y;
            H.blast(o, pl, prm.knock, 60, prm.stun, pl, U.norm((o.x - pl.x) * 0.3, toTop ? -1 : 1));
            E.comic(o.x, o.y - 30, 'HOME RUN!', '#c63dff', 1.2, 0.8);
            wallCrack(sys, o);
          } else {   // choáng lâu, sao bay quanh đầu, quay tròn tại chỗ
            o.hitImmune = 0;
            o.hit({ stun: prm.stun * 1.4, kbx: 0, kby: 0, source: pl, type: 'hard' });
            E.comic(o.x, o.y - 30, 'DIZZY!', '#c63dff', 1.2, 0.8);
            E.burst(o.x, o.y - 20, 0, '#ffe14f', 10, 60, 0.6);
          }
          pl.state = 'recover'; pl.stateT = 0.3;
        });
      },
    },

    /* 🎲 + 🦵 — Pinball Kick: lao tới (né Z) đá văng 1 đối thủ thành viên bi nảy tường, ai bị viên bi chạm vào cũng văng */
    pinball_kick: {
      aiUse(sys, team, prm) {
        const g = sys.g, me = prm.owner;
        if (me.state !== 'normal' || me.airZ > 0) return null;
        const near = targetsNear(g, team, me, prm.range);
        return near.length >= 2 || (near[0] && near[0].hasBall && U.dist(near[0], me) < prm.range * 0.7) ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, o = targetsNear(g, team, pl, prm.range)[0];
        if (!o) return;
        g.effects.comic(pl.x, pl.y - 30, 'PINBALL KICK!', '#c63dff', 1.1, 0.7);
        H.rush(sys, pl, o, prm.rush, U.dist(pl, o) / prm.rush + 0.15, () => {
          const E = g.effects, f = g.field;
          if (o.hasBall && !sys.unstealable(o)) { g.looseBall(o, pl.x - o.x, pl.y - o.y, 40); sys.steal(pl); }
          let d = U.norm(o.x - pl.x + U.rand(-0.3, 0.3), o.y - pl.y + U.rand(-0.6, 0.6));
          o.hitImmune = 0;
          o.hit({ stun: prm.stun + prm.time, kbx: 0, kby: 0, source: pl, type: 'hard' });
          g.hitStop(0.08);
          E.impactFrame();
          E.comic(o.x, o.y - 30, 'BOING!', '#c63dff', 1.2, 0.6);
          E.shake(6, 0.3);
          g.sfx('hit');
          pl.state = 'recover'; pl.stateT = 0.3;
          let T = 0, bounces = 0, k = 0;
          const hit = new Set([o]);
          // viên bi người: tự di chuyển theo d, nảy tường (tối đa bounces lần), chạm ai thì người đó văng
          sys.task((dt) => {
            if (g.state !== 'play') return true;
            T += dt;
            o.x += d.x * prm.speed * dt; o.y += d.y * prm.speed * dt;
            o.vx = 0; o.vy = 0; o.kbx = 0; o.kby = 0;
            const r = o.radius + 1;
            let wall = false;
            if (o.x < f.x + r || o.x > f.x + f.w - r) { d = { x: -d.x, y: d.y }; o.x = U.clamp(o.x, f.x + r, f.x + f.w - r); wall = true; }
            if (o.y < f.y + r || o.y > f.y + f.h - r) { d = { x: d.x, y: -d.y }; o.y = U.clamp(o.y, f.y + r, f.y + f.h - r); wall = true; }
            if (wall) {
              bounces++;
              E.decal(o.x <= f.x + r || o.x >= f.x + f.w - r ? 'crack' : 'wallcrack', o.x, o.y, 1.1, 4);
              E.burst(o.x, o.y, 6, '#c63dff', 10, 100, 0.4);
              E.comic(o.x, o.y - 26, 'BONK!', '#c63dff', 0.9, 0.4);
              E.shake(3, 0.15);
              g.sfx('wall');
            }
            if ((k += dt) >= 0.05) { k = 0; E.afterimage(o, 0.2); }
            for (const q of g.teams[1 - team].players) {
              if (hit.has(q) || U.dist(q, o) > q.radius + o.radius + 4 || g.isProtected(q) || q.state === 'meteor') continue;
              hit.add(q);
              if (Act().dodged(g, q)) continue;
              if (q.hasBall && !sys.unstealable(q)) g.looseBall(q, d.x, d.y, 60);
              H.blast(q, o, prm.knock, prm.launch, prm.stun, pl);
              E.comic(q.x, q.y - 28, 'STRIKE!', '#ffe14f', 1, 0.5);
              g.sfx('hit');
            }
            return T >= prm.time || bounces > prm.bounces;
          }, () => { if (o.state === 'stun') o.stateT = Math.min(o.stateT, prm.stun); });
        });
      },
    },

    /* 🎲 + 🌀 — Shell Game: phân thân hiện quanh bạn, rồi cả 4 tráo chỗ (bạn nhảy tới 1 chỗ ngẫu nhiên); có bóng thì phân thân dắt bóng giả */
    shell_game: {
      aiUse(sys, team, prm) {
        const g = sys.g, me = prm.owner;
        if (g.ball.owner !== me || me.state !== 'normal') return null;
        const o = H.nearestOpp(g, team, me);
        return o && U.dist(o, me) < 90 ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, b = g.ball, f = g.field;
        const spots = [{ x: pl.x, y: pl.y }];
        for (let i = 0; i < prm.clones; i++) {
          const a = pl.facing + ((i + 1) * Math.PI * 2) / (prm.clones + 1);
          spots.push({ x: U.clamp(pl.x + Math.cos(a) * prm.spread, f.x + 10, f.x + f.w - 10), y: U.clamp(pl.y + Math.sin(a) * prm.spread, f.y + 10, f.y + f.h - 10) });
        }
        E.callout('SHELL GAME!', '#c63dff', 0.9);
        for (const sp of spots.slice(1)) E.clone(pl.id, sp.x, sp.y, 0, 0, prm.delay + 0.1);
        E.burst(pl.x, pl.y, 6, '#d8d0e0', 16, 100, 0.5);
        hold(pl, prm.delay + 0.05);
        g.sfx('whoosh');
        g.later(prm.delay, () => {
          if (g.state !== 'play' || pl.state === 'stun') return;
          unlock(pl);
          // tráo: bạn sang 1 chỗ ngẫu nhiên, 3 chỗ còn lại là phân thân (dắt bóng giả nếu bạn đang cầm bóng)
          const real = U.pick(spots), had = b.owner === pl, decoys = [];
          for (const sp of spots) {
            E.burst(sp.x, sp.y, 6, '#c63dff', 10, 80, 0.4);
            if (sp === real) continue;
            const a = Math.atan2(sp.y - pl.y, sp.x - pl.x) + U.rand(-0.4, 0.4);
            E.clone(pl.id, sp.x, sp.y, Math.cos(a) * 110, Math.sin(a) * 110, prm.time);
            if (had) decoys.push(E.decoy(pl, sp.x, sp.y, Math.cos(a) * 110, Math.sin(a) * 110, prm.time));
          }
          pl.x = real.x; pl.y = real.y;
          if (had) b.follow(0);
          if (decoys.length) for (const o of g.teams[1 - team].players) if (!o.isControlled && !g.inKeeperZone(o)) o.confused = { decoy: U.pick(decoys), t: prm.confuse };
          E.comic(pl.x, pl.y - 30, 'POOF!', '#c63dff', 1, 0.5);
          g.sfx('whoosh');
        });
      },
    },

    /* 🎲 + 🛡 — Iron Dice: hoá khối thép to (miễn choáng chỉ lúc lăn), lăn theo đường vạch trước húc văng mọi người, dừng lại tung xúc xắc:
       sóng chấn bán kính radius + perPip x số chấm */
    iron_dice: {
      aiUse(sys, team, prm) {
        const g = sys.g, b = g.ball, me = prm.owner;
        if (me.state !== 'normal' || me.airZ > 0) return null;
        if (b.owner && b.owner.team !== team) return U.dist(me, b.owner) < prm.distance * 0.8 ? me : null;
        return targetsNear(g, team, me, 90).length >= 2 ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, b = g.ball, f = g.field;
        const d = aimDir(g, team, pl, b.owner && b.owner.team !== team ? b.owner : null);
        const x0 = pl.x, y0 = pl.y;
        const x1 = U.clamp(x0 + d.x * prm.distance, f.x + 12, f.x + f.w - 12), y1 = U.clamp(y0 + d.y * prm.distance, f.y + 12, f.y + f.h - 12);
        const len = Math.hypot(x1 - x0, y1 - y0), travel = Math.max(0.05, len / prm.speed);
        E.beam(x0, y0 - 3, Math.atan2(y1 - y0, x1 - x0), len, 3, '#c63dff', prm.telegraph + 0.1);
        pl.armorT = Math.max(pl.armorT || 0, g.time + prm.telegraph + travel + 0.2);
        pl.glow('#c7ccd6', prm.telegraph + travel + 0.4);
        pl.sizeTarget = prm.size; pl.sizeT = prm.telegraph + travel + 0.4;
        E.shield(pl.x, pl.y - 8, 16, '#c7ccd6', prm.telegraph + 0.1);
        E.comic(pl.x, pl.y - 34, 'IRON DICE!', '#c7ccd6', 1.1, 0.7);
        hold(pl, prm.telegraph + 0.05);
        g.sfx('block');
        g.later(prm.telegraph, () => {
          if (g.state !== 'play' || pl.state === 'stun') return;
          const hit = new Set();
          let T = 0, k = 0;
          pl.state = 'recover'; pl.stateT = travel + 0.4; pl.charging = false;
          g.sfx('whoosh');
          sys.task((dt) => {
            if (g.state !== 'play' || pl.state === 'stun') return true;
            T += dt;
            const kk = Math.min(1, T / travel);
            pl.x = U.lerp(x0, x1, kk); pl.y = U.lerp(y0, y1, kk);
            pl.vx = d.x * prm.speed; pl.vy = d.y * prm.speed;
            pl.facing += dt * 14;   // lăn tròn
            if (b.owner === pl) b.follow(0);
            if ((k += dt) >= 0.05) { k = 0; E.afterimage(pl, 0.2); E.decal('crack', pl.x, pl.y, 0.5, 2); E.shake(2, 0.1); }
            for (const o of g.teams[1 - team].players) {
              if (hit.has(o) || U.dist(o, pl) > pl.radius * prm.size + o.radius + 4 || g.isProtected(o) || o.state === 'meteor') continue;
              hit.add(o);
              if (Act().dodged(g, o)) continue;
              const had = o.hasBall && !sys.unstealable(o);
              if (H.blast(o, pl, prm.knock, prm.launch, prm.stun, pl)) {
                E.comic(o.x, o.y - 30, 'BONK!', '#c7ccd6', 1, 0.5);
                g.sfx('hit');
                if (had) sys.steal(pl);
              }
            }
            return kk >= 1;
          }, () => {
            unlock(pl);
            pl.facing = Math.atan2(d.y, d.x);
            if (g.state !== 'play') return;
            // tung xúc xắc: số chấm quyết định bán kính sóng chấn (vòng hiện ra rồi mới nổ)
            const n = 1 + Math.floor(Math.random() * 6), R = prm.radius + prm.perPip * n;
            E.comic(pl.x, pl.y - 40, n + '!', n >= 5 ? '#ffe14f' : '#c9b5ff', 1 + n * 0.1, 0.8);
            E.wave(pl.x, pl.y, R, '#8a93a3', 0.3, 1);
            g.later(0.3, () => {
              if (g.state !== 'play') return;
              E.wave(pl.x, pl.y, R, '#c63dff', 0.45, 3);
              E.decal('crater', pl.x, pl.y, 0.6 + n * 0.15, 4);
              E.burst(pl.x, pl.y, 2, '#8a7f70', 10 + n * 3, 140, 0.7);
              g.hitStop(0.06 + n * 0.01);
              E.shake(3 + n, 0.3);
              g.sfx('hit');
              for (const o of g.teams[1 - team].players) {
                if (U.dist(o, pl) > R + o.radius || g.isProtected(o) || o.state === 'meteor' || o.airZ > 4 || Act().dodged(g, o)) continue;
                const had = o.hasBall && !sys.unstealable(o);
                if (H.blast(o, pl, prm.knock * 0.7, prm.launch, prm.stun, pl) && had) sys.steal(pl);
              }
            });
          });
        });
      },
    },
  });
})();
