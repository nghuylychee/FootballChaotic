// Xuất ảnh trang itch.io: mở generate.html trong Chrome headless (cùng cách các script tools/sprite-v2), chờ generate.js vẽ xong,
// ghi mọi file vào tools/itch-page/out. Cần server game đang chạy: npm run serve (đổi địa chỉ: biến SPRITE_URL). Chrome: biến CHROME
// Chạy: node tools/itch-page/export.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openGame } from '../sprite-v2/cdp.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), 'out');
const BASE = process.env.SPRITE_URL || 'http://localhost:8080';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const { ev, send, close, errors } = await openGame(9431);
await send('Page.navigate', { url: BASE + '/tools/itch-page/generate.html' });
// chỉ vẽ ảnh tĩnh: vài giây
let done = false;
for (let i = 0; i < 600 && !done; i++) {
  await sleep(1000);
  const st = await ev('window.__error || (window.__done ? "done" : "")');
  if (st && st !== 'done') { console.error(st); close(); process.exit(1); }
  done = st === 'done';
}
if (!done) { console.error('generate.html: hết giờ chờ'); close(); process.exit(1); }
const names = await ev('Object.keys(window.__files)');
mkdirSync(OUT, { recursive: true });
for (const n of names) {
  const v = await ev(`window.__files[${JSON.stringify(n)}]`);
  writeFileSync(join(OUT, n), n.endsWith('.png') ? Buffer.from(v.split(',')[1], 'base64') : v);
}
console.log(`itch-page: ${names.length} file -> ${OUT}`);
if (errors.length) console.log('lỗi trong trang:', errors);
close();
process.exit(0);
