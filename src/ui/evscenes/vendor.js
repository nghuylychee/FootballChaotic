/* Cảnh sự kiện ??? STREET VENDOR (sạp hàng rong) — khung chung + quy ước: src/ui/evscene.js · cách diễn: docs/ux-screens/screens/event-scenes.json
 * Sạp bàn gấp phủ khăn dưới cây dù sọc trên nền lề đường chung: người bán đứng sau bàn vẫy tay (2 khung lặp), vài món lặt vặt tối màu
 * (móc khoá, vòng hạt, khăn cổ động), giữa bàn 1 túi giấy gấp miệng có dấu ? hình miếng vá, buộc dây màu RARE (biết độ hiếm, không biết
 * món — đúng cơ chế) + thẻ giá bìa cát-tông treo ở nơ (như thẻ KIT VAN).
 * Trỏ Buy one: túi nhấc lên viền vàng, người bán nghiêng tới, bàn tay chỉ vào túi · trỏ Walk away: người bán nhún vai, bàn tay chỉ ra đường
 * · thiếu tiền: thẻ giá bìa xám số đỏ (như KIT VAN), người bán nhún vai + nói Not enough cash. (bong bóng DOM)
 * · kết quả (~1,2 s rồi đứng yên): 3 xu bay khỏi ô tiền vào hộp thiếc của người bán, bàn tay của bạn (góc nhìn người chơi, như KIT VAN)
 *   với lên nắm túi, túi xé đôi, miếng vá BADGE thật nảy lên giữa sạp (miếng to 40x44) + tem 'The whole team gets it' (DOM) dán ở mép trên. */
(function () {
  const O = '#120c16';
  const BD = () => SFC_CONFIG.run.badges;
  const RAR = () => SFC_CONFIG.progression.rarities;
  const mix = (a, b, k) => {
    const h = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
    const A = h(a), C = h(b);
    return '#' + A.map((v, i) => Math.round(v + (C[i] - v) * k).toString(16).padStart(2, '0')).join('');
  };
  const cl = (v) => Math.max(0, Math.min(1, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const out2 = (v) => 1 - (1 - v) * (1 - v);
  const q8 = (v) => Math.floor(cl(v) * 8) / 8;   // chuyển động theo bậc 8 khung (như tay KIT VAN)

  // bố cục (pixel khung 320x180): giữa sạp = cán dù + túi · mặt bàn TY · người bán đứng sau bàn bên phải cán dù (bàn che từ ngực trở xuống)
  const CX = 112, TY = 106;
  const BAG = { x: 102, y: 84, w: 20, h: 22 };
  const VX = 126, VY = 67;
  const TIN = { x: 141, y: 99 };
  const CASH = { x: 298, y: 12 };   // ô tiền DOM góc trên phải (xu bay ra từ đây)
  // người bán: ngoại hình riêng (mũ tai bèo, ria) + áo nâu cam (không phải áo đội)
  const LOOK = { hair: 'bucket', face: 'mustache', skin: 2, hairColor: 2 };
  const KIT = { shirt: '#b0603a', shirtDark: '#7a3e26', shorts: '#3a3040', accent: '#e8c070', hair: ['#1a1216'] };
  // độ hiếm cố định của món bán (config: events.vendor.choices[0].badge) -> màu dây buộc + viền dấu ?
  const rare = () => { const c = SFC_CONFIG.run.events.vendor.choices[0]; return (RAR()[c.badge] || RAR().rare).color; };

  /* ---------- chữ số 3x5 (thẻ giá) · đồng xu 5x5 · dấu ? 5x7 (chép từ kitvan.js) ---------- */
  const DIG = {
    0: ['###', '#.#', '#.#', '#.#', '###'], 1: ['.#.', '##.', '.#.', '.#.', '###'], 2: ['###', '..#', '###', '#..', '###'], 3: ['###', '..#', '.##', '..#', '###'],
    4: ['#.#', '#.#', '###', '..#', '..#'], 5: ['###', '#..', '###', '..#', '###'], 6: ['###', '#..', '###', '#.#', '###'], 7: ['###', '..#', '.#.', '.#.', '.#.'],
    8: ['###', '#.#', '###', '#.#', '###'], 9: ['###', '#.#', '###', '..#', '###'],
  };
  const QM = ['.###.', '#...#', '....#', '..##.', '..#..', '.....', '..#..'];
  const glyph = (k, g, x, y, c) => g.forEach((r, j) => [...r].forEach((v, i) => { if (v === '#') k.P(x + i, y + j, 1, 1, c); }));
  const num = (k, s, x, y, c) => { for (const ch of String(s)) { glyph(k, DIG[ch] || DIG[0], x, y, c); x += 4; } };
  const COIN = ['.ddd.', 'dhyyd', 'dyyyd', 'dyyyd', '.ddd.'];
  function coin(k, x, y, dim) {
    const c = dim ? { d: '#5e5666', y: '#9a90a0', h: '#c8c0cc' } : { d: '#a8760c', y: '#ffd23f', h: '#fff3a8' };
    COIN.forEach((r, j) => [...r].forEach((v, i) => { if (v !== '.') k.P(x + i, y + j, 1, 1, c[v]); }));
  }

  /* ---------- miếng vá BADGE 20x22 (chép từ kitvan.js patch / shape): vẽ 1 lần ra canvas riêng theo id ---------- */
  const ICON = {};
  function grid(key, depth = 0) {
    const a = SFC.PixelIcon.ART[key];
    if (!a || depth > 4) return null;
    if (Array.isArray(a)) return a;
    const b = grid(a.ref, depth + 1);
    return !b || !a.map ? b : b.map((r) => r.replace(/./g, (ch) => a.map[ch] || ch));
  }
  function iconCv(key) {
    if (ICON[key]) return ICON[key];
    const rows = grid(key) || grid('ui-card'), c = Object.assign(document.createElement('canvas'), { width: 14, height: 14 });
    const x = c.getContext('2d'), on = (i, j) => i >= 0 && j >= 0 && i < 12 && j < 12 && rows[i][j] !== '.';
    for (let i = -1; i <= 12; i++) for (let j = -1; j <= 12; j++) {
      if (on(i, j)) { x.fillStyle = SFC.PixelIcon.PAL[rows[i][j]] || '#f0f'; x.fillRect(j + 1, i + 1, 1, 1); }
      else if (on(i - 1, j) || on(i + 1, j) || on(i, j - 1) || on(i, j + 1)) { x.fillStyle = O; x.fillRect(j + 1, i + 1, 1, 1); }
    }
    return (ICON[key] = c);
  }
  const iconKey = (id) => { const d = BD()[id] || {}; return d.icon ? 'ui-' + d.icon : d.school ? 'arch-' + d.school : 'ui-card'; };
  const pen = (c) => { const X = c.getContext('2d'); return (x, y, w, h, col) => { X.fillStyle = col; X.fillRect(x, y, w, h); }; };
  // hình miếng vá (bo góc, đáy tròn hơn) tô 1 màu, w x h
  function shape(P, x, y, w, h, c) {
    for (let j = 0; j < h; j++) {
      const inset = j === 0 || j === h - 1 ? 3 : j === 1 || j === h - 2 ? 1 : 0, extra = j >= h - 4 ? j - (h - 5) : 0;
      P(x + inset + extra, y + j, w - (inset + extra) * 2, 1, c);
    }
  }
  // thân miếng vá: nền tối pha màu độ hiếm, chỉ khâu chấm màu độ hiếm
  function patchBody(P, x, y, w, h, c, edge = O) {
    const base = mix('#1c1e28', c, 0.4), hi = mix('#1c1e28', c, 0.62);
    shape(P, x, y, w, h, edge);
    for (let j = 1; j < h - 1; j++) {
      const inset = j === 1 || j === h - 2 ? 2 : 1, extra = j >= h - 4 ? j - (h - 5) : 0;
      P(x + inset + extra, y + j, w - (inset + extra) * 2, 1, j < Math.round(h / 4) ? hi : base);
    }
    for (let i = 3; i < w - 3; i += 2) { P(x + i, y + 2, 1, 1, c); if (i > 4 && i < w - 5) P(x + i, y + h - 3, 1, 1, c); }
    for (let j = 4; j < h - 4; j += 2) { P(x + 2, y + j, 1, 1, c); P(x + w - 3, y + j, 1, 1, c); }
  }
  const PATCH = {};
  function patchCv(id) {
    if (PATCH[id]) return PATCH[id];
    const c = Object.assign(document.createElement('canvas'), { width: 20, height: 22 }), d = BD()[id] || {};
    patchBody(pen(c), 0, 0, 20, 22, d.injury ? '#ff5a6e' : (RAR()[d.rarity] || RAR().common).color);
    c.getContext('2d').drawImage(iconCv(iconKey(id)), 3, 4);
    return (PATCH[id] = c);
  }
  // miếng vá to 40x44 cho lúc nhận (docs/art-direction: 1 cỡ pixel, "lại gần = thêm chi tiết, không phóng to pixel"): vẽ thẳng ở cỡ pixel
  // của cảnh — bo góc to hơn, chỉ khâu chạy theo viền, icon phóng bằng Scale2x (đường chéo mịn ra, không thành khối 2x2) · bóng trắng 42x46
  // lúc vừa bung (loé 1 khung)
  // inPatch(i, j, d, W, H): pixel (i, j) nằm trong hình miếng vá W x H co vào d pixel (góc trên bo 4, đáy bo 10 như đáy tròn hơn của miếng nhỏ)
  function inPatch(i, j, d, W, H) {
    if (i < d || j < d || i > W - 1 - d || j > H - 1 - d) return false;
    const rt = Math.max(0, 4 - d), rb = Math.max(0, 10 - d), x = i + 0.5, y = j + 0.5;
    const corner = (cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
    if (y < d + rt && x < d + rt) return corner(d + rt, d + rt, rt);
    if (y < d + rt && x > W - d - rt) return corner(W - d - rt, d + rt, rt);
    if (y > H - d - rb && x < d + rb) return corner(d + rb, H - d - rb, rb);
    if (y > H - d - rb && x > W - d - rb) return corner(W - d - rb, H - d - rb, rb);
    return true;
  }
  const ICON2 = {};
  function icon2(key) {
    if (ICON2[key]) return ICON2[key];
    const g = grid(key) || grid('ui-card'), at = (i, j) => (i < 0 || j < 0 || i > 11 || j > 11 ? '.' : g[i][j]);
    const R = Array.from({ length: 24 }, () => Array(24).fill('.'));
    for (let i = 0; i < 12; i++) for (let j = 0; j < 12; j++) {
      const p = at(i, j), A = at(i - 1, j), B = at(i, j + 1), C = at(i, j - 1), D = at(i + 1, j);
      R[2 * i][2 * j] = C === A && C !== D && A !== B ? A : p;
      R[2 * i][2 * j + 1] = A === B && A !== C && B !== D ? B : p;
      R[2 * i + 1][2 * j] = D === C && D !== B && C !== A ? C : p;
      R[2 * i + 1][2 * j + 1] = B === D && B !== A && D !== C ? D : p;
    }
    const c = Object.assign(document.createElement('canvas'), { width: 26, height: 26 }), x = c.getContext('2d');
    const on = (i, j) => i >= 0 && j >= 0 && i < 24 && j < 24 && R[i][j] !== '.';
    for (let i = -1; i <= 24; i++) for (let j = -1; j <= 24; j++) {
      if (on(i, j)) { x.fillStyle = SFC.PixelIcon.PAL[R[i][j]] || '#f0f'; x.fillRect(j + 1, i + 1, 1, 1); }
      else if (on(i - 1, j) || on(i + 1, j) || on(i, j - 1) || on(i, j + 1)) { x.fillStyle = O; x.fillRect(j + 1, i + 1, 1, 1); }
    }
    return (ICON2[key] = c);
  }
  const BIGP = {};
  function bigPatchCv(id) {
    if (BIGP[id]) return BIGP[id];
    const W = 40, H = 44, c = Object.assign(document.createElement('canvas'), { width: W, height: H }), P = pen(c), rc = (BD()[id] || {}).injury ? '#ff5a6e' : (RAR()[(BD()[id] || {}).rarity] || RAR().common).color;
    const base = mix('#1c1e28', rc, 0.4), hi = mix('#1c1e28', rc, 0.62);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      if (!inPatch(i, j, 0, W, H)) continue;
      if (!inPatch(i, j, 1, W, H)) { P(i, j, 1, 1, O); continue; }
      const st = inPatch(i, j, 3, W, H) && !(inPatch(i - 1, j, 3, W, H) && inPatch(i + 1, j, 3, W, H) && inPatch(i, j - 1, 3, W, H) && inPatch(i, j + 1, 3, W, H));
      P(i, j, 1, 1, st && (i + j) % 2 === 0 ? rc : j < 11 ? hi : base);
    }
    c.getContext('2d').drawImage(icon2(iconKey(id)), 7, 9);
    return (BIGP[id] = c);
  }
  let flashCv = null;
  function flashShape() {
    if (flashCv) return flashCv;
    flashCv = Object.assign(document.createElement('canvas'), { width: 42, height: 46 });
    const P = pen(flashCv);
    for (let j = 0; j < 46; j++) for (let i = 0; i < 42; i++) if (inPatch(i, j, 0, 42, 46)) P(i, j, 1, 1, '#fff8e8');
    return flashCv;
  }

  /* ---------- túi giấy 20x22: miệng gấp, giấy trắng ngà, dây RARE quấn ngang + nơ, dấu ? hình miếng vá viền RARE ---------- */
  const PAPER = '#e6dccb', PAPER_SH = '#b9ab98', PAPER_HI = '#f6efe2', PAPER_FOLD = '#d2c4ae';
  let bagCv = null, halves = null;
  function makeBag() {
    const c = Object.assign(document.createElement('canvas'), { width: 20, height: 22 }), P = pen(c), r = rare(), rd = mix(r, '#000000', 0.35);
    P(0, 0, 20, 22, O); P(1, 1, 18, 20, PAPER);
    P(1, 1, 18, 3, PAPER_FOLD); P(1, 1, 18, 1, PAPER_HI); P(1, 4, 18, 1, PAPER_SH);   // miệng gấp xuống 1 nếp
    P(15, 5, 4, 15, mix(PAPER, PAPER_SH, 0.5)); P(18, 5, 1, 15, PAPER_SH);             // hông túi khuất sáng (sáng từ trên trái)
    P(1, 19, 18, 2, PAPER_SH);                                                           // đáy
    // dây quấn ngang + nơ giữa (2 quai + nút) + 2 đuôi dây
    P(0, 6, 20, 2, O); P(1, 6, 18, 1, r); P(1, 7, 18, 1, rd);
    P(6, 4, 3, 3, O); P(11, 4, 3, 3, O); P(7, 5, 1, 1, r); P(12, 5, 1, 1, r); P(9, 5, 2, 3, O); P(9, 6, 2, 1, r);
    P(8, 8, 1, 3, r); P(11, 8, 1, 2, r);
    // dấu ? trên miếng vá nhỏ 12x11 viền chỉ màu RARE: món là 1 BADGE hiếm, chưa biết là cái nào
    patchBody(P, 4, 9, 12, 11, r);
    QM.forEach((row, j) => [...row].forEach((v, i) => { if (v === '#') P(7 + i, 11 + j - (j > 4 ? 1 : 0), 1, 1, '#fff'); }));
    bagCv = c;
    // 2 nửa túi sau khi xé (mép xé răng cưa ở giữa)
    const half = (left) => {
      const h = Object.assign(document.createElement('canvas'), { width: 11, height: 22 }), X = h.getContext('2d'), Ph = pen(h);
      X.drawImage(c, left ? 0 : 9, 0, 11, 22, 0, 0, 11, 22);
      for (let j = 0; j < 22; j++) {
        const e = left ? 9 + ((j >> 1) % 2) : 1 - ((j >> 1) % 2);   // mép xé
        if (left) { X.clearRect(e + 1, j, 11, 1); Ph(e, j, 1, 1, O); } else { X.clearRect(0, j, e, 1); Ph(e, j, 1, 1, O); }
      }
      return h;
    };
    halves = [half(true), half(false)];
  }
  // nửa túi đã xé nằm bẹp trên bàn (11x9, mép xé răng cưa trên): nửa trái còn khúc dây màu độ hiếm, nửa phải còn mép miếng vá ?
  function crumple(k, x, left) {
    const P = k.P, y = TY - 9, r = rare();
    for (let i = 0; i < 11; i++) { const h = 9 - ((i + (left ? 0 : 1)) % 3 === 0 ? 2 : (i % 2)); P(x + i, y + 9 - h, 1, h, O); }
    for (let i = 1; i < 10; i++) { const h = 7 - ((i + (left ? 0 : 1)) % 3 === 0 ? 2 : (i % 2)); P(x + i, y + 8 - h, 1, h, i > 6 ? PAPER_SH : PAPER); }
    P(x + 1, y + 7, 9, 1, PAPER_SH);
    if (left) { P(x + 1, y + 4, 9, 1, r); P(x + 2, y + 5, 2, 2, r); }
    else { P(x + 1, y + 4, 4, 3, mix('#1c1e28', r, 0.4)); P(x + 1, y + 4, 1, 3, r); P(x + 3, y + 3, 1, 1, r); }
  }
  // vẽ túi: lit = đang trỏ Buy one (viền vàng 2 pixel như món đang trỏ ở KIT VAN)
  function bag(k, x, y, lit) {
    if (!bagCv) makeBag();
    if (lit) k.P(x - 2, y - 2, 24, 26, '#ffe14f');
    k.X.drawImage(bagCv, Math.round(x), Math.round(y));
  }

  /* ---------- thẻ giá bìa cát-tông 20x9 (như kitvan.js tag): xu + số · thiếu tiền = bìa xám, số đỏ, xu xám ---------- */
  function tag(k, x, y, price, poor) {
    const w = 20;
    k.P(x, y, w, 9, '#3a2410'); k.P(x + 1, y + 1, w - 2, 7, poor ? '#5a5060' : '#d8b27a'); k.P(x + 1, y + 7, w - 2, 1, poor ? '#3e3646' : '#a8824a');
    coin(k, x + 3, y + 2, poor);
    num(k, price, x + 9, y + 2, poor ? '#ff5a6e' : '#3a2410');
  }

  /* ---------- con trỏ bàn tay chỉ 13x16 (chép từ kitvan.js): chỉ lên (vào túi) · xoay phải (chỉ ra đường) ---------- */
  const HAND = ['....OO.......', '...OSSO......', '...OSSO......', '...OSSO......', '...OSSOOO....', '...OSSOSSOOO.', 'OO.OSSOSSOSSO', 'OSOOSSSSSSSSO', 'OSSOSSSSSSSSO',
    '.OSSSSSSSSSSO', '..OSSSSSSSSSO', '..OSSSSSSSSO.', '...OSSSSSSSO.', '...OSSSSSSO..', '....OSSSSSO..', '....OOOOOOO..'];
  const HAND_R = HAND[0].split('').map((_, r) => HAND.map((_, c) => HAND[15 - c][r]).join(''));   // xoay 90° theo chiều kim đồng hồ: ngón trỏ chỉ sang phải
  const handPx = (g, fn) => g.forEach((r, j) => [...r].forEach((v, i) => {
    if (v === '.') return;
    const shade = v === 'S' && (!g[j + 1] || g[j + 1][i] === 'O') && j > 5;   // mép dưới tô sẫm
    fn(i, j, v === 'O' ? '#111' : shade ? '#c8946a' : '#f0c8a0');
  }));
  // đầu ngón chỉ vào (fx, fy), nhấp 1 pixel như đang gõ nhẹ
  function pointer(k, fx, fy, right) {
    const b = Math.floor(k.T() * 2.5) % 2;
    if (right) handPx(HAND_R, (i, j, c) => k.P(Math.round(fx) - 15 + b + i, Math.round(fy) - 4 + j, 1, 1, c));
    else handPx(HAND, (i, j, c) => k.P(Math.round(fx) - 4 + i, Math.round(fy) + b + j, 1, 1, c));
  }

  /* ---------- bàn tay của bạn (chép từ kitvan.js drawHand): thò từ mép dưới lên, úp tay · grip = ngón co ôm món · tay áo = áo đội ---------- */
  const SKIN = '#e8b888', SKIN_HI = '#f8d4ac', SKIN_SH = '#c08a5a', NAIL = '#f6dccc';
  function drawHand(k, x, y, grip) {
    const P = k.P, kit = k.kitHome();
    x = Math.round(x); y = Math.round(y);
    P(x - 9, y + 22, 18, 200, O); P(x - 8, y + 23, 16, 200, kit.shirt); P(x + 4, y + 23, 4, 200, kit.shirtDark);
    P(x - 8, y + 22, 16, 3, kit.accent); P(x - 8, y + 25, 16, 1, mix(kit.accent, '#000000', 0.3));
    P(x - 9, y + 7, 18, 16, O); P(x - 8, y + 8, 16, 14, SKIN); P(x + 5, y + 8, 3, 14, SKIN_SH); P(x - 8, y + 19, 13, 3, SKIN_SH);
    for (let i = 0; i < 4; i++) { const kx = x - 8 + i * 4; P(kx + 1, y + 9, 2, 1, SKIN_HI); P(kx + 3, y + 9, 1, 2, SKIN_SH); }
    const len = grip ? [3, 4, 4, 3] : [6, 8, 8, 7];
    for (let i = 0; i < 4; i++) {
      const fx = x - 9 + i * 4 + (i > 1 ? 1 : 0), l = len[i], top = y + 8 - l;
      P(fx, top - 1, 5, l + 2, O); P(fx + 1, top, 3, l + 1, SKIN); P(fx + 3, top, 1, l + 1, SKIN_SH);
      if (grip) P(fx + 1, top, 3, 1, SKIN_HI);
      else { P(fx + 1, top, 3, 2, NAIL); P(fx + 1, top + 2, 3, 1, SKIN_SH); }
    }
    if (grip) { P(x - 13, y + 7, 6, 9, O); P(x - 12, y + 8, 4, 7, SKIN); P(x - 12, y + 8, 4, 1, SKIN_HI); }
    else { P(x - 15, y + 6, 6, 11, O); P(x - 14, y + 7, 4, 9, SKIN); P(x - 14, y + 7, 4, 2, NAIL); P(x - 14, y + 9, 4, 1, SKIN_SH); }
  }

  /* ---------- người bán: sprite 40x44 cắt ở mặt bàn + tay vẽ thêm (vẫy / nhún vai) ---------- */
  // đoạn tay dày w: nét mực trước (w + 2), màu sau
  const seg = (k, a, b, w, c) => {
    const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), 1);
    for (let i = 0; i <= n; i++) k.P(Math.round(lerp(a[0], b[0], i / n) - w / 2), Math.round(lerp(a[1], b[1], i / n) - w / 2), w, w, c);
  };
  // 1 cánh tay: vai -> khuỷu (tay áo) -> bàn tay (da) · bàn tay 4x4 + ngón cái
  function arm(k, s, e, h, skin) {
    seg(k, s, e, 6, O); seg(k, e, h, 5, O); k.P(h[0] - 3, h[1] - 3, 6, 6, O);
    seg(k, s, e, 4, KIT.shirt); seg(k, e, h, 3, skin); k.P(h[0] - 2, h[1] - 2, 4, 4, skin); k.P(h[0] - 2, h[1] - 2, 4, 1, mix(skin, '#ffffff', 0.25));
  }
  let vLook = null;
  // pose: 'wave' (tay phải vẫy, 2 khung) · 'slow' (vẫy chậm: đã bán xong) · 'shrug' (2 tay ngửa ra 2 bên, đầu hạ 1 pixel) · lean: nghiêng về phía túi
  function vendor(k, pose, t, lean) {
    vLook = vLook || k.look(LOOK);
    const x = VX - (lean ? 2 : 0), y = VY + (pose === 'shrug' ? 1 : 0), skin = vLook.skin;
    k.X.save(); k.X.beginPath(); k.X.rect(0, 0, k.LW, TY); k.X.clip();
    k.avatar(vLook, x, y, { kit: KIT, facing: Math.PI * 0.6, t });
    if (pose === 'shrug') {
      arm(k, [x + 12, y + 31], [x + 7, y + 35], [x + 3, y + 30], skin);
      arm(k, [x + 28, y + 31], [x + 33, y + 35], [x + 37, y + 30], skin);
    } else {
      const f = Math.floor(t * (pose === 'slow' ? 2.5 : 4)) % 2;
      arm(k, [x + 28, y + 31], [x + 34, y + 24], f ? [x + 38, y + 15] : [x + 35, y + 14], skin);
    }
    k.X.restore();
  }

  /* ---------- nền tĩnh: lề đường + dù sọc + bàn gấp + đồ lặt vặt (tối, viền sẫm cùng màu, không sáng hơn túi) ---------- */
  function umbrella(k) {
    const P = k.P, top = 34, rim = 54, R = ['#8a3842', '#6a2832'], S = ['#9c8e74', '#7c705c'], N = 6;
    const hw = (y) => 4 + 54 * Math.pow((y - top) / (rim - top), 0.8);
    // cán dù (sau túi), đế trên mặt bàn
    P(CX - 1, rim, 4, TY - rim, O); P(CX, rim, 2, TY - rim, '#5a5262'); P(CX + 1, rim, 1, TY - rim, '#3a3242');
    // tán: viền mực rồi từng múi sọc đỏ / cát hội tụ ở đỉnh, nửa phải khuất sáng
    for (let y = top - 1; y <= rim + 1; y++) { const h = Math.round(hw(Math.min(rim, Math.max(top, y))) + 1); P(CX - h, y, h * 2 + 2, 1, O); }
    for (let y = top; y <= rim; y++) {
      const h = Math.round(hw(y));
      for (let x = CX - h + 1; x <= CX + h; x++) {
        const f = (x - CX) / h, i = Math.min(N - 1, Math.floor((f + 1) / 2 * N)), dark = x > CX + 1 ? 1 : 0;
        P(x, y, 1, 1, (i % 2 ? S : R)[dark]);
      }
    }
    // mép tán lượn: mỗi múi võng xuống 2 pixel ở giữa
    for (let i = 0; i < N; i++) {
      const a = CX - 58 + Math.round(i * 116 / N), b = CX - 58 + Math.round((i + 1) * 116 / N), c = (i % 2 ? S : R)[a > CX ? 1 : 0];
      P(a + 3, rim + 1, b - a - 5, 1, O); P(a + 4, rim + 1, b - a - 7, 1, c); P(a + 5, rim + 2, b - a - 9, 1, O); P(a + 6, rim + 2, b - a - 11, 1, c); P(a + 6, rim + 3, b - a - 11, 1, O);
    }
    P(CX - 2, top - 4, 6, 4, O); P(CX - 1, top - 3, 4, 3, S[0]); P(CX - 1, top - 3, 2, 1, '#b4a88e');   // núm đỉnh
    // 2 khăn cổ động treo ở 2 đầu tán (đỏ sẫm / xanh sẫm sọc kem, tua dưới)
    [[CX - 52, ['#6e2a34', '#9a8c72']], [CX + 48, ['#2e3e5e', '#9a8c72']]].forEach(([sx, c]) => {
      P(sx - 1, rim + 1, 6, 19, mix(c[0], '#000000', 0.45));
      for (let j = 0; j < 17; j++) P(sx, rim + 2 + j, 4, 1, c[(j >> 2) % 2]);
      for (let i = 0; i < 4; i += 2) P(sx + i, rim + 19, 1, 2, c[1]);
    });
  }
  function table(k) {
    const P = k.P, x0 = 55, x1 = 171, bot = 124;
    // bóng dưới bàn trên vỉa hè (lệch phải xuống như ánh sáng trên trái)
    for (let y = 125; y < 129; y++) k.d(x0 + 3 + (y - 125), y, x1 + 3 + (y - 125), '#2a2030', y < 127 ? 1 : 2);
    // chân bàn gấp chữ X (sắt sơn đen) dưới khăn
    [x0 + 6, x1 - 15].forEach((lx) => { k.ln(lx, bot, lx + 8, 130, '#1a1420'); k.ln(lx + 8, bot, lx, 130, '#1a1420'); k.ln(lx + 1, bot, lx + 9, 130, '#1a1420'); k.ln(lx + 9, bot, lx + 1, 130, '#1a1420'); });
    // khăn phủ bàn: mặt trên sáng, mép gấp, vạt rủ có nếp, mép dưới lượn
    const C0 = '#343c56', C1 = '#4a536e', C2 = '#2a3046';
    P(x0, TY - 1, x1 - x0, bot - TY + 2, O);
    P(x0 + 1, TY, x1 - x0 - 2, 3, C1); P(x0 + 1, TY, x1 - x0 - 2, 1, '#5c6684');
    P(x0 + 1, TY + 3, x1 - x0 - 2, bot - TY - 3, C0); P(x0 + 1, TY + 3, x1 - x0 - 2, 1, C2);
    for (let x = x0 + 9; x < x1 - 4; x += 13) { P(x, TY + 6, 1, bot - TY - 6, C2); P(x + 1, TY + 6, 1, bot - TY - 7, '#3c4562'); }
    for (let x = x0 + 1; x < x1 - 1; x += 6) P(x + 2, bot, 3, 1, C0);
    k.d(x0 + 1, bot - 1, x1 - 1, C2);
  }
  function knick(k) {
    const P = k.P;
    // bảng bìa cắm móc khoá (đồ treo nhỏ màu xỉn)
    P(59, 89, 13, 17, '#3a2c22'); P(60, 90, 11, 15, '#6e5640'); P(60, 90, 11, 1, '#82684c');
    [[62, 92, '#7a7c8c'], [67, 92, '#8a6052'], [62, 98, '#5e7a62'], [67, 98, '#8a7a4c']].forEach(([x, y, c]) => {
      P(x + 1, y, 1, 2, '#4a3a2c'); P(x, y + 2, 3, 3, mix(c, '#000000', 0.4)); P(x + 1, y + 3, 1, 1, c);
    });
    // 2 vòng hạt nằm trên bàn (vòng dẹt 9x3, hạt xen 2 màu xỉn)
    [[74, 101, ['#7a5a6a', '#9a8a70']], [79, 103, ['#5a6a7a', '#8a7a62']]].forEach(([x, y, c]) => {
      for (let i = 0; i < 9; i++) { P(x + i, y + (i === 0 || i === 8 ? 1 : 0), 1, 1, c[i % 2]); if (i > 0 && i < 8) P(x + i, y + 2, 1, 1, c[(i + 1) % 2]); }
    });
    // khăn cổ động vắt qua mép bàn bên phải (sọc đỏ sẫm / kem, tua)
    P(146, TY - 1, 12, 17, '#2a1418');
    for (let j = 0; j < 15; j++) P(147, TY + j, 10, 1, j % 6 < 3 ? '#6e2a34' : '#8a7c66');
    for (let i = 0; i < 10; i += 2) P(147 + i, TY + 15, 1, 2, '#8a7c66');
  }
  // hộp thiếc đựng tiền của người bán (trước mặt người bán, vẽ mỗi khung vì đè lên người) · n = số xu bạn vừa trả đã rơi vào
  function tin(k, n) {
    const P = k.P, x = TIN.x, y = TIN.y;
    P(x, y, 12, 8, O); P(x + 1, y + 1, 10, 6, '#4e5a70'); P(x + 1, y + 1, 10, 1, '#6a7890'); P(x + 1, y + 5, 10, 1, '#3c4658');
    P(x + 2, y + 1, 8, 1, '#2a3040');   // miệng hộp
    P(x + 3, y + 1, 2, 1, '#8a6a20'); P(x + 7, y + 1, 1, 1, '#8a6a20');   // vài đồng xu cũ trong hộp (tối)
    for (let i = 0; i < n; i++) P(x + 2 + i * 3, y, 3, 2, i % 2 ? '#ffd23f' : '#fff3a8');
  }

  /* ---------- kết quả: thời điểm (giây từ lúc bấm Buy one) ---------- */
  const TM = { coin: 0.02, coinDur: 0.42, coinGap: 0.09, reach: 0.12, grip: 0.4, tear: 0.5, out: 0.58, gone: 0.92, big: 0.68, land: 1.15 };
  // mảnh giấy vụn bay ra lúc xé (cố định, không ngẫu nhiên mỗi lần vẽ)
  const BITS = [[-26, -40], [-14, -52], [-4, -60], [8, -56], [18, -46], [28, -36], [-20, -30], [22, -28]];
  const PEND = 70;   // tâm miếng vá to lúc đứng yên (y)

  function result(k, s) {
    const t = s.tp, P = k.P, b = s.res.find((x) => x.kind === 'badge');
    // xu bay khỏi ô tiền vào hộp thiếc
    let landed = 0;
    for (let i = 0; i < 3; i++) {
      const u = (t - TM.coin - i * TM.coinGap) / TM.coinDur;
      if (u >= 1) { landed++; continue; }
      if (u < 0) continue;
      const x = lerp(CASH.x, TIN.x + 3, u), y = lerp(CASH.y, TIN.y - 3, u) - Math.sin(u * Math.PI) * 16;
      coin(k, Math.round(x), Math.round(y));
    }
    tin(k, landed);
    // túi: còn nguyên tới lúc xé (nhấc 1 pixel khi tay nắm) · sau đó 2 nửa bật sang 2 bên rồi đứng trên bàn
    if (t < TM.tear) bag(k, BAG.x, BAG.y - (t > TM.grip ? 1 : 0), false);
    else {
      if (!bagCv) makeBag();
      const u = cl((t - TM.tear) / 0.22), dx = Math.round(out2(u) * 7), hop = Math.round(Math.sin(u * Math.PI) * 4);
      if (u < 1) { k.X.drawImage(halves[0], BAG.x - dx, BAG.y - hop); k.X.drawImage(halves[1], BAG.x + 9 + dx, BAG.y - hop); }
      else { crumple(k, BAG.x - 8, true); crumple(k, BAG.x + 17, false); }
      // giấy vụn: văng lên rồi rơi, tan trước 1,1 s
      const v = t - TM.tear;
      if (v < 0.55) BITS.forEach(([vx, vy], i) => {
        const x = CX + vx * v * 1.6, y = BAG.y + 8 + vy * v * 1.6 + 160 * v * v;
        if (v < 0.4 || (i + Math.floor(v * 20)) % 2) P(Math.round(x), Math.round(y), i % 3 ? 2 : 1, 1, i % 4 ? PAPER : rare());
      });
    }
    // miếng vá BADGE thật: bung khỏi túi (cỡ 20x22) -> loé trắng -> miếng to 40x44 nảy giữa sạp rồi đứng yên (nhún 1 pixel chậm)
    if (b && t >= TM.tear) {
      const pc = patchCv(b.id);
      if (t < TM.big) {
        const u = q8((t - TM.tear) / (TM.big - TM.tear));
        k.X.drawImage(pc, CX - 10, Math.round(lerp(BAG.y + 2, PEND - 11, u)));
      } else {
        const v = t - TM.big, bounce = v < 0.47 ? Math.round([-6, -3, 0, -2, 0, -1, 0][Math.min(6, Math.floor(v / 0.067))]) : (Math.floor(t * 1.5) % 2 ? -1 : 0);
        const y = PEND - 22 + bounce;
        if (v < 0.06) k.X.drawImage(flashShape(), CX - 21, y - 1);
        k.X.drawImage(bigPatchCv(b.id), CX - 20, y);
        // lấp lánh: 4 chấm sao 4 cánh quanh miếng vá, lần lượt sáng (màu độ hiếm + trắng)
        if (t > TM.land) {
          const c = (RAR()[(BD()[b.id] || {}).rarity] || RAR().common).color;
          [[CX - 27, PEND - 18], [CX + 26, PEND - 10], [CX - 25, PEND + 12], [CX + 24, PEND + 16]].forEach(([sx, sy], i) => {
            const on = (Math.floor(t * 3) + i) % 4;
            if (on === 0) { P(sx - 2, sy, 5, 1, c); P(sx, sy - 2, 1, 5, c); P(sx, sy, 1, 1, '#fff'); }
            else if (on === 1) { P(sx, sy, 1, 1, c); }
          });
        }
      }
    }
    // bàn tay với lên nắm túi -> giật (túi xé) -> rút xuống ra khỏi khung
    if (t >= TM.reach && t < TM.gone) {
      const at = { x: CX, y: BAG.y + 13 };
      let x, y, grip = false;
      if (t < TM.grip) { const u = 1 - (1 - q8((t - TM.reach) / (TM.grip - TM.reach))) ** 2; x = lerp(CX + 10, at.x, u); y = lerp(196, at.y, u); }
      else if (t < TM.tear) { x = at.x; y = at.y; grip = true; }
      else if (t < TM.out) { x = at.x; y = at.y + q8((t - TM.tear) / (TM.out - TM.tear)) * 7; grip = true; }
      else { const u = q8((t - TM.out) / (TM.gone - TM.out)); x = at.x + u * 6; y = at.y + 7 + u * u * 110; grip = true; }
      drawHand(k, x, y, grip);
    }
  }

  SFC.EvScene.add('vendor', {
    paint(k) {
      k.street({ lamp: 290, sun: false });
      umbrella(k);
      table(k);
      knick(k);
    },
    draw(k, s) {
      const t = k.T();
      if (s.phase === 'result' && s.pick === 0) {
        vendor(k, 'slow', t, false);
        return result(k, s);
      }
      const poor = !(s.can || []).includes(0), buy = s.hover === 0, away = s.hover === 1;
      vendor(k, poor || away ? 'shrug' : 'wave', t, buy && !poor);
      tin(k, 0);
      const lift = buy && !poor ? -2 : 0, by = BAG.y + lift;
      // thẻ giá treo ở nơ, tựa vào hông trái túi (vẽ trước túi: dây đi sau túi)
      k.ln(BAG.x + 8, by + 6, BAG.x - 4, by + 13, '#e8dcc4');
      bag(k, BAG.x, by, buy && !poor);
      tag(k, BAG.x - 17, by + 12, SFC_CONFIG.run.events.vendor.choices[0].cost, poor);
      // bàn tay chỉ: Buy one -> vào túi (góc phải dưới) · Walk away -> ra đường bên phải
      if (buy) pointer(k, BAG.x + 15, by + 23);
      else if (away) pointer(k, 196, 121, true);
    },
    // bong bóng người bán (thiếu tiền) · tem 'cả đội nhận' ở mép trên miếng vá, hiện khi miếng vá nảy xong: chờ phần còn lại của hoạt cảnh
    // (EvScene.state().tp = giây từ lúc vào pha kết quả; RunUI vẽ lại giữa chừng thì tem không chờ lại từ đầu)
    dom(s) {
      const esc = SFC.UIHelpers.esc;
      if (s.phase === 'result') {
        if (!s.res.some((x) => x.kind === 'badge')) return '';
        const d = Math.max(0, TM.land - (SFC.EvScene.state().tp || 0));
        return `<em class="evv-kind" style="--d:${d.toFixed(2)}s">${esc(SFC.t('The whole team gets it'))}</em>`;
      }
      return !(s.can || []).includes(0) ? `<div class="evv-say">${esc(SFC.t('Not enough cash.'))}</div>` : '';
    },
  });
})();
