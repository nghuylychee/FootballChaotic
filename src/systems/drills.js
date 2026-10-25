/* Drills — SKILL GAME của GOAT PATH (docs/RUN_DESIGN.md, số liệu config/run.config.js -> run.drills). Chạy trên trận thật:
 * opts.drill = id bài, opts.teamSize = [bạn, đối thủ], opts.noDraft. Thay đồng hồ trận (thời gian riêng của bài), giao bóng lại luôn cho bạn,
 * tự kết thúc khi qua / hỏng: g.drill.ok = true / false rồi g.end(). Kết quả vào Run.recordDrill qua Profile.awardMatch.
 * Móc trong match.js: create · clock (thay tickClock) · update (cuối simulate) · goal (checkGoal) · afterGoal.
 *   goals: ghi đủ bàn trước khi hết giờ = qua · keep: giữ bóng tới hết giờ, đối thủ cướp được = hỏng · keeperOnly: đối thủ chỉ trông khung
 *   (cầm được bóng thì một lúc sau trả lại bạn).
 */
window.SFC = window.SFC || {};

(function () {
  const Drills = {
    create(g) {
      const id = g.opts.drill, cfg = id && SFC_CONFIG.run && SFC_CONFIG.run.drills[id];
      if (!cfg) return null;
      // trông khung: đối thủ chỉ đứng khung thành (khi chưa cầm bóng) — qua móc g.aiHook của AI.update
      if (cfg.keeperOnly) g.aiHook = (p, dt) => {
        if (p.team !== 1 || (g.ball.owner && g.ball.owner.team === 1)) return false;
        SFC.AI.goalkeeper(dt, g, p);
        return true;
      };
      return { id, cfg, time: cfg.time, ok: null, heldT: 0 };
    },
    // thay tickClock: thời gian của bài, hết giờ: giữ bóng = qua, ghi bàn chưa đủ = hỏng
    clock(g, dt) {
      const D = g.drill;
      g.elapsed += dt;
      if (D.ok == null && g.elapsed >= D.time) this.finish(g, !!D.cfg.keep);
    },
    update(g, dt) {
      const D = g.drill, o = g.ball.owner;
      if (D.ok != null) return;
      if (D.cfg.keep && o && o.team === 1) return this.finish(g, false);
      // thủ môn cầm bóng một lúc -> giao lại cho bạn
      if (D.cfg.keeperOnly && o && o.team === 1) { D.heldT += dt; if (D.heldT > 0.8) { D.heldT = 0; g.kickoff(0); } }
      else D.heldT = 0;
    },
    goal(g, scorer) {
      const D = g.drill;
      if (D.cfg.goals && scorer === 0 && g.teams[0].score >= D.cfg.goals) D.ok = true;
    },
    // ăn mừng xong: đủ bàn -> kết thúc, chưa đủ -> giao bóng lại cho bạn
    afterGoal(g) {
      if (g.drill.ok != null) return g.end();
      g.kickoff(0);
    },
    finish(g, ok) {
      const D = g.drill;
      if (D.ok == null || ok === false) D.ok = ok;
      g.emit('banner', { text: ok ? SFC.N_('CLEAR!') : SFC.N_('FAILED'), sub: '', color: ok ? '#6bff4f' : '#ff5a6e' });
      g.end();
    },
  };

  SFC.Drills = Drills;
})();
