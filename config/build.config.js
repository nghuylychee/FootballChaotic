/* =========================================================
 * BUILD — SFC_DEV = true: bật nút test / cheat (DRILL TEST, PROLOGUE).
 * Bản Steam (npm run dist -> scripts/strip-dev.js) ghi đè file này thành false
 * và xoá hẳn các nhánh `if (SFC_DEV)` / `SFC_DEV ? … : …` khỏi file đóng gói.
 * SFC_DEMO = true: bản demo itch.io, khoá Area 3+ và ONLINE (config/demo.config.js). Bản dev / Steam: false,
 * scripts/build-web.js + build-itch.js ghi thành true khi đóng gói.
 * Nạp trước mọi script khác.
 * ========================================================= */
var SFC_DEV = true;
var SFC_DEMO = false;
