/* MatchMods — LUẬT TRẬN của FOOTBALL STORY (docs/FOOTBALL_STORY.md mục "Luật trận"): mỗi đội đối thủ một luật làm trận đá khác hẳn.
 * Số liệu: SFC_CONFIG.stories.mods[id] · vòng nào dùng luật nào: rounds[i].mod -> trận nhận opts.mod (main.js startCupMatch).
 * User chốt 2026-10-19: được nặng tay cho thấy rõ, nhưng không lấy / cấm Core.
 * Đội "chủ luật" = đội đối thủ (g.mod.team = 1 - đội người chơi): luật chỉ đánh vào đội kia.
 * Chỉ máy chạy mô phỏng (chơi đơn / chủ phòng) tính va chạm. Hình = Effects.prop / pop (lệnh hiệu ứng: khách online nhận qua sync.js);
 * vật di chuyển (xe máy, đèn pha) có vị trí là hàm thuần của tuổi vật thể (MatchMods.at) nên máy vẽ tự tính, không cần gói tin mới.
 * Hook từ match.js: create (dựng trận) · kickoff (sau khi xếp đội hình) · clock (mỗi bước lúc kickoff / play, kể cả lúc cả sân đứng yên)
 *   · update (mỗi bước mô phỏng lúc play) · goal (bàn thắng). Render đọc alpha(g, p) (ma tàng hình) — render/vfx.js vẽ các vật thể.
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
   * Đập tường (mép sân): không vỡ, bật ngược lại một đoạn ngắn rồi rơi xuống ngay đó, nhặt ném tiếp được (user 2026-10-21).
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
      M.flying.push({ x: p.x + d.x * 8, y: p.y + d.y * 8, d, t: 0, life, sp: c.throwSpeed, id, team: p.team, src: p });
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
        const k = Math.min(fl.t, fl.life), x = fl.x + fl.d.x * fl.sp * k, y = fl.y + fl.d.y * fl.sp * k;
        let done = false;
        // ghế bật tường thì không còn trúng ai
        if (!fl.bounced) for (const o of g.teams[1 - fl.team].players) {
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
        const outX = x < f.x + 6 || x > f.x + f.w - 6, outY = y < f.y + 6 || y > f.y + f.h - 6;
        // chỗ ghế rơi: trong sân, cách mép đủ để không kẹt tường
        const m = c.r + 6, lx = U.clamp(x, f.x + m, f.x + f.w - m), ly = U.clamp(y, f.y + m, f.y + f.h - m);
        if (!done && (outX || outY)) {
          M.flying.splice(M.flying.indexOf(fl), 1);
          E.propOff(fl.id, 0.02);
          E.burst(lx, ly, 6, '#ffffff', 6, 70, 0.3);
          g.sfx('wall');
          if (fl.bounced) { this.add(g, M, c, { x: lx, y: ly }); continue; }   // bật lần 2 (góc sân): rơi luôn
          // bật tường: đổi chiều trục chạm tường, bay chậm một đoạn ngắn rồi rơi xuống thành ghế trên sân
          const d = { x: outX ? -fl.d.x : fl.d.x, y: outY ? -fl.d.y : fl.d.y }, id = newId(g), life = c.bounceRange / c.bounceSpeed;
          M.flying.push({ x: lx, y: ly, d, t: 0, life, sp: c.bounceSpeed, id, team: fl.team, src: fl.src, bounced: true });
          E.prop(id, 'stoolthrow', lx, ly, Math.atan2(d.y, d.x), c.bounceSpeed, life, c.color);
          continue;
        }
        if (done) {
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
          this.add(g, M, c, { x: lx, y: ly });
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
          if (q.team === M.team) {   // Moped Boys quá giang: chạy nhanh hơn một lúc — cả lúc đó có vệt tốc độ + khói xả + quầng vàng (prop 'vroom')
            q.buffs.push({ speed: c.boost, t: c.boostT });
            E.prop(newId(g), 'vroom', q.x, q.y, q.id, 0, c.boostT, c.color);
            E.burst(q.x, q.y, 2, '#ffd23f', 14, 110, 0.5);
            E.burst(q.x, q.y, 2, '#ffffff', 6, 80, 0.3);
            E.wave(q.x, q.y, 22, '#ffd23f', 0.3, 2);
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

  /* School Ghosts — MA TÀNG HÌNH (user 2026-10-21): mỗi lúc tối đa n con ma (không cầm bóng lúc biến) tàng hình + chạy nhanh x speed, tới khi bị lộ.
   * Cách làm lộ: ra đòn nặng trúng 1 con ma KHÔNG tàng hình -> cả đội ma hiện hình, cooldown giây sau mới tàng hình lại được.
   * Tàng hình = prop 'veil' bám người (khách online nhận qua lệnh hiệu ứng), render đọc alpha(). Chuông trường reo thì 2 con ma đổi chỗ.
   * Họ bị dẫn: chuông + hồi tàng hình nhanh hơn (trailing). Hook: Player.hit -> MatchMods.hitBy */
  K.ghosts = {
    create(g, M, c) { M.bell = c.first; M.next = c.first; M.veil = {}; },
    kickoff(g, M, c) {
      for (const id of Object.values(M.veil)) g.effects.propOff(id, 0.05);
      M.veil = {}; M.next = c.first;
    },
    vanish(g, M, c) {
      const E = g.effects, list = g.teams[M.team].players.filter((q) => !q.hasBall);
      for (let i = 0; i < c.n && list.length; i++) {
        const p = list.splice(Math.floor(Math.random() * list.length), 1)[0], id = newId(g);
        M.veil[p.id] = id;
        E.prop(id, 'veil', p.x, p.y, p.id, 0, 9999, '#9d7bff');
        E.burst(p.x, p.y - 8, 6, '#9d7bff', 14, 70, 0.5);
        E.burst(p.x, p.y - 8, 6, '#e8ecf5', 8, 50, 0.4);
        E.pop(p.x, p.y - 30, 'VANISH!', 'status', '#9d7bff');
      }
      g.sfx('ult', 'mod.vanish');
      bark(g, 'mod');
    },
    // cả đội ma hiện hình, đếm lại cooldown
    reveal(g, M, c) {
      const E = g.effects;
      for (const p of g.teams[M.team].players) {
        const id = M.veil[p.id];
        if (!id) continue;
        E.propOff(id, 0.25);
        E.burst(p.x, p.y - 8, 6, '#e8ecf5', 14, 90, 0.5);
        E.pop(p.x, p.y - 30, 'FOUND YOU!', 'good', '#9d7bff');
      }
      M.veil = {}; M.next = c.cooldown;
      g.sfx('ult', 'mod.reveal');
    },
    hitBy(g, M, c, victim, opts) {
      const p = opts.source;
      if (victim.team !== M.team || opts.type !== 'hard' || !p || p.team === M.team || M.veil[victim.id] || !Object.keys(M.veil).length) return;
      this.reveal(g, M, c);
    },
    update(g, M, c, dt) {
      const E = g.effects, f = g.field, trail = behind(g) ? c.trailing : 1;
      const tp = g.teams[M.team].players, hidden = tp.filter((q) => M.veil[q.id]);
      for (const p of hidden) keepSpeed(p, c.speed);
      if (!hidden.length && (M.next -= dt * trail) <= 0) this.vanish(g, M, c);
      // chuông trường: 2 con ma (không cầm bóng) đổi chỗ
      if ((M.bell -= dt * trail) > 0) return;
      M.bell = U.rand(c.bell[0], c.bell[1]);
      const list = tp.filter((q) => !q.hasBall && q.state === 'normal' && grounded(q));
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

  /* Night Owls — MẮT CÚ "đèn xanh, đèn đỏ" (user 2026-10-22, thay SEARCHLIGHT). Con cú khổng lồ đậu trên khán đài suốt trận (prop 'owl', dựng lại
   * mỗi lần giao bóng), bình thường nhắm mắt. Mỗi every giây: "HOO...", mắt mở dần warn giây (báo trước, giữ nguyên kể cả khi họ bị dẫn),
   * rồi mở hẳn open giây (prop 'owleyes' a = warn, b = open: con cú đọc prop này để vẽ mắt). Lúc mắt mở hẳn:
   *   - ai bên bạn đang CHẠY (đè phím chạy nhanh, hoặc đang lướt) bị tia ngắm khoá (prop 'gazelock': tia đỏ + vòng ngắm co dần);
   *     đứng lại / đi bộ là tia nhả ra. Chạy tiếp đủ lockT giây -> mắt cú bắn 1 viên đạn sáng (prop 'owlbolt') đuổi theo người đó, bay boltT giây;
   *   - lướt (Z) đúng lúc đạn tới là né được (Actions.dodged); trúng = HOÁ ĐÁ stone giây (user 2026-10-22, thay đóng băng): đá lan từ chân lên
   *     thành tượng (prop 'petrify'), đứng chôn chân + rơi bóng, hết giờ tượng nứt rồi vỡ vụn. Mỗi người bị bắn tối đa 1 lần mỗi lượt mắt mở.
   * Đi bộ / đứng im / sút / chuyền / đấm tại chỗ đều được; chuyển động do Core / Tuyệt kỹ (state recover) không tính. Ai phạm luật người đó chịu —
   * kể cả đồng đội AI (mỗi lượt, mỗi AI tuân luật với xác suất aiObey: đi bộ suốt lúc đó). Owls đi lại thoải mái nhưng không ra đòn / sút / chuyền
   * lúc mắt mở (noActT). Họ bị dẫn: mắt mở thường hơn (trailing) và lâu hơn (x trailOpen) */
  K.owlgaze = {
    create(g, M, c) { M.next = c.first; M.gaze = null; M.bolts = []; M.stone = []; },
    kickoff(g, M, c) {
      // clearHazards vừa xoá hết vật thể: đặt lại con cú, bỏ lượt mắt mở / đạn / tượng đá đang dở
      M.gaze = null; M.bolts = []; M.stone = [];
      g.effects.prop(newId(g), 'owl', g.field.cx, g.field.y, 0, 0, 99999, c.color);
    },
    start(g, M, c) {
      const f = g.field, E = g.effects, len = c.open * (behind(g) ? c.trailOpen : 1), id = newId(g);
      // đồng đội AI: tuân luật hay không quyết 1 lần mỗi lượt mắt mở
      const obey = new Set(victims(g).filter((p) => !(p.isControlled && g.isHuman(p.team)) && Math.random() < c.aiObey).map((p) => p.id));
      M.gaze = { t: -c.warn, len, id, locks: {}, shot: new Set(), obey, said: false };
      E.prop(id, 'owleyes', f.cx, f.y, c.warn, len, c.warn + len + 0.3, c.color);
      E.pop(f.cx, f.y + 14, 'HOO...', 'info', c.color);
      g.sfx('ult', 'mod.hoo');
    },
    // đang chạy bằng chân mình: chạy nhanh (đè phím chạy) hoặc lướt (đổ người của thủ môn không tính)
    running(p) {
      return (p.state === 'normal' && p.sprinting) || (p.state === 'dash' && p.atkType !== 'diveU' && p.atkType !== 'diveD');
    },
    release(g, G, id) {
      g.effects.propOff(G.locks[id].prop, 0.1);
      delete G.locks[id];
    },
    fire(g, M, c, o) {
      const E = g.effects, f = g.field, id = newId(g);
      M.bolts.push({ p: o, t: 0, id });
      E.prop(id, 'owlbolt', f.cx, f.y - 13, o.id, 0, c.boltT, '#ff3d5a');
      E.pop(f.cx, f.y + 14, 'HOOT!', 'heavy', '#ff3d5a');
      g.sfx('ult', 'mod.zap');
    },
    // đạn tới nơi: lướt đúng lúc = né, không thì hoá đá
    land(g, M, c, b) {
      const E = g.effects, o = b.p;
      E.propOff(b.id, 0.02);
      if (!grounded(o) || Act().dodged(g, o)) { E.burst(o.x, o.y - 10, 6, '#ff3d5a', 10, 90, 0.4); g.sfx('ult', 'mod.fizzle'); return; }
      if (o.state === 'stun' || o.state === 'dash') { o.state = 'normal'; o.stateT = 0; }
      o.hitImmune = 0;
      if (!o.hit({ stun: c.stone, kbx: 0, kby: 0, type: 'hard', quiet: true })) return;
      o.vx = o.vy = o.kbx = o.kby = 0;
      M.hits++;
      const id = newId(g);
      M.stone.push({ p: o, x: o.x, y: o.y, t: o.stateT, id });
      E.prop(id, 'petrify', o.x, o.y, o.id, 0, o.stateT, '#8a8f99');
      E.burst(o.x, o.y - 4, 2, '#c7ccd6', 16, 90, 0.5);
      E.burst(o.x, o.y - 12, 8, '#8a8f99', 10, 60, 0.6);
      E.wave(o.x, o.y, 24, '#c7ccd6', 0.35, 2);
      E.decal('crack', o.x, o.y, 0.8, 1.6, 0);
      E.flash(0.2);
      E.shake(SFC_CONFIG.game.fx.shakeHit);
      E.pop(o.x, o.y - 34, 'STONE!', 'status', '#c7ccd6');
      g.sfx('ult', 'mod.petrify');
      bark(g, 'mod');
    },
    update(g, M, c, dt) {
      const E = g.effects;
      // người hoá đá: chôn chân tại chỗ tới khi hết; hết giờ thì tượng vỡ vụn (đá văng + bụi)
      for (const I of M.stone.slice()) {
        const o = I.p;
        if ((I.t -= dt) > 0 && o.state === 'stun') { o.x = I.x; o.y = I.y; o.vx = o.vy = o.kbx = o.kby = 0; continue; }
        M.stone.splice(M.stone.indexOf(I), 1);
        E.propOff(I.id, 0.05);
        E.burst(o.x, o.y - 10, 8, '#8a8f99', 16, 130, 0.5);
        E.burst(o.x, o.y - 4, 2, '#c7ccd6', 12, 80, 0.6);
        g.sfx('ult', 'mod.crumble');
      }
      // đạn đang bay (vẫn bay tiếp kể cả khi mắt đã nhắm)
      for (const b of M.bolts.slice()) if ((b.t += dt) >= c.boltT) { M.bolts.splice(M.bolts.indexOf(b), 1); this.land(g, M, c, b); }
      const G = M.gaze;
      if (!G) { if (every(g, M, c, dt)) this.start(g, M, c); return; }
      G.t += dt;
      if (G.t >= G.len) {
        for (const id of Object.keys(G.locks)) this.release(g, G, id);
        M.gaze = null;
        return;
      }
      for (const p of victims(g)) if (G.obey.has(p.id)) p.walkT = 0.1;
      if (G.t < 0) return;
      if (!G.said) { G.said = true; E.pop(g.field.cx, g.field.y + 14, "DON'T RUN!", 'info', '#ff3d5a'); }
      for (const p of g.teams[M.team].players) p.noActT = Math.max(p.noActT || 0, 0.05);
      // tia ngắm: chạy thì bị khoá, đứng lại / đi bộ thì nhả; khoá đủ lockT giây -> bắn
      for (const o of victims(g)) {
        const L = G.locks[o.id];
        if (G.shot.has(o.id)) continue;
        if (!grounded(o) || !this.running(o)) { if (L) this.release(g, G, o.id); continue; }
        if (!L) {
          const id = newId(g);
          G.locks[o.id] = { t: 0, prop: id };
          E.prop(id, 'gazelock', g.field.cx, g.field.y - 13, o.id, c.lockT, c.lockT + 0.2, '#ff3d5a');
          E.pop(o.x, o.y - 30, 'SPOTTED!', 'status', '#ff3d5a');
          g.sfx('ult', 'mod.spotted');
          continue;
        }
        if ((L.t += dt) < c.lockT) continue;
        this.release(g, G, o.id);
        G.shot.add(o.id);
        this.fire(g, M, c, o);
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
          if (Stat().slip(g.cores, o, c.stun, null, c.slide, null, 'mod.flop')) {
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

  /* ---------- trạng thái riêng của Story 3 (user 2026-10-23): đứng phủi lửa · bị trói mì — sprite thật bị ẩn, prop 'burn' / 'tied' vẽ người ----------
   * Lưu ở M.held [{ o, id, kind, t, x, y, ... }]: mỗi bước giữ choáng + đứng yên tại chỗ; hết giờ / thoát thì nhả. M.imm[id] = giây được miễn tới */
  function holdUpdate(g, M, c, dt, tick) {
    for (const h of M.held.slice()) {
      const o = h.o;
      // hết choáng sớm (bàn thắng, Tuyệt kỹ dựng dậy...) thì thôi
      if (o.state !== 'stun') { release(g, M, h, false); continue; }
      o.x = h.x; o.y = h.y; o.kbx = o.kby = 0; o.vx = o.vy = 0;
      o.stateT = Math.max(o.stateT, 0.1);
      if ((h.t -= dt) <= 0) { release(g, M, h, h.kind === 'tied'); continue; }
      if (tick) tick(h);
    }
  }
  function hold(g, M, o, kind, t, extra) {
    if (o.state === 'stun' || (M.imm[o.id] || 0) > g.time) return null;
    o.hitImmune = 0;
    if (!o.hit({ stun: t, kbx: 0, kby: 0, type: 'hard', quiet: true })) return null;
    M.hits++;
    const h = Object.assign({ o, kind, t, x: o.x, y: o.y, id: newId(g) }, extra);
    M.held.push(h);
    g.effects.prop(h.id, kind, o.x, o.y, o.id, 0, t + 0.3, kind === 'burn' ? '#ff6a1f' : '#ffd86b');
    return h;
  }
  function release(g, M, h, free) {
    const o = h.o, E = g.effects;
    M.held.splice(M.held.indexOf(h), 1);
    E.propOff(h.id, 0.1);
    M.imm[o.id] = g.time + (M.cfg.immune || 0);
    if (o.state === 'stun') { o.state = 'normal'; o.stateT = 0; }
    o.hitImmune = Math.max(o.hitImmune, 0.3);
    if (!free || g.state !== 'play') return;
    if (h.kind === 'burn') {
      E.burst(o.x, o.y - 10, 6, '#8a8f99', 10, 50, 0.6);
      E.pop(o.x, o.y - 30, 'PHEW!', 'info', '#c7ccd6');
    } else {
      E.burst(o.x, o.y - 8, 4, '#f3dfa0', 16, 110, 0.5);
      E.pop(o.x, o.y - 30, 'FREE!', 'good', '#f3dfa0');
      g.sfx('ult', 'mod.snap');
    }
  }
  function heldKickoff(g, M) {
    for (const h of (M.held || []).slice()) release(g, M, h, false);
    M.held = []; M.imm = {};
  }

  /* Lantern Crew — ĐÈN LỒNG RƠI: đèn lồng rơi gần bóng (bóng đổ to dần warn giây), đập xuống thành đốm lửa cháy fireLife giây.
   * Đội bạn bị đèn rơi trúng hoặc chạm đốm lửa là bắt lửa: đứng lại phủi phủi dập lửa burn giây (rơi bóng), lướt né được.
   * Lantern Crew không sao (họ treo đèn mà). Họ bị dẫn: rơi 2 cái một lúc */
  K.lanterns = {
    create(g, M, c) { M.next = c.first; M.falls = []; M.fires = []; M.held = []; M.imm = {}; },
    kickoff(g, M) {
      M.falls = [];
      for (const fi of M.fires) g.effects.propOff(fi.id);
      M.fires = [];
      heldKickoff(g, M);
    },
    clock(g, M, c, dt) { for (const d of M.falls) d.t += dt; },
    ignite(g, M, c, o) {
      if (!hold(g, M, o, 'burn', c.burn)) return false;
      g.effects.burst(o.x, o.y - 8, 6, '#ff6a1f', 12, 70, 0.5);
      g.effects.pop(o.x, o.y - 30, 'ON FIRE!', 'status', '#ff6a1f');
      g.sfx('ult', 'mod.ignite');
      return true;
    },
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
        const fi = { x: d.x, y: d.y, t: c.fireLife, id: newId(g) };
        M.fires.push(fi);
        E.prop(fi.id, 'flames', d.x, d.y, c.fireR, 0, c.fireLife, '#ff6a1f');
        let hit = false;
        for (const o of victims(g)) {
          if (!grounded(o) || Math.hypot(o.x - d.x, o.y - d.y) > c.r + o.radius || Act().dodged(g, o)) continue;
          if (this.ignite(g, M, c, o)) hit = true;
        }
        if (!b.owner && b.z < 10 && Math.hypot(b.x - d.x, b.y - d.y) < c.r) { const n = U.norm(b.x - d.x || 0.1, b.y - d.y); b.vx = n.x * 180; b.vy = n.y * 180; b.vz = 60; }
        if (hit) bark(g, 'mod');
      }
      // đốm lửa: ai bên bạn bước vào là bắt lửa (đang lướt thì qua được)
      for (const fi of M.fires.slice()) {
        if ((fi.t -= dt) <= 0) { M.fires.splice(M.fires.indexOf(fi), 1); continue; }
        for (const o of victims(g)) {
          if (!grounded(o) || o.state === 'stun' || Math.hypot(o.x - fi.x, (o.y - fi.y) * 1.4) > c.fireR + o.radius * 0.5) continue;
          if (o.tackleImmune > 0 || g.isProtected(o)) continue;
          if (this.ignite(g, M, c, o)) bark(g, 'mod');
        }
      }
      holdUpdate(g, M, c, dt, (h) => { if (Math.random() < dt * 6) E.burst(h.o.x, h.o.y - 12, 8, '#ffd23f', 2, 40, 0.3); });
    },
  };

  /* Noodle Kickers — MÌ CAO BỒI: 1 Kicker quay sợi mì trên đầu (vạch ngắm tới người đội bạn) rồi quăng như cao bồi. Vòng mì bay thẳng tới chỗ người đó
   * đứng lúc quăng (chạy khỏi chỗ / lướt là né), trúng = bị trói: đứng chôn chân, rơi bóng. Người chơi bấm trái / phải luân phiên để vùng ra
   * (mỗi lần vùng: người nghiêng theo hướng bấm, vụn mì văng), đồng đội AI tự vùng. Họ bị dẫn: quăng dày hơn (trailing) */
  K.lasso = {
    create(g, M, c) { M.next = c.first; M.swing = null; M.loops = []; M.held = []; M.imm = {}; },
    kickoff(g, M) {
      if (M.swing) g.effects.propOff(M.swing.id);
      for (const L of M.loops) g.effects.propOff(L.id, 0.01);
      M.swing = null; M.loops = [];
      heldKickoff(g, M);
    },
    free(o, g, M) { return grounded(o) && o.state !== 'stun' && !((M.imm[o.id] || 0) > g.time); },
    // người quăng + người bị nhắm: cặp Kicker - người đội bạn gần nhau nhất trong tầm (ưu tiên người cầm bóng)
    pick(g, M, c) {
      let best = null, bd = Infinity;
      for (const p of g.teams[M.team].players) {
        if (!grounded(p) || p.state !== 'normal' || p.hasBall) continue;
        for (const o of victims(g)) {
          if (!this.free(o, g, M)) continue;
          const d = U.dist(p, o) - (o.hasBall ? 60 : 0);
          if (U.dist(p, o) < c.range && d < bd) { bd = d; best = { p, o }; }
        }
      }
      return best;
    },
    update(g, M, c, dt) {
      const E = g.effects;
      if (!M.swing && every(g, M, c, dt)) {
        const P = this.pick(g, M, c);
        if (!P) M.next = 0.6;   // chưa ai trong tầm: lát nữa thử lại
        else {
          M.swing = { p: P.p, o: P.o, t: c.warn, id: newId(g), x: P.p.x, y: P.p.y };
          E.prop(M.swing.id, 'lassoswing', P.p.x, P.p.y, P.p.id, P.o.id, c.warn + 0.1, '#ffd86b');
          g.sfx('ult', 'mod.lasso');
          bark(g, 'mod', P.p);
        }
      }
      const S1 = M.swing;
      if (S1) {
        if (S1.p.state !== 'normal') { E.propOff(S1.id); M.swing = null; }
        else if ((S1.t -= dt) > 0) {
          // đứng tấn quay mì: chôn chân tại chỗ, không ra đòn / sút, xoay mặt về phía người bị nhắm
          const q = S1.p;
          q.x = S1.x; q.y = S1.y; q.vx = q.vy = 0; q.noActT = Math.max(q.noActT || 0, 0.05);
          q.facing = Math.atan2(S1.o.y - q.y, S1.o.x - q.x);
        } else {
          M.swing = null;
          const a = Math.atan2(S1.o.y - S1.p.y, S1.o.x - S1.p.x), max = (c.range + 30) / c.speed;
          const L = { x: S1.p.x, y: S1.p.y, a, el: 0, max, id: newId(g) };
          M.loops.push(L);
          E.prop(L.id, 'lassofly', L.x, L.y, a, c.speed, max, '#ffd86b');
          g.sfx('ult', 'mod.whip');
        }
      }
      for (const L of M.loops.slice()) {
        L.el += dt;
        const x = L.x + Math.cos(L.a) * c.speed * L.el, y = L.y + Math.sin(L.a) * c.speed * L.el;
        let done = L.el >= L.max;
        for (const o of victims(g)) {
          if (done || !this.free(o, g, M) || Math.hypot(o.x - x, o.y - y) > c.r + o.radius) continue;
          done = true;
          if (Act().dodged(g, o)) break;
          if (hold(g, M, o, 'tied', c.maxTie, { n: 0, last: 0, ai: 0 })) {
            E.pop(o.x, o.y - 30, 'TIED UP!', 'status', '#f3dfa0');
            E.burst(o.x, o.y - 8, 4, '#f3dfa0', 10, 60, 0.4);
            g.sfx('ult', 'mod.tie');
            bark(g, 'mod');
          }
        }
        if (done) {
          M.loops.splice(M.loops.indexOf(L), 1);
          E.propOff(L.id, 0.01);
          if (L.el >= L.max) E.burst(x, y, 1, '#f3dfa0', 6, 40, 0.3);
        }
      }
      // vùng vẫy: người chơi đổi hướng trái <-> phải = 1 lần vùng · AI tự vùng aiRate lần / giây
      holdUpdate(g, M, c, dt, (h) => {
        const o = h.o;
        let s = 0;
        if (o.isControlled && g.isHuman(o.team)) {
          const mx = o.intent.mx || 0;
          if (Math.abs(mx) > 0.5 && Math.sign(mx) !== h.last) s = Math.sign(mx);
        } else if ((h.ai += dt * c.aiRate) >= 1) { h.ai -= 1; s = h.last > 0 ? -1 : 1; }
        if (!s) return;
        h.last = s; h.n++;
        o.facing = s > 0 ? 0 : Math.PI;
        E.burst(o.x - s * 6, o.y - 10, 6, '#f3dfa0', 3, 60, 0.3);
        g.sfx('ult', 'mod.wiggle');
        if (h.n >= c.mash) release(g, M, h, true);
      });
    },
  };

  /* Fortune Tellers — LÁ BÀI: mỗi every giây Madame Fate rút 1 lá: bộ bài bay từ tay bà lên giữa trên sân, xào bài, rút lá trên cùng, lật mặt
   * (reveal giây) rồi mới có tác dụng. THE MOON tắt đèn · THE MAGICIAN bóng giả · THE RABBITS đàn thỏ giành cà rốt · THE WHEEL cả sân tăng tốc (user 2026-10-23) */
  K.fortune = {
    create(g, M, c) { M.next = c.first; M.card = null; M.fakes = []; M.rab = null; },
    kickoff(g, M) { this.end(g, M); M.card = null; },
    // vị trí thỏ đang nhảy (prop 'rabbit': (x, y) -> (a, b) trong hop giây, sau đó ngồi yên ở đích)
    hopAt(o, el) {
      const k = Math.min(1, el / S().mods.fortune.rabbits.hop);
      return { x: o.x + (o.a - o.x) * k, y: o.y + (o.b - o.y) * k };
    },
    // vị trí bóng giả (sim + vẽ dùng chung): lăn thẳng theo góc a, tốc độ v giảm dần, dừng ở mép sân
    fakeAt(g, o, el) {
      const C = S().mods.fortune.magician, f = g.field, d = (o.b * (1 - Math.exp(-C.drag * el))) / C.drag;
      return { x: U.clamp(o.x + Math.cos(o.a) * d, f.x + 6, f.x + f.w - 6), y: U.clamp(o.y + Math.sin(o.a) * d, f.y + 6, f.y + f.h - 6) };
    },
    end(g, M) {
      for (const F of M.fakes || []) g.effects.propOff(F.id, 0.01);
      M.fakes = [];
      const R = M.rab;
      if (R) {
        for (const r of R.list) { g.effects.propOff(r.id, 0.01); if (g.state === 'play') g.effects.burst(r.x, r.y - 4, 2, '#ffffff', 8, 60, 0.4); }
        g.effects.propOff(R.carrot.id, 0.01);
        M.rab = null;
      }
    },
    // cà rốt: nằm trên sân (prop 'carrot') hoặc giơ trên đầu người cầm (prop 'carrotheld' bám người)
    carrot(g, M, holder) {
      const Cr = M.rab.carrot, E = g.effects;
      E.propOff(Cr.id, 0.01);
      Cr.id = newId(g); Cr.holder = holder;
      if (holder) E.prop(Cr.id, 'carrotheld', holder.x, holder.y, holder.id, 0, M.rab.t + 0.3, '#ff8a3f');
      else E.prop(Cr.id, 'carrot', Cr.x, Cr.y, 0, 0, M.rab.t + 0.3, '#ff8a3f');
    },
    // 1 bước nhảy của thỏ r tới (tx, ty), nghỉ thêm rest giây (cùng thời gian sống của prop để thỏ luôn có hình)
    hop(g, M, C, r, tx, ty, rest) {
      const d = Math.hypot(tx - r.x, ty - r.y), k = d > C.hopLen ? C.hopLen / d : 1, f = g.field;
      const x1 = U.clamp(r.x + (tx - r.x) * k, f.x + 4, f.x + f.w - 4), y1 = U.clamp(r.y + (ty - r.y) * k, f.y + 4, f.y + f.h - 4);
      g.effects.propOff(r.id, 0.01);
      r.id = newId(g);
      g.effects.prop(r.id, 'rabbit', r.x, r.y, x1, y1, C.hop + rest + 0.05, '#ffffff');
      r.x = x1; r.y = y1; r.t = C.hop + rest;
    },
    rabbits(g, M, c, dt) {
      const R = M.rab, C = c.rabbits, Cr = R.carrot, E = g.effects;
      if ((R.t -= dt) <= 0) { this.end(g, M); return; }
      // cà rốt: người cầm bị choáng / bay lên -> rơi văng ra · nằm trên sân: ai chạy chạm là cầm
      const h = Cr.holder;
      if (h) {
        Cr.x = h.x; Cr.y = h.y;
        if (h.state === 'stun' || !grounded(h)) {
          const f = g.field;
          Cr.x = U.clamp(h.x + U.rand(-26, 26), f.x + 10, f.x + f.w - 10); Cr.y = U.clamp(h.y + U.rand(-20, 20), f.y + 10, f.y + f.h - 10);
          R.lock[h.id] = g.time + C.dropLock;
          this.carrot(g, M, null);
          E.pop(h.x, h.y - 30, 'DROP!', 'info', '#ff8a3f');
          E.burst(Cr.x, Cr.y, 2, '#ff8a3f', 6, 60, 0.3);
        }
      } else {
        for (const p of g.players) {
          if (!grounded(p) || p.state === 'stun' || (R.lock[p.id] || 0) > g.time || Math.hypot(p.x - Cr.x, p.y - Cr.y) > p.radius + C.carrotR) continue;
          this.carrot(g, M, p);
          E.pop(p.x, p.y - 34, 'CARROT!', 'status', '#ff8a3f');
          g.sfx('ult', 'mod.munch');
          if (p.team === M.team) bark(g, 'mod', p);
          break;
        }
      }
      // thỏ: có người cầm cà rốt -> nhảy tới cắn người gần nhất của đội kia · chưa ai cầm -> lượn quanh cà rốt
      const foes = Cr.holder ? g.teams[1 - Cr.holder.team].players.filter((o) => grounded(o) && o.state !== 'stun' && !((R.imm[o.id] || 0) > g.time)) : [];
      for (const r of R.list) {
        if ((r.t -= dt) > 0) continue;
        let tgt = null, bd = Infinity;
        for (const o of foes) { const d = Math.hypot(o.x - r.x, o.y - r.y); if (d < bd) { bd = d; tgt = o; } }
        if (tgt && bd < C.biteR + tgt.radius + 2) {
          // cắn
          tgt.hitImmune = 0;
          const n = U.norm(tgt.x - r.x || 0.1, tgt.y - r.y);
          if (tgt.hit({ stun: C.bite, kbx: n.x * 90, kby: n.y * 90, type: 'light' })) {
            if (tgt.team !== M.team) M.hits++;
            R.imm[tgt.id] = g.time + C.immune;
            E.pop(tgt.x, tgt.y - 30, 'CHOMP!', 'light', '#ffffff');
            g.sfx('ult', 'mod.chomp');
          }
          this.hop(g, M, C, r, r.x, r.y, C.pause);
          continue;
        }
        if (tgt) { this.hop(g, M, C, r, tgt.x, tgt.y, C.rest); continue; }
        const a = r.ph + g.time * 1.3;
        this.hop(g, M, C, r, Cr.x + Math.cos(a) * 18, Cr.y + Math.sin(a) * 10, C.rest * 3);
      }
    },
    // AI (cả 2 đội): cà rốt đang nằm trên sân -> người gần nó nhất mỗi đội (không cầm bóng) chạy tới nhặt
    aiMove(g, M, c, p) {
      const R = M.rab;
      if (!R || R.carrot.holder || p.hasBall || p.state !== 'normal' || (R.lock[p.id] || 0) > g.time) return false;
      const Cr = R.carrot, mates = g.teams[p.team].players.filter((q) => !q.hasBall && q.state === 'normal');
      const near = mates.reduce((a, q) => (Math.hypot(q.x - Cr.x, q.y - Cr.y) < Math.hypot(a.x - Cr.x, a.y - Cr.y) ? q : a), p);
      if (near !== p) return false;
      const d = U.norm(Cr.x - p.x, Cr.y - p.y);
      p.intent.mx = d.x; p.intent.my = d.y; p.intent.sprint = true;
      return true;
    },
    poof(g, M, F, pos) {
      M.fakes.splice(M.fakes.indexOf(F), 1);
      g.effects.propOff(F.id, 0.01);   // vật đi theo tuổi: tắt ngay (mờ dần sẽ nhảy về chỗ cũ)
      g.effects.burst(pos.x, pos.y - 3, 2, '#c9b5ff', 14, 70, 0.5);
      g.effects.pop(pos.x, pos.y - 18, 'FAKE!', 'info', '#c9b5ff');
      g.sfx('ult', 'mod.poof');
    },
    start(g, M, c, id) {
      const E = g.effects, b = g.ball;
      if (id === 'moon') {
        E.prop(newId(g), 'dark', g.field.cx, g.field.cy, 1 - M.team, M.team, c.moon.time, '#05040c');
        g.sfx('ult', 'mod.lightsout');
      }
      if (id === 'magician') {
        const C = c.magician, x = b.x, y = b.y, a0 = U.rand(0, Math.PI * 2);
        // bóng thật đang lăn tự do cũng bị hất cùng kiểu, không nhìn đường lăn mà đoán được
        for (let i = 0; i < C.fakes + 1; i++) {
          const a = a0 + (i * Math.PI * 2) / (C.fakes + 1) + U.rand(-0.4, 0.4), v = U.rand(C.speed[0], C.speed[1]);
          if (i === C.fakes) { if (!b.owner) { b.vx = Math.cos(a) * v; b.vy = Math.sin(a) * v; } break; }
          const F = { x, y, a, b: v, el: 0, id: newId(g) };
          M.fakes.push(F);
          E.prop(F.id, 'fakeball', x, y, a, v, C.time, '#ffffff');
        }
        E.burst(x, y - 3, 2, '#c9b5ff', 20, 90, 0.6);
        E.pop(x, y - 20, 'POOF!', 'status', '#c9b5ff');
        g.sfx('ult', 'mod.poof');
      }
      if (id === 'rabbits') {
        const C = c.rabbits, f = g.field, cap = captain(g) || { x: f.cx, y: f.cy };
        M.rab = { t: C.time, list: [], lock: {}, imm: {}, carrot: { x: U.rand(f.x + 50, f.x + f.w - 50), y: U.rand(f.y + 30, f.y + f.h - 30), holder: null, id: 0 } };
        E.prop(newId(g), 'tophat', cap.x, cap.y, 0, 0, 1.2, '#2a2a3a');
        E.burst(cap.x, cap.y - 10, 4, '#c9b5ff', 18, 90, 0.6);
        for (let i = 0; i < C.n; i++) {
          const r = { x: cap.x, y: cap.y, t: 0, id: 0, ph: (i * Math.PI * 2) / C.n };
          this.hop(g, M, C, r, cap.x + Math.cos(r.ph) * 22, cap.y + Math.sin(r.ph) * 12, 0.1 + i * 0.06);
          M.rab.list.push(r);
        }
        this.carrot(g, M, null);
        E.burst(M.rab.carrot.x, M.rab.carrot.y, 2, '#ff8a3f', 10, 70, 0.5);
        E.pop(M.rab.carrot.x, M.rab.carrot.y - 18, 'CARROT!', 'status', '#ff8a3f');
        g.sfx('ult', 'mod.poof');
      }
      if (id === 'wheel') {
        // mọi cầu thủ cả 2 đội chạy nhanh trong time giây (update giữ keepSpeed), vệt tốc độ bám người
        for (const p of g.players) {
          E.prop(newId(g), 'zoomies', p.x, p.y, p.id, 0, c.wheel.time, '#ffd23f');
          E.burst(p.x, p.y - 8, 6, '#ffd23f', 8, 70, 0.4);
        }
        E.pop(g.field.cx, g.field.y - 6, 'TURBO!', 'move', '#ffd23f');
        g.sfx('ult', 'mod.wheel');
      }
    },
    update(g, M, c, dt) {
      // bóng giả: lăn theo fakeAt, ai chạm (cả 2 đội) là tan
      for (const F of M.fakes.slice()) {
        F.el += dt;
        const pos = this.fakeAt(g, F, F.el);
        if (F.el >= c.magician.time) { this.poof(g, M, F, pos); continue; }
        if (g.players.some((p) => p.airZ <= 4 && Math.hypot(p.x - pos.x, p.y - pos.y) < p.radius + 4)) this.poof(g, M, F, pos);
      }
      if (M.rab) this.rabbits(g, M, c, dt);
      const C1 = M.card;
      if (C1) {
        // lá vừa được rút khỏi bộ bài (hết bay + xào): tiếng lật bài
        if (!C1.flip && C1.wait <= c.reveal - 1.3) { C1.flip = true; g.sfx('ult', 'mod.card'); }
        if (!C1.on && (C1.wait -= dt) <= 0) { C1.on = true; this.start(g, M, c, C1.id); bark(g, 'mod'); }
        if (C1.on && C1.id === 'wheel') for (const p of g.players) keepSpeed(p, c.wheel.speed);
        if (C1.on && (C1.t -= dt) <= 0) M.card = null;
        return;
      }
      if (!every(g, M, c, dt)) return;
      const list = c.cards.filter((x) => x.id !== M.last), card = U.pick(list);
      M.last = card.id;
      M.card = { id: card.id, wait: c.reveal, t: (c[card.id] && c[card.id].time) || 0.5, on: false };
      const cap = captain(g) || { x: g.field.cx, y: g.field.cy };
      g.effects.prop(newId(g), 'tarot', cap.x, cap.y, c.cards.indexOf(card), 0, c.show, '#9d7bff');
      g.sfx('ult', 'mod.shuffle');
    },
  };

  /* Market Mamas — MẶC CẢ (user 2026-10-23): sạp hàng chắn 2 bên cột dọc của cả 2 khung thành, thu hẹp miệng khung (Game.goalMouth -> mouth).
   * Mỗi bàn thắng + mỗi every giây các Mamas mặc cả: khung họ hẹp lại, khung bạn rộng ra (sạp trượt). Sút mạnh trúng sạp khung họ: sạp lùi lại (NO DEAL!).
   * M.d[side] = độ sâu sạp mỗi bên cột của khung phía side (-1 trái, 1 phải). Vẽ: prop 'goalstall' (x = phía, y -> a = độ sâu trượt, b = 1 khung Mamas) */
  K.haggle = {
    create(g, M, c) {
      M.next = c.first; M.d = { '-1': c.start, 1: c.start }; M.pid = {}; M.refresh = 0; M.knockT = 0; M.goals = 0;
      M.home = g.ownGoal(M.team).x > g.field.cx ? 1 : -1;   // phía khung thành của Mamas
    },
    show(g, M, c, side, d0) {
      if (M.pid[side]) g.effects.propOff(M.pid[side], 0.01);
      M.pid[side] = newId(g);
      g.effects.prop(M.pid[side], 'goalstall', side, d0, M.d[side], side === M.home ? 1 : 0, c.refresh + 2, '#ff8a3f');
    },
    kickoff(g, M, c) {
      // vừa có bàn thắng: mặc cả ngay lúc giao bóng lại
      if (M.goals > 0) { M.goals = 0; this.haggle(g, M, c); }
      else for (const sd of [-1, 1]) this.show(g, M, c, sd, M.d[sd]);
      M.refresh = c.refresh;
    },
    haggle(g, M, c) {
      const st = behind(g) ? c.trailStep : c.step, home = M.home, away = -home;
      const h0 = M.d[home], a0 = M.d[away];
      M.d[home] = Math.min(c.max, h0 + st);
      M.d[away] = Math.max(0, a0 - st);
      if (M.d[home] === h0 && M.d[away] === a0) return;
      this.show(g, M, c, home, h0); this.show(g, M, c, away, a0);
      M.refresh = c.refresh;
      const E = g.effects, f = g.field, cap = captain(g);
      if (cap) E.pop(cap.x, cap.y - 34, 'HAGGLE!', 'move', '#ff8a3f');
      for (const sd of [-1, 1]) E.burst(sd < 0 ? f.x : f.x + f.w, f.cy, 6, '#ffd23f', 10, 70, 0.5);
      g.sfx('ult', 'mod.haggle');
      M.barkT = 0;
      bark(g, 'mod');
    },
    // các khối thùng hàng (vật cản thật, vẽ ở render/modsdraw.js crates): mỗi khung 2 khối sát vạch phía trong sân, rộng c.depth
    boxes(g, M, c) {
      const f = g.field, out = [];
      for (const sd of [-1, 1]) {
        const d = M.d[sd];
        if (!(d >= 1)) continue;
        const lx = sd < 0 ? f.x : f.x + f.w, x0 = sd > 0 ? lx - c.depth : lx;
        out.push({ sd, x0, x1: x0 + c.depth, y0: f.gTop, y1: f.gTop + d }, { sd, x0, x1: x0 + c.depth, y0: f.gBot - d, y1: f.gBot });
      }
      return out;
    },
    // đẩy hình tròn (x, y, r) ra khỏi khối theo mặt gần nhất (mặt phía vạch khung không tính) -> { nx, ny } hoặc null
    push(q, r, B) {
      if (q.x + r <= B.x0 || q.x - r >= B.x1 || q.y + r <= B.y0 || q.y - r >= B.y1) return null;
      const faces = [[B.y0 - r - q.y, 0, -1], [B.y1 + r - q.y, 0, 1], B.sd > 0 ? [B.x0 - r - q.x, -1, 0] : [B.x1 + r - q.x, 1, 0]];
      let best = faces[0];
      for (const fc of faces) if (Math.abs(fc[0]) < Math.abs(best[0])) best = fc;
      if (best[1]) q.x += best[0]; else q.y += best[0];
      return { nx: best[1], ny: best[2] };
    },
    update(g, M, c, dt) {
      M.knockT -= dt;
      if (every(g, M, c, dt)) this.haggle(g, M, c);
      const b = g.ball;
      for (const B of this.boxes(g, M, c)) {
        for (const p of g.players) if (grounded(p)) this.push(p, p.radius, B);
        if (b.owner || b.z > g.field.goalHeight) continue;
        const n = this.push(b, b.r, B);
        if (!n) continue;
        const dot = b.vx * n.nx + b.vy * n.ny;
        if (dot >= 0) continue;
        if (n.nx) this.hit(g, M, c, b, B.sd);
        b.vx -= 1.7 * dot * n.nx; b.vy -= 1.7 * dot * n.ny;
        if (dot < -80) g.sfx('wall');
      }
      if ((M.refresh -= dt) <= 0) { M.refresh = c.refresh; for (const sd of [-1, 1]) this.show(g, M, c, sd, M.d[sd]); }
    },
    goal(g, M) { M.goals++; },
    // bóng dội vào sạp trong miệng khung (Ball.collideWalls): khung Mamas + bóng đủ nhanh -> sạp lùi lại
    hit(g, M, c, b, side) {
      if (side !== M.home || M.knockT > 0 || b.speed < c.knockSpeed || !(M.d[side] > 0)) return;
      M.knockT = 0.4;
      const d0 = M.d[side];
      M.d[side] = Math.max(0, d0 - c.knock);
      this.show(g, M, c, side, d0);
      M.refresh = c.refresh;
      const E = g.effects;
      E.pop(b.x - side * 20, b.y - 24, 'NO DEAL!', 'heavy', '#ff8a3f');
      for (const col of ['#ff3d5a', '#ffd23f', '#6bff7a']) E.burst(b.x, b.y, 6, col, 5, 110, 0.5);
      E.shake(2, 0.15);
      g.sfx('ult', 'mod.smash');
      bark(g, 'conceded');
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
      if (M.cfg && !M.mirror && K[M.id].goal) K[M.id].goal(g, M, M.cfg, scorer);
      M.barkT = 0;
      bark(g, scorer === M.team ? 'goal' : 'conceded');
    },

    // Game.goalMouth: miệng khung thành phía side bị sạp hàng chắn (luật HAGGLE) — null = khung bình thường (cả máy khách gương)
    mouth(g, side) {
      const M = g.mod;
      if (!M || M.id !== 'haggle' || !M.d) return null;
      const f = g.field, d = M.d[side] || 0;
      return { gTop: f.gTop + d, gBot: f.gBot - d };
    },
    // Ball.collideWalls: bóng dội vào sạp trong miệng khung
    mouthHit(g, b, side) {
      const M = g.mod;
      if (M && M.id === 'haggle' && !M.mirror) K.haggle.hit(g, M, M.cfg, b, side);
    },
    // Human.update: đang cầm ghế (luật ghế nhựa) mà bấm ra đòn -> ném ghế theo hướng mũi tên
    throwCarry(g, p, dx, dy) {
      const M = g.mod;
      return !!(M && M.id === 'stools' && p.carry && K.stools.throw(g, M, M.cfg, p, dx, dy));
    },
    // Player.hit (sau khi người bị đánh choáng): luật trọng tài (Retired Refs) bắt lỗi · School Ghosts: đòn nặng trúng ma không tàng hình làm lộ cả đội
    hitBy(g, victim, opts) {
      const M = g.mod;
      if (!M || M.mirror) return;
      if (M.id === 'refs') K.refs.hitBy(g, M, M.cfg, victim, opts);
      if (M.id === 'ghosts') K.ghosts.hitBy(g, M, M.cfg, victim, opts);
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
      if (o.kind === 'lassofly') { const k = Math.min(el, o.max); return { x: o.x + Math.cos(o.a) * o.b * k, y: o.y + Math.sin(o.a) * o.b * k }; }
      if (o.kind === 'fakeball') return K.fortune.fakeAt(g, o, el);
      if (o.kind === 'rabbit') return K.fortune.hopAt(o, el);
      if (o.kind === 'stoolthrow') { const k = Math.min(el, o.max); return { x: o.x + Math.cos(o.a) * o.b * k, y: o.y + Math.sin(o.a) * o.b * k }; }
      if (o.kind === 'spot' && o.a === 0) {
        const c = S().mods && S().mods.searchlight;
        return c ? lightAt(c, o.y + el, o.x) : null;
      }
      return null;
    },
    // độ đậm khi vẽ cầu thủ p (School Ghosts: ma có prop 'veil' bám người = đang tàng hình, chỉ còn chút bóng hình lung linh)
    // đọc prop thay vì M.veil để máy khách online (trận gương) vẽ giống host
    alpha(g, p) {
      const M = g.mod;
      if (!M || M.id !== 'ghosts' || p.team !== M.team || g.humanTeam < 0 || p.team === g.humanTeam) return 1;
      if (g.state !== 'play' && g.state !== 'kickoff') return 1;
      let v = 0;
      for (const o of g.effects.V.props) {
        if (o.kind !== 'veil' || o.a !== p.id || o.t <= 0) continue;
        v = Math.min(1, (o.max - o.t) * 5) * (o.off ? o.t / o.max : 1);   // hiện dần lúc biến, rõ dần lúc lộ
        break;
      }
      return 1 - v * (1 - M.cfg.alpha) + v * 0.04 * Math.sin(g.time * 7 + p.id);
    },
  };

  SFC.MatchMods = MatchMods;
})();
