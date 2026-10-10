/* =========================================================
 * MAIN PATH CONFIG — đường tiến trình chính kiểu Clash Royale, xếp theo ELO (logic ở src/meta/mainpath.js).
 *
 * Mỗi trận là 2v2 "người chơi" (tạm thời: matchmaking giả, 3 người còn lại là bot đóng vai người chơi — xem matchmaking).
 * Thắng / hoà / thua -> cộng / trừ Elo theo công thức Elo (k), so Elo trung bình 2 đội. Elo không xuống dưới 0.
 * Area = khoảng Elo: đang ở Area cao nhất có areas[].elo <= Elo hiện tại. Tụt Elo dưới ngưỡng = rớt về Area dưới (rớt tự do).
 * Thưởng mỗi trận: gold + XP (progression.config.js -> rewards.single, nhân reward của Area).
 * Thưởng lớn: LẦN ĐẦU tới 1 Area -> mở Tuyệt kỹ areas[].ult (rớt rồi lên lại không nhận lại).
 * Core thường (không phải Tuyệt kỹ): ai cũng dùng được ngay (lockCores chỉ khoá Tuyệt kỹ).
 * ========================================================= */
window.SFC_CONFIG = window.SFC_CONFIG || {};

SFC_CONFIG.mainPath = {
  // Elo: điểm khởi đầu · hệ số k (thay đổi tối đa mỗi trận; 2 đội ngang Elo: thắng +k/2, thua -k/2) ·
  // minWin: thắng ít nhất bấy nhiêu điểm · lastSpan: độ rộng khoảng Elo của Area cuối (trần level đạt maxLevel khi vượt hết)
  elo: { start: 0, k: 40, minWin: 4, lastSpan: 600 },
  forfeitCountsAsLoss: true,    // bỏ trận giữa chừng (Pause > FORFEIT) = thua

  /* Matchmaking (PLACEHOLDER — chưa có server): màn tìm trận đếm giờ rồi ghép 3 người chơi giả do bot điều khiển.
   * searchTime: [min, max] giây chờ giả · range: [lúc đầu, tối đa] độ lệch Elo của người chơi giả, nới dần theo thời gian chờ ·
   * sameArea: tỉ lệ người chơi giả nằm cùng Area với bạn (ưu tiên cùng Area) · foundHold: giây hiện màn "ĐÃ TÌM THẤY" trước khi vào trận.
   * Người chơi giả: tên trong names, deck Core / ngoại hình theo Area của họ (src/meta/teammates.js -> generate),
   * OVR ngang 1 character thật ở Elo đó: base + perLevel x (trần level ở Elo đó - 1) + offset, lệch ngẫu nhiên ±spread
   * (base / perLevel ~ progression.attrs: rating khởi đầu 60, ~0.86 OVR mỗi level).
   * Độ khó AI cả 2 đội bot theo Elo trung bình (areas[].ai, nội suy trong Area). */
  matchmaking: {
    searchTime: [2.5, 6], range: [60, 240], sameArea: 0.85, foundHold: 2.2,
    ovr: { base: 60, perLevel: 0.86, offset: -1, spread: 3 },
    names: ['xXStrikerXx', 'NutmegKing', 'ToeBash99', 'Panenka_', 'MrBicycle', 'ElTiki', 'GoalHanger', 'Sh4dowStep', 'CurveLord',
      'TekkersTom', 'RabonaRita', 'NoLookNina', 'SweatyBoots', 'KaiserKick', 'BanterFC', 'Kev1nDB', 'LilPressing', 'OffsideOllie',
      'TopBinzz', 'ChipChop', 'Volley_Vee', 'GrassBurner', 'StepoverSam', 'BoxToBox', 'ZizouSpin', 'Cr4ckShot', 'HeaderHans',
      'MidnightMessi', 'PuddleKing', 'SliderJoe', 'Tunnelr', 'BigBootBen', 'Skrrt_Sami', 'ElFlaco', 'BallHogBob', 'JukeJin',
      'Nacho10', 'HatTrickHana', 'BonkBrawler', 'ToeKnee'],
  },

  // đồng đội AI trong trận online (đội có 1 người: đồng đội đang chọn) dùng độ khó này (game.config.js -> ai.difficulty)
  teammate: 'normal',

  /* Tuyệt kỹ: lockCores = true -> Tuyệt kỹ chỉ dùng được khi đã mở (Aura Farming từ PROLOGUE + areas[].ult);
   * Core thường luôn mở. lockCores = false: mọi Core dùng được ngay. */
  lockCores: true,

  // Đội riêng của người chơi (cố định). {name} = tên character. Chỉ số trung bình, không thiên hướng Core.
  playerTeam: {
    id: 'mp_player',
    nameFormat: '{name} FC',
    short: 'YOU',
    tagline: 'YOUR CLUB',
    desc: 'Your own street club. Climb the Main Path from the back alleys to the Apex.',
    kit: { shirt: '#f3ead7', shirtDark: '#a89e8a', shorts: '#2a2440', accent: '#ffe14f', hair: ['#1a1216', '#3b2415', '#8a4b22'] },
    // online / đối thủ Main Path: 2 đội đều là CLB riêng -> đội khách mặc áo sân khách cho khỏi trùng màu
    awayKit: { shirt: '#3a7bff', shirtDark: '#2046a8', shorts: '#1b1f3a', accent: '#ffe14f', hair: ['#1a1216', '#3b2415', '#8a4b22'] },
    stats: { speed: 1, power: 1, pass: 1, tackle: 1, dribble: 1, accuracy: 1 },
    coreWeights: {},
    aiStyle: { light: 1, hard: 1 },
    players: ['ROOKIE', 'ACE'],   // theo thứ tự vị trí (DEF, FWD); character của bạn thay 1 người
  },

  /* elo: ngưỡng Elo để vào Area (Area 1 phải là 0). ult: Tuyệt kỹ mở khi LẦN ĐẦU tới Area (null = chưa có Tuyệt kỹ cho Area này).
   * Độ khó AI bot: ai = [đầu Area, cuối Area], nội suy theo Elo trong Area.
   * reaction: giây giữa các quyết định (thấp = nhanh) · tackleMult: tỉ lệ làm rơi bóng / cắt bóng ·
   * shotAccuracy: độ chính xác sút + bắt bóng · aggression: tần suất ra đòn / lướt · speedMult: tốc độ chạy.
   * (tham chiếu game.config.js: EASY 0.34/0.7/0.55/0.6/0.92 · NORMAL 0.2/1/0.8/1/1 · HARD 0.1/1.2/0.92/1.3/1.06)
   * reward: hệ số thưởng XP / gold. arena: id trong arenas.config.js. teams: đội bot của Area (đội bot co-op online).
   * levelCap: level tối đa của character theo Elo cao nhất từng đạt, chia đều khoảng Elo của Area thành từng nấc —
   *   mỗi level = 1 DRILL, nên đây là trần chỉ số. XP vượt trần vẫn tích lại, lên Elo là lên level ngay. */
  areas: [
    // AREA 1
    {
      id: 'village', name: 'VILLAGE GREEN', sub: 'Where the dream begins', color: '#9ccf5a', icon: '🌾',
      levelCap: [3, 5, 7], elo: 0, reward: 1.0, arena: 'village',
      teams: ['paddy_kickers', 'muddy_ducks'],
      ai: [{ reaction: 0.5, tackleMult: 0.45, shotAccuracy: 0.4, aggression: 0.35, speedMult: 0.82 }, { reaction: 0.44, tackleMult: 0.55, shotAccuracy: 0.46, aggression: 0.45, speedMult: 0.86 }],
      ult: null,
    },
    // AREA 2
    {
      id: 'alley', name: 'BACK ALLEY', sub: 'Where every legend starts', color: '#ff9a3d', icon: '🗑️',
      levelCap: [9, 10, 11], elo: 200, reward: 1.1, arena: 'alley',
      teams: ['alley_cats', 'trash_pandas'],
      ai: [{ reaction: 0.42, tackleMult: 0.58, shotAccuracy: 0.48, aggression: 0.5, speedMult: 0.87 }, { reaction: 0.36, tackleMult: 0.68, shotAccuracy: 0.55, aggression: 0.6, speedMult: 0.91 }],
      ult: 'hundred_fists',
    },
    // AREA 3
    {
      id: 'school', name: 'SCHOOLYARD', sub: 'Recess never ends', color: '#ffd23f', icon: '🏫',
      levelCap: [12, 13, 15], elo: 450, reward: 1.25, arena: 'school',
      teams: ['hall_monitors', 'detention_club'],
      ai: [{ reaction: 0.34, tackleMult: 0.72, shotAccuracy: 0.58, aggression: 0.65, speedMult: 0.92 }, { reaction: 0.29, tackleMult: 0.8, shotAccuracy: 0.64, aggression: 0.75, speedMult: 0.95 }],
      ult: 'lightning_dash',
    },
    // AREA 4
    {
      id: 'rooftop', name: 'ROOFTOP', sub: 'Football above the city lights', color: '#6ec8ff', icon: '🏙️',
      levelCap: [17, 19, 21], elo: 750, reward: 1.4, arena: 'rooftop',
      teams: ['sky_hoppers', 'pigeon_gang'],
      ai: [{ reaction: 0.27, tackleMult: 0.84, shotAccuracy: 0.66, aggression: 0.8, speedMult: 0.96 }, { reaction: 0.23, tackleMult: 0.92, shotAccuracy: 0.72, aggression: 0.88, speedMult: 0.98 }],
      ult: 'endless_tiki',
    },
    // AREA 5
    {
      id: 'market', name: 'NIGHT MARKET', sub: 'Neon lanterns, loud crowds', color: '#ff3fb4', icon: '🏮',
      levelCap: [22, 24, 25], elo: 1100, reward: 1.55, arena: 'market',
      teams: ['noodle_kickers', 'lantern_crew'],
      ai: [{ reaction: 0.21, tackleMult: 0.96, shotAccuracy: 0.75, aggression: 0.92, speedMult: 0.99 }, { reaction: 0.18, tackleMult: 1.02, shotAccuracy: 0.8, aggression: 1.0, speedMult: 1.0 }],
      ult: 'meteor_strike',
    },
    // AREA 6
    {
      id: 'harbor', name: 'HARBOR DOCKS', sub: 'Rust, steel and salt', color: '#f2a33a', icon: '⚓',
      levelCap: [26, 27, 29], elo: 1500, reward: 1.7, arena: 'harbor',
      teams: ['crane_crushers', 'rust_buckets'],
      ai: [{ reaction: 0.17, tackleMult: 1.05, shotAccuracy: 0.82, aggression: 1.05, speedMult: 1.01 }, { reaction: 0.14, tackleMult: 1.12, shotAccuracy: 0.86, aggression: 1.12, speedMult: 1.03 }],
      ult: 'titan',
    },
    // AREA 7
    {
      id: 'cage', name: 'UNDERGROUND CAGE', sub: 'No refs. No mercy.', color: '#ff3d3d', icon: '⛓️',
      levelCap: [30, 31, 32], elo: 1950, reward: 1.9, arena: 'cage',
      teams: ['chain_gang', 'iron_knuckles'],
      ai: [{ reaction: 0.13, tackleMult: 1.14, shotAccuracy: 0.87, aggression: 1.16, speedMult: 1.04 }, { reaction: 0.11, tackleMult: 1.2, shotAccuracy: 0.9, aggression: 1.24, speedMult: 1.05 }],
      ult: 'meteor_drop',
    },
    // AREA 8
    {
      id: 'plaza', name: 'CITY PLAZA CUP', sub: 'The city is watching', color: '#2fd6c0', icon: '🏟️',
      levelCap: [33, 33, 34], elo: 2450, reward: 2.1, arena: 'plaza',
      teams: ['metro_express', 'downtown_stars'],
      ai: [{ reaction: 0.1, tackleMult: 1.24, shotAccuracy: 0.91, aggression: 1.28, speedMult: 1.06 }, { reaction: 0.09, tackleMult: 1.3, shotAccuracy: 0.93, aggression: 1.36, speedMult: 1.07 }],
      ult: 'clone_army',
    },
    // AREA 9
    {
      id: 'cyber', name: 'CYBER ARENA', sub: 'The pro circuit', color: '#9d7bff', icon: '👾',
      levelCap: [34, 35, 36], elo: 3000, reward: 2.35, arena: 'cyber',
      teams: ['glitch_squad', 'chrome_wolves'],
      ai: [{ reaction: 0.08, tackleMult: 1.34, shotAccuracy: 0.94, aggression: 1.4, speedMult: 1.08 }, { reaction: 0.07, tackleMult: 1.4, shotAccuracy: 0.95, aggression: 1.48, speedMult: 1.09 }],
      ult: null,
    },
    // AREA 10
    {
      id: 'stadium', name: 'WORLD STAGE', sub: 'Legends are made here', color: '#ffd23f', icon: '🏆',
      levelCap: [37, 38, 39], elo: 3600, reward: 2.6, arena: 'stadium',
      teams: ['golden_eagles', 'royal_lions'],
      ai: [{ reaction: 0.06, tackleMult: 1.44, shotAccuracy: 0.96, aggression: 1.52, speedMult: 1.1 }, { reaction: 0.05, tackleMult: 1.5, shotAccuracy: 0.97, aggression: 1.6, speedMult: 1.11 }],
      ult: null,
    },
  ],

  /* Đội đối thủ của Main Path (gộp vào SFC_CONFIG.teams.list, không hiện ở Luyện tập / Online).
   * looks: costume theo vị trí [DEF, FWD] — id lấy từ progression.config.js -> items (cut = tóc & mũ); skin = chỉ số màu da (teams.config.js -> skins).
   * Còn lại giống teams.config.js: kit, stats, coreWeights, aiStyle, players. */
  teams: {
    /* ---------- AREA 1 · VILLAGE GREEN (đồ THƯỜNG, chân đất) ---------- */
    paddy_kickers: {
      name: 'Paddy Kickers', short: 'PDY', tagline: 'MUD & GUTS', desc: 'Rice farmers who play barefoot between harvests.',
      kit: { shirt: '#6fae4a', shirtDark: '#3f6f25', shorts: '#5a3a22', accent: '#f2e6b0', hair: ['#1a1216', '#3b2415'] },
      stats: { speed: 0.84, power: 0.8, pass: 0.8, tackle: 0.82, dribble: 0.82, accuracy: 0.78 },
      coreWeights: { runner: 1.5, brawler: 1.2 }, aiStyle: { light: 1.0, hard: 0.7 },
      players: ['SPROUT', 'TILLER'],
      looks: [{ cut: 'bowl', face: 'freckles', shoes: 'barefoot', fx: 'nofx', skin: 1 }, { cut: 'buzz', face: 'none', shoes: 'barefoot', fx: 'nofx', skin: 2 }],
    },
    muddy_ducks: {
      name: 'Muddy Ducks', short: 'DCK', tagline: 'QUACK ATTACK', desc: 'They waddle, they splash, they somehow score.',
      kit: { shirt: '#f2c94c', shirtDark: '#b08a1f', shorts: '#3a5a8a', accent: '#ff8a3f', hair: ['#f2d16b', '#1a1216'] },
      stats: { speed: 0.8, power: 0.82, pass: 0.82, tackle: 0.8, dribble: 0.84, accuracy: 0.8 },
      coreWeights: { chaos: 1.5, trickster: 1.2 }, aiStyle: { light: 0.8, hard: 0.8 },
      players: ['WADDLE', 'PUDDLE'],
      looks: [{ cut: 'beanie', face: 'blush', shoes: 'rainboot', fx: 'nofx', skin: 0 }, { cut: 'spiky', face: 'bandaid', shoes: 'slides', fx: 'bubbles', skin: 4 }],
    },
    buffalo_chiefs: {
      name: 'Buffalo Chiefs', short: 'BUF', tagline: 'BOSS · STRONG AS AN OX', desc: 'The toughest farmhands in the valley. They plough through defenders.',
      kit: { shirt: '#5a3a22', shirtDark: '#2e1c10', shorts: '#e8dcc0', accent: '#e0a030', hair: ['#1a1216', '#3b2415'] },
      stats: { speed: 0.86, power: 0.92, pass: 0.84, tackle: 0.9, dribble: 0.84, accuracy: 0.84 },
      coreWeights: { brawler: 2, iron: 1.5 }, aiStyle: { light: 1.4, hard: 1.2 },
      players: ['BIG HORN', 'OXEN'],
      looks: [{ cut: 'bucket', face: 'beard', shoes: 'boots', fx: 'nofx', skin: 3 }, { cut: 'bandana', face: 'mustache', shoes: 'clogs', fx: 'dust', skin: 2 }],
    },

    /* ---------- AREA 2 · BACK ALLEY ---------- */
    alley_cats: {
      name: 'Alley Cats', short: 'CAT', tagline: 'SCRAPPY', desc: 'Stray cats of the back alley. Quick paws, short tempers.',
      kit: { shirt: '#ff9a3d', shirtDark: '#b35a14', shorts: '#2a2320', accent: '#fff3d6', hair: ['#8a4b22', '#f2d16b'] },
      stats: { speed: 0.95, power: 0.85, pass: 0.88, tackle: 0.9, dribble: 0.92, accuracy: 0.85 },
      coreWeights: { runner: 2, brawler: 1.5 }, aiStyle: { light: 1.3, hard: 0.8 },
      players: ['WHISKER', 'TABBY'],
      looks: [{ cut: 'beanie', face: 'freckles', shoes: 'canvas', fx: 'nofx', skin: 1 }, { cut: 'spiky', face: 'bandaid', shoes: 'slides', fx: 'nofx', skin: 0 }],
    },
    trash_pandas: {
      name: 'Trash Pandas', short: 'TPD', tagline: 'DUMPSTER DIVERS', desc: 'They dig through the trash for loose balls. And loose teeth.',
      kit: { shirt: '#7d8491', shirtDark: '#484d57', shorts: '#1d1f24', accent: '#f2f2f2', hair: ['#1a1216', '#4a4f63'] },
      stats: { speed: 0.88, power: 0.92, pass: 0.85, tackle: 0.95, dribble: 0.85, accuracy: 0.88 },
      coreWeights: { chaos: 2, iron: 1.5 }, aiStyle: { light: 1.1, hard: 1.2 },
      players: ['BANDIT', 'SCRAPS'],
      looks: [{ cut: 'bucket', face: 'mask', shoes: 'rainboot', fx: 'smoke', skin: 3 }, { cut: 'cap', face: 'scar', shoes: 'barefoot', fx: 'nofx', skin: 2 }],
    },
    block_bosses: {
      name: 'Block Bosses', short: 'BLK', tagline: 'BOSS · RUN THE BLOCK', desc: 'Nobody plays in this alley without their say-so.',
      kit: { shirt: '#ffcf3f', shirtDark: '#a8841a', shorts: '#141018', accent: '#ff3d5a', hair: ['#1a1216', '#3b2415'] },
      stats: { speed: 0.97, power: 1.0, pass: 0.95, tackle: 1.0, dribble: 0.95, accuracy: 0.95 },
      coreWeights: { brawler: 2.5, striker: 1.5 }, aiStyle: { light: 1.5, hard: 1.3 },
      players: ['BIG MO', 'DEALER'],
      looks: [{ cut: 'bandana', face: 'goldtooth', shoes: 'hightop', fx: 'dust', skin: 2 }, { cut: 'cap', face: 'shades', shoes: 'reds', fx: 'coins', skin: 1 }],
    },

    /* ---------- AREA 3 · SCHOOLYARD ---------- */
    hall_monitors: {
      name: 'Hall Monitors', short: 'HLM', tagline: 'RULES ARE RULES', desc: 'Straight-A students who never, ever run in the halls. Except now.',
      kit: { shirt: '#e8ecf5', shirtDark: '#9aa3b5', shorts: '#2f4f8a', accent: '#ff3d5a', hair: ['#1a1216', '#3b2415'] },
      stats: { speed: 0.88, power: 0.84, pass: 0.94, tackle: 0.88, dribble: 0.86, accuracy: 0.9 },
      coreWeights: { playmaker: 2, iron: 1.2 }, aiStyle: { light: 0.7, hard: 0.7 },
      players: ['PREFECT', 'WHISTLE'],
      looks: [{ cut: 'bowl', face: 'nerd', shoes: 'kicks', fx: 'nofx', skin: 0 }, { cut: 'classic', face: 'nerd', shoes: 'canvas', fx: 'nofx', skin: 1 }],
    },
    detention_club: {
      name: 'Detention Club', short: 'DTN', tagline: 'SKIPPING CLASS', desc: 'Permanent residents of detention. Play dirty, run fast.',
      kit: { shirt: '#7a4fbf', shirtDark: '#45287a', shorts: '#1a1a1a', accent: '#ffe14f', hair: ['#1a1216', '#8a4b22'] },
      stats: { speed: 0.92, power: 0.88, pass: 0.84, tackle: 0.92, dribble: 0.92, accuracy: 0.86 },
      coreWeights: { brawler: 2, trickster: 1.5 }, aiStyle: { light: 1.3, hard: 1.1 },
      players: ['TARDY', 'SKIP'],
      looks: [{ cut: 'cap', face: 'bandaid', shoes: 'hightop', fx: 'nofx', skin: 2 }, { cut: 'mohawk', face: 'scar', shoes: 'socks', fx: 'nofx', skin: 1 }],
    },
    varsity_seniors: {
      name: 'Varsity Seniors', short: 'VAR', tagline: 'BOSS · TOP OF THE SCHOOL', desc: 'Final-year stars with scholarship offers and huge egos.',
      kit: { shirt: '#1f3a7a', shirtDark: '#0f1f45', shorts: '#f2f2f2', accent: '#ffcf3f', hair: ['#3b2415', '#1a1216'] },
      stats: { speed: 0.95, power: 0.94, pass: 0.92, tackle: 0.94, dribble: 0.94, accuracy: 0.94 },
      coreWeights: { striker: 2, runner: 1.5 }, aiStyle: { light: 1.0, hard: 1.1 },
      players: ['CAPTAIN', 'JOCK'],
      looks: [{ cut: 'headphones', face: 'shades', shoes: 'cleats', fx: 'nofx', skin: 4 }, { cut: 'longhair', face: 'goldtooth', shoes: 'hightop', fx: 'confetti', skin: 1 }],
    },

    /* ---------- AREA 4 · ROOFTOP ---------- */
    sky_hoppers: {
      name: 'Sky Hoppers', short: 'SKY', tagline: 'AIR BALL', desc: 'Parkour kids who jump roof to roof. They love a lob.',
      kit: { shirt: '#6ec8ff', shirtDark: '#2f7fb8', shorts: '#f3f7ff', accent: '#ffffff', hair: ['#f2d16b', '#1a1216'] },
      stats: { speed: 1.02, power: 0.9, pass: 1.0, tackle: 0.88, dribble: 1.0, accuracy: 0.95 },
      coreWeights: { runner: 2.5, trickster: 1.5 }, aiStyle: { light: 0.7, hard: 0.8 },
      players: ['HOPS', 'CLOUD'],
      looks: [{ cut: 'headphones', face: 'nerd', shoes: 'hightop', fx: 'nofx', skin: 0 }, { cut: 'longhair', face: 'blush', shoes: 'rollers', fx: 'bubbles', skin: 4 }],
    },
    pigeon_gang: {
      name: 'Pigeon Gang', short: 'PGN', tagline: 'COO COO', desc: 'They own every ledge in town. Loud, grey and everywhere.',
      kit: { shirt: '#8d86b8', shirtDark: '#524c7a', shorts: '#2a2a33', accent: '#6bff4f', hair: ['#4a4f63', '#d9e2ec'] },
      stats: { speed: 0.95, power: 0.98, pass: 0.95, tackle: 1.0, dribble: 0.95, accuracy: 0.95 },
      coreWeights: { chaos: 2, brawler: 1.5 }, aiStyle: { light: 1.3, hard: 1.0 },
      players: ['COOPER', 'FEATHERS'],
      looks: [{ cut: 'helmet', face: 'mustache', shoes: 'boots', fx: 'nofx', skin: 2 }, { cut: 'mohawk', face: 'warpaint', shoes: 'socks', fx: 'notes', skin: 0 }],
    },
    penthouse_kings: {
      name: 'Penthouse Kings', short: 'PNT', tagline: 'BOSS · OLD MONEY', desc: 'They own the building. And the rooftop. And probably you.',
      kit: { shirt: '#1e1b2e', shirtDark: '#0f0d18', shorts: '#f3ead7', accent: '#ffd23f', hair: ['#1a1216', '#e8ecf5'] },
      stats: { speed: 1.0, power: 1.02, pass: 1.05, tackle: 1.0, dribble: 1.02, accuracy: 1.02 },
      coreWeights: { playmaker: 2.5, striker: 2 }, aiStyle: { light: 0.9, hard: 1.0 },
      players: ['MONTY', 'STERLING'],
      looks: [{ cut: 'bandana', face: 'monocle', shoes: 'goldboot', fx: 'nofx', skin: 4 }, { cut: 'afro', face: 'shades', shoes: 'goldboot', fx: 'coins', skin: 3 }],
    },

    /* ---------- AREA 5 · NIGHT MARKET ---------- */
    noodle_kickers: {
      name: 'Noodle Kickers', short: 'NDL', tagline: 'SLURP & SHOOT', desc: 'Stall cooks by night, strikers by later-night.',
      kit: { shirt: '#e83b2e', shirtDark: '#8c1f17', shorts: '#fff3d6', accent: '#ffd23f', hair: ['#1a1216', '#3b2415'] },
      stats: { speed: 1.0, power: 1.02, pass: 1.02, tackle: 0.98, dribble: 1.0, accuracy: 1.02 },
      coreWeights: { striker: 2.5, playmaker: 1.5 }, aiStyle: { light: 1.0, hard: 1.0 },
      players: ['UDON', 'RAMEN'],
      looks: [{ cut: 'bun', face: 'beard', shoes: 'clogs', fx: 'nofx', skin: 1 }, { cut: 'bowl', face: 'freckles', shoes: 'slides', fx: 'petals', skin: 0 }],
    },
    lantern_crew: {
      name: 'Lantern Crew', short: 'LTN', tagline: 'LIGHT IT UP', desc: 'Hang the lanterns, then hang you out to dry.',
      kit: { shirt: '#ff7a1f', shirtDark: '#a3420c', shorts: '#2d0f1e', accent: '#3ff6ff', hair: ['#ff3d5a', '#1a1216'] },
      stats: { speed: 1.04, power: 1.0, pass: 1.0, tackle: 1.02, dribble: 1.04, accuracy: 1.0 },
      coreWeights: { trickster: 2.5, runner: 1.5 }, aiStyle: { light: 1.1, hard: 1.1 },
      players: ['WICK', 'EMBER'],
      looks: [{ cut: 'bandana', face: 'warpaint', shoes: 'cleats', fx: 'nofx', skin: 2 }, { cut: 'headphones', face: 'goldtooth', shoes: 'neonkick', fx: 'confetti', skin: 1 }],
    },
    night_dragons: {
      name: 'Night Dragons', short: 'DRG', tagline: 'BOSS · FIRE BREATHERS', desc: 'The market bows when the dragons come to play.',
      kit: { shirt: '#b3122e', shirtDark: '#5e0716', shorts: '#0f3d2e', accent: '#3fe09a', hair: ['#1a1216', '#ff3d3d'] },
      stats: { speed: 1.05, power: 1.06, pass: 1.03, tackle: 1.05, dribble: 1.05, accuracy: 1.05 },
      coreWeights: { striker: 2.5, launcher: 2 }, aiStyle: { light: 1.2, hard: 1.4 },
      players: ['RYU', 'KIRIN'],
      looks: [{ cut: 'helmet', face: 'ninja', shoes: 'camo', fx: 'smoke', skin: 1 }, { cut: 'flamehair', face: 'eyepatch', shoes: 'rocket', fx: 'fire', skin: 2 }],
    },

    /* ---------- AREA 6 · HARBOR DOCKS ---------- */
    crane_crushers: {
      name: 'Crane Crushers', short: 'CRN', tagline: 'HEAVY LIFTING', desc: 'Dock workers who lift containers for a warm-up.',
      kit: { shirt: '#ffd23f', shirtDark: '#a3861a', shorts: '#1a1a1a', accent: '#1a1a1a', hair: ['#3b2415', '#1a1216'] },
      stats: { speed: 1.02, power: 1.12, pass: 1.02, tackle: 1.1, dribble: 1.0, accuracy: 1.04 },
      coreWeights: { iron: 2.5, launcher: 2 }, aiStyle: { light: 1.3, hard: 1.5 },
      players: ['HOIST', 'GANTRY'],
      looks: [{ cut: 'helmet', face: 'beard', shoes: 'boots', fx: 'dust', skin: 3 }, { cut: 'cap', face: 'scar', shoes: 'hightop', fx: 'nofx', skin: 1 }],
    },
    rust_buckets: {
      name: 'Rust Buckets', short: 'RST', tagline: 'SALTY', desc: 'Old sailors with rusty knees and zero mercy.',
      kit: { shirt: '#b8452f', shirtDark: '#6b2416', shorts: '#1f5f66', accent: '#7fe7ff', hair: ['#e8ecf5', '#8a4b22'] },
      stats: { speed: 1.06, power: 1.05, pass: 1.06, tackle: 1.05, dribble: 1.06, accuracy: 1.06 },
      coreWeights: { chaos: 2, trickster: 2 }, aiStyle: { light: 1.1, hard: 1.2 },
      players: ['BARNACLE', 'ANCHOR'],
      looks: [{ cut: 'bucket', face: 'eyepatch', shoes: 'rainboot', fx: 'nofx', skin: 2 }, { cut: 'mohawk', face: 'cyborg', shoes: 'mismatch', fx: 'smoke', skin: 0 }],
    },
    iron_harbor: {
      name: 'Iron Harbor', short: 'IRN', tagline: 'BOSS · STEEL WALL', desc: 'The harbor\'s iron fist. Nothing gets past the dock gates.',
      kit: { shirt: '#7c8a96', shirtDark: '#3f4a54', shorts: '#b3122e', accent: '#ff3d3d', hair: ['#d9e2ec', '#1a1216'] },
      stats: { speed: 1.08, power: 1.12, pass: 1.08, tackle: 1.14, dribble: 1.06, accuracy: 1.08 },
      coreWeights: { iron: 3, brawler: 2 }, aiStyle: { light: 1.4, hard: 1.5 },
      players: ['BULWARK', 'RIVET'],
      looks: [{ cut: 'viking', face: 'skull', shoes: 'iceboot', fx: 'frost', skin: 4 }, { cut: 'helmet', face: 'cyborg', shoes: 'rocket', fx: 'lightning', skin: 2 }],
    },

    /* ---------- AREA 7 · UNDERGROUND CAGE ---------- */
    chain_gang: {
      name: 'Chain Gang', short: 'CHN', tagline: 'LOCKED IN', desc: 'Nobody knows how they got out. Nobody asks.',
      kit: { shirt: '#ff7a1f', shirtDark: '#a3420c', shorts: '#2a2a2a', accent: '#c7ccd6', hair: ['#1a1216', '#4a4f63'] },
      stats: { speed: 1.08, power: 1.12, pass: 1.06, tackle: 1.14, dribble: 1.06, accuracy: 1.06 },
      coreWeights: { brawler: 3, launcher: 2 }, aiStyle: { light: 1.6, hard: 1.5 },
      players: ['SHACKLE', 'LOCKJAW'],
      looks: [{ cut: 'buzz', face: 'scar', shoes: 'boots', fx: 'smoke', skin: 3 }, { cut: 'bandana', face: 'eyepatch', shoes: 'hightop', fx: 'nofx', skin: 2 }],
    },
    iron_knuckles: {
      name: 'Iron Knuckles', short: 'KNK', tagline: 'BARE FISTS', desc: 'Underground boxers who took up football for more targets.',
      kit: { shirt: '#2a2a30', shirtDark: '#141418', shorts: '#b3122e', accent: '#ff3d3d', hair: ['#1a1216', '#8a4b22'] },
      stats: { speed: 1.1, power: 1.14, pass: 1.04, tackle: 1.16, dribble: 1.08, accuracy: 1.08 },
      coreWeights: { brawler: 3, iron: 2 }, aiStyle: { light: 1.8, hard: 1.3 },
      players: ['BRUISER', 'KNUCKLES'],
      looks: [{ cut: 'mohawk', face: 'warpaint', shoes: 'camo', fx: 'dust', skin: 1 }, { cut: 'viking', face: 'ninja', shoes: 'boots', fx: 'smoke', skin: 4 }],
    },
    the_warden: {
      name: 'The Warden', short: 'WRD', tagline: 'BOSS · RUNS THE CAGE', desc: 'He holds the keys to the cage. Win, and you walk out.',
      kit: { shirt: '#3a3f48', shirtDark: '#1c1f24', shorts: '#1c1f24', accent: '#ffd23f', hair: ['#e8ecf5', '#1a1216'] },
      stats: { speed: 1.12, power: 1.18, pass: 1.1, tackle: 1.2, dribble: 1.1, accuracy: 1.12 },
      coreWeights: { iron: 3, launcher: 2.5 }, aiStyle: { light: 1.7, hard: 1.7 },
      players: ['WARDEN', 'KEYS'],
      looks: [{ cut: 'helmet', face: 'skull', shoes: 'iceboot', fx: 'lightning', skin: 2 }, { cut: 'cowboy', face: 'cyborg', shoes: 'rocket', fx: 'shadow', skin: 3 }],
    },

    /* ---------- AREA 8 · CITY PLAZA CUP ---------- */
    metro_express: {
      name: 'Metro Express', short: 'MTR', tagline: 'NEXT STOP: GOAL', desc: 'Commuters who train on the subway platform. Always on time.',
      kit: { shirt: '#1fb89a', shirtDark: '#0f6b5a', shorts: '#f2f2f2', accent: '#ffe14f', hair: ['#1a1216', '#f2d16b'] },
      stats: { speed: 1.14, power: 1.08, pass: 1.14, tackle: 1.08, dribble: 1.12, accuracy: 1.12 },
      coreWeights: { runner: 3, playmaker: 2 }, aiStyle: { light: 0.9, hard: 1.0 },
      players: ['EXPRESS', 'TRANSIT'],
      looks: [{ cut: 'cap', face: 'shades', shoes: 'neonkick', fx: 'neon', skin: 0 }, { cut: 'afro', face: 'monocle', shoes: 'rollers', fx: 'lightning', skin: 3 }],
    },
    downtown_stars: {
      name: 'Downtown Stars', short: 'DTS', tagline: 'SHOWTIME', desc: 'Influencers with a million followers and a lot of skill moves.',
      kit: { shirt: '#ff3d5a', shirtDark: '#a31a35', shorts: '#1a1a2a', accent: '#ffffff', hair: ['#f2d16b', '#ff3d5a'] },
      stats: { speed: 1.12, power: 1.12, pass: 1.1, tackle: 1.1, dribble: 1.16, accuracy: 1.12 },
      coreWeights: { trickster: 3, striker: 2 }, aiStyle: { light: 1.0, hard: 1.1 },
      players: ['STARR', 'NOVA'],
      looks: [{ cut: 'mohawk', face: 'goldtooth', shoes: 'rainbowkick', fx: 'confetti', skin: 1 }, { cut: 'flamehair', face: 'shades', shoes: 'goldboot', fx: 'fire', skin: 0 }],
    },
    city_champions: {
      name: 'City Champions', short: 'CTY', tagline: 'BOSS · DEFENDING CHAMPS', desc: 'Three plaza cups in a row. They want a fourth.',
      kit: { shirt: '#2f5fd6', shirtDark: '#1a3480', shorts: '#ffd23f', accent: '#ffd23f', hair: ['#1a1216', '#e8ecf5'] },
      stats: { speed: 1.16, power: 1.16, pass: 1.16, tackle: 1.16, dribble: 1.14, accuracy: 1.16 },
      coreWeights: { striker: 2.5, playmaker: 2, iron: 1.5 }, aiStyle: { light: 1.2, hard: 1.3 },
      players: ['MAYOR', 'SKYLINE'],
      looks: [{ cut: 'halo', face: 'visor', shoes: 'iceboot', fx: 'frost', skin: 4 }, { cut: 'afro', face: 'skull', shoes: 'rocket', fx: 'galaxy', skin: 2 }],
    },

    /* ---------- AREA 9 · CYBER ARENA ---------- */
    glitch_squad: {
      name: 'Glitch Squad', short: 'GLT', tagline: 'ERROR 404', desc: 'Hackers who play like the rules are just suggestions.',
      kit: { shirt: '#ff3fb4', shirtDark: '#a31a72', shorts: '#07051a', accent: '#3ff6ff', hair: ['#3ff6ff', '#9d7bff'] },
      stats: { speed: 1.12, power: 1.06, pass: 1.1, tackle: 1.05, dribble: 1.14, accuracy: 1.1 },
      coreWeights: { trickster: 3, chaos: 2 }, aiStyle: { light: 1.0, hard: 1.1 },
      players: ['BYTE', 'PIXEL'],
      looks: [{ cut: 'headphones', face: 'visor', shoes: 'neonkick', fx: 'neon', skin: 0 }, { cut: 'mohawk', face: 'visor', shoes: 'rainbowkick', fx: 'rainbow', skin: 4 }],
    },
    chrome_wolves: {
      name: 'Chrome Wolves', short: 'CHR', tagline: 'PACK HUNTERS', desc: 'Silver, fast and always hunting in pairs.',
      kit: { shirt: '#c7ccd6', shirtDark: '#7c8290', shorts: '#1b2a4a', accent: '#7fe7ff', hair: ['#e8ecf5', '#1a1216'] },
      stats: { speed: 1.14, power: 1.1, pass: 1.08, tackle: 1.12, dribble: 1.1, accuracy: 1.1 },
      coreWeights: { runner: 3, brawler: 2 }, aiStyle: { light: 1.3, hard: 1.3 },
      players: ['FANG', 'HOWL'],
      looks: [{ cut: 'helmet', face: 'ninja', shoes: 'iceboot', fx: 'frost', skin: 1 }, { cut: 'longhair', face: 'cyborg', shoes: 'rocket', fx: 'lightning', skin: 3 }],
    },
    apex_legion: {
      name: 'Apex Legion', short: 'APX', tagline: 'BOSS · PRO CHAMPIONS', desc: 'Champions of the pro circuit. Beat them and the World Stage awaits.',
      kit: { shirt: '#14101f', shirtDark: '#07050d', shorts: '#9d7bff', accent: '#ffd23f', hair: ['#ffd23f', '#e8ecf5'] },
      stats: { speed: 1.16, power: 1.15, pass: 1.14, tackle: 1.15, dribble: 1.14, accuracy: 1.14 },
      coreWeights: { striker: 3, launcher: 2, trickster: 2 }, aiStyle: { light: 1.4, hard: 1.5 },
      players: ['OMEGA', 'ZENITH'],
      looks: [{ cut: 'halo', face: 'skull', shoes: 'goldboot', fx: 'galaxy', skin: 3 }, { cut: 'crown', face: 'lasereyes', shoes: 'flame', fx: 'aura', skin: 1 }],
    },

    /* ---------- AREA 10 · WORLD STAGE (đồ HUYỀN THOẠI / THẦN THOẠI) ---------- */
    golden_eagles: {
      name: 'Golden Eagles', short: 'EGL', tagline: 'SOAR HIGH', desc: 'Champions of three continents. Their wings are made of gold.',
      kit: { shirt: '#e0b030', shirtDark: '#8a6a10', shorts: '#1a1a1a', accent: '#ffffff', hair: ['#f2d16b', '#1a1216'] },
      stats: { speed: 1.18, power: 1.16, pass: 1.18, tackle: 1.14, dribble: 1.18, accuracy: 1.18 },
      coreWeights: { runner: 2.5, striker: 2.5 }, aiStyle: { light: 1.1, hard: 1.2 },
      players: ['TALON', 'AQUILA'],
      looks: [{ cut: 'halo', face: 'visor', shoes: 'goldboot', fx: 'galaxy', skin: 0 }, { cut: 'flamehair', face: 'lasereyes', shoes: 'goldboot', fx: 'fire', skin: 3 }],
    },
    royal_lions: {
      name: 'Royal Lions', short: 'LNS', tagline: 'PRIDE OF KINGS', desc: 'Royalty of the world game. They roar, you shake.',
      kit: { shirt: '#9a1030', shirtDark: '#4f0818', shorts: '#ffd23f', accent: '#ffd23f', hair: ['#8a4b22', '#f2d16b'] },
      stats: { speed: 1.18, power: 1.2, pass: 1.16, tackle: 1.2, dribble: 1.16, accuracy: 1.18 },
      coreWeights: { brawler: 2.5, launcher: 2.5 }, aiStyle: { light: 1.5, hard: 1.5 },
      players: ['LEO', 'REGAL'],
      looks: [{ cut: 'viking', face: 'skull', shoes: 'flame', fx: 'shadow', skin: 2 }, { cut: 'crown', face: 'monocle', shoes: 'rocket', fx: 'aura', skin: 1 }],
    },
    the_legends: {
      name: 'The Legends', short: 'LGD', tagline: 'BOSS · IMMORTALS', desc: 'Every great who ever played the street game, on one team. The final boss.',
      kit: { shirt: '#f7f2e0', shirtDark: '#c9b060', shorts: '#1a1a1a', accent: '#ffd23f', hair: ['#e8ecf5', '#ffd23f'] },
      stats: { speed: 1.22, power: 1.22, pass: 1.22, tackle: 1.22, dribble: 1.22, accuracy: 1.22 },
      coreWeights: { striker: 3, trickster: 2, launcher: 2 }, aiStyle: { light: 1.5, hard: 1.6 },
      players: ['MAESTRO', 'GOAT'],
      looks: [{ cut: 'halo', face: 'lasereyes', shoes: 'flame', fx: 'aura', skin: 3 }, { cut: 'crown', face: 'lasereyes', shoes: 'goldboot', fx: 'aura', skin: 0 }],
    },
  },
};

// đội Main Path + đội riêng của người chơi dùng chung danh sách đội của trận (không thêm vào teams.order)
(function () {
  const MP = SFC_CONFIG.mainPath, list = SFC_CONFIG.teams.list;
  Object.assign(list, MP.teams);
  const P = MP.playerTeam;
  list[P.id] = { name: P.nameFormat.replace('{name}', 'PLAYER'), short: P.short, tagline: P.tagline, desc: P.desc, kit: P.kit, stats: P.stats, coreWeights: P.coreWeights, aiStyle: P.aiStyle, players: P.players };
})();
