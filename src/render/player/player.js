/* PlayerSprite · player.js — Thay SFC.Sprites.drawPlayer. API công khai: PlayerSprite.draw, drawPlayer, attackPose, shade, INK.
 * Nạp theo thứ tự trong scripts/manifest.js (classic script, không module): mỗi file gắn hàm vào SFC.PlayerSprite.
 */
window.SFC = window.SFC || {};

(function () {
  const Sprite = (SFC.PlayerSprite = SFC.PlayerSprite || {});
  const { attackPose, draw, flyState, flyRot, flyShadow, flyShadowSpec, hitState } = Sprite;
  /* ---------- thay SFC.Sprites.drawPlayer: renderer vẽ ở toạ độ 1x (có thể đã scale x2 / dịch / xoay), sprite vẽ ở lưới mịn = scale(0.5) ---------- */
  // đang xoay (bay người, ăn mừng lộn vòng): vẽ vào bộ đệm rồi xoay cả ảnh, lấy mẫu điểm gần nhất -> px vẫn sắc như Renderer.diving
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
  function drawPlayer(ctx, p, g, alpha = 1, tint = null, ghost = !!tint) {
    const kit = g.teams[p.team].cfg.kit, look = p.look || {}, kc = kitColors(kit, look);
    const cp = (!ghost && p.celPose) || null, atk = !ghost && p.atkType ? attackPose(p) : null;
    const RN = SFC_CONFIG.game.fx.run;
    const o = {
      facing: p.facing, skin: look.skin, hair: look.hair, band: kc.band,
      cut: !ghost && p.auraFarmT > 0 ? 'aura' : look.cut,   // AURA FARMING thay mọi kiểu tóc
      face: look.face, shoes: look.shoes, fx: ghost ? null : look.fx,
      shirt: tint || kit.shirt, shirtD: tint || kit.shirtDark, shorts: kc.shorts,
      sock: '#ecebe6', shoe: '#e8e8e8', sole: '#b9c2d0',
      moving: cp ? !!cp.run : Math.hypot(p.vx || 0, p.vy || 0) > 12, anim: p.anim || 0,
      lean: !ghost && !cp && !atk && p.state === 'normal' && RN && RN.lean && Math.abs(p.vx || 0) > RN.sprint ? 2 * Math.sign(p.vx) * RN.lean : 0,
      atk, cp, stun: p.state === 'stun', windup: p.state === 'windup', flash: p.flash > 0,
      glove: !ghost && p.keeper ? kc.glove : null, inj: !ghost && !cp && p.inj, noShadow: alpha < 1 || !!p.flyInner,
      hit: ghost || p.flyInner ? null : hitState(p),   // bị đấm: giơ tay (hit.js); gọi mỗi khung để bắt lúc chuyển sang choáng
      // nhảy Ground Slam / Thiên Thạch (state slam): tay giơ theo độ cao, hết lúc chạm 5 px -> tiếp đất là tay vung xuống
      slam: !ghost && p.state === 'slam' ? Math.min(1, (p.airZ || 0) / 5) : 0,
    };
    const x = Math.round(p.x), y = Math.round(p.y);
    // bị đá bay (fly.js): pha theo dõi ở phía vẽ. Renderer.airborne truyền sẵn p.fly (nó vẽ bản sao của cầu thủ). Nằm / lăn dậy dưới đất:
    // tự xoay quanh giữa thân (bóng đổ vẽ riêng, không xoay)
    const fs = ghost ? null : p.fly !== undefined ? p.fly : p.state === 'stun' ? flyState(p) : null;
    o.fly = fs && fs.phase ? fs : null;
    if (o.fly && !p.flyInner && !(p.airZ > 0)) {
      const rot = flyRot(fs, p.anim || 0);
      ctx.save(); ctx.globalAlpha = alpha; ctx.scale(0.5, 0.5); if (alpha >= 1) flyShadow(ctx, 2 * x, 2 * y, flyShadowSpec(fs)); ctx.restore();
      ctx.save(); ctx.translate(x, y - 8); ctx.rotate(rot);
      drawPlayer(ctx, Object.assign({}, p, { x: 0, y: 8, fly: fs, flyInner: true }), g, alpha, tint, ghost);
      ctx.restore(); ctx.globalAlpha = 1;
      return y - 16;
    }
    ctx.save();
    ctx.globalAlpha = alpha;
    const T = ctx.getTransform();
    ctx.scale(0.5, 0.5);
    // phóng không tròn số (khổng lồ sizeMul, camera zoom): px mịn không khớp px màn hình -> vẽ thẳng thì hở vạch giữa các ô. Cũng vẽ vào bộ đệm rồi phóng
    // lấy mẫu điểm gần nhất (cả chiều dọc: backflip ép dọc theo góc lộn). Canvas 1x (bộ đệm cũ cỡ 1x, cảnh pixel): 1 px mịn < 1 px màn hình, vẽ thẳng
    // thì nhoè nửa px -> cũng qua bộ đệm, thu về lưới game (thân / tư thế khoá nằm trên lưới game nên giữ nguyên, px mịn bị bỏ bớt)
    const odd1 = (v) => { const f = Math.abs(v) / 2; return f < 1 - 1e-3 || Math.abs(f - Math.round(f)) > 1e-3; }, odd = odd1(T.a) || odd1(T.d);
    if (T.b || T.c || odd) {
      const W = 128, H = 128, oy = 100;
      if (!rotBuf) { rotBuf = document.createElement('canvas'); rotBuf.width = W; rotBuf.height = H; }
      const bc = rotBuf.getContext('2d'); bc.clearRect(0, 0, W, H);
      draw(bc, W / 2, oy, o);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(rotBuf, 2 * x - W / 2, 2 * y - oy);
    } else draw(ctx, 2 * x, 2 * y, o);
    ctx.restore();
    ctx.globalAlpha = 1;
    return y - (atk && atk.khop ? Math.round(atk.khop / 2) : 0) + ((cp && cp.drop) || 0) - 16;
  }

  Object.assign(Sprite, { drawPlayer, kitColors });
})();
