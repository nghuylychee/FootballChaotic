// Ghép nhiều vùng cắt (px sắc) thành 1 ảnh để soi khung hình bằng Chrome headless.
// node tools/sprite-v2/grid.mjs <out.png> <phóng> <số cột> <ảnh>:<x>,<y>,<w>,<h> ...
// Ví dụ (khung 3 của cú đấm sprite v2 nhìn phải trong bảng pilot, ô 104 x 96): node grid.mjs z.png 4 1 out/pilot/pilot.png:312,96,104,96
import { writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const [out, S, cols, ...items] = process.argv.slice(2);
if (!items.length) { console.log('usage: node grid.mjs <out.png> <scale> <cols> <img>:<x>,<y>,<w>,<h> ...'); process.exit(1); }
const s = +S, nc = +cols, tmp = mkdtempSync(join(tmpdir(), 'sfc-grid-'));
const cells = items.map((it) => { const i = it.lastIndexOf(':'), [x, y, w, h] = it.slice(i + 1).split(',').map(Number); return { img: 'file:///' + resolve(it.slice(0, i)).replace(/\\/g, '/'), x, y, w, h }; });
const cw = Math.max(...cells.map((c) => c.w)) * s, ch = Math.max(...cells.map((c) => c.h)) * s;
const W = (cw + 4) * Math.min(nc, cells.length), H = (ch + 4) * Math.ceil(cells.length / nc);
const html = `<html><body style="margin:0;background:#222;display:grid;grid-template-columns:repeat(${nc},${cw}px);gap:4px">` +
  cells.map((c) => `<div style="width:${c.w * s}px;height:${c.h * s}px;overflow:hidden"><img src="${c.img}" style="image-rendering:pixelated;transform-origin:0 0;transform:scale(${s}) translate(${-c.x}px,${-c.y}px)"></div>`).join('') + '</body></html>';
writeFileSync(join(tmp, 'grid.html'), html);
execFileSync(CHROME, ['--headless=new', '--disable-gpu', `--user-data-dir=${join(tmp, 'prof')}`, '--allow-file-access-from-files', `--window-size=${W},${H}`, '--virtual-time-budget=3000', `--screenshot=${resolve(out)}`, 'file:///' + join(tmp, 'grid.html').replace(/\\/g, '/')], { stdio: 'ignore' });
console.log('ok', resolve(out), W + 'x' + H);
