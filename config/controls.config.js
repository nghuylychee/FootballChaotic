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
      ['← ↑ ↓ →', 'Di chuyển'],
      ['E (giữ)', 'Chạy nước rút'],
      ['S', 'Chuyền sệt · mũi tên chỉ vào đồng đội = chuẩn'],
      ['W (giữ)', 'Chọc khe'],
      ['A (giữ)', 'Chuyền bổng'],
      ['D (giữ)', 'Sút · hướng phím = hướng sút'],
      ['D (sân nhà, có người chắn)', 'Phá bóng'],
      ['Z', 'Skill move (né tắc)'],
      ['X', 'Tuyệt kỹ (khi đầy năng lượng)'],
    ],
    defense: [
      ['D', 'Light attack (đấm)'],
      ['A', 'Hard attack (đá bay)'],
      ['Q', 'Đổi cầu thủ'],
      ['Z', 'Lướt nhanh'],
    ],
    teammateHasBall: [
      ['S / W / A', 'Đòi bóng (ngắn/khe/bổng)'],
    ],
    system: [
      ['1 / 2 / 3', 'Chọn Core'],
      ['R', 'Đổi 3 lá Core (mỗi lượt 1 lần)'],
      ['Esc / P', 'Tạm dừng'],
      ['M', 'Tắt/bật âm'],
    ],
  },
};
