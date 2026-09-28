/* =========================================================
 * ARENAS CONFIG — giao diện sân (map) theo từng Area của Main Path. Vẽ ở src/render/background.js.
 * Game opts.arena = id ở đây (không có / không tồn tại -> 'street').
 * Mỗi arena ghép từ các lớp:
 *   floor    : mặt sân — style asphalt (ô nhựa đường / xi măng / cao su) · tiles (lát gạch, có ron) · plates (thép tấm, đinh tán) ·
 *              grid (sàn tối, lưới neon) · dirt (đất nện + mảng cỏ) · turf (cỏ sọc; checker = cắt cỏ ô bàn cờ)
 *   wall     : tường trên (mặt đứng) — style brick (gạch) · container (tôn sóng nhiều màu) · panel (tấm kim loại, khe neon) ·
 *              bamboo (hàng rào tre) · plaster (tường vôi + bảng đen) · cage (lưới thép + cột) · ads (bảng quảng cáo) · led (bảng LED)
 *   backdrop : dải phía trên tường — style fence (lưới B40) · skyline (nhà cao tầng đêm) · lanterns (dây đèn lồng) ·
 *              harbor (cần cẩu + biển) · screens (màn LED) · fields (ruộng lúa + núi, hoàng hôn) · school (dãy lớp học) ·
 *              dark (bóng tối, chỉ thấy khán giả) · stands (khán đài tạm + màn hình) · stadium (khán đài lớn + mái + màn hình)
 *   stands   : (tuỳ chọn) khán đài ở 2 bên + dưới sân (vùng tối ngoài tường) — { color: [2 màu bậc ghế], rail } — nơi khán giả đứng
 *   lights   : style street (đèn đường 2 góc) · neon (dải neon trên đỉnh tường) · sun (nắng xiên) · spot (1 đèn rọi giữa, tối xung quanh) ·
 *              flood (cột đèn pha: towers = 2 | 4) · none
 *   graffiti : chữ trên tường; {t0} / {t1} = tên viết tắt 2 đội (tags rỗng = không vẽ)
 *   props    : đồ vật ngoài mép sân: { t: loại, x: tỉ lệ bề ngang sân (0..1), dx, dy: lệch px (dy tính từ mép dưới sân) }
 *              loại: tire · can · cone · crate · barrel · lantern · ac · bollard · holo · plant · hay · sack · chicken · hoop · bag ·
 *              firebarrel · camera · trophy
 *   crowd    : (tuỳ chọn) khán giả CHUYỂN ĐỘNG, vẽ mỗi khung hình (src/render/crowd.js):
 *              sound: độ ồn của tiếng khán giả 0..1 (config/game.config.js -> audio.crowd) ·
 *              regions: top (trên tường) · sides (2 bên) · bottom (hàng đầu, quay lưng) · rows: số hàng phía trên · density 0..1 ·
 *              span: full | field (hàng trên chỉ trải theo bề ngang sân) · colors: màu áo khán giả · teamColors: tỉ lệ fan mặc áo đội
 *              (nửa trái đội 0, nửa phải đội 1) · cheer: độ náo nhiệt (0..1) · flashes: flash máy ảnh / giây ·
 *              scarves: tỉ lệ fan giơ khăn khi ăn mừng · glow: [màu que phát sáng] · fireworks: pháo hoa khi có bàn thắng ·
 *              shade: phủ tối vùng khán giả 0..1 (khán giả chìm trong bóng tối) ·
 *              hat: { shape: cone (nón lá) | cap (mũ lưỡi trai) | hardhat (mũ bảo hộ), chance: tỉ lệ đội mũ, colors }
 * Màu viết dạng '#rrggbb' hoặc 'rgba(...)'; glow viết 'r,g,b' (không có ngoặc) để pha độ trong.
 * ========================================================= */
window.SFC_CONFIG = window.SFC_CONFIG || {};

SFC_CONFIG.arenas = {
  // Sân mặc định (Luyện tập / Online / menu) — đường phố, lác đác người xem sau hàng rào
  street: {
    void: '#0d0a10',
    floor: { style: 'asphalt', colors: ['#3b3a45', '#373640', '#403f4b', '#35343d'], speckD: '#2c2b33', speckL: '#4a4956', crack: '#26252c', cracks: 14, paint: 0.07 },
    line: 'rgba(236,228,200,0.78)',
    logo: 'CHAOS',
    wall: { style: 'brick', colors: ['#5a3a3c', '#633f40', '#523537', '#6b4644'], mortar: '#2a1b20', w: 12, h: 6, edge: '#1a1116' },
    rim: { base: '#2b1f26', light: '#3d2c33', dark: '#33252c' },
    backdrop: { style: 'fence', bg: '#141018', wire: 'rgba(160,165,180,0.45)', rail: '#6f7384' },
    lights: { style: 'street', pole: '#2d2d36', lamp: '#ffe9a8', glow: '255,220,140' },
    graffiti: { tags: ['STREET', 'CHAOS', '{t0}', '{t1}', 'NO RULES', 'FC'], colors: null, splat: true },
    net: 'rgba(230,230,240,0.35)', hole: '#17141c',
    props: [{ t: 'tire', x: 0, dx: -10, dy: 9 }, { t: 'can', x: 1, dx: 8, dy: 6 }, { t: 'cone', x: 0.5, dx: -60, dy: 10 }, { t: 'cone', x: 0.5, dx: 60, dy: 10 }],
    crowd: { sound: 0.22, regions: ['top'], rows: 1, density: 0.16, span: 'field', colors: ['#5a4a3a', '#3a3f48', '#6a3a5a', '#2a3a4a', '#6a6a5a'], teamColors: 0.35, cheer: 0.6, flashes: 0.1, hat: { shape: 'cap', chance: 0.3, colors: ['#1a1a1a', '#d7263d', '#2fb8ff'] } },
  },

  // AREA 2 — Hẻm Sau: nhựa đường nứt nẻ, gạch cũ màu cam đất, đèn vàng
  alley: {
    void: '#0e0a0a',
    floor: { style: 'asphalt', colors: ['#44403c', '#3f3b37', '#48443f', '#3b3834'], speckD: '#302d2a', speckL: '#57524b', crack: '#2b2825', cracks: 22, paint: 0.06 },
    line: 'rgba(240,226,190,0.72)',
    logo: 'ALLEY',
    wall: { style: 'brick', colors: ['#7a4a33', '#6d412c', '#834f36', '#5f3a28'], mortar: '#2e1c14', w: 12, h: 6, edge: '#1c110c' },
    rim: { base: '#2e221b', light: '#433126', dark: '#372920' },
    backdrop: { style: 'fence', bg: '#16100d', wire: 'rgba(170,160,140,0.4)', rail: '#7a6f5c' },
    lights: { style: 'street', pole: '#2f2a26', lamp: '#ffd98a', glow: '255,200,110' },
    graffiti: { tags: ['ALLEY', '{t0}', 'RAT RACE', '{t1}', 'NO RULES', 'MEOW'], colors: null, splat: true },
    net: 'rgba(230,225,210,0.35)', hole: '#171210',
    props: [{ t: 'tire', x: 0, dx: -10, dy: 9 }, { t: 'can', x: 1, dx: 8, dy: 6 }, { t: 'crate', x: 0.25, dx: 0, dy: 9 }, { t: 'cone', x: 0.5, dx: 40, dy: 10 }, { t: 'can', x: 0.78, dx: 0, dy: 6 }],
    crowd: { sound: 0.2, regions: ['top'], rows: 1, density: 0.14, span: 'field', colors: ['#5a4a3a', '#3a3f48', '#7a3a2a', '#2a3a4a', '#6a6a5a'], teamColors: 0.2, cheer: 0.5, flashes: 0.05, hat: { shape: 'cap', chance: 0.3, colors: ['#1a1a1a', '#d7263d', '#2f6fb8'] } },
  },

  // AREA 4 — Sân Thượng: sàn gạch xi măng, lan can bê tông, thành phố về đêm phía sau
  rooftop: {
    void: '#070a14',
    floor: { style: 'tiles', size: 16, colors: ['#5d6270', '#585d6a', '#626776', '#555a66'], joint: '#40444f', speckD: '#4a4e5a', speckL: '#6d7282', crack: '#3c404a', cracks: 6, paint: 0.05 },
    line: 'rgba(255,255,255,0.75)',
    logo: 'SKY',
    wall: { style: 'brick', colors: ['#8a8f9c', '#80858f', '#939aa6', '#777c87'], mortar: '#4a4e58', w: 24, h: 10, edge: '#2a2d35' },
    rim: { base: '#3a3e49', light: '#4d5260', dark: '#434753' },
    backdrop: { style: 'skyline', sky: ['#0b1030', '#1b1f4a'], buildings: ['#141833', '#181d3d', '#10142b'], window: '#ffe9a8', moon: '#f4f1d8' },
    lights: { style: 'none' },
    graffiti: { tags: ['SKY', '{t0}', 'HIGH', '{t1}'], colors: ['#6ec8ff', '#ffffff'], splat: false },
    net: 'rgba(230,240,255,0.4)', hole: '#12151e',
    props: [{ t: 'ac', x: 0, dx: -10, dy: 8 }, { t: 'ac', x: 1, dx: 10, dy: 8 }, { t: 'plant', x: 0.3, dx: 0, dy: 9 }, { t: 'plant', x: 0.7, dx: 0, dy: 9 }],
    crowd: { sound: 0.2, regions: ['top'], rows: 1, density: 0.12, span: 'field', colors: ['#6ec8ff', '#e8ecf5', '#9d7bff', '#3a3f55', '#ff8ac0'], teamColors: 0.25, cheer: 0.6, flashes: 0.15, hat: { shape: 'cap', chance: 0.25, colors: ['#1a1a1a', '#e8ecf5'] } },
  },

  // AREA 5 — Chợ Đêm: gạch lát đỏ, sạp hàng, dây đèn lồng, bảng neon
  market: {
    void: '#12070a',
    floor: { style: 'tiles', size: 12, colors: ['#7a3b34', '#733630', '#823f37', '#6b322c'], joint: '#4a211d', speckD: '#5e2a25', speckL: '#94504a', crack: '#4a211d', cracks: 8, paint: 0.08 },
    line: 'rgba(255,236,200,0.78)',
    logo: 'MARKET',
    wall: { style: 'brick', colors: ['#3b2a2a', '#433030', '#352525', '#4a3434'], mortar: '#1c1212', w: 12, h: 6, edge: '#140c0c' },
    rim: { base: '#2c1a1a', light: '#402626', dark: '#352020' },
    backdrop: { style: 'lanterns', sky: ['#1a0a14', '#2d0f1e'], string: '#3a2a20', lantern: ['#ff3d3d', '#ffb13d', '#ff3d3d', '#ffd23f'], sign: ['#ff3fb4', '#3ff6ff', '#ffd23f'] },
    lights: { style: 'neon', color: '#ff3fb4', glow: '255,63,180' },
    graffiti: { tags: ['NOODLE', '{t0}', 'OPEN 24H', '{t1}', 'DRAGON'], colors: ['#ff3fb4', '#3ff6ff', '#ffd23f'], splat: false },
    net: 'rgba(255,230,210,0.35)', hole: '#170c0c',
    props: [{ t: 'lantern', x: 0, dx: -10, dy: 8 }, { t: 'lantern', x: 1, dx: 10, dy: 8 }, { t: 'crate', x: 0.2, dx: 0, dy: 9 }, { t: 'barrel', x: 0.8, dx: 0, dy: 8 }, { t: 'crate', x: 0.5, dx: 0, dy: 9 }],
    crowd: { sound: 0.45, regions: ['top'], rows: 1, density: 0.35, span: 'field', colors: ['#c94a3a', '#e8dcc0', '#3a5a7a', '#6a4a8a', '#d9a23a'], teamColors: 0.3, cheer: 0.5, flashes: 0.2 },
  },

  // AREA 6 — Bến Cảng: thép tấm rỉ sét, vạch cảnh báo, tường container, cần cẩu trên biển đêm
  harbor: {
    void: '#060a0e',
    floor: { style: 'plates', size: 32, colors: ['#4a5258', '#465055', '#4f575d', '#434b50'], joint: '#2e3438', rivet: '#6a747b', rust: 'rgba(160,80,40,0.22)', speckD: '#3a4146', speckL: '#5c666c', crack: '#2e3438', cracks: 4, paint: 0.05, hazard: true },
    line: 'rgba(255,214,90,0.8)',
    logo: 'DOCK 7',
    wall: { style: 'container', colors: ['#b8452f', '#2f6fb8', '#c9a13a', '#3f8f5a', '#8a3f8f'], rib: 3, edge: '#12161a' },
    rim: { base: '#252b30', light: '#353d44', dark: '#2c3338' },
    backdrop: { style: 'harbor', sky: ['#070d18', '#12203a'], sea: '#0c1a2c', crane: '#1a222c', light: '#ff5a3d' },
    lights: { style: 'street', pole: '#262c33', lamp: '#fff2c8', glow: '255,236,190' },
    graffiti: { tags: ['DOCK', '{t0}', 'HAZARD', '{t1}', 'CARGO'], colors: ['#ffffff', '#ffd23f'], splat: false },
    net: 'rgba(220,230,240,0.35)', hole: '#0f1418',
    props: [{ t: 'bollard', x: 0, dx: -10, dy: 8 }, { t: 'bollard', x: 1, dx: 10, dy: 8 }, { t: 'barrel', x: 0.3, dx: 0, dy: 8 }, { t: 'crate', x: 0.62, dx: 0, dy: 9 }, { t: 'barrel', x: 0.68, dx: 0, dy: 8 }],
    crowd: { sound: 0.25, regions: ['top'], rows: 1, density: 0.16, span: 'field', colors: ['#ff7a1f', '#c9e636', '#3a4a5a', '#ff7a1f'], teamColors: 0.1, cheer: 0.55, flashes: 0.05, hat: { shape: 'hardhat', chance: 0.75, colors: ['#ffd23f', '#ffffff', '#ff7a1f'] } },
  },

  // AREA 9 — Đấu Trường Cyber: sàn tối lưới neon, tường tấm kim loại khe sáng, màn LED, khán giả cầm que phát sáng 2 bên
  cyber: {
    void: '#05030c',
    floor: { style: 'grid', size: 24, colors: ['#15122a', '#171430', '#131026', '#191634'], grid: 'rgba(157,123,255,0.28)', glow: 'rgba(63,246,255,0.5)', speckD: '#0f0d20', speckL: '#221e44', crack: '#0f0d20', cracks: 0, paint: 0.04 },
    line: 'rgba(63,246,255,0.85)',
    logo: 'APEX',
    wall: { style: 'panel', colors: ['#1c1a33', '#22203d', '#1a1830'], seam: '#9d7bff', edge: '#08060f' },
    rim: { base: '#141226', light: '#221f3d', dark: '#1a1830' },
    backdrop: { style: 'screens', bg: '#07051a', screen: '#0d1030', bars: ['#3ff6ff', '#9d7bff', '#ff3fb4'] },
    lights: { style: 'neon', color: '#3ff6ff', glow: '63,246,255' },
    graffiti: { tags: ['APEX', '{t0}', 'VS', '{t1}', 'FINAL'], colors: ['#3ff6ff', '#9d7bff', '#ff3fb4'], splat: false },
    net: 'rgba(63,246,255,0.4)', hole: '#08061a',
    props: [{ t: 'holo', x: 0, dx: -10, dy: 8 }, { t: 'holo', x: 1, dx: 10, dy: 8 }, { t: 'holo', x: 0.5, dx: -70, dy: 9 }, { t: 'holo', x: 0.5, dx: 70, dy: 9 }],
    stands: { color: ['#0d0b1c', '#110e24'], rail: '#3ff6ff' },
    crowd: { sound: 0.85, regions: ['sides', 'bottom'], density: 0.8, colors: ['#1c1a33', '#2a2448', '#15122a'], teamColors: 0.4, cheer: 0.9, flashes: 0.8, glow: ['#3ff6ff', '#9d7bff', '#ff3fb4', '#9dff3d'] },
  },

  // AREA 1 — Sân Làng: đất nện loang cỏ, hàng rào tre, ruộng lúa + núi xa lúc hoàng hôn. Lác đác vài người làng đội nón lá xem
  village: {
    void: '#1c140c',
    floor: { style: 'dirt', size: 16, colors: ['#8a6a44', '#83643f', '#90704a', '#7d5f3b'], grass: ['#6b8f3a', '#7a9e44', '#5f8233'], grassPatches: 26, speckD: '#6e5232', speckL: '#a3825a', crack: '#6a4e30', cracks: 6, paint: 0.04 },
    line: 'rgba(250,245,225,0.62)',
    logo: 'VILLAGE',
    wall: { style: 'bamboo', colors: ['#b89a4a', '#a88a3c', '#c4a656', '#9c7f36'], node: '#7a5f24', rope: '#6b4a2a', edge: '#3a2a14' },
    rim: { base: '#4a3a24', light: '#5c4a2e', dark: '#52412a' },
    backdrop: { style: 'fields', sky: ['#ff9f5a', '#ffe0a0'], sun: '#fff3c0', hills: ['#8a7a6a', '#6f6a5a'], paddy: ['#7fbf4a', '#6fae3f', '#8cc65a'], water: 'rgba(200,230,255,0.35)' },
    lights: { style: 'sun', glow: '255,190,110' },
    graffiti: { tags: [] },
    net: 'rgba(240,235,220,0.4)', hole: '#2a1f14',
    props: [{ t: 'hay', x: 0, dx: -9, dy: 8 }, { t: 'sack', x: 1, dx: 9, dy: 8 }, { t: 'chicken', x: 0.3, dx: 0, dy: 10 }, { t: 'chicken', x: 0.34, dx: 0, dy: 12 }, { t: 'hay', x: 0.72, dx: 0, dy: 8 }, { t: 'chicken', x: 0.9, dx: 0, dy: 11 }],
    crowd: { sound: 0.12, regions: ['top'], rows: 1, density: 0.12, span: 'field', colors: ['#e8dcc0', '#8a6a44', '#5a7aa0', '#b04a3a', '#f2f2e8'], teamColors: 0.1, cheer: 0.45, flashes: 0, hat: { shape: 'cone', chance: 0.55, colors: ['#f2e2a8', '#e8d49a'] } },
  },

  // AREA 3 — Sân Trường: xi măng kẻ vạch, tường vôi vàng + bảng đen, dãy lớp học + cột cờ. Vài học sinh đứng xem
  school: {
    void: '#101418',
    floor: { style: 'asphalt', colors: ['#9a9a94', '#94948e', '#a0a09a', '#8e8e88'], speckD: '#828279', speckL: '#b0b0a8', crack: '#7a7a72', cracks: 10, paint: 0.06 },
    line: 'rgba(255,255,255,0.88)',
    logo: 'SCHOOL',
    wall: { style: 'plaster', colors: ['#e6c65c'], band: '#c9a640', trim: '#f2dc8a', board: '#2f5a3a', frame: '#8a6a3a', edge: '#5a4a24' },
    rim: { base: '#6a6a64', light: '#7c7c75', dark: '#727269' },
    backdrop: { style: 'school', sky: ['#7ec8f0', '#cfeaf7'], wall: '#efe4c8', roof: '#b04a3a', window: '#6fa8d6', frame: '#8a7a5a', flag: '#e8332e' },
    lights: { style: 'sun', glow: '255,245,220' },
    graffiti: { tags: ['CLASS 9A', '{t0}', 'NO RUNNING', '{t1}', 'GO!'], colors: ['#ffffff', '#f2f2e8'], splat: false },
    net: 'rgba(255,255,255,0.4)', hole: '#2a2a28',
    props: [{ t: 'hoop', x: 0, dx: -9, dy: 6 }, { t: 'bag', x: 0.3, dx: 0, dy: 10 }, { t: 'cone', x: 0.5, dx: 0, dy: 10 }, { t: 'bag', x: 0.66, dx: 0, dy: 10 }, { t: 'hoop', x: 1, dx: 9, dy: 6 }],
    crowd: { sound: 0.3, regions: ['top'], rows: 1, density: 0.28, span: 'field', colors: ['#ffffff', '#e8ecf5', '#f2f2f2'], teamColors: 0.15, cheer: 0.6, flashes: 0 },
  },

  // AREA 7 — Lồng Sắt Ngầm: sàn cao su tối, tường lưới thép, 1 đèn rọi giữa, khán giả hò hét trong bóng tối
  cage: {
    void: '#050407',
    floor: { style: 'asphalt', colors: ['#26232b', '#2a2730', '#232028', '#2d2a33'], speckD: '#1c1a20', speckL: '#3a3640', crack: '#1a181e', cracks: 5, paint: 0.1 },
    line: 'rgba(255,70,70,0.72)',
    logo: 'NO REFS',
    wall: { style: 'cage', bg: '#141218', wire: 'rgba(170,175,190,0.5)', post: '#4a4f58', postL: '#6a707c', edge: '#08070a' },
    rim: { base: '#18161c', light: '#232028', dark: '#1d1b22' },
    backdrop: { style: 'dark', bg: '#050407', haze: 'rgba(120,20,20,0.18)' },
    stands: { color: ['#0c0b10', '#100e15'], rail: '#3a3f48' },
    lights: { style: 'spot', glow: '255,236,210', dark: 0.42 },
    graffiti: { tags: ['NO MERCY', '{t0}', 'CAGE', '{t1}', 'NO REFS'], colors: ['#ff3d3d', '#ffffff'], splat: true },
    net: 'rgba(200,200,210,0.35)', hole: '#0a090c',
    props: [{ t: 'firebarrel', x: 0, dx: -9, dy: 7 }, { t: 'tire', x: 0.25, dx: 0, dy: 9 }, { t: 'firebarrel', x: 1, dx: 9, dy: 7 }, { t: 'tire', x: 0.8, dx: 0, dy: 9 }],
    crowd: { sound: 0.8, regions: ['top', 'sides'], rows: 4, density: 0.75, colors: ['#2a2530', '#3a3440', '#4a2a2a', '#23232b', '#5a1a1a'], teamColors: 0.25, cheer: 0.85, flashes: 0.6, shade: 0.5 },
  },

  // AREA 8 — Cúp Quảng Trường: cỏ nhân tạo, bảng quảng cáo, khán đài tạm + màn hình lớn, đèn pha
  plaza: {
    void: '#0a0c14',
    floor: { style: 'turf', stripe: 24, colors: ['#3f8a3a', '#468f40'], speckD: '#377a33', speckL: '#55a04d', crack: '#377a33', cracks: 0, paint: 0.05 },
    line: 'rgba(255,255,255,0.9)',
    logo: 'PLAZA CUP',
    wall: { style: 'ads', edge: '#0c0e16', ads: [['STREET COLA', '#d7263d', '#ffffff'], ['KICKZ', '#111111', '#ffe14f'], ['METRO BANK', '#1f5fbf', '#ffffff'], ['NOODLE KING', '#ffcf3f', '#b3122e'], ['ZAP ENERGY', '#6bff4f', '#111111'], ['CITY FM', '#ff7a1f', '#ffffff']] },
    rim: { base: '#1c2030', light: '#262b3e', dark: '#212636' },
    backdrop: { style: 'stands', sky: ['#0a0f24', '#1a2344'], tiers: ['#3a3f4a', '#343844'], pole: '#6a707c', screen: 'PLAZA CUP', screenColor: '#ffe14f' },
    stands: { color: ['#2a2e38', '#30343f'], rail: '#6a707c' },
    lights: { style: 'flood', towers: 2, glow: '255,255,235', lamp: '#fffbe6', pole: '#3a3f4a' },
    graffiti: { tags: [] },
    net: 'rgba(255,255,255,0.45)', hole: '#10131c',
    props: [{ t: 'camera', x: 0.5, dx: -80, dy: 8 }, { t: 'cone', x: 0.3, dx: 0, dy: 10 }, { t: 'cone', x: 0.7, dx: 0, dy: 10 }, { t: 'camera', x: 1, dx: 9, dy: 8 }],
    crowd: { sound: 0.9, regions: ['top', 'sides'], rows: 4, density: 0.85, colors: ['#e8ecf5', '#3a5a9a', '#9aa3b5', '#d9a23a', '#6a4a8a'], teamColors: 0.55, cheer: 0.9, flashes: 1.2, scarves: 0.3 },
  },

  // AREA 10 — Sân Khấu Thế Giới: cỏ sọc hoàn hảo, bảng LED, khán đài khổng lồ kín người, 4 cột đèn pha, flash, pháo hoa
  stadium: {
    void: '#04050b',
    floor: { style: 'turf', stripe: 22, checker: true, colors: ['#2f8a36', '#3a9a40'], speckD: '#2a7a30', speckL: '#48a84e', crack: '#2a7a30', cracks: 0, paint: 0.03 },
    line: 'rgba(255,255,255,0.97)',
    logo: 'WORLD STAGE',
    wall: { style: 'led', bg: '#07080f', edge: '#020308', ads: [['WORLD STAGE', '#ffd23f'], ['{t0}', '#ffffff'], ['LEGENDS', '#3ff6ff'], ['{t1}', '#ffffff'], ['STREET COLA', '#ff3d5a'], ['KICKZ', '#9dff3d']] },
    rim: { base: '#0f1220', light: '#181c30', dark: '#131729' },
    backdrop: { style: 'stadium', roof: '#0a0c16', roofLight: '#fffbe6', tiers: ['#1a2a5a', '#16244f'], screen: 'WORLD STAGE', screenColor: '#ffd23f' },
    stands: { color: ['#16244f', '#1a2a5a'], rail: '#ffd23f' },
    lights: { style: 'flood', towers: 4, glow: '255,255,240', lamp: '#ffffff', pole: '#2a2f40' },
    graffiti: { tags: [] },
    net: 'rgba(255,255,255,0.5)', hole: '#0a0c14',
    props: [{ t: 'camera', x: 0.5, dx: -110, dy: 8 }, { t: 'trophy', x: 0.5, dx: 0, dy: 9 }, { t: 'camera', x: 0.5, dx: 110, dy: 8 }],
    crowd: { sound: 1, regions: ['top', 'sides', 'bottom'], rows: 5, density: 0.95, colors: ['#e8ecf5', '#1a1a2a', '#9aa3b5', '#d9a23a', '#3a5a9a'], teamColors: 0.7, cheer: 1, flashes: 2.5, scarves: 0.45, fireworks: true },
  },
};
