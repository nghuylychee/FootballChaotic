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
 *           lightCooldown, skillCooldown, passAccuracy, interceptTaken (tỉ lệ bị cắt đường chuyền)
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

  // Cộng hưởng: số Core cùng trường phái (Core cầu nối tính cho cả hai). Logic ở systems/cores.js (SET_RULES)
  sets: {
    runner:    { 2: 'Max Momentum +1', 3: 'At max Momentum: sprinting costs 25% less stamina', 4: 'Momentum lasts 2s longer · each Momentum +1% shot & pass power' },
    playmaker: { 2: 'Receiving a pass also gives +1 Rhythm', 3: 'Losing the ball once keeps your Rhythm (10s cooldown)', 4: 'At 5 Rhythm: your passes cannot be intercepted' },
    striker:   { 2: '+15% shot power · charged shots: keeper −12% save', 3: 'Charged shots from 40% power', 4: 'Shot on target: team cooldowns −30%' },
    brawler:   { 2: 'Rage decays half as fast', 3: 'At 5 Rage: punches have no cooldown for 2s', 4: 'Punch hits restore 5 stamina, stun +50%' },
    launcher:  { 2: 'Launch +25% · Hard cooldown −15% · kicking the ball carrier drops the ball at your feet', 3: 'BONK stuns everyone within 30px', 4: 'Hard cooldown −40%' },
    trickster: { 2: 'Afterimages last +1s · Z cooldown −20%', 3: 'Successful dodge: Z resets instantly', 4: 'Z gets 2 charges' },
    iron:      { 2: '+1 Guard every kickoff', 3: 'Regain 1 Guard every 8s', 4: 'Keeper +20% save chance' },
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
    rerollsPerRound: 1,      // mỗi lượt chọn được đổi cả 3 lá bao nhiêu lần
  },

  list: {
    /* ---------- 🎯 SÁT THỦ ---------- */
    sniper_foot: {
      name: 'Sharpshooter', icon: '🎯', tags: ['striker'], role: 'base', rarity: 'common',
      desc: 'Shots {m.accuracy+%}% more accurate and roll further. Hold D to aim with a red laser sight.',
      mods: { accuracy: 1.6 },
      params: { frictionMult: 0.35, speedMult: 0.85, aiRangeMult: 1.5 },
      scale: { 'm.accuracy': 'mul' },
    },
    banana_kick: {
      name: 'Dragon Curl', icon: '🐉', tags: ['striker'], role: 'gen', rarity: 'rare',
      desc: 'Shots curl on their own toward the corner of the goal, trailing a green dragon.',
      params: { strength: 2.4 },
      scale: { strength: 'pow' },
    },
    fire_shot: {
      name: 'Fireball', icon: '🔥', tags: ['striker'], role: 'gen', rarity: 'rare',
      desc: 'Charged shot +{m.shotPower+%}% power and sets the pitch on fire for {trailDuration}s ({stun}s stun on touch).',
      mods: { shotPower: 1.12 },
      params: { trailInterval: 0.035, trailDuration: 2.6, trailRadius: 6, stun: 0.9, knockback: 150 },
      scale: { 'm.shotPower': 'mul', stun: 'pow', knockback: 'pow', trailDuration: 'pow' },
    },
    thunder_kick: {
      name: 'Thunder Kick', icon: '⚡', tags: ['striker'], role: 'gen', rarity: 'legendary',
      desc: 'Long charge (≥60%): the lightning ball pierces 1 player ({stun}s stun), keeper −{gkPenalty%}% save.',
      mods: { chargeTime: 1.2 },
      params: { minCharge: 0.6, pierce: 1, speedMult: 1.2, stun: 0.7, gkPenalty: 0.25 },
      scale: { stun: 'pow', gkPenalty: 'pow', speedMult: 'mul' },
    },

    /* ---------- 🏃 TỐC ĐỘ · 🌀 ẢO ẢNH ---------- */
    speed_demon: {
      name: 'Speed Demon', icon: '🪽', tags: ['runner'], role: 'gen', rarity: 'common',
      desc: 'Sprinting builds Momentum {m.momentumGain+%}% faster. +{m.offBallSpeed+%}% speed off the ball.',
      mods: { offBallSpeed: 1.05, momentumGain: 1.5 },
      scale: { 'm.offBallSpeed': 'mul', 'm.momentumGain': 'mul' },
    },
    phantom_step: {
      name: 'Phantom Step', icon: '🌀', tags: ['trickster'], role: 'gen', rarity: 'rare',
      desc: 'Z teleports further and leaves an illusion for {illusion}s that lures the nearest opponent ({lureCooldown}s cooldown).',
      params: { distance: 34, illusion: 1.2, lureRadius: 60, lure: 0.4, lureCooldown: 4 },
      scale: { distance: 'pow', illusion: 'pow', lure: 'pow', lureCooldown: 'cd' },
    },
    fake_run: {
      name: 'Fake Run', icon: '🪞', tags: ['runner', 'trickster'], role: 'gen', rarity: 'rare',
      desc: 'Sprint / Z with the ball: a fake runs the other way, fooling defenders for {confuseTime}s. +2 Momentum ({cooldown}s cooldown).',
      params: { cooldown: 3.5, duration: 1.6, confuseRadius: 90, confuseTime: 1.2, angle: 0.8, momentum: 2 },
      scale: { cooldown: 'cd', duration: 'pow', confuseTime: 'pow' },
    },

    /* ---------- 🥊 ĐẤU SĨ · 🛡 THÉP · 🦵 VÕ SĨ ĐÁ ---------- */
    street_fighter: {
      name: 'Street Fighter', icon: '🥊', tags: ['brawler'], role: 'gen', rarity: 'common',
      desc: 'Punch range +{m.tackleRange+%}%, steal chance +{m.tackleChance+%}%. +1 Rage per steal.',
      mods: { tackleRange: 1.3, tackleChance: 1.3, knockback: 1.3 },
      params: { rageOnSteal: 1 },
      scale: { 'm.tackleRange': 'mul', 'm.tackleChance': 'mul', 'm.knockback': 'mul' },
    },
    iron_body: {
      name: 'Iron Skin', icon: '🛡', tags: ['iron'], role: 'gen', rarity: 'common',
      desc: 'Each player gets 1 Guard (blocks one stun), refilled every {regen}s.',
      params: { regen: 7 },
      scale: { regen: 'cd' },
    },
    blade_runner: {
      name: 'Wind Blade', icon: '🌙', tags: ['launcher'], role: 'gen', rarity: 'legendary',
      desc: 'Hard attack fires a wind blade: {stun}s stun and the ball drops.',
      params: { speed: 300, life: 0.5, length: 18, stun: 0.9 },
      scale: { stun: 'pow' },
    },

    /* ---------- 🛡 THÉP · 🎼 TIKI-TAKA · cầu nối ---------- */
    aegis_wall: {
      name: 'Aegis Shield', icon: '🧱', tags: ['iron'], role: 'base', rarity: 'legendary',
      desc: 'An energy shield on your goal line blocks 1 shot, recharges after {cooldown}s.',
      params: { cooldown: 60 },
      scale: { cooldown: 'cd' },
    },
    counter_attack: {
      name: 'Counter Attack', icon: '↩', tags: ['brawler', 'runner'], role: 'gen', rarity: 'rare',
      desc: 'Win the ball: team +3 Momentum, +{speedMult+%}% speed and +{shotMult+%}% shot power for {duration}s.',
      params: { duration: 3.5, speedMult: 1.2, shotMult: 1.2, momentum: 3, calloutCd: 15 },
      scale: { duration: 'pow', speedMult: 'mul', shotMult: 'mul' },
    },
    emp_trap: {
      name: 'EMP Mine', icon: '📡', tags: ['iron'], role: 'gen', rarity: 'epic',
      desc: 'Every attack drops an EMP mine ({cooldown}s cooldown): {stun}s stun and the ball drops.',
      params: { cooldown: 2.5, max: 3, life: 14, radius: 9, arm: 0.5, stun: 1.0 },
      scale: { stun: 'pow', radius: 'pow', cooldown: 'cd' },
    },
    maestro: {
      name: 'Maestro', icon: '🎼', tags: ['playmaker'], role: 'gen', rarity: 'common',
      desc: 'Passes +{m.passSpeed+%}% faster. The receiver gets a {duration}s speed boost and +1 Rhythm.',
      mods: { passSpeed: 1.2 },
      params: { duration: 1.5, speedMult: 1.25, rhythm: 1 },
      scale: { 'm.passSpeed': 'mul', duration: 'pow', speedMult: 'mul' },
    },

    /* ---------- TUYỆT KỸ (phím X) ---------- */
    // Tuyệt kỹ thí điểm (Giai đoạn 1) — kiểm tra khung năng lượng + phím X; các Tuyệt kỹ khác ở Giai đoạn 3
    lightning_dash: {
      name: 'Lightning Dash', icon: '⚡', tags: ['runner'], role: 'ult', rarity: 'mythic',
      desc: 'Dash {distance}px as lightning with the ball, shocking everyone in the path for {stun}s.',
      params: { distance: 190, width: 18, stun: 0.8, knock: 140 },
      scale: { distance: 'pow', stun: 'pow', knock: 'pow' },
    },

    /* ================= Giai đoạn 3 — Core mới (hành vi ở src/systems/cores-new.js) ================= */
    /* ---------- 🏃 TỐC ĐỘ ---------- */
    burst_start: {
      name: 'Arrow Start', icon: '🏹', tags: ['runner'], role: 'gen', rarity: 'rare',
      desc: 'Start sprinting: +2 Momentum and a {time}s burst ({cooldown}s cooldown).',
      params: { momentum: 2, boost: 1.3, time: 0.35, cooldown: 3 },
      scale: { boost: 'mul', time: 'pow', cooldown: 'cd' },
    },
    sonic_boom: {
      name: 'Sonic Boom', icon: '💥', tags: ['runner'], role: 'use', rarity: 'epic',
      desc: 'Max Momentum with the ball: blast opponents you brush past + {stun}s stun. Spends all Momentum ({cooldown}s cooldown).',
      params: { gap: 14, knock: 180, launch: 70, stun: 0.35, cooldown: 10 },
      scale: { knock: 'pow', launch: 'pow', stun: 'pow', cooldown: 'cd' },
    },
    freight_train: {
      name: 'Freight Train', icon: '🚚', tags: ['runner'], role: 'use', rarity: 'epic',
      desc: 'Collide head-on with ≥5 Momentum: send them flying + {stun}s stun. Spends 5 Momentum ({cooldown}s cooldown).',
      params: { minMomentum: 5, cost: 5, minSpeed: 90, knock: 190, launch: 120, stun: 0.4, cooldown: 15 },
      scale: { knock: 'pow', launch: 'pow', stun: 'pow', cooldown: 'cd' },
    },

    /* ---------- 🎼 TIKI-TAKA ---------- */
    eagle_eye: {
      name: 'Eagle Eye', icon: '🦅', tags: ['playmaker'], role: 'base', rarity: 'common',
      desc: 'Shows your pass line. Passes {m.passAccuracy+%}% more accurate, {m.interceptTaken-%}% harder to intercept.',
      mods: { passAccuracy: 1.6, interceptTaken: 0.7 },
      scale: { 'm.passAccuracy': 'mul', 'm.interceptTaken': 'mul' },
    },
    one_touch: {
      name: 'One Touch', icon: '✨', tags: ['playmaker'], role: 'gen', rarity: 'rare',
      desc: 'Pass within {window}s of receiving: +2 Rhythm and the ball ghosts through opponents.',
      params: { window: 0.6, rhythm: 2 },
      scale: { window: 'pow' },
    },
    phantom_pass: {
      name: 'Phantom Pass', icon: '💫', tags: ['playmaker'], role: 'use', rarity: 'epic',
      desc: 'Through pass with ≥3 Rhythm: an unstoppable golden beam; the receiver gets a {time}s speed boost.',
      params: { cost: 3, speedMult: 1.3, boost: 1.3, time: 2 },
      scale: { boost: 'mul', time: 'pow' },
    },
    symphony: {
      name: 'Symphony', icon: '🎻', tags: ['playmaker'], role: 'use', rarity: 'epic',
      desc: 'Shoot with ≥3 Rhythm: each Rhythm +{powerPer%}% shot power, keeper −{gkPer%}% save. Spends all Rhythm.',
      params: { min: 3, powerPer: 0.08, gkPer: 0.05 },
      scale: { powerPer: 'pow', gkPer: 'pow' },
    },

    /* ---------- 🎯 SÁT THỦ ---------- */
    energy_wave: {
      name: 'Energy Wave', icon: '🌊', tags: ['striker'], role: 'use', rarity: 'epic',
      desc: 'Charge ≥80%: an energy beam fires with the ball, pushing opponents aside + {stun}s stun.',
      params: { minCharge: 0.8, len: 300, width: 18, knock: 300, stun: 0.8 },
      scale: { knock: 'pow', stun: 'pow' },
    },
    black_hole: {
      name: 'Black Hole Shot', icon: '🕳', tags: ['striker'], role: 'use', rarity: 'legendary',
      desc: 'Charge ≥80%: the ball becomes a black hole for {time}s, pulling everyone within {radius}px.',
      params: { minCharge: 0.8, radius: 64, pull: 1500, time: 1.4 },
      scale: { radius: 'pow', pull: 'pow', time: 'pow' },
    },

    /* ---------- 🥊 ĐẤU SĨ ---------- */
    fist_storm: {
      name: 'Fist Storm', icon: '👊', tags: ['brawler'], role: 'gen', rarity: 'rare',
      desc: 'Punches become a 4-hit combo, +1 Rage per hit. Punch cooldown +10%.',
      mods: { lightCooldown: 1.1 },
      params: { hits: 4, gap: 0.07, range: 22, push: 220 },
      scale: { push: 'pow' },
    },
    giant_fist: {
      name: 'Giant Fist', icon: '✊', tags: ['brawler'], role: 'use', rarity: 'epic',
      desc: 'At 5 Rage your next punch is 4× bigger: always steals, {knock}× knockback. Spends all Rage.',
      scale: { knock: 'pow' },
      params: { knock: 2.5, range: 2 },
    },

    /* ---------- 🦵 VÕ SĨ ĐÁ ---------- */
    heavy_boot: {
      name: 'Iron Boots', icon: '🥾', tags: ['launcher'], role: 'base', rarity: 'common',
      desc: 'Launch +{m.launch+%}%, kick range +{m.hardRange+%}%, Hard cooldown −{m.hardCooldown-%}%, windup {m.hardWindup-%}% faster.',
      mods: { launch: 1.3, hardCooldown: 0.8, hardWindup: 0.7, hardRange: 1.4 },
      scale: { 'm.launch': 'mul', 'm.hardCooldown': 'mul', 'm.hardWindup': 'mul', 'm.hardRange': 'mul' },
    },
    juggle: {
      name: 'Juggle', icon: '🤹', tags: ['launcher'], role: 'use', rarity: 'rare',
      desc: 'Punch airborne players to keep them up ({stun}s stun, +1 Rage each). 2 HIT! 3 HIT!',
      params: { lift: 200, stun: 0.7 },
      scale: { lift: 'pow', stun: 'pow' },
    },
    wall_slam: {
      name: 'Wall Slam', icon: '🏚', tags: ['launcher'], role: 'use', rarity: 'rare',
      desc: 'Launch an opponent into the wall: +{stun}s stun, and a loose ball bounces to you.',
      params: { stun: 1, ballSpeed: 170 },
      scale: { stun: 'pow' },
    },
    ground_slam: {
      name: 'Ground Slam', icon: '🌋', tags: ['launcher'], role: 'gen', rarity: 'epic',
      desc: 'Hard attack leaps into a slam: a {radius}px shockwave launches everyone + {stun}s stun.',
      params: { jump: 150, leap: 130, maxSpeed: 300, radius: 52, knock: 160, launch: 230, stun: 1.1, recover: 0.12 },
      scale: { radius: 'pow', knock: 'pow', launch: 'pow', stun: 'pow' },
    },

    /* ---------- 🌀 ẢO ẢNH ---------- */
    quick_feet: {
      name: 'Ninja Footwork', icon: '🥷', tags: ['trickster'], role: 'base', rarity: 'common',
      desc: 'Z cooldown −{m.skillCooldown-%}%, dodge window +{dodgeBonus}s.',
      mods: { skillCooldown: 0.7 },
      params: { dodgeBonus: 0.15 },
      scale: { 'm.skillCooldown': 'mul', dodgeBonus: 'pow' },
    },
    witch_time: {
      name: 'Perfect Dodge', icon: '⏳', tags: ['trickster'], role: 'use', rarity: 'epic',
      desc: 'Successful dodge slows the whole pitch for {time}s; you stay fast and Z resets.',
      params: { scale: 0.35, time: 0.8, boost: 2.6, cooldown: 4 },
      scale: { time: 'pow', boost: 'mul' },
    },
    shadow_clone: {
      name: 'Shadow Clone', icon: '👥', tags: ['trickster'], role: 'gen', rarity: 'epic',
      desc: 'Z spawns 2 clones for {time}s that block opponents and passing lanes.',
      params: { count: 2, time: 2, speed: 170, spread: 0.7 },
      scale: { time: 'pow' },
    },

    /* ---------- 🛡 THÉP ---------- */
    bulldozer: {
      name: 'Bulldozer', icon: '🚜', tags: ['iron'], role: 'use', rarity: 'epic',
      desc: 'With Guard + the ball: grow 1.3×, can\'t be tackled, bowl opponents over ({stun}s stun).',
      params: { scale: 1.3, slow: 0.88, knock: 170, launch: 80, stun: 0.3, every: 2 },
      scale: { knock: 'pow', launch: 'pow', stun: 'pow' },
    },
    giant_keeper: {
      name: 'Giant Keeper', icon: '🧤', tags: ['iron'], role: 'use', rarity: 'epic',
      desc: 'Your keeper with Guard grows {scale}× when the ball is within {near}px of goal.',
      params: { scale: 1.4, near: 150 },
      scale: { scale: 'mul', near: 'pow' },
    },

    /* ---------- 🔗 Cầu nối ---------- */
    rubber_arm: {
      name: 'Rubber Arm', icon: '🤜', tags: ['brawler', 'playmaker'], role: 'use', rarity: 'epic',
      desc: 'Punch stretches {reach}px: pull players in or yank loose balls to you ({cooldown}s cooldown).',
      params: { reach: 50, pull: 180, stun: 0.4, steal: 0.25, cooldown: 2 },
      scale: { reach: 'pow', pull: 'pow', stun: 'pow', steal: 'pow', cooldown: 'cd' },
    },
    uppercut: {
      name: 'Dragon Uppercut', icon: '🐲', tags: ['brawler', 'launcher'], role: 'use', rarity: 'rare',
      desc: 'At 5 Rage your punch becomes an uppercut: launch them up, the ball drops to you. Spends all Rage.',
      params: { launch: 330, jump: 80 },
      scale: { launch: 'pow' },
    },
    iron_fist: {
      name: 'Iron Fist', icon: '🦾', tags: ['brawler', 'iron'], role: 'gen', rarity: 'rare',
      desc: 'With Guard: punches always steal, +1 extra Rage. Each Rage cuts your stun by {stunPerRage%}%.',
      params: { rage: 1, stunPerRage: 0.08 },
      scale: { stunPerRage: 'pow' },
    },
    one_two: {
      name: 'One-Two', icon: '🔁', tags: ['playmaker', 'striker'], role: 'use', rarity: 'epic',
      desc: 'Shoot within {window}s of receiving a pass: counts as a max charged volley.',
      params: { window: 1.2 },
      scale: { window: 'pow' },
    },
    captain: {
      name: 'Captain', icon: '🎖', tags: ['iron', 'playmaker'], role: 'gen', rarity: 'epic',
      desc: 'Every completed pass gives the receiver 1 Guard ({cooldown}s cooldown per player).',
      params: { cooldown: 6 },
      scale: { cooldown: 'cd' },
    },
    counter_strike: {
      name: 'Counter Strike', icon: '⚔', tags: ['trickster', 'brawler'], role: 'use', rarity: 'epic',
      desc: 'Successful dodge: {window}s of free punches that always steal, +2 Rage ({cooldown}s cooldown).',
      params: { window: 1, rage: 2, cooldown: 4 },
      scale: { window: 'pow', cooldown: 'cd' },
    },
    flying_kick: {
      name: 'Flying Kick', icon: '🚀', tags: ['runner', 'launcher'], role: 'use', rarity: 'epic',
      desc: 'Hard attack spends all Momentum: each Momentum flies + launches {perMomentum%}% further.',
      params: { perMomentum: 0.2 },
      scale: { perMomentum: 'pow' },
    },
    ghost_ball: {
      name: 'Ghost Ball', icon: '👻', tags: ['trickster', 'striker'], role: 'use', rarity: 'epic',
      desc: 'Shoot with illusions out: each fires a fake ball too (max 3), keeper −{gkPenalty%}% save.',
      params: { max: 3, gkPenalty: 0.2, speed: 320 },
      scale: { gkPenalty: 'pow' },
    },
    scissor_kick: {
      name: 'Scissor Kick', icon: '✂', tags: ['launcher', 'striker'], role: 'use', rarity: 'legendary',
      desc: 'Hard attack on a loose ball: a bicycle-kick max shot that pierces 2 players ({stun}s stun, {cooldown}s cooldown).',
      params: { speed: 1.1, pierce: 2, stun: 0.6, cooldown: 4 },
      scale: { stun: 'pow', cooldown: 'cd' },
    },

    /* ---------- TUYỆT KỸ mới ---------- */
    endless_tiki: {
      name: 'Endless Tiki-Taka', icon: '🎼', tags: ['playmaker'], role: 'ult', rarity: 'mythic',
      desc: 'Opponents slow {slow-%}% for {slowTime}s while your duo auto-passes 4 times, then a max shot (keeper −{gk%}% save).',
      params: { passes: 4, gap: 0.22, slow: 0.4, slowTime: 1.8, gk: 0.25 },
      scale: { slow: 'mul', slowTime: 'pow', gk: 'pow' },
    },
    meteor_strike: {
      name: 'Meteor Shot', icon: '🌟', tags: ['striker'], role: 'ult', rarity: 'mythic',
      desc: 'Leap up, then drive the ball down at max power (keeper −{gk%}% save). Saving it still hurts.',
      params: { jump: 300, delay: 0.62, speed: 560, gk: 0.3 },
      scale: { gk: 'pow' },
    },
    hundred_fists: {
      name: 'Hundred Fists', icon: '💢', tags: ['brawler'], role: 'ult', rarity: 'mythic',
      desc: 'Rush the nearest opponent within {range}px: 20 punches in 1s, then blast them into the wall ({stun}s stun).',
      params: { range: 160, hits: 20, gap: 0.05, knock: 560, stun: 1.4 },   // stun: choáng sau cú kết (tính từ lúc tiếp đất)
      scale: { knock: 'pow', range: 'pow', stun: 'pow' },
    },
    meteor_drop: {
      name: 'Meteor Drop', icon: '☄️', tags: ['launcher'], role: 'ult', rarity: 'mythic',
      desc: 'Leap off screen, aim for 1s, crash down: a {radius}px crater launches everyone + {stun}s stun.',
      params: { aim: 1.0, speed: 190, radius: 60, knock: 240, launch: 260, stun: 1.5 },
      scale: { radius: 'pow', knock: 'pow', launch: 'pow', stun: 'pow' },
    },
    clone_army: {
      name: 'Clone Army', icon: '🎎', tags: ['trickster'], role: 'ult', rarity: 'mythic',
      desc: '4 clones for {time}s: they steal the ball + {stun}s stun, or fan out with fakes (keeper −{gkPenalty%}% save).',
      params: { time: 3, gkPenalty: 0.3, stun: 1.3, range: 170 },
      scale: { time: 'pow', gkPenalty: 'pow', stun: 'pow' },
    },
    // Tuyệt kỹ khởi đầu (bí kíp gia truyền, nhận ở cuối PROLOGUE — ftue.config.js): có sẵn trong starterCores, yếu hơn các Tuyệt kỹ khác.
    // anyBuild: đủ điều kiện khi có >= 2 Core cùng 1 trường phái BẤT KỲ (vẫn phải bốc được lá như mọi Tuyệt kỹ) · color: màu cut-in
    // Chỉ số không scale theo character (cố định 15–20%).
    aura_farming: {
      name: 'Aura Farming', icon: '✨', tags: ['chaos'], role: 'ult', rarity: 'epic', anyBuild: true, color: '#ffe14f',
      desc: '{time}s of pure aura: +{speed+%}% run speed, +{pass+%}% pass speed, +{shot+%}% shot power. Hair goes gold.',
      params: { time: 6, speed: 1.18, pass: 1.18, shot: 1.18 },
    },
    titan: {
      name: 'Titan', icon: '🗿', tags: ['iron'], role: 'ult', rarity: 'mythic',
      desc: '{time}s at double size: stun immune, can\'t be tackled, bowl opponents over, +{shot+%}% shot power.',
      params: { time: 5, scale: 2, knock: 360, launch: 220, stun: 1.0, shot: 1.35 },
      scale: { time: 'pow', knock: 'pow', launch: 'pow', stun: 'pow', shot: 'mul' },
    },

    /* ---------- 🎲 HỖN LOẠN (mới) ---------- */
    bomb_ball: {
      name: 'Bomb Ball', icon: '💣', tags: ['chaos'], role: 'wild', rarity: 'legendary',
      desc: 'Every {every}s the ball becomes a bomb: 3s fuse, then launches + stuns ({stun}s) everyone within {radius}px.',
      params: { every: 12, fuse: 3, radius: 55, knock: 260, launch: 240, stun: 1.2 },
      scale: { every: 'cd', radius: 'pow', knock: 'pow', launch: 'pow', stun: 'pow' },
    },

    /* ---------- 🎲 HỖN LOẠN ---------- */
    chaos_ball: {
      name: 'Chaos Ball', icon: '🎲', tags: ['chaos'], role: 'wild', rarity: 'rare',
      desc: 'Every shot / pass turns the ball into something random with a random effect.',
      params: { curve: 2.2, rocketMult: 1.3 },
      scale: { curve: 'pow', rocketMult: 'mul' },
    },
    warp_walls: {
      name: 'Warp Walls', icon: '🌌', tags: ['chaos'], role: 'wild', rarity: 'rare',
      desc: 'Your balls into the top / bottom wall warp out of the opposite wall.',
      params: {},
    },
  },
};
