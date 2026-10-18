/* Settings — cài đặt của máy: âm lượng nhạc / hiệu ứng, cỡ cửa sổ, ngôn ngữ. Lưu qua SFC.Storage, key 'sfc_settings'
 * (tách khỏi hồ sơ người chơi như FXSettings -> RESET DATA không xoá). Chỉnh ở SETTINGS > SOUND & DISPLAY (ui/menu.js).
 *  - Âm lượng: 0..10 (x10%) -> SFC.Audio.setVolume, nhân với âm lượng trong config
 *  - Cỡ cửa sổ: chỉ bản desktop (electron/preload.js -> window.SFC_DESKTOP). 'WxH' hoặc 'full'.
 *    Danh sách cỡ: game.config.js -> render.windowSizes, bỏ cỡ lớn hơn màn hình
 *  - NETWORK STATS: hiện ping + dung lượng gửi / nhận khi đang ở phòng online (src/ui/online.js)
 *  - FRAME RATE: giới hạn số khung hình vẽ mỗi giây (UNLIMITED / 60 / 30); mô phỏng + đọc phím vẫn 60 Hz
 *  - CONNECTION (PRIVATE MATCH): AUTO = tạo phòng trên máy chủ riêng trước · DIRECT = máy này làm host (Steam / PeerJS)
 *  - ĐỔI PHÍM (SETTINGS > CONTROLS, ui/controls.js): binds = phím người chơi tự gán cho action trong trận, áp vào SFC.Input
 *  - Ngôn ngữ: mã trong src/engine/i18n.js. null = chưa chọn -> popup chọn ngôn ngữ lúc mở game (src/ui/langpick.js)
 */
window.SFC = window.SFC || {};

(function () {
  const KEY = 'sfc_settings';
  const FULL = 'full';
  const FPS = [0, 60, 30];   // FRAME RATE: 0 = không giới hạn
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const vol10 = (v, d) => (Number.isInteger(v) ? clamp(v, 0, 10) : d);

  // ĐỔI PHÍM (controls.remap): phím của pause / mute không gán được; bàn phím bỏ Ctrl / Alt / Tab / F1-F12...; tay cầm chỉ nút trong padButtons
  const reservedBy = (code) => SFC_CONFIG.controls.remap.reserved.find((a) => (SFC_CONFIG.controls.bindings[a] || []).includes(code)) || null;
  const validCode = (dev, code) => {
    const R = SFC_CONFIG.controls.remap;
    if (typeof code !== 'string' || reservedBy(code)) return false;
    if (dev === 'pad') return code.startsWith('Pad.') && R.padButtons.includes(code.slice(4));
    return !code.startsWith('Pad.') && !code.startsWith('Tap2.') && !R.blocked.test(code);
  };
  // save cũ / sửa tay: bỏ action lạ, phím không hợp lệ, 2 action trùng phím (giữ action đầu)
  function cleanBinds(raw) {
    const R = SFC_CONFIG.controls.remap, out = { kb: {}, pad: {} };
    for (const dev of ['kb', 'pad']) {
      const src = (raw && raw[dev]) || {}, used = new Set();
      for (const a of R[dev]) {
        const c = src[a];
        if (validCode(dev, c) && !used.has(c)) { out[dev][a] = c; used.add(c); }
      }
    }
    return out;
  }

  const Settings = {
    music: 10,
    sfx: 10,
    res: '1280x720',     // khớp cỡ cửa sổ lúc mở (electron/main.js)
    lastWindow: null,    // cỡ cửa sổ trước khi vào FULLSCREEN (F11 thoát ra thì về lại cỡ này)
    lang: null,          // ngôn ngữ đã chọn ('en', 'pt-BR'...) · null = chưa chọn
    netStats: false,     // hiện ping + KB/s khi online
    roomDirect: false,   // PRIVATE MATCH › CONNECTION: false = AUTO (máy chủ riêng trước) · true = DIRECT (máy này làm host)
    fps: 0,              // FRAME RATE: 0 = không giới hạn (theo tần số màn hình) · 60 · 30. Chỉ giới hạn số lần vẽ, mô phỏng vẫn 60 Hz (main.js)
    binds: { kb: {}, pad: {} },   // ĐỔI PHÍM: { kb: { shoot: 'KeyJ' }, pad: { shoot: 'Pad.RB' } } — chỉ lưu phím khác mặc định (Input.applyBinds)

    load() {
      const raw = SFC.Storage.getJSON(KEY, {}) || {};
      this.music = vol10(raw.music, 10);
      this.sfx = vol10(raw.sfx, 10);
      if (raw.res === FULL || /^\d+x\d+$/.test(raw.res)) this.res = raw.res;
      if (typeof raw.lang === 'string') this.lang = raw.lang;
      this.netStats = raw.netStats === true;
      this.roomDirect = raw.roomDirect === true;
      this.fps = FPS.includes(raw.fps) ? raw.fps : 0;
      this.binds = cleanBinds(raw.binds);
      return this;
    },
    save() {
      SFC.Storage.setJSON(KEY, { music: this.music, sfx: this.sfx, res: this.res, lang: this.lang, netStats: this.netStats, roomDirect: this.roomDirect, fps: this.fps, binds: this.binds });
    },

    /* ĐỔI PHÍM: gán code cho action trên thiết bị dev ('kb' | 'pad'). Phím đang thuộc action khác -> 2 action đổi phím cho nhau.
     * Trả về { ok, swap: action bị đổi | null } · { err: 'reserved', by: action giữ phím (pause / mute) } · { err: 'blocked' } */
    rebind(dev, action, code) {
      const R = SFC_CONFIG.controls.remap, I = SFC.Input;
      const by = reservedBy(code);
      if (by) return { err: 'reserved', by };
      if (!validCode(dev, code) || !R[dev].includes(action)) return { err: 'blocked' };
      const old = I.codeOf(action, dev);
      if (old === code) return { ok: true, swap: null };
      const swap = R[dev].find((b) => b !== action && I.codeOf(b, dev) === code) || null;
      const put = (a, c) => {
        if (c === (I.defaults[a] || []).find((x) => x.startsWith('Pad.') === (dev === 'pad'))) delete this.binds[dev][a];
        else this.binds[dev][a] = c;
      };
      if (swap) put(swap, old);
      put(action, code);
      I.applyBinds(this.binds);
      this.save();
      return { ok: true, swap };
    },
    resetBinds(dev) {
      this.binds[dev] = {};
      SFC.Input.applyBinds(this.binds);
      this.save();
    },
    bindsChanged(dev) { return Object.keys(this.binds[dev]).length > 0; },

    get desktop() { return !!window.SFC_DESKTOP; },

    // lúc khởi động (main.js -> boot): đặt âm lượng + cỡ cửa sổ đã lưu
    apply() {
      SFC.Audio.setVolume('music', this.music / 10);
      SFC.Audio.setVolume('sfx', this.sfx / 10);
      if (this.desktop) this.applyRes();
    },

    // kind: 'music' | 'sfx'
    stepVolume(kind, d) {
      this[kind] = clamp(this[kind] + d, 0, 10);
      SFC.Audio.setVolume(kind, this[kind] / 10);
      this.save();
    },
    volumeLabel(kind) { return this[kind] ? `${this[kind] * 10}%` : SFC.t('OFF'); },

    toggleNetStats() { this.netStats = !this.netStats; this.save(); },
    toggleRoomDirect() { this.roomDirect = !this.roomDirect; this.save(); },
    // FRAME RATE ◀▶: UNLIMITED -> 60 -> 30
    stepFps(d) { this.fps = FPS[(FPS.indexOf(this.fps) + d + FPS.length) % FPS.length]; this.save(); },
    fpsLabel() { return this.fps ? SFC.t('{n} FPS', { n: this.fps }) : SFC.tc('fps', 'UNLIMITED'); },

    // đổi ngôn ngữ (popup chọn ngôn ngữ): dịch lại config + lưu ngay
    setLang(id) {
      this.lang = id;
      SFC.I18n.set(id);
      this.save();
    },

    resOptions() {
      const sw = window.screen.availWidth, sh = window.screen.availHeight;
      const sizes = SFC_CONFIG.game.render.windowSizes;
      const fit = sizes.filter(([w, h]) => w <= sw && h <= sh);
      return [...(fit.length ? fit : sizes.slice(0, 1)).map(([w, h]) => `${w}x${h}`), FULL];
    },
    stepRes(d) {
      const opts = this.resOptions(), i = opts.indexOf(this.res);
      this.res = opts[i < 0 ? 0 : clamp(i + d, 0, opts.length - 1)];
      this.applyRes();
      this.save();
    },
    resLabel() { return this.res === FULL ? SFC.t('FULLSCREEN') : this.res.replace('x', ' x '); },

    applyRes() {
      if (this.res === FULL) { window.SFC_DESKTOP.setWindow({ full: true }); return; }
      const [w, h] = this.res.split('x').map(Number);
      window.SFC_DESKTOP.setWindow({ w, h });
    },

    // F11 (electron/main.js) vào / thoát toàn màn hình: cập nhật lựa chọn cho khớp
    onFullscreen(full) {
      if (full && this.res !== FULL) { this.lastWindow = this.res; this.res = FULL; }
      else if (!full && this.res === FULL) this.res = this.lastWindow || this.resOptions()[0];
      else return;
      this.save();
      if (SFC.Menu && SFC.Menu.page === 'display') SFC.Menu.render();
    },
  };

  SFC.Settings = Settings.load();
  if (window.SFC_DESKTOP) window.SFC_DESKTOP.onFullscreen((full) => Settings.onFullscreen(full));
})();
