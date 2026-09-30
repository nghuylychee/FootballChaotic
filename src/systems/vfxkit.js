/* VFX Kit — "viên gạch" hiệu ứng dùng chung cho Core (docs/CORE_DESIGN.md mục 2). Gắn thêm vào SFC.Effects.
 * - Mọi hàm chỉ nhận tham số nguyên thuỷ (số / chuỗi / id cầu thủ) -> host ghi lại và phát lại ở máy khách online (net/sync.js).
 * - Thế giới (world): chạy theo thời gian trận -> bị slow-mo / hit-stop ảnh hưởng (updateCosmetic).
 * - Lớp phủ màn hình (overlay): chạy theo thời gian thật, kể cả lúc đứng hình (updateOverlay).
 * Hit-stop / slow-mo nằm ở Game (hitStop / slowMo) vì chúng thay đổi mô phỏng.
 * Hình vẽ ở render/vfx.js.
 */
window.SFC = window.SFC || {};

(function () {
  const U = SFC.U;
  const E = SFC.Effects.prototype;

  // Tuỳ chọn hiệu ứng của người xem (lưu ở máy): giảm nháy = tắt impact frame / loé trắng
  const FXSettings = {
    reduceFlash: false,
    load() {
      const raw = SFC.Storage.getJSON('sfc_fx', {});
      if (raw && typeof raw === 'object') this.reduceFlash = !!raw.reduceFlash;
      return this;
    },
    save() {
      SFC.Storage.setJSON('sfc_fx', { reduceFlash: this.reduceFlash });
    },
  };
  SFC.FXSettings = FXSettings.load();

  const worldBlank = () => ({ waves: [], decals: [], arms: [], clones: [], shots: [], beams: [], vortexes: [], bolts: [], comics: [], shields: [], portals: [], netfires: [] });
  const overlayBlank = () => ({ zoom: null, impact: 0, impactCd: 0, lines: null, callouts: [], cutins: [], tints: [] });

  // trạng thái VFX (tạo lười, không cần sửa constructor)
  Object.defineProperty(E, 'V', {
    get() { return this._vw || (this._vw = worldBlank()); },
  });
  Object.defineProperty(E, 'O', {
    get() { return this._vo || (this._vo = overlayBlank()); },
  });

  const player = (fx, pid) => fx.g.players.find((p) => p.id === pid) || null;
  const snap = (p) => ({ team: p.team, role: p.role, look: p.look, facing: p.facing, anim: p.anim });

  /* ================= WORLD ================= */
  // SW — vòng sóng chấn lan từ (x, y) tới bán kính r (chỉ hình; lực hất do Core tự áp)
  E.wave = function (x, y, r, color = '#ffffff', t = 0.45, thick = 2) {
    this.V.waves.push({ x, y, r, color, t, max: t, thick });
  };

  // DC — dấu vết trên sân / tường: crack (nứt), crater (hố), scorch (cháy xém), skid (vết trượt), wallcrack (nứt tường)
  E.decal = function (kind, x, y, size = 1, t = 3, angle = 0) {
    const list = this.V.decals;
    list.push({ kind, x, y, size, t, max: t, angle, seed: Math.floor(Math.random() * 1e6) });
    if (list.length > 40) list.shift();
  };

  // LB — tay co giãn từ cầu thủ pid tới (tx, ty): vươn ra rồi bật về trong t giây; size = cỡ nắm đấm (Nắm Đấm Khổng Lồ)
  E.stretch = function (pid, tx, ty, t = 0.4, size = 1) {
    if (!player(this, pid)) return;
    this.V.arms.push({ pid, tx, ty, t, max: t, size });
  };

  // CL — phân thân (hình): bản sao của pid chạy theo (vx, vy) trong t giây, nổ khói lúc sinh ra / biến mất
  E.clone = function (pid, x, y, vx, vy, t = 2) {
    const p = player(this, pid);
    if (!p) return;
    this.V.clones.push(Object.assign(snap(p), { pid, x, y, vx, vy, t, max: t, facing: Math.hypot(vx, vy) > 1 ? Math.atan2(vy, vx) : p.facing }));
    this.burst(x, y, 6, '#d8d0e0', 12, 70, 0.5);
  };

  // phân thân của pid gần (x, y) bị chạm -> nổ khói biến mất
  E.popClone = function (pid, x, y) {
    let best = null, bd = 14;
    for (const c of this.V.clones) { const d = Math.hypot(c.x - x, c.y - y); if (c.pid === pid && c.t > 0.05 && d < bd) { bd = d; best = c; } }
    if (!best) return;
    best.t = 0.02;
    this.burst(best.x, best.y, 6, '#d8d0e0', 12, 80, 0.5);
  };

  // PJ — chiêu bay: wind (lưỡi gió trăng khuyết) · orb (quả cầu năng lượng)
  E.projectile = function (kind, x, y, vx, vy, t = 0.8, color = '') {
    this.V.shots.push({ kind, x, y, vx, vy, t, max: t, color });
  };

  // BM — luồng tia năng lượng từ (x, y) theo góc angle
  E.beam = function (x, y, angle, len, width, color = '#7fe7ff', t = 0.5) {
    this.V.beams.push({ x, y, angle, len, width, color, t, max: t });
  };

  // PL (hình) — xoáy lỗ đen tại (x, y); follow = 'ball' để bám theo bóng
  E.vortex = function (x, y, r, t = 1, follow = '') {
    this.V.vortexes.push({ x, y, r, t, max: t, follow });
  };

  // tia sét zigzag từ A tới B
  E.bolt = function (x0, y0, x1, y1, color = '#bdf4ff', t = 0.35) {
    const pts = [x0, y0];
    const n = Math.max(3, Math.round(Math.hypot(x1 - x0, y1 - y0) / 10));
    const nx = -(y1 - y0), ny = x1 - x0, nl = Math.hypot(nx, ny) || 1;
    for (let i = 1; i < n; i++) {
      const k = i / n, j = U.rand(-6, 6);
      pts.push(x0 + (x1 - x0) * k + (nx / nl) * j, y0 + (y1 - y0) * k + (ny / nl) * j);
    }
    pts.push(x1, y1);
    this.V.bolts.push({ pts, color, t, max: t });
  };

  // CO (world) — chữ comic lớn bật ra (POW / BAM / BOING...)
  E.comic = function (x, y, str, color = '#ffe14f', size = 1, t = 0.8) {
    const list = this.V.comics;
    list.push({ x, y, str, color, size, t, max: t, rot: U.rand(-0.18, 0.08) });
    if (list.length > 3) list.shift();
  };
  // khiên lục giác loé lên quanh (x, y) — chặn đòn (Giáp), khiên Aegis vỡ (shatter = 1: mảnh vỡ bay ra)
  E.shield = function (x, y, r = 12, color = '#c7ccd6', t = 0.4, shatter = 0) {
    this.V.shields.push({ x, y, r, color, t, max: t, shatter });
  };

  // cổng xoáy dẹt nằm trên tường trên / dưới tại (x, y)
  E.portal = function (x, y, t = 0.7, color = '#c63dff') {
    this.V.portals.push({ x, y, t, max: t, color });
  };

  // lưới khung thành bốc cháy: side = -1 (khung trái) / 1 (khung phải)
  E.netFire = function (side, t = 2.5) {
    this.V.netfires = [{ side, t, max: t }];
  };

  E.combo = function (x, y, n) { this.comic(x, y, n + ' HIT!', n >= 10 ? '#ff3d5a' : '#ffe14f', Math.min(1.6, 0.9 + n * 0.05), 0.6); };

  /* ================= OVERLAY (thời gian thật) ================= */
  // ZM — phóng to nhẹ vào (x, y) rồi trả về
  E.zoom = function (x, y, a = 0.15, t = 0.3) { this.O.zoom = { x, y, a, t, max: t }; };

  // IF — impact frame đen trắng (bỏ qua khi bật Giảm nháy; không lặp dày hơn 0.5s)
  E.impactFrame = function (t = 0.07) {
    const o = this.O;
    if (SFC.FXSettings.reduceFlash || o.impactCd > 0) return;
    o.impact = t; o.impactCd = 0.5;
  };

  // SL — tia tốc độ tập trung về (x, y) (toạ độ màn hình 640x360)
  E.speedLines = function (t = 0.5, x = 320, y = 180, color = '#ffffff') { this.O.lines = { t, max: t, x, y, color }; };

  // CO — tên chiêu chữ to chạy chéo màn hình
  E.callout = function (str, color = '#ffe14f', t = 1.1) {
    this.O.callouts = [{ str, color, t, max: t }];
  };

  // cut-in kiểu anime: dải ngang có chân dung lớn của cầu thủ + tên chiêu
  E.cutIn = function (pid, str, color = '#ffe14f', t = 0.8) {
    const p = player(this, pid);
    if (!p) return;
    this.O.cutins = [Object.assign(snap(p), { str, color, t, max: t })];
  };

  // phủ màu toàn màn hình (sepia, tím né hoàn hảo...)
  E.tint = function (color, t = 1, a = 0.25) { this.O.tints.push({ color, t, max: t, a }); };

  /* ================= UPDATE ================= */
  const baseClear = E.clearHazards;
  E.clearHazards = function () {
    baseClear.call(this);
    const V = this.V;
    V.arms.length = 0; V.clones.length = 0; V.shots.length = 0; V.beams.length = 0; V.vortexes.length = 0; V.bolts.length = 0;
  };

  const baseCosmetic = E.updateCosmetic;
  E.updateCosmetic = function (dt) {
    baseCosmetic.call(this, dt);
    const V = this.V, f = this.g.field;
    const tick = (list) => { for (const o of list) o.t -= dt; for (let i = list.length - 1; i >= 0; i--) if (list[i].t <= 0) list.splice(i, 1); };
    for (const c of V.clones) {
      c.x += c.vx * dt; c.y += c.vy * dt;
      c.vx = U.damp(c.vx, 0.6, dt); c.vy = U.damp(c.vy, 0.6, dt);
      if (c.x < f.x + 6 || c.x > f.x + f.w - 6) c.vx = -c.vx;
      if (c.y < f.y + 6 || c.y > f.y + f.h - 6) c.vy = -c.vy;
      c.x = U.clamp(c.x, f.x + 6, f.x + f.w - 6); c.y = U.clamp(c.y, f.y + 6, f.y + f.h - 6);
      c.anim += dt;
      if (c.t - dt <= 0) this.burst(c.x, c.y, 6, '#d8d0e0', 10, 60, 0.45);
    }
    for (const s of V.shots) { s.x += s.vx * dt; s.y += s.vy * dt; }
    for (const v of V.vortexes) if (v.follow === 'ball') { const b = this.g.ball; v.x = b.x; v.y = b.y - b.z; }
    for (const c of V.comics) c.y -= 10 * dt;
    [V.waves, V.decals, V.arms, V.clones, V.shots, V.beams, V.vortexes, V.bolts, V.comics, V.shields, V.portals, V.netfires].forEach(tick);
  };

  // lớp phủ chạy theo thời gian thật (Game.update gọi mỗi bước, kể cả lúc hit-stop)
  E.updateOverlay = function (dt) {
    const o = this.O;
    o.impactCd = Math.max(0, o.impactCd - dt);
    o.impact = Math.max(0, o.impact - dt);
    if (o.zoom && (o.zoom.t -= dt) <= 0) o.zoom = null;
    if (o.lines && (o.lines.t -= dt) <= 0) o.lines = null;
    for (const k of ['callouts', 'cutins', 'tints']) {
      for (const it of o[k]) it.t -= dt;
      o[k] = o[k].filter((it) => it.t > 0);
    }
  };
})();
