/* =========================================================
 * BUILD — SFC_DEV = true: bật nút test / cheat (DRILL TEST, PROLOGUE).
 * Bản Steam (npm run dist -> scripts/strip-dev.js) ghi đè file này thành false
 * và xoá hẳn các nhánh `if (SFC_DEV)` / `SFC_DEV ? … : …` khỏi file đóng gói.
 * Nạp trước mọi script khác.
 * ========================================================= */
var SFC_DEV = true;
