/* ModDraw — hình các vật thể của LUẬT TRẬN FOOTBALL STORY (src/systems/matchmods.js). render/vfx.js drawProp gọi draw() cho các kind ở đây.
 * graffiti (dãy tấm bê tông phun sơn, chia khúc parts) · stool (ghế nhựa) · stoolfly (ghế vỡ văng) · lane (làn giao hàng nhấp nháy) · moped (xe máy giao hàng) · vroom (Moped Boys đang được quá giang)
 * · veil (School Ghosts đang tàng hình: không vẽ gì, render đọc MatchMods.alpha) · spot (đèn pha) · alarm (vòng đếm ngược bị soi)
 * · owl (con cú khổng lồ của Night Owls trên khán đài, mắt đọc từ prop owleyes) · owleyes (lượt mắt mở: không vẽ gì riêng)
 * · gazelock (tia ngắm khoá người chạy) · owlbolt (đạn mắt cú đuổi theo người) · petrify (người bị bắn trúng hoá tượng đá)
 * Vị trí vật di chuyển lấy từ SFC.MatchMods.at (cùng hàm với mô phỏng).
 */
window.SFC = window.SFC || {};

(function () {
  const SP = () => SFC.Sprites;
  // làm tối màu '#rrggbb' theo hệ số k (0..1)
  function dark(hex, k) {
    const n = parseInt(hex.slice(1), 16), m = (v) => Math.round(v * (1 - k));
    return `rgb(${m(n >> 16)},${m((n >> 8) & 255)},${m(n & 255)})`;
  }

  // pha màu '#rrggbb' về phía trắng theo hệ số k (0..1)
  function light(hex, k) {
    const n = parseInt(hex.slice(1), 16), m = (v) => Math.round(v + (255 - v) * k);
    return `rgb(${m(n >> 16)},${m((n >> 8) & 255)},${m(n & 255)})`;
  }

  // 1 tấm của tường graffiti (chân tại x, y): tấm bê tông dựng đứng, phun 1 dải sơn uốn lượn (tính theo toạ độ x của sân nên các tấm
  // cạnh nhau nối thành 1 bức tranh liền), mép trên sáng kiểu chữ bong bóng, nét tag trắng, sơn chảy nhỏ giọt dài dần.
  // i: khúc thứ i (dựng lần lượt từ đầu tường rồi phun sơn) · el: giây đã đứng · seed: hình riêng mỗi bức tường
  // join: tấm giữa của tường nằm ngang -> phủ lên mép tấm trước (không vẽ viền trái) để cả dãy thành 1 bức tường liền
  function panel(ctx, x, y, col, i, el, seed, join) {
    const { px, ellipse, OUT } = SP();
    const e0 = el - i * 0.025, rise = Math.max(0, Math.min(1, e0 / 0.08));
    if (rise <= 0) return;
    const H = Math.round(18 * rise), top = y - H;
    ellipse(ctx, x, y + 1, 6, 2, 'rgba(0,0,0,0.35)');
    const L = join ? -6 : -5;
    px(ctx, x - 6, top - 1, 12, H + 2, OUT);
    px(ctx, x + L, top, 5 - L, H, '#8e8a84');
    px(ctx, x + L, top, 5 - L, 1, '#b9b4ab');
    px(ctx, x + L, y - 2, 5 - L, 2, '#5f5b56');
    if (rise < 1) return;
    const paint = Math.min(1, (e0 - 0.08) / 0.12), lt = light(col, 0.55), dk = dark(col, 0.35), a = seed * 1.7;
    for (let cx = L; cx < 5; cx++) {
      if ((cx + 6) / 11 >= paint) break;
      const wx = x + cx, h = (((wx * 7 + seed * 3) % 5) + 5) % 5;
      const b0 = top + 4 + Math.round(1.6 * Math.sin(wx * 0.33 + a)), b1 = y - 4 + Math.round(1.2 * Math.sin(wx * 0.51 + a * 2));
      if (h === 2) px(ctx, wx, b0 - 2, 1, 1, col);   // hạt sơn bắn lên trên
      px(ctx, wx, b0, 1, b1 - b0, col);
      px(ctx, wx, b0, 1, 1, lt);
      px(ctx, wx, b1 - 2, 1, 2, dk);
      px(ctx, wx, Math.round((b0 + b1) / 2 + 2 * Math.sin(wx * 0.7 + a)), 1, 1, '#ffffff');
      if (h === 0) px(ctx, wx, b1, 1, Math.min(4, 1 + Math.floor(el * 2)), dk);   // sơn chảy dài dần
    }
  }

  // tượng đá của người q: vẽ sprite ra canvas phụ, khử hết màu (kể cả da, tóc) rồi phủ xám đá — trả về canvas 48x48, chân ở (24, 42)
  // (mask = bản sprite gốc làm mặt nạ: khử màu tô cả vùng trong suốt nên phải cắt lại theo hình người bằng 1 lần drawImage)
  let stoneCv = null, maskCv = null;
  function stoneSprite(g, q) {
    if (!stoneCv) for (const k of [0, 1]) { const cv = document.createElement('canvas'); cv.width = 48; cv.height = 48; if (k) maskCv = cv; else stoneCv = cv; }
    const c = stoneCv.getContext('2d'), m = maskCv.getContext('2d');
    const pose = Object.assign({}, q, { x: 24, y: 42, state: 'normal', anim: 0, vx: 0, vy: 0, flash: 0, atkType: null, sizeMul: 1 });
    m.clearRect(0, 0, 48, 48);
    SP().drawPlayer(m, pose, g, 0.999);
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    c.clearRect(0, 0, 48, 48);
    c.drawImage(maskCv, 0, 0);
    c.globalCompositeOperation = 'saturation'; c.fillStyle = '#808080'; c.fillRect(0, 0, 48, 48);   // khử màu
    c.globalCompositeOperation = 'source-atop'; c.globalAlpha = 0.45; c.fillStyle = '#8a8f99'; c.fillRect(0, 0, 48, 48);   // ánh xám đá
    c.globalCompositeOperation = 'destination-in'; c.globalAlpha = 1; c.drawImage(maskCv, 0, 0);   // cắt lại đúng hình người
    c.globalCompositeOperation = 'source-over';
    return stoneCv;
  }

  // ghế nhựa đỏ kiểu quán trà đá (chân tại x, y)
  function stool(ctx, x, y, col) {
    const { px, ellipse, OUT } = SP(), dk = dark(col, 0.35);
    // viền tối
    px(ctx, x - 6, y - 9, 3, 10, OUT); px(ctx, x + 3, y - 9, 3, 10, OUT); px(ctx, x - 2, y - 8, 4, 8, OUT);
    ellipse(ctx, x, y - 10, 8, 3.5, OUT);
    // chân + mặt ghế
    px(ctx, x - 5, y - 8, 1, 8, dk); px(ctx, x + 4, y - 8, 1, 8, dk); px(ctx, x - 1, y - 7, 2, 6, dk);
    px(ctx, x - 5, y - 4, 10, 1, dk);
    ellipse(ctx, x, y - 10, 7, 2.5, col);
    px(ctx, x - 4, y - 11, 4, 1, '#ffffff');
    ellipse(ctx, x, y - 10, 2, 0.8, dk);
  }

  // xe máy giao hàng nhìn từ trước / sau (chạy dọc màn hình), down = đang chạy xuống
  function moped(ctx, x, y, col, down, t) {
    const { px, disc, ellipse, OUT } = SP();
    const bob = Math.floor(t * 20) % 2;
    ellipse(ctx, x, y + 1, 10, 3, 'rgba(0,0,0,0.35)');
    // bánh xe
    px(ctx, x - 2, y - 6, 4, 7, OUT); px(ctx, x - 1, y - 5, 2, 5, '#3a3a44');
    // thân xe + đèn pha (phía chạy tới)
    px(ctx, x - 6, y - 13 - bob, 12, 8, OUT); px(ctx, x - 5, y - 12 - bob, 10, 6, col);
    px(ctx, x - 5, y - 8 - bob, 10, 1, dark(col, 0.4));
    if (down) { disc(ctx, x, y - 9 - bob, 2, '#fff6a0'); px(ctx, x - 1, y - 10 - bob, 2, 1, '#ffffff'); }
    else { px(ctx, x - 2, y - 10 - bob, 4, 2, '#ff3d3d'); }
    // tay lái
    px(ctx, x - 8, y - 15 - bob, 16, 2, OUT); px(ctx, x - 7, y - 15 - bob, 14, 1, '#9aa0a8');
    // người lái: áo đội + mũ bảo hiểm
    px(ctx, x - 4, y - 21 - bob, 8, 7, OUT); px(ctx, x - 3, y - 20 - bob, 6, 5, col);
    disc(ctx, x, y - 24 - bob, 4, OUT); disc(ctx, x, y - 24 - bob, 3, '#ffd23f');
    px(ctx, x - 2, y - 24 - bob, 4, 1, down ? '#1a1216' : '#ffd23f');
    // thùng hàng sau lưng (chạy lên: thấy thùng che người)
    if (!down) { px(ctx, x - 6, y - 25 - bob, 12, 9, OUT); px(ctx, x - 5, y - 24 - bob, 10, 7, '#c9781a'); px(ctx, x - 5, y - 21 - bob, 10, 1, '#7a4510'); px(ctx, x - 2, y - 23 - bob, 4, 1, '#fff3d6'); }
    // vệt tốc độ phía sau
    ctx.globalAlpha *= 0.6;
    for (let i = 0; i < 4; i++) {
      const lx = x - 7 + i * 4 + ((i * 7) % 3), ly = down ? y - 34 - ((t * 90 + i * 13) % 14) : y + 4 + ((t * 90 + i * 13) % 14);
      px(ctx, lx, ly, 1, 6, '#ffffff');
    }
  }

  // mặt sau lá bài tại (x, y), cỡ k, bề ngang sx (lật), nghiêng rot (rad): nền tím, viền vàng, con mắt + hoa văn
  function tarotBack(ctx, x, y, k, sx, rot) {
    const { px, ellipse, disc } = SP();
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (rot) ctx.rotate(rot);
    ctx.scale(k * sx, k);
    px(ctx, -14, -20, 28, 40, SP().OUT); px(ctx, -13, -19, 26, 38, '#ffd23f'); px(ctx, -12, -18, 24, 36, '#5a2a9a');
    for (let i = -10; i <= 10; i += 5) for (let j = -15; j <= 15; j += 5) if ((i + j) % 10 === 0) px(ctx, i, j, 1, 1, '#9d7bff');
    ellipse(ctx, 0, 0, 7, 4, '#ffd23f'); disc(ctx, 0, 0, 2, '#1c1238');
    ctx.restore();
  }
  // hình trên mặt lá bài (THE MOON · THE MAGICIAN · THE RABBITS · THE WHEEL), gốc ở tâm lá, mặt trong 24x36
  function tarotArt(ctx, id, el, t) {
    const { px, disc } = SP(), OUT = SP().OUT;
    if (id === 'moon') {
      disc(ctx, 0, -3, 8, '#fff3b0'); disc(ctx, 4, -5, 7, '#1c1238');
      for (const [sx, sy] of [[-8, -13], [7, 8], [-6, 10], [8, -14]]) { px(ctx, sx - 1, sy, 3, 1, '#ffffff'); px(ctx, sx, sy - 1, 1, 3, '#ffffff'); }
    } else if (id === 'magician') {
      px(ctx, -8, 2, 16, 2, OUT); px(ctx, -5, -10, 10, 13, OUT); px(ctx, -4, -9, 8, 11, '#2a2a3a'); px(ctx, -4, -2, 8, 2, '#d7263d');   // mũ ảo thuật
      px(ctx, -9, 1, 18, 2, '#2a2a3a');
      px(ctx, 4, 6, 8, 1, '#ffffff'); px(ctx, 11, 5, 2, 3, '#ffffff');   // đũa
      for (let i = 0; i < 3; i++) { const a2 = t * 4 + i * 2.1; px(ctx, Math.round(Math.cos(a2) * 9), Math.round(-12 + Math.sin(a2) * 3), 2, 2, '#ffd23f'); }
      for (const bx of [-7, 0, 7]) { disc(ctx, bx, 12, 2, '#ffffff'); }
    } else if (id === 'rabbits') {
      // đầu thỏ giận + củ cà rốt
      px(ctx, -7, -16, 4, 10, OUT); px(ctx, -6, -15, 2, 8, '#ffb3c8'); px(ctx, 3, -16, 4, 10, OUT); px(ctx, 4, -15, 2, 8, '#ffb3c8');
      disc(ctx, 0, -2, 8, OUT); disc(ctx, 0, -2, 7, '#ffffff');
      px(ctx, -4, -4, 2, 2, '#ff2a3d'); px(ctx, 2, -4, 2, 2, '#ff2a3d'); px(ctx, -5, -6, 3, 1, OUT); px(ctx, 2, -6, 3, 1, OUT);
      px(ctx, -1, 1, 2, 3, '#ffffff'); px(ctx, -2, 0, 4, 1, OUT);
      px(ctx, -2, 9, 5, 7, OUT); px(ctx, -1, 9, 3, 5, '#ff8a3f'); px(ctx, -1, 7, 3, 2, '#6bff7a');
    } else {
      const a0 = el * 6;
      ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 4; i++) { const a2 = a0 + (i * Math.PI) / 4; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(Math.cos(a2) * 9, Math.sin(a2) * 9); ctx.lineTo(-Math.cos(a2) * 9, -Math.sin(a2) * 9); ctx.stroke(); }
      disc(ctx, 0, 0, 2, '#d7263d');
      px(ctx, -1, -15, 3, 4, '#d7263d');   // kim chỉ
    }
  }
  // 1 lưỡi lửa pixel cao h (chân ở x, y): viền đỏ sẫm, thân cam, lõi vàng, đỉnh đung đưa theo thời gian
  function flame(ctx, x, y, h, t, seed) {
    const { px } = SP();
    if (h < 2) return;
    const sw = Math.round(Math.sin(t * 11 + seed * 2.3) * Math.min(2, h / 5)), w = h > 7 ? 5 : 3;
    for (let j = 0; j < h; j++) {
      const k = j / h, off = Math.round(sw * k * k), ww = Math.max(1, Math.round(w * (1 - k * 0.8)));
      px(ctx, x - (ww >> 1) + off, y - j, ww, 1, k > 0.75 ? '#d7263d' : '#ff6a1f');
      if (k < 0.7 && ww > 2) px(ctx, x - (ww >> 1) + off + 1, y - j, ww - 2, 1, k < 0.35 ? '#ffe14f' : '#ffb03d');
    }
    if (Math.floor(t * 9 + seed) % 5 === 0) px(ctx, x + sw, y - h - 2, 1, 1, '#ffd23f');   // tàn lửa bắn lên
  }
  // ĐŨA KHỔNG LỒ: tay Big Mama thứ i (0 bên trái, 1 bên phải) cầm đũa — tay phía chỗ gắp (tx) để đũa không vắt qua mặt bà; đầu đũa trên tay bà
  function chopHand(g, i, tx) { const st = SFC.MatchMods.K.chopsticks.seat(g, i); return { x: st.x + (tx < st.x ? -20 : 20), y: st.y - 46 }; }
  // mũi đũa của 1 vật thể đũa đang ở đâu (x): chopstrike = chỗ cố định, chopaim / chopcarry = người đang bị nhắm / gắp
  function chopTipX(g, q) { if (q.kind === 'chopstrike') return q.x; const v = byId(g, q.a); return v ? v.x : q.x; }
  // đôi đũa gỗ sơn đỏ từ tay (hx, hy) tới mũi (tx, ty), 2 mũi cách nhau 2 x open px; bóng đổ trên sân dưới mũi đũa (gy = mặt sân, null = không vẽ)
  function chopsticks(ctx, hx, hy, tx, ty, open, gy) {
    const { ellipse } = SP(), OUT = SP().OUT, len = Math.hypot(tx - hx, ty - hy) || 1, nx = -(ty - hy) / len, ny = (tx - hx) / len;
    if (gy != null) {
      const sh = U2.clamp(1 - (gy - ty) / 80, 0.25, 1);
      ctx.globalAlpha *= 0.55; ellipse(ctx, tx, gy, 6 + open, 2.5, '#000000');
      ctx.globalAlpha /= 0.55;
      ctx.strokeStyle = 'rgba(0,0,0,' + (0.28 * sh).toFixed(2) + ')'; ctx.lineWidth = 2;
      for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(tx + sd * open, gy); ctx.lineTo(tx + sd * open + (hx - tx) * 0.12, gy - 4); ctx.stroke(); }
    }
    ctx.lineCap = 'round';
    for (const sd of [-1, 1]) {
      const ax = hx + nx * sd * 2.5, ay = hy + ny * sd * 2.5, bx = tx + sd * open, by = ty;
      const mx = ax + (bx - ax) * 0.16, my = ay + (by - ay) * 0.16;   // phần sơn đỏ ở đầu cầm
      for (const [w, col] of [[6, OUT], [4, '#d9a45a'], [1.5, '#f3d08a']]) {
        ctx.strokeStyle = col; ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      }
      ctx.strokeStyle = '#d7263d'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(mx, my); ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }
  // sợi mì dày (vàng mì trứng, viền tối, ánh sáng) theo các điểm pts [[x, y], ...]
  function noodle(ctx, pts, col, t) {
    for (const [w, c] of [[4, SP().OUT], [2, col], [1, '#fff3b0']]) {
      ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath();
      pts.forEach(([px2, py2], i) => (i ? ctx.lineTo(px2, py2 - (w === 1 ? 0.5 : 0)) : ctx.moveTo(px2, py2 - (w === 1 ? 0.5 : 0))));
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }
  // vòng mì (thòng lọng) hình elip tâm (x, y), bán kính rx, ry, mép gợn sóng
  function noodleRing(ctx, x, y, rx, ry, col, t) {
    const pts = [];
    for (let i = 0; i <= 20; i++) { const a = (i / 20) * Math.PI * 2, w = 1 + Math.sin(a * 5 + t * 10) * 0.08; pts.push([x + Math.cos(a) * rx * w, y + Math.sin(a) * ry * w]); }
    noodle(ctx, pts, col, t);
  }
  let darkCv = null;
  const U2 = { clamp: (v, a, b) => Math.max(a, Math.min(b, v)) };
  const byId = (g, id) => g.players.find((q) => q.id === id) || null;

  const ModDraw = {
    kinds: { flock: 1, splatfall: 1, splat: 1, wind: 1, graffitiwarn: 1, graffiti: 1, lantern: 1, flames: 1, burn: 1, lassoswing: 1, lassofly: 1, tied: 1, fakeball: 1, dark: 1, tarot: 1, rabbit: 1, carrot: 1, carrotheld: 1, tophat: 1, zoomies: 1, mama: 1, chopaim: 1, chopstrike: 1, chopcarry: 1, inpot: 1, seawave: 1, surf: 1, devil: 1, flung: 1, legend: 1, lateaim: 1, fused: 1, fusetrail: 1, zapline: 1, card: 1,
      stool: 1, stoolheld: 1, stoolthrow: 1, stoolfly: 1, lane: 1, moped: 1, vroom: 1, veil: 1, spot: 1, alarm: 1, owl: 1, owleyes: 1, gazelock: 1, owlbolt: 1, petrify: 1 },
    // vật thể dài chia khúc để xếp chiều sâu từng khúc với cầu thủ (render/vfx.js props): tường graffiti = 1 tấm mỗi ~8px,
    // luôn xếp từ trái sang phải (cùng chiều sâu thì vẽ theo thứ tự này: tấm sau phủ mép tấm trước)
    parts(o) {
      if (o.kind !== 'graffiti') return null;
      const n = Math.max(3, Math.round(Math.hypot(o.a - o.x, o.b - o.y) / 8)), out = [];
      const [x0, y0, x1, y1] = o.a < o.x ? [o.a, o.b, o.x, o.y] : [o.x, o.y, o.a, o.b];
      // d: chiều sâu để xếp — tường gần nằm ngang dùng chung 1 chiều sâu (tăng dần chút xíu) để luôn vẽ trái -> phải
      const flat = Math.abs(y1 - y0) < Math.abs(x1 - x0) * 0.3;
      for (let i = 0; i < n; i++) { const k = (i + 0.5) / n, y = y0 + (y1 - y0) * k; out.push({ x: x0 + (x1 - x0) * k, y, d: flat ? (y0 + y1) / 2 + i * 0.001 : y }); }
      return out;
    },
    // c: { x, y } vị trí đã tính (propAt) · k: 1 -> 0 · el: giây đã sống · fade: độ mờ vào / ra · part: khúc (parts)
    draw(ctx, g, o, c, k, el, fade, part) {
      const { px, ellipse } = SP(), t = g.time, x = Math.round(c.x), y = Math.round(c.y), f = g.field;
      switch (o.kind) {
        case 'stool':
          ellipse(ctx, x, y + 1, 7, 2.5, 'rgba(0,0,0,0.3)');
          stool(ctx, x, y, o.color);
          break;
        /* ---- Story 2–4 ---- */
        case 'flock': {   // đàn bồ câu bay ngang (vỗ cánh), bóng đổ dưới sân
          for (let i = 0; i < 6; i++) {
            const bx = x + ((i * 13) % 30) - 15, by = y + ((i * 7) % 16) - 8 + Math.sin(t * 9 + i) * 2, flap = Math.floor(t * 14 + i) % 2;
            ctx.globalAlpha = fade * 0.2; ellipse(ctx, bx, by + 48, 3, 1, '#000000'); ctx.globalAlpha = fade;
            px(ctx, bx - 2, by - 1, 5, 3, SP().OUT); px(ctx, bx - 1, by, 3, 1, o.color);
            px(ctx, bx - 4, by - (flap ? 3 : 0), 3, 1, o.color); px(ctx, bx + 2, by - (flap ? 3 : 0), 3, 1, o.color);
            px(ctx, bx + 2, by - 1, 1, 1, '#ffe14f');
          }
          break;
        }
        case 'splatfall': {   // "bom" bồ câu đang rơi: vòng trắng co lại báo chỗ rơi (a giây cuối), chấm trắng rơi từ trên xuống
          if (o.t > o.a) break;
          const k2 = 1 - o.t / o.a;
          ctx.strokeStyle = Math.floor(t * 16) % 2 ? '#ffffff' : '#9aa0a8'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.ellipse(x, y, 9 - k2 * 4, (9 - k2 * 4) * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
          px(ctx, x - 1, Math.round(y - 40 * (1 - k2)), 3, 3, '#ffffff');
          break;
        }
        case 'splat': {   // bãi phân trắng trên sân (a = hạt giống hình)
          const r0 = 5 + (o.a % 2);
          ellipse(ctx, x, y, r0 + 1, r0 * 0.55 + 1, SP().OUT);
          ellipse(ctx, x, y, r0, r0 * 0.55, '#f3ead7');
          for (let i = 0; i < 4; i++) { const a2 = o.a + i * 1.7; px(ctx, Math.round(x + Math.cos(a2) * (r0 + 2)), Math.round(y + Math.sin(a2) * (r0 * 0.55 + 1)), 2, 1, '#f3ead7'); }
          px(ctx, x - 1, y - 1, 2, 1, '#9aa0a8');
          break;
        }
        case 'wind': {   // gió: vệt trắng chạy dọc sân theo hướng x (o.x = ±1); a giây đầu là báo trước (vệt thưa, mờ)
          const warn = el < o.a, n = warn ? 10 : 28;
          ctx.globalAlpha = fade * (warn ? 0.35 : 0.7);
          for (let i = 0; i < n; i++) {
            const sp = 260 + (i * 37) % 120, len = 10 + (i * 11) % 14;
            const lx = f.x + ((((el * sp + i * 97) % (f.w + 60)) + f.w + 60) % (f.w + 60)) - 30;
            const wx = o.x > 0 ? lx : f.x + f.w - (lx - f.x), wy = f.y + 6 + (i * 53) % (f.h - 12);
            px(ctx, Math.round(o.x > 0 ? wx - len : wx), wy, len, 1, o.color);
          }
          break;
        }
        case 'graffitiwarn': {   // tường sơn sắp phun: bình xịt bay dọc đường tường, để lại vệt chấm sơn + sương sơn
          const k2 = Math.min(1, el / o.max), tx = Math.round(o.x + (o.a - o.x) * k2), ty = Math.round(o.y + (o.b - o.y) * k2);
          ctx.strokeStyle = o.color; ctx.lineWidth = 2; ctx.setLineDash([2, 3]);
          ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(tx, ty); ctx.stroke();
          ctx.setLineDash([]);
          for (let i = 0; i < 5; i++) { ctx.globalAlpha = fade * 0.6; px(ctx, tx + Math.round(Math.random() * 8 - 4), ty - 4 + Math.round(Math.random() * 6 - 3), 1, 1, o.color); }
          ctx.globalAlpha = fade;
          const OUT = SP().OUT, wob = Math.floor(t * 20) % 2;
          px(ctx, tx - 2, ty - 17 + wob, 5, 10, OUT); px(ctx, tx - 1, ty - 16 + wob, 3, 8, o.color);
          px(ctx, tx - 1, ty - 13 + wob, 3, 1, '#ffffff'); px(ctx, tx - 1, ty - 18 + wob, 3, 2, '#e8ecf5');
          break;
        }
        case 'graffiti': {   // tường graffiti: dãy tấm bê tông phun sơn (panel), mỗi tấm xếp chiều sâu riêng (parts); không có part = vẽ cả dãy
          const P = this.parts(o), flat = Math.abs(o.b - o.y) < Math.abs(o.a - o.x) * 0.3;
          const one = (i) => panel(ctx, Math.round(P[i].x), Math.round(P[i].y), o.color, i, el, o.id, flat && i > 0);
          if (part == null) { for (let i = 0; i < P.length; i++) one(i); break; }
          one(part);
          break;
        }
        case 'lantern': {   // đèn lồng rơi: bóng đổ to dần trong a giây, đèn rơi từ trên xuống; chạm đất thì vỡ nằm đó
          const fall = Math.min(1, el / o.a), ly = Math.round(y - 70 * (1 - fall * fall));
          if (el < o.a) {
            ctx.globalAlpha = fade * (0.25 + 0.3 * fall); ellipse(ctx, x, y, 6 + 10 * fall, (6 + 10 * fall) * 0.45, '#000000');
            ctx.strokeStyle = '#ff9a3d'; ctx.lineWidth = 1; ctx.globalAlpha = fade * (Math.floor(t * 14) % 2 ? 0.9 : 0.4);
            ctx.beginPath(); ctx.ellipse(x, y, 18, 8, 0, 0, Math.PI * 2); ctx.stroke();
            ctx.globalAlpha = fade;
            px(ctx, x, ly - 30, 1, 20, '#1a1216');
          }
          const broke = el >= o.a, ox = broke ? 2 : 0;
          px(ctx, x - 6, (broke ? y - 6 : ly - 12), 12, broke ? 6 : 12, SP().OUT);
          px(ctx, x - 5, (broke ? y - 5 : ly - 11), 10 - ox, broke ? 4 : 10, o.color);
          if (!broke) { px(ctx, x - 3, ly - 13, 6, 2, '#ffd23f'); px(ctx, x - 3, ly - 1, 6, 2, '#ffd23f'); ctx.globalAlpha = fade * 0.35; ellipse(ctx, x, ly - 6, 10, 10, '#ffe14f'); }
          break;
        }
        /* ---- Story 3 (user 2026-10-23) ---- */
        case 'flames': {   // đốm lửa đèn lồng để lại (a = bán kính): vệt cháy sém + lưỡi lửa bập bùng, nhỏ dần lúc sắp tắt
          const r0 = o.a, s = Math.min(1, k * 4);
          ctx.globalAlpha = fade * 0.55; ellipse(ctx, x, y, r0, r0 * 0.45, '#2a1408');
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = fade * (0.3 + 0.1 * Math.sin(t * 13)); ellipse(ctx, x, y - 2, r0 + 3, r0 * 0.6, '#ff6a1f');
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = fade;
          // 2 hàng lưỡi lửa (hàng sau thấp, hàng trước cao), mỗi lưỡi cao thấp riêng
          for (const [row, dy, n0] of [[0, -2, 4], [1, 1, 5]]) {
            for (let i = 0; i < n0; i++) {
              const fx2 = Math.round(x - r0 + 3 + (i + (row ? 0 : 0.5)) * ((r0 * 2 - 6) / (n0 - 1 + (row ? 0 : 1)))), sd = i * 3 + row * 7;
              const h = Math.round(s * ((row ? 8 : 6) + 4 * Math.abs(Math.sin(t * (7 + i) + sd)) - Math.abs(fx2 - x) * 0.25));
              flame(ctx, fx2, Math.round(y + dy), h, t, sd);
            }
          }
          if (Math.random() < 0.5) px(ctx, x + Math.round((Math.random() - 0.5) * r0 * 2), y - 10 - Math.round(Math.random() * 10), 1, 1, '#ffd23f');
          break;
        }
        case 'burn': {   // bắt lửa: đứng lại phủi phủi dập lửa (2 tay đập luân phiên lên ngực / đùi, nhún nhảy), lửa trên người nhỏ dần (sprite thật bị ẩn — hides)
          const q = byId(g, o.a);
          if (!q) break;
          const ph = Math.floor(el * 9) % 2, hop = Math.floor(el * 9) % 4 === 0 ? 1 : 0, heat = Math.max(0, 1 - el / Math.max(0.1, o.max - 0.3));
          const arms = ph ? [[4, 1], [-1, 6]] : [[1, 6], [-4, 1]];
          SP().drawPlayer(ctx, Object.assign({}, q, { x, y: y - hop, vx: 0, vy: 0, state: 'normal', atkType: null, keeper: false, charging: false,
            celPose: { arms, eyes: 'closed', mouth: true } }), g, 0.999);
          // lửa trên người: đỉnh đầu, vai, chỗ vừa phủi
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 0.35 * heat; ellipse(ctx, x, y - 12, 9, 10, '#ff6a1f');
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = 1;
          for (const [dx, dy, n, sd] of [[0, -22, 9, 1], [-4, -16, 6, 2], [4, -15, 7, 3], [ph ? 3 : -3, -8, 4, 4], [-2, -3, 4, 5]]) {
            flame(ctx, x + dx, y + dy - hop, Math.round(n * heat * (0.75 + 0.25 * Math.abs(Math.sin(t * 15 + sd)))), t, sd);
          }
          // tay vừa phủi: bụi lửa bắn ra
          if (Math.floor(el * 9) !== Math.floor((el - 1 / 60) * 9)) for (let i = 0; i < 3; i++) px(ctx, x + (ph ? 6 : -6) + Math.round((Math.random() - 0.5) * 6), y - 10 - Math.round(Math.random() * 6), 1, 1, '#ffd23f');
          // khói bốc lên
          for (let i = 0; i < 3; i++) {
            const p2 = (el * 1.4 + i / 3) % 1;
            ctx.globalAlpha = (1 - p2) * 0.6;
            px(ctx, Math.round(x - 4 + i * 4 + Math.sin(t * 4 + i) * 2), Math.round(y - 28 - p2 * 16), 2, 2, '#9aa0a8');
          }
          ctx.globalAlpha = 1;
          break;
        }
        case 'lassoswing': {   // Noodle Kicker đứng tấn (chân dạng), 1 tay bưng tô mì, tay kia giơ cao quay vòng mì to dần trên đầu (a = người quăng, b = người bị nhắm);
                               // vạch ngắm nhấp nháy tới chân người bị nhắm, sắp quăng thì vòng mì loé trắng (sprite thật bị ẩn — hides)
          const q = byId(g, o.a), v = byId(g, o.b), OUT = SP().OUT;
          if (!q) break;
          const sd = Math.cos(q.facing) >= 0 ? 1 : -1, sp = t * 14, late = o.t < 0.35;
          const up = [sd, -6, sd * 2 + Math.round(Math.cos(sp) * 2), -13 + Math.round(Math.sin(sp))], bowl = [sd * 3, 1];
          if (v && (late || Math.floor(t * 8) % 2)) {
            ctx.globalAlpha = fade * 0.8; ctx.strokeStyle = late ? '#ffffff' : o.color; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.lineDashOffset = -t * 40;
            ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(v.x, v.y - 6); ctx.stroke(); ctx.setLineDash([]);
            ctx.globalAlpha = fade; ctx.strokeStyle = '#ff6a3d'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.ellipse(Math.round(v.x), Math.round(v.y + 1), 11, 5, 0, 0, Math.PI * 2); ctx.stroke();
          }
          ctx.globalAlpha = 1;
          SP().drawPlayer(ctx, Object.assign({}, q, { x, y, vx: 0, vy: 0, state: 'normal', atkType: null, keeper: false, charging: false,
            celPose: { arms: sd > 0 ? [bowl, up] : [up, bowl], legs: 'split', mouth: late } }), g, 0.999);
          // tô mì trên tay
          const bx = x + (sd > 0 ? -5 : 5) + bowl[0], by2 = y - 6 + bowl[1];
          px(ctx, bx - 4, by2 - 2, 9, 5, OUT); px(ctx, bx - 3, by2, 7, 2, '#d7263d'); px(ctx, bx - 3, by2 - 1, 7, 1, '#ffd86b');
          // vòng mì quay trên tay giơ cao, to dần
          const hx = x + (sd > 0 ? 5 : -5) + up[2], hy = y - 8 + up[3], rr = 5 + 9 * Math.min(1, el / 0.6), cy = hy - 5;
          const ex = hx + Math.cos(sp) * rr, ey = cy + Math.sin(sp) * rr * 0.4;
          noodle(ctx, [[hx, hy], [(hx + ex) / 2 + 1, (hy + ey) / 2 - 1], [ex, ey]], late ? '#ffffff' : o.color, t);
          noodleRing(ctx, hx, cy, rr, rr * 0.4, late ? '#ffffff' : o.color, t);
          for (let i = 1; i <= 3; i++) { const a2 = sp - i * 0.4; ctx.globalAlpha = 0.5 - i * 0.12; px(ctx, Math.round(hx + Math.cos(a2) * (rr + 3)), Math.round(cy + Math.sin(a2) * (rr + 3) * 0.4), 2, 1, '#ffffff'); }
          ctx.globalAlpha = 1;
          break;
        }
        case 'lassofly': {   // vòng mì đang bay (góc a, tốc độ b): vòng mì to + sợi mì dày uốn lượn kéo về phía người quăng, giọt nước dùng văng
          const ux = Math.cos(o.a), uy = Math.sin(o.a), len = Math.min(80, Math.hypot(x - o.x, y - o.y)), pts = [];
          for (let i = 0; i <= 12; i++) {
            const d = (len * i) / 12, wv = Math.sin(i * 1.1 - t * 28) * 3 * (i / 12);
            pts.push([x - ux * d - uy * wv, y - 16 - uy * d + ux * wv]);
          }
          noodle(ctx, pts, o.color, t);
          noodleRing(ctx, x + ux * 7, y - 16 + uy * 7, 10, 5, o.color, t);
          ctx.globalAlpha = fade * 0.3; ellipse(ctx, x + ux * 7, y + uy * 7, 10, 3, '#000000');
          ctx.globalAlpha = fade;
          if (Math.random() < 0.5) px(ctx, Math.round(x - ux * 10 + (Math.random() - 0.5) * 8), Math.round(y - 12 + Math.random() * 6), 1, 1, '#fff3b0');
          break;
        }
        case 'tied': {   // bị trói mì: 2 tay ép sát người, 3 vòng mì quấn quanh thân, người nghiêng theo lần vùng gần nhất (hướng mặt), run run;
                         // người chơi đang điều khiển người này: mũi tên ◀ ▶ nhấp nháy trên đầu nhắc vùng trái / phải (sprite thật bị ẩn — hides)
          const q = byId(g, o.a), OUT = SP().OUT;
          if (!q) break;
          const sd = Math.cos(q.facing) >= 0 ? 1 : -1, jit = Math.sin(t * 40) * 0.05;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(sd * 0.2 + jit);
          SP().drawPlayer(ctx, Object.assign({}, q, { x: 0, y: 0, vx: 0, vy: 0, state: 'normal', atkType: null, keeper: false, charging: false,
            celPose: { arms: [[1, 5], [-1, 5]], eyes: 'closed', mouth: Math.floor(t * 6) % 2 === 0 } }), g, 0.999);
          // 3 vòng mì dày quấn quanh thân (gợn sóng như sợi mì), 2 đầu sợi lòng thòng đung đưa
          for (let i = 0; i < 3; i++) {
            const cy = -13 + i * 4;
            px(ctx, -8, cy - 1, 16, 4, OUT);
            for (let xx = -7; xx < 8; xx++) { const w = Math.round(Math.sin(xx * 0.9 + i * 2) * 0.6); px(ctx, xx, cy + w, 1, 2, o.color); if ((xx + i) % 4 === 0) px(ctx, xx, cy + w, 1, 1, '#fff3b0'); }
          }
          noodle(ctx, [[7, -6], [9, -3 + Math.sin(t * 6)], [8, 1]], o.color, t);
          noodle(ctx, [[-7, -9], [-10, -6 + Math.sin(t * 5 + 1)], [-9, -2]], o.color, t);
          ctx.restore();
          // mồ hôi
          const sw = (t * 2) % 1;
          ctx.globalAlpha = 1 - sw; px(ctx, x - sd * 8, Math.round(y - 22 + sw * 8), 1, 2, '#bdf4ff');
          ctx.globalAlpha = 1;
          if (q === g.controlled) {
            const on = Math.floor(t * 8) % 2, ay = y - 40;
            for (const s2 of [-1, 1]) {   // tam giác chĩa ra 2 bên
              const ax = x + s2 * (on ? 13 : 11);
              for (let i = 0; i < 4; i++) { const h = (3 - i) * 2 + 1; px(ctx, ax + s2 * i - 1, ay - (3 - i) - 1, 3, h + 2, OUT); }
              for (let i = 0; i < 4; i++) { const h = (3 - i) * 2 + 1; px(ctx, ax + s2 * i, ay - (3 - i), 1, h, '#ffffff'); }
            }
          }
          break;
        }
        case 'fakeball': {   // bóng giả (THE MAGICIAN): vẽ y hệt bóng thật (cùng skin / hiệu ứng), lăn theo MatchMods.at
          const C = SFC_CONFIG.stories.mods.fortune.magician, v = o.b * Math.exp(-C.drag * el);
          SP().drawBall(ctx, Object.assign({}, g.ball, { x: c.x, y: c.y, z: 0, vx: Math.cos(o.a) * v, vy: Math.sin(o.a) * v, owner: null, roll: el * v * 0.25 }), fade);
          break;
        }
        case 'dark': {   // THE MOON: tắt đèn cả sân, chỉ còn vầng sáng quanh người đội bạn (a = đội) + quanh bóng; mắt Fortune Tellers (b) sáng trong tối
          const C = SFC_CONFIG.stories.mods.fortune.moon, m = 40, W = f.w + m * 2, H = f.h + m * 2;
          if (!darkCv) darkCv = document.createElement('canvas');
          if (darkCv.width !== W || darkCv.height !== H) { darkCv.width = W; darkCv.height = H; }
          const d = darkCv.getContext('2d'), ox = f.x - m, oy = f.y - m;
          d.globalCompositeOperation = 'source-over';
          d.clearRect(0, 0, W, H);
          d.fillStyle = `rgba(5,4,12,${0.9 * fade})`; d.fillRect(0, 0, W, H);
          d.globalCompositeOperation = 'destination-out';
          const hole = (hx, hy, r) => {
            const gr = d.createRadialGradient(hx - ox, hy - oy, r * 0.35, hx - ox, hy - oy, r);
            gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
            d.fillStyle = gr; d.beginPath(); d.arc(hx - ox, hy - oy, r, 0, Math.PI * 2); d.fill();
          };
          for (const p2 of g.teams[o.a].players) hole(p2.x, p2.y - 10, C.light);
          hole(g.ball.x, g.ball.y - g.ball.z, C.ballLight);
          ctx.globalAlpha = 1;
          ctx.drawImage(darkCv, ox, oy);
          // trăng khuyết trên trời + mắt Tellers
          ctx.globalAlpha = fade;
          SP().disc(ctx, f.x + f.w - 24, f.y - 18, 7, '#fff3b0'); SP().disc(ctx, f.x + f.w - 21, f.y - 20, 6, '#05040c');
          for (const p2 of g.teams[o.b].players) {
            const ex = Math.round(p2.x) + (Math.cos(p2.facing) >= 0 ? 1 : -1), ey = Math.round(p2.y) - 17, blink = Math.floor(t * 3 + p2.id) % 7 === 0;
            if (blink) continue;
            ctx.globalCompositeOperation = 'lighter'; ellipse(ctx, ex, ey, 5, 2.5, 'rgba(255,210,63,0.25)'); ctx.globalCompositeOperation = 'source-over';
            px(ctx, ex - 3, ey, 2, 1, '#ffe14f'); px(ctx, ex + 1, ey, 2, 1, '#ffe14f');
          }
          break;
        }
        case 'tarot': {   // Madame Fate rút bài (a = số thứ tự lá trong config): bộ bài bay từ tay bà lên giữa trên sân (0.3s), xào 2 lượt (1s: chia 2 nửa
                          // rồi xen kẽ gộp lại), lá trên cùng nhấc lên + lật mặt (0.45s), các lá còn lại rơi xuống mờ đi; hiện tên + gợi ý tới hết
          const C = SFC_CONFIG.stories.mods.fortune, card = C.cards[o.a] || C.cards[0];
          const tx = f.cx, ty = f.y + 48, W2 = 26, H2 = 38, N = 6;
          const FLY = 0.3, SH = 1.0, LIFT = 0.15, FLIP = 0.4, t1 = FLY + SH, t2 = t1 + LIFT, t3 = t2 + FLIP;
          ctx.globalAlpha = fade;
          if (el < FLY) {   // bộ bài bay lên, to dần
            const k2 = el / FLY, e2 = 1 - (1 - k2) * (1 - k2);
            const cx = o.x + (tx - o.x) * e2, cy = o.y - 20 + (ty - o.y + 20) * e2 - Math.sin(k2 * Math.PI) * 30;
            for (let i = N - 1; i >= 0; i--) tarotBack(ctx, cx, cy - i, 0.45 + 0.55 * e2, 1, 0);
            break;
          }
          if (el < t1) {   // xào: 2 lượt chia đôi rồi xen kẽ
            const u = (el - FLY) / SH, ph = (u * 2) % 1, sp2 = Math.sin(ph * Math.PI) * 17;
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = fade * 0.25; ellipse(ctx, tx, ty, 34, 26, '#9d7bff');
            ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = fade;
            const order = [...Array(N).keys()];
            if (ph > 0.5) order.reverse();
            for (const i of order) {
              const side = i % 2 ? 1 : -1, rise = ph > 0.5 ? Math.round((ph - 0.5) * 2 * (i % 3)) : 0;
              tarotBack(ctx, tx + side * sp2 * (0.6 + 0.08 * i), ty - i - rise, 1, 1, side * 0.18 * Math.sin(ph * Math.PI));
            }
            if (Math.floor(t * 20) % 2) px(ctx, tx + Math.round((Math.random() - 0.5) * 50), ty - 22 + Math.round(Math.random() * 6), 1, 1, '#ffd23f');
            break;
          }
          // các lá còn lại tụt xuống, mờ dần
          const rest = Math.max(0, 1 - (el - t1) / 0.5);
          if (rest > 0) { ctx.globalAlpha = fade * rest; for (let i = N - 2; i >= 0; i--) tarotBack(ctx, tx, ty + (1 - rest) * 16 - i, 1, 1, 0); ctx.globalAlpha = fade; }
          const lift = Math.min(1, (el - t1) / LIFT) * 10, fl = U2.clamp((el - t2) / FLIP, 0, 1), face = fl >= 0.5;
          const sx = Math.max(0.08, Math.abs(Math.cos(fl * Math.PI))), bob = face ? Math.round(Math.sin(t * 3) * 1.5) : 0, cy = ty - lift + bob;
          if (!face) { tarotBack(ctx, tx, cy, 1, sx, 0); break; }
          ctx.save();
          ctx.translate(tx, cy);
          ctx.scale(sx, 1);
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = fade * (0.25 + 0.1 * Math.sin(t * 6)); ellipse(ctx, 0, 0, 24, 28, '#9d7bff');
          ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = fade;
          px(ctx, -W2 / 2 - 1, -H2 / 2 - 1, W2 + 2, H2 + 2, SP().OUT);
          px(ctx, -W2 / 2, -H2 / 2, W2, H2, '#ffd23f');
          px(ctx, -W2 / 2 + 1, -H2 / 2 + 1, W2 - 2, H2 - 2, '#1c1238');
          tarotArt(ctx, card.id, el, t);
          ctx.restore();
          if (el >= t3) {
            SFC.VFX.text(ctx, card.name, tx, cy + H2 / 2 + 10, 12, '#ffd23f');
            SFC.VFX.text(ctx, card.hint, tx, cy + H2 / 2 + 22, 9, '#ffffff');
          }
          break;
        }
        case 'rabbit': {   // thỏ hung dữ: nhảy vòng cung từ (x, y) tới (a, b) trong hop giây (MatchMods.at), tai dựng, mắt đỏ, nhe răng
          if (o.off) break;
          const HOP = SFC_CONFIG.stories.mods.fortune.rabbits.hop, k2 = Math.min(1, el / HOP), z = Math.round(Math.sin(k2 * Math.PI) * 7), OUT = SP().OUT;
          const dir = o.a >= o.x ? 1 : -1, yy = y - z;
          ctx.globalAlpha = 1;
          ellipse(ctx, x, y + 1, 5 - z * 0.2, 2, 'rgba(0,0,0,0.35)');
          px(ctx, x - 5, yy - 8, 10, 8, OUT); px(ctx, x - 4, yy - 7, 8, 6, '#f3f3f3');                        // thân
          px(ctx, x - dir * 5 - 1, yy - 6, 3, 3, OUT); px(ctx, x - dir * 5, yy - 5, 1, 1, '#ffffff');           // đuôi bông
          const hx = x + dir * 4;
          px(ctx, hx - 3, yy - 13, 7, 7, OUT); px(ctx, hx - 2, yy - 12, 5, 5, '#ffffff');                       // đầu
          const flop = k2 < 1 ? 1 : 0;
          for (const ex of [-1, 1]) { px(ctx, hx + ex * 2 - 1 + (ex > 0 ? flop : 0), yy - 20, 3, 8, OUT); px(ctx, hx + ex * 2 + (ex > 0 ? flop : 0), yy - 19, 1, 6, '#ffb3c8'); }   // tai
          px(ctx, hx + dir, yy - 11, 1, 1, '#ff2a3d');                                                         // mắt đỏ
          px(ctx, hx - 1 + dir, yy - 11, 2, 1, Math.floor(t * 6 + o.id) % 2 ? '#ff2a3d' : OUT);                // lông mày giận
          px(ctx, hx + dir * 2, yy - 8, 1, 1, '#ffffff'); px(ctx, hx + dir * 2 - dir, yy - 8, 1, 1, OUT);      // răng
          break;
        }
        case 'carrot': case 'carrotheld': {   // củ cà rốt: nằm trên sân (nhảy nhẹ, vòng sáng cam) hoặc giơ trên đầu người cầm (a = id)
          if (o.off) break;
          const held = o.kind === 'carrotheld', q = held ? byId(g, o.a) : null, OUT = SP().OUT;
          const cx = x, cy = held && q ? y - 34 * (q.sizeMul || 1) + Math.round(Math.sin(t * 8)) : y - 4 - Math.round(Math.abs(Math.sin(t * 4)) * 3);
          ctx.globalAlpha = 1;
          if (!held) {
            ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.3 + 0.15 * Math.sin(t * 8); ellipse(ctx, x, y, 11, 5, '#ff8a3f');
            ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
            ellipse(ctx, x, y + 1, 5, 2, 'rgba(0,0,0,0.35)');
          }
          px(ctx, cx - 3, cy - 3, 7, 10, OUT); px(ctx, cx - 2, cy - 2, 5, 3, '#ff8a3f'); px(ctx, cx - 1, cy + 1, 3, 3, '#ff8a3f'); px(ctx, cx, cy + 4, 1, 2, '#ff8a3f');
          px(ctx, cx - 1, cy - 1, 1, 1, '#ffc08a'); px(ctx, cx, cy + 2, 2, 1, '#d4621f');
          px(ctx, cx - 3, cy - 8, 7, 6, OUT); px(ctx, cx - 2, cy - 7, 1, 4, '#6bff7a'); px(ctx, cx, cy - 8, 1, 5, '#3fcf5a'); px(ctx, cx + 2, cy - 7, 1, 4, '#6bff7a');   // lá
          break;
        }
        case 'tophat': {   // THE RABBITS: mũ ảo thuật bật ra dưới chân Madame Fate, thỏ nhảy ra rồi mũ tan
          const OUT = SP().OUT, pop2 = Math.min(1, el / 0.15), hy = y - 4;
          ellipse(ctx, x, y + 1, 9, 3, 'rgba(0,0,0,0.35)');
          px(ctx, x - 9, hy - 1, 18, 4, OUT); px(ctx, x - 8, hy, 16, 2, '#2a2a3a');
          const h2 = Math.round(10 * pop2);
          px(ctx, x - 6, hy - h2 - 1, 12, h2 + 1, OUT); px(ctx, x - 5, hy - h2, 10, h2, '#2a2a3a'); px(ctx, x - 5, hy - 3, 10, 2, '#d7263d');
          for (let i = 0; i < 4; i++) { const a2 = t * 5 + i * 1.6; px(ctx, Math.round(x + Math.cos(a2) * 12), Math.round(hy - 14 + Math.sin(a2) * 4), 1, 1, '#ffd23f'); }
          break;
        }
        case 'zoomies': {   // THE WHEEL: vệt tốc độ vàng kéo sau người đang chạy nhanh (a = id)
          const q = byId(g, o.a);
          if (!q) break;
          const sp = Math.hypot(q.vx || 0, q.vy || 0);
          if (sp < 20) break;
          const ux = q.vx / sp, uy = q.vy / sp;
          for (let i = 0; i < 4; i++) {
            const ph = (t * 6 + i / 4) % 1, ox = -uy * (i - 1.5) * 4, oy = ux * (i - 1.5) * 3;
            ctx.globalAlpha = fade * (1 - ph) * 0.8;
            px(ctx, Math.round(x - ux * (8 + ph * 14) + ox), Math.round(y - 8 - uy * (8 + ph * 14) + oy), Math.max(1, Math.round(Math.abs(ux) * 5)), Math.max(1, Math.round(Math.abs(uy) * 4)), o.color);
          }
          break;
        }
        case 'mama': {   // Market Mamas: Big Mama khổng lồ thứ o.a (0 trái: tóc bạc, tạp dề xanh lá · 1 phải: tóc đen, tạp dề cam) ngồi trên khán đài
                         // (x = chỗ ngồi, MatchMods K.chopsticks.seat) sau nồi mì khổng lồ, cả trận. Bình thường quấy nồi bằng đũa con + phe phẩy quạt;
                         // đang vươn đũa khổng lồ (prop chopaim / chopstrike / chopcarry của bà, mã bà ở b / a) thì giơ tay phía giữa sân lên, trừng mắt nhìn chỗ gắp,
                         // đầu bốc khói. Người trong nồi của bà (prop 'inpot', b = mã bà) ló đầu đội sợi mì trên mặt nước dùng
          const OUT = SP().OUT, P = g.effects.V.props, me = o.a;
          const chops = P.filter((q) => (q.kind === 'chopaim' || q.kind === 'chopstrike' || q.kind === 'chopcarry') && q.t > 0 && (q.kind === 'chopstrike' ? q.a : q.b) === me);
          const mad = chops.length > 0, tipX = mad ? chopTipX(g, chops[0]) : 0, up = new Set(mad ? [tipX < o.x ? 0 : 1] : []);
          const look = chops[0] ? (chops[0].kind === 'chopstrike' ? { x: chops[0].x, y: chops[0].y } : byId(g, chops[0].a)) : null;
          const cx = Math.round(o.x), bob = mad ? 0 : Math.round(Math.sin(t * 2 + me * 2) * 0.6), cy = Math.round(o.y - 30) + bob;
          const skin = me ? '#c98a5a' : '#b8784a', hair = me ? '#2a2024' : '#c7ccd6', top = me ? '#8a3f8f' : '#2f6fb8', apron = me ? o.color : '#6bbf45';
          // thân (áo bà ba tím) + tạp dề cam
          ellipse(ctx, cx, cy + 16, 28, 11, OUT); ellipse(ctx, cx, cy + 16, 27, 10, top);
          px(ctx, cx - 12, cy + 9, 24, 14, OUT); px(ctx, cx - 11, cy + 10, 22, 13, apron); px(ctx, cx - 11, cy + 10, 22, 1, light(apron, 0.4));
          // đầu, tóc búi cài trâm, má
          ellipse(ctx, cx, cy - 1, 12, 11, OUT); ellipse(ctx, cx, cy - 1, 11, 10, skin);
          ellipse(ctx, cx, cy - 8, 11, 5, hair); ellipse(ctx, cx, cy - 15, 5, 4, OUT); ellipse(ctx, cx, cy - 15, 4, 3, hair); px(ctx, cx + 2, cy - 19, 1, 7, '#ffd23f');
          ctx.globalAlpha = fade * (mad ? 0.7 : 0.35); ellipse(ctx, cx - 7, cy + 3, 3, 2, '#ff3d5a'); ellipse(ctx, cx + 7, cy + 3, 3, 2, '#ff3d5a'); ctx.globalAlpha = fade;
          const tg = look || g.ball.owner || g.ball, lx = U2.clamp((tg.x - cx) / 120, -1, 1), ly = U2.clamp((tg.y - cy) / 160, 0, 1);
          for (const sd of [-1, 1]) {
            const ex = cx + sd * 5;
            px(ctx, ex - 2, cy - 2, 4, 3, '#ffffff'); px(ctx, ex - 1 + Math.round(lx), cy - 2 + Math.round(ly), 2, 2, '#1a1216');
            if (mad) { px(ctx, ex - 3, cy - 5 + (sd > 0 ? 0 : 1), 3, 1, hair); px(ctx, ex, cy - 4 - (sd > 0 ? 0 : 1), 3, 1, hair); }
            else px(ctx, ex - 2, cy - 5, 4, 1, hair);
          }
          if (mad) { px(ctx, cx - 4, cy + 4, 8, 3, OUT); px(ctx, cx - 3, cy + 5, 6, 1, '#ffffff'); px(ctx, cx + 1, cy + 5, 1, 1, '#ffd23f'); }
          else { px(ctx, cx - 3, cy + 5, 6, 1, '#7a3a2a'); px(ctx, cx - 4, cy + 4, 1, 1, '#7a3a2a'); px(ctx, cx + 3, cy + 4, 1, 1, '#7a3a2a'); }
          // tay: tay đang cầm đũa khổng lồ giơ lên tới chỗ cầm đũa (chopHand) · tay rảnh: tay trái quấy nồi bằng đũa con, tay phải phe phẩy quạt
          for (const i of [0, 1]) {
            const sd = i ? 1 : -1, sx = cx + sd * 15, sy = cy + 10;
            if (up.has(i)) {
              const H = chopHand(g, me, tipX);
              ctx.lineCap = 'round';
              ctx.strokeStyle = OUT; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(H.x, H.y); ctx.stroke();
              ctx.strokeStyle = skin; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(H.x, H.y); ctx.stroke();
              ctx.lineCap = 'butt';
            } else if (mad || i === (me ? 1 : 0)) {   // tay còn lại quấy nồi (lúc rảnh: tay phía ngoài sân)
              const sx2 = cx + sd * 8 + Math.round(Math.sin(t * 4 + me) * 4);
              ctx.strokeStyle = '#d9a45a'; ctx.lineWidth = 2;
              ctx.beginPath(); ctx.moveTo(sx, sy + 2); ctx.lineTo(sx2, cy + 30); ctx.moveTo(sx + 2, sy + 2); ctx.lineTo(sx2 + 3, cy + 30); ctx.stroke();
              px(ctx, sx - 2, sy, 5, 4, OUT); px(ctx, sx - 1, sy + 1, 3, 2, skin);
            } else if (!mad) {   // tay phía giữa sân phe phẩy quạt
              const fa = (sd > 0 ? -0.9 : Math.PI + 0.9) + Math.sin(t * 7) * 0.35, fx = cx + sd * 14, fy = cy + 10;
              ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.arc(fx, fy, 11, fa - 0.6, fa + 0.6); ctx.closePath(); ctx.fill();
              ctx.fillStyle = '#ff3d5a'; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.arc(fx, fy, 10, fa - 0.55, fa + 0.55); ctx.closePath(); ctx.fill();
              ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.arc(fx, fy, 5, fa - 0.55, fa + 0.55); ctx.closePath(); ctx.fill();
            }
          }
          if (mad) for (let i = 0; i < 3; i++) {
            const ph = (t * 1.6 + i / 3) % 1;
            ctx.globalAlpha = fade * (1 - ph) * 0.7;
            ellipse(ctx, cx + (i - 1) * 8 + Math.sin(t * 4 + i) * 2, cy - 18 - ph * 12, 2 + ph * 3, 1.5 + ph * 2, '#e8ecf5');
          }
          ctx.globalAlpha = fade;
          // nồi mì khổng lồ trước mặt bà: thân nồi gang, 2 quai, vành, nước dùng vàng sôi lăn tăn + sợi mì, hơi nước bốc lên
          const px0 = cx, rimY = Math.round(o.y - 10);
          px(ctx, px0 - 27, rimY - 2, 6, 4, OUT); px(ctx, px0 + 21, rimY - 2, 6, 4, OUT);
          px(ctx, px0 - 23, rimY, 46, 18, OUT); px(ctx, px0 - 22, rimY + 1, 44, 16, '#4a4f5a'); px(ctx, px0 - 22, rimY + 1, 44, 2, '#6a707c');
          px(ctx, px0 - 22, rimY + 13, 44, 2, '#3a3e48');
          ellipse(ctx, px0, rimY, 24, 6, OUT); ellipse(ctx, px0, rimY, 23, 5, '#8a909c'); ellipse(ctx, px0, rimY, 20, 4, '#e0a040');
          for (let i = 0; i < 5; i++) {   // sợi mì nổi trên mặt nước
            const nx0 = px0 - 15 + i * 7, w = Math.sin(t * 3 + i) * 1.5;
            ctx.strokeStyle = '#f3d08a'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(nx0, rimY - 1 + w); ctx.quadraticCurveTo(nx0 + 3, rimY + 2 - w, nx0 + 6, rimY - 1 + w); ctx.stroke();
          }
          if (Math.floor(t * 8) % 3 === 0) px(ctx, px0 - 12 + Math.floor(Math.random() * 24), rimY - 1, 2, 1, '#fff3d0');   // bong bóng sôi
          // người trong nồi: chỉ ló đầu + vai trên mặt nước, nhấp nhô, đội sợi mì
          for (const q of P) {
            if (q.kind !== 'inpot' || q.t <= 0 || q.b !== me) continue;
            const v = byId(g, q.a);
            if (!v) continue;
            const ox = px0, e2 = q.max - q.t, rise = Math.min(1, e2 / 0.25), hy0 = rimY + 14 - Math.round(rise * 4 + Math.sin(t * 5 + q.b) * 1.5);
            ctx.save(); ctx.beginPath(); ctx.rect(ox - 14, rimY - 40, 28, 40); ctx.clip();
            SP().drawPlayer(ctx, Object.assign({}, v, { x: ox, y: hy0, vx: 0, vy: 0, airZ: 0, state: 'normal', atkType: null, celPose: null, keeper: false, sizeMul: 1 }), g, 0.999);
            ctx.restore();
            ellipse(ctx, ox, rimY, 7, 2, '#e0a040');
            ctx.strokeStyle = '#f3d08a'; ctx.lineWidth = 1;
            for (const dx2 of [-3, 0, 3]) { ctx.beginPath(); ctx.moveTo(ox + dx2, hy0 - 20); ctx.quadraticCurveTo(ox + dx2 + 2, hy0 - 14, ox + dx2 - 1, hy0 - 10); ctx.stroke(); }
          }
          for (let i = 0; i < 3; i++) {   // hơi nước
            const ph = (t * 0.8 + i / 3) % 1;
            ctx.globalAlpha = fade * (1 - ph) * 0.35;
            ellipse(ctx, px0 + (i - 1) * 12 + Math.sin(t * 2 + i) * 3, rimY - 6 - ph * 22, 4 + ph * 5, 2.5 + ph * 3, '#f3f4f8');
          }
          ctx.globalAlpha = fade;
          break;
        }
        case 'chopaim': {   // đũa khổng lồ đang nhắm (a = người bị nhắm, b = tay): mũi đũa há rộng lơ lửng trên đầu người đó (đi theo), bóng đũa trên sân,
                            // vòng đỏ co dần + "!" nhấp nháy trên đầu
          const q = byId(g, o.a);
          if (!q) break;
          const H = chopHand(g, o.b, x), k3 = U2.clamp(el / o.max, 0, 1), on = Math.floor(el * (5 + 12 * k3)) % 2;
          const r = 18 - k3 * 8;
          ctx.strokeStyle = on ? o.color : '#ffffff'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.45, 0, 0, Math.PI * 2); ctx.stroke();
          chopsticks(ctx, H.x, H.y, x, Math.round(y - 40 * (q.sizeMul || 1) - 3 * Math.sin(t * 6)), 8, y);
          if (on) { const hy = Math.round(y - 60); px(ctx, x - 1, hy, 3, 6, SP().OUT); px(ctx, x, hy + 1, 1, 4, '#ff3d5a'); px(ctx, x - 1, hy + 7, 3, 3, SP().OUT); px(ctx, x, hy + 8, 1, 1, '#ff3d5a'); }
          break;
        }
        case 'chopstrike': {   // đũa dừng lại (a = tay): lock giây đứng yên trên chỗ gắp (vòng đỏ đặc nhấp nháy nhanh = SẮP CẮM), rồi strike giây cắm xuống + khép lại;
                               // cắm hụt thì cắm trên sân thêm chút rồi mờ đi
          const C2 = SFC_CONFIG.stories.mods.chopsticks, H = chopHand(g, o.a, x);
          const k3 = el < C2.lock ? 0 : U2.clamp((el - C2.lock) / C2.strike, 0, 1), z = 40 * (1 - k3), open = 8 - 6.5 * k3;
          if (k3 < 1) {
            const on = Math.floor(el * 20) % 2;
            ctx.globalAlpha = fade * (on ? 0.45 : 0.2); ellipse(ctx, x, y, 12, 5.5, o.color); ctx.globalAlpha = fade;
            ctx.strokeStyle = '#ff3d5a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, 12, 5.5, 0, 0, Math.PI * 2); ctx.stroke();
          }
          chopsticks(ctx, H.x, H.y, x, Math.round(y - z), open, z > 1 ? y : null);
          break;
        }
        case 'chopcarry': {   // đũa kẹp người bị gắp (a = người, b = tay) mang về nồi: mũi đũa khép quanh thân người đang lơ lửng
          const q = byId(g, o.a);
          if (!q) break;
          const H = chopHand(g, o.b, x);
          chopsticks(ctx, H.x, H.y, x, Math.round(y - (q.airZ || 0) - 10), 5, null);
          break;
        }
        case 'inpot':   // người đang ngồi trong nồi mì: không vẽ gì riêng (sprite bị ẩn — hides; prop 'mama' vẽ cái đầu ló lên mặt nước)
          break;
        case 'seawave': {   // sóng dữ (Rust Buckets, a = nửa bề rộng, b = 1 từ mép trên / -1 từ mép dưới): báo trước = vùng nước sắp tràn tới nhấp nháy dần nhanh
                            // + mép bọt chạy + nước phồng ở mép sóng tới + mũi tên; sóng tràn = nước (sẫm phía mép tới), gợn sóng, mép bọt dày + bụi nước lúc ập vào,
                            // mép mỏng lúc rút. Mực nước: MatchMods K.waves
          const C2 = SFC_CONFIG.stories.mods.waves, W = SFC.MatchMods.K.waves, hw = o.a, dir = o.b < 0 ? -1 : 1, x0 = Math.round(o.x - hw), x1 = Math.round(o.x + hw);
          const k2 = W.front(C2, el), rising = el < C2.warn + C2.rise + C2.hold, E0 = dir > 0 ? f.y : f.y + f.h;
          // dải nước dày d từ mép sóng tới, cột xx
          const band = (xx, d, col) => px(ctx, xx, dir > 0 ? E0 : E0 - d, 2, d, col);
          if (el < C2.warn) {
            const p0 = el / C2.warn, on = Math.floor(el * (5 + 12 * p0)) % 2;
            for (let xx = x0; xx < x1; xx += 2) {
              const u = (xx - o.x) / hw, d = Math.round(W.depth(C2, f, 1, u));
              ctx.globalAlpha = fade * (on ? 0.22 : 0.1); band(xx, d, o.color);
              ctx.globalAlpha = fade * 0.75; band(xx, Math.max(1, Math.round((2 + 6 * p0) * (1 - 0.35 * u * u * u * u) + Math.sin(t * 6 + xx * 0.2))), '#1a4f8a');
              ctx.globalAlpha = fade;
              if (((xx - x0) / 2 + Math.floor(el * 12)) % 3 === 0) px(ctx, xx, E0 + dir * d, 2, 1, '#e8f6ff');
            }
            // mũi tên chỉ hướng sóng tràn
            if (on) for (const ax of [o.x - hw * 0.5, o.x, o.x + hw * 0.5]) {
              const mx = Math.round(ax), ay = Math.round(E0 + dir * (18 + p0 * 12));
              px(ctx, mx - 3, ay, 7, 2, '#ffffff'); px(ctx, mx - 2, ay + 2 * dir, 5, 2, '#ffffff'); px(ctx, mx - 1, ay + 4 * dir, 3, 2, '#ffffff');
            }
            break;
          }
          if (k2 <= 0) break;
          for (let xx = x0; xx < x1; xx += 2) {
            const d = Math.max(1, Math.round(W.depth(C2, f, k2, (xx - o.x) / hw) + Math.sin(t * 7 + xx * 0.18) * 1.5));
            ctx.globalAlpha = fade * (rising ? 0.55 : 0.4); band(xx, d, o.color);
            ctx.globalAlpha = fade * 0.35; band(xx, Math.max(1, Math.round(d * 0.45)), '#1a4f8a');
            ctx.globalAlpha = fade * 0.5; px(ctx, xx, Math.round(E0 + dir * ((xx * 3 + Math.floor(t * 30)) % Math.max(4, d))), 2, 1, '#9fd4ff');
            ctx.globalAlpha = fade;
            const fy = E0 + dir * d, th = rising ? 3 : 1;
            px(ctx, xx, dir > 0 ? fy - th : fy, 2, th, '#ffffff');
            if (!rising) continue;
            px(ctx, xx, fy + (dir > 0 ? 0 : -1), 2, 1, '#bfe4ff');
            if (Math.random() < 0.15) px(ctx, xx, fy - 4 - Math.floor(Math.random() * 8), 1, 1, '#ffffff');   // bụi nước bắn lên
          }
          break;
        }
        case 'surf': {   // thuỷ thủ lướt ván trên sóng (a = id): tấm ván dưới chân theo hướng chạy + bụi nước sau đuôi, nhấp nháy lúc sắp hết
          const q = byId(g, o.a);
          if (!q) break;
          const sp = Math.hypot(q.vx, q.vy), ang = sp > 20 ? Math.atan2(q.vy, q.vx) : q.facing, blink = o.t < 0.6 && Math.floor(t * 14) % 2 ? 0.4 : 1;
          ctx.globalAlpha = fade * blink;
          ctx.save(); ctx.translate(x, y + 1); ctx.scale(1, 0.5); ctx.rotate(ang);
          ctx.fillStyle = SP().OUT; ctx.fillRect(-10, -3, 20, 6);
          ctx.fillStyle = o.color; ctx.fillRect(-9, -2, 18, 4);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(-9, -0.5, 18, 1);
          ctx.restore();
          if (sp > 20) for (let i = 0; i < 4; i++) {
            const ph = (t * 4 + i / 4) % 1, dd = 8 + ph * 14;
            ctx.globalAlpha = fade * blink * (1 - ph);
            px(ctx, Math.round(x - Math.cos(ang) * dd + (i - 1.5) * 2), Math.round(y - ph * 4 - Math.sin(ang) * dd * 0.5), 2, 1, '#e8f6ff');
          }
          break;
        }
        case 'devil': {   // lốc cát Grandpa's Squad (a = hạt giống đường đi): warn giây đầu = xoáy cát dưới đất co dần lại (nhấp nháy);
                          // sau đó phễu cát xoay, cao dần, thân lắc lư, hạt cát + lá khô bay quanh
          const C2 = SFC_CONFIG.stories.mods.devils, w = el < C2.warn ? 0 : Math.min(1, (el - C2.warn) / 0.35);
          ctx.globalAlpha = fade * 0.3; ellipse(ctx, x, y + 1, 12, 4, '#000000');
          ctx.globalAlpha = fade * (w ? 0.45 : 0.35 + 0.3 * (Math.floor(el * 10) % 2));
          for (let i = 0; i < 14; i++) {
            const a2 = t * 9 + i * 0.45, r0 = 6 + (i % 4) * 3 + (w ? 0 : (1 - el / C2.warn) * 10);
            px(ctx, Math.round(x + Math.cos(a2) * r0), Math.round(y + Math.sin(a2) * r0 * 0.4), 2, 1, i % 2 ? '#f3dfa0' : '#b8945a');
          }
          if (!w) break;
          const H = 48 * w;
          // viền tối sau phễu để lốc nổi trên sân đất / cỏ
          for (let i = 0; i < 12; i++) {
            const k3 = i / 11, hy = y - k3 * H, r = 3 + k3 * 12, sw = Math.sin(t * 5 + i * 0.6) * (2 + k3 * 3);
            ctx.globalAlpha = fade * 0.55; ellipse(ctx, x + sw, hy, r + 1.5, r * 0.32 + 1.5, '#3a2616');
          }
          for (let i = 0; i < 12; i++) {
            const k3 = i / 11, hy = y - k3 * H, r = 3 + k3 * 12, sw = Math.sin(t * 5 + i * 0.6) * (2 + k3 * 3), a2 = t * 14 + i * 0.8;
            ctx.globalAlpha = fade * (0.85 - k3 * 0.2);
            ellipse(ctx, x + sw, hy, r, r * 0.32, i % 2 ? '#e8c98a' : '#c9a464');
            ctx.globalAlpha = fade;
            // vệt gió sáng chạy vòng quanh phễu
            px(ctx, Math.round(x + sw + Math.cos(a2) * r), Math.round(hy + Math.sin(a2) * r * 0.32), 3, 1, '#fff3d0');
            px(ctx, Math.round(x + sw + Math.cos(a2 + 3.1) * r * 0.8), Math.round(hy + Math.sin(a2 + 3.1) * r * 0.26), 2, 1, '#7a5a30');
          }
          ctx.globalAlpha = fade;
          for (let i = 0; i < 5; i++) {
            const a2 = t * 7 + i * 1.3, rr = 10 + i * 3;
            px(ctx, Math.round(x + Math.cos(a2) * rr), Math.round(y - 8 - i * 7 + Math.sin(a2 * 2) * 2), 1, 1, i % 2 ? '#7a5a30' : '#8abf45');
          }
          break;
        }
        case 'flung': {   // người bị lốc hất tung (a = id): vòng cát xoay quanh người đang lơ lửng + cột cát mờ nối xuống đất
          const q = byId(g, o.a);
          if (!q) break;
          const cy = y - (q.airZ || 0) - 10;
          ctx.globalAlpha = fade * 0.25;
          for (let hy = y; hy > cy; hy -= 4) px(ctx, Math.round(x + Math.sin(t * 9 + hy * 0.3) * 3) - 1, Math.round(hy), 3, 2, '#d9b77a');
          ctx.globalAlpha = fade * 0.85;
          for (let i = 0; i < 10; i++) {
            const a2 = t * 16 + i * 0.63, r = 11 + (i % 3) * 2;
            px(ctx, Math.round(x + Math.cos(a2) * r), Math.round(cy + Math.sin(a2) * r * 0.45), 2, 1, i % 2 ? '#f3dfa0' : '#b8945a');
          }
          break;
        }
        case 'card': {   // thẻ phạt trên đầu (b = 0 vàng, 1 đỏ), giơ lên lắc nhẹ
          const q = g.players.find((p2) => p2.id === o.a), hy = q ? q.y - 34 * (q.sizeMul || 1) : y - 34, wob = Math.floor(t * 8) % 2;
          px(ctx, x - 3 + wob, hy - 9, 7, 10, SP().OUT); px(ctx, x - 2 + wob, hy - 8, 5, 8, o.color);
          px(ctx, x - 1 + wob, hy - 7, 1, 2, '#ffffff');
          break;
        }
        case 'legend': {   // KING LEO 1976 (a = id, b = số vạch giáp còn lại): quầng sepia nhấp nháy như phim cũ + hạt phim + vết xước quanh người,
                           // trên đầu thanh giáp = các ô khung phim (ô sáng = vạch còn), chữ 1976 nhỏ
          const q = byId(g, o.a);
          if (!q) break;
          const s2 = q.sizeMul || 1, flick = 0.75 + 0.25 * Math.sin(t * 37) * Math.sin(t * 13);
          // hợp thể: bóng mờ màu sepia của 2 Legends đã nhập, chập chờn 2 bên người hắn
          const fz = g.effects.V.props.filter((r) => r.kind === 'fused' && r.t > 0).map((r) => byId(g, r.a)).filter(Boolean);
          // hợp thể + đang chạy: TIA CHỚP — 3 tia điện zig-zag kéo dài phía sau theo hướng chạy + tia điện nhỏ nháy quanh người (đổi hình mỗi 1/20 giây)
          const sp = Math.hypot(q.vx || 0, q.vy || 0);
          if (fz.length && sp > 60) {
            const ux = q.vx / sp, uy = q.vy / sp, seed = Math.floor(t * 20), rr = (n) => ((Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
            ctx.lineJoin = 'round';
            for (let k = 0; k < 3; k++) {
              const pts = [], L2 = 34 + k * 10, oy = -8 - k * 9;
              for (let j = 0; j <= 6; j++) {
                const d = (j / 6) * L2, w = j && j < 6 ? (rr(k * 10 + j) - 0.5) * 9 : 0;
                pts.push([x - ux * d - uy * w, y + oy * s2 - uy * d * 0.6 + ux * w * 0.5]);
              }
              for (const [lw, col] of [[4, 'rgba(127,231,255,0.45)'], [2, '#fff6a0'], [1, '#ffffff']]) {
                ctx.strokeStyle = col; ctx.lineWidth = lw;
                ctx.beginPath(); pts.forEach(([a2, b2], j) => (j ? ctx.lineTo(a2, b2) : ctx.moveTo(a2, b2))); ctx.stroke();
              }
            }
            for (let k = 0; k < 2; k++) {
              const a2 = rr(40 + k) * Math.PI * 2, r0 = 10 * s2, bx = x + Math.cos(a2) * r0, by = y - 14 * s2 + Math.sin(a2) * r0 * 0.8;
              ctx.strokeStyle = '#fff6a0'; ctx.lineWidth = 1;
              ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + (rr(50 + k) - 0.5) * 10, by + 4); ctx.lineTo(bx + (rr(60 + k) - 0.5) * 10, by + 8); ctx.stroke();
            }
            ctx.lineJoin = 'miter';
          }
          fz.forEach((m, i) => {
            const sd = i ? 1 : -1, ox = Math.round(sd * (7 + Math.sin(t * 3 + i) * 2) * s2);
            ctx.save(); ctx.globalAlpha = 1;
            ctx.translate(x + ox, y); ctx.scale(s2 * 0.95, s2 * 0.95);
            SP().drawPlayer(ctx, Object.assign({}, m, { x: 0, y: 0, vx: 0, vy: 0, airZ: 0, state: 'normal', atkType: null, celPose: null, keeper: false, facing: q.facing, sizeMul: 1 }), g, fade * (0.22 + 0.08 * Math.sin(t * 9 + i * 2)));
            ctx.restore();
          });
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = fade * 0.4 * flick; ellipse(ctx, x, y + 1, 15 * s2, 6, o.color);
          ctx.globalAlpha = fade * 0.18 * flick; ellipse(ctx, x, y - 12 * s2, 12 * s2, 17 * s2, o.color);
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = fade;
          for (let i = 0; i < 6; i++) {   // hạt phim + vết xước
            const sx = Math.round(x + (((i * 37 + Math.floor(t * 24) * 13) % 31) - 15) * s2), sy = Math.round(y - 4 - ((i * 23 + Math.floor(t * 24) * 7) % 30) * s2);
            px(ctx, sx, sy, 1, i % 3 ? 1 : 4, i % 2 ? '#f3ead7' : '#5a3a1a');
          }
          const hp = o.b, n = SFC_CONFIG.stories.mods.leo.hp, bw = 9, hx = x - Math.round((n * bw) / 2), hy = Math.round(y - 44 * s2);
          px(ctx, hx - 2, hy - 2, n * bw + 3, 10, SP().OUT);
          for (let i = 0; i < n; i++) {
            const on = i < hp;
            px(ctx, hx + i * bw, hy, bw - 1, 6, on ? '#f3ead7' : '#3a2a1a');
            if (on) { px(ctx, hx + i * bw + 1, hy + 1, bw - 3, 4, o.color); px(ctx, hx + i * bw + 1, hy + 1, bw - 3, 1, '#fff6d0'); }
            px(ctx, hx + i * bw, hy - 1, 1, 1, '#f3ead7'); px(ctx, hx + i * bw + bw - 2, hy - 1, 1, 1, '#f3ead7');   // lỗ phim
          }
          if (Math.floor(t * 3) % 2) SFC.VFX.text(ctx, '1976', x, hy - 7, 7, o.color);
          break;
        }
        case 'zapline': {   // King Leo chớp đi (giữ khung): tia chớp zig-zag từ chỗ cũ (x, y) tới chỗ mới (a, b) ở độ cao thân người, đổi hình mỗi 1/30 giây, mờ dần
          const x1 = o.a, y1 = o.b, seed = Math.floor(t * 30), rr = (n) => ((Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
          const d = Math.hypot(x1 - o.x, y1 - o.y) || 1, nx = -(y1 - o.y) / d, ny = (x1 - o.x) / d, n = Math.max(3, Math.round(d / 14)), pts = [];
          for (let j = 0; j <= n; j++) { const k3 = j / n, w = j && j < n ? (rr(j) - 0.5) * 16 : 0; pts.push([o.x + (x1 - o.x) * k3 + nx * w, o.y - 14 + (y1 - o.y) * k3 + ny * w]); }
          ctx.lineJoin = 'round';
          for (const [lw, col] of [[6, 'rgba(127,231,255,0.4)'], [3, o.color], [1, '#ffffff']]) {
            ctx.strokeStyle = col; ctx.lineWidth = lw;
            ctx.beginPath(); pts.forEach(([a2, b2], j) => (j ? ctx.lineTo(a2, b2) : ctx.moveTo(a2, b2))); ctx.stroke();
          }
          ctx.lineJoin = 'miter';
          break;
        }
        case 'fused':   // người đã nhập vào King Leo: không vẽ gì (sprite bị ẩn — hides; bóng mờ của họ do prop 'legend' vẽ quanh King Leo)
          break;
        case 'fusetrail': {   // đang bị hút vào King Leo (a = người, b = King Leo): người toả sáng vàng, vệt vàng + hạt sáng chạy về phía King Leo
          const q = byId(g, o.a), L = byId(g, o.b);
          if (!q || !L) break;
          const qy = y - (q.airZ || 0) - 10, ly = L.y - 14 * (L.sizeMul || 1);
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = fade * 0.5; ctx.strokeStyle = o.color; ctx.lineWidth = 5;
          ctx.beginPath(); ctx.moveTo(x, qy); ctx.lineTo(L.x, ly); ctx.stroke();
          ctx.globalAlpha = fade * 0.9; ctx.strokeStyle = '#fff6d0'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(x, qy); ctx.lineTo(L.x, ly); ctx.stroke();
          ctx.globalAlpha = fade * (0.4 + 0.2 * Math.sin(t * 30)); ellipse(ctx, x, qy, 10, 13, o.color);
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = fade;
          for (let i = 0; i < 4; i++) {
            const k3 = (t * 2.5 + i / 4) % 1;
            px(ctx, Math.round(x + (L.x - x) * k3) - 1, Math.round(qy + (ly - qy) * k3) - 1, 3, 3, '#fff6d0');
          }
          break;
        }
        case 'lateaim': {   // ngắm cú vào bóng muộn: mũi tên đỏ đứt khúc từ King Leo (x, y) tới người bị ngắm (a = id), dài đúng tầm lao (b px),
                            // nhấp nháy nhanh dần, đầu mũi tên = hình gầm giày đinh
          const q = byId(g, o.a);
          if (!q) break;
          const d = Math.hypot(q.x - o.x, q.y - o.y) || 1, ux = (q.x - o.x) / d, uy = (q.y - o.y) / d, L = o.b, on = Math.floor(el * (6 + 16 * el / o.max)) % 2;
          ctx.globalAlpha = fade * (on ? 0.9 : 0.45);
          for (let i = 8; i < L - 6; i += 7) px(ctx, Math.round(o.x + ux * i) - 1, Math.round(o.y + uy * i) - 1, 3, 3, i % 14 ? o.color : '#ffffff');
          const tx = Math.round(o.x + ux * L), ty = Math.round(o.y + uy * L);
          px(ctx, tx - 4, ty - 3, 9, 7, SP().OUT); px(ctx, tx - 3, ty - 2, 7, 5, '#1a1216');
          for (const [dx2, dy2] of [[-2, -1], [1, -1], [-2, 1], [1, 1]]) px(ctx, tx + dx2, ty + dy2, 2, 1, '#c7ccd6');
          ctx.globalAlpha = fade;
          break;
        }
        case 'stoolheld': {   // ghế giơ trên đầu người cầm (lật ngược, lắc theo bước chạy)
          const q = g.players.find((p) => p.id === o.a), s = q ? q.sizeMul || 1 : 1, bob = q && Math.hypot(q.vx, q.vy) > 20 ? Math.floor(t * 10) % 2 : 0;
          ctx.save(); ctx.translate(x, y - 30 * s - bob); ctx.scale(1, -1); ctx.translate(-x, -y);
          stool(ctx, x, y + 10, o.color);
          ctx.restore();
          break;
        }
        case 'stoolthrow': {   // ghế đang bay: xoay tít, bóng đổ dưới đất. Bật tường (bay chậm hơn lúc ném): nảy lên rồi hạ dần xuống đất
          const S2 = SFC_CONFIG.stories.mods.stools, k2 = Math.min(1, el / o.max);
          const h = o.b < S2.throwSpeed ? Math.round(16 * (1 - k2) + 10 * Math.sin(Math.PI * k2)) : 16;
          ellipse(ctx, x, y + 1, 6, 2, 'rgba(0,0,0,0.3)');
          ctx.save(); ctx.translate(x, y - h); ctx.rotate(el * (o.b < S2.throwSpeed ? -12 : 22)); ctx.translate(-x, -(y - h));
          stool(ctx, x, y + 6 - h, o.color);
          ctx.restore();
          break;
        }
        case 'stoolfly': {   // ghế vỡ văng theo hướng bóng (a), lộn vòng
          const d = el * 1.6, gx = Math.round(o.x + Math.cos(o.a) * d * 70), gy = Math.round(o.y + Math.sin(o.a) * d * 40);
          const z = Math.max(0, d * (1.2 - d) * 70);
          ctx.globalAlpha = fade * 0.3; ellipse(ctx, gx, gy + 1, 6, 2, '#000000'); ctx.globalAlpha = fade;
          ctx.save(); ctx.translate(gx, gy - z - 6); ctx.rotate(el * 14 * (Math.cos(o.a) >= 0 ? 1 : -1)); ctx.translate(-gx, -(gy - 6));
          stool(ctx, gx, gy + 4, o.color);
          ctx.restore();
          break;
        }
        case 'lane': {   // làn giao hàng: nhấp nháy càng nhanh khi xe sắp tới (b = giây cảnh báo), xe qua rồi còn vệt bánh xe
          const w = 11, y0 = Math.round(o.y), y1 = Math.round(o.a);
          if (el < o.b) {
            const rate = 6 + 14 * (el / o.b), on = Math.floor(el * rate) % 2;
            ctx.globalAlpha = fade * (on ? 0.32 : 0.16);
            ctx.fillStyle = o.color; ctx.fillRect(x - w, y0, w * 2, y1 - y0);
            ctx.globalAlpha = fade;
            // vạch kẻ chéo vàng đen 2 mép làn
            for (let yy = y0; yy < y1; yy += 6) {
              const cc = ((yy - y0) / 6 + Math.floor(el * 8)) % 2 ? o.color : '#1a1216';
              px(ctx, x - w - 1, yy, 2, 4, cc); px(ctx, x + w - 1, yy, 2, 4, cc);
            }
            // mũi tên xe sắp tới ở giữa làn
            if (on) for (let yy = y0 + 18; yy < y1 - 10; yy += 40) { px(ctx, x - 3, yy, 7, 2, '#ffffff'); px(ctx, x - 2, yy + 2, 5, 2, '#ffffff'); px(ctx, x - 1, yy + 4, 3, 2, '#ffffff'); }
          } else {
            ctx.globalAlpha = fade * 0.25;
            px(ctx, x - 2, y0, 1, y1 - y0, '#1a1216'); px(ctx, x + 1, y0, 1, y1 - y0, '#1a1216');
          }
          break;
        }
        case 'moped':
          if (el < o.b) break;   // còn đang cảnh báo: xe chưa vào sân
          moped(ctx, x, y, o.color, o.a > o.y, t);
          break;
        case 'vroom': {   // Moped Boys quá giang: quầng vàng dưới chân + vệt tốc độ kéo dài phía sau + khói xả, mờ dần lúc sắp hết
          const q = g.players.find((p) => p.id === o.a);
          if (!q) break;
          const sp = Math.hypot(q.vx, q.vy), run = sp > 20;
          const ux = run ? q.vx / sp : Math.cos(q.facing), uy = run ? q.vy / sp : Math.sin(q.facing);
          const end = Math.min(1, o.t * 2), blink = o.t < 0.6 && Math.floor(t * 14) % 2 ? 0.4 : 1;   // sắp hết: nhấp nháy
          const s = q.sizeMul || 1;
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = fade * end * blink * (0.55 + 0.2 * Math.sin(t * 20)); ellipse(ctx, x, y + 1, 14, 6, o.color);
          ctx.globalAlpha = fade * end * blink * 0.22; ellipse(ctx, x, y - 12 * s, 10 * s, 14 * s, o.color);   // quầng vàng quanh người
          ctx.globalCompositeOperation = 'source-over';
          if (!run) break;
          // vệt tốc độ: các sọc vàng / trắng chạy ngược hướng chạy, ở độ cao thân người
          for (let i = 0; i < 6; i++) {
            const ph = (t * 4 + i * 0.37) % 1, off = (i - 2.5) * 4, len = 14 + (i % 3) * 6, dd = 8 + ph * 24;
            const bx = x - ux * dd - uy * off, by = y - 6 - (i % 3) * 7 * s - uy * dd + ux * off * 0.5;
            ctx.globalAlpha = fade * end * blink * (1 - ph);
            ctx.strokeStyle = i % 2 ? '#ffffff' : o.color; ctx.lineWidth = i % 2 ? 1 : 2;
            ctx.beginPath(); ctx.moveTo(Math.round(bx), Math.round(by)); ctx.lineTo(Math.round(bx - ux * len), Math.round(by - uy * len)); ctx.stroke();
          }
          // khói xả: cục khói xám nở ra phía sau chân
          for (let i = 0; i < 3; i++) {
            const ph = (t * 3 + i / 3) % 1, r0 = 1.5 + ph * 3;
            ctx.globalAlpha = fade * end * (1 - ph) * 0.55;
            ellipse(ctx, Math.round(x - ux * (6 + ph * 16)), Math.round(y - 2 - ph * 4 - uy * (6 + ph * 16)), r0, r0 * 0.8, '#c7ccd6');
          }
          break;
        }
        case 'owl': {   // Night Owls: con cú khổng lồ đậu giữa khán đài trên, cả trận. Bình thường nhắm mắt (thở phập phồng);
                        // có prop 'owleyes' (lượt mắt mở: a = giây mở dần, b = giây mở hẳn) thì mở mắt, sân tối lại, con ngươi nhìn theo bóng.
                        // Đang có đạn bay / tia ngắm: tròng đỏ
          const OUT = SP().OUT, P = g.effects.V.props, ey = P.find((q) => q.kind === 'owleyes' && q.t > 0);
          let op = 0, full = false;
          if (ey) {
            const e2 = ey.max - ey.t, warn = ey.a, len = ey.b, op0 = e2 < warn ? e2 / warn : e2 < warn + len ? 1 : Math.max(0, 1 - (e2 - warn - len) / 0.3);
            op = op0 * op0 * (3 - 2 * op0); full = e2 >= warn && e2 < warn + len;
          }
          const mad = P.some((q) => (q.kind === 'gazelock' || q.kind === 'owlbolt') && q.t > 0);
          if (op > 0) { ctx.globalAlpha = fade * 0.3 * op; ctx.fillStyle = '#0a0c1e'; ctx.fillRect(f.x, f.y, f.w, f.h); ctx.globalAlpha = fade; }
          const cx = Math.round(o.x), cy = Math.round(o.y - 13) + (op > 0 ? 0 : Math.round(Math.sin(t * 2) * 0.6));
          // thân + cánh khép (đậu trên mép khán đài), đầu, 2 chỏm tai, mỏ
          ellipse(ctx, cx, cy + 12, 22, 6, OUT); ellipse(ctx, cx, cy + 12, 21, 5, '#3a2a1e');
          ellipse(ctx, cx, cy, 31, 14, OUT); ellipse(ctx, cx, cy, 30, 13, '#4a3626'); ellipse(ctx, cx, cy - 4, 25, 7, '#5c4430');
          for (const sd of [-1, 1]) { px(ctx, cx + sd * 23 - 3, cy - 17, 6, 7, OUT); px(ctx, cx + sd * 23 - 2, cy - 16, 4, 5, '#4a3626'); px(ctx, cx + sd * 24 - 1, cy - 19, 2, 3, OUT); }
          px(ctx, cx - 2, cy + 3, 5, 5, OUT); px(ctx, cx - 1, cy + 4, 3, 2, '#ff9a3d'); px(ctx, cx, cy + 6, 1, 1, '#ff9a3d');
          const tg = g.ball.owner || g.ball;
          for (const sd of [-1, 1]) {
            const ex = cx + sd * 12, R = 9;
            ellipse(ctx, ex, cy, R + 2, R + 1, '#e8d8b0');
            if (op < 0.08) {   // nhắm: mí cong + hàng mi
              px(ctx, ex - R + 1, cy, 2 * R - 1, 2, OUT);
              px(ctx, ex - R + 2, cy - 1, 2, 1, OUT); px(ctx, ex + R - 3, cy - 1, 2, 1, OUT);
              continue;
            }
            const h = Math.max(1, R * 0.9 * op), col = mad ? '#ff3d5a' : o.color;
            if (full) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = fade * (0.35 + 0.15 * Math.sin(t * 18)); ellipse(ctx, ex, cy, R + 6, R + 4, col); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = fade; }
            ellipse(ctx, ex, cy, R + 1, h + 1, OUT);
            ellipse(ctx, ex, cy, R, h, col);
            ctx.save();
            ctx.beginPath(); ctx.ellipse(ex, cy, R, h, 0, 0, Math.PI * 2); ctx.clip();
            const d = Math.hypot(tg.x - ex, tg.y - cy) || 1, pxx = Math.round(ex + (tg.x - ex) / d * 3), pyy = Math.round(cy + (tg.y - cy) / d * 3);
            SP().disc(ctx, pxx, pyy, full ? 4 : 3, OUT);
            px(ctx, pxx - 2, pyy - 3, 2, 2, '#ffffff');
            ctx.restore();
          }
          break;
        }
        case 'owleyes': break;   // lượt mắt mở: con cú ('owl') đọc prop này để vẽ mắt
        case 'gazelock': {   // tia ngắm: 2 tia đỏ đứt nét chạy từ mắt cú xuống người chạy + vòng ngắm co dần (đủ vòng = bắn)
          const kk = Math.min(1, el / o.b), off = Math.floor(t * 30) % 6, blink = kk > 0.7 && Math.floor(t * 16) % 2;
          ctx.strokeStyle = o.color; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.lineDashOffset = -off;
          ctx.globalAlpha = fade * 0.85;
          for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(o.x + sd * 12, o.y); ctx.lineTo(x, y - 10); ctx.stroke(); }
          ctx.setLineDash([]); ctx.lineDashOffset = 0;
          const r = Math.round(18 - 11 * kk);
          ctx.globalAlpha = fade * (blink ? 0.5 : 1); ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(x, y - 9, r, r * 0.8, 0, 0, Math.PI * 2); ctx.stroke();
          for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) px(ctx, Math.round(x + ax * (r + 2)) - (ay ? 0 : 1), Math.round(y - 9 + ay * (r * 0.8 + 2)) - (ax ? 0 : 1), ay ? 1 : 3, ay ? 3 : 1, o.color);
          px(ctx, x, y - 10, 1, 1, '#ffffff');
          break;
        }
        case 'owlbolt': {   // đạn mắt cú: cầu sáng đỏ lõi trắng bay từ mắt cú đuổi theo người (b giây, vị trí = hàm thời gian -> máy khách vẽ giống)
          const q = g.players.find((pp) => pp.id === o.a);
          if (!q) break;
          const at = (e) => ({ x: o.x + (q.x - o.x) * e, y: o.y + (q.y - 10 - o.y) * e });
          const kk = Math.min(1, el / o.max);
          ctx.globalCompositeOperation = 'lighter';
          for (let i = 5; i >= 0; i--) {
            const p2 = at(Math.max(0, kk - i * 0.05));
            ctx.globalAlpha = fade * (1 - i / 6) * 0.6;
            SP().disc(ctx, Math.round(p2.x), Math.round(p2.y), Math.max(1, 5 - i), o.color);
          }
          const p0 = at(kk);
          ctx.globalAlpha = fade * 0.4; SP().disc(ctx, Math.round(p0.x), Math.round(p0.y), 9, o.color);
          ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = fade;
          SP().disc(ctx, Math.round(p0.x), Math.round(p0.y), 4, '#ffb0bc'); SP().disc(ctx, Math.round(p0.x), Math.round(p0.y), 2, '#ffffff');
          ellipse(ctx, Math.round(q.x), Math.round(q.y) + 1, 4 + 6 * kk, (4 + 6 * kk) * 0.45, 'rgba(255,61,90,0.35)');   // chỗ đạn sắp tới
          break;
        }
        case 'petrify': {   // hoá đá (OWL'S GAZE): 0.3 giây đầu đá lan từ chân lên đầu (phần chưa hoá vẽ sprite màu, không sao choáng),
                            // tượng xám có vân + vết nứt đứng trên bệ đá; sắp hết thì rung + nứt toác (sprite thật bị ẩn — VFX.hides)
          const q = g.players.find((pp) => pp.id === o.a);
          if (!q) break;
          const s2 = q.sizeMul || 1, grow = Math.min(1, el / 0.3), end = o.t < 0.4;
          const sh = end ? (Math.floor(t * 30) % 2 ? 1 : -1) : 0, H = Math.round(30 * s2), OUT = SP().OUT;
          // bệ đá dưới chân
          ellipse(ctx, x + sh, y + 1, 10, 4, OUT); ellipse(ctx, x + sh, y + 1, 9, 3, '#6e737d'); px(ctx, x - 6 + sh, y - 1, 12, 1, '#9aa0a8');
          const line = Math.round(y + 2 - (H + 2) * grow);
          if (grow < 1) {   // phần chưa hoá đá: sprite màu như thường
            ctx.save();
            ctx.beginPath(); ctx.rect(x - 14, y - H - 12, 28, line - (y - H - 12)); ctx.clip();
            SP().drawPlayer(ctx, Object.assign({}, q, { state: 'normal', vx: 0, vy: 0, atkType: null }), g, 0.999);
            ctx.restore();
          }
          ctx.save();
          ctx.beginPath(); ctx.rect(x - 14, line, 28, y + 4 - line); ctx.clip();
          ctx.translate(sh, 0);
          if (s2 !== 1) { ctx.translate(x, y); ctx.scale(s2, s2); ctx.translate(-x, -y); }
          ctx.globalAlpha = 1;
          ctx.drawImage(stoneSprite(g, q), x - 24, y - 42);
          ctx.restore();
          ctx.globalAlpha = fade;
          // vân đá + vết nứt trên tượng (chỉ phần đã hoá)
          const top = y - Math.round(H * grow);
          const r = ((o.id * 9301 + 49297) % 233280) / 233280;
          for (let i = 0; i < 6; i++) {
            const vy = y - 3 - ((i * 37 + Math.round(r * 50)) % (H - 6));
            if (vy < top) continue;
            px(ctx, x - 4 + ((i * 5 + Math.round(r * 9)) % 9) + sh, vy, 1 + (i % 2), 1, i % 3 ? '#5a5f68' : '#b4b9c2');
          }
          if (grow >= 1) {
            ctx.strokeStyle = end ? '#ffffff' : '#3c4048'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(x - 2 + sh, y - H + 6); ctx.lineTo(x + 1 + sh, y - H + 12); ctx.lineTo(x - 1 + sh, y - H + 17);
            if (end) { ctx.lineTo(x + 2 + sh, y - 6); ctx.moveTo(x + 1 + sh, y - H + 12); ctx.lineTo(x + 5 + sh, y - H + 15); }
            ctx.stroke();
          } else {
            // mép đá đang lan: viền sáng + bụi đá lấm tấm
            px(ctx, x - 6, top, 12, 1, '#c7ccd6');
            if (Math.floor(t * 40) % 2) px(ctx, x - 7 + Math.floor(t * 97) % 14, top - 1, 1, 1, '#c7ccd6');
          }
          break;
        }
        case 'veil': break;   // ma tàng hình: không vẽ gì (vẽ sẽ lộ chỗ), renderer làm mờ sprite theo MatchMods.alpha
        case 'spot': {   // đèn pha: vùng sáng elip (khớp vùng bắt của mô phỏng) + luồng sáng từ đèn trên nóc nhà; đỏ = vừa bắt được người
          const S = SFC_CONFIG.stories.mods.searchlight, rx = S.r / 0.9, ry = S.r / 1.6, red = o.a === 1;
          const pulse = red ? 0.75 + 0.25 * Math.sin(t * 30) : 1;
          ctx.globalCompositeOperation = 'lighter';
          // luồng sáng từ đèn (giữa mép trên sân)
          const lx = f.x + f.w / 2 + (x - (f.x + f.w / 2)) * 0.35, ly = f.y - 70;
          ctx.globalAlpha = fade * 0.12 * pulse; ctx.fillStyle = o.color;
          ctx.beginPath(); ctx.moveTo(lx - 3, ly); ctx.lineTo(x - rx, y); ctx.lineTo(x + rx, y); ctx.lineTo(lx + 3, ly); ctx.closePath(); ctx.fill();
          for (const [s, a] of [[1, 0.16], [0.75, 0.16], [0.45, 0.18]]) {
            ctx.globalAlpha = fade * a * pulse;
            ctx.beginPath(); ctx.ellipse(x, y, rx * s, ry * s, 0, 0, Math.PI * 2); ctx.fill();
          }
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = fade * 0.8;
          ctx.strokeStyle = red ? '#ff3d5a' : '#ffffff'; ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]); ctx.lineDashOffset = -t * 12;
          ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]);
          break;
        }
        case 'alarm': {   // bị đèn soi: vòng đỏ quanh chân đầy dần (b = giây tới lúc FREEZE) + dấu ! nhấp nháy trên đầu
          const prog = Math.min(1, el / o.b), on = Math.floor(t * 12) % 2;
          ctx.strokeStyle = '#140c16'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.ellipse(x, y + 1, 11, 5, 0, 0, Math.PI * 2); ctx.stroke();
          ctx.strokeStyle = o.color; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(x, y + 1, 11, 5, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * prog); ctx.stroke();
          if (on) { px(ctx, x - 2, y - 44, 4, 8, '#140c16'); px(ctx, x - 1, y - 43, 2, 5, o.color); px(ctx, x - 2, y - 35, 4, 4, '#140c16'); px(ctx, x - 1, y - 34, 2, 2, o.color); }
          break;
        }
      }
    },
  };

  SFC.ModDraw = ModDraw;
})();
