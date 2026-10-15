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
      runner: 'light_cycle', playmaker: 'endless_tiki', striker: 'meteor_strike', brawler: 'hundred_fists',
      launcher: 'moon_stomp', trickster: 'clone_army', iron: 'titan', chaos: 'chaos_roulette',
    },
    // Tuyệt kỹ đã thay (docs/ULT_REDESIGN.md, 2026-10-15): id cũ -> id mới cùng ô công thức. Sổ Tuyệt kỹ (Profile.data.ultBook) đổi theo khi tải hồ sơ
    renamed: {
      lightning_dash: 'light_cycle', meteor_drop: 'moon_stomp',
      comet_dropkick: 'hurricane_kick',
      phantom_barrage: 'hypno_eyes',
      steel_formation: 'iron_chain',
      mirage_sprint: 'phase_step',
      flash_strike: 'time_stop_strike',
      thunder_rush: 'rocket_punch',
      steel_express: 'monster_truck',
      sky_volley: 'boomerang_kick',
      knockout_volley: 'dodgeball',
      wrecking_ball: 'boulder_shot',
      shadow_ambush: 'ghost_hands',
      crossfire_kicks: 'portal_kicks',
      iron_quake: 'earth_spike',
      mirror_wall: 'medusa_gaze',
      wormhole_dash: 'vhs_rewind',
      wild_pass: 'banana_pass',
      wild_haymaker: 'jack_in_box',
      iron_dice: 'mega_magnet',
      // đợt 2 (2026-10-15, sau khi user thử phòng test)
      lightning_relay: 'thunderstorm',
      sonic_fist: 'rocket_punch',
      lead_blocker: 'monster_truck',
      vanishing_ball: 'hypno_eyes',
      ghost_pass: 'switcheroo',
      parry_volley: 'dodgeball',
      hall_of_mirrors: 'medusa_gaze',
      magnet_ball: 'banana_pass',
      jackpot_shot: 'shrink_ray',
      anvil_rain: 'mega_magnet',
    },
    // Tuyệt kỹ lai (user duyệt 2026-10-13): 7 cặp từng có Core cầu nối + Slingshot, rồi 13 cặp còn lại. Hành vi ở src/systems/cores-hybrid.js
    hybrids: [
      { id: 'comet_onetwo', tags: ['striker', 'playmaker'] },
      { id: 'rising_dragon', tags: ['brawler', 'launcher'] },
      { id: 'hurricane_kick', tags: ['runner', 'launcher'] },
      { id: 'hypno_eyes', tags: ['trickster', 'striker'] },
      { id: 'iron_chain', tags: ['iron', 'playmaker'] },
      { id: 'iron_hammer', tags: ['brawler', 'iron'] },
      { id: 'phase_step', tags: ['runner', 'trickster'] },
      { id: 'slingshot', tags: ['brawler', 'playmaker'] },
      // 13 cặp còn lại (user duyệt 2026-10-14) -> đủ 21 cặp, 2 + 2 nào cũng ra Tuyệt kỹ
      { id: 'thunderstorm', tags: ['runner', 'playmaker'] },
      { id: 'time_stop_strike', tags: ['runner', 'striker'] },
      { id: 'rocket_punch', tags: ['runner', 'brawler'] },
      { id: 'monster_truck', tags: ['runner', 'iron'] },
      { id: 'boomerang_kick', tags: ['playmaker', 'launcher'] },
      { id: 'switcheroo', tags: ['playmaker', 'trickster'] },
      { id: 'dodgeball', tags: ['striker', 'brawler'] },
      { id: 'cannonball', tags: ['striker', 'launcher'] },
      { id: 'boulder_shot', tags: ['striker', 'iron'] },
      { id: 'ghost_hands', tags: ['brawler', 'trickster'] },
      { id: 'portal_kicks', tags: ['launcher', 'trickster'] },
      { id: 'earth_spike', tags: ['launcher', 'iron'] },
      { id: 'medusa_gaze', tags: ['trickster', 'iron'] },
      // Hỗn loạn + 7 hệ còn lại (2026-10-14) -> đủ 28 cặp của 8 trường phái
      { id: 'vhs_rewind', tags: ['chaos', 'runner'] },
      { id: 'banana_pass', tags: ['chaos', 'playmaker'] },
      { id: 'shrink_ray', tags: ['chaos', 'striker'] },
      { id: 'jack_in_box', tags: ['chaos', 'brawler'] },
      { id: 'pinball_kick', tags: ['chaos', 'launcher'] },
      { id: 'shell_game', tags: ['chaos', 'trickster'] },
      { id: 'mega_magnet', tags: ['chaos', 'iron'] },
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
    // LIGHT CYCLE (Tuyệt kỹ gốc TỐC ĐỘ, 2026-10-15): chạy siêu tốc time giây, để lại vệt tường sét (mỗi đoạn sống life giây).
    // Đối thủ chạy qua tường bị giật choáng (né Z / đang bay thì qua được). Tường không chặn bóng
    light_cycle: {
      name: 'Light Cycle', icon: '⚡', tags: ['runner'], role: 'ult', rarity: 'mythic',
      desc: 'Sprint as lightning, leaving a wall that zaps anyone crossing.',
      params: { time: 3, speed: 1.45, life: 2.2, every: 0.05, width: 5, stun: 0.9, knock: 130 },
      evolve: [{ time: 4.2, speed: 1.55, life: 3, stun: 1.2 }],
      scale: { time: 'pow', life: 'pow', stun: 'pow' },
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
    // MOON STOMP (Tuyệt kỹ gốc VÕ SĨ ĐÁ, 2026-10-15): dậm đất (vòng báo trước telegraph giây) -> mọi người trong vòng (cả đồng đội, cả bóng)
    // lơ lửng float giây, không làm gì được. Người dùng chạy chạm người đang lơ lửng = đá văng xa; chạm bóng lơ lửng = vô-lê về khung
    moon_stomp: {
      name: 'Moon Stomp', icon: '🌙', tags: ['launcher'], role: 'ult', rarity: 'mythic',
      desc: 'Stomp the ground and everyone nearby floats helplessly.',
      params: { telegraph: 0.55, radius: 80, float: 2, lift: 60, knock: 520, launch: 260, stun: 1.2, volley: 1.1 },
      evolve: [{ radius: 110, float: 2.6, knock: 620 }],
      scale: { radius: 'pow', float: 'pow', knock: 'pow' },
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
    // CHAOS ROULETTE -> chỉ còn NGHIÊNG SÂN (user chốt 2026-10-15, giữ id cho sổ Tuyệt kỹ): cả sân nghiêng về khung thành đối thủ time giây,
    // mọi người đứng dưới đất trôi tilt px/s về phía đó, bóng lỏng tăng tốc ball px/s²
    chaos_roulette: {
      name: 'Pitch Tilt', icon: '🎰', tags: ['chaos'], role: 'ult', rarity: 'mythic',
      desc: 'Tilt the pitch: everyone slides toward the enemy goal.',
      params: { time: 3.2, tilt: 70, ball: 170 },
      evolve: [{ time: 4.2, tilt: 90 }],
      scale: { time: 'pow' },
    },
    titan: {
      name: 'Titan', icon: '🗿', tags: ['iron'], role: 'ult', rarity: 'mythic',
      desc: 'Grow giant: stun-proof, untackleable, bowling everyone over.',
      params: { time: 5, scale: 2, knock: 360, launch: 220, stun: 1.0, shot: 1.35, slow: 0.85 },   // slow: chạy chậm hơn khi khổng lồ
      evolve: [{ time: 8, scale: 2.6, knock: 440, shot: 1.5 }],
      scale: { time: 'pow', knock: 'pow', launch: 'pow', stun: 'pow', shot: 'mul' },
    },

    /* ---------- TUYỆT KỸ LAI (X2 + Y2, ults.hybrids) — hành vi ở systems/cores-hybrid.js ---------- */
    // 🎯 + 🎼 — Comet One-Two: chuyền 1-2 với đồng đội gần nhất, đồng đội hất bóng bổng lên, người dùng bật lên trời móc xe đạp
    // (bicycle kick) tung lưới, bóng xuyên người
    comet_onetwo: {
      name: 'Comet One-Two', icon: '☄', tags: ['striker', 'playmaker'], role: 'ult', rarity: 'mythic', hybrid: true, needsBall: true,
      desc: 'One-two with a teammate, then a flying bicycle kick.',
      params: { gap: 0.18, lob: 0.6, jump: 280, speed: 1.2, gk: 0.3, pierce: 2, stun: 0.7 },
      scale: { gk: 'pow', stun: 'pow' },
    },
    rising_dragon: {
      name: 'Rising Dragon', icon: '🐉', tags: ['brawler', 'launcher'], role: 'ult', rarity: 'mythic', hybrid: true,
      desc: 'Uppercut them skyward, then dropkick them into the wall.',
      params: { range: 150, rush: 520, launch: 330, delay: 0.42, knock: 460, stun: 1.6 },
      scale: { knock: 'pow', stun: 'pow' },
    },
    // 🏃 + 🦵 — Hurricane Kick: xoay thành lốc xoáy đi chậm (điều khiển được) time giây; ai chạm bị hút lên rồi văng sang bên,
    // bóng bị cuốn vào thì văng ra ngẫu nhiên phía trước (có thể mất bóng)
    hurricane_kick: {
      name: 'Hurricane Kick', icon: '🌪', tags: ['runner', 'launcher'], role: 'ult', rarity: 'mythic', hybrid: true,
      desc: 'Spin into a tornado that swallows and spits out everyone.',
      params: { time: 2, speed: 125, radius: 18, launch: 280, knock: 260, stun: 1.0, ballSpeed: 300 },
      scale: { time: 'pow', launch: 'pow', stun: 'pow' },
    },
    // 🌀 + 🎯 — Hypno Eyes: mắt xoắn ốc chiếu tia thôi miên (báo trước telegraph giây, né Z được) vào tối đa targets đối thủ phía trước
    // (ưu tiên người đứng giữa mình và khung): người trúng đi lang thang ra xa khung time giây, ai / bóng chạm vào là tỉnh
    hypno_eyes: {
      name: 'Hypno Eyes', icon: '🌀', tags: ['trickster', 'striker'], role: 'ult', rarity: 'mythic', hybrid: true,
      desc: 'Hypnotize defenders so they wander away from goal.',
      params: { range: 230, targets: 2, telegraph: 0.3, catch: 30, time: 2.6, speed: 45 },   // catch: chạy xa khỏi chỗ tia nhắm hơn ngần này px là thoát
      scale: { time: 'pow' },
    },
    // 🛡 + 🎼 — Iron Chain: xích thép nối người dùng với từng đồng đội trọn time giây (xích giãn theo người, không đứt):
    // đối thủ chạy vào xích bị vấp ngã, đường chuyền của đội không bị cắt (CoreSystem.passGuarded)
    iron_chain: {
      name: 'Iron Chain', icon: '⛓', tags: ['iron', 'playmaker'], role: 'ult', rarity: 'mythic', hybrid: true,
      desc: 'Steel chains link your team and clothesline anyone crossing.',
      params: { time: 3.5, width: 5, stun: 0.9, knock: 140 },
      scale: { time: 'pow', stun: 'pow' },
    },
    // 🥊 + 🛡 — Iron Hammer (búa kiểu Poppy): chỉ dùng khi KHÔNG cầm bóng (noBall). Lôi búa khổng lồ ra gồng windup giây
    // (xoay hướng được), nện hình quạt phía trước: đối thủ trúng bay rất xa theo hướng búa
    iron_hammer: {
      name: 'Iron Hammer', icon: '🔨', tags: ['brawler', 'iron'], role: 'ult', rarity: 'mythic', hybrid: true, noBall: true,
      desc: 'Swing a giant hammer that sends opponents flying.',
      params: { windup: 0.55, range: 48, arc: 70, knock: 720, launch: 180, stun: 1.4 },
      scale: { knock: 'pow', stun: 'pow' },
    },
    // 🏃 + 🌀 — Phase Step: time giây, mỗi lần lướt Z dịch chuyển thêm distance px, hồi lướt nhanh (cdMult),
    // để lại ảo ảnh chạy tiếp hướng cũ (AI đối thủ gần đó đuổi nhầm confuse giây)
    phase_step: {
      name: 'Phase Step', icon: '👣', tags: ['runner', 'trickster'], role: 'ult', rarity: 'mythic', hybrid: true,
      desc: 'Your dodges become blinks that leave running afterimages behind.',
      params: { time: 4, distance: 60, cdMult: 0.3, clone: 1.2, confuse: 1.2 },
      scale: { time: 'pow', distance: 'pow' },
    },
    slingshot: {
      name: 'Slingshot', icon: '🪃', tags: ['brawler', 'playmaker'], role: 'ult', rarity: 'mythic', hybrid: true, needsBall: true,
      desc: 'Stretch your arms and slingshot a teammate at the goal.',
      params: { grab: 0.22, distance: 200, flight: 0.38, knock: 200, launch: 120, stun: 0.6 },
      scale: { distance: 'pow', knock: 'pow', stun: 'pow' },
    },
    // 🏃 + 🎼 — Thunderstorm: gọi bolts tia sét đánh xuống sân (quanh đối thủ + ngẫu nhiên), mỗi tia có vòng cảnh báo telegraph giây để né
    thunderstorm: {
      name: 'Thunderstorm', icon: '⛈', tags: ['runner', 'playmaker'], role: 'ult', rarity: 'mythic', hybrid: true,
      desc: 'Summon lightning bolts all over the pitch; dodge the circles.',
      params: { bolts: 9, telegraph: 0.5, gap: 0.14, radius: 18, stun: 1.0, knock: 120 },
      scale: { radius: 'pow', stun: 'pow' },
    },
    // 🏃 + 🎯 — Time Stop Strike: thời gian ngưng (mọi người + bóng đứng yên), người cầm bóng chớp quanh bóng đá kicks lần
    // (bóng chỉ nhích step px, mũi tên hiện cho cả sân thấy). Hết ngưng: đối thủ cử động lại trước react giây (kịp chạy ra chắn
    // mũi tên) rồi bóng mới bay với lực sút x speed; thủ môn đã thấy trước nên dễ bắt hơn (gk âm)
    time_stop_strike: {
      name: 'Time Stop Strike', icon: '⏱', tags: ['runner', 'striker'], role: 'ult', rarity: 'mythic', hybrid: true, needsBall: true,
      desc: 'Freeze time, kick the ball thrice, then let it fly.',
      params: { gap: 0.4, kicks: 3, step: 22, react: 0.45, speed: 0.85, gk: -0.25 },   // react: đối thủ cử động lại trước khi bóng bay
    },
    // 🏃 + 🥊 — Rocket Punch: gồng windup giây (vạch thẳng ngang sân; bị đấm lúc gồng là huỷ), nắm đấm phóng ra như tên lửa bay speed px/s:
    // đối thủ đầu tiên trúng văng, bóng lỏng trên đường bị thổi về phía trước
    rocket_punch: {
      name: 'Rocket Punch', icon: '🚀', tags: ['runner', 'brawler'], role: 'ult', rarity: 'mythic', hybrid: true,
      desc: 'Fire your fist like a rocket across the pitch.',
      params: { windup: 0.4, speed: 520, width: 12, knock: 560, launch: 80, stun: 1.4, ballSpeed: 430 },
      scale: { knock: 'pow', stun: 'pow' },
    },
    // 🏃 + 🛡 — Monster Truck: gọi xe tải quái vật, người dùng lái (đi thẳng, rẽ theo phím với tốc độ rẽ turn) time giây, cán bẹp mọi đối thủ chạm phải.
    // Đang cầm bóng thì bóng chạy theo đầu xe. Né Z được
    monster_truck: {
      name: 'Monster Truck', icon: '🛻', tags: ['runner', 'iron'], role: 'ult', rarity: 'mythic', hybrid: true,
      desc: 'Summon a monster truck and run over everyone.',
      params: { time: 2.6, speed: 210, turn: 2.6, radius: 13, knock: 320, launch: 160, stun: 1.1 },
      scale: { time: 'pow', knock: 'pow', stun: 'pow' },
    },
    // 🎼 + 🦵 — Boomerang Kick: bóng bay theo vòng cung lớn (đường chấm hiện trước) flight giây tới đồng đội đứng cao nhất,
    // hất ngã đối thủ bóng đi qua (né Z được); thủ môn bắt được như thường
    boomerang_kick: {
      name: 'Boomerang Kick', icon: '🪃', tags: ['playmaker', 'launcher'], role: 'ult', rarity: 'mythic', hybrid: true, needsBall: true,
      desc: 'Kick a huge curving arc that flattens opponents, then returns.',
      params: { telegraph: 0.25, flight: 1.1, bend: 110, width: 10, knock: 260, launch: 200, stun: 1.0 },
      scale: { knock: 'pow', stun: 'pow' },
    },
    // 🎼 + 🌀 — Switcheroo: phép tráo chỗ với đồng đội (báo trước telegraph giây): đội cầm bóng -> đồng đội đứng cao nhất;
    // đối thủ cầm bóng -> đồng đội gần người cầm bóng nhất. Bóng ở chân ai vẫn ở chân người đó
    switcheroo: {
      name: 'Switcheroo', icon: '🔄', tags: ['playmaker', 'trickster'], role: 'ult', rarity: 'mythic', hybrid: true,
      desc: 'Swap places with your best-placed teammate in a puff.',
      params: { telegraph: 0.35 },
    },
    // 🎯 + 🥊 — Dodgeball: cú sút hoá bóng né, nảy từ đầu đối thủ này sang đầu đối thủ khác (tối đa hits người, trong range px),
    // ai trúng thì trơn té; hết người thì bay về khung. Né Z được, thủ môn trong vòng cấm không bị nhắm
    dodgeball: {
      name: 'Dodgeball', icon: '🏐', tags: ['striker', 'brawler'], role: 'ult', rarity: 'mythic', hybrid: true, needsBall: true,
      desc: 'Your shot ricochets off opponents\' heads, then flies at goal.',
      params: { windup: 0.2, hits: 3, speed: 400, range: 170, slip: 1.0, slide: 200, gk: 0.15 },
      scale: { slip: 'pow', gk: 'pow' },
    },
    cannonball: {
      name: 'Cannonball', icon: '💣', tags: ['striker', 'launcher'], role: 'ult', rarity: 'mythic', hybrid: true, needsBall: true,
      desc: 'A shot so heavy it blows up whatever it hits.',
      params: { windup: 0.25, speed: 1.1, fuse: 2.2, radius: 52, knock: 300, launch: 260, stun: 1.3 },   // fuse: chưa chạm ai thì tự nổ
      scale: { radius: 'pow', knock: 'pow', launch: 'pow', stun: 'pow' },
    },
    // 🎯 + 🛡 — Boulder Shot: bóng hoá tảng đá khổng lồ lăn chậm (speed px/s) time giây, không ai nhặt được, cán bẹp người đứng trước;
    // đối thủ đấm / đá vào tảng đá thì nó chậm lại (x slow) và lệch theo hướng cú đánh. Hết giờ / dừng hẳn -> bóng thường
    boulder_shot: {
      name: 'Boulder Shot', icon: '🪨', tags: ['striker', 'iron'], role: 'ult', rarity: 'mythic', hybrid: true, needsBall: true,
      desc: 'The ball becomes a giant boulder rolling over everyone.',
      params: { windup: 0.3, speed: 150, time: 3.2, r: 9, slow: 0.6, knock: 200, stun: 1.2 },
      scale: { time: 'pow', stun: 'pow' },
    },
    // 🥊 + 🌀 — Ghost Hands: vũng bóng tím hiện dưới chân tối đa targets đối thủ (báo trước telegraph giây), bàn tay ma trồi lên
    // túm chân giữ đứng yên hold giây (rơi bóng). Bước ra khỏi vũng / lướt Z là thoát
    ghost_hands: {
      name: 'Ghost Hands', icon: '🖐', tags: ['brawler', 'trickster'], role: 'ult', rarity: 'mythic', hybrid: true,
      desc: 'Ghostly hands burst from the ground and grab opponents.',
      params: { range: 190, targets: 3, telegraph: 0.5, radius: 26, hold: 1.3 },   // vũng đặt đón đầu chỗ đối thủ sắp chạy tới
      scale: { range: 'pow', hold: 'pow' },
    },
    // 🦵 + 🌀 — Portal Kicks: người dùng đứng yên đá vào cổng; cổng nhỏ mở cạnh tối đa targets đối thủ (báo trước telegraph giây,
    // lần lượt cách nhau gap giây), chân thò ra từ cổng đá văng. Bị đấm giữa chừng thì các cú còn lại huỷ
    portal_kicks: {
      name: 'Portal Kicks', icon: '🌀', tags: ['launcher', 'trickster'], role: 'ult', rarity: 'mythic', hybrid: true,
      desc: 'Kick into portals; your foot strikes opponents from anywhere.',
      params: { range: 200, targets: 3, telegraph: 0.5, gap: 0.22, reach: 54, knock: 320, launch: 200, stun: 1.0 },   // reach: chân vươn khỏi cổng
      scale: { range: 'pow', knock: 'pow', stun: 'pow' },
    },
    // 🦵 + 🛡 — Earth Spike: vết nứt chạy thẳng ra trước (báo trước telegraph giây) -> hàng cột đá trồi lên hất tung người đứng trên;
    // cột đứng lại life giây như tường thật: chặn người + bóng của cả hai đội
    earth_spike: {
      name: 'Earth Spike', icon: '🗻', tags: ['launcher', 'iron'], role: 'ult', rarity: 'mythic', hybrid: true,
      desc: 'Three times: kick up a rock wall that launches opponents.',
      params: { charges: 3, window: 8, telegraph: 0.4, pillars: 6, step: 18, start: 24, life: 3, radius: 8, launch: 260, knock: 120, stun: 1.0 },   // charges lần trong window giây (bấm X lại)
      scale: { life: 'pow', launch: 'pow', stun: 'pow' },
    },
    // 🌀 + 🛡 — Medusa Gaze: mắt rắn loé sáng (báo trước telegraph giây), mọi đối thủ trong hình nón phía trước (range px, cone độ) hoá đá time giây:
    // đứng chết trân, cầm bóng thì rơi bóng. Quay lưng / chạy ra khỏi nón / lướt Z lúc loé là thoát
    medusa_gaze: {
      name: 'Medusa Gaze', icon: '🐍', tags: ['trickster', 'iron'], role: 'ult', rarity: 'mythic', hybrid: true,
      desc: 'Glare ahead: opponents in your gaze turn to stone.',
      params: { telegraph: 0.5, range: 150, cone: 38, time: 2.2 },
      scale: { range: 'pow', time: 'pow' },
    },
    // 🎲 + 🏃 — VHS Rewind: nhiễu băng báo trước telegraph giây, rồi mọi người trừ người dùng bị tua về chỗ đứng back giây trước.
    // Bóng ở chân ai thì đi theo người đó (không bao giờ giật bóng), bóng lỏng đứng yên; không tua được bàn thắng
    vhs_rewind: {
      name: 'VHS Rewind', icon: '📼', tags: ['chaos', 'runner'], role: 'ult', rarity: 'mythic', hybrid: true,
      desc: 'Rewind everyone else a few seconds; the ball stays put.',
      params: { telegraph: 0.3, back: 2, every: 0.1, anim: 1.0 },   // anim: giây diễn tua ngược (cả sân đứng yên, mọi người chạy lùi theo đường cũ)
    },
    // 🎲 + 🎼 — Banana Pass: chuyền tới đồng đội đứng cao nhất, bóng rải vỏ chuối dọc đường bay (mỗi every px, nằm life giây);
    // đối thủ dẫm phải trơn té trượt đi. Nhìn thấy để đi vòng / lướt Z qua
    banana_pass: {
      name: 'Banana Pass', icon: '🍌', tags: ['chaos', 'playmaker'], role: 'ult', rarity: 'mythic', hybrid: true, needsBall: true,
      desc: 'Your pass drops banana peels; opponents slip and slide.',
      params: { every: 16, life: 6, radius: 7, slip: 1.1, slide: 220 },
      scale: { life: 'pow', slip: 'pow' },
    },
    // 🎲 + 🎯 — Shrink Ray: tia thu nhỏ (vạch báo trước telegraph giây, né Z được) xuyên mọi đối thủ trên đường: teo nhỏ time giây
    // (cỡ size: tầm bắt bóng thủ môn nhỏ theo), chạy chậm còn slow
    shrink_ray: {
      name: 'Shrink Ray', icon: '🔬', tags: ['chaos', 'striker'], role: 'ult', rarity: 'mythic', hybrid: true,
      desc: 'Zap opponents tiny: slower, weaker, and easier to beat.',
      params: { telegraph: 0.35, width: 22, time: 4, size: 0.55, slow: 0.75 },
      scale: { time: 'pow' },
    },
    // 🎲 + 🥊 — Jack-in-the-Box: đặt boxes hộp lò xo quanh mình (sẵn sàng sau arm giây, sống life giây); đối thủ tới gần radius
    // thì găng đấm bật ra hất văng; đối thủ đấm / đá vào hộp thì phá được
    jack_in_box: {
      name: 'Jack-in-the-Box', icon: '🎁', tags: ['chaos', 'brawler'], role: 'ult', rarity: 'mythic', hybrid: true,
      desc: 'Plant spring-loaded boxing gloves that punch passing opponents.',
      params: { boxes: 3, spread: 34, arm: 0.4, life: 6, radius: 16, knock: 360, launch: 140, stun: 1.0 },
      scale: { life: 'pow', knock: 'pow', stun: 'pow' },
    },
    pinball_kick: {
      name: 'Pinball Kick', icon: '🕹', tags: ['chaos', 'launcher'], role: 'ult', rarity: 'mythic', hybrid: true,
      desc: 'Kick an opponent into a pinball that bowls others over.',
      params: { range: 150, rush: 520, speed: 420, bounces: 6, time: 2.4, knock: 220, launch: 160, stun: 1.0 },   // bounces: nảy tường tối đa
      scale: { speed: 'pow', knock: 'pow', stun: 'pow' },
    },
    shell_game: {
      name: 'Shell Game', icon: '🥥', tags: ['chaos', 'trickster'], role: 'ult', rarity: 'mythic', hybrid: true,
      desc: 'You and your clones shuffle spots; guess which is real.',
      params: { clones: 3, spread: 46, delay: 0.35, time: 2.2, confuse: 1.6 },   // delay: phân thân hiện ra rồi mới tráo chỗ
      scale: { time: 'pow', confuse: 'pow' },
    },
    // 🎲 + 🛡 — Mega Magnet: nam châm khổng lồ hạ xuống giữa đám đối thủ (bóng đổ + vòng báo trước telegraph giây), hút mọi đối thủ trong radius
    // về tâm pull px/s trong time giây (chạy nước rút / lướt Z thoát được); ai bị hút dính vào tâm thì choáng
    mega_magnet: {
      name: 'Mega Magnet', icon: '🧲', tags: ['chaos', 'iron'], role: 'ult', rarity: 'mythic', hybrid: true,
      desc: 'A giant magnet drags opponents together into a heap.',
      params: { telegraph: 0.6, radius: 150, pull: 100, time: 1.4, stun: 1.0 },
      scale: { radius: 'pow', stun: 'pow' },
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
