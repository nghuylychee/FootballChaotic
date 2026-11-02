// Vẽ khung mẫu Village: mở game trong Chrome headless (tools/sprite-v2/cdp.mjs), nạp lại bộ cảnh src/render/art (kit / npcs / props / village), chạy 1 trận thật trên sân
// village để lấy cầu thủ + bóng + khung thành, rồi ghi ảnh vào tools/art-direction/out/village/:
//   frame.png (đủ lớp, x2) · background.png / props.png / npcs.png / match.png (từng lớp, x2, nền trong) · layers.png (4 ô: nền | +props | +npcs | đủ)
//   catalog.png (người, thú, đồ vật dùng lại, x3) · crop-*.png (vùng cắt x4 để soi)
// Cần server game: npm run serve (đổi cổng bằng SPRITE_URL). Chạy: node tools/art-direction/render.mjs
import { join } from 'node:path';
import { openGame, save } from '../sprite-v2/cdp.mjs';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'out', 'village');
const { ev, close, errors } = await openGame(9371);

const load = await ev(`(async () => {
  for (const f of ['kit', 'npcs', 'props', 'village']) {
    await new Promise((ok, fail) => { const s = document.createElement('script'); s.src = '/src/render/art/' + f + '.js?v=' + Date.now(); s.onload = ok; s.onerror = () => fail(f); document.head.appendChild(s); });
  }
  return !!(SFC.Art && SFC.Art.Village);
})()`);
if (!load) { console.log('nạp script lỗi', errors); close(); process.exit(1); }

const res = await ev(`(() => {
  const V = SFC.Art.Village, N = SFC.Art.Npc, Pr = SFC.Art.Prop, K = SFC.Art.Kit;
  const T = SFC_CONFIG.teams;
  const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; };
  const TIME = 0.4;
  // lớp cảnh ở lưới px game
  const layer = (o) => { const [c, x] = cv(V.W, V.H); V.draw(x, Object.assign({ t: TIME }, o)); return c; };
  const bg = layer({ props: false, npcs: false }), props = layer({ bg: false, npcs: false }), npcs = layer({ bg: false, props: false });
  const full = layer({}), bgProps = layer({ npcs: false }), bgNpcs = layer({ props: false });
  // trận thật trên sân village: chạy tới lúc bóng đang lăn giữa trận
  const g = new SFC.Game({ home: T.order[0], away: T.order[1], difficulty: 'normal', humanTeam: -1, silent: true, arena: 'village' });
  for (let i = 0; i < 60 * 20; i++) { g.update(1 / 60, null); g.events.length = 0; if (i > 60 * 7 && g.state === 'play' && !g.ball.owner && g.ball.z > 2) break; }
  const [mc, mx] = cv(V.W * 2, V.H * 2);
  mx.setTransform(2, 0, 0, 2, V.OX * 2, V.OY * 2);
  // bóng cầu thủ đúng như trong game (Village.shadows); bóng khung thành đã vẽ sẵn trong cảnh
  V.shadows(mx, g);
  SFC.Renderer.goal(mx, g, -1); SFC.Renderer.goal(mx, g, 1);
  const ents = g.players.map((p) => ({ y: p.y, d: () => SFC.Sprites.drawPlayer(mx, p, g) })).concat([{ y: g.ball.y, d: () => SFC.Sprites.drawBall(mx, g.ball) }]);
  ents.sort((a, b) => a.y - b.y).forEach((e) => { mx.save(); e.d(); mx.restore(); mx.globalAlpha = 1; });
  const up = (c) => { const [o, x] = cv(c.width * 2, c.height * 2); x.drawImage(c, 0, 0, o.width, o.height); return o; };
  const [fc, fx] = cv(V.W * 2, V.H * 2); fx.drawImage(full, 0, 0, fc.width, fc.height); fx.drawImage(mc, 0, 0);
  // viền tối như màn hình game, phủ cả khung
  K.vignette(fx, fc.width, fc.height);
  const [lc, lx] = cv(V.W * 2, V.H * 2);
  [[bg, 0, 0], [bgProps, 1, 0], [bgNpcs, 0, 1], [full, 1, 1]].forEach(([c, i, j]) => lx.drawImage(c, i * V.W, j * V.H));
  // danh mục: người (4 hướng / pose), thú, đồ vật — x3
  const [cc, cx] = cv(300, 300);
  cx.fillStyle = '#86a258'; cx.fillRect(0, 0, 300, 300);
  Pr.banana(cx, 20, 296, { h: 22, flower: true }); Pr.banana(cx, 56, 296, { h: 18, seed: 5 }); Pr.areca(cx, 96, 296, { h: 50 }); Pr.bamboo(cx, 140, 296, { n: 9, h: 54 }); Pr.bamboo(cx, 186, 296, { n: 8, h: 50, far: 0.32, seed: 3 }); Pr.bush(cx, 216, 296, { r: 7, flowers: '#d04a3a' }); Pr.coop(cx, 236, 296); Pr.gate(cx, 270, 296);
  const C = N.cast, names = Object.keys(C);
  names.forEach((n, i) => N.person(cx, 12 + i * 20, 34, C[n], { face: 'front', t: TIME }));
  names.forEach((n, i) => N.person(cx, 12 + i * 20, 64, C[n], { face: 'back', t: TIME }));
  names.forEach((n, i) => N.person(cx, 12 + i * 20, 94, C[n], { face: i % 2 ? 'left' : 'right', pose: 'walk', t: TIME + i * 0.1 }));
  const poses = ['stand', 'cheer', 'wave', 'hips', 'cross', 'rest', 'clap', 'point', 'hold', 'sit', 'squat'];
  poses.forEach((p, i) => N.person(cx, 12 + i * 22, 126, C.youth, { face: 'front', pose: p, t: TIME, seat: '#c8473c', item: p === 'hold' ? 'cup' : null }));
  const sp = ['hold', 'rake', 'pole', 'ride', 'sit', 'squat', 'bend'];
  sp.forEach((p, i) => N.person(cx, 16 + i * 34, 158, C.farmerW, { face: 'right', pose: p, t: TIME }));
  N.hen(cx, 14, 180, {}); N.hen(cx, 30, 180, { pose: 'peck' }); N.rooster(cx, 48, 180, {}); N.chick(cx, 62, 180, {}); N.duck(cx, 76, 180, { pose: 'walk', head: '#3c6a4a' }); N.duck(cx, 92, 182, { pose: 'swim' });
  N.dog(cx, 110, 180, {}); N.dog(cx, 130, 180, { pose: 'stand' }); N.egret(cx, 146, 180, {}); N.buffalo(cx, 176, 182, {});
  Pr.stool(cx, 204, 180); Pr.jar(cx, 218, 180); Pr.cooler(cx, 236, 180); Pr.ballBag(cx, 254, 180); Pr.scoreboard(cx, 276, 182);
  Pr.bike(cx, 18, 222); Pr.scooter(cx, 52, 222); Pr.well(cx, 86, 222); Pr.haystack(cx, 114, 222, { r: 10 }); Pr.shrine(cx, 138, 222); Pr.teaTable(cx, 160, 222); Pr.tray(cx, 184, 216, { content: 'chili' }); Pr.sack(cx, 204, 222); Pr.woodpile(cx, 226, 222); Pr.trellis(cx, 250, 222, { w: 30, h: 16 }); Pr.reeds(cx, 286, 222);
  const [cat, catx] = cv(900, 900); catx.drawImage(cc, 0, 0, 900, 900);
  const [pl, plx] = cv(1500, 350); plx.drawImage(cc, 0, 230, 300, 70, 0, 0, 1500, 350);
  // vùng cắt x4 (toạ độ khung 880 x 512)
  const crop = (x, y, w, h) => { const [o, ox] = cv(w * 4, h * 4); ox.drawImage(fc, x * 2, y * 2, w * 2, h * 2, 0, 0, w * 4, h * 4); return o.toDataURL(); };
  return {
    frame: fc.toDataURL(), background: up(bg).toDataURL(), props: up(props).toDataURL(), npcs: up(npcs).toDataURL(), match: mc.toDataURL(),
    layers: lc.toDataURL(), catalog: cat.toDataURL(), plants: pl.toDataURL(),
    'crop-top': crop(180, 40, 300, 125), 'crop-left': crop(0, 180, 180, 160), 'crop-right': crop(720, 120, 160, 200), 'crop-bottom': crop(180, 400, 330, 112), 'crop-pond': crop(0, 380, 180, 132),
  };
})()`);
if (res) { save(OUT, res); console.log('ghi', OUT); }
if (errors.length) console.log('lỗi trong trang:', errors.slice(0, 5));
close();
