// Trang xem sprite v2 -> out/site/sprites.html (+ out/site/sheets/*.png). Đọc ảnh của player.mjs (chạy) và pilot.mjs (ra đòn); chạy 2 script đó trước.
// Gọn: phần đang làm (nhóm 'review' trong pilot.mjs) có vòng lặp + khung chính; phần đã duyệt chỉ 1 hàng vòng lặp mỗi động tác.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { HERE, OUT } from './cdp.mjs';

const SITE = join(OUT, 'site'), SHEETS = join(SITE, 'sheets');
// mỗi bảng của pilot.mjs (pilot = ô thường, dive = ô cao cho thủ môn bay) có cỡ ô riêng
const MAN = JSON.parse(readFileSync(join(OUT, 'pilot', 'manifest.json'), 'utf8')), SRCS = Object.keys(MAN).sort((x, y) => ['kits', 'tones'].indexOf(x) - ['kits', 'tones'].indexOf(y));   // áo đội / màu tóc da xếp cuối phần đã duyệt
// [tên trên trang, ảnh nguồn]
const KEEP = [['run', join(OUT, 'player', 'runHD.png')], ['sprint', join(OUT, 'player', 'sprHD.png')], ...SRCS.map((k) => [k, join(OUT, 'pilot', k + '.png')])];
mkdirSync(SHEETS, { recursive: true });
for (const f of readdirSync(SHEETS)) if (!KEEP.some(([n]) => f === n + '.png')) rmSync(join(SHEETS, f));
for (const [n, src] of KEEP) copyFileSync(src, join(SHEETS, n + '.png'));
const css = readFileSync(join(HERE, 'page.css'), 'utf8');
// khung chính (chỉ số khung trong hàng của pilot.mjs): sút / vô-lê bắt đầu ở khung 3 = bóng rời chân
// sút = đứng · chạm bóng · vung (2) · theo đà · về · vô-lê = chạm bóng · vung (3) · theo đà · về (2)
const KEYS = { shoot: [2, 3, 4, 5, 6, 9], volley: [3, 5, 6, 7, 9, 14, 16], header: [6, 11, 15, 19, 24, 30], dive: [3, 4, 5, 10, 18, 24, 26, 28, 31], fly: [2, 4, 8, 13, 18, 20, 23, 25, 28], hit: [5, 6, 8, 10, 13, 16, 20, 30, 49], slam: [6, 10, 14, 18, 22, 26, 34], bicycle: [6, 16, 22, 27, 30, 33, 38, 46, 60], dash: [7, 8, 10, 12, 15, 18, 24, 34] };
// phần đang làm: tiêu đề + 1 câu giới thiệu (ghi chú chi tiết nằm trong docs/SPRITE_V2.md). Chưa có động tác nào thì để trống
const REVIEW = { title: 'In review', short: 'none', intro: 'Nothing in review right now.' };
const REVIEW_ORDER = [];
// ?v=<băm> sau tên ảnh: trình duyệt không dùng lại ảnh cũ sau khi đăng lại
const V = Object.fromEntries(KEEP.map(([n, src]) => [n, createHash('sha1').update(readFileSync(src)).digest('hex').slice(0, 8)]));
const DATA = { order: REVIEW_ORDER, V, S: Object.fromEntries(SRCS.map((k) => [k, { cw: MAN[k].cw, ch: MAN[k].ch, n: MAN[k].n, fps: MAN[k].fps || 60 }])),
  list: SRCS.flatMap((src) => MAN[src].list.map(([id, name, dir, n, group], row) => ({ src, id, name, dir, n, group, row, keys: KEYS[id] || [] }))) };

const html = `<title>Sprite v2</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@500;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
${css}.flipn { animation-name: flipn; animation-iteration-count: infinite; }
@keyframes flipn { from { background-position-x: 0; } to { background-position-x: var(--end); } }
@media (prefers-reduced-motion: reduce) { .flipn { animation: none; } }
.keyrow { display: flex; gap: 4px; }
.loops { display: flex; gap: 6px; }
</style>
<div class="wrap">
  <div class="top">
    <div>
      <h1>Sprite <em>v2</em></h1>
      <p class="lede">The player sprite, drawn inside the dev build with the game’s own timing. Loops play at game speed.</p>
    </div>
    <dl class="facts">
      <dt>in review</dt><dd>${REVIEW.short}</dd>
      <dt>accepted</dt><dd>stand · run · punch · hard kick · shoot · volley · header · keeper dive · knocked flying · states · arms up (light hit, ground slam, bicycle kick) · hair: headband, buzz, bowl, beanie, top bun, bandana, halo, bucket hat, headphones, mohawk, helmet, afro, spiky, ponytail, snapback, santa, Ward Cup, moon cap, lantern, cowboy, viking, crown, laurel, flame hair, Aura Farming (all 25) · face: mustache (walrus), band-aid, clown nose, nerd glasses, blush, freckles, beard, scar, shades, face mask, gold tooth, war paint, eyepatch, monocle, ninja, cyborg, visor, skull, laser eyes (all 19) · shoes (all 20) · effects (all 19) · kits (all 55, with the headband / glove / dark-shorts colour fixes) · hair colour × skin tone (all) · celebrations: fistpump, airplane, skypoint, shush, kneeslide, flex, bow, robot, dab, spinjump, worm, phonecall, nap, backflip, moonwalk, firebreath, fireworks, ascend, winning team, draw, make it rain, losing team, levitate (all celebrations)</dd>
    </dl>
  </div>
  <nav aria-label="Sections">
    <a href="#review">In review</a><a href="#done">Accepted</a>
    <div class="zoom" role="group" aria-label="Playback speed">Speed <button type="button" data-sp="1" aria-pressed="true">1×</button><button type="button" data-sp="0.25" aria-pressed="false">¼×</button></div>
    <div class="zoom" role="group" aria-label="Sprite zoom" style="margin-left:12px">Zoom ${[2, 3, 4].map((z) => `<button type="button" data-z="${z}" aria-pressed="${z === 3}">${z}×</button>`).join('')}</div>
  </nav>
  <section id="review"><h2>${REVIEW.title}</h2><p class="intro">${REVIEW.intro}</p>
    <div data-part="review"></div>
  </section>
  <section id="done"><h2>Accepted</h2><p class="intro">Down, down-right, right and up.</p><div data-part="done"></div></section>
</div>
<script>
const D = ${JSON.stringify(DATA)};
let S = 3, SP = 1;
try { const z = +localStorage.getItem('sv2-zoom'); if ([2, 3, 4].includes(z)) S = z; const sp = +localStorage.getItem('sv2-speed'); if (sp === 0.25) SP = sp; } catch (e) {}
// ô ảnh cắt từ bảng: (x, y, w, h) theo px ảnh, phóng z lần
function strip(src, sheetW, x, y, w, h, z = S) {
  return '<div class="strip" style="width:' + w * z + 'px;height:' + h * z + 'px;background-image:url(sheets/' + src + '.png?v=' + D.V[src] + ');background-size:' + sheetW * z + 'px auto;background-position:' + (-x * z) + 'px ' + (-y * z) + 'px"></div>';
}
// ô chạy: 1 hàng của bảng 4 khung 44 x 64
function anim(src, r, z = S) {
  const fw = 44 * z, fh = 64 * z;
  return '<div class="strip flipc" style="--fw:' + fw + 'px;width:' + fw + 'px;height:' + fh + 'px;background-image:url(sheets/' + src + '.png?v=' + D.V[src] + ');background-size:' + 4 * fw + 'px auto;background-position-y:' + (-r * fh) + 'px"></div>';
}
// ô hoạt hình n khung (fw x fh px ảnh) ở hàng y của bảng rộng sheetW, 60 khung / s
function flip(src, sheetW, y, fw, fh, n, label, z = S, fps = 60) {
  return '<div class="strip flipn" role="img" aria-label="' + label + '" style="width:' + fw * z + 'px;height:' + fh * z + 'px;background-image:url(sheets/' + src + '.png?v=' + D.V[src] + ');background-size:' + sheetW * z + 'px auto;background-position:0 ' + (-y * z) + 'px;--end:' + (-fw * n * z) + 'px;animation-duration:' + n / fps / SP + 's;animation-timing-function:steps(' + n + ')"></div>';
}
// ô ra đòn rộng, nhiều chỗ trống cho tay chân -> nhỏ hơn 1 nấc zoom (không dưới 2)
const zBig = () => Math.max(2, S - 1);
const colh = (labels, w) => labels.map((c) => '<div class="colh"><span style="width:' + w + 'px">' + c + '</span></div>').join('');
const cell = (a, z) => { const S = D.S[a.src]; return flip(a.src, S.cw * S.n, a.row * S.ch, S.cw, S.ch, a.n, a.name + ' ' + a.dir, z, S.fps); };
// đang làm: tên | vòng lặp | khung chính
function review() {
  const z = zBig(), rows = D.list.filter((a) => a.group === 'review').sort((x, y) => D.order.indexOf(x.src) - D.order.indexOf(y.src)), fw = rows.length ? D.S[rows[0].src].cw * z : 0, maxK = Math.max(...rows.map((a) => a.keys.length));
  if (!rows.length) return '';
  let h = '<div class="scroller"><div class="runs" style="grid-template-columns:max-content max-content max-content"><div></div>' + colh(['Loop'], fw) + '<div class="colh"><span style="width:' + maxK * (fw + 4) + 'px">Key frames</span></div>';
  for (const a of rows) h += '<div class="rowl">' + a.name + '<small>' + a.dir + '</small></div>' + cell(a, z) + '<div class="keyrow">' + a.keys.map((k) => { const S = D.S[a.src]; return strip(a.src, S.cw * S.n, k * S.cw, a.row * S.ch, S.cw, S.ch, z); }).join('') + '</div>';
  return h + '</div></div>';
}
// đã duyệt: mỗi động tác 1 hàng, 4 hướng
function done() {
  // gọn: nửa cỡ (tối thiểu 1); bảng ô cao / rộng (thủ môn, bị đá bay) chỉ hàng đầu
  const z = Math.max(1, Math.round(S / 2)), names = [...new Set(D.list.filter((a) => a.group === 'done').map((a) => a.name))];
  let h = '<div class="scroller"><div class="runs" style="grid-template-columns:max-content max-content">';
  h += '<div class="rowl">Run</div><div class="loops">' + [0, 1, 2, 3].map((r) => anim('run', r, z)).join('') + '</div>';
  h += '<div class="rowl">Sprint</div><div class="loops">' + [0, 1, 2, 3].map((r) => anim('sprint', r, z)).join('') + '</div>';
  for (const nm of names) { const rows = D.list.filter((a) => a.name === nm), one = rows[0].src !== 'pilot'; h += '<div class="rowl">' + nm + (one ? '<small>' + rows[0].dir + '</small>' : '') + '</div><div class="loops">' + (one ? rows.slice(0, 1) : rows).map((a) => cell(a, z)).join('') + '</div>'; }
  return h + '</div></div>';
}
function render() {
  document.documentElement.style.setProperty('--s', S);
  document.querySelector('[data-part="review"]').innerHTML = review();
  document.querySelector('[data-part="done"]').innerHTML = done();
  document.querySelectorAll('[data-z]').forEach((b) => b.setAttribute('aria-pressed', +b.dataset.z === S));
  document.querySelectorAll('[data-sp]').forEach((b) => b.setAttribute('aria-pressed', +b.dataset.sp === SP));
  document.querySelectorAll('.flipc').forEach((e) => (e.style.animationDuration = 0.3333 / SP + 's'));
}
document.querySelectorAll('[data-z]').forEach((b) => b.addEventListener('click', () => { S = +b.dataset.z; try { localStorage.setItem('sv2-zoom', S); } catch (e) {} render(); }));
document.querySelectorAll('[data-sp]').forEach((b) => b.addEventListener('click', () => { SP = +b.dataset.sp; try { localStorage.setItem('sv2-speed', SP); } catch (e) {} render(); }));
render();
</script>
`;
writeFileSync(join(SITE, 'sprites.html'), html);
console.log('page ok', join(SITE, 'sprites.html'));
