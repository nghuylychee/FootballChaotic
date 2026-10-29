/* =========================================================
 * KIT VAN — màn Shop của GOAT PATH (user duyệt mockup 2026-10-29, tools/mockups/run-ui.html).
 * Xe bán đồ đá bóng ven đường, vẽ pixel art thật trên canvas 320x180 (1 pixel = 2x2 trên khung 640x360): chỉ khối màu cứng + dither.
 * BADGE treo móc trên bảng gỗ (thẻ giá bìa cát-tông, chữ pixel 3x5), hộp cứu thương trên quầy = chữa 1 chấn thương, tài xế trong cabin
 * giải thích món đang trỏ trong bong bóng thoại (DOM), con trỏ bàn tay chỉ. Mua = bàn tay (góc nhìn người chơi, úp tay) với từ mép dưới
 * lên, nắm món đồ, giật khỏi móc rồi rút xuống ra khỏi màn. Xe nổ máy: thân nhún nhẹ 1 pixel + ống xả nhả khói.
 * Chỉ vẽ: dữ liệu + luật mua ở SFC.Run, mục chọn (data-rt) + hành động ở SFC.RunUI (src/ui/runmap.js shopCard / act).
 * ========================================================= */
window.SFC = window.SFC || {};

(function () {
  const LW = 320, LH = 180;
  const O = '#120c16';
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const B = () => SFC_CONFIG.run.badges;
  const rc = (id) => (B()[id].injury ? '#ff5a6e' : SFC_CONFIG.progression.rarities[B()[id].rarity].color);
  const hsh = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const mix = (a, b, k) => {
    const h = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
    const A = h(a), C = h(b);
    return '#' + A.map((v, i) => Math.round(v + (C[i] - v) * k).toString(16).padStart(2, '0')).join('');
  };
  // toạ độ trên canvas thấp: móc treo (x giữa từng món, tối đa 5 móc) · hộp cứu thương trên quầy (x giữa, tối đa 4)
  const HOOK_X = (i) => 50 + i * 36;
  const KIT_X = (k) => 44 + k * 22;
  // tài xế: ngoại hình riêng (không phải đồng đội)
  const DRIVER = { hair: 'buzz', face: 'beard', skin: 3 };

  let cv = null, L = null, raf = 0, last = 0, T = 0;
  // trạng thái vẽ (KitVan.html cập nhật mỗi lần RunUI vẽ lại): items [{ id, price, sold, hot, key }] · kits [{ key }] · hover = key đang trỏ
  const S = { items: [], kits: [], kitPrice: 0, hover: null, talk: null };
  const P = (x, y, w, h, c) => { L.fillStyle = c; L.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const disc = (cx, cy, r, c) => { for (let y = -r; y <= r; y++) { const h = Math.round(Math.sqrt(r * r - y * y)); P(cx - h, cy + y, h * 2 + 1, 1, c); } };

  /* ---------- chữ pixel 3x5 (bảng hiệu, thẻ giá): '#' = pixel ---------- */
  const FONT = {
    0: ['###', '#.#', '#.#', '#.#', '###'], 1: ['.#.', '##.', '.#.', '.#.', '###'], 2: ['###', '..#', '###', '#..', '###'], 3: ['###', '..#', '.##', '..#', '###'],
    4: ['#.#', '#.#', '###', '..#', '..#'], 5: ['###', '#..', '###', '..#', '###'], 6: ['###', '#..', '###', '#.#', '###'], 7: ['###', '..#', '.#.', '.#.', '.#.'],
    8: ['###', '#.#', '###', '#.#', '###'], 9: ['###', '#.#', '###', '..#', '###'],
    A: ['.#.', '#.#', '###', '#.#', '#.#'], D: ['##.', '#.#', '#.#', '#.#', '##.'], H: ['#.#', '#.#', '###', '#.#', '#.#'], I: ['###', '.#.', '.#.', '.#.', '###'],
    K: ['#.#', '##.', '#..', '##.', '#.#'], L: ['#..', '#..', '#..', '#..', '###'], N: ['#..#', '##.#', '#.##', '#..#', '#..#'], O: ['###', '#.#', '#.#', '#.#', '###'],
    S: ['###', '#..', '###', '..#', '###'], T: ['###', '.#.', '.#.', '.#.', '.#.'], V: ['#.#', '#.#', '#.#', '#.#', '.#.'], ' ': ['..', '..', '..', '..', '..'],
  };
  const glyph = (ch) => FONT[ch] || FONT[' '];
  const textW = (s, k = 1) => [...s].reduce((w, ch) => w + (glyph(ch)[0].length + 1) * k, -k);
  function text(s, x, y, c, k = 1) {
    for (const ch of s) {
      const g = glyph(ch);
      g.forEach((row, j) => [...row].forEach((v, i) => { if (v === '#') P(x + i * k, y + j * k, k, k, c); }));
      x += (g[0].length + 1) * k;
    }
  }

  /* ---------- icon pixel 12x12 của game + viền mực (giống PixelIcon.render), vẽ 1:1 lên canvas thấp ---------- */
  const ICON = {};
  const iconKey = (id) => { const d = B()[id]; return d.icon ? 'ui-' + d.icon : d.school ? 'arch-' + d.school : 'ui-card'; };
  function grid(key, depth = 0) {
    const a = SFC.PixelIcon.ART[key];
    if (!a || depth > 4) return null;
    if (Array.isArray(a)) return a;
    const b = grid(a.ref, depth + 1);
    return !b || !a.map ? b : b.map((r) => r.replace(/./g, (ch) => a.map[ch] || ch));
  }
  function iconCv(key) {
    if (ICON[key]) return ICON[key];
    const rows = grid(key) || grid('ui-card'), c = document.createElement('canvas');
    c.width = 14; c.height = 14;
    const x = c.getContext('2d'), on = (i, j) => i >= 0 && j >= 0 && i < 12 && j < 12 && rows[i][j] !== '.';
    for (let i = -1; i <= 12; i++) for (let j = -1; j <= 12; j++) {
      if (on(i, j)) { x.fillStyle = SFC.PixelIcon.PAL[rows[i][j]] || '#f0f'; x.fillRect(j + 1, i + 1, 1, 1); }
      else if (on(i - 1, j) || on(i + 1, j) || on(i, j - 1) || on(i, j + 1)) { x.fillStyle = O; x.fillRect(j + 1, i + 1, 1, 1); }
    }
    return (ICON[key] = c);
  }

  /* ---------- đồ vật ---------- */
  // miếng vá BADGE 20x22 (x, y = góc trên trái): viền mực (trỏ vào = viền vàng), nền tối pha màu độ hiếm, chỉ khâu chấm màu độ hiếm, icon giữa
  function patch(id, x, y, lit) {
    const c = rc(id), base = mix('#1c1e28', c, 0.28), hi = mix('#1c1e28', c, 0.5), rows = 22;
    for (let j = 0; j < rows; j++) {
      const inset = j === 0 || j === rows - 1 ? 3 : j === 1 || j === rows - 2 ? 1 : 0, extra = j >= rows - 4 ? j - (rows - 5) : 0;   // bo góc, đáy tròn hơn
      P(x + inset + extra, y + j, 20 - (inset + extra) * 2, 1, lit ? '#ffe14f' : O);
    }
    for (let j = 1; j < rows - 1; j++) {
      const inset = j === 1 || j === rows - 2 ? 2 : 1, extra = j >= rows - 4 ? j - (rows - 5) : 0;
      P(x + inset + extra, y + j, 20 - (inset + extra) * 2, 1, j < 6 ? hi : base);
    }
    for (let i = 3; i < 17; i += 2) { P(x + i, y + 2, 1, 1, c); if (i > 4 && i < 15) P(x + i, y + rows - 3, 1, 1, c); }
    for (let j = 4; j < rows - 4; j += 2) { P(x + 2, y + j, 1, 1, c); P(x + 17, y + j, 1, 1, c); }
    L.drawImage(iconCv(iconKey(id)), x + 3, y + 4);
  }
  // thẻ giá bìa cát-tông treo dây: đồng xu + số · HOT = thẻ đỏ · đã bán = chữ SOLD đỏ
  function tag(cx, y, price, hot, sold) {
    const label = sold ? 'SOLD' : String(price), w = textW(label) + (sold ? 4 : 8), x = cx - 2;
    P(cx, y - 4, 1, 4, '#e8dcc4');
    P(x, y, w, 9, '#3a2410'); P(x + 1, y + 1, w - 2, 7, hot && !sold ? '#ff3d5a' : '#d8b27a'); P(x + 1, y + 7, w - 2, 1, hot && !sold ? '#b8202e' : '#a8824a');
    P(x + 2, y + 2, 1, 1, '#3a2410');
    if (sold) return text(label, x + 2, y + 2, '#c8202e');
    disc(x + 5, y + 4, 1, '#ffd23f'); P(x + 4, y + 3, 1, 1, '#fff3a8');
    text(label, x + 8, y + 2, hot ? '#fff' : '#3a2410');
  }
  function hotSticker(x, y) {
    P(x, y, 15, 9, O); P(x + 1, y + 1, 13, 7, '#ff3d5a'); P(x + 1, y + 7, 13, 1, '#b8202e');
    if (Math.floor(T * 3) % 2) P(x + 1, y + 1, 13, 1, '#ff8a98');
    text('HOT', x + 2, y + 2, '#fff');
  }
  function medkit(x, y, lit) {
    P(x, y, 18, 11, lit ? '#ffe14f' : O); P(x + 1, y + 1, 16, 9, '#f4f4f4'); P(x + 1, y + 8, 16, 2, '#c8ccd6');
    P(x + 7, y + 2, 4, 6, '#ff3d5a'); P(x + 5, y + 4, 8, 2, '#ff3d5a');
    P(x + 6, y - 3, 6, 1, O); P(x + 5, y - 2, 1, 2, O); P(x + 12, y - 2, 1, 2, O);
  }

  /* ---------- nền tĩnh (vẽ 1 lần): trời hoàng hôn dải màu + dither, mặt trời sọc, phố, vỉa hè, đường · xe (canvas riêng, nhún) · bánh xe ---------- */
  let bg = null, van = null, wheels = null;
  function paintStatic() {
    const mk = () => { const c = document.createElement('canvas'); c.width = LW; c.height = LH; return c; };
    bg = mk(); van = mk(); wheels = mk();
    let X = bg.getContext('2d');
    const p = (x, y, w, h, c) => { X.fillStyle = c; X.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
    const d = (x0, y, x1, c, every = 2) => { X.fillStyle = c; for (let x = x0 + ((y + x0) % every); x < x1; x += every) X.fillRect(x, y, 1, 1); };
    const dc = (cx, cy, r, c) => { for (let y = -r; y <= r; y++) { const h = Math.round(Math.sqrt(r * r - y * y)); p(cx - h, cy + y, h * 2 + 1, 1, c); } };
    const sky = ['#1e1430', '#2c1a3e', '#43224a', '#62294e', '#8a3450', '#b8484e', '#de6a4c', '#f29256'];
    sky.forEach((c, i) => { const a = i * 15, b = (i + 1) * 15; p(0, a, LW, b - a, c); if (i < sky.length - 1) { d(0, b - 1, LW, sky[i + 1]); d(0, b - 2, LW, sky[i + 1], 4); } });
    // mặt trời sọc ngang kiểu retro + sao
    dc(238, 100, 20, '#ffb060'); dc(238, 100, 16, '#ffd27a');
    [94, 101, 107, 112].forEach((y, k) => p(214, y, 48, 1 + k, '#de6a4c'));
    for (let i = 0; i < 26; i++) p(Math.floor(hsh(i) * LW), Math.floor(hsh(i + 50) * 40), 1, 1, hsh(i + 9) > 0.5 ? '#f4e8ff' : '#9a86c0');
    // phố xa (2 lớp, cửa sổ sáng, ăng-ten đèn đỏ)
    for (let x = 0, k = 0; x < LW; k++) { const w = 14 + Math.floor(hsh(k + 3) * 22), h = 22 + Math.floor(hsh(k + 7) * 34); p(x, 118 - h, w, h, '#3a2040'); x += w; }
    for (let x = -6, k = 0; x < LW; k++) {
      const w = 18 + Math.floor(hsh(k + 31) * 26), h = 14 + Math.floor(hsh(k + 17) * 30), top = 118 - h;
      p(x, top, w, h, '#24142c'); p(x, top, w, 1, '#3e2448');
      for (let yy = top + 4; yy < 114; yy += 5) for (let xx = x + 3; xx < x + w - 2; xx += 4) if (hsh(xx * 1.3 + yy * 7.1) > 0.6) p(xx, yy, 2, 2, hsh(xx + yy) > 0.3 ? '#ffcf6a' : '#a8603a');
      if (hsh(k + 91) > 0.7) { p(x + 4, top - 8, 1, 8, '#24142c'); p(x + 3, top - 9, 3, 1, '#ff3d5a'); }
      x += w + 2;
    }
    // cột đèn đường · vỉa hè + bó vỉa · đường nhựa + vạch
    p(306, 40, 3, 92, '#1a1020'); p(296, 38, 14, 3, '#1a1020'); p(296, 41, 6, 2, '#fff3a8');
    for (let y = 43; y < 60; y++) d(290 - (y - 43) / 2, y, 308 + (y - 43) / 2, 'rgba(255,243,168,0.35)', 3);
    p(0, 118, LW, 15, '#6a5a6c'); p(0, 118, LW, 1, '#8e7e90');
    for (let x = 6; x < LW; x += 18) p(x, 119, 1, 14, '#544656');
    d(0, 131, LW, '#544656');
    p(0, 133, LW, 3, '#9a8a9c'); p(0, 136, LW, 1, '#2a2030');
    p(0, 137, LW, 43, '#2c2632');
    for (let y = 139; y < LH; y += 3) d(0, y, LW, '#352e3c', 4);
    for (let x = 10; x < LW; x += 40) p(x, 170, 18, 2, '#c8b890');
    // bóng dưới xe (trên nền, không nhún)
    for (let y = 138; y < 146; y++) d(24 - (y - 138), y, 300 + (y - 138), '#0e0a12', y < 142 ? 1 : 2);

    /* ----- xe tải nhỏ (canvas van) ----- */
    X = van.getContext('2d');
    const T1 = '#5fd6c8', T2 = '#2a9c94', T3 = '#1c726c', T4 = '#124a48';
    p(12, 130, 9, 5, O); p(13, 131, 8, 3, '#8a909e'); p(13, 131, 8, 1, '#c8ccd6'); p(12, 131, 1, 3, '#2a2630');   // ống xả
    p(20, 30, 214, 110, O); p(21, 31, 212, 108, T2); p(21, 31, 212, 2, T1); p(21, 120, 212, 17, T3); p(21, 136, 212, 3, T4);
    d(21, 119, 233, T3);
    // giá nóc + bảng hiệu (chữ vẽ mỗi khung)
    p(30, 25, 186, 2, O); for (let x = 34; x < 216; x += 30) p(x, 27, 2, 3, O);
    p(96, 9, 82, 17, O); p(97, 10, 80, 15, '#ffe14f'); p(97, 23, 80, 2, '#c99a12'); p(97, 10, 80, 1, '#fff3a8');
    // ô cửa hông mở: bảng gỗ đục lỗ
    p(30, 42, 192, 66, O); p(31, 43, 190, 64, '#a8784a');
    for (let y = 46; y < 106; y += 4) for (let x = 33 + ((y / 4) % 2) * 2; x < 220; x += 4) p(x, y, 1, 1, '#6a4628');
    for (let y = 43; y < 49; y++) d(31, y, 221, '#6a4628', y < 46 ? 1 : 2);
    // mái bạt (cánh cửa lật lên) sọc vàng / trắng, mép dưới lượn
    p(26, 35, 200, 9, O);
    for (let x = 27, k = 0; x < 225; x += 8, k++) {
      const c = k % 2 ? '#f4efe0' : '#ffe14f', sh = k % 2 ? '#c8c0ac' : '#c99a12', w = Math.min(8, 225 - x);
      p(x, 36, w, 7, c); p(x, 42, w, 1, sh); p(x + 1, 44, 6, 2, O); p(x + 2, 44, 4, 1, c);
    }
    // quầy · vạch trang trí thân
    p(26, 106, 200, 7, O); p(27, 107, 198, 3, '#e8dcc4'); p(27, 110, 198, 2, '#b8a688'); d(27, 113, 225, '#0e0a12');
    p(21, 118, 212, 1, '#ffe14f'); p(21, 121, 212, 1, '#ffe14f');
    // cabin: kính chắn gió dốc, cửa kính (tài xế vẽ đè), gương, đèn pha, cản, khe cửa
    for (let y = 52; y < 140; y++) {
      const r = y < 82 ? 280 + Math.floor((y - 52) * 0.6) : 298;
      p(232, y, r - 231, 1, O); if (y > 52 && y < 139) p(233, y, r - 233, 1, y < 54 ? T1 : y > 120 ? T3 : T2);
    }
    d(233, 119, 298, T3);
    p(238, 58, 44, 28, O);
    for (let y = 59; y < 85; y++) { const r = Math.min(281, 279 + Math.floor((y - 59) * 0.6)); p(239, y, r - 239, 1, y < 66 ? '#a8e4f0' : y < 76 ? '#7ac4dc' : '#5aa4c4'); }
    p(228, 62, 4, 7, O); p(229, 63, 2, 5, '#9aa0ae');
    p(292, 100, 5, 6, O); p(293, 101, 3, 4, '#fff3a8');
    p(230, 132, 70, 5, O); p(231, 133, 68, 2, '#c8ccd6'); p(231, 135, 68, 1, '#8a909e');
    p(240, 88, 1, 44, O); p(276, 96, 6, 2, O);
    [62, 262].forEach((wx) => { dc(wx, 140, 14, '#0c0810'); p(wx - 16, 139, 33, 1, O); });   // vòm bánh
    // bánh xe (canvas riêng, đứng yên trên mặt đường)
    X = wheels.getContext('2d');
    [62, 262].forEach((wx) => { dc(wx, 141, 11, '#1e1a22'); dc(wx, 141, 6, '#9aa0ae'); dc(wx, 141, 2, '#d8dce6'); p(wx - 4, 137, 2, 1, '#c8ccd6'); });
  }

  /* ---------- con trỏ bàn tay chỉ (pixel, phóng x2) ---------- */
  let cursor = '';
  function handCursor() {
    const rows = ['....OO.......', '...OSSO......', '...OSSO......', '...OSSO......', '...OSSOOO....', '...OSSOSSOOO.', 'OO.OSSOSSOSSO', 'OSOOSSSSSSSSO', 'OSSOSSSSSSSSO',
      '.OSSSSSSSSSSO', '..OSSSSSSSSSO', '..OSSSSSSSSO.', '...OSSSSSSSO.', '...OSSSSSSO..', '....OSSSSSO..', '....OOOOOOO..'];
    const c = document.createElement('canvas');
    c.width = 26; c.height = 32;
    const x = c.getContext('2d');
    rows.forEach((r, j) => [...r].forEach((v, i) => { if (v === '.') return; x.fillStyle = v === 'O' ? '#111' : '#f0c8a0'; x.fillRect(i * 2, j * 2, 2, 2); }));
    x.fillStyle = '#c8946a';
    rows.forEach((r, j) => { const e = r.lastIndexOf('S'); if (j > 6 && e > 0) x.fillRect(e * 2, j * 2, 2, 2); });
    return `url(${c.toDataURL()}) 9 1`;
  }

  /* ---------- bàn tay của bạn (góc nhìn người chơi: thò từ mép dưới lên, úp tay = thấy mu bàn tay + móng) ----------
   * reach (với lên) -> grip (nắm) -> pull (giật khỏi móc) -> out (rút xuống ra khỏi màn, mang theo món đồ) */
  const SKIN = '#e8b888', SKIN_HI = '#f8d4ac', SKIN_SH = '#c08a5a', NAIL = '#f6dccc';
  const hand = { x: 0, y: 220, mode: 'idle', t: 0, from: null, to: null, carry: null };
  // x, y = đầu ngón tay (giữa, trên cùng) · grip: ngón co lại ôm mép dưới món đồ (không thấy móng) · tay áo = áo sân nhà của đội
  function drawHand(x, y, grip) {
    x = Math.round(x); y = Math.round(y);
    const kit = SFC_CONFIG.mainPath.playerTeam.kit;
    P(x - 9, y + 22, 18, 200, O); P(x - 8, y + 23, 16, 200, kit.shirt); P(x + 4, y + 23, 4, 200, kit.shirtDark);
    P(x - 8, y + 22, 16, 3, kit.accent); P(x - 8, y + 25, 16, 1, mix(kit.accent, '#000000', 0.3));
    P(x - 9, y + 7, 18, 16, O); P(x - 8, y + 8, 16, 14, SKIN); P(x + 5, y + 8, 3, 14, SKIN_SH); P(x - 8, y + 19, 13, 3, SKIN_SH);
    for (let k = 0; k < 4; k++) { const kx = x - 8 + k * 4; P(kx + 1, y + 9, 2, 1, SKIN_HI); P(kx + 3, y + 9, 1, 2, SKIN_SH); }   // đốt ngón
    const len = grip ? [3, 4, 4, 3] : [6, 8, 8, 7];
    for (let k = 0; k < 4; k++) {
      const fx = x - 9 + k * 4 + (k > 1 ? 1 : 0), l = len[k], top = y + 8 - l;
      P(fx, top - 1, 5, l + 2, O); P(fx + 1, top, 3, l + 1, SKIN); P(fx + 3, top, 1, l + 1, SKIN_SH);
      if (grip) P(fx + 1, top, 3, 1, SKIN_HI);
      else { P(fx + 1, top, 3, 2, NAIL); P(fx + 1, top + 2, 3, 1, SKIN_SH); }
    }
    if (grip) { P(x - 13, y + 7, 6, 9, O); P(x - 12, y + 8, 4, 7, SKIN); P(x - 12, y + 8, 4, 1, SKIN_HI); }
    else { P(x - 15, y + 6, 6, 11, O); P(x - 14, y + 7, 4, 9, SKIN); P(x - 14, y + 7, 4, 2, NAIL); P(x - 14, y + 9, 4, 1, SKIN_SH); }
  }
  const lerp = (a, b, k) => a + (b - a) * k;
  function stepHand(dt) {
    if (hand.mode === 'idle') return;
    hand.t += dt;
    const D = { reach: 0.3, grip: 0.12, pull: 0.12, out: 0.36 }[hand.mode], k = Math.min(1, hand.t / D);
    const q = Math.floor(k * 8) / 8, e = hand.mode === 'out' ? q * q : 1 - (1 - q) * (1 - q);   // chuyển động theo bậc, 8 khung
    if (hand.mode !== 'grip') { hand.x = lerp(hand.from.x, hand.to.x, e); hand.y = lerp(hand.from.y, hand.to.y, e); }
    if (k < 1) return;
    const next = (mode, to) => Object.assign(hand, { mode, t: 0, from: { x: hand.x, y: hand.y }, to: to || hand.to });
    if (hand.mode === 'reach') { next('grip'); hand.carry = hand.item; }
    else if (hand.mode === 'grip') next('pull', { x: hand.x, y: hand.y + 8 });
    else if (hand.mode === 'pull') next('out', { x: hand.x + 6, y: 220 });
    else { hand.mode = 'idle'; hand.carry = null; hand.item = null; }
  }

  /* ---------- máy nổ: thân xe nhún nhẹ 1 pixel theo nhịp chậm + ống xả nhả khói ---------- */
  const smoke = [];
  let puffT = 0;
  function engine(dt) {
    puffT -= dt;
    if (puffT <= 0) { puffT = 0.32; smoke.push({ x: 11, y: 132, age: 0, life: 1.3 + Math.random() * 0.5, vx: -6 - Math.random() * 4, vy: -8 - Math.random() * 4 }); }
    for (const m of smoke) { m.age += dt; m.x += m.vx * dt; m.y += m.vy * dt; m.vx *= 0.985; }
    while (smoke.length && smoke[0].age > smoke[0].life) smoke.shift();
    return T % 1.4 < 0.2 ? -1 : 0;
  }
  function drawSmoke(dy) {
    for (const m of smoke) {
      const k = m.age / m.life, sz = Math.round(4 + k * 10), x = Math.round(m.x - sz / 2), y = Math.round(m.y + dy - sz / 2);
      const c = k < 0.3 ? '#f0eaf2' : k < 0.65 ? '#c4bacc' : '#948aa0';
      if (k < 0.55) { P(x + 1, y, sz - 2, sz, c); P(x, y + 1, sz, sz - 2, c); }   // khối bo góc
      else { L.fillStyle = c; for (let j = 0; j < sz; j++) for (let i = (j + Math.floor(m.age * 10)) % 2; i < sz; i += 2) L.fillRect(x + i, y + j, 1, 1); }   // tan bằng dither
    }
  }

  /* ---------- vẽ mỗi khung ---------- */
  let buf = null, driverLook = null;
  function frame(now) {
    if (!cv || !cv.isConnected) { raf = 0; cv = null; return; }
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now; T += dt;
    stepHand(dt);
    const dy = engine(dt), kit = SFC_CONFIG.mainPath.playerTeam.kit;
    L.imageSmoothingEnabled = false;
    L.drawImage(bg, 0, 0);
    L.drawImage(van, 0, dy);
    L.drawImage(wheels, 0, 0);
    drawSmoke(dy);
    text('KIT VAN', 137 - textW('KIT VAN', 2) / 2, 12 + dy, O, 2);
    // tài xế trong cabin (cắt theo khung kính) + vệt kính phản chiếu
    SFC.Sprites.drawAvatar(buf, driverLook, kit, T, Math.PI * 0.82);
    L.save(); L.beginPath(); L.rect(239, 59 + dy, 42, 26); L.clip(); L.drawImage(buf, 240, 44 + dy); L.restore();
    for (let k = 0; k < 6; k++) { P(268 - k, 60 + k * 2 + dy, 2, 2, 'rgba(255,255,255,0.45)'); P(276 - k, 60 + k * 2 + dy, 1, 2, 'rgba(255,255,255,0.3)'); }
    if (Math.floor(T * 8) % 23 === 0) P(296, 41, 6, 2, '#a89a6a');   // đèn đường chập chờn
    // hàng treo: món đang bị tay với tới vẫn treo trên móc tới lúc nắm
    const reaching = hand.mode === 'reach' && hand.item;
    S.items.forEach((s, i) => {
      const x = HOOK_X(i);
      P(x - 1, 46 + dy, 3, 1, '#c9ced8'); P(x - 1, 47 + dy, 1, 3, '#c9ced8'); P(x + 1, 47 + dy, 1, 2, '#c9ced8');
      const onHook = !s.sold || (reaching && hand.item.kind === 'item' && hand.item.i === i);
      const lit = S.hover === s.key && !s.sold, lift = (lit ? -1 : 0) + dy;
      if (onHook) { patch(s.id, x - 10, 51 + lift, lit); if (s.hot) hotSticker(x + 3, 47 + lift); }
      tag(x + 4, 79 + dy, s.price, s.hot, s.sold && !onHook);
    });
    // hộp cứu thương trên quầy + thẻ giá treo mép quầy
    S.kits.forEach((k, i) => {
      if (hand.carry && hand.carry.kind === 'kit' && hand.carry.i === i) return;
      medkit(KIT_X(i) - 9, 96 + dy, S.hover === k.key);
      tag(KIT_X(i), 117 + dy, S.kitPrice, false, false);
    });
    if (reaching && hand.item.kind === 'kit' && !S.kits[hand.item.i]) medkit(KIT_X(hand.item.i) - 9, 96 + dy, false);   // đã chữa (hết hộp) nhưng tay chưa tới
    // tay + món đồ đang nắm
    if (hand.mode !== 'idle') {
      const c = hand.carry;
      if (c) { if (c.kind === 'kit') medkit(hand.x - 9, hand.y - 3); else patch(c.id, hand.x - 10, hand.y - 14, false); }
      drawHand(hand.x, hand.y, hand.mode !== 'reach');
    }
    raf = requestAnimationFrame(frame);
  }

  const KitVan = {
    // khung toàn màn (640x360): canvas + vùng bấm (data-rt = mục của RunUI) + bong bóng thoại + tiền + chân (nút LEAVE / DONE)
    // o: { items: [{ id, price, sold, hot, key, say: [tiêu đề, câu] }], kits: [{ key, say }], kitPrice, cash (html), foot (html),
    //      sel: key đang chọn bằng phím, idle: câu chào }
    html(o) {
      S.items = o.items; S.kits = o.kits; S.kitPrice = o.kitPrice;
      if (o.sel !== S.talkKey) S.talk = null;   // câu tài xế vừa nói chỉ giữ khi vẫn đang chọn món đó
      S.hover = o.sel || null;
      const hit = (key, x, y, w, h, say) => `<button class="kv-hit" data-rt="${key}" data-sb="${esc(say[0] || '')}" data-sl="${esc(say[1] || '')}"
          style="left:${x * 2}px;top:${y * 2}px;width:${w * 2}px;height:${h * 2}px"></button>`;
      const hits = o.items.map((s, i) => (s.key ? hit(s.key, HOOK_X(i) - 11, 46, 22, 42, s.say) : '')).join('')
        + o.kits.map((k, i) => hit(k.key, KIT_X(i) - 10, 93, 20, 26, k.say)).join('');
      const sel = o.items.concat(o.kits).find((x) => x.key && x.key === o.sel);
      const say = S.talk || (sel ? sel.say : ['', o.idle]);
      S.idle = o.idle;
      return `<div class="kv-page" style="--hand:${cursor || (cursor = handCursor())}">
          <canvas class="kv-lo" width="${LW}" height="${LH}"></canvas>${hits}
          <div class="kv-bubble">${this.bubble(say)}</div>
          <div class="kv-cash">${o.cash}</div><div class="kv-foot">${o.foot}</div>
        </div>`;
    },
    bubble(say) { return (say[0] ? `<b>${esc(say[0])}</b>` : '') + `<p>${esc(say[1] || '')}</p>`; },
    // sau khi vẽ DOM: gắn canvas vào vòng vẽ, trỏ chuột vào vùng bấm = bong bóng giải thích (onHover: RunUI đổi mục đang chọn, không vẽ lại)
    bind(root, onHover) {
      const el = root.querySelector('.kv-page canvas.kv-lo');
      if (!el) return;
      if (!bg) { paintStatic(); buf = document.createElement('canvas'); buf.width = 40; buf.height = 44; }
      driverLook = SFC.Profile.lookOf(Object.assign({}, SFC_CONFIG.progression.defaultLook, DRIVER));
      cv = el; L = cv.getContext('2d');
      if (!raf) { last = 0; raf = requestAnimationFrame(frame); }
      const bub = root.querySelector('.kv-bubble');
      root.querySelectorAll('.kv-hit').forEach((h) => {
        h.addEventListener('mouseenter', () => { S.hover = h.dataset.rt; S.talk = null; bub.innerHTML = this.bubble([h.dataset.sb, h.dataset.sl]); if (onHover) onHover(h.dataset.rt); });
        h.addEventListener('mouseleave', () => { if (S.hover === h.dataset.rt) S.hover = null; bub.innerHTML = this.bubble(S.talk || ['', S.idle]); });
      });
    },
    // câu tài xế nói (kết quả mua / thiếu tiền) về món key: giữ tới khi đổi mục đang chọn
    say(line, key, title = '') {
      S.talk = [title, line]; S.talkKey = key;
      const bub = cv && cv.parentNode && cv.parentNode.querySelector('.kv-bubble');
      if (bub) bub.innerHTML = this.bubble(S.talk);
    },
    // bàn tay lấy món đồ: kind 'item' (móc thứ i, id BADGE) · 'kit' (hộp cứu thương thứ i)
    grab(kind, i, id) {
      if (this.busy()) return;
      const x = kind === 'kit' ? KIT_X(i) : HOOK_X(i), y = kind === 'kit' ? 99 : 65;
      Object.assign(hand, { mode: 'reach', t: 0, x: x + 8, y: 200, from: { x: x + 8, y: 200 }, to: { x, y }, carry: null, item: { kind, i, id }, at: performance.now() });
    },
    // tay đang lấy món (quá 1.5 giây = vòng vẽ bị dừng giữa chừng, coi như xong để không khoá Shop)
    busy() { return hand.mode !== 'idle' && performance.now() - hand.at < 1500; },
  };

  SFC.KitVan = KitVan;
})();
