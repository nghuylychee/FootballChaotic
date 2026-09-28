/* Gamepad — đọc tay cầm (Xbox / PlayStation, mapping 'standard') thành "phím ảo" Pad.* cho SFC.Input,
 * cần analog trái (di chuyển 360°), nhãn nút theo loại tay cầm và rung */
window.SFC = window.SFC || {};

(function () {
  // chỉ số nút theo Standard Gamepad mapping (tên theo vị trí trên tay Xbox)
  const BUTTONS = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'Back', 'Start', 'LS', 'RS', 'Up', 'Down', 'Left', 'Right'];
  const LABELS = {
    xbox: { A: 'A', B: 'B', X: 'X', Y: 'Y', LB: 'LB', RB: 'RB', LT: 'LT', RT: 'RT', Back: 'View', Start: 'Menu', LS: 'LS', RS: 'RS' },
    ps:   { A: '✕', B: '○', X: '□', Y: '△', LB: 'L1', RB: 'R1', LT: 'L2', RT: 'R2', Back: 'Create', Start: 'Options', LS: 'L3', RS: 'R3' },
  };
  const DIR_LABELS = { Up: '↑', Down: '↓', Left: '←', Right: '→', StickUp: 'L↑', StickDown: 'L↓', StickLeft: 'L←', StickRight: 'L→' };
  // 8 hướng của cần analog (mỗi góc 45°, bắt đầu từ phải, chiều kim đồng hồ vì trục y hướng xuống)
  const SECTORS = [['StickRight'], ['StickRight', 'StickDown'], ['StickDown'], ['StickDown', 'StickLeft'],
    ['StickLeft'], ['StickLeft', 'StickUp'], ['StickUp'], ['StickUp', 'StickRight']];
  // DualShock 4 trên Chrome chỉ báo "Wireless Controller (... Vendor: 054c ...)" -> nhận theo vendor Sony hoặc tên đầu chuỗi
  const PS_ID = /vendor: ?054c|^054c-|playstation|dualsense|dualshock|^wireless controller/i;

  const cfg = () => SFC_CONFIG.controls;

  SFC.Pad = {
    stick: null,       // {x, y} sau deadzone (0..1), null = cần đang ở giữa
    style: 'xbox',     // xbox | ps (nhãn nút)
    active: null,      // tay cầm vừa được dùng (để rung)
    stickDigital: [],  // hướng số của cần analog (menu + gửi online)

    // trả về danh sách phím ảo đang giữ ('Pad.A', 'Pad.StickUp'...); moved = cần analog vượt deadzone
    poll() {
      const held = [];
      let sx = 0, sy = 0, moved = false;
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (const gp of pads) {
        if (!gp || !gp.connected || gp.mapping !== 'standard') continue;
        let used = false;
        gp.buttons.forEach((b, i) => {
          const name = BUTTONS[i];
          if (name && (b.pressed || b.value > 0.5)) { held.push('Pad.' + name); used = true; }
        });
        const x = gp.axes[0] || 0, y = gp.axes[1] || 0;
        if (Math.hypot(x, y) > Math.hypot(sx, sy)) { sx = x; sy = y; }
        if (used || Math.hypot(x, y) > cfg().stick.deadzone) this.use(gp);
      }

      const S = cfg().stick;
      const mag = Math.min(1, Math.hypot(sx, sy));
      if (mag > S.deadzone) {
        const k = (mag - S.deadzone) / (1 - S.deadzone) / mag;
        this.stick = { x: sx * k, y: sy * k };
        moved = true;
      } else this.stick = null;

      // hướng số: bật khi vượt digitalOn, giữ nguyên tới khi tụt dưới digitalOff (tránh menu nhảy 2 ô)
      const on = this.stickDigital.length ? S.digitalOff : S.digitalOn;
      if (mag > on) {
        const a = Math.atan2(sy, sx);
        this.stickDigital = SECTORS[((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8];
      } else this.stickDigital = [];
      for (const d of this.stickDigital) held.push('Pad.' + d);
      return { held, moved };
    },

    use(gp) {
      this.active = gp.index;
      this.style = !/xbox|xinput/i.test(gp.id) && PS_ID.test(gp.id) ? 'ps' : 'xbox';
    },

    // 'Pad.A' -> 'A' / '✕' (style: mặc định theo tay cầm đang dùng)
    label(code, style = this.style) {
      const name = code.replace(/^Pad\./, '');
      return LABELS[style][name] || DIR_LABELS[name] || name;
    },

    // rung theo tên âm thanh (Game.sfx): bảng controls.rumble = [yếu, mạnh, ms]
    rumble(name, arg) {
      const R = cfg().rumble;
      if (!R || !R.enabled || !R[name] || SFC.Input.device !== 'pad' || this.active == null) return;
      try {
        const gp = navigator.getGamepads()[this.active];
        const act = gp && gp.vibrationActuator;
        if (!act || !act.playEffect) return;
        let [weak, strong, ms] = R[name];
        // sút: mạnh theo lực
        if (name === 'kick' && typeof arg === 'number') { const s = 0.5 + 0.5 * Math.min(1, arg); weak *= s; strong *= s; }
        act.playEffect('dual-rumble', { duration: ms, weakMagnitude: weak, strongMagnitude: strong }).catch(() => {});
      } catch (e) { /* trình duyệt không hỗ trợ rung */ }
    },
  };
})();
