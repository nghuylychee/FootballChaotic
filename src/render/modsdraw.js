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

  const ModDraw = {
    kinds: { flock: 1, splatfall: 1, splat: 1, wind: 1, graffitiwarn: 1, graffiti: 1, lantern: 1, hot: 1, stallwarn: 1, stall: 1, tide: 1, card: 1, star: 1,
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
        case 'hot': {   // bóng nóng: quầng cam nhấp nháy quanh bóng + hơi bốc lên
          const pul = 0.6 + 0.4 * Math.sin(t * 16);
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = fade * 0.45 * pul; ellipse(ctx, x, y - 2, 7, 6, o.color);
          ctx.globalAlpha = fade * 0.25; ellipse(ctx, x, y - 2, 11, 9, '#ffe14f');
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = fade * 0.7;
          for (let i = 0; i < 3; i++) { const ph = (t * 1.5 + i / 3) % 1; px(ctx, Math.round(x - 3 + i * 3 + Math.sin(t * 6 + i) * 1.5), Math.round(y - 6 - ph * 14), 1, 2, '#e8ecf5'); }
          break;
        }
        case 'stallwarn': {   // sạp chợ sắp đẩy ra: khung sọc cam nhấp nháy ở mép sân (b = phía: -1 trên, 1 dưới)
          const S2 = SFC_CONFIG.stories.mods.stalls, y0 = o.b < 0 ? f.y : o.y, h2 = S2.depth;
          ctx.globalAlpha = fade * (Math.floor(el * 10) % 2 ? 0.35 : 0.15);
          ctx.fillStyle = o.color; ctx.fillRect(Math.round(o.x), y0, Math.round(o.a - o.x), h2);
          ctx.globalAlpha = fade; ctx.strokeStyle = o.color; ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
          ctx.strokeRect(Math.round(o.x) + 0.5, y0 + 0.5, Math.round(o.a - o.x) - 1, h2 - 1);
          ctx.setLineDash([]);
          break;
        }
        case 'stall': {   // sạp hàng: mái bạt sọc + quầy gỗ + hàng hoá (b = phía)
          const S2 = SFC_CONFIG.stories.mods.stalls, x0 = Math.round(o.x), w2 = Math.round(o.a - o.x), top = o.b < 0 ? f.y - 10 : o.y - 12, h2 = S2.depth + 10;
          px(ctx, x0 - 1, top - 1, w2 + 2, h2 + 2, SP().OUT);
          px(ctx, x0, top + 10, w2, h2 - 10, '#7a4510');
          px(ctx, x0, top + 10, w2, 2, '#c9781a');
          for (let i = 0; i < w2; i += 10) { px(ctx, x0 + i, top, 5, 10, o.color); px(ctx, x0 + i + 5, top, 5, 10, '#fff3d6'); }
          for (let i = 6; i < w2 - 6; i += 12) { px(ctx, x0 + i, top + 14, 6, 5, ['#ff3d5a', '#ffd23f', '#6bff7a'][(i / 12 | 0) % 3]); }
          break;
        }
        case 'tide': {   // thuỷ triều: dải nước từ mép trên / dưới (o.x = phía), mực nước theo MatchMods tide.level, sóng lăn tăn ở mép
          const C2 = SFC_CONFIG.stories.mods.tide, lv = SFC.MatchMods.K.tide.level(C2, el - C2.warn, f);
          if (lv < 1) break;
          const y0 = o.x < 0 ? f.y : f.y + f.h - lv, edge = o.x < 0 ? f.y + lv : f.y + f.h - lv;
          ctx.globalAlpha = fade * 0.38; ctx.fillStyle = o.color; ctx.fillRect(f.x, Math.round(y0), f.w, Math.round(lv));
          ctx.globalAlpha = fade * 0.8;
          for (let wx = f.x; wx < f.x + f.w; wx += 6) px(ctx, wx, Math.round(edge + Math.sin(t * 5 + wx * 0.15) * 1.5) - 1, 4, 1, '#e8f6ff');
          break;
        }
        case 'card': {   // thẻ phạt trên đầu (b = 0 vàng, 1 đỏ), giơ lên lắc nhẹ
          const q = g.players.find((p2) => p2.id === o.a), hy = q ? q.y - 34 * (q.sizeMul || 1) : y - 34, wob = Math.floor(t * 8) % 2;
          px(ctx, x - 3 + wob, hy - 9, 7, 10, SP().OUT); px(ctx, x - 2 + wob, hy - 8, 5, 8, o.color);
          px(ctx, x - 1 + wob, hy - 7, 1, 2, '#ffffff');
          break;
        }
        case 'star': {   // STAR / GOLDEN BOOT: vòng vàng dưới chân + sao lấp lánh quanh người (b = 1: người của đội bạn)
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = fade * (0.35 + 0.15 * Math.sin(t * 10)); ellipse(ctx, x, y, 13, 6, o.color);
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = fade;
          for (let i = 0; i < 3; i++) { const a2 = t * 3 + i * 2.1; const sx = Math.round(x + Math.cos(a2) * 12), sy = Math.round(y - 14 + Math.sin(a2) * 10); px(ctx, sx - 1, sy, 3, 1, '#fff6a0'); px(ctx, sx, sy - 1, 1, 3, '#fff6a0'); }
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
