/* PlayerSprite · fx.js — Hiệu ứng trang phục (slot fx, 19 món): Golden Aura (vẽ trong sprite, dưới chân) và hạt hiệu ứng khi chạy.
 * Hạt vẫn sinh / bay theo code của game (Sprites.spawnFx / stepFx, bảng Sprites.FX: toạ độ thế giới x, y, z), chỉ thay cách vẽ: drawFxParticle vẽ ở
 * px game (user 2026-11-04 bỏ nửa px), mỗi hiệu ứng 1 hình riêng theo q.k (lá, cánh hoa, bông tuyết, đồng xu xoay, nốt nhạc, bong bóng vỡ, lửa...)
 * thay cho ô vuông / dấu + 3 px của sprite cũ. Bóng Phantom (shape ghost) vẽ bằng drawPlayer.
 * Nạp theo thứ tự trong scripts/manifest.js (classic script, không module): mỗi file gắn hàm vào SFC.PlayerSprite.
 */
window.SFC = window.SFC || {};

(function () {
  const Sprite = (SFC.PlayerSprite = SFC.PlayerSprite || {});
  const dot = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  // bản đồ chữ quanh (x, y) = ô (ox, oy) của bản đồ; màu theo bảng m
  function map(ctx, x, y, rows, m, ox = 0, oy = 0) {
    rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] !== '.') dot(ctx, x + i - ox, y + j - oy, 1, 1, m[r[i]] || r[i]); });
  }

  /* ---------- Golden Aura: quầng vàng dưới chân (luôn bật, cả lúc đứng) ---------- */
  // 3 dải elip ô game cộng sáng, ngoài cùng nhạt nhất (chấm xen kẽ ở ô game thành bàn cờ thô), phập phồng; cứ 1.2 s 1 vòng sáng loang từ chân ra rồi tắt;
  // 4 đốm vàng bốc lên từ mép quầng, mờ dần. X, Y = gốc sprite (px game); tâm = ô 0 (trục lật của sprite), chân ở hàng 0
  function drawAura(ctx, X, Y, anim) {
    const cell = (x, y, w, h, c) => dot(ctx, X + x, Y + y, w, h, c);
    const ellipse = (rx, ry, c) => {
      for (let dy = -ry; dy <= ry; dy++) { const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / (ry + 0.5)) ** 2))); cell(-w, dy, 2 * w + 1, 1, c); }
    };
    const ring = (rx, ry, c) => {
      const n = Math.max(16, rx * 8), seen = new Set();
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2, x = Math.round(Math.cos(a) * rx), y = Math.round(Math.sin(a) * ry), k = x + ',' + y;
        if (!seen.has(k)) { seen.add(k); cell(x, y, 1, 1, c); }   // mỗi ô 1 lần: cộng sáng 2 lần thì ô sáng hơn
      }
    };
    const p = 0.5 + 0.5 * Math.sin(anim * 5);
    ctx.globalCompositeOperation = 'lighter';
    ellipse(10, 3, `rgba(255,190,50,${(0.1 + 0.05 * p).toFixed(3)})`);
    ellipse(7, 2, `rgba(255,200,60,${(0.22 + 0.1 * p).toFixed(3)})`);
    ellipse(4, 1, `rgba(255,240,150,${(0.25 + 0.12 * p).toFixed(3)})`);
    const w = (anim / 1.2) % 1;   // vòng sáng loang
    ring(Math.round(3 + w * 8), Math.round(1 + w * 3), `rgba(255,230,120,${(0.7 * (1 - w)).toFixed(3)})`);
    for (let i = 0; i < 4; i++) {   // đốm bốc lên
      const t = (anim * 0.8 + i / 4) % 1, a = i * 1.7 + Math.floor(anim * 0.8 + i / 4) * 2.3;
      cell(Math.round(Math.cos(a) * 7), Math.round(Math.sin(a) * 2 - t * 9), 1, 1, `rgba(255,236,140,${(0.9 * (1 - t)).toFixed(3)})`);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  /* ---------- hạt hiệu ứng khi chạy ---------- */
  // mỗi hình vẽ quanh ô (x, y) (px game); k = phần đời còn lại (1 mới sinh -> 0 tắt), q = hạt (q.c màu, q.phase pha riêng, q.s cỡ cũ).
  // Cỡ bằng hạt cũ (3 px game), thêm chi tiết bên trong
  const HEART = ['HH.HH', 'HWHHh', '.HHh.', '..h..'];
  const NOTE = ['.NN', '.N.', 'NN.', 'NN.'];
  const BUBBLE = ['.cc.', 'cW.c', 'c..c', '.cc.'];
  const LEAF = [['.LL', 'LdL', 'L..'], ['LL.', 'LdL', '..L']];
  const PETAL = [['pP.', '.Pp'], ['.Pp', 'pP.']];
  const FLAKE = ['.W.', 'WcW', '.W.'];
  const FLAME = ['.c.', '.cc', 'c0c', 'ccc'];
  const BOLT = ['.cc', 'cc.', '.Wc', 'cc.', 'c..'];
  // đồng xu xoay: tròn 4 -> elip 3 -> cạnh 1 -> elip 3 (mặt kia)
  const COIN = [['.dd.', 'dWYd', 'dYYd', '.dd.'], ['.d.', 'dWd', 'dYd', '.d.'], ['d', 'Y', 'Y', 'd'], ['.d.', 'dYd', 'dWd', '.d.']];
  const hash = (x, y) => (((x * 73856093) ^ (y * 19349663)) >>> 0);
  // 1 cục mây elip rx x ry quanh (x, y): C = [sáng, giữa, sẫm]; sáng ở góc trên trái, sẫm ở mép đáy; k < 0.45 thì bỏ dần ô theo băm toạ độ (tan theo chấm)
  function puff(ctx, x, y, rx, ry, k, C) {
    if (rx < 1 || ry < 1) return;
    const keep = Math.min(1, k * 2.2);
    for (let dy = -ry; dy <= ry; dy++) for (let dx = -rx; dx <= rx; dx++) {
      const e = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
      if (e > 1 || (keep < 1 && (hash(x + dx, y + dy) % 100) / 100 > keep)) continue;
      dot(ctx, x + dx, y + dy, 1, 1, e > 0.6 && dy > ry * 0.3 ? C[2] : dx / rx + dy / ry < -0.6 ? C[0] : C[1]);
    }
  }
  const cellOf = (v) => Math.max(1, Math.round(v));   // cỡ (px game, số thực) -> số ô, ít nhất 1
  const SHAPES = {
    // lấp lánh / băng / thiên hà: sao 4 cánh, cánh 1 ô lúc mới sinh / sắp tắt, 2 ô lúc sáng nhất; tâm trắng, ô trong sáng
    star(ctx, x, y, k, q) {
      const L = k > 0.75 || k < 0.25 ? 1 : 2, hi = Sprite.shade(q.c, -0.5);
      for (let i = 1; i <= L; i++) { const c = i === 1 ? hi : q.c; dot(ctx, x - i, y, 1, 1, c); dot(ctx, x + i, y, 1, 1, c); dot(ctx, x, y - i, 1, 1, c); dot(ctx, x, y + i, 1, 1, c); }
      dot(ctx, x, y, 1, 1, '#ffffff');
    },
    // trái tim 5 x 4: chấm sáng trên trái, mép phải / đáy sẫm
    heart(ctx, x, y, k, q) { map(ctx, x, y, HEART, { H: q.c, W: '#ffffff', h: Sprite.shade(q.c, 0.3) }, 2, 2); },
    // nốt móc đơn 3 x 4: đầu nốt 2 x 2, thân, cờ đuôi
    note(ctx, x, y, k, q) { map(ctx, x, y, NOTE, { N: q.c }, 1, 2); },
    // bong bóng xà phòng 4 x 4: vòng rỗng, chấm sáng góc trên; cuối đời vỡ thành 4 giọt toả ra
    ring(ctx, x, y, k, q) {
      if (k > 0.12) { map(ctx, x, y, BUBBLE, { c: q.c, W: '#ffffff' }, 2, 2); return; }
      const d = 2 + Math.round((0.12 - k) * 15);
      for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) dot(ctx, x + a * d, y + b * d, 1, 1, q.c);
    },
    // đồng xu tròn (user 2026-11-01: xu vuông -> tròn), xoay: vành sẫm, mặt vàng, chấm sáng trái
    coin(ctx, x, y, k, q) {
      const f = COIN[Math.floor((1 - k) * 12 + q.phase * 2) % COIN.length];
      map(ctx, x, y, f, { d: '#a8800f', Y: q.c, W: '#fff6a0' }, f[0].length >> 1, 2);
    },
    // tia điện 3 x 5: gấp khúc liền cạnh (chỉ chạm góc thì trông như chấm rời), lõi trắng
    bolt(ctx, x, y, k, q) { map(ctx, x, y, BOLT, { c: q.c, W: '#ffffff' }, 1, 2); },
    // bóng Phantom: chính cầu thủ tô tím mờ dần, xem drawFxParticle
  };
  // hình theo hiệu ứng (hạt shape 'px' của game): tên hiệu ứng -> hàm vẽ
  const KINDS = {
    // lá 3 x 3: lá xéo có gân sẫm; lật qua lại theo nhịp gió
    leaves(ctx, x, y, k, q) { map(ctx, x, y, LEAF[Math.sin((1 - k) * 9 + q.phase) > 0 ? 0 : 1], { L: q.c, d: Sprite.shade(q.c, 0.35) }, 1, 1); },
    // cánh hoa anh đào 3 x 2 xéo: đầu nhạt, lòng đậm; lật theo nhịp rơi
    petals(ctx, x, y, k, q) { map(ctx, x, y, PETAL[Math.sin((1 - k) * 7 + q.phase) > 0 ? 0 : 1], { p: q.c, P: '#ff8ac0' }, 1, 1); },
    // bông tuyết 3 x 3: lõi + 4 nhánh trắng (nửa số hạt là bông nhỏ 1 ô)
    snow(ctx, x, y, k, q) {
      if (q.phase > 3) { dot(ctx, x, y, 1, 1, '#ffffff'); return; }
      map(ctx, x, y, FLAKE, { c: q.c, W: '#ffffff' }, 1, 1);
    },
    // khói (user 2026-11-01: phải ra khói, không phải từng hạt rời): mỗi hạt là 1 cụm mây (1 cục lớn + 2 cục nhỏ trên trái / phải) bán kính 2 -> 4 ô
    // (user: 3 -> 6 ô to quá; đời hạt rút còn 0.45 s trong Sprites.FX). Nở dần, các cụm chồng lên nhau thành 1 dải khói liền; sáng trên trái, sẫm đáy;
    // cuối đời tan dần theo chấm (không mờ đều: mờ đều thì chỗ chồng đậm hơn, lộ mép)
    smoke(ctx, x, y, k, q) {
      const r = (1.5 + (1 - k) * 2) * (0.85 + 0.05 * q.phase), C = ['#b2acb6', '#8e8894', '#6a6470'];
      puff(ctx, x, y, cellOf(r), cellOf(r * 0.9), k, C);
      puff(ctx, x - cellOf(r * 0.6), y - cellOf(r * 0.5), cellOf(r * 0.6), cellOf(r * 0.55), k, C);
      puff(ctx, x + cellOf(r * 0.7), y - Math.round(r * 0.2), cellOf(r * 0.55), cellOf(r * 0.5), k, C);
    },
    // bụi đường: cụm bụi dẹt sát đất (1 cục + 1 cục nhỏ lệch bên), nở 2 -> 5 ô, màu đất; tan dần theo chấm như khói
    dust(ctx, x, y, k, q) {
      const r = (2 + (1 - k) * 3) * (0.85 + 0.05 * q.phase), C = ['#a89c8a', '#8a7f70', '#6e6458'];
      puff(ctx, x, y, cellOf(r), cellOf(r * 0.55), k, C);
      puff(ctx, x + (q.phase > 3 ? 1 : -1) * cellOf(r * 0.8), y, cellOf(r * 0.55), cellOf(r * 0.35), k, C);
    },
    // giấy hoa: mảnh 2 x 1 lật (ngang -> nghiêng -> dọc -> cạnh), mặt sau tối hơn, nhiều màu
    confetti(ctx, x, y, k, q) {
      const f = Math.floor((1 - k) * 18 + q.phase * 3) % 4, b = Sprite.shade(q.c, 0.3);
      if (f === 0) dot(ctx, x - 1, y, 2, 1, q.c);
      else if (f === 2) dot(ctx, x, y - 1, 1, 2, b);
      else if (f === 1) { dot(ctx, x - 1, y - 1, 1, 1, q.c); dot(ctx, x, y, 1, 1, q.c); }
      else dot(ctx, x, y, 1, 1, b);
    },
    // vệt neon: chữ thập 3 x 3 lõi trắng; co về 2 x 2 rồi 1 ô cuối đời
    neon(ctx, x, y, k, q) {
      if (k > 0.6) { dot(ctx, x - 1, y, 3, 1, q.c); dot(ctx, x, y - 1, 1, 3, q.c); dot(ctx, x, y, 1, 1, Sprite.shade(q.c, -0.7)); }
      else if (k > 0.3) dot(ctx, x, y, 2, 2, q.c);
      else dot(ctx, x, y, 1, 1, q.c);
    },
    // cầu vồng: dải 3 x 2 màu theo thứ tự, hàng trên sáng
    rainbow(ctx, x, y, k, q) { dot(ctx, x - 1, y, 3, 1, q.c); dot(ctx, x - 1, y - 1, 3, 1, Sprite.shade(q.c, -0.4)); },
    // lửa: ngọn lửa 3 x 4 lõi vàng trắng; ngả cam rồi đỏ, còn 1 ô cuối đời
    fire(ctx, x, y, k, q) {
      const c = k > 0.6 ? '#ffb02e' : k > 0.3 ? '#ff6a1f' : '#d7261d', core = k > 0.6 ? '#fff6c0' : '#ffd23f';
      if (k < 0.25) { dot(ctx, x, y, 1, 1, c); return; }
      map(ctx, x, y, FLAME, { c, 0: core }, 1, 2);
    },
  };
  // thay Sprites.drawFxParticle (renderer.cosmetics, xem trước trong menu): toạ độ thế giới của hạt -> ô game
  function drawFxParticle(ctx, q, g, alpha = 1) {
    const k = Math.max(0, q.t / q.max);
    if (q.shape === 'ghost') {
      if (g && q.ghost) Sprite.drawPlayer(ctx, Object.assign({ x: q.x, y: q.y, vx: 0, vy: 0, state: 'normal', flash: 0 }, q.ghost), g, alpha * k * 0.45, q.c);
      return;
    }
    ctx.save();
    ctx.globalCompositeOperation = q.add ? 'lighter' : 'source-over';
    ctx.globalAlpha = q.k === 'smoke' || q.k === 'dust' ? alpha : alpha * Math.min(1, k * 1.6);   // khói / bụi tự tan theo chấm (puff)
    const x = Math.round(q.x), y = Math.round(q.y - q.z), f = KINDS[q.k] || SHAPES[q.shape];
    if (f) f(ctx, x, y, k, q); else dot(ctx, x, y, q.s || 1, q.s || 1, q.c);
    ctx.restore();
  }

  Object.assign(Sprite, { drawAura, drawFxParticle, FX_SHAPES: SHAPES, FX_KINDS: KINDS });
})();
