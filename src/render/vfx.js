/* VFX render — vẽ các "viên gạch" của VFX Kit (systems/vfxkit.js). Renderer gọi theo lớp:
 *   floor(ctx, g)      : dấu vết trên sân + vòng sóng chấn (dưới cầu thủ)
 *   under(ctx, g, p)   : hào quang / vệt tàn ảnh của Core dưới sprite cầu thủ p
 *   look(ctx, g, p, hy): hình của tài nguyên (Đà, Nộ, Giáp, Nhịp) + tín hiệu ngắm / tụ lực của Core trên sprite
 *   ballFx(ctx, b)     : vệt bóng của Core (dây đàn vàng, xoắn rồng, laser, sét)
 *   arm(ctx, g, p)     : tay co giãn của cầu thủ p (vẽ ngay sau sprite của p)
 *   clones(g)          : danh sách phân thân để renderer xếp theo chiều sâu
 *   top(ctx, g)        : chiêu bay, luồng tia, tia sét, lỗ đen, chữ comic (trên cầu thủ)
 *   applyZoom(ctx, g)  : phóng to nhẹ (gọi ngay sau khi rung màn hình)
 *   overlay(ctx, g)    : phủ màu, tia tốc độ, callout, cut-in, impact frame (toạ độ màn hình)
 */
window.SFC = window.SFC || {};

(function () {
  const SP = () => SFC.Sprites;
  const W = 640, H = 360;
  const ascii = (s) => /^[\x00-\x7F]*$/.test(s);
  // chữ có dấu tiếng Việt -> VT323 (Press Start 2P không có dấu)
  const font = (s, px) => (ascii(s) ? `${Math.round(px * 0.55)}px "Press Start 2P", monospace` : `${px}px "VT323", monospace`);

  // random có hạt giống (vết nứt giữ nguyên hình dạng qua các khung hình)
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  function line(ctx, x0, y0, x1, y1, w, c) {
    ctx.strokeStyle = c; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  }

  function outlinedText(ctx, str, x, y, px, fill, stroke = '#140c16', lw = 3) {
    ctx.font = font(str, px);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.strokeText(str, x, y);
    ctx.fillStyle = fill; ctx.fillText(str, x, y);
  }

  /* ---------- dấu vết ---------- */
  function drawCrack(ctx, d, alpha) {
    const r = rng(d.seed), n = 6 + Math.floor(r() * 4), len = 16 * d.size;
    ctx.globalAlpha = alpha;
    for (let i = 0; i < n; i++) {
      let a = (i / n) * Math.PI * 2 + r() * 0.6, x = d.x, y = d.y;
      const segs = 3 + Math.floor(r() * 3);
      for (let s = 0; s < segs; s++) {
        const l = (len / segs) * (0.6 + r() * 0.8);
        a += (r() - 0.5) * 0.9;
        const nx = x + Math.cos(a) * l, ny = y + Math.sin(a) * l * 0.55;
        line(ctx, x, y, nx, ny, s === 0 ? 2 : 1, 'rgba(20,12,22,0.85)');
        line(ctx, x + 0.5, y + 1, nx + 0.5, ny + 1, 1, 'rgba(255,255,255,0.12)');
        x = nx; y = ny;
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawDecal(ctx, g, d) {
    const k = d.t / d.max, alpha = Math.min(1, k * 3.3);
    const { ellipse } = SP();
    switch (d.kind) {
      case 'crater':
        ctx.globalAlpha = alpha;
        ellipse(ctx, d.x, d.y, 16 * d.size, 7 * d.size, 'rgba(90,80,70,0.55)');
        ellipse(ctx, d.x, d.y + 1, 12 * d.size, 5 * d.size, 'rgba(20,12,22,0.8)');
        ellipse(ctx, d.x, d.y + 1, 6 * d.size, 2.5 * d.size, 'rgba(0,0,0,0.9)');
        ctx.globalAlpha = 1;
        drawCrack(ctx, Object.assign({}, d, { size: d.size * 1.6 }), alpha);
        break;
      case 'scorch': {
        const r = rng(d.seed);
        ctx.globalAlpha = alpha * 0.8;
        for (let i = 0; i < 5; i++) ellipse(ctx, d.x + (r() - 0.5) * 10 * d.size, d.y + (r() - 0.5) * 4 * d.size, (5 + r() * 6) * d.size, (2 + r() * 3) * d.size, 'rgba(30,18,12,0.6)');
        ctx.globalAlpha = 1;
        break;
      }
      case 'skid': {
        const c = Math.cos(d.angle), s = Math.sin(d.angle), L = 24 * d.size;
        ctx.globalAlpha = alpha * 0.7;
        for (const o of [-2, 2]) line(ctx, d.x - s * o, d.y + c * o, d.x - c * L - s * o, d.y - s * L * 0.6 + c * o, 1, 'rgba(20,12,22,0.8)');
        ctx.globalAlpha = 1;
        break;
      }
      case 'wallcrack': {
        // vết nứt toả lên (tường trên) hoặc xuống (tường dưới) từ điểm va
        const f = g.field, top = d.y < f.y + f.h / 2, r = rng(d.seed);
        const y0 = top ? f.y - 2 : f.y + f.h + 2;
        ctx.globalAlpha = alpha;
        for (let i = 0; i < 6; i++) {
          let x = d.x, y = y0, a = (top ? -Math.PI / 2 : Math.PI / 2) + (r() - 0.5) * 2.2;
          for (let s = 0; s < 4; s++) {
            const l = 5 + r() * 7 * d.size;
            a += (r() - 0.5) * 0.8;
            const nx = x + Math.cos(a) * l, ny = y + Math.sin(a) * l;
            line(ctx, x, y, nx, ny, s === 0 ? 2 : 1, 'rgba(10,6,12,0.9)');
            x = nx; y = ny;
          }
        }
        ctx.globalAlpha = 1;
        break;
      }
      default: drawCrack(ctx, d, alpha);
    }
  }

  function drawArm(ctx, p, a) {
    const { px, disc, OUT } = SP();
    const k = 1 - a.t / a.max;
    const ext = k < 0.4 ? k / 0.4 : k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
    const sx = p.x + (a.tx >= p.x ? 4 : -4), sy = p.y - 8 - (p.airZ || 0);
    const ex = sx + (a.tx - sx) * ext, ey = sy + (a.ty - 8 - sy) * ext;
    const len = Math.hypot(ex - sx, ey - sy), nx = -(ey - sy) / (len || 1), ny = (ex - sx) / (len || 1);
    const wob = Math.sin(k * 40) * 2.5 * (1 - Math.abs(ext - 0.5) * 2 + 0.3);
    const n = Math.max(2, Math.ceil(len / 2)), z = a.size || 1, w = z > 1 ? 2 : 1;
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i <= n; i++) {
        const u = i / n, bend = Math.sin(u * Math.PI) * wob;
        const x = Math.round(sx + (ex - sx) * u + nx * bend), y = Math.round(sy + (ey - sy) * u + ny * bend);
        if (pass === 0) px(ctx, x - 1 - w, y - 1 - w, 3 + w * 2, 3 + w * 2, OUT); else px(ctx, x - w, y - w, 1 + w * 2, 1 + w * 2, p.look.skin);
      }
    }
    const fx = Math.round(ex), fy = Math.round(ey);
    if (z > 1) {
      // nắm đấm khổng lồ: tròn, có đốt ngón tay, viền lửa đỏ
      const r = Math.round(4 * z);
      ctx.globalCompositeOperation = 'lighter';
      disc(ctx, fx, fy, r + 4, 'rgba(255,61,90,0.3)');
      ctx.globalCompositeOperation = 'source-over';
      disc(ctx, fx, fy, r + 1, OUT); disc(ctx, fx, fy, r, p.look.skin);
      const dir = a.tx >= p.x ? 1 : -1;
      for (let i = -1; i <= 1; i++) px(ctx, fx + dir * Math.round(r * 0.35), fy + i * Math.round(r * 0.45) - 1, Math.round(r * 0.5), 1, 'rgba(20,12,22,0.55)');
      disc(ctx, fx - dir * Math.round(r * 0.35), fy - Math.round(r * 0.4), Math.max(1, Math.round(r * 0.25)), 'rgba(255,255,255,0.45)');
    } else {
      px(ctx, fx - 4, fy - 4, 9, 9, OUT); px(ctx, fx - 3, fy - 3, 7, 7, p.look.skin); px(ctx, fx - 3, fy - 3, 3, 1, '#ffffff'); px(ctx, fx - 3, fy, 7, 1, 'rgba(20,12,22,0.35)');
    }
    if (ext > 0.2 && k < 0.4) for (let i = 1; i <= 3; i++) px(ctx, Math.round(fx - (ex - sx) / (len || 1) * i * 5), Math.round(fy - (ey - sy) / (len || 1) * i * 5) + (i % 2 ? -4 : 4), 3, 1, 'rgba(255,255,255,0.7)');
  }

  /* ---------- Đọc Cú Sút ---------- */
  // đường bóng dự kiến mà người đang thủ thế p cần đứng chặn: người cầm bóng đối phương -> giữa khung nhà,
  // cú sút đang bay -> theo hướng bóng. null = không có gì để đọc
  function readLine(g, p) {
    const b = g.ball, o = b.owner;
    if (o && o.team !== p.team) { const goal = g.ownGoal(p.team); return { x: o.x, y: o.y, dx: goal.x - o.x, dy: goal.y - o.y, carrier: o }; }
    if (!o && b.kind === 'shot' && b.lastKickTeam !== p.team && b.speed > 1) return { x: b.x, y: b.y, dx: b.vx, dy: b.vy, carrier: null };
    return null;
  }
  // xám -> xanh theo độ khớp đường bóng (0..1); bình phương để lệch vừa vừa vẫn còn xám rõ
  function alignColor(a) {
    const k = a * a, m = (c0, c1) => Math.round(c0 + (c1 - c0) * k);
    return `rgb(${m(120, 63)},${m(124, 246)},${m(140, 255)})`;
  }

  const VFX = {
    floor(ctx, g) {
      const V = g.effects.V;
      for (const d of V.decals) drawDecal(ctx, g, d);
      // Đọc Cú Sút: nón sút từ người cầm bóng tới hai cột dọc + đường giữa (chỗ cần đứng chặn)
      for (const p of g.players) {
        if (!p.bracing) continue;
        const L = readLine(g, p);
        if (!L || !L.carrier) continue;
        const f = g.field, goal = g.ownGoal(p.team);
        ctx.strokeStyle = '#3ff6ff'; ctx.lineWidth = 1;
        ctx.globalAlpha = 0.16;
        ctx.beginPath();
        ctx.moveTo(L.x, L.y); ctx.lineTo(goal.x, f.gTop);
        ctx.moveTo(L.x, L.y); ctx.lineTo(goal.x, f.gBot);
        ctx.stroke();
        ctx.globalAlpha = 0.4;
        ctx.setLineDash([3, 3]); ctx.lineDashOffset = -g.time * 20;
        ctx.beginPath(); ctx.moveTo(L.x, L.y); ctx.lineTo(goal.x, goal.y); ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }
      for (const w of V.waves) {
        const k = 1 - w.t / w.max, e = 1 - (1 - k) * (1 - k);
        const rx = Math.max(1, w.r * e), ry = rx * 0.45;
        ctx.globalAlpha = (1 - k) * 0.9;
        ctx.strokeStyle = w.color; ctx.lineWidth = w.thick * (1.5 - k);
        ctx.beginPath(); ctx.ellipse(w.x, w.y, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = (1 - k) * 0.18;
        ctx.fillStyle = w.color; ctx.fill();
        ctx.globalAlpha = 1;
      }
    },

    // tay cao su: vươn ra (40% thời gian), giữ (20%), bật về (40%); thân tay rung như dây thun
    // (nắm đấm khổng lồ vẽ ở lớp trên cùng — top — để không bị người khác che)
    arm(ctx, g, p) {
      for (const a of g.effects.V.arms) if (a.pid === p.id && !(a.size > 1)) drawArm(ctx, p, a);
    },

    clones(g) { return g.effects.V.clones; },

    // dưới sprite: hào quang (Phản Công, Nhạc Trưởng...), Đà tối đa, vệt tàn ảnh Quỷ Tốc Độ
    under(ctx, g, p) {
      const { ellipse, drawPlayer, px } = SP(), t = g.time + p.id * 0.37, x = Math.round(p.x), y = Math.round(p.y);
      // Thiên Thạch Giáng: tâm ngắm đỏ co lại trên sân (người đang ở ngoài màn hình)
      if (p.state === 'meteor') {
        const k = (g.time * 3) % 1, c = '#ff3d5a';
        ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.globalAlpha = 0.9;
        ctx.beginPath(); ctx.ellipse(x, y, 30 - k * 18, (30 - k * 18) * 0.45, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 1; ctx.globalAlpha = 0.6;
        ctx.beginPath(); ctx.ellipse(x, y, 30, 13.5, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
        px(ctx, x - 12, y, 8, 1, c); px(ctx, x + 5, y, 8, 1, c); px(ctx, x, y - 6, 1, 4, c); px(ctx, x, y + 3, 1, 4, c);
        return;
      }
      if (p.airZ > 0) return;
      // Đọc Cú Sút: vòng tụ tâm co dần về chân (kiểu vòng nhịp), màu xám -> xanh khi đứng đúng đường bóng
      if (p.bracing) {
        const L = readLine(g, p), a = L ? SFC.Actions.readAlign(p, L.x, L.y, L.dx, L.dy) : 0;
        const c = alignColor(a), k = (g.time / 0.6) % 1, r = 18 - k * 11;
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = c; ctx.lineWidth = 1;
        ctx.globalAlpha = 0.25 + k * 0.6;
        ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.45, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = a >= 0.9 ? 0.55 + 0.35 * Math.sin(g.time * 18) : 0.5;
        ctx.lineWidth = a >= 0.9 ? 2 : 1;
        ctx.beginPath(); ctx.ellipse(x, y, 7, 3.2, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      // AURA FARMING: lửa vàng bốc ngược sau lưng (cao hơn chỏm tóc), vầng sáng dưới chân
      if (p.auraFarmT > 0) {
        const fade = Math.min(1, p.auraFarmT * 2);
        const col = (i) => Math.round(34 - (Math.abs(i) / 10) ** 2 * 22 + 4 * Math.sin(t * 22 + i * 1.9));
        // viền lửa cam (vẽ thường) cho nổi trên sân sáng, rồi lõi vàng cộng sáng
        ctx.globalAlpha = fade * 0.55;
        for (let i = -10; i <= 10; i++) { const h = col(i) + 2; px(ctx, x + i, y - h, 1, 3, '#ff9a1f'); }
        px(ctx, x - 11, y - 14, 1, 12, '#ff9a1f'); px(ctx, x + 11, y - 14, 1, 12, '#ff9a1f');
        ctx.globalCompositeOperation = 'lighter';
        for (let i = -10; i <= 10; i++) {
          const h = col(i);
          ctx.globalAlpha = fade * (0.5 + 0.15 * Math.sin(t * 15 + i));
          px(ctx, x + i, y - h, 1, h, i % 3 ? '#ffb81f' : '#fff3a0');
        }
        ctx.globalAlpha = fade * 0.6;
        ellipse(ctx, x, y, 13, 5, '#ffd23f');
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      const sp = Math.hypot(p.vx || 0, p.vy || 0);
      if (sp > 95 && g.cores.has(p, 'speed_demon')) {
        for (let i = 2; i >= 1; i--) {
          const k = i * 0.05;
          drawPlayer(ctx, Object.assign({}, p, { x: p.x - p.vx * k, y: p.y - p.vy * k, atkType: null, keeper: false }), g, 0.32 / i, '#3ff6ff');
        }
        ctx.globalAlpha = 1;
      }
      ctx.globalCompositeOperation = 'lighter';
      if (p.auraT > 0 && p.auraC) {
        const a = Math.min(1, p.auraT * 2) * (0.35 + 0.15 * Math.sin(t * 10));
        ctx.globalAlpha = a;
        ellipse(ctx, x, y, 11, 4.5, p.auraC);
        ctx.globalAlpha = a * 0.6;
        ellipse(ctx, x, y, 7, 3, '#ffffff');
      }
      const mo = p.res ? p.res.momentum : 0;
      if (mo > 0 && mo >= g.cores.resMax(p, 'momentum')) {
        ctx.globalAlpha = 0.35 + 0.2 * Math.sin(t * 20);
        ellipse(ctx, x, y, 10, 4, '#3ff6ff');
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    },

    // trên sprite: tài nguyên nhìn thấy được + tín hiệu báo trước của Core
    look(ctx, g, p, hy) {
      if (!p.res) return;
      const { px, disc } = SP(), R = Math.random, t = g.time + p.id * 0.37;
      const x = Math.round(p.x), y = Math.round(p.y - (p.airZ || 0));
      const C = g.cores;
      ctx.globalCompositeOperation = 'lighter';
      // hào quang: hạt sáng bay lên + thân phát sáng
      if (p.auraT > 0 && p.auraC) {
        ctx.globalAlpha = 0.18;
        px(ctx, x - 6, y - 17, 12, 16, p.auraC);
        ctx.globalAlpha = 1;
        if (R() < 0.5) px(ctx, x - 6 + Math.round(R() * 12), y - 4 - Math.round(R() * 16), 1, 2, p.auraC);
      }
      // AURA FARMING: tàn lửa vàng bay lên + thỉnh thoảng tia điện quanh người
      if (p.auraFarmT > 0) {
        if (R() < 0.7) px(ctx, x - 9 + Math.round(R() * 18), y - 4 - Math.round(R() * 30), 1, 2, R() < 0.5 ? '#ffe14f' : '#fff6b0');
        if (R() < 0.12) {
          const sx = x + (R() < 0.5 ? -8 : 7);
          let yy = y - 6 - Math.round(R() * 10);
          for (let k = 0; k < 4; k++) { const ny = yy - 2 - Math.round(R() * 3); px(ctx, sx + Math.round(R() * 2 - 1), ny, 1, yy - ny, '#cdf6ff'); yy = ny; }
        }
      }
      // Đà: tia điện lách tách dưới chân, đầy Đà thì sét chạy dọc người
      const mo = p.res.momentum;
      if (mo > 0) {
        for (let i = 0; i < mo; i++) if (R() < 0.25) px(ctx, x - 6 + Math.round(R() * 12), y - Math.round(R() * 3), R() < 0.5 ? 2 : 1, 1, i % 2 ? '#7fe7ff' : '#ffffff');
        if (mo >= C.resMax(p, 'momentum') && R() < 0.45) {
          const sx = x + (R() < 0.5 ? -6 : 5);
          let yy = y - 2;
          for (let k = 0; k < 4; k++) { const ny = yy - 3 - Math.round(R() * 2); px(ctx, sx + Math.round(R() * 2 - 1), ny, 1, yy - ny, '#bdf4ff'); yy = ny; }
        }
      }
      // Nộ: hai nắm tay bốc lửa lớn dần
      const ra = p.res.rage;
      if (ra > 0) {
        for (const s of [-1, 1]) {
          const hx = x + s * 6, hy2 = y - 7;
          disc(ctx, hx, hy2, 1 + Math.round(ra * 0.45 + (Math.sin(t * 14 + s) > 0 ? 1 : 0)), `rgba(255,${ra >= 4 ? 50 : 110},40,${0.3 + ra * 0.06})`);
          if (R() < 0.12 * ra) px(ctx, hx - 1 + Math.round(R() * 2), hy2 - 3 - Math.round(R() * 4), 1, 1, R() < 0.5 ? '#ffd23f' : '#ff6a1f');
        }
      }
      // Nắm Đấm Sắt: có Giáp -> hai nắm tay thép
      if (C.has(p, 'iron_fist') && p.res.guard > 0) {
        ctx.globalCompositeOperation = 'source-over';
        for (const s of [-1, 1]) { px(ctx, x + s * 6 - 1, y - 8, 3, 3, '#140c16'); px(ctx, x + s * 6 - 1, y - 8, 2, 2, '#c7ccd6'); px(ctx, x + s * 6 - 1, y - 8, 1, 1, '#ffffff'); }
        ctx.globalCompositeOperation = 'lighter';
      }
      // Phá Âm Chướng: Đà tối đa + đang chạy -> hình nón sóng âm trắng trước mặt
      if (C.has(p, 'sonic_boom') && mo >= C.resMax(p, 'momentum') && Math.hypot(p.vx || 0, p.vy || 0) > 90) {
        const a = Math.atan2(p.vy, p.vx), ph = (g.time * 6) % 1;
        for (let k = 0; k < 3; k++) {
          const r = 9 + ((k / 3 + ph) % 1) * 12;
          ctx.globalAlpha = 0.6 * (1 - ((k / 3 + ph) % 1));
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(x, y - 7, r, a - 0.6, a + 0.6); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      // Giáp: ánh bạc kim loại chạy dọc người
      const gu = p.res.guard;
      if (gu > 0) {
        const k = (t * 1.2) % 1.6;
        ctx.globalAlpha = 0.14;
        px(ctx, x - 5, y - 16, 10, 14, '#c7ccd6');
        ctx.globalAlpha = 1;
        if (k < 1) px(ctx, x - 5 + Math.round(k * 10), y - 16, 1, 14, 'rgba(255,255,255,0.4)');
      }
      // Nhịp: nốt nhạc lơ lửng quanh cả đội (chia đều cho các cầu thủ)
      const rh = p.team >= 0 ? g.rhythm[p.team] || 0 : 0;
      if (rh > 0) {
        const mates = g.teams[p.team].players, idx = mates.indexOf(p), n = mates.length;
        for (let i = idx; i < rh; i += n) {
          const a = t * 2.4 + i * 1.7, nx = x + Math.round(Math.cos(a) * 10), ny = y - 21 + Math.round(Math.sin(a * 1.3) * 2);
          px(ctx, nx + 1, ny - 3, 1, 3, '#ffd23f'); px(ctx, nx - 1, ny, 3, 1, '#ffd23f'); px(ctx, nx - 1, ny - 1, 2, 1, '#ffd23f');
        }
      }
      // tụ lực sút: Hoả Cầu (lửa ở chân), Lôi Cước (chân tích điện)
      if (p.charging) {
        const ready = (p.charge || 0) >= C.chargedThreshold(p.team);
        const fx = x + Math.round(Math.cos(p.facing) * 5);
        if (ready && C.has(p, 'fire_shot')) for (let i = 0; i < 2; i++) px(ctx, fx - 2 + Math.round(R() * 4), y - 1 - Math.round(R() * 5), 1, 2, R() < 0.5 ? '#ff6a1f' : '#ffd23f');
        // Chưởng Sóng: quả cầu sáng tụ trước chân khi gần đầy lực
        if (C.has(p, 'energy_wave') && (p.charge || 0) >= 0.6) {
          const k = Math.min(1, ((p.charge || 0) - 0.6) / 0.3), ox = x + Math.round(Math.cos(p.facing) * 9);
          disc(ctx, ox, y - 5, 2 + Math.round(k * 4), 'rgba(127,231,255,0.35)');
          disc(ctx, ox, y - 5, 1 + Math.round(k * 2), '#dffbff');
        }
        if (C.has(p, 'thunder_kick') && (p.charge || 0) >= 0.3) {
          const lit = (p.charge || 0) >= C.params('thunder_kick').minCharge;
          for (let i = 0; i < (lit ? 3 : 1); i++) if (R() < 0.7) {
            const a = R() * Math.PI * 2, r = 3 + R() * (lit ? 7 : 4);
            px(ctx, fx + Math.round(Math.cos(a) * r), y - 2 + Math.round(Math.sin(a) * r * 0.6), 1, lit ? 2 : 1, R() < 0.5 ? '#7fe7ff' : '#ffffff');
          }
        }
      }
      ctx.globalCompositeOperation = 'source-over';
      // Giáp: khiên nhỏ xếp dọc cạnh đầu (mỗi Giáp 1 cái) — không đè thanh lực / mũi tên điều khiển
      for (let i = 0; i < gu; i++) {
        const sx = x + 7, sy = hy + 1 + i * 5;
        px(ctx, sx - 1, sy - 1, 5, 5, '#140c16'); px(ctx, sx, sy, 3, 2, '#c7ccd6'); px(ctx, sx + 1, sy + 2, 1, 1, '#c7ccd6');
      }
      // Mắt Đại Bàng: đang nạp lực chuyền -> nét phấn (đường chấm + mũi tên + vòng điểm rơi) như bảng chiến thuật
      if (p.passMode && p.hasBall && C.has(p, 'eagle_eye')) {
        const b = g.ball, plan = SFC.Actions.passPlan(g, p, p.passLock, p.passMode, p.passCharge || 0, Math.cos(p.facing), Math.sin(p.facing), true);
        const ex = plan.point.x, ey = plan.point.y, L = Math.hypot(ex - b.x, ey - b.y) || 1, ux = (ex - b.x) / L, uy = (ey - b.y) / L;
        const chalk = 'rgba(240,236,228,0.85)';
        for (let d = 6; d < L - 6; d += 6) {
          const lift = p.passMode === 'lob' ? Math.sin((d / L) * Math.PI) * Math.min(28, L * 0.2) : 0;
          px(ctx, Math.round(b.x + ux * d), Math.round(b.y + uy * d - lift), 2, 1, chalk);
        }
        line(ctx, ex, ey, ex - ux * 5 - uy * 3, ey - uy * 5 + ux * 3, 1, chalk);
        line(ctx, ex, ey, ex - ux * 5 + uy * 3, ey - uy * 5 - ux * 3, 1, chalk);
        ctx.strokeStyle = chalk; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(ex, ey, 6, 3, 0, 0, Math.PI * 2); ctx.stroke();
      }
      // Mắt Thiện Xạ: tia laser đỏ ngắm từ chân tới khung + tâm ngắm nhấp nháy trên lưới
      if (p.charging && p.hasBall && C.has(p, 'sniper_foot')) {
        const b = g.ball, f = g.field, dir = g.teams[p.team].dir;
        const aim = SFC.Actions.shotAim(g, p, Math.cos(p.facing), Math.sin(p.facing));
        const lx = dir > 0 ? f.x + f.w : f.x, tt = (lx - b.x) / (Math.cos(aim.angle) || 1e-3);
        const ex = lx, ey = b.y + Math.sin(aim.angle) * tt;
        ctx.globalCompositeOperation = 'lighter';
        line(ctx, b.x, b.y - 3, ex, ey - 6, 3, 'rgba(255,40,60,0.18)');
        line(ctx, b.x, b.y - 3, ex, ey - 6, 1, 'rgba(255,60,80,0.8)');
        ctx.globalCompositeOperation = 'source-over';
        if (Math.floor(g.time * 6) % 2 === 0) {
          const cx = Math.round(ex - dir * 3), cy = Math.round(ey - 6);
          const c = '#ff3d5a';
          px(ctx, cx - 3, cy - 3, 2, 1, c); px(ctx, cx - 3, cy - 3, 1, 2, c); px(ctx, cx + 2, cy - 3, 2, 1, c); px(ctx, cx + 3, cy - 3, 1, 2, c);
          px(ctx, cx - 3, cy + 3, 2, 1, c); px(ctx, cx - 3, cy + 2, 1, 2, c); px(ctx, cx + 2, cy + 3, 2, 1, c); px(ctx, cx + 3, cy + 2, 1, 2, c);
          px(ctx, cx, cy, 1, 1, '#ffffff');
        }
      }
    },

    // vệt bóng theo Core (cờ ball.fx): dây đàn vàng, xoắn rồng xanh lá, laser đỏ, sét lách tách
    ballFx(ctx, b) {
      const fx = b.fx || {}, tr = b.trail, { px } = SP();
      if (b.owner || tr.length < 2) return;
      const pt = (i) => ({ x: tr[i].x, y: tr[i].y - tr[i].z - 3 });
      ctx.globalCompositeOperation = 'lighter';
      if (fx.string || fx.laser) {
        const col = fx.string ? '255,210,63' : '255,60,80';
        for (const [w, a] of [[3, 0.22], [1, 0.9]]) {
          ctx.strokeStyle = `rgba(${col},${a})`; ctx.lineWidth = w;
          ctx.beginPath(); ctx.moveTo(b.x, b.y - b.z - 3);
          for (let i = 0; i < tr.length; i++) { const q = pt(i); ctx.lineTo(q.x, q.y); }
          ctx.stroke();
        }
        if (fx.string && Math.random() < 0.25) { const q = pt(tr.length - 1); px(ctx, q.x, q.y - 4, 1, 3, '#ffd23f'); px(ctx, q.x - 1, q.y - 1, 2, 1, '#ffd23f'); }
      }
      // Một-Hai: vệt đôi vàng - cam
      if (fx.duo) {
        for (const [o, col] of [[2, '255,210,63'], [-2, '255,122,61']]) {
          ctx.strokeStyle = `rgba(${col},0.85)`; ctx.lineWidth = 1;
          ctx.beginPath();
          for (let i = 0; i < tr.length; i++) {
            const q = pt(i), q0 = pt(Math.max(0, i - 1)), q1 = pt(Math.min(tr.length - 1, i + 1));
            const d = Math.hypot(q1.x - q0.x, q1.y - q0.y) || 1, nx = -(q1.y - q0.y) / d, ny = (q1.x - q0.x) / d;
            if (i) ctx.lineTo(q.x + nx * o, q.y + ny * o); else ctx.moveTo(q.x + nx * o, q.y + ny * o);
          }
          ctx.stroke();
        }
      }
      // Sao Băng: đuôi lửa dài
      if (fx.meteor) {
        for (let i = 0; i < tr.length; i++) {
          const q = pt(i), k = 1 - i / tr.length;
          ctx.globalAlpha = k;
          px(ctx, Math.round(q.x - 2 + Math.random() * 4), Math.round(q.y - 2 + Math.random() * 4), 3, 3, Math.random() < 0.5 ? '#ff6a1f' : '#ffd23f');
        }
        ctx.globalAlpha = 1;
      }
      if (fx.spiral) {
        for (let i = 1; i < tr.length; i++) {
          const q = pt(i), q0 = pt(i - 1), d = Math.hypot(q.x - q0.x, q.y - q0.y) || 1;
          const nx = -(q.y - q0.y) / d, ny = (q.x - q0.x) / d, ph = i * 0.9 - (b.roll || 0) * 0.08, k = 1 - i / tr.length;
          for (const [o, c] of [[0, '#6bff4f'], [Math.PI, '#2fbf6a']]) {
            const s = Math.sin(ph + o) * 4;
            ctx.globalAlpha = k;
            px(ctx, Math.round(q.x + nx * s), Math.round(q.y + ny * s), 2, 2, c);
          }
        }
        ctx.globalAlpha = 1;
      }
      if (fx.thunder) {
        for (let n = 0; n < 2; n++) {
          let x = b.x, y = b.y - b.z - 3;
          ctx.strokeStyle = n ? '#ffffff' : '#7fe7ff'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(x, y);
          const a = Math.random() * Math.PI * 2;
          for (let k = 0; k < 3; k++) { x += Math.cos(a) * 3 + (Math.random() - 0.5) * 4; y += Math.sin(a) * 3 + (Math.random() - 0.5) * 4; ctx.lineTo(x, y); }
          ctx.stroke();
        }
      }
      ctx.globalCompositeOperation = 'source-over';
    },

    // hình thái Cộng hưởng bậc 4: cả đội đổi ngoại hình theo trường phái
    form(ctx, g, p) {
      const tag = g.cores.formOf(p);
      if (!tag || p.airZ > 0) return;
      const { px, disc } = SP(), t = g.time + p.id * 0.37, x = Math.round(p.x), y = Math.round(p.y), R = Math.random;
      const moving = Math.hypot(p.vx || 0, p.vy || 0) > 20;
      ctx.globalCompositeOperation = 'lighter';
      switch (tag) {
        case 'runner': // tia điện lách tách quanh người
          if (R() < 0.5) { const a = R() * Math.PI * 2; px(ctx, x + Math.round(Math.cos(a) * 7), y - 6 + Math.round(Math.sin(a) * 7), 1, 2 + Math.round(R() * 2), '#7fe7ff'); }
          if (R() < 0.3) px(ctx, x - 5 + Math.round(R() * 10), y - 1, 2, 1, '#ffffff');
          break;
        case 'playmaker': // 2 nốt nhạc bay quanh đầu
          for (let i = 0; i < 2; i++) {
            const a = t * 3 + i * Math.PI, nx = x + Math.round(Math.cos(a) * 9), ny = y - 22 + Math.round(Math.sin(a) * 3);
            px(ctx, nx + 1, ny - 3, 1, 3, '#ffd23f'); px(ctx, nx, ny, 2, 1, '#ffd23f');
          }
          break;
        case 'striker': // chân bốc lửa
          for (let i = 0; i < 2; i++) if (R() < 0.7) px(ctx, x - 4 + Math.round(R() * 8), y - 2 - Math.round(R() * 4), 1, 2, R() < 0.5 ? '#ff6a1f' : '#ffd23f');
          break;
        case 'brawler': // hai nắm tay rực lửa đỏ
          for (const s of [-1, 1]) disc(ctx, x + s * 6, y - 7, 2 + (Math.sin(t * 12 + s) > 0 ? 1 : 0), 'rgba(255,61,90,0.55)');
          break;
        case 'launcher': // bụi đá bắn lên dưới chân khi chạy
          if (moving && R() < 0.35) px(ctx, x - 4 + Math.round(R() * 8), y - Math.round(R() * 2), 2, 1, 'rgba(180,107,255,0.8)');
          break;
        case 'trickster': // tàn ảnh tím bám theo
          ctx.globalCompositeOperation = 'source-over';
          if (moving) SP().drawPlayer(ctx, Object.assign({}, p, { x: p.x - (p.vx || 0) * 0.07, y: p.y - (p.vy || 0) * 0.07, keeper: false }), g, 0.35, '#9d7bff');
          break;
        case 'iron': { // ánh kim loại chạy dọc người
          const k = (t * 1.5) % 1;
          px(ctx, x - 5, y - 12, 10, 8, 'rgba(200,210,230,0.18)');
          px(ctx, x - 5 + Math.round(k * 10), y - 12, 1, 8, 'rgba(255,255,255,0.45)');
          break;
        }
      }
      ctx.globalCompositeOperation = 'source-over';
    },

    drawClone(ctx, g, c) {
      const k = c.t / c.max;
      SP().drawPlayer(ctx, { x: c.x, y: c.y, vx: c.vx, vy: c.vy, facing: c.facing, anim: c.anim, state: 'normal', flash: 0, team: c.team, role: c.role, look: c.look }, g, Math.min(0.85, k * 3));
    },

    top(ctx, g) {
      const V = g.effects.V, { px, disc } = SP(), t = g.time;
      for (const a of V.arms) {
        if (!(a.size > 1)) continue;
        const p = g.players.find((q) => q.id === a.pid);
        if (p) drawArm(ctx, p, a);
      }
      // lỗ đen: lõi đen, vành tím, hạt bị hút xoắn ốc vào tâm
      for (const v of V.vortexes) {
        const k = v.t / v.max, fade = Math.min(1, k * 4);
        ctx.globalAlpha = fade;
        for (let i = 0; i < 28; i++) {
          const ph = (t * 1.4 + i / 28) % 1, rr = v.r * (1 - ph), a = t * 5 + i * 2.4 + ph * 4;
          px(ctx, Math.round(v.x + Math.cos(a) * rr), Math.round(v.y + Math.sin(a) * rr * 0.6), 1, 1, i % 3 ? '#9d7bff' : '#ffffff');
        }
        disc(ctx, v.x, v.y, Math.max(3, Math.round(v.r * 0.22)), '#9d7bff');
        disc(ctx, v.x, v.y, Math.max(2, Math.round(v.r * 0.22) - 1), '#07040c');
        ctx.globalAlpha = 1;
      }
      // luồng tia
      for (const b of V.beams) {
        const k = b.t / b.max, grow = Math.min(1, (1 - k) * 6), w = b.width * grow * (0.85 + Math.sin(t * 60) * 0.15);
        ctx.save();
        ctx.translate(b.x, b.y); ctx.rotate(b.angle);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(1, k * 3);
        ctx.fillStyle = b.color; ctx.globalAlpha *= 0.45; ctx.fillRect(0, -w / 2, b.len, w);
        ctx.globalAlpha = Math.min(1, k * 3) * 0.8; ctx.fillRect(0, -w / 4, b.len, w / 2);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, -Math.max(1, w / 10), b.len, Math.max(2, w / 5));
        ctx.beginPath(); ctx.arc(0, 0, w * 0.6, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      // tia sét
      for (const b of V.bolts) {
        const k = b.t / b.max, on = Math.floor(t * 30) % 2 === 0 || k > 0.6;
        if (!on) continue;
        ctx.globalCompositeOperation = 'lighter';
        for (const [w, c, a] of [[4, b.color, 0.35], [2, b.color, 0.9], [1, '#ffffff', 1]]) {
          ctx.globalAlpha = a * Math.min(1, k * 2.5);
          ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineJoin = 'miter';
          ctx.beginPath(); ctx.moveTo(b.pts[0], b.pts[1]);
          for (let i = 2; i < b.pts.length; i += 2) ctx.lineTo(b.pts[i], b.pts[i + 1]);
          ctx.stroke();
        }
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      // chiêu bay
      for (const s of V.shots) {
        const k = s.t / s.max, a = Math.atan2(s.vy, s.vx);
        ctx.globalAlpha = Math.min(1, k * 4);
        ctx.globalCompositeOperation = 'lighter';
        if (s.kind === 'orb') {
          const c = s.color || '#7fe7ff';
          disc(ctx, s.x, s.y - 6, 7, 'rgba(127,231,255,0.25)');
          disc(ctx, s.x, s.y - 6, 5, c);
          disc(ctx, s.x, s.y - 6, 2, '#ffffff');
          for (let i = 1; i <= 4; i++) px(ctx, Math.round(s.x - Math.cos(a) * i * 4), Math.round(s.y - 6 - Math.sin(a) * i * 4), 2, 2, c);
        } else { // lưỡi gió trăng khuyết
          const c = s.color || '#dffbff';
          for (let i = -8; i <= 8; i++) {
            const u = i / 8, ang = a + u * 1.1, r = 11 - Math.abs(u) * 3;
            const x = s.x + Math.cos(ang) * r, y = s.y - 6 + Math.sin(ang) * r * 0.7;
            px(ctx, Math.round(x), Math.round(y), 2, 2, c);
            px(ctx, Math.round(x - Math.cos(a) * 3), Math.round(y - Math.sin(a) * 3), 1, 1, 'rgba(127,231,255,0.7)');
          }
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }
      // khiên lục giác (Giáp chặn đòn / Aegis vỡ vụn)
      for (const s of V.shields) {
        const k = 1 - s.t / s.max, r = s.r * (1 + k * 0.25);
        ctx.globalCompositeOperation = 'lighter';
        if (!s.shatter || k < 0.25) {
          ctx.globalAlpha = (1 - k) * 0.9;
          ctx.strokeStyle = s.color; ctx.lineWidth = 2;
          ctx.beginPath();
          for (let i = 0; i <= 6; i++) { const a = Math.PI / 6 + (i * Math.PI) / 3; ctx.lineTo(s.x + Math.cos(a) * r * 0.7, s.y + Math.sin(a) * r); }
          ctx.stroke();
          ctx.globalAlpha = (1 - k) * 0.25; ctx.fillStyle = s.color; ctx.fill();
        }
        if (s.shatter) {
          const rr = rng(Math.floor(s.x * 7 + s.y));
          for (let i = 0; i < 12; i++) {
            const a = rr() * Math.PI * 2, d = 4 + k * (30 + rr() * 30), sx = s.x + Math.cos(a) * d, sy = s.y + Math.sin(a) * d * 0.8 + k * k * 20;
            ctx.globalAlpha = 1 - k;
            px(ctx, Math.round(sx), Math.round(sy), 2 + Math.round(rr()), 1 + Math.round(rr() * 2), i % 3 ? s.color : '#ffffff');
          }
        }
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      // cổng xoáy trên tường
      for (const po of V.portals) {
        const k = po.t / po.max, open = Math.min(1, (1 - k) * 6, k * 4), rx = 14 * open, ry = 4 * open;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = po.color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(po.x, po.y, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2); ctx.stroke();
        for (let i = 0; i < 10; i++) {
          const a = t * 9 + i * 0.63, r = 0.3 + (i % 3) * 0.3;
          px(ctx, Math.round(po.x + Math.cos(a) * rx * r), Math.round(po.y + Math.sin(a) * ry * r), 1, 1, i % 2 ? '#ffffff' : po.color);
        }
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      // lưới khung thành bốc cháy
      for (const nf of V.netfires) {
        const f = g.field, k = nf.t / nf.max, lx = nf.side < 0 ? f.x : f.x + f.w, R = Math.random;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(1, k * 2) * 0.35;
        ctx.fillStyle = '#ff6a1f';
        ctx.fillRect(Math.min(lx, lx + nf.side * f.goalDepth), f.gTop - f.goalHeight, f.goalDepth, f.goalWidth + f.goalHeight);
        ctx.globalAlpha = Math.min(1, k * 2);
        for (let i = 0; i < 14; i++) {
          const fx = lx + nf.side * R() * f.goalDepth, fy = f.gTop - f.goalHeight * R() + R() * f.goalWidth;
          px(ctx, Math.round(fx), Math.round(fy), 1 + Math.round(R()), 2 + Math.round(R() * 3), R() < 0.5 ? '#ff6a1f' : '#ffd23f');
        }
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      // chữ comic
      for (const c of V.comics) {
        const k = 1 - c.t / c.max, pop = k < 0.12 ? 2 - (k / 0.12) : 1;
        ctx.save();
        ctx.translate(Math.round(c.x), Math.round(c.y)); ctx.rotate(c.rot); ctx.scale(pop, pop);
        ctx.globalAlpha = Math.min(1, (c.t / c.max) * 3);
        outlinedText(ctx, c.str, 1, 1, 18 * c.size, '#140c16', '#140c16', 4);
        outlinedText(ctx, c.str, 0, 0, 18 * c.size, c.color, '#140c16', 4);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    },

    applyZoom(ctx, g) {
      const z = g.effects.O.zoom;
      if (!z) return;
      const k = z.t / z.max, s = 1 + z.a * Math.sin(k * Math.PI * 0.5);
      ctx.translate(z.x, z.y); ctx.scale(s, s); ctx.translate(-z.x, -z.y);
    },

    overlay(ctx, g) {
      const O = g.effects.O, now = performance.now() / 1000;
      // phủ màu
      for (const tn of O.tints) {
        const k = tn.t / tn.max, ramp = Math.min(1, (1 - k) * 8, k * 4);
        ctx.globalAlpha = tn.a * ramp;
        ctx.fillStyle = tn.color; ctx.fillRect(0, 0, W, H);
        // viền đậm hơn
        ctx.globalAlpha = tn.a * ramp * 1.6;
        ctx.fillRect(0, 0, W, 6); ctx.fillRect(0, H - 6, W, 6); ctx.fillRect(0, 0, 6, H); ctx.fillRect(W - 6, 0, 6, H);
      }
      ctx.globalAlpha = 1;
      // tia tốc độ tập trung
      if (O.lines) {
        const L = O.lines, k = L.t / L.max;
        ctx.globalAlpha = Math.min(0.75, k * 2);
        ctx.strokeStyle = L.color;
        for (let i = 0; i < 46; i++) {
          const a = Math.random() * Math.PI * 2, r0 = 330, r1 = 110 + Math.random() * 90;
          ctx.lineWidth = Math.random() < 0.3 ? 2 : 1;
          ctx.beginPath(); ctx.moveTo(L.x + Math.cos(a) * r0, L.y + Math.sin(a) * r0); ctx.lineTo(L.x + Math.cos(a) * r1, L.y + Math.sin(a) * r1); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      // ảnh xem trước Core: chỉ một khúc sân -> bỏ cut-in / callout (tên chiêu đã in trên lá)
      if (g.preview) { if (O.impact > 0) this.impactOverlay(ctx); return; }
      // cut-in: dải ngang có chân dung lớn + tên chiêu
      for (const c of O.cutins) {
        const k = 1 - c.t / c.max;
        const slide = k < 0.15 ? 1 - k / 0.15 : k > 0.85 ? -(k - 0.85) / 0.15 : 0;
        const off = slide * W, yb = 128, hb = 92;
        ctx.globalAlpha = 0.55 * Math.min(1, (1 - k) * 6, k * 10);
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
        ctx.save();
        ctx.translate(off, 0);
        ctx.fillStyle = c.color; ctx.fillRect(0, yb - 4, W, hb + 8);
        ctx.fillStyle = '#140c16'; ctx.fillRect(0, yb, W, hb);
        // sọc tốc độ trong dải
        ctx.globalAlpha = 0.35;
        for (let i = 0; i < 14; i++) { ctx.fillStyle = i % 2 ? c.color : '#ffffff'; ctx.fillRect(((now * 900 + i * 97) % (W + 200)) - 100, yb + 6 + i * 6, 60 + (i * 37) % 90, 1); }
        ctx.globalAlpha = 1;
        // chân dung pixel lớn
        ctx.save();
        ctx.beginPath(); ctx.rect(0, yb, W, hb); ctx.clip();
        ctx.translate(150, yb + hb + 40); ctx.scale(5, 5);
        SP().drawPlayer(ctx, { x: 0, y: 0, vx: 0, vy: 0, facing: 0, anim: 0.3, state: 'normal', flash: 0, team: c.team, role: c.role, look: c.look }, g, 0.999);
        ctx.restore();
        outlinedText(ctx, c.str, 420, yb + hb / 2, 46, c.color, '#140c16', 6);
        ctx.restore();
      }
      // callout chạy chéo
      for (const c of O.callouts) {
        const k = 1 - c.t / c.max;
        const x = k < 0.15 ? -200 + (k / 0.15) * 520 : k < 0.8 ? 320 + (k - 0.15) * 40 : 346 + ((k - 0.8) / 0.2) * 520;
        ctx.save();
        ctx.translate(x, 70); ctx.rotate(-0.12);
        ctx.fillStyle = 'rgba(20,12,22,0.85)'; ctx.fillRect(-230, -22, 460, 44);
        ctx.fillStyle = c.color; ctx.fillRect(-230, -22, 460, 3); ctx.fillRect(-230, 19, 460, 3);
        outlinedText(ctx, c.str, 3, 3, 40, '#140c16', '#140c16', 5);
        outlinedText(ctx, c.str, 0, 0, 40, c.color, '#140c16', 5);
        ctx.restore();
      }
      if (O.impact > 0) this.impactOverlay(ctx);
    },

    // impact frame: đảo màu rồi bỏ bão hoà -> khung hình đen trắng kiểu anime
    impactOverlay(ctx) {
      ctx.globalCompositeOperation = 'difference';
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'saturation';
      ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
    },
  };

  SFC.VFX = VFX;
})();
