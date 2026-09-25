/* Keyboard input — map phím vật lý (event.code) sang action theo controls.config.js */
window.SFC = window.SFC || {};

SFC.Input = {
  down: new Set(),
  pressed: new Set(),
  released: new Set(),
  bindings: {},
  gameCodes: new Set(),

  init(bindings) {
    this.bindings = bindings;
    Object.values(bindings).forEach((codes) => codes.forEach((c) => this.gameCodes.add(c)));

    window.addEventListener('keydown', (e) => {
      if (this.gameCodes.has(e.code)) e.preventDefault();
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
    window.addEventListener('blur', () => this.down.clear());
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
