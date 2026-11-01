/* PlayerSprite · keeper.js — Thủ môn đổ người: tư thế vẽ đứng thẳng (đầu = phía bay tới) + phép biến hình cho Renderer.diving (nâng, nghiêng, ép dẹt, lật).
 * Nạp theo thứ tự trong scripts/manifest.js (classic script, không module): mỗi file gắn hàm vào SFC.PlayerSprite.
 */
window.SFC = window.SFC || {};

(function () {
  const Sprite = (SFC.PlayerSprite = SFC.PlayerSprite || {});
  const { at, blockCells, drawCells, drawFine, easeIO, easeOut, fineBlock, fineLimb, lerp, limbCells, stamp } = Sprite;
  // Game (Actions.dive): bay ≤ gkDiveTime 0.24 s (state dash, tuỳ quãng cần bay), rồi nằm gkDivePose 0.22 s (tới p.poseEnd), rồi đứng.
  // attackPose trả: dk = tiến độ bay · ds = cất người (0.06 s đầu cú bay) · dl = chạm đất (0.05 s đầu lúc nằm) · dg = đứng dậy (0.1 s cuối lúc nằm).
  // Tay giữ độ dài tay đứng (2.4 ô + găng 3 x 3) nên không vươn qua đầu được: vai nhô lên 2 ô và đầu rụt xuống 2 ô giữa 2 tay
  // (như thủ môn thật vùi đầu giữa 2 cánh tay) -> 2 găng kẹp 2 bên mặt. Tay vung lên trong 35% đầu cú bay, hạ xuống lúc đứng dậy.
  const P = Math.PI;
  const DIVE = { root: [[-7, -9], [6, -9]], shrug: -2, tuck: 2, up: [P + 1.35, -1.35], swing: 0.35, len: 2.4, takeoff: 0.06, land: 0.05, getup: 0.1 };
  const GLOVE = ['WHH', 'HHH', 'HHH'];
  // độ vươn của tay (0 = buông như đứng, 1 = vươn hết): lên theo cú bay, xuống khi đứng dậy
  const diveArmK = (atk) => { const u = Math.min(1, (atk.dk || 0) / DIVE.swing); return u * u * (3 - 2 * u) * (1 - easeIO(atk.dg || 0)); };
  // tay đang khoá (lưới thế giới) hay đang vung (lưới mịn)
  const diveHeld = (atk) => (atk.dk || 0) >= DIVE.swing && !atk.dg;
  // đầu rụt xuống theo tay (px mịn)
  const diveHeadDy = (atk) => Math.round(2 * DIVE.tuck * diveArmK(atk));
  // khuỵu (px mịn): đạp đất lúc cất người, khuỵu lúc đứng dậy
  const diveCrouch = (atk) => (atk.flying ? 2 * (1 - (atk.ds || 0)) : 2 * Math.sin(P * (atk.dg || 0)));
  // kiểu chân (user: chú ý chân ở 2 đoạn chuyển):
  // cất người: bend (khuỵu, 2 chân rộng) -> push (1 chân duỗi đạp đất, chân kia co gối lên) -> together (khép duỗi lúc bay)
  // đứng dậy: together (còn nằm) -> wide (2 chân dạng rộng chống đất, đẩy người dậy) -> bend (khuỵu) -> stand (đứng như thường).
  // (2 gối co dưới người thì thân dẹt che mất, trông như mất chân)
  function diveLegPose(atk) {
    if (atk.flying) { const s = atk.ds || 0; return s < 0.35 ? 'bend' : s < 0.75 ? 'push' : 'together'; }
    const g = atk.dg || 0;
    return g < 0.35 ? 'together' : g < 0.75 ? 'wide' : g < 0.92 ? 'bend' : 'stand';
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
  // push: chân phải hình duỗi dài thêm 1 hàng (đạp xuống đất), chân trái hình co gối nhấc lên · wide: dạng rộng hơn bend
  function diveLegs(ctx, X, Y, B, pal, pose, toe, mir) {
    const S = (part, dx, dy = 0) => stamp(ctx, X, Y, at(part, dx, dy), pal, mir);
    if (pose === 'together') { S(B.TN, -3); S(B.TN, 0); }
    else if (pose === 'bend') { S(toe, -5); S(toe, 2); }
    else if (pose === 'push') { S(B.LIFT, -4, -1); S(B.PTN, 1); }
    else if (pose === 'wide') { S(toe, -6); S(toe, 3); }
  }

  // Phép biến hình cho Renderer.diving (ảnh vẽ đứng thẳng vào bộ đệm, chân ở tâm + 10): flip 1 bay lên / -1 bay xuống, side = hướng mặt.
  // Trả: lift (nâng, px), rot (nghiêng), sy (ép dọc, âm = lật), up (tâm ảnh cao hơn chân bao nhiêu khi không nâng), shadow [rx, ry], streaks.
  // Bay: số như game (nghiêng 0.22, ép 0.85, tâm +2) nhưng cung nâng bắt đầu / kết thúc ở 0 và 0.06 s đầu chuyển dần từ dáng đứng
  // (bay xuống: ép tới nửa rồi lật = ngã chúi về phía máy quay, xem syLerp). Nằm: nghiêng 0.1, ép 0.7, 0.05 s đầu chuyển từ dáng bay, 0.1 s cuối dựng dậy về dáng đứng.
  // nội suy độ ép dọc; đổi dấu (bay xuống: lật) thì không đi qua 0 (khung dẹt thành 1 đường): nửa đầu ép tới 0.5 cùng dấu, nửa sau lật sang 0.5 rồi tới đích
  function syLerp(a, b, u) {
    if (a * b >= 0) return lerp(a, b, u);
    return u < 0.5 ? lerp(a, Math.sign(a) * 0.5, u / 0.5) : lerp(Math.sign(b) * 0.5, b, (u - 0.5) / 0.5);
  }
  function diveXform(atk, flip, side) {
    const STAND = { rot: 0, sy: 1, up: 10, sh: [7, 2.5] };
    if (atk.flying) {
      const s = easeOut(atk.ds || 0), lift = 9 * Math.sin(Math.min(1, atk.dk || 0) * P), sk = 1 - lift / 24;
      return { lift, rot: side * 0.22 * flip * s, sy: syLerp(STAND.sy, flip * 0.85, s), up: lerp(STAND.up, 2, s),
        shadow: [lerp(STAND.sh[0], 5 * sk, s), lerp(STAND.sh[1], 8 * sk, s)], streaks: s > 0.5 };
    }
    const l = easeIO(atk.dl || 0), g = easeIO(atk.dg || 0);
    const rot = side * flip * lerp(0.22, 0.1, l), sy = flip * lerp(0.85, 0.7, l);
    return { lift: 0, rot: lerp(rot, 0, g), sy: syLerp(sy, STAND.sy, g), up: lerp(2, STAND.up, g),
      shadow: [lerp(5, STAND.sh[0], g), lerp(8, STAND.sh[1], g)], streaks: false };
  }

  Object.assign(Sprite, { DIVE, diveArms, diveLegs, diveHeadDy, diveArmK, diveCrouch, diveLegPose, diveXform });
})();
