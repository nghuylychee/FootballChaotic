/* Cảnh sự kiện ??? OLD COACH: giấy cam kết trên ghế băng gỗ mép sân — khung chung + quy ước: src/ui/evscene.js · cách diễn:
 * docs/ux-screens/screens/event-scenes.json (format contract, sự kiện coach).
 * Nhìn từ trên xuống mặt ghế băng (3 tấm ván, cỏ sân 2 đầu). Ông HLV cúi vào từ mép trên (mũ lưỡi trai cũ, ria bạc, còi đeo cổ màu xỉn:
 * còi không được là thứ sáng nhất màn nữa — vấn đề #2), tay đẩy tờ giấy cam kết tới. Tờ giấy: dải đỏ trên đầu · kẹp giấy góc phải trên kẹp
 * miếng vá BADGE viền màu COMMON có dấu ? (thứ được) · giữa giấy khung viền đỏ đậm = điều khoản rủi ro: dấu ✚ đỏ vẽ bằng pixel + nhãn INJURY?
 * (DOM) + ảnh thẻ 3 người trong đội, mỗi người 1 dấu ? (1 trong 3 có thể bị) · Shin Guards còn lượt chặn ở act này: miếng vá Shin Guards
 * đè lên khung đỏ kèm ✓ xanh · dưới cùng dòng ký tên + cây bút.
 * Trỏ Train hard: bút nhấc lên chờ ký · trỏ Say no: tờ giấy lùi về phía ông HLV.
 * Kết quả (~1,3 s rồi đứng yên): bút ký 1 nét -> còi -> miếng vá bung khỏi kẹp, lật ra icon thật -> con dấu: đỏ đập lên ảnh người bị đau
 * (cả người, băng quấn đúng chỗ + ✚) · bật ra khỏi miếng vá Shin Guards · xanh khung cả 3 người (không ai đau). Chữ kết quả ở thẻ DOM của khung. */
(function () {
  const O = '#120c16';
  const _t = (s, v) => SFC.t(s, v);
  const RAR = () => SFC_CONFIG.progression.rarities;
  const mix = (a, b, k) => {
    const h = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
    const A = h(a), C = h(b);
    return '#' + A.map((v, i) => Math.round(v + (C[i] - v) * k).toString(16).padStart(2, '0')).join('');
  };
  const ease = (k) => 1 - (1 - k) * (1 - k);
  const clamp01 = (k) => Math.max(0, Math.min(1, k));

  /* ---------- bố cục (pixel khung 320x180) ----------
   * DOM của khung chiếm góc trái trên (chú thích, x < 146, y < 31) và góc phải dưới (nút x > 177, y > 140; thẻ kết quả x > 161, y > 100)
   * -> tờ giấy lệch trái, ông HLV ở mép trên bên phải chú thích, đường mắt: ông HLV -> tay -> giấy -> dòng ký tên -> nút */
  const PAPER = { x: 44, y: 42, w: 126, h: 130 };
  const CX = 210;                                            // giữa người ông HLV
  const CL = { x: 50, y: 78, w: 114, h: 50 };                // khung điều khoản rủi ro (toạ độ khi giấy chưa xê dịch)
  const FACE_X = (i) => CL.x + 28 + i * 26;                  // ảnh thẻ từng người (16x17), chừa cột trái dưới dấu ✚ cho Shin Guards
  const FACE_Y = CL.y + 26;
  const SHIN = { x: CL.x + 2, y: CL.y + 25 };                // miếng vá Shin Guards đè mép trái khung đỏ, ngay dưới dấu ✚
  const CLIP = { x: PAPER.x + 96, y: PAPER.y + 8 };          // miếng vá ở kẹp (góc trên trái miếng vá 20x22)
  const SIGN = { x: PAPER.x + 12, y: PAPER.y + 113, w: 80 }; // dòng ký tên
  // màu
  const PAPER_C = '#dbcfb3', PAPER_SH = '#bcad8e', PAPER_LN = '#a29478';
  const RED = '#ff3d5a', RED_DK = '#a8203a', INK_RED = '#d8283a', GREEN = '#6bff4f', GREEN_DK = '#2f9a3a';

  /* ---------- chữ pixel nhỏ (chỉ dấu ?): '#' = pixel ---------- */
  const QM = ['.###.', '##.##', '...##', '..##.', '..##.', '.....', '..##.'];
  function glyph(k, rows, x, y, c, ink) {
    if (ink) rows.forEach((r, j) => [...r].forEach((v, i) => { if (v === '#') k.P(x + i - 1, y + j - 1, 3, 3, ink); }));
    rows.forEach((r, j) => [...r].forEach((v, i) => { if (v === '#') k.P(x + i, y + j, 1, 1, c); }));
  }
  // dấu ✚ đỏ 11x11 tay dày 3 pixel, viền mực, gờ tối dưới (vẽ bằng pixel: font pixel vẽ ✚ thành dấu +)
  function cross(k, x, y, c = RED, dk = RED_DK) {
    k.P(x + 3, y, 5, 11, O); k.P(x, y + 3, 11, 5, O);
    k.P(x + 4, y + 1, 3, 9, c); k.P(x + 1, y + 4, 9, 3, c);
    k.P(x + 4, y + 9, 3, 1, dk); k.P(x + 1, y + 6, 3, 1, dk); k.P(x + 7, y + 6, 3, 1, dk);
  }
  // vòng tròn rỗng dày w (con dấu): rỗ mực theo hsh để trông như dấu cao su đóng tay
  function ring(k, cx, cy, r, w, c, worn) {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      const d = Math.sqrt(x * x + y * y);
      if (d < r + 0.5 && d >= r - w + 0.5 && !(worn && k.hsh(x * 13.1 + y * 7.7) > 0.86)) k.P(cx + x, cy + y, 1, 1, c);
    }
  }

  /* ---------- miếng vá BADGE 20x22 (cùng hình miếng vá KIT VAN): viền mực (lit = viền vàng), nền tối pha màu độ hiếm, chỉ khâu chấm, icon giữa ----------
   * lit: màu viền sáng 2 lớp (vàng = món của bạn, trắng = vừa đỡ con dấu, xanh = đã chặn) · w < 20: đang lật (vẽ hẹp lại quanh tâm, không có icon) */
  function patch(k, x, y, col, icon, lit, w = 20) {
    const base = mix('#1c1e28', col, 0.4), hi = mix('#1c1e28', col, 0.62), ox = Math.round((20 - w) / 2);
    const row = (j, c, grow = 0) => {
      const inset = j === 0 || j === 21 ? 3 : j === 1 || j === 20 ? 1 : 0, extra = j >= 18 ? j - 17 : 0, s = Math.min(inset + extra, Math.floor(w / 2) - 1);
      k.P(x + ox + s - grow, y + j, w - s * 2 + grow * 2, 1, c);
    };
    if (lit) for (let j = -1; j < 23; j++) row(Math.max(0, Math.min(21, j)), lit, 1);
    for (let j = 0; j < 22; j++) row(j, lit || O);
    for (let j = 1; j < 21; j++) {
      const inset = j === 1 || j === 20 ? 2 : 1, extra = j >= 18 ? j - 17 : 0, s = Math.min(inset + extra, Math.floor(w / 2) - 1);
      k.P(x + ox + s, y + j, w - s * 2, 1, j < 6 ? hi : base);
    }
    if (w < 20) return;
    for (let i = 3; i < 17; i += 2) { k.P(x + i, y + 2, 1, 1, col); if (i > 4 && i < 15) k.P(x + i, y + 19, 1, 1, col); }
    for (let j = 4; j < 18; j += 2) { k.P(x + 2, y + j, 1, 1, col); k.P(x + 17, y + j, 1, 1, col); }
    k.icon(icon, x + 3, y + 4);
  }
  const iconOf = (id) => { const d = SFC_CONFIG.run.badges[id] || {}; return d.icon ? 'ui-' + d.icon : d.school ? 'arch-' + d.school : 'ui-card'; };

  /* ---------- kẹp giấy kim loại (dọc, 6x15) kẹp mép trên tờ giấy, đầu dưới chỉ đè hàng chỉ khâu trên cùng của miếng vá ---------- */
  function clip(k, x, y) {
    const M = '#aeb2bc', MS = '#6c707c';
    const loop = (x0, y0, w, h, c) => { k.P(x0 + 1, y0, w - 2, 1, c); k.P(x0 + 1, y0 + h - 1, w - 2, 1, c); k.P(x0, y0 + 1, 1, h - 2, c); k.P(x0 + w - 1, y0 + 1, 1, h - 2, c); };
    loop(x - 1, y - 1, 8, 17, O); loop(x + 1, y + 1, 4, 13, O);
    loop(x, y, 6, 15, M); loop(x + 2, y + 3, 2, 10, MS);
    k.P(x + 5, y + 2, 1, 11, MS);
  }

  /* ---------- ảnh thẻ 1 người (đầu cắt từ sprite drawAvatar, 1x) ---------- */
  const faceBuf = {};
  let fullBuf = null;
  function faceCv(look) {
    const key = JSON.stringify(look);
    if (faceBuf[key]) return faceBuf[key];
    const c = Object.assign(document.createElement('canvas'), { width: 40, height: 44 });
    SFC.Sprites.drawAvatar(c, look, SFC_CONFIG.mainPath.playerTeam.kit, 0.3, Math.PI / 2, null, true);
    return (faceBuf[key] = c);
  }
  // khung ảnh 16x17: nền xám nhạt, đầu + vai người đó
  function photo(k, x, y, look) {
    k.P(x, y, 16, 17, O); k.P(x + 1, y + 1, 14, 15, '#9aa0ae'); k.P(x + 1, y + 13, 14, 3, '#7c828e');
    k.X.save(); k.X.beginPath(); k.X.rect(x + 1, y + 1, 14, 15); k.X.clip();
    k.X.drawImage(faceCv(look), Math.round(x - 12), Math.round(y - 12));
    k.X.restore();
  }
  // cả người (băng quấn đúng chỗ chấn thương do sprite vẽ: o.inj) -> trong con dấu đỏ
  function figure(k, x, y, look, inj) {
    fullBuf = fullBuf || Object.assign(document.createElement('canvas'), { width: 40, height: 44 });
    SFC.Sprites.drawAvatar(fullBuf, look, SFC_CONFIG.mainPath.playerTeam.kit, 0.3, Math.PI / 2, { inj }, true);
    k.X.drawImage(fullBuf, Math.round(x), Math.round(y));
  }

  /* ---------- cây bút (nhìn từ trên: chéo 45°, ngòi dưới trái) · h = độ nhấc khỏi giấy (bóng tách ra) ---------- */
  function pen(k, nx, ny, h) {
    const L = 20;
    for (let i = 1; i < L; i++) k.d(nx + i + h, ny - i - 1 + h + 1, nx + i + h + 3, '#9a8c70', h ? 2 : 1);   // bóng trên giấy (nhấc cao: thưa + lệch xa)
    for (let i = 0; i < L; i++) k.P(nx + i - 1, ny - i - 2, 4, 4, O);
    for (let i = 2; i < L; i++) { k.P(nx + i, ny - i - 1, 2, 2, i > L - 6 ? '#3a5ab0' : '#2a3050'); k.P(nx + i, ny - i - 1, 1, 1, i > L - 6 ? '#6a8ad0' : '#4a5480'); }
    k.P(nx + 1, ny - 1, 2, 1, '#9aa0ae'); k.P(nx, ny, 1, 1, O);                   // ngòi
    k.P(nx + L - 7, ny - L + 4, 1, 3, '#c8ccd6');                               // kẹp bút
  }

  /* ---------- ông HLV (nhìn chính diện, cúi vào từ mép trên): mũ lưỡi trai cũ, lông mày + ria bạc, áo khoác thể thao cũ màu mận, còi xỉn ----------
   * by = nhịp thở (0 / 1) · blink · blow = đang thổi còi (còi lên miệng) · hand = { x, y } bàn tay trái màn hình đặt lên giấy */
  const SKIN = '#c8946c', SKIN_HI = '#dcac84', SKIN_SH = '#a87450', SKIN_DK = '#7e5034';
  const HAIR = '#c4c0b8', HAIR_SH = '#8e8a84';
  const CAP = '#34405a', CAP_HI = '#46547a', CAP_SH = '#262e44', BILL = '#2a3350';
  const JK = '#5e2830', JK_HI = '#76363e', JK_SH = '#421a22', STRIPE = '#a69e96';
  function spans(k, y0, rows, c, ink = true) {
    if (ink) rows.forEach(([a, b], j) => { k.P(CX + a - 1, y0 + j - 1, b - a + 3, 3, O); });
    rows.forEach(([a, b], j) => { k.P(CX + a, y0 + j, b - a + 1, 1, c); });
  }
  function coach(k, by, blink, blow, hand) {
    const y0 = 2 + by;
    // bóng người đổ xuống ván (sáng từ sau / trên: bóng lệch xuống phải)
    for (let y = 40; y < 47; y++) k.d(CX - 20 + (y - 40), y, CX + 30 - (y - 40), '#1c1216', y < 43 ? 1 : 2);
    // thân: vai rộng hơi nhô, ngực thu lại phía dưới (đang cúi qua ghế), áo khoác mận, khoá kéo
    const torso = [[-10, 10], [-16, 16], [-20, 20], [-23, 23], [-24, 24], [-25, 25], [-25, 25], [-25, 25], [-24, 24], [-24, 24],
      [-23, 23], [-22, 22], [-22, 22], [-21, 21], [-20, 20]];
    spans(k, y0 + 25, torso, JK);
    k.P(CX - 19, y0 + 27, 38, 1, JK_HI); k.P(CX - 21, y0 + 28, 10, 1, JK_HI);
    k.P(CX + 14, y0 + 30, 9, 10, JK_SH); k.P(CX - 20, y0 + 39, 40, 1, JK_SH);
    k.P(CX, y0 + 30, 1, 10, '#7c808c');
    // cổ + cổ áo trắng xỉn
    spans(k, y0 + 23, [[-4, 4], [-4, 4], [-5, 5]], SKIN_SH, false);
    k.P(CX - 7, y0 + 25, 5, 2, STRIPE); k.P(CX + 3, y0 + 25, 5, 2, STRIPE); k.P(CX - 3, y0 + 26, 1, 2, STRIPE); k.P(CX + 3, y0 + 26, 1, 2, STRIPE);
    // dây còi + còi (bạc xỉn, nhỏ, dưới mặt; không sáng hơn giấy) · đang thổi: còi lên miệng
    if (!blow) {
      k.ln(CX - 4, y0 + 26, CX - 1, y0 + 32, '#6a2c2c'); k.ln(CX + 4, y0 + 26, CX + 1, y0 + 32, '#6a2c2c');
      k.P(CX - 3, y0 + 32, 7, 5, O); k.P(CX - 2, y0 + 33, 5, 3, '#6c727e'); k.P(CX - 2, y0 + 33, 2, 1, '#8a909c'); k.P(CX + 3, y0 + 33, 2, 2, O);
    } else k.ln(CX - 4, y0 + 26, CX + 4, y0 + 26, '#6a2c2c');
    // 2 tay từ vai vươn về phía mình (nhìn chính diện: ngắn lại), tay áo thon dần tới cổ tay, 2 sọc trắng xỉn dọc mép ngoài, cổ tay áo bo
    const arm = (sx, sy, hx, hy, out) => {
      const n = Math.max(2, hy - sy), rows = [];
      for (let j = 0; j < n; j++) {
        const q = j / (n - 1), c = Math.round(sx + (hx - sx) * q) - CX, hw = Math.round(6 - q * 2);
        rows.push([c - hw, c + hw - 1]);
      }
      spans(k, sy, rows, JK);
      rows.forEach(([a, b], j) => {
        const o = out < 0 ? a : b, inn = out < 0 ? b : a;
        k.P(CX + o - out * 1, sy + j, 1, 1, STRIPE); k.P(CX + o - out * 3, sy + j, 1, 1, STRIPE);
        k.P(CX + inn + (out < 0 ? -1 : 0), sy + j, 2, 1, JK_SH);
        if (j < 3) k.P(CX + a + 2, sy + j, b - a - 3, 1, JK_HI);
      });
      const [a, b] = rows[n - 1];
      k.P(CX + a, sy + n - 2, b - a + 1, 2, '#8a8078');
    };
    arm(CX - 20, y0 + 28, hand.x + 5, hand.y - 1, -1);
    hands(k, hand.x, hand.y, 1);
    arm(CX + 20, y0 + 28, CX + 26, y0 + 44, 1);
    hands(k, CX + 21, y0 + 44, -1);
    // đầu: tai, mặt, lông mày rậm, mũi to, ria bạc, cằm râu lún phún
    spans(k, y0 + 12, [[-11, -9], [-11, -9], [-11, -9], [-11, -9], [-11, -9]], SKIN_SH);
    spans(k, y0 + 12, [[9, 11], [9, 11], [9, 11], [9, 11], [9, 11]], SKIN_SH);
    const face = Array.from({ length: 10 }, () => [-9, 9]).concat([[-9, 9], [-8, 8], [-8, 8], [-7, 7], [-6, 6], [-4, 4]]);
    spans(k, y0 + 9, face, SKIN);
    k.P(CX + 6, y0 + 11, 3, 13, SKIN_SH); k.P(CX - 9, y0 + 9, 18, 2, SKIN_SH);   // bóng vành mũ + má phải
    k.P(CX - 9, y0 + 11, 2, 4, HAIR); k.P(CX + 8, y0 + 11, 2, 4, HAIR_SH);       // tóc mai bạc
    k.P(CX - 8, y0 + 12, 6, 2, HAIR); k.P(CX + 2, y0 + 12, 6, 2, HAIR); k.P(CX - 3, y0 + 13, 1, 1, HAIR); k.P(CX + 2, y0 + 13, 1, 1, HAIR);
    k.P(CX - 8, y0 + 14, 6, 1, SKIN_SH); k.P(CX + 2, y0 + 14, 6, 1, SKIN_SH);
    if (blink) { k.P(CX - 6, y0 + 15, 3, 1, O); k.P(CX + 3, y0 + 15, 3, 1, O); }
    else { k.P(CX - 6, y0 + 14, 2, 2, O); k.P(CX + 4, y0 + 14, 2, 2, O); }
    k.P(CX - 2, y0 + 14, 4, 6, SKIN_HI); k.P(CX + 1, y0 + 15, 1, 5, SKIN_SH); k.P(CX - 2, y0 + 19, 5, 1, SKIN_DK);
    k.P(CX - 8, y0 + 17, 1, 3, SKIN_SH); k.P(CX + 7, y0 + 17, 1, 3, SKIN_SH);   // nếp má
    spans(k, y0 + 20, [[-6, 6], [-8, 8], [-8, -3], [3, 8]], HAIR, false);
    k.P(CX - 8, y0 + 22, 5, 1, HAIR_SH); k.P(CX + 4, y0 + 22, 5, 1, HAIR_SH); k.P(CX - 7, y0 + 23, 2, 1, O); k.P(CX + 6, y0 + 23, 2, 1, O);
    k.P(CX - 2, y0 + 22, 4, 1, SKIN_DK);
    for (let x = -5; x <= 5; x += 2) k.P(CX + x, y0 + 23 + (x & 2 ? 1 : 0), 1, 1, HAIR_SH);
    if (blow) { k.P(CX - 3, y0 + 21, 7, 4, O); k.P(CX - 2, y0 + 22, 5, 2, '#6c727e'); k.P(CX - 2, y0 + 22, 2, 1, '#8a909c'); }
    // mũ lưỡi trai cũ: chóp tròn (sáng trên trái, tối phải), đường may các múi, nút chóp, logo bạc màu · vành mũ cong chìa về phía mình
    // (giữa vành thấp nhất), mặt dưới vành tối, bóng vành đổ lên trán
    spans(k, y0 + 1, [[-7, 7], [-9, 9], [-10, 10], [-11, 11], [-11, 11], [-11, 11]], CAP);
    k.P(CX - 7, y0 + 1, 9, 1, CAP_HI); k.P(CX - 9, y0 + 2, 6, 1, CAP_HI); k.P(CX - 10, y0 + 3, 2, 2, CAP_HI);
    k.P(CX + 6, y0 + 2, 5, 5, CAP_SH);
    k.P(CX, y0 + 2, 1, 5, CAP_SH); k.P(CX - 6, y0 + 3, 1, 4, CAP_SH); k.P(CX + 6, y0 + 3, 1, 4, '#1e2436'); k.P(CX - 1, y0, 2, 1, O);
    k.P(CX - 3, y0 + 3, 6, 4, '#5c5442'); k.P(CX - 2, y0 + 4, 4, 2, '#6e6650');
    k.P(CX - 8, y0 + 10, 16, 1, SKIN_DK);
    spans(k, y0 + 7, [[-14, 14], [-15, 15], [-13, 13], [-8, 8]], BILL);
    k.P(CX - 14, y0 + 7, 18, 1, CAP_HI); k.P(CX + 4, y0 + 7, 11, 1, CAP); k.P(CX - 15, y0 + 8, 31, 1, CAP);
    k.P(CX - 13, y0 + 9, 27, 1, '#1e2436'); k.P(CX - 8, y0 + 10, 17, 1, '#1e2436');
  }
  // bàn tay úp (nhìn từ trên, ngón chĩa về phía mình) 11x10, viền mực: mu bàn tay + 4 ngón tách bằng vạch da tối, đầu ngón bo
  // · ngón cái phía giữa người (thumb = -1 bên trái, 1 bên phải)
  function hands(k, x, y, thumb) {
    k.P(x - 1, y - 1, 13, 7, O); k.P(x - 1, y + 5, 13, 4, O); k.P(x, y + 9, 11, 1, O);
    k.P(x, y, 11, 9, SKIN); k.P(x, y, 11, 1, SKIN_HI); k.P(x, y + 4, 11, 1, SKIN_SH);
    for (let i = 1; i < 4; i++) k.P(x + i * 3 - 1, y + 5, 1, 4, SKIN_DK);
    [0, 3, 6, 9].forEach((fx) => k.P(fx === 9 ? x + 10 : x + fx, y + 8, 1, 1, O));
    k.P(x + 10, y + 1, 1, 7, SKIN_SH);
    const tx = thumb < 0 ? x - 3 : x + 11;
    k.P(tx - (thumb < 0 ? 0 : 0), y + 1, 3, 6, O); k.P(tx + (thumb < 0 ? 1 : 0), y + 2, 2, 4, SKIN); k.P(tx + (thumb < 0 ? 1 : 0), y + 5, 2, 1, SKIN_SH);
  }

  /* ---------- tờ giấy cam kết (ox, oy = độ xê dịch) ---------- */
  function paper(k, s, ox, oy, st) {
    const x = PAPER.x + ox, y = PAPER.y + oy, w = PAPER.w, h = PAPER.h;
    // bóng giấy trên ván (xuống phải) + giấy
    for (let j = 0; j < 3; j++) k.P(x + 2 + j, y + h + j - 1, w - 2, 1, '#2a1a14');
    k.P(x + w, y + 3, 3, h - 2, '#2a1a14');
    k.P(x, y, w, h, O); k.P(x + 1, y + 1, w - 2, h - 2, PAPER_C);
    k.P(x + w - 3, y + 1, 2, h - 2, PAPER_SH); k.P(x + 1, y + h - 3, w - 2, 2, PAPER_SH);
    // dải đỏ trên đầu + 2 vạch chữ sáng giả (tiêu đề nằm ở dải chú thích DOM)
    k.P(x + 1, y + 1, w - 2, 7, '#a83230'); k.P(x + 1, y + 7, w - 2, 1, '#7a2224');
    k.P(x + 8, y + 3, 30, 2, '#e8b4a8'); k.P(x + 42, y + 3, 18, 2, '#e8b4a8');
    // vạch chữ giả (câu dẫn) trái miếng vá
    [[8, 84], [8, 70], [8, 78]].forEach(([a, b], i) => k.P(x + a, y + 14 + i * 6, b, 2, PAPER_LN));
    // khung điều khoản rủi ro: viền đỏ dày (mực 1 + đỏ 3 + mực 1), nền hồng nhạt
    const cx = CL.x + ox, cy = CL.y + oy;
    k.P(cx, cy, CL.w, CL.h, O); k.P(cx + 1, cy + 1, CL.w - 2, CL.h - 2, RED); k.P(cx + 1, cy + CL.h - 3, CL.w - 2, 2, RED_DK);
    k.P(cx + 4, cy + 4, CL.w - 8, CL.h - 8, O); k.P(cx + 5, cy + 5, CL.w - 10, CL.h - 10, '#f2d2c6');
    cross(k, cx + 7, cy + 6);
    // ảnh thẻ 3 người + dấu ? đỏ (chưa biết ai) · kết quả: dấu ? mất khi con dấu đã đóng
    s.team.slice(0, 3).forEach((m, i) => {
      const fx = FACE_X(i) + ox, fy = FACE_Y + oy;
      photo(k, fx, fy, m.look);
      if (!st.settled) glyph(k, QM, fx + 18, fy + 5, RED, O);
    });
    // vạch chữ giả dưới khung + dòng ký tên (dấu x mực + đường kẻ)
    [[8, 90], [8, 62]].forEach(([a, b], i) => k.P(x + a, y + 93 + i * 6, b, 2, PAPER_LN));
    const sx = SIGN.x + ox, sy = SIGN.y + oy;
    k.ln(sx - 6, sy - 6, sx - 3, sy - 3, '#3a2a20'); k.ln(sx - 3, sy - 6, sx - 6, sy - 3, '#3a2a20');
    k.P(sx, sy, SIGN.w, 1, '#3a2a20');
    // nét chữ ký (kết quả): 1 nét lượn sóng chạy dần theo ngòi bút
    if (st.sign > 0) {
      const n = Math.round(SIG.length * st.sign);
      for (let i = 0; i < n; i++) k.P(sx + SIG[i][0], sy + SIG[i][1], 1, 1, '#24305a');
    }
  }

  // nét chữ ký (toạ độ so với đầu dòng ký): chữ hoa vòng to rồi chuỗi vòng nhỏ chữ viết tay, gạch đuôi
  const SIG = (() => {
    const pts = [], seen = new Set(), N = 420;
    for (let i = 0; i <= N; i++) {
      const t = i / N, a = t < 0.18 ? 7 : 3.6, w = t * Math.PI * 2 * 6.5;
      const x = 4 + t * 62 - a * 0.9 * Math.sin(w), y = -4 - a * Math.cos(w) * (t < 0.18 ? 1 : 0.8) + t * 2;
      const key = Math.round(x) + ',' + Math.round(y);
      if (!seen.has(key)) { seen.add(key); pts.push([Math.round(x), Math.round(y)]); }
    }
    for (let x = 64; x > 40; x--) { const key = x + ',2'; if (!seen.has(key)) { seen.add(key); pts.push([x, 2 - Math.round((64 - x) / 12)]); } }
    return pts;
  })();
  const sigHead = (k2) => SIG[Math.max(0, Math.min(SIG.length - 1, Math.round(SIG.length * k2) - 1))];

  // trạng thái hoạt cảnh giữ giữa các khung (giấy trượt mượt, âm thanh 1 lần mỗi lần vào pha kết quả)
  const A = { oy: 0, last: 0, cue: {}, tp: 0 };

  SFC.EvScene.add('coach', {
    paint(k) {
      const P = k.P;
      // cỏ sân sau ghế (ông HLV đứng đó) + vạch vôi biên mờ · cỏ trước ghế
      P(0, 0, k.LW, 40, '#3c4a2c');
      for (let i = 0; i < 9; i++) { const x = Math.floor(k.hsh(i + 3) * 300), y = Math.floor(k.hsh(i + 9) * 30); P(x, y, 14 + Math.floor(k.hsh(i) * 20), 3, '#435232'); }
      for (let x = 0; x < k.LW; x++) if (k.hsh(x * 0.37) > 0.25) P(x, 18, 1, 2, '#8a9078');
      for (let i = 0; i < 30; i++) { const x = Math.floor(k.hsh(i + 70) * k.LW), y = Math.floor(k.hsh(i + 90) * 34); P(x, y, 1, 2, '#4e5e3a'); }
      P(0, 168, k.LW, 12, '#3c4a2c');
      for (let i = 0; i < 26; i++) { const x = Math.floor(k.hsh(i + 120) * k.LW); P(x, 172 + Math.floor(k.hsh(i + 130) * 6), 1, 2, '#4e5e3a'); }
      // ghế băng: 3 tấm ván ngang hết khung, khe tối giữa các ván, gờ sáng trên / tối dưới, vân gỗ dài, mắt gỗ, đầu đinh
      const planks = [[38, 42], [83, 42], [128, 40]];
      P(0, 36, k.LW, 134, '#1a1214');
      planks.forEach(([y, h], pi) => {
        P(0, y, k.LW, h, '#664630');
        P(0, y, k.LW, 1, '#80593a'); k.d(0, y + 1, k.LW, '#80593a');
        P(0, y + h - 2, k.LW, 2, '#4a3222');
        for (let i = 0; i < 16; i++) {
          const gy = y + 3 + Math.floor(k.hsh(pi * 40 + i) * (h - 7)), gx = Math.floor(k.hsh(pi * 40 + i + 17) * 300), gw = 24 + Math.floor(k.hsh(i + pi * 7) * 60);
          P(gx, gy, gw, 1, i % 3 ? '#5a3e2a' : '#704e34');
        }
        const kx = 30 + Math.floor(k.hsh(pi + 61) * 240), ky = y + 10 + Math.floor(k.hsh(pi + 33) * (h - 22));
        P(kx - 3, ky, 7, 3, '#4a3222'); P(kx - 1, ky + 1, 3, 1, '#2e1e16');
        [6, 312].forEach((nx) => { P(nx, y + 6, 2, 2, '#3a3036'); P(nx, y + h - 9, 2, 2, '#3a3036'); P(nx, y + 6, 1, 1, '#6a6070'); P(nx, y + h - 9, 1, 1, '#6a6070'); });
      });
      // mép trước ghế (mặt đứng mỏng) + bóng ghế đổ xuống cỏ
      P(0, 168, k.LW, 2, '#3a2618');
      for (let y = 170; y < 175; y++) k.d(0, y, k.LW, '#1e2416', y < 172 ? 1 : 2);
      // đồ lặt vặt (tối, không sáng hơn giấy): chai nước nằm trên ván trái · quả bóng da cũ trên ván phải (bóng đổ xuống phải)
      for (let y = 103; y < 113; y++) k.d(9 + (y - 103), y, 40 + (y - 103), '#22160f', 2);
      P(6, 100, 24, 10, O); P(29, 101, 3, 8, O); P(31, 102, 5, 6, O); P(35, 101, 6, 8, O);
      P(7, 101, 22, 8, '#4c6070'); P(29, 102, 3, 6, '#4c6070'); P(32, 103, 3, 4, '#5a7080'); P(36, 102, 4, 6, '#7a3a34'); P(36, 102, 4, 1, '#94504a');
      P(8, 102, 20, 1, '#7890a2'); P(13, 101, 9, 8, '#8a6a3a'); P(13, 101, 9, 1, '#a07e4c'); P(7, 107, 22, 1, '#3c4e5c');
      for (let y = 66; y < 80; y++) k.d(258 + Math.floor((y - 66) * 0.6), y, 276 + Math.floor((y - 66) * 0.6), '#22160f', 2);
      k.dc(262, 66, 9, O); k.dc(262, 66, 8, '#7e7a72'); k.dc(260, 64, 5, '#8c8880');
      [[262, 66], [256, 61], [268, 61], [257, 71], [267, 71]].forEach(([x, y], i) => { P(x - 1 - (i ? 0 : 1), y - 1, i ? 3 : 4, i ? 2 : 3, '#3a3640'); if (!i) P(x - 1, y - 2, 2, 1, '#3a3640'); });
      k.ln(262, 58, 262, 63, '#5c5852'); k.ln(255, 66, 259, 66, '#5c5852'); k.ln(265, 66, 269, 66, '#5c5852');
    },

    draw(k, s) {
      const T = k.T(), dt = Math.min(0.05, Math.max(0, T - A.last));
      A.last = T;
      const res = s.phase === 'result', tp = s.tp || 0;
      if (res && tp < A.tp) A.cue = {};
      A.tp = res ? tp : 0;
      if (!res) A.cue = {};
      // giấy: trỏ Say no -> lùi về phía ông HLV 9 pixel (trượt mượt, theo bậc pixel)
      const want = !res && s.hover === 1 ? -9 : 0;
      A.oy += (want - A.oy) * Math.min(1, dt * 14);
      let oy = Math.round(A.oy), ox = 0;
      // kết quả: mốc thời gian (giây)
      const sign = res ? clamp01(tp / 0.4) : 0, hit = 0.95, settled = res && tp >= hit;
      const out = res ? s.res.find((x) => x.kind === 'injury' || x.kind === 'blocked') : null;
      const got = res ? s.res.find((x) => x.kind === 'badge') : null;
      if (res && tp >= hit && tp < hit + 0.08) oy += 1;                       // giấy rung 1 cái lúc con dấu đập
      cueAudio(res, tp, out);
      // ông HLV: thở (vai nhún 1 pixel), chớp mắt, thổi còi ngay sau khi ký
      const by = T % 2.6 < 1.3 ? 0 : 1, blink = T % 3.7 < 0.12, blow = res && tp > 0.42 && tp < 0.78;
      paper(k, s, ox, oy, { sign, settled });
      // Shin Guards còn lượt chặn ở act này (tính đọc từ Run, không đổi gì): miếng vá đè lên khung đỏ + ✓ xanh
      const guard = res ? out && out.kind === 'blocked' : willBlock();
      const newShin = res && got && got.id === 'shin' && guard;
      const common = (RAR().common || {}).color || '#b0c3d9';
      // miếng vá ở kẹp: chọn = dấu ? viền COMMON · kết quả = bung lên, lật, ra icon thật, nằm lại cạnh kẹp (viền vàng = của bạn)
      const px = CLIP.x + ox, py = CLIP.y + oy;
      if (!res) patch(k, px, py, common, 'ui-unknown', false);
      else if (got) {   // không có BADGE nào để cho (đội đã có hết BADGE thường, rất hiếm): kẹp trống
        const k1 = clamp01((tp - 0.45) / 0.3), lift = Math.round(Math.sin(k1 * Math.PI) * 9), fw = k1 <= 0 || k1 >= 1 ? 20 : Math.max(2, Math.round(Math.abs(Math.cos(k1 * Math.PI)) * 20));
        const B = SFC_CONFIG.run.badges[got.id] || {}, col = (RAR()[B.rarity] || {}).color || common;
        let gx = px - Math.round(ease(k1) * 10), gy = py + 2 - lift;
        // Shin Guards vừa nhận từ chính buổi tập và chặn luôn: bay từ kẹp xuống khung đỏ trước khi con dấu đập
        if (newShin) { const k2 = clamp01((tp - 0.75) / 0.18); gx = Math.round(gx + (SHIN.x + ox - gx) * ease(k2)); gy = Math.round(gy + (SHIN.y + oy - gy) * ease(k2)); }
        if (!(newShin && tp >= 0.93)) patch(k, gx, gy, k1 < 0.5 ? common : col, k1 < 0.5 ? 'ui-unknown' : iconOf(got.id), k1 >= 1 && !newShin && '#ffe14f', fw);
      }
      clip(k, CLIP.x + 7 + ox, CLIP.y - 11 + oy);
      if (guard && (!newShin || tp >= 0.93)) shinGuard(k, SHIN.x + ox, SHIN.y + oy, !res || tp < hit ? false : tp < hit + 0.12 ? '#ffffff' : GREEN);
      // con dấu
      if (res) stamp(k, s, tp, out, ox, oy);
      // cây bút: chọn = nằm cạnh dòng ký · trỏ Train hard = nhấc lên ở đầu dòng, nhấp nhẹ chờ ký · kết quả = chạy theo nét ký rồi đặt xuống
      const sx = SIGN.x + ox, sy = SIGN.y + oy;
      if (res && sign < 1) { const [hx, hy] = sigHead(sign); pen(k, sx + hx, sy + hy, 0); }
      else if (!res && s.hover === 0) pen(k, sx + 2, sy - 6 - (Math.floor(T * 2.5) % 2), 4);
      else pen(k, sx + SIGN.w + 4, sy + 2, 0);
      // ông HLV vẽ sau cùng: tay đặt lên mép phải tờ giấy (lùi theo giấy)
      coach(k, by, blink, blow, { x: PAPER.x + PAPER.w - 8 + ox, y: PAPER.y + 18 + oy });
      if (blow) [[-3, -2], [0, 0], [3, 2]].forEach(([a, b], i) => k.ln(CX + 14, 2 + by + 22 + a, CX + 18 + (i === 1 ? 1 : 0), 2 + by + 22 + a + b, '#d8d0c0'));   // tiếng còi: 3 vạch bên má
      // nhãn INJURY? (DOM) đi theo tờ giấy
      const pg = k.X.canvas && k.X.canvas.parentNode;
      if (pg && pg._coy !== oy) { pg._coy = oy; pg.style.setProperty('--coy', oy * 2 + 'px'); }
    },

    // nhãn duy nhất trên giấy: INJURY? cạnh dấu ✚ trong khung rủi ro (chuỗi đã có, chip nút cũng dùng)
    dom() {
      const x = (CL.x + 21) * 2, y = (CL.y + 9) * 2;
      return `<span style="position:absolute;left:${x}px;top:${y}px;z-index:1;pointer-events:none;font-family:var(--px);font-size:9px;line-height:1;letter-spacing:0;color:#b8102a;transform:translateY(var(--coy, 0px))">${SFC.UIHelpers.esc(_t('INJURY?'))}</span>`;
    },
  });

  // Shin Guards còn chặn được chấn thương ở act này không (giống Run.injure, chỉ đọc)
  function willBlock() {
    const Run = SFC.Run, R = Run && Run.run;
    if (!R) return false;
    const g = Run.bsum('guard', R), used = R.guard && R.guard.act === R.act ? R.guard.n : 0;
    return used < g;
  }
  // miếng vá Shin Guards + ✓ xanh ở góc · lit: trắng 1 nhịp lúc đỡ con dấu, rồi viền xanh + 4 vạch va chạm xanh (đã chặn, còn lại tới CONTINUE)
  function shinGuard(k, x, y, lit) {
    const col = (RAR().common || {}).color || '#b0c3d9';
    patch(k, x, y, col, iconOf('shin'), lit);
    k.icon('ui-check', x + 9, y + 11);
    if (lit === GREEN) [[-3, 3, -7, 0], [-3, 18, -7, 21], [22, 3, 26, 0], [22, 18, 26, 21]].forEach(([a, b, c, d]) => { k.ln(x + a, y + b, x + c, y + d, O); k.ln(x + a, y + b - 1, x + c, y + d - 1, GREEN); });
  }
  // con dấu: núm gỗ hạ xuống (bóng nhỏ dần) -> đập (giấy rung) -> nhấc ra. Đỏ = người bị đau · xanh = không ai đau · bị Shin Guards đỡ: nảy ra
  function stamp(k, s, tp, out, ox, oy) {
    const t0 = 0.75, hit = 0.95;
    const hurt = out && out.kind === 'injury', blocked = out && out.kind === 'blocked';
    let cx, cy, c;
    if (hurt) { const i = Math.max(0, s.team.findIndex((m) => m.i === out.who)); cx = FACE_X(i) + 8 + ox; cy = FACE_Y + 8 + oy; c = INK_RED; }
    else if (blocked) { cx = SHIN.x + 10 + ox; cy = SHIN.y + 11 + oy; c = INK_RED; }
    else { cx = FACE_X(1) + 12 + ox; cy = FACE_Y + 8 + oy; c = GREEN_DK; }
    // mực đã đóng (ở dưới núm)
    if (tp >= hit && !blocked) {
      if (hurt) {
        const m = s.team.find((x) => x.i === out.who) || s.team[0];
        k.dc(cx, cy, 14, '#f2d2c6');
        ring(k, cx, cy, 19, 2, c, true); ring(k, cx, cy, 15, 1, c, true);
        figure(k, cx - 20, cy - 28, m.look, [out.id]);
        cross(k, cx + 5, cy - 13);
      } else {
        // khung xanh ôm cả 3 ảnh + ✓
        const x0 = FACE_X(0) - 4 + ox, y0 = FACE_Y - 3 + oy, w = FACE_X(2) + 26 - FACE_X(0), h = 24;
        for (const [a, b, ww, hh] of [[x0, y0, w, 2], [x0, y0 + h - 2, w, 2], [x0, y0, 2, h], [x0 + w - 2, y0, 2, h]])
          for (let yy = 0; yy < hh; yy++) for (let xx = 0; xx < ww; xx++) if (k.hsh((a + xx) * 3.1 + (b + yy) * 11.7) < 0.88) k.P(a + xx, b + yy, 1, 1, c);
        k.icon('ui-check', x0 + w - 9, y0 - 7);
      }
    }
    // núm con dấu (nhìn từ trên): hạ xuống tới hit, sau đó nhấc lên ra khỏi khung (bị chặn: nảy lên lệch phải)
    let hgt;
    if (tp < t0) return;
    if (tp < hit) hgt = (1 - ease((tp - t0) / (hit - t0))) * 14;
    else hgt = ease(clamp01((tp - hit) / 0.3)) * (blocked ? 22 : 30);
    if (tp > hit + 0.3) return;
    const bx = Math.round(cx + (tp > hit && blocked ? hgt * 0.8 : 0)), byy = Math.round(cy - hgt);
    const sh = Math.round(hgt * 0.5);
    for (let j = -7; j <= 7; j++) { const w2 = Math.round(Math.sqrt(49 - j * j)); k.d(bx - w2 + sh, cy + j + sh, bx + w2 + sh, '#1a1014', 2); }
    k.dc(bx, byy, 9, O); k.dc(bx, byy, 8, c); k.dc(bx, byy, 6, O); k.dc(bx, byy, 5, '#7a5232'); k.dc(bx - 1, byy - 1, 3, '#9a6c44'); k.P(bx - 2, byy - 3, 2, 1, '#b8885a');
  }
  // âm thanh 1 lần mỗi mốc của pha kết quả: ký (phấn sột soạt) -> còi -> lộ miếng vá -> con dấu
  function cueAudio(res, tp, out) {
    if (!res || !SFC.Audio) return;
    const Au = SFC.Audio, once = (key, at, fn) => { if (tp >= at && !A.cue[key]) { A.cue[key] = 1; if (tp < at + 0.4) fn(); } };
    once('sign', 0, () => Au.chalk && Au.chalk(0.38));
    once('whistle', 0.42, () => Au.whistle && Au.whistle(false));
    once('patch', 0.6, () => Au.reveal && Au.reveal(0));
    once('stamp', 0.95, () => {
      if (out && out.kind === 'blocked') { if (Au.block) Au.block(); }
      else if (out) { if (Au.tackle) Au.tackle(); }
      else if (Au.pick) Au.pick();
    });
  }
})();
