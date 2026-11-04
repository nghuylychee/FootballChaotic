/* PlayerSprite · punch.js — Cú đấm (đã duyệt 2026-11-01): tay đấm, tay kia, vai áo, khung nhoè.
 * Nạp theo thứ tự trong scripts/manifest.js (classic script, không module): mỗi file gắn hàm vào SFC.PlayerSprite.
 */
window.SFC = window.SFC || {};

(function () {
  const Sprite = (SFC.PlayerSprite = SFC.PlayerSprite || {});
  const { INK, blockCells, drawCells, lerp, limbCells, rectW, shade, snapPx } = Sprite;
  /* ---------- tư thế ra đòn: hình vẽ nhìn sang phải, nhìn trái thì lật (mir) ---------- */
  // tay đấm: cánh tay giữ đúng độ dài tay đứng, tầm với đến từ thân (ngả sau lúc thu tay, lao tới lúc duỗi) + bước chân trước.
  // e: -1 thu nắm tay về · 0 nắm tay cạnh vai · 1 duỗi hết. Mỗi góc nhìn 3 tư thế khoá (ô trên trái nắm tay, hình nhìn phải); khung giữa nội suy, làm tròn tới ô thế giới
  // lean: [thân lệch lúc thu hết, lúc duỗi hết] (px, [x, y]; làm tròn: nửa px lên 1 px)
  const PUNCH = {
    side:  { rest: [6, -9], back: [2, -9], full: [9, -10], lean: [[-0.5, 0], [1, 0]] },
    diag:  { rest: [6, -8], back: [3, -10], full: [8, -7], lean: [[-0.5, 0], [1, 0.5]] },
    front: { rest: [6, -8], back: [6, -11], full: [1, -8], lean: [[0, -0.5], [0, 0.5]], big: true },
    back:  { rest: [6, -8], back: [6, -6], full: [7, -15], lean: [[0, 0.5], [0, -0.5]] },
    // chéo lên: tay trái (đấm) là tay xa, bên trái màn hình -> thủ thế cạnh vai xa, thu về thấp ra sau, đấm vươn qua sau lưng ra trước:
    // chỉ thấy nắm tay (cánh tay khuất sau thân, draw.js vẽ trước thân), duỗi hết thì nắm tay ló ra trước vai gần
    bdiag: { rest: [-8, -8], back: [-7, -6], full: [8, -12], lean: [[-0.5, 0], [1, 0]], hidden: true },
  };
  function punchLean(view, e) { const L = PUNCH[view].lean[e < 0 ? 0 : 1], k = Math.abs(e); return [snapPx(L[0] * k), snapPx(L[1] * k)]; }
  // tay kia khi đấm (tay trái của hình nhìn phải): chuyển động ngược tay đấm để cả người cùng ra đòn.
  // root = gốc tay (khuất trong thân), fwd = bàn tay lúc thu tay đấm (e = -1), back = lúc duỗi hết (e = 1); bàn tay đứng yên ở REST.
  // Nhìn ngang: tay xa sau thân -> lúc đấm vung mạnh ra sau, chéo xuống (lúc thu tay đấm giữ tay đứng: vươn ra trước thì khuất hẳn sau thân, trông như mất tay).
  // Nhìn chéo: tay gần, thu tay đấm = vươn ra trước đè lên thân, đấm = vung ra sau. Nhìn lên: lúc đấm vung xuống phía máy quay.
  // Nhìn xuống: lúc đấm vung ra sau lưng -> từ máy quay thấy tay ngắn lại, bàn tay khuất sau hông (vẽ trước thân, màu da tối vì nằm sau người)
  // behind: [pha thu, pha đấm] tay nằm sau thân (vẽ trước thân, da tối)
  const OFF_REST = [-7, -7];
  const OFF = {
    side:  { root: [-4, -9], fwd: null, back: [-10, -6], behind: [false, true] },
    diag:  { root: [-6, -9], fwd: [1, -6], back: [-10, -8], behind: [false, false] },
    front: { root: [-5, -9], fwd: [-7, -5], back: [-7, -8], behind: [false, true] },
    back:  { root: [-7, -9], fwd: [-7, -11], back: [-9, -4], behind: [false, false] },
    // chéo lên: tay kia là tay gần (tay phải, bên hướng mặt). Toạ độ hình lật (draw.js gọi với mir ngược hướng mặt): x âm = về hướng mặt.
    // Thu tay đấm = vươn ra trước · đấm = vung ngược ra sau, hạ xuống cạnh thân (giữ độ dài tay đứng, user 2026-11-03: vắt qua thân thì tay dài quá)
    bdiag: { root: [-6, -9], fwd: [-9, -8], back: [-4, -6], behind: [false, false] },
  };
  // dưới ngưỡng (hoặc góc nhìn không có tư thế cho pha này): tay đứng bình thường
  const offOn = (e, view) => e != null && Math.abs(e) >= 0.2 && !!OFF[view][e < 0 ? 'fwd' : 'back'];
  const offBehind = (e, view) => OFF[view].behind[e < 0 ? 0 : 1];
  function offArm(ctx, X, Y, mir, view, e, pal, hand) {
    const A = OFF[view], to = e < 0 ? A.fwd : A.back, k = Math.abs(e), skin = offBehind(e, view) ? pal.s : pal.S;
    const hx = Math.round(lerp(OFF_REST[0], to[0], k)), hy = Math.round(lerp(OFF_REST[1], to[1], k));
    const col = (kk, i, n) => (i === 0 ? pal.t : i === n && hand !== pal.S ? hand : skin);
    drawCells(ctx, X, Y, limbCells([A.root, [hx, hy]], col), mir);
  }
  // vai áo theo tay đấm: tay ra khỏi vai thì vai áo nhô ra 1 ô theo tay, chỗ tay áo nối thân liền màu tối (không viền giữa áo và tay áo).
  // Ô theo hình nhìn phải; vẽ sau cánh tay để đè viền tay ở chỗ nối. Nhìn lên: tay dựng cạnh đầu chiếm cột 6 nên chỉ mở chỗ nối
  function shoulderPush(ctx, X, Y, mir, view, pal) {
    const W = (x, y, c) => rectW(ctx, X, Y, mir, x, y, 1, 1, c);
    W(5, -11, pal.T); W(5, -10, pal.t); W(5, -9, pal.t);
    if (view !== 'back') W(6, -11, INK);
    if (view === 'side' || view === 'diag') W(5, -8, pal.t);
  }
  // nắm tay 3 x 3 (đấm thẳng vào máy quay: 4 x 4), W = chấm sáng
  const FIST3 = ['WHH', 'HHH', 'HHH'], FIST4 = ['WHHH', 'HHHH', 'HHHH', 'HHHH'];
  function punch(ctx, X, Y, mir, view, e, atk, pal, hand) {
    const P = PUNCH[view], k = Math.abs(e);
    // ô trên trái nắm tay lúc pha ee (ô thế giới, hình nhìn phải)
    const fistAt = (ee) => { const t = ee < 0 ? P.back : P.full, kk = Math.abs(ee); return [Math.round(lerp(P.rest[0], t[0], kk)), Math.round(lerp(P.rest[1], t[1], kk))]; };
    const [fx, fy] = fistAt(e);
    const n = P.big && e > 0.6 ? 4 : 3, F = n === 4 ? FIST4 : FIST3;   // đấm thẳng vào máy quay: nắm tay gần hơn nên to hơn
    const side = view === 'side' || view === 'diag' || view === 'bdiag';
    // vệt gió lúc lao tới (nhìn ngang / chéo): 2 vạch ngắn trên và dưới cánh tay, sát sau nắm tay
    if (atk.streak && e > 0 && side) {
      ctx.globalAlpha *= 0.8;
      rectW(ctx, X, Y, mir, fx - 3, fy - 2, 3, 1, '#ffffff'); rectW(ctx, X, Y, mir, fx - 2, fy + 4, 2, 1, '#ffffff');
      ctx.globalAlpha /= 0.8;
    }
    const cells = new Map();
    // cánh tay từ vai (6, -9) tới nắm tay; thu tay ra sau vai (nhìn ngang / chéo) thì cánh tay khuất sau thân, chỉ thấy nắm tay
    if (!P.hidden && !(side && fx < 6)) limbCells([[6, -9], [fx, fy + 1]], (kk, i) => (i === 0 ? pal.t : pal.S), cells);
    // đang lao tới: nắm tay nhoè dọc đường vừa đi (bản tối dần về phía sau), cùng 1 khối viền với tay
    if (atk.streak && e > 0 && k < 0.95) {
      const [x0, y0] = fistAt(Math.max(0, e - 0.7)), steps = Math.max(Math.abs(fx - x0), Math.abs(fy - y0));
      for (let j = 0; j < steps; j++) {
        const t = j / steps, H = j < steps / 2 ? shade(hand, -0.45) : shade(hand, -0.2);
        blockCells(cells, Math.round(lerp(x0, fx, t)), Math.round(lerp(y0, fy, t)), F.map((r) => r.replace(/W/g, 'H')), { H });
      }
    }
    blockCells(cells, fx, fy, F, { W: '#ffffff', H: hand });
    drawCells(ctx, X, Y, cells, mir);
    if (!P.hidden && k >= 0.3 && !(side && fx < 6)) shoulderPush(ctx, X, Y, mir, view, pal);
    // trúng: tia sáng hình + ở đầu nắm tay (ngang: trước nắm tay · xuống: ngay trên nắm tay, phía máy quay · lên: trên)
    if (atk.impact) {
      const [ix, iy] = view === 'front' ? [fx + 2, fy + 2] : view === 'back' ? [fx + 1, fy - 3] : [fx + n + 2, fy + 1];
      rectW(ctx, X, Y, mir, ix - 3, iy, 7, 1, '#fff6a0'); rectW(ctx, X, Y, mir, ix, iy - 3, 1, 7, '#fff6a0');
      for (const [a, b] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) rectW(ctx, X, Y, mir, ix + a, iy + b, 1, 1, '#ffffff');
    }
  }

  Object.assign(Sprite, { PUNCH, punchLean, OFF_REST, OFF, offOn, offBehind, offArm, shoulderPush, FIST3, FIST4, punch });
})();
