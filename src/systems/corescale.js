/* CoreScale — Core scale theo chỉ số character (số liệu: cores.config.js -> statScale, archetypes[].stat, list[].scale).
 * Mỗi Core gắn với chỉ số của trường phái (Core cầu nối: trung bình 2 chỉ số, Hỗn loạn: OVR). Rating min..anchor..max ->
 *   độ mạnh power[0]..power[1]..power[2] · hồi chiêu cooldown[0]..cooldown[1]..cooldown[2] (nội suy tuyến tính từng đoạn).
 * list[id].scale: { tênParam: kiểu, 'm.tênMod': kiểu } — kiểu: pow (x độ mạnh) · mul (phần thưởng của hệ số: 1 + (v - 1) x độ mạnh) ·
 *   cd (x hồi chiêu). Không khai báo = giữ nguyên (số đếm, ngưỡng, hình ảnh, điểm trừ).
 * Mô tả Core: {tên} = số đã nhân · {tên%} = v x 100 · {tên+%} = (v - 1) x 100 · {tên-%} = (1 - v) x 100 — tô xanh / đỏ khi hơn / kém mức gốc.
 * Rating của 1 cầu thủ lấy từ Player.stats: rating = attrs.scale x trung bình các hệ số mà chỉ số đó điều khiển (progression.attrs.list[].keys).
 */
window.SFC = window.SFC || {};

(function () {
  const DEF = () => SFC_CONFIG.cores;
  const ATTR = () => SFC_CONFIG.progression.attrs;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  // nội suy từng đoạn: min -> anchor -> max
  function curve(r, [lo, mid, hi]) {
    const C = DEF().statScale;
    if (r <= C.anchor) return lo + (mid - lo) * clamp01((r - C.min) / (C.anchor - C.min));
    return mid + (hi - mid) * clamp01((r - C.anchor) / (C.max - C.anchor));
  }

  function scaleVal(kind, v, P, Cd) {
    if (kind === 'pow') return v * P;
    if (kind === 'mul') return Math.max(0.05, 1 + (v - 1) * P);
    if (kind === 'cd') return v * Cd;
    return v;
  }

  // số hiển thị: >= 10 làm tròn số nguyên, >= 1 một chữ số thập phân, < 1 hai chữ số · dấu thập phân theo ngôn ngữ (0.5 / 0,5)
  function fmt(v) {
    const a = Math.abs(v);
    const n = a >= 10 ? Math.round(v) : a >= 1 ? Math.round(v * 10) / 10 : Math.round(v * 100) / 100;
    return SFC.I18n ? SFC.I18n.num(n) : String(n);
  }

  const CoreScale = {
    cfg() { return DEF().statScale; },
    power(r) { return curve(r, this.cfg().power); },
    cooldown(r) { return curve(r, this.cfg().cooldown); },

    // chỉ số của Core: list[id].stat (ghi đè) > chỉ số trường phái (Core cầu nối: cả 2)
    statsOf(id) {
      const c = DEF().list[id];
      if (!c) return [];
      if (c.stat) return [].concat(c.stat);
      return [...new Set(c.tags.map((t) => DEF().archetypes[t] && DEF().archetypes[t].stat).filter(Boolean))];
    },
    // rating 1 chỉ số từ bảng hệ số (Player.stats / Profile.avatarStats); 'ovr' = trung bình mọi chỉ số
    ratingOf(stats, stat) {
      const A = ATTR();
      if (stat === 'ovr') return A.order.reduce((s, id) => s + this.ratingOf(stats, id), 0) / A.order.length;
      const keys = Object.keys((A.list[stat] || {}).keys || {});
      if (!keys.length) return this.cfg().anchor;
      return A.scale * keys.reduce((s, k) => s + (stats[k] != null ? stats[k] : 1), 0) / keys.length;
    },
    // rating của character (ngoài trận: túi đồ, màn mở thẻ, trang chọn Core trước khi có Player)
    profileRating(id) {
      const stats = this.statsOf(id);
      if (!stats.length || !SFC.Profile || !SFC.Profile.data) return this.cfg().anchor;
      const s = SFC.Profile.avatarStats();
      return stats.reduce((a, st) => a + this.ratingOf(s, st), 0) / stats.length;
    },

    // params đã nhân theo rating
    apply(id, params, r) {
      const sc = (DEF().list[id] || {}).scale;
      if (!sc) return params;
      const P = this.power(r), Cd = this.cooldown(r), out = Object.assign({}, params);
      for (const k in sc) if (k.slice(0, 2) !== 'm.' && out[k] != null) out[k] = scaleVal(sc[k], out[k], P, Cd);
      return out;
    },
    // 1 hệ số mods của Core (chỉ nhân khi được khai báo 'm.<key>'); ratingFn gọi lười (chỉ khi cần)
    scaleMod(id, key, v, ratingFn) {
      const sc = (DEF().list[id] || {}).scale, kind = sc && sc['m.' + key];
      if (!kind) return v;
      const r = ratingFn();
      return scaleVal(kind, v, this.power(r), this.cooldown(r));
    },

    // nhãn chỉ số của Core: "FIGHT" · "PACE / DRIBBLE" · "OVR"
    label(id) {
      return this.statsOf(id).map((st) => (st === 'ovr' ? SFC.t('OVR') : (ATTR().list[st] || {}).label || st.toUpperCase())).join(' / ');
    },
    color(id) {
      const st = this.statsOf(id)[0];
      return st && st !== 'ovr' && ATTR().list[st] ? ATTR().list[st].color : '#e6dccb';
    },

    // dòng "SCALES WITH <chỉ số>" trên lá Core (icon chỉ số của trang STATS)
    statLine(id) {
      const stats = this.statsOf(id), sc = (DEF().list[id] || {}).scale;
      if (!stats.length || !sc || !Object.keys(sc).length) return '';   // Core không có số nào scale (Warp Walls)
      const icons = stats.map((st) => (st !== 'ovr' && ATTR().list[st] && ATTR().list[st].icon && SFC.PixelIcon ? SFC.PixelIcon.html(ATTR().list[st].icon, '', 'sm') : '')).join('');
      return `<div class="card-stat" style="--sc:${this.color(id)}">${icons}<span>${esc(SFC.t('SCALES WITH'))}</span> <b>${esc(this.label(id))}</b></div>`;
    },

    // mô tả Core (HTML) với số đã nhân theo rating r (mặc định: rating character), tô xanh / đỏ khi hơn / kém mức gốc
    describe(id, r = this.profileRating(id)) {
      const c = DEF().list[id];
      if (!c) return '';
      const sc = c.scale || {}, base = Object.assign({}, c.params || {});
      for (const k in c.mods || {}) base['m.' + k] = c.mods[k];
      const P = this.power(r), Cd = this.cooldown(r);
      const diff = Math.abs(r - this.cfg().anchor) < 0.5 ? '' : r > this.cfg().anchor ? 'up' : 'down';
      return this.iconize(esc(c.desc)).replace(/\{([\w.]+)(\+%|-%|%)?\}/g, (m, key, pct) => {
        if (base[key] == null) return m;
        const v = sc[key] ? scaleVal(sc[key], base[key], P, Cd) : base[key];
        const shown = pct === '%' ? Math.round(v * 100) : pct === '+%' ? Math.round((v - 1) * 100) : pct === '-%' ? Math.round((1 - v) * 100) : fmt(v);
        return sc[key] && diff ? `<b class="sv ${diff}">${shown}</b>` : `<b class="sv">${shown}</b>`;
      });
    },
    // chữ tài nguyên (Momentum / Rhythm / Rage / Guard, đã dịch theo ngôn ngữ đang chọn) -> icon pixel như trên HUD
    // (chỉ trong HTML, tooltip vẫn giữ chữ). Ranh giới từ theo Unicode: \b của regex không nhận chữ có dấu (Ímpeto, Fúria)
    iconize(html) {
      const R = DEF().resources, map = {};
      for (const k in R) map[R[k].label] = k;
      const words = Object.keys(map).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      const re = new RegExp('(?<![\\p{L}\\p{N}_])(' + words.join('|') + ')(?![\\p{L}\\p{N}_])', 'gu');
      return html.replace(re, (w) => (SFC.PixelIcon ? SFC.PixelIcon.res(map[w], 'res-in') : w));
    },
    // mô tả dạng chữ thường (tooltip, tìm kiếm): bỏ thẻ HTML
    plain(id, r) { return this.describe(id, r).replace(/<x-px class="pxi pxi-res-(\w+)[^>]*><\/x-px>/g, (m, k) => (DEF().resources[k] || {}).label || k).replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"'); },
  };

  SFC.CoreScale = CoreScale;
})();
