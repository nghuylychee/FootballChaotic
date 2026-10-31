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

  /* Block Wardens — PROTEIN SHAKE (làm lại 2026-10-30, user): mỗi pha bóng (giao bóng -> bàn thắng) chỉ 1 Warden ngẫu nhiên hoá khổng lồ
   * (bị dẫn từ twoAt bàn: 2 người, banner double).
   * Trong lúc chờ giao bóng người đó lắc bình whey (shake), ực (drink), rồi phồng người (grow: to vượt pump lần rồi về scale, chỉ số mạnh hơn).
   * Mấy người kia về cỡ + chỉ số thường. Đấm nhẹ vào người khổng lồ không tác dụng (bật ra, TOO BIG!), phải dùng đòn nặng.
   * Bị dẫn: người khổng lồ to thêm (rageScale). Hình: prop 'whey' bám người (render/modsdraw.js). Hook từ actions.js lightHit -> MatchMods.shrug */
  K.giants = {
    create(g, M) {
      M.base = {};
      for (const p of g.teams[M.team].players) M.base[p.id] = Object.assign({}, p.stats);
      M.giants = []; M.whey = [];
    },
    // số người khổng lồ pha này: Wardens bị dẫn từ twoAt bàn trở lên -> 2 người (user 2026-10-30), không thì 1
    count(g, M, c) {
      const gap = g.teams[1 - M.team].score - g.teams[M.team].score;
      return c.twoAt && gap >= c.twoAt ? 2 : 1;
    },
    kickoff(g, M, c) {
      const tp = g.teams[M.team].players;
      // người khổng lồ pha trước về cỡ thường ngay (lúc chờ giao bóng Player không tự đổi cỡ)
      for (const p of tp) { p.stats = Object.assign({}, M.base[p.id] || p.stats); p.sizeTarget = 1; p.sizeT = 0; p.sizeMul = 1; p.radius = SFC_CONFIG.game.player.radius; }
      const n = Math.min(tp.length, this.count(g, M, c)), pool = tp.slice();
      if (n > 1 && !M.double) { M.double = true; g.emit('banner', { text: c.double, sub: c.doubleHint, color: '#ffd23f' }); }
      M.giants = []; M.whey = [];
      for (let i = 0; i < n; i++) {
        const p = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
        M.giants.push(p.id);
        p.stats = Object.assign({}, p.stats, { power: p.stats.power * c.power, tackle: p.stats.tackle * c.power, speed: p.stats.speed * c.speed });
        // cảnh uống bắt đầu ở bước đồng hồ đầu tiên (clock): giao bóng đầu trận / sau bàn thắng còn qua màn giới thiệu, chọn Core.
        // Người thứ 2 uống trễ chút (lag) cho khỏi đồng thanh
        M.whey.push({ pid: p.id, t: -i * 0.12, on: false, gulp: false, grown: false });
      }
    },
    isGiant(M, o) { return !!M.giants && M.giants.includes(o.id); },
    clock(g, M, c, dt) {
      for (const W of M.whey) this.drink(g, M, c, W, dt);
      M.whey = M.whey.filter((W) => W.t < c.shake + c.drink + c.grow);
    },
    // cảnh uống whey của 1 người: lắc -> ực -> phồng người (grow)
    drink(g, M, c, W, dt) {
      W.t += dt;
      const p = g.players.find((q) => q.id === W.pid);
      if (!p) { W.t = 99; return; }
      if (!W.on && W.t >= 0) {
        W.on = true;
        g.effects.prop(newId(g), 'whey', p.x, p.y, p.id, 0, c.shake + c.drink + c.grow + 0.1, g.teams[M.team].cfg.kit.shirt);
        g.sfx('ult', 'mod.shake');
      }
      if (!W.on) return;
      if (!W.gulp && W.t >= c.shake) { W.gulp = true; g.sfx('ult', 'mod.gulp'); }
      if (!W.grown && W.t >= c.shake + c.drink) {
        W.grown = true;
        const E = g.effects;
        E.burst(p.x, p.y - 14, 14, '#ffffff', 16, 120, 0.45);
        E.wave(p.x, p.y, 34, '#ffd23f', 0.35, 3);
        E.shake(4, 0.25);
        E.pop(p.x, p.y - 44, 'PUMPED!', 'heavy', '#ffd23f');
        g.sfx('ult', 'mod.pump');
        bark(g, 'mod', p);
      }
      // phồng người lúc chờ giao bóng (cầu thủ đứng yên, Player không tự đổi cỡ): đặt thẳng cỡ — to vượt pump lần rồi về scale
      if (W.grown) {
        const k = Math.min(1, (W.t - c.shake - c.drink) / c.grow), sc = behind(g) ? c.rageScale : c.scale;
        p.sizeMul = k < 0.5 ? 1 + (sc * c.pump - 1) * (k / 0.5) : sc * c.pump + (sc - sc * c.pump) * ((k - 0.5) / 0.5);
        p.sizeTarget = sc; p.sizeT = Math.max(p.sizeT, 0.3);
        p.radius = SFC_CONFIG.game.player.radius * p.sizeMul;
      }
    },
    update(g, M, c) {
      const list = g.players.filter((q) => this.isGiant(M, q));
      if (!list.length) return;
      if (behind(g) && !M.rage) {
        M.rage = true;
        g.emit('banner', { text: c.rage, sub: c.rageHint, color: '#ff3d5a' });
        g.sfx('ult', 'mod.stomp');
        for (const p of list) g.effects.burst(p.x, p.y - 10, 8, '#ff3d5a', 12, 80, 0.5);
      }
      // giữ cỡ to mỗi bước (Player.sizeT hết là về 1; Tuyệt kỹ teo nhỏ vẫn đè được trong lúc nó chạy)
      const sc = behind(g) ? c.rageScale : c.scale;
      for (const p of list) if (!(p.sizeT > 0.25) || p.sizeTarget >= 1) { p.sizeTarget = Math.max(p.sizeTarget, sc); p.sizeT = Math.max(p.sizeT, 0.2); }
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

  /* Tower Guards (GOAT PATH Elite) — ĐÈN PHA NÓNG (user 2026-10-27): đèn pha đi lang thang trên sân (roam px/s, tới điểm ngẫu nhiên này rồi điểm khác).
   * Soi trúng ai đội bạn là khoá người đó (đèn ngả đỏ, không hiện chữ) và đuổi theo chase px/s (chậm hơn chạy nhanh): người đó phải ra khỏi đèn liên tục
   * forget giây thì đèn mới quên, quay lại đi lang thang. Ai đội bạn đứng trong đèn nóng dần (thanh nhiệt 4 nấc trên đầu + quầng đỏ: prop 'heat',
   * b = nấc), ra chỗ tối thì nguội. Nóng đầy = BỐC CHÁY: đứng tại chỗ phủi lửa (prop 'burn'), đổi hướng trái <-> phải mash lần mới dập xong
   * (AI tự dập aiRate lần / giây), quá burn giây tự tắt; người đang cháy thì đèn thôi đuổi. Đồng đội AI nóng quá nửa thì tự chạy ra khỏi đèn.
   * Guards bị dẫn: bật thêm 1 đèn (LOCKDOWN). Đèn chạy theo từng đoạn thẳng seg giây: mỗi đoạn 1 prop 'spot' (x, y -> a, b), máy khách vẽ được */
  K.searchlight = {
    create(g, M, c) { M.lights = [this.light(g, c)]; M.heat = {}; M.held = []; M.imm = {}; },
    // điểm ngẫu nhiên trong sân (cách mép)
    spot(g, c) { const f = g.field; return { x: U.rand(f.x + c.marginX, f.x + f.w - c.marginX), y: U.rand(f.y + c.marginY, f.y + f.h - c.marginY) }; },
    light(g, c, from) {
      const p = from || this.spot(g, c), w = this.spot(g, c);
      return { sx: p.x, sy: p.y, nx: p.x, ny: p.y, st: c.seg, cx: p.x, cy: p.y, wx: w.x, wy: w.y, target: null, lost: 0, id: 0 };
    },
    kickoff(g, M, c) {
      heldKickoff(g, M);
      M.heat = {};
      for (const L of M.lights) { L.target = null; L.id = 0; this.step(g, M, c, L); }   // dựng lại đèn ngay (giao bóng vừa xoá hết vật thể)
    },
    clock(g, M, c, dt) { for (const L of M.lights) L.st += dt; },
    // đoạn đường kế tiếp: từ chỗ đang đứng đi về phía người bị khoá (hoặc điểm lang thang) tối đa speed x seg px
    step(g, M, c, L) {
      const f = g.field, tg = L.target || { x: L.wx, y: L.wy }, sp = (L.target ? c.chase : c.roam) * c.seg;
      L.sx = L.nx; L.sy = L.ny;
      const dx = tg.x - L.sx, dy = tg.y - L.sy, d = Math.hypot(dx, dy);
      if (!L.target && d < 6) { const w = this.spot(g, c); L.wx = w.x; L.wy = w.y; }
      const k = d > sp ? sp / d : 1;
      L.nx = U.clamp(L.sx + dx * k, f.x + 20, f.x + f.w - 20); L.ny = U.clamp(L.sy + dy * k, f.y + 14, f.y + f.h - 14);
      L.st = 0;
      if (L.id) g.effects.propOff(L.id, 0.001);
      L.id = newId(g);
      g.effects.prop(L.id, 'spot', L.sx, L.sy, L.nx, L.ny, c.seg + 0.5, L.target ? c.chaseColor : c.color);
    },
    // q có đang trong đèn nào không -> đèn đó
    lit(M, c, q) {
      for (const L of M.lights) if (Math.hypot((q.x - L.cx) * 0.9, (q.y - L.cy) * 1.6) < c.r) return L;
      return null;
    },
    in(L, c, q) { return Math.hypot((q.x - L.cx) * 0.9, (q.y - L.cy) * 1.6) < c.r; },
    // đổi nấc nhiệt hiển thị (0 = tắt)
    level(g, H, o, lv, c) {
      if (lv === H.lv) return;
      if (H.id) g.effects.propOff(H.id, 0.15);
      if (lv > H.lv) g.sfx('ult', 'mod.sizzle');
      H.lv = lv; H.id = 0;
      if (lv > 0) { H.id = newId(g); g.effects.prop(H.id, 'heat', o.x, o.y, o.id, lv, 9999, c.color); }
    },
    // đồng đội AI nóng quá nửa mà còn trong đèn: chạy ra xa tâm đèn
    aiMove(g, M, c, p) {
      if (p.team === M.team || p.state !== 'normal' || !((M.heat[p.id] || {}).v > 0.5)) return false;
      const L = this.lit(M, c, p);
      if (!L) return false;
      const d = U.norm(p.x - L.cx || 0.1, p.y - L.cy);
      p.intent.mx = d.x; p.intent.my = d.y; p.intent.sprint = true;
      return true;
    },
    update(g, M, c, dt) {
      const E = g.effects;
      // Guards bị dẫn: LOCKDOWN — bật đèn thứ 2 (1 lần mỗi trận)
      if (behind(g) && M.lights.length < 2) {
        M.lights.push(this.light(g, c));
        g.emit('banner', { text: c.lockdown, sub: c.lockdownHint, color: '#ff3d5a' });
        g.sfx('ult', 'mod.siren');
      }
      const burning = (o) => M.held.some((h) => h.o === o);
      for (const L of M.lights) {
        const k = Math.min(1, L.st / c.seg);
        L.cx = L.sx + (L.nx - L.sx) * k; L.cy = L.sy + (L.ny - L.sy) * k;
        // khoá người: soi trúng ai đội bạn (không đang cháy) là đuổi theo người đó
        if (!L.target) {
          const o = victims(g).find((q) => grounded(q) && !burning(q) && this.in(L, c, q));
          if (o) {
            L.target = o; L.lost = 0; L.st = c.seg;   // đổi hướng ngay (không hiện chữ, chỉ đèn ngả đỏ, user 2026-10-27)
            g.sfx('ult', 'mod.beep');
          }
        } else {
          const o = L.target;
          L.lost = this.in(L, c, o) && grounded(o) ? 0 : L.lost + dt;
          if (L.lost >= c.forget || burning(o)) {   // thoát đủ lâu (hoặc đã bốc cháy): quên, đi lang thang tiếp
            if (!burning(o)) E.pop(L.cx, L.cy - 10, 'LOST THEM', 'info', c.color);
            L.target = null; L.st = c.seg;
            const w = this.spot(g, c); L.wx = w.x; L.wy = w.y;
          }
        }
        if (L.st >= c.seg) this.step(g, M, c, L);
      }
      for (const o of victims(g)) {
        const H = M.heat[o.id] || (M.heat[o.id] = { v: 0, lv: 0, id: 0 });
        if (burning(o)) { H.v = 0; this.level(g, H, o, 0, c); continue; }
        const inside = grounded(o) && !!this.lit(M, c, o);
        H.v = U.clamp(H.v + (inside ? c.heatUp : -c.cool) * dt, 0, 1);
        this.level(g, H, o, Math.ceil(H.v * 4 - 0.001), c);
        if (inside && Math.random() < dt * 6 * H.v) E.burst(o.x + U.rand(-5, 5), o.y - U.rand(8, 22), 3, '#c7ccd6', 2, 30, 0.5);   // hơi nóng bốc
        if (H.v < 1 || o.state === 'stun') continue;
        H.v = 0; this.level(g, H, o, 0, c);
        if (hold(g, M, o, 'burn', c.burn, { n: 0, last: 0, ai: 0 })) {
          E.pop(o.x, o.y - 30, 'ON FIRE!', 'status', '#ff6a1f');
          E.burst(o.x, o.y - 8, 6, '#ff6a1f', 14, 80, 0.5);
          g.sfx('ult', 'mod.scorch');
          bark(g, 'mod');
        }
      }
      // dập lửa: người chơi đổi hướng trái <-> phải = 1 lần phủi · AI tự phủi aiRate lần / giây
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
        E.burst(o.x - s * 6, o.y - 10, 6, '#ffd23f', 4, 60, 0.3);
        g.sfx('ult', 'mod.pat');
        if (h.n >= c.mash) release(g, M, h, true);
      });
    },
  };

  /* Night Owls — MẮT CÚ "đèn xanh, đèn đỏ" (user 2026-10-22, thay SEARCHLIGHT). Con cú khổng lồ đậu trên khán đài suốt trận (prop 'owl', dựng lại
   * mỗi lần giao bóng), bình thường nhắm mắt. Mỗi every giây: "HOO...", mắt mở dần warn giây (báo trước, giữ nguyên kể cả khi họ bị dẫn),
   * rồi mở hẳn open giây (prop 'owleyes' a = warn, b = open: con cú đọc prop này để vẽ mắt). Lúc mắt mở hẳn:
   *   - ai bên bạn đang CHẠY (đè phím chạy nhanh, hoặc đang lướt) bị tia ngắm khoá (prop 'gazelock': tia đỏ + vòng ngắm co dần);
   *     đứng lại / đi bộ là tia nhả ra. Chạy tiếp đủ lockT giây -> mắt cú bắn 1 viên đạn sáng (prop 'owlbolt') đuổi theo người đó, bay boltT giây;
   *   - đạn tới nơi nổ thành TIA LASER thẳng từ mắt cú qua chỗ người đó tới mép sân, đứng beamT giây (prop 'owlbeam'). Tia xuyên qua mọi người
   *     (user 2026-10-25): ai bên bạn chạm tia (người bị nhắm, người đứng chắn giữa đường, người chạy vào sau) đều trúng;
   *   - lướt (Z) đúng lúc chạm tia là né được (Actions.dodged); trúng = HOÁ ĐÁ stone giây (user 2026-10-22, thay đóng băng): đá lan từ chân lên
   *     thành tượng (prop 'petrify'), đứng chôn chân + rơi bóng, hết giờ tượng nứt rồi vỡ vụn. Mỗi người bị khoá + bắn tối đa 1 lần mỗi lượt mắt mở.
   * Đi bộ / đứng im / sút / chuyền / đấm tại chỗ đều được; chuyển động do Core / Tuyệt kỹ (state recover) không tính. Ai phạm luật người đó chịu —
   * kể cả đồng đội AI (mỗi lượt, mỗi AI tuân luật với xác suất aiObey: đi bộ suốt lúc đó). Owls đi lại thoải mái nhưng không ra đòn / sút / chuyền
   * lúc mắt mở (noActT). Họ bị dẫn: mắt mở thường hơn (trailing) và lâu hơn (x trailOpen) */
  K.owlgaze = {
    create(g, M, c) { M.next = c.first; M.gaze = null; M.bolts = []; M.beams = []; M.stone = []; },
    kickoff(g, M, c) {
      // clearHazards vừa xoá hết vật thể: đặt lại con cú, bỏ lượt mắt mở / đạn / tia / tượng đá đang dở
      M.gaze = null; M.bolts = []; M.beams = []; M.stone = [];
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
    // đạn tới nơi: nổ thành tia laser từ mắt cú (giữa mép trên sân) qua chỗ người bị nhắm, kéo dài tới mép sân
    land(g, M, c, b) {
      const E = g.effects, o = b.p, f = g.field, x0 = f.cx, y0 = f.y, d = U.norm(o.x - x0, Math.max(1, o.y - y0));
      E.propOff(b.id, 0.02);
      let s = (f.y + f.h - y0) / d.y;
      if (Math.abs(d.x) > 0.01) s = Math.min(s, ((d.x > 0 ? f.x + f.w : f.x) - x0) / d.x);
      const B = { x0, y0, x1: x0 + d.x * s, y1: y0 + d.y * s, t: 0, id: newId(g), done: new Set() };
      M.beams.push(B);
      E.prop(B.id, 'owlbeam', B.x0, B.y0, B.x1, B.y1, c.beamT, '#ff3d5a');
      E.burst(o.x, o.y - 10, 8, '#ff3d5a', 12, 110, 0.4);
      E.shake(SFC_CONFIG.game.fx.shakeHit);
      g.sfx('ult', 'mod.beam');
      this.beam(g, M, c, B);
    },
    // tia đang đứng: ai bên bạn chạm tia (xét 1 lần mỗi người mỗi tia) -> lướt đúng lúc = né, không thì hoá đá. Tia không bị ai chắn
    beam(g, M, c, B) {
      for (const o of victims(g)) {
        if (B.done.has(o.id) || !grounded(o) || U.segDist(o.x, o.y, B.x0, B.y0, B.x1, B.y1) > c.beamR + o.radius * 0.5) continue;
        B.done.add(o.id);
        if (M.stone.some((I) => I.p === o)) continue;
        if (Act().dodged(g, o)) { g.effects.burst(o.x, o.y - 10, 6, '#ff3d5a', 10, 90, 0.4); g.sfx('ult', 'mod.fizzle'); continue; }
        this.petrify(g, M, c, o);
      }
    },
    // hoá đá người o
    petrify(g, M, c, o) {
      const E = g.effects;
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
      // đạn đang bay + tia laser đang đứng (vẫn tiếp tục kể cả khi mắt đã nhắm)
      for (const b of M.bolts.slice()) if ((b.t += dt) >= c.boltT) { M.bolts.splice(M.bolts.indexOf(b), 1); this.land(g, M, c, b); }
      for (const B of M.beams.slice()) { if ((B.t += dt) >= c.beamT) M.beams.splice(M.beams.indexOf(B), 1); else this.beam(g, M, c, B); }
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
   * tường chặn bóng + chặn đội bạn trong life giây. Billboard Kids chạy tới tường thì nhảy parkour qua (user 2026-10-25, thay đi xuyên):
   * bật lên cao vaultH px, 1 tay chống mép tường, co chân lướt qua, đáp xuống phía bên kia sau vaultT giây (prop 'vault' vẽ người thay sprite);
   * đang dẫn bóng thì bóng nảy qua tường cùng người */
  K.graffiti = {
    create(g, M, c) { M.next = c.first; M.walls = []; M.vaults = []; },
    kickoff(g, M) {
      for (const V of M.vaults) g.effects.propOff(V.id, 0.01);
      M.walls = []; M.vaults = [];
    },
    clock(g, M, c, dt) { for (const w of M.walls) w.t += dt; },
    // điểm gần nhất trên đoạn tường w
    close(w, x, y) {
      const vx = w.x1 - w.x0, vy = w.y1 - w.y0, k = U.clamp(((x - w.x0) * vx + (y - w.y0) * vy) / (vx * vx + vy * vy), 0, 1);
      return { x: w.x0 + vx * k, y: w.y0 + vy * k };
    },
    // Billboard Kid p chạy sát tường w -> bật nhảy qua: từ chỗ đứng sang điểm đối xứng bên kia tường
    vault(g, M, c, p, w) {
      const q = this.close(w, p.x, p.y), dx = q.x - p.x, dy = q.y - p.y, dd = Math.hypot(dx, dy);
      const d = dd > 0.5 ? { x: dx / dd, y: dy / dd } : U.norm(p.vx, p.vy);
      const id = newId(g), x1 = q.x + d.x * (p.radius + 5), y1 = q.y + d.y * (p.radius + 5);
      M.vaults.push({ p, x0: p.x, y0: p.y, x1, y1, t: 0, id });
      // prop: x = chỗ qua tường · y = chân tường gần camera nhất (giữa cú nhảy vẽ trước cả bức tường) · a = người · b = độ cao bật
      g.effects.prop(id, 'vault', q.x, Math.max(w.y0, w.y1), p.id, c.vaultH, c.vaultT, w.col);
      g.effects.burst(p.x, p.y, 2, '#c7ccd6', 5, 50, 0.3);
      g.sfx('ult', 'mod.vault');
    },
    update(g, M, c, dt) {
      const E = g.effects, f = g.field, b = g.ball;
      // người đang nhảy qua tường: bay theo đường thẳng từ chỗ bật tới chỗ đáp, không ra đòn / sút / chuyền giữa chừng
      for (const V of M.vaults.slice()) {
        const p = V.p;
        if (p.state === 'stun' || g.state !== 'play') { M.vaults.splice(M.vaults.indexOf(V), 1); E.propOff(V.id, 0.05); continue; }
        V.t += dt;
        const k = Math.min(1, V.t / c.vaultT);
        p.x = V.x0 + (V.x1 - V.x0) * k; p.y = V.y0 + (V.y1 - V.y0) * k;
        p.vx = (V.x1 - V.x0) / c.vaultT; p.vy = (V.y1 - V.y0) / c.vaultT;
        p.noActT = Math.max(p.noActT || 0, 0.05);
        if (b.owner === p) {
          const a = Math.atan2(p.vy, p.vx), off = SFC_CONFIG.game.ball.dribbleOffset;
          b.x = p.x + Math.cos(a) * off; b.y = p.y + Math.sin(a) * off * 0.85 + 1; b.z = c.vaultH * Math.sin(Math.PI * k) + 4;
        }
        if (k < 1) continue;
        M.vaults.splice(M.vaults.indexOf(V), 1);
        E.burst(p.x, p.y, 2, '#c7ccd6', 6, 60, 0.35);
      }
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
        const close = (x, y) => this.close(w, x, y);
        // Billboard Kids chạy về phía tường, sát tường -> nhảy parkour qua
        for (const p of g.teams[M.team].players) {
          if (!grounded(p) || (p.state !== 'normal' && p.state !== 'dash') || M.vaults.some((V) => V.p === p)) continue;
          const q = close(p.x, p.y), dx = q.x - p.x, dy = q.y - p.y, dd = Math.hypot(dx, dy);
          if (dd < p.radius + 3 && (dd < 0.5 || (p.vx * dx + p.vy * dy) / dd > 25)) this.vault(g, M, c, p, w);
        }
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

  /* Market Mamas — ĐŨA KHỔNG LỒ (user 2026-10-24, thay DÉP BAY): 2 Big Mama khổng lồ ngồi trên khán đài, mỗi bà 1 bên bảng tỉ số (i = 0 trái, 1 phải),
   * mỗi bà sau 1 nồi mì khổng lồ ở mép trên sân. Định kỳ 1 bà vươn đôi đũa khổng lồ xuống sân (đũa nối từ tay bà tới chỗ gắp) — 2 bà LẦN LƯỢT
   * (M.turn), vào FINAL PUSH thì CẢ 2 BÀ CÙNG LÚC (2 người):
   *   aim warn giây: mũi đũa lơ lửng trên đầu người bị nhắm (người cầm bóng bên bạn / người gần bóng nhất), bóng đũa + vòng đỏ dưới chân, đi theo người đó;
   *   strike lock + strike giây: đũa DỪNG đón đầu chỗ người đó sắp chạy tới rồi cắm xuống — đổi hướng hoặc lướt là né (đồng đội AI tự né aiDodge);
   *   trúng: GOTCHA! bị gắp nhấc bổng lên cao height, mang về thả ùm vào nồi (carry giây), ngồi trong nồi inPot giây (chỉ ló đầu đội sợi mì),
   *   rồi BOING! bật ra một chỗ ngẫu nhiên trên sân (fly giây), đáp đất choáng thêm land giây. Hụt: CLACK! đũa cắm xuống đất.
   * Họ bị dẫn: gắp thường hơn (trailing). Người đang bị gắp / trong nồi / bay: state stun + airZ > 4 (không va chạm, không nhặt bóng, luật khác bỏ qua).
   * Vị trí vật thể: bám người (aim, carry, inpot) hoặc toạ độ cố định (strike) — máy khách vẽ được qua lệnh hiệu ứng */
  K.chopsticks = {
    create(g, M, c) { M.next = c.first; M.grabs = []; M.turn = 1; },
    kickoff(g, M, c) {
      // clearHazards vừa xoá hết vật thể: đặt lại 2 Big Mama + nồi mì, trả người đang bị gắp về sân
      for (const G of M.grabs) this.free(g, G);
      M.grabs = [];
      for (const i of [0, 1]) { const st = this.seat(g, i); g.effects.prop(newId(g), 'mama', st.x, st.y, i, 0, 99999, c.color); }
    },
    clock(g, M, c, dt) { for (const G of M.grabs) G.t += dt; },
    // chỗ Big Mama thứ i ngồi (mép trên sân, 1/4 và 3/4 bề ngang) · nồi mì ngay trước mặt bà · chỗ người trong nồi đứng (mép trên sân, dưới nồi)
    seat(g, i) { return { x: Math.round(g.field.x + g.field.w * (i ? 0.76 : 0.24)), y: g.field.y }; },
    pot(g, i) { const st = this.seat(g, i); return { x: st.x, y: g.field.y + 8 }; },
    // q đang bị 1 lượt gắp khác (không tính lượt G) nhắm / gắp
    busy(M, q, G = null) { return M.grabs.some((H) => H !== G && (H.p === q || H.v === q)); },
    start(g, M, c) {
      const b = g.ball, vs = victims(g).filter((q) => grounded(q) && q.state !== 'stun' && !this.busy(M, q));
      if (!vs.length) { M.next = 1; return; }
      vs.sort((p, q) => (q.hasBall - p.hasBall) || Math.hypot(p.x - b.x, p.y - b.y) - Math.hypot(q.x - b.x, q.y - b.y));
      // bà nào gắp: lần lượt từng bà · FINAL PUSH: cả 2 bà cùng lúc, mỗi bà 1 người
      const mamas = g.finalPush && vs.length > 1 ? [0, 1] : [(M.turn ^= 1)], E = g.effects;
      mamas.forEach((i, k) => {
        const G = { p: vs[k], i, phase: 'aim', t: 0, id: newId(g), x: 0, y: 0, v: null };
        M.grabs.push(G);
        E.prop(G.id, 'chopaim', G.p.x, G.p.y, G.p.id, i, c.warn, '#ff3d5a');
        const st = this.seat(g, i);
        E.pop(st.x, st.y + 18, mamas.length > 1 ? 'DOUBLE SERVING!' : 'ORDER UP!', 'info', '#ff3d5a');
      });
      g.sfx('ult', 'mod.chopup');
      M.barkT = 0;
      bark(g, 'mod');
    },
    // giữ người đang bị gắp ở trạng thái "ngoài cuộc": choáng, bất tử, lơ lửng (airZ > 4)
    pin(q, z) {
      q.state = 'stun'; q.stateT = Math.max(q.stateT, 0.3); q.hitImmune = Math.max(q.hitImmune, 0.3);
      q.vx = q.vy = q.kbx = q.kby = 0; q.airZ = Math.max(5, z); q.airVz = 0;
    },
    // giao bóng lại giữa chừng: trả người về đứng bình thường
    free(g, G) {
      g.effects.propOff(G.id, 0.05);
      const q = G.v;
      if (!q) return;
      q.airZ = 0; q.airVz = 0;
      if (q.state === 'stun') { q.state = 'normal'; q.stateT = 0; }
    },
    update(g, M, c, dt) {
      if (!M.grabs.length && every(g, M, c, dt)) this.start(g, M, c);
      const E = g.effects, f = g.field;
      for (const G of M.grabs.slice()) {
        const P = this.pot(g, G.i);
        if (G.phase === 'aim') {
          if (G.t < c.warn) continue;
          // đũa dừng: khoá chỗ gắp đón đầu (chỗ người đó sắp chạy tới sau lock + strike giây, x lead) rồi cắm xuống
          const q = G.p, ld = (c.lock + c.strike) * c.lead;
          G.phase = 'strike'; G.t = 0;
          G.x = U.clamp(q.x + q.vx * ld, f.x + 10, f.x + f.w - 10); G.y = U.clamp(q.y + q.vy * ld, f.y + 10, f.y + f.h - 10);
          E.propOff(G.id, 0.01);
          G.id = newId(g);
          E.prop(G.id, 'chopstrike', G.x, G.y, G.i, 0, c.lock + c.strike + 0.45, c.color);
          g.sfx('ult', 'mod.whoosh');
          continue;
        }
        if (G.phase === 'strike') {
          if (G.t < c.lock + c.strike) continue;
          // cắm xuống: người bên bạn gần chỗ gắp nhất trong bán kính r
          let v = null, best = c.r;
          for (const q of victims(g)) {
            if (!grounded(q) || q.state === 'stun' || this.busy(M, q, G)) continue;
            const d = Math.hypot(q.x - G.x, (q.y - G.y) * 1.2) - q.radius;
            if (d < best) { best = d; v = q; }
          }
          E.shake(2, 0.15);
          const aiDodge = v && !(v.isControlled && g.isHuman(v.team)) && Math.random() < c.aiDodge;
          if (!v || aiDodge || Act().dodged(g, v)) {
            if (aiDodge) E.pop(v.x, v.y - 30, 'DODGE!', 'good', '#3ff6ff');
            E.pop(G.x, G.y - 20, 'CLACK!', 'info', '#f3d08a');
            E.burst(G.x, G.y, 0, '#c9b48a', 8, 70, 0.4);
            g.sfx('ult', 'mod.clack');
            M.grabs.splice(M.grabs.indexOf(G), 1);
            continue;
          }
          v.hitImmune = 0;
          if (v.state === 'stun') { v.state = 'normal'; v.stateT = 0; }
          if (!v.hit({ stun: 9, kbx: 0, kby: 0, type: 'hard', quiet: true })) { M.grabs.splice(M.grabs.indexOf(G), 1); continue; }
          M.hits++;
          G.v = v; G.phase = 'carry'; G.t = 0; G.sx = v.x; G.sy = v.y;
          E.propOff(G.id, 0.01);
          G.id = newId(g);
          E.prop(G.id, 'chopcarry', v.x, v.y, v.id, G.i, c.carry + 0.05, c.color);
          E.pop(v.x, v.y - 34, 'GOTCHA!', 'heavy', '#ff8a3f');
          E.burst(v.x, v.y - 10, 4, '#f3d08a', 10, 90, 0.4);
          g.hitStop(0.06);
          g.sfx('ult', 'mod.pinch');
          continue;
        }
        const v = G.v;
        if (G.phase === 'carry') {
          // nhấc bổng lên, mang về nồi (cung tròn), thả ùm xuống
          const k = Math.min(1, G.t / c.carry), e = k * k * (3 - 2 * k);
          v.x = G.sx + (P.x - G.sx) * e; v.y = G.sy + (P.y - G.sy) * e;
          this.pin(v, c.height * Math.sin(Math.PI * Math.min(1, k * 1.15)) + 30 * k);
          v.facing += dt * 10;
          if (k < 1) continue;
          G.phase = 'pot'; G.t = 0;
          E.propOff(G.id, 0.05);
          G.id = newId(g);
          E.prop(G.id, 'inpot', P.x, P.y, v.id, G.i, c.inPot + 0.1, c.color);
          E.burst(P.x, f.y - 14, 10, '#f3d08a', 18, 130, 0.6);
          E.burst(P.x, f.y - 14, 10, '#ffffff', 10, 90, 0.5);
          E.pop(P.x, f.y - 30, 'PLOP!', 'heavy', '#f3d08a');
          g.sfx('ult', 'mod.plop');
          continue;
        }
        if (G.phase === 'pot') {
          v.x = P.x; v.y = P.y;
          this.pin(v, 5);
          if (G.t < c.inPot) continue;
          // bật ra chỗ ngẫu nhiên trên sân (xa nồi)
          let lx = 0, ly = 0;
          for (let k = 0; k < 20; k++) {
            lx = U.rand(f.x + 40, f.x + f.w - 40); ly = U.rand(f.y + 40, f.y + f.h - 24);
            if (Math.hypot(lx - P.x, ly - P.y) > 140) break;
          }
          G.phase = 'fly'; G.t = 0; G.lx = lx; G.ly = ly;
          E.propOff(G.id, 0.02);
          E.burst(P.x, f.y - 14, 10, '#f3d08a', 14, 120, 0.5);
          E.pop(P.x, f.y - 30, 'BOING!', 'status', '#ff8a3f');
          g.sfx('ult', 'mod.boing');
          continue;
        }
        // fly: bay vòng cung từ nồi tới chỗ đáp
        const k = Math.min(1, G.t / c.fly);
        v.x = P.x + (G.lx - P.x) * k; v.y = P.y + (G.ly - P.y) * k;
        this.pin(v, 5 + Math.sin(Math.PI * k) * 70);
        v.facing += dt * 14;
        if (k < 1) continue;
        v.airZ = 6; v.airVz = -120;
        v.stateT = c.land; v.hitImmune = c.land + 0.3;
        M.grabs.splice(M.grabs.indexOf(G), 1);
      }
    },
  };

  /* Rust Buckets — SÓNG DỮ (user 2026-10-24, thay HIGH TIDE): sóng ập vào từ mép trên hoặc mép dưới sân (ngẫu nhiên mỗi con). Biển rút trước (vùng nước sắp tràn tới hiện ra,
   * mép bọt trắng nhấp nháy), rồi sóng tràn vào: mép sóng quét qua ai bên bạn thì người đó choáng + bị cuốn xuôi (rơi bóng), lướt xuyên sóng là né.
   * Sóng rút: ai còn trong nước bị kéo về phía biển, bóng cũng vậy. Thuỷ thủ thì lướt ván trên sóng (chạy nhanh một lúc).
   * Mực sóng là hàm thuần của tuổi vật thể (front / depth) nên máy vẽ (cả khách online) tự tính. Họ bị dẫn: sóng dày hơn + rộng hơn */
  K.waves = {
    create(g, M, c) { M.next = c.first; M.runs = []; },
    kickoff(g, M) { M.runs = []; },
    clock(g, M, c, dt) { for (const r of M.runs) r.t += dt; },
    life(c) { return c.warn + c.rise + c.hold + c.back; },
    // độ tràn của sóng 0..1 theo giây t kể từ lúc báo trước (sim + vẽ dùng chung)
    front(c, t) {
      t -= c.warn;
      if (t < 0) return 0;
      if (t < c.rise) { const k = t / c.rise; return 1 - (1 - k) * (1 - k); }
      if ((t -= c.rise) < c.hold) return 1;
      return U.clamp(1 - (t - c.hold) / c.back, 0, 1);
    },
    // độ sâu nước (px tính từ mép sóng tới) ở vị trí u = (x - tâm) / hw trong [-1, 1]: lưỡi sóng hai đầu thấp hơn
    depth(c, f, k, u) { return k * c.reach * f.h * (1 - 0.35 * u * u * u * u); },
    spawn(g, M, c) {
      const f = g.field, b = g.ball, hw = behind(g) ? c.trailHw : c.hw;
      const x = U.clamp(b.x + U.rand(-40, 40), f.x + hw * 0.6, f.x + f.w - hw * 0.6);
      // dir: 1 = từ mép trên tràn xuống · -1 = từ mép dưới xô lên
      const r = { x, hw, dir: Math.random() < 0.5 ? 1 : -1, t: 0, hits: new Set(), id: newId(g) };
      M.runs.push(r);
      g.effects.prop(r.id, 'seawave', x, f.y, hw, r.dir, this.life(c), c.color);
      g.sfx('ult', 'mod.swell');
      bark(g, 'mod');
    },
    update(g, M, c, dt) {
      if (every(g, M, c, dt)) this.spawn(g, M, c);
      const f = g.field, b = g.ball, E = g.effects;
      for (const r of M.runs) {
        const k = this.front(c, r.t);
        if (k <= 0) continue;
        const rising = r.t < c.warn + c.rise + c.hold;
        if (!r.crashed) { r.crashed = true; g.sfx('ult', 'mod.surge'); E.shake(2, 0.3); }
        // (x, y) có nằm trong nước không (tính cả bán kính rr)
        const wet = (x, y, rr) => {
          const u = (x - r.x) / r.hw;
          if (Math.abs(u) > 1) return false;
          const d = this.depth(c, f, k, u);
          return r.dir > 0 ? y < f.y + d + rr : y > f.y + f.h - d - rr;
        };
        for (const q of g.players) {
          if (!grounded(q) || !wet(q.x, q.y, q.radius)) continue;
          if (rising) {
            if (r.hits.has(q.id)) continue;
            r.hits.add(q.id);
            if (q.team === M.team) {   // thuỷ thủ lướt ván trên sóng
              q.buffs.push({ speed: c.surf, t: c.surfT });
              E.prop(newId(g), 'surf', q.x, q.y, q.id, 0, c.surfT, '#ff9a3d');
              E.burst(q.x, q.y, 2, '#e8f6ff', 10, 90, 0.4);
              // chữ chỉ hiện ở người lướt đầu tiên mỗi con sóng (cả đội cùng lướt thì chữ chồng nhau rối mắt)
              if (!r.surfed) { r.surfed = true; E.pop(q.x, q.y - 30, "SURF'S UP!", 'status', '#3fa8ff'); g.sfx('ult', 'mod.surf'); }
              continue;
            }
            if (Act().dodged(g, q)) continue;
            if (q.hit({ stun: c.stun, kbx: (q.x - r.x) * 0.6, kby: c.push * r.dir, type: 'hard', quiet: true })) {
              M.hits++;
              E.pop(q.x, q.y - 30, 'SPLASH!', 'heavy', c.color);
              E.burst(q.x, q.y - 4, 6, '#e8f6ff', 14, 120, 0.5);
              E.burst(q.x, q.y - 2, 2, c.color, 8, 80, 0.4);
              g.hitStop(0.04);
              g.sfx('ult', 'mod.splash');
              bark(g, 'mod');
            }
          } else if (q.team !== M.team) {
            // sóng rút: kéo về phía mép sóng tới, lội chậm
            q.y = U.clamp(q.y - c.pull * r.dir * dt, f.y + q.radius, f.y + f.h - q.radius);
            keepSpeed(q, c.slow);
          }
        }
        // bóng trong nước: sóng tràn thì cuốn xuôi, sóng rút thì kéo về biển
        if (!b.owner && b.z < 10 && wet(b.x, b.y, b.r)) {
          if (rising && !r.ballHit) {
            r.ballHit = true;
            b.vx *= 0.5; b.vy = r.dir > 0 ? Math.max(b.vy, c.ballPush) : Math.min(b.vy, -c.ballPush); b.vz = 40;
            b.lastKickTeam = -1;
            E.burst(b.x, b.y, 2, '#e8f6ff', 8, 80, 0.3);
          } else if (!rising) b.vy -= c.ballPull * r.dir * dt;
        }
      }
      M.runs = M.runs.filter((r) => r.t < this.life(c));
    },
  };

  /* Retired Refs — TRỌNG TÀI: người chơi (không tính đồng đội AI) ra đòn trúng (choáng) 1 Ref là phạm lỗi: lần lẻ thẻ vàng (cảnh cáo), lần chẵn thẻ đỏ = đứng ngoài redTime giây
   * (choáng tại chỗ, thẻ đỏ trên đầu). Các Ref thì phạm lỗi thoải mái. Hook: Player.hit -> MatchMods.hitBy */
  K.refs = {
    create(g, M) { M.cards = {}; M.lastFoul = {}; },
    hitBy(g, M, c, victim, opts) {
      const p = opts.source;
      // chỉ người do người chơi điều khiển bị thẻ (đồng đội AI không tự chọn được cách đá)
      if (victim.team !== M.team || !p || p.team === M.team || p.seat == null || !(opts.stun > 0)) return;
      // 1 pha vào bóng có thể trúng 2 lần (user 2026-10-24: vẫn chỉ 1 thẻ): trong gap giây sau lỗi trước của cùng người thì bỏ qua
      if (g.time - (M.lastFoul[p.id] ?? -99) < c.gap) return;
      M.lastFoul[p.id] = g.time;
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

  /* Grandpa's Squad — LỐC CÁT (user 2026-10-24, thay BACK IN MY DAY): định kỳ gió làng cuộn lên n cột lốc cát (đội các cụ bị dẫn: trailN, FINAL PUSH: pushN), mỗi cột
   * xoáy cát dưới đất warn giây (báo trước) rồi dựng thành phễu, lang thang ngẫu nhiên trên sân life giây. Ai bên bạn chạm lốc (lướt né được):
   * bị xoáy hất tung lên trời (rơi bóng), lơ lửng xoay vòng air giây rồi mới rơi xuống, đáp đất choáng thêm land giây. Bóng lỏng chạm lốc bị hất lên.
   * Các cụ đi xuyên lốc không sao ("gió làng mình mà"). Đường đi của lốc là hàm thuần của tuổi vật thể (at) nên máy vẽ tự tính */
  K.devils = {
    create(g, M, c) { M.next = c.first; M.list = []; M.flung = []; },
    kickoff(g, M) {
      for (const d of M.list) g.effects.propOff(d.id);
      M.list = [];
      for (const h of M.flung.slice()) this.drop(g, M, h, false);
      M.flung = [];
    },
    clock(g, M, c, dt) { for (const d of M.list) d.t += dt; },
    // vị trí cột lốc tuổi el (o.x, o.y = chỗ mọc, o.a = hạt giống đường đi): 2 sóng sin mỗi trục, xuất phát đúng chỗ mọc, kẹp trong sân
    at(o, el) {
      const c = S().mods.devils, F = SFC_CONFIG.game.field, sd = o.a, w = c.speed[0] + (sd % 1) * (c.speed[1] - c.speed[0]);
      const wave = (amp, w1, ph, k) => amp * (Math.sin(el * w1 + ph) - Math.sin(ph)) + amp * 0.35 * (Math.sin(el * w1 * k + ph * 3) - Math.sin(ph * 3));
      const m = 14;
      return {
        x: U.clamp(o.x + wave(c.amp[0], w, sd, 2.3), F.x + m, F.x + F.w - m),
        y: U.clamp(o.y + wave(c.amp[1], w * 1.27, sd * 1.9 + 1, 1.8), F.y + m, F.y + F.h - m),
      };
    },
    spawn(g, M, c) {
      const f = g.field;
      for (let i = 0, n = g.finalPush ? c.pushN : behind(g) ? c.trailN : c.n; i < n; i++) {
        let x = 0, y = 0;
        // chỗ mọc: cách người + cách các lốc khác (nhiều lốc một lúc thì rải khắp sân)
        for (let k = 0; k < 40; k++) {
          x = U.rand(f.x + 40, f.x + f.w - 40); y = U.rand(f.y + 24, f.y + f.h - 24);
          if (g.players.every((q) => Math.hypot(q.x - x, q.y - y) > 50) && M.list.every((d) => Math.hypot(d.x - x, d.y - y) > 60)) break;
        }
        const d = { x, y, a: U.rand(0, 6.28), t: 0, id: newId(g) };
        M.list.push(d);
        g.effects.prop(d.id, 'devil', x, y, d.a, 0, c.life, '#d9b77a');
      }
      g.sfx('ult', 'mod.gust');
      bark(g, 'mod');
    },
    // hất tung người o lên trời
    toss(g, M, c, o) {
      o.hitImmune = 0;
      if (!o.hit({ stun: c.air + c.land, kbx: 0, kby: 0, type: 'hard', quiet: true })) return;
      M.hits++;
      const h = { o, t: 0, x: o.x, y: o.y, spin: U.randSign(), id: newId(g) };
      M.flung.push(h);
      g.effects.prop(h.id, 'flung', o.x, o.y, o.id, 0, c.air + 0.2, '#d9b77a');
      g.effects.burst(o.x, o.y, 4, '#d9b77a', 14, 110, 0.6);
      g.effects.pop(o.x, o.y - 30, 'WHOOSH!', 'heavy', '#d9b77a');
      g.sfx('ult', 'mod.toss');
      bark(g, 'mod');
    },
    // hết giờ lơ lửng: thả rơi (Player.updateAir lo phần rơi + nảy + bụi), đáp đất còn choáng land giây. fall = false: đặt ngay xuống đất (giao bóng lại...)
    drop(g, M, h, fall) {
      const o = h.o;
      M.flung.splice(M.flung.indexOf(h), 1);
      g.effects.propOff(h.id, 0.1);
      if (!fall) { o.airZ = 0; o.airVz = 0; if (o.state === 'stun') { o.state = 'normal'; o.stateT = 0; } return; }
      o.airVz = -60;
      if (o.state === 'stun') o.stateT = M.cfg.land;
    },
    update(g, M, c, dt) {
      // vừa vào FINAL PUSH: cuộn lên ngay 1 lượt pushN cột lốc
      if (g.finalPush && !M.pushed) { M.pushed = true; M.next = U.rand(c.every[0], c.every[1]); this.spawn(g, M, c); }
      else if (every(g, M, c, dt)) this.spawn(g, M, c);
      const b = g.ball, E = g.effects;
      for (const d of M.list) {
        if (d.t < c.warn || d.t > c.life - 0.3) continue;
        const p = this.at(d, d.t);
        if (Math.random() < dt * 8) E.burst(p.x + U.rand(-8, 8), p.y, 2, '#d9b77a', 2, 30, 0.5);
        for (const o of victims(g)) {
          if (!grounded(o) || o.state === 'stun' || Math.hypot(o.x - p.x, (o.y - p.y) * 1.3) > c.r + o.radius) continue;
          if (Act().dodged(g, o)) continue;
          this.toss(g, M, c, o);
        }
        // bóng lỏng chạm lốc: bị hất lên, văng ngẫu nhiên
        if (!b.owner && b.z < 12 && Math.hypot(b.x - p.x, b.y - p.y) < c.r + b.r) {
          const a = U.rand(0, Math.PI * 2);
          b.vx = Math.cos(a) * 110; b.vy = Math.sin(a) * 70; b.vz = c.ballUp;
          b.lastKickTeam = -1;
          E.burst(b.x, b.y, 4, '#d9b77a', 8, 80, 0.4);
        }
      }
      M.list = M.list.filter((d) => d.t < c.life);
      // người đang bị hất tung: lên cao height trong rise giây rồi lơ lửng nhấp nhô + xoay vòng tại chỗ tới hết air giây
      for (const h of M.flung.slice()) {
        const o = h.o;
        if (o.state !== 'stun' || g.state !== 'play') { this.drop(g, M, h, false); continue; }
        h.t += dt;
        const k = Math.min(1, h.t / c.rise);
        o.x = h.x; o.y = h.y; o.vx = o.vy = o.kbx = o.kby = 0;
        o.airZ = Math.max(1, c.height * (1 - (1 - k) * (1 - k)) + Math.sin(h.t * 5) * 3);
        o.airVz = 0;
        o.facing += dt * 16 * h.spin;
        o.stateT = Math.max(o.stateT, c.land);
        if (h.t >= c.air) this.drop(g, M, h, true);
      }
    },
  };

  /* The Old Legends — KING LEO 1976 (user 2026-10-24, thay GOLDEN STAR): trận đánh boss. Định kỳ King Leo (đội trưởng) hoá lại chàng trai năm 1976:
   * warn giây đứng biến hình (phim nháy, chữ 1976!), rồi time giây to x scale, nhanh x speed, sút mạnh x power, có GIÁP hp vạch (thanh máu trên đầu):
   * đòn trúng hắn không làm choáng mà trừ 1 vạch (mỗi người cách nhau ít nhất hitGap giây), không cướp bóng được. Hắn tự đi lấy bóng rồi solo thẳng về
   * khung bạn, tới tầm shootRange thì sút; ai bên bạn đứng chắn đường bị húc bật (bump). Hết vạch = PHIM CHÁY: hết biến hình, hắn ngã choáng breakStun giây.
   * Không ai phá được: hết giờ hắn tung CÚ VÀO BÓNG MUỘN — đứng ngắm aim giây (mũi tên đỏ tới người bên bạn gần nhất, dài đúng tầm lao), rồi lao
   * vào bằng gầm giày dash giây; trúng = choáng tackleStun + văng, lướt né được, trọng tài không thổi còi. Lúc đứng ngắm hắn hết giáp: đánh choáng là huỷ cú lao.
   * HỢP THỂ (user 2026-10-24: một mình Leo hơi OP): lúc biến hình, 2 Legends còn lại bị hút vào người hắn (vệt vàng), FUSION! — họ rời sân (state 'meteor',
   * lơ lửng airZ cao, ẩn sprite bằng prop 'fused'), sân chỉ còn 1 nhân vật siêu mạnh chạy như tia chớp (x fuseSpeed, tàn ảnh + tia điện).
   * Hết vạch giáp / hết lượt: SPLIT!, 2 người văng ra lại đá bình thường.
   * GIỮ KHUNG LÚC CAST (user 2026-10-24: chỉ trong lúc cast): hắn chớp về trước khung thành nhà rồi hợp thể ở đó; trong warn giây đó cú sút sắp vào khung họ
   * (trong guardT giây) thì hắn chớp chắn đường bóng (BLOCKED!), bóng chạm vạch khung họ cũng dội ra (Ball -> MatchMods.sealed). Hợp thể xong: khung mở lại.
   * M.leo = { phase: warn | run | aim | dash, t, p, hp, base, mates [{ p, x0, y0, id }], id (prop 'legend'), aim (prop 'lateaim'), d (hướng lao), hits } */
  K.leo = {
    create(g, M, c) { M.next = c.first; M.leo = null; M.lastHit = {}; },
    kickoff(g, M) { this.end(g, M, false, 0, true); },   // quiet: đội hình vừa xếp xong, trả 2 người về chỗ của họ
    active(M) { return M.leo && (M.leo.phase === 'warn' || M.leo.phase === 'run' || M.leo.phase === 'dash'); },
    // thanh máu + hào quang 1976: vẽ lại vật thể mỗi lần đổi số vạch (khách online thấy qua lệnh hiệu ứng)
    aura(g, M, c, len) {
      const L = M.leo;
      if (L.id) g.effects.propOff(L.id, 0);
      L.id = newId(g);
      g.effects.prop(L.id, 'legend', L.p.x, L.p.y, L.p.id, L.hp, len, c.color);
    },
    // chớp (dịch chuyển tức thời) King Leo tới (x, y): tàn ảnh ở chỗ cũ, tia chớp nối 2 chỗ (prop 'zapline'), tia lửa điện ở chỗ mới
    zap(g, p, x, y) {
      const E = g.effects, f = g.field;
      E.afterimage(p, 0.3);
      const x0 = p.x, y0 = p.y;
      p.x = U.clamp(x, f.x + p.radius, f.x + f.w - p.radius); p.y = U.clamp(y, f.y + p.radius, f.y + f.h - p.radius);
      p.vx = p.vy = p.kbx = p.kby = 0;
      E.prop(newId(g), 'zapline', x0, y0, p.x, p.y, 0.3, '#fff6a0');
      E.burst(p.x, p.y - 12, 8, '#fff6a0', 14, 120, 0.35);
      E.burst(p.x, p.y - 12, 8, '#7fe7ff', 8, 90, 0.3);
      g.sfx('ult', 'mod.bolt');
    },
    // trước khung thành nhà của đội chủ luật (cách vạch khung d px), cao độ y
    home(g, M, d, y) { const G = g.ownGoal(M.team), f = g.field; return { x: G.x + Math.sign(f.cx - G.x) * d, y: y ?? f.cy }; },
    start(g, M, c) {
      const p = captain(g);
      if (!p || p.state !== 'normal' || !grounded(p)) { M.next = 0.5; return; }
      // chớp về khung nhà rồi mới hợp thể ở đó (đang cầm bóng thì nhả ra)
      if (p.hasBall) g.looseBall(p, U.rand(-1, 1), U.rand(-1, 1));
      const h = this.home(g, M, c.homeD);
      this.zap(g, p, h.x, h.y);
      M.leo = { phase: 'warn', t: 0, p, hp: c.hp, base: Object.assign({}, p.stats), mates: [], guard: 0 };
      p.stats = Object.assign({}, p.stats, { power: p.stats.power * c.power });
      this.aura(g, M, c, c.warn + c.time + c.aim + c.dash + 0.5);
      const E = g.effects;
      // đồng đội bị hút vào người hắn trong warn giây (vệt vàng nối tới King Leo)
      for (const q of g.teams[M.team].players) {
        if (q === p) continue;
        if (q.hasBall) g.looseBall(q, U.rand(-1, 1), U.rand(-1, 1));
        const m = { p: q, x0: q.x, y0: q.y, id: newId(g) };
        M.leo.mates.push(m);
        E.prop(m.id, 'fusetrail', q.x, q.y, q.id, p.id, c.warn + 0.1, c.color);
      }
      E.pop(p.x, p.y - 36, '1976!', 'move', c.color);
      E.tint('#a0784a', c.warn, 0.25);
      E.burst(p.x, p.y - 10, 8, c.color, 16, 110, 0.6);
      g.sfx('ult', 'mod.reel');
      M.barkT = 0;
      bark(g, 'mod', p);
    },
    // hết lượt biến hình: trả cỡ người + chỉ số, xoá vật thể. stun > 0: hắn ngã choáng (phim cháy)
    end(g, M, broke, stun = 0, quiet = false) {
      const L = M.leo;
      if (!L) return;
      M.leo = null;
      M.next = U.rand(M.cfg.every[0], M.cfg.every[1]);
      const p = L.p, E = g.effects;
      p.stats = L.base;
      p.sizeTarget = 1; p.sizeT = 0;
      if (L.id) E.propOff(L.id, 0.2);
      if (L.aim) E.propOff(L.aim, 0.05);
      this.split(g, M, L, quiet);
      if (!broke) return;
      E.pop(p.x, p.y - 36, 'FILM BURN!', 'huge', '#ff9a3d');
      E.burst(p.x, p.y - 12, 10, '#ff9a3d', 24, 160, 0.7);
      E.burst(p.x, p.y - 12, 10, '#f3ead7', 14, 120, 0.5);
      E.flash(0.4);
      E.shake(5, 0.3);
      g.hitStop(0.1);
      g.sfx('ult', 'mod.burn');
      g.later(0.02, () => { if (g.state === 'play' && p.state !== 'stun') { p.hitImmune = 0; p.hit({ stun, kbx: 0, kby: 0, type: 'hard', quiet: true }); } });
      M.barkT = 0;
      bark(g, 'conceded', p);
    },
    // FUSION!: 2 đồng đội nhập vào người hắn — rời sân (không đá, không bị đánh, không nhặt bóng), ẩn sprite
    absorb(g, M, c) {
      const L = M.leo, p = L.p, E = g.effects;
      for (const m of L.mates) {
        E.propOff(m.id, 0.05);
        m.id = newId(g);
        E.prop(m.id, 'fused', p.x, p.y, m.p.id, 0, 99999, c.color);
      }
      this.hold(M);
      E.pop(p.x, p.y - 40, 'FUSION!', 'huge', c.color);
      E.burst(p.x, p.y - 14, 10, c.color, 24, 150, 0.7);
      E.wave(p.x, p.y, 30, c.color, 0.4, 3);
      E.flash(0.45);
      E.shake(5, 0.3);
      g.hitStop(0.08);
      g.sfx('ult', 'mod.fuse');
    },
    // giữ 2 người đã nhập ở trong King Leo (bay cao airZ: không va chạm, không nhặt bóng, luật trận bỏ qua)
    hold(M) {
      const p = M.leo.p;
      for (const { p: q } of M.leo.mates) {
        q.x = p.x; q.y = p.y; q.vx = q.vy = q.kbx = q.kby = 0;
        q.state = 'meteor'; q.stateT = 99; q.airZ = 300; q.airVz = 0;
      }
    },
    // SPLIT!: 2 người văng ra khỏi King Leo (quiet: giao bóng lại — chỉ trả trạng thái, đội hình đã xếp)
    split(g, M, L, quiet) {
      if (!L.mates.length) return;
      const p = L.p, E = g.effects, f = g.field;
      L.mates.forEach((m, i) => {
        const q = m.p;
        E.propOff(m.id, 0.05);
        q.airZ = 0; q.airVz = 0; q.vx = q.vy = 0;
        q.state = 'normal'; q.stateT = 0;
        if (quiet) return;
        const a = (i ? 1 : -1) * Math.PI / 2 + U.rand(-0.4, 0.4) + (p.y > f.cy ? -0.3 : 0.3) * (i ? -1 : 1);
        q.x = U.clamp(p.x + Math.cos(a) * 10, f.x + q.radius, f.x + f.w - q.radius);
        q.y = U.clamp(p.y + Math.sin(a) * 10, f.y + q.radius, f.y + f.h - q.radius);
        q.state = 'stun'; q.stateT = M.cfg.splitStun; q.hitImmune = M.cfg.splitStun + 0.3;
        q.kbx = Math.cos(a) * M.cfg.splitKnock; q.kby = Math.sin(a) * M.cfg.splitKnock;
        q.airZ = 0.5; q.airVz = 160;
      });
      L.mates = [];
      if (quiet) return;
      E.pop(p.x, p.y - 52, 'SPLIT!', 'heavy', '#f3ead7');
      E.burst(p.x, p.y - 12, 10, '#f3ead7', 16, 140, 0.5);
    },
    // giữ khung: bóng lỏng đang lao vào khung nhà, tới vạch trong guardT giây và lọt miệng khung -> King Leo chớp về đứng chắn trên đường bóng, bóng dội ngược
    guard(g, M, c, dt) {
      const L = M.leo, p = L.p, b = g.ball, f = g.field, G = g.ownGoal(M.team), dir = Math.sign(G.x - f.cx);
      if ((L.guard -= dt) > 0 || b.owner || p.state === 'stun' || b.vx * dir < 60) return;
      const t = (G.x - b.x) / b.vx;
      if (!(t > 0 && t < c.guardT)) return;
      const yAt = b.y + b.vy * t;
      if (Math.abs(yAt - f.cy) > f.goalWidth / 2 + 8 || b.z > f.goalHeight + 6) return;
      L.guard = 0.4;
      const bx = G.x - dir * c.blockD;
      this.zap(g, p, Math.abs(b.x - G.x) < c.blockD + 6 ? b.x - dir * 6 : bx, yAt);
      p.facing = dir > 0 ? Math.PI : 0;
      this.block(g, M, b, dir);
    },
    // bóng bị King Leo / lớp khoá khung chặn lại: dội ngược ra sân
    block(g, M, b, dir) {
      const E = g.effects;
      b.vx = -dir * Math.max(140, Math.abs(b.vx) * 0.5); b.vy = U.rand(-1, 1) * 120; b.vz = Math.max(b.vz, 60);
      b.lastKickTeam = M.team;
      E.pop(b.x, b.y - b.z - 16, 'BLOCKED!', 'heavy', '#fff6a0');
      E.shake(3, 0.15);
      g.hitStop(0.05);
      g.sfx('block');
    },
    // Player.hit: đòn trúng King Leo đang có giáp -> trừ 1 vạch thay vì choáng
    armor(g, M, c, victim, opts) {
      const L = M.leo;
      if (!this.active(M) || victim !== L.p) return false;
      const src = opts.source, E = g.effects;
      if (!src || src.team === M.team) return true;
      if (g.time - (M.lastHit[src.id] ?? -99) < c.hitGap || L.phase === 'dash') { E.burst(victim.x, victim.y - 10, 4, c.color, 6, 60, 0.3); return true; }
      M.lastHit[src.id] = g.time;
      L.hp--;
      victim.flash = 0.12;
      victim.kbx += (opts.kbx || 0) * 0.25; victim.kby += (opts.kby || 0) * 0.25;
      E.pop(victim.x, victim.y - 36, L.hp > 0 ? 'CRACK!' : 'BREAK!', 'heavy', '#f3ead7');
      E.burst(victim.x, victim.y - 12, 8, '#f3ead7', 12, 120, 0.4);
      E.shake(3, 0.15);
      g.hitStop(0.06);
      g.sfx('ult', 'mod.crack');
      if (L.hp <= 0) { this.end(g, M, true, c.breakStun); return true; }
      this.aura(g, M, c, c.time - (L.phase === 'run' ? L.t : 0) + c.aim + c.dash + 0.5);
      return true;
    },
    // AI của King Leo lúc biến hình: đi lấy bóng, cầm bóng thì solo thẳng về khung bạn, tới tầm thì sút (true = đã điều khiển)
    aiMove(g, M, c, p) {
      const L = M.leo;
      if (!L || p !== L.p) return false;
      const it = p.intent;
      if (L.phase !== 'run' || p.state !== 'normal') { it.mx = it.my = 0; it.sprint = false; return true; }
      const b = g.ball, goal = g.attackGoal(p.team);
      let tx, ty;
      if (p.hasBall) {
        tx = goal.x; ty = goal.y + U.clamp(p.y - goal.y, -30, 30) * 0.5;
        if (Math.abs(goal.x - p.x) < c.shootRange && !p.charging) { Act().shoot(g, p, 1, U.rand(-0.7, 0.7)); return true; }
      } else { const o = b.owner || b; tx = o.x; ty = o.y; }
      const d = U.norm(tx - p.x, ty - p.y + 0.01);
      it.mx = d.x; it.my = d.y; it.sprint = true;
      return true;
    },
    update(g, M, c, dt) {
      const L = M.leo, E = g.effects, f = g.field;
      if (!L) { if ((M.next -= dt * (behind(g) ? c.trailing : 1)) <= 0) this.start(g, M, c); return; }
      const p = L.p;
      L.t += dt;
      if (L.phase !== 'aim' || p.state !== 'stun') { p.sizeTarget = Math.max(p.sizeTarget, c.scale); p.sizeT = Math.max(p.sizeT, 0.2); }
      if (L.phase === 'warn') this.guard(g, M, c, dt);
      if (L.phase === 'warn') {
        p.vx = p.vy = 0;
        if (Math.random() < dt * 20) E.burst(p.x + U.rand(-10, 10), p.y - U.rand(0, 30), 2, c.color, 2, 40, 0.4);
        // 2 đồng đội bị hút về phía hắn (nhanh dần), nảy nhẹ lên khỏi mặt đất
        const e = Math.min(1, L.t / c.warn) ** 2;
        for (const m of L.mates) {
          const q = m.p;
          q.x = m.x0 + (p.x - m.x0) * e; q.y = m.y0 + (p.y - m.y0) * e;
          q.vx = q.vy = q.kbx = q.kby = 0;
          q.state = 'recover'; q.stateT = 0.2; q.hitImmune = 0.2;
          q.airZ = Math.max(0.5, Math.sin(Math.PI * e) * 18); q.airVz = 0;
        }
        if (L.t >= c.warn) { L.phase = 'run'; L.t = 0; this.absorb(g, M, c); }
        return;
      }
      this.hold(M);
      if (L.phase === 'run') {
        // hợp thể: chạy như TIA CHỚP (user 2026-10-24): nhanh x fuseSpeed, để lại tàn ảnh + tia điện, điện rẹt rẹt
        const fused = L.mates.length > 0;
        keepSpeed(p, fused ? c.fuseSpeed : c.speed);
        if (fused && Math.hypot(p.vx, p.vy) > 60) {
          if ((L.trail = (L.trail || 0) - dt) <= 0) { L.trail = 0.05; E.afterimage(p, 0.22); }
          if (Math.random() < dt * 14) E.burst(p.x + U.rand(-8, 8), p.y - U.rand(4, 26), 4, Math.random() < 0.5 ? '#fff6a0' : '#7fe7ff', 3, 90, 0.25);
          if ((L.zap = (L.zap || 0) - dt) <= 0) { L.zap = 0.45; g.sfx('ult', 'mod.bolt'); }
        }
        // húc bật người bên bạn đứng chắn đường (người đang ra đòn / lướt thì không: để còn đánh được hắn)
        for (const o of victims(g)) {
          if (!grounded(o) || o.state !== 'normal' || o.hitImmune > 0) continue;
          if (Math.hypot(o.x - p.x, o.y - p.y) > p.radius * (p.sizeMul || 1) + o.radius) continue;
          if (Act().dodged(g, o)) continue;
          const n = U.norm(o.x - p.x || 0.1, o.y - p.y);
          if (o.hit({ stun: c.bump, kbx: n.x * c.knock, kby: n.y * c.knock, type: 'hard', source: p })) {
            M.hits++;
            E.pop(o.x, o.y - 30, 'OUT OF MY WAY!', 'light', c.color);
          }
        }
        if (L.t < c.time) return;
        // hết giờ: chuẩn bị cú vào bóng muộn
        if (p.hasBall) g.looseBall(p, Math.cos(p.facing), Math.sin(p.facing));
        const vs = victims(g).filter(grounded);
        if (!vs.length) { this.end(g, M, false); return; }
        L.tgt = vs.reduce((a, o) => (Math.hypot(o.x - p.x, o.y - p.y) < Math.hypot(a.x - p.x, a.y - p.y) ? o : a));
        L.phase = 'aim'; L.t = 0;
        L.aim = newId(g);
        E.prop(L.aim, 'lateaim', p.x, p.y, L.tgt.id, c.dashSpeed * c.dash, c.aim + 0.05, '#ff3d5a');
        E.pop(p.x, p.y - 36, 'LATE TACKLE!', 'info', '#ff3d5a');
        g.sfx('ult', 'mod.windup');
        return;
      }
      if (L.phase === 'aim') {
        // lúc ngắm hết giáp: bị đánh choáng là huỷ cú lao
        if (p.state === 'stun') { E.pop(p.x, p.y - 36, 'DENIED!', 'good', '#3ff6ff'); this.end(g, M, false); return; }
        p.vx = p.vy = 0; p.intent.mx = p.intent.my = 0;
        const q = L.tgt;
        p.facing = Math.atan2(q.y - p.y, q.x - p.x);
        if (L.t < c.aim) return;
        L.d = U.norm(q.x - p.x || 0.1, q.y - p.y);
        L.phase = 'dash'; L.t = 0; L.hits = new Set();
        E.propOff(L.aim, 0.05); L.aim = 0;
        g.sfx('ult', 'mod.late');
        return;
      }
      // dash: lao bằng gầm giày theo hướng đã khoá
      const np = { x: U.clamp(p.x + L.d.x * c.dashSpeed * dt, f.x + p.radius, f.x + f.w - p.radius), y: U.clamp(p.y + L.d.y * c.dashSpeed * dt, f.y + p.radius, f.y + f.h - p.radius) };
      p.x = np.x; p.y = np.y; p.vx = p.vy = 0;
      if (Math.random() < dt * 30) { E.burst(p.x, p.y, 0, '#c9b48a', 3, 50, 0.4); E.afterimage(p, 0.2); }
      for (const o of victims(g)) {
        if (L.hits.has(o.id) || !grounded(o) || Math.hypot(o.x - p.x, o.y - p.y) > c.tackleR + o.radius) continue;
        L.hits.add(o.id);
        if (Act().dodged(g, o)) continue;
        o.hitImmune = 0;
        if (o.hit({ stun: c.tackleStun, kbx: L.d.x * c.tackleKnock, kby: L.d.y * c.tackleKnock, type: 'hard', source: p })) {
          M.hits++;
          E.pop(o.x, o.y - 30, 'LATE!', 'heavy', '#ff3d5a');
          E.pop(f.cx, f.y + 14, 'NO WHISTLE?!', 'info', '#f3ead7');
          E.shake(4, 0.25);
          g.hitStop(0.08);
        }
      }
      this.hold(M);
      if (L.t >= c.dash) this.end(g, M, false);
    },
  };

  /* ================= ĐỘI ELITE GOAT PATH (config/elites.config.js, docs/RUN_DESIGN.md mục "Đội Elite") ================= */
  // AI bên bạn (đồng đội AI) — người chơi tự điều khiển thì không đụng
  const aiVictim = (g, o) => !(o.isControlled && g.isHuman(o.team));

  /* Rope Skippers — DOUBLE DUTCH (user 2026-10-27: dây bao cả sân, quay như nhảy dây thật, 2 vòng): 1 sợi dây khổng lồ căng ngang hết bề dài sân,
   * 2 cô bé đứng 2 mép trái / phải (ngang giữa sân) quay dây. count nhịp đếm (3-2-1, dây nằm chờ ở mép xuất phát), rồi quay turns vòng, mỗi vòng
   * turn giây: phần ground đầu vòng dây quét sát đất từ mép xuất phát sang mép kia, phần còn lại dây vung lên cao vòng qua đầu về mép xuất phát.
   * Dây cong hình cánh cung (2 đầu ở tay 2 cô bé). Dây quét qua chỗ ai đội bạn đứng mà người đó không lướt = vấp ngã.
   * Rope Skippers tự bật nhảy qua dây, đồng đội AI tự lướt với xác suất aiJump.
   * Prop 'rope' (dây + 2 cô bé): x = mép xuất phát (1 = trên, -1 = dưới), a = turn, b = turns — vị trí dây tính theo tuổi vật thể (ropeY / ropeAt) */
  K.jumprope = {
    create(g, M, c) { M.next = c.first; M.rope = null; },
    kickoff(g, M) { M.rope = null; },
    clock(g, M, c, dt) { if (M.rope) M.rope.t += dt; },
    // giữa dây lúc el giây (tính từ lúc dựng prop) · dùng chung với hình (ModDraw):
    // { y = chỗ dây chiếu xuống sân, z = độ cao, k = vòng (-1 đang đếm), ground = đang quét sát đất, dir = hướng quét (1 xuống), fr = pha vòng, done }
    ropeY(g, c, side, turn, turns, el) {
      const f = g.field, top = f.y - 4, bot = f.y + f.h + 4, pre = c.count * c.countBeat, y0 = side > 0 ? top : bot, y1 = side > 0 ? bot : top;
      if (el < pre) return { y: y0, z: 0, k: -1, ground: false, dir: side, fr: 0, done: false };
      const k = Math.min(turns - 1, Math.floor((el - pre) / turn)), fr = Math.min(1, (el - pre - k * turn) / turn), done = el >= pre + turns * turn;
      if (fr < c.ground) return { y: y0 + (y1 - y0) * (fr / c.ground), z: 0, k, ground: true, dir: side, fr, done };
      const u = (fr - c.ground) / (1 - c.ground);
      return { y: y1 + (y0 - y1) * u, z: Math.sin(Math.PI * u) * c.lift, k, ground: false, dir: side, fr, done };
    },
    // dây tại cột x: 2 đầu ở tay 2 cô bé (giữa sân, cao c.hand), giữa dây theo ropeY -> { y chiếu xuống sân, z độ cao }
    ropeAt(g, c, R, x) {
      const f = g.field, xL = f.x - 10, xR = f.x + f.w + 10, s = U.clamp((x - xL) / (xR - xL), 0, 1), e = 1 - Math.pow(Math.abs(2 * s - 1), 4);
      return { y: f.cy + (R.y - f.cy) * e, z: c.hand * (1 - e) + R.z * e };
    },
    start(g, M, c) {
      const turn = behind(g) ? c.turnTrailing : c.turn, side = Math.random() < 0.5 ? 1 : -1;
      M.rope = { side, t: -c.count * c.countBeat, turn, ci: 0, ai: {}, hop: {}, prev: null };   // t < 0: đang đếm nhịp · prev: dây bước trước
      g.effects.prop(newId(g), 'rope', side, 0, turn, c.turns, c.count * c.countBeat + c.turns * turn + 0.5, c.color);
      bark(g, 'mod');
    },
    update(g, M, c, dt) {
      if (!M.rope) { if (every(g, M, c, dt)) this.start(g, M, c); return; }
      const R = M.rope, E = g.effects, f = g.field;
      while (R.ci < c.count && R.t >= -(c.count - R.ci) * c.countBeat) {   // đếm nhịp: 3, 2, 1
        E.pop(f.cx, R.side > 0 ? f.y + 10 : f.y + f.h - 10, String(c.count - R.ci), 'info', c.color);
        g.sfx('ult', 'mod.tick');
        R.ci++;
      }
      const at = this.ropeY(g, c, R.side, R.turn, c.turns, R.t + c.count * c.countBeat);
      if (at.done) { M.rope = null; return; }
      if (!at.ground) { R.prev = null; return; }
      if (R.k !== at.k) { R.k = at.k; g.sfx('ult', 'mod.slap'); }
      const spd = (f.h + 8) / (R.turn * c.ground);
      // dây sắp tới chỗ q trong s giây (dây quét sát đất ở cột của q)
      const ahead = (q, s) => { const d = (q.y - this.ropeAt(g, c, at, q.x).y) * at.dir; return d > 0 && d < spd * s; };
      for (const p of g.players) {
        if (!grounded(p) || p.state === 'stun') continue;
        const key = p.id + ':' + at.k;
        if (p.team === M.team) {   // Rope Skippers: nhảy qua dây (diễn), mỗi vòng 1 lần
          if (!R.hop[key] && ahead(p, 0.1)) { R.hop[key] = 1; p.airVz = c.hop; p.airZ = Math.max(p.airZ, 0.5); }
        } else if (aiVictim(g, p) && !(key in R.ai) && ahead(p, 0.12)) {
          R.ai[key] = Math.random() < c.aiJump;
          if (R.ai[key]) Act().skill(g, p, Math.cos(p.facing), Math.sin(p.facing));
        }
      }
      // dây quét qua: ai đội bạn có y nằm giữa chỗ dây bước trước và bước này (ở cột của họ, đoạn dây còn sát đất)
      if (R.prev) {
        for (const o of victims(g)) {
          if (!grounded(o) || o.state === 'stun') continue;
          const a = this.ropeAt(g, c, R.prev, o.x), b = this.ropeAt(g, c, at, o.x);
          if (b.z > 6 || o.y < Math.min(a.y, b.y) - 3 || o.y > Math.max(a.y, b.y) + 3) continue;
          if (Act().dodged(g, o)) continue;
          if (Stat().slip(g.cores, o, c.stun, null, c.slide, { x: 0, y: at.dir }, 'mod.trip')) { M.hits++; bark(g, 'mod'); }
        }
        if (Math.random() < dt * 30) { const x = f.x + Math.random() * f.w; E.burst(x, this.ropeAt(g, c, at, x).y, 1, '#e8d8c0', 2, 40, 0.3); }
      }
      R.prev = { y: at.y, z: at.z };
    },
  };

  /* Wash Day Aunties — WASH DAY: 1 bà đứng ngoài mép trên (ngang bóng) cầm vòi nước. Báo trước warn giây (vạch hình quạt tia nước sẽ quét),
   * rồi tia nước quét từ góc a0 tới a1 trong sweep giây: trúng = bị đẩy văng theo tia + rơi bóng (lướt né được), bóng lỏng bị đẩy trôi.
   * Tia quét tới đâu, vũng nước loang ra tới đó, rải khắp hình quạt nhưng chừa lối đi (user 2026-10-27): chạy nhanh qua vũng = trơn té (đi chậm thì không sao).
   * Prop 'hose' (x, y = vòi; a, b = góc đầu / cuối; tia vẽ theo tuổi vật thể + warn / sweep trong config) · 'washpuddle' (vũng) */
  K.hose = {
    create(g, M, c) { M.next = c.first; M.jet = null; M.puddles = []; },
    kickoff(g, M) { M.jet = null; M.puddles = []; },
    clock(g, M, c, dt) { if (M.jet) M.jet.t += dt; },
    // góc tia nước lúc t giây (tính từ lúc bắt đầu phun)
    angle(J, c) { return J.a0 + (J.a1 - J.a0) * U.clamp(J.t / c.sweep, 0, 1); },
    start(g, M, c) {
      // bà luôn đứng ở mép trên (mép dưới bị thanh HUD che), tia dài đủ tới gần mép dưới
      const f = g.field, b = g.ball;
      const x = U.clamp(b.x + U.rand(-40, 40), f.x + 40, f.x + f.w - 40), y = f.y - 6;
      const aim = Math.atan2(b.y - y, b.x - x), half = (c.arc * Math.PI) / 360, s = Math.random() < 0.5 ? 1 : -1;
      M.jet = { x, y, a0: aim - half * s, a1: aim + half * s, t: -c.warn, hit: {}, wet: this.blobs(g, c, x, y, aim, half) };
      g.effects.prop(newId(g), 'hose', x, y, M.jet.a0, M.jet.a1, c.warn + c.sweep + 0.25, c.color);
      g.sfx('ult', 'mod.squeak');
      bark(g, 'mod');
    },
    // vũng nước rải khắp hình quạt: từng vòng cách vòi puddleGap px, mỗi vòng rải đều theo cung (lệch ngẫu nhiên chút), giữ ngẫu nhiên puddleKeep
    // phần (chừa lối đi qua, user 2026-10-27), bỏ chỗ ngoài sân.
    // ang = góc của vũng -> vũng hiện ra lúc tia quét qua góc đó
    blobs(g, c, x, y, aim, half) {
      const f = g.field, out = [];
      for (let d = c.puddleFrom; d <= c.range; d += c.puddleGap) {
        const n = Math.max(1, Math.round((2 * half * d) / c.puddleGap));
        for (let i = 0; i < n; i++) {
          const ang = aim - half + (2 * half * (i + 0.5)) / n + U.rand(-0.04, 0.04), r = d + U.rand(-6, 6);
          const px = x + Math.cos(ang) * r, py = y + Math.sin(ang) * r;
          if (px < f.x + 10 || px > f.x + f.w - 10 || py < f.y + 8 || py > f.y + f.h - 8 || Math.random() > c.puddleKeep) continue;
          out.push({ x: px, y: py, ang });
        }
      }
      return out;
    },
    update(g, M, c, dt) {
      const E = g.effects, f = g.field, b = g.ball;
      if (!M.jet && every(g, M, c, dt)) this.start(g, M, c);
      const J = M.jet;
      if (J && J.t >= 0) {
        if (!J.on) { J.on = true; g.sfx('ult', 'mod.hose'); }
        const a = this.angle(J, c), dx = Math.cos(a), dy = Math.sin(a);
        // khoảng cách điểm (x, y) tới tia: along = dọc tia từ vòi, perp = lệch ngang
        const onJet = (x, y, r) => { const px = x - J.x, py = y - J.y, along = px * dx + py * dy; return along > 0 && along < c.range && Math.abs(px * dy - py * dx) < c.width + r; };
        for (const o of victims(g)) {
          if (J.hit[o.id] || !grounded(o) || o.state === 'stun' || !onJet(o.x, o.y, o.radius)) continue;
          J.hit[o.id] = 1;
          if (Act().dodged(g, o)) continue;
          if (o.hit({ stun: c.stun, kbx: dx * c.push, kby: dy * c.push, type: 'hard', quiet: true })) {
            M.hits++;
            E.pop(o.x, o.y - 30, 'SPLASH!', 'heavy', c.color);
            E.burst(o.x, o.y - 8, 6, c.color, 14, 90, 0.5);
            g.sfx('ult', 'mod.douse');
            bark(g, 'mod');
          }
        }
        if (!b.owner && b.z < 12 && onJet(b.x, b.y, 4)) { b.vx += dx * c.ballPush * dt; b.vy += dy * c.ballPush * dt; }
        // tia quét qua góc nào thì vũng ở góc đó loang ra
        for (const W of J.wet.slice()) {
          if ((W.ang - J.a0) * (J.a1 - J.a0) > (a - J.a0) * (J.a1 - J.a0)) continue;
          J.wet.splice(J.wet.indexOf(W), 1);
          const P = { x: W.x, y: W.y, t: c.puddleLife + U.rand(-1, 1), id: newId(g) };
          M.puddles.push(P);
          E.prop(P.id, 'washpuddle', P.x, P.y, c.puddleR * U.rand(0.8, 1.2), U.rand(0, 6), P.t, c.color);
        }
        if (J.t >= c.sweep + 0.25) M.jet = null;
      }
      for (const P of M.puddles.slice()) {
        if ((P.t -= dt) <= 0) { M.puddles.splice(M.puddles.indexOf(P), 1); continue; }
        for (const o of victims(g)) {
          if (!grounded(o) || o.state !== 'normal' || Math.hypot(o.vx, o.vy) < c.slipSpeed) continue;
          if (Math.hypot(o.x - P.x, (o.y - P.y) * 1.6) > c.puddleR + o.radius * 0.5) continue;
          if (Stat().slip(g.cores, o, c.slipStun, null, c.slide, null, 'mod.flop')) {
            M.hits++;
            E.propOff(P.id, 0.2);
            M.puddles.splice(M.puddles.indexOf(P), 1);
            bark(g, 'mod');
          }
          break;
        }
      }
    },
  };

  /* Neon Arcade — NEON ARROWS: lưới ô mũi tên neon giữa 2 vòng cấm (cả trận). Đội bạn đứng trong ô bị đẩy theo mũi tên, bóng lỏng trôi theo;
   * Neon Arcade chạy xuôi mũi tên thì nhanh hơn. Mỗi every giây: nhấp nháy warn giây (thấy hướng mới) rồi cả bảng đổi hướng.
   * Họ bị dẫn: phần lớn mũi tên chỉ về khung thành đội bạn. Prop 'neontile' (x, y = tâm ô, a = hướng 0..3 (x π/2), b = hướng sắp đổi / -1) */
  K.neon = {
    create(g, M, c) { M.next = c.first; M.tiles = []; M.flip = null; },
    kickoff(g, M, c) {
      const f = g.field, x0 = f.x + f.boxDepth + 10, w = f.w - 2 * (f.boxDepth + 10), y0 = f.y + 14, h = f.h - 28;
      M.flip = null;
      M.tiles = [];
      for (let r = 0; r < c.rows; r++) for (let q = 0; q < c.cols; q++) {
        const T = { x: x0 + (q + 0.5) * w / c.cols, y: y0 + (r + 0.5) * h / c.rows, d: 0, col: c.colors[(r * c.cols + q) % c.colors.length], id: 0 };
        T.d = this.pick(g, M, c, -1);
        M.tiles.push(T);
        this.show(g, T, -1, 9999);
      }
    },
    // hướng mới (khác hướng cũ): bị dẫn thì phần lớn chỉ về khung thành đội bạn
    pick(g, M, c, old) {
      const toYou = g.ownGoal(1 - M.team).x > g.field.cx ? 0 : 2;
      if (behind(g) && old !== toYou && Math.random() < c.toYou) return toYou;
      const opts = [0, 1, 2, 3].filter((d) => d !== old);
      return opts[Math.floor(Math.random() * opts.length)];
    },
    show(g, T, nd, life) {
      if (T.id) g.effects.propOff(T.id, 0.01);
      T.id = newId(g);
      g.effects.prop(T.id, 'neontile', T.x, T.y, T.d, nd, life, T.col);
    },
    clock(g, M, c, dt) { if (M.flip) M.flip.t -= dt; },
    update(g, M, c, dt) {
      const b = g.ball, E = g.effects;
      if (!M.flip && every(g, M, c, dt)) {
        M.flip = { t: c.warn, nd: M.tiles.map((T) => this.pick(g, M, c, T.d)) };
        M.tiles.forEach((T, i) => this.show(g, T, M.flip.nd[i], c.warn + 0.05));
        g.sfx('ult', 'mod.neonwarn');
        bark(g, 'mod');
      }
      if (M.flip && M.flip.t <= 0) {
        M.tiles.forEach((T, i) => { T.d = M.flip.nd[i]; this.show(g, T, -1, 9999); });
        M.flip = null;
        E.pop(g.field.cx, g.field.y - 6, 'SWITCH!', 'info', c.colors[0]);
        g.sfx('ult', 'mod.neon');
      }
      for (const T of M.tiles) {
        const dx = Math.cos(T.d * Math.PI / 2), dy = Math.sin(T.d * Math.PI / 2);
        const inside = (q) => Math.abs(q.x - T.x) < c.w / 2 && Math.abs(q.y - T.y) < c.h / 2;
        for (const p of g.players) {
          if (!grounded(p) || !inside(p)) continue;
          if (p.team === M.team) { if (p.vx * dx + p.vy * dy > 20) keepSpeed(p, c.boost); }
          else { p.x += dx * c.push * dt; p.y += dy * c.push * dt; }
        }
        if (!b.owner && b.z < 6 && inside(b)) { b.vx += dx * c.ballPush * dt; b.vy += dy * c.ballPush * dt; }
      }
    },
  };

  /* Domino Club — DOMINOES: hàng domino khổng lồ mọc lên theo 1 đường thẳng cắt qua gần bóng, đứng chắn người stand giây (đầu hàng sắp bị đẩy
   * nhấp nháy), rồi đổ dây chuyền: quân đổ trúng đội bạn = ngã văng + rơi bóng (lướt né được). Họ bị dẫn: 2 hàng chéo nhau.
   * Prop 'domino' (x, y = đầu hàng đổ trước, a, b = cuối hàng): từng quân vẽ theo tuổi vật thể (rise / stand / speed / gap trong config),
   * mỗi quân 1 khúc xếp chiều sâu (ModDraw.parts) */
  K.domino = {
    create(g, M, c) { M.next = c.first; M.lines = []; },
    kickoff(g, M) { M.lines = []; },
    clock(g, M, c, dt) { for (const L of M.lines) L.t += dt; },
    // vị trí quân thứ i của hàng (dùng chung với hình: ModDraw)
    pieces(o, c) {
      const len = Math.hypot(o.a - o.x, o.b - o.y), n = Math.max(4, Math.round(len / c.gap) + 1), out = [];
      for (let i = 0; i < n; i++) { const k = i / (n - 1); out.push({ x: o.x + (o.a - o.x) * k, y: o.y + (o.b - o.y) * k, s: len * k }); }
      return out;
    },
    line(g, M, c, ang, cx, cy) {
      const f = g.field, ux = Math.cos(ang), uy = Math.sin(ang), h = c.len / 2;
      const cl = (x, y) => ({ x: U.clamp(x, f.x + 14, f.x + f.w - 14), y: U.clamp(y, f.y + 12, f.y + f.h - 12) });
      let A = cl(cx - ux * h, cy - uy * h), B = cl(cx + ux * h, cy + uy * h);
      if (Math.random() < 0.5) [A, B] = [B, A];
      const o = { x: A.x, y: A.y, a: B.x, b: B.y };
      const L = { o, P: this.pieces(o, c), t: 0, k: 0, id: newId(g) };
      L.len = Math.hypot(B.x - A.x, B.y - A.y);
      L.u = { x: (B.x - A.x) / (L.len || 1), y: (B.y - A.y) / (L.len || 1) };
      M.lines.push(L);
      g.effects.prop(L.id, 'domino', A.x, A.y, B.x, B.y, c.rise + c.stand + L.len / c.speed + c.lie, c.color);
    },
    start(g, M, c) {
      const b = g.ball, p = near(g, b.x, b.y, 30, 40), ang = U.rand(0, Math.PI);
      this.line(g, M, c, ang, p.x, p.y);
      if (behind(g)) this.line(g, M, c, ang + Math.PI / 2 + U.rand(-0.3, 0.3), p.x, p.y);
      g.sfx('ult', 'mod.domino');
      bark(g, 'mod');
    },
    update(g, M, c, dt) {
      const E = g.effects;
      if (!M.lines.length && every(g, M, c, dt)) this.start(g, M, c);
      for (const L of M.lines.slice()) {
        const t0 = c.rise + c.stand;   // lúc quân đầu tiên đổ
        if (L.t >= t0 && !L.pushed) { L.pushed = true; E.pop(L.o.x, L.o.y - 26, 'PUSH!', 'info', c.color); }
        // quân còn đứng chắn người (mọi đội): đẩy ra khỏi quân
        for (let i = L.k; i < L.P.length; i++) {
          const D = L.P[i];
          for (const p of g.players) {
            if (!grounded(p)) continue;
            const dx = p.x - D.x, dy = p.y - D.y, d = Math.hypot(dx, dy), m = 6 + p.radius;
            if (d >= m || d < 0.01) continue;
            p.x = D.x + (dx / d) * m; p.y = D.y + (dy / d) * m;
          }
        }
        // đổ dây chuyền
        while (L.k < L.P.length && L.t >= t0 + L.P[L.k].s / c.speed) {
          const D = L.P[L.k++], hx = D.x + L.u.x * c.gap * 0.6, hy = D.y + L.u.y * c.gap * 0.6;
          if (L.k % 2) g.sfx('ult', 'mod.tile');
          E.burst(hx, hy, 1, '#c9b48a', 3, 40, 0.3);
          for (const o of victims(g)) {
            if (!grounded(o) || o.state === 'stun' || Math.hypot(o.x - hx, o.y - hy) > c.r + o.radius || Act().dodged(g, o)) continue;
            if (o.hit({ stun: c.stun, kbx: L.u.x * c.knock, kby: L.u.y * c.knock, type: 'hard', source: null })) {
              M.hits++;
              E.pop(o.x, o.y - 30, 'CLACK!', 'heavy', c.color);
              E.shake(3, 0.15);
              bark(g, 'mod');
            }
          }
        }
        if (L.t >= t0 + L.len / c.speed + c.lie) M.lines.splice(M.lines.indexOf(L), 1);
      }
    },
  };

  /* Tai Chi Masters — QI PALM (user 2026-10-27, thay SLOW HANDS): 1 cụ (không cầm bóng, không đứng trong vòng cấm nhà, gần bóng nhất trừ người
   * đang đuổi bóng) đứng tấn gồng charge giây: bàn tay khí khổng lồ mọc dần sau lưng, vạch đường chưởng dài len x rộng width trên sân nhắm người
   * đội bạn gần cụ nhất lúc bắt đầu (không có thì nhắm bóng; khoá hướng). Hết gồng: bàn tay lao dọc vạch trong travel giây — ai đội bạn trong vạch bị đẩy bay xa + choáng, bóng bị hất theo.
   * Lướt né được. Đang gồng: đòn nhẹ không lay được cụ (ROOTED!), đòn nặng trúng = huỷ chưởng. Họ bị dẫn: 2 cụ cùng lúc.
   * Prop 'chizone' (vạch đường chưởng dưới sân) + 'chipalm' (bàn tay khí): x, y = chỗ cụ đứng, a = hướng (rad) — vẽ theo tuổi vật thể + charge / travel / len */
  K.taichi = {
    create(g, M, c) { M.next = c.first; M.palms = []; },
    kickoff(g, M) { M.palms = []; },
    clock(g, M, c, dt) { for (const P of M.palms) P.t += dt; },
    // cụ p đang gồng
    of(M, p) { return M.palms.find((P) => P.p === p && !P.fired) || null; },
    start(g, M, c, n) {
      const b = g.ball, tp = g.teams[M.team].players;
      if (!tp.length) return;
      const dist = (q) => Math.hypot(q.x - b.x, q.y - b.y);
      const chaser = tp.reduce((a, q) => (dist(q) < dist(a) ? q : a));
      // người đứng trong vòng cấm nhà (vai thủ môn) không gồng: đứng yên giữ khung thì hỏng luôn thủ môn của họ
      const free = tp.filter((q) => q !== chaser && !q.hasBall && q.state === 'normal' && grounded(q) && !g.inKeeperZone(q) && !M.palms.some((P) => P.p === q)).sort((p, q) => dist(p) - dist(q));
      for (const p of free.slice(0, n)) {
        // nhắm người đội bạn đứng gần cụ nhất (trong tầm chưởng), không có thì nhắm bóng
        const vs = victims(g).filter((o) => grounded(o) && Math.hypot(o.x - p.x, o.y - p.y) < c.len);
        const tg = vs.length ? vs.reduce((a, o) => (Math.hypot(o.x - p.x, o.y - p.y) < Math.hypot(a.x - p.x, a.y - p.y) ? o : a)) : b;
        const ang = Math.atan2(tg.y - p.y, tg.x - p.x + 0.01), life = c.charge + c.travel + 0.6;
        const P = { p, x: p.x, y: p.y, ang, t: 0, hit: {}, ids: [newId(g), newId(g)] };
        M.palms.push(P);
        p.vx = p.vy = 0; p.facing = ang;
        g.effects.prop(P.ids[0], 'chizone', p.x, p.y, ang, 0, life, c.color);
        g.effects.prop(P.ids[1], 'chipalm', p.x, p.y, ang, 0, life, c.color);
        g.effects.pop(p.x, p.y - 36, 'HAAA...', 'info', c.color);
      }
      if (free.length) { g.sfx('ult', 'mod.stance'); bark(g, 'mod', free[0]); }
    },
    cancel(g, M, P, broken) {
      M.palms.splice(M.palms.indexOf(P), 1);
      for (const id of P.ids) g.effects.propOff(id, 0.12);
      if (!broken) return;
      g.effects.pop(P.p.x, P.p.y - 36, 'STANCE BROKEN!', 'good', '#3ff6ff');
      g.sfx('ult', 'mod.break');
    },
    // AI: cụ đang gồng đứng yên
    aiMove(g, M, c, p) {
      if (!this.of(M, p)) return false;
      p.intent.mx = p.intent.my = 0; p.intent.sprint = false;
      return true;
    },
    // Player.hit: đòn nhẹ vào cụ đang gồng = không lay được
    armor(g, M, c, victim, opts) {
      if (opts.type !== 'light' || !this.of(M, victim)) return false;
      if (!(victim.rootedT > g.time)) { victim.rootedT = g.time + 0.4; g.effects.pop(victim.x, victim.y - 36, 'ROOTED!', 'info', c.color); g.sfx('block'); }
      return true;
    },
    update(g, M, c, dt) {
      const E = g.effects, b = g.ball, n = behind(g) ? 2 : 1;
      if (M.palms.length < n && every(g, M, c, dt)) this.start(g, M, c, n - M.palms.length);
      for (const P of M.palms.slice()) {
        const p = P.p;
        if (!P.fired) {
          if (p.state === 'stun') { this.cancel(g, M, P, true); continue; }
          if (p.hasBall || !grounded(p)) { this.cancel(g, M, P, false); continue; }
          p.x = P.x; p.y = P.y; p.vx = p.vy = p.kbx = p.kby = 0; p.facing = P.ang;   // đứng tấn tại chỗ
          if (P.t < c.charge) continue;
          P.fired = true;
          E.pop(p.x, p.y - 40, 'HA!', 'huge', c.color);
          E.shake(4, 0.25);
          g.sfx('ult', 'mod.palm');
        }
        // bàn tay lao tới: quét vạch từ chỗ cụ tới đầu bàn tay
        const dx = Math.cos(P.ang), dy = Math.sin(P.ang), reach = c.len * Math.min(1, (P.t - c.charge) / c.travel);
        const inPath = (q, r) => { const rx = q.x - P.x, ry = q.y - P.y, along = rx * dx + ry * dy; return along > -6 && along < reach && Math.abs(rx * dy - ry * dx) < c.width / 2 + r; };
        for (const o of victims(g)) {
          if (P.hit[o.id] || o.state === 'meteor' || !inPath(o, o.radius)) continue;
          P.hit[o.id] = 1;
          if (Act().dodged(g, o)) continue;
          o.hitImmune = 0;
          if (o.hit({ stun: c.stun, kbx: dx * c.knock, kby: dy * c.knock, launch: c.launch, type: 'hard' })) {
            M.hits++;
            E.pop(o.x, o.y - 30, 'WHOOSH!', 'heavy', c.color);
            E.burst(o.x, o.y - 10, 8, c.color, 16, 110, 0.5);
            g.hitStop(0.06);
          }
        }
        if (!P.ball && !b.owner && b.z < 20 && inPath(b, 4)) { P.ball = true; b.vx = dx * c.ballSpeed; b.vy = dy * c.ballSpeed; }
        if (P.t >= c.charge + c.travel + 0.4) M.palms.splice(M.palms.indexOf(P), 1);
      }
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

    // Player.hit (trước khi choáng): true = đòn bị giáp chặn (boss KING LEO 1976 đang biến hình). Máy khách gương không mô phỏng
    armor(g, victim, opts) {
      const M = g.mod;
      if (!M || !M.cfg || M.mirror) return false;
      if (M.id === 'taichi') return K.taichi.armor(g, M, M.cfg, victim, opts);   // Tai Chi Masters: cụ đang gồng không lay bởi đòn nhẹ
      return M.id === 'leo' && K.leo.armor(g, M, M.cfg, victim, opts);
    },
    // Ball.collideWalls: bóng chạm vạch khung của đội defTeam — true = khung đang bị khoá (KING LEO 1976 đang cast), bóng dội ra
    sealed(g, defTeam, b) {
      const M = g.mod;
      if (!M || M.id !== 'leo' || M.mirror || !M.leo || M.leo.phase !== 'warn' || defTeam !== M.team) return false;
      if (b.lastKickTeam !== M.team) K.leo.block(g, M, b, Math.sign(g.ownGoal(M.team).x - g.field.cx));
      return true;
    },
    // CoreSystem.unstealable: boss đang có giáp thì không cướp bóng được
    armored(g, p) {
      const M = g.mod;
      return !!(M && M.id === 'leo' && K.leo.active(M) && M.leo.p === p);
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
      if (!M || M.id !== 'giants' || o.team !== M.team || !K.giants.isGiant(M, o)) return false;   // chỉ người đang khổng lồ
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
      if (o.kind === 'devil') return K.devils.at(o, el);
      if (o.kind === 'stoolthrow') { const k = Math.min(el, o.max); return { x: o.x + Math.cos(o.a) * o.b * k, y: o.y + Math.sin(o.a) * o.b * k }; }
      if (o.kind === 'spot') {   // đèn pha: đi thẳng (x, y) -> (a, b) trong seg giây rồi đứng đó (đoạn kế tiếp là prop mới)
        const c = S().mods && S().mods.searchlight, k = c ? Math.min(1, el / c.seg) : 1;
        return { x: o.x + (o.a - o.x) * k, y: o.y + (o.b - o.y) * k };
      }
      return null;
    },
    // độ đậm khi vẽ cầu thủ p (School Ghosts: ma có prop 'veil' bám người = đang tàng hình, chỉ còn bóng mờ cố định — user 2026-10-31:
    // không chớp)
    // đọc prop thay vì M.veil để máy khách online (trận gương) vẽ giống host
    alpha(g, p) {
      const M = g.mod;
      // KING LEO 1976: người đã nhập vào King Leo (prop 'fused') không có vòng chân / bóng hình
      // ĐŨA KHỔNG LỒ: người đang ngồi trong nồi mì (prop 'inpot') cũng vậy
      if (M && (M.id === 'leo' || M.id === 'chopsticks') && g.effects.V.props.some((o) => (o.kind === 'fused' || o.kind === 'inpot') && o.a === p.id && o.t > 0)) return 0;
      if (!M || M.id !== 'ghosts' || p.team !== M.team || g.humanTeam < 0 || p.team === g.humanTeam) return 1;
      if (g.state !== 'play' && g.state !== 'kickoff') return 1;
      let v = 0;
      for (const o of g.effects.V.props) {
        if (o.kind !== 'veil' || o.a !== p.id || o.t <= 0) continue;
        v = Math.min(1, (o.max - o.t) * 5) * (o.off ? o.t / o.max : 1);   // hiện dần lúc biến, rõ dần lúc lộ
        break;
      }
      return 1 - v * (1 - M.cfg.alpha);
    },
  };

  SFC.MatchMods = MatchMods;
})();
