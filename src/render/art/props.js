/* Art props · props.js — đồ vật, công trình, cây cối dùng lại được, vẽ ở lưới px game. Gắn vào SFC.Art.Prop.
 * Mọi hàm: Prop.<tên>(ctx, x, y, opts). (x, y) = chân vật trên mặt đất (giữa đáy, trừ khi ghi khác). opts.seed đổi chi tiết ngẫu nhiên,
 * opts.t = thời gian cho phần đung đưa (lá, khói hương, đồ phơi). Kích cỡ theo luật bước 4: ghế 6 px, thùng 10, xe máy 14, người 24, cửa 32, 1 tầng 46.
 * Bóng đổ: ngắn, xuống dưới lệch phải (ánh sáng từ sau tường trên, lệch trái).
 */
window.SFC = window.SFC || {};

(function () {
  const Art = (SFC.Art = SFC.Art || {});
  const K = Art.Kit, { px, dot, R } = K;
  const P = (Art.Prop = {});
  const frame = (t, n, fps = 6) => Math.floor((t || 0) * fps) % n;

  /* ================= tường sân ================= */
  // tường đá ong mặt trước: khối 10 x 5 so le 2 tông, mỗi khối 1 mép sáng trên + 1 lỗ rỗ, mũ tường sáng, chân tường 1 dải rêu
  P.lateriteFace = function (c, x, y, w, h, o = {}) {
    const rnd = K.rng(o.seed || 11), base = R(o.color || '#b4683e'), tones = [base.m, K.tone(base.m, -4)];
    const top = y - h;
    px(c, x, top, w, h, base.o);
    for (let row = 0, by = top + 2; by < y; row++, by += 5) {
      const off = row & 1 ? 5 : 0;
      for (let bx = x - off; bx < x + w; bx += 10) {
        const x0 = Math.max(x, bx), x1 = Math.min(x + w, bx + 9), bh = Math.min(4, y - by);
        if (x1 <= x0 || bh <= 0) continue;
        const col = tones[rnd() < 0.35 ? 1 : 0];
        px(c, x0, by, x1 - x0, bh, col);
        px(c, x0, by, x1 - x0, 1, K.tone(col, 6));
        if (x1 - x0 > 4 && bh > 2) dot(c, x0 + 2 + Math.floor(rnd() * (x1 - x0 - 4)), by + 2, base.d);
      }
    }
    // mũ tường: mặt trên nhận nắng
    px(c, x, top, w, 2, K.tone(base.m, 12));
    px(c, x, top, w, 1, K.tone(base.m, 18, 0.8));
    // rêu chân tường: 1 dải + vài bướu
    px(c, x, y - 1, w, 1, '#6e7a3e');
    for (let i = 3; i < w - 3; i += 9 + Math.floor(rnd() * 8)) px(c, x + i, y - 2, 3, 1, '#72823e');
  };
  // tường đá ong nhìn từ trên (viền 2 bên sân): khối so le 2 tông, mép trái sáng
  P.lateriteTop = function (c, x, y, w, h, o = {}) {
    const rnd = K.rng(o.seed || 12), base = R(o.color || '#b4683e');
    px(c, x, y, w, h, base.o);
    const cols = Math.max(1, Math.floor((w - 2) / 7));
    const bw = Math.floor((w - 2) / cols);
    for (let ci = 0; ci < cols; ci++) {
      for (let by = y + 1 - (ci & 1 ? 5 : 0); by < y + h; by += 10) {
        const y0 = Math.max(y + 1, by), y1 = Math.min(y + h - 1, by + 9);
        if (y1 <= y0) continue;
        const bx = x + 1 + ci * bw, col = K.tone(base.m, rnd() < 0.35 ? 4 : 8);
        px(c, bx, y0, bw - 1, y1 - y0, col);
        px(c, bx, y0, 1, y1 - y0, K.tone(col, 6));
      }
    }
  };
  // tường trên: rào tre đan mắt cáo trên chân đá ong. y = mặt sân (đáy chân tường), h = tổng cao (46)
  P.topWall = function (c, x, y, w, h, o = {}) {
    const rnd = K.rng(o.seed || 21), baseH = 14, ly = y - baseH, lh = h - baseH;
    const B = R('#b8994e'), Bd = R('#9c7f38');
    // mắt cáo thưa: nan tre chẻ 1 px chéo 2 chiều, mắt 10 px -> nhìn rõ người sau rào
    const r0 = ly - lh + 4, r1 = ly - 3, S = 10;
    c.save();
    c.beginPath(); c.rect(x, r0, w, r1 - r0); c.clip();
    for (let k = -lh; k < w + lh; k += S) {
      K.line(c, x + k, r0, x + k + (r1 - r0), r1, K.rgba(B.l, 0.85));
      K.line(c, x + k + (r1 - r0), r0, x + k, r1, K.rgba(Bd.m, 0.85));
    }
    c.restore();
    // nút buộc ở 1 số chỗ chéo nhau
    for (let k = x; k < x + w; k += S) for (let j = r0 + S / 2; j < r1; j += S) if (rnd() < 0.5) dot(c, k + S / 2, j, '#6a4a2a');
    // 2 thanh ngang tre chẻ (trên, dưới)
    for (const ry of [r0 - 1, r1]) { px(c, x, ry, w, 2, B.m); px(c, x, ry, w, 1, B.h); px(c, x, ry + 2, w, 1, K.rgba(B.o, 0.7)); }
    // cột tre to: mấu đốt, đầu cắt
    for (let px0 = x + 2; px0 < x + w; px0 += 32) {
      const lean = rnd() < 0.3 ? 1 : 0, ph = lh + 3 + Math.floor(rnd() * 3), col = rnd() < 0.25 ? R('#a89a70') : B;
      const top = ly - ph;
      px(c, px0 - 1, top - 1, 6, ph + 1, col.o);
      px(c, px0, top, 4, ph, col.m); px(c, px0, top, 1, ph, col.h); px(c, px0 + 3, top, 1, ph, col.d);
      for (let ny = top + 5 + lean; ny < ly; ny += 8) { px(c, px0, ny, 4, 1, col.o); px(c, px0, ny + 1, 4, 1, col.l); }
      px(c, px0, top, 4, 1, '#e6d49a'); dot(c, px0 + 1, top, '#c8b070');
      // dây buộc ở thanh ngang
      for (const ry of [r0, r1]) { px(c, px0 - 1, ry - 1, 6, 1, '#6a4a2a'); px(c, px0 - 1, ry + 1, 6, 1, '#5a3c22'); }
    }
    P.lateriteFace(c, x, y, w, baseH, { seed: (o.seed || 21) + 1 });
  };
  // bóng tường đổ lên mặt sân (tường trên) + dải tối chỗ tường gặp đất
  P.wallShadowTop = function (c, x, y, w, len = 7) {
    for (let i = 0; i < len; i++) px(c, x, y + i, w, 1, `rgba(52,34,30,${(0.3 * (1 - i / len)).toFixed(3)})`);
  };

  /* ================= nhà ================= */
  // nhà cấp 4 mái ngói: x = mép trái tường, y = chân nền. w rộng tường, wallH, roofH
  P.house = function (c, x, y, o = {}) {
    const rnd = K.rng(o.seed || 31), w = o.w || 110, wallH = o.wallH || 30, roofH = o.roofH || 22;
    const Wl = R(o.wall || '#dcc27a'), Rf = R(o.roof || '#b0583c'), Dr = R(o.door || '#4a6a68'), Pl = R('#9a9078');
    const plinth = 4, wy = y - plinth, wt = wy - wallH, ov = 6;
    // bóng đổ của cả nhà xuống đất (dưới, lệch phải)
    K.castBox(c, x + 4, y, w, 5, 0.9);
    // nền + bậc
    px(c, x - 3, wy, w + 6, plinth, Pl.o); px(c, x - 2, wy, w + 4, plinth - 1, Pl.m); px(c, x - 2, wy, w + 4, 1, Pl.h);
    // tường vôi
    px(c, x, wt, w, wallH, Wl.m);
    // vài vệt mốc từ mái chảy xuống + chân tường bẩn (1 dải phẳng)
    for (let i = 0; i < w / 24; i++) px(c, x + 6 + Math.floor(rnd() * (w - 12)), wt + 6, 2, 4 + Math.floor(rnd() * (wallH * 0.4)), K.mix(Wl.m, '#8a8a68', 0.3));
    px(c, x, wy - 4, w, 4, K.mix(Wl.m, '#7a7a5a', 0.35));
    // hiên: bóng mái hắt xuống tường
    for (let i = 0; i < 7; i++) px(c, x, wt + i, w, 1, `rgba(60,40,40,${(0.32 - i * 0.04).toFixed(2)})`);
    // cửa chính giữa: 2 cánh mở, trong tối, thấp thoáng bàn thờ
    const dw = o.doorW || 16, dh = Math.min(wallH - 6, 22), dx = x + Math.round((w - dw) / 2) + (o.doorOff || 0), dy = wy - dh;
    px(c, dx - 2, dy - 2, dw + 4, dh + 2, Dr.o);
    px(c, dx, dy, dw, dh, '#2a2224');
    px(c, dx, dy, dw, 3, '#1e181a');
    if (o.altar !== false) {
      px(c, dx + dw / 2 - 4, dy + 6, 8, 3, '#7a2a22'); px(c, dx + dw / 2 - 3, dy + 4, 6, 2, '#a8843a'); dot(c, dx + dw / 2 - 1, dy + 3, '#e8c060'); dot(c, dx + dw / 2, dy + 3, '#ff9a50');
      px(c, dx + 2, dy + 9, dw - 4, 1, '#3a2c28');
    }
    // cánh cửa gập 2 bên (ván dọc)
    for (const side of [0, 1]) {
      const lx = side ? dx + dw - 3 : dx;
      px(c, lx, dy, 3, dh, Dr.m); px(c, lx + (side ? 0 : 2), dy, 1, dh, Dr.d); dot(c, lx + 1, dy + dh / 2, '#c8a860');
      for (let j = dy + 3; j < dy + dh; j += 6) px(c, lx, j, 3, 1, Dr.d);
    }
    // câu đối giấy đỏ 2 bên cửa
    if (o.couplet !== false) for (const cx2 of [dx - 6, dx + dw + 3]) { px(c, cx2, dy + 1, 3, 13, '#b8342a'); for (let j = dy + 3; j < dy + 13; j += 3) dot(c, cx2 + 1, j, '#e8c060'); }
    // cửa sổ: song sắt, cánh gỗ mở
    const win = (wx) => {
      const ww = 12, wh = 11, wy2 = wy - dh + 1;
      px(c, wx - 4, wy2 - 1, ww + 8, wh + 2, Dr.o);
      px(c, wx - 3, wy2, 3, wh, Dr.m); px(c, wx + ww, wy2, 3, wh, Dr.m); px(c, wx - 3, wy2, 1, wh, Dr.l); px(c, wx + ww + 2, wy2, 1, wh, Dr.d);
      px(c, wx, wy2, ww, wh, '#2c2628'); px(c, wx, wy2 + wh - 3, ww, 3, '#3a3234');
      for (let b = wx + 1; b < wx + ww; b += 3) px(c, b, wy2, 1, wh, '#6a6a70');
      px(c, wx - 1, wy2 + wh, ww + 2, 1, Wl.h); px(c, wx - 1, wy2 + wh + 1, ww + 2, 1, Wl.o);
    };
    const nWin = o.windows == null ? 2 : o.windows;
    if (nWin >= 1) win(x + 10);
    if (nWin >= 2) win(x + w - 22);
    // cột hiên vuông
    for (const cx2 of o.pillars || [x + 1, x + w - 4]) { px(c, cx2 - 1, wt - 1, 5, wallH + 1, Wl.o); px(c, cx2, wt, 3, wallH, Wl.l); px(c, cx2 + 2, wt, 1, wallH, Wl.d); px(c, cx2 - 1, wy - 3, 5, 3, Pl.m); }
    // đồ treo dưới hiên: bóng đèn + lịch
    if (o.bulb !== false) { px(c, x + w / 2 - 22, wt, 1, 4, '#3a3030'); px(c, x + w / 2 - 23, wt + 4, 3, 3, '#f2e8c0'); dot(c, x + w / 2 - 23, wt + 4, '#ffffff'); }
    if (o.calendar) { px(c, dx + dw + 8, wt + 9, 6, 8, '#f0ece2'); px(c, dx + dw + 8, wt + 9, 6, 2, '#c83a30'); px(c, dx + dw + 9, wt + 12, 4, 1, '#8a8a8a'); px(c, dx + dw + 9, wt + 14, 3, 1, '#8a8a8a'); }
    // mái ngói: dải mái trước nhìn từ trên, rộng hơn tường, lấn xuống tường ov px
    const rx = x - 5, rw = w + 10, ry = wt - roofH + ov, rh = roofH;
    px(c, rx - 1, ry - 1, rw + 2, rh + 2, Rf.o);
    for (let row = 0; row * 3 < rh - 3; row++) {
      const yy = ry + 3 + row * 3, off = row & 1 ? 2 : 0;
      px(c, rx, yy, rw, 3, row % 4 === 1 ? K.tone(Rf.m, 2) : Rf.m);
      px(c, rx, yy, rw, 1, Rf.l);
      for (let tx = rx + off; tx < rx + rw; tx += 4) { dot(c, tx, yy + 2, Rf.d); dot(c, tx + 1, yy + 2, Rf.d); dot(c, tx + 3, yy, K.tone(Rf.m, -6)); }
    }
    // sáng dần lên phía đỉnh mái (gần nắng hơn)
    for (let i = 0; i < 6; i++) px(c, rx, ry + 3 + i, rw, 1, `rgba(255,236,200,${(0.12 - i * 0.02).toFixed(2)})`);
    // 2–3 viên ngói thay mới
    for (let i = 0; i < rw / 45; i++) { const tx = rx + 6 + Math.floor(rnd() * (rw - 12)), ty = ry + 6 + 3 * Math.floor(rnd() * ((rh - 10) / 3)); px(c, tx, ty, 4, 2, K.tone(Rf.m, 8, 1.1)); }
    // nóc mái: bờ nóc + 2 đầu đao cong
    px(c, rx + 2, ry - 2, rw - 4, 4, Rf.o); px(c, rx + 3, ry - 1, rw - 6, 2, K.tone(Rf.m, 6)); px(c, rx + 3, ry - 1, rw - 6, 1, Rf.h);
    for (let tx = rx + 5; tx < rx + rw - 5; tx += 5) dot(c, tx, ry, Rf.d);
    for (const [ex, d] of [[rx + 1, -1], [rx + rw - 2, 1]]) { px(c, ex, ry - 3, 2, 3, Rf.o); dot(c, ex + d, ry - 4, Rf.o); dot(c, ex, ry - 2, Rf.l); }
    // mép giọt gianh + bóng dưới mép mái
    px(c, rx, ry + rh - 1, rw, 1, Rf.o); px(c, rx, ry + rh, rw, 1, 'rgba(50,30,30,0.35)');
    // ăng-ten TV trên mái
    if (o.antenna) {
      const ax = rx + o.antenna;
      px(c, ax, ry - 22, 1, 22, '#7a7a80'); for (const [ay, aw] of [[ry - 20, 9], [ry - 15, 7], [ry - 10, 5]]) px(c, ax - (aw >> 1), ay, aw, 1, '#8a8a90');
      K.sag(c, ax, ry - 12, ax + 30, ry + 2, 3, 'rgba(40,40,40,0.5)');
    }
    return { roofTop: ry - 2, wallTop: wt };
  };

  /* ================= cây ================= */
  // 1 chùm lá: viền tối, thân tối, mặt giữa lệch trên-trái, mảng sáng, 1 vệt bóng sáng (phẳng, 3–4 tông, không chấm lá lẻ)
  function clump(c, x, y, rx, ry, G) {
    K.ellipse(c, x, y + 1, rx + 1, ry + 1, G.o);
    K.ellipse(c, x, y, rx, ry, G.d);
    K.ellipse(c, x - 1, y - 1, Math.max(1, rx - 1), Math.max(1, ry - 1), G.m);
    K.ellipse(c, x - Math.round(rx * 0.3), y - Math.round(ry * 0.35), Math.max(1, Math.round(rx * 0.5)), Math.max(1, Math.round(ry * 0.45)), G.l);
    if (rx > 4) px(c, x - Math.round(rx * 0.45), y - Math.round(ry * 0.6), 2, 1, G.h);
  }
  // tán lá: vài chùm tròn lớn chồng nhau, chùm thấp hơn vẽ sau (đè lên chùm sau)
  P.canopy = function (c, cx, cy, rx, ry, base, o = {}) {
    const rnd = K.rng(o.seed || 41), G = R(base), n = Math.max(3, Math.round((rx * ry) / 70));
    const clumps = [];
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * 0.75;
      const r = Math.max(3, Math.round(Math.min(rx, ry) * (0.4 + rnd() * 0.2)));
      clumps.push({ x: Math.round(cx + Math.cos(a) * d * (rx - r)), y: Math.round(cy + Math.sin(a) * d * (ry - r * 0.6)), r });
    }
    clumps.sort((a, b) => a.y - b.y);
    for (const k of clumps) clump(c, k.x, k.y, k.r, Math.max(2, Math.round(k.r * 0.8)), G);
  };
  // cây đa: 3 gốc thân, cành chìa, tán rộng nhiều chùm, vài rễ phụ thõng
  P.banyan = function (c, x, y, o = {}) {
    const Tr = R('#7a6a58'), rx = o.rx || 52, ry = o.ry || 34;
    const cy = y - 34 - ry;
    c.save(); c.globalAlpha = 0.85; K.ellipse(c, x + 14, y + 4, rx - 6, 12, K.SHADOW); c.restore();
    for (const d of [-14, -7, 7, 14]) K.line(c, x + d * 0.3, y - 3, x + d, y + 1, Tr.d);
    for (const [dx, w, hh] of [[-9, 6, 32], [5, 5, 30], [-3, 9, 42]]) {
      px(c, x + dx - 1, y - hh, w + 2, hh + 1, Tr.o);
      px(c, x + dx, y - hh, w, hh, Tr.m); px(c, x + dx, y - hh, 2, hh, Tr.l); px(c, x + dx + w - 2, y - hh, 2, hh, Tr.d);
    }
    K.line(c, x - 4, y - 36, x - 30, y - 50, Tr.o); K.line(c, x - 4, y - 37, x - 30, y - 51, Tr.m);
    K.line(c, x + 6, y - 36, x + 34, y - 48, Tr.o); K.line(c, x + 6, y - 37, x + 34, y - 49, Tr.m);
    P.canopy(c, x - 18, cy + 8, rx * 0.55, ry * 0.7, '#4f7a38', { seed: (o.seed || 51) + 1 });
    P.canopy(c, x + 20, cy + 10, rx * 0.55, ry * 0.68, '#4a7434', { seed: (o.seed || 51) + 2 });
    P.canopy(c, x, cy, rx * 0.7, ry * 0.75, '#53803a', { seed: (o.seed || 51) + 3 });
    const sw = frame(o.t, 4, 1);
    for (let i = 0; i < 7; i++) {
      const rx0 = Math.round(x - rx * 0.6 + i * rx * 0.2), ry0 = Math.round(cy + ry * 0.6), len = 10 + ((i * 7) % 11);
      K.line(c, rx0, ry0, rx0 + ((i + sw) % 3 === 0 ? 1 : 0), ry0 + len, '#6a5c48');
    }
  };
  // lũy tre: bụi thân tre mảnh ở gốc, tán là các chùm lá dẹt rủ hình đài phun (giữa cao, 2 bên thấp dần). far = nhạt vào sương
  P.bamboo = function (c, x, y, o = {}) {
    const rnd = K.rng(o.seed || 61), n = o.n || 9, h = o.h || 60, far = o.far || 0;
    const haze = (col) => (far ? K.mix(col, o.hazeCol || '#c8d8c0', far) : col);
    const Cu = R(haze('#9aa652')), G = R(haze('#6a9640'));
    if (!far) K.shadow(c, x + 6, y, 12, 2);
    const sw = frame(o.t, 4, 2) & 1;
    for (let i = 0; i < n; i++) {
      const bx = x + Math.round((i - (n - 1) / 2) * 2), lean = ((i - (n - 1) / 2) / n) * 1.6;
      for (let k = 0; k < h * 0.6; k++) px(c, bx + lean * k * (k / h) * 0.8, y - k, 2, 1, k % 8 === 0 ? Cu.o : k % 8 === 1 ? Cu.l : Cu.m);
    }
    const m = Math.max(5, Math.round(n * 0.8)), plumes = [];
    for (let i = 0; i < m; i++) {
      const k = i / (m - 1) - 0.5;
      plumes.push({ x: Math.round(x + k * h * 0.9 + (k > 0 ? sw : 0)), y: Math.round(y - h * (0.95 - Math.abs(k) * 0.9)), rx: Math.round(h * 0.15 + rnd() * 3), ry: Math.round(h * 0.08 + rnd() * 2) });
    }
    plumes.push({ x, y: Math.round(y - h * 0.62), rx: Math.round(h * 0.18), ry: Math.round(h * 0.1) });
    plumes.sort((a, b) => a.y - b.y);
    for (const p of plumes) {
      clump(c, p.x, p.y, p.rx, p.ry, G);
      // đầu chùm: 2 lá tre nhọn rủ xuống
      const d = p.x < x ? -1 : 1;
      px(c, p.x + d * (p.rx + 1), p.y + 1, 1, 2, G.d); px(c, p.x + d * (p.rx - 2), p.y + p.ry, 1, 2, G.d);
    }
  };
  // chỗ rách lá chuối: 0 = lành, 1 / -1 = rách nửa này / nửa kia
  const hashTear = (k, s) => { const h = ((k * 73856093) ^ (s * 19349663)) >>> 0; return h % 6 === 0 ? 1 : h % 6 === 3 ? -1 : 0; };
  // 1 tàu lá: đi dọc đường cong từ gốc (x, y), hướng a (rad), rủ droop; rộng wMax; comb = mép răng cưa (lá cau); tear = rách (lá chuối)
  function frond(c, x, y, a, len, droop, wMax, L, o = {}) {
    const pts = [];
    for (let k = 0; k <= len; k++) pts.push([x + Math.cos(a) * k, y + Math.sin(a) * k + (droop * k * k) / (len * len)]);
    for (const pass of [0, 1]) {
      for (let k = 1; k <= len; k++) {
        const [X, Y] = pts[k], [X0, Y0] = pts[k - 1], dl = Math.hypot(X - X0, Y - Y0) || 1, nx = -(Y - Y0) / dl, ny = (X - X0) / dl;
        const t = k / len;
        // lá chuối: bản rộng đều, đầu tù; lá cau: thon 2 đầu
        const prof = o.paddle ? Math.min(1, t / 0.15) * (t > 0.85 ? (1 - t) / 0.15 + 0.3 : 1) : Math.sin(Math.PI * Math.min(1, t * 1.1));
        const w = Math.max(0, Math.round(prof * wMax));
        // vết rách: khe 1 px từ mép vào gân, ở vài chỗ dọc lá
        const tear = o.tear && t > 0.3 && hashTear(k, o.seed || 7);
        for (let s = -w; s <= w; s++) {
          if (o.comb && s !== 0 && k % 2 === 0 && Math.abs(s) === w) continue;
          if (tear && Math.abs(s) > 1 && (tear > 0 ? s > 0 : s < 0)) continue;
          const up = s * ny < 0;
          const X2 = X + nx * s, Y2 = Y + ny * s;
          if (pass === 0) { dot(c, X2 + 1, Y2 + 1, L.o); continue; }
          dot(c, X2, Y2, s === 0 ? L.h : up ? (t < 0.6 ? L.l : L.m) : L.d);
        }
      }
    }
  }
  P.frond = frond;
  // chuối: thân giả, tàu lá to rách rủ ra 2 bên, lá khô thõng
  P.banana = function (c, x, y, o = {}) {
    const h = o.h || 22, T = R('#7f8c4c'), L = R('#6aa040'), Dry = R('#a08a5a');
    K.shadow(c, x + 4, y, 11, 2);
    px(c, x - 2, y - h, 5, h, T.o); px(c, x - 1, y - h, 3, h, T.m); px(c, x - 1, y - h, 1, h, T.l); px(c, x + 1, y - h, 1, h, T.d);
    for (let j = y - h + 3; j < y; j += 5) dot(c, x, j, T.d);
    // lá khô thõng bên thân
    px(c, x + 2, y - h + 3, 3, 9, Dry.o); px(c, x + 2, y - h + 3, 2, 8, Dry.m); dot(c, x + 2, y - h + 4, Dry.h);
    const cy = y - h + 1, s = o.size || 1;
    // tàu lá già rủ ngang 2 bên, lá non chĩa chéo lên, búp giữa thẳng
    const leaves = [[-2.95, 18, 10, 3], [-0.2, 18, 10, 3], [-2.35, 16, 4, 3], [-0.8, 16, 4, 3], [-1.5, 11, 0.5, 2]];
    leaves.forEach(([a, len, droop, w], i) => frond(c, x, cy, a, Math.round(len * s), droop * s, w, L, { tear: i < 4, paddle: true, seed: (o.seed || 71) + i }));
    // bắp chuối tím nhỏ
    if (o.flower) { px(c, x + 3, cy + 2, 1, 4, T.d); px(c, x + 3, cy + 6, 3, 4, '#7a3a4a'); dot(c, x + 3, cy + 6, '#a85a6a'); }
  };
  // cau: thân mảnh vòng đốt, tán tàu lá lược rủ, buồng cau
  P.areca = function (c, x, y, o = {}) {
    const h = o.h || 64, T = R('#a49a86'), L = R('#5f9040'), bend = o.bend || 2;
    K.shadow(c, x + 3, y, 5, 1);
    for (let k = 0; k < h; k++) {
      const X = x + Math.round(bend * Math.sin((k / h) * Math.PI * 0.5));
      px(c, X - 1, y - k, 3, 1, k % 4 === 0 ? T.d : T.m); dot(c, X - 1, y - k, T.l);
    }
    const tx = x + bend, ty = y - h, sw = frame(o.t, 4, 2) === 1 ? 0.04 : 0;
    px(c, tx - 1, ty, 3, 6, '#7a9a4a'); dot(c, tx - 1, ty + 1, '#9aba5a');   // bẹ cau xanh
    // tán ô: tàu ngoài rủ mạnh, tàu trong cong nhẹ
    const fr = [[-3.05, 18, 11], [-0.1, 18, 11], [-2.6, 16, 8], [-0.55, 16, 8], [-2.1, 13, 4], [-1.05, 13, 4], [-1.57, 8, 1]];
    fr.forEach(([a, len, droop], i) => frond(c, tx, ty, a + sw, len, droop, 2, L, { comb: true, seed: i }));
    px(c, tx - 3, ty + 4, 3, 3, '#6a5a2a'); dot(c, tx - 3, ty + 4, '#c8a040'); dot(c, tx - 2, ty + 6, '#d8b040');   // buồng cau
  };
  P.bush = function (c, x, y, o = {}) {
    const r = o.r || 6;
    K.shadow(c, x + 1, y, r + 1, 2);
    P.canopy(c, x, y - Math.round(r * 0.7), r, Math.round(r * 0.75), o.color || '#5a8a3a', { seed: o.seed || 81 });
    if (o.flowers) { const rnd = K.rng((o.seed || 81) + 5); for (let i = 0; i < r; i++) dot(c, x + Math.round((rnd() - 0.5) * r * 1.6), y - Math.round(r * 0.7) + Math.round((rnd() - 0.6) * r), o.flowers); }
  };
  // khóm cỏ: dấu "v / w" 2 tông (ngọn sáng, gốc tối), 3 kiểu
  const TUFT = [['L.L', '.D.'], ['L..L', '.LL.', '.DD.'], ['.L.L.', 'L.L.L', '.D.D.']];
  P.tuft = function (c, x, y, o = {}) {
    const g = TUFT[(o.kind || 0) % TUFT.length], G = R(o.color || '#69784a');
    K.art(c, x - (g[0].length >> 1), y - g.length + 1, g, { L: G.h, D: G.o });
  };
  /* ================= đồ trong làng ================= */
  // ghế nhựa: hình nằm ở npcs.js (người ngồi tự vẽ ghế), đây là bản đứng riêng
  P.stool = (c, x, y, col) => Art.Npc.stool(c, x, y, col);
  // đống rơm: nón quanh cọc, 3 dải dọc sáng / giữa / tối, đỉnh sáng nhất, vài sợi rơm
  P.haystack = function (c, x, y, o = {}) {
    const r = o.r || 12, h = o.h || Math.round(r * 2), rnd = K.rng(o.seed || 101), S = R('#d4b45a');
    K.shadow(c, x + 3, y, r + 3, 3);
    px(c, x, y - h - 6, 1, 8, '#6a5030');
    for (let j = 0; j < h; j++) {
      const t = j / h, half = Math.round(r * Math.pow(t, 0.75)), yy = y - h + j;
      if (half <= 0) { dot(c, x, yy, S.o); continue; }
      const a = Math.round(half * 0.35);
      px(c, x - half - 1, yy, half * 2 + 3, 1, S.o);
      px(c, x - half, yy, half * 2 + 1, 1, S.m);
      px(c, x - half, yy, half - a, 1, t < 0.35 ? S.h : S.l);
      px(c, x + a + 1, yy, half - a, 1, S.d);
    }
    for (let i = 0; i < 5; i++) px(c, x - r * 0.6 + rnd() * r * 1.2, y - h * 0.2 - rnd() * h * 0.5, 1, 3, S.d);
    px(c, x - r - 1, y - 2, r * 2 + 3, 2, S.d);
    for (let i = 0; i < 4; i++) px(c, x + Math.round((rnd() - 0.5) * r * 3), y + Math.floor(rnd() * 3), 3, 1, S.l);
  };
  // giếng tròn đá ong: thành giếng, miệng nước tối, gàu + dây
  P.well = function (c, x, y, o = {}) {
    const L = R('#a86a44'), Wt = R('#3a5a6a');
    K.shadow(c, x + 3, y, 12, 3);
    px(c, x - 11, y - 9, 22, 9, L.o); px(c, x - 10, y - 8, 20, 7, L.m);
    for (let i = 0; i < 4; i++) px(c, x - 10 + i * 5 + (i & 1), y - 8, 1, 7, L.d);
    px(c, x - 10, y - 5, 20, 1, L.d);
    K.ellipse(c, x, y - 11, 11, 4, L.o); K.ellipse(c, x, y - 11, 10, 3, L.l); K.ellipse(c, x, y - 11, 7, 2, Wt.o);
    K.ellipse(c, x, y - 11, 6, 1, Wt.m); px(c, x - 3, y - 11, 2, 1, '#9ac0d0');
    px(c, x - 10, y - 13, 7, 1, L.h);
    // gàu tôn trên miệng giếng + dây
    px(c, x + 5, y - 15, 5, 4, '#6a6a72'); px(c, x + 6, y - 15, 3, 1, '#9a9aa4'); K.line(c, x + 7, y - 15, x + 12, y - 19, '#8a7a5a'); K.line(c, x + 12, y - 19, x + 14, y - 8, '#8a7a5a');
  };
  // chum sành có nắp gỗ
  P.jar = function (c, x, y, o = {}) {
    const J = R(o.color || '#7a5038');
    K.shadow(c, x + 2, y, 6, 2);
    K.ellipse(c, x, y - 6, 6, 5, J.o); K.ellipse(c, x, y - 6, 5, 4, J.m); K.ellipse(c, x - 2, y - 8, 2, 1, J.h);
    px(c, x + 2, y - 7, 2, 4, J.d);
    px(c, x - 4, y - 12, 8, 2, J.o); px(c, x - 3, y - 12, 6, 1, J.l);
    if (o.lid !== false) { px(c, x - 5, y - 14, 10, 2, '#5a4430'); px(c, x - 4, y - 14, 8, 1, '#8a6a48'); }
  };
  // nia / nong phơi: mâm tre tròn nhìn từ trên, đựng thóc / ớt / ngô / đậu
  P.tray = function (c, x, y, o = {}) {
    const r = o.r || 10, B = R('#a07a44');
    const F = R({ rice: '#d8b04a', chili: '#c8402e', corn: '#e8b838', bean: '#6a4a3a' }[o.content || 'rice']);
    const ry = Math.round(r * 0.5);
    K.shadow(c, x + 2, y + 1, r + 1, ry + 1);
    K.ellipse(c, x, y, r + 1, ry + 1, B.o);
    K.ellipse(c, x, y, r, ry, B.l);
    K.ellipse(c, x, y, r - 2, ry - 1, F.d);
    K.ellipse(c, x - 1, y - 1, r - 3, Math.max(1, ry - 2), F.m);
    px(c, x - Math.round(r * 0.5), y - Math.round(ry * 0.5), 3, 1, F.h);
  };
  // bạt phơi thóc: tấm bạt xanh, thóc vàng có vệt cào
  P.tarp = function (c, x, y, o = {}) {
    const w = o.w || 50, h = o.h || 26, T = R('#4a7aa8'), F = R('#d6ae48');
    px(c, x, y, w, h, T.o); px(c, x + 1, y + 1, w - 2, h - 2, T.m);
    px(c, x + 1, y + 1, w - 2, 1, T.l);
    px(c, x + 3, y + 3, w - 6, h - 6, F.m);
    for (let j = y + 5; j < y + h - 4; j += 4) px(c, x + 5, j, w - 10, 1, F.d);
    px(c, x + 3, y + 3, w - 6, 1, F.l);
    for (const [cx2, cy2] of [[x, y], [x + w - 3, y], [x, y + h - 3], [x + w - 3, y + h - 3]]) { px(c, cx2, cy2, 3, 3, '#8a8478'); dot(c, cx2, cy2, '#b0aa9c'); }
  };
  // luống rau: đất vun, hàng cây con
  P.vegBed = function (c, x, y, o = {}) {
    const w = o.w || 60, h = o.h || 6, rnd = K.rng(o.seed || 131), E = R('#6e5236'), G = R(o.leaf || '#5e9a3e');
    px(c, x, y, w, h, E.o); px(c, x + 1, y, w - 2, h - 2, E.m); px(c, x + 1, y, w - 2, 1, E.l);
    for (let i = x + 3; i < x + w - 3; i += 5) {
      const yy = y + 1 + (rnd() < 0.5 ? 0 : 1);
      K.art(c, i - 2, yy - 3, ['.L.L.', 'LmLmL', '.dmd.'], { L: G.h, m: G.m, d: G.d });
    }
  };
  // giàn bầu bí: khung tre, mái lá phẳng, quả treo
  P.trellis = function (c, x, y, o = {}) {
    const w = o.w || 40, h = o.h || 22, rnd = K.rng(o.seed || 141), B = R('#a08a5a'), G = R('#5a9038');
    K.castBox(c, x + 4, y - 2, w, 6, 0.6);
    for (const px0 of [x, x + w - 2, x + Math.round(w / 2)]) { px(c, px0, y - h, 2, h, B.d); dot(c, px0, y - h, B.h); }
    // mái lá
    const ty = y - h - 6;
    px(c, x - 3, ty, w + 6, 8, G.o);
    for (let i = 0; i < w * 2.5; i++) {
      const lx = x - 2 + Math.floor(rnd() * (w + 4)), ly = ty + Math.floor(rnd() * 7);
      K.art(c, lx - 1, ly - 1, ['.L.', 'LmL', '.d.'], { L: ly < ty + 3 ? G.h : G.l, m: G.m, d: G.d });
    }
    // quả bầu treo dưới giàn
    for (let i = 0; i < 4; i++) {
      const gx = x + 5 + Math.floor(rnd() * (w - 10)), gy = ty + 8;
      px(c, gx, gy, 1, 2, G.d); px(c, gx - 1, gy + 2, 3, 6, '#5a7a3a'); px(c, gx - 1, gy + 2, 2, 5, '#b8cc80'); dot(c, gx - 1, gy + 3, '#e0eab0');
    }
  };
  // dây phơi đồ giữa 2 cọc, quần áo đung đưa
  P.clothesline = function (c, x0, y0, x1, o = {}) {
    const items = o.items || ['#c8574a', '#5a7ab0', '#e8e0d0', '#7a9a6a', '#d8b848'], sw = frame(o.t, 2, 2), H = 16;
    for (const px0 of [x0, x1]) { px(c, px0 - 1, y0 - H - 1, 3, H + 1, '#5a4430'); px(c, px0, y0 - H, 1, H, '#8a6a48'); K.shadow(c, px0, y0, 2, 1); }
    const ly = y0 - H + 1;
    K.sag(c, x0, ly, x1, ly, 3, '#4a4a4a');
    const n = items.length, step = (x1 - x0) / (n + 1);
    items.forEach((col, i) => {
      const cx2 = Math.round(x0 + step * (i + 1)), k = (cx2 - x0) / (x1 - x0), yy = Math.round(ly + Math.sin(k * Math.PI) * 3) + 1, C = R(col), d = (i + sw) & 1;
      if (i % 3 === 1) { px(c, cx2 - 3, yy, 7, 2, C.o); px(c, cx2 - 3 + d, yy + 1, 3, 7, C.m); px(c, cx2 + 1 + d, yy + 1, 3, 7, C.d); }   // quần
      else { px(c, cx2 - 5, yy, 11, 4, C.o); px(c, cx2 - 4, yy, 9, 3, C.m); px(c, cx2 - 3 + d, yy + 3, 7, 6, C.o); px(c, cx2 - 2 + d, yy + 3, 5, 5, C.m); px(c, cx2 - 2 + d, yy + 3, 5, 1, C.l); dot(c, cx2 + 2 + d, yy + 5, C.d); }   // áo
      dot(c, cx2, yy - 1, '#d8d0c0');
    });
  };
  // xe đạp cũ (nhìn ngang), giỏ trước. face 'left' lật
  P.bike = function (c, x, y, o = {}) {
    const F = R(o.color || '#3a6a78'), t = o.t || 0;
    const draw = () => {
      K.shadow(c, x, y, 11, 1);
      const wheel = (cx2) => {
        for (let a = 0; a < 24; a++) { const A = (a / 24) * Math.PI * 2; dot(c, cx2 + Math.round(Math.cos(A) * 5), y - 5 + Math.round(Math.sin(A) * 5), '#2e2a2a'); }
        const sp = frame(t, 2, 8);
        K.line(c, cx2 - 3 + sp, y - 8, cx2 + 3 - sp, y - 2, '#9a9aa0'); K.line(c, cx2 - 3, y - 5 + sp, cx2 + 3, y - 5 - sp, '#9a9aa0'); dot(c, cx2, y - 5, '#c8c8d0');
      };
      wheel(x - 8); wheel(x + 8);
      K.line(c, x - 8, y - 5, x - 1, y - 5, F.m); K.line(c, x - 1, y - 5, x - 4, y - 11, F.m); K.line(c, x - 4, y - 11, x + 6, y - 11, F.m); K.line(c, x - 1, y - 5, x + 6, y - 11, F.l);
      K.line(c, x + 6, y - 11, x + 8, y - 5, F.d); K.line(c, x + 6, y - 11, x + 5, y - 14, F.d);
      px(c, x + 3, y - 15, 5, 1, '#3a3a3a');
      px(c, x - 6, y - 13, 5, 2, '#3a2c28');
      if (o.basket !== false) { px(c, x + 7, y - 14, 6, 4, '#8a6a3a'); px(c, x + 8, y - 14, 4, 1, '#b8945a'); dot(c, x + 9, y - 12, '#6a5030'); }
      px(c, x - 1, y - 6, 3, 2, '#5a5a60');
    };
    if (o.face === 'left') { c.save(); c.translate(2 * x + 1, 0); c.scale(-1, 1); draw(); c.restore(); } else draw();
  };
  // xe máy số kiểu cũ (nhìn ngang), 14 px cao
  P.scooter = function (c, x, y, o = {}) {
    const F = R(o.color || '#b0403a'), draw = () => {
      K.shadow(c, x, y, 13, 2);
      for (const cx2 of [x - 9, x + 9]) { K.ellipse(c, cx2, y - 4, 4, 4, '#262224'); K.ellipse(c, cx2, y - 4, 2, 2, '#8a8a90'); dot(c, cx2, y - 4, '#c8c8d0'); }
      // thân: yếm trước, sàn để chân, yên dài, hộp đuôi
      px(c, x + 4, y - 13, 5, 9, F.o); px(c, x + 5, y - 12, 3, 7, F.m); dot(c, x + 5, y - 12, F.h);
      px(c, x - 4, y - 6, 10, 3, '#3a3a40');
      px(c, x - 12, y - 11, 13, 6, F.o); px(c, x - 11, y - 10, 11, 4, F.m); px(c, x - 11, y - 10, 11, 1, F.l);
      px(c, x - 12, y - 13, 12, 3, '#2a2426'); px(c, x - 11, y - 13, 10, 1, '#4a4246');
      px(c, x + 6, y - 16, 2, 4, '#5a5a60'); px(c, x + 4, y - 17, 8, 1, '#3a3a3a'); px(c, x + 10, y - 16, 2, 2, '#e8e0b0');
      px(c, x - 13, y - 9, 2, 2, '#c84030');
      if (o.crate) { px(c, x - 14, y - 21, 10, 8, '#8a6a3a'); px(c, x - 13, y - 20, 8, 1, '#b8945a'); for (let i = 0; i < 3; i++) px(c, x - 13, y - 18 + i * 2, 8, 1, '#6a5030'); }
    };
    if (o.face === 'left') { c.save(); c.translate(2 * x + 1, 0); c.scale(-1, 1); draw(); c.restore(); } else draw();
  };
  // thùng xốp đá đựng nước ngọt (đồ nghề đá bóng đường phố)
  P.cooler = function (c, x, y, o = {}) {
    const B = R(o.color || '#3a7ac0');
    K.shadow(c, x + 2, y, 7, 2);
    px(c, x - 7, y - 9, 14, 9, B.o); px(c, x - 6, y - 8, 12, 7, B.m); px(c, x + 4, y - 8, 2, 7, B.d);
    px(c, x - 6, y - 4, 12, 1, '#e8ecef');
    px(c, x - 7, y - 12, 14, 3, '#e8ecef'); px(c, x - 7, y - 12, 14, 1, '#ffffff'); px(c, x - 7, y - 9, 14, 1, '#b8c4cc');
    // nắp hé: chai nước thò ra
    px(c, x - 3, y - 15, 2, 3, '#5aa05a'); px(c, x, y - 14, 2, 2, '#c84a3a'); dot(c, x - 3, y - 15, '#a0d0a0');
  };
  // túi lưới đựng bóng
  P.ballBag = function (c, x, y) {
    K.shadow(c, x + 1, y, 6, 2);
    for (const [bx, by] of [[-3, -3], [2, -3], [0, -7]]) { K.ellipse(c, x + bx, y + by, 3, 3, '#6a6a70'); K.ellipse(c, x + bx, y + by, 2, 2, '#e8e8e4'); dot(c, x + bx, y + by, '#4a4a4a'); }
    for (let i = -5; i <= 5; i += 2) K.line(c, x + i, y - 1, x + i / 2, y - 10, 'rgba(60,60,60,0.55)');
    px(c, x - 1, y - 12, 2, 2, '#c84a3a');
  };
  // bảng phấn trên giá (chữ số phấn 3 x 5): tỉ số, hoặc bảng giá trà đá (o.glass: cốc trà đá vẽ phấn trước chữ "3K" — UX màn hình 2026-11:
  // tỉ số giả cạnh sân bị đọc nhầm thành tỉ số trận)
  const DIG = { 0: ['111', '101', '101', '101', '111'], 1: ['010', '110', '010', '010', '111'], 2: ['111', '001', '111', '100', '111'], 3: ['111', '001', '011', '001', '111'], '-': ['000', '000', '111', '000', '000'],
    K: ['101', '101', '110', '101', '101'] };
  // cốc trà đá phấn 5 x 6 (đáy ngang chân chữ số): w = viền phấn trắng · a = nước trà (phấn cam) · s = ống hút
  const GLASS = ['....s', 'w..sw', 'waaaw', 'waaaw', 'waaaw', '.www.'], GLASS_C = { w: '#e8ecdc', a: '#d8a050', s: '#e8ecdc' };
  P.scoreboard = function (c, x, y, o = {}) {
    const W = R('#8a6a42');
    K.shadow(c, x + 2, y, 9, 2);
    K.line(c, x - 7, y, x - 4, y - 18, W.d); K.line(c, x + 7, y, x + 4, y - 18, W.d); K.line(c, x + 1, y, x, y - 10, W.o);
    px(c, x - 10, y - 20, 20, 13, W.o); px(c, x - 9, y - 19, 18, 11, '#2e4a3a'); px(c, x - 9, y - 19, 18, 1, '#3e5a4a');
    const txt = String(o.text || '2-1'), gw = o.glass ? 7 : 0;   // cốc rộng 5 + cách chữ 2
    let cx2 = x - Math.round((gw + txt.length * 4 - 1) / 2);
    if (o.glass) { GLASS.forEach((row, j) => [...row].forEach((ch, i) => { if (GLASS_C[ch]) dot(c, cx2 + i, y - 18 + j, GLASS_C[ch]); })); cx2 += gw; }
    for (const ch of txt) { const g = DIG[ch]; if (g) for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (g[j][i] === '1') dot(c, cx2 + i, y - 17 + j, '#e8ecdc'); cx2 += 4; }
    px(c, x - 7, y - 10, 4, 1, 'rgba(232,236,220,0.5)');   // vạch đếm
    px(c, x + 5, y - 9, 3, 1, '#f0f0e0');   // viên phấn
  };
  // bàn trà thấp + ấm, chén
  P.teaTable = function (c, x, y) {
    const W = R('#8a5a3a');
    K.shadow(c, x + 2, y, 9, 2);
    px(c, x - 9, y - 7, 18, 3, W.o); px(c, x - 8, y - 7, 16, 2, W.l); px(c, x - 8, y - 7, 16, 1, W.h);
    for (const lx of [x - 8, x + 6]) px(c, lx, y - 4, 2, 4, W.d);
    px(c, x - 4, y - 12, 6, 5, '#3a5a6a'); px(c, x - 3, y - 12, 4, 1, '#6a9ab0'); px(c, x + 2, y - 11, 2, 1, '#3a5a6a'); px(c, x - 2, y - 13, 2, 1, '#2a4a5a');
    for (const cx2 of [x + 4, x + 6, x - 7]) { px(c, cx2, y - 9, 2, 2, '#e8ecef'); dot(c, cx2, y - 9, '#b88a40'); }
  };
  // miếu nhỏ dưới gốc đa: mái đỏ, bát hương, khói hương bay
  P.shrine = function (c, x, y, o = {}) {
    const Wl = R('#d8b860'), Rf = R('#a83a2a'), t = o.t || 0;
    K.shadow(c, x + 2, y, 9, 2);
    px(c, x - 8, y - 4, 16, 4, '#8a8478'); px(c, x - 8, y - 4, 16, 1, '#b0aa9c');
    px(c, x - 6, y - 14, 12, 10, Wl.o); px(c, x - 5, y - 13, 10, 9, Wl.m); px(c, x - 5, y - 13, 1, 9, Wl.l);
    px(c, x - 3, y - 11, 6, 7, '#3a1e18'); px(c, x - 2, y - 7, 4, 2, '#c8a040'); dot(c, x - 1, y - 9, '#e85a30'); dot(c, x, y - 9, '#e85a30');
    px(c, x - 9, y - 18, 18, 4, Rf.o); px(c, x - 8, y - 17, 16, 2, Rf.l); px(c, x - 8, y - 17, 16, 1, Rf.h);
    for (const [ex, d] of [[x - 9, -1], [x + 8, 1]]) dot(c, ex + d, y - 19, Rf.o);
    // hoa quả + chân hương trước miếu
    dot(c, x - 6, y - 5, '#e8b030'); dot(c, x - 5, y - 5, '#d84a30'); dot(c, x + 5, y - 5, '#7ab040');
    for (let i = 0; i < 3; i++) { px(c, x - 1 + i, y - 8, 1, 2, '#c84030'); }
    const ph = frame(t, 4, 3);
    for (let k = 0; k < 6; k++) dot(c, x + Math.round(Math.sin((k + ph) * 0.9) * 1.5), y - 21 - k * 2, `rgba(240,240,235,${(0.5 - k * 0.07).toFixed(2)})`);
  };
  // cầu ao: ván gỗ chìa ra mặt nước, cọc tre. x, y = đầu trên bờ; len = chiều dài
  P.jetty = function (c, x, y, o = {}) {
    const len = o.len || 20, w = o.w || 12, W = R('#8a6a48');
    // 3 tấm ván dọc chìa ra nước + 2 thanh giằng ngang, cọc ở đầu ngoài, bóng ván in xuống nước
    px(c, x + 2, y + 3, w, len, 'rgba(30,50,50,0.25)');
    px(c, x - 1, y - 1, w + 2, len + 2, W.o);
    const bw = Math.floor(w / 3);
    for (let i = 0; i < 3; i++) { px(c, x + i * bw, y, bw - 1, len, i === 1 ? W.l : W.m); px(c, x + i * bw, y, 1, len, W.h); dot(c, x + i * bw + 1, y + 3 + i * 4, W.d); }
    px(c, x, y + 2, w, 1, W.d); px(c, x, y + len - 3, w, 1, W.d);
    for (const lx of [x, x + w - 2]) { px(c, lx, y + len, 2, 3, W.d); px(c, lx - 1, y + len + 3, 4, 1, 'rgba(230,245,250,0.55)'); }
  };
  // sậy ven ao
  P.reeds = function (c, x, y, o = {}) {
    const rnd = K.rng(o.seed || 151), n = o.n || 6, G = R('#7a9a4a'), sw = frame(o.t, 2, 2);
    for (let i = 0; i < n; i++) {
      const dx = Math.round((i - n / 2) * 2), h = 8 + Math.floor(rnd() * 8), lean = (rnd() - 0.5) * 3;
      K.line(c, x + dx, y, x + dx + lean + sw, y - h, i % 2 ? G.m : G.l);
      if (rnd() < 0.5) px(c, x + dx + Math.round(lean) + sw, y - h - 2, 1, 3, '#8a6a3a');
    }
  };
  // bèo tây / lục bình: chùm lá tròn nổi + hoa tím
  P.hyacinth = function (c, x, y, o = {}) {
    const rnd = K.rng(o.seed || 161), n = o.n || 5, G = R('#4f8a3c');
    for (let i = 0; i < n; i++) {
      const lx = x + Math.round((rnd() - 0.5) * n * 3), ly = y + Math.round((rnd() - 0.5) * 3);
      K.ellipse(c, lx, ly, 2, 1, G.o); px(c, lx - 1, ly - 1, 3, 1, G.l); dot(c, lx, ly, G.m);
    }
    if (o.flower !== false) { px(c, x, y - 4, 1, 3, G.d); dot(c, x, y - 5, '#b08ad0'); dot(c, x + 1, y - 5, '#9a72c0'); dot(c, x, y - 6, '#c8a8e0'); }
  };
  // cột điện bê tông + xà ngang + sứ
  P.powerPole = function (c, x, y, o = {}) {
    const h = o.h || 70, Cn = R('#a8a49c');
    K.shadow(c, x + 3, y, 3, 1);
    px(c, x - 2, y - h, 4, h, Cn.o); px(c, x - 1, y - h, 2, h, Cn.m); dot(c, x - 1, y - h + 10, Cn.h);
    px(c, x - 8, y - h + 4, 16, 2, '#6a6a6a');
    for (const ix of [x - 7, x - 2, x + 3, x + 6]) px(c, ix, y - h + 2, 1, 2, '#d8d8cc');
    px(c, x - 2, y - h + 20, 4, 6, '#5a5a5a');   // hộp công tơ
    return [[x - 7, y - h + 2], [x + 6, y - h + 2], [x - 2, y - h + 2], [x + 3, y - h + 2]];
  };
  // đống củi
  P.woodpile = function (c, x, y, o = {}) {
    const w = o.w || 18, W = R('#8a6440');
    K.shadow(c, x + 2, y, w / 2 + 2, 2);
    for (let row = 0; row < 3; row++) for (let i = row; i < w / 3 - row; i++) { const lx = x - w / 2 + i * 3, ly = y - 3 - row * 3; px(c, lx, ly, 3, 3, W.o); dot(c, lx + 1, ly + 1, row ? '#c8a070' : '#b89060'); }
  };
  P.sack = function (c, x, y, o = {}) {
    const S = R(o.color || '#d8ccaa');
    K.shadow(c, x + 2, y, 5, 2);
    px(c, x - 5, y - 9, 10, 9, S.o); px(c, x - 4, y - 8, 8, 7, S.m); px(c, x - 4, y - 8, 8, 1, S.l); px(c, x + 2, y - 7, 2, 6, S.d);
    px(c, x - 2, y - 11, 4, 3, S.d); dot(c, x - 1, y - 11, S.l);
    if (o.stamp) px(c, x - 2, y - 5, 4, 2, K.rgba('#4a6aa0', 0.6));
  };
  // bu gà: lồng tre đan úp, gà mái bên trong
  P.coop = function (c, x, y) {
    const B = R('#a8884a');
    K.shadow(c, x + 2, y, 8, 2);
    K.ellipse(c, x, y - 5, 8, 5, B.o);
    px(c, x - 8, y - 5, 17, 5, B.o);
    // trong lồng tối + gà
    K.ellipse(c, x, y - 4, 6, 3, '#4a3a2a'); px(c, x - 6, y - 4, 13, 3, '#4a3a2a');
    px(c, x - 2, y - 5, 5, 3, '#b8743e'); dot(c, x + 2, y - 6, '#c8443a'); dot(c, x + 3, y - 5, '#e0b040');
    // nan đan: dọc + ngang
    for (let i = -7; i <= 7; i += 3) px(c, x + i, y - 9 + Math.round(Math.abs(i) / 3), 1, 9 - Math.round(Math.abs(i) / 3), B.l);
    for (const j of [y - 7, y - 4, y - 1]) px(c, x - 7, j, 15, 1, B.m);
    px(c, x - 4, y - 10, 9, 1, B.h); px(c, x - 1, y - 12, 3, 2, B.d);
  };
  // xô tôn có quai, nước bên trong
  P.bucket = function (c, x, y) {
    const C = R('#8a98a4');
    K.shadow(c, x + 1, y, 4, 1);
    px(c, x - 4, y - 7, 8, 7, C.o); px(c, x - 3, y - 6, 6, 5, C.m); px(c, x + 1, y - 6, 2, 5, C.d);
    px(c, x - 3, y - 7, 6, 1, C.l); px(c, x - 2, y - 7, 4, 1, '#5a8a9a');
    K.sag(c, x - 4, y - 7, x + 3, y - 7, -4, '#4a4a50');
  };
  // hàng rào dâm bụt cắt tỉa: dải lá dày cao ~9 px, hoa đỏ lấm tấm, bóng đổ dưới
  P.hedge = function (c, x, y, w, o = {}) {
    const rnd = K.rng(o.seed || 181);
    K.castBox(c, x + 2, y, w, 3, 0.9);
    for (let sx = x + 4; sx < x + w - 2; sx += 9) P.canopy(c, sx, y - 5, 6, 4, '#4f8238', { seed: (o.seed || 181) * 31 + sx });
    for (let i = 0; i < w / 5; i++) { const fx = x + 2 + Math.floor(rnd() * (w - 4)), fy = y - 9 + Math.floor(rnd() * 7); dot(c, fx, fy, '#d0402e'); if (rnd() < 0.4) dot(c, fx + 1, fy, '#e86a50'); }
  };
  // dép tổ ong để lại bên vạch
  P.flipflops = function (c, x, y, o = {}) {
    const col = o.color || '#e8e4dc';
    for (const dx of [0, 4]) { px(c, x + dx, y - 4, 3, 5, '#6a6a68'); px(c, x + dx, y - 4, 3, 4, col); dot(c, x + dx + 1, y - 3, '#3a6ab0'); }
  };
  // cổng nhà: 2 trụ vôi + vòm hoa giấy
  P.gate = function (c, x, y, o = {}) {
    const w = o.w || 26, Wl = R('#e0d4b8'), rnd = K.rng(o.seed || 171);
    for (const gx of [x - w / 2, x + w / 2 - 5]) { K.castBox(c, gx + 2, y, 5, 3, 0.8); px(c, gx - 1, y - 24, 7, 24, Wl.o); px(c, gx, y - 23, 5, 23, Wl.m); px(c, gx, y - 23, 5, 1, Wl.h); px(c, gx + 4, y - 22, 1, 22, Wl.d); px(c, gx - 1, y - 26, 7, 3, Wl.l); }
    P.canopy(c, x, y - 30, w / 2 + 6, 7, '#4f7f36', { seed: (o.seed || 171) + 1 });
    for (let i = 0; i < 40; i++) { const fx = x + Math.round((rnd() - 0.5) * (w + 10)), fy = y - 30 + Math.round((rnd() - 0.5) * 12); dot(c, fx, fy, rnd() < 0.6 ? '#c8508a' : '#e07aa8'); }
    for (let i = 0; i < 6; i++) dot(c, x - w / 2 + Math.floor(rnd() * w), y - 2 + Math.floor(rnd() * 3), '#d8609a');   // hoa rụng
  };
})();
