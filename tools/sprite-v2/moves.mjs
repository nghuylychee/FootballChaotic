// Mọi động tác khác cho sprite hiện tại (1x phóng đôi) và sprite v2, chạy bằng code game (thủ môn đổ người, bị đá bay, ăn mừng) -> out/moves/
// states: 6 trạng thái x (hôm nay nhìn xuống + v2 6 hướng) · loops: choáng / gồng · anims: 17 ra đòn x 30 khung (1 s) · cel_<id>: mỗi động tác ăn mừng 32 khung (10 / s)
// Đấm + Hard attack ở đây là bản pilot (xem pilot.mjs); sút, vô-lê, đánh đầu, thủ môn, bị đá bay, ăn mừng vẫn là bản chuyển thẳng từ tư thế hôm nay, chờ làm lại
import { join } from 'node:path';
import { openGame, save, OUT, PAGE_COMMON } from './cdp.mjs';

const { ev, close, errors } = await openGame(9363);
const res = await ev(`(async () => {
  ${PAGE_COMMON}
  // ăn mừng: vai / đầu theo thân mới (vai ±6 ở hàng -9 -> hệ toạ độ hông = -1; tâm đầu -17 -> -9; miệng giữ -5), bóng rộng như sprite mới
  const celSrc = (await (await fetch('src/render/celebrate-draw.js')).text()).replace(/\\r\\n/g, '\\n');
  const patches = [
    ['return this.local((i ? 5 : -5) + a[a.length - 2], drop + a[a.length - 1]);', 'return this.local((i ? 6 : -6) + a[a.length - 2], drop - 1 + a[a.length - 1]);'],
    ['return this.local((i ? 5 : -5) + a[0], drop + a[1]);', 'return this.local((i ? 6 : -6) + a[0], drop - 1 + a[1]);'],
    ['I.head = I.local(0, -8 + drop + hd);', 'I.head = I.local(0, -9 + drop + hd);'],
    ['(rot ? 9 : 6) * k', '(rot ? 10 : 7) * k'],
  ];
  let celNew = celSrc;
  for (const [a, b] of patches) { if (celNew.split(a).length !== 2) throw new Error('patch miss: ' + a); celNew = celNew.split(a).join(b); }
  const CEL_OLD = SFC.CelebrateDraw; new Function(celNew)(); const CEL_NEW = SFC.CelebrateDraw; SFC.CelebrateDraw = CEL_OLD;
  const R = SFC.Renderer;
  const withNew = (fn) => { const ks = SFC.Sprites, kc = SFC.CelebrateDraw; SFC.Sprites = NEW; SFC.CelebrateDraw = CEL_NEW; try { return fn(); } finally { SFC.Sprites = ks; SFC.CelebrateDraw = kc; } };
  // thủ môn đổ người cho sprite v2: như Renderer.diving nhưng bộ đệm gấp đôi (96 px ảnh = 48 px game), vẽ lại về 48 đơn vị 1x
  const diving2 = (ctx, p, g) => {
    const PL = GC.player, flip = p.atkType === 'diveU' ? 1 : -1, side = Math.cos(p.facing) >= 0 ? 1 : -1, flying = p.state === 'dash';
    const k = Math.min(1, (p.atkT || 0) / PL.gkDiveTime), lift = flying ? 3 + Math.sin(k * Math.PI) * 6 : 0;
    const rot = side * (flying ? 0.22 : 0.1) * flip, sk = 1 - lift / 24;
    OLD.ellipse(ctx, Math.round(p.x), Math.round(p.y) + 1, 5 * sk, 8 * sk, 'rgba(0,0,0,0.38)');
    const cy = p.y - lift - 2, squash = flying ? 0.85 : 0.7;
    if (flying) { ctx.globalAlpha = 0.7; for (let i = 0; i < 3; i++) OLD.px(ctx, Math.round(p.x - 3 + i * 3), Math.round(cy - flip * (12 + i * 2) * squash + flip * 22), 1, 4 + (i % 2) * 2, '#ffffff'); ctx.globalAlpha = 1; }
    const N = 48, [buf, bc] = cv(N * 2, N * 2); bc.scale(2, 2);
    PlayerSprite.drawPlayer(bc, Object.assign({}, p, { x: N / 2, y: N / 2 + 10, vx: 0, vy: 0, keeper: true }), g, 0.999);
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.translate(Math.round(p.x), Math.round(cy)); ctx.rotate(rot); ctx.scale(1, flip * squash);
    ctx.drawImage(buf, -N / 2, -N / 2, N, N); ctx.restore();
  };
  const draw1 = (S, ctx, o) => S.drawPlayer(ctx, P(o), G(HOME), o.alpha || 1, o.tint || null, !!o.ghost);
  const sheetNew = (cols, rows, cw, ch, cell, base) => sheet(cols, rows, cw, ch, (k, r) => { const c = cell(k, r); return c && (c[0] ? c : [false, (x, cx, cy) => withNew(() => c[1](x, cx, cy)), c[2]]); }, base);
  const out = {};

  /* 1. trạng thái: cột 0 = hôm nay (nhìn xuống), cột 1..6 = v2 6 hướng */
  const STATES = [
    ['Stunned', { state: 'stun', anim: 0.31 }], ['Hard attack charge', { state: 'windup', anim: 0.02 }], ['Keeper', { keeper: true }],
    ['Hit flash', { flash: 0.2 }], ['Dash ghost', { alpha: 0.5, tint: HOME.shirt, ghost: true }], ['Injured', { inj: ['wrist', 'ankle', 'toe', 'hamstring'] }],
  ];
  out.states = { names: STATES.map((s) => s[0]), cw: 48, ch: 80, img: sheetNew(7, STATES.length, 48, 80, (k, r) => {
    const o = STATES[r][1];
    return k === 0 ? [true, (c, x, y) => draw1(OLD, c, Object.assign({ x, y }, o))] : [false, (c, x, y) => draw1(NEW, c, Object.assign({ x, y, facing: DIRS[FAC[k - 1]] }, o))];
  }) };

  /* 2. ra đòn 30 khung (1 s): hàng chẵn = hôm nay, hàng lẻ = v2. f(t) -> tham số người */
  const N = 30, L = GC.combat.light, H = GC.combat.hard, HD = GC.firstTime.header, PL = GC.player;
  const poseT = (GC.kick && GC.kick.poseTime) || 0.22;
  const at = (t, a, b) => t >= a && t < b;
  const punch = (t) => (at(t, 0, L.startup + L.recover) ? { atkType: 'light', atkT: t } : {});
  const hard = (t) => (at(t, 0, H.windup + H.kickTime + 0.15) ? { atkType: 'hard', atkT: t, state: t < H.windup ? 'windup' : 'normal', anim: t } : {});
  const pose = (type) => (t) => (at(t, 0.2, 0.2 + poseT) ? { atkType: type, atkT: t - 0.2 } : {});
  const header = (t) => (at(t, 0.1, 0.1 + HD.pose) ? { atkType: 'header', atkT: t - 0.1 } : {});
  const dive = (d) => (t) => (at(t, 0.1, 0.1 + PL.gkDiveTime) ? { dive: d, state: 'dash', atkT: t - 0.1 } : at(t, 0.1 + PL.gkDiveTime, 0.5 + PL.gkDiveTime) ? { dive: d, atkT: PL.gkDiveTime } : { keeper: true });
  const fly = (t) => { const k = (t - 0.05) / 0.6; return at(t, 0.05, 0.65) ? { air: Math.max(1, 4 * 14 * k * (1 - k)), state: 'stun', anim: t, kbx: 260 - k * 200 } : t >= 0.65 ? { state: 'stun', anim: t } : {}; };
  const ANIMS = [
    ['punchR', 'Punch', 'right', 0, punch], ['punchD', 'Punch', 'down', DIRS.front, punch], ['punchDR', 'Punch', 'down-right', DIRS.diag, punch], ['punchU', 'Punch', 'up', DIRS.back, punch],
    ['hardR', 'Hard kick', 'right', 0, hard], ['hardD', 'Hard kick', 'down', DIRS.front, hard],
    ['shootR', 'Shoot', 'right', 0, pose('shoot')], ['shootDR', 'Shoot', 'down-right', DIRS.diag, pose('shoot')], ['shootD', 'Shoot', 'down', DIRS.front, pose('shoot')], ['shootU', 'Shoot', 'up', DIRS.back, pose('shoot')],
    ['volleyR', 'Volley', 'right', 0, pose('volley')], ['volleyD', 'Volley', 'down', DIRS.front, pose('volley')],
    ['headerR', 'Header', 'right', 0, header], ['headerD', 'Header', 'down', DIRS.front, header],
    ['diveU', 'Keeper dive', 'away from camera', 0, dive('diveU')], ['diveD', 'Keeper dive', 'toward camera', 0, dive('diveD')],
    ['flyR', 'Knocked flying', 'hit from the left', DIRS.diagL, fly],
  ];
  const drawAnim = (S, ctx, x, y, face, o) => {
    const p = P(Object.assign({ x, y, facing: face }, o));
    if (o.dive) { p.atkType = o.dive; p.keeper = true; return S === OLD ? R.diving(ctx, p, G(HOME)) : diving2(ctx, p, G(HOME)); }
    if (o.air) { p.airZ = o.air; return R.airborne(ctx, p, G(HOME)); }
    S.drawPlayer(ctx, p, G(HOME));
  };
  const AW = 104, AH = 96;
  out.anims = { cw: AW, ch: AH, n: N, list: ANIMS.map((a) => a.slice(0, 3)), img: sheetNew(N, ANIMS.length * 2, AW, AH, (k, r) => {
    const A = ANIMS[r >> 1], today = !(r & 1), o = A[4](k / N);
    return [today, (c, x, y) => drawAnim(today ? OLD : NEW, c, x, y, A[3], o), Math.cos(A[3]) > 0.5 ? 20 : 26];
  }) };

  /* 3. choáng + gồng: 30 khung trong 1.05 s (sao quay đủ 1 vòng) */
  const SN = 30, SD = (Math.PI * 2) / 6;
  out.loops = { n: SN, dur: SD, rows: ['Stunned', 'Hard attack charge'], img: sheetNew(SN, 4, 48, 80, (k, r) => {
    const o = r < 2 ? { state: 'stun', anim: (k / SN) * SD } : { state: 'windup', anim: (k / SN) * SD };
    return [!(r & 1), (c, x, y) => draw1(r & 1 ? NEW : OLD, c, Object.assign({ x, y }, o))];
  }) };

  /* 4. ăn mừng: mỗi động tác 1 ảnh, 32 khung (10 / s), hàng 0 hôm nay / hàng 1 v2 */
  const names = Object.fromEntries(Object.entries(PR.items).filter(([, it]) => it.slot === 'cel').map(([i, it]) => [i, it.name]));
  const ids = Object.keys(CEL_NEW.POSES), CN = 32;
  const extra = { _win2: 'Winning team (2nd move)', _lose: 'Losing team', _draw: 'Draw' };
  out.cel = { n: CN, fps: 10, cw: 104, ch: 156, list: ids.map((i) => [i, names[i] || extra[i] || i]) };
  for (const cid of ids) out['cel_' + cid] = sheetNew(CN, 2, 104, 156, (k, r) => [r === 0, (c, x, y) => {
    const p = P({ x, y: y - 4, celId: cid, celT: k / 10, facing: DIRS.front, preview: true, look: lookOf({ cel: cid }) });
    (r === 0 ? CEL_OLD : SFC.CelebrateDraw).draw(c, p, G(HOME));
  }]);
  return out;
})()`);
if (!res) { console.log('failed', errors); close(); process.exit(1); }
save(join(OUT, 'moves'), res);
console.log('moves ok', Object.keys(res).length, 'errors:', errors.length ? errors : 'none');
close(); process.exit(0);
