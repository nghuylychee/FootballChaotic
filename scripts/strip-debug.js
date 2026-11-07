/* afterPack (electron-builder): xoá code chỉ dùng khi dev khỏi bản đóng gói (không đụng file gốc), trong app.asar hoặc resources/app.
 *  - config/build.config.js -> `var SFC_DEBUG = false;` + SFC_STORE + SFC_DEMO theo bản build (scripts/targets.js) + SFC_COMMIT (build.js).
 *    Bản web: scripts/build.js truyền thẳng · afterPack (desktop): đọc env SFC_BUILD (build.js đặt; không đặt = bản steam)
 *  - file nào có SFC_DEBUG: chạy Terser với SFC_DEBUG = false -> nhánh `if (SFC_DEBUG)` / `SFC_DEBUG ? … : …` / `SFC_DEBUG && …` bị xoá,
 *    comment bị bỏ, tên biến giữ nguyên (không mangle), vẫn xuống dòng để lỗi còn đọc được
 *  - SFC_DEMO cũng thành hằng số theo bản build (file có SFC_DEMO qua Terser như trên): nhánh `if (!SFC_DEMO)` bị xoá khỏi bản DEMO
 *    (vd. phần bạn bè của src/platform/crazygames.js -> bản demo không chứa lệnh SDK nó không dùng)
 *  - còn sót dấu vết cheat trong bất kỳ file nào / lệnh SDK bạn bè trong bản DEMO -> báo lỗi, dừng build
 */
const fs = require('fs');
const path = require('path');
const { minify } = require('terser');
const targets = require('./targets');

const DIRS = ['config', 'shared', 'src'];
// sau khi xoá: file đã qua Terser (không còn comment) không được còn các chữ này. Mọi file khác chỉ kiểm SFC_DEBUG
const MARKERS = ['SFC_DEBUG', 'GAMEPLAY TEST', 'Replay the intro', 'testArea', 'JUMP TO AREA', 'ULT TEST', 'STORY TEST', 'RUN TEST'];
// bản DEMO: lệnh SDK CrazyGames của phần bạn bè không được còn trong file đã qua Terser
const DEMO_MARKERS = ['updateRoom', 'leftRoom', 'inviteLink', 'addJoinRoomListener', 'inviteParams', 'isInstantMultiplayer'];

function jsFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? jsFiles(p) : d.name.endsWith('.js') ? [p] : [];
  });
}

async function strip(appDir, { store, demo = false, commit = '' } = {}) {
  if (!targets.STORES[store]) throw new Error(`strip-debug: cửa hàng không hợp lệ: ${store}`);
  const flagFile = path.join(appDir, 'config', 'build.config.js');
  const files = DIRS.flatMap((d) => jsFiles(path.join(appDir, d))).filter((f) => f !== flagFile);
  const stripped = new Set();
  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    if (!src.includes('SFC_DEBUG') && !src.includes('SFC_DEMO')) continue;
    const out = await minify(src, {
      compress: {
        defaults: false,
        global_defs: { SFC_DEBUG: false, SFC_DEMO: !!demo },
        evaluate: true, conditionals: true, dead_code: true, booleans: true, side_effects: true,
      },
      mangle: false,
      format: { beautify: true, comments: false },
    });
    fs.writeFileSync(file, out.code);
    stripped.add(file);
  }
  // phiên bản game = package.json của repo (bản dev ghi 'dev')
  const version = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')).version;
  fs.writeFileSync(flagFile, `var SFC_DEBUG = false;\nvar SFC_STORE = ${JSON.stringify(store)};\nvar SFC_DEMO = ${!!demo};\nvar SFC_VERSION_STRING = ${JSON.stringify(version)};\nvar SFC_COMMIT = ${JSON.stringify(commit || '')};\n`);

  const left = files.flatMap((f) => {
    const src = fs.readFileSync(f, 'utf8');
    const marks = stripped.has(f) ? MARKERS.concat(demo ? DEMO_MARKERS : []) : ['SFC_DEBUG'];
    return marks.filter((m) => src.includes(m)).map((m) => `${path.relative(appDir, f)}: ${m}`);
  });
  if (left.length) throw new Error('strip-debug: code dev còn sót trong bản đóng gói:\n  ' + left.join('\n  '));
  console.log(`  • strip-debug: ${stripped.size} file đã xoá nhánh SFC_DEBUG / SFC_DEMO · ${store}${demo ? ' · DEMO' : ''}`);
}

// asar bật: afterPack chạy sau khi đã gói app.asar -> giải nén ra thư mục tạm, xoá code dev, gói lại.
// .node / .dll (steamworks.js) để ngoài asar (app.asar.unpacked) như electron-builder làm, không thì không nạp được
exports.default = async (context) => {
  const res = path.join(context.appOutDir, 'resources');
  const asarFile = path.join(res, 'app.asar');
  const T = targets.get(process.env.SFC_BUILD || 'steam');   // scripts/build.js đặt env
  const opts = { store: T.store, demo: T.demo, commit: process.env.SFC_COMMIT };   // build.js đặt SFC_COMMIT
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
  console.log('  • strip-debug: đã cập nhật asar integrity trong .exe');
}
exports.strip = strip;
