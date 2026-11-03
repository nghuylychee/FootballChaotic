// Khung hành động trên sân Village: trận AI thật, mỗi cầu thủ 1 Tuyệt kỹ (nạp lại liên tục), vẽ bằng SFC.Renderer thật của game
// (cầu thủ, bóng, VFX, chữ bật, rung màn hình, bóng cầu thủ của cảnh) trên đủ khung Village 880 x 512 thay vì chỉ vùng màn 640 x 360.
// Chấm điểm "độ ồn" mỗi khoảnh khắc (số VFX đang chạy + rung), giữ các khoảnh khắc ồn nhất, cách nhau >= 1.5 s.
// Ghi tools/art-direction/out/village/action-<hạt giống>-N.png (đủ khung 880 x 512, x2) + action-<hạt giống>-N-view.png (đúng màn 640 x 360 của game, x2). Cần server game: npm run serve.
// Chạy: node tools/art-direction/action.mjs [số khung, mặc định 4] [hạt giống trận]
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openGame, save } from '../sprite-v2/cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'out', 'village');
const COUNT = +process.argv[2] || 4, SEED = +process.argv[3] || 1;
const { ev, close, errors } = await openGame(9373);

const load = await ev(`(async () => {
  for (const f of ['kit', 'npcs', 'props', 'village']) {
    await new Promise((ok, fail) => { const s = document.createElement('script'); s.src = '/src/render/art/' + f + '.js?v=' + Date.now(); s.onload = ok; s.onerror = () => fail(f); document.head.appendChild(s); });
  }
  return !!(SFC.Art && SFC.Art.Village);
})()`);
if (!load) { console.log('nạp script lỗi', errors); close(); process.exit(1); }

const res = await ev(`(() => {
  const V = SFC.Art.Village, K = SFC.Art.Kit, R = SFC.Renderer, T = SFC_CONFIG.teams;
  const OX2 = V.OX * 2, OY2 = V.OY * 2, W2 = V.W * 2, H2 = V.H * 2;
  // Math.random có hạt giống: cùng tham số -> cùng trận
  const rnd = K.rng(${SEED}); Math.random = rnd;
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; };

  // nền = khung Village đủ lớp (cỏ, nhà, người, bóng đổ, bóng khung thành), lưới px game
  const [bg, bgx] = mk(V.W, V.H); V.draw(bgx, { t: 0.4 });
  // canvas đủ khung x2; Renderer vẽ ở toạ độ màn 640 x 360 -> mọi setTransform dời thêm (OX2, OY2), ảnh nền vẽ lùi (-OX, -OY)
  const [cv, ctx] = mk(W2, H2);
  const setT = ctx.setTransform.bind(ctx), draw = ctx.drawImage.bind(ctx);
  ctx.setTransform = (a, b, c, d, e, f) => setT(a, b, c, d, e + OX2, f + OY2);
  ctx.resetTransform = () => ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage = (img, ...a) => ((img === bg || img === vig) && a.length === 2 ? draw(img, a[0] - V.OX, a[1] - V.OY) : draw(img, ...a));
  // lớp phủ toàn màn (trời tối, nháy sáng, viền đậm 4 cạnh) vẽ theo cỡ màn 640 x 360 -> dời ra mép khung như màn hình rộng hơn:
  // trục nào phủ trọn màn thì nới trọn khung, dải bám mép đầu / mép cuối thì dời ra mép khung, giữ bề dày
  const fill = ctx.fillRect.bind(ctx);
  const span = (a, n, S, o, F) => (a === 0 && n === S ? [-o, F] : a === 0 ? [-o, n] : a + n === S ? [F - o - n, n] : [a, n]);
  ctx.fillRect = (x, y, w, h) => {
    for (const [S1, S2, o1, o2, F1, F2] of [[640, 360, V.OX, V.OY, V.W, V.H], [1280, 720, OX2, OY2, W2, H2]]) {
      if (!((x === 0 && w === S1) || (y === 0 && h === S2))) continue;
      const [X, Wd] = span(x, w, S1, o1, F1), [Y, Hd] = span(y, h, S2, o2, F2);
      return fill(X, Y, Wd, Hd);
    }
    return fill(x, y, w, h);
  };
  // viền tối của game giãn ra cả khung (Renderer vẽ R.vig ở góc màn -> dời như ảnh nền)
  const [vig, vgx] = mk(V.W, V.H); K.vignette(vgx, V.W, V.H);
  const viewVig = SFC.Background.vignette(), [vw, vwx] = mk(1280, 720);
  R.canvas = cv; R.ctx = ctx; R.vig = vig;

  const g = new SFC.Game({ home: T.order[0], away: T.order[1], difficulty: 'normal', humanTeam: -1, silent: true, arena: 'village' });
  R.bg = bg; R.bgFor = g;
  // mỗi người 1 Tuyệt kỹ khác nhau (như phòng ULT TEST: thẳng vào danh sách Core, không ghi sổ)
  const CL = SFC_CONFIG.cores.list, ults = Object.keys(CL).filter((id) => CL[id].role === 'ult' && !CL[id].hidden);
  for (let i = ults.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [ults[i], ults[j]] = [ults[j], ults[i]]; }
  const cs = g.cores;
  g.players.forEach((p, i) => {
    const id = ults[i % ults.length], own = cs.own[p.id] || (cs.own[p.id] = []);
    for (let k = own.length - 1; k >= 0; k--) if (cs.def(own[k]).role === 'ult') own.splice(k, 1);
    own.push(id); p.ult = id; p.ultLv = 1; p.res.ult = 1;
    const b = SFC.CoreBehaviors[id];
    if (b && b.onAdd) b.onAdd(cs, p.team, cs.sp(id, p));
  });

  // độ ồn = tổng số phần tử đang sống trong các danh sách VFX + rung màn hình
  const loud = () => { const fx = g.effects; let s = (fx.shakeA || 0) * 6; for (const k in fx) if (Array.isArray(fx[k])) s += fx[k].length; return s; };
  const shots = [];
  let last = -9;
  for (let i = 0; i < 60 * 75; i++) {
    if (i % 180 === 0) for (const p of g.players) p.res.ult = 1;
    g.update(1 / 60, null); g.events.length = 0;
    if (g.state !== 'play' || i % 4) continue;
    const s = loud();
    if (s < 12 || g.time - last < 1.5) continue;
    last = g.time;
    // góc lộ ra khi camera nghiêng / thu phóng: tô tối như viền màn hình
    setT(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#1b1820'; ctx.fillRect(0, 0, W2, H2);
    R.render(g);
    const url = cv.toDataURL();
    // màn hình người chơi thấy: vẽ lại với viền tối đúng cỡ màn 640 x 360 của game, cắt đúng vùng màn
    R.vig = viewVig; setT(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#1b1820'; ctx.fillRect(0, 0, W2, H2);
    R.render(g); R.vig = vig;
    vwx.clearRect(0, 0, 1280, 720); vwx.drawImage(cv, OX2, OY2, 1280, 720, 0, 0, 1280, 720);
    shots.push({ s, t: g.time, url, view: vw.toDataURL(), ults: g.players.map((p) => p.ult).join(' ') });
  }
  shots.sort((a, b) => b.s - a.s);
  const out = {}, info = [];
  shots.slice(0, ${COUNT}).sort((a, b) => a.t - b.t).forEach((sh, i) => { out['action-${SEED}-' + (i + 1)] = sh.url; out['action-${SEED}-' + (i + 1) + '-view'] = sh.view; info.push((i + 1) + ': t=' + sh.t.toFixed(1) + ' độ ồn ' + sh.s); });
  return { out, info, n: shots.length, ults: g.players.map((p) => p.ult) };
})()`);
if (res) {
  save(OUT, res.out);
  console.log('Tuyệt kỹ:', res.ults.join(', '));
  console.log(res.n, 'khoảnh khắc ồn; giữ', res.info.join(' · '));
}
if (errors.length) console.log('lỗi trong trang:', errors.slice(0, 5));
close();
