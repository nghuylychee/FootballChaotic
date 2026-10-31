/* =========================================================
 * CONTROLS CONFIG — phím điều khiển (tham chiếu FC Online, full bàn phím + tay cầm).
 * Dùng KeyboardEvent.code: https://developer.mozilla.org/docs/Web/API/KeyboardEvent/code
 * Tay cầm: 'Pad.<nút>' theo vị trí nút trên tay Xbox (PlayStation: A=✕ B=○ X=□ Y=△ LB=L1 RB=R1 LT=L2 RT=R2):
 *   A B X Y LB RB LT RT Back Start LS RS · Up Down Left Right (D-pad) · StickUp/Down/Left/Right (analog trái)
 * Mỗi action có thể gán nhiều phím.
 * ========================================================= */
window.SFC_CONFIG = window.SFC_CONFIG || {};

SFC_CONFIG.controls = {
  bindings: {
    up:      ['ArrowUp', 'Pad.Up', 'Pad.StickUp'],
    down:    ['ArrowDown', 'Pad.Down', 'Pad.StickDown'],
    left:    ['ArrowLeft', 'Pad.Left', 'Pad.StickLeft'],
    right:   ['ArrowRight', 'Pad.Right', 'Pad.StickRight'],
    sprint:  ['KeyE', 'Pad.RB'],

    // Tấn công            | Phòng ngự
    pass:    ['KeyS', 'Pad.A'],    // Chuyền sệt tự động | —
    through: ['KeyW', 'Pad.Y'],    // Chọc khe           | ĐỌC CÚ SÚT (trong vòng cấm nhà: giữ, thả đúng lúc đối phương sút)
    lob:     ['KeyA', 'Pad.B'],    // Chuyền bổng        | HARD ATTACK (gồng rồi vung chân đá bay đối thủ)
    shoot:   ['KeyD', 'Pad.X'],    // Sút (giữ để nạp) · sân nhà + còn đối phương phía trước: phá bóng | LIGHT ATTACK (đấm)
    skill:   ['KeyQ', 'Pad.RT'],   // Skill move / lướt né · đang nạp sút: SÚT BỔNG · đang nạp chọc khe: CHỌC KHE BỔNG (game.technique)
    switch:  ['KeyZ', 'Pad.LB'],   // giữ khi nạp sút: SÚT CỨA LÒNG (game.technique) · không cầm bóng: đổi cầu thủ (mọi trận hiện khoá 1 cầu thủ)
    // kỹ thuật LEGEND (GOAT PATH, config/legends.config.js). Tay cầm không có nút riêng: power = skill + switch, trick = switch
    // (cùng lúc giữ sprint; tổ hợp xử lý ở human.js — mỗi LEGEND chỉ 1 kỹ thuật nên không lẫn)
    power:   ['KeyF'],             // giữ khi nạp sút: POWER SHOT (Balotello)
    trick:   ['KeyC'],             // giữ khi nạp sút: TRIVELA (Carloss) · chạy nhanh khi dẫn bóng + bấm: BRUISER RUN (Haalandroid)

    pause:   ['Escape', 'KeyP', 'Pad.Start'],
    confirm: ['Enter', 'Space', 'Pad.A'],
    back:    ['Backspace', 'Pad.B'],
    pick1:   ['Digit1', 'Numpad1'],
    pick2:   ['Digit2', 'Numpad2'],
    pick3:   ['Digit3', 'Numpad3'],
    mute:    ['KeyM', 'Pad.Back'],
    restart: ['KeyR', 'Pad.Y'],     // túi đồ: phân rã toàn bộ đồ trùng (giữ 1)
    dismantle: ['KeyX', 'Delete', 'Pad.X'], // túi đồ / mở hộp: phân rã món đang chọn
    ultimate: ['KeyX', 'Pad.LT'],    // trong trận: TUYỆT KỸ (khi thanh năng lượng đầy)
    reroll:  ['KeyR', 'Pad.Y'],     // màn DRILL: đổi cả 3 drill · màn chọn Core: đổi cả 3 lá (khi cores.draft.rerollsPerRound > 0)

    // phím menu riêng: đổi phím trong trận không làm đổi điều hướng menu
    tabPrev: ['KeyQ', 'Pad.LB'],    // đổi tab sang trái (PLAY, cửa hàng, đội)
    tabNext: ['KeyE', 'Pad.RB'],    // đổi tab sang phải
    filter:  ['KeyZ', 'Pad.RT'],    // túi đồ: đổi bộ lọc
    equip:   ['KeyE', 'Pad.RB'],    // mở hộp: mặc đồ vừa ra
  },

  // ĐỔI PHÍM (SETTINGS > CONTROLS, lưu ở Settings.binds): action trong trận người chơi tự gán, mỗi thiết bị 1 phím / nút.
  // Phím menu (confirm, back, tabPrev...) cố định. Tay cầm: di chuyển luôn là cần analog / D-pad
  remap: {
    // switch: phím cứa lòng (giữ + sút, game.technique) — đổi người không dùng vì mọi trận hiện khoá người chơi vào 1 cầu thủ
    kb:  ['up', 'down', 'left', 'right', 'sprint', 'pass', 'through', 'lob', 'shoot', 'skill', 'switch', 'ultimate', 'power', 'trick'],
    pad: ['sprint', 'pass', 'through', 'lob', 'shoot', 'skill', 'switch', 'ultimate'],
    reserved: ['pause', 'mute'],   // phím của các action này không gán cho action khác được (vẫn dùng trong trận)
    // phím không cho gán: Ctrl / Alt / Meta (tổ hợp phím của trình duyệt, vd. Ctrl+W đóng tab), Tab, F1-F12, Esc
    blocked: /^(Control|Alt|Meta|OS|ContextMenu|Tab|CapsLock|Escape|F\d+$|NumLock|ScrollLock|Pause|PrintScreen)/,
    padButtons: ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'LS', 'RS'],
  },

  // Bảng hướng dẫn hiển thị trong menu / pause (bàn phím). {action} = phím đang gán cho action đó (theo phím người chơi đã đổi),
  // {action+} = mọi phím của action ('Esc / P'), {move} = cụm phím hướng
  help: {
    attack: [
      ['{move}', 'Move'],
      ['{sprint} (hold)', 'Sprint'],
      ['{pass} (hold)', 'Ground pass'],
      ['{through} (hold)', 'Through ball'],
      ['{lob} (hold)', 'Lob pass'],
      ['{shoot} (hold)', 'Shoot · arrow = shot direction'],
      ['{skill}', 'Skill move (dodge)'],
      ['{ultimate}', 'Ultimate (when fully charged)'],
    ],
    defense: [
      ['{shoot}', 'Light attack (punch)'],
      ['{lob}', 'Hard attack (dropkick)'],
      ['{through} (hold in own box)', 'Catch the shot · release as they kick'],
      ['{skill}', 'Dash'],
    ],
    teammateHasBall: [
      ['{pass} / {through}', 'Call for the ball (short/through)'],
      ['{shoot} / {lob}', 'Light / Hard attack still work'],
    ],
    // KỸ THUẬT NÂNG CAO (game.technique): chỉ liệt kê, không có bài hướng dẫn
    advanced: [
      ['{switch} + {shoot}', 'Finesse shot · curls into the corner'],
      ['{shoot} (hold) + {skill}', 'Chip shot · beats a keeper off his line'],
      ['{shoot} / {lob} (hold) + {pass}', 'Fake shot'],
      ['{through} (hold) + {skill}', 'Lobbed through ball'],
    ],
    system: [
      ['{pick1} / {pick2} / {pick3}', 'Pick Core'],
      ['{reroll}', 'Reroll 3 Core cards (once per round)'],
      ['{pause+}', 'Pause'],   // CrazyGames: Esc bị gỡ (Platform.restrictedKeys) -> chỉ còn P
      ['{mute}', 'Mute/unmute'],
    ],
  },

  // Bảng hướng dẫn khi đang dùng tay cầm: {action} = nhãn nút của action đó, {move} = cần analog / D-pad
  padHelp: {
    attack: [
      ['{move}', 'Move'],
      ['{sprint} (hold)', 'Sprint'],
      ['{pass} (hold)', 'Ground pass'],
      ['{through} (hold)', 'Through ball'],
      ['{lob} (hold)', 'Lob pass'],
      ['{shoot} (hold)', 'Shoot · stick = shot direction'],
      ['{skill}', 'Skill move (dodge)'],
      ['{ultimate}', 'Ultimate (when fully charged)'],
    ],
    defense: [
      ['{shoot}', 'Light attack (punch)'],
      ['{lob}', 'Hard attack (dropkick)'],
      ['{through} (hold in own box)', 'Catch the shot · release as they kick'],
      ['{skill}', 'Dash'],
    ],
    teammateHasBall: [
      ['{pass} / {through}', 'Call for the ball (short/through)'],
      ['{shoot} / {lob}', 'Light / Hard attack still work'],
    ],
    advanced: [
      ['{switch} + {shoot}', 'Finesse shot · curls into the corner'],
      ['{shoot} (hold) + {skill}', 'Chip shot · beats a keeper off his line'],
      ['{shoot} / {lob} (hold) + {pass}', 'Fake shot'],
      ['{through} (hold) + {skill}', 'Lobbed through ball'],
    ],
    system: [
      ['{move} + {confirm}', 'Pick Core'],
      // ['{reroll}', 'Reroll 3 Core cards (once per round)'],   // tạm bỏ đổi bài Core (cores.draft.rerollsPerRound = 0)
      ['{pause}', 'Pause'],
      ['{mute}', 'Mute/unmute'],
    ],
  },

  // Settings > Controls: chú thích từng nút trên hình tay cầm / bàn phím.
  // atk = khi đội mình giữ bóng / đang tấn công · def = khi phòng ngự (bỏ trống nếu giống atk hoặc không có)
  legend: {
    move:     { atk: 'Move' },
    sprint:   { atk: 'Sprint' },
    pass:     { atk: 'Ground pass' },
    through:  { atk: 'Through ball', def: 'Catch the shot (in box)' },
    lob:      { atk: 'Lob pass', def: 'Hard attack · dropkick' },
    shoot:    { atk: 'Shoot', def: 'Light attack · punch' },
    skill:    { atk: 'Skill move', def: 'Dash' },
    ultimate: { atk: 'Ultimate' },
    switch:   { atk: 'Finesse (+ Shoot)' },
    pause:    { atk: 'Pause' },
    mute:     { atk: 'Mute / unmute' },
  },

  // Cần analog trái: deadzone (bỏ qua rung tay), ngưỡng bật / tắt hướng số (menu, gửi online)
  // 'Tap2.<mã phím>' = bấm đúp phím đó trong doubleTap giây (vd. lướt = bấm đúp phím chạy nhanh E)
  doubleTap: 0.3,

  // navHold: menu đọc cần analog thành 4 hướng; hướng đang bật giữ nguyên tới khi cần lệch quá 45° + navHold độ
  // (rung tay quanh góc chéo không nhảy sang hướng bên cạnh)
  stick: { deadzone: 0.2, digitalOn: 0.5, digitalOff: 0.35, navHold: 15 },

  // Rung tay cầm theo âm thanh trận đấu: [rung nhẹ 0..1, rung mạnh 0..1, ms]. Xóa dòng để tắt từng loại.
  // Lưu ý: rung với mọi cầu thủ (cả đối thủ sút / trúng đòn), không chỉ cầu thủ của bạn.
  rumble: {
    enabled: true,
    kick:   [0.35, 0.6, 110],   // sút (mạnh theo lực)
    header: [0.45, 0.55, 100],  // đánh đầu (dứt điểm 1 chạm)
    hit:    [0.5, 0.9, 160],    // trúng đòn
    tackle: [0.3, 0.4, 80],
    punch:  [0.3, 0.4, 80],     // Light attack trúng người
    windup: [0.3, 0.4, 80],     // Hard attack gồng
    clang:  [0.6, 0.3, 120],    // chạm cột / xà
    goal:   [0.7, 1.0, 450],
    read:   [0.8, 0.5, 140],    // Đọc Cú Sút thành công (thủ thế W rồi thả đúng lúc)
  },

  // phím cửa hàng cấm dùng: config/platform.config.js rules[].restrictedKeys (Input.init gỡ khỏi mọi action;
  // CrazyGames: Esc = thoát toàn màn hình -> tạm dừng / quay lại chỉ còn P / Backspace)
};
