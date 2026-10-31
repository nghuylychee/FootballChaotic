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
 *   hits: lần hạ gục đối thủ (cả đội bạn đều tính; foeBall: đối thủ cầm bóng chuyền né, bạn cầm lâu thì bóng bật ra)
 *   hold: giây giữ bóng, người đuổi vào thêm theo waves, đối thủ cướp được = hết bài
 *   (user 2026-10-31) teamhold: giây cả đội giữ bóng (RONDO, đội nào cầm cũng giữ bóng chuyền né, không sút) · assists: bàn của đồng đội
 *     AI từ đường chuyền của bạn (g.lastPass) · coins: xu lần lượt như cổng (D.gates / D.gi), đối thủ đuổi đánh bạn · chickens: đối thủ
 *     hoá gà (CoreStat.chicken) chạy loạn, đấm trúng = bắt, gà hiện lại chỗ khác. noBall: không ai chạm được bóng
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
      // COIN RUSH: chuỗi xu dựng y như chuỗi cổng (D.gates / D.gi -> máy xem đồng bộ qua snapshot sk)
      if (cfg.goal === 'gates' || cfg.goal === 'coins') { D.gates = this.genGates(g, cfg.gate || cfg.coin, g.opts.drillSeed != null ? SFC.U.seeded(g.opts.drillSeed) : Math.random); D.gi = 0; }
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
      const C = D.cfg, me = g.controlled;
      // STREET BRAWL / GANG FIGHT (foeBall): đối thủ cầm bóng chuyền né · RONDO: đội nào cầm bóng cũng vậy (không sút)
      if (o === p && p !== me && ((C.goal === 'hits' && C.foeBall && p.team === 1) || C.goal === 'teamhold')) return this.keepAway(g, p);
      if (C.goal === 'assists' && p.team === 0 && o === p && p !== me) return this.assistRun(g, p, me);
      if (C.goal === 'coins' && p.team === 1) return this.chase(g, p, me, dt);
      // GANG FIGHT: đồng đội AI lao vào đánh người cầm bóng (không ai cầm: đối thủ gần nhất)
      if (C.goal === 'hits' && C.foeBall && p.team === 0 && p !== me && o !== p) {
        return this.chase(g, p, o && o.team === 1 ? o : this.nearest(g.teams[1].players.filter((q) => q.state !== 'stun'), p).q, dt);
      }
      if (C.goal === 'chickens' && p.team === 1) return this.flee(g, p, me, dt);
      return false;
    },
    // đi theo hướng (dx, dy) hết tốc (0 = đứng)
    steer(p, dx, dy, sprint = false) {
      const d = Math.hypot(dx, dy);
      p.intent.mx = d > 1e-3 ? dx / d : 0; p.intent.my = d > 1e-3 ? dy / d : 0;
      p.intent.sprint = !!sprint && p.stamina > 25;
    },
    // sát mép sân -> hướng kéo vào trong
    inward(g, p, m = 40) {
      const f = g.field;
      return { x: p.x < f.x + m ? 1 : p.x > f.x + f.w - m ? -1 : 0, y: p.y < f.y + m ? 1 : p.y > f.y + f.h - m ? -1 : 0 };
    },
    nearest(list, p) {
      let q = null, d = Infinity;
      for (const o of list) { const k = Math.hypot(o.x - p.x, o.y - p.y); if (k < d) { d = k; q = o; } }
      return { q, d };
    },
    // giữ bóng né đối phương; bị áp sát sau một nhịp (ngẫu nhiên mỗi lần có bóng) -> chuyền cho đồng đội thoáng nhất
    keepAway(g, p) {
      const foes = g.teams[1 - p.team].players, n = this.nearest(foes, p), A = p.ai;
      if (A.kaFor !== p.gotT) { A.kaFor = p.gotT; A.kaWait = SFC.U.rand(0.6, 1.4); }
      if (g.time - p.gotT > A.kaWait && n.d < 70) {
        let best = null, bs = -1;
        for (const m of g.teams[p.team].players) {
          if (m === p || m.state === 'stun') continue;
          const k = this.nearest(foes, m).d;
          if (k > bs) { bs = k; best = m; }
        }
        if (best) { SFC.Actions.passTo(g, p, best, 'ground'); return true; }
      }
      const away = n.q ? SFC.U.norm(p.x - n.q.x, p.y - n.q.y) : { x: 0, y: 0 }, inn = this.inward(g, p);
      this.steer(p, away.x + inn.x * 1.5, away.y + inn.y * 1.5, n.d < 60);
      return true;
    },
    // ASSIST KING: nhận đường chuyền của bạn -> lao về khung, vào tầm (hoặc ôm bóng quá lâu) thì sút · bóng tới chân kiểu khác -> trả bạn
    assistRun(g, p, me) {
      const f = g.field, gx = g.teams[0].dir > 0 ? f.x + f.w : f.x, lp = g.lastPass, held = g.time - p.gotT;
      if (lp && lp.from === me && lp.to === p) {
        if (Math.hypot(gx - p.x, f.cy - p.y) < 150 || held > 1.6) SFC.Actions.shoot(g, p, SFC.U.rand(0.55, 0.85), SFC.U.rand(-0.75, 0.75));
        else this.steer(p, gx - p.x, f.cy - p.y, true);
        return true;
      }
      this.steer(p, 0, 0);
      if (me && held > 0.4) SFC.Actions.passTo(g, p, me, 'ground');
      return true;
    },
    // đuổi theo q, tới tầm thì đấm (nhịp ngẫu nhiên, hồi chiêu đấm như thường): COIN RUSH (đối thủ đuổi bạn) · GANG FIGHT (đồng đội AI)
    chase(g, p, q, dt) {
      if (!q) { this.steer(p, 0, 0); return true; }
      const d = Math.hypot(q.x - p.x, q.y - p.y), A = p.ai;
      this.steer(p, q.x - p.x, q.y - p.y, d > 90);
      A.chT = (A.chT || 0) - dt;
      if (d < SFC_CONFIG.game.combat.light.range + p.radius * 2 && A.chT <= 0) {
        A.chT = SFC.U.rand(0.25, 0.55);
        p.facing = Math.atan2(q.y - p.y, q.x - p.x);
        SFC.Actions.lightAttack(g, p);
      }
      return true;
    },
    // CHICKEN CATCH: gà chạy lăng xăng đổi hướng liên tục, bạn tới gần thì chạy dạt ra
    flee(g, p, me, dt) {
      const A = p.ai;
      if ((A.wT = (A.wT || 0) - dt) <= 0) { A.wT = SFC.U.rand(0.35, 0.9); A.wa = Math.random() * Math.PI * 2; }
      let dx = Math.cos(A.wa), dy = Math.sin(A.wa);
      const d = me ? Math.hypot(p.x - me.x, p.y - me.y) : Infinity;
      if (d < 90) { const a = SFC.U.norm(p.x - me.x, p.y - me.y), k = (90 - d) / 30; dx += a.x * k; dy += a.y * k; }
      const inn = this.inward(g, p);
      this.steer(p, dx + inn.x * 2, dy + inn.y * 2, d < 50);
      return true;
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
      // bài không cần bóng: bóng nằm yên, không ai chạm được (giao bóng xong thả ra luôn)
      if (C.noBall) {
        if (o) g.looseBall(o, 0, 1, 0);
        for (const q of g.players) g.ball.noPickup.set(q.id, 0.2);
      }
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
        case 'hits':
          if (C.foeBall) this.popAway(g, D, dt, o);
          else this.regain(g, D, dt, oppHas, 2.5);
          break;
        case 'teamhold':
          if (o && o.team === 0) D.val += dt;
          this.regain(g, D, dt, oppHas, 4);   // đối thủ giữ quá lâu (đội bạn không đoạt lại được) -> giao lại cho bạn
          break;
        case 'assists': this.regain(g, D, dt, oppHas, 1.0); break;
        case 'coins': {
          const G = D.gates[D.gi];
          if (G && me && Math.hypot(me.x - G.x, me.y - G.y) <= C.coin.r + me.radius) {
            D.val++; D.gi++;
            g.effects.pop(G.x, G.y - 22, String(D.val), 'res', '#ffd23f');
            g.effects.burst(G.x, G.y - 4, 4, '#ffd23f', 10, 70, 0.4);
            g.sfx('pick');
          }
          break;
        }
        case 'chickens': this.chickens(g, D); break;
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
    // foeBall: đội bạn cầm bóng quá 0.8 giây -> bóng bật về phía đối thủ gần nhất, đội bạn tạm không chạm được (bài là đi đánh, không phải giữ bóng)
    popAway(g, D, dt, o) {
      if (!(o && o.team === 0)) { D.lossT = 0; return; }
      if ((D.lossT += dt) < 0.8) return;
      D.lossT = 0;
      const foe = this.nearest(g.teams[1].players, o).q;
      g.looseBall(o, foe ? foe.x - o.x : -g.teams[0].dir, foe ? foe.y - o.y : 0, 140);
      for (const q of g.teams[0].players) g.ball.noPickup.set(q.id, 0.8);
    },
    // CHICKEN CATCH: đối thủ nào chưa là gà (đầu bài, sau giao bóng, vừa hiện lại) -> hoá gà tới hết bài
    chickens(g, D) {
      const S = SFC.CoreStat, C = D.cfg.chicken;
      if (!S) return;
      for (const p of g.teams[1].players) {
        if (p.chickenT > 0 || p.state === 'stun' || p.cTeleT > g.time) continue;
        this.unchick(g, p);
        S.chicken(g.cores, p, 999, C.speed, null);
      }
    },
    // gỡ hình con gà + buff tốc độ gà (để hoá lại không cộng dồn)
    unchick(g, p) {
      for (const o of g.effects.V.props) if (o.kind === 'chicken' && o.a === p.id && o.t > 0) g.effects.propOff(o.id, 0.05);
      p.buffs = p.buffs.filter((b) => !(b.t > 500));
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
      else if (C.goal === 'assists') {
        // bàn của đồng đội AI ngay từ đường chuyền của bạn
        const lp = g.lastPass, by = b.lastTouch, me = g.controlled;
        if (by && me && by !== me && by.team === 0 && lp && lp.from === me && lp.to === by) {
          D.val++;
          g.effects.pop(b.x, b.y - 24, 'ASSIST!', 'good', '#6bff4f');
        }
      }
      else if (C.goal === 'targets') {
        if (Math.abs(b.y - D.ty) <= (D.th || 0) + b.r) { D.val++; g.effects.pop(b.x, b.y - 24, 'BULLSEYE!', 'good', '#6bff4f'); }
        else g.effects.pop(b.x, b.y - 24, 'MISS', 'info');
      }
    },
    // player.js hit: đội bạn hạ gục 1 đối thủ (STREET BRAWL / GANG FIGHT) · bắt được 1 con gà (CHICKEN CATCH)
    hit(g, victim, opts) {
      const D = g.drill;
      if (!D || (D.cfg.goal !== 'hits' && D.cfg.goal !== 'chickens') || D.ok != null || g.state !== 'play') return;
      const s = opts.source;
      if (!s || s.team !== 0 || victim.team !== 1) return;
      if (D.cfg.goal === 'chickens') return this.catchChicken(g, D, victim);
      D.val++;
      g.effects.pop(victim.x, victim.y - 42, 'KO ' + D.val, 'heavy', '#ff3d5a');
    },
    // bắt được gà: +1, gà biến mất rồi respawn giây sau hiện lại chỗ xa bạn (Drills.chickens hoá gà lại)
    catchChicken(g, D, p) {
      if (!(p.chickenT > 0)) return;
      D.val++;
      g.effects.pop(p.x, p.y - 30, 'CAUGHT!', 'good', '#ffe14f');
      g.effects.burst(p.x, p.y - 10, 8, '#ffffff', 16, 90, 0.5);
      p.chickenT = 0; p.noActT = 0;
      this.unchick(g, p);
      const C = D.cfg.chicken;
      p.cTeleT = g.time + C.respawn;
      g.later(C.respawn, () => {
        if (g.drill !== D || D.ok != null) return;
        const f = g.field, me = g.controlled;
        let x = p.x, y = p.y;
        for (let i = 0; i < 12; i++) {
          x = SFC.U.rand(f.x + 40, f.x + f.w - 40); y = SFC.U.rand(f.y + 30, f.y + f.h - 30);
          if (!me || Math.hypot(x - me.x, y - me.y) > 120) break;
        }
        Object.assign(p, { x, y, vx: 0, vy: 0, kbx: 0, kby: 0, state: 'normal', stateT: 0 });
        g.effects.burst(x, y - 8, 6, '#ffffff', 14, 80, 0.5);
      });
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
    shown(D) { return D.cfg.goal === 'hold' || D.cfg.goal === 'teamhold' ? Math.floor(D.val) : D.val; },
    top,
  };

  SFC.Drills = Drills;
})();
