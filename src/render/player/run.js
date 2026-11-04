/* PlayerSprite · run.js — Chạy: 4 khung, 12 khung / s (đã duyệt).
 * Nạp theo thứ tự trong scripts/manifest.js (classic script, không module): mỗi file gắn hàm vào SFC.PlayerSprite.
 */
window.SFC = window.SFC || {};

(function () {
  const Sprite = (SFC.PlayerSprite = SFC.PlayerSprite || {});
  /* ---------- chạy: 4 khung, 12 khung / s (như nhịp bước hiện tại: chạm đất mỗi 0.167 s, khớp bụi run.stride) ---------- */
  // pha chân: P trụ trước · S đỡ thân (lúc lướt qua) · K gót đá ra sau · L nhấc gối. Chân trái theo RUN_L, chân phải lệch nửa vòng
  const RUN_L = ['P', 'S', 'K', 'L'], RUN_R = ['K', 'L', 'P', 'S'];
  const BOB = [0, -1, 0, -1];   // thân + đầu nhấp lên 1 px lúc lướt qua
  // pha tay ngược chân cùng bên: F vung ra trước (thấp xuống) · f nửa trước · b nửa sau · B vung ra sau (cao lên, khuất bàn tay)
  const ARM_L = ['B', 'b', 'F', 'f'], ARM_R = ['F', 'f', 'B', 'b'];
  const ARM_DY = { F: 1, f: 0, b: 0, B: -1 };   // vung hết 1 px, nửa vung ở giữa
  // nhìn ngang / chéo: tay thẳng xoay quanh vai như chạy nước rút (sprint.js) nhưng vung nhẹ hơn. Góc theo pha (0 trước, π/2 xuống, π sau)
  const ARM_A = { F: Math.PI / 2 - 0.55, f: Math.PI / 2 - 0.2, b: Math.PI / 2 + 0.2, B: Math.PI / 2 + 0.6 };
  // 1 chân: hình + độ lệch [x, y] (px, draw.js làm tròn: nửa px lên 1 px) theo pha. sd = hướng ngang, k = bước ngang (ngang 1 · chéo 0.5 · xuống 0)
  // bd = chéo lên: bước chéo như chéo xuống (chân trụ về hướng mặt, mũi giày theo hướng mặt) nhưng gót đá / chân nhấc thấy đế như sau lưng
  function runLeg(B, phase, toe, back, sd, k, bd = false) {
    const tp = (R, Lf, N) => toe > 0 ? R : toe < 0 ? Lf : N;
    if (bd) return phase === 'P' ? [tp(B.PTR, B.PTL, B.PTN), sd * k, 0] : phase === 'K' ? [B.KICK_B, -sd * k, -0.5] : phase === 'L' ? [B.LIFT_B, sd / 2, 0] : [tp(B.TR, B.TL, B.TN), 0, 0];
    if (back) return phase === 'K' ? [B.KICK_B, 0, 0] : phase === 'L' ? [B.LIFT_B, 0, 0] : phase === 'P' ? [B.TN, 0, -0.5] : [B.TN, 0, 0];
    if (phase === 'P') return [k === 1 ? tp(B.TR, B.TL, B.TN) : tp(B.PTR, B.PTL, B.PTN), sd * k, 0];
    if (phase === 'K') return [B.KICK_F, -sd * k, -0.5];
    if (phase === 'L') return [B.LIFT, sd / 2, 0];
    return [tp(B.TR, B.TL, B.TN), 0, 0];
  }

  Object.assign(Sprite, { RUN_L, RUN_R, BOB, ARM_L, ARM_R, ARM_DY, ARM_A, runLeg });
})();
