// Thủ môn: ôm bóng + tung bóng lên đá (bản nháp drafts/keeper.js) -> out/keeper/index.html + keeper.png
// Mỗi động tác 1 hàng = tên + 1 câu + vòng lặp (nhìn ngang, nhìn xuống). Cần server game (npm run serve).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { openGame, PAGE_COMMON, HERE, OUT } from './cdp.mjs';

const DIR = join(OUT, 'keeper');
mkdirSync(DIR, { recursive: true });
const { ev, close, errors } = await openGame(9381);
await ev(readFileSync(join(HERE, 'drafts', 'keeper.js'), 'utf8'));
const res = await ev(`(() => {
  ${PAGE_COMMON}
  const S = SFC.PlayerSprite, K = S.KEEPER, FPS = 30, CW = 300, CH = 128, FY = 52, HALF = 75, kit = HOME, look = lookOf();
  const kc = S.kitColors(kit, look);
  // o như drawPlayer dựng cho thủ môn (găng màu phụ của đội)
  const base = (anim, extra) => Object.assign({ skin: look.skin, hair: look.hair, band: kc.band, cut: look.cut, face: look.face, shoes: look.shoes, fx: null,
    shirt: kit.shirt, shirtD: kit.shirtDark, shorts: kc.shorts, sock: '#ecebe6', shoe: '#e8e8e8', sole: '#b9c2d0', moving: false, anim, glove: kc.glove }, extra);
  // 2 nửa ô: nhìn ngang (trái), nhìn xuống (phải); bóng bay ra khỏi nửa nào thì cắt ở đó
  const VIEWS = [[28, DIRS.side, 0], [HALF + 36, DIRS.front, HALF]];
  const row = (dur, fn) => ({ n: Math.round(dur * FPS), draw: (c, k) => VIEWS.forEach(([x, face, x0]) => {
    const t = k / FPS, st = fn(face, t);
    c.save(); c.beginPath(); c.rect(x0, 0, HALF, CH / 2); c.clip();
    K.figure(c, x, FY, face, base(t, st.moving ? { moving: true } : {}), st);
    c.restore();
  }) });
  // đổ người bắt bóng: 2 người cùng nhìn phải, trái bay lên (chân từ y 58), phải bay xuống phía máy quay (chân từ y 30)
  const diveRow = { n: Math.round(K.DIVE_CATCH.end * FPS), label: 'diving up the screen, then diving toward the camera', draw: (c, k) => [[28, 0, true, 58], [HALF + 28, HALF, false, 30]].forEach(([x, x0, up, y0]) => {
    const t = k / FPS;
    c.save(); c.beginPath(); c.rect(x0, 0, HALF, CH / 2); c.clip();
    K.diveCatch(c, x, y0, DIRS.side, base(t), t, up);
    c.restore();
  }) };
  // tốc độ đổ người: 3 người nhìn phải bay lên cùng quãng, mỗi người 1/3 ô
  const speedRow = { n: Math.round(K.DIVE_SPEED.end * FPS), label: 'today, eased in the same time, eased and never faster than today', draw: (c, k) => ['today', 'ease', 'easeSlow'].forEach((mode, i) => {
    const t = k / FPS, w = CW / 6, x0 = i * w;
    c.save(); c.beginPath(); c.rect(x0, 0, w, CH / 2); c.clip();
    K.diveSpeed(c, x0 + w / 2 + 4, 60, DIRS.side, base(t), t, mode);
    c.restore();
  }) };
  // đứng dậy sau khi đổ người: trái bay lên, phải bay xuống phía máy quay
  const getupRow = { n: Math.round(K.GETUP.end * FPS), label: 'diving up the screen, then diving toward the camera', draw: (c, k) => [[28, 0, true, 58], [HALF + 28, HALF, false, 28]].forEach(([x, x0, up, y0]) => {
    const t = k / FPS;
    c.save(); c.beginPath(); c.rect(x0, 0, HALF, CH / 2); c.clip();
    K.diveGetUp(c, x, y0, DIRS.side, base(t), t, up);
    c.restore();
  }) };
  const HOLD = 0.4;
  const ROWS = [
    ['hold', 'G1 · Catch and hold', 'Arms come forward to meet the ball, then pull it into the chest while the knees give a little. He then holds it in both gloves and breathes.', row(K.CATCH.end, (f, t) => K.catchState(f, t))],
    ['hold', 'G3 · Dive and catch', 'Left: diving up the screen. Right: diving toward the camera. Mid-flight the ball meets his chest and both gloves wrap it, he lands on his side clutching it, then gets up still holding it.', diveRow],
    ['hold', 'G2 · Walking with the ball', 'The ball stays in both gloves while he moves: legs run as today, arms stay locked around the ball.', row(1, (f, t) => Object.assign(K.holdState(K.view(f), t, true), { moving: true }))],
    ['release', 'K1 · Flick and punt (clearance)', 'His left glove flicks the ball up, the right leg cocks back while it drops, then a big swing sends it high. He leans back and hops.', row(HOLD + 0.95, (f, t) => K.releaseState('gkPunt', f, t, HOLD))],
    ['release', 'K2 · Flick and volley (pass)', 'A smaller flick, a short swing at knee height, and the ball goes out flat and fast. No hop.', row(HOLD + 0.75, (f, t) => K.releaseState('gkVolley', f, t, HOLD))],
    ['block', 'B1 · Block, then save', 'A shot straight at him: just before it arrives he spreads both arms up in a V and plants his legs wide, then gathers the ball into his chest and holds it, as in G1.', row(K.BLOCK.end, (f, t) => K.blockState(f, t, 'save'))],
    ['block', 'B2 · Block, then parry', 'Same block. The ball bounces back out off him, forward and up. He holds the spread for a moment, then lowers his arms.', row(K.BLOCK.end, (f, t) => K.blockState(f, t, 'parry'))],
    ['block', 'B3 · Block, then miss', 'Same block. The ball goes straight past him into the goal, passing behind his body. He holds the spread, then recovers.', row(K.BLOCK.end, (f, t) => K.blockState(f, t, 'miss'))],
    ['speed', 'D · Dive speed', 'The same 34 px dive three ways; white ticks mark takeoff and landing. Left: today, a constant 250 px/s for 0.14 s. Middle (picked): slow at takeoff, fastest halfway, slow at landing, in the same 0.14 s (peaks at 375 px/s). Right: the same curve, never faster than today, so the dive takes 0.20 s.', speedRow],
    ['speed', 'D2 · Getting up', 'Flies with the picked speed curve. From landing on, every step is a real pose on the pixel grid, with no squash or tilt: slams down and bounces, lies with arms still over his head, gets onto all fours with both gloves planted, pushes up, kneels upright with the gloves on his thighs, crouches, stands. 0.60 s from landing to standing (today 0.22 s, a squash fading back). Left: diving up the screen. Right: diving toward the camera.', getupRow],
  ];
  const N = Math.max(...ROWS.map((r) => r[3].n));
  const img = sheet(N, ROWS.length, CW, CH, (k, r) => (k < ROWS[r][3].n ? [false, (c) => ROWS[r][3].draw(c, k), 0] : null), 0);
  return { img, cw: CW, ch: CH, fps: FPS, rows: ROWS.map(([sec, name, desc, row]) => ({ sec, name, desc, n: row.n, label: row.label || 'facing right, then facing down' })) };
})()`);
if (!res) { console.log('failed', errors); close(); process.exit(1); }
writeFileSync(join(DIR, 'keeper.png'), Buffer.from(res.img.split(',')[1], 'base64'));
writeFileSync(join(DIR, 'keeper.json'), JSON.stringify({ cw: res.cw, ch: res.ch, fps: res.fps, rows: res.rows }, null, 1));
const SEC = {
  hold: ['Holding the ball', 'From the save until he lets go. Today he keeps the ball at his feet like an outfield player.'],
  release: ['Releasing the ball', 'Both start from the hold: the left glove flicks the ball up and the right foot strikes it on the drop. The kick plays the same whether he passes or clears.'],
  block: ['Blocking a straight shot (new)', 'For shots that come straight at him he no longer dives. In the game today a straight save already plays G1, and a straight parry or miss plays nothing special; these rows would fill that gap.'],
  speed: ['Diving', 'Dive speed changes gameplay as well as the look: how fast the keeper travels during a dive. Getting up is only the look; he can already move again as soon as he lands.'],
};
const Z = 3, N = Math.max(...res.rows.map((r) => r.n));
let body = '';
for (const sec of Object.keys(SEC)) {
  body += `<section><h2>${SEC[sec][0]}</h2><p class="sub">${SEC[sec][1]}</p>`;
  res.rows.forEach((r, i) => {
    if (r.sec !== sec) return;
    body += `<div class="row"><div class="txt"><b>${r.name}</b><span>${r.desc}</span></div>
      <div class="loop" role="img" aria-label="${r.name}, ${r.label}" style="width:${res.cw * Z}px;height:${res.ch * Z}px;background-position:0 ${-i * res.ch * Z}px;--end:${-res.cw * Z * r.n}px;--dur:${(r.n / res.fps).toFixed(3)}s;--n:${r.n}"></div></div>`;
  });
  body += '</section>';
}
const html = `<title>Keeper Ball Moves</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
/* 1 cột: mỗi động tác 1 thẻ = chữ + vòng lặp sprite (phóng x${Z}, pixel giữ sắc) */
:root { --bg: #f2f3ee; --fg: #1a1d18; --mute: #646a5e; --card: #ffffff; --line: #dfe2d8; --pitch: #3d6b3f; --focus: #2f6b3a; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #141713; --fg: #e9ece4; --mute: #9aa192; --card: #1d211b; --line: #2d3329; --focus: #8fd19a; color-scheme: dark; } }
:root[data-theme="dark"] { --bg: #141713; --fg: #e9ece4; --mute: #9aa192; --card: #1d211b; --line: #2d3329; --focus: #8fd19a; color-scheme: dark; }
body { background: var(--bg); color: var(--fg); font: 15px/1.45 system-ui, sans-serif; }
.wrap { max-width: 1000px; margin: 0 auto; padding-block: 24px 48px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
h1 { font-size: 24px; margin: 0 0 4px; text-wrap: balance; } h2 { font-size: 18px; margin: 32px 0 2px; text-wrap: balance; }
.sub, .lede { color: var(--mute); margin: 0 0 12px; max-width: 65ch; }
button { font: inherit; padding: 4px 12px; border: 1px solid var(--line); background: var(--card); color: var(--fg); border-radius: 6px; cursor: pointer; }
button:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
button[aria-pressed="true"] { border-color: var(--fg); }
.row { display: flex; gap: 16px; align-items: center; background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: 10px; margin: 8px 0; flex-wrap: wrap; }
.txt { flex: 1 1 220px; min-width: 0; display: flex; flex-direction: column; gap: 2px; } .txt span { color: var(--mute); font-size: 14px; }
.loop { flex: none; max-width: 100%; background-image: url(keeper.png?v=${Date.now()}); background-size: ${res.cw * Z * N}px auto; image-rendering: pixelated; background-color: var(--pitch); border-radius: 4px;
  animation: play var(--dur) steps(var(--n)) infinite; }
.slow .loop { animation-duration: calc(var(--dur) * 4); }
@keyframes play { from { background-position-x: 0; } to { background-position-x: var(--end); } }
@media (prefers-reduced-motion: reduce) { .loop { animation: none; } }
</style>
<div class="wrap" id="w"><h1>Keeper ball moves</h1><p class="lede">Proposals for after a save: holding the ball, then flicking it up and kicking it. Loops play at game speed; each shows facing right, then facing down, unless its text says otherwise. <button id="sp" type="button" aria-pressed="false">¼ speed</button></p>${body}</div>
<script>const b = document.getElementById('sp'); b.onclick = () => { const on = document.getElementById('w').classList.toggle('slow'); b.setAttribute('aria-pressed', on); };</script>`;
writeFileSync(join(DIR, 'index.html'), html);
console.log('keeper ok', res.rows.length, 'rows', errors.length ? errors : 'no errors');
close();
