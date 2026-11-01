/* PlayerSprite · run.js — Chạy: 4 khung, 12 khung / s (đã duyệt).
 * Nạp theo thứ tự trong scripts/manifest.js (classic script, không module): mỗi file gắn hàm vào SFC.PlayerSprite.
 */
window.SFC = window.SFC || {};

(function () {
  const Sprite = (SFC.PlayerSprite = SFC.PlayerSprite || {});
  /* ---------- chạy: 4 khung, 12 khung / s (như nhịp bước hiện tại: chạm đất mỗi 0.167 s, khớp bụi run.stride) ---------- */
  // pha chân: P trụ trước · S đỡ thân (lúc lướt qua) · K gót đá ra sau · L nhấc gối. Chân trái theo RUN_L, chân phải lệch nửa vòng
  const RUN_L = ['P', 'S', 'K', 'L'], RUN_R = ['K', 'L', 'P', 'S'];
  const BOB = [0, -1, 0, -1];   // (px mịn) thân + đầu nhấp lên nửa px lúc lướt qua
  // pha tay ngược chân cùng bên: F vung ra trước (thấp xuống) · f nửa trước · b nửa sau · B vung ra sau (cao lên, khuất bàn tay)
  const ARM_L = ['B', 'b', 'F', 'f'], ARM_R = ['F', 'f', 'B', 'b'];
  const ARM_DY = { F: 2, f: 1, b: -1, B: -2 };   // (px mịn)
  // 1 chân: hình + độ lệch ngang (px mịn) theo pha. sd = hướng ngang, k = bước ngang (ngang 2 · chéo 1 · xuống 0)
  function runLeg(B, phase, toe, back, sd, k) {
    const tp = (R, Lf, N) => toe > 0 ? R : toe < 0 ? Lf : N;
    if (back) return phase === 'K' ? [B.KICK_B, 0, 0] : phase === 'L' ? [B.LIFT_B, 0, 0] : phase === 'P' ? [B.TN, 0, -1] : [B.TN, 0, 0];
    if (phase === 'P') return [k === 2 ? tp(B.TR, B.TL, B.TN) : tp(B.PTR, B.PTL, B.PTN), sd * k, 0];
    if (phase === 'K') return [B.KICK_F, -sd * k, -1];
    if (phase === 'L') return [B.LIFT, sd, 0];
    return [tp(B.TR, B.TL, B.TN), 0, 0];
  }

  Object.assign(Sprite, { RUN_L, RUN_R, BOB, ARM_L, ARM_R, ARM_DY, runLeg });
})();
