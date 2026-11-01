/* PlayerSprite · ported.js — Chân ăn mừng: xếp bằng, ngồi bệt (theo luật độ dài).
 * Nạp theo thứ tự trong scripts/manifest.js (classic script, không module): mỗi file gắn hàm vào SFC.PlayerSprite.
 */
window.SFC = window.SFC || {};

(function () {
  const Sprite = (SFC.PlayerSprite = SFC.PlayerSprite || {});
  const { blockCells, drawCells, limbCells } = Sprite;
  // ăn mừng xếp bằng (user 2026-11-01 tô lại): 2 nửa đối xứng, mỗi nửa từ ngoài vào: da (đầu gối) · giày (hàng trên giày, hàng dưới đế) · tất; 2 tất gặp nhau ở giữa
  function crossLegs(ctx, X, Y, pal) {
    // rộng 15 (thân 11; bản 21 quá rộng, user 2026-11-01): mỗi nửa da 2 · giày 2 · tất 3, ô giữa tất
    drawCells(ctx, X, Y, blockCells(new Map(), -7, -3, ['JJGGOOOOOOOGGJJ', 'JJggOOOOOOOggJJ'], pal));
  }
  // ăn mừng ngồi bệt (thua trận): đùi (quần) chéo lên đầu gối, ống chân xuống, giày đặt trên đất. Vẽ sau thân (đầu gối nổi trước quần).
  // Theo luật độ dài (user 2026-11-01, đợt ăn mừng cuối): hông -> gối 2.2 ô, gối -> cổ chân 2.2 ô (bản chuyển thẳng cũ 3.6 + 4.2, gần gấp đôi chân 4.5)
  function sitLegs(ctx, X, Y, mir, pal) {
    const cells = limbCells([[2, -3], [3, -5]], (k, i, n) => (i / n < 0.5 ? pal.P : pal.J));
    limbCells([[3, -5], [5, -3]], (k, i, n) => (i === 0 ? pal.J : pal.O), cells);
    drawCells(ctx, X, Y, blockCells(cells, 5, -2, ['GGG', 'ggg'], pal), mir);
  }

  Object.assign(Sprite, { crossLegs, sitLegs });
})();
