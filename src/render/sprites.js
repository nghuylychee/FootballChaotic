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
  // bóng tròn pixel đường kính d (nguyên): d lẻ = tâm ở px (cx, cy), d chẵn = tâm ở góc giữa 4 px quanh (cx, cy). Hàng j rộng 2·round(√(R² − dy²))
  // (chẵn) / 2·round(...) + 1 (lẻ) -> cạnh trên / dưới giống cạnh trái / phải
  function ballDisc(ctx, cx, cy, d, c) {
    ctx.fillStyle = c;
    cx |= 0; cy |= 0;
    const R = d / 2, odd = d % 2;
    for (let j = 0; j < d; j++) {
      const dy = j + 0.5 - R, h = Math.sqrt(Math.max(0, R * R - dy * dy));
      const w = odd ? 2 * Math.round(h - 0.5) + 1 : 2 * Math.round(h);
      ctx.fillRect(cx - Math.floor(w / 2), cy - Math.floor(R) + j, w, 1);
    }
  }
  // bóng bẹp (fx.ball.squash): elip w x h px, cùng cách tô hàng như ballDisc
  function ballOval(ctx, cx, cy, w, h, c) {
    ctx.fillStyle = c;
    cx |= 0; cy |= 0;
    const A = w / 2, B = h / 2, odd = w % 2;
    for (let j = 0; j < h; j++) {
      const dy = (j + 0.5 - B) / B, hw = A * Math.sqrt(Math.max(0, 1 - dy * dy));
      const rw = odd ? 2 * Math.round(hw - 0.5) + 1 : 2 * Math.round(hw);
      ctx.fillRect(cx - Math.floor(rw / 2), cy - Math.floor(B) + j, rw, 1);
    }
  }
  // bóng vừa bị đá đi / vừa vào chân (tốc độ đổi đột ngột, chỉ ở máy vẽ — khách online cũng thấy vì vx / vy có trong snapshot):
  // trả về { ax: bẹt theo chiều ngang? } trong fx.ball.squash.time giây, không thì null. Trạng thái vẽ riêng (_sq*) trên chính quả bóng
  function ballSquash(b) {
    const S = (SFC_CONFIG.game.fx.ball || {}).squash;
    if (!S || !S.time) return null;
    const now = performance.now() / 1000, v = Math.hypot(b.vx || 0, b.vy || 0), dv = v - (b._sqV || 0);
    if (Math.abs(dv) > S.delta && now - (b._sqT || 0) > S.time * 2) {
      const vx = dv > 0 ? b.vx : b._sqVx || 0, vy = dv > 0 ? b.vy : b._sqVy || 0;
      b._sqT = now; b._sqAx = Math.abs(vx) >= Math.abs(vy);
    }
    b._sqV = v; b._sqVx = b.vx; b._sqVy = b.vy;
    return now - (b._sqT || 0) < S.time ? { ax: b._sqAx } : null;
  }
  // cỡ người (render.playerScale: Sprite v3 cao 31 thay 24 px). Đồ / VFX bám thân người viết theo người cũ:
  // ph(v) = khoảng cách dọc / cỡ theo người mới (v px ở người cũ)
  function pscale() { const R = SFC_CONFIG.game.render; return (R && R.playerScale) || 1; }
  function ph(v) { return Math.round(v * pscale()); }
  // vật thể vẽ thay / bọc cả người bằng code theo cỡ người cũ (King Kong, con gà, xe tải...): vẽ fn(c) vào đệm 1x quanh chân (x, y)
  // rồi phóng playerScale lần lấy mẫu điểm gần nhất (px không đều như Sprite v2 phóng, tới khi vẽ lại bản to). op: cách chép lên (lighter...)
  let scBuf = null;
  function scaled(ctx, x, y, fn, op) {
    const k = pscale();
    if (k === 1) return fn(ctx);
    if (!scBuf) { const cv = document.createElement('canvas'); cv.width = 192; cv.height = 192; scBuf = { cv, c: cv.getContext('2d'), ax: 96, ay: 140 }; }
    const B = scBuf, c = B.c, rx = Math.round(x), ry = Math.round(y);
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    c.clearRect(0, 0, B.cv.width, B.cv.height);
    c.setTransform(1, 0, 0, 1, B.ax - rx, B.ay - ry);
    c.globalAlpha = ctx.globalAlpha; c.imageSmoothingEnabled = false;
    const r = fn(c);
    ctx.save();
    ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = false;
    if (op) ctx.globalCompositeOperation = op;
    ctx.drawImage(B.cv, rx - B.ax * k, ry - B.ay * k, B.cv.width * k, B.cv.height * k);
    ctx.restore();
    return r;
  }
  // cỡ bóng khi vẽ (fx.ball.size = đường kính lõi; không có thì theo ball.radius)
  function ballSize() {
    const C = SFC_CONFIG.game;
    return (C.fx.ball && C.fx.ball.size) || C.ball.radius * 2 + 1;
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
    smoke:     { rate: 14, life: 0.45, colors: ['#6a6470', '#8a8490', '#524c58'], size: [2, 3], z: [0, 3], vz: [6, 12] },
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

  // xem trước hiệu ứng quanh character đứng yên (menu / shop / túi đồ): hạt lặp theo chu kỳ, không cần mô phỏng
  function drawFxPreview(ctx, kind, cx, fy, t, g) {
    const d = FX[kind];
    if (!d) return;
    const n = 9;
    for (let i = 0; i < n; i++) {
      const ph = (t / (d.life * 2.2) + i / n) % 1;
      const ang = i * 2.39;
      // k (loại hiệu ứng) + phase (pha riêng như spawnFx): PlayerSprite.drawFxParticle vẽ hình riêng theo loại (mây khói, lá lật, xu xoay...)
      const q = {
        k: kind, phase: ang % (Math.PI * 2),
        shape: d.shape || 'px', add: !!d.add, c: d.colors[i % d.colors.length], s: Math.round(rnd(d.size || 1)),
        x: cx + Math.sin(ang) * (8 + (i % 3) * 3), y: fy - 1,
        z: d.still ? rnd(d.z || 0) + (i % 4) * 3 : Math.max(0, (d.z ? d.z[0] : 0) + (d.vz ? (rnd(d.vz)) * ph : 0) + (d.vz && d.vz[0] < 0 ? 16 : 0)),
        t: (1 - ph) * d.life, max: d.life,
      };
      if (d.shape === 'ghost') {
        if (i > 1) break;
        Object.assign(q, { x: cx - 7 - i * 6, y: fy, ghost: { team: 0, look: g.previewLook, facing: 0, anim: t, role: 'FWD' }, t: d.life * (0.8 - i * 0.3) });
      }
      SFC.PlayerSprite.drawFxParticle(ctx, q, g);
    }
  }

  // vẽ character đứng một mình (menu / shop / hồ sơ) — canvas nhỏ, CSS phóng to kiểu pixel. Luôn người cỡ cũ (Sprite v2 24 px, small: true;
  // owner 2026-11-11: ngoài trận giữ cỡ cũ — khung 40 x 44 vừa mọi kiểu tóc / mũ, đứng cạnh NPC cỡ cũ ở KIT VAN / ??? / cut-scene)
  // extra: ghi đè trạng thái vẽ (vd. { vx: 40 } = chạy, { atkType: 'shoot' | 'light', atkT } = tư thế ra đòn) — màn giới thiệu đội hình
  function drawAvatar(canvas, look, kit, t = 0, facing = Math.PI / 2, extra = null) {
    const w = canvas.width, h = canvas.height, ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const g = { teams: [{ cfg: { kit } }], previewLook: look };
    const x = w / 2, y = h - 4;
    // xem trước động tác ăn mừng (túi đồ / mở hộp): extra = { celId, celT }
    if (extra && extra.celId && SFC.CelebrateDraw) {
      SFC.CelebrateDraw.draw(ctx, Object.assign({ x, y: h - 6, vx: 0, vy: 0, facing: Math.PI / 2, anim: t, flash: 0, state: 'normal', team: 0, look, preview: true, small: true }, extra), g);
    } else {
      const behind = look.fx === 'shadow';
      if (behind) drawFxPreview(ctx, look.fx, x, y, t, g);
      SFC.PlayerSprite.drawPlayer(ctx, Object.assign({ x, y, vx: 0, vy: 0, facing, anim: t, flash: 0, state: 'normal', team: 0, look, small: true }, extra), g);
      if (!behind && look.fx && FX[look.fx]) drawFxPreview(ctx, look.fx, x, y, t, g);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  /* ---------- bóng: skin (VFX Kit BL) ---------- */
  function drawBallSkin(ctx, b, x, by) {
    const t = (b.roll || 0) * 0.3, now = performance.now() / 1000;
    switch (b.skin) {
      case 'monster': {   // Panic Ball: bóng ma quái — mắt đỏ giận, răng nhọn, quầng xanh + đuôi khói
        ctx.globalCompositeOperation = 'lighter';
        disc(ctx, x, by, 8, 'rgba(127,231,255,0.3)');
        ctx.globalCompositeOperation = 'source-over';
        for (let i = 1; i <= 3; i++) px(ctx, x - i * 2 + Math.round(Math.sin(now * 20 + i) * 1), by + 3 + i, 2, 1, 'rgba(232,251,255,0.6)');
        disc(ctx, x, by, 5, OUT); disc(ctx, x, by, 4, '#e8fbff');
        px(ctx, x - 3, by - 3, 2, 1, OUT); px(ctx, x + 2, by - 3, 2, 1, OUT);                 // lông mày cau
        px(ctx, x - 3, by - 2, 2, 2, '#ff3d5a'); px(ctx, x + 2, by - 2, 2, 2, '#ff3d5a');     // mắt
        px(ctx, x - 2, by + 1, 5, 2, OUT); px(ctx, x - 2, by + 1, 1, 1, '#ffffff'); px(ctx, x, by + 1, 1, 1, '#ffffff'); px(ctx, x + 2, by + 1, 1, 1, '#ffffff');
        return true;
      }
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
      case 'ghost': {   // Vanishing Ball: tàng hình — chỉ còn vệt gợn sóng mờ (thủ môn đọc theo vệt này)
        const r = 4 + Math.sin(now * 30) * 1;
        ctx.globalAlpha *= 0.35;
        ctx.strokeStyle = '#d8d0e0'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(x, by, r, r * 0.8, 0, 0, Math.PI * 2); ctx.stroke();
        if (Math.floor(now * 20) % 2) px(ctx, x + Math.round(Math.sin(now * 17) * 3), by + Math.round(Math.cos(now * 13) * 2), 1, 1, '#ffffff');
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
  // ở px game nguyên như cầu thủ (PlayerSprite.drawPlayer)
  // bóng: lõi bán kính ball.radius (2 = 5 x 5 px) + viền mực 1 px. bare = không vẽ bóng đổ (Renderer vẽ đè bóng lần 2 khi bị che)
  function drawBall(ctx, b, alpha = 1, bare = false) {
    const r = Math.ceil(ballSize() / 2);
    drawBallAt(ctx, b, Math.round(b.x), Math.round(b.y), Math.round(b.y - b.z - r), alpha, bare);
  }
  // (x, by) = tâm bóng, y = mặt đất
  function drawBallAt(ctx, b, x, y, by, alpha, bare) {
    const d = ballSize(), r = d / 2, k = Math.max(0.5, r / 3.5), s = Math.max(1.2, (3.2 - b.z * 0.05) * k);
    ctx.globalAlpha = alpha;
    if (!bare) ellipse(ctx, x, y + 1, s + 0.5, s * 0.5 + 0.3, 'rgba(0,0,0,0.4)');
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
      ballDisc(ctx, x, by, d + 6, fx.fire ? 'rgba(255,120,30,0.45)' : 'rgba(80,220,255,0.45)');
      ctx.globalCompositeOperation = 'source-over';
    }
    // bóng bẹp lúc chạm chân (fx.ball.squash): dài thêm 2 px theo hướng bay, mỏng đi 2 px, không vẽ chấm lăn
    const sq = !bare && d >= 5 ? ballSquash(b) : null;
    if (sq) {
      const w = sq.ax ? d + 2 : d - 2, h = sq.ax ? d - 2 : d + 2;
      ballOval(ctx, x, by, w + 2, h + 2, OUT);
      ballOval(ctx, x, by, w, h, fx.fire ? '#ffd9a0' : fx.thunder ? '#d8fbff' : '#f4f4f4');
      ctx.globalAlpha = 1;
      return;
    }
    ballDisc(ctx, x, by, d + 2, OUT);
    ballDisc(ctx, x, by, d, fx.fire ? '#ffd9a0' : fx.thunder ? '#d8fbff' : '#f4f4f4');
    if (d % 2 === 0 && d >= 6) {
      // lõi chẵn (tâm giữa 2 px, lõi từ x - d/2 tới x + d/2 - 1): bóng tối dưới phải, 2 chấm lăn quanh tâm, 1 chấm sáng trên trái
      px(ctx, x, by + 1, 2, 1, '#c7c7d2'); px(ctx, x + 1, by, 1, 1, '#c7c7d2');
      const a = (b.roll || 0) * 0.3, cx = Math.cos(a) * 1.5, cy = Math.sin(a) * 1.5;
      px(ctx, Math.floor(x + cx), Math.floor(by + cy), 1, 1, '#222');
      px(ctx, Math.floor(x - cx), Math.floor(by - cy), 1, 1, '#222');
      px(ctx, x - 2, by - 2, 1, 1, '#ffffff');
    } else if (r >= 3) {
      px(ctx, x + 1, by + 1, 2, 2, '#c7c7d2');
      const a = (b.roll || 0) * 0.3;
      px(ctx, x + Math.round(Math.cos(a) * 1.6), by + Math.round(Math.sin(a) * 1.6), 1, 1, '#222');
      px(ctx, x - Math.round(Math.cos(a) * 1.6), by - Math.round(Math.sin(a) * 1.6), 1, 1, '#222');
      px(ctx, x - 1, by - 2, 1, 1, '#ffffff');
    } else if (r >= 2) {
      // bóng nhỏ: 1 góc tối dưới phải + 1 chấm lăn (đổi chỗ theo roll) -> vẫn thấy bóng đang lăn
      px(ctx, x + 1, by + 1, 1, 1, '#c7c7d2');
      const a = (b.roll || 0) * 0.3;
      px(ctx, x + Math.round(Math.cos(a)), by + Math.round(Math.sin(a)), 1, 1, '#2a2a33');
    }
    ctx.globalAlpha = 1;
  }

  // icon costume trên ô item (hộp gacha / túi đồ): vẽ character mặc món đó rồi phóng to vùng liên quan
  // (tóc & mặt -> cái đầu, giày -> bàn chân nhìn chéo cho thấy mũi + đồ quanh đế, hiệu ứng -> cả người). Vùng cắt tính trên avatar 40x44;
  // phóng số nguyên lần (phóng lẻ thì px không đều)
  // avatar ngoài trận là người cỡ cũ (v2): mặt cắt từ hàng 14
  const ICON_CROP = { hair: [5, 6, 30, 30], face: [10, 14, 20, 20], shoes: [10, 36, 20, 8], fx: [4, 2, 32, 42] };
  let iconBuf = null;
  function drawItemIcon(canvas, look, kit, slot) {
    const cw = canvas.width, ch = canvas.height, ctx = canvas.getContext('2d');
    iconBuf = iconBuf || document.createElement('canvas');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, cw, ch);
    if (slot === 'cel' && SFC.CelebrateDraw) {
      // động tác ăn mừng: character đứng đúng khoảnh khắc đặc trưng của động tác (CelebrateDraw.iconT), cả người
      iconBuf.width = 48; iconBuf.height = 52;
      drawAvatar(iconBuf, look, kit, 0.3, Math.PI / 2, { celId: look.cel, celT: SFC.CelebrateDraw.iconT(look.cel), icon: true });
      ctx.drawImage(iconBuf, Math.round((cw - 48) / 2), ch - 50);
      return;
    }
    iconBuf.width = 40; iconBuf.height = 44;
    drawAvatar(iconBuf, look, kit, 0.3, slot === 'shoes' ? Math.PI / 4 : Math.PI / 2);
    const [sx, sy, sw, sh] = ICON_CROP[slot] || ICON_CROP.fx;
    const k = Math.max(1, Math.floor(Math.min(cw / sw, ch / sh)));
    const w = sw * k, h = sh * k;
    ctx.drawImage(iconBuf, sx, sy, sw, sh, Math.round((cw - w) / 2), Math.round((ch - h) / 2), w, h);
  }

  // người chơi + hạt trang phục vẽ bằng Sprite v2 (SFC.PlayerSprite, src/render/player, nạp sau file này; sprite cũ đã xoá 2026-11-01)
  const spritePlayer = (...a) => SFC.PlayerSprite.drawPlayer(...a), spriteFx = (...a) => SFC.PlayerSprite.drawFxParticle(...a);
  SFC.Sprites = { OUT, px, disc, ellipse, ringPx, ballSize, ph, pscale, scaled, drawPlayer: spritePlayer, drawBall, drawAvatar, drawItemIcon, FX, spawnFx, stepFx, drawFxParticle: spriteFx };
})();
