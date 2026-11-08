/* =========================================================
 * GAME CONFIG — luật trận, vật lý, chỉ số cơ bản, AI.
 * Chỉnh số ở đây để cân bằng game, không cần sửa code.
 * Đơn vị: pixel (thế giới 640x360), giây, pixel/giây.
 * ========================================================= */
window.SFC_CONFIG = window.SFC_CONFIG || {};

SFC_CONFIG.game = {
  // THỬ SÂN TO (proto/big-pitch, 2026-11-07): 1 núm chỉnh cỡ sân. 1 = sân gốc 528 x 246 trong khung 640 x 360.
  // Lớn hơn = khung trận + sân + các khoảng cách / tốc độ theo sân nhân lên từ giá trị gốc (khối cuối file). User đang thử 1.2
  pitchScale: 1.4,

  render: {
    // khung nhìn trận (px game của canvas trận) ở pitchScale 1. Thử sân to (2026-11-07): width / height / maxView nhân pitchScale (cuối file)
    // = zoom out; sprite giữ cỡ px nhưng trên màn hình nhỏ đi. Menu / HUD (#stage) giữ khung riêng ui bên dưới -> px trận nhỏ hơn px menu (user đồng ý)
    width: 640,
    height: 360,
    // THỬ cỡ người (2026-11-07): phóng sprite cầu thủ quanh bàn chân lúc vẽ (điểm gần nhất -> px không đều, chỉ để chọn cỡ).
    // 1.2 = bù đúng zoom out 1,2 -> người trên màn hình to như trước khi đổi sân. Chốt cỡ rồi thì vẽ lại sprite thật (src/render/player/) và đặt về 1
    playerScale: 1.3,
    // khung #stage (menu, HUD, mọi UI DOM): giữ 640 x 360 như cũ, giãn theo cửa sổ tới maxView
    ui: { width: 640, height: 360, maxView: [880, 512] },
    // khung nhìn tối đa (px game): cửa sổ khác 16:9 thì hiện thêm cảnh quanh sân theo tỉ lệ cửa sổ (sân giữ cỡ, nằm giữa) và UI (#stage)
    // giãn ra mép màn hình; quá cỡ này thì viền đen. Cut scene, TROPHY ROOM, KIT VAN giữ khung 640 x 360 ở giữa.
    // Cảnh sân vẽ đủ cỡ này (docs/art-direction/pixel-and-camera.md)
    maxView: [880, 512],   // x pitchScale (cuối file)
    vignette: 0.6,          // độ tối viền màn hình kiểu Isaac
    // "SFC JP": kana / chữ Hán của tiếng Nhật (unicode-range trong css/style.css -> ngôn ngữ khác không tải font này)
    pixelFont: '"Press Start 2P", "SFC JP", monospace',
    showDebug: false,
    // màu dấu điều khiển & vòng chân trên sân: me = người chơi tại máy này, ally = đồng đội, opp = đối thủ
    ctrlColors: { me: '#5cff4a', ally: '#3ff6ff', opp: '#ff4757' },
    // vòng chân (1 kiểu viền tối kẹp màu ở giữa): cùng độ dày (thick: 1), me hơi to hơn (r: 8) so với ally/opp (r: 7)
    footRings: {
      me: { r: 8, thick: 1 },
      other: { r: 7, thick: 1 },
    },
    // SETTINGS > RESOLUTION (chỉ bản desktop): cỡ cửa sổ, luôn 16:9. Cỡ lớn hơn màn hình bị ẩn. Thêm FULLSCREEN ở cuối
    windowSizes: [[1280, 720], [1600, 900], [1920, 1080], [2560, 1440], [3840, 2160]],
  },

  audio: {
    enabled: true,
    volume: 0.3,
    // Âm thanh khán giả (src/engine/audio.js + src/render/crowd.js). Độ ồn mỗi sân: arenas.config.js -> crowd.sound (0..1)
    // User 2026-10-30: TẠM TẮT mọi tiếng khán giả (tiếng sân, hò reo khi ghi bàn, "ồồ", vỗ tay; tổng hợp nghe chưa ổn; Story cũng không dùng).
    // Bật lại: bed = true, goal / ooh / applause > 0 (tiếng tắt thì không render)
    crowd: {
      enabled: true,
      bed: false,          // TIẾNG SÂN cả trận (đám đông xa ngân dài)
      volume: 0.35,        // âm lượng tiếng sân ở sân ồn nhất (sound = 1)
      murmur: 0.4,         // độ dâng hạ chậm của tiếng sân (0 = đều đều)
      finalPush: 1.35,     // FINAL PUSH: ồn hơn
      paused: 0.35,        // tạm dừng / menu trong trận: nhỏ lại
      goal: 0,             // hò reo + vỗ tay khi có bàn thắng (tắt 2026-10-30, user; bật: 1.1)
      ooh: 0,              // "ồồ" khi cứu thua / bóng dội cột (đang tắt; bật: 0.6)
      applause: 0,         // vỗ tay khi hết trận (đang tắt; bật: 1.0)
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
    // ở pitchScale 1. Thử sân to: w x pitchScale, h x (1 + (pitchScale - 1) x 0,75), đặt giữa khung trận (cuối file)
    x: 56, y: 80, w: 528, h: 246,
    // khung thành + vòng cấm to thêm ~10% (user 2026-11-07): 78 / 18 / 26 / 66 / 140 -> 86 / 20 / 29 / 73 / 154. Không theo pitchScale
    goalWidth: 86,     // độ rộng khung thành (trục y)
    goalDepth: 20,     // độ sâu lưới
    goalHeight: 38,    // chiều cao xà ngang (trục z). 29 -> 38 (user 2026-11-07: khung thành cao lên, gần tỉ lệ người 31 px). Sút / lốp tính theo xà nên tự cao theo
    boxDepth: 73,      // vòng cấm: cầu thủ đứng trong vòng cấm nhà được cơ chế thủ môn
    boxWidth: 154,
    centerCircle: 34,
  },

  match: {
    duration: 150,               // giây
    // Core Upgrade chỉ mở khi bóng chết: sau mỗi bàn thắng, trước khi giao bóng lại
    maxUpgrades: 4,              // số lần chọn Core tối đa mỗi trận (gồm lượt khởi đầu) — user chốt 2026-10-13
    preKickoffDraft: true,       // chọn 1 Core trước khi giao bóng đầu trận
    // lượt chọn Core tích theo thời gian: cứ draftEvery giây được +1 lượt, nhưng chỉ mở khi có bàn thắng (chọn liền các lượt đang chờ).
    // Tới FINAL PUSH là đủ mọi lượt; finalPushForceDraft = true: còn lượt thì tạm dừng trận để chọn nốt ("FINAL CORE PICK"),
    // false: không ép — lượt còn lại vẫn chỉ mở sau bàn thắng (kể cả trong FINAL PUSH), không có bàn thì thôi.
    // 0 = tự chia: (duration - finalPushTime) / maxUpgrades -> 150s, 30s cuối, 4 lượt: +1 lượt mỗi 30s (lượt cuối ở giây 90,
    //     còn 30s để có bàn thắng trước FINAL PUSH)
    draftEvery: 0,
    upgradeChoices: 3,
    finalPushTime: 30,           // 30s cuối = FINAL PUSH
    finalPushForceDraft: false,  // true = tới FINAL PUSH còn lượt chọn Core thì dừng trận để chọn nốt
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
    // (px) lúc giao bóng người ĐÁ LÙI mỗi đội đứng sẵn ở vị trí thủ môn: trước vạch khung nhà chừng này, giữa khung
    // (user 2026-10-30: không bắt chạy về) · Skill game: đối thủ trông khung cũng vậy. null = đứng theo đội hình
    kickoffKeeper: 10,
    goalCelebration: 3.2,        // giây đứng hình sau bàn thắng = thời gian diễn động tác ăn mừng (celebration bên dưới)
    outroDuration: 3.0,          // giây đứng hình sau còi mãn cuộc (Beat 1: đội thắng ăn mừng / đội thua thất vọng tại chỗ trên sân)
    assistWindow: 6,             // (s) thời gian tính kiến tạo từ lúc đồng đội nhận đường chuyền tới lúc bóng vào lưới
    autoSwitchOnDefense: true,   // tự đổi người khi mất bóng và đang ở xa
    autoSwitchDistance: 150,
  },

  // Street 3v3: không có thủ môn cố định. Ai đứng trong vòng cấm nhà (boxDepth x boxWidth)
  // thì được cơ chế thủ môn (gk* bên dưới). Vai trò chỉ là vị trí xuất phát, chia việc tùy người chơi.
  // Vị trí đội hình (tỉ lệ sân, tính cho đội tấn công sang PHẢI)
  // 3v3: ĐÁ LÙI · TIỀN VỆ · ĐÁ CAO (thứ tự = thứ tự players / looks của mỗi đội)
  roles: ['DEF', 'MID', 'FWD'],
  formation: {
    DEF: { x: 0.17, y: 0.52 },
    MID: { x: 0.30, y: 0.32 },
    FWD: { x: 0.41, y: 0.66 },
  },

  player: {
    radius: 6,
    // 2026-10-30 (user: nhịp trận chậm lại chút): 86 -> 80, accel 720 -> 650; chuyền minSpeed / maxSpeed / arriveSpeed -5%; sút giữ nguyên
    speed: 80,               // x pitchScale (cuối file)
    sprintMult: 1.5,
    dribbleSpeedMult: 0.9,
    chargeMoveMult: 0.55,
    accel: 650,
    decel: 950,
    turnRate: 16,             // rad/s
    staminaMax: 100,
    staminaDrain: 30,         // / pitchScale (cuối file)
    staminaRegen: 32,         // x (cuối file) · (/s, nhân chỉ số STAMINA) hồi khi không chạy nước rút — user 2026-11-01: 20 -> 32, hồi nhanh hơn
    staminaMinToSprint: 12,
    // Cơ chế thủ môn — áp dụng cho cầu thủ đang đứng trong vòng cấm nhà
    gkReach: 9,
    gkCatchHeight: 39,        // (z) thủ môn với tới bóng cao bấy nhiêu = xà + 1 (field.goalHeight 38): đổi xà thì đổi số này theo, không thì bóng sát xà luôn vào
    gkSaveBase: 0.95,
    gkStretchPenalty: 0.6,    // phạt tỉ lệ bắt bóng khi phải vươn người (bóng góc)
    // 340 / 700 -> 380 / 1000 (2026-10-30): cú sút giờ giữ tốc độ tới khung (ball.shotFriction) + đầy lực 560 -> bóng tới thủ môn nhanh hơn nhiều
    gkSpeedFree: 380,         // bóng chậm hơn mức này: thủ môn bắt không bị phạt tốc độ
    gkSpeedPenalty: 1000,     // mỗi (N px/s) vượt gkSpeedFree -> giảm 100% tỉ lệ bắt
    gkParryShare: 0.4,        // khi bắt hụt: tỉ lệ đẩy được bóng ra, còn lại bóng lọt lưới (0.6 -> 0.4, user 2026-10-25: thủ môn quá khó vượt)
    // PHẢN XẠ (user 2026-10-31: sút chéo góc tầm gần mà vẫn bắt được là vô lý): bóng tới thủ môn sau < full s kể từ lúc rời chân
    // -> tỉ lệ bắt + tỉ lệ đẩy ra nhân thêm hệ số thấp nhất; từ none s trở lên không phạt (ở giữa: nội suy).
    // Hệ số thấp nhất theo độ vươn: bóng thẳng vào người = straight (chắn bằng thân vẫn được), phải vươn tối đa = stretch.
    // Đọc Cú Sút (read) đúng nhịp thì không bị phạt: đọc đúng chính là phản xạ trước
    gkReflex: { full: 0.1, none: 0.3, straight: 0.8, stretch: 0.15 },
    // bắt hụt mà bóng lọt (thay chữ SLIP!, user 2026-10-31): wrong = tỉ lệ đổ người SAI phía (bay ngược hướng bóng), còn lại
    // đổ người ĐÚNG phía nhưng muộn late s (bóng đã qua người mới bay)
    gkBeat: { wrong: 0.5, late: 0.12 },
    gkSpeedMult: 1.1,         // AI đứng trong vòng cấm nhà di chuyển nhanh hơn
    gkHoldProtect: 2.5,       // (s) bắt được bóng trong vòng cấm nhà -> miễn tắc/xoạc/va vai trong thời gian này (khi còn ở trong vòng cấm)
    // đổ người (Actions.dive): bay đúng quãng cần tới, xa thì gkDiveSpeed (px/s) trong tối đa gkDiveTime (s); gần thì chậm lại để cú bay dài
    // ít nhất gkDiveMin (s) — bay ngắn mà vẫn hết tốc thì trông như bị giật văng đi. Vòng cung bay thấp dần theo cú bay ngắn (render/player/keeper.js)
    // Tốc độ trong cú bay hình parabol (user 2026-11-01): chậm lúc bật, nhanh nhất giữa cú bay (1.5 x trung bình), chậm lại lúc chạm đất (Player, state dash)
    gkDiveSpeed: 250,
    gkDiveTime: 0.24,
    gkDiveMin: 0.12,
    gkLungeMinSpeed: 220,     // (px/s) bắt / đẩy bóng lệch sang bên: bóng nhanh hơn mức này mới đổ người (chậm hơn: đứng bắt tại chỗ)
    gkStraight: 8,            // (px) bóng tới lệch khỏi người trong khoảng này = sút thẳng vào người: không đổ người (bắt ôm / đẩy / lọt tại chỗ)
    // ĐỠ BÓNG TẠI CHỖ (user 2026-11-01, atkType gkBlock): cú sút của đối thủ sắp tới thẳng người trông khung (lệch không quá gkStraight) ->
    // lead s trước lúc tới thì dang rộng 2 tay (chữ V) + 2 chân; bắt được thì sang ôm bóng, đẩy ra / lọt lưới thì giữ hold s rồi hạ tay lower s (chỉ là hình)
    gkBlock: { lead: 0.08, hold: 0.2, lower: 0.15 },
    // (s) anim: chạm đất -> đứng dậy (không ảnh hưởng di chuyển) = tổng gkGetUp: đập xuống · nằm · bò 4 chân · nhổm lên · quỳ · khuỵu (render/player/gkball.js).
    // Đang di chuyển thì cắt thẳng tới khúc khuỵu (Player) để người không trượt đi lúc đang nằm / quỳ
    gkDivePose: 0.6,
    gkGetUp: { land: 0.06, lie: 0.16, fours: 0.07, rise: 0.07, kneel: 0.14, crouch: 0.1 },
    // THỦ MÔN ÔM BÓNG (bắt được bóng trong vòng cấm nhà, atkType gkHold): chuyền / sút / phát bóng thì tung bóng lên bằng tay rồi đá
    // (user 2026-11-01: chậm hơn đá ngay một chút, vẫn ôm bóng tới lúc đó). Bóng rời chân lúc w + s * 0.6; toss = tay tung bóng tới đỉnh, w = lấy đà,
    // s vung, f giữ hết tầm, o về (giây). punt = sút / phá / phất / chuyền bổng · volley = chuyền sệt / chọc khe
    gkRelease: {
      punt: { toss: 0.09, w: 0.12, s: 0.06, f: 0.14, o: 0.16 },
      volley: { toss: 0.06, w: 0.085, s: 0.05, f: 0.08, o: 0.12 },
    },
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
    radius: 2,               // thử sân to (2026-11-07): 3 -> 2 (bóng nhỏ hơn, dễ thấy nhờ vệt + vòng dưới đất + hiện xuyên khi bị che)
    gravity: 420,
    groundFriction: 1.05,
    airDrag: 0.2,
    airDragMinZ: 4,          // (px) bóng cao hơn mức này mới tính airDrag; nảy lẹt xẹt sát sân vẫn chịu groundFriction
    bounce: 0.5,
    wallBounce: 0.72,
    netDamp: 0.25,
    dribbleOffset: 6,        // x render.playerScale (cuối file) · (px) bóng trước chân theo hướng mặt — 9 -> 6 (user 2026-11-03: bóng xa chân quá, nhìn xuống thì như tách khỏi chân)
    // dẫn bóng (Ball.follow, user 2026-11-03: bóng quay theo hướng mặt như dính keo): bóng có vị trí riêng quanh chân, không dán vào hướng mặt
    dribble: {
      turnRate: 11,         // (rad/s) bóng xoay quanh chân chậm hơn người (player.turnRate) -> đổi hướng thì bóng trễ một nhịp (7 trễ quá: người quay lưng mà bóng còn trước mặt)
      sprintOffset: 9,      // x render.playerScale (cuối file) · (px) chạy nước rút: bóng xa chân hơn dribbleOffset (user 2026-11-03: chạy thường / đổi hướng bóng sát chân, nước rút xa được)
      // đổi hướng (cả lúc chạy nước rút): bóng về khoảng cách chạy thường (dribbleOffset) rồi kéo vào sát chân, khoảng cách còn (1 - turnTuck) x —
      // đổi hướng bóng gọn trong chân. Kéo hết khi bóng trễ hướng mặt từ turnFull x 90° trở lên
      turnTuck: 0.3,
      turnFull: 0.5,
      reach: 25,            // (/s) độ nhanh bóng vào gần chân (đổi hướng, nhận bóng)
      release: 8,           // (/s) độ nhanh bóng ra xa chân lại (sau khi đổi hướng, bắt đầu chạy nước rút) — chậm: người đẩy bóng ra lại từ từ
      dragAngle: 2.0,       // (rad, ~115°) hướng chạy ngược phía bóng quá mức này -> kéo bóng bằng gầm giày: bóng đi thẳng qua chân sang phía mới
      dragSpeed: 110,       // (px/s) tốc độ bóng lúc kéo
      // chạy nước rút: chạy được tapEvery px thì chạm bóng 1 lần, bóng ra xa chân thêm tối đa tapLead px (x tốc độ / player.speed, tối đa 1,5) rồi lăn về;
      // đang đổi hướng thì nhỏ dần về 0. Chạy thường không chạm: bóng giữ sát chân (user 2026-11-03)
      tapEvery: 30,         // x render.playerScale (cuối file)
      tapLead: 3,           // x pitchScale (cuối file)
      tapRise: 0.2,         // phần đầu nhịp chạm: bóng ra xa, phần còn lại: người đuổi kịp bóng
      turnSlow: 0.35,       // bóng đang trễ hướng mặt / đang kéo: tốc độ người cầm bóng giảm tới chừng này (đổi hướng gắt mất đà)
    },
    // tầm khống chế bóng lỏng tính từ mép người + bóng. 4 -> 6, 12 -> 15 (user 2026-10-31: lại gần bóng mà không bắt dính):
    // hình nhân vật cao ~30px nên bóng cách chân 13-15px trông như đã chạm người; bóng nảy ngang hông (z 12-15) cũng khống chế được
    pickupRange: 7,          // thử sân to (2026-11-07): 6 -> 7 bù bóng nhỏ đi 1 px (tầm chạm thật giữ nguyên) · x render.playerScale (cuối file)
    pickupHeight: 15,        // x render.playerScale (cuối file): người Sprite v3 cao hơn -> ngang hông cao hơn
    // HỖ TRỢ ĐUỔI BÓNG LỎNG (Human.chaseAssist, chỉ người chơi đang điều khiển; user 2026-11-08: chạy tới bóng nảy mà không bắt dính, chạy vượt qua bóng):
    // bóng lỏng cách dưới range px, hướng đang bấm lệch khỏi chỗ chạm bóng không quá cone°, chạm được trong maxT s -> tự lái tới chỗ chạm,
    // cách chỗ đó dưới ease px thì chậm dần
    chaseAssist: { enabled: true, range: 30, cone: 60, maxT: 0.45, ease: 10 },
    selfPickupDelay: 0.3,
    looseNoPickup: 0.4,
    // (s) thủ môn phất bóng lên trời từ tay (sút / phá / phất, Actions.gkRelease sky; chuyền từ tay vẫn bị cắt): đối phương không chạm được bóng
    // tới khi bóng rơi chạm đất lần đầu, tối đa bấy nhiêu giây (bóng đá sệt từ tay không rời đất: hết theo giờ). Đồng đội nhận bình thường
    puntSafe: 1.2,
    landingMarker: true,     // bóng bổng (cao hơn pickupHeight): vẽ vòng điểm rơi trên sân
    controlSpeed: 310,       // bóng nhanh hơn -> khó khống chế (đối phương)
    trailLength: 7,          // vệt bóng mô phỏng (Ball.trail); vệt vẽ trên sân: Renderer.ballTrail (lịch sử riêng, xem fx.ballTrail)
    nearMiss: 12,            // (px) cú sút đi ra ngoài cách cột dọc / trên xà trong khoảng này -> khán giả "ồồ"
    // bóng sút (kind 'shot') chịu ma sát / cản gió x mức này cho tới khi dội vạch cuối sân / có người chạm
    // (user 2026-10-30: cú sút vừa lực lăn sát đất mất hơn nửa tốc độ trước khi tới khung -> không có cảm giác PES / FIFA)
    shotFriction: 0.3,
    shotBounceKeep: 0.92,    // bóng sút nảy đất giữ lại chừng này tốc độ ngang (bóng thường: 0.78)
    // BÓNG LĂN CÓ ĐỘ NẶNG (user 2026-11-07): ma sát hàm mũ làm bóng chậm cứ lăn rề rề mãi (100 px/s còn trôi ~95 px). Bóng sát đất chậm hơn below px/s
    // chịu thêm hãm đều decel px/s² -> lăn chậm là dừng dứt khoát (~25 px). Đường chuyền có người nhận tới chân >= 120 px/s nên tính giờ chuyền không đổi.
    // Ball.update + Actions.flightStep (đoán điểm đón). enabled false = như cũ
    rollStop: { enabled: true, below: 110, decel: 170 },
  },

  // Chuyền bóng: giữ S/W/A để nạp thanh lực, thả để chuyền.
  // Lực + hướng phím -> chọn người nhận; hướng bóng được tự căn vào người nhận.
  pass: {
    poseTime: 0.4,            // (s) giữ tư thế chuyền (sệt / chọc khe / bổng) sau khi bóng rời chân; hình theo render/player/pass.js
    // S — chuyền sệt tự động: nhấn là chuyền ngay, tự chọn người nhận + lực (không cần giữ nạp lực).
    // Mũi tên chỉ vào một đồng đội (trong vùng aimCone) -> chuyền cho người đó, chuẩn (sai số spread thường).
    // Không bấm hướng / mũi tên không chỉ vào ai -> chuyền cho đồng đội gần nhất nhưng kém chuẩn (sloppy):
    // luôn lệch một khoảng rõ rệt, và người nhận KHÔNG tự chạy đón bóng -> phải tự đuổi theo, kể cả khi không có ai áp sát.
    quick: {
      enabled: false,         // false = S giữ nạp lực như W / A (user chốt 2026-10-11: chuyền sệt chỉnh được lực) · true = S chuyền ngay khi nhấn
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
    maxDist: 320,             // x pitchScale (cuối file). Khoảng cách ứng với lực 100% (px)
    farTargetCharge: 0.35,    // giữ quá mức này -> ưu tiên đồng đội ở xa hơn khi chọn người nhận
    coneAngle: 35,            // (độ) nửa góc vùng quanh hướng mũi tên; có đồng đội trong vùng mới khóa làm người nhận,
                              //      không có ai -> bóng đi thẳng theo hướng mũi tên
    freeMinDist: 70,          // chuyền vào khoảng trống: quãng đường bóng lăn khi chạm nhẹ (px)
    freeMaxDist: 300,         // x pitchScale (cuối file) · quãng đường khi đầy lực (px)
    freeReceiverMaxTime: 1.6, // chuyền vào khoảng trống: đồng đội đón được bóng trong thời gian này -> thành người nhận
    aimAssist: 1.0,           // 1 = hướng bóng căn chuẩn vào người nhận; 0 = đi theo hướng phím
    // HỖ TRỢ CHUYỀN (user 2026-10-31), chỉ người chơi, mạnh dần theo PASSING (stats.pass acc[0] -> acc[1]):
    // cone: nửa góc vùng chọn người nhận quanh mũi tên (thay coneAngle) · fallback: chuyền sệt / bổng mà không ai trong vùng -> tìm tiếp
    // trong vùng rộng này rồi mới phát vào khoảng trống (chọc khe vẫn phát vào khoảng trống) · laneWeight: trừ điểm người nhận có đường
    // chuyền dễ bị cắt (Actions.laneRisk: đối thủ trong tầm với đường bóng, tính cả quãng họ kịp bước tới close px/s trong lúc bóng lăn
    // ballSpeed px/s; giảm dần trong margin px) · shift: chuyền sệt có chân đối thủ chắn -> dịch điểm nhận bóng sang ngang tối đa chừng này px
    // · zip: vẫn còn nguy cơ (sau khi dịch) -> chuyền căng hơn x (1 + nguy cơ x zip) (bóng nhanh khó bị cắt hơn, pass.intercept) ·
    // power: phần lực thừa bị giảm (thay powerAssist). (Đã thử tự hất bổng qua đầu người chắn: không bớt bị cắt, bỏ.)
    // Đo 300 tình huống 3v3 có 2 người chắn (2026-10-31): bị cắt 28–33% -> PASSING 60: 28% · 80: 19% · 99: 17%
    assist: { enabled: true, acc: [0.75, 1.2], cone: [32, 45], fallback: [60, 80], laneWeight: [1.5, 3], shift: [6, 18], zip: [0.15, 0.6],
      power: [0.3, 0.6], close: 70, ballSpeed: 260, margin: 10 },
    powerAssist: 0.3,         // phần lực thừa (vượt mặc định) bị giảm bớt: 0 = giữ nguyên, 1 = bỏ hẳn
    powerSensitivity: 0.7,    // lực thừa làm bóng nhanh thêm bao nhiêu
    // BÓNG CHUYỀN KHÔNG CHẬM DẦN (user 2026-11-01: người chạy nhanh đuổi kịp bóng): chuyền sệt / chọc khe có người nhận chịu ma sát x friction
    // tới khi bóng đi qua điểm nhận (qua rồi mà chưa ai chạm: lăn chậm dần như thường). Chuyền vào khoảng trống / chuyền bổng không đổi.
    // Bóng gần như đi đều ở arriveSpeed (chọc khe: throughArriveSpeed) — nhanh hơn người chạy nước rút có buff (~200 px/s)
    friction: 0.15,
    // CHỌC KHE có người nhận: ma sát riêng (x groundFriction) tới điểm nhận -> sút căng, chậm dần khi tới gần điểm nhận (vẫn đúng nhịp người chạy,
    // Actions.passPlan tính lực theo ma sát này). Qua điểm nhận: lăn như bóng thường
    throughFriction: 0.8,
    arriveSpeed: 250,         // tốc độ bóng khi tới chân người nhận — 150 -> 180 (2026-10-30) -> 170 (-5%) -> 250 (2026-11-01, kèm friction)
    minSpeed: 133,
    maxSpeed: 455,            // x pitchScale (cuối file) (chuyền dài tới chân còn đủ nhanh)
    showTargetHint: false,    // true = hiện vòng/mũi tên trên người nhận khi nạp lực (debug)
    spread: 0.015,            // sai số hướng (rad), chia cho chỉ số pass
    receiverLead: 0.7,        // mức đón đầu theo vận tốc hiện tại của người nhận
    throughLeadMin: 24,       // chọc khe BỔNG (technique.lobThrough): lực thấp -> bóng vào khoảng trống gần
    throughLeadMax: 95,      // x pitchScale (cuối file) · lực cao  -> bóng vào sâu
    throughBase: 0.35,        // chọc khe: mốc lực mặc định (chạm nhẹ = canh đúng nhịp; giữ vượt mốc = bóng nhanh hơn, through.overSpeed)
    throughAim: 0.65,         // chọc khe BỔNG có bấm hướng: 1 = bóng đi đúng đường mũi tên, 0 = điểm rơi ngay trước người nhận
                              // (theo hướng mũi tên). Ở giữa: người nhận kéo điểm rơi lệch ngang khỏi đường mũi tên (1 - throughAim)
    // CHỌC KHE W có người nhận (user 2026-11-01): xác định người nhận + HƯỚNG CHẠY của họ (đang chạy chỗ ai.runTo -> về đó; đang chạy ->
    // theo vận tốc; đứng yên -> lên phía khung đối phương). Điểm nhận = giao điểm của mũi tên người chơi (từ bóng) với đường chạy đó;
    // mũi tên không cắt (song song / chĩa ra sau) -> điểm trên đường chạy gần mũi tên nhất. Tốc độ bóng canh để bóng tới điểm nhận
    // đúng lúc người nhận chạy tới (Actions.throughMeet / passPlan); giữ lực vượt throughBase -> bóng nhanh hơn, tới trước rồi lăn tiếp vào sâu.
    //   runMin / runMax: (px) điểm nhận cách người nhận trên đường chạy, ngoài khoảng thì kẹp · lead: (px) không bấm hướng (AI / không mũi tên)
    //   runSpeed: tốc độ người nhận khi tính giờ (x tốc độ nước rút của họ) · react: (s) cộng thêm cho người nhận kịp tăng tốc
    //   minArrive: tốc độ bóng thấp nhất khi tới điểm nhận (x chỉ số pass) · overSpeed: giữ lực đầy -> bóng nhanh thêm ngần này
    //   movingMin: (px/s) người nhận chạy nhanh hơn mức này mới lấy hướng theo vận tốc · parallel: |sin góc| giữa 2 hướng dưới mức này = coi như song song
    through: { runMin: 24, runMax: 150, lead: 60,   // x pitchScale (cuối file)
       runSpeed: 0.95, react: 0.15, minArrive: 120, overSpeed: 0.5, movingMin: 30, parallel: 0.15,
       boost: 1.1 },   // boost: lực chọc khe x bấy nhiêu (bóng tới điểm nhận sớm hơn người chạy một chút)
    freeThroughArrive: 80,    // chọc khe vào khoảng trống (không có người nhận): bóng vẫn còn lực khi qua điểm rơi
    lobTimeMin: 0.45,         // chuyền bổng: thời gian bay (s) theo khoảng cách
    lobTimeMax: 1.0,
    // ĐỘ BỔNG THEO LỰC BẤM (user 2026-11-07: nhấn mạnh mà không bổng lắm): chuyền bổng / tạt cánh tới người nhận — thời gian bay (theo khoảng cách)
    // x lobLoft[0] (chạm nhẹ) -> lobLoft[1] (đầy lực). Đỉnh bóng ~ thời gian bay² -> nhẹ ~0.56x, đầy ~1.8x. Bóng vẫn rơi đúng chỗ người nhận
    // (giữ mạnh không còn làm bóng đi quá đà). AI (không có lực bấm): x 1
    lobLoft: [0.75, 1.35],
    angleWeight: 2.6,         // độ ưu tiên hướng phím khi chọn người nhận
    distWeight: 1.2,          // độ ưu tiên khoảng cách theo lực
    switchMargin: 0.35,       // chống nhảy mục tiêu liên tục khi đang nạp lực
    receiveRangeBonus: 5,     // người nhận đích danh khống chế bóng dễ hơn (px)
    receiveAssist: true,      // người nhận tự chủ động chạy tới điểm đón bóng (người chơi bấm hướng mới thì được giành quyền)
    // KHOÁ NGƯỜI NHẬN (user 2026-11-07: bóng tới mà người nhận chạy mất): đường chuyền chuẩn (không sloppy) tới mình -> người nhận LUÔN tự chạy đón,
    // mũi tên không kéo người đi nữa mà thành hướng chạm bóng đầu tiên (firstTouch). Thoát: skill (lướt). false = như cũ (bấm hướng mới là tự chạy)
    receiveLock: true,
    // CHẠM BÓNG ĐẦU TIÊN CÓ QUÁN TÍNH (user 2026-11-07: bóng thiếu độ nặng; Game.gainPossession -> Ball.follow): bóng tới nhanh hơn minSpeed px/s
    // không dừng chết ở chân mà trôi ra trước chân carry x (tốc độ − minSpeed) px/s (/ chỉ số dribble), hãm stop /s, rồi về chân settle /s;
    // xa thêm tối đa max px (x render.playerScale, cuối file). Hướng trôi: mũi tên lúc đón (người chơi; quay người theo luôn) · không bấm: hướng mặt,
    // trôi noArrow x (đỡ bóng dừng lại). Bóng còn trôi xa: người cầm chậm lại tới slow. Thủ môn bắt bóng của đối phương: không trôi
    firstTouch: { enabled: true, minSpeed: 120, carry: 0.7, stop: 10, settle: 5, max: 12, slow: 0.4, noArrow: 0.6 },
    // CHUYỀN 1 CHẠM (user 2026-10-30, ban bật): đang đón đường chuyền mà bấm S / W / A -> nhận bóng là chuyền luôn
    // (thả phím trước khi bóng tới = chuyền ngay lúc chạm, lực lý tưởng; còn giữ = nạp tiếp như thường).
    // Đường chuyền ra trong window s sau khi nhận bóng = bóng 1 chạm: tỉ lệ bị cắt x intercept
    oneTouch: { window: 0.35, intercept: 0.6, expire: 1.5 },
    // TRẢ BÓNG: vừa nhận đường chuyền của X trong window s, mũi tên không chỉ vào ai trong coneAngle
    // mà X nằm trong cone độ quanh mũi tên -> chuyền trả X (thay vì phát vào khoảng trống)
    returnPass: { window: 1.5, cone: 80 },

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
      // người chơi đang điều khiển: đường chuyền của đối phương chậm hơn mức này nhặt như bóng lỏng (Game.looseFor; user 2026-11-08).
      // Đường chuyền đã nảy đất / lăn qua điểm nhận thì ai cũng nhặt như bóng lỏng (Ball.spent)
      humanLoose: 180,
      failSlow: 0.8,          // trượt: bóng còn 80% tốc độ
      failDeflect: 0.25,      // trượt: bóng lệch ngẫu nhiên tối đa (rad, ~14°)
      retry: 0.4,             // trượt: giây người đó không chạm lại được bóng
      // cắt được mà bóng tới mạnh (>= block px/s, cả chuyền bổng; trừ thủ môn trong vòng cấm nhà): bóng dội ra khỏi người (Game.deflect, còn
      // blockKeep tốc độ, tối thiểu 80) thay vì dính chân — người cắt chạm lại được sau blockRetry giây, ai tới trước thì được. Chậm hơn: khống chế gọn như cũ
      block: 180,
      blockKeep: 0.3,
      blockRetry: 0.15,
      aiDelay: [0.45, 1.3],   // (s) AI (đội máy + đồng đội AI) cắt được đường chuyền / chặn được cú sút ngoài vòng cấm nhà:
                              //     vẫn rê bóng nhưng chưa chuyền / sút trong khoảng này (kèm chữ INTERCEPT)
      aiDelayMinSpeed: 100,   // (px/s) bóng chậm hơn mức này lúc cắt -> không tính (không khựng, không chữ INTERCEPT)
      aiDelayGoalDist: 105,   // (px tới khung đối phương) gần hơn mức này: đang khựng vẫn được sút (chỉ chưa chuyền) —
                              //     không thì AI rê thẳng tới vạch vôi rồi đứng chờ hết khựng, bị cướp lại bóng
    },
  },

  kick: {
    poseTime: 0.12,          // (s) giữ tư thế vung chân sút sau khi bóng rời chân (sút + phá bóng)
    // SÚT MẠNH (user 2026-11-01): thanh lực (lực thật, Actions.shotPower) qua powerPose lúc người chơi đang giữ phím (AI: định sút từ mức này) ->
    // tư thế lấy đà tới lúc sút: đang chạy = chạm đẩy bóng rồi bước nặng · đứng = thu chân powerWind giây rồi giữ, người run dần. Chỉ là hình:
    // di chuyển và lúc sút giữ nguyên (thả phím là sút ngay), trừ bóng của người chơi đang chạy nằm xa chân thêm powerPush. Cú sút từ mức này
    // trở lên (cả AI) diễn tư thế sút mạnh powerPoseTime giây
    powerPose: 0.6,
    powerWind: 0.25,
    powerPoseTime: 0.5,
    powerPush: 7,            // (px) người chơi đang chạy lấy đà: bóng cách chân thêm bao nhiêu (Ball.follow), giữ tới lúc sút
    powerPushK: 25,          // (1/s) bóng ra / về chỗ đó nhanh cỡ nào: 25 = ~0.12 s
    shotMinSpeed: 380,       // tốc độ bóng ứng với thanh lực 0% (300 -> 350, user 2026-10-25: cú sút nhẹ đi quá chậm · 380, 2026-10-30)
    shotMaxSpeed: 560,       // 460 -> 560 (2026-10-30): sút đầy lực phải là quả đại bác, nhanh hơn hẳn chuyền (pass.maxSpeed)
    chargeTime: 0.8,         // giây để đầy lực
    // Thanh lực bắt đầu từ mức nhỏ theo khoảng cách tới khung thành (gần -> shotBaseNear, xa -> shotBaseFar),
    // giữ D để nạp dần lên. Để 0 thì thanh luôn bắt đầu từ rỗng.
    shotBaseNear: 0.1,
    shotBaseFar: 0.25,
    shotBaseNearDist: 60,    // px tới khung thành
    shotBaseFarDist: 240,
    // Chạm nhẹ D (người chơi điều khiển): bóng chậm hơn mức đầu thanh lực, theo chỉ số SHOOTING (stats.power).
    // Giữ thêm tới shotTapWindow thì tăng dần về lực của thanh (giữ lâu hơn: y như cũ; AI không bị ảnh hưởng).
    // Chạm nhẹ ~ SHO 60: 216 · 70: 243 · 80: 270 · 90: 297 · 99: 322 px/s
    // Đầu thanh (lực mặc định ~0.1) ~ SHO 60: 299 · 80: 398 · 99: 494 · đầy lực ~ 60: 420 · 80: 560 · 99: 694
    shotTapSpeed: 270,       // (px/s) chạm nhẹ ở SHOOTING 80 (hệ số 1.0) — 220 -> 270 (2026-10-25)
    shotTapScale: 0.8,       // tốc độ chạm nhẹ đổi theo chỉ số: x (1 + (power − 1) x mức này)
    shotTapWindow: 0.25,     // (0..1 phần thanh đã giữ) 0 = chạm nhẹ, từ mức này trở lên = lực của thanh; 0 = tắt
    // Giữ quá lâu -> bóng bay cao, lệch. Thanh đầy (1) rồi còn overGrace mới tính là quá đà (đủ thời gian phản xạ thả phím);
    // tới maxOvercharge thì tự sút. Phần quá đà = charge − 1 − overGrace (0..0.25)
    maxOvercharge: 1.45,
    overGrace: 0.2,          // (phần thanh) ~0.16s ở chargeTime 0.8
    // ĐỘ BỔNG theo khoảng cách (user 2026-10-30: gồng lâu bóng vẫn sà sát đất, không bay bổng như PES):
    // lực nhỏ = bóng sệt (vz shotLiftMin). Từ loftFrom trở lên bóng vồng dần, tới đầy lực thì bóng qua vạch vôi
    // ở độ cao shotLoft x xà (field.goalHeight) dù đứng xa hay gần; quá đà nâng dần (bình phương) tới overLoft x xà ở mức tự sút
    // (quá đà ít: sát xà · quá đà hết cỡ: vọt xà)
    // 2026-11-07 (user: nhấn mạnh mà không bổng lắm): bổng tăng đều theo lực từ sớm hơn — loftFrom 0.35 -> 0.15, loftPow 1.3 -> 0.5
    // (độ cao ~ vz², nên mũ 0.5 cho đỉnh bóng tăng gần tuyến tính theo lực), shotLoft 0.8 -> 0.9 (đầy lực qua vạch vôi sát xà hơn)
    shotLiftMin: 10,
    loftFrom: 0.15,
    loftPow: 0.5,
    shotLoft: 0.9,
    overLoft: 1.45,
    shotLiftCap: 240,        // vz tối đa (sút sát khung / rất xa không vọt lên trời)
    shotSpread: 0.08,        // rad
    // HỖ TRỢ NHẮM SÚT (user 2026-10-31: bàn phím chỉ có 8 hướng -> chỉ sút thẳng / chéo 45°), chỉ người chơi: mũi tên lên / xuống chọn
    // phía khung (thành phần dọc >= side), thẳng / không bấm = phía thủ môn để trống hơn; máy chọn điểm trong khung theo SHOOTING
    // (accuracy acc[0] -> acc[1]): cách cột inset[0] -> inset[1] px, kéo hướng sút về điểm đó strength[0] -> strength[1] (1 = trúng điểm),
    // sai số nhân spread[0] -> spread[1]. Sút xe đạp (LEGEND) tự nhắm riêng, không qua đây
    assist: { enabled: true, side: 0.3, acc: [0.75, 1.2], inset: [15, 4], strength: [0.5, 0.95], spread: [1, 0.8] },
    // Hướng sút = hướng phím giữ lúc thả, giới hạn trong khung thành (không giữ phím -> sút vào giữa khung).
    // Hướng phím chỉ ra ngoài khung thành -> tư thế gượng: sai số thêm tăng dần theo góc lệch ra ngoài cột dọc
    awkwardSpread: 0.15,     // rad sai số thêm tối đa (cũng chia cho accuracy)
    awkwardMinAngle: 15,     // (độ) lệch ra ngoài cột dọc dưới mức này: không bị phạt
    awkwardMaxAngle: 90,     // (độ) lệch từ mức này trở lên (vd. sút song song vạch vôi / quay lưng): phạt tối đa
    overchargeSpread: 0.5,
    // Phá bóng: nhấn D khi cầm bóng ở phần sân nhà (kiểu FC Online) — bóng bổng, luôn đi về phía trước
    clearance: false,        // TẮT: D ở sân nhà vẫn là sút bình thường (bật = true để dùng lại phá bóng)
    clearSpeed: 290,         // x pitchScale (cuối file) · px/s theo phương ngang (nhân chỉ số power)
    clearLift: 120,          // vz ban đầu -> bay ~0.57s, chạm đất ở ~155px, lăn tổng ~340px
    clearAngle: 0.8,         // ↑/↓ lệch góc phá bóng tối đa (~39°)
    clearSpread: 0.2,        // rad sai số ngẫu nhiên
    // Phất bóng lên trời (thủ môn AI ôm bóng, ai.gkPunt): bóng vọt cao qua đầu mọi người, rơi xuống điểm đã chọn thành bóng lỏng
    puntLift: 260,           // vz ban đầu -> bay ~1.24s, cao ~80px (không ai chạm được tới lúc rơi)
    puntError: 20,           // (px) điểm rơi lệch ngẫu nhiên tối đa
  },

  // KỸ THUẬT NÂNG CAO (user 2026-10-25, cho người chơi hardcore, không có bài hướng dẫn) — tổ hợp phím lúc đang nạp (Human.update):
  //   switch + shoot = SÚT CỨA LÒNG · shoot rồi bấm skill = SÚT BỔNG (chip) · đang nạp sút / chuyền bổng bấm pass = SÚT GIẢ ·
  //   đang nạp chọc khe bấm skill = CHỌC KHE BỔNG. AI không tự dùng 4 kỹ thuật này, chỉ phản ứng (bị lừa sút giả, thủ môn bị lob); AI đeo LEGEND dùng kỹ thuật LEGEND (legends.ai)
  technique: {
    // cứa lòng: tốc độ x speed, sai số x spread; bóng xuất phát chệch ra ngoài bend/2 rad rồi cong vào (tổng cong bend rad tới vạch vôi)
    finesse: { speed: 0.84, spread: 0.5, bend: 1.0 },   // bend 0.55 -> 1.0 (user 2026-10-25: xoáy chưa đủ)
    // sút bổng: bay timeMin..timeMax s theo khoảng cách (nạp đầy: nhanh hơn x(1 − quick)), rơi tới điểm sau vạch vôi depth px ở độ cao landZ (xà = field.goalHeight),
    // sai số x spread. Thủ môn đứng cách vạch vôi quá offLine px mà bóng đã bay qua đầu (nằm sau lưng): chỉ với được bóng thấp hơn behindCatchZ
    // (thủ môn bám vạch vẫn bắt được — sút bổng để trị thủ môn lao ra)
    // (user 2026-10-25: bóng phải vồng thật cao — bay 1.25..1.6s, đỉnh ~90..145px)
    chip: { timeMin: 1.25, timeMax: 1.6, quick: 0.2, landZ: 20, depth: 0, spread: 1.6, behindCatchZ: 9, offLine: 18 },
    // thủ môn AI đọc đường cong của cú cứa lòng theo shotAccuracy (Elo): 0 = đoán như bóng đi thẳng, 1 = đoán đúng đường cong
    finesseRead: 1,
    // sút giả: đối thủ AI trong range px phía trước khựng freeze s (mỗi người miễn nhiễm immune s); thủ môn AI đổ người theo hướng giả
    // với xác suất biteBase − shotAccuracy x biteAcc (Elo thấp dễ bị lừa). Hồi cooldown s.
    // Diễn: gồng windup s (đứng, bóng dưới chân) -> vung chân (đối thủ cắn câu lúc này) -> lướt nhẹ glideTime s với glideSpeed px/s
    // theo hướng phím (không giữ phím: bước ngang tránh người đứng gần nhất), bóng dính chân
    fake: { range: 85, freeze: 0.45, immune: 1.5, cooldown: 0.8, biteBase: 1.1, biteAcc: 0.6, windup: 0.12, swing: 0.14, glideTime: 0.2, glideSpeed: 190 },
    // chọc khe bổng: điểm rơi = điểm chọc khe thường + lead px (âm = nông hơn: bóng bổng bay lâu, người nhận cần kịp tới), bay timeMin..timeMax s
    // theo khoảng cách (cao hơn chuyền bổng thường pass.lobTimeMin..Max — user 2026-10-25: phải vồng cao qua đầu)
    lobThrough: { lead: -15, timeMin: 0.9, timeMax: 1.3 },
  },

  // DỨT ĐIỂM 1 CHẠM (Actions.firstTime): bóng đang tới mình (đường chuyền nhắm mình / bóng lỏng lăn về phía mình) -> giữ D để
  // "chờ đá": thanh lực nạp dần trong lúc bóng bay tới, thả D = chốt lực. Bóng chạm người là đá luôn, không khống chế
  // (người chơi còn giữ D lúc bóng sát đất chạm người: khống chế, nạp tiếp, thả D mới sút — Game.strike).
  // Kiểu cú đá theo độ cao bóng lúc chạm: sát đất = sút 1 chạm · ngang hông (volleyZ) = vô-lê · ngang đầu (headerZ) = đánh đầu.
  // Không bấm D: nhận bóng như cũ.
  firstTime: {
    enabled: true,
    incomingTime: 1.3,     // (s) bóng tới trong khoảng này mới tính là "đang tới mình"
    incomingDist: 24,      // (px) đường bóng đi qua cách mình dưới mức này
    armTime: 1.8,          // (s) chờ quá lâu mà bóng chưa tới -> huỷ
    missTime: 0.25,        // (s) bóng không còn hướng về mình chừng này -> huỷ
    reach: 8,              // thử sân to (2026-11-07): 7 -> 8 bù bóng nhỏ · (px) tầm chạm bóng tính từ mép người + bóng (khống chế thường: ball.pickupRange)
    volleyZ: 7,            // (px) bóng cao từ mức này: vô-lê
    headerZ: 17,           //      từ mức này: đánh đầu (nhảy lên)
    maxZ: 34,              //      cao hơn mức này: với không tới
    // đánh đổi của sút 1 chạm: sai số x spread; bóng tới càng nhanh càng khó (từ fastFrom px/s, thêm tới +fastSpread sau fastRange px/s)
    spread: 1.3, fastFrom: 200, fastRange: 300, fastSpread: 0.5,
    // bóng bị đổi hướng gắt (thủ môn phải dịch người): trừ tỉ lệ bắt bóng tối đa redirectGk, từ redirectMin° tới redirectMax°
    redirectGk: 0.2, redirectMin: 30, redirectMax: 100,
    volley: { power: 1.08, spread: 1.8, lift: 1.4, pose: 0.22 },   // mạnh, dễ lệch, dễ vọt xà
    // đánh đầu: tốc độ theo thanh lực (nhân chỉ số SHOOTING), chúc xuống (vz âm) -> bóng nảy khó bắt; gk = trừ thêm tỉ lệ bắt
    // BẬT NHẢY (user 2026-10-30: cú đánh đầu phải thấy rõ): đang chờ đá mà bóng sẽ tới ở độ cao đánh đầu trong lead s -> bật nhảy
    // trước khi chạm (đỉnh nhảy ~ lúc bóng tới): cả cú nhảy dài pose s, cao hop px, đang nhảy với thêm được jumpZ px (firstTime.maxZ)
    header: { speedMin: 250, speedMax: 340, spread: 0.8, vz: -70, gk: 0.08, pose: 0.5, hop: 14, lead: 0.22, jumpZ: 8 },
    hitStop: 0.04,         // vô-lê / đánh đầu chạm bóng: khựng cục bộ (người + bóng)
    // TẠT CÁNH: chuyền bổng (A) từ hành lang cánh ở 1/3 sân đối phương tới đồng đội gần khung -> bóng tới trước mặt người nhận
    // ở độ cao ngang đầu (z) thay vì rơi xuống chân
    cross: {
      zone: 0.58,          // người tạt đã vượt mốc này (tỉ lệ sân, tính từ khung nhà)
      wide: 50,            // x pitchScale (cuối file) · (px) cách trục giữa sân theo chiều ngang ít nhất chừng này (sân rộng 246, vòng cấm rộng 140)
      boxDist: 150,        // (px) người nhận cách khung đối phương dưới mức này
      z: 20,               // (px) độ cao bóng khi tới điểm đón
      timeMin: 0.55, timeMax: 0.9,   // (s) thời gian bay theo quãng đường
      lead: 0.9,           // đón đầu theo hướng chạy của người nhận
      runDepth: 42,        // AI: người BĂNG lên chạy vào điểm cách khung chừng này (px) khi đồng đội đang ở cánh
      runSide: 16,         //     lệch về cột xa (px)
    },
    // AI quyết định 1 lần cho mỗi quả bóng (theo độ hăng của độ khó)
    ai: {
      range: 170,          // (px tới khung) trong tầm này mới sút 1 chạm / đánh đầu
      oneTouchChance: 0.5,   // đường chuyền sệt / chọc khe tới chân, đường sút thoáng
      headerChance: 0.85,  // quả tạt
      headerPassChance: 0.55,   // ĐÁNH ĐẦU CHUYỀN: đường chuyền bổng tới mình (ngoài tầm sút / không phải quả tạt) -> đánh đầu chuyền tiếp
      clearChance: 0.5,    // hậu vệ phá quả tạt của đối phương
      // ĐÁNH ĐẦU CẢN CÚ SÚT (user 2026-11-07): cú sút của đối phương bay về khung nhà, tới chỗ cầu thủ AI (ngoài vòng cấm giữ khung) ở trên
      // tầm khống chế -> chance: chạy vào đường bóng, bật nhảy đánh đầu. Chạm bóng ở độ cao đánh đầu: phá ra (lực charge) với xác suất
      // win - (tốc độ bóng - freeSpeed) / speedPenalty (không dưới min), không thì trượt (bóng qua đầu). Hiệu ứng Core (sét, lửa...) vẫn như cũ
      block: { chance: 0.8, win: 0.85, freeSpeed: 300, speedPenalty: 600, min: 0.35, charge: [0.5, 0.8] },
      crossChance: 0.45,   // mỗi lần ra quyết định khi đang ở cánh + có đồng đội trong vòng cấm
      wingChance: 0.6,     // cầm bóng ở cánh gần 1/3 cuối: tỉ lệ đi bóng dọc biên chờ tạt thay vì cắt vào giữa (quyết định 1 lần mỗi lần có bóng)
      charge: [0.5, 1],
    },
  },

  // Phòng ngự (đội mình không có bóng): D = LIGHT ATTACK (đấm), A = HARD ATTACK (vung chân đá).
  // Mỗi đòn có cooldown riêng, hiển thị trên thanh kỹ năng ở giữa đáy màn hình.
  combat: {
    // D — LIGHT ATTACK: cú đấm thẳng, ra đòn gần như tức thì, tầm ngắn, choáng ngắn, cooldown ngắn
    light: {
      cooldown: 1.2,          // 1.0 -> 1.2 (user 2026-10-31: đấm nhau loạn, bóng đổi chân liên tục)
      startup: 0.07,          // (s) kéo tay lấy đà trước khi nắm đấm chạm (anim: tay lùi về)
      recover: 0.2,           // (s) khựng sau cú đấm (anim: tay duỗi thẳng rồi thu về)
      lunge: 90,              // nhoài người về trước khi đấm (px/s)
      range: 17,              // tầm đấm tính từ mép người (px) — Core: tackleRange
      arc: 70,                // (độ) nửa góc vùng đấm phía trước mặt
      stun: 0.7,              // (s) choáng khi đấm trúng người không cầm bóng (gấp đôi 0.35, 2026-10-11: tỉnh lại quá nhanh)
      knockback: 150,
      stealChance: 0.6,       // tỉ lệ làm người cầm bóng rơi bóng (x chỉ số tackle / dribble đối thủ, Core: tackleChance); trượt -> chỉ đẩy lùi
      // Đấm rơi bóng: người bị đấm choáng lâu hơn (đấm người không có bóng vẫn là stun ở trên) để người đấm kịp lấy bóng
      stealStun: 1.4,         // (s) gấp đôi 0.7 cùng lúc với stun
      instantSteal: 0.3,      // tỉ lệ bóng về thẳng chân người đấm; còn lại bóng bật về phía người đấm (lệch sang bên), người bị đấm văng hướng ngược lại
      stealBallSpeed: 70,     // (px/s) tốc độ bóng bật ra
      stealBallAngle: [20, 50], // (độ) bóng lệch sang trái / phải so với hướng về người đấm
      // Đấm cướp được bóng: chưa sút ngay được (chống bấm D liên tục = đấm xong sút luôn). Chỉ chặn sút — chuyền / lướt vẫn được,
      // buff sau khi cướp bóng (Core Counter Attack: 3.5s) vẫn kịp dùng
      stealShotLock: 0.35,    // (s) sau khi có bóng chưa sút được; D đang giữ từ cú đấm phải thả ra rồi bấm lại
      stealShotWindow: 0.8,   // (s) nhặt bóng bật ra trong khoảng này sau cú đấm cướp bóng cũng tính
      // CHỐNG ĐẤM LOẠN (user 2026-10-31), áp dụng như nhau cho người chơi và AI:
      // đấm hụt (không trúng ai / bị né): hồi chiêu thêm cooldown s + khựng recover s (thay light.recover) -> vung bừa là bị phạt
      whiff: { cooldown: 0.6, recover: 0.4 },
      // đấm dồn: ra đòn trong window s kể từ lúc vừa hồi chiêu xong = 1 nấc, mỗi nấc cộng add s vào hồi chiêu (tối đa max nấc);
      // chờ quá window s mới đấm thì về 0
      chain: { window: 1.0, add: 0.4, max: 3 },
      // vừa giành được bóng từ đội kia (đấm rơi, cắt bóng...): chừng này giây cú đấm thường không làm rơi bóng (chỉ đẩy lùi, HOLD).
      // Đòn chắc chắn rơi bóng (Nắm Đấm Khổng Lồ, Phản Đòn, Thiết Quyền, Long Quyền) vẫn cướp được
      stealGuard: 0.8,
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
      stun: 1.6,              // choáng (tính từ lúc tiếp đất, combat.airStunPause) — bay ~0.6s trước đó (gấp đôi 0.8, 2026-10-11)
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
    // THỦ MÔN AI đọc cú sút (user 2026-10-25: trước đây đoán đúng tuyệt đối điểm bóng qua vạch -> chạm mọi cú sút, sút góc vô nghĩa).
    // Mỗi cú sút: chờ (reactBase + reaction × reactMul) giây mới bắt đầu chạy theo; đoán quãng phải di chuyển lệch ±(errBase + (1 − shotAccuracy) × errMul)
    // (tỉ lệ: sút thẳng vào người thì gần như không lệch, sút góc mới dễ đoán hụt — đổ người quá đà / chưa tới).
    // reaction / shotAccuracy lấy từ độ khó AI (Main Path / Story: theo Elo đối thủ) -> Elo thấp chậm + đoán lệch nhiều, Elo cao gần chuẩn
    // stretchMove: lao ngang chừng này px để bắt = vươn tối đa (player.gkStretchPenalty) -> cú sút góc khó bắt kể cả khi đọc đúng
    keeper: { reactBase: 0, reactMul: 0.15, errBase: 0.05, errMul: 0.25, stretchMove: 140 },
    supportAhead: 70,
    restDefenseFrom: 0.5,     // đồng đội cầm bóng vượt mốc này (tỉ lệ sân, 0.5 = giữa sân) -> người còn lại lùi chốt phía sau
    restDefenseDist: 110,     // x pitchScale (cuối file) · đứng sau người cầm bóng bao xa (px)
    markDistance: 26,
    // 3v3: chia vai khi đồng đội cầm bóng (vị trí thấp nhất CHỐT, cao nhất BĂNG lên, ở giữa dạt CÙNG cánh)
    // anchorBack: người CHỐT đứng sau bóng restDefenseDist x hệ số này khi bóng còn ở phần sân nhà (qua giữa sân: x1) ·
    // runnerAhead / wideAhead: người BĂNG / người DẠT đứng trước bóng supportAhead x hệ số này
    // flex (user 2026-11-07): thủ môn đứng nhà (keeperHome) -> 3 người chỉ còn 1 người hỗ trợ, người đó tự chọn DẠT / BĂNG (AI.flexSupport):
    // chấm điểm chỗ đứng 2 vai (như openSpot) mỗi every s, vai cũ giữ nếu vai kia hơn chưa tới keep điểm, runnerBias = điểm cộng cho BĂNG (âm = thích DẠT)
    support3: { anchorBack: 0.55, runnerAhead: 1.4, wideAhead: 0.4, flex: { every: 1.5, keep: 6, runnerBias: 0 } },
    // ĐIỂM ĐỨNG HỖ TRỢ (user 2026-10-30: đồng đội đứng chết theo điểm cố định): quanh điểm theo vai trò ở trên thử dirs hướng x các
    // bán kính radius (px), chấm điểm = độ thoáng đường chuyền từ bóng (tối đa laneCap px) x lane + khoảng cách tới đối phương gần nhất
    // (tối đa spaceCap px) x space − độ lệch khỏi điểm vai trò x drift. Tính lại mỗi every s; chỗ cũ chỉ bị thay khi chỗ mới hơn keep điểm
    openSpot: { radius: [28, 52],   // x pitchScale (cuối file)
      dirs: 8, every: 0.4, lane: 1.0, laneCap: 30, space: 0.4, spaceCap: 60, drift: 0.35, keep: 4 },
    // CHẠY CHỖ (user 2026-10-30): đồng đội AI chạy nước rút tới 1 điểm trong time s (p.ai.runT / runTo; đồng đội của người chơi có mũi tên
    // báo hiệu trên đầu). Mỗi người cân nhắc every s một lần, chance = tỉ lệ mỗi lần cân nhắc
    runs: {
      every: 0.3,
      // vừa chuyền xong: băng lên phía trước ahead px, dạt side px tránh đối phương gần nhất (đi-trả / ban bật).
      // Người chuyền còn ở 1/3 sân nhà (tiến độ < minProgress, 0 = khung nhà) thì không chạy (giữ chốt)
      giveGo: { chance: 0.75, time: 1.0, ahead: 80, side: 30, minProgress: 0.3 },
      // người BĂNG: người cầm bóng quay mặt lên (cos góc >= faceCos) ở tiến độ progress -> chạy sau lưng hậu vệ cuối depth px
      // (không quá vạch cách khung goalGap px)
      behind: { chance: 0.45, time: 1.3, depth: 36, goalGap: 50, faceCos: 0.4, progress: [0.25, 0.85], cooldown: 2.0 },   // 0.3 -> 0.45 (2026-11-01)
      // CHẠY CHỒNG BIÊN (người DẠT; user 2026-11-07: phải là đồng đội đã ra cánh rồi mới vòng ra mở góc để băng):
      // người cầm bóng ở cánh (cách trục giữa > wing x chiều ngang sân), tiến độ trong progress, quay mặt lên (faceCos); người DẠT không đứng
      // trước người đó quá level px và cách <= maxDist px -> chặng 1 vòng ra làn ngoài (cách người cầm bóng out px về phía biên; biên còn chưa tới
      // minRoom px thì vòng vào trong) tới điểm sau lưng người cầm bóng back px, chặng 2 băng thẳng lên trước người đó ahead px. time = cả 2 chặng.
      // hold: lúc chưa chạy, người DẠT đứng sau lưng người cầm bóng back px, vào trong inside px (góc chuyền về, chỗ xuất phát), không đứng chồng ở biên
      overlap: { chance: 0.45, time: 1.7, wing: 0.22, progress: [0.25, 0.8], faceCos: 0.3, level: 10, maxDist: 150,
        back: 18, out: 30, minRoom: 18, ahead: 110, cooldown: 2.5, hold: { back: 34, inside: 44 } },
      // MỞ ĐƯỜNG CHUYỀN (user 2026-11-01): người cầm bóng quay mặt về phía mình (cos góc >= faceCos, cách <= maxDist px) -> chạy nước rút
      // vào khoảng trống: thử các điểm cách dist px theo các góc angles (độ, 0 = thẳng lên khung đối phương), chọn điểm có đường chuyền
      // từ người cầm bóng thoáng nhất (lane, kẹp laneCap px) + xa đối phương (space, kẹp spaceCap) + tiến lên (fwd / px). goalGap: không
      // chạy quá vạch cách khung ngần này. Người CHỐT (vị trí thấp nhất, 3v3) không chạy
      lane: { chance: 0.6, time: 1.0, faceCos: 0.6, maxDist: 220, dist: [60, 100], angles: [-75, -40, 0, 40, 75],
        lane: 1.0, laneCap: 36, space: 0.4, spaceCap: 60, fwd: 0.15, goalGap: 40, cooldown: 1.6 },
    },
    keeperCoverDist: 420,     // x pitchScale (cuối file) · đội máy: người cầm bóng đối phương cách khung thành nhà dưới mức này -> người gần khung nhất lùi về trông khung
    // ĐÁ LÙI ĐỘI MÁY GIỮ KHUNG (user 2026-11-07: DEF bot hay bỏ khung lên kèm người, người chơi ở nhà gồng sút xa là vào):
    // true = đội máy không cầm bóng (đối phương giữ bóng / bóng lỏng) thì người giữ khung (Game.canKeep) luôn trông khung, mọi khoảng cách
    // (keeperCoverDist bỏ qua). Chỉ rời khung khi đội mình cầm bóng tấn công. Không áp cho đội 1 người, Skill game, đồng đội AI của người chơi
    keeperStay: true,
    // ĐÁ LÙI AI CỦA NGƯỜI CHƠI VỀ KHUNG KHI MẤT BÓNG (user 2026-11-07): mates = true -> đội người chơi không cầm bóng (đối phương giữ bóng /
    // bóng lỏng) thì đồng đội AI giữ khung (Game.canKeep) lập tức về trông khung ở mọi khoảng cách (mateKeeperCoverDist, keeperPressDist,
    // helpPress bỏ qua cho người này), không đuổi bóng lỏng ngoài vòng cấm. Chỉ lao ra tắc khi người cầm bóng đã vào vùng zone px quanh khung nhà,
    // cách mình dưới engage px (hoặc hậu vệ cuối, ai.lastMan) VÀ chưa có đồng đội nào (kể cả người chơi) đứng cách người cầm bóng dưới marked px
    // marked dùng cho cả người giữ khung đội máy (AI.goalkeeper): người cầm bóng gần khung đã có đồng đội kèm thì đứng trên vạch, không bước ra
    keeperRecover: { mates: true, zone: 150, engage: 40, marked: 36 },
    // THỦ MÔN AI LUÔN Ở KHUNG (user 2026-11-07): người giữ khung (Game.canKeep) do AI điều khiển — đội máy (keeperStay) và đồng đội AI của
    // người chơi (keeperRecover.mates) — ưu tiên trông khung + cản phá, kể cả lúc đội mình cầm bóng tấn công (không lên CHỐT sau lưng bóng):
    // home = true -> đội mình cầm bóng thì đứng trước vạch tối đa depth px (x pitchScale), dịch ngang theo bóng (track), không nhận chạy chỗ.
    // rush: phần sân nhà không còn đồng đội nào khác đứng được (ra ngoài phần sân nhà / đang choáng) mà người cầm bóng đối phương đã vào
    // phần sân nhà, cách khung nhà dưới dist px (x pitchScale) -> lao lên KICKDOWN (Hard attack) khi người đó trong tầm kick px
    // (mỗi lần ra quyết định: xác suất kickChance, không thì đấm nhẹ khi sát người). null = tắt
    // step (user 2026-11-07: DEF ở nhà quá nhiều lúc tấn công -> thiếu người phối hợp): đội mình cầm bóng thì người giữ khung (thay cho home)
    // dâng lên làm CHỐT sau lưng bóng (restDefenseDist x support3.anchorBack như người CHỐT 3 người), là phương án chuyền về, nhưng không
    // vượt quá maxX (tỉ lệ chiều dài sân tính từ vạch nhà; 0.5 = giữa sân) và không chạy chỗ. Mất bóng: keeperStay / keeperRecover kéo về khung.
    // mates / bots: áp cho đồng đội AI của người chơi / đội máy. null = tắt (đứng nhà như home)
    keeperHome: { home: true, depth: 40, track: 0.5, rush: { dist: 260, kick: [14, 46], kickChance: 0.85 },
      step: { mates: true, bots: true, maxX: 0.45 } },
    // NGƯỜI CẦM BÓNG ĐỨNG YÊN (user 2026-11-07: bot không lấy được bóng của người chơi đứng yên — chỉ 1 bot áp sát, đấm thưa, đa số HOLD).
    // Người cầm bóng chạy chậm hơn speed px/s liên tục time s = đứng yên -> đội máy: thêm 1 người áp sát (vẫn trừ người giữ khung),
    // người áp sát phản ứng nhanh hơn (x react), đấm với tỉ lệ ít nhất lightChance, gồng Hard x hardMult; cú đấm của AI trúng người đứng yên
    // làm rơi bóng x stealMul (shared/systems/actions.js lightHit)
    stillCarrier: { speed: 30, time: 0.6, react: 0.6, lightChance: 0.85, hardMult: 2, stealMul: 1.6 },
    mateKeeperCoverDist: 300, // x pitchScale (cuối file) · như trên, cho đồng đội AI ĐÁ LÙI của người chơi (sân rộng 528px: 420 -> trông khung ~64% thời gian phòng ngự, 220 -> ~17%)
    // NÉ LUẬT SÂN (user 2026-10-31, AI.avoid; vùng từ MatchMods.hazards): AI đội bị luật nhắm nhìn trước look s theo hướng đang chạy, sắp bước
    // vào vùng (cách mép dưới margin px) thì trượt dọc mép vùng; đang đứng trong vùng thì chạy thẳng ra; vùng sắp trúng (hit) mà còn
    // đứng trong thì lướt ra với xác suất dash mỗi giây (lướt trúng lúc đòn tới = né, Actions.dodged)
    avoid: { look: 0.4, margin: 4, dash: 4 },
    // HẬU VỆ CUỐI (user 2026-10-31): đồng đội AI của người chơi đang lùi về trông khung mà người cầm bóng đã tới trong engage px và
    // không còn đồng đội nào (kể cả người chơi) đứng gần khung hơn người cầm bóng quá slack px -> lao vào tắc luôn, không chạy về khung.
    // Đã lao vào thì giữ tới keep x engage px (không đổi ý chạy về khung giữa chừng)
    lastMan: { engage: 110, keep: 1.5, slack: 4 },
    keeperPressDist: 110,     // x pitchScale (cuối file) · đồng đội AI ĐÁ LÙI: chưa tới mateKeeperCoverDist mà người chơi cách người cầm bóng xa hơn mức này -> lên áp sát (không thì kèm người)
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
    // thủ môn AI ôm bóng (cả đội máy lẫn đồng đội AI): thay vì chuyền, phất bóng lên trời rơi xuống phía trên thành bóng lỏng
    // (kick.puntLift). Hay dùng khi người nhận đang gặp nguy (đối phương áp sát, nhất là ở phần sân nhà) để không đẩy đồng đội vào thế mất bóng. null = tắt
    gkPunt: {
      chance: 0.15,           // người nhận an toàn: thỉnh thoảng vẫn phất cho đa dạng
      dangerChance: 0.85,     // người nhận gặp nguy (hoặc không có ai để chuyền)
      markDist: 30,           // (px) đối phương cách người nhận dưới mức này = gặp nguy
      ownHalfMarkDist: 55,    // (px) như trên khi người nhận còn ở phần sân nhà (mất bóng ở đó là bị phản công ngay)
      dist: [180, 290],       // x pitchScale (cuối file) · (px) điểm rơi cách thủ môn theo hướng tấn công
      edge: 30,               // (px) điểm rơi cách biên dọc tối thiểu
      tries: 12,              // số điểm rơi thử: chọn chỗ đồng đội tới trước đối phương rõ nhất
      noise: 30,              // (px) ngẫu nhiên cộng vào điểm số mỗi chỗ (không phất mãi một chỗ)
    },
    // BÓNG BẬT BẤT NGỜ (user 2026-10-25: trước đây AI đổi hướng đúng khung hình bóng bật ra -> luôn tranh được bóng bật ra từ thủ môn).
    // Bóng lỏng đổi hướng đột ngột không do ai đá (thủ môn đẩy ra, chạm người, dội tường): mỗi cầu thủ AI giữ nguyên hướng chạy cũ
    // (reactBase + reaction × reactMul + khoảng cách tới bóng × distMul + ngẫu nhiên 0..reactRand) giây, rồi mới đuổi theo với
    // hướng bóng đoán lệch ±(errBase + (1 − shotAccuracy) × errMul) rad, đoán chuẩn dần trong errFade giây. null = tắt
    scramble: {
      turn: 0.6,              // (rad) hướng bóng đổi quá mức này trong 1 khung hình = bật bất ngờ
      minSpeed: 40,           // (px/s) bóng chậm hơn: không tính
      reactBase: 0.08, reactMul: 0.8, reactRand: 0.08,
      distMul: 0.0006,        // (s/px) càng xa bóng phản ứng càng muộn (100px: +0.06s)
      errBase: 0.2, errMul: 0.8, errFade: 0.5,
    },
    // ÁP SÁT ĐỂ ĐOẠT BÓNG (user 2026-10-30: AI mất bóng chạy về nhưng không lao vào đánh người cầm bóng)
    press: {
      // PHẢN PRESSING: vừa mất bóng, cầu thủ AI của đội mất bóng cách người vừa có bóng dưới counterDist px -> lao vào đánh lấy lại
      // trong counterTime s (không lùi trông khung / kèm người), phản ứng nhanh hơn (x counterReact), tỉ lệ đấm x counterPunch
      counterTime: 1.6, counterDist: 80, counterReact: 0.6, counterPunch: 1.4,
      // người cầm bóng đi vào trong engage px của cầu thủ AI đang kèm người / lùi về -> lao vào đánh luôn
      // (chỉ khi ít hơn maxPressers đồng đội đang ở gần người cầm bóng hơn mình — không cả đội bu vào)
      engage: 36, maxPressers: 2,
      // người áp sát: chạy nước rút khi cách hơn sprintDist px hoặc người cầm bóng đang chạy nhanh hơn walkSpeed px/s
      // (trước đây chỉ chạy nước rút khi cách > 36px -> người cầm bóng chạy là bỏ lại)
      sprintDist: 12, walkSpeed: 60,
      // bị vượt qua (đứng sau người cầm bóng, xa khung nhà hơn): đuổi thẳng tới chỗ người cầm bóng sẽ tới sau chaseLead s, đấm từ sau lưng
      chaseLead: 0.2,
      // 2026-10-30 (user: act 1 bot tranh bóng quá gắt): mọi mức trên nhân theo k = aggression / fullAt (kẹp 0..1) của AI —
      // counterTime x k, engage x k, counterReact / counterPunch / sprintDist nội suy từ mức thường tới mức trên, walkSpeed / k.
      // aggression act 1 ~0.35–0.75 -> áp sát nhẹ; từ Area giữa trở lên (aggression >= 1) như cũ
      fullAt: 1.0,
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

  fx: {
    // LƯỚI RUNG (user 2026-11-07, Renderer.netShake, chỉ phía vẽ): bóng chui vào lưới -> lưới phồng quanh chỗ chạm rồi rung tắt dần.
    // biên độ (px) = tốc độ bóng x ampPerSpeed, kẹp trong amp · freq (Hz) rung · decay (s) tắt dần · time (s) tổng · spread (px) độ loang dọc lưới
    netShake: { ampPerSpeed: 0.012, amp: [2, 6], freq: 7, decay: 0.32, time: 1.3, spread: 16 },
    shakeGoal: 5, shakeHit: 2, shakeShot: 2,   // shakeShot 1.5 -> 2 (2026-11-07: cú sút nặng hơn)
    // HITSTOP CỤC BỘ (giây): chỉ người ra đòn + người trúng đòn (sút: người sút + bóng) khựng lại, cả sân vẫn chạy.
    // Khác Game.hitStop (đứng hình cả trận, dành cho Tuyệt kỹ) -> 3v3 online đấm nhau liên tục không bị giật cả sân. 0 = tắt
    hitStop: {
      smash: 0.08,     // Hard attack trúng người (SMASH!)
      punch: 0.035,    // Light attack trúng người (~2 frame)
      shot: 0.05,      // sút mạnh: bóng "dính" chân một nhịp rồi mới bay
      shotMin: 0.9,    //   thanh lực từ mức này trở lên mới khựng
      // ĐỘ NẶNG CÚ ĐÁ (user 2026-11-07: bóng chưa có độ nặng): cú sút dưới shotMin cũng khựng shotLow -> shot theo lực;
      // chuyền khựng pass[0] -> pass[1] theo tốc độ bóng / pass.maxSpeed (1 frame ~ 0.017). 0 = tắt
      shotLow: 0.025,
      pass: [0.012, 0.03],
    },
    // bóng rất nhanh (px/s, cú sút mạnh): vẽ thêm vệt tốc độ sau bóng (chỉ hình ảnh, src/render/renderer.js -> ballTrail)
    speedLines: 420,
    // bóng dễ thấy (thử sân to 2026-11-07, src/render/renderer.js): bóng nhỏ đi nên cần chỉ dấu
    ball: {
      // vệt: kéo từ mép sau bóng ngược hướng bay (vận tốc hiện tại, gồm bay lên / rơi xuống). Hiện từ minSpeed; dài = tốc độ x time[0..1]
      // (minSpeed .. full), tối đa maxLen px; dày 2 px ở nửa đầu khi nhanh hơn thick; màu theo loại cú đá (Ball.kind)
      trail: { minSpeed: 110, full: 460, time: [0.035, 0.06], maxLen: 30, thick: 300, alpha: [0.3, 0.75],
        colors: { pass: '255,255,255', clear: '255,255,255', shot: '255,225,79' } },
      // dư ảnh khi bóng trên không (cao từ minZ px): bóng mờ ở vị trí ages giây trước, độ mờ alpha. turn: điểm cũ lệch hướng bay hiện tại
      // (cos góc dưới mức này) thì bỏ -> dội / bị chạm không còn dư ảnh đường cũ. maxAge: giữ lịch sử bao lâu
      ghosts: { minZ: 8, ages: [0.06, 0.12], alpha: [0.32, 0.15],   // 3 -> 2 dư ảnh, mờ hơn (user 2026-11-07: hơi lố)
        turn: 0.85, maxAge: 0.25 },
      // vòng dưới đất khi bóng lỏng (không ai giữ, sát đất, chậm hơn maxSpeed): bán kính r ± pulse, nhịp rate /s
      ring: { r: 5, pulse: 1, rate: 3, alpha: 0.55, maxSpeed: 200, color: '255,255,255' },
      // vẽ đè bóng lần 2 sau mọi người / VFX ở độ mờ này: bóng không bị che thì không đổi (cùng màu), bị che thì hiện xuyên
      xray: 0.6,
      // cỡ bóng khi VẼ = đường kính lõi (px, + viền mực 1 px mỗi bên), va chạm theo ball.radius. Lẻ hay chẵn đều được (chẵn: tâm giữa 2 px).
      // user 2026-11-07: 3 nhỏ quá, 5 vẫn hơi nhỏ, 6 -> 7 = cỡ gốc (9 px cả viền); người to lên thay (render.playerScale)
      size: 7,
      // BÓNG BẸP lúc chạm chân (2026-11-07, chỉ hình, src/render/sprites.js): tốc độ bóng đổi đột ngột hơn delta px/s (đá đi / nhận bóng nhanh)
      // -> time giây bóng bẹt theo hướng bay (dài thêm 2 px, mỏng đi 2 px). 0 = tắt
      squash: { delta: 170, time: 0.06 },
    },
    // CẢM GIÁC CHẠY (chỉ hình ảnh / âm thanh ở máy vẽ, src/render/renderer.js -> runFeel; online khách cũng thấy)
    run: {
      sprint: 105,       // (px/s) chạy nhanh hơn mức này = đang chạy nước rút (đi bộ 86, nước rút ~129)
      lean: 1,           // (px) nghiêng thân + đầu theo hướng chạy ngang khi chạy nước rút. 0 = tắt
      sprintHold: 0.25,  // (s) bước sải nước rút (render/player/sprint.js) giữ thêm chừng này sau lần cuối đang chạy nước rút: AI bật / tắt gần như mỗi khung
      viewHold: 0.05,    // (s) chạy / đứng thường: góc nhìn, lật trái phải, đứng / chạy mới phải giữ chừng này mới vẽ (hướng / tốc độ AI giật 1–3 khung)
      stride: 0.17,      // (s) mỗi bước chạy nước rút tung 1 nhúm bụi nhỏ
      // (px/s²) đang chạy nước rút mà giảm tốc / bẻ lái ngược hướng mạnh hơn mức này -> tung bụi trượt
      // (thả phím: giảm tốc 950 · quay ngược ~720 · rẽ vuông góc ~510 -> không tính)
      brake: 650,
      stepVolume: 0.5,   // tiếng bước chân khi chạy nước rút, chỉ cầu thủ mình điều khiển (0 = tắt; nhân với âm lượng SFX)
      dust: ['#e0d4bc', '#b4a892'],
    },
    // CHỮ BẬT RA trên sân (Effects.pop, vẽ ở src/render/vfx.js -> pops): loại chữ quyết định cỡ / viền / bóng / chuyển động (đồng bộ mọi nơi);
    // màu do người gọi truyền (giữ màu riêng từng chữ, user chốt 2026-10-18), không truyền thì dùng color ở đây.
    // px = cỡ chữ pixel (Press Start) · lw = độ dày viền · shadow = bóng đổ (px) · t = giây hiện · rise = bay lên (px/s)
    // pop = phóng to lúc hiện (1 = bắt đầu x2 rồi thu về) · tilt = nghiêng (đổi chiều luân phiên) · wobble = lắc lư · color = màu mặc định (null = màu trường phái)
    popups: {
      kinds: {
        info:   { px: 7,  lw: 2, shadow: 1, t: 0.9, rise: 18, pop: 0,   tilt: 0,    color: '#9aa3b5' },   // phản hồi trung tính: MISS, HOLD, INTERCEPT, TINK
        res:    { px: 8,  lw: 2, shadow: 1, t: 0.9, rise: 18, pop: 0,   tilt: 0,    color: '#ffd23f' },   // tài nguyên / số đếm: +ULT, chuỗi chuyền, lượt còn lại
        good:   { px: 10, lw: 4, shadow: 1, t: 0.8, rise: 12, pop: 0.5, tilt: 0,    color: '#9dff3d' },   // phòng thủ thành công: SAVE!, DODGE!, PARRY, READ
        status: { px: 10, lw: 4, shadow: 1, t: 0.8, rise: 10, pop: 0.5, tilt: 0, wobble: 0.12, color: '#ff8ac0' },   // chuyện xảy ra với người đó: SLIP!, STONE!, HUH?
        move:   { px: 10, lw: 4, shadow: 1, t: 0.8, rise: 10, pop: 0.6, tilt: 0,    color: null },        // tên chiêu Core / Tuyệt kỹ: màu trường phái
        light:  { px: 10, lw: 4, shadow: 1, t: 0.5, rise: 10, pop: 1,   tilt: 0.12, color: '#ffffff' },   // tiếng va chạm nhẹ: POW!, BONK!, ZZT!
        heavy:  { px: 13, lw: 4, shadow: 1, t: 0.6, rise: 10, pop: 1,   tilt: 0.1,  color: '#ffe14f' },   // va chạm mạnh: SMASH!, CRASH!, KAPOW!
        huge:   { px: 17, lw: 5, shadow: 2, t: 0.8, rise: 10, pop: 1,   tilt: 0.1,  color: '#ff3d5a' },   // va chạm cực mạnh: KABOOM!, BONK!!
        // câu nói trong trận của đối thủ FOOTBALL STORY (shared/systems/matchmods.js): bong bóng thoại trắng, chữ tối; color = màu viền (áo đội)
        talk:   { px: 6,  lw: 0, shadow: 0, t: 1.9, rise: 4,  pop: 0.3, tilt: 0,    color: '#1a1216', bubble: true },
      },
      // chữ mới chạm chữ đang có (theo khung chữ thật, kể cả của người đứng cạnh) -> đẩy chữ cũ lên thay vì chồng lên nhau / xoá bớt
      stackPad: 2,     // (px) khoảng hở giữa 2 chữ xếp chồng
      max: 24,         // an toàn: quá số này mới bỏ chữ cũ nhất (bình thường không bao giờ chạm)
      // BỚT CHỮ CHO SỰ KIỆN NHỎ (user 2026-11-01: trận quá loạn với người mới): các chữ này không hiện nữa (âm thanh / hiệu ứng vẫn giữ).
      // MISS = đòn hụt · HOLD = đấm mà không rơi bóng · INTERCEPT = AI cắt bóng · TINK = đấm vào người có giáp · POW! = cú đấm thường trúng ·
      // BONK! = người bị đánh dội tường · +ULT = được thêm năng lượng · TOO EARLY / TOO LATE = Đọc Cú Sút hụt.
      // Giữ: '!' báo Hard attack (tín hiệu để né), SAVE / DODGE / PARRY / READ, va chạm mạnh (tên chiêu / trạng thái đã tắt theo loại: hideKinds bên dưới)
      hide: ['MISS', 'HOLD', 'INTERCEPT', 'TINK', 'POW!', 'BONK!', '+ULT', 'TOO EARLY', 'TOO LATE'],
      // TẮT CẢ LOẠI CHỮ (user 2026-11-01: giới hạn chữ trên sân): mọi chữ thuộc các kind này không hiện (âm thanh / hiệu ứng vẫn giữ).
      // Còn hiện: res (số đếm) · good (SAVE / DODGE / PARRY / READ) · heavy · huge
      hideKinds: ['info', 'status', 'move', 'light', 'talk'],
      // ngoại lệ: các chữ này vẫn hiện dù loại của nó đã tắt. '!' = báo Hard attack (tín hiệu để né)
      keep: ['!'],
    },
  },

  // Đệm phím (giây): bấm đấm (D) / Hard (A) / lướt (Z) hơi sớm (đang khựng sau đòn, còn vài frame hồi chiêu)
  // thì phím được giữ chừng này, hết khựng là ra đòn ngay thay vì bị nuốt mất. 0 = tắt
  input: { buffer: 0.13 },

  // ĂN MỪNG BÀN THẮNG (shared/systems/celebrate.js, vẽ ở src/render/celebrate-draw.js): người ghi bàn diễn động tác trong slot
  // costume 'cel' (progression.config.js, bán trong Hộp Ăn Mừng); đồng đội chạy tới chúc mừng. Phản lưới nhà: không ăn mừng.
  // botWeights: cầu thủ AI / người chơi giả bốc 1 động tác theo độ hiếm (default = động tác mặc định), giữ nguyên cả trận.
  // runSpeed / slideSpeed: px/s khi chạy về khán đài / trượt gối · mateSpeed: đồng đội chạy tới · mateGap: đứng cách người ghi bàn
  celebration: {
    botWeights: { default: 4, common: 6, rare: 3, epic: 1.4, legendary: 0.6, mythic: 0.2 },
    runSpeed: 95, slideSpeed: 150, mateSpeed: 0.7, mateGap: 22,
    // máy quay (src/render/renderer.js -> goalCam): phóng to zoom lần bám người ghi bàn sau delay giây, vào trong in giây,
    // trả về toàn sân trong out giây cuối. lift: khung nhìn nhích lên trên chân người bao nhiêu px (thấy cả đạo cụ trên đầu)
    camera: { zoom: 2, delay: 0.15, in: 0.45, out: 0.35, lift: 14 },
  },
};

// THỬ SÂN TO: áp pitchScale lên khung trận, sân và các số theo chiều dài sân (giá trị ở trên là gốc, pitchScale 1).
// Số theo khung thành (tầm sút), tầm đấm và Core giữ nguyên; khoảng cách bóng - chân và tầm khống chế bóng theo cỡ người (render.playerScale). Bỏ thử nghiệm: xoá khối này + pitchScale
(function () {
  const G = SFC_CONFIG.game, k = G.pitchScale || 1;
  if (k === 1) return;
  const kw = 1 + (k - 1) * 0.75;              // chiều rộng sân to chậm hơn chiều dài (1,2 -> 1,15)
  const even = (v) => 2 * Math.round(v / 2), r = Math.round, mul = (a, f) => a.map((v) => r(v * f));
  const R = G.render, F = G.field, P = G.pass, A = G.ai;
  // khung trận + sân: giữa khung theo chiều ngang. Chiều dọc: chỗ trống ngoài sân + tường trên (46) + viền dưới (18) chia cho trên / dưới
  // đúng tỉ lệ sân gốc (34 : 16) -> chiều rộng sân to chậm hơn khung cũng không dồn hết phần thừa xuống dưới (dải đất trống, user 2026-11-07)
  const W0 = R.width, H0 = R.height, above = F.y - 46, below = H0 - F.y - F.h - 18;
  R.width = even(W0 * k); R.height = even(H0 * k); R.maxView = R.maxView.map((v) => even(v * k));
  F.w = even(F.w * k); F.h = even(F.h * kw); F.x = r((R.width - F.w) / 2);
  F.y = 46 + r((R.height - F.h - 46 - 18) * above / (above + below));
  // tốc độ: tăng ít hơn sân (chạy x 1/4, chuyền x 0,7, phá bóng x 1/2 phần tăng) -> qua sân lâu hơn nhưng không lê thê
  G.player.speed = r(G.player.speed * (1 + (k - 1) * 0.25));
  P.maxSpeed = r(P.maxSpeed * (1 + (k - 1) * 0.7));
  G.kick.clearSpeed = r(G.kick.clearSpeed * (1 + (k - 1) * 0.5));
  // khoảng cách theo chiều dài sân
  P.maxDist = r(P.maxDist * k); P.freeMaxDist = r(P.freeMaxDist * k); P.throughLeadMax = r(P.throughLeadMax * k);
  P.through.runMax = r(P.through.runMax * k); P.through.lead = r(P.through.lead * k);
  A.restDefenseDist = r(A.restDefenseDist * k); A.openSpot.radius = mul(A.openSpot.radius, k);
  A.runs.lane.maxDist = r(A.runs.lane.maxDist * k); A.runs.lane.dist = mul(A.runs.lane.dist, k);
  { const O = A.runs.overlap; for (const key of ['level', 'maxDist', 'back', 'ahead']) O[key] = r(O[key] * k); O.hold.back = r(O.hold.back * k);
    O.out = r(O.out * kw); O.minRoom = r(O.minRoom * kw); O.hold.inside = r(O.hold.inside * kw); }   // chạy chồng biên: dọc x k, ngang x kw
  A.keeperCoverDist = r(A.keeperCoverDist * k); A.mateKeeperCoverDist = r(A.mateKeeperCoverDist * k); A.keeperPressDist = r(A.keeperPressDist * k);
  A.gkPunt.dist = mul(A.gkPunt.dist, k);
  if (A.keeperHome) { A.keeperHome.depth = r(A.keeperHome.depth * k); if (A.keeperHome.rush) A.keeperHome.rush.dist = r(A.keeperHome.rush.dist * k); }
  // theo chiều rộng sân
  G.firstTime.cross.wide = r(G.firstTime.cross.wide * kw);
  // THỂ LỰC (user 2026-11-07: sân rộng hơn -> nước rút lâu hơn, hồi nhanh hơn): tiêu hao / pitchScale (30 -> 21), hồi x kw (32 -> 42)
  G.player.staminaDrain = r(G.player.staminaDrain / k); G.player.staminaRegen = r(G.player.staminaRegen * kw);
  // DẪN BÓNG (user 2026-11-07: người to + sân to -> bóng nảy ra xa chân hơn tương ứng): khoảng cách bóng - chân + nhịp chạm theo cỡ người
  // (render.playerScale, 6 -> 8, nước rút 9 -> 12, chạm mỗi 30 -> 39 px), độ nảy ra mỗi nhịp chạm khi nước rút theo cỡ sân (3 -> 4)
  const kp = R.playerScale || 1, B = G.ball, DR = B.dribble;
  B.dribbleOffset = r(B.dribbleOffset * kp); DR.sprintOffset = r(DR.sprintOffset * kp); DR.tapEvery = r(DR.tapEvery * kp);
  DR.tapLead = r(DR.tapLead * k);
  P.firstTouch.max = r(P.firstTouch.max * kp);   // chạm bóng đầu tiên: bóng trôi xa chân theo cỡ người
  // tầm khống chế bóng theo cỡ người (user 2026-11-08: 7 -> 9 px, cao 15 -> 20 px — bóng ngang hông / sát chân người to mà không chạm được)
  B.pickupRange = r(B.pickupRange * kp); B.pickupHeight = r(B.pickupHeight * kp);
})();
