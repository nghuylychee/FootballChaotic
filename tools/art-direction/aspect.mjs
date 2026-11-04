// Khung nhìn trận theo tỉ lệ màn hình: 1 khoảnh khắc trận village (có cut-in Tuyệt kỹ) vẽ bằng SFC.Renderer thật ở nhiều tỉ lệ
// (Renderer.setView như main.js tính từ cỡ cửa sổ, tối đa render.maxView), ghi tools/art-direction/out/village/aspect-<tên>.png (x2).
// Cần server game: npm run serve. Chạy: node tools/art-direction/aspect.mjs [hạt giống trận]
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openGame, save } from '../sprite-v2/cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'out', 'village');
const SEED = +process.argv[2] || 7;
const { ev, close, errors } = await openGame(9375);

const res = await ev(`(() => {
  const K = SFC.Art.Kit, R = SFC.Renderer, C = SFC_CONFIG.game.render, T = SFC_CONFIG.teams;
  Math.random = K.rng(${SEED});
  // cửa sổ (px màn) -> khung nhìn như main.js: phóng cho 640 x 360 vừa, thấy thêm tới render.maxView
  const SCREENS = [['16x9', 1920, 1080], ['16x10', 1920, 1200], ['3x2', 2160, 1440], ['4x3', 1600, 1200], ['5x4', 1280, 1024], ['21x9', 2560, 1080], ['32x9', 3840, 1080]];
  const view = (w, h) => { const s = Math.min(w / C.width, h / C.height); return [Math.min(C.maxView[0], w / s), Math.min(C.maxView[1], h / s)]; };
  const g = new SFC.Game({ home: T.order[0], away: T.order[1], difficulty: 'normal', humanTeam: -1, silent: true, arena: 'village' });
  const CL = SFC_CONFIG.cores.list, ults = Object.keys(CL).filter((id) => CL[id].role === 'ult' && !CL[id].hidden), cs = g.cores;
  g.players.forEach((p, i) => {
    const id = ults[(i * 7 + ${SEED}) % ults.length], own = cs.own[p.id] || (cs.own[p.id] = []);
    own.push(id); p.ult = id; p.ultLv = 1; p.res.ult = 1;
    const b = SFC.CoreBehaviors[id]; if (b && b.onAdd) b.onAdd(cs, p.team, cs.sp(id, p));
  });
  // chạy tới lúc đang có cut-in Tuyệt kỹ (dải chân dung ở mép) và đã qua đoạn mở dải
  for (let i = 0; i < 60 * 60; i++) {
    if (i % 180 === 0) for (const p of g.players) p.res.ult = 1;
    g.update(1 / 60, null); g.events.length = 0;
    const O = g.effects.O, c = (O.sidecuts || [])[0];
    if (i > 60 * 4 && c && c.t / c.max < 0.7) break;
  }
  const cv = document.createElement('canvas');
  R.init(cv);
  const out = {}, sizes = [];
  for (const [name, w, h] of SCREENS) {
    const [vw, vh] = view(w, h);
    R.setView(vw, vh); R.render(g);
    const x2 = document.createElement('canvas'); x2.width = cv.width * 2; x2.height = cv.height * 2;   // canvas trận 1x -> ảnh x2 cho dễ xem
    const xc = x2.getContext('2d'); xc.imageSmoothingEnabled = false; xc.drawImage(cv, 0, 0, x2.width, x2.height);
    out['aspect-' + name] = x2.toDataURL();
    sizes.push(name + ' ' + R.screen.w + 'x' + R.screen.h);
  }
  return { out, sizes };
})()`);
if (res) { save(OUT, res.out); console.log(res.sizes.join(' · ')); }
if (errors.length) console.log('lỗi trong trang:', errors.slice(0, 5));
close();
