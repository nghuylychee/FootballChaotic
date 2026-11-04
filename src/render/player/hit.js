/* PlayerSprite · hit.js — Giơ 2 tay lên: bị đấm (choáng dưới đất), nhảy Ground Slam (state slam). Móc xe đạp giơ tay qua bảng KICKS.bicycle (shoot.js).
 * Nạp theo thứ tự trong scripts/manifest.js (classic script, không module): mỗi file gắn hàm vào SFC.PlayerSprite.
 */
window.SFC = window.SFC || {};

(function () {
  const Sprite = (SFC.PlayerSprite = SFC.PlayerSprite || {});
  const { armAt, easeIO, easeOut, lerp } = Sprite;
  // user 2026-11-01: bị đấm / nhảy Ground Slam / móc xe đạp thì giơ hẳn 2 tay lên (bản lắc nhẹ trước đó bị bỏ).
  // Lúc bị đánh không có trong snapshot (stateT không đồng bộ) -> theo dõi ở phía vẽ như flyState: state chuyển sang stun lúc đang đứng dưới đất
  // (bị hất tung thì tay do fly.js lo). Độ giơ tay (0 buông .. 1 giơ hết): bị đấm = vọt lên trong up s, giữ tới hold s, hạ xuống tới down s
  const P = Math.PI;
  const HIT = { up: 0.06, hold: 0.2, down: 0.45 };
  // giơ hết: 2 tay dang chữ V (góc quanh vai, mọi hướng) + vai nhô lên SHRUG ô như thủ môn đổ người: tay chỉ dài 2.4 ô, không nhô vai thì bàn tay
  // chỉ tới ngang vai (trông như rụt vai, không ra giơ tay) -> nhô vai cho bàn tay lên tới cạnh má. Vẽ sau đầu (draw.js) cho bàn tay nằm trên viền đầu
  const UP = [P + 0.9, -0.9], SHRUG = -2;
  const track = new WeakMap();
  // giây kể từ lúc bị đánh (còn giơ tay) hoặc null. Gọi mỗi khung vẽ (cả lúc không choáng) để bắt được lúc chuyển sang stun
  function hitState(p) {
    let s = track.get(p);
    if (!s) track.set(p, (s = { stun: false, t0: null, anim: null, out: null }));
    if (s.anim === p.anim) return s.out;
    const stun = p.state === 'stun';
    if (stun && !s.stun) s.t0 = (p.airZ || 0) > 0 ? null : p.anim;
    if (!stun) s.t0 = null;
    s.stun = stun; s.anim = p.anim;
    const t = s.t0 == null ? null : p.anim - s.t0;
    s.out = t != null && t < HIT.down ? t : null;
    return s.out;
  }
  const hitLift = (t) => (t == null || t < 0 || t >= HIT.down ? 0 : t < HIT.up ? easeOut(t / HIT.up) : t < HIT.hold ? 1 : 1 - easeIO((t - HIT.hold) / (HIT.down - HIT.hold)));
  // giơ 2 tay theo độ L (vai nhô theo, nguyên ô). Nhìn chéo: tay xa (chéo xuống i 1, chéo lên i 0) nằm sau thân, vẽ trước thân (behindOnly)
  function liftArms(ctx, X, Y, mir, view, L, pal, hand, behindOnly) {
    const ang = (i) => lerp(P / 2, UP[i], L), far = Sprite.farArm(view);
    Y += Math.round(SHRUG * L);
    if (far >= 0) { const i = behindOnly ? far : 1 - far; armAt(ctx, X, Y, mir, i, ang(i), pal, hand, behindOnly); return; }
    if (behindOnly) return;
    armAt(ctx, X, Y, mir, 0, ang(0), pal, hand, false); armAt(ctx, X, Y, mir, 1, ang(1), pal, hand, false);
  }

  Object.assign(Sprite, { HIT, ARMS_UP: UP, hitState, hitLift, liftArms });
})();
