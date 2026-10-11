/* Bản web: chép các file game chạy cần vào dist/<target>, xoá code dev (strip-debug.js, ghi SFC_STORE / SFC_DEMO), rồi nén ra
 * dist/street-football-chaos-<target>-<version>.zip (version lấy từ package.json; index.html nằm ở gốc zip).
 *   node scripts/build-web.js itch         npm run build:itch-web
 *   node scripts/build-web.js crazygames   npm run build:crazygames
 * Cả 2 đều là bản DEMO (config/demo.config.js: khoá Area 3+ và ONLINE)
 * Không chép: electron/, node_modules/, src/dev/, sandbox.html, tools/, brag-output/, steam_appid.txt
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { strip } = require('./strip-debug');

// store: giá trị SFC_STORE · name: tên thư mục dist/ + tên zip
const TARGETS = {
  itch: { store: 'itch', demo: true, name: 'itch-web' },
  crazygames: { store: 'crazygames', demo: true, name: 'crazygames' },
};
const T = TARGETS[process.argv[2]];
if (!T) {
  console.error(`build-web: cần chọn cửa hàng: ${Object.keys(TARGETS).join(' | ')}`);
  process.exit(1);
}

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'dist', T.name);
const pkg = require(path.join(ROOT, 'package.json'));
const ZIP = path.join(ROOT, 'dist', `street-football-chaos-${T.name}-${pkg.version}.zip`);
const COPY = ['index.html', 'css', 'config', 'src', 'assets', 'lib'];
const SKIP = [path.join('src', 'dev')];

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.rmSync(ZIP, { force: true });
  for (const rel of COPY) {
    fs.cpSync(path.join(ROOT, rel), path.join(OUT, rel), {
      recursive: true,
      filter: (src) => !SKIP.includes(path.relative(ROOT, src)),
    });
  }
  await strip(OUT, { store: T.store, demo: T.demo });

  // tar của Windows (bsdtar) nén được zip, đường dẫn trong zip dùng '/'
  const entries = fs.readdirSync(OUT);
  if (process.platform === 'win32') {
    execFileSync(path.join(process.env.SystemRoot, 'System32', 'tar.exe'), ['-a', '-c', '-f', ZIP, ...entries], { cwd: OUT });
  } else {
    execFileSync('zip', ['-qr', ZIP, ...entries], { cwd: OUT });
  }
  const mb = (fs.statSync(ZIP).size / 1048576).toFixed(2);
  console.log(`${T.name} build: ${path.relative(ROOT, OUT)} · ${path.relative(ROOT, ZIP)} (${mb} MB)`);
})().catch((e) => { console.error(e.message || e); process.exit(1); });
