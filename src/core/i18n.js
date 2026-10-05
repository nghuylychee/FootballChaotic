/* I18n — đa ngôn ngữ. Câu tiếng Anh trong code / config chính là key (kiểu gettext); câu chưa dịch thì hiện tiếng Anh.
 *  - Code:   SFC.t('MAIN PATH') · có biến: SFC.t('{n} wins', { n }) · số nhiều: SFC.tn('{n} drill card', '{n} drill cards', n)
 *            · cùng 1 câu tiếng Anh nhưng cần 2 cách dịch: SFC.tc('stat', 'POWER') (key trong bản dịch: 'stat|POWER').
 *            File UI đặt tắt `const _t = SFC.t` (đừng đặt tên t: trùng biến team / time khắp nơi).
 *  - Config: các trường liệt kê ở src/i18n/fields.js được dịch tại chỗ mỗi lần đổi ngôn ngữ (localizeConfig) -> code đọc config
 *            không phải sửa. Bản tiếng Anh gốc được giữ lại nên đổi qua lại bao nhiêu lần cũng được.
 *  - {tên} không có trong vars thì giữ nguyên: config "{name}", mô tả Core "{m.accuracy+%}" dịch xong code cũ vẫn tự thay số.
 *  - SFC.N_('...'): chỉ đánh dấu chuỗi cần dịch (dịch ở chỗ khác, lúc hiện). Chữ bay trong trận (effects.text / effects.comic)
 *    được dịch lúc vẽ, scripts/i18n-check.js tự gom chuỗi ở 2 hàm đó.
 *  - Bản dịch: src/i18n/<mã>.js -> SFC.I18n.add({ id, name, steam, strings }). Thứ tự nạp trong index.html = thứ tự trong popup.
 *    Giá trị số nhiều: { one, few, many, other } theo Intl.PluralRules của ngôn ngữ đó (thiếu dạng nào thì dùng other);
 *    thêm zero nếu muốn câu riêng cho 0 ("Nenhum item" thay vì "0 item").
 *  - Ngôn ngữ đã chọn lưu ở SFC.Settings.lang (null = chưa chọn -> popup chọn ngôn ngữ lúc mở game, src/ui/langpick.js).
 * Quy trình dịch + kiểm tra: docs/LOCALIZATION.md · node scripts/i18n-check.js
 */
window.SFC = window.SFC || {};

(function () {
  const EN = { id: 'en', name: 'English', steam: ['english'], strings: {} };
  const packs = [EN];
  const byId = { en: EN };
  const orig = new WeakMap();   // config: object -> { src: { trường: tiếng Anh }, out: { trường: chuỗi đã ghi } }
  const plural = {};            // mã ngôn ngữ -> Intl.PluralRules
  let cur = EN;

  // {key} -> vars[key]; key không có trong vars thì giữ nguyên
  function fill(s, vars) {
    if (!vars) return s;
    return s.replace(/\{([\w.]+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  }

  function rules(id) {
    if (!plural[id]) {
      try { plural[id] = new Intl.PluralRules(id); } catch (e) { plural[id] = { select: (n) => (n === 1 ? 'one' : 'other') }; }
    }
    return plural[id];
  }

  // giả dịch (chỉ bản dev): thêm dấu + kéo dài ~35% để soi chuỗi bị sót / chữ tràn khung trước khi có bản dịch thật.
  // Không đụng {biến}, thẻ HTML
  const ACC = { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú', n: 'ñ', c: 'ç', y: 'ý', A: 'Á', E: 'É', I: 'Í', O: 'Ó', U: 'Ú', N: 'Ñ', C: 'Ç', Y: 'Ý' };
  function pseudo(s) {
    const body = s.replace(/(\{[^}]*\}|<[^>]*>)|[^{<]+/g, (m, keep) => keep || m.replace(/[aeiouncyAEIOUNCY]/g, (c) => ACC[c]));
    const n = s.replace(/\{[^}]*\}|<[^>]*>/g, '').length;
    return `[${body}${'·'.repeat(Math.ceil(n * 0.35))}]`;
  }

  // chuỗi dịch của pack p (string | { one, other... }), không có -> undefined
  function find(p, key) {
    const v = p.strings[key];
    if (v == null && SFC_DEV && p !== EN && !p.pseudo) I18n.misses.add(key);
    return v;
  }

  function translate(p, key, en, vars) {
    if (p.pseudo) return fill(pseudo(en), vars);
    const v = find(p, key);
    return fill(typeof v === 'string' ? v : en, vars);
  }

  // duyệt đường dẫn kiểu 'cores.list.*.name' trong SFC_CONFIG, dịch tại chỗ trường cuối (ctx: ngữ cảnh như SFC.tc)
  function walk(obj, parts, i, ctx) {
    if (!obj || typeof obj !== 'object') return;
    const k = parts[i], last = i === parts.length - 1;
    for (const key of k === '*' ? Object.keys(obj) : [k]) {
      if (!(key in obj)) continue;
      if (last) localize(obj, key, ctx);
      else walk(obj[key], parts, i + 1, ctx);
    }
  }
  function localize(obj, key, ctx) {
    let o = orig.get(obj);
    if (!o) orig.set(obj, (o = { src: {}, out: {} }));
    if (typeof obj[key] !== 'string') return;
    // lần đầu, hoặc code đã tự gán giá trị mới sau lần dịch trước (vd. tên đội riêng "LUCAS FC" lúc vào trận) -> lấy làm bản gốc
    if (!(key in o.src) || obj[key] !== o.out[key]) o.src[key] = obj[key];
    const en = o.src[key];
    obj[key] = o.out[key] = translate(cur, ctx ? ctx + '|' + en : en, en);
  }

  const I18n = {
    lang: 'en',
    fields: [],          // src/i18n/fields.js
    misses: new Set(),   // bản dev: key chưa dịch đã gặp (SFC.I18n.report() để xem)

    // pack: { id, name (tên viết bằng chính ngôn ngữ đó), steam: [mã ngôn ngữ Steam], tags?: [mã BCP 47 nhận thêm], strings,
    //         accentCaps?: true = có chữ hoa có dấu (Á É Ó Ñ...) -> chữ Press Start 2P dùng thêm font phụ SFC Accent Caps,
    //         cjk?: true = chữ Nhật (kana / Hán) -> font dự phòng DotGothic16 "SFC JP" sau font pixel (css/style.css: :root.cjk) }
    add(pack) {
      if (byId[pack.id]) return;
      packs.push(pack);
      byId[pack.id] = pack;
    },
    // giả dịch (bản dev) xếp cuối danh sách
    list() { return packs.filter((p) => !p.pseudo).concat(packs.filter((p) => p.pseudo)).map((p) => ({ id: p.id, name: p.name })); },
    has(id) { return !!byId[id]; },

    // mã ngôn ngữ cho Intl (số, ngày): giả dịch dùng tiếng Anh
    locale() { return cur.pseudo ? 'en' : cur.id; },
    // digits: số chữ số thập phân cố định (x0.75 -> x0,75)
    num(n, digits) {
      const o = digits == null ? undefined : { minimumFractionDigits: digits, maximumFractionDigits: digits };
      return Number(n).toLocaleString(this.locale(), o);
    },

    t(s, vars) { return translate(cur, s, s, vars); },
    tc(ctx, s, vars) { return translate(cur, ctx + '|' + s, s, vars); },
    tn(one, other, n, vars) {
      const v = Object.assign({ n }, vars);
      const en = rules('en').select(n) === 'one' ? one : other;
      if (cur.pseudo) return fill(pseudo(en), v);
      const tr = find(cur, one);
      if (tr == null) return fill(en, v);
      if (typeof tr === 'string') return fill(tr, v);
      return fill((n === 0 && tr.zero) || tr[rules(cur.id).select(n)] || tr.other || en, v);
    },
    // dịch theo 1 ngôn ngữ khác ngôn ngữ đang dùng (popup chọn ngôn ngữ: tiêu đề theo dòng đang chọn)
    tIn(id, s, vars) { return translate(byId[id] || EN, s, s, vars); },

    set(id) {
      cur = byId[id] || EN;
      this.lang = cur.id;
      if (SFC_DEV) this.misses.clear();
      document.documentElement.lang = this.locale();
      // chữ hoa có dấu vẽ đủ cao (css/style.css: :root.accent-caps) · nạp sẵn font để chữ vẽ trên canvas cũng đúng ngay
      document.documentElement.classList.toggle('accent-caps', !!cur.accentCaps);
      if (cur.accentCaps && document.fonts && document.fonts.load) document.fonts.load('8px "SFC Accent Caps"', 'ÁÉÍÓÚÑ').catch(() => {});
      // tiếng Nhật: font dự phòng cho kana / chữ Hán (DOM + canvas)
      document.documentElement.classList.toggle('cjk', !!cur.cjk);
      if (cur.cjk && document.fonts && document.fonts.load) {
        document.fonts.load('16px "SFC JP"', 'あア字').catch(() => {});
        document.fonts.load('16px "SFC JP VT"', 'あア字').catch(() => {});
      }
      this.localizeConfig();
    },
    // font Press Start 2P cho chữ vẽ trên canvas (cùng danh sách với biến --px trong css/style.css)
    pxFont() {
      if (cur.cjk) return '"Press Start 2P", "SFC JP", monospace';
      return cur.accentCaps ? '"SFC Accent Caps", "Press Start 2P", monospace' : '"Press Start 2P", monospace';
    },
    // font VT323 cho chữ vẽ trên canvas (cùng danh sách với biến --vt)
    vtFont() { return cur.cjk ? '"SFC JP Body", "VT323", monospace' : '"VT323", monospace'; },
    // chuỗi có chữ Nhật / Hán (canvas: chữ Hán cỡ 8px vỡ nét -> chỗ vẽ chữ nhỏ tự phóng to)
    isCJK(s) { return /[\u3000-\u30ff\u3400-\u9fff\uff00-\uffef]/.test(s); },

    // fields: 'đường.dẫn' · '#ngữ cảnh' (cùng câu tiếng Anh nhưng dịch khác chỗ khác) · '@N' tối đa N ký tự (chỉ scripts/i18n-check.js kiểm)
    localizeConfig() {
      if (!window.SFC_CONFIG) return;
      for (const f of this.fields) {
        const [path, ctx] = f.split('@')[0].split('#');
        walk(SFC_CONFIG, path.split('.'), 0, ctx);
      }
    },

    // ngôn ngữ đoán theo máy: Steam (ngôn ngữ đặt cho game, bỏ qua 'english' vì game chưa khai báo ngôn ngữ khác trên
    // Steamworks thì Steam luôn trả english) -> hệ điều hành (bản desktop) -> trình duyệt. Không khớp -> English
    detect() {
      const pick = (p) => p && p.id;
      try {
        const apps = window.SFC_STEAM && window.SFC_STEAM.client && window.SFC_STEAM.client.apps;
        const st = apps && typeof apps.currentGameLanguage === 'function' && apps.currentGameLanguage();
        if (st && st !== 'english') { const p = packs.find((x) => (x.steam || []).includes(st)); if (p) return pick(p); }
      } catch (e) { /* Steam chưa chạy */ }
      // bản desktop: navigator.languages bị khoá theo electronLanguages (package.json) -> lấy danh sách của hệ điều hành qua preload
      const prefs = [].concat((window.SFC_DESKTOP && window.SFC_DESKTOP.languages) || [], navigator.languages || [navigator.language]);
      for (const tag of prefs) {
        if (typeof tag !== 'string') continue;
        const low = tag.toLowerCase(), base = low.split(/[-_]/)[0];
        const exact = packs.find((p) => !p.pseudo && [p.id].concat(p.tags || []).some((x) => x.toLowerCase() === low));
        const near = exact || packs.find((p) => !p.pseudo && p.id.toLowerCase().split('-')[0] === base);
        if (near) return pick(near);
      }
      return 'en';
    },

    // lúc khởi động (main.js -> boot). Trả về true nếu người chơi đã chọn ngôn ngữ (false -> mở popup chọn ngôn ngữ)
    init() {
      if (SFC_DEV) {
        // bản dev: index.html?lang=es (hoặc pseudo) -> vào thẳng ngôn ngữ đó, không hỏi, không lưu (chụp màn hình / kiểm tra nhanh)
        const q = new URLSearchParams(location.search).get('lang');
        if (q && byId[q]) { this.set(q); return true; }
      }
      const saved = SFC.Settings.lang;
      this.set(saved && byId[saved] ? saved : this.detect());
      return !!(saved && byId[saved]);
    },
  };

  if (SFC_DEV) {
    I18n.add({ id: 'pseudo', name: '[Pséúdó]', pseudo: true, accentCaps: true, strings: {} });
    // danh sách key chưa dịch của ngôn ngữ đang dùng đã gặp từ lúc mở game
    I18n.report = () => { console.table([...I18n.misses].map((key) => ({ lang: I18n.lang, key }))); };
  }

  SFC.I18n = I18n;
  SFC.t = (s, vars) => I18n.t(s, vars);
  SFC.tc = (ctx, s, vars) => I18n.tc(ctx, s, vars);
  SFC.tn = (one, other, n, vars) => I18n.tn(one, other, n, vars);
  // chỉ đánh dấu cho scripts/i18n-check.js gom chuỗi, không dịch: chuỗi tạo ở 1 chỗ nhưng dịch lúc hiện ở chỗ khác
  // (vd. sự kiện banner của trận — online thì khách nhận sự kiện của host, mỗi máy tự dịch theo ngôn ngữ của mình)
  SFC.N_ = (s) => s;
})();
