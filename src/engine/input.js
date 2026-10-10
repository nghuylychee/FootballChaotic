/* Input — map phím vật lý (event.code) và nút tay cầm (phím ảo Pad.*, xem gamepad.js) sang action theo controls.config.js */
window.SFC = window.SFC || {};

SFC.Input = {
  down: new Set(),
  pressed: new Set(),
  released: new Set(),
  bindings: {},
  gameCodes: new Set(),
  padHeld: new Set(),
  device: 'kb',     // kb | pad: thiết bị dùng gần nhất (nhãn phím trên UI + rung)
  deviceRev: 0,     // tăng mỗi lần đổi thiết bị -> UI vẽ lại nhãn

  init(bindings) {
    this.bindings = bindings;
    Object.values(bindings).forEach((codes) => codes.forEach((c) => this.gameCodes.add(c)));

    window.addEventListener('keydown', (e) => {
      this.setDevice('kb');
      // ô nhập chữ (vd. mã phòng): handler trả về true = đã dùng phím, không tính là action
      if (this.textHandler && !e.ctrlKey && !e.metaKey && this.textHandler(e)) { e.preventDefault(); return; }
      // Tab: chặn trình duyệt chuyển focus qua các nút (focus nút ngoài khung làm cuộn màn hình)
      if (this.gameCodes.has(e.code) || e.code === 'Tab') e.preventDefault();
      if (e.repeat) return;
      this.down.add(e.code);
      this.pressed.add(e.code);
      SFC.Audio && SFC.Audio.unlock();
    });
    window.addEventListener('keyup', (e) => {
      if (this.gameCodes.has(e.code)) e.preventDefault();
      this.down.delete(e.code);
      this.released.add(e.code);
    });
    window.addEventListener('blur', () => { this.down.clear(); this.padHeld.clear(); });
    window.addEventListener('paste', (e) => {
      if (!this.pasteHandler) return;
      e.preventDefault();
      this.pasteHandler((e.clipboardData || window.clipboardData).getData('text') || '');
    });
  },

  textHandler: null,
  pasteHandler: null,

  // đọc tay cầm; gọi trước mỗi bước mô phỏng để pressed / released khớp với endFrame()
  poll() {
    if (!SFC.Pad) return;
    const { held, moved } = SFC.Pad.poll();
    const now = new Set(held);
    let fresh = false;
    for (const c of now) {
      if (this.padHeld.has(c)) continue;
      this.down.add(c);
      this.pressed.add(c);
      fresh = true;
    }
    for (const c of this.padHeld) {
      if (now.has(c)) continue;
      this.down.delete(c);
      this.released.add(c);
    }
    this.padHeld = now;
    if (fresh || moved) this.setDevice('pad');
    if (fresh) SFC.Audio && SFC.Audio.unlock();
  },

  setDevice(d) {
    if (this.device === d) return;
    this.device = d;
    this.deviceRev++;
  },

  // cần analog trái (0..1, sau deadzone) hoặc null -> dùng hướng số
  stick() { return SFC.Pad ? SFC.Pad.stick : null; },

  // nhãn phím của action theo thiết bị đang dùng ('S' / 'A' / '✕')
  label(action) {
    const codes = this.bindings[action] || [];
    const pad = this.device === 'pad';
    const c = codes.find((x) => x.startsWith('Pad.') === pad) || codes[0];
    if (!c) return '?';
    return c.startsWith('Pad.') ? SFC.Pad.label(c) : c.replace(/^(Key|Digit)/, '');
  },

  // chữ gợi ý phím: tay cầm -> nút của action, bàn phím -> giữ nguyên chữ viết sẵn ('Enter', 'Esc'...)
  key(action, kb) { return this.device === 'pad' ? this.label(action) : kb; },

  // bảng hướng dẫn phím theo thiết bị: tay cầm -> controls.padHelp với {action} thay bằng nhãn nút
  helpSet() {
    const C = SFC_CONFIG.controls;
    if (this.device !== 'pad' || !C.padHelp) return C.help;
    const tok = (s) => s.replace(/\{(\w+)\}/g, (_, a) => (a === 'move' ? 'L-stick / D-pad' : this.label(a)));
    const out = {};
    for (const k in C.padHelp) out[k] = C.padHelp[k].map(([l, d]) => [tok(l), d]);
    return out;
  },

  isDown(action) {
    const codes = this.bindings[action];
    return !!codes && codes.some((c) => this.down.has(c));
  },
  wasPressed(action) {
    const codes = this.bindings[action];
    return !!codes && codes.some((c) => this.pressed.has(c));
  },
  wasReleased(action) {
    const codes = this.bindings[action];
    return !!codes && codes.some((c) => this.released.has(c));
  },
  // gọi sau mỗi bước mô phỏng để "pressed" chỉ có hiệu lực 1 lần
  endFrame() {
    this.pressed.clear();
    this.released.clear();
  },
};
