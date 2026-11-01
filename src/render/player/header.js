/* PlayerSprite · header.js — Đánh đầu: khuỵu lấy đà -> bật nhảy (tay vung lên) -> ngả ra sau ở đỉnh -> gật đầu (tay giật xuống) -> rơi -> tiếp đất.
 * Nạp theo thứ tự trong scripts/manifest.js (classic script, không module): mỗi file gắn hàm vào SFC.PlayerSprite.
 */
window.SFC = window.SFC || {};

(function () {
  const Sprite = (SFC.PlayerSprite = SFC.PlayerSprite || {});
  const { armAt, at, lerp, rectW, stamp } = Sprite;
  // Game (firstTime.header): bật nhảy trước khi chạm lead 0.22 s, cả cú nhảy pose 0.5 s, cao hop 14 px (chỉ vẽ). headerPose đặt tiến độ ≥ 42% lúc chạm
  // (chưa kịp nhảy: bắt đầu từ 30%) -> chạm bóng ngay trước đỉnh nhảy (50%). attackPose trả hk = tiến độ 0..1 + khop (bật nhảy, px mịn).
  // Tư thế khoá theo tiến độ [từ, tới] (giữ nguyên, lưới thế giới); giữa 2 tư thế khoá nội suy ở lưới mịn.
  // c = khuỵu (px mịn) · bx = thân (px mịn, chỉ nhìn ngang / chéo) · hx / hy = đầu (px mịn; hx chỉ nhìn ngang / chéo) · legs = kiểu chân
  // side / front = góc 2 tay [i 0, i 1] (0 trước, π/2 xuống, π sau; hình nhìn phải), front dùng cho cả nhìn lên
  const P = Math.PI;
  const KEYS = [
    { k: [0, 0], c: 0, bx: 0, hx: 0, hy: 0, legs: 'stand', side: [P / 2, P / 2], front: [P / 2, P / 2] },
    // lấy đà: khuỵu, 2 tay vung ra sau / xuống
    { k: [0.08, 0.14], c: 2, bx: -1, hx: 0, hy: 0, legs: 'bend', side: [P - 0.6, 1.9], front: [P - 0.6, 0.6] },
    // bật lên: tay vung lên trước, gót co lên
    { k: [0.28, 0.28], c: 0, bx: 0, hx: 0, hy: 0, legs: 'tuck', side: [-1.1, -1.0], front: [P + 0.6, -0.6] },
    // đỉnh, trước khi chạm: thân + đầu ngả ra sau, tay giơ cao
    { k: [0.38, 0.44], c: 0, bx: -1, hx: -1, hy: -1, legs: 'tuck', side: [-1.45, -1.3], front: [P + 1.1, -1.1] },
    // gật: đầu lao tới / cúi xuống, thân theo, 2 tay giật xuống ra sau
    { k: [0.5, 0.58], c: 0, bx: 1, hx: 2, hy: 1, legs: 'reach', side: [P - 0.5, 2.0], front: [P - 0.3, 0.3] },
    // rơi: tay dang xuống, chân duỗi đón đất
    { k: [0.78, 0.78], c: 0, bx: 0, hx: 0, hy: 0, legs: 'stand', side: [P - 0.9, 1.3], front: [P - 0.8, 0.8] },
    // tiếp đất: khuỵu
    { k: [0.86, 0.92], c: 2, bx: 0, hx: 0, hy: 0, legs: 'bend', side: [P / 2 + 0.3, P / 2 - 0.3], front: [P - 1.2, 1.2] },
    { k: [1, 1], c: 0, bx: 0, hx: 0, hy: 0, legs: 'stand', side: [P / 2, P / 2], front: [P / 2, P / 2] },
  ];
  // tư thế lúc tiến độ k: số nội suy, kiểu chân lấy theo tư thế gần hơn, held = đang ở tư thế khoá
  function headerPose(view, k) {
    const side = view === 'side' || view === 'diag', arms = (K) => (side ? K.side : K.front);
    let i = 0;
    while (i < KEYS.length - 1 && k >= KEYS[i + 1].k[0]) i++;
    const A = KEYS[i], B = KEYS[Math.min(i + 1, KEYS.length - 1)];
    const held = k <= A.k[1] || A === B, u = held ? 0 : (k - A.k[1]) / Math.max(1e-6, B.k[0] - A.k[1]), e = u * u * (3 - 2 * u);
    const v = (f) => lerp(A[f], B[f], e);
    return {
      held, legs: (e < 0.5 ? A : B).legs, c: v('c'), bx: side ? v('bx') : 0, hx: side ? v('hx') : 0, hy: v('hy'),
      arms: [0, 1].map((j) => lerp(arms(A)[j], arms(B)[j], e)), rest: (A === KEYS[0] && e < 0.15) || (B === KEYS[KEYS.length - 1] && e > 0.85),
      impact: k >= 0.5 && k < 0.56,
    };
  }
  // chân theo kiểu (hình nhìn phải, lật theo mir): bend = đứng rộng · tuck = co gót (ngang: gót ra sau thấy đế; xuống: gối nhấc; lên: đế về máy quay)
  // reach = duỗi xuống, nhìn ngang hơi đưa ra trước. stand vẽ ở draw.js như đứng thường
  function headerLegs(ctx, X, Y, mir, view, legs, toe, B, pal) {
    const side = view === 'side' || view === 'diag';
    if (legs === 'bend') { stamp(ctx, X, Y, at(toe, -5), pal, mir); stamp(ctx, X, Y, at(toe, 2), pal, mir); return; }
    if (legs === 'tuck') {
      const part = side ? B.KICK_F : view === 'back' ? B.KICK_B : B.LIFT, dx = side ? -1 : 0;
      stamp(ctx, X, Y, at(part, -4 + dx, -1), pal, mir); stamp(ctx, X, Y, at(part, 1 + dx, -1), pal, mir); return;
    }
    stamp(ctx, X, Y, at(toe, side ? -3 : -4), pal, mir); stamp(ctx, X, Y, at(toe, side ? 2 : 1, -1), pal, mir);
  }
  function headerArms(ctx, X, Y, mir, view, hp, pal, hand, behindOnly) {
    // nhìn chéo: tay bên phải hình là tay xa, nằm sau thân (vẽ trước thân, da tối)
    if (view === 'diag') { if (behindOnly) armAt(ctx, X, Y, mir, 1, hp.arms[1], pal, hand, true, !hp.held); else armAt(ctx, X, Y, mir, 0, hp.arms[0], pal, hand, false, !hp.held); return; }
    if (behindOnly) return;
    armAt(ctx, X, Y, mir, 0, hp.arms[0], pal, hand, false, !hp.held); armAt(ctx, X, Y, mir, 1, hp.arms[1], pal, hand, false, !hp.held);
  }
  // trúng bóng: tia sáng hình + ở trán (ngang: trước trán · xuống: giữa trán, phía máy quay · lên: trên đỉnh đầu). Toạ độ theo đầu (X, Y = gốc đầu)
  function headerImpact(ctx, X, Y, mir, view) {
    const [ix, iy] = view === 'front' ? [0, -22] : view === 'back' ? [0, -27] : [9, -21];
    rectW(ctx, X, Y, mir, ix - 3, iy, 7, 1, '#fff6a0'); rectW(ctx, X, Y, mir, ix, iy - 3, 1, 7, '#fff6a0');
    for (const [a, b] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) rectW(ctx, X, Y, mir, ix + a, iy + b, 1, 1, '#ffffff');
  }

  Object.assign(Sprite, { HEADER_KEYS: KEYS, headerPose, headerLegs, headerArms, headerImpact });
})();
