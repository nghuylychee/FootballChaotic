/* Drills — SKILL GAME của GOAT PATH (docs/RUN_DESIGN.md, số liệu config/run.config.js -> run.drills). Chạy trên trận thật:
 * opts.drill = id bài, opts.teamSize = [bạn, đối thủ], opts.noDraft. Thay đồng hồ trận (thời gian riêng của bài), giao bóng lại luôn cho bạn.
 * Mỗi bài đếm 1 thứ (cfg.goal) vào g.drill.val, có 3 mốc cfg.tiers = [ĐỒNG, BẠC, VÀNG] (user 2026-10-26: thanh tiến độ trên HUD, ui/hud.js).
 * Hết giờ / đạt VÀNG / mất bóng (hold) -> finish: g.drill.tier = số mốc đạt (0 = hỏng), ok = tier > 0, rồi g.end().
 * LEGEND TRIAL (opts.trial = id LEGEND, config/legends.config.js): cùng bài nhưng 1 mốc duy nhất (trial.goal trong trial.time giây) —
 * đạt = qua (tier 1, chữ SIGNED!). opts.drillEase (BADGE Training Bibs): mọi mốc giảm theo phần đó (làm tròn lên, ít nhất 1).
 * Kết quả vào Run.recordDrill qua Profile.awardMatch. Bia / cổng vẽ ở render/rundraw.js (đọc g.drill).
 * Móc trong match.js: create · clock (thay tickClock) · update (cuối simulate) · goal (checkGoal) · afterGoal; player.js hit (hits).
 *   goals: bàn thắng (đối thủ chỉ trông khung: keeperOnly) · targets: bàn vào đúng bia đang trôi trên khung thành
 *   gates: dẫn bóng qua cổng sáng (lần lượt) · chain: chuỗi chuyền dài nhất (đồng đội AI trả bóng cho bạn)
 *   hits: lần hạ gục đối thủ · hold: giây giữ bóng, người đuổi vào thêm theo waves, đối thủ cướp được = hết bài
 *   combo (chỉ LEGEND TRIAL, user 2026-10-30): số lần làm được kỹ thuật LEGEND đang cho mượn (match.js gắn p.legend + p.lent). Kỹ thuật
 *     sút (power / trivela / finesse / bicycle): bàn thắng mà cú đá cuối mang ball.legTech đúng kỹ thuật · còn lại: Legends gọi combo()
 *     (bruiser / slide / engine / sweeper / rainbow) · chuyền vượt tuyến bổng: match.js gainPossession. Cách chơi theo legends.list[].trial:
 *     keepers (số đối thủ trông khung) · foeBall (đối thủ cầm bóng tấn công) · feed (đồng đội AI chuyền trả: 'ground' / 'lob').
 */
window.SFC = window.SFC || {};

(function () {
  const TIER_WORDS = [SFC.N_('FAILED'), SFC.N_('BRONZE!'), SFC.N_('SILVER!'), SFC.N_('GOLD!')];
  const TRIAL_WORDS = [SFC.N_('TRIAL FAILED'), SFC.N_('SIGNED!')];
  const top = (D) => D.cfg.tiers[D.cfg.tiers.length - 1];   // mốc cuối (VÀNG / mốc duy nhất của LEGEND TRIAL)
  const SHOT_TECH = ['power', 'trivela', 'finesse', 'bicycle'];   // kỹ thuật sút: tính khi thành bàn

  const Drills = {
    create(g) {
      const id = g.opts.drill, base = id && SFC_CONFIG.run && SFC_CONFIG.run.drills[id];
      if (!base) return null;
      const L = g.opts.trial && SFC_CONFIG.legends && SFC_CONFIG.legends.list[g.opts.trial], ease = Math.min(0.8, +g.opts.drillEase || 0);
      const LT = L ? L.trial : null;
      const cfg = Object.assign({}, base, LT ? { tiers: [LT.goal], time: LT.time, keepers: LT.keepers || 0, foeBall: !!LT.foeBall, feed: LT.feed || null } : {});
      if (ease) cfg.tiers = cfg.tiers.map((x) => Math.max(1, Math.ceil(x * (1 - ease))));
      const D = { id, cfg, trial: L ? g.opts.trial : null, time: cfg.time, val: 0, tier: 0, ok: null, heldT: 0, lossT: 0, chain: 0, ty: g.field.cy, wave: 1 };
      // trông khung: keeperOnly = mọi đối thủ · keepers = n đối thủ đầu · combo: kỹ thuật đang đếm + màu LEGEND · kick: đội giao bóng lại
      D.keepers = cfg.keeperOnly ? 99 : cfg.keepers || 0;
      D.feed = cfg.feed || (cfg.goal === 'chain' ? 'ground' : null);
      D.kick = cfg.foeBall ? 1 : 0;
      if (cfg.goal === 'combo' && L) { D.tech = L.tech; D.color = L.color; }
      // cổng sinh theo opts.drillSeed (co-op: máy xem dựng đúng chuỗi cổng của host)
      if (cfg.goal === 'gates') { D.gates = this.genGates(g, cfg.gate, g.opts.drillSeed != null ? SFC.U.seeded(g.opts.drillSeed) : Math.random); D.gi = 0; }
      // AI riêng của bài qua móc g.aiHook của AI.update (true = đã điều khiển cầu thủ này bước này)
      g.aiHook = (p, dt) => this.ai(g, D, p, dt);
      return D;
    },
    ai(g, D, p, dt) {
      const o = g.ball.owner;
      // trông khung: đối thủ chỉ đứng khung thành khi chưa cầm bóng
      if (D.keepers && p.team === 1 && g.teams[1].players.indexOf(p) < D.keepers && !(o && o.team === 1)) { SFC.AI.goalkeeper(dt, g, p); return true; }
      // PASS CHAIN / LEGEND TRIAL feed: đồng đội AI cầm bóng một nhịp rồi chuyền trả bạn (lob = tạt bổng cho BICYCLE KICK)
      if (D.feed && p.team === 0 && o === p && p !== g.controlled) {
        p.intent.mx = 0; p.intent.my = 0; p.intent.sprint = false;
        p.ai.holdT = (p.ai.holdT || 0) + dt;
        if (p.ai.holdT > 0.35) { p.ai.holdT = 0; SFC.Actions.passTo(g, p, g.controlled, D.feed); }
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
        case 'combo':
          // foeBall: bạn giữ bóng quá lâu -> đối thủ giao lại (bài là đi cướp / chặn) · còn lại: đối thủ giữ lâu -> giao lại cho bạn
          if (C.foeBall) {
            if (o && o.team === 0) { D.heldT += dt; if (D.heldT > 1.4) { D.heldT = 0; g.kickoff(1); } } else D.heldT = 0;
          } else this.regain(g, D, dt, oppHas, D.keepers ? 0.8 : 2.0);
          break;
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
      if (D.val >= top(D)) this.finish(g);
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
      else if (C.goal === 'combo' && SHOT_TECH.includes(D.tech)) {
        if (b.legTech === D.tech) this.combo(g, b.lastTouch, D.tech, b, true);
        else g.effects.pop(b.x, b.y - 24, 'NO COMBO', 'info');
      }
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
    // LEGEND TRIAL: 1 lần làm được kỹ thuật id (p = người làm, at = chỗ hiện số). goal: đếm lúc thành bàn (Drills.goal, khi
    // g.state đã là 'goal')
    combo(g, p, id, at, goal = false) {
      const D = g.drill;
      if (!D || D.cfg.goal !== 'combo' || D.ok != null || id !== D.tech || !p || p.team !== 0 || (!goal && g.state !== 'play')) return;
      D.val++;
      const q = at || p;
      g.effects.pop(q.x, q.y - 30, String(D.val), 'res', D.color);
      g.effects.ring(q.x, q.y, D.color);
      g.sfx('pick');
    },
    // ăn mừng xong: đủ VÀNG -> kết thúc, chưa -> giao bóng lại (bạn / đối thủ nếu foeBall)
    afterGoal(g) {
      const D = g.drill;
      if (D.ok != null) return g.end();
      if (D.val >= top(D)) return this.finish(g);
      g.kickoff(D.kick || 0);
    },
    // chấm mốc rồi kết thúc. giveUp: bỏ cuộc (menu tạm dừng) = hỏng
    finish(g, giveUp = false) {
      const D = g.drill;
      if (D.ok != null) return;
      D.tier = giveUp ? 0 : D.cfg.tiers.filter((x) => D.val >= x).length;
      D.ok = D.tier > 0;
      const T = SFC_CONFIG.run.tiers, L = D.trial && SFC_CONFIG.legends.list[D.trial];
      if (L) g.emit('banner', { text: TRIAL_WORDS[D.tier ? 1 : 0], sub: '', color: D.tier ? L.color : '#ff5a6e' });
      else g.emit('banner', { text: TIER_WORDS[D.tier], sub: '', color: D.tier ? T[D.tier - 1].color : '#ff5a6e' });
      g.end();
    },
    // số hiện trên HUD (hold: giây làm tròn xuống)
    shown(D) { return D.cfg.goal === 'hold' ? Math.floor(D.val) : D.val; },
    top,
  };

  SFC.Drills = Drills;
})();
