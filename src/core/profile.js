/* Profile — hồ sơ người chơi tại máy này: tên, level, XP, gold, túi đồ (costume + Core), thống kê.
 * Costume / Core lấy từ hộp gacha (openBox), trùng thì cộng số lượng, phân rã (dismantle) ra gold.
 * Lưu ở localStorage (config/progression.config.js -> storageKey). Mọi đọc / ghi đều bọc try/catch:
 * trình duyệt chặn storage thì game vẫn chạy, chỉ là không lưu được tiến trình.
 */
window.SFC = window.SFC || {};

(function () {
  const P = () => SFC_CONFIG.progression;
  const ITEMS = () => P().items;
  const CORES = () => P().cores;
  const SKINS = () => SFC_CONFIG.teams.skins;
  const A = () => P().attrs;
  const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(+v || 0)));

  function blank() {
    return {
      v: 2, name: '', level: 1, xp: 0, gold: P().startGold,
      items: {}, cores: {},          // id -> số lượng trong túi đồ
      look: Object.assign({}, P().defaultLook),
      stats: { matches: 0, wins: 0, draws: 0, losses: 0, goals: 0, boxes: 0 },
      attrs: blankAttrs(),
    };
  }

  // chỉ số character: steps = số bước đã cộng của từng chỉ số (rating = base + steps), bonus = điểm thưởng ngoài level
  function blankAttrs() {
    const steps = {};
    for (const id of A().order) steps[id] = 0;
    return { steps, bonus: 0, milestones: {} };
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
      try { raw = JSON.parse(localStorage.getItem(P().storageKey) || 'null'); } catch (e) { raw = null; }
      this.data = this.sanitize(raw);
      return this.data;
    },

    save() {
      try { localStorage.setItem(P().storageKey, JSON.stringify(this.data)); } catch (e) { /* storage bị chặn */ }
    },

    // dữ liệu hỏng / phiên bản cũ -> ghép với hồ sơ trống, bỏ id không còn tồn tại
    sanitize(raw) {
      const d = blank();
      d.path = SFC.MainPath.sanitize(raw && raw.path);   // tiến trình Main Path (src/core/mainpath.js)
      if (!raw || typeof raw !== 'object') return d;
      d.name = this.cleanName(raw.name || '');
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
      const lk = raw.look || {};
      for (const slot of Object.keys(P().slots)) {
        const id = lk[slot];
        if (ITEMS()[id] && ITEMS()[id].slot === slot && (ITEMS()[id].default || d.items[id] > 0)) d.look[slot] = id;
      }
      d.look.skin = clampInt(lk.skin, 0, SKINS().length - 1);
      d.look.hairColor = clampInt(lk.hairColor, 0, P().hairColors.length - 1);
      Object.assign(d.stats, raw.stats || {});
      // chỉ số: bước ngoài khoảng -> kẹp lại; tổng giá vượt số điểm có (đổi config) -> trả hết điểm
      const ra = raw.attrs || {}, rs = ra.steps || {};
      for (const id of A().order) d.attrs.steps[id] = clampInt(rs[id], 0, A().max - A().base);
      d.attrs.bonus = Math.max(0, Math.floor(+ra.bonus || 0));
      if (ra.milestones && typeof ra.milestones === 'object') Object.assign(d.attrs.milestones, ra.milestones);
      if (this.spentPoints(d.attrs.steps) > this.pointsEarned(d)) d.attrs.steps = blankAttrs().steps;
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

    // cộng XP, trả về danh sách level mới đạt được (mỗi level thưởng thêm gold)
    addXp(amount) {
      const d = this.data, ups = [];
      d.xp += amount;
      while (d.level < P().maxLevel && d.xp >= this.xpToNext(d.level)) {
        d.xp -= this.xpToNext(d.level);
        d.level++;
        ups.push(d.level);
      }
      if (d.level >= P().maxLevel) d.xp = 0;
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

    canOpen(boxId) {
      const b = P().boxes[boxId];
      if (!b) return { ok: false, reason: 'missing' };
      if (b.level > this.data.level) return { ok: false, reason: 'level' };
      if (b.price > this.data.gold) return { ok: false, reason: 'gold' };
      return { ok: true };
    },

    // mở hộp: trừ gold, thêm món vào túi đồ. Trả về { ok, win, reel } (reel = dải ô để UI quay)
    openBox(boxId) {
      const c = this.canOpen(boxId);
      if (!c.ok) return c;
      const d = this.data;
      d.gold -= P().boxes[boxId].price;
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
    // Core được bốc khi chọn Core giữa trận: bộ cơ bản + Core trong túi đồ đã đủ level
    unlockedCores() {
      if (!P().coreGacha) return Object.keys(SFC_CONFIG.cores.list);   // gacha Core tắt: mọi Core đều dùng được
      return P().starterCores.concat(Object.keys(this.data.cores).filter((id) => this.data.cores[id] > 0 && this.coreLevel(id) <= this.data.level));
    },

    /* ---------- chỉ số character (config: progression.attrs) ---------- */
    // pending: { id: số bước đang cộng thử, chưa xác nhận } — trang STATS dùng để xem trước
    // giá 1 bước để đạt rating r
    stepCost(r) {
      const t = A().tierCost.find(([upTo]) => r <= upTo);
      return t ? t[1] : Infinity;
    },
    // tổng điểm đã tiêu cho bộ bước steps
    spentPoints(steps = this.data.attrs.steps) {
      let sum = 0;
      for (const id of A().order) for (let i = 1; i <= (steps[id] || 0); i++) sum += this.stepCost(A().base + i);
      return sum;
    },
    pointsEarned(d = this.data) { return (d.level - 1) * A().pointsPerLevel + d.attrs.bonus; },
    // điểm còn lại sau khi tính cả các bước đang cộng thử
    pointsFree(pending = {}) {
      const steps = {};
      for (const id of A().order) steps[id] = this.data.attrs.steps[id] + (pending[id] || 0);
      return this.pointsEarned() - this.spentPoints(steps);
    },
    rating(id, pending = {}) { return A().base + this.data.attrs.steps[id] + (pending[id] || 0); },
    // giá bước kế tiếp (0 = đã tối đa)
    nextCost(id, pending = {}) {
      const r = this.rating(id, pending);
      return r >= A().max ? 0 : this.stepCost(r + 1);
    },
    ovr(pending = {}) {
      const ids = A().order;
      return Math.round(ids.reduce((s, id) => s + this.rating(id, pending), 0) / ids.length);
    },
    // hệ số trong trận của 1 chỉ số (khoá keys) theo rating
    attrMult(id, key, pending = {}) {
      const w = A().list[id].keys[key];
      return 1 + (this.rating(id, pending) / A().scale - 1) * (w == null ? 1 : w);
    },
    // xác nhận các bước cộng thử. Trả về false nếu không đủ điểm / vượt tối đa
    commitSteps(pending) {
      if (this.pointsFree(pending) < 0) return false;
      if (A().order.some((id) => (pending[id] || 0) < 0 || this.rating(id, pending) > A().max)) return false;
      for (const id of A().order) this.data.attrs.steps[id] += pending[id] || 0;
      this.save();
      return true;
    },
    respecCost() { return A().respecGold.base + A().respecGold.perLevel * this.data.level; },
    // trả lại toàn bộ điểm, mất gold. { ok, reason: empty | gold, cost }
    respec() {
      const cost = this.respecCost();
      if (!this.spentPoints()) return { ok: false, reason: 'empty', cost };
      if (this.data.gold < cost) return { ok: false, reason: 'gold', cost };
      this.data.gold -= cost;
      this.data.attrs.steps = blankAttrs().steps;
      this.save();
      return { ok: true, cost };
    },
    // chỉ số trong trận (Player.stats) của character — chỉ Main Path / Luyện tập (main.js), online không gửi
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

    // dữ liệu nhận từ máy khác: chỉ giữ giá trị hợp lệ
    sanitizePublic(pub) {
      if (!pub || typeof pub !== 'object') return null;
      const lk = pub.look || {};
      const okItem = (id, slot) => (ITEMS()[id] && ITEMS()[id].slot === slot ? id : P().defaultLook[slot]);
      const okColor = (c, list) => (list.includes(c) ? c : list[0]);
      return {
        name: this.cleanName(pub.name || '').trim() || 'PLAYER',
        level: clampInt(pub.level, 1, P().maxLevel),
        look: {
          skin: okColor(lk.skin, SKINS()), hair: okColor(lk.hair, P().hairColors),
          cut: okItem(lk.cut, 'hair'), face: okItem(lk.face, 'face'), shoes: okItem(lk.shoes, 'shoes'), fx: okItem(lk.fx, 'fx'),
        },
        cores: Array.isArray(pub.cores) ? pub.cores.filter((id) => SFC_CONFIG.cores.list[id]) : P().starterCores.slice(),
      };
    },

    /* ---------- thưởng sau trận ---------- */
    // gọi 1 lần khi trận kết thúc (hết giờ / golden goal). Trả về chi tiết để màn kết quả diễn hoạt.
    awardMatch(game) {
      const me = game.humanTeam;
      if (me < 0 || !this.data) return null;
      const d = this.data, R = P().rewards;
      const pvp = game.humans.length > 1;
      const cfg = pvp ? R.pvp : R.single;
      const my = game.teams[me].score, op = game.teams[1 - me].score;
      const result = my > op ? 'win' : my < op ? 'lose' : 'draw';
      const goals = Math.min(R.maxGoals, my);
      const labels = { win: 'Victory', draw: 'Draw', lose: 'Defeat' };

      const lines = [{ label: labels[result], xp: cfg[result].xp, gold: cfg[result].gold }];
      if (goals > 0) lines.push({ label: `Goals ×${goals}`, xp: cfg.goal.xp * goals, gold: cfg.goal.gold * goals });
      // Main Path: cộng / trừ sao, lên / tụt hạng; thắng trận thăng hạng có thưởng thêm; thưởng nhân theo Area
      const mp = !pvp && game.opts.mainPath;
      const path = mp ? SFC.MainPath.record(result, mp) : null;
      if (path && (path.event === 'area' || path.event === 'title')) {
        const B = SFC_CONFIG.mainPath.promoBonus;
        lines.push({ label: path.event === 'title' ? 'Champion bonus' : 'Promotion bonus', xp: B.xp, gold: B.gold });
      }
      let xp = lines.reduce((s, l) => s + l.xp, 0), gold = lines.reduce((s, l) => s + l.gold, 0);
      if (mp) {
        if (mp.reward !== 1) {
          lines.push({ label: `${SFC.MainPath.area(mp.area).name} ×${mp.reward}`, mult: mp.reward });
          xp = Math.round(xp * mp.reward); gold = Math.round(gold * mp.reward);
        }
      } else if (!pvp) {
        const key = game.opts.difficulty, mult = (cfg.difficulty && cfg.difficulty[key]) || 1;
        if (mult !== 1) {
          const label = (SFC_CONFIG.game.ai.difficulty[key] || {}).label || key;
          lines.push({ label: `Difficulty ${label} ×${mult}`, mult });
          xp = Math.round(xp * mult); gold = Math.round(gold * mult);
        }
      } else lines.push({ label: 'Online versus', note: true });

      const before = { level: d.level, xp: d.xp, need: this.xpToNext(d.level) };
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
        before, after: { level: d.level, xp: d.xp, need: this.xpToNext(d.level) },
      };
    },
  };

  SFC.Profile = Profile;
})();
