/* PlayerSprite · sprint.js — Bước chạy riêng khi nhìn ngang / chéo (đã duyệt 2026-11-01): chạy nước rút sải dài (R1) và bước nặng đuổi bóng
 * lúc lấy đà sút mạnh (HEAVY, power.js). Nhìn xuống / lên dùng bước chạy thường (run.js).
 * 2 chân là chi tự do quanh hông như chân đá (kick.js), tay thẳng xoay quanh vai. Nạp theo thứ tự trong scripts/manifest.js (classic script, không module).
 */
window.SFC = window.SFC || {};

(function () {
  const Sprite = (SFC.PlayerSprite = SFC.PlayerSprite || {});
  const { KLEN, armAt, blockCells, drawCells, limbCells } = Sprite;
  const P = Math.PI;
  // R1 sải dài: 4 khung 12 / s, chân với hết tầm trước / sau, tay thẳng vung rộng, thân nhấp lên ở khung lướt qua.
  // Khung: [góc chân trái hình, góc chân phải hình, nhấp thân (px mịn, âm = lên), tay trái hình, tay phải hình] (hình nhìn phải; góc 0 trước, π/2 xuống, π sau)
  const SPRINT = [
    [0.82 * P, 0.36 * P, 0, [0.75], [P - 0.6]],
    [0.22 * P, 0.56 * P, -2, [P / 2 - 0.2], [P / 2 + 0.2]],
    [0.36 * P, 0.82 * P, 0, [P - 0.6], [0.75]],
    [0.56 * P, 0.22 * P, -2, [P / 2 + 0.2], [P / 2 - 0.2]],
  ];
  // kiểu bước: khung, khung / s, thân ngả tới + đầu dẫn trước thân (px mịn) theo góc nhìn
  const GAITS = {
    sprint: { frames: SPRINT, fps: 12, lean: { side: 3, diag: 2 }, head: { side: 4, diag: 2 } },
    heavy: { frames: Sprite.HEAVY, fps: 9, lean: { side: 2, diag: 1 }, head: { side: 2, diag: 1 } },
  };
  // nhìn chéo: tầm với ngang của chân / tay co lại (chạy chếch về phía máy quay), 2 hông sát nhau hơn
  const DIAG_REACH = 0.6, HIPS = { side: [-3, 2], diag: [-3, 1] };
  const gaitFrame = (kind, t) => { const G = GAITS[kind], fr = G.frames; return fr[Math.floor(t * G.fps) % fr.length]; };
  // 1 chân: hông (hx, -5) -> đầu ống chân dài KLEN theo góc a + bàn chân như legPose của kick.js (lưới thế giới)
  function gaitLeg(ctx, X, Y, hx, a, pal, mir, reach) {
    const ex = Math.round(hx + KLEN * Math.cos(a) * reach), ey = Math.round(-5 + KLEN * Math.sin(a));
    const foot = a < 0.25 * P ? [1, -1, ['GG', 'Gg', 'Gg']] : a <= 0.6 * P ? [0, 1, ['GGG', 'ggg']] : [-1, 0, ['gG', 'gG']];
    const col = (k, i, n) => (i / n < 0.22 ? pal.P : i / n < 0.42 ? pal.J : pal.O);
    drawCells(ctx, X, Y, blockCells(limbCells([[hx, -5], [ex, ey]], col), ex + foot[0], ey + foot[1], foot[2], pal), mir);
  }
  // 2 chân (vẽ trước thân). Khung bay (nhấp ≤ -3) nhấc cả chân theo thân, còn lại chân chạm đất ở Y
  function gaitLegs(ctx, X, Y, fr, view, pal, mir) {
    const [aL, aR, bob] = fr, Yl = bob <= -3 ? Y + bob : Y, [h0, h1] = HIPS[view], r = view === 'diag' ? DIAG_REACH : 1;
    gaitLeg(ctx, X, Yl, h0, aL, pal, mir, r);
    gaitLeg(ctx, X, Yl, h1, aR, pal, mir, r);
  }
  // tay: behind = lượt vẽ sau thân (tay đang vung ra sau, góc > π/2; nhìn chéo: tay xa luôn sau thân, da tối) · còn lại = lượt vẽ trước thân
  function gaitArms(ctx, X, Y, fr, view, pal, hand, mir, behind) {
    const diag = view === 'diag';
    [fr[3], fr[4]].forEach(([a], i) => {
      const back = a > P / 2 || (diag && i === 1);
      if (back !== behind) return;
      const ad = diag ? Math.atan2(Math.sin(a), Math.cos(a) * DIAG_REACH) : a;
      armAt(ctx, X, Y, mir, i, ad, pal, hand, back, false);
    });
  }
  // vặn vai theo tay trái hình đang vung ra trước (+1) / ra sau (-1) · lai quần nhấc bên chân đang nhấc gối (hình nhìn phải)
  const gaitTwist = (fr) => (fr[3][0] <= P / 2 ? 1 : -1);
  const gaitHem = (fr) => [fr[0] < 0.3 * P, fr[1] < 0.3 * P];
  // chạy thường nhìn ngang / chéo: khung tay cho gaitArms từ pha tay ARM_L / ARM_R của run.js (góc ARM_A). Tay trái hình = cột trái màn hình, nhìn trái thì cột phải
  const runArmFrame = (f, mir) => {
    const { ARM_A, ARM_L, ARM_R } = Sprite;
    return [0, 0, 0, [ARM_A[(mir ? ARM_R : ARM_L)[f]]], [ARM_A[(mir ? ARM_L : ARM_R)[f]]]];
  };

  Object.assign(Sprite, { SPRINT, GAITS, gaitFrame, gaitLegs, gaitArms, gaitTwist, gaitHem, runArmFrame });
})();
