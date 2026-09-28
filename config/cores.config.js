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
    runner:    { label: 'SPEED',    icon: '🏃', color: '#3ff6ff', mech: 'Momentum', resource: 'momentum' },
    playmaker: { label: 'TIKI-TAKA', icon: '🎼', color: '#ffd23f', mech: 'Rhythm', resource: 'rhythm' },
    striker:   { label: 'STRIKER',   icon: '🎯', color: '#ff7a3d', mech: 'Charged shot' },
    brawler:   { label: 'BRAWLER',    icon: '🥊', color: '#ff3d5a', mech: 'Rage', resource: 'rage' },
    launcher:  { label: 'KICKER',  icon: '🦵', color: '#b46bff', mech: 'Launch' },
    trickster: { label: 'ILLUSION',    icon: '🌀', color: '#9d7bff', mech: 'Illusion' },
    iron:      { label: 'IRON',      icon: '🛡', color: '#c7ccd6', mech: 'Guard', resource: 'guard' },
    chaos:     { label: 'CHAOS',  icon: '🎲', color: '#c63dff', noSet: true },
  },
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
      desc: 'Much more accurate shots; the ball has less friction so it travels further (but slower). Holding D shows a red laser sight from your foot to the goal.',
      mods: { accuracy: 1.6 },
      params: { frictionMult: 0.35, speedMult: 0.85, aiRangeMult: 1.5 },
    },
    banana_kick: {
      name: 'Dragon Curl', icon: '🐉', tags: ['striker'], role: 'gen', rarity: 'rare',
      desc: 'Shots curl on their own toward the corner of the goal, trailing a green dragon spiral.',
      params: { strength: 2.4 },
    },
    fire_shot: {
      name: 'Fireball', icon: '🔥', tags: ['striker'], role: 'gen', rarity: 'rare',
      desc: 'Charged shot: the ball becomes a fireball that sets the pitch on fire along its path (step in it: stun + knockback). Score and the net catches fire.',
      mods: { shotPower: 1.12 },
      params: { trailInterval: 0.035, trailDuration: 2.6, trailRadius: 6, stun: 0.9, knockback: 150 },
    },
    thunder_kick: {
      name: 'Thunder Kick', icon: '⚡', tags: ['striker'], role: 'gen', rarity: 'legendary',
      desc: 'Long charge (≥60%): your foot builds up electricity; the lightning ball pierces 1 player (shock stun) and is harder for the keeper to catch.',
      mods: { chargeTime: 1.2 },
      params: { minCharge: 0.6, pierce: 1, speedMult: 1.2, stun: 0.7, gkPenalty: 0.25 },
    },

    /* ---------- 🏃 TỐC ĐỘ · 🌀 ẢO ẢNH ---------- */
    speed_demon: {
      name: 'Speed Demon', icon: '🪽', tags: ['runner'], role: 'gen', rarity: 'common',
      desc: 'Sprinting builds Momentum 50% faster; +5% speed off the ball. Leaves a blue afterimage trail.',
      mods: { offBallSpeed: 1.05, momentumGain: 1.5 },
    },
    phantom_step: {
      name: 'Phantom Step', icon: '🌀', tags: ['trickster'], role: 'gen', rarity: 'rare',
      desc: 'Z dash: vanish in smoke and teleport further, leaving an illusion behind. With the ball: the nearest opponent charges the illusion (4s cooldown).',
      params: { distance: 34, illusion: 1.2, lureRadius: 60, lure: 0.4, lureCooldown: 4 },
    },
    fake_run: {
      name: 'Fake Run', icon: '🪞', tags: ['runner', 'trickster'], role: 'gen', rarity: 'rare',
      desc: 'Start a sprint / Z dash with the ball: a purple illusion splits off dribbling a fake ball the other way (fools defenders) + 2 Momentum.',
      params: { cooldown: 3.5, duration: 1.6, confuseRadius: 90, confuseTime: 1.2, angle: 0.8, momentum: 2 },
    },

    /* ---------- 🥊 ĐẤU SĨ · 🛡 THÉP · 🦵 VÕ SĨ ĐÁ ---------- */
    street_fighter: {
      name: 'Street Fighter', icon: '🥊', tags: ['brawler'], role: 'gen', rarity: 'common',
      desc: 'Longer punch range, knocks the ball loose more often, +1 Rage on steals. Hits pop POW / BAM / WHAM.',
      mods: { tackleRange: 1.3, tackleChance: 1.3, knockback: 1.3 },
      params: { rageOnSteal: 1 },
    },
    iron_body: {
      name: 'Iron Skin', icon: '🛡', tags: ['iron'], role: 'gen', rarity: 'common',
      desc: 'Each player has 1 Guard (blocks one stun), regenerates after 7s. With Guard: metallic silver sheen.',
      params: { regen: 7 },
    },
    blade_runner: {
      name: 'Wind Blade', icon: '🌙', tags: ['launcher'], role: 'gen', rarity: 'legendary',
      desc: 'Hard attack (A) fires a crescent wind blade ~150px: whoever it hits is stunned and drops the ball.',
      params: { speed: 300, life: 0.5, length: 18, stun: 0.9 },
    },

    /* ---------- 🛡 THÉP · 🎼 TIKI-TAKA · cầu nối ---------- */
    aegis_wall: {
      name: 'Aegis Shield', icon: '🧱', tags: ['iron'], role: 'base', rarity: 'legendary',
      desc: 'A hexagonal energy shield on your goal line: blocks 1 shot (shatters like glass), recharges after 60s.',
      params: { cooldown: 60 },
    },
    counter_attack: {
      name: 'Counter Attack', icon: '↩', tags: ['brawler', 'runner'], role: 'gen', rarity: 'rare',
      desc: 'Win the ball: whole team +3 Momentum, +20% speed and shot power for 3.5s, with a blue aura.',
      params: { duration: 3.5, speedMult: 1.2, shotMult: 1.2, momentum: 3, calloutCd: 15 },
    },
    emp_trap: {
      name: 'EMP Mine', icon: '📡', tags: ['iron'], role: 'gen', rarity: 'epic',
      desc: 'Every attack (Light / Hard) drops an EMP mine. Opponents who step on it get shocked, stunned and lose the ball.',
      params: { cooldown: 2.5, max: 3, life: 14, radius: 9, arm: 0.5, stun: 1.0 },
    },
    maestro: {
      name: 'Maestro', icon: '🎼', tags: ['playmaker'], role: 'gen', rarity: 'common',
      desc: 'Passes +20% faster, trailing a golden string of light. The receiver bursts with a gold aura, a 1.5s speed boost and +1 extra Rhythm.',
      mods: { passSpeed: 1.2 },
      params: { duration: 1.5, speedMult: 1.25, rhythm: 1 },
    },

    /* ---------- TUYỆT KỸ (phím X) ---------- */
    // Tuyệt kỹ thí điểm (Giai đoạn 1) — kiểm tra khung năng lượng + phím X; các Tuyệt kỹ khác ở Giai đoạn 3
    lightning_dash: {
      name: 'Lightning Dash', icon: '⚡', tags: ['runner'], role: 'ult', rarity: 'mythic',
      desc: 'Become a lightning bolt and dash straight ahead (taking the ball with you); every opponent in the path gets shocked.',
      params: { distance: 190, width: 18, stun: 0.8, knock: 140 },
    },

    /* ================= Giai đoạn 3 — Core mới (hành vi ở src/systems/cores-new.js) ================= */
    /* ---------- 🏃 TỐC ĐỘ ---------- */
    burst_start: {
      name: 'Arrow Start', icon: '🏹', tags: ['runner'], role: 'gen', rarity: 'rare',
      desc: 'Start sprinting: instant +2 Momentum and a 0.35s burst, with a sonic ring and dust at the start point.',
      params: { momentum: 2, boost: 1.3, time: 0.35, cooldown: 3 },
    },
    sonic_boom: {
      name: 'Sonic Boom', icon: '💥', tags: ['runner'], role: 'use', rarity: 'epic',
      desc: 'Carrying the ball at max Momentum: a sonic cone in front of you. Brush past opponents (≤14px) to blast them aside + short stun, spends all Momentum. BOOM!',
      params: { gap: 14, knock: 180, launch: 70, stun: 0.35, cooldown: 10 },
    },
    freight_train: {
      name: 'Freight Train', icon: '🚚', tags: ['runner'], role: 'use', rarity: 'epic',
      desc: 'Head-on collision with ≥5 Momentum: send the opponent flying like they got hit by a truck, spends 5 Momentum. Dodgeable with Z.',
      params: { minMomentum: 5, cost: 5, minSpeed: 90, knock: 190, launch: 120, stun: 0.4, cooldown: 15 },
    },

    /* ---------- 🎼 TIKI-TAKA ---------- */
    eagle_eye: {
      name: 'Eagle Eye', icon: '🦅', tags: ['playmaker'], role: 'base', rarity: 'common',
      desc: 'Holding a pass key draws a chalk trajectory + landing spot on the pitch. More accurate passes, 30% harder to intercept.',
      mods: { passAccuracy: 1.6, interceptTaken: 0.7 },
    },
    one_touch: {
      name: 'One Touch', icon: '✨', tags: ['playmaker'], role: 'gen', rarity: 'rare',
      desc: 'Pass within 0.6s of receiving: +2 Rhythm, the ball turns into a ball of light that ghosts through opponents.',
      params: { window: 0.6, rhythm: 2 },
    },
    phantom_pass: {
      name: 'Phantom Pass', icon: '💫', tags: ['playmaker'], role: 'use', rarity: 'epic',
      desc: 'With ≥3 Rhythm, through pass (W): spends 3 Rhythm. The ball becomes a golden beam tearing across the pitch through every opponent; the receiver gets a 2s speed boost.',
      params: { cost: 3, speedMult: 1.3, boost: 1.3, time: 2 },
    },
    symphony: {
      name: 'Symphony', icon: '🎻', tags: ['playmaker'], role: 'use', rarity: 'epic',
      desc: 'Shoot with ≥3 Rhythm: every note converges on the ball. Each Rhythm +8% shot power and keeper −5% save. Spends all Rhythm.',
      params: { min: 3, powerPer: 0.08, gkPer: 0.05 },
    },

    /* ---------- 🎯 SÁT THỦ ---------- */
    energy_wave: {
      name: 'Energy Wave', icon: '🌊', tags: ['striker'], role: 'use', rarity: 'epic',
      desc: 'Near-full charge (≥80%): an orb gathers at your foot, then an energy beam fires with the ball, pushing every opponent in it aside + stun.',
      params: { minCharge: 0.8, len: 300, width: 18, knock: 300, stun: 0.8 },
    },
    black_hole: {
      name: 'Black Hole Shot', icon: '🕳', tags: ['striker'], role: 'use', rarity: 'legendary',
      desc: 'Near-full charge (≥80%): the ball becomes a black hole, pulling nearby opponents (keeper included) off position so they can\'t touch it.',
      params: { minCharge: 0.8, radius: 64, pull: 1500, time: 1.4 },
    },

    /* ---------- 🥊 ĐẤU SĨ ---------- */
    fist_storm: {
      name: 'Fist Storm', icon: '👊', tags: ['brawler'], role: 'gen', rarity: 'rare',
      desc: 'Punches become a 4-hit combo (the last one knocks back), each hit +1 Rage. BAM BAM BAM! Punch cooldown +10%.',
      mods: { lightCooldown: 1.1 },
      params: { hits: 4, gap: 0.07, range: 22, push: 220 },
    },
    giant_fist: {
      name: 'Giant Fist', icon: '✊', tags: ['brawler'], role: 'use', rarity: 'epic',
      desc: 'At 5 Rage, your next punch: a fist 4× bigger, wide hitbox, always knocks the ball loose, sends them flying. Spends all Rage.',
    },

    /* ---------- 🦵 VÕ SĨ ĐÁ ---------- */
    heavy_boot: {
      name: 'Iron Boots', icon: '🥾', tags: ['launcher'], role: 'base', rarity: 'common',
      desc: 'Launch +30%, kick range +40%, Hard cooldown −20%, 30% faster windup. Every kick cracks the pitch and sprays metal sparks.',
      mods: { launch: 1.3, hardCooldown: 0.8, hardWindup: 0.7, hardRange: 1.4 },
    },
    juggle: {
      name: 'Juggle', icon: '🤹', tags: ['launcher'], role: 'use', rarity: 'rare',
      desc: 'Punch an airborne player to keep them in the air longer (+1 Rage each time). Combo counter: 2 HIT! 3 HIT!…',
      params: { lift: 200, stun: 0.7 },
    },
    wall_slam: {
      name: 'Wall Slam', icon: '🏚', tags: ['launcher'], role: 'use', rarity: 'rare',
      desc: 'Launch an opponent into the wall (BONK): the wall cracks, +1s stun; a loose ball nearby bounces toward you.',
      params: { stun: 1, ballSpeed: 170 },
    },
    ground_slam: {
      name: 'Ground Slam', icon: '🌋', tags: ['launcher'], role: 'gen', rarity: 'epic',
      desc: 'Hard attack becomes a leap onto the opponent in front of you and a slam: a 52px shockwave launches ALL opponents in range + stun, spiderweb cracks in the pitch.',
      params: { jump: 150, leap: 130, maxSpeed: 300, radius: 52, knock: 160, launch: 230, stun: 1.1, recover: 0.12 },
    },

    /* ---------- 🌀 ẢO ẢNH ---------- */
    quick_feet: {
      name: 'Ninja Footwork', icon: '🥷', tags: ['trickster'], role: 'base', rarity: 'common',
      desc: 'Z cooldown −30%, dodge window +0.15s. Every dash pops a POOF of smoke.',
      mods: { skillCooldown: 0.7 },
      params: { dodgeBonus: 0.15 },
    },
    witch_time: {
      name: 'Perfect Dodge', icon: '⏳', tags: ['trickster'], role: 'use', rarity: 'epic',
      desc: 'Successful dodge: the whole pitch slows down for 0.8s and turns purple; you stay fast and Z resets instantly. DODGE!',
      params: { scale: 0.35, time: 0.8, boost: 2.6, cooldown: 4 },
    },
    shadow_clone: {
      name: 'Shadow Clone', icon: '👥', tags: ['trickster'], role: 'gen', rarity: 'epic',
      desc: 'Z dash spawns 2 clones running off at angles for 2s: they block opponents and passing lanes; touch one and it bursts into smoke.',
      params: { count: 2, time: 2, speed: 170, spread: 0.7 },
    },

    /* ---------- 🛡 THÉP ---------- */
    bulldozer: {
      name: 'Bulldozer', icon: '🚜', tags: ['iron'], role: 'use', rarity: 'epic',
      desc: 'With Guard + the ball: grow 1.3× (12% slower), can\'t be tackled, anyone you hit flies like a bowling pin (each launch spends 1 Guard; getting hit still breaks Guard). At least 1 Guard every kickoff.',
      params: { scale: 1.3, slow: 0.88, knock: 170, launch: 80, stun: 0.3, every: 2 },
    },
    giant_keeper: {
      name: 'Giant Keeper', icon: '🧤', tags: ['iron'], role: 'use', rarity: 'epic',
      desc: 'Your keeper with Guard grows 1.4× when the ball gets close to goal (bigger reach too). POOF! At least 1 Guard every kickoff.',
      params: { scale: 1.4, near: 150 },
    },

    /* ---------- 🔗 Cầu nối ---------- */
    rubber_arm: {
      name: 'Rubber Arm', icon: '🤜', tags: ['brawler', 'playmaker'], role: 'use', rarity: 'epic',
      desc: 'Punch stretches 50px (2s cooldown per player): hit a player to punch from range + pull them in; hit a loose ball / pass to yank it to your feet. BOING!',
      params: { reach: 50, pull: 180, stun: 0.4, steal: 0.25, cooldown: 2 },
    },
    uppercut: {
      name: 'Dragon Uppercut', icon: '🐲', tags: ['brawler', 'launcher'], role: 'use', rarity: 'rare',
      desc: 'At 5 Rage your punch becomes an uppercut: rise on a dragon-shaped flame trail, launch the opponent straight up, the ball drops at your feet. Spends all Rage.',
      params: { launch: 330, jump: 80 },
    },
    iron_fist: {
      name: 'Iron Fist', icon: '🦾', tags: ['brawler', 'iron'], role: 'gen', rarity: 'rare',
      desc: 'With Guard: steel fists. The ball carrier can\'t hold on, +1 extra Rage. Each Rage cuts stun time by 8%. At least 1 Guard every kickoff.',
      params: { rage: 1, stunPerRage: 0.08 },
    },
    one_two: {
      name: 'One-Two', icon: '🔁', tags: ['playmaker', 'striker'], role: 'use', rarity: 'epic',
      desc: 'Shoot within 1.2s of receiving a pass: counts as a max charged shot (volley), trailing a gold-orange double streak.',
      params: { window: 1.2 },
    },
    captain: {
      name: 'Captain', icon: '🎖', tags: ['iron', 'playmaker'], role: 'gen', rarity: 'epic',
      desc: 'Every completed pass gives the receiver 1 Guard (6s cooldown per player). A hex shield snaps onto them.',
      params: { cooldown: 6 },
    },
    counter_strike: {
      name: 'Counter Strike', icon: '⚔', tags: ['trickster', 'brawler'], role: 'use', rarity: 'epic',
      desc: 'Successful dodge: for 1s punches have no cooldown, always knock the ball loose, +2 Rage. Impact frame + COUNTER!',
      params: { window: 1, rage: 2, cooldown: 4 },
    },
    flying_kick: {
      name: 'Flying Kick', icon: '🚀', tags: ['runner', 'launcher'], role: 'use', rarity: 'epic',
      desc: 'Hard attack spends all Momentum: each Momentum makes you fly + launch 20% further. Soar like a rocket, feet on fire.',
      params: { perMomentum: 0.2 },
    },
    ghost_ball: {
      name: 'Ghost Ball', icon: '👻', tags: ['trickster', 'striker'], role: 'use', rarity: 'epic',
      desc: 'Shoot while you have illusions / clones out: each one fires a fake ball at goal (max 3), keeper −20% save.',
      params: { max: 3, gkPenalty: 0.2, speed: 320 },
    },
    scissor_kick: {
      name: 'Scissor Kick', icon: '✂', tags: ['launcher', 'striker'], role: 'use', rarity: 'legendary',
      desc: 'Hard attack on a loose ball: an overhead bicycle kick. The ball becomes a max charged shot straight at goal, piercing 2 players.',
      params: { speed: 1.1, pierce: 2, stun: 0.6, cooldown: 4 },
    },

    /* ---------- TUYỆT KỸ mới ---------- */
    endless_tiki: {
      name: 'Endless Tiki-Taka', icon: '🎼', tags: ['playmaker'], role: 'ult', rarity: 'mythic',
      desc: 'The pitch turns sepia and opponents slow by 60%; the ball auto-passes 4 times between your 2 players (can\'t be intercepted), then the last one unleashes a max Symphony shot.',
      params: { passes: 4, gap: 0.22, slow: 0.4, slowTime: 1.8, gk: 0.25 },
    },
    meteor_strike: {
      name: 'Meteor Shot', icon: '🌟', tags: ['striker'], role: 'ult', rarity: 'mythic',
      desc: 'Leap high with the ball, then 0.6s later spin and drive it down into the goal at max power with a meteor tail. Even if the keeper saves it, they get sent flying.',
      params: { jump: 300, delay: 0.62, speed: 560, gk: 0.3 },
    },
    hundred_fists: {
      name: 'Hundred Fists', icon: '💢', tags: ['brawler'], role: 'ult', rarity: 'mythic',
      desc: 'Rush the nearest opponent and throw 20 punches in 1s (pinning them in place); the last one blasts them into the wall. BONK, cracked.',
      params: { range: 160, hits: 20, gap: 0.05, knock: 560 },
    },
    meteor_drop: {
      name: 'Meteor Drop', icon: '☄️', tags: ['launcher'], role: 'ult', rarity: 'mythic',
      desc: 'Leap off the screen, steer a red target on the pitch for 1s, then crash down in a 60px crater. Launches every opponent, 1.5s stun.',
      params: { aim: 1.0, speed: 190, radius: 60, knock: 240, launch: 260, stun: 1.5 },
    },
    clone_army: {
      name: 'Clone Army', icon: '🎎', tags: ['trickster'], role: 'ult', rarity: 'mythic',
      desc: '4 clones for 3s. Without the ball: they mob the ball carrier and always steal it + stun. With the ball: they fan out dribbling fakes, fooling defenders, keeper −30% save.',
      params: { time: 3, gkPenalty: 0.3, stun: 1.3, range: 170 },
    },
    titan: {
      name: 'Titan', icon: '🗿', tags: ['iron'], role: 'ult', rarity: 'mythic',
      desc: '5s at double size: stun immune, can\'t be tackled, launches anyone you bump into, huge shot power; passing / dribbling still works normally.',
      params: { time: 5, scale: 2, knock: 360, launch: 220, stun: 1.0, shot: 1.35 },
    },

    /* ---------- 🎲 HỖN LOẠN (mới) ---------- */
    bomb_ball: {
      name: 'Bomb Ball', icon: '💣', tags: ['chaos'], role: 'wild', rarity: 'legendary',
      desc: 'Every 12s the ball turns into a bomb (3s fuse, countdown on the ball): it explodes, launching + stunning everyone nearby, the ball flies off randomly. Pass the bomb to them, fast!',
      params: { every: 12, fuse: 3, radius: 55, knock: 260, launch: 240, stun: 1.2 },
    },

    /* ---------- 🎲 HỖN LOẠN ---------- */
    chaos_ball: {
      name: 'Chaos Ball', icon: '🎲', tags: ['chaos'], role: 'wild', rarity: 'rare',
      desc: 'Every shot / pass: the ball transforms (watermelon, bowling ball, chicken, tire...) and gets a random effect: curve, rocket, fire, lightning, decoy.',
      params: { curve: 2.2, rocketMult: 1.3 },
    },
    warp_walls: {
      name: 'Warp Walls', icon: '🌌', tags: ['chaos'], role: 'wild', rarity: 'rare',
      desc: 'Balls your team kicks into the top / bottom wall go through a purple portal and come out of the opposite wall.',
      params: {},
    },
  },
};
