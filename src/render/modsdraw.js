/* ModDraw — hình các vật thể của LUẬT TRẬN FOOTBALL STORY (src/systems/matchmods.js). render/vfx.js drawProp gọi draw() cho các kind ở đây.
 * stool (ghế nhựa) · stoolfly (ghế vỡ văng) · lane (làn giao hàng nhấp nháy) · moped (xe máy giao hàng) · spot (đèn pha) · alarm (vòng đếm ngược bị soi)
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
      stool: 1, stoolheld: 1, stoolthrow: 1, stoolfly: 1, lane: 1, moped: 1, spot: 1, alarm: 1 },
    // c: { x, y } vị trí đã tính (propAt) · k: 1 -> 0 · el: giây đã sống · fade: độ mờ vào / ra
    draw(ctx, g, o, c, k, el, fade) {
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
        case 'graffitiwarn': {   // tường sơn sắp phun: chấm sơn chạy dần dọc đường tường
          const k2 = Math.min(1, el / o.max);
          ctx.strokeStyle = o.color; ctx.lineWidth = 2; ctx.setLineDash([2, 3]);
          ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(o.x + (o.a - o.x) * k2, o.y + (o.b - o.y) * k2); ctx.stroke();
          ctx.setLineDash([]);
          if (Math.floor(t * 12) % 2) px(ctx, Math.round(o.x + (o.a - o.x) * k2) - 1, Math.round(o.y + (o.b - o.y) * k2) - 1, 3, 3, '#ffffff');
          break;
        }
        case 'graffiti': {   // tường graffiti đứng: dày 5px, cao 14px (vẽ chồng từng lớp nên tường dọc / ngang đều thấy dày), nét vẽ bậy trắng
          const H = 14, x0 = o.x, y0 = o.y, x1 = o.a, y1 = o.b, line = (w, c2, k2) => { ctx.strokeStyle = c2; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0 - k2); ctx.lineTo(x1, y1 - k2); ctx.stroke(); };
          ctx.lineCap = 'round';
          for (let k2 = 0; k2 <= H; k2 += 2) line(8, SP().OUT, k2);
          for (let k2 = 0; k2 <= H; k2 += 2) line(5, k2 < 4 ? dark(o.color, 0.35) : o.color, k2);
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
          ctx.beginPath();
          for (let i = 0; i <= 6; i++) { const k2 = i / 6, gx = x0 + (x1 - x0) * k2 + (i % 2 ? 1 : -1), gy = y0 + (y1 - y0) * k2 - H + 3 + (i % 2 ? 3 : 0); if (i) ctx.lineTo(gx, gy); else ctx.moveTo(gx, gy); }
          ctx.stroke();
          ctx.lineCap = 'butt';
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
        case 'stoolthrow': {   // ghế đang bay: xoay tít, bóng đổ dưới đất
          ellipse(ctx, x, y + 1, 6, 2, 'rgba(0,0,0,0.3)');
          ctx.save(); ctx.translate(x, y - 16); ctx.rotate(el * 22); ctx.translate(-x, -(y - 16));
          stool(ctx, x, y - 10, o.color);
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
