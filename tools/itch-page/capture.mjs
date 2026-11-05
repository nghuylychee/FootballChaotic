// Ảnh chụp trong game thật cho trang itch.io (1920x1080, có HUD): map GOAT PATH · màn MATCHDAY · chọn Core · khoảnh khắc trong trận.
// Chạy 1 run mới, vào 1 trận thường của act 1, AI đá thay ghế người chơi (Game.dropSeat, như người chơi online rớt mạng);
// tới lúc chọn Core thì trả ghế lại để màn CORE UPGRADE hiện ra. Ảnh trận chỉ giữ khung "nhiều hành động" (cách chấm như generate.js)
// và bỏ khung bị phủ tối. Ghi ứng viên vào <outDir>, chọn tay rồi chép vào tools/itch-page/out/shot-*.png.
// Cần server: bản demo đã build (npm run build:itch-web, phục vụ dist/itch-web) hoặc npm run serve; địa chỉ: biến SPRITE_URL. Chrome: biến CHROME
// Chạy: node tools/itch-page/capture.mjs <outDir> [giây]
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { openGame } from '../sprite-v2/cdp.mjs';

const out = process.argv[2];
if (!out) { console.error('dùng: node tools/itch-page/capture.mjs <outDir> [giây]'); process.exit(1); }
const SECONDS = +process.argv[3] || 300;
mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const { ev, close, errors, send } = await openGame(9432);
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1.5, mobile: false });   // 1920x1080, 1 px game = 3 px ảnh
const key = async (code, k, vk) => { await send('Input.dispatchKeyEvent', { type: 'keyDown', code, key: k, windowsVirtualKeyCode: vk }); await send('Input.dispatchKeyEvent', { type: 'keyUp', code, key: k, windowsVirtualKeyCode: vk }); };
// chụp + độ sáng trung bình của ảnh (giải mã ngay trong trang)
const shot = async () => {
  const data = (await send('Page.captureScreenshot', { format: 'png' })).result.data;
  const lum = await ev(`new Promise((ok) => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = 192; c.height = 108;
    const x = c.getContext('2d'); x.drawImage(im, 0, 0, 192, 108); const d = x.getImageData(0, 0, 192, 108).data; let s = 0;
    for (let i = 0; i < d.length; i += 4) s += d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11; ok(s / (d.length / 4)); }; im.src = 'data:image/png;base64,${data}'; })`);
  return { data, lum };
};
const save = (name, s) => writeFileSync(join(out, name + '.png'), Buffer.from(s.data, 'base64'));

await key('Enter', 'Enter', 13); await sleep(800);   // lần đầu mở: chọn ngôn ngữ English
await ev("SFC.Profile.setName('KAI')");
// run mới, bỏ thẻ mở act + cut-scene mở đầu
await ev(`(() => {
  const Run = SFC.Run, roles = Run.roles('MID'), c = Run.candidates(), mates = {};
  roles.slice(1).forEach((r, i) => { mates[r] = c[i]; });
  const R = Run.start(mates, roles[0]); R.actNew = false; R.seen.push('intro:0'); SFC.Profile.save(); return 1;
})()`);
await ev("SFC.app.toMenu('home')"); await sleep(300);
await ev("SFC.Menu.go('runmap')"); await sleep(1500);
save('map', await shot());

console.log(await ev(`(() => { const n = SFC.Run.available().find((x) => x.kind === 'match'); if (!n) return 'không có nút trận'; SFC.Run.enter(n.id); SFC.app.startRunMatch(); return 'trận với ' + n.team; })()`));
await sleep(2500);   // màn MATCHDAY: chờ thẻ 2 đội trượt vào xong
save('vs', await shot());
for (let i = 0; i < 40; i++) {
  if ((await ev('SFC.app.game && SFC.app.game.state')) === 'play') break;
  await key('Enter', 'Enter', 13); await sleep(500);
}
await ev('(() => { const g = SFC.app.game; g.dropSeat(g.me); return 1; })()');

// "độ hành động" của 1 khung (như tools/itch-page/generate.js): người bay / choáng / ra đòn, bóng có hiệu ứng, hạt, 1–2 chữ bật ra
const SCORE = `(() => {
  const g = SFC.app.game; if (!g || g.state !== 'play') return -1;
  const O = g.effects.O || {};
  if ((O.tints && O.tints.length) || O.impact > 0 || g.effects.flashA > 0.02) return -1;
  let s = 0;
  for (const p of g.players) { if (p.airZ > 3) s += 3; if (p.state === 'stun') s += 1; if (p.atkType === 'hard' || p.atkType === 'light') s += 1.5; }
  const fx = g.ball.fx || {}; if (fx.fire || fx.thunder || fx.meteor || g.ball.skin) s += 2;
  s += Math.min(5, g.effects.particles.length / 12);
  const c = ((g.effects.V && g.effects.V.pops) || []).length; s += c === 0 ? 0 : c <= 2 ? 3 : 3 - (c - 2) * 2.5;
  return s;
})()`;
let n = 0, best = 6, drafts = 0;
const lums = [];
const t0 = Date.now();
while (Date.now() - t0 < SECONDS * 1000 && n < 30) {
  await sleep(120);
  const st = JSON.parse(await ev("JSON.stringify((() => { const g = SFC.app.game; return g ? { state: g.state, draft: !!g.draft, gone: !!(g.seats[g.me] || {}).gone, t: g.time } : null; })())"));
  if (!st || st.state === 'ended') break;
  // bàn thắng: trả ghế cho người chơi để màn chọn Core hiện ra -> chụp (2 lần đầu), chọn lá 1, lại giao cho AI
  if (st.state === 'goal' && st.gone) await ev('(() => { const g = SFC.app.game; g.resumeSeat(g.me); return 1; })()');
  if (st.draft && !st.gone) {
    await sleep(900);
    if (drafts < 2) save(`draft-${drafts++}`, await shot());
    await key('Digit1', '1', 49); await sleep(300);
    await ev('(() => { const g = SFC.app.game; if (!g.draft) g.dropSeat(g.me); return 1; })()');
    continue;
  }
  if (st.state === 'play' && !st.gone) await ev('(() => { const g = SFC.app.game; g.dropSeat(g.me); return 1; })()');
  if (st.t < 6) continue;   // vài giây đầu: thẻ luật trận che sân
  const s = await ev(SCORE);
  if (s < best) continue;
  const img = await shot();
  // khung bị phủ tối (tối hơn hẳn các khung đã giữ) -> bỏ
  const med = lums.length ? lums.slice().sort((a, b) => a - b)[lums.length >> 1] : img.lum;
  if (img.lum < med * 0.8) continue;
  lums.push(img.lum);
  best = Math.max(best, s - 2);
  save(`match-${String(n++).padStart(2, '0')}-s${Math.round(s)}`, img);
}
console.log(`capture: map, vs, ${drafts} draft, ${n} match -> ${out}`);
if (errors.length) console.log('lỗi trong trang:', errors);
close();
process.exit(0);
