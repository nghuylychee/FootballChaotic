/* Mates — đồng đội của người chơi (số liệu: config/teammates.config.js).
 * Một đồng đội: { id, name, ovr, ratings: { pace, shooting, passing, dribble, fight, keeper }, deck: [id Core], look, fee, starter }
 * - OVR cố định, không nâng cấp. ratings quanh OVR, nghiêng theo trường phái chính của deck.
 * - Vào trận (spec): chỉ số -> hệ số Player.stats theo progression.attrs (giống character), deck = Core đồng đội được bốc.
 * - Scout / đội hình lưu trong hồ sơ (SFC.Profile.data.team) — hàm quản lý ở cuối file.
 */
window.SFC = window.SFC || {};

(function () {
  const C = () => SFC_CONFIG.teammates;
  const A = () => SFC_CONFIG.progression.attrs;
  const CORES = () => SFC_CONFIG.cores;
  const PROG = () => SFC_CONFIG.progression;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const irnd = (a, b) => Math.floor(rnd(a, b + 1));
  const pick = (l) => l[Math.floor(Math.random() * l.length)];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const rank = (r) => PROG().rarityOrder.indexOf(r);

  function weighted(obj) {
    const keys = Object.keys(obj).filter((k) => obj[k] > 0), tot = keys.reduce((s, k) => s + obj[k], 0);
    let r = Math.random() * tot;
    for (const k of keys) { r -= obj[k]; if (r <= 0) return k; }
    return keys[keys.length - 1];
  }

  const Mates = {
    /* ---------- sinh đồng đội ---------- */
    // deck Core: trường phái chính (+ phụ), độ hiếm theo bậc, có thể kèm Tuyệt kỹ
    genDeck(tier) {
      const D = C().deck, L = CORES().list, archs = Object.keys(CORES().archetypes).filter((t) => !CORES().archetypes[t].noSet);
      const main = pick(archs), side = pick(archs.filter((t) => t !== main));
      const size = irnd(D.size[0], D.size[1]), odds = D.rarityOdds[clamp(tier, 0, D.rarityOdds.length - 1)];
      const deck = [];
      const pool = (fn) => Object.keys(L).filter((id) => !deck.includes(id) && L[id].role !== 'ult' && fn(L[id]));
      const draw = (fn) => {
        const want = weighted(odds);
        let cand = pool((c) => fn(c) && c.rarity === want);
        if (!cand.length) cand = pool(fn);
        if (cand.length) deck.push(pick(cand));
      };
      const nMain = Math.max(2, Math.round(size * D.mainShare)), nSide = Math.round(size * D.sideShare);
      for (let i = 0; i < nMain; i++) draw((c) => c.tags.includes(main));
      for (let i = 0; i < nSide; i++) draw((c) => c.tags.includes(side));
      while (deck.length < size) draw(() => true);
      // Tuyệt kỹ của trường phái chính (xác suất theo bậc)
      if (Math.random() < (D.ultChance[clamp(tier, 0, D.ultChance.length - 1)] || 0)) {
        const ult = Object.keys(L).find((id) => L[id].role === 'ult' && L[id].tags.includes(main));
        if (ult) deck.push(ult);
      }
      return { deck, main, side };
    },

    // chỉ số riêng quanh OVR: chỉ số của trường phái chính / phụ cao hơn, còn lại thấp hơn, rồi kéo trung bình về đúng OVR
    genRatings(ovr, main, side) {
      const S = C().stats, order = A().order, stat = (t) => CORES().archetypes[t] && CORES().archetypes[t].stat;
      const r = {};
      for (const id of order) {
        const b = id === stat(main) ? rnd(...S.mainBonus) : id === stat(side) ? rnd(...S.sideBonus) : rnd(...S.otherMalus);
        r[id] = ovr + b;
      }
      const shift = ovr - order.reduce((s, id) => s + r[id], 0) / order.length;
      for (const id of order) r[id] = clamp(Math.round(r[id] + shift), S.min, S.max);
      return r;
    },

    // ngoại hình ngẫu nhiên: hạng càng cao càng có costume hiếm
    genLook(rar) {
      const P = PROG(), items = P.items, max = Math.max(0, rank(rar));
      const slot = (s) => {
        const ids = Object.keys(items).filter((id) => items[id].slot === s && (items[id].default || rank(items[id].rarity) <= max));
        return pick(ids);
      };
      return { hair: slot('hair'), face: Math.random() < 0.5 ? P.defaultLook.face : slot('face'), shoes: slot('shoes'),
        fx: Math.random() < 0.3 + max * 0.15 ? slot('fx') : 'nofx',
        skin: irnd(0, SFC_CONFIG.teams.skins.length - 1), hairColor: irnd(0, P.hairColors.length - 1) };
    },

    // 1 ứng viên: area = Area xa nhất từng tới (0..9), level = cấp trạm scout (1..n)
    generate(area, level) {
      const O = C().ovr, st = C().station[clamp(level, 1, C().station.length) - 1];
      let ovr = O.base + O.perArea * area + st.ovrBonus + rnd(-O.spread, O.spread);
      if (Math.random() < O.luckyChance) ovr += O.luckyBonus;
      ovr = clamp(Math.round(ovr), O.min, O.max);
      const tier = Math.floor(area / 2) + st.deckBonus;
      const { deck, main, side } = this.genDeck(tier);
      const m = { name: pick(C().names), ovr, ratings: this.genRatings(ovr, main, side), deck, main };
      m.look = this.genLook(this.grade(m).rarity);
      m.fee = this.fee(m);
      return m;
    },

    // đồng đội khởi đầu (miễn phí)
    starter() {
      const S = C().starter, main = 'brawler';
      const m = { name: S.name, ovr: S.ovr, deck: S.deck.slice(), main, starter: true, look: Object.assign({}, S.look), fee: 0 };
      m.ratings = {};
      for (const id of A().order) m.ratings[id] = S.ovr;
      return m;
    },

    /* ---------- đánh giá ---------- */
    deckScore(m) { return m.deck.length ? m.deck.reduce((s, id) => s + Math.max(0, rank(CORES().list[id].rarity)), 0) / m.deck.length : 0; },
    // hạng: OVR + 3 x độ hiếm trung bình của deck
    grade(m) {
      const score = m.ovr + this.deckScore(m) * 3;
      let g = C().grade[0];
      for (const x of C().grade) if (score >= x.min) g = x;
      return g;
    },
    fee(m) {
      const F = C().fee, R = PROG().rarities;
      const deckV = m.deck.reduce((s, id) => s + ((R[CORES().list[id].rarity] || {}).value || 0), 0);
      return Math.max(F.min, Math.round(Math.pow(Math.max(0, m.ovr - F.feeBase), 2) * F.feeMult + deckV * F.deckMult));
    },
    // trường phái nổi bật trong deck: [{ tag, n }] nhiều nhất trước
    deckArchs(m) {
      const n = {};
      for (const id of m.deck) for (const t of CORES().list[id].tags) n[t] = (n[t] || 0) + 1;
      return Object.keys(n).sort((a, b) => n[b] - n[a]).map((tag) => ({ tag, n: n[tag] }));
    },

    // dữ liệu vào trận (Game opts.mates): hệ số Player.stats từ chỉ số (giống character), deck, ngoại hình
    spec(m, role) {
      const out = {};
      for (const id of A().order) {
        const keys = A().list[id].keys;
        for (const k in keys) out[k] = 1 + (m.ratings[id] / A().scale - 1) * (keys[k] == null ? 1 : keys[k]);
      }
      return { name: m.name, ovr: m.ovr, stats: out, deck: m.deck.slice(), look: SFC.Profile.lookOf(Object.assign({}, PROG().defaultLook, m.look)), role };
    },

    /* ---------- đội hình + scout (hồ sơ: SFC.Profile.data.team) ---------- */
    blankTeam() {
      const s = this.starter(); s.id = 1;
      return { roster: [s], active: 1, nextId: 2, station: 1, scout: null };
    },
    sanitizeTeam(raw) {
      const d = this.blankTeam();
      if (!raw || typeof raw !== 'object') return d;
      const L = CORES().list, order = A().order;
      const ok = (m) => m && typeof m === 'object' && m.id > 0 && Array.isArray(m.deck) && m.ratings;
      const clean = (m) => {
        const deck = m.deck.filter((id) => L[id]);
        const ratings = {};
        for (const id of order) ratings[id] = clamp(Math.round(+m.ratings[id] || C().ovr.min), C().stats.min, C().stats.max);
        return Object.assign({}, m, { deck, ratings, ovr: clamp(Math.round(+m.ovr || 60), 1, 99), name: String(m.name || 'MATE').slice(0, 12), fee: Math.max(0, +m.fee || 0) });
      };
      if (Array.isArray(raw.roster) && raw.roster.some(ok)) d.roster = raw.roster.filter(ok).slice(0, C().rosterMax).map(clean);
      d.nextId = Math.max(d.roster.reduce((m, x) => Math.max(m, x.id), 0) + 1, +raw.nextId || 0);
      d.active = d.roster.some((m) => m.id === raw.active) ? raw.active : d.roster[0].id;
      d.station = clamp(Math.round(+raw.station || 1), 1, C().station.length);
      const sc = raw.scout;
      if (sc && Array.isArray(sc.offers) && sc.end > 0) d.scout = { start: +sc.start || 0, end: +sc.end, region: sc.region || '', offers: sc.offers.filter((m) => m && Array.isArray(m.deck) && m.ratings).map((m) => clean(Object.assign({ id: 1 }, m))) };
      return d;
    },

    get T() { return SFC.Profile.data.team; },
    roster() { return this.T.roster; },
    active() { return this.T.roster.find((m) => m.id === this.T.active) || this.T.roster[0]; },
    setActive(id) { if (this.T.roster.some((m) => m.id === id)) { this.T.active = id; SFC.Profile.save(); } },

    // bán: nhận lại sellRefund phí; luôn giữ tối thiểu 1 đồng đội
    sellValue(m) { return Math.round((m.fee || 0) * C().sellRefund); },
    sell(id) {
      const T = this.T, m = T.roster.find((x) => x.id === id);
      if (!m || T.roster.length <= 1) return 0;
      T.roster = T.roster.filter((x) => x !== m);
      if (T.active === id) T.active = T.roster[0].id;
      const g = this.sellValue(m);
      SFC.Profile.data.gold += g;
      SFC.Profile.save();
      return g;
    },

    station() { return C().station[this.T.station - 1]; },
    nextStation() { return C().station[this.T.station] || null; },
    upgradeStation() {
      const nx = this.nextStation(), d = SFC.Profile.data;
      if (!nx || d.gold < nx.cost) return false;
      d.gold -= nx.cost;
      this.T.station++;
      SFC.Profile.save();
      return true;
    },

    // scout: miễn phí, 1 lần 1 chuyến; ứng viên sinh lúc bắt đầu (theo Area xa nhất + cấp trạm) và lộ ra khi hết giờ
    scouting() { return this.T.scout; },
    scoutLeft() { const s = this.T.scout; return s ? Math.max(0, s.end - Date.now()) : 0; },
    scoutReady() { return !!this.T.scout && this.scoutLeft() <= 0; },
    startScout() {
      if (this.T.scout) return false;
      const MP = SFC.MainPath, area = Math.floor(MP.state.best / MP.nDiv());
      const offers = [];
      for (let i = 0; i < C().offers; i++) offers.push(this.generate(area, this.T.station));
      const now = Date.now();
      this.T.scout = { start: now, end: now + this.station().minutes * 60000, region: pick(C().regions), offers };
      SFC.Profile.save();
      return true;
    },
    // tuyển ứng viên thứ i: đội hình chưa đầy + đủ gold -> trả phí, chuyến scout kết thúc
    canRecruit(i) {
      const s = this.T.scout, m = s && s.offers[i];
      if (!m || !this.scoutReady()) return { ok: false, reason: 'none' };
      if (this.T.roster.length >= C().rosterMax) return { ok: false, reason: 'full' };
      if (SFC.Profile.data.gold < m.fee) return { ok: false, reason: 'gold' };
      return { ok: true };
    },
    recruit(i) {
      const c = this.canRecruit(i);
      if (!c.ok) return c;
      const T = this.T, m = Object.assign({}, T.scout.offers[i], { id: T.nextId++ });
      SFC.Profile.data.gold -= m.fee;
      T.roster.push(m);
      T.scout = null;
      SFC.Profile.save();
      return { ok: true, mate: m };
    },
    // bỏ qua cả 3 ứng viên (kết thúc chuyến scout)
    decline() { this.T.scout = null; SFC.Profile.save(); },
  };

  SFC.Mates = Mates;
})();
