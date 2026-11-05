/* SỰ KIỆN ??? KỂ BẰNG CẢNH PIXEL (UX màn hình, owner 2026-11-05: "mỗi sự kiện 1 cách diễn riêng, làm hình theo đề xuất rồi t góp ý";
 * cách diễn từng sự kiện + nguyên tắc chung: docs/ux-screens/screens/event-scenes.json). Khung 640x360 như KIT VAN: canvas 320x180 phóng x2
 * (chỉ hình: màu cứng, viền mực, không gradient / glow) + DOM (mọi chữ, dịch được): dải chú thích trên cùng · nút lựa chọn góc dưới phải, mỗi
 * nút ghi cái được / mất bằng chip (rủi ro luôn đỏ, không bao giờ trông như phần thưởng) · sau khi chọn: thẻ kết quả tới CONTINUE.
 * RunUI dựng phần DOM (mục chọn, phiếu co-op, tiền) và gọi EvScene.html / bind; sự kiện chưa có cảnh thì RunUI dùng thẻ cũ.
 * Mỗi sự kiện 1 file src/ui/evscenes/<id>.js: EvScene.add(id, { paint(k), draw(k, s), dom?(s) })
 *   paint(k): vẽ 1 lần lên canvas nền mỗi lần mở cảnh · draw(k, s): vẽ mỗi khung lên canvas chính (nền đã chép sẵn)
 *   k = bộ vẽ gắn với canvas đang vẽ (dưới: P, d, dc, ln, street, avatar, icon, look...) · s = trạng thái (EvScene.state):
 *   { t: giây từ lúc mở cảnh, tp: giây từ lúc vào pha hiện tại (kết quả chạy từ 0), phase: 'choose' | 'result', hover: lựa chọn đang trỏ (-1 = không), pick: lựa chọn đã bấm, res: kết quả của Run
 *     ([{ kind: badge | cash | injury | blocked | heal | lost, ... }]), team: [{ look, name, inj: [id badge chấn thương], you }], E: cấu hình sự kiện,
 *     cash, can: [lựa chọn làm được] }
 *   dom(s): HTML thêm vào cảnh (tuỳ chọn, vd thẻ tên), toạ độ px trong khung 640x360 */
(function () {
  const LW = 320, LH = 180, O = '#120c16';
  const hsh = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const scenes = {};
  let cv = null, L = null, bg = null, raf = 0, last = 0, T = 0, id = null, visit = null, stateFn = null, buf = null, phase = null, phaseAt = 0;
  const ICON = {};

  // icon pixel 12x12 của PixelIcon + viền mực 1 pixel -> canvas 14x14 (như thẻ hàng KIT VAN)
  function grid(key, depth = 0) {
    const a = SFC.PixelIcon.ART[key];
    if (!a || depth > 4) return null;
    if (Array.isArray(a)) return a;
    const b = grid(a.ref, depth + 1);
    return !b || !a.map ? b : b.map((r) => r.replace(/./g, (ch) => a.map[ch] || ch));
  }
  function iconCv(key) {
    if (ICON[key]) return ICON[key];
    const rows = grid(key) || grid('ui-card'), c = document.createElement('canvas');
    c.width = 14; c.height = 14;
    const x = c.getContext('2d'), on = (i, j) => i >= 0 && j >= 0 && i < 12 && j < 12 && rows[i][j] !== '.';
    for (let i = -1; i <= 12; i++) for (let j = -1; j <= 12; j++) {
      if (on(i, j)) { x.fillStyle = SFC.PixelIcon.PAL[rows[i][j]] || '#f0f'; x.fillRect(j + 1, i + 1, 1, 1); }
      else if (on(i - 1, j) || on(i + 1, j) || on(i, j - 1) || on(i, j + 1)) { x.fillStyle = O; x.fillRect(j + 1, i + 1, 1, 1); }
    }
    return (ICON[key] = c);
  }

  // bộ vẽ dùng chung, gắn với 1 canvas (X). Mọi toạ độ là pixel của khung 320x180
  function kit(X) {
    const P = (x, y, w, h, c) => { X.fillStyle = c; X.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
    const k = {
      X, O, LW, LH, hsh, T: () => T,
      P,
      // hàng chấm xen kẽ (dither) từ x0 tới x1 ở dòng y: chuyển màu không dùng gradient
      d(x0, y, x1, c, every = 2) { X.fillStyle = c; for (let x = x0 + ((y + x0) % every); x < x1; x += every) X.fillRect(x, y, 1, 1); },
      // hình tròn đặc
      dc(cx, cy, r, c) { for (let y = -r; y <= r; y++) { const h = Math.round(Math.sqrt(r * r - y * y)); P(cx - h, cy + y, h * 2 + 1, 1, c); } },
      // đoạn thẳng 1 pixel (Bresenham): dây, cán, nét bút
      ln(x0, y0, x1, y1, c) {
        x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
        const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
        let e = dx + dy;
        for (;;) { P(x0, y0, 1, 1, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
      },
      // khung chữ nhật viền mực: nền c, gờ sáng trên hi, gờ tối dưới lo
      box(x, y, w, h, c, hi, lo) { P(x, y, w, h, O); P(x + 1, y + 1, w - 2, h - 2, c); if (hi) P(x + 1, y + 1, w - 2, 1, hi); if (lo) P(x + 1, y + h - 2, w - 2, 1, lo); },
      // icon PixelIcon ('ui-coin', 'arch-iron'...) có viền mực, phóng s lần (14s x 14s)
      icon(key, x, y, s = 1) { X.imageSmoothingEnabled = false; X.drawImage(iconCv(key), Math.round(x), Math.round(y), 14 * s, 14 * s); },
      // ngoại hình NPC từ vài nét (tóc, mặt, da...) chồng lên ngoại hình mặc định
      look(o) { return SFC.Profile.lookOf(Object.assign({}, SFC_CONFIG.progression.defaultLook, o)); },
      // áo đội của người chơi (cậu fan mặc đúng áo này)
      kitHome() { return SFC_CONFIG.mainPath.playerTeam.kit; },
      // nhân vật pixel 1x (khung 40x44, chân ở đáy khung): x, y = góc trên trái khung · o: { kit, facing (rad, PI/2 = nhìn ra), t (nhịp thở / chạy),
      //   extra (tham số thêm của drawAvatar, vd { inj } = băng quấn đúng chỗ chấn thương) }
      avatar(lk, x, y, o = {}) {
        buf = buf || Object.assign(document.createElement('canvas'), { width: 40, height: 44 });
        SFC.Sprites.drawAvatar(buf, lk, o.kit || k.kitHome(), o.t != null ? o.t : T, o.facing != null ? o.facing : Math.PI / 2, o.extra || null, true);
        X.drawImage(buf, Math.round(x), Math.round(y));
      },
      // nền lề đường chung (4 cảnh ngoài trời: hàng rong, cá cược, physio, fan) — cùng bảng màu chiều tà với KIT VAN: trời sọc dither, mặt trời
      // sọc retro, phố xa 2 lớp cửa sổ sáng, vỉa hè + bó vỉa (y 118-136), đường nhựa (y 137-180). o: { sun: false, lamp: x cột đèn | null, ground: y mép vỉa hè }
      street(o = {}) {
        const sky = ['#1e1430', '#2c1a3e', '#43224a', '#62294e', '#8a3450', '#b8484e', '#de6a4c', '#f29256'];
        sky.forEach((c, i) => { const a = i * 15, b = (i + 1) * 15; P(0, a, LW, b - a, c); if (i < sky.length - 1) { k.d(0, b - 1, LW, sky[i + 1]); k.d(0, b - 2, LW, sky[i + 1], 4); } });
        if (o.sun !== false) { k.dc(64, 100, 20, '#ffb060'); k.dc(64, 100, 16, '#ffd27a'); [94, 101, 107, 112].forEach((y, j) => P(40, y, 48, 1 + j, '#de6a4c')); }
        for (let i = 0; i < 26; i++) P(Math.floor(hsh(i) * LW), Math.floor(hsh(i + 50) * 40), 1, 1, hsh(i + 9) > 0.5 ? '#f4e8ff' : '#9a86c0');
        for (let x = 0, j = 0; x < LW; j++) { const w = 14 + Math.floor(hsh(j + 13) * 22), h = 22 + Math.floor(hsh(j + 17) * 34); P(x, 118 - h, w, h, '#3a2040'); x += w; }
        for (let x = -6, j = 0; x < LW; j++) {
          const w = 18 + Math.floor(hsh(j + 41) * 26), h = 14 + Math.floor(hsh(j + 27) * 30), top = 118 - h;
          P(x, top, w, h, '#24142c'); P(x, top, w, 1, '#3e2448');
          for (let yy = top + 4; yy < 114; yy += 5) for (let xx = x + 3; xx < x + w - 2; xx += 4) if (hsh(xx * 1.7 + yy * 5.3) > 0.62) P(xx, yy, 2, 2, hsh(xx + yy * 2) > 0.3 ? '#ffcf6a' : '#a8603a');
          if (hsh(j + 77) > 0.7) { P(x + 4, top - 8, 1, 8, '#24142c'); P(x + 3, top - 9, 3, 1, '#ff3d5a'); }
          x += w + 2;
        }
        if (o.lamp != null) {
          const lx = o.lamp;
          P(lx, 40, 3, 92, '#1a1020'); P(lx - 10, 38, 14, 3, '#1a1020'); P(lx - 10, 41, 6, 2, '#fff3a8');
          for (let y = 43; y < 60; y++) k.d(lx - 16 - (y - 43) / 2, y, lx + 2 + (y - 43) / 2, 'rgba(255,243,168,0.35)', 3);
        }
        P(0, 118, LW, 15, '#6a5a6c'); P(0, 118, LW, 1, '#8e7e90');
        for (let x = 6; x < LW; x += 18) P(x, 119, 1, 14, '#544656');
        k.d(0, 131, LW, '#544656');
        P(0, 133, LW, 3, '#9a8a9c'); P(0, 136, LW, 1, '#2a2030');
        P(0, 137, LW, 43, '#2c2632');
        for (let y = 139; y < LH; y += 3) k.d(0, y, LW, '#352e3c', 4);
        for (let x = 10; x < LW; x += 40) P(x, 170, 18, 2, '#c8b890');
      },
      // bóng đổ hình bầu dục dưới chân (dither) tại tâm cx, đáy y, rộng w
      shadow(cx, y, w) { for (let j = 0; j < 3; j++) { const h = Math.round(w / 2 - j * 2); k.d(cx - h, y + j, cx + h, '#0e0a12', j ? 2 : 1); } },
    };
    return k;
  }

  function frame(now) {
    if (!cv || !cv.isConnected) { raf = 0; cv = null; return; }
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now; T += dt;
    const sc = scenes[id];
    L.imageSmoothingEnabled = false;
    L.drawImage(bg, 0, 0);
    if (sc && sc.draw) sc.draw(kit(L), EvScene.state());
    raf = requestAnimationFrame(frame);
  }

  const EvScene = {
    add(eid, def) { scenes[eid] = def; },
    has(eid) { return !!scenes[eid]; },
    // s.tp = giây từ lúc vào pha hiện tại (chọn / kết quả): hoạt cảnh kết quả chạy từ 0
    state() {
      const s = Object.assign({ t: T }, stateFn ? stateFn() : {});
      if (s.phase !== phase) { phase = s.phase; phaseAt = T; }
      s.tp = T - phaseAt;
      return s;
    },
    // khung DOM. o: { id, title, text, cash (html), choose (html nút lựa chọn) | res: { head, rows (html), foot (html) }, state () => s }
    html(o) {
      const sc = scenes[o.id] || {}, s = Object.assign({ t: T }, o.state ? o.state() : {});
      const esc = SFC.UIHelpers.esc;
      return `<div class="rm-actcard ev-wrap"><div class="ev-page" data-ev="${esc(o.id)}">
          <canvas class="ev-lo" width="${LW}" height="${LH}"></canvas>${sc.dom ? sc.dom(s) : ''}
          <div class="ev-cap"><b>${esc(o.title)}</b><p>${esc(o.text)}</p></div>
          <div class="ev-cash">${o.cash || ''}</div>
          ${o.res ? `<div class="ev-res"><b>${esc(o.res.head)}</b><div class="ev-rows">${o.res.rows}</div>${o.res.foot}</div>` : `<div class="ev-pick ch">${o.choose}</div>`}
        </div></div>`;
    },
    // sau khi vẽ DOM: vẽ nền 1 lần (đổi sự kiện / lần mở mới) rồi chạy vòng vẽ; state() đọc trạng thái mới nhất từ RunUI mỗi khung
    bind(root, eid, state, key) {
      const el = root.querySelector('.ev-page canvas.ev-lo');
      if (!el) return;
      stateFn = state;
      if (eid !== id || key !== visit || !bg) {
        id = eid; visit = key; T = 0; phase = null;
        bg = Object.assign(document.createElement('canvas'), { width: LW, height: LH });
        const sc = scenes[eid];
        if (sc && sc.paint) sc.paint(kit(bg.getContext('2d')));
      }
      cv = el; L = cv.getContext('2d');
      if (!raf) { last = 0; raf = requestAnimationFrame(frame); }
    },
  };

  SFC.EvScene = EvScene;
})();
