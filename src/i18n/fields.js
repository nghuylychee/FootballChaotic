/* Các trường chữ trong config được dịch tại chỗ (src/engine/i18n.js -> localizeConfig). Đường dẫn tính từ SFC_CONFIG,
 * * = mọi key / phần tử, số = phần tử thứ mấy của mảng. Chỉ trường kiểu chuỗi mới được dịch.
 * '#ngữ cảnh' ở cuối: key trong bản dịch thành 'ngữ cảnh|câu tiếng Anh' — dùng khi cùng 1 câu tiếng Anh cần dịch khác nhau
 * (vd. tên trường phái SPEED khác chỉ số SPEED của đội; tên bài PASS là lời hô "Chuyền!" còn nhãn nút PASS là danh từ).
 * '@N' ở cuối: bản dịch tối đa N ký tự (chỗ hiển thị có bề rộng cố định) — scripts/i18n-check.js báo LỖI nếu dài hơn.
 * Thêm chữ hiển thị mới vào config thì thêm đường dẫn ở đây (scripts/i18n-check.js đọc danh sách này để gom chuỗi cần dịch).
 * Không đưa vào: id, tên người (ACE, SHADOW...), mã 3 chữ của đội, chữ vẽ trên sân (bảng quảng cáo, graffiti).
 */
SFC.I18n.fields = [
  // PROLOGUE (config/ftue.config.js): lời thoại cut scene, thẻ MAIN PATH, hộp gợi ý trận mơ
  'ftue.scenes.*.*.lines.*.text',
  'ftue.heirloom.giver', 'ftue.heirloom.band', 'ftue.heirloom.stamp',
  'ftue.pathCard.title', 'ftue.pathCard.lines.*.1', 'ftue.pathCard.lines.*.2', 'ftue.pathCard.foot',
  'ftue.steps.*.title', 'ftue.steps.*.text', 'ftue.steps.*.prompts.*.1#button',
  'ftue.qte.label', 'ftue.ultCharge.sources.*.1', 'ftue.draftNote', 'ftue.ultNote',

  // Core (config/cores.config.js)
  'cores.archetypes.*.label#archetype', 'cores.resources.*.label', 'cores.sets.*.*',
  'cores.list.*.name', 'cores.list.*.desc',

  // Main Path + đội (đội Main Path, đội riêng của người chơi, đội trong mơ đều nằm trong teams.list)
  'mainPath.areas.*.name', 'mainPath.areas.*.sub',
  'teams.list.*.name', 'teams.list.*.tagline', 'teams.list.*.desc', 'teams.list.mp_player.short',

  // chỉ số character, độ hiếm, độ khó, chú thích nút (SETTINGS > CONTROLS)
  'progression.attrs.list.*.label', 'progression.attrs.list.*.short', 'progression.attrs.list.*.desc',
  'progression.rarities.*.label', 'progression.boxes.*.name', 'progression.boxes.*.desc',
  'progression.slots.*.label', 'progression.items.*.name', 'progression.items.*.desc',
  'progression.attrs.drills.list.*.name', 'progression.attrs.drills.list.*.desc',
  'intro.stats.*.1',
  // vùng scout (TEAM > SCOUT): save lưu chỉ số vùng (scout.ri) nên đổi ngôn ngữ giữa chừng vẫn đúng tên
  'teammates.regions.*',
  'game.ai.difficulty.*.label',
  // chú thích nút trên sơ đồ tay cầm (SVG bề rộng cố định): dài hơn là bị cắt
  'controls.legend.*.atk@24', 'controls.legend.*.def@24',
];
