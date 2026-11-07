/* PlayerSprite3 · body.js (Sprite v3, 2026-11-07) — người chơi to hơn để bù zoom out của sân to (pitchScale / render.playerScale 1.3).
 * Trong game (player/player.js drawPlayer): trạng thái nào v3 vẽ được (supports) thì vẽ v3 ở cỡ thật, còn lại vẽ v2 phóng render.playerScale.
 * Trang duyệt: tools/sprite-v3/pilot.html · kế hoạch + quyết định: docs/SPRITE_V3.md.
 * Cao 31 px game (24 × 1,3), cùng kiểu Sprite v2 (đầu A tròn, thân B, viền mực 1 px, không nửa px, nhìn trái = lật).
 * Đã có: đứng (duyệt cỡ + mắt A 2026-11-07), chạy, chạy nước rút ở 5 góc nhìn (xuống, chéo xuống, ngang, chéo lên, lên).
 * Toạ độ: gốc (X, Y) = giữa dưới chân, 1 ô = 1 px game, lật ngang quanh cột 0 (cột x <-> -x).
 * Bản đồ chữ như v2: K viền · S/s da · T/t áo · P quần · O tất · G/g giày / đế · H tóc · B/b băng đô · M miệng · W trắng.
 */
window.SFC = window.SFC || {};

(function () {
  const INK = '#140c16';
  // pha màu: t dương = về màu mực (tối), t âm = về trắng (sáng), như v2 base.js
  function shade(c, t) {
    if (c && typeof c === 'object') c = c.base;   // màu vẽ theo mẫu (giày v2 shoes.js): lấy màu nền
    const h = c.slice(1), n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h.slice(0, 6), 16);
    const o = t < 0 ? 0xffffff : parseInt(INK.slice(1), 16), k = Math.abs(t);
    return '#' + [16, 8, 0].map((s) => { const a = (n >> s) & 255, b = (o >> s) & 255; return Math.round(a + (b - a) * k).toString(16).padStart(2, '0'); }).join('');
  }
  function palette(o) {
    const p = { K: INK, W: '#ffffff', M: '#4a2a1a', S: o.skin, s: shade(o.skin, 0.2), T: o.shirt, t: o.shirtD || shade(o.shirt, 0.3), P: o.shorts,
      O: o.sock, G: o.shoe, g: o.sole, J: o.skin, H: o.hair, B: o.band, b: shade(o.band, 0.25), hand: o.glove || null };   // hand = găng thủ môn
    // giày (v2 shoes.js): thay O / G / g / J bằng màu / mẫu của đôi giày — chân v3 tô cùng các chữ đó nên mọi tư thế đều có giày
    return SFC.PlayerSprite && SFC.PlayerSprite.shoePal ? SFC.PlayerSprite.shoePal(o, p) : p;
  }
  // tô 1 ô: màu, hoặc đối tượng vẽ { base, paint } (mẫu giày v2, tô theo toạ độ ô)
  function fill(ctx, c, x, y) { if (c && typeof c === 'object') c.paint(ctx, x, y, 1, 1); else { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); } }
  // mỗi ô 1 px game · mir = lật quanh cột 0
  function stamp(ctx, X, Y, part, pal, mir = false) {
    part.rows.forEach((r, j) => {
      for (let i = 0; i < r.length; i++) {
        const ch = r[i];
        if (ch === '.') continue;
        const x = part.x + i;
        fill(ctx, pal[ch] || ch, mir ? X - x : X + x, Y + part.y + j);
      }
    });
  }
  const at = (p, dx, dy = 0) => Object.assign({}, p, { x: p.x + dx, y: p.y + dy });
  const check = (name, p, w) => p.rows.forEach((r, j) => { if (r.length !== w) throw new Error(`sprite v3: ${name} hàng ${j} dài ${r.length}, cần ${w}`); });

  /* ---------- đầu A lớn: rộng 19, cao 17 (hàng -30..-14) ---------- */
  const HEAD = {
    front: { x: -9, y: -30, rows: [
      '.....KKKKKKKKK.....',
      '...KKHHHHHHHHHKK...',
      '..KHHHHHHHHHHHHHK..',
      '.KHHHHHHHHHHHHHHHK.',
      'KBBBBBBBBBBBBBBBBBK',
      'KSSSSSSSSSSSSSSSSsK',
      'KSSSSSSSSSSSSSSSSsK',
      'KSSSSSSSSSSSSSSSSsK',
      'KSSSSSSSSSSSSSSSSsK',
      'KSSSSSSSSSSSSSSSSsK',
      'KSSSSSSSSSSSSSSSSsK',
      'KSSSSSSSSSSSSSSSSsK',
      '.KSSSSSSSSSSSSSSsK.',
      '..KSSSSSSSSSSSSsK..',
      '...KSSSSSSSSSSsK...',
      '....KsssssssssK....',
      '.....KKKKKKKKK.....',
    ] },
    back: { x: -9, y: -30, rows: [
      '.....KKKKKKKKK.....',
      '...KKHHHHHHHHHKK...',
      '..KHHHHHHHHHHHHHK..',
      '.KHHHHHHHHHHHHHHHK.',
      'KBBBBBBBBBBBBBBBBBK',
      'KHHHHHHHHbbHHHHHHHK',
      'KHHHHHHHHbbHHHHHHHK',
      'KHHHHHHHHHHHHHHHHHK',
      'KHHHHHHHHHHHHHHHHHK',
      'KHHHHHHHHHHHHHHHHHK',
      'KHHHHHHHHHHHHHHHHHK',
      'KHHHHHHHHHHHHHHHHHK',
      '.KHHHHHHHHHHHHHHHK.',
      '..KSSSSSSSSSSSSSK..',
      '...KsssssssssssK...',
      '....KsssssssssK....',
      '.....KKKKKKKKK.....',
    ] },
    // chéo lên (hình nhìn phải): nút băng đô lệch 1 cột ngược hướng mặt, dải má 2 cột bên hướng mặt (tóc mai che hàng ngay dưới băng đô)
    bdiag: { x: -9, y: -30, rows: [
      '.....KKKKKKKKK.....',
      '...KKHHHHHHHHHKK...',
      '..KHHHHHHHHHHHHHK..',
      '.KHHHHHHHHHHHHHHHK.',
      'KBBBBBBBBBBBBBBBBBK',
      'KHHHHHHHbbHHHHHHHHK',
      'KHHHHHHHbbHHHHHHHSK',
      'KHHHHHHHHHHHHHHHSsK',
      'KHHHHHHHHHHHHHHHSsK',
      'KHHHHHHHHHHHHHHHSsK',
      'KHHHHHHHHHHHHHHHSsK',
      'KHHHHHHHHHHHHHHHSsK',
      '.KHHHHHHHHHHHHHHSK.',
      '..KSSSSSSSSSSSSsK..',
      '...KsssssssssssK...',
      '....KsssssssssK....',
      '.....KKKKKKKKK.....',
    ] },
  };
  for (const k in HEAD) check('HEAD.' + k, HEAD[k], 19);

  /* ---------- thân: rộng 13 (cột -6..6), hàng -14..-5: vai · áo 4 hàng · dải tối · quần 3 hàng (hàng cuối có khe) · viền đáy ---------- */
  const torso = (collar) => ({ x: -6, y: -14, rows: [
    'KTKKKKKKKKKTK',
    collar,
    'KTTTTTTTTTTtK',
    'KTTTTTTTTTTtK',
    'KTTTTTTTTTTtK',
    'KtttttttttttK',
    'KPPPPPPPPPPPK',
    'KPPPPPPPPPPPK',
    'KPPPPPKPPPPPK',
    '.KKKKKKKKKKK.',
  ] });
  const BODY = {
    front: torso('KTTTTTTTTTTtK'),
    back: torso('KTTtttttttTtK'),       // cổ áo sau
    bdiag: torso('KTtttttttTTtK'),      // chéo lên: cổ áo sau lệch 1 cột ngược hướng mặt (hình nhìn phải)
  };
  for (const k in BODY) check('BODY.' + k, BODY[k], 13);

  /* ---------- tay: tay áo 2 ô ở vai, cẳng tay da 3 ô (cột trong tối), bàn tay chạm hàng quần cuối ---------- */
  const ARM = { x: -10, y: -13, rows: ['...K', '..Kt', '.Ktt', 'KSSs', 'KSSs', 'KSSs', 'KSSs', '.KKK'] };
  // tay xa nhìn chéo: cục da ló ra ngang hông
  const BUMP = { x: 7, y: -11, rows: ['K.', 'sK', 'sK', 'sK', 'K.'] };
  // chạy nhìn xuống / lên: tay vung ra sau -> bàn tay khuất sau thân, ngắn 1 hàng
  const ARM_BACK = { x: -10, y: -13, rows: ['...K', '..Kt', '.Ktt', 'KSSs', 'KSSs', 'KSSs', '.KKK'] };
  check('ARM', ARM, 4); check('BUMP', BUMP, 2); check('ARM_BACK', ARM_BACK, 4);

  /* ---------- chân: rộng 5, hàng -5..0: viền (trùng đáy quần) · tất 2 hàng · giày · đế · viền đáy bo góc ---------- */
  const LEG = {
    N: { x: 0, y: -5, rows: ['KKKKK', 'KOOOK', 'KOOOK', 'KGGGK', 'KgggK', '.KKK.'] },            // thẳng xuống / sau lưng: không mũi
    R: { x: 0, y: -5, rows: ['KKKKK.', 'KOOOK.', 'KOOOK.', 'KGGGGK', 'KggggK', '.KKKK.'] },      // mũi phải
    L: { x: -1, y: -5, rows: ['.KKKKK', '.KOOOK', '.KOOOK', 'KGGGGK', 'KggggK', '.KKKK.'] },     // mũi trái
  };
  check('LEG.N', LEG.N, 5); check('LEG.R', LEG.R, 6); check('LEG.L', LEG.L, 6);
  // chạy (như v2 run.js, cao hơn 1 hàng): trụ trước = dài thêm 1 hàng da (bàn chân thấp hơn, gần máy quay) · nhấc gối = ngắn 1 hàng, mũi về máy quay ·
  // gót đá ra sau = ngắn 1 hàng, thấy đế · sau lưng: đế to hơn
  const PLANT = {
    N: { x: 0, y: -5, rows: ['KKKKK', 'KJJJK', 'KOOOK', 'KOOOK', 'KGGGK', 'KgggK', '.KKK.'] },
    R: { x: 0, y: -5, rows: ['KKKKK.', 'KJJJK.', 'KOOOK.', 'KOOOK.', 'KGGGGK', 'KggggK', '.KKKK.'] },
    L: { x: -1, y: -5, rows: ['.KKKKK', '.KJJJK', '.KOOOK', '.KOOOK', 'KGGGGK', 'KggggK', '.KKKK.'] },
  };
  const LIFT = { x: 0, y: -5, rows: ['KKKKK', 'KOOOK', 'KOOOK', 'KGGGK', '.KKK.'] };
  const KICK_F = { x: 0, y: -5, rows: ['KKKKK', 'KOOOK', 'KOOOK', 'KgggK', '.KKK.'] };
  const KICK_B = { x: 0, y: -5, rows: ['KKKKK', 'KOOOK', 'KgggK', 'KgggK', '.KKK.'] };
  const LIFT_B = KICK_F;
  check('PLANT.N', PLANT.N, 5); check('PLANT.R', PLANT.R, 6); check('PLANT.L', PLANT.L, 6);
  for (const [n, p] of [['LIFT', LIFT], ['KICK_F', KICK_F], ['KICK_B', KICK_B]]) check(n, p, 5);

  /* ---------- mặt: 2 kiểu mắt để chọn ---------- */
  // A: mắt 4 x 4 (user chọn 2026-11-07) · B: 3 x 4 (đã bỏ, giữ để so trên trang duyệt)
  const EYES = { A: { w: 4, h: 4, xs: [-5, 2] }, B: { w: 3, h: 4, xs: [-4, 2] } };
  // kind (như v2 face): null mắt mở · 'stun' / 'closed' gạch ngang · 'happy' ^ ^ · 'up' nhìn lên (thấp 1 hàng) · mouth = há miệng (lưỡi đỏ)
  function face(ctx, X, Y, ex, pal, eyes, kind = null, mouth = false) {
    const E = EYES[eyes] || EYES.A, ey = -22, r = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(X + x, Y + y, w, h); };
    for (const x0 of E.xs) {
      const x = x0 + ex;
      if (kind === 'stun' || kind === 'closed') r(x, ey + 2, E.w, 1, INK);
      else if (kind === 'happy') { r(x + 1, ey + 1, E.w - 2, 1, INK); r(x, ey + 2, 1, 1, INK); r(x + E.w - 1, ey + 2, 1, 1, INK); }
      else if (kind === 'up') { r(x, ey, E.w, E.h - 1, INK); r(x + 1, ey, 1, 1, pal.W); }
      else { r(x, ey, E.w, E.h, INK); r(x, ey, 1, 1, pal.W); }
    }
    r(ex, -18, 1, 1, pal.s);                                                    // mũi
    if (mouth) { r(-2 + ex, -17, 5, 2, INK); r(-1 + ex, -16, 3, 1, '#c0304a'); }
    else r(-1 + ex, -17, 3, 1, kind === 'stun' ? INK : pal.M);
  }
  // giơ 2 tay (bị đấm / nhảy slam, như v2 hit.js liftArms): góc quanh vai theo L, vai nhô 3 ô lúc giơ hết. Nhìn chéo: tay xa sau thân (behindOnly)
  function liftArms(ctx, X, Y, mir, view, L, pal, behindOnly) {
    const UP = SFC.PlayerSprite.ARMS_UP, ang = (i) => (P / 2) + (UP[i] - P / 2) * L, far = view === 'diag' ? 1 : view === 'bdiag' ? 0 : -1;
    Y += Math.round(-3 * L);
    if (far >= 0) { const i = behindOnly ? far : 1 - far; armAt(ctx, X, Y, mir, i, ang(i), pal, behindOnly); return; }
    if (behindOnly) return;
    armAt(ctx, X, Y, mir, 0, ang(0), pal, false); armAt(ctx, X, Y, mir, 1, ang(1), pal, false);
  }

  // bóng dưới chân · k = thu nhỏ khi nhảy / nở ra khi nằm sấp
  function shadow(ctx, X, Y, k = 1) {
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.beginPath(); ctx.ellipse(X, Y + 1, 9 * k, 3 * k, 0, 0, Math.PI * 2); ctx.fill();
  }

  // góc nhìn như v2 (draw.js viewOf)
  function viewOf(facing) {
    const fx = Math.cos(facing), fy = Math.sin(facing);
    const back = fy < -0.35, diag = !back && fy > 0.38 && fy < 0.92, sd = Math.abs(fx) > 0.5 ? Math.sign(fx) : 0;
    return { fx, fy, back, sd, m: fx < 0, view: back ? (sd ? 'bdiag' : 'back') : sd ? (diag ? 'diag' : 'side') : 'front' };
  }

  /* ---------- chi tự do (tay / chân xoay quanh vai / hông) trên lưới thế giới, như v2 base.js nhưng bút 3 x 3 ---------- */
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]], key = (x, y) => x + ',' + y;
  function limbCells(pts, col, cells = new Map(), pen = 3) {
    for (let k = 1; k < pts.length; k++) {
      const [x0, y0] = pts[k - 1], [x1, y1] = pts[k], n = Math.max(1, Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let i = 0; i <= n; i++) {
        const cx = Math.round(x0 + ((x1 - x0) * i) / n), cy = Math.round(y0 + ((y1 - y0) * i) / n), c = col(k, i, n);
        for (let a = 0; a < pen; a++) for (let b = 0; b < pen; b++) cells.set(key(cx + a, cy + b), [cx + a, cy + b, c]);
      }
    }
    return cells;
  }
  function blockCells(cells, x, y, rows, pal) {
    rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] !== '.') cells.set(key(x + i, y + j), [x + i, y + j, pal[r[i]] || r[i]]); });
    return cells;
  }
  function drawCells(ctx, X, Y, cells, mir = false) {
    const cx = (x) => (mir ? X - x : X + x);
    ctx.fillStyle = INK;
    for (const [x, y] of cells.values()) for (const [dx, dy] of N4) if (!cells.has(key(x + dx, y + dy))) ctx.fillRect(cx(x + dx), Y + y + dy, 1, 1);
    for (const [x, y, c] of cells.values()) fill(ctx, c, cx(x), Y + y);
  }
  const snapPx = (v) => Math.sign(v) * Math.round(Math.abs(v));
  const rectW = (ctx, X, Y, mir, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(mir ? X - (x + w - 1) : X + x, Y + y, w, h); };

  /* ---------- chạy: 4 khung, 12 khung / s (nhịp v2) ---------- */
  // pha chân: P trụ trước · S đỡ thân · K gót đá ra sau · L nhấc gối. Chân trái theo RUN_L, chân phải lệch nửa vòng
  const RUN_L = ['P', 'S', 'K', 'L'], RUN_R = ['K', 'L', 'P', 'S'];
  const BOB = [0, -1, 0, -1];
  // tay nhìn xuống / lên: F vung ra trước (thấp 1) · B vung ra sau (cao 1, khuất bàn tay)
  const ARM_L = ['B', 'b', 'F', 'f'], ARM_R = ['F', 'f', 'B', 'b'], ARM_DY = { F: 1, f: 0, b: 0, B: -1 };
  // tay nhìn ngang / chéo: tay thẳng xoay quanh vai, góc theo pha (0 trước, π/2 xuống, π sau)
  const ARM_A = { F: Math.PI / 2 - 0.55, f: Math.PI / 2 - 0.2, b: Math.PI / 2 + 0.2, B: Math.PI / 2 + 0.6 };
  // 1 chân: hình + độ lệch [x, y] theo pha. Bước ngang rộng hơn v2 (x 1,5) cho người cao hơn: ngang 2 ô, chéo 1 ô
  function runLeg(phase, toe, back, sd, k, bd) {
    const tp = (P) => (toe > 0 ? P.R : toe < 0 ? P.L : P.N), w = 1.5;
    if (bd) return phase === 'P' ? [tp(PLANT), sd * k * w, 0] : phase === 'K' ? [KICK_B, -sd * k * w, -0.5] : phase === 'L' ? [LIFT_B, sd * 0.75, 0] : [tp(LEG), 0, 0];
    if (back) return phase === 'K' ? [KICK_B, 0, 0] : phase === 'L' ? [LIFT_B, 0, 0] : phase === 'P' ? [LEG.N, 0, -0.5] : [LEG.N, 0, 0];
    if (phase === 'P') return [k === 1 ? tp(LEG) : tp(PLANT), sd * k * w, 0];
    if (phase === 'K') return [KICK_F, -sd * k * w, -0.5];
    if (phase === 'L') return [LIFT, sd * 0.75, 0];
    return [tp(LEG), 0, 0];
  }

  /* ---------- chạy nước rút (nhìn ngang / chéo): chân, tay xoay quanh hông / vai như v2 sprint.js ---------- */
  const P = Math.PI;
  const SPRINT = [
    [0.82 * P, 0.36 * P, 0, 0.75, P - 0.6],
    [0.22 * P, 0.56 * P, -1, P / 2 - 0.2, P / 2 + 0.2],
    [0.36 * P, 0.82 * P, 0, P - 0.6, 0.75],
    [0.56 * P, 0.22 * P, -1, P / 2 + 0.2, P / 2 - 0.2],
  ];
  const LEAN = { side: 1, diag: 1, bdiag: 1 }, HEAD_LEAD = { side: 2, diag: 1, bdiag: 1 };
  // chân dài KLEN từ hông (bút 3 x 3 neo góc trên trái), tay dài ALEN từ vai: cùng độ dài lúc đứng
  const KLEN = 4.2, ALEN = 3.5, HIP_Y = -6, HIPS = { side: [-4, 2], diag: [-4, 1], bdiag: [-4, 1] }, ARM_ROOT = [[-9, -12], [7, -12]], DIAG_REACH = 0.6;
  function gaitLeg(ctx, X, Y, hx, a, pal, mir, reach) {
    const ex = Math.round(hx + KLEN * Math.cos(a) * reach), ey = Math.round(HIP_Y + KLEN * Math.sin(a));
    const foot = a < 0.25 * P ? [1, -1, ['GGG', 'GGg', 'GGg']] : a <= 0.6 * P ? [0, 1, ['GGGG', 'gggg']] : [-1, 0, ['gGG', 'gGG']];
    const col = (k, i, n) => (i / n < 0.22 ? pal.P : i / n < 0.42 ? pal.J : pal.O);
    drawCells(ctx, X, Y, blockCells(limbCells([[hx, HIP_Y], [ex, ey]], col), ex + foot[0], ey + foot[1], foot[2], pal), mir);
  }
  // tay i (0 trái / 1 phải hình nhìn phải) góc a · behind = sau thân (da tối)
  function armAt(ctx, X, Y, mir, i, a, pal, behind) {
    const [rx, ry] = ARM_ROOT[i], ex = rx + ALEN * Math.cos(a), ey = ry + ALEN * Math.sin(a), skin = behind ? pal.s : pal.S;
    const col = (k, j, n) => (j / n < 0.3 ? (behind ? pal.t : pal.T) : j === n && pal.hand ? pal.hand : skin);   // bàn tay = găng (thủ môn)
    drawCells(ctx, X, Y, limbCells([[rx, ry], [Math.round(ex), Math.round(ey)]], col), mir);
  }
  // 2 tay: behind = lượt sau thân (tay vung ra sau; nhìn chéo: tay xa luôn sau thân) · còn lại trước thân
  function gaitArms(ctx, X, Y, aL, aR, view, pal, mir, behind) {
    const diag = view === 'diag' || view === 'bdiag', far = view === 'bdiag' ? 0 : 1;
    [aL, aR].forEach((a, i) => {
      const back = a > P / 2 || (diag && i === far);
      if (back !== behind) return;
      armAt(ctx, X, Y, mir, i, diag ? Math.atan2(Math.sin(a), Math.cos(a) * DIAG_REACH) : a, pal, back);
    });
  }

  // hình tròn px (hào quang)
  function disc(ctx, X, Y, r, c) {
    ctx.fillStyle = c;
    for (let dy = -r; dy <= r; dy++) { const w = Math.floor(Math.sqrt(r * r - dy * dy) + 0.35); ctx.fillRect(X - w, Y + dy, w * 2 + 1, 1); }
  }
  const FLASH = new Proxy({}, { get: (t, k) => (k === 'K' ? 'rgba(0,0,0,0)' : 'rgba(255,255,255,0.6)') });
  // v3 vẽ được o (của v2 player.js drawPlayer) không: mọi tư thế đã có; còn kiểu tóc / mặt lạ (không có ở v2) -> v2 phóng (docs/SPRITE_V3.md)
  const KICK_OK = { hard: 1, shoot: 1, volley: 1, bicycle: 1, pass: 1, lob: 1, push: 1, power: 1, gkPunt: 1, gkVolley: 1 };
  function supports(o) {
    const L = SFC.PlayerSprite3;
    if (!L.hasHair(o.cut) || !L.hasFace(o.face)) return false;   // 4 kiểu tóc v2 vẽ bằng code (beanie, bandana, bun, halo): chưa có
    const a = o.atk;
    if (a && a.leg != null && !KICK_OK[a.kt || 'hard']) return false;
    return true;
  }

  // o như v2 (facing, skin, shirt, shirtD, shorts, sock, shoe, sole, hair, band) + moving, anim (giây), sprint, atk (= v2 attackPose(p)).
  // Ra đòn (attack.js) theo đúng thứ tự vẽ của v2 draw.js: chân sau thân · tay xa · thân · chân trước thân · tay gần · đầu
  const HEAVY_HEAD = { side: 1, diag: 0, bdiag: 0 };
  function draw(ctx, X, Y, o) {
    const A = SFC.PlayerSprite3, V2 = SFC.PlayerSprite, pal = palette(o), hand = o.glove || pal.S;
    const atk = o.atk && Object.keys(o.atk).length ? o.atk : null;
    // thủ môn đổ người (keeper.js): bay / chạm đất / nằm / bò là khung vẽ riêng (df); đầu vẽ chung, đặt theo khung. dfm = nhìn trái (lật khung)
    const df = atk && atk.dive ? A.diveFrameOf(atk) : null, dfm = !!df && Math.cos(o.facing) < 0;
    const V = viewOf(df ? V2.diveFacing(atk, o.facing) : o.facing), { view, sd, m, back, fx } = V, bd = view === 'bdiag', diag = view === 'diag';
    const sideView = view === 'side' || diag || bd, gs = m ? -1 : 1;
    // thủ môn cầm bóng / đỡ / tung bóng / đứng dậy (keeper.js gkGeom): tay (+ bóng) vẽ riêng, chân quỳ / dạng, thân hạ / ngả
    // giày (v2 shoes.js): mẫu tô theo chân phải / trái của cầu thủ, ghi chỗ đế để vẽ đồ dưới đế ở cuối
    if (V2.shoeBegin) V2.shoeBegin(X, o, back ? m : !m);
    const gk = o.gk && !df ? A.gkGeom(o.gk, view, m) : null, gkArms = !!(gk && (gk.arms || gk.angles)), dfBall = !!(df && o.gk && o.gk.ball), dv = !!(atk && atk.dive);
    if (atk && atk.jx) X += snapPx(atk.jx);   // sút mạnh đứng lấy đà: người run
    // bước nặng: attackPose trả atk.gait (trang duyệt) hoặc player.js đã chuyển thành o.gait / o.gaitT (trong game)
    const heavy = !!(atk && atk.gait === 'heavy') || o.gait === 'heavy', gt = atk && atk.gait ? atk.gt : o.gaitT || 0;
    const pe = atk && atk.e != null ? atk.e : null, kickLeg = !!(atk && atk.leg != null), punchArm = !!(atk && atk.fist != null);
    const hp = atk && atk.header ? A.headerPose(view, atk.hk) : null;
    const runT = heavy ? gt * 0.75 : o.anim || 0;
    const f = (o.moving || heavy) && !kickLeg && !hp ? Math.floor(runT * 12) % 4 : -1;
    const gait = f >= 0 && sideView ? (heavy ? 'heavy' : o.sprint || o.gait === 'sprint' ? 'sprint' : null) : null;
    let fr = null;
    if (gait === 'sprint') fr = SPRINT[f];
    else if (gait === 'heavy') { const h = A.HEAVY[Math.floor(gt * 9) % 4]; fr = [h[0], h[1], h[2], h[3][0], h[4][0]]; }
    const km = view === 'front' ? !m : m, pm = view === 'back' ? !m : m, om = bd ? !m : pm;
    const fp = o.fly ? V2.flyPose(o.fly) : null;
    const cp = o.cp || null, celArms = !!(cp && (cp.arms || cp.ang));   // ăn mừng (celebrate.js): tư thế v2 celPose, celDraw vẽ cả động tác   // bị đá bay (v2 fly.js): tay / chân / khuỵu / há miệng theo pha; xoay cả hình ở drawPlayer
    const [lx, ly] = fp ? [0, fp.c] : pe != null ? A.punchLean(view, pe) : kickLeg ? [sideView ? snapPx(atk.kbx * 1.3) : 0, snapPx(atk.kc * 1.3)] : hp ? [snapPx(hp.bx), snapPx(hp.c)] : dv ? [0, V2.diveCrouch(atk)] : [0, 0];
    const step = pe != null && pe > 0.5 && sideView, off = punchArm && A.offOn(pe, view);
    const khop = kickLeg || hp || dv ? snapPx((atk.khop || 0) * 1.3) : 0, Yf = Y - khop;
    if (!o.noShadow && df && df.shadow === 'long') A.lieShadow(ctx, X, Y, dfm ? -1 : 1);
    else if (!o.noShadow) shadow(ctx, X, Y, df && df.shadow === 'wide' ? 1.3 : hp || dv ? Math.max(0.6, Math.round((1 - khop / 40) * 10) / 10) : khop >= 2 ? 0.85 : 1);
    if (o.fx === 'aura' && V2.drawAura) V2.drawAura(ctx, X, Y, o.anim || 0);   // Golden Aura (v2 fx.js): quầng vàng dưới chân
    // Hard attack đang gồng: hào quang đỏ nhấp nháy giữa thân, vẽ sau người (như v2)
    if (o.windup) {
      ctx.globalCompositeOperation = 'lighter';
      disc(ctx, X + (m ? -lx : lx), Yf + ly - 9, 13, `rgba(255,50,80,${0.4 + 0.25 * Math.sin((o.anim || 0) * 40)})`);
      ctx.globalCompositeOperation = 'source-over';
    }
    // chân
    const leg = sd > 0 ? LEG.R : sd < 0 ? LEG.L : LEG.N;
    let plantLater = null;
    const feet = {};   // 2 chân đứng / chạy (băng chấn thương): L = cột trái màn hình, R = cột phải · [bộ phận, X, Y]
    if (df) {
      A.diveFrameDraw(ctx, X, Yf, df, 'base', pal, hand, dfm, dfBall);   // khung đổ người: chân + tay + thân (trước đầu)
    } else if (cp && (cp.legs === 'cross' || cp.legs === 'sit' || cp.legs === 'kneel')) {
      /* xếp bằng / ngồi: vẽ sau thân · quỳ: vẽ theo thân đã hạ (dưới) */
    } else if (cp && cp.legs === 'moon' && sideView) {
      A.moonLegs(ctx, X, Yf, pal, cp.mw, m);
    } else if (cp && cp.legs === 'split') {
      A.splitLegs(ctx, X, Yf, pal);
    } else if (fp) {
      // văng: 2 chân dạng, chân phải hình nhấc cao 1 hàng · nằm: dạng rộng · dậy: khuỵu, mũi theo hướng mặt (2 mũi chĩa 2 phía lúc trên không)
      if (fp.legs === 'split') { stamp(ctx, X, Yf, at(LEG.L, -6), pal, m); stamp(ctx, X, Yf, at(LEG.R, 4, -1), pal, m); }
      else if (fp.legs === 'wide') { stamp(ctx, X, Yf, at(LEG.L, -6), pal, m); stamp(ctx, X, Yf, at(LEG.R, 4), pal, m); }
      else { stamp(ctx, X, Yf, at(leg, -7), pal); stamp(ctx, X, Yf, at(leg, 3), pal); }
    } else if (gk && gk.legs === 'kneel') {
      /* quỳ: vẽ theo thân đã hạ (dưới) */
    } else if (gk && gk.legs === 'wide') {
      A.diveLegs(ctx, X, Yf, pal, 'wide', sd ? LEG.R : LEG.N, m);   // đỡ bóng tại chỗ: 2 chân dạng rộng
    } else if (dv && V2.diveLegPose(atk) !== 'stand') {
      A.diveLegs(ctx, X, Yf, pal, V2.diveLegPose(atk), sd ? LEG.R : LEG.N, m);   // khuỵu lúc đứng dậy
    } else if (hp && hp.legs !== 'stand') {
      A.headerLegs(ctx, X, Yf, m, view, hp.legs, sd ? LEG.R : LEG.N, pal);
    } else if (kickLeg) {
      const T = A.kickTable(atk), air = T.tuck === 'always' || (T.tuck && ((atk.kp === 'go' && atk.u >= 0.5) || (atk.kp === 'out' && atk.u < 0.5)));
      if (A.kickRest(atk)) { stamp(ctx, X, Yf, at(leg, -5), pal); stamp(ctx, X, Yf, at(leg, 1, -1), pal); }
      else {
        const plant = air ? (sideView ? at(KICK_F, 3) : at(back ? LIFT_B : LIFT, -5)) : at(sd ? LEG.R : LEG.N, sideView ? T.plant : -6);
        if (bd) plantLater = () => stamp(ctx, X, Yf, plant, pal, km); else stamp(ctx, X, Yf, plant, pal, km);
      }
    } else if (gait) {
      const [h0, h1] = HIPS[view], r = diag || bd ? DIAG_REACH : 1, Yl = fr[2] <= -1.5 ? Y + fr[2] : Y;
      gaitLeg(ctx, X, Yl, h0, fr[0], pal, m, r);
      gaitLeg(ctx, X, Yl, h1, fr[1], pal, m, r);
    } else if (f < 0) {
      // đứng (chân phải nhấc 1 px) · đấm duỗi quá nửa (nhìn ngang / chéo): chân trước bước tới, gót chân sau nhấc
      feet.L = [step ? (m ? at(leg, -6) : at(KICK_F, -5)) : at(leg, -5), X, Yf]; stamp(ctx, X, Yf, feet.L[0], pal);
      feet.R = [step ? (m ? at(KICK_F, 1) : at(leg, 3)) : at(leg, 1, -1), X, Yf]; stamp(ctx, X, Yf, feet.R[0], pal);
    } else {
      const k = sd ? (diag || bd ? 0.5 : 1) : 0;
      const legs = [[RUN_L[f], -5], [RUN_R[f], 1]];
      legs.sort((a, b) => ('KL'.includes(b[0]) ? 1 : 0) - ('KL'.includes(a[0]) ? 1 : 0));   // chân nhấc / đá sau vẽ trước
      for (const [ph, L] of legs) {
        const [part, dx, dy] = runLeg(ph, sd, back && !bd, sd, k, bd);
        const pt = at(part, L);
        stamp(ctx, X + snapPx(dx), Y + snapPx(dy), pt, pal);
        feet[L === 1 ? 'R' : 'L'] = [pt, X + snapPx(dx), Y + snapPx(dy)];
      }
    }
    // thân: nước rút / bước nặng ngả tới, chạy nhấp, bước nặng (nhìn xuống / lên) hạ người lúc đặt chân, ra đòn lao / khuỵu
    const lean = gait ? gs * (gait === 'heavy' ? 1 : LEAN[view]) : snapPx((o.lean || 0) + ((gk && gk.lean) || 0) + ((cp && cp.lean) || 0));
    const drop = snapPx((gk && gk.drop) || (cp && cp.drop ? cp.drop * 1.3 : 0));
    const heavyDrop = heavy && !gait && f >= 0 && f % 2 === 0 ? 1 : 0;
    const Xb = X + lean + (m ? -lx : lx), Yb = Yf + (gait ? fr[2] : f < 0 ? 0 : BOB[f]) + heavyDrop + ly + drop;
    const kLeg = kickLeg && !A.kickRest(atk) ? A.legPose(view, atk.kp, atk.u, A.kickTable(atk)) : null, kArms = kickLeg && A.kickArmsOn(atk);
    if (off && A.offBehind(pe, view)) A.offArm(ctx, Xb, Yb, om, view, pe, pal);   // tay kia nằm sau thân
    if (kLeg && !kLeg.over) A.drawKickLeg(ctx, Xb, Yb, km, view, atk, kLeg, pal);   // chân đá sau thân
    if (plantLater) plantLater();
    const far = A.farArm(view);
    if (kArms && far >= 0) A.kickArm(ctx, Xb, Yb, m, view, atk, far, pal, true);
    if (punchArm && bd) A.punch(ctx, Xb, Yb, pm, view, pe, atk, pal);
    if (hp && !hp.rest) A.headerArms(ctx, Xb, Yb, m, view, hp, pal, true);
    // giơ 2 tay: bị đấm (o.hit, v2 hit.js) · nhảy Ground Slam (o.slam = độ giơ theo độ cao)
    const lift = !fp && !punchArm && !kickLeg && !hp && !dv && !celArms ? Math.max(V2.hitLift(o.hit), o.slam || 0) : 0, hitOn = lift > 0.04;
    if (hitOn) liftArms(ctx, Xb, Yb, m, view, lift, pal, true);
    const runArms = f >= 0 && sideView && !gait && !gkArms && !df && !hitOn && !fp && !celArms && !(cp && cp.ang);
    const aL = gait ? fr[3] : runArms ? ARM_A[(m ? ARM_R : ARM_L)[f]] : 0, aR = gait ? fr[4] : runArms ? ARM_A[(m ? ARM_L : ARM_R)[f]] : 0;
    if (gait || runArms) gaitArms(ctx, Xb, Yb, aL, aR, view, pal, m, true);
    if (cp && cp.legs === 'kneel') A.celKneel(ctx, Xb, Yb, pal, view, m);   // quỳ: 2 đầu gối dưới quần (trượt gối chéo: thấy đế giày)
    else if (gk && gk.legs === 'kneel') A.kneelLegs(ctx, Xb, Yb, pal);
    if (gk) A.gkDraw(ctx, Xb, Yb, m, gk, pal, hand, 'behind');   // nhìn lên / chéo lên: bóng đang ôm + tay xa nằm sau thân
    // thân: đứng = thân đóng dấu · nước rút / bước nặng / chuyền / sút mạnh = thân chuyển động (nghiêng, vặn vai, lai quần nhấc)
    let torso = null;
    if (gait) torso = A.torsoPart(bd, lean, gs * (fr[3] <= P / 2 ? 1 : -1), m ? fr[1] < 0.3 * P : fr[0] < 0.3 * P, m ? fr[0] < 0.3 * P : fr[1] < 0.3 * P, bd ? gs : 0);
    else if (kickLeg && (!back || bd) && A.MOVING_TORSO[atk.kt]) {
      const raised = atk.kp === 'go' && atk.u > 0.3;
      torso = A.torsoPart(bd, sideView ? (m ? -lx : lx) : 0, gs * A.kickTwist(atk), raised && !km, raised && km, bd ? gs : 0);
    }
    if (df) { /* khung đổ người đã vẽ thân */ }
    else if (torso) stamp(ctx, Xb, Yb, torso, pal);
    else stamp(ctx, Xb, Yb, bd ? BODY.bdiag : back ? BODY.back : BODY.front, pal, bd && m);
    if (cp && cp.legs === 'sit') A.sitLegs(ctx, X, Yf, m, pal);
    if (cp && cp.legs === 'cross') A.crossLegs(ctx, X, Yf + 2, pal);   // xếp bằng: 2 ống chân vắt trước quần, hạ 2 ô
    if (kLeg && kLeg.over) A.drawKickLeg(ctx, Xb, Yb, km, view, atk, kLeg, pal);   // chân đá vung qua trước thân
    // tay trước thân
    // găng thủ môn trên tay đóng dấu: 2 hàng da cuối của bàn tay (chấm sáng góc trên ngoài)
    const glove = (part, dy, mir) => { if (!o.glove) return; const r = part.y + part.rows.length - 3; rectW(ctx, Xb, Yb + dy, mir, -9, r, 3, 2, o.glove); rectW(ctx, Xb, Yb + dy, mir, -9, r, 1, 1, '#ffffff'); };
    const wy = { L: 0, R: 0 };   // tay đóng dấu đang vung lên / xuống bao nhiêu (băng cổ tay bám theo)
    if (df) { /* khung đổ người: tay trong khung */ }
    else if (fp) { armAt(ctx, Xb, Yb, m, 0, fp.arms[0], pal, false); armAt(ctx, Xb, Yb, m, 1, fp.arms[1], pal, false); }
    else if (hitOn) { /* giơ tay: vẽ sau đầu (dưới) */ }
    else if (celArms) { /* ăn mừng: tay vẽ quanh đầu (dưới) */ }
    else if (hp && !hp.rest) A.headerArms(ctx, Xb, Yb, m, view, hp, pal, false);
    else if (gait || runArms) gaitArms(ctx, Xb, Yb, aL, aR, view, pal, m, false);
    else if (gkArms) A.gkDraw(ctx, Xb, Yb, m, gk, pal, hand, 'front');   // thủ môn: tay gập ôm bóng / tay thẳng
    else if (kArms) {
      if (far !== 1) A.kickArm(ctx, Xb, Yb, m, view, atk, 1, pal, false);
      if (far !== 0) A.kickArm(ctx, Xb, Yb, m, view, atk, 0, pal, false);
    } else if (diag || bd) {
      // đứng chéo: tay gần đủ + cục da tay xa (chéo lên: đổi bên) · đấm: tay kia / tay đấm vẽ riêng
      const bm = bd ? !m : m;
      if (!off) { stamp(ctx, Xb, Yb, ARM, pal, bm); glove(ARM, 0, bm); }
      if (!punchArm) { stamp(ctx, Xb, Yb, BUMP, pal, bm); if (o.glove) rectW(ctx, Xb, Yb, bm, 7, BUMP.y + 1, 1, BUMP.rows.length - 2, o.glove); }
    } else {
      // nhìn xuống / lên: 2 tay, chạy thì vung lên xuống 1 ô, tay vung ra sau ngắn lại
      const armOf = (ph) => (!ph ? [ARM, 0] : [ph === 'B' ? ARM_BACK : ARM, ARM_DY[ph]]);
      const [a, ady] = armOf(f < 0 ? null : ARM_L[f]), [b, bdy] = armOf(f < 0 ? null : ARM_R[f]);
      if (!(punchArm && (pm || off))) { stamp(ctx, Xb, Yb + ady, a, pal, false); glove(a, ady, false); wy.L = ady; }
      if (!(punchArm && (!pm || off))) { stamp(ctx, Xb, Yb + bdy, b, pal, true); glove(b, bdy, true); wy.R = bdy; }
    }
    if (punchArm && !bd) A.punch(ctx, Xb, Yb, pm, view, pe, atk, pal);
    if (off && !A.offBehind(pe, view) && (view === 'diag' || view === 'back' || bd)) A.offArm(ctx, Xb, Yb, om, view, pe, pal);
    // GOAT PATH: băng quấn đúng chỗ chấn thương, theo bên của cầu thủ (như v2 draw.js): cổ tay trái · cổ chân / ngón chân phải · đùi trái
    if (o.inj && o.inj.length) {
      const parts = SFC_CONFIG.run && SFC_CONFIG.run.badges, legsBusy = !!(fp || kickLeg || hp || df || gait), BA = V2.BANDAGE, BL = V2.BLOOD;
      const rightOnL = back ? m : !m, foot = feet[rightOnL ? 'L' : 'R'], other = feet[rightOnL ? 'R' : 'L'];
      for (const id of o.inj) {
        const part = parts && parts[id] && parts[id].part;
        if (part === 'wrist' && !(df || kArms || gait || runArms || gkArms || fp || hitOn || (hp && !hp.rest) || punchArm)) {
          if (diag || bd) rectW(ctx, Xb, Yb, bd ? !m : m, 7, BUMP.y + BUMP.rows.length - 2, 1, 1, BA);
          else { const wm = !pm, wY = Yb + (wm ? wy.R : wy.L); rectW(ctx, Xb, wY, wm, -10, -9, 4, 2, INK); rectW(ctx, Xb, wY, wm, -9, -9, 3, 1, BA); rectW(ctx, Xb, wY, wm, -8, -8, 1, 1, BL); }
        }
        if (legsBusy) continue;
        if (part === 'thigh' && other) { const [lp, x0, y0] = other, c = lp.x + lp.rows[0].indexOf('K') + 1; rectW(ctx, x0, y0, false, c, lp.y + 1, 3, 1, BA); rectW(ctx, x0, y0, false, c + 1, lp.y + 1, 1, 1, BL); }
        if (!foot) continue;
        const [rp, rx, ry] = foot, so = rp.rows.findIndex((r) => r.includes('O')), sh = rp.rows.findIndex((r) => r.includes('G'));
        if (part === 'ankle' && so >= 0) { const c = rp.x + rp.rows[so].indexOf('O'); rectW(ctx, rx, ry, false, c, rp.y + so, 3, 1, BA); rectW(ctx, rx, ry, false, c + 1, rp.y + so, 1, 1, BL); }
        if (part === 'toe' && sh >= 0) { const c = rp.x + rp.rows[sh].indexOf('G'); rectW(ctx, rx, ry, false, c, rp.y + sh, 3, 1, BA); rectW(ctx, rx, ry, false, c + 1, rp.y + sh, 1, 1, BL); }
      }
    }
    // đầu: đấm = dẫn trước 1 px (nhìn xuống: cúi) · đá hết tầm = ngả sau 1 px · đánh đầu theo khoá · nước rút / bước nặng dẫn trước thân
    const hlx = punchArm && pe > 0.5 && sideView ? gs : kickLeg && sideView && atk.kp === 'go' && atk.u > 0.5 ? -gs : 0;
    const hly = punchArm && pe > 0.5 && view === 'front' ? 1 : 0, hhx = hp ? snapPx(hp.hx) : 0;
    const hxo = o.stun && !fp ? Math.round(Math.sin((o.anim || 0) * 20)) : 0;   // choáng: lắc đầu
    const Xh = Xb + hxo + hlx + gs * hhx + (gait ? gs * (gait === 'heavy' ? HEAVY_HEAD[view] : HEAD_LEAD[view]) : 0) + (df ? (dfm ? -df.head[0] : df.head[0]) : 0);
    const Yh = Yb + hly + (hp ? snapPx(hp.hy) : 0) + (df ? df.head[1] : 0) + snapPx(((cp && cp.headDy) || 0) * 1.3);
    if (celArms && cp.armsBehind) A.celArms(ctx, Xb, Yb, cp, pal);   // tay ra sau đầu (đội thua ôm đầu): vẽ trước đầu
    // tóc / mũ (look.js): classic = đầu đã duyệt, kiểu khác = đầu hói + kiểu tóc phóng từ v2
    if (o.cut && o.cut !== 'classic') A.drawHead(ctx, Xh, Yh, back, o.cut, o, pal, fx, V.fy, bd);
    else stamp(ctx, Xh, Yh, bd ? HEAD.bdiag : back ? HEAD.back : HEAD.front, pal, bd && m);
    const kind = o.stun ? 'stun' : (o.cp && o.cp.eyes) || null, mouth = !!((o.cp && o.cp.mouth) || (fp && fp.mouth));
    if (!back) face(ctx, Xh, Yh, Math.round(fx * 2), pal, o.eyes, kind, mouth);
    if (o.face && o.face !== 'none') A.drawFace(ctx, Xh, Yh, o.face, { back, bd, fx, fy: V.fy, anim: o.anim, eyes: kind, mouth, pal, hair: o.hair, skin: o.skin });
    if (hitOn) liftArms(ctx, Xb, Yb, m, view, lift, pal, false);   // giơ 2 tay: vẽ sau đầu (bàn tay nằm trên viền đầu)
    if (celArms && !cp.armsBehind) A.celArms(ctx, Xb, Yb, cp, pal);   // tay ăn mừng: vẽ sau đầu
    if (hp && hp.impact) A.headerImpact(ctx, Xh, Yh, m, view);
    if (df) A.diveFrameDraw(ctx, Xb, Yb, df, 'front', pal, hand, dfm, dfBall);   // khung đổ người: bóng, găng (sau đầu)
    if (gk) A.gkDraw(ctx, Xb, Yb, m, gk, pal, hand, 'last');   // bóng đang tung lên / rơi xuống chân: trên cùng
    // bị đánh trúng: đầu chớp trắng (mọi màu trừ viền), như v2
    if (o.flash) { ctx.globalCompositeOperation = 'lighter'; stamp(ctx, Xh, Yh, bd ? HEAD.bdiag : back ? HEAD.back : HEAD.front, FLASH, bd && m); ctx.globalCompositeOperation = 'source-over'; }
    if (off && view === 'front' && !A.offBehind(pe, view)) A.offArm(ctx, Xb, Yb, m, view, pe, pal);   // nhìn xuống, lúc thu tay đấm: tay kia đưa ra trước
    if (V2.shoeEnd) V2.shoeEnd(ctx, o);   // đồ dưới đế / quanh giày (bánh xe, đinh, lửa, quầng sáng...)
    // choáng: 3 ngôi sao (dấu + vàng, tâm trắng) quay quanh trên đầu
    if (o.stun) for (let i = 0; i < 3; i++) {
      const a = (o.anim || 0) * 6 + (i * P * 2) / 3, sx = hxo + Math.round(Math.cos(a) * 11), sy = -35 + Math.round(Math.sin(a) * 2);
      rectW(ctx, Xb, Yh, false, sx - 1, sy, 3, 1, '#ffe14f'); rectW(ctx, Xb, Yh, false, sx, sy - 1, 1, 3, '#ffe14f'); rectW(ctx, Xb, Yh, false, sx, sy, 1, 1, '#ffffff');
    }
  }

  SFC.PlayerSprite3 = { draw, supports, viewOf, HEIGHT: 31, HEAD, BODY, ARM, BUMP, LEG, EYES, PLANT, LIFT, KICK_F, KICK_B, LIFT_B, SPRINT,
    INK, shade, palette, stamp, at, limbCells, blockCells, drawCells, snapPx, armAt, gaitLeg };
})();
