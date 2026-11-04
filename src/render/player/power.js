/* PlayerSprite · power.js — Sút mạnh (S2, đã duyệt 2026-11-01): lấy đà khi thanh lực qua kick.powerPose rồi vung chân thật mạnh.
 * Đứng yên: thu chân cao ra sau, người run dần theo thời gian giữ. Đang chạy: chạm đẩy bóng (bảng push, pass.js) rồi bước nặng đuổi bóng (HEAVY, sprint.js vẽ).
 * Nạp theo thứ tự trong scripts/manifest.js (classic script, không module): mỗi file gắn hàm vào SFC.PlayerSprite.
 */
window.SFC = window.SFC || {};

(function () {
  const Sprite = (SFC.PlayerSprite = SFC.PlayerSprite || {});
  const { KICKS, bdiagOf } = Sprite;
  const P = Math.PI;
  // lấy đà: chân thu cao ra sau (gót gần ngang hông), tay phải vung ra trước, tay trái ra sau · hết tầm: chân vung lên quá hông, bật cao, người lao tới
  const POWER = {
    side: { hip: [-4, -5, 3], ang: [P / 2, 0.95 * P, -0.22 * P], arms: [[-0.9, 2.0], [P - 0.6, -1.0]] },
    front: { hip: [2, 2, 2], end: [[2, -4], [2, -6], [2, -6]], foot: [[0, 1, ['GG', 'gg']], [0, 1, ['gg', 'gg']], [0, -1, ['GGGG', 'gggg', 'gggg', 'gggg', '.gg.']]], over: [false, false, true],
      arms: [[P + 1.1, 1.3], [P - 1.3, -0.9]] },
    back: KICKS.hard.back, plant: 2, tuck: false, inBack: true,
  };
  POWER.diag = POWER.side; POWER.bdiag = bdiagOf(POWER.side);
  KICKS.power = POWER;
  // nhịp (giây, Sprite.kickTimeline): lấy đà w (đứng: kick.powerWind) · vung s · giữ hết tầm f · về o · khuỵu cw, ngả sau lb, lao tới lf, bật hop (px)
  // shake = run tối đa (px) sau shakeT giây giữ tư thế lấy đà
  const POWER_T = { w: 0.25, s: 0.07, f: 0.2, o: 0.2, cw: 1, lb: 1, lf: 1.5, hop: 3, shake: 0.75, shakeT: 0.4 };
  // bước nặng lúc chạy đuổi bóng: 4 khung, 9 khung / s · [góc chân trái hình, góc chân phải hình, nhấp thân (px, dương = hạ người lúc đặt chân), tay trái hình, tay phải hình]
  const HEAVY = [
    [0.8 * P, 0.32 * P, 1, [0.9], [P - 0.5]],
    [0.5 * P, 0.56 * P, 0, [P / 2 - 0.1], [P / 2 + 0.1]],
    [0.32 * P, 0.8 * P, 1, [P - 0.5], [0.9]],
    [0.56 * P, 0.5 * P, 0, [P / 2 + 0.1], [P / 2 - 0.1]],
  ];

  Object.assign(Sprite, { POWER, POWER_T, HEAVY });
})();
