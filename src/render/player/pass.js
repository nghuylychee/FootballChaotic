/* PlayerSprite · pass.js — Chuyền sệt / chọc khe (P2), chuyền bổng (P3) và cú chạm đẩy bóng lúc chạy lấy đà sút mạnh (đã duyệt 2026-11-01).
 * Cùng máy vẽ chân / tay với Hard attack (kick.js), bảng tư thế riêng. Nạp theo thứ tự trong scripts/manifest.js (classic script, không module).
 */
window.SFC = window.SFC || {};

(function () {
  const Sprite = (SFC.PlayerSprite = SFC.PlayerSprite || {});
  const { KICKS } = Sprite;
  const P = Math.PI;
  // bảng như KICK: keys = [đứng, lấy đà, hết tầm] · nhìn lên dùng bảng Hard attack · chân trụ cột 2, đứng trên đất suốt
  const table = (side, front) => ({ side, diag: side, front, back: KICKS.hard.back, plant: 2, tuck: false, inBack: true });
  // P2 chuyền sệt / chọc khe: nhẹ hơn chuyền bổng, vung vừa, theo đà dừng ngang ống quyển, tay đung đưa nhẹ, không bật
  const PASS = table(
    { hip: [-3, -3, 2], ang: [P / 2, 0.7 * P, 0.28 * P], arms: [[-0.6, 1.4], [P - 1.1, 0.3]] },
    { hip: [2, 2, 2], end: [[2, -4], [2, -5], [2, -4]], foot: [[0, 1, ['GG', 'gg']], [0, 1, ['gg', 'gg']], [0, 1, ['GGG', 'ggg']]], over: [false, false, true], arms: [[P + 0.6, 1.3], [P - 1.2, 0.2]] });
  // P3 chuyền bổng: người ngả sau, mũi giày xúc dưới bóng, theo đà hất lên cao, tay trái giơ lên giữ thăng bằng
  const LOB = table(
    { hip: [-3, -3, 2], ang: [P / 2, 0.74 * P, -0.12 * P], arms: [[-0.2, 1.4], [P - 0.8, -0.9]] },
    { hip: [2, 2, 2], end: [[2, -4], [2, -5], [2, -6]], foot: [[0, 1, ['GG', 'gg']], [0, 1, ['gg', 'gg']], [0, 0, ['GGG', 'ggg', 'ggg']]], over: [false, false, true], arms: [[P + 0.9, 1.0], [P - 1.3, -0.9]] });
  // chạm đẩy bóng bằng má trong (đầu đà sút mạnh lúc đang chạy): vung ngắn, chân lướt sát đất
  const PUSH = table(
    { hip: [-3, -2, 2], ang: [P / 2, 0.66 * P, 0.36 * P], arms: [[P - 1.3, 1.2], [P - 1.2, 1.0]] },
    { hip: [2, 2, 2], end: [[2, -4], [2, -5], [2, -3]], foot: [[0, 1, ['GG', 'gg']], [0, 1, ['gg', 'gg']], [0, 1, ['GGG', 'ggg']]], over: [false, false, true], arms: [[P - 1.3, 1.3], [P - 1.3, 1.1]] });
  Object.assign(KICKS, { pass: PASS, lob: LOB, push: PUSH });
  // nhịp (giây, Sprite.kickTimeline): lấy đà w · vung s · giữ hết tầm f · về o · cw khuỵu, lb ngả sau lúc lấy đà, lf lao tới (âm = ngả sau), hop bật (px mịn).
  // calm = không tia sáng chạm bóng. Bóng rời chân lúc thả phím nên game vẽ từ đầu cú vung; lấy đà chỉ hiện lúc đang giữ phím nạp lực chuyền
  const PASS_T = {
    pass: { w: 0.08, s: 0.06, f: 0.1, o: 0.12, lf: 1, calm: true },
    lob: { w: 0.1, s: 0.08, f: 0.14, o: 0.16, cw: 1, lb: 1, lf: -2, hop: 2, calm: true },
    push: { w: 0.03, s: 0.04, f: 0.04, o: 0.05, lf: 1, calm: true },
  };

  Object.assign(Sprite, { PASS, LOB, PUSH, PASS_T });
})();
