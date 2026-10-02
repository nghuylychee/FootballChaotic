/* MainPath — tiến trình chính của Single player: Area > Division > sao (số liệu ở config/mainpath.config.js).
 * Trạng thái lưu trong hồ sơ (SFC.Profile.data.path):
 *   { area, id, div, stars, titles, best, peak, cores, fresh }  — id = id Area (dùng khi tải lại hồ sơ); div 0 = hạng thấp nhất của Area (III), div n-1 = hạng I;
 *   best = hạng cao nhất từng đạt (area * n + div); titles = số lần vô địch (thắng chung kết Area cuối);
 *   peak = vị trí sao cao nhất từng đạt (đếm sao từ đầu Main Path, xem pos); cores = Core đã mở khoá bằng Main Path;
 *   fresh = Core vừa mở, chưa hiện ở lượt chọn Core nào (lá có nhãn NEW, được ưu tiên bốc)
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
    blank() { return { area: 0, id: this.areas()[0].id, div: 0, stars: 0, titles: 0, best: 0, peak: 0, cores: [], fresh: [] }; },

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
      // mở khoá Core: hồ sơ cũ (chưa có peak) tính từ hạng cao nhất từng đạt
      const bestPos = this.pos(Math.floor(d.best / this.nDiv()), d.best % this.nDiv(), 0);
      d.peak = Math.max(this.pos(d.area, d.div, d.stars), bestPos, clampInt(raw.peak, 0, this.pos(this.areas().length, 0, 0)));
      const known = (id) => !!SFC_CONFIG.cores.list[id];
      d.cores = Array.isArray(raw.cores) ? [...new Set(raw.cores.filter(known))] : [];
      d.fresh = Array.isArray(raw.fresh) ? raw.fresh.filter((id) => d.cores.includes(id)) : [];
      this.backfill(d);
      return d;
    },

    /* ---------- mở khoá Core ---------- */
    // vị trí sao tính từ đầu Main Path: tổng sao của các Area / hạng đã qua + sao hiện tại
    pos(a, d, s) {
      let n = 0;
      for (let i = 0; i < a && i < this.areas().length; i++) n += this.areaStars(i);
      for (let j = 0; j < d; j++) n += this.need(a, j);
      return n + s;
    },
    areaStars(a) { let n = 0; for (let d = 0; d < this.nDiv(); d++) n += this.need(a, d); return n; },
    // Area chứa mốc sao thứ p (p tính từ 1)
    areaOfPos(p) {
      let n = 0;
      for (let a = 0; a < this.areas().length; a++) { n += this.areaStars(a); if (p <= n) return a; }
      return this.areas().length - 1;
    },
    starsReached(d, a) { return Math.max(0, Math.min(this.areaStars(a), d.peak - this.pos(a, 0, 0))); },

    // Core mở được bằng sao trong Area a còn khoá
    lockedIn(a, d = this.state) { return (this.area(a).cores || []).filter((id) => SFC_CONFIG.cores.list[id] && !d.cores.includes(id)); },
    unlock(d, id, fresh = true) {
      if (!id || d.cores.includes(id)) return false;
      d.cores.push(id);
      if (fresh) d.fresh.push(id);
      return true;
    },

    // hồ sơ cũ / đổi config: cấp bù Core cho mọi mốc đã vượt (không hiện màn mở thẻ)
    backfill(d) {
      for (let a = 0; a < this.areas().length; a++) {
        const want = Math.min((this.area(a).cores || []).length, this.starsReached(d, a));
        let have = (this.area(a).cores || []).filter((id) => d.cores.includes(id)).length;
        while (have < want) { const pool = this.lockedIn(a, d); if (!pool.length) break; this.unlock(d, U().pick(pool), false); have++; }
        const beaten = a < d.area || (a === this.areas().length - 1 && d.titles > 0);
        if (beaten) this.unlock(d, this.area(a).signature, false);
      }
    },

    // nguồn mở khoá của 1 Core: { kind: starter | star | boss | none, area }
    coreSource(id) {
      if (SFC_CONFIG.progression.starterCores.includes(id)) return { kind: 'starter' };
      const i = this.areas().findIndex((a) => a.signature === id);
      if (i >= 0) return { kind: 'boss', area: i };
      const j = this.areas().findIndex((a) => (a.cores || []).includes(id));
      return j >= 0 ? { kind: 'star', area: j } : { kind: 'none' };
    },

    // phần thưởng của hạng d ở Area a (bản đồ Main Path): số sao ra Core / ra gold (đã nhận bao nhiêu), hộp khi lên hạng
    divPlan(a, d, st = this.state) {
      const need = this.need(a, d), base = this.pos(a, d, 0), inArea = base - this.pos(a, 0, 0);
      const cores = Math.max(0, Math.min(need, (this.area(a).cores || []).length - inArea));
      const got = Math.max(0, Math.min(need, st.peak - base));
      const box = d < this.nDiv() - 1 ? this.area(a).divBox : null;
      return { cores, coresGot: Math.min(cores, got), gold: need - cores, goldGot: Math.max(0, got - cores), box, boxGot: !!box && st.best >= this.rank(a, d + 1) };
    },

    // cách mở 1 Core còn khoá (túi đồ, màn kết quả)
    unlockHint(id) {
      // Area chưa tới: không lộ tên Area / boss (bản đồ đang hiện ???)
      const src = this.coreSource(id), seen = src.area <= this.state.area;
      if (src.kind === 'star') return `Win stars in AREA ${src.area + 1}${seen ? ' · ' + this.area(src.area).name : ''}`;
      if (src.kind === 'boss') {
        const A = this.area(src.area), stage = src.area === this.areas().length - 1 ? 'final' : 'promotion';
        return seen ? `Beat ${this.team(A.boss).name} · AREA ${src.area + 1} ${stage}` : `Beat the AREA ${src.area + 1} boss in the ${stage}`;
      }
      return 'Not available yet';
    },

    // Core đã xuất hiện ở lượt chọn -> bỏ nhãn NEW
    seen(id) {
      const f = this.state.fresh, i = f.indexOf(id);
      if (i < 0) return;
      f.splice(i, 1);
      SFC.Profile.save();
    },

    // thưởng lần đầu đạt mốc (gọi trong record): sao mới -> Core của Area (hết thì gold), lên hạng -> hộp costume, sang Area / vô địch -> Core của boss
    claim(st, event, bestBefore) {
      const cfg = C(), out = [];
      const now = this.pos(st.area, st.div, st.stars);
      for (let p = st.peak + 1; p <= now; p++) {
        const a = this.areaOfPos(p), pool = this.lockedIn(a, st);
        if (pool.length) { const id = U().pick(pool); this.unlock(st, id); out.push({ kind: 'core', id, src: 'star', area: a }); }
        else out.push({ kind: 'gold', gold: cfg.starGold, area: a });
      }
      st.peak = Math.max(st.peak, now);
      if (event === 'up' && this.rank(st.area, st.div) > bestBefore) {
        const box = this.area(st.area).divBox;
        if (box && SFC_CONFIG.progression.boxes[box]) out.push({ kind: 'box', id: box, area: st.area, div: st.div });
      }
      const beat = event === 'area' && this.rank(st.area, 0) > bestBefore ? st.area - 1 : event === 'title' && st.titles === 1 ? st.area : -1;
      if (beat >= 0) {
        const A = this.area(beat), id = A.signature;
        if (this.unlock(st, id)) out.push({ kind: 'core', id, src: 'boss', area: beat, boss: A.boss });
      }
      return out;
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

    // bản DEMO (itch.io, config/demo.config.js): Area a có bị khoá không · đã tới Area bị khoá (hết demo) chưa
    demoLocked(a) { return SFC_DEMO && a >= SFC_CONFIG.demo.areas; },
    demoOver(st = this.state) { return this.demoLocked(st.area); },

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
        away: promo ? A.boss : U().pick(A.teams), signature: A.signature,
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
      const before = { area: st.area, div: st.div, stars: st.stars }, bestBefore = st.best;
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
      const rewards = this.claim(st, event, bestBefore);
      SFC.Profile.save();
      return { before, after: { area: st.area, div: st.div, stars: st.stars }, delta, event, rewards };
    },
  };

  SFC.MainPath = MainPath;
})();
