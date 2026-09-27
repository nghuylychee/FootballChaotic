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
    runner:    { label: 'TỐC ĐỘ',    icon: '🏃', color: '#3ff6ff', mech: 'Đà', resource: 'momentum' },
    playmaker: { label: 'TIKI-TAKA', icon: '🎼', color: '#ffd23f', mech: 'Nhịp', resource: 'rhythm' },
    striker:   { label: 'SÁT THỦ',   icon: '🎯', color: '#ff7a3d', mech: 'Sút tụ lực' },
    brawler:   { label: 'ĐẤU SĨ',    icon: '🥊', color: '#ff3d5a', mech: 'Nộ', resource: 'rage' },
    launcher:  { label: 'VÕ SĨ ĐÁ',  icon: '🦵', color: '#b46bff', mech: 'Hất tung' },
    trickster: { label: 'ẢO ẢNH',    icon: '🌀', color: '#9d7bff', mech: 'Ảo ảnh' },
    iron:      { label: 'THÉP',      icon: '🛡', color: '#c7ccd6', mech: 'Giáp', resource: 'guard' },
    chaos:     { label: 'HỖN LOẠN',  icon: '🎲', color: '#c63dff', noSet: true },
  },
  roleLabels: { gen: 'TẠO', use: 'DÙNG', base: 'NỀN', ult: 'TUYỆT KỸ', wild: 'HỖN LOẠN' },   // mech (trường phái) = thứ Core TẠO / DÙNG

  // Tài nguyên — chỉ chạy khi đội có ít nhất 1 Core của trường phái tương ứng.
  // Không hoạt động quá grace giây -> mỗi decayEvery giây mất 1 (giảm từ từ, không về thẳng 0)
  resources: {
    // mỗi cầu thủ: chạy nước rút +1 mỗi gainEvery; bị choáng mất stunLoss
    momentum: { label: 'Đà', icon: '⚡', max: 5, gainEvery: 0.4, grace: 2.5, decayEvery: 0.7, stunLoss: 1, speedPer: 0.01 },
    // cả đội: chuyền tới chân +1; mất bóng mất turnoverLoss
    rhythm:   { label: 'Nhịp', icon: '♪', max: 5, grace: 6, decayEvery: 2.5, turnoverLoss: 2, passSpeedPer: 0.03 },
    // mỗi cầu thủ: đấm trúng +1
    rage:     { label: 'Nộ', icon: '🔥', max: 5, grace: 4, decayEvery: 2, stealPer: 0.04 },
    guard:    { label: 'Giáp', icon: '🛡', max: 2 },                                                // mỗi cầu thủ, chặn 1 lần choáng
  },
  chargedShot: 0.6,          // "Sút tụ lực" = giữ >= 60% thanh lực (Cộng hưởng SÁT THỦ 3: 40%)

  // Cộng hưởng: số Core cùng trường phái (Core cầu nối tính cho cả hai). Logic ở systems/cores.js (SET_RULES)
  sets: {
    runner:    { 2: 'Đà tối đa +1', 3: 'Đà tối đa: chạy nước rút tốn ít hơn 25% thể lực', 4: 'Giữ Đà thêm 2s · mỗi Đà +1% lực sút & chuyền' },
    playmaker: { 2: 'Nhận bóng cũng +1 Nhịp', 3: 'Mất bóng 1 lần không bị trừ Nhịp (hồi 10s)', 4: 'Đủ 5 Nhịp: đường chuyền không thể bị cắt' },
    striker:   { 2: '+15% lực sút · sút tụ lực: thủ môn −12% bắt', 3: 'Sút tụ lực từ 40% thanh lực', 4: 'Sút trúng khung: hồi chiêu cả đội −30%' },
    brawler:   { 2: 'Nộ giảm chậm gấp đôi', 3: 'Đủ 5 Nộ: đấm không hồi chiêu trong 2s', 4: 'Đấm trúng hồi 5 thể lực, choáng +50%' },
    launcher:  { 2: 'Hất xa +25% · hồi chiêu Hard −15% · đá trúng người cầm bóng: bóng rơi về chân bạn', 3: 'BONK gây choáng lan 30px', 4: 'Hồi chiêu Hard −40%' },
    trickster: { 2: 'Tàn ảnh lâu hơn +1s · hồi chiêu Z −20%', 3: 'Né thành công: hồi Z ngay', 4: 'Z có 2 lần dùng' },
    iron:      { 2: '+1 Giáp mỗi lần giao bóng', 3: 'Tự hồi 1 Giáp mỗi 8s', 4: 'Thủ môn +20% tỉ lệ bắt bóng' },
  },

  // Tuyệt kỹ: năng lượng chỉ nạp khi ghi bàn hoặc cướp được bóng
  ultimate: { gainGoal: 0.5, gainSteal: 0.12, stealCooldown: 3, lockout: 10, cutIn: 0.6, aiDelay: [0.5, 2.5] },   // lockout: dùng xong bao lâu không nạp

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
      name: 'Mắt Thiện Xạ', icon: '🎯', tags: ['striker'], role: 'base', rarity: 'common',
      desc: 'Sút chính xác hơn nhiều, bóng ít ma sát nên bay xa (nhưng chậm hơn). Khi giữ D: tia laser đỏ ngắm từ chân tới khung.',
      mods: { accuracy: 1.6 },
      params: { frictionMult: 0.35, speedMult: 0.85, aiRangeMult: 1.5 },
    },
    banana_kick: {
      name: 'Xoáy Rồng', icon: '🐉', tags: ['striker'], role: 'gen', rarity: 'rare',
      desc: 'Cú sút tự bẻ cong về góc khung thành, kéo vệt xoắn ốc xanh lá như rồng cuộn.',
      params: { strength: 2.4 },
    },
    fire_shot: {
      name: 'Hoả Cầu', icon: '🔥', tags: ['striker'], role: 'gen', rarity: 'rare',
      desc: 'Sút tụ lực: bóng hoá quả cầu lửa, đốt cháy sân theo đường bay (giẫm phải bị choáng + đẩy lùi). Vào lưới thì lưới bốc cháy.',
      mods: { shotPower: 1.12 },
      params: { trailInterval: 0.035, trailDuration: 2.6, trailRadius: 6, stun: 0.9, knockback: 150 },
    },
    thunder_kick: {
      name: 'Lôi Cước', icon: '⚡', tags: ['striker'], role: 'gen', rarity: 'legendary',
      desc: 'Tụ lực lâu (≥60%): chân tích điện, bóng sét xuyên qua 1 cầu thủ (giật choáng) và khó bắt hơn với thủ môn.',
      mods: { chargeTime: 1.2 },
      params: { minCharge: 0.6, pierce: 1, speedMult: 1.2, stun: 0.7, gkPenalty: 0.25 },
    },

    /* ---------- 🏃 TỐC ĐỘ · 🌀 ẢO ẢNH ---------- */
    speed_demon: {
      name: 'Quỷ Tốc Độ', icon: '🪽', tags: ['runner'], role: 'gen', rarity: 'common',
      desc: 'Chạy nước rút nạp Đà nhanh hơn 50%; +5% tốc độ khi không giữ bóng. Chạy để lại vệt tàn ảnh xanh.',
      mods: { offBallSpeed: 1.05, momentumGain: 1.5 },
    },
    phantom_step: {
      name: 'Thuấn Bộ', icon: '🌀', tags: ['trickster'], role: 'gen', rarity: 'rare',
      desc: 'Lướt Z: biến mất trong khói rồi dịch chuyển xa thêm, để lại một ảo ảnh đứng tại chỗ cũ.',
      params: { distance: 34, illusion: 1.2 },
    },
    fake_run: {
      name: 'Chạy Giả', icon: '🪞', tags: ['runner', 'trickster'], role: 'gen', rarity: 'rare',
      desc: 'Cầm bóng bắt đầu chạy nước rút / lướt Z: ảo ảnh tím tách ra dắt bóng giả chạy hướng khác (lừa hậu vệ) + 2 Đà.',
      params: { cooldown: 3.5, duration: 1.6, confuseRadius: 90, confuseTime: 1.2, angle: 0.8, momentum: 2 },
    },

    /* ---------- 🥊 ĐẤU SĨ · 🛡 THÉP · 🦵 VÕ SĨ ĐÁ ---------- */
    street_fighter: {
      name: 'Võ Đường Phố', icon: '🥊', tags: ['brawler'], role: 'gen', rarity: 'common',
      desc: 'Đấm tầm xa hơn, dễ làm rơi bóng hơn, cướp được bóng +1 Nộ. Đấm trúng bung chữ POW / BAM / WHAM.',
      mods: { tackleRange: 1.3, tackleChance: 1.3, knockback: 1.3 },
      params: { rageOnSteal: 1 },
    },
    iron_body: {
      name: 'Da Thép', icon: '🛡', tags: ['iron'], role: 'gen', rarity: 'common',
      desc: 'Mỗi cầu thủ có 1 Giáp (chặn 1 lần bị choáng), mất thì tự hồi sau 5s. Có Giáp: người ánh bạc kim loại.',
      params: { regen: 5 },
    },
    blade_runner: {
      name: 'Cước Phong', icon: '🌙', tags: ['launcher'], role: 'gen', rarity: 'legendary',
      desc: 'Cú đá Hard attack (A) phóng lưỡi gió trăng khuyết bay ~150px: trúng ai thì choáng + rơi bóng.',
      params: { speed: 300, life: 0.5, length: 18, stun: 0.9 },
    },

    /* ---------- 🛡 THÉP · 🎼 TIKI-TAKA · cầu nối ---------- */
    aegis_wall: {
      name: 'Khiên Aegis', icon: '🧱', tags: ['iron'], role: 'base', rarity: 'legendary',
      desc: 'Khiên lục giác năng lượng trên vạch vôi đội nhà: chặn 1 cú sút vào lưới (vỡ vụn như kính), hồi lại sau 45s.',
      params: { cooldown: 45 },
    },
    counter_attack: {
      name: 'Phản Công', icon: '↩', tags: ['brawler', 'runner'], role: 'gen', rarity: 'rare',
      desc: 'Cướp được bóng: cả đội +3 Đà, +20% tốc độ và lực sút trong 3.5s, bùng hào quang xanh.',
      params: { duration: 3.5, speedMult: 1.2, shotMult: 1.2, momentum: 3, calloutCd: 15 },
    },
    emp_trap: {
      name: 'Mìn EMP', icon: '📡', tags: ['iron'], role: 'gen', rarity: 'epic',
      desc: 'Mỗi lần ra đòn (Light / Hard) để lại một quả mìn EMP. Đối thủ dẫm phải bị sét giật choáng và mất bóng.',
      params: { cooldown: 2.5, max: 3, life: 14, radius: 9, arm: 0.5, stun: 1.0 },
    },
    maestro: {
      name: 'Nhạc Trưởng', icon: '🎼', tags: ['playmaker'], role: 'gen', rarity: 'common',
      desc: 'Chuyền nhanh +20%, bóng kéo dải sáng vàng như dây đàn. Người nhận bùng hào quang vàng, tăng tốc 1.5s và +1 Nhịp thêm.',
      mods: { passSpeed: 1.2 },
      params: { duration: 1.5, speedMult: 1.25, rhythm: 1 },
    },

    /* ---------- TUYỆT KỸ (phím X) ---------- */
    // Tuyệt kỹ thí điểm (Giai đoạn 1) — kiểm tra khung năng lượng + phím X; các Tuyệt kỹ khác ở Giai đoạn 3
    lightning_dash: {
      name: 'Tia Chớp Xuyên Sân', icon: '⚡', tags: ['runner'], role: 'ult', rarity: 'mythic',
      desc: 'Hoá tia sét lao thẳng về phía trước (mang theo bóng nếu đang giữ); mọi đối thủ trên đường bị giật choáng.',
      params: { distance: 220, width: 18, stun: 1.1, knock: 140 },
    },

    /* ================= Giai đoạn 3 — Core mới (hành vi ở src/systems/cores-new.js) ================= */
    /* ---------- 🏃 TỐC ĐỘ ---------- */
    burst_start: {
      name: 'Phóng Như Tên', icon: '🏹', tags: ['runner'], role: 'gen', rarity: 'rare',
      desc: 'Bắt đầu chạy nước rút: +2 Đà ngay và bứt tốc 0.35s — nổ vòng siêu âm tại chỗ xuất phát, bụi tung.',
      params: { momentum: 2, boost: 1.3, time: 0.35, cooldown: 3 },
    },
    sonic_boom: {
      name: 'Phá Âm Chướng', icon: '💥', tags: ['runner'], role: 'use', rarity: 'epic',
      desc: 'Ở Đà tối đa: hình nón sóng âm trước mặt — lướt sát qua đối thủ (≤14px) hất họ văng sang bên + choáng ngắn, tiêu hết Đà. BOOM!',
      params: { gap: 14, knock: 180, launch: 70, stun: 0.35, cooldown: 10 },
    },
    freight_train: {
      name: 'Húc Xe Tải', icon: '🚚', tags: ['runner'], role: 'use', rarity: 'epic',
      desc: 'Va trực diện khi có ≥4 Đà: húc đối thủ bay xa như bị xe tông (hất tung), tiêu 4 Đà. Né được bằng Z.',
      params: { minMomentum: 4, cost: 4, minSpeed: 90, knock: 240, launch: 170, stun: 0.6, cooldown: 10 },
    },

    /* ---------- 🎼 TIKI-TAKA ---------- */
    eagle_eye: {
      name: 'Mắt Đại Bàng', icon: '🦅', tags: ['playmaker'], role: 'base', rarity: 'common',
      desc: 'Giữ phím chuyền: nét phấn vẽ quỹ đạo + điểm rơi trên sân. Chuyền chuẩn hơn, khó bị cắt hơn 30%.',
      mods: { passAccuracy: 1.6, interceptTaken: 0.7 },
    },
    one_touch: {
      name: 'Chạm Một', icon: '✨', tags: ['playmaker'], role: 'gen', rarity: 'rare',
      desc: 'Chuyền trong 0.6s sau khi nhận bóng: +2 Nhịp, bóng hoá quả cầu ánh sáng — đối thủ chạm vào thì bóng xuyên qua như ma.',
      params: { window: 0.6, rhythm: 2 },
    },
    phantom_pass: {
      name: 'Đường Chuyền Xuyên Không', icon: '💫', tags: ['playmaker'], role: 'use', rarity: 'epic',
      desc: 'Có ≥3 Nhịp, chọc khe (W): tiêu 3 Nhịp — bóng thành tia sáng vàng xé ngang sân xuyên qua mọi đối thủ, người nhận tăng tốc 2s.',
      params: { cost: 3, speedMult: 1.3, boost: 1.3, time: 2 },
    },
    symphony: {
      name: 'Bản Giao Hưởng', icon: '🎻', tags: ['playmaker'], role: 'use', rarity: 'epic',
      desc: 'Sút khi có ≥3 Nhịp: mọi nốt nhạc hội tụ vào bóng — mỗi Nhịp +8% lực sút và thủ môn −5% bắt bóng. Tiêu hết Nhịp.',
      params: { min: 3, powerPer: 0.08, gkPer: 0.05 },
    },

    /* ---------- 🎯 SÁT THỦ ---------- */
    energy_wave: {
      name: 'Chưởng Sóng', icon: '🌊', tags: ['striker'], role: 'use', rarity: 'epic',
      desc: 'Sút gần đầy lực (≥80%): quả cầu sáng tụ trước chân rồi luồng năng lượng bắn theo bóng, đẩy mọi đối thủ trong luồng dạt ra hai bên + choáng.',
      params: { minCharge: 0.8, len: 300, width: 18, knock: 300, stun: 0.8 },
    },
    black_hole: {
      name: 'Sút Lỗ Đen', icon: '🕳', tags: ['striker'], role: 'use', rarity: 'legendary',
      desc: 'Sút gần đầy lực (≥80%): bóng hoá lỗ đen, hút đối thủ gần đường bay (cả thủ môn) lệch khỏi vị trí — họ không chạm được bóng.',
      params: { minCharge: 0.8, radius: 64, pull: 1500, time: 1.4 },
    },

    /* ---------- 🥊 ĐẤU SĨ ---------- */
    fist_storm: {
      name: 'Bão Đấm', icon: '👊', tags: ['brawler'], role: 'gen', rarity: 'rare',
      desc: 'Cú đấm thành chuỗi 4 cú liên hoàn (cú cuối đẩy lùi), mỗi cú trúng +1 Nộ. RẦM RẦM RẦM! Hồi chiêu đấm +10%.',
      mods: { lightCooldown: 1.1 },
      params: { hits: 4, gap: 0.07, range: 22, push: 220 },
    },
    giant_fist: {
      name: 'Nắm Đấm Khổng Lồ', icon: '✊', tags: ['brawler'], role: 'use', rarity: 'epic',
      desc: 'Đủ 5 Nộ, cú đấm kế tiếp: nắm tay to gấp 4, vùng đánh rộng, chắc chắn làm rơi bóng, hất văng. Tiêu hết Nộ.',
    },

    /* ---------- 🦵 VÕ SĨ ĐÁ ---------- */
    heavy_boot: {
      name: 'Giày Sắt', icon: '🥾', tags: ['launcher'], role: 'base', rarity: 'common',
      desc: 'Hất xa +30%, tầm chân +40%, hồi chiêu Hard −20%, gồng chân nhanh hơn 30%. Mỗi cú đá làm nứt mặt sân, bắn tia lửa kim loại.',
      mods: { launch: 1.3, hardCooldown: 0.8, hardWindup: 0.7, hardRange: 1.4 },
    },
    juggle: {
      name: 'Tâng Người', icon: '🤹', tags: ['launcher'], role: 'use', rarity: 'rare',
      desc: 'Đấm trúng người đang bay: tâng họ lên tiếp, kéo dài thời gian bay (+1 Nộ mỗi lần) — bộ đếm 2 HIT! 3 HIT!…',
      params: { lift: 200, stun: 0.7 },
    },
    wall_slam: {
      name: 'Đập Tường', icon: '🏚', tags: ['launcher'], role: 'use', rarity: 'rare',
      desc: 'Hất đối thủ va tường (BONK): tường nứt toác, choáng thêm 1s; bóng rơi gần đó nảy về phía bạn.',
      params: { stun: 1, ballSpeed: 170 },
    },
    ground_slam: {
      name: 'Dậm Đất', icon: '🌋', tags: ['launcher'], role: 'gen', rarity: 'epic',
      desc: 'Hard attack đổi thành: bật nhảy rồi dậm xuống — sóng chấn 52px hất tung TẤT CẢ đối thủ trong vùng + choáng, mặt sân nứt mạng nhện.',
      params: { jump: 150, radius: 52, knock: 160, launch: 230, stun: 1.1, recover: 0.12 },
    },

    /* ---------- 🌀 ẢO ẢNH ---------- */
    quick_feet: {
      name: 'Bộ Pháp Ninja', icon: '🥷', tags: ['trickster'], role: 'base', rarity: 'common',
      desc: 'Hồi chiêu Z −30%, thời gian né +0.15s. Mỗi lần lướt nổ khói POOF.',
      mods: { skillCooldown: 0.7 },
      params: { dodgeBonus: 0.15 },
    },
    witch_time: {
      name: 'Né Hoàn Hảo', icon: '⏳', tags: ['trickster'], role: 'use', rarity: 'epic',
      desc: 'Né thành công: cả sân chậm lại 0.8s, ngả tím — riêng bạn vẫn nhanh và hồi Z ngay. NÉ!',
      params: { scale: 0.35, time: 0.8, boost: 2.6, cooldown: 4 },
    },
    shadow_clone: {
      name: 'Ảnh Phân Thân', icon: '👥', tags: ['trickster'], role: 'gen', rarity: 'epic',
      desc: 'Lướt Z tạo 2 phân thân chạy lệch hướng 2s: cản đường đối thủ, chặn được đường chuyền; bị chạm vào thì nổ khói.',
      params: { count: 2, time: 2, speed: 170, spread: 0.7 },
    },

    /* ---------- 🛡 THÉP ---------- */
    bulldozer: {
      name: 'Xe Ủi', icon: '🚜', tags: ['iron'], role: 'use', rarity: 'epic',
      desc: 'Có Giáp + cầm bóng: phình to 1.3×, không thể bị cướp bóng, người va phải bay ra như ki bowling (mỗi lần hất tiêu 1 Giáp; trúng đòn vẫn mất Giáp). Mỗi lần giao bóng có ít nhất 1 Giáp.',
      params: { scale: 1.3, knock: 220, launch: 120, stun: 0.45, every: 2 },
    },
    giant_keeper: {
      name: 'Thủ Môn Khổng Lồ', icon: '🧤', tags: ['iron'], role: 'use', rarity: 'epic',
      desc: 'Người trông khung có Giáp: phình to 1.4× khi bóng tới gần khung (tầm bắt bóng lớn theo). POOF! Mỗi lần giao bóng có ít nhất 1 Giáp.',
      params: { scale: 1.4, near: 150 },
    },

    /* ---------- 🔗 Cầu nối ---------- */
    rubber_arm: {
      name: 'Tay Cao Su', icon: '🤜', tags: ['brawler', 'playmaker'], role: 'use', rarity: 'epic',
      desc: 'Đấm vươn tay dài 55px: trúng người → đấm từ xa + kéo họ lại gần; trúng bóng lỏng / đường chuyền → giật bóng về chân. BOING!',
      params: { reach: 55, pull: 180, stun: 0.4, steal: 0.35 },
    },
    uppercut: {
      name: 'Long Quyền', icon: '🐲', tags: ['brawler', 'launcher'], role: 'use', rarity: 'rare',
      desc: 'Đủ 5 Nộ: cú đấm thành cú móc hàm — vút lên theo vệt lửa hình rồng, hất đối thủ thẳng lên trời. Tiêu hết Nộ.',
      params: { launch: 330, jump: 170 },
    },
    iron_fist: {
      name: 'Nắm Đấm Sắt', icon: '🦾', tags: ['brawler', 'iron'], role: 'gen', rarity: 'rare',
      desc: 'Có Giáp: nắm đấm thép — người cầm bóng không trụ được, +1 Nộ thêm. Mỗi Nộ giảm 8% thời gian bị choáng. Mỗi lần giao bóng có ít nhất 1 Giáp.',
      params: { rage: 1, stunPerRage: 0.08 },
    },
    one_two: {
      name: 'Một-Hai', icon: '🔁', tags: ['playmaker', 'striker'], role: 'use', rarity: 'epic',
      desc: 'Sút trong 1.2s sau khi nhận đường chuyền: tính là sút tụ lực tối đa (vô-lê), bóng kéo vệt đôi vàng-cam.',
      params: { window: 1.2 },
    },
    captain: {
      name: 'Thủ Lĩnh', icon: '🎖', tags: ['iron', 'playmaker'], role: 'gen', rarity: 'epic',
      desc: 'Mỗi đường chuyền tới chân trao 1 Giáp cho người nhận (mỗi người hồi 6s) — khiên lục giác ốp lên người.',
      params: { cooldown: 6 },
    },
    counter_strike: {
      name: 'Phản Đòn', icon: '⚔', tags: ['trickster', 'brawler'], role: 'use', rarity: 'epic',
      desc: 'Né thành công: trong 1s cú đấm không hồi chiêu, chắc chắn làm rơi bóng, +2 Nộ. Impact frame + COUNTER!',
      params: { window: 1, rage: 2, cooldown: 4 },
    },
    flying_kick: {
      name: 'Phi Cước', icon: '🚀', tags: ['runner', 'launcher'], role: 'use', rarity: 'epic',
      desc: 'Hard attack tiêu hết Đà: mỗi Đà bay xa + hất xa thêm 20% — bay ngang như tên lửa, chân bốc lửa.',
      params: { perMomentum: 0.2 },
    },
    ghost_ball: {
      name: 'Bóng Ma', icon: '👻', tags: ['trickster', 'striker'], role: 'use', rarity: 'epic',
      desc: 'Sút khi đang có ảo ảnh / phân thân: mỗi cái sút theo 1 quả bóng giả về khung (tối đa 3), thủ môn −25% bắt.',
      params: { max: 3, gkPenalty: 0.25, speed: 320 },
    },
    scissor_kick: {
      name: 'Song Phi', icon: '✂', tags: ['launcher', 'striker'], role: 'use', rarity: 'legendary',
      desc: 'Hard attack trúng bóng lỏng: xoay người đá chổng ngược — bóng thành cú sút tụ lực tối đa bay thẳng về khung, xuyên qua 2 người.',
      params: { speed: 1.1, pierce: 2, stun: 0.6, cooldown: 4 },
    },

    /* ---------- TUYỆT KỸ mới ---------- */
    endless_tiki: {
      name: 'Tiki-taka Vô Tận', icon: '🎼', tags: ['playmaker'], role: 'ult', rarity: 'mythic',
      desc: 'Sân ngả sepia, đối thủ chậm 60%; bóng tự chuyền 4 lần giữa 2 cầu thủ đội bạn (không thể cắt) rồi người cuối tung cú sút Giao Hưởng tối đa.',
      params: { passes: 4, gap: 0.22, slow: 0.4, slowTime: 1.8, gk: 0.25 },
    },
    meteor_strike: {
      name: 'Cú Sút Sao Băng', icon: '🌟', tags: ['striker'], role: 'ult', rarity: 'mythic',
      desc: 'Bật lên cao cùng bóng, 0.6s sau xoay người đá bóng cắm xuống khung với lực tối đa, đuôi lửa sao băng. Thủ môn bắt được vẫn bị hất văng.',
      params: { jump: 300, delay: 0.62, speed: 560, gk: 0.3 },
    },
    hundred_fists: {
      name: 'Bách Quyền', icon: '💢', tags: ['brawler'], role: 'ult', rarity: 'mythic',
      desc: 'Lao tới đối thủ gần nhất, tung 20 cú đấm trong 1s (giữ họ tại chỗ); cú cuối hất văng vào tường — BONK nứt toác.',
      params: { range: 160, hits: 20, gap: 0.05, knock: 560 },
    },
    meteor_drop: {
      name: 'Thiên Thạch Giáng', icon: '☄️', tags: ['launcher'], role: 'ult', rarity: 'mythic',
      desc: 'Nhảy vọt khỏi màn hình, 1s điều khiển tâm ngắm đỏ trên sân rồi rơi xuống tạo hố nổ 60px — hất tung mọi đối thủ, choáng 1.5s.',
      params: { aim: 1.0, speed: 190, radius: 60, knock: 240, launch: 260, stun: 1.5 },
    },
    clone_army: {
      name: 'Đại Phân Thân', icon: '🎎', tags: ['trickster'], role: 'ult', rarity: 'mythic',
      desc: '4 phân thân trong 3s. Không có bóng: vây đánh người cầm bóng — chắc chắn cướp bóng + choáng. Có bóng: toả ra dắt bóng giả, lừa hậu vệ, thủ môn −30% bắt.',
      params: { time: 3, gkPenalty: 0.3, stun: 1.3, range: 170 },
    },
    titan: {
      name: 'Hoá Khổng Lồ', icon: '🗿', tags: ['iron'], role: 'ult', rarity: 'mythic',
      desc: '5s to gấp 2, miễn choáng, không thể bị cướp bóng, va phải ai là hất văng, sút cực mạnh; vẫn chuyền / rê bóng bình thường.',
      params: { time: 5, scale: 2, knock: 360, launch: 220, stun: 1.0, shot: 1.35 },
    },

    /* ---------- 🎲 HỖN LOẠN (mới) ---------- */
    bomb_ball: {
      name: 'Bóng Bom', icon: '💣', tags: ['chaos'], role: 'wild', rarity: 'legendary',
      desc: 'Mỗi 12s bóng hoá bom (ngòi 3s, đếm ngược trên bóng): nổ hất tung + choáng mọi người quanh đó, bóng văng ngẫu nhiên. Mau đẩy bom sang đối thủ!',
      params: { every: 12, fuse: 3, radius: 55, knock: 260, launch: 240, stun: 1.2 },
    },

    /* ---------- 🎲 HỖN LOẠN ---------- */
    chaos_ball: {
      name: 'Bóng Hỗn Loạn', icon: '🎲', tags: ['chaos'], role: 'wild', rarity: 'rare',
      desc: 'Mỗi cú sút / chuyền: bóng biến hình (dưa hấu, bóng bowling, con gà, bánh xe...) và nhận 1 hiệu ứng ngẫu nhiên: bẻ cong, tên lửa, lửa, sét, bóng giả.',
      params: { curve: 2.2, rocketMult: 1.3 },
    },
    warp_walls: {
      name: 'Cổng Dịch Chuyển', icon: '🌌', tags: ['chaos'], role: 'wild', rarity: 'rare',
      desc: 'Bóng do đội bạn đá chạm tường trên / dưới chui vào cổng xoáy tím và chui ra ở tường đối diện.',
      params: {},
    },
  },
};
