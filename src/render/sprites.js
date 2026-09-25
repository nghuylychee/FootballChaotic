/* Sprites — vẽ pixel-art procedural (không cần file ảnh), phong cách 2.5D kiểu Binding of Isaac */
window.SFC = window.SFC || {};

(function () {
  const OUT = '#140c16';

  function px(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, w, h); }

  // hình tròn pixel (vẽ theo từng hàng -> cạnh răng cưa sắc nét)
  function disc(ctx, cx, cy, r, c) {
    ctx.fillStyle = c;
    cx |= 0; cy |= 0;
    for (let dy = -r; dy <= r; dy++) {
      const w = Math.floor(Math.sqrt(r * r - dy * dy) + 0.35);
      ctx.fillRect(cx - w, cy + dy, w * 2 + 1, 1);
    }
  }
  function ellipse(ctx, cx, cy, rx, ry, c) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  function ringPx(ctx, cx, cy, r, c) {
    ctx.fillStyle = c;
    const steps = Math.max(12, r * 7);
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * 0.5), 1, 1);
    }
  }

  /* ---------- cầu thủ ---------- */
  // p cần: x, y, vx, vy, facing, anim, team, role, look, state
  function drawPlayer(ctx, p, g, alpha = 1, tint = null) {
    const team = g.teams[p.team];
    const kit = team.cfg.kit;
    const shirt = tint || (p.role === 'GK' ? kit.gk : kit.shirt);
    const shirtDark = tint || (p.role === 'GK' ? OUT : kit.shirtDark);
    const x = Math.round(p.x), y0 = Math.round(p.y);
    const moving = Math.hypot(p.vx || 0, p.vy || 0) > 12;
    const step = moving ? Math.floor(p.anim * 12) % 2 : 0;
    const sliding = p.state === 'slide';
    const stunned = p.state === 'stun';
    const y = y0 + (sliding ? 4 : 0);
    const bob = moving && step ? -1 : 0;
    const fx = Math.cos(p.facing), fy = Math.sin(p.facing);

    ctx.globalAlpha = alpha;
    if (alpha >= 1) ellipse(ctx, x, y0 + 1, 6, 2.5, 'rgba(0,0,0,0.38)');

    // chân
    if (!sliding) {
      const l = step ? -1 : 0, r = step ? 0 : -1;
      px(ctx, x - 4, y - 5 + l, 4, 5, OUT); px(ctx, x, y - 5 + r, 4, 5, OUT);
      px(ctx, x - 3, y - 4 + l, 2, 3, p.look.skin); px(ctx, x + 1, y - 4 + r, 2, 3, p.look.skin);
      px(ctx, x - 3, y - 2 + l, 2, 1, '#e8e8e8'); px(ctx, x + 1, y - 2 + r, 2, 1, '#e8e8e8');
    } else {
      const sx = Math.round(fx * 6);
      px(ctx, x + sx - 3, y - 3, 6, 3, OUT);
      px(ctx, x + sx - 2, y - 2, 4, 1, p.look.skin);
    }

    // thân
    const by = y - 10 + bob;
    px(ctx, x - 5, by - 1, 10, 8, OUT);
    px(ctx, x - 4, by, 8, 6, shirt);
    px(ctx, x - 4, by + 4, 8, 2, kit.shorts);
    px(ctx, x - 4, by + 3, 8, 1, shirtDark);
    px(ctx, x - 1, by, 2, 1, kit.accent);
    // tay
    const arm = moving ? (step ? 1 : -1) : 0;
    px(ctx, x - 6, by + 1 + arm, 2, 4, OUT); px(ctx, x + 4, by + 1 - arm, 2, 4, OUT);
    px(ctx, x - 6, by + 2 + arm, 1, 2, p.role === 'GK' ? kit.accent : p.look.skin);
    px(ctx, x + 5, by + 2 - arm, 1, 2, p.role === 'GK' ? kit.accent : p.look.skin);

    // đầu to kiểu Isaac
    const hx = x + (sliding ? Math.round(-fx * 3) : 0);
    const hy = by - 6 + (stunned ? Math.round(Math.sin(p.anim * 20)) : 0);
    disc(ctx, hx, hy, 7, OUT);
    disc(ctx, hx, hy, 6, p.look.skin);
    // tóc + băng đô
    const back = fy < -0.35;
    ctx.fillStyle = p.look.hair;
    for (let dy = -6; dy <= (back ? 3 : -3); dy++) {
      const w = Math.floor(Math.sqrt(36 - dy * dy) + 0.35);
      ctx.fillRect(hx - w, hy + dy, w * 2 + 1, 1);
    }
    px(ctx, hx - 6, hy - 3, 13, 1, kit.accent);
    // má hồng / bóng đổ đầu
    px(ctx, hx - 5, hy + 3, 11, 1, 'rgba(0,0,0,0.12)');

    if (!back) {
      const ex = Math.round(fx * 2);
      const ey = fy > 0.4 ? 1 : 0;
      if (stunned) {
        px(ctx, hx - 4 + ex, hy + ey, 3, 1, OUT); px(ctx, hx + 1 + ex, hy + ey, 3, 1, OUT);
      } else {
        px(ctx, hx - 4 + ex, hy - 1 + ey, 3, 3, OUT); px(ctx, hx + 1 + ex, hy - 1 + ey, 3, 3, OUT);
        px(ctx, hx - 4 + ex, hy - 1 + ey, 1, 1, '#ffffff'); px(ctx, hx + 1 + ex, hy - 1 + ey, 1, 1, '#ffffff');
      }
      px(ctx, hx - 1 + ex, hy + 3 + ey, 2, 1, stunned ? OUT : 'rgba(20,12,22,0.6)');
    }

    if (p.flash > 0) {
      ctx.globalCompositeOperation = 'lighter';
      disc(ctx, hx, hy, 6, 'rgba(255,255,255,0.6)');
      ctx.globalCompositeOperation = 'source-over';
    }
    if (stunned) {
      for (let i = 0; i < 3; i++) {
        const a = p.anim * 6 + (i * Math.PI * 2) / 3;
        px(ctx, hx + Math.round(Math.cos(a) * 8), hy - 9 + Math.round(Math.sin(a) * 2), 2, 2, '#ffe14f');
      }
    }
    ctx.globalAlpha = 1;
    return hy;
  }

  /* ---------- bóng ---------- */
  function drawBall(ctx, b, alpha = 1) {
    const x = Math.round(b.x), y = Math.round(b.y);
    const s = Math.max(1.2, 3.2 - b.z * 0.05);
    ctx.globalAlpha = alpha;
    ellipse(ctx, x, y + 1, s + 0.5, s * 0.5 + 0.3, 'rgba(0,0,0,0.4)');
    const by = Math.round(y - b.z - 3);
    const fx = b.fx || {};
    if (fx.fire || fx.thunder) {
      ctx.globalCompositeOperation = 'lighter';
      disc(ctx, x, by, 6, fx.fire ? 'rgba(255,120,30,0.45)' : 'rgba(80,220,255,0.45)');
      ctx.globalCompositeOperation = 'source-over';
    }
    disc(ctx, x, by, 4, OUT);
    disc(ctx, x, by, 3, fx.fire ? '#ffd9a0' : fx.thunder ? '#d8fbff' : '#f4f4f4');
    px(ctx, x + 1, by + 1, 2, 2, '#c7c7d2');
    const a = (b.roll || 0) * 0.3;
    px(ctx, x + Math.round(Math.cos(a) * 1.6), by + Math.round(Math.sin(a) * 1.6), 1, 1, '#222');
    px(ctx, x - Math.round(Math.cos(a) * 1.6), by - Math.round(Math.sin(a) * 1.6), 1, 1, '#222');
    px(ctx, x - 1, by - 2, 1, 1, '#ffffff');
    ctx.globalAlpha = 1;
  }

  SFC.Sprites = { OUT, px, disc, ellipse, ringPx, drawPlayer, drawBall };
})();
