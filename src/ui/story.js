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

    // mắt anime cận cảnh + vạch tốc độ
    eyes(t) {
      const shake = t > 0.35 && t < 0.9 ? (hash(Math.floor(t * 60)) - 0.5) * 8 : 0;
      ctx.save(); ctx.translate(shake, 0);
      rect(-10, 0, W + 20, H, '#0a0610');
      speedLines(W / 2, H / 2, 70, t, 0.22 + (t > 0.35 ? 0.2 : 0));
      const skin = SFC.Profile.lookOf().skin || '#f1c7a0';
      const hair = hairColor();
      // dải mặt (letterbox)
      rect(-10, 112, W + 20, 136, skin);
      rect(-10, 112, W + 20, 6, 'rgba(0,0,0,0.25)'); rect(-10, 242, W + 20, 6, 'rgba(0,0,0,0.2)');
      const open = easeOut(clamp01(t / 0.3));
      for (const side of [-1, 1]) {
        const cx = W / 2 + side * 128, cy = 184;
        // lông mày chau lại
        ctx.fillStyle = hair;
        const ox = cx + side * 62, ix = cx - side * 56;   // đuôi mày cao, đầu mày chau xuống
        ctx.beginPath(); ctx.moveTo(ox, cy - 56); ctx.lineTo(ix, cy - 42); ctx.lineTo(ix, cy - 33); ctx.lineTo(ox, cy - 47); ctx.fill();
        // tròng trắng
        const h = 34 * open;
        ctx.fillStyle = '#fbf6ea';
        ctx.beginPath(); ctx.ellipse(cx, cy, 56, Math.max(1, h), 0, 0, Math.PI * 2); ctx.fill();
        if (open > 0.2) {
          ctx.save();
          ctx.beginPath(); ctx.ellipse(cx, cy, 56, h, 0, 0, Math.PI * 2); ctx.clip();
          // con ngươi: vàng cháy -> lấp lánh
          const ir = ctx.createRadialGradient(cx, cy + 4, 2, cx, cy, 30);
          ir.addColorStop(0, '#fff7b0'); ir.addColorStop(0.45, '#ffb21f'); ir.addColorStop(1, '#7a3a08');
          ctx.fillStyle = ir; ctx.beginPath(); ctx.arc(cx + side * -6, cy, 29, 0, Math.PI * 2); ctx.fill();
          rect(cx + side * -6 - 7, cy - 12, 14, 24, '#140c16');
          rect(cx + side * -6 - 16, cy - 18, 10, 10, '#ffffff');
          rect(cx + side * -6 + 8, cy + 8, 5, 5, '#ffffff');
          ctx.restore();
        }
        // mí trên đậm
        ctx.strokeStyle = '#140c16'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.ellipse(cx, cy, 58, Math.max(1, h + 2), 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
      }
      ctx.restore();
      if (t > 0.35 && t < 0.5) rect(0, 0, W, H, 'rgba(255,255,255,0.35)');
      if (Story.cueOnce('eyes', t > 0.35)) { SFC.Audio.hit(); SFC.Audio.whoosh(); }
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

    // sáng sớm ở VILLAGE GREEN: sân bùn, khung thành gỗ
    village(t, d, dim = 0) {
      rect(0, 0, W, H, vgrad(0, 200, ['#7fb6e8', '#ffd3a0', '#ffb88a']));
      const sy = 150 - t * 3;
      ctx.fillStyle = '#fffbe8'; ctx.beginPath(); ctx.arc(470, sy, 22, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(470, sy, 90, '255,230,160', 0.45); ctx.restore();
      // đồi
      ctx.fillStyle = '#6f9a4a'; ctx.beginPath(); ctx.moveTo(0, 190); for (let x = 0; x <= W; x += 20) ctx.lineTo(x, 172 + Math.sin(x * 0.012) * 14); ctx.lineTo(W, 220); ctx.lineTo(0, 220); ctx.fill();
      rect(0, 196, W, H - 196, vgrad(196, H, ['#8ab85a', '#6a9a3e']));
      // sân bùn
      ctx.fillStyle = '#7a5a3a'; ctx.beginPath(); ctx.ellipse(W / 2 + 40, 290, 230, 50, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6a4a2e'; ctx.beginPath(); ctx.ellipse(W / 2 + 10, 296, 90, 16, 0, 0, Math.PI * 2); ctx.fill();
      // khung thành gỗ
      rect(510, 222, 5, 60, '#6a4020'); rect(590, 212, 5, 64, '#6a4020'); rect(508, 216, 90, 5, '#6a4020');
      ctx.strokeStyle = 'rgba(240,240,230,0.35)'; ctx.lineWidth = 1;
      for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.moveTo(515 + i * 10, 221); ctx.lineTo(515 + i * 10, 280); ctx.stroke(); }
      // hàng rào
      for (let x = 0; x < W; x += 26) rect(x, 200, 4, 22, '#8a6a44');
      rect(0, 205, W, 3, '#8a6a44'); rect(0, 214, W, 3, '#8a6a44');
      // chim
      ctx.strokeStyle = '#3a2a3a'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) {
        const x = (80 + i * 50 + t * 22) % W, y = 70 + i * 12 + Math.sin(t * 3 + i) * 4, f = Math.sin(t * 12 + i) * 3;
        ctx.beginPath(); ctx.moveTo(x - 5, y - f); ctx.lineTo(x, y); ctx.lineTo(x + 5, y - f); ctx.stroke();
      }
      // gà đi dạo
      const cx = 120 + ((t * 18) % 80), hop = Math.floor(t * 6) % 2;
      rect(cx, 300 - hop, 10, 8, '#f3ead7'); rect(cx + 8, 296 - hop, 5, 5, '#f3ead7'); rect(cx + 10, 294 - hop, 3, 2, '#d7263d'); rect(cx + 13, 298 - hop, 2, 1, '#ffb21f');
      hero(300, 300, 3.5, t, 0, null);
      ball(330, 298, 4);
      if (dim) rect(0, 0, W, H, `rgba(8,5,12,${dim})`);
      else vignette(0.35);
      if (Story.cueOnce('morning', true)) SFC.Audio.pick();
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
      const icon = (k) => k === 'star' ? '<b class="st-star">★</b>' : k === 'core' ? PX.core('thunder_kick') : PX.ui('crown');
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
