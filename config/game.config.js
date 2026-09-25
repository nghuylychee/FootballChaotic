/* =========================================================
 * GAME CONFIG — luật trận, vật lý, chỉ số cơ bản, AI.
 * Chỉnh số ở đây để cân bằng game, không cần sửa code.
 * Đơn vị: pixel (thế giới 640x360), giây, pixel/giây.
 * ========================================================= */
window.SFC_CONFIG = window.SFC_CONFIG || {};

SFC_CONFIG.game = {
  render: {
    width: 640,
    height: 360,
    vignette: 0.6,          // độ tối viền màn hình kiểu Isaac
    pixelFont: '"Press Start 2P", monospace',
    showDebug: false,
  },

  audio: { enabled: true, volume: 0.3 },

  // Sân: hình chữ nhật trong "phòng" có tường bao quanh
  field: {
    x: 56, y: 80, w: 528, h: 246,
    goalWidth: 78,     // độ rộng khung thành (trục y)
    goalDepth: 18,     // độ sâu lưới
    goalHeight: 26,    // chiều cao xà ngang (trục z)
    boxDepth: 66,      // vòng cấm (thủ môn AI không ra khỏi vùng này)
    boxWidth: 140,
    centerCircle: 34,
  },

  match: {
    duration: 150,               // giây
    upgradeTimes: [15, 55, 95],  // mốc thời gian (giây đã trôi) mở Core Upgrade
    upgradeChoices: 3,
    finalPushTime: 30,           // 30s cuối = FINAL PUSH
    finalPushGoalValue: 2,       // bàn thắng trong Final Push được x2
    finalPushSpeedMult: 1.1,
    goldenGoal: true,            // hòa khi hết giờ -> bàn thắng vàng
    goldenGoalMaxTime: 60,       // quá thời gian này mà chưa có bàn -> hòa
    kickoffDelay: 1.3,
    goalCelebration: 2.4,
    autoSwitchOnDefense: true,   // tự đổi người khi mất bóng và đang ở xa
    autoSwitchDistance: 150,
  },

  // Vị trí đội hình (tỉ lệ sân, tính cho đội tấn công sang PHẢI)
  roles: ['GK', 'DEF', 'FWD'],
  formation: {
    GK:  { x: 0.03, y: 0.50 },
    DEF: { x: 0.25, y: 0.62 },
    FWD: { x: 0.40, y: 0.36 },
  },

  player: {
    radius: 6,
    speed: 86,
    sprintMult: 1.5,
    dribbleSpeedMult: 0.9,
    chargeMoveMult: 0.55,
    accel: 720,
    decel: 950,
    turnRate: 16,             // rad/s
    staminaMax: 100,
    staminaDrain: 30,
    staminaRegen: 20,
    staminaMinToSprint: 12,
    gkReach: 9,
    gkCatchHeight: 30,
    gkSaveBase: 0.95,
    gkStretchPenalty: 0.6,    // phạt tỉ lệ bắt bóng khi phải vươn người (bóng góc)
    gkSpeedPenalty: 700,      // mỗi (N px/s) vượt 260 -> giảm 100% tỉ lệ bắt
    gkParryShare: 0.6,        // khi bắt hụt: tỉ lệ đẩy được bóng ra, còn lại bóng lọt lưới
    gkSpeedMult: 1.1,         // thủ môn di chuyển nhanh hơn trong vòng cấm
    gkDiveSpeed: 250,
    gkDiveTime: 0.24,
  },

  ball: {
    radius: 3,
    gravity: 420,
    groundFriction: 1.05,
    airDrag: 0.2,
    bounce: 0.5,
    wallBounce: 0.72,
    netDamp: 0.25,
    dribbleOffset: 9,
    pickupRange: 4,
    pickupHeight: 12,
    selfPickupDelay: 0.3,
    looseNoPickup: 0.4,
    controlSpeed: 310,       // bóng nhanh hơn -> khó khống chế (đối phương)
    trailLength: 7,
  },

  kick: {
    passMinSpeed: 150,
    passMaxSpeed: 340,
    throughLead: 48,
    throughSpeedMult: 0.95,
    lobSpeed: 175,
    shotMinSpeed: 250,
    shotMaxSpeed: 450,
    chargeTime: 0.8,         // giây để đầy lực
    maxOvercharge: 1.25,     // giữ quá lâu -> bóng bay cao, lệch
    shotLiftMin: 10,
    shotLiftMax: 105,
    overchargeLift: 420,
    shotSpread: 0.08,        // rad
    overchargeSpread: 0.5,
  },

  combat: {
    tackleRange: 15,
    tackleLunge: 110,
    tackleCooldown: 0.55,
    tackleChance: 0.6,
    tackleFailRecover: 0.3,
    tackleVictimStagger: 0.25,

    slideSpeed: 235,
    slideTime: 0.34,
    slideRecover: 0.38,
    slideCooldown: 1.1,
    slideStun: 0.85,
    slideHitRange: 11,
    slideBallKick: 150,

    bodyCheckRange: 16,
    bodyCheckKnockback: 170,
    bodyCheckStun: 0.45,
    bodyCheckCooldown: 0.9,
    bodyCheckStealChance: 0.5,

    knockbackDamp: 7,
    hitImmuneBonus: 0.25,    // miễn nhiễm thêm sau khi hết choáng (chống khóa choáng)
  },

  skill: {
    dashSpeed: 230,
    dashTime: 0.16,
    cooldown: 1.0,
    tackleImmune: 0.35,
  },

  ai: {
    difficulty: {
      easy:   { label: 'DỄ',   reaction: 0.34, tackleMult: 0.7, shotAccuracy: 0.55, aggression: 0.6, speedMult: 0.92 },
      normal: { label: 'VỪA',  reaction: 0.2,  tackleMult: 1.0, shotAccuracy: 0.8,  aggression: 1.0, speedMult: 1.0 },
      hard:   { label: 'KHÓ',  reaction: 0.1,  tackleMult: 1.2, shotAccuracy: 0.92, aggression: 1.3, speedMult: 1.06 },
    },
    difficultyOrder: ['easy', 'normal', 'hard'],
    teammate: 'normal',       // độ khó của AI đồng đội người chơi
    shootRange: 170,
    shootRangeGood: 105,
    passPressure: 34,
    dribbleAvoid: 42,
    gkHoldTime: 0.6,
    supportAhead: 70,
    markDistance: 26,
    slideDistMin: 20,
    slideDistMax: 42,
  },

  fx: { shakeGoal: 5, shakeHit: 2, shakeShot: 1.5 },
};
