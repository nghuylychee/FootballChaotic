/* Sprite v3 · attack.js (đợt 2, 2026-11-07) — ra đòn: đấm, Hard attack, sút, vô-lê, móc xe đạp, chuyền sệt / bổng, chạm đẩy bóng,
 * sút mạnh (lấy đà đứng + bước nặng), đánh đầu. Nhịp + góc tay chân lấy nguyên của v2 (SFC.PlayerSprite.attackPose, bảng KICKS / PUNCH /
 * HEADER_KEYS đã duyệt); chỉ hình học đổi theo người 31 px: toạ độ x 1,3 (cột chân giữ chỗ chân v3), bàn chân / nắm tay vẽ to hơn,
 * chi tự do bút 3 x 3. Nạp sau draft.js; draft.js draw() gọi vào đây khi o.atk có tư thế ra đòn.
 */
window.SFC = window.SFC || {};

(function () {
  const S3 = SFC.PlayerSprite3, V2 = SFC.PlayerSprite;
  const { INK, at, stamp, limbCells, blockCells, drawCells, snapPx, shade, LEG, PLANT, LIFT, KICK_F, KICK_B, LIFT_B, armAt, gaitLeg } = S3;
  const P = Math.PI, lerp = (a, b, t) => a + (b - a) * t;

  /* ---------- đổi toạ độ v2 -> v3 ---------- */
  // x: bên trái (âm) và xa ra ngoài (> 3) nhân 1,3; 0..3 giữ (cột chân phải v2 1..4 = v3 1..5, hông chân phải giữ chỗ)
  const cx = (x) => (x < 0 || x > 3 ? Math.round(x * 1.3) : x);
  const cy = (y) => Math.round(y * 1.3);
  const cp = ([x, y]) => [cx(x), cy(y)];
  // bàn chân: hình v2 -> hình v3 (to hơn 1 ô mỗi chiều, giữ dáng: mũi rộng / gót hẹp, đế nhìn từ dưới)
  const FOOT = {
    'GG|gg': ['GGG', 'ggg'],
    'gg|gg': ['ggg', 'ggg'],
    'GGG|ggg': ['GGGG', 'gggg'],
    'GGG|GGG|ggg': ['GGGG', 'GGGG', 'GGGG', 'gggg'],
    'GGG|ggg|ggg': ['GGGG', 'gggg', 'gggg'],
    'GGGG|gggg|gggg|.gg.': ['GGGGG', 'ggggg', 'ggggg', 'ggggg', '.ggg.'],
    'GGGG|gggg|gggg|gggg|.gg.': ['GGGGG', 'ggggg', 'ggggg', 'ggggg', 'ggggg', '.ggg.'],
    'GG|Gg|Gg': ['GGG', 'GGg', 'GGg'],
    'gG|gG': ['gGG', 'gGG'],
  };
  const foot3 = (rows) => FOOT[rows.join('|')] || rows;
  // 1 bảng tư thế chân v2 -> v3 (góc giữ nguyên)
  function convView(K) {
    if (!K) return K;
    if (K.ang) return Object.assign({}, K, { hip: K.hip.map(cx) });
    return Object.assign({}, K, { hip: K.hip.map(cx), end: K.end.map(cp), foot: K.foot.map(([dx, dy, rows]) => [dx, dy, foot3(rows)]) });
  }
  const tableCache = new Map();
  function kickTable(atk) {
    const kt = atk.kt || 'hard';
    if (!tableCache.has(kt)) {
      const T = V2.KICKS[kt], O = Object.assign({}, T);
      for (const v of ['side', 'diag', 'bdiag', 'front', 'back']) O[v] = convView(T[v]);
      O.plant = T.plant === 2 ? 3 : T.plant;
      tableCache.set(kt, O);
    }
    return tableCache.get(kt);
  }

  /* ---------- chân đá ---------- */
  const KLEN = 4.2, HIP_Y = -6;
  const kv = (keys, kp, u) => (kp === 'in' ? lerp(keys[0], keys[1], u) : kp === 'go' ? lerp(keys[1], keys[2], u) : lerp(keys[2], keys[0], u));
  const kn = (keys, kp, u) => (kp === 'in' ? keys[u < 0.5 ? 0 : 1] : kp === 'go' ? keys[u < 0.5 ? 1 : 2] : keys[u < 0.5 ? 2 : 0]);
  const kickRest = (atk) => (atk.kp === 'in' && atk.u < 0.2) || (atk.kp === 'out' && atk.u >= 0.8);
  const kickArmsOn = (atk) => !((atk.kp === 'in' && atk.u < 0.15) || (atk.kp === 'out' && atk.u >= 0.85));
  function legPose(view, kp, u, T) {
    const K = T[view];
    if (K.ang) {
      const a = kv(K.ang, kp, u), hx = kv(K.hip, kp, u);
      const foot = a < 0.25 * P ? [1, -1, ['GGG', 'GGg', 'GGg']] : a <= 0.6 * P ? [0, 1, ['GGGG', 'gggg']] : [-1, 0, ['gGG', 'gGG']];
      return { hx, hy: HIP_Y, ex: hx + KLEN * Math.cos(a), ey: HIP_Y + KLEN * Math.sin(a), foot, over: view !== 'bdiag' && !(kp === 'in' && T.inBack) && a <= 0.6 * P };
    }
    return { hx: kv(K.hip, kp, u), hy: HIP_Y, ex: kv(K.end.map((q) => q[0]), kp, u), ey: kv(K.end.map((q) => q[1]), kp, u), foot: kn(K.foot, kp, u), over: kn(K.over, kp, u) };
  }
  const rectW = (ctx, X, Y, mir, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(mir ? X - (x + w - 1) : X + x, Y + y, w, h); };
  function star(ctx, X, Y, mir, ix, iy) {
    rectW(ctx, X, Y, mir, ix - 4, iy, 9, 1, '#fff6a0'); rectW(ctx, X, Y, mir, ix, iy - 4, 1, 9, '#fff6a0');
    for (const [a, b] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) rectW(ctx, X, Y, mir, ix + a, iy + b, 1, 1, '#ffffff');
  }
  function drawKickLeg(ctx, X, Y, mir, view, atk, L, pal) {
    const T = kickTable(atk), col = (k, i, n) => (i / n < 0.22 ? pal.P : i / n < 0.42 ? pal.J : pal.O), [fdx, fdy, rows] = L.foot;
    const hx = Math.round(L.hx), ex = Math.round(L.ex), ey = Math.round(L.ey), cells = new Map();
    if (atk.kp === 'go' && atk.u < 1) {
      // cung sáng theo đường bàn chân + 2 bóng bàn chân tối dần (nhoè), như v2
      const arc = new Map();
      for (let uu = Math.max(0, atk.u - 0.5); uu < atk.u; uu += 0.02) {
        const q = legPose(view, 'go', uu, T);
        arc.set(Math.round(q.ex + q.foot[0] + q.foot[2][0].length / 2) + ',' + Math.round(q.ey + q.foot[1] + q.foot[2].length / 2), 1 - (atk.u - uu) / 0.5);
      }
      ctx.globalCompositeOperation = 'lighter';
      for (const [kk, k] of arc) { const [qx, qy] = kk.split(',').map(Number); rectW(ctx, X, Y, mir, qx, qy, 1, 1, `rgba(255,${120 + Math.round(k * 135)},${90 + Math.round(k * 165)},${0.25 + k * 0.6})`); }
      ctx.globalCompositeOperation = 'source-over';
      for (const [d, dk] of [[0.3, -0.6], [0.15, -0.3]]) {
        if (atk.u - d <= 0) continue;
        const q = legPose(view, 'go', atk.u - d, T);
        blockCells(cells, Math.round(q.ex) + q.foot[0], Math.round(q.ey) + q.foot[1], q.foot[2].map((r) => r.replace(/g/g, 'G')), { G: shade(pal.G, -dk) });
      }
    }
    drawCells(ctx, X, Y, blockCells(limbCells([[hx, L.hy], [ex, ey]], col, cells), ex + fdx, ey + fdy, rows, pal), mir);
    if (atk.u >= 1 && atk.kp !== 'out' && atk.impact) {
      const fx = ex + fdx, fy = ey + fdy, w = rows[0].length;
      const [ix, iy] = view === 'front' ? [fx + w, fy - 1] : [fx + w + 2, fy + 1];
      star(ctx, X, Y, mir, ix, iy);
    }
  }
  const farArm = (view) => (view === 'diag' ? 1 : view === 'bdiag' ? 0 : -1);
  function kickArm(ctx, X, Y, mir, view, atk, i, pal, behind) {
    const T = kickTable(atk), K = T[view], ov = T.armAt ? T.armAt(atk, view, i) : null;   // thủ môn tung bóng: góc tay theo thời gian (v2 gkball.js)
    armAt(ctx, X, Y, mir, i, ov != null ? ov : kv([P / 2, K.arms[0][i], K.arms[1][i]], atk.kp, atk.u), pal, behind);
  }

  /* ---------- thân chuyển động (chuyền, sút mạnh, chạy nước rút): nghiêng, vặn vai, lai quần nhấc ---------- */
  const torsoCache = new Map();
  function torsoPart(back, lean = 0, twist = 0, hemL = false, hemR = false, turn = 0) {
    const id = [back ? 1 : 0, lean, twist, hemL ? 1 : 0, hemR ? 1 : 0, turn].join();
    if (torsoCache.has(id)) return torsoCache.get(id);
    let shirt = [back ? 'KTTtttttttTtK' : 'KTTTTTTTTTTtK', 'KTTTTTTTTTTtK', 'KTTTTTTTTTTtK', 'KTTTTTTTTTTtK'];
    if (back && turn) shirt = [turn > 0 ? 'KTtttttttTTtK' : 'KTTTtttttttTK'].concat(shirt.slice(1));
    if (!back && twist > 0) shirt = shirt.map(() => 'KTTTTTTTTTttK');
    if (!back && twist < 0) shirt = shirt.map(() => 'KtTTTTTTTTTTK');
    const slit = twist > 0 ? 'KPPPPKPPPPPPK' : twist < 0 ? 'KPPPPPPKPPPPK' : 'KPPPPPKPPPPPK';
    const rows = ['KTKKKKKKKKKTK'].concat(shirt, ['KtttttttttttK', 'KPPPPPPPPPPPK', 'KPPPPPPPPPPPK', slit, '.KKKKKKKKKKK.']).map((r) => r.split(''));
    const n = rows.length;
    for (const [on, a, b, edge] of [[hemL, 0, 7, 0], [hemR, 6, 13, 12]]) {
      if (!on) continue;
      for (let i = a; i < b; i++) { rows[n - 2][i] = 'K'; rows[n - 1][i] = '.'; }
      rows[n - 2][edge] = '.';
    }
    const offs = rows.map((r, j) => Math.round((-lean * j) / (n - 1))), lo = Math.min(0, ...offs), hi = Math.max(0, ...offs);
    const part = { x: -6 + lo, y: -14, rows: rows.map((r, j) => '.'.repeat(offs[j] - lo) + r.join('') + '.'.repeat(hi - offs[j])) };
    torsoCache.set(id, part);
    return part;
  }
  const kickTwist = (atk) => (!atk || atk.kp == null ? 0 : atk.kp === 'in' ? (atk.u > 0.4 ? -1 : 0) : atk.kp === 'go' ? (atk.u > 0.25 ? 1 : -1) : atk.u < 0.5 ? 1 : 0);
  const MOVING_TORSO = { pass: 1, lob: 1, push: 1, power: 1 };

  /* ---------- đấm (tay trái của cầu thủ, như v2) ---------- */
  const PUNCH = {};
  for (const [v, K] of Object.entries(V2.PUNCH)) PUNCH[v] = Object.assign({}, K, { rest: cp(K.rest), back: cp(K.back), full: cp(K.full), lean: K.lean.map(([a, b]) => [a * 1.3, b * 1.3]) });
  const punchLean = (view, e) => { const L = PUNCH[view].lean[e < 0 ? 0 : 1], k = Math.abs(e); return [snapPx(L[0] * k), snapPx(L[1] * k)]; };
  const OFF_REST = cp(V2.OFF_REST), OFF = {};
  for (const [v, K] of Object.entries(V2.OFF)) OFF[v] = Object.assign({}, K, { root: cp(K.root), fwd: K.fwd && cp(K.fwd), back: K.back && cp(K.back) });
  const offOn = (e, view) => e != null && Math.abs(e) >= 0.2 && !!OFF[view][e < 0 ? 'fwd' : 'back'];
  const offBehind = (e, view) => OFF[view].behind[e < 0 ? 0 : 1];
  function offArm(ctx, X, Y, mir, view, e, pal) {
    const A = OFF[view], to = e < 0 ? A.fwd : A.back, k = Math.abs(e), skin = offBehind(e, view) ? pal.s : pal.S;
    const hx = Math.round(lerp(OFF_REST[0], to[0], k)), hy = Math.round(lerp(OFF_REST[1], to[1], k));
    drawCells(ctx, X, Y, limbCells([A.root, [hx, hy]], (kk, i, n) => (i / n < 0.25 ? pal.t : skin)), mir);
  }
  // vai áo nhô theo tay đấm (mép phải thân v3 = cột 6, vai hàng -14)
  function shoulderPush(ctx, X, Y, mir, view, pal) {
    const W = (x, y, c) => rectW(ctx, X, Y, mir, x, y, 1, 1, c);
    W(6, -14, pal.T); W(6, -13, pal.t); W(6, -12, pal.t);
    if (view !== 'back') W(7, -14, INK);
    if (view === 'side' || view === 'diag') W(6, -11, pal.t);
  }
  const FIST = ['WHHH', 'HHHH', 'HHHH', 'HHHH'], FIST_BIG = ['WHHHH', 'HHHHH', 'HHHHH', 'HHHHH', 'HHHHH'];
  const SHOULDER = [8, -12];
  function punch(ctx, X, Y, mir, view, e, atk, pal) {
    const K = PUNCH[view], k = Math.abs(e);
    const fistAt = (ee) => { const t = ee < 0 ? K.back : K.full, kk = Math.abs(ee); return [Math.round(lerp(K.rest[0], t[0], kk)), Math.round(lerp(K.rest[1], t[1], kk))]; };
    const [fx, fy] = fistAt(e), F = K.big && e > 0.6 ? FIST_BIG : FIST, n = F.length;
    const side = view === 'side' || view === 'diag' || view === 'bdiag';
    if (atk.streak && e > 0 && side) {
      ctx.globalAlpha *= 0.8;
      rectW(ctx, X, Y, mir, fx - 4, fy - 2, 4, 1, '#ffffff'); rectW(ctx, X, Y, mir, fx - 3, fy + 5, 3, 1, '#ffffff');
      ctx.globalAlpha /= 0.8;
    }
    const cells = new Map();
    if (!K.hidden && !(side && fx < SHOULDER[0])) limbCells([SHOULDER, [fx, fy + 1]], (kk, i) => (i === 0 ? pal.t : pal.S), cells);
    if (atk.streak && e > 0 && k < 0.95) {
      const [x0, y0] = fistAt(Math.max(0, e - 0.7)), steps = Math.max(Math.abs(fx - x0), Math.abs(fy - y0));
      for (let j = 0; j < steps; j++) {
        const t = j / steps, H = j < steps / 2 ? shade(pal.S, 0.45) : shade(pal.S, 0.2);
        blockCells(cells, Math.round(lerp(x0, fx, t)), Math.round(lerp(y0, fy, t)), F.map((r) => r.replace(/W/g, 'H')), { H });
      }
    }
    blockCells(cells, fx, fy, F, { W: '#ffffff', H: pal.hand || pal.S });
    drawCells(ctx, X, Y, cells, mir);
    if (!K.hidden && k >= 0.3 && !(side && fx < SHOULDER[0])) shoulderPush(ctx, X, Y, mir, view, pal);
    if (atk.impact) {
      const [ix, iy] = view === 'front' ? [fx + 2, fy + 2] : view === 'back' ? [fx + 2, fy - 4] : [fx + n + 2, fy + 1];
      star(ctx, X, Y, mir, ix, iy);
    }
  }

  /* ---------- đánh đầu (khoá của v2, px x 1,3) ---------- */
  function headerPose(view, k) {
    const h = V2.headerPose(view, k);
    return Object.assign({}, h, { c: h.c * 1.3, bx: h.bx * 1.3, hx: h.hx * 1.3, hy: h.hy * 1.3 });
  }
  function headerLegs(ctx, X, Y, mir, view, legs, toe, pal) {
    const side = view === 'side' || view === 'diag' || view === 'bdiag';
    if (legs === 'bend') { stamp(ctx, X, Y, at(toe, -7), pal, mir); stamp(ctx, X, Y, at(toe, 3), pal, mir); return; }
    if (legs === 'tuck') {
      const part = side ? KICK_F : view === 'back' ? KICK_B : LIFT, dx = side ? -1 : 0;
      stamp(ctx, X, Y, at(part, -5 + dx, -1), pal, mir); stamp(ctx, X, Y, at(part, 1 + dx, -1), pal, mir); return;
    }
    stamp(ctx, X, Y, at(toe, side ? -4 : -5), pal, mir); stamp(ctx, X, Y, at(toe, side ? 3 : 1, -1), pal, mir);
  }
  function headerArms(ctx, X, Y, mir, view, hp, pal, behindOnly) {
    const far = farArm(view);
    if (far >= 0) { const near = 1 - far; if (behindOnly) armAt(ctx, X, Y, mir, far, hp.arms[far], pal, true); else armAt(ctx, X, Y, mir, near, hp.arms[near], pal, false); return; }
    if (behindOnly) return;
    armAt(ctx, X, Y, mir, 0, hp.arms[0], pal, false); armAt(ctx, X, Y, mir, 1, hp.arms[1], pal, false);
  }
  // trán (gốc đầu = gốc thân v3): nhìn xuống giữa băng đô · ngang trước trán · lên trên đỉnh đầu
  function headerImpact(ctx, X, Y, mir, view) {
    const [ix, iy] = view === 'front' ? [0, -26] : view === 'back' ? [0, -33] : [12, -25];
    star(ctx, X, Y, mir, ix, iy);
  }

  /* ---------- bước nặng (đuổi bóng lúc lấy đà sút mạnh, nhìn ngang / chéo): khung HEAVY của v2, nhấp xuống lúc đặt chân ---------- */
  const HEAVY = V2.HEAVY;

  Object.assign(S3, { cx, cy, cp, kickTable, legPose, drawKickLeg, kickArm, kickRest, kickArmsOn, farArm, torsoPart, kickTwist, MOVING_TORSO,
    PUNCH, punchLean, offOn, offBehind, offArm, punch, headerPose, headerLegs, headerArms, headerImpact, HEAVY });
})();
