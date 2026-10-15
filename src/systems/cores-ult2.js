/* Tuyệt kỹ thiết kế lại (docs/ULT_REDESIGN.md, user duyệt 2026-10-15): mỗi chiêu một cơ chế riêng, gắn vào SFC.CoreBehaviors.
 * Hook giống cores.js: aiUse(sys, team, prm) -> người ra chiêu | null · onUltimate(sys, team, prm, pl) (sau cut-in) · update / onHit / onSkillMove...
 * Luật giữ nguyên: needsBall không bao giờ giật bóng · mọi đòn có báo trước + né được bằng Z (Actions.dodged) · bất khả xâm phạm ngắn.
 * Vật thể trên sân (tường sét, cột đá, gương, hộp lò xo, đe, xích, bàn tay ma, cổng, lốc xoáy) = Effects.prop (chỉ để nhìn, đồng bộ
 * online qua lệnh hiệu ứng); va chạm tính ở đây trong sys.task (chỉ máy chạy mô phỏng) -> không đổi định dạng snapshot.
 * Trạng thái trận mới: Game.stopT + stopTick (Time Stop Strike, VHS Rewind) · st(đội, 'iron_chain').t (passGuarded).
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
   * trơn té: ngã sõng soài + trượt · hoá đá: đứng chết trân màu đá · thôi miên: đi lang thang, ai chạm là tỉnh · teo nhỏ: bé + chậm */
  const Stat = {
    // trơn té: ngã, trượt theo d (mặc định hướng đang chạy) slide px/s, choáng t giây
    slip(sys, o, t, src, slide = 200, d = null) {
      const g = sys.g, E = g.effects, sp = Math.hypot(o.vx, o.vy);
      d = d || (sp > 10 ? { x: o.vx / sp, y: o.vy / sp } : { x: U.rand(-1, 1), y: U.rand(-1, 1) });
      d = U.norm(d.x, d.y + 0.001);
      o.hitImmune = 0;
      if (o.state === 'stun') { o.state = 'normal'; o.stateT = 0; }
      if (!o.hit({ stun: t, kbx: d.x * slide, kby: d.y * slide, source: src, type: 'hard' })) return false;
      E.decal('skid', o.x, o.y, 0.9, 2.5, Math.atan2(d.y, d.x));
      E.burst(o.x, o.y, 2, '#ffe14f', 6, 60, 0.4);
      E.text(o.x, o.y - 26, 'SLIP!', '#ffe14f');
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
      E.comic(o.x, o.y - 26, 'TINY!', '#ff7ab8', 0.9, 0.5);
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
        if (why) E.comic(o.x, o.y - 28, 'HUH?', '#ff7ab8', 0.9, 0.5);
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
        const g = sys.g, E = g.effects;
        pl.buffs.push({ speed: prm.speed, t: prm.time });
        pl.glow('#3ff6ff', prm.time);
        pl.stamina = SFC_CONFIG.game.player.staminaMax;
        E.callout('LIGHT CYCLE!', '#3ff6ff', 0.9);
        E.speedLines(0.4, pl.x, pl.y, '#bdf4ff');
        E.burst(pl.x, pl.y, 4, '#bdf4ff', 16, 120, 0.5);
        g.sfx('zap');
        const segs = [], hitT = new Map();
        let T = 0, k = 0, last = { x: pl.x, y: pl.y };
        sys.task((dt) => {
          if (g.state !== 'play') return true;
          T += dt;
          const live = T < prm.time && pl.state !== 'stun';
          if (live) {
            pl.stamina = Math.max(pl.stamina, 40);   // chạy nước rút thoải mái suốt chiêu
            if ((k += dt) >= prm.every && U.dist(pl, last) >= 3) {
              k = 0;
              const s = { x0: last.x, y0: last.y, x1: pl.x, y1: pl.y, t: prm.life, id: H.propId(g) };
              segs.push(s);
              E.prop(s.id, 'trail', s.x0, s.y0, s.x1, s.y1, prm.life, '#3ff6ff');
              last = { x: pl.x, y: pl.y };
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
                E.comic(o.x, o.y - 30, 'ZZT!', '#7fe7ff', 0.9, 0.5);
                g.sfx('zap');
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
        E.comic(pl.x, pl.y - 34, 'MOON STOMP!', '#a8e6ff', 1.1, 0.7);
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
          E.tint('#0a1830', prm.float, 0.22);
          g.sfx('hit');
          const fl = [];
          for (const o of g.players) {
            if (o === pl || U.dist(o, c) > R + o.radius || o.state === 'meteor' || g.isProtected(o)) continue;
            if (o.team !== team && Act().dodged(g, o)) continue;
            o.hitImmune = 0;
            if (o.state === 'stun') { o.state = 'normal'; o.stateT = 0; }
            o.hit({ stun: 0.35, kbx: 0, kby: 0, source: pl, type: 'hard' });   // đang cầm bóng thì rơi bóng
            o.kbx *= 0.2; o.kby *= 0.2;
            o.floatPh = Math.random() * TAU;
            fl.push(o);
          }
          const b = g.ball;
          let ball = !b.owner && U.dist(b, c) <= R + 6;
          const gone = new Set();
          let T = 0;
          sys.task((dt) => {
            if (g.state !== 'play') return true;
            T += dt;
            const k = Math.min(1, T / 0.5);
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
                E.comic(o.x, o.y - 40, 'HOME RUN!', '#a8e6ff', 1.2, 0.7);
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
                  E.comic(b.x, b.y - b.z - 16, 'VOLLEY!', '#a8e6ff', 1.2, 0.6);
                  E.impactFrame();
                  g.sfx('kick', 1);
                }
              }
            }
            return T >= prm.float;
          }, () => {
            for (const o of fl) if (!gone.has(o) && o.airZ > 0) o.airVz = -60;   // hết trọng lực: rơi xuống
            if (ball && !b.owner) b.vz = -40;
            E.propOff(zid, 0.3);
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
        E.comic(pl.x, pl.y - 40, 'HURRICANE KICK!', '#b46bff', 1.1, 0.7);
        g.sfx('whoosh');
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
            E.comic(o.x, o.y - 30, 'WHOOSH!', '#b46bff', 1, 0.5);
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

    /* 🏃 TỐC ĐỘ + 🌀 ẢO ẢNH — Phase Step: trong time giây, lướt Z dịch chuyển xa hơn, hồi nhanh, để lại ảo ảnh chạy tiếp hướng cũ */
    phase_step: {
      aiUse(sys, team, prm) {
        const g = sys.g, me = prm.owner;
        if (g.ball.owner !== me || me.state !== 'normal') return null;
        const o = H.nearestOpp(g, team, me);
        return o && U.dist(o, me) < 80 ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, st = sys.st(pl, 'phase_step');
        st.until = g.time + prm.time;
        pl.glow('#9d7bff', prm.time);
        pl.cd.skill = 0;
        E.burst(pl.x, pl.y, 6, '#d8d0e0', 16, 100, 0.5);
        E.comic(pl.x, pl.y - 30, 'PHASE STEP!', '#9d7bff', 1.1, 0.7);
        g.sfx('whoosh');
        if (human(g, pl)) return;
        // AI: lướt ngay về phía khung, rồi cứ có người áp sát là lướt tiếp
        const goal = g.attackGoal(team);
        Act().skill(g, pl, goal.x - pl.x, (goal.y - pl.y) * 0.5 + U.rand(-40, 40));
        sys.task(() => {
          if (g.state !== 'play' || st.until <= g.time) return true;
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
        if (pl !== prm.owner || !(st.until > g.time)) return;
        // ảo ảnh chạy tiếp hướng đang chạy trước khi lướt; AI đối thủ gần đó đuổi theo ảo ảnh
        const sp = Math.hypot(pl.vx, pl.vy), od = sp > 20 ? { x: pl.vx / sp, y: pl.vy / sp } : { x: -d.x, y: -d.y };
        E.clone(pl.id, pl.x, pl.y, od.x * 120, od.y * 120, prm.clone);
        const lure = { x: pl.x, y: pl.y, alive: true };
        let T = 0;
        sys.task((dt) => {
          T += dt;
          lure.x = U.clamp(lure.x + od.x * 110 * dt, f.x + 6, f.x + f.w - 6); lure.y = U.clamp(lure.y + od.y * 110 * dt, f.y + 6, f.y + f.h - 6);
          if (T >= prm.clone) { lure.alive = false; return true; }
          return false;
        });
        for (const o of g.teams[1 - team].players) if (!o.isControlled && !g.inKeeperZone(o) && U.dist(o, pl) < 120) o.confused = { decoy: lure, t: prm.confuse };
        E.burst(pl.x, pl.y, 6, '#9d7bff', 10, 80, 0.4);
        const np = clampIn(f, pl.x + d.x * prm.distance, pl.y + d.y * prm.distance);
        pl.x = np.x; pl.y = np.y;
        if (pl.hasBall) g.ball.follow(0);
        E.burst(pl.x, pl.y, 6, '#d8d0e0', 12, 80, 0.4);
        E.ring(pl.x, pl.y, '#9d7bff');
        pl.cd.skill *= prm.cdMult;
      },
    },


    /* 🎼 TIKI-TAKA + 🦵 VÕ SĨ ĐÁ — Boomerang Kick: bóng bay theo vòng cung lớn (đường chấm hiện trước) tới đồng đội đứng cao nhất
       (không có: quay về chân mình), hất ngã đối thủ bóng đi qua; thủ môn đối thủ bắt được */
    boomerang_kick: {
      aiUse(sys, team, prm) {
        const g = sys.g, me = prm.owner, s = H.teamBall(sys, team);
        if (!s || s.state !== 'normal' || me.state !== 'normal') return null;
        const o = H.nearestOpp(g, team, s, (q) => hittable(g, q));
        return o && U.dist(o, s) < 90 ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, b = g.ball;
        const s = H.teamBall(sys, team);
        if (!s) return;
        const m = H.forwardMate(g, team, s) || s, self = m === s;
        const p0 = { x: b.x, y: b.y }, dir = g.teams[team].dir;
        // vòng cung lượn sang phía ít đối thủ hơn
        const fwd = self ? { x: dir, y: 0 } : U.norm(m.x - p0.x, m.y - p0.y + 0.01), perp = { x: -fwd.y, y: fwd.x };
        const score = (sg) => g.teams[1 - team].players.reduce((n, o) => n + (((o.x - p0.x) * perp.x + (o.y - p0.y) * perp.y) * sg > 0 ? 1 : 0), 0);
        const sg = score(1) <= score(-1) ? 1 : -1;
        const f = g.field;
        const ctl = () => {
          const end = { x: m.x, y: m.y };
          if (self) {
            const far = clampIn(f, p0.x + fwd.x * 170, p0.y + fwd.y * 170, 14);
            return [p0, clampIn(f, far.x + perp.x * sg * prm.bend, far.y + perp.y * sg * prm.bend, 10), clampIn(f, far.x - perp.x * sg * prm.bend * 0.3, far.y - perp.y * sg * prm.bend * 0.3, 10), end];
          }
          const mid = { x: (p0.x + end.x) / 2, y: (p0.y + end.y) / 2 };
          const c = clampIn(f, mid.x + perp.x * sg * prm.bend * 1.4, mid.y + perp.y * sg * prm.bend * 1.4, 10);
          return [p0, c, c, end];
        };
        const at = (P, k) => {
          const u = 1 - k;
          return { x: u * u * u * P[0].x + 3 * u * u * k * P[1].x + 3 * u * k * k * P[2].x + k * k * k * P[3].x, y: u * u * u * P[0].y + 3 * u * u * k * P[1].y + 3 * u * k * k * P[2].y + k * k * k * P[3].y };
        };
        // báo trước: đường chấm của vòng cung
        const P = ctl();
        for (let i = 1; i < 12; i++) { const q = at(P, i / 12); E.prop(H.propId(g), 'dot', q.x, q.y, 0, 0, prm.telegraph + prm.flight * (i / 12) + 0.1, '#ffd23f'); }
        H.hold(s, prm.telegraph + 0.1);
        E.comic(s.x, s.y - 30, 'BOOMERANG!', '#ffd23f', 1.1, 0.7);
        g.sfx('whoosh');
        g.later(prm.telegraph, () => {
          if (g.state !== 'play' || b.owner !== s) return;
          H.unlock(s);
          b.kick(s, 0, 0, 0);
          for (const p of g.players) b.noPickup.set(p.id, 0.1);   // ngay khung hình đầu không ai nhặt được
          b.fx.string = true;
          Act().startAttack(s, 'shoot');
          g.sfx('kick', 0.7);
          const hit = new Set();
          let T = 0;
          sys.task((dt) => {
            if (g.state !== 'play' || b.owner) return true;
            T += dt;
            const k = Math.min(1, T / prm.flight), P2 = ctl(), q = at(P2, k), q1 = at(P2, Math.min(1, k + 0.02));
            b.vx = (q1.x - q.x) / Math.max(0.001, prm.flight * 0.02); b.vy = (q1.y - q.y) / Math.max(0.001, prm.flight * 0.02);
            b.x = q.x; b.y = q.y; b.z = 6 + Math.sin(k * Math.PI) * 14; b.vz = 0;
            b.fx.string = true;
            for (const p of g.players) b.noPickup.set(p.id, 0.1);
            for (const o of g.teams[1 - team].players) {
              if (hit.has(o) || !hittable(g, o) || U.dist(o, b) > prm.width + o.radius) continue;
              hit.add(o);
              // thủ môn đối thủ trong vòng cấm nhà: bắt bóng
              if (g.inKeeperZone(o) && o.state !== 'stun') { b.noPickup.delete(o.id); g.gainPossession(o); o.keeperHold = SFC_CONFIG.game.player.gkHoldProtect; E.text(o.x, o.y - 26, 'SAVE!', '#9dff3d'); g.sfx('save'); return true; }
              if (Act().dodged(g, o)) continue;
              const had = o.hasBall && !sys.unstealable(o);
              H.blast(o, b, prm.knock, prm.launch, prm.stun, s, U.norm(o.x - b.x, o.y - b.y + 0.01));
              if (had) sys.steal(s);
              E.comic(o.x, o.y - 30, 'BAM!', '#ffd23f', 1, 0.5);
              E.burst(o.x, o.y, 8, '#ffd23f', 10, 90, 0.4);
              g.sfx('hit');
            }
            if (k >= 1) {
              b.fx.string = false;
              for (const p of g.players) b.noPickup.delete(p.id);
              if (m.state !== 'stun' && m.state !== 'meteor') g.gainPossession(m);
              else { b.vx *= 0.4; b.vy *= 0.4; }
              return true;
            }
            return false;
          });
        });
      },
    },





    /* 🎯 SÁT THỦ + 🛡 THÉP — Boulder Shot: bóng hoá tảng đá khổng lồ lăn chậm, không ai nhặt được, cán bẹp người đứng trước;
       đối thủ đấm / đá vào thì tảng đá chậm lại và lệch theo hướng cú đánh */
    boulder_shot: {
      aiUse(sys, team, prm) {
        const g = sys.g, me = prm.owner, s = H.teamBall(sys, team);
        return s && s.state === 'normal' && me.state === 'normal' && H.nearGoal(g, team, s, 320) ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, b = g.ball;
        const s = H.teamBall(sys, team);
        if (!s) return;
        H.hold(s, prm.windup + 0.1);
        E.wave(s.x, s.y, 24, '#8a7f70', prm.windup, 2);
        E.comic(s.x, s.y - 30, 'BOULDER!', '#c7ccd6', 1.1, 0.7);
        g.sfx('block');
        g.later(prm.windup, () => {
          if (g.state !== 'play' || b.owner !== s || s.state === 'stun') return;
          H.unlock(s);
          fireAtGoal(g, team, s, prm.speed, 0);
          b.skin = 'boulder'; b.r = prm.r; b.frictionMult = 0.03;
          g.hitStop(0.08);
          E.shake(7, 0.4);
          g.sfx('kick', 1);
          g.sfx('wall');
          const hitT = new Map();
          let T = 0, k = 0;
          sys.task((dt) => {
            if (g.state !== 'play' || b.owner || b.skin !== 'boulder' || (T += dt) >= prm.time || b.speed < 20) return true;
            for (const q of g.players) b.noPickup.set(q.id, 0.12);
            if ((k += dt) >= 0.08) { k = 0; E.decal('crack', b.x, b.y, 0.6, 2); E.burst(b.x, b.y, 0, '#8a7f70', 3, 40, 0.3); }
            for (const q of g.teams[1 - team].players) {
              if (q.airZ > 6 || q.state === 'meteor' || (hitT.get(q.id) || 0) > g.time || U.dist(q, b) > q.radius + b.r + 2) continue;
              hitT.set(q.id, g.time + 0.5);
              if (attacking(g, q)) {
                // đẩy tảng đá: chậm lại, lệch theo hướng cú đánh
                const sp = b.speed * prm.slow, f = fv(q), cur = U.norm(b.vx, b.vy), d = U.norm(cur.x * 0.5 + f.x, cur.y * 0.5 + f.y);
                b.vx = d.x * sp; b.vy = d.y * sp;
                b.lastTouch = q;
                E.comic(b.x, b.y - 24, 'PUSH!', '#ffffff', 0.9, 0.4);
                E.burst(b.x, b.y, 4, '#d9cbb0', 8, 80, 0.4);
                g.sfx('wall');
                continue;
              }
              if (g.isProtected(q) || Act().dodged(g, q)) continue;
              const d = U.norm(b.vx, b.vy), side = (q.x - b.x) * -d.y + (q.y - b.y) * d.x >= 0 ? 1 : -1;
              q.hitImmune = 0;
              if (q.hit({ stun: prm.stun, kbx: -d.y * side * prm.knock, kby: d.x * side * prm.knock, source: s, type: 'hard' })) {
                E.comic(q.x, q.y - 28, 'SQUASH!', '#c7ccd6', 1, 0.5);
                g.sfx('hit');
              }
            }
            return false;
          }, () => {
            b.r = SFC_CONFIG.game.ball.radius;
            b.frictionMult = 1;
            if (b.skin === 'boulder') { b.skin = null; E.burst(b.x, b.y, 2, '#8a7f70', 16, 100, 0.6); }
          });
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
        E.comic(pl.x, pl.y - 32, 'JACK-IN-THE-BOX!', '#c63dff', 1, 0.7);
        g.sfx('pick');
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
                E.comic(bx.x, bx.y - 22, 'CRASH!', '#ffffff', 0.9, 0.4);
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
              E.comic(o.x, o.y - 30, 'BOING!', '#ff3d5a', 1.2, 0.5);
              g.hitStop(0.06);
              E.shake(5, 0.25);
              g.sfx('hit');
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
        E.callout('ONE-TWO!', '#ffb13d', 0.9);
        const beam = (a, c) => {
          E.beam(a.x, a.y - 4, Math.atan2(c.y - a.y, c.x - a.x), U.dist(a, c), 5, '#ffd23f', 0.6);
          E.burst(c.x, c.y, 10, '#ffd23f', 10, 70, 0.4);
          g.sfx('pass');
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
          E.comic(from.x, from.y - 28, 'BOING!', '#ffd23f', 0.9, 0.5);
          g.sfx('kick', 0.5);
          // người dùng bật lên trời, lộn ngược (atkType 'bicycle' -> renderer xoay người)
          g.later(Math.max(0, prm.lob - 0.4), () => {
            if (g.state !== 'play' || s.state === 'stun') return;
            s.airVz = prm.jump; s.airZ = Math.max(s.airZ, 0.5);
            s.atkType = 'bicycle'; s.atkT = 0;
            E.burst(s.x, s.y, 0, '#8a7f70', 10, 80);
            g.sfx('whoosh');
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
            E.comic(s.x, s.y - s.airZ - 30, 'BICYCLE KICK!', '#ffb13d', 1.3, 0.8);
            E.wave(b.x, b.y, 30, '#ffb13d', 0.45, 3);
            E.speedLines(0.4, b.x, b.y - b.z, '#ffffff');
            E.shake(6, 0.35);
            g.sfx('kick', 1);
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

    /* 🥊 ĐẤU SĨ + 🛡 THÉP — Iron Hammer (búa kiểu Poppy): chỉ khi KHÔNG cầm bóng. Lôi búa ra gồng (xoay hướng được, hình quạt báo trước),
       nện xuống: đối thủ trong quạt bay rất xa theo hướng búa */
    iron_hammer: {
      aiUse(sys, team, prm) {
        const g = sys.g, me = prm.owner;
        if (me.state !== 'normal' || me.airZ > 0 || g.ball.owner === me) return null;
        const o = H.nearestOpp(g, team, me, (q) => hittable(g, q));
        return o && U.dist(o, me) < prm.range + 14 && (o.hasBall || Math.random() < 0.4) ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, id = H.propId(g);
        const o = H.nearestOpp(g, team, pl, (q) => hittable(g, q));
        if (o) pl.facing = Math.atan2(o.y - pl.y, o.x - pl.x);
        H.hold(pl, prm.windup + 0.3);
        E.prop(id, 'hammer', pl.x, pl.y, pl.id, prm.windup, prm.windup + 0.35, '#c7ccd6');
        E.comic(pl.x, pl.y - 40, 'IRON HAMMER!', '#c7ccd6', 1.1, 0.7);
        g.sfx('whoosh');
        let T = 0;
        sys.task((dt) => {   // gồng: người chơi xoay hướng búa theo phím (chậm)
          if (g.state !== 'play' || pl.state === 'stun') return true;
          if ((T += dt) >= prm.windup) return true;
          if (human(g, pl) && Math.hypot(pl.intent.mx, pl.intent.my) > 0.2) pl.turnTo(Math.atan2(pl.intent.my, pl.intent.mx), dt * 0.6);
          return false;
        });
        g.later(prm.windup, () => {
          if (g.state !== 'play') return;
          if (pl.state === 'stun') { E.propOff(id); return; }
          const d = fv(pl), hx = pl.x + d.x * prm.range * 0.7, hy = pl.y + d.y * prm.range * 0.7;
          g.hitStop(0.12);
          E.impactFrame();
          E.zoom(hx, hy, 0.18, 0.35);
          E.decal('crack', hx, hy, 1.8, 5);
          E.wave(hx, hy, 34, '#c7ccd6', 0.5, 3);
          E.burst(hx, hy, 2, '#8a7f70', 22, 140, 0.8);
          E.comic(hx, hy - 30, 'BONK!!', '#ffffff', 1.5, 0.6);
          E.shake(10, 0.45);
          g.sfx('hit');
          g.sfx('block');
          for (const q of Act().inFront(g, pl, prm.range, prm.arc)) {
            if (g.isProtected(q) || q.state === 'meteor' || Act().dodged(g, q)) continue;
            const had = q.hasBall && !sys.unstealable(q);
            q.hitImmune = 0;
            if (q.state === 'stun') { q.state = 'normal'; q.stateT = 0; }
            H.blast(q, pl, prm.knock, prm.launch, prm.stun, pl, U.norm(d.x * 2 + (q.x - pl.x) / 40, d.y * 2 + (q.y - pl.y) / 40));
            if (had) sys.steal(pl);
            E.burst(q.x, q.y, 10, '#ffffff', 10, 100, 0.4);
            H.wallCrack(sys, q);
          }
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
        E.callout('THUNDERSTORM!', '#3ff6ff', 1);
        E.tint('#0a1830', prm.telegraph + prm.gap * prm.bolts + 0.4, 0.3);
        g.sfx('zap');
        spots.forEach((sp, i) => {
          g.later(prm.gap * i, () => {
            if (g.state !== 'play') return;
            E.prop(H.propId(g), 'mark', sp.x, sp.y, prm.radius, 0, prm.telegraph + 0.05, '#bdf4ff');
            g.later(prm.telegraph, () => {
              if (g.state !== 'play') return;
              for (let k = 0; k < 2; k++) E.bolt(sp.x + U.rand(-4, 4), sp.y - 220, sp.x, sp.y - 2, k ? '#7fe7ff' : '#ffffff', 0.4);
              E.burst(sp.x, sp.y, 2, '#bdf4ff', 14, 110, 0.5);
              E.decal('scorch', sp.x, sp.y, 1, 3);
              E.wave(sp.x, sp.y, prm.radius, '#ffffff', 0.3, 2);
              E.shake(3, 0.15);
              g.sfx('zap');
              for (const o of g.teams[1 - team].players) {
                if (!hittable(g, o) || U.dist(o, sp) > prm.radius + o.radius * 0.5 || Act().dodged(g, o)) continue;
                const had = o.hasBall && !sys.unstealable(o), d = U.norm(o.x - sp.x, o.y - sp.y + 0.01);
                o.hitImmune = 0;
                if (o.hit({ stun: prm.stun, kbx: d.x * prm.knock, kby: d.y * prm.knock, source: pl, type: 'slash' })) {
                  if (had) sys.steal(pl);
                  E.comic(o.x, o.y - 30, 'ZZT!', '#7fe7ff', 1, 0.5);
                }
              }
            });
          });
        });
      },
    },

    /* 🏃 TỐC ĐỘ + 🎯 SÁT THỦ — Time Stop Strike (cân lại): ngưng thời gian, 3 cú đá chỉ nhích bóng chút ít + vẽ mũi tên.
       Hết ngưng: đối thủ cử động lại TRƯỚC react giây (chạy ra chắn mũi tên), rồi bóng mới bay; thủ môn dễ bắt hơn */
    time_stop_strike: {
      aiUse(sys, team, prm) {
        const g = sys.g, me = prm.owner, s = H.teamBall(sys, team);
        return s && s.state === 'normal' && me.state === 'normal' && H.nearGoal(g, team, s, 330) ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, b = g.ball, f = g.field;
        const s = H.teamBall(sys, team);
        if (!s) return;
        const total = prm.gap * (prm.kicks + 0.6), goal = g.attackGoal(team), arrows = [];
        g.stopT = total + 0.05;
        E.tint('#c7ccd6', total + 0.15, 0.32);
        E.callout('TIME STOP!', '#e8ecf5', 1);
        E.wave(s.x, s.y, 60, '#e8ecf5', 0.5, 2);
        g.sfx('zap');
        b.owner = null; b.vx = b.vy = b.vz = 0; b.z = 0;
        H.hold(s, total + prm.react + 0.2);
        let pos = { x: b.x, y: b.y }, finalA = Math.atan2(goal.y - b.y, goal.x - b.x);
        for (let i = 0; i < prm.kicks; i++) {
          g.later(prm.gap * (i + 0.5), () => {
            if (g.state !== 'play') return;
            const last = i === prm.kicks - 1;
            let a = Math.atan2(goal.y + U.rand(-0.5, 0.5) * f.goalWidth * 0.5 - pos.y, goal.x - pos.x) + U.rand(-0.6, 0.6);
            if (human(g, s) && i === 0 && Math.hypot(s.intent.mx, s.intent.my) > 0.2) a = Math.atan2(s.intent.my, s.intent.mx);
            if (last) {
              const ay = human(g, s) && Math.abs(s.intent.my) > 0.2 ? Math.sign(s.intent.my) : U.rand(-1, 1);
              a = finalA = Math.atan2(goal.y + ay * (f.goalWidth / 2 - 8) - pos.y, goal.x - pos.x);
            }
            E.afterimage(s, 0.5);
            const behind = clampIn(f, pos.x - Math.cos(a) * 10, pos.y - Math.sin(a) * 10);
            s.x = behind.x; s.y = behind.y; s.facing = a;
            Act().startAttack(s, 'shoot');
            const id = H.propId(g);
            arrows.push(id);
            E.prop(id, 'arrow', pos.x, pos.y, a, last ? 90 : 30, total + prm.react + 0.3, last ? '#ffe14f' : '#e8ecf5');
            E.burst(pos.x, pos.y, 2, '#ffffff', 8, 60, 0.4);
            E.comic(pos.x, pos.y - 26, 'KICK!', '#e8ecf5', 0.8, 0.5);
            g.sfx('kick', 0.4);
            if (!last) { pos = clampIn(f, pos.x + Math.cos(a) * prm.step, pos.y + Math.sin(a) * prm.step, 6); b.x = pos.x; b.y = pos.y; }
          });
        }
        let held = true;
        g.later(total, () => {
          g.stopT = 0;   // đối thủ cử động lại trước, bóng vẫn đứng giữa không trung tới hết react
          if (g.state !== 'play') return;
          E.comic(b.x, b.y - 30, 'RESUME!', '#e8ecf5', 1, 0.5);
          sys.task(() => {
            if (!held || g.state !== 'play') return true;
            b.x = pos.x; b.y = pos.y; b.vx = b.vy = b.vz = 0; b.owner = null;
            for (const q of g.players) b.noPickup.set(q.id, 0.05);
            return false;
          });
          g.later(prm.react, () => {
            held = false;
            for (const id of arrows) E.propOff(id, 0.3);
            if (g.state !== 'play') return;
            H.unlock(s);
            const spd = fullShot(sys, s) * prm.speed;
            b.kick(s, Math.cos(finalA) * spd, Math.sin(finalA) * spd, 30);
            b.kind = 'shot';
            b.gkMod += prm.gk;
            b.fx.spiral = true;
            E.impactFrame();
            E.shake(6, 0.3);
            g.sfx('kick', 1);
          });
        });
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
        E.comic(pl.x, pl.y - 32, 'ROCKET PUNCH!', '#ff7a3d', 1.1, 0.7);
        g.sfx('whoosh');
        g.later(prm.windup, () => {
          if (g.state !== 'play') return;
          if (pl.state === 'stun') { E.comic(pl.x, pl.y - 30, 'MISS', '#9aa3b5', 0.9, 0.5); return; }
          const x0 = pl.x + d.x * 10, y0 = pl.y + d.y * 10, maxT = len / prm.speed;
          E.projectile('rocket', x0, y0, d.x * prm.speed, d.y * prm.speed, maxT, '#ffd8b0');
          E.burst(x0, y0, 6, '#ff7a3d', 16, 120, 0.5);
          E.burst(x0, y0, 6, '#6a6470', 10, 60, 0.8);
          E.shake(5, 0.25);
          g.sfx('hit');
          g.sfx('fire');
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
                E.comic(o.x, o.y - 32, 'KAPOW!', '#ff7a3d', 1.3, 0.7);
                E.burst(o.x, o.y, 8, '#ffd23f', 18, 150, 0.5);
                E.shake(8, 0.35);
                g.sfx('hit');
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
        E.callout('MONSTER TRUCK!', '#ff3d5a', 0.9);
        E.burst(pl.x, pl.y, 4, '#6a6470', 14, 90, 0.6);
        g.sfx('wall');
        let T = 0, k = 0, head = pl.facing;
        const hitT = new Map();
        sys.task((dt) => {
          if (g.state !== 'play') return true;
          if (pl.state === 'stun') { E.comic(pl.x, pl.y - 30, 'CRASH!', '#ff3d5a', 1.1, 0.5); return true; }
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
              E.comic(o.x, o.y - 30, 'SQUASH!', '#ff3d5a', 1.1, 0.5);
              E.burst(o.x, o.y, 8, '#ffffff', 12, 110, 0.4);
              E.shake(5, 0.2);
              g.sfx('hit');
            }
          }
          return false;
        }, () => {
          E.propOff(id, 0.2);
          E.burst(pl.x, pl.y, 4, '#6a6470', 18, 110, 0.7);
          E.comic(pl.x, pl.y - 30, 'POOF!', '#ffffff', 1, 0.5);
          H.unlock(pl);
          pl.vx *= 0.3; pl.vy *= 0.3;
        });
      },
    },

    /* 🌀 ẢO ẢNH + 🎯 SÁT THỦ — Hypno Eyes: tia thôi miên (báo trước, né Z được) vào đối thủ phía trước (ưu tiên người đứng giữa mình và khung):
       trúng thì đi lang thang ra xa khung, ai / bóng chạm vào là tỉnh */
    hypno_eyes: {
      targets(sys, team, prm, pl) {
        const g = sys.g, goal = g.attackGoal(team);
        return g.teams[1 - team].players
          .filter((o) => hittable(g, o) && o.state !== 'stun' && U.dist(o, pl) < prm.range)
          .map((o) => ({ o, k: U.segDist(o.x, o.y, pl.x, pl.y, goal.x, goal.y) + U.dist(o, pl) * 0.2 }))
          .sort((a, c) => a.k - c.k).slice(0, prm.targets).map((x) => x.o);
      },
      aiUse(sys, team, prm) {
        const g = sys.g, me = prm.owner, s = H.teamBall(sys, team);
        return me.state === 'normal' && s && H.nearGoal(g, team, s, 320) && this.targets(sys, team, prm, me).length ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, f = g.field, goal = g.attackGoal(team);
        const list = this.targets(sys, team, prm, pl);
        if (!list.length) return;
        H.hold(pl, prm.telegraph + 0.1);
        E.comic(pl.x, pl.y - 34, 'HYPNO EYES!', '#ff7ab8', 1.1, 0.7);
        g.sfx('zap');
        const aims = list.map((o) => {
          E.beam(pl.x, pl.y - 14, Math.atan2(o.y - 6 - (pl.y - 14), o.x - pl.x), U.dist(o, pl), 2, '#ff7ab8', prm.telegraph + 0.1);
          return { o, x: o.x, y: o.y };
        });
        g.later(prm.telegraph, () => {
          if (g.state !== 'play') return;
          for (const a of aims) {
            const o = a.o;
            // chạy ra khỏi chỗ tia nhắm / lướt Z lúc tia tới: thoát
            if (!hittable(g, o) || o.state === 'stun' || U.dist(o, a) > prm.catch || Act().dodged(g, o)) { E.comic(a.x, a.y - 26, 'MISS', '#9aa3b5', 0.8, 0.4); continue; }
            for (let i = 0; i < 2; i++) E.bolt(pl.x, pl.y - 14, o.x, o.y - 14, i ? '#ff7ab8' : '#ffffff', 0.3);
            // lang thang ra xa khung nhà của họ (khung mình đang tấn công) + về phía đường biên gần nhất, lắc lư
            const side = o.y < f.cy ? -1 : 1;
            Stat.hypno(sys, o, prm.time, prm.speed, (q, T) => U.norm((q.x - goal.x) * 0.02 + Math.sin(T * 3) * 0.4, side * 0.7 + Math.cos(T * 2.3) * 0.4));
          }
        });
      },
    },

    /* 🎼 TIKI-TAKA + 🌀 ẢO ẢNH — Switcheroo: tráo chỗ với đồng đội đứng đúng chỗ (báo trước bằng vòng phép). Bóng ở chân ai vẫn ở chân người đó */
    switcheroo: {
      mate(sys, team, pl) {
        const g = sys.g, b = g.ball;
        if (b.owner && b.owner.team !== team) {
          let best = null, bd = Infinity;
          for (const m of g.teams[team].players) if (m !== pl && m.state !== 'stun' && U.dist(m, b.owner) < bd) { bd = U.dist(m, b.owner); best = m; }
          return best;
        }
        return H.forwardMate(g, team, pl);
      },
      aiUse(sys, team, prm) {
        const g = sys.g, me = prm.owner, m = this.mate(sys, team, me);
        if (me.state !== 'normal' || !m) return null;
        // cầm bóng mà đồng đội đứng cao hơn hẳn, hoặc đối thủ cầm bóng gần đồng đội hơn mình nhiều
        if (g.ball.owner === me) return (m.x - me.x) * g.teams[team].dir > 120 ? me : null;
        return g.ball.owner && g.ball.owner.team !== team && U.dist(m, g.ball.owner) + 100 < U.dist(me, g.ball.owner) ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, b = g.ball, m = this.mate(sys, team, pl);
        if (!m) return;
        for (const p of [pl, m]) { E.prop(H.propId(g), 'magic', p.x, p.y, p.id, 0, prm.telegraph + 0.1, '#9d7bff'); p.glow('#9d7bff', prm.telegraph + 0.3); }
        E.comic(pl.x, pl.y - 30, 'SWITCHEROO!', '#9d7bff', 1.1, 0.6);
        g.sfx('whoosh');
        g.later(prm.telegraph, () => {
          if (g.state !== 'play') return;
          if (pl.state === 'stun' || m.state === 'stun' || m.state === 'meteor') { E.comic(pl.x, pl.y - 26, 'MISS', '#9aa3b5', 0.8, 0.4); return; }
          const a = { x: pl.x, y: pl.y, f: pl.facing }, c = { x: m.x, y: m.y, f: m.facing };
          for (const p of [pl, m]) { E.burst(p.x, p.y, 6, '#d8d0e0', 16, 100, 0.5); E.afterimage(p, 0.3); }
          Object.assign(pl, { x: c.x, y: c.y, facing: c.f, vx: 0, vy: 0, kbx: 0, kby: 0 });
          Object.assign(m, { x: a.x, y: a.y, facing: a.f, vx: 0, vy: 0, kbx: 0, kby: 0 });
          if (b.owner === pl || b.owner === m) b.follow(0);
          for (const p of [pl, m]) { E.burst(p.x, p.y, 6, '#9d7bff', 16, 100, 0.5); E.ring(p.x, p.y, '#9d7bff'); }
          E.comic(pl.x, pl.y - 30, 'POOF!', '#9d7bff', 1, 0.5);
          g.sfx('whoosh');
        });
      },
    },

    /* 🎯 SÁT THỦ + 🥊 ĐẤU SĨ — Dodgeball: cú sút hoá bóng né, nảy từ đầu đối thủ này sang đầu đối thủ khác (trơn té), hết người thì bay về khung */
    dodgeball: {
      pick(sys, team, prm, from, hit) {
        const g = sys.g;
        let best = null, bd = prm.range;
        for (const o of g.teams[1 - team].players) {
          if (hit.has(o) || !hittable(g, o) || o.state === 'stun' || g.inKeeperZone(o)) continue;
          const d = U.dist(o, from);
          if (d < bd) { bd = d; best = o; }
        }
        return best;
      },
      aiUse(sys, team, prm) {
        const g = sys.g, me = prm.owner, s = H.teamBall(sys, team);
        return s && s.state === 'normal' && me.state === 'normal' && this.pick(sys, team, prm, s, new Set()) ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, b = g.ball;
        const s = H.teamBall(sys, team);
        if (!s) return;
        H.hold(s, prm.windup + 0.05);
        E.comic(s.x, s.y - 30, 'DODGEBALL!', '#ff3d5a', 1.1, 0.7);
        g.sfx('whoosh');
        g.later(prm.windup, () => {
          if (g.state !== 'play' || b.owner !== s || s.state === 'stun') return;
          H.unlock(s);
          const hit = new Set();
          let tgt = this.pick(sys, team, prm, s, hit), T = 0;
          const finish = () => {
            fireAtGoal(g, team, s, fullShot(sys, s) * 0.9, 30);
            b.gkMod += prm.gk; b.skin = 'dodge';
            E.burst(b.x, b.y, b.z, '#ff3d5a', 10, 90, 0.4);
          };
          if (!tgt) { finish(); return; }
          b.kick(s, 0, 0, 40);
          b.skin = 'dodge';
          Act().startAttack(s, 'shoot');
          g.sfx('kick', 0.8);
          sys.task((dt) => {
            if (g.state !== 'play' || b.owner) return true;
            T += dt;
            for (const q of g.players) b.noPickup.set(q.id, 0.08);
            if (!tgt || !hittable(g, tgt) || T > 2.5) { finish(); return true; }
            const d = U.norm(tgt.x - b.x, tgt.y - b.y + 0.01);
            b.vx = d.x * prm.speed; b.vy = d.y * prm.speed; b.z = Math.max(b.z, 8); b.vz = 0;
            b.skin = 'dodge';
            if (U.dist(b, tgt) < tgt.radius + b.r + 3) {
              hit.add(tgt);
              if (!Act().dodged(g, tgt)) {
                const had = tgt.hasBall && !sys.unstealable(tgt);
                if (Stat.slip(sys, tgt, prm.slip, s, prm.slide, d) && had) sys.steal(s);
                E.comic(tgt.x, tgt.y - 32, 'BONK!', '#ff3d5a', 1.1, 0.5);
                E.burst(b.x, b.y, b.z, '#ffffff', 8, 80, 0.4);
                g.hitStop(0.05);
                g.sfx('hit');
              }
              tgt = hit.size >= prm.hits ? null : this.pick(sys, team, prm, b, hit);
              if (!tgt) { finish(); return true; }
            }
            return false;
          });
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
        E.callout('IRON CHAIN!', '#c7ccd6', 0.9);
        for (const p of [pl].concat(chains.map((c) => c.m))) { p.glow('#c7ccd6', prm.time); E.shield(p.x, p.y - 8, 12, '#c7ccd6', 0.4); }
        g.sfx('block');
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
                E.comic(o.x, o.y - 30, 'TRIP!', '#c7ccd6', 1, 0.5);
                E.burst(o.x, o.y, 6, '#ffffff', 8, 70, 0.4);
                g.sfx('hit');
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
        E.callout('GHOST HANDS!', '#9d7bff', 0.9);
        g.sfx('whoosh');
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
            if (!hittable(g, o) || U.dist(o, s) > prm.radius + o.radius * 0.5 || Act().dodged(g, o)) { E.comic(s.x, s.y - 24, 'MISS', '#9aa3b5', 0.8, 0.4); continue; }
            const had = o.hasBall && !sys.unstealable(o);
            o.hitImmune = 0;
            if (o.state === 'stun') { o.state = 'normal'; o.stateT = 0; }
            if (!o.hit({ stun: prm.hold, kbx: 0, kby: 0, source: pl, type: 'hard' })) continue;
            if (had) sys.steal(pl);
            E.prop(H.propId(g), 'hand', o.x, o.y, o.id, 0, prm.hold, '#9d7bff');
            E.comic(o.x, o.y - 30, 'GRAB!', '#9d7bff', 1.1, 0.5);
            E.burst(o.x, o.y, 0, '#5b3fb0', 10, 60, 0.5);
            held.push({ o, x: o.x, y: o.y });
          }
          if (!held.length) return;
          g.hitStop(0.06);
          g.sfx('hit');
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
        E.callout('PORTAL KICKS!', '#c63dff', 0.9);
        g.sfx('zap');
        list.forEach((o, i) => {
          g.later(prm.gap * i, () => {
            if (g.state !== 'play' || pl.state === 'stun') return;
            const away = U.norm(o.x - pl.x, o.y - pl.y + 0.01);
            const pt = clampIn(f, o.x - away.x * 22, o.y - away.y * 22, 6), id = H.propId(g);
            E.prop(id, 'portal', pt.x, pt.y, 0, 0, prm.telegraph + 0.35, '#c63dff');
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
                E.comic(o.x, o.y - 30, 'BAM!', '#c63dff', 1.1, 0.5);
                E.burst(o.x, o.y, 8, '#c63dff', 12, 100, 0.4);
                g.hitStop(0.06);
                E.shake(5, 0.2);
                g.sfx('hit');
              } else E.comic(pt.x, pt.y - 24, 'MISS', '#9aa3b5', 0.8, 0.4);
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
        E.comic(pl.x, pl.y - 32, 'EARTH SPIKE!', '#b46bff', 1.1, 0.7);
        const left = String(st.left) + 'x';   // còn mấy lượt (bấm X lại) — số, không cần dịch
        if (st.left > 0) E.comic(pl.x + 30, pl.y - 48, left, '#ffffff', 1, 0.9);
        g.sfx('wall');
        g.later(prm.telegraph, () => {
          if (g.state !== 'play') return;
          const ids = pts.map((p) => { const id = H.propId(g); E.prop(id, 'pillar', p.x, p.y, 0, 0, prm.life, '#8a7f70'); return id; });
          g.hitStop(0.06);
          E.shake(7, 0.35);
          E.burst(pl.x + d.x * 40, pl.y + d.y * 40, 2, '#8a7f70', 20, 120, 0.7);
          g.sfx('hit');
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
            E.comic(o.x, o.y - 34, 'CRACK!', '#b46bff', 1.1, 0.5);
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
        E.comic(pl.x, pl.y - 34, 'MEDUSA GAZE!', '#6bff4f', 1.1, 0.7);
        g.sfx('zap');
        g.later(prm.telegraph, () => {
          if (g.state !== 'play' || pl.state === 'stun') return;
          E.flash(0.3);
          E.tint('#2f9a3a', 0.4, 0.2);
          let n = 0;
          for (const o of g.teams[1 - team].players) {
            if (!hittable(g, o) || !this.inCone(g, pl, o, d, prm) || Act().dodged(g, o)) continue;
            const had = o.hasBall && !sys.unstealable(o);
            if (Stat.stone(sys, o, prm.time, pl)) { n++; if (had) sys.steal(pl); E.comic(o.x, o.y - 32, 'STONE!', '#c7ccd6', 1.1, 0.6); }
          }
          if (n) { g.hitStop(0.08); E.shake(5, 0.3); g.sfx('block'); }
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
        E.callout('REWIND!', '#c63dff', 0.9);
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

    /* 🎲 HỖN LOẠN + 🎼 TIKI-TAKA — Banana Pass: chuyền tới đồng đội đứng cao nhất, bóng rải vỏ chuối dọc đường bay; đối thủ dẫm phải trơn té */
    banana_pass: {
      aiUse(sys, team, prm) {
        const g = sys.g, me = prm.owner, s = H.teamBall(sys, team);
        if (!s || s.state !== 'normal' || me.state !== 'normal') return null;
        const m = H.forwardMate(g, team, s), o = H.nearestOpp(g, team, s);
        return m && o && U.dist(o, s) < 90 ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, b = g.ball, f = g.field;
        const s = H.teamBall(sys, team);
        if (!s) return;
        const m = H.forwardMate(g, team, s);
        if (m) Act().passTo(g, s, m, 'ground');
        else { const goal = g.attackGoal(team), d = U.norm(goal.x - b.x, goal.y - b.y); b.kick(s, d.x * 260, d.y * 260, 20); }
        E.comic(s.x, s.y - 30, 'BANANA PASS!', '#ffe14f', 1.1, 0.7);
        g.sfx('pass');
        const peels = [];
        let last = { x: b.x, y: b.y }, T = 0;
        const drop = (x, y) => {
          const p = clampIn(f, x + U.rand(-4, 4), y + U.rand(-4, 4), 6), pe = { x: p.x, y: p.y, id: H.propId(g), live: true };
          E.prop(pe.id, 'peel', pe.x, pe.y, U.rand(0, Math.PI * 2), 0, prm.life, '#ffe14f');
          peels.push(pe);
        };
        drop(s.x, s.y);
        sys.task((dt) => {
          if (g.state !== 'play' || (T += dt) >= prm.life) return true;
          // rải vỏ chuối dọc đường bóng bay (tới lúc có người khống chế bóng)
          if (!b.owner && T < 1.8 && U.dist(b, last) >= prm.every) { drop(b.x, b.y); last = { x: b.x, y: b.y }; }
          for (const pe of peels) {
            if (!pe.live) continue;
            for (const o of g.teams[1 - team].players) {
              if (!hittable(g, o) || o.state === 'stun' || o.state === 'dash' || U.dist(o, pe) > prm.radius + o.radius * 0.5) continue;
              pe.live = false;
              E.propOff(pe.id);
              const had = o.hasBall && !sys.unstealable(o);
              if (Stat.slip(sys, o, prm.slip, pl, prm.slide) && had) sys.steal(pl);
              g.sfx('whoosh');
              break;
            }
          }
          return T > 1.8 && !peels.some((pe) => pe.live);
        }, () => { for (const pe of peels) if (pe.live) E.propOff(pe.id); });
      },
    },

    /* 🎲 HỖN LOẠN + 🎯 SÁT THỦ — Shrink Ray: tia thu nhỏ (vạch báo trước, né Z được) xuyên mọi đối thủ trên đường: teo nhỏ, chạy chậm,
       thủ môn bé lại thì tầm bắt bóng nhỏ theo */
    shrink_ray: {
      aiUse(sys, team, prm) {
        const g = sys.g, me = prm.owner, s = H.teamBall(sys, team);
        return me.state === 'normal' && s && H.nearGoal(g, team, s, 340) ? me : null;
      },
      onUltimate(sys, team, prm, pl) {
        const g = sys.g, E = g.effects, b = g.ball;
        const tgt = b.owner && b.owner.team !== team ? b.owner : H.nearestOpp(g, team, pl, (o) => hittable(g, o) && g.inKeeperZone(o)) || null;
        const d = H.aimDir(g, team, pl, tgt), len = 700, a = Math.atan2(d.y, d.x);
        pl.facing = a;
        H.hold(pl, prm.telegraph + 0.15);
        E.beam(pl.x + d.x * 8, pl.y - 8, a, len, 2, '#ff7ab8', prm.telegraph + 0.1);
        E.comic(pl.x, pl.y - 32, 'SHRINK RAY!', '#ff7ab8', 1.1, 0.7);
        g.sfx('zap');
        g.later(prm.telegraph, () => {
          if (g.state !== 'play' || pl.state === 'stun') return;
          const x0 = pl.x, y0 = pl.y, x1 = x0 + d.x * len, y1 = y0 + d.y * len;
          E.beam(x0 + d.x * 8, y0 - 8, a, len, prm.width, '#ff7ab8', 0.4);
          E.flash(0.2);
          g.sfx('zap');
          for (const o of g.teams[1 - team].players) {
            if (!hittable(g, o) || U.segDist(o.x, o.y, x0, y0, x1, y1) > prm.width / 2 + o.radius || Act().dodged(g, o)) continue;
            Stat.tiny(sys, o, prm.time, prm.size, prm.slow);
          }
        });
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
        E.callout('MEGA MAGNET!', '#ff3d5a', 0.9);
        g.sfx('whoosh');
        g.later(prm.telegraph, () => {
          if (g.state !== 'play') { E.propOff(id); return; }
          E.shake(4, 0.3);
          g.sfx('clang');
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
            E.comic(c.x, c.y - 34, n ? 'CLANG!' : 'MISS', n ? '#ff3d5a' : '#9aa3b5', n ? 1.3 : 0.9, 0.6);
            if (n) { g.hitStop(0.08); E.impactFrame(); E.shake(7, 0.35); g.sfx('hit'); }
          });
        });
      },
    },
  });
})();
