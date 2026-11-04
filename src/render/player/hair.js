/* PlayerSprite · hair.js — Tóc / mũ (slot hair, 24 món + AURA FARMING) trên đầu A. Vẽ lại từng kiểu (bản đầu chuyển từ drawHair của sprite 1x cũ, đã xoá); duyệt hết 2026-11-01.
 * Nạp theo thứ tự trong scripts/manifest.js (classic script, không module): mỗi file gắn hàm vào SFC.PlayerSprite.
 */
window.SFC = window.SFC || {};

(function () {
  const Sprite = (SFC.PlayerSprite = SFC.PlayerSprite || {});
  const { HEAD_A, INK, discW, rectW, stamp } = Sprite;
  const OUT = INK;
  // Đầu A (15 x 13, hàng -25..-13 tính từ gốc đầu Yh) khớp gần đúng đầu tròn bán kính 7 của sprite hôm nay: tâm đầu cũ (hy) = hàng 6 của đầu A
  // (thế giới -19). Code drawHair cũ (đã xoá) chạy nguyên ở toạ độ thế giới tính từ tâm đó (px / disc -> rectW / discW), chỉ đổi:
  //  capRows (tô đỉnh đầu trong vòng tròn bán kính 6, hàng dy0..dy1) -> cap: tô các ô trong viền của đầu A (đầu hói) hàng dy + 6 -> khớp đúng hình đầu mới.
  // Kiểu classic (mặc định) vẫn là đầu A đã duyệt (tóc 2 hàng + băng đô màu đội), không qua đây.
  const HY = -19;
  // đầu hói (vẽ trước kiểu tóc): tóc / băng đô / nút buộc của đầu A thành da
  const BALD = {};
  for (const k of ['front', 'back', 'bdiag']) BALD[k] = Object.assign({}, HEAD_A[k], { rows: HEAD_A[k].rows.map((r) => r.replace(/[HB]/g, 'S').replace(/b/g, 's')) });
  // chéo lên (bdiag, user 2026-11-03; hình nhìn phải): dải má lộ ra bên hướng mặt (body.js)
  const CHEEK = Sprite.BDIAG_CHEEK;
  // tô ô trong viền của đầu hói, hàng dy0..dy1 (dy tính từ tâm cũ: hàng đầu A = dy + 6)
  function cap(ctx, X, Y, back, c, d0, d1) {
    const head = BALD[back ? 'back' : 'front'];
    for (let dy = d0; dy <= d1; dy++) {
      const r = dy + 6, row = head.rows[r];
      if (!row) continue;
      for (let i = 0; i < row.length; i++) if (row[i] !== '.' && row[i] !== 'K') rectW(ctx, X, Y, false, head.x + i, head.y + r, 1, 1, c);
    }
  }
  // vòng tròn pixel rỗng dẹt (vòng thánh)
  function ring(ctx, X, Y, cx, cy, rx, ry, c) {
    const n = Math.max(12, rx * 6);
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; rectW(ctx, X, Y, false, Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), 1, 1, c); }
  }

  function cutDraw(ctx, X, Y, cut, hair, kit, fx, fy, back, anim = 0) {
    const hx = 0, hy = HY, px = (x, y, w, h, c) => rectW(ctx, X, Y, false, x, y, w, h, c), disc = (x, y, r, c) => discW(ctx, X, Y, x, y, r, c);
    const capRows = (c, d0, d1) => cap(ctx, X, Y, back, c, d0, d1), ringFlat = (x, y, rx, ry, c) => ring(ctx, X, Y, x, y, rx, ry, c);
    const side = Math.abs(fx) > 0.5 ? Math.sign(fx) : 0; // nhìn sang trái / phải
    switch (cut) {
      case 'buzz':
        capRows(hair, -6, back ? 2 : -4);
        break;
      case 'spiky':
        capRows(hair, -6, back ? 3 : -3);
        for (const sx of [-5, -2, 1, 4]) {
          px(sx < 0 ? hx + sx - 1 : hx + sx, hy - 10, 3, 4, OUT);
          px(hx + sx, hy - 9, 1, 3, hair); px(hx + sx + (sx < 0 ? 0 : 0), hy - 7, 2, 1, hair);
        }
        break;
      case 'mohawk':
        capRows('rgba(20,12,22,0.28)', -6, back ? 2 : -4); // hai bên cạo sát
        if (side) { px(hx - 6, hy - 11, 13, 5, OUT); px(hx - 5, hy - 10, 11, 4, hair); }
        else { px(hx - 2, hy - 12, 5, 9, OUT); px(hx - 1, hy - 11, 3, 8, hair); }
        break;
      case 'afro':
        capRows(hair, -6, back ? 3 : -4);
        break;
      case 'cap': {
        const cap = '#262a36', brim = '#161923';
        capRows(cap, -6, -2);
        if (back) px(hx - 2, hy - 3, 5, 1, kit.accent); // quai sau
        else if (side) { px(side > 0 ? hx + 3 : hx - 10, hy - 4, 8, 3, OUT); px(side > 0 ? hx + 4 : hx - 9, hy - 3, 6, 1, brim); }
        else { px(hx - 7, hy - 3, 15, 3, OUT); px(hx - 6, hy - 2, 13, 1, brim); }
        if (!back) px(hx - 1 + side * 2, hy - 5, 2, 2, kit.accent); // logo
        break;
      }
      case 'beanie':
        capRows('#d7263d', -6, -2);
        px(hx - 6, hy - 3, 13, 2, '#ff5a6e');
        disc(hx, hy - 8, 3, OUT); disc(hx, hy - 8, 2, '#f3ead7');
        break;
      case 'bandana':
        capRows(hair, -6, back ? 3 : -4);
        px(hx - 6, hy - 4, 13, 2, '#d7263d');
        px(hx - 4, hy - 4, 1, 1, '#ffffff'); px(hx + 2, hy - 3, 1, 1, '#ffffff');
        if (side) { px(hx - side * 9, hy - 4, 3, 1, '#d7263d'); px(hx - side * 10, hy - 3, 2, 1, '#a81d30'); }
        else if (back) px(hx - 1, hy - 5, 3, 3, '#a81d30'); // nút buộc
        break;
      case 'crown':
        capRows(hair, -6, back ? 3 : -3);
        px(hx - 5, hy - 8, 11, 4, OUT);
        for (const sx of [-4, 0, 4]) { px(hx + sx - 1, hy - 11, 3, 4, OUT); px(hx + sx, hy - 10, 1, 3, '#ffd23f'); }
        px(hx - 4, hy - 7, 9, 2, '#ffd23f');
        px(hx, hy - 7, 1, 1, '#ff3d5a');
        break;
      case 'bowl': // mái bằng
        capRows(hair, -6, back ? 3 : -2);
        if (!back) px(hx - 6, hy - 2, 13, 1, 'rgba(0,0,0,0.25)');
        break;
      case 'bun':
        capRows(hair, -6, back ? 3 : -4);
        disc(hx, hy - 8, 3, OUT); disc(hx, hy - 8, 2, hair);
        px(hx - 2, hy - 6, 5, 1, kit.accent);
        break;
      case 'longhair': // tóc dài buộc đuôi ngựa
        capRows(hair, -6, back ? 4 : -3);
        if (side) { px(hx - side * 9 - 1, hy - 4, 4, 8, OUT); px(hx - side * 9, hy - 3, 2, 6, hair); }
        else if (back) { px(hx - 2, hy + 2, 5, 7, OUT); px(hx - 1, hy + 3, 3, 5, hair); }
        else { px(hx - 8, hy - 4, 3, 8, OUT); px(hx + 6, hy - 4, 3, 8, OUT); px(hx - 7, hy - 3, 1, 6, hair); px(hx + 7, hy - 3, 1, 6, hair); }
        break;
      case 'bucket': {
        const hat = '#c7b27a';
        capRows(hat, -6, -3);
        px(hx - 8, hy - 4, 17, 3, OUT); px(hx - 7, hy - 3, 15, 1, '#a8935c');
        px(hx - 5, hy - 5, 11, 1, '#8a7a4a');
        break;
      }
      case 'headphones':
        capRows(hair, -6, back ? 3 : -3);
        // vòng đeo ôm sát đỉnh đầu, hai đầu nối xuống tai
        px(hx - 5, hy - 9, 11, 3, OUT); px(hx - 4, hy - 8, 9, 1, '#4a4f63');
        px(hx - 8, hy - 7, 3, 4, OUT); px(hx + 6, hy - 7, 3, 4, OUT);
        px(hx - 7, hy - 7, 2, 1, '#4a4f63'); px(hx + 6, hy - 7, 2, 1, '#4a4f63');
        px(hx - 7, hy - 6, 1, 2, '#4a4f63'); px(hx + 7, hy - 6, 1, 2, '#4a4f63');
        if (side) { px(hx - 3, hy - 4, 6, 6, OUT); px(hx - 2, hy - 3, 4, 4, '#ff3d5a'); }
        else { px(hx - 9, hy - 4, 4, 6, OUT); px(hx + 6, hy - 4, 4, 6, OUT); px(hx - 8, hy - 3, 2, 4, '#ff3d5a'); px(hx + 7, hy - 3, 2, 4, '#ff3d5a'); }
        break;
      case 'helmet': // mũ bảo hiểm nửa đầu
        capRows('#e8ecf5', -6, back ? 3 : -2);
        px(hx, hy - 6, 1, 4, '#d7263d');
        if (!back) { px(hx - 7, hy - 2, 2, 5, OUT); px(hx + 6, hy - 2, 2, 5, OUT); px(hx - 6, hy - 1, 1, 3, '#e8ecf5'); px(hx + 6, hy - 1, 1, 3, '#e8ecf5'); }
        px(hx - 4, hy - 5, 2, 1, '#ffffff');
        break;
      case 'cowboy': {
        const hat = '#8a5a2b';
        capRows(hair, -5, back ? 3 : -3);
        px(hx - 5, hy - 12, 11, 7, OUT); px(hx - 4, hy - 11, 9, 5, hat); px(hx, hy - 11, 1, 2, '#5e3b1a');
        px(hx - 4, hy - 7, 9, 1, '#3b2415');
        px(hx - 11, hy - 6, 23, 3, OUT); px(hx - 10, hy - 5, 21, 1, hat);
        px(hx - 11, hy - 7, 2, 1, OUT); px(hx + 10, hy - 7, 2, 1, OUT);
        break;
      }
      case 'santa':
        // mũ nhọn đổ nghiêng sang phải, quả bông ở chóp
        px(hx - 6, hy - 9, 12, 4, OUT); px(hx - 3, hy - 11, 9, 3, OUT); px(hx + 2, hy - 12, 6, 2, OUT);
        capRows('#d7263d', -6, -3);
        px(hx - 5, hy - 8, 10, 3, '#d7263d'); px(hx - 2, hy - 10, 7, 2, '#d7263d'); px(hx + 3, hy - 11, 4, 1, '#d7263d');
        px(hx - 4, hy - 8, 3, 1, '#ff5a6e');
        disc(hx + 7, hy - 11, 2, OUT); disc(hx + 7, hy - 11, 1, '#f3ead7');
        px(hx - 7, hy - 4, 15, 3, OUT); px(hx - 6, hy - 3, 13, 1, '#f3ead7');
        break;
      case 'viking': {
        const metal = '#9aa3b5', bone = '#f3ead7';
        capRows(metal, -6, -2);
        px(hx - 6, hy - 3, 13, 1, '#6a7385'); px(hx, hy - 6, 1, 3, '#6a7385');
        // sừng cong: mọc từ hai bên mũ, vươn ra ngoài rồi chĩa lên
        const horn = [[6, -4], [7, -4], [7, -5], [8, -5], [8, -6], [9, -6], [9, -7], [9, -8], [9, -9]];
        for (const s of [-1, 1]) for (const [dx, dy] of horn) px(hx + s * dx - 1, hy + dy - 1, 3, 3, OUT);
        for (const s of [-1, 1]) for (const [dx, dy] of horn) px(hx + s * dx, hy + dy, 1, 1, bone);
        for (const s of [-1, 1]) px(hx + s * 6, hy - 4, 1, 1, '#c7bca8');
        px(hx - 3, hy - 5, 2, 1, '#ffffff');
        break;
      }
      case 'halo': {
        capRows(hair, -6, back ? 3 : -3);
        const y = hy - 11 + Math.round(Math.sin(anim * 3) * 1);
        ctx.globalCompositeOperation = 'lighter';
        ringFlat(hx, y, 6, 2, 'rgba(255,233,138,0.35)');
        ctx.globalCompositeOperation = 'source-over';
        ringFlat(hx, y, 5, 1.5, '#ffe98a');
        break;
      }
      case 'ward_trophy': { // cúp Ward Cup (FOOTBALL STORY): nồi cơm méo sơn vàng đội trên đầu
        const G = '#ffd23f', GD = '#c9a020', GL = '#fff3a8';
        capRows(hair, -6, back ? 3 : -4);
        px(hx - 7, hy - 11, 15, 8, OUT);
        px(hx - 6, hy - 10, 13, 6, G);
        px(hx - 6, hy - 5, 13, 1, GD);
        px(hx - 8, hy - 12, 17, 2, OUT); px(hx - 7, hy - 12, 15, 1, GL);   // miệng nồi
        if (!side) { px(hx - 9, hy - 9, 2, 3, OUT); px(hx + 8, hy - 9, 2, 3, OUT); px(hx - 9, hy - 8, 1, 1, G); px(hx + 9, hy - 8, 1, 1, G); }   // 2 quai
        else px(side > 0 ? hx - 9 : hx + 8, hy - 9, 2, 3, OUT);
        if (!back) { px(hx - 4 + side * 2, hy - 9, 2, 3, GL); px(hx + 2 + side, hy - 8, 2, 1, GD); }   // bóng sáng + vết méo
        break;
      }
      case 'moon_cap': { // mũ Rooftop Night League (FOOTBALL STORY): mũ lưỡi trai xanh đêm, trăng khuyết vàng
        const cap = '#1e2a50', brim = '#141a30';
        capRows(cap, -6, -2);
        if (back) px(hx - 2, hy - 3, 5, 1, '#ffd23f');
        else if (side) { px(side > 0 ? hx + 3 : hx - 10, hy - 4, 8, 3, OUT); px(side > 0 ? hx + 4 : hx - 9, hy - 3, 6, 1, brim); }
        else { px(hx - 7, hy - 3, 15, 3, OUT); px(hx - 6, hy - 2, 13, 1, brim); }
        if (!back) { const mx = hx - 1 + side * 2; px(mx, hy - 6, 2, 3, '#ffd23f'); px(mx + 1, hy - 7, 1, 1, '#ffd23f'); px(mx + 1, hy - 5, 1, 1, cap); }
        break;
      }
      case 'lantern_hat': { // mũ Night Market Cup (FOOTBALL STORY): đèn lồng giấy đỏ đội trên đầu
        capRows(hair, -6, back ? 3 : -4);
        px(hx - 6, hy - 15, 13, 10, OUT);
        px(hx - 5, hy - 14, 11, 8, '#e8322a');
        px(hx - 3, hy - 13, 3, 5, '#ff7a5a');                         // chỗ sáng
        px(hx - 1, hy - 14, 1, 8, '#b81e1a'); px(hx + 2, hy - 14, 1, 8, '#b81e1a');   // nan
        px(hx - 4, hy - 15, 9, 1, '#ffd23f'); px(hx - 4, hy - 6, 9, 1, '#ffd23f');    // viền vàng
        px(hx, hy - 17, 1, 2, '#ffd23f');
        break;
      }
      case 'laurel': { // vòng nguyệt quế Grandpa's Legends (FOOTBALL STORY): lá vàng ôm quanh đầu
        const G = '#ffd23f', GD = '#c9a020';
        capRows(hair, -6, back ? 3 : -4);
        const leaf = (x, y, c) => { px(x - 1, y - 1, 3, 3, OUT); px(x, y, 2, 1, c); };
        if (side) {
          for (let k = 0; k < 5; k++) leaf(hx - side * 5 + side * k * 2, hy - 5 - (k % 2), k % 2 ? G : GD);
        } else {
          for (let k = 0; k < 4; k++) { leaf(hx - 7 + k * 2, hy - 3 - k, k % 2 ? G : GD); leaf(hx + 6 - k * 2, hy - 3 - k, k % 2 ? G : GD); }
          if (!back) px(hx, hy - 8, 1, 1, '#fff3a8');
        }
        break;
      }
      case 'flamehair': {
        capRows('#ff6a1f', -6, back ? 3 : -3);
        ctx.globalCompositeOperation = 'lighter';
        for (let i = -5; i <= 4; i += 2) {
          const h = 3 + ((i * 7 + Math.floor(anim * 12)) % 3 + 3) % 3;
          px(hx + i, hy - 6 - h, 2, h, 'rgba(255,106,31,0.9)');
          px(hx + i, hy - 6 - h, 1, 2, '#ffd23f');
        }
        disc(hx, hy - 7, 6, 'rgba(255,140,40,0.18)');
        ctx.globalCompositeOperation = 'source-over';
        break;
      }
      case 'aura': {   // AURA FARMING: tóc vàng dựng ngược kiểu siêu xay-da (mọi kiểu tóc / mũ đều bị thay)
        const lit = '#fff6b0', dark = '#d9a514', flick = Math.floor(anim * 10) % 2;
        // chỏm nhọn: [lệch x, cao, nghiêng]
        const spikes = [[-6, 5, -1], [-3, 8, 0], [0, 10 + flick, 0], [3, 8, 0], [6, 5, 1]];
        for (const pass of [0, 1]) {
          for (const [sx, h, lean] of spikes) {
            for (let k = 0; k < h; k++) {
              const w = k < h * 0.45 ? 3 : k < h * 0.8 ? 2 : 1, ox = hx + sx + Math.round(lean * k * 0.4) - (w > 1 ? 1 : 0);
              if (pass === 0) px(ox - 1, hy - 6 - k - 1, w + 2, 3, OUT);
              else px(ox, hy - 6 - k, w, 1, k > h * 0.6 ? lit : hair);
            }
          }
        }
        capRows(hair, -6, back ? 3 : -3);
        if (!back) { px(hx - 4, hy - 3, 2, 2, hair); px(hx + 2, hy - 3, 2, 2, hair); px(hx - 1, hy - 2, 2, 2, hair); }   // tóc mái nhọn rủ xuống trán
        px(hx - 4, hy - 6, 3, 1, lit); px(hx + 2, hy - 4, 3, 1, dark);
        break;
      }
      default: // classic: tóc ngắn + băng đô màu đội
        capRows(hair, -6, back ? 3 : -3);
        px(hx - 6, hy - 3, 13, 1, kit.accent);
    }
  }

  /* ---------- vẽ lại theo đợt (user 2026-11-01: "đừng rụt rè giữ bản chuyển thẳng, vẽ tóc tham vọng hơn") ----------
   * Mỗi kiểu = các lớp bản đồ ô (lưới thế giới, toạ độ tính từ gốc đầu như HEAD_A: đầu chiếm x -7..7, y -25..-13; mắt y -19..-17, miệng -15).
   * Lớp: { x, y, rows, ink, under }: ink = tự viền mực quanh khối (4 hướng, như tay chân) nhưng không viền lên mặt (tóc mái chạm thẳng da như
   * băng đô của đầu A); ink false = lớp phẳng (lấm tấm tóc cạo). under = vẽ trước đầu (tóc xù, đuôi tóc sau gáy).
   * Ký tự: H tóc · h tóc tối · L tóc sáng · z tóc cạo (pha tóc + da) · A màu phụ của đội · '.' trống; kiểu nào cần thêm màu thì khai pal riêng.
   * Hướng: front (xuống, chéo xuống khi |fx| ≤ 0.5), side (ngang / chéo: hình nhìn phải, lật khi nhìn trái; thiếu thì dùng front), back. */
  const { shade } = Sprite;
  const mix = (a, b, t) => { const p = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); const A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  // vòng tròn tóc xù: mép gợn thành 7 búi rộng (~4 ô mỗi búi: bông như mây; búi hẹp thì thành ô lẻ chĩa ra), chấm sáng xoăn ở nửa trên trái
  function afroRows(r, cx, cy) {
    const rows = [];
    for (let y = -r - 1; y <= r + 1; y++) {
      let row = '';
      for (let x = -r - 1; x <= r + 1; x++) {
        const d = Math.hypot(x, y), rr = r - 0.7 + (Math.cos(Math.atan2(y, x) * 7 + 0.4) > 0.1 ? 1 : 0);
        row += d > rr ? '.' : (x + y < -r * 0.6 && (x * 3 + y * 5) % 4 === 0) ? 'L' : ((x * 5 + y * 3) % 7 === 0 ? 'h' : 'H');
      }
      rows.push(row);
    }
    return { x: cx - r - 1, y: cy - r - 1, rows };
  }
  // hàng đối xứng: chỉ vẽ nửa trái (ký tự cuối = cột giữa), lật ra nửa phải
  const sym = (rows) => rows.map((r) => r + r.slice(0, -1).split('').reverse().join(''));
  // tóc sau gáy dưới mũ (x -6..6, y -24..-16): mũ nào nhìn sau lưng cũng lộ tóc dưới vành
  const BACK_HAIR = ['...HHHHHHH...', '.HHHHHHHHHHH.', 'HHHHHHHHHHHHH', 'HHHhHHHHHhHHH', 'HHHHHHHHHHHHH', 'HHHHHhHHHHHHH', 'HHHHHHHHHHHHH', 'hHHHHHHHHHHHh', '.hHHHHHHHHHh.'];
  // tóc lửa (x -7..7 từ y -30): chân tóc đỏ (chấm cam), hàng cuối đỏ thẫm; 5 lưỡi lửa rộng 2 mọc từ đỉnh chân tóc, cao 2..4 đổi theo anim,
  // đầu lưỡi nhọn 1 ô vàng nhạt, dưới vàng rồi cam
  function flames(anim, back) {
    const W = 15, top = -30, bottom = back ? -16 : -21, f = Math.floor(anim * 10), g = [];
    for (let y = top; y <= bottom; y++) g.push(Array(W).fill('.'));
    const put = (x, y, c) => { const r = g[y - top]; if (r && x >= 0 && x < W) r[x] = c; };
    // chân tóc nằm trong viền đầu (rộng bằng đầu thì viền mực lòi ra ngoài đầu 1 ô = ô lẻ, user)
    const span = (y) => (y === -25 ? [5, 9] : y === -24 ? [3, 11] : y === -23 ? [2, 12] : y === -21 && !back ? null : y === -16 ? [2, 12] : [1, 13]);
    for (let y = -25; y <= bottom; y++) {
      const sp = span(y);
      if (!sp) continue;   // nhìn trước: không có tóc mai (2 ô lẻ cạnh đầu, user)
      for (let x = sp[0]; x <= sp[1]; x++) put(x, y, y === bottom ? 'r' : (x * 2 + y) % 5 === 0 ? 'O' : 'R');
    }
    const baseTop = (x) => { for (let y = -25; y <= bottom; y++) { const sp = span(y); if (sp && x >= sp[0] && x <= sp[1]) return y; } return -21; };
    for (let i = 0; i < 5; i++) {
      const c = 1 + i * 3, h = 2 + ((i * 2 + f) % 3);
      for (const x of [c, c + 1]) {
        const b = baseTop(x);
        for (let k = 0; k < h; k++) {
          if (k === h - 1 && x !== c + (i % 2)) continue;   // đầu lưỡi nhọn 1 ô
          put(x, b - 1 - k, k === h - 1 ? 'Y' : k === h - 2 ? 'F' : 'O');
        }
      }
    }
    return g.map((r) => r.join(''));
  }
  // tóc AURA FARMING theo ảnh tham khảo tóc Goku siêu xay-da của user (2026-11-01): các chỏm to hình lá xoè lên như ngọn lửa, chỏm giữa cao nhất (11 ô trên
  // đỉnh đầu), 3 cặp chỏm thấp dần ngả ra ngoài, 2 chỏm rủ xuống cạnh tai, 3 lọn mái to rủ xuống trán. Mỗi chỏm là 1 tam giác (đỉnh, chân trái, chân phải)
  // tô ô theo tâm ô; tô sáng mép trái (Y), vàng giữa (H), tối mép phải (h). Gộp tất cả thành 1 khối 1 viền (user: không nét mực giữa các chỏm).
  // Chỏm giữa cao thêm 1 ô ở nhịp chẵn (10 / s). Thứ tự: khối tóc đỉnh đầu, chỏm ngoài -> trong, chỏm rủ, mái
  function spike(t, l, r) {
    const side = (p, q, c) => (p[0] - c[0]) * (q[1] - c[1]) - (q[0] - c[0]) * (p[1] - c[1]);
    const inside = (x, y) => { const q = [x, y], d1 = side(q, t, l), d2 = side(q, l, r), d3 = side(q, r, t); return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)); };
    const X0 = Math.floor(Math.min(t[0], l[0], r[0])), X1 = Math.ceil(Math.max(t[0], l[0], r[0])), Y0 = Math.floor(Math.min(t[1], l[1], r[1])), Y1 = Math.ceil(Math.max(t[1], l[1], r[1]));
    const rows = [];
    for (let y = Y0; y <= Y1; y++) {
      const xs = [];
      for (let x = X0; x <= X1; x++) if (inside(x, y + 0.5) || (x === Math.round(t[0]) && y === Math.round(t[1]))) xs.push(x);
      let row = '';
      for (let x = X0; x <= X1; x++) {
        if (!xs.includes(x)) { row += '.'; continue; }
        const k = xs.length < 2 ? 0.5 : (x - xs[0]) / (xs[xs.length - 1] - xs[0]);
        row += k < 0.34 ? 'Y' : k > 0.75 ? 'h' : 'H';
      }
      rows.push(row);
    }
    return { x: X0, y: Y0, rows, ink: true };
  }
  // tam giác đối xứng qua cột giữa (ô x <-> -x)
  const mirror = (t, l, r) => [[-t[0], t[1]], [-r[0], r[1]], [-l[0], l[1]]];
  function auraLayers(anim, back) {
    const fl = Math.floor(anim * 10) % 2;
    const L = [];
    // khối tóc đỉnh đầu (rộng bằng đầu, phủ tới chân tóc; sau lưng phủ tới gáy)
    L.push({ x: -8, y: -27, ink: true, rows: [
      '.....HHHHHHH.....',
      '...HHHHHHHHHHH...',
      '..HHHHHHHHHHHHH..',
      '.HHHHHHHHHHHHHHH.',
      '.HHHHHHHHHHHHHHH.',
      '.hHHHHHHHHHHHHHh.'].concat(back ? ['.HHHHHHHHHHHHHHH.', '.HHHHHHHHHHHHHHH.', '.HHHHHHHHHHHHHHH.', '.HHHHHHHHHHHHHHH.', '.HHHHHHHHHHHHHHH.', '..HHHHHHHHHHHHH..'] : []) });   // sau lưng: tóc lót tới gáy (-16) sau các lọn -> đầu lọn chỉ gợn 1 ô ở mép dưới (khe hẹp giữa lọn thành vệt mực đen)
    // chỏm: ngoài cùng (ngả ra ngoài nhiều) -> trong; cặp nào cũng có bản lật
    // (user: bỏ bớt tóc chĩa ra 2 bên: không còn chỏm nằm ngang ngoài cùng và chỏm rủ cạnh tai)
    const pairs = [
      [[-9, -32], [-9, -23], [-4, -26]],
      [[-5, -35], [-7, -25], [-1, -26]],
    ];
    for (const sp of pairs) { L.push(spike(...sp)); L.push(spike(...mirror(...sp))); }
    L.push(spike([0, -36 - fl], [-3, -25], [3, -25]));   // chỏm giữa
    // sau lưng (user: khối chữ nhật lạ): 5 lọn chĩa xuống trong viền đầu (sáng trái / tối phải như chỏm), đầu lọn dừng trên gáy -> mép dưới gợn, không thò xuống
    if (back) for (const cx of [-5, -2.5, 0, 2.5, 5]) L.push(spike([Math.round(cx), -15], [cx - 2.5, -24], [cx + 2.5, -24]));
    if (!back) {   // mái: 3 lọn to rủ xuống trán (đầu lọn dừng trên mắt). Sau lưng: không có chỏm chĩa xuống ở gáy (user)
      for (const sp of [[[-4, -20], [-7, -24], [-1, -24]], [[1, -20], [-2, -24], [3, -24]], [[5, -20], [2, -24], [7, -23]]]) L.push(spike(...sp));
    }
    return [merge(L)];
  }
  // gộp các lớp thành 1 khối (user: tóc 1 khối, không nét mực giữa các chỏm): lớp sau đè ô lớp trước, viền 1 lần quanh cả khối
  function merge(Ls) {
    const m = new Map();
    for (const L of Ls) L.rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] !== '.') m.set((L.x + i) + ',' + (L.y + j), r[i]); });
    const xs = [...m.keys()].map((k) => +k.split(',')[0]), ys = [...m.keys()].map((k) => +k.split(',')[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), rows = [];
    for (let y = y0; y <= y1; y++) { let row = ''; for (let x = x0; x <= x1; x++) row += m.get(x + ',' + y) || '.'; rows.push(row); }
    return { x: x0, y: y0, rows, ink: true };
  }
  // lớp chéo lên suy từ lớp sau lưng, như đầu A chéo lên suy từ đầu A sau lưng: giữ nguyên đường viền ngoài (không ô nào lòi ra ngoài đầu),
  // chi tiết bên trong (nút buộc, quai, đuôi tóc, đá quý) dịch 1 cột ngược hướng mặt, tóc ở dải má (CHEEK) bỏ đi cho da má lộ ra
  function turn(L) {
    const at = (i, j) => (L.rows[j] && L.rows[j][i] && L.rows[j][i] !== '.' ? L.rows[j][i] : null);
    const rows = L.rows.map((r, j) => r.split('').map((c, i) => {
      if (c === '.') return '.';
      if (CHEEK.has((L.x + i) + ',' + (L.y + j)) && 'HhLzY'.includes(c)) return '.';
      return at(i + 1, j) || c;
    }).join(''));
    return Object.assign({}, L, { rows });
  }
  const turned = new WeakMap();
  const turnOf = (L) => { let t = turned.get(L); if (!t) turned.set(L, (t = turn(L))); return t; };
  const STYLES = {
    // cạo sát (duyệt 2026-11-01): tóc lấm tấm (chấm tối thưa; xen kẽ đều thì thành ô bàn cờ) phủ đỉnh, tóc mai lấm tấm 2 bên; sau lưng phủ tới gáy, gáy nhạt dần
    buzz: {
      front: [{ x: -6, y: -24, ink: true, rows: ['...HHhHHHH...', '.HhHHHHhHHhH.', 'HHHHhHHHHHHhH'] },
              { x: -6, y: -21, ink: false, rows: ['z...........z', 'z...........z'] }],
      back: [{ x: -6, y: -24, ink: true, rows: ['...HHhHHHH...', '.HhHHHHhHHhH.', 'HHHHhHHHHHHhH', 'HhHHHHhHHHHHH', 'HHHHHHHHHhHHH', 'HHhHHHHHHHHHH', 'HHHHHHhHHHHhH', 'hHHHHHHHHHHHH', '.HHHHhHHHHHH.'] },
             { x: -5, y: -15, ink: false, rows: ['.z.z.z.z.z.'] }],
    },
    // tóc dựng: 3 chỏm, sợi sáng dọc chỏm, tóc mái nhọn rủ xuống trán (dừng trên mắt). Rộng 15 = đúng bề ngang đầu, chỏm chỉ nhô 3 ô trên đỉnh
    // (user: bản 17 rộng, tóc chĩa ra 2 bên; bản chỏm cao 5 ô vẫn to quá)
    spiky: {
      front: [{ x: -7, y: -28, ink: true, rows: [
        '..H....H....H..',
        '.LHH..LHH..LHH.',
        'HLHHHHLHHHHLHHH',
        'HHHHHHHHHHHHHHH',
        '.HHHHHHHHHHHHH.',
        '.HhHHhHHHhHHhH.',
        '.H.HH..H..HH.H.',
        '...H.......H...'] }],
      back: [{ x: -7, y: -28, ink: true, rows: [
        '..H....H....H..',
        '.LHH..LHH..LHH.',
        'HLHHHHLHHHHLHHH',
        'HHHHHHHHHHHHHHH',
        'HHHhHHHHHHhHHHH',
        'HHHHHHHHHHHHHHH',
        'HHHHHhHHHHHHHHH',
        'HHHHHHHHHhHHHHH',
        'HHhHHHHHHHHHHHH',
        'HHHHHHHHHHHHhHH',
        '.HHHHHHHHHHHHH.',
        '.H.HH.HHH.HH.H.',
        '...H...H...H...'] }],
    },
    // mào gà: dải tóc giữa cao (sợi sáng giữa), 2 bên cạo lấm tấm. Nhìn ngang (user phác 2026-11-01): mào nhọn dựng giữa đỉnh, gốc rộng hơn, cạo 2 bên gốc
    mohawk: {
      front: [{ x: -6, y: -24, ink: false, rows: ['...z.....z...', '.z.z.z.z.z.z.', 'z.z.z...z.z.z', '.z.........z.'] },
              { x: -2, y: -31, ink: true, rows: ['..H..', '.HLH.', '.HLH.', 'HHLHH', 'HHLHH', 'HHLHH', 'HHLHH', 'HHHHH', '.hHh.'] }],
      side: [{ x: -6, y: -24, ink: false, rows: ['z.z.z...z.z.z', '.z.z.z...z.z.', 'z.z.z.z.z.z..', '.z.z.........', 'z.z..........'] },
             { x: -3, y: -32, ink: true, rows: ['....H.', '...HH.', '..HLH.', '..HLHH', '.HLHHH', '.HLHHH', 'HLHHHH', 'HHHHHH', 'hHHHHh'] }],
      back: [{ x: -6, y: -24, ink: false, rows: ['...z.....z...', '.z.z.z.z.z.z.', 'z.z.z...z.z.z', '.z.z.z.z.z.z.', 'z.z.z.z.z.z.z', '.z.z.z.z.z.z.', 'z.z.z.z.z.z.z', '.z.z.z.z.z.z.'] },
             { x: -2, y: -31, ink: true, rows: ['..H..', '.HLH.', '.HLH.', 'HHLHH', 'HHLHH', 'HHLHH', 'HHLHH', 'HHLHH', 'HHHHH', 'HHHHH', 'HHHHH', 'HHHHH', '.hHh.'] }],
    },
    // tóc xù: khối tròn bán kính 10 sau đầu, mép gợn từng búi rộng (user: mép gợn hẹp làm tóc chĩa lẻ; tròn trơn thì cứng quá, cho bông lên), chấm xoăn sáng; trước trán chân tóc phủ viền đỉnh đầu
    afro: {
      front: [Object.assign(afroRows(10, 0, -23), { ink: true, under: true }),
              { x: -7, y: -25, ink: false, rows: ['....HHHHHHH....', '..HHHLHHHHLHH..', '.HHhHHHHHhHHHH.', 'HHHHhHHHHhHHHHH', 'HH...........HH', 'H.............H'] }],
      back: [Object.assign(afroRows(10, 0, -23), { ink: true })],
    },
    // mái bằng (duyệt 2026-11-01): mũ tóc tròn trùm tới lông mày, mép mái tối, 2 bên rủ qua tai; nhìn ngang mái sau dài hơn mái trước
    bowl: {
      front: [{ x: -8, y: -26, ink: true, rows: [
        '.....HHHHHHH.....',
        '...HHHHHHHHHHH...',
        '..HHHLLLLHHHHHH..',
        '.HHHHHHHHHHHHHHH.',
        '.HHHHHHHHHHHHHHH.',
        '.hhhhhhhhhhhhhhh.',
        '.HH...........HH.',
        '.HH...........HH.',
        '.hh...........hh.'] }],
      side: [{ x: -8, y: -26, ink: true, rows: [
        '.....HHHHHHH.....',
        '...HHHHHHHHHHH...',
        '..HHHHHLLLLHHHH..',
        '.HHHHHHHHHHHHHHH.',
        '.HHHHHHHHHHHHHHH.',
        '.HHHHHhhhhhhhhhh.',
        '.HHHHH...........',
        '.HHHH............',
        '.hhhh............'] }],
      back: [{ x: -8, y: -26, ink: true, rows: [
        '.....HHHHHHH.....',
        '...HHHHHHHHHHH...',
        '..HHHHHHHHHHHHH..',
        '.HHHHHHHHHHHHHHH.',
        '.HHHHHHHHHHHHHHH.',
        '.HHHHHHHHHHHHHHH.',
        '.HHHHHHHHHHHHHHH.',
        '.HHHHHHHHHHHHHHH.',
        '.hhhhhhhhhhhhhhh.'] }],
    },
    // mũ lưỡi trai (snapback): chóp tròn có nút trên đỉnh, sọc sáng, logo màu đội, viền đáy tối; lưỡi trai thấy mặt dưới tối.
    // Nhìn ngang (user: bản cũ chỉ là hình chữ nhật; rồi: chóp nghiêng 1 bên): chóp tròn đối xứng ngay trên đầu, lưỡi chìa tới trước, quai màu đội ở gáy, tóc lộ dưới mũ phía sau
    cap: {
      pal: { C: '#262a36', c: '#1a1d27', W: '#3a4052', D: '#161923', d: '#0f1118' },
      front: [{ x: -8, y: -27, ink: true, rows: [
        '.......ccc.......',
        '.....CCCCCCC.....',
        '...CCWWCCCCCCC...',
        '..CCWCCCAACCCCC..',
        '.CCCCCCCAACCCCCC.',
        '.ccccccccccccccc.',
        'DDDDDDDDDDDDDDDDD',
        '.ddddddddddddddd.'] }],
      side: [{ x: -8, y: -27, ink: true, rows: [
        '......ccccc.........',
        '....CCCCCCCCC.......',
        '...CCWWCCCCCCC......',
        '..CCWCCCCCCAACC.....',
        '.CCCCCCCCCCAACCC....',
        '.cAAcccccccccccDDDDD',
        '.HHH..........dddddd',
        '.HHH................',
        '.hH.................'] }],
      back: [{ x: -8, y: -27, ink: true, rows: [
        '.......ccc.......',
        '.....CCCCCCC.....',
        '...CCCCCCCCCCC...',
        '..CCCCCCcCCCCCC..',
        '.CCCCCCcCcCCCCCC.',
        '.CCCCCCHHHCCCCCC.',
        '.ccccAAAAAAAcccc.',
        '.HHHHHHHHHHHHHHH.',
        '.HHHHHHHHHHHHHHH.',
        '.HHhHHHHHHHHhHHH.',
        '.HHHHHHHHHHHHHHH.',
        '..hHHHHHHHHHHHh..'] }],
      // chéo lên (user 2026-11-03): mũi lưỡi trai ló ra ngoài đầu bên hướng mặt (lưỡi ở phía trước đầu = xa máy quay -> vẽ sau đầu)
      bdiag: (back) => [{ x: 8, y: -22, ink: true, under: true, rows: ['DDD', 'dd.'] }].concat(back.map(turnOf)),
    },
    // tóc dài buộc đuôi ngựa (user: đuôi thiếu chi tiết, cho cong; nhìn trước tóc ôm sát đầu, không thấy đuôi): mái lệch 1 bên, dây buộc màu đội, đuôi cong chữ S
    // nhìn trước: không thấy đuôi (user: đuôi nằm sau gáy, bị đầu che) · nhìn ngang: đuôi sau gáy cong xuống · sau lưng: đuôi rủ giữa lưng, đè lên tóc
    longhair: {
      front: [{ x: -6, y: -24, ink: true, rows: [
                '...HHHHHHH...',
                '.HHHHLLHHHHH.',
                'HHHHHHHHLHHHH',
                'HHHHHHHHHhhHH',
                'Hh.......hHHH',
                'H..........hH'] }],
      side: [{ x: -13, y: -23, ink: true, under: true, rows: ['....HHH', '...HAAH', '..HHHH.', '.HLHH..', 'HLHH...', 'HLHH...', 'HHHH...', '.HHH...', '.hHH...', '..hH...', '...h...'] },
             { x: -7, y: -25, ink: true, rows: [
               '....HHHHHHH....',
               '..HHHHHLLHHHH..',
               '.HHHHHHHHHLHHH.',
               'HHHHHHHHHHHhhHH',
               'HHHHH.....hHHH.',
               'HHHH...........',
               'HHH............',
               'hH.............'] }],
      back: [{ x: -7, y: -25, ink: true, rows: [
               '....HHHHHHH....',
               '..HHHHHHHHHHH..',
               '.HHHHHHHHHHHHH.',
               'HHHHHHHHHHHHHHH',
               'HHHHHHHHHHHHHHH',
               'HHHHHHHHHHHHHHH',
               'HHHHHHHHHHHHHHH',
               'HHHHHHHHHHHHHHH',
               'hHHHHHHHHHHHHHh',
               '.hhHHHHHHHHHhh.'] },
             { x: -3, y: -23, ink: true, rows: ['..AAA..', '..HHH..', '.HHLH..', '.HHLHH.', '..HLHH.', '..HHHH.', '...HHH.', '..HHH..', '.HHH...', '.hH....', '.h.....'] }],
    },
    // mũ tai bèo (user: bản cũ thất vọng): chóp tròn mềm có nếp sáng, dải băng tối, vành rộng rủ xuống quanh đầu, mặt dưới vành tối, 2 mép vành chúc xuống
    bucket: {
      pal: { C: '#c7b27a', W: '#e2d29e', B: '#8a7a4a', D: '#b59f66', d: '#7d6c43' },
      front: [{ x: -9, y: -28, ink: true, rows: [
        '......CCCCCCC......',
        '....CCCCCWWCCCC....',
        '...CCCCCCCWWCCCC...',
        '...CCCCCCCCCCCCC...',
        '...BBBBBBBBBBBBB...',
        '..DDDDDDDDDDDDDDD..',
        '.DDDDDDDDDDDDDDDDD.',
        'DDdddddddddddddddDD',
        'dD...............Dd'] }],
      back: [{ x: -9, y: -28, ink: true, rows: [
        '......CCCCCCC......',
        '....CCCCCCCCCCC....',
        '...CCCCCCCCCCCCC...',
        '...CCCCCCCCCCCCC...',
        '...BBBBBBBBBBBBB...',
        '..DDDDDDDDDDDDDDD..',
        '.DDDDDDDDDDDDDDDDD.',
        'DDDDDDDDDDDDDDDDDDD',
        'dDddHHHHHHHHHHHddDd',
        '....HHHHHHHHHHH....',
        '....hHHHHHHHHHh....'] }],
    },
    // tai nghe (user: bản cũ thất vọng): tóc ngắn bên dưới, vòng đeo ôm trên tóc (sọc sáng) xuống 2 chụp tai to, đệm tối + tâm đỏ;
    // nhìn ngang: vòng vắt ngang đỉnh, 1 chụp tai giữa đầu
    headphones: {
      pal: { D: '#4a4f63', W: '#7a8196', d: '#2b2f3c', R: '#ff3d5a', r: '#b8263f' },
      front: [{ x: -6, y: -24, ink: true, rows: ['...HHHHHHH...', '.HHHHHLHHHHH.', 'HHhHHHHHHHhHH'] },
              { x: -9, y: -27, ink: true, rows: [
                '.....DDDDDDDDD.....',
                '...DDWWWWWWWWWDD...',
                '..DD...........DD..',
                '.DD.............DD.',
                '.D...............D.',
                'ddd.............ddd',
                'dRd.............dRd',
                'dRd.............dRd',
                'drd.............drd',
                'ddd.............ddd'] }],
      // nhìn ngang: chụp tai ở nửa sau đầu (chỗ tai), không đè lên mắt (mắt lệch tới trước x -2..5)
      side: [{ x: -6, y: -24, ink: true, rows: ['...HHHHHHH...', '.HHHHHLHHHHH.', 'HHHHHHHHHHhHH', 'HHHH.........', 'HHH..........'] },
             { x: -8, y: -27, ink: true, rows: [
               '.....DDDDDDD...',
               '...DDWWWWWWWDD.',
               '...D...........',
               '...D...........',
               '.dddd..........',
               'ddRRdd.........',
               'dRrrRd.........',
               'dRrrRd.........',
               'ddRRdd.........',
               '.dddd..........'] }],
      back: [{ x: -6, y: -24, ink: true, rows: ['...HHHHHHH...', '.HHHHHHHHHHH.', 'HHHHHHHHHHHHH', 'HHHHHHHHHHHHH', 'HHHhHHHHHhHHH', 'HHHHHHHHHHHHH', 'HHHHHHHHHHHHH', 'hHHHHHHHHHHHh', '.hHHHHHHHHHh.'] },
             { x: -9, y: -27, ink: true, rows: [
               '.....DDDDDDDDD.....',
               '...DDDDDDDDDDDDD...',
               '..DD...........DD..',
               '.DD.............DD.',
               '.D...............D.',
               'ddd.............ddd',
               'dRd.............dRd',
               'dRd.............dRd',
               'drd.............drd',
               'ddd.............ddd'] }],
      // chéo lên (user 2026-11-03: vòng đeo phải xoay theo đầu, không đứng yên như sau lưng): giữa sau lưng và nhìn ngang. Vòng hẹp lại, vắt chéo
      // qua đỉnh; chụp tai gần (bên hướng mặt) dịch vào chỗ tai, hình chụp như nhìn ngang; chụp tai xa khuất sau đầu, chỉ lộ mép ngoài
      bdiag: (back) => [turnOf(back[0]),
        { x: -9, y: -22, ink: true, under: true, rows: ['ddd', 'dRd', 'dRd', 'drd', 'ddd'] },
        { x: -8, y: -27, ink: true, rows: [
          '....DDDDDDDD....',
          '..DDDDDDDDDDDD..',
          '.DD.........DD..',
          'DD...........D..',
          'D............D..'] },
        { x: 3, y: -23, ink: true, rows: ['.dddd.', 'ddRRdd', 'dRrrRd', 'dRrrRd', 'ddRRdd', '.dddd.'] }],
    },
    // mũ bảo hiểm (user: đội lên đầu nên to hơn đầu; rồi: nhỏ lại chút, tròn hơn, sau lưng không lộ tóc): vỏ trắng rộng 17 (đầu 15), cao hơn đầu 3,
    // đỉnh bo tròn, sọc đỏ giữa (nhìn ngang chạy dọc đỉnh), chấm sáng, viền đáy tối, 2 tai mũ rủ xuống má; sau lưng vỏ trùm kín tới gáy
    helmet: {
      pal: { W: '#e8ecf5', w: '#b9c0d0', V: '#ffffff', R: '#d7263d' },
      front: [{ x: -8, y: -28, ink: true, rows: [
        '.....WWWWWWW.....',
        '...WWWWWRWWWWW...',
        '..WWVVWWRWWWWWW..',
        '.WWVWWWWRWWWWWWW.',
        '.WWWWWWWRWWWWWWW.',
        'WWWWWWWWRWWWWWWWW',
        'WWWWWWWWWWWWWWWWw',
        'wwwwwwwwwwwwwwwww',
        'WW.............WW',
        'WW.............WW',
        '.w.............w.'] }],
      side: [{ x: -8, y: -28, ink: true, rows: [
        '.....WWWWWWW.....',
        '...WWWWWWWWWWW...',
        '..WRRRRRRRVVWWW..',
        '.WWWWWWWWWWVWWWW.',
        '.WWWWWWWWWWWWWWW.',
        'WWWWWWWWWWWWWWWWW',
        'WWWWWWWWWWWWWWWWw',
        'wwwwwwwwwwwwwwwww',
        'WWWWW............',
        'WWWW.............',
        'wWW..............'] }],
      back: [{ x: -8, y: -28, ink: true, rows: [
        '.....WWWWWWW.....',
        '...WWWWWRWWWWW...',
        '..WWWWWWRWWWWWW..',
        '.WWWWWWWRWWWWWWW.',
        '.WWWWWWWRWWWWWWW.',
        'WWWWWWWWRWWWWWWWW',
        'WWWWWWWWRWWWWWWWW',
        'WWWWWWWWRWWWWWWWw',
        'WWWWWWWWWWWWWWWWw',
        'WWWWWWWWWWWWWWWWw',
        'wwwwwwwwwwwwwwwww'] }],
    },
    // ---------- đợt 4 (user 2026-11-01: vẽ lại các mũ còn lại, thêm chi tiết). Mũ nào cũng lộ tóc dưới vành ở sau lưng ----------
    // cao bồi: chóp có rãnh lõm giữa (2 múi), sọc sáng, dải da tối có khoá vàng, vành rộng cong vểnh 2 đầu, mặt dưới vành tối; tóc mai lộ dưới vành.
    // Mũ hạ thấp (user 2026-11-01: hạ mũ xuống): vành ở y -22 / -21, ngay trên mắt
    cowboy: {
      pal: { C: '#8a5a2b', W: '#b07a42', c: '#6a4320', B: '#3b2415', G: '#ffd23f', D: '#7a4e25', d: '#4f3218' },
      front: [{ x: -6, y: -20, ink: true, rows: ['H...........H', 'H...........H'] },
              { x: -11, y: -29, ink: true, rows: sym([
                '........CCC.',
                '.......CCWCc',
                '.......CWCCc',
                '.......CWCCc',
                '.......CCCCc',
                '.......BBBBG',
                'D......CCCCC',
                'DDDDDDDDDDDD',
                '.ddddddddddd']) }],
      back: [{ x: -6, y: -24, ink: true, rows: BACK_HAIR },
             { x: -11, y: -29, ink: true, rows: sym([
               '........CCC.',
               '.......CCCCc',
               '.......CCCCc',
               '.......CCCCc',
               '.......CCCCc',
               '.......BBBBB',
               'D......CCCCC',
               'DDDDDDDDDDDD',
               '.ddddddddddd']) }],
    },
    // ông già Noel: mũ nhọn đỏ đổ nghiêng sang phải (nếp tối dọc), viền lông trắng bông (chấm xám), quả bông ở chóp
    santa: {
      pal: { R: '#d7263d', r: '#a81d30', W: '#f3ead7', w: '#cfc6b0' },
      front: [{ x: -8, y: -32, ink: true, rows: [
        '...............WW..',
        '..............WwwW.',
        '...........RRRWWWW.',
        '.........RRRRrrWW..',
        '.......RRRRRRrr....',
        '.....RRRRRRRRrr....',
        '...RRRRRRRRRRRr....',
        '..RRRRRRRRRRRRRr...',
        '.RRrRRRRRRRRRRRr...',
        'WWWWWWWWWWWWWWWWW..',
        'wWWwWWWwWWWWwWWWw..'] }],
      back: [{ x: -6, y: -24, ink: true, rows: BACK_HAIR },
             { x: -8, y: -32, ink: true, rows: [
               '...............WW..',
               '..............WwwW.',
               '...........RRRWWWW.',
               '.........RRRRrrWW..',
               '.......RRRRRRrr....',
               '.....RRRRRRRRrr....',
               '...RRRRRRRRRRRr....',
               '..RRRRRRRRRRRRRr...',
               '.RRrRRRRRRRRRRRr...',
               'WWWWWWWWWWWWWWWWW..',
               'wWWwWWWwWWWWwWWWw..'] }],
    },
    // viking (hạ 2 ô, user): mũ sắt tròn (sọc sáng), vành có đinh tán, thanh che mũi giữa 2 mắt, 2 sừng xương cong vươn ra rồi chĩa lên (chóp ngả vào)
    viking: {
      pal: { M: '#9aa3b5', m: '#6a7385', V: '#d6dce8', O: '#f3ead7', o: '#c7bca8' },
      front: [{ x: -11, y: -29, ink: true, rows: sym([
        '.o..........',
        'oO..........',
        'oO......MMMM',
        'oO....MMVVMM',
        '.oO..MVVMMMM',
        '..oO.MVMMMMM',
        '...oOMMMMMMM',
        '....MMMMMMMM',
        '....mVmmVmmm',
        '...........m',
        '...........m',
        '...........m']) }],
      side: [{ x: -11, y: -29, ink: true, rows: sym([
        '.o..........',
        'oO..........',
        'oO......MMMM',
        'oO....MMVVMM',
        '.oO..MVVMMMM',
        '..oO.MVMMMMM',
        '...oOMMMMMMM',
        '....MMMMMMMM',
        '....mVmmVmmm']) }],
      back: [{ x: -6, y: -24, ink: true, rows: BACK_HAIR },
             { x: -11, y: -29, ink: true, rows: sym([
               '.o..........',
               'oO..........',
               'oO......MMMM',
               'oO....MMMMMM',
               '.oO..MMMMMMM',
               '..oO.MMMMMMM',
               '...oOMMMMMMM',
               '....MMMMMMMM',
               '....mVmmVmmm']) }],
    },
    // tóc lửa (user: viền khác màu đen, thêm quầng sáng): viền đỏ thẫm, quầng cam cộng sáng nhấp nháy; chân tóc đỏ -> cam, 5 lưỡi lửa bốc lên (đỉnh vàng nhạt -> vàng -> cam), cao thấp đổi theo anim (10 nhịp / s)
    flamehair: {
      pal: { Y: '#fff3a8', F: '#ffd23f', O: '#ff9a3d', R: '#ff6a1f', r: '#d7263d' },
      front: (anim) => [{ x: -7, y: -30, ink: '#6e1206', rows: flames(anim, false) }],
      back: (anim) => [{ x: -7, y: -30, ink: '#6e1206', rows: flames(anim, true) }],
      glow: (anim) => ({ x: 0, y: -27, r: 6 + (Math.floor(anim * 6) % 2), c: 'rgba(255,140,40,0.16)' }),   // như bản cũ (đĩa r 6, 0.18); to hơn thì thành đĩa mờ lơ lửng
    },
    // vương miện (user 2026-11-01: hạ xuống che tóc, hẹp lại, đế tròn chứ không phẳng): rộng 13 (đầu 15), 5 chỏm vàng đầu sáng, ruby / sapphire trên đai,
    // đai đáy võng xuống 1 ô ở giữa phía trước (vòng tròn quanh đầu nhìn từ trước); sau lưng tóc lộ dưới vương miện
    crown: {
      pal: { G: '#ffd23f', g: '#c9a020', V: '#fff3a8', R: '#ff3d5a', B: '#3f8cff' },
      front: [{ x: -6, y: -29, ink: true, rows: sym(['V..V..V', 'G.GVG.G', 'GGGGGGG', 'GGBGGGR', 'GGGGGGG', 'ggggggg', '..ggggg']) }],
      back: [{ x: -6, y: -24, ink: true, rows: BACK_HAIR },
             { x: -6, y: -29, ink: true, rows: sym(['V..V..V', 'G.GGG.G', 'GGGGGGG', 'GGRGGGB', 'GGGGGGG', 'ggggggg', 'ggggggg']) }],
    },
    // cúp Ward Cup (FOOTBALL STORY): nồi cơm sơn vàng đội trên đầu: miệng nồi sáng, 2 quai, vệt sáng thân nồi, vết méo tối bên phải, đáy tối
    ward_trophy: {
      pal: { G: '#ffd23f', g: '#c9a020', V: '#fff3a8' },
      front: [{ x: -6, y: -24, ink: true, rows: ['.............', '.HHHHHHHHHHH.', 'HHhHHHHHHHhHH', 'H...........H'] },
              { x: -9, y: -32, ink: true, rows: sym(['..VVVVVVVV', '.gGGGGGGGG', '...GVVGGGG', 'gg.GVGGGGG', 'gG.GVGGGGG', 'gg.GGGGGGG', '...GGGGGGG', '...ggggggg']) },
              { x: 2, y: -28, ink: false, rows: ['gg.', '.gg'] }],
      back: [{ x: -6, y: -24, ink: true, rows: BACK_HAIR },
             { x: -9, y: -32, ink: true, rows: sym(['..VVVVVVVV', '.gGGGGGGGG', '...GGGGGGG', 'gg.GGGGGGG', 'gG.GGGGGGG', 'gg.GGGGGGG', '...GGGGGGG', '...ggggggg']) }],
    },
    // mũ Rooftop Night League (FOOTBALL STORY): snapback xanh đêm, trăng khuyết vàng + 1 ngôi sao trắng, quai sau vàng
    moon_cap: {
      pal: { C: '#1e2a50', c: '#141d38', W: '#33447a', D: '#141a30', d: '#0c1020', Y: '#ffd23f', V: '#ffffff' },
      front: [{ x: -8, y: -27, ink: true, rows: [
        '.......ccc.......',
        '.....CCCCCCC.....',
        '...CCWWCYCCCCC...',
        '..CCWCCYCCVCCCC..',
        '.CCCCCCCYCCCCCCC.',
        '.ccccccccccccccc.',
        'DDDDDDDDDDDDDDDDD',
        '.ddddddddddddddd.'] }],
      side: [{ x: -8, y: -27, ink: true, rows: [
        '......ccccc.........',
        '....CCCCCCCCC.......',
        '...CCWWCCCCCYC......',
        '..CCWCCCCCCYCCV.....',
        '.CCCCCCCCCCCYCCC....',
        '.cYYcccccccccccDDDDD',
        '.HHH..........dddddd',
        '.HHH................',
        '.hH.................'] }],
      back: [{ x: -8, y: -27, ink: true, rows: [
        '.......ccc.......',
        '.....CCCCCCC.....',
        '...CCCCCCCCCCC...',
        '..CCCCCCcCCCCCC..',
        '.CCCCCCcCcCCCCCC.',
        '.CCCCCCHHHCCCCCC.',
        '.ccccYYYYYYYcccc.',
        '.HHHHHHHHHHHHHHH.',
        '.HHHHHHHHHHHHHHH.',
        '.HHhHHHHHHHHhHHH.',
        '.HHHHHHHHHHHHHHH.',
        '..hHHHHHHHHHHHh..'] }],
      bdiag: (back) => [{ x: 8, y: -22, ink: true, under: true, rows: ['DDD', 'dd.'] }].concat(back.map(turnOf)),
    },
    // mũ Night Market Cup (FOOTBALL STORY): đèn lồng giấy đỏ đội trên đầu: nan tối dọc, nửa trái sáng như có lửa trong, nắp trên / dưới vàng, móc treo
    lantern_hat: {
      pal: { R: '#e8322a', r: '#b81e1a', W: '#ff8a6a', Y: '#ffd23f', y: '#c9a020' },
      front: [{ x: -6, y: -24, ink: true, rows: ['...HHHHHHH...', '.HHHHHHHHHHH.', 'HHhHHHHHHHhHH', 'H...........H'] },
              { x: -6, y: -36, ink: true, rows: [
                '......Y......',
                '....YYYYY....',
                '..yyyyyyyyy..',
                '.RRWrRRrRRrR.',
                'RRWWrRRrRRrRR',
                'RWWWrRRrRRrRR',
                'RRWWrRRrRRrRR',
                'RRRRrRRrRRrRR',
                '.RRRrRRrRRrR.',
                '..yyyyyyyyy..',
                '....YYYYY....'] }],
      back: [{ x: -6, y: -24, ink: true, rows: BACK_HAIR },
             { x: -6, y: -36, ink: true, rows: [
               '......Y......',
               '....YYYYY....',
               '..yyyyyyyyy..',
               '.RRrRRrRRrRR.',
               'RRRrRRrRRrRRR',
               'RRRrRRrRRrRRR',
               'RRRrRRrRRrRRR',
               'RRRrRRrRRrRRR',
               '.RRrRRrRRrRR.',
               '..yyyyyyyyy..',
               '....YYYYY....'] }],
    },
    // vòng nguyệt quế (FOOTBALL STORY Grandpa's Legends): 2 hàng lá vàng sáng / tối xen kẽ chạy vòng quanh đầu ngang trán, trên tóc
    // (user 2026-11-01: bản sau lưng là đúng, các hướng khác vẽ như vậy)
    laurel: {
      pal: { G: '#ffd23f', g: '#c9a020', V: '#fff3a8' },
      front: [{ x: -6, y: -24, ink: true, rows: ['...HHHHHHH...', '.HHHHHHHHHHH.', 'HHhHHHHHHHhHH'] },
              { x: -8, y: -23, ink: true, rows: ['.gG.gG.gGg.Gg.Gg.', 'gG.gG.gG.Gg.Gg.Gg'] }],
      back: [{ x: -6, y: -24, ink: true, rows: BACK_HAIR },
             { x: -8, y: -23, ink: true, rows: ['.gG.gG.gGg.Gg.Gg.', 'gG.gG.gG.Gg.Gg.Gg'] }],
    },
    // AURA FARMING (Tuyệt kỹ): tóc vàng kiểu Goku siêu xay-da theo ảnh user (auraLayers: chỏm lá có nét ngăn), chỏm giữa nhấp nháy cao thêm 1 ô (10 nhịp / s)
    aura: {
      pal: { Y: '#fff6b0', H: '#ffe14f', h: '#d9a514' },
      front: (anim) => auraLayers(anim, false),
      back: (anim) => auraLayers(anim, true),
    },
  };
  for (const st of Object.values(STYLES)) for (const [k, v] of Object.entries(st)) if (k !== 'pal' && k !== 'glow' && typeof v !== 'function') for (const L of v) if (L.rows.some((r) => r.length !== L.rows[0].length)) throw new Error('hair rows width: ' + L.rows.join('|'));
  // ô mặt (trong viền đầu hói, từ trán xuống): không viền mực lên đây
  const FACE = new Set();
  BALD.front.rows.forEach((r, j) => { const y = BALD.front.y + j; if (y >= -21) for (let i = 0; i < r.length; i++) if (r[i] === 'S' || r[i] === 's') FACE.add(BALD.front.x + i + ',' + y); });
  // ô trong viền đầu hói (lớp phẳng chỉ tô trong này: tóc cạo lấm tấm không lọt ra ngoài đầu)
  const INSIDE = { front: new Set(), back: new Set() };
  for (const k of ['front', 'back']) BALD[k].rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] !== '.' && r[i] !== 'K') INSIDE[k].add((BALD[k].x + i) + ',' + (BALD[k].y + j)); });
  // vẽ 1 lớp: ink = viền mực 4 hướng quanh khối trừ lên mặt (nhìn sau lưng không có mặt); lớp phẳng chỉ tô trong viền đầu
  function layer(ctx, X, Y, L, hp, mir, back, bd = false) {
    const cells = new Map(), inside = INSIDE[back ? 'back' : 'front'];
    L.rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] !== '.' && (L.ink || inside.has((L.x + i) + ',' + (L.y + j)))) cells.set((L.x + i) + ',' + (L.y + j), [L.x + i, L.y + j, hp[r[i]] || r[i]]); });
    const cx = (x) => (mir ? X - x : X + x);
    if (L.ink) {
      ctx.fillStyle = typeof L.ink === 'string' ? L.ink : INK;   // ink = màu: viền màu riêng (tóc lửa viền đỏ thẫm)
      for (const [x, y] of cells.values()) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const k = (x + dx) + ',' + (y + dy);
        if (cells.has(k) || (!back && FACE.has(k)) || (bd && CHEEK.has(k))) continue;   // chéo lên: không viền mực lên dải má
        ctx.fillRect(cx(x + dx), Y + y + dy, 1, 1);
      }
    }
    for (const [x, y, c] of cells.values()) { ctx.fillStyle = c; ctx.fillRect(cx(x), Y + y, 1, 1); }
  }

  // đầu có kiểu tóc (thay cho stamp đầu A ở draw.js). o: hair (màu tóc), skin, band (màu phụ của đội = kit.accent), anim · bd = chéo lên
  function drawHead(ctx, X, Y, back, cut, o, pal, fx, fy, bd = false) {
    const st = STYLES[cut], bald = BALD[bd ? 'bdiag' : back ? 'back' : 'front'];
    if (!st) {   // chưa vẽ lại: bản chuyển thẳng. Chéo lên: vẽ như sau lưng rồi tô lại dải má
      if (cut === 'afro') { discW(ctx, X, Y, 0, HY - 3, 10, OUT); discW(ctx, X, Y, 0, HY - 3, 9, o.hair); }
      stamp(ctx, X, Y, bald, pal, bd && fx < 0);
      cutDraw(ctx, X, Y, cut, o.hair, { accent: o.band }, fx, fy, back, o.anim || 0);
      if (bd) for (const [k, c] of CHEEK) { const [x, y] = k.split(',').map(Number); rectW(ctx, X, Y, fx < 0, x, y, 1, 1, pal[c]); }
      return;
    }
    const side = !back && Math.abs(fx) > 0.5, v0 = back ? st.back : (side && st.side) || st.front, mir = bd ? fx < 0 : side && !!st.side && fx < 0;
    const raw = typeof v0 === 'function' ? v0(o.anim || 0) : v0;   // tóc lửa / aura: lớp đổi theo anim
    // chéo lên: kiểu có bản vẽ riêng (st.bdiag, nhận lớp sau lưng) dùng bản đó, còn lại suy từ lớp sau lưng (turn)
    const view = bd ? (st.bdiag ? st.bdiag(raw) : raw.map(turnOf)) : raw;
    const hp = Object.assign({ H: o.hair, h: shade(o.hair, 0.3), L: shade(o.hair, -0.35), z: mix(o.skin || pal.S, o.hair, 0.45), A: o.band }, st.pal || {});
    for (const L of view) if (L.under) layer(ctx, X, Y, L, hp, mir, back, bd);
    stamp(ctx, X, Y, bald, pal, bd && fx < 0);
    for (const L of view) if (!L.under) layer(ctx, X, Y, L, hp, mir, back, bd);
    // quầng sáng (tóc lửa): đĩa px mờ cộng sáng quanh đỉnh đầu
    if (st.glow) { const g = st.glow(o.anim || 0); ctx.globalCompositeOperation = 'lighter'; discW(ctx, X, Y, g.x, g.y, g.r, g.c); ctx.globalCompositeOperation = 'source-over'; }
  }

  // mix: face.js dùng lại (má hồng, tàn nhang theo màu da)
  Object.assign(Sprite, { HAIR_BALD: BALD, HAIR_STYLES: STYLES, drawHead, mix });
})();
