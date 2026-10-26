/* Đóng gói 1 bản trong ma trận scripts/targets.js: node scripts/build.js <tên>  (npm run build:steam | build:itch-web | ...)
 *  - web: chép các file game chạy cần vào dist/<tên>, xoá code dev (strip-debug.js, ghi SFC_STORE / SFC_DEMO), nén ra
 *    dist/street-football-chaos-<tên>-<version>.zip (index.html ở gốc zip). Không chép: electron/, node_modules/, src/dev/,
 *    sandbox.html, tools/, brag-output/, steam_appid.txt
 *  - desktop: electron-builder (Windows, thư mục) ra dist/<tên>; afterPack = strip-debug.js đọc env SFC_BUILD. Không có
 *    steamworks: bỏ steamworks.js khỏi gói rồi kiểm không còn sót. zip: đổi win-unpacked thành thư mục "Street Football Chaos" rồi nén
 * version lấy từ package.json.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const targets = require('./targets');

const ROOT = path.join(__dirname, '..');
const pkg = require(path.join(ROOT, 'package.json'));
const FOLDER = 'Street Football Chaos';
const WEB_COPY = ['index.html', 'css', 'config', 'src', 'assets', 'lib'];
const WEB_SKIP = [path.join('src', 'dev')];

// tar của Windows (bsdtar) nén được zip, đường dẫn trong zip dùng '/'
function zip(file, cwd, entries) {
  if (process.platform === 'win32') execFileSync(path.join(process.env.SystemRoot, 'System32', 'tar.exe'), ['-a', '-c', '-f', file, ...entries], { cwd });
  else execFileSync('zip', ['-qr', file, ...entries], { cwd });
}

async function web(T, OUT) {
  const { strip } = require('./strip-debug');
  for (const rel of WEB_COPY) {
    fs.cpSync(path.join(ROOT, rel), path.join(OUT, rel), { recursive: true, filter: (src) => !WEB_SKIP.includes(path.relative(ROOT, src)) });
  }
  await strip(OUT, { store: T.store, demo: T.demo });
  return { dir: OUT, entries: fs.readdirSync(OUT) };
}

async function desktop(T, OUT) {
  const { build, Platform } = require('electron-builder');
  process.env.SFC_BUILD = T.name;   // afterPack (strip-debug.js) -> cờ của bản này
  const files = T.steamworks ? pkg.build.files : pkg.build.files.concat(['!node_modules/steamworks.js/**']);
  await build({
    targets: Platform.WINDOWS.createTarget('dir'),
    publish: 'never',
    config: Object.assign({}, pkg.build, { directories: { output: path.relative(ROOT, OUT) }, files }),
  });
  const unpacked = path.join(OUT, 'win-unpacked');
  if (!T.steamworks) {
    // không còn sót Steam trong bản đóng gói
    const res = path.join(unpacked, 'resources');
    const asar = require('@electron/asar');
    const left = asar.listPackage(path.join(res, 'app.asar')).filter((f) => /steamworks/i.test(f));
    const loose = path.join(res, 'app.asar.unpacked');
    if (fs.existsSync(loose) && JSON.stringify(fs.readdirSync(loose, { recursive: true })).match(/steam/i)) left.push('app.asar.unpacked/…steam…');
    if (left.length) throw new Error(`build ${T.name}: còn file Steam trong bản đóng gói:\n  ` + left.slice(0, 10).join('\n  '));
  }
  if (!T.zip) return { dir: unpacked };
  // tên thư mục người chơi thấy sau khi giải nén
  fs.renameSync(unpacked, path.join(OUT, FOLDER));
  return { dir: path.join(OUT, FOLDER), entries: [FOLDER], cwd: OUT };
}

(async () => {
  const T = targets.get(process.argv[2]);
  const OUT = path.join(ROOT, 'dist', T.name);
  const ZIP = path.join(ROOT, 'dist', `street-football-chaos-${T.name}-${pkg.version}.zip`);
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.rmSync(ZIP, { force: true });
  const out = T.target === 'web' ? await web(T, OUT) : await desktop(T, OUT);
  let line = `${T.name} build (${T.target} · ${T.store}${T.demo ? ' · DEMO' : ''}): ${path.relative(ROOT, out.dir)}`;
  if (T.zip) {
    zip(ZIP, out.cwd || out.dir, out.entries);
    line += ` · ${path.relative(ROOT, ZIP)} (${(fs.statSync(ZIP).size / 1048576).toFixed(2)} MB)`;
  }
  console.log(line);
})().catch((e) => { console.error(e.message || e); process.exit(1); });
