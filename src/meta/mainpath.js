/* MainPath — tiến trình chính kiểu Clash Royale xếp theo Elo (số liệu ở config/mainpath.config.js).
 * Trạng thái lưu trong hồ sơ (SFC.Profile.data.path):
 *   { elo, peak, area, id, best, cores, fresh } — area = Area theo Elo hiện tại (id dùng để đọc lại); peak = Elo cao nhất từng đạt;
 *   best = Area cao nhất từng tới (mở Tuyệt kỹ, sân online, scout); cores = Core + Tuyệt kỹ đã mở bằng Main Path (Core Road);
 *   fresh = Core vừa mở, chưa hiện ở lượt chọn Core nào (lá có nhãn NEW, được ưu tiên bốc) / Tuyệt kỹ vừa mở chưa xem (NEW ở ULTIMATE);
 *   pending = { myElo, oppElo } trận xếp hạng đang đá dở (begin): tắt game / mất kết nối giữa trận -> lần chạy sau tính thua (settle)
 * Tìm trận: máy chủ riêng ghép người thật (src/net/matchmaker.js) khi có; không thì matchmake() sinh 3 người chơi giả (bot)
 * quanh Elo của bạn, ưu tiên cùng Area.
 */
window.SFC = window.SFC || {};

(function () {
  const C = () => SFC_CONFIG.mainPath;
  const U = () => SFC.U;
  const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(+v || 0)));
  const rnd = (a, b) => a + Math.random() * (b - a);
  // thứ tự Area của bản đầu (hồ sơ lưu số thứ tự, chưa lưu id)
  const LEGACY = ['alley', 'rooftop', 'market', 'harbor', 'cyber'];
  const OLD_DIVS = 3;   // số hạng mỗi Area của bản Area > hạng > sao (đổi hồ sơ cũ sang Elo)

  const MainPath = {
    blank() {
      const elo = Math.max(0, C().elo.start | 0), a = this.areaOf(elo);
      return { elo, peak: elo, area: a, id: this.area(a).id, best: a, cores: [], fresh: [] };
    },

    // dữ liệu hồ sơ cũ / hỏng -> giá trị hợp lệ. Hồ sơ bản Area > hạng > sao (chưa có elo): Elo = đầu Area + phần hạng đã leo
    sanitize(raw) {
      const d = this.blank();
      if (!raw || typeof raw !== 'object') return d;
      const known = (id) => !!SFC_CONFIG.cores.list[id];
      d.cores = Array.isArray(raw.cores) ? [...new Set(raw.cores.filter(known))] : [];
      d.fresh = Array.isArray(raw.fresh) ? raw.fresh.filter((id) => d.cores.includes(id)) : [];
      const last = this.areas().length - 1;
      if (raw.elo != null) {
        d.elo = clampInt(raw.elo, 0, 1e6);
        d.best = clampInt(raw.best, 0, last);
      } else {
        const ids = this.areas().map((a) => a.id);
        const legacyId = raw.id == null && raw.area != null ? LEGACY[clampInt(raw.area, 0, LEGACY.length - 1)] : null;
        const idx = ids.indexOf(raw.id != null ? raw.id : legacyId);
        const a = idx >= 0 ? idx : clampInt(raw.area, 0, last);
        const div = clampInt(raw.div, 0, OLD_DIVS - 1);
        d.elo = this.area(a).elo + Math.round((div / OLD_DIVS) * this.span(a));
        d.best = legacyId ? a : Math.max(a, clampInt(Math.floor((+raw.best || 0) / OLD_DIVS), 0, last));
      }
      d.peak = Math.max(d.elo, clampInt(raw.peak != null && raw.elo != null ? raw.peak : 0, 0, 1e6), this.area(d.best).elo);
      d.area = this.areaOf(d.elo);
      d.best = Math.max(d.best, d.area);
      d.id = this.area(d.area).id;
      const p = raw.pending;
      if (p && typeof p === 'object' && isFinite(+p.myElo) && isFinite(+p.oppElo)) d.pending = { myElo: Math.max(0, +p.myElo), oppElo: Math.max(0, +p.oppElo) };
      this.backfill(d);
      return d;
    },

    /* ---------- Elo / Area ---------- */
    get state() { return SFC.Profile.data.path; },
    areas() { return C().areas; },
    area(i) { return C().areas[i]; },
    team(id) { return SFC_CONFIG.teams.list[id]; },
    // Area theo Elo: Area cao nhất có ngưỡng <= Elo
    areaOf(elo) {
      let a = 0;
      this.areas().forEach((A, i) => { if (elo >= A.elo) a = i; });
      return a;
    },
    // độ rộng khoảng Elo của Area a (Area cuối: elo.lastSpan)
    span(a) {
      const next = this.area(a + 1);
      return Math.max(1, next ? next.elo - this.area(a).elo : C().elo.lastSpan);
    },
    // vị trí trong Area: 0 = vừa vào, 1 = sắp lên Area kế (Area cuối: có thể > 1)
    frac(elo, a = this.areaOf(elo)) { return (elo - this.area(a).elo) / this.span(a); },
    // Elo dạng chữ cho chỗ không vẽ được icon (thông báo, gợi ý): ★ + số. Chỗ có HTML dùng SFC.PixelIcon.elo(n)
    stars(n) { return '★' + n; },
    // ngưỡng Elo của Area kế tiếp (null ở Area cuối)
    nextElo(a = this.state.area) { const n = this.area(a + 1); return n ? n.elo : null; },

    /* ---------- Core Road: Core thường mở theo Elo cao nhất từng đạt (areas[].road) ---------- */
    // Elo mở nấc i của Area a (cùng cách chia nấc với levelCap: nấc 0 = lúc vào Area)
    roadElo(a, i) {
      const n = Math.max(1, (this.area(a).road || []).length);
      return this.area(a).elo + Math.ceil((i / n) * this.span(a));
    },
    // mọi mốc đã mở ở mức Elo: [{ id, area, step, elo }]
    roadAt(elo) {
      const out = [];
      this.areas().forEach((A, a) => {
        if (A.elo > elo) return;
        (A.road || []).forEach((ids, i) => {
          const e = this.roadElo(a, i);
          if (e <= elo) for (const id of ids) out.push({ id, area: a, step: i, elo: e });
        });
      });
      return out.filter((x) => SFC_CONFIG.cores.list[x.id]);
    },
    // Core thường 1 người chơi có ở mức Elo (bộ khởi đầu + Core Road) — pool lượt chọn Core của người chơi giả
    collectionAt(elo) {
      const L = SFC_CONFIG.cores.list, normal = (id) => L[id] && L[id].role !== 'ult';
      return [...new Set(SFC_CONFIG.progression.starterCores.filter(normal).concat(this.roadAt(elo).map((x) => x.id).filter(normal)))];
    },

    unlock(d, id, fresh = true) {
      if (!id || !SFC_CONFIG.cores.list[id] || d.cores.includes(id)) return false;
      d.cores.push(id);
      if (fresh) d.fresh.push(id);
      return true;
    },
    // hồ sơ cũ / đổi config: cấp bù mọi mốc Core Road tới Elo cao nhất từng đạt (không hiện màn mở thẻ)
    backfill(d) {
      if (this.roadFromRuns()) return;   // GOAT PATH mở Core (Run.unlockRoad), Core đã mở vẫn giữ
      for (const x of this.roadAt(d.peak)) this.unlock(d, x.id, false);
    },
    // GOAT PATH (run.coreRoad.fromRuns): CORE ROAD tính theo tiến trình run, Ranked không mở Core nữa
    roadFromRuns() { return !!(SFC_CONFIG.run && SFC_CONFIG.run.coreRoad && SFC_CONFIG.run.coreRoad.fromRuns); },
    roadLevel() { return this.roadFromRuns() ? ((SFC.Profile.data && SFC.Profile.data.runs) || {}).road || 0 : this.state.peak; },

    // nguồn mở khoá của 1 Core: { kind: starter | road (mốc Core Road) | none, area, elo }
    coreSource(id) {
      if (SFC_CONFIG.progression.starterCores.includes(id)) return { kind: 'starter' };
      for (let a = 0; a < this.areas().length; a++) {
        const k = (this.area(a).road || []).findIndex((ids) => ids.includes(id));
        if (k >= 0) return { kind: 'road', area: a, step: k, elo: this.roadElo(a, k) };
      }
      return { kind: 'none' };
    },

    // cách mở 1 Core còn khoá (túi đồ, ULTIMATE). Area chưa tới: không lộ tên Area (bản đồ đang hiện ???)
    unlockHint(id) {
      const src = this.coreSource(id), _t = SFC.t;
      if (src.kind === 'road' && this.roadFromRuns()) return _t('GOAT PATH progress {n}/{max}', { n: this.roadLevel(), max: src.elo });
      if (src.kind === 'road') return _t('Reach {elo}', { elo: this.stars(src.elo) }) + (src.area <= this.state.best ? ' · ' + this.area(src.area).name : '');
      return _t('Not available yet');
    },

    // đã xem Core / Tuyệt kỹ vừa mở -> bỏ nhãn NEW
    seen(id) {
      const f = this.state.fresh, i = f.indexOf(id);
      if (i < 0) return;
      f.splice(i, 1);
      SFC.Profile.save();
    },

    // bản DEMO (itch.io, config/demo.config.js): Area a có bị khoá không · đã tới Area bị khoá (hết demo) chưa
    demoLocked(a) { return SFC_DEMO && a >= SFC_CONFIG.demo.areas; },
    demoOver(st = this.state) { return this.demoLocked(st.area); },

    // level ở mức Elo (areas[].levelCap: khoảng Elo của Area chia đều cho các nấc); vượt hết Area cuối = maxLevel.
    // Trần level của character (khi progression.levelCapByRank bật) + mốc ước lượng OVR người chơi giả (ovrAt)
    levelCapAt(elo) {
      const max = SFC_CONFIG.progression.maxLevel, a = this.areaOf(elo), caps = this.area(a).levelCap, f = this.frac(elo, a);
      if (!caps || (a === this.areas().length - 1 && f >= 1)) return max;
      return Math.min(max, caps[Math.max(0, Math.min(caps.length - 1, Math.floor(f * caps.length)))]);
    },
    // OVR trung tâm của người chơi giả ở mức Elo (matchmaking.ovr)
    ovrAt(elo) {
      const O = C().matchmaking.ovr;
      return O.base + O.perLevel * (this.levelCapAt(elo) - 1) + O.offset;
    },

    // độ khó AI bot ở mức Elo: nội suy giữa đầu và cuối Area
    aiProfile(elo) {
      const a = this.areaOf(elo), [lo, hi] = this.area(a).ai, t = Math.max(0, Math.min(1, this.frac(elo, a))), out = {};
      for (const k in lo) out[k] = U().lerp(lo[k], hi[k], t);
      return out;
    },

    /* ---------- matchmaking (PLACEHOLDER) ---------- */
    // Elo người chơi giả: lệch tối đa range quanh Elo của bạn; phần lớn bị kẹp trong cùng Area (ưu tiên cùng Area)
    fakeElo(me, range) {
      const M = C().matchmaking, a = this.areaOf(me);
      let e = Math.round(me + rnd(-range, range));
      if (Math.random() < M.sameArea) {
        const lo = this.area(a).elo, hi = this.area(a + 1) ? this.area(a + 1).elo - 1 : Infinity;
        e = Math.max(lo, Math.min(hi, e));
      }
      return Math.max(0, e);
    },
    // 1 người chơi giả: tên, Elo, ngoại hình theo Area của họ (giống ứng viên scout), OVR ngang character thật ở Elo đó.
    // Pool lượt chọn Core (deck) = mọi Core 1 người chơi thật ở Elo đó đã mở (Core Road) — bốc như người thật
    fakePlayer(elo, taken) {
      const M = C().matchmaking, names = M.names.filter((n) => !taken.includes(n));
      const m = SFC.Mates.generate(this.areaOf(elo), 1);
      m.deck = this.collectionAt(elo);
      m.ovr = clampInt(this.ovrAt(elo) + rnd(-M.ovr.spread, M.ovr.spread), 40, 99);
      m.ratings = SFC.Mates.genRatings(m.ovr, m.main);
      m.name = names.length ? U().pick(names) : m.name;
      m.elo = elo;
      taken.push(m.name);
      return m;
    },
    // ghép 1 trận 3v3: 2 đồng đội + 3 đối thủ giả. waited = giây đã chờ (nới range); role = vị trí của bạn;
    // partyMates(roles): những người bạn trong phòng (SFC.Social.partyMates) làm đồng đội ở các vị trí còn lại, thiếu thì người giả lấp vào —
    // đối thủ ghép quanh Elo trung bình đội mình
    matchmake(waited = 0, role = 'FWD', partyMates = null) {
      const M = C().matchmaking, st = this.state, roles = SFC_CONFIG.game.roles;
      const range = U().lerp(M.range[0], M.range[1], Math.min(1, waited / Math.max(0.1, M.searchTime[1])));
      const mateRoles = roles.filter((r) => r !== role);
      const friends = (partyMates ? partyMates(mateRoles) : []).slice(0, mateRoles.length);
      const taken = [SFC.Profile.data.name].concat(friends.map((f) => f.name));
      const fakeSpec = (m, r) => Object.assign(SFC.Mates.spec(m, r), { elo: m.elo, fake: true });
      const mates = mateRoles.map((r, i) => friends[i] || fakeSpec(this.fakePlayer(this.fakeElo(st.elo, range), taken), r));
      const avg = (list) => list.reduce((s, x) => s + x, 0) / Math.max(1, list.length);
      const myElo = avg([st.elo].concat(mates.map((m) => m.elo)));
      const opps = roles.map((r) => fakeSpec(this.fakePlayer(this.fakeElo(Math.round(myElo), range), taken), r));
      const oppElo = avg(opps.map((o) => o.elo));
      // sân: Area của Elo trung bình cả 2 đội
      const a = this.areaOf(Math.round((myElo + oppElo) / 2)), A = this.area(a);
      return {
        area: a, arena: A.arena, reward: this.area(st.area).reward, range: Math.round(range), role,
        mates, party: friends.length > 0, opps, myElo, oppElo,
        aiProfile: this.aiProfile(Math.round((myElo + oppElo) / 2)),
      };
    },
    // CLB của đội đối thủ giả: tên theo người đầu tiên, áo sân khách
    rivalClub(name) {
      const P = C().playerTeam, id = 'mp_rival';
      SFC_CONFIG.teams.list[id] = Object.assign({}, SFC_CONFIG.teams.list[P.id], {
        name: P.nameFormat.replace('{name}', name),
        short: name.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || 'RIV',
        tagline: 'AWAY CLUB', kit: P.awayKit,
      });
      return id;
    },

    // costume + màu của cầu thủ thứ idx trong đội (vẽ ở menu, giống Player)
    teamLook(id, idx) {
      const t = this.team(id), skins = SFC_CONFIG.teams.skins, L = (t.looks && t.looks[idx]) || {};
      return {
        skin: skins[(L.skin != null ? L.skin : idx) % skins.length], hair: t.kit.hair[idx % t.kit.hair.length],
        cut: L.cut, face: L.face, shoes: L.shoes, fx: L.fx,
      };
    },

    // Elo cộng / trừ của 1 trận: k x (kết quả - kỳ vọng), kỳ vọng theo Elo trung bình 2 đội
    eloDelta(result, myElo, oppElo) {
      const E = C().elo, S = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;
      const exp = 1 / (1 + Math.pow(10, (oppElo - myElo) / 400));
      let d = Math.round(E.k * (S - exp));
      if (result === 'win') d = Math.max(E.minWin || 1, d);
      return d;
    },

    /**
     * Ghi kết quả 1 trận Main Path. result: win | draw | lose; info = game.opts.mainPath ({ myElo, oppElo } lúc vào trận).
     * Trả về { before, after, delta, event, rewards, first } — before / after: { elo, area };
     *   event: up (lên Area) · down (rớt Area) · null; first: lần đầu tới Area này;
     *   rewards: Core thường vừa mở theo Core Road [{ kind: 'core', id, src: 'area' (vào Area) | 'road' (nấc giữa Area), area, elo }]
     */
    record(result, info) {
      const st = this.state, before = { elo: st.elo, area: st.area }, bestBefore = st.best;
      delete st.pending;
      const my = info && info.myElo != null ? info.myElo : st.elo, opp = info && info.oppElo != null ? info.oppElo : st.elo;
      const delta = Math.max(-st.elo, this.eloDelta(result, my, opp));
      st.elo += delta;
      st.peak = Math.max(st.peak, st.elo);
      st.area = this.areaOf(st.elo);
      st.id = this.area(st.area).id;
      const event = st.area > before.area ? 'up' : st.area < before.area ? 'down' : null;
      const rewards = [];
      if (!this.roadFromRuns()) for (const x of this.roadAt(st.peak)) {
        if (this.unlock(st, x.id)) rewards.push({ kind: 'core', id: x.id, src: x.step === 0 ? 'area' : 'road', area: x.area, elo: x.elo });
      }
      st.best = Math.max(st.best, st.area);
      SFC.Profile.save();
      return { before, after: { elo: st.elo, area: st.area }, delta, event, rewards, first: st.area > bestBefore };
    },

    // vào trận xếp hạng (info = opts.mainPath): lưu sẵn 1 trận thua — bỏ trận bằng cách tắt game / rớt mạng vẫn tính thua.
    // record() (hết trận / FORFEIT) xoá đi
    begin(info) {
      this.state.pending = { myElo: +info.myElo || 0, oppElo: +info.oppElo || 0 };
      SFC.Profile.save();
    },
    // trận xếp hạng còn dở (lần chạy trước tắt giữa trận / vừa mất kết nối): tính thua như FORFEIT. -> kết quả record() | null
    settle() {
      const p = this.state && this.state.pending;
      if (!p) return null;
      const st = SFC.Profile.data.stats;
      if (st) { st.matches++; st.losses++; }
      return this.record('lose', p);
    },
  };

  SFC.MainPath = MainPath;
})();
