/* Background — pre-render sân + tường "căn phòng" 2.5D kiểu Isaac, chủ đề đường phố */
window.SFC = window.SFC || {};

(function () {
  const S = () => SFC.Sprites;

  const PAL = {
    void: '#0d0a10',
    floor: ['#3b3a45', '#373640', '#403f4b', '#35343d'],
    speckD: '#2c2b33', speckL: '#4a4956',
    line: 'rgba(236,228,200,0.78)',
    brick: ['#5a3a3c', '#633f40', '#523537', '#6b4644'],
    mortar: '#2a1b20',
    rim: '#2b1f26', rimL: '#3d2c33',
    net: 'rgba(230,230,240,0.35)',
  };

  function build(g) {
    const W = SFC_CONFIG.game.render.width, H = SFC_CONFIG.game.render.height;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const x = c.getContext('2d');
    const f = g.field;
    const rnd = SFC.U.seeded(20260925);
    const { px, disc } = S();

    px(x, 0, 0, W, H, PAL.void);

    /* --- mặt sàn nhựa đường --- */
    const T = 16;
    for (let ty = f.y; ty < f.y + f.h; ty += T) {
      for (let tx = f.x; tx < f.x + f.w; tx += T) {
        px(x, tx, ty, Math.min(T, f.x + f.w - tx), Math.min(T, f.y + f.h - ty), PAL.floor[Math.floor(rnd() * PAL.floor.length)]);
        for (let i = 0; i < 7; i++) {
          px(x, tx + Math.floor(rnd() * T), ty + Math.floor(rnd() * T), 1, 1, rnd() < 0.5 ? PAL.speckD : PAL.speckL);
        }
      }
    }
    // vết nứt
    for (let i = 0; i < 14; i++) {
      let cx = f.x + rnd() * f.w, cy = f.y + rnd() * f.h;
      for (let k = 0; k < 10 + rnd() * 14; k++) {
        px(x, cx, cy, 1, 1, '#26252c');
        cx += rnd() < 0.5 ? 1 : -1 + (rnd() < 0.6 ? 1 : 0);
        cy += rnd() < 0.5 ? 1 : 0;
      }
    }
    // vũng sơn màu đội (graffiti sàn)
    [0, 1].forEach((t) => {
      const col = g.teams[t].cfg.kit.shirt;
      x.globalAlpha = 0.07;
      const sx = t === 0 ? f.x + f.w * 0.25 : f.x + f.w * 0.75;
      for (let i = 0; i < 6; i++) disc(x, sx + (rnd() - 0.5) * 90, f.cy + (rnd() - 0.5) * 120, 10 + Math.floor(rnd() * 16), col);
      x.globalAlpha = 1;
    });

    /* --- vạch sân --- */
    x.strokeStyle = PAL.line; x.fillStyle = PAL.line; x.lineWidth = 2;
    x.strokeRect(f.x + 3, f.y + 3, f.w - 6, f.h - 6);
    px(x, f.cx - 1, f.y + 3, 2, f.h - 6, PAL.line);
    x.beginPath(); x.arc(f.cx, f.cy, f.centerCircle, 0, Math.PI * 2); x.stroke();
    disc(x, f.cx, f.cy, 2, PAL.line);
    [-1, 1].forEach((s) => {
      const gx = s < 0 ? f.x + 3 : f.x + f.w - 3;
      const bw = f.boxWidth, bd = f.boxDepth;
      x.strokeRect(s < 0 ? gx : gx - bd, f.cy - bw / 2, bd, bw);
      x.strokeRect(s < 0 ? gx : gx - 22, f.cy - f.goalWidth / 2 - 10, 22, f.goalWidth + 20);
      x.beginPath(); x.arc(s < 0 ? gx + bd : gx - bd, f.cy, 20, s < 0 ? -Math.PI / 2 : Math.PI / 2, s < 0 ? Math.PI / 2 : Math.PI * 1.5); x.stroke();
      disc(x, gx - s * 44, f.cy, 1, PAL.line);
    });
    // logo giữa sân
    x.globalAlpha = 0.18;
    x.font = '8px ' + SFC_CONFIG.game.render.pixelFont;
    x.textAlign = 'center';
    x.fillText('CHAOS', f.cx, f.cy + 3);
    x.globalAlpha = 1;

    /* --- bóng đổ tường lên sàn --- */
    for (let i = 0; i < 10; i++) {
      px(x, f.x, f.y + i, f.w, 1, `rgba(0,0,0,${0.45 - i * 0.045})`);
      px(x, f.x + i, f.y, 1, f.h, `rgba(0,0,0,${0.3 - i * 0.03})`);
      px(x, f.x + f.w - 1 - i, f.y, 1, f.h, `rgba(0,0,0,${0.3 - i * 0.03})`);
    }

    /* --- tường trên (mặt đứng, gạch) --- */
    const wallTop = f.y - 46;
    brickWall(x, f.x - 16, wallTop, f.w + 32, 46, rnd);
    // gradient tối dần xuống chân tường
    for (let i = 0; i < 46; i++) px(x, f.x - 16, wallTop + i, f.w + 32, 1, `rgba(0,0,0,${(i / 46) * 0.35})`);
    px(x, f.x - 16, f.y - 2, f.w + 32, 2, '#1a1116');
    graffiti(x, g, f, wallTop, rnd);
    // hàng rào lưới B40 phía trên tường
    px(x, f.x - 24, wallTop - 20, f.w + 48, 20, '#141018');
    x.fillStyle = 'rgba(160,165,180,0.45)';
    for (let i = 0; i < f.w + 60; i += 6) {
      for (let k = 0; k < 20; k++) {
        x.fillRect(f.x - 24 + i + (k % 6), wallTop - 20 + k, 1, 1);
        x.fillRect(f.x - 24 + i + 5 - (k % 6), wallTop - 20 + k, 1, 1);
      }
    }
    px(x, f.x - 24, wallTop - 21, f.w + 48, 2, '#6f7384');
    px(x, f.x - 24, wallTop - 1, f.w + 48, 2, PAL.rimL);
    // đèn đường 2 góc
    [f.x + 30, f.x + f.w - 30].forEach((lx) => {
      px(x, lx - 1, wallTop - 34, 3, 34, '#2d2d36');
      px(x, lx - 7, wallTop - 36, 15, 3, '#2d2d36');
      px(x, lx - 6, wallTop - 33, 12, 2, '#ffe9a8');
      const grad = x.createRadialGradient(lx, wallTop - 20, 2, lx, wallTop + 20, 90);
      grad.addColorStop(0, 'rgba(255,220,140,0.22)');
      grad.addColorStop(1, 'rgba(255,220,140,0)');
      x.fillStyle = grad;
      x.fillRect(lx - 100, wallTop - 40, 200, 170);
    });

    /* --- tường hai bên + dưới (nhìn từ trên xuống) --- */
    rim(x, f.x - 16, wallTop, 16, f.y + f.h + 18 - wallTop, rnd);
    rim(x, f.x + f.w, wallTop, 16, f.y + f.h + 18 - wallTop, rnd);
    rim(x, f.x - 16, f.y + f.h, f.w + 32, 18, rnd);

    /* --- lỗ khung thành khoét vào tường --- */
    [-1, 1].forEach((s) => {
      const gx = s < 0 ? f.x - f.goalDepth : f.x + f.w;
      px(x, gx, f.gTop, f.goalDepth, f.goalWidth, '#17141c');
      x.fillStyle = PAL.net;
      for (let yy = f.gTop; yy < f.gBot; yy += 4) x.fillRect(gx, yy, f.goalDepth, 1);
      for (let xx = gx; xx < gx + f.goalDepth; xx += 4) x.fillRect(xx, f.gTop, 1, f.goalWidth);
    });

    // đồ vật trang trí: lốp xe, thùng rác, cone
    prop(x, 'tire', f.x - 10, f.y + f.h + 9);
    prop(x, 'can', f.x + f.w + 8, f.y + f.h + 6);
    prop(x, 'cone', f.x + f.w * 0.5 - 60, f.y + f.h + 10);
    prop(x, 'cone', f.x + f.w * 0.5 + 60, f.y + f.h + 10);
    return c;
  }

  function brickWall(x, X, Y, W, H, rnd) {
    const { px } = S();
    px(x, X, Y, W, H, PAL.mortar);
    const bw = 12, bh = 6;
    for (let r = 0; r * bh < H; r++) {
      const off = r % 2 ? bw / 2 : 0;
      for (let c = -1; c * bw < W; c++) {
        const bx = X + c * bw + off, by = Y + r * bh;
        const col = PAL.brick[Math.floor(rnd() * PAL.brick.length)];
        const x0 = Math.max(X, bx + 1), x1 = Math.min(X + W, bx + bw);
        if (x1 <= x0) continue;
        px(x, x0, by + 1, x1 - x0, bh - 1, col);
        px(x, x0, by + 1, x1 - x0, 1, 'rgba(255,255,255,0.06)');
      }
    }
  }

  function rim(x, X, Y, W, H, rnd) {
    const { px } = S();
    px(x, X, Y, W, H, PAL.rim);
    for (let yy = Y; yy < Y + H; yy += 6) {
      for (let xx = X + ((yy / 6) % 2 ? 0 : 4); xx < X + W; xx += 8) {
        px(x, xx, yy, 7, 5, rnd() < 0.5 ? PAL.rimL : '#33252c');
      }
    }
  }

  function graffiti(x, g, f, wallTop, rnd) {
    const { disc } = S();
    const cols = [g.teams[0].cfg.kit.shirt, g.teams[1].cfg.kit.shirt, g.teams[0].cfg.kit.accent, g.teams[1].cfg.kit.accent, '#ffffff'];
    const tags = ['STREET', 'CHAOS', g.teams[0].cfg.short, g.teams[1].cfg.short, 'NO RULES', 'FC'];
    x.font = '8px ' + SFC_CONFIG.game.render.pixelFont;
    x.textAlign = 'center';
    for (let i = 0; i < 7; i++) {
      const gx = f.x + 50 + (i / 6) * (f.w - 100) + (rnd() - 0.5) * 30;
      const gy = wallTop + 14 + rnd() * 18;
      const col = cols[Math.floor(rnd() * cols.length)];
      x.globalAlpha = 0.25;
      for (let k = 0; k < 4; k++) disc(x, gx + (rnd() - 0.5) * 30, gy + (rnd() - 0.5) * 8, 3 + Math.floor(rnd() * 5), col);
      x.globalAlpha = 0.8;
      x.fillStyle = '#140c16';
      const tag = tags[i % tags.length];
      x.fillText(tag, gx + 1, gy + 5);
      x.fillStyle = col;
      x.fillText(tag, gx, gy + 4);
      // vệt sơn chảy
      x.fillRect(gx - 8 + Math.floor(rnd() * 16), gy + 6, 1, 3 + Math.floor(rnd() * 6));
    }
    x.globalAlpha = 1;
  }

  function prop(x, type, X, Y) {
    const { px, disc, OUT } = S();
    if (type === 'tire') { disc(x, X, Y, 6, OUT); disc(x, X, Y, 5, '#26262c'); disc(x, X, Y, 2, '#111'); }
    if (type === 'can') { px(x, X - 5, Y - 8, 10, 12, OUT); px(x, X - 4, Y - 7, 8, 10, '#4f6a58'); px(x, X - 5, Y - 9, 10, 2, '#6c8a74'); }
    if (type === 'cone') { px(x, X - 3, Y + 2, 7, 2, OUT); px(x, X - 2, Y - 4, 5, 6, '#ff7a1f'); px(x, X - 2, Y - 2, 5, 1, '#fff'); px(x, X - 1, Y - 6, 3, 2, '#ff7a1f'); }
  }

  function vignette() {
    const W = SFC_CONFIG.game.render.width, H = SFC_CONFIG.game.render.height;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const x = c.getContext('2d');
    const grad = x.createRadialGradient(W / 2, H / 2 + 20, H * 0.35, W / 2, H / 2, W * 0.62);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, `rgba(0,0,0,${SFC_CONFIG.game.render.vignette})`);
    x.fillStyle = grad;
    x.fillRect(0, 0, W, H);
    return c;
  }

  SFC.Background = { build, vignette };
})();
