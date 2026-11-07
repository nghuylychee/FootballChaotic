/* PlayerSprite3 · look.js (Sprite v3 đợt 4, 2026-11-07) — tóc / mũ (slot hair) và phụ kiện mặt (slot face) trên đầu v3 (19 x 17).
 * Không vẽ tay lại từng món: lấy bản đồ ô của v2 (player/hair.js STYLES, player/face.js ITEMS, đã duyệt) rồi phóng lên lưới đầu v3 bằng
 * lấy mẫu điểm gần nhất (phóng lên nên ô nào của v2 cũng còn), viền mực vẽ lại 1 px quanh khối mới (không phóng viền: không dày mỏng như ảnh phóng).
 * Phụ kiện mặt neo theo khung mắt (mắt v2 3 x 3 lệch nửa ô -> mắt v3 4 x 4 giữa). 4 kiểu tóc v2 vẽ bằng code (beanie, bandana, bun, halo)
 * không có bản đồ ô: chụp ảnh đầu v2 có tóc vào đệm, lấy các ô khác đầu hói (bỏ viền) rồi phóng + vẽ lại viền như trên (captureCut).
 * Nạp sau body.js. Toạ độ: gốc đầu v3 = gốc thân (đầu hàng -30..-14); v2 tính theo gốc đầu v2 (hàng -25..-13).
 */
window.SFC = window.SFC || {};

(function () {
  const S3 = SFC.PlayerSprite3, V2 = SFC.PlayerSprite;
  const { INK, HEAD, stamp } = S3;
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const sround = (v) => Math.sign(v) * Math.round(Math.abs(v));
  // ô v3 (tx, ty) -> ô v2: x theo bề ngang đầu (v2 -7..7 = v3 -9..9), y theo chiều cao đầu (v2 -25..-13 = v3 -30..-14).
  // eye = phụ kiện mặt: cặp mắt v2 lệch trái nửa ô -> dịch nửa ô cho mắt v2 rơi đúng mắt v3; ex2 / ex3 = mặt lệch theo hướng nhìn của mỗi bản
  const KX = 7 / 9, KY = 0.75;
  const srcY = (ty) => Math.round((ty + 30) * KY - 25);
  const srcX = (tx, eye, ex2 = 0, ex3 = 0) => (eye ? Math.round((tx - ex3) * KX - 0.5) + ex2 : sround(tx * KX));
  // khung v3 phủ 1 khoảng ô v2 [a, b]
  const dstX = (a, b) => [Math.floor(a / KX) - 2, Math.ceil(b / KX) + 2], dstY = (a, b) => [Math.floor((a + 25) / KY - 30) - 1, Math.ceil((b + 25) / KY - 30) + 1];

  /* ---------- đầu hói, dải má, ô mặt, ô trong đầu (như v2 hair.js / face.js, cho đầu v3) ---------- */
  const BALD = {};
  for (const k of ['front', 'back', 'bdiag']) BALD[k] = Object.assign({}, HEAD[k], { rows: HEAD[k].rows.map((r) => r.replace(/[HB]/g, 'S').replace(/b/g, 's')) });
  const cellsOf = (part) => { const m = new Map(); part.rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] !== '.') m.set((part.x + i) + ',' + (part.y + j), r[i]); }); return m; };
  const HEADC = { front: cellsOf(HEAD.front), back: cellsOf(HEAD.back) };
  // dải má lộ ra khi nhìn chéo lên (hình nhìn phải): ô da của đầu chéo lên mà sau lưng là tóc / băng đô
  const CHEEK = new Map();
  HEAD.bdiag.rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if ('Ss'.includes(r[i]) && 'HBb'.includes(HEAD.back.rows[j][i])) CHEEK.set((HEAD.bdiag.x + i) + ',' + (HEAD.bdiag.y + j), r[i]); });
  // ô da mặt (dưới băng đô): viền mực của tóc / phụ kiện không đè lên đây
  const FACE = new Set([...HEADC.front].filter(([k, ch]) => +k.split(',')[1] >= -25 && ch !== 'K').map(([k]) => k));
  const INSIDE = { front: new Set([...HEADC.front].filter(([, ch]) => ch !== 'K').map(([k]) => k)), back: new Set([...HEADC.back].filter(([, ch]) => ch !== 'K').map(([k]) => k)) };

  /* ---------- phóng ô ---------- */
  // lớp tóc v2 { x, y, rows, ink, under } -> lớp v3 cùng dạng (giữ cờ)
  const layerCache = new WeakMap();
  function upLayer(L) {
    if (layerCache.has(L)) return layerCache.get(L);
    const w = L.rows[0].length, h = L.rows.length, at = (x, y) => { const r = L.rows[y - L.y]; const c = r && r[x - L.x]; return c && c !== '.' ? c : null; };
    const [x0, x1] = dstX(L.x, L.x + w - 1), [y0, y1] = dstY(L.y, L.y + h - 1), rows = [];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const m = new Map();
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const c = at(srcX(tx, false), srcY(ty));
      if (!c) continue;
      m.set(tx + ',' + ty, c); minX = Math.min(minX, tx); maxX = Math.max(maxX, tx); minY = Math.min(minY, ty); maxY = Math.max(maxY, ty);
    }
    for (let y = minY; y <= maxY; y++) { let r = ''; for (let x = minX; x <= maxX; x++) r += m.get(x + ',' + y) || '.'; rows.push(r); }
    const out = Object.assign({}, L, { x: minX, y: minY, rows: rows.length ? rows : ['.'] });
    if (!rows.length) out.x = 0;
    layerCache.set(L, out);
    return out;
  }
  // ô phụ kiện mặt v2 [[x, y, ch]] -> ô v3 (neo theo mắt)
  function upCells(cells, ex2, ex3) {
    if (!cells.length) return [];
    const src = new Map(cells.map(([x, y, ch]) => [x + ',' + y, ch]));
    const xs = cells.map((c) => c[0]), ys = cells.map((c) => c[1]);
    const [x0, x1] = dstX(Math.min(...xs) - ex2 - 1, Math.max(...xs) - ex2 + 1), [y0, y1] = dstY(Math.min(...ys), Math.max(...ys)), out = [];
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0 + ex3; tx <= x1 + ex3; tx++) {
      const c = src.get(srcX(tx, true, ex2, ex3) + ',' + srcY(ty));
      if (c) out.push([tx, ty, c]);
    }
    return out;
  }

  /* ---------- tóc / mũ ---------- */
  // chéo lên suy từ lớp sau lưng như v2 turn(): giữ viền ngoài, chi tiết dịch 1 cột ngược hướng mặt, tóc ở dải má bỏ đi
  function turn(L) {
    const at = (i, j) => (L.rows[j] && L.rows[j][i] && L.rows[j][i] !== '.' ? L.rows[j][i] : null);
    const rows = L.rows.map((r, j) => r.split('').map((c, i) => {
      if (c === '.') return '.';
      if (CHEEK.has((L.x + i) + ',' + (L.y + j)) && 'HhLzY'.includes(c)) return '.';
      return at(i + 1, j) || c;
    }).join(''));
    return Object.assign({}, L, { rows });
  }
  const turned = new WeakMap();
  const turnOf = (L) => { let t = turned.get(L); if (!t) turned.set(L, (t = turn(L))); return t; };
  const fill = (ctx, c, x, y) => { if (c && typeof c === 'object') c.paint(ctx, x, y, 1, 1); else { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); } };
  // 1 lớp: ink = viền mực 4 hướng (trừ lên mặt / dải má); lớp phẳng chỉ tô trong viền đầu
  function layer(ctx, X, Y, L, hp, mir, back, bd) {
    const cells = new Map(), inside = INSIDE[back ? 'back' : 'front'];
    L.rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] !== '.' && (L.ink || inside.has((L.x + i) + ',' + (L.y + j)))) cells.set((L.x + i) + ',' + (L.y + j), [L.x + i, L.y + j, hp[r[i]] || r[i]]); });
    const cx = (x) => (mir ? X - x : X + x);
    if (L.ink) {
      ctx.fillStyle = typeof L.ink === 'string' ? L.ink : INK;
      for (const [x, y] of cells.values()) for (const [dx, dy] of N4) {
        const k = (x + dx) + ',' + (y + dy);
        if (cells.has(k) || (!back && FACE.has(k)) || (bd && CHEEK.has(k))) continue;
        ctx.fillRect(cx(x + dx), Y + y + dy, 1, 1);
      }
    }
    for (const [x, y, c] of cells.values()) fill(ctx, c, cx(x), Y + y);
  }
  // 4 kiểu tóc v2 vẽ bằng code (hair.js cutDraw, không có bản đồ ô): chụp ảnh đầu v2 có tóc, lấy các ô khác đầu hói rồi phóng như trên
  const CODE_CUTS = { beanie: 1, bandana: 1, bun: 1, halo: 1 };
  // có vẽ được kiểu tóc này không
  const hasHair = (cut) => !cut || cut === 'classic' || !!(V2.HAIR_STYLES && V2.HAIR_STYLES[cut]) || !!CODE_CUTS[cut];
  let capBuf = null;
  const capCache = new Map();
  // ô tóc (toạ độ đầu v2) của kiểu vẽ bằng code: vẽ đầu hói + tóc v2 và đầu hói riêng vào đệm, ô nào khác nhau (trừ viền mực) là tóc
  function captureCut(back, cut, o, fx, fy, bd) {
    const key = [cut, back ? 1 : 0, bd ? 1 : 0, Math.sign(Math.round(fx * 2)), Math.round(fx * 2), o.hair, o.band, o.skin, cut === 'halo' ? Math.floor((o.anim || 0) * 8) % 16 : 0].join('|');
    if (capCache.has(key)) return capCache.get(key);
    const W = 64, H = 64, ax = 32, ay = 52;
    if (!capBuf) { capBuf = document.createElement('canvas'); capBuf.width = W * 2; capBuf.height = H; }
    const c = capBuf.getContext('2d'), pal = V2.palette(o);
    c.clearRect(0, 0, W * 2, H);
    V2.drawHead(c, ax, ay, back, cut, o, pal, fx, fy, bd);
    stamp(c, ax + W, ay, V2.HAIR_BALD[bd ? 'bdiag' : back ? 'back' : 'front'], pal, bd && fx < 0);
    const A = c.getImageData(0, 0, W, H).data, B = c.getImageData(W, 0, W, H).data, ink = [0x14, 0x0c, 0x16], cells = new Map();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (!A[i + 3]) continue;
      if (A[i] === B[i] && A[i + 1] === B[i + 1] && A[i + 2] === B[i + 2] && A[i + 3] === B[i + 3]) continue;
      if (A[i] === ink[0] && A[i + 1] === ink[1] && A[i + 2] === ink[2]) continue;   // viền: vẽ lại 1 px quanh khối mới
      cells.set((x - ax) + ',' + (y - ay), `rgba(${A[i]},${A[i + 1]},${A[i + 2]},${(A[i + 3] / 255).toFixed(3)})`);
    }
    if (capCache.size > 200) capCache.clear();
    capCache.set(key, cells);
    return cells;
  }
  function drawCodeCut(ctx, X, Y, back, cut, o, pal, fx, fy, bd) {
    const src = captureCut(back, cut, o, fx, fy, bd);
    stamp(ctx, X, Y, BALD[bd ? 'bdiag' : back ? 'back' : 'front'], pal, bd && fx < 0);
    if (!src.size) return;
    const xs = [], ys = [];
    for (const k of src.keys()) { const [x, y] = k.split(',').map(Number); xs.push(x); ys.push(y); }
    const [x0, x1] = dstX(Math.min(...xs), Math.max(...xs)), [y0, y1] = dstY(Math.min(...ys), Math.max(...ys)), out = new Map();
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) { const col = src.get(srcX(tx, false) + ',' + srcY(ty)); if (col) out.set(tx + ',' + ty, col); }
    ctx.fillStyle = INK;
    for (const k of out.keys()) {
      const [x, y] = k.split(',').map(Number);
      for (const [dx, dy] of N4) { const n = (x + dx) + ',' + (y + dy); if (!out.has(n) && !(!back && FACE.has(n)) && !(bd && CHEEK.has(n))) ctx.fillRect(X + x + dx, Y + y + dy, 1, 1); }
    }
    for (const [k, col] of out) { const [x, y] = k.split(',').map(Number); ctx.fillStyle = col; ctx.fillRect(X + x, Y + y, 1, 1); }
  }
  function drawHead(ctx, X, Y, back, cut, o, pal, fx, fy, bd) {
    if (!V2.HAIR_STYLES[cut]) return drawCodeCut(ctx, X, Y, back, cut, o, pal, fx, fy, bd);
    const st = V2.HAIR_STYLES[cut], bald = BALD[bd ? 'bdiag' : back ? 'back' : 'front'];
    const side = !back && Math.abs(fx) > 0.5, v0 = back ? st.back : (side && st.side) || st.front, mir = bd ? fx < 0 : side && !!st.side && fx < 0;
    const raw = typeof v0 === 'function' ? v0(o.anim || 0) : v0;
    const view = (bd && st.bdiag ? st.bdiag(raw) : raw).map(upLayer).map((L) => (bd && !st.bdiag ? turnOf(L) : L));
    const hp = Object.assign({ H: o.hair, h: V2.shade(o.hair, 0.3), L: V2.shade(o.hair, -0.35), z: V2.mix(o.skin || pal.S, o.hair, 0.45), A: o.band }, st.pal || {});
    for (const L of view) if (L.under) layer(ctx, X, Y, L, hp, mir, back, bd);
    stamp(ctx, X, Y, bald, pal, bd && fx < 0);
    for (const L of view) if (!L.under) layer(ctx, X, Y, L, hp, mir, back, bd);
    // quầng sáng (tóc lửa): đĩa px mờ cộng sáng, toạ độ đổi sang đầu v3
    if (st.glow) {
      const g = st.glow(o.anim || 0), gx = Math.round(g.x / KX), gy = Math.round((g.y + 25) / KY - 30), r = Math.round(g.r * 1.3);
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g.c;
      for (let dy = -r; dy <= r; dy++) { const w = Math.floor(Math.sqrt(r * r - dy * dy) + 0.35); ctx.fillRect(X + gx - w, Y + gy + dy, w * 2 + 1, 1); }
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  /* ---------- phụ kiện mặt ---------- */
  const hasFace = (id) => !id || id === 'none' || !!(V2.FACE_ITEMS && V2.FACE_ITEMS[id]);
  function paint(ctx, X, Y, op, hp, back) {
    const head = HEADC[back ? 'back' : 'front'], keep = new Map();
    for (const [x, y, ch] of op.cells) {
      const k = x + ',' + y, h = head.get(k);
      if ((op.clip === 'in' && (!h || h === 'K')) || (op.clip === 'head' && !h)) continue;
      keep.set(k, [x, y, hp[ch] || ch]);
    }
    if (op.ink) for (const [x, y] of keep.values()) for (const [dx, dy] of N4) {
      const k = (x + dx) + ',' + (y + dy);
      if (keep.has(k) || (!back && FACE.has(k))) continue;
      ctx.fillStyle = INK; ctx.fillRect(X + x + dx, Y + y + dy, 1, 1);
    }
    for (const [x, y, c] of keep.values()) fill(ctx, c, X + x, Y + y);
  }
  let fxBuf = null;
  // o như v2 drawFace: back, bd, fx, fy, anim, eyes, mouth, pal, hair, skin. Chéo lên: chỉ lớp sau lưng (dây buộc...), dịch 1 cột ngược hướng mặt
  function drawFace(ctx, X, Y, id, o) {
    const it = V2.FACE_ITEMS[id];
    if (!it) return;
    const fx = o.fx, back = !!o.back, m = fx < 0, ex2 = Math.max(-1, Math.round(fx * 2)), ex3 = Math.round(fx * 2);
    const sd = Math.abs(fx) > 0.5 ? Math.sign(fx) : 0, diag = !back && o.fy > 0.38 && o.fy < 0.92;
    const EL = -4 + ex2, ER = 1 + ex2;
    const c = { back, fx, fy: o.fy, ex: ex2, sd, m, s: m ? -1 : 1, view: back ? 'back' : sd ? (diag ? 'diag' : 'side') : 'front', anim: o.anim || 0,
      eyes: o.eyes || null, mouth: !!o.mouth, EL, ER, PR: m ? ER : EL, PL: m ? EL : ER, skin: o.skin || o.pal.S, M: o.pal.M };
    const ops = back ? (it.back ? it.back(c) : []) : it.draw(c);
    const hp = Object.assign({ K: INK, W: '#ffffff', H: o.hair, h: V2.shade(o.hair, 0.3), L: V2.shade(o.hair, -0.35), S: o.pal.S, s: o.pal.s },
      typeof it.pal === 'function' ? it.pal(c) : it.pal || {});
    for (const op of ops) {
      let cells = upCells(op.cells, back ? 0 : ex2, back ? 0 : ex3);
      if (o.bd) cells = cells.map(([x, y, ch]) => [x - (m ? -1 : 1), y, ch]);
      paint(ctx, X, Y, Object.assign({}, op, { cells }), hp, back);
    }
    // hiệu ứng riêng của món (tia laser...): vẽ ở toạ độ v2 vào đệm rồi phóng theo đầu v3 (điểm gần nhất)
    if (it.fx && !back) {
      const W = 96, H = 96, ax = 48, ay = 64;
      if (!fxBuf) { fxBuf = document.createElement('canvas'); fxBuf.width = W; fxBuf.height = H; }
      const b = fxBuf.getContext('2d'); b.clearRect(0, 0, W, H);
      it.fx(b, ax, ay, c);
      const sx = 1 / KX, sy = 1 / KY, sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
      ctx.drawImage(fxBuf, X - ax * sx, Y - 30 - (ay - 25) * sy, W * sx, H * sy);
      ctx.imageSmoothingEnabled = sm;
    }
  }

  Object.assign(S3, { BALD, hasHair, hasFace, drawHead, drawFace, upLayer });
})();
