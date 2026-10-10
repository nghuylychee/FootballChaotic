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
    // "SFC JP": kana / chữ Hán của tiếng Nhật (unicode-range trong css/style.css -> ngôn ngữ khác không tải font này)
    pixelFont: '"Press Start 2P", "SFC JP", monospace',
    showDebug: false,
    // SETTINGS > RESOLUTION (chỉ bản desktop): cỡ cửa sổ, luôn 16:9. Cỡ lớn hơn màn hình bị ẩn. Thêm FULLSCREEN ở cuối
    windowSizes: [[1280, 720], [1600, 900], [1920, 1080], [2560, 1440], [3840, 2160]],
  },

  audio: {
    enabled: true,
    volume: 0.3,
    // Âm thanh khán giả (src/engine/audio.js + src/render/crowd.js). Độ ồn mỗi sân: arenas.config.js -> crowd.sound (0..1)
    crowd: {
      enabled: true,
      volume: 0.35,        // tiếng rì rầm nền ở sân ồn nhất (sound = 1)
      murmur: 0.4,         // độ to nhỏ lên xuống của tiếng rì rầm (0 = đều đều)
      finalPush: 1.35,     // FINAL PUSH: ồn hơn
      paused: 0.35,        // tạm dừng / menu trong trận: nhỏ lại
      goal: 1.1,           // hò reo khi có bàn thắng
      ooh: 0.6,            // "ồồ" khi cứu thua / bóng dội cột
      applause: 0.8,       // vỗ tay khi hết trận
    },
    // Tiếng thu sẵn (assets/sfx/<file>.wav, nguồn: docs/SFX.md): mỗi lần phát chọn ngẫu nhiên 1 file trong bộ.
    // Chưa nạp xong / nạp lỗi -> dùng tiếng tổng hợp như cũ
    samples: {
      ballBounce: { files: ['ball_bounce_1', 'ball_bounce_2', 'ball_bounce_3', 'ball_bounce_4'], volume: 0.6 },
      ballPass: { files: ['ball_pass_1', 'ball_pass_2', 'ball_pass_3'], volume: 0.6 },
      // sút: lực 0..1 chia 3 khoảng đều — dưới 1/3 weak · tới 2/3 mid · còn lại strong
      kickWeak: { files: ['ball_kick_weak'], volume: 0.6 },
      kickMid: { files: ['ball_kick_mid'], volume: 0.6 },
      kickStrong: { files: ['ball_kick_strong'], volume: 0.6 },
      punchLight: { files: ['punch_light_1', 'punch_light_2'], volume: 0.6 },   // Light attack trúng người
      swingLight: { files: ['swing_light'], volume: 1.8 },                       // Light attack vung tay (trúng hay trượt đều có). File gốc nhỏ hơn ~9 dB -> x3
      // Hard attack: gồng · hết gồng thì bước chân + vung chân cùng lúc · chân trúng người
      hardWindup: { files: ['hard_windup'], volume: 0.6 },
      hardStep: { files: ['hard_step_1', 'hard_step_2'], volume: 0.6 },
      hardSwing: { files: ['hard_swing'], volume: 1.4 },   // file gốc nhỏ hơn ~4 dB
      hardHit: { files: ['hard_hit'], volume: 1.0 },
    },
  },

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
    maxUpgrades: 5,              // số lần chọn Core tối đa mỗi trận (gồm lượt khởi đầu)
    preKickoffDraft: true,       // chọn 1 Core trước khi giao bóng đầu trận
    // lượt chọn Core tích theo thời gian: cứ draftEvery giây được +1 lượt, nhưng chỉ mở khi có bàn thắng (chọn liền các lượt đang chờ).
    // Lượt cuối luôn có trước FINAL PUSH: tới FINAL PUSH mà còn lượt thì tạm dừng trận để chọn nốt.
    // 0 = tự chia: (duration - finalPushTime) / maxUpgrades -> 150s, 30s cuối, 5 lượt: +1 lượt mỗi 24s (lượt cuối ở giây 96,
    //     còn 24s để có bàn thắng trước FINAL PUSH; không có bàn thì tạm dừng trận để chọn)
    draftEvery: 0,
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
    gkLungeMinSpeed: 220,     // (px/s) bắt / đẩy bóng lệch sang bên: bóng nhanh hơn mức này mới đổ người (chậm hơn: đứng bắt tại chỗ)
    gkDivePose: 0.22,         // (s) anim: đổ người xong nằm trên sân thêm chừng này (không ảnh hưởng di chuyển)
  },

  // ĐỌC CÚ SÚT: người chơi đứng trong vòng cấm nhà khi đối phương cầm bóng -> giữ W (thủ thế), thả đúng lúc đối phương sút.
  // Thưởng tỉ lệ bắt bóng = căn thời gian (chính) + vị trí (phụ, chỉ tính khi căn thời gian từ GOOD trở lên).
  // Thả sớm hay muộn đều được tính (|thả − sút|): đọc thanh lực sút của đối phương để thả đúng khoảnh khắc.
  read: {
    enabled: true,
    braceMoveMult: 0.6,       // tốc độ di chuyển khi đang giữ W
    cooldown: 0.6,            // (s) đọc hụt (TOO EARLY / TOO LATE) -> chưa được thủ thế lại
    lateLimit: 0.6,           // (s) thả muộn hơn cú sút quá mức này coi như không liên quan cú sút đó (đọc sớm cho cú sau)
    // cửa sổ |thả − sút| (s) và thưởng tỉ lệ bắt bóng tương ứng
    grades: [
      { id: 'perfect', window: 0.06, bonus: 0.6, dive: true, noStretch: true },
      { id: 'great',   window: 0.13, bonus: 0.35, dive: true },
      { id: 'good',    window: 0.22, bonus: 0.15 },
    ],
    // vị trí: P = (đứng trên đường bóng) × (khoảng cách tới người sút), thưởng thêm posBonus × P
    posBonus: 0.2,
    lineFull: 12,             // (px) cách đường bóng <= mức này: đủ điểm
    lineZero: 45,             // (px) cách đường bóng >= mức này: 0 điểm
    rangeNear: 40,            // (px) người sút ở sát: điểm vị trí × rangeMin
    rangeFar: 140,            // (px) người sút ở xa: điểm vị trí × 1
    rangeMin: 0.5,
  },

  ball: {
    radius: 3,
    gravity: 420,
    groundFriction: 1.05,
    airDrag: 0.2,
    airDragMinZ: 4,          // (px) bóng cao hơn mức này mới tính airDrag; nảy lẹt xẹt sát sân vẫn chịu groundFriction
    bounce: 0.5,
    wallBounce: 0.72,
    netDamp: 0.25,
    dribbleOffset: 9,
    pickupRange: 4,
    pickupHeight: 12,
    selfPickupDelay: 0.3,
    looseNoPickup: 0.4,
    landingMarker: true,     // bóng bổng (cao hơn pickupHeight): vẽ vòng điểm rơi trên sân
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
      aiDelay: [0.45, 1.3],   // (s) AI (đội máy + đồng đội AI) cắt được đường chuyền / chặn được cú sút ngoài vòng cấm nhà:
                              //     vẫn rê bóng nhưng chưa chuyền / sút trong khoảng này (kèm chữ INTERCEPT)
      aiDelayMinSpeed: 100,   // (px/s) bóng chậm hơn mức này lúc cắt -> không tính (không khựng, không chữ INTERCEPT)
    },
  },

  kick: {
    poseTime: 0.12,          // (s) giữ tư thế vung chân sút sau khi bóng rời chân (sút + phá bóng)
    shotMinSpeed: 300,       // tốc độ bóng ứng với thanh lực 0% (đủ nhanh để chạm nhẹ vẫn có cú sút)
    shotMaxSpeed: 460,
    chargeTime: 0.8,         // giây để đầy lực
    // Thanh lực bắt đầu từ mức nhỏ theo khoảng cách tới khung thành (gần -> shotBaseNear, xa -> shotBaseFar),
    // giữ D để nạp dần lên. Để 0 thì thanh luôn bắt đầu từ rỗng.
    shotBaseNear: 0.1,
    shotBaseFar: 0.25,
    shotBaseNearDist: 60,    // px tới khung thành
    shotBaseFarDist: 240,
    // Chạm nhẹ D (người chơi điều khiển): bóng chậm hơn mức đầu thanh lực, theo chỉ số SHOOTING (stats.power).
    // Giữ thêm tới shotTapWindow thì tăng dần về lực của thanh (giữ lâu hơn: y như cũ; AI không bị ảnh hưởng).
    // Chạm nhẹ ~ SHO 60: 176 · 70: 198 · 80: 220 · 90: 242 · 99: 262 px/s (lăn tối đa ~170–250px, thủ môn bắt dễ)
    // Đầu thanh cũ (lực mặc định ~0.1) ~ SHO 60: 237 · 80: 316 · 99: 391 · đầy lực ~ 60: 345 · 80: 460 · 99: 570
    shotTapSpeed: 220,       // (px/s) chạm nhẹ ở SHOOTING 80 (hệ số 1.0)
    shotTapScale: 0.8,       // tốc độ chạm nhẹ đổi theo chỉ số: x (1 + (power − 1) x mức này)
    shotTapWindow: 0.25,     // (0..1 phần thanh đã giữ) 0 = chạm nhẹ, từ mức này trở lên = lực của thanh; 0 = tắt
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
    clearance: false,        // TẮT: D ở sân nhà vẫn là sút bình thường (bật = true để dùng lại phá bóng)
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
      // Đấm rơi bóng: người bị đấm choáng lâu hơn (đấm người không có bóng vẫn là stun ở trên) để người đấm kịp lấy bóng
      stealStun: 0.7,
      instantSteal: 0.3,      // tỉ lệ bóng về thẳng chân người đấm; còn lại bóng bật về phía người đấm (lệch sang bên), người bị đấm văng hướng ngược lại
      stealBallSpeed: 70,     // (px/s) tốc độ bóng bật ra
      stealBallAngle: [20, 50], // (độ) bóng lệch sang trái / phải so với hướng về người đấm
      // Đấm cướp được bóng: chưa sút ngay được (chống bấm D liên tục = đấm xong sút luôn). Chỉ chặn sút — chuyền / lướt vẫn được,
      // buff sau khi cướp bóng (Core Counter Attack: 3.5s) vẫn kịp dùng
      stealShotLock: 0.35,    // (s) sau khi có bóng chưa sút được; D đang giữ từ cú đấm phải thả ra rồi bấm lại
      stealShotWindow: 0.8,   // (s) nhặt bóng bật ra trong khoảng này sau cú đấm cướp bóng cũng tính
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
      stun: 0.8,              // choáng (tính từ lúc tiếp đất, combat.airStunPause) — bay ~0.6s trước đó
      knockback: 380,         // lực hất văng (px/s) — bay xa nhờ ma sát trên không thấp (airDamp)
      launch: 190,            // vận tốc hất lên cao (px/s)
      ballKick: 230,          // chân trúng bóng lỏng -> sút bóng đi
      ballAngle: [50, 80],    // (độ) đá trúng người cầm bóng: bóng văng lệch sang trái / phải so với hướng người bị đá bay
      recover: 0.3,           // khựng sau khi đá trúng
      whiffRecover: 0.6,      // khựng sau khi đá trượt
    },

    airStunPause: true,      // bị hất tung: thời gian choáng chỉ trôi khi đã tiếp đất (false = trôi cả lúc bay -> Hard / bom chỉ còn ~0.5s choáng dưới đất)
    airGravity: 620,         // người bị hất tung: trọng lực
    airDamp: 1.4,            //   ma sát ngang khi còn trên không (thấp -> bay xa)
    wallBounce: 0.35,        // bị hất văng vào tường: bật ngược lại theo tỉ lệ này
    knockbackDamp: 7,
    hitImmuneBonus: 0.25,    // miễn nhiễm thêm sau khi hết choáng (chống khóa choáng)
  },

  skill: {
    dashSpeed: 230,
    dashTime: 0.16,
    afterimages: 4,          // số bóng mờ để lại, rải đều dọc đường lướt (Z)
    cooldown: 1.0,
    tackleImmune: 0.35,
  },

  ai: {
    difficulty: {
      // tackleMult: nhân tỉ lệ Light attack làm rơi bóng của AI
      easy:   { label: 'EASY', reaction: 0.34, tackleMult: 0.7, shotAccuracy: 0.55, aggression: 0.6, speedMult: 0.92 },
      normal: { label: 'NORMAL', reaction: 0.2,  tackleMult: 1.0, shotAccuracy: 0.8,  aggression: 1.0, speedMult: 1.0 },
      hard:   { label: 'HARD', reaction: 0.1,  tackleMult: 1.2, shotAccuracy: 0.92, aggression: 1.3, speedMult: 1.06 },
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
    keeperCoverDist: 420,     // đội máy: người cầm bóng đối phương cách khung thành nhà dưới mức này -> người gần khung nhất lùi về trông khung
    mateKeeperCoverDist: 300, // như trên, cho đồng đội AI ĐÁ LÙI của người chơi (sân rộng 528px: 420 -> trông khung ~64% thời gian phòng ngự, 220 -> ~17%)
    keeperPressDist: 110,     // đồng đội AI ĐÁ LÙI: chưa tới mateKeeperCoverDist mà người chơi cách người cầm bóng xa hơn mức này -> lên áp sát (không thì kèm người)
    // đồng đội AI ĐÁ LÙI cùng người chơi kẹp người cầm bóng (thay vì chỉ kèm người / trông khung):
    helpPress: {
      near: 40,               // (px) mình cách người cầm bóng dưới mức này và người chơi đang áp sát (ctlNear) -> cùng áp sát + đấm (kể cả gần khung nhà)
      ctlNear: 45,            // (px) người chơi cách người cầm bóng dưới mức này = đang áp sát
      ownHalf: false,         // true = người cầm bóng đã vào phần sân nhà (chưa tới mateKeeperCoverDist) -> luôn lên áp sát
      beaten: 10,             // (px) bị phản công: người chơi đứng phía trên người cầm bóng (về hướng khung đối phương) quá mức này
                              //      = đã bị vượt qua -> lên áp sát người cầm bóng thay vì kèm người còn lại. null = tắt
    },
    // đồng đội AI ĐÁ LÙI vừa giành được bóng (không phải nhận đường chuyền của đồng đội) -> chuyền nhanh cho người chơi
    outletPass: {
      delay: 0.4,             // (s) giữ bóng tối thiểu trước khi chuyền (khựng sau khi cắt bóng vẫn áp dụng)
      ahead: 20,              // (px) người chơi phải đứng phía trên mình (về hướng khung đối phương) ít nhất chừng này
    },
    // đồng đội AI ĐÁ LÙI cầm bóng (ôm bóng trong vòng cấm / vừa giành bóng, định chuyền cho người chơi) mà đang bị áp sát
    // và đường chuyền tới người chơi bị chắn -> phất bóng lên phía trước (bổng, góc thoáng đối phương nhất trong kick.clearAngle)
    // thay vì cố chuyền vào chân. null = tắt
    hoof: {
      pressDist: 45,          // (px) đối phương gần hơn mức này = đang áp sát
      laneWidth: 16,          // (px) đối phương cách đường chuyền tới người chơi dưới mức này = bị chắn
    },
    hardDistMin: 16,         // AI dùng Hard attack khi người cầm bóng cách trong khoảng này (px)
    hardDistMax: 44,

    // Đồng đội AI của người chơi (vd. chế độ 1 cầu thủ: người còn lại do AI đá). Đội máy không dùng phần này.
    mate: {
      // Vị trí dùng lối chơi bên dưới (áp sát / dứt điểm / ít chuyền). Vị trí khác (ĐÁ LÙI) chơi như đội máy: trông khung
      // (mateKeeperCoverDist), kèm người, chuyền nhiều; chỉ lên áp sát khi người chơi ở xa người cầm bóng (keeperPressDist).
      // Các phần còn lại (cooldownMult, lightChance, chạy đón đường chuyền, độ khó) áp dụng cho mọi vị trí.
      roles: ['FWD'],
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
