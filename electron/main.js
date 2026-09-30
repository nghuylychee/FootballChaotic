/* Electron — cửa sổ game cho bản desktop (Steam). Game vẫn là index.html như bản web.
 * F11: toàn màn hình · F12 (chỉ khi chưa đóng gói): DevTools
 */
const { app, BrowserWindow } = require('electron');
const path = require('path');

// âm thanh chạy ngay, không cần chờ người chơi bấm phím đầu tiên (src/core/audio.js)
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// icon riêng của game (scripts/make-icon.py) thay logo Electron: cửa sổ / taskbar; Dock của Mac khi chạy dev
const ICON = path.join(__dirname, '..', 'assets', 'icon.png');

function createWindow() {
  if (process.platform === 'darwin' && app.dock) app.dock.setIcon(ICON);
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    useContentSize: true,
    backgroundColor: '#07050a',
    title: 'Street Football Chaos',
    icon: ICON,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: false,     // preload gắn window.SFC_STEAM thẳng vào window của game
      nodeIntegration: false,      // trang không có require / module
      sandbox: false,              // preload cần nạp steamworks.js (module native)
      backgroundThrottling: false, // host online vẫn chạy mô phỏng đủ nhịp khi cửa sổ mất focus
    },
  });
  win.setMenu(null);
  win.setAspectRatio(16 / 9);    // khung game 640x360 (main.js -> fit): cửa sổ giữ 16:9, không có viền đen

  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    else if (input.key === 'F12' && !app.isPackaged) { win.webContents.toggleDevTools(); e.preventDefault(); }
  });
  // không cho trang điều hướng / mở cửa sổ ra ngoài game
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  win.loadFile(path.join(__dirname, '..', 'index.html'));
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
