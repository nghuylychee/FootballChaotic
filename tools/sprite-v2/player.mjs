// Ảnh người chơi cho trang xem: trên sân (đứng + chạy 4 khung), 6 hướng (hôm nay / 2x, vạch = đỉnh đầu hôm nay), bảng chạy + chạy nước rút -> out/player/
import { join } from 'node:path';
import { openGame, save, OUT, PAGE_COMMON } from './cdp.mjs';

const { ev, close, errors } = await openGame(9361);
const res = await ev(`(() => {
  ${PAGE_COMMON}
  const SHOE = { sock: '#ecebe6', shoe: '#e8e8e8', sole: '#b9c2d0' };
  const hdOpts = (look, kit, facing) => Object.assign({ facing, skin: look.skin, hair: look.hair, band: kit.accent, shirt: kit.shirt, shirtD: kit.shirtDark, shorts: kit.shorts }, SHOE);
  const velOf = (d, sp) => [Math.cos(DIRS[d]) * sp, Math.sin(DIRS[d]) * sp];
  // khung chạy f (game đổi khung 12 lần / s) · nhanh hơn chạy nước rút thì thân nghiêng như game (fx.run.lean, px mịn = 2 lần)
  const hdRun = (look, kit, d, f, sp) => { const [vx] = velOf(d, sp); return Object.assign(hdOpts(look, kit, DIRS[d]), { moving: true, anim: f / 12 + 0.001, lean: Math.abs(vx) > RN.sprint ? 2 * Math.sign(vx) * RN.lean : 0 }); };

  // sân: 6 người quanh vòng giữa sân, cắt vùng R (toạ độ 1280 x 720)
  const g = new SFC.Game({ home: T.order[0], away: T.order[1], difficulty: 'normal', humanTeam: -1, silent: true, arena: 'street' });
  const bg = SFC.Background.build(g), vig = SFC.Background.vignette(), kits = [HOME, AWAY];
  const spots = [[296, 170, 0, 'front', 0, 0], [336, 192, 1, 'diag', 2, 1], [270, 206, 0, 'side', 1, 3], [352, 156, 1, 'back', 3, 0], [314, 226, 0, 'sideL', 4, 2], [248, 174, 1, 'diagL', 1, 1]];
  const order = spots.map((s, i) => i).sort((a, b) => spots[a][1] - spots[b][1]);
  const R = [464, 246, 272, 224];
  const pitch = (f) => {
    const [c, x] = cv(1280, 720); x.drawImage(bg, 0, 0, 1280, 720);
    for (const i of order) { const [sx, sy, t, d, sk, hc] = spots[i]; const look = lookOf({ skin: sk, hairColor: hc }); PlayerSprite.draw(x, sx * 2, sy * 2, f == null ? hdOpts(look, kits[t], DIRS[d]) : hdRun(look, kits[t], d, f + i, 90)); }
    x.drawImage(vig, 0, 0, 1280, 720); return c;
  };
  const crop = (c) => { const [z, zx] = cv(R[2], R[3]); zx.drawImage(c, R[0], R[1], R[2], R[3], 0, 0, R[2], R[3]); return z; };
  const strip = () => { const [s, sx] = cv(R[2] * 4, R[3]); for (let f = 0; f < 4; f++) sx.drawImage(pitch(f), R[0], R[1], R[2], R[3], f * R[2], 0, R[2], R[3]); return s; };

  // 6 hướng: hàng 0 hôm nay (1x phóng đôi), hàng 1 = 2x · vạch mờ ngay trên đỉnh đầu hôm nay (cao 24)
  const look = lookOf({ skin: 2 }), cw = 44, ch = 64;
  const facings = (() => {
    const [c, x] = cv(cw * 6, ch * 2); x.fillStyle = BG; x.fillRect(0, 0, c.width, c.height);
    const [s, sx] = cv(22 * 6, 32); sx.fillStyle = BG; sx.fillRect(0, 0, s.width, s.height);
    FAC.forEach((d, k) => OLD.drawPlayer(sx, P({ x: k * 22 + 11, y: 29, facing: DIRS[d], look }), G(HOME)));
    x.drawImage(s, 0, 0, s.width * 2, s.height * 2);
    FAC.forEach((d, k) => PlayerSprite.draw(x, k * cw + 22, ch + ch - 6, hdOpts(look, HOME, DIRS[d])));
    x.fillStyle = 'rgba(255,255,255,0.28)';
    for (let r = 0; r < 2; r++) for (let i = 0; i < c.width; i += 4) x.fillRect(i, r * ch + ch - 6 - 47, 2, 1);
    return c;
  })();
  // bảng chạy 6 hướng x 4 khung: hôm nay (1x phóng đôi) / 2x
  const runSheet = (which, sp) => {
    const [c, x] = cv(cw * 4, ch * 6); x.fillStyle = BG; x.fillRect(0, 0, c.width, c.height);
    if (which === 'hd') { FAC.forEach((d, r) => { for (let f = 0; f < 4; f++) PlayerSprite.draw(x, f * cw + 22, r * ch + ch - 6, hdRun(look, HOME, d, f, sp)); }); return c; }
    const [s, sx] = cv(22 * 4, 32 * 6); sx.fillStyle = BG; sx.fillRect(0, 0, s.width, s.height);
    FAC.forEach((d, r) => { for (let f = 0; f < 4; f++) { const [vx, vy] = velOf(d, sp); OLD.drawPlayer(sx, P({ x: f * 22 + 11, y: r * 32 + 29, facing: DIRS[d], vx, vy, anim: f / 12 + 0.001, look }), G(HOME)); } });
    x.drawImage(s, 0, 0, s.width * 2, s.height * 2); return c;
  };
  const u = (c) => c.toDataURL();
  return { stand: u(crop(pitch(null))), pitch: u(strip()), facings: u(facings),
    runToday: u(runSheet('today', 90)), runHD: u(runSheet('hd', 90)), sprToday: u(runSheet('today', 130)), sprHD: u(runSheet('hd', 130)) };
})()`);
if (!res) { console.log('failed', errors); close(); process.exit(1); }
save(join(OUT, 'player'), res);
console.log('player ok', Object.keys(res).join(' '), 'errors:', errors.length ? errors : 'none');
close(); process.exit(0);
