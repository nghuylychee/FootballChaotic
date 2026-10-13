/* Tuyệt kỹ lai (docs/ULT_RECIPE.md): mở khi đạt X2 + Y2 (cores.config.js -> ults.hybrids), gắn vào SFC.CoreBehaviors.
 * Hook giống cores.js: aiUse(sys, team, prm) -> người ra chiêu | null · onUltimate(sys, team, prm, pl) (sau cut-in).
 * Hình ghép từ VFX Kit (systems/vfxkit.js) + helper của cores-new.js (SFC.CoreHelpers: nearestOpp, targetable, blast).
 * Luật (user duyệt 2026-10-13): chiêu cần bóng có needsBall (CoreSystem.ultBlocked) và không bao giờ giật bóng;
 * mọi đòn có báo trước sau cut-in + né được bằng Z (Actions.dodged); trạng thái bất khả xâm phạm ngắn.
 * Trạng thái mới: Steel Formation = CoreSystem.passGuarded + armorT · Mirage Sprint = p.ghostT (chỉ vẽ mờ, vẫn đánh trúng được).
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
  });
})();
