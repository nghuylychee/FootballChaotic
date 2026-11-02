/* Art kit · kit.js — hàm vẽ dùng chung cho bộ cảnh (src/render/art), ở lưới px game (1 đơn vị = 1 px game). Gắn vào SFC.Art.Kit.
 * Người, thú, đồ vật đều là hàm thuần (ctx, x, y, spec, opts): cùng tham số -> cùng hình. opts.t = thời gian (giây) để sau này làm chuyển động.
 * Luật màu (docs/art-direction/palette-and-light.md): cảnh không viền đen, viền = màu của chính nó sẫm đi; tối ngả lạnh, sáng ngả ấm;
 * ánh sáng từ sau tường trên lệch trái -> mặt trên sáng nhất, mặt trước tông giữa, bóng đổ xuống dưới lệch phải.
 */
window.SFC = window.SFC || {};

(function () {
  const Art = (SFC.Art = SFC.Art || {});
  const K = (Art.Kit = {});

  // số ngẫu nhiên có hạt giống (mulberry32): cùng hạt -> cùng cảnh
  K.rng = (seed) => {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  K.pick = (rnd, list) => list[Math.floor(rnd() * list.length)];

  K.px = (c, x, y, w, h, col) => {
    if (w <= 0 || h <= 0 || !col) return;
    c.fillStyle = col;
    c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };
  K.dot = (c, x, y, col) => K.px(c, x, y, 1, 1, col);

  /* ---------- màu ---------- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  K.rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const hex2 = (v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
  K.hex = (r, g, b) => '#' + hex2(r) + hex2(g) + hex2(b);
  K.toHsl = (hex) => {
    const [r, g, b] = K.rgb(hex).map((v) => v / 255);
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l * 100];
    const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s * 100, l * 100];
  };
  K.hsl = (h, s, l) => {
    h = ((h % 360) + 360) % 360; s = clamp(s, 0, 100) / 100; l = clamp(l, 0, 100) / 100;
    const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return K.hex(f(0) * 255, f(8) * 255, f(4) * 255);
  };
  K.mix = (a, b, t) => { const A = K.rgb(a), B = K.rgb(b); return K.hex(...A.map((v, i) => v + (B[i] - v) * t)); };
  K.rgba = (hex, a) => { const [r, g, b] = K.rgb(hex); return `rgba(${r},${g},${b},${a})`; };
  // đổi sáng dl (đơn vị L 0..100), ds nhân bão hoà; tối kéo sắc về xanh tím (lạnh), sáng kéo về vàng (ấm)
  K.tone = (hex, dl, ds = 1) => {
    const [h, s, l] = K.toHsl(hex);
    const target = dl < 0 ? 245 : 50, k = Math.min(1, Math.abs(dl) / 40) * (dl < 0 ? 0.3 : 0.22);
    const diff = ((target - h + 540) % 360) - 180;
    return K.hsl(h + diff * (s > 6 ? k : 0), s * ds + (dl < 0 ? 3 : 0), l + dl);
  };
  // dải màu 1 vật: o viền (cùng họ, không đen) · d tối · m gốc · l sáng · h điểm sáng
  K.ramp = (hex) => ({ o: K.tone(hex, -26, 1.05), d: K.tone(hex, -10), m: hex, l: K.tone(hex, 8), h: K.tone(hex, 16, 0.85) });
  const ramps = new Map();
  K.R = (hex) => { if (!ramps.has(hex)) ramps.set(hex, K.ramp(hex)); return ramps.get(hex); };

  /* ---------- hình ---------- */
  // elip đặc theo hàng px (không khử răng cưa)
  K.ellipse = (c, cx, cy, rx, ry, col) => {
    c.fillStyle = col;
    for (let y = -ry; y <= ry; y++) {
      const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / ((ry + 0.5) * (ry + 0.5)))));
      c.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1);
    }
  };
  K.line = (c, x0, y0, x1, y1, col) => {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let e = dx + dy;
    c.fillStyle = col;
    for (;;) {
      c.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * e;
      if (e2 >= dy) { e += dy; x0 += sx; }
      if (e2 <= dx) { e += dx; y0 += sy; }
    }
  };
  // dây võng: từ (x0,y0) tới (x1,y1), chùng sag px ở giữa
  K.sag = (c, x0, y0, x1, y1, sag, col) => {
    const n = Math.max(1, Math.abs(x1 - x0));
    let px0 = x0, py0 = y0;
    for (let i = 1; i <= n; i++) {
      const k = i / n, X = x0 + (x1 - x0) * k, Y = y0 + (y1 - y0) * k + Math.sin(k * Math.PI) * sag;
      K.line(c, px0, py0, X, Y, col);
      px0 = X; py0 = Y;
    }
  };
  // ảnh ký tự: rows = mảng chuỗi, map = { ký tự: màu }; '.' và ' ' trong suốt; flip = lật ngang
  K.art = (c, x, y, rows, map, flip = false) => {
    const w = rows.reduce((m, r) => Math.max(m, r.length), 0);
    for (let j = 0; j < rows.length; j++) {
      const r = rows[j];
      for (let i = 0; i < r.length; i++) {
        const ch = r[i];
        if (ch === '.' || ch === ' ') continue;
        const col = map[ch];
        if (!col) continue;
        c.fillStyle = col;
        c.fillRect(Math.round(x + (flip ? w - 1 - i : i)), Math.round(y + j), 1, 1);
      }
    }
  };

  /* ---------- bóng đổ ---------- */
  // ban ngày: bóng ngắn, xám ấm, đổ xuống dưới lệch phải (luật ánh sáng bước 5)
  K.SHADOW = 'rgba(56,38,40,0.26)';
  K.shadow = (c, x, y, rx, ry = Math.max(1, Math.round(rx / 3)), a = 1) => {
    c.save(); c.globalAlpha *= a;
    K.ellipse(c, x + Math.round(rx * 0.3), y, rx, ry, K.SHADOW);
    c.restore();
  };
  // bóng đổ của khối hộp đứng (nhà, tường): dải đổ dưới chân lệch phải, dài len px
  K.castBox = (c, x, y, w, len, a = 1) => {
    c.save(); c.globalAlpha *= a;
    for (let i = 0; i < len; i++) K.px(c, x + Math.round(i * 0.5) + 1, y + i, w, 1, K.SHADOW);
    c.restore();
  };

  // khối bo 1 góc: viền o quanh, thân m, mép trên sáng l, mép phải + dưới tối d
  K.block = (c, x, y, w, h, R, opt = {}) => {
    const r = opt.round == null ? 1 : opt.round;
    if (opt.outline !== false) {
      K.px(c, x - 1 + r, y - 1, w + 2 - 2 * r, h + 2, R.o);
      K.px(c, x - 1, y - 1 + r, w + 2, h + 2 - 2 * r, R.o);
    }
    K.px(c, x, y, w, h, R.m);
    if (h > 2) K.px(c, x + w - 1, y + 1, 1, h - 1, R.d);
    if (h > 1) K.px(c, x, y + h - 1, w, 1, R.d);
    K.px(c, x, y, w - (w > 2 ? 1 : 0), 1, R.l);
    if (opt.hi && w > 3) K.px(c, x + 1, y, Math.max(1, Math.round(w / 3)), 1, R.h);
  };

  // bóng đổ theo nắng: điểm cao h px trên chân vật rơi xuống dưới h*ky, sang phải h*kx (nắng sau tường trên, lệch trái).
  // blob = bán kính làm tròn (px canvas): bóng là 1 mảng tròn trịa theo dáng to của vật, không theo chi tiết (ngón tay, mắt rào, dây)
  K.LIGHT = { kx: 0.16, ky: 0.21, color: '#2a2038', alpha: 0.38, blob: 3, cut: 96 };
  // draws = danh sách hàm (ctx) => vẽ 1 vật. Mỗi vật vẽ vào lớp tạm, lấy hình đặc (alpha >= 200: bỏ bóng sát chân, dây mờ),
  // chân = hàng đặc thấp nhất, ngả hình quanh chân, làm mờ blob px rồi cắt ở ngưỡng cut (mép cứng, góc tròn, chi tiết mảnh mất),
  // rồi gộp vào 1 lớp bóng; phủ lớp đó 1 lần nên bóng chồng nhau không đậm thêm. Mỗi vật tròn riêng nên bóng 2 vật sát nhau không dính.
  // o: ghi đè LIGHT, clip = [x, y, w, h] chỉ phủ trong vùng này, direct = hàm vẽ thẳng hình bóng đã ngả sẵn (vật có bề sâu như khung thành).
  // w, h = cỡ ctx (đơn vị px thật của canvas)
  K.castShadows = (c, w, h, draws, o = {}) => {
    const L = Object.assign({}, K.LIGHT, o);
    const [sc, sx] = K.canvas(w, h), [tc, tx] = K.canvas(w, h), [pc, pcx] = K.canvas(w, h), [oc, ocx] = K.canvas(w, h), [bc, bcx] = K.canvas(w, h);
    // làm tròn 1 hình bóng (oc) rồi gộp vào lớp bóng
    const blob = () => {
      if (!L.blob) { sx.drawImage(oc, 0, 0); return; }
      bcx.clearRect(0, 0, w, h); bcx.filter = `blur(${L.blob}px)`; bcx.drawImage(oc, 0, 0); bcx.filter = 'none';
      const im = bcx.getImageData(0, 0, w, h), E = im.data;
      for (let i = 3; i < E.length; i += 4) E[i] = E[i] >= L.cut ? 255 : 0;
      bcx.putImageData(im, 0, 0);
      sx.drawImage(bc, 0, 0);
    };
    for (const d of draws) {
      tx.clearRect(0, 0, w, h);
      tx.save(); d(tx); tx.restore();
      const img = tx.getImageData(0, 0, w, h), D = img.data;
      let base = -1;
      for (let i = 3; i < D.length; i += 4) {
        if (D[i] >= 200) { D[i] = 255; base = ((i - 3) / 4 / w) | 0; } else D[i] = 0;
      }
      if (base < 0) continue;
      pcx.putImageData(img, 0, 0);
      ocx.setTransform(1, 0, 0, 1, 0, 0); ocx.clearRect(0, 0, w, h);
      ocx.setTransform(1, 0, -L.kx, -L.ky, L.kx * base, base * (1 + L.ky));
      ocx.drawImage(pc, 0, 0);
      blob();
    }
    for (const d of L.direct || []) { ocx.setTransform(1, 0, 0, 1, 0, 0); ocx.clearRect(0, 0, w, h); ocx.save(); d(ocx); ocx.restore(); blob(); }
    // làm sắc mép (ngả hình làm mép mờ) + tô 1 màu
    const img = sx.getImageData(0, 0, w, h), D = img.data, [r, g, b] = K.rgb(L.color);
    for (let i = 0; i < D.length; i += 4) { const on = D[i + 3] >= 128; D[i] = r; D[i + 1] = g; D[i + 2] = b; D[i + 3] = on ? 255 : 0; }
    sx.putImageData(img, 0, 0);
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
    if (L.clip) { c.beginPath(); c.rect(...L.clip); c.clip(); }
    c.globalAlpha = L.alpha;
    c.drawImage(sc, 0, 0);
    c.restore();
  };

  // viền tối màn hình kiểu Isaac: đúng công thức SFC.Background.vignette của game (độ tối render.vignette), giãn theo cỡ w x h
  K.vignette = (c, w, h, a = SFC_CONFIG.game.render.vignette) => {
    const k = h / SFC_CONFIG.game.render.height;
    const grad = c.createRadialGradient(w / 2, h / 2 + 20 * k, h * 0.35, w / 2, h / 2, w * 0.62);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, `rgba(0,0,0,${a})`);
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = grad; c.fillRect(0, 0, w, h);
    c.restore();
  };

  // chỉnh màu cả cảnh (chỉ sân khấu, không đụng cầu thủ / VFX): bright nhân độ sáng, sat nhân độ bão hoà, contrast giãn quanh xám giữa
  K.grade = (c, w, h, g) => {
    const img = c.getImageData(0, 0, w, h), D = img.data;
    for (let i = 0; i < D.length; i += 4) {
      if (!D[i + 3]) continue;
      const r = D[i], gg = D[i + 1], b = D[i + 2], lum = r * 0.299 + gg * 0.587 + b * 0.114;
      for (let k = 0; k < 3; k++) {
        let v = lum + (D[i + k] - lum) * g.sat;
        v = (v - 128) * g.contrast + 128;
        D[i + k] = Math.max(0, Math.min(255, v * g.bright));
      }
    }
    c.putImageData(img, 0, 0);
  };

  // lớp vẽ ngoài màn hình
  K.canvas = (w, h) => {
    const cv = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
    const c = cv.getContext('2d');
    c.imageSmoothingEnabled = false;
    return [cv, c];
  };
})();
