/* =========================================================
 * LEGENDS CONFIG — LEGEND của GOAT PATH (docs/RUN_DESIGN.md mục "LEGEND", user chốt 2026-10-28).
 * Huyền thoại bóng đá (tên nhái, không dùng tên thật / mặt / số áo / CLB thật) gắn vào 1 người trong đội hình run, mỗi người tối đa 1.
 * role = vị trí sở trường (chỉ để hiện); ai trong đội cũng nhận được, gắn lệch vị trí để người chơi tự sáng tạo (user 2026-10-28).
 * Có LEGEND = thắng LEGEND TRIAL của họ trên map (node 'legend'), rồi chọn người nhận.
 * Logic run: src/meta/run.js · trong trận: src/systems/legends.js (SFC.Legends) · hình: src/render/legenddraw.js · UI: src/ui/runmap.js.
 * Luật làn (user 2026-10-28): LEGEND chỉ làm người đeo giỏi hơn ở thứ đã có (chỉ số) — không bao giờ tạo chiêu mới (đó là việc của Core).
 *   stats: nghiêng chỉ số luôn bật (rating cộng / trừ, tính vào Run.ratingsOf) · school: trường phái Core của người đó ra thường hơn
 *   moment: KHOẢNH KHẮC LEGEND — on: tình huống kích hoạt (danh sách ở src/systems/legends.js), stats: rating cộng thêm trong
 *     moment.dur giây (on 'final': tới hết trận) + cut-in chân dung bên cạnh màn hình (không dừng trận) + bóng mờ huyền thoại sau lưng
 *   flaw: nhược điểm cơ chế (áp như nhau cho người và AI): dive (bị đánh nằm lâu hơn) · light (bị đánh văng xa hơn) · red (ra đòn
 *     nặng quá hits lần = THẺ ĐỎ: đứng ngoài cuộc time giây) · random (mỗi trận 1 chỉ số tăng up, 1 chỉ số giảm dn). Đánh đổi chỉ số
 *     thì nằm luôn trong stats (số âm).
 *   trial: LEGEND TRIAL (user 2026-10-30: khớp combo) = bài SKILL GAME 'combo' (run.drills.combo): LEGEND cho người đá MƯỢN kỹ thuật của
 *     mình trong bài (không kèm nhược điểm), đếm số lần làm được kỹ thuật đó (src/systems/drills.js combo): đạt goal lần trong time giây
 *     = qua. Hỏng: không mất gì. size: [bạn, đối thủ] (bạn 3 = cả đội hình) · keepers: số đối thủ chỉ đứng khung · foeBall: đối thủ cầm
 *     bóng tấn công (bạn giữ bóng lâu thì trả lại họ) · feed: đồng đội AI cầm bóng là chuyền trả bạn ('ground' sệt / 'lob' bổng để tạt).
 *   look: ngoại hình (chân dung cut-in, bóng mờ, node map) — chỉ gợi ý kiểu tóc / râu, không vẽ giống người thật.
 *   tech: KỸ THUẬT ĐẶC TRƯNG (user 2026-10-29, hướng A): mỗi LEGEND dạy người đeo 1 kỹ thuật nâng cao (bảng techniques). Trong trận GOAT PATH
 *     kỹ thuật nâng cao CHỈ có qua LEGEND (gateInRun); ngoài run 4 kỹ thuật cũ (base) vẫn cho mọi người như trước.
 *   desc / flawDesc: 1 câu ngắn, không ghi số (cùng luật mô tả Core).
 * ========================================================= */
window.SFC_CONFIG = window.SFC_CONFIG || {};

SFC_CONFIG.legends = {
  // KHOẢNH KHẮC LEGEND: dur giây · cooldown giây giữa 2 lần của 1 người · max lần mỗi trận · cut-in: cutT giây hiện, cutGap giây
  // tối thiểu giữa 2 cut-in bất kỳ (không đè nhau, không đè cut-in Tuyệt kỹ). longPass: px tối thiểu của đường chuyền dài · hold: giây giữ bóng
  // enabled: false = tắt KHOẢNH KHẮC LEGEND (tăng chỉ số + cut-in + bóng mờ) — user 2026-10-29: tạm chỉ giữ kỹ thuật (combo)
  moment: { enabled: false, dur: 5, cooldown: 14, max: 2, cutT: 1.7, cutGap: 2.5, longPass: 190, hold: 2.2 },
  schoolBias: 1.5,
  // KỸ THUẬT: gateInRun = trong run chỉ người có LEGEND mới dùng được (đúng kỹ thuật của LEGEND đó) · base = kỹ thuật ai cũng có ngoài run
  // keys: tổ hợp phím ({action} = nhãn phím, như controls.help) · name / desc: hiện trên thẻ LEGEND (desc không ghi số).
  // Số liệu kỹ thuật cũ ở game.technique; kỹ thuật mới ở tuning (src/systems/legends.js).
  gateInRun: true,
  base: ['finesse', 'chip', 'fake', 'lobthrough'],   // ngoài run: 4 kỹ thuật cũ cho mọi người (mọi trận không phải GOAT PATH)
  techniques: {
    // 4 kỹ thuật cũ (ngoài run: ai cũng có — base)
    chip:       { name: 'CHIP SHOT',      keys: '{skill} + {shoot}',            desc: 'Lift the ball over a keeper who comes off his line.' },
    fake:       { name: 'FAKE SHOT',      keys: '{shoot} (hold) + {pass}',      desc: 'Shape to shoot, then don\'t. Defenders freeze.' },
    // kỹ thuật LEGEND (user 2026-10-29)
    lobthrough: { name: 'LOFTED THROUGH', keys: '{skill} + {through}',          desc: 'A through ball that sails over every head.' },
    finesse:    { name: 'FINESSE SHOT',   keys: '{switch} + {shoot}',           desc: 'A curler that bends into the far corner.' },
    power:      { name: 'POWER SHOT',     keys: '{power} + {shoot}',            pad: '{skill} + {switch} + {shoot}', desc: 'Pure strength. The ball leaves a crater.' },
    trivela:    { name: 'TRIVELA',        keys: '{trick} + {shoot}',            pad: '{sprint} + {switch} + {shoot}', desc: 'Outside of the boot: it bends the other way.' },
    bruiser:    { name: 'BRUISER RUN',    keys: '{sprint} (hold) + tap {trick}', pad: '{sprint} (hold) + tap {switch}', desc: 'Elbow them away on the run. Time it on a tackle and they bounce off.' },
    rainbow:    { name: 'RAINBOW FLICK',  keys: '{shoot} (hold) + {pass}',      desc: 'Flick the ball over your own head and theirs.' },
    bicycle:    { name: 'BICYCLE KICK',   keys: '{shoot} on a high ball',       desc: 'A high ball coming? Fly up and kick it upside down.' },
    engine:     { name: 'ENGINE PRESS',   keys: '{sprint} + {shoot} (hold)',    desc: 'Hunt the ball down on autopilot. Burns stamina fast.' },
    slide:      { name: 'SLIDE TACKLE',   keys: '{sprint} + {lob}',             desc: 'Slide in. Whoever you catch flips three times.' },
    sweeper:    { name: 'SWEEPER SPIN',   keys: '{through} save in your box',   desc: 'Read a shot, catch it, spin and launch a teammate.' },
    toepoke:    { name: 'TOE POKE',       keys: 'tap {shoot}',                  desc: 'A shot with no backlift that still flies.' },   // tạm không LEGEND nào dạy
  },
  // số liệu kỹ thuật LEGEND (src/systems/legends.js, src/systems/actions.js; hình src/render/legenddraw.js):
  //   power: bóng nhanh x speed, sai số x spread, bổng x lift · trivela: như cứa lòng nhưng cong ngược phía, cong x bend, tốc x speed
  //   bicycle: bóng cao >= minZ (px)
  //   lúc chạm, nhảy jump px/s, lực x power, sai số x spread · engine: tự đuổi bóng, tiêu thể lực x drain (so với chạy nhanh), chạm người
  //   cầm bóng trong reach px = chọc bóng (nghỉ cd s) · slide: trượt time s speed px/s, chạm trong reach px = đối thủ bay lộn flips vòng
  //   (cao launch px/s, choáng stun s), hụt = nằm miss s, nghỉ cd s · sweeper: sau khi đọc trúng cú sút (W), bắt được bóng trong window s
  //   -> xoay spin s rồi chuyền cho người dâng cao nhất, người đó tăng tốc pace +boost trong boostT s · toepoke: lực nạp < maxCharge -> power
  tuning: {
    power: { speed: 1.35, spread: 0.6, lift: 0.5 },
    trivela: { speed: 0.95, bend: 1.3, spread: 0.6 },
    // rainbow: bóng bay vòng qua đầu time s, đỉnh cao peak px, rơi xuống ahead px trước mặt người đang chạy rồi về chân (dẫn bóng tiếp)
    // near: LEGEND TRIAL chỉ tính lần hất khi có đối thủ trong near px lúc hất
    rainbow: { time: 0.6, peak: 30, ahead: 12, behind: 6, near: 60 },
    // bruiser: đang dẫn bóng + chạy nhanh, bấm = giật chỏ: đối thủ trong range px bị đẩy văng (knock px/s, choáng stun s) · trong
    // window s sau khi bấm, ai tắc / đấm vào bạn cũng bị văng ngược (parry) · nghỉ cd s
    bruiser: { range: 26, knock: 260, stun: 0.5, window: 0.3, cd: 1.1 },
    bicycle: { minZ: 9, jump: 150, power: 1.35, spread: 0.6 },
    engine: { drain: 2.2, reach: 15, cd: 0.9 },
    slide: { time: 0.42, speed: 290, reach: 16, flips: 3, launch: 230, stun: 1.0, miss: 0.55, cd: 2.5 },
    sweeper: { window: 2.5, spin: 0.5, boost: 30, boostT: 1.8 },
    toepoke: { maxCharge: 0.16, power: 0.78 },
  },
          // Core thuộc trường phái (school) của LEGEND ra thường hơn ở lượt chọn của người đeo (nhân trọng số bốc)

  list: {
    /* ---------- FWD ---------- */
    haalandroid: {
      name: 'Erling Haalandroid', title: 'THE CYBORG', role: 'FWD', school: 'striker', color: '#7fd8ff',
      look: { hair: 'bun', hairColor: 3, skin: 4, face: 'cyborg', shoes: 'kicks' },
      stats: { shooting: 8, passing: -10, dribble: -6 },
      moment: { on: 'box', stats: { shooting: 24, pace: 10 } },
      desc: 'Unstoppable once the ball reaches him in the box.', flawDesc: 'Clumsy with the ball at his feet.',
      tech: 'bruiser',
      trial: { drill: 'combo', goal: 4, time: 35, size: [1, 3] },
    },
    ibra: {
      name: 'Zlatko Ibrakadabra', title: 'THE LION', role: 'FWD', school: 'launcher', color: '#ffb02e',
      look: { hair: 'bun', hairColor: 0, skin: 1, face: 'beard', shoes: 'boots' },
      stats: { shooting: 6, fight: 6, passing: -12 },
      moment: { on: 'hardHit', stats: { shooting: 20, fight: 14 } },
      desc: 'Every heavy blow he lands wakes the lion.', flawDesc: 'Too proud to pass.',
      tech: 'bicycle',
      trial: { drill: 'combo', goal: 2, time: 45, size: [3, 1], keepers: 1, feed: 'lob' },
    },
    balotello: {
      name: 'Mario Balotello', title: 'WHY ALWAYS ME?', role: 'FWD', school: 'chaos', color: '#ff5ad8',
      look: { hair: 'mohawk', hairColor: 3, skin: 3, face: 'none', shoes: 'reds' },
      stats: {},
      moment: { on: 'goal', stats: { pace: 12, shooting: 12, passing: 12, dribble: 12, fight: 12 } },
      flaw: { kind: 'random', up: 15, dn: -12 },
      desc: 'Scores, then does everything better.', flawDesc: 'Nobody knows which Mario shows up today.',
      tech: 'power',
      trial: { drill: 'combo', goal: 3, time: 40, size: [1, 1], keepers: 1 },
    },
    neymor: {
      name: 'Neymor Jr.', title: 'SAMBA STAR', role: 'FWD', school: 'trickster', color: '#ffe14f',
      look: { hair: 'spiky', hairColor: 3, skin: 2, face: 'none', shoes: 'reds' },
      stats: { dribble: 8, pace: 4, fight: -8 },
      moment: { on: 'dodge', stats: { dribble: 20, pace: 14 } },
      flaw: { kind: 'dive', stun: 1.5 },
      desc: 'Slip past a hit and the samba starts.', flawDesc: 'Stays down far too long when hit.',
      tech: 'rainbow',
      trial: { drill: 'combo', goal: 4, time: 35, size: [1, 2] },
    },
    /* ---------- MID ---------- */
    mecci: {
      name: 'Leo Mecci', title: 'THE LITTLE MAGICIAN', role: 'MID', school: 'runner', color: '#6fc3ff',
      look: { hair: 'classic', hairColor: 1, skin: 0, face: 'beard', shoes: 'kicks' },
      stats: { dribble: 10, passing: 4, fight: -12 },
      moment: { on: 'hold', stats: { dribble: 20, pace: 12, shooting: 10 } },
      flaw: { kind: 'light', knock: 1.4 },
      desc: 'The longer he keeps the ball, the more magic happens.', flawDesc: 'Tiny. Gets knocked flying.',
      tech: 'finesse',
      trial: { drill: 'combo', goal: 3, time: 40, size: [1, 2], keepers: 1 },
    },
    pirlow: {
      name: 'Andrea Pirlow', title: 'THE ARCHITECT', role: 'MID', school: 'playmaker', color: '#c7a6ff',
      look: { hair: 'longhair', hairColor: 1, skin: 0, face: 'beard', shoes: 'boots' },
      stats: { passing: 10, pace: -10 },
      moment: { on: 'longPass', stats: { passing: 24, shooting: 10 } },
      desc: 'A long ball that lands perfectly sets his mind racing.', flawDesc: 'Never runs if he can walk.',
      tech: 'lobthrough',
      trial: { drill: 'combo', goal: 3, time: 40, size: [3, 2], feed: 'ground' },
    },
    kantay: {
      name: "N'Golo Kantay", title: 'THE ENGINE', role: 'MID', school: 'iron', color: '#6bff4f',
      look: { hair: 'buzz', hairColor: 0, skin: 3, face: 'none', shoes: 'kicks' },
      stats: { pace: 6, fight: 6, shooting: -12 },
      moment: { on: 'steal', stats: { pace: 20, fight: 14 } },
      desc: 'Wins the ball back and finds a second engine.', flawDesc: 'Shoots like a defender.',
      tech: 'engine',
      trial: { drill: 'combo', goal: 4, time: 35, size: [1, 3], foeBall: true },
    },
    /* ---------- DEF ---------- */
    ramen: {
      name: 'Sergio Ramen', title: 'MINUTE 93', role: 'DEF', school: 'brawler', color: '#ff3d5a',
      look: { hair: 'classic', hairColor: 0, skin: 1, face: 'beard', shoes: 'boots' },
      stats: { fight: 8, keeper: 4, passing: -6 },
      moment: { on: 'final', stats: { shooting: 20, fight: 14, pace: 10 } },
      flaw: { kind: 'red', hits: 4, time: 8 },
      desc: 'The later the match, the bigger he gets.', flawDesc: 'Too many heavy hits and the red card comes out.',
      tech: 'slide',
      trial: { drill: 'combo', goal: 4, time: 35, size: [1, 3], foeBall: true },
    },
    neuermann: {
      name: 'Manuel Neuermann', title: 'THE SWEEPER', role: 'DEF', school: 'iron', color: '#3ff6ff',
      look: { hair: 'buzz', hairColor: 3, skin: 4, face: 'none', shoes: 'kicks' },
      stats: { keeper: 10, passing: 4, shooting: -10 },
      moment: { on: 'win', stats: { pace: 16, passing: 20 } },
      desc: 'Wins the ball and starts the attack himself.', flawDesc: 'Cannot hit a barn door.',
      tech: 'sweeper',
      trial: { drill: 'combo', goal: 3, time: 40, size: [1, 2], foeBall: true },
    },
    carloss: {
      name: 'Roberto Carloss', title: 'THE CANNON', role: 'DEF', school: 'runner', color: '#ffd23f',
      look: { hair: 'buzz', hairColor: 0, skin: 3, face: 'none', shoes: 'boots' },
      stats: { pace: 8, shooting: 6, keeper: -12 },
      moment: { on: 'longShot', stats: { shooting: 30 } },
      desc: 'Lines up a shot from his own half and the ground shakes.', flawDesc: 'Forgets to stay back.',
      tech: 'trivela',
      trial: { drill: 'combo', goal: 2, time: 45, size: [1, 2], keepers: 1 },
    },
  },
};
