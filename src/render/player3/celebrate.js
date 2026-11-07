/* PlayerSprite3 · celebrate.js (Sprite v3 đợt 5, 2026-11-07) — ăn mừng bàn thắng / cuối trận: tay theo luật độ dài, chân quỳ / ngồi / xếp bằng /
 * moonwalk / xoạc, điểm neo đạo cụ theo người cao 31 px, vẽ cả động tác (celDraw). Tư thế lấy nguyên của v2 (player/celebrate.js celPose, celArmSet,
 * CEL_FX; CelebrateDraw.POSES của game đã duyệt); chỉ hình học đổi: tay dài / vai v3, đường tay gập x 1,3, nhô vai 3 ô (v2: 2), độ nhấc / hạ người x 1,3,
 * hông (gốc toạ độ đạo cụ) cách chân 10 px (v2: 8). Đạo cụ vẽ bằng code của game, giữ cỡ cũ. Nạp sau body.js + look.js.
 */
window.SFC = window.SFC || {};

(function () {
  const S3 = SFC.PlayerSprite3, V2 = SFC.PlayerSprite;
  const { stamp, at, limbCells, blockCells, drawCells, armAt, ARM, LEG, KICK_F } = S3;
  const K = 1.3, SHRUG = -3, ALEN = 3.5, ARM_ROOT = [[-9, -12], [7, -12]], HIP = 10;

  // 2 tay (gọi từ body.js draw; sau đầu, hoặc trước đầu khi cp.armsBehind): null = tay đứng · { a, s } = tay thẳng góc a, nhô vai s ·
  // { path, s } = tay gập (khuỷu, bàn tay tính từ vai, ô v2 -> x 1,3) · point 'up' = ngón trỏ 3 ô chĩa lên
  function celArms(ctx, X, Y, cp, pal) {
    V2.celArmSet(cp).forEach((A, i) => {
      if (!A) return stamp(ctx, X, Y, ARM, pal, i === 1);
      const dy = Math.round(SHRUG * A.s), [rx, ry] = ARM_ROOT[i];
      if (A.path) {
        const pts = [[rx, ry]].concat(A.path.map(([x, y]) => [Math.round(rx + x * K), Math.round(ry + y * K)]));
        return drawCells(ctx, X, Y + dy, limbCells(pts, (k, j) => (k === 1 && j === 0 ? pal.T : pal.S)));
      }
      const pt = cp.point && cp.point[i];
      if (!pt) return armAt(ctx, X, Y + dy, false, i, A.a, pal, false);
      const ex = Math.round(rx + ALEN * Math.cos(A.a)), ey = Math.round(ry + ALEN * Math.sin(A.a));
      const cells = limbCells([[rx, ry], [ex, ey]], (k, j, n) => (j / n < 0.3 ? pal.T : pal.S));
      drawCells(ctx, X, Y + dy, blockCells(cells, ex + (i ? 2 : 0), ey - 3, ['S', 'S', 'S'], pal));
    });
  }
  // điểm neo đạo cụ (hệ hông: gốc = chân − HIP, chưa xoay): bàn tay = giữa ô cuối của tay · đầu (tâm) · miệng
  function celAnchors(cp) {
    const drop = (cp.drop || 0) * K, hd = (cp.headDy || 0) * K, set = V2.celArmSet(cp);
    const hand = (i) => {
      const [rx, ry] = ARM_ROOT[i], A = set[i], cx = rx + 1, cy = ry + 1 + HIP + drop;
      if (!A) return [cx + (i ? 1 : -1), cy + 5];
      if (A.path) return [cx + A.path[1][0] * K, cy + SHRUG * A.s + A.path[1][1] * K];
      return [cx + ALEN * Math.cos(A.a), cy + SHRUG * A.s + ALEN * Math.sin(A.a)];
    };
    const elbow = (i) => {
      const A = set[i], [rx, ry] = ARM_ROOT[i], cx = rx + 1, cy = ry + 1 + HIP + drop;
      if (A && A.path) return [cx + A.path[0][0] * K, cy + SHRUG * A.s + A.path[0][1] * K];
      const h = hand(i); return [(h[0] + cx) / 2, (h[1] + cy) / 2];
    };
    return { hand, elbow, head: [0, -12 + drop + hd], mouth: [0, -7 + drop + hd] };
  }

  /* ---------- chân ---------- */
  // quỳ: 2 đầu gối (viền, da, tất, viền) ngay dưới quần, theo thân đã hạ · trượt gối chéo lên: ống chân nằm trên đất chạy về máy quay, đế giày cuối ·
  // chéo xuống: đế giày ló ra sau gối bên kia
  const KNEE = { x: 0, y: -5, rows: ['KKKKK', 'KJJJK', 'KOOOK', 'KKKKK'] };
  const KNEE_BD = { x: 0, y: -5, rows: ['.KJJJK', '.KJJJK', 'KJJJK.', 'KOOOK.', 'KgggK.', 'KKKKK.'] };
  const FEET_BACK = { x: 0, y: -5, rows: ['KKKKK.', 'KgggKK', 'KKgggK', '.KKKKK'] };
  function kneelLegs(ctx, X, Y, pal, view, mir) {
    if (view === 'bdiag') { stamp(ctx, X, Y, at(KNEE_BD, -6), pal, mir); stamp(ctx, X, Y, at(KNEE_BD, 0), pal, mir); return; }
    if (view === 'diag') stamp(ctx, X, Y, at(FEET_BACK, -10, -1), pal, mir);
    stamp(ctx, X, Y, at(KNEE, -5), pal); stamp(ctx, X, Y, at(KNEE, 1), pal);
  }
  // xếp bằng: 2 ống chân vắt trước quần (che quần), giày 2 đầu · rộng 19 (thân 13)
  function crossLegs(ctx, X, Y, pal) {
    drawCells(ctx, X, Y, blockCells(new Map(), -9, -3, ['JJJGGGOOOOOOOGGGJJJ', 'JJJgggOOOOOOOgggJJJ'], pal));
  }
  // ngồi bệt: đùi chéo lên gối, ống chân xuống, giày trên đất (hông -> gối, gối -> cổ chân x 1,3)
  function sitLegs(ctx, X, Y, mir, pal) {
    const cells = limbCells([[2, -4], [4, -7]], (k, i, n) => (i / n < 0.5 ? pal.P : pal.J));
    limbCells([[4, -7], [6, -4]], (k, i) => (i === 0 ? pal.J : pal.O), cells);
    drawCells(ctx, X, Y, blockCells(cells, 6, -3, ['GGGG', 'gggg'], pal), mir);
  }
  // moonwalk (nhìn ngang): chân phẳng trượt từ trước ra sau, chân kia kiễng gót (thấy đế) đi từ sau ra trước; mw 0..2
  function moonLegs(ctx, X, Y, pal, mw, mir) {
    const u = mw % 1, flat = Math.round(1 + (-6 - 1) * u), toe = Math.round(-6 + (1 + 6) * u);
    stamp(ctx, X, Y, at(KICK_F, toe), pal, mir); stamp(ctx, X, Y, at(LEG.R, flat), pal, mir);
  }
  function splitLegs(ctx, X, Y, pal) { stamp(ctx, X, Y, at(LEG.L, -10), pal); stamp(ctx, X, Y, at(LEG.R, 6), pal); }

  /* ---------- vẽ cả động tác (thay V2.celDraw khi có v3; CelebrateDraw.draw gọi) ---------- */
  function celDraw(ctx, p, g) {
    const D = SFC.CelebrateDraw.POSES[p.celId] || SFC.CelebrateDraw.POSES.fistpump, t = p.celT || 0, SP = SFC.Sprites;
    const cp = V2.celPose(p.celId, t, p), A = celAnchors(cp);
    const lift = Math.round((cp.lift || 0) * K * (p.icon ? 0.4 : 1)), rot = cp.rot || 0;
    const x = Math.round(p.x), y = Math.round(p.y), cx = x, cy = y - HIP - lift, cos = Math.cos(rot), sin = Math.sin(rot), n = Math.hypot(p.vx || 0, p.vy || 0);
    const local = (lx, ly) => ({ x: cx + lx * cos - ly * sin, y: cy + lx * sin + ly * cos }), L = (q) => local(q[0], q[1]);
    const I = { p, t, x, y, cx, cy, P: cp, mv: n > 5 ? { x: p.vx / n, y: p.vy / n } : null, local, hand: (i) => L(A.hand(i)), elbow: (i) => L(A.elbow(i)), head: L(A.head), mouth: L(A.mouth) };
    const k = Math.max(0.4, 1 - Math.max(0, lift) / 65);
    if (!V2.sceneShadow(g)) SP.ellipse(ctx, x, y + 1, (rot ? 13 : 9) * k, 3 * k, 'rgba(0,0,0,0.38)');
    if (D.under) D.under(ctx, I);
    const fx = V2.CEL_FX[p.celId] || D.fx;
    if (fx && V2.CEL_FX_UNDER[p.celId]) fx(ctx, I);
    ctx.save(); ctx.translate(cx, cy); if (rot) ctx.rotate(rot);
    V2.drawPlayer(ctx, Object.assign({}, p, { x: 0, y: HIP, vx: cp.run ? 40 : 0, vy: 0, facing: cp.face != null ? cp.face : p.facing,
      celPose: cp, atkType: null, state: 'normal', keeper: false, charging: false }), g, 0.999);
    ctx.restore(); ctx.globalAlpha = 1;
    if (fx && !V2.CEL_FX_UNDER[p.celId]) fx(ctx, I);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    return Math.round(I.head.y);
  }

  Object.assign(S3, { celArms, celAnchors, celKneel: kneelLegs, crossLegs, sitLegs, moonLegs, splitLegs, celDraw });
})();
