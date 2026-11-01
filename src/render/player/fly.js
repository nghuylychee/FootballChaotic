/* PlayerSprite · fly.js — Bị đá bay: lộn vòng (tay chân văng ra) -> chạm đất nằm sõng soài (nảy nhẹ) -> lăn dậy qua thế khuỵu -> đứng choáng.
 * Nạp theo thứ tự trong scripts/manifest.js (classic script, không module): mỗi file gắn hàm vào SFC.PlayerSprite.
 */
window.SFC = window.SFC || {};

(function () {
  const Sprite = (SFC.PlayerSprite = SFC.PlayerSprite || {});
  const { armAt, at, easeIO, easeOut, lerp, stamp } = Sprite;
  // Game: Hard attack / nổ hất tung (launch 190 px/s lên, knockback 380 px/s ngang, airGravity 620, airDamp 1.4) -> bay ~0.6 s, cao ~29 px;
  // chạm đất mạnh thì nảy 30% (~3 px); state stun suốt, choáng 1.6 s chỉ trôi khi đã chạm đất. Renderer.airborne xoay hình dir * anim * 13.
  // Không có trường "lúc chạm đất" trong trạng thái trận -> theo dõi ở phía vẽ (flyState: WeakMap theo cầu thủ, đồng hồ p.anim chạy ở mọi máy,
  // airZ có trong snapshot) nên máy khách online cũng thấy như máy chủ.
  // Pha: tumble (đang bay) · sprawl (chạm đất -> nằm, SPRAWL s) · rise (lăn dậy, RISE s) · null (đứng choáng như thường)
  const P = Math.PI;
  const FLY = { high: 3, touch: 1.5, sprawl: 0.4, rise: 0.2, settle: 0.08, spin: 13 };
  const track = new WeakMap();
  function flyState(p) {
    let s = track.get(p);
    if (!s) track.set(p, (s = { air: false, touch: null, dir: 1, rot0: 0, anim: null, out: null }));
    if (s.anim === p.anim && s.out) return s.out;
    const z = p.airZ || 0, stun = p.state === 'stun';
    if (!stun) { s.air = false; s.touch = null; }
    else if (z > FLY.high) { s.air = true; s.touch = null; s.dir = (p.kbx || 0) >= 0 ? 1 : -1; }
    else if (s.air && z <= FLY.touch) { s.air = false; s.touch = p.anim; s.rot0 = s.dir * p.anim * FLY.spin; }
    s.anim = p.anim;
    const t = s.touch == null ? 0 : p.anim - s.touch;
    const phase = s.air ? 'tumble' : s.touch == null ? null : t < FLY.sprawl ? 'sprawl' : t < FLY.sprawl + FLY.rise ? 'rise' : null;
    s.out = { phase, t, dir: s.dir, rot0: s.rot0, k: phase === 'rise' ? (t - FLY.sprawl) / FLY.rise : phase === 'sprawl' ? t / FLY.sprawl : 0 };
    return s.out;
  }
  // góc xoay cả hình (Renderer.airborne / drawPlayer lúc nằm dưới đất): bay = lộn như game · nằm = về ±90° (đầu theo hướng bay) trong FLY.settle s
  // từ góc lúc chạm đất (đi đường ngắn nhất) · dậy = từ ±90° về 0
  function flyRot(fs, anim) {
    if (!fs || !fs.phase) return 0;
    if (fs.phase === 'tumble') return fs.dir * anim * FLY.spin;
    const lie = fs.dir * P / 2;
    if (fs.phase === 'sprawl') {
      let a0 = fs.rot0 % (2 * P); while (a0 - lie > P) a0 -= 2 * P; while (lie - a0 > P) a0 += 2 * P;
      return lerp(a0, lie, easeOut(Math.min(1, fs.t / FLY.settle)));
    }
    return lerp(lie, 0, easeIO(fs.k));
  }
  // tư thế (hình đứng thẳng, trước khi xoay): tay [i 0, i 1] (góc quanh vai), kiểu chân, khuỵu (px mịn), há miệng
  function flyPose(fs) {
    if (fs.phase === 'tumble') return { arms: [P + 0.9, -0.9], legs: 'split', c: 0, mouth: true };
    if (fs.phase === 'sprawl') return { arms: [P + 0.25, -0.25], legs: 'wide', c: 0, mouth: false };
    const e = easeIO(fs.k);
    return { arms: [lerp(P + 0.25, P - 0.6, e), lerp(-0.25, 0.6, e)], legs: 'bend', c: Math.round(2 * Math.sin(P * Math.min(1, e * 1.4))), mouth: false };
  }
  // tay: tư thế khoá (bay, nằm) lưới thế giới · lúc dậy lưới mịn
  function flyArms(ctx, X, Y, mir, fs, pal, hand) {
    const fp = flyPose(fs), fine = fs.phase === 'rise';
    armAt(ctx, X, Y, mir, 0, fp.arms[0], pal, hand, false, fine); armAt(ctx, X, Y, mir, 1, fp.arms[1], pal, hand, false, fine);
  }
  // chân (hình nhìn phải, lật theo mir). Lúc văng / nằm 2 mũi giày chĩa ra 2 phía (user 2026-11-01: không cùng 1 hướng):
  // split = 2 chân dạng, chân phải hình nhấc cao hơn 1 hàng (văng loạn) · wide = dạng rộng (nằm) · bend = khuỵu, mũi theo hướng mặt
  function flyLegs(ctx, X, Y, B, pal, fs, toe, mir) {
    const S = (part, dx, dy = 0) => stamp(ctx, X, Y, at(part, dx, dy), pal, mir);
    const legs = flyPose(fs).legs;
    if (legs === 'split') { S(B.TL, -5); S(B.TR, 3, -1); }
    else if (legs === 'wide') { S(B.TL, -5); S(B.TR, 3); }
    else { S(toe, -5); S(toe, 2); }
  }

  // bóng đổ lúc nằm (user 2026-11-01: "nằm sâu hơn" = bóng to hơn, dời lên giữa thân): elip rộng dưới cả thân nằm ngang, tâm ở giữa thân nằm
  // (thân xoay quanh chân - 8 px nên giữa thân lệch 4 px về phía đầu = hướng bay, cao hơn chân 6 px); lúc dậy thu dần về bóng đứng ở chân.
  // dx (theo hướng bay) / dy / rx / ry theo px thế giới, tính từ chân. Bay lộn: null (bóng của Renderer.airborne)
  const LIE_SH = { dx: 4, dy: -6, rx: 15, ry: 6 }, STAND_SH = { dx: 0, dy: 1, rx: 7, ry: 2.5 };
  function flyShadowSpec(fs) {
    if (!fs || !fs.phase || fs.phase === 'tumble') return null;
    const e = fs.phase === 'rise' ? easeIO(fs.k) : 0;
    return { dx: fs.dir * lerp(LIE_SH.dx, STAND_SH.dx, e), dy: lerp(LIE_SH.dy, STAND_SH.dy, e), rx: lerp(LIE_SH.rx, STAND_SH.rx, e), ry: lerp(LIE_SH.ry, STAND_SH.ry, e) };
  }
  // vẽ elip ở lưới thế giới rồi nhân đôi (mép px như bóng đứng) · X, Y = chân ở px mịn
  const shImgs = {};
  function flyShadow(ctx, X, Y, sh) {
    if (typeof document === 'undefined' || !sh) return;
    const rx = Math.round(sh.rx * 2) / 2, ry = Math.round(sh.ry * 2) / 2, key = rx + 'x' + ry;
    const w = Math.ceil(rx) * 2 + 2, h = Math.ceil(ry) * 2 + 2;
    let img = shImgs[key];
    if (!img) {
      img = shImgs[key] = document.createElement('canvas'); img.width = w; img.height = h;
      const c = img.getContext('2d'); c.fillStyle = 'rgba(0,0,0,0.38)'; c.beginPath(); c.ellipse(w / 2, h / 2, rx, ry, 0, 0, Math.PI * 2); c.fill();
    }
    const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, Math.round(X + 2 * (sh.dx || 0) - w), Math.round(Y + 2 * sh.dy - h), w * 2, h * 2);
    ctx.imageSmoothingEnabled = sm;
  }

  Object.assign(Sprite, { FLY, flyState, flyRot, flyPose, flyArms, flyLegs, flyShadowSpec, flyShadow });
})();
