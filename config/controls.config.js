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
    pass:    ['KeyS'],    // Chuyền ngắn        | Tắc bóng (standing tackle)
    through: ['KeyW'],    // Chọc khe           | Gọi đồng đội áp sát (giữ)
    lob:     ['KeyA'],    // Chuyền bổng        | Va chạm vai (body check)
    shoot:   ['KeyD'],    // Sút (giữ để nạp)   | Xoạc bóng (slide tackle)
    skill:   ['KeyZ'],    // Skill move / lướt né
    switch:  ['KeyQ'],    // Đổi cầu thủ

    pause:   ['Escape', 'KeyP'],
    confirm: ['Enter', 'Space'],
    back:    ['Backspace'],
    pick1:   ['Digit1', 'Numpad1'],
    pick2:   ['Digit2', 'Numpad2'],
    pick3:   ['Digit3', 'Numpad3'],
    mute:    ['KeyM'],
    restart: ['KeyR'],
  },

  // Bảng hướng dẫn hiển thị trong menu / pause
  help: {
    attack: [
      ['← ↑ ↓ →', 'Di chuyển'],
      ['E (giữ)', 'Chạy nước rút'],
      ['S (giữ)', 'Chuyền sệt'],
      ['W (giữ)', 'Chọc khe'],
      ['A (giữ)', 'Chuyền bổng'],
      ['D (giữ)', 'Sút · ↑↓ chỉnh góc'],
      ['Z', 'Skill move (né tắc)'],
    ],
    defense: [
      ['S', 'Tắc bóng'],
      ['D', 'Xoạc bóng'],
      ['A', 'Va chạm vai'],
      ['W (giữ)', 'Gọi đồng đội áp sát'],
      ['Q', 'Đổi cầu thủ'],
      ['Z', 'Lướt nhanh'],
    ],
    teammateHasBall: [
      ['S / W / A', 'Đòi bóng (ngắn/khe/bổng)'],
    ],
    system: [
      ['1 / 2 / 3', 'Chọn Core'],
      ['Esc / P', 'Tạm dừng'],
      ['M', 'Tắt/bật âm'],
    ],
  },
};
