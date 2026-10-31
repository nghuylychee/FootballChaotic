/* Tuyệt kỹ lai (docs/ULT_RECIPE.md): mở khi đạt X2 + Y2 (cores.config.js -> ults.hybrids), gắn vào SFC.CoreBehaviors.
 * Hook giống cores.js: aiUse(sys, team, prm) -> người ra chiêu | null · onUltimate(sys, team, prm, pl) (sau cut-in).
 * Hình ghép từ VFX Kit (systems/vfxkit.js) + helper của cores-new.js (SFC.CoreHelpers: nearestOpp, targetable, blast).
 * Luật (user duyệt 2026-10-13): chiêu cần bóng có needsBall (CoreSystem.ultBlocked) và không bao giờ giật bóng;
 * mọi đòn có báo trước sau cut-in + né được bằng Z (Actions.dodged); trạng thái bất khả xâm phạm ngắn.
 * Các cặp đã thay / làm lại (docs/ULT_REDESIGN.md, 2026-10-15) nằm ở systems/cores-ult2.js. Ở đây còn 5 chiêu giữ nguyên.
 * Helper dùng chung xuất ra SFC.CoreHelpers (cores-ult2.js dùng lại).
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
      E.pop(o.x, o.y - 30, 'ZZT!', 'light', '#7fe7ff');
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
        g.hitStop(0.08);
        E.shake(5, 0.3);
        g.sfx('hit');
        g.sfx('ult', 'dragon.up');
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
          E.pop(o.x, o.y - o.airZ - 30, 'DRAGON KICK!', 'move', '#ff3d5a');
          E.afterimage(pl, 0.3);
          E.shake(8, 0.4);
          g.sfx('hit');
          g.sfx('ult', 'dragon.roar');
          sys.moment(team, 'rising_dragon', 'RISING DRAGON!', 70);
          wallCrack(sys, o);
        });
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
        g.sfx('ult', 'sling.stretch');
        g.later(prm.grab, () => {
          if (g.state !== 'play' || m.state === 'stun') return;
          if (b.owner && b.owner !== m && b.owner.team === team) { b.owner = null; g.gainPossession(m); }   // bóng bay cùng người
          const goal = g.attackGoal(team), d = U.norm(goal.x - m.x, goal.y - m.y);
          const x0 = m.x, y0 = m.y;
          const x1 = U.clamp(x0 + d.x * prm.distance, f.x + 10, f.x + f.w - 10), y1 = U.clamp(y0 + d.y * prm.distance, f.y + 10, f.y + f.h - 10);
          m.state = 'recover'; m.stateT = prm.flight + 0.2; m.charging = false;
          E.wave(x0, y0, 22, '#ff8ac0', 0.35, 2);
          E.pop(x0, y0 - 28, 'BOING!', 'light', '#ff8ac0');
          g.sfx('ult', 'sling.release');
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
              if (H.blast(o, m, prm.knock, prm.launch, prm.stun, m)) { E.pop(o.x, o.y - 30, 'BONK!', 'light', '#ff8ac0'); g.sfx('hit'); }
            }
            return k >= 1;
          }, () => {
            m.vx *= 0.3; m.vy *= 0.3;
            if (m.state === 'recover') { m.state = 'normal'; m.stateT = 0; }
          });
        });
      },
    },







    /* 🎯 SÁT THỦ + 🦵 VÕ SĨ ĐÁ — Cannonball (đợt 4: bay vòng cung như đạn pháo): sút bổng thật cao, rơi xuống trước khung; nổ (hố + hất tung)
       lúc chạm đất / chạm người (kể cả tay thủ môn), bóng nảy tiếp về khung. Vào lưới thì lưới nổ. Đồng đội đỡ được thì tháo ngòi */
    cannonball: {
      aiUse(sys, team, prm) {
        const g = sys.g, me = prm.owner, s = teamBall(sys, team);
        return s && s.state === 'normal' && me.state === 'normal' && nearGoal(g, team, s, 380) && !nearGoal(g, team, s, prm.land + 60) ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, b = g.ball, f = g.field, st = sys.st(team, 'cannonball');
        const s = teamBall(sys, team);
        if (!s) return;
        hold(s, prm.windup + 0.1);
        E.wave(s.x, s.y, 22, '#b46bff', prm.windup, 2);
        g.sfx('whoosh');
        g.later(prm.windup, () => {
          if (g.state !== 'play' || b.owner !== s || s.state === 'stun') return;
          unlock(s);
          // điểm rơi: trước khung land px, lệch ngẫu nhiên trong bề rộng khung; bay bổng tới apex px (trọng lực bóng)
          const goal = g.attackGoal(team), dir = g.teams[team].dir, G = SFC_CONFIG.game.ball.gravity;
          const L = { x: goal.x - dir * prm.land, y: goal.y + U.rand(-1, 1) * f.goalWidth * 0.35 };
          const vz = Math.sqrt(2 * G * prm.apex), tf = (2 * vz) / G, d = U.norm(L.x - b.x, L.y - b.y), spd = U.dist(b, L) / tf;
          const pvx = d.x * spd, pvy = d.y * spd;
          s.facing = Math.atan2(d.y, d.x);
          b.kick(s, pvx, pvy, vz);
          b.kind = 'shot';
          b.skin = 'bomb';
          Act().startAttack(s, 'shoot');
          st.live = true;
          g.hitStop(0.06);
          E.shake(5, 0.3);
          g.sfx('kick', 1);
          g.sfx('ult', 'cannon.fire');
          g.sfx('ult', 'cannon.whistle');
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
            E.pop(x, y - 34, 'KABOOM!', 'huge', '#ff6a1f');
            g.sfx('hit');
            g.sfx('ult', 'cannon.boom');
            const c = { x, y };
            for (const o of g.teams[1 - team].players) {
              if (U.dist(o, c) > prm.radius + o.radius || g.isProtected(o) || o.state === 'meteor' || Act().dodged(g, o)) continue;
              H.blast(o, c, prm.knock, prm.launch, prm.stun, s);
            }
          };
          let T = 0, landed = false;
          sys.task((dt) => {
            // có người chạm bóng thì xét trước (nhặt bóng có thể đã xoá skin bom — Game.gainPossession)
            if (g.state !== 'play' || !st.live || (b.skin !== 'bomb' && !b.owner)) return true;
            T += dt;
            if (b.owner) {
              if (b.owner.team === team) { st.live = false; b.skin = null; return true; }   // đồng đội đỡ: tháo ngòi
              boom(b.owner.x, b.owner.y);
              return true;
            }
            // đang bay: giữ đúng vòng cung (bỏ lực cản không khí), không ai nhặt được khi còn cao
            if (!landed && b.z > 1) { b.vx = pvx; b.vy = pvy; }
            const near = b.z < 16 && g.teams[1 - team].players.some((q) => q.airZ <= 4 && U.dist(q, b) < q.radius + b.r + 6);
            const ground = !landed && T > 0.2 && b.z <= 1.5;
            if (near || ground || T > tf + 1.5) {
              landed = true;
              boom(b.x, b.y);
              if (!b.owner) { b.vx = pvx * prm.bounce; b.vy = pvy * prm.bounce; b.vz = 60; }   // nảy tiếp về khung
              return true;
            }
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
        E.pop(b.x, b.y - 30, 'KABOOM!', 'huge', '#ff6a1f');
        E.netFire(b.x > g.field.cx ? 1 : -1);
      },
      onKickoff(sys, team) { sys.st(team, 'cannonball').live = false; },
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
        H.rush(sys, pl, o, prm.rush, U.dist(pl, o) / prm.rush + 0.15, () => {
          const E = g.effects, f = g.field;
          if (o.hasBall && !sys.unstealable(o)) { g.looseBall(o, pl.x - o.x, pl.y - o.y, 40); sys.steal(pl); }
          let d = U.norm(o.x - pl.x + U.rand(-0.3, 0.3), o.y - pl.y + U.rand(-0.6, 0.6));
          o.hitImmune = 0;
          o.hit({ stun: prm.stun + prm.time, kbx: 0, kby: 0, source: pl, type: 'hard' });
          g.hitStop(0.08);
          E.impactFrame();
          E.pop(o.x, o.y - 30, 'BOING!', 'heavy', '#c63dff');
          E.shake(6, 0.3);
          g.sfx('hit');
          g.sfx('ult', 'pinball.flip');
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
              E.pop(o.x, o.y - 30, 'BONK!', 'light', '#c63dff');
              E.shake(3, 0.15);
              g.sfx('ult', 'pinball.ding');
            }
            if ((k += dt) >= 0.05) { k = 0; E.afterimage(o, 0.2); }
            for (const q of g.teams[1 - team].players) {
              if (hit.has(q) || U.dist(q, o) > q.radius + o.radius + 4 || g.isProtected(q) || q.state === 'meteor') continue;
              hit.add(q);
              if (Act().dodged(g, q)) continue;
              if (q.hasBall && !sys.unstealable(q)) g.looseBall(q, d.x, d.y, 60);
              H.blast(q, o, prm.knock, prm.launch, prm.stun, pl);
              E.pop(q.x, q.y - 30, 'STRIKE!', 'light', '#ffe14f');
              g.sfx('hit');
              g.sfx('ult', 'pinball.ding');
            }
            return T >= prm.time || bounces > prm.bounces;
          }, () => { if (o.state === 'stun') o.stateT = Math.min(o.stateT, prm.stun); });
        });
      },
    },

  });

  Object.assign(H, { teamBall, nearestMate, aimDir, nearGoal, hold, unlock, wallCrack, forwardMate, targetsNear, zapLine, shootGoal });
})();
