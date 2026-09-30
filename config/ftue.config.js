/* =========================================================
 * FTUE CONFIG — hướng dẫn người chơi mới (PROLOGUE). Code: src/ui/story.js (cut scene) + src/game/tutorial.js (trận mơ).
 *
 * Luồng: đặt tên xong -> cut scene "intro" ("I have a dream...") -> DREAM MATCH (trận hướng dẫn có kịch bản:
 * di chuyển -> chuyền -> sút -> chọn Core -> đấm cướp bóng -> ghi bàn -> mở ULTIMATE -> dùng Ultimate -> đá tự do tới hết giờ)
 * -> cut scene "outro" (tỉnh dậy ở VILLAGE GREEN + thẻ giới thiệu MAIN PATH) -> trang Main Path.
 * Core trong trận mơ chỉ là "mượn": hết mơ là mất, phải leo Main Path để mở khoá thật.
 * Hồ sơ lưu Profile.data.tut.done. SETTINGS > PROLOGUE: xem lại.
 * ========================================================= */
window.SFC_CONFIG = window.SFC_CONFIG || {};

SFC_CONFIG.ftue = {
  enabled: true,
  cheatButton: true,        // nút TEST FTUE ở SETTINGS > TEST (chỉ bản dev) để test PROLOGUE — false = ẩn
  skipHold: 0.8,            // cut scene: giữ Enter / Esc bấy nhiêu giây để bỏ qua
  typeSpeed: 34,            // chữ gõ máy: ký tự / giây

  /* ---------- CUT SCENE ----------
   * Mỗi cảnh: art (hàm vẽ trong story.js) · dur (giây; 0 = chờ Enter) · lines: [{ at, text, style }]
   * style: caption (hộp chữ đáy) · shout (chữ to giữa màn, rung) · title (chữ vàng đập xuống) · sub (dòng nhỏ dưới title)
   * {name} = tên character */
  scenes: {
    intro: [
      { art: 'black', dur: 3.2, lines: [{ at: 0.3, text: 'Every kid on this block kicks a ball against a wall...', style: 'caption' }] },
      { art: 'alley', dur: 4.6, lines: [{ at: 0.4, text: 'Night after night. Rain or no rain.', style: 'caption' }, { at: 2.4, text: 'But me? I\'m not just kicking a ball.', style: 'caption' }] },
      { art: 'eyes', dur: 3.0, lines: [{ at: 0.35, text: 'I HAVE A DREAM...', style: 'shout' }] },
      { art: 'flash', dur: 0.35 },
      { art: 'stadium', dur: 5.4, lines: [{ at: 0.3, text: '...TO BE THE GOAT', style: 'title' }, { at: 1.3, text: 'OF STREET FOOTBALL', style: 'sub' }, { at: 3.0, text: '— {name}', style: 'sign' }] },
      { art: 'dive', dur: 2.6, lines: [{ at: 0.2, text: 'And tonight, in my dream... I already am.', style: 'caption' }] },
    ],
    outro: [
      { art: 'fade', dur: 1.4, lines: [{ at: 0.2, text: '...', style: 'caption' }] },
      { art: 'wake', dur: 3.4, lines: [{ at: 0.2, text: 'RRRRING!', style: 'shout' }, { at: 1.4, text: '...and then I woke up.', style: 'caption' }] },
      { art: 'village', dur: 5.0, lines: [{ at: 0.3, text: 'No powers. No crowd. Just a muddy field...', style: 'caption' }, { at: 2.6, text: '...and a dream. Every legend starts somewhere.', style: 'caption' }] },
      { art: 'path', dur: 0 },   // thẻ giới thiệu MAIN PATH, chờ Enter
    ],
  },

  // thẻ MAIN PATH (cảnh cuối outro)
  pathCard: {
    title: 'THE MAIN PATH',
    lines: [
      ['star', 'WIN = +1 ★ · LOSE = −1 ★', 'Fill the stars to climb a division'],
      ['core', 'EVERY NEW ★ = A NEW CORE', 'The powers from your dream are waiting up there'],
      ['crown', 'BEAT THE AREA BOSS', 'Win their Ultimate and unlock the next Area'],
    ],
    foot: 'Your journey starts at the VILLAGE GREEN',
  },

  /* ---------- DREAM MATCH ---------- */
  match: {
    arena: 'dream',               // sân (tạo bên dưới từ sân 'stadium')
    role: 'FWD',                  // character đá ĐÁ CAO
    // character trong mơ: chỉ số "GOAT" (thay chỉ số thật) · Core không scale theo chỉ số (noScale)
    stats: { speed: 1.12, power: 1.2, pass: 1.12, tackle: 1.2, dribble: 1.15, accuracy: 1.15 },
    ovr: 99,
    mate: { name: 'ACE', cores: ['maestro'] },   // đồng đội: Core có sẵn
    presetCores: ['fire_shot'],                   // Core có sẵn của character (bài SÚT = cú sút lửa)
    // lượt chọn Core sau bàn đầu: 3 lá từ 3 trường phái -> trường phái chọn quyết định ULTIMATE ở lượt sau
    draftCores: ['thunder_kick', 'fist_storm', 'shadow_clone'],
    // trường phái -> Ultimate (thiếu thì lấy Ultimate đầu tiên cùng trường phái trong cores.config.js)
    ultOf: { striker: 'meteor_strike', brawler: 'hundred_fists', trickster: 'clone_army' },
    finalSeconds: 45,             // sau khi dùng Ultimate: bật đồng hồ còn bấy nhiêu giây (<= 30s = FINAL PUSH)
    moveDistance: 110,            // bài DI CHUYỂN: chạy đủ bấy nhiêu px
    stepGap: 0.9,                 // xong 1 bài: hiện "NICE!" bấy nhiêu giây rồi mới sang bài kế
    mateReturn: 0.55,             // bài CHUYỀN: đồng đội chuyền trả sau bấy nhiêu giây
    carrierPace: 0.5,             // bài PHÒNG NGỰ: đối thủ dắt bóng chậm (0..1)
    // AI đối thủ lúc đá thật (bài GHI BÀN + đá tự do)
    ai: { reaction: 0.45, tackleMult: 0.5, shotAccuracy: 0.45, aggression: 0.4, speedMult: 0.86 },
  },

  // đội đối thủ trong mơ (gộp vào SFC_CONFIG.teams.list)
  team: {
    id: 'dream_rivals',
    name: 'Shadow Rivals', short: 'SHD', tagline: 'THE DREAM', desc: 'Faceless rivals from a dream.',
    kit: { shirt: '#3a3550', shirtDark: '#1d1a2c', shorts: '#12101c', accent: '#b9a8ff', hair: ['#12101c', '#2a2440'] },
    stats: { speed: 0.9, power: 0.9, pass: 0.88, tackle: 0.85, dribble: 0.88, accuracy: 0.85 },
    coreWeights: {}, aiStyle: { light: 0.8, hard: 0.6 },
    players: ['SHADOW', 'ECHO'],
    looks: [{ cut: 'beanie', face: 'ninja', shoes: 'kicks', fx: 'nofx', skin: 3 }, { cut: 'bandana', face: 'mask', shoes: 'kicks', fx: 'nofx', skin: 3 }],
  },

  /* ---------- các bài trong trận ----------
   * title / text: hộp gợi ý trên cùng — chỉ nội dung chung (không phím)
   * prompts: phím hiện kiểu QTE trên đầu nhân vật: [action, nhãn, 'hold'?] — 'move' = cụm phím hướng.
   *   Phím đang giữ thì lún xuống. when: ball = chỉ khi bạn cầm bóng · defend = chỉ khi đối thủ cầm bóng
   * pulse: ô trên thanh kỹ năng nhấp nháy */
  steps: {
    move:    { title: 'MOVE', prompts: [['move', 'DRIBBLE'], ['sprint', 'SPRINT', 'hold']] },
    pass:    { title: 'PASS', prompts: [['pass', 'PASS']], when: 'ball' },
    shoot:   { title: 'SHOOT', prompts: [['shoot', 'SHOOT', 'hold']], when: 'ball' },
    defend:  { title: 'WIN IT BACK', text: 'NO RULES ON THE STREET', prompts: [['shoot', 'PUNCH'], ['lob', 'DROPKICK']], when: 'defend', pulse: ['light', 'hard'] },
    attack:  { title: 'GO SCORE', pulse: ['skill'] },   // phím né hiện ở QTE khi đối thủ gồng đá
    // tích Ultimate: show, don't tell — không chữ hướng dẫn, chỉ thanh năng lượng + nguồn nạp sáng lên khi vừa nạp
    charge:  { title: 'ULTIMATE', charge: true, pulse: ['ult'] },
    ult:     { title: 'ULTIMATE READY', prompts: [['ultimate', 'ULTIMATE']], gold: true, pulse: ['ult'] },
    final:   { title: 'FINISH THE DREAM', text: 'Complete the match' },
  },

  // QTE bài GO SCORE: đối thủ lao vào gồng Hard attack -> trận chạy chậm, hiện phím né to giữa màn
  qte: {
    triggerDist: 34,        // đối thủ cách bạn bấy nhiêu px thì bắt đầu gồng
    slow: 0.18,             // tốc độ trận lúc chờ bấm (1 = bình thường)
    immune: 0.8,            // bấm kịp: miễn đòn bấy nhiêu giây (dễ hơn trận thật)
    retry: 0.9,             // hụt: bấy nhiêu giây sau đối thủ lao vào lại
    label: 'DODGE!',
  },

  // bài tích Ultimate: năng lượng nạp nhân lên (đấm trúng 5% -> 20%, cướp bóng 12% -> 48%, ghi bàn 50% -> 100%)
  ultCharge: {
    mult: 4,
    // nguồn nạp (nhận ra theo lượng vừa nạp gốc, cores.config.js -> ultimate)
    sources: [['punch', 'PUNCH', 'gainLightHit'], ['steal', 'STEAL', 'gainSteal'], ['goal', 'GOAL', 'gainGoal'], ['conceded', 'CONCEDE', 'gainConceded']],
  },

  // ghi chú trên màn chọn Core
  draftNote: '*CORES* are superpowers. PICK 1 TO BE STRONGER!!!',   // *từ khoá* = tô vàng
  ultNote: 'Born from your {arch} build',
};

// đội + sân của trận mơ
(function () {
  const F = SFC_CONFIG.ftue, T = F.team;
  SFC_CONFIG.teams.list[T.id] = T;
  const base = SFC_CONFIG.arenas && SFC_CONFIG.arenas.stadium;
  if (base && !SFC_CONFIG.arenas.dream) {
    const a = JSON.parse(JSON.stringify(base));
    if (a.backdrop) { a.backdrop.screen = 'THE DREAM'; a.backdrop.screenColor = '#b9a8ff'; }
    SFC_CONFIG.arenas.dream = a;
  }
})();
