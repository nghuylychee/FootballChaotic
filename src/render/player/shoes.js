/* PlayerSprite · shoes.js — Giày (slot shoes, 20 món; kicks = giày trắng mặc định, không qua đây) cho mọi tư thế chân.
 * Chân nào cũng tô bằng bảng màu O (tất) · G (giày) · g (đế) · J (da ống chân) nên giày chỉ cần thay 4 màu đó là có ở đứng, chạy, đá, sút, đánh đầu,
 * đổ người, bị đá bay, ăn mừng. Màu có thể là "đối tượng vẽ" { base, paint } (base.js fill()): tô từng px mịn trong ô theo mẫu (dây giày, sọc, rằn ri,
 * chấm sáng), chọn màu theo chân phải / trái của cầu thủ (giày lệch màu, cầu vồng). Đế (g) ghi lại chỗ đã tô -> cuối draw() vẽ đồ dưới đế / quanh giày
 * (bánh xe, đinh, đế gỗ, phản lực, lửa, quầng sáng, lấp lánh, hơi lạnh) đúng chỗ bàn chân ở mọi tư thế.
 * Nạp theo thứ tự trong scripts/manifest.js (classic script, không module): mỗi file gắn hàm vào SFC.PlayerSprite.
 */
window.SFC = window.SFC || {};

(function () {
  const Sprite = (SFC.PlayerSprite = SFC.PlayerSprite || {});
  const { INK, shade } = Sprite;
  // trạng thái của lần draw() đang chạy (đồng bộ, 1 người 1 lúc): gốc X, chân phải ở cột trái màn hình?, anim, các chữ nhật đế đã tô
  let C = null;
  function shoeBegin(X, o, rightOnL) { C = { X, rightOnL, anim: o.anim || 0, soles: [], st: STYLES[o.shoes] || null }; }
  const right = (x) => (x < C.X) === C.rightOnL;   // px mịn x thuộc chân phải của cầu thủ
  const hash = (x, y) => (((x * 73856093) ^ (y * 19349663)) >>> 0);
  // đối tượng vẽ: fn(i, j, x, y) -> màu của px mịn (i, j = vị trí trong ô 2 x 2 của lưới thế giới; ô px mịn lẻ thì theo chẵn / lẻ của x, y), null = base
  function pat(base, fn) {
    return {
      base,
      paint(ctx, x, y, w, h) {
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
          const ax = x + i, ay = y + j, li = w === 1 ? ax & 1 : i, lj = h === 1 ? ay & 1 : j;
          ctx.fillStyle = fn(li, lj, ax, ay) || base; ctx.fillRect(ax, ay, 1, 1);
        }
      },
    };
  }
  // đế: ghi lại chữ nhật đã tô (đồ dưới đế cần biết bàn chân nằm đâu)
  function rec(c) {
    const p = typeof c === 'object' ? c : pat(c, () => null);
    return { base: p.base, paint(ctx, x, y, w, h) { p.paint(ctx, x, y, w, h); if (C) C.soles.push([x, y, w, h]); } };
  }
  const RAINBOW = ['#ff3d5a', '#ff8a3f', '#ffe14f', '#6bff4f', '#3ff6ff', '#9d7bff'];
  const add = (ctx, f) => { ctx.globalCompositeOperation = 'lighter'; f(); ctx.globalCompositeOperation = 'source-over'; };
  const dot = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

  // mỗi kiểu: pal(o) -> { O, G, g, J } (màu hoặc đối tượng vẽ, thiếu = giữ mặc định) · addon(ctx, foot, k): vẽ quanh 1 bàn chân
  // foot = { x0, x1, y0, y1 } (px mịn, khung đế đã tô; y1 = mép dưới đế, ngay dưới là hàng viền), flat = đế nằm ngang (bàn chân trên đất / ngang)
  const STYLES = {
    // dép lê: lộ cổ chân + ngón chân, quai xanh vắt ngang mu (hàng trên của giày), ngón chân có khe tối, đế xanh
    slides: { pal: (o) => ({ O: o.skin, G: pat(o.skin, (i, j) => (j === 0 ? '#3b82f6' : i === 1 ? shade(o.skin, 0.2) : null)), g: '#2d5bd1' }) },
    // giày đỏ: chấm dây giày trắng, góc dưới tối, đế trắng viền xám
    reds: { pal: () => ({ G: pat('#d7263d', (i, j) => (j === 0 && i === 0 ? '#ffffff' : j === 1 && i === 1 ? '#a51c30' : null)), g: pat('#f2f2f2', (i, j) => (j === 1 ? '#c9ced8' : null)) }) },
    // giày vải xanh: dây trắng ở hàng trên, góc dưới tối, đế cao su trắng mép xám (đế sọc xanh trông như tất sọc)
    canvas: { pal: () => ({ G: pat('#2f6fd1', (i, j) => (j === 0 && i === 1 ? '#ffffff' : j === 1 && i === 0 ? '#2459ab' : null)), g: pat('#ffffff', (i, j) => (j === 1 ? '#d5dae4' : null)) }) },
    // ủng da nâu cao cổ: phủ cả ống chân, mép cổ ủng sáng, dây buộc kem ở cổ chân, đế sẫm
    boots: { pal: () => ({ J: pat('#6b4423', (i, j) => (j === 0 ? '#8a5a30' : null)), O: pat('#6b4423', (i, j) => (j === 0 && i === 0 ? '#e8d3a0' : null)),
      G: pat('#6b4423', (i, j) => (i === 0 && j === 0 ? '#8a5a30' : null)), g: '#2e1a0e' }) },
    // chân trần: tất / giày thành da, khe ngón chân tối, lòng bàn chân hơi sẫm
    barefoot: { pal: (o) => ({ O: o.skin, G: pat(o.skin, (i, j) => (j === 1 && i === 1 ? shade(o.skin, 0.28) : null)), g: shade(o.skin, 0.14) }) },
    // ủng mưa vàng: phủ ống chân, viền cổ ủng sẫm ở mép trên (chấm sáng từng ô trông như bàn cờ), đế nâu vàng
    rainboot: { pal: () => ({ J: pat('#ffd23f', (i, j) => (j === 0 ? '#e0a820' : null)), O: '#ffd23f', G: '#ffd23f', g: '#9a6a10' }) },
    // tất ống cao sọc: kéo lên ống chân, sọc trắng / đỏ xen kẽ từng px (đứng không có hàng ống chân: cổ chân đỏ trên trắng dưới), giày đen đế xám
    socks: { pal: () => ({ J: pat('#f0f0f0', (i, j) => (j === 1 ? '#d7263d' : null)), O: pat('#d7263d', (i, j) => (j === 1 ? '#f0f0f0' : null)),
      G: pat('#1a1216', (i, j) => (j === 0 && i === 0 ? '#4a4f63' : null)), g: '#5a6075' }) },
    // giày cổ cao đen: cổ giày đen phủ cổ chân (mép đệm xám), thân đen, dải cao su trắng ở mũi, đế cam (sẫm dưới). Chấm trắng nào cũng thành cặp mắt
    hightop: { pal: () => ({ O: pat('#262a36', (i, j) => (j === 0 ? '#4a4f63' : null)), G: pat('#262a36', (i, j) => (j === 1 ? '#f2f2f2' : null)),
      g: pat('#ff8a3f', (i, j) => (j === 1 ? '#d9601a' : null)) }) },
    // guốc gỗ: thân gỗ vàng có vân sẫm, đế gỗ dày 2 hàng: đè lên hàng viền dưới đế, viền mực dời xuống 1 hàng (khối riêng dưới đế trông như 2 chiếc giày chồng nhau)
    clogs: {
      pal: () => ({ G: pat('#c7a26a', (i, j, x, y) => (hash(x, y) % 5 === 0 ? '#a8844e' : i === 0 && j === 0 ? '#e0c088' : null)), g: '#8a6a3a' }),
      addon(ctx, f) { if (!f.flat) return; const w = f.x1 - f.x0; dot(ctx, f.x0, f.y1, w, 2, '#6e5230'); dot(ctx, f.x0 + 1, f.y1, w - 2, 1, '#8a6a3a'); dot(ctx, f.x0 - 1, f.y1 + 2, w + 2, 2, INK); },
    },
    // giày patin: thân trắng dây đỏ, đế đỏ, 2 bánh xe dưới đế (vành tối, trục xám chạy vòng theo anim)
    rollers: {
      pal: () => ({ G: pat('#e8ecf5', (i, j) => (j === 0 && i === 0 ? '#ff3d5a' : null)), g: '#ff3d5a' }),
      addon(ctx, f) {
        if (!f.flat) return;
        const spin = Math.floor(C.anim * 16) % 4, hub = [[0, 0], [1, 0], [1, 1], [0, 1]][spin];
        for (const wx of [f.x0, f.x1 - 3]) { dot(ctx, wx, f.y1 + 1, 3, 3, INK); dot(ctx, wx + 1, f.y1 + 2, 1, 1, '#9aa3b5'); dot(ctx, wx + hub[0] * 2, f.y1 + 1 + hub[1] * 2, 1, 1, '#4a4f63'); }
      },
    },
    // giày đinh: xanh neon, vệt sẫm dưới thân, chấm sáng; đế đen + 3 đinh trắng dưới đế
    cleats: {
      pal: () => ({ G: pat('#6bff4f', (i, j) => (j === 1 ? '#2fb81f' : i === 0 ? '#c8ffb8' : null)), g: '#1a1216' }),
      addon(ctx, f) { if (!f.flat) return; for (const sx of [f.x0 + 1, Math.round((f.x0 + f.x1) / 2) - 1, f.x1 - 2]) dot(ctx, sx, f.y1 + 2, 1, 1, '#f4f4f4'); },
    },
    // giày neon: xanh neon mu sáng, đế tím, ánh xanh hắt xuống mặt sân dưới đế (phập phồng; quầng chữ nhật quanh giày trông như cái hộp)
    neonkick: {
      pal: () => ({ G: pat('#3ff6ff', (i, j) => (j === 0 ? '#c8fdff' : null)), g: '#9d7bff' }),
      addon(ctx, f) { const a = 0.35 + 0.15 * Math.sin(C.anim * 7), w = f.x1 - f.x0; add(ctx, () => { dot(ctx, f.x0 - 1, f.y1 + 2, w + 2, 1, `rgba(63,246,255,${a.toFixed(3)})`); dot(ctx, f.x0 + 1, f.y1 + 3, w - 2, 1, `rgba(63,246,255,${(a / 2).toFixed(3)})`); }); },
    },
    // giày rằn ri: 3 sắc xanh lá loang theo từng px, tất ô-liu, đế xám đen
    camo: { pal: () => ({ G: pat('#4a5a2a', (i, j, x, y) => { const h = hash(x >> 1, y) % 7; return h < 2 ? '#2e3a1a' : h < 4 ? '#7a8a4a' : null; }), O: '#6b7a3a', g: '#262a36' }) },
    // giày cầu vồng: đổi màu mỗi bước (8 màu / s), 2 chân lệch nhau 3 màu, chấm sáng trắng; đế trắng
    rainbowkick: { pal: () => ({ G: pat(RAINBOW[0], (i, j, x) => (i === 0 && j === 0 ? '#ffffff' : RAINBOW[(Math.floor(C.anim * 8) + (right(x) ? 3 : 0)) % RAINBOW.length])), g: '#f2f2f2' }) },
    // giày lệch màu: chân trái đỏ, chân phải xanh (theo chân của cầu thủ, quay lưng / nhìn trái vẫn đúng chân), dây trắng, đế trắng
    mismatch: { pal: () => ({ G: pat('#d7263d', (i, j, x) => (j === 0 && i === 0 ? '#ffffff' : right(x) ? '#2f6fd1' : '#d7263d')), g: '#f2f2f2' }) },
    // giày vàng: chấm sáng trên trái, góc dưới phải sẫm, đế vàng sẫm; lấp lánh: ngôi sao 4 cánh loé lên ở 1 chỗ trên giày rồi tắt
    goldboot: {
      pal: () => ({ G: pat('#ffd23f', (i, j) => (i === 0 && j === 0 ? '#fff3a8' : i === 1 && j === 1 ? '#c9a020' : null)), g: '#a8800f' }),
      addon(ctx, f, k) {
        const t = (C.anim * 1.6 + k * 0.37) % 1;
        if (t > 0.22) return;
        const n = t > 0.06 && t < 0.16 ? 2 : 1, sx = f.x0 + (hash(Math.floor(C.anim * 1.6 + k * 0.37), k) % Math.max(1, f.x1 - f.x0)), sy = f.y0 - 4;
        add(ctx, () => { dot(ctx, sx, sy, 1, 1, '#ffffff'); for (let i = 1; i <= n; i++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) dot(ctx, sx + dx * i, sy + dy * i, 1, 1, 'rgba(255,240,160,0.9)'); });
      },
    },
    // giày băng: xanh băng có mặt cắt chéo sáng, tất băng nhạt, đế xanh; hơi lạnh: 3 hạt trắng bốc lên toả ra rồi tan
    iceboot: {
      pal: () => ({ G: pat('#bdf4ff', (i, j) => (i === j ? '#ffffff' : null)), O: pat('#e8fbff', (i, j) => (i === 1 && j === 0 ? '#bdf4ff' : null)), g: '#7fe7ff' }),
      addon(ctx, f, k) {
        add(ctx, () => {
          for (let p = 0; p < 3; p++) {
            const t = (C.anim * 0.9 + p / 3 + k * 0.5) % 1, px = Math.round(f.x0 + ((p + 0.5) / 3) * (f.x1 - f.x0) + (p - 1) * t * 4), py = Math.round(f.y1 - t * 9);
            dot(ctx, px, py, 1, 1, `rgba(230,250,255,${(0.8 * (1 - t)).toFixed(3)})`);
          }
        });
      },
    },
    // giày phản lực: thân kim loại (mép sáng, hàng dưới sẫm), đế sẫm; phản lực xanh dưới mỗi đế: lõi trắng, dài ngắn nhấp nháy
    rocket: {
      pal: () => ({ G: pat('#9aa3b5', (i, j) => (j === 1 ? '#6b7385' : i === 0 ? '#d0d6e2' : null)), g: '#4a4f63' }),
      addon(ctx, f, k) {
        if (!f.flat) return;
        const L = 3 + ((Math.floor(C.anim * 16) + k) % 3), cx = Math.round((f.x0 + f.x1) / 2) - 1;
        add(ctx, () => {
          for (let i = 0; i < L; i++) { const a = 1 - i / L; dot(ctx, cx - 1, f.y1 + 2 + i, 4, 1, `rgba(60,140,255,${(0.7 * a).toFixed(3)})`); dot(ctx, cx, f.y1 + 2 + i, 2, 1, i < L - 1 ? `rgba(220,245,255,${(0.95 * a).toFixed(3)})` : `rgba(120,200,255,${a.toFixed(3)})`); }
        });
      },
    },
    // giày lửa: cam, hàng dưới đỏ, chấm vàng; đế vàng; lửa bốc lên ở gót + 2 mép giày (vàng -> cam -> đỏ, cao thấp nhấp nháy)
    flame: {
      pal: () => ({ G: pat('#ff6a1f', (i, j) => (j === 1 ? '#d7261d' : i === 0 ? '#ffd23f' : null)), g: '#ffd23f' }),
      addon(ctx, f, k) {
        add(ctx, () => {
          [f.x0, Math.round((f.x0 + f.x1) / 2), f.x1 - 1].forEach((fx, q) => {
            const h = 2 + ((Math.floor(C.anim * 14) + q * 2 + k) % 4);
            for (let i = 0; i < h; i++) dot(ctx, fx, f.y0 - 1 - i - (q === 1 ? 2 : 0), 1, 1, i < h * 0.4 ? 'rgba(255,220,80,0.9)' : i < h * 0.75 ? 'rgba(255,120,30,0.8)' : 'rgba(215,38,29,0.6)');
          });
        });
      },
    },
  };

  // bảng màu người (body.js palette) -> thay O / G / g / J theo giày. Đế ghi chỗ tô khi kiểu có đồ dưới đế
  function shoePal(o, pal) {
    const st = STYLES[o.shoes];
    if (!st) return pal;
    Object.assign(pal, st.pal(o, pal));
    if (st.addon) pal.g = rec(pal.g);
    return pal;
  }
  // gom các chữ nhật đế chạm nhau (kể cả chéo) thành bàn chân, vẽ đồ của kiểu giày quanh từng bàn chân
  function shoeEnd(ctx) {
    const st = C && C.st;
    if (st && st.addon && C.soles.length) {
      const R = C.soles, grp = R.map((r, i) => i);
      const top = (i) => (grp[i] === i ? i : (grp[i] = top(grp[i])));
      for (let a = 0; a < R.length; a++) for (let b = a + 1; b < R.length; b++) {
        const [x0, y0, w0, h0] = R[a], [x1, y1, w1, h1] = R[b];
        if (x0 <= x1 + w1 && x1 <= x0 + w0 && y0 <= y1 + h1 && y1 <= y0 + h0) grp[top(a)] = top(b);
      }
      const feet = new Map();
      R.forEach(([x, y, w, h], i) => {
        const g = top(i), f = feet.get(g) || { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
        f.x0 = Math.min(f.x0, x); f.x1 = Math.max(f.x1, x + w); f.y0 = Math.min(f.y0, y); f.y1 = Math.max(f.y1, y + h);
        feet.set(g, f);
      });
      [...feet.values()].sort((a, b) => a.x0 - b.x0).forEach((f, k) => { f.flat = f.x1 - f.x0 >= f.y1 - f.y0; st.addon(ctx, f, k); });
    }
    C = null;
  }

  Object.assign(Sprite, { SHOE_STYLES: STYLES, shoePal, shoeBegin, shoeEnd });
})();
