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
    boxDepth: 66,      // vòng cấm: cầu thủ đứng trong vòng cấm nhà được cơ chế thủ môn
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
    // Mỗi lần giao bóng (đầu trận + sau bàn thắng): đội hình lệch ngẫu nhiên quanh vị trí gốc
    // để không lặp lại một thế trận cố định. Để null = luôn đứng đúng đội hình gốc.
    kickoffVary: {
      x: 0.07,         // lệch tối đa theo chiều dọc sân (tỉ lệ chiều dài sân, ~37px); luôn ở phần sân nhà
      y: 0.16,         // lệch tối đa theo chiều ngang sân (tỉ lệ chiều rộng sân, ~39px)
      mirrorY: 0.5,    // xác suất lật đội hình trên <-> dưới (tính riêng từng đội)
    },
    goalCelebration: 2.4,
    autoSwitchOnDefense: true,   // tự đổi người khi mất bóng và đang ở xa
    autoSwitchDistance: 150,
  },

  // Street 2v2: không có thủ môn cố định. Ai đứng trong vòng cấm nhà (boxDepth x boxWidth)
  // thì được cơ chế thủ môn (gk* bên dưới). Vai trò chỉ là vị trí xuất phát, chia việc tùy người chơi.
  // Vị trí đội hình (tỉ lệ sân, tính cho đội tấn công sang PHẢI)
  roles: ['DEF', 'FWD'],
  formation: {
    DEF: { x: 0.20, y: 0.58 },
    FWD: { x: 0.40, y: 0.40 },
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
    // Cơ chế thủ môn — áp dụng cho cầu thủ đang đứng trong vòng cấm nhà
    gkReach: 9,
    gkCatchHeight: 30,
    gkSaveBase: 0.95,
    gkStretchPenalty: 0.6,    // phạt tỉ lệ bắt bóng khi phải vươn người (bóng góc)
    gkSpeedFree: 340,         // bóng chậm hơn mức này: thủ môn bắt không bị phạt tốc độ (khớp với lực sút mặc định)
    gkSpeedPenalty: 700,      // mỗi (N px/s) vượt gkSpeedFree -> giảm 100% tỉ lệ bắt
    gkParryShare: 0.6,        // khi bắt hụt: tỉ lệ đẩy được bóng ra, còn lại bóng lọt lưới
    gkSpeedMult: 1.1,         // AI đứng trong vòng cấm nhà di chuyển nhanh hơn
    gkHoldProtect: 2.5,       // (s) bắt được bóng trong vòng cấm nhà -> miễn tắc/xoạc/va vai trong thời gian này (khi còn ở trong vòng cấm)
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
    // S — chuyền sệt tự động: nhấn là chuyền ngay, tự chọn người nhận + lực (không cần giữ nạp lực).
    // Mũi tên chỉ vào một đồng đội (trong vùng aimCone) -> chuyền cho người đó, chuẩn (sai số spread thường).
    // Không bấm hướng / mũi tên không chỉ vào ai -> chuyền cho đồng đội gần nhất nhưng kém chuẩn (sloppy):
    // luôn lệch một khoảng rõ rệt, và người nhận KHÔNG tự chạy đón bóng -> phải tự đuổi theo, kể cả khi không có ai áp sát.
    quick: {
      enabled: true,          // false = S giữ nạp lực như W / A
      aimCone: 30,            // (độ) nửa góc quanh mũi tên để tính là "đang nhắm" vào đồng đội
      sloppy: {
        miss: [0.05, 0.15],   // lệch ngang = tỉ lệ quãng chuyền (trung bình 10% ~ "chính xác 90%"; ~3°–8.5°), ngẫu nhiên trái/phải
        pace: [0.05, 0.15],   // lực sai 5–15%, ngẫu nhiên mạnh hơn / yếu hơn
      },                      // cả hai chia cho chỉ số pass
    },

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

    // Cắt đường chuyền: bóng chuyền (S/W/A) đi qua tầm với của đối phương -> đối phương có 1 lần thử cắt.
    // tỉ lệ = base x hệ số tốc độ x hệ số lệch x chỉ số tackle (AI: x tackleMult theo độ khó), giới hạn 5–95%.
    // Trượt -> bóng chạm người, chậm lại + lệch nhẹ rồi đi tiếp; người đó không chạm lại được trong retry giây.
    intercept: {
      base: 0.9,              // bóng chậm, đi thẳng vào người
      slowSpeed: 150,         // tốc độ bóng <= mức này: không giảm tỉ lệ
      fastSpeed: 450,         // tốc độ bóng >= mức này: tỉ lệ x speedMin
      speedMin: 0.35,
      edgeMin: 0.35,          // bóng sượt mép tầm với: tỉ lệ x edgeMin (đi thẳng vào người: x1)
      minSpeed: 60,           // bóng chậm hơn mức này coi như bóng lỏng -> nhặt bình thường
      failSlow: 0.8,          // trượt: bóng còn 80% tốc độ
      failDeflect: 0.25,      // trượt: bóng lệch ngẫu nhiên tối đa (rad, ~14°)
      retry: 0.4,             // trượt: giây người đó không chạm lại được bóng
    },
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
    // Hướng sút = hướng phím giữ lúc thả, giới hạn trong khung thành (không giữ phím -> sút vào giữa khung).
    // Hướng phím chỉ ra ngoài khung thành -> tư thế gượng: sai số thêm tăng dần theo góc lệch ra ngoài cột dọc
    awkwardSpread: 0.15,     // rad sai số thêm tối đa (cũng chia cho accuracy)
    awkwardMinAngle: 15,     // (độ) lệch ra ngoài cột dọc dưới mức này: không bị phạt
    awkwardMaxAngle: 90,     // (độ) lệch từ mức này trở lên (vd. sút song song vạch vôi / quay lưng): phạt tối đa
    overchargeSpread: 0.5,
    // Phá bóng: nhấn D khi cầm bóng ở phần sân nhà (kiểu FC Online) — bóng bổng, luôn đi về phía trước
    clearSpeed: 290,         // px/s theo phương ngang (nhân chỉ số power)
    clearLift: 120,          // vz ban đầu -> bay ~0.57s, chạm đất ở ~155px, lăn tổng ~340px
    clearAngle: 0.8,         // ↑/↓ lệch góc phá bóng tối đa (~39°)
    clearSpread: 0.2,        // rad sai số ngẫu nhiên
  },

  // Phòng ngự (đội mình không có bóng): D = LIGHT ATTACK (đấm), A = HARD ATTACK (vung chân đá).
  // Mỗi đòn có cooldown riêng, hiển thị trên thanh kỹ năng ở giữa đáy màn hình.
  combat: {
    // D — LIGHT ATTACK: cú đấm thẳng, ra đòn gần như tức thì, tầm ngắn, choáng ngắn, cooldown ngắn
    light: {
      cooldown: 1.0,
      startup: 0.07,          // (s) kéo tay lấy đà trước khi nắm đấm chạm (anim: tay lùi về)
      recover: 0.2,           // (s) khựng sau cú đấm (anim: tay duỗi thẳng rồi thu về)
      lunge: 90,              // nhoài người về trước khi đấm (px/s)
      range: 17,              // tầm đấm tính từ mép người (px) — Core: tackleRange
      arc: 70,                // (độ) nửa góc vùng đấm phía trước mặt
      stun: 0.35,
      knockback: 150,
      stealChance: 0.6,       // tỉ lệ làm người cầm bóng rơi bóng (x chỉ số tackle / dribble đối thủ, Core: tackleChance); trượt -> chỉ đẩy lùi
    },
    // A — HARD ATTACK: gồng co chân (đối thủ nhìn thấy được) rồi bước tới vung chân đá.
    // Trúng: đối thủ bị hất tung bay rất xa + choáng lâu + chắc chắn rơi bóng. Trượt: khựng lâu. Z (lướt) đúng lúc thì né được.
    hard: {
      cooldown: 4.0,
      windup: 0.3,            // (s) gồng — trong lúc này vẫn xoay hướng được theo phím
      kickTime: 0.16,         // (s) vung chân (vùng đá có hiệu lực suốt thời gian này)
      step: 230,              // bước tới khi vung chân (px/s)
      range: 18,              // tầm chân tính từ mép người (px)
      arc: 80,                // (độ) nửa góc vùng vung chân
      stun: 1.2,
      knockback: 380,         // lực hất văng (px/s) — bay xa nhờ ma sát trên không thấp (airDamp)
      launch: 190,            // vận tốc hất lên cao (px/s)
      ballKick: 230,          // chân trúng bóng lỏng -> sút bóng đi
      recover: 0.3,           // khựng sau khi đá trúng
      whiffRecover: 0.6,      // khựng sau khi đá trượt
    },

    airGravity: 620,         // người bị hất tung: trọng lực
    airDamp: 1.4,            //   ma sát ngang khi còn trên không (thấp -> bay xa)
    wallBounce: 0.35,        // bị hất văng vào tường: bật ngược lại theo tỉ lệ này
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
      // tackleMult: nhân tỉ lệ Light attack làm rơi bóng của AI
      easy:   { label: 'DỄ',   reaction: 0.34, tackleMult: 0.7, shotAccuracy: 0.55, aggression: 0.6, speedMult: 0.92 },
      normal: { label: 'VỪA',  reaction: 0.2,  tackleMult: 1.0, shotAccuracy: 0.8,  aggression: 1.0, speedMult: 1.0 },
      hard:   { label: 'KHÓ',  reaction: 0.1,  tackleMult: 1.2, shotAccuracy: 0.92, aggression: 1.3, speedMult: 1.06 },
    },
    difficultyOrder: ['easy', 'normal', 'hard'],
    teammate: 'normal',       // độ khó tối đa của AI đồng đội người chơi (không bao giờ giỏi hơn độ khó đã chọn)
    shootRange: 170,
    shootRangeGood: 105,
    passPressure: 34,
    dribbleAvoid: 42,
    gkHoldTime: 0.6,
    supportAhead: 70,
    restDefenseFrom: 0.5,     // đồng đội cầm bóng vượt mốc này (tỉ lệ sân, 0.5 = giữa sân) -> người còn lại lùi chốt phía sau
    restDefenseDist: 110,     //   đứng sau người cầm bóng bao xa (px)
    markDistance: 26,
    keeperCoverDist: 420,     // đội máy: người cầm bóng đối phương cách khung thành nhà dưới mức này -> AI không áp sát lùi về trông khung
    hardDistMin: 16,          // AI dùng Hard attack khi người cầm bóng cách trong khoảng này (px)
    hardDistMax: 44,

    // Đồng đội AI của người chơi (vd. chế độ 1 cầu thủ: người còn lại do AI đá). Đội máy không dùng phần này.
    mate: {
      // Phòng ngự: luôn áp sát người cầm bóng để đoạt lại bóng. Chỉ về trông khung khi nguy hiểm rõ ràng:
      // người cầm bóng đã vào gần khung nhà, không ai đứng trong vòng cấm nhà, và mình không đang áp sát.
      dangerDist: 130,          // (px) người cầm bóng cách tâm khung thành nhà dưới mức này = nguy hiểm
      stickDist: 40,            // (px) đang áp sát trong khoảng này thì cứ tiếp tục áp sát
      lightChance: 0.45,        // trong tầm đấm: tỉ lệ ra đòn mỗi lần quyết định (đội máy: 0.6 x aggression x aiStyle.light, tối đa 0.9)
      // hồi chiêu riêng, dài hơn người chơi (người chơi: light 1s, hard 4s, lướt 1s) -> không ra đòn / lướt liên tục
      cooldownMult: { light: 1.8, hard: 1.5, skill: 2.2 },
      // Tấn công: ưu tiên rê bóng + dứt điểm
      passChance: 0.25,         // bị áp sát / giữ bóng lâu: tỉ lệ chuyền (đội máy: 0.75)
      holdTime: 5,              // (s) giữ bóng lâu hơn mức này mới cân nhắc chuyền (đội máy: 2.8)
      skillChance: 0.5,         // mỗi lần bị áp sát (đối thủ vào trong 26px): tỉ lệ dùng skill move né, quyết định 1 lần (đội máy: 0.35 mỗi lần quyết định)
      // Sút ở bất kỳ đâu trên phần sân đối phương (phần sân nhà: không sút). Tỉ lệ cho mỗi lần AI ra quyết định (~5 lần/giây):
      shootNear: 90,            // (px tới khung) gần hơn mức này: shootNearChance
      shootNearChance: 0.8,
      shootFarChance: 0.015,    // ở vạch giữa sân; từ shootNear tới đó giảm dần theo bình phương khoảng cách
      blockedMult: 0.35,        // có đối phương chắn đường sút
      // Cơ hội mười mươi: ở phần sân đối phương, cách khung < quickShotRange, đường sút thoáng và không ai trông khung
      // (không đối phương nào đứng trong vòng cấm của họ) -> quyết định 1 lần: sút nhanh lực nhẹ thay vì nạp lực
      quickShotChance: 0.3,
      quickShotRange: 220,      // (px tới khung)
      quickShotPower: [0.2, 0.45], // lực sút nhanh (thanh lực 0..1): sát khung -> ở quickShotRange (vừa đủ tới khung)
      // Nhận đường chuyền: chuyền lỗi (S không nhắm) -> luôn chạy nước rút tới bóng; chuyền chuẩn -> chạy nước rút, thỉnh thoảng đi bộ
      receiveWalkChance: 0.15,
    },
  },

  fx: { shakeGoal: 5, shakeHit: 2, shakeShot: 1.5 },
};
