/* Settings — cài đặt của máy: âm lượng nhạc / hiệu ứng, cỡ cửa sổ. Lưu qua SFC.Storage, key 'sfc_settings'
 * (tách khỏi hồ sơ người chơi như FXSettings -> RESET DATA không xoá). Chỉnh ở SETTINGS > SOUND & DISPLAY (ui/menu.js).
 *  - Âm lượng: 0..10 (x10%) -> SFC.Audio.setVolume, nhân với âm lượng trong config
 *  - Cỡ cửa sổ: chỉ bản desktop (electron/preload.js -> window.SFC_DESKTOP). 'WxH' hoặc 'full'.
 *    Danh sách cỡ: game.config.js -> render.windowSizes, bỏ cỡ lớn hơn màn hình
 */
window.SFC = window.SFC || {};

(function () {
  const KEY = 'sfc_settings';
  const FULL = 'full';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const vol10 = (v, d) => (Number.isInteger(v) ? clamp(v, 0, 10) : d);

  const Settings = {
    music: 10,
    sfx: 10,
    res: '1280x720',     // khớp cỡ cửa sổ lúc mở (electron/main.js)
    lastWindow: null,    // cỡ cửa sổ trước khi vào FULLSCREEN (F11 thoát ra thì về lại cỡ này)

    load() {
      const raw = SFC.Storage.getJSON(KEY, {}) || {};
      this.music = vol10(raw.music, 10);
      this.sfx = vol10(raw.sfx, 10);
      if (raw.res === FULL || /^\d+x\d+$/.test(raw.res)) this.res = raw.res;
      return this;
    },
    save() {
      SFC.Storage.setJSON(KEY, { music: this.music, sfx: this.sfx, res: this.res });
    },

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
    volumeLabel(kind) { return this[kind] ? `${this[kind] * 10}%` : 'OFF'; },

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
    resLabel() { return this.res === FULL ? 'FULLSCREEN' : this.res.replace('x', ' x '); },

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
