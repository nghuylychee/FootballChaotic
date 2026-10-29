/* LegendDraw — hình KHOẢNH KHẮC LEGEND của GOAT PATH (src/systems/legends.js, config/legends.config.js). Chỉ đọc trạng thái hiệu ứng
 * (Effects.legendAura / legendCut, có cả ở máy khách online qua sync.js), renderer.js gọi:
 *   under(ctx, g, p): bóng mờ huyền thoại to gấp rưỡi đứng sau lưng cầu thủ (màu của LEGEND, nhấp nháy nhẹ) + quầng sáng dưới chân
 *   overlay(ctx, g): cut-in LEGEND — dải chân dung trượt vào cạnh trái màn hình: chân dung pixel lớn + tên + danh hiệu. Không phủ tối
 *                    màn hình, không dừng trận (khác cut-in Tuyệt kỹ ở render/vfx.js)
 *   begin(ctx, g, p) / after(ctx, g, p): KỸ THUẬT LEGEND đang diễn trên người (Effects.legendTech): begin đặt biến đổi canvas quanh
 *                    sprite (lộn ngược, nằm trượt, xoay vòng, gồng...) — true = đã ctx.save(), renderer restore sau khi vẽ người; after vẽ
 *                    thêm hiệu ứng riêng (vệt má ngoài, tia tốc độ, bụi trượt...). flipping: bị xoạc bay lộn (renderer.airborne bỏ xoay riêng)
 *   ballTrail(ctx, g): vệt bóng của kỹ thuật (Effects.legendBall): cầu vồng · thiên thạch · cong màu LEGEND · lụa vàng · tia chớp
 * Tên LEGEND là tên riêng (không dịch); danh hiệu đã dịch tại chỗ (src/i18n/fields.js) -> mỗi máy hiện đúng ngôn ngữ của mình.
 */
window.SFC = window.SFC || {};

(function () {
  const SP = () => SFC.Sprites;
  const LG = () => SFC_CONFIG.legends.list;
  const latin1 = (s) => /^[\x00-\xFF]*$/.test(s);
  const font = (s, px) => {
    if (SFC.I18n.isCJK(s)) return `${Math.max(12, Math.round(px * 0.6))}px ${SFC.I18n.pxFont()}`;
    return latin1(s) ? `${Math.round(px * 0.55)}px ${SFC.I18n.pxFont()}` : `${px}px ${SFC.I18n.vtFont()}`;
  };
  function text(ctx, str, x, y, px, fill, lw = 4, align = 'left') {
    ctx.font = font(str, px);
    ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#140c16'; ctx.lineWidth = lw; ctx.strokeText(str, x, y);
    ctx.fillStyle = fill; ctx.fillText(str, x, y);
  }
  // ngoại hình LEGEND (như đồng đội của run: ghép lên ngoại hình mặc định)
  const lookOf = (L) => SFC.Profile.lookOf(Object.assign({}, SFC_CONFIG.progression.defaultLook, L.look));

  const ease = (k) => 1 - (1 - k) * (1 - k);
  const RAINBOW = ['#ff3d5a', '#ff9a3d', '#ffe14f', '#6bff4f', '#3ff6ff', '#6f8bff', '#c77bff'];
  const anim = (g, p) => { const M = g.effects.V.legtech; return M && M[p.id]; };
  const colorOf = (g, p) => { const L = p.legend && LG()[p.legend]; return L ? L.color : '#ffffff'; };

  const LegendDraw = {
    lookOf,
    flipping(g, p) { const a = anim(g, p); return !!a && a.id === 'flip'; },
    // biến đổi canvas quanh sprite theo kỹ thuật đang diễn (k = 0 -> 1 trong thời gian diễn). true = đã save
    begin(ctx, g, p) {
      const a = anim(g, p);
      if (!a) return false;
      const k = a.id === 'engine' ? 0 : 1 - a.t / a.max, dir = Math.cos(p.facing || 0) >= 0 ? 1 : -1;
      const cx = p.x, cy = p.y - 8 - (p.airZ || 0);
      ctx.save();
      ctx.translate(cx, cy);
      switch (a.id) {
        case 'power': {   // gồng thân ra sau rồi bung về trước, người phình to lúc đá
          const w = k < 0.25 ? -k / 0.25 : Math.max(0, 1 - (k - 0.25) / 0.5);
          ctx.rotate(dir * (k < 0.25 ? -0.35 * (k / 0.25) : 0.3 * w));
          const sc = 1 + 0.25 * Math.sin(Math.min(1, k / 0.5) * Math.PI);
          ctx.scale(sc, sc);
          break;
        }
        case 'trivela': ctx.rotate(dir * -0.32 * Math.sin(k * Math.PI)); ctx.translate(dir * 2 * Math.sin(k * Math.PI), 0); break;   // nghiêng người, chân quét má ngoài
        case 'finesse': ctx.rotate(dir * ease(Math.min(1, k / 0.6)) * Math.PI * 2); break;                                   // xoay người 1 vòng như vũ công
        case 'rainbow': ctx.translate(0, -Math.sin(k * Math.PI) * 9); ctx.rotate(-dir * 0.45 * Math.sin(k * Math.PI)); break;     // bật nhảy ngửa ra sau, gót hất bóng
        case 'bicycle': {   // bay lên, lộn ngửa đầu chúc xuống lúc chạm bóng, rồi xoay tiếp cho tròn vòng khi rơi
          ctx.translate(0, -Math.sin(k * Math.PI) * 22);
          ctx.rotate(-dir * Math.PI * 2 * ease(k));
          break;
        }
        case 'engine': ctx.rotate(dir * 0.22); ctx.translate((g.time * 60) % 2 > 1 ? 1 : 0, 0); break;                              // chúi người lao như máy
        case 'slide': ctx.translate(0, 6); ctx.rotate(dir * Math.PI / 2); break;                                                   // nằm xuống trượt
        case 'flip': ctx.rotate(dir * Math.PI * 2 * 3 * ease(k)); break;                                                           // bị xoạc: lộn đúng 3 vòng
        case 'sweeper': ctx.translate(0, -Math.sin(k * Math.PI) * 10); ctx.rotate(dir * Math.PI * 2 * ease(k)); break;            // bật lên xoay 1 vòng
        case 'lobthrough': { const sc = 1 + 0.15 * Math.sin(k * Math.PI); ctx.scale(sc, sc); break; }                              // ưỡn người như nhạc trưởng
        case 'toepoke': ctx.translate(dir * 4 * Math.sin(k * Math.PI), 0); break;                                                  // chọc mũi giày tới trước
        case 'bruiser': ctx.rotate(dir * 0.4 * Math.sin(k * Math.PI)); ctx.scale(1 + 0.18 * Math.sin(k * Math.PI), 1); break;       // vai xô, chỏ giật ngang
      }
      ctx.translate(-cx, -cy);
      return true;
    },
    // hiệu ứng thêm sau khi vẽ người (toạ độ sân)
    after(ctx, g, p) {
      const a = anim(g, p);
      if (!a || a.id === 'flip') return;
      const c = colorOf(g, p), k = a.id === 'engine' ? 0 : 1 - a.t / a.max, dir = Math.cos(p.facing || 0) >= 0 ? 1 : -1, t = g.time;
      const fx = Math.cos(p.facing || 0), fy = Math.sin(p.facing || 0);
      ctx.save();
      if (a.id === 'trivela' || a.id === 'finesse') {
        // vệt quét của chân: cung sáng màu LEGEND (trivela: quét ra ngoài má ngoài · finesse: vòng tròn quanh người khi xoay)
        ctx.globalAlpha = 0.85 * (1 - k);
        ctx.strokeStyle = c; ctx.lineWidth = 2;
        ctx.beginPath();
        if (a.id === 'trivela') ctx.arc(p.x + fx * 6, p.y - 2, 10, p.facing - dir * 1.8, p.facing + dir * 0.6, dir < 0);
        else ctx.arc(p.x, p.y - 8, 13, 0, Math.PI * 2 * Math.min(1, k / 0.6));
        ctx.stroke();
      } else if (a.id === 'power') {
        // vòng sóng dưới chân + tia bùng phía trước
        ctx.globalAlpha = 0.7 * (1 - k);
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(p.x, p.y + 1, 8 + k * 26, 3 + k * 9, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = c;
        for (let i = 0; i < 5; i++) { const an = p.facing + (i - 2) * 0.25; ctx.fillRect(p.x + Math.cos(an) * (10 + k * 30), p.y - 6 + Math.sin(an) * (6 + k * 16), 3, 2); }
      } else if (a.id === 'engine') {
        // tia tốc độ phía sau + khói động cơ phụt ra
        ctx.globalAlpha = 0.7; ctx.fillStyle = c;
        for (let i = 0; i < 4; i++) ctx.fillRect(Math.round(p.x - fx * (12 + i * 5) + (i - 1.5) * fy * 5), Math.round(p.y - 8 - fy * (12 + i * 5) - (i - 1.5) * fx * 4), 6 - i, 1);
        ctx.globalAlpha = 0.45; ctx.fillStyle = '#c7ccd6';
        for (let i = 0; i < 3; i++) { const ph = (t * 6 + i / 3) % 1; ctx.beginPath(); ctx.arc(p.x - fx * (6 + ph * 14), p.y - fy * (6 + ph * 14), 1.5 + ph * 3, 0, Math.PI * 2); ctx.fill(); }
      } else if (a.id === 'slide') {
        // bụi cỏ tung sau lưng lúc trượt
        ctx.globalAlpha = 0.6 * (1 - k); ctx.fillStyle = '#d8c8a0';
        for (let i = 0; i < 6; i++) { const r = ((i * 37) % 10) - 5; ctx.fillRect(Math.round(p.x - fx * (6 + i * 4) + r * fy), Math.round(p.y - fy * (6 + i * 4) - r * fx), 2, 2); }
      } else if (a.id === 'bruiser') {
        // sóng va chạm hình cung 2 bên vai
        ctx.globalAlpha = 0.8 * (1 - k); ctx.strokeStyle = c; ctx.lineWidth = 2;
        for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(p.x - fy * s * 6, p.y - 10 + fx * s * 3, 6 + k * 16, 0, Math.PI * 2); ctx.stroke(); }
      } else if (a.id === 'sweeper' || a.id === 'lobthrough' || a.id === 'rainbow' || a.id === 'bicycle' || a.id === 'toepoke') {
        // vòng sáng màu LEGEND quanh người lúc ra kỹ thuật
        ctx.globalAlpha = 0.6 * (1 - k); ctx.strokeStyle = c; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(p.x, p.y - 10, 10 + k * 14, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    },
    // vệt bóng của kỹ thuật vừa ra: ghi lại toạ độ bóng mỗi khung, vẽ dải theo kiểu kỹ thuật
    ballTrail(ctx, g) {
      const B = g.effects.V.legball, b = g.ball;
      if (!B) return;
      const pts = B.pts, last = pts[pts.length - 1], y = b.y - (b.z || 0);
      if (!last || Math.hypot(last.x - b.x, last.y - y) > 1.5) { pts.push({ x: b.x, y }); if (pts.length > 26) pts.shift(); }
      if (pts.length < 2) return;
      const fade = Math.min(1, B.t / (B.max * 0.4)), id = B.id, owner = b.lastTouch, c = owner ? colorOf(g, owner) : '#ffe14f';
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const path = (off = 0) => { ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y + off) : ctx.moveTo(q.x, q.y + off))); ctx.stroke(); };
      if (id === 'rainbow') {
        ctx.lineWidth = 1.2;
        RAINBOW.forEach((col, i) => { ctx.globalAlpha = 0.85 * fade; ctx.strokeStyle = col; path((i - 3) * 1.3); });
      } else if (id === 'power') {
        ctx.globalAlpha = 0.5 * fade; ctx.strokeStyle = '#ff9a3d'; ctx.lineWidth = 6; path();
        ctx.globalAlpha = 0.9 * fade; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; path();
      } else if (id === 'bicycle') {
        // tia chớp: đoạn gãy khúc dọc đường bóng
        ctx.globalAlpha = 0.9 * fade; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
        ctx.beginPath(); pts.forEach((q, i) => { const j = i % 2 ? 3 : -3; i ? ctx.lineTo(q.x, q.y + j) : ctx.moveTo(q.x, q.y); }); ctx.stroke();
        ctx.globalAlpha = 0.4 * fade; ctx.strokeStyle = c; ctx.lineWidth = 4; path();
      } else if (id === 'lobthrough') {
        ctx.globalAlpha = 0.55 * fade; ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3; path();
        ctx.globalAlpha = 0.9 * fade; ctx.strokeStyle = '#fff6c8'; ctx.lineWidth = 1; path();
      } else {
        // finesse / trivela / toe poke: vệt màu LEGEND + lấp lánh
        ctx.globalAlpha = 0.6 * fade; ctx.strokeStyle = c; ctx.lineWidth = id === 'toepoke' ? 2 : 3; path();
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < pts.length; i += 4) { ctx.globalAlpha = fade * (0.4 + 0.6 * ((i + Math.floor(g.time * 20)) % 2)); ctx.fillRect(Math.round(pts[i].x) - 1, Math.round(pts[i].y) - 1, 2, 2); }
      }
      ctx.restore();
    },
    under(ctx, g, p) {
      const list = g.effects.V.legauras;
      if (!list || !list.length) return;
      const a = list.find((x) => x.pid === p.id), L = a && LG()[a.id];
      if (!L) return;
      const t = g.time, k = Math.min(1, (a.max - a.t) * 5, a.t * 2), s = 1.6;
      // quầng sáng dưới chân
      ctx.globalAlpha = 0.35 * k;
      ctx.fillStyle = L.color;
      ctx.beginPath(); ctx.ellipse(p.x, p.y + 1, 15, 6, 0, 0, Math.PI * 2); ctx.fill();
      // bóng huyền thoại: đứng chếch sau lưng, to hơn — viền sáng màu LEGEND (bóng đặc to hơn chút) + chính LEGEND mờ bên trong
      // (thấy được tóc / mặt để nhận ra là ai), nhấp nháy nhẹ
      const bx = p.x - Math.cos(p.facing || 0) * 6, by = p.y - 4;
      const ghost = (sc, alpha, tint) => {
        ctx.save();
        ctx.translate(bx, by); ctx.scale(sc, sc); ctx.translate(-bx, -by);
        SP().drawPlayer(ctx, { x: bx, y: by, vx: 0, vy: 0, facing: p.facing || 0, anim: t, state: 'normal', flash: 0, team: p.team, role: p.role, look: lookOf(L) }, g, alpha, tint);
        ctx.restore();
      };
      const pulse = 0.5 + 0.5 * Math.sin(t * 7);
      ghost(s + 0.12, (0.4 + 0.15 * pulse) * k, L.color);
      ghost(s, (0.45 + 0.1 * pulse) * k, null);
      ctx.globalAlpha = 1;
    },

    overlay(ctx, g) {
      const cuts = g.effects.O.legcuts;
      if (!cuts || !cuts.length || g.preview) return;
      for (const c of cuts) {
        const L = LG()[c.id];
        if (!L) continue;
        const k = 1 - c.t / c.max;
        const slide = k < 0.12 ? 1 - k / 0.12 : k > 0.86 ? (k - 0.86) / 0.14 : 0;
        const wb = 292, hb = 74, yb = 92, off = -slide * (wb + 30);
        ctx.save();
        ctx.translate(off, 0);
        // dải xiên: viền màu LEGEND + nền tối
        const band = (x0, y0, w, h, col) => {
          ctx.fillStyle = col;
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + w, y0); ctx.lineTo(x0 + w - 22, y0 + h); ctx.lineTo(x0, y0 + h); ctx.closePath(); ctx.fill();
        };
        band(0, yb - 3, wb + 4, hb + 6, L.color);
        band(0, yb, wb, hb, '#140c16');
        // sọc tốc độ trong dải
        ctx.save();
        ctx.beginPath(); ctx.moveTo(0, yb); ctx.lineTo(wb, yb); ctx.lineTo(wb - 22, yb + hb); ctx.lineTo(0, yb + hb); ctx.closePath(); ctx.clip();
        const now = performance.now() / 1000;
        ctx.globalAlpha = 0.3;
        for (let i = 0; i < 10; i++) { ctx.fillStyle = i % 2 ? L.color : '#ffffff'; ctx.fillRect(((now * 700 + i * 83) % (wb + 160)) - 80, yb + 5 + i * 7, 40 + (i * 29) % 70, 1); }
        ctx.globalAlpha = 1;
        // chân dung pixel lớn (áo đội của người đeo)
        ctx.translate(52, yb + hb + 34); ctx.scale(4, 4);
        SP().drawPlayer(ctx, { x: 0, y: 0, vx: 0, vy: 0, facing: 0, anim: 0.3, state: 'normal', flash: 0, team: c.team, role: c.role, look: lookOf(L) }, g, 0.999);
        ctx.restore();
        // chữ: LEGEND · danh hiệu (to, màu LEGEND) · tên
        text(ctx, SFC.t('LEGEND'), 104, yb + 13, 11, '#ffe14f', 3);
        let fs = 30;
        ctx.font = font(L.title, fs);
        while (fs > 14 && ctx.measureText(L.title).width > wb - 130) ctx.font = font(L.title, (fs -= 2));
        text(ctx, L.title, 104, yb + 37, fs, L.color, 5);
        text(ctx, L.name, 104, yb + 60, 12, '#ffffff', 3);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    },
  };

  SFC.LegendDraw = LegendDraw;
})();
