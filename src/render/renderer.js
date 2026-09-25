/* Renderer — vẽ 1 frame: nền → hazard sàn → entity (y-sort) → khung thành → FX → vignette */
window.SFC = window.SFC || {};

(function () {
  const SP = () => SFC.Sprites;
  const U = SFC.U;
  const PASS_COLORS = { ground: '#7fe7ff', through: '#9dff3d', lob: '#ffb13d' };

  const R = {
    init(canvas) {
      const C = SFC_CONFIG.game.render;
      canvas.width = C.width;
      canvas.height = C.height;
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.ctx.imageSmoothingEnabled = false;
      this.vig = SFC.Background.vignette();
      this.bgFor = null;
      this.bg = null;
    },

    render(g) {
      const ctx = this.ctx, { px, disc, ellipse, ringPx, drawPlayer, drawBall } = SP();
      const C = SFC_CONFIG.game.render;
      if (this.bgFor !== g) { this.bg = SFC.Background.build(g); this.bgFor = g; }
      const fx = g.effects, f = g.field, t = g.time;

      ctx.save();
      if (fx.shakeA > 0) ctx.translate(Math.round((Math.random() - 0.5) * fx.shakeA * 2), Math.round((Math.random() - 0.5) * fx.shakeA * 2));
      ctx.drawImage(this.bg, 0, 0);

      /* --- lớp sàn --- */
      // khiên Aegis trên vạch vôi
      [0, 1].forEach((team) => {
        if (!g.cores.shieldReady(team)) return;
        const lx = team === 0 ? f.x : f.x + f.w;
        ctx.globalAlpha = 0.45 + Math.sin(t * 6) * 0.2;
        px(ctx, lx - 1, f.gTop - f.goalHeight, 3, f.goalWidth + f.goalHeight, '#7fe7ff');
        ctx.globalAlpha = 1;
      });
      // mìn EMP
      for (const m of fx.mines) {
        const armed = m.arm <= 0;
        disc(ctx, m.x, m.y, 4, SP().OUT);
        disc(ctx, m.x, m.y, 3, '#3a4250');
        const blink = armed && Math.floor(t * 4) % 2 === 0;
        px(ctx, m.x - 1, m.y - 1, 2, 2, blink ? '#c6ff3f' : g.teams[m.team].cfg.kit.accent);
        if (armed) ringPx(ctx, m.x, m.y + 1, m.r, 'rgba(198,255,63,0.35)');
      }
      // lửa
      ctx.globalCompositeOperation = 'lighter';
      for (const fi of fx.fires) {
        const k = fi.t / fi.max;
        const r = Math.max(1, Math.round(fi.r * (0.4 + k * 0.6)));
        disc(ctx, fi.x, fi.y, r, `rgba(255,90,20,${0.25 + k * 0.3})`);
        disc(ctx, fi.x, fi.y - 1, Math.max(1, r - 2), `rgba(255,200,60,${0.2 + k * 0.3})`);
        if (Math.random() < 0.3 * k) px(ctx, fi.x + (Math.random() - 0.5) * r * 2, fi.y - Math.random() * 8, 1, 2, '#ffe070');
      }
      ctx.globalCompositeOperation = 'source-over';

      // vòng chân người đang điều khiển
      const cp = g.controlled;
      if (cp) ringPx(ctx, cp.x, cp.y + 1, 8, '#ffe14f');

      // assisted passing chạy ngầm; chỉ hiện gợi ý người nhận khi bật showTargetHint (debug)
      const pv = g.state === 'play' && SFC_CONFIG.game.pass.showTargetHint ? g.passPreview : null;
      const pvCol = pv ? PASS_COLORS[pv.mode] : null;
      if (pv && pv.target) ringPx(ctx, pv.target.x, pv.target.y + 1, 9 + Math.round(Math.sin(t * 10)), pvCol);

      /* --- entity y-sort --- */
      const list = [];
      for (const p of g.players) list.push({ y: p.y, k: 'p', o: p });
      list.push({ y: g.ball.y + 0.5, k: 'b', o: g.ball });
      for (const d of fx.decoys) list.push({ y: d.y, k: 'd', o: d });
      for (const a of fx.afterimages) list.push({ y: a.y - 0.1, k: 'a', o: a });
      list.sort((a, b) => a.y - b.y);

      for (const e of list) {
        if (e.k === 'p') {
          const p = e.o;
          const hy = drawPlayer(ctx, p, g);
          if (p.ironCd <= 0 && g.cores.has(p.team, 'iron_body')) px(ctx, p.x - 1, hy - 10, 3, 2, '#ffd23f');
          if (p.charging) this.chargeBar(ctx, p, hy, g);
          if (p.passMode) this.passBar(ctx, p, hy);
          if (pv && pv.target === p) {
            const ay = hy - 13 + Math.round(Math.sin(t * 10));
            px(ctx, p.x - 3, ay, 7, 1, pvCol); px(ctx, p.x - 2, ay + 1, 5, 1, pvCol); px(ctx, p.x - 1, ay + 2, 3, 1, pvCol);
          }
          if (p === cp) {
            const ay = hy - 13 + Math.round(Math.sin(t * 8));
            px(ctx, p.x - 3, ay, 7, 1, '#ffe14f'); px(ctx, p.x - 2, ay + 1, 5, 1, '#ffe14f'); px(ctx, p.x - 1, ay + 2, 3, 1, '#ffe14f');
            if (p.stamina < SFC_CONFIG.game.player.staminaMax - 1) {
              px(ctx, p.x - 7, p.y + 4, 14, 2, SP().OUT);
              px(ctx, p.x - 6, p.y + 4, Math.round(12 * p.stamina / SFC_CONFIG.game.player.staminaMax), 1, p.stamina > 25 ? '#6bff7a' : '#ff5a4f');
            }
          }
        } else if (e.k === 'b') {
          this.ballTrail(ctx, g.ball);
          drawBall(ctx, g.ball);
        } else if (e.k === 'd') {
          const d = e.o, a = 0.5 + 0.3 * Math.sin(t * 20);
          if (d.runner) drawPlayer(ctx, Object.assign({ x: d.x - Math.cos(d.runner.facing) * 9, y: d.y - Math.sin(d.runner.facing) * 8, vx: d.vx, vy: d.vy, state: 'normal', flash: 0 }, d.runner), g, a * 0.8);
          drawBall(ctx, { x: d.x, y: d.y, z: 0, roll: t * 20, fx: {} }, a);
        } else if (e.k === 'a') {
          const a = e.o;
          drawPlayer(ctx, a, g, (a.t / a.max) * 0.5, '#9d7bff');
        }
      }

      /* --- khung thành (vẽ sau để lưới phủ lên bóng) --- */
      this.goal(ctx, g, -1);
      this.goal(ctx, g, 1);

      /* --- FX trên cao --- */
      for (const s of fx.slashes) {
        const k = s.t / s.max;
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(127,231,255,${0.5 + k * 0.5})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y - 5);
        ctx.lineTo(s.x - s.dx * s.len, s.y - 5 - s.dy * s.len);
        ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      }
      for (const p of fx.particles) {
        ctx.globalAlpha = Math.min(1, (p.t / p.max) * 1.5);
        px(ctx, p.x, p.y - p.z, p.size, p.size, p.color);
      }
      ctx.globalAlpha = 1;
      for (const r of fx.rings) {
        const k = 1 - r.t / r.max;
        ctx.globalAlpha = 1 - k;
        ringPx(ctx, r.x, r.y, 6 + k * 14, r.color);
      }
      ctx.globalAlpha = 1;
      ctx.font = '8px ' + C.pixelFont;
      ctx.textAlign = 'center';
      for (const tx of fx.texts) {
        ctx.globalAlpha = Math.min(1, (tx.t / tx.max) * 2);
        ctx.fillStyle = SP().OUT;
        ctx.fillText(tx.str, Math.round(tx.x) + 1, Math.round(tx.y) + 1);
        ctx.fillStyle = tx.color;
        ctx.fillText(tx.str, Math.round(tx.x), Math.round(tx.y));
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      ctx.drawImage(this.vig, 0, 0);
      if (g.finalPush && g.state === 'play') {
        ctx.globalAlpha = 0.18 + Math.sin(t * 5) * 0.08;
        ctx.strokeStyle = '#ff3d5a'; ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, C.width - 4, C.height - 4);
        ctx.globalAlpha = 1;
      }
      if (fx.flashA > 0) {
        ctx.fillStyle = `rgba(255,255,255,${fx.flashA * 0.5})`;
        ctx.fillRect(0, 0, C.width, C.height);
      }
    },

    chargeBar(ctx, p, hy, g) {
      const { px, OUT } = SP();
      const K = SFC_CONFIG.game.kick;
      const w = 18, x = Math.round(p.x - w / 2), y = hy - 16;
      const base = SFC.Actions.shotBasePower(g, p);
      const c = SFC.Actions.shotPower(g, p, p.charge), over = Math.max(0, p.charge - 1) / (K.maxOvercharge - 1);
      const col = over > 0 ? '#ff3d3d' : c > 0.85 ? '#ffb13d' : '#ffe14f';
      px(ctx, x - 1, y - 1, w + 2, 5, OUT);
      // lực mặc định theo khoảng cách — mờ; phần giữ thêm — đậm
      ctx.globalAlpha = 0.45;
      px(ctx, x, y, Math.round(w * base), 3, col);
      ctx.globalAlpha = 1;
      if (c > base + 0.01) px(ctx, x, y, Math.round(w * c), 3, col);
      px(ctx, x + Math.round(w * base), y - 1, 1, 5, '#ffffff');
      if (over > 0) px(ctx, x, y, Math.round(w * over), 1, '#ffffff');
    },

    passBar(ctx, p, hy) {
      const { px, OUT } = SP();
      const w = 18, x = Math.round(p.x - w / 2), y = hy - 16;
      const col = PASS_COLORS[p.passMode];
      const base = p.passBase || 0;
      px(ctx, x - 1, y - 1, w + 2, 5, OUT);
      // phần lực mặc định (tự tính theo khoảng cách) — mờ; phần giữ thêm vượt mức đó — đậm
      ctx.globalAlpha = 0.45;
      px(ctx, x, y, Math.round(w * base), 3, col);
      ctx.globalAlpha = 1;
      if (p.passCharge > base) px(ctx, x, y, Math.round(w * p.passCharge), 3, col);
      px(ctx, x + Math.round(w * base), y - 1, 1, 5, '#ffffff');
    },

    ballTrail(ctx, b) {
      if (b.owner || b.speed < 200) return;
      const { px } = SP();
      const col = b.fx.fire ? '255,140,40' : b.fx.thunder ? '120,230,255' : '255,255,255';
      b.trail.forEach((tp, i) => {
        ctx.fillStyle = `rgba(${col},${0.35 - i * 0.045})`;
        px(ctx, tp.x - 1, tp.y - tp.z - 4, 3, 3, ctx.fillStyle);
      });
    },

    goal(ctx, g, side) {
      const { px } = SP();
      const f = g.field, H = f.goalHeight;
      const lx = side < 0 ? f.x : f.x + f.w;
      const bx = lx + side * f.goalDepth;
      const post = '#f2f2f2', shade = '#9aa0ad';
      // mái lưới
      ctx.fillStyle = 'rgba(220,225,235,0.28)';
      const x0 = Math.min(lx, bx), w = f.goalDepth;
      for (let yy = f.gTop - H; yy <= f.gBot - H; yy += 3) ctx.fillRect(x0, yy, w, 1);
      for (let xx = x0; xx <= x0 + w; xx += 3) ctx.fillRect(xx, f.gTop - H, 1, f.goalWidth);
      // lưới hông
      for (const gy of [f.gTop, f.gBot]) {
        for (let k = 0; k <= H; k += 3) ctx.fillRect(x0, gy - k, w, 1);
      }
      // khung sau
      px(ctx, bx - 1, f.gTop - H, 2, f.goalWidth + 1, shade);
      // cột dọc + xà ngang
      px(ctx, lx - 1, f.gTop - H, 3, H + 1, post);
      px(ctx, lx - 1, f.gBot - H, 3, H + 1, post);
      px(ctx, lx - 1, f.gTop - H, 3, f.goalWidth + 1, post);
      px(ctx, lx + (side < 0 ? 1 : -1), f.gTop - H, 1, f.goalWidth + H + 1, shade);
      px(ctx, x0, f.gTop - H - 1, w + 1, 1, shade);
    },
  };

  SFC.Renderer = R;
})();
