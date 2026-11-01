/* PlayerSprite · keeper.js — Thủ môn đổ người: tư thế vẽ đứng thẳng (đầu = phía bay tới) + phép biến hình cho Renderer.diving (nâng, nghiêng, ép dẹt, lật).
 * Nạp theo thứ tự trong scripts/manifest.js (classic script, không module): mỗi file gắn hàm vào SFC.PlayerSprite.
 */
window.SFC = window.SFC || {};

(function () {
  const Sprite = (SFC.PlayerSprite = SFC.PlayerSprite || {});
  const { at, blockCells, drawCells, drawFine, easeOut, fineBlock, fineLimb, lerp, limbCells, stamp } = Sprite;
  // Game (Actions.dive): bay gkDiveMin 0.12 – gkDiveTime 0.24 s (state dash, tuỳ quãng cần bay, p.diveT), rồi đứng dậy gkDivePose giây (tới p.poseEnd).
  // attackPose trả: dk = tiến độ bay · dh = độ cao vòng cung (diveT / gkDiveTime) · ds = cất người (0.06 s đầu cú bay) · stage = giai đoạn đứng dậy
  // sau khi chạm đất (tư thế thật trên lưới px, gkball.js). Tay giữ độ dài tay đứng (2.4 ô + găng 3 x 3) nên không vươn qua đầu được: vai nhô lên
  // 2 ô và đầu rụt xuống 2 ô giữa 2 tay (như thủ môn thật vùi đầu giữa 2 cánh tay) -> 2 găng kẹp 2 bên mặt. Tay vung lên trong 35% đầu cú bay.
  const P = Math.PI;
  const DIVE = { root: [[-7, -9], [6, -9]], shrug: -2, tuck: 2, up: [P + 1.35, -1.35], swing: 0.35, len: 2.4, takeoff: 0.06 };
  const GLOVE = ['WHH', 'HHH', 'HHH'];
  // độ vươn của tay (0 = buông như đứng, 1 = vươn hết): lên theo cú bay, giữ lúc nằm (dk 1), tắt ở các tư thế đứng dậy khác (dk 0)
  const diveArmK = (atk) => { const u = Math.min(1, (atk.dk || 0) / DIVE.swing); return u * u * (3 - 2 * u); };
  // tay đang khoá (lưới thế giới) hay đang vung (lưới mịn)
  const diveHeld = (atk) => (atk.dk || 0) >= DIVE.swing;
  // đầu rụt xuống theo tay (px mịn)
  const diveHeadDy = (atk) => Math.round(2 * DIVE.tuck * diveArmK(atk));
  // khuỵu (px mịn): đạp đất lúc cất người, khuỵu ở giai đoạn crouch lúc đứng dậy
  const diveCrouch = (atk) => (atk.flying ? 2 * (1 - (atk.ds || 0)) : atk.stage === 'crouch' ? 1 : 0);
  // kiểu chân (user: chú ý chân ở 2 đoạn chuyển). Cất người: bend (khuỵu, 2 chân rộng) -> push (1 chân duỗi đạp đất, chân kia co gối lên) ->
  // together (khép duỗi lúc bay). Đứng dậy: together lúc nằm, bend lúc khuỵu, còn lại stand (bò / nhổm / quỳ: chân quỳ vẽ riêng, gkball.js)
  function diveLegPose(atk) {
    if (atk.flying) { const s = atk.ds || 0; return s < 0.35 ? 'bend' : s < 0.75 ? 'push' : 'together'; }
    return atk.stage === 'land' || atk.stage === 'lie' ? 'together' : atk.stage === 'crouch' ? 'bend' : 'stand';
  }

  // i 0 / 1 = tay bên trái / phải hình. Găng: khối 3 x 3 màu găng (chấm sáng góc trên ngoài) ở đầu cánh tay
  function diveArms(ctx, X, Y, mir, atk, pal, hand) {
    const e = diveArmK(atk), held = diveHeld(atk);
    for (let i = 0; i < 2; i++) {
      const [rx, ry0] = DIVE.root[i], ry = ry0 + DIVE.shrug * e, a = lerp(P / 2, DIVE.up[i], e);
      const ex = rx + DIVE.len * Math.cos(a), ey = ry + DIVE.len * Math.sin(a);
      // găng neo theo đầu cánh tay: tay trái hình lùi 1 ô sang trái để găng nằm ngoài đường cánh tay
      const gx = i ? 0 : -1, G = i ? GLOVE.map((r) => r.split('').reverse().join('')) : GLOVE, gp = { W: '#ffffff', H: hand };
      const col = (k, j) => (j === 0 ? pal.t : pal.S);
      if (held) {
        const cx = Math.round(ex), cy = Math.round(ey), cells = limbCells([[rx, Math.round(ry)], [cx, cy]], col);
        drawCells(ctx, X, Y, blockCells(cells, cx + gx, cy - 1, G, gp), mir);
      } else {
        const cx = Math.round(2 * ex), cy = Math.round(2 * ey), cells = fineLimb([[2 * rx, Math.round(2 * ry)], [cx, cy]], (k, j) => col(k, j < 2 ? 0 : j));
        drawFine(ctx, X, Y, fineBlock(cells, cx + 2 * gx, cy - 2, G, gp), mir);
      }
    }
  }
  // chân theo kiểu (hình nhìn phải, lật theo mir). together: khép duỗi, không mũi giày (mũi chỉ thẳng theo thân) · bend: đứng rộng khuỵu
  // push: chân phải hình duỗi dài thêm 1 hàng (đạp xuống đất), chân trái hình co gối nhấc lên · wide: dạng rộng hơn bend (đỡ bóng tại chỗ, gkball.js)
  function diveLegs(ctx, X, Y, B, pal, pose, toe, mir) {
    const S = (part, dx, dy = 0) => stamp(ctx, X, Y, at(part, dx, dy), pal, mir);
    if (pose === 'together') { S(B.TN, -3); S(B.TN, 0); }
    else if (pose === 'bend') { S(toe, -5); S(toe, 2); }
    else if (pose === 'push') { S(B.LIFT, -4, -1); S(B.PTN, 1); }
    else if (pose === 'wide') { S(toe, -6); S(toe, 3); }
  }

  // Phép biến hình cho Renderer.diving lúc bay (ảnh vẽ đứng thẳng vào bộ đệm, chân ở tâm + 10): flip 1 bay lên / -1 bay xuống, side = hướng mặt.
  // Trả: lift (nâng, px), rot (nghiêng), sy (ép dọc, âm = lật), up (tâm ảnh cao hơn chân bao nhiêu khi không nâng), shadow [rx, ry], streaks.
  // Số như game (nghiêng 0.22, ép 0.85, tâm +2) nhưng cung nâng bắt đầu / kết thúc ở 0 và 0.06 s đầu chuyển dần từ dáng đứng
  // (bay xuống: ép tới nửa rồi lật = ngã chúi về phía máy quay, xem syLerp). Chạm đất rồi thì không biến hình nữa (tư thế đứng dậy thật, gkball.js).
  // Chiều nghiêng chỉ theo hướng mặt, không theo flip (user 2026-11-01): ảnh bay xuống đã lật, nhân thêm flip thì đầu ngả ngược (mặt chếch lên phía trước)
  // nội suy độ ép dọc; đổi dấu (bay xuống: lật) thì không đi qua 0 (khung dẹt thành 1 đường): nửa đầu ép tới 0.5 cùng dấu, nửa sau lật sang 0.5 rồi tới đích
  function syLerp(a, b, u) {
    if (a * b >= 0) return lerp(a, b, u);
    return u < 0.5 ? lerp(a, Math.sign(a) * 0.5, u / 0.5) : lerp(Math.sign(b) * 0.5, b, (u - 0.5) / 0.5);
  }
  function diveXform(atk, flip, side) {
    const STAND = { rot: 0, sy: 1, up: 10, sh: [7, 2.5] };
    const s = easeOut(atk.ds || 0), lift = 9 * (atk.dh || 1) * Math.sin(Math.min(1, atk.dk || 0) * P), sk = 1 - lift / 24;
    return { lift, rot: side * 0.22 * s, sy: syLerp(STAND.sy, flip * 0.85, s), up: lerp(STAND.up, 2, s),
      shadow: [lerp(STAND.sh[0], 5 * sk, s), lerp(STAND.sh[1], 8 * sk, s)], streaks: s > 0.5 };
  }

  Object.assign(Sprite, { DIVE, diveArms, diveLegs, diveHeadDy, diveArmK, diveCrouch, diveLegPose, diveXform });
})();
