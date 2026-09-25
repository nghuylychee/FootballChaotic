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
    // Core Upgrade chỉ mở khi bóng chết: sau mỗi bàn thắng, trước khi giao bóng lại
    maxUpgrades: 4,              // số lần chọn Core tối đa mỗi trận
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
    gkSpeedFree: 340,         // bóng chậm hơn mức này: thủ môn bắt không bị phạt tốc độ (khớp với lực sút mặc định)
    gkSpeedPenalty: 700,      // mỗi (N px/s) vượt gkSpeedFree -> giảm 100% tỉ lệ bắt
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

  // Chuyền bóng: giữ S/W/A để nạp thanh lực, thả để chuyền.
  // Lực + hướng phím -> chọn người nhận; hướng bóng được tự căn vào người nhận.
  pass: {
    chargeTime: 0.7,          // giây giữ phím để đầy thanh lực
    // Lực mặc định = lực lý tưởng theo khoảng cách tới người nhận (chạm nhẹ là bóng tới chân).
    // Giữ phím vượt mức mặc định -> bóng căng hơn.
    minDist: 30,              // khoảng cách ứng với lực 0%  (px)
    maxDist: 320,             // khoảng cách ứng với lực 100% (px)
    farTargetCharge: 0.35,    // giữ quá mức này -> ưu tiên đồng đội ở xa hơn khi chọn người nhận
    coneAngle: 35,            // (độ) nửa góc vùng quanh hướng mũi tên; có đồng đội trong vùng mới khóa làm người nhận,
                              //      không có ai -> bóng đi thẳng theo hướng mũi tên
    freeMinDist: 70,          // chuyền vào khoảng trống: quãng đường bóng lăn khi chạm nhẹ (px)
    freeMaxDist: 300,         //                          quãng đường khi đầy lực (px)
    freeReceiverMaxTime: 1.6, // chuyền vào khoảng trống: đồng đội đón được bóng trong thời gian này -> thành người nhận
    aimAssist: 1.0,           // 1 = hướng bóng căn chuẩn vào người nhận; 0 = đi theo hướng phím
    powerAssist: 0.3,         // phần lực thừa (vượt mặc định) bị giảm bớt: 0 = giữ nguyên, 1 = bỏ hẳn
    powerSensitivity: 0.7,    // lực thừa làm bóng nhanh thêm bao nhiêu
    arriveSpeed: 150,         // tốc độ bóng khi tới chân người nhận (cao = luân chuyển nhanh, căng)
    minSpeed: 140,
    maxSpeed: 480,
    showTargetHint: false,    // true = hiện vòng/mũi tên trên người nhận khi nạp lực (debug)
    spread: 0.015,            // sai số hướng (rad), chia cho chỉ số pass
    receiverLead: 0.7,        // mức đón đầu theo vận tốc hiện tại của người nhận
    throughLeadMin: 24,       // chọc khe: lực thấp -> bóng vào khoảng trống gần
    throughLeadMax: 95,       //           lực cao  -> bóng vào sâu
    throughBase: 0.35,        // độ sâu mặc định khi chỉ chạm nhẹ
    throughArriveSpeed: 130,  // tốc độ bóng chọc khe khi tới điểm nhận (lực mặc định = tốc độ này + ma sát theo khoảng cách)
    freeThroughArrive: 80,    // chọc khe vào khoảng trống (không có người nhận): bóng vẫn còn lực khi qua điểm rơi
    lobTimeMin: 0.45,         // chuyền bổng: thời gian bay (s) theo khoảng cách
    lobTimeMax: 1.0,
    angleWeight: 2.6,         // độ ưu tiên hướng phím khi chọn người nhận
    distWeight: 1.2,          // độ ưu tiên khoảng cách theo lực
    switchMargin: 0.35,       // chống nhảy mục tiêu liên tục khi đang nạp lực
    receiveRangeBonus: 5,     // người nhận đích danh khống chế bóng dễ hơn (px)
    receiveAssist: true,      // người nhận tự chủ động chạy tới điểm đón bóng (người chơi bấm hướng mới thì được giành quyền)
  },

  kick: {
    shotMinSpeed: 300,       // tốc độ bóng ứng với thanh lực 0% (đủ nhanh để chạm nhẹ vẫn có cú sút)
    shotMaxSpeed: 460,
    chargeTime: 0.8,         // giây để đầy lực
    // Thanh lực bắt đầu từ mức nhỏ theo khoảng cách tới khung thành (gần -> shotBaseNear, xa -> shotBaseFar),
    // giữ D để nạp dần lên. Để 0 thì thanh luôn bắt đầu từ rỗng.
    shotBaseNear: 0.1,
    shotBaseFar: 0.25,
    shotBaseNearDist: 60,    // px tới khung thành
    shotBaseFarDist: 240,
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
