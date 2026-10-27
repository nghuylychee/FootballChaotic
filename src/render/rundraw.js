/* RunDraw — hình riêng của GOAT PATH trên sân (chỉ đọc trạng thái trận, renderer.js gọi):
 *   floor(ctx, g): vật trên mặt sân của SKILL GAME (src/systems/drills.js, g.drill) — cổng 2 cọc + vòng sáng (SLALOM GATES:
 *                  cổng đang tới sáng rõ, cổng kế mờ)
 *   top(ctx, g): vẽ sau khung thành — bia sáng trôi lên xuống trong lưới (TARGET PRACTICE)
 *   hurt(ctx, g, p, hy): dấu thập đỏ nhấp nháy cạnh đầu cầu thủ có chấn thương (p.inj; băng quấn vẽ ở sprites.js)
 */
window.SFC = window.SFC || {};

(function () {
  const SP = () => SFC.Sprites;

  // cọc giao bóng cam
  function cone(ctx, x, y) {
    const { px, OUT } = SP();
    px(ctx, x - 3, y - 7, 7, 8, OUT);
    px(ctx, x - 2, y - 2, 5, 2, '#ff7a1f');
    px(ctx, x - 1, y - 6, 3, 4, '#ff7a1f');
    px(ctx, x - 1, y - 4, 3, 1, '#ffffff');
    px(ctx, x, y - 6, 1, 1, '#ffb070');
  }

  const RunDraw = {
    floor(ctx, g) {
      const D = g.drill;
      if (!D || D.ok != null) return;
      const t = g.time;
      if (D.cfg.goal === 'gates' && D.gates) {
        const r = D.cfg.gate.r;
        for (let i = 1; i >= 0; i--) {
          const G = D.gates[D.gi + i];
          if (!G) continue;
          const on = i === 0, k = on ? 0.7 + 0.3 * Math.sin(t * 9) : 0.3;
          ctx.globalAlpha = on ? 1 : 0.45;
          ctx.strokeStyle = on ? `rgba(107,255,79,${k})` : 'rgba(255,255,255,0.4)';
          ctx.lineWidth = on ? 2 : 1;
          ctx.setLineDash([4, 3]);
          ctx.beginPath(); ctx.ellipse(G.x, G.y, r, r * 0.55, 0, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]);
          cone(ctx, G.x - r - 2, G.y + 1);
          cone(ctx, G.x + r + 2, G.y + 1);
          ctx.globalAlpha = 1;
        }
      }
    },
    // sau khung thành: bia TARGET PRACTICE — ô sáng trong lưới (cao bằng khung, rộng theo bia) + vạch sáng trên vạch vôi + hồng tâm
    top(ctx, g) {
      const D = g.drill;
      if (!D || D.ok != null || D.cfg.goal !== 'targets' || !D.th) return;
      const f = g.field, H = f.goalHeight, side = g.teams[0].dir > 0 ? 1 : -1, gx = side > 0 ? f.x + f.w : f.x;
      const k = 0.6 + 0.4 * Math.sin(g.time * 8), y0 = Math.round(D.ty - D.th), h = Math.round(D.th * 2);
      const x0 = side > 0 ? gx : gx - f.goalDepth;
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(107,255,79,${0.28 * k})`;
      ctx.fillRect(x0, y0 - H, f.goalDepth, h + H);
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = `rgba(107,255,79,${0.6 + 0.4 * k})`; ctx.lineWidth = 1;
      ctx.strokeRect(x0 + 0.5, y0 - H + 0.5, f.goalDepth - 1, h + H - 1);
      ctx.fillStyle = '#6bff4f';
      ctx.fillRect(gx - 1, y0, 3, h);
      // hồng tâm giữa ô
      const cx = Math.round(x0 + f.goalDepth / 2), cy = Math.round(D.ty - H / 2);
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(cx, cy, Math.max(3, Math.min(6, D.th - 2)), 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#ff3d5a'; ctx.fillRect(cx - 1, cy - 1, 2, 2);
    },
    hurt(ctx, g, p, hy) {
      if (!p.inj || !p.inj.length || g.state === 'ended') return;
      const { px, OUT } = SP(), blink = Math.sin(g.time * 5 + p.id) > -0.3;
      if (!blink) return;
      const x = Math.round(p.x) + 8, y = Math.round(hy) - 9;
      px(ctx, x - 2, y - 1, 5, 3, OUT); px(ctx, x - 1, y - 2, 3, 5, OUT);
      px(ctx, x - 1, y, 3, 1, '#ff3d5a'); px(ctx, x, y - 1, 1, 3, '#ff3d5a');
    },
  };

  SFC.RunDraw = RunDraw;
})();
