/* =========================================================
 * CONTROLS CONFIG — phím điều khiển (tham chiếu FC Online, full bàn phím).
 * Dùng KeyboardEvent.code: https://developer.mozilla.org/docs/Web/API/KeyboardEvent/code
 * Mỗi action có thể gán nhiều phím.
 * ========================================================= */
window.SFC_CONFIG = window.SFC_CONFIG || {};

SFC_CONFIG.controls = {
  bindings: {
    up:      ['ArrowUp'],
    down:    ['ArrowDown'],
    left:    ['ArrowLeft'],
    right:   ['ArrowRight'],
    sprint:  ['KeyE'],

    // Tấn công            | Phòng ngự
    pass:    ['KeyS'],    // Chuyền sệt tự động | —
    through: ['KeyW'],    // Chọc khe           | —
    lob:     ['KeyA'],    // Chuyền bổng        | HARD ATTACK (gồng rồi vung chân đá bay đối thủ)
    shoot:   ['KeyD'],    // Sút (giữ để nạp) · sân nhà + còn đối phương phía trước: phá bóng | LIGHT ATTACK (đấm)
    skill:   ['KeyZ'],    // Skill move / lướt né
    switch:  ['KeyQ'],    // Đổi cầu thủ

    pause:   ['Escape', 'KeyP'],
    confirm: ['Enter', 'Space'],
    back:    ['Backspace'],
    pick1:   ['Digit1', 'Numpad1'],
    pick2:   ['Digit2', 'Numpad2'],
    pick3:   ['Digit3', 'Numpad3'],
    mute:    ['KeyM'],
    restart: ['KeyR'],     // túi đồ: phân rã toàn bộ đồ trùng (giữ 1)
    dismantle: ['KeyX', 'Delete'], // túi đồ / mở hộp: phân rã món đang chọn
    ultimate: ['KeyX'],    // trong trận: TUYỆT KỸ (khi thanh năng lượng đầy)
    reroll:  ['KeyR'],     // màn chọn Core: đổi cả 3 lá (mỗi lượt 1 lần)
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
      ['D (own half, opponent ahead)', 'Clearance'],
      ['Z', 'Skill move (dodge)'],
      ['X', 'Ultimate (when fully charged)'],
    ],
    defense: [
      ['D', 'Light attack (punch)'],
      ['A', 'Hard attack (dropkick)'],
      ['Q', 'Switch player'],
      ['Z', 'Dash'],
    ],
    teammateHasBall: [
      ['S / W / A', 'Call for the ball (short/through/lob)'],
    ],
    system: [
      ['1 / 2 / 3', 'Pick Core'],
      ['R', 'Reroll 3 Core cards (once per round)'],
      ['Esc / P', 'Pause'],
      ['M', 'Mute/unmute'],
    ],
  },
};
