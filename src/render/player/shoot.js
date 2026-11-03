/* PlayerSprite · shoot.js — Sút + vô-lê bằng chân phải (cùng máy vẽ chân / tay với Hard attack ở kick.js, bảng tư thế riêng).
 * Nạp theo thứ tự trong scripts/manifest.js (classic script, không module): mỗi file gắn hàm vào SFC.PlayerSprite.
 */
window.SFC = window.SFC || {};

(function () {
  const Sprite = (SFC.PlayerSprite = SFC.PlayerSprite || {});
  const { KICKS, bdiagOf } = Sprite;
  // Game chỉ vẽ tư thế sút SAU khi bóng rời chân (sút: kick.poseTime 0.12 s ≈ 8 khung · vô-lê: firstTime.volley.pose 0.22 s ≈ 13 khung),
  // nên không có lấy đà: chạm bóng (tư thế khoá, tia sáng ở mũi giày) -> vung theo đà lên cao (tư thế khoá) -> về đứng.
  // Pha như Hard attack: 'in' u = 1 = chạm bóng · 'go' chạm bóng -> theo đà · 'out' theo đà -> đứng. keys = [đứng, chạm bóng, theo đà]
  const P = Math.PI;
  // tay khi đá bằng chân phải (user 2026-11-01): tay PHẢI của cầu thủ buông xuống, hơi tách khỏi người; tay trái vung ra trước / lên.
  // arms[k][i]: i = 0 tay bên trái hình, 1 tay bên phải hình (hình nhìn phải). Tay phải của cầu thủ = i 0 khi nhìn xuống / chéo / ngang, i 1 khi nhìn lên
  // sút: chạm bóng sát đất trước chân trụ, người chúi tới; theo đà chân hất lên trước, nhấc nhẹ khỏi đất
  const SHOOT = {
    side: { hip: [-3, 2, 3], ang: [P / 2, 0.27 * P, -0.15 * P], arms: [[P - 1.0, -0.1], [P - 1.2, -0.6]] },
    // xuống: chạm bóng = mũi giày lao về máy quay (thấy mu giày, to hơn) · theo đà = đế giày 3 x 3 đè lên trước thân
    front: { hip: [2, 2, 2], end: [[2, -4], [2, -2], [2, -5]], foot: [[0, 1, ['GG', 'gg']], [0, 1, ['GGG', 'GGG', 'ggg']], [0, 0, ['GGG', 'ggg', 'ggg']]], over: [false, true, true],
      arms: [[P - 1.2, 0.4], [P - 1.1, -0.3]] },
    // lên: chạm bóng = gót / đế giày về phía máy quay · theo đà = chân chếch ra cạnh người (như Hard attack); tay phải buông thẳng để không che bàn chân
    back: { hip: [2, 2, 6], end: [[2, -4], [2, -4], [8, -6]], foot: [[0, 1, ['GG', 'gg']], [0, 0, ['gg', 'gg']], [1, -1, ['GG', 'Gg', 'Gg']]], over: [false, true, false],
      arms: [[P - 0.4, P / 2], [P + 0.3, P / 2]] },
  };
  // vô-lê: bóng ngang hông -> chạm bóng = chân duỗi ngang hông, đế ra trước, người ngả sau, tay trái dang cao; theo đà chân lên cao hơn, bật nhảy nhẹ
  const VOLLEY = {
    side: { hip: [-3, 1, 3], ang: [P / 2, -0.04 * P, -0.3 * P], arms: [[P - 1.0, -0.5], [P - 1.2, -0.8]] },
    front: { hip: [2, 2, 2], end: [[2, -4], [2, -5], [2, -6]], foot: [[0, 1, ['GG', 'gg']], [0, 0, ['GGG', 'ggg', 'ggg']], [0, 0, ['GGGG', 'gggg', 'gggg', '.gg.']]], over: [false, true, true],
      arms: [[P - 1.1, -0.4], [P - 1.2, -0.7]] },
    back: { hip: [2, 6, 6], end: [[2, -4], [8, -6], [8, -8]], foot: [[0, 1, ['GG', 'gg']], [1, -1, ['GG', 'Gg', 'Gg']], [1, -1, ['GG', 'Gg', 'Gg']]], over: [false, false, false],
      arms: [[P + 0.4, P / 2], [P + 0.7, P / 2]] },
  };
  // chân trụ: sút đặt lùi 1 ô (bàn chân sút chạm bóng ngay trước, không đè lên) · vô-lê đứng tại chỗ
  for (const T of [SHOOT, VOLLEY]) { T.diag = T.side; T.bdiag = bdiagOf(T.side); T.tuck = false; }
  SHOOT.plant = 0; VOLLEY.plant = 1;
  KICKS.shoot = SHOOT; KICKS.volley = VOLLEY;
  // móc xe đạp (Comet One-Two, atkType 'bicycle'): tư thế vô-lê, renderer lộn ngược cả người lúc chạm bóng. Đang bay nên chân trụ co suốt (tuck 'always').
  // 2 tay giơ hẳn lên suốt cú đá (user 2026-11-01): chữ V như ARMS_UP của hit.js (ở đây không nhô vai: renderer lộn ngược cả người nên tay đã rõ)
  const BICYCLE = Object.assign({}, VOLLEY, { tuck: 'always' }), UP = [P + 0.9, -0.9];
  for (const v of ['side', 'front', 'back']) BICYCLE[v] = Object.assign({}, VOLLEY[v], { arms: [UP, UP] });
  BICYCLE.diag = BICYCLE.side; BICYCLE.bdiag = bdiagOf(BICYCLE.side);
  KICKS.bicycle = BICYCLE;

  Object.assign(Sprite, { SHOOT, VOLLEY, BICYCLE });
})();
