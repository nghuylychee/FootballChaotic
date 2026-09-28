/* Background — pre-render sân + tường "căn phòng" 2.5D kiểu Isaac.
 * Giao diện theo arena (config/arenas.config.js): g.opts.arena, mặc định 'street'. */
window.SFC = window.SFC || {};

(function () {
  const S = () => SFC.Sprites;

  function theme(g) {
    const A = SFC_CONFIG.arenas;
    return A[g.opts && g.opts.arena] || A.street;
  }

  function build(g) {
    const W = SFC_CONFIG.game.render.width, H = SFC_CONFIG.game.render.height;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const x = c.getContext('2d');
    const f = g.field, T = theme(g);
    const rnd = SFC.U.seeded(20260925);
    const { px, disc } = S();

    px(x, 0, 0, W, H, T.void);

    /* --- mặt sân --- */
    floor(x, f, T.floor, rnd);
    // vũng sơn màu đội (graffiti sàn)
    [0, 1].forEach((t) => {
      const col = g.teams[t].cfg.kit.shirt;
      x.globalAlpha = T.floor.paint || 0;
      const sx = t === 0 ? f.x + f.w * 0.25 : f.x + f.w * 0.75;
      for (let i = 0; i < 6; i++) disc(x, sx + (rnd() - 0.5) * 90, f.cy + (rnd() - 0.5) * 120, 10 + Math.floor(rnd() * 16), col);
      x.globalAlpha = 1;
    });

    /* --- vạch sân --- */
    x.strokeStyle = T.line; x.fillStyle = T.line; x.lineWidth = 2;
    x.strokeRect(f.x + 3, f.y + 3, f.w - 6, f.h - 6);
    px(x, f.cx - 1, f.y + 3, 2, f.h - 6, T.line);
    x.beginPath(); x.arc(f.cx, f.cy, f.centerCircle, 0, Math.PI * 2); x.stroke();
    disc(x, f.cx, f.cy, 2, T.line);
    [-1, 1].forEach((s) => {
      const gx = s < 0 ? f.x + 3 : f.x + f.w - 3;
      const bw = f.boxWidth, bd = f.boxDepth;
      x.strokeRect(s < 0 ? gx : gx - bd, f.cy - bw / 2, bd, bw);
      x.strokeRect(s < 0 ? gx : gx - 22, f.cy - f.goalWidth / 2 - 10, 22, f.goalWidth + 20);
      x.beginPath(); x.arc(s < 0 ? gx + bd : gx - bd, f.cy, 20, s < 0 ? -Math.PI / 2 : Math.PI / 2, s < 0 ? Math.PI / 2 : Math.PI * 1.5); x.stroke();
      disc(x, gx - s * 44, f.cy, 1, T.line);
    });
    // logo giữa sân
    x.globalAlpha = 0.18;
    x.font = '8px ' + SFC_CONFIG.game.render.pixelFont;
    x.textAlign = 'center';
    x.fillText(T.logo || 'CHAOS', f.cx, f.cy + 3);
    x.globalAlpha = 1;

    /* --- bóng đổ tường lên sàn --- */
    for (let i = 0; i < 10; i++) {
      px(x, f.x, f.y + i, f.w, 1, `rgba(0,0,0,${0.45 - i * 0.045})`);
      px(x, f.x + i, f.y, 1, f.h, `rgba(0,0,0,${0.3 - i * 0.03})`);
      px(x, f.x + f.w - 1 - i, f.y, 1, f.h, `rgba(0,0,0,${0.3 - i * 0.03})`);
    }

    /* --- phông phía trên tường (hàng rào / thành phố / đèn lồng / cảng / màn LED) --- */
    const wallTop = f.y - 46;
    backdrop(x, f, wallTop, W, T.backdrop, rnd);
    if (T.stands) stands(x, f, wallTop, W, H, T.stands);

    /* --- tường trên (mặt đứng) --- */
    wall(x, f.x - 16, wallTop, f.w + 32, 46, T.wall, rnd, g);
    // gradient tối dần xuống chân tường
    for (let i = 0; i < 46; i++) px(x, f.x - 16, wallTop + i, f.w + 32, 1, `rgba(0,0,0,${(i / 46) * 0.35})`);
    px(x, f.x - 16, f.y - 2, f.w + 32, 2, T.wall.edge);
    graffiti(x, g, f, wallTop, T.graffiti, rnd);
    lights(x, f, wallTop, W, H, T.lights);

    /* --- tường hai bên + dưới (nhìn từ trên xuống) --- */
    rim(x, f.x - 16, wallTop, 16, f.y + f.h + 18 - wallTop, T.rim, rnd);
    rim(x, f.x + f.w, wallTop, 16, f.y + f.h + 18 - wallTop, T.rim, rnd);
    rim(x, f.x - 16, f.y + f.h, f.w + 32, 18, T.rim, rnd);

    /* --- lỗ khung thành khoét vào tường --- */
    [-1, 1].forEach((s) => {
      const gx = s < 0 ? f.x - f.goalDepth : f.x + f.w;
      px(x, gx, f.gTop, f.goalDepth, f.goalWidth, T.hole);
      x.fillStyle = T.net;
      for (let yy = f.gTop; yy < f.gBot; yy += 4) x.fillRect(gx, yy, f.goalDepth, 1);
      for (let xx = gx; xx < gx + f.goalDepth; xx += 4) x.fillRect(xx, f.gTop, 1, f.goalWidth);
    });

    // đồ vật trang trí ngoài mép sân
    for (const p of T.props || []) prop(x, p.t, Math.round(f.x + f.w * p.x + (p.dx || 0)), Math.round(f.y + f.h + (p.dy || 0)));
    fixtures(x, g);
    return c;
  }

  // vật cố định hàng trên (màn hình lớn, dàn đèn pha, đèn rọi) — vẽ cả trong ảnh nền lẫn đè lên lớp khán giả (render/crowd.js)
  function fixtures(x, g) {
    const T = theme(g), f = g.field, W = SFC_CONFIG.game.render.width, H = SFC_CONFIG.game.render.height;
    const { px, disc } = S(), B = T.backdrop, L = T.lights || {};
    if (B.screen) {
      const sw = 112, sx = Math.round(W / 2 - sw / 2), sy = 1;
      px(x, sx - 2, sy, sw + 4, 17, '#2a2f3a');
      px(x, sx, sy + 2, sw, 13, '#05070d');
      for (let yy = sy + 2; yy < sy + 15; yy += 2) px(x, sx, yy, sw, 1, 'rgba(255,255,255,0.04)');
      x.font = '8px ' + SFC_CONFIG.game.render.pixelFont; x.textAlign = 'center';
      x.fillStyle = B.screenColor || '#ffe14f';
      x.fillText(B.screen, W / 2, sy + 12);
      px(x, sx + sw / 2 - 1, sy + 17, 2, 3, '#2a2f3a');
    }
    if (L.style === 'flood') {
      for (const [lx, ly] of floodSpots(W, H, L)) {
        const top = ly < H / 2;
        px(x, lx - 1, top ? ly + 3 : ly - 16, 2, 14, L.pole);
        px(x, lx - 9, ly - 4, 18, 8, L.pole);
        for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) px(x, lx - 8 + i * 4, ly - 3 + j * 3, 3, 2, L.lamp);
        x.globalAlpha = 0.18; disc(x, lx, ly, 13, L.lamp); x.globalAlpha = 1;
      }
    }
    if (L.style === 'spot') {
      px(x, f.cx - 9, 0, 18, 4, '#2a2a30');
      px(x, f.cx - 7, 3, 14, 2, '#fffbe6');
      x.globalAlpha = 0.25; disc(x, f.cx, 4, 10, '#fffbe6'); x.globalAlpha = 1;
    }
  }

  function floodSpots(W, H, L) {
    const top = [[16, 6], [W - 16, 6]];
    return L.towers === 4 ? top.concat([[16, H - 9], [W - 16, H - 9]]) : top;
  }

  // khán đài 2 bên + hàng dưới (vùng tối ngoài tường) — khán giả đứng ở đây (render/crowd.js)
  function stands(x, f, wallTop, W, H, St) {
    const { px } = S();
    const h = f.y + f.h + 18 - wallTop;
    for (const [a, b] of [[0, f.x - 17], [f.x + f.w + 17, W]]) {
      for (let cx = a, i = 0; cx < b; cx += 6, i++) px(x, cx, wallTop, Math.min(6, b - cx), h, St.color[i % 2]);
      px(x, a === 0 ? b - 2 : a, wallTop, 2, h, St.rail);
    }
    const by = f.y + f.h + 18;
    px(x, 0, by, W, H - by, St.color[0]);
    px(x, 0, by, W, 1, St.rail);
  }

  /* ---------------- mặt sân ---------------- */
  function floor(x, f, F, rnd) {
    const { px, disc } = S();
    const pick = () => F.colors[Math.floor(rnd() * F.colors.length)];
    const T = F.size || 16;
    if (F.style === 'turf') {
      // cỏ sọc (checker: cắt cỏ ô bàn cờ)
      const sw = F.stripe || 24;
      for (let sx = f.x, i = 0; sx < f.x + f.w; sx += sw, i++) px(x, sx, f.y, Math.min(sw, f.x + f.w - sx), f.h, F.colors[i % 2]);
      if (F.checker) for (let sy = f.y, j = 0; sy < f.y + f.h; sy += sw, j++) if (j % 2) px(x, f.x, sy, f.w, Math.min(sw, f.y + f.h - sy), 'rgba(255,255,255,0.035)');
      for (let i = 0; i < (f.w * f.h) / 60; i++) px(x, f.x + Math.floor(rnd() * f.w), f.y + Math.floor(rnd() * f.h), 1, 1, rnd() < 0.5 ? F.speckD : F.speckL);
      return;
    }
    for (let ty = f.y; ty < f.y + f.h; ty += T) {
      for (let tx = f.x; tx < f.x + f.w; tx += T) {
        const w = Math.min(T, f.x + f.w - tx), h = Math.min(T, f.y + f.h - ty);
        px(x, tx, ty, w, h, pick());
        const specks = F.style === 'grid' ? 2 : F.style === 'plates' ? 10 : 7;
        for (let i = 0; i < specks; i++) px(x, tx + Math.floor(rnd() * w), ty + Math.floor(rnd() * h), 1, 1, rnd() < 0.5 ? F.speckD : F.speckL);
        if (F.style === 'tiles') {
          // ron gạch
          px(x, tx, ty, w, 1, F.joint); px(x, tx, ty, 1, h, F.joint);
        } else if (F.style === 'plates') {
          px(x, tx, ty, w, 1, F.joint); px(x, tx, ty, 1, h, F.joint);
          px(x, tx + 1, ty + 1, w - 1, 1, 'rgba(255,255,255,0.05)');
          // đinh tán 4 góc
          for (const [rx, ry] of [[3, 3], [w - 4, 3], [3, h - 4], [w - 4, h - 4]]) if (rx > 0 && ry > 0) px(x, tx + rx, ty + ry, 1, 1, F.rivet);
          if (rnd() < 0.3) { x.globalAlpha = 1; disc(x, tx + rnd() * w, ty + rnd() * h, 3 + Math.floor(rnd() * 5), F.rust); }
        }
      }
    }
    if (F.style === 'grid') {
      // lưới neon + giao điểm sáng
      x.fillStyle = F.grid;
      for (let gx = f.x; gx <= f.x + f.w; gx += T) x.fillRect(gx, f.y, 1, f.h);
      for (let gy = f.y; gy <= f.y + f.h; gy += T) x.fillRect(f.x, gy, f.w, 1);
      for (let gx = f.x; gx <= f.x + f.w; gx += T) for (let gy = f.y; gy <= f.y + f.h; gy += T) if (rnd() < 0.25) px(x, gx - 1, gy - 1, 3, 3, F.glow);
    }
    if (F.style === 'dirt') {
      // mảng cỏ mọc ven sân / 2 đầu sân, giữa sân bị giẫm mòn
      for (let i = 0; i < (F.grassPatches || 0); i++) {
        const gx = f.x + rnd() * f.w, gy = f.y + rnd() * f.h;
        const edge = Math.min(gy - f.y, f.y + f.h - gy) < 40 || Math.abs(gx - f.cx) > f.w * 0.36;
        if (!edge && rnd() < 0.7) continue;
        for (let k = 0; k < 34; k++) px(x, gx + (rnd() - 0.5) * 24, gy + (rnd() - 0.5) * 12, 1, rnd() < 0.3 ? 2 : 1, F.grass[Math.floor(rnd() * F.grass.length)]);
      }
    }
    if (F.hazard) {
      // vạch cảnh báo vàng đen dọc mép trên / dưới sân
      for (const yy of [f.y + 7, f.y + f.h - 11]) {
        for (let xx = f.x + 8; xx < f.x + f.w - 8; xx++) {
          const on = Math.floor((xx + yy) / 4) % 2 === 0;
          px(x, xx, yy, 1, 4, on ? 'rgba(255,210,63,0.35)' : 'rgba(20,20,20,0.35)');
        }
      }
    }
    // vết nứt
    for (let i = 0; i < (F.cracks || 0); i++) {
      let cx = f.x + rnd() * f.w, cy = f.y + rnd() * f.h;
      for (let k = 0; k < 10 + rnd() * 14; k++) {
        px(x, cx, cy, 1, 1, F.crack);
        cx += rnd() < 0.5 ? 1 : -1 + (rnd() < 0.6 ? 1 : 0);
        cy += rnd() < 0.5 ? 1 : 0;
      }
    }
  }

  /* ---------------- tường trên ---------------- */
  function wall(x, X, Y, W, H, Wc, rnd, g) {
    const { px } = S();
    const pick = () => Wc.colors[Math.floor(rnd() * Wc.colors.length)];
    if (Wc.style === 'bamboo') {
      // hàng rào tre: cây tre dọc có đốt + 2 đường dây buộc ngang
      for (let cx = X; cx < X + W; cx += 5) {
        const w = Math.min(4, X + W - cx);
        px(x, cx, Y, w, H, pick());
        px(x, cx, Y, 1, H, 'rgba(255,255,255,0.18)');
        px(x, cx + w - 1, Y, 1, H, 'rgba(0,0,0,0.22)');
        for (let ny = Y + 3 + Math.floor(rnd() * 9); ny < Y + H; ny += 12) px(x, cx, ny, w, 1, Wc.node);
        px(x, cx + w, Y, 1, H, 'rgba(0,0,0,0.55)');
      }
      for (const ry of [Y + 9, Y + H - 12]) { px(x, X, ry, W, 3, Wc.rope); px(x, X, ry, W, 1, 'rgba(255,255,255,0.12)'); }
      return;
    }
    if (Wc.style === 'plaster') {
      // tường vôi 2 màu + nẹp trên + 3 bảng đen / bảng tin
      const mid = Y + Math.floor(H * 0.55);
      px(x, X, Y, W, H, Wc.colors[0]);
      px(x, X, mid, W, Y + H - mid, Wc.band);
      px(x, X, Y, W, 2, Wc.trim);
      px(x, X, mid, W, 1, 'rgba(0,0,0,0.15)');
      for (let i = 0; i < 40; i++) px(x, X + rnd() * W, Y + 3 + rnd() * (H - 6), 2 + Math.floor(rnd() * 4), 1, 'rgba(0,0,0,0.06)');
      for (const k of [0.2, 0.5, 0.8]) {
        const bx = Math.round(X + W * k - 23);
        px(x, bx - 1, Y + 5, 48, 20, Wc.frame);
        px(x, bx, Y + 6, 46, 18, Wc.board);
        for (let l = 0; l < 3; l++) px(x, bx + 4, Y + 10 + l * 4, 10 + Math.floor(rnd() * 26), 1, 'rgba(255,255,255,0.35)');
      }
      return;
    }
    if (Wc.style === 'cage') {
      // lưới thép mắt cáo trên nền tối + cột thép
      px(x, X, Y, W, H, Wc.bg);
      x.fillStyle = Wc.wire;
      for (let i = 0; i < W; i += 6) {
        for (let k = 0; k < H; k++) { x.fillRect(X + i + (k % 6), Y + k, 1, 1); x.fillRect(X + i + 5 - (k % 6), Y + k, 1, 1); }
      }
      for (let cx = X; cx < X + W; cx += 48) { px(x, cx, Y, 3, H, Wc.post); px(x, cx, Y, 1, H, Wc.postL); }
      px(x, X, Y, W, 3, Wc.post); px(x, X, Y, W, 1, Wc.postL);
      px(x, X, Y + H - 3, W, 3, Wc.post);
      return;
    }
    if (Wc.style === 'ads' || Wc.style === 'led') {
      // dải bảng quảng cáo ({t0} / {t1} = tên đội); chữ tự thu nhỏ cho vừa ô
      // 16px 2 đầu tường bị viền tường 2 bên che -> chia ô trong phần nhìn thấy
      const led = Wc.style === 'led';
      if (led) px(x, X, Y, W, H, Wc.bg);
      X += 16; W -= 32;
      const n = Wc.ads.length, sw = W / n;
      const names = g ? [g.teams[0].cfg.name, g.teams[1].cfg.name] : ['', ''];
      x.textAlign = 'center';
      Wc.ads.forEach(([txt, a, b], i) => {
        const sx = Math.round(X + i * sw), w = Math.round(X + (i + 1) * sw) - sx;
        const label = txt.replace('{t0}', names[0]).replace('{t1}', names[1]).toUpperCase();
        let fs = 8;
        do { x.font = fs + 'px ' + SFC_CONFIG.game.render.pixelFont; } while (x.measureText(label).width > w - 6 && --fs > 4);
        if (led) {
          px(x, sx, Y, w, H, Wc.bg); px(x, sx, Y, 1, H, '#000');
          x.save(); x.shadowColor = a; x.shadowBlur = 6; x.fillStyle = a; x.fillText(label, sx + w / 2, Y + H / 2 + fs / 2); x.restore();
        } else {
          px(x, sx, Y, w, H, a); px(x, sx, Y, w, 3, 'rgba(255,255,255,0.18)'); px(x, sx, Y + H - 4, w, 4, 'rgba(0,0,0,0.3)'); px(x, sx, Y, 1, H, 'rgba(0,0,0,0.5)');
          x.fillStyle = b; x.fillText(label, sx + w / 2, Y + H / 2 + fs / 2);
        }
      });
      if (led) for (let yy = Y; yy < Y + H; yy += 2) px(x, X, yy, W, 1, 'rgba(0,0,0,0.35)');
      return;
    }
    if (Wc.style === 'container') {
      // các thùng container xếp cạnh nhau: tôn sóng dọc, viền trên / dưới
      let cx = X;
      while (cx < X + W) {
        const w = Math.min(X + W - cx, 44 + Math.floor(rnd() * 30)), col = pick();
        px(x, cx, Y, w, H, col);
        for (let rx = cx + 2; rx < cx + w - 1; rx += Wc.rib || 3) px(x, rx, Y + 3, 1, H - 6, 'rgba(0,0,0,0.22)');
        px(x, cx, Y, w, 3, 'rgba(0,0,0,0.35)'); px(x, cx, Y + H - 3, w, 3, 'rgba(0,0,0,0.35)');
        px(x, cx, Y, 1, H, 'rgba(0,0,0,0.5)');
        // chốt cửa container
        px(x, cx + w - 6, Y + 10, 1, H - 20, 'rgba(255,255,255,0.18)');
        cx += w;
      }
      return;
    }
    if (Wc.style === 'panel') {
      // tấm kim loại, khe nối phát sáng
      for (let cx = X; cx < X + W; cx += 32) {
        const w = Math.min(32, X + W - cx);
        px(x, cx, Y, w, H, pick());
        px(x, cx, Y, 1, H, Wc.seam);
        px(x, cx + 3, Y + 4, 1, 1, 'rgba(255,255,255,0.3)'); px(x, cx + w - 4, Y + H - 5, 1, 1, 'rgba(255,255,255,0.3)');
      }
      px(x, X, Y + Math.floor(H / 2), W, 1, 'rgba(157,123,255,0.25)');
      return;
    }
    // gạch
    px(x, X, Y, W, H, Wc.mortar);
    const bw = Wc.w || 12, bh = Wc.h || 6;
    for (let r = 0; r * bh < H; r++) {
      const off = r % 2 ? bw / 2 : 0;
      for (let c = -1; c * bw < W; c++) {
        const bx = X + c * bw + off, by = Y + r * bh;
        const col = pick();
        const x0 = Math.max(X, bx + 1), x1 = Math.min(X + W, bx + bw);
        if (x1 <= x0) continue;
        px(x, x0, by + 1, x1 - x0, bh - 1, col);
        px(x, x0, by + 1, x1 - x0, 1, 'rgba(255,255,255,0.06)');
      }
    }
  }

  /* ---------------- phông phía trên tường ---------------- */
  function sky(x, W, Y, cols) {
    const grad = x.createLinearGradient(0, 0, 0, Y);
    grad.addColorStop(0, cols[0]); grad.addColorStop(1, cols[1]);
    x.fillStyle = grad;
    x.fillRect(0, 0, W, Y);
  }

  function backdrop(x, f, wallTop, W, B, rnd) {
    const { px, disc } = S();
    if (B.style === 'fence') {
      // hàng rào lưới B40
      px(x, f.x - 24, wallTop - 20, f.w + 48, 20, B.bg);
      x.fillStyle = B.wire;
      for (let i = 0; i < f.w + 60; i += 6) {
        for (let k = 0; k < 20; k++) {
          x.fillRect(f.x - 24 + i + (k % 6), wallTop - 20 + k, 1, 1);
          x.fillRect(f.x - 24 + i + 5 - (k % 6), wallTop - 20 + k, 1, 1);
        }
      }
      px(x, f.x - 24, wallTop - 21, f.w + 48, 2, B.rail);
      return;
    }
    if (B.style === 'skyline') {
      sky(x, W, wallTop, B.sky);
      disc(x, W - 70, 12, 7, B.moon);
      disc(x, W - 67, 10, 6, B.sky[0]);   // trăng khuyết
      for (let i = 0; i < 30; i++) px(x, Math.floor(rnd() * W), Math.floor(rnd() * (wallTop - 12)), 1, 1, 'rgba(255,255,255,0.5)');
      let bx = -4;
      while (bx < W) {
        const w = 16 + Math.floor(rnd() * 26), h = 10 + Math.floor(rnd() * 26);
        const col = B.buildings[Math.floor(rnd() * B.buildings.length)];
        px(x, bx, wallTop - h, w, h, col);
        for (let wy = wallTop - h + 3; wy < wallTop - 2; wy += 4) {
          for (let wx = bx + 2; wx < bx + w - 2; wx += 4) if (rnd() < 0.3) px(x, wx, wy, 2, 1, B.window);
        }
        if (rnd() < 0.3) px(x, bx + Math.floor(w / 2), wallTop - h - 5, 1, 5, col);   // ăng-ten
        bx += w + Math.floor(rnd() * 3);
      }
      return;
    }
    if (B.style === 'lanterns') {
      sky(x, W, wallTop, B.sky);
      // bảng hiệu neon phía xa
      for (let i = 0; i < 5; i++) {
        const sx = 30 + i * 128 + Math.floor(rnd() * 30), sw = 30 + Math.floor(rnd() * 26), col = B.sign[i % B.sign.length];
        px(x, sx, wallTop - 20, sw, 12, '#140a10');
        x.strokeStyle = col; x.lineWidth = 1;
        x.strokeRect(sx + 0.5, wallTop - 19.5, sw - 1, 11);
        for (let k = 0; k < 3; k++) px(x, sx + 4 + k * Math.floor((sw - 8) / 3), wallTop - 16, Math.floor((sw - 8) / 3) - 2, 2, col);
      }
      // 2 dây đèn lồng võng xuống
      for (const [y0, sag] of [[4, 10], [10, 8]]) {
        let li = 0;
        for (let lx = 0; lx <= W; lx += 2) {
          const k = (lx % 160) / 160, yy = Math.round(y0 + Math.sin(k * Math.PI) * sag);
          px(x, lx, yy, 2, 1, B.string);
          if (lx % 20 === 0) {
            const col = B.lantern[li++ % B.lantern.length];
            px(x, lx, yy + 1, 1, 2, B.string);
            disc(x, lx, yy + 6, 3, S().OUT); disc(x, lx, yy + 6, 2, col);
            px(x, lx - 1, yy + 5, 1, 1, '#fff3c0');
            x.globalAlpha = 0.18; disc(x, lx, yy + 6, 6, col); x.globalAlpha = 1;
          }
        }
      }
      return;
    }
    if (B.style === 'harbor') {
      sky(x, W, wallTop, B.sky);
      for (let i = 0; i < 20; i++) px(x, Math.floor(rnd() * W), Math.floor(rnd() * (wallTop - 16)), 1, 1, 'rgba(255,255,255,0.4)');
      px(x, 0, wallTop - 10, W, 10, B.sea);
      for (let i = 0; i < 40; i++) px(x, Math.floor(rnd() * W), wallTop - 9 + Math.floor(rnd() * 8), 2 + Math.floor(rnd() * 3), 1, 'rgba(160,200,255,0.18)');
      // cần cẩu
      for (const cx of [110, 470]) {
        px(x, cx, 0, 3, wallTop - 8, B.crane);
        px(x, cx - 40, 2, 90, 3, B.crane);
        for (let k = cx - 38; k < cx + 48; k += 6) px(x, k, 5, 1, 2, B.crane);
        px(x, cx + 30, 5, 1, 12, B.crane);
        px(x, cx + 27, 17, 7, 4, B.crane);
        px(x, cx + 1, 0, 1, 1, B.light);
      }
      // chồng container phía xa
      for (let i = 0; i < 6; i++) {
        const sx = 200 + i * 22, h = 4 + (i % 3) * 4;
        px(x, sx, wallTop - 10 - h, 20, h, ['#5a2a22', '#223f5a', '#5a4a22'][i % 3]);
      }
      return;
    }
    if (B.style === 'fields') {
      sky(x, W, wallTop, B.sky);
      disc(x, W - 120, wallTop - 14, 10, B.sun);
      x.globalAlpha = 0.25; disc(x, W - 120, wallTop - 14, 17, B.sun); x.globalAlpha = 1;
      // 2 lớp núi xa
      B.hills.forEach((col, li) => {
        for (let hx = 0; hx < W; hx++) {
          const h = Math.round(7 + Math.sin(hx * 0.021 + li * 2) * 4 + Math.sin(hx * 0.057 + li) * 3) + (1 - li) * 5;
          px(x, hx, wallTop - 8 - h, 1, h, col);
        }
      });
      // ruộng lúa + nước lấp lánh
      for (let ry = wallTop - 8; ry < wallTop; ry += 2) for (let rx = 0; rx < W; rx += 3) px(x, rx, ry, 2, 1, B.paddy[Math.floor(rnd() * B.paddy.length)]);
      for (let i = 0; i < 30; i++) px(x, rnd() * W, wallTop - 8 + rnd() * 8, 3, 1, B.water);
      for (let i = 0; i < 5; i++) {
        const bx = 80 + rnd() * 300, by = 5 + rnd() * 10;
        px(x, bx, by, 1, 1, '#5a3a2a'); px(x, bx + 1, by - 1, 1, 1, '#5a3a2a'); px(x, bx + 2, by, 1, 1, '#5a3a2a');
      }
      return;
    }
    if (B.style === 'school') {
      sky(x, W, wallTop, B.sky);
      for (let i = 0; i < 4; i++) {
        const cx = 40 + i * 160 + rnd() * 40, cy = 5 + rnd() * 4;
        disc(x, cx, cy, 4, '#ffffff'); disc(x, cx + 5, cy + 1, 3, '#ffffff'); disc(x, cx - 5, cy + 1, 3, '#ffffff');
      }
      // dãy lớp học 2 tầng: mái ngói, cửa sổ
      const top = 9;
      px(x, 0, top, W, wallTop - top, B.wall);
      px(x, 0, top - 3, W, 4, B.roof);
      px(x, 0, top + 1, W, 1, 'rgba(0,0,0,0.2)');
      px(x, 0, top + 12, W, 1, 'rgba(0,0,0,0.15)');
      for (let row = 0; row < 2; row++) {
        for (let wx = 6; wx < W - 8; wx += 16) {
          const wy = top + 3 + row * 12;
          px(x, wx - 1, wy - 1, 10, 8, B.frame); px(x, wx, wy, 8, 6, B.window);
          px(x, wx, wy, 8, 1, 'rgba(255,255,255,0.35)'); px(x, wx + 4, wy, 1, 6, B.frame);
        }
      }
      // cột cờ
      const fx0 = Math.round(W / 2);
      px(x, fx0, 0, 1, wallTop, '#d9d9d9');
      px(x, fx0 + 1, 1, 10, 6, B.flag); px(x, fx0 + 5, 3, 2, 2, '#ffe14f');
      return;
    }
    if (B.style === 'dark') {
      px(x, 0, 0, W, wallTop, B.bg);
      const grad = x.createLinearGradient(0, 0, 0, wallTop);
      grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, B.haze);
      x.fillStyle = grad; x.fillRect(0, 0, W, wallTop);
      return;
    }
    if (B.style === 'stands') {
      // khán đài tạm dựng bằng giàn giáo
      sky(x, W, wallTop, B.sky);
      for (let ty = 7; ty < wallTop; ty += 6) px(x, 0, ty, W, 6, B.tiers[Math.floor(ty / 6) % 2]);
      px(x, 0, 6, W, 2, B.pole);
      for (let sx = 0; sx < W; sx += 40) {
        px(x, sx, 6, 2, wallTop - 6, B.pole);
        for (let k = 0; k < wallTop - 8; k++) px(x, sx + Math.floor(k * 40 / (wallTop - 8)), 8 + k, 1, 1, 'rgba(106,112,124,0.5)');
      }
      return;
    }
    if (B.style === 'stadium') {
      // khán đài lớn: bậc ghế, lối đi, mái có dải đèn
      for (let ty = 4; ty < wallTop; ty += 6) px(x, 0, ty, W, 6, B.tiers[Math.floor(ty / 6) % 2]);
      for (let ax = 60; ax < W; ax += 90) px(x, ax, 4, 3, wallTop - 4, '#0c1430');
      px(x, 0, 0, W, 4, B.roof);
      for (let lx = 4; lx < W; lx += 10) px(x, lx, 2, 4, 1, B.roofLight);
      return;
    }
    if (B.style === 'screens') {
      px(x, 0, 0, W, wallTop, B.bg);
      // 3 màn LED: thanh equalizer
      for (let i = 0; i < 3; i++) {
        const sx = 60 + i * 190, sw = 140;
        px(x, sx - 2, 2, sw + 4, wallTop - 6, '#000');
        px(x, sx, 4, sw, wallTop - 10, B.screen);
        for (let k = 0; k < 22; k++) {
          const h = 3 + Math.floor(rnd() * (wallTop - 16)), col = B.bars[(k + i) % B.bars.length];
          px(x, sx + 3 + k * 6, wallTop - 7 - h, 4, h, col);
        }
        for (let yy = 4; yy < wallTop - 6; yy += 2) px(x, sx, yy, sw, 1, 'rgba(0,0,0,0.25)');   // scanline
      }
    }
  }

  function lights(x, f, wallTop, W, H, L) {
    const { px } = S();
    if (!L || L.style === 'none') return;
    if (L.style === 'sun') {
      // nắng xiên từ góc trên phải
      const grad = x.createLinearGradient(f.x + f.w, wallTop, f.x, f.y + f.h);
      grad.addColorStop(0, `rgba(${L.glow},0.18)`); grad.addColorStop(1, `rgba(${L.glow},0)`);
      x.fillStyle = grad; x.fillRect(f.x - 16, wallTop, f.w + 32, f.y + f.h + 18 - wallTop);
      return;
    }
    if (L.style === 'spot') {
      // 1 đèn rọi giữa sân: xung quanh tối, chùm sáng hình nón
      const dark = x.createRadialGradient(f.cx, f.cy, 70, f.cx, f.cy, 340);
      dark.addColorStop(0, 'rgba(0,0,0,0)'); dark.addColorStop(1, `rgba(0,0,0,${L.dark || 0.4})`);
      x.fillStyle = dark; x.fillRect(0, wallTop, W, H - wallTop);
      x.fillStyle = `rgba(${L.glow},0.06)`;
      x.beginPath(); x.moveTo(f.cx - 7, 4); x.lineTo(f.cx + 7, 4); x.lineTo(f.cx + 210, f.y + f.h); x.lineTo(f.cx - 210, f.y + f.h); x.closePath(); x.fill();
      const glow = x.createRadialGradient(f.cx, f.cy, 10, f.cx, f.cy, 190);
      glow.addColorStop(0, `rgba(${L.glow},0.12)`); glow.addColorStop(1, `rgba(${L.glow},0)`);
      x.fillStyle = glow; x.fillRect(f.x, f.y, f.w, f.h);
      return;
    }
    if (L.style === 'flood') {
      // cột đèn pha ở góc: quầng sáng trắng phủ sân (dàn đèn vẽ ở fixtures)
      for (const [lx, ly] of floodSpots(W, H, L)) {
        const grad = x.createRadialGradient(lx, ly, 4, lx, ly, 430);
        grad.addColorStop(0, `rgba(${L.glow},0.16)`); grad.addColorStop(1, `rgba(${L.glow},0)`);
        x.fillStyle = grad; x.fillRect(0, 0, W, H);
      }
      return;
    }
    if (L.style === 'neon') {
      px(x, f.x - 16, wallTop, f.w + 32, 2, L.color);
      const grad = x.createLinearGradient(0, wallTop, 0, wallTop + 60);
      grad.addColorStop(0, `rgba(${L.glow},0.22)`);
      grad.addColorStop(1, `rgba(${L.glow},0)`);
      x.fillStyle = grad;
      x.fillRect(f.x - 16, wallTop, f.w + 32, 60);
      return;
    }
    // đèn đường 2 góc
    [f.x + 30, f.x + f.w - 30].forEach((lx) => {
      px(x, lx - 1, wallTop - 34, 3, 34, L.pole);
      px(x, lx - 7, wallTop - 36, 15, 3, L.pole);
      px(x, lx - 6, wallTop - 33, 12, 2, L.lamp);
      const grad = x.createRadialGradient(lx, wallTop - 20, 2, lx, wallTop + 20, 90);
      grad.addColorStop(0, `rgba(${L.glow},0.22)`);
      grad.addColorStop(1, `rgba(${L.glow},0)`);
      x.fillStyle = grad;
      x.fillRect(lx - 100, wallTop - 40, 200, 170);
    });
  }

  function rim(x, X, Y, W, H, R, rnd) {
    const { px } = S();
    px(x, X, Y, W, H, R.base);
    for (let yy = Y; yy < Y + H; yy += 6) {
      for (let xx = X + ((yy / 6) % 2 ? 0 : 4); xx < X + W; xx += 8) px(x, xx, yy, 7, 5, rnd() < 0.5 ? R.light : R.dark);
    }
  }

  function graffiti(x, g, f, wallTop, G, rnd) {
    const { disc } = S();
    if (!G || !G.tags || !G.tags.length) return;
    const t0 = g.teams[0].cfg, t1 = g.teams[1].cfg;
    const cols = G.colors || [t0.kit.shirt, t1.kit.shirt, t0.kit.accent, t1.kit.accent, '#ffffff'];
    const tags = G.tags.map((t) => t.replace('{t0}', t0.short).replace('{t1}', t1.short));
    x.font = '8px ' + SFC_CONFIG.game.render.pixelFont;
    x.textAlign = 'center';
    for (let i = 0; i < 7; i++) {
      const gx = f.x + 50 + (i / 6) * (f.w - 100) + (rnd() - 0.5) * 30;
      const gy = wallTop + 14 + rnd() * 18;
      const col = cols[Math.floor(rnd() * cols.length)];
      if (G.splat) {
        x.globalAlpha = 0.25;
        for (let k = 0; k < 4; k++) disc(x, gx + (rnd() - 0.5) * 30, gy + (rnd() - 0.5) * 8, 3 + Math.floor(rnd() * 5), col);
      }
      x.globalAlpha = 0.8;
      x.fillStyle = '#140c16';
      const tag = tags[i % tags.length];
      x.fillText(tag, gx + 1, gy + 5);
      x.fillStyle = col;
      x.fillText(tag, gx, gy + 4);
      // vệt sơn chảy
      if (G.splat) x.fillRect(gx - 8 + Math.floor(rnd() * 16), gy + 6, 1, 3 + Math.floor(rnd() * 6));
    }
    x.globalAlpha = 1;
  }

  function prop(x, type, X, Y) {
    const { px, disc, OUT } = S();
    switch (type) {
      case 'tire': disc(x, X, Y, 6, OUT); disc(x, X, Y, 5, '#26262c'); disc(x, X, Y, 2, '#111'); break;
      case 'can': px(x, X - 5, Y - 8, 10, 12, OUT); px(x, X - 4, Y - 7, 8, 10, '#4f6a58'); px(x, X - 5, Y - 9, 10, 2, '#6c8a74'); break;
      case 'cone': px(x, X - 3, Y + 2, 7, 2, OUT); px(x, X - 2, Y - 4, 5, 6, '#ff7a1f'); px(x, X - 2, Y - 2, 5, 1, '#fff'); px(x, X - 1, Y - 6, 3, 2, '#ff7a1f'); break;
      case 'crate':
        px(x, X - 6, Y - 8, 12, 11, OUT); px(x, X - 5, Y - 7, 10, 9, '#9a6a3a');
        px(x, X - 5, Y - 3, 10, 1, '#6e4a26'); px(x, X - 1, Y - 7, 1, 9, '#6e4a26'); break;
      case 'barrel':
        px(x, X - 5, Y - 10, 10, 13, OUT); px(x, X - 4, Y - 9, 8, 11, '#2f6fb8');
        px(x, X - 4, Y - 6, 8, 1, '#1a3f6b'); px(x, X - 4, Y - 1, 8, 1, '#1a3f6b'); px(x, X - 3, Y - 9, 1, 11, 'rgba(255,255,255,0.2)'); break;
      case 'lantern':
        px(x, X, Y - 16, 1, 16, '#3a2a20');
        disc(x, X, Y - 16, 4, OUT); disc(x, X, Y - 16, 3, '#ff3d3d'); px(x, X - 1, Y - 17, 1, 1, '#fff3c0');
        x.globalAlpha = 0.2; disc(x, X, Y - 16, 8, '#ff7a3d'); x.globalAlpha = 1; break;
      case 'ac':
        px(x, X - 7, Y - 8, 14, 11, OUT); px(x, X - 6, Y - 7, 12, 9, '#c7ccd6');
        disc(x, X - 1, Y - 3, 3, '#7c8290'); px(x, X - 2, Y - 4, 2, 2, '#c7ccd6'); break;
      case 'bollard':
        px(x, X - 4, Y - 6, 8, 9, OUT); px(x, X - 3, Y - 5, 6, 7, '#2a2f36'); px(x, X - 5, Y - 7, 10, 2, '#3a414a'); px(x, X - 3, Y - 2, 6, 1, '#ffd23f'); break;
      case 'holo':
        px(x, X - 3, Y - 2, 6, 4, OUT); px(x, X - 2, Y - 1, 4, 2, '#3ff6ff');
        x.globalAlpha = 0.35; px(x, X - 4, Y - 16, 8, 14, '#3ff6ff'); x.globalAlpha = 0.7; px(x, X - 2, Y - 12, 4, 1, '#ffffff'); px(x, X - 2, Y - 8, 4, 1, '#ffffff'); x.globalAlpha = 1; break;
      case 'hay':
        disc(x, X, Y - 3, 7, OUT); disc(x, X, Y - 3, 6, '#d9b44a');
        for (let i = -4; i <= 4; i += 2) px(x, X + i, Y - 7 + Math.abs(i) / 2, 1, 5, '#b8922a');
        px(x, X - 3, Y - 8, 6, 1, '#f2d16b'); break;
      case 'sack':
        px(x, X - 4, Y - 8, 9, 11, OUT); px(x, X - 3, Y - 7, 7, 9, '#c9b08a'); px(x, X - 2, Y - 9, 5, 2, '#8a6a44'); px(x, X - 2, Y - 4, 4, 1, '#a88f6a'); break;
      case 'chicken':
        disc(x, X, Y - 3, 4, OUT); disc(x, X, Y - 3, 3, '#ffffff'); disc(x, X + 3, Y - 6, 2, '#ffffff');
        px(x, X + 3, Y - 9, 2, 1, '#e8332e'); px(x, X + 5, Y - 6, 1, 1, '#ffb13d'); px(x, X + 3, Y - 7, 1, 1, '#111');
        px(x, X - 1, Y, 1, 2, '#ffb13d'); px(x, X + 1, Y, 1, 2, '#ffb13d'); px(x, X - 4, Y - 5, 2, 2, '#e8e8e8'); break;
      case 'hoop':
        px(x, X - 1, Y - 18, 2, 20, '#7c8290'); px(x, X - 7, Y - 24, 14, 8, OUT); px(x, X - 6, Y - 23, 12, 6, '#f2f2f2');
        px(x, X - 2, Y - 21, 4, 3, '#ff7a1f'); px(x, X - 3, Y - 17, 6, 1, '#ff7a1f'); break;
      case 'bag':
        px(x, X - 4, Y - 6, 8, 7, OUT); px(x, X - 3, Y - 5, 6, 5, '#3a5a9a'); px(x, X - 2, Y - 7, 4, 1, '#222'); px(x, X - 3, Y - 3, 6, 1, '#ffe14f'); break;
      case 'firebarrel':
        px(x, X - 5, Y - 10, 10, 13, OUT); px(x, X - 4, Y - 9, 8, 11, '#5a3a2a'); px(x, X - 4, Y - 5, 8, 1, '#3a2418');
        disc(x, X, Y - 12, 4, '#ff6a1f'); disc(x, X - 1, Y - 14, 2, '#ffd23f'); px(x, X + 1, Y - 17, 1, 3, '#ff9a3d');
        x.globalAlpha = 0.22; disc(x, X, Y - 12, 12, '#ff7a3d'); x.globalAlpha = 1; break;
      case 'camera':
        px(x, X - 3, Y - 4, 1, 6, '#3a3f48'); px(x, X + 3, Y - 4, 1, 6, '#3a3f48'); px(x, X, Y - 5, 1, 7, '#3a3f48');
        px(x, X - 5, Y - 13, 10, 8, OUT); px(x, X - 4, Y - 12, 8, 6, '#2a2a30'); px(x, X + 4, Y - 11, 3, 4, '#111');
        px(x, X - 3, Y - 11, 1, 1, '#ff3d3d'); px(x, X - 2, Y - 15, 4, 2, '#3a3f48'); break;
      case 'trophy':
        px(x, X - 6, Y - 3, 12, 5, OUT); px(x, X - 5, Y - 2, 10, 3, '#3a2a1a');
        px(x, X - 1, Y - 6, 3, 3, '#e0b030'); px(x, X - 4, Y - 13, 9, 7, '#ffd23f');
        px(x, X - 6, Y - 12, 2, 4, '#e0b030'); px(x, X + 5, Y - 12, 2, 4, '#e0b030'); px(x, X - 3, Y - 12, 1, 4, '#fff6c0');
        x.globalAlpha = 0.25; disc(x, X, Y - 9, 10, '#ffd23f'); x.globalAlpha = 1; break;
      case 'plant':
        px(x, X - 4, Y - 3, 8, 6, OUT); px(x, X - 3, Y - 2, 6, 4, '#a0522d');
        disc(x, X, Y - 7, 5, '#2f8f2a'); disc(x, X - 2, Y - 9, 3, '#4fbf45'); break;
    }
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

  // ảnh sân dựng sẵn (menu Main Path): không cần tạo trận, cache theo arena + 2 đội
  const thumbs = {};
  function thumb(arena, home, away) {
    const key = arena + '|' + home + '|' + away;
    if (thumbs[key]) return thumbs[key];
    const F = SFC_CONFIG.game.field, L = SFC_CONFIG.teams.list;
    const field = Object.assign({}, F, { cx: F.x + F.w / 2, cy: F.y + F.h / 2, gTop: F.y + F.h / 2 - F.goalWidth / 2, gBot: F.y + F.h / 2 + F.goalWidth / 2 });
    const fg = { field, opts: { arena }, teams: [{ cfg: L[home] }, { cfg: L[away] }] };
    const c = build(fg);
    if (SFC.Crowd) SFC.Crowd.drawStatic(c.getContext('2d'), fg);
    return (thumbs[key] = c);
  }

  SFC.Background = { build, vignette, thumb, theme, fixtures };
})();
