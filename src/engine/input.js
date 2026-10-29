/* Input — map phím vật lý (event.code) và nút tay cầm (phím ảo Pad.*, xem gamepad.js) sang action theo controls.config.js */
window.SFC = window.SFC || {};

SFC.Input = {
  // tên ngắn của phím không phải chữ / số (nhãn trên HUD, gợi ý phím, trang Controls)
  keyNames: {
    ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Escape: 'Esc', Backspace: '⌫', Space: 'Space', Enter: 'Enter',
    Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\', Semicolon: ';', Quote: "'", Backquote: '`',
    Comma: ',', Period: '.', Slash: '/', IntlBackslash: '\\', NumpadEnter: 'NumEnter', NumpadAdd: 'Num+', NumpadSubtract: 'Num-',
    NumpadMultiply: 'Num*', NumpadDivide: 'Num/', NumpadDecimal: 'Num.', Delete: 'Del', Insert: 'Ins', PageUp: 'PgUp', PageDown: 'PgDn',
  },

  down: new Set(),
  pressed: new Set(),
  released: new Set(),
  bindings: {},
  gameCodes: new Set(),
  padHeld: new Set(),
  device: 'kb',     // kb | pad: thiết bị dùng gần nhất (nhãn phím trên UI + rung)
  deviceRev: 0,     // tăng mỗi lần đổi thiết bị -> UI vẽ lại nhãn

  init(bindings) {
    // phím cửa hàng cấm (Platform.restrictedKeys, vd. CrazyGames: Escape): gỡ khỏi mọi action, sửa thẳng config ->
    // SFC_CONFIG.controls.bindings vẫn là phím đang dùng
    const cut = (SFC.Platform && SFC.Platform.restrictedKeys) || [];
    for (const a in bindings) bindings[a] = bindings[a].filter((code) => !cut.includes(code));
    this.bindings = bindings;
    this.defaults = JSON.parse(JSON.stringify(bindings));   // phím gốc trong config (đổi phím = ghi đè lên bản này)
    if (SFC.Settings) this.applyBinds(SFC.Settings.binds);
    else this.rebuildCodes();

    window.addEventListener('keydown', (e) => {
      this.setDevice('kb');
      // ô nhập chữ (vd. mã phòng): handler trả về true = đã dùng phím, không tính là action
      if (this.textHandler && !e.ctrlKey && !e.metaKey && this.textHandler(e)) { e.preventDefault(); return; }
      // Tab: chặn trình duyệt chuyển focus qua các nút (focus nút ngoài khung làm cuộn màn hình)
      if (this.gameCodes.has(e.code) || e.code === 'Tab') e.preventDefault();
      if (e.repeat) return;
      this.down.add(e.code);
      this.pressed.add(e.code);
      this.tap(e.code);
      SFC.Audio && SFC.Audio.unlock();
    });
    window.addEventListener('keyup', (e) => {
      if (this.gameCodes.has(e.code)) e.preventDefault();
      this.down.delete(e.code);
      this.released.add(e.code);
      this.untap(e.code);
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

  rebuildCodes() {
    this.gameCodes = new Set();
    Object.values(this.bindings).forEach((codes) => codes.forEach((c) => this.gameCodes.add(c)));
  },

  /* ĐỔI PHÍM (Settings > Controls): over = { kb: { action: code }, pad: { action: 'Pad.X' } } (Settings.binds).
   * Action trong controls.remap: phím của thiết bị đó thay bằng 1 phím người chơi chọn, phím thiết bị kia giữ nguyên.
   * Sửa thẳng SFC_CONFIG.controls.bindings (cùng object với this.bindings) để mọi chỗ đọc config thấy phím mới */
  applyBinds(over) {
    const R = SFC_CONFIG.controls.remap, B = this.bindings;
    for (const a of new Set([...R.kb, ...R.pad])) {
      let codes = this.defaults[a].slice();
      const kb = over && over.kb && over.kb[a], pad = over && over.pad && over.pad[a];
      if (kb && R.kb.includes(a)) codes = [kb, ...codes.filter((c) => c.startsWith('Pad.'))];
      if (pad && R.pad.includes(a)) codes = [...codes.filter((c) => !c.startsWith('Pad.') || /^Pad\.(Stick)?(Up|Down|Left|Right)$/.test(c)), pad];
      B[a] = codes;
    }
    this.rebuildCodes();
  },

  // phím đang gán cho action trên 1 thiết bị ('kb' | 'pad'): phím đầu tiên của thiết bị đó
  codeOf(action, dev) {
    return (this.bindings[action] || []).find((c) => c.startsWith('Pad.') === (dev === 'pad')) || null;
  },

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
      this.tap(c);
      fresh = true;
    }
    for (const c of this.padHeld) {
      if (now.has(c)) continue;
      this.down.delete(c);
      this.released.add(c);
      this.untap(c);
    }
    this.padHeld = now;
    if (fresh || moved) this.setDevice('pad');
    if (fresh) SFC.Audio && SFC.Audio.unlock();
  },

  // BẤM ĐÚP: lần bấm thứ 2 cách lần trước <= controls.doubleTap giây -> phím ảo 'Tap2.<mã>' (giữ tới khi thả phím).
  // Lần bấm thứ 3 tính lại từ đầu (bấm 3 lần liền không ra 2 cú)
  lastTap: {},
  tap(code) {
    const now = performance.now(), win = (SFC_CONFIG.controls.doubleTap || 0) * 1000;
    if (now - (this.lastTap[code] || -1e9) <= win) {
      this.down.add('Tap2.' + code);
      this.pressed.add('Tap2.' + code);
      this.lastTap[code] = -1e9;
    } else this.lastTap[code] = now;
  },
  untap(code) {
    if (this.down.delete('Tap2.' + code)) this.released.add('Tap2.' + code);
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
    if (c.startsWith('Tap2.')) return this.codeLabel(c.slice(5)) + '×2';
    return this.codeLabel(c);
  },
  codeLabel(c, style) {
    return c.startsWith('Pad.') ? SFC.Pad.label(c, style) : this.keyName(c);
  },
  // tên phím bàn phím: 'KeyQ' -> 'Q', 'ShiftLeft' -> 'Shift', 'Numpad1' -> 'Num1'
  keyName(code) {
    return this.keyNames[code] || code.replace(/^(Key|Digit)/, '').replace(/^Numpad/, 'Num').replace(/(Left|Right)$/, '');
  },

  // chữ gợi ý phím: tay cầm -> nút của action, bàn phím -> giữ nguyên chữ viết sẵn ('Enter', 'Esc'...).
  // Esc bị cấm ở cửa hàng này (Platform.restrictedKeys) -> nhãn phím bàn phím của action (back -> Backspace)
  key(action, kb) {
    if (this.device === 'pad') return this.label(action);
    return kb === 'Esc' && !this.gameCodes.has('Escape') ? this.label(action) : kb;
  },

  // bảng hướng dẫn phím theo thiết bị (controls.help / padHelp): {action} = nhãn phím đang gán (theo phím người chơi đã đổi),
  // {action+} = mọi phím của action trên thiết bị này ('Esc / P'), {move} = cụm phím hướng / cần analog
  helpSet() {
    const C = SFC_CONFIG.controls, pad = this.device === 'pad' && C.padHelp;
    const all = (a) => (this.bindings[a] || []).filter((c) => c.startsWith('Pad.') === !!pad).map((c) => this.codeLabel(c)).join(' / ');
    const move = () => (pad ? 'L-stick / D-pad' : ['left', 'up', 'down', 'right'].map((d) => this.label(d)).join(' '));
    const tok = (s) => s.replace(/\{(\w+)(\+?)\}/g, (_, a, plus) => (a === 'move' ? move() : plus ? all(a) : this.label(a)));
    const src = pad ? C.padHelp : C.help, out = {};
    for (const k in src) out[k] = src[k].map(([l, d]) => [tok(l), d]);
    return out;
  },

  // chuỗi có {action} -> nhãn phím đang gán (thẻ kỹ thuật LEGEND của GOAT PATH: config/legends.config.js techniques[].keys)
  keysText(s) { return String(s).replace(/\{(\w+)\}/g, (_, a) => this.label(a)); },
  // tổ hợp phím của 1 kỹ thuật LEGEND theo thiết bị đang dùng (tay cầm: tech.pad nếu có — power / trivela không có nút riêng)
  techKeys(K) { return this.keysText(this.device === 'pad' && K.pad ? K.pad : K.keys); },

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
