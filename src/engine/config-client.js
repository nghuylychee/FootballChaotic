/* DỰNG SFC_CONFIG, phần chỉ máy người chơi — chạy ngay sau shared/engine/config.js (máy chủ trận riêng không nạp file này):
 *  - SFC_CONFIG.view (config/view.config.js: phần chỉ để vẽ / âm thanh / nhịp intro) gộp vào đúng chỗ code đọc (game.render, game.fx,
 *    intro...) rồi xoá -> mỗi số chỉ có 1 chỗ đọc. Chỉ gộp vào khoá đã có (sandbox không nạp intro.config.js)
 *  - PROLOGUE (config/ftue.config.js): cảnh bí kíp gia truyền -> outro / heirloom, đội trong mơ -> teams.list,
 *    sân 'dream' = bản sao sân stadium đổi chữ trên màn hình
 */
(function () {
  const C = window.SFC_CONFIG;

  // gộp sâu: object thường thì gộp từng khoá, còn lại (số, chuỗi, mảng) thay hẳn
  const plain = (v) => v && typeof v === 'object' && !Array.isArray(v);
  function merge(into, from) {
    for (const k of Object.keys(from)) {
      if (plain(from[k]) && plain(into[k])) merge(into[k], from[k]);
      else into[k] = from[k];
    }
  }
  if (C.view) {
    for (const ns of Object.keys(C.view)) if (plain(C[ns])) merge(C[ns], C.view[ns]);
    delete C.view;
  }

  const F = C.ftue;
  if (F) {
    // cảnh bí kíp gia truyền (scenes.grandpa): luôn ở cuối đoạn heirloom (hồ sơ cũ); bật heirloom.enabled thì chen vào outro, trước thẻ GOAT PATH
    const S = F.scenes;
    S.heirloom = S.heirloom.concat(S.grandpa);
    if (F.heirloom.enabled) {
      const at = S.outro.findIndex((sc) => sc.art === 'path');
      S.outro.splice(at < 0 ? S.outro.length : at, 0, ...S.grandpa);
    }
    if (C.teams) C.teams.list[F.team.id] = F.team;
    const base = C.arenas && C.arenas.stadium;
    if (base && !C.arenas.dream) {
      const a = JSON.parse(JSON.stringify(base));
      if (a.backdrop) { a.backdrop.screen = 'THE DREAM'; a.backdrop.screenColor = '#b9a8ff'; }
      C.arenas.dream = a;
    }
  }
})();
