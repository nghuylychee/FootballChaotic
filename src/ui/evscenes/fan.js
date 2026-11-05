/* Cảnh sự kiện ??? BIGGEST FAN (quà của fan + polaroid) — khung chung + quy ước: src/ui/evscene.js · cách diễn: docs/ux-screens/screens/event-scenes.json
 * Nền lề đường chung, character của bạn đứng giữa (ngoại hình thật, áo đội). 1 cậu nhóc mặc đúng áo đội bạn chạy từ mép phải vào (0,6 s,
 * 1 lần), dừng trước mặt bạn, giơ hộp quà thắt nơ trắng (màu trung tính: BADGE nào, độ hiếm nào cũng có thể, đúng cơ chế 'any') có thẻ hình
 * miếng vá dấu ?, rồi nhún nhảy chờ. Trỏ Thank you!: hộp nhấc lên viền vàng.
 * Kết quả (~1,4 s rồi đứng yên): hộp rung 2 nhịp rồi bung (nắp văng, giấy màu), miếng vá BADGE thật bay lên (viền màu độ hiếm thật, miếng to 40x44)
 * + tem 'The whole team gets it' (DOM), đèn flash, 1 tấm polaroid (bạn + cậu nhóc + BADGE) rơi xuống góc trái dưới và nằm đó tới CONTINUE. */
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

  // bố cục (pixel khung 320x180): bạn (khung 40x44) bên trái giữa · cậu nhóc (sprite thu 0,8 = 32x35) bên phải, chân cùng mép vỉa hè
  const YX = 84, YY = 87;
  const KX = 132, KY = 95, KW = 32, KH = 35, RUN_IN = 0.6;
  const PX = 126, PY = 66;            // tâm miếng vá to lúc đứng yên: giữa 2 người, trên đầu
  const POL = { x: 10, y: 114 };      // polaroid nằm ở góc trái dưới
  // cậu nhóc: tóc bát úp, tàn nhang (chỉ là dữ liệu hình)
  const KID = { hair: 'bowl', face: 'freckles', skin: 1, hairColor: 1 };
  // hộp quà: giấy xanh mòng két (không trùng màu độ hiếm nào), nơ trắng trung tính
  const GIFT = { p: '#2a8c84', pd: '#1c6a64', ph: '#3eaa9e', r: '#f4efe0', rd: '#c8c0ac' };

  /* ---------- dấu ? 5x7 · miếng vá BADGE 20x22 (chép từ kitvan.js patch / shape) ---------- */
  const QM = ['.###.', '#...#', '....#', '..##.', '..#..', '.....', '..#..'];
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
  const rcol = (id) => { const d = BD()[id] || {}; return d.injury ? '#ff5a6e' : (RAR()[d.rarity] || RAR().common).color; };
  const pen = (c) => { const X = c.getContext('2d'); return (x, y, w, h, col) => { X.fillStyle = col; X.fillRect(x, y, w, h); }; };
  function shape(P, x, y, w, h, c) {
    for (let j = 0; j < h; j++) {
      const inset = j === 0 || j === h - 1 ? 3 : j === 1 || j === h - 2 ? 1 : 0, extra = j >= h - 4 ? j - (h - 5) : 0;
      P(x + inset + extra, y + j, w - (inset + extra) * 2, 1, c);
    }
  }
  // thân miếng vá: nền tối pha màu c, chỉ khâu chấm màu c
  function patchBody(P, x, y, w, h, c) {
    const base = mix('#1c1e28', c, 0.4), hi = mix('#1c1e28', c, 0.62);
    shape(P, x, y, w, h, O);
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
    const c = Object.assign(document.createElement('canvas'), { width: 20, height: 22 });
    patchBody(pen(c), 0, 0, 20, 22, rcol(id));
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
    const W = 40, H = 44, c = Object.assign(document.createElement('canvas'), { width: W, height: H }), P = pen(c), rc = rcol(id);
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

  /* ---------- hộp quà 18x13 + nơ 3 hàng trên: giấy xanh, dải nơ trắng dọc, nắp sáng hơn · thẻ miếng vá dấu ? viền trắng treo ở nơ ---------- */
  // lid: còn nắp · open: hộp đã bung (chỉ còn thân, miệng tối)
  function gift(k, x, y, o = {}) {
    const P = k.P, G = GIFT;
    x = Math.round(x); y = Math.round(y);
    if (o.lit) { P(x - 3, y + 1, 24, 17, '#ffe14f'); P(x + 2, y - 2, 14, 6, '#ffe14f'); }
    P(x, y + 3, 18, 13, O); P(x + 1, y + 4, 16, 11, G.p); P(x + 13, y + 4, 4, 11, G.pd); P(x + 1, y + 14, 16, 1, G.pd);
    P(x + 8, y + 4, 2, 11, G.r); P(x + 9, y + 4, 1, 11, G.rd);   // dải nơ dọc
    if (o.open) { P(x + 1, y + 4, 16, 2, '#0e1a1c'); P(x + 8, y + 4, 2, 2, '#0e1a1c'); return; }
    P(x - 1, y + 3, 20, 4, O); P(x, y + 4, 18, 2, G.ph); P(x, y + 4, 18, 1, mix(G.ph, '#ffffff', 0.3)); P(x + 14, y + 4, 4, 2, G.p);   // nắp
    P(x + 8, y + 4, 2, 2, G.r);
    // nơ: 2 quai + nút
    P(x + 4, y, 5, 4, O); P(x + 9, y, 5, 4, O); P(x + 5, y + 1, 3, 2, G.r); P(x + 10, y + 1, 3, 2, G.r); P(x + 10, y + 2, 3, 1, G.rd);
    P(x + 8, y + 1, 2, 3, O); P(x + 8, y + 2, 2, 1, G.r);
  }
  // thẻ hình miếng vá dấu ? buộc ở nơ, rủ trước mặt hộp bên trái (bìa trắng, không viền màu: chưa biết độ hiếm) · vẽ sau 2 bàn tay cậu nhóc
  function giftTag(k, x, y) {
    x = Math.round(x); y = Math.round(y);
    k.ln(x + 7, y + 3, x + 4, y + 6, GIFT.r);
    tagPatch(k, x - 1, y + 5);
  }
  let tagCv = null;
  function tagPatch(k, x, y) {
    if (!tagCv) {
      tagCv = Object.assign(document.createElement('canvas'), { width: 11, height: 12 });
      const P = pen(tagCv);
      shape(P, 0, 0, 11, 12, O);
      for (let j = 1; j < 11; j++) { const ins = j === 1 || j === 10 ? 2 : 1, ex = j >= 8 ? j - 7 : 0; P(ins + ex, j, 11 - (ins + ex) * 2, 1, j < 3 ? '#fffaf0' : '#ece4d4'); }
      QM.forEach((r, j) => [...r].forEach((v, i) => { if (v === '#') P(3 + i, 2 + j - (j > 4 ? 1 : 0), 1, 1, '#3a2a44'); }));
    }
    k.X.drawImage(tagCv, x, y);
  }
  // tim nhỏ bay lên trên đầu cậu nhóc lúc chờ (fan cuồng), tan bằng dither ở cuối
  const HEART = ['.O.O.', 'OHOHO', 'OHHHO', '.OHO.', '..O..'];
  function heart(k, x, y, fade) {
    HEART.forEach((r, j) => [...r].forEach((v, i) => {
      if (v === '.' || (fade && (i + j) % 2)) return;
      k.P(Math.round(x) + i, Math.round(y) + j, 1, 1, v === 'O' ? '#7a2a44' : '#ff8aa8');
    }));
  }

  /* ---------- cậu nhóc: sprite người chơi thu nhỏ 0,8 (lấy mẫu gần nhất, giữ viền) · tay cầm hộp ---------- */
  let kidBuf = null, kLook = null;
  function kid(k, x, y, t, running) {
    kidBuf = kidBuf || Object.assign(document.createElement('canvas'), { width: 40, height: 44 });
    kLook = kLook || k.look(KID);
    SFC.Sprites.drawAvatar(kidBuf, kLook, k.kitHome(), t, Math.PI, running ? { vx: -60 } : null, true);
    k.X.imageSmoothingEnabled = false;
    k.X.drawImage(kidBuf, 0, 0, 40, 44, Math.round(x), Math.round(y), KW, KH);
  }
  // 2 bàn tay nhỏ ôm 2 bên hộp (da cậu nhóc, viền mực)
  function kidHands(k, gx, gy) {
    const s = (kLook && kLook.skin) || '#e8b888';
    [[gx - 2, gy + 9], [gx + 17, gy + 9]].forEach(([x, y]) => { k.P(x, y, 4, 4, O); k.P(x + 1, y + 1, 2, 2, s); });
  }
  // xe đạp BMX của cậu nhóc dựng chân chống bên phải (vừa quăng xe chạy tới) — đồ nền: màu xỉn, viền sẫm cùng màu
  function bike(k) {
    const P = k.P, F = '#8a3a46', FH = '#a85460', T = '#1a1420', R = '#6a6878';
    for (let j = 0; j < 2; j++) k.d(212 + j, 132 + j, 246, '#2a2030', 2);   // bóng
    // 2 bánh: lốp dày 2 pixel + vành 1 pixel (tô theo khoảng cách tới tâm), 2 nan chéo, trục
    [[219, 125], [238, 125]].forEach(([cx, cy]) => {
      for (let j = -6; j <= 6; j++) for (let i = -6; i <= 6; i++) {
        const r = Math.hypot(i, j);
        if (r > 4.6 && r <= 6.4) P(cx + i, cy + j, 1, 1, T); else if (r > 3.6 && r <= 4.6) P(cx + i, cy + j, 1, 1, R);
      }
      k.ln(cx - 2, cy - 2, cx + 2, cy + 2, '#4a4858'); k.ln(cx - 2, cy + 2, cx + 2, cy - 2, '#4a4858'); P(cx, cy, 1, 1, R);
    });
    const BB = [229, 126], ST = [231, 116], HD = [222, 116];
    k.ln(BB[0], BB[1], 238, 125, F); k.ln(ST[0], ST[1], 238, 125, F); k.ln(BB[0], BB[1], ST[0], ST[1], F);
    k.ln(ST[0], ST[1], HD[0], HD[1], FH); k.ln(HD[0], HD[1], BB[0], BB[1], F); k.ln(HD[0], HD[1], 219, 125, F);
    k.ln(HD[0], HD[1], 221, 111, '#4a4250'); P(217, 110, 7, 1, '#4a4250'); P(216, 110, 2, 2, T);   // ghi-đông + tay nắm
    P(229, 114, 6, 2, T); P(230, 114, 4, 1, '#3a3040');   // yên
    k.ln(BB[0], BB[1], 232, 132, '#4a4250');   // chân chống
    P(BB[0] - 1, BB[1] - 1, 3, 3, '#3a3040');   // đùi đĩa
  }
  const you = (s) => { const m = (s.team || []).find((x) => x.you); return (m && m.look) || SFC.Profile.avatar().look; };

  /* ---------- polaroid (bạn + cậu nhóc + BADGE giơ lên giữa): khung giấy ngà, ảnh 44x34, lề dưới dày, mẩu băng dính trên ---------- */
  const PW = 50, PH = 48, PH0 = 34;   // khung · chiều cao ảnh
  function polaroid(k, x, y, s, id, dev) {
    x = Math.round(x); y = Math.round(y);
    const P = k.P, X = k.X, px = x + 3, py = y + 3;
    for (let j = 0; j < 2; j++) k.d(x + 2, y + PH + j, x + PW + 2, '#0e0a12', j ? 2 : 1);   // bóng dưới
    P(x, y, PW, PH, O); P(x + 1, y + 1, PW - 2, PH - 2, '#ddd4c2'); P(x + 1, y + PH - 2, PW - 2, 1, '#b8ac98');
    // ảnh: nền chiều tà (trời cam, phố tím, vỉa hè), 2 người, BADGE giơ lên giữa
    X.save(); X.beginPath(); X.rect(px, py, PW - 6, PH0); X.clip();
    P(px, py, PW - 6, PH0, '#de6a4c'); P(px, py, PW - 6, 8, '#b8484e'); P(px, py + 16, PW - 6, 10, '#3a2040'); P(px, py + 26, PW - 6, 8, '#6a5a6c');
    k.avatar(you(s), px - 7, py - 1, { facing: Math.PI / 2, t: 0.3 });
    kidBuf = kidBuf || Object.assign(document.createElement('canvas'), { width: 40, height: 44 });
    kLook = kLook || k.look(KID);
    SFC.Sprites.drawAvatar(kidBuf, kLook, k.kitHome(), 0.6, Math.PI / 2, null, true);
    X.drawImage(kidBuf, 0, 0, 40, 44, px + 20, py + 4, KW, KH);
    if (id) X.drawImage(iconCv(iconKey(id)), px + 15, py + 1);
    // ảnh đang hiện dần: phủ trắng dither thưa dần (dev 0 -> 1)
    if (dev < 1) for (let yy = 0; yy < PH0; yy++) {
      if (dev <= 0) P(px, py + yy, PW - 6, 1, '#f4efe4');
      else k.d(px, py + yy, px + PW - 6, '#f4efe4', dev < 0.5 ? 2 : 4);
    }
    X.restore();
    P(x + PW / 2 - 7, y - 2, 14, 4, '#c8bc8c'); P(x + PW / 2 - 7, y + 1, 14, 1, '#a89c70');   // băng dính
  }

  /* ---------- kết quả: thời điểm (giây từ lúc bấm Thank you!) ---------- */
  const TM = { shake: 0.05, burst: 0.45, big: 0.72, flash: 0.98, drop: 1.02, land: 1.36 };
  // giấy màu bung ra lúc mở hộp (cố định): vx, vy, màu (0 = vàng đội, 1 = trắng, 2 = xanh giấy, 3 = màu độ hiếm thật)
  const BITS = [[-30, -62, 0], [-18, -74, 1], [-6, -80, 3], [6, -78, 2], [18, -70, 0], [30, -58, 3], [-24, -44, 2], [24, -46, 1], [0, -66, 0]];

  function scene(k, s) {
    const P = k.P, t = s.tp, T = k.T(), res = s.phase === 'result', b = res ? (s.res || []).find((x) => x.kind === 'badge') : null;
    // bạn: đứng giữa, quay về phía cậu nhóc
    k.avatar(you(s), YX, YY, { facing: res ? Math.PI * 0.3 : 0, t: T });
    // cậu nhóc: chạy vào 1 lần (bước 8 bậc) -> đứng nhún nhảy chờ · kết quả: nhảy cẫng lên vui
    let kx = KX, ky = KY, running = false;
    if (!res && t < RUN_IN) { kx = lerp(332, KX, out2(t / RUN_IN)); running = true; ky += Math.floor(t * 12) % 2 ? -1 : 0; }
    else if (!res) {
      ky += (T % 0.6) < 0.18 ? -2 : 0;
      const h = (t - RUN_IN) % 1.6;
      if (h < 1) heart(k, kx + 13 + Math.round(Math.sin(h * 6)), ky + 4 - h * 12, h > 0.7);
    }
    else if (t > TM.burst) ky += (T % 0.4) < 0.16 ? -3 : 0;
    kid(k, kx, ky, T * (running ? 1.6 : 1), running);
    // hộp quà trước ngực cậu nhóc (lệch về phía bạn) · trỏ Thank you! = hộp nhấc lên viền vàng · kết quả: rung 2 nhịp rồi bung
    let gx = kx - 8, gy = ky + 14;
    if (!res) {
      const lit = s.hover === 0 && t >= RUN_IN;
      if (lit) gy -= 2;
      gift(k, gx, gy, { lit });
      kidHands(k, gx, gy);
      giftTag(k, gx, gy);
      return;
    }
    if (t < TM.burst) {
      const shake = (t > TM.shake && t < 0.2) || (t > 0.28 && t < 0.43) ? (Math.floor(t * 40) % 2 ? 1 : -1) : 0;
      gift(k, gx + shake, gy - (shake ? 1 : 0));
      kidHands(k, gx, gy);
      giftTag(k, gx + shake, gy - (shake ? 1 : 0));
    } else {
      gift(k, gx, gy, { open: true });
      kidHands(k, gx, gy);
      const v = t - TM.burst;
      // nắp văng lên rồi rơi ra sau lưng cậu nhóc
      if (v < 0.5) {
        const lx = gx - 1 + v * 40, ly = gy + 3 - 70 * v + 220 * v * v;
        if (ly < 128) { P(lx, ly, 20, 4, O); P(lx + 1, ly + 1, 18, 2, GIFT.ph); P(lx + 8, ly + 1, 2, 2, GIFT.r); }
      }
      // giấy màu: văng lên rồi rơi, tan dần trước 1,2 s
      if (v < 0.7) BITS.forEach(([vx, vy, c], i) => {
        const x = gx + 9 + vx * v * 1.4, y = gy + 4 + vy * v * 1.4 + 150 * v * v;
        const col = [k.kitHome().accent, '#f4efe0', GIFT.ph, b ? rcol(b.id) : '#f4efe0'][c];
        if (v < 0.45 || (i + Math.floor(v * 20)) % 2) P(Math.round(x), Math.round(y), i % 3 ? 2 : 1, i % 2 ? 1 : 2, col);
      });
    }
    // miếng vá BADGE thật: bay khỏi hộp (cỡ 20x22) -> loé trắng -> miếng to 40x44 nảy giữa 2 người rồi đứng yên (nhún 1 pixel chậm) + lấp lánh
    if (b && t >= TM.burst) {
      const pc = patchCv(b.id);
      if (t < TM.big) {
        const u = q8((t - TM.burst) / (TM.big - TM.burst));
        k.X.drawImage(pc, Math.round(lerp(gx - 1, PX - 10, u)), Math.round(lerp(gy - 4, PY - 11, u)));
      } else {
        const v = t - TM.big, bounce = v < 0.47 ? [-6, -3, 0, -2, 0, -1, 0][Math.min(6, Math.floor(v / 0.067))] : (Math.floor(T * 1.5) % 2 ? -1 : 0);
        const y = PY - 22 + bounce;
        if (v < 0.06) k.X.drawImage(flashShape(), PX - 21, y - 1);
        k.X.drawImage(bigPatchCv(b.id), PX - 20, y);
        if (t > TM.land) {
          const c = rcol(b.id);
          [[PX - 27, PY - 16], [PX + 26, PY - 8], [PX - 26, PY + 12], [PX + 25, PY + 14]].forEach(([sx, sy], i) => {
            const on = (Math.floor(T * 3) + i) % 4;
            if (on === 0) { P(sx - 2, sy, 5, 1, c); P(sx, sy - 2, 1, 5, c); P(sx, sy, 1, 1, '#fff'); }
            else if (on === 1) P(sx, sy, 1, 1, c);
          });
        }
      }
    }
    // polaroid: rơi từ trên xuống góc trái dưới (bậc 8 khung, nảy 1 lần), ảnh hiện dần trong lúc rơi
    if (t >= TM.drop) {
      const u = q8((t - TM.drop) / (TM.land - TM.drop - 0.08)), bump = t > TM.land - 0.08 && t < TM.land ? -2 : 0;
      polaroid(k, POL.x, lerp(-PH - 4, POL.y, u * u) + bump, s, b && b.id, cl((t - TM.drop - 0.1) / 0.24));
    }
    // đèn flash chụp ảnh: phủ trắng dither cả cảnh (dày rồi thưa, không có khung trắng đặc) trong 0,15 s
    if (t >= TM.flash && t < TM.flash + 0.15) {
      const f = t - TM.flash;
      for (let y = 0; y < k.LH; y++) k.d(0, y, k.LW, '#fff8f0', f < 0.07 ? 2 : 4);
    }
  }

  SFC.EvScene.add('fan', {
    paint(k) { k.street({ lamp: 30, sun: false }); bike(k); },
    draw(k, s) { scene(k, s); },
    // tem 'cả đội nhận' dán ở mép trên miếng vá, hiện khi miếng vá nảy xong (chờ phần còn lại của hoạt cảnh; RunUI vẽ lại giữa chừng thì
    // không chờ lại từ đầu)
    dom(s) {
      if (s.phase !== 'result' || !(s.res || []).some((x) => x.kind === 'badge')) return '';
      const d = Math.max(0, TM.big + 0.45 - (SFC.EvScene.state().tp || 0));
      return `<em class="evf-kind" style="--d:${d.toFixed(2)}s">${SFC.UIHelpers.esc(SFC.t('The whole team gets it'))}</em>`;
    },
  });
})();
