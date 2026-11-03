/* PlayerSprite · gkball.js — Thủ môn cầm bóng + đứng dậy sau khi đổ người (đã duyệt 2026-11-01, bản nháp tools/sprite-v2/drafts/keeper.js):
 * bắt bóng kéo vào ngực rồi ôm (gkHold), tung bóng lên bằng tay rồi đá (gkPunt phát bóng bổng / gkVolley chuyền vô-lê), ôm bóng lúc đổ người
 * bắt được (thủ môn đang đổ người mà cầm bóng), và các tư thế đứng dậy sau khi đổ người — tư thế thật trên lưới px (không xoay / ép lẻ,
 * px sắc khi người gần như đứng yên; chỉ lúc bay mới xoay / ép như Renderer.diving).
 * Nạp theo thứ tự trong scripts/manifest.js (classic script, không module).
 */
window.SFC = window.SFC || {};

(function () {
  const Sprite = (SFC.PlayerSprite = SFC.PlayerSprite || {});
  const { KICKS, bdiagOf, limbCells, blockCells, drawCells, armAt, lerp, easeOut, easeIO, clamp01 } = Sprite;
  const P = Math.PI;
  const PL = () => SFC_CONFIG.game.player;
  const GLOVE = ['WHH', 'HHH', 'HHH'];

  /* ---------- ôm bóng ---------- */
  // bóng (tâm, ô thế giới tính từ gốc thân, hình nhìn phải) + 2 tay gập [vai, khuỷu, bàn tay]; tay 0 = bên trái hình.
  // Vẽ: tay -> bóng -> găng (cẳng tay khuất sau bóng, găng đè lên mép bóng) để bóng vẫn tròn.
  // ngang / chéo: tay phải (vai sau) mọc từ trong thân (vai ngoài mép thân thì tay vắt qua ngực dài quá), găng ôm trên-sau bóng; tay gần đỡ
  // dưới-trước bóng · xuống / lên: 2 khuỷu sát sườn, 2 găng đỡ 2 mép dưới bóng (nhìn lên: bóng nằm sau thân)
  const HOLD = {
    side: { ball: [6, -7], arms: [[[-4, -10], [-1, -7], [3, -9]], [[6, -9], [6, -5], [8, -4]]] },
    front: { ball: [0, -7], arms: [[[-7, -9], [-7, -6], [-4, -5]], [[6, -9], [6, -6], [3, -5]]] },
    // chéo lên: bóng trước ngực = sau thân, đẩy ra bên hướng mặt 2 ô để mép ngoài lộ ra ngoài tay gần; tay xa (sau thân) ôm trên-sau bóng,
    // tay gần đỡ dưới bóng
    bdiag: { ball: [8, -8], arms: [[[-4, -10], [-1, -8], [5, -11]], [[6, -9], [6, -6], [9, -4]]] },
  };
  // đón bóng (lúc chạm bóng): 2 tay đưa ra trước, găng mở ra đón bóng ngang ngực -> kéo về HOLD trong catchPull giây
  const REACH = {
    side: { ball: [10, -9], arms: [[[-4, -10], [1, -9], [5, -10]], [[6, -9], [9, -9], [12, -8]]] },
    front: { ball: [0, -9], arms: [[[-7, -9], [-8, -11], [-5, -12]], [[6, -9], [7, -11], [4, -12]]] },
  };
  // quỳ (đứng dậy sau khi đổ người): 2 khuỷu sát sườn, 2 găng đặt lên đùi ngay trên 2 đầu gối
  const KNEEL_ARMS = [[[-7, -9], [-7, -6], [-5, -4]], [[6, -9], [6, -6], [4, -4]]];
  // đỡ bóng tại chỗ (gkBlock): 2 tay thẳng dang lên chữ V (góc tay 0 / tay 1), chân dạng rộng + khuỵu 1 ô
  const STAR = { side: [P + 0.75, -0.75], front: [P + 0.6, -0.6] };
  // bắt bóng: kéo bóng vào ngực catchPull s · khuỵu 1 ô đỡ lực tới absorb s rồi đứng lên dần tới settle s · sau đó thở nhẹ (nhấp nửa ô mỗi breath s)
  const CATCH = { pull: 0.1, absorb: 0.05, settle: 0.25, breath: 0.5 };
  // chéo lên dùng tư thế nhìn ngang: bóng / găng trước ngực nằm sau thân (ló ra bên hướng mặt), tay xa (tay trái hình) vẽ sau thân
  const holdKey = (view) => (view === 'bdiag' ? 'bdiag' : view === 'side' || view === 'diag' ? 'side' : 'front');
  REACH.bdiag = REACH.side; STAR.bdiag = STAR.side;
  const lerpPose = (A, B, k) => ({
    ball: [lerp(A.ball[0], B.ball[0], k), lerp(A.ball[1], B.ball[1], k)],
    arms: A.arms.map((pts, i) => pts.map(([x, y], j) => [lerp(x, B.arms[i][j][0], k), lerp(y, B.arms[i][j][1], k)])),
  });

  /* ---------- tung bóng + đá ---------- */
  const table = (side, front) => ({ side, diag: side, bdiag: bdiagOf(side), front, back: KICKS.hard.back, plant: 2, tuck: false, inBack: true });
  // K1 phát bóng bổng: chân thu cao ra sau, vung lên quá hông (đế giày to khi nhìn xuống), người ngả sau + bật nhẹ
  const PUNT = table(
    { hip: [-3, -4, 3], ang: [P / 2, 0.85 * P, -0.3 * P], arms: [[P / 2, P / 2], [P / 2, P / 2]] },
    { hip: [2, 2, 2], end: [[2, -4], [2, -5], [2, -7]], foot: [[0, 1, ['GG', 'gg']], [0, 1, ['gg', 'gg']], [0, -1, ['GGGG', 'gggg', 'gggg', '.gg.']]], over: [false, false, true], arms: [[P / 2, P / 2], [P / 2, P / 2]] });
  // K2 chuyền vô-lê: vung ngắn, chân dừng trước người ngang gối, không bật
  const VOLLEY = table(
    { hip: [-3, -3, 2], ang: [P / 2, 0.72 * P, 0.12 * P], arms: [[P / 2, P / 2], [P / 2, P / 2]] },
    { hip: [2, 2, 2], end: [[2, -4], [2, -5], [2, -4]], foot: [[0, 1, ['GG', 'gg']], [0, 1, ['gg', 'gg']], [0, 1, ['GGG', 'ggg']]], over: [false, false, true], arms: [[P / 2, P / 2], [P / 2, P / 2]] });
  // nhịp từ player.gkRelease (bóng rời chân lúc w + s * 0.6, Actions.gkRelease) + dáng: cw khuỵu, lb ngả sau lúc lấy đà, lf lao tới (âm = ngả sau), hop bật
  const STYLE = { gkPunt: { cw: 1, lb: 1, lf: -1, hop: 3, calm: true }, gkVolley: { lf: 1, calm: true } };
  const relOf = (kt) => PL().gkRelease[kt === 'gkPunt' ? 'punt' : 'volley'];
  const timing = (kt) => Object.assign({}, relOf(kt), STYLE[kt]);
  // mốc nhịp: tung tới đỉnh · chạm bóng · hết tư thế
  const marks = (kt) => { const R = relOf(kt), hit = R.w + R.s * 0.6, end = R.w + R.s + R.f + R.o; return { toss: R.toss, hit, end }; };
  // góc 2 tay theo mốc [mốc, tay 0, tay 1] (0 trước / phải, π/2 xuống, π sau / trái): tay trái (tay 1 nhìn ngang) nâng bóng lên tung,
  // tay phải buông ra sau; chạm bóng: tay trái giơ cao giữ thăng bằng (phát bóng) / ra trước (vô-lê), tay phải ra sau
  const ARMS = {
    gkPunt: { side: [['0', 0.4, 0.5], ['toss', P / 2 + 0.3, -0.6], ['hit', P - 0.6, -1.0], ['mid', P - 0.4, -0.8], ['end', P / 2, P / 2]],
      front: [['0', 0.9, P - 0.9], ['toss', P / 2 - 0.2, -0.7], ['hit', P - 1.0, -0.9], ['mid', P - 1.2, -0.8], ['end', P / 2, P / 2]] },
    gkVolley: { side: [['0', 0.4, 0.5], ['toss', P / 2 + 0.2, -0.3], ['hit', P - 0.8, 0.1], ['end', P / 2, P / 2]],
      front: [['0', 0.9, P - 0.9], ['toss', P / 2 - 0.2, -0.4], ['hit', P - 1.2, 0.3], ['end', P / 2, P / 2]] },
  };
  // tâm bóng (ô thế giới, hình nhìn phải) lúc tung tới đỉnh (B1) / lúc chạm chân (B2). Đỉnh cú tung nằm trước mặt (ngang) / cạnh đầu (xuống):
  // đầu to, tung thẳng lên thì bóng che mặt
  const TOSS = { gkPunt: { side: [[10, -13], [9, -8]], front: [[10, -13], [-2, -6]] }, gkVolley: { side: [[9, -11], [9, -5]], front: [[9, -11], [-2, -3]] } };
  // kick.js kickArm hỏi bảng này góc tay theo thời gian (atk.rt = giây từ lúc bắt đầu tung bóng); nhìn lên: theo bảng Hard attack
  function armAtTime(kt, atk, view, i) {
    if (view === 'back' || atk.rt == null) return null;
    const M = marks(kt), at = { 0: 0, toss: M.toss, hit: M.hit, mid: (M.hit + M.end) / 2, end: M.end };
    // chéo lên: tay trái của cầu thủ (tay tung bóng) là tay bên trái hình -> đổi 2 tay của bảng nhìn ngang
    if (view === 'bdiag') i = 1 - i;
    const keys = ARMS[kt][holdKey(view)], t = atk.rt;
    if (t <= 0) return keys[0][1 + i];
    for (let k = 1; k < keys.length; k++) {
      const t0 = at[keys[k - 1][0]], t1 = at[keys[k][0]];
      if (t <= t1) return lerp(keys[k - 1][1 + i], keys[k][1 + i], easeIO(clamp01((t - t0) / (t1 - t0))));
    }
    return keys[keys.length - 1][1 + i];
  }
  for (const kt of ['gkPunt', 'gkVolley']) { ARMS[kt].bdiag = ARMS[kt].side; TOSS[kt].bdiag = TOSS[kt].side; }
  PUNT.armAt = (atk, view, i) => armAtTime('gkPunt', atk, view, i);
  VOLLEY.armAt = (atk, view, i) => armAtTime('gkVolley', atk, view, i);
  Object.assign(KICKS, { gkPunt: PUNT, gkVolley: VOLLEY });

  /* ---------- tư thế theo trạng thái (drawPlayer gọi) ---------- */
  // trạng thái vẽ của thủ môn cầm bóng / đứng dậy, hoặc null. atk = attackPose(p) · ball = thủ môn đang cầm bóng (g.ball.owner)
  //  hold: ôm bóng (t = atkT) · release: tung bóng (kt, t; bóng trên tay / trên không tới lúc chạm) · block: đỡ bóng tại chỗ (t) ·
  //  dive: đổ người cầm bóng / đứng dậy (atk.stage), có / không bóng
  function gkState(p, atk, holding) {
    if (p.atkType === 'gkHold') return { kind: 'hold', t: p.atkT || 0 };
    if (p.atkType === 'gkBlock') return { kind: 'block', t: p.atkT || 0 };
    if ((p.atkType === 'gkPunt' || p.atkType === 'gkVolley') && holding) return { kind: 'release', kt: p.atkType, t: p.atkT || 0 };
    if (atk && atk.dive && (holding || atk.stage)) return { kind: 'dive', stage: atk.stage || null, ball: holding };
    return null;
  }
  // hình học cho draw.js theo góc nhìn: { arms (tay gập), angles (tay thẳng), ball [x, y] (ô), ballBehind, drop (ô), lean (px mịn, màn hình),
  // legs 'kneel' | 'wide', shadow 'long' }. m = nhìn trái
  function gkGeom(st, view, m) {
    const hk = holdKey(view), side = m ? -1 : 1, G = { ballBehind: view === 'back' || view === 'bdiag', far: Sprite.farArm(view) === 0 ? 0 : -1 };
    const held = (pose, drop) => Object.assign(G, { arms: pose.arms, ball: pose.ball, drop: drop || 0 });
    if (st.kind === 'block') {
      // dang tay chân trong lead s (tay từ buông lên chữ V, chân dạng từ 30%), giữ hold s, hạ tay lower s (chân khép lại khi tay hạ quá 60%)
      const B = PL().gkBlock, star = STAR[hk], t = st.t;
      const k = t < B.lead ? easeOut(t / B.lead) : 1 - easeIO(clamp01((t - B.lead - B.hold) / B.lower));
      const wide = t < B.lead ? k > 0.3 : k > 0.4;
      return Object.assign(G, { angles: star.map((a) => lerp(P / 2, a, k)), legs: wide ? 'wide' : null, drop: wide ? 1 : 0 });
    }
    if (st.kind === 'hold') {
      const t = st.t, C = CATCH;
      if (t < C.pull) return held(lerpPose(REACH[hk], HOLD[hk], easeOut(t / C.pull)), 1);
      const drop = t < C.absorb ? 1 : t < C.settle ? 1 - Math.round(clamp01((t - C.absorb) / (C.settle - C.absorb))) : Math.floor(t / C.breath) % 2 ? 0.5 : 0;
      return held(HOLD[hk], drop);
    }
    if (st.kind === 'release') {
      // trước lúc chạm: bóng đi B0 (ôm) -> B1 (đỉnh cú tung, chậm dần) -> B2 (chân, nhanh dần). Mấy khung đầu tay chưa rời tư thế ôm (kick.js
      // chưa vẽ tay đá) -> vẽ tay ôm
      const M = marks(st.kt), [B1, B2] = TOSS[st.kt][hk], B0 = HOLD[hk].ball, t = st.t;
      let b;
      if (t < M.toss) { const k = easeOut(t / M.toss); b = [lerp(B0[0], B1[0], k), lerp(B0[1], B1[1], k)]; }
      else { const k = clamp01((t - M.toss) / (M.hit - M.toss)); b = [lerp(B1[0], B2[0], k * k), lerp(B1[1], B2[1], k * k)]; }
      // chéo lên: bóng còn đè lên thân (mới rời ngực) thì vẫn nằm sau thân như lúc ôm, ra khỏi mép thân thì vẽ trên cùng
      return Object.assign(G, { ball: b, arms: t < 0.02 ? HOLD[hk].arms : null, ballBehind: view === 'bdiag' && b[0] < 9 });
    }
    // đổ người: stage null = đang bay mà cầm bóng (Renderer.diving vẽ vào bộ đệm rồi xoay / ép) · còn lại = đứng dậy
    const s = st.stage;
    if (st.ball) {
      // cầm bóng: nằm / quỳ / khuỵu vẫn ôm bóng (không chống tay được), bò 4 chân + nhổm lên = quỳ ôm bóng
      if (!s) return held(HOLD[hk], 0);
      if (s === 'land' || s === 'lie') return Object.assign(held(HOLD[hk], s === 'land' ? 2 : 1), { lean: side * 2, shadow: 'long' });
      if (s === 'crouch') return held(HOLD[hk], 1);
      return Object.assign(held(HOLD[hk], 2), { legs: 'kneel' });
    }
    if (s === 'land' || s === 'lie') return Object.assign(G, { drop: s === 'land' ? 2 : 1, lean: side * 2, shadow: 'long' });   // tay đổ người vươn qua đầu (draw.js)
    if (s === 'fours') return Object.assign(G, { angles: [1.1, 0.8], legs: 'kneel', drop: 3, lean: side * 3 });
    if (s === 'rise') return Object.assign(G, { angles: [1.35, 1.15], legs: 'kneel', drop: 2, lean: side });
    if (s === 'kneel') return Object.assign(G, { arms: KNEEL_ARMS, legs: 'kneel', drop: 2 });
    return Object.assign(G, { drop: 1 });   // khuỵu: chân khuỵu theo atk.stage (keeper.js), tay đứng
  }
  // giai đoạn đứng dậy theo thời gian còn lại tới lúc đứng hẳn (rem, s): tính ngược từ cuối nên Player cắt ngắn (đang di chuyển) thì nhảy thẳng
  // tới khúc khuỵu · bóng đổ dài cả thân lúc nằm
  function getUpStage(rem) {
    const U = PL().gkGetUp;
    let e = U.crouch; if (rem <= e) return 'crouch';
    if (rem <= (e += U.kneel)) return 'kneel';
    if (rem <= (e += U.rise)) return 'rise';
    if (rem <= (e += U.fours)) return 'fours';
    if (rem <= (e += U.lie)) return 'lie';
    return 'land';
  }

  /* ---------- vẽ (draw.js gọi) ---------- */
  // 1 tay gập quanh vai i (ô thế giới): part 'limb' = cánh tay + cẳng tay · 'glove' = găng 3 x 3 ở bàn tay (chấm sáng góc trên ngoài)
  function bentArm(ctx, X, Y, mir, i, pts, pal, hand, part) {
    const q = pts.map(([x, y]) => [Math.round(x), Math.round(y)]), [hx, hy] = q[q.length - 1];
    if (part === 'limb') return drawCells(ctx, X, Y, limbCells(q, (k, j) => (k === 1 && j === 0 ? pal.t : pal.S)), mir);
    const G = i ? GLOVE.map((r) => r.split('').reverse().join('')) : GLOVE;
    drawCells(ctx, X, Y, blockCells(new Map(), hx + (i ? 0 : -1), hy - 1, G, { W: '#ffffff', H: hand }), mir);
  }
  // bóng trên tay / trên không trước lúc chạm chân (như Sprites.drawBall, không bóng đổ), lưới mịn để nhấp theo thân nửa px · (bx, by) tâm theo ô
  function heldBall(ctx, X, Y, mir, bx, by) {
    const cx = mir ? X - 2 * Math.round(bx) : X + 2 * Math.round(bx), cy = Y + 2 * Math.round(by);
    const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(cx + 2 * x, cy + 2 * y, 2 * w, 2 * h); };
    const disc = (r, c) => { const r2 = r * r + r / 2; for (let dy = -r; dy <= r; dy++) { const w = Math.floor(Math.sqrt(r2 - dy * dy)); px(-w, dy, 2 * w + 1, 1, c); } };
    disc(4, '#140c16'); disc(3, '#f4f4f4');
    px(1, 1, 2, 2, '#c7c7d2'); px(2, 0, 1, 1, '#222'); px(-2, 0, 1, 1, '#222'); px(-1, -2, 1, 1, '#ffffff');
  }
  // part 'behind' (trước thân: bóng sau lưng khi nhìn lên) · 'front' (sau thân, thay tay đứng: tay gập -> bóng -> găng, hoặc tay thẳng có găng) ·
  // 'last' (sau đầu: bóng không nằm trong tay — đang tung lên / rơi xuống chân)
  // G.far = tay xa (chéo lên: 0) vẽ ở lượt 'behind' cùng bóng: tay -> bóng -> găng, da tối như tay xa khi chạy
  function gkDraw(ctx, X, Y, mir, G, pal, hand, part) {
    const own = G.arms || G.angles, far = G.far != null ? G.far : -1, mine = (i) => (part === 'behind' ? i === far : i !== far);
    if (part === 'last') { if (G.ball && !G.ballBehind && !own) heldBall(ctx, X, Y, mir, G.ball[0], G.ball[1]); return; }
    const ballNow = G.ball && (part === 'behind' ? G.ballBehind : !G.ballBehind);
    const dark = part === 'behind' ? Object.assign({}, pal, { S: pal.s }) : pal;
    if (G.arms) G.arms.forEach((pts, i) => { if (mine(i)) bentArm(ctx, X, Y, mir, i, pts, dark, hand, 'limb'); });
    if (ballNow) heldBall(ctx, X, Y, mir, G.ball[0], G.ball[1]);
    if (G.arms) G.arms.forEach((pts, i) => { if (mine(i)) bentArm(ctx, X, Y, mir, i, pts, dark, hand, 'glove'); });
    if (G.angles) G.angles.forEach((a, i) => { if (mine(i)) armAt(ctx, X, Y, mir, i, a, pal, hand, part === 'behind', false); });
  }
  // bóng đổ người nằm: elip đậm phủ cả thân (nằm dọc màn hình nhìn từ trên thì dài gần bằng đứng — dấu hiệu "nằm" là bóng đổ, không phải thân ngắn lại).
  // Px mịn quanh chân (X, Y); bay xuống thì Renderer.diving lật cả người lẫn bóng đổ
  function lieShadow(ctx, X, Y, side) {
    const cx = X + 2 * side, cy = Y - 20, rx = 16, ry = 22;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    for (let dy = -ry; dy <= ry; dy += 2) { const w = Math.round(rx * Math.sqrt(1 - (dy / ry) * (dy / ry))); ctx.fillRect(cx - w, cy + dy, 2 * w, 2); }
  }
  // thủ môn đang cầm bóng trên tay (ôm / tung lên / đổ người bắt được): Renderer bỏ vẽ quả bóng thật, sprite vẽ thay
  const IN_HANDS = { gkHold: 1, gkPunt: 1, gkVolley: 1, diveU: 1, diveD: 1 };
  const ballInHands = (g) => !!(g.ball && g.ball.owner && IN_HANDS[g.ball.owner.atkType]);

  Object.assign(Sprite, { GK_HOLD: HOLD, GK_REACH: REACH, gkTiming: timing, gkState, gkGeom, getUpStage, gkDraw, lieShadow, ballInHands });
})();
