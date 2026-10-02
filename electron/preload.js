/* Preload — chạy trước game, dùng chung window (contextIsolation tắt).
 * - window.SFC_DESKTOP: đổi cỡ cửa sổ / toàn màn hình (src/core/settings.js), gửi sang electron/main.js
 * - Khởi động Steam; được thì gắn window.SFC_STEAM cho src/net/transport-steam.js, không được thì game dùng PeerJS.
 *   App ID: Steam tự đưa khi mở game từ Steam; chạy ngoài Steam thì đọc steam_appid.txt ở thư mục đang chạy (dev: 480).
 */
const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// save dạng file JSON (src/core/storage.js): <key>.json + <key>.json.bak (bản trước đó).
// Ghi: viết ra .tmp -> bản cũ thành .bak -> .tmp thành bản chính; tắt ngang lúc ghi thì vẫn còn .bak để đọc
const SAVE_DIR = ipcRenderer.sendSync('sfc-save-dir');
const saveFile = (key) => path.join(SAVE_DIR, key.replace(/[^\w.-]/g, '_') + '.json');
const store = SAVE_DIR && {
  dir: SAVE_DIR,
  // chuỗi JSON đã lưu, null = chưa có. Bản chính hỏng (không parse được) -> đọc .bak
  read(key) {
    for (const f of [saveFile(key), saveFile(key) + '.bak']) {
      try { const s = fs.readFileSync(f, 'utf8'); JSON.parse(s); return s; } catch (e) { /* thiếu / hỏng -> thử bản kế */ }
    }
    return null;
  },
  write(key, text) {
    const f = saveFile(key), tmp = f + '.tmp';
    fs.writeFileSync(tmp, text);
    try { fs.renameSync(f, f + '.bak'); } catch (e) { /* lần đầu: chưa có bản cũ */ }
    try { fs.renameSync(tmp, f); } catch (e) { fs.writeFileSync(f, text); fs.rmSync(tmp, { force: true }); }  // file bị khoá (antivirus) -> ghi thẳng
  },
  remove(key) {
    for (const f of [saveFile(key), saveFile(key) + '.bak', saveFile(key) + '.tmp']) fs.rmSync(f, { force: true });
  },
};

window.SFC_DESKTOP = {
  store,
  // mode: { w, h } = cửa sổ cỡ w x h · { full: true } = toàn màn hình
  setWindow: (mode) => ipcRenderer.send('sfc-window', mode),
  // cb(full): vào / thoát toàn màn hình (kể cả bằng F11)
  onFullscreen: (cb) => ipcRenderer.on('sfc-fullscreen', (e, full) => cb(full)),
  // thoát game (trang chủ: Esc -> QUIT GAME?)
  quit: () => ipcRenderer.send('sfc-quit'),
  // mở link https bằng trình duyệt của máy (bản DEMO: trang Steam, src/ui/menu.js -> openSteam)
  openUrl: (url) => ipcRenderer.send('sfc-open-url', url),
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
