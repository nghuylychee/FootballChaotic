// Động tác ra đòn của sprite 2x: mỗi động tác x hướng 1 hàng, tối đa 60 khung = 1 s như game -> out/pilot/
// Hàng: [id, tên, hướng, góc mặt, f(khung) -> tham số người, số khung, nhóm ('review' = đang làm, 'done' = đã duyệt)]
import { join } from 'node:path';
import { openGame, save, OUT, PAGE_COMMON } from './cdp.mjs';

const oi = process.argv.indexOf('--only'), ONLY = oi > 0 ? process.argv[oi + 1].split(',') : null;
const { ev, close, errors } = await openGame(9362);
const res = await ev(`(() => {
  ${PAGE_COMMON}
  // --only <bảng,...>: chỉ vẽ lại các bảng này (bảng khác giữ ảnh cũ trên đĩa, save gộp manifest)
  const ONLY = ${JSON.stringify(ONLY)};
  const sheetOnly = (name, ...a) => (!ONLY || ONLY.includes(name) ? sheet(...a) : null);
  const N = 60, L = GC.combat.light, H = GC.combat.hard, F = 1 / 60;
  const at = (t, a, b) => t >= a && t < b;
  const punch = (k) => { const t = k * F; return at(t, 0, L.startup + L.recover) ? { atkType: 'light', atkT: t } : {}; };
  const hard = (k) => { const t = k * F; return at(t, 0, H.windup + H.kickTime + 0.15) ? { atkType: 'hard', atkT: t, state: t < H.windup ? 'windup' : 'normal', anim: t } : {}; };
  // sút / vô-lê: 3 khung đứng rồi bóng rời chân (game chỉ vẽ tư thế sút sau lúc đó)
  const SHOT0 = 3, shot = (type, D) => (k) => { const t = (k - SHOT0) * F; return at(t, 0, D) ? { atkType: type, atkT: t } : {}; };
  const shoot = shot('shoot', GC.kick.poseTime), volley = shot('volley', GC.firstTime.volley.pose), header = shot('header', GC.firstTime.header.pose);
  // đánh đầu: chạm bóng ở ~47% cú nhảy (headerPose đặt ≥ 42%, đỉnh 50%)
  const HC = SHOT0 + Math.round(0.47 * GC.firstTime.header.pose * 60);
  const D4 = [['down', DIRS.front], ['down-right', DIRS.diag], ['right', DIRS.side], ['up', DIRS.back]];
  const LIST = [];
  // thủ môn đổ người: 3 khung đứng · bay gkDiveTime (state dash) · nằm gkDivePose · đứng. Tại chỗ (game bay 250 px/s dọc vạch vôi)
  const PL = GC.player, DV0 = 3, DVF = Math.round(PL.gkDiveTime * 60), DVL = Math.round(PL.gkDivePose * 60);
  const dive = (d) => (k) => { const t = (k - DV0) * F; return k < DV0 ? { keeper: true } : k < DV0 + DVF ? { dive: d, state: 'dash', atkT: t } : k < DV0 + DVF + DVL ? { dive: d, atkT: t } : { keeper: true }; };
  // bảng riêng (ô cao): thủ môn bay thật dọc vạch vôi gkDiveSpeed px/s trong lúc bay, nằm tại chỗ đến, rồi về chỗ cũ cho vòng lặp
  const DLIST = [];
  for (const [d, dir] of [['diveU', 'up screen'], ['diveD', 'down screen']]) for (const [fdir, face] of [['facing right', DIRS.side], ['facing left', DIRS.sideL]])
    DLIST.push(['dive', 'Keeper dive', dir + ', ' + fdir, face, dive(d), DV0 + DVF + DVL + 15, 'done', d === 'diveU' ? -1 : 1]);
  // như Renderer.diving của game nhưng bộ đệm gấp đôi (96 px mịn) cho sprite 2x: nâng theo cung, bóng đổ, vệt gió, nghiêng, ép dẹt, lật khi bay xuống
  const diving2 = (ctx, p, g) => {
    // biến hình lấy từ PlayerSprite.diveXform (cất người / chạm đất / đứng dậy chuyển dần); bóng đổ, vệt gió, bộ đệm như Renderer.diving
    const flip = p.atkType === 'diveU' ? 1 : -1, side = Math.cos(p.facing) >= 0 ? 1 : -1;
    const X = PlayerSprite.diveXform(PlayerSprite.attackPose(p), flip, side), sk = 1 - X.lift / 24;
    OLD.ellipse(ctx, Math.round(p.x), Math.round(p.y) + 1, X.shadow[0], X.shadow[1], 'rgba(0,0,0,0.38)');
    const cy = p.y - X.lift - X.up, sq = Math.abs(X.sy);
    if (X.streaks) { ctx.globalAlpha = 0.7; for (let i = 0; i < 3; i++) OLD.px(ctx, Math.round(p.x - 3 + i * 3), Math.round(cy - flip * (12 + i * 2) * sq + flip * 22), 1, 4 + (i % 2) * 2, '#ffffff'); ctx.globalAlpha = 1; }
    const N = 48, [buf, bc] = cv(N * 2, N * 2); bc.scale(2, 2);
    PlayerSprite.drawPlayer(bc, Object.assign({}, p, { x: N / 2, y: N / 2 + 10, vx: 0, vy: 0, keeper: true }), g, 0.999);
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.translate(Math.round(p.x), Math.round(cy)); ctx.rotate(X.rot); ctx.scale(1, X.sy);
    ctx.drawImage(buf, -N / 2, -N / 2, N, N); ctx.restore();
  };
  for (const [id, name, fn, n, group] of [['header', 'Header', header, SHOT0 + 36, 'done'], ['shoot', 'Shoot', shoot, 24, 'done'], ['volley', 'Volley', volley, 30, 'done'], ['punch', 'Punch', punch, N, 'done'], ['hard', 'Hard kick', hard, N, 'done']])
    for (const [dir, face] of D4) LIST.push([id, name, dir, face, fn, n, group]);
  // bóng 5 x 5 (px thế giới): đứng ở mũi giày tới lúc chạm, rồi bay theo hướng mặt; vô-lê: bóng ngang hông
  const BALL = ['.KKK.', 'KWWWK', 'KWKWK', 'KWWWK', '.KKK.'], BC = { K: '#140c16', W: '#f4f1e8' };
  function ball(c, x, y, face, k, high) {
    const fx = Math.cos(face), fy = Math.sin(face), d = high === 'head' ? Math.abs(k - HC) * 4 : Math.max(0, k - SHOT0) * 5.5;
    // lệch 2 px về phía chân phải (trục X của cầu thủ: nhìn xuống = trái màn hình, nhìn lên = phải màn hình)
    const bx = Math.round(x + fx * (9 + d) - fy * 2), gy = Math.round(y + fy * (4 + d * 0.6)), by = gy - (high === 'head' ? 36 : high ? 9 : 2);
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(bx - 2, gy, 5, 1);
    BALL.forEach((r, j) => { for (let i = 0; i < 5; i++) if (r[i] !== '.') { c.fillStyle = BC[r[i]]; c.fillRect(bx - 2 + i, by - 2 + j, 1, 1); } });
  }
  const CW = 104, CH = 96;
  const img = sheetOnly('pilot', N, LIST.length, CW, CH, (k, r) => {
    const [id, , , face, fn, n] = LIST[r];
    if (k >= n) return null;
    const o = fn(k);
    const shotRow = id === 'shoot' || id === 'volley' || id === 'header', up = Math.sin(face) < -0.5, hi = id === 'header' ? 'head' : id === 'volley';
    return [false, (c, x, y) => {
      if (shotRow && up) ball(c, x, y, face, k, hi);
      NEW.drawPlayer(c, P(Object.assign({ x, y, facing: face }, o)), G(HOME));
      if (shotRow && !up) ball(c, x, y, face, k, hi);
    }, Math.cos(face) > 0.5 ? 20 : 26];
  });
  // thủ môn đổ người: ô 104 x 232 px (52 x 116 thế giới), vạch vôi sau lưng, bóng bay tới găng đúng lúc hết cú bay
  const DCW = 104, DCH = 232, DIST = PL.gkDiveSpeed * PL.gkDiveTime;
  const dimg = sheetOnly('dive', N, DLIST.length, DCW, DCH, (k, r) => {
    const [, , , face, fn, n, , dy] = DLIST[r];
    if (k >= n) return null;
    const o = fn(k), side = Math.cos(face) >= 0 ? 1 : -1;
    // quãng đã bay (px thế giới): 0 trước khi bay, tăng đều lúc bay, giữ từ lúc nằm
    // đứng dậy xong vẫn đứng ở chỗ đến 15 khung (như trong game) rồi vòng lặp mới về chỗ cũ
    const fk = k < DV0 ? 0 : k < DV0 + DVF ? (k - DV0) / DVF : 1, d = dy * DIST * fk;
    return [false, (c, x, y) => {
      // y = đáy ô (base 0): bay lên bắt đầu gần đáy, bay xuống bắt đầu gần đỉnh (hình lật, đầu đi trước xuống dưới)
      const y0 = dy < 0 ? y - 14 : y - 86, yy = Math.round(y0 + d);
      c.fillStyle = 'rgba(255,255,255,0.55)'; c.fillRect(x - side * 9, 0, 1, DCH);   // vạch vôi sau lưng thủ môn
      if (o.dive) diving2(c, P(Object.assign({ x, y: yy, facing: face, keeper: true, atkType: o.dive }, o)), G(HOME));
      else NEW.drawPlayer(c, P(Object.assign({ x, y: yy, facing: face, keeper: true }), o), G(HOME));
      // bóng: từ phía sân bay tới chỗ găng lúc hết cú bay, rồi nằm trong găng lúc nằm
      // chỗ găng lúc hết cú bay (đo trên ảnh): bay lên 5 px trên chân, bay xuống 2 px dưới
      const ey = Math.round(y0 + dy * DIST + (dy < 0 ? -5 : 2)), ex = x + side * 2, bt = Math.min(1, Math.max(0, (k - DV0 + 4) / (DVF + 4)));
      if (k >= DV0 - 4 && k < DV0 + DVF + DVL - Math.round(PlayerSprite.DIVE.getup * 60)) {   // ẩn khi bắt đầu đứng dậy
        const bx = Math.round(ex + side * 40 * (1 - bt)), by = Math.round(ey - (1 - bt) * 4);
        BALL.forEach((rr, j) => { for (let i = 0; i < 5; i++) if (rr[i] !== '.') { c.fillStyle = BC[rr[i]]; c.fillRect(bx - 2 + i, by - 2 + j, 1, 1); } });
      }
    }, 26];
  }, 0);
  // bị đá bay: vật lý như game (combat.hard launch / knockback, airGravity, airDamp, knockbackDamp, nảy 30% khi rơi nhanh hơn 140 px/s),
  // 1 đối tượng cầu thủ cho cả hàng (đổi dần theo khung) để flyState theo dõi lúc chạm đất như trong trận. 30 khung / s (mỗi ô = 2 bước 1/60 s)
  const CB = GC.combat, FCW = 520, FCH = 160, FN = 56, FL0 = 3;
  const FLIST = [['fly', 'Knocked flying', 'hit from the left', DIRS.sideL, 1], ['fly', 'Knocked flying', 'hit from the right', DIRS.side, -1]];
  const fpl = FLIST.map(([, , , face, dir]) => P({ x: dir > 0 ? 12 : FCW / 2 - 12, y: 0, facing: face, anim: 0 }));
  const step = (p, r, f) => {
    const dir = FLIST[r][4], dt = 1 / 60;
    if (f === FL0 * 2) Object.assign(p, { state: 'stun', airZ: 0.5, airVz: CB.hard.launch, kbx: dir * CB.hard.knockback, kby: 0 });
    p.anim += dt;
    const air = p.airZ > 0;
    p.kbx = (p.kbx || 0) * Math.exp(-(air ? CB.airDamp : CB.knockbackDamp) * dt); p.x += p.kbx * dt;
    if (air) {
      p.airVz -= CB.airGravity * dt; p.airZ += p.airVz * dt;
      if (p.airZ <= 0) { p.airZ = 0; if (p.airVz < -140) { p.airVz = -p.airVz * 0.3; p.airZ = 0.01; } else p.airVz = 0; }
    }
  };
  // như Renderer.airborne nhưng góc xoay lấy từ PlayerSprite.flyRot (lộn -> về nằm khi chạm đất); dưới đất drawPlayer tự xoay lúc nằm / dậy
  const airborne2 = (ctx, p, g) => {
    const fs = PlayerSprite.flyState(p), k = Math.max(0.35, 1 - p.airZ / 70);
    // nảy lúc đã nằm: bóng nằm trên đất (PlayerSprite.flyShadowSpec), không theo độ cao
    const lsh = PlayerSprite.flyShadowSpec(fs);
    if (lsh) { ctx.save(); ctx.scale(0.5, 0.5); PlayerSprite.flyShadow(ctx, 2 * Math.round(p.x), 2 * Math.round(p.y), lsh); ctx.restore(); }
    else OLD.ellipse(ctx, Math.round(p.x), Math.round(p.y) + 1, 6 * k, 2.5 * k, 'rgba(0,0,0,0.38)');
    const cy = p.y - p.airZ - 8, sp = Math.abs(p.kbx || 0);
    if (sp > 80 && fs.phase === 'tumble') { const nx = Math.sign(p.kbx); ctx.globalAlpha = Math.min(0.8, sp / 400); for (let i = 0; i < 3; i++) OLD.px(ctx, Math.round(p.x - nx * (12 + i * 3)), Math.round(cy + (i - 1) * 5), 6 - i, 1, '#ffffff'); ctx.globalAlpha = 1; }
    ctx.save(); ctx.translate(Math.round(p.x), Math.round(cy)); ctx.rotate(PlayerSprite.flyRot(fs, p.anim));
    PlayerSprite.drawPlayer(ctx, Object.assign({}, p, { x: 0, y: 8, keeper: false, fly: fs }), g, 0.999);
    ctx.restore();
  };
  const fimg = sheetOnly('fly', FN, FLIST.length, FCW, FCH, (k, r) => {
    const p = fpl[r];
    step(p, r, 2 * k); step(p, r, 2 * k + 1);
    const snap = Object.assign({}, p);
    return [false, (c, x, y) => {
      p.y = y - 10;
      if (p.airZ > 0) airborne2(c, p, G(HOME)); else NEW.drawPlayer(c, p, G(HOME));
    }, 0];
  }, 0);
  // trạng thái (duyệt A7): ô 128 x 176 (64 x 88 thế giới), mỗi hàng 1 cầu thủ chạy theo khung (60 / s) như trong trận.
  // stun = choáng đứng tại chỗ (63 khung = sao quay đủ 1 vòng) · hit = bị đấm: chớp trắng 0.12 s + choáng combat.light.stun + đẩy lùi light.knockback
  // dash = lướt (skill): bóng mờ đầu ở chỗ xuất phát, còn lại rải đều dọc đường (như Actions.dash / Player.update) · keeper / injured = đứng rồi chạy tại chỗ
  const SK = GC.skill, LT = GC.combat.light, SCW = 128, SCH = 176, SN = 64, H0 = 6, D0 = 8, RUN0 = 20, FX = 32, FY = 62, dt = 1 / 60;
  const SLIST = [];
  for (const [id, name, n] of [['hit', 'Light hit', SN], ['stun', 'Stunned', 63], ['dash', 'Dash ghost', SN], ['keeper', 'Keeper gloves', SN], ['injured', 'Injured', SN],
    ['decoy', 'Fake Run decoy', SN], ['smoke', 'Smoke Bomb (team view)', SN], ['giant', 'Giant', SN], ['panic', 'Panic', SN]])
    for (const [dir, face] of D4) SLIST.push([id, name, dir, face, n, 'done']);   // duyệt 2026-11-01
  // đẩy lùi / lướt đi tổng cộng bao xa (px): đặt điểm đầu sao cho cả quãng nằm giữa ô
  const HIT_D = LT.knockback / CB.knockbackDamp, DASH_D = SK.dashSpeed * SK.dashTime + (SK.dashSpeed * 0.5) / 14;   // + trượt sau khi lướt (nửa tốc độ, hãm 14 / s)
  const spl = SLIST.map(([id, , , face]) => {
    const ux = Math.cos(face), uy = Math.sin(face), d = id === 'hit' ? -HIT_D : id === 'dash' ? DASH_D : 0;
    return { p: P({ x: FX - (ux * d) / 2, y: (d ? FY : FY + 8) - (uy * d) / 2, facing: face, anim: 0, id: 0, keeper: id === 'keeper',
      inj: id === 'injured' ? ['wrist', 'ankle', 'toe', 'hamstring'] : null }), ghosts: [], kb: [0, 0] };
  });
  const sstep = (s, id, k) => {
    const p = s.p, ux = Math.cos(p.facing), uy = Math.sin(p.facing);
    p.anim += dt;
    if (id === 'stun') p.state = 'stun';
    if (id === 'hit') {
      if (k === H0) { p.state = 'stun'; p.stateT = LT.stun; p.flash = 0.12; s.kb = [-ux * LT.knockback, -uy * LT.knockback]; }
      p.flash = Math.max(0, p.flash - dt);
      if (p.state === 'stun' && (p.stateT -= dt) <= 0) p.state = 'normal';
      p.x += s.kb[0] * dt; p.y += s.kb[1] * dt; const dm = Math.exp(-CB.knockbackDamp * dt); s.kb = [s.kb[0] * dm, s.kb[1] * dm];
    }
    if (id === 'dash') {
      const ghost = () => s.ghosts.push({ x: p.x, y: p.y, facing: p.facing, team: 0, role: p.role, look: p.look, anim: p.anim, vx: 0, vy: 0, t: 0.3, max: 0.3 });
      if (k === D0) { p.state = 'dash'; p.stateT = SK.dashTime; p.vx = ux * SK.dashSpeed; p.vy = uy * SK.dashSpeed; ghost(); s.left = SK.afterimages - 1; s.tt = SK.dashTime / SK.afterimages; }
      if (p.state === 'dash') {
        if (s.left > 0 && (s.tt -= dt) <= 0) { s.left--; s.tt += SK.dashTime / SK.afterimages; ghost(); }
        if ((p.stateT -= dt) <= 0) { p.state = 'normal'; p.vx *= 0.5; p.vy *= 0.5; }
      } else { const dm = Math.exp(-14 * dt); p.vx *= dm; p.vy *= dm; if (Math.hypot(p.vx, p.vy) < 5) p.vx = p.vy = 0; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      for (const a of s.ghosts) a.t -= dt;
      s.ghosts = s.ghosts.filter((a) => a.t > 0);
    }
    // đứng RUN0 khung rồi chạy tại chỗ (tốc độ chạy thường, chưa tới mức nghiêng người nước rút)
    // decoy / smoke chạy suốt
    if (['keeper', 'injured', 'giant', 'panic', 'decoy', 'smoke'].includes(id)) { const v = k < RUN0 && id !== 'decoy' && id !== 'smoke' ? 0 : 80; p.vx = ux * v; p.vy = uy * v; }
  };
  const simg = sheetOnly('states', SN, SLIST.length, SCW, SCH, (k, r) => {
    const [id, , , , n] = SLIST[r], s = spl[r];
    if (k >= n) return null;
    sstep(s, id, k);
    return [false, (c) => {
      const g = Object.assign(G(HOME), { time: k / 60, state: 'play' });
      // bóng mờ y-sort với cầu thủ như renderer (a.y - 0.1)
      const items = s.ghosts.map((a) => [a.y - 0.1, () => PlayerSprite.drawPlayer(c, a, g, (a.t / a.max) * 0.5, null, true)]);
      // như renderer: decoy = cầu thủ áo tím sau quả bóng giả, nhấp nháy (alpha (0.5 + 0.3 sin 20t) x 0.8) · smoke = đồng đội thấy mờ 0.3 ·
      // giant = phóng to quanh chân (sizeMul 1.6 như luật PROTEIN SHAKE) · panic = run lẩy bẩy ±1 px mỗi 1/30 s
      const p = s.p, t = k / 60, ux = Math.cos(p.facing), uy = Math.sin(p.facing);
      items.push([p.y, () => {
        if (id === 'decoy') {
          const a = 0.5 + 0.3 * Math.sin(t * 20);
          PlayerSprite.drawPlayer(c, Object.assign({}, p, { x: p.x - ux * 9, y: p.y - uy * 8, state: 'normal', flash: 0 }), g, a * 0.8, '#9d7bff');
          OLD.drawBall(c, { x: p.x, y: p.y, z: 0, roll: t * 20, fx: {} }, a);
        } else if (id === 'smoke') PlayerSprite.drawPlayer(c, p, g, 0.3);
        else if (id === 'giant') { c.save(); c.translate(p.x, p.y); c.scale(1.6, 1.6); c.translate(-p.x, -p.y); PlayerSprite.drawPlayer(c, p, g); c.restore(); }
        else if (id === 'panic') { c.save(); c.translate(Math.floor(t * 30) % 2 ? 1 : -1, 0); PlayerSprite.drawPlayer(c, p, g); c.restore(); }
        else { const hy = PlayerSprite.drawPlayer(c, p, g); if (p.inj) SFC.RunDraw.hurt(c, g, p, hy); }
      }]);
      items.sort((a, b) => a[0] - b[0]).forEach(([, f]) => f());
    }, 0];
  }, 0);
  // nhảy (ô cao 176 x 240 = 88 x 120 thế giới): slam = Ground Slam (Actions.hard -> jumpSlam: bật jump px/s, lướt tới leap / 2 px, không mục tiêu)
  // bicycle = Comet One-Two (cores-ult2: bật jump px/s, atkType 'bicycle', chạm bóng lúc 0.4 s). Trọng lực combat.airGravity.
  // Vẽ như Renderer.airborne: bóng đổ thu theo độ cao, người nâng airZ, móc xe đạp lộn ngược -(hướng) * min(2, atkT / 0.42) * π
  const GS = SFC_CONFIG.cores.list.ground_slam.params, CO = SFC_CONFIG.cores.list.comet_onetwo.params;
  const ACW = 176, ACH = 240, AN = 72, A0 = 6;
  const ALIST = [];
  for (const [id, name] of [['slam', 'Ground Slam jump'], ['bicycle', 'Bicycle kick (Comet One-Two)']]) for (const [dir, face] of D4) ALIST.push([id, name, dir, face, AN, 'done']);   // duyệt 2026-11-01
  const SLAM_AIR = (2 * GS.jump) / CB.airGravity, SLAM_D = GS.leap * 0.5;
  const apl = ALIST.map(([id, , , face]) => {
    const ux = Math.cos(face), uy = Math.sin(face), d = id === 'slam' ? SLAM_D : 0;
    return P({ x: 44 - (ux * d) / 2, y: (id === 'slam' ? 78 : 112) - (uy * d) / 2, facing: face, anim: 0, id: 0, airZ: 0, airVz: 0 });
  });
  const astep = (p, id, k) => {
    const ux = Math.cos(p.facing), uy = Math.sin(p.facing);
    p.anim += dt;
    if (k === A0) {
      p.airZ = 0.5; p.airVz = id === 'slam' ? GS.jump : CO.jump;
      if (id === 'slam') { p.state = 'slam'; p.vx = (ux * SLAM_D) / SLAM_AIR; p.vy = (uy * SLAM_D) / SLAM_AIR; } else { p.atkType = 'bicycle'; p.atkT = 0; }
    }
    if (p.atkType === 'bicycle') p.atkT += dt;
    if (p.airZ > 0) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.airVz -= CB.airGravity * dt; p.airZ += p.airVz * dt;
      if (p.airZ <= 0) { p.airZ = 0; p.airVz = 0; p.vx = p.vy = 0; p.state = 'normal'; }
    }
    if (p.atkType === 'bicycle' && p.airZ <= 0 && p.atkT > 0.95) p.atkType = null;
  };
  const aimg = sheetOnly('air', AN, ALIST.length, ACW, ACH, (k, r) => {
    const [id] = ALIST[r], p = apl[r];
    astep(p, id, k);
    return [false, (c) => {
      const g = G(HOME);
      if (!(p.airZ > 0)) return PlayerSprite.drawPlayer(c, p, g);
      const kk = Math.max(0.35, 1 - p.airZ / 70), cy = p.y - p.airZ - 8;
      OLD.ellipse(c, Math.round(p.x), Math.round(p.y) + 1, 6 * kk, 2.5 * kk, 'rgba(0,0,0,0.38)');
      c.save(); c.translate(Math.round(p.x), Math.round(cy));
      if (p.atkType === 'bicycle') c.rotate(-(Math.cos(p.facing) >= 0 ? 1 : -1) * Math.min(2, (p.atkT || 0) / 0.42) * Math.PI);
      PlayerSprite.drawPlayer(c, Object.assign({}, p, { x: 0, y: 8, keeper: false }), g, 0.999);
      c.restore();
    }, 0];
  }, 0);
  // ăn mừng (A6): mỗi động tác 1 hàng nhìn xuống như xem trước ở túi đồ (preview), dài match.goalCelebration s, 30 khung / s.
  // Đợt đang làm: nhóm 'review'; đợt sau thêm id vào CEL_BATCH
  const CEL_DONE = ['fistpump', 'airplane', 'skypoint', 'shush', 'kneeslide', 'flex', 'bow', 'robot', 'dab', 'spinjump', 'worm', 'phonecall', 'nap', 'backflip', 'moonwalk', 'firebreath', 'fireworks', 'ascend', '_win2', '_draw', 'makeitrain', ['_lose', 'Losing team (sit)', { id: 1 }], ['_lose', 'Losing team (stand)', { id: 0 }]];   // đã duyệt
  // _lose: cầu thủ id lẻ ngồi bệt, id chẵn đứng ôm đầu -> 2 hàng
  const CEL_DONE2 = ['levitate'];
  const CEL_BATCH = [];
  const CCW = 112, CCH = 176, CFPS = 30, CN = Math.round(GC.match.goalCelebration * CFPS);
  const CNAMES = Object.fromEntries(Object.entries(PR.items).filter(([, it]) => it.slot === 'cel').map(([i, it]) => [i, it.name]));
  const EXTRA = { _win2: 'Winning team', _draw: 'Draw' };
  const row = (e, group) => { const [id, name, o] = Array.isArray(e) ? e : [e, CNAMES[e] || EXTRA[e] || e, {}]; return ['cel_' + id, name, 'down', CN, group, id, o]; };
  const CLIST = CEL_DONE.concat(CEL_DONE2).map((e) => row(e, 'done')).concat(CEL_BATCH.map((e) => row(e, 'review')));
  const cimg = sheetOnly('cel', CN, CLIST.length, CCW, CCH, (k, r) => {
    const [, , , , , id, o] = CLIST[r];
    return [false, (c) => PlayerSprite.celDraw(c, P(Object.assign({ x: CCW / 4, y: CCH / 2 - 10, celId: id, celT: k / CFPS, facing: DIRS.front, preview: true, look: lookOf({ cel: id }) }, o)), G(HOME)), 0];
  }, 0);
  // tóc / mũ (B8): mỗi kiểu 1 hàng, 4 hướng đứng cạnh nhau trong 1 ô rộng, 20 khung / s (tóc lửa, vòng thánh, aura chuyển động)
  const HAIRS = Object.entries(PR.items).filter(([, it]) => it.slot === 'hair').map(([id, it]) => [id, it.name]).concat([['aura', 'Aura Farming (Ultimate)']]);
  const HCW = 448, HCH = 96, HN = 20, HFPS = 20;
  // đã duyệt (giữ trong check.cjs): classic, buzz, bowl, bucket, headphones (vẽ lại); beanie, bun, bandana, halo (bản chuyển thẳng)
  const HAIR_DONE = ['classic', 'buzz', 'bowl', 'beanie', 'bun', 'bandana', 'halo', 'bucket', 'headphones', 'mohawk', 'helmet', 'afro', 'spiky', 'longhair', 'cap', 'santa', 'ward_trophy', 'moon_cap', 'lantern_hat', 'cowboy', 'viking', 'crown', 'laurel', 'flamehair', 'aura'];
  const HLIST = HAIRS.map(([id, name]) => ['hair_' + id, name, 'down · down-right · right · up', HN, HAIR_DONE.includes(id) ? 'done' : 'review', id]);
  const himg = sheetOnly('hair', HN, HLIST.length, HCW, HCH, (k, r) => {
    const id = HLIST[r][5];
    // 4 hướng tóc mặc định (đen) rồi 4 hướng tóc nâu (hairColor 2) cho thấy sáng / tối
    return [false, (c) => [0, 2].forEach((hc, j) => [DIRS.front, DIRS.diag, DIRS.side, DIRS.back].forEach((f, i) => PlayerSprite.drawPlayer(c, P({ x: 14 + (j * 4 + i) * 28, y: HCH / 2 - 8, facing: f, anim: k / HFPS, look: lookOf({ hair: id, hairColor: hc }), auraFarmT: id === 'aura' ? 1 : 0 }), G(HOME)))), 0];
  }, 0);
  // phụ kiện mặt (B9): mỗi món 1 hàng, 8 ô: tóc đen da 0 nhìn xuống / chéo / ngang / lên, rồi tóc vàng da 3: ăn mừng (mắt ^ ^, há miệng) / chéo trái / ngang trái / chạy.
  // 40 khung, 16 khung / s = 2.5 s (kính râm loé 2.6 s, răng vàng 1.8 s, kính neon quét ~1.6 s)
  const FACES = Object.entries(PR.items).filter(([id, it]) => it.slot === 'face' && id !== 'none').map(([id, it]) => [id, it.name]);
  const FCN = 40, FFPS = 16;
  const FACE_DONE = ['mustache', 'bandaid', 'clown', 'nerd', 'blush', 'freckles', 'beard', 'scar', 'shades', 'mask', 'goldtooth', 'warpaint', 'eyepatch', 'monocle', 'ninja', 'cyborg', 'visor', 'skull', 'lasereyes'];   // đã duyệt 2026-11-01
  const FLIST2 = FACES.map(([id, name]) => ['face_' + id, name, 'down · down-right · right · up | cheer · down-left · left · run', FCN, FACE_DONE.includes(id) ? 'done' : 'review', id]);
  const faceImg = sheetOnly('face', FCN, FLIST2.length, HCW, HCH, (k, r) => {
    const id = FLIST2[r][5], t = k / FFPS;
    const slots = [[DIRS.front], [DIRS.diag], [DIRS.side], [DIRS.back], [DIRS.front, { celPose: { eyes: 'happy', mouth: true } }], [DIRS.diagL], [DIRS.sideL], [DIRS.front, { vx: 60 }]];
    return [false, (c) => slots.forEach(([f, ex], i) => PlayerSprite.drawPlayer(c, P(Object.assign({ x: 14 + i * 28, y: HCH / 2 - 8, facing: f, anim: t, look: lookOf(i < 4 ? { face: id } : { face: id, hairColor: 3, skin: 3 }) }, ex || {})), G(HOME))), 0];
  }, 0);
  // giày (B10): mỗi kiểu 1 hàng, 8 ô: đứng nhìn xuống / chéo / ngang / lên · chạy ngang · chạy xuống · Hard attack (ngang) · sút (chéo). 30 khung / s, 1 s
  const SHOES = Object.entries(PR.items).filter(([, it]) => it.slot === 'shoes').map(([id, it]) => [id, it.name]);
  const SN2 = 30, SFPS = 30, HK = GC.combat.hard;
  const SHOE_DONE = SHOES.map(([id]) => id);   // duyệt hết 2026-11-01
  const SLIST2 = SHOES.map(([id, name]) => ['shoe_' + id, name, 'stand down · down-right · right · up | run right · run down · hard kick · shoot', SN2, SHOE_DONE.includes(id) ? 'done' : 'review', id]);
  const shoeImg = sheetOnly('shoes', SN2, SLIST2.length, HCW, HCH, (k, r) => {
    const id = SLIST2[r][5], t = k / SFPS;
    const kick = t < HK.windup + HK.kickTime + 0.15 ? { atkType: 'hard', atkT: t, state: t < HK.windup ? 'windup' : 'normal' } : {};
    const shot = t < GC.kick.poseTime ? { atkType: 'shoot', atkT: t } : {};
    const slots = [[DIRS.front], [DIRS.diag], [DIRS.side], [DIRS.back], [DIRS.side, { vx: 60 }], [DIRS.front, { vy: 60 }], [DIRS.side, kick], [DIRS.diag, shot]];
    return [false, (c) => slots.forEach(([f, ex], i) => PlayerSprite.drawPlayer(c, P(Object.assign({ x: 14 + i * 28, y: HCH / 2 - 8, facing: f, anim: t, look: lookOf({ shoes: id }) }, ex || {})), G(HOME))), 0];
  }, 0);
  // hiệu ứng trang phục (B11): mỗi hiệu ứng 1 hàng, 3 ô: hôm nay (sprite + hạt cũ) chạy ngang · mới chạy ngang · mới chạy xuống. Cầu thủ chạy tại chỗ
  // 100 px/s, hạt trôi ngược như sân trôi (chạy trên băng chuyền); hạt sinh / bay bằng code của game (spawnFx / stepFx), Math.random gieo cố định
  // để mỗi lần vẽ ra giống nhau; bỏ 1.2 s đầu cho dòng hạt đầy. 20 khung / s, 1.5 s
  const FXS = Object.entries(PR.items).filter(([id, it]) => it.slot === 'fx' && id !== 'nofx').map(([id, it]) => [id, it.name]);
  const FXN = 30, FXFPS = 20, FXW = 768, FXH = 160, FX_DONE = FXS.map(([id]) => id);   // duyệt hết 2026-11-01
  const FXLIST = FXS.map(([id, name]) => ['fx_' + id, name, 'today run right | new run right · run down', FXN, FX_DONE.includes(id) ? 'done' : 'review', id]);
  function simFx(kind) {
    let seed = 12345; const r0 = Math.random; Math.random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    const d = OLD.FX[kind], runs = [{ vx: 100, vy: 0, facing: DIRS.side }, { vx: 0, vy: 100, facing: DIRS.front }], lists = [[], []], frames = [], W0 = 72;
    for (let s = 0, clock = 0; s < W0 + FXN * 3; s++) {
      clock += 1 / 60;
      runs.forEach((rr, i) => {
        const p = Object.assign({ x: 0, y: 0, team: 0, look: lookOf({ fx: kind }), anim: clock, role: 'FWD' }, rr);
        if (d) { rr.acc = (rr.acc || 0) + d.rate / 60; while (rr.acc >= 1) { rr.acc--; const q = OLD.spawnFx(kind, p, clock); if (q) lists[i].push(q); } }
        for (const q of lists[i]) { OLD.stepFx(q, 1 / 60); q.x -= rr.vx / 60; q.y -= rr.vy / 60; }
        lists[i] = lists[i].filter((q) => q.t > 0);
      });
      if (s >= W0 && (s - W0) % 3 === 0) frames.push(lists.map((l) => l.map((q) => Object.assign({}, q))));
    }
    Math.random = r0;
    return frames;
  }
  const fxSim = {};
  const fxImg = sheetOnly('fx', FXN, FXLIST.length, FXW, FXH, (k, r) => {
    const id = FXLIST[r][5], t = k / FXFPS, fr = (fxSim[id] = fxSim[id] || simFx(id))[k], g = G(HOME);
    const slots = [[120, 0, OLD, OLD.drawFxParticle], [250, 0, PlayerSprite, PlayerSprite.drawFxParticle], [340, 1, PlayerSprite, PlayerSprite.drawFxParticle]];
    return [false, (c) => slots.forEach(([sx, run, S, draw]) => {
      c.save(); c.translate(sx, 64);
      for (const q of fr[run]) draw(c, q, g);
      S.drawPlayer(c, P(Object.assign({ x: 0, y: 0, anim: t, look: lookOf({ fx: id }) }, run ? { vy: 100, facing: DIRS.front } : { vx: 100, facing: DIRS.side })), g);
      c.restore();
    }), 0];
  }, 0);
  // áo mọi đội (B12): đi hết SFC_CONFIG tìm mọi bộ áo { shirt, shirtDark, shorts }, bỏ trùng; mỗi bộ 1 hàng, 8 ô: hôm nay nhìn xuống ·
  // mới nhìn xuống / chéo / ngang / lên · chạy ngang · chạy xuống · thủ môn (găng màu phụ). Ô i: da i % 5, tóc kit.hair[i % n] như cầu thủ AI. Duyệt 2026-11-01 (cả 3 sửa màu, kitColors trong player.js)
  const KITS = [], seenK = new Set();
  // tên hàng = tên đội (name của vật chứa bộ áo), không có thì đường dẫn; bộ áo phụ (awayKit, youngKit) ghi thêm tên khoá
  (function walk(v, path, up) {
    if (!v || typeof v !== 'object' || path.length > 7) return;
    if (v.shirt && v.shirtDark && v.shorts) {
      const key = JSON.stringify([v.shirt, v.shirtDark, v.shorts, v.accent]), last = path[path.length - 1];
      if (!seenK.has(key)) { seenK.add(key); KITS.push([((up && up.name) || path.slice(-3, -1).join(' / ')) + (last === 'kit' ? '' : ' (' + last + ')'), v, path[path.length - 2]]); }
      return;
    }
    for (const k of Object.keys(v)) walk(v[k], path.concat(k), v);
  })(SFC_CONFIG, [], null);
  const KN = 20, KFPS = 20;
  const KLIST = KITS.map(([name, kit], i) => ['kit_' + i, name, 'today down | down · down-right · right · up · run right · run down · keeper', KN, 'done', kit]);
  const kitImg = sheetOnly('kits', KN, KLIST.length, HCW, HCH, (k, r) => {
    const kit = KLIST[r][5], t = k / KFPS, g = G(kit), hs = kit.hair || ['#1a1216'];
    const lk = (i) => Object.assign(lookOf({ skin: i % T.skins.length }), { hair: hs[i % hs.length] });
    const slots = [[DIRS.front, {}, OLD], [DIRS.front], [DIRS.diag], [DIRS.side], [DIRS.back], [DIRS.side, { vx: 60 }], [DIRS.front, { vy: 60 }], [DIRS.front, { keeper: true }]];
    return [false, (c) => slots.forEach(([f, ex, S], i) => (S || PlayerSprite).drawPlayer(c, P(Object.assign({ x: 14 + i * 28, y: HCH / 2 - 8, facing: f, anim: t, look: lk(i) }, ex || {})), g)), 0];
  }, 0);
  // màu tóc × màu da (B12): mỗi màu tóc 1 hàng (bảng hairColors của người chơi rồi màu chỉ có ở tóc đội), 5 màu da nhìn xuống rồi 5 màu da nhìn ngang
  const HCOLS = PR.hairColors.slice();
  KITS.forEach(([, kit]) => (kit.hair || []).forEach((h) => { if (!HCOLS.includes(h)) HCOLS.push(h); }));
  const TONE_W = 576, TN = 20;
  const TLIST = HCOLS.map((h, i) => ['tone_' + i, 'Hair ' + h + (i < PR.hairColors.length ? '' : ' (team only)'), 'skins 0-4 down | skins 0-4 right', TN, 'done', h]);
  const toneImg = sheetOnly('tones', TN, TLIST.length, TONE_W, HCH, (k, r) => {
    const h = TLIST[r][5], t = k / KFPS;
    return [false, (c) => [DIRS.front, DIRS.side].forEach((f, j) => T.skins.forEach((s, i) => PlayerSprite.drawPlayer(c, P({ x: 14 + (j * 5 + i) * 28, y: HCH / 2 - 8, facing: f, anim: t, look: Object.assign(lookOf({ skin: i }), { hair: h }) }), G(HOME)))), 0];
  }, 0);
  return {
    kits: { img: kitImg, cw: HCW, ch: HCH, n: KN, fps: KFPS, list: KLIST.map(([id, name, dir, n, group]) => [id, name, dir, n, group]) },
    tones: { img: toneImg, cw: TONE_W, ch: HCH, n: TN, fps: KFPS, list: TLIST.map(([id, name, dir, n, group]) => [id, name, dir, n, group]) },
    fx: { img: fxImg, cw: FXW, ch: FXH, n: FXN, fps: FXFPS, list: FXLIST.map(([id, name, dir, n, group]) => [id, name, dir, n, group]) },
    shoes: { img: shoeImg, cw: HCW, ch: HCH, n: SN2, fps: SFPS, list: SLIST2.map(([id, name, dir, n, group]) => [id, name, dir, n, group]) },
    face: { img: faceImg, cw: HCW, ch: HCH, n: FCN, fps: FFPS, list: FLIST2.map(([id, name, dir, n, group]) => [id, name, dir, n, group]) },
    hair: { img: himg, cw: HCW, ch: HCH, n: HN, fps: HFPS, list: HLIST.map(([id, name, dir, n, group]) => [id, name, dir, n, group]) },
    cel: { img: cimg, cw: CCW, ch: CCH, n: CN, fps: CFPS, list: CLIST.map(([id, name, dir, n, group]) => [id, name, dir, n, group]) },
    air: { img: aimg, cw: ACW, ch: ACH, n: AN, list: ALIST.map(([id, name, dir, , n, group]) => [id, name, dir, n, group]) },
    states: { img: simg, cw: SCW, ch: SCH, n: SN, list: SLIST.map(([id, name, dir, , n, group]) => [id, name, dir, n, group]) },
    fly: { img: fimg, cw: FCW, ch: FCH, n: FN, fps: 30, list: FLIST.map(([id, name, dir]) => [id, name, dir, FN, 'done']) },
    pilot: { img, cw: CW, ch: CH, n: N, list: LIST.map(([id, name, dir, , , n, group]) => [id, name, dir, n, group]) },
    dive: { img: dimg, cw: DCW, ch: DCH, n: N, list: DLIST.map(([id, name, dir, , , n, group]) => [id, name, dir, n, group]) },
  };
})()`);
if (!res) { console.log('failed', errors); close(); process.exit(1); }
for (const k of Object.keys(res)) if (!res[k].img) delete res[k];
save(join(OUT, 'pilot'), res, !!ONLY);
console.log('pilot ok', 'errors:', errors.length ? errors : 'none');
close(); process.exit(0);
