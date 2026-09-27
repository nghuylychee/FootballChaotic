/* Sprites — vẽ pixel-art procedural (không cần file ảnh), phong cách 2.5D kiểu Binding of Isaac */
window.SFC = window.SFC || {};

(function () {
  const OUT = '#140c16';

  function px(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, w, h); }

  // hình tròn pixel (vẽ theo từng hàng -> cạnh răng cưa sắc nét)
  function disc(ctx, cx, cy, r, c) {
    ctx.fillStyle = c;
    cx |= 0; cy |= 0;
    for (let dy = -r; dy <= r; dy++) {
      const w = Math.floor(Math.sqrt(r * r - dy * dy) + 0.35);
      ctx.fillRect(cx - w, cy + dy, w * 2 + 1, 1);
    }
  }
  function ellipse(ctx, cx, cy, rx, ry, c) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  function ringPx(ctx, cx, cy, r, c) {
    ctx.fillStyle = c;
    const steps = Math.max(12, r * 7);
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * 0.5), 1, 1);
    }
  }


  /* ---------- anim ra đòn ---------- */
  const easeOut = (k) => 1 - (1 - k) * (1 - k);
  const clamp01 = (k) => Math.max(0, Math.min(1, k));

  // Tư thế theo thời gian ra đòn (p.atkT):
  //  light: fist = độ vươn nắm đấm (px, âm = kéo về lấy đà), impact = đang chạm
  //  hard : leg = góc chân so với hướng mặt (rad, π = sau lưng, 0 = trước mặt), sweep = góc bắt đầu vung (vẽ vệt)
  function attackPose(p) {
    const C = SFC_CONFIG.game.combat, t = p.atkT || 0;
    if (p.atkType === 'light') {
      const L = C.light, S = L.startup;
      let fist;
      if (t < S * 0.55) fist = -3 * (t / (S * 0.55));
      else if (t < S) fist = -3 + 15 * easeOut((t - S * 0.55) / (S * 0.45));
      else if (t < S + 0.08) fist = 12;
      else fist = 12 * (1 - clamp01((t - S - 0.08) / Math.max(0.01, L.recover - 0.08)));
      return { fist, streak: t > S * 0.55 && t < S + 0.05, impact: t >= S && t < S + 0.07 };
    }
    if (p.atkType === 'hard') {
      const H = C.hard, W = H.windup;
      if (t < W) return { leg: Math.PI * 0.85 * easeOut(clamp01(t / (W * 0.6))), lift: 3, sweep: null };
      const k = clamp01((t - W) / H.kickTime);
      if (k < 1) return { leg: Math.PI * 0.85 - (Math.PI * 0.85 + 0.45) * easeOut(k), lift: 3 + Math.sin(k * Math.PI) * 3, sweep: Math.PI * 0.85 };
      // sau cú đá: chân hạ dần về
      const back = clamp01((t - W - H.kickTime) / 0.15);
      return back < 1 ? { leg: -0.45 * (1 - back), lift: 3 * (1 - back), sweep: null } : {};
    }
    return {};
  }

  // chi (tay / chân): chuỗi điểm 2px viền OUT từ (x0,y0) tới (x1,y1)
  function limb(ctx, x0, y0, x1, y1, color) {
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i <= n; i++) {
        const cx = Math.round(x0 + ((x1 - x0) * i) / n), cy = Math.round(y0 + ((y1 - y0) * i) / n);
        if (pass === 0) px(ctx, cx - 1, cy - 1, 4, 4, OUT);
        else px(ctx, cx, cy, 2, 2, color);
      }
    }
  }

  // Light attack: tay thẳng từ vai, nắm đấm to + vệt gió + tia chạm
  function drawPunch(ctx, x, by, fx, fy, side, atk, hand) {
    const sx = x + side * 4, sy = by + 2;
    const ex = Math.round(sx + fx * atk.fist), ey = Math.round(sy + fy * atk.fist * 0.6);
    limb(ctx, sx, sy, ex, ey, hand);
    if (atk.streak) {
      ctx.globalAlpha *= 0.8;
      for (let i = 1; i <= 3; i++) px(ctx, Math.round(ex - fx * (i * 3 + 2)), Math.round(ey - fy * (i * 2 + 1)) + (i % 2 ? -3 : 4), 3 - (i >> 1), 1, '#ffffff');
      ctx.globalAlpha /= 0.8;
    }
    px(ctx, ex - 2, ey - 2, 6, 6, OUT);
    px(ctx, ex - 1, ey - 1, 4, 4, hand);
    px(ctx, ex - 1, ey - 1, 2, 1, '#ffffff');
    if (atk.impact) {
      const ix = Math.round(ex + fx * 5), iy = Math.round(ey + fy * 3);
      px(ctx, ix - 4, iy, 9, 1, '#fff6a0'); px(ctx, ix, iy - 4, 1, 9, '#fff6a0');
      px(ctx, ix - 2, iy - 2, 1, 1, '#ffffff'); px(ctx, ix + 2, iy - 2, 1, 1, '#ffffff');
      px(ctx, ix - 2, iy + 2, 1, 1, '#ffffff'); px(ctx, ix + 2, iy + 2, 1, 1, '#ffffff');
    }
  }

  // Hard attack: chân vung từ sau lưng ra trước mặt, vệt cung trắng-đỏ theo đường chân
  function drawKick(ctx, p, x, y, fx, fy, side, atk) {
    const hx = x + side * 2, hy = y - 5, LEN = 11;
    // hướng chân = hướng mặt xoay góc a (chân phải: vòng từ sau lưng qua bên phải ra trước), trục y dẹt kiểu 2.5D
    const at = (a) => {
      const ang = p.facing + a;
      return { x: hx + Math.cos(ang) * LEN, y: hy + Math.sin(ang) * LEN * 0.6 };
    };
    if (atk.sweep != null) {
      ctx.globalCompositeOperation = 'lighter';
      for (let a = atk.sweep; a > atk.leg; a -= 0.12) {
        const q = at(a), k = 1 - (a - atk.leg) / (atk.sweep - atk.leg + 0.001);
        px(ctx, Math.round(q.x), Math.round(q.y - atk.lift), 2, 2, `rgba(255,${120 + Math.round(k * 135)},${90 + Math.round(k * 165)},${0.25 + k * 0.6})`);
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    const f = at(atk.leg);
    const footX = Math.round(f.x), footY = Math.round(f.y - atk.lift);
    limb(ctx, hx, hy, footX, footY, p.look.skin);
    // giày
    px(ctx, footX - 2, footY - 2, 6, 5, OUT);
    px(ctx, footX - 1, footY - 1, 4, 3, '#e8e8e8');
  }

  /* ---------- cầu thủ ---------- */
  // p cần: x, y, vx, vy, facing, anim, team, role, look, state
  function drawPlayer(ctx, p, g, alpha = 1, tint = null) {
    const team = g.teams[p.team];
    const kit = team.cfg.kit;
    const shirt = tint || kit.shirt;
    const shirtDark = tint || kit.shirtDark;
    const gloves = !tint && p.keeper; // đứng trong vòng cấm nhà -> đeo găng thủ môn
    const x = Math.round(p.x), y0 = Math.round(p.y);
    const moving = Math.hypot(p.vx || 0, p.vy || 0) > 12;
    const step = moving ? Math.floor(p.anim * 12) % 2 : 0;
    const stunned = p.state === 'stun';
    const y = y0;
    const bob = moving && step ? -1 : 0;
    const fx = Math.cos(p.facing), fy = Math.sin(p.facing);
    // tay / chân ra đòn nằm ở phía hướng mặt (nhìn sang phải -> tay/chân phải)
    const side = fx >= 0 ? 1 : -1;
    const atk = !tint && p.atkType ? attackPose(p) : null;

    ctx.globalAlpha = alpha;
    if (alpha >= 1) ellipse(ctx, x, y0 + 1, 6, 2.5, 'rgba(0,0,0,0.38)');

    // chân (đang đá: chỉ vẽ chân trụ, chân đá vẽ riêng)
    const l = step ? -1 : 0, r = step ? 0 : -1;
    const kickLeg = atk && atk.leg;
    if (!(kickLeg && side < 0)) {
      px(ctx, x - 4, y - 5 + l, 4, 5, OUT);
      px(ctx, x - 3, y - 4 + l, 2, 3, p.look.skin); px(ctx, x - 3, y - 2 + l, 2, 1, '#e8e8e8');
    }
    if (!(kickLeg && side > 0)) {
      px(ctx, x, y - 5 + r, 4, 5, OUT);
      px(ctx, x + 1, y - 4 + r, 2, 3, p.look.skin); px(ctx, x + 1, y - 2 + r, 2, 1, '#e8e8e8');
    }
    if (kickLeg) drawKick(ctx, p, x, y, fx, fy, side, atk);

    // thân
    const by = y - 10 + bob;
    px(ctx, x - 5, by - 1, 10, 8, OUT);
    px(ctx, x - 4, by, 8, 6, shirt);
    px(ctx, x - 4, by + 4, 8, 2, kit.shorts);
    px(ctx, x - 4, by + 3, 8, 1, shirtDark);
    px(ctx, x - 1, by, 2, 1, kit.accent);
    // tay (đang đấm: tay phía hướng mặt vẽ riêng)
    const arm = moving ? (step ? 1 : -1) : 0;
    const hand = gloves ? kit.accent : p.look.skin;
    const punchArm = atk && atk.fist != null;
    if (!(punchArm && side < 0)) { px(ctx, x - 6, by + 1 + arm, 2, 4, OUT); px(ctx, x - 6, by + 2 + arm, 1, 2, hand); }
    if (!(punchArm && side > 0)) { px(ctx, x + 4, by + 1 - arm, 2, 4, OUT); px(ctx, x + 5, by + 2 - arm, 1, 2, hand); }
    if (punchArm) drawPunch(ctx, x, by, fx, fy, side, atk, hand);
    // Hard attack đang gồng: hào quang đỏ nhấp nháy
    if (p.state === 'windup') {
      ctx.globalCompositeOperation = 'lighter';
      disc(ctx, x, by + 2, 9, `rgba(255,50,80,${0.4 + 0.25 * Math.sin(p.anim * 40)})`);
      ctx.globalCompositeOperation = 'source-over';
    }

    // đầu to kiểu Isaac
    const hx = x;
    const hy = by - 6 + (stunned ? Math.round(Math.sin(p.anim * 20)) : 0);
    disc(ctx, hx, hy, 7, OUT);
    disc(ctx, hx, hy, 6, p.look.skin);
    // tóc + băng đô
    const back = fy < -0.35;
    ctx.fillStyle = p.look.hair;
    for (let dy = -6; dy <= (back ? 3 : -3); dy++) {
      const w = Math.floor(Math.sqrt(36 - dy * dy) + 0.35);
      ctx.fillRect(hx - w, hy + dy, w * 2 + 1, 1);
    }
    px(ctx, hx - 6, hy - 3, 13, 1, kit.accent);
    // má hồng / bóng đổ đầu
    px(ctx, hx - 5, hy + 3, 11, 1, 'rgba(0,0,0,0.12)');

    if (!back) {
      const ex = Math.round(fx * 2);
      const ey = fy > 0.4 ? 1 : 0;
      if (stunned) {
        px(ctx, hx - 4 + ex, hy + ey, 3, 1, OUT); px(ctx, hx + 1 + ex, hy + ey, 3, 1, OUT);
      } else {
        px(ctx, hx - 4 + ex, hy - 1 + ey, 3, 3, OUT); px(ctx, hx + 1 + ex, hy - 1 + ey, 3, 3, OUT);
        px(ctx, hx - 4 + ex, hy - 1 + ey, 1, 1, '#ffffff'); px(ctx, hx + 1 + ex, hy - 1 + ey, 1, 1, '#ffffff');
      }
      px(ctx, hx - 1 + ex, hy + 3 + ey, 2, 1, stunned ? OUT : 'rgba(20,12,22,0.6)');
    }

    if (p.flash > 0) {
      ctx.globalCompositeOperation = 'lighter';
      disc(ctx, hx, hy, 6, 'rgba(255,255,255,0.6)');
      ctx.globalCompositeOperation = 'source-over';
    }
    if (stunned) {
      for (let i = 0; i < 3; i++) {
        const a = p.anim * 6 + (i * Math.PI * 2) / 3;
        px(ctx, hx + Math.round(Math.cos(a) * 8), hy - 9 + Math.round(Math.sin(a) * 2), 2, 2, '#ffe14f');
      }
    }
    ctx.globalAlpha = 1;
    return hy;
  }

  /* ---------- bóng ---------- */
  function drawBall(ctx, b, alpha = 1) {
    const x = Math.round(b.x), y = Math.round(b.y);
    const s = Math.max(1.2, 3.2 - b.z * 0.05);
    ctx.globalAlpha = alpha;
    ellipse(ctx, x, y + 1, s + 0.5, s * 0.5 + 0.3, 'rgba(0,0,0,0.4)');
    const by = Math.round(y - b.z - 3);
    const fx = b.fx || {};
    if (fx.fire || fx.thunder) {
      ctx.globalCompositeOperation = 'lighter';
      disc(ctx, x, by, 6, fx.fire ? 'rgba(255,120,30,0.45)' : 'rgba(80,220,255,0.45)');
      ctx.globalCompositeOperation = 'source-over';
    }
    disc(ctx, x, by, 4, OUT);
    disc(ctx, x, by, 3, fx.fire ? '#ffd9a0' : fx.thunder ? '#d8fbff' : '#f4f4f4');
    px(ctx, x + 1, by + 1, 2, 2, '#c7c7d2');
    const a = (b.roll || 0) * 0.3;
    px(ctx, x + Math.round(Math.cos(a) * 1.6), by + Math.round(Math.sin(a) * 1.6), 1, 1, '#222');
    px(ctx, x - Math.round(Math.cos(a) * 1.6), by - Math.round(Math.sin(a) * 1.6), 1, 1, '#222');
    px(ctx, x - 1, by - 2, 1, 1, '#ffffff');
    ctx.globalAlpha = 1;
  }

  SFC.Sprites = { OUT, px, disc, ellipse, ringPx, drawPlayer, drawBall };
})();
