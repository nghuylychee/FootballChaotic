/* Art scene · village.js — khung mẫu Village (ban ngày, ngoại ô) ở lưới px game 880 x 512 (= vùng 640 x 360 + 120 mỗi bên, 76 trên dưới).
 * 3 lớp tách riêng: background (trời, đường chân trời, ruộng, mặt đất, sân, vạch vôi) · props (tường sân, nhà, cây, đồ vật) · npcs (người, thú).
 * props + npcs là 1 danh sách vật có độ sâu y (chân vật): ghép thì xếp theo y nên người đứng sau rào vẫn bị rào che; xem riêng 1 lớp thì lọc theo L.
 * Village.draw(ctx, { bg, props, npcs, shadows, goals, grade, t }) vẽ lên ctx 880 x 512. Cầu thủ, bóng, khung thành là của game.
 * Trong game (arena village có scene: 'Village', config/arenas.config.js): Renderer vẽ Village.frame() (đủ 880 x 512, vẽ 1 lần) theo khung nhìn,
 * Background.build lấy Village.stage() (cắt đúng màn 640 x 360) cho ảnh sân ở menu, Renderer gọi Village.shadows mỗi khung để vẽ bóng cầu thủ. Ảnh khung mẫu: tools/art-direction/render.mjs, action.mjs.
 */
window.SFC = window.SFC || {};

(function () {
  const Art = (SFC.Art = SFC.Art || {});
  const K = Art.Kit, N = Art.Npc, P = Art.Prop, { px, dot } = K;

  const W = 880, H = 512, OX = 120, OY = 76;
  const G = SFC_CONFIG.game.field;
  // sân ở toạ độ khung 880 x 512
  const F = { x: G.x + OX, y: G.y + OY, w: G.w, h: G.h };
  F.cx = F.x + F.w / 2; F.cy = F.y + F.h / 2;
  const WALL_TOP = F.y - 46, RIM = 16, BOT = F.y + F.h + 18;
  const HORIZON = 58;
  const POND = { x: 62, y: 424, rx: 50, ry: 19 };

  /* ---------- nhiễu cho kết cấu mặt đất ---------- */
  const hash = (x, y, s) => {
    let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const vnoise = (x, y, sc, s) => {
    const X = x / sc, Y = y / sc, xi = Math.floor(X), yi = Math.floor(Y), xf = X - xi, yf = Y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  const sstep = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  const ell = (x, y, cx, cy, rx, ry) => ((x - cx) * (x - cx)) / (rx * rx) + ((y - cy) * (y - cy)) / (ry * ry);

  // mặt đất đất trần (0..1): đường làng, lối vào nhà, sân phơi, gốc đa, mép tường bị dẫm
  const LANE = (x) => 463 + Math.round(2 * Math.sin(x / 57) + Math.sin(x / 23));
  function dirtAt(x, y) {
    let d = 0;
    d = Math.max(d, 1 - sstep(7, 11, Math.abs(y - LANE(x))));
    const pathX = 70 + 7 * Math.sin(y / 31);
    if (y > 196 && y < 460) d = Math.max(d, 1 - sstep(3, 7, Math.abs(x - pathX)));
    d = Math.max(d, 1 - sstep(0.6, 1.2, ell(x, y, 64, 206, 78, 20)));
    d = Math.max(d, 1 - sstep(0.7, 1.15, ell(x, y, 440, 128, 300, 34)));
    d = Math.max(d, 1 - sstep(0.5, 1.1, ell(x, y, 132, 324, 20, 11)));
    d = Math.max(d, 1 - sstep(0.6, 1.2, ell(x, y, 795, 285, 66, 34)));
    d = Math.max(d, 1 - sstep(0.5, 1.2, ell(x, y, 810, 222, 40, 14)));
    // mép ngoài tường sân bị dẫm mòn
    const dx = x < F.x - RIM ? F.x - RIM - x : x > F.x + F.w + RIM ? x - (F.x + F.w + RIM) : 0, dy = y > BOT ? y - BOT : 0;
    if (y > WALL_TOP && (dx || dy)) d = Math.max(d, 0.75 - Math.max(dx, dy) / 14);
    if (y > BOT) d = Math.max(d, 1 - sstep(0.6, 1.1, ell(x, y, 440, 434, 250, 20)));
    d = Math.max(d, 1 - sstep(0.4, 1.2, ell(x, y, 815, 400, 30, 9)) * 0.6);
    return d;
  }

  // các bảng màu mặt đất (rgb): mỗi vùng 1–2 tông phẳng, mép sạch (không nhiễu từng px)
  const C3 = (h) => K.rgb(h);
  const COL = [
    null,
    C3('#69784a'), C3('#73834f'),                  // 1 cỏ · 2 mảng cỏ sáng (xanh ô liu trầm)
    C3('#a88c62'), C3('#b39870'),                  // 3 đất · 4 đất sáng (giữa sân phơi, giữa đường)
    C3('#8a6a44'), C3('#83643f'), C3('#90704a'),   // 5 sân · 6 sân mòn · 7 sân bụi sáng (L 36–43, config village.floor)
    C3('#7a6a48'), C3('#5d8c8a'), C3('#527f82'), C3('#8ab4b0'),   // 8 bờ ao · 9 nước · 10 nước sâu · 11 mép nước loáng trời
    C3('#957a52'),                                  // 12 mép dưới mảng đất
  ];
  const isGrass = (t) => t === 1 || t === 2, isDirt = (t) => t === 3 || t === 4;

  function ground() {
    const [cv, c] = K.canvas(W, H), img = c.createImageData(W, H), D = img.data;
    const T = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (y < 98 + Math.round(4 * vnoise(x, 0, 21, 9))) continue;
      const pe = ell(x, y, POND.x, POND.y, POND.rx, POND.ry) + (vnoise(x, y, 12, 5) - 0.5) * 0.2;
      if (pe < 1) { T[i] = pe > 0.84 ? 8 : pe > 0.74 && y < POND.y ? 11 : pe < 0.42 ? 10 : 9; continue; }
      if (x >= F.x && x < F.x + F.w && y >= F.y && y < F.y + F.h) {
        // 2 khung thành + giữa sân mòn tối hơn, vài mảng bụi sáng
        const worn = Math.exp(-ell(x, y, F.x + 22, F.cy, 36, 46)) + Math.exp(-ell(x, y, F.x + F.w - 22, F.cy, 36, 46)) + Math.exp(-ell(x, y, F.cx, F.cy, 60, 38)) * 0.5;
        const v = vnoise(x, y, 26, 11) * 0.7 + vnoise(x, y, 11, 13) * 0.3 - worn * 0.35;
        T[i] = v < 0.2 ? 6 : v > 0.78 ? 7 : 5;
        continue;
      }
      const d = dirtAt(x, y) + (vnoise(x, y, 18, 3) - 0.5) * 0.22;
      if (d > 0.5) T[i] = d > 0.85 && vnoise(x, y, 14, 4) > 0.55 ? 4 : 3;
      else T[i] = vnoise(x, y, 30, 12) > 0.6 ? 2 : 1;
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      let t = T[i];
      if (!t) continue;
      const below = y + 1 < H ? T[i + W] : 0, below2 = y + 2 < H ? T[i + 2 * W] : 0, above = y > 0 ? T[i - W] : 0;
      // mép trên mảng cỏ sáng / mép trên đất: răng cưa ngọn cỏ 1–2 px
      if (t === 1 && below === 2 && hash(x, y, 5) < 0.45) t = 2;
      else if (t === 1 && below2 === 2 && hash(x, y, 6) < 0.18) t = 2;
      else if (isDirt(t) && isGrass(above) && hash(x, y, 7) < 0.5) t = above;
      else if (isDirt(t) && isGrass(below)) t = 12;
      const col = COL[t], k = i * 4;
      D[k] = col[0]; D[k + 1] = col[1]; D[k + 2] = col[2]; D[k + 3] = 255;
    }
    c.putImageData(img, 0, 0);
    return cv;
  }

  /* ---------- trời, đường chân trời, ruộng ---------- */
  function sky(c, t) {
    const top = K.rgb('#86bfe2'), mid = K.rgb('#b6d8ea'), hor = K.rgb('#e8efe0');
    for (let y = 0; y < HORIZON + 8; y++) {
      const k = y / (HORIZON + 8), a = k < 0.6 ? k / 0.6 : 1, b = k < 0.6 ? 0 : (k - 0.6) / 0.4;
      const col = k < 0.6 ? top.map((v, i) => v + (mid[i] - v) * a) : mid.map((v, i) => v + (hor[i] - v) * b);
      px(c, 0, y, W, 1, K.hex(...col));
    }
    // nắng ấm phía trên trái (mặt trời sau tường trên, lệch trái)
    for (let r = 0; r < 6; r++) { c.save(); c.globalAlpha = 0.05; K.ellipse(c, 250, -30, 200 - r * 28, 70 - r * 10, '#fff4d0'); c.restore(); }
    const drift = Math.round((t || 0) * 2);
    for (const [cx, cy, w, s] of [[80, 16, 54, 1], [292, 9, 40, 2], [520, 22, 64, 3], [736, 12, 46, 4], [860, 30, 30, 5]]) cloud(c, cx + drift, cy, w, s);
  }
  // mây tích: đáy phẳng, bụng xám xanh, đỉnh sáng
  function cloud(c, cx, cy, w, seed) {
    const rnd = K.rng(seed * 97), bumps = [];
    for (let i = 0; i < 6; i++) { const k = i / 5 - 0.5; bumps.push([cx + k * w * 0.8, cy - Math.round((1 - Math.abs(k) * 1.6) * w * 0.12) - Math.floor(rnd() * 3), Math.round(w * (0.12 + rnd() * 0.08))]); }
    for (const [x, y, r] of bumps) K.ellipse(c, x, y + 1, r + 1, Math.round(r * 0.7) + 1, '#cfe0ea');
    for (const [x, y, r] of bumps) K.ellipse(c, x, y, r, Math.round(r * 0.7), '#f6f8f4');
    for (const [x, y, r] of bumps) K.ellipse(c, x - 1, y - Math.round(r * 0.3), Math.max(1, r - 2), Math.max(1, Math.round(r * 0.35)), '#ffffff');
    px(c, cx - w * 0.45, cy + 3, w * 0.9, 2, '#d6e4ec');
    px(c, cx - w * 0.4, cy + 5, w * 0.8, 1, '#c2d6e2');
  }
  // thành phố xa + sân vận động giữa: nhạt nhất màn hình (luật camera 4)
  function skyline(c) {
    const rnd = K.rng(404), base = HORIZON + 1;
    const far = '#bccbd6', near = '#aebfcd', lit = '#c9d6df';
    for (let x = 300; x < 600; ) {
      const w = 5 + Math.floor(rnd() * 10), dc = Math.abs(x - 450) / 150, h = Math.round(6 + rnd() * 18 * (1 - dc * 0.6));
      if (x > 418 && x < 478) { x += w; continue; }
      px(c, x, base - h, w, h, rnd() < 0.5 ? far : near);
      px(c, x, base - h, 1, h, lit);
      for (let wy = base - h + 2; wy < base - 1; wy += 3) for (let wx = x + 2; wx < x + w - 1; wx += 2) if (rnd() < 0.3) dot(c, wx, wy, '#d4dee6');
      if (rnd() < 0.15) px(c, x + 1, base - h - 3, 1, 3, near);
      x += w + (rnd() < 0.2 ? 2 : 0);
    }
    // cần cẩu
    px(c, 360, base - 30, 1, 30, near); px(c, 352, base - 30, 22, 1, near); px(c, 372, base - 29, 1, 5, near);
    // sân vận động: vành bát + 4 cột đèn
    const sx = 448;
    K.ellipse(c, sx, base - 5, 28, 5, near); px(c, sx - 28, base - 5, 57, 5, near);
    K.ellipse(c, sx, base - 9, 26, 3, lit); K.ellipse(c, sx, base - 9, 20, 2, '#a8bac8');
    for (let i = -24; i <= 24; i += 4) px(c, sx + i, base - 5, 1, 4, '#b4c4d0');
    for (const lx of [sx - 30, sx - 16, sx + 16, sx + 30]) { px(c, lx, base - 20, 1, 15, near); px(c, lx - 2, base - 22, 5, 2, lit); }
    // sương mờ chân trời
    c.save(); c.globalAlpha = 0.35; px(c, 0, base - 4, W, 5, '#e6eee6'); c.restore();
  }
  // rặng cây xa + ruộng lúa có bờ, nước loáng trời, hàng mạ
  function fields(c) {
    const rnd = K.rng(505);
    // rặng cây xa (2 lớp, lớp xa nhạt hơn)
    for (const [y0, col, amp, s] of [[HORIZON, '#a9c0a2', 4, 1], [HORIZON + 4, '#93ae84', 5, 2]]) {
      for (let x = 0; x < W; x++) {
        if (s === 1 && x > 300 && x < 600) continue;
        const h = Math.round(amp * (0.5 + 0.5 * Math.sin(x / 7 + s) * Math.sin(x / 19 + s * 2)) + vnoise(x, s, 4, s) * 3);
        px(c, x, y0 - h, 1, h + 6, col);
      }
    }
    // mái nhà làng bên kia đồng
    for (const rx of [40, 128, 690, 790, 850]) { px(c, rx, HORIZON + 4, 9, 3, '#c09a86'); px(c, rx + 1, HORIZON + 7, 7, 2, '#c8c0a8'); }
    // ruộng: các dải thửa, bờ ruộng sáng
    let y = HORIZON + 8;
    while (y < 104) {
      const bh = 6 + Math.floor(rnd() * 4) + Math.floor((y - HORIZON) / 10);
      let x = -Math.floor(rnd() * 30);
      while (x < W) {
        const bw = 40 + Math.floor(rnd() * 80), kind = rnd();
        const haze = Math.max(0, 1 - (y - HORIZON) / 50) * 0.45;
        const hz = (h) => K.mix(h, '#d8e4d8', haze);
        // mỗi thửa 1 màu phẳng + vài hàng lúa kẻ ngang
        const [base, row] = kind < 0.45 ? ['#8fbf52', '#80b048'] : kind < 0.75 ? ['#a6c6c4', '#90b8a8'] : ['#c8bc5c', '#bab050'];
        px(c, x, y, bw, bh, hz(base));
        for (let j = y + 2; j < y + bh - 1; j += 3) px(c, x + 2, j, bw - 4, 1, hz(row));
        // bờ ruộng: dọc + ngang
        px(c, x + bw - 1, y, 2, bh, hz('#b0a878'));
        x += bw + 1;
      }
      px(c, 0, y + bh, W, 1, K.mix('#b8b080', '#d8e4d8', Math.max(0, 1 - (y - HORIZON) / 50) * 0.45));
      y += bh + 1;
    }
  }

  /* ---------- vạch vôi: 2 px, 1 màu kem, thỉnh thoảng đứt 1 px ---------- */
  function lime(c) {
    const rnd = K.rng(606);
    const plot = (x, y) => { if (rnd() > 0.012) px(c, x, y, 1, 1, 'rgba(244,238,216,0.78)'); };
    const hLine = (x0, x1, y) => { for (let x = x0; x <= x1; x++) { plot(x, y); plot(x, y + 1); } };
    const vLine = (x, y0, y1) => { for (let y = y0; y <= y1; y++) { plot(x, y); plot(x + 1, y); } };
    const rect = (x0, y0, w, h) => { hLine(x0, x0 + w - 1, y0); hLine(x0, x0 + w - 1, y0 + h - 2); vLine(x0, y0, y0 + h - 1); vLine(x0 + w - 2, y0, y0 + h - 1); };
    const ring = (cx, cy, r, from = 0, to = Math.PI * 2) => {
      for (let y = Math.floor(cy - r - 2); y <= cy + r + 2; y++) for (let x = Math.floor(cx - r - 2); x <= cx + r + 2; x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (d < r - 1 || d > r + 1) continue;
        let a = Math.atan2(y + 0.5 - cy, x + 0.5 - cx); if (a < 0) a += Math.PI * 2;
        const inArc = from <= to ? a >= from && a <= to : a >= from || a <= to;
        if (inArc) plot(x, y);
      }
    };
    rect(F.x + 2, F.y + 2, F.w - 4, F.h - 4);
    vLine(F.cx - 1, F.y + 3, F.y + F.h - 4);
    ring(F.cx, F.cy, G.centerCircle);
    K.ellipse(c, F.cx, F.cy, 1, 1, 'rgba(244,238,216,0.7)');
    for (const s of [-1, 1]) {
      const gx = s < 0 ? F.x + 3 : F.x + F.w - 3, bw = G.boxWidth, bd = G.boxDepth;
      rect(s < 0 ? gx - 1 : gx - bd - 1, F.cy - bw / 2 - 1, bd + 2, bw + 2);
      rect(s < 0 ? gx - 1 : gx - 22 - 1, F.cy - G.goalWidth / 2 - 10 - 1, 24, G.goalWidth + 22);
      ring(s < 0 ? gx + bd : gx - bd, F.cy, 20, s < 0 ? Math.PI * 1.5 : Math.PI / 2, s < 0 ? Math.PI / 2 : Math.PI * 1.5);
      px(c, gx - s * 44 - 1, F.cy - 1, 2, 2, 'rgba(244,238,216,0.7)');
    }
  }

  // chi tiết trên mặt đất: vết bánh xe, dấu chân, vũng nước, cỏ ven sân, cỏ mọc ở mép sân
  function groundDetail(c) {
    const rnd = K.rng(707);
    // 2 vệt bánh xe liền trên đường làng + 2 vũng nước
    for (let x = 0; x < W; x++) { const y = LANE(x); if (hash(x, 1, 3) < 0.94) { dot(c, x, y - 3, '#957a52'); dot(c, x, y + 3, '#957a52'); } }
    K.ellipse(c, 560, LANE(560) + 1, 8, 2, '#8a7a5a'); K.ellipse(c, 560, LANE(560) + 1, 7, 1, '#8ab0b4'); px(c, 556, LANE(560), 4, 1, '#c0d8dc');
    K.ellipse(c, 250, LANE(250) - 2, 5, 1, '#8a7a5a'); px(c, 248, LANE(250) - 2, 3, 1, '#a8c4c8');
    // sân: vài viên sỏi 2 tông + vệt trượt chân, ít thôi (sân là nền yên tĩnh)
    for (let i = 0; i < 8; i++) { const x = F.x + 12 + rnd() * (F.w - 24), y = F.y + 12 + rnd() * (F.h - 24); px(c, x, y, 2, 1, '#a48a66'); px(c, x, y + 1, 2, 1, '#6e5436'); }
    for (let i = 0; i < 3; i++) { const x = F.x + 40 + rnd() * (F.w - 80), y = F.y + 20 + rnd() * (F.h - 40); px(c, x, y, 4 + Math.floor(rnd() * 4), 1, '#83643f'); }
    // sỏi trên đất ngoài sân
    for (let i = 0; i < 200; i++) {
      const x = Math.floor(rnd() * W), y = 100 + Math.floor(rnd() * (H - 100));
      if (dirtAt(x, y) < 0.8 || (x > F.x - RIM - 2 && x < F.x + F.w + RIM + 2 && y > WALL_TOP && y < BOT + 3)) continue;
      if (rnd() < 0.25) { px(c, x, y, 2, 1, '#c4ae88'); px(c, x, y + 1, 2, 1, '#957a52'); }
    }
    // cỏ mọc thành khóm ở mép sân, dày ở 4 góc
    for (let i = 0; i < 24; i++) {
      const edge = i % 4, k = rnd(), corner = rnd() < 0.4;
      const kk = corner ? (rnd() < 0.5 ? rnd() * 0.08 : 1 - rnd() * 0.08) : k;
      let x, y;
      if (edge === 0) { x = F.x + kk * F.w; y = F.y + 4 + rnd() * 4; }
      else if (edge === 1) { x = F.x + kk * F.w; y = F.y + F.h - 2 - rnd() * 3; }
      else if (edge === 2) { x = F.x + 3 + rnd() * 4; y = F.y + 6 + kk * (F.h - 8); }
      else { x = F.x + F.w - 6 - rnd() * 4; y = F.y + 6 + kk * (F.h - 8); }
      P.tuft(c, Math.round(x), Math.round(y), { kind: i % 3, color: '#6a7a46' });
    }
    // ngoài sân: khóm cỏ đi thành cụm 2–4, cụm hoa trắng / vàng 2–3 bông
    const free = (x, y) => !(x > F.x - RIM - 4 && x < F.x + F.w + RIM + 4 && y > WALL_TOP - 4 && y < BOT + 6) && dirtAt(x, y) < 0.4 && ell(x, y, POND.x, POND.y, POND.rx + 4, POND.ry + 4) > 1 && y > 104;
    for (let i = 0; i < 55; i++) {
      const cx = Math.floor(rnd() * W), cy = 104 + Math.floor(rnd() * (H - 104)), n = 2 + Math.floor(rnd() * 3);
      for (let j = 0; j < n; j++) { const x = cx + Math.round((rnd() - 0.5) * 12), y = cy + Math.round((rnd() - 0.5) * 6); if (free(x, y)) P.tuft(c, x, y, { kind: Math.floor(rnd() * 3) }); }
    }
    for (let i = 0; i < 10; i++) {
      const cx = Math.floor(rnd() * W), cy = 104 + Math.floor(rnd() * (H - 104)), col = K.pick(rnd, ['#f4f0e0', '#f4f0e0', '#f0d860', '#f0b8c0']);
      for (let j = 0; j < 2 + Math.floor(rnd() * 2); j++) {
        const x = cx + Math.round((rnd() - 0.5) * 10), y = cy + Math.round((rnd() - 0.5) * 6);
        if (free(x, y)) K.art(c, x - 1, y - 1, ['.w.', 'wyw', '.w.'], { w: col, y: col === '#f0d860' ? '#c89030' : '#e8c040' });
      }
    }
  }

  /* ---------- danh sách vật (props + npcs) ---------- */
  const C = N.cast;
  const v = (s, o) => Object.assign({}, C[s], o || {});
  function items(t) {
    const L = [];
    // o.flat: vật nằm sát đất (nia, bạt, viền tường, dây điện, chim bay) không đổ bóng dài
    const prop = (y, d, o) => L.push(Object.assign({ L: 'props', y, d }, o));
    const npc = (y, d, o) => L.push(Object.assign({ L: 'npcs', y, d }, o));
    const FLAT = { flat: true };
    const person = (x, y, spec, o) => npc(y, (c) => N.person(c, x, y, spec, Object.assign({ t }, o)));

    /* --- sau tường trên: tre xa, nhà, sân trong, hàng xóm sau rào --- */
    for (const [x, y, n, h, s] of [[176, 102, 8, 50, 1], [372, 101, 9, 54, 3], [686, 102, 9, 56, 5], [28, 100, 8, 52, 7], [836, 100, 9, 54, 9]])
      prop(y, (c) => P.bamboo(c, x, y, { n, h, seed: s, far: 0.32, t }));
    const poleTops = [];
    prop(108, (c) => { poleTops[0] = P.powerPole(c, 170, 108, { h: 62 }); });
    prop(108, (c) => { poleTops[1] = P.powerPole(c, 708, 108, { h: 62 }); });
    prop(104, (c) => P.house(c, 204, 106, { w: 118, seed: 31, wall: '#dcc47e', roof: '#b25a3c', door: '#4a6a68', antenna: 96, calendar: true }));
    prop(104, (c) => P.house(c, 566, 106, { w: 112, seed: 32, wall: '#d6cfa8', roof: '#a85a40', door: '#7a4a36', windows: 2, doorOff: -8 }));
    prop(108, (c) => P.areca(c, 546, 108, { h: 66, bend: 3, t }));
    prop(110, (c) => P.banana(c, 338, 110, { h: 18, seed: 12, size: 0.9 }));
    prop(112, (c) => P.haystack(c, 356, 112, { r: 11, seed: 2 }));
    prop(113, (c) => P.clothesline(c, 380, 116, 450, { t, items: ['#c8574a', '#e8e0d0', '#5a7ab0', '#d8b848'] }));
    // dây điện vắt qua trời
    prop(109, (c) => {
      const A = poleTops[0], B = poleTops[1];
      if (!A || !B) return;
      // 1 đường dây chính giữa 2 cột (mảnh, nhạt để không che chân trời) + dây ra 2 mép khung
      K.sag(c, A[1][0], A[1][1], B[0][0], B[0][1], 10, 'rgba(46,42,44,0.4)');
      K.sag(c, 0, 64, A[0][0], A[0][1], 4, 'rgba(46,42,44,0.45)');
      K.sag(c, B[1][0], B[1][1], 880, 70, 5, 'rgba(46,42,44,0.45)');
    }, FLAT);
    npc(120, (c) => N.hen(c, 640, 122, { t, pose: 'walk', face: 'left', color: '#c8a070' }));
    person(426, 120, v('grandma'), { face: 'front', pose: 'hold', item: 'cup' });
    // hàng xóm sát rào (chân bị chân tường che): tì rào, cổ vũ, đứng xem
    // người lớn đứng chân ở 146 (thân lộ trên chân tường 142), trẻ con đứng trên bậc đá nên cao hơn
    person(212, 146, v('grandpa'), { face: 'front', pose: 'rest' });
    person(276, 146, v('mother'), { face: 'front', pose: 'hold', item: 'fan' });
    person(362, 146, v('farmer'), { face: 'front', pose: 'cross' });
    person(402, 140, v('girl'), { face: 'front', pose: 'wave' });
    person(534, 146, v('uncle'), { face: 'front', pose: 'hips' });
    person(644, 140, v('girl2'), { face: 'front', pose: 'point' });
    person(682, 146, v('teenG'), { face: 'front', pose: 'hold', item: 'phone' });

    /* --- tường sân --- */
    prop(156, (c) => P.topWall(c, F.x - RIM, F.y, F.w + 2 * RIM, 46, { seed: 21 }));
    prop(157, (c) => P.wallShadowTop(c, F.x, F.y, F.w, 7), FLAT);
    prop(F.y + F.h, (c) => {
      // viền 2 bên nhìn từ trên + bóng viền trái đổ vào sân, viền phải đổ ra ngoài
      P.lateriteTop(c, F.x - RIM, F.y, RIM, F.h + 4, { seed: 13 });
      P.lateriteTop(c, F.x + F.w, F.y, RIM, F.h + 4, { seed: 14 });
      for (let i = 0; i < 3; i++) { px(c, F.x + i, F.y + 7, 1, F.h - 7, `rgba(52,34,30,${(0.22 - i * 0.07).toFixed(2)})`); px(c, F.x + F.w + RIM + i, F.y + 2, 1, F.h + 18, `rgba(52,34,30,${(0.24 - i * 0.07).toFixed(2)})`); }
      px(c, F.x + F.w - 1, F.y, 1, F.h, 'rgba(52,34,30,0.18)');
    }, FLAT);
    prop(BOT, (c) => {
      // tường dưới: mũ tường nhìn từ trên + mặt ngoài quay về camera + bóng chân tường
      P.lateriteTop(c, F.x - RIM, F.y + F.h, F.w + 2 * RIM, 5, { seed: 15 });
      P.lateriteFace(c, F.x - RIM, BOT, F.w + 2 * RIM, 14, { seed: 16 });
      for (let i = 0; i < 4; i++) px(c, F.x - RIM + 2 + i, BOT + i, F.w + 2 * RIM, 1, `rgba(52,34,30,${(0.3 - i * 0.07).toFixed(2)})`);
      for (let i = 0; i < 3; i++) px(c, F.x + F.w + RIM + i, BOT - 14 + i, 1, 14, `rgba(52,34,30,${(0.24 - i * 0.07).toFixed(2)})`);
    });
    // gà trống đậu trên viền trái
    npc(F.y + 140, (c) => N.rooster(c, F.x - 8, F.y + 140, { t, face: 'right' }));

    /* --- lề trái: nhà, vườn rau, giếng, ao --- */
    prop(98, (c) => P.bamboo(c, 140, 136, { n: 7, h: 46, seed: 12, t }));
    prop(194, (c) => P.house(c, 8, 196, { w: 112, seed: 33, wall: '#e0c070', roof: '#b4603e', door: '#5a5a7a', windows: 1, doorOff: 14, pillars: [9, 117], bulb: true }));
    prop(200, (c) => P.jar(c, 130, 200));
    person(36, 204, v('grandpa', { hat: null }), { face: 'front', pose: 'sit', seat: '#3a7ac0' });
    prop(203, (c) => P.teaTable(c, 52, 204));
    prop(232, (c) => P.clothesline(c, 82, 234, 146, { t }));
    prop(236, (c) => P.haystack(c, 24, 238, { r: 13, seed: 4 }));
    for (let i = 0; i < 3; i++) prop(258 + i * 10, (c) => P.vegBed(c, 8, 254 + i * 10, { w: 92, seed: 20 + i, leaf: i % 2 ? '#6aa848' : '#5a9a3e' }));
    prop(292, (c) => P.trellis(c, 108, 292, { w: 40, h: 22, seed: 7 }));
    person(46, 280, v('farmerW', { top: '#9a6a52' }), { face: 'front', pose: 'squat' });
    prop(324, (c) => P.well(c, 132, 324));
    person(112, 326, v('vendor', { hat: null, hairStyle: 'bun', top: '#8a6a9a' }), { face: 'right', pose: 'hold' });
    npc(306, (c) => N.hen(c, 58, 306, { t, pose: 'peck', seed: 2 }));
    // góc chuồng gà + chuối sau vườn
    prop(358, (c) => P.coop(c, 30, 360));
    prop(332, (c) => P.banana(c, 12, 334, { h: 22, seed: 5, flower: true }));
    // ao: cầu ao, bèo, sậy, vịt bơi, người giặt
    prop(402, (c) => P.jetty(c, 88, 402, { len: 18 }), FLAT);
    person(96, 418, v('mother', { top: '#c8a8b8', topStyle: 'aobaba' }), { face: 'left', pose: 'squat' });
    for (const [x, y, s] of [[20, 420, 1], [108, 432, 2]]) prop(y, (c) => P.reeds(c, x, y, { seed: s, n: 5 + s, t }));
    for (const [x, y, s] of [[44, 418, 1], [76, 434, 2]]) prop(y - 6, (c) => P.hyacinth(c, x, y, { seed: s, flower: s !== 2 }), FLAT);
    for (const [x, y, s, f, hd] of [[54, 424, 1, 'right', '#3c6a4a'], [68, 428, 2, 'right', null]]) npc(y, (c) => N.duck(c, x, y, { t, pose: 'swim', seed: s, face: f, head: hd }));

    /* --- lề phải: đa + miếu, sân phơi, trâu, đồ đá bóng --- */
    prop(214, (c) => P.banyan(c, 818, 216, { seed: 51, t }));
    prop(224, (c) => P.shrine(c, 788, 226, { t }));
    prop(258, (c) => P.tarp(c, 736, 258, { w: 58, h: 28 }), FLAT);
    prop(270, (c) => P.tray(c, 830, 272, { r: 11, content: 'rice', seed: 1 }), FLAT);
    prop(286, (c) => P.tray(c, 856, 290, { r: 10, content: 'chili', seed: 2 }), FLAT);
    person(808, 296, v('farmerW', { top: '#6a7a8a' }), { face: 'left', pose: 'rake' });
    npc(284, (c) => N.hen(c, 760, 284, { t, pose: 'peck', seed: 4, face: 'right' }));
    prop(336, (c) => P.scoreboard(c, 744, 338, { text: '2-1' }));
    prop(358, (c) => P.cooler(c, 734, 362));
    person(742, 392, v('youth', { top: '#5a8a5a', topStyle: 'shirt' }), { face: 'left', pose: 'hips' });
    prop(340, (c) => P.haystack(c, 862, 344, { r: 13, seed: 6 }));
    prop(318, (c) => P.bush(c, 874, 320, { r: 7, seed: 15 }));
    prop(250, (c) => P.banana(c, 870, 256, { h: 20, seed: 13 }));
    npc(398, (c) => N.buffalo(c, 822, 400, { t, pose: 'graze', face: 'left' }));
    npc(399, (c) => N.person(c, 826, 392, v('boy2', { hat: 'non', hatColor: '#e8d7a4' }), { t, face: 'left', pose: 'sit' }));

    /* --- lề dưới: người xem ngồi quay lưng, đường làng, cận cảnh --- */
    const backRow = [[224, 'boy', 'sit', '#c8473c'], [268, 'grandma', 'sit', '#3a7ac0'], [300, 'girl', 'cheer'], [520, 'youth', 'stand'], [566, 'teenG', 'cheer'], [646, 'boy2', 'cheer'], [672, 'farmerW', 'cross']];
    for (const [x, who, pose, seat] of backRow) person(x, who === 'boy' || who === 'girl' || who === 'girl2' || who === 'boy2' ? 436 : 440, v(who), { face: 'back', pose, seat });
    prop(442, (c) => P.flipflops(c, 340, 444), FLAT);
    prop(446, (c) => P.scooter(c, 836, 452, { face: 'left', crate: true }));
    person(400, 468, v('farmer', { top: '#4a6a8a' }), { face: 'right', pose: 'ride' });
    prop(467, (c) => P.bike(c, 403, 468, { face: 'right', basket: true, color: '#2a4a5a', t }));
    person(472, 470, v('vendor'), { face: 'left', pose: 'pole' });
    for (let i = 0; i < 4; i++) npc(468 + (i & 1), (c) => N.duck(c, 590 + i * 10, 468 + (i & 1), { t: t + i * 0.13, pose: 'walk', face: 'left', color: i === 2 ? '#e8e4d8' : '#a88458', head: i === 0 ? '#3c6a4a' : null }));
    // hàng rào dâm bụt dọc mép dưới đường làng, có chỗ hở làm lối đi
    for (const [x0, x1, s] of [[0, 120, 1], [150, 290, 2], [330, 470, 3], [610, 760, 4], [790, 880, 5]]) prop(484, (c) => P.hedge(c, x0, 484, x1 - x0, { seed: s }));
    prop(486, (c) => P.bush(c, 300, 488, { r: 7, seed: 9 }));
    prop(490, (c) => P.bush(c, 560, 494, { r: 9, seed: 10, flowers: '#e8e0b0' }));
    prop(500, (c) => P.bush(c, 760, 500, { r: 8, seed: 11 }));
    prop(508, (c) => P.banana(c, 14, 516, { h: 26, seed: 8 }));
    prop(509, (c) => P.banana(c, 186, 520, { h: 22, seed: 9 }));
    prop(512, (c) => P.areca(c, 866, 512, { h: 96, bend: -3, t }));
    npc(30, (c) => { N.bird(c, 226, 24, { t }); N.bird(c, 236, 28, { t, seed: 0.3 }); }, FLAT);
    for (const [x, y, s] of [[148, 96, 2], [776, 88, 3]]) npc(y, (c) => N.egret(c, x, y, { t, pose: 'feed', seed: s, face: s & 1 ? 'left' : 'right' }));
    person(86, 100, v('farmer'), { face: 'right', pose: 'bend' });
    return L;
  }

  let groundCv = null;
  function background(c, t) {
    sky(c, t);
    skyline(c);
    fields(c);
    if (!groundCv) groundCv = ground();
    c.drawImage(groundCv, 0, 0);
    groundDetail(c);
    lime(c);
  }

  // chỉnh màu sân khấu: tối hơn ~22%, bớt bão hoà, tương phản nhích lên cho khỏi đục
  const Village = (Art.Village = { W, H, OX, OY, F, GRADE: { bright: 0.78, sat: 0.82, contrast: 1.08 } });
  Village.draw = function (c, o = {}) {
    const t = o.t || 0;
    c.imageSmoothingEnabled = false;
    if (o.bg !== false) background(c, t);
    const list = items(t).map((it, i) => Object.assign(it, { i })).sort((a, b) => a.y - b.y || a.i - b.i)
      .filter((it) => !(it.L === 'props' && o.props === false) && !(it.L === 'npcs' && o.npcs === false));
    // bóng của mọi vật đứng + khung thành: 1 lớp gộp, nằm trên mặt đất, dưới mọi vật
    if (o.shadows !== false) K.castShadows(c, W, H, list.filter((it) => !it.flat).map((it) => it.d), { direct: o.goals !== false ? Village.goalShadows(1) : [] });
    for (const it of list) { c.save(); it.d(c); c.restore(); }
    // sân khấu tối và trầm hơn để trận đấu (cầu thủ, VFX) là thứ sáng nhất màn hình
    if (o.grade !== false) K.grade(c, W, H, Village.GRADE);
  };

  // bóng khung thành: hộp có bề sâu (khung trước cao goalHeight, khung sau 55%) -> ngả từng điểm theo độ cao của nó,
  // khung = nét đặc, lưới = mắt lưới thưa. Trả về 2 hàm vẽ thẳng hình bóng (castShadows direct) ở toạ độ khung, phóng s lần
  Village.goalShadows = (s = 1) => [-1, 1].map((side) => (c) => {
    c.setTransform(s, 0, 0, s, 0, 0);
    const L = K.LIGHT, Hg = G.goalHeight, D = G.goalDepth, HB = Math.round(Hg * 0.55), lx = side < 0 ? F.x : F.x + F.w;
    const top = F.cy - G.goalWidth / 2, bot = F.cy + G.goalWidth / 2;
    const at = (x, y, h) => [x + L.kx * h, y + L.ky * h];
    c.fillStyle = '#000';
    for (let k = 0; k <= D; k++) {
      const h = Hg - ((Hg - HB) * k) / D, X = lx + side * k;
      for (let y = top; y <= bot; y++) if (((y + k) & 3) === 0 || ((y - k) & 3) === 0) { const [sx, sy] = at(X, y, h); c.fillRect(Math.round(sx), Math.round(sy), 1, 1); }
    }
    const seg = (a, b) => K.line(c, a[0], a[1], b[0], b[1], '#000');
    seg(at(lx, top, Hg), at(lx, bot, Hg));
    for (const gy of [top, bot]) { seg([lx, gy], at(lx, gy, Hg)); seg(at(lx, gy, Hg), at(lx + side * D, gy, HB)); }
    seg(at(lx + side * D, top, HB), at(lx + side * D, bot, HB));
  });

  // khung đủ lớp 880 x 512 cho game, vẽ 1 lần (cảnh đứng yên ở t cố định). Renderer vẽ thẳng ảnh này ở (-OX, -OY) cho khung nhìn rộng
  let frameCv = null;
  Village.frame = () => {
    if (!frameCv) { const [fc, fx] = K.canvas(W, H); Village.draw(fx, { t: 0.4 }); frameCv = fc; }
    return frameCv;
  };
  // sân khấu cắt đúng màn 640 x 360 (Background.build: ảnh sân ở menu, xem trước). Mỗi lần gọi trả 1 canvas mới (bản sao)
  // để nơi dùng có vẽ thêm cũng không bẩn bản gốc
  Village.stage = () => {
    const RW = SFC_CONFIG.game.render.width, RH = SFC_CONFIG.game.render.height;
    const c = document.createElement('canvas');
    c.width = RW; c.height = RH;
    c.getContext('2d').drawImage(Village.frame(), OX, OY, RW, RH, 0, 0, RW, RH);
    return c;
  };

  // bóng cầu thủ trong trận (gọi mỗi khung, toạ độ màn game): 1 vệt tròn dẹt ngả xuống dưới lệch phải như bóng cảnh,
  // vẽ bằng elip (rẻ) thay vì ngả hình từng khung. Đổi theo trạng thái như bóng của sprite (PlayerSprite.groundShadow): bật nhảy / bay
  // thì nhỏ lại và ngả xa hơn theo độ cao, nằm thì thành elip dưới cả thân, thủ môn bay đổ người thì dài theo thân.
  // Người tàng hình không có bóng; người bị vật thể Tuyệt kỹ thay hình (VFX.hides: con gà, King Kong...) lấy bóng của vật thể đó.
  // Bóng cầu thủ đen như bóng sprite cũ (không màu tím của bóng cảnh) và bám sát chân (user 2026-11-03): tâm bóng ngả theo nắng từ độ cao lift
  // (thay vì giữa thân), bay / nhảy thì ngả thêm drift x độ cao
  // Vẽ vào 1 lớp đệm 880 x 512 ở lưới px game rồi chép 1 lần lấy mẫu điểm gần nhất: camera zoom lẻ (goalCam, VFX.applyZoom) thì fillRect
  // thẳng lên màn sẽ khử răng cưa mép bóng; chép ảnh thì px vẫn sắc như sprite / cảnh. Cả lớp phủ 1 độ mờ nên 2 bóng chồng nhau không đậm thêm
  const PSH = { color: '#000000', alpha: 0.38, lift: 6, drift: 0.6 };
  let shBuf = null;
  Village.shadows = (screen, g) => {
    const L = K.LIGHT, Sp = SFC.PlayerSprite;
    if (!shBuf) shBuf = K.canvas(W, H);
    const [bufCv, ctx] = shBuf;
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(OX, OY);
    for (const p of g.players) {
      if (p.ghostT > 0 || (SFC.VFX && SFC.VFX.hides(g, p))) continue;
      const m = p.sizeMul || 1, s = Sp && Sp.groundShadow ? Sp.groundShadow(p, g) : { k: 1, z: 0 };
      if (s.lie) {
        // thân nằm sát đất: bóng ngay dưới thân
        K.ellipse(ctx, p.x + s.lie.dx, p.y + s.lie.dy, Math.round(s.lie.rx * m), Math.round(s.lie.ry * m), PSH.color);
        continue;
      }
      const h = PSH.lift * m + (s.z || 0) * PSH.drift, x = p.x + Math.round(L.kx * h), y = p.y + Math.round(L.ky * h);
      // thủ môn đang bay đổ người: elip riêng theo thân (đơn vị bóng sprite, bán trục ngang đứng = 7) quy về bóng cảnh (đứng = 5)
      if (s.rx) { K.ellipse(ctx, x, y, Math.max(1, Math.round((s.rx * 5) / 7 * m)), Math.max(2, Math.round(s.ry * m)), PSH.color); continue; }
      const k = s.k == null ? 1 : s.k;
      K.ellipse(ctx, x, y, Math.max(1, Math.round(5 * m * k * (s.wide || 1))), Math.max(1, Math.round(Math.max(2, L.ky * 24 * m * 0.5) * k)), PSH.color);
    }
    ctx.restore();
    screen.save();
    screen.imageSmoothingEnabled = false;
    screen.globalAlpha = PSH.alpha;
    screen.drawImage(bufCv, -OX, -OY);
    screen.restore();
  };
})();
