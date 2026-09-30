/* Storage — nơi lưu dữ liệu của game (hồ sơ, cài đặt), đọc / ghi chuỗi JSON theo key.
 *  - Bản desktop (Electron): file JSON trong %APPDATA%\Street Football Chaos\save (electron/preload.js -> SFC_DESKTOP.store),
 *    có bản .bak để đọc khi bản chính hỏng; Steam Auto-Cloud đồng bộ thư mục này (docs/SAVE.md)
 *  - Bản web: localStorage
 * Mọi lỗi đều nuốt: không lưu được thì game vẫn chạy.
 */
window.SFC = window.SFC || {};

(function () {
  const file = () => (window.SFC_DESKTOP && window.SFC_DESKTOP.store) || null;
  const ls = {
    get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
    set(key, text) { try { localStorage.setItem(key, text); } catch (e) { /* storage bị chặn */ } },
    remove(key) { try { localStorage.removeItem(key); } catch (e) { /* storage bị chặn */ } },
  };

  SFC.Storage = {
    get desktop() { return !!file(); },

    // chuỗi đã lưu, null = chưa có
    get(key) {
      const f = file();
      if (!f) return ls.get(key);
      try { return f.read(key); } catch (e) { return null; }
    },

    set(key, text) {
      const f = file();
      if (!f) return ls.set(key, text);
      try { f.write(key, text); } catch (e) { console.warn('[storage] ghi file lỗi:', e && e.message); }
    },

    // RESET DATA
    remove(key) {
      const f = file();
      if (!f) return ls.remove(key);
      try { f.remove(key); } catch (e) { /* bỏ qua */ }
    },

    getJSON(key, fallback) {
      try { const t = this.get(key); return t == null ? fallback : JSON.parse(t); } catch (e) { return fallback; }
    },
    setJSON(key, value) { this.set(key, JSON.stringify(value)); },
  };
})();
