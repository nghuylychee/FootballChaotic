/* PlayerSprite · celebrate.js — Ăn mừng: tay theo luật độ dài, chân quỳ, điểm neo đạo cụ theo thân mới, vẽ cả động tác (celDraw).
 * Nạp theo thứ tự trong scripts/manifest.js (classic script, không module): mỗi file gắn hàm vào SFC.PlayerSprite.
 */
window.SFC = window.SFC || {};

(function () {
  const Sprite = (SFC.PlayerSprite = SFC.PlayerSprite || {});
  const { ALEN, ARM_ROOT, BODY, armAt, at, blockCells, clamp01, drawCells, limbCells, stamp } = Sprite;
  // Dữ liệu động tác vẫn là CelebrateDraw.POSES của game (src/render/celebrate-draw.js): pose(t, p) -> lift, rot, face, run, legs, drop, headDy, eyes,
  // mouth, arms; under / fx vẽ đạo cụ theo I.hand / I.elbow / I.head / I.mouth. Sprite 2x đổi:
  //  1. Tay (luật độ dài, docs/SPRITE_V2.md mục 1): arms [dx, dy] của game là bàn tay tính từ vai (tay dây thun tới 10 px) -> góc quanh vai = hướng tới
  //     bàn tay đó, dài như tay đứng (armAt). Bàn tay cao hơn vai nhiều thì nhô vai SHRUG ô (như giơ tay khi bị đấm, user 2026-11-01: giơ phải rõ).
  //     Tay gần như buông -> vẽ tay đứng. CEL[id](t, P) chỉnh riêng động tác: ang [a0, a1] (null = tay đứng), shrug [s0, s1], point [ngón, ngón]
  //     ('up' = ngón trỏ 2 ô chĩa lên ở tư thế khoá), bend (tay gập khuỷu theo khuỷu / bàn tay cũ: cánh tay BEND[0] ô theo hướng khuỷu, cẳng tay BEND[1] ô
  //     theo hướng bàn tay; ngắn hơn thì chữ L dính thành cục), drop...; CEL_FX_UNDER[id] = vẽ fx của game trước người (đạo cụ vắt ngang thân thì thân che)
  //  2. Điểm neo đạo cụ theo thân mới: celAnchors (hệ toạ độ hông như CelebrateDraw: gốc = chân - 8, px thế giới).
  //  3. Chân quỳ ('kneel'): sprite hôm nay chưa vẽ (đứng thẳng); ở đây 2 đầu gối chạm đất dưới quần.
  const P = Math.PI, DOWN = [[-1, 4], [1, 4]], SHRUG = -2, BEND = [1.5, 2];
  const CEL = {}, CEL_FX_UNDER = { airplane: true };
  // đợt 1 (2026-11-01). fistpump / airplane: tự đổi đã đẹp. airplane: vệt gió sau 2 bàn tay vắt qua ngực khi tay ngắn -> vẽ dưới người
  // kneeslide: quỳ hạ thân 2 (game 4: thân thụt xuống đất như đứng trong hố) · skypoint: 2 tay chữ V cao, ngón trỏ chĩa trời
  // shush: tay phải đưa ngang về phía miệng (vai nhô), ngón trỏ dựng lên cạnh môi
  CEL.kneeslide = (t, B) => (B.legs === 'kneel' ? { drop: 2 } : {});
  CEL.skypoint = () => ({ ang: [-P / 2 - 0.5, -P / 2 + 0.5], shrug: [1, 1], point: ['up', 'up'] });
  CEL.shush = (t, B) => (B.run ? {} : { ang: [null, P + 0.3], shrug: [0, 1], point: [null, 'up'] });
  // đợt 2: flex / robot / dab tay gập khuỷu (bend) như game
  CEL.flex = () => ({ bend: true });
  CEL.robot = () => ({ bend: true });
  CEL.dab = () => ({ bend: true });
  // đợt 3: phonecall tay phải gập đưa máy lên tai
  CEL.phonecall = (t, B) => (B.run ? {} : { bend: true });
  // nap (user 2026-11-01): 2 nắm tay sát nhau, đè lên ngực -> tay gập, cẳng tay nằm ngang trên ngực (paths: [khuỷu, bàn tay] tính từ vai; 2 vai lệch 1 ô
  // vì ô x phủ x..x+1 nên tay phải ngắn hơn 1 ô cho 2 nắm tay đối xứng)
  CEL.nap = (t, B) => (B.arms && B.arms !== DOWN && B.arms[0][1] === 2 ? { paths: [[[1, 1], [4, 1]], [[-1, 1], [-4, 1]]] } : {});
  // backflip: giữ lộn vòng trong mặt phẳng màn hình của game (user 2026-11-01: lộn ra sau thật thì phải vẽ đỉnh đầu cho mọi kiểu tóc)
  // moonwalk (user: chân không động): nhìn ngang, 1 chân phẳng trượt ra sau, chân kia kiễng gót đi tới, đổi vai mỗi MOON s (draw.js 'moon')
  const MOON = 0.45;
  CEL.moonwalk = (t, B) => ({ run: false, legs: 'moon', mw: (t / MOON) % 2 });
  // đợt 4 (cuối): makeitrain / fireworks / _win2 / _lose tay gập như game · firebreath: lúc phun lửa vai nhô hẳn (nhô dở thì tay rung lưới mịn từng khung)
  CEL.makeitrain = (t, B) => (B.run ? {} : { bend: true });
  CEL.fireworks = () => ({ bend: true });
  CEL._win2 = () => ({ bend: true });
  // _lose đứng (user 2026-11-01): 2 tay ôm ra sau đầu (vẽ trước đầu, armsBehind); mặt game há miệng trông như vui -> nhắm mắt, miệng thường
  CEL._lose = (t, B) => (B.legs === 'sit' ? { bend: true } : { bend: true, armsBehind: true, eyes: 'closed', mouth: false });
  CEL.firebreath = (t) => (t < 0.45 ? {} : { shrug: [1, 1] });
  // levitate (user 2026-11-01): giơ 2 tay chữ V như giơ tay khi bị đấm
  CEL.levitate = () => ({ ang: [P + 0.9, -0.9], shrug: [1, 1] });

  // fx thay cho fx của game (khi vào game: sửa thẳng số trong celebrate-draw.js). ring / dust chép từ celebrate-draw.js
  const CEL_FX = {};
  const px = (ctx, x, y, w, h, c) => SFC.Sprites.px(ctx, x, y, w, h, c);
  const rnd = (i, k = 0) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };
  function ring(ctx, x, y, rx, ry, c) {
    const n = Math.max(8, Math.round(rx * 3));
    for (let i = 0; i < n; i++) { const a = (i / n) * 2 * P; px(ctx, Math.round(x + Math.cos(a) * rx), Math.round(y + Math.sin(a) * ry), 1, 1, c); }
  }
  function dust(ctx, x, y, a, n = 7, spread = 14) {
    if (a < 0 || a > 1) return;
    for (let i = 0; i < n; i++) {
      const k = (a * 2.4 + i / n) % 1;
      ctx.globalAlpha = (1 - a) * (1 - k) * 0.85;
      px(ctx, Math.round(x + (rnd(i) - 0.5) * spread), Math.round(y - k * 6), 2, 2, i % 2 ? '#d9c8a6' : '#a8957a');
    }
    ctx.globalAlpha = 1;
  }
  // phonecall (user 2026-11-01: điện thoại xanh nằm ngoài cánh tay): máy nằm giữa nắm tay và tai (bên trái nắm tay, đè lên mép đầu); sóng gọi bên ngoài
  CEL_FX.phonecall = (ctx, I) => {
    if (I.t < SFC.Celebrate.lead('phonecall')) return;
    const h = I.hand(1), hx = Math.round(h.x), hy = Math.round(h.y);
    px(ctx, hx - 3, hy - 3, 3, 6, SFC.Sprites.OUT);
    px(ctx, hx - 2, hy - 2, 1, 4, '#3ff6ff');
    const k = (I.t * 2.5) % 1;
    ctx.globalAlpha = 1 - k;
    for (let i = 0; i < 2; i++) { const x = Math.round(h.x + 4 + i * 3 + k * 3), y = hy - 3; px(ctx, x, y - 1 - i, 1, 1, '#ffe14f'); px(ctx, x + 1, y - i, 1, 3 + i * 2, '#ffe14f'); px(ctx, x, y + 3 + i, 1, 1, '#ffe14f'); }
    ctx.globalAlpha = 1;
  };
  // makeitrain (user 2026-11-01): tiền bay vọt lên trước rồi mới văng ra 2 bên (game: văng ngang ngay, chỉ nhích lên chút rồi rơi).
  // Lên RISE s (lệch ngang ít), sau đó bay ra ngoài và rơi dần
  CEL_FX.makeitrain = (ctx, I) => {
    const L = SFC.Celebrate.lead('makeitrain'), OUT = SFC.Sprites.OUT, RISE = 0.3;
    if (I.t < L) return;
    const s = I.hand(0);
    px(ctx, Math.round(s.x) - 2, Math.round(s.y) - 3, 6, 4, OUT); px(ctx, Math.round(s.x) - 1, Math.round(s.y) - 2, 4, 2, '#4fd16b');
    const h = I.hand(1);
    for (let i = 0; i < 18; i++) {
      const a = I.t - (L + i * 0.12);
      if (a < 0 || a > 1.5) continue;
      const dir = rnd(i) > 0.45 ? 1 : -1, sp = 0.5 + rnd(i, 1), up = Math.min(1, a / RISE), out = Math.max(0, a - RISE);
      const x = Math.round(h.x + dir * (2 * up + 30 * out) * sp + Math.sin(a * 10 + i) * 2);
      const y = Math.round(h.y - 22 * (1 - (1 - up) * (1 - up)) + 18 * out * out);
      ctx.globalAlpha = a > 1.1 ? (1.5 - a) / 0.4 : 1;
      const flat = Math.floor(a * 8 + i) % 2;
      px(ctx, x - 1, y - 1, flat ? 5 : 4, flat ? 4 : 5, OUT);
      px(ctx, x, y, flat ? 3 : 2, flat ? 2 : 3, '#4fd16b');
      px(ctx, x + (flat ? 1 : 0), y + (flat ? 0 : 1), 1, 1, '#c8ffd0');
    }
    ctx.globalAlpha = 1;
  };
  // _lose: giọt mồ hôi lăn xuống ở phần đầu trống, phía ngược hướng mặt (ngồi bệt nhìn chéo: game đặt +6 nên đè lên mắt); nhìn thẳng giữ +6 như game
  CEL_FX._lose = (ctx, I) => {
    const h = I.head, k = (I.t * 0.85) % 1, f = I.P.face != null ? Math.cos(I.P.face) : 0, x = Math.abs(f) > 0.3 ? h.x - Math.sign(f) * 5 : h.x + 6;
    ctx.globalAlpha = (1 - k) * 0.8;
    px(ctx, Math.round(x), Math.round(h.y - 1 + k * 5), 1, 2, '#7fe7ff');
    ctx.globalAlpha = 1;
  };
  // spinjump: vòng sóng tiếng hét bắt đầu to hơn (user 2026-11-01): game 4 + 16k x 2 + 9k (vòng đầu nằm trong mặt) -> 11 + 16k x 6 + 8k (vòng đầu đã ra ngoài đầu)
  CEL_FX.spinjump = (ctx, I) => {
    const a = I.t - SFC.Celebrate.lead('spinjump') - 0.55;
    if (a < 0) return;
    dust(ctx, I.x, I.y, a * 2, 10, 22);
    const m = I.mouth;
    for (let i = 0; i < 3; i++) {
      const k = (a * 1.6 + i / 3) % 1;
      ctx.globalAlpha = (1 - k) * 0.9;
      ring(ctx, m.x, m.y - 2, 11 + k * 16, 6 + k * 8, '#fff6c0');
    }
    ctx.globalAlpha = 1;
  };
  // tư thế 2x của động tác id lúc t (P = pose của game): gộp phần chỉnh riêng
  function celPose(id, t, p) {
    const D = SFC.CelebrateDraw.POSES[id] || SFC.CelebrateDraw.POSES.fistpump, base = D.pose(t, p) || {};
    return CEL[id] ? Object.assign({}, base, CEL[id](t, base, p)) : base;
  }

  // 2 tay: [{ a, s } | { path, s } | null] (a = góc quanh vai, 0 phải màn hình, π/2 xuống · path = [khuỷu, bàn tay] tính từ vai (ô) · s = nhô vai 0..1 ·
  // null = tay đứng)
  function celArmSet(cp) {
    return [0, 1].map((i) => {
      if (cp.paths && cp.paths[i]) return { path: cp.paths[i], s: 0 };
      if (cp.ang) { const a = cp.ang[i]; return a == null ? null : { a, s: cp.shrug ? cp.shrug[i] || 0 : 0 }; }
      const arm = (cp.arms || DOWN)[i] || DOWN[i], hx = arm[arm.length - 2], hy = arm[arm.length - 1], a = Math.atan2(hy, hx);
      if (cp.bend && arm.length > 2) {
        const [ex, ey] = arm, l1 = Math.hypot(ex, ey) || 1, l2 = Math.hypot(hx - ex, hy - ey) || 1, e = [(ex / l1) * BEND[0], (ey / l1) * BEND[0]];
        return { path: [e, [e[0] + ((hx - ex) / l2) * BEND[1], e[1] + ((hy - ey) / l2) * BEND[1]]], s: cp.shrug ? cp.shrug[i] : Math.round(clamp01((-hy - 4) / 4)) };
      }
      if (Math.abs(a - P / 2) < 0.4 && hy > 0) return null;
      return { a, s: cp.shrug ? cp.shrug[i] : clamp01((-hy - 4) / 4) };
    });
  }
  // vẽ 2 tay (gọi từ draw.js, sau đầu): nhô vai nguyên ô thì tư thế khoá (lưới thế giới), nhô dở thì lưới mịn
  // ngón trỏ ('up'): 2 ô da trên cột trái của bàn tay, cùng 1 khối với tay (viền liền)
  function celArms(ctx, X, Y, cp, pal, hand) {
    celArmSet(cp).forEach((A, i) => {
      if (!A) return stamp(ctx, X, Y, BODY.arm, pal, i === 1);
      if (A.path) {   // tay gập: tư thế khoá, 2 đoạn
        const [rx, ry] = ARM_ROOT[i], pts = [[rx, ry]].concat(A.path.map(([x, y]) => [Math.round(rx + x), Math.round(ry + y)]));
        return drawCells(ctx, X, Y + 2 * SHRUG * A.s, limbCells(pts, (k, j) => (k === 1 && j === 0 ? pal.t : pal.S)));
      }
      const dy = Math.round(2 * SHRUG * A.s), fine = dy % 2 !== 0 || (A.s > 0 && A.s < 1), pt = cp.point && cp.point[i];
      if (fine || !pt) return armAt(ctx, X, Y + dy, false, i, A.a, pal, hand, false, fine);
      const [rx, ry] = ARM_ROOT[i], ex = Math.round(rx + ALEN * Math.cos(A.a)), ey = Math.round(ry + ALEN * Math.sin(A.a));
      const cells = limbCells([[rx, ry], [ex, ey]], (k, j, n) => (j === 0 ? pal.t : pal.S));
      drawCells(ctx, X, Y + dy, blockCells(cells, ex + (i ? 1 : 0), ey - 2, ['S', 'S'], pal));
    });
  }
  // điểm neo (hệ hông, chưa xoay): bàn tay = đầu cánh tay; tay đứng = cuối tay đứng. Đầu (tâm) -9, miệng -5 (đầu hạ 2 px theo thân, BODY.dy)
  function celAnchors(cp) {
    const drop = cp.drop || 0, hd = cp.headDy || 0, set = celArmSet(cp);
    const hand = (i) => {
      const [rx, ry] = ARM_ROOT[i], A = set[i];
      if (!A) return [rx + 0.5, ry + 8 + ALEN + drop];
      if (A.path) return [rx + 0.5 + A.path[1][0], ry + 8 + SHRUG * A.s + A.path[1][1] + drop];
      return [rx + 0.5 + ALEN * Math.cos(A.a), ry + 8 + SHRUG * A.s + ALEN * Math.sin(A.a) + drop];
    };
    const elbow = (i) => {
      const A = set[i], [rx, ry] = ARM_ROOT[i];
      if (A && A.path) return [rx + 0.5 + A.path[0][0], ry + 8 + SHRUG * A.s + A.path[0][1] + drop];
      const h = hand(i); return [(h[0] + rx + 0.5) / 2, (h[1] + ry + 8 + drop) / 2];
    };
    return { hand, elbow, head: [0, -9 + drop + hd], mouth: [0, -5 + drop + hd] };
  }
  // chân quỳ: 2 đầu gối (viền, tất, viền) ngay dưới quần, theo thân đã hạ (Y = Yb)
  // user 2026-11-01: thêm da ở đầu gối (hàng 2 ô da) rồi tới tất
  const KNEE = { x: 0, y: -4, scale: 2, rows: ['KKKK', 'KJJK', 'KOOK', 'KKKK'] };
  function kneelLegs(ctx, X, Y, pal) { stamp(ctx, X, Y, at(KNEE, -4), pal); stamp(ctx, X, Y, at(KNEE, 1), pal); }

  // vẽ cả động tác như CelebrateDraw.draw (bóng, under, người, fx) nhưng người = sprite 2x, đạo cụ theo điểm neo mới. Trả y của đầu
  function celDraw(ctx, p, g) {
    const D = SFC.CelebrateDraw.POSES[p.celId] || SFC.CelebrateDraw.POSES.fistpump, t = p.celT || 0, SP = SFC.Sprites;
    const cp = celPose(p.celId, t, p), A = celAnchors(cp);
    const lift = Math.round((cp.lift || 0) * (p.icon ? 0.4 : 1)), rot = cp.rot || 0;
    const x = Math.round(p.x), y = Math.round(p.y), cx = x, cy = y - 8 - lift, cos = Math.cos(rot), sin = Math.sin(rot), n = Math.hypot(p.vx || 0, p.vy || 0);
    const local = (lx, ly) => ({ x: cx + lx * cos - ly * sin, y: cy + lx * sin + ly * cos }), L = (q) => local(q[0], q[1]);
    const I = { p, t, x, y, cx, cy, P: cp, mv: n > 5 ? { x: p.vx / n, y: p.vy / n } : null, local, hand: (i) => L(A.hand(i)), elbow: (i) => L(A.elbow(i)), head: L(A.head), mouth: L(A.mouth) };
    const k = Math.max(0.4, 1 - Math.max(0, lift) / 50);
    if (!Sprite.sceneShadow(g)) SP.ellipse(ctx, x, y + 1, (rot ? 10 : 7) * k, 2.5 * k, 'rgba(0,0,0,0.38)');   // arena có bộ cảnh: bóng của cảnh (groundShadow)
    if (D.under) D.under(ctx, I);
    const fx = CEL_FX[p.celId] || D.fx;
    if (fx && CEL_FX_UNDER[p.celId]) fx(ctx, I);
    ctx.save(); ctx.translate(cx, cy); if (rot) ctx.rotate(rot);
    Sprite.drawPlayer(ctx, Object.assign({}, p, { x: 0, y: 8, vx: cp.run ? 40 : 0, vy: 0, facing: cp.face != null ? cp.face : p.facing,
      celPose: cp, atkType: null, state: 'normal', keeper: false, charging: false }), g, 0.999);
    ctx.restore(); ctx.globalAlpha = 1;
    if (fx && !CEL_FX_UNDER[p.celId]) fx(ctx, I);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    return Math.round(I.head.y);
  }

  Object.assign(Sprite, { CEL, CEL_FX, CEL_FX_UNDER, celPose, celArmSet, celArms, celAnchors, kneelLegs, celDraw });
})();
