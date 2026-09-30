/* Preload — chạy trước game, dùng chung window (contextIsolation tắt).
 * Khởi động Steam; được thì gắn window.SFC_STEAM cho src/net/transport-steam.js, không được thì game dùng PeerJS.
 * App ID: Steam tự đưa khi mở game từ Steam; chạy ngoài Steam thì đọc steam_appid.txt ở thư mục đang chạy (dev: 480).
 */
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
