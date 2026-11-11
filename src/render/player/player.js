/* PlayerSprite · player.js — Thay SFC.Sprites.drawPlayer. API công khai: PlayerSprite.draw, drawPlayer, attackPose, shade, INK.
 * Nạp theo thứ tự trong scripts/manifest.js (classic script, không module): mỗi file gắn hàm vào SFC.PlayerSprite.
 */
window.SFC = window.SFC || {};

(function () {
  const Sprite = (SFC.PlayerSprite = SFC.PlayerSprite || {});
  const { attackPose, draw, flyState, flyRot, flyShadow, flyShadowSpec, hitState, snapPx } = Sprite;
  /* ---------- thay SFC.Sprites.drawPlayer: renderer vẽ ở toạ độ thế giới (có thể đã phóng / dịch / xoay), sprite tính bằng px game ---------- */
  // đang xoay (bị đá bay, ăn mừng lộn vòng): vẽ vào bộ đệm rồi xoay cả ảnh, lấy mẫu điểm gần nhất -> px vẫn sắc
  // (cả lúc phóng không tròn số, xem odd)
  let rotBuf = null;
  // màu đội ra màu vẽ (B12, duyệt 2026-11-01): băng đô trùng màu tóc / găng thủ môn trùng màu da -> lấy màu áo (áo cũng trùng thì màu phụ sẫm đi);
  // quần gần đen -> nâng sáng tới khi tách khỏi viền mực. Màu trong config đội giữ nguyên
  const rgb = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const dist = (a, b) => { const A = rgb(a), B = rgb(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); };
  const hex = (c) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c);
  function kitColors(kit, look) {
    const near = (a, b, d) => hex(a) && hex(b) && dist(a, b) < d;
    const pick = (c, vs, d) => (!near(c, vs, d) ? c : !near(kit.shirt, vs, d) ? kit.shirt : Sprite.shade(c, 0.4));
    let shorts = kit.shorts;
    for (let t = 0.04; hex(shorts) && dist(shorts, Sprite.INK) < 40 && t <= 0.5; t += 0.04) shorts = Sprite.mix(kit.shorts, '#ffffff', t);
    return { band: pick(kit.accent, look.hair, 70), glove: pick(kit.accent, look.skin, 60), shorts };
  }
  // đang chạy nước rút (để vẽ bước sải): p.sprinting của máy mô phỏng (máy khách online không có -> nhanh hơn fx.run.sprint), giữ thêm fx.run.sprintHold giây
  // sau lần cuối thấy. AI bật / tắt intent.sprint gần như mỗi khung quanh ngưỡng khoảng cách (tốc độ cũng nhảy theo quanh fx.run.sprint) -> không giữ thì
  // hình đổi qua lại giữa bước sải và bước chạy thường (nháy). Đồng hồ = p.anim (máy khách cũng tự đếm); chỉ phía vẽ, không đổi mô phỏng
  const sprintSeen = new WeakMap();
  function sprintGait(p) {
    const RN = SFC_CONFIG.game.fx.run, now = p.anim || 0;
    if (p.sprinting || (RN && Math.hypot(p.vx || 0, p.vy || 0) > RN.sprint)) { sprintSeen.set(p, now); return true; }
    const t = sprintSeen.get(p);
    return t != null && now >= t && now - t < ((RN && RN.sprintHold) || 0);
  }
  // chạy / đứng thường: góc nhìn + lật trái phải (draw.js viewOf) + đứng / chạy (> 12 px/s) chỉ đổi khi trạng thái mới giữ được fx.run.viewHold giây.
  // AI bẻ hướng / tốc độ giật qua lại quanh ngưỡng trong 1–3 khung -> hình nháy giữa 2 góc nhìn, giữa đứng và chạy. on = false (ra đòn, ăn mừng, choáng...):
  // theo đúng trạng thái thật ngay. Trả { facing, moving } để vẽ
  const steady = new WeakMap();
  function steadyLook(p, on) {
    const facing = p.facing, moving = Math.hypot(p.vx || 0, p.vy || 0) > 12, now = p.anim || 0;
    const V = Sprite.viewOf(facing), k = V.view + (V.m ? 'L' : 'R') + (moving ? 1 : 0);
    let s = steady.get(p);
    if (!on || !s || now < s.t) { s = { facing, moving, k, nk: k, t: now }; steady.set(p, s); return s; }
    if (k === s.k) { s.facing = facing; s.moving = moving; s.nk = k; return s; }
    if (k !== s.nk) { s.nk = k; s.t = now; }
    const RN = SFC_CONFIG.game.fx.run;
    if (now - s.t >= ((RN && RN.viewHold) || 0)) { s.k = k; s.facing = facing; s.moving = moving; }
    return s;
  }
  // arena có bộ cảnh tự vẽ bóng cầu thủ (Village.shadows, Renderer gọi mỗi khung): sprite không vẽ bóng riêng nữa, kẻo 2 bóng chồng nhau.
  // Arena vẽ theo màu và ảnh xem trước ở menu (g giả, không có arena) vẫn vẽ bóng của sprite
  function sceneShadow(g) {
    const sc = g && SFC.Background && SFC.Background.scene(g);
    return !!(sc && sc.shadows);
  }
  function drawPlayer(ctx, p, g, alpha = 1, tint = null, ghost = !!tint) {
    const kit = g.teams[p.team].cfg.kit, look = p.look || {}, kc = kitColors(kit, look);
    const cp = (!ghost && p.celPose) || null;
    let atk = !ghost && (p.atkType || p.passMode) ? attackPose(p) : null;
    // thủ môn cầm bóng / đứng dậy sau khi đổ người (gkball.js). Đổ người mà cầm bóng (bắt được giữa cú bay): atk.hold -> khung đổ người
    // vẽ tư thế ôm bóng (keeper.js), cú nhảy vẫn theo cú bay thật
    const gk = ghost ? null : Sprite.gkState(p, atk, !!(g && g.ball && g.ball.owner === p));
    if (gk && gk.kind === 'dive' && gk.ball) atk = Object.assign({}, atk, { hold: true });
    const RN = SFC_CONFIG.game.fx.run;
    // bước riêng khi nhìn ngang / chéo (sprint.js): bước nặng đuổi bóng lúc lấy đà sút mạnh (attackPose trả gait) · chạy nước rút (sprintGait)
    let gait = null, gaitT = 0;
    // chỉ cầu thủ thật trong trận, lúc đang đá (state 'play'), mới giữ góc nhìn. Giao bóng / bàn thắng / chọn Core... không chạy Player.update nên p.anim
    // đứng yên, còn kickoff() đặt thẳng hướng mặt -> giữ thì kẹt góc nhìn cũ cả lúc chờ giao bóng. Bản sao / ảnh xem trước vẽ thẳng theo hướng mặt
    const live = !!(g && g.state === 'play' && g.players && g.players.includes(p));
    const plain = !ghost && !cp && !atk && p.state === 'normal', st = steadyLook(p, plain && live);
    if (atk && atk.gait) { gait = atk.gait; gaitT = atk.gt; atk = null; }
    else if (plain && st.moving && sprintGait(p)) { gait = 'sprint'; gaitT = p.anim || 0; }
    const o = {
      facing: st.facing, skin: look.skin, hair: look.hair, band: kc.band,
      cut: !ghost && p.auraFarmT > 0 ? 'aura' : look.cut,   // AURA FARMING thay mọi kiểu tóc
      face: look.face, shoes: look.shoes, fx: ghost ? null : look.fx,
      shirt: tint || kit.shirt, shirtD: tint || kit.shirtDark, shorts: kc.shorts,
      sock: '#ecebe6', shoe: '#e8e8e8', sole: '#b9c2d0',
      moving: cp ? !!cp.run : gait === 'heavy' || st.moving, anim: p.anim || 0, gait, gaitT,
      lean: !ghost && !cp && !atk && !gait && p.state === 'normal' && RN && RN.lean && Math.abs(p.vx || 0) > RN.sprint ? Math.sign(p.vx) * RN.lean : 0,
      atk, cp, gk, stun: p.state === 'stun', windup: p.state === 'windup', flash: p.flash > 0,
      glove: !ghost && p.keeper ? kc.glove : null, inj: !ghost && !cp && p.inj, noShadow: alpha < 1 || !!p.flyInner || sceneShadow(g),
      hit: ghost || p.flyInner ? null : hitState(p),   // bị đấm: giơ tay (hit.js); gọi mỗi khung để bắt lúc chuyển sang choáng
      // nhảy Ground Slam / Thiên Thạch (state slam): tay giơ theo độ cao, hết lúc chạm 5 px -> tiếp đất là tay vung xuống
      slam: !ghost && p.state === 'slam' ? Math.min(1, (p.airZ || 0) / 5) : 0,
    };
    // gốc sprite luôn ở px game nguyên (user 2026-11-04 bỏ nửa px). Không vẽ ở toạ độ số thực: mép từng hàng ô bị pha màu -> sọc ngang + viền nhoè
    // khi chạy (đã thử 2026-11-03)
    const x = Math.round(p.x), y = Math.round(p.y);
    const jx = snapPx((atk && atk.jx) || 0);   // đứng lấy đà sút mạnh: người run (nguyên ô)
    // bị đá bay (fly.js): pha theo dõi ở phía vẽ. Renderer.airborne truyền sẵn p.fly (nó vẽ bản sao của cầu thủ). Nằm / lăn dậy dưới đất:
    // tự xoay quanh giữa thân (bóng đổ vẽ riêng, không xoay). Gọi flyState mỗi khung (cả lúc không choáng) để nó xoá lần bị đá bay trước khi hết choáng;
    // chỉ gọi lúc choáng thì lần choáng sau (cả cú đấm thường, không bay) lấy lại lúc chạm đất cũ -> nằm ra đất
    const fs = ghost ? null : p.fly !== undefined ? p.fly : flyState(p);
    o.fly = fs && fs.phase ? fs : null;
    // đứng dậy sau khi nằm: không xoay, ngồi dậy rồi theo tư thế đứng dậy của thủ môn (fly.js flyGetUp), vẫn choáng (mắt gạch, sao)
    if (o.fly && o.fly.phase === 'rise' && !(p.airZ > 0)) {
      const u = Sprite.flyGetUp(fs);
      Object.assign(o, { fly: null, facing: u.facing, cp: u.cp || null, atk: u.atk || null, gk: u.gk || null, moving: false });
    }
    if (o.fly && !p.flyInner && !(p.airZ > 0)) {
      // người cao hơn (render.playerScale, Sprite v3): bóng nằm to theo, xoay quanh giữa thân mới (8 px -> 8 x k)
      const rot = flyRot(fs, p.anim || 0), K = (SFC_CONFIG.game.render && SFC_CONFIG.game.render.playerScale) || 1, cy = Math.round(8 * K);
      const sh = flyShadowSpec(fs), shK = sh && { dx: sh.dx * K, dy: sh.dy * K, rx: sh.rx * K, ry: sh.ry * K };
      ctx.save(); ctx.globalAlpha = alpha; if (alpha >= 1 && !o.noShadow) flyShadow(ctx, x, y, shK); ctx.restore();
      ctx.save(); ctx.translate(x, y - cy); ctx.rotate(rot);
      drawPlayer(ctx, Object.assign({}, p, { x: 0, y: cy, fly: fs, flyInner: true }), g, alpha, tint, ghost);
      ctx.restore(); ctx.globalAlpha = 1;
      return y - Math.round(16 * ((SFC_CONFIG.game.render && SFC_CONFIG.game.render.playerScale) || 1));
    }
    ctx.save();
    ctx.globalAlpha = alpha;
    const T = ctx.getTransform();
    // phóng không tròn số (khổng lồ sizeMul, camera zoom): 1 ô (px game = 1 đơn vị vẽ của sprite) không khớp px màn hình -> vẽ thẳng thì hở vạch giữa
    // các ô. Vẽ vào bộ đệm rồi phóng lấy mẫu điểm gần nhất (cả chiều dọc: backflip ép dọc theo góc lộn). Mọi toạ độ của sprite nguyên nên 1 ô nguyên px
    // màn hình (T.a nguyên) là vẽ thẳng được
    const odd1 = (v) => { const f = Math.abs(v); return f < 1 - 1e-3 || Math.abs(f - Math.round(f)) > 1e-3; }, odd = odd1(T.a) || odd1(T.d);
    // Sprite v3 (player3/, người cao 31 px cho sân to): trạng thái nào v3 vẽ được thì vẽ v3, còn lại v2 phóng render.playerScale (px không đều)
    // p.small: người cỡ cũ (v2 24 px, không phóng) — avatar ngoài trận (Sprites.drawAvatar; owner 2026-11-11: ngoài trận giữ cỡ cũ, khung DOM 40 x 44
    // và cảnh vẽ tay 320 x 180 đặt người cạnh NPC cỡ cũ)
    const S3 = SFC.PlayerSprite3, v3 = !p.small && !!(S3 && S3.supports(o)), PS = p.small ? 1 : (SFC_CONFIG.game.render && SFC_CONFIG.game.render.playerScale) || 1;
    if (T.b || T.c || odd) {
      const W = 96, H = 96, oy = 72;
      if (!rotBuf) { rotBuf = document.createElement('canvas'); rotBuf.width = W; rotBuf.height = H; }
      const bc = rotBuf.getContext('2d'); bc.clearRect(0, 0, W, H);
      drawAny(bc, W / 2 + jx, oy, o, v3, PS);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(rotBuf, x - W / 2, y - oy);
    } else drawAny(ctx, x + jx, y, o, v3, PS);
    ctx.restore();
    ctx.globalAlpha = 1;
    const k = v3 ? 1.3 : Sprite.bufScaled || p.small ? 1 : PS;
    return y - Math.round(((atk && atk.khop) || 0) * k) + ((cp && cp.drop) || 0) - Math.round(16 * k);
  }
  // vẽ 1 người: v3 thẳng · v2 thẳng (PS 1) · v2 vào bộ đệm rồi phóng PS lần quanh bàn chân, lấy mẫu điểm gần nhất
  let psBuf = null;
  function drawAny(c, X, Y, o, v3, PS) {
    if (v3) return SFC.PlayerSprite3.draw(c, X, Y, Object.assign({ eyes: 'A' }, o));
    // renderer đang vẽ cả động tác vào đệm rồi tự phóng (ăn mừng, vật thể thay hình: Sprite.bufScaled) -> không phóng lần 2
    if (PS === 1 || Sprite.bufScaled) return draw(c, X, Y, o);
    const W = 96, H = 96, ax = 48, ay = 72;
    if (!psBuf) { psBuf = document.createElement('canvas'); psBuf.width = W; psBuf.height = H; }
    const bc = psBuf.getContext('2d'); bc.clearRect(0, 0, W, H); bc.globalAlpha = 1;
    draw(bc, ax, ay, o);
    const sm = c.imageSmoothingEnabled; c.imageSmoothingEnabled = false;
    c.drawImage(psBuf, X - ax * PS, Y - ay * PS, W * PS, H * PS);
    c.imageSmoothingEnabled = sm;
  }

  // bóng dưới đất của cầu thủ lúc này, cho cảnh tự vẽ bóng (Village.shadows): cùng các trạng thái làm bóng sprite đổi.
  // Trả { k, z } = bóng đứng thu nhỏ k lần, thân cao hơn đất z px (bóng ngả xa hơn theo hướng nắng), hoặc { lie: { dx, dy, rx, ry } } = elip nằm
  // dưới thân (px thế giới tính từ chân, dx đã theo hướng), hoặc { rx, ry, z } = elip riêng (thủ môn đang bay đổ người)
  const STAND_RX = 7;   // bóng đứng của sprite (body.js shadow): bán trục ngang 7 px
  function groundShadow(p, g) {
    const fs = p.state === 'stun' ? flyState(p) : null, lsh = flyShadowSpec(fs);
    if (lsh && !(p.airZ > 0)) return { lie: lsh };   // nằm sau khi bị đá bay / đang lăn dậy
    // ăn mừng: nhấc người thì bóng nhỏ lại, lộn vòng (rot) thì bóng dài ra như celDraw
    if (p.celId && g && (g.state === 'goal' || g.state === 'ended') && !(p.airZ > 0) && Sprite.celPose) {
      const cp = Sprite.celPose(p.celId, p.celT || 0, p), lift = Math.max(0, Math.round((cp.lift || 0) * (p.icon ? 0.4 : 1)));
      return { k: Math.max(0.4, 1 - lift / 50), wide: cp.rot ? 10 / STAND_RX : 1, z: lift };
    }
    if (p.airZ > 0) return { k: Math.max(0.35, 1 - p.airZ / 70), z: p.airZ };   // bị hất tung / tự nhảy (Renderer.airborne)
    const atk = p.atkType || p.passMode ? attackPose(p) : null;
    // nằm sau khi đổ người (khung keeper.js): bay lên = elip dài phủ cả thân như lieShadow của gkball.js · bay xuống = elip rộng dưới đầu.
    // Đang bay: khop như cú nhảy (dưới)
    const df = atk && atk.dive ? Sprite.diveFrameOf(atk) : null;
    if (df && df.shadow === 'long') return { lie: { dx: Math.cos(p.facing) < 0 ? -1 : 1, dy: -10, rx: 8, ry: 11 } };
    if (df && df.shadow === 'wide') return { k: 1.3, z: 0 };
    // sút / vô-lê / Hard attack / đánh đầu / đổ người bật lên (khop px): như bóng sprite ở draw.js
    if (atk && atk.khop) return { k: atk.header || atk.dive ? Math.max(0.6, Math.round((1 - atk.khop / 30) * 10) / 10) : atk.khop >= 1.5 ? 0.85 : 1, z: atk.khop };
    return { k: 1, z: 0 };
  }

  Object.assign(Sprite, { drawPlayer, groundShadow, kitColors, sceneShadow, sprintGait, steadyLook });
})();
