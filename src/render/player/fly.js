/* PlayerSprite · fly.js — Bị đá bay: lộn vòng (tay chân văng ra) -> chạm đất nằm sõng soài (nảy nhẹ) tới gần hết choáng -> đứng dậy (ngồi -> nhổm -> quỳ -> khuỵu),
 * đứng hẳn đúng lúc hết choáng.
 * Nạp theo thứ tự trong scripts/manifest.js (classic script, không module): mỗi file gắn hàm vào SFC.PlayerSprite.
 */
window.SFC = window.SFC || {};

(function () {
  const Sprite = (SFC.PlayerSprite = SFC.PlayerSprite || {});
  const { armAt, at, easeOut, lerp, stamp } = Sprite;
  // Game: Hard attack / nổ hất tung (launch 190 px/s lên, knockback 380 px/s ngang, airGravity 620, airDamp 1.4) -> bay ~0.6 s, cao ~29 px;
  // chạm đất mạnh thì nảy 30% (~3 px); state stun suốt, choáng 1.6 s chỉ trôi khi đã chạm đất. Renderer.airborne xoay hình dir * anim * 13.
  // Không có trường "lúc chạm đất" trong trạng thái trận -> theo dõi ở phía vẽ (flyState: WeakMap theo cầu thủ, đồng hồ p.anim chạy ở mọi máy,
  // airZ có trong snapshot) nên máy khách online cũng thấy như máy chủ.
  // Pha: tumble (đang bay) · sprawl (chạm đất -> nằm tới khi choáng còn FLY.rise s) · rise (đứng dậy, FLY.rise s cuối của choáng) · null (hết choáng)
  const P = Math.PI;
  // đứng dậy, không xoay hình: ngồi dậy (ngồi bệt của ăn mừng, 2 tay chống ra sau) -> các giai đoạn đứng dậy sau khi đổ người của thủ môn
  // (gkball.js: nhổm, quỳ, khuỵu), mỗi giai đoạn bấy nhiêu giây
  const GET_UP = [['sit', 0.14], ['rise', 0.1], ['kneel', 0.1], ['crouch', 0.08]];
  // minLie: lúc chạm đất mà choáng còn không đủ nằm bấy nhiêu giây (ngoài FLY.rise đứng dậy) thì không nằm, đứng choáng luôn: cú hất nhẹ choáng
  // ngắn (Sonic Boom, Freight Train, Bulldozer) nằm ra thì vừa chạm đất đã phải đứng dậy
  const FLY = { high: 3, touch: 1.5, minLie: 0.3, rise: GET_UP.reduce((a, [, d]) => a + d, 0), getUp: GET_UP, settle: 0.08, spin: 13 };
  // choáng còn bao nhiêu giây. Máy chạy trận: p.stateT (chỉ trôi khi đã chạm đất). Khách online: stateT không có trong snapshot (sync.js PF)
  // -> đoán theo choáng của Hard attack tính từ lúc chạm đất (Da Thép / LEGEND đổi độ dài choáng: khách đứng dậy lệch, hết choáng sớm thì bật dậy)
  function stunLeft(p, sinceTouch) {
    const guest = SFC.Session && SFC.Session.active && !SFC.Session.isHost;
    return guest ? SFC_CONFIG.game.combat.hard.stun - sinceTouch : p.stateT || 0;
  }
  const track = new WeakMap();
  function flyState(p) {
    let s = track.get(p);
    if (!s) track.set(p, (s = { air: false, touch: null, dir: 1, rot0: 0, anim: null, out: null }));
    if (s.anim === p.anim && s.out) return s.out;
    const z = p.airZ || 0, stun = p.state === 'stun';
    if (!stun) { s.air = false; s.touch = null; }
    else if (z > FLY.high) { s.air = true; s.touch = null; s.dir = (p.kbx || 0) >= 0 ? 1 : -1; }
    else if (s.air && z <= FLY.touch) {
      s.air = false; s.rot0 = s.dir * p.anim * FLY.spin;
      s.touch = stunLeft(p, 0) >= FLY.rise + FLY.minLie ? p.anim : null;   // choáng ngắn: không nằm
    }
    s.anim = p.anim;
    const t = s.touch == null ? 0 : p.anim - s.touch, left = s.touch == null ? 0 : stunLeft(p, t);
    // r = giây đã đứng dậy (pha rise)
    const phase = s.air ? 'tumble' : s.touch == null ? null : left > FLY.rise ? 'sprawl' : left > 0 ? 'rise' : null;
    s.out = { phase, t, dir: s.dir, rot0: s.rot0, r: phase === 'rise' ? FLY.rise - left : 0 };
    return s.out;
  }
  // góc xoay cả hình (Renderer.airborne / drawPlayer lúc nằm dưới đất): bay = lộn như game · nằm = về ±90° (đầu theo hướng bay) trong FLY.settle s
  // từ góc lúc chạm đất (đi đường ngắn nhất) · dậy = không xoay (flyGetUp)
  function flyRot(fs, anim) {
    if (!fs || !fs.phase) return 0;
    if (fs.phase === 'tumble') return fs.dir * anim * FLY.spin;
    if (fs.phase !== 'sprawl') return 0;
    const lie = fs.dir * P / 2;
    let a0 = fs.rot0 % (2 * P); while (a0 - lie > P) a0 -= 2 * P; while (lie - a0 > P) a0 += 2 * P;
    return lerp(a0, lie, easeOut(Math.min(1, fs.t / FLY.settle)));
  }
  // đứng dậy (pha rise): tư thế đứng dậy của thủ môn sau khi đổ người, nhìn theo hướng bay (lúc nằm đầu chĩa về phía đó).
  // Trả { facing, cp (tư thế ăn mừng) | atk (như attackPose của cú đổ người) + gk (như gkState) } cho drawPlayer
  const SIT_ARMS = [[-7, 6], [6, 3]];   // tay sau chống xuống đất sau lưng, tay trước gác lên gối (nhìn phải; nhìn trái lật)
  function flyGetUp(fs) {
    let e = fs.r, stage = GET_UP[GET_UP.length - 1][0];
    for (const [id, d] of GET_UP) { if (e < d) { stage = id; break; } e -= d; }
    const facing = fs.dir > 0 ? 0 : P;
    if (stage === 'sit') return { facing, cp: { legs: 'sit', drop: 4, arms: fs.dir > 0 ? SIT_ARMS : SIT_ARMS.map(([x, y]) => [-x, y]).reverse() } };
    return { facing, atk: { dive: true, flying: false, toward: false, stage, dk: 1, dh: 1, ds: 1 }, gk: { kind: 'dive', stage, ball: false } };
  }
  // tư thế (hình đứng thẳng, trước khi xoay) lúc bay / nằm: tay [i 0, i 1] (góc quanh vai), kiểu chân, khuỵu (px), há miệng
  function flyPose(fs) {
    if (fs.phase === 'tumble') return { arms: [P + 0.9, -0.9], legs: 'split', c: 0, mouth: true };
    return { arms: [P + 0.25, -0.25], legs: 'wide', c: 0, mouth: false };
  }
  function flyArms(ctx, X, Y, mir, fs, pal, hand) {
    const fp = flyPose(fs);
    armAt(ctx, X, Y, mir, 0, fp.arms[0], pal, hand, false); armAt(ctx, X, Y, mir, 1, fp.arms[1], pal, hand, false);
  }
  // chân (hình nhìn phải, lật theo mir). Lúc văng / nằm 2 mũi giày chĩa ra 2 phía (user 2026-11-01: không cùng 1 hướng):
  // split = 2 chân dạng, chân phải hình nhấc cao hơn 1 hàng (văng loạn) · wide = dạng rộng (nằm)
  function flyLegs(ctx, X, Y, B, pal, fs, toe, mir) {
    const S = (part, dx, dy = 0) => stamp(ctx, X, Y, at(part, dx, dy), pal, mir);
    if (flyPose(fs).legs === 'split') { S(B.TL, -5); S(B.TR, 3, -1); }
    else { S(B.TL, -5); S(B.TR, 3); }
  }

  // bóng đổ lúc nằm (user 2026-11-01: "nằm sâu hơn" = bóng to hơn, dời lên giữa thân): elip rộng dưới cả thân nằm ngang, tâm ở giữa thân nằm
  // (thân xoay quanh chân - 8 px nên giữa thân lệch 4 px về phía đầu = hướng bay, cao hơn chân 6 px).
  // dx (theo hướng bay) / dy / rx / ry theo px thế giới, tính từ chân. Bay lộn: null (bóng của Renderer.airborne) · đứng dậy: null (bóng của tư thế)
  const LIE_SH = { dx: 4, dy: -6, rx: 15, ry: 6 };
  function flyShadowSpec(fs) {
    if (!fs || fs.phase !== 'sprawl') return null;
    return { dx: fs.dir * LIE_SH.dx, dy: LIE_SH.dy, rx: LIE_SH.rx, ry: LIE_SH.ry };
  }
  // vẽ elip ở lưới thế giới (mép px như bóng đứng) · X, Y = chân (px game)
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
    ctx.drawImage(img, X + Math.round(sh.dx || 0) - w / 2, Y + Math.round(sh.dy) - h / 2, w, h);
    ctx.imageSmoothingEnabled = sm;
  }

  Object.assign(Sprite, { FLY, flyState, flyRot, flyGetUp, flyPose, flyArms, flyLegs, flyShadowSpec, flyShadow });
})();
