/* Preload — chạy trước game, dùng chung window (contextIsolation tắt).
 * - window.SFC_DESKTOP: đổi cỡ cửa sổ / toàn màn hình (src/core/settings.js), gửi sang electron/main.js
 * - Khởi động Steam; được thì gắn window.SFC_STEAM cho src/net/transport-steam.js, không được thì game dùng PeerJS.
 *   App ID: Steam tự đưa khi mở game từ Steam; chạy ngoài Steam thì đọc steam_appid.txt ở thư mục đang chạy (dev: 480).
 */
const { ipcRenderer } = require('electron');

window.SFC_DESKTOP = {
  // mode: { w, h } = cửa sổ cỡ w x h · { full: true } = toàn màn hình
  setWindow: (mode) => ipcRenderer.send('sfc-window', mode),
  // cb(full): vào / thoát toàn màn hình (kể cả bằng F11)
  onFullscreen: (cb) => ipcRenderer.on('sfc-fullscreen', (e, full) => cb(full)),
  // thoát game (trang chủ: Esc -> QUIT GAME?)
  quit: () => ipcRenderer.send('sfc-quit'),
};

try {
  const steamworks = require('steamworks.js');
  window.SFC_STEAM = {
    client: steamworks.init(),
    // trang không có Buffer (nodeIntegration tắt) -> chuyển chuỗi <-> Buffer ở đây
    toBuffer: (s) => Buffer.from(s, 'utf8'),
    fromBuffer: (b) => b.toString('utf8'),
  };
} catch (e) {
  console.warn('[steam] không khởi động được, dùng PeerJS:', e && e.message);
}
