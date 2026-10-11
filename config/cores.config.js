/* =========================================================
 * CORES CONFIG — Core Upgrade (docs/CORE_DESIGN.md). Core áp dụng cho CẢ ĐỘI khi được chọn.
 *
 * Mỗi Core:
 *  tags   : trường phái (1, hoặc 2 với Core cầu nối) — tính Cộng hưởng + trọng số khi chọn Core
 *  role   : gen (TẠO tài nguyên) · use (DÙNG tài nguyên) · base (chỉ số) · ult (TUYỆT KỸ — phím X) · wild (Hỗn loạn)
 *  rarity : common · rare · epic · legendary · mythic — dùng chung cho gacha (progression.config.js) và tần suất khi chọn Core
 *  mods   : hệ số nhân thụ động: speed, offBallSpeed, sprintRegen, shotPower, passSpeed,
 *           tackleRange (tầm Light), tackleChance (tỉ lệ Light làm rơi bóng), slideSpeed (bước Hard),
 *           knockback (Light + Hard), chargeTime, accuracy, momentumGain (Đà nhận mỗi lần), launch, hardCooldown,
 *           lightCooldown, skillCooldown, passAccuracy, interceptTaken (tỉ lệ bị cắt đường chuyền),
 *           dribble (giữ bóng: tốc độ dẫn bóng + khó bị đấm rơi bóng), keeperSave (tỉ lệ bắt bóng trong vòng cấm nhà)
 *  boost  : (Core chỉ số) id chỉ số trong progression.attrs.list — chỉ để vẽ dấu "+" màu chỉ số trên người (src/render/vfx.js)
 *  desc   : 1 câu ngắn 7–10 chữ, KHÔNG ghi số / {param} (user chốt 2026-10-11: người chơi không đọc số)
 *  params : tham số cho hành vi riêng (code ở src/systems/cores.js, map theo id)
 * ========================================================= */
window.SFC_CONFIG = window.SFC_CONFIG || {};

SFC_CONFIG.cores = {
  // 7 trường phái + Hỗn loạn (không có Cộng hưởng)
  archetypes: {
    runner:    { label: 'SPEED',    icon: '🏃', color: '#3ff6ff', mech: 'Momentum', resource: 'momentum', stat: 'pace' },
    playmaker: { label: 'TIKI-TAKA', icon: '🎼', color: '#ffd23f', mech: 'Rhythm', resource: 'rhythm', stat: 'passing' },
    striker:   { label: 'STRIKER',   icon: '🎯', color: '#ff7a3d', mech: 'Charged shot', stat: 'shooting' },
    brawler:   { label: 'BRAWLER',    icon: '🥊', color: '#ff3d5a', mech: 'Rage', resource: 'rage', stat: 'fight' },
    launcher:  { label: 'KICKER',  icon: '🦵', color: '#b46bff', mech: 'Launch', stat: 'fight' },
    trickster: { label: 'ILLUSION',    icon: '🌀', color: '#9d7bff', mech: 'Illusion', stat: 'dribble' },
    iron:      { label: 'IRON',      icon: '🛡', color: '#c7ccd6', mech: 'Guard', resource: 'guard', stat: 'keeper' },
    chaos:     { label: 'CHAOS',  icon: '🎲', color: '#c63dff', noSet: true, stat: 'ovr' },
  },
  // Core scale theo chỉ số (src/systems/corescale.js): rating min -> anchor -> max = độ mạnh / hồi chiêu (nội suy từng đoạn).
  // anchor = rating của đồng đội / đội AI chỉ số 1.0 (mức cân bằng gốc của Core). stat của trường phái ở archetypes[].stat
  statScale: { min: 60, anchor: 80, max: 99, power: [0.5, 1, 1.5], cooldown: [1.3, 1, 0.7] },
  roleLabels: { gen: 'BUILDS', use: 'SPENDS', base: 'PASSIVE', ult: 'ULTIMATE', wild: 'WILD' },   // mech (trường phái) = thứ Core TẠO / DÙNG

  // Tài nguyên — chỉ chạy khi đội có ít nhất 1 Core của trường phái tương ứng.
  // Không hoạt động quá grace giây -> mỗi decayEvery giây mất 1 (giảm từ từ, không về thẳng 0)
  resources: {
    // mỗi cầu thủ: chạy nước rút +1 mỗi gainEvery; bị choáng mất stunLoss
    momentum: { label: 'Momentum', icon: '⚡', max: 5, gainEvery: 0.4, grace: 2.5, decayEvery: 0.7, stunLoss: 1, speedPer: 0.01 },
    // cả đội: chuyền tới chân +1; mất bóng mất turnoverLoss
    rhythm:   { label: 'Rhythm', icon: '♪', max: 5, grace: 6, decayEvery: 2.5, turnoverLoss: 2, passSpeedPer: 0.03 },
    // mỗi cầu thủ: đấm trúng +1; mỗi Nộ +stealPer tỉ lệ đấm rơi bóng, +speedPer tốc độ (hăng máu)
    rage:     { label: 'Rage', icon: '🔥', max: 5, grace: 4, decayEvery: 2, stealPer: 0.06, speedPer: 0.02 },
    guard:    { label: 'Guard', icon: '🛡', max: 2 },                                                // mỗi cầu thủ, chặn 1 lần choáng
  },
  chargedShot: 0.6,          // "Sút tụ lực" = giữ >= 60% thanh lực (Cộng hưởng SÁT THỦ 3: 40%)

  // Cộng hưởng: số Core cùng trường phái (Core cầu nối tính cho cả hai). Logic ở systems/cores.js (SET_RULES) — số liệu thật nằm ở đó.
  // Chữ hiển thị: câu ngắn, KHÔNG ghi số (như desc của Core)
  sets: {
    runner:    { 2: 'Hold more Momentum', 3: 'Sprinting costs less at full Momentum', 4: 'Momentum lasts longer and powers your kicks' },
    playmaker: { 2: 'Receiving a pass also builds Rhythm', 3: 'Keep your Rhythm after losing the ball once', 4: 'Full Rhythm: your passes cannot be intercepted' },
    striker:   { 2: 'Stronger shots that beat keepers more often', 3: 'Charged shots kick in sooner', 4: 'Shots on target cut your cooldowns' },
    brawler:   { 2: 'Rage fades slower', 3: 'Full Rage: punch nonstop for a moment', 4: 'Punch hits restore stamina and stun longer' },
    launcher:  { 2: 'Launch further, kick faster, hits knock the ball to you', 3: 'BONK stuns everyone nearby', 4: 'Hard attacks recharge much faster' },
    trickster: { 2: 'Longer afterimages and a faster Z', 3: 'A perfect dodge resets Z instantly', 4: 'Z gets an extra charge' },
    iron:      { 2: 'Extra Guard at every kickoff', 3: 'Guard slowly regenerates', 4: 'Your keeper saves more shots' },
  },

  // Tuyệt kỹ: năng lượng chỉ nạp khi ghi bàn hoặc cướp được bóng
  // Năng lượng Tuyệt kỹ (X), 0..1: ghi bàn · bị thủng lưới · cướp bóng (tối đa 1 lần / stealCooldown giây) ·
  // đấm trúng đối thủ bằng Light attack (tối đa 1 lần / lightHitCooldown giây). lockout: dùng xong bao lâu không nạp
  ultimate: { gainGoal: 0.5, gainConceded: 0.3, gainSteal: 0.12, stealCooldown: 3, gainLightHit: 0.05, lightHitCooldown: 1, lockout: 10, cutIn: 0.6, aiDelay: [0.5, 2.5] },

  // Chọn Core: trọng số = độ hiếm x (1 + buildWeight x số Core cùng trường phái đang có) x thiên hướng đội
  draft: {
    rarityWeight: { common: 3, rare: 2, epic: 1.2, legendary: 0.7, mythic: 0.5 },
    buildWeight: 0.8,
    guaranteeFromRound: 2,   // từ lượt này: ít nhất 1 lá cùng trường phái với Core đang có
    rerollsPerRound: 0,      // mỗi lượt chọn được đổi cả 3 lá bao nhiêu lần (0 = tạm bỏ đổi bài, ẩn nút REROLL)
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
      desc: 'Sprint to build Momentum faster, quicker off the ball.',
      mods: { offBallSpeed: 1.05, momentumGain: 1.5 },
      scale: { 'm.offBallSpeed': 'mul', 'm.momentumGain': 'mul' },
    },
    phantom_step: {
      name: 'Phantom Step', icon: '🌀', tags: ['trickster'], role: 'gen', rarity: 'rare',
      desc: 'Z teleports further and leaves a decoy that lures defenders.',
      params: { distance: 34, illusion: 1.2, lureRadius: 60, lure: 0.4, lureCooldown: 4 },
      scale: { distance: 'pow', illusion: 'pow', lure: 'pow', lureCooldown: 'cd' },
    },
    fake_run: {
      name: 'Fake Run', icon: '🪞', tags: ['runner', 'trickster'], role: 'gen', rarity: 'rare',
      desc: 'Sprint or Z on the ball sends a fake running away.',
      params: { cooldown: 3.5, duration: 1.6, confuseRadius: 90, confuseTime: 1.2, angle: 0.8, momentum: 2 },
      scale: { cooldown: 'cd', duration: 'pow', confuseTime: 'pow' },
    },

    /* ---------- 🥊 ĐẤU SĨ · 🛡 THÉP · 🦵 VÕ SĨ ĐÁ ---------- */
    street_fighter: {
      name: 'Street Fighter', icon: '🥊', tags: ['brawler'], role: 'gen', rarity: 'common',
      desc: 'Longer punches that steal more, and every steal builds Rage.',
      mods: { tackleRange: 1.3, tackleChance: 1.3, knockback: 1.3 },
      params: { rageOnSteal: 1 },
      scale: { 'm.tackleRange': 'mul', 'm.tackleChance': 'mul', 'm.knockback': 'mul' },
    },
    iron_body: {
      name: 'Iron Skin', icon: '🛡', tags: ['iron'], role: 'gen', rarity: 'common',
      desc: 'Each player gets a Guard that blocks one stun.',
      params: { regen: 7 },
      scale: { regen: 'cd' },
    },
    blade_runner: {
      name: 'Wind Blade', icon: '🌙', tags: ['launcher'], role: 'gen', rarity: 'legendary',
      desc: 'Hard attack fires a wind blade: stun, ball drops.',
      params: { speed: 300, life: 0.5, length: 18, stun: 0.9 },
      scale: { stun: 'pow' },
    },

    /* ---------- 🛡 THÉP · 🎼 TIKI-TAKA · cầu nối ---------- */
    aegis_wall: {
      name: 'Aegis Shield', icon: '🧱', tags: ['iron'], role: 'base', rarity: 'legendary',
      desc: 'A shield on your goal line blocks one shot.',
      params: { cooldown: 60 },
      scale: { cooldown: 'cd' },
    },
    counter_attack: {
      name: 'Counter Attack', icon: '↩', tags: ['brawler', 'runner'], role: 'gen', rarity: 'rare',
      desc: 'Win the ball: your whole team speeds up and hits harder.',
      params: { duration: 3.5, speedMult: 1.2, shotMult: 1.2, momentum: 3, calloutCd: 15 },
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
      desc: 'Faster passes; the receiver gets a speed boost and Rhythm.',
      mods: { passSpeed: 1.2 },
      params: { duration: 1.5, speedMult: 1.25, rhythm: 1 },
      scale: { 'm.passSpeed': 'mul', duration: 'pow', speedMult: 'mul' },
    },

    /* ---------- TUYỆT KỸ (phím X) ---------- */
    // Tuyệt kỹ thí điểm (Giai đoạn 1) — kiểm tra khung năng lượng + phím X; các Tuyệt kỹ khác ở Giai đoạn 3
    lightning_dash: {
      name: 'Lightning Dash', icon: '⚡', tags: ['runner'], role: 'ult', rarity: 'mythic',
      desc: 'Dash as lightning with the ball, shocking everyone you pass.',
      params: { distance: 190, width: 18, stun: 0.8, knock: 140 },
      scale: { distance: 'pow', stun: 'pow', knock: 'pow' },
    },

    /* ================= Giai đoạn 3 — Core mới (hành vi ở src/systems/cores-new.js) ================= */
    /* ---------- 🏃 TỐC ĐỘ ---------- */
    burst_start: {
      name: 'Arrow Start', icon: '🏹', tags: ['runner'], role: 'gen', rarity: 'rare',
      desc: 'Start sprinting with an instant burst and Momentum.',
      params: { momentum: 2, boost: 1.3, time: 0.35, cooldown: 3 },
      scale: { boost: 'mul', time: 'pow', cooldown: 'cd' },
    },
    sonic_boom: {
      name: 'Sonic Boom', icon: '💥', tags: ['runner'], role: 'use', rarity: 'epic',
      desc: 'At max Momentum, blast away defenders you brush past.',
      params: { gap: 14, knock: 180, launch: 70, stun: 0.35, cooldown: 10 },
      scale: { knock: 'pow', launch: 'pow', stun: 'pow', cooldown: 'cd' },
    },
    freight_train: {
      name: 'Freight Train', icon: '🚚', tags: ['runner'], role: 'use', rarity: 'epic',
      desc: 'Charge into someone with high Momentum and send them flying.',
      params: { minMomentum: 5, cost: 5, minSpeed: 90, knock: 190, launch: 120, stun: 0.4, cooldown: 15 },
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
      desc: 'Quick first-time passes ghost through opponents and build Rhythm.',
      params: { window: 0.6, rhythm: 2 },
      scale: { window: 'pow' },
    },
    phantom_pass: {
      name: 'Phantom Pass', icon: '💫', tags: ['playmaker'], role: 'use', rarity: 'epic',
      desc: 'With Rhythm, through balls become an unstoppable golden beam.',
      params: { cost: 3, speedMult: 1.3, boost: 1.3, time: 2 },
      scale: { boost: 'mul', time: 'pow' },
    },
    symphony: {
      name: 'Symphony', icon: '🎻', tags: ['playmaker'], role: 'use', rarity: 'epic',
      desc: 'Spend Rhythm on a shot the keeper can barely stop.',
      params: { min: 3, powerPer: 0.08, gkPer: 0.05 },
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
      desc: 'Punches become a flurry combo, each hit builds Rage.',
      mods: { lightCooldown: 1.1 },
      params: { hits: 4, gap: 0.07, range: 22, push: 220 },
      scale: { push: 'pow' },
    },
    giant_fist: {
      name: 'Giant Fist', icon: '✊', tags: ['brawler'], role: 'use', rarity: 'epic',
      desc: 'Full Rage: your next punch is giant and always steals.',
      scale: { knock: 'pow' },
      params: { knock: 2.5, range: 2 },
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
      desc: 'With Guard on the ball: grow, unstoppable, bowl them over.',
      params: { scale: 1.3, slow: 0.88, knock: 170, launch: 80, stun: 0.3, every: 2 },
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
      name: 'Rubber Arm', icon: '🤜', tags: ['brawler', 'playmaker'], role: 'use', rarity: 'epic',
      desc: 'Stretchy punches pull players in or grab loose balls.',
      params: { reach: 50, pull: 180, stun: 0.4, steal: 0.25, cooldown: 2 },
      scale: { reach: 'pow', pull: 'pow', stun: 'pow', steal: 'pow', cooldown: 'cd' },
    },
    uppercut: {
      name: 'Dragon Uppercut', icon: '🐲', tags: ['brawler', 'launcher'], role: 'use', rarity: 'rare',
      desc: 'Full Rage uppercut launches them; the ball drops to you.',
      params: { launch: 330, jump: 80 },
      scale: { launch: 'pow' },
    },
    iron_fist: {
      name: 'Iron Fist', icon: '🦾', tags: ['brawler', 'iron'], role: 'gen', rarity: 'rare',
      desc: 'With Guard, punches always steal and shrug off stuns.',
      params: { rage: 1, stunPerRage: 0.08 },
      scale: { stunPerRage: 'pow' },
    },
    one_two: {
      name: 'One-Two', icon: '🔁', tags: ['playmaker', 'striker'], role: 'use', rarity: 'epic',
      desc: 'Shoot right after receiving for a max-power volley.',
      params: { window: 1.2 },
      scale: { window: 'pow' },
    },
    captain: {
      name: 'Captain', icon: '🎖', tags: ['iron', 'playmaker'], role: 'gen', rarity: 'epic',
      desc: 'Every completed pass gives the receiver a Guard.',
      params: { cooldown: 6 },
      scale: { cooldown: 'cd' },
    },
    counter_strike: {
      name: 'Counter Strike', icon: '⚔', tags: ['trickster', 'brawler'], role: 'use', rarity: 'epic',
      desc: 'Perfect dodge opens a window of free, sure-steal punches.',
      params: { window: 1, rage: 2, cooldown: 4 },
      scale: { window: 'pow', cooldown: 'cd' },
    },
    flying_kick: {
      name: 'Flying Kick', icon: '🚀', tags: ['runner', 'launcher'], role: 'use', rarity: 'epic',
      desc: 'Hard attack spends Momentum to fly and launch further.',
      params: { perMomentum: 0.2 },
      scale: { perMomentum: 'pow' },
    },
    ghost_ball: {
      name: 'Ghost Ball', icon: '👻', tags: ['trickster', 'striker'], role: 'use', rarity: 'epic',
      desc: 'Shoot with illusions out to fire fake balls too.',
      params: { max: 3, gkPenalty: 0.2, speed: 320 },
      scale: { gkPenalty: 'pow' },
    },
    scissor_kick: {
      name: 'Scissor Kick', icon: '✂', tags: ['launcher', 'striker'], role: 'use', rarity: 'legendary',
      desc: 'Hard attack on a loose ball: a piercing bicycle kick.',
      params: { speed: 1.1, pierce: 2, stun: 0.6, cooldown: 4 },
      scale: { stun: 'pow', cooldown: 'cd' },
    },

    /* ---------- TUYỆT KỸ mới ---------- */
    endless_tiki: {
      name: 'Endless Tiki-Taka', icon: '🎼', tags: ['playmaker'], role: 'ult', rarity: 'mythic',
      desc: 'Opponents slow down while your team auto-passes, then shoots.',
      params: { passes: 4, gap: 0.22, slow: 0.4, slowTime: 1.8, gk: 0.25 },
      scale: { slow: 'mul', slowTime: 'pow', gk: 'pow' },
    },
    meteor_strike: {
      name: 'Meteor Shot', icon: '🌟', tags: ['striker'], role: 'ult', rarity: 'mythic',
      desc: 'Leap up and smash the ball down at max power.',
      params: { jump: 300, delay: 0.62, speed: 560, gk: 0.3 },
      scale: { gk: 'pow' },
    },
    hundred_fists: {
      name: 'Hundred Fists', icon: '💢', tags: ['brawler'], role: 'ult', rarity: 'mythic',
      desc: 'Rush an opponent with a punch barrage, then blast them.',
      params: { range: 160, hits: 20, gap: 0.05, knock: 560, stun: 1.4 },   // stun: choáng sau cú kết (tính từ lúc tiếp đất)
      scale: { knock: 'pow', range: 'pow', stun: 'pow' },
    },
    meteor_drop: {
      name: 'Meteor Drop', icon: '☄️', tags: ['launcher'], role: 'ult', rarity: 'mythic',
      desc: 'Leap off screen, then crash down in a launching crater.',
      params: { aim: 1.0, speed: 190, radius: 60, knock: 240, launch: 260, stun: 1.5 },
      scale: { radius: 'pow', knock: 'pow', launch: 'pow', stun: 'pow' },
    },
    clone_army: {
      name: 'Clone Army', icon: '🎎', tags: ['trickster'], role: 'ult', rarity: 'mythic',
      desc: 'An army of clones steals the ball and fakes shots.',
      params: { time: 3, gkPenalty: 0.3, stun: 1.3, range: 170 },
      scale: { time: 'pow', gkPenalty: 'pow', stun: 'pow' },
    },
    // Tuyệt kỹ khởi đầu (bí kíp gia truyền, nhận ở cuối PROLOGUE — ftue.config.js): có sẵn trong starterCores, yếu hơn các Tuyệt kỹ khác.
    // anyBuild: đủ điều kiện khi có >= 2 Core cùng 1 trường phái BẤT KỲ (vẫn phải bốc được lá như mọi Tuyệt kỹ) · color: màu cut-in
    // Chỉ số không scale theo character (cố định 15–20%).
    aura_farming: {
      name: 'Aura Farming', icon: '✨', tags: ['chaos'], role: 'ult', rarity: 'epic', anyBuild: true, color: '#ffe14f',
      desc: 'Pure aura: run, pass and shoot faster. Hair goes gold.',
      params: { time: 6, speed: 1.18, pass: 1.18, shot: 1.18 },
    },
    titan: {
      name: 'Titan', icon: '🗿', tags: ['iron'], role: 'ult', rarity: 'mythic',
      desc: 'Grow giant: stun-proof, untackleable, bowling everyone over.',
      params: { time: 5, scale: 2, knock: 360, launch: 220, stun: 1.0, shot: 1.35 },
      scale: { time: 'pow', knock: 'pow', launch: 'pow', stun: 'pow', shot: 'mul' },
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
  },
};
