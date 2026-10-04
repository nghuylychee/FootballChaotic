/* afterPack (electron-builder): xoá code chỉ dùng khi dev khỏi bản đóng gói (không đụng file gốc), trong app.asar hoặc resources/app.
 *  - config/build.config.js -> `var SFC_DEV = false;` + SFC_DEMO (bản itch.io: true — build-web.js truyền demo, build-itch.js đặt env SFC_DEMO=1)
 *  - file nào có SFC_DEV: chạy Terser với SFC_DEV = false -> nhánh `if (SFC_DEV)` / `SFC_DEV ? … : …` / `SFC_DEV && …` bị xoá,
 *    comment bị bỏ, tên biến giữ nguyên (không mangle), vẫn xuống dòng để lỗi còn đọc được
 *  - còn sót dấu vết cheat trong bất kỳ file nào -> báo lỗi, dừng build
 */
const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

const DIRS = ['config', 'src'];
// sau khi xoá: file đã qua Terser (không còn comment) không được còn các chữ này. Mọi file khác chỉ kiểm SFC_DEV
const MARKERS = ['SFC_DEV', 'DRILL TEST', 'LEVEL UP TEST', 'Replay the intro', 'testDrill', 'testArea', 'JUMP TO AREA'];

function jsFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? jsFiles(p) : d.name.endsWith('.js') ? [p] : [];
  });
}

async function strip(appDir, { demo = false } = {}) {
  const flagFile = path.join(appDir, 'config', 'build.config.js');
  const files = DIRS.flatMap((d) => jsFiles(path.join(appDir, d))).filter((f) => f !== flagFile);
  const stripped = new Set();
  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    if (!src.includes('SFC_DEV')) continue;
    const out = await minify(src, {
      compress: {
        defaults: false,
        global_defs: { SFC_DEV: false },
        evaluate: true, conditionals: true, dead_code: true, booleans: true, side_effects: true,
      },
      mangle: false,
      format: { beautify: true, comments: false },
    });
    fs.writeFileSync(file, out.code);
    stripped.add(file);
  }
  fs.writeFileSync(flagFile, `var SFC_DEV = false;\nvar SFC_DEMO = ${!!demo};\n`);

  const left = files.flatMap((f) => {
    const src = fs.readFileSync(f, 'utf8');
    return (stripped.has(f) ? MARKERS : ['SFC_DEV']).filter((m) => src.includes(m)).map((m) => `${path.relative(appDir, f)}: ${m}`);
  });
  if (left.length) throw new Error('strip-dev: code dev còn sót trong bản đóng gói:\n  ' + left.join('\n  '));
  console.log(`  • strip-dev: ${stripped.size} file đã xoá nhánh SFC_DEV${demo ? ' · bản DEMO' : ''}`);
}

// asar bật: afterPack chạy sau khi đã gói app.asar -> giải nén ra thư mục tạm, xoá code dev, gói lại.
// .node / .dll (steamworks.js) để ngoài asar (app.asar.unpacked) như electron-builder làm, không thì không nạp được
exports.default = async (context) => {
  const res = path.join(context.appOutDir, 'resources');
  const asarFile = path.join(res, 'app.asar');
  const opts = { demo: process.env.SFC_DEMO === '1' };   // scripts/build-itch.js
  if (!fs.existsSync(asarFile)) return strip(path.join(res, 'app'), opts);
  const asar = require('@electron/asar');
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'sfc-asar-'));
  try {
    asar.extractAll(asarFile, tmp);
    await strip(tmp, opts);
    fs.rmSync(asarFile);
    fs.rmSync(asarFile + '.unpacked', { recursive: true, force: true });
    await asar.createPackageWithOptions(tmp, asarFile, { unpack: '*.{node,dll}' });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  fixIntegrity(context, asar.getRawHeader(asarFile).headerString);
};

// electron-builder ghi hash header của app.asar vào .exe TRƯỚC afterPack -> gói lại thì hash cũ sai.
// Ghi lại hash mới (chỉ bị kiểm khi bật fuse EnableEmbeddedAsarIntegrityValidation). Ký .exe chạy sau afterPack
function fixIntegrity(context, header) {
  if (context.electronPlatformName !== 'win32') return;
  const { NtExecutable, NtExecutableResource } = require('resedit');
  const exe = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.exe`);
  const bin = NtExecutable.from(fs.readFileSync(exe));
  const res = NtExecutableResource.from(bin);
  const entry = res.entries.find((e) => e.type === 'INTEGRITY' && e.id === 'ELECTRONASAR');
  if (!entry) return;
  const hash = require('crypto').createHash('sha256').update(header).digest('hex');
  entry.bin = Buffer.from(JSON.stringify([{ file: path.win32.normalize('resources/app.asar'), alg: 'SHA256', value: hash }]));
  res.outputResource(bin);
  fs.writeFileSync(exe, Buffer.from(bin.generate()));
  console.log('  • strip-dev: đã cập nhật asar integrity trong .exe');
}
exports.strip = strip;
