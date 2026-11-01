/* PlayerSprite · fx.js — Hiệu ứng trang phục (slot fx, 19 món) cho lưới 2x: Golden Aura (vẽ trong sprite, dưới chân) và hạt hiệu ứng khi chạy.
 * Hạt vẫn sinh / bay theo code của game (Sprites.spawnFx / stepFx, bảng Sprites.FX: toạ độ thế giới x, y, z), chỉ thay cách vẽ: drawFxParticle vẽ ở
 * lưới mịn (px mịn = nửa px thế giới), mỗi hiệu ứng 1 hình riêng theo q.k (lá, cánh hoa, bông tuyết, đồng xu xoay, nốt nhạc, bong bóng vỡ, lửa...)
 * thay cho ô vuông / dấu + 3 px của sprite cũ. Bóng Phantom (shape ghost) vẽ bằng drawPlayer 2x.
 * Nạp theo thứ tự trong scripts/manifest.js (classic script, không module): mỗi file gắn hàm vào SFC.PlayerSprite.
 */
window.SFC = window.SFC || {};

(function () {
  const Sprite = (SFC.PlayerSprite = SFC.PlayerSprite || {});
  const INK = Sprite.INK;
  const dot = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  // bản đồ chữ quanh (x, y) = ô (ox, oy) của bản đồ; màu theo bảng m
  function map(ctx, x, y, rows, m, ox = 0, oy = 0) {
    rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] !== '.') dot(ctx, x + i - ox, y + j - oy, 1, 1, m[r[i]] || r[i]); });
  }

  /* ---------- Golden Aura: quầng vàng dưới chân (luôn bật, cả lúc đứng) ---------- */
  // 3 dải elip px mịn cộng sáng (ngoài cùng chấm xen kẽ cho ra viền mờ kiểu pixel), phập phồng; cứ 1.2 s 1 vòng sáng loang từ chân ra rồi tắt;
  // 4 đốm vàng bốc lên từ mép quầng, mờ dần. Tâm theo trục sprite (px mịn X + 0.5), chân ở Y
  function ellipse(ctx, X, Y, rx, ry, c, every = 0) {
    for (let dy = -ry; dy <= ry; dy++) {
      const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / ry) * (dy / ry))));
      if (w <= 0) continue;
      if (!every) { dot(ctx, X - w + 1, Y + dy, 2 * w, 1, c); continue; }
      for (let x = -w + 1; x <= w; x++) if ((x + dy) % 2 === 0) dot(ctx, X + x, Y + dy, 1, 1, c);
    }
  }
  function ring(ctx, X, Y, rx, ry, c) {
    const n = Math.max(16, Math.round(rx * 4));
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; dot(ctx, X + Math.round(Math.cos(a) * rx), Y + Math.round(Math.sin(a) * ry), 1, 1, c); }
  }
  function drawAura(ctx, X, Y, anim) {
    const p = 0.5 + 0.5 * Math.sin(anim * 5);
    ctx.globalCompositeOperation = 'lighter';
    ellipse(ctx, X, Y, 20, 7, `rgba(255,190,50,${(0.22 + 0.1 * p).toFixed(3)})`, 1);
    ellipse(ctx, X, Y, 15, 5, `rgba(255,200,60,${(0.22 + 0.1 * p).toFixed(3)})`);
    ellipse(ctx, X, Y, 8, 3, `rgba(255,240,150,${(0.25 + 0.12 * p).toFixed(3)})`);
    const w = (anim / 1.2) % 1;   // vòng sáng loang
    ring(ctx, X, Y, Math.round(6 + w * 16), Math.round(2 + w * 6), `rgba(255,230,120,${(0.7 * (1 - w)).toFixed(3)})`);
    for (let i = 0; i < 4; i++) {   // đốm bốc lên
      const t = (anim * 0.8 + i / 4) % 1, a = i * 1.7 + Math.floor(anim * 0.8 + i / 4) * 2.3;
      dot(ctx, X + Math.round(Math.cos(a) * 14), Y + Math.round(Math.sin(a) * 4 - t * 18), 1, t < 0.5 ? 2 : 1, `rgba(255,236,140,${(0.9 * (1 - t)).toFixed(3)})`);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  /* ---------- hạt hiệu ứng khi chạy ---------- */
  // mỗi hình vẽ quanh tâm px mịn (x, y); k = phần đời còn lại (1 mới sinh -> 0 tắt), q = hạt (q.c màu, q.phase pha riêng, q.s cỡ cũ).
  // Cỡ bằng hạt cũ (3 px thế giới = 6 px mịn; bản đầu chỉ 3 px mịn trông thưa và nhạt), thêm chi tiết bên trong
  const HEART = ['.HH.HH.', 'HWWHHHh', 'HWHHHHh', 'HHHHHHh', '.HHHHh.', '..HHh..', '...h...'];
  const NOTE = ['...NNN', '...NNN', '...N.N', '...N..', '...N..', '.NNN..', 'NNNN..', '.NN...'];
  const BUBBLE = ['..ccc..', '.c...c.', 'c.WW..c', 'c.W...c', 'c.....c', '.c...c.', '..ccc..'];
  const LEAF = [['....LL', '..LLdL', '.LLdLL', 'LdLL..', 'L.....'], ['LL....', 'LdLL..', 'LLdLL.', '..LLdL', '.....L']];
  const PETAL = [['.pp.', 'pPPp', 'pPPp', '.p.p'], ['p.p.', 'pPPp', 'pPPp', '.pp.']];
  const FLAKE = ['..W..', 'W.c.W', '.ccc.', 'W.c.W', '..W..'];
  const FLAME = ['..c..', '.ccc.', 'cc0cc', 'c000c', 'c000c', '.c0c.'];
  const COIN = [
    ['..ddd..', '.dYYYd.', 'dWYYYYd', 'dWYcYYd', 'dYYYYYd', '.dYYYd.', '..ddd..'],
    ['.ddd.', 'dWYYd', 'dWYYd', 'dYcYd', 'dYYYd', 'dYYYd', '.ddd.'],
    ['.d.', 'dWd', 'dYd', 'dYd', 'dYd', 'dYd', '.d.'],
    ['d', 'Y', 'Y', 'Y', 'Y', 'Y', 'd'],
    ['.d.', 'dYd', 'dYd', 'dYd', 'dYd', 'dWd', '.d.'],
    ['.ddd.', 'dYYYd', 'dYYYd', 'dYcYd', 'dYYWd', 'dYYWd', '.ddd.'],
  ];
  const hash = (x, y) => (((x * 73856093) ^ (y * 19349663)) >>> 0);
  // 1 cục mây elip rx x ry quanh (x, y): C = [sáng, giữa, sẫm]; sáng ở góc trên trái, sẫm ở mép đáy; k < 0.45 thì bỏ dần px theo băm toạ độ (tan theo chấm)
  function puff(ctx, x, y, rx, ry, k, C) {
    if (rx < 1 || ry < 1) return;
    const keep = Math.min(1, k * 2.2);
    for (let dy = -ry; dy <= ry; dy++) for (let dx = -rx; dx <= rx; dx++) {
      const e = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
      if (e > 1 || (keep < 1 && (hash(x + dx, y + dy) % 100) / 100 > keep)) continue;
      dot(ctx, x + dx, y + dy, 1, 1, e > 0.6 && dy > ry * 0.3 ? C[2] : dx / rx + dy / ry < -0.6 ? C[0] : C[1]);
    }
  }
  const SHAPES = {
    // lấp lánh / băng / thiên hà: sao 4 cánh, cánh 2 px lúc mới sinh / sắp tắt, 3 px + chấm chéo lúc sáng nhất; tâm trắng 1 px, vòng trong sáng
    star(ctx, x, y, k, q) {
      const L = k > 0.75 || k < 0.25 ? 2 : 3, hi = Sprite.shade(q.c, -0.5);
      for (let i = 1; i <= L; i++) { const c = i === 1 ? hi : q.c; dot(ctx, x - i, y, 1, 1, c); dot(ctx, x + i, y, 1, 1, c); dot(ctx, x, y - i, 1, 1, c); dot(ctx, x, y + i, 1, 1, c); }
      if (L === 3) for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) dot(ctx, x + a, y + b, 1, 1, q.c);
      dot(ctx, x, y, 1, 1, '#ffffff');
    },
    // trái tim 7 x 7: chấm sáng trên trái, mép phải / đáy sẫm
    heart(ctx, x, y, k, q) { map(ctx, x, y, HEART, { H: q.c, W: '#ffffff', h: Sprite.shade(q.c, 0.3) }, 3, 3); },
    // nốt móc đơn 6 x 8: đầu nốt bầu dục nghiêng, thân, cờ đuôi
    note(ctx, x, y, k, q) { map(ctx, x, y, NOTE, { N: q.c }, 3, 4); },
    // bong bóng xà phòng 7 x 7: vòng rỗng, vệt sáng 3 px góc trên; cuối đời vỡ thành 4 giọt toả ra
    ring(ctx, x, y, k, q) {
      if (k > 0.12) { map(ctx, x, y, BUBBLE, { c: q.c, W: '#ffffff' }, 3, 3); return; }
      const d = 3 + Math.round((0.12 - k) * 30);
      for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) dot(ctx, x + a * d, y + b * d, 1, 1, q.c);
    },
    // đồng xu tròn 7 x 7 (user 2026-11-01: xu vuông -> tròn), xoay: tròn 7 -> elip 5 -> 3 -> cạnh 1 -> 3 -> 5; vành sẫm, mặt vàng, vệt sáng trái, dấu khắc giữa
    coin(ctx, x, y, k, q) {
      const f = COIN[Math.floor((1 - k) * 18 + q.phase * 2) % COIN.length];
      map(ctx, x, y, f, { d: '#a8800f', Y: q.c, W: '#fff6a0', c: '#c9a020' }, f[0].length >> 1, 3);
    },
    // tia điện 10 px: gấp khúc dày 2 px, lõi trắng, đầu mảnh
    bolt(ctx, x, y, k, q) {
      [[1, -5], [0, -4], [0, -3], [1, -2], [2, -1], [1, 0], [0, 1], [1, 2], [1, 3], [0, 4]].forEach(([a, b], i) => {
        dot(ctx, x + a, y + b, 2, 1, q.c);
        if (i > 1 && i < 8) dot(ctx, x + a, y + b, 1, 1, '#ffffff');
      });
    },
    // bóng Phantom: chính cầu thủ (sprite 2x) tô tím mờ dần — vẽ ngoài lưới mịn, xem drawFxParticle
  };
  // hình theo hiệu ứng (hạt shape 'px' của game): tên hiệu ứng -> hàm vẽ
  const KINDS = {
    // lá 6 x 5: lá xéo có gân sẫm, cuống; lật qua lại theo nhịp gió
    leaves(ctx, x, y, k, q) { map(ctx, x, y, LEAF[Math.sin((1 - k) * 9 + q.phase) > 0 ? 0 : 1], { L: q.c, d: Sprite.shade(q.c, 0.35) }, 3, 2); },
    // cánh hoa anh đào 4 x 4: viền nhạt, lòng đậm, khía ở đầu cánh; lật theo nhịp rơi
    petals(ctx, x, y, k, q) { map(ctx, x, y, PETAL[Math.sin((1 - k) * 7 + q.phase) > 0 ? 0 : 1], { p: q.c, P: '#ff8ac0' }, 2, 2); },
    // bông tuyết 5 x 5: lõi + 4 nhánh, đầu nhánh trắng (nửa số hạt là bông nhỏ 3 px)
    snow(ctx, x, y, k, q) {
      if (q.phase > 3) { dot(ctx, x - 1, y, 3, 1, q.c); dot(ctx, x, y - 1, 1, 3, q.c); dot(ctx, x, y, 1, 1, '#ffffff'); return; }
      map(ctx, x, y, FLAKE, { c: q.c, W: '#ffffff' }, 2, 2);
    },
    // khói (user 2026-11-01: phải ra khói, không phải từng hạt rời): mỗi hạt là 1 cụm mây (1 cục lớn + 2 cục nhỏ trên trái / phải) bán kính 3 -> 7 px (user: bản 6 -> 12 to quá; đời hạt rút còn 0.45 s trong Sprites.FX)
    // nở dần, các cụm chồng lên nhau thành 1 dải khói liền; sáng trên trái, sẫm đáy; cuối đời tan dần theo chấm (không mờ đều: mờ đều thì chỗ chồng đậm hơn, lộ mép)
    smoke(ctx, x, y, k, q) {
      const r = Math.round((3 + (1 - k) * 4) * (0.85 + 0.05 * q.phase)), C = ['#b2acb6', '#8e8894', '#6a6470'];
      puff(ctx, x, y, r, Math.round(r * 0.9), k, C);
      puff(ctx, x - Math.round(r * 0.6), y - Math.round(r * 0.5), Math.round(r * 0.6), Math.round(r * 0.55), k, C);
      puff(ctx, x + Math.round(r * 0.7), y - Math.round(r * 0.2), Math.round(r * 0.55), Math.round(r * 0.5), k, C);
    },
    // bụi đường: cụm bụi dẹt sát đất (1 cục + 1 cục nhỏ lệch bên), nở 4 -> 10 px, màu đất; tan dần theo chấm như khói
    dust(ctx, x, y, k, q) {
      const r = Math.round((4 + (1 - k) * 6) * (0.85 + 0.05 * q.phase)), C = ['#a89c8a', '#8a7f70', '#6e6458'];
      puff(ctx, x, y, r, Math.max(2, Math.round(r * 0.55)), k, C);
      puff(ctx, x + (q.phase > 3 ? 1 : -1) * Math.round(r * 0.8), y + 1, Math.round(r * 0.55), Math.max(1, Math.round(r * 0.35)), k, C);
    },
    // giấy hoa: mảnh 4 x 2 lật (ngang -> nghiêng -> dọc -> cạnh), mặt sau tối hơn, nhiều màu
    confetti(ctx, x, y, k, q) {
      const f = Math.floor((1 - k) * 18 + q.phase * 3) % 4, b = Sprite.shade(q.c, 0.3);
      if (f === 0) dot(ctx, x - 2, y - 1, 4, 2, q.c);
      else if (f === 2) dot(ctx, x - 1, y - 2, 2, 4, b);
      else if (f === 1) for (let i = -1; i <= 1; i++) dot(ctx, x + i, y + i, 2, 1, q.c);
      else dot(ctx, x - 2, y, 4, 1, b);
    },
    // vệt neon: khối 6 x 6 bo góc, lõi trắng 2 px; co về 4 rồi 2 px cuối đời
    neon(ctx, x, y, k, q) {
      const r = k > 0.6 ? 3 : k > 0.3 ? 2 : 1;
      dot(ctx, x - r + 1, y - r, 2 * r - 2 || 1, 2 * r, q.c); dot(ctx, x - r, y - r + 1, 2 * r, 2 * r - 2 || 1, q.c);
      if (r > 1) dot(ctx, x - 1 + (r > 2 ? 0 : 1), y - 1 + (r > 2 ? 0 : 1), r > 2 ? 2 : 1, r > 2 ? 2 : 1, Sprite.shade(q.c, -0.7));
    },
    // cầu vồng: dải 6 x 4 màu theo thứ tự, cạnh trên sáng, cạnh dưới sẫm
    rainbow(ctx, x, y, k, q) { dot(ctx, x - 3, y - 2, 6, 4, q.c); dot(ctx, x - 3, y - 2, 6, 1, Sprite.shade(q.c, -0.4)); dot(ctx, x - 3, y + 1, 6, 1, Sprite.shade(q.c, 0.25)); },
    // lửa: ngọn lửa 5 x 6 lõi vàng trắng; ngả cam rồi đỏ, co lại cuối đời
    fire(ctx, x, y, k, q) {
      const c = k > 0.6 ? '#ffb02e' : k > 0.3 ? '#ff6a1f' : '#d7261d', core = k > 0.6 ? '#fff6c0' : '#ffd23f';
      if (k < 0.25) { dot(ctx, x, y - 1, 1, 3, c); dot(ctx, x - 1, y, 3, 1, c); return; }
      map(ctx, x, y, FLAME, { c, 0: core }, 2, 4);
    },
  };
  // thay Sprites.drawFxParticle (renderer.cosmetics, xem trước trong menu): toạ độ thế giới của hạt -> vẽ ở lưới mịn
  function drawFxParticle(ctx, q, g, alpha = 1) {
    const k = Math.max(0, q.t / q.max);
    if (q.shape === 'ghost') {
      if (g && q.ghost) Sprite.drawPlayer(ctx, Object.assign({ x: q.x, y: q.y, vx: 0, vy: 0, state: 'normal', flash: 0 }, q.ghost), g, alpha * k * 0.45, q.c);
      return;
    }
    ctx.save();
    ctx.globalCompositeOperation = q.add ? 'lighter' : 'source-over';
    ctx.globalAlpha = q.k === 'smoke' || q.k === 'dust' ? alpha : alpha * Math.min(1, k * 1.6);   // khói / bụi tự tan theo chấm (puff)
    ctx.scale(0.5, 0.5);
    const x = Math.round(q.x * 2), y = Math.round((q.y - q.z) * 2), f = KINDS[q.k] || SHAPES[q.shape];
    if (f) f(ctx, x, y, k, q); else dot(ctx, x, y, 2 * (q.s || 1), 2 * (q.s || 1), q.c);
    ctx.restore();
  }

  Object.assign(Sprite, { drawAura, drawFxParticle, FX_SHAPES: SHAPES, FX_KINDS: KINDS });
})();
