/* =========================================================
 * VIEW CONFIG — phần cấu hình chỉ máy người chơi dùng: vẽ, âm thanh, chữ bật ra trên sân, máy quay ăn mừng, nhịp màn giới thiệu.
 * Máy chủ trận riêng KHÔNG nạp file này (scripts/manifest.js) -> sửa số ở đây không phải tăng phiên bản máy chủ (npm run server:bump).
 * Khung giống hệt đường dẫn code đọc: view.game.fx.popups -> SFC_CONFIG.game.fx.popups. src/engine/config-client.js gộp vào lúc nạp
 * rồi xoá SFC_CONFIG.view, nên code luôn đọc SFC_CONFIG.game... / SFC_CONFIG.intro... như cũ. Thêm số mới: thêm vào đúng nhánh, không cần code.
 * Chỉ để ở đây số mà code máy chủ nạp (shared/) không đọc. Số máy chủ cần (render.width / height / maxView / playerScale: shared/engine/config.js
 * tính sân từ đó; fx.shake* / fx.hitStop: lệnh hiệu ứng của máy chủ gửi kèm số cho khách) ở lại game.config.js.
 * ========================================================= */
window.SFC_CONFIG = window.SFC_CONFIG || {};

SFC_CONFIG.view = {
  game: {
    render: {
      // khung #stage (menu, HUD, mọi UI DOM): giữ 640 x 360 như cũ, giãn theo cửa sổ tới maxView
      ui: { width: 640, height: 360, maxView: [880, 512] },
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

    fx: {
      // LƯỚI RUNG (user 2026-11-07, Renderer.netShake, chỉ phía vẽ): bóng chui vào lưới -> lưới phồng quanh chỗ chạm rồi rung tắt dần.
      // biên độ (px) = tốc độ bóng x ampPerSpeed, kẹp trong amp · freq (Hz) rung · decay (s) tắt dần · time (s) tổng · spread (px) độ loang dọc lưới
      netShake: { ampPerSpeed: 0.012, amp: [2, 6], freq: 7, decay: 0.32, time: 1.3, spread: 16 },
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
        // bóng vừa vào chân: chỉ khi VẼ, bóng lướt từ chỗ chạm về chân trong time giây (Renderer.ballView; user 2026-11-09: bóng nhảy 1 khung).
        // Lệch dưới minDist px: khỏi lướt · trên maxDist px: Core / giao bóng dời bóng đi xa, đặt thẳng
        snap: { time: 0.08, minDist: 3, maxDist: 45 },
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
      // Máy chủ không có khối này: Effects.pop ở đó không giữ chữ (khách online nhận lệnh pop qua sync.js rồi tự lọc / vẽ theo khối này)
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

    celebration: {
      // máy quay ăn mừng bàn thắng (src/render/renderer.js -> goalCam): phóng to zoom lần bám người ghi bàn sau delay giây, vào trong in giây,
      // trả về toàn sân trong out giây cuối. lift: khung nhìn nhích lên trên chân người bao nhiêu px (thấy cả đạo cụ trên đầu)
      camera: { zoom: 2, delay: 0.15, in: 0.45, out: 0.35, lift: 14 },
    },
  },

  // MÀN GIỚI THIỆU 2 ĐỘI (src/ui/intro.js): nhịp hiện + nội dung thẻ. Số máy chủ đọc (enabled, modes, duration, outro, onlineWait) ở intro.config.js
  intro: {
    skipAfter: 0.35,        // chặn bấm nhầm: chưa cho bỏ qua trong khoảng đầu

    // nhịp xuất hiện (motion review 2026-11-06, phương án A: chiếu trước mọi trận -> hiện đủ trong 0.5s, 1 nhịp; trước đây 11 nhịp lẻ tới 2.55s).
    // Độ dài từng phần ở css/style.css (.in-*); docs/ux-motion/README.md
    teamIn: 0.05,           // 2 đội (tên, luật sân, thẻ cầu thủ) trượt vào
    vsAt: 0.15,             // chữ VS đập xuống
    cardsAt: 0.3,           // thẻ cầu thủ đầu tiên hiện (owner 2026-11-07: thẻ lại hiện lần lượt từng thẻ)
    cardGap: 0.22,          // khoảng cách giữa các thẻ (xen kẽ trái / phải; 0 = cùng lúc)
    statsAt: 0.2,           // thanh chỉ số chạy
    statGap: 0,             // khoảng cách giữa các hàng chỉ số
    pitchAt: 0.2,           // sơ đồ đội hình + tên sân hiện, chấm cầu thủ chạy vào vị trí
    dotGap: 0,              // khoảng cách giữa các chấm cầu thủ
    dotTime: 0.3,           // mỗi chấm chạy bao lâu

    // animation sprite trên thẻ cầu thủ
    runIn: 0.55,            // chạy vào (chạy tại chỗ, nhìn vào giữa) rồi quay mặt ra
    poseEvery: 2.4,         // cứ mỗi bấy nhiêu giây tạo dáng 1 lần (FWD: vung chân sút, DEF: tung cú đấm)
    poseTime: 0.35,

    // chỉ số so sánh (key trong stats của đội) + nhãn
    stats: [['speed', 'SPD'], ['power', 'PWR'], ['pass', 'PAS'], ['tackle', 'PHY'], ['dribble', 'DRI'], ['accuracy', 'SHO']],
    // OVR = trung bình chỉ số x ovrScale (1.0 -> 80), giới hạn 1..99. Thanh chỉ số: statMin -> 0%, statMax -> 100%
    ovrScale: 80,
    statMin: 0.7,
    statMax: 1.3,
  },
};
