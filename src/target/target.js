/* Target — game đang chạy trên gì: web (trình duyệt) hay desktop (Electron) (Adapter pattern).
 * Trục thứ 2, độc lập với nền tảng phát hành (SFC.Platform, src/platform/: steam / itch / crazygames):
 *   steam = desktop · itch = web + desktop · crazygames = web. Bản build nào ghép trục nào: scripts/targets.js
 * Nhận biết lúc chạy (không ghi lúc đóng gói): electron/preload.js gắn window.SFC_DESKTOP -> desktop, không có -> web.
 * Nhờ vậy `npm start` (Electron từ repo) và mọi bản desktop đóng gói đều là desktop. Mọi nơi khác chỉ gọi SFC.Target,
 * không đọc window.SFC_DESKTOP.
 *
 * Giao diện:
 *   id                 'web' | 'desktop'
 *   desktop            id === 'desktop'
 *   save               nơi lưu (src/engine/storage.js): { read(key) -> chuỗi | null, write(key, text), remove(key) }; lỗi thì ném
 *                      web: localStorage · desktop: file JSON + .bak (electron/preload.js, docs/SAVE.md)
 *   canResize          đổi được cỡ cửa sổ / toàn màn hình (SETTINGS › RESOLUTION)
 *   setWindow(mode)    { w, h } | { full: true }
 *   onFullscreen(fn)   fn(full): vào / thoát toàn màn hình (cả F11)
 *   canQuit / quit()   trang chủ: QUIT GAME?
 *   openUrl(url)       mở link: desktop = trình duyệt của máy, web = tab mới
 *   languages()        ngôn ngữ ưu tiên của máy ['pt-BR', 'en-US'...] (desktop: của hệ điều hành; navigator bị khoá theo electronLanguages)
 */
window.SFC = window.SFC || {};

(function () {
  const D = () => window.SFC_DESKTOP;
  const nav = () => (typeof navigator === 'undefined' ? [] : [].concat(navigator.languages || [navigator.language]).filter(Boolean));

  const web = {
    id: 'web',
    save: {
      read: (key) => localStorage.getItem(key),
      write: (key, text) => localStorage.setItem(key, text),
      remove: (key) => localStorage.removeItem(key),
    },
    canResize: false,
    setWindow() {},
    onFullscreen() {},
    canQuit: false,
    quit() {},
    openUrl(url) { window.open(url, '_blank', 'noopener'); },
    languages: nav,
  };

  const desktop = {
    id: 'desktop',
    // bản desktop không lấy được thư mục save (hiếm): lưu như bản web
    get save() { return D().store || web.save; },
    canResize: true,
    setWindow(mode) { D().setWindow(mode); },
    onFullscreen(fn) { D().onFullscreen(fn); },
    canQuit: true,
    quit() { D().quit(); },
    openUrl(url) { D().openUrl(url); },
    languages() { return [].concat(D().languages || [], nav()); },
  };

  const pick = () => (typeof window !== 'undefined' && D() ? desktop : web);

  SFC.Target = {
    get id() { return pick().id; },
    get desktop() { return pick() === desktop; },
    get save() { return pick().save; },
    get canResize() { return pick().canResize; },
    setWindow(mode) { pick().setWindow(mode); },
    onFullscreen(fn) { pick().onFullscreen(fn); },
    get canQuit() { return pick().canQuit; },
    quit() { pick().quit(); },
    openUrl(url) { pick().openUrl(url); },
    languages() { return pick().languages(); },
  };
})();
