/* =========================================================
 * ELITES CONFIG — đội ELITE của GOAT PATH (docs/RUN_DESIGN.md mục "Đội Elite", user duyệt 2026-10-27).
 * Pool Elite riêng từng act: run.acts[i].elite (config/run.config.js). Matchday giữ các đội Story cũ.
 *   run.elites[đội]: dữ liệu đối thủ như 1 vòng Story (SFC.Run.opp): arena · signature (Core đặc trưng) · mod (luật trận) · barks (câu nói)
 *   elites.teams: đội (khuôn giống mainPath.teams) -> gộp vào teams.list
 *   elites.mods: số liệu luật trận (src/systems/matchmods.js) -> gộp vào stories.mods (MatchMods đọc chung 1 chỗ)
 * Luật chỉ đánh vào đội bạn, không lấy / cấm Core (user 2026-10-19). Thời gian giây, khoảng cách px, tốc độ px/s.
 * ========================================================= */
window.SFC_CONFIG = window.SFC_CONFIG || {};

SFC_CONFIG.run.elites = {
  rope_skippers: {
    arena: 'school', signature: 'quick_feet', mod: 'jumprope',
    barks: {
      kickoff: ['Ready? Jump!', 'Keep the beat!'],
      goal: ['Never missed a beat!', 'One, two, GOAL!'],
      conceded: ['Off rhythm...', 'Again, from the top!'],
      mod: ['JUMP!', 'Three, two, one!'],
    },
  },
  wash_aunties: {
    arena: 'village', signature: 'bulldozer', mod: 'hose',
    barks: {
      kickoff: ['Wash day, kids!', 'Out of the way!'],
      goal: ['Squeaky clean!', 'Spotless!'],
      conceded: ['My clean floor!', 'Now it is muddy!'],
      mod: ['SPLASH!', 'Rinse and repeat!'],
    },
  },
  tower_guards: {
    arena: 'rooftop', signature: 'emp_trap', mod: 'searchlight',
    barks: {
      kickoff: ['Badge check!', 'Night shift starts now.'],
      goal: ['Case closed.', 'Caught on camera!'],
      conceded: ['Who let them in?', 'Call for backup!'],
      mod: ['FREEZE!', 'Light on you!'],
    },
  },
  neon_arcade: {
    arena: 'cyber', signature: 'light_cycle', mod: 'neon',
    barks: {
      kickoff: ['Player two has joined!', 'Insert coin!'],
      goal: ['HIGH SCORE!', 'Combo!'],
      conceded: ['Lag!', 'That was a glitch!'],
      mod: ['Follow the arrows!', 'LEVEL UP!'],
    },
  },
  domino_club: {
    arena: 'domino_hall', signature: 'wall_slam', mod: 'domino',
    barks: {
      kickoff: ['Your move, kid.', 'Sixty years of practice.'],
      goal: ['Double six!', 'Domino!'],
      conceded: ['Bad tile...', 'Shuffle again.'],
      mod: ['CLICK CLACK!', 'Watch them fall!'],
    },
  },
  taichi_masters: {
    arena: 'village', signature: 'witch_time', mod: 'taichi',
    barks: {
      kickoff: ['Breathe in...', 'Slow is fast.'],
      goal: ['Like water.', 'No hurry.'],
      conceded: ['Hmm. Interesting.', 'Patience...'],
      mod: ['Slooow down.', 'Be the river.'],
    },
  },
};

SFC_CONFIG.elites = {
  /* đội Elite (gộp vào teams.list như đội Main Path / Story) */
  teams: {
    rope_skippers: {
      name: 'Rope Skippers', short: 'RSK', tagline: 'ELITE · NEVER MISS A BEAT', desc: 'The school jump rope champions. They count every beat, and they never trip.',
      kit: { shirt: '#ff6fb5', shirtDark: '#b0377a', shorts: '#ffffff', accent: '#ffe14f', hair: ['#1a1216', '#3b2415', '#ffe14f'] },
      stats: { speed: 1.04, power: 0.9, pass: 0.98, tackle: 0.92, dribble: 1.04, accuracy: 0.96 },
      coreWeights: { trickster: 2.5, runner: 1.5 }, aiStyle: { light: 0.9, hard: 0.8 },
      players: ['SKIP', 'HOP', 'CAPTAIN ROPE'],
      looks: [{ cut: 'bun', face: 'blush', shoes: 'canvas', fx: 'confetti', skin: 1 }, { cut: 'longhair', face: 'nerd', shoes: 'hightop', fx: 'notes', skin: 2 }, { cut: 'bun', face: 'shades', shoes: 'rainbowkick', fx: 'rainbow', skin: 0 }],
    },
    wash_aunties: {
      name: 'Wash Day Aunties', short: 'WSH', tagline: 'ELITE · CLEAN SWEEP', desc: 'They hose down the whole street every morning. Today, the street is you.',
      kit: { shirt: '#3fb8ff', shirtDark: '#1a6aa8', shorts: '#f3ead7', accent: '#ffffff', hair: ['#9aa0a8', '#1a1216', '#3b2415'] },
      stats: { speed: 0.92, power: 1.04, pass: 0.94, tackle: 1.06, dribble: 0.9, accuracy: 0.96 },
      coreWeights: { iron: 2.5, brawler: 1.5 }, aiStyle: { light: 1.3, hard: 1.2 },
      players: ['AUNTIE THU', 'AUNTIE NGA', 'AUNTIE BICH'],
      looks: [{ cut: 'bun', face: 'blush', shoes: 'slides', fx: 'frost', skin: 2 }, { cut: 'bucket', face: 'nerd', shoes: 'clogs', fx: 'nofx', skin: 1 }, { cut: 'bun', face: 'goldtooth', shoes: 'clogs', fx: 'frost', skin: 3 }],
    },
    tower_guards: {
      name: 'Tower Guards', short: 'TWR', tagline: 'ELITE · NIGHT SHIFT', desc: 'They guard the tallest tower in the city. Nothing moves on their roof without the light finding it.',
      kit: { shirt: '#4a6fd0', shirtDark: '#26407a', shorts: '#1a1c26', accent: '#fff3b0', hair: ['#1a1216', '#3b2415'] },
      stats: { speed: 1.02, power: 1.08, pass: 1.02, tackle: 1.1, dribble: 0.98, accuracy: 1.04 },
      coreWeights: { iron: 3, playmaker: 1.5 }, aiStyle: { light: 1.3, hard: 1.3 },
      players: ['FLASHLIGHT', 'NIGHTSHIFT', 'CHIEF BEAM'],
      looks: [{ cut: 'cap', face: 'shades', shoes: 'boots', fx: 'nofx', skin: 3 }, { cut: 'helmet', face: 'mustache', shoes: 'boots', fx: 'nofx', skin: 1 }, { cut: 'cap', face: 'visor', shoes: 'cleats', fx: 'lightning', skin: 2 }],
    },
    neon_arcade: {
      name: 'Neon Arcade', short: 'ARC', tagline: 'ELITE · INSERT COIN', desc: 'They live inside the arcade. Every pitch is just another level to them.',
      kit: { shirt: '#00e5ff', shirtDark: '#0088aa', shorts: '#2a1050', accent: '#ff3fb4', hair: ['#ff3fb4', '#9d7bff', '#1a1216'] },
      stats: { speed: 1.1, power: 1.0, pass: 1.06, tackle: 1.0, dribble: 1.1, accuracy: 1.04 },
      coreWeights: { runner: 2.5, chaos: 1.5 }, aiStyle: { light: 1.0, hard: 1.0 },
      players: ['PIXEL', 'COMBO', 'HIGH SCORE'],
      looks: [{ cut: 'mohawk', face: 'visor', shoes: 'neonkick', fx: 'neon', skin: 2 }, { cut: 'beanie', face: 'lasereyes', shoes: 'hightop', fx: 'neon', skin: 0 }, { cut: 'afro', face: 'visor', shoes: 'rainbowkick', fx: 'galaxy', skin: 4 }],
    },
    domino_club: {
      name: 'Domino Club', short: 'DOM', tagline: 'ELITE · CLICK CLACK', desc: 'Old men from the plaza with sixty years of dominoes. They always know which tile falls next.',
      kit: { shirt: '#2f9d6b', shirtDark: '#1a5c3e', shorts: '#fdf6e3', accent: '#fdf6e3', hair: ['#e8ecf5', '#9aa0a8'] },
      stats: { speed: 1.04, power: 1.16, pass: 1.2, tackle: 1.14, dribble: 1.08, accuracy: 1.2 },
      coreWeights: { launcher: 2.5, playmaker: 2 }, aiStyle: { light: 1.2, hard: 1.4 },
      players: ['UNCLE DOT', 'DOUBLE SIX', 'THE BONEYARD'],
      looks: [{ cut: 'cowboy', face: 'mustache', shoes: 'slides', fx: 'dust', skin: 1 }, { cut: 'buzz', face: 'nerd', shoes: 'clogs', fx: 'coins', skin: 3 }, { cut: 'bucket', face: 'goldtooth', shoes: 'goldboot', fx: 'aura', skin: 0 }],
    },
    taichi_masters: {
      name: 'Tai Chi Masters', short: 'TAI', tagline: 'ELITE · SLOW IS FAST', desc: 'Every dawn in the park, slow and silent. Rush them and the whole world slows down with them.',
      kit: { shirt: '#f7f7f2', shirtDark: '#b9b9b0', shorts: '#1a1a1a', accent: '#d8402a', hair: ['#e8ecf5', '#c7ccd6'] },
      stats: { speed: 1.08, power: 1.18, pass: 1.22, tackle: 1.16, dribble: 1.16, accuracy: 1.2 },
      coreWeights: { trickster: 2.5, iron: 2 }, aiStyle: { light: 1.1, hard: 1.5 },
      players: ['MASTER WIND', 'MASTER STONE', 'GRANDMASTER LI'],
      looks: [{ cut: 'bun', face: 'beard', shoes: 'slides', fx: 'leaves', skin: 0 }, { cut: 'buzz', face: 'mustache', shoes: 'slides', fx: 'petals', skin: 2 }, { cut: 'longhair', face: 'beard', shoes: 'goldboot', fx: 'aura', skin: 1 }],
    },
  },

  /* LUẬT TRẬN của đội Elite (cùng khuôn stories.mods: first = giây tới lượt đầu, every = [ít nhất, nhiều nhất] giữa 2 lượt,
   * trailing = nhanh hơn x lần khi đội chủ luật bị dẫn) */
  mods: {
    // Rope Skippers: 1 sợi dây khổng lồ căng ngang hết sân (cong cánh cung, 2 đầu ở tay 2 cô bé đứng 2 mép trái / phải, cao hand px), quay như nhảy dây.
    // Đếm count nhịp (3-2-1, mỗi nhịp countBeat giây, dây nằm chờ ở mép), rồi quay turns vòng, mỗi vòng turn giây (bị dẫn: turnTrailing):
    // ground phần đầu vòng dây quét sát đất qua hết bề ngang sân, phần còn lại vung lên cao (tối đa lift px) vòng qua đầu về mép xuất phát.
    // Dây quét qua ai đội bạn không đang lướt = vấp ngã (trơn té stun giây, trượt slide px/s, rơi bóng). Rope Skippers tự bật nhảy qua (hop px/s).
    // Đồng đội AI tự lướt đúng lúc với xác suất aiJump
    jumprope: {
      name: 'DOUBLE DUTCH', hint: 'The giant rope sweeps the whole pitch. Dash to jump it',
      first: 4, every: [7, 10], trailing: 1.4, count: 3, countBeat: 0.6, turns: 2, turn: 1.5, turnTrailing: 1.2, ground: 0.45, lift: 110, hand: 14,
      stun: 0.9, slide: 90, hop: 120, aiJump: 0.55, color: '#ff6fb5',
    },
    // Wash Day Aunties: 1 bà đứng ngoài mép trên (cột x gần bóng) cầm vòi, báo trước warn giây (vạch cung tia nước sẽ quét),
    // rồi tia nước dài range px quét từ góc a0 tới a1 (cung arc độ) trong sweep giây. Tia trúng đội bạn (cách tia width px): bị đẩy push px/s
    // theo hướng tia + choáng stun giây + rơi bóng (lướt né được, mỗi người trúng tối đa 1 lần mỗi lượt). Bóng lỏng trong tia bị đẩy ballPush px/s².
    // Tia quét tới đâu để lại vũng nước tới đó, rải khắp hình quạt (từ puddleFrom px tới hết tầm, các ô cách nhau puddleGap px, giữ ngẫu nhiên
    // puddleKeep phần để chừa lối đi, bán kính puddleR),
    // nằm puddleLife giây: đội bạn chạy nhanh hơn slipSpeed qua vũng = trơn té
    hose: {
      name: 'WASH DAY', hint: 'Dash through the spray, walk slowly through the puddles',
      first: 4, every: [6, 9], trailing: 1.4, warn: 1.1, sweep: 1.4, range: 250, arc: 70, width: 9, push: 260, stun: 0.5, ballPush: 420,
      puddleFrom: 40, puddleGap: 38, puddleKeep: 0.6, puddleR: 14, puddleLife: 6, slipSpeed: 70, slipStun: 0.8, slide: 150, color: '#7fd8ff',
    },
    // Neon Arcade: tiles ô mũi tên neon (rộng w x cao h px) xếp lưới giữa 2 vòng cấm. Đội bạn đứng trong ô bị đẩy push px/s theo mũi tên,
    // bóng lỏng trong ô tăng tốc ballPush px/s²; Neon Arcade chạy xuôi mũi tên nhanh x boost. Mỗi every giây: nhấp nháy warn giây rồi cả bảng
    // đổi hướng (bị dẫn: toYou phần mũi tên chỉ về khung thành đội bạn)
    neon: {
      name: 'NEON ARROWS', hint: 'Arrows push you and the ball. They switch soon after flashing',
      first: 8, every: [8, 11], trailing: 1.3, warn: 1.3, cols: 3, rows: 2, w: 74, h: 56, push: 75, ballPush: 220, boost: 1.25, toYou: 0.7,
      colors: ['#00e5ff', '#ff3fb4', '#9dff3d', '#ffd23f'],
    },
    // Domino Club: dựng hàng domino khổng lồ (cách nhau gap px) theo đường thẳng dài len px cắt qua gần bóng, mọc lên trong rise giây,
    // đứng stand giây (đầu hàng sắp bị đẩy nhấp nháy), rồi đổ dây chuyền speed px/s. Mỗi quân đổ trúng đội bạn cách r px: choáng stun giây,
    // văng knock px/s theo chiều đổ, rơi bóng (lướt né được). Quân đã đổ nằm lie giây. Lúc đứng: quân domino chắn người (mọi đội).
    // Bị dẫn: 2 hàng chéo nhau
    domino: {
      name: 'DOMINOES', hint: 'One push and the whole line falls. Get out of its way',
      first: 5, every: [7, 10], trailing: 1.4, len: 240, gap: 15, rise: 0.4, stand: 1.6, speed: 230, r: 12, stun: 1.0, knock: 180, lie: 1.2,
      color: '#fdf6e3',
    },
    // Tai Chi Masters (user 2026-10-27, thay SLOW HANDS): 1 cụ đứng tấn gồng charge giây, bàn tay khí khổng lồ mọc sau lưng + vạch đường chưởng
    // dài len x rộng width px nhắm người đội bạn gần cụ nhất (khoá hướng). Rồi bàn tay lao dọc vạch trong travel giây: đội bạn trong vạch bị đẩy knock px/s, bật lên
    // launch, choáng stun giây; bóng lỏng trong vạch bay theo ballSpeed px/s. Lướt né được. Đang gồng: đòn nhẹ không lay (ROOTED!), đòn nặng = huỷ.
    // Bị dẫn: 2 cụ cùng lúc
    taichi: {
      name: 'QI PALM', hint: 'A giant palm charges behind a master. Get out of its path, or heavy-hit him',
      first: 5, every: [6, 9], trailing: 1.4, charge: 1.4, travel: 0.32, len: 270, width: 54, knock: 420, launch: 170, stun: 1.0, ballSpeed: 460,
      color: '#ffe9a8',
    },
  },
};

// đội Elite dùng chung danh sách đội của trận · luật trận dùng chung bảng stories.mods
Object.assign(SFC_CONFIG.teams.list, SFC_CONFIG.elites.teams);
Object.assign(SFC_CONFIG.stories.mods, SFC_CONFIG.elites.mods);
