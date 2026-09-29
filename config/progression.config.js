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
  // Level còn bị chặn theo tiến trình Main Path (mainpath.config.js -> areas[].levelCap): drill (= chỉ số) đi theo OVR của Area.
  // Đường cong XP phẳng để người thắng liên tục chạm trần gần cuối mỗi Area; thắng ~65% thì chạm trần sớm hơn (XP dư tích lại)
  maxLevel: 40,
  xpBase: 60,
  xpStep: 20,
  levelUpGold: 30,             // thưởng gold mỗi lần lên level

  // Chỉ số character + DRILL (docs/DRILL_DESIGN.md): mỗi level 1 drill = chọn 1 trong 3, cộng chỉ số vĩnh viễn.
  // Rating hiển thị = hệ số x scale (cùng thang OVR của màn giới thiệu trước trận, intro.config.js -> ovrScale).
  // Chỉ áp dụng ở Main Path + Luyện tập; online dùng chỉ số của đội như cũ.
  attrs: {
    base: 60,                  // rating khởi đầu (hệ số 0.75 — character mới yếu hơn đồng đội, 80 = hệ số 1.0)
    max: 99,
    scale: 80,                 // hệ số = 1 + (rating / scale - 1) x weight của từng key
    // DRILL: lên level +perLevel drill chờ; mỗi drill bốc `choices` lựa chọn, đổi cả bộ được `rerolls` lần
    drills: {
      perLevel: 1,
      choices: 3,
      rerolls: 1,
      upScreen: true,          // chọn xong: true = màn STRONGER! riêng (Enter để đi tiếp) · false = thanh chỉ số đầy ngay trên bảng YOU rồi tự sang bộ kế
      kindWeight: { single: 3, combo: 2, all: 0.6 },   // trọng số theo loại drill
      lean: 1.5,               // trọng số x (1 + lean x tỉ lệ bước đã tập nằm ở các chỉ số của drill) -> nghiêng theo build
      // gains: số bước (+rating) cộng vào từng chỉ số; icon / color (tuỳ chọn): poster riêng, mặc định theo chỉ số tăng nhiều nhất. 39 drill (LV1 -> LV40) x ~5.2 bước ≈ 200 bước: dàn đều ~93
      list: {
        sprint:   { name: 'Sprint Ladder', kind: 'single', gains: { pace: 5 },     desc: 'Quick feet through the ladder, then flat-out sprints.' },
        finish:   { name: 'Finishing',     kind: 'single', gains: { shooting: 5 }, desc: 'Shot after shot from every angle until the net gives up.' },
        rondo:    { name: 'Rondo',         kind: 'single', gains: { passing: 5 },  desc: 'Keep it moving in the circle. One touch, never lose it.' },
        slalom:   { name: 'Cone Slalom',   kind: 'single', gains: { dribble: 5 },  desc: 'Weave the cones with the ball glued to your feet.' },
        sparring: { name: 'Sparring',      kind: 'single', gains: { fight: 5 },    desc: 'Pads, footwork, and a lot of getting hit back.' },
        wall:     { name: 'Reaction Wall', kind: 'single', gains: { keeper: 5 },   desc: 'Balls fired off a wall. Catch them before they catch you.' },
        counter:  { name: 'Counter Run',   kind: 'combo',  gains: { pace: 3, dribble: 2 },    desc: 'Break forward with the ball at full speed.' },
        onetwo:   { name: 'One-Two',       kind: 'combo',  gains: { passing: 3, shooting: 2 }, desc: 'Give and go, then finish the move.' },
        volley:   { name: 'Volleys',       kind: 'combo',  gains: { shooting: 3, pace: 2 },   desc: 'Sprint onto the cross and hit it first time.' },
        keepups:  { name: 'Keep-Ups',      kind: 'combo',  gains: { dribble: 3, passing: 2 }, desc: 'Never let the ball touch the ground.' },
        scrap:    { name: 'Street Scrap',  kind: 'combo',  gains: { fight: 3, pace: 2 },     desc: 'Chase, shove, win it back. Repeat.' },
        duel:     { name: 'Penalty Duel',  kind: 'combo',  gains: { keeper: 3, fight: 2 },   desc: 'One on one in the box. Read them, then stand your ground.' },
        camp:     { name: 'Boot Camp',     kind: 'all',    icon: 'ui-boom', color: '#6bff4f', gains: { pace: 1, shooting: 1, passing: 1, dribble: 1, fight: 1, keeper: 1 }, desc: 'A bit of everything. Rare, and brutal.' },
      },
    },
    // keys: chỉ số trong trận (Player.stats) mà chỉ số này điều khiển, kèm độ mạnh (1 = đủ theo rating)
    // icon: icon pixel (src/render/pixelicons.js) in stencil trên poster màn DRILL · color: màu sơn (theo màu trường phái Core)
    list: {
      pace:     { label: 'PACE',     short: 'PAC', icon: 'ui-dash',        color: '#3ff6ff', keys: { speed: 1, stamina: 1 },   desc: 'Run speed on and off the ball. Stamina refills faster.' },
      shooting: { label: 'SHOOTING', short: 'SHO', icon: 'arch-striker',   color: '#ff7a3d', keys: { power: 1, accuracy: 1 }, desc: 'Shot speed and aim. Harder shots beat keepers more often.' },
      passing:  { label: 'PASSING',  short: 'PAS', icon: 'arch-playmaker', color: '#ffd23f', keys: { pass: 1 },               desc: 'Pass speed and accuracy. Sloppy S-passes drift less.' },
      dribble:  { label: 'DRIBBLE',  short: 'DRI', icon: 'arch-trickster', color: '#9d7bff', keys: { dribble: 1 },            desc: 'Speed with the ball, keeping it under punches, controlling fast balls.' },
      fight:    { label: 'FIGHT',    short: 'FIG', icon: 'ui-fist',        color: '#ff3d5a', keys: { tackle: 1, knock: 1 },   desc: 'Punch steal chance, pass interceptions, knockback of punches and kicks.' },
      keeper:   { label: 'KEEPER',   short: 'GK',  icon: 'res-guard',      color: '#6fa8dc', keys: { keeper: 1 },             desc: 'Save chance while standing in your own box.' },
    },
    order: ['pace', 'shooting', 'passing', 'dribble', 'fight', 'keeper'],
  },

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
    common:    { label: 'COMMON',    color: '#b0c3d9', value: 20 },
    rare:      { label: 'RARE',      color: '#4b69ff', value: 50 },
    epic:      { label: 'EPIC',      color: '#8847ff', value: 140 },
    legendary: { label: 'LEGENDARY', color: '#eb4b4b', value: 400 },
    mythic:    { label: 'MYTHIC',    color: '#e4ae39', value: 1200 },
  },
  rarityOrder: ['common', 'rare', 'epic', 'legendary', 'mythic'],

  // Màu miễn phí (chọn trong NHÂN VẬT) — màu da lấy từ SFC_CONFIG.teams.skins
  hairColors: ['#1a1216', '#3b2415', '#8a4b22', '#f2d16b', '#e8ecf5', '#ff3d5a', '#3ff6ff', '#9d7bff', '#6bff4f'],

  // Costume, phối tự do. slot: hair (tóc / mũ) · face (mặt) · shoes (giày) · fx (hiệu ứng khi chạy)
  // default: true = có sẵn, không nằm trong hộp, không phân rã được. Hình vẽ ở src/render/sprites.js (theo id).
  slots: {
    hair:  { label: 'HAIR & HATS' },
    face:  { label: 'FACE' },
    shoes: { label: 'SHOES' },
    fx:    { label: 'TRAIL FX' },
  },
  // Mỗi slot 20 món: 1–2 mặc định · ~6–7 THƯỜNG · ~5 HIẾM · 4 SỬ THI · 2–3 HUYỀN THOẠI · 1 THẦN THOẠI
  items: {
    /* ---------- TÓC & MŨ ---------- */
    classic:   { slot: 'hair', name: 'Headband',       default: true, desc: 'Short hair + a headband in team colors. The classic.' },
    buzz:      { slot: 'hair', name: 'Buzz Cut',       default: true, desc: 'Clean shave, nothing in the way.' },
    spiky:     { slot: 'hair', name: 'Spiky Hair',     rarity: 'common', desc: 'Standing straight up like you just got struck by lightning.' },
    cap:       { slot: 'hair', name: 'Snapback',       rarity: 'common', desc: 'Street cap, the brim follows where you look.' },
    beanie:    { slot: 'hair', name: 'Beanie',         rarity: 'common', desc: 'Red knit beanie with a pom-pom.' },
    bowl:      { slot: 'hair', name: 'Bowl Cut',       rarity: 'common', desc: 'Perfectly straight fringe. Cut at home.' },
    bun:       { slot: 'hair', name: 'Top Bun',        rarity: 'common', desc: 'Tied up tight on top, ready to fight.' },
    longhair:  { slot: 'hair', name: 'Ponytail',       rarity: 'common', desc: 'Long hair in a ponytail that swings with every step.' },
    bucket:    { slot: 'hair', name: 'Bucket Hat',     rarity: 'common', desc: 'Khaki bucket hat. Certified baller.' },
    mohawk:    { slot: 'hair', name: 'Mohawk',         rarity: 'rare', desc: 'One strip of hair standing tall. Punk!' },
    bandana:   { slot: 'hair', name: 'Bandana',        rarity: 'rare', desc: 'Head wrap with the tails flapping behind.' },
    headphones:{ slot: 'hair', name: 'Headphones',     rarity: 'rare', desc: 'Music too loud to hear the ref.' },
    helmet:    { slot: 'hair', name: 'Helmet',         rarity: 'rare', desc: 'Safety first. Especially when you get dropkicked.' },
    afro:      { slot: 'hair', name: 'Afro',           rarity: 'epic', desc: 'Big fluffy hair, twice the size of your head.' },
    cowboy:    { slot: 'hair', name: 'Cowboy Hat',     rarity: 'epic', desc: 'Wide brim, street-law justice.' },
    santa:     { slot: 'hair', name: 'Santa Hat',      rarity: 'epic', desc: 'Christmas all year round.' },
    viking:    { slot: 'hair', name: 'Viking Helm',    rarity: 'epic', desc: 'Horned iron helmet. Never retreat.' },
    halo:      { slot: 'hair', name: 'Halo',           rarity: 'legendary', desc: 'A floating ring of light. Angel of the pitch.' },
    flamehair: { slot: 'hair', name: 'Flame Hair',     rarity: 'legendary', desc: 'Your hair is literally on fire.' },
    crown:     { slot: 'hair', name: 'Crown',          rarity: 'mythic', desc: 'Only for the kings of the street.' },
    /* ---------- MẶT ---------- */
    none:      { slot: 'face', name: 'Bare Face',      default: true, desc: 'No accessories.' },
    bandaid:   { slot: 'face', name: 'Band-Aid',       rarity: 'common', desc: 'Souvenir from a heated match.' },
    mustache:  { slot: 'face', name: 'Mustache',       rarity: 'common', desc: 'Mustache matching your hair color.' },
    blush:     { slot: 'face', name: 'Blush',          rarity: 'common', desc: 'Shy, but kicks really hard.' },
    freckles:  { slot: 'face', name: 'Freckles',       rarity: 'common', desc: 'Earned in afternoon games under the sun.' },
    beard:     { slot: 'face', name: 'Full Beard',     rarity: 'common', desc: 'Thick beard matching your hair. Instant veteran.' },
    nerd:      { slot: 'face', name: 'Nerd Glasses',   rarity: 'common', desc: 'Round black frames. Reads the game like a book.' },
    scar:      { slot: 'face', name: 'Scar',           rarity: 'common', desc: 'A scar across the eye. Nobody dares to ask.' },
    shades:    { slot: 'face', name: 'Shades',         rarity: 'rare', desc: 'Cool. No explanation needed.' },
    mask:      { slot: 'face', name: 'Face Mask',      rarity: 'rare', desc: 'Mysterious. Nobody knows who you are.' },
    clown:     { slot: 'face', name: 'Clown Nose',     rarity: 'rare', desc: 'Round red nose. They laugh, you score.' },
    goldtooth: { slot: 'face', name: 'Gold Tooth',     rarity: 'rare', desc: 'One smile and it flashes.' },
    warpaint:  { slot: 'face', name: 'War Paint',      rarity: 'rare', desc: 'Painted stripes on both cheeks before battle.' },
    eyepatch:  { slot: 'face', name: 'Eyepatch',       rarity: 'epic', desc: 'Pirate of the pitch.' },
    monocle:   { slot: 'face', name: 'Monocle',        rarity: 'epic', desc: 'Street gentleman, gold chain included.' },
    ninja:     { slot: 'face', name: 'Ninja Mask',     rarity: 'epic', desc: 'Covers everything but the eyes.' },
    cyborg:    { slot: 'face', name: 'Cyborg Eye',     rarity: 'epic', desc: 'One eye replaced by a red scanner.' },
    visor:     { slot: 'face', name: 'Neon Visor',     rarity: 'legendary', desc: 'Glowing cyber visor.' },
    skull:     { slot: 'face', name: 'Skull Mask',     rarity: 'legendary', desc: 'One look and their knees shake.' },
    lasereyes: { slot: 'face', name: 'Laser Eyes',     rarity: 'mythic', desc: 'Glowing red eyes that fire lasers forward.' },
    /* ---------- GIÀY ---------- */
    kicks:     { slot: 'shoes', name: 'White Sneakers', default: true, desc: 'Everyone\'s favorite pair.' },
    slides:    { slot: 'shoes', name: 'Slides',         rarity: 'common', desc: 'Playing football in slides. Peak street.' },
    reds:      { slot: 'shoes', name: 'Red Kicks',      rarity: 'common', desc: 'Bright red, white soles.' },
    canvas:    { slot: 'shoes', name: 'Blue Canvas',    rarity: 'common', desc: 'Cheap canvas shoes that never die.' },
    boots:     { slot: 'shoes', name: 'Leather Boots',  rarity: 'common', desc: 'Brown high boots. Every step lands solid.' },
    barefoot:  { slot: 'shoes', name: 'Barefoot',       rarity: 'common', desc: 'No shoes. Childhood memories.' },
    rainboot:  { slot: 'shoes', name: 'Rain Boots',     rarity: 'common', desc: 'Bright yellow. Flooded pitch? No problem.' },
    socks:     { slot: 'shoes', name: 'Tube Socks',     rarity: 'rare', desc: 'Striped socks pulled high + black shoes.' },
    hightop:   { slot: 'shoes', name: 'High-Tops',      rarity: 'rare', desc: 'Black high-tops, orange soles.' },
    clogs:     { slot: 'shoes', name: 'Wooden Clogs',   rarity: 'rare', desc: 'Clip-clop on the concrete.' },
    rollers:   { slot: 'shoes', name: 'Roller Skates',  rarity: 'rare', desc: 'Wheels under the soles. Skate instead of run.' },
    cleats:    { slot: 'shoes', name: 'Cleats',         rarity: 'rare', desc: 'Green football boots with studs that grip.' },
    neonkick:  { slot: 'shoes', name: 'Neon Kicks',     rarity: 'epic', desc: 'Glow neon green in the dark.' },
    camo:      { slot: 'shoes', name: 'Camo Kicks',     rarity: 'epic', desc: 'Army pattern. Invisible in the bushes.' },
    rainbowkick:{ slot: 'shoes', name: 'Rainbow Kicks', rarity: 'epic', desc: 'Changes color with every step.' },
    mismatch:  { slot: 'shoes', name: 'Mismatched',     rarity: 'epic', desc: 'One red, one blue. On purpose.' },
    goldboot:  { slot: 'shoes', name: 'Golden Boots',   rarity: 'legendary', desc: 'Cast in gold, sparkling.' },
    iceboot:   { slot: 'shoes', name: 'Ice Boots',      rarity: 'legendary', desc: 'Carved from eternal ice, breathing cold mist.' },
    rocket:    { slot: 'shoes', name: 'Rocket Boots',   rarity: 'legendary', desc: 'Blue flames blasting from the soles.' },
    flame:     { slot: 'shoes', name: 'Flame Boots',    rarity: 'mythic', desc: 'Heels on fire.' },
    /* ---------- HIỆU ỨNG (khi chạy) ---------- */
    nofx:      { slot: 'fx', name: 'None',             default: true, desc: 'No effect.' },
    sparkle:   { slot: 'fx', name: 'Sparkles',         rarity: 'common', desc: 'Tiny sparkles twinkling around you.' },
    bubbles:   { slot: 'fx', name: 'Bubbles',          rarity: 'common', desc: 'Soap bubbles floating up behind you.' },
    leaves:    { slot: 'fx', name: 'Leaves',           rarity: 'common', desc: 'Green leaves swirling in the wind.' },
    hearts:    { slot: 'fx', name: 'Hearts',           rarity: 'common', desc: 'Dropping hearts everywhere you run.' },
    snow:      { slot: 'fx', name: 'Snowfall',         rarity: 'common', desc: 'Snowflakes drifting around you.' },
    smoke:     { slot: 'fx', name: 'Smoke',            rarity: 'common', desc: 'Running so fast you start smoking.' },
    dust:      { slot: 'fx', name: 'Street Dust',      rarity: 'rare', desc: 'Dust kicked up under your feet.' },
    notes:     { slot: 'fx', name: 'Music Notes',      rarity: 'rare', desc: 'Every step is a note.' },
    confetti:  { slot: 'fx', name: 'Confetti',         rarity: 'rare', desc: 'Celebrating before you even score.' },
    petals:    { slot: 'fx', name: 'Sakura',           rarity: 'rare', desc: 'Pink petals falling with every step.' },
    coins:     { slot: 'fx', name: 'Coin Rain',        rarity: 'rare', desc: 'Gold coins flying off as you run. Rich!' },
    neon:      { slot: 'fx', name: 'Neon Trail',       rarity: 'epic', desc: 'A neon green streak following you.' },
    frost:     { slot: 'fx', name: 'Frost',            rarity: 'epic', desc: 'Leaves a sparkling ice trail on the pitch.' },
    lightning: { slot: 'fx', name: 'Lightning',        rarity: 'epic', desc: 'Electric sparks crackling around you.' },
    rainbow:   { slot: 'fx', name: 'Rainbow',          rarity: 'epic', desc: 'Drags a rainbow behind you.' },
    fire:      { slot: 'fx', name: 'Fire Steps',       rarity: 'legendary', desc: 'Everywhere you run catches fire.' },
    shadow:    { slot: 'fx', name: 'Phantom',          rarity: 'legendary', desc: 'Your own purple shadow chases after you.' },
    galaxy:    { slot: 'fx', name: 'Galaxy',           rarity: 'legendary', desc: 'Stardust sprinkled with every step.' },
    aura:      { slot: 'fx', name: 'Golden Aura',      rarity: 'mythic', desc: 'A golden glow always shining under your feet.' },
  },
  defaultLook: { hair: 'classic', face: 'none', shoes: 'kicks', fx: 'nofx', skin: 0, hairColor: 0 },

  // TẠM TẮT gacha Core: mọi Core dùng được ngay cho mọi người chơi (không cần quay / level), Hộp Core ẩn khỏi SHOP.
  // Core đã quay được trước đó vẫn giữ trong hồ sơ. Bật lại = true.
  coreGacha: false,

  // Bộ Core có sẵn cho user mới (8 Core THƯỜNG đủ 7 trường phái + 4 HIẾM). Core khác mở theo Main Path (mainpath.config.js -> areas[].cores / signature),
  // hoặc lấy từ Hộp Core khi coreGacha bật.
  // level (khi coreGacha bật) = level tối thiểu để Core quay được xuất hiện khi chọn Core giữa trận (chưa đủ thì nằm chờ trong túi đồ).
  // Độ hiếm của Core lấy từ config/cores.config.js (rarity) — dùng chung cho gacha và tần suất khi chọn Core.
  starterCores: ['sniper_foot', 'speed_demon', 'quick_feet', 'street_fighter', 'iron_body', 'heavy_boot', 'maestro', 'eagle_eye',
    'banana_kick', 'counter_attack', 'fist_storm', 'one_touch'],
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
      name: 'Street Box', kind: 'costume', price: 100, level: 1, color: '#b0c3d9',
      desc: 'All kinds of costumes: hair, face, shoes, trail FX. Mostly commons, the occasional flash of gold.',
      odds: { common: 60, rare: 27, epic: 10, legendary: 2.5, mythic: 0.5 },
    },
    legend: {
      name: 'Legend Box', kind: 'costume', price: 450, level: 6, color: '#eb4b4b',
      desc: 'RARE costumes and up only. Much better odds for red and gold drops.',
      odds: { rare: 50, epic: 32, legendary: 14, mythic: 4 },
    },
    core: {
      name: 'Core Box', kind: 'core', price: 220, level: 2, color: '#8847ff',
      desc: 'Unlocks new Core Upgrades for your mid-match draft pool. A Core needs the right level before you can use it.',
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
