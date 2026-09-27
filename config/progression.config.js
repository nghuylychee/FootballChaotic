/* =========================================================
 * PROGRESSION CONFIG — meta ngoài trận: level, XP, gold, hộp gacha (costume + Core), túi đồ.
 * Dữ liệu người chơi lưu ở localStorage của trình duyệt (src/core/profile.js).
 * ========================================================= */
window.SFC_CONFIG = window.SFC_CONFIG || {};

SFC_CONFIG.progression = {
  storageKey: 'sfc_profile_v1',
  nameMaxLength: 12,
  startGold: 150,

  // XP cần để lên level tiếp theo: xpBase + xpStep * (level - 1)
  maxLevel: 30,
  xpBase: 80,
  xpStep: 40,
  levelUpGold: 30,             // thưởng gold mỗi lần lên level

  // Thưởng sau trận (chỉ tính trận đá hết giờ, bỏ giữa chừng không có thưởng)
  rewards: {
    single: {
      win:  { xp: 60, gold: 40 },
      draw: { xp: 35, gold: 20 },
      lose: { xp: 20, gold: 10 },
      goal: { xp: 8, gold: 5 },          // mỗi bàn thắng ghi được
      difficulty: { easy: 0.6, normal: 1.0, hard: 1.5 },   // nhân toàn bộ thưởng
    },
    pvp: {
      win:  { xp: 100, gold: 70 },
      draw: { xp: 60, gold: 35 },
      lose: { xp: 35, gold: 20 },
      goal: { xp: 10, gold: 6 },
    },
    maxGoals: 8,               // số bàn tối đa được tính thưởng mỗi trận (chống farm)
  },

  // Độ hiếm (màu kiểu CSGO). value = gold nhận được khi phân rã 1 món
  rarities: {
    common:    { label: 'THƯỜNG',      color: '#b0c3d9', value: 20 },
    rare:      { label: 'HIẾM',        color: '#4b69ff', value: 50 },
    epic:      { label: 'SỬ THI',      color: '#8847ff', value: 140 },
    legendary: { label: 'HUYỀN THOẠI', color: '#eb4b4b', value: 400 },
    mythic:    { label: 'THẦN THOẠI',  color: '#e4ae39', value: 1200 },
  },
  rarityOrder: ['common', 'rare', 'epic', 'legendary', 'mythic'],

  // Màu miễn phí (chọn trong NHÂN VẬT) — màu da lấy từ SFC_CONFIG.teams.skins
  hairColors: ['#1a1216', '#3b2415', '#8a4b22', '#f2d16b', '#e8ecf5', '#ff3d5a', '#3ff6ff', '#9d7bff', '#6bff4f'],

  // Costume, phối tự do. slot: hair (tóc / mũ) · face (mặt) · shoes (giày) · fx (hiệu ứng khi chạy)
  // default: true = có sẵn, không nằm trong hộp, không phân rã được. Hình vẽ ở src/render/sprites.js (theo id).
  slots: {
    hair:  { label: 'TÓC & MŨ' },
    face:  { label: 'MẶT' },
    shoes: { label: 'GIÀY' },
    fx:    { label: 'HIỆU ỨNG' },
  },
  // Mỗi slot 20 món: 1–2 mặc định · ~6–7 THƯỜNG · ~5 HIẾM · 4 SỬ THI · 2–3 HUYỀN THOẠI · 1 THẦN THOẠI
  items: {
    /* ---------- TÓC & MŨ ---------- */
    classic:   { slot: 'hair', name: 'Băng đô',        default: true, desc: 'Tóc ngắn + băng đô màu đội. Kiểu kinh điển.' },
    buzz:      { slot: 'hair', name: 'Đầu đinh',       default: true, desc: 'Cạo gọn, không vướng víu.' },
    spiky:     { slot: 'hair', name: 'Tóc dựng',       rarity: 'common', desc: 'Tóc dựng ngược như vừa bị sét đánh.' },
    cap:       { slot: 'hair', name: 'Snapback',       rarity: 'common', desc: 'Mũ lưỡi trai đường phố, lưỡi mũ theo hướng nhìn.' },
    beanie:    { slot: 'hair', name: 'Mũ len',         rarity: 'common', desc: 'Mũ len đỏ có quả bông.' },
    bowl:      { slot: 'hair', name: 'Tóc bát úp',     rarity: 'common', desc: 'Mái bằng tăm tắp, cắt tại gia.' },
    bun:       { slot: 'hair', name: 'Búi tóc',        rarity: 'common', desc: 'Búi gọn trên đỉnh đầu, sẵn sàng chiến.' },
    longhair:  { slot: 'hair', name: 'Tóc dài',        rarity: 'common', desc: 'Tóc dài buộc đuôi ngựa, bay theo từng bước chạy.' },
    bucket:    { slot: 'hair', name: 'Mũ bucket',      rarity: 'common', desc: 'Mũ tai bèo màu kaki, chuẩn dân chơi.' },
    mohawk:    { slot: 'hair', name: 'Mohawk',         rarity: 'rare', desc: 'Một dải tóc dựng giữa đầu. Punk!' },
    bandana:   { slot: 'hair', name: 'Khăn bandana',   rarity: 'rare', desc: 'Khăn buộc đầu, đuôi khăn bay phía sau.' },
    headphones:{ slot: 'hair', name: 'Tai nghe',       rarity: 'rare', desc: 'Nhạc to, không nghe thấy trọng tài.' },
    helmet:    { slot: 'hair', name: 'Mũ bảo hiểm',    rarity: 'rare', desc: 'An toàn là trên hết — kể cả khi bị đá bay.' },
    afro:      { slot: 'hair', name: 'Afro',           rarity: 'epic', desc: 'Mái tóc xù to gấp đôi cái đầu.' },
    cowboy:    { slot: 'hair', name: 'Mũ cao bồi',     rarity: 'epic', desc: 'Cánh mũ rộng, luật rừng đường phố.' },
    santa:     { slot: 'hair', name: 'Mũ Noel',        rarity: 'epic', desc: 'Giáng sinh quanh năm.' },
    viking:    { slot: 'hair', name: 'Mũ Viking',      rarity: 'epic', desc: 'Mũ sắt hai sừng, xông pha không lùi.' },
    halo:      { slot: 'hair', name: 'Vòng thánh',     rarity: 'legendary', desc: 'Vòng hào quang lơ lửng — thiên thần sân cỏ.' },
    flamehair: { slot: 'hair', name: 'Tóc lửa',        rarity: 'legendary', desc: 'Tóc là những ngọn lửa đang cháy.' },
    crown:     { slot: 'hair', name: 'Vương miện',     rarity: 'mythic', desc: 'Chỉ dành cho vua đường phố.' },
    /* ---------- MẶT ---------- */
    none:      { slot: 'face', name: 'Mặt mộc',        default: true, desc: 'Không phụ kiện.' },
    bandaid:   { slot: 'face', name: 'Băng cá nhân',   rarity: 'common', desc: 'Vết tích của một trận đấu nảy lửa.' },
    mustache:  { slot: 'face', name: 'Ria mép',        rarity: 'common', desc: 'Ria mép cùng màu tóc.' },
    blush:     { slot: 'face', name: 'Má hồng',        rarity: 'common', desc: 'Ngại ngùng nhưng đá rất đau.' },
    freckles:  { slot: 'face', name: 'Tàn nhang',      rarity: 'common', desc: 'Dấu ấn của những trưa đá bóng dưới nắng.' },
    beard:     { slot: 'face', name: 'Râu quai nón',   rarity: 'common', desc: 'Râu rậm cùng màu tóc, trông già dặn hẳn.' },
    nerd:      { slot: 'face', name: 'Kính cận',       rarity: 'common', desc: 'Kính tròn gọng đen. Đọc trận như đọc sách.' },
    scar:      { slot: 'face', name: 'Vết sẹo',        rarity: 'common', desc: 'Một vết sẹo ngang mắt, không ai dám hỏi.' },
    shades:    { slot: 'face', name: 'Kính đen',       rarity: 'rare', desc: 'Ngầu. Không cần giải thích.' },
    mask:      { slot: 'face', name: 'Khẩu trang',     rarity: 'rare', desc: 'Bí ẩn, không ai biết bạn là ai.' },
    clown:     { slot: 'face', name: 'Mũi hề',         rarity: 'rare', desc: 'Mũi đỏ tròn xoe. Đối thủ cười thì bạn ghi bàn.' },
    goldtooth: { slot: 'face', name: 'Răng vàng',      rarity: 'rare', desc: 'Cười một cái là lóe sáng.' },
    warpaint:  { slot: 'face', name: 'Sơn chiến binh', rarity: 'rare', desc: 'Vạch sơn hai má trước giờ ra trận.' },
    eyepatch:  { slot: 'face', name: 'Bịt mắt',        rarity: 'epic', desc: 'Cướp biển sân bóng.' },
    monocle:   { slot: 'face', name: 'Kính một mắt',   rarity: 'epic', desc: 'Quý ông đường phố, có dây xích vàng.' },
    ninja:     { slot: 'face', name: 'Khăn ninja',     rarity: 'epic', desc: 'Che kín mặt, chỉ lộ đôi mắt.' },
    cyborg:    { slot: 'face', name: 'Mắt cyborg',     rarity: 'epic', desc: 'Một mắt thay bằng đèn quét đỏ.' },
    visor:     { slot: 'face', name: 'Kính neon',      rarity: 'legendary', desc: 'Kính cyber phát sáng.' },
    skull:     { slot: 'face', name: 'Mặt nạ đầu lâu', rarity: 'legendary', desc: 'Đối thủ nhìn là run chân.' },
    lasereyes: { slot: 'face', name: 'Mắt laser',      rarity: 'mythic', desc: 'Mắt đỏ rực bắn tia laser về phía trước.' },
    /* ---------- GIÀY ---------- */
    kicks:     { slot: 'shoes', name: 'Sneaker trắng', default: true, desc: 'Đôi giày quốc dân.' },
    slides:    { slot: 'shoes', name: 'Dép lê',        rarity: 'common', desc: 'Đá bóng bằng dép lê — đúng chất đường phố.' },
    reds:      { slot: 'shoes', name: 'Giày đỏ',       rarity: 'common', desc: 'Đỏ rực, đế trắng.' },
    canvas:    { slot: 'shoes', name: 'Giày vải xanh', rarity: 'common', desc: 'Giày vải rẻ mà bền.' },
    boots:     { slot: 'shoes', name: 'Bốt da',        rarity: 'common', desc: 'Bốt nâu cổ cao, dẫm đâu chắc đó.' },
    barefoot:  { slot: 'shoes', name: 'Chân đất',      rarity: 'common', desc: 'Không giày. Tuổi thơ ùa về.' },
    rainboot:  { slot: 'shoes', name: 'Ủng mưa',       rarity: 'common', desc: 'Ủng vàng chóe, sân ngập cũng không sợ.' },
    socks:     { slot: 'shoes', name: 'Tất sọc cao',   rarity: 'rare', desc: 'Tất sọc kéo cao + giày đen.' },
    hightop:   { slot: 'shoes', name: 'High-top',      rarity: 'rare', desc: 'Cổ cao đen, đế cam.' },
    clogs:     { slot: 'shoes', name: 'Guốc gỗ',       rarity: 'rare', desc: 'Lộc cộc trên sân bê tông.' },
    rollers:   { slot: 'shoes', name: 'Giày patin',    rarity: 'rare', desc: 'Có bánh xe dưới đế. Trượt thay chạy.' },
    cleats:    { slot: 'shoes', name: 'Giày đinh',     rarity: 'rare', desc: 'Giày đá bóng xanh lá, đinh tán bám sân.' },
    neonkick:  { slot: 'shoes', name: 'Giày neon',     rarity: 'epic', desc: 'Phát sáng xanh neon trong đêm.' },
    camo:      { slot: 'shoes', name: 'Giày rằn ri',   rarity: 'epic', desc: 'Hoạ tiết quân đội, tàng hình trong bụi rậm.' },
    rainbowkick:{ slot: 'shoes', name: 'Giày cầu vồng', rarity: 'epic', desc: 'Đổi màu liên tục theo từng bước.' },
    mismatch:  { slot: 'shoes', name: 'Lệch đôi',      rarity: 'epic', desc: 'Một chiếc đỏ một chiếc xanh. Cố ý đấy.' },
    goldboot:  { slot: 'shoes', name: 'Giày vàng',     rarity: 'legendary', desc: 'Giày đúc vàng, lấp lánh.' },
    iceboot:   { slot: 'shoes', name: 'Giày băng',     rarity: 'legendary', desc: 'Tạc từ băng vĩnh cửu, toả hơi lạnh.' },
    rocket:    { slot: 'shoes', name: 'Giày tên lửa',  rarity: 'legendary', desc: 'Phụt lửa xanh dưới đế.' },
    flame:     { slot: 'shoes', name: 'Giày lửa',      rarity: 'mythic', desc: 'Gót giày bốc lửa.' },
    /* ---------- HIỆU ỨNG (khi chạy) ---------- */
    nofx:      { slot: 'fx', name: 'Không',            default: true, desc: 'Không hiệu ứng.' },
    sparkle:   { slot: 'fx', name: 'Lấp lánh',         rarity: 'common', desc: 'Những đốm sáng nhỏ lấp lánh quanh người.' },
    bubbles:   { slot: 'fx', name: 'Bong bóng',        rarity: 'common', desc: 'Bong bóng xà phòng bay lên sau lưng.' },
    leaves:    { slot: 'fx', name: 'Lá bay',           rarity: 'common', desc: 'Lá xanh cuốn theo gió.' },
    hearts:    { slot: 'fx', name: 'Trái tim',         rarity: 'common', desc: 'Chạy tới đâu thả tim tới đó.' },
    snow:      { slot: 'fx', name: 'Tuyết rơi',        rarity: 'common', desc: 'Bông tuyết lất phất quanh người.' },
    smoke:     { slot: 'fx', name: 'Khói',             rarity: 'common', desc: 'Chạy nhanh tới mức bốc khói.' },
    dust:      { slot: 'fx', name: 'Bụi đường',        rarity: 'rare', desc: 'Bụi tung lên dưới chân khi chạy.' },
    notes:     { slot: 'fx', name: 'Nốt nhạc',         rarity: 'rare', desc: 'Mỗi bước chạy là một nốt nhạc.' },
    confetti:  { slot: 'fx', name: 'Pháo giấy',        rarity: 'rare', desc: 'Ăn mừng ngay cả khi chưa ghi bàn.' },
    petals:    { slot: 'fx', name: 'Hoa anh đào',      rarity: 'rare', desc: 'Cánh hoa hồng phấn rơi theo bước chân.' },
    coins:     { slot: 'fx', name: 'Mưa xu',           rarity: 'rare', desc: 'Đồng xu vàng văng ra khi chạy. Giàu!' },
    neon:      { slot: 'fx', name: 'Vệt neon',         rarity: 'epic', desc: 'Vệt sáng xanh neon theo sau khi chạy.' },
    frost:     { slot: 'fx', name: 'Băng giá',         rarity: 'epic', desc: 'Để lại vệt băng lấp lánh trên sân.' },
    lightning: { slot: 'fx', name: 'Tia sét',          rarity: 'epic', desc: 'Tia điện lách tách quanh người.' },
    rainbow:   { slot: 'fx', name: 'Cầu vồng',         rarity: 'epic', desc: 'Kéo theo một dải cầu vồng.' },
    fire:      { slot: 'fx', name: 'Bước lửa',         rarity: 'legendary', desc: 'Chạy tới đâu cháy tới đó.' },
    shadow:    { slot: 'fx', name: 'Bóng ma',          rarity: 'legendary', desc: 'Bóng tím của chính bạn đuổi theo sau.' },
    galaxy:    { slot: 'fx', name: 'Ngân hà',          rarity: 'legendary', desc: 'Bụi sao vũ trụ rắc theo từng bước.' },
    aura:      { slot: 'fx', name: 'Hào quang vàng',   rarity: 'mythic', desc: 'Vầng sáng vàng luôn toả dưới chân.' },
  },
  defaultLook: { hair: 'classic', face: 'none', shoes: 'kicks', fx: 'nofx', skin: 0, hairColor: 0 },

  // TẠM TẮT gacha Core: mọi Core dùng được ngay cho mọi người chơi (không cần quay / level), Hộp Core ẩn khỏi SHOP.
  // Core đã quay được trước đó vẫn giữ trong hồ sơ. Bật lại = true.
  coreGacha: false,

  // Core Upgrade (khi coreGacha bật): user mới chỉ có bộ Core cơ bản; Core khác lấy từ Hộp Core.
  // level = level tối thiểu để Core quay được xuất hiện khi chọn Core giữa trận (chưa đủ thì nằm chờ trong túi đồ).
  // Độ hiếm của Core lấy từ config/cores.config.js (rarity) — dùng chung cho gacha và tần suất khi chọn Core.
  starterCores: ['sniper_foot', 'banana_kick', 'speed_demon', 'street_fighter', 'counter_attack', 'maestro'],
  cores: {
    warp_walls:     { level: 2 },
    fire_shot:      { level: 3 },
    phantom_step:   { level: 4 },
    iron_body:      { level: 5 },
    fake_run:       { level: 6 },
    emp_trap:       { level: 7 },
    chaos_ball:     { level: 8 },
    thunder_kick:   { level: 10 },
    blade_runner:   { level: 12 },
    aegis_wall:     { level: 14 },
    lightning_dash: { level: 14 },
    // Giai đoạn 3 — THƯỜNG LV1 · HIẾM LV2–4 · SỬ THI LV5–8 · HUYỀN THOẠI LV10–12 · Tuyệt kỹ LV14+
    eagle_eye: { level: 1 }, heavy_boot: { level: 1 }, quick_feet: { level: 1 },
    burst_start: { level: 2 }, one_touch: { level: 2 }, fist_storm: { level: 3 }, juggle: { level: 3 },
    uppercut: { level: 3 }, iron_fist: { level: 4 }, wall_slam: { level: 4 },
    sonic_boom: { level: 5 }, symphony: { level: 5 }, giant_fist: { level: 5 }, captain: { level: 5 },
    freight_train: { level: 6 }, energy_wave: { level: 6 }, ground_slam: { level: 6 }, one_two: { level: 6 },
    phantom_pass: { level: 7 }, witch_time: { level: 7 }, bulldozer: { level: 7 }, counter_strike: { level: 7 },
    shadow_clone: { level: 8 }, giant_keeper: { level: 8 }, rubber_arm: { level: 8 }, flying_kick: { level: 8 }, ghost_ball: { level: 8 },
    black_hole: { level: 10 }, bomb_ball: { level: 11 }, scissor_kick: { level: 12 },
    hundred_fists: { level: 15 }, meteor_strike: { level: 15 }, titan: { level: 16 }, meteor_drop: { level: 16 },
    clone_army: { level: 17 }, endless_tiki: { level: 18 },
  },

  // Hộp gacha (quay kiểu CSGO). kind: costume | core. odds = % theo độ hiếm (chuẩn hoá theo các độ hiếm có trong hộp),
  // sau đó chọn đều 1 món trong độ hiếm đó. rarities = độ hiếm có trong hộp.
  boxes: {
    street: {
      name: 'Hộp Đường Phố', kind: 'costume', price: 100, level: 1, color: '#b0c3d9',
      desc: 'Costume đủ loại: tóc, mặt, giày, hiệu ứng. Chủ yếu đồ thường, thỉnh thoảng lóe vàng.',
      odds: { common: 60, rare: 27, epic: 10, legendary: 2.5, mythic: 0.5 },
    },
    legend: {
      name: 'Hộp Huyền Thoại', kind: 'costume', price: 450, level: 6, color: '#eb4b4b',
      desc: 'Chỉ costume từ HIẾM trở lên. Tỉ lệ đồ đỏ / vàng cao hơn hẳn.',
      odds: { rare: 50, epic: 32, legendary: 14, mythic: 4 },
    },
    core: {
      name: 'Hộp Core', kind: 'core', price: 220, level: 2, color: '#8847ff',
      desc: 'Mở khoá Core Upgrade mới cho pool chọn Core giữa trận. Core cần đủ level mới dùng được.',
      odds: { rare: 60, epic: 30, legendary: 8, mythic: 2 },
    },
  },
  boxOrder: ['street', 'legend', 'core'],
  reelLength: 46,              // số ô trên dải quay
  reelWinIndex: 40,            // ô trúng thưởng
  reelTime: 4.8,               // giây quay
};

// tắt gacha Core -> ẩn Hộp Core khỏi SHOP
if (!SFC_CONFIG.progression.coreGacha) {
  const PG = SFC_CONFIG.progression;
  PG.boxOrder = PG.boxOrder.filter((id) => PG.boxes[id].kind !== 'core');
}
