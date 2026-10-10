/* =========================================================
 * FTUE CONFIG — hướng dẫn người chơi mới (PROLOGUE). Code: src/ui/story.js (cut scene) + src/game/tutorial.js (trận mơ).
 *
 * Luồng: đặt tên xong -> cut scene "intro" ("I have a dream...") -> DREAM MATCH (trận hướng dẫn có kịch bản:
 * di chuyển -> chuyền -> sút -> chọn Core -> đấm cướp bóng -> ghi bàn -> mở ULTIMATE -> dùng Ultimate -> đá tự do tới hết giờ)
 * -> cut scene "outro" (tỉnh dậy ở VILLAGE GREEN -> ông nội trao BÍ KÍP GIA TRUYỀN = Tuyệt kỹ AURA FARMING (màn lật thẻ)
 *    -> cảnh biến hình + thử chiêu -> thẻ giới thiệu MAIN PATH) -> trang Main Path.
 * Hồ sơ cũ (đã xong PROLOGUE trước khi có bí kíp): lần mở game kế tiếp phát riêng cut scene "heirloom" 1 lần (Profile.data.tut.heirloom).
 * Core trong trận mơ chỉ là "mượn": hết mơ là mất, phải leo Main Path để mở khoá thật.
 * Hồ sơ lưu Profile.data.tut.done. SETTINGS > TEST > PROLOGUE: xem lại (chỉ bản dev).
 * ========================================================= */
window.SFC_CONFIG = window.SFC_CONFIG || {};

/* BÍ KÍP GIA TRUYỀN: ông nội ra sân làng, trao cuốn sổ bí kíp -> màn lật thẻ Tuyệt kỹ -> biến hình -> thử chiêu.
 * Cảnh có reveal: dừng cut scene, mở màn lật thẻ (src/ui/reveal.js) cho Core đó, đóng thẻ thì chạy tiếp.
 * GRANDPA: lời ông nội (caption) */
const SFC_FTUE_HEIRLOOM = [
  { art: 'grandpa', dur: 6.4, lines: [
    { at: 0.6, text: 'GRANDPA: Up before the roosters again? Dreaming of being the GOAT, huh?', style: 'caption' },
    { at: 3.6, text: 'GRANDPA: Heh. I had that same dream once. Come here, kid.', style: 'caption' },
  ] },
  { art: 'heirloom', dur: 10.5, lines: [
    { at: 0.5, text: 'GRANDPA: This is our family secret. My old man taught it to me on this very mud.', style: 'caption' },
    { at: 3.8, text: 'GRANDPA: Now it\'s yours, {name}. Take it with you on the road to your dream.', style: 'caption' },
    { at: 7.1, text: 'GRANDPA: Every time you fight for that dream... use it, and let the whole street see you shine.', style: 'caption' },
  ] },
  { art: 'reveal', reveal: true, dur: 0 },   // màn lật thẻ Tuyệt kỹ heirloom.core
  { art: 'transform', dur: 5.6, lines: [
    { at: 0.2, text: 'GRANDPA: Breathe in... feel it rise... now LET IT OUT!', style: 'caption' },
    { at: 2.05, text: 'AURA FARMING', style: 'aura' },
  ] },
  { art: 'auratest', dur: 6.2, lines: [
    { at: 0.3, text: 'Faster legs. Sharper passes. Harder shots...', style: 'caption' },
    { at: 3.4, text: 'GRANDPA: Ha! Not bad. The rest of the way... you earn on the Main Path.', style: 'caption' },
  ] },
];

SFC_CONFIG.ftue = {
  enabled: true,
  skipHold: 0.8,            // cut scene: giữ Enter / Esc bấy nhiêu giây để bỏ qua
  typeSpeed: 34,            // chữ gõ máy: ký tự / giây
  captionPace: 2,           // nhịp lời thoại: cảnh có caption dài ra + caption hiện muộn hơn bấy nhiêu lần (dur / at trong scenes là ở nhịp 1)

  /* ---------- CUT SCENE ----------
   * Mỗi cảnh: art (hàm vẽ trong story.js) · dur (giây; 0 = chờ Enter) · lines: [{ at, text, style }]
   * style: caption (hộp chữ đáy) · shout (chữ to giữa màn, rung) · title (chữ vàng đập xuống) · sub (dòng nhỏ dưới title)
   *        aura (tên Tuyệt kỹ vàng rực kiểu cut-in)
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
      ...SFC_FTUE_HEIRLOOM,
      { art: 'path', dur: 0 },   // thẻ giới thiệu MAIN PATH, chờ Enter
    ],
    // hồ sơ cũ (đã xong PROLOGUE trước khi có bí kíp): chỉ phát đoạn bí kíp, 1 lần
    heirloom: [{ art: 'village', dur: 3.0, lines: [{ at: 0.3, text: 'Another morning on the muddy field...', style: 'caption' }] }, ...SFC_FTUE_HEIRLOOM],
  },

  // Tuyệt kỹ khởi đầu ông nội trao (Core trong cores.config.js, có sẵn trong progression.starterCores)
  heirloom: { core: 'aura_farming', giver: 'Grandpa', band: "GRANDPA'S NOTEBOOK", stamp: 'FAMILY SECRET' },

  // thẻ MAIN PATH (cảnh cuối outro)
  pathCard: {
    title: 'THE MAIN PATH',
    lines: [
      ['star', 'RANKED · WIN = + ★', 'Lose and your ★ drop. Every match pays gold & XP'],
      ['crown', 'ENOUGH ★ = NEXT AREA', 'Each Area needs more ★, from the alleys to the World Stage'],
      ['core', 'NEW AREA = NEW ULTIMATE', 'The powers from your dream are waiting up there'],
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
    // AI đối thủ lúc đá tự do (bài cuối)
    ai: { reaction: 0.45, tackleMult: 0.5, shotAccuracy: 0.45, aggression: 0.4, speedMult: 0.86 },
    /* AI đối thủ theo bài: luôn đá như trận thật (chạy chỗ, áp sát, kèm người, cầm bóng thì dắt / chuyền / sút) —
     * chỉ hạ chỉ số lúc đang dạy để bạn hơn hẳn. aiSteps: bài -> bộ chỉ số trong aiProfiles (bài không có: dùng ai).
     * reaction / tackleMult / shotAccuracy / aggression / speedMult như mainpath.config.js ·
     * saveMult: nhân tỉ lệ cản phá khi đứng trông khung (thấp = cú sút của bạn dễ vào) */
    aiSteps: {
      move: 'teach', pass: 'teach', shoot: 'teach', draft1: 'teach', core: 'teach', attack: 'teach',
      defend: 'defend', draft2: 'charge', ultpick: 'charge', charge: 'charge', ult: 'charge',
    },
    aiProfiles: {
      // di chuyển / chuyền / sút / né: không ra đòn, không cướp hay cắt được bóng, chạy chậm, bắt bóng kém
      teach:  { reaction: 0.9, tackleMult: 0, shotAccuracy: 0.1, aggression: 0, speedMult: 0.5, saveMult: 0.25 },
      // đấm cướp bóng: cầm bóng dắt chậm, sút rất lệch, không đấm lại bạn
      defend: { reaction: 0.8, tackleMult: 0, shotAccuracy: 0.05, aggression: 0, speedMult: 0.55, saveMult: 0.4 },
      // tích + dùng Ultimate: có tranh chấp thật (thỉnh thoảng đấm / cướp lại) để bạn có cái mà đấm, cướp, ghi bàn
      charge: { reaction: 0.6, tackleMult: 0.35, shotAccuracy: 0.2, aggression: 0.25, speedMult: 0.7, saveMult: 0.5 },
    },
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
