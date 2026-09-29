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
  // hình tròn pixel đối xứng cả 4 phía (dx² + dy² <= r² + r/2): cạnh trên/dưới giống hệt cạnh trái/phải
  function roundDisc(ctx, cx, cy, r, c) {
    ctx.fillStyle = c;
    cx |= 0; cy |= 0;
    const r2 = r * r + r / 2;
    for (let dy = -r; dy <= r; dy++) {
      const w = Math.floor(Math.sqrt(r2 - dy * dy));
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
    // sút / phá bóng: chân sút đưa ra trước (nhấc nhẹ), chân trụ lùi về sau — vẽ trong drawPlayer
    if (p.atkType === 'shoot') return { shoot: true };
    // thủ môn đổ người: hai tay duỗi qua đầu (người nghiêng + bay khỏi mặt đất vẽ ở Renderer.diving)
    if (p.atkType === 'diveU' || p.atkType === 'diveD') return { dive: true };
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
    const { s: sh, main, sole } = shoeColors(p.look, p.anim, side > 0 ? 1 : 0);
    px(ctx, footX - 2, footY - 2, 6, 5, OUT);
    px(ctx, footX - 1, footY - 1, 4, 2, main);
    px(ctx, footX - 1, footY + 1, 4, 1, sole);
    if (sh.glow) { ctx.globalCompositeOperation = 'lighter'; px(ctx, footX - 2, footY - 2, 6, 5, sh.glow); ctx.globalCompositeOperation = 'source-over'; }
  }

  // Chân vẽ chéo từ hông (tư thế sút): deg = góc so với hướng mặt (0 = ra trước, âm = chúc xuống), side = 1 nhìn phải / -1 nhìn trái.
  // Từ hông xuống: quần -> da -> tất, giày ở cuối
  function drawDiagLeg(ctx, hx, hy, deg, len, side, look, kit, anim, which) {
    const a = (deg * Math.PI) / 180;
    const ex = Math.round(hx + Math.cos(a) * len * side), ey = Math.round(hy - Math.sin(a) * len);
    const n = Math.max(1, Math.max(Math.abs(ex - hx), Math.abs(ey - hy)));
    const pts = [];
    for (let i = 0; i <= n; i++) pts.push([Math.round(hx + ((ex - hx) * i) / n), Math.round(hy + ((ey - hy) * i) / n)]);
    const { s, main, sole } = shoeColors(look, anim, which);
    const sock = s.sock === 'skin' ? look.skin : Array.isArray(s.sock) ? s.sock[0] : s.sock || '#e8e8e8';
    // giày 3x2 (thân + đế), mũi giày về phía hướng mặt
    const sx = side > 0 ? ex : ex - 1;
    for (const [cx, cy] of pts) px(ctx, cx - 1, cy - 1, 4, 4, OUT);
    px(ctx, sx - 1, ey - 1, 5, 4, OUT);
    pts.forEach(([cx, cy], i) => { const t = i / n; px(ctx, cx, cy, 2, 2, t < 0.3 ? kit.shorts : t < 0.8 ? look.skin : sock); });
    px(ctx, sx, ey, 3, 1, main);
    px(ctx, sx, ey + 1, 3, 1, sole);
    if (s.glow) { ctx.globalCompositeOperation = 'lighter'; px(ctx, sx - 1, ey - 1, 5, 4, s.glow); ctx.globalCompositeOperation = 'source-over'; }
  }

  /* ---------- giày (slot shoes) ---------- */
  // main = thân giày, sole = đế, sock = tất (1 hàng, hoặc 2 màu sọc), skin = để lộ da (dép), glow = phát sáng
  const SHOES = {
    kicks:    { main: '#e8e8e8', sole: '#b9c2d0' },
    slides:   { main: '#3b82f6', sole: '#2d5bd1', sock: 'skin' },
    reds:     { main: '#d7263d', sole: '#e8e8e8' },
    canvas:   { main: '#2f6fd1', sole: '#e8e8e8' },
    boots:    { main: '#6b4423', sole: '#3b2415', sock: '#6b4423' },
    barefoot: { main: 'skin', sole: 'skin', sock: 'skin', toes: true },
    rainboot: { main: '#ffd23f', sole: '#c98a14', sock: '#ffd23f' },
    socks:    { main: '#1a1216', sole: '#4a4f63', sock: ['#e8e8e8', '#d7263d'] },
    hightop:  { main: '#262a36', sole: '#ff8a3f', sock: '#262a36' },
    clogs:    { main: '#c7a26a', sole: '#8a6a3a', clog: true },
    rollers:  { main: '#e8ecf5', sole: '#ff3d5a', wheels: true },
    cleats:   { main: '#6bff4f', sole: '#1a1216', studs: true },
    neonkick: { main: '#3ff6ff', sole: '#9d7bff', glow: 'rgba(63,246,255,0.25)' },
    camo:     { main: '#4a5a2a', sole: '#262a36', sock: '#6b7a3a', camo: '#2e3a1a' },
    rainbowkick: { main: '#ff3d5a', sole: '#e8e8e8', rainbow: true },
    mismatch: { main: '#d7263d', sole: '#e8e8e8', right: '#2f6fd1' },
    goldboot: { main: '#ffd23f', sole: '#c98a14', sparkle: true },
    iceboot:  { main: '#bdf4ff', sole: '#7fe7ff', glow: 'rgba(127,231,255,0.2)', sparkle: true },
    rocket:   { main: '#9aa3b5', sole: '#4a4f63', thrust: true },
    flame:    { main: '#ff6a1f', sole: '#ffd23f', flame: true },
  };
  const RAINBOW = ['#ff3d5a', '#ff8a3f', '#ffe14f', '#6bff4f', '#3ff6ff', '#9d7bff'];

  // màu thật của giày (đổi theo chân / thời gian): which = 0 chân trái, 1 chân phải
  function shoeColors(look, anim = 0, which = 0) {
    const s = SHOES[look.shoes] || SHOES.kicks;
    const skin = look.skin;
    let main = s.main === 'skin' ? skin : s.main;
    if (s.rainbow) main = RAINBOW[(Math.floor(anim * 8) + which * 3) % RAINBOW.length];
    if (s.right && which === 1) main = s.right;
    return { s, main, sole: s.sole === 'skin' ? skin : s.sole };
  }

  // 1 chân: lx = mép trái, fy = đáy bàn chân. Hàng: bắp chân (da) · tất · giày · đế (+ phụ kiện dưới đế)
  function drawLeg(ctx, lx, fy, look, anim = 0, which = 0) {
    const { s, main, sole } = shoeColors(look, anim, which);
    px(ctx, lx, fy - 5, 4, 6, OUT);
    const sock = s.sock === 'skin' ? look.skin : s.sock;
    if (Array.isArray(sock)) { px(ctx, lx + 1, fy - 4, 2, 1, sock[0]); px(ctx, lx + 1, fy - 3, 2, 1, sock[1]); }
    else { px(ctx, lx + 1, fy - 4, 2, 1, look.skin); px(ctx, lx + 1, fy - 3, 2, 1, sock || '#e8e8e8'); }
    const slide = s.sock === 'skin' && !s.toes;
    px(ctx, lx + 1, fy - 2, 2, 1, slide ? look.skin : main);  // dép: lộ ngón chân
    px(ctx, lx + 1, fy - 1, 2, 1, slide ? main : sole);
    if (s.toes) { px(ctx, lx + 1, fy - 1, 1, 1, 'rgba(0,0,0,0.25)'); }
    if (s.camo) { px(ctx, lx + 1 + (which & 1), fy - 2, 1, 1, s.camo); px(ctx, lx + 2 - (which & 1), fy - 3, 1, 1, s.camo); }
    if (s.clog) { px(ctx, lx, fy, 4, 1, OUT); px(ctx, lx + 1, fy, 2, 1, sole); px(ctx, lx, fy + 1, 4, 1, OUT); }
    if (s.wheels) { px(ctx, lx, fy + 1, 1, 1, '#1a1216'); px(ctx, lx + 3, fy + 1, 1, 1, '#1a1216'); px(ctx, lx, fy, 4, 1, '#9aa3b5'); }
    if (s.studs) { px(ctx, lx, fy + 1, 1, 1, '#e8e8e8'); px(ctx, lx + 2, fy + 1, 1, 1, '#e8e8e8'); }
    if (s.glow) { ctx.globalCompositeOperation = 'lighter'; px(ctx, lx, fy - 3, 4, 4, s.glow); ctx.globalCompositeOperation = 'source-over'; }
    if (s.sparkle && Math.sin(anim * 6 + lx) > 0.8) px(ctx, lx + 2, fy - 2, 1, 1, '#ffffff');
    if (s.thrust) {
      const f = Math.floor(anim * 16 + which) % 2;
      ctx.globalCompositeOperation = 'lighter';
      px(ctx, lx + 1, fy + 1, 2, 1 + f, 'rgba(90,180,255,0.9)'); px(ctx, lx + 1, fy + 2 + f, 1, 1, 'rgba(200,240,255,0.8)');
      ctx.globalCompositeOperation = 'source-over';
    }
    if (s.flame) {
      const f = Math.floor(anim * 14 + lx) % 3;
      ctx.globalCompositeOperation = 'lighter';
      px(ctx, lx + 1 + (f === 1 ? 1 : 0), fy - 3 - f, 1, 1, '#ffd23f');
      px(ctx, lx + 1, fy - 3, 2, 1, 'rgba(255,106,31,0.6)');
      ctx.globalCompositeOperation = 'source-over';
    }
  }


  /* ---------- hiệu ứng khi chạy (slot fx) ----------
   * rate = hạt / giây khi chạy · life = thời gian sống · z = độ cao sinh ra [min, max] · vz = bay lên (âm = rơi xuống)
   * g = trọng lực · spread = toả ngang · still = đứng yên tại chỗ (vệt) · drift = lắc ngang · add = hoà sáng (lighter)
   * shape: px (ô vuông) · star · heart · note · ring (bong bóng) · coin · bolt · ghost (bóng người) */
  const FX = {
    sparkle:   { rate: 16, life: 0.45, colors: ['#ffffff', '#fff6a0'], shape: 'star', z: [3, 16], still: true, add: true },
    bubbles:   { rate: 8, life: 0.9, colors: ['#9fe8ff', '#d8f6ff'], shape: 'ring', z: [4, 10], vz: [10, 18], drift: 6 },
    leaves:    { rate: 9, life: 0.9, colors: ['#6bff4f', '#2f8f2a', '#b4ff3f'], size: 2, z: [10, 16], vz: [-12, -6], drift: 10 },
    hearts:    { rate: 8, life: 0.8, colors: ['#ff5a9e', '#ff3d5a'], shape: 'heart', z: [6, 12], vz: [12, 20] },
    snow:      { rate: 16, life: 0.9, colors: ['#ffffff', '#e8ecf5'], size: 1, z: [12, 20], vz: [-14, -8], drift: 5, spread: 8 },
    smoke:     { rate: 14, life: 0.7, colors: ['#6a6470', '#8a8490', '#524c58'], size: [2, 3], z: [0, 3], vz: [6, 12] },
    dust:      { rate: 14, life: 0.45, colors: ['#8a7f70'], size: 2, vz: [10, 14], back: 0.1 },
    notes:     { rate: 7, life: 0.9, colors: ['#ffe14f', '#7fe7ff', '#ff8ac0'], shape: 'note', z: [8, 12], vz: [12, 18], drift: 4 },
    confetti:  { rate: 26, life: 0.7, colors: ['#ff3d5a', '#ffe14f', '#3ff6ff', '#9dff3d', '#c63dff'], size: [1, 2], z: [6, 12], vz: [18, 34], g: 70, spread: 5 },
    petals:    { rate: 11, life: 1.0, colors: ['#ffb7d5', '#ff8ac0', '#ffe0ee'], size: 2, z: [12, 18], vz: [-10, -5], drift: 9 },
    coins:     { rate: 7, life: 0.7, colors: ['#ffd23f'], shape: 'coin', z: [4, 8], vz: [30, 40], g: 130, spread: 4 },
    neon:      { rate: 45, life: 0.35, colors: ['#3ff6ff', '#9d7bff'], size: 2, z: [2, 12], still: true, add: true },
    frost:     { rate: 30, life: 0.9, colors: ['#bdf4ff', '#7fe7ff', '#ffffff'], shape: 'star', z: [0, 1], still: true, add: true, spread: 5 },
    lightning: { rate: 16, life: 0.16, colors: ['#fff6a0', '#7fe7ff'], shape: 'bolt', z: [2, 14], still: true, add: true, spread: 7 },
    rainbow:   { rate: 45, life: 0.45, colors: RAINBOW_FX(), size: 2, z: [3, 6], still: true, add: true, cycle: true },
    fire:      { rate: 35, life: 0.4, colors: ['#ff6a1f', '#ffd23f'], size: [1, 2], vz: [20, 40], add: true },
    shadow:    { rate: 9, life: 0.35, colors: ['#9d7bff'], shape: 'ghost', still: true, spread: 0 },
    galaxy:    { rate: 32, life: 0.8, colors: ['#9d7bff', '#3ff6ff', '#ffffff', '#ff8ac0'], shape: 'star', z: [0, 16], still: true, add: true, spread: 7 },
  };
  function RAINBOW_FX() { return ['#ff3d5a', '#ff8a3f', '#ffe14f', '#6bff4f', '#3ff6ff', '#9d7bff']; }
  const rnd = (a) => (Array.isArray(a) ? a[0] + Math.random() * (a[1] - a[0]) : a || 0);

  // sinh 1 hạt cho người p (đang chạy). t = đồng hồ để hạt cầu vồng đổi màu theo thứ tự
  function spawnFx(kind, p, t = 0) {
    const d = FX[kind];
    if (!d) return null;
    const c = d.cycle ? d.colors[Math.floor(t * 10) % d.colors.length] : d.colors[Math.floor(Math.random() * d.colors.length)];
    const sp = d.spread != null ? d.spread : 3;
    const q = {
      k: kind, shape: d.shape || 'px', add: !!d.add, c,
      x: p.x + (Math.random() - 0.5) * 2 * sp, y: p.y + (Math.random() - 0.5) * 2, z: rnd(d.z),
      vx: d.still ? 0 : -(p.vx || 0) * (d.back || 0.15) + (Math.random() - 0.5) * (d.drift || 0) * 2,
      vy: 0, vz: d.still ? 0 : rnd(d.vz), g: d.g || 0, drift: d.drift || 0, phase: Math.random() * 6,
      t: d.life, max: d.life, s: Math.round(rnd(d.size || 1)),
    };
    if (d.shape === 'ghost') Object.assign(q, { ghost: { team: p.team, look: p.look, facing: p.facing, anim: p.anim, role: p.role }, x: p.x, y: p.y });
    return q;
  }

  function stepFx(q, dt) {
    q.t -= dt;
    q.vz -= q.g * dt;
    q.x += q.vx * dt + (q.drift ? Math.sin(q.t * 7 + q.phase) * q.drift * dt : 0);
    q.y += q.vy * dt;
    q.z = Math.max(0, q.z + q.vz * dt);
  }

  // vẽ 1 hạt (g cần cho shape ghost)
  function drawFxParticle(ctx, q, g, alpha = 1) {
    const k = Math.max(0, q.t / q.max);
    const x = Math.round(q.x), y = Math.round(q.y - q.z), c = q.c;
    ctx.globalCompositeOperation = q.add ? 'lighter' : 'source-over';
    ctx.globalAlpha = alpha * (q.shape === 'ghost' ? k * 0.45 : Math.min(1, k * 1.6));
    switch (q.shape) {
      case 'star': px(ctx, x, y - 1, 1, 3, c); px(ctx, x - 1, y, 3, 1, c); break;
      case 'heart': px(ctx, x - 1, y - 1, 1, 1, c); px(ctx, x + 1, y - 1, 1, 1, c); px(ctx, x - 1, y, 3, 1, c); px(ctx, x, y + 1, 1, 1, c); break;
      case 'note': px(ctx, x + 1, y - 3, 1, 3, c); px(ctx, x + 2, y - 3, 1, 1, c); px(ctx, x, y, 2, 1, c); break;
      case 'ring': px(ctx, x, y - 1, 1, 1, c); px(ctx, x - 1, y, 1, 1, c); px(ctx, x + 1, y, 1, 1, c); px(ctx, x, y + 1, 1, 1, c); break;
      case 'coin': px(ctx, x, y, 2, 2, c); px(ctx, x, y, 1, 1, '#fff6a0'); break;
      case 'bolt': px(ctx, x, y - 2, 1, 2, c); px(ctx, x + 1, y, 1, 1, c); px(ctx, x, y + 1, 1, 2, c); break;
      case 'ghost':
        if (g && q.ghost) drawPlayer(ctx, Object.assign({ x: q.x, y: q.y, vx: 0, vy: 0, state: 'normal', flash: 0 }, q.ghost), g, ctx.globalAlpha, c);
        break;
      default: px(ctx, x, y, q.s, q.s, c);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  // xem trước hiệu ứng quanh character đứng yên (menu / shop / túi đồ): hạt lặp theo chu kỳ, không cần mô phỏng
  function drawFxPreview(ctx, kind, cx, fy, t, g) {
    const d = FX[kind];
    if (!d) return;
    const n = 9;
    for (let i = 0; i < n; i++) {
      const ph = (t / (d.life * 2.2) + i / n) % 1;
      const ang = i * 2.39;
      const q = {
        shape: d.shape || 'px', add: !!d.add, c: d.colors[i % d.colors.length], s: Math.round(rnd(d.size || 1)),
        x: cx + Math.sin(ang) * (8 + (i % 3) * 3), y: fy - 1,
        z: d.still ? rnd(d.z || 0) + (i % 4) * 3 : Math.max(0, (d.z ? d.z[0] : 0) + (d.vz ? (rnd(d.vz)) * ph : 0) + (d.vz && d.vz[0] < 0 ? 16 : 0)),
        t: (1 - ph) * d.life, max: d.life,
      };
      if (d.shape === 'ghost') {
        if (i > 1) break;
        Object.assign(q, { x: cx - 7 - i * 6, y: fy, ghost: { team: 0, look: g.previewLook, facing: 0, anim: t, role: 'FWD' }, t: d.life * (0.8 - i * 0.3) });
      }
      drawFxParticle(ctx, q, g);
    }
  }

  /* ---------- trang phục ---------- */
  // tóc phủ đỉnh đầu (trong vòng tròn bán kính 6) từ hàng dy0 tới dy1
  function capRows(ctx, hx, hy, color, dy0, dy1) {
    ctx.fillStyle = color;
    for (let dy = dy0; dy <= dy1; dy++) {
      const w = Math.floor(Math.sqrt(36 - dy * dy) + 0.35);
      ctx.fillRect(hx - w, hy + dy, w * 2 + 1, 1);
    }
  }

  // vòng tròn pixel rỗng dẹt (vòng thánh, bong bóng...)
  function ringFlat(ctx, cx, cy, rx, ry, c) {
    ctx.fillStyle = c;
    const n = Math.max(12, rx * 6);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      ctx.fillRect(Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), 1, 1);
    }
  }

  // tô phần dưới / trên của mặt (hàng dy0..dy1 trong vòng tròn bán kính 6) — khăn che mặt, mặt nạ
  const faceRows = capRows;

  function drawHair(ctx, cut, hair, kit, hx, hy, fx, fy, back, anim = 0) {
    const side = Math.abs(fx) > 0.5 ? Math.sign(fx) : 0; // nhìn sang trái / phải
    switch (cut) {
      case 'buzz':
        capRows(ctx, hx, hy, hair, -6, back ? 2 : -4);
        break;
      case 'spiky':
        capRows(ctx, hx, hy, hair, -6, back ? 3 : -3);
        for (const sx of [-5, -2, 1, 4]) {
          px(ctx, sx < 0 ? hx + sx - 1 : hx + sx, hy - 10, 3, 4, OUT);
          px(ctx, hx + sx, hy - 9, 1, 3, hair); px(ctx, hx + sx + (sx < 0 ? 0 : 0), hy - 7, 2, 1, hair);
        }
        break;
      case 'mohawk':
        capRows(ctx, hx, hy, 'rgba(20,12,22,0.28)', -6, back ? 2 : -4); // hai bên cạo sát
        if (side) { px(ctx, hx - 6, hy - 11, 13, 5, OUT); px(ctx, hx - 5, hy - 10, 11, 4, hair); }
        else { px(ctx, hx - 2, hy - 12, 5, 9, OUT); px(ctx, hx - 1, hy - 11, 3, 8, hair); }
        break;
      case 'afro':
        capRows(ctx, hx, hy, hair, -6, back ? 3 : -4);
        break;
      case 'cap': {
        const cap = '#262a36', brim = '#161923';
        capRows(ctx, hx, hy, cap, -6, -2);
        if (back) px(ctx, hx - 2, hy - 3, 5, 1, kit.accent); // quai sau
        else if (side) { px(ctx, side > 0 ? hx + 3 : hx - 10, hy - 4, 8, 3, OUT); px(ctx, side > 0 ? hx + 4 : hx - 9, hy - 3, 6, 1, brim); }
        else { px(ctx, hx - 7, hy - 3, 15, 3, OUT); px(ctx, hx - 6, hy - 2, 13, 1, brim); }
        if (!back) px(ctx, hx - 1 + side * 2, hy - 5, 2, 2, kit.accent); // logo
        break;
      }
      case 'beanie':
        capRows(ctx, hx, hy, '#d7263d', -6, -2);
        px(ctx, hx - 6, hy - 3, 13, 2, '#ff5a6e');
        disc(ctx, hx, hy - 8, 3, OUT); disc(ctx, hx, hy - 8, 2, '#f3ead7');
        break;
      case 'bandana':
        capRows(ctx, hx, hy, hair, -6, back ? 3 : -4);
        px(ctx, hx - 6, hy - 4, 13, 2, '#d7263d');
        px(ctx, hx - 4, hy - 4, 1, 1, '#ffffff'); px(ctx, hx + 2, hy - 3, 1, 1, '#ffffff');
        if (side) { px(ctx, hx - side * 9, hy - 4, 3, 1, '#d7263d'); px(ctx, hx - side * 10, hy - 3, 2, 1, '#a81d30'); }
        else if (back) px(ctx, hx - 1, hy - 5, 3, 3, '#a81d30'); // nút buộc
        break;
      case 'crown':
        capRows(ctx, hx, hy, hair, -6, back ? 3 : -3);
        px(ctx, hx - 5, hy - 8, 11, 4, OUT);
        for (const sx of [-4, 0, 4]) { px(ctx, hx + sx - 1, hy - 11, 3, 4, OUT); px(ctx, hx + sx, hy - 10, 1, 3, '#ffd23f'); }
        px(ctx, hx - 4, hy - 7, 9, 2, '#ffd23f');
        px(ctx, hx, hy - 7, 1, 1, '#ff3d5a');
        break;
      case 'bowl': // mái bằng
        capRows(ctx, hx, hy, hair, -6, back ? 3 : -2);
        if (!back) px(ctx, hx - 6, hy - 2, 13, 1, 'rgba(0,0,0,0.25)');
        break;
      case 'bun':
        capRows(ctx, hx, hy, hair, -6, back ? 3 : -4);
        disc(ctx, hx, hy - 8, 3, OUT); disc(ctx, hx, hy - 8, 2, hair);
        px(ctx, hx - 2, hy - 6, 5, 1, kit.accent);
        break;
      case 'longhair': // tóc dài buộc đuôi ngựa
        capRows(ctx, hx, hy, hair, -6, back ? 4 : -3);
        if (side) { px(ctx, hx - side * 9 - 1, hy - 4, 4, 8, OUT); px(ctx, hx - side * 9, hy - 3, 2, 6, hair); }
        else if (back) { px(ctx, hx - 2, hy + 2, 5, 7, OUT); px(ctx, hx - 1, hy + 3, 3, 5, hair); }
        else { px(ctx, hx - 8, hy - 4, 3, 8, OUT); px(ctx, hx + 6, hy - 4, 3, 8, OUT); px(ctx, hx - 7, hy - 3, 1, 6, hair); px(ctx, hx + 7, hy - 3, 1, 6, hair); }
        break;
      case 'bucket': {
        const hat = '#c7b27a';
        capRows(ctx, hx, hy, hat, -6, -3);
        px(ctx, hx - 8, hy - 4, 17, 3, OUT); px(ctx, hx - 7, hy - 3, 15, 1, '#a8935c');
        px(ctx, hx - 5, hy - 5, 11, 1, '#8a7a4a');
        break;
      }
      case 'headphones':
        capRows(ctx, hx, hy, hair, -6, back ? 3 : -3);
        // vòng đeo ôm sát đỉnh đầu, hai đầu nối xuống tai
        px(ctx, hx - 5, hy - 9, 11, 3, OUT); px(ctx, hx - 4, hy - 8, 9, 1, '#4a4f63');
        px(ctx, hx - 8, hy - 7, 3, 4, OUT); px(ctx, hx + 6, hy - 7, 3, 4, OUT);
        px(ctx, hx - 7, hy - 7, 2, 1, '#4a4f63'); px(ctx, hx + 6, hy - 7, 2, 1, '#4a4f63');
        px(ctx, hx - 7, hy - 6, 1, 2, '#4a4f63'); px(ctx, hx + 7, hy - 6, 1, 2, '#4a4f63');
        if (side) { px(ctx, hx - 3, hy - 4, 6, 6, OUT); px(ctx, hx - 2, hy - 3, 4, 4, '#ff3d5a'); }
        else { px(ctx, hx - 9, hy - 4, 4, 6, OUT); px(ctx, hx + 6, hy - 4, 4, 6, OUT); px(ctx, hx - 8, hy - 3, 2, 4, '#ff3d5a'); px(ctx, hx + 7, hy - 3, 2, 4, '#ff3d5a'); }
        break;
      case 'helmet': // mũ bảo hiểm nửa đầu
        capRows(ctx, hx, hy, '#e8ecf5', -6, back ? 3 : -2);
        px(ctx, hx, hy - 6, 1, 4, '#d7263d');
        if (!back) { px(ctx, hx - 7, hy - 2, 2, 5, OUT); px(ctx, hx + 6, hy - 2, 2, 5, OUT); px(ctx, hx - 6, hy - 1, 1, 3, '#e8ecf5'); px(ctx, hx + 6, hy - 1, 1, 3, '#e8ecf5'); }
        px(ctx, hx - 4, hy - 5, 2, 1, '#ffffff');
        break;
      case 'cowboy': {
        const hat = '#8a5a2b';
        capRows(ctx, hx, hy, hair, -5, back ? 3 : -3);
        px(ctx, hx - 5, hy - 12, 11, 7, OUT); px(ctx, hx - 4, hy - 11, 9, 5, hat); px(ctx, hx, hy - 11, 1, 2, '#5e3b1a');
        px(ctx, hx - 4, hy - 7, 9, 1, '#3b2415');
        px(ctx, hx - 11, hy - 6, 23, 3, OUT); px(ctx, hx - 10, hy - 5, 21, 1, hat);
        px(ctx, hx - 11, hy - 7, 2, 1, OUT); px(ctx, hx + 10, hy - 7, 2, 1, OUT);
        break;
      }
      case 'santa':
        // mũ nhọn đổ nghiêng sang phải, quả bông ở chóp
        px(ctx, hx - 6, hy - 9, 12, 4, OUT); px(ctx, hx - 3, hy - 11, 9, 3, OUT); px(ctx, hx + 2, hy - 12, 6, 2, OUT);
        capRows(ctx, hx, hy, '#d7263d', -6, -3);
        px(ctx, hx - 5, hy - 8, 10, 3, '#d7263d'); px(ctx, hx - 2, hy - 10, 7, 2, '#d7263d'); px(ctx, hx + 3, hy - 11, 4, 1, '#d7263d');
        px(ctx, hx - 4, hy - 8, 3, 1, '#ff5a6e');
        disc(ctx, hx + 7, hy - 11, 2, OUT); disc(ctx, hx + 7, hy - 11, 1, '#f3ead7');
        px(ctx, hx - 7, hy - 4, 15, 3, OUT); px(ctx, hx - 6, hy - 3, 13, 1, '#f3ead7');
        break;
      case 'viking': {
        const metal = '#9aa3b5', bone = '#f3ead7';
        capRows(ctx, hx, hy, metal, -6, -2);
        px(ctx, hx - 6, hy - 3, 13, 1, '#6a7385'); px(ctx, hx, hy - 6, 1, 3, '#6a7385');
        // sừng cong: mọc từ hai bên mũ, vươn ra ngoài rồi chĩa lên
        const horn = [[6, -4], [7, -4], [7, -5], [8, -5], [8, -6], [9, -6], [9, -7], [9, -8], [9, -9]];
        for (const s of [-1, 1]) for (const [dx, dy] of horn) px(ctx, hx + s * dx - 1, hy + dy - 1, 3, 3, OUT);
        for (const s of [-1, 1]) for (const [dx, dy] of horn) px(ctx, hx + s * dx, hy + dy, 1, 1, bone);
        for (const s of [-1, 1]) px(ctx, hx + s * 6, hy - 4, 1, 1, '#c7bca8');
        px(ctx, hx - 3, hy - 5, 2, 1, '#ffffff');
        break;
      }
      case 'halo': {
        capRows(ctx, hx, hy, hair, -6, back ? 3 : -3);
        const y = hy - 11 + Math.round(Math.sin(anim * 3) * 1);
        ctx.globalCompositeOperation = 'lighter';
        ringFlat(ctx, hx, y, 6, 2, 'rgba(255,233,138,0.35)');
        ctx.globalCompositeOperation = 'source-over';
        ringFlat(ctx, hx, y, 5, 1.5, '#ffe98a');
        break;
      }
      case 'flamehair': {
        capRows(ctx, hx, hy, '#ff6a1f', -6, back ? 3 : -3);
        ctx.globalCompositeOperation = 'lighter';
        for (let i = -5; i <= 4; i += 2) {
          const h = 3 + ((i * 7 + Math.floor(anim * 12)) % 3 + 3) % 3;
          px(ctx, hx + i, hy - 6 - h, 2, h, 'rgba(255,106,31,0.9)');
          px(ctx, hx + i, hy - 6 - h, 1, 2, '#ffd23f');
        }
        disc(ctx, hx, hy - 7, 6, 'rgba(255,140,40,0.18)');
        ctx.globalCompositeOperation = 'source-over';
        break;
      }
      default: // classic: tóc ngắn + băng đô màu đội
        capRows(ctx, hx, hy, hair, -6, back ? 3 : -3);
        px(ctx, hx - 6, hy - 3, 13, 1, kit.accent);
    }
  }

  // phụ kiện mặt (chỉ vẽ khi nhìn về phía trước / ngang). cx, cy = tâm đầu đã lệch theo hướng nhìn
  function drawFace(ctx, face, hair, cx, cy, look = {}, fx = 0, fy = 1, anim = 0) {
    switch (face) {
      case 'blush':
        px(ctx, cx - 5, cy + 2, 2, 1, 'rgba(255,90,120,0.7)'); px(ctx, cx + 4, cy + 2, 2, 1, 'rgba(255,90,120,0.7)');
        break;
      case 'freckles':
        for (const [dx, dy] of [[-4, 2], [-3, 3], [-2, 2], [2, 2], [3, 3], [4, 2]]) px(ctx, cx + dx, cy + dy, 1, 1, '#a0643c');
        break;
      case 'beard':
        px(ctx, cx - 6, cy, 2, 3, hair); px(ctx, cx + 5, cy, 2, 3, hair);
        px(ctx, cx - 5, cy + 2, 11, 3, hair); px(ctx, cx - 3, cy + 5, 7, 1, hair);
        px(ctx, cx - 1, cy + 3, 2, 1, OUT);
        break;
      case 'nerd':
        px(ctx, cx - 5, cy - 2, 5, 5, OUT); px(ctx, cx + 1, cy - 2, 5, 5, OUT);
        px(ctx, cx - 4, cy - 1, 3, 3, 'rgba(210,235,255,0.55)'); px(ctx, cx + 2, cy - 1, 3, 3, 'rgba(210,235,255,0.55)');
        px(ctx, cx - 4, cy - 1, 1, 1, OUT); px(ctx, cx + 2, cy - 1, 1, 1, OUT);
        px(ctx, cx, cy - 1, 1, 1, OUT);
        break;
      case 'scar':
        for (let i = 0; i < 5; i++) px(ctx, cx + 1 + (i & 1), cy - 3 + i, 1, 1, '#b8323f');
        px(ctx, cx, cy - 1, 3, 1, '#b8323f');
        break;
      case 'clown':
        disc(ctx, cx, cy + 1, 2, OUT); disc(ctx, cx, cy + 1, 1, '#ff3d3d'); px(ctx, cx - 1, cy, 1, 1, '#ffffff');
        break;
      case 'goldtooth':
        px(ctx, cx - 2, cy + 3, 5, 2, OUT); px(ctx, cx - 1, cy + 3, 3, 1, '#f3ead7'); px(ctx, cx, cy + 3, 1, 1, '#ffd23f');
        break;
      case 'warpaint':
        for (const s of [-1, 1]) { px(ctx, cx + s * 4 - 1, cy + 1, 3, 1, '#ff3d5a'); px(ctx, cx + s * 4 - 1, cy + 3, 3, 1, '#f3ead7'); }
        break;
      case 'monocle':
        px(ctx, cx, cy - 2, 5, 5, '#ffd23f'); px(ctx, cx + 1, cy - 1, 3, 3, 'rgba(210,235,255,0.5)');
        px(ctx, cx + 2, cy, 1, 1, OUT);
        px(ctx, cx + 4, cy + 3, 1, 1, '#ffd23f'); px(ctx, cx + 5, cy + 4, 1, 2, '#ffd23f');
        break;
      case 'ninja':
        faceRows(ctx, cx, cy, '#262a36', 1, 6);
        px(ctx, cx - 6, cy - 4, 13, 2, '#262a36'); px(ctx, cx - 6, cy - 4, 13, 1, '#d7263d');
        break;
      case 'cyborg':
        px(ctx, cx, cy - 3, 6, 6, OUT); px(ctx, cx + 1, cy - 2, 4, 4, '#4a4f63');
        px(ctx, cx + 2, cy - 1, 2, 2, '#ff3d3d');
        ctx.globalCompositeOperation = 'lighter'; px(ctx, cx + 1, cy - 2, 4, 4, `rgba(255,60,60,${0.25 + 0.2 * Math.sin(anim * 8)})`); ctx.globalCompositeOperation = 'source-over';
        break;
      case 'skull':
        faceRows(ctx, cx, cy, '#e8ecf5', -4, 6);
        px(ctx, cx - 4, cy - 1, 3, 3, OUT); px(ctx, cx + 1, cy - 1, 3, 3, OUT);
        px(ctx, cx - 1, cy + 2, 2, 1, OUT);
        px(ctx, cx - 3, cy + 4, 7, 1, OUT); px(ctx, cx - 2, cy + 4, 1, 1, '#e8ecf5'); px(ctx, cx + 1, cy + 4, 1, 1, '#e8ecf5');
        break;
      case 'lasereyes': {
        px(ctx, cx - 4, cy - 1, 3, 3, '#ff2a2a'); px(ctx, cx + 1, cy - 1, 3, 3, '#ff2a2a');
        px(ctx, cx - 3, cy, 1, 1, '#ffffff'); px(ctx, cx + 2, cy, 1, 1, '#ffffff');
        ctx.globalCompositeOperation = 'lighter';
        const len = 10 + Math.round(Math.sin(anim * 20) * 2);
        for (const ex of [cx - 3, cx + 2]) for (let i = 2; i < len; i++) px(ctx, Math.round(ex + fx * i), Math.round(cy + fy * i * 0.6), 1, 1, `rgba(255,50,50,${0.9 - i / len * 0.7})`);
        px(ctx, cx - 5, cy - 2, 11, 5, 'rgba(255,40,40,0.18)');
        ctx.globalCompositeOperation = 'source-over';
        break;
      }
      case 'shades':
        px(ctx, cx - 5, cy - 1, 11, 3, OUT);
        px(ctx, cx - 4, cy - 1, 3, 2, '#2a3350'); px(ctx, cx + 1, cy - 1, 3, 2, '#2a3350');
        px(ctx, cx - 4, cy - 1, 1, 1, '#ffffff');
        break;
      case 'visor':
        px(ctx, cx - 5, cy - 2, 11, 4, OUT);
        px(ctx, cx - 4, cy - 1, 9, 2, '#3ff6ff');
        px(ctx, cx - 4, cy - 1, 9, 1, '#c8fdff');
        break;
      case 'mask':
        px(ctx, cx - 4, cy + 1, 9, 4, '#e8ecf5');
        px(ctx, cx - 3, cy + 2, 7, 1, '#c7cbd6');
        px(ctx, cx - 6, cy, 2, 1, '#e8ecf5'); px(ctx, cx + 5, cy, 2, 1, '#e8ecf5');
        break;
      case 'eyepatch':
        px(ctx, cx - 5, cy - 2, 5, 4, OUT);
        px(ctx, cx - 6, cy - 3, 13, 1, OUT);
        break;
      case 'mustache':
        px(ctx, cx - 3, cy + 2, 7, 1, hair);
        px(ctx, cx - 4, cy + 3, 1, 1, hair); px(ctx, cx + 4, cy + 3, 1, 1, hair);
        break;
      case 'bandaid':
        px(ctx, cx + 2, cy + 2, 3, 1, '#f0c080'); px(ctx, cx + 3, cy + 1, 1, 3, '#f0c080');
        break;
    }
  }

  // vẽ character đứng một mình (menu / shop / hồ sơ) — canvas nhỏ, CSS phóng to kiểu pixel
  // extra: ghi đè trạng thái vẽ (vd. { vx: 40 } = chạy, { atkType: 'shoot' | 'light', atkT } = tư thế ra đòn) — màn giới thiệu đội hình
  function drawAvatar(canvas, look, kit, t = 0, facing = Math.PI / 2, extra = null) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const g = { teams: [{ cfg: { kit } }], previewLook: look };
    const x = canvas.width / 2, y = canvas.height - 4;
    const behind = look.fx === 'shadow';
    if (behind) drawFxPreview(ctx, look.fx, x, y, t, g);
    drawPlayer(ctx, Object.assign({ x, y, vx: 0, vy: 0, facing, anim: t, flash: 0, state: 'normal', team: 0, look }, extra), g);
    if (!behind && look.fx && FX[look.fx]) drawFxPreview(ctx, look.fx, x, y, t, g);
  }

  /* ---------- cầu thủ ---------- */
  // p cần: x, y, vx, vy, facing, anim, team, role, look, state
  // tint = tô 1 màu thay áo đấu · ghost = bóng mờ (không găng / tư thế ra đòn / hào quang), mặc định bật khi có tint
  function drawPlayer(ctx, p, g, alpha = 1, tint = null, ghost = !!tint) {
    const team = g.teams[p.team];
    const kit = team.cfg.kit;
    const shirt = tint || kit.shirt;
    const shirtDark = tint || kit.shirtDark;
    const gloves = !ghost && p.keeper; // đứng trong vòng cấm nhà -> đeo găng thủ môn
    const x = Math.round(p.x), y0 = Math.round(p.y);
    const moving = Math.hypot(p.vx || 0, p.vy || 0) > 12;
    const step = moving ? Math.floor(p.anim * 12) % 2 : 0;
    const stunned = p.state === 'stun';
    const y = y0;
    const bob = moving && step ? -1 : 0;
    const fx = Math.cos(p.facing), fy = Math.sin(p.facing);
    // tay / chân ra đòn nằm ở phía hướng mặt (nhìn sang phải -> tay/chân phải)
    const side = fx >= 0 ? 1 : -1;
    const atk = !ghost && p.atkType ? attackPose(p) : null;

    ctx.globalAlpha = alpha;
    if (alpha >= 1) ellipse(ctx, x, y0 + 1, 6, 2.5, 'rgba(0,0,0,0.38)');
    // hiệu ứng Hào quang vàng: vầng sáng dưới chân
    if (!ghost && p.look.fx === 'aura') {
      ctx.globalCompositeOperation = 'lighter';
      ellipse(ctx, x, y0, 9, 4, `rgba(255,200,60,${0.25 + 0.12 * Math.sin((p.anim || 0) * 5)})`);
      ellipse(ctx, x, y0, 5, 2, 'rgba(255,240,150,0.3)');
      ctx.globalCompositeOperation = 'source-over';
    }

    // chân (đang đá: chỉ vẽ chân trụ, chân đá vẽ riêng)
    const l = step ? -1 : 0, r = step ? 0 : -1;
    const kickLeg = atk && atk.leg != null;
    if (atk && atk.shoot && Math.abs(fx) >= 0.5) {
      // tư thế sút (nhìn ngang): 2 chân chéo từ hông — chân sút -15° (ra trước, hơi chúc xuống), chân trụ -120° (chéo xuống ra sau)
      const kickH = side > 0 ? x + 1 : x - 3, supH = side > 0 ? x - 3 : x + 1;
      drawDiagLeg(ctx, supH, y - 5, -120, 6, side, p.look, kit, p.anim, side > 0 ? 0 : 1);
      drawDiagLeg(ctx, kickH, y - 5, -15, 7, side, p.look, kit, p.anim, side > 0 ? 1 : 0);
    } else if (atk && atk.shoot) {
      // tư thế sút (nhìn lên / xuống): chân trụ lùi 1px về sau đứng vững, chân sút (phía hướng mặt) đưa ra trước ~3px và nhấc khỏi đất
      // (quay lưng lên trên: đưa ra ít hơn + nhấc ít hơn để chân không bị thân che mất)
      const kickL = side > 0 ? x : x - 4, supL = side > 0 ? x - 4 : x;
      const lift = Math.abs(fy) > 0.7 ? 1 : 2;
      drawLeg(ctx, supL - Math.round(fx), y - Math.round(fy), p.look, p.anim, side > 0 ? 0 : 1);
      drawLeg(ctx, kickL + Math.round(fx * 3), y + Math.round(fy * (fy > 0 ? 2 : 1)) - lift, p.look, p.anim, side > 0 ? 1 : 0);
    } else {
      if (!(kickLeg && side < 0)) drawLeg(ctx, x - 4, y + l, p.look, p.anim, 0);
      if (!(kickLeg && side > 0)) drawLeg(ctx, x, y + r, p.look, p.anim, 1);
      if (kickLeg) drawKick(ctx, p, x, y, fx, fy, side, atk);
    }

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
    const diveArms = atk && atk.dive;
    // đổ người: tay vươn qua đầu vẽ sau phần đầu (bên dưới); ở đây chỉ bỏ 2 tay buông thõng
    if (diveArms) { /* xem sau phần đầu */ } else if (!(punchArm && side < 0)) { px(ctx, x - 6, by + 1 + arm, 2, 4, OUT); px(ctx, x - 6, by + 2 + arm, 1, 2, hand); }
    if (!diveArms && !(punchArm && side > 0)) { px(ctx, x + 4, by + 1 - arm, 2, 4, OUT); px(ctx, x + 5, by + 2 - arm, 1, 2, hand); }
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
    const back = fy < -0.35;
    const cut = p.look.cut || 'classic';
    if (cut === 'afro') { disc(ctx, hx, hy - 3, 10, OUT); disc(ctx, hx, hy - 3, 9, p.look.hair); }
    disc(ctx, hx, hy, 7, OUT);
    disc(ctx, hx, hy, 6, p.look.skin);
    // tóc / mũ (trang phục mua ở Shop)
    drawHair(ctx, cut, p.look.hair, kit, hx, hy, fx, fy, back, p.anim || 0);
    // má hồng / bóng đổ đầu
    px(ctx, hx - 5, hy + 3, 11, 1, 'rgba(0,0,0,0.12)');

    // đổ người: nhìn từ sườn, không vẽ mắt / mặt (đầu chỉ còn tóc + da)
    if (!back && !diveArms) {
      const ex = Math.round(fx * 2);
      const ey = fy > 0.4 ? 1 : 0;
      if (stunned) {
        px(ctx, hx - 4 + ex, hy + ey, 3, 1, OUT); px(ctx, hx + 1 + ex, hy + ey, 3, 1, OUT);
      } else {
        px(ctx, hx - 4 + ex, hy - 1 + ey, 3, 3, OUT); px(ctx, hx + 1 + ex, hy - 1 + ey, 3, 3, OUT);
        px(ctx, hx - 4 + ex, hy - 1 + ey, 1, 1, '#ffffff'); px(ctx, hx + 1 + ex, hy - 1 + ey, 1, 1, '#ffffff');
      }
      px(ctx, hx - 1 + ex, hy + 3 + ey, 2, 1, stunned ? OUT : 'rgba(20,12,22,0.6)');
      if (p.look.face) drawFace(ctx, p.look.face, p.look.hair, hx + ex, hy + ey, p.look, fx, fy, p.anim || 0);
    }

    if (diveArms) {
      // đổ người sang ngang (trục y): camera thấy sườn người — cánh tay trên vươn thẳng qua đầu, che mất mặt (phía sân);
      // nách + sườn áo lộ ở vai, găng tay ở cuối
      const ax = x + side * 2, top = by - 14;
      px(ctx, ax - 3, by - 1, 4, 3, shirtDark);                 // nách / sườn áo lộ ra dưới cánh tay
      px(ctx, ax - 2, top - 3, 5, by + 4 - top, OUT);           // cánh tay dày 3px (viền + da), đè lên đầu; chân tay liền vào áo (không viền đáy)
      px(ctx, ax - 1, top + 1, 3, by + 1 - top, p.look.skin);
      px(ctx, ax + (side > 0 ? 1 : -1), top + 1, 1, by + 1 - top, 'rgba(0,0,0,0.18)');   // bóng mép tay
      px(ctx, ax - 1, top - 2, 3, 3, hand);                     // găng: bằng bề ngang cánh tay
      px(ctx, ax - 1, top - 2, 1, 1, '#ffffff');
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

  /* ---------- bóng: skin (VFX Kit BL) ---------- */
  function drawBallSkin(ctx, b, x, by) {
    const t = (b.roll || 0) * 0.3, now = performance.now() / 1000;
    switch (b.skin) {
      case 'blackhole':
        ctx.globalCompositeOperation = 'lighter';
        disc(ctx, x, by, 7, 'rgba(157,123,255,0.35)');
        ctx.globalCompositeOperation = 'source-over';
        disc(ctx, x, by, 5, '#9d7bff'); disc(ctx, x, by, 4, '#07040c');
        px(ctx, x + Math.round(Math.cos(now * 8) * 5), by + Math.round(Math.sin(now * 8) * 3), 1, 1, '#ffffff');
        return true;
      case 'bomb': {
        disc(ctx, x, by, 4, OUT); disc(ctx, x, by, 3, '#262a36'); px(ctx, x - 2, by - 2, 1, 1, '#9aa3b5');
        px(ctx, x + 1, by - 5, 1, 2, '#c7a26a'); px(ctx, x + 2, by - 6, 1, 1, '#c7a26a');
        if (Math.floor(now * 12) % 2) { ctx.globalCompositeOperation = 'lighter'; px(ctx, x + 2, by - 8, 2, 2, '#ffd23f'); px(ctx, x + 3, by - 9, 1, 1, '#ff6a1f'); ctx.globalCompositeOperation = 'source-over'; }
        return true;
      }
      case 'fireball':
        ctx.globalCompositeOperation = 'lighter';
        disc(ctx, x, by, 8, 'rgba(255,90,20,0.35)'); disc(ctx, x, by, 6, 'rgba(255,160,40,0.55)');
        ctx.globalCompositeOperation = 'source-over';
        disc(ctx, x, by, 4, '#ffd9a0'); px(ctx, x - 1, by - 2, 2, 1, '#ffffff');
        return true;
      case 'light':
        ctx.globalCompositeOperation = 'lighter';
        disc(ctx, x, by, 7, 'rgba(255,225,120,0.3)');
        ctx.globalCompositeOperation = 'source-over';
        disc(ctx, x, by, 4, OUT); disc(ctx, x, by, 3, '#fff6c0'); px(ctx, x - 1, by - 2, 1, 1, '#ffffff');
        return true;
      case 'melon':
        disc(ctx, x, by, 5, OUT); disc(ctx, x, by, 4, '#2f8f2a');
        for (let i = -3; i <= 3; i += 2) px(ctx, x + i, by - 3 + Math.abs(i) / 2, 1, 6 - Math.abs(i), '#6bff4f');
        return true;
      case 'bowling':
        disc(ctx, x, by, 5, OUT); disc(ctx, x, by, 4, '#3b1a5a');
        px(ctx, x + Math.round(Math.cos(t) * 1.5), by - 1, 1, 1, '#07040c'); px(ctx, x + 2, by, 1, 1, '#07040c'); px(ctx, x, by + 1, 1, 1, '#07040c');
        px(ctx, x - 2, by - 3, 2, 1, '#9d7bff');
        return true;
      case 'wheel': {
        disc(ctx, x, by, 5, OUT); disc(ctx, x, by, 4, '#2a2630'); disc(ctx, x, by, 2, '#9aa3b5');
        for (let i = 0; i < 4; i++) { const a = t + (i * Math.PI) / 2; px(ctx, x + Math.round(Math.cos(a) * 3), by + Math.round(Math.sin(a) * 3), 1, 1, '#c7ccd6'); }
        px(ctx, x, by, 1, 1, '#ffffff');
        return true;
      }
      case 'cube': {
        const f = Math.floor(t) % 2;
        px(ctx, x - 4, by - 4, 8, 8, OUT); px(ctx, x - 3, by - 3, 6, 6, f ? '#ff3d5a' : '#3f8cff');
        px(ctx, x - 3, by - 3, 6, 1, 'rgba(255,255,255,0.5)'); px(ctx, x - 1, by - 1, 2, 2, f ? '#ffd23f' : '#9dff3d');
        return true;
      }
      case 'chicken':
        px(ctx, x - 4, by - 3, 8, 6, OUT); px(ctx, x - 3, by - 2, 6, 4, '#f3ead7');
        px(ctx, x + 3, by - 5, 3, 3, OUT); px(ctx, x + 3, by - 4, 2, 2, '#f3ead7'); px(ctx, x + 3, by - 6, 2, 1, '#d7263d');
        px(ctx, x + 5, by - 4, 2, 1, '#ff8a3f'); px(ctx, x + 4, by - 4, 1, 1, OUT);
        return true;
    }
    return false;
  }

  /* ---------- bóng ---------- */
  function drawBall(ctx, b, alpha = 1) {
    const x = Math.round(b.x), y = Math.round(b.y);
    const s = Math.max(1.2, 3.2 - b.z * 0.05);
    ctx.globalAlpha = alpha;
    ellipse(ctx, x, y + 1, s + 0.5, s * 0.5 + 0.3, 'rgba(0,0,0,0.4)');
    const by = Math.round(y - b.z - 3);
    const fx = b.fx || {};
    // VFX Kit BL: bóng đổi hình (lỗ đen, bom, cầu lửa, dưa hấu...)
    if (b.skin && drawBallSkin(ctx, b, x, by)) { ctx.globalAlpha = 1; return; }
    // Hoả Cầu: quả cầu lửa to gấp đôi, lửa bập bùng
    if (fx.fire) {
      const fl = Math.sin(performance.now() / 45) > 0 ? 1 : 0;
      ctx.globalCompositeOperation = 'lighter';
      disc(ctx, x, by, 10 + fl, 'rgba(255,70,20,0.3)'); disc(ctx, x, by, 8, 'rgba(255,140,40,0.5)'); disc(ctx, x, by - 1, 6, 'rgba(255,210,80,0.6)');
      for (let i = 0; i < 3; i++) px(ctx, x - 4 + Math.round(Math.random() * 8), by - 7 - Math.round(Math.random() * 4), 1, 2, Math.random() < 0.5 ? '#ffd23f' : '#ff6a1f');
      ctx.globalCompositeOperation = 'source-over';
      disc(ctx, x, by, 5, '#ffd9a0'); px(ctx, x - 2, by - 3, 2, 1, '#ffffff');
      ctx.globalAlpha = 1;
      return;
    }
    if (fx.fire || fx.thunder) {
      ctx.globalCompositeOperation = 'lighter';
      roundDisc(ctx, x, by, 6, fx.fire ? 'rgba(255,120,30,0.45)' : 'rgba(80,220,255,0.45)');
      ctx.globalCompositeOperation = 'source-over';
    }
    roundDisc(ctx, x, by, 4, OUT);
    roundDisc(ctx, x, by, 3, fx.fire ? '#ffd9a0' : fx.thunder ? '#d8fbff' : '#f4f4f4');
    px(ctx, x + 1, by + 1, 2, 2, '#c7c7d2');
    const a = (b.roll || 0) * 0.3;
    px(ctx, x + Math.round(Math.cos(a) * 1.6), by + Math.round(Math.sin(a) * 1.6), 1, 1, '#222');
    px(ctx, x - Math.round(Math.cos(a) * 1.6), by - Math.round(Math.sin(a) * 1.6), 1, 1, '#222');
    px(ctx, x - 1, by - 2, 1, 1, '#ffffff');
    ctx.globalAlpha = 1;
  }

  // icon costume trên ô item (hộp gacha / túi đồ): vẽ character mặc món đó rồi phóng to vùng liên quan
  // (tóc & mặt -> cái đầu, giày -> bàn chân, hiệu ứng -> cả người). Vùng cắt tính trên avatar 40x44.
  const ICON_CROP = { hair: [5, 6, 30, 30], face: [9, 13, 22, 22], shoes: [11, 33, 18, 9], fx: [4, 2, 32, 42] };
  let iconBuf = null;
  function drawItemIcon(canvas, look, kit, slot) {
    if (slot === 'shoes') {
      // giày: vẽ riêng đôi chân phóng to x3 cho dễ nhìn (bánh xe, đinh, lửa phụt dưới đế...)
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(Math.round((canvas.width - 39) / 2), Math.round((canvas.height - 39) / 2));
      ctx.scale(3, 3);
      drawLeg(ctx, 1, 9, look, 0.3, 0);
      drawLeg(ctx, 7, 9, look, 0.3, 1);
      ctx.restore();
      return;
    }
    iconBuf = iconBuf || document.createElement('canvas');
    iconBuf.width = 40; iconBuf.height = 44;
    drawAvatar(iconBuf, look, kit, 0.3, slot === 'shoes' ? 0 : Math.PI / 2);
    const [sx, sy, sw, sh] = ICON_CROP[slot] || ICON_CROP.fx;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const k = Math.max(1, Math.floor(Math.min(canvas.width / sw, canvas.height / sh) * 2) / 2);
    const w = sw * k, h = sh * k;
    ctx.drawImage(iconBuf, sx, sy, sw, sh, Math.round((canvas.width - w) / 2), Math.round((canvas.height - h) / 2), w, h);
  }

  SFC.Sprites = { OUT, px, disc, ellipse, ringPx, drawPlayer, drawBall, drawAvatar, drawItemIcon, FX, spawnFx, stepFx, drawFxParticle };
})();
