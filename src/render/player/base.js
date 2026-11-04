/* PlayerSprite · base.js — Nền: màu, đóng dấu bộ phận, chi trên lưới thế giới, nội suy. Mọi file sau dùng chung qua PlayerSprite.
 * Toạ độ = px game: gốc (X, Y) = gốc thế giới, mỗi ô = 1 px game. Lật ngang quanh cột 0 (cột x <-> cột -x).
 * Mọi khung (đứng, tư thế khoá, khung chuyển động) chỉ vẽ ở px game nguyên (user 2026-11-04 bỏ nửa px):
 * độ lệch số thực phải qua snapPx trước khi cộng vào gốc vẽ.
 * Nạp theo thứ tự trong scripts/manifest.js (classic script, không module): mỗi file gắn hàm vào SFC.PlayerSprite.
 */
window.SFC = window.SFC || {};

(function () {
  const Sprite = (SFC.PlayerSprite = SFC.PlayerSprite || {});
  const INK = '#140c16';

  /* ---------- màu ---------- */
  function shade(c, t) {
    if (c && typeof c === 'object') c = c.base;   // màu vẽ theo mẫu (giày, shoes.js): lấy màu nền
    if (typeof c !== 'string' || c[0] !== '#') return c;
    const h = c.length === 4 ? c.slice(1).split('').map((ch) => ch + ch).join('') : c.slice(1, 7);
    const n = parseInt(h, 16), o = t < 0 ? 0xffffff : parseInt(INK.slice(1), 16), k = Math.abs(t);
    return '#' + [16, 8, 0].map((s) => { const a = (n >> s) & 255, b = (o >> s) & 255; return Math.round(a + (b - a) * k).toString(16).padStart(2, '0'); }).join('');
  }

  /* ---------- vẽ ---------- */
  // tô 1 chữ nhật px game: c = màu, hoặc đối tượng { base, paint(ctx, x, y, w, h) } tự tô theo mẫu từng px (giày, shoes.js)
  function fill(ctx, c, x, y, w, h) { if (c && typeof c === 'object') c.paint(ctx, x, y, w, h); else { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); } }
  const cache = new WeakMap();
  function cellsOf(part) {
    let c = cache.get(part);
    if (!c) {
      c = [];
      part.rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] !== '.') c.push([part.x + i, part.y + j, r[i]]); });
      cache.set(part, c);
    }
    return c;
  }
  // mỗi ô = 1 px game · mir = lật ngang quanh cột 0
  function stamp(ctx, X, Y, part, pal, mir = false) {
    for (const [x, y, ch] of cellsOf(part)) fill(ctx, pal[ch] || ch, mir ? X - x : X + x, Y + y, 1, 1);
  }
  // ô thế giới (gốc X, Y)
  const cell = (ctx, X, Y, x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(X + x, Y + y, w, h); };

  /* ---------- chi tự do (tay đấm, chân đá, tay ăn mừng...) trên lưới thế giới ---------- */
  // tô ô nào thì viền mực 1 ô theo 4 hướng quanh vùng đã tô -> góc ngoài tự bo như tay đứng (không ra khối chữ nhật)
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const key = (x, y) => x + ',' + y;
  // đường dày 2 ô (bút 2 x 2 neo góc trên trái) qua pts; col(k, i, n) = màu mẫu i / n của đoạn k (1..)
  function limbCells(pts, col, cells = new Map()) {
    for (let k = 1; k < pts.length; k++) {
      const [x0, y0] = pts[k - 1], [x1, y1] = pts[k], n = Math.max(1, Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let i = 0; i <= n; i++) {
        const cx = Math.round(x0 + ((x1 - x0) * i) / n), cy = Math.round(y0 + ((y1 - y0) * i) / n), c = col(k, i, n);
        for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) cells.set(key(cx + a, cy + b), [cx + a, cy + b, c]);
      }
    }
    return cells;
  }
  // khối ô theo bản đồ chữ (màu lấy từ pal), đè lên ô đã có
  function blockCells(cells, x, y, rows, pal) {
    rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] !== '.') cells.set(key(x + i, y + j), [x + i, y + j, pal[r[i]] || r[i]]); });
    return cells;
  }
  // vẽ ô quanh gốc (X, Y): viền rồi tô. mir = lật quanh cột 0 · inkMax = không viền dưới hàng này (nối liền vào áo)
  function drawCells(ctx, X, Y, cells, mir = false, inkMax = Infinity) {
    const cx = (x) => (mir ? X - x : X + x);
    ctx.fillStyle = INK;
    for (const [x, y] of cells.values()) for (const [dx, dy] of N4) {
      if (y + dy > inkMax || cells.has(key(x + dx, y + dy))) continue;
      ctx.fillRect(cx(x + dx), Y + y + dy, 1, 1);
    }
    for (const [x, y, c] of cells.values()) fill(ctx, c, cx(x), Y + y, 1, 1);
  }
  // chữ nhật ô thế giới quanh gốc (X, Y), có lật
  function rectW(ctx, X, Y, mir, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(mir ? X - (x + w - 1) : X + x, Y + y, w, h); }
  // hình tròn px (như disc() của game) ở lưới thế giới
  function discW(ctx, X, Y, cx, cy, r, c) { for (let dy = -r; dy <= r; dy++) { const w = Math.floor(Math.sqrt(r * r - dy * dy) + 0.35); rectW(ctx, X, Y, false, cx - w, cy + dy, w * 2 + 1, 1, c); } }

  /* ---------- độ lệch số thực -> px game ---------- */
  // làm tròn tới px game, đối xứng quanh 0 (nửa px lên 1 px, cả 2 phía) để hình nhìn trái vẫn là hình nhìn phải lật lại
  const snapPx = (v) => Math.sign(v) * Math.round(Math.abs(v));

  /* ---------- nội suy ---------- */
  const lerp = (a, b, k) => a + (b - a) * k;
  const easeOut = (k) => 1 - (1 - k) * (1 - k);
  const clamp01 = (k) => Math.max(0, Math.min(1, k));
  const easeIO = (k) => k * k * (3 - 2 * k);

  Object.assign(Sprite, { INK, shade, fill, cellsOf, stamp, cell, N4, key, limbCells, blockCells, drawCells, rectW, discW, snapPx, lerp, easeOut, clamp01, easeIO });
})();
