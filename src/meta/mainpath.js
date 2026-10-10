/* MainPath — tiến trình chính kiểu Clash Royale xếp theo Elo (số liệu ở config/mainpath.config.js).
 * Trạng thái lưu trong hồ sơ (SFC.Profile.data.path):
 *   { elo, peak, area, id, best, cores, fresh } — area = Area theo Elo hiện tại (id dùng để đọc lại); peak = Elo cao nhất từng đạt;
 *   best = Area cao nhất từng tới (mở Tuyệt kỹ, sân online, scout); cores = Tuyệt kỹ đã mở bằng Main Path;
 *   fresh = Core vừa mở, chưa hiện ở lượt chọn Core nào (lá có nhãn NEW, được ưu tiên bốc)
 * Matchmaking hiện là PLACEHOLDER: matchmake() sinh 3 người chơi giả (bot) quanh Elo của bạn, ưu tiên cùng Area.
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
    // ngưỡng Elo của Area kế tiếp (null ở Area cuối)
    nextElo(a = this.state.area) { const n = this.area(a + 1); return n ? n.elo : null; },

    /* ---------- Tuyệt kỹ mở theo Area ---------- */
    unlock(d, id, fresh = true) {
      if (!id || !SFC_CONFIG.cores.list[id] || d.cores.includes(id)) return false;
      d.cores.push(id);
      if (fresh) d.fresh.push(id);
      return true;
    },
    // hồ sơ cũ / đổi config: cấp bù Tuyệt kỹ của mọi Area đã tới (không hiện màn mở thẻ)
    backfill(d) {
      for (let a = 0; a <= d.best; a++) this.unlock(d, this.area(a).ult, false);
    },

    // nguồn mở khoá của 1 Core: { kind: starter | area | none, area }
    coreSource(id) {
      if (SFC_CONFIG.progression.starterCores.includes(id)) return { kind: 'starter' };
      const i = this.areas().findIndex((a) => a.ult === id);
      if (i >= 0) return { kind: 'area', area: i };
      const c = SFC_CONFIG.cores.list[id];
      return c && c.role !== 'ult' ? { kind: 'starter' } : { kind: 'none' };
    },

    // cách mở 1 Core còn khoá (túi đồ, màn kết quả). Area chưa tới: không lộ tên Area (bản đồ đang hiện ???)
    unlockHint(id) {
      const src = this.coreSource(id), _t = SFC.t;
      if (src.kind !== 'area') return _t('Not available yet');
      const n = src.area + 1, seen = src.area <= this.state.best;
      return _t('Reach AREA {n}', { n }) + (seen ? ' · ' + this.area(src.area).name : '') + ` · ${this.area(src.area).elo} ${_t('ELO')}`;
    },

    // Core đã xuất hiện ở lượt chọn -> bỏ nhãn NEW
    seen(id) {
      const f = this.state.fresh, i = f.indexOf(id);
      if (i < 0) return;
      f.splice(i, 1);
      SFC.Profile.save();
    },

    // bản DEMO (itch.io, config/demo.config.js): Area a có bị khoá không · đã tới Area bị khoá (hết demo) chưa
    demoLocked(a) { return SFC_DEMO && a >= SFC_CONFIG.demo.areas; },
    demoOver(st = this.state) { return this.demoLocked(st.area); },

    // trần level character ở mức Elo (areas[].levelCap: khoảng Elo của Area chia đều cho các nấc); vượt hết Area cuối = maxLevel
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
    // 1 người chơi giả: tên, Elo, deck / ngoại hình theo Area của họ (giống ứng viên scout), OVR ngang character thật ở Elo đó
    fakePlayer(elo, taken) {
      const M = C().matchmaking, names = M.names.filter((n) => !taken.includes(n));
      const m = SFC.Mates.generate(this.areaOf(elo), 1);
      m.ovr = clampInt(this.ovrAt(elo) + rnd(-M.ovr.spread, M.ovr.spread), 40, 99);
      m.ratings = SFC.Mates.genRatings(m.ovr, m.main);
      m.name = names.length ? U().pick(names) : m.name;
      m.elo = elo;
      taken.push(m.name);
      return m;
    },
    // ghép 1 trận 2v2: đồng đội + 2 đối thủ giả. waited = giây đã chờ (nới range); role = vị trí của bạn;
    // partyMate(role): người bạn trong phòng (SFC.Social.partyMate) làm đồng đội thay người giả — đối thủ ghép quanh Elo trung bình 2 người
    matchmake(waited = 0, role = 'FWD', partyMate = null) {
      const M = C().matchmaking, st = this.state, roles = SFC_CONFIG.game.roles;
      const range = U().lerp(M.range[0], M.range[1], Math.min(1, waited / Math.max(0.1, M.searchTime[1])));
      const mateRole = roles.find((r) => r !== role) || roles[0];
      const friend = partyMate && partyMate(mateRole);
      const taken = [SFC.Profile.data.name].concat(friend ? [friend.name] : []);
      const mateRaw = friend ? null : this.fakePlayer(this.fakeElo(st.elo, range), taken);
      const mateElo = friend ? friend.elo : mateRaw.elo;
      const myElo = (st.elo + mateElo) / 2;
      const opps = [0, 1].map(() => this.fakePlayer(this.fakeElo(Math.round(myElo), range), taken));
      const oppElo = (opps[0].elo + opps[1].elo) / 2;
      // sân: Area của Elo trung bình cả 4 người
      const a = this.areaOf(Math.round((myElo + oppElo) / 2)), A = this.area(a);
      return {
        area: a, arena: A.arena, reward: this.area(st.area).reward, range: Math.round(range),
        mate: friend || Object.assign(SFC.Mates.spec(mateRaw, mateRole), { elo: mateRaw.elo, fake: true }),
        party: !!friend,
        opps: opps.map((m, i) => Object.assign(SFC.Mates.spec(m, roles[i]), { elo: m.elo, fake: true })),
        myElo, oppElo,
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
     *   rewards: Tuyệt kỹ mở lần đầu tới Area [{ kind: 'core', id, src: 'area', area }]
     */
    record(result, info) {
      const st = this.state, before = { elo: st.elo, area: st.area }, bestBefore = st.best;
      const my = info && info.myElo != null ? info.myElo : st.elo, opp = info && info.oppElo != null ? info.oppElo : st.elo;
      const delta = Math.max(-st.elo, this.eloDelta(result, my, opp));
      st.elo += delta;
      st.peak = Math.max(st.peak, st.elo);
      st.area = this.areaOf(st.elo);
      st.id = this.area(st.area).id;
      const event = st.area > before.area ? 'up' : st.area < before.area ? 'down' : null;
      const rewards = [];
      for (let a = st.best + 1; a <= st.area; a++) {
        const id = this.area(a).ult;
        if (this.unlock(st, id)) rewards.push({ kind: 'core', id, src: 'area', area: a });
      }
      st.best = Math.max(st.best, st.area);
      SFC.Profile.save();
      return { before, after: { elo: st.elo, area: st.area }, delta, event, rewards, first: st.area > bestBefore };
    },
  };

  SFC.MainPath = MainPath;
})();
