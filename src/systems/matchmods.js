/* MatchMods — LUẬT TRẬN của FOOTBALL STORY (docs/FOOTBALL_STORY.md mục "Luật trận"): mỗi đội đối thủ một luật làm trận đá khác hẳn.
 * Số liệu: SFC_CONFIG.stories.mods[id] · vòng nào dùng luật nào: rounds[i].mod -> trận nhận opts.mod (main.js startCupMatch).
 * User chốt 2026-10-19: được nặng tay cho thấy rõ, nhưng không lấy / cấm Core.
 * Đội "chủ luật" = đội đối thủ (g.mod.team = 1 - đội người chơi): luật chỉ đánh vào đội kia.
 * Chỉ máy chạy mô phỏng (chơi đơn / chủ phòng) tính va chạm. Hình = Effects.prop / pop (lệnh hiệu ứng: khách online nhận qua sync.js);
 * vật di chuyển (xe máy, đèn pha) có vị trí là hàm thuần của tuổi vật thể (MatchMods.at) nên máy vẽ tự tính, không cần gói tin mới.
 * Hook từ match.js: create (dựng trận) · kickoff (sau khi xếp đội hình) · clock (mỗi bước lúc kickoff / play, kể cả lúc cả sân đứng yên)
 *   · update (mỗi bước mô phỏng lúc play) · goal (bàn thắng). Render đọc alpha(g, p) (ma mờ) — render/vfx.js vẽ các vật thể.
 * Câu nói trong trận: opts.barks { kickoff, goal (đội họ ghi), conceded (đội bạn ghi), mod (luật vừa ra tay) } -> bong bóng thoại (pop 'talk').
 * Đếm g.mod.hits = số lần luật trúng đội bạn (sao thử thách modClean, src/meta/cup.js).
 */
window.SFC = window.SFC || {};

(function () {
  const U = SFC.U;
  const S = () => SFC_CONFIG.stories || {};
  const Act = () => SFC.Actions;
  const newId = (g) => SFC.CoreHelpers.propId(g);
  const behind = (g) => g.teams[g.mod.team].score < g.teams[1 - g.mod.team].score;
  // cầu thủ trên mặt đất, không ở ngoài màn hình (luật không chạm người đang bay / Thiên Thạch)
  const grounded = (q) => q.airZ <= 4 && q.state !== 'meteor';

  /* ---------- câu nói của đối thủ ---------- */
  // who: người nói (mặc định: đội trưởng = cầu thủ cuối, người đứng gần bóng nếu đội trưởng không có)
  function bark(g, kind, who = null) {
    const M = g.mod, lines = M.barks && M.barks[kind];
    if (!lines || !lines.length || g.time < M.barkT) return;
    const tp = g.teams[M.team].players;
    const p = who || tp[tp.length - 1];
    if (!p) return;
    M.barkT = g.time + (S().barkGap || 3.5);
    g.effects.pop(p.x, p.y - 34, U.pick(lines), 'talk', g.teams[M.team].cfg.kit.shirt);
  }

  /* ---------- đường đi thuần theo thời gian (sim + vẽ dùng chung) ---------- */
  // đèn pha: Lissajous phủ gần hết sân
  function lightAt(c, t, ph) {
    const f = SFC_CONFIG.game.field;
    return {
      x: f.x + f.w / 2 + (f.w / 2 - c.marginX) * Math.sin(t * c.speedX + ph),
      y: f.y + f.h / 2 + (f.h / 2 - c.marginY) * Math.sin(t * c.speedY + ph * 1.7),
    };
  }
  // xe máy: x cố định, y từ o.y tới o.a sau b giây cảnh báo
  function mopedAt(o, el) {
    const k = U.clamp((el - o.b) / Math.max(0.01, o.max - o.b), 0, 1);
    return { x: o.x, y: o.y + (o.a - o.y) * k, k };
  }

  /* ---------- từng luật ---------- */
  const K = {};

  /* The Uncles — GHẾ NHỰA: ghế nằm trên sân, ai không cầm bóng đi vào là nhặt lên (giơ trên đầu), ra đòn = ném.
   * Ghế bay trúng đối thủ: choáng + rơi bóng (lướt né được), ghế vỡ, lát sau các chú đặt ghế mới. Bay hết tầm: rơi xuống thành ghế trên sân.
   * Ghế trên sân vẫn là vật cản với người cầm bóng (bóng thấp dội ra), sút mạnh vỡ ghế. Người cầm ghế không nhận bóng được, bị choáng là rơi ghế. */
  K.stools = {
    create(g, M) { M.list = []; M.flying = []; },
    kickoff(g, M, c) {
      for (const p of g.players) p.carry = null;
      M.list = []; M.flying = [];
      for (let i = 0; i < c.n; i++) this.add(g, M, c);
    },
    // chỗ trống: giữa 2 vòng cấm, ngoài vòng tròn giữa sân, cách ghế khác + cách người
    spot(g, M, c) {
      const f = g.field;
      for (let k = 0; k < 60; k++) {
        const x = U.rand(f.x + f.boxDepth + 20, f.x + f.w - f.boxDepth - 20), y = U.rand(f.y + 20, f.y + f.h - 20);
        if (Math.hypot(x - f.cx, y - f.cy) < f.centerCircle + 22) continue;
        if (M.list.some((s) => !s.dead && Math.hypot(s.x - x, s.y - y) < c.gap)) continue;
        if (g.players.some((q) => Math.hypot(q.x - x, q.y - y) < 22) || Math.hypot(g.ball.x - x, g.ball.y - y) < 30) continue;
        return { x, y };
      }
      return null;
    },
    add(g, M, c, at = null) {
      const p = at || this.spot(g, M, c);
      if (!p) return;
      const s = { x: p.x, y: p.y, r: c.r, id: newId(g) };
      M.list.push(s);
      g.effects.prop(s.id, 'stool', s.x, s.y, U.rand(-1, 1), 0, 9999, c.color);
      if (g.state === 'play') g.effects.burst(s.x, s.y, 2, '#d9cbb0', 6, 40, 0.3);
    },
    // ghế vỡ: số ghế trên sân + đang cầm + đang bay giữ nguyên c.n -> respawn giây sau đặt ghế mới
    broke(g, M, c) { M.list.push({ dead: true, back: c.respawn }); },
    pick(g, M, c, p, s) {
      M.list.splice(M.list.indexOf(s), 1);
      g.effects.propOff(s.id, 0.05);
      p.carry = { id: newId(g), t: 0 };
      g.effects.prop(p.carry.id, 'stoolheld', p.x, p.y, p.id, 0, 9999, c.color);
      g.sfx('ult', 'mod.grab');
      if (p.team !== M.team) bark(g, 'mod');
    },
    drop(g, M, c, p) {
      if (!p.carry) return;
      g.effects.propOff(p.carry.id, 0.05);
      p.carry = null;
      this.add(g, M, c, { x: p.x + U.rand(-6, 6), y: p.y + 6 });
    },
    // ném ghế theo hướng (dx, dy) (không có: hướng đang nhìn). Human.update (phím ra đòn) + AI bên dưới gọi
    throw(g, M, c, p, dx, dy) {
      if (!p.carry || p.state !== 'normal') return false;
      const d = dx || dy ? U.norm(dx, dy) : { x: Math.cos(p.facing), y: Math.sin(p.facing) };
      p.facing = Math.atan2(d.y, d.x);
      g.effects.propOff(p.carry.id, 0.02);
      p.carry = null;
      p.freeze(0.08);
      const life = c.throwRange / c.throwSpeed, id = newId(g);
      M.flying.push({ x: p.x + d.x * 8, y: p.y + d.y * 8, d, t: 0, life, id, team: p.team, src: p });
      g.effects.prop(id, 'stoolthrow', p.x + d.x * 8, p.y + d.y * 8, p.facing, c.throwSpeed, life, c.color);
      g.sfx('swing');
      return true;
    },
    clock(g, M, c, dt) { for (const f of M.flying) f.t += dt; },
    // AI cầm ghế: ném vào đối thủ đang cầm bóng trong tầm, hoặc người gần nhất khi đã cầm lâu
    ai(g, M, c, p, dt) {
      p.carry.t += dt;
      const foes = g.teams[1 - p.team].players.filter((o) => grounded(o) && o.state !== 'stun');
      let tgt = null, best = c.throwRange * 0.85;
      for (const o of foes) {
        const d = Math.hypot(o.x - p.x, o.y - p.y);
        const want = o.hasBall ? best : p.carry.t > c.aiHold ? best * 0.7 : 0;
        if (d < want) { tgt = o; best = d; }
      }
      if (!tgt && p.carry.t > c.aiHold * 3 && foes.length) tgt = foes.reduce((a, o) => (Math.hypot(o.x - p.x, o.y - p.y) < Math.hypot(a.x - p.x, a.y - p.y) ? o : a));
      if (tgt && p.team === M.team) M.aiNext = g.time + c.aiGap;
      if (tgt) {
        const lead = Math.hypot(tgt.x - p.x, tgt.y - p.y) / c.throwSpeed;
        this.throw(g, M, c, p, tgt.x + tgt.vx * lead - p.x, tgt.y + tgt.vy * lead - p.y);
      }
    },
    // AI đội chủ luật (các chú): ai không phải người gần bóng nhất, tay không, có ghế trong tầm aiSeek -> chạy đi nhặt ghế
    aiMove(g, M, c, p) {
      if (p.team !== M.team || p.hasBall || p.carry || p.state !== 'normal') return false;
      const b = g.ball, tp = g.teams[M.team].players;
      if (tp.some((q) => q.carry) || g.time < (M.aiNext || 0)) return false;   // mỗi lúc chỉ 1 chú cầm ghế, ném xong nghỉ aiGap giây
      const chaser = tp.reduce((a, q) => (Math.hypot(q.x - b.x, q.y - b.y) < Math.hypot(a.x - b.x, a.y - b.y) ? q : a));
      if (chaser === p) return false;
      let s = null, best = c.aiSeek;
      for (const x of M.list) { if (x.dead) continue; const d = Math.hypot(x.x - p.x, x.y - p.y); if (d < best) { best = d; s = x; } }
      if (!s) return false;
      const d = U.norm(s.x - p.x, s.y - p.y);
      p.intent.mx = d.x; p.intent.my = d.y; p.intent.sprint = true;
      return true;
    },
    update(g, M, c, dt) {
      const b = g.ball, E = g.effects;
      for (const s of M.list.slice()) if (s.dead && (s.back -= dt) <= 0) { M.list.splice(M.list.indexOf(s), 1); this.add(g, M, c); }
      // người cầm ghế: không nhận bóng, bị choáng là rơi ghế, AI tự ném
      for (const p of g.players) {
        if (!p.carry) continue;
        if (p.state === 'stun' || !grounded(p)) { this.drop(g, M, c, p); continue; }
        b.noPickup.set(p.id, 0.1);
        if (!(g.isHuman(p.team) && p.isControlled)) this.ai(g, M, c, p, dt);
      }
      for (const s of M.list.slice()) {
        if (s.dead) continue;
        for (const q of g.players) {
          if (!grounded(q)) continue;
          const dx = q.x - s.x, dy = q.y - s.y, d = Math.hypot(dx, dy), min = s.r + q.radius;
          if (d >= min + c.pickPad) continue;
          // không cầm bóng, không cầm ghế: nhặt lên
          if (!q.hasBall && !q.carry && q.state === 'normal' && !q.chickenT) { this.pick(g, M, c, q, s); break; }
          if (d < min && d > 0.01) { q.x = s.x + (dx / d) * min; q.y = s.y + (dy / d) * min; }
        }
        if (!M.list.includes(s) || b.owner || b.z > c.h) continue;
        const dx = b.x - s.x, dy = b.y - s.y, d = Math.hypot(dx, dy) || 0.01, min = s.r + b.r;
        if (d >= min) continue;
        const nx = dx / d, ny = dy / d, dot = b.vx * nx + b.vy * ny, spd = Math.hypot(b.vx, b.vy);
        if (spd >= c.breakSpeed) {
          // sút mạnh: ghế vỡ văng theo hướng bóng, bóng mất ít lực rồi bay tiếp
          M.list.splice(M.list.indexOf(s), 1);
          this.broke(g, M, c);
          E.propOff(s.id);
          E.prop(newId(g), 'stoolfly', s.x, s.y, Math.atan2(b.vy, b.vx), 0, 0.8, c.color);
          E.burst(s.x, s.y, 6, c.color, 12, 110, 0.5);
          E.pop(s.x, s.y - 18, 'CRACK!', 'heavy', '#ffffff');
          g.sfx('ult', 'mod.stool');
          b.vx *= 0.75; b.vy *= 0.75;
          continue;
        }
        if (dot < 0) {
          b.vx -= 1.8 * dot * nx; b.vy -= 1.8 * dot * ny;
          if (dot < -60) { E.burst(b.x, b.y, b.z, '#ffffff', 4, 50, 0.25); g.sfx('ult', 'mod.thunk'); }
        }
        b.x = s.x + nx * min; b.y = s.y + ny * min;
      }
      // ghế đang bay: trúng người đội kia = choáng + rơi bóng, ghế vỡ; hết tầm = rơi xuống sân
      const f = g.field;
      for (const fl of M.flying.slice()) {
        const k = Math.min(fl.t, fl.life), x = fl.x + fl.d.x * c.throwSpeed * k, y = fl.y + fl.d.y * c.throwSpeed * k;
        let done = false;
        for (const o of g.teams[1 - fl.team].players) {
          if (!grounded(o) || Math.hypot(o.x - x, o.y - y) > c.r + o.radius) continue;
          if (Act().dodged(g, o)) continue;
          done = true;
          if (o.hit({ stun: c.stun, kbx: fl.d.x * c.knock, kby: fl.d.y * c.knock, source: fl.src, type: 'hard' })) {
            if (o.team !== M.team) M.hits++;
            E.pop(o.x, o.y - 30, 'BONK!', 'heavy', '#ffe14f');
            E.shake(3, 0.2);
            g.hitStop(0.06);
            g.sfx('hit');
            if (o.team === M.team) bark(g, 'mod', o);
          }
          break;
        }
        const out = x < f.x + 6 || x > f.x + f.w - 6 || y < f.y + 6 || y > f.y + f.h - 6;
        if (done || out) {
          M.flying.splice(M.flying.indexOf(fl), 1);
          E.propOff(fl.id, 0.02);
          E.burst(x, y, 6, c.color, 14, 110, 0.5);
          E.burst(x, y, 6, '#ffffff', 6, 80, 0.3);
          g.sfx('ult', 'mod.stool');
          this.broke(g, M, c);
        } else if (fl.t >= fl.life) {
          M.flying.splice(M.flying.indexOf(fl), 1);
          E.propOff(fl.id, 0.02);
          g.sfx('ult', 'mod.thunk');
          this.add(g, M, c, { x, y });
        }
      }
    },
  };

  /* Block Wardens — KHỔNG LỒ: cả đội to gấp scale lần, mạnh hơn, chậm hơn một chút. Đấm nhẹ không có tác dụng (bật ra, TOO BIG!),
   * phải dùng đòn nặng. Bị dẫn: to thêm (rageScale). Hook từ actions.js lightHit -> MatchMods.shrug */
  K.giants = {
    create(g, M, c) {
      for (const p of g.teams[M.team].players) {
        p.stats = Object.assign({}, p.stats, { power: p.stats.power * c.power, tackle: p.stats.tackle * c.power, speed: p.stats.speed * c.speed });
      }
    },
    update(g, M, c) {
      const sc = behind(g) ? c.rageScale : c.scale;
      if (behind(g) && !M.rage) {
        M.rage = true;
        g.emit('banner', { text: c.rage, sub: c.rageHint, color: '#ff3d5a' });
        g.sfx('ult', 'mod.stomp');
        for (const p of g.teams[M.team].players) g.effects.burst(p.x, p.y - 10, 8, '#ff3d5a', 12, 80, 0.5);
      }
      // giữ cỡ to mỗi bước (Player.sizeT hết là về 1; Tuyệt kỹ teo nhỏ vẫn đè được trong lúc nó chạy)
      for (const p of g.teams[M.team].players) if (!(p.sizeT > 0.25) || p.sizeTarget >= 1) { p.sizeTarget = Math.max(p.sizeTarget, sc); p.sizeT = Math.max(p.sizeT, 0.2); }
    },
  };
  /* Moped Boys — LÀN GIAO HÀNG: làn dọc sân gần bóng nhấp nháy rồi xe máy phóng qua */
  K.mopeds = {
    create(g, M, c) { M.runs = []; M.next = c.first; },
    kickoff(g, M, c) { M.runs = []; M.next = Math.max(M.next, c.first); },
    clock(g, M, c, dt) { for (const r of M.runs) r.t += dt; },
    spawn(g, M, c) {
      const f = g.field, b = g.ball;
      const x = U.clamp(b.x + U.rand(-70, 70), f.x + f.boxDepth + 14, f.x + f.w - f.boxDepth - 14);
      const dir = Math.random() < 0.5 ? 1 : -1;
      const y0 = dir > 0 ? f.y - 26 : f.y + f.h + 26, y1 = dir > 0 ? f.y + f.h + 26 : f.y - 26;
      const life = c.warn + Math.abs(y1 - y0) / c.speed;
      const r = { x, y0, y1, dir, t: 0, life, hits: new Set(), id: newId(g) };
      M.runs.push(r);
      g.effects.prop(newId(g), 'lane', x, f.y, f.y + f.h, c.warn, life, c.color);
      g.effects.prop(r.id, 'moped', x, y0, y1, c.warn, life, g.teams[M.team].cfg.kit.shirt);
      g.sfx('ult', 'mod.honk');
    },
    update(g, M, c, dt) {
      if ((M.next -= dt * (behind(g) ? c.trailing : 1)) <= 0) { M.next = U.rand(c.every[0], c.every[1]); this.spawn(g, M, c); }
      const b = g.ball, E = g.effects;
      for (const r of M.runs) {
        if (r.t < c.warn) continue;
        const pos = mopedAt({ x: r.x, y: r.y0, a: r.y1, b: c.warn, max: r.life }, r.t);
        for (const q of g.players) {
          if (r.hits.has(q.id) || !grounded(q)) continue;
          if (Math.abs(q.x - pos.x) > c.r + q.radius || Math.abs(q.y - pos.y) > c.r + q.radius) continue;
          r.hits.add(q.id);
          if (q.team === M.team) {   // Moped Boys quá giang: chạy nhanh hơn một lúc
            q.buffs.push({ speed: c.boost, t: c.boostT });
            E.burst(q.x, q.y, 2, '#ffd23f', 8, 60, 0.4);
            E.pop(q.x, q.y - 30, 'VROOM!', 'status', '#ffd23f');
            g.sfx('ult', 'mod.vroom');
            continue;
          }
          if (Act().dodged(g, q)) continue;
          const side = Math.sign(q.x - pos.x) || (Math.random() < 0.5 ? -1 : 1);
          if (q.hit({ stun: c.stun, kbx: side * c.knock, kby: r.dir * c.knock * 0.5, type: 'hard' })) {
            M.hits++;
            E.pop(q.x, q.y - 30, 'HONK!', 'heavy', '#ffd23f');
            E.burst(q.x, q.y, 6, '#ffffff', 10, 90, 0.4);
            E.shake(3, 0.2);
            g.hitStop(0.05);
            g.sfx('hit');
            bark(g, 'mod');
          }
        }
        // bóng lăn trên làn: bị xe hất văng theo chiều xe chạy
        if (!b.owner && b.z < 16 && !r.ballHit && Math.abs(b.x - pos.x) < c.r + b.r && Math.abs(b.y - pos.y) < c.r + b.r) {
          r.ballHit = true;
          b.vx = (Math.sign(b.x - pos.x) || 1) * c.ballKick * 0.5; b.vy = r.dir * c.ballKick; b.vz = 70;
          b.lastKickTeam = -1;
          E.burst(b.x, b.y, 4, '#ffd23f', 8, 70, 0.3);
        }
      }
      M.runs = M.runs.filter((r) => r.t < r.life);
    },
  };

  /* School Ghosts — MA MỜ: render đọc alpha(); chuông trường reo thì 2 con ma đổi chỗ */
  K.ghosts = {
    create(g, M, c) { M.bell = c.first; },
    update(g, M, c, dt) {
      if ((M.bell -= dt * (behind(g) ? c.trailing : 1)) > 0) return;
      M.bell = U.rand(c.bell[0], c.bell[1]);
      const E = g.effects, f = g.field;
      const list = g.teams[M.team].players.filter((q) => !q.hasBall && q.state === 'normal' && grounded(q));
      g.sfx('ult', 'mod.bell');
      E.pop(f.cx, f.y - 6, 'RING RING!', 'info', '#e8ecf5');
      if (list.length < 2) return;
      const a = U.pick(list), q = U.pick(list.filter((x) => x !== a));
      for (const p of [a, q]) { E.burst(p.x, p.y - 8, 6, '#9d7bff', 14, 70, 0.5); E.burst(p.x, p.y - 8, 6, '#e8ecf5', 8, 50, 0.4); }
      [a.x, a.y, q.x, q.y] = [q.x, q.y, a.x, a.y];
      a.vx = a.vy = q.vx = q.vy = 0;
      for (const p of [a, q]) E.pop(p.x, p.y - 30, 'POOF!', 'status', '#9d7bff');
      bark(g, 'mod', a);
    },
  };

  /* Block Wardens — ĐÈN PHA: đội bạn cầm bóng trong đèn đủ lâu thì FREEZE (choáng + rơi bóng); Wardens bị dẫn thì bật thêm 1 đèn */
  K.searchlight = {
    create(g, M, c) { M.lights = [this.light(g, 0, U.rand(0, 20))]; },
    light(g, ph, T) { return { ph, T, id: 0, pause: 0, held: 0, alarm: 0, who: null }; },
    kickoff(g, M, c) {
      for (const L of M.lights) { L.pause = 0; L.held = 0; L.alarm = 0; L.who = null; this.show(g, M, c, L); }
    },
    // đèn đang quét: prop 'spot' a = 0, (x, y) = (pha, mốc thời gian) -> MatchMods.at tính vị trí theo tuổi vật thể
    show(g, M, c, L) {
      L.id = newId(g);
      g.effects.prop(L.id, 'spot', L.ph, L.T, 0, 0, 9999, c.color);
    },
    clock(g, M, c, dt) { for (const L of M.lights) if (!(L.pause > 0)) L.T += dt; },
    update(g, M, c, dt) {
      const E = g.effects, b = g.ball;
      // Wardens bị dẫn: LOCKDOWN — bật đèn thứ 2 (1 lần mỗi trận)
      if (behind(g) && M.lights.length < 2) {
        const L = this.light(g, Math.PI, M.lights[0].T);   // pha lệch nửa vòng: đèn 2 quét đối xứng đèn 1 theo chiều ngang
        M.lights.push(L);
        this.show(g, M, c, L);
        g.emit('banner', { text: c.lockdown, sub: c.lockdownHint, color: '#ff3d5a' });
        g.sfx('ult', 'mod.siren');
      }
      for (const L of M.lights) {
        if (L.pause > 0) {
          if ((L.pause -= dt) <= 0) this.show(g, M, c, L);
          continue;
        }
        const at = lightAt(c, L.T, L.ph), o = b.owner;
        const inside = o && o.team !== M.team && grounded(o) && Math.hypot((o.x - at.x) * 0.9, (o.y - at.y) * 1.6) < c.r;
        if (!inside || o !== L.who) {
          if (L.alarm) { E.propOff(L.alarm); L.alarm = 0; }
          L.held = 0; L.who = inside ? o : null;
          if (!inside) continue;
        }
        if (!L.alarm) {   // bắt đầu bị soi: vòng đỏ đếm ngược quanh chân người cầm bóng
          L.alarm = newId(g);
          E.prop(L.alarm, 'alarm', o.x, o.y, o.id, c.catchT, c.catchT + 0.3, '#ff3d5a');
          g.sfx('ult', 'mod.beep');
        }
        if ((L.held += dt) < c.catchT) continue;
        // FREEZE: đèn đứng lại đỏ rực, người cầm bóng choáng + rơi bóng (lướt né được)
        E.propOff(L.alarm); L.alarm = 0; L.held = 0; L.who = null;
        E.propOff(L.id, 0.1);
        L.pause = c.pause;
        L.id = newId(g);
        E.prop(L.id, 'spot', at.x, at.y, 1, 0, c.pause, '#ff3d5a');
        g.sfx('whistle');
        g.sfx('ult', 'mod.siren');
        if (Act().dodged(g, o)) continue;
        if (o.hit({ stun: c.stun, kbx: 0, kby: 0, type: 'hard' })) {
          M.hits++;
          E.pop(o.x, o.y - 30, 'FREEZE!', 'status', '#ff3d5a');
          E.burst(o.x, o.y - 8, 6, '#bfe8ff', 12, 60, 0.5);
          E.flash(0.25);
          bark(g, 'mod');
        }
      }
    },
  };

  /* ================= Story 2–4 (2026-10-19) ================= */
  const Stat = () => SFC.CoreStat;   // trạng thái dùng chung của Tuyệt kỹ (cores-ult2.js): trơn té, teo nhỏ
  const victims = (g) => g.teams[1 - g.mod.team].players;
  // điểm ngẫu nhiên quanh (x, y) bán kính r, trong sân cách mép m
  function near(g, x, y, r, m = 16) {
    const f = g.field;
    return { x: U.clamp(x + U.rand(-r, r), f.x + m, f.x + f.w - m), y: U.clamp(y + U.rand(-r, r), f.y + m, f.y + f.h - m) };
  }
  // hẹn giờ lặp: M.next đếm lùi, đội chủ luật bị dẫn thì nhanh x trailing. true = tới lượt
  function every(g, M, c, dt) {
    if ((M.next -= dt * (behind(g) ? c.trailing || 1 : 1)) > 0) return false;
    M.next = U.rand(c.every[0], c.every[1]);
    return true;
  }
  // hệ số tốc độ giữ liên tục (gọi mỗi bước): mỗi luật chỉ 1 buff trên người, gia hạn thay vì chồng thêm (Player.buffs nhân dồn)
  function keepSpeed(p, speed) {
    const b = p.buffs.find((x) => x.mod === 1);
    if (b) { b.speed = speed; b.t = 0.05; } else p.buffs.push({ speed, t: 0.05, mod: 1 });
  }
  // đội trưởng đội chủ luật (người nói câu "mod")
  const captain = (g) => { const tp = g.teams[g.mod.team].players; return tp[tp.length - 1]; };

  /* Pigeon Gang — BỒ CÂU: đàn chim bay ngang sân thả "bom" (bóng trắng rơi có vòng báo trước), bãi phân nằm lại một lúc.
   * Đội bạn dẫm phải: trơn té. Bồ câu thì không sao */
  K.pigeons = {
    create(g, M, c) { M.next = c.first; M.drops = []; M.splats = []; },
    kickoff(g, M) { M.drops = []; M.splats = []; },
    clock(g, M, c, dt) { for (const d of M.drops) d.t += dt; },
    update(g, M, c, dt) {
      const E = g.effects, f = g.field, b = g.ball;
      if (every(g, M, c, dt)) {
        const dir = Math.random() < 0.5 ? 1 : -1, y = U.clamp(b.y + U.rand(-30, 30), f.y + 24, f.y + f.h - 24);
        const x0 = dir > 0 ? f.x - 30 : f.x + f.w + 30, x1 = dir > 0 ? f.x + f.w + 30 : f.x - 30;
        E.prop(newId(g), 'flock', x0, y - 40, x1, 0, Math.abs(x1 - x0) / c.flySpeed, '#9aa0a8');
        g.sfx('ult', 'mod.coo');
        for (let i = 0; i < c.n; i++) {
          const p = near(g, b.x, y, c.spread), tFly = Math.abs(p.x - x0) / c.flySpeed, id = newId(g);
          M.drops.push({ x: p.x, y: p.y, t: -(tFly + c.fall) });
          E.prop(id, 'splatfall', p.x, p.y, c.fall, 0, tFly + c.fall, '#f3ead7');
        }
      }
      for (const d of M.drops.slice()) {
        if (d.t < 0) continue;
        M.drops.splice(M.drops.indexOf(d), 1);
        const s = { x: d.x, y: d.y, t: c.life, id: newId(g) };
        M.splats.push(s);
        E.prop(s.id, 'splat', s.x, s.y, U.rand(0, 6), 0, c.life, '#f3ead7');
        E.burst(s.x, s.y, 1, '#f3ead7', 6, 50, 0.3);
        g.sfx('ult', 'mod.splat');
      }
      for (const s of M.splats.slice()) {
        if ((s.t -= dt) <= 0) { M.splats.splice(M.splats.indexOf(s), 1); continue; }
        for (const o of victims(g)) {
          if (!grounded(o) || o.state !== 'normal' || Math.hypot(o.x - s.x, (o.y - s.y) * 1.5) > c.r + o.radius) continue;
          if (Stat().slip(g.cores, o, c.stun, null, c.slide)) {
            M.hits++;
            E.propOff(s.id, 0.2);
            M.splats.splice(M.splats.indexOf(s), 1);
            bark(g, 'mod');
          }
          break;
        }
      }
    },
  };

  /* Sky Hoppers — GIÓ ĐÊM: báo trước warn giây (vệt gió + chữ hướng gió) rồi cơn gió dọc sân len giây: bóng bị thổi trôi, đội bạn bị đẩy lùi,
   * Sky Hoppers chạy xuôi gió thì nhanh hơn. Họ bị dẫn: gió hay thổi về khung thành đội bạn. Lá bài THE STORM (Fortune Tellers) dùng lại start/tick */
  K.wind = {
    create(g, M, c) { M.next = c.first; M.gust = null; },
    kickoff(g, M) { M.gust = null; },
    start(g, M, c, dir, len) {
      M.gust = { dir, t: -c.warn, len };
      const f = g.field;
      g.effects.prop(newId(g), 'wind', dir, 0, c.warn, 0, c.warn + len, '#bfe8ff');
      g.effects.pop(f.cx, f.y - 6, dir > 0 ? 'WIND >>' : '<< WIND', 'info', '#bfe8ff');
      g.sfx('ult', 'mod.wind');
    },
    tick(g, M, c, dt) {
      const G = M.gust;
      if (!G || (G.t += dt) < 0) return;
      if (G.t >= G.len) { M.gust = null; return; }
      const b = g.ball;
      if (!b.owner) b.vx += G.dir * c.ballPush * dt;
      for (const p of g.players) {
        if (!grounded(p)) continue;
        if (p.team === M.team && M.id === 'wind') { if (p.vx * G.dir > 0) keepSpeed(p, c.boost); }
        else if (p.team !== M.team) p.x += G.dir * c.push * dt;
      }
    },
    update(g, M, c, dt) {
      if (!M.gust && every(g, M, c, dt)) {
        const toYou = g.ownGoal(1 - M.team).x > g.field.cx ? 1 : -1;   // hướng về khung thành đội bạn
        this.start(g, M, c, behind(g) && Math.random() < 0.75 ? toYou : Math.random() < 0.5 ? 1 : -1, c.len);
        bark(g, 'mod');
      }
      this.tick(g, M, c, dt);
    },
  };

  /* Billboard Kids — TƯỜNG GRAFFITI: phun sơn 1 bức tường chắn ngang giữa bóng và khung thành bạn đang tấn công (báo trước warn giây),
   * tường chặn bóng + chặn đội bạn trong life giây. Billboard Kids đi xuyên (họ biết lối) */
  K.graffiti = {
    create(g, M, c) { M.next = c.first; M.walls = []; },
    kickoff(g, M) { M.walls = []; },
    clock(g, M, c, dt) { for (const w of M.walls) w.t += dt; },
    update(g, M, c, dt) {
      const E = g.effects, f = g.field, b = g.ball;
      if (every(g, M, c, dt)) {
        const goal = g.attackGoal(1 - M.team), d = U.norm(goal.x - b.x, goal.y - b.y);
        const cx = U.clamp(b.x + d.x * c.ahead, f.x + 30, f.x + f.w - 30), cy = U.clamp(b.y + d.y * c.ahead, f.y + 20, f.y + f.h - 20);
        const nx = -d.y, ny = d.x, h = c.len / 2, col = U.pick(c.colors);
        const w = { x0: cx - nx * h, y0: cy - ny * h, x1: cx + nx * h, y1: cy + ny * h, t: -c.warn, on: false, col };
        M.walls.push(w);
        E.prop(newId(g), 'graffitiwarn', w.x0, w.y0, w.x1, w.y1, c.warn, col);
        g.sfx('ult', 'mod.spray');
      }
      for (const w of M.walls.slice()) {
        if (w.t < 0) continue;
        if (!w.on) { w.on = true; w.id = newId(g); E.prop(w.id, 'graffiti', w.x0, w.y0, w.x1, w.y1, c.life, w.col); bark(g, 'mod'); }
        if (w.t >= c.life) { M.walls.splice(M.walls.indexOf(w), 1); continue; }
        // điểm gần nhất trên đoạn tường
        const close = (x, y) => {
          const vx = w.x1 - w.x0, vy = w.y1 - w.y0, k = U.clamp(((x - w.x0) * vx + (y - w.y0) * vy) / (vx * vx + vy * vy), 0, 1);
          return { x: w.x0 + vx * k, y: w.y0 + vy * k };
        };
        for (const o of victims(g)) {
          if (!grounded(o)) continue;
          const q = close(o.x, o.y), dx = o.x - q.x, dy = o.y - q.y, dd = Math.hypot(dx, dy), min = o.radius + 3;
          if (dd < min && dd > 0.01) { o.x = q.x + (dx / dd) * min; o.y = q.y + (dy / dd) * min; }
        }
        if (b.owner || b.z > 22) continue;
        const q = close(b.x, b.y), dx = b.x - q.x, dy = b.y - q.y, dd = Math.hypot(dx, dy) || 0.01, min = b.r + 3;
        if (dd >= min) continue;
        const nx = dx / dd, ny = dy / dd, dot = b.vx * nx + b.vy * ny;
        if (dot < 0) { b.vx -= 1.8 * dot * nx; b.vy -= 1.8 * dot * ny; if (dot < -60) { E.burst(b.x, b.y, b.z, w.col, 6, 60, 0.3); g.sfx('wall'); } }
        b.x = q.x + nx * min; b.y = q.y + ny * min;
      }
    },
  };

  /* Lantern Crew — ĐÈN LỒNG RƠI: đèn lồng rơi gần bóng (bóng đổ to dần warn giây), đập xuống: đội bạn trong vòng r choáng + văng + rơi bóng
   * (lướt né được). Lantern Crew không sao (họ treo đèn mà). Họ bị dẫn: rơi 2 cái một lúc */
  K.lanterns = {
    create(g, M, c) { M.next = c.first; M.falls = []; },
    kickoff(g, M) { M.falls = []; },
    clock(g, M, c, dt) { for (const d of M.falls) d.t += dt; },
    update(g, M, c, dt) {
      const E = g.effects, b = g.ball;
      if (every(g, M, c, dt)) {
        for (let i = 0, n = behind(g) ? 2 : 1; i < n; i++) {
          const p = near(g, b.x + b.vx * 0.5, b.y + b.vy * 0.5, c.spread);
          M.falls.push({ x: p.x, y: p.y, t: -c.warn });
          E.prop(newId(g), 'lantern', p.x, p.y, c.warn, 0, c.warn + 0.6, U.pick(c.colors));
        }
        g.sfx('ult', 'mod.fall');
      }
      for (const d of M.falls.slice()) {
        if (d.t < 0) continue;
        M.falls.splice(M.falls.indexOf(d), 1);
        E.burst(d.x, d.y, 4, '#ff9a3d', 18, 120, 0.6);
        E.burst(d.x, d.y, 4, '#ffe14f', 8, 80, 0.4);
        E.wave(d.x, d.y, c.r + 6, '#ff9a3d', 0.35, 2);
        E.shake(2, 0.15);
        g.sfx('ult', 'mod.crash');
        let hit = false;
        for (const o of victims(g)) {
          if (!grounded(o) || Math.hypot(o.x - d.x, o.y - d.y) > c.r + o.radius || Act().dodged(g, o)) continue;
          const n = U.norm(o.x - d.x || 0.1, o.y - d.y);
          if (o.hit({ stun: c.stun, kbx: n.x * c.knock, kby: n.y * c.knock, type: 'hard' })) { M.hits++; hit = true; E.pop(o.x, o.y - 30, 'CRASH!', 'heavy', '#ff9a3d'); }
        }
        if (!b.owner && b.z < 10 && Math.hypot(b.x - d.x, b.y - d.y) < c.r) { const n = U.norm(b.x - d.x || 0.1, b.y - d.y); b.vx = n.x * 180; b.vy = n.y * 180; b.vz = 60; }
        if (hit) bark(g, 'mod');
      }
    },
  };

  /* Noodle Kickers — BÓNG NÓNG: thỉnh thoảng bóng nóng rực time giây. Đội bạn cầm bóng nóng quá holdMax giây (vòng cam đếm ngược) là bỏng:
   * choáng + rơi bóng. Noodle Kickers cầm thoải mái (dân nấu bếp). Bắt chuyền nhanh */
  K.hotball = {
    create(g, M, c) { M.next = c.first; M.hot = 0; M.held = 0; M.who = null; M.alarm = 0; },
    kickoff(g, M) { M.hot = 0; M.held = 0; M.who = null; M.alarm = 0; },
    update(g, M, c, dt) {
      const E = g.effects, b = g.ball;
      if (!(M.hot > 0)) {
        if (!every(g, M, c, dt)) return;
        M.hot = c.time; M.hotId = newId(g);
        E.prop(M.hotId, 'hot', b.x, b.y, 0, 0, c.time, '#ff6a3d');
        E.pop(b.x, b.y - 18, 'HOT!', 'status', '#ff6a3d');
        g.sfx('ult', 'mod.sizzle');
        bark(g, 'mod');
        return;
      }
      if ((M.hot -= dt) <= 0) {
        if (M.alarm) E.propOff(M.alarm);
        M.alarm = 0; M.held = 0; M.who = null;
        E.pop(b.x, b.y - 18, 'COOL', 'info', '#bfe8ff');
        return;
      }
      const o = b.owner, mine = o && o.team !== M.team;
      if (!mine || o !== M.who) {
        if (M.alarm) { E.propOff(M.alarm); M.alarm = 0; }
        M.held = 0; M.who = mine ? o : null;
        if (!mine) return;
        M.alarm = newId(g);
        E.prop(M.alarm, 'alarm', o.x, o.y, o.id, c.holdMax, c.holdMax + 0.3, '#ff6a3d');
      }
      if ((M.held += dt) < c.holdMax) return;
      E.propOff(M.alarm); M.alarm = 0; M.held = 0; M.who = null;
      o.hitImmune = 0;
      if (o.hit({ stun: c.stun, kbx: U.rand(-1, 1) * 60, kby: U.rand(-1, 1) * 60, type: 'fire' })) {
        M.hits++;
        E.pop(o.x, o.y - 30, 'OUCH!', 'heavy', '#ff6a3d');
        E.burst(o.x, o.y - 8, 6, '#ff6a3d', 12, 70, 0.5);
        g.sfx('fire');
      }
    },
  };

  /* Fortune Tellers — LÁ BÀI: mỗi every giây rút 1 lá, tác dụng time giây (banner tên lá + gợi ý):
   * THE MOUSE: đội bạn teo nhỏ (Stat.tiny) · THE STORM: 1 cơn gió (dùng lại K.wind với số liệu mods.wind) · THE STAR: Fortune Tellers chạy nhanh */
  K.fortune = {
    create(g, M, c) { M.next = c.first; M.card = null; M.gust = null; },
    kickoff(g, M) { M.card = null; M.gust = null; },
    update(g, M, c, dt) {
      const W = S().mods.wind;
      if (M.card) {
        if (M.card.id === 'storm') K.wind.tick(g, M, W, dt);
        if (M.card.id === 'star') for (const p of g.teams[M.team].players) keepSpeed(p, c.starSpeed);
        if ((M.card.t -= dt) <= 0) M.card = null;
        return;
      }
      if (!every(g, M, c, dt)) return;
      const list = c.cards.filter((x) => x.id !== M.last), card = U.pick(list);
      M.last = card.id;
      M.card = { id: card.id, t: c.time };
      g.emit('banner', { text: card.name, sub: card.hint, color: '#9d7bff' });
      g.sfx('ult', 'mod.card');
      const cap = captain(g);
      if (cap) g.effects.burst(cap.x, cap.y - 14, 8, '#9d7bff', 16, 80, 0.6);
      bark(g, 'mod');
      if (card.id === 'mouse') for (const o of victims(g)) Stat().tiny(g.cores, o, c.time, c.tinySize, c.tinySlow);
      if (card.id === 'storm') K.wind.start(g, M, W, Math.random() < 0.5 ? 1 : -1, c.time);
      if (card.id === 'star') for (const p of g.teams[M.team].players) { g.effects.burst(p.x, p.y - 10, 8, '#ffd23f', 12, 70, 0.5); g.effects.pop(p.x, p.y - 30, 'STAR!', 'status', '#ffd23f'); }
    },
  };

  /* Market Mamas — SẠP CHỢ LẤN SÂN: sạp hàng đẩy ra từ mép trên / dưới (gần bóng), báo trước warn giây rồi thành khối đặc life giây:
   * người bị đẩy ra, bóng dội lại. Họ bị dẫn: 2 sạp cùng lúc (trên + dưới) bóp sân lại */
  K.stalls = {
    create(g, M, c) { M.next = c.first; M.stalls = []; },
    kickoff(g, M) { M.stalls = []; },
    clock(g, M, c, dt) { for (const s of M.stalls) s.t += dt; },
    update(g, M, c, dt) {
      const E = g.effects, f = g.field, b = g.ball;
      if (every(g, M, c, dt)) {
        const sides = behind(g) ? [-1, 1] : [Math.random() < 0.5 ? -1 : 1];
        const x = U.clamp(b.x, f.x + c.w / 2 + 10, f.x + f.w - c.w / 2 - 10);
        for (const side of sides) {
          const edge = side < 0 ? f.y + c.depth : f.y + f.h - c.depth;
          const s = { x0: x - c.w / 2, x1: x + c.w / 2, edge, side, t: -c.warn, on: false };
          M.stalls.push(s);
          E.prop(newId(g), 'stallwarn', s.x0, edge, s.x1, side, c.warn, '#ff8a3f');
        }
        g.sfx('ult', 'mod.cart');
        bark(g, 'mod');
      }
      for (const s of M.stalls.slice()) {
        if (s.t < 0) continue;
        if (!s.on) { s.on = true; E.prop(newId(g), 'stall', s.x0, s.edge, s.x1, s.side, c.life, U.pick(c.colors)); E.shake(2, 0.15); g.sfx('wall'); }
        if (s.t >= c.life) { M.stalls.splice(M.stalls.indexOf(s), 1); continue; }
        const inside = (x, y, r) => x > s.x0 - r && x < s.x1 + r && (s.side < 0 ? y < s.edge + r : y > s.edge - r);
        for (const p of g.players) if (grounded(p) && inside(p.x, p.y, p.radius)) p.y = s.edge - s.side * p.radius;
        if (!b.owner && b.z < 26 && inside(b.x, b.y, b.r)) {
          b.y = s.edge - s.side * b.r;
          if (b.vy * s.side > 0) b.vy = -b.vy * 0.8;
        }
      }
    },
  };

  /* Rust Buckets — THUỶ TRIỀU: nước dâng từ mép trên / dưới (dâng lên warn giây, giữ len giây, rút recede giây), sâu tới depth phần chiều cao sân.
   * Đội bạn lội nước chạy chậm (slow), bóng lăn trong nước nặng hẳn (drag). Dân biển Rust Buckets không sao */
  K.tide = {
    create(g, M, c) { M.next = c.first; M.tide = null; },
    kickoff(g, M) { M.tide = null; },
    clock(g, M, c, dt) { if (M.tide) M.tide.t += dt; },
    // mực nước (px tính từ mép) theo thời gian — sim + vẽ dùng chung (MatchMods.tideLevel)
    level(c, t, f) {
      const full = c.depth * f.h;
      if (t < 0) return full * U.clamp(1 + t / c.warn, 0, 1);
      if (t < c.len) return full;
      return full * U.clamp(1 - (t - c.len) / c.recede, 0, 1);
    },
    update(g, M, c, dt) {
      const f = g.field, b = g.ball;
      if (!M.tide) {
        if (!every(g, M, c, dt)) return;
        M.tide = { side: Math.random() < 0.5 ? -1 : 1, t: -c.warn };
        g.effects.prop(newId(g), 'tide', M.tide.side, 0, 0, 0, c.warn + c.len + c.recede, '#3fa8ff');
        g.sfx('ult', 'mod.wave');
        bark(g, 'mod');
        return;
      }
      const T = M.tide;
      if (T.t >= c.len + c.recede) { M.tide = null; return; }
      if (T.t < 0) return;   // đang dâng: chỉ báo trước, chưa làm chậm
      const lv = this.level(c, T.t, f), wet = (y) => (T.side < 0 ? y < f.y + lv : y > f.y + f.h - lv);
      for (const o of victims(g)) if (grounded(o) && wet(o.y)) keepSpeed(o, c.slow);
      if (!b.owner && b.z < 4 && wet(b.y)) { b.vx = U.damp(b.vx, c.drag, dt); b.vy = U.damp(b.vy, c.drag, dt); }
    },
  };

  /* Retired Refs — TRỌNG TÀI: người chơi (không tính đồng đội AI) ra đòn trúng (choáng) 1 Ref là phạm lỗi: lần lẻ thẻ vàng (cảnh cáo), lần chẵn thẻ đỏ = đứng ngoài redTime giây
   * (choáng tại chỗ, thẻ đỏ trên đầu). Các Ref thì phạm lỗi thoải mái. Hook: Player.hit -> MatchMods.hitBy */
  K.refs = {
    create(g, M) { M.cards = {}; },
    hitBy(g, M, c, victim, opts) {
      const p = opts.source;
      // chỉ người do người chơi điều khiển bị thẻ (đồng đội AI không tự chọn được cách đá)
      if (victim.team !== M.team || !p || p.team === M.team || p.seat == null || !(opts.stun > 0)) return;
      const n = (M.cards[p.id] || 0) + 1, E = g.effects;
      M.cards[p.id] = n;
      g.sfx('whistle');
      if (n % 2) {
        E.prop(newId(g), 'card', p.x, p.y, p.id, 0, c.yellowTime, '#ffd23f');
        E.pop(p.x, p.y - 30, 'FOUL!', 'status', '#ffd23f');
        bark(g, 'mod', victim);
        return;
      }
      g.later(0.05, () => {
        if (g.state !== 'play') return;
        p.hitImmune = 0;
        if (p.state === 'stun') { p.state = 'normal'; p.stateT = 0; }
        if (p.hit({ stun: c.redTime, kbx: 0, kby: 0, type: 'hard' })) {
          M.hits++;
          E.prop(newId(g), 'card', p.x, p.y, p.id, 1, c.redTime, '#ff3d3d');
          E.pop(p.x, p.y - 30, 'RED CARD!', 'heavy', '#ff3d3d');
          g.sfx('whistle', true);
        }
      });
    },
  };

  /* Grandpa's Squad — "HỒI ĐÓ...": các cụ kể chuyện ngày xưa: báo trước warn giây (câu nói + chữ), rồi len giây màn hình ngả màu sepia
   * và đội bạn chạy chậm như phim cũ (slow). Các cụ thì vẫn nhanh nhẹn trong ký ức */
  K.flashback = {
    create(g, M, c) { M.next = c.first; M.fb = null; },
    kickoff(g, M) { M.fb = null; },
    update(g, M, c, dt) {
      const E = g.effects, f = g.field;
      if (!M.fb) {
        if (!every(g, M, c, dt)) return;
        M.fb = { t: -c.warn, on: false };
        M.barkT = 0;
        bark(g, 'mod');
        E.pop(f.cx, f.y - 6, 'BACK IN MY DAY...', 'info', '#d9b77a');
        g.sfx('ult', 'mod.record');
        return;
      }
      const F = M.fb;
      if ((F.t += dt) < 0) return;
      if (!F.on) { F.on = true; E.tint('#a0784a', c.len, 0.3); }
      if (F.t >= c.len) { M.fb = null; return; }
      for (const o of victims(g)) keepSpeed(o, c.slow);
    },
  };

  /* The Legends — NGÔI SAO VÀNG: một Legend thành STAR (hào quang vàng): sút mạnh x power, chạy nhanh x speed trong time giây.
   * Đội bạn cướp được bóng từ tay STAR: người cướp nhận GOLDEN BOOT (cùng sức mạnh) bootTime giây. Hết thì lát sau Legends có STAR mới */
  K.golden = {
    create(g, M, c) { M.next = c.first; M.star = null; M.lastOwner = null; },
    kickoff(g, M, c) { this.clear(g, M); M.next = Math.min(M.next, c.first); M.lastOwner = null; },
    clear(g, M) {
      const st = M.star;
      if (!st) return;
      st.p.stats = Object.assign({}, st.p.stats, { power: st.base });
      g.effects.propOff(st.id);
      M.star = null;
    },
    set(g, M, c, p, mine) {
      this.clear(g, M);
      const st = { p, mine, t: mine ? c.bootTime : c.time, base: p.stats.power, id: newId(g) };
      p.stats = Object.assign({}, p.stats, { power: p.stats.power * c.power });
      M.star = st;
      g.effects.prop(st.id, 'star', p.x, p.y, p.id, mine ? 1 : 0, st.t, '#ffd23f');
      g.effects.pop(p.x, p.y - 34, mine ? 'GOLDEN BOOT!' : 'GOLDEN STAR!', 'move', '#ffd23f');
      g.effects.burst(p.x, p.y - 10, 8, '#ffd23f', 20, 100, 0.6);
      g.sfx('ult', 'mod.star');
    },
    update(g, M, c, dt) {
      const b = g.ball, st = M.star;
      if (!st) {
        if ((M.next -= dt) <= 0) {
          M.next = U.rand(c.every[0], c.every[1]);
          const tp = g.teams[M.team].players;
          this.set(g, M, c, b.owner && b.owner.team === M.team ? b.owner : tp.reduce((a, q) => (Math.hypot(q.x - b.x, q.y - b.y) < Math.hypot(a.x - b.x, a.y - b.y) ? q : a)), false);
          bark(g, 'mod', M.star.p);
        }
      } else {
        keepSpeed(st.p, c.speed);
        if ((st.t -= dt) <= 0) this.clear(g, M);
        // cướp bóng từ STAR: người cầm bóng mới thuộc đội bạn, người cầm trước đó là STAR
        else if (!st.mine && b.owner && b.owner.team !== M.team && M.lastOwner === st.p) { this.set(g, M, c, b.owner, true); bark(g, 'conceded'); }
      }
      if (b.owner) M.lastOwner = b.owner;
    },
  };

  const MatchMods = {
    K,
    // Game constructor gọi trước giao bóng đầu tiên. Không có opts.mod / opts.barks -> null (trận thường)
    create(g) {
      const o = g.opts, c = o.mod && S().mods && S().mods[o.mod];
      if (!c && !o.barks) return null;
      const team = g.humanTeam >= 0 ? 1 - g.humanTeam : 1;
      // opts.mirror: trận "gương" của máy khách online (co-op FOOTBALL STORY) — không tự chạy luật (vật thể / câu nói tới từ host
      // qua lệnh hiệu ứng), chỉ giữ id + config để vẽ (ma mờ: alpha)
      const M = { id: c ? o.mod : null, cfg: c || null, team, barks: o.barks || null, barkT: 0, hits: 0, shown: false, opened: false, mirror: !!o.mirror };
      g.mod = M;
      if (M.mirror) return M;
      if (c && K[M.id].create) K[M.id].create(g, M, c);
      // luật có cách AI riêng (aiMove: true = đã điều khiển cầu thủ này bước này) -> qua móc g.aiHook của AI.update
      if (c && K[M.id].aiMove && !g.aiHook) g.aiHook = (p) => K[M.id].aiMove(g, M, c, p);
      return M;
    },
    kickoff(g) {
      const M = g.mod;
      if (M && M.cfg && !M.mirror && K[M.id].kickoff) K[M.id].kickoff(g, M, M.cfg);
    },
    clock(g, dt) {
      const M = g.mod;
      if (M && M.cfg && !M.mirror && K[M.id].clock) K[M.id].clock(g, M, M.cfg, dt);
    },
    update(g, dt) {
      const M = g.mod;
      if (!M || M.mirror) return;
      // bóng lăn lần đầu: banner tên luật + 1 câu nói mở màn
      if (!M.shown) {
        M.shown = true;
        if (M.cfg) g.emit('banner', { text: M.cfg.name, sub: M.cfg.hint, color: g.teams[M.team].cfg.kit.shirt });
        bark(g, 'kickoff');
      }
      if (M.cfg && K[M.id].update) K[M.id].update(g, M, M.cfg, dt);
    },
    goal(g, scorer, own) {
      const M = g.mod;
      if (!M) return;
      M.barkT = 0;
      bark(g, scorer === M.team ? 'goal' : 'conceded');
    },

    // Human.update: đang cầm ghế (luật ghế nhựa) mà bấm ra đòn -> ném ghế theo hướng mũi tên
    throwCarry(g, p, dx, dy) {
      const M = g.mod;
      return !!(M && M.id === 'stools' && p.carry && K.stools.throw(g, M, M.cfg, p, dx, dy));
    },
    // Player.hit (sau khi người bị đánh choáng): luật trọng tài (Retired Refs) bắt lỗi
    hitBy(g, victim, opts) {
      const M = g.mod;
      if (M && M.id === 'refs') K.refs.hitBy(g, M, M.cfg, victim, opts);
    },
    // Actions.lightHit: đấm nhẹ vào người khổng lồ (luật Block Wardens) -> không tác dụng, người đấm bật ra
    shrug(g, p, o) {
      const M = g.mod;
      if (!M || M.id !== 'giants' || o.team !== M.team) return false;
      const d = U.norm(o.x - p.x, o.y - p.y), E = g.effects;
      p.kbx -= d.x * M.cfg.bounce; p.kby -= d.y * M.cfg.bounce;
      o.freeze(0.04);
      E.burst((p.x + o.x) / 2, (p.y + o.y) / 2 - 8, 8, '#c7ccd6', 8, 70, 0.3);
      E.pop(o.x, o.y - 44, 'TOO BIG!', 'info', '#c7ccd6');
      g.sfx('block');
      bark(g, 'mod', o);
      return true;
    },

    // vị trí vật thể di chuyển của luật trận (render/vfx.js propAt) — null = vật đứng yên
    at(g, o) {
      const el = o.max - o.t;
      if (o.kind === 'moped') return mopedAt(o, el);
      if (o.kind === 'flock') { const k = U.clamp(el / o.max, 0, 1); return { x: o.x + (o.a - o.x) * k, y: o.y }; }
      if (o.kind === 'hot') return { x: g.ball.x, y: g.ball.y - g.ball.z };
      if (o.kind === 'stoolthrow') { const k = Math.min(el, o.max); return { x: o.x + Math.cos(o.a) * o.b * k, y: o.y + Math.sin(o.a) * o.b * k }; }
      if (o.kind === 'spot' && o.a === 0) {
        const c = S().mods && S().mods.searchlight;
        return c ? lightAt(c, o.y + el, o.x) : null;
      }
      return null;
    },
    // độ đậm khi vẽ cầu thủ p (School Ghosts: ma xa bóng mờ dần; vẫn còn bóng hình, không vô hình)
    alpha(g, p) {
      const M = g.mod;
      if (!M || M.id !== 'ghosts' || p.team !== M.team || g.humanTeam < 0 || p.team === g.humanTeam) return 1;
      if (p.hasBall || p.state !== 'normal' || (g.state !== 'play' && g.state !== 'kickoff')) return 1;
      const c = M.cfg, d = Math.hypot(p.x - g.ball.x, p.y - g.ball.y);
      const k = U.clamp((d - c.near) / c.fade, 0, 1);
      return 1 - k * (1 - c.alpha) + k * 0.05 * Math.sin(g.time * 7 + p.id);
    },
  };

  SFC.MatchMods = MatchMods;
})();
