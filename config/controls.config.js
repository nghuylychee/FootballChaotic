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
    skill:   ['KeyZ', 'Pad.RT'],   // Skill move / lướt né
    switch:  ['KeyQ', 'Pad.LB'],   // Đổi cầu thủ

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
    reroll:  ['KeyR', 'Pad.Y'],     // màn chọn Core: đổi cả 3 lá (mỗi lượt 1 lần)
  },

  // Bảng hướng dẫn hiển thị trong menu / pause
  help: {
    attack: [
      ['← ↑ ↓ →', 'Move'],
      ['E (hold)', 'Sprint'],
      ['S', 'Ground pass · arrow at a teammate = accurate'],
      ['W (hold)', 'Through ball'],
      ['A (hold)', 'Lob pass'],
      ['D (hold)', 'Shoot · arrow = shot direction'],
      ['Z', 'Skill move (dodge)'],
      ['X', 'Ultimate (when fully charged)'],
    ],
    defense: [
      ['D', 'Light attack (punch)'],
      ['A', 'Hard attack (dropkick)'],
      ['W (hold in own box)', 'Catch the shot · release as they kick'],
      ['Z', 'Dash'],
    ],
    teammateHasBall: [
      ['S / W', 'Call for the ball (short/through)'],
      ['D / A', 'Light / Hard attack still work'],
    ],
    system: [
      ['1 / 2 / 3', 'Pick Core'],
      ['R', 'Reroll 3 Core cards (once per round)'],
      ['Esc / P', 'Pause'],
      ['M', 'Mute/unmute'],
    ],
  },

  // Bảng hướng dẫn khi đang dùng tay cầm: {action} = nhãn nút của action đó, {move} = cần analog / D-pad
  padHelp: {
    attack: [
      ['{move}', 'Move'],
      ['{sprint} (hold)', 'Sprint'],
      ['{pass}', 'Ground pass · stick at a teammate = accurate'],
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
    system: [
      ['{move} + {confirm}', 'Pick Core'],
      ['{reroll}', 'Reroll 3 Core cards (once per round)'],
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
    pause:    { atk: 'Pause' },
    mute:     { atk: 'Mute / unmute' },
  },

  // Cần analog trái: deadzone (bỏ qua rung tay), ngưỡng bật / tắt hướng số (menu, gửi online)
  stick: { deadzone: 0.2, digitalOn: 0.5, digitalOff: 0.35 },

  // Rung tay cầm theo âm thanh trận đấu: [rung nhẹ 0..1, rung mạnh 0..1, ms]. Xóa dòng để tắt từng loại.
  // Lưu ý: rung với mọi cầu thủ (cả đối thủ sút / trúng đòn), không chỉ cầu thủ của bạn.
  rumble: {
    enabled: true,
    kick:   [0.35, 0.6, 110],   // sút (mạnh theo lực)
    hit:    [0.5, 0.9, 160],    // trúng đòn
    tackle: [0.3, 0.4, 80],
    punch:  [0.3, 0.4, 80],     // Light attack trúng người
    windup: [0.3, 0.4, 80],     // Hard attack gồng
    clang:  [0.6, 0.3, 120],    // chạm cột / xà
    goal:   [0.7, 1.0, 450],
    read:   [0.8, 0.5, 140],    // Đọc Cú Sút thành công (thủ thế W rồi thả đúng lúc)
  },
};
