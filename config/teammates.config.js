/* =========================================================
 * TEAMMATES CONFIG — đồng đội (vector nâng cấp thứ 2 ngoài chỉ số character). Logic: src/meta/teammates.js, UI: src/ui/team.js
 * - Đồng đội có OVR cố định (không nâng cấp), 6 chỉ số riêng (rating 40..99) và 1 DECK Core: mỗi lượt chọn Core trong trận
 *   đồng đội tự bốc 1 lá từ deck của mình (Core đó chỉ tác dụng với họ, scale theo chỉ số của họ).
 * - Tuyển đồng đội qua SCOUT: bắt đầu scout (miễn phí) -> chờ theo giờ thật -> 3 ứng viên -> chọn 1 người, trả phí chuyển nhượng.
 * - Trạm scout nâng cấp bằng gold: scout nhanh hơn + ứng viên tốt hơn. Càng đi xa trên Main Path càng gặp người mạnh hơn.
 * ========================================================= */
window.SFC_CONFIG = window.SFC_CONFIG || {};

SFC_CONFIG.teammates = {
  scout: false,             // false = tạm ẩn SCOUT (trang TEAM chỉ còn đội hình, không báo "report ready"); logic scout vẫn còn
  rosterMax: 5,             // số đồng đội tối đa trong đội hình (đầy: phải bán bớt mới tuyển được)
  sellRefund: 0.4,          // bán đồng đội: nhận lại bấy nhiêu phần phí chuyển nhượng
  offers: 3,                // số ứng viên mỗi lần scout

  // đồng đội khởi đầu (miễn phí, luôn có trong đội hình mới)
  starter: {
    name: 'ROOKIE', ovr: 70,
    deck: ['street_fighter', 'iron_body', 'heavy_boot', 'maestro', 'eagle_eye', 'quick_feet', 'speed_demon', 'sniper_foot'],
    look: { skin: 1, hairColor: 1, hair: 'buzz', face: 'none', shoes: 'kicks', fx: 'nofx' },
  },

  // OVR ứng viên theo Area xa nhất từng tới trên Main Path (0..9): trung tâm = base + perArea x Area, lệch ngẫu nhiên ±spread
  ovr: { base: 66, perArea: 3.2, spread: 5, min: 55, max: 97,
    luckyChance: 0.06, luckyBonus: 7 },   // thỉnh thoảng gặp "ngọc thô": +luckyBonus OVR

  // Chỉ số riêng: quanh OVR, chỉ số của trường phái chính trong deck cao hơn (lean), chỉ số khác thấp hơn
  stats: { mainBonus: [4, 9], sideBonus: [1, 4], otherMalus: [-6, -1], min: 40, max: 99 },

  // Deck Core: số lá + tỉ lệ độ hiếm theo "bậc" deck (bậc tăng theo Area + trạm scout)
  deck: {
    size: [6, 9],
    mainShare: 0.55,        // phần lá thuộc trường phái chính (còn lại: trường phái phụ / cầu nối / ngẫu nhiên)
    sideShare: 0.3,
    // tỉ lệ độ hiếm theo bậc deck 0..4 (bậc = min(4, floor(Area / 2) + trạm scout bonus))
    rarityOdds: [
      { common: 55, rare: 35, epic: 10 },
      { common: 35, rare: 40, epic: 22, legendary: 3 },
      { common: 20, rare: 38, epic: 32, legendary: 8, mythic: 2 },
      { common: 10, rare: 30, epic: 38, legendary: 16, mythic: 6 },
      { common: 5, rare: 22, epic: 40, legendary: 22, mythic: 11 },
    ],
    ultChance: [0, 0.15, 0.35, 0.6, 0.85],   // xác suất deck có Tuyệt kỹ của trường phái chính, theo bậc
  },

  // phí chuyển nhượng = (OVR - feeBase)^2 x feeMult + tổng giá trị độ hiếm deck (progression.rarities[].value) x deckMult
  fee: { feeBase: 50, feeMult: 0.8, deckMult: 0.25, min: 80 },

  // hạng hiển thị theo điểm = OVR + điểm deck (độ hiếm trung bình); cao -> hạng hiếm, viền màu theo độ hiếm
  grade: [
    { min: 0, label: 'C', rarity: 'common' },
    { min: 76, label: 'B', rarity: 'rare' },
    { min: 84, label: 'A', rarity: 'epic' },
    { min: 91, label: 'S', rarity: 'legendary' },
    { min: 97, label: 'SS', rarity: 'mythic' },
  ],

  // trạm scout: cấp 1..n — thời gian mỗi lần scout (phút, giờ thật), OVR cộng thêm, bậc deck cộng thêm, giá nâng cấp lên cấp này
  station: [
    { minutes: 20, ovrBonus: 0, deckBonus: 0, cost: 0 },
    { minutes: 12, ovrBonus: 1, deckBonus: 0, cost: 400 },
    { minutes: 8, ovrBonus: 2, deckBonus: 1, cost: 1000 },
    { minutes: 5, ovrBonus: 3, deckBonus: 1, cost: 2200 },
    { minutes: 3, ovrBonus: 5, deckBonus: 2, cost: 4000 },
  ],

  // tên ngẫu nhiên (nickname đường phố) cho ứng viên
  names: ['BLAZE', 'TANK', 'ZIPPY', 'NOVA', 'RAZOR', 'MOOSE', 'PIXEL', 'BOLT', 'ROCKY', 'VIPER', 'COMET', 'DUKE', 'KOBE', 'SPUD',
    'TURBO', 'GHOST', 'RUMBLE', 'ACE', 'JINX', 'MAMBA', 'FLASH', 'BRICK', 'SLICK', 'NACHO', 'ORBIT', 'DYNAMO', 'PEPPER', 'SHADOW',
    'TITAN', 'BANDIT', 'SAMBA', 'ROOK', 'CRUSH', 'FIZZ', 'LOBO', 'MANGO', 'ZORRO', 'RIO', 'KAISER', 'NINJA', 'STORM', 'BISON'],
  // khu vực scout (bản đồ thế giới ở màn SCOUT): máy bay bay qua các điểm này
  regions: ['SOUTH STREETS', 'HARBOR CITY', 'NEON DISTRICT', 'DESERT COURTS', 'SNOW LEAGUE', 'ISLAND CUP', 'OLD TOWN', 'SKY TOWERS'],
};
