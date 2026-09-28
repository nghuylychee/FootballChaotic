/* MainPath — tiến trình chính của Single player: Area > Division > sao (số liệu ở config/mainpath.config.js).
 * Trạng thái lưu trong hồ sơ (SFC.Profile.data.path):
 *   { area, id, div, stars, titles, best }  — id = id Area (dùng khi tải lại hồ sơ); div 0 = hạng thấp nhất của Area (III), div n-1 = hạng I;
 *   best = hạng cao nhất từng đạt (area * n + div); titles = số lần vô địch (thắng chung kết Area cuối)
 * Trận thăng hạng không lưu riêng: đang ở hạng I và đủ sao = trận kế tiếp là trận thăng hạng.
 */
window.SFC = window.SFC || {};

(function () {
  const C = () => SFC_CONFIG.mainPath;
  const U = () => SFC.U;
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(+v || 0)));
  // thứ tự Area của bản đầu (hồ sơ lưu số thứ tự, chưa lưu id)
  const LEGACY = ['alley', 'rooftop', 'market', 'harbor', 'cyber'];

  const MainPath = {
    blank() { return { area: 0, id: this.areas()[0].id, div: 0, stars: 0, titles: 0, best: 0 }; },

    // dữ liệu hồ sơ cũ / hỏng -> giá trị hợp lệ (đổi config số Area / hạng / sao vẫn không vỡ).
    // Area tìm theo id (thêm / đổi thứ tự Area không đẩy người chơi sang Area khác);
    // hồ sơ cũ chỉ có số thứ tự -> tra theo LEGACY (thứ tự 5 Area bản đầu)
    sanitize(raw) {
      const d = this.blank();
      if (!raw || typeof raw !== 'object') return d;
      const ids = this.areas().map((a) => a.id);
      const legacyId = raw.id == null && raw.area != null ? LEGACY[clampInt(raw.area, 0, LEGACY.length - 1)] : null;
      const idx = ids.indexOf(raw.id != null ? raw.id : legacyId);
      d.area = idx >= 0 ? idx : clampInt(raw.area, 0, ids.length - 1);
      d.id = ids[d.area];
      // best cũ (theo thứ tự cũ) không còn đúng khi chèn Area mới -> tối thiểu là hạng hiện tại
      if (legacyId) raw = Object.assign({}, raw, { best: 0 });
      d.div = clampInt(raw.div, 0, this.nDiv() - 1);
      // đủ sao chỉ hợp lệ ở hạng cao nhất (chờ đá thăng hạng); hạng dưới thì đủ sao đã phải lên hạng
      d.stars = clampInt(raw.stars, 0, this.need(d.area, d.div) - (d.div < this.nDiv() - 1 ? 1 : 0));
      d.titles = clampInt(raw.titles, 0, 1e6);
      d.best = Math.max(this.rank(d.area, d.div), clampInt(raw.best, 0, this.rank(this.areas().length - 1, this.nDiv() - 1)));
      return d;
    },

    get state() { return SFC.Profile.data.path; },
    areas() { return C().areas; },
    area(i) { return C().areas[i]; },
    nDiv() { return C().divisionsPerArea; },
    rank(a, d) { return a * this.nDiv() + d; },
    // số sao cần để qua hạng d của Area a
    need(a, d) { const s = this.area(a).stars; return s[Math.min(d, s.length - 1)]; },
    divLabel(d) { return ROMAN[this.nDiv() - 1 - d] || String(this.nDiv() - d); },
    divName(a, d) { return `${this.area(a).name} ${this.divLabel(d)}`; },
    team(id) { return SFC_CONFIG.teams.list[id]; },

    isPromo(st = this.state) { return st.div === this.nDiv() - 1 && st.stars >= this.need(st.area, st.div); },
    isFinal(st = this.state) { return this.isPromo(st) && st.area === this.areas().length - 1; },

    // độ khó AI đối thủ: nội suy giữa hạng thấp nhất và cao nhất của Area; trận thăng hạng dùng bossAi
    aiProfile(a, d, promo) {
      const A = this.area(a);
      if (promo) return Object.assign({}, A.bossAi);
      const t = this.nDiv() > 1 ? d / (this.nDiv() - 1) : 1, [lo, hi] = A.ai, out = {};
      for (const k in lo) out[k] = U().lerp(lo[k], hi[k], t);
      return out;
    },

    // trận kế tiếp theo trạng thái hiện tại: đối thủ, độ khó, sân
    nextMatch() {
      const st = this.state, A = this.area(st.area), promo = this.isPromo(st);
      return {
        area: st.area, div: st.div, promo, final: this.isFinal(st), reward: A.reward, arena: A.arena,
        away: promo ? A.boss : U().pick(A.teams),
        aiProfile: this.aiProfile(st.area, st.div, promo),
      };
    },

    // costume + màu của cầu thủ thứ idx trong đội (vẽ ở menu, giống Player)
    teamLook(id, idx) {
      const t = this.team(id), skins = SFC_CONFIG.teams.skins, L = (t.looks && t.looks[idx]) || {};
      return {
        skin: skins[(L.skin != null ? L.skin : idx) % skins.length], hair: t.kit.hair[idx % t.kit.hair.length],
        cut: L.cut, face: L.face, shoes: L.shoes, fx: L.fx,
      };
    },

    /**
     * Ghi kết quả 1 trận Main Path. result: win | draw | lose; info = game.opts.mainPath (bối cảnh lúc vào trận).
     * Trả về { before, after, delta, event } — event: up (lên hạng) · down (tụt hạng) · ready (đủ sao, trận kế là thăng hạng) ·
     *   area (thắng thăng hạng, sang Area mới) · title (vô địch Area cuối) · promoFail (thua thăng hạng) · null
     */
    record(result, info) {
      const cfg = C(), st = this.state, n = this.nDiv(), last = this.areas().length - 1;
      const before = { area: st.area, div: st.div, stars: st.stars };
      let delta = 0, event = null;
      if (info && info.promo && this.isPromo(st)) {
        if (result === 'win') {
          if (st.area < last) { st.area++; st.div = 0; st.stars = 0; event = 'area'; }
          else { st.titles++; st.stars = 0; event = 'title'; }   // vô địch: leo lại hạng I của Area cuối để đá chung kết tiếp
        } else if (result === 'lose') {
          delta = -Math.min(st.stars, cfg.promoLoseStars);
          st.stars += delta;
          event = 'promoFail';
        }
      } else {
        const gain = result === 'win' ? cfg.starWin : result === 'draw' ? cfg.starDraw : -cfg.starLose;
        if (gain > 0) {
          const need = this.need(st.area, st.div);
          delta = Math.min(gain, need - st.stars);
          st.stars += delta;
          if (st.stars >= need) {
            if (st.div < n - 1) { st.div++; st.stars = 0; event = 'up'; }
            else event = 'ready';
          }
        } else if (gain < 0) {
          if (st.stars > 0) { delta = -Math.min(st.stars, -gain); st.stars += delta; }
          else if (st.div > 0) {
            // tụt hạng trong cùng Area (hạng thấp nhất của Area là mốc an toàn)
            st.div--;
            st.stars = Math.max(0, this.need(st.area, st.div) - 1);
            delta = -1;
            event = 'down';
          }
        }
      }
      st.best = Math.max(st.best, this.rank(st.area, st.div));
      st.id = this.area(st.area).id;
      SFC.Profile.save();
      return { before, after: { area: st.area, div: st.div, stars: st.stars }, delta, event };
    },
  };

  SFC.MainPath = MainPath;
})();
