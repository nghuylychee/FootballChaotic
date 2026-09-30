/* afterPack (electron-builder): xoá code chỉ dùng khi dev khỏi bản đóng gói (không đụng file gốc).
 *  - config/build.config.js -> `var SFC_DEV = false;`
 *  - file nào có SFC_DEV: chạy Terser với SFC_DEV = false -> nhánh `if (SFC_DEV)` / `SFC_DEV ? … : …` / `SFC_DEV && …` bị xoá,
 *    comment bị bỏ, tên biến giữ nguyên (không mangle), vẫn xuống dòng để lỗi còn đọc được
 *  - còn sót dấu vết cheat trong bất kỳ file nào -> báo lỗi, dừng build
 */
const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

const DIRS = ['config', 'src'];
// sau khi xoá: file đã qua Terser (không còn comment) không được còn các chữ này. Mọi file khác chỉ kiểm SFC_DEV
const MARKERS = ['SFC_DEV', 'DRILL TEST', 'LEVEL UP TEST', 'TEST FTUE', 'testDrill'];

function jsFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? jsFiles(p) : d.name.endsWith('.js') ? [p] : [];
  });
}

async function strip(appDir) {
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
  fs.writeFileSync(flagFile, 'var SFC_DEV = false;\n');

  const left = files.flatMap((f) => {
    const src = fs.readFileSync(f, 'utf8');
    return (stripped.has(f) ? MARKERS : ['SFC_DEV']).filter((m) => src.includes(m)).map((m) => `${path.relative(appDir, f)}: ${m}`);
  });
  if (left.length) throw new Error('strip-dev: code dev còn sót trong bản đóng gói:\n  ' + left.join('\n  '));
  console.log(`  • strip-dev: ${stripped.size} file đã xoá nhánh SFC_DEV`);
}

exports.default = (context) => strip(path.join(context.appOutDir, 'resources', 'app'));
exports.strip = strip;
