/* Story — cut scene kiểu anime (PROLOGUE). Kịch bản ở config/ftue.config.js -> scenes.
 * Hình vẽ procedural trên canvas 640x360 (mỗi cảnh 1 hàm trong ART), chữ là lớp DOM phía trên (gõ máy / đập xuống).
 * Enter / Space: gõ nốt dòng đang gõ, không thì sang cảnh kế · giữ Enter / Esc: bỏ qua cả cut scene.
 * Chạy bằng update(dt, input) từ vòng lặp chính (app.screen = 'story').
 */
window.SFC = window.SFC || {};

(function () {
  const W = 640, H = 360;
  const CFG = () => SFC_CONFIG.ftue;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const easeOut = (k) => 1 - (1 - k) * (1 - k);
  // số ngẫu nhiên cố định theo hạt giống (sao, khán giả, hạt mưa không nhảy lung tung mỗi khung)
  const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

  let ctx = null, buf = null;
  function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function vgrad(y0, y1, stops) {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
    return g;
  }
  function glow(x, y, r, rgb, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // character phóng to kiểu pixel: vẽ vào canvas nhỏ rồi phóng lên (x = giữa chân, y = mặt đất)
  function hero(x, y, s, t, facing = Math.PI / 2, extra = null, alpha = 1) {
    const look = SFC.Profile.lookOf(), kit = SFC_CONFIG.mainPath.playerTeam.kit;
    SFC.Sprites.drawAvatar(buf, look, kit, t, facing, extra);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(buf, Math.round(x - (buf.width / 2) * s), Math.round(y - (buf.height - 4) * s), buf.width * s, buf.height * s);
    ctx.restore();
  }
  function ball(x, y, r) {
    ctx.fillStyle = '#140c16'; ctx.beginPath(); ctx.arc(x, y, r + 1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f3ead7'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    rect(x - r * 0.35, y - r * 0.35, r * 0.7, r * 0.7, '#140c16');
  }
  function rain(t, n, a, color = '180,190,230') {
    ctx.strokeStyle = `rgba(${color},${a})`; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = (hash(i) * (W + 120) + t * 90) % (W + 120) - 60;
      const y = (hash(i + 99) * H + t * (420 + hash(i + 7) * 200)) % H;
      ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 12);
    }
    ctx.stroke();
  }
  // vạch tốc độ kiểu manga toả từ tâm
  function speedLines(cx, cy, n, t, a, color = '255,255,255') {
    ctx.fillStyle = `rgba(${color},${a})`;
    const seed = Math.floor(t * 18);
    for (let i = 0; i < n; i++) {
      const ang = hash(i + seed * 13) * Math.PI * 2, w = 0.004 + hash(i * 3 + seed) * 0.012;
      const r0 = 110 + hash(i + seed) * 90, r1 = 480;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang - w) * r1, cy + Math.sin(ang - w) * r1);
      ctx.lineTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0);
      ctx.lineTo(cx + Math.cos(ang + w) * r1, cy + Math.sin(ang + w) * r1);
      ctx.fill();
    }
  }
  // khán đài: các bậc cong đầy chấm khán giả nhấp nháy + đèn flash máy ảnh
  function crowd(t, y0, y1, flashRate) {
    rect(0, y0, W, y1 - y0, '#10142e');
    for (let row = 0, y = y0 + 3; y < y1 - 2; row++, y += 7) {
      rect(0, y + 5, W, 1, 'rgba(0,0,0,0.35)');
      for (let x = (row % 2) * 4; x < W; x += 8) {
        const k = hash(x * 0.37 + row * 17.3);
        const bob = Math.sin(t * 9 + k * 30) > 0.6 ? -1 : 0;
        rect(x, y + bob, 4, 4, ['#3a3f6a', '#5a4a7a', '#7a3a5a', '#2a5a7a', '#a08a5a'][Math.floor(k * 5)]);
      }
    }
    const n = Math.floor(flashRate);
    for (let i = 0; i < n; i++) {
      const seed = Math.floor(t * 12) * 31 + i;
      if (hash(seed) > 0.5) continue;
      const x = hash(seed + 1) * W, y = y0 + hash(seed + 2) * (y1 - y0);
      glow(x, y, 10, '255,255,255', 0.9);
      rect(x - 1, y - 1, 3, 3, '#fff');
    }
  }
  function beams(t, cols) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    cols.forEach((c, i) => {
      const ox = 80 + i * 160, a = Math.sin(t * 0.9 + i * 1.7) * 0.5;
      const tx = ox + Math.sin(a) * 260, g = ctx.createLinearGradient(ox, 0, tx, H);
      g.addColorStop(0, `rgba(${c},0.32)`); g.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(ox - 6, 0); ctx.lineTo(ox + 6, 0); ctx.lineTo(tx + 70, H); ctx.lineTo(tx - 70, H); ctx.fill();
    });
    ctx.restore();
  }


  /* ---------- vẽ pixel art thật: canvas 160x90 (1 pixel = 4x4 trên màn), chỉ khối màu cứng + dither, phóng to không làm mượt ---------- */
  const LW = 160, LH = 90, LS = W / LW;
  let lo = null, lx = null;
  function loBegin() {
    if (!lo) { lo = document.createElement('canvas'); lo.width = LW; lo.height = LH; lx = lo.getContext('2d'); }
    lx.clearRect(0, 0, LW, LH);
  }
  // ox / oy: lệch theo pixel thấp (rung màn kiểu pixel)
  function loEnd(ox = 0, oy = 0) {
    ctx.imageSmoothingEnabled = false;
    if (ox || oy) rect(0, 0, W, H, '#050308');
    ctx.drawImage(lo, ox * LS, oy * LS, W, H);
  }
  function P(x, y, w, h, c) { lx.fillStyle = c; lx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  // elip đặc theo hàng pixel
  function pEllipse(cx, cy, rx, ry, c) {
    for (let y = -ry; y <= ry; y++) { const h = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry)))); P(cx - h, cy + y, h * 2 + 1, 1, c); }
  }
  // hàng dither bàn cờ (mật độ: 2 = 50%, 4 = 25%)
  function pDither(y, c, every = 2, x0 = 0, x1 = LW) {
    lx.fillStyle = c;
    for (let x = x0 + ((y + x0) % every); x < x1; x += every) lx.fillRect(x, y, 1, 1);
  }
  // gradient dạng dải màu, ranh giới giữa 2 dải 1 hàng dither 50%
  function pBands(y0, y1, cols) {
    const bh = (y1 - y0) / cols.length;
    cols.forEach((c, i) => {
      const a = Math.round(y0 + i * bh), b = Math.round(y0 + (i + 1) * bh);
      P(0, a, LW, b - a, c);
      if (i < cols.length - 1) pDither(b - 1, cols[i + 1], 2);
    });
  }
  // tia pixel từ tâm (vạch tốc độ manga)
  function pRay(cx, cy, a, r0, r1, c) {
    const dx = Math.cos(a), dy = Math.sin(a);
    lx.fillStyle = c;
    for (let r = r0; r < r1; r += 1) lx.fillRect(Math.round(cx + dx * r), Math.round(cy + dy * r), 1, 1);
  }
  // nhân vật đúng 1x sprite gốc trên canvas thấp (mật độ pixel khớp cảnh)
  function loHero(x, y, t, facing = Math.PI / 2, extra = null) {
    const look = SFC.Profile.lookOf(), kit = SFC_CONFIG.mainPath.playerTeam.kit;
    SFC.Sprites.drawAvatar(buf, look, kit, t, facing, extra);
    lx.drawImage(buf, Math.round(x - buf.width / 2), Math.round(y - (buf.height - 4)));
  }
  // sáng / tối màu hex: k > 0 sáng hơn, k < 0 tối hơn
  function shade(hex, k) {
    const n = parseInt(String(hex).replace('#', '').padEnd(6, '0').slice(0, 6), 16);
    const f = (v) => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
    return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('');
  }
  const INK = '#140c16';

  // 1 mắt anime pixel: side -1 = mắt trái (đuôi mắt bên trái), open 0..1 = mở mắt
  function pEye(cx, cy, side, open, hair) {
    const rx = 15, ry = 7, ryO = Math.round(ry * open);
    const outer = cx + side * (rx + 1);
    // lông mày chau: đuôi cao, đầu mày thấp, bậc thang pixel
    const bx0 = cx + side * (rx + 3), bx1 = cx - side * (rx - 3), N = Math.abs(bx1 - bx0);
    for (let k = 0; k <= N; k++) {
      const x = Math.round(bx0 + (bx1 - bx0) * (k / N)), y = Math.round(cy - 17 + 6 * (k / N));
      P(x, y, 1, 3, hair); P(x, y + 3, 1, 1, shade(hair, -0.45));
    }
    if (ryO < 1) { P(cx - rx - 1, cy, rx * 2 + 3, 2, INK); return; }   // nhắm: 1 nét mi
    // tròng trắng + bóng mí trên
    pEllipse(cx, cy, rx, ryO, '#fbf6ea');
    const half = (y) => Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ryO * ryO))));
    for (let y = -ryO; y <= -ryO + 1; y++) P(cx - half(y), cy + y, half(y) * 2 + 1, 1, '#c9c2dc');
    // con ngươi cao, nhìn vào giữa: dải màu tối trên -> vàng sáng dưới, cắt theo tròng trắng
    const ix = cx - side * 2, IR = 6, IRY = 7;
    const band = (y) => (y < -4 ? '#5a2208' : y < -1 ? '#a8480e' : y < 2 ? '#e0761a' : y < 5 ? '#ffae2e' : '#ffe07a');
    for (let y = -ryO; y <= ryO; y++) {
      if (Math.abs(y) > IRY) continue;
      const ih = Math.round(IR * Math.sqrt(Math.max(0, 1 - (y * y) / (IRY * IRY)))), sh = half(y);
      const l = Math.max(ix - ih, cx - sh), r = Math.min(ix + ih, cx + sh);
      if (r >= l) P(l, cy + y, r - l + 1, 1, band(y));
      // viền con ngươi + đồng tử
      if (r >= l) { P(l, cy + y, 1, 1, '#3a1406'); P(r, cy + y, 1, 1, '#3a1406'); }
      if (Math.abs(y) <= 4 && Math.abs(y) <= ryO) P(ix - 1, cy + y, 3, 1, INK);
    }
    // ánh sáng (chỉ khi mở đủ)
    if (ryO >= 5) { P(ix - 4, cy - 4, 3, 3, '#ffffff'); P(ix + 2, cy + 2, 2, 2, '#ffffff'); P(ix - 1, cy + 4, 1, 1, '#fff6c0'); }
    // mi trên dày + đuôi mi hất ra ngoài, mi dưới mảnh ở nửa ngoài
    for (let x = -rx - 1; x <= rx + 1; x++) {
      const y = -Math.round(ryO * Math.sqrt(Math.max(0, 1 - (x * x) / ((rx + 1) * (rx + 1))))) - 1;
      P(cx + x, cy + y - 1, 1, 2, INK);
    }
    P(outer + side, cy - 2, 2, 1, INK); P(outer + side * 2, cy - 3, 2, 1, INK); P(outer + side * 3, cy - 4, 1, 1, INK);
    for (let k = 0; k <= rx; k++) {
      const x = side * k, y = Math.round(ryO * Math.sqrt(Math.max(0, 1 - (x * x) / (rx * rx)))) + 1;
      if (k > rx * 0.3) P(cx + x, cy + y, 1, 1, '#7a4a3a');
    }
  }

  /* ---------------- các cảnh (t = giây trong cảnh, d = thời lượng cảnh) ---------------- */
  const ART = {
    black(t) {
      rect(0, 0, W, H, '#050308');
      rain(t, 60, 0.12);
    },

    fade(t, d) {
      rect(0, 0, W, H, '#050308');
      rect(0, 0, W, H, `rgba(255,255,255,${1 - clamp01(t / (d * 0.8))})`);
    },

    flash() { rect(0, 0, W, H, '#ffffff'); },

    // ngõ tối mưa: đứa trẻ sút bóng vào khung thành vẽ phấn trên tường
    alley(t, d) {
      const zoom = 1 + t * 0.012;
      ctx.save();
      ctx.translate(W / 2, H / 2); ctx.scale(zoom, zoom); ctx.translate(-W / 2, -H / 2);
      rect(0, 0, W, H, vgrad(0, H, ['#07060f', '#171229', '#231a33']));
      // tường gạch
      for (let y = 70, r = 0; y < 262; y += 10, r++) {
        for (let x = (r % 2) * -14; x < W; x += 28) rect(x + 1, y + 1, 26, 8, ['#2c2030', '#302334', '#281c2c'][Math.floor(hash(x + r * 57) * 3)]);
      }
      rect(0, 60, W, 12, '#1a1220');
      // khung thành vẽ phấn
      ctx.strokeStyle = 'rgba(236,228,200,0.75)'; ctx.lineWidth = 2; ctx.setLineDash([6, 3]);
      ctx.strokeRect(420, 150, 140, 90); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(236,228,200,0.5)'; ctx.font = '8px "Press Start 2P"';
      ctx.fillText('GOAT', 448, 140); ctx.fillText('#10', 520, 140);
      // đất + vũng nước
      rect(0, 262, W, H - 262, vgrad(262, H, ['#141019', '#0b0910']));
      rect(140, 300, 220, 3, 'rgba(255,220,140,0.18)'); rect(380, 320, 120, 2, 'rgba(255,220,140,0.12)');
      // đèn đường
      rect(88, 40, 5, 222, '#221c28'); rect(88, 40, 40, 4, '#221c28'); rect(118, 42, 14, 6, '#ffe9a8');
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(0, 48, 0, 270);
      g.addColorStop(0, 'rgba(255,220,140,0.35)'); g.addColorStop(1, 'rgba(255,220,140,0.02)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(116, 48); ctx.lineTo(134, 48); ctx.lineTo(260, 270); ctx.lineTo(-10, 270); ctx.fill();
      ctx.restore();
      // sút bóng vào tường mỗi 1.2s
      const P = 1.2, k = (t % P) / P, cyc = Math.floor(t / P);
      const kick = k < 0.18;
      hero(250, 272, 3, t, 0, kick ? { atkType: 'shoot', atkT: k * P } : { vx: 0 });
      let bx, by;
      if (k < 0.12) { bx = 276; by = 262; }
      else if (k < 0.5) { const q = (k - 0.12) / 0.38; bx = 276 + q * (470 - 276); by = 262 - Math.sin(q * Math.PI * 0.55) * 90 - q * 20; }
      else { const q = (k - 0.5) / 0.5; bx = 470 - q * (470 - 276); by = 190 + q * 72 - Math.sin(q * Math.PI) * 40; }
      ball(bx, by, 5);
      if (k >= 0.5 && k < 0.56) { speedLinesAt(470, 195); }
      if (Story.cueOnce('kick' + cyc, k > 0.12)) SFC.Audio.kick(0.25);
      if (Story.cueOnce('wall' + cyc, k > 0.5)) SFC.Audio.wall();
      rain(t, 140, 0.28);
      ctx.restore();
      vignette(0.75);
    },

    // mắt anime cận cảnh (pixel art 160x90): tóc mái, lông mày chau, mắt mở ra + vạch tốc độ pixel
    eyes(t) {
      loBegin();
      const look = SFC.Profile.lookOf(), skin = look.skin || '#f1c7a0', hair = hairColor();
      const hit = t > 0.35;
      const shake = hit && t < 0.9 ? Math.round((hash(Math.floor(t * 30)) - 0.5) * 4) : 0;
      P(0, 0, LW, LH, '#0d0816');
      // vạch tốc độ: tia pixel 2 tông, đổi 10 lần / giây (giật kiểu hoạt hình)
      const seed = Math.floor(t * 10);
      for (let i = 0; i < (hit ? 60 : 34); i++) {
        const a = hash(i + seed * 7) * Math.PI * 2, r0 = 30 + hash(i * 3 + seed) * 26;
        pRay(80, 45, a, r0, 110, hash(i + seed * 3) > 0.55 ? '#5a4880' : '#2e2446');
      }
      // dải mặt: da + bóng dưới, tóc mái răng cưa
      const top = 18, bot = 72;
      P(0, top, LW, bot - top, skin);
      P(0, bot - 3, LW, 1, shade(skin, -0.12)); P(0, bot - 2, LW, 2, shade(skin, -0.22));
      for (let x = 0; x < LW; x++) {
        const k = x % 11, len = 2 + Math.round((k < 6 ? k : 11 - k) * 1.4), k2 = (x + 5) % 7, len2 = 2 + (k2 < 4 ? k2 : 7 - k2);
        const L = Math.max(len, len2);
        P(x, top, 1, L, hair); P(x, top + L, 1, 1, shade(skin, -0.25));   // bóng tóc đổ lên da
        if (k === 3 && L > 5) P(x, top + 1, 1, L - 4, shade(hair, 0.22));   // vệt bóng tóc
      }
      const open = easeOut(clamp01(t / 0.3));
      pEye(52, 51, -1, open, hair);
      pEye(108, 51, 1, open, hair);
      // má đỏ gay + giọt mồ hôi
      if (hit) { pDither(63, '#e88a7a', 2, 30, 46); pDither(63, '#e88a7a', 2, 114, 130); P(137, 38, 2, 3, '#bfe6ff'); P(137, 41, 2, 1, '#ffffff'); }
      // chớp: phủ dither trắng
      if (t > 0.35 && t < 0.5) for (let y = 0; y < LH; y++) pDither(y, '#ffffff', 2);
      loEnd(shake, 0);
      if (Story.cueOnce('eyes', hit)) { SFC.Audio.hit(); SFC.Audio.whoosh(); }
    },

    // sân vận động khổng lồ: đèn quét, flash máy ảnh, pháo giấy, character toả hào quang vàng
    stadium(t, d, zoomIn = 0) {
      const z = 1 + zoomIn;
      ctx.save();
      ctx.translate(W / 2, 250); ctx.scale(z, z); ctx.translate(-W / 2, -250);
      rect(0, 0, W, H, vgrad(0, H, ['#02030c', '#0a1030', '#10183e']));
      crowd(t, 60, 200, 8);
      rect(0, 56, W, 6, '#05060f');
      // màn hình lớn
      rect(250, 14, 140, 38, '#05060f'); rect(254, 18, 132, 30, '#1a1440');
      ctx.fillStyle = Math.floor(t * 3) % 2 ? '#ffd23f' : '#fff3b0'; ctx.font = '10px "Press Start 2P"'; ctx.textAlign = 'center';
      ctx.fillText('G.O.A.T', 320, 38); ctx.textAlign = 'left';
      // mặt sân phối cảnh
      rect(0, 200, W, H - 200, vgrad(200, H, ['#1f6a34', '#2a8a44']));
      for (let i = 0; i < 9; i++) rect(0, 200 + i * i * 2.2, W, 1, 'rgba(255,255,255,0.05)');
      ctx.strokeStyle = 'rgba(236,240,220,0.5)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(W / 2, 262, 130, 30, 0, 0, Math.PI * 2); ctx.stroke();
      beams(t, ['255,240,190', '190,220,255', '255,200,240', '255,240,190']);
      // hào quang + character
      const pulse = 0.55 + Math.sin(t * 5) * 0.12;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      glow(W / 2, 240, 120, '255,200,60', pulse * 0.6);
      glow(W / 2, 230, 60, '255,240,170', pulse * 0.6);
      ctx.restore();
      const pose = (t % 2.2) < 0.35 && t > 0.8;
      hero(W / 2, 276, 5, t, Math.PI / 2, pose ? { atkType: 'shoot', atkT: t % 2.2 } : null);
      // pháo giấy
      for (let i = 0; i < 90; i++) {
        const x = (hash(i) * W + Math.sin(t * 2 + i) * 14) % W;
        const y = (hash(i + 40) * H + t * (40 + hash(i + 3) * 50)) % H;
        rect(x, y, 3, 2 + (i % 2), ['#ffd23f', '#ff3fb4', '#3ff6ff', '#ffffff', '#9dff3d'][i % 5]);
      }
      ctx.restore();
      vignette(0.55);
      if (Story.cueOnce('roar', true)) { SFC.Audio.goal(); SFC.Audio.crowdRoar(1); }
      if (Story.cueOnce('slam', t > 0.3)) SFC.Audio.hit();
      if (Story.cueOnce('slam2', t > 1.3)) SFC.Audio.upgrade();
    },

    // lao vào giấc mơ: phóng to về phía character rồi trắng xoá
    dive(t, d) {
      ART.stadium(t + 5, d, easeOut(clamp01(t / d)) * 1.6);
      speedLines(W / 2, 220, 60, t, 0.2 + t * 0.1);
      rect(0, 0, W, H, `rgba(255,255,255,${clamp01((t - (d - 1.1)) / 1.0)})`);
      if (Story.cueOnce('dive', t > d - 1)) SFC.Audio.whoosh();
    },

    // phòng ngủ: đồng hồ báo thức rung, poster GOAT trên tường
    wake(t) {
      const shake = t < 1.1 ? (hash(Math.floor(t * 50)) - 0.5) * 6 : 0;
      ctx.save(); ctx.translate(shake, shake * 0.5);
      rect(-10, -10, W + 20, H + 20, vgrad(0, H, ['#1a2040', '#2a2a4a']));
      // cửa sổ: ánh sáng bình minh
      rect(430, 50, 130, 100, '#0e1024'); rect(434, 54, 122, 92, vgrad(54, 146, ['#ffb38a', '#ffe0a8']));
      rect(493, 54, 4, 92, '#0e1024'); rect(434, 98, 122, 4, '#0e1024');
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,200,140,0.12)'; ctx.beginPath(); ctx.moveTo(434, 146); ctx.lineTo(556, 146); ctx.lineTo(470, 330); ctx.lineTo(300, 330); ctx.fill();
      ctx.restore();
      // poster
      rect(120, 60, 90, 110, '#f3ead7'); rect(124, 64, 82, 102, '#231a33');
      ctx.fillStyle = '#ffd23f'; ctx.font = '10px "Press Start 2P"'; ctx.fillText('GOAT', 136, 150);
      ctx.fillStyle = '#ffd23f'; ctx.beginPath();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 12 : 26, a = -Math.PI / 2 + i * Math.PI / 5; ctx[i ? 'lineTo' : 'moveTo'](165 + Math.cos(a) * r, 108 + Math.sin(a) * r); }
      ctx.fill();
      // sàn + giường
      rect(-10, 250, W + 20, 120, '#171328');
      hero(300, 262, 4, t, Math.PI / 2, null);
      rect(170, 236, 290, 70, '#3a4a8a'); rect(170, 236, 290, 8, '#4a5aa0'); rect(160, 230, 14, 90, '#5a3a2a'); rect(456, 250, 14, 70, '#5a3a2a');
      // đồng hồ báo thức
      const jig = t < 1.1 ? Math.sin(t * 80) * 2 : 0;
      rect(500 + jig, 222, 70, 60, '#3a2a2a'); rect(506 + jig, 206, 26, 22, '#d7263d');
      ctx.fillStyle = '#d7263d'; ctx.beginPath(); ctx.arc(519 + jig, 214, 13, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f3ead7'; ctx.beginPath(); ctx.arc(519 + jig, 214, 9, 0, Math.PI * 2); ctx.fill();
      rect(518 + jig, 207, 2, 7, '#140c16'); rect(519 + jig, 213, 5, 2, '#140c16');
      if (t < 1.1) { ctx.strokeStyle = '#ffe14f'; ctx.lineWidth = 2; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(519 + s * 20, 200); ctx.lineTo(519 + s * 30, 192); ctx.stroke(); ctx.beginPath(); ctx.moveTo(519 + s * 22, 214); ctx.lineTo(519 + s * 34, 214); ctx.stroke(); } }
      ctx.restore();
      if (t < 1.1 && Story.cueOnce('ring' + Math.floor(t * 7), true)) SFC.Audio.block();
      vignette(0.6);
    },

    // sáng sớm ở VILLAGE GREEN (pixel art 160x90): bầu trời dải màu, đồi, hàng rào, sân bùn, khung thành gỗ
    village(t, d, dim = 0) {
      loBegin();
      pBands(0, 46, ['#5e8fd0', '#7aa8dc', '#9cc0e4', '#c8d6e0', '#ffd8b0', '#ffc190', '#ffa878']);
      // mặt trời: 2 tông + vành dither
      const sy = 28 - Math.floor(t * 0.8);
      for (let y = -10; y <= 10; y++) for (let x = -10; x <= 10; x++) {
        const r = Math.hypot(x, y);
        if (r > 8 && r <= 10 && (x + y) % 2 === 0) P(118 + x, sy + y, 1, 1, '#ffe6b0');
      }
      pEllipse(118, sy, 7, 7, '#ffe9a8'); pEllipse(118, sy, 5, 5, '#fffbe8');
      // mây trôi
      const cloud = (x, y) => { P(x + 3, y, 6, 1, '#fff6ea'); P(x + 1, y + 1, 12, 2, '#fff6ea'); P(x, y + 3, 16, 2, '#fff6ea'); P(x + 1, y + 5, 14, 1, '#e8cfc4'); };
      cloud(Math.round((20 + t * 3) % 190) - 20, 10);
      cloud(Math.round((95 + t * 2) % 190) - 20, 18);
      // đồi xa / gần
      for (let x = 0; x < LW; x++) {
        const h1 = 38 + Math.round(Math.sin(x * 0.045) * 3 + Math.sin(x * 0.12 + 1) * 1.5);
        P(x, h1, 1, 12, '#88a86a');
        const h2 = 43 + Math.round(Math.sin(x * 0.07 + 2) * 2);
        P(x, h2, 1, 10, '#6c9650');
        if (x % 13 === 5) { P(x, h2 - 4, 1, 4, '#4a6a38'); P(x - 1, h2 - 5, 3, 2, '#5a7e44'); }   // cây nhỏ trên đồi
      }
      // cỏ: nền + dither + bụi cỏ
      P(0, 50, LW, LH - 50, '#7cb453');
      pDither(50, '#94c866', 2); pDither(51, '#94c866', 4);
      for (let i = 0; i < 70; i++) {
        const x = Math.floor(hash(i + 3) * LW), y = 54 + Math.floor(hash(i + 40) * 36);
        P(x, y, 1, 2, '#5f9a3e'); P(x + 2, y + 1, 1, 1, '#5f9a3e');
      }
      // hàng rào gỗ
      for (let x = 2; x < LW; x += 8) { P(x, 44, 2, 8, '#8a6a44'); P(x, 44, 2, 1, '#b08a5a'); }
      P(0, 46, LW, 1, '#8a6a44'); P(0, 49, LW, 1, '#8a6a44');
      // sân bùn: nền + mảng sẫm + vũng nước lấp lánh
      pEllipse(84, 66, 58, 10, '#7a5a3a');
      for (let y = 57; y <= 76; y++) pDither(y, '#6a4c30', 4, 30, 138);
      pEllipse(70, 68, 18, 3, '#654428');
      pEllipse(106, 70, 6, 2, '#8fb4d0'); P(103, 69, 2, 1, '#e6f4ff');
      // khung thành gỗ + lưới chấm
      P(126, 50, 2, 17, '#6a4020'); P(148, 48, 2, 17, '#6a4020'); P(126, 48, 24, 2, '#6a4020'); P(126, 48, 24, 1, '#9a6a3a');
      for (let y = 51; y < 65; y += 2) for (let x = 129; x < 148; x += 2) P(x + (y % 4 ? 1 : 0), y, 1, 1, '#e8e4d8');
      // chim (chữ v pixel, vỗ cánh)
      for (let i = 0; i < 3; i++) {
        const x = Math.round((30 + i * 16 + t * 6) % LW), y = 14 + i * 4 + Math.round(Math.sin(t * 3 + i)), up = Math.floor(t * 6 + i) % 2;
        P(x - 2, y - up, 1, 1, '#3a2a3a'); P(x - 1, y, 1, 1, '#3a2a3a'); P(x, y + 1 - up, 1, 1, '#3a2a3a'); P(x + 1, y, 1, 1, '#3a2a3a'); P(x + 2, y - up, 1, 1, '#3a2a3a');
      }
      // gà đi dạo
      const cx = 22 + Math.round((t * 4) % 20), hop = Math.floor(t * 6) % 2;
      P(cx, 68 - hop, 4, 3, '#f3ead7'); P(cx + 3, 66 - hop, 2, 2, '#f3ead7'); P(cx + 4, 65 - hop, 1, 1, '#d7263d'); P(cx + 5, 67 - hop, 1, 1, '#ffb21f'); P(cx + 1, 71 - hop, 1, 1, '#ffb21f');
      // nhân vật + quả bóng
      loHero(74, 69, t, 0, null);
      P(80, 66, 3, 3, '#f3ead7'); P(81, 67, 1, 1, INK); P(80, 69, 3, 1, 'rgba(0,0,0,0.25)');
      if (dim) { lx.fillStyle = `rgba(8,5,12,${dim})`; lx.fillRect(0, 0, LW, LH); }
      loEnd();
      if (!dim && Story.cueOnce('morning', true)) SFC.Audio.pick();
    },

    // nền cho thẻ MAIN PATH (thẻ là DOM)
    path(t) {
      ART.village(t + 5, 0, 0.72);
      if (Story.cueOnce('card', true)) SFC.Audio.reveal(3);
    },
  };

  function speedLinesAt(x, y) {
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 8, y + Math.sin(a) * 8); ctx.lineTo(x + Math.cos(a) * 16, y + Math.sin(a) * 16); ctx.stroke(); }
  }
  function vignette(a) {
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${a})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  function hairColor() {
    const look = SFC.Profile.lookOf();
    return look.hair || '#1a1216';
  }

  const Story = {
    active: false,

    // phát cut scene key (ftue.config.js -> scenes); xong / bỏ qua -> onDone. from = art của cảnh bắt đầu (vd. 'path')
    play(key, onDone, from = null) {
      const el = this.el || (this.el = document.getElementById('story'));
      if (!this.bound) {
        this.bound = true;
        el.addEventListener('click', () => { if (this.active) this.advance(); });
      }
      this.scenes = CFG().scenes[key] || [];
      this.onDone = onDone;
      this.active = true;
      this.hold = 0;
      el.innerHTML = `<canvas width="${W}" height="${H}"></canvas><div class="st-text"></div>
        <div class="st-skip"><i></i><span><kbd>${esc(SFC.Input.label('confirm'))}</kbd> next · hold to skip</span></div>`;
      el.classList.remove('hidden');
      ctx = el.querySelector('canvas').getContext('2d');
      ctx.imageSmoothingEnabled = false;
      if (!buf) { buf = document.createElement('canvas'); buf.width = 40; buf.height = 44; }
      this.textEl = el.querySelector('.st-text');
      this.skipEl = el.querySelector('.st-skip i');
      this.go(Math.max(0, from ? this.scenes.findIndex((sc) => sc.art === from) : 0));
    },

    go(i) {
      this.idx = i;
      this.t = 0;
      this.cues = {};
      const sc = this.scenes[i];
      if (!sc) return this.finish();
      this.shown = [];
      this.textEl.innerHTML = sc.art === 'path' ? this.pathCard() : '';
      this.el.classList.toggle('on-card', sc.art === 'path');
      this.draw();
    },

    // cue chạy đúng 1 lần mỗi cảnh (âm thanh)
    cueOnce(key, cond) {
      if (!cond || this.cues[key]) return false;
      this.cues[key] = true;
      return true;
    },

    update(dt, input) {
      if (!this.active) return;
      const sc = this.scenes[this.idx];
      this.t += dt;
      // giữ Enter / Esc: bỏ qua cả cut scene
      const holding = input.isDown('confirm') || input.isDown('pause');
      this.hold = holding ? this.hold + dt : 0;
      if (this.skipEl) this.skipEl.style.setProperty('--k', clamp01(this.hold / CFG().skipHold).toFixed(2));
      if (this.hold >= CFG().skipHold && sc.art !== 'path') return this.skipAll();
      if (input.wasPressed('confirm')) this.advance();
      else if (sc.dur > 0 && this.t >= sc.dur) return this.go(this.idx + 1);
      if (this.active) this.draw();
    },

    // Enter: dòng đang gõ -> hiện hết; không thì sang cảnh kế
    advance() {
      const sc = this.scenes[this.idx];
      if (!sc) return;
      const typing = this.shown.find((s) => s.el && s.n < s.text.length);
      if (typing) { this.t = Math.max(this.t, ...((sc.lines || []).map((l) => l.at))); this.shown.forEach((s) => { s.n = s.text.length; s.el.textContent = s.text; }); return; }
      SFC.Audio.menu();
      this.go(this.idx + 1);
    },

    skipAll() {
      // bỏ qua: nhảy tới thẻ MAIN PATH nếu có (outro vẫn cần giải thích Main Path), không thì kết thúc
      const card = this.scenes.findIndex((s) => s.art === 'path');
      if (card > this.idx) { this.hold = -99; return this.go(card); }
      this.finish();
    },

    finish() {
      this.abort();
      const cb = this.onDone;
      this.onDone = null;
      if (cb) cb();
    },

    abort() {
      this.active = false;
      if (this.el) { this.el.classList.add('hidden'); this.el.innerHTML = ''; }
    },

    draw() {
      const sc = this.scenes[this.idx];
      if (!sc) return;
      const art = ART[sc.art] || ART.black;
      ctx.save();
      art(this.t, sc.dur || 1);
      ctx.restore();
      this.drawText(sc);
    },

    // chữ: dòng tới giờ thì hiện; caption gõ máy, các kiểu khác đập xuống bằng CSS
    drawText(sc) {
      const name = SFC.Profile.data.name || 'PLAYER';
      (sc.lines || []).forEach((l, i) => {
        if (this.t < l.at || this.shown[i]) return;
        const text = l.text.replace('{name}', name);
        const el = document.createElement('div');
        el.className = 'st-line st-' + (l.style || 'caption');
        // caption mới thay caption cũ
        if (l.style === 'caption') this.textEl.querySelectorAll('.st-caption').forEach((c) => c.remove());
        this.textEl.appendChild(el);
        const typed = l.style === 'caption';
        this.shown[i] = { el, text, n: typed ? 0 : text.length, t0: this.t };
        el.textContent = typed ? '' : text;
      });
      const sp = CFG().typeSpeed;
      for (const s of this.shown) {
        if (!s || s.n >= s.text.length) continue;
        const n = Math.min(s.text.length, Math.floor((this.t - s.t0) * sp));
        if (n !== s.n) {
          if (Math.floor(n / 3) !== Math.floor(s.n / 3)) SFC.Audio.tick();
          s.n = n; s.el.textContent = s.text.slice(0, n);
        }
      }
    },

    pathCard() {
      const P = CFG().pathCard, PX = SFC.PixelIcon, MP = SFC.MainPath;
      // font pixel không có ký tự ★ -> vẽ bằng font VT323
      const star = (txt) => esc(txt).replace(/★/g, '<i class="st-s">★</i>');
      const icon = (k) => k === 'star' ? PX.ui('star') : k === 'core' ? PX.core('thunder_kick') : PX.ui('crown');
      const areas = MP.areas().slice(0, 4).map((a, i) => i === 0
        ? `<div class="st-area on" style="--c:${a.color}">${PX.area(a.id)}<span>${esc(a.name)}</span></div>`
        : '<div class="st-area"><b>?</b><span>???</span></div>').join('<em>›</em>');
      return `<div class="st-card">
        <div class="st-card-t">${esc(P.title)}</div>
        <div class="st-areas">${areas}</div>
        ${P.lines.map(([k, a, b], i) => `<div class="st-row" style="--d:${0.25 + i * 0.3}s"><span class="st-ic">${icon(k)}</span><div><b>${star(a)}</b><small>${esc(b)}</small></div></div>`).join('')}
        <div class="st-card-f">${esc(P.foot)}</div>
        <div class="st-card-go"><kbd>${esc(SFC.Input.label('confirm'))}</kbd> LET'S GO</div>
      </div>`;
    },
  };

  SFC.Story = Story;
})();
