/* Drills — SKILL GAME của GOAT PATH (docs/RUN_DESIGN.md, số liệu config/run.config.js -> run.drills). Chạy trên trận thật:
 * opts.drill = id bài, opts.teamSize = [bạn, đối thủ], opts.noDraft. Thay đồng hồ trận (thời gian riêng của bài), giao bóng lại luôn cho bạn.
 * Mỗi bài đếm 1 thứ (cfg.goal) vào g.drill.val, có 3 mốc cfg.tiers = [ĐỒNG, BẠC, VÀNG] (user 2026-10-26: thanh tiến độ trên HUD, ui/hud.js).
 * Hết giờ / đạt VÀNG / mất bóng (hold) -> finish: g.drill.tier = số mốc đạt (0 = hỏng), ok = tier > 0, rồi g.end().
 * Kết quả vào Run.recordDrill qua Profile.awardMatch. Bia / cổng vẽ ở render/rundraw.js (đọc g.drill).
 * Móc trong match.js: create · clock (thay tickClock) · update (cuối simulate) · goal (checkGoal) · afterGoal; player.js hit (hits).
 *   goals: bàn thắng (đối thủ chỉ trông khung: keeperOnly) · targets: bàn vào đúng bia đang trôi trên khung thành
 *   gates: dẫn bóng qua cổng sáng (lần lượt) · chain: chuỗi chuyền dài nhất (đồng đội AI trả bóng cho bạn)
 *   hits: lần hạ gục đối thủ · hold: giây giữ bóng, người đuổi vào thêm theo waves, đối thủ cướp được = hết bài
 */
window.SFC = window.SFC || {};

(function () {
  const TIER_WORDS = [SFC.N_('FAILED'), SFC.N_('BRONZE!'), SFC.N_('SILVER!'), SFC.N_('GOLD!')];

  const Drills = {
    create(g) {
      const id = g.opts.drill, cfg = id && SFC_CONFIG.run && SFC_CONFIG.run.drills[id];
      if (!cfg) return null;
      const D = { id, cfg, time: cfg.time, val: 0, tier: 0, ok: null, heldT: 0, lossT: 0, chain: 0, ty: g.field.cy, wave: 1 };
      // cổng sinh theo opts.drillSeed (co-op: máy xem dựng đúng chuỗi cổng của host)
      if (cfg.goal === 'gates') { D.gates = this.genGates(g, cfg.gate, g.opts.drillSeed != null ? SFC.U.seeded(g.opts.drillSeed) : Math.random); D.gi = 0; }
      // AI riêng của bài qua móc g.aiHook của AI.update (true = đã điều khiển cầu thủ này bước này)
      g.aiHook = (p, dt) => this.ai(g, D, p, dt);
      return D;
    },
    ai(g, D, p, dt) {
      const o = g.ball.owner;
      // trông khung: đối thủ chỉ đứng khung thành khi chưa cầm bóng
      if (D.cfg.keeperOnly && p.team === 1 && !(o && o.team === 1)) { SFC.AI.goalkeeper(dt, g, p); return true; }
      // PASS CHAIN: đồng đội AI cầm bóng một nhịp rồi chuyền trả bạn
      if (D.cfg.goal === 'chain' && p.team === 0 && o === p && p !== g.controlled) {
        p.intent.mx = 0; p.intent.my = 0; p.intent.sprint = false;
        p.ai.holdT = (p.ai.holdT || 0) + dt;
        if (p.ai.holdT > 0.35) { p.ai.holdT = 0; SFC.Actions.passTo(g, p, g.controlled, 'ground'); }
        return true;
      }
      // HOT POTATO: người đuổi chưa tới lượt đứng chờ
      if (D.cfg.goal === 'hold' && p.team === 1 && g.teams[1].players.indexOf(p) >= D.wave) {
        p.intent.mx = 0; p.intent.my = 0; p.intent.sprint = false;
        return true;
      }
      return false;
    },
    // chuỗi cổng: bắt đầu gần giữa sân, mỗi cổng cách cổng trước ít nhất gap px, tránh 2 vòng cấm
    genGates(g, G, rng) {
      const f = g.field, out = [], mx = 90, my = 36, rand = (lo, hi) => lo + rng() * (hi - lo);
      let px = f.cx, py = f.cy;
      for (let i = 0; i < 24; i++) {
        let x = px, y = py;
        for (let t = 0; t < 40; t++) {
          x = rand(f.x + mx, f.x + f.w - mx); y = rand(f.y + my, f.y + f.h - my);
          if (Math.hypot(x - px, y - py) >= G.gap && Math.hypot(x - px, y - py) <= G.gap * 1.8) break;
        }
        out.push({ x: Math.round(x), y: Math.round(y) });
        px = x; py = y;
      }
      return out;
    },
    // thay tickClock: thời gian của bài
    clock(g, dt) {
      const D = g.drill;
      if (g.opts.mirror) return;
      g.elapsed += dt;
      if (D.ok == null && g.elapsed >= D.time) this.finish(g);
    },
    update(g, dt) {
      const D = g.drill, o = g.ball.owner, me = g.controlled, C = D.cfg;
      if (D.ok != null) return;
      const oppHas = o && o.team === 1;
      switch (C.goal) {
        case 'goals': case 'targets':
          // thủ môn cầm bóng một lúc -> giao lại cho bạn
          if (oppHas) { D.heldT += dt; if (D.heldT > 0.8) { D.heldT = 0; g.kickoff(0); } } else D.heldT = 0;
          if (C.goal === 'targets') {
            const f = g.field, half = (f.goalWidth * C.target.size) / 2, amp = f.goalWidth / 2 - half - 2;
            D.ty = f.cy + Math.sin(g.elapsed * C.target.speed * Math.PI * 2) * amp;
            D.th = half;
          }
          break;
        case 'gates': {
          const G = D.gates[D.gi];
          if (G && me && o === me && Math.hypot(me.x - G.x, me.y - G.y) <= C.gate.r) {
            D.val++; D.gi++;
            g.effects.pop(G.x, G.y - 26, String(D.val), 'res', '#6bff4f');
            g.effects.ring(G.x, G.y, '#6bff4f');
            g.sfx('pick');
          }
          this.regain(g, D, dt, oppHas, 0.8);
          break;
        }
        case 'chain': {
          const c = g.passChain[0];
          if (c > D.chain && o) g.effects.pop(o.x, o.y - 30, String(c), 'res', '#ffd23f');
          D.chain = c;
          D.val = Math.max(D.val, c);
          this.regain(g, D, dt, oppHas, 1.0);
          break;
        }
        case 'hits': this.regain(g, D, dt, oppHas, 2.5); break;
        case 'hold': {
          if (oppHas) return this.finish(g);
          if (o === me) D.val += dt;
          // người đuổi tiếp theo vào cuộc
          const W = C.waves || [];
          while (D.wave < g.teams[1].players.length && D.wave < W.length && g.elapsed >= W[D.wave]) {
            const q = g.teams[1].players[D.wave++];
            g.effects.pop(q.x, q.y - 30, '+1', 'status', '#ff5a6e');
          }
          break;
        }
      }
      if (D.val >= C.tiers[2]) this.finish(g);
    },
    // đối thủ giữ bóng quá t giây -> giao lại cho bạn (bài không tính mất bóng là hỏng)
    regain(g, D, dt, oppHas, t) {
      if (!oppHas) { D.lossT = 0; return; }
      D.lossT += dt;
      if (D.lossT > t) { D.lossT = 0; g.kickoff(0); }
    },
    goal(g, scorer) {
      const D = g.drill, C = D.cfg, b = g.ball;
      g.stateT = Math.min(g.stateT, 1.1);   // ăn mừng ngắn, bài còn chạy tiếp
      if (scorer !== 0 || D.ok != null) return;
      if (C.goal === 'goals') D.val++;
      else if (C.goal === 'targets') {
        if (Math.abs(b.y - D.ty) <= (D.th || 0) + b.r) { D.val++; g.effects.pop(b.x, b.y - 24, 'BULLSEYE!', 'good', '#6bff4f'); }
        else g.effects.pop(b.x, b.y - 24, 'MISS', 'info');
      }
    },
    // player.js hit: bạn hạ gục 1 đối thủ (STREET BRAWL)
    hit(g, victim, opts) {
      const D = g.drill;
      if (!D || D.cfg.goal !== 'hits' || D.ok != null || g.state !== 'play') return;
      const s = opts.source;
      if (!s || s.team !== 0 || victim.team !== 1) return;
      D.val++;
      g.effects.pop(victim.x, victim.y - 42, 'KO ' + D.val, 'heavy', '#ff3d5a');
    },
    // ăn mừng xong: đủ VÀNG -> kết thúc, chưa -> giao bóng lại cho bạn
    afterGoal(g) {
      const D = g.drill;
      if (D.ok != null) return g.end();
      if (D.val >= D.cfg.tiers[2]) return this.finish(g);
      g.kickoff(0);
    },
    // chấm mốc rồi kết thúc. giveUp: bỏ cuộc (menu tạm dừng) = hỏng
    finish(g, giveUp = false) {
      const D = g.drill;
      if (D.ok != null) return;
      D.tier = giveUp ? 0 : D.cfg.tiers.filter((x) => D.val >= x).length;
      D.ok = D.tier > 0;
      const T = SFC_CONFIG.run.tiers;
      g.emit('banner', { text: TIER_WORDS[D.tier], sub: '', color: D.tier ? T[D.tier - 1].color : '#ff5a6e' });
      g.end();
    },
    // số hiện trên HUD (hold: giây làm tròn xuống)
    shown(D) { return D.cfg.goal === 'hold' ? Math.floor(D.val) : D.val; },
  };

  SFC.Drills = Drills;
})();
