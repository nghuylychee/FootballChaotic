/* PlayerSprite3 · keeper.js (Sprite v3 đợt 3, 2026-11-07) — thủ môn: ôm / đón bóng, đỡ tại chỗ, tung bóng đá (gkPunt / gkVolley), đổ người
 * (khung vẽ riêng bay / chạm đất / nằm / bò / quỳ ôm bóng) và đứng dậy. Nhịp + tư thế lấy nguyên của v2 (player/keeper.js, player/gkball.js đã duyệt);
 * chỉ hình học đổi theo người 31 px: toạ độ x 1,3 (đổi như attack.js), găng 4 x 4 (khung đổ người 6 x 6), thân / chân của khung đổ người vẽ lại
 * theo thân v3, chi bút 3 x 3. Bóng trên tay giữ đúng cỡ quả bóng trong trận (9 px). Nạp sau body.js + attack.js.
 */
window.SFC = window.SFC || {};

(function () {
  const S3 = SFC.PlayerSprite3, V2 = SFC.PlayerSprite;
  const { stamp, at, limbCells, blockCells, drawCells, BODY, cx, cy, cp } = S3;
  const P = Math.PI;

  /* ---------- khung đổ người (như v2 keeper.js DIVE_FRAMES) ---------- */
  // ảnh ô (Y = màu găng); thân = thân đứng v3, chân vẽ lại cao hơn 1 hàng
  const ART = {
    glove: ['.KKKK.', 'KWYYYK', 'KYYYYK', 'KYYYYK', 'KYYYYK', '.KKKK.'],
    torsoF: BODY.front.rows,
    torsoB: BODY.bdiag.rows,
    legHang: ['KKKKK', 'KJJJK', 'KOOOK', 'KOOOK', 'KGGGK', '.KKK.'],
    legTuck: ['KKKKK', 'KOOOK', 'KOOOK', 'KGGGK', '.KKK.'],
    legSole: ['KKKKK', 'KJJJK', 'KOOOK', 'KOOOK', 'KgggK', 'KgggK', '.KKK.'],
    legKneel: ['KKKKK', 'KOOOK', 'KgggK', 'KgggK', '.KKK.'],
    legKneelF: ['KKKKK', 'KJJJK', 'KJJJK', 'KJJJK', '.KKK.'],
  };
  function slant(rows, sh) { const lo = Math.min(...sh); return rows.map((r, j) => '.'.repeat(sh[j] - lo) + r); }
  // thân ngả về phía bóng (cột dịch phải từng hàng, vai -> đáy quần; thân v3 10 hàng)
  const LEAN = [3, 3, 2, 2, 1, 1, 1, 0, 0, 0], LEAN1 = [1, 1, 1, 1, 0, 0, 0, 0, 0, 0];
  ART.torsoFTilt = slant(ART.torsoF, LEAN);
  const sc = (v) => Math.round(v * 1.3);
  // bay lên / nằm / bò nhìn sau lưng chéo (như v2 awayFrame): oy = hạ người · arms = [vai 'R' | 'L', [dx, dy] từ vai tới cổ tay] (v2, x 1,3)
  function awayFrame(id, sh, oy, arms, extra, legArt = 'legSole') {
    ART['torso_' + id] = slant(ART.torsoB, sh);
    const ty = -14 + oy, tx = -6;
    const legs = [[legArt, tx + 1, ty + 9], [legArt, tx + 7, ty + 8]], torso = ['torso_' + id, tx, ty];
    const f = { base: legs.slice(), head: [sh[0], oy], gloves: [], hold: { base: legs.slice(), gloves: [] } };
    const armAt = (side, [ax, ay]) => {
      const sx = side === 'R' ? tx + sh[1] + 9 : tx + sh[1] + 1, sy = ty + 1, ex = sx + sc(ax), ey = sy + sc(ay);
      return [['arm', [[sx, sy], [ex, ey]]], ['glove', ex - 2 + Math.sign(ax) * 2, ey - 3 + Math.min(0, Math.sign(ay)) * 2]];
    };
    for (const [side, v] of arms) {
      const [arm, glove] = armAt(side, v);
      f.base.push(arm);
      if (side === 'L') f.base.push(glove); else f.gloves.push(glove.slice(1));
    }
    const raised = arms.some(([side, [, ay]]) => side === 'R' && ay < 0) && !(extra && extra.chestHold);
    const [ra, rg] = armAt('R', raised ? [3, -4] : [1, 3]), [la, lg] = armAt('L', raised ? [-3, -4] : [-1, 3]);
    if (raised) f.hold.base.push(ra, la, ['ball', (rg[1] + lg[1]) / 2 + 4, rg[2] + 3], rg, lg);
    else f.hold.base.push(ra, rg, la, lg);
    f.base.push(torso); f.hold.base.push(torso);
    return Object.assign(f, extra);
  }
  // khung nhìn chéo xuống: toạ độ v2 đổi sang v3
  const conv = (f) => Object.assign({}, f, {
    base: f.base.map(([n, x, y]) => [n, cx(x), cy(y)]),
    head: [sc(f.head[0]), sc(f.head[1])],
    gloves: f.gloves.map(cp),
    hold: f.hold && Object.assign({}, f.hold, { gloves: f.hold.gloves && f.hold.gloves.map(cp), ball: f.hold.ball && cp(f.hold.ball) }),
  });
  const LEGS_F = [['legHang', -6, -4], ['legHang', 0, -5]];
  const F = {
    fCrouch: conv({ base: [['legHang', -6, -4], ['legHang', 2, -4], ['torsoF', -5, -10]], head: [0, 1], gloves: [[-9, -8], [6, -9]] }),
    fJump: conv({ base: LEGS_F.concat([['torsoFTilt', -5, -11]]), head: [2, 0], gloves: [[-8, -11], [7, -13]], hold: { gloves: [[-6, -10], [5, -10]], ball: [2, -7] } }),
    fReach: conv({ base: [['legTuck', -5, -4], ['legTuck', 0, -4], ['torsoFTilt', -5, -11]], head: [2, 0], gloves: [[-6, -10], [6, -12]], hold: { gloves: [[-6, -10], [5, -10]], ball: [2, -7] } }),
    fStretch: conv({ base: [['torsoF', -3, -13]], head: [2, 4], gloves: [[-5, -9], [4, -10]], hold: { gloves: [[-6, -8], [5, -8]], ball: [2, -5] } }),
    fLand: conv({ base: [], head: [1, 8], gloves: [[-8, -6], [5, -7]], hold: { gloves: [[-7, -6], [4, -6]], ball: [1, -3] }, shadow: 'wide' }),
    fLie: conv({ base: [], head: [1, 7], gloves: [[-8, -6], [5, -7]], hold: { gloves: [[-7, -6], [4, -6]], ball: [1, -3] }, shadow: 'wide' }),
    fFours: conv({ base: [], head: [1, 5], gloves: [[-8, -6], [5, -7]], hold: { gloves: [[-7, -6], [4, -6]], ball: [1, -3] }, shadow: 'wide' }),
    bCrouch: conv({ base: [['legHang', -6, -4], ['legHang', 2, -4], ['torsoB', -5, -10]], head: [0, 1], gloves: [[-10, -8], [5, -8]] }),
    bReach1: awayFrame('reach1', LEAN1, 0, [['R', [1, -4]], ['L', [-2, 2]]]),
    bReach2: awayFrame('reach2', LEAN1, 0, [['R', [1, -4]], ['L', [-3, 0]]]),
    bStretch1: awayFrame('stretch1', LEAN, 0, [['R', [2, -4]], ['L', [-4, -2]]]),
    bStretch2: awayFrame('stretch2', LEAN, 0, [['R', [2, -4]], ['L', [-3, -4]]]),
    bLie: awayFrame('lie', LEAN, 5, [['R', [2, -3]], ['L', [-3, -4]]], { shadow: 'long' }),
    bFours: awayFrame('fours', LEAN, 3, [['R', [2, -2]], ['L', [-3, 3]]], { chestHold: true }, 'legKneel'),
    fKneel: conv({ base: [['legKneelF', -4, -3], ['legKneelF', 1, -3], ['torsoF', -5, -9]], head: [0, 2], gloves: [[-6, -8], [4, -8]], hold: { gloves: [[-6, -8], [4, -8]], ball: [1, -6] } }),
    bKneel: awayFrame('kneel', LEAN1, 3, [], { chestHold: true }, 'legKneel'),
  };
  // khung của lúc này (như v2 diveFrameOf), null = tư thế thường
  function diveFrameOf(atk) {
    const t = atk.toward;
    if (atk.flying) {
      if ((atk.ds || 0) < 0.5) return t ? F.fCrouch : F.bCrouch;
      const k = atk.dk || 0;
      return t ? (k < 0.45 ? F.fJump : k < 0.72 ? F.fReach : F.fStretch) : k < 0.25 ? F.bReach1 : k < 0.5 ? F.bReach2 : k < 0.75 ? F.bStretch1 : F.bStretch2;
    }
    if (atk.stage === 'land') return t ? F.fLand : F.bLie;
    if (atk.stage === 'lie') return t ? F.fLie : F.bLie;
    if (atk.hold && (atk.stage === 'fours' || atk.stage === 'rise')) return t ? F.fKneel : F.bKneel;
    if (atk.stage === 'fours') return t ? F.fFours : F.bFours;
    return null;
  }
  // 1 lớp của khung: 'base' trước đầu (chân, tay, thân) · 'front' sau đầu (bóng -> găng). mir = nhìn trái (lật cả khung)
  function diveFrameDraw(ctx, X, Y, f, layer, pal, hand, mir, ball) {
    const pal2 = Object.assign({}, pal, { Y: hand });
    const put = (name, x, y) => { const rows = ART[name], w = Math.max(...rows.map((r) => r.length)); stamp(ctx, X, Y, { x: mir ? -(x + w - 1) : x, y, rows: mir ? rows.map((r) => r.padEnd(w, '.').split('').reverse().join('')) : rows }, pal2); };
    const h = ball && f.hold ? Object.assign({}, f, f.hold) : f;
    const arm = (pts) => drawCells(ctx, X, Y, limbCells(pts, (k, i, n) => (i / n < 0.3 ? pal.t : pal.S)), mir);
    if (layer === 'base') { h.base.forEach(([n, a, b]) => (n === 'arm' ? arm(a) : n === 'ball' ? V2.heldBall(ctx, X, Y, mir, a, b) : put(n, a, b))); return; }
    if (ball && h.ball) V2.heldBall(ctx, X, Y, mir, h.ball[0], h.ball[1]);
    (h.gloves || []).forEach(([x, y]) => put('glove', x, y));
  }

  /* ---------- tư thế thủ môn thường (ôm / đón / đỡ / tung bóng / quỳ dậy): hình học v2 gkGeom, toạ độ x 1,3 ---------- */
  function gkGeom(st, view, m) {
    const G = V2.gkGeom(st, view, m);
    return Object.assign({}, G, {
      arms: G.arms && G.arms.map((pts) => pts.map(cp)),
      ball: G.ball && cp(G.ball),
      drop: (G.drop || 0) * 1.3, lean: (G.lean || 0) * 1.3,
    });
  }
  // chân: khuỵu (đứng dậy) / dạng rộng (đỡ tại chỗ) · quỳ 2 gối dưới quần (đứng dậy)
  function diveLegs(ctx, X, Y, pal, pose, toe, mir) {
    if (pose === 'bend') { stamp(ctx, X, Y, at(toe, -7), pal, mir); stamp(ctx, X, Y, at(toe, 3), pal, mir); }
    else if (pose === 'wide') { stamp(ctx, X, Y, at(toe, -8), pal, mir); stamp(ctx, X, Y, at(toe, 4), pal, mir); }
  }
  const KNEE = { x: 0, y: -5, rows: ['KKKKK', 'KJJJK', '.KKK.'] };
  function kneelLegs(ctx, X, Y, pal) { stamp(ctx, X, Y, at(KNEE, -5), pal); stamp(ctx, X, Y, at(KNEE, 1), pal); }
  const GLOVE = ['WHHH', 'HHHH', 'HHHH', 'HHHH'];
  // tay gập (vai -> khuỷu -> bàn tay): 'limb' = tay · 'glove' = găng 4 x 4 ở bàn tay
  function bentArm(ctx, X, Y, mir, i, pts, pal, hand, part) {
    const q = pts.map(([x, y]) => [Math.round(x), Math.round(y)]), [hx, hy] = q[q.length - 1];
    if (part === 'limb') return drawCells(ctx, X, Y, limbCells(q, (k, j) => (k === 1 && j === 0 ? pal.t : pal.S)), mir);
    const Gl = i ? GLOVE.map((r) => r.split('').reverse().join('')) : GLOVE;
    drawCells(ctx, X, Y, blockCells(new Map(), hx - 1 + (i ? 1 : 0), hy - 1, Gl, { W: '#ffffff', H: hand }), mir);
  }
  // như v2 gkDraw: 'behind' trước thân · 'front' thay tay đứng · 'last' sau đầu (bóng đang tung / rơi)
  function gkDraw(ctx, X, Y, mir, G, pal, hand, part) {
    const own = G.arms || G.angles, far = G.far != null ? G.far : -1, mine = (i) => (part === 'behind' ? i === far : i !== far);
    if (part === 'last') { if (G.ball && !G.ballBehind && !own) V2.heldBall(ctx, X, Y, mir, G.ball[0], G.ball[1]); return; }
    const ballNow = G.ball && (part === 'behind' ? G.ballBehind : !G.ballBehind);
    const dark = part === 'behind' ? Object.assign({}, pal, { S: pal.s }) : pal;
    if (G.arms) G.arms.forEach((pts, i) => { if (mine(i)) bentArm(ctx, X, Y, mir, i, pts, dark, hand, 'limb'); });
    if (ballNow) V2.heldBall(ctx, X, Y, mir, G.ball[0], G.ball[1]);
    if (G.arms) G.arms.forEach((pts, i) => { if (mine(i)) bentArm(ctx, X, Y, mir, i, pts, dark, hand, 'glove'); });
    if (G.angles) G.angles.forEach((a, i) => { if (mine(i)) S3.armAt(ctx, X, Y, mir, i, a, Object.assign({}, pal, { hand }), part === 'behind'); });
  }
  // bóng đổ nằm (bay lên rồi nằm): elip đậm phủ cả thân
  function lieShadow(ctx, X, Y, side) {
    const x0 = X + side, y0 = Y - 13, rx = 10, ry = 14;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    for (let dy = -ry; dy <= ry; dy++) { const w = Math.round(rx * Math.sqrt(1 - (dy / ry) * (dy / ry))); ctx.fillRect(x0 - w, y0 + dy, 2 * w, 1); }
  }

  Object.assign(S3, { DIVE_FRAMES: F, diveFrameOf, diveFrameDraw, gkGeom, gkDraw, diveLegs, kneelLegs, lieShadow });
})();
