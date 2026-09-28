/* Crowd — khán giả chuyển động quanh sân (arena.crowd trong config/arenas.config.js). Chỉ để trang trí, tính ở máy vẽ.
 * Vẽ mỗi khung hình ngay sau ảnh nền: nhún nhảy theo nhịp, thỉnh thoảng giơ tay / vẫy khăn, que phát sáng,
 * bàn thắng -> fan đội ghi bàn nhảy cẫng + giơ tay (fan đội kia rũ xuống), flash máy ảnh dày hơn, pháo hoa (fireworks).
 * Vùng đứng: top (phía trên tường) · sides (khán đài 2 bên) · bottom (hàng đầu dưới sân, quay lưng, to + tối).
 */
window.SFC = window.SFC || {};

(function () {
  const S = () => SFC.Sprites;
  const HAIR = ['#1a1216', '#3b2415', '#8a4b22', '#f2d16b', '#e8ecf5', '#4a4f63', '#1a1216'];

  function crowdCfg(g) { return SFC.Background.theme(g).crowd || null; }

  // xếp chỗ khán giả (cố định theo seed -> mỗi trận cùng sân trông giống nhau)
  function build(g, C) {
    const f = g.field, W = SFC_CONFIG.game.render.width, H = SFC_CONFIG.game.render.height, wallTop = f.y - 46;
    const rnd = SFC.U.seeded(4242), skins = SFC_CONFIG.teams.skins, fans = [];
    const kits = [0, 1].map((t) => g.teams[t].cfg.kit);
    const regions = C.regions || ['top'];
    const add = (x, y, zone) => {
      if (rnd() > C.density) return;
      const side = zone === 'left' ? 0 : zone === 'right' ? 1 : x < W / 2 ? 0 : 1;
      const team = rnd() < (C.teamColors || 0) ? side : -1;
      const shirt = team >= 0 ? (rnd() < 0.75 ? kits[team].shirt : kits[team].accent) : C.colors[Math.floor(rnd() * C.colors.length)];
      fans.push({
        x: Math.round(x), y: Math.round(y), zone, team, shirt,
        skin: skins[Math.floor(rnd() * skins.length)], hair: HAIR[Math.floor(rnd() * HAIR.length)],
        phase: rnd() * Math.PI * 2, speed: 1.5 + rnd() * 2.5, wave: rnd(),
        scarf: team >= 0 && rnd() < (C.scarves || 0) ? kits[team].accent : null,
        glow: C.glow ? C.glow[Math.floor(rnd() * C.glow.length)] : null,
        hat: C.hat && rnd() < C.hat.chance ? C.hat.colors[Math.floor(rnd() * C.hat.colors.length)] : null,
        hatShape: C.hat ? C.hat.shape : null,
      });
    };
    if (regions.includes('top')) {
      const x0 = C.span === 'field' ? f.x : 3, x1 = C.span === 'field' ? f.x + f.w : W - 3;
      for (let r = (C.rows || 3) - 1; r >= 0; r--) {
        const y = wallTop - 2 - r * 6;
        for (let xx = x0 + (r % 2 ? 2.5 : 0); xx < x1; xx += 5) add(xx + (rnd() - 0.5), y, 'top');
      }
    }
    if (regions.includes('sides')) {
      for (const [a, b, zone] of [[5, f.x - 21, 'left'], [f.x + f.w + 21, W - 5, 'right']]) {
        for (let yy = wallTop + 8; yy < f.y + f.h + 16; yy += 7) for (let xx = a; xx <= b; xx += 6) add(xx + (rnd() - 0.5) * 2, yy, zone);
      }
    }
    if (regions.includes('bottom')) for (let xx = 6; xx < W; xx += 9) add(xx + (rnd() - 0.5) * 3, H + 1, 'bottom');
    fans.sort((a, b) => a.y - b.y);
    return fans;
  }

  function drawFan(ctx, p, bob, arms) {
    const { px, disc } = S();
    const x = p.x, y = p.y + bob;
    if (p.zone === 'bottom') {
      // hàng đầu: quay lưng về phía màn hình, bóng tối
      const c = '#0b0a10';
      disc(ctx, x, y - 10, 4, c); px(ctx, x - 6, y - 6, 12, 7, c);
      if (arms) { px(ctx, x - 7, y - 13, 2, 7, c); px(ctx, x + 5, y - 13, 2, 7, c); if (p.scarf) px(ctx, x - 8, y - 15, 16, 2, p.scarf); }
      if (p.glow) px(ctx, x + (arms ? 6 : 4), y - (arms ? 17 : 9), 1, 4, p.glow);
      return;
    }
    px(ctx, x - 2, y - 4, 5, 4, p.shirt);
    px(ctx, x - 1, y - 7, 3, 3, p.skin);
    px(ctx, x - 1, y - 8, 3, 1, p.hair);
    if (p.hat) drawHat(ctx, x, y, p.hat, p.hatShape);
    if (arms) {
      px(ctx, x - 3, y - 8, 1, 4, p.skin); px(ctx, x + 3, y - 8, 1, 4, p.skin);
      if (p.scarf) px(ctx, x - 4, y - 10, 9, 2, p.scarf);
      if (p.glow) px(ctx, x + 3, y - 11, 1, 3, p.glow);
    } else if (p.glow) px(ctx, x + 3, y - 6, 1, 3, p.glow);
  }

  // mũ của khán giả: nón lá (cone) · mũ lưỡi trai (cap) · mũ bảo hộ (hardhat)
  function drawHat(ctx, x, y, col, shape) {
    const { px } = S();
    if (shape === 'cone') {
      px(ctx, x - 3, y - 8, 7, 1, col); px(ctx, x - 2, y - 9, 5, 1, col); px(ctx, x - 1, y - 10, 3, 1, col); px(ctx, x, y - 11, 1, 1, col);
      px(ctx, x - 3, y - 8, 7, 1, 'rgba(0,0,0,0.12)');
    } else if (shape === 'hardhat') {
      px(ctx, x - 2, y - 9, 5, 2, col); px(ctx, x - 1, y - 10, 3, 1, col); px(ctx, x - 2, y - 8, 5, 1, 'rgba(0,0,0,0.18)');
    } else {
      px(ctx, x - 1, y - 9, 3, 2, col); px(ctx, x + 1, y - 8, 2, 1, col);
    }
  }

  const Crowd = {
    draw(ctx, g) {
      const C = crowdCfg(g);
      if (!C || g.preview) return;   // ảnh động xem trước Core: không vẽ khán giả
      const s = g._crowd || (g._crowd = { fans: build(g, C), fx: [], rockets: [], sparks: [], booms: [], fwT: 0, last: performance.now() });
      const now = performance.now(), dt = Math.min(0.05, (now - s.last) / 1000);
      s.last = now;
      const t = g.time || 0, goal = g.state === 'goal';
      const scorer = goal && g.scoredBy != null ? g.scoredBy : -1;
      // độ náo nhiệt lúc bình thường (FINAL PUSH: náo nhiệt hơn)
      const hype = (C.cheer || 0.5) * (g.finalPush ? 0.55 : 0.25);
      for (const p of s.fans) {
        let bob = 0, arms = false;
        if (goal && (scorer < 0 || p.team < 0 || p.team === scorer)) {
          bob = -Math.round(Math.abs(Math.sin(t * 9 + p.phase)) * 3 * (C.cheer || 0.5));
          arms = true;
        } else if (goal) bob = 1;   // fan đội thủng lưới rũ xuống
        else {
          bob = Math.sin(t * p.speed + p.phase) > 1 - hype * 0.8 ? -1 : 0;
          arms = Math.sin(t * 0.55 + p.wave * 40) > 1 - hype * 0.35;
        }
        drawFan(ctx, p, bob, arms);
      }
      if (C.shade) this.shade(ctx, g, C);
      this.flashes(ctx, s, C, goal, dt);
      if (C.fireworks) this.fireworks(ctx, s, g, goal, scorer, dt);
      SFC.Background.fixtures(ctx, g);
    },

    // phủ tối vùng khán giả (shade 0..1): khán giả chìm trong bóng tối, chỉ flash còn sáng
    shade(ctx, g, C) {
      const f = g.field, W = SFC_CONFIG.game.render.width, H = SFC_CONFIG.game.render.height, top = f.y - 46;
      ctx.fillStyle = `rgba(0,0,0,${C.shade})`;
      const R = C.regions || ['top'];
      if (R.includes('top')) ctx.fillRect(0, 0, W, top);
      if (R.includes('sides')) { ctx.fillRect(0, top, f.x - 17, H - top); ctx.fillRect(f.x + f.w + 17, top, W - f.x - f.w - 17, H - top); }
      if (R.includes('bottom')) ctx.fillRect(0, f.y + f.h + 18, W, H);
    },

    // flash máy ảnh (bàn thắng: dày gấp 4)
    flashes(ctx, s, C, goal, dt) {
      const { px, disc } = S();
      let n = (C.flashes || 0) * (goal ? 4 : 1) * dt;
      while (s.fans.length && Math.random() < n) {
        n -= 1;
        const p = s.fans[Math.floor(Math.random() * s.fans.length)];
        s.fx.push({ x: p.x, y: p.y - (p.zone === 'bottom' ? 14 : 7), t: 0.12 });
      }
      for (const f of s.fx) {
        f.t -= dt;
        ctx.globalAlpha = Math.max(0, f.t / 0.12);
        disc(ctx, f.x, f.y, 3, 'rgba(255,255,255,0.45)');
        px(ctx, f.x - 1, f.y - 1, 2, 2, '#ffffff');
      }
      ctx.globalAlpha = 1;
      s.fx = s.fx.filter((f) => f.t > 0);
    },

    // pháo hoa khi có bàn thắng: pháo bay lên từ khán đài rồi nổ thành tia màu đội ghi bàn / vàng / trắng
    fireworks(ctx, s, g, goal, scorer, dt) {
      const { px } = S();
      const W = SFC_CONFIG.game.render.width, top = g.field.y - 46;
      if (goal && (s.fwT -= dt) <= 0) {
        s.fwT = 0.32;
        const kit = scorer >= 0 ? g.teams[scorer].cfg.kit : null;
        // bắn từ mép khán đài, nổ trên khán đài hoặc phía trên nửa đầu sân
        s.rockets.push({ x: 50 + Math.random() * (W - 100), y: top + 6, vy: -120 - Math.random() * 50, ty: 4 + Math.random() * 70, cols: [kit ? kit.shirt : '#ff3d5a', kit ? kit.accent : '#3ff6ff', '#ffd23f', '#ffffff'] });
      }
      for (const r of s.rockets) {
        r.y += r.vy * dt;
        px(ctx, r.x, r.y, 1, 3, '#fff6c0');
        px(ctx, r.x, r.y + 3, 1, 3, 'rgba(255,200,120,0.5)');
        if (r.y <= r.ty) {
          r.done = true;
          s.booms.push({ x: r.x, y: r.y, t: 0.18 });
          for (let i = 0; i < 26; i++) {
            const a = (i / 26) * Math.PI * 2, v = 38 + Math.random() * 38;
            s.sparks.push({ x: r.x, y: r.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.75, t: 0.8 + Math.random() * 0.4, col: r.cols[i % r.cols.length] });
          }
        }
      }
      s.rockets = s.rockets.filter((r) => !r.done);
      // chớp sáng lúc nổ
      for (const b of s.booms) {
        b.t -= dt;
        ctx.globalAlpha = Math.max(0, b.t / 0.18) * 0.55;
        S().disc(ctx, b.x, b.y, 12, '#fff6c0');
      }
      s.booms = s.booms.filter((b) => b.t > 0);
      for (const p of s.sparks) {
        p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 38 * dt; p.vx *= 0.975;
        ctx.globalAlpha = Math.max(0, Math.min(1, p.t * 1.6));
        px(ctx, p.x - p.vx * 0.03, p.y - p.vy * 0.03, 1, 1, p.col);   // đuôi tia
        px(ctx, p.x, p.y, 2, 2, p.col);
        if (p.t > 0.5) px(ctx, p.x, p.y, 1, 1, '#ffffff');
      }
      ctx.globalAlpha = 1;
      s.sparks = s.sparks.filter((p) => p.t > 0);
    },

    // âm thanh khán giả: gọi mỗi khung hình với trận đang hiện (null = menu / không có trận).
    // Độ ồn nền = crowd.sound của sân; bàn thắng -> hò reo, hết trận -> vỗ tay (bắt theo đổi trạng thái -> chạy được cả máy khách online)
    sound(g, paused) {
      const A = SFC_CONFIG.game.audio.crowd || {};
      const C = g && !g.silent && !g.preview ? crowdCfg(g) : null;
      let level = C ? (C.sound != null ? C.sound : 0.3) : 0;
      if (C) {
        if (g.finalPush && g.state === 'play') level *= A.finalPush || 1;
        if (paused) level *= A.paused || 0.35;
        if (g.state === 'ended') level *= 0.5;
        level = Math.min(1, level);
      }
      SFC.Audio.crowdLevel(Math.round(level * 100) / 100);
      if (C && this.prevGame === g) {
        if (g.state === 'goal' && this.prevState !== 'goal') SFC.Audio.crowdRoar(C.sound != null ? C.sound : 0.3);
        if (g.state === 'ended' && this.prevState !== 'ended') SFC.Audio.crowdApplause(C.sound != null ? C.sound : 0.3);
      }
      this.prevGame = g; this.prevState = g ? g.state : null;
    },

    // vẽ 1 lần (ảnh sân thu nhỏ ở menu): đứng yên, vài người giơ tay
    drawStatic(ctx, g) {
      const C = crowdCfg(g);
      if (!C) return;
      for (const p of build(g, C)) drawFan(ctx, p, 0, p.wave > 0.85);
      if (C.shade) this.shade(ctx, g, C);
      SFC.Background.fixtures(ctx, g);
    },
  };

  SFC.Crowd = Crowd;
})();
