/* Tuyệt kỹ thiết kế lại (docs/ULT_REDESIGN.md, user duyệt 2026-10-15): mỗi chiêu một cơ chế riêng, gắn vào SFC.CoreBehaviors.
 * Hook giống cores.js: aiUse(sys, team, prm) -> người ra chiêu | null · onUltimate(sys, team, prm, pl) (sau cut-in) · update / onHit / onSkillMove...
 * Luật giữ nguyên: needsBall không bao giờ giật bóng · mọi đòn có báo trước + né được bằng Z (Actions.dodged) · bất khả xâm phạm ngắn.
 * Vật thể trên sân (tường sét, cột đá, gương, hộp lò xo, đe, xích, bàn tay ma, cổng, lốc xoáy) = Effects.prop (chỉ để nhìn, đồng bộ
 * online qua lệnh hiệu ứng); va chạm tính ở đây trong sys.task (chỉ máy chạy mô phỏng) -> không đổi định dạng snapshot.
 * Trạng thái trận mới: Game.stopT + stopTick (VHS Rewind) · st(đội, 'iron_chain').t (passGuarded) · p.ghostT (Smoke Bomb: tàng hình với đối thủ).
 * Đợt 3 (2026-10-17): Smoke Bomb, Bullet Time (thay Hypno Eyes, Time Stop Strike), Iron Hammer xoay búa + địa chấn, Phase Step cổng + pip lượt.
 * Đợt 2 (2026-10-15, sau khi user thử phòng test): thêm TRẠNG THÁI dùng chung (Stat: trơn té · hoá đá · thôi miên · teo nhỏ),
 * 8 chiêu mới + sửa 10 chiêu (docs/ULT_REDESIGN.md mục 9). Tuyệt kỹ nhiều lần dùng: hook recast (Earth Spike).
 */
window.SFC = window.SFC || {};

(function () {
  const U = SFC.U;
  const B = SFC.CoreBehaviors, H = SFC.CoreHelpers;
  const Act = () => SFC.Actions;
  const fv = (p) => ({ x: Math.cos(p.facing), y: Math.sin(p.facing) });
  const TAU = Math.PI * 2;
  const human = (g, p) => g.isHuman(p.team) && p.isControlled;
  // đối thủ đánh được: đứng dưới đất, không ở ngoài màn hình, không được bảo vệ
  const hittable = (g, o) => o.airZ <= 4 && o.state !== 'meteor' && !g.isProtected(o);
  // đang ra đòn đánh vào vật (đấm / đá / thủ môn đổ người)
  const attacking = (g, q) => q.state === 'jab' || q.state === 'kick' || q.state === 'windup' || (q.state === 'dash' && g.inKeeperZone(q));
  // điểm trong sân (cách mép m px)
  const clampIn = (f, x, y, m = 8) => ({ x: U.clamp(x, f.x + m, f.x + f.w - m), y: U.clamp(y, f.y + m, f.y + f.h - m) });
  // lực sút tối đa của cầu thủ p (Tuyệt kỹ tự sút)
  const fullShot = (sys, p) => SFC_CONFIG.game.kick.shotMaxSpeed * p.stats.power * sys.pmod(p, 'shotPower');
  // sút bóng từ chân / chỗ bóng về khung thành đối thủ (y ngẫu nhiên trong khung), tốc độ spd
  function fireAtGoal(g, team, p, spd, vz = 30) {
    const b = g.ball, f = g.field, goal = g.attackGoal(team);
    const ty = goal.y + U.rand(-1, 1) * (f.goalWidth / 2 - 8);
    const d = U.norm(goal.x - b.x, ty - b.y);
    p.facing = Math.atan2(d.y, d.x);
    b.kick(p, d.x * spd, d.y * spd, vz);
    b.kind = 'shot';
    Act().startAttack(p, 'shoot');
  }

  // vật cản tròn trên sân (cột đá, đe): người không đi xuyên qua, bóng (thấp) bật ra. list: [{ x, y, r }]
  function solids(sys, list, life, onEnd) {
    const g = sys.g, b = g.ball, E = g.effects;
    let T = 0;
    sys.task((dt) => {
      if (g.state !== 'play' || (T += dt) >= life) return true;
      for (const s of list) {
        if (s.dead) continue;
        for (const q of g.players) {
          if (q.airZ > 4) continue;
          const dx = q.x - s.x, dy = q.y - s.y, d = Math.hypot(dx, dy), min = s.r + q.radius;
          if (d < min && d > 0.01) { q.x = s.x + (dx / d) * min; q.y = s.y + (dy / d) * min; }
        }
        if (b.owner || b.z > 22) continue;
        const dx = b.x - s.x, dy = b.y - s.y, d = Math.hypot(dx, dy) || 0.01, min = s.r + b.r;
        if (d >= min) continue;
        const nx = dx / d, ny = dy / d, dot = b.vx * nx + b.vy * ny;
        if (dot < 0) {
          b.vx -= 1.8 * dot * nx; b.vy -= 1.8 * dot * ny;
          if (dot < -80) { E.burst(b.x, b.y, b.z, '#d9cbb0', 6, 60, 0.3); g.sfx('wall'); }
        }
        b.x = s.x + nx * min; b.y = s.y + ny * min;
      }
      return false;
    }, onEnd);
  }


  /* ---------- TRẠNG THÁI (gợi ý của user 2026-10-15) — mỗi cái có hình riêng để đọc được trên sân ----------
   * trơn té: ngã sõng soài + trượt · hoá đá: đứng chết trân màu đá · thôi miên: đi lang thang, ai chạm là tỉnh · teo nhỏ: bé + chậm
   * đợt 4: hoá gà · hoảng sợ (đảo hướng di chuyển) · con rối (Puppet Master, Player.puppet) */
  const Stat = {
    // trơn té: ngã ngửa thật (prop 'fall' vẽ người nằm sõng soài thay sprite, chân về hướng trượt), trượt theo d (mặc định hướng đang chạy)
    // slide px/s, choáng t giây. Không phải bị đánh nên không tia lửa / tiếng đấm (hit quiet), tiếng ngã riêng snd (g.sfx('ult', snd))
    slip(sys, o, t, src, slide = 200, d = null, snd = 'stat.slip') {
      const g = sys.g, E = g.effects, sp = Math.hypot(o.vx, o.vy);
      d = d || (sp > 10 ? { x: o.vx / sp, y: o.vy / sp } : { x: U.rand(-1, 1), y: U.rand(-1, 1) });
      d = U.norm(d.x, d.y + 0.001);
      o.hitImmune = 0;
      if (o.state === 'stun') { o.state = 'normal'; o.stateT = 0; }
      if (!o.hit({ stun: t, kbx: d.x * slide, kby: d.y * slide, source: src, type: 'hard', quiet: true })) return false;
      const id = H.propId(g), T = o.stateT;
      E.prop(id, 'fall', o.x, o.y, o.id, Math.atan2(d.y, d.x), T, '#ffe14f');
      // hết choáng sớm (bị dựng dậy, bàn thắng...) thì đứng dậy luôn
      let el = 0;
      sys.task((dt) => {
        if ((el += dt) >= T) return true;
        if (g.state !== 'play' || o.state !== 'stun') { E.propOff(id, 0.15); return true; }
        return false;
      });
      E.decal('skid', o.x, o.y, 0.9, 2.5, Math.atan2(d.y, d.x));
      E.burst(o.x, o.y, 2, '#e8ecf5', 8, 70, 0.4);
      E.shake(SFC_CONFIG.game.fx.shakeHit * 0.5);
      E.pop(o.x, o.y - 30, 'SLIP!', 'status', '#ffe14f');
      g.sfx('ult', snd);
      return true;
    },
    // hoá đá: choáng t giây, không bị đẩy đi (đứng chôn chân), hình tượng đá phủ lên người
    stone(sys, o, t, src) {
      const g = sys.g, E = g.effects;
      o.hitImmune = 0;
      if (o.state === 'stun') { o.state = 'normal'; o.stateT = 0; }
      if (!o.hit({ stun: t, kbx: 0, kby: 0, source: src, type: 'hard' })) return false;
      E.prop(H.propId(g), 'stone', o.x, o.y, o.id, 0, t, '#8a8f99');
      E.burst(o.x, o.y - 8, 6, '#c7ccd6', 10, 60, 0.5);
      const x = o.x, y = o.y;
      let T = 0;
      sys.task((dt) => { if (g.state !== 'play' || (T += dt) >= t || o.state !== 'stun') return true; o.x = x; o.y = y; o.kbx = o.kby = 0; return false; });
      return true;
    },
    // teo nhỏ: cỡ size (va chạm, tầm bắt bóng thủ môn nhỏ theo — Player.sizeMul), chạy chậm còn slow, t giây
    tiny(sys, o, t, size, slow) {
      const E = sys.g.effects;
      o.sizeTarget = size; o.sizeT = t;
      o.buffs.push({ speed: slow, t });
      E.burst(o.x, o.y - 6, 6, '#ff7ab8', 12, 70, 0.5);
      E.pop(o.x, o.y - 30, 'TINY!', 'status', '#ff7ab8');
      return true;
    },
    // hoá gà (Chicken Ray): rơi bóng, không chạm được bóng (kể cả thủ môn bắt bóng), không ra đòn / chuyền / sút / lướt t giây.
    // Hình con gà vẽ đè lên người (prop 'chicken', render/vfx.js — sprite thật bị ẩn)
    chicken(sys, o, t, speed, src) {
      const g = sys.g, E = g.effects, b = g.ball;
      if (b.owner === o) { g.looseBall(o, U.rand(-1, 1), U.rand(-1, 1), 90); if (src && src.team !== o.team) sys.steal(src); }
      o.chickenT = t; o.noActT = Math.max(o.noActT, t);
      o.charging = false; o.cancelPass();
      o.buffs.push({ speed, t });
      E.prop(H.propId(g), 'chicken', o.x, o.y, o.id, 0, t, '#f3ead7');
      E.burst(o.x, o.y - 10, 8, '#ffffff', 18, 90, 0.6);
      E.pop(o.x, o.y - 30, 'BAWK!', 'status', '#ffe14f');
      g.sfx('ult', 'chicken.bawk');
      let T = 0;
      sys.task((dt) => {
        if (g.state !== 'play' || (T += dt) >= t || !(o.chickenT > 0)) return true;
        b.noPickup.set(o.id, 0.1);
        return false;
      }, () => { if (g.state === 'play') E.burst(o.x, o.y - 10, 8, '#ffffff', 10, 60, 0.4); });
      return true;
    },
    // hoảng sợ (Panic Ball): t giây mọi hướng di chuyển đảo ngược (Player.moveNormal, Human.update), rơi bóng; mồ hôi + "!!" trên đầu
    panic(sys, o, t, src) {
      const g = sys.g, E = g.effects, b = g.ball;
      if (b.owner === o) { g.looseBall(o, U.rand(-1, 1), U.rand(-1, 1), 90); if (src && src.team !== o.team) sys.steal(src); }
      o.panicT = t;
      o.charging = false; o.cancelPass();
      E.prop(H.propId(g), 'panic', o.x, o.y, o.id, 0, t, '#7fe7ff');
      E.pop(o.x, o.y - 30, 'EEK!', 'status', '#7fe7ff');
      return true;
    },
    // thôi miên: t giây đi lang thang (dir() -> hướng), không làm gì được; bị đánh / có người hoặc bóng chạm vào là tỉnh
    hypno(sys, o, t, speed, dir) {
      const g = sys.g, E = g.effects, b = g.ball, id = H.propId(g);
      o.state = 'recover'; o.stateT = t; o.charging = false; o.cancelPass();
      E.prop(id, 'hypno', o.x, o.y, o.id, 0, t, '#ff7ab8');
      let T = 0;
      const wake = (why) => {
        E.propOff(id);
        if (o.state === 'recover') { o.state = 'normal'; o.stateT = 0; }
        if (why) E.pop(o.x, o.y - 30, 'HUH?', 'status', '#ff7ab8');
      };
      sys.task((dt) => {
        if (g.state !== 'play') return true;
        if ((T += dt) >= t) { wake(false); return true; }
        if (o.state !== 'recover') { E.propOff(id); return true; }   // bị đánh: tỉnh luôn
        const touch = g.players.some((q) => q !== o && q.airZ <= 4 && U.dist(q, o) < q.radius + o.radius + 1)
          || (!b.owner && b.speed > 60 && b.z < 16 && U.dist(b, o) < o.radius + b.r + 2);
        if (touch && T > 0.25) { wake(true); return true; }
        o.stateT = Math.max(o.stateT, 0.1);
        const d = dir(o, T), f = g.field;
        o.x = U.clamp(o.x + d.x * speed * dt, f.x + o.radius, f.x + f.w - o.radius);
        o.y = U.clamp(o.y + d.y * speed * dt, f.y + o.radius, f.y + f.h - o.radius);
        o.vx = d.x * speed; o.vy = d.y * speed; o.facing = Math.atan2(d.y, d.x);
        if (b.owner === o) b.follow(0);
        return false;
      });
      return true;
    },
  };
  SFC.CoreStat = Stat;   // luật trận FOOTBALL STORY (src/systems/matchmods.js) dùng lại trơn té, teo nhỏ...

  /* ---------- hình học cho Storm Cycle (vòng sét kín) ---------- */
  // giao điểm 2 đoạn thẳng (null nếu không cắt)
  function segHit(a, b) {
    const rx = a.x1 - a.x0, ry = a.y1 - a.y0, sx = b.x1 - b.x0, sy = b.y1 - b.y0, den = rx * sy - ry * sx;
    if (Math.abs(den) < 1e-6) return null;
    const qx = b.x0 - a.x0, qy = b.y0 - a.y0, t = (qx * sy - qy * sx) / den, u = (qx * ry - qy * rx) / den;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? { x: a.x0 + rx * t, y: a.y0 + ry * t } : null;
  }
  const polyArea = (pts) => { let s = 0; pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length]; s += p.x * q.y - q.x * p.y; }); return Math.abs(s) / 2; };
  function inPoly(pts, x, y) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const a = pts[i], b = pts[j];
      if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
    }
    return inside;
  }


  Object.assign(B, {
    /* ================= TUYỆT KỸ GỐC ================= */

    /* 🏃 TỐC ĐỘ — Light Cycle: chạy siêu tốc, vệt tường sét sau lưng; đối thủ chạy qua bị giật (lướt Z / đang bay thì qua được) */
    light_cycle: {
      aiUse(sys, team, prm) {
        const g = sys.g, b = g.ball, me = prm.owner;
        if (me.state !== 'normal' || me.airZ > 0) return null;
        if (b.owner === me) { const o = H.nearestOpp(g, team, me); return o && U.dist(o, me) < 90 ? me : null; }
        return b.owner && b.owner.team !== team && U.dist(b.owner, me) < 170 ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, f = g.field;
        const aw = !!prm.cage;   // ★★ STORM CYCLE: vòng kín = lồng sét nổ
        pl.buffs.push({ speed: prm.speed, t: prm.time });
        pl.glow('#3ff6ff', prm.time);
        pl.stamina = SFC_CONFIG.game.player.staminaMax;
        E.speedLines(0.4, pl.x, pl.y, '#bdf4ff');
        E.burst(pl.x, pl.y, 4, '#bdf4ff', 16, 120, 0.5);
        g.sfx('ult', 'cycle.start');
        if (aw) E.prop(H.propId(g), 'grid', f.x, f.y, f.w, f.h, prm.time + prm.life * 0.5, '#3ff6ff');   // lưới neon phủ sân
        const segs = [], hitT = new Map(), caged = new Map();
        let T = 0, k = 0, last = { x: pl.x, y: pl.y }, orbit = null;
        // lồng sét: vòng pts khép kín -> loé sáng, sét chạy từ mép vào tâm, đối thủ đứng trong vòng choáng
        const cage = (pts) => {
          const c = pts.reduce((m, p) => ({ x: m.x + p.x / pts.length, y: m.y + p.y / pts.length }), { x: 0, y: 0 });
          const r = Math.max(...pts.map((p) => U.dist(p, c)));
          E.prop(H.propId(g), 'cage', c.x, c.y, r, 0, 0.7, '#3ff6ff');
          for (let i = 0; i < 7; i++) { const p = pts[Math.floor((i / 7) * pts.length)]; E.bolt(p.x, p.y - 6, c.x, c.y - 4, i % 2 ? '#ffffff' : '#bdf4ff', 0.45); }
          E.flash(0.15);
          E.shake(6, 0.35);
          E.pop(c.x, c.y - 30, 'LOCKED!', 'move', '#3ff6ff');
          g.sfx('ult', 'cycle.cage');
          for (const o of g.teams[1 - team].players) {
            if (!hittable(g, o) || o.state === 'dash' || (caged.get(o.id) || 0) > g.time || !inPoly(pts, o.x, o.y) || Act().dodged(g, o)) continue;
            caged.set(o.id, g.time + 1.5);
            const d = U.norm(c.x - o.x, c.y - o.y + 0.01);
            o.hitImmune = 0;
            if (o.state === 'stun') { o.state = 'normal'; o.stateT = 0; }
            if (o.hit({ stun: prm.cage, kbx: d.x * prm.cageKnock, kby: d.y * prm.cageKnock, source: pl, type: 'hard' })) {
              E.bolt(o.x, o.y - 26, o.x, o.y - 2, '#ffffff', 0.5);
              E.burst(o.x, o.y, 8, '#bdf4ff', 16, 110, 0.6);
              E.pop(o.x, o.y - 30, 'ZZZT!', 'heavy', '#7fe7ff');
            }
          }
        };
        // đoạn mới s cắt một đoạn cũ (chưa dùng, không tính 3 đoạn liền trước) -> vòng kín đủ to thì nổ lồng
        const loop = (s) => {
          const n = segs.length - 1;
          for (let i = n - 4; i >= 0; i--) {
            const o = segs[i];
            if (o.used) break;
            const P = segHit(o, s);
            if (!P) continue;
            const pts = [P];
            for (let j = i + 1; j <= n; j++) pts.push({ x: segs[j].x0, y: segs[j].y0 });
            if (polyArea(pts) < prm.minLoop) return;
            for (let j = 0; j <= n; j++) segs[j].used = true;
            cage(pts);
            return;
          }
        };
        sys.task((dt) => {
          if (g.state !== 'play') return true;
          T += dt;
          const live = T < prm.time && pl.state !== 'stun';
          if (live) {
            pl.stamina = Math.max(pl.stamina, 40);   // chạy nước rút thoải mái suốt chiêu
            // AI ★★: chạy một vòng quanh đối thủ gần nhất (người cầm bóng trước) để khép lồng
            if (aw && !human(g, pl) && pl.state !== 'stun' && T < prm.time * 0.75) {
              if (!orbit) {
                const b = g.ball, tg = b.owner && b.owner.team !== team ? b.owner : H.nearestOpp(g, team, pl, (o) => hittable(g, o));
                if (tg && U.dist(tg, pl) < 160) orbit = { tg, a: Math.atan2(pl.y - tg.y, pl.x - tg.x), turn: 0, dir: Math.random() < 0.5 ? 1 : -1 };
                else orbit = { done: true };
              }
              if (!orbit.done && orbit.turn < TAU * 1.15) {
                const sp = pl.maxSpeed() * dt, R = 38, da = (sp / R) * orbit.dir;
                orbit.a += da; orbit.turn += Math.abs(da);
                const p = clampIn(f, orbit.tg.x + Math.cos(orbit.a) * R, orbit.tg.y + Math.sin(orbit.a) * R * 0.8, 10);
                H.hold(pl, dt * 2);
                pl.facing = Math.atan2(p.y - pl.y, p.x - pl.x);
                pl.x = p.x; pl.y = p.y;
                if (g.ball.owner === pl) g.ball.follow(0);
              } else if (!orbit.done) { orbit.done = true; H.unlock(pl); }
            }
            if ((k += dt) >= prm.every && U.dist(pl, last) >= 3) {
              k = 0;
              const s = { x0: last.x, y0: last.y, x1: pl.x, y1: pl.y, t: prm.life, id: H.propId(g) };
              segs.push(s);
              E.prop(s.id, aw ? 'trail2' : 'trail', s.x0, s.y0, s.x1, s.y1, prm.life, '#3ff6ff');
              last = { x: pl.x, y: pl.y };
              if (aw) loop(s);
            }
          }
          for (const s of segs) s.t -= dt;
          while (segs.length && segs[0].t <= 0) segs.shift();
          for (const o of g.teams[1 - team].players) {
            if (!hittable(g, o) || o.state === 'stun' || o.state === 'dash' || (hitT.get(o.id) || 0) > g.time) continue;
            for (const s of segs) {
              if (U.segDist(o.x, o.y, s.x0, s.y0, s.x1, s.y1) > prm.width + o.radius * 0.5) continue;
              hitT.set(o.id, g.time + 1);
              const d = U.norm(s.x1 - s.x0, s.y1 - s.y0 + 0.001), side = (o.x - s.x0) * -d.y + (o.y - s.y0) * d.x >= 0 ? 1 : -1;
              o.hitImmune = 0;
              if (o.hit({ stun: prm.stun, kbx: -d.y * side * prm.knock, kby: d.x * side * prm.knock, source: pl, type: 'slash' })) {
                E.bolt(o.x, o.y - 22, o.x, o.y - 2, '#bdf4ff', 0.4);
                E.burst(o.x, o.y, 8, '#bdf4ff', 12, 90);
                E.pop(o.x, o.y - 30, 'ZZT!', 'light', '#7fe7ff');
                g.sfx('ult', 'cycle.zap');
              }
              break;
            }
          }
          return !live && !segs.length;
        }, () => { for (const s of segs) E.propOff(s.id); });
      },
    },

    /* 🦵 VÕ SĨ ĐÁ — Moon Stomp: dậm đất, mọi người trong vòng (cả đồng đội, cả bóng) lơ lửng không làm gì được;
       người dùng chạy chạm người đang lơ lửng = đá văng xa, chạm bóng lơ lửng = vô-lê về khung */
    moon_stomp: {
      aiUse(sys, team, prm) {
        const g = sys.g, b = g.ball, me = prm.owner;
        if (me.state !== 'normal' || me.airZ > 0) return null;
        const n = g.teams[1 - team].players.filter((o) => hittable(g, o) && U.dist(o, me) < prm.radius * 0.8).length;
        return n >= 2 || (b.owner && b.owner.team !== team && U.dist(b.owner, me) < prm.radius * 0.7) ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, c = { x: pl.x, y: pl.y }, R = prm.radius, zid = H.propId(g);
        H.hold(pl, prm.telegraph + 0.05);
        pl.airVz = 170; pl.airZ = Math.max(pl.airZ, 0.5);   // bật lên lấy đà
        // báo trước: vòng xanh trăng + mặt trăng mờ trên sân -> ra khỏi vòng / lướt Z đúng lúc dậm
        E.wave(c.x, c.y, R, '#a8e6ff', prm.telegraph, 1);
        E.prop(zid, 'moon', c.x, c.y, R, 0, prm.telegraph + prm.float, '#a8e6ff');
        g.sfx('whoosh');
        g.later(prm.telegraph, () => {
          if (g.state !== 'play' || pl.state === 'stun') { E.propOff(zid); return; }
          H.unlock(pl);
          g.hitStop(0.1);
          E.impactFrame();
          E.shake(8, 0.4);
          E.wave(c.x, c.y, R, '#ffffff', 0.5, 3);
          E.decal('crack', c.x, c.y, 1.6, 4);
          E.burst(c.x, c.y, 2, '#a8e6ff', 24, 120, 0.8);
          E.tint('#0a1830', prm.float, prm.follow ? 0.38 : 0.22);
          g.sfx('hit');
          g.sfx('ult', 'moon.stomp');
          g.sfx('ult', 'moon.float');
          // ★★ FULL MOON STOMP: trăng tròn to trên trời + vòng trăng bám theo người dùng (thay vòng đứng yên)
          let mid = zid;
          if (prm.follow) {
            E.propOff(zid, 0.2);
            mid = H.propId(g);
            E.prop(mid, 'moonf', pl.x, pl.y, pl.id, R, prm.float + 0.3, '#a8e6ff');
            E.prop(H.propId(g), 'fullmoon', g.field.x + g.field.w * 0.78, 34, 0, 0, prm.float + 0.4, '#e8fbff');
          }
          const fl = [];
          const lift = (o) => {
            o.hitImmune = 0;
            if (o.state === 'stun') { o.state = 'normal'; o.stateT = 0; }
            o.hit({ stun: 0.35, kbx: 0, kby: 0, source: pl, type: 'hard' });   // đang cầm bóng thì rơi bóng
            o.kbx *= 0.2; o.kby *= 0.2;
            o.floatPh = Math.random() * TAU;
            fl.push(o);
          };
          for (const o of g.players) {
            if (o === pl || U.dist(o, c) > R + o.radius || o.state === 'meteor' || g.isProtected(o)) continue;
            if (o.team !== team && Act().dodged(g, o)) continue;
            lift(o);
          }
          const b = g.ball;
          let ball = !b.owner && U.dist(b, c) <= R + 6;
          const gone = new Set();
          let T = 0;
          sys.task((dt) => {
            if (g.state !== 'play') return true;
            T += dt;
            const k = Math.min(1, T / 0.5);
            // ★★: vòng đi theo người dùng — đối thủ / bóng lọt vào vòng cũng bị nhấc lên (né Z lúc vòng chạm tới là thoát)
            if (prm.follow && pl.state !== 'stun') {
              for (const o of g.teams[1 - team].players) {
                if (fl.includes(o) || !hittable(g, o) || U.dist(o, pl) > R + o.radius || Act().dodged(g, o)) continue;
                lift(o);
                E.burst(o.x, o.y, 4, '#e8fbff', 10, 60, 0.6);
                g.sfx('ult', 'moon.lift');
              }
              if (!ball && !b.owner && U.dist(b, pl) <= R && b.z < 20) ball = true;
            }
            // AI dùng chiêu: tự lướt tới người lơ lửng gần nhất (người chơi tự chạy tới)
            if (!human(g, pl) && pl.state === 'normal') {
              const tgt = fl.filter((o) => o.team !== team && !gone.has(o)).sort((a, q) => U.dist(a, pl) - U.dist(q, pl))[0] || (ball ? b : null);
              if (tgt) { const d = U.norm(tgt.x - pl.x, tgt.y - pl.y); const s = Math.min(U.dist(tgt, pl), pl.maxSpeed() * 1.2 * dt); pl.x += d.x * s; pl.y += d.y * s; pl.facing = Math.atan2(d.y, d.x); }
            }
            for (const o of fl) {
              if (gone.has(o)) continue;
              if (o.state !== 'stun') { gone.add(o); continue; }
              o.airZ = Math.max(1, prm.lift * k + Math.sin(T * 3 + o.floatPh) * 4); o.airVz = 0;
              o.kbx *= 0.9; o.kby *= 0.9; o.stateT = Math.max(o.stateT, 0.35);
              if (o.team !== team && pl.state === 'normal' && U.dist(o, pl) < pl.radius + o.radius + 6) {
                gone.add(o);
                o.hitImmune = 0; o.state = 'normal'; o.stateT = 0;
                H.blast(o, pl, prm.knock, prm.launch, prm.stun, pl);
                E.pop(o.x, o.y - 40, 'HOME RUN!', 'move', '#a8e6ff');
                E.burst(o.x, o.y - o.airZ, 8, '#ffffff', 12, 110, 0.5);
                g.hitStop(0.08);
                E.shake(6, 0.3);
                g.sfx('hit');
                H.wallCrack(sys, o);
              }
            }
            if (ball) {
              if (b.owner) ball = false;
              else {
                b.z = prm.lift * 0.6 * k + Math.sin(T * 3) * 3; b.vz = 0; b.vx *= 0.9; b.vy *= 0.9;
                for (const q of g.players) b.noPickup.set(q.id, 0.1);
                if (pl.state === 'normal' && U.dist(b, pl) < pl.radius + b.r + 8) {
                  ball = false;
                  fireAtGoal(g, team, pl, fullShot(sys, pl) * prm.volley, 20);
                  b.fx.spiral = true;
                  E.pop(b.x, b.y - b.z - 16, 'VOLLEY!', 'move', '#a8e6ff');
                  E.impactFrame();
                  g.sfx('kick', 1);
                }
              }
            }
            return T >= prm.float;
          }, () => {
            for (const o of fl) if (!gone.has(o) && o.airZ > 0) o.airVz = -60;   // hết trọng lực: rơi xuống
            if (ball && !b.owner) b.vz = -40;
            E.propOff(mid, 0.3);
          });
        });
      },
    },

    /* ================= TUYỆT KỸ LAI ================= */




    /* 🏃 TỐC ĐỘ + 🦵 VÕ SĨ ĐÁ — Hurricane Kick: xoay thành lốc xoáy đi chậm (điều khiển được); ai chạm bị hút lên văng sang bên,
       bóng bị cuốn vào xoay quanh rồi văng ra ngẫu nhiên phía trước (có thể mất bóng) */
    hurricane_kick: {
      aiUse(sys, team, prm) {
        const g = sys.g, b = g.ball, me = prm.owner;
        if (me.state !== 'normal' || me.airZ > 0) return null;
        const n = H.targetsNear(g, team, me, 90).length;
        return n >= 2 || (b.owner && b.owner.team !== team && U.dist(b.owner, me) < 110) ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, b = g.ball, f = g.field, id = H.propId(g);
        E.prop(id, 'tornado', pl.x, pl.y, pl.id, 0, prm.time + 0.1, '#e8f0f5');
        g.sfx('ult', 'hurricane');
        let T = 0, k = 0, ball = b.owner === pl;
        if (ball) b.owner = null;
        const hit = new Set();
        sys.task((dt) => {
          if (g.state !== 'play' || pl.state === 'stun') return true;
          T += dt;
          H.hold(pl, 0.1);
          // hướng đi: người chơi theo phím; AI về phía người cầm bóng đối thủ / bóng / khung thành
          let d;
          if (human(g, pl)) d = Math.hypot(pl.intent.mx, pl.intent.my) > 0.2 ? U.norm(pl.intent.mx, pl.intent.my) : fv(pl);
          else {
            const t = b.owner && b.owner.team !== team ? b.owner : !b.owner && !ball ? b : g.attackGoal(team);
            d = U.norm(t.x - pl.x, t.y - pl.y + 0.01);
          }
          const np = clampIn(f, pl.x + d.x * prm.speed * dt, pl.y + d.y * prm.speed * dt, pl.radius);
          pl.x = np.x; pl.y = np.y; pl.facing += dt * 22;
          if ((k += dt) >= 0.08) { k = 0; E.burst(pl.x, pl.y, 4, '#d8e8f0', 3, 60, 0.4); }
          for (const o of g.teams[1 - team].players) {
            if (hit.has(o) || !hittable(g, o) || U.dist(o, pl) > prm.radius + o.radius) continue;
            hit.add(o);
            if (Act().dodged(g, o)) continue;
            const side = U.randSign(), a = Math.atan2(o.y - pl.y, o.x - pl.x) + side * 0.9;
            const had = o.hasBall && !sys.unstealable(o);
            H.blast(o, pl, prm.knock, prm.launch, prm.stun, pl, { x: Math.cos(a), y: Math.sin(a) });
            if (had) sys.steal(pl);
            E.pop(o.x, o.y - 30, 'WHOOSH!', 'light', '#b46bff');
            g.sfx('hit');
          }
          // bóng lỏng chạm lốc: bị cuốn vào
          if (!ball && !b.owner && b.z < 30 && U.dist(b, pl) < prm.radius + b.r + 4) ball = true;
          if (ball) {
            if (b.owner) ball = false;
            else {
              const a = T * 14;
              b.x = pl.x + Math.cos(a) * 9; b.y = pl.y + Math.sin(a) * 5; b.z = 10 + Math.sin(T * 6) * 6;
              b.vx = b.vy = b.vz = 0;
              for (const q of g.players) b.noPickup.set(q.id, 0.1);
            }
          }
          return T >= prm.time;
        }, () => {
          E.propOff(id, 0.2);
          H.unlock(pl);
          if (ball && !b.owner && g.state === 'play') {   // nhả bóng: văng ngẫu nhiên về phía trước
            const goal = g.attackGoal(team), a = Math.atan2(goal.y - b.y, goal.x - b.x) + U.rand(-0.8, 0.8);
            b.kick(pl, Math.cos(a) * prm.ballSpeed, Math.sin(a) * prm.ballSpeed, 120);
            E.burst(b.x, b.y, b.z, '#d8e8f0', 10, 100, 0.5);
          }
        });
      },
    },

    /* 🏃 TỐC ĐỘ + 🌀 ẢO ẢNH — Phase Step (user chốt 2026-10-17): time giây, blinks lượt dịch chuyển hiện thành pip trên đầu, không hồi chiêu.
       Mỗi lần bấm Z: chui vào cổng tím, ra ở cổng xanh cách distance px (khác hẳn cú lướt thường), để lại ảo ảnh chạy tiếp hướng cũ */
    phase_step: {
      aiUse(sys, team, prm) {
        const g = sys.g, me = prm.owner;
        if (g.ball.owner !== me || me.state !== 'normal') return null;
        const o = H.nearestOpp(g, team, me);
        return o && U.dist(o, me) < 80 ? me : null;
      },
      // pip = số lượt còn lại, vẽ trên đầu (Effects.prop 'pips', b = số lượt) — đổi số thì thay vật thể mới
      pips(sys, pl, st) {
        const g = sys.g, E = g.effects;
        if (st.pip) E.propOff(st.pip, 0);
        st.pip = 0;
        if (!(st.left > 0) || !(st.until > g.time)) return;
        st.pip = H.propId(g);
        E.prop(st.pip, 'pips', pl.x, pl.y, pl.id, st.left, st.until - g.time, '#9d7bff');
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, st = sys.st(pl, 'phase_step');
        st.until = g.time + prm.time;
        st.left = prm.blinks;
        pl.glow('#9d7bff', prm.time);
        pl.cd.skill = 0;
        this.pips(sys, pl, st);
        E.prop(H.propId(g), 'gate', pl.x, pl.y, -Math.PI / 2, 1, 0.5, '#9d7bff');
        g.sfx('ult', 'phase.blink');
        // hết giờ / hết lượt: tắt pip, Z về hồi chiêu thường
        sys.task(() => {
          if (g.state === 'play' && st.until > g.time && st.left > 0) return false;
          st.until = 0;
          this.pips(sys, pl, st);
          return true;
        });
        if (human(g, pl)) return;
        // AI: dịch chuyển ngay về phía khung, rồi cứ có người áp sát là dịch chuyển tiếp
        const goal = g.attackGoal(team);
        Act().skill(g, pl, goal.x - pl.x, (goal.y - pl.y) * 0.5 + U.rand(-40, 40));
        sys.task(() => {
          if (g.state !== 'play' || !(st.until > g.time)) return true;
          const o = H.nearestOpp(g, team, pl);
          if (pl.state === 'normal' && pl.cd.skill <= 0 && o && U.dist(o, pl) < 50) {
            const away = U.norm(pl.x - o.x, pl.y - o.y);
            Act().skill(g, pl, away.x + (goal.x - pl.x > 0 ? 0.8 : -0.8), away.y);
          }
          return false;
        });
      },
      onSkillMove(sys, team, prm, pl, d) {
        const g = sys.g, E = g.effects, f = g.field, st = sys.st(pl, 'phase_step');
        if (pl !== prm.owner || !(st.until > g.time) || !(st.left > 0)) return;
        st.left--;
        const a = Math.atan2(d.y, d.x), x0 = pl.x, y0 = pl.y;
        const np = clampIn(f, pl.x + d.x * prm.distance, pl.y + d.y * prm.distance);
        // không lướt trượt như Z thường: bỏ bóng mờ đầu đường lướt, đứng khựng ngay ở cổng ra
        const ai = E.afterimages[E.afterimages.length - 1];
        if (ai && ai.x === x0 && ai.y === y0) E.afterimages.pop();
        pl.trailLeft = 0;
        pl.dashX = d.x * 40; pl.dashY = d.y * 40;
        pl.stateT = Math.min(pl.stateT, 0.06);   // ra khỏi cổng là chạy tiếp ngay -> bấm Z liên tục được
        // 2 cổng: tím (vào) · xanh (ra), đường chấm nối 2 cổng
        E.prop(H.propId(g), 'gate', x0, y0, a, 0, 0.45, '#9d7bff');
        E.prop(H.propId(g), 'gate', np.x, np.y, a, 1, 0.45, '#3ff6ff');
        E.beam(x0, y0 - 10, a, U.dist({ x: x0, y: y0 }, np), 1, '#d8d0e0', 0.2);
        // ảo ảnh chạy tiếp hướng đang chạy trước khi dịch chuyển; AI đối thủ gần đó đuổi theo ảo ảnh
        const sp = Math.hypot(pl.vx, pl.vy), od = sp > 20 ? { x: pl.vx / sp, y: pl.vy / sp } : { x: -d.x, y: -d.y };
        E.clone(pl.id, x0, y0, od.x * 120, od.y * 120, prm.clone);
        const lure = { x: x0, y: y0, alive: true };
        let T = 0;
        sys.task((dt) => {
          T += dt;
          lure.x = U.clamp(lure.x + od.x * 110 * dt, f.x + 6, f.x + f.w - 6); lure.y = U.clamp(lure.y + od.y * 110 * dt, f.y + 6, f.y + f.h - 6);
          if (T >= prm.clone) { lure.alive = false; return true; }
          return false;
        });
        for (const o of g.teams[1 - team].players) if (!o.isControlled && !g.inKeeperZone(o) && U.dist(o, pl) < 120) o.confused = { decoy: lure, t: prm.confuse };
        E.burst(x0, y0 - 10, 6, '#9d7bff', 10, 40, 0.35);
        pl.x = np.x; pl.y = np.y;
        if (pl.hasBall) g.ball.follow(0);
        E.burst(pl.x + d.x * 4, pl.y - 10 + d.y * 4, 6, '#3ff6ff', 12, 90, 0.4);
        E.pop(pl.x, pl.y - 30, 'BLINK!', 'move', '#3ff6ff');
        g.sfx('ult', 'phase.blink');
        // còn lượt: Z dùng lại gần như ngay (gap), hết lượt: hồi chiêu thường
        if (st.left > 0) pl.cd.skill = prm.gap;
        this.pips(sys, pl, st);
      },
    },


    /* 🎼 TIKI-TAKA + 🦵 VÕ SĨ ĐÁ — Mega Boomerang (user chốt 2026-10-17): ném boomerang khổng lồ bay xoắn ốc laps vòng khắp sân rồi quay về tay.
       Trúng AI cũng bị (cả đồng đội, trừ người ném): hất ngã, rơi bóng. Né Z được. Bóng lỏng bị quét trúng thì văng theo */
    mega_boomerang: {
      // vị trí lúc u (0..1): rời tay -> vòng elip quanh tâm sân, bán kính nhỏ dần (spiral) -> về tay người ném (back = vị trí hiện tại).
      // Hình vẽ dùng lại hàm này (render/vfx.js case 'boomer') nên chỉ phụ thuộc dữ liệu máy khách cũng có
      at(g, x0, y0, th0, back, u) {
        const f = g.field, P = SFC_CONFIG.cores.list.mega_boomerang.params;
        const k = 1 - P.spiral * u, th = th0 + u * P.laps * TAU;
        const ex = f.cx + Math.cos(th) * (f.w / 2 - 34) * k, ey = f.cy + Math.sin(th) * (f.h / 2 - 24) * k;
        const w = Math.min(1, u / 0.08, (1 - u) / 0.08), sm = w * w * (3 - 2 * w), from = u < 0.5 ? { x: x0, y: y0 } : back;
        return { x: from.x + (ex - from.x) * sm, y: from.y + (ey - from.y) * sm };
      },
      aiUse(sys, team, prm) {
        const g = sys.g, b = g.ball, me = prm.owner;
        if (me.state !== 'normal') return null;
        return b.owner && b.owner.team !== team && g.teams[1 - team].players.filter((o) => hittable(g, o)).length >= 2 ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, b = g.ball, f = g.field, id = H.propId(g);
        const x0 = pl.x, y0 = pl.y, th0 = Math.atan2((pl.y - f.cy) / (f.h / 2 - 24), (pl.x - f.cx) / (f.w / 2 - 34));
        E.prop(id, 'boomer', x0, y0, pl.id, th0, prm.time, '#ffd23f');
        Act().startAttack(pl, 'light');
        g.sfx('whoosh');
        g.sfx('ult', 'boomer.throw');
        const hitT = new Map();
        let T = 0, k = 0, ballT = 0, last = { x: x0, y: y0 };
        sys.task((dt) => {
          if (g.state !== 'play') return true;
          const u = Math.min(1, (T += dt) / prm.time), c = this.at(g, x0, y0, th0, pl, u);
          const v = { x: (c.x - last.x) / Math.max(dt, 1e-3), y: (c.y - last.y) / Math.max(dt, 1e-3) }, d = U.norm(v.x, v.y + 0.001);
          last = c;
          if (u >= 1) return true;
          // trúng người (trừ người ném, 0.3s đầu khỏi trúng ngay người đứng cạnh)
          for (const q of g.players) {
            if (q === pl || T < 0.15 || !hittable(g, q) || (hitT.get(q.id) || 0) > g.time || U.dist(q, c) > prm.radius + q.radius) continue;
            hitT.set(q.id, g.time + prm.every);
            if (Act().dodged(g, q)) continue;
            const had = q.hasBall && !sys.unstealable(q);
            if (q.state === 'stun') { q.state = 'normal'; q.stateT = 0; }
            if (H.blast(q, c, prm.knock, prm.launch, prm.stun, pl, U.norm(d.x + (q.x - c.x) / 30, d.y + (q.y - c.y) / 30))) {
              if (had && q.team !== team) sys.steal(pl);
              E.pop(q.x, q.y - 30, 'WHACK!', 'light', '#ffd23f');
              E.burst(q.x, q.y, 8, '#ffd23f', 10, 90, 0.4);
              g.sfx('hit');
            }
          }
          // bóng lỏng bị quét trúng: văng theo hướng bay
          if (!b.owner && b.z < 14 && ballT <= g.time && U.dist(b, c) < prm.radius + b.r) {
            ballT = g.time + 0.4;
            b.kick(pl, d.x * 260, d.y * 260, 60);
            E.burst(b.x, b.y, b.z, '#ffd23f', 6, 60, 0.3);
          }
          return false;
        }, () => {
          E.propOff(id, 0.05);
          if (g.state !== 'play') return;
          E.burst(pl.x, pl.y - 10, 6, '#ffd23f', 10, 70, 0.4);
          E.pop(pl.x, pl.y - 30, 'CATCH!', 'good', '#ffd23f');
          g.sfx('ult', 'boomer.catch');
        });
      },
    },



    /* 🎯 SÁT THỦ + 🛡 THÉP — Boulder Rider (id boulder_shot; user chốt 2026-10-17): chỉ dùng khi KHÔNG cầm bóng. Tự gọi tảng đá của mình
       rồi đứng lên giữ thăng bằng: thanh quicktime (kim chạy qua lại, render/vfx.js case 'qte'), bấm sút khi kim trong vùng giữa -> đá to
       GẤP ĐÔI; bấm trượt misses lần -> đá vỡ vụn, ngã choáng. Đủ 3 lần (hết build giây mà đã trúng ít nhất 1: cỡ đang có) -> cưỡi đá lái đi
       time giây, cán bẹp MỌI người chạm phải (cả đồng đội), đá văng bóng lỏng. Lúc đứng / cưỡi đá không bị đánh choáng (armorT, ngắn) */
    boulder_shot: {
      // vị trí kim (0..1) sau T giây kể từ lúc thanh bắt đầu chạy (hình vẽ dùng cùng công thức)
      cursor(T, period) { const ph = (T % period) / period; return ph < 0.5 ? ph * 2 : 2 - ph * 2; },
      // bán kính tảng đá cỡ lv: gấp đôi mỗi cỡ (hình vẽ dùng cùng công thức)
      R(lv) { return SFC_CONFIG.cores.list.boulder_shot.params.r0 * Math.pow(2, lv); },
      aiUse(sys, team, prm) {
        const g = sys.g, b = g.ball, me = prm.owner;
        if (me.state !== 'normal' || me.airZ > 0 || b.owner === me) return null;
        if (b.owner && b.owner.team !== team && U.dist(b.owner, me) < 220) return me;
        return H.targetsNear(g, team, me, 160).length >= 2 ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects;
        H.hold(pl, prm.build + 0.5);
        pl.armorT = g.time + prm.build;
        let lv = 0, miss = 0, T = 0, T0 = 0, lock = 0, pass = -1, rideId = 0, qteId = 0;
        const props = (qte) => {
          if (rideId) E.propOff(rideId, 0); if (qteId) E.propOff(qteId, 0);
          rideId = H.propId(g); qteId = 0;
          E.prop(rideId, 'ride', pl.x, pl.y, pl.id, lv, prm.build + prm.time + 0.5, '#7a6e5f');
          if (qte) { qteId = H.propId(g); E.prop(qteId, 'qte', pl.x, pl.y, pl.id, lv, prm.build + 0.5, '#ffe14f'); }
        };
        props(true);
        E.burst(pl.x, pl.y, 2, '#8a7f70', 14, 90, 0.5);
        g.sfx('ult', 'boulder.summon');
        sys.task((dt) => {
          if (g.state !== 'play') { E.propOff(rideId, 0); E.propOff(qteId, 0); pl.armorT = 0; return true; }
          T += dt; lock -= dt;
          pl.stateT = Math.max(pl.stateT, 0.2);
          const c = this.cursor(T - T0, prm.period), inZone = Math.abs(c - 0.5) < prm.zone / 2;
          let press = false, good = false;
          if (human(g, pl)) { if (pl.intent.shootTap && lock <= 0) { press = true; good = inZone; } pl.intent.shootTap = false; }
          else {
            // AI: mỗi lượt kim đi qua vùng giữa bấm 1 lần, trúng với tỉ lệ aiHit
            const k = Math.floor((T - T0) / (prm.period / 2));
            if (inZone && k !== pass) { pass = k; press = true; good = Math.random() < prm.aiHit; }
          }
          if (press && good) {
            lv++; T0 = T;
            props(lv < 3);
            E.burst(pl.x, pl.y - 6, 2, '#b5a890', 10 + lv * 6, 100, 0.5);
            E.pop(pl.x, pl.y - 30 - this.R(lv) * 2, lv >= 3 ? 'MAX!' : 'BIGGER!', 'move', '#ffe14f');
            E.shake(3 + lv * 2, 0.25);
            g.sfx('ult', 'boulder.grow' + lv);
          } else if (press) {
            miss++; lock = 0.35;
            E.pop(pl.x, pl.y - 30 - this.R(lv) * 2, 'WOBBLE!', 'status', '#9aa3b5');
            E.shake(2, 0.2);
            g.sfx('ult', 'boulder.miss');
          }
          if (miss >= prm.misses || (T >= prm.build && lv === 0)) { E.propOff(qteId, 0); this.crumble(sys, prm, pl, rideId, lv); return true; }
          if (lv >= 3 || T >= prm.build) { E.propOff(qteId, 0); this.ride(sys, team, prm, pl, rideId, lv); return true; }
          return false;
        });
      },
      // đá vỡ vụn (đống đá vụn 'rubble'), người trên đá ngã xuống choáng fall giây
      crumble(sys, prm, pl, rideId, lv) {
        const g = sys.g, E = g.effects, R = this.R(lv);
        E.propOff(rideId, 0);
        E.prop(H.propId(g), 'rubble', pl.x, pl.y, R, 0, 1.6, '#7a6e5f');
        E.burst(pl.x, pl.y - R, 2, '#8a7f70', 18 + lv * 6, 120, 0.8);
        E.decal('crack', pl.x, pl.y, 0.8 + lv * 0.3, 3);
        E.pop(pl.x, pl.y - 30 - R, 'CRUMBLE!', 'status', '#ff8a9a');
        E.shake(5, 0.3);
        g.sfx('hit');
        g.sfx('ult', 'boulder.crumble');
        pl.armorT = 0;
        H.unlock(pl);
        pl.hitImmune = 0;
        pl.hit({ stun: prm.fall, kbx: 0, kby: 0, launch: 90 + R * 2, type: 'hard' });
      },
      // cưỡi đá: lái (người chơi theo phím, AI về người cầm bóng đối thủ / đối thủ gần nhất), cán bẹp mọi người chạm phải
      ride(sys, team, prm, pl, rideId, lv) {
        const g = sys.g, E = g.effects, b = g.ball, f = g.field, R = this.R(lv);
        pl.armorT = g.time + prm.time;
        H.hold(pl, prm.time + 0.2);
        E.pop(pl.x, pl.y - 34 - R * 2, 'ROLL OUT!', 'move', '#ffe14f');
        E.shake(6, 0.3);
        g.sfx('ult', 'boulder.roll');
        let T = 0, k = 0, head = pl.facing, ballT = 0;
        const hitT = new Map();
        sys.task((dt) => {
          if (g.state !== 'play') return true;
          if ((T += dt) >= prm.time) return true;
          pl.stateT = Math.max(pl.stateT, 0.2);
          let want = head;
          if (human(g, pl)) { if (Math.hypot(pl.intent.mx, pl.intent.my) > 0.2) want = Math.atan2(pl.intent.my, pl.intent.mx); }
          else {
            const tg = b.owner && b.owner.team !== team ? b.owner : H.nearestOpp(g, team, pl, (o) => hittable(g, o) && o.state !== 'stun') || g.attackGoal(team);
            want = Math.atan2(tg.y - pl.y, tg.x - pl.x);
          }
          head += U.clamp(U.angleDiff(head, want), -prm.turn * dt, prm.turn * dt);
          const m = Math.min(R, 26), sp = prm.speed;
          let nx = pl.x + Math.cos(head) * sp * dt, ny = pl.y + Math.sin(head) * sp * dt;
          if (nx < f.x + m || nx > f.x + f.w - m) { head = Math.PI - head; E.shake(3, 0.15); g.sfx('wall'); }
          if (ny < f.y + m || ny > f.y + f.h - m) { head = -head; E.shake(3, 0.15); g.sfx('wall'); }
          pl.x = U.clamp(nx, f.x + m, f.x + f.w - m); pl.y = U.clamp(ny, f.y + m, f.y + f.h - m);
          pl.facing = head; pl.vx = Math.cos(head) * sp; pl.vy = Math.sin(head) * sp;
          if ((k += dt) >= 0.07) { k = 0; E.decal('crack', pl.x, pl.y, 0.3 + lv * 0.25, 2); E.burst(pl.x - Math.cos(head) * R, pl.y - Math.sin(head) * R * 0.5, 0, '#8a7f70', 2 + lv, 40, 0.4); }
          for (const q of g.players) {
            if (q === pl || !hittable(g, q) || (hitT.get(q.id) || 0) > g.time || U.dist(q, pl) > R + q.radius) continue;
            hitT.set(q.id, g.time + 1);
            if (Act().dodged(g, q)) continue;
            const side = (q.x - pl.x) * -Math.sin(head) + (q.y - pl.y) * Math.cos(head) >= 0 ? 1 : -1;
            const had = q.hasBall && !sys.unstealable(q);
            if (q.state === 'stun') { q.state = 'normal'; q.stateT = 0; }
            if (H.blast(q, pl, prm.knock, prm.launch, prm.stun, pl, U.norm(Math.cos(head) - Math.sin(head) * side, Math.sin(head) + Math.cos(head) * side))) {
              if (had && q.team !== team) sys.steal(pl);
              E.pop(q.x, q.y - 30, 'SQUASH!', 'heavy', '#c7ccd6');
              E.burst(q.x, q.y, 6, '#ffffff', 10, 100, 0.4);
              E.shake(4, 0.2);
              g.sfx('hit');
            }
          }
          // bóng lỏng trước đá: văng theo hướng lăn
          if (!b.owner && b.z < R && ballT <= g.time && U.dist(b, pl) < R + b.r) {
            ballT = g.time + 0.3;
            const d = U.norm(b.x - pl.x, b.y - pl.y + 0.01);
            b.kick(pl, (d.x + Math.cos(head)) * 160, (d.y + Math.sin(head)) * 160, 80);
          }
          return false;
        }, () => {
          E.propOff(rideId, 0);
          if (g.state !== 'play') { pl.armorT = 0; return; }
          E.prop(H.propId(g), 'rubble', pl.x, pl.y, R, 0, 1.4, '#7a6e5f');
          E.burst(pl.x, pl.y - R, 2, '#8a7f70', 20, 110, 0.7);
          E.pop(pl.x, pl.y - 30, 'POOF!', 'light', '#ffffff');
          pl.armorT = 0;
          pl.vx *= 0.3; pl.vy *= 0.3;
          H.unlock(pl);
        });
      },
    },


    /* 🎲 HỖN LOẠN + 🥊 ĐẤU SĨ — Jack-in-the-Box: đặt hộp lò xo quanh mình; đối thủ tới gần thì găng đấm bật ra hất văng,
       đối thủ đấm / đá vào hộp thì phá được */
    jack_in_box: {
      aiUse(sys, team, prm) {
        const g = sys.g, b = g.ball, me = prm.owner;
        if (me.state !== 'normal') return null;
        // phòng thủ: người cầm bóng đối thủ đang lao về phía mình
        return b.owner && b.owner.team !== team && U.dist(b.owner, me) < 120 && U.dist(b.owner, me) > 40 ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, b = g.ball, f = g.field;
        const tgt = b.owner && b.owner.team !== team ? b.owner : null;
        const fw = tgt ? U.norm(tgt.x - pl.x, tgt.y - pl.y + 0.01) : fv(pl), pp = { x: -fw.y, y: fw.x };
        const boxes = [];
        for (let i = 0; i < prm.boxes; i++) {
          const k = i - (prm.boxes - 1) / 2;
          const at = clampIn(f, pl.x + fw.x * 22 + pp.x * k * prm.spread, pl.y + fw.y * 22 + pp.y * k * prm.spread, 10);
          const bx = { x: at.x, y: at.y, id: H.propId(g), live: true };
          E.prop(bx.id, 'jbox', bx.x, bx.y, 0, 0, prm.life, '#ff3d5a');
          E.burst(bx.x, bx.y, 4, '#ffd23f', 6, 50, 0.4);
          boxes.push(bx);
        }
        g.sfx('ult', 'jack.crank');
        let T = 0;
        sys.task((dt) => {
          if (g.state !== 'play' || (T += dt) >= prm.life) return true;
          if (T < prm.arm) return false;
          for (const bx of boxes) {
            if (!bx.live) continue;
            for (const o of g.teams[1 - team].players) {
              if (!hittable(g, o) || o.state === 'stun') continue;
              const d = U.dist(o, bx);
              if (attacking(g, o) && d < prm.radius + 8) {
                bx.live = false;
                E.propOff(bx.id);
                E.pop(bx.x, bx.y - 22, 'CRASH!', 'light', '#ffffff');
                E.burst(bx.x, bx.y, 4, '#ff3d5a', 12, 90, 0.4);
                g.sfx('wall');
                break;
              }
              if (d > prm.radius + o.radius * 0.5) continue;
              if (Act().dodged(g, o)) continue;
              bx.live = false;
              E.propOff(bx.id, 0.3);
              E.prop(H.propId(g), 'glove', bx.x, bx.y, Math.atan2(o.y - bx.y, o.x - bx.x), 0, 0.35, '#ff3d5a');
              const had = o.hasBall && !sys.unstealable(o);
              H.blast(o, bx, prm.knock, prm.launch, prm.stun, pl);
              if (had) sys.steal(pl);
              E.pop(o.x, o.y - 30, 'BOING!', 'heavy', '#ff3d5a');
              g.hitStop(0.06);
              E.shake(5, 0.25);
              g.sfx('hit');
              g.sfx('ult', 'jack.pop');
              break;
            }
          }
          return !boxes.some((bx) => bx.live);
        }, () => { for (const bx of boxes) if (bx.live) E.propOff(bx.id); });
      },
    },




    /* ================= ĐỢT 2 (2026-10-15, sau khi user thử phòng test) ================= */

    /* 🎯 SÁT THỦ + 🎼 TIKI-TAKA — Comet One-Two: chuyền 1-2, đồng đội hất bóng bổng lên, người dùng bật lên trời móc xe đạp */
    comet_onetwo: {
      aiUse(sys, team, prm) {
        const g = sys.g, me = prm.owner;
        return g.ball.owner === me && me.state === 'normal' && H.nearGoal(g, team, me, 300) ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, b = g.ball, G = SFC_CONFIG.game.ball.gravity;
        const s = H.teamBall(sys, team);
        if (!s) return;
        const m = H.nearestMate(g, team, s);
        const beam = (a, c) => {
          E.beam(a.x, a.y - 4, Math.atan2(c.y - a.y, c.x - a.x), U.dist(a, c), 5, '#ffd23f', 0.6);
          E.burst(c.x, c.y, 10, '#ffd23f', 10, 70, 0.4);
          g.sfx('pass');
          g.sfx('ult', 'comet.one');
        };
        H.hold(s, prm.gap + prm.lob + 0.8);
        // đồng đội (không có thì chính mình) hất bóng bổng tới đúng chỗ người dùng, đỉnh ngang đầu lúc tới nơi
        const pop = (from) => {
          if (g.state !== 'play' || s.state === 'stun') return;
          if (b.owner === from) b.owner = null;
          const H0 = 24, vz = (H0 + (G * prm.lob * prm.lob) / 2) / prm.lob;
          b.kick(from, (s.x - b.x) / prm.lob, (s.y - b.y) / prm.lob, vz);
          for (const q of g.players) b.noPickup.set(q.id, prm.lob + 0.05);
          b.fx.string = true;
          E.pop(from.x, from.y - 30, 'BOING!', 'light', '#ffd23f');
          g.sfx('kick', 0.5);
          g.sfx('ult', 'comet.two');
          // người dùng bật lên trời, lộn ngược (atkType 'bicycle' -> renderer xoay người)
          g.later(Math.max(0, prm.lob - 0.4), () => {
            if (g.state !== 'play' || s.state === 'stun') return;
            s.airVz = prm.jump; s.airZ = Math.max(s.airZ, 0.5);
            s.atkType = 'bicycle'; s.atkT = 0;
            E.burst(s.x, s.y, 0, '#8a7f70', 10, 80);
            g.sfx('ult', 'comet.bike');
          });
          g.later(prm.lob, () => {
            if (g.state !== 'play' || s.state === 'stun' || b.owner) return;
            const goal = g.attackGoal(team), f = g.field;
            const ty = goal.y + U.rand(-1, 1) * (f.goalWidth / 2 - 8), d = U.norm(goal.x - b.x, ty - b.y), spd = fullShot(sys, s) * prm.speed;
            s.facing = Math.atan2(d.y, d.x);
            b.kick(s, d.x * spd, d.y * spd, -30);
            b.kind = 'shot';
            b.gkMod += prm.gk;
            b.fx.scissor = { stun: prm.stun }; b.pierce = prm.pierce;
            b.fx.duo = true;
            g.hitStop(0.1);
            E.impactFrame();
            E.zoom(s.x, s.y - s.airZ, 0.18, 0.35);
            E.pop(s.x, s.y - s.airZ - 30, 'BICYCLE KICK!', 'move', '#ffb13d');
            E.wave(b.x, b.y, 30, '#ffb13d', 0.45, 3);
            E.speedLines(0.4, b.x, b.y - b.z, '#ffffff');
            E.shake(6, 0.35);
            g.sfx('kick', 1);
            g.sfx('ult', 'comet.strike');
          });
        };
        if (!m) { pop(s); return; }
        H.hold(m, prm.gap + 0.1);
        g.later(0.05, () => {
          if (g.state !== 'play' || b.owner !== s) return;
          beam(s, m); b.owner = null; g.gainPossession(m);
          g.later(prm.gap, () => { H.unlock(m); if (b.owner === m) pop(m); });
        });
      },
    },

    /* 🥊 ĐẤU SĨ + 🛡 THÉP — Iron Hammer (user chốt 2026-10-17): chỉ khi KHÔNG cầm bóng. Cầm búa xoay vòng tròn (xoay hướng được,
       vạch đường địa chấn báo trước; bị đấm lúc xoay là huỷ), rồi nện xuống đất: địa chấn chạy thẳng về trước, hất bay cao mọi đối thủ
       + bóng lỏng trên đường. Lướt Z đúng lúc sóng chạy qua là thoát */
    iron_hammer: {
      aiUse(sys, team, prm) {
        const g = sys.g, me = prm.owner;
        if (me.state !== 'normal' || me.airZ > 0 || g.ball.owner === me) return null;
        const o = H.nearestOpp(g, team, me, (q) => hittable(g, q));
        if (!o || U.dist(o, me) > prm.length * 0.7) return null;
        // nhiều đối thủ gần thẳng hàng phía trước, hoặc người cầm bóng đối thủ
        return o.hasBall || H.targetsNear(g, team, me, prm.length * 0.6).length >= 2 ? me : null;
      },
      // hướng nhắm lúc xoay: người chơi theo phím, AI về phía người cầm bóng đối thủ / đối thủ gần nhất
      aim(sys, team, pl) {
        const g = sys.g, b = g.ball;
        const o = b.owner && b.owner.team !== team ? b.owner : H.nearestOpp(g, team, pl, (q) => hittable(g, q));
        return o ? Math.atan2(o.y - pl.y, o.x - pl.x) : pl.facing;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, id = H.propId(g);
        pl.facing = this.aim(sys, team, pl);
        H.hold(pl, prm.spin + 0.35);
        // b = thời gian xoay, c (màu) — búa vẽ ở render/vfx.js (case 'hammer'): xoay turns vòng rồi nện
        E.prop(id, 'hammer', pl.x, pl.y, pl.id, prm.spin, prm.spin + 0.45, '#c7ccd6');
        g.sfx('ult', 'hammer.spin');
        let T = 0, k = 0;
        sys.task((dt) => {   // xoay: người chơi chỉnh hướng nện theo phím, tiếng gió vù vù mỗi vòng
          if (g.state !== 'play' || pl.state === 'stun') return true;
          if ((T += dt) >= prm.spin) return true;
          if (human(g, pl)) { if (Math.hypot(pl.intent.mx, pl.intent.my) > 0.2) pl.turnTo(Math.atan2(pl.intent.my, pl.intent.mx), dt * 1.2); }
          else pl.turnTo(this.aim(sys, team, pl), dt * 0.8);
          if ((k += dt) >= prm.spin / prm.turns) { k = 0; g.sfx('ult', 'hammer.spin'); }
          if (Math.random() < 0.5) E.burst(pl.x + U.rand(-16, 16), pl.y + U.rand(-6, 6), 1, '#d9cbb0', 1, 30, 0.4);
          return false;
        });
        g.later(prm.spin, () => {
          if (g.state !== 'play') return;
          if (pl.state === 'stun') { E.propOff(id); E.pop(pl.x, pl.y - 30, 'MISS', 'info', '#9aa3b5'); return; }
          this.slam(sys, team, prm, pl);
        });
      },
      // nện: địa chấn chạy thẳng từ chỗ búa đập, dài length, rộng width
      slam(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, b = g.ball, f = g.field;
        const a = pl.facing, d = fv(pl), x0 = pl.x + d.x * 22, y0 = pl.y + d.y * 22;
        g.hitStop(0.12);
        E.impactFrame();
        E.zoom(x0, y0, 0.18, 0.35);
        E.decal('crack', x0, y0, 1.8, 5);
        E.wave(x0, y0, 30, '#c7ccd6', 0.5, 3);
        E.burst(x0, y0, 2, '#8a7f70', 22, 140, 0.8);
        E.pop(x0, y0 - 30, 'BONK!!', 'huge', '#ffffff');
        E.shake(10, 0.5);
        g.sfx('hit');
        g.sfx('ult', 'hammer.slam');
        // vết nứt + đá trồi chạy dọc đường (vẽ ở render/vfx.js case 'quake')
        E.prop(H.propId(g), 'quake', x0, y0, a, prm.length, prm.length / prm.speed + 0.9, '#8a7f70');
        const hit = new Set();
        let T = 0, k = 0, ballHit = false;
        sys.task((dt) => {
          if (g.state !== 'play') return true;
          const front = Math.min(prm.length, (T += dt) * prm.speed);
          const fx = x0 + d.x * front, fy = y0 + d.y * front;
          if ((k += dt) >= 0.035) {
            k = 0;
            E.burst(fx, fy, 2, Math.random() < 0.5 ? '#8a7f70' : '#d9cbb0', 5, 80, 0.5);
            E.decal('crack', fx, fy, 0.9, 4, a);
            E.shake(4, 0.1);
          }
          for (const o of g.teams[1 - team].players) {
            if (hit.has(o.id) || !hittable(g, o)) continue;
            // trên dải địa chấn (tính từ chân người nện, kể cả người đứng sát) và sóng đã chạy tới
            const along = (o.x - x0) * d.x + (o.y - y0) * d.y, side = Math.abs((o.x - x0) * -d.y + (o.y - y0) * d.x);
            if (along < -22 - o.radius || along > front || side > prm.width / 2 + o.radius) continue;
            hit.add(o.id);
            if (Act().dodged(g, o)) continue;
            const had = o.hasBall && !sys.unstealable(o);
            if (o.state === 'stun') { o.state = 'normal'; o.stateT = 0; }
            if (H.blast(o, { x: o.x - d.x, y: o.y - d.y }, prm.knock, prm.launch, prm.stun, pl, d)) {
              if (had) sys.steal(pl);
              E.burst(o.x, o.y, 2, '#d9cbb0', 12, 120, 0.6);
              E.pop(o.x, o.y - 30, 'BOOM!', 'heavy', '#ffd23f');
              g.sfx('hit');
            }
          }
          // bóng lỏng thấp trên đường: hất tung lên cao, trôi nhẹ về trước
          if (!ballHit && !b.owner && b.z < 12) {
            const along = (b.x - x0) * d.x + (b.y - y0) * d.y, side = Math.abs((b.x - x0) * -d.y + (b.y - y0) * d.x);
            if (along > -6 && along <= front && side < prm.width / 2 + b.r) {
              ballHit = true;
              b.kick(pl, d.x * prm.ballSpeed, d.y * prm.ballSpeed, prm.ballUp);
              E.burst(b.x, b.y, 2, '#d9cbb0', 10, 100, 0.5);
            }
          }
          return front >= prm.length || fx < f.x || fx > f.x + f.w || fy < f.y || fy > f.y + f.h;
        });
      },
    },

    /* 🏃 TỐC ĐỘ + 🎼 TIKI-TAKA — Thunderstorm: tia sét đánh xuống khắp sân (quanh đối thủ + ngẫu nhiên), vòng cảnh báo trước để né */
    thunderstorm: {
      aiUse(sys, team, prm) {
        const g = sys.g, b = g.ball, me = prm.owner;
        if (me.state !== 'normal') return null;
        return b.owner && b.owner.team !== team ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, f = g.field, b = g.ball;
        const opp = g.teams[1 - team].players.filter((o) => hittable(g, o));
        const spots = [];
        for (let i = 0; i < prm.bolts; i++) {
          const o = opp.length && i < opp.length * 2 ? opp[i % opp.length] : null;
          // đón đầu người đang chạy, lệch ngẫu nhiên; còn lại rải quanh bóng / sân đối thủ
          const base = o ? { x: o.x + o.vx * 0.45, y: o.y + o.vy * 0.45 } : { x: b.x + U.rand(-120, 120), y: b.y + U.rand(-80, 80) };
          spots.push(clampIn(f, base.x + U.rand(-14, 14), base.y + U.rand(-10, 10), 12));
        }
        E.tint('#0a1830', prm.telegraph + prm.gap * prm.bolts + 0.4, 0.3);
        g.sfx('ult', 'storm.warn');
        spots.forEach((sp, i) => {
          g.later(prm.gap * i, () => {
            if (g.state !== 'play') return;
            E.prop(H.propId(g), 'mark', sp.x, sp.y, prm.radius, 0, prm.telegraph + 0.05, '#bdf4ff');
            g.sfx('ult', 'storm.warn');
            g.later(prm.telegraph, () => {
              if (g.state !== 'play') return;
              for (let k = 0; k < 2; k++) E.bolt(sp.x + U.rand(-4, 4), sp.y - 220, sp.x, sp.y - 2, k ? '#7fe7ff' : '#ffffff', 0.4);
              E.burst(sp.x, sp.y, 2, '#bdf4ff', 14, 110, 0.5);
              E.decal('scorch', sp.x, sp.y, 1, 3);
              E.wave(sp.x, sp.y, prm.radius, '#ffffff', 0.3, 2);
              E.shake(3, 0.15);
              g.sfx('ult', 'storm.bolt');
              for (const o of g.teams[1 - team].players) {
                if (!hittable(g, o) || U.dist(o, sp) > prm.radius + o.radius * 0.5 || Act().dodged(g, o)) continue;
                const had = o.hasBall && !sys.unstealable(o), d = U.norm(o.x - sp.x, o.y - sp.y + 0.01);
                o.hitImmune = 0;
                if (o.hit({ stun: prm.stun, kbx: d.x * prm.knock, kby: d.y * prm.knock, source: pl, type: 'slash' })) {
                  if (had) sys.steal(pl);
                  E.pop(o.x, o.y - 30, 'ZZT!', 'light', '#7fe7ff');
                }
              }
            });
          });
        });
      },
    },

    /* 🏃 TỐC ĐỘ + 🎯 SÁT THỦ — Bullet Time (kiểu Quicksilver, user chốt 2026-10-17): cả sân chạy chậm, người cầm bóng chạy siêu tốc
       (lái theo phím, để lại vệt bạc). Đối thủ bị lướt sát qua: lúc thời gian chạy lại xoay mòng mòng rồi ngã (lướt Z kịp thì thoát).
       Kết thúc bằng cú sút: bấm sút / hết giờ / tới cách khung shootAt px. Thủ môn không bị vấp và dễ bắt hơn (gk âm) */
    bullet_time: {
      aiUse(sys, team, prm) {
        const g = sys.g, me = prm.owner, s = H.teamBall(sys, team);
        return s && s.state === 'normal' && me.state === 'normal' && H.nearGoal(g, team, s, 400) ? me : null;
      },
      // AI lái: về khung, lách đối thủ đứng chắn phía trước
      steer(sys, team, s) {
        const g = sys.g, goal = g.attackGoal(team);
        let a = Math.atan2(goal.y - s.y, goal.x - s.x);
        const d = { x: Math.cos(a), y: Math.sin(a) };
        for (const o of g.teams[1 - team].players) {
          const along = (o.x - s.x) * d.x + (o.y - s.y) * d.y, side = (o.x - s.x) * -d.y + (o.y - s.y) * d.x;
          if (along > 0 && along < 70 && Math.abs(side) < 24) a -= Math.sign(side || 1) * 0.9;
        }
        return a;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, b = g.ball, f = g.field;
        const s = H.teamBall(sys, team);
        if (!s) return;
        const goal = g.attackGoal(team), TINT = '#7fa8ff';
        g.slowMo(prm.slow, prm.time + 0.1);
        E.tint(TINT, prm.time + 0.1, 0.22);
        E.speedLines(0.4, 320, 180, '#bfe4ff');
        E.wave(s.x, s.y, 50, '#bfe4ff', 0.5, 2);
        g.sfx('ult', 'bullet.slow');
        H.hold(s, prm.time + 1);
        s.intent.shootTap = false;
        let T = 0, k = 0, head = s.facing, done = false;
        const marked = new Set();
        // kết thúc: thời gian chạy lại, người bị lướt qua ngã, sút nếu còn bóng
        const finish = () => {
          if (done) return;
          done = true;
          g.slowT = 0;
          if (E.O && E.O.tints) for (const tn of E.O.tints) if (tn.color === TINT) tn.t = Math.min(tn.t, 0.15);
          if (g.state !== 'play') return;
          for (const o of g.teams[1 - team].players) {
            if (!marked.has(o.id) || !hittable(g, o) || Act().dodged(g, o)) continue;
            o.facing += Math.PI;
            Stat.slip(sys, o, prm.trip, s, 70);
          }
          H.unlock(s);
          if (b.owner !== s || s.state === 'stun') return;
          const ay = human(g, s) && Math.abs(s.intent.my) > 0.2 ? Math.sign(s.intent.my) : U.rand(-1, 1);
          const dd = U.norm(goal.x - s.x, goal.y + ay * (f.goalWidth / 2 - 8) - s.y);
          const spd = fullShot(sys, s) * prm.power;
          s.facing = Math.atan2(dd.y, dd.x);
          b.kick(s, dd.x * spd, dd.y * spd, 30);
          b.kind = 'shot';
          b.gkMod += prm.gk;
          b.fx.spiral = true;
          Act().startAttack(s, 'shoot');
          E.wave(s.x, s.y, 46, '#bfe4ff', 0.4, 3);
          E.impactFrame();
          E.shake(6, 0.3);
          g.sfx('kick', 1);
          g.sfx('ult', 'bullet.boom');
        };
        sys.task((dt) => {
          if (done) return true;
          if (g.state !== 'play') { finish(); return true; }
          const rdt = g.slowT > 0 ? dt / g.slowScale : dt;   // thời gian thật (cả sân đang chạy chậm)
          T += rdt;
          if (s.state === 'stun' || b.owner !== s) { finish(); return true; }
          // lái: người chơi theo phím, AI về khung lách người
          let want = head;
          if (human(g, s)) { if (Math.hypot(s.intent.mx, s.intent.my) > 0.2) want = Math.atan2(s.intent.my, s.intent.mx); }
          else want = this.steer(sys, team, s);
          head += U.clamp(U.angleDiff(head, want), -10 * rdt, 10 * rdt);
          const r = s.radius + 2;
          s.x = U.clamp(s.x + Math.cos(head) * prm.speed * rdt, f.x + r, f.x + f.w - r);
          s.y = U.clamp(s.y + Math.sin(head) * prm.speed * rdt, f.y + r, f.y + f.h - r);
          s.facing = head; s.vx = Math.cos(head) * prm.speed; s.vy = Math.sin(head) * prm.speed;
          s.anim += rdt * 1.6;
          s.stateT = Math.max(s.stateT, 0.2);
          b.follow(0);
          // vệt bạc
          if ((k += rdt) >= 0.03) { k = 0; E.afterimage(s, 0.05); E.burst(s.x, s.y, 4, Math.random() < 0.5 ? '#bfe4ff' : '#ffffff', 1, 20, 0.08); }
          // lướt sát qua đối thủ: đánh dấu (thủ môn trong vòng cấm thì không)
          for (const o of g.teams[1 - team].players) {
            if (marked.has(o.id) || !hittable(g, o) || g.inKeeperZone(o) || U.dist(o, s) > prm.touch + o.radius) continue;
            marked.add(o.id);
            E.burst(o.x, o.y - 10, 6, '#bfe4ff', 6, 40, 0.1);
            E.ring(o.x, o.y, '#bfe4ff');
            g.sfx('whoosh');
          }
          // sút: bấm sút / hết giờ / chạy tới cách khung shootAt px (không cho lao tới sát khung)
          const shoot = (human(g, s) && s.intent.shootTap) || Math.abs(goal.x - s.x) < prm.shootAt || T >= prm.time;
          s.intent.shootTap = false;
          if (shoot) { finish(); return true; }
          return false;
        }, finish);
      },
    },

    /* 🏃 TỐC ĐỘ + 🥊 ĐẤU SĨ — Rocket Punch: gồng (vạch ngang sân; bị đấm lúc gồng là huỷ), nắm đấm phóng đi như tên lửa:
       đối thủ đầu tiên trúng văng vào tường, bóng lỏng trên đường bị thổi bay */
    rocket_punch: {
      aiUse(sys, team, prm) {
        const g = sys.g, b = g.ball, me = prm.owner;
        if (me.state !== 'normal' || me.airZ > 0) return null;
        const o = b.owner && b.owner.team !== team ? b.owner : null;
        return o && U.dist(o, me) < 260 && U.dist(o, me) > 30 ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, b = g.ball, f = g.field;
        const tgt = b.owner && b.owner.team !== team ? b.owner : H.nearestOpp(g, team, pl, (o) => hittable(g, o));
        const d = H.aimDir(g, team, pl, tgt);
        pl.facing = Math.atan2(d.y, d.x);
        H.hold(pl, prm.windup + 0.25);
        const len = 720;
        E.beam(pl.x + d.x * 8, pl.y - 6 + d.y * 8, pl.facing, len, 2, '#ff7a3d', prm.windup + 0.1);
        pl.glow('#ff7a3d', prm.windup + 0.2);
        E.burst(pl.x + d.x * 8, pl.y - 6, 6, '#ff7a3d', 8, 50, prm.windup);   // tên lửa đang nạp: khói ở tay
        g.sfx('ult', 'rocket.ignite');
        g.later(prm.windup, () => {
          if (g.state !== 'play') return;
          if (pl.state === 'stun') { E.pop(pl.x, pl.y - 30, 'MISS', 'info', '#9aa3b5'); return; }
          const x0 = pl.x + d.x * 10, y0 = pl.y + d.y * 10, maxT = len / prm.speed;
          E.projectile('rocket', x0, y0, d.x * prm.speed, d.y * prm.speed, maxT, '#ffd8b0');
          E.burst(x0, y0, 6, '#ff7a3d', 16, 120, 0.5);
          E.burst(x0, y0, 6, '#6a6470', 10, 60, 0.8);
          E.shake(5, 0.25);
          g.sfx('ult', 'rocket.launch');
          let T = 0, done = false, ballHit = false, k = 0;
          sys.task((dt) => {
            if (g.state !== 'play' || (T += dt) >= maxT) return true;
            const x = x0 + d.x * prm.speed * T, y = y0 + d.y * prm.speed * T;
            if (x < f.x || x > f.x + f.w || y < f.y || y > f.y + f.h) { E.burst(x, y, 6, '#ff7a3d', 12, 100, 0.5); return true; }
            if ((k += dt) >= 0.03) { k = 0; E.burst(x - d.x * 10, y - d.y * 10, 6, Math.random() < 0.5 ? '#ff7a3d' : '#9aa3b5', 2, 30, 0.4); }
            if (!done) {
              for (const o of g.teams[1 - team].players) {
                if (!hittable(g, o) || o.state === 'stun' || U.dist(o, { x, y }) > prm.width + o.radius) continue;
                if (Act().dodged(g, o)) continue;
                done = true;
                const had = o.hasBall && !sys.unstealable(o);
                H.blast(o, { x: x - d.x * 10, y: y - d.y * 10 }, prm.knock, prm.launch, prm.stun, pl, d);
                if (had) sys.steal(pl);
                g.hitStop(0.1);
                E.impactFrame();
                E.zoom(o.x, o.y, 0.15, 0.3);
                E.pop(o.x, o.y - 30, 'KAPOW!', 'heavy', '#ff7a3d');
                E.burst(o.x, o.y, 8, '#ffd23f', 18, 150, 0.5);
                E.shake(8, 0.35);
                g.sfx('hit');
                g.sfx('ult', 'rocket.boom');
                H.wallCrack(sys, o);
                break;
              }
            }
            if (!ballHit && !b.owner && b.z < 24 && U.dist(b, { x, y }) < prm.width + b.r) {
              ballHit = true;
              b.kick(pl, d.x * prm.ballSpeed, d.y * prm.ballSpeed, 60);
              E.burst(b.x, b.y, b.z, '#ffd8b0', 8, 90, 0.4);
            }
            return false;
          });
        });
      },
    },

    /* 🏃 TỐC ĐỘ + 🛡 THÉP — Monster Truck: gọi xe tải quái vật, lái (đi thẳng, rẽ theo phím), cán bẹp ai chạm phải. Bị đánh trúng là xe nổ */
    monster_truck: {
      aiUse(sys, team, prm) {
        const g = sys.g, b = g.ball, me = prm.owner;
        if (me.state !== 'normal' || me.airZ > 0) return null;
        if (b.owner && b.owner.team !== team && U.dist(b.owner, me) < 170) return me;
        return H.targetsNear(g, team, me, 110).length >= 2 ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, b = g.ball, f = g.field, id = H.propId(g);
        E.prop(id, 'truck', pl.x, pl.y, pl.id, 0, prm.time + 0.1, '#ff3d5a');
        E.burst(pl.x, pl.y, 4, '#6a6470', 14, 90, 0.6);
        g.sfx('ult', 'truck.horn');
        g.sfx('ult', 'truck.engine');
        let T = 0, k = 0, head = pl.facing;
        const hitT = new Map();
        sys.task((dt) => {
          if (g.state !== 'play') return true;
          if (pl.state === 'stun') { E.pop(pl.x, pl.y - 30, 'CRASH!', 'heavy', '#ff3d5a'); g.sfx('ult', 'truck.crash'); return true; }
          if ((T += dt) >= prm.time) return true;
          H.hold(pl, 0.1);
          // lái: người chơi theo phím, AI về phía người cầm bóng đối thủ / đối thủ gần nhất / khung thành
          let want = head;
          if (human(g, pl)) { if (Math.hypot(pl.intent.mx, pl.intent.my) > 0.2) want = Math.atan2(pl.intent.my, pl.intent.mx); }
          else {
            const t = b.owner && b.owner.team !== team ? b.owner : H.nearestOpp(g, team, pl, (o) => hittable(g, o) && o.state !== 'stun') || g.attackGoal(team);
            want = Math.atan2(t.y - pl.y, t.x - pl.x);
          }
          head += U.clamp(U.angleDiff(head, want), -prm.turn * dt, prm.turn * dt);
          let nx = pl.x + Math.cos(head) * prm.speed * dt, ny = pl.y + Math.sin(head) * prm.speed * dt;
          const r = prm.radius;
          if (nx < f.x + r || nx > f.x + f.w - r) { head = Math.PI - head; E.shake(3, 0.15); g.sfx('wall'); }
          if (ny < f.y + r || ny > f.y + f.h - r) { head = -head; E.shake(3, 0.15); g.sfx('wall'); }
          pl.x = U.clamp(nx, f.x + r, f.x + f.w - r); pl.y = U.clamp(ny, f.y + r, f.y + f.h - r);
          pl.facing = head; pl.vx = Math.cos(head) * prm.speed; pl.vy = Math.sin(head) * prm.speed;
          if (b.owner === pl) b.follow(0);
          else if (!b.owner && b.z < 10 && U.dist(b, pl) < r + 4) g.gainPossession(pl);   // bóng lỏng trước đầu xe: xúc theo
          if ((k += dt) >= 0.06) { k = 0; E.decal('skid', pl.x, pl.y, 0.9, 2, head); E.burst(pl.x - Math.cos(head) * 12, pl.y - Math.sin(head) * 12, 4, '#6a6470', 2, 30, 0.5); }
          for (const o of g.teams[1 - team].players) {
            if (!hittable(g, o) || (hitT.get(o.id) || 0) > g.time || U.dist(o, pl) > r + o.radius) continue;
            hitT.set(o.id, g.time + 1);
            if (Act().dodged(g, o)) continue;
            const side = (o.x - pl.x) * -Math.sin(head) + (o.y - pl.y) * Math.cos(head) >= 0 ? 1 : -1;
            const had = o.hasBall && !sys.unstealable(o);
            if (H.blast(o, pl, prm.knock, prm.launch, prm.stun, pl, U.norm(Math.cos(head) - Math.sin(head) * side, Math.sin(head) + Math.cos(head) * side))) {
              if (had) sys.steal(pl);
              E.pop(o.x, o.y - 30, 'SQUASH!', 'heavy', '#ff3d5a');
              E.burst(o.x, o.y, 8, '#ffffff', 12, 110, 0.4);
              E.shake(5, 0.2);
              g.sfx('hit');
            }
          }
          return false;
        }, () => {
          E.propOff(id, 0.2);
          E.burst(pl.x, pl.y, 4, '#6a6470', 18, 110, 0.7);
          E.pop(pl.x, pl.y - 30, 'POOF!', 'light', '#ffffff');
          H.unlock(pl);
          pl.vx *= 0.3; pl.vy *= 0.3;
        });
      },
    },

    /* 🌀 ẢO ẢNH + 🎯 SÁT THỦ — Smoke Bomb (kiểu Akali, user chốt 2026-10-17): bom khói rộng tồn tại time giây. Người đội mình đứng trong khói
       tàng hình với đối thủ (p.ghostT; đội mình thấy bóng mờ, người đang điều khiển có viền màn hình HIDDEN — render/renderer.js).
       Chuyền / sút thì lộ reveal giây, bị đánh trúng thì lộ tới khi đứng dậy, còn trong khói thì lại ẩn. Bóng ở chân người tàng hình cũng ẩn:
       AI đối thủ chỉ đoán mò chỗ trong khói. Đỡ: đấm mò vào khói, chặn đường ra khỏi khói, chờ người trong khói chuyền / sút */
    smoke_bomb: {
      aiUse(sys, team, prm) {
        const g = sys.g, me = prm.owner, s = H.teamBall(sys, team);
        if (me.state !== 'normal' || !s || U.dist(s, me) > prm.radius * 0.5) return null;
        const o = H.nearestOpp(g, team, s);
        return (o && U.dist(o, s) < 60) || H.nearGoal(g, team, s, 240) ? me : null;
      },
      // trong vùng khói hình elip (bán kính radius, chiều dọc x squash — khớp hình vẽ)
      inside(prm, c, q) { const dx = q.x - c.x, dy = (q.y - c.y) / prm.squash; return dx * dx + dy * dy < prm.radius * prm.radius; },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, f = g.field, b = g.ball;
        const c = clampIn(f, pl.x, pl.y, 24), id = H.propId(g);
        E.prop(id, 'smoke', c.x, c.y, prm.radius, prm.squash, prm.time, '#4f4466');
        E.burst(c.x, c.y, 6, '#8a7f9a', 30, 170, 0.8);
        E.wave(c.x, c.y, prm.radius, '#b9a6d9', 0.4, 2);
        E.shake(4, 0.2);
        g.sfx('ult', 'smoke.pop');
        const seen = new Map(), had = new Map();   // giây còn lộ hình · bước trước có cầm bóng không
        const lure = { x: c.x, y: c.y, alive: true };   // chỗ AI đối thủ đoán người cầm bóng đang đứng
        let T = 0, wob = 9;
        sys.task((dt) => {
          if (g.state !== 'play' || (T += dt) >= prm.time) return true;
          for (const q of g.teams[team].players) {
            let rv = seen.get(q.id) || 0;
            const has = b.owner === q;
            if (had.get(q.id) && !b.owner && b.lastTouch === q) rv = prm.reveal;   // vừa chuyền / sút
            if (q.state === 'stun') rv = Math.max(rv, 0.1);                       // bị đánh trúng
            had.set(q.id, has);
            rv = Math.max(0, rv - dt);
            seen.set(q.id, rv);
            if (rv <= 0 && this.inside(prm, c, q)) {
              if (!(q.ghostT > 0)) E.burst(q.x, q.y - 8, 6, '#6a5f7c', 8, 40, 0.4);
              q.ghostT = Math.max(q.ghostT, 0.12);
            } else if (q.ghostT > 0 && rv > 0) { q.ghostT = 0; E.burst(q.x, q.y - 8, 6, '#b9a6d9', 8, 60, 0.3); }
          }
          // AI đối thủ không thấy người cầm bóng: đuổi theo chỗ đoán trong khói (đổi chỗ mỗi 0.5s)
          const o = b.owner;
          if (o && o.team === team && o.ghostT > 0) {
            if ((wob += dt) > 0.5) {
              wob = 0;
              const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * prm.radius * 0.8;
              lure.x = c.x + Math.cos(a) * r; lure.y = c.y + Math.sin(a) * r * prm.squash;
            }
            for (const e of g.teams[1 - team].players) if (!e.isControlled && !g.inKeeperZone(e)) e.confused = { decoy: lure, t: 0.2 };
          }
          return false;
        }, () => { lure.alive = false; E.propOff(id, 0.4); });
      },
    },

    /* 🎼 TIKI-TAKA + 🌀 ẢO ẢNH — Puppet Master (user chọn 2026-10-17, làm rõ pha nối dây cùng ngày): 3 pha nhìn thấy được
       1. BẮN DÂY (fly giây): sợi chỉ bay từ tay bạn tới tối đa targets đối thủ gần nhất — lướt Z lúc chỉ tới là né
       2. NỐI DÂY (link giây): chỉ căng, vòng tiến trình quanh chân đối thủ đầy dần, họ bị kéo chậm lại; bạn đứng yên giữ dây.
          Đứt khi: đối thủ lướt Z / chạy xa quá linkDist px, hoặc bạn bị đánh choáng
       3. CON RỐI (time giây): họ chạy theo đúng hướng bạn chạy, không ra đòn / chuyền / sút được. Đứt khi bạn bị choáng / đi quá maxDist */
    puppet_master: {
      targets(sys, team, prm, pl) {
        const g = sys.g;
        return g.teams[1 - team].players.filter((o) => hittable(g, o) && o.state !== 'stun' && !g.inKeeperZone(o) && U.dist(o, pl) < prm.range)
          .sort((a, c) => (c.hasBall ? 1 : 0) - (a.hasBall ? 1 : 0) || U.dist(a, pl) - U.dist(c, pl)).slice(0, prm.targets);
      },
      aiUse(sys, team, prm) {
        const g = sys.g, me = prm.owner;
        if (me.state !== 'normal') return null;
        const list = this.targets(sys, team, prm, me);
        return list.some((o) => o.hasBall) || list.length >= 2 ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects;
        const list = this.targets(sys, team, prm, pl);
        if (!list.length) return;
        H.hold(pl, prm.fly + prm.link + 0.05);
        pl.glow('#e8ecf5', prm.fly + prm.link);
        // 1. bắn dây: chỉ xám bay tới (render/vfx.js case 'string': màu #9aa3b5 = đang bay, vẽ dài dần theo fly)
        const ts = list.map((o) => { const id = H.propId(g); E.prop(id, 'string', o.x, o.y, pl.id, o.id, prm.fly + 0.02, '#9aa3b5'); return { o, id, cut: false }; });
        g.sfx('ult', 'puppet.shoot');
        const cut = (c, snap) => {
          if (c.cut) return;
          c.cut = true;
          if (c.o.puppet === pl) { c.o.puppet = null; c.o.puppetT = 0; c.o.noActT = Math.max(0, c.o.chickenT || 0); }
          E.propOff(c.id, 0.1);
          if (c.ring) E.propOff(c.ring, 0.1);
          if (snap) { E.pop(c.o.x, c.o.y - 30, 'SNAP!', 'light', '#e8ecf5'); E.burst(c.o.x, c.o.y - 20, 6, '#ffffff', 6, 50, 0.3); g.sfx('ult', 'puppet.snap'); }
        };
        g.later(prm.fly, () => {
          if (g.state !== 'play') return;
          if (pl.state === 'stun') { for (const c of ts) cut(c, false); return; }
          // 2. nối dây: chỉ căng (#c7ccd6) + vòng tiến trình (prop 'link'), đối thủ bị kéo chậm
          for (const c of ts) {
            const o = c.o;
            E.propOff(c.id, 0);
            if (!hittable(g, o) || o.state === 'stun' || Act().dodged(g, o)) { c.cut = true; E.pop(o.x, o.y - 30, 'MISS', 'info', '#9aa3b5'); continue; }
            c.id = H.propId(g); c.ring = H.propId(g);
            E.prop(c.id, 'string', o.x, o.y, pl.id, o.id, prm.link + 0.05, '#c7ccd6');
            E.prop(c.ring, 'link', o.x, o.y, o.id, prm.link, prm.link + 0.05, '#ffffff');
            o.buffs.push({ speed: prm.drag, t: prm.link });
            E.burst(o.x, o.y - 20, 6, '#ffffff', 6, 40, 0.3);
            g.sfx('ult', 'puppet.link');
          }
          let T = 0;
          sys.task((dt) => {
            if (g.state !== 'play') { for (const c of ts) cut(c, false); return true; }
            T += dt;
            for (const c of ts) {
              if (c.cut) continue;
              if (pl.state === 'stun' || c.o.state === 'dash' || c.o.tackleImmune > 0 || U.dist(pl, c.o) > prm.linkDist) cut(c, true);
            }
            if (T < prm.link) return ts.every((c) => c.cut);
            // 3. con rối
            const live = ts.filter((c) => !c.cut);
            H.unlock(pl);
            if (!live.length) return true;
            pl.glow('#e8ecf5', prm.time);
            for (const c of live) {
              const o = c.o;
              o.puppet = pl; o.puppetT = prm.time; o.noActT = Math.max(o.noActT, prm.time);
              o.charging = false; o.cancelPass();
              o.buffs = o.buffs.filter((bf) => bf.speed !== prm.drag);
              E.propOff(c.id, 0); E.propOff(c.ring, 0); c.ring = 0;
              c.id = H.propId(g);
              E.prop(c.id, 'string', o.x, o.y, pl.id, o.id, prm.time, '#ffffff');
              E.pop(o.x, o.y - 30, 'GOTCHA!', 'light', '#e8ecf5');
            }
            g.sfx('ult', 'puppet.gotcha');
            let T2 = 0;
            sys.task((dt2) => {
              if (g.state !== 'play' || (T2 += dt2) >= prm.time) return true;
              for (const c of live) if (!c.cut && (pl.state === 'stun' || c.o.puppet !== pl || U.dist(pl, c.o) > prm.maxDist)) cut(c, true);
              return live.every((c) => c.cut);
            }, () => { for (const c of live) cut(c, false); });
            return true;
          });
        });
      },
    },

    /* 🎯 SÁT THỦ + 🥊 ĐẤU SĨ — Rage (user chốt 2026-10-17): hoá King Kong, gầm rồi nhảy dậm tại chỗ stomps lần; mỗi lần tiếp đất là một vòng
       địa chấn lan ra (vẽ rõ, render/vfx.js case 'qring'). AI cũng bị (cả đồng đội): hất tung. Né: lướt Z đúng lúc vòng lan tới */
    rage: {
      SQ: 0.6,   // vòng địa chấn hình elip (dọc x SQ) — khớp hình vẽ
      aiUse(sys, team, prm) {
        const g = sys.g, me = prm.owner;
        if (me.state !== 'normal' || me.airZ > 0) return null;
        const inR = (q) => q !== me && hittable(g, q) && U.dist(q, me) < prm.radius * 0.6;
        const opp = g.teams[1 - team].players.filter(inR).length, mates = g.teams[team].players.filter(inR).length;
        return opp >= 2 && opp > mates ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, id = H.propId(g);
        const total = prm.roar + prm.gap * prm.stomps + 0.25;
        // ape: b = thời gian gầm (hình vẽ tự tính nhịp nhảy từ config)
        E.prop(id, 'ape', pl.x, pl.y, pl.id, prm.roar, total, '#3a2a22');
        H.hold(pl, total);
        E.burst(pl.x, pl.y - 20, 10, '#3a2a22', 24, 120, 0.6);
        E.shake(6, prm.roar);
        g.sfx('ult', 'rage.roar');
        for (let i = 0; i < prm.stomps; i++) {
          g.later(prm.roar + prm.gap * (i + 1), () => {
            if (g.state !== 'play' || pl.state === 'stun') return;
            this.ring(sys, team, prm, pl, pl.x, pl.y);
          });
        }
        sys.task(() => {
          if (g.state !== 'play') return true;
          if (pl.state === 'stun') { E.propOff(id); E.pop(pl.x, pl.y - 30, 'OOF!', 'status', '#9aa3b5'); return true; }
          return false;
        });
        g.later(total, () => { if (pl.state === 'recover') H.unlock(pl); });
      },
      // một vòng địa chấn: bán kính tăng speed px/s tới radius; ai đứng đúng chỗ vành đi qua (dày width) thì bay
      ring(sys, team, prm, pl, x, y) {
        const g = sys.g, E = g.effects, b = g.ball, SQ = this.SQ;
        E.prop(H.propId(g), 'qring', x, y, prm.radius, prm.speed, prm.radius / prm.speed + 0.35, '#ff9a3d');
        E.decal('crater', x, y, 1.4, 4);
        E.burst(x, y, 2, '#8a7f70', 20, 150, 0.7);
        E.pop(x, y - 44, 'STOMP!', 'heavy', '#ff3d5a');
        E.shake(10, 0.4);
        g.hitStop(0.05);
        g.sfx('hit');
        g.sfx('ult', 'rage.stomp');
        const hit = new Set();
        let T = 0, ballHit = false;
        const ed = (q) => Math.hypot(q.x - x, (q.y - y) / SQ);   // khoảng cách theo elip
        sys.task((dt) => {
          if (g.state !== 'play') return true;
          const r = (T += dt) * prm.speed;
          if (r > prm.radius + prm.width) return true;
          for (const q of g.players) {
            if (q === pl || hit.has(q.id) || q.airZ > 4 || q.state === 'meteor' || g.isProtected(q)) continue;
            if (Math.abs(ed(q) - r) > prm.width / 2 + q.radius) continue;
            hit.add(q.id);
            if (Act().dodged(g, q)) continue;
            const had = q.hasBall && !sys.unstealable(q);
            if (q.state === 'stun') { q.state = 'normal'; q.stateT = 0; }
            if (H.blast(q, { x, y }, prm.knock, prm.launch, prm.stun, pl)) {
              if (had && q.team !== team) sys.steal(pl);
              E.burst(q.x, q.y, 2, '#d9cbb0', 10, 100, 0.5);
            }
          }
          if (!ballHit && !b.owner && b.z < 10 && Math.abs(ed(b) - r) < prm.width / 2 + b.r) {
            ballHit = true;
            const d = U.norm(b.x - x, b.y - y + 0.01);
            b.kick(pl, b.vx * 0.5 + d.x * 80, b.vy * 0.5 + d.y * 80, 260);
          }
          return false;
        });
      },
    },

    /* 🛡 THÉP + 🎼 TIKI-TAKA — Iron Chain: xích thép nối người dùng với từng đồng đội trọn thời gian (giãn theo người, không đứt):
       đối thủ chạy vào xích bị vấp ngã; đường chuyền của đội không bị cắt (CoreSystem.passGuarded) */
    iron_chain: {
      aiUse(sys, team, prm) {
        const g = sys.g, b = g.ball, me = prm.owner;
        return me.state === 'normal' && b.owner && g.teams[team].players.length > 1 ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, st = sys.st(team, 'iron_chain');
        const chains = g.teams[team].players.filter((m) => m !== pl).map((m) => ({ m, id: H.propId(g) }));
        if (!chains.length) return;
        st.t = g.time + prm.time;
        for (const c of chains) E.prop(c.id, 'chain', pl.x, pl.y, pl.id, c.m.id, prm.time, '#c7ccd6');
        g.sfx('ult', 'chain.rattle');
        for (const p of [pl].concat(chains.map((c) => c.m))) { p.glow('#c7ccd6', prm.time); E.shield(p.x, p.y - 8, 12, '#c7ccd6', 0.4); }
        const hitT = new Map();
        let T = 0;
        sys.task((dt) => {
          if (g.state !== 'play' || (T += dt) >= prm.time) return true;
          for (const c of chains) {
            for (const o of g.teams[1 - team].players) {
              if (!hittable(g, o) || o.state === 'stun' || o.state === 'dash' || (hitT.get(o.id) || 0) > g.time) continue;
              if (U.segDist(o.x, o.y, pl.x, pl.y, c.m.x, c.m.y) > prm.width + o.radius * 0.5) continue;
              hitT.set(o.id, g.time + 0.8);
              const d = U.norm(c.m.x - pl.x, c.m.y - pl.y + 0.001), side = (o.x - pl.x) * -d.y + (o.y - pl.y) * d.x >= 0 ? 1 : -1;
              o.hitImmune = 0;
              if (o.hit({ stun: prm.stun, kbx: -d.y * side * prm.knock, kby: d.x * side * prm.knock, source: pl, type: 'hard' })) {
                E.pop(o.x, o.y - 30, 'TRIP!', 'status', '#c7ccd6');
                E.burst(o.x, o.y, 6, '#ffffff', 8, 70, 0.4);
                g.sfx('hit');
                g.sfx('ult', 'chain.trip');
              }
            }
          }
          return false;
        }, () => { st.t = 0; for (const c of chains) E.propOff(c.id); });
      },
    },

    /* 🥊 ĐẤU SĨ + 🌀 ẢO ẢNH — Ghost Hands: vũng bóng tím lớn đặt đón đầu chỗ đối thủ sắp chạy tới (báo trước), bàn tay ma túm chân.
       Bước ra khỏi vũng / lướt Z là thoát */
    ghost_hands: {
      aiUse(sys, team, prm) {
        const g = sys.g, me = prm.owner;
        if (me.state !== 'normal') return null;
        const near = H.targetsNear(g, team, me, prm.range);
        return near.length >= 2 || (near[0] && near[0].hasBall) ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, f = g.field;
        const list = H.targetsNear(g, team, pl, prm.range).slice(0, prm.targets);
        if (!list.length) return;
        g.sfx('ult', 'ghost.rise');
        const spots = list.map((o) => {
          const at = clampIn(f, o.x + o.vx * prm.telegraph * 0.8, o.y + o.vy * prm.telegraph * 0.8, 10);
          const s = { o, x: at.x, y: at.y, id: H.propId(g) };
          E.prop(s.id, 'puddle', s.x, s.y, prm.radius, 0, prm.telegraph + 0.2, '#5b3fb0');
          return s;
        });
        g.later(prm.telegraph, () => {
          if (g.state !== 'play') return;
          const held = [];
          for (const s of spots) {
            const o = s.o;
            if (!hittable(g, o) || U.dist(o, s) > prm.radius + o.radius * 0.5 || Act().dodged(g, o)) { E.pop(s.x, s.y - 30, 'MISS', 'info', '#9aa3b5'); continue; }
            const had = o.hasBall && !sys.unstealable(o);
            o.hitImmune = 0;
            if (o.state === 'stun') { o.state = 'normal'; o.stateT = 0; }
            if (!o.hit({ stun: prm.hold, kbx: 0, kby: 0, source: pl, type: 'hard' })) continue;
            if (had) sys.steal(pl);
            E.prop(H.propId(g), 'hand', o.x, o.y, o.id, 0, prm.hold, '#9d7bff');
            E.pop(o.x, o.y - 30, 'GRAB!', 'heavy', '#9d7bff');
            E.burst(o.x, o.y, 0, '#5b3fb0', 10, 60, 0.5);
            held.push({ o, x: o.x, y: o.y });
          }
          if (!held.length) return;
          g.hitStop(0.06);
          g.sfx('hit');
          g.sfx('ult', 'ghost.grab');
          let T = 0;
          sys.task((dt) => {
            if (g.state !== 'play' || (T += dt) >= prm.hold) return true;
            for (const h of held) if (h.o.state === 'stun') { h.o.x = h.x; h.o.y = h.y; h.o.kbx = h.o.kby = 0; }
            return false;
          });
        });
      },
    },

    /* 🦵 VÕ SĨ ĐÁ + 🌀 ẢO ẢNH — Portal Kicks: đứng yên đá vào cổng; cổng mở cạnh từng đối thủ (báo trước), chân vươn dài khỏi cổng
       (tới reach px, đuổi theo chỗ đối thủ đang đứng) đá văng. Chạy xa khỏi cổng / lướt Z là trượt; bị đấm giữa chừng thì huỷ các cú còn lại */
    portal_kicks: {
      aiUse(sys, team, prm) {
        const g = sys.g, me = prm.owner;
        if (me.state !== 'normal') return null;
        const near = H.targetsNear(g, team, me, prm.range);
        return near.length >= 2 || (near[0] && near[0].hasBall) ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, f = g.field;
        const list = H.targetsNear(g, team, pl, prm.range).slice(0, prm.targets);
        if (!list.length) return;
        H.hold(pl, prm.telegraph + prm.gap * list.length + 0.3);
        list.forEach((o, i) => {
          g.later(prm.gap * i, () => {
            if (g.state !== 'play' || pl.state === 'stun') return;
            const away = U.norm(o.x - pl.x, o.y - pl.y + 0.01);
            const pt = clampIn(f, o.x - away.x * 22, o.y - away.y * 22, 6), id = H.propId(g);
            E.prop(id, 'portal', pt.x, pt.y, 0, 0, prm.telegraph + 0.35, '#c63dff');
            g.sfx('ult', 'portal.open');
            g.later(prm.telegraph, () => {
              if (g.state !== 'play') return;
              if (pl.state === 'stun') { E.propOff(id); return; }
              const dd = U.dist(o, pt), a = Math.atan2(o.y - pt.y, o.x - pt.x);
              E.prop(H.propId(g), 'foot', pt.x, pt.y, a, Math.min(prm.reach, Math.max(16, dd)), 0.32, '#9d7bff');
              Act().startAttack(pl, 'shoot');
              if (hittable(g, o) && dd < prm.reach && !Act().dodged(g, o)) {
                const had = o.hasBall && !sys.unstealable(o);
                o.hitImmune = 0;
                if (o.state === 'stun') { o.state = 'normal'; o.stateT = 0; }
                H.blast(o, pt, prm.knock, prm.launch, prm.stun, pl);
                if (had) sys.steal(pl);
                E.pop(o.x, o.y - 30, 'BAM!', 'heavy', '#c63dff');
                E.burst(o.x, o.y, 8, '#c63dff', 12, 100, 0.4);
                g.hitStop(0.06);
                E.shake(5, 0.2);
                g.sfx('hit');
                g.sfx('ult', 'portal.kick');
              } else E.pop(pt.x, pt.y - 30, 'MISS', 'info', '#9aa3b5');
            });
          });
        });
      },
    },

    /* 🦵 VÕ SĨ ĐÁ + 🛡 THÉP — Earth Spike: 3 lần dùng (bấm X lại trong window giây): vết nứt chạy thẳng ra trước (báo trước) ->
       hàng cột đá trồi lên hất tung người đứng trên; cột đứng lại như tường thật, chặn người + bóng của cả hai đội */
    earth_spike: {
      aiUse(sys, team, prm) {
        const g = sys.g, b = g.ball, me = prm.owner;
        if (me.state !== 'normal' || me.airZ > 0) return null;
        const o = b.owner && b.owner.team !== team ? b.owner : null;
        return o && U.dist(o, me) < prm.start + prm.step * prm.pillars ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, st = sys.st(pl, 'earth_spike');
        st.left = prm.charges - 1; st.until = g.time + prm.window;
        this.cast(sys, team, prm, pl);
        if (human(g, pl)) return;
        // AI: tự dùng nốt các lượt khi có đối thủ trong tầm
        sys.task(() => {
          if (g.state !== 'play' || !(st.left > 0) || st.until <= g.time) return true;
          if (Math.random() < 0.03 && this.aiUse(sys, team, prm) === pl) this.recast(sys, team, prm, pl);
          return false;
        });
      },
      // bấm X lại: còn lượt + hết lần trước -> ra tiếp (CoreSystem.activateUltimate gọi trước khi xét năng lượng)
      recast(sys, team, prm, pl) {
        const g = sys.g, st = sys.st(pl, 'earth_spike');
        if (!(st.left > 0) || st.until <= g.time || pl.state !== 'normal' || pl.airZ > 0 || (st.busy || 0) > g.time) return false;
        st.left--;
        this.cast(sys, team, prm, pl);
        return true;
      },
      cast(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, b = g.ball, f = g.field, st = sys.st(pl, 'earth_spike');
        st.busy = g.time + prm.telegraph + 0.2;
        const tgt = b.owner && b.owner.team !== team ? b.owner : H.nearestOpp(g, team, pl, (o) => hittable(g, o));
        const d = H.aimDir(g, team, pl, tgt), pp = { x: -d.y, y: d.x };
        pl.facing = Math.atan2(d.y, d.x);
        const pts = [];
        for (let i = 0; i < prm.pillars; i++) {
          const q = clampIn(f, pl.x + d.x * (prm.start + prm.step * i), pl.y + d.y * (prm.start + prm.step * i), 10);
          if (!pts.some((p) => Math.hypot(p.x - q.x, p.y - q.y) < 6)) pts.push({ x: q.x, y: q.y, r: prm.radius });
        }
        H.hold(pl, prm.telegraph + 0.15);
        Act().startAttack(pl, 'shoot');
        const last = pts[pts.length - 1];
        E.beam(pts[0].x, pts[0].y, pl.facing, Math.hypot(last.x - pts[0].x, last.y - pts[0].y) + 4, 2, '#8a7f70', prm.telegraph + 0.1);
        pts.forEach((p, i) => g.later((prm.telegraph * i) / pts.length, () => { if (g.state === 'play') E.decal('crack', p.x, p.y, 0.8, prm.telegraph + prm.life); }));
        const left = String(st.left) + 'x';   // còn mấy lượt (bấm X lại) — số, không cần dịch
        if (st.left > 0) E.pop(pl.x + 30, pl.y - 48, left, 'res', '#ffffff');
        g.sfx('wall');
        g.later(prm.telegraph, () => {
          if (g.state !== 'play') return;
          const ids = pts.map((p) => { const id = H.propId(g); E.prop(id, 'pillar', p.x, p.y, 0, 0, prm.life, '#8a7f70'); return id; });
          g.hitStop(0.06);
          E.shake(7, 0.35);
          E.burst(pl.x + d.x * 40, pl.y + d.y * 40, 2, '#8a7f70', 20, 120, 0.7);
          g.sfx('hit');
          g.sfx('ult', 'spike.erupt');
          for (const o of g.teams[1 - team].players) {
            if (!hittable(g, o)) continue;
            const p = pts.find((q) => U.dist(o, q) < q.r + o.radius + 3);
            if (!p || Act().dodged(g, o)) continue;
            const side = (o.x - p.x) * pp.x + (o.y - p.y) * pp.y >= 0 ? 1 : -1;
            const had = o.hasBall && !sys.unstealable(o);
            o.hitImmune = 0;
            if (o.state === 'stun') { o.state = 'normal'; o.stateT = 0; }
            H.blast(o, p, prm.knock, prm.launch, prm.stun, pl, { x: pp.x * side, y: pp.y * side });
            if (had) sys.steal(pl);
            E.pop(o.x, o.y - 30, 'CRACK!', 'heavy', '#b46bff');
          }
          solids(sys, pts, prm.life, () => { for (const id of ids) E.propOff(id, 0.3); });
        });
      },
    },

    /* 🌀 ẢO ẢNH + 🛡 THÉP — Medusa Gaze: mắt rắn loé (hình nón báo trước), đối thủ trong nón hoá đá. Chạy ra khỏi nón / lướt Z là thoát */
    medusa_gaze: {
      inCone(g, pl, o, d, prm) {
        const dx = o.x - pl.x, dy = o.y - pl.y, dist = Math.hypot(dx, dy) || 1;
        return dist <= prm.range + o.radius && (dx * d.x + dy * d.y) / dist >= Math.cos((prm.cone * Math.PI) / 180);
      },
      aiUse(sys, team, prm) {
        const g = sys.g, b = g.ball, me = prm.owner;
        if (me.state !== 'normal') return null;
        const o = b.owner && b.owner.team !== team ? b.owner : null;
        return o && U.dist(o, me) < prm.range * 0.8 ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, b = g.ball;
        const tgt = b.owner && b.owner.team !== team ? b.owner : H.nearestOpp(g, team, pl, (o) => hittable(g, o));
        const d = H.aimDir(g, team, pl, tgt);
        pl.facing = Math.atan2(d.y, d.x);
        H.hold(pl, prm.telegraph + 0.25);
        E.prop(H.propId(g), 'gaze', pl.x, pl.y, pl.facing, prm.range, prm.telegraph + 0.2, '#6bff4f');
        pl.glow('#6bff4f', prm.telegraph + 0.2);
        g.sfx('ult', 'medusa.hiss');
        g.later(prm.telegraph, () => {
          if (g.state !== 'play' || pl.state === 'stun') return;
          E.flash(0.3);
          E.tint('#2f9a3a', 0.4, 0.2);
          let n = 0;
          for (const o of g.teams[1 - team].players) {
            if (!hittable(g, o) || !this.inCone(g, pl, o, d, prm) || Act().dodged(g, o)) continue;
            const had = o.hasBall && !sys.unstealable(o);
            if (Stat.stone(sys, o, prm.time, pl)) { n++; if (had) sys.steal(pl); E.pop(o.x, o.y - 30, 'STONE!', 'status', '#c7ccd6'); }
          }
          if (n) { g.hitStop(0.08); E.shake(5, 0.3); g.sfx('ult', 'medusa.stone'); }
        });
      },
    },

    /* 🎲 HỖN LOẠN + 🏃 TỐC ĐỘ — VHS Rewind: băng tua ngược thật: cả sân đứng yên, mọi người trừ người dùng chạy lùi theo đúng đường cũ
       về chỗ đứng back giây trước (diễn anim giây, nhiễu băng + tiếng tua). Bóng ở chân ai đi theo người đó, bóng lỏng đứng yên */
    vhs_rewind: {
      update(sys, team, prm, dt) {
        const g = sys.g, st = sys.st(prm.owner, 'vhs_rewind');
        if (g.state !== 'play' || g.stopT > 0) return;
        if ((st.acc = (st.acc || 0) + dt) < prm.every) return;
        st.acc = 0;
        const hist = st.hist || (st.hist = []);
        hist.push({ t: g.time, p: g.players.map((q) => [q.id, q.x, q.y, q.facing]) });
        while (hist.length && hist[0].t < g.time - prm.back - 0.6) hist.shift();
      },
      onKickoff(sys, team, prm) { sys.st(prm.owner, 'vhs_rewind').hist = []; },
      aiUse(sys, team, prm) {
        const g = sys.g, b = g.ball, me = prm.owner, st = sys.st(me, 'vhs_rewind');
        if (me.state !== 'normal' || !st.hist || !st.hist.length || st.hist[0].t > g.time - prm.back + 0.2) return null;
        return b.owner && b.owner.team !== team && U.dist(b.owner, g.ownGoal(team)) < 170 ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, b = g.ball, st = sys.st(pl, 'vhs_rewind');
        E.vhs(prm.telegraph + prm.anim + 0.3);
        g.sfx('ult', 'vhs.stop');
        g.sfx('rewind');
        g.later(prm.telegraph, () => {
          if (g.state !== 'play') return;
          const want = g.time - prm.back, hist = (st.hist || []).filter((h) => h.t >= want);
          if (!hist.length) return;
          // đường lùi của từng người: từ chỗ đang đứng -> các mẫu đã ghi, mới tới cũ
          const tracks = new Map();
          for (const q of g.players) {
            if (q === pl || q.state === 'meteor') continue;
            const tr = [[q.x, q.y, q.facing]];
            for (let i = hist.length - 1; i >= 0; i--) { const r = hist[i].p.find((x) => x[0] === q.id); if (r) tr.push([r[1], r[2], r[3]]); }
            tracks.set(q, tr);
            q.vx = q.vy = q.kbx = q.kby = 0; q.airZ = 0; q.airVz = 0; q.charging = false; q.charge = 0;
          }
          g.stopT = prm.anim + 0.05;
          E.tint('#3a1060', prm.anim, 0.3);
          let T = 0, k = 0;
          g.stopTick = (dt) => {
            T += dt;
            const u = Math.min(1, T / prm.anim), e = u * u * (3 - 2 * u);
            for (const [q, tr] of tracks) {
              const fpos = e * (tr.length - 1), i = Math.min(tr.length - 2, Math.floor(fpos)), w = fpos - Math.max(0, i);
              const A = tr[Math.max(0, i)], C = tr[Math.min(tr.length - 1, Math.max(0, i) + 1)];
              q.x = A[0] + (C[0] - A[0]) * w; q.y = A[1] + (C[1] - A[1]) * w; q.facing = C[2] + Math.PI;   // nhìn ngược: đang chạy lùi
              if (b.owner === q) b.follow(0);
            }
            if ((k += dt) >= 0.07) { k = 0; for (const q of tracks.keys()) E.afterimage(q, 0.3); }
            if (u < 1) return false;
            for (const [q, tr] of tracks) {
              q.facing = tr[tr.length - 1][2];
              if (q.state === 'dash' || q.state === 'kick' || q.state === 'jab' || q.state === 'windup') { q.state = 'normal'; q.stateT = 0; }
              E.burst(q.x, q.y, 6, '#c63dff', 8, 60, 0.4);
            }
            g.stopT = 0;
            E.shake(4, 0.25);
            g.sfx('whoosh');
            return true;
          };
        });
      },
    },

    /* 🎲 HỖN LOẠN + 🎼 TIKI-TAKA — Magic Wall Pass (user chốt 2026-10-17): đá bóng vào tường, hiện điểm hẹn (ưu tiên gần khung, trong tầm chạy
       tới kịp); bàn tay ma thuật thò ra từ tường ném bóng qua lại (bóng bay cao, không ai chạm được) rồi thả đúng điểm hẹn lúc hết giờ.
       Người đứng gần điểm hẹn nhất trong catch px nhận bóng (người ra chiêu ưu tiên) — đối thủ đứng chờ sẵn cũng tranh được */
    magic_wall_pass: {
      // điểm hẹn: trước khung near px, ngang khung; quá xa so với tầm chạy trong T giây thì kéo về phía người ra chiêu
      spot(sys, team, prm, s, T) {
        const g = sys.g, f = g.field, goal = g.attackGoal(team), dir = g.teams[team].dir;
        let M = { x: goal.x - dir * prm.near, y: U.clamp(s.y, goal.y - 40, goal.y + 40) };
        const reach = SFC_CONFIG.game.player.speed * SFC_CONFIG.game.player.sprintMult * s.stats.speed * T * prm.reach, d = U.dist(s, M);
        if (d > reach) M = { x: s.x + (M.x - s.x) * (reach / d), y: s.y + (M.y - s.y) * (reach / d) };
        return clampIn(f, M.x, M.y, 20);
      },
      aiUse(sys, team, prm) {
        const g = sys.g, me = prm.owner;
        if (g.ball.owner !== me || me.state !== 'normal' || H.nearGoal(g, team, me, prm.near + 40)) return null;
        const o = H.nearestOpp(g, team, me);
        return o && U.dist(o, me) < 70 ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, b = g.ball, f = g.field;
        const s = H.teamBall(sys, team);
        if (!s) return;
        const total = prm.kickT + prm.throws * prm.seg, M = this.spot(sys, team, prm, s, total);
        // điểm tay bắt bóng trên tường trên / dưới, so le, tiến dần về phía điểm hẹn
        const top = f.y + 2, bot = f.y + f.h - 2, first = s.y < f.cy ? top : bot;
        const wps = [];
        for (let i = 0; i < prm.throws; i++) wps.push({ x: U.lerp(s.x, M.x, 0.2 + 0.7 * (i / prm.throws)), y: i % 2 ? (first === top ? bot : top) : first });
        const pts = [{ x: b.x, y: b.y }].concat(wps, [M]);
        const times = pts.map((_, i) => (i === 0 ? 0 : prm.kickT + (i - 1) * prm.seg));
        E.prop(H.propId(g), 'target', M.x, M.y, total, 0, total + 0.3, '#ffe14f');
        wps.forEach((w, i) => g.later(Math.max(0, times[i + 1] - 0.25), () => {
          if (g.state === 'play') E.prop(H.propId(g), 'mhand', w.x, w.y, w.y < f.cy ? Math.PI / 2 : -Math.PI / 2, 0.25, 0.6, '#ffffff');
        }));
        s.facing = Math.atan2(wps[0].y - s.y, wps[0].x - s.x);
        Act().startAttack(s, 'shoot');
        b.kick(s, 0, 0, 0);
        g.sfx('kick', 0.7);
        let T = 0, seg = 0;
        sys.task((dt) => {
          if (g.state !== 'play') return true;
          if (b.owner) return true;   // (không xảy ra: mọi người bị noPickup) — an toàn
          T += dt;
          for (const q of g.players) b.noPickup.set(q.id, 0.1);
          while (seg < pts.length - 2 && T >= times[seg + 1]) {
            seg++;
            E.burst(pts[seg].x, pts[seg].y, 8, '#ffffff', 8, 60, 0.3);
            g.sfx('ult', 'wall.hand' + Math.min(2, seg - 1));   // mỗi bàn tay một nốt chuông cao dần
          }
          const a = pts[seg], c = pts[seg + 1], k = U.clamp((T - times[seg]) / (times[seg + 1] - times[seg]), 0, 1);
          const prev = { x: b.x, y: b.y };
          b.x = U.lerp(a.x, c.x, k); b.y = U.lerp(a.y, c.y, k);
          b.z = Math.sin(k * Math.PI) * (seg === 0 ? 12 : 34) + (seg === pts.length - 2 ? 0 : 2);
          b.vx = (b.x - prev.x) / Math.max(dt, 1e-3); b.vy = (b.y - prev.y) / Math.max(dt, 1e-3); b.vz = 0;
          if (T < total) return false;
          // tới điểm hẹn: người ra chiêu đứng trong catch px -> nhận; không thì người gần nhất trong catch px; không ai -> bóng lỏng
          b.x = M.x; b.y = M.y; b.z = 0; b.vx = b.vy = 0;
          for (const q of g.players) b.noPickup.delete(q.id);
          const ok = (q) => q.state !== 'stun' && q.airZ <= 4 && q.state !== 'meteor' && !(q.chickenT > 0) && U.dist(q, M) < prm.catch + q.radius;
          let rcv = ok(s) ? s : null;
          if (!rcv) { let bd = Infinity; for (const q of g.players) if (ok(q) && U.dist(q, M) < bd) { bd = U.dist(q, M); rcv = q; } }
          E.burst(M.x, M.y, 4, '#ffe14f', 14, 90, 0.4);
          g.sfx('ult', 'wall.arrive');
          if (rcv) { g.gainPossession(rcv); E.pop(rcv.x, rcv.y - 30, rcv.team === team ? 'CATCH!' : 'STOLEN!', 'good', rcv.team === team ? '#ffe14f' : '#ff3d5a'); g.sfx('pick'); }
          return true;
        }, () => { for (const q of g.players) b.noPickup.delete(q.id); });
      },
    },

    /* 🎲 HỖN LOẠN + 🎯 SÁT THỦ — Chicken Ray (user chốt 2026-10-17): tia biến hình (vạch báo trước, né Z được) xuyên mọi đối thủ trên đường:
       hoá gà (Stat.chicken) — rơi bóng, không chạm được bóng, không ra đòn / chuyền / sút / lướt. Nhắm người cầm bóng / người gần nhất */
    chicken_ray: {
      aiUse(sys, team, prm) {
        const g = sys.g, b = g.ball, me = prm.owner;
        if (me.state !== 'normal') return null;
        return b.owner && b.owner.team !== team && U.dist(b.owner, me) < 260 ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, b = g.ball;
        const tgt = b.owner && b.owner.team !== team ? b.owner : H.nearestOpp(g, team, pl, (o) => hittable(g, o) && !g.inKeeperZone(o)) || null;
        const d = H.aimDir(g, team, pl, tgt), len = 700, a = Math.atan2(d.y, d.x);
        pl.facing = a;
        H.hold(pl, prm.telegraph + 0.15);
        E.beam(pl.x + d.x * 8, pl.y - 8, a, len, 2, '#ffe14f', prm.telegraph + 0.1);
        g.sfx('ult', 'chicken.ray');
        g.later(prm.telegraph, () => {
          if (g.state !== 'play' || pl.state === 'stun') return;
          const x0 = pl.x, y0 = pl.y, x1 = x0 + d.x * len, y1 = y0 + d.y * len;
          E.beam(x0 + d.x * 8, y0 - 8, a, len, prm.width, '#ffe14f', 0.4);
          E.flash(0.2);
          g.sfx('zap');
          for (const o of g.teams[1 - team].players) {
            if (!hittable(g, o) || U.segDist(o.x, o.y, x0, y0, x1, y1) > prm.width / 2 + o.radius || Act().dodged(g, o)) continue;
            Stat.chicken(sys, o, prm.time, prm.speed, pl);
          }
        });
      },
    },
    /* 🎲 HỖN LOẠN + 🌀 ẢO ẢNH — Panic Ball (user chốt 2026-10-17): bóng hoá quái vật đuổi theo đối thủ; trúng ai thì người đó HOẢNG SỢ
       (Stat.panic: mọi hướng di chuyển đảo ngược, rơi bóng). Né Z được. Hết người / hết giờ thì bóng bay về chân bạn */
    panic_ball: {
      pick(sys, team, from, hit) {
        const g = sys.g;
        let best = null, bd = Infinity;
        for (const o of g.teams[1 - team].players) {
          if (hit.has(o.id) || !hittable(g, o) || o.state === 'stun' || g.inKeeperZone(o)) continue;
          if (U.dist(o, from) < bd) { bd = U.dist(o, from); best = o; }
        }
        return best;
      },
      aiUse(sys, team, prm) {
        const g = sys.g, me = prm.owner;
        if (g.ball.owner !== me || me.state !== 'normal') return null;
        const o = this.pick(sys, team, me, new Set());
        return o && U.dist(o, me) < 90 ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, b = g.ball, f = g.field;
        const s = H.teamBall(sys, team);
        if (!s) return;
        const hit = new Set();
        let tgt = this.pick(sys, team, s, hit), T = 0, back = !tgt, head = s.facing;
        E.burst(b.x, b.y, 6, '#7fe7ff', 12, 80, 0.4);
        Act().startAttack(s, 'shoot');
        b.kick(s, Math.cos(head) * prm.speed, Math.sin(head) * prm.speed, 20);
        b.skin = 'monster';
        g.sfx('ult', 'panic.spook');
        sys.task((dt) => {
          if (g.state !== 'play' || b.owner) return true;
          T += dt;
          for (const q of g.players) b.noPickup.set(q.id, 0.1);
          b.skin = 'monster';
          if (!back && (!tgt || !hittable(g, tgt) || T >= prm.time || hit.size >= prm.targets)) back = true;
          const goTo = back ? s : tgt, want = Math.atan2(goTo.y - b.y, goTo.x - b.x);
          head += U.clamp(U.angleDiff(head, want), -prm.turn * dt, prm.turn * dt);
          const sp = back ? prm.back : prm.speed;
          b.vx = Math.cos(head) * sp; b.vy = Math.sin(head) * sp;
          b.z = 6 + Math.sin(T * 12) * 3; b.vz = 0;
          // không bay vào khung (bóng chỉ dí người)
          b.x = U.clamp(b.x, f.x + 8, f.x + f.w - 8);
          if (back) {
            if (U.dist(b, s) < s.radius + b.r + 4 || T > prm.time + 3) {
              b.skin = null;
              for (const q of g.players) b.noPickup.delete(q.id);
              if (U.dist(b, s) < s.radius + b.r + 4 && s.state !== 'stun' && s.airZ <= 4) g.gainPossession(s);
              else { b.vx *= 0.3; b.vy *= 0.3; }
              return true;
            }
            return false;
          }
          if (U.dist(b, tgt) < tgt.radius + b.r + 3) {
            hit.add(tgt.id);
            if (!Act().dodged(g, tgt)) {
              Stat.panic(sys, tgt, prm.panic, pl);
              E.pop(tgt.x, tgt.y - 44, 'BOO!', 'status', '#ffffff');
              E.burst(b.x, b.y, b.z, '#7fe7ff', 10, 80, 0.4);
              g.hitStop(0.05);
              g.sfx('hit');
              g.sfx('ult', 'panic.boo');
            }
            tgt = this.pick(sys, team, b, hit);
          }
          return false;
        }, () => { if (b.skin === 'monster') b.skin = null; });
      },
    },

    /* 🎲 HỖN LOẠN + 🛡 THÉP — Mega Magnet: nam châm khổng lồ hạ xuống giữa đám đối thủ (báo trước), hút mọi đối thủ trong vòng về tâm
       (chạy nước rút ra ngoài / lướt Z thoát được); ai dính vào tâm thì choáng */
    mega_magnet: {
      aiUse(sys, team, prm) {
        const g = sys.g, me = prm.owner;
        if (me.state !== 'normal') return null;
        const opp = g.teams[1 - team].players.filter((o) => hittable(g, o));
        return opp.length >= 2 && opp.some((o, i) => opp.some((q, j) => j > i && U.dist(o, q) < 120)) ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, b = g.ball, f = g.field;
        const opp = g.teams[1 - team].players.filter((o) => hittable(g, o));
        if (!opp.length) return;
        // tâm: trung bình vị trí đối thủ, kéo về người cầm bóng (nếu có)
        let cx = 0, cy = 0, w = 0;
        for (const o of opp) { const k = o.hasBall ? 2 : 1; cx += o.x * k; cy += o.y * k; w += k; }
        const c = clampIn(f, cx / w, cy / w, 24), id = H.propId(g);
        E.prop(id, 'bigmagnet', c.x, c.y, prm.telegraph, 0, prm.telegraph + prm.time + 0.3, '#ff3d5a');
        E.wave(c.x, c.y, prm.radius, '#ff3d5a', prm.telegraph, 1);
        g.sfx('ult', 'magnet.drop');
        g.later(prm.telegraph, () => {
          if (g.state !== 'play') { E.propOff(id); return; }
          E.shake(4, 0.3);
          g.sfx('clang');
          g.sfx('ult', 'magnet.hum');
          let T = 0, k = 0;
          sys.task((dt) => {
            if (g.state !== 'play') return true;
            T += dt;
            for (const o of g.teams[1 - team].players) {
              if (!hittable(g, o) || o.state === 'dash') continue;
              const dx = c.x - o.x, dy = c.y - o.y, d = Math.hypot(dx, dy);
              if (d > prm.radius || d < 4) continue;
              const step = Math.min(d - 3, prm.pull * dt);
              o.x += (dx / d) * step; o.y += (dy / d) * step;
            }
            if ((k += dt) >= 0.08) { k = 0; for (let i = 0; i < 3; i++) { const a = Math.random() * Math.PI * 2, r = prm.radius * (0.4 + Math.random() * 0.6); E.burst(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r * 0.5, 4, i % 2 ? '#ff3d5a' : '#4b69ff', 1, 20, 0.3); } }
            return T >= prm.time;
          }, () => {
            E.propOff(id, 0.3);
            if (g.state !== 'play') return;
            let n = 0;
            for (const o of g.teams[1 - team].players) {
              if (!hittable(g, o) || U.dist(o, c) > 26) continue;
              const had = o.hasBall && !sys.unstealable(o), d = U.norm(o.x - c.x, o.y - c.y + 0.01);
              o.hitImmune = 0;
              if (o.state === 'stun') { o.state = 'normal'; o.stateT = 0; }
              if (o.hit({ stun: prm.stun, kbx: d.x * 120, kby: d.y * 120, source: pl, type: 'hard' })) { n++; if (had) sys.steal(pl); }
            }
            E.pop(c.x, c.y - 30, n ? 'CLANG!' : 'MISS', n ? 'heavy' : 'info', n ? '#ff3d5a' : '#9aa3b5');
            if (n) { g.hitStop(0.08); E.impactFrame(); E.shake(7, 0.35); g.sfx('hit'); }
          });
        });
      },
    },
  });
})();
