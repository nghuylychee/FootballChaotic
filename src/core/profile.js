/* Profile — hồ sơ người chơi tại máy này: tên, level, XP, gold, túi đồ (costume + Core), thống kê.
 * Costume / Core lấy từ hộp gacha (openBox), trùng thì cộng số lượng, phân rã (dismantle) ra gold.
 * Lưu qua SFC.Storage (src/core/storage.js: file JSON ở bản desktop, localStorage ở bản web), key = progression.storageKey.
 * Không lưu được thì game vẫn chạy, chỉ là không giữ được tiến trình.
 */
window.SFC = window.SFC || {};

(function () {
  const P = () => SFC_CONFIG.progression;
  const ITEMS = () => P().items;
  const CORES = () => P().cores;
  const SKINS = () => SFC_CONFIG.teams.skins;
  const A = () => P().attrs;
  const D = () => P().attrs.drills;
  const U = () => SFC.U;
  const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(+v || 0)));

  function blank() {
    return {
      v: 2, name: '', level: 1, xp: 0, gold: P().startGold,
      items: {}, cores: {},          // id -> số lượng trong túi đồ
      boxes: {},                     // hộp gacha được tặng (thưởng lên hạng Main Path): id -> số hộp, mở miễn phí
      look: Object.assign({}, P().defaultLook),
      stats: { matches: 0, wins: 0, draws: 0, losses: 0, goals: 0, boxes: 0 },
      team: SFC.Mates.blankTeam(),   // đồng đội: đội hình + trạm scout (src/core/teammates.js)
      attrs: blankAttrs(),
      tut: { done: false, heirloom: false },   // PROLOGUE (src/game/tutorial.js) đã xem xong / bỏ qua · đã nhận bí kíp gia truyền (cut scene trao AURA FARMING)
    };
  }

  // chỉ số character (docs/DRILL_DESIGN.md): steps = số bước đã cộng của từng chỉ số (rating = base + steps)
  // drills: pending = số drill chờ chọn, offer = bộ drill đang mời (lưu lại để không đổi miễn phí), rerolls = số lần đã đổi bộ này
  // bonus / milestones: để dành cho giai đoạn 2 (drill thưởng)
  function blankAttrs() {
    const steps = {};
    for (const id of A().order) steps[id] = 0;
    return { steps, drills: { pending: 0, offer: null, rerolls: 0 }, bonus: 0, milestones: {} };
  }

  // chọn ngẫu nhiên theo trọng số: list [{ w, v }]
  function weighted(list) {
    const total = list.reduce((s, x) => s + x.w, 0);
    let r = Math.random() * total;
    for (const x of list) { r -= x.w; if (r <= 0) return x.v; }
    return list[list.length - 1].v;
  }

  const Profile = {
    data: null,

    load() {
      let raw = null;
      this.data = this.sanitize(SFC.Storage.getJSON(P().storageKey, null));
      return this.data;
    },

    save() {
      if (SFC_DEV && this.sandbox) return;   // DRILL TEST (menu SETTINGS): chỉ đổi trong bộ nhớ, không ghi hồ sơ
      SFC.Storage.setJSON(P().storageKey, this.data);
    },

    // xoá hồ sơ đã lưu (RESET DATA ở SETTINGS) — lần tải sau như người chơi mới
    resetAll() {
      if (SFC_DEV) this.sandbox = false;
      SFC.Storage.remove(P().storageKey);
      this.data = this.sanitize(null);
    },

    // dữ liệu hỏng / phiên bản cũ -> ghép với hồ sơ trống, bỏ id không còn tồn tại
    sanitize(raw) {
      const d = blank();
      d.path = SFC.MainPath.sanitize(raw && raw.path);   // tiến trình Main Path (src/core/mainpath.js)
      d.team = SFC.Mates.sanitizeTeam(raw && raw.team);  // đồng đội + scout (src/core/teammates.js)
      if (!raw || typeof raw !== 'object') return d;
      d.name = this.cleanName(raw.name || '');
      // hồ sơ có từ trước khi có PROLOGUE (đã đặt tên) -> coi như đã xem
      const tut = raw.tut && typeof raw.tut === 'object' ? raw.tut : null;
      d.tut = { done: tut ? !!tut.done : !!d.name, heirloom: !!(tut && tut.heirloom) };
      d.level = clampInt(raw.level, 1, P().maxLevel);
      d.xp = Math.max(0, +raw.xp || 0);
      d.gold = Math.max(0, Math.floor(+raw.gold || 0));
      const counts = (src, known) => {
        const out = {};
        // v1: mảng id đã mua -> mỗi món 1 cái
        if (Array.isArray(src)) src.forEach((id) => { if (known(id)) out[id] = (out[id] || 0) + 1; });
        else if (src && typeof src === 'object') for (const id in src) if (known(id) && src[id] > 0) out[id] = Math.floor(src[id]);
        return out;
      };
      d.items = counts(raw.items || raw.owned, (id) => ITEMS()[id] && !ITEMS()[id].default);
      d.cores = counts(raw.cores, (id) => !!CORES()[id]);
      d.boxes = counts(raw.boxes, (id) => !!P().boxes[id]);
      const lk = raw.look || {};
      for (const slot of Object.keys(P().slots)) {
        const id = lk[slot];
        if (ITEMS()[id] && ITEMS()[id].slot === slot && (ITEMS()[id].default || d.items[id] > 0)) d.look[slot] = id;
      }
      d.look.skin = clampInt(lk.skin, 0, SKINS().length - 1);
      d.look.hairColor = clampInt(lk.hairColor, 0, P().hairColors.length - 1);
      Object.assign(d.stats, raw.stats || {});
      // chỉ số + DRILL: bước ngoài khoảng -> kẹp lại; bộ drill đang mời có id lạ / thiếu -> bỏ (bốc lại khi mở)
      const ra = raw.attrs || {}, rs = ra.steps || {}, rd = ra.drills, dr = d.attrs.drills;
      for (const id of A().order) d.attrs.steps[id] = clampInt(rs[id], 0, A().max - A().base);
      d.attrs.bonus = Math.max(0, Math.floor(+ra.bonus || 0));
      if (ra.milestones && typeof ra.milestones === 'object') Object.assign(d.attrs.milestones, ra.milestones);
      if (!rd || typeof rd !== 'object') {
        // hồ sơ trước DRILL (hệ điểm cộng tay / chưa có chỉ số): chỉ số về 60, mỗi level đã lên = drill chờ
        d.attrs.steps = blankAttrs().steps;
        dr.pending = (d.level - 1) * D().perLevel;
      } else {
        dr.pending = clampInt(rd.pending, 0, P().maxLevel * D().perLevel);
        const offer = Array.isArray(rd.offer) ? rd.offer.filter((id) => D().list[id]) : [];
        dr.offer = dr.pending > 0 && offer.length === D().choices && new Set(offer).size === offer.length ? offer : null;
        dr.rerolls = dr.offer ? clampInt(rd.rerolls, 0, D().rerolls) : 0;
      }
      return d;
    },

    get hasName() { return !!(this.data && this.data.name); },

    // tên hiển thị bằng font pixel (không dấu): chữ in hoa, số, khoảng trắng, _ -
    cleanName(s) {
      return String(s).toUpperCase().replace(/[^A-Z0-9 _-]/g, '').replace(/\s+/g, ' ').replace(/^\s+/, '').slice(0, P().nameMaxLength);
    },

    setName(n) {
      const name = this.cleanName(n).trim();
      if (!name) return false;
      this.data.name = name;
      this.save();
      return true;
    },

    /* ---------- level / XP ---------- */
    xpToNext(level = this.data.level) {
      return level >= P().maxLevel ? Infinity : P().xpBase + P().xpStep * (level - 1);
    },

    // trần level theo Main Path (mainpath.config.js -> areas[].levelCap, theo hạng cao nhất từng đạt); vô địch = maxLevel
    levelCap() {
      const path = this.data.path, MP = SFC.MainPath;
      if (!path || !MP || path.titles > 0) return P().maxLevel;
      const n = MP.nDiv(), a = MP.area(Math.floor(path.best / n)), caps = a && a.levelCap;
      return caps ? Math.min(P().maxLevel, caps[Math.min(path.best % n, caps.length - 1)]) : P().maxLevel;
    },
    // đang chạm trần level (XP vẫn tích, lên hạng Main Path là lên level)
    levelCapped() { return this.data.level < P().maxLevel && this.data.level >= this.levelCap(); },

    // cộng XP, trả về danh sách level mới đạt được (mỗi level thưởng thêm gold + drill chờ).
    // Chạm trần (levelCap) thì XP vẫn tích lại; lần cộng XP sau khi trần tăng sẽ lên các level còn nợ
    addXp(amount) {
      const d = this.data, ups = [], cap = this.levelCap();
      d.xp += amount;
      while (d.level < cap && d.xp >= this.xpToNext(d.level)) {
        d.xp -= this.xpToNext(d.level);
        d.level++;
        ups.push(d.level);
      }
      if (d.level >= P().maxLevel) d.xp = 0;
      d.attrs.drills.pending += ups.length * D().perLevel;
      return ups;
    },

    /* ---------- túi đồ ---------- */
    // kind: 'item' (costume) | 'core'
    def(kind, id) { return kind === 'core' ? CORES()[id] : ITEMS()[id]; },
    // độ hiếm: costume ở progression.items, Core ở cores.config (dùng chung cho chọn Core trong trận)
    rarityOf(kind, id) {
      if (kind === 'item' && ITEMS()[id] && ITEMS()[id].default) return null;
      if (kind === 'core') return CORES()[id] && SFC_CONFIG.cores.list[id] ? SFC_CONFIG.cores.list[id].rarity : null;
      const d = this.def(kind, id);
      return d ? d.rarity : null;
    },
    count(kind, id) {
      if (kind === 'item' && ITEMS()[id] && ITEMS()[id].default) return Infinity;
      if (kind === 'core' && (!P().coreGacha || P().starterCores.includes(id))) return Infinity;
      return (kind === 'core' ? this.data.cores : this.data.items)[id] || 0;
    },
    owns(id) { return this.count('item', id) > 0; },
    dismantleValue(kind, id) {
      const r = this.rarityOf(kind, id);
      return r ? P().rarities[r].value : 0;
    },

    equip(id) {
      const it = ITEMS()[id];
      if (!it || !this.owns(id)) return false;
      this.data.look[it.slot] = id;
      this.save();
      return true;
    },

    // phân rã 1 món -> gold. Hết món đang mặc -> trả slot về đồ mặc định
    dismantle(kind, id) {
      const bag = kind === 'core' ? this.data.cores : this.data.items;
      if (!(bag[id] > 0)) return 0;
      const gold = this.dismantleValue(kind, id);
      bag[id]--;
      if (!bag[id]) {
        delete bag[id];
        if (kind === 'item') {
          const slot = ITEMS()[id].slot;
          if (this.data.look[slot] === id) this.data.look[slot] = P().defaultLook[slot];
        }
      }
      this.data.gold += gold;
      this.save();
      return gold;
    },

    setColor(key, delta) {
      const n = key === 'skin' ? SKINS().length : P().hairColors.length;
      this.data.look[key] = ((this.data.look[key] + delta) % n + n) % n;
      this.save();
    },

    // look dùng để vẽ (cùng định dạng Player.look): màu da / tóc + kiểu tóc, mặt, giày, hiệu ứng
    lookOf(look = this.data.look) {
      return {
        skin: SKINS()[look.skin] || SKINS()[0],
        hair: P().hairColors[look.hairColor] || P().hairColors[0],
        cut: look.hair, face: look.face, shoes: look.shoes, fx: look.fx,
      };
    },

    /* ---------- hộp gacha ---------- */
    // các món có thể ra từ hộp: [{ kind, id, rarity }]
    boxPool(boxId) {
      const b = P().boxes[boxId];
      if (!b) return [];
      if (b.kind === 'core') {
        return Object.keys(CORES()).filter((id) => SFC_CONFIG.cores.list[id] && b.odds[this.rarityOf('core', id)] != null)
          .map((id) => ({ kind: 'core', id, rarity: this.rarityOf('core', id) }));
      }
      return Object.keys(ITEMS()).filter((id) => !ITEMS()[id].default && b.odds[ITEMS()[id].rarity] != null).map((id) => ({ kind: 'item', id, rarity: ITEMS()[id].rarity }));
    },

    // tỉ lệ thực (%) theo độ hiếm — chỉ tính các độ hiếm thật sự có món trong hộp
    boxOdds(boxId) {
      const b = P().boxes[boxId], pool = this.boxPool(boxId);
      const tiers = P().rarityOrder.filter((r) => b.odds[r] && pool.some((x) => x.rarity === r));
      const total = tiers.reduce((s, r) => s + b.odds[r], 0);
      return tiers.map((r) => ({ rarity: r, pct: (b.odds[r] / total) * 100 }));
    },

    // 1 lượt quay (không trừ gold) — dùng cho kết quả và cho các ô lấp dải quay
    roll(boxId) {
      const pool = this.boxPool(boxId);
      const rarity = weighted(this.boxOdds(boxId).map((o) => ({ w: o.pct, v: o.rarity })));
      const tier = pool.filter((x) => x.rarity === rarity);
      return tier[Math.floor(Math.random() * tier.length)];
    },

    freeBoxes(boxId) { return this.data.boxes[boxId] || 0; },
    addBox(boxId, n = 1) { this.data.boxes[boxId] = this.freeBoxes(boxId) + n; },

    canOpen(boxId) {
      const b = P().boxes[boxId];
      if (!b) return { ok: false, reason: 'missing' };
      if (this.freeBoxes(boxId) > 0) return { ok: true, free: true };   // hộp được tặng: không cần level / gold
      if (b.level > this.data.level) return { ok: false, reason: 'level' };
      if (b.price > this.data.gold) return { ok: false, reason: 'gold' };
      return { ok: true };
    },

    // mở hộp: trừ gold, thêm món vào túi đồ. Trả về { ok, win, reel } (reel = dải ô để UI quay)
    openBox(boxId) {
      const c = this.canOpen(boxId);
      if (!c.ok) return c;
      const d = this.data;
      if (c.free) { if (!--d.boxes[boxId]) delete d.boxes[boxId]; }
      else d.gold -= P().boxes[boxId].price;
      const win = this.roll(boxId);
      const bag = win.kind === 'core' ? d.cores : d.items;
      bag[win.id] = (bag[win.id] || 0) + 1;
      win.count = bag[win.id];
      d.stats.boxes = (d.stats.boxes || 0) + 1;
      this.save();
      const reel = [];
      for (let i = 0; i < P().reelLength; i++) reel.push(i === P().reelWinIndex ? win : this.roll(boxId));
      return { ok: true, win, reel };
    },

    /* ---------- Core ---------- */
    coreLevel(id) { return CORES()[id] ? CORES()[id].level : 1; },
    // Core được bốc khi chọn Core giữa trận:
    //   gacha Core bật: bộ cơ bản + Core trong túi đồ đã đủ level
    //   gacha Core tắt: bộ cơ bản + Core mở khoá bằng Main Path (mainPath.lockCores = false: mọi Core)
    unlockedCores() {
      if (P().coreGacha) return P().starterCores.concat(Object.keys(this.data.cores).filter((id) => this.data.cores[id] > 0 && this.coreLevel(id) <= this.data.level));
      if (!SFC_CONFIG.mainPath.lockCores) return Object.keys(SFC_CONFIG.cores.list);
      return P().starterCores.concat(this.data.path.cores.filter((id) => !P().starterCores.includes(id)));
    },
    coreUnlocked(id) { return this.unlockedCores().includes(id); },

    /* ---------- chỉ số character + DRILL (config: progression.attrs, docs/DRILL_DESIGN.md) ---------- */
    // extra: { id chỉ số: số bước cộng thêm } — xem trước 1 drill trước khi chọn
    rating(id, extra = {}) { return Math.min(A().max, A().base + this.data.attrs.steps[id] + (extra[id] || 0)); },
    ovr(extra = {}) {
      const ids = A().order;
      return Math.round(ids.reduce((s, id) => s + this.rating(id, extra), 0) / ids.length);
    },
    // hệ số trong trận của 1 chỉ số (khoá keys) theo rating
    attrMult(id, key, extra = {}) {
      const w = A().list[id].keys[key];
      return 1 + (this.rating(id, extra) / A().scale - 1) * (w == null ? 1 : w);
    },

    drillsPending() { return this.data.attrs.drills.pending; },
    // số bước drill thật sự cộng được (cắt ở tối đa); chỉ số đã tối đa không có trong kết quả
    drillGains(id) {
      const g = D().list[id].gains, out = {};
      for (const k in g) { const room = A().max - this.rating(k); if (room > 0) out[k] = Math.min(g[k], room); }
      return out;
    },
    // bộ drill đang mời: chưa có thì bốc + lưu. [] = không còn drill chờ
    drillOffer() {
      const dr = this.data.attrs.drills;
      if (dr.pending <= 0) return [];
      if (!dr.offer) {
        dr.offer = this.rollDrills();
        dr.rerolls = 0;
        if (!dr.offer.length) { dr.pending = 0; dr.offer = null; }   // mọi chỉ số đã 99
        this.save();
      }
      return dr.offer || [];
    },
    // bốc `choices` drill không trùng: trọng số theo loại x nghiêng theo build; bảo đảm có drill chạm chỉ số cao nhất
    // và có drill không chạm nó (docs/DRILL_DESIGN.md mục 5). exclude = bộ vừa đổi (hết bài thì cho trùng)
    rollDrills(exclude = []) {
      const L = D().list, steps = this.data.attrs.steps;
      const total = A().order.reduce((s, id) => s + steps[id], 0);
      const open = Object.keys(L).filter((id) => Object.keys(this.drillGains(id)).length);
      const weight = (id) => {
        const share = total ? Object.keys(L[id].gains).reduce((s, k) => s + steps[k], 0) / total : 0;
        return (D().kindWeight[L[id].kind] || 1) * (1 + D().lean * share);
      };
      let pool = open.filter((id) => !exclude.includes(id));
      if (pool.length < D().choices) pool = open.slice();
      const out = [];
      while (out.length < D().choices && pool.length) {
        const id = U().weightedPick(pool, weight);
        out.push(id);
        pool = pool.filter((x) => x !== id);
      }
      if (total > 0 && out.length > 1) {
        const top = A().order.reduce((a, b) => (steps[b] > steps[a] ? b : a));
        const hits = (id) => this.drillGains(id)[top] > 0;
        const cand = (f) => {
          const c = open.filter((id) => !out.includes(id) && f(id));
          const fresh = c.filter((id) => !exclude.includes(id));
          return fresh.length ? fresh : c;
        };
        if (!out.some(hits)) { const c = cand(hits); if (c.length) out[out.length - 1] = U().weightedPick(c, weight); }
        if (out.every(hits)) { const c = cand((id) => !hits(id)); if (c.length) out[0] = U().weightedPick(c, weight); }
      }
      return out;
    },
    rerollsLeft() { const dr = this.data.attrs.drills; return dr.offer ? Math.max(0, D().rerolls - dr.rerolls) : 0; },
    // đổi cả bộ đang mời (giới hạn drills.rerolls lần mỗi drill)
    rerollDrill() {
      const dr = this.data.attrs.drills;
      if (!this.rerollsLeft()) return false;
      dr.offer = this.rollDrills(dr.offer);
      dr.rerolls++;
      this.save();
      return true;
    },
    // chọn drill thứ i của bộ đang mời: cộng chỉ số, bớt 1 drill chờ. Trả về { id, gains } hoặc null
    pickDrill(i) {
      const dr = this.data.attrs.drills, id = dr.offer && dr.offer[i];
      if (!id || dr.pending <= 0) return null;
      const gains = this.drillGains(id);
      for (const k in gains) this.data.attrs.steps[k] += gains[k];
      dr.pending--;
      dr.offer = null;
      dr.rerolls = 0;
      this.save();
      return { id, gains };
    },
    // chỉ số trong trận (Player.stats) của character — Main Path / Luyện tập (main.js) + online (matchPublic)
    avatarStats() {
      const out = {};
      for (const id of A().order) for (const key in A().list[id].keys) out[key] = this.attrMult(id, key);
      return out;
    },

    /* ---------- vào trận ---------- */
    // character đại diện: thay 1 cầu thủ của đội mình (Game opts.avatars; thêm role để chọn vị trí, mặc định ĐÁ CAO)
    avatar() { return { name: this.data.name || 'PLAYER', level: this.data.level, look: this.lookOf() }; },

    // gửi cho đối thủ online (phòng chờ)
    public() { return Object.assign(this.avatar(), { cores: this.unlockedCores() }); },

    // online (giống Main Path): kèm vị trí, chỉ số riêng + OVR của character và đồng đội đang chọn (Mates.spec)
    // role: 'DEF' / 'FWD' · mate: Mates.spec(...) hoặc null
    matchPublic(role, mate) {
      return Object.assign(this.public(), { role, stats: this.avatarStats(), ovr: this.ovr(), mate: mate || null });
    },

    // dữ liệu nhận từ máy khác: chỉ giữ giá trị hợp lệ
    sanitizePublic(pub) {
      if (!pub || typeof pub !== 'object') return null;
      const roles = SFC_CONFIG.game.roles;
      const out = {
        name: this.cleanName(pub.name || '').trim() || 'PLAYER',
        level: clampInt(pub.level, 1, P().maxLevel),
        look: this.sanitizeLook(pub.look),
        cores: Array.isArray(pub.cores) ? pub.cores.filter((id) => SFC_CONFIG.cores.list[id]) : P().starterCores.slice(),
      };
      if (roles.includes(pub.role)) out.role = pub.role;
      const stats = this.sanitizeStats(pub.stats);
      if (stats) { out.stats = stats; out.ovr = clampInt(pub.ovr, 1, 99); }
      if (pub.mate !== undefined) out.mate = this.sanitizeMate(pub.mate);
      return out;
    },

    sanitizeLook(lk) {
      lk = lk || {};
      const okItem = (id, slot) => (ITEMS()[id] && ITEMS()[id].slot === slot ? id : P().defaultLook[slot]);
      const okColor = (c, list) => (list.includes(c) ? c : list[0]);
      return {
        skin: okColor(lk.skin, SKINS()), hair: okColor(lk.hair, P().hairColors),
        cut: okItem(lk.cut, 'hair'), face: okItem(lk.face, 'face'), shoes: okItem(lk.shoes, 'shoes'), fx: okItem(lk.fx, 'fx'),
      };
    },

    // hệ số Player.stats từ máy khác: chỉ các khoá chỉ số có thật (attrs[].keys), kẹp trong khoảng an toàn
    sanitizeStats(s) {
      if (!s || typeof s !== 'object') return null;
      const out = {};
      for (const id of A().order) for (const k in A().list[id].keys) {
        const v = +s[k];
        if (isFinite(v)) out[k] = Math.max(0.3, Math.min(2.5, v));
      }
      return Object.keys(out).length ? out : null;
    },

    // đồng đội (Mates.spec) từ máy khác
    sanitizeMate(m) {
      if (!m || typeof m !== 'object') return null;
      const roles = SFC_CONFIG.game.roles, list = SFC_CONFIG.cores.list;
      return {
        name: String(m.name || 'MATE').replace(/[<>&"']/g, '').slice(0, 12) || 'MATE',
        ovr: clampInt(m.ovr, 1, 99),
        stats: this.sanitizeStats(m.stats),
        deck: Array.isArray(m.deck) ? [...new Set(m.deck.filter((id) => list[id]))].slice(0, 12) : [],
        look: this.sanitizeLook(m.look),
        role: roles.includes(m.role) ? m.role : null,
      };
    },

    /* ---------- thưởng sau trận ---------- */
    // gọi 1 lần khi trận kết thúc (hết giờ / golden goal). Trả về chi tiết để màn kết quả diễn hoạt.
    awardMatch(game) {
      const me = game.humanTeam;
      if (me < 0 || !this.data) return null;
      const d = this.data, R = P().rewards;
      const pvp = game.humans.length > 1;
      // online co-op: mọi người chơi cùng 1 đội đấu đội bot (rewards.coop)
      const coop = !pvp && !!game.opts.online;
      const cfg = pvp ? R.pvp : coop ? R.coop || R.single : R.single;
      const my = game.teams[me].score, op = game.teams[1 - me].score;
      const result = my > op ? 'win' : my < op ? 'lose' : 'draw';
      const goals = Math.min(R.maxGoals, my);
      // nhãn dịch ngay lúc tính thưởng (mỗi máy tự tính cho người chơi của mình)
      const _t = SFC.t, labels = { win: _t('Victory'), draw: _t('Draw'), lose: _t('Defeat') };

      const lines = [{ label: labels[result], xp: cfg[result].xp, gold: cfg[result].gold }];
      if (goals > 0) lines.push({ label: _t('Goals ×{n}', { n: goals }), xp: cfg.goal.xp * goals, gold: cfg.goal.gold * goals });
      // Main Path: cộng / trừ sao, lên / tụt hạng; thắng trận thăng hạng có thưởng thêm; thưởng nhân theo Area
      const mp = !pvp && !coop && game.opts.mainPath;
      const path = mp ? SFC.MainPath.record(result, mp) : null;
      // mốc sao mới ở Area đã mở hết Core: thưởng gold (nhân theo Area như các dòng khác). Hộp lên hạng vào kho hộp miễn phí
      if (path) {
        const starGold = path.rewards.filter((x) => x.kind === 'gold').reduce((sum, x) => sum + x.gold, 0);
        if (starGold) lines.push({ label: _t('New star reward'), xp: 0, gold: starGold });
        path.rewards.filter((x) => x.kind === 'box').forEach((x) => this.addBox(x.id));
      }
      if (path && (path.event === 'area' || path.event === 'title')) {
        const B = SFC_CONFIG.mainPath.promoBonus;
        lines.push({ label: path.event === 'title' ? _t('Champion bonus') : _t('Promotion bonus'), xp: B.xp, gold: B.gold });
      }
      let xp = lines.reduce((s, l) => s + l.xp, 0), gold = lines.reduce((s, l) => s + l.gold, 0);
      if (mp) {
        if (mp.reward !== 1) {
          lines.push({ label: `${SFC.MainPath.area(mp.area).name} ×${mp.reward}`, mult: mp.reward });
          xp = Math.round(xp * mp.reward); gold = Math.round(gold * mp.reward);
        }
      } else if (coop) lines.push({ label: _t('Online co-op'), note: true });
      else if (!pvp) {
        const key = game.opts.difficulty, mult = (cfg.difficulty && cfg.difficulty[key]) || 1;
        if (mult !== 1) {
          const label = (SFC_CONFIG.game.ai.difficulty[key] || {}).label || key;
          lines.push({ label: _t('Difficulty {level} ×{n}', { level: label, n: mult }), mult });
          xp = Math.round(xp * mult); gold = Math.round(gold * mult);
        }
      } else lines.push({ label: _t('Online versus'), note: true });

      // XP hiển thị trên thanh: chạm trần thì thanh đầy, không tràn
      const bar = () => ({ level: d.level, xp: Math.min(d.xp, this.xpToNext(d.level)), need: this.xpToNext(d.level) });
      const before = bar();
      const ups = this.addXp(xp);
      const levelGold = ups.length * P().levelUpGold;
      d.gold += gold + levelGold;
      d.stats.matches++;
      d.stats[result === 'win' ? 'wins' : result === 'lose' ? 'losses' : 'draws']++;
      d.stats.goals += my;
      this.save();

      // hộp vừa mở được + Core trong túi đồ vừa đủ level để dùng
      const reached = (lv) => lv > before.level && lv <= d.level;
      const eligible = P().boxOrder.filter((id) => reached(P().boxes[id].level)).map((id) => P().boxes[id].name)
        .concat(P().coreGacha ? Object.keys(d.cores).filter((id) => reached(this.coreLevel(id))).map((id) => 'Core ' + SFC_CONFIG.cores.list[id].name) : []);

      return {
        result, lines, xp, gold, levelGold, levelUps: ups, eligible, path,
        before, after: bar(), capped: this.levelCapped(),
      };
    },
  };

  SFC.Profile = Profile;
})();
