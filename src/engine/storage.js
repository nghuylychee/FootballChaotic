/* Storage — nơi lưu dữ liệu của game (hồ sơ, cài đặt), đọc / ghi chuỗi JSON theo key.
 * Lưu ở đâu do target quyết định (SFC.Target.save, src/target/target.js):
 *  - desktop (Electron): file JSON trong %APPDATA%\Street Football Chaos\save, có bản .bak để đọc khi bản chính hỏng;
 *    Steam Auto-Cloud đồng bộ thư mục này (docs/SAVE.md)
 *  - web: localStorage
 * Mọi lỗi đều nuốt: không lưu được thì game vẫn chạy.
 */
window.SFC = window.SFC || {};

(function () {
  const S = () => SFC.Target.save;

  SFC.Storage = {
    // chuỗi đã lưu, null = chưa có
    get(key) {
      try { return S().read(key); } catch (e) { return null; }
    },

    set(key, text) {
      try { S().write(key, text); } catch (e) { console.warn('[storage] ghi lỗi:', e && e.message); }
    },

    // RESET DATA
    remove(key) {
      try { S().remove(key); } catch (e) { /* bỏ qua */ }
    },

    getJSON(key, fallback) {
      try { const t = this.get(key); return t == null ? fallback : JSON.parse(t); } catch (e) { return fallback; }
    },
    setJSON(key, value) { this.set(key, JSON.stringify(value)); },
  };
})();
