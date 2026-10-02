/* Bản desktop cho itch.io: giống bản Steam (npm run dist) nhưng không đóng gói steamworks.js
 * -> electron/preload.js không nạp được Steam -> game dùng PeerJS (giống bản web).
 * Bản DEMO như bản web: env SFC_DEMO=1 -> afterPack (strip-dev.js) ghi SFC_DEMO = true (config/demo.config.js: khoá Area 3+ và ONLINE).
 * Ra: dist/itch/Street Football Chaos/ + dist/street-football-chaos-windows-<version>.zip (version lấy từ package.json; trong zip là thư mục đó).
 * npm run itch-desktop
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { build, Platform } = require('electron-builder');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'dist', 'itch');
const pkg = require(path.join(ROOT, 'package.json'));
const ZIP = path.join(ROOT, 'dist', `street-football-chaos-windows-${pkg.version}.zip`);
const FOLDER = 'Street Football Chaos';

(async () => {
  process.env.SFC_DEMO = '1';
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.rmSync(ZIP, { force: true });
  await build({
    targets: Platform.WINDOWS.createTarget('dir'),
    publish: 'never',
    config: Object.assign({}, pkg.build, {
      directories: { output: path.relative(ROOT, OUT) },
      files: pkg.build.files.concat(['!node_modules/steamworks.js/**']),
    }),
  });

  // không còn sót Steam trong bản đóng gói
  const app = path.join(OUT, 'win-unpacked', 'resources');
  const asar = require('@electron/asar');
  const left = asar.listPackage(path.join(app, 'app.asar')).filter((f) => /steamworks/i.test(f));
  const unpacked = path.join(app, 'app.asar.unpacked');
  if (fs.existsSync(unpacked) && JSON.stringify(fs.readdirSync(unpacked, { recursive: true })).match(/steam/i)) left.push('app.asar.unpacked/…steam…');
  if (left.length) throw new Error('build-itch: còn file Steam trong bản đóng gói:\n  ' + left.slice(0, 10).join('\n  '));

  // đổi tên win-unpacked -> FOLDER (tên thư mục người chơi thấy sau khi giải nén), rồi nén bằng tar của Windows (bsdtar)
  fs.renameSync(path.join(OUT, 'win-unpacked'), path.join(OUT, FOLDER));
  const tar = process.platform === 'win32' ? path.join(process.env.SystemRoot, 'System32', 'tar.exe') : 'bsdtar';
  execFileSync(tar, ['-a', '-c', '-f', ZIP, FOLDER], { cwd: OUT });
  const mb = (fs.statSync(ZIP).size / 1048576).toFixed(1);
  console.log(`itch build: ${path.relative(ROOT, ZIP)} (${mb} MB)`);
})().catch((e) => { console.error(e.message || e); process.exit(1); });
