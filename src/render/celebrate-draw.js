/* CelebrateDraw — vẽ động tác ăn mừng bàn thắng (danh sách ở progression.config.js, slot 'cel'; di chuyển ở src/systems/celebrate.js)
 * Mỗi động tác: pose(t, p) -> tư thế cho drawPlayer (sprites.js đọc p.celPose):
 *   lift (px nhấc khỏi đất) · rot (xoay cả người quanh hông) · face (hướng nhìn, thiếu = theo trận) · run (chân chạy)
 *   arms [trái, phải] ([dx, dy] bàn tay hoặc [khuỷu dx, dy, tay dx, dy] tính từ vai) · legs ('kneel' | 'cross' | 'split')
 *   drop (thân hạ xuống) · headDy · eyes ('happy' | 'closed' | 'up') · mouth (há miệng)
 * under(ctx, I) vẽ trước người (cột sáng, hào quang, cánh) · fx(ctx, I) vẽ sau (đạo cụ, hạt). Hạt tính thẳng từ thời gian t
 * (không lưu trạng thái) -> xem trước ở túi đồ, máy khách online vẽ y hệt. icon = giây đặc trưng dùng làm icon trong túi đồ / hộp.
 */
window.SFC = window.SFC || {};

(function () {
  const SP = () => SFC.Sprites;
  const FRONT = Math.PI / 2, TAU = Math.PI * 2;
  const S = Math.sin;
  const clamp01 = (k) => Math.max(0, Math.min(1, k));
  const ease = (k) => k * k * (3 - 2 * k);
  const easeOut = (k) => 1 - (1 - k) * (1 - k);
  const DOWN = [[-1, 4], [1, 4]];   // tay buông
  // số giả ngẫu nhiên cố định theo chỉ số hạt
  const rnd = (i, k = 0) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };
  const lead = (id) => SFC.Celebrate.lead(id);
  const sideOf = (p) => (Math.cos(p.facing) >= 0 ? 1 : -1);
  const px = (ctx, x, y, w, h, c) => SP().px(ctx, x, y, w, h, c);
  function additive(ctx, fn) { ctx.globalCompositeOperation = 'lighter'; fn(); ctx.globalCompositeOperation = 'source-over'; }
  // chữ / hình pixel nhỏ: rows = mảng chuỗi, '#' = điểm màu (kèm bóng mực lệch 1px)
  function glyph(ctx, rows, x, y, c) {
    for (let pass = 0; pass < 2; pass++) {
      rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] === '#') px(ctx, Math.round(x) + i + (pass ? 0 : 1), Math.round(y) + j + (pass ? 0 : 1), 1, 1, pass ? c : SP().OUT); });
    }
  }
  const Z = ['###', '..#', '.#.', '###'];
  const NOTE = ['..##', '..#.', '..#.', '###.', '##..'];
  // tia sáng hình dấu + (lấp lánh)
  function twinkle(ctx, x, y, r, c = '#fff6c0') {
    x = Math.round(x); y = Math.round(y);
    px(ctx, x - r, y, r * 2 + 1, 1, c); px(ctx, x, y - r, 1, r * 2 + 1, c);
    px(ctx, x, y, 1, 1, '#ffffff');
  }
  // vòng tròn rỗng dẹt (sóng âm, hào quang trên đầu)
  function ring(ctx, x, y, rx, ry, c) {
    const n = Math.max(8, Math.round(rx * 3));
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU; px(ctx, Math.round(x + Math.cos(a) * rx), Math.round(y + Math.sin(a) * ry), 1, 1, c); }
  }
  // bụi tung lên quanh điểm (x, y) trong a giây đầu (0..1)
  function dust(ctx, x, y, a, n = 7, spread = 14, back = null) {
    if (a < 0 || a > 1) return;
    for (let i = 0; i < n; i++) {
      const k = (a * 2.4 + i / n) % 1;
      ctx.globalAlpha = (1 - a) * (1 - k) * 0.85;
      const bx = back ? -back.x * k * 16 : 0, by = back ? -back.y * k * 6 : 0;
      px(ctx, Math.round(x + (rnd(i) - 0.5) * spread + bx), Math.round(y - k * 6 + by), 2, 2, i % 2 ? '#d9c8a6' : '#a8957a');
    }
    ctx.globalAlpha = 1;
  }

  const POSES = {
    /* ---------- mặc định ---------- */
    fistpump: {
      icon: 0.12,
      pose(t) {
        const b = (t * 2.2) % 1, up = b < 0.4;
        return { lift: up ? Math.round(S((b / 0.4) * Math.PI) * 4) : 0, arms: [[-1, 4], up ? [2, -9] : [4, -2, 3, -6]], eyes: 'happy', mouth: up, face: FRONT };
      },
      fx(ctx, I) {
        const b = (I.t * 2.2) % 1;
        if (b < 0.2) { const h = I.hand(1); twinkle(ctx, h.x + 1, h.y - 2, 3); }
      },
    },

    /* ---------- THƯỜNG ---------- */
    airplane: {
      icon: 0.6,
      // nghiêng cánh bằng tay (xoay góc nhỏ làm nhoè pixel)
      pose(t) { const f = Math.round(S(t * 3.2) * 2) + Math.round(S(t * 10) * 0.6); return { run: true, arms: [[-8, f], [8, -f]], eyes: 'happy', mouth: true }; },
      fx(ctx, I) {   // vệt gió sau 2 bàn tay
        const d = I.p.preview ? { x: 1, y: 0 } : { x: Math.cos(I.p.facing), y: Math.sin(I.p.facing) };
        ctx.globalAlpha = 0.75;
        for (const h of [I.hand(0), I.hand(1)]) for (let k = 1; k <= 3; k++) px(ctx, Math.round(h.x - d.x * (k * 3 + 1)), Math.round(h.y - d.y * (k * 2 + 1)), 2, 1, '#ffffff');
        ctx.globalAlpha = 1;
      },
    },
    kneeslide: {
      icon: 1.2,
      pose(t) {
        if (t < lead('kneeslide')) return { run: true };
        const sh = Math.round(S(t * 30) * 0.6);
        return { legs: 'kneel', drop: 4, arms: [[-5, -8 + sh], [5, -8 - sh]], eyes: 'happy', mouth: true, face: FRONT };
      },
      fx(ctx, I) { dust(ctx, I.x, I.y, I.t - lead('kneeslide'), 8, 12, I.mv); },
    },
    skypoint: {
      icon: 0.8,
      pose(t) { return { lift: 1 + Math.round(S(t * 4)), arms: [[-2, -10], [2, -10]], eyes: 'up', face: FRONT }; },
      under(ctx, I) {   // vệt sáng mờ từ trời rọi xuống
        const a = 0.1 + 0.05 * S(I.t * 5);
        additive(ctx, () => { ctx.fillStyle = `rgba(255,240,170,${a})`; ctx.fillRect(I.cx - 5, I.cy - 70, 10, 66); });
      },
      fx(ctx, I) {
        for (let i = 0; i < 2; i++) { const h = I.hand(i); if (Math.floor(I.t * 5 + i) % 2) twinkle(ctx, h.x + (i ? 2 : -1), h.y - 4, 2); }
      },
    },
    shush: {
      icon: 1.2,
      pose(t) {
        if (t < lead('shush')) return { run: true };
        return { arms: [[-3, 1, 1, 3], [2, 0, -5, -5]], eyes: 'closed', face: FRONT };
      },
      fx(ctx, I) {   // "suỵt": sóng nhỏ toả ra 2 bên miệng
        if (I.t < lead('shush')) return;
        const m = I.mouth;
        for (let i = 0; i < 3; i++) {
          const k = (I.t * 1.4 + i / 3) % 1;
          ctx.globalAlpha = 1 - k;
          for (const s of [-1, 1]) {
            const x = Math.round(m.x + s * (6 + k * 10)), y = Math.round(m.y - 2);
            px(ctx, x, y - 1, 1, 1, '#ffffff'); px(ctx, x + s, y, 1, 2, '#ffffff'); px(ctx, x, y + 2, 1, 1, '#ffffff');
          }
        }
        ctx.globalAlpha = 1;
      },
    },
    flex: {
      icon: 0.3,
      pose(t) {
        const pump = (t * 1.6) % 1 < 0.5 ? 1 : 0;
        return { arms: [[-5, -1 + pump, -4 - pump, -6], [5, -1 + pump, 4 + pump, -6]], eyes: pump ? 'closed' : 'happy', mouth: true, face: FRONT, drop: pump };
      },
      fx(ctx, I) {   // bắp tay loé sáng mỗi lần gồng
        const b = (I.t * 1.6) % 1;
        if (b > 0.25) return;
        for (let i = 0; i < 2; i++) { const e = I.elbow(i); twinkle(ctx, e.x + (i ? 3 : -3), e.y - 3, b < 0.12 ? 3 : 2); }
      },
    },
    bow: {
      icon: 0.5,
      pose(t) {
        const ph = t % 1.05, k = ph < 0.25 ? ph / 0.25 : ph < 0.6 ? 1 : ph < 0.8 ? 1 - (ph - 0.6) / 0.2 : 0;
        const turn = Math.floor(t / 1.05) % 3;
        return { face: [FRONT, 0.35, Math.PI - 0.35][turn], headDy: Math.round(k * 3), drop: Math.round(k), arms: [[-7, 1 - Math.round(k * 2)], [-5, 2]], eyes: k > 0.4 ? 'closed' : 'happy' };
      },
      fx(ctx, I) {   // hoa ném xuống sân
        for (let i = 0; i < 6; i++) {
          const k = (I.t * 0.55 + i / 6) % 1;
          ctx.globalAlpha = k > 0.85 ? (1 - k) / 0.15 : 1;
          const x = Math.round(I.x + (rnd(i) - 0.5) * 34 + S(I.t * 3 + i) * 3), y = Math.round(I.y - 44 + k * 44);
          px(ctx, x, y, 2, 2, i % 3 ? '#ff3d5a' : '#ff7ab8'); px(ctx, x + 1, y + 2, 1, 1, '#2f9a3a');
        }
        ctx.globalAlpha = 1;
      },
    },

    /* ---------- HIẾM ---------- */
    spinjump: {
      icon: 1.45,
      pose(t) {
        const L = lead('spinjump');
        if (t < L) return { run: true };
        const a = t - L;
        if (a < 0.55) { const k = a / 0.55; return { lift: Math.round(S(k * Math.PI) * 14), face: FRONT + ease(k) * TAU * 1.5, arms: [[-3, -2], [3, -2]], eyes: 'closed' }; }
        return { legs: 'split', drop: a < 0.65 ? 3 : 2, arms: [[-8, 3], [8, 3]], face: FRONT, mouth: true, eyes: 'closed' };
      },
      fx(ctx, I) {
        const a = I.t - lead('spinjump') - 0.55;
        if (a < 0) return;
        dust(ctx, I.x, I.y, a * 2, 10, 22);
        // tiếng hét: vòng sóng toả từ miệng
        const m = I.mouth;
        for (let i = 0; i < 3; i++) {
          const k = (a * 1.6 + i / 3) % 1;
          ctx.globalAlpha = (1 - k) * 0.9;
          ring(ctx, m.x, m.y - 2, 4 + k * 16, 2 + k * 9, '#fff6c0');
        }
        ctx.globalAlpha = 1;
      },
    },
    robot: {
      icon: 0.3,
      pose(t) {
        const P = [
          [[-6, 0, -6, -5], [6, 0, 6, 5]],
          [[-6, 0, -6, 5], [6, 0, 6, -5]],
          [[0, 4, 5, 4], [6, 0, 6, -5]],
          [[-6, 0, -6, -5], [0, 4, -5, 4]],
        ];
        const i = Math.floor(t * 4) % 4;
        return { arms: P[i], face: FRONT, headDy: i % 2, drop: i === 2 ? 1 : 0 };
      },
      fx(ctx, I) {   // khớp máy loé mỗi lần đổi tư thế
        if ((I.t * 4) % 1 > 0.2) return;
        for (let i = 0; i < 2; i++) { const e = I.elbow(i); px(ctx, Math.round(e.x), Math.round(e.y) - 1, 1, 1, '#3ff6ff'); px(ctx, Math.round(e.x) - 1, Math.round(e.y), 3, 1, '#3ff6ff'); }
      },
    },
    dab: {
      icon: 0.5,
      pose(t) {
        const s = Math.floor(t / 0.9) % 2 ? -1 : 1, a = t % 0.9;
        if (a < 0.08) return { arms: DOWN, face: FRONT };
        return { arms: s > 0 ? [[-8, -8], [-4, -5, -10, -8]] : [[4, -5, 10, -8], [8, -8]], headDy: 2, eyes: 'closed', face: FRONT };
      },
      fx(ctx, I) {   // vệt "vụt" lúc giật tay
        const a = I.t % 0.9;
        if (a < 0.08 || a > 0.22) return;
        const s = Math.floor(I.t / 0.9) % 2 ? -1 : 1, h = I.hand(s > 0 ? 0 : 1);
        for (let k = 1; k <= 3; k++) px(ctx, Math.round(h.x + s * k * 3), Math.round(h.y + k * 3), 2, 1, '#ffffff');
      },
    },
    phonecall: {
      icon: 1.0,
      pose(t) {
        if (t < lead('phonecall')) return { run: true };
        return { arms: [[-6, -5 + Math.round(S(t * 8) * 2)], [4, -2, 1, -8]], face: FRONT, mouth: Math.floor(t * 7) % 2 === 0, eyes: 'happy' };
      },
      fx(ctx, I) {
        if (I.t < lead('phonecall')) return;
        const h = I.hand(1);
        px(ctx, Math.round(h.x) + 1, Math.round(h.y) - 3, 3, 6, SP().OUT);   // điện thoại
        px(ctx, Math.round(h.x) + 2, Math.round(h.y) - 2, 1, 4, '#3ff6ff');
        const k = (I.t * 2.5) % 1;   // sóng gọi
        ctx.globalAlpha = 1 - k;
        for (let i = 0; i < 2; i++) { const x = Math.round(h.x + 6 + i * 3 + k * 3), y = Math.round(h.y - 3); px(ctx, x, y - 1 - i, 1, 1, '#ffe14f'); px(ctx, x + 1, y - i, 1, 3 + i * 2, '#ffe14f'); px(ctx, x, y + 3 + i, 1, 1, '#ffe14f'); }
        ctx.globalAlpha = 1;
      },
    },
    nap: {
      icon: 1.5,
      pose(t, p) {
        const k = ease(clamp01(t / 0.35)), s = p.id % 2 ? -1 : 1;
        return { rot: s * k * Math.PI / 2, lift: -Math.round(k * 6), arms: k > 0.8 ? [[4, 2], [-4, 2]] : DOWN, eyes: k > 0.5 ? 'closed' : null, face: FRONT };
      },
      fx(ctx, I) {   // Z Z Z bay lên từ đầu
        if (I.t < 0.5) return;
        const h = I.head;
        for (let i = 0; i < 3; i++) {
          const k = ((I.t - 0.5) * 0.7 + i / 3) % 1;
          ctx.globalAlpha = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;
          glyph(ctx, Z, h.x + 2 + k * 9 + S(k * 6) * 2, h.y - 6 - k * 18, '#c7ccd6');
        }
        ctx.globalAlpha = 1;
      },
    },

    /* ---------- SỬ THI ---------- */
    backflip: {
      icon: 0.62,
      pose(t) {
        const c = t % 1.5;
        if (c < 0.25) return { drop: 2, arms: [[-3, 3], [3, 3]], face: FRONT, eyes: 'closed' };   // ngồi lấy đà
        if (c < 0.95) { const k = (c - 0.25) / 0.7; return { lift: Math.round(S(k * Math.PI) * 18), rot: -ease(k) * TAU, arms: [[-4, -6], [4, -6]], drop: 2, face: FRONT, eyes: 'closed' }; }
        return { arms: [[-6, -8], [6, -8]], face: FRONT, eyes: 'happy', mouth: true, drop: c < 1.05 ? 2 : 0 };
      },
      fx(ctx, I) {
        const c = I.t % 1.5;
        if (c >= 0.95 && c < 1.3) dust(ctx, I.x, I.y, (c - 0.95) * 3, 6, 16);
        if (c < 0.3 || c > 0.95) return;
        const r0 = -ease((c - 0.25) / 0.7) * TAU;   // vệt cung theo chân
        additive(ctx, () => {
          for (let j = 1; j <= 7; j++) {
            const a = r0 + j * 0.22 + Math.PI;
            ctx.globalAlpha = 1 - j / 8;
            px(ctx, Math.round(I.cx - 11 * S(a)), Math.round(I.cy + 11 * Math.cos(a)), 2, 2, '#fff6c0');
          }
        });
        ctx.globalAlpha = 1;
      },
    },
    worm: {
      icon: 1.0,
      pose(t, p) {
        const s = sideOf(p), k = ease(clamp01(t / 0.35)), w = t > 0.35 ? S(t * 11) : 0;
        // nằm hẳn 90° (góc lẻ làm nhoè pixel) — sóng người = nhấp nhô lên xuống
        return { rot: s * k * Math.PI / 2, lift: -Math.round(k * 6) + Math.round(Math.max(0, w) * 3), arms: k > 0.5 ? [[2, 5 - Math.round(w * 2)], [-2, 5 + Math.round(w * 2)]] : DOWN, face: FRONT, mouth: w > 0.5 };
      },
      fx(ctx, I) { if (I.t > 0.35) dust(ctx, I.x - sideOf(I.p) * 8, I.y, ((I.t - 0.35) % 0.6) / 0.6, 4, 8); },
    },
    moonwalk: {
      icon: 0.9,
      pose(t, p) {
        const f = p.preview ? 0 : p.facing, hat = t % 1.6 > 1.15;
        return { run: true, face: f, arms: [[-3, 4], hat ? [-3, -10] : [2, 3]], mouth: hat, eyes: hat ? 'closed' : null };
      },
      under(ctx, I) {   // đèn sân khấu rọi dưới chân
        additive(ctx, () => SP().ellipse(ctx, I.x, I.y, 11, 4, `rgba(255,255,230,${0.16 + 0.05 * S(I.t * 8)})`));
      },
      fx(ctx, I) {
        for (let i = 0; i < 2; i++) {
          const k = (I.t * 0.8 + i / 2) % 1;
          ctx.globalAlpha = 1 - k;
          glyph(ctx, NOTE, I.cx + (i ? 6 : -10) + S(k * 7 + i) * 2, I.cy - 16 - k * 16, i ? '#ff7ab8' : '#3ff6ff');
        }
        ctx.globalAlpha = 1;
      },
    },
    makeitrain: {
      icon: 1.0,
      pose(t) {
        if (t < lead('makeitrain')) return { run: true };
        const flick = Math.floor(t * 8) % 2;
        return { arms: [[-2, 3, 2, 1], flick ? [6, -5] : [4, -1, 6, 0]], face: FRONT, eyes: 'happy', mouth: true };
      },
      fx(ctx, I) {
        const L = lead('makeitrain');
        if (I.t < L) return;
        const s = I.hand(0);   // xấp tiền trên tay trái
        px(ctx, Math.round(s.x) - 2, Math.round(s.y) - 3, 6, 4, SP().OUT); px(ctx, Math.round(s.x) - 1, Math.round(s.y) - 2, 4, 2, '#4fd16b');
        const h = I.hand(1);
        for (let i = 0; i < 18; i++) {
          const a = I.t - (L + i * 0.12);
          if (a < 0 || a > 1.5) continue;
          const dir = rnd(i) > 0.45 ? 1 : -1, sp = 0.5 + rnd(i, 1);
          const x = Math.round(h.x + dir * (6 + 26 * a) * sp + S(a * 10 + i) * 2);
          const y = Math.round(h.y - 16 * a + 22 * a * a);
          ctx.globalAlpha = a > 1.1 ? (1.5 - a) / 0.4 : 1;
          const flat = Math.floor(a * 8 + i) % 2;
          px(ctx, x - 1, y - 1, flat ? 5 : 4, flat ? 4 : 5, SP().OUT);
          px(ctx, x, y, flat ? 3 : 2, flat ? 2 : 3, '#4fd16b');
          px(ctx, x + (flat ? 1 : 0), y + (flat ? 0 : 1), 1, 1, '#c8ffd0');
        }
        ctx.globalAlpha = 1;
      },
    },

    /* ---------- HUYỀN THOẠI ---------- */
    firebreath: {
      icon: 1.2,
      pose(t) {
        if (t < 0.45) return { arms: [[-6, -4], [6, -4]], face: FRONT, eyes: 'closed', drop: t > 0.2 ? 1 : 0 };   // hít vào
        const sh = Math.round(S(t * 40) * 0.6);
        return { arms: [[-7, -7 + sh], [7, -7 - sh]], face: FRONT, mouth: true, eyes: 'closed', headDy: -1 };
      },
      fx(ctx, I) {
        const m = I.mouth;
        if (I.t < 0.45) { additive(ctx, () => SP().disc(ctx, m.x, m.y, 1 + Math.round(I.t * 6), 'rgba(255,170,60,0.55)')); return; }
        const COL = ['#fff6c0', '#ffe14f', '#ff9a3d', '#ff3d5a'];
        additive(ctx, () => {
          for (let i = 0; i < 26; i++) {
            const k = (I.t * 2.4 + i / 26) % 1, r = Math.max(1, Math.round(4 - k * 3));
            const x = m.x + (rnd(i) - 0.5) * (2 + k * 16) + S(I.t * 20 + i) * k * 2, y = m.y - 2 - k * 62;
            ctx.globalAlpha = 1 - k;
            px(ctx, Math.round(x - r / 2), Math.round(y - r / 2), r, r, COL[Math.min(3, Math.floor(k * 4))]);
          }
          ctx.globalAlpha = 1;
          SP().disc(ctx, m.x, m.y, 3, 'rgba(255,200,90,0.6)');
        });
      },
    },
    fireworks: {
      icon: 0.95,
      pose(t) {
        const k = Math.floor((t - 0.1) / 0.5), a = (t - 0.1) % 0.5, up = t > 0.1 && a < 0.25;
        return { arms: [up && k % 2 ? [-2, -10] : [-5, -2, -3, -5], up && !(k % 2) ? [2, -10] : [5, -2, 3, -5]], face: FRONT, eyes: 'up', mouth: up };
      },
      fx(ctx, I) {
        const COLS = ['#ff3d5a', '#3ff6ff', '#ffe14f', '#6bff4f', '#ff7ab8', '#9d7bff'];
        for (let k = 0; k < 6; k++) {
          const a = I.t - (0.1 + k * 0.5);
          if (a < 0 || a > 1.4) continue;
          const s = k % 2 ? -1 : 1, x0 = I.cx + s * 6, y0 = I.cy - 12;
          const hi = I.p.preview || I.p.icon ? 0.4 : 1;   // khung xem trước nhỏ: nổ thấp hơn
          const bx = x0 + s * (6 + rnd(k) * 12) * hi, by = y0 - (40 + rnd(k, 1) * 16) * hi, c = COLS[k % COLS.length];
          if (a < 0.38) {   // pháo bay lên
            const e = easeOut(a / 0.38), x = Math.round(x0 + (bx - x0) * e), y = Math.round(y0 + (by - y0) * e);
            px(ctx, x, y, 1, 3, '#ffffff');
            additive(ctx, () => { for (let j = 1; j < 4; j++) px(ctx, x + Math.round((rnd(k, j) - 0.5) * 2), y + 2 + j * 2, 1, 1, '#ff9a3d'); });
            continue;
          }
          const b = (a - 0.38) / 1.02;   // nổ: vòng tia + rơi dần
          additive(ctx, () => {
            if (b < 0.1) SP().disc(ctx, bx, by, 5, 'rgba(255,255,220,0.6)');
            ctx.globalAlpha = 1 - b;
            for (let j = 0; j < 14; j++) {
              const ang = (j / 14) * TAU + k, r = 3 + 20 * easeOut(Math.min(1, b * 1.6));
              px(ctx, Math.round(bx + Math.cos(ang) * r), Math.round(by + Math.sin(ang) * r * 0.8 + 12 * b * b), b < 0.5 ? 2 : 1, b < 0.5 ? 2 : 1, j % 3 ? c : '#ffffff');
            }
            ctx.globalAlpha = 1;
          });
        }
      },
    },
    levitate: {
      icon: 1.6,
      pose(t) {
        const k = ease(clamp01(t / 0.9));
        return { legs: 'cross', drop: 3, arms: [[-2, 5], [2, 5]], lift: Math.round(k * 11 + S(t * 3) * 1.5 * k), face: FRONT, eyes: 'closed' };
      },
      under(ctx, I) {
        const k = clamp01(I.t / 0.9);
        additive(ctx, () => {
          SP().disc(ctx, I.cx, I.cy, 11 + Math.round(S(I.t * 4)), `rgba(255,200,60,${0.22 * k})`);
          SP().disc(ctx, I.cx, I.cy, 6, `rgba(255,240,160,${0.18 * k})`);
        });
        // vòng phù chú dưới đất, chấm sáng chạy quanh
        ctx.globalAlpha = k;
        ring(ctx, I.x, I.y, 12, 4, '#ffe14f');
        for (let i = 0; i < 4; i++) { const a = I.t * 2 + (i / 4) * TAU; px(ctx, Math.round(I.x + Math.cos(a) * 12) - 1, Math.round(I.y + S(a) * 4) - 1, 3, 3, '#fff6c0'); }
        ctx.globalAlpha = 1;
      },
      fx(ctx, I) {
        additive(ctx, () => {
          for (let i = 0; i < 10; i++) {
            const k = (I.t * 0.8 + i / 10) % 1;
            ctx.globalAlpha = (1 - k) * clamp01(I.t / 0.6);
            px(ctx, Math.round(I.x + (rnd(i) - 0.5) * 28), Math.round(I.y - k * 40), 1, 2, '#ffe14f');
          }
          ctx.globalAlpha = 1;
        });
      },
    },

    /* ---------- THẦN THOẠI ---------- */
    ascend: {
      icon: 1.8,
      pose(t, p) {
        const k = ease(clamp01((t - 0.4) / 2.2));
        return { lift: Math.round(k * 24 + S(t * 2.5) * 1.2 * k), arms: [[-6, -3], [6, -3]], face: FRONT, eyes: 'closed', headDy: p.icon ? 0 : -Math.round(k) };
      },
      under(ctx, I) {
        // cột sáng từ trời
        const a = clamp01(I.t / 0.4), w = Math.round(5 + a * 8 + S(I.t * 6));
        additive(ctx, () => {
          ctx.fillStyle = `rgba(255,236,160,${0.16 * a})`; ctx.fillRect(I.x - w, I.y - 220, w * 2, 222);
          ctx.fillStyle = `rgba(255,255,230,${0.22 * a})`; ctx.fillRect(I.x - Math.round(w / 3), I.y - 220, Math.round(w / 3) * 2, 222);
        });
        // đôi cánh sau lưng: mở dần, vỗ nhẹ
        const wk = clamp01((I.t - 0.35) / 0.5);
        if (wk <= 0) return;
        const flap = S(I.t * 7) * 0.18, sh = I.local(0, I.P.drop || 0);
        for (const s of [-1, 1]) {
          for (let f = 0; f < 4; f++) {
            const ang = (-0.95 + f * 0.38 + flap) , len = (6 + f * 1.5) * wk;
            const x0 = sh.x + s * 4, y0 = sh.y - 1;
            for (let j = 0; j <= len; j++) {
              const x = Math.round(x0 + s * Math.cos(ang) * j), y = Math.round(y0 + Math.sin(ang) * j * 0.9);
              px(ctx, x - 1, y - 1, 3, 3, '#c7ccd6');
            }
          }
          for (let f = 0; f < 4; f++) {
            const ang = (-0.95 + f * 0.38 + flap), len = (6 + f * 1.5) * wk;
            for (let j = 0; j <= len; j++) px(ctx, Math.round(sh.x + s * 4 + s * Math.cos(ang) * j), Math.round(sh.y - 1 + Math.sin(ang) * j * 0.9), 1, 1, '#ffffff');
          }
        }
      },
      fx(ctx, I) {
        if (I.t > 0.6) {   // vòng hào quang trên đầu
          const h = I.head;
          ring(ctx, h.x, h.y - 9, 5, 1.5, '#ffe14f');
          additive(ctx, () => ring(ctx, h.x, h.y - 9, 6, 2, 'rgba(255,240,160,0.5)'));
        }
        for (let i = 0; i < 8; i++) {   // lông vũ rơi + lấp lánh
          const k = (I.t * 0.5 + i / 8) % 1;
          ctx.globalAlpha = clamp01(I.t - 0.5) * (1 - k);
          const x = Math.round(I.x + (rnd(i) - 0.5) * 36 + S(I.t * 3 + i) * 3), y = Math.round(I.cy - 30 + k * 40);
          if (i % 2) { px(ctx, x, y, 2, 1, '#ffffff'); px(ctx, x + 1, y + 1, 1, 1, '#c7ccd6'); } else twinkle(ctx, x, y, 1, '#fff6c0');
        }
        ctx.globalAlpha = 1;
      },
    },
  };

  const CelebrateDraw = {
    POSES,
    iconT(id) { return (POSES[id] || POSES.fistpump).icon || 0; },

    // vẽ cầu thủ p đang ăn mừng (p.celId, p.celT). Trả về y của đầu (Renderer vẽ mũi tên / VFX theo đó)
    draw(ctx, p, g) {
      const D = POSES[p.celId] || POSES.fistpump, t = p.celT || 0;
      const P = D.pose(t, p) || {};
      const lift = Math.round((P.lift || 0) * (p.icon ? 0.4 : 1)), rot = P.rot || 0, drop = P.drop || 0, hd = P.headDy || 0;
      const x = Math.round(p.x), y = Math.round(p.y), cx = x, cy = y - 8 - lift;
      const cos = Math.cos(rot), sin = Math.sin(rot);
      const n = Math.hypot(p.vx || 0, p.vy || 0);
      const I = {
        p, t, x, y, cx, cy, P,
        mv: n > 5 ? { x: p.vx / n, y: p.vy / n } : null,
        // điểm (lx, ly) trong hệ toạ độ của người (gốc ở hông, trước khi xoay) -> toạ độ sân
        local(lx, ly) { return { x: cx + lx * cos - ly * sin, y: cy + lx * sin + ly * cos }; },
        // bàn tay / khuỷu tay i (0 trái, 1 phải) theo P.arms
        hand(i) { const a = (P.arms || DOWN)[i] || DOWN[i]; return this.local((i ? 5 : -5) + a[a.length - 2], drop + a[a.length - 1]); },
        elbow(i) { const a = (P.arms || DOWN)[i] || DOWN[i]; return this.local((i ? 5 : -5) + a[0], drop + a[1]); },
      };
      I.head = I.local(0, -8 + drop + hd);
      I.mouth = I.local(0, -5 + drop + hd);
      const k = Math.max(0.4, 1 - Math.max(0, lift) / 50);
      SP().ellipse(ctx, x, y + 1, (rot ? 9 : 6) * k, 2.5 * k, 'rgba(0,0,0,0.38)');
      if (D.under) D.under(ctx, I);
      ctx.save();
      ctx.translate(cx, cy);
      if (rot) ctx.rotate(rot);
      SP().drawPlayer(ctx, Object.assign({}, p, {
        x: 0, y: 8, vx: P.run ? 40 : 0, vy: 0, facing: P.face != null ? P.face : p.facing,
        celPose: P, atkType: null, state: 'normal', keeper: false, charging: false,
      }), g, 0.999);
      ctx.restore();
      ctx.globalAlpha = 1;
      if (D.fx) D.fx(ctx, I);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      return Math.round(I.head.y);
    },
  };

  SFC.CelebrateDraw = CelebrateDraw;
})();
