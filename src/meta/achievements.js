/* Achievements — thành tích (danh sách: config/achievements.config.js, UI: src/ui/achievements.js).
 * Tiến độ tính thẳng từ hồ sơ (SFC.Profile.data: stats, path, items...), không có bộ đếm riêng.
 * Hồ sơ chỉ lưu id thành tích đã nhận thưởng: Profile.data.ach = [id...].
 * Nhận thưởng: costume -> túi đồ (cộng dồn như mở hộp) · hộp -> hộp miễn phí ở SHOP (Profile.addBox).
 */
window.SFC = window.SFC || {};

(function () {
  const C = () => SFC_CONFIG.achievements || { list: [], groups: {} };
  const PF = () => SFC.Profile;
  const PROG = () => SFC_CONFIG.progression;

  const Achievements = {
    list() { return C().list; },
    get(id) { return C().list.find((a) => a.id === id) || null; },
    group(a) { return C().groups[a.group] || { icon: 'ui-trophy', color: '#ffe14f' }; },

    // số cần đạt ('all' = toàn bộ Core thường)
    target(a) {
      if (a.target !== 'all') return a.target;
      const L = SFC_CONFIG.cores.list;
      return Object.keys(L).filter((id) => L[id].role !== 'ult').length;
    },
    // giá trị hiện tại của chỉ số mà thành tích theo dõi
    value(a) {
      const d = PF().data, st = d.stats || {}, path = d.path || {};
      switch (a.stat) {
        case 'matches': return st.matches || 0;
        case 'wins': return st.wins || 0;
        case 'goals': return st.goals || 0;
        case 'boxes': return st.boxes || 0;
        case 'level': return d.level;
        case 'elo': return path.peak || 0;
        case 'area': return (path.best || 0) + 1;
        case 'cores': return PF().collection().length;
        case 'ults': return PF().ownedUlts().length;
        case 'outfits': return Object.keys(d.items).filter((id) => d.items[id] > 0).length;
        case 'core': return PF().coreUnlocked(a.core) ? 1 : 0;
        default: return 0;
      }
    },
    claimed(a) { return PF().data.ach.includes(a.id); },
    // { value, target, pct, done, claimed }
    progress(a) {
      const target = Math.max(1, this.target(a)), value = Math.min(target, this.value(a));
      return { value, target, pct: value / target, done: value >= target, claimed: this.claimed(a) };
    },
    // xong nhưng chưa nhận thưởng
    claimable() { return this.list().filter((a) => !this.claimed(a) && this.progress(a).done); },
    count() { return { done: this.list().filter((a) => this.claimed(a)).length, total: this.list().length }; },

    // tên phần thưởng (đã dịch): "Headphones" · "Street Box ×2"
    rewardName(r) {
      if (r.item) return (PROG().items[r.item] || {}).name || r.item;
      const b = PROG().boxes[r.box] || {};
      return (r.n || 1) > 1 ? `${b.name} ×${r.n}` : b.name;
    },
    // màu phần thưởng: độ hiếm costume / màu hộp
    rewardColor(r) {
      if (r.item) { const it = PROG().items[r.item]; return (PROG().rarities[it && it.rarity] || {}).color || '#e6dccb'; }
      return (PROG().boxes[r.box] || {}).color || '#e6dccb';
    },

    // nhận thưởng 1 thành tích (đã xong, chưa nhận). Trả về reward hoặc null
    claim(id) {
      const a = this.get(id), d = PF().data;
      if (!a || this.claimed(a) || !this.progress(a).done) return null;
      const r = a.reward || {};
      if (r.item && PROG().items[r.item]) d.items[r.item] = (d.items[r.item] || 0) + 1;
      if (r.box && PROG().boxes[r.box]) PF().addBox(r.box, r.n || 1);
      d.ach.push(a.id);
      PF().save();
      return r;
    },
  };

  SFC.Achievements = Achievements;
})();
