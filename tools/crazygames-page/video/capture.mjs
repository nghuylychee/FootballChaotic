// Quay 1 cảnh cho video xem trước CrazyGames: mở game trong Chrome headless, đồng hồ giả, chạy cảnh trong scenes.js
// (mọi cầu thủ do kịch bản điều khiển), mỗi khung video (30 fps = 2 bước mô phỏng 60 Hz) chép canvas trận 1x (px game, chưa phóng).
// Ra: frames/<cảnh>/NNNN.png + meta.json (vị trí người / bóng mỗi khung, mốc thời gian của kịch bản) -> compose.mjs dựng video.
// Cần server game: npm run serve (đổi địa chỉ: biến SPRITE_URL)
// Chạy: node tools/crazygames-page/video/capture.mjs <cảnh> <giây> [seed]
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { open, sleep } from './chrome.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FPS = 30, TICKS = 2;   // 2 bước 60 Hz mỗi khung
const [scene, secs, seedArg] = process.argv.slice(2);
if (!scene || !secs) { console.error('node capture.mjs <cảnh> <giây> [seed]'); process.exit(1); }
const seed = Number(seedArg || 7);

// chạy trước mọi script của trang: Math.random có seed, đồng hồ giả (rAF không bao giờ chạy: capture tự gọi mô phỏng + vẽ), hồ sơ đã xong PROLOGUE
const PROFILE = { v: 2, name: 'PLAYER', level: 12, xp: 0, gold: 0, items: {}, cores: {}, tut: { done: true, heirloom: true },
  stats: { matches: 40, wins: 25, draws: 5, losses: 10, goals: 88, boxes: 3 } };
const INIT = `(() => {
  let s = ${seed} >>> 0;
  Math.random = function () { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  let now = 0; const t0 = Date.UTC(2026, 0, 1);
  window.__clk = { get now() { return now; }, add(ms) { now += ms; } };
  performance.now = () => now;
  Date.now = () => t0 + now;
  window.requestAnimationFrame = () => 0;
  window.cancelAnimationFrame = () => {};
  window.Worker = function () { return { postMessage() {}, terminate() {} }; };
  localStorage.setItem('sfc_profile_v1', ${JSON.stringify(JSON.stringify(PROFILE))});
  localStorage.setItem('sfc_settings', JSON.stringify({ lang: 'en', music: 0, sfx: 0 }));
})();`;

const { ev, errors, close } = await open('/index.html?lang=en', { port: 9433, init: INIT });
try {
  for (let i = 0; i < 100; i++) { if (await ev('!!(window.SFC && SFC.app && SFC.Renderer && SFC.Renderer.canvas && SFC.Menu && SFC.Menu.page)').catch(() => false)) break; await sleep(200); }
  await ev('document.fonts.ready.then(() => true)');
  await ev(readFileSync(join(HERE, 'scenes.js'), 'utf8'));
  await ev(`CGV.setup(${JSON.stringify(scene)}), true`);

  const out = join(HERE, 'frames', scene);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const n = Math.round(Number(secs) * FPS), meta = [];
  for (let i = 0; i < n; i++) {
    const r = await ev(`CGV.step(${i / FPS}, ${TICKS})`);
    meta.push(r.info);
    writeFileSync(join(out, String(i).padStart(4, '0') + '.png'), Buffer.from(r.png.split(',')[1], 'base64'));
  }
  const marks = await ev('CGV.marks');
  const size = await ev('[SFC.Renderer.canvas.width, SFC.Renderer.canvas.height]');
  writeFileSync(join(out, 'meta.json'), JSON.stringify({ fps: FPS, size, frames: meta, marks }));
  console.log(scene, 'frames', n, 'size', size.join('x'), 'marks', JSON.stringify(marks), 'score', JSON.stringify(meta[meta.length - 1]?.score));
  if (errors.length) console.log('lỗi trong trang:', [...new Set(errors)].slice(0, 10));
} finally {
  close();
}
process.exit(0);
