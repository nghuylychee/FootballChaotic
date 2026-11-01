/* Bản nháp ý tưởng (chưa vào game): chuyền bóng, chạy nước rút, sút mạnh. ideas.mjs nạp file này vào trang game rồi vẽ bảng.
 * Chuyền + sút mạnh dùng máy vẽ chân / tay của Hard attack (kick.js): bảng tư thế mới trong KICKS, keys = [đứng, lấy đà, hết tầm].
 * Chạy nước rút: máy vẽ nhỏ riêng (ideaSprint), 2 chân là chi tự do trên lưới thế giới như chân đá, tay vung quanh vai.
 */
(function () {
  const S = SFC.PlayerSprite, P = Math.PI;
  const { KICKS, BODY, at, stamp, headOf, face, shadow, palette, limbCells, blockCells, drawCells, fineLimb, drawFine, armAt, lerp, easeOut, easeIO, clamp01, rectW } = S;
  const table = (side, front) => Object.assign({ side, diag: side, front, back: KICKS.hard.back, plant: 2, tuck: false, inBack: true }, {});

  /* ---------- chuyền ---------- */
  // P1 chuyền sệt bằng má trong: vung ngắn, chân lướt sát đất, người gần như đứng yên
  const PASS_PUSH = table(
    { hip: [-3, -2, 2], ang: [P / 2, 0.66 * P, 0.36 * P], arms: [[P - 1.3, 1.2], [P - 1.2, 1.0]] },
    { hip: [2, 2, 2], end: [[2, -4], [2, -5], [2, -3]], foot: [[0, 1, ['GG', 'gg']], [0, 1, ['gg', 'gg']], [0, 1, ['GGG', 'ggg']]], over: [false, false, true], arms: [[P - 1.3, 1.3], [P - 1.3, 1.1]] });
  // P2 chuyền sệt / chọc khe: nhẹ hơn chuyền bổng, vung vừa, theo đà dừng ngang ống quyển, tay đung đưa nhẹ, không bật
  const PASS_DRIVE = table(
    { hip: [-3, -3, 2], ang: [P / 2, 0.7 * P, 0.28 * P], arms: [[-0.6, 1.4], [P - 1.1, 0.3]] },
    { hip: [2, 2, 2], end: [[2, -4], [2, -5], [2, -4]], foot: [[0, 1, ['GG', 'gg']], [0, 1, ['gg', 'gg']], [0, 1, ['GGG', 'ggg']]], over: [false, false, true], arms: [[P + 0.6, 1.3], [P - 1.2, 0.2]] });
  // P3 chuyền bổng: người ngả sau, mũi giày xúc dưới bóng, theo đà hất lên cao, tay trái giơ lên giữ thăng bằng
  const PASS_LOB = table(
    { hip: [-3, -3, 2], ang: [P / 2, 0.74 * P, -0.12 * P], arms: [[-0.2, 1.4], [P - 0.8, -0.9]] },
    { hip: [2, 2, 2], end: [[2, -4], [2, -5], [2, -6]], foot: [[0, 1, ['GG', 'gg']], [0, 1, ['gg', 'gg']], [0, 0, ['GGG', 'ggg', 'ggg']]], over: [false, false, true], arms: [[P + 0.9, 1.0], [P - 1.3, -0.9]] });

  /* ---------- sút mạnh ---------- */
  // chân thu cao ra sau (gót gần ngang hông), tay phải vung ra trước, tay trái ra sau · hết tầm: chân vung lên quá hông, bật cao, người lao tới
  const POWER = table(
    { hip: [-4, -5, 3], ang: [P / 2, 0.95 * P, -0.22 * P], arms: [[-0.9, 2.0], [P - 0.6, -1.0]] },
    { hip: [2, 2, 2], end: [[2, -4], [2, -6], [2, -6]], foot: [[0, 1, ['GG', 'gg']], [0, 1, ['gg', 'gg']], [0, -1, ['GGGG', 'gggg', 'gggg', 'gggg', '.gg.']]], over: [false, false, true], arms: [[P + 1.1, 1.3], [P - 1.3, -0.9]] });
  Object.assign(KICKS, { passPush: PASS_PUSH, passDrive: PASS_DRIVE, passLob: PASS_LOB, power: POWER });

  // dòng thời gian chung: lấy đà w · giữ hold · vung s · giữ hết tầm f · về o (giây). cw khuỵu, lb ngả sau lúc lấy đà, lf lao tới, hop bật (px mịn)
  function timeline(kt, t, d) {
    const { w, hold = 0, s, f, o, cw = 0, lb = 0, lf = 0, hop = 0 } = d, base = { leg: 0, kt };
    if (t < w) { const u = easeOut(clamp01(t / w)); return Object.assign(base, { kp: 'in', u, kc: cw * u, kbx: -lb * u, khop: 0 }); }
    if (t < w + hold) return Object.assign(base, { kp: 'in', u: 1, kc: cw, kbx: -lb, khop: 0, hold: (t - w) / hold });
    const ts = t - w - hold;
    if (ts < s + f) {
      const u = easeOut(clamp01(ts / s));
      return Object.assign(base, { kp: 'go', u, kc: cw * (1 - clamp01(ts / (s * 0.6))), kbx: lerp(-lb, lf, u), khop: hop * u, impact: !d.calm && ts >= s * 0.35 && ts < s + 0.06, tf: ts });
    }
    const to = ts - s - f;
    if (to >= o) return {};
    const u = easeIO(clamp01(to / o)), fall = clamp01(to / (o * 0.6));
    return Object.assign(base, { kp: 'out', u, kc: hop ? 2 * Math.max(0, 1 - Math.abs(to / o - 0.7) / 0.3) : 0, kbx: lf * (1 - u), khop: hop * (1 - fall * fall) });
  }
  // calm = không tia sáng chạm bóng (chuyền không cần)
  const PASS_T = {
    passPush: { w: 0.07, s: 0.07, f: 0.1, o: 0.12, lf: 1, calm: true },
    passDrive: { w: 0.08, s: 0.06, f: 0.1, o: 0.12, lf: 1, calm: true },
    passLob: { w: 0.1, s: 0.08, f: 0.14, o: 0.16, cw: 1, lb: 1, lf: -2, hop: 2, calm: true },
  };
  // sút mạnh: thanh lực 0.8 s (kick.chargeTime) = lấy đà + giữ; thả = vung
  const POWER_T = { w: 0.25, hold: 0.55, s: 0.07, f: 0.2, o: 0.2, cw: 2, lb: 2, lf: 3, hop: 6 };

  // hiệu ứng kèm sút mạnh (S3): vòng sóng ở bàn chân lúc chạm + bụi bật lên ở chân trụ · run lẩy bẩy theo thanh lực (S2, S3)
  function powerFx(ctx, X, Y, atk, m) {
    if (atk.kp !== 'go' || atk.tf == null) return;
    const k = atk.tf / 0.25;
    if (k >= 1) return;
    const r = Math.round(4 + k * 18), cx = X + (m ? -1 : 1) * 14, cy = Y - 10;
    ctx.globalAlpha = 1 - k;
    ctx.fillStyle = '#ffffff';
    for (let a = 0; a < 24; a++) {
      const t = (a / 24) * P * 2;
      ctx.fillRect(Math.round(cx + Math.cos(t) * r), Math.round(cy + Math.sin(t) * r * 0.6), 2, 2);
    }
    // bụi: 5 cục bật lên thành vòng cung quanh chân trụ, rơi dần
    ctx.fillStyle = '#c8b89a';
    for (let i = 0; i < 5; i++) {
      const a = P + 0.25 + i * 0.6, d = 4 + k * 14, up = Math.sin(k * P) * (4 + (i % 2) * 3);
      ctx.fillRect(Math.round(X - 4 + Math.cos(a) * d), Math.round(Y - 1 - up + Math.sin(a) * d * 0.3), 3, 2);
    }
    ctx.globalAlpha = 1;
  }
  // thanh lực (S3): vòng chấm vàng dưới chân, nở + sáng dần theo hold (0..1), nhấp nháy
  function chargeRing(ctx, X, Y, hold, k) {
    const rx = Math.round(12 + hold * 6), ry = Math.round(rx * 0.35), n = 20;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(255,205,70,${0.35 + 0.5 * hold})`;
    for (let i = 0; i < n; i++) {
      if ((i + k) % 3 === 0) continue;
      const t = (i / n) * P * 2;
      ctx.fillRect(Math.round(X + Math.cos(t) * rx), Math.round(Y + Math.sin(t) * ry), 2, 2);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  /* ---------- thân chuyển động (thay thân đóng dấu cứng BODY.front) ---------- */
  // bản đồ px mịn (scale 1) của thân, gốc như BODY.front (x -5, y -11 ô thế giới):
  //  lean (px mịn): vai đi theo thân (draw đã dịch thân lx), hông kéo ngược về trên chân -> hàng dưới lệch -lean, hàng giữa lệch dần (thân nghiêng thật)
  //  twist -1 / 0 / 1: vai xoay ngược hông -> mép tối của áo đổi bên / dày ra, khe ống quần lệch ngược chiều
  //  hemL / hemR: lai quần bên đó nhấc lên 1 px mịn (đùi đang nhấc)
  function torsoPart(back, { lean = 0, twist = 0, hemL = false, hemR = false } = {}) {
    let shirt = S.SHIRT(back);
    if (!back && twist > 0) shirt = shirt.map(() => 'KTTTTTTTttK');
    if (!back && twist < 0) shirt = shirt.map(() => 'KtTTTTTTTTK');
    const slit = twist > 0 ? 'KPPPKPPPPPK' : twist < 0 ? 'KPPPPPKPPPK' : 'KPPPPKPPPPK';
    const rows = ['KTKKKKKKKTK'].concat(shirt, ['KtttttttttK', 'KPPPPPPPPPK', slit, 'KKKKKKKKKKK']);
    const fineRows = [];
    rows.forEach((r) => { const d = r.split('').map((ch) => ch + ch).join(''); fineRows.push(d, d); });
    const n = fineRows.length;
    // lai quần: bên nhấc chân thì viền đáy dịch lên 1 px mịn (hàng n - 3 thành viền, hàng cuối trống)
    fineRows.forEach((row, j) => {
      let s = row.split('');
      for (const [on, a, b] of [[hemL, 0, 11], [hemR, 11, 22]]) {
        if (!on) continue;
        for (let i = a; i < b; i++) { if (j === n - 3 && s[i] !== '.') s[i] = 'K'; if (j === n - 1) s[i] = '.'; }
      }
      fineRows[j] = s.join('');
    });
    const offs = fineRows.map((r, j) => Math.round((-lean * j) / (n - 1))), lo = Math.min(0, ...offs), hi = Math.max(0, ...offs);
    return { x: -10 + lo, y: -22, scale: 1, rows: fineRows.map((r, j) => '.'.repeat(offs[j] - lo) + r + '.'.repeat(hi - offs[j])) };
  }
  // vặn thân theo pha đá: lấy đà = vai mở ra sau (-1) · vung = vai xoay theo chân (+1) · về = 0
  const kickTwist = (atk) => (!atk || atk.kp == null ? 0 : atk.kp === 'in' ? (atk.u > 0.4 ? -1 : 0) : atk.kp === 'go' ? (atk.u > 0.25 ? 1 : -1) : atk.u < 0.5 ? 1 : 0);
  // vẽ bằng S.draw với thân chuyển động: tạm thay BODY.front rồi trả lại (draw.js đọc BODY.front mỗi lần vẽ)
  function drawWithTorso(ctx, X, Y, o, view) {
    const atk = o.atk || {}, side = view === 'side';
    const lean = side ? Math.round(atk.kbx || 0) : 0, raised = atk.kp === 'go' && atk.u > 0.3;
    const keep = BODY.front;
    BODY.front = torsoPart(false, { lean, twist: kickTwist(atk), hemL: raised && side, hemR: raised && !side });
    try { S.draw(ctx, X, Y, o); } finally { BODY.front = keep; }
  }

  /* ---------- chạy nước rút (máy vẽ nhỏ, chỉ nhìn ngang, hình nhìn phải) ---------- */
  // 1 chân: hông (hx, -5) -> đầu ống chân dài 2.5 ô theo góc a (0 trước, π/2 xuống, π sau) + bàn chân như legPose của kick.js
  function leg(ctx, X, Y, hx, a, pal, fine) {
    const ex = hx + 2.5 * Math.cos(a), ey = -5 + 2.5 * Math.sin(a);
    const foot = a < 0.25 * P ? [1, -1, ['GG', 'Gg', 'Gg']] : a <= 0.6 * P ? [0, 1, ['GGG', 'ggg']] : [-1, 0, ['gG', 'gG']];
    const col = (k, i, n) => (i / n < 0.22 ? pal.P : i / n < 0.42 ? pal.J : pal.O);
    if (!fine) {
      const qx = Math.round(ex), qy = Math.round(ey);
      drawCells(ctx, X, Y, blockCells(limbCells([[hx, -5], [qx, qy]], col), qx + foot[0], qy + foot[1], foot[2], pal));
    } else {
      const qx = Math.round(2 * ex), qy = Math.round(2 * ey), cells = fineLimb([[2 * hx, -10], [qx, qy]], col);
      S.fineBlock(cells, qx + 2 * foot[0], qy + 2 * foot[1], foot[2], pal);
      drawFine(ctx, X, Y, cells);
    }
  }
  // tay gập khuỷu (cánh tay 1.5 ô theo góc a, cẳng tay 2 ô theo góc b) quanh vai i
  function bentArm(ctx, X, Y, i, a, b, pal, behind) {
    const [rx, ry] = S.ARM_ROOT[i], skin = behind ? pal.s : pal.S;
    const el = [rx + 1.5 * Math.cos(a), ry + 1.5 * Math.sin(a)], hd = [el[0] + 2 * Math.cos(b), el[1] + 2 * Math.sin(b)];
    const col = (k, j) => (k === 1 && j === 0 ? pal.t : skin);
    drawCells(ctx, X, Y, limbCells([[rx, ry], el.map(Math.round), hd.map(Math.round)], col));
  }
  // khung: [góc chân trái hình, góc chân phải hình, nhấp thân (px mịn), tay trái hình [a, b?], tay phải hình [a, b?]]
  // tay trái hình = tay phải cầu thủ (nhìn phải): ngược chân trái hình
  const SPR_LONG = [   // R2 sải dài, 4 khung 12 / s, tay thẳng vung rộng
    [0.82 * P, 0.36 * P, 0, [0.75], [P - 0.6]],
    [0.22 * P, 0.56 * P, -2, [P / 2 - 0.2], [P / 2 + 0.2]],
    [0.36 * P, 0.82 * P, 0, [P - 0.6], [0.75]],
    [0.56 * P, 0.22 * P, -2, [P / 2 + 0.2], [P / 2 - 0.2]],
  ];
  const SPR_BOUND = [   // R3 sải bay, 6 khung 18 / s, có khung cả 2 chân rời đất, tay gập khuỷu bơm mạnh
    [0.84 * P, 0.4 * P, 0, [-0.2, -1.2], [P - 0.5, P - 1.3]],
    [0.66 * P, 0.5 * P, -1, [0.4, -0.6], [P - 0.9, P / 2 + 0.4]],
    [0.3 * P, 0.78 * P, -4, [P / 2, -0.2], [P / 2 + 0.4, 0.2]],
    [0.4 * P, 0.84 * P, 0, [P - 0.5, P - 1.3], [-0.2, -1.2]],
    [0.5 * P, 0.66 * P, -1, [P - 0.9, P / 2 + 0.4], [0.4, -0.6]],
    [0.78 * P, 0.3 * P, -4, [P / 2 + 0.4, 0.2], [P / 2, -0.2]],
  ];
  // đà sút mạnh khi đang chạy nạp lực (user 2026-11-01: bóng lăn nhẹ phía trước, người bước nặng chuẩn bị rồi sút):
  // 4 khung 6 / s, bước dài + hạ người khi đặt chân (bob dương = thấp xuống), tay dang rộng giữ thăng bằng
  const HEAVY = [
    [0.8 * P, 0.32 * P, 2, [0.9], [P - 0.5]],
    [0.5 * P, 0.56 * P, 0, [P / 2 - 0.1], [P / 2 + 0.1]],
    [0.32 * P, 0.8 * P, 2, [P - 0.5], [0.9]],
    [0.56 * P, 0.5 * P, 0, [P / 2 + 0.1], [P / 2 - 0.1]],
  ];
  // vẽ 1 khung chạy: chân -> thân (ngả lean px mịn) -> tay -> đầu (dẫn trước thân head px mịn)
  function ideaSprint(ctx, X, Y, o, frames, fps, lean, head) {
    const pal = palette(o), n = frames.length, i = Math.floor((o.anim || 0) * fps) % n, [aL, aR, bob, armL, armR] = frames[i];
    shadow(ctx, X, Y, bob <= -3 ? 0.85 : 1);
    // chân chạm đất theo Y, chỉ khung bay (bob ≤ -3) nhấc cả chân
    const Yb = Y + bob, Yl = bob <= -3 ? Yb : Y, Xb = X + lean, hand = pal.S;
    leg(ctx, X, Yl, -3, aL, pal, false);
    leg(ctx, X, Yl, 2, aR, pal, false);
    const arm = (k, A, behind) => (A.length > 1 ? bentArm(ctx, Xb, Yb, k, A[0], A[1], pal, behind) : armAt(ctx, Xb, Yb, false, k, A[0], pal, hand, behind, false));
    // tay vung ra sau (góc > π/2) nằm sau thân
    if (armL[0] > P / 2) arm(0, armL, true);
    if (armR[0] > P / 2) arm(1, armR, true);
    // thân nghiêng thật (hông giữ trên chân), vai xoay theo tay đang vung ra trước, lai quần nhấc bên chân đang nhấc gối
    stamp(ctx, Xb, Yb, torsoPart(false, { lean, twist: armL[0] <= P / 2 ? 1 : -1, hemL: aL < 0.3 * P, hemR: aR < 0.3 * P }), pal);
    if (armL[0] <= P / 2) arm(0, armL, false);
    if (armR[0] <= P / 2) arm(1, armR, false);
    const Xh = Xb + head, Yh = Yb + BODY.dy;
    stamp(ctx, Xh, Yh, headOf(false), pal);
    face(ctx, Xh, Yh, 2, pal);
  }

  S.IDEAS = { PASS_T, POWER_T, timeline, powerFx, chargeRing, SPR_LONG, SPR_BOUND, HEAVY, ideaSprint, torsoPart, drawWithTorso };
})();
