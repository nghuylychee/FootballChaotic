/* =========================================================
 * CORES CONFIG — Core Upgrade (docs/CORE_DESIGN.md). Core áp dụng cho CẢ ĐỘI khi được chọn.
 *
 * Mỗi Core:
 *  tags   : trường phái — mỗi Core đúng 1 trường phái (bỏ Core cầu nối 2 hệ, user chốt 2026-10-13); Tuyệt kỹ lai có 2 —
 *           đếm cho công thức Tuyệt kỹ (ults) + trọng số khi chọn Core
 *  role   : gen / use (Core có hành vi) · base (chỉ số) · ult (TUYỆT KỸ — phím X) · wild (Hỗn loạn)
 *  rarity : common · rare · epic · legendary · mythic — dùng chung cho gacha (progression.config.js) và tần suất khi chọn Core
 *  mods   : hệ số nhân thụ động: speed, offBallSpeed, sprintRegen, shotPower, passSpeed,
 *           tackleRange (tầm Light), tackleChance (tỉ lệ Light làm rơi bóng), slideSpeed (bước Hard),
 *           knockback (Light + Hard), chargeTime, accuracy, surgeTime (thời gian chạy nước rút tới lúc TOÉ ĐIỆN), launch, hardCooldown,
 *           lightCooldown, skillCooldown, passAccuracy, interceptTaken (tỉ lệ bị cắt đường chuyền),
 *           dribble (giữ bóng: tốc độ dẫn bóng + khó bị đấm rơi bóng), keeperSave (tỉ lệ bắt bóng trong vòng cấm nhà)
 *  boost  : (Core chỉ số) id chỉ số trong progression.attrs.list — chỉ để vẽ dấu "+" màu chỉ số trên người (src/render/vfx.js)
 *  desc   : 1 câu ngắn 7–10 chữ, KHÔNG ghi số / {param} (user chốt 2026-10-11: người chơi không đọc số)
 *  params : tham số cho hành vi riêng (code ở src/systems/cores.js, map theo id)
 * ========================================================= */
window.SFC_CONFIG = window.SFC_CONFIG || {};

SFC_CONFIG.cores = {
  // 8 trường phái (Hỗn loạn có công thức Tuyệt kỹ như mọi hệ từ 2026-10-14)
  archetypes: {
    runner:    { label: 'SPEED',    icon: '🏃', color: '#3ff6ff', stat: 'pace' },
    playmaker: { label: 'TIKI-TAKA', icon: '🎼', color: '#ffd23f', stat: 'passing' },
    striker:   { label: 'STRIKER',   icon: '🎯', color: '#ff7a3d', stat: 'shooting' },
    brawler:   { label: 'BRAWLER',    icon: '🥊', color: '#ff3d5a', stat: 'fight' },
    launcher:  { label: 'KICKER',  icon: '🦵', color: '#b46bff', stat: 'fight' },
    trickster: { label: 'ILLUSION',    icon: '🌀', color: '#9d7bff', stat: 'dribble' },
    iron:      { label: 'IRON',      icon: '🛡', color: '#c7ccd6', stat: 'keeper' },
    chaos:     { label: 'CHAOS',  icon: '🎲', color: '#c63dff', stat: 'ovr' },
  },
  // Core scale theo chỉ số (src/systems/corescale.js): rating min -> anchor -> max = độ mạnh / hồi chiêu (nội suy từng đoạn).
  // anchor = rating của đồng đội / đội AI chỉ số 1.0 (mức cân bằng gốc của Core). stat của trường phái ở archetypes[].stat
  statScale: { min: 60, anchor: 80, max: 99, power: [0.5, 1, 1.5], cooldown: [1.3, 1, 0.7] },
  roleLabels: { gen: 'ACTIVE', use: 'ACTIVE', base: 'PASSIVE', ult: 'ULTIMATE', wild: 'WILD' },   // chỉ hiện ở sandbox

  // ĐÃ BỎ tài nguyên trường phái (Đà / Nhịp / Nộ / Giáp — docs/ULT_RECIPE.md). Core kích hoạt bằng trạng thái nhìn thấy được.
  // TOÉ ĐIỆN: chạy nước rút liên tục time giây (người có Core TỐC ĐỘ) -> người toé điện, nhanh hơn speed.
  // Phá Âm Chướng / Húc Xe Tải / Phi Cước dùng trạng thái này. Mods surgeTime (Quỷ Tốc Độ) rút ngắn thời gian
  surge: { time: 1.2, speed: 1.06 },
  chargedShot: 0.6,          // "Sút tụ lực" = giữ >= 60% thanh lực

  // TUYỆT KỸ THEO CÔNG THỨC (docs/ULT_RECIPE.md, thay cho Cộng hưởng 2/3/4): đếm Core cùng trường phái của từng cầu thủ
  // (Tuyệt kỹ không tính). Đạt mốc tiers[i] của trường phái X -> Tuyệt kỹ base[X] cấp i+1
  // (user chốt 2026-10-13: X3 = Tuyệt kỹ gốc, X4 = dạng nâng cấp ★★, tham số ở list[id].evolve[0]).
  // hybrids: { id, tags: [X, Y] } = Tuyệt kỹ lai, mở khi đạt hybridTier Core của CẢ X và Y (X2 + Y2; đủ 28 cặp của 8 trường phái).
  // Nhiều công thức cùng thoả: công thức dùng nhiều Core hơn thắng; bằng nhau -> công thức vừa đạt (lá vừa chọn).
  // Chưa đạt công thức nào: start (null = chưa có Tuyệt kỹ, ô X ẩn; năng lượng vẫn nạp ngầm để vừa mở là dùng được).
  // Mọi Tuyệt kỹ giấu tới khi người chơi tự đạt (Profile.data.ultBook)
  ults: {
    start: null,   // AURA FARMING tạm ẩn (user chốt 2026-10-13): Tuyệt kỹ chỉ có khi đạt mốc
    tiers: [3, 4],
    hybridTier: 2,
    base: {
      runner: 'lightning_dash', playmaker: 'endless_tiki', striker: 'meteor_strike', brawler: 'hundred_fists',
      launcher: 'meteor_drop', trickster: 'clone_army', iron: 'titan', chaos: 'chaos_roulette',
    },
    // Tuyệt kỹ lai (user duyệt 2026-10-13): 7 cặp từng có Core cầu nối + Slingshot, rồi 13 cặp còn lại. Hành vi ở src/systems/cores-hybrid.js
    hybrids: [
      { id: 'comet_onetwo', tags: ['striker', 'playmaker'] },
      { id: 'rising_dragon', tags: ['brawler', 'launcher'] },
      { id: 'comet_dropkick', tags: ['runner', 'launcher'] },
      { id: 'phantom_barrage', tags: ['trickster', 'striker'] },
      { id: 'steel_formation', tags: ['iron', 'playmaker'] },
      { id: 'iron_hammer', tags: ['brawler', 'iron'] },
      { id: 'mirage_sprint', tags: ['runner', 'trickster'] },
      { id: 'slingshot', tags: ['brawler', 'playmaker'] },
      // 13 cặp còn lại (user duyệt 2026-10-14) -> đủ 21 cặp, 2 + 2 nào cũng ra Tuyệt kỹ
      { id: 'lightning_relay', tags: ['runner', 'playmaker'] },
      { id: 'flash_strike', tags: ['runner', 'striker'] },
      { id: 'thunder_rush', tags: ['runner', 'brawler'] },
      { id: 'steel_express', tags: ['runner', 'iron'] },
      { id: 'sky_volley', tags: ['playmaker', 'launcher'] },
      { id: 'ghost_pass', tags: ['playmaker', 'trickster'] },
      { id: 'knockout_volley', tags: ['striker', 'brawler'] },
      { id: 'cannonball', tags: ['striker', 'launcher'] },
      { id: 'wrecking_ball', tags: ['striker', 'iron'] },
      { id: 'shadow_ambush', tags: ['brawler', 'trickster'] },
      { id: 'crossfire_kicks', tags: ['launcher', 'trickster'] },
      { id: 'iron_quake', tags: ['launcher', 'iron'] },
      { id: 'mirror_wall', tags: ['trickster', 'iron'] },
      // Hỗn loạn + 7 hệ còn lại (2026-10-14) -> đủ 28 cặp của 8 trường phái
      { id: 'wormhole_dash', tags: ['chaos', 'runner'] },
      { id: 'wild_pass', tags: ['chaos', 'playmaker'] },
      { id: 'jackpot_shot', tags: ['chaos', 'striker'] },
      { id: 'wild_haymaker', tags: ['chaos', 'brawler'] },
      { id: 'pinball_kick', tags: ['chaos', 'launcher'] },
      { id: 'shell_game', tags: ['chaos', 'trickster'] },
      { id: 'iron_dice', tags: ['chaos', 'iron'] },
    ],
  },

  // Tuyệt kỹ: năng lượng chỉ nạp khi ghi bàn hoặc cướp được bóng
  // Luật Tuyệt kỹ (user duyệt 2026-10-13): needsBall = chỉ bấm được khi đội mình đang cầm bóng (không bao giờ giật bóng);
  // mọi đòn của Tuyệt kỹ có báo trước sau cut-in (telegraph) và né được bằng Z; trạng thái bất khả xâm phạm ngắn.
  // Năng lượng Tuyệt kỹ (X), 0..1: ghi bàn · bị thủng lưới · cướp bóng (tối đa 1 lần / stealCooldown giây) ·
  // đấm trúng đối thủ bằng Light attack (tối đa 1 lần / lightHitCooldown giây). lockout: dùng xong bao lâu không nạp
  ultimate: { gainGoal: 0.5, gainConceded: 0.3, gainSteal: 0.12, stealCooldown: 3, gainLightHit: 0.05, lightHitCooldown: 1, lockout: 10, cutIn: 0.6, aiDelay: [0.5, 2.5] },

  // Chọn Core: trọng số = độ hiếm x (1 + buildWeight x số Core cùng trường phái đang có) x thiên hướng đội.
  // KHÔNG bảo đảm có lá cùng hướng (user bỏ 2026-10-13): ra đúng build phải là cảm giác may mắn, không phải chắc chắn.
  draft: {
    rarityWeight: { common: 3, rare: 2, epic: 1.2, legendary: 0.7, mythic: 0.5 },
    buildWeight: 0.8,
    rerollsPerRound: 1,      // mỗi lượt chọn được đổi cả 3 lá bao nhiêu lần (0 = ẩn nút REROLL) — bật lại 2026-10-13
  },

  list: {
    /* ---------- CORE CHỈ SỐ — THƯỜNG, có sẵn: mỗi trường phái 1 lá tăng chỉ số (chỉ số character đang ẩn, progression.attrs.hidden).
     * Đi qua mods nên online / dự đoán chuyển động ở máy khách tự đúng. Hình: dấu "+" màu chỉ số bay lên trên người (boost) ---------- */
    leg_day: {
      name: 'Leg Day', icon: '🦵', tags: ['runner'], role: 'base', rarity: 'common', boost: 'pace',
      desc: 'Run faster and get your stamina back quicker.',
      mods: { speed: 1.07, sprintRegen: 1.25 },
      scale: { 'm.speed': 'mul', 'm.sprintRegen': 'mul' },
    },
    cannon_leg: {
      name: 'Cannon Leg', icon: '💥', tags: ['striker'], role: 'base', rarity: 'common', boost: 'shooting',
      desc: 'Harder, more accurate shots every time you kick.',
      mods: { shotPower: 1.1, accuracy: 1.2 },
      scale: { 'm.shotPower': 'mul', 'm.accuracy': 'mul' },
    },
    silk_pass: {
      name: 'Silk Passing', icon: '🧵', tags: ['playmaker'], role: 'base', rarity: 'common', boost: 'passing',
      desc: 'Faster, cleaner passes that find their target.',
      mods: { passSpeed: 1.1, passAccuracy: 1.25 },
      scale: { 'm.passSpeed': 'mul', 'm.passAccuracy': 'mul' },
    },
    close_control: {
      name: 'Close Control', icon: '🧲', tags: ['trickster'], role: 'base', rarity: 'common', boost: 'dribble',
      desc: 'Ball sticks to your feet, hard to punch loose.',
      mods: { dribble: 1.25 },
      scale: { 'm.dribble': 'mul' },
    },
    heavy_hands: {
      name: 'Heavy Hands', icon: '✊', tags: ['brawler'], role: 'base', rarity: 'common', boost: 'fight',
      desc: 'Longer punches that knock the ball loose more often.',
      mods: { tackleChance: 1.2, tackleRange: 1.1 },
      scale: { 'm.tackleChance': 'mul', 'm.tackleRange': 'mul' },
    },
    thunder_thighs: {
      name: 'Thunder Thighs', icon: '🍗', tags: ['launcher'], role: 'base', rarity: 'common', boost: 'fight',
      desc: 'Hard attacks launch further and recharge faster.',
      mods: { launch: 1.15, hardCooldown: 0.88 },
      scale: { 'm.launch': 'mul', 'm.hardCooldown': 'cd' },
    },
    safe_hands: {
      name: 'Safe Hands', icon: '🧤', tags: ['iron'], role: 'base', rarity: 'common', boost: 'keeper',
      desc: 'Save more shots while standing in your own box.',
      mods: { keeperSave: 1.15 },
      scale: { 'm.keeperSave': 'mul' },
    },

    /* ---------- 🎯 SÁT THỦ ---------- */
    sniper_foot: {
      name: 'Sharpshooter', icon: '🎯', tags: ['striker'], role: 'base', rarity: 'common',
      desc: 'Pinpoint shots. Hold D to aim with a laser.',
      mods: { accuracy: 1.6 },
      params: { frictionMult: 0.35, speedMult: 0.85, aiRangeMult: 1.5 },
      scale: { 'm.accuracy': 'mul' },
    },
    banana_kick: {
      name: 'Dragon Curl', icon: '🐉', tags: ['striker'], role: 'gen', rarity: 'rare',
      desc: 'Shots curl toward the corner on a green dragon.',
      params: { strength: 2.4 },
      scale: { strength: 'pow' },
    },
    fire_shot: {
      name: 'Fireball', icon: '🔥', tags: ['striker'], role: 'gen', rarity: 'rare',
      desc: 'Charged shots set the pitch on fire behind them.',
      mods: { shotPower: 1.12 },
      params: { trailInterval: 0.035, trailDuration: 2.6, trailRadius: 6, stun: 0.9, knockback: 150 },
      scale: { 'm.shotPower': 'mul', stun: 'pow', knockback: 'pow', trailDuration: 'pow' },
    },
    thunder_kick: {
      name: 'Thunder Kick', icon: '⚡', tags: ['striker'], role: 'gen', rarity: 'legendary',
      desc: 'Long charge: a lightning ball pierces and stuns a defender.',
      mods: { chargeTime: 1.2 },
      params: { minCharge: 0.6, pierce: 1, speedMult: 1.2, stun: 0.7, gkPenalty: 0.25 },
      scale: { stun: 'pow', gkPenalty: 'pow', speedMult: 'mul' },
    },

    /* ---------- 🏃 TỐC ĐỘ · 🌀 ẢO ẢNH ---------- */
    speed_demon: {
      name: 'Speed Demon', icon: '🪽', tags: ['runner'], role: 'gen', rarity: 'common',
      desc: 'Quicker off the ball, and you crackle sooner.',
      mods: { offBallSpeed: 1.05, surgeTime: 0.5 },
      scale: { 'm.offBallSpeed': 'mul', 'm.surgeTime': 'cd' },
    },
    phantom_step: {
      name: 'Phantom Step', icon: '🌀', tags: ['trickster'], role: 'gen', rarity: 'rare',
      desc: 'Z teleports further and leaves a decoy that lures defenders.',
      params: { distance: 34, illusion: 1.2, lureRadius: 60, lure: 0.4, lureCooldown: 4 },
      scale: { distance: 'pow', illusion: 'pow', lure: 'pow', lureCooldown: 'cd' },
    },
    fake_run: {
      name: 'Fake Run', icon: '🪞', tags: ['trickster'], role: 'gen', rarity: 'rare',
      desc: 'Sprint or Z on the ball sends a fake running away.',
      params: { cooldown: 3.5, duration: 1.6, confuseRadius: 90, confuseTime: 1.2, angle: 0.8, momentum: 2 },
      scale: { cooldown: 'cd', duration: 'pow', confuseTime: 'pow' },
    },

    /* ---------- 🥊 ĐẤU SĨ · 🛡 THÉP · 🦵 VÕ SĨ ĐÁ ---------- */
    street_fighter: {
      name: 'Street Fighter', icon: '🥊', tags: ['brawler'], role: 'gen', rarity: 'common',
      desc: 'Longer, harder punches with big comic-book hits.',
      mods: { tackleRange: 1.3, tackleChance: 1.3, knockback: 1.3 },
      scale: { 'm.tackleRange': 'mul', 'm.tackleChance': 'mul', 'm.knockback': 'mul' },
    },
    iron_body: {
      name: 'Iron Skin', icon: '🛡', tags: ['iron'], role: 'gen', rarity: 'common',
      desc: 'Shorter stuns, and hits knock you back less.',
      params: { stun: 0.65, knock: 0.6 },
      scale: { stun: 'cd', knock: 'cd' },
    },
    blade_runner: {
      name: 'Wind Blade', icon: '🌙', tags: ['launcher'], role: 'gen', rarity: 'legendary',
      desc: 'Hard attack fires a wind blade: stun, ball drops.',
      params: { speed: 300, life: 0.5, length: 18, stun: 0.9 },
      scale: { stun: 'pow' },
    },

    /* ---------- 🛡 THÉP · 🎼 TIKI-TAKA ---------- */
    aegis_wall: {
      name: 'Aegis Shield', icon: '🧱', tags: ['iron'], role: 'base', rarity: 'legendary',
      desc: 'A shield on your goal line blocks one shot.',
      params: { cooldown: 60 },
      scale: { cooldown: 'cd' },
    },
    counter_attack: {
      name: 'Counter Attack', icon: '↩', tags: ['brawler'], role: 'gen', rarity: 'rare',
      desc: 'Win the ball: your whole team speeds up and hits harder.',
      params: { duration: 3.5, speedMult: 1.2, shotMult: 1.2, calloutCd: 15 },
      scale: { duration: 'pow', speedMult: 'mul', shotMult: 'mul' },
    },
    emp_trap: {
      name: 'EMP Mine', icon: '📡', tags: ['iron'], role: 'gen', rarity: 'epic',
      desc: 'Attacks drop EMP mines that stun and steal the ball.',
      params: { cooldown: 2.5, max: 3, life: 14, radius: 9, arm: 0.5, stun: 1.0 },
      scale: { stun: 'pow', radius: 'pow', cooldown: 'cd' },
    },
    maestro: {
      name: 'Maestro', icon: '🎼', tags: ['playmaker'], role: 'gen', rarity: 'common',
      desc: 'Faster passes; the receiver gets a speed boost.',
      mods: { passSpeed: 1.2 },
      params: { duration: 1.5, speedMult: 1.25 },
      scale: { 'm.passSpeed': 'mul', duration: 'pow', speedMult: 'mul' },
    },

    /* ---------- TUYỆT KỸ (phím X) ---------- */
    // Tuyệt kỹ thí điểm (Giai đoạn 1) — kiểm tra khung năng lượng + phím X; các Tuyệt kỹ khác ở Giai đoạn 3
    lightning_dash: {
      name: 'Lightning Dash', icon: '⚡', tags: ['runner'], role: 'ult', rarity: 'mythic',
      desc: 'Dash as lightning with the ball, shocking everyone you pass.',
      params: { distance: 190, width: 18, stun: 0.8, knock: 140, bolts: 3, telegraph: 0.35 },
      evolve: [{ distance: 300, width: 30, stun: 1.2, knock: 220, bolts: 7 }],
      scale: { distance: 'pow', stun: 'pow', knock: 'pow' },
    },

    /* ================= Giai đoạn 3 — Core mới (hành vi ở src/systems/cores-new.js) ================= */
    /* ---------- 🏃 TỐC ĐỘ ---------- */
    burst_start: {
      name: 'Arrow Start', icon: '🏹', tags: ['runner'], role: 'gen', rarity: 'rare',
      desc: 'Start sprinting with an instant burst of speed.',
      params: { boost: 1.3, time: 0.35, cooldown: 3 },
      scale: { boost: 'mul', time: 'pow', cooldown: 'cd' },
    },
    sonic_boom: {
      name: 'Sonic Boom', icon: '💥', tags: ['runner'], role: 'use', rarity: 'epic',
      desc: 'Crackling on the ball: blast away defenders you brush past.',
      params: { gap: 14, knock: 180, launch: 70, stun: 0.35, cooldown: 10 },
      scale: { knock: 'pow', launch: 'pow', stun: 'pow', cooldown: 'cd' },
    },
    freight_train: {
      name: 'Freight Train', icon: '🚚', tags: ['runner'], role: 'use', rarity: 'epic',
      desc: 'Crackling: charge into someone and send them flying.',
      params: { minSpeed: 90, knock: 190, launch: 120, stun: 0.4, cooldown: 15 },
      scale: { knock: 'pow', launch: 'pow', stun: 'pow', cooldown: 'cd' },
    },

    /* ---------- 🎼 TIKI-TAKA ---------- */
    eagle_eye: {
      name: 'Eagle Eye', icon: '🦅', tags: ['playmaker'], role: 'base', rarity: 'common',
      desc: 'Shows your pass line; passes are harder to intercept.',
      mods: { passAccuracy: 1.6, interceptTaken: 0.7 },
      scale: { 'm.passAccuracy': 'mul', 'm.interceptTaken': 'mul' },
    },
    one_touch: {
      name: 'One Touch', icon: '✨', tags: ['playmaker'], role: 'gen', rarity: 'rare',
      desc: 'Quick first-time passes ghost right through opponents.',
      params: { window: 0.6 },
      scale: { window: 'pow' },
    },
    phantom_pass: {
      name: 'Phantom Pass', icon: '💫', tags: ['playmaker'], role: 'use', rarity: 'epic',
      desc: 'First-time through balls become an unstoppable golden beam.',
      params: { window: 0.8, cooldown: 5, speedMult: 1.3, boost: 1.3, time: 2 },
      scale: { boost: 'mul', time: 'pow' },
    },
    symphony: {
      name: 'Symphony', icon: '🎻', tags: ['playmaker'], role: 'use', rarity: 'epic',
      desc: 'Shoot after a passing chain for a near-unstoppable strike.',
      params: { min: 2, max: 5, powerPer: 0.08, gkPer: 0.05 },   // chuỗi chuyền của đội (Game.passChain) >= min; tính tối đa max đường
      scale: { powerPer: 'pow', gkPer: 'pow' },
    },

    /* ---------- 🎯 SÁT THỦ ---------- */
    energy_wave: {
      name: 'Energy Wave', icon: '🌊', tags: ['striker'], role: 'use', rarity: 'epic',
      desc: 'Big charged shot fires a beam that shoves defenders aside.',
      params: { minCharge: 0.8, len: 300, width: 18, knock: 300, stun: 0.8 },
      scale: { knock: 'pow', stun: 'pow' },
    },
    black_hole: {
      name: 'Black Hole Shot', icon: '🕳', tags: ['striker'], role: 'use', rarity: 'legendary',
      desc: 'Big charged shot turns the ball into a black hole.',
      params: { minCharge: 0.8, radius: 64, pull: 1500, time: 1.4 },
      scale: { radius: 'pow', pull: 'pow', time: 'pow' },
    },

    /* ---------- 🥊 ĐẤU SĨ ---------- */
    fist_storm: {
      name: 'Fist Storm', icon: '👊', tags: ['brawler'], role: 'gen', rarity: 'rare',
      desc: 'Every punch becomes a rapid flurry of hits.',
      mods: { lightCooldown: 1.1 },
      params: { hits: 4, gap: 0.07, range: 22, push: 220 },
      scale: { push: 'pow' },
    },
    giant_fist: {
      name: 'Giant Fist', icon: '✊', tags: ['brawler'], role: 'use', rarity: 'epic',
      desc: 'Your glowing fist lands a giant punch that always steals.',
      scale: { knock: 'pow', cooldown: 'cd' },
      params: { knock: 2.5, range: 2, cooldown: 8 },
    },

    /* ---------- 🦵 VÕ SĨ ĐÁ ---------- */
    heavy_boot: {
      name: 'Iron Boots', icon: '🥾', tags: ['launcher'], role: 'base', rarity: 'common',
      desc: 'Hard attacks reach further, launch harder and recharge faster.',
      mods: { launch: 1.3, hardCooldown: 0.8, hardWindup: 0.7, hardRange: 1.4 },
      scale: { 'm.launch': 'mul', 'm.hardCooldown': 'mul', 'm.hardWindup': 'mul', 'm.hardRange': 'mul' },
    },
    juggle: {
      name: 'Juggle', icon: '🤹', tags: ['launcher'], role: 'use', rarity: 'rare',
      desc: 'Punch airborne players to keep them in the air.',
      params: { lift: 200, stun: 0.7 },
      scale: { lift: 'pow', stun: 'pow' },
    },
    wall_slam: {
      name: 'Wall Slam', icon: '🏚', tags: ['launcher'], role: 'use', rarity: 'rare',
      desc: 'Launch opponents into walls for a long stun.',
      params: { stun: 1, ballSpeed: 170 },
      scale: { stun: 'pow' },
    },
    ground_slam: {
      name: 'Ground Slam', icon: '🌋', tags: ['launcher'], role: 'gen', rarity: 'epic',
      desc: 'Hard attack leaps into a slam that launches everyone nearby.',
      params: { jump: 150, leap: 130, maxSpeed: 300, radius: 52, knock: 160, launch: 230, stun: 1.1, recover: 0.12 },
      scale: { radius: 'pow', knock: 'pow', launch: 'pow', stun: 'pow' },
    },

    /* ---------- 🌀 ẢO ẢNH ---------- */
    quick_feet: {
      name: 'Ninja Footwork', icon: '🥷', tags: ['trickster'], role: 'base', rarity: 'common',
      desc: 'Shorter Z cooldown and a bigger dodge window.',
      mods: { skillCooldown: 0.7 },
      params: { dodgeBonus: 0.15 },
      scale: { 'm.skillCooldown': 'mul', dodgeBonus: 'pow' },
    },
    witch_time: {
      name: 'Perfect Dodge', icon: '⏳', tags: ['trickster'], role: 'use', rarity: 'epic',
      desc: 'Perfect dodge slows the pitch while you stay fast.',
      params: { scale: 0.35, time: 0.8, boost: 2.6, cooldown: 4 },
      scale: { time: 'pow', boost: 'mul' },
    },
    shadow_clone: {
      name: 'Shadow Clone', icon: '👥', tags: ['trickster'], role: 'gen', rarity: 'epic',
      desc: 'Z spawns clones that block opponents and passing lanes.',
      params: { count: 2, time: 2, speed: 170, spread: 0.7 },
      scale: { time: 'pow' },
    },

    /* ---------- 🛡 THÉP ---------- */
    bulldozer: {
      name: 'Bulldozer', icon: '🚜', tags: ['iron'], role: 'use', rarity: 'epic',
      desc: 'Hold the ball to grow huge and bowl them over.',
      params: { hold: 0.8, time: 3, cooldown: 6, scale: 1.3, slow: 0.88, knock: 170, launch: 80, stun: 0.3, every: 2 },
      scale: { knock: 'pow', launch: 'pow', stun: 'pow' },
    },
    giant_keeper: {
      name: 'Giant Keeper', icon: '🧤', tags: ['iron'], role: 'use', rarity: 'epic',
      desc: 'Your keeper grows huge when the ball nears goal.',
      params: { scale: 1.4, near: 150 },
      scale: { scale: 'mul', near: 'pow' },
    },

    /* ---------- 🔗 Cầu nối ---------- */
    rubber_arm: {
      name: 'Rubber Arm', icon: '🤜', tags: ['brawler'], role: 'use', rarity: 'epic',
      desc: 'Stretchy punches pull players in or grab loose balls.',
      params: { reach: 50, pull: 180, stun: 0.4, steal: 0.25, cooldown: 2 },
      scale: { reach: 'pow', pull: 'pow', stun: 'pow', steal: 'pow', cooldown: 'cd' },
    },
    uppercut: {
      name: 'Dragon Uppercut', icon: '🐲', tags: ['brawler'], role: 'use', rarity: 'rare',
      desc: 'Two quick punches in a row: the second launches them.',
      params: { launch: 330, jump: 80, window: 1.2, cooldown: 4 },
      scale: { launch: 'pow', cooldown: 'cd' },
    },
    iron_fist: {
      name: 'Iron Fist', icon: '🦾', tags: ['iron'], role: 'gen', rarity: 'rare',
      desc: 'A steel punch always steals, then you shrug off stuns.',
      params: { cooldown: 6, armor: 1 },   // armor: giây miễn choáng sau cú đấm thép trúng người
      scale: { cooldown: 'cd', armor: 'pow' },
    },
    one_two: {
      name: 'One-Two', icon: '🔁', tags: ['playmaker'], role: 'use', rarity: 'epic',
      desc: 'Shoot right after receiving for a max-power volley.',
      params: { window: 1.2 },
      scale: { window: 'pow' },
    },
    captain: {
      name: 'Captain', icon: '🎖', tags: ['playmaker'], role: 'gen', rarity: 'epic',
      desc: 'Completed passes make the receiver stun-proof for a moment.',
      params: { time: 1.5, cooldown: 6 },
      scale: { time: 'pow', cooldown: 'cd' },
    },
    counter_strike: {
      name: 'Counter Strike', icon: '⚔', tags: ['trickster'], role: 'use', rarity: 'epic',
      desc: 'Perfect dodge opens a window of free, sure-steal punches.',
      params: { window: 1, cooldown: 4 },
      scale: { window: 'pow', cooldown: 'cd' },
    },
    flying_kick: {
      name: 'Flying Kick', icon: '🚀', tags: ['runner'], role: 'use', rarity: 'epic',
      desc: 'Hard attack while sprinting: fly further and launch harder.',
      params: { fly: 1.5, surgeFly: 2 },   // hệ số khi đang chạy nước rút / khi đang TOÉ ĐIỆN
      scale: { fly: 'pow', surgeFly: 'pow' },
    },
    ghost_ball: {
      name: 'Ghost Ball', icon: '👻', tags: ['striker'], role: 'use', rarity: 'epic',
      desc: 'Shoot with illusions out to fire fake balls too.',
      params: { max: 3, gkPenalty: 0.2, speed: 320 },
      scale: { gkPenalty: 'pow' },
    },
    scissor_kick: {
      name: 'Scissor Kick', icon: '✂', tags: ['launcher'], role: 'use', rarity: 'legendary',
      desc: 'Hard attack on a loose ball: a piercing bicycle kick.',
      params: { speed: 1.1, pierce: 2, stun: 0.6, cooldown: 4 },
      scale: { stun: 'pow', cooldown: 'cd' },
    },

    /* ---------- TUYỆT KỸ mới ---------- */
    endless_tiki: {
      name: 'Endless Tiki-Taka', icon: '🎼', tags: ['playmaker'], role: 'ult', rarity: 'mythic', needsBall: true,
      desc: 'Opponents slow down while your team auto-passes, then shoots.',
      params: { passes: 4, gap: 0.12, passSpeed: 1.7, slow: 0.4, slowTime: 2.4, gk: 0.25 },   // passSpeed: đường chuyền thật nhưng nhanh hơn
      evolve: [{ passes: 6, slow: 0.3, slowTime: 2.6, gk: 0.45 }],
      scale: { slow: 'mul', slowTime: 'pow', gk: 'pow' },
    },
    meteor_strike: {
      name: 'Meteor Shot', icon: '🌟', tags: ['striker'], role: 'ult', rarity: 'mythic', needsBall: true,
      desc: 'Leap up and smash the ball down at max power.',
      params: { jump: 300, delay: 0.62, speed: 560, gk: 0.3 },
      evolve: [{ jump: 340, speed: 680, gk: 0.5 }],
      scale: { gk: 'pow' },
    },
    hundred_fists: {
      name: 'Hundred Fists', icon: '💢', tags: ['brawler'], role: 'ult', rarity: 'mythic',
      desc: 'Rush an opponent with a punch barrage, then blast them.',
      params: { range: 160, rush: 520, hits: 20, gap: 0.05, knock: 560, stun: 1.4 },   // rush: tốc độ lao tới (né Z được) · stun: choáng sau cú kết
      evolve: [{ range: 220, hits: 36, knock: 720, stun: 2.0 }],
      scale: { knock: 'pow', range: 'pow', stun: 'pow' },
    },
    meteor_drop: {
      name: 'Meteor Drop', icon: '☄️', tags: ['launcher'], role: 'ult', rarity: 'mythic',
      desc: 'Leap off screen, then crash down in a launching crater.',
      params: { aim: 1.0, speed: 190, radius: 60, knock: 240, launch: 260, stun: 1.5 },
      evolve: [{ speed: 230, radius: 92, knock: 320, launch: 300, stun: 1.9 }],
      scale: { radius: 'pow', knock: 'pow', launch: 'pow', stun: 'pow' },
    },
    clone_army: {
      name: 'Clone Army', icon: '🎎', tags: ['trickster'], role: 'ult', rarity: 'mythic',
      desc: 'An army of clones steals the ball and fakes shots.',
      params: { time: 3, gkPenalty: 0.3, stun: 1.3, range: 170 },
      evolve: [{ time: 4.6, gkPenalty: 0.46, stun: 1.9, range: 230 }],
      scale: { time: 'pow', gkPenalty: 'pow', stun: 'pow' },
    },
    // Tuyệt kỹ khởi đầu (bí kíp gia truyền, nhận ở cuối PROLOGUE — ftue.config.js): ai cũng mang từ đầu trận tới khi đạt công thức
    // Tuyệt kỹ đầu tiên (ults.start), yếu hơn các Tuyệt kỹ khác · anyBuild: lá ghi ANY BUILD thay cho trường phái · color: màu cut-in
    // Chỉ số không scale theo character (cố định 15–20%).
    aura_farming: {
      name: 'Aura Farming', icon: '✨', tags: ['chaos'], role: 'ult', rarity: 'epic', anyBuild: true, color: '#ffe14f',
      desc: 'Pure aura: run, pass and shoot faster. Hair goes gold.',
      params: { time: 6, speed: 1.18, pass: 1.18, shot: 1.18 },
    },
    chaos_roulette: {
      name: 'Chaos Roulette', icon: '🎰', tags: ['chaos'], role: 'ult', rarity: 'mythic',
      desc: 'Spin the wheel: a random disaster hits your opponents.',
      // rolls: số tai hoạ bốc (khác nhau): mưa thiên thạch (meteors quả, vòng báo trước telegraph giây) · mất trọng lực (hất tung, có vòng
      // báo trước dưới chân) · nguyền chậm (đối thủ chậm còn slow trong slowTime giây)
      params: { rolls: 1, telegraph: 0.6, meteors: 4, radius: 34, knock: 220, launch: 240, stun: 1.1, slow: 0.55, slowTime: 2.5 },
      evolve: [{ rolls: 2, meteors: 6, radius: 40, stun: 1.4, slowTime: 3 }],
      scale: { radius: 'pow', knock: 'pow', launch: 'pow', stun: 'pow', slowTime: 'pow' },
    },
    titan: {
      name: 'Titan', icon: '🗿', tags: ['iron'], role: 'ult', rarity: 'mythic',
      desc: 'Grow giant: stun-proof, untackleable, bowling everyone over.',
      params: { time: 5, scale: 2, knock: 360, launch: 220, stun: 1.0, shot: 1.35, slow: 0.85 },   // slow: chạy chậm hơn khi khổng lồ
      evolve: [{ time: 8, scale: 2.6, knock: 440, shot: 1.5 }],
      scale: { time: 'pow', knock: 'pow', launch: 'pow', stun: 'pow', shot: 'mul' },
    },

    /* ---------- TUYỆT KỸ LAI (X2 + Y2, ults.hybrids) — hành vi ở systems/cores-hybrid.js ---------- */
    comet_onetwo: {
      name: 'Comet One-Two', icon: '☄', tags: ['striker', 'playmaker'], role: 'ult', rarity: 'mythic', hybrid: true, needsBall: true,
      desc: 'Instant one-two with a teammate, then a piercing volley.',
      params: { gap: 0.18, speed: 1.25, gk: 0.3, pierce: 2, stun: 0.7 },
      scale: { gk: 'pow', stun: 'pow' },
    },
    rising_dragon: {
      name: 'Rising Dragon', icon: '🐉', tags: ['brawler', 'launcher'], role: 'ult', rarity: 'mythic', hybrid: true,
      desc: 'Uppercut them skyward, then dropkick them into the wall.',
      params: { range: 150, rush: 520, launch: 330, delay: 0.42, knock: 460, stun: 1.6 },
      scale: { knock: 'pow', stun: 'pow' },
    },
    comet_dropkick: {
      name: 'Comet Dropkick', icon: '🔥', tags: ['runner', 'launcher'], role: 'ult', rarity: 'mythic', hybrid: true,
      desc: 'Rocket across the pitch in a flaming dropkick.',
      params: { distance: 230, width: 20, knock: 300, launch: 220, stun: 1.0, telegraph: 0.35 },
      scale: { distance: 'pow', knock: 'pow', launch: 'pow', stun: 'pow' },
    },
    phantom_barrage: {
      name: 'Phantom Barrage', icon: '👻', tags: ['trickster', 'striker'], role: 'ult', rarity: 'mythic', hybrid: true, needsBall: true,
      desc: 'Your clones all shoot too; only one ball is real.',
      params: { clones: 3, delay: 0.3, gk: 0.35, speed: 340 },
      scale: { gk: 'pow' },
    },
    steel_formation: {
      name: 'Steel Formation', icon: '🛡', tags: ['iron', 'playmaker'], role: 'ult', rarity: 'mythic', hybrid: true,
      desc: 'Your whole team turns steel: stun-proof, unbreakable passes.',
      params: { time: 3 },   // cả đội miễn choáng + đường chuyền không bị cắt trong time giây
      scale: { time: 'pow' },
    },
    iron_hammer: {
      name: 'Iron Hammer', icon: '🔨', tags: ['brawler', 'iron'], role: 'ult', rarity: 'mythic', hybrid: true,
      desc: 'A giant steel fist hammers down, flattening everyone ahead.',
      params: { range: 70, arc: 75, windup: 0.4, stun: 1.4, armor: 1.5 },
      scale: { range: 'pow', stun: 'pow' },
    },
    mirage_sprint: {
      name: 'Mirage Sprint', icon: '🌫', tags: ['runner', 'trickster'], role: 'ult', rarity: 'mythic', hybrid: true,
      desc: 'Vanish mid-sprint while fake runners scatter with fake balls.',
      params: { time: 2.5, decoys: 5, speed: 170, boost: 1.35 },   // time: giây tàng hình (vẫn đánh trúng được, chỉ khó thấy)
      scale: { time: 'pow', boost: 'mul' },
    },
    slingshot: {
      name: 'Slingshot', icon: '🪃', tags: ['brawler', 'playmaker'], role: 'ult', rarity: 'mythic', hybrid: true, needsBall: true,
      desc: 'Stretch your arms and slingshot a teammate at the goal.',
      params: { grab: 0.22, distance: 200, flight: 0.38, knock: 200, launch: 120, stun: 0.6 },
      scale: { distance: 'pow', knock: 'pow', stun: 'pow' },
    },
    // 13 cặp còn lại (2026-10-14). Mọi đòn có báo trước + né được bằng Z; chiêu sút / chuyền có needsBall
    lightning_relay: {
      name: 'Lightning Relay', icon: '⚡', tags: ['runner', 'playmaker'], role: 'ult', rarity: 'mythic', hybrid: true, needsBall: true,
      desc: 'The ball zaps to your furthest teammate, who bursts forward.',
      params: { telegraph: 0.3, width: 16, stun: 0.7, knock: 130, boost: 1.4, time: 2.5 },   // boost: tốc độ người nhận trong time giây
      scale: { stun: 'pow', time: 'pow', boost: 'mul' },
    },
    flash_strike: {
      name: 'Flash Strike', icon: '🌩', tags: ['runner', 'striker'], role: 'ult', rarity: 'mythic', hybrid: true, needsBall: true,
      desc: 'Blitz forward as lightning, then fire a thunder shot.',
      params: { distance: 120, width: 16, telegraph: 0.3, stun: 0.8, knock: 150, gk: 0.3, pierce: 2 },
      scale: { distance: 'pow', stun: 'pow', gk: 'pow' },
    },
    thunder_rush: {
      name: 'Thunder Rush', icon: '👊', tags: ['runner', 'brawler'], role: 'ult', rarity: 'mythic', hybrid: true,
      desc: 'Zigzag through nearby opponents, punching each one in turn.',
      params: { range: 170, rush: 600, hits: 3, stun: 0.9, knock: 230 },   // hits: số người tối đa · rush: tốc độ lao (né Z được)
      scale: { range: 'pow', knock: 'pow', stun: 'pow' },
    },
    steel_express: {
      name: 'Steel Express', icon: '🚂', tags: ['runner', 'iron'], role: 'ult', rarity: 'mythic', hybrid: true,
      desc: 'Turn to steel and charge straight through anyone ahead.',
      params: { distance: 220, speed: 460, width: 18, telegraph: 0.35, knock: 300, launch: 180, stun: 1.0 },   // miễn choáng chỉ trong lúc lao
      scale: { distance: 'pow', knock: 'pow', launch: 'pow', stun: 'pow' },
    },
    sky_volley: {
      name: 'Sky Volley', icon: '🌠', tags: ['playmaker', 'launcher'], role: 'ult', rarity: 'mythic', hybrid: true, needsBall: true,
      desc: 'Lob it skyward; a teammate leaps and smashes it goalward.',
      params: { lob: 0.6, jump: 300, speed: 600, gk: 0.3, radius: 40, knock: 160, launch: 200, stun: 0.8 },   // radius: sóng chấn chỗ người đá
      scale: { gk: 'pow', radius: 'pow', stun: 'pow' },
    },
    ghost_pass: {
      name: 'Ghost Pass', icon: '🫥', tags: ['playmaker', 'trickster'], role: 'ult', rarity: 'mythic', hybrid: true, needsBall: true,
      desc: 'Fake passes fly everywhere; the real one ghosts through.',
      params: { decoys: 4, speed: 210, time: 1.4, confuse: 1.3, passSpeed: 1.3 },   // đường chuyền thật bay xuyên người cắt (b.fx.ghost)
      scale: { time: 'pow', confuse: 'pow' },
    },
    knockout_volley: {
      name: 'Knockout Volley', icon: '🥊', tags: ['striker', 'brawler'], role: 'ult', rarity: 'mythic', hybrid: true, needsBall: true,
      desc: 'Punch out everyone around you, then fire a burning shot.',
      params: { radius: 46, windup: 0.3, knock: 260, stun: 1.0, gk: 0.2 },
      scale: { radius: 'pow', knock: 'pow', stun: 'pow', gk: 'pow' },
    },
    cannonball: {
      name: 'Cannonball', icon: '💣', tags: ['striker', 'launcher'], role: 'ult', rarity: 'mythic', hybrid: true, needsBall: true,
      desc: 'A shot so heavy it blows up whatever it hits.',
      params: { windup: 0.25, speed: 1.1, fuse: 2.2, radius: 52, knock: 300, launch: 260, stun: 1.3 },   // fuse: chưa chạm ai thì tự nổ
      scale: { radius: 'pow', knock: 'pow', launch: 'pow', stun: 'pow' },
    },
    wrecking_ball: {
      name: 'Wrecking Ball', icon: '🎳', tags: ['striker', 'iron'], role: 'ult', rarity: 'mythic', hybrid: true, needsBall: true,
      desc: 'Fire an iron ball that bowls over everyone ahead.',
      params: { windup: 0.3, speed: 0.85, pierce: 4, stun: 1.1, gk: 0.35, armor: 1.5 },   // speed < 1: bóng sắt nặng, chậm hơn
      scale: { stun: 'pow', gk: 'pow' },
    },
    shadow_ambush: {
      name: 'Shadow Ambush', icon: '🌑', tags: ['brawler', 'trickster'], role: 'ult', rarity: 'mythic', hybrid: true,
      desc: 'Clones pop up behind opponents and punch them all.',
      params: { range: 160, targets: 3, delay: 0.4, knock: 210, stun: 1.0 },   // delay: phân thân hiện ra trước khi đấm (né Z được)
      scale: { range: 'pow', knock: 'pow', stun: 'pow' },
    },
    crossfire_kicks: {
      name: 'Crossfire Kicks', icon: '✖', tags: ['launcher', 'trickster'], role: 'ult', rarity: 'mythic', hybrid: true,
      desc: 'Clones fly-kick in from every side at one opponent.',
      params: { range: 170, clones: 3, aim: 0.45, dist: 60, width: 14, knock: 280, launch: 260, stun: 1.2 },   // aim: vạch đường đá trước khi lao
      scale: { range: 'pow', knock: 'pow', launch: 'pow', stun: 'pow' },
    },
    iron_quake: {
      name: 'Iron Quake', icon: '🌋', tags: ['launcher', 'iron'], role: 'ult', rarity: 'mythic', hybrid: true,
      desc: 'Three armored stomps quake forward, launching everyone nearby.',
      params: { stomps: 3, gap: 0.3, step: 34, radius: 34, telegraph: 0.35, knock: 200, launch: 240, stun: 1.0, armor: 1.4 },
      scale: { radius: 'pow', knock: 'pow', launch: 'pow', stun: 'pow' },
    },
    mirror_wall: {
      name: 'Mirror Wall', icon: '🪞', tags: ['trickster', 'iron'], role: 'ult', rarity: 'mythic', hybrid: true,
      desc: 'A wall of steel clones blocks passes and shots.',
      params: { time: 3.5, clones: 5, gap: 16, ahead: 44 },   // ahead: tường cách bóng bao xa về phía khung thành nhà
      scale: { time: 'pow' },
    },
    // Hỗn loạn + 7 hệ (2026-10-14)
    wormhole_dash: {
      name: 'Wormhole Dash', icon: '🌀', tags: ['chaos', 'runner'], role: 'ult', rarity: 'mythic', hybrid: true,
      desc: 'Dive into a wormhole and burst out far ahead.',
      params: { distance: 200, telegraph: 0.35, radius: 34, knock: 220, launch: 160, stun: 0.9 },   // cửa ra hiện trước telegraph giây
      scale: { distance: 'pow', radius: 'pow', stun: 'pow' },
    },
    wild_pass: {
      name: 'Wild Card Pass', icon: '🃏', tags: ['chaos', 'playmaker'], role: 'ult', rarity: 'mythic', hybrid: true, needsBall: true,
      desc: 'An uncuttable pass that hands a teammate a random buff.',
      params: { time: 3, speed: 1.35, shot: 1.4, pass: 1.4, passSpeed: 1.3 },   // người nhận bốc 1 trong 3 buff trong time giây
      scale: { time: 'pow', speed: 'mul', shot: 'mul', pass: 'mul' },
    },
    jackpot_shot: {
      name: 'Jackpot Shot', icon: '🎰', tags: ['chaos', 'striker'], role: 'ult', rarity: 'mythic', hybrid: true, needsBall: true,
      desc: 'Your shot rolls two random powers at once.',
      params: { picks: 2, curve: 2.4, rocket: 1.35, gk: 0.3 },   // bốc picks trong: lửa · sét · cong · tên lửa · tách đôi · thủ môn hoa mắt
      scale: { gk: 'pow', rocket: 'mul' },
    },
    wild_haymaker: {
      name: 'Wild Haymaker', icon: '🎲', tags: ['chaos', 'brawler'], role: 'ult', rarity: 'mythic', hybrid: true,
      desc: 'Rush in and land a punch with a random knockout.',
      params: { range: 160, rush: 540, knock: 520, launch: 360, stun: 1.6 },   // kết quả ngẫu nhiên: bay lên trời · văng vào tường · choáng xoay vòng
      scale: { knock: 'pow', launch: 'pow', stun: 'pow' },
    },
    pinball_kick: {
      name: 'Pinball Kick', icon: '🕹', tags: ['chaos', 'launcher'], role: 'ult', rarity: 'mythic', hybrid: true,
      desc: 'Kick an opponent into a pinball that bowls others over.',
      params: { range: 150, rush: 520, speed: 420, bounces: 3, time: 1.2, knock: 220, launch: 160, stun: 1.0 },   // bounces: nảy tường tối đa
      scale: { speed: 'pow', knock: 'pow', stun: 'pow' },
    },
    shell_game: {
      name: 'Shell Game', icon: '🥥', tags: ['chaos', 'trickster'], role: 'ult', rarity: 'mythic', hybrid: true,
      desc: 'You and your clones shuffle spots; guess which is real.',
      params: { clones: 3, spread: 46, delay: 0.35, time: 2.2, confuse: 1.6 },   // delay: phân thân hiện ra rồi mới tráo chỗ
      scale: { time: 'pow', confuse: 'pow' },
    },
    iron_dice: {
      name: 'Iron Dice', icon: '🎲', tags: ['chaos', 'iron'], role: 'ult', rarity: 'mythic', hybrid: true,
      desc: 'Roll forward as a giant steel die, flattening everyone.',
      // lăn theo đường vạch trước (miễn choáng chỉ lúc lăn), dừng lại tung xúc xắc: sóng chấn bán kính radius + perPip x số chấm
      params: { distance: 180, speed: 380, telegraph: 0.35, width: 18, knock: 260, launch: 160, stun: 1.0, size: 1.6, radius: 10, perPip: 6 },
      scale: { distance: 'pow', knock: 'pow', stun: 'pow' },
    },

    /* ---------- 🎲 HỖN LOẠN (mới) ---------- */
    bomb_ball: {
      name: 'Bomb Ball', icon: '💣', tags: ['chaos'], role: 'wild', rarity: 'legendary',
      desc: 'The ball keeps turning into a bomb that blasts everyone nearby.',
      params: { every: 12, fuse: 3, radius: 55, knock: 260, launch: 240, stun: 1.2 },
      scale: { every: 'cd', radius: 'pow', knock: 'pow', launch: 'pow', stun: 'pow' },
    },

    /* ---------- 🎲 HỖN LOẠN ---------- */
    chaos_ball: {
      name: 'Chaos Ball', icon: '🎲', tags: ['chaos'], role: 'wild', rarity: 'rare',
      desc: 'Every shot or pass turns the ball into something random.',
      params: { curve: 2.2, rocketMult: 1.3 },
      scale: { curve: 'pow', rocketMult: 'mul' },
    },
    warp_walls: {
      name: 'Warp Walls', icon: '🌌', tags: ['chaos'], role: 'wild', rarity: 'rare',
      desc: 'Balls into side walls warp out the opposite wall.',
      params: {},
    },
    // 3 lá mới (2026-10-14): Hỗn loạn có 6 lá như hệ khác -> Tuyệt kỹ gốc X3 / ★★ X4 / lai X2 + Y2 đạt được
    glitch_step: {
      name: 'Glitch Step', icon: '📺', tags: ['chaos'], role: 'wild', rarity: 'rare',
      desc: 'Dodging sometimes glitches you to a random nearby spot.',
      params: { chance: 0.4, distance: 70, cooldown: 2 },   // lướt Z: chance tỉ lệ dịch chuyển thêm tới chỗ ngẫu nhiên trong distance px
      scale: { distance: 'pow', cooldown: 'cd' },
    },
    wild_card: {
      name: 'Wild Card', icon: '🃏', tags: ['chaos'], role: 'wild', rarity: 'epic',
      desc: 'Every kickoff you draw a random power-up card.',
      params: { time: 12, speed: 1.15, shot: 1.25, pass: 1.25, tackle: 1.3 },   // mỗi lần giao bóng: 1 trong 4 buff trong time giây
      scale: { time: 'pow' },
    },
    loaded_dice: {
      name: 'Loaded Dice', icon: '🎲', tags: ['chaos'], role: 'wild', rarity: 'epic',
      desc: 'Every punch rolls a die; high rolls hit like trucks.',
      params: { big: 5, knock: 320, launch: 220, stun: 1.2 },   // đấm trúng tung xúc xắc: >= big thì văng mạnh, 6 thì hất tung
      scale: { knock: 'pow', launch: 'pow', stun: 'pow' },
    },
  },
};
