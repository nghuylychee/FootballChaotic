/* Bản web (itch.io): chép các file game chạy cần vào dist/web, xoá code dev giống bản Steam (strip-dev.js), bật bản DEMO
 * (SFC_DEMO, config/demo.config.js: khoá Area 3+ và ONLINE), rồi nén ra
 * dist/street-football-chaos-web.zip (index.html nằm ở gốc zip, đúng kiểu itch.io cần).
 * npm run itch-web
 * Không chép: electron/, node_modules/, src/dev/, sandbox.html, tools/, brag-output/, steam_appid.txt
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { strip } = require('./strip-dev');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'dist', 'web');
const ZIP = path.join(ROOT, 'dist', 'street-football-chaos-web.zip');
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
  await strip(OUT, { demo: true });

  // tar của Windows (bsdtar) nén được zip, đường dẫn trong zip dùng '/'
  const entries = fs.readdirSync(OUT);
  if (process.platform === 'win32') {
    execFileSync(path.join(process.env.SystemRoot, 'System32', 'tar.exe'), ['-a', '-c', '-f', ZIP, ...entries], { cwd: OUT });
  } else {
    execFileSync('zip', ['-qr', ZIP, ...entries], { cwd: OUT });
  }
  const mb = (fs.statSync(ZIP).size / 1048576).toFixed(2);
  console.log(`Web build: ${path.relative(ROOT, OUT)} · ${path.relative(ROOT, ZIP)} (${mb} MB)`);
})().catch((e) => { console.error(e.message || e); process.exit(1); });
