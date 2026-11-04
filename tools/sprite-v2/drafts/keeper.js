/* Bản nháp thủ môn (chưa vào game): bắt bóng rồi ôm trước ngực, ôm bóng đi lại, tung nhẹ bóng lên bằng tay rồi đá
 * (phát bóng bổng lên trời / chuyền vô-lê). keeper.mjs nạp file này vào trang game rồi vẽ bảng.
 * Tay ôm bóng vẽ riêng (tay gập 2 đoạn + găng 3 x 3 như keeper.js). Cú đá dùng máy vẽ chân / tay của kick.js (bảng gkPunt / gkVolley);
 * góc tay theo từng khung đặt thẳng vào bảng trước khi vẽ (kick.js đọc bảng mỗi lần vẽ).
 */
(function () {
  const S = SFC.PlayerSprite, P = Math.PI;
  const { KICKS, BODY, BOB, limbCells, blockCells, drawCells, kickTimeline, kickArmsOn, lerp, easeOut, easeIO, clamp01 } = S;
  const GLOVE = ['WHH', 'HHH', 'HHH'];
  const EMPTY = { x: 0, y: 0, rows: [] };

  /* ---------- ôm bóng ---------- */
  // bóng (tâm, ô thế giới = px game, tính từ gốc chân, hình nhìn phải) + 2 tay gập [vai, khuỷu, bàn tay]; tay 0 = bên trái hình
  // vẽ: tay -> bóng -> găng (cẳng tay khuất sau bóng, găng đè lên mép bóng) để bóng vẫn tròn
  // ngang: tay phải (vai sau) mọc từ trong thân (vai ngoài mép thân thì tay vắt qua ngực dài quá), găng ôm trên-sau bóng; tay gần đỡ dưới-trước bóng
  // xuống: 2 khuỷu sát sườn, 2 găng đỡ 2 mép dưới bóng
  const HOLD = {
    side: { ball: [6, -7], arms: [[[-4, -10], [-1, -7], [3, -9]], [[6, -9], [6, -5], [8, -4]]] },
    front: { ball: [0, -7], arms: [[[-7, -9], [-7, -6], [-4, -5]], [[6, -9], [6, -6], [3, -5]]] },
  };
  // đón bóng (ngay trước lúc chạm): 2 tay đưa ra trước, găng mở ra đón bóng ngang ngực
  const REACH = {
    side: { ball: [10, -9], arms: [[[-4, -10], [1, -9], [5, -10]], [[6, -9], [9, -9], [12, -8]]] },
    front: { ball: [0, -9], arms: [[[-7, -9], [-8, -11], [-5, -12]], [[6, -9], [7, -11], [4, -12]]] },
  };
  const lerpPose = (A, B, k) => ({
    ball: [lerp(A.ball[0], B.ball[0], k), lerp(A.ball[1], B.ball[1], k)],
    arms: A.arms.map((pts, i) => pts.map(([x, y], j) => [lerp(x, B.arms[i][j][0], k), lerp(y, B.arms[i][j][1], k)])),
  });

  // 1 tay gập quanh vai i (ô thế giới): part 'limb' = cánh tay + cẳng tay · 'glove' = găng 3 x 3 ở bàn tay (chấm sáng góc trên ngoài)
  function bentArm(ctx, X, Y, mir, i, pts, pal, glove, part) {
    const q = pts.map(([x, y]) => [Math.round(x), Math.round(y)]), [hx, hy] = q[q.length - 1];
    if (part === 'limb') return drawCells(ctx, X, Y, limbCells(q, (k, j) => (k === 1 && j === 0 ? pal.t : pal.S)), mir);
    const G = i ? GLOVE.map((r) => r.split('').reverse().join('')) : GLOVE;
    drawCells(ctx, X, Y, blockCells(new Map(), hx + (i ? 0 : -1), hy - 1, G, { W: '#ffffff', H: glove }), mir);
  }
  // bóng đang ôm (như drawBall của game, không bóng đổ), nhấp theo thân cả nửa px (bảng vẽ gấp đôi) · (bx, by) tâm theo ô thế giới
  function heldBall(ctx, X, Y, mir, bx, by) {
    const cx = mir ? X - Math.round(bx) : X + Math.round(bx), cy = Y + Math.round(by);
    const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(cx + x, cy + y, w, h); };
    const disc = (r, c) => { const r2 = r * r + r / 2; for (let dy = -r; dy <= r; dy++) { const w = Math.floor(Math.sqrt(r2 - dy * dy)); px(-w, dy, 2 * w + 1, 1, c); } };
    disc(4, '#140c16'); disc(3, '#f4f4f4');
    px(1, 1, 2, 2, '#c7c7d2'); px(2, 0, 1, 1, '#222'); px(-2, 0, 1, 1, '#222'); px(-1, -2, 1, 1, '#ffffff');
  }

  /* ---------- tung bóng + đá ---------- */
  const table = (side, front) => ({ side, diag: side, front, back: KICKS.hard.back, plant: 2, tuck: false, inBack: true });
  const ARMS0 = () => [[P / 2, P / 2], [P / 2, P / 2]];
  // K1 phát bóng bổng: chân thu cao ra sau, vung lên quá hông (đế giày to khi nhìn xuống), người ngả sau + bật nhẹ
  const PUNT = table(
    { hip: [-3, -4, 3], ang: [P / 2, 0.85 * P, -0.3 * P], arms: ARMS0() },
    { hip: [2, 2, 2], end: [[2, -4], [2, -5], [2, -7]], foot: [[0, 1, ['GG', 'gg']], [0, 1, ['gg', 'gg']], [0, -1, ['GGGG', 'gggg', 'gggg', '.gg.']]], over: [false, false, true], arms: ARMS0() });
  // K2 chuyền vô-lê: vung ngắn, chân dừng trước người ngang gối, không bật
  const VOLLEY = table(
    { hip: [-3, -3, 2], ang: [P / 2, 0.72 * P, 0.12 * P], arms: ARMS0() },
    { hip: [2, 2, 2], end: [[2, -4], [2, -5], [2, -4]], foot: [[0, 1, ['GG', 'gg']], [0, 1, ['gg', 'gg']], [0, 1, ['GGG', 'ggg']]], over: [false, false, true], arms: ARMS0() });
  Object.assign(KICKS, { gkPunt: PUNT, gkVolley: VOLLEY });

  // nhịp (giây): toss = tay tung bóng lên tới đỉnh, w = toss + bóng rơi (chân thu về suốt lúc đó) · chạm bóng ở w + s * 0.6
  // b = tâm bóng theo ô thế giới: lúc tung lên đỉnh (B1), lúc chạm chân (B2), mỗi góc nhìn · fly(τ) = bóng sau khi chạm: dx, dy (về phía máy quay), dz
  // arms = khoá góc 2 tay [t, tay 0, tay 1] (0 trước / phải, π/2 xuống, π sau / trái)
  const RELEASE = {
    gkPunt: {
      T: { w: 0.24, s: 0.08, f: 0.18, o: 0.2, cw: 0.5, lb: 0.5, lf: -0.5, hop: 1.5, calm: true }, toss: 0.15,
      // đỉnh cú tung nằm trước mặt (ngang) / cạnh đầu (xuống): đầu to, tung thẳng lên thì bóng che mặt
      b: { side: [[10, -13], [9, -8]], front: [[10, -13], [-2, -6]] },
      fly: { side: (u) => [120 * u, 0, 300 * u - 320 * u * u], front: (u) => [-10 * u, 160 * u, 260 * u - 300 * u * u] },
      arms: { side: [[0, 0.4, 0.5], [0.15, P / 2 + 0.3, -0.6], [0.29, P - 0.6, -1.0], [0.5, P - 0.4, -0.8], [0.7, P / 2, P / 2]],
        front: [[0, 0.9, P - 0.9], [0.15, P / 2 - 0.2, -0.7], [0.29, P - 1.0, -0.9], [0.5, P - 1.2, -0.8], [0.7, P / 2, P / 2]] },
    },
    gkVolley: {
      T: { w: 0.18, s: 0.06, f: 0.1, o: 0.14, lf: 0.5, calm: true }, toss: 0.11,
      b: { side: [[9, -11], [9, -5]], front: [[9, -11], [-2, -3]] },
      fly: { side: (u) => [280 * u, 0, 40 * u - 160 * u * u], front: (u) => [0, 230 * u, 30 * u - 160 * u * u] },
      arms: { side: [[0, 0.4, 0.5], [0.11, P / 2 + 0.2, -0.3], [0.22, P - 0.8, 0.1], [0.45, P / 2, P / 2]],
        front: [[0, 0.9, P - 0.9], [0.11, P / 2 - 0.2, -0.4], [0.22, P - 1.2, 0.3], [0.45, P / 2, P / 2]] },
    },
  };
  // góc 2 tay lúc t theo các khoá (trơn giữa 2 khoá)
  function armsAt(keys, t) {
    if (t <= keys[0][0]) return keys[0].slice(1);
    for (let i = 1; i < keys.length; i++) {
      const [t1, a1, b1] = keys[i], [t0, a0, b0] = keys[i - 1];
      if (t <= t1) { const k = easeIO((t - t0) / (t1 - t0)); return [lerp(a0, a1, k), lerp(b0, b1, k)]; }
    }
    return keys[keys.length - 1].slice(1);
  }
  // đặt góc tay vào bảng sao cho kick.js (kv: đứng π/2 -> lấy đà -> hết tầm -> đứng) ra đúng góc A ở pha / tiến độ hiện tại
  function setArms(T, view, atk, A) {
    const K = T[view === 'front' ? 'front' : 'side'], u = atk.u;
    if (atk.kp === 'in') K.arms = [A.map((a) => P / 2 + (a - P / 2) / Math.max(u, 1e-3)), A.slice()];
    else if (atk.kp === 'go') K.arms = [A.slice(), A.slice()];
    else K.arms = [A.slice(), A.map((a) => (a - u * P / 2) / Math.max(1 - u, 1e-3))];
  }

  /* ---------- vẽ 1 người + bóng ---------- */
  // c: ô (đơn vị px game), (x, y) chân, face = hướng mặt, view 'side' | 'front' · base = o như drawPlayer dựng (có glove)
  // st: { o (thêm vào o), pose: { ball, arms } (tay gập ôm bóng) | null (tay theo cú đá / tay đứng), natural (vẽ như thường, tay đứng có găng),
  //       drop (khuỵu, ô), legs (kiểu chân của celebrate: 'kneel'), angles [tay 0, tay 1] (tay thẳng theo góc, có găng),
  //       ball: { x, y } bóng đang ôm (ô, theo hình nhìn phải) | { x, gy, z, roll } bóng bay (px game, có bóng đổ) }
  //       cp: thân hạ theo cp.drop nhưng tay vẫn như game (tay đổ người / tay đứng) — không tắt tay
  function figure(c, x, y, face, base, st) {
    const m = Math.cos(face) < 0, X = x, Y = y, drop = st.cp ? st.cp.drop || 0 : st.drop || 0, own = !st.natural && !st.cp;
    const o = Object.assign({}, base, st.o || {}, { facing: face });
    if (st.cp) o.cp = st.cp;
    else if (own) o.cp = { ang: [null, null], drop, legs: st.legs };   // tay đứng tắt (celArms vẽ tay trống) · khuỵu theo drop
    // tay / bóng vẽ riêng bám thân: thân nhấp theo bước chạy, hạ theo drop, ngả ngang theo o.lean (px, như draw.js; không làm tròn)
    const pal = S.palette(o), bob = o.moving ? BOB[Math.floor((o.anim || 0) * 12) % 4] : 0, Yb = Y + bob + drop, Xa = X + (o.lean || 0);
    const flyBall = () => SFC.Sprites.drawBall(c, { x: x + (m ? -st.ball.x : st.ball.x), y: y + st.ball.gy, z: Math.max(0, st.ball.z), roll: st.ball.roll || 0, fx: {} });
    if (st.ballFirst && st.ball && st.ball.gy != null) flyBall();   // bóng bay sau lưng người (vẽ trước người)
    c.save();
    const keep = [BODY.arm, BODY.armBack, BODY.bump];
    if (own) { BODY.arm = EMPTY; BODY.armBack = EMPTY; BODY.bump = EMPTY; }
    try { S.draw(c, X, Y, o); } finally { [BODY.arm, BODY.armBack, BODY.bump] = keep; }
    if (st.pose) st.pose.arms.forEach((pts, i) => bentArm(c, Xa, Yb, m, i, pts, pal, base.glove, 'limb'));
    if (st.ball && st.ball.y != null && st.ball.gy == null) heldBall(c, Xa, Yb, m, st.ball.x, st.ball.y);
    if (st.pose) st.pose.arms.forEach((pts, i) => bentArm(c, Xa, Yb, m, i, pts, pal, base.glove, 'glove'));
    if (st.angles) st.angles.forEach((a, i) => S.armAt(c, Xa, Yb, m, i, a, pal, base.glove, false, false));
    c.restore();
    if (st.ball && st.ball.gy != null && !st.ballFirst) flyBall();
  }

  /* ---------- các động tác theo thời gian ---------- */
  const view = (face) => (Math.abs(Math.cos(face)) > 0.5 ? 'side' : 'front');
  const holdState = (v, t, moving) => ({ pose: HOLD[v], ball: { x: HOLD[v].ball[0], y: HOLD[v].ball[1] }, drop: moving ? 0 : Math.floor(t * 2) % 2 ? 0.5 : 0 });
  // G1 bắt bóng: đứng chờ -> 2 tay đưa ra đón -> chạm bóng, kéo về ngực + khuỵu nhẹ (đỡ lực) -> ôm, thở nhẹ
  const CATCH = { ready: 0.45, hit: 0.55, pull: 0.1, end: 1.6, speed: 300 };
  function catchState(face, t) {
    const v = view(face), C = CATCH;
    if (t < C.hit) {
      const d = (C.hit - t) * C.speed, R = REACH[v];
      const ball = v === 'side' ? { x: R.ball[0] + d, gy: 0, z: -R.ball[1] - 3, roll: t * 40 } : { x: 0, gy: d, z: -R.ball[1] - 3, roll: t * 40 };
      return t < C.ready ? { natural: true, ball } : { pose: R, ball };
    }
    const k = easeOut(clamp01((t - C.hit) / C.pull)), pz = lerpPose(REACH[v], HOLD[v], k);
    const after = t - C.hit, drop = after < 0.25 ? (after < 0.05 ? 1 : 1 - Math.round(clamp01((after - 0.05) / 0.2))) : Math.floor(t * 2) % 2 ? 0.5 : 0;
    return { pose: pz, ball: { x: pz.ball[0], y: pz.ball[1] }, drop };
  }
  // K1 / K2: ôm bóng hold giây -> tung bóng (tay) + thu chân -> chạm bóng -> bóng bay, theo đà, về đứng
  function releaseState(kt, face, t, hold) {
    const v = view(face), R = RELEASE[kt], T = R.T, r = t - hold;
    if (r < 0) return holdState(v, t, false);
    const tc = T.w + T.s * 0.6, [B1, B2] = R.b[v], B0 = HOLD[v].ball;
    let ball;
    if (r < R.toss) { const k = easeOut(r / R.toss); ball = [lerp(B0[0], B1[0], k), lerp(B0[1], B1[1], k)]; }
    else if (r < tc) { const k = clamp01((r - R.toss) / (tc - R.toss)); ball = [lerp(B1[0], B2[0], k * k), lerp(B1[1], B2[1], k * k)]; }
    const atk = kickTimeline(kt, r, T);
    let flyBall = null;
    if (r >= tc) { const [dx, dy, dz] = R.fly[v](r - tc); flyBall = { x: B2[0] + dx, gy: dy, z: -B2[1] - 3 + dz, roll: r * 60 }; }
    else flyBall = { x: ball[0], gy: 0, z: -ball[1] - 3, roll: 0 };
    if (atk.leg == null) return { natural: true, ball: flyBall };
    if (!kickArmsOn(atk)) {
      // đầu cú tung (tay chưa rời tư thế ôm) · cuối cú đá (tay về đứng)
      return atk.kp === 'in' ? { o: { atk }, pose: HOLD[v], ball: { x: B0[0], y: B0[1] } } : { natural: true, o: { atk }, ball: flyBall };
    }
    setArms(KICKS[kt], v, atk, armsAt(R.arms[v], r));
    return { o: { atk }, ball: flyBall };
  }

  // B · đỡ bóng tại chỗ (sút thẳng vào người, không đổ người): ngay trước lúc bóng tới dang rộng 2 tay (hình chữ V) + 2 chân, khuỵu nhẹ, rồi
  // save = bắt bóng kéo vào ngực + ôm (như G1) · parry = bóng dội ra phía trước-lên, giữ tư thế dang tay một chút rồi hạ tay về đứng ·
  // miss = bóng bay thẳng qua người (khuất sau thân) vào lưới, giữ tư thế dang tay rồi về đứng.
  // Tư thế đỡ là của game (gkball.js, atkType gkBlock, nhịp player.gkBlock): ở đây chỉ dựng bóng + lúc bắt đầu
  const BLOCK = { hit: 0.6, speed: 300, end: 1.5 };
  function blockState(face, t, outcome) {
    const v = view(face), B = BLOCK, R = REACH[v], GB = SFC_CONFIG.game.player.gkBlock, t0 = B.hit - GB.lead;
    // bóng tới thẳng ngực: ngang (từ phía mặt) / xuống (từ phía máy quay)
    const incoming = (d) => (v === 'side' ? { x: R.ball[0] + d, gy: 0, z: -R.ball[1] - 3, roll: t * 40 } : { x: 0, gy: d, z: -R.ball[1] - 3, roll: t * 40 });
    const block = { natural: true, o: { gk: { kind: 'block', t: t - t0 } } };
    if (t < t0) return { natural: true, ball: incoming((B.hit - t) * B.speed) };
    if (t < B.hit) return Object.assign(block, { ball: incoming((B.hit - t) * B.speed) });
    const u = t - B.hit;
    if (outcome === 'save') return catchState(face, CATCH.hit + u);
    const ball = outcome === 'parry'
      ? (v === 'side' ? { x: R.ball[0] + 170 * u, gy: 0, z: -R.ball[1] - 3 + 140 * u - 300 * u * u, roll: t * 60 } : { x: 20 * u, gy: 120 * u, z: -R.ball[1] - 3 + 140 * u - 300 * u * u, roll: t * 60 })
      : (v === 'side' ? { x: R.ball[0] - B.speed * u, gy: 0, z: -R.ball[1] - 3, roll: t * 40 } : { x: 0, gy: -B.speed * u, z: -R.ball[1] - 3, roll: t * 40 });
    const st = t - t0 < GB.lead + GB.hold + GB.lower ? Object.assign(block, { ball }) : { natural: true, ball };
    if (outcome === 'miss') st.ballFirst = true;   // bóng qua người: khuất sau thân
    return st;
  }

  S.KEEPER = { HOLD, REACH, RELEASE, CATCH, BLOCK, figure, holdState, catchState, releaseState, blockState, view };
})();
