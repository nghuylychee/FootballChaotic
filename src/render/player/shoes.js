/* PlayerSprite · shoes.js — Giày (slot shoes, 20 món; kicks = giày trắng mặc định, không qua đây) cho mọi tư thế chân.
 * Chân nào cũng tô bằng bảng màu O (tất) · G (giày) · g (đế) · J (da ống chân) nên giày chỉ cần thay 4 màu đó là có ở đứng, chạy, đá, sút, đánh đầu,
 * đổ người, bị đá bay, ăn mừng. Màu có thể là "đối tượng vẽ" { base, paint } (base.js fill()): tô từng ô game theo mẫu (sọc, rằn ri, vân gỗ),
 * chọn màu theo chân phải / trái của cầu thủ (giày lệch màu, cầu vồng). Đế (g) ghi lại chỗ đã tô -> cuối draw() vẽ đồ dưới đế / quanh giày
 * (bánh xe, đinh, đế gỗ, phản lực, lửa, quầng sáng, lấp lánh, hơi lạnh) đúng chỗ bàn chân ở mọi tư thế.
 * Chỉ px game (user 2026-11-04 bỏ nửa px): giày chỉ 2 - 3 ô mỗi hàng nên mẫu trong ô (dây giày, chấm sáng, mép sẫm) của bản nửa px bỏ đi, mỗi hàng 1 màu.
 * Nạp theo thứ tự trong scripts/manifest.js (classic script, không module): mỗi file gắn hàm vào SFC.PlayerSprite.
 */
window.SFC = window.SFC || {};

(function () {
  const Sprite = (SFC.PlayerSprite = SFC.PlayerSprite || {});
  const { INK, shade } = Sprite;
  // trạng thái của lần draw() đang chạy (đồng bộ, 1 người 1 lúc): gốc X, chân phải ở cột trái màn hình?, anim, các chữ nhật đế đã tô
  let C = null;
  function shoeBegin(X, o, rightOnL) { C = { X, rightOnL, anim: o.anim || 0, soles: [], st: STYLES[o.shoes] || null }; }
  const right = (x) => (x < C.X) === C.rightOnL;   // cột x thuộc chân phải của cầu thủ
  const hash = (x, y) => (((x * 73856093) ^ (y * 19349663)) >>> 0);
  // đối tượng vẽ: fn(cx, cy, x) -> màu của ô game (cx, cy = toạ độ ô, x = cột của ô), null = base
  function pat(base, fn) {
    return {
      base,
      paint(ctx, x, y, w, h) {
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
          const ax = x + i, ay = y + j;
          ctx.fillStyle = fn(ax, ay, ax) || base; ctx.fillRect(ax, ay, 1, 1);
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
  // ô game: x, y = px game, w, h = số ô
  const cell = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

  // mỗi kiểu: pal(o) -> { O, G, g, J } (màu hoặc đối tượng vẽ, thiếu = giữ mặc định) · addon(ctx, foot, k): vẽ quanh 1 bàn chân
  // foot = { x0, x1, y0, y1 } (px game, khung đế đã tô; y1 = mép dưới đế, ngay dưới là hàng viền 1 ô), flat = đế nằm ngang (bàn chân trên đất / ngang)
  const STYLES = {
    // dép lê: lộ cổ chân, quai xanh vắt ngang mu, đế xanh sẫm
    slides: { pal: (o) => ({ O: o.skin, G: '#3b82f6', g: '#2d5bd1' }) },
    // giày đỏ, đế trắng
    reds: { pal: () => ({ G: '#d7263d', g: '#f2f2f2' }) },
    // giày vải xanh, đế cao su trắng (đế sọc xanh trông như tất sọc)
    canvas: { pal: () => ({ G: '#2f6fd1', g: '#ffffff' }) },
    // ủng da nâu cao cổ: phủ cả ống chân, cổ chân sáng hơn (mép cổ ủng), đế sẫm
    boots: { pal: () => ({ J: '#6b4423', O: '#8a5a30', G: '#6b4423', g: '#2e1a0e' }) },
    // chân trần: tất / giày thành da, lòng bàn chân hơi sẫm
    barefoot: { pal: (o) => ({ O: o.skin, G: o.skin, g: shade(o.skin, 0.14) }) },
    // ủng mưa vàng: phủ ống chân, cổ ủng sẫm (chấm sáng từng ô trông như bàn cờ), đế nâu vàng
    rainboot: { pal: () => ({ J: '#e0a820', O: '#ffd23f', G: '#ffd23f', g: '#9a6a10' }) },
    // tất ống cao: kéo lên ống chân trắng, cổ chân đỏ (sọc từng hàng không được: đứng chỉ thấy 1 hàng tất, mà hàng theo toạ độ thì nháy khi chạy lên xuống),
    // giày đen đế xám
    socks: { pal: () => ({ J: '#f0f0f0', O: '#d7263d', G: '#1a1216', g: '#5a6075' }) },
    // giày cổ cao đen: cổ giày xám đệm phủ cổ chân, thân đen, đế cam (chấm trắng nào cũng thành cặp mắt)
    hightop: { pal: () => ({ O: '#4a4f63', G: '#262a36', g: '#ff8a3f' }) },
    // guốc gỗ: thân gỗ vàng có vân sẫm, đế gỗ dày: thêm 1 hàng gỗ đè lên hàng viền dưới đế, viền mực dời xuống 1 hàng
    // (khối riêng dưới đế trông như 2 chiếc giày chồng nhau)
    clogs: {
      pal: () => ({ G: pat('#c7a26a', (cx, cy) => (hash(cx, cy) % 3 === 0 ? '#a8844e' : null)), g: '#8a6a3a' }),
      addon(ctx, f) {
        if (!f.flat) return;
        const n = f.x1 - f.x0;
        cell(ctx, f.x0, f.y1, n, 1, '#6e5230'); cell(ctx, f.x0 - 1, f.y1, 1, 1, INK); cell(ctx, f.x1, f.y1, 1, 1, INK); cell(ctx, f.x0, f.y1 + 1, n, 1, INK);
      },
    },
    // giày patin: thân trắng, đế đỏ, 2 bánh xe dưới đế (xám, nháy sẫm theo vòng quay)
    rollers: {
      pal: () => ({ G: '#e8ecf5', g: '#ff3d5a' }),
      addon(ctx, f) {
        if (!f.flat) return;
        const spin = Math.floor(C.anim * 16) % 2;
        [f.x0, f.x1 - 1].forEach((wx, i) => cell(ctx, wx, f.y1 + 1, 1, 1, (spin + i) % 2 ? '#4a4f63' : '#9aa3b5'));
      },
    },
    // giày đinh: xanh neon, đế đen + đinh trắng dưới đế ở 2 đầu
    cleats: {
      pal: () => ({ G: '#6bff4f', g: '#1a1216' }),
      addon(ctx, f) { if (!f.flat) return; for (const sx of f.x1 - f.x0 > 2 ? [f.x0, f.x1 - 1] : [f.x0]) cell(ctx, sx, f.y1 + 1, 1, 1, '#f4f4f4'); },
    },
    // giày neon: xanh neon, đế tím, ánh xanh hắt xuống mặt sân dưới đế (phập phồng; quầng chữ nhật quanh giày trông như cái hộp)
    neonkick: {
      pal: () => ({ G: '#3ff6ff', g: '#9d7bff' }),
      addon(ctx, f) { const a = 0.3 + 0.12 * Math.sin(C.anim * 7); add(ctx, () => cell(ctx, f.x0, f.y1 + 1, f.x1 - f.x0, 1, `rgba(63,246,255,${a.toFixed(3)})`)); },
    },
    // giày rằn ri: 3 sắc xanh lá loang theo từng ô, tất ô-liu, đế xám đen
    camo: { pal: () => ({ G: pat('#4a5a2a', (cx, cy) => { const h = hash(cx, cy) % 7; return h < 2 ? '#2e3a1a' : h < 4 ? '#7a8a4a' : null; }), O: '#6b7a3a', g: '#262a36' }) },
    // giày cầu vồng: đổi màu mỗi bước (8 màu / s), 2 chân lệch nhau 3 màu; đế trắng
    rainbowkick: { pal: () => ({ G: pat(RAINBOW[0], (cx, cy, x) => RAINBOW[(Math.floor(C.anim * 8) + (right(x) ? 3 : 0)) % RAINBOW.length]), g: '#f2f2f2' }) },
    // giày lệch màu: chân trái đỏ, chân phải xanh (theo chân của cầu thủ, quay lưng / nhìn trái vẫn đúng chân), đế trắng
    mismatch: { pal: () => ({ G: pat('#d7263d', (cx, cy, x) => (right(x) ? '#2f6fd1' : null)), g: '#f2f2f2' }) },
    // giày vàng, đế vàng sẫm; lấp lánh: ngôi sao 4 cánh loé lên ở 1 chỗ trên giày rồi tắt
    goldboot: {
      pal: () => ({ G: '#ffd23f', g: '#a8800f' }),
      addon(ctx, f, k) {
        const t = (C.anim * 1.6 + k * 0.37) % 1;
        if (t > 0.22) return;
        const n = f.x1 - f.x0, sx = f.x0 + hash(Math.floor(C.anim * 1.6 + k * 0.37), k) % Math.max(1, n), sy = f.y0 - 2;
        add(ctx, () => { cell(ctx, sx, sy, 1, 1, '#ffffff'); if (t > 0.06 && t < 0.16) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) cell(ctx, sx + dx, sy + dy, 1, 1, 'rgba(255,240,160,0.9)'); });
      },
    },
    // giày băng: xanh băng, tất băng nhạt, đế xanh; hơi lạnh: 3 hạt trắng bốc lên toả ra rồi tan
    iceboot: {
      pal: () => ({ G: '#bdf4ff', O: '#e8fbff', g: '#7fe7ff' }),
      addon(ctx, f, k) {
        add(ctx, () => {
          for (let p = 0; p < 3; p++) {
            const t = (C.anim * 0.9 + p / 3 + k * 0.5) % 1;
            const px = f.x0 + Math.round(((p + 0.5) / 3) * (f.x1 - f.x0) + (p - 1) * t * 2), py = f.y1 - Math.round(t * 4.5);
            cell(ctx, px, py, 1, 1, `rgba(230,250,255,${(0.8 * (1 - t)).toFixed(3)})`);
          }
        });
      },
    },
    // giày phản lực: thân kim loại, đế sẫm; phản lực dưới giữa mỗi đế (đế lẻ ô: 1 cột, chẵn: 2 cột): lõi trắng, đuôi xanh, dài ngắn nhấp nháy
    rocket: {
      pal: () => ({ G: '#9aa3b5', g: '#4a4f63' }),
      addon(ctx, f, k) {
        if (!f.flat) return;
        const n = f.x1 - f.x0, w = n % 2 ? 1 : 2, x = f.x0 + (n - w) / 2, L = 2 + ((Math.floor(C.anim * 16) + k) % 2);
        add(ctx, () => {
          for (let i = 0; i < L; i++) cell(ctx, x, f.y1 + 1 + i, w, 1, i < L - 1 ? `rgba(220,245,255,${(0.95 * (1 - i / L)).toFixed(3)})` : 'rgba(60,140,255,0.6)');
        });
      },
    },
    // giày lửa: cam, đế vàng; lửa bốc lên ở gót + mũi giày (vàng -> cam, cao thấp nhấp nháy; đặc, cộng sáng lên giày cam thì gần như không thấy)
    flame: {
      pal: () => ({ G: '#ff6a1f', g: '#ffd23f' }),
      addon(ctx, f, k) {
        [f.x0, f.x1 - 1].forEach((fx, q) => {
          const h = 1 + ((Math.floor(C.anim * 14) + q * 2 + k) % 2);
          for (let i = 0; i < h; i++) cell(ctx, fx, f.y0 - 1 - i, 1, 1, i === 0 ? '#ffd23f' : '#ff6a1f');
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
