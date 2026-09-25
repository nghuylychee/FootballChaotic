/* =========================================================
 * CORES CONFIG — hệ thống Core Upgrade (kiểu Augment LoL Arena).
 * Core áp dụng cho CẢ ĐỘI khi được chọn.
 *
 *  mods   : hệ số nhân thụ động, áp dụng tự động. Các key hỗ trợ:
 *           speed, offBallSpeed, sprintRegen, shotPower, passSpeed,
 *           tackleRange, tackleChance, slideSpeed, knockback,
 *           chargeTime, accuracy
 *  params : tham số cho hành vi đặc biệt (code ở src/systems/cores.js,
 *           map theo id). Thêm Core mới chỉ với `mods` thì không cần code.
 * ========================================================= */
window.SFC_CONFIG = window.SFC_CONFIG || {};

SFC_CONFIG.cores = {
  categories: {
    shooting: { label: 'SHOOTING', color: '#ff7a3d' },
    movement: { label: 'MOVEMENT', color: '#3dd6ff' },
    combat:   { label: 'COMBAT',   color: '#ff3d5a' },
    tactical: { label: 'TACTICAL', color: '#9dff3d' },
    chaos:    { label: 'CHAOS',    color: '#c63dff' },
  },

  tiers: {
    common: { label: 'COMMON', weight: 3, color: '#b9c2d0' },
    rare:   { label: 'RARE',   weight: 2, color: '#4fb4ff' },
    epic:   { label: 'EPIC',   weight: 1, color: '#d06bff' },
  },

  list: {
    /* ---------- SHOOTING ---------- */
    fire_shot: {
      name: 'Fire Shot', icon: '🔥', category: 'shooting', tier: 'rare',
      desc: 'Sút mạnh (≥50% lực) để lại vệt lửa trên sân. Bóng lửa và vệt lửa gây choáng + đẩy lùi đối thủ.',
      mods: { shotPower: 1.08 },
      params: { minCharge: 0.5, trailInterval: 0.035, trailDuration: 2.6, trailRadius: 6, stun: 0.9, knockback: 150 },
    },
    sniper_foot: {
      name: 'Sniper Foot', icon: '🎯', category: 'shooting', tier: 'common',
      desc: 'Bóng sút đi xa hơn nhiều (ít ma sát), chính xác hơn nhưng tốc độ bóng giảm.',
      mods: { accuracy: 1.6 },
      params: { frictionMult: 0.35, speedMult: 0.85, aiRangeMult: 1.5 },
    },
    thunder_kick: {
      name: 'Thunder Kick', icon: '⚡', category: 'shooting', tier: 'epic',
      desc: 'Nạp lực lâu hơn. Cú sút tích điện xuyên qua 1 cầu thủ (gây choáng) và khó bắt hơn với thủ môn.',
      mods: { chargeTime: 1.3 },
      params: { minCharge: 0.6, pierce: 1, speedMult: 1.2, stun: 0.7, gkPenalty: 0.25 },
    },
    banana_kick: {
      name: 'Banana Kick', icon: '🍌', category: 'shooting', tier: 'common',
      desc: 'Cú sút tự bẻ cong về phía khung thành.',
      params: { strength: 2.4 },
    },

    /* ---------- MOVEMENT ---------- */
    phantom_step: {
      name: 'Phantom Step', icon: '🌀', category: 'movement', tier: 'rare',
      desc: 'Sau mỗi skill move: dịch chuyển tức thời thêm một đoạn ngắn theo hướng lướt.',
      params: { distance: 34 },
    },
    speed_demon: {
      name: 'Speed Demon', icon: '🪽', category: 'movement', tier: 'common',
      desc: 'Chạy nhanh hơn khi không giữ bóng, hồi thể lực nhanh hơn.',
      mods: { offBallSpeed: 1.22, sprintRegen: 1.6 },
    },
    fake_run: {
      name: 'Fake Run', icon: '🪞', category: 'movement', tier: 'rare',
      desc: 'Khi bắt đầu chạy nước rút / skill move có bóng: tạo phân thân + bóng giả, hậu vệ gần đó bị đánh lừa.',
      params: { cooldown: 3.5, duration: 1.6, confuseRadius: 90, confuseTime: 1.2, angle: 0.8 },
    },

    /* ---------- COMBAT ---------- */
    street_fighter: {
      name: 'Street Fighter', icon: '🥊', category: 'combat', tier: 'common',
      desc: 'Tắc bóng tầm xa hơn, dễ thành công hơn. Tắc thành công gây đẩy lùi + phá combo đối thủ.',
      mods: { tackleRange: 1.3, tackleChance: 1.35, knockback: 1.6 },
      params: { stun: 0.7, knockback: 160 },
    },
    iron_body: {
      name: 'Iron Body', icon: '🛡', category: 'combat', tier: 'rare',
      desc: 'Miễn nhiễm choáng: chặn 1 đòn gây choáng, hồi lại sau vài giây (từng cầu thủ).',
      params: { cooldown: 5 },
    },
    blade_runner: {
      name: 'Blade Runner', icon: '🔪', category: 'combat', tier: 'epic',
      desc: 'Xoạc bóng phóng ra một đường chém năng lượng, gây choáng và đánh rơi bóng.',
      params: { speed: 300, life: 0.45, length: 18, stun: 0.9 },
    },

    /* ---------- TACTICAL ---------- */
    aegis_wall: {
      name: 'Aegis Wall', icon: '🧱', category: 'tactical', tier: 'epic',
      desc: 'Khiên năng lượng trên vạch vôi đội nhà: chặn 1 cú sút vào lưới, hồi lại sau một thời gian.',
      params: { cooldown: 28 },
    },
    counter_attack: {
      name: 'Counter Attack', icon: '↩', category: 'tactical', tier: 'common',
      desc: 'Khi đoạt lại bóng: cả đội tăng tốc và sút mạnh hơn trong vài giây.',
      params: { duration: 3.5, speedMult: 1.2, shotMult: 1.2 },
    },
    emp_trap: {
      name: 'EMP Trap', icon: '📡', category: 'tactical', tier: 'rare',
      desc: 'Mỗi lần tắc/xoạc để lại một quả mìn EMP. Đối thủ dẫm phải bị choáng và mất bóng.',
      params: { cooldown: 2.5, max: 3, life: 14, radius: 9, arm: 0.5, stun: 1.0 },
    },
    maestro: {
      name: 'Maestro', icon: '🎼', category: 'tactical', tier: 'common',
      desc: 'Chuyền bóng nhanh hơn. Người nhận bóng được tăng tốc ngắn — điều khiển nhịp độ trận.',
      mods: { passSpeed: 1.2 },
      params: { duration: 1.5, speedMult: 1.25 },
    },

    /* ---------- CHAOS ---------- */
    chaos_ball: {
      name: 'Chaos Ball', icon: '🎲', category: 'chaos', tier: 'rare',
      desc: 'Mỗi cú sút/chuyền nhận 1 hiệu ứng ngẫu nhiên: bẻ cong, tên lửa, lửa, sấm, bóng giả.',
      params: { curve: 2.2, rocketMult: 1.3 },
    },
    warp_walls: {
      name: 'Warp Walls', icon: '🌌', category: 'chaos', tier: 'common',
      desc: 'Bóng do đội bạn đá chạm tường trên/dưới sẽ dịch chuyển sang tường đối diện.',
      params: {},
    },
  },
};
