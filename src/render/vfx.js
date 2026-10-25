/* VFX render — vẽ các "viên gạch" của VFX Kit (systems/vfxkit.js). Renderer gọi theo lớp:
 *   floor(ctx, g)      : dấu vết trên sân + vòng sóng chấn (dưới cầu thủ)
 *   under(ctx, g, p)   : hào quang / vệt tàn ảnh của Core dưới sprite cầu thủ p
 *   look(ctx, g, p, hy): hình trạng thái Core (TOÉ ĐIỆN, nắm tay sáng...) + tín hiệu ngắm / tụ lực của Core trên sprite
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
  // Press Start 2P (assets/fonts) có Latin-1: chữ có dấu kiểu á ç ñ ¡ vẫn dùng được; ngoài khoảng đó (dấu tiếng Việt...) -> VT323.
  // Chữ Nhật: font dự phòng DotGothic16 (vẽ theo lưới 16px) -> không nhỏ hơn 12px kẻo chữ Hán vỡ nét
  const latin1 = (s) => /^[\x00-\xFF]*$/.test(s);
  const font = (s, px) => {
    if (SFC.I18n.isCJK(s)) return `${Math.max(12, Math.round(px * 0.6))}px ${SFC.I18n.pxFont()}`;
    return latin1(s) ? `${Math.round(px * 0.55)}px ${SFC.I18n.pxFont()}` : `${px}px ${SFC.I18n.vtFont()}`;
  };
  // font chữ bật ra (Effects.pop): px = cỡ Press Start thật (config game.fx.popups) — chữ Nhật / ngoài Latin-1 đổi font cùng cỡ nhìn
  const popFont = (s, px) => {
    if (SFC.I18n.isCJK(s)) return `${Math.max(12, Math.round(px * 1.1))}px ${SFC.I18n.pxFont()}`;
    return latin1(s) ? `${px}px ${SFC.I18n.pxFont()}` : `${Math.round(px / 0.55)}px ${SFC.I18n.vtFont()}`;
  };
  const OUT_C = '#140c16';   // viền + bóng đổ chữ bật ra

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

  // rồng lửa (VFX Kit E.dragon): đầu bay dọc đường (x0, y0) -> (x1, y1), thân nhiều đốt uốn lượn theo sau, tàn lửa rơi.
  // Đầu tới đích ở ~70% thời gian, phần còn lại thân trườn nốt rồi tan. Thân 1 màu + sọc bụng vàng + vây lưng + 2 cặp vuốt;
  // đầu: mõm dài, hàm há / ngậm, nanh, mắt đỏ, sừng cong ra sau, bờm lửa, râu dài
  function drawDragon(ctx, d, t) {
    const { px, disc, OUT } = SP();
    const life = 1 - d.t / d.max, head = Math.min(1, life / 0.7), fade = Math.min(1, (d.t / d.max) * 4);
    const dx = d.x1 - d.x0, dy = d.y1 - d.y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    const N = 22, GAP = 0.045, belly = '#ffd23f', dark = '#a8203a';
    const ph = (s) => s * Math.PI * 2 * d.coil + d.seed + t * 6;
    const at = (s) => {
      const w = Math.sin(ph(s)) * d.amp * (1 - s * 0.25);
      return { x: d.x0 + dx * s + nx * w, y: d.y0 + dy * s + ny * w, z: Math.cos(ph(s)) };
    };
    // thân: vẽ từ đuôi lên đầu (đầu đè lên trên); đốt ở "phía sau" (z < 0) tối hơn -> cảm giác cuộn xoắn quanh người bị hất
    for (let i = N - 1; i >= 1; i--) {
      const s = head - i * GAP;
      if (s < 0) continue;
      const q = at(s), q2 = at(Math.max(0, s - 0.02)), a = Math.atan2(q.y - q2.y, q.x - q2.x);
      const r = Math.max(1.5, 5.5 - i * 0.2), back = q.z < 0, cx = Math.round(q.x), cy = Math.round(q.y);
      const ux = -Math.sin(a), uy = Math.cos(a);   // pháp tuyến: phía "lưng" (vây) và "bụng"
      ctx.globalAlpha = fade * (back ? 0.7 : 1);
      disc(ctx, cx, cy, Math.round(r) + 1, OUT);
      disc(ctx, cx, cy, Math.round(r), back ? dark : d.color);
      if (!back) {
        px(ctx, Math.round(cx - ux * r * 0.5), Math.round(cy - uy * r * 0.5), 2, 2, belly);       // sọc bụng
        if (i % 2) px(ctx, Math.round(cx + ux * r * 0.3), Math.round(cy + uy * r * 0.3), 1, 1, dark);   // vảy
      }
      // vây lưng nhọn
      if (i % 2 === 0 && i < N - 3) {
        for (let k = 1; k <= 3; k++) px(ctx, Math.round(cx + ux * (r + k)), Math.round(cy + uy * (r + k)), k === 3 ? 1 : 2, 1, k === 3 ? '#fff6b0' : '#ffe14f');
      }
      // 2 cặp vuốt (đốt 4 và 11): 3 móng chĩa về phía bụng
      if (i === 4 || i === 11) {
        for (const o of [-1, 1]) {
          const fx = cx - ux * (r + 2) + Math.cos(a) * o * 2, fy = cy - uy * (r + 2) + Math.sin(a) * o * 2;
          px(ctx, Math.round(fx), Math.round(fy), 2, 2, d.color);
          px(ctx, Math.round(fx - ux * 2), Math.round(fy - uy * 2), 1, 1, '#ffffff');
        }
      }
      if (Math.random() < 0.3) px(ctx, Math.round(q.x + (Math.random() - 0.5) * 10), Math.round(q.y + 3 + Math.random() * 7), 1, 2, Math.random() < 0.5 ? '#ff6a1f' : '#ffd23f');
    }
    // đầu: quay theo hướng bay (hướng +x trong toạ độ địa phương), phóng 1.6 lần
    const h = at(head), hp = at(Math.max(0, head - 0.03)), ang = Math.atan2(h.y - hp.y, h.x - hp.x);
    const flip = Math.cos(ang) < 0 ? -1 : 1;   // bay sang trái: lật dọc để sừng luôn ở trên
    ctx.globalAlpha = fade;
    ctx.save();
    ctx.translate(Math.round(h.x), Math.round(h.y));
    ctx.rotate(ang);
    ctx.scale(1.35, 1.35 * flip);
    const R = (x, y, w, hh, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, hh); };
    const jaw = 1 + Math.round(Math.abs(Math.sin(t * 14)) * 2);
    // bờm lửa sau gáy
    for (let k = 0; k < 4; k++) R(-9 - k * 2, -4 + ((k * 3 + Math.floor(t * 20)) % 5), 2, 3, k % 2 ? '#ff6a1f' : '#ffd23f');
    // viền từng mảng (sọ, mõm, hàm) -> dáng đầu rồng thay vì 1 khối hộp
    const parts = [[-6, -5, 8, 8], [2, -3, 9, 4], [2, 1 + jaw, 8, 2]];
    for (const [x, y, w, hh] of parts) R(x - 1, y - 1, w + 2, hh + 2, OUT);
    R(2, 1, 8, jaw, '#7a1020');                   // trong miệng
    R(-6, -5, 8, 8, d.color);                     // sọ
    R(-6, 1, 7, 2, belly);                        // cằm
    R(2, -3, 9, 4, d.color); R(2, -3, 9, 1, '#ffb070');   // mõm trên (gờ sáng)
    R(10, -3, 1, 1, OUT);                         // lỗ mũi
    R(2, 1 + jaw, 8, 2, dark);                    // hàm dưới
    R(3, 1, 1, jaw, '#ffffff'); R(6, 1, 1, jaw, '#ffffff'); R(9, 1, 1, Math.max(1, jaw - 1), '#ffffff');   // nanh
    R(-3, -4, 3, 2, '#ffffff'); R(-1, -4, 1, 2, '#ff3d5a');   // mắt
    R(-4, -5, 4, 1, dark);                        // mày
    // sừng cong ra sau
    for (let k = 0; k < 6; k++) { R(-4 - k, -6 - Math.floor(k * 0.8), 1, 1, '#ffe14f'); R(-1 - k, -6 - Math.floor(k * 0.6), 1, 1, '#fff6b0'); }
    // râu dài bay ra sau
    for (let k = 0; k < 8; k++) R(8 - k * 2, 2 + Math.round(Math.sin(t * 9 + k * 0.7) * 1.5 + k * 0.5), 2, 1, '#fff6b0');
    ctx.restore();
    // lửa phụt từ miệng
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 4; k++) {
      const r = 16 + k * 4 + Math.random() * 3;
      px(ctx, Math.round(h.x + Math.cos(ang) * r + (Math.random() - 0.5) * (2 + k * 2)), Math.round(h.y + Math.sin(ang) * r + (Math.random() - 0.5) * (2 + k * 2)), 2 + (k < 2 ? 1 : 0), 2, k ? '#ff6a1f' : '#ffd23f');
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
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

  /* ---------- vật thể trên sân của Tuyệt kỹ (Effects.prop, docs/ULT_REDESIGN.md) ---------- */
  // FLOOR: nằm trên mặt sân, dưới cầu thủ · UPRIGHT: đứng trên sân, xếp chiều sâu cùng cầu thủ · TOP: vẽ trên cùng
  const PROP_FLOOR = { lateaim: 1, zoomies: 1, vroom: 1, splatfall: 1, splat: 1, graffitiwarn: 1, seawave: 1, surf: 1, lane: 1, trail: 1, puddle: 1, peel: 1, mark: 1, gaze: 1, magic: 1, moon: 1, dot: 1, chain: 1, stance: 1, magnet: 1, quake: 1, qring: 1, target: 1, rubble: 1,
    grid: 1, trail2: 1, cage: 1, staff: 1, harp: 1, harpz: 1, dashline: 1, moonf: 1 };   // ★★ thức tỉnh (docs/ULT_AWAKEN.md)
  const PROP_TOP = { zapline: 1, mama: 1, chopaim: 1, chopstrike: 1, chopcarry: 1, owl: 1, owleyes: 1, gazelock: 1, owlbolt: 1, owlbeam: 1, flock: 1, wind: 1, lassoswing: 1, lassofly: 1, tarot: 1, dark: 1, card: 1, spot: 1, alarm: 1, glove: 1, foot: 1, pips: 1, smoke: 1, boomer: 1, string: 1, qte: 1, mhand: 1, skyfire: 1, rebound: 1, fullmoon: 1, junkwarn: 1 };   // khói phủ lên người (đối thủ trong khói vẫn thấy mờ mờ)
  // vật thể bám theo cầu thủ (a = id cầu thủ)
  const PROP_FOLLOW = { vault: 1, gazelock: 1, petrify: 1, fall: 1, vroom: 1, veil: 1, card: 1, legend: 1, stoolheld: 1, alarm: 1, tornado: 1, hand: 1, stance: 1, hammer: 1, truck: 1, stone: 1, hypno: 1, magic: 1, pips: 1, ape: 1, ride: 1, qte: 1, chicken: 1, panic: 1, link: 1, burn: 1, tied: 1, lassoswing: 1, carrotheld: 1, zoomies: 1, surf: 1, flung: 1, chopaim: 1, chopcarry: 1, inpot: 1, fused: 1, fusetrail: 1, stand: 1, moonf: 1, chrome: 1 };
  // vẽ SAU sprite của người được bám (phủ lên người): tượng đá, xe tải, búa, mắt thôi miên
  const PROP_OVER = { chrome: 1, legend: 1, flung: 1, carrotheld: 1, petrify: 1, stoolheld: 1, stone: 1, truck: 1, hammer: 1, hypno: 1, panic: 1, ape: 1, ride: 1, chicken: 1, link: 1 };
  // vật thể tự vẽ nhân vật thay cho sprite thật (Renderer bỏ qua drawPlayer — VFX.hides): King Kong, đứng trên tảng đá, con gà, người ngã sõng soài, tượng đá (OWL'S GAZE)
  const PROP_HIDE = { vault: 1, ape: 1, ride: 1, chicken: 1, fall: 1, petrify: 1, burn: 1, tied: 1, lassoswing: 1, inpot: 1, fused: 1 };
  const byId = (g, id) => g.players.find((q) => q.id === id) || null;
  // vị trí vật thể bám người (a = id cầu thủ) hoặc toạ độ riêng
  function propAt(g, o) {
    if (PROP_FOLLOW[o.kind]) { const q = byId(g, o.a); return q ? { x: q.x, y: q.y } : { x: o.x, y: o.y }; }
    if (o.kind === 'magnet' || o.kind === 'rebound') return { x: g.ball.x, y: g.ball.y - g.ball.z };
    if (o.kind === 'junk') return { x: o.x + o.a * (o.max - o.t), y: o.y };   // Pitch Landslide: đồ lăn thẳng, a = vận tốc x
    if (SFC.ModDraw && SFC.ModDraw.kinds[o.kind]) { const m = SFC.MatchMods && SFC.MatchMods.at(g, o); if (m) return m; }   // luật trận FOOTBALL STORY
    return { x: o.x, y: o.y };
  }

  function drawProp(ctx, g, o, part) {
    const { px, disc, ellipse, OUT } = SP(), t = g.time;
    const k = o.t / o.max, el = o.max - o.t;                  // k: 1 -> 0 · el: giây đã sống
    const fade = Math.min(1, k * 5, el * 8);
    const c = propAt(g, o), x = Math.round(c.x), y = Math.round(c.y);
    ctx.globalAlpha = fade;
    switch (o.kind) {
      case 'trail':     // Light Cycle: tường sét thấp dọc đường chạy
      case 'trail2': {  // Storm Cycle (★★): tường cao gấp đôi, lõi trắng dày hơn
        const flick = 0.75 + 0.25 * Math.sin(t * 40 + o.id), tall = o.kind === 'trail2', wh = tall ? 15 : 8;
        ctx.globalCompositeOperation = 'lighter';
        for (const [w, col, a] of tall ? [[8, o.color, 0.22], [4, o.color, 0.75], [2, '#ffffff', 1]] : [[5, o.color, 0.25], [3, o.color, 0.7], [1, '#ffffff', 1]]) {
          ctx.globalAlpha = fade * a * flick;
          ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(o.a, o.b); ctx.stroke();
        }
        // màn sét đứng: dải mờ cao 8px phía trên vệt
        ctx.globalAlpha = fade * 0.18 * flick;
        ctx.fillStyle = o.color;
        ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(o.a, o.b); ctx.lineTo(o.a, o.b - wh); ctx.lineTo(o.x, o.y - wh); ctx.closePath(); ctx.fill();
        if (tall) { ctx.globalAlpha = fade * 0.6 * flick; ctx.strokeStyle = '#bdf4ff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(o.x, o.y - wh); ctx.lineTo(o.a, o.b - wh); ctx.stroke(); }
        if (Math.random() < 0.25) px(ctx, Math.round(o.a + (Math.random() - 0.5) * 4), Math.round(o.b - 2 - Math.random() * wh), 1, 2, '#ffffff');
        ctx.globalCompositeOperation = 'source-over';
        break;
      }
      /* ---------- ★★ dạng thức tỉnh (docs/ULT_AWAKEN.md) ---------- */
      case 'grid': {   // Storm Cycle: lưới neon kiểu Tron phủ sân (o.x, o.y, a = rộng, b = cao) + vạch quét chạy ngang
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fade * (0.1 + 0.04 * Math.sin(t * 6));
        ctx.fillStyle = o.color;
        for (let gx = o.x; gx <= o.x + o.a; gx += 24) ctx.fillRect(Math.round(gx), o.y, 1, o.b);
        for (let gy = o.y; gy <= o.y + o.b; gy += 16) ctx.fillRect(o.x, Math.round(gy), o.a, 1);
        ctx.globalAlpha = fade * 0.25;
        ctx.fillRect(Math.round(o.x + ((el * 260) % o.a)), o.y, 2, o.b);
        ctx.globalCompositeOperation = 'source-over';
        break;
      }
      case 'cage': {   // Storm Cycle: lồng sét vừa khép — vòm sáng loé lên, cột sét quanh mép
        const r = o.a, ry = r * 0.75;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fade * 0.35 * k;
        ctx.fillStyle = o.color; ctx.beginPath(); ctx.ellipse(x, y, r, ry, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = fade;
        ctx.strokeStyle = Math.floor(t * 20) % 2 ? '#ffffff' : o.color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(x, y, r, ry, 0, 0, Math.PI * 2); ctx.stroke();
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 + t * 2, ex = Math.round(x + Math.cos(a) * r), ey = Math.round(y + Math.sin(a) * ry), hgt = 10 + Math.round(Math.random() * 14);
          px(ctx, ex, ey - hgt, 1, hgt, i % 2 ? '#ffffff' : o.color);
        }
        ctx.globalCompositeOperation = 'source-over';
        break;
      }
      case 'staff': {   // Eternal Tiki-Taka: khuông nhạc 5 dòng phủ sân + nốt nhạc trôi
        ctx.globalAlpha = fade * 0.2;
        ctx.fillStyle = o.color;
        const cy = o.y + o.b / 2;
        for (let i = -2; i <= 2; i++) ctx.fillRect(o.x, Math.round(cy + i * 18), o.a, 1);
        ctx.globalAlpha = fade * 0.55;
        for (let i = 0; i < 7; i++) {
          const r = rng(o.id * 17 + i), nx = Math.round(o.x + ((r() * o.a + el * 40) % o.a)), ny = Math.round(cy + (Math.floor(r() * 5) - 2) * 18 - 2);
          disc(ctx, nx, ny, 2, o.color); px(ctx, nx + 2, ny - 7, 1, 7, o.color);
          if (i % 2) px(ctx, nx + 2, ny - 7, 3, 1, o.color);
        }
        break;
      }
      case 'harp':    // Eternal Tiki-Taka: dây đàn vàng dọc đường chuyền (rung nhẹ), chốt ở 2 đầu
      case 'harpz': { // dây đang rung mạnh lúc chuỗi kết thúc
        const strong = o.kind === 'harpz', amp = strong ? 3 * k : 0.7, n = Math.max(2, Math.round(Math.hypot(o.a - o.x, o.b - o.y) / 4));
        const nx = -(o.b - o.y), ny = o.a - o.x, nl = Math.hypot(nx, ny) || 1;
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = strong ? '#ffffff' : o.color; ctx.lineWidth = strong ? 2 : 1;
        ctx.globalAlpha = fade * (strong ? 1 : 0.8);
        ctx.beginPath();
        for (let i = 0; i <= n; i++) {
          const u = i / n, w = Math.sin(u * Math.PI) * Math.sin(t * (strong ? 60 : 14) + u * 9) * amp;
          const lx = o.x + (o.a - o.x) * u + (nx / nl) * w, ly = o.y + (o.b - o.y) * u - 3 + (ny / nl) * w;
          if (i) ctx.lineTo(lx, ly); else ctx.moveTo(lx, ly);
        }
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
        for (const [ex, ey] of [[o.x, o.y], [o.a, o.b]]) { px(ctx, Math.round(ex) - 1, Math.round(ey) - 5, 3, 3, OUT); px(ctx, Math.round(ex), Math.round(ey) - 4, 1, 1, o.color); }
        break;
      }
      case 'dashline': {   // Thousand Fists: vạch lướt báo trước (đỏ, nhấp nháy, mũi tên ở cuối)
        const d = SFC.U.norm(o.a - o.x, o.b - o.y), on = Math.floor(t * 14) % 2;
        ctx.globalAlpha = fade * 0.25; ctx.strokeStyle = o.color; ctx.lineWidth = 9; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(o.a, o.b); ctx.stroke();
        ctx.globalAlpha = fade; ctx.lineWidth = 2; ctx.strokeStyle = on ? '#ffffff' : o.color;
        ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(o.a, o.b); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = on ? '#ffffff' : o.color;
        ctx.beginPath(); ctx.moveTo(o.a + d.x * 6, o.b + d.y * 6); ctx.lineTo(o.a - d.x * 4 - d.y * 5, o.b - d.y * 4 + d.x * 5); ctx.lineTo(o.a - d.x * 4 + d.y * 5, o.b - d.y * 4 - d.x * 5); ctx.closePath(); ctx.fill();
        break;
      }
      case 'moonf': {   // Full Moon Stomp: vòng trăng đi theo người dùng (b = bán kính)
        ctx.strokeStyle = o.color; ctx.lineWidth = 2;
        ctx.globalAlpha = fade * (0.6 + 0.2 * Math.sin(t * 6));
        ctx.beginPath(); ctx.ellipse(x, y, o.b, o.b * 0.45, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = fade * 0.14; ctx.fillStyle = o.color; ctx.fill();
        ctx.globalAlpha = fade * 0.85;
        for (let i = 0; i < 14; i++) {
          const r = rng(o.id * 31 + i), a = r() * Math.PI * 2, d = Math.sqrt(r()) * o.b, ph = (el * 0.5 + r()) % 1;
          px(ctx, Math.round(x + Math.cos(a) * d), Math.round(y + Math.sin(a) * d * 0.45 - ph * 34), 1, 1, i % 3 ? '#e8fbff' : o.color);
        }
        break;
      }
      case 'fullmoon': {   // Full Moon Stomp: trăng tròn to trên trời (góc trên), quầng sáng + miệng hố
        const r = 22;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fade * 0.18; disc(ctx, x, y, r + 10, '#a8e6ff');
        ctx.globalAlpha = fade * 0.3; disc(ctx, x, y, r + 4, '#a8e6ff');
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = fade;
        disc(ctx, x, y, r, '#e8fbff');
        disc(ctx, x - 7, y - 5, 5, '#c7dbe6'); disc(ctx, x + 6, y + 6, 4, '#c7dbe6'); disc(ctx, x + 8, y - 8, 2, '#c7dbe6'); disc(ctx, x - 4, y + 9, 2, '#c7dbe6');
        break;
      }
      case 'skyfire': {   // Meteor Breaker: sao băng nhỏ rơi chéo phía trên màn hình khi trời tối đỏ
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 9; i++) {
          const r = rng(o.id * 13 + i), ph = (el * (0.9 + r() * 0.6) + r()) % 1, sx = Math.round(r() * 640 - 60 + ph * 120), sy = Math.round(-10 + ph * 140);
          ctx.globalAlpha = fade * (1 - ph);
          for (let j = 0; j < 8; j++) px(ctx, sx - j * 2, sy - j * 2, 2, 2, j < 2 ? '#ffffff' : j < 5 ? '#ffd23f' : o.color);
        }
        ctx.globalCompositeOperation = 'source-over';
        break;
      }
      case 'rebound': {   // Meteor Breaker: vòng lửa quanh bóng bật ra (bấm sút để đập lại)
        const r = 9 + Math.round(Math.sin(t * 16));
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2 + t * 6;
          px(ctx, Math.round(x + Math.cos(a) * r), Math.round(y - 4 + Math.sin(a) * r * 0.6 - Math.random() * 3), 2, 2, i % 3 ? '#ff6a1f' : '#ffd23f');
        }
        ctx.globalCompositeOperation = 'source-over';
        if (Math.floor(t * 8) % 2) outlinedText(ctx, '!', x, y - 22, 14, '#ffd23f');
        break;
      }
      case 'stand': {   // Thousand Fists: hồn đấu sĩ khổng lồ đỏ trong suốt sau lưng người dùng, đấm cùng lúc tung chuỗi đấm
        const q = byId(g, o.a);
        if (!q) break;
        const f = Math.cos(q.facing) >= 0 ? 1 : -1, busy = q.state === 'recover', bob = Math.round(Math.sin(t * 4) * 2);
        ctx.globalCompositeOperation = 'lighter';
        const sx = x - f * 7, sy = y - 30 + bob;
        ctx.globalAlpha = fade * 0.22;                            // quầng ngoài
        disc(ctx, sx, sy - 15, 11, o.color); px(ctx, sx - 14, sy - 8, 28, 18, o.color); px(ctx, sx - 10, sy + 10, 20, 9, o.color);
        ctx.globalAlpha = fade * 0.5;
        disc(ctx, sx, sy - 15, 8, o.color);                       // đầu
        px(ctx, sx - 11, sy - 6, 22, 14, o.color);                // vai + ngực
        px(ctx, sx - 7, sy + 8, 14, 8, o.color);
        px(ctx, sx - 5, sy - 22, 10, 2, '#ffb0bc');               // tóc dựng sáng
        ctx.globalAlpha = fade * 0.75;
        px(ctx, sx - 4, sy - 17, 3, 2, '#ffffff'); px(ctx, sx + 2, sy - 17, 3, 2, '#ffffff');   // mắt
        // tràng nắm đấm bay ra phía trước lúc đang đấm
        if (busy) for (let i = 0; i < 6; i++) {
          const fx = Math.round(sx + f * (12 + Math.random() * 20)), fy = Math.round(sy - 2 + (Math.random() - 0.5) * 20);
          ctx.globalAlpha = fade * (0.5 + Math.random() * 0.4);
          disc(ctx, fx, fy, 4, o.color); disc(ctx, fx, fy, 2, '#ffffff');
        }
        ctx.globalCompositeOperation = 'source-over';
        break;
      }
      case 'chrome': {   // Mega Titan: da thép bóng loáng (vệt sáng quét dọc người) + mắt phát sáng, vẽ đè lên sprite khổng lồ
        const q = byId(g, o.a);
        if (!q || q.airZ > 0) break;
        const sc = q.sizeMul || 1, w = Math.round(10 * sc), h = Math.round(20 * sc), top = Math.round(y - h - 4 * sc), sw = (el * 1.3) % 1;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fade * 0.14; px(ctx, x - (w >> 1), top, w, h, o.color);
        ctx.globalAlpha = fade * 0.55; px(ctx, Math.round(x - (w >> 1) + sw * w), top, Math.max(1, Math.round(sc)), h, '#ffffff');
        if (Math.sin(q.facing) >= -0.35) {
          const ex = x + Math.round(Math.cos(q.facing) * 2 * sc), ey = Math.round(y - 18 * sc);
          ctx.globalAlpha = fade;
          px(ctx, ex - Math.round(3 * sc), ey, Math.round(2 * sc), Math.round(2 * sc), '#ffd23f');
          px(ctx, ex + Math.round(1 * sc), ey, Math.round(2 * sc), Math.round(2 * sc), '#ffd23f');
        }
        ctx.globalCompositeOperation = 'source-over';
        break;
      }
      case 'junkwarn': {   // Pitch Landslide: biển ! ở mép sân nơi đồ sắp lăn ra
        const on = Math.floor(t * 10) % 2;
        ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(x, y - 22); ctx.lineTo(x - 9, y - 6); ctx.lineTo(x + 9, y - 6); ctx.closePath(); ctx.fill();
        ctx.fillStyle = on ? '#ffffff' : o.color; ctx.beginPath(); ctx.moveTo(x, y - 20); ctx.lineTo(x - 7, y - 7); ctx.lineTo(x + 7, y - 7); ctx.closePath(); ctx.fill();
        px(ctx, x, y - 17, 1, 5, OUT); px(ctx, x, y - 10, 1, 1, OUT);
        ctx.globalAlpha = fade * 0.4; ellipse(ctx, x, y, 10, 4, o.color);
        break;
      }
      case 'junk': {   // Pitch Landslide: đồ lăn — b = loại (0 thùng rác · 1 lốp xe · 2 xe đẩy chợ), lăn tròn theo hướng a
        // vẽ to x1.5 quanh chân (khớp bán kính va chạm 12 / 16px ở cores-new.js junk)
        const rot = el * o.a * 0.12, kind = o.b;
        ellipse(ctx, x, y + 1, kind === 2 ? 18 : 14, 4, 'rgba(0,0,0,0.4)');
        ctx.save(); ctx.translate(x, y); ctx.scale(1.5, 1.5);
        if (kind === 1) {   // lốp xe dựng đứng lăn: vỏ đen, vành bạc, gai lốp xoay
          disc(ctx, 0, -8, 8, OUT); disc(ctx, 0, -8, 7, '#3a3540'); disc(ctx, 0, -8, 4, '#1c1820'); disc(ctx, 0, -8, 3, '#c7ccd6'); disc(ctx, 0, -8, 1, OUT);
          for (let i = 0; i < 6; i++) { const a = rot + (i * Math.PI) / 3; px(ctx, Math.round(Math.cos(a) * 6), Math.round(-8 + Math.sin(a) * 6), 1, 1, '#8a8f99'); }
        } else if (kind === 2) {   // xe đẩy chợ: thùng lưới bạc, tay đẩy đỏ, 2 bánh
          px(ctx, -11, -15, 22, 11, OUT); px(ctx, -10, -14, 20, 9, '#e8ecf5');
          for (let i = -8; i <= 8; i += 4) px(ctx, i, -14, 1, 9, '#8a8f99');
          px(ctx, -10, -10, 20, 1, '#8a8f99');
          px(ctx, o.a > 0 ? -13 : 11, -18, 2, 6, OUT); px(ctx, o.a > 0 ? -13 : 9, -18, 4, 2, '#ff3d5a');
          for (const sd of [-7, 7]) { disc(ctx, sd, -2, 3, OUT); disc(ctx, sd, -2, 2, '#3a3540'); }
        } else {   // thùng rác xanh nằm ngang lăn: sọc xoay, nắp tròn
          px(ctx, -9, -15, 18, 13, OUT); px(ctx, -8, -14, 16, 11, '#4f9a5b');
          for (let i = 0; i < 3; i++) { const yy = Math.round(-14 + ((((rot * 3 + i * 3.7) % 11) + 11) % 11)); px(ctx, -8, yy, 16, 1, '#2f6a3b'); }
          px(ctx, -8, -14, 16, 1, '#8fd99b');
          px(ctx, o.a > 0 ? 7 : -9, -15, 2, 13, '#c7ccd6');
        }
        ctx.restore();
        if (Math.random() < 0.5) px(ctx, Math.round(x - Math.sign(o.a) * (14 + Math.random() * 8)), y - Math.round(Math.random() * 4), 2, 1, '#d9cbb0');   // bụi
        break;
      }
      case 'peel': {   // Banana Pass: vỏ chuối nằm trên sân
        const ux = Math.cos(o.a), uy = Math.sin(o.a);
        ellipse(ctx, x, y + 1, 4, 1.5, 'rgba(0,0,0,0.3)');
        px(ctx, x - 2, y - 2, 5, 3, OUT); px(ctx, x - 1, y - 2, 3, 2, '#ffe14f');
        for (const sd of [-1, 1]) { const ex = Math.round(x + (ux - uy * sd) * 4), ey = Math.round(y - 1 + (uy + ux * sd) * 2); px(ctx, ex - 1, ey - 1, 3, 2, OUT); px(ctx, ex, ey - 1, 1, 1, '#ffd23f'); }
        px(ctx, x, y - 3, 1, 1, '#6a3d20');
        break;
      }
      case 'mark': {   // Thunderstorm: vòng cảnh báo tia sét sắp đánh (co lại + nhấp nháy)
        const r = o.a * (0.5 + 0.5 * k);
        ctx.strokeStyle = Math.floor(t * 16) % 2 ? '#ffffff' : o.color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(x, y, o.a, o.a * 0.45, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = fade * 0.25; ctx.fillStyle = o.color;
        ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'gaze': {   // Medusa Gaze: hình nón ánh mắt xanh lá báo trước
        const cone = 38 * Math.PI / 180;
        ctx.globalAlpha = fade * (0.18 + 0.12 * Math.sin(t * 20));
        ctx.fillStyle = o.color;
        ctx.beginPath(); ctx.moveTo(o.x, o.y);
        for (let i = 0; i <= 12; i++) { const a = o.a - cone + (2 * cone * i) / 12; ctx.lineTo(o.x + Math.cos(a) * o.b, o.y + Math.sin(a) * o.b * 0.7); }
        ctx.closePath(); ctx.fill();
        ctx.globalAlpha = fade * 0.7; ctx.strokeStyle = o.color; ctx.lineWidth = 1; ctx.stroke();
        break;
      }
      case 'magic': {   // Switcheroo: vòng phép dưới chân
        const r = 12 + Math.sin(t * 12) * 1.5;
        ctx.strokeStyle = o.color; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(x, y + 1, r, r * 0.45, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(x, y + 1, r - 3, (r - 3) * 0.45, 0, 0, Math.PI * 2); ctx.stroke();
        for (let i = 0; i < 6; i++) { const a = t * 3 + i * 1.05; px(ctx, Math.round(x + Math.cos(a) * r), Math.round(y + 1 + Math.sin(a) * r * 0.45 - el * 20 * ((i % 3) / 3)), 1, 1, i % 2 ? '#ffffff' : o.color); }
        break;
      }
      case 'stone': {   // hoá đá: tượng xám phủ lên người + vết nứt
        const q = byId(g, o.a);
        if (!q) break;
        SP().drawPlayer(ctx, Object.assign({}, q, { state: 'normal', anim: 0, vx: 0, vy: 0, flash: 0 }), g, 0.92, '#8a8f99');
        ctx.globalAlpha = fade * 0.55; ctx.fillStyle = '#6e737d';
        ctx.fillRect(x - 5, y - 22, 10, 22);
        ctx.globalAlpha = fade;
        const r = rng(o.id * 7);
        for (let i = 0; i < 4; i++) px(ctx, x - 4 + Math.round(r() * 8), y - 20 + Math.round(r() * 18), 1, 2 + Math.round(r() * 2), '#3c4048');
        if (k < 0.2 && Math.floor(t * 20) % 2) px(ctx, x - 6, y - 24, 12, 1, '#ffffff');   // sắp vỡ
        break;
      }
      case 'hypno': {   // thôi miên: vòng xoắn ốc hồng quay trên đầu + sao
        const hy = y - 30;
        for (let i = 0; i < 16; i++) {
          const a = t * 8 + i * 0.6, r = 1 + i * 0.4;
          px(ctx, Math.round(x + Math.cos(a) * r), Math.round(hy + Math.sin(a) * r * 0.6), 1, 1, i % 2 ? '#ffffff' : o.color);
        }
        if (Math.floor(t * 4) % 2) px(ctx, x + 7, hy - 3, 2, 2, '#ffe14f');
        break;
      }
      case 'hammer': {   // Iron Hammer: cầm búa xoay vòng tròn quanh người (vạch đường địa chấn báo trước) rồi nện xuống phía trước
        const q = byId(g, o.a);
        if (!q) break;
        const spin = o.b, f = q.facing, P = (SFC_CONFIG.cores.list.iron_hammer || {}).params || {};
        const L = P.length || 270, W = P.width || 22, turns = P.turns || 2, ux = Math.cos(f), uy = Math.sin(f);
        let hx, hy;
        if (el < spin) {
          // vạch đường địa chấn: dải đỏ dọc hướng nện, đậm dần + vạch đứt chạy
          const k2 = el / spin, nx = -uy * W / 2, ny = ux * W / 2;
          ctx.globalAlpha = fade * (0.08 + 0.2 * k2);
          ctx.fillStyle = '#ff3d5a';
          ctx.beginPath(); ctx.moveTo(x + nx, y + ny); ctx.lineTo(x + ux * L + nx, y + uy * L + ny); ctx.lineTo(x + ux * L - nx, y + uy * L - ny); ctx.lineTo(x - nx, y - ny); ctx.closePath(); ctx.fill();
          ctx.globalAlpha = fade * (0.35 + 0.45 * k2);
          ctx.strokeStyle = '#ff8a9a'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.lineDashOffset = -t * 60;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + ux * L, y + uy * L); ctx.stroke();
          ctx.setLineDash([]);
          // xoay nhanh dần, hết vòng cuối thì búa ở sau lưng (sẵn sàng quất qua đầu)
          const e = k2 * (0.6 + 0.4 * k2), ang = f + Math.PI + e * turns * Math.PI * 2, R = 22;
          hx = x + Math.cos(ang) * R; hy = y - 9 + Math.sin(ang) * R * 0.5;
          // vệt gió tròn theo đuôi búa
          ctx.globalAlpha = fade * 0.6; ctx.strokeStyle = '#e8ecf5'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(x, y - 9, R, R * 0.5, 0, ang - 1.6, ang); ctx.stroke();
          ctx.globalAlpha = fade * 0.25; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.ellipse(x, y - 9, R, R * 0.5, 0, ang - 0.8, ang); ctx.stroke();
          ctx.globalAlpha = fade;
        } else {
          // nện: từ trên đầu đập xuống trước mặt (0.1s) rồi nằm trên đất
          const sk = Math.min(1, (el - spin) / 0.1);
          hx = x + ux * 24 * sk; hy = y - 34 * (1 - sk) + uy * 24 * sk * 0.6 - 4;
        }
        ctx.strokeStyle = OUT; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.lineTo(hx, hy); ctx.stroke();
        ctx.strokeStyle = '#a8683a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.lineTo(hx, hy); ctx.stroke();
        const hw = 22, hh = 14;
        px(ctx, Math.round(hx - hw / 2) - 1, Math.round(hy - hh / 2) - 1, hw + 2, hh + 2, OUT);
        px(ctx, Math.round(hx - hw / 2), Math.round(hy - hh / 2), hw, hh, '#8b93a3');
        px(ctx, Math.round(hx - hw / 2), Math.round(hy - hh / 2), hw, 3, '#e8ecf5');
        px(ctx, Math.round(hx - hw / 2), Math.round(hy + hh / 2) - 2, hw, 2, '#4a4f5c');
        px(ctx, Math.round(hx - 2), Math.round(hy - hh / 2), 4, hh, '#ffd23f');   // đai vàng giữa búa
        break;
      }
      case 'quake': {   // Iron Hammer: địa chấn chạy thẳng — vết nứt răng cưa + đá trồi lên ở đầu sóng rồi lún xuống
        const P = (SFC_CONFIG.cores.list.iron_hammer || {}).params || {};
        const L = o.b, ux = Math.cos(o.a), uy = Math.sin(o.a), front = Math.min(L, el * (P.speed || 560));
        const r = rng(o.id * 17), n = Math.max(2, Math.floor(front / 6));
        const pts = [];
        for (let i = 0; i <= n; i++) { const s = (front * i) / n, j = (r() - 0.5) * 6; pts.push([o.x + ux * s - uy * j, o.y + uy * s + ux * j]); }
        for (const [w, col] of [[4, OUT], [2, '#3c342a']]) {
          ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineJoin = 'round';
          ctx.beginPath(); pts.forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b))); ctx.stroke();
        }
        // đá trồi: cao nhất ở đầu sóng, lún dần phía sau
        for (let s = 8; s <= front; s += 11) {
          const hgt = Math.round(12 * Math.max(0, 1 - (front - s) / 70) * Math.min(1, k * 4));
          if (hgt <= 0) continue;
          const sd = (Math.floor(s / 11) % 2 ? 1 : -1) * 5, rx = Math.round(o.x + ux * s - uy * sd), ry = Math.round(o.y + uy * s + ux * sd);
          px(ctx, rx - 3, ry - hgt, 7, hgt + 1, OUT);
          px(ctx, rx - 2, ry - hgt + 1, 5, hgt, '#8a7f70');
          px(ctx, rx - 2, ry - hgt + 1, 2, hgt, '#b5a890');
        }
        break;
      }
      case 'gate': {   // Phase Step: cổng dịch chuyển đứng (b = 0 cổng vào: hạt hút vào tâm · 1 cổng ra: hạt phun ra)
        const open = Math.min(1, el * 14, k * 3), ry = 13 * open, rx = (4 + 5 * Math.abs(Math.sin(o.a))) * open, cy = y - 11;
        if (ry < 1) break;
        ellipse(ctx, x, y + 1, rx + 3, 2, 'rgba(0,0,0,0.3)');
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fade * 0.3; ctx.fillStyle = o.color;
        ctx.beginPath(); ctx.ellipse(x, cy, rx + 4, ry + 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = fade;
        ellipse(ctx, x, cy, Math.max(0.5, rx), Math.max(0.5, ry), '#140820');
        ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, cy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = o.color; ctx.lineWidth = 2; ctx.stroke();
        for (let i = 0; i < 12; i++) {
          const ph = (t * 2.2 + i / 12) % 1, rr = o.b ? ph : 1 - ph, a = i * 2.4 + t * 7;
          px(ctx, Math.round(x + Math.cos(a) * rx * rr), Math.round(cy + Math.sin(a) * ry * rr), 1, 1, i % 3 ? o.color : '#ffffff');
        }
        break;
      }
      case 'pips': {   // Phase Step: số lượt dịch chuyển còn lại trên đầu (+ phím lướt nhấp nháy cho người đang điều khiển)
        const n = o.b, w = n * 8 - 2, hy = y - 38 + Math.round(Math.sin(t * 6));
        for (let i = 0; i < n; i++) {
          const cx = Math.round(x - w / 2 + i * 8 + 3);
          ellipse(ctx, cx, hy, 4, 5, OUT); ellipse(ctx, cx, hy, 3, 4, i % 2 ? '#3ff6ff' : o.color); ellipse(ctx, cx, hy, 1, 2, '#140820');
          px(ctx, cx - 2, hy - 3, 1, 1, '#ffffff');
        }
        const q = byId(g, o.a);
        if (q && q === g.controlled && SFC.Input) outlinedText(ctx, SFC.Input.label('skill'), x + w / 2 + 9, hy, 14 + Math.round(Math.sin(t * 10)), '#ffffff');
        break;
      }
      case 'smoke': {   // Smoke Bomb: đám khói tím than (elip a x a·b), viền chấm xoay, các cụm khói trôi chậm
        const R = o.a, sq = o.b, grow = Math.min(1, el * 6), Rr = R * grow;
        ctx.globalAlpha = fade * 0.5; ctx.fillStyle = o.color;
        ctx.beginPath(); ctx.ellipse(o.x, o.y, Rr, Rr * sq, 0, 0, Math.PI * 2); ctx.fill();
        const r = rng(o.id * 23);
        for (let i = 0; i < 30; i++) {
          const a0 = r() * Math.PI * 2, d0 = Math.sqrt(r()) * 0.88, a = a0 + t * (0.15 + r() * 0.2) * (i % 2 ? 1 : -1);
          const cx = o.x + Math.cos(a) * Rr * d0, cy = o.y + Math.sin(a) * Rr * d0 * sq - 6, rad = (9 + r() * 11) * grow * (0.9 + 0.1 * Math.sin(t * 2 + i));
          ctx.globalAlpha = fade * (0.22 + r() * 0.16);
          disc(ctx, Math.round(cx), Math.round(cy), Math.max(1, Math.round(rad)), ['#8a7fa6', '#a89cc4', '#6a5f88'][i % 3]);
        }
        ctx.globalAlpha = fade * 0.85; ctx.strokeStyle = '#d8ccf0'; ctx.lineWidth = 1;
        ctx.setLineDash([3, 5]); ctx.lineDashOffset = -t * 12;
        ctx.beginPath(); ctx.ellipse(o.x, o.y, Rr, Rr * sq, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = fade;
        if (Math.random() < 0.5) { const a = Math.random() * Math.PI * 2; px(ctx, Math.round(o.x + Math.cos(a) * Rr), Math.round(o.y + Math.sin(a) * Rr * sq - Math.random() * 10), 1, 1, '#d8d0e0'); }
        break;
      }
      case 'boomer': {   // Mega Boomerang: boomerang khổng lồ xoay tít, bay theo đúng đường mô phỏng (CoreBehaviors.mega_boomerang.at)
        const B = SFC.CoreBehaviors.mega_boomerang, q = byId(g, o.a);
        const c = B.at(g, o.x, o.y, o.b, q || { x: o.x, y: o.y }, Math.min(1, el / o.max)), bx = Math.round(c.x), bz = Math.round(c.y) - 14;
        ellipse(ctx, bx, Math.round(c.y) + 1, 18, 5, 'rgba(0,0,0,0.35)');
        ctx.globalAlpha = fade * 0.3; ctx.strokeStyle = o.color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(bx, bz, 25, 13, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = fade;
        const rot = t * 20;
        for (const [w, col] of [[11, OUT], [8, '#a8683a'], [3, o.color]]) {
          ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(bx + Math.cos(rot) * 24, bz + Math.sin(rot) * 13);
          ctx.lineTo(bx, bz);
          ctx.lineTo(bx + Math.cos(rot + 2) * 24, bz + Math.sin(rot + 2) * 13);
          ctx.stroke();
        }
        ctx.lineCap = 'butt';
        break;
      }
      case 'string': {   // Puppet Master: sợi chỉ từ tay người giật dây tới đầu con rối. Màu = pha: #9aa3b5 đang bay tới (dài dần) ·
                         // #c7ccd6 đang nối (căng, rung) · trắng = đã thành con rối (thanh gỗ giật dây trên đầu cả 2 người)
        const m = byId(g, o.a), q = byId(g, o.b);
        if (!m || !q) break;
        const fly = o.color === '#9aa3b5', link = o.color === '#c7ccd6';
        const hx = Math.round(m.x), hy = Math.round(m.y) - 34, tx0 = Math.round(q.x), ty0 = Math.round(q.y) - 26;
        // bay: đầu sợi chỉ tiến dần tới mục tiêu (có móc nhọn ở đầu)
        const k = fly ? Math.min(1, el / Math.max(0.05, o.max - 0.02)) : 1;
        const tx = Math.round(hx + (tx0 - hx) * k), ty = Math.round(hy + (ty0 - hy) * k);
        px(ctx, hx - 9, hy - 1, 19, 3, OUT); px(ctx, hx - 8, hy, 17, 1, '#c98f5f');
        px(ctx, hx - 1, hy - 6, 3, 13, OUT); px(ctx, hx, hy - 5, 1, 11, '#c98f5f');
        const sag = fly ? -10 : link ? -2 + Math.sin(t * 40) * 1.5 : -16 + Math.sin(t * 4 + o.id) * 3;
        for (const [w, col, a2] of [[3, OUT, 0.6], [1, fly ? '#e8ecf5' : '#ffffff', 1]]) {
          ctx.globalAlpha = fade * a2; ctx.strokeStyle = col; ctx.lineWidth = w;
          ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo((hx + tx) / 2, Math.min(hy, ty) + sag, tx, ty - 2); ctx.stroke();
        }
        ctx.globalAlpha = fade;
        if (fly) { px(ctx, tx - 2, ty - 4, 5, 5, OUT); px(ctx, tx - 1, ty - 3, 3, 3, '#ffffff'); }   // móc ở đầu chỉ
        else {
          px(ctx, tx - 6, ty - 2, 13, 1, '#ffffff');   // thanh nhỏ trên đầu con rối
          for (const sd of [-6, 6]) { ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(tx + sd, ty - 2); ctx.lineTo(tx + sd * 0.8, ty + 8); ctx.stroke(); }
          if (link && Math.random() < 0.5) px(ctx, Math.round(hx + (tx - hx) * Math.random()), Math.round(hy + (ty - hy) * Math.random()) - 3, 1, 1, '#ffffff');   // chỉ căng rung
        }
        break;
      }
      case 'link': {   // Puppet Master: vòng tiến trình nối dây quanh chân đối thủ (b = giây cần giữ) — đầy là thành con rối
        const k2 = Math.min(1, el / o.b), r = 14;
        // thanh tiến trình trên đầu (đầy = thành con rối), nhấp nháy vàng khi sắp đầy
        const bw = 20, bx = x - bw / 2, by = y - 40;
        px(ctx, bx - 1, by - 1, bw + 2, 5, OUT); px(ctx, bx, by, bw, 3, '#3a3f4c');
        px(ctx, bx, by, Math.round(bw * k2), 3, k2 > 0.75 && Math.floor(t * 12) % 2 ? '#ffe14f' : '#ffffff');
        ctx.strokeStyle = OUT; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.ellipse(x, y + 1, r, r * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#5a6a86'; ctx.lineWidth = 2; ctx.stroke();
        ctx.strokeStyle = k2 > 0.75 && Math.floor(t * 12) % 2 ? '#ffe14f' : '#ffffff';
        ctx.beginPath(); ctx.ellipse(x, y + 1, r, r * 0.5, 0, -Math.PI / 2, -Math.PI / 2 + k2 * Math.PI * 2); ctx.stroke();
        // mấy sợi chỉ nhỏ quấn quanh người (dày dần theo tiến trình)
        for (let i = 0; i < Math.round(k2 * 4); i++) { const yy = y - 6 - i * 4; ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, yy, 6, 2, 0, 0, Math.PI); ctx.stroke(); }
        break;
      }
      case 'ape': {   // Rage: King Kong — gầm đấm ngực (b giây) rồi nhảy dậm tại chỗ theo nhịp config (sprite thật bị ẩn — hides)
        const q = byId(g, o.a);
        if (!q) break;
        const P = SFC_CONFIG.cores.list.rage.params, roar = o.b, FUR = o.color, DK = '#241812', SKN = '#8a6f5a';
        let hop = 0;
        if (el >= roar) for (let i = 0; i < P.stomps; i++) { const d = roar + P.gap * (i + 1) - el; if (d >= 0 && d < 0.45) hop = Math.sin((d / 0.45) * Math.PI) * 22; }
        const beat = el < roar ? Math.floor(el * 10) % 2 : 0, by = y - Math.round(hop);
        ellipse(ctx, x, y + 1, Math.max(8, 16 - hop * 0.3), 5, 'rgba(0,0,0,0.45)');
        px(ctx, x - 10, by - 8, 7, 8, OUT); px(ctx, x + 3, by - 8, 7, 8, OUT); px(ctx, x - 9, by - 7, 5, 7, FUR); px(ctx, x + 4, by - 7, 5, 7, FUR);   // chân
        px(ctx, x - 13, by - 32, 26, 26, OUT); px(ctx, x - 12, by - 31, 24, 24, FUR); px(ctx, x - 12, by - 31, 24, 3, '#5a4234');      // thân
        px(ctx, x - 7, by - 26, 14, 12, SKN); px(ctx, x - 1, by - 26, 2, 12, '#6e5644');                                                  // ngực
        px(ctx, x - 8, by - 43, 16, 13, OUT); px(ctx, x - 7, by - 42, 14, 11, FUR); px(ctx, x - 5, by - 39, 10, 8, SKN);                // đầu + mặt
        px(ctx, x - 6, by - 40, 12, 1, DK);
        px(ctx, x - 4, by - 38, 2, 1, '#ff3d5a'); px(ctx, x + 2, by - 38, 2, 1, '#ff3d5a');                                                // mắt đỏ
        const mo = el < roar ? 3 : 2;
        px(ctx, x - 3, by - 35, 6, mo, '#7a1020'); px(ctx, x - 3, by - 35, 1, 1, '#ffffff'); px(ctx, x + 2, by - 35, 1, 1, '#ffffff');
        for (const sd of [-1, 1]) {
          if (el < roar) {   // đấm ngực luân phiên
            const lift = (sd < 0) === !!beat ? -3 : 0, ax = sd < 0 ? x - 18 : x + 10;
            px(ctx, ax, by - 28 + lift, 8, 13, OUT); px(ctx, ax + 1, by - 27 + lift, 6, 11, FUR);
            px(ctx, sd < 0 ? x - 10 : x + 4, by - 22 + lift, 7, 7, OUT); px(ctx, sd < 0 ? x - 9 : x + 5, by - 21 + lift, 5, 5, SKN);
          } else {           // tay dài chống xuống đất
            const ax = sd < 0 ? x - 20 : x + 13;
            px(ctx, ax, by - 29, 7, 24, OUT); px(ctx, ax + 1, by - 28, 5, 22, FUR);
            px(ctx, ax - 1, by - 7, 9, 7, OUT); px(ctx, ax, by - 6, 7, 5, DK);
          }
        }
        if (Math.random() < 0.4) px(ctx, x + Math.round((Math.random() - 0.5) * 22), by - 46 - Math.round(Math.random() * 8), 2, 2, '#ff3d5a');   // hơi giận bốc lên
        break;
      }
      case 'qring': {   // Rage: vòng địa chấn lan ra (elip dọc x0.6, khớp va chạm) — dải cam + vành nứt + đá trồi dọc vành
        const SQ = 0.6, r = Math.min(o.a, el * o.b);
        if (r < 2) break;
        const k2 = 1 - r / o.a;
        ctx.globalAlpha = fade * (0.2 + 0.35 * k2); ctx.strokeStyle = o.color; ctx.lineWidth = 12;
        ctx.beginPath(); ctx.ellipse(o.x, o.y, r, r * SQ, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = fade;
        ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.stroke();
        ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 1; ctx.stroke();
        const n = Math.max(8, Math.floor(r / 7));
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + o.id, rx = Math.round(o.x + Math.cos(a) * r), ry = Math.round(o.y + Math.sin(a) * r * SQ), h = 3 + (i % 3) * 2;
          px(ctx, rx - 2, ry - h, 4, h + 1, OUT); px(ctx, rx - 1, ry - h + 1, 2, h, '#8a7f70');
        }
        break;
      }
      case 'ride': {   // Boulder Rider: tảng đá cỡ b (bán kính gấp đôi mỗi cỡ), người đứng trên chao đảo (sprite thật bị ẩn — hides).
                       // Đang lăn: vân đá chạy theo hướng lăn
        const q = byId(g, o.a);
        if (!q) break;
        const R = Math.round(SFC.CoreBehaviors.boulder_shot.R(o.b)), cy = y - R, sp = Math.hypot(q.vx || 0, q.vy || 0);
        const wob = sp > 20 ? 0 : Math.round(Math.sin(t * 5 + o.id) * 2), roll = sp > 20 ? t * sp / Math.max(4, R) : 0;
        ellipse(ctx, x, y + 1, R + 2, Math.max(2, R * 0.4), 'rgba(0,0,0,0.45)');
        disc(ctx, x, cy, R + 1, OUT); disc(ctx, x, cy, R, '#7a6e5f'); disc(ctx, x - Math.round(R * 0.3), cy - Math.round(R * 0.3), Math.max(1, Math.round(R * 0.5)), '#8f8371');
        const r = rng(o.a * 13), n = 3 + Math.round(R / 4);
        for (let i = 0; i < n; i++) {
          const a0 = r() * Math.PI * 2 + roll, d0 = Math.sqrt(r()) * R * 0.75;
          px(ctx, x + Math.round(Math.cos(a0) * d0), cy + Math.round(Math.sin(a0) * d0 * 0.8), Math.max(2, Math.round(R / 8)), 1, '#544b40');
        }
        SP().drawPlayer(ctx, Object.assign({}, q, { x: q.x + wob, y: cy - R + 3, vx: sp > 20 ? 0 : q.vx, vy: 0, state: 'normal', atkType: null }), g, 1);
        break;
      }
      case 'qte': {   // Boulder Rider: thanh quicktime trên đầu (kim chạy qua lại, vùng giữa xanh lá; b = số lần trúng)
        const q = byId(g, o.a);
        if (!q) break;
        const P = SFC_CONFIG.cores.list.boulder_shot.params, R = SFC.CoreBehaviors.boulder_shot.R(o.b), W = 50;
        const bx = Math.round(x - W / 2), byy = Math.round(y - 2 * R - 44), zw = Math.round(W * P.zone);
        const c = SFC.CoreBehaviors.boulder_shot.cursor(el, P.period), cx = Math.round(bx + c * (W - 1));
        px(ctx, bx - 1, byy - 1, W + 2, 8, OUT); px(ctx, bx, byy, W, 6, '#3a3f4c');
        px(ctx, bx + Math.round(W / 2 - zw / 2), byy, zw, 6, '#6bff4f');
        px(ctx, cx - 1, byy - 3, 3, 12, OUT); px(ctx, cx, byy - 2, 1, 10, '#ffffff');
        for (let i = 0; i < 3; i++) { disc(ctx, x - 6 + i * 6, byy + 11, 3, OUT); disc(ctx, x - 6 + i * 6, byy + 11, 2, i < o.b ? o.color : '#3a3f4c'); }
        if (q === g.controlled && SFC.Input) outlinedText(ctx, SFC.Input.label('shoot'), bx - 9, byy + 3, 12, '#ffffff');
        break;
      }
      case 'rubble': {   // Boulder Rider: đá vỡ vụn — các mảnh đá văng quanh chỗ cũ rồi lún dần (a = bán kính tảng đá)
        const r = rng(o.id * 29), n = 5 + Math.round(o.a / 5);
        for (let i = 0; i < n; i++) {
          const a0 = r() * Math.PI * 2, d0 = (0.3 + r() * 0.9) * (o.a + 6) * Math.min(1, el * 6), s0 = Math.max(2, Math.round((2 + r() * 4) * Math.min(1.6, o.a / 12)));
          const rx = Math.round(o.x + Math.cos(a0) * d0), ry = Math.round(o.y + Math.sin(a0) * d0 * 0.5);
          const h = Math.max(1, Math.round(s0 * Math.min(1, k * 2)));
          px(ctx, rx - 1, ry - h - 1, s0 + 2, h + 2, OUT); px(ctx, rx, ry - h, s0, h, i % 2 ? '#7a6e5f' : '#8f8371');
        }
        break;
      }
      case 'target': {   // Magic Wall Pass: điểm hẹn — hồng tâm vàng + vòng trắng co lại đếm ngược (a = giây tới lúc bóng tới) + mũi tên nảy
        const k2 = Math.max(0, 1 - el / o.a), r = 9 + 22 * k2;
        ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, 10, 5, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = o.color; ctx.lineWidth = 1; ctx.stroke();
        ctx.globalAlpha = fade * 0.85; ctx.strokeStyle = '#ffffff';
        ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = fade;
        px(ctx, x - 14, y, 5, 1, o.color); px(ctx, x + 10, y, 5, 1, o.color); px(ctx, x, y - 7, 1, 3, o.color); px(ctx, x, y + 5, 1, 3, o.color);
        const ay = y - 16 - Math.round(Math.abs(Math.sin(t * 6)) * 5);
        px(ctx, x - 3, ay - 1, 7, 3, OUT); px(ctx, x - 2, ay, 5, 1, o.color); px(ctx, x - 1, ay + 1, 3, 2, OUT); px(ctx, x, ay + 1, 1, 2, o.color);
        break;
      }
      case 'mhand': {   // Magic Wall Pass: găng tay trắng ma thuật thò ra từ tường (a = hướng vào sân) bắt rồi ném bóng
        const ext = Math.sin(Math.min(1, el / o.max) * Math.PI) * 20, ux = Math.cos(o.a), uy = Math.sin(o.a);
        ctx.globalCompositeOperation = 'lighter';
        ellipse(ctx, x, y, 9, 3, 'rgba(157,123,255,0.6)');
        ctx.globalCompositeOperation = 'source-over';
        for (let i = 0; i < ext; i += 2) { px(ctx, Math.round(x + ux * i) - 2, Math.round(y + uy * i) - 8, 5, 5, OUT); px(ctx, Math.round(x + ux * i) - 1, Math.round(y + uy * i) - 7, 3, 3, '#c9b5ff'); }
        const gx = Math.round(x + ux * ext), gy = Math.round(y + uy * ext) - 6;
        disc(ctx, gx, gy, 7, OUT); disc(ctx, gx, gy, 6, '#ffffff');
        px(ctx, gx - 4, gy + Math.round(uy * 4), 9, 1, '#c7ccd6');   // nếp ngón tay
        px(ctx, gx - 1, gy - 1, 1, 1, '#c7ccd6'); px(ctx, gx + 2, gy - 1, 1, 1, '#c7ccd6');
        if (Math.random() < 0.4) px(ctx, gx + Math.round((Math.random() - 0.5) * 14), gy + Math.round((Math.random() - 0.5) * 10), 1, 1, '#ffe14f');
        break;
      }
      case 'fall': {   // trơn té (CoreStat.slip): ngã ngửa thật — tung chân lên, đập lưng xuống nằm sõng soài (chân về hướng trượt b), sao quay trên đầu,
                       // cuối lượt choáng lồm cồm đứng dậy (sprite thật bị ẩn — hides)
        const q = byId(g, o.a);
        if (!q) break;
        const D = 0.14, UP = 0.22, side = Math.cos(o.b) >= 0 ? 1 : -1;
        let k2 = el < D ? el / D : o.t < UP ? o.t / UP : 1;
        k2 = 1 - (1 - k2) * (1 - k2);
        const hop = el < D ? Math.sin(Math.PI * el / D) * 5 : 0;
        const thud = el >= D && el < D + 0.07 ? 1 : 0;   // vừa đập lưng xuống: dẹp xuống 1px
        ctx.globalAlpha = 1;
        ellipse(ctx, x, y + 1, 6 + 6 * k2, 2.5, 'rgba(0,0,0,0.38)');
        // bụi tung khi đang trượt trên sân
        const sp = Math.hypot(q.vx || 0, q.vy || 0);
        if (sp > 30 && k2 > 0.5) for (let i = 0; i < 3; i++) {
          const ph = (t * 5 + i / 3) % 1;
          ctx.globalAlpha = (1 - ph) * 0.6;
          px(ctx, Math.round(x + side * (8 + ph * 6) - (q.vx / sp) * ph * 10), Math.round(y - 1 - ph * 5), 2, 2, '#d9cbb0');
        }
        ctx.globalAlpha = 1;
        ctx.save();
        ctx.translate(x, Math.round(y - 8 + 5 * k2 - hop + thud));
        ctx.rotate(-side * Math.PI / 2 * k2);
        SP().drawPlayer(ctx, Object.assign({}, q, { x: 0, y: 8, vx: 0, vy: 0, state: 'normal', atkType: null, celPose: null, keeper: false }), g, 0.999);
        ctx.restore();
        // nằm im: sao vàng quay quanh đầu (đầu ở phía ngược hướng trượt)
        if (k2 > 0.8) for (let i = 0; i < 3; i++) {
          const a2 = t * 7 + (i * Math.PI * 2) / 3;
          px(ctx, Math.round(x - side * 14 + Math.cos(a2) * 6), Math.round(y - 9 + Math.sin(a2) * 2), 2, 2, i ? '#ffe14f' : '#ffffff');
        }
        break;
      }
      case 'chicken': {   // Chicken Ray: con gà thay người (sprite thật bị ẩn — hides), khăn màu áo đội, chạy lon ton
        const q = byId(g, o.a);
        if (!q) break;
        const run = Math.hypot(q.vx || 0, q.vy || 0) > 12, st = run ? Math.floor(t * 14 + o.id) % 2 : 0, dir = Math.cos(q.facing) >= 0 ? 1 : -1;
        ellipse(ctx, x, y + 1, 7, 2.5, 'rgba(0,0,0,0.35)');
        px(ctx, x - 2, y - 4, 1, 4 - st, '#ff8a3f'); px(ctx, x + 1, y - 4, 1, 3 + st, '#ff8a3f');
        px(ctx, x - 6, y - 13, 12, 10, OUT); px(ctx, x - 5, y - 12, 10, 8, '#f3ead7');
        px(ctx, x - dir * 7 - 1, y - 16, 3, 5, OUT); px(ctx, x - dir * 7, y - 15, 1, 3, '#f3ead7');                 // đuôi
        px(ctx, x - dir * 2 - 2, y - 10 - st * 2, 5, 3, '#d9cbb0');                                                  // cánh vỗ
        const hx = x + dir * 5;
        px(ctx, hx - 3, y - 21, 7, 8, OUT); px(ctx, hx - 2, y - 20, 5, 6, '#f3ead7');
        px(ctx, hx - 1, y - 23, 3, 2, '#d7263d');                                                                     // mào
        px(ctx, dir > 0 ? hx + 3 : hx - 4, y - 18, 2, 1, '#ff8a3f');                                                 // mỏ
        px(ctx, hx + dir, y - 19, 1, 1, OUT);
        px(ctx, hx - 2, y - 14, 5, 1, g.teams[q.team].cfg.kit.shirt);                                                // khăn màu đội
        if (run && Math.random() < 0.15) px(ctx, x + Math.round((Math.random() - 0.5) * 12), y - 8 - Math.round(Math.random() * 8), 1, 1, '#ffffff');
        break;
      }
      case 'panic': {   // Panic Ball: hoảng sợ — "!!" run rẩy trên đầu, mặt tái xanh, mồ hôi rơi, vạch run hai bên
        const j = Math.floor(t * 30) % 2 ? 1 : -1;
        ctx.globalAlpha = fade * 0.5; px(ctx, x - 4, y - 26, 9, 7, '#3f8cff'); ctx.globalAlpha = fade;
        for (let i = 0; i < 4; i++) px(ctx, x - 4 + i * 2 + j, y - 27, 1, 4 + (i % 2) * 2, '#2a3a9a');   // vạch sốc tím xanh trên mặt (kiểu anime)
        for (const sd of [-1, 1]) { px(ctx, x + sd * 9 + j, y - 20, 1, 5, '#7fe7ff'); px(ctx, x + sd * 11 + j, y - 17, 1, 3, '#7fe7ff'); }
        for (let i = 0; i < 3; i++) {
          const ph = (t * 1.6 + i / 3) % 1;
          ctx.globalAlpha = fade * (1 - ph);
          px(ctx, x - 7 + i * 7, y - 30 + Math.round(ph * 14), 1, 2, '#bdf4ff');
        }
        ctx.globalAlpha = fade;
        outlinedText(ctx, '!!', x + j, y - 40, 22, Math.floor(t * 8) % 2 ? '#7fe7ff' : '#ffffff');
        break;
      }
      case 'truck': {   // Monster Truck: xe tải bánh to, quay theo hướng người lái
        const q = byId(g, o.a);
        if (!q) break;
        const c = Math.cos(q.facing), sd = c >= 0 ? 1 : -1, bob = Math.round(Math.sin(t * 30) * 1);
        ellipse(ctx, x, y + 2, 16, 5, 'rgba(0,0,0,0.45)');
        for (const wx of [-9, 9]) { disc(ctx, x + wx, y - 2, 6, OUT); disc(ctx, x + wx, y - 2, 5, '#262a36'); disc(ctx, x + wx, y - 2, 2, '#9aa3b5'); }   // bánh to
        px(ctx, x - 15, y - 14 + bob, 30, 9, OUT); px(ctx, x - 14, y - 13 + bob, 28, 7, o.color);                // thân
        px(ctx, x - 14, y - 13 + bob, 28, 2, '#ff8a9a');
        px(ctx, x + sd * 2 - 6, y - 22 + bob, 12, 9, OUT); px(ctx, x + sd * 2 - 5, y - 21 + bob, 10, 7, o.color);   // cabin
        px(ctx, x + sd * 5 - 2, y - 20 + bob, 5, 4, '#a8e6ff');                                                    // kính
        disc(ctx, x + sd * 1, y - 19 + bob, 2, q.look ? q.look.skin : '#f2c79a');                                  // đầu người lái
        px(ctx, x + sd * 14 - 1, y - 11 + bob, 2, 3, '#ffe14f');                                                   // đèn
        break;
      }
      case 'bigmagnet': {   // Mega Magnet: nam châm chữ U khổng lồ hạ từ trên trời xuống
        const z = Math.round(Math.max(0, 1 - el / Math.max(0.01, o.a)) * 160) + 34, my = y - z;
        ellipse(ctx, x, y + 1, 16, 6, `rgba(0,0,0,${0.15 + 0.25 * Math.min(1, el / o.a)})`);
        for (const sd of [-1, 1]) {
          px(ctx, x + sd * 9 - 4, my - 16, 9, 20, OUT);
          px(ctx, x + sd * 9 - 3, my - 15, 7, 14, sd < 0 ? '#ff3d5a' : '#4b69ff');
          px(ctx, x + sd * 9 - 3, my - 1, 7, 4, '#e8ecf5');   // đầu cực bạc
        }
        px(ctx, x - 13, my - 22, 27, 8, OUT); px(ctx, x - 12, my - 21, 25, 6, '#a8203a');
        if (el >= o.a) {   // đang hút: tia từ trường chạy xuống
          ctx.globalAlpha = fade * 0.5;
          for (let i = 0; i < 4; i++) { const yy = my + ((t * 90 + i * 9) % 34); px(ctx, x - 12 + i * 8, Math.round(yy), 2, 3, i % 2 ? '#ff3d5a' : '#4b69ff'); }
        }
        break;
      }
      case 'puddle': {   // Ghost Hands: vũng bóng tím sắp có bàn tay trồi lên
        const r = o.a * (0.6 + 0.4 * Math.min(1, el * 4)) + Math.sin(t * 12) * 1;
        ellipse(ctx, x, y + 1, r + 2, (r + 2) * 0.45, 'rgba(20,8,40,0.55)');
        ellipse(ctx, x, y + 1, r, r * 0.45, 'rgba(91,63,176,0.7)');
        for (let i = 0; i < 5; i++) { const a = t * 4 + i * 1.26; px(ctx, Math.round(x + Math.cos(a) * r * 0.7), Math.round(y + 1 + Math.sin(a) * r * 0.3), 1, 1, '#c9b5ff'); }
        break;
      }
      case 'hand': {   // Ghost Hands: bàn tay ma túm chân (trồi lên rồi giữ)
        const rise = Math.min(1, el * 6), hh = Math.round(14 * rise);
        ellipse(ctx, x, y + 1, 9, 4, 'rgba(20,8,40,0.55)');
        for (const sd of [-1, 1]) {
          const hx = x + sd * 6;
          px(ctx, hx - 2, y - hh, 4, hh, OUT); px(ctx, hx - 1, y - hh + 1, 2, hh - 1, '#9d7bff');
          // ngón tay quặp vào người
          for (let f = 0; f < 3; f++) { px(ctx, hx - sd * (1 + f), y - hh - 2 + f, 2, 2, OUT); px(ctx, hx - sd * (1 + f), y - hh - 1 + f, 1, 1, '#c9b5ff'); }
        }
        if (Math.random() < 0.3) px(ctx, x + Math.round((Math.random() - 0.5) * 16), y - Math.round(Math.random() * 16), 1, 1, '#c9b5ff');
        break;
      }
      case 'moon': {   // Moon Stomp: vòng trăng + bụi lơ lửng bay lên chậm
        ctx.strokeStyle = o.color; ctx.lineWidth = 1;
        ctx.globalAlpha = fade * 0.55;
        ctx.beginPath(); ctx.ellipse(o.x, o.y, o.a, o.a * 0.45, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = fade * 0.1; ctx.fillStyle = o.color; ctx.fill();
        ctx.globalAlpha = fade * 0.8;
        for (let i = 0; i < 18; i++) {
          const r = rng(o.id * 31 + i), a = r() * Math.PI * 2, d = Math.sqrt(r()) * o.a, ph = (el * 0.4 + r()) % 1;
          px(ctx, Math.round(o.x + Math.cos(a) * d), Math.round(o.y + Math.sin(a) * d * 0.45 - ph * 30), 1, 1, i % 3 ? '#e8fbff' : o.color);
        }
        break;
      }
      case 'dot':   // Boomerang Kick: chấm đường bay báo trước (nhấp nháy, nổi trên sân tối)
        ellipse(ctx, x, y + 1, 3, 1.5, 'rgba(0,0,0,0.35)');
        disc(ctx, x, y - 5, 3, OUT); disc(ctx, x, y - 5, 2, Math.floor(t * 8 + o.id) % 2 ? o.color : '#ffffff');
        break;
      case 'chain': {   // Iron Chain: xích thép nối 2 cầu thủ (mắt xích so le)
        const A = byId(g, o.a), Bq = byId(g, o.b);
        if (!A || !Bq) break;
        const dx = Bq.x - A.x, dy = Bq.y - A.y, len = Math.hypot(dx, dy), n = Math.max(2, Math.floor(len / 5));
        for (let i = 0; i <= n; i++) {
          const u = i / n, sag = Math.sin(u * Math.PI) * Math.min(6, len * 0.04);
          const lx = Math.round(A.x + dx * u), ly = Math.round(A.y + dy * u - 5 + sag);
          if (i % 2) { px(ctx, lx - 2, ly - 1, 4, 3, OUT); px(ctx, lx - 1, ly, 2, 1, '#c7ccd6'); }
          else { px(ctx, lx - 1, ly - 2, 3, 4, OUT); px(ctx, lx, ly - 1, 1, 2, '#e8ecf5'); }
        }
        break;
      }
      case 'stance': {   // Parry Volley: vòng vàng thế thủ (2 lớp, viền tối) + 2 thanh kiếm chéo trên đầu
        const r = 12 + Math.sin(t * 10);
        ctx.lineWidth = 3; ctx.strokeStyle = OUT;
        ctx.beginPath(); ctx.ellipse(x, y + 1, r, r * 0.45, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 2; ctx.strokeStyle = o.color; ctx.stroke();
        ctx.globalAlpha = fade * 0.2; ctx.fillStyle = o.color; ctx.fill();
        ctx.globalAlpha = fade;
        for (const sd of [-1, 1]) for (let i = 0; i < 7; i++) { px(ctx, x + sd * (7 - i * 2) - 1, y - 30 + i * 2 - 1, 4, 3, OUT); px(ctx, x + sd * (7 - i * 2), y - 30 + i * 2, 2, 1, i < 2 ? '#ffffff' : o.color); }
        break;
      }
      case 'magnet': {   // Magnet Ball: đường sức từ đỏ / xanh quanh bóng
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
          const r = 7 + i * 4 + Math.sin(t * 8 + i) * 1.5;
          ctx.globalAlpha = fade * (0.7 - i * 0.18);
          ctx.strokeStyle = '#ff3d5a'; ctx.beginPath(); ctx.arc(x, y - 3, r, Math.PI * 0.6, Math.PI * 1.4); ctx.stroke();
          ctx.strokeStyle = '#4b69ff'; ctx.beginPath(); ctx.arc(x, y - 3, r, -Math.PI * 0.4, Math.PI * 0.4); ctx.stroke();
        }
        break;
      }
      case 'tornado': {   // Hurricane Kick: lốc xoáy hình phễu xoay quanh người
        for (let i = 0; i < 10; i++) {
          const hy = y - i * 4, r = 5 + i * 2, a = t * 18 + i * 0.7;
          ctx.globalAlpha = fade * (0.85 - i * 0.05);
          ctx.strokeStyle = i % 2 ? '#ffffff' : o.color; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(x + Math.sin(t * 6 + i) * 1.5, hy, r, r * 0.35, 0, 0, Math.PI * 2); ctx.stroke();
          ctx.globalAlpha = fade;
          px(ctx, Math.round(x + Math.cos(a) * r), Math.round(hy + Math.sin(a) * r * 0.35), 1, 1, '#b46bff');
        }
        break;
      }
      case 'portal': {   // Portal Kicks: cổng xoáy đứng
        const open = Math.min(1, el * 5, k * 4), rx = 5 * open, ry = 10 * open;
        if (rx < 0.5) break;
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = o.color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(x, y - 10, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
        for (let i = 0; i < 8; i++) { const a = t * 9 + i * 0.8, r = 0.3 + (i % 3) * 0.3; px(ctx, Math.round(x + Math.cos(a) * rx * r), Math.round(y - 10 + Math.sin(a) * ry * r), 1, 1, i % 2 ? '#ffffff' : o.color); }
        ctx.globalCompositeOperation = 'source-over';
        ellipse(ctx, x, y - 10, Math.max(0.5, rx - 2), Math.max(0.5, ry - 3), '#140820');
        break;
      }
      case 'foot': {   // Portal Kicks: chân thò ra khỏi cổng
        const ext = Math.sin(Math.min(1, el / o.max) * Math.PI) * (o.b || 16), ux = Math.cos(o.a), uy = Math.sin(o.a);   // b: độ vươn
        for (let i = 0; i < ext; i += 2) { px(ctx, Math.round(x + ux * i) - 2, Math.round(y - 8 + uy * i) - 2, 5, 5, OUT); px(ctx, Math.round(x + ux * i) - 1, Math.round(y - 8 + uy * i) - 1, 3, 3, o.color); }
        const fx = Math.round(x + ux * ext), fy = Math.round(y - 8 + uy * ext);
        px(ctx, fx - 3, fy - 3, 7, 6, OUT); px(ctx, fx - 2, fy - 2, 5, 4, '#ffffff'); px(ctx, fx - 2, fy + 1, 5, 1, '#c7ccd6');
        break;
      }
      case 'glove': {   // Jack-in-the-Box: lò xo + găng đấm đỏ bật ra
        const ext = Math.sin(Math.min(1, el / o.max) * Math.PI) * 20, ux = Math.cos(o.a), uy = Math.sin(o.a);
        for (let i = 0; i < ext; i += 3) px(ctx, Math.round(x + ux * i + (i % 6 ? 2 : -2) * -uy), Math.round(y - 6 + uy * i + (i % 6 ? 2 : -2) * ux), 2, 2, '#c7ccd6');
        const gx = Math.round(x + ux * ext), gy = Math.round(y - 6 + uy * ext);
        disc(ctx, gx, gy, 5, OUT); disc(ctx, gx, gy, 4, o.color); px(ctx, gx - 2, gy - 3, 2, 1, '#ffb0bc');
        break;
      }
      case 'pillar': {   // Earth Spike: cột đá trồi lên rồi lún xuống
        const hh = Math.round(22 * Math.min(1, el * 8, k * 6));
        ellipse(ctx, x, y + 1, 9, 4, 'rgba(0,0,0,0.4)');
        if (hh <= 0) break;
        px(ctx, x - 6, y - hh, 12, hh + 2, OUT);
        px(ctx, x - 5, y - hh + 1, 10, hh, '#8a7f70');
        px(ctx, x - 5, y - hh + 1, 3, hh, '#b5a890');
        px(ctx, x + 2, y - hh + 1, 3, hh, '#6a6052');
        px(ctx, x - 4, y - hh - 2, 8, 3, OUT); px(ctx, x - 3, y - hh - 1, 6, 2, '#c9bca3');   // đỉnh nhọn
        px(ctx, x - 1, y - hh - 4, 2, 2, OUT);
        const r = rng(o.id * 13);
        for (let i = 0; i < 3; i++) px(ctx, x - 4 + Math.round(r() * 7), y - Math.round(r() * hh), 2, 1, '#5a5044');
        break;
      }
      case 'anvil': {   // Anvil Rain: đe rơi từ trời (bóng đổ lớn dần) rồi nằm trên sân
        const fall = o.a, land = el >= fall, z = land ? 0 : Math.round(Math.pow(1 - el / fall, 2) * 220);
        const sr = land ? 8 : 3 + 5 * (el / fall);
        ellipse(ctx, x, y + 1, sr, sr * 0.45, land ? 'rgba(0,0,0,0.45)' : `rgba(0,0,0,${0.2 + 0.3 * (el / fall)})`);
        if (!land && el < fall * 0.25) break;   // còn ở ngoài khung hình
        const ay = y - z;
        px(ctx, x - 8, ay - 12, 17, 5, OUT); px(ctx, x - 7, ay - 11, 15, 3, '#5a606e');   // mặt đe
        px(ctx, x - 11, ay - 11, 5, 3, OUT); px(ctx, x - 10, ay - 10, 3, 1, '#5a606e');   // mũi đe
        px(ctx, x - 4, ay - 7, 9, 4, OUT); px(ctx, x - 3, ay - 7, 7, 3, '#4a4f5c');          // eo
        px(ctx, x - 7, ay - 3, 15, 4, OUT); px(ctx, x - 6, ay - 3, 13, 2, '#5a606e');        // chân đế
        px(ctx, x - 6, ay - 11, 8, 1, '#9aa3b5');
        break;
      }
      case 'jbox': {   // Jack-in-the-Box: hộp quà lò xo, rung khi sẵn sàng
        const wob = el > 0.4 ? Math.round(Math.sin(t * 20 + o.id) * 1) : 0;
        ellipse(ctx, x, y + 1, 7, 3, 'rgba(0,0,0,0.4)');
        px(ctx, x - 6 + wob, y - 11, 12, 12, OUT);
        px(ctx, x - 5 + wob, y - 10, 10, 10, o.color);
        px(ctx, x - 1 + wob, y - 10, 2, 10, '#ffd23f'); px(ctx, x - 5 + wob, y - 6, 10, 2, '#ffd23f');
        px(ctx, x - 5 + wob, y - 10, 10, 1, '#ff8a9a');
        px(ctx, x - 3 + wob, y - 14, 6, 3, OUT); px(ctx, x - 2 + wob, y - 13, 4, 1, '#ffd23f');   // nơ
        break;
      }
      case 'mirror': {   // Hall of Mirrors: tấm gương thép đứng, vệt sáng chạy ngang
        const half = o.b / 2, ux = Math.cos(o.a), uy = Math.sin(o.a), H = 16;
        const x0 = o.x - ux * half, y0 = o.y - uy * half, x1 = o.x + ux * half, y1 = o.y + uy * half;
        ctx.fillStyle = OUT;
        ctx.beginPath(); ctx.moveTo(x0, y0 + 1); ctx.lineTo(x1, y1 + 1); ctx.lineTo(x1, y1 - H - 1); ctx.lineTo(x0, y0 - H - 1); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = fade * 0.75; ctx.fillStyle = o.color;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x1, y1 - H); ctx.lineTo(x0, y0 - H); ctx.closePath(); ctx.fill();
        const s0 = ((t * 0.8 + o.id * 0.3) % 1.4) - 0.2;
        if (s0 > 0 && s0 < 1) {
          ctx.globalAlpha = fade;
          const gx = x0 + (x1 - x0) * s0, gy = y0 + (y1 - y0) * s0;
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(gx, gy - 2); ctx.lineTo(gx + 3, gy - H + 2); ctx.stroke();
        }
        break;
      }
      default:   // vật thể luật trận FOOTBALL STORY (render/modsdraw.js)
        if (SFC.ModDraw && SFC.ModDraw.kinds[o.kind]) SFC.ModDraw.draw(ctx, g, o, c, k, el, fade, part);
    }
    ctx.globalAlpha = 1;
  }

  const VFX = {
    floor(ctx, g) {
      const V = g.effects.V;
      for (const d of V.decals) drawDecal(ctx, g, d);
      for (const o of V.props) if (PROP_FLOOR[o.kind]) drawProp(ctx, g, o);
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
    // vật thể đứng (cột đá, đe, gương, hộp lò xo, cổng, lốc xoáy, bàn tay ma) để renderer xếp theo chiều sâu cùng cầu thủ
    // sprite thật của p đang bị vật thể Tuyệt kỹ thay thế (King Kong, đứng trên đá, con gà)
    // p đang có vật thể Tuyệt kỹ loại kind bám theo
    has(g, p, kind) {
      for (const o of g.effects.V.props) if (o.kind === kind && o.a === p.id && o.t > 0) return true;
      return false;
    },
    // đang có vật thể loại kind trên sân (bất kể bám ai)
    anyProp(g, kind) {
      for (const o of g.effects.V.props) if (o.kind === kind && o.t > 0) return true;
      return false;
    },
    hides(g, p) {
      for (const o of g.effects.V.props) if (PROP_HIDE[o.kind] && o.a === p.id && o.t > 0) return true;
      return false;
    },
    props(g) {
      const out = [];
      const MD = SFC.ModDraw;
      for (const o of g.effects.V.props) {
        if (PROP_FLOOR[o.kind] || PROP_TOP[o.kind]) continue;
        // vật thể dài (tường graffiti): mỗi khúc xếp chiều sâu riêng (part = số thứ tự khúc, ModDraw.parts)
        const parts = MD && MD.parts && MD.parts(o);
        if (parts) { parts.forEach((pt, i) => out.push({ y: pt.d, o, part: i })); continue; }
        // nhảy parkour qua tường graffiti: lúc đang ở trên tường (giữa cú nhảy) vẽ trước cả bức tường (o.y = chân tường gần camera nhất)
        if (o.kind === 'vault') { const y = propAt(g, o).y, k = 1 - o.t / o.max; out.push({ y: k > 0.2 && k < 0.8 ? Math.max(y, o.y + 4) : y, o }); continue; }
        out.push({ y: propAt(g, o).y + (PROP_OVER[o.kind] ? 0.3 : o.kind === 'hand' || o.kind === 'tornado' ? 0.2 : o.kind === 'stand' ? -0.5 : 0), o });
      }
      return out;
    },
    drawProp,
    // chữ viền trên sân (dịch qua SFC.t), cho vật thể vẽ ở file khác (render/modsdraw.js: lá bài)
    text(ctx, str, x, y, size, fill) { outlinedText(ctx, SFC.t(str), x, y, size, fill); },

    // dưới sprite: hào quang (Phản Công, Nhạc Trưởng...), Đà tối đa, vệt tàn ảnh Quỷ Tốc Độ
    under(ctx, g, p) {
      const { ellipse, drawPlayer, px } = SP(), t = g.time + p.id * 0.37, x = Math.round(p.x), y = Math.round(p.y);
      // Thiên Thạch Giáng: tâm ngắm đỏ co lại trên sân (người đang ở ngoài màn hình)
      if (p.state === 'meteor' && !SFC.VFX.hides(g, p)) {   // (người đã nhập vào King Leo cũng ở state meteor nhưng bị ẩn: không vẽ tâm ngắm)
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
      // TOÉ ĐIỆN: vòng điện xanh dưới chân
      if (p.surge) {
        ctx.globalAlpha = 0.35 + 0.2 * Math.sin(t * 20);
        ellipse(ctx, x, y, 10, 4, '#3ff6ff');
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    },

    // trên sprite: trạng thái Core nhìn thấy được + tín hiệu báo trước của Core
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
      // TOÉ ĐIỆN (chạy nước rút đủ lâu, có Core TỐC ĐỘ): tia điện lách tách dưới chân + sét chạy dọc người
      if (p.surge) {
        for (let i = 0; i < 5; i++) if (R() < 0.25) px(ctx, x - 6 + Math.round(R() * 12), y - Math.round(R() * 3), R() < 0.5 ? 2 : 1, 1, i % 2 ? '#7fe7ff' : '#ffffff');
        if (R() < 0.45) {
          const sx = x + (R() < 0.5 ? -6 : 5);
          let yy = y - 2;
          for (let k = 0; k < 4; k++) { const ny = yy - 3 - Math.round(R() * 2); px(ctx, sx + Math.round(R() * 2 - 1), ny, 1, yy - ny, '#bdf4ff'); yy = ny; }
        }
      }
      // Nắm Đấm Khổng Lồ sẵn sàng: hai nắm tay bốc lửa
      if (p.fistRdy && C.has(p, 'giant_fist')) {
        for (const s of [-1, 1]) {
          const hx = x + s * 6, hy2 = y - 7;
          disc(ctx, hx, hy2, 3 + (Math.sin(t * 14 + s) > 0 ? 1 : 0), 'rgba(255,50,40,0.6)');
          if (R() < 0.5) px(ctx, hx - 1 + Math.round(R() * 2), hy2 - 3 - Math.round(R() * 4), 1, 1, R() < 0.5 ? '#ffd23f' : '#ff6a1f');
        }
      }
      // Nắm Đấm Sắt sẵn sàng: hai nắm tay thép
      if (p.fistRdy && C.has(p, 'iron_fist') && !C.has(p, 'giant_fist')) {
        ctx.globalCompositeOperation = 'source-over';
        for (const s of [-1, 1]) { px(ctx, x + s * 6 - 1, y - 8, 3, 3, '#140c16'); px(ctx, x + s * 6 - 1, y - 8, 2, 2, '#c7ccd6'); px(ctx, x + s * 6 - 1, y - 8, 1, 1, '#ffffff'); }
        ctx.globalCompositeOperation = 'lighter';
      }
      // Phá Âm Chướng: đang TOÉ ĐIỆN -> hình nón sóng âm trắng trước mặt
      if (C.has(p, 'sonic_boom') && p.surge && Math.hypot(p.vx || 0, p.vy || 0) > 90) {
        const a = Math.atan2(p.vy, p.vx), ph = (g.time * 6) % 1;
        for (let k = 0; k < 3; k++) {
          const r = 9 + ((k / 3 + ph) % 1) * 12;
          ctx.globalAlpha = 0.6 * (1 - ((k / 3 + ph) % 1));
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(x, y - 7, r, a - 0.6, a + 0.6); ctx.stroke();
        }
        ctx.globalAlpha = 1;
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

    // hình thái Tuyệt kỹ thức tỉnh (X4, docs/ULT_AWAKEN.md): cầu thủ đổi ngoại hình theo trường phái của Tuyệt kỹ
    // chung: hào quang màu trường phái bao người (thở nhẹ) + mắt phát sáng; riêng: chi tiết theo trường phái
    form(ctx, g, p, hy) {
      const tag = g.cores.formOf(p);
      if (!tag || p.airZ > 0) return;
      const { px, disc, ellipse } = SP(), t = g.time + p.id * 0.37, x = Math.round(p.x), y = Math.round(p.y), R = Math.random;
      const moving = Math.hypot(p.vx || 0, p.vy || 0) > 20;
      const A = SFC_CONFIG.cores.archetypes[tag], col = tag === 'chaos' ? `hsl(${Math.floor(t * 240) % 360},100%,62%)` : (A && A.color) || '#ffe14f';
      const br = 0.5 + 0.5 * Math.sin(t * 5);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.16 + 0.1 * br;
      ellipse(ctx, x, y - 8, 9 + Math.round(br), 13 + Math.round(br), col);
      ctx.globalAlpha = 0.35 + 0.2 * br;
      ellipse(ctx, x, y + 1, 9, 3, col);
      ctx.globalAlpha = 1;
      // mắt phát sáng (đè lên mắt sprite: hy = tâm đầu do drawPlayer trả về), không vẽ khi quay lưng / choáng
      if (hy != null && Math.sin(p.facing) >= -0.35 && p.state !== 'stun' && (p.sizeMul || 1) < 1.1) {
        const ex = x + Math.round(Math.cos(p.facing) * 2), ey = Math.round(hy) + (Math.sin(p.facing) > 0.4 ? 1 : 0);
        px(ctx, ex - 4, ey - 1, 3, 3, col); px(ctx, ex + 1, ey - 1, 3, 3, col);
        px(ctx, ex - 3, ey, 1, 1, '#ffffff'); px(ctx, ex + 2, ey, 1, 1, '#ffffff');
      }
      switch (tag) {
        case 'chaos': // tia màu cầu vồng nhiễu + ô vuông glitch
          if (R() < 0.5) px(ctx, x - 7 + Math.round(R() * 14), y - 18 + Math.round(R() * 18), 2, 1, `hsl(${Math.floor(R() * 360)},100%,65%)`);
          if (R() < 0.15) px(ctx, x - 6 + Math.round(R() * 8), y - 14 + Math.round(R() * 10), 3, 2, 'rgba(255,255,255,0.6)');
          break;
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

    // Clone Legion: phân thân ở lại sân (Effects.decoy có legion) — áo tím mờ, mắt tím phát sáng, khói dưới chân, không dắt bóng
    legion(ctx, g, d) {
      const { px } = SP(), r = d.runner, t = g.time;
      if (!r) return;
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) { ctx.globalAlpha = 0.25; px(ctx, Math.round(d.x - 6 + Math.random() * 12), Math.round(d.y - Math.random() * 3), 2, 1, '#9d7bff'); }
      ctx.globalCompositeOperation = 'source-over';
      const hy = SP().drawPlayer(ctx, Object.assign({ x: d.x, y: d.y, vx: d.vx, vy: d.vy, state: 'normal', flash: 0 }, r), g, 0.62 + 0.1 * Math.sin(t * 9), '#9d7bff');
      ctx.globalAlpha = 1;
      if (hy != null && Math.sin(r.facing) >= -0.35) {
        const ex = Math.round(d.x + Math.cos(r.facing) * 2), ey = Math.round(hy);
        px(ctx, ex - 4, ey - 1, 3, 2, '#d8c0ff'); px(ctx, ex + 1, ey - 1, 3, 2, '#d8c0ff');
      }
    },

    drawClone(ctx, g, c) {
      const k = c.t / c.max;
      SP().drawPlayer(ctx, { x: c.x, y: c.y, vx: c.vx, vy: c.vy, facing: c.facing, anim: c.anim, state: 'normal', flash: 0, team: c.team, role: c.role, look: c.look }, g, Math.min(0.85, k * 3));
    },

    top(ctx, g) {
      const V = g.effects.V, { px, disc } = SP(), t = g.time;
      // THE MOON (màn tối) vẽ trước để lá bài + vật trên cùng khác vẫn nổi trên nền tối
      for (const o of V.props) if (o.kind === 'dark') drawProp(ctx, g, o);
      for (const o of V.props) if (PROP_TOP[o.kind] && o.kind !== 'dark') drawProp(ctx, g, o);
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
      // rồng lửa (Rising Dragon)
      for (const d of V.dragons) drawDragon(ctx, d, t);
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
        if (s.kind === 'rocket') {   // Rocket Punch: nắm đấm tên lửa — găng + vây + lửa phụt đuôi
          ctx.globalCompositeOperation = 'source-over';
          const ux = Math.cos(a), uy = Math.sin(a), fx = Math.round(s.x), fy = Math.round(s.y - 8);
          ctx.globalAlpha = Math.min(1, k * 4);
          for (let i = 1; i <= 6; i++) {   // lửa + khói đuôi
            const tx = Math.round(fx - ux * (6 + i * 4)), ty = Math.round(fy - uy * (6 + i * 4) + Math.sin(t * 40 + i) * 1.5);
            disc(ctx, tx, ty, Math.max(1, 5 - i * 0.6), i < 3 ? (i % 2 ? '#ffd23f' : '#ff7a3d') : 'rgba(154,163,181,0.6)');
          }
          for (const sd of [-1, 1]) px(ctx, Math.round(fx - ux * 6 - uy * sd * 6) - 1, Math.round(fy - uy * 6 + ux * sd * 6) - 1, 3, 3, '#ff3d5a');   // vây
          px(ctx, Math.round(fx - ux * 5) - 3, Math.round(fy - uy * 5) - 3, 6, 6, '#9aa3b5');   // cổ tay kim loại
          disc(ctx, fx, fy, 7, SP().OUT); disc(ctx, fx, fy, 6, s.color || '#ffd8b0');
          for (let i = -1; i <= 1; i++) px(ctx, Math.round(fx + ux * 4 - uy * i * 3) - 1, Math.round(fy + uy * 4 + ux * i * 3) - 1, 2, 2, '#ffb48a');
          disc(ctx, fx - 2, fy - 2, 2, '#fff0e0');
        } else if (s.kind === 'fist') {   // Sonic Fist: nắm đấm sóng chấn khổng lồ + vệt gió
          ctx.globalCompositeOperation = 'source-over';
          const c = s.color || '#ffd8b0', ux = Math.cos(a), uy = Math.sin(a), fx = Math.round(s.x), fy = Math.round(s.y - 8);
          for (let i = 1; i <= 5; i++) { ctx.globalAlpha = Math.min(1, k * 4) * (0.6 - i * 0.1); px(ctx, Math.round(fx - ux * i * 6) - 3, Math.round(fy - uy * i * 6) - 3, 6, 6, '#ffffff'); }
          ctx.globalAlpha = Math.min(1, k * 4);
          disc(ctx, fx, fy, 9, SP().OUT); disc(ctx, fx, fy, 8, c);
          for (let i = -1; i <= 1; i++) px(ctx, Math.round(fx + ux * 5 - uy * i * 4) - 1, Math.round(fy + uy * 5 + ux * i * 4) - 1, 3, 3, '#ffb48a');   // đốt ngón
          disc(ctx, fx - 2, fy - 3, 2, '#fff0e0');
        } else if (s.kind === 'orb') {
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
      this.pops(ctx, g);
    },

    // chữ bật ra (Effects.pop): kiểu theo loại trong config game.fx.popups.kinds. Dịch lúc vẽ (tượng thanh BOOM / POW giữ nguyên trong bản dịch)
    pops(ctx, g) {
      const K = SFC_CONFIG.game.fx.popups.kinds, CL = SFC_CONFIG.cores.list, A = SFC_CONFIG.cores.archetypes;
      for (const c of g.effects.V.pops) {
        const s = K[c.kind], k = 1 - c.t / c.max, str = SFC.t(c.str);
        // màu: '#rrggbb' của người gọi · id Core / tên trường phái -> màu trường phái · không có -> màu mặc định của loại
        const school = c.color && CL[c.color] ? CL[c.color].tags[0] : c.color;
        const color = c.color && c.color[0] === '#' ? c.color : A[school] ? A[school].color : s.color || '#ffe14f';
        const scale = s.pop && k < 0.12 ? 1 + s.pop * (1 - k / 0.12) : 1;
        const rot = c.dir * (s.tilt || 0) + (s.wobble ? Math.sin((c.max - c.t) * 20) * s.wobble : 0);
        ctx.save();
        ctx.font = popFont(str, s.px);
        // gần mép sân: dời vào trong cho chữ không bị cắt (tên chiêu dài)
        const half = (ctx.measureText(str).width * scale) / 2 + s.lw;
        const x = Math.round(Math.max(half, Math.min(W - half, c.x)));
        ctx.translate(x, Math.round(c.y)); ctx.rotate(rot); ctx.scale(scale, scale);
        ctx.globalAlpha = Math.min(1, (c.t / c.max) * 3);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
        if (s.bubble) {   // bong bóng thoại (câu nói của đối thủ): nền trắng, viền tối, gạch dưới màu áo đội, đuôi chỉ xuống người nói
          const bw = Math.ceil(ctx.measureText(str).width / 2) + 4, bh = Math.ceil(s.px / 2) + 4;
          ctx.fillStyle = OUT_C;
          ctx.fillRect(-bw - 1, -bh - 1, bw * 2 + 2, bh * 2 + 2);
          ctx.beginPath(); ctx.moveTo(-4, bh); ctx.lineTo(0, bh + 6); ctx.lineTo(4, bh); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#ffffff'; ctx.fillRect(-bw, -bh, bw * 2, bh * 2);
          ctx.beginPath(); ctx.moveTo(-3, bh - 1); ctx.lineTo(0, bh + 4); ctx.lineTo(3, bh - 1); ctx.closePath(); ctx.fill();
          ctx.fillStyle = c.color && c.color[0] === '#' ? c.color : '#ffe14f'; ctx.fillRect(-bw, bh - 2, bw * 2, 2);
          ctx.fillStyle = s.color; ctx.fillText(str, 0, 0);
          ctx.restore();
          continue;
        }
        ctx.strokeStyle = OUT_C; ctx.lineWidth = s.lw;
        if (s.shadow) { ctx.fillStyle = OUT_C; ctx.strokeText(str, s.shadow, s.shadow); ctx.fillText(str, s.shadow, s.shadow); }
        ctx.strokeText(str, 0, 0);
        ctx.fillStyle = color; ctx.fillText(str, 0, 0);
        ctx.restore();
      }
    },

    applyZoom(ctx, g) {
      const tl = g.effects.O.tilt;
      if (tl) {   // NGHIÊNG SÂN: xoay khung hình nhẹ về phía dir (vào / ra mượt)
        const k = tl.t / tl.max, e = Math.min(1, (1 - k) * 5, k * 5);
        ctx.translate(W / 2, H / 2); ctx.rotate(tl.dir * 0.05 * (tl.amt || 1) * e); ctx.translate(-W / 2, -H / 2);
      }
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
      // băng VHS tua ngược: sọc nhiễu chạy dọc, lệch màu, chữ << góc trên
      if (O.vhs) {
        const k = O.vhs.t / O.vhs.max, a = Math.min(1, (1 - k) * 8, k * 4);
        ctx.globalAlpha = 0.18 * a; ctx.fillStyle = '#c63dff'; ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < 9; i++) {
          const yy = ((now * 260 + i * 53) % (H + 40)) - 20;
          ctx.globalAlpha = 0.35 * a; ctx.fillStyle = i % 3 ? '#ffffff' : '#3ff6ff';
          ctx.fillRect(0, yy, W, 1 + (i % 2));
          ctx.globalAlpha = 0.12 * a; ctx.fillRect(Math.sin(now * 30 + i) * 6, yy + 3, W, 4);
        }
        ctx.globalAlpha = a;
        if (Math.floor(now * 4) % 2) outlinedText(ctx, '<< REW', 70, 30, 22, '#ffffff', '#140c16', 4);
        ctx.globalAlpha = 1;
      }
      // nghiêng sân: mũi tên trôi về phía dir ở 2 mép trên / dưới
      if (O.tilt) {
        const k = O.tilt.t / O.tilt.max, a = Math.min(1, (1 - k) * 6, k * 4), d = O.tilt.dir;
        ctx.globalAlpha = 0.55 * a; ctx.fillStyle = '#ffd23f';
        for (let i = 0; i < 6; i++) for (const yy of [14, H - 14]) {
          const xx = (((now * 90 * d + i * 120) % (W + 60)) + W + 60) % (W + 60) - 30;
          ctx.beginPath(); ctx.moveTo(xx + d * 8, yy); ctx.lineTo(xx - d * 4, yy - 6); ctx.lineTo(xx - d * 4, yy + 6); ctx.closePath(); ctx.fill();
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
        // dạng thức tỉnh: viền vàng 2 lớp + tia toả màu trường phái sau tên chiêu
        if (c.sub) {
          ctx.fillStyle = '#ffe14f'; ctx.fillRect(0, yb - 8, W, 3); ctx.fillRect(0, yb + hb + 5, W, 3);
          ctx.save();
          ctx.beginPath(); ctx.rect(0, yb, W, hb); ctx.clip();
          ctx.globalAlpha = 0.22; ctx.fillStyle = c.color;
          const rx = 420, ry = yb + hb / 2;
          for (let i = 0; i < 16; i++) {
            const a0 = now * 0.8 + (i / 16) * Math.PI * 2, a1 = a0 + 0.12;
            ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + Math.cos(a0) * 400, ry + Math.sin(a0) * 400); ctx.lineTo(rx + Math.cos(a1) * 400, ry + Math.sin(a1) * 400); ctx.closePath(); ctx.fill();
          }
          ctx.restore();
          ctx.globalAlpha = 1;
        }
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
        // tên dài (tên thức tỉnh, bản dịch) thu nhỏ cho vừa nửa phải dải
        let fs = c.sub ? 42 : 46;
        ctx.font = font(c.str, fs);
        while (fs > 22 && ctx.measureText(c.str).width > 400) ctx.font = font(c.str, (fs -= 2));
        if (c.sub) outlinedText(ctx, SFC.t(c.sub), 420, yb + 17, 14, '#ffe14f', '#140c16', 4);
        outlinedText(ctx, c.str, 420, yb + hb / 2 + (c.sub ? 8 : 0), fs, c.color, '#140c16', 6);
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
        const str = SFC.t(c.str);
        outlinedText(ctx, str, 3, 3, 40, '#140c16', '#140c16', 5);
        outlinedText(ctx, str, 0, 0, 40, c.color, '#140c16', 5);
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
