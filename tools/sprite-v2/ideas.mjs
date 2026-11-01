// Ý tưởng chuyền / chạy nước rút / sút mạnh (bản nháp drafts/ideas.js) -> out/ideas/index.html + out/ideas/*.png
// Trang gọn: mỗi ý tưởng 1 hàng = tên + 1 câu + vòng lặp (nhìn ngang, nhìn xuống). Cần server game (npm run serve).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { openGame, PAGE_COMMON, HERE, OUT } from './cdp.mjs';

const DIR = join(OUT, 'ideas');
mkdirSync(DIR, { recursive: true });
const { ev, close, errors } = await openGame(9380);
await ev(readFileSync(join(HERE, 'drafts', 'ideas.js'), 'utf8'));
const res = await ev(`(() => {
  ${PAGE_COMMON}
  const S = SFC.PlayerSprite, I = S.IDEAS, FPS = 30, CW = 240, CH = 112, kit = HOME, look = lookOf();
  // o như drawPlayer dựng (player.js), cho S.draw vẽ thẳng với atk tự chọn
  const makeO = (facing, anim, extra) => {
    const kc = S.kitColors(kit, look);
    return Object.assign({ facing, skin: look.skin, hair: look.hair, band: kc.band, cut: look.cut, face: look.face, shoes: look.shoes, fx: null,
      shirt: kit.shirt, shirtD: kit.shirtDark, shorts: kc.shorts, sock: '#ecebe6', shoe: '#e8e8e8', sole: '#b9c2d0', moving: false, anim }, extra);
  };
  const fine = (c, fn) => { c.save(); c.scale(0.5, 0.5); fn(); c.restore(); };
  const VIEWS = [[30, DIRS.side], [72, DIRS.front]], FY = 44;
  // động tác theo bảng (chuyền / sút mạnh): rest giây đứng rồi chạy timeline; tremble = run theo thanh lực; fx = hiệu ứng sút mạnh
  const kickRow = (kt, T, opt = {}) => {
    const total = T.w + (T.hold || 0) + T.s + T.f + T.o, rest = 0.3, n = Math.ceil((total + rest) * FPS);
    return { n, draw: (c, k) => VIEWS.forEach(([x, face]) => fine(c, () => {
      const t = k / FPS - rest, atk = t >= 0 ? I.timeline(kt, t, T) : {}, X = 2 * x, Y = 2 * FY, m = Math.cos(face) < 0;
      let jx = 0;
      if (opt.tremble && atk.kp === 'in' && atk.hold != null) jx = (k % 2 ? 1 : -1) * Math.round(atk.hold * 1.5);
      if (opt.glow && atk.kp === 'in' && atk.hold != null) I.chargeRing(c, X, Y, atk.hold, k);   // thanh lực: vòng chấm vàng dưới chân
      I.drawWithTorso(c, X + jx, Y, makeO(face, k / FPS, { atk }), face === DIRS.side ? 'side' : 'front');
      if (opt.fx) I.powerFx(c, X, Y, atk, m);
    })) };
  };
  // chạy nước rút: máy vẽ nháp (chỉ nhìn ngang)
  const sprintRow = (frames, fps, lean, head) => ({ n: Math.round((frames.length / fps) * FPS * 2), draw: (c, k) => fine(c, () => I.ideaSprint(c, 60, 2 * FY, makeO(DIRS.side, k / FPS), frames, fps, lean, head)) });
  // bóng 5 x 5 (px thế giới), xoay theo roll
  const BALL = [['.KKK.', 'KWWWK', 'KWKWK', 'KWWWK', '.KKK.'], ['.KKK.', 'KWKWK', 'KWWWK', 'KWKWK', '.KKK.']], BC = { K: '#140c16', W: '#f4f1e8' };
  const ball = (c, x, y, z, roll) => {
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(Math.round(x) - 2, Math.round(y) + 2, 5, 1);
    BALL[Math.floor(roll) % 2].forEach((r, j) => { for (let i = 0; i < 5; i++) if (r[i] !== '.') { c.fillStyle = BC[r[i]]; c.fillRect(Math.round(x) - 2 + i, Math.round(y) - 2 - z + j, 1, 1); } });
  };
  // đà sút khi đang chạy nạp lực. Bấm sút lúc t = 0, thanh bắt đầu từ BASE, đầy sau (1 - BASE) x 0.8 s. Dưới ngưỡng THR: dắt bóng
  // chậm lại như hôm nay. Qua ngưỡng: chạm đẩy bóng (PUSH), bóng lăn chậm dần (giảm theo hàm mũ, hệ số K), người bước nặng (HEAVY)
  // đuổi kịp sau RUN giây (bóng lại cách chân 9 px) rồi mới vung sút mạnh, dù thả phím lúc nào (REL = mức thanh lúc thả).
  // Nhìn ngang chạy qua ô, nhìn xuống chạy tại chỗ (khoảng cách bóng vẽ theo chiều dọc). Thanh lực nhỏ ở góc trên trái
  const runupRow = () => {
    const CT = 0.8, BASE = 0.15, THR = 0.6, REL = 0.8, RUN = 0.4, SPD = 55, rest = 0.25;
    const tThr = (THR - BASE) * CT, tRel = (REL - BASE) * CT, tHit = tThr + RUN;
    const T = Object.assign({}, I.POWER_T, { w: 0.0001, hold: 0 }), strike = T.s + T.f + T.o;
    const PUSH = { w: 0.03, s: 0.04, f: 0.04, o: 0.05, lf: 1, calm: true }, pushEnd = PUSH.w + PUSH.s + PUSH.f + PUSH.o, tp = PUSH.w + PUSH.s * 0.6;
    const K = 10, dt = RUN - tp, V0 = (SPD * dt * K) / (1 - Math.exp(-K * dt));
    const gap = (u) => (u <= tp ? 9 : 9 + (V0 / K) * (1 - Math.exp(-K * (u - tp))) - SPD * (u - tp));
    const n = Math.ceil((rest + tHit + strike + 0.25) * FPS);
    const dribble = (c, X, Y, face, t, view) => I.drawWithTorso(c, X, Y, makeO(face, t, { moving: true }), view);
    // dáng sau ngưỡng: chạm đẩy bóng rồi bước nặng
    const runner = (c, X, Y, face, u, view) => {
      if (u < pushEnd) I.drawWithTorso(c, X, Y, makeO(face, u, { atk: I.timeline('passPush', u, PUSH) }), view);
      else if (view === 'side') I.ideaSprint(c, X, Y, makeO(face, u - pushEnd), I.HEAVY, 9, 2, 2);
      else { const f = Math.floor((u - pushEnd) * 9) % 4; I.drawWithTorso(c, X, Y, makeO(face, u, { moving: true, cp: f % 2 === 0 ? { drop: 1 } : null }), view); }
    };
    const bar = (c, t) => {
      const v = t < 0 ? 0 : Math.min(t < tRel ? BASE + t / CT : REL, 1);
      c.fillStyle = '#140c16'; c.fillRect(8, 8, 42, 5);
      c.fillStyle = t >= tRel ? '#9aa0a8' : v >= THR ? '#ffd34a' : '#f4f1e8'; c.fillRect(9, 9, Math.round(40 * v), 3);
      c.fillStyle = '#e04a3a'; c.fillRect(9 + Math.round(40 * THR), 7, 1, 7);
    };
    return { n, draw: (c, k) => {
      const t = k / FPS - rest, xd = 104, x0 = 12;
      const tm = Math.min(Math.max(t, 0), tHit), xs = Math.round(x0 + SPD * tm),   // tròn px thế giới: lệch nửa px thì viền nhoè
      u = t - tThr, g = u > 0 ? gap(Math.min(u, RUN)) : 9;
      bar(c, t);
      if (t < tThr) {
        fine(c, () => dribble(c, 2 * xs, 2 * FY, DIRS.side, k / FPS, 'side'));
        ball(c, xs + 9, FY, 0, xs / 2);
        fine(c, () => dribble(c, 2 * xd, 2 * FY - 10, DIRS.front, k / FPS, 'front'));
        ball(c, xd + 1, FY + 3, 0, xs / 2);
      } else if (t < tHit) {
        fine(c, () => runner(c, 2 * xs, 2 * FY, DIRS.side, u, 'side'));
        ball(c, xs + g, FY, 0, (xs + g) / 2);
        fine(c, () => runner(c, 2 * xd, 2 * FY - 10, DIRS.front, u, 'front'));
        ball(c, xd + 1, FY + 3 + (g - 9), 0, (xs + g) / 2);
      } else {
        const ts = t - tHit, atk = I.timeline('power', ts, T), fly = Math.max(0, ts - T.s * 0.4);
        fine(c, () => I.drawWithTorso(c, 2 * xs, 2 * FY, makeO(DIRS.side, t, { atk }), 'side'));
        ball(c, xs + 9 + fly * 260, FY - fly * 20, fly * 30, k);
        fine(c, () => I.drawWithTorso(c, 2 * xd, 2 * FY - 10, makeO(DIRS.front, t, { atk }), 'front'));
        if (fly < 0.25) ball(c, xd + 1, FY + 3 + fly * 160, fly * 10, k);
      }
    } };
  };
  const ROWS = [
    ['pass', 'P2 · Pass (ground and through)', 'Lighter than the lob: shorter backswing, the foot stops at shin height, arms swing gently, no hop.', kickRow('passDrive', I.PASS_T.passDrive)],
    ['pass', 'P3 · Lob pass', 'Picked. Leans back, toe scoops under the ball and kicks up high, free arm rises for balance.', kickRow('passLob', I.PASS_T.passLob)],
    ['sprint', 'R1 · Long stride', 'Picked. Legs reach fully forward and back, straight arms swing wide, body bobs on the passing frames.', sprintRow(I.SPR_LONG, 12, 3, 4)],
    ['shoot', 'S2 · Charging while standing', 'Picked. The wind-up plays while the power bar fills: leg cocked behind, body trembling harder as it fills.', kickRow('power', I.POWER_T, { tremble: true })],
    ['shoot', 'S2 · Charging while moving', 'Below 60% the player dribbles as today. At 60% the ball is pushed ahead, then heavy steps catch it in 0.4 s and the strike lands. Here the button is released at 80% (bar turns grey); the kick still waits for the ball.', runupRow()],
  ];
  const N = Math.max(...ROWS.map((r) => r[3].n));
  const img = sheet(N, ROWS.length, CW, CH, (k, r) => (k < ROWS[r][3].n ? [false, (c) => ROWS[r][3].draw(c, k), 0] : null), 0);
  return { img, cw: CW, ch: CH, fps: FPS, rows: ROWS.map(([sec, name, desc, row]) => ({ sec, name, desc, n: row.n })) };
})()`);
if (!res) { console.log('failed', errors); close(); process.exit(1); }
writeFileSync(join(DIR, 'ideas.png'), Buffer.from(res.img.split(',')[1], 'base64'));
writeFileSync(join(DIR, 'ideas.json'), JSON.stringify({ cw: res.cw, ch: res.ch, fps: res.fps, rows: res.rows }, null, 1));
const SEC = { pass: ['Pass', 'No pass animation exists today: the ball just leaves the player. Right-facing and down-facing.'],
  sprint: ['Sprint', 'Right-facing only for now.'], shoot: ['Powerful shot', 'Released at 60% of the bar or more; below that, today’s quick shot plays. Right-facing and down-facing.'] };
const Z = 3;
let body = '';
for (const sec of Object.keys(SEC)) {
  body += `<section><h2>${SEC[sec][0]}</h2><p class="sub">${SEC[sec][1]}</p>`;
  res.rows.forEach((r, i) => {
    if (r.sec !== sec) return;
    body += `<div class="row"><div class="txt"><b>${r.name}</b><span>${r.desc}</span></div>
      <div class="loop" style="width:${res.cw * Z}px;height:${res.ch * Z}px;background-position:0 ${-i * res.ch * Z}px;--end:${-res.cw * Z * r.n}px;--dur:${(r.n / res.fps).toFixed(3)}s;--n:${r.n}"></div></div>`;
  });
  body += '</section>';
}
const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Move Ideas</title>
<style>
:root { --bg: #f4f2ee; --fg: #1b1820; --mute: #6b6670; --card: #ffffff; --line: #e2ded8; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #16141a; --fg: #ece9f1; --mute: #9a94a3; --card: #201d26; --line: #2e2a35; } }
:root[data-theme="dark"] { --bg: #16141a; --fg: #ece9f1; --mute: #9a94a3; --card: #201d26; --line: #2e2a35; }
body { margin: 0; background: var(--bg); color: var(--fg); font: 15px/1.45 system-ui, sans-serif; }
.wrap { max-width: 1000px; margin: 0 auto; padding: 24px 16px 48px; }
h1 { font-size: 24px; margin: 0 0 4px; } h2 { font-size: 18px; margin: 32px 0 2px; }
.sub, .lede { color: var(--mute); margin: 0 0 12px; }
button { font: inherit; padding: 4px 12px; border: 1px solid var(--line); background: var(--card); color: var(--fg); border-radius: 6px; cursor: pointer; }
button[aria-pressed="true"] { border-color: var(--fg); }
.row { display: flex; gap: 16px; align-items: center; background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: 10px; margin: 8px 0; flex-wrap: wrap; }
.txt { flex: 1 1 220px; display: flex; flex-direction: column; gap: 2px; } .txt span { color: var(--mute); font-size: 14px; }
.loop { flex: none; max-width: 100%; background-image: url(ideas.png?v=${Date.now()}); background-size: ${res.cw * Z * Math.max(...res.rows.map((r) => r.n))}px auto; image-rendering: pixelated; background-color: #3d6b3f; border-radius: 4px;
  animation: play var(--dur) steps(var(--n)) infinite; }
.slow .loop { animation-duration: calc(var(--dur) * 4); }
@keyframes play { from { background-position-x: 0; } to { background-position-x: var(--end); } }
@media (prefers-reduced-motion: reduce) { .loop { animation: none; } }
</style>
<div class="wrap" id="w"><h1>Move ideas</h1><p class="lede">Your picks so far, plus the run-up for charging while moving. Game speed. <button id="sp" aria-pressed="false">¼ speed</button></p>${body}</div>
<script>const b = document.getElementById('sp'); b.onclick = () => { const on = document.getElementById('w').classList.toggle('slow'); b.setAttribute('aria-pressed', on); };</script>`;
writeFileSync(join(DIR, 'index.html'), html);
console.log('ideas ok', res.rows.length, 'rows', errors.length ? errors : 'no errors');
close();
