/* Run — GOAT PATH (docs/RUN_DESIGN.md, config/run.config.js): run 3 act kiểu Slay the Spire. Không dính DOM (để sau này co-op chạy được).
 * Run đang dở lưu ở Profile.data.run (lưu sau mỗi node, thoát game vào lại vẫn tiếp), null = không có run:
 *   { seed, nonce, act, bosses: [id đội boss từng act], spare: [boss không được bốc], map, at, path, log, pending, over, won, started,
 *     cash ($ trong run), bag: [{ id, up } | { id, up, who }] (BADGE của cả đội, up = đã nâng cấp; chấn thương thêm who = người bị:
 *           số thứ tự trong squad — 2026-10-28: BADGE không gắn cho từng người nữa),
 *     squad: [{ role, you: true, legend? } | { role, m: { name, look, deck, ratings, ovr }, legend? }] (0 = character, 1-2 = đồng đội chọn
 *           lúc START RUN; legend = id LEGEND của người đó, config/legends.config.js),
 *     offer: { ids, kind } (thưởng chọn 1 sau trận thắng — của cả đội, co-op bỏ phiếu) · join: { id } (LEGEND vừa qua trial, chờ chọn
 *           người nhận — ai trong đội cũng được, user 2026-10-28 — hoặc từ chối) · guard: { act, n } (Shin Guards: số chấn thương đã chặn ở act này),
 *     room: { kind: 'shop', items: [{ id, price, sold }], healed } | { kind: 'rest', left } | { kind: 'skill', drill } |
 *           { kind: 'trial', legend, drill } | { kind: 'event', id } (đang đứng trong Shop / Locker Room (left: số việc còn làm được) /
 *           trước Skill game / trước LEGEND TRIAL / trong sự kiện ???),
 *     floors (số node đã qua cả run), metaGold (gold meta đã quy đổi lúc hết run, null = chưa) }
 *   map = { floors: [[node]], boss: node } của act đang đá. node = { id 'f.c', f, c, kind, team?, elo?, next: [id], jx, jy }
 *   at = id node vừa xong (null = chưa vào node nào của act) · path = các node đã qua ở act này · log = các trận đã đá
 *   pending = id node đang đá dở (ghi lúc giao bóng): tắt game giữa trận -> lần chạy sau tính thua (settle), giống Main Path
 * Co-op (phòng GOAT PATH online, docs/RUN_DESIGN.md "Co-op"): run vẫn là run của máy host (lưu ở hồ sơ host). Người trong phòng ngồi vào ô
 * đồng đội AI cùng vị trí (squad[i].h = mã khách). Thêm vào R: guests: { uid: { name, look, cash, on } } (ví riêng của từng khách; host
 * dùng luôn R.cash) · vote: { kind, ballots: { mã: lựa chọn }, t0 } (bỏ phiếu, bốc ngẫu
 * nhiên theo số phiếu) · turn (lượt Skill game xoay vòng) · hostName / hostLook (khách vẽ host). Khách giữ bản sao mirror (Run.mirrorOn).
 * Thống kê mọi run: Profile.data.runs = { plays, wins, bestAct, bestFloor, bosses }
 * Thua 1 trận = hết run (over). Thắng boss act cuối = vô địch (won). Hết run vẫn giữ trong hồ sơ tới khi màn kết thúc đóng (clear).
 * Trận dựng ở main.js startRunMatch (opts.run), kết quả vào record() qua Profile.awardMatch. UI: src/ui/runmap.js.
 */
window.SFC = window.SFC || {};

(function () {
  const C = () => SFC_CONFIG.run;
  const PF = () => SFC.Profile;
  const TEAMS = () => SFC_CONFIG.teams.list;
  const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.floor(+v || 0)));

  // dữ liệu đối thủ theo id đội: lấy từ vòng FOOTBALL STORY cũ có đội đó (sân, Core đặc trưng, luật trận, câu nói) + đội Elite (run.elites)
  let OPP = null;
  function oppTable() {
    if (OPP) return OPP;
    OPP = {};
    for (const s of SFC_CONFIG.stories.list) for (const rd of s.rounds || []) if (!OPP[rd.team]) OPP[rd.team] = rd;
    Object.assign(OPP, C().elites || {});   // đội Elite riêng của GOAT PATH (run.elites)
    return OPP;
  }

  // bốc theo trọng số: { key: w }
  function weighted(rng, w) {
    const keys = Object.keys(w).filter((k) => w[k] > 0), sum = keys.reduce((s, k) => s + w[k], 0);
    let r = rng() * sum;
    for (const k of keys) { r -= w[k]; if (r < 0) return k; }
    return keys[keys.length - 1];
  }
  function shuffle(rng, a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  const Run = {
    get run() {
      if (this.mirrorOn) return this.mirrorR;   // khách phòng co-op: bản sao run của host (run riêng của máy này không đụng tới)
      const R = PF().data ? PF().data.run || null : null;
      if (R && !R.squad) R.squad = this.makeSquad(null);   // run lưu từ bản trước khi có đội hình: đội hình mặc định
      return R;
    },
    acts() { return C().acts; },
    act(i) { return C().acts[i] || null; },
    node(kind) { return C().nodes[kind] || null; },
    active() { const R = this.run; return !!R && !R.over && !R.won; },
    opp(team) { return oppTable()[team] || null; },

    /* ---------- hồ sơ ---------- */
    blankStats() { return { plays: 0, wins: 0, bestAct: 0, bestFloor: 0, bosses: 0, road: 0 }; },   // road: tiến trình CORE ROAD (run.coreRoad)
    sanitizeStats(raw) {
      const o = this.blankStats();
      if (!raw || typeof raw !== 'object') return o;
      for (const k in o) o[k] = clampInt(raw[k], 0, 1e9);
      return o;
    },
    stats() {
      const d = PF().data;
      return d.runs || (d.runs = this.blankStats());
    },
    // run đã lưu: sai cấu trúc / id không còn tồn tại -> bỏ (null)
    sanitize(raw) {
      if (!raw || typeof raw !== 'object') return null;
      const acts = C().acts, kinds = C().nodes, T = TEAMS();
      const act = clampInt(raw.act, 0, acts.length - 1);
      const bosses = Array.isArray(raw.bosses) ? raw.bosses.slice(0, acts.length) : [];
      if (bosses.length !== acts.length || !bosses.every((id, i) => acts[i].boss.includes(id))) return null;
      const m = raw.map;
      if (!m || !Array.isArray(m.floors) || m.floors.length !== C().map.floors || !m.boss) return null;
      const LG = SFC_CONFIG.legends.list;
      const ids = new Set(), okNode = (n) => n && typeof n === 'object' && typeof n.id === 'string' && kinds[n.kind] && (!n.team || T[n.team]) && (!n.legend || LG[n.legend]);
      for (const fl of m.floors) {
        if (!Array.isArray(fl) || !fl.length || !fl.every(okNode)) return null;
        fl.forEach((n) => ids.add(n.id));
      }
      if (!okNode(m.boss) || m.boss.id !== 'boss') return null;
      ids.add('boss');
      for (const fl of m.floors) for (const n of fl) if (!Array.isArray(n.next) || !n.next.every((x) => ids.has(x))) return null;
      const id = (x) => (typeof x === 'string' && ids.has(x) ? x : null);
      const B = C().badges, isB = (x) => typeof x === 'string' && !!B[x];
      const key = (k) => (typeof k === 'string' && /^(host|[a-z0-9]{8,16})$/.test(k) ? k : null);
      const offerOf = (o) => (o && Array.isArray(o.ids) && o.ids.every(isB) ? { ids: o.ids.slice(0, 5), kind: String(o.kind || 'match').slice(0, 12) } : null);
      // BADGE cả đội: không trùng · chấn thương: theo từng người (who), không trùng trên 1 người
      const bag = [];
      for (const b of Array.isArray(raw.bag) ? raw.bag : []) {
        if (!b || !isB(b.id)) continue;
        const d = B[b.id], who = clampInt(b.who, 0, 2);
        if (d.injury ? bag.some((x) => x.id === b.id && x.who === who) : bag.some((x) => x.id === b.id)) continue;
        bag.push(d.injury ? { id: b.id, up: false, who } : { id: b.id, up: !!b.up && !!d.up });
      }
      const squad = this.sanitizeSquad(raw.squad);
      const offer = offerOf(raw.offer);
      const join = raw.join && LG[raw.join.id] ? { id: raw.join.id } : null;
      // co-op: ví của khách (theo mã hồ sơ), phiếu đang bỏ
      const guests = {};
      if (raw.guests && typeof raw.guests === 'object') for (const k of Object.keys(raw.guests).slice(0, 8)) {
        const x = raw.guests[k];
        if (!key(k) || k === 'host' || !x || typeof x !== 'object') continue;
        guests[k] = { name: SFC.Profile.publicName(x.name), look: SFC.Profile.sanitizeLook(x.look), cash: clampInt(x.cash, 0, 99999), on: !!x.on };
      }
      const V = raw.vote, VK = ['node', 'choose', 'rest', 'pick', 'join'];
      const vote = V && VK.includes(V.kind) && V.ballots && typeof V.ballots === 'object' ? { kind: V.kind, t0: +V.t0 || 0, ballots: {} } : null;
      if (vote) for (const k of Object.keys(V.ballots).slice(0, 8)) if (key(k) && typeof V.ballots[k] === 'string') vote.ballots[k] = V.ballots[k].slice(0, 12);
      // ô đội hình có người thật đứng (chỉ mã có trong guests)
      if (squad) squad.forEach((x, i) => { const h = i && key(raw.squad[i].h); if (h && guests[h]) x.h = h; });
      const rm = raw.room, room = !rm || typeof rm !== 'object' ? null
        : rm.kind === 'rest' ? { kind: 'rest', left: clampInt(rm.left, 1, 2) }
        : rm.kind === 'skill' && C().drills[rm.drill] ? { kind: 'skill', drill: rm.drill, player: key(rm.player) || 'host' }
        : rm.kind === 'trial' && LG[rm.legend] ? { kind: 'trial', legend: rm.legend, drill: LG[rm.legend].trial.drill, player: key(rm.player) || 'host' }
        : rm.kind === 'event' && C().events[rm.id] ? { kind: 'event', id: rm.id }
        : rm.kind === 'shop' && Array.isArray(rm.items) ? { kind: 'shop', healed: !!rm.healed, ready: (Array.isArray(rm.ready) ? rm.ready : []).map(key).filter(Boolean),
          items: rm.items.filter((x) => x && isB(x.id)).map((x) => ({ id: x.id, price: clampInt(x.price, 0, 9999), sold: !!x.sold, hot: !!x.hot })) }
        : null;
      return {
        cash: clampInt(raw.cash, 0, 99999), bag, squad, offer, join, room, floors: clampInt(raw.floors, 0, 999),
        guard: raw.guard && typeof raw.guard === 'object' ? { act: clampInt(raw.guard.act, 0, acts.length - 1), n: clampInt(raw.guard.n, 0, 9) } : null,
        guests, vote, turn: clampInt(raw.turn, 0, 9999),
        hostName: raw.hostName == null ? null : SFC.Profile.publicName(raw.hostName), hostLook: raw.hostLook ? SFC.Profile.sanitizeLook(raw.hostLook) : null,
        cue: typeof raw.cue === 'string' && /^after:\d$/.test(raw.cue) ? raw.cue : null,
        seen: Array.isArray(raw.seen) ? raw.seen.filter((x) => typeof x === 'string').slice(0, 20) : [],
        metaGold: raw.metaGold == null ? null : clampInt(raw.metaGold, 0, 99999), roadGain: clampInt(raw.roadGain, 0, 99999),
        newCores: Array.isArray(raw.newCores) ? raw.newCores.filter((id) => SFC_CONFIG.cores.list[id]) : [],
        seed: clampInt(raw.seed, 0, 2 ** 31), nonce: String(raw.nonce || '').slice(0, 12), act, bosses,
        spare: Array.isArray(raw.spare) ? raw.spare.filter((x) => T[x]) : [],
        map: m, at: id(raw.at), path: Array.isArray(raw.path) ? raw.path.filter(id) : [],
        log: Array.isArray(raw.log) ? raw.log.slice(-40).filter((x) => x && typeof x === 'object') : [],
        pending: id(raw.pending), next: id(raw.next), over: !!raw.over, won: !!raw.won, forfeit: !!raw.forfeit, actNew: !!raw.actNew, demoEnd: !!raw.demoEnd,
        started: Math.max(0, +raw.started || 0),
      };
    },

    /* ---------- bắt đầu / kết thúc ---------- */
    // mates: { vị trí: đồng đội } từ màn BUILD YOUR SQUAD (RunUI; thiếu thì ứng viên ngẫu nhiên) · me: vị trí của character
    start(mates, me) {
      const seed = Math.floor(Math.random() * 2 ** 31), rng = SFC.U.seeded(seed);
      const bosses = C().acts.map((a) => a.boss[Math.floor(rng() * a.boss.length)]);
      const spare = C().acts.flatMap((a, i) => a.boss.filter((b) => b !== bosses[i]));
      const R = { seed, nonce: Math.random().toString(36).slice(2, 10), act: 0, bosses, spare, map: null, at: null, path: [],
        log: [], pending: null, over: false, won: false, actNew: true, started: Date.now(),   // actNew: màn map chiếu thẻ mở act
        cash: C().cash.start, bag: [], squad: this.makeSquad(mates, me), offer: null, join: null, guard: null, room: null, floors: 0, metaGold: null,
        guests: {}, vote: null, turn: 0,
        cue: null, seen: [] };   // cue: cut-scene chờ chiếu ('after:<act>' sau khi hạ boss) · seen: cut-scene đã chiếu ('intro:0', 'boss:1'...)
      R.map = this.genAct(R, 0);
      PF().data.run = R;
      this.stats().plays++;
      PF().save();
      return R;
    },
    // đóng màn kết thúc run (hoặc bỏ run chưa đá trận nào): xoá khỏi hồ sơ
    clear() {
      PF().data.run = null;
      PF().save();
    },
    // FORFEIT (nút ở màn map / menu tạm dừng trong trận): hết run, tính như thua. Đang giữa trận: trận tính thua vào thống kê
    forfeit() {
      const R = this.run;
      if (!R || R.over || R.won) return;
      if (R.pending) { const st = PF().data.stats; st.matches++; st.losses++; }
      R.pending = null;
      R.over = true;
      R.forfeit = true;
      this.finish(R);
      PF().save();
    },
    // hết run (thua / bỏ / vô địch): quy đổi gold meta 1 lần (run.meta) -> R.metaGold
    finish(R) {
      if (R.metaGold != null) return;
      const M = C().meta, bosses = R.log.filter((x) => x.kind === 'boss' && x.my > x.op).length;
      R.metaGold = R.floors * M.perFloor + bosses * M.perBoss + (R.won ? M.champion : 0);
      PF().data.gold += R.metaGold;
      // CORE ROAD theo run: cộng tiến trình, mở Core tới mốc mới (nhãn NEW ở lượt chọn Core như Ranked cũ)
      const CR = C().coreRoad;
      if (CR && CR.fromRuns) {
        R.roadGain = R.floors * CR.perFloor + bosses * CR.perBoss;
        this.stats().road += R.roadGain;
        R.newCores = this.unlockRoad(true);
      }
    },
    // mở mọi Core tới mức tiến trình hiện tại (fresh: nhãn NEW). Lúc mở game gọi với fresh = false (đổi config / hồ sơ cũ)
    unlockRoad(fresh) {
      const MP = SFC.MainPath, out = [];
      if (!MP.roadFromRuns()) return out;
      for (const x of MP.roadAt(this.stats().road)) if (MP.unlock(MP.state, x.id, fresh)) out.push(x.id);
      return out;
    },
    // lúc mở game: trận run còn dở (lần trước tắt giữa trận) -> forfeit. Trả về true nếu vừa xử
    settle() {
      const R = this.run;
      if (R && R.guests) this.syncRoom([], R);   // run co-op lần trước: lúc mở game chưa ai trong phòng
      if (!R || !R.pending || R.over || R.won) return false;
      // tắt game giữa Skill game: tính hỏng bài (chấn thương), không mất run
      if (R.room && (R.room.kind === 'skill' || R.room.kind === 'trial')) { this.drillDone(R, 0); PF().save(); return true; }
      this.forfeit();
      return true;
    },

    /* ---------- map ---------- */
    find(id) {
      const m = this.run && this.run.map;
      if (!m) return null;
      if (id === 'boss') return m.boss;
      for (const fl of m.floors) for (const n of fl) if (n.id === id) return n;
      return null;
    },
    // node chọn được tiếp theo
    available() {
      const R = this.run;
      if (!this.active()) return [];
      if (!R.at) return R.map.floors[0].slice();
      const at = this.find(R.at);
      return at && at.kind !== 'boss' ? at.next.map((id) => this.find(id)).filter(Boolean) : [];
    },
    // tầng đang đứng (0-based; -1 = chưa vào act)
    floor() { const n = this.run && this.run.at && this.find(this.run.at); return n ? n.f : -1; },

    // sinh map của act a (cùng seed + act -> cùng map)
    genAct(R, a) {
      const M = C().map, act = C().acts[a];
      let best = null;
      for (let t = 0; t < M.tries; t++) {
        const res = this.tryAct(R, a, SFC.U.seeded((R.seed ^ (a * 0x9e3779b1) ^ (t * 0x85ebca6b)) >>> 0));
        if (!best || res.bad < best.bad) best = res;
        if (!res.bad) break;
      }
      const m = best.map;
      m.boss = { id: 'boss', f: M.floors, c: (M.cols - 1) / 2, kind: 'boss', team: R.bosses[a], elo: act.bossElo, next: [], jx: 0, jy: 0 };
      m.floors[M.floors - 1].forEach((n) => { n.next = ['boss']; });
      return m;
    },
    // 1 lần sinh: đường đi -> loại node -> đối thủ. bad = số chỗ phạm luật (0 = dùng được)
    tryAct(R, a, rng) {
      const M = C().map, F = M.floors, W = M.cols, act = C().acts[a];
      const cells = new Map(), edges = [];   // cells: 'f.c' -> node · edges: [f, c, c2]
      const cell = (f, c) => {
        const id = f + '.' + c;
        if (!cells.has(id)) cells.set(id, { id, f, c, kind: null, next: [], jx: +(rng() * 0.5 - 0.25).toFixed(2), jy: +(rng() * 0.4 - 0.2).toFixed(2) });
        return cells.get(id);
      };
      const crosses = (f, c, c2) => edges.some(([ef, a1, b1]) => ef === f && ((a1 < c && b1 > c2) || (a1 > c && b1 < c2)));
      const starts = shuffle(rng, Array.from({ length: W }, (x, i) => i));
      for (let p = 0; p < M.paths; p++) {
        let c = p < 2 ? starts[p] : Math.floor(rng() * W);
        cell(0, c);
        for (let f = 0; f < F - 1; f++) {
          const opts = shuffle(rng, [c - 1, c, c + 1]).filter((x) => x >= 0 && x < W && !crosses(f, c, x));
          const c2 = opts.length ? opts[0] : c;
          const from = cell(f, c), to = cell(f + 1, c2);
          if (!from.next.includes(to.id)) { from.next.push(to.id); edges.push([f, c, c2]); }
          c = c2;
        }
      }
      const floors = Array.from({ length: F }, (x, f) => [...cells.values()].filter((n) => n.f === f).sort((p, q) => p.c - q.c));
      const parents = (n) => (n.f ? floors[n.f - 1].filter((p) => p.next.includes(n.id)) : []);
      // loại node
      for (const fl of floors) for (const n of fl) {
        if (n.f === 0) { n.kind = M.first; continue; }
        if (n.f === F - 1) { n.kind = M.last; continue; }
        const w = Object.assign({}, M.weights), par = parents(n);
        for (const k in w) {
          if (M.minFloor[k] != null && n.f < M.minFloor[k]) w[k] = 0;
          if (M.noRepeat.includes(k) && par.some((p) => p.kind === k)) w[k] = 0;
          if (M.noRepeat.includes(k) && n.f === F - 2 && k === M.last) w[k] = 0;   // tầng ngay dưới tầng cuối (luôn là M.last)
        }
        n.kind = weighted(rng, w);
      }
      // LEGEND TRIAL: mỗi node 1 LEGEND (hiện sẵn trên map), khác nhau, chưa có trong đội hình (hết thì cho lặp)
      const owned = new Set((R.squad || []).map((x) => x.legend).filter(Boolean)), LG = Object.keys(SFC_CONFIG.legends.list);
      let lpool = shuffle(rng, LG.filter((x) => !owned.has(x)));
      for (const fl of floors) for (const n of fl) if (n.kind === 'legend') {
        if (!lpool.length) lpool = shuffle(rng, LG.slice());
        n.legend = lpool.shift();
      }
      // số trận trên mọi đường đi (tầng 0 -> tầng cuối)
      const play = (n) => !!C().nodes[n.kind].play;
      const spare = act.spareBoss ? R.spare.filter((id) => C().acts.findIndex((x) => x.boss.includes(id)) < a) : [];
      // 2 pool riêng: Matchday chỉ lấy act.teams, Elite chỉ lấy act.elite + boss dư. act chưa có đội Elite: Elite bốc chung act.teams + boss dư
      const shared = !(act.elite && act.elite.length), elite = (shared ? act.teams : act.elite).concat(spare);
      // k = số trận · ke = số Elite -> mỗi pool đủ đội khác nhau cho cả đường
      let bad = 0;
      const walk = (n, k, ke) => {
        k += play(n) ? 1 : 0;
        ke += n.kind === 'elite' ? 1 : 0;
        if (!n.next.length) {
          const over = shared ? k - Math.min(ke, spare.length) > act.teams.length : k - ke > act.teams.length || ke > elite.length;
          if (k < M.minMatches || k > M.maxMatches || over) bad++;
          return;
        }
        n.next.forEach((id) => walk(cells.get(id), k, ke));
      };
      floors[0].forEach((n) => walk(n, 0, 0));
      // đối thủ: không trùng đội với mọi trận phía trước trên cùng đường (anc = đội của mọi node tổ tiên)
      const anc = new Map();
      for (const fl of floors) for (const n of fl) {
        const set = new Set();
        for (const p of parents(n)) { anc.get(p.id).forEach((x) => set.add(x)); if (p.team) set.add(p.team); }
        anc.set(n.id, set);
        if (!play(n)) continue;
        const pool = n.kind === 'elite' ? elite : act.teams;
        const free = pool.filter((x) => !set.has(x));
        if (!free.length) bad++;
        n.team = (free.length ? free : pool)[Math.floor(rng() * (free.length || pool.length))];
        const k = n.f / Math.max(1, F - 2);
        n.elo = Math.round(act.elo[0] + (act.elo[1] - act.elo[0]) * Math.min(1, k)) + (n.kind === 'elite' ? C().eliteElo : 0);
      }
      return { map: { floors }, bad };
    },

    /* ---------- chơi node ---------- */
    // vào node id. Trả về { play: true } (vào trận: UI gọi app.startRunMatch) · { pass: true } (node chưa có nội dung, đã xong) · null
    enter(id) {
      const R = this.run, n = this.find(id);
      if (!n || !this.available().includes(n)) return null;
      if (C().nodes[n.kind].play) { R.next = id; return { play: true, node: n }; }
      // ???: vào mới biết (run.mystery) — sự kiện / rương BADGE / Skill game / Shop. n.got = kết quả (map vẽ lại icon)
      let kind = n.kind;
      if (kind === 'event') kind = n.got = weighted(Math.random, C().mystery);
      // LEGEND TRIAL: màn giới thiệu LEGEND + bài thử thách (R.room trial), qua node lúc đá xong / bỏ qua (recordDrill / skipTrial).
      // LEGEND trên node đã vào đội hình (vừa chiêu mộ ở node khác) -> đổi sang 1 LEGEND chưa có
      if (kind === 'legend') {
        const owned = R.squad.map((x) => x.legend), LG = SFC_CONFIG.legends.list;
        if (!LG[n.legend] || owned.includes(n.legend)) {
          const free = Object.keys(LG).filter((x) => !owned.includes(x));
          n.legend = free.length ? free[Math.floor(Math.random() * free.length)] : Object.keys(LG)[0];
        }
        R.next = id;
        R.room = { kind: 'trial', legend: n.legend, drill: LG[n.legend].trial.drill, player: this.nextPlayer(R) };
        PF().save();
        return { room: 'trial', node: n };
      }
      // Skill game: màn giới thiệu bài trước (R.room skill), qua node lúc đá xong (recordDrill)
      if (kind === 'skill') {
        const ids = Object.keys(C().drills).filter((k) => !C().drills[k].trial);   // bài LEGEND TRIAL không bốc cho Skill game
        R.next = id;
        R.room = { kind: 'skill', drill: ids[Math.floor(Math.random() * ids.length)], player: this.nextPlayer(R) };
        PF().save();
        return { room: 'skill', node: n };
      }
      this.advance(R, n);
      if (kind === 'shop') R.room = this.openShop();
      else if (kind === 'rest') R.room = this.openRest(R);
      else if (kind === 'event') { const ev = Object.keys(C().events); R.room = { kind: 'event', id: ev[Math.floor(Math.random() * ev.length)] }; }
      else if (kind === 'treasure') R.offer = { ids: this.rollBadges(C().offer, C().rarityWeights.match, R), kind: 'treasure' };
      PF().save();
      return { room: R.room ? R.room.kind : null, node: n };
    },
    advance(R, n) {
      R.at = n.id;
      R.path.push(n.id);
      R.floors = (R.floors || 0) + 1;
      const st = this.stats();
      if (R.act > st.bestAct || (R.act === st.bestAct && n.f > st.bestFloor)) { st.bestAct = R.act; st.bestFloor = n.f; }
    },
    // đội hình [bạn, đối thủ] của SKILL GAME / LEGEND TRIAL (trial riêng: legends.list[].trial.size)
    drillSize(drill, trial) {
      const L = trial && this.legend(trial), D = C().drills[drill];
      return ((L && L.trial.size) || (D && D.teamSize) || [1, 1]).slice();
    },
    // trận của node đang chọn (R.next) -> dữ liệu dựng trận
    match() {
      const R = this.run, n = R && this.active() && R.next && this.find(R.next);
      if (!n) return null;
      // Skill game / LEGEND TRIAL: đối thủ = 1 đội ngẫu nhiên của act (chỉ để mặc áo), Elo như trận cùng tầng, sân của act.
      // trial: mốc + thời gian riêng của LEGEND (opts.trial) · drillEase: BADGE Training Bibs
      if (R.room && (R.room.kind === 'skill' || R.room.kind === 'trial')) {
        const A = this.act(R.act), F = C().map.floors, team = A.teams[Math.floor(Math.random() * A.teams.length)];
        const elo = Math.round(A.elo[0] + (A.elo[1] - A.elo[0]) * Math.min(1, n.f / Math.max(1, F - 2)));
        const trial = R.room.kind === 'trial' ? R.room.legend : null, ease = this.bmax('drillEase', R);
        return { node: n, team, elo, arena: A.arena, drill: R.room.drill, trial, ease: ease || 0, teamSize: this.drillSize(R.room.drill, trial),
          info: { nonce: R.nonce, act: R.act, node: n.id, kind: trial ? 'legend' : 'skill', drill: R.room.drill, trial } };
      }
      if (!C().nodes[n.kind].play) return null;
      const o = this.opp(n.team) || {};
      return { node: n, team: n.team, elo: n.elo, arena: o.arena, signature: o.signature || null, mod: o.mod || null, barks: o.barks || null,
        info: { nonce: R.nonce, act: R.act, node: n.id, kind: n.kind } };
    },
    // giao bóng: lưu sẵn 1 trận thua (tắt game giữa trận = forfeit)
    begin(info) {
      const R = this.run;
      if (!R || !info || info.nonce !== R.nonce) return;
      R.pending = info.node;
      PF().save();
    },

    // kết quả trận (Profile.awardMatch gọi 1 lần mỗi trận) -> { win, kind, act, actDone, won, over, lines }
    record(result, game) {
      const R = this.run, o = game.opts.run;
      // khách co-op: run do host ghi, máy này chỉ hiện kết quả
      if (R && R.mirror) return o && o.nonce === R.nonce ? { win: game.teams[0].score > game.teams[1].score, kind: o.kind, lines: [], mirror: true } : null;
      if (!R || !o || o.nonce !== R.nonce || o.act !== R.act || R.over || R.won) return null;
      const n = this.find(o.node);
      if (!n) return null;
      const me = game.humanTeam, my = game.teams[me].score, op = game.teams[1 - me].score, win = my > op;
      R.pending = null;
      R.next = null;
      R.log.push({ act: R.act, node: n.id, f: n.f, kind: n.kind, team: n.team, my, op });
      const out = { win, kind: n.kind, act: R.act, actDone: false, won: false, over: false, lines: [] };
      if (!win) { R.over = out.over = true; this.finish(R); PF().save(); return out; }
      this.advance(R, n);
      // tiền + thưởng chọn 1 trong 3 BADGE (hiện ở map, lưu trong run: tải lại không đổi được bộ khác).
      // Co-op: mỗi người trong phòng (host + khách đang có mặt) nhận tiền vào ví riêng + bộ 3 riêng (user 2026-10-26)
      // BADGE của cả đội (2026-10-28): 1 bộ 3 chung, co-op bỏ phiếu · Shirt Sponsor: thêm tiền mỗi trận thắng
      const cash = this.roll(C().cash.win[n.kind] || C().cash.win.match) + this.bsum('winCash', R);
      out.cash = cash;
      out.lines.push({ label: SFC.t('Run cash +${n}', { n: cash }), note: true });
      for (const k of this.keys(R)) this.pl(k, R).cash += cash;
      R.offer = { ids: this.rollBadges(C().offer, C().rarityWeights[n.kind] || C().rarityWeights.match, R), kind: n.kind };
      if (n.kind === 'boss') {
        this.stats().bosses++;
        out.actDone = true;
        R.cue = 'after:' + R.act;   // map chiếu cut-scene hạ boss trước khi tiếp
        const demoActs = SFC_DEMO && SFC_CONFIG.demo ? SFC_CONFIG.demo.runActs || 1 : 0;
        if (R.act >= C().acts.length - 1) { R.won = out.won = true; this.stats().wins++; this.clearOffers(R); this.finish(R); }
        // bản DEMO: hết act được chơi = hết run (DEMO COMPLETE), không tính vô địch
        else if (demoActs && R.act + 1 >= demoActs) { R.over = out.over = R.demoEnd = true; this.clearOffers(R); this.finish(R); }
        else {
          R.act++;
          R.map = this.genAct(R, R.act);
          R.at = null;
          R.path = [];
          R.actNew = true;   // màn map chiếu thẻ mở act mới (runmap.js tắt cờ)
        }
      }
      PF().save();
      return out;
    },
  };

  /* ---------- ĐỘI HÌNH (user 2026-10-26): character + 2 đồng đội chọn lúc START RUN, giữ cả run ---------- */
  Object.assign(Run, {
    // vị trí [character, đồng đội 1, đồng đội 2]: me = vị trí người chơi chọn ở màn BUILD YOUR SQUAD (user 2026-10-26; mặc định FWD),
    // 2 đồng đội đá 2 vị trí còn lại theo thứ tự game.roles
    roles(me) {
      const roles = SFC_CONFIG.game.roles;
      if (!roles.includes(me)) me = roles.includes('FWD') ? 'FWD' : roles[roles.length - 1];
      return [me].concat(roles.filter((r) => r !== me));
    },
    // bản chép 1 đồng đội vào run (bán / đổi đội hình ngoài run không ảnh hưởng run đang đá)
    snap(m) {
      const A = SFC_CONFIG.progression.attrs, ratings = {};
      for (const id of A.order) ratings[id] = clampInt(m.ratings ? m.ratings[id] : m.ovr, 1, 99);
      return { name: String(m.name || 'MATE').slice(0, 12), look: Object.assign({}, m.look || {}), deck: (m.deck || []).filter((id) => SFC_CONFIG.cores.list[id]),
        ratings, ovr: clampInt(m.ovr, 1, 99) };
    },
    // ứng viên ở màn chọn đồng đội: cả roster rồi cầu thủ đường phố ngẫu nhiên (như ứng viên scout Area 1: 1 sở trường + deck theo
    // trường phái chính) cho đủ squad.picks
    candidates() {
      const out = SFC.Mates.roster().map((m) => this.snap(m)), names = SFC_CONFIG.mainPath.matchmaking.names;
      const taken = [PF().data.name].concat(out.map((m) => m.name));
      while (out.length < C().squad.picks) {
        const g = SFC.Mates.generate(0, 1), free = names.filter((n) => !taken.includes(n));
        if (free.length) g.name = free[Math.floor(Math.random() * free.length)];
        const m = this.snap(g);
        taken.push(m.name);
        out.push(m);
      }
      return out;
    },
    // vị trí sở trường của đồng đội m: vị trí có nền (squad.base) khớp nhất với độ lệch chỉ số riêng của họ (rating - OVR).
    // Chỉ số đều nhau (đồng đội khởi đầu) -> chọn theo tên cho cố định
    natural(m) {
      const S = C().squad, roles = SFC_CONFIG.game.roles.filter((r) => S.base[r]);
      if (!m || !m.ratings || !roles.length) return roles[0] || 'MID';
      let best = null, bestV = 0;
      for (const r of roles) {
        const b = S.base[r], mean = Object.values(b).reduce((s, x) => s + x, 0) / Object.keys(b).length;
        let v = 0;
        for (const id in b) v += ((m.ratings[id] || m.ovr) - m.ovr) * (b[id] - mean);
        if (best == null || v > bestV) { best = r; bestV = v; }
      }
      if (bestV > 0) return best;
      let h = 0;
      for (const ch of String(m.name || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      return roles[h % roles.length];
    },
    // 2 trường phái Core hay ra nhất của đồng đội (deck: AI của họ bốc Core từ đó) -> [tag]
    schoolsOf(m) {
      const L = SFC_CONFIG.cores.list, n = {};
      for (const id of (m && m.deck) || []) { const tg = ((L[id] && L[id].tags) || [])[0]; if (tg) n[tg] = (n[tg] || 0) + 1; }
      return Object.keys(n).sort((a, b) => n[b] - n[a]).slice(0, 2);
    },
    // mates: { vị trí: đồng đội } (màn BUILD YOUR SQUAD) — vị trí chưa có thì lấy ứng viên ngẫu nhiên (co-op: ô bạn bè đang đứng vẫn cần
    // 1 đồng đội AI dự phòng khi họ rời phòng)
    makeSquad(mates, me) {
      const roles = this.roles(me), by = mates && typeof mates === 'object' ? mates : {};
      const names = Object.values(by).map((m) => m && m.name);
      const pool = this.candidates().filter((m) => !names.includes(m.name));
      return [{ role: roles[0], you: true }].concat([1, 2].map((i) => {
        const m = by[roles[i]];
        return { role: roles[i], m: m ? this.snap(m) : pool.shift() };
      }));
    },
    // sai cấu trúc -> null (Run.run dựng đội hình mặc định lúc dùng tới, khi Mates / MainPath đã sẵn sàng).
    // LEGEND: chỉ giữ khi có thật, không trùng trong đội (gắn lệch vị trí được — user 2026-10-28)
    sanitizeSquad(raw) {
      if (!Array.isArray(raw) || raw.length !== 3 || !raw[0] || !raw[1] || !raw[2] || !raw[1].m || !raw[2].m) return null;
      const roles = this.roles(raw[0].role), LG = SFC_CONFIG.legends.list;
      const out = [{ role: roles[0], you: true }, { role: roles[1], m: this.snap(raw[1].m) }, { role: roles[2], m: this.snap(raw[2].m) }];
      out.forEach((x, i) => {
        const id = raw[i].legend;
        if (typeof id === 'string' && LG[id] && !out.some((y) => y.legend === id)) x.legend = id;
      });
      return out;
    },
    squad(R = this.run) { return R ? R.squad : []; },
    // co-op: ô có người thật (s.h) = tên / ngoại hình người đó; ô của host ở máy khách = hostName / hostLook
    memberName(i, R = this.run) {
      const s = R && R.squad[i], g = s && s.h && R.guests && R.guests[s.h];
      return !s ? '' : s.you ? (R.mirror ? R.hostName || 'HOST' : PF().data.name || 'PLAYER') : g ? g.name : s.m.name;
    },
    // ngoại hình để vẽ (Menu.bindAvatars / canvas): character = Profile, đồng đội = look đã chép
    memberLook(i, R = this.run) {
      const s = R && R.squad[i];
      if (!s) return null;
      const g = s.h && R.guests && R.guests[s.h];
      return s.you ? (R.mirror && R.hostLook ? R.hostLook : SFC.Profile.avatar().look) : g ? g.look : this.mateLook(s.m);
    },
    mateLook(m) { return PF().lookOf(Object.assign({}, SFC_CONFIG.progression.defaultLook, m.look)); },
    // chỉ số nền của người i: theo vị trí sở trường của chính người đó (không theo ô đang đứng) + nghiêng theo chỉ số riêng
    baseRatings(i, R = this.run) { return this.baseOf(R.squad[i]); },
    // mem = { m? } (cả ứng viên ở màn chọn đồng đội) · không có m = character (squad.you) · mem.role (ô đang đứng) không dùng
    baseOf(mem) {
      const S = C().squad, A = SFC_CONFIG.progression.attrs, base = mem.m ? S.base[this.natural(mem.m)] || S.base.MID : S.you || S.base.MID, out = {};
      const lift = mem.m ? Math.max(-S.ovrMax, Math.min(S.ovrMax, Math.round((mem.m.ovr - S.ovrRef) * S.ovrLean))) : 0;
      for (const id of A.order) {
        const lean = mem.m ? Math.max(-S.leanMax, Math.min(S.leanMax, Math.round((mem.m.ratings[id] - mem.m.ovr) * S.lean))) : 0;
        out[id] = base[id] + lean + lift;
      }
      return out;
    },
    // rating 6 chỉ số của người i trong run: nền + LEGEND (nghiêng chỉ số luôn bật) + chấn thương của người đó, kẹp squad.min..attrs.max.
    // legend: thay LEGEND để xem trước (thẻ nhận LEGEND), undefined = LEGEND đang có
    ratingsOf(i, R = this.run, legend) {
      const A = SFC_CONFIG.progression.attrs, out = this.baseRatings(i, R), L = this.legend(legend === undefined ? R.squad[i].legend : legend);
      for (const s in (L && L.stats) || {}) out[s] += L.stats[s];
      for (const b of R.bag) if (b.who === i && this.badge(b.id).injury) for (const s in this.badge(b.id).stats || {}) out[s] += this.badge(b.id).stats[s];
      for (const id of A.order) out[id] = Math.max(C().squad.min, Math.min(A.max, out[id]));
      return out;
    },
    ratings(R = this.run) { return this.ratingsOf(0, R); },
    ovrOf(i, R = this.run, legend) {
      const r = this.ratingsOf(i, R, legend), v = Object.values(r);
      return Math.round(v.reduce((s, x) => s + x, 0) / v.length);
    },
    // Player.stats của người i (cùng công thức Profile.attrMult)
    statsOf(i, R = this.run) {
      const A = SFC_CONFIG.progression.attrs, r = this.ratingsOf(i, R), out = {};
      for (const id of A.order) for (const key in A.list[id].keys) { const w = A.list[id].keys[key]; out[key] = 1 + (r[id] / A.scale - 1) * (w == null ? 1 : w); }
      return out;
    },
    avatarStats(R = this.run) { return this.statsOf(0, R); },
    // 2 đồng đội vào trận (opts.mates): chỉ số run, deck Core của họ, chấn thương (p.inj -> băng + khoảnh khắc trong trận)
    mateSpecs(R = this.run) {
      const L = SFC_CONFIG.cores.list;
      return [1, 2].map((i) => {
        const s = R.squad[i];
        return { name: s.m.name, ovr: this.ovrOf(i, R), stats: this.statsOf(i, R), deck: s.m.deck.filter((id) => L[id] && L[id].role !== 'ult'),
          look: this.memberLook(i, R), role: s.role, inj: this.injuryIds(i, R), legend: s.legend || undefined };
      });
    },
    injuryIds(i, R = this.run) { return R ? R.bag.filter((b) => b.who === i && this.badge(b.id).injury).map((b) => b.id) : []; },

    /* ---------- LEGEND (user 2026-10-28, config/legends.config.js): 1 người tối đa 1, ai cũng nhận được (lệch vị trí: tự sáng tạo),
     * có được qua LEGEND TRIAL ---------- */
    legend(id) { return (id && SFC_CONFIG.legends.list[id]) || null; },
    legendOf(i, R = this.run) { return (R && R.squad[i] && R.squad[i].legend) || null; },
    // người đứng vị trí role trong đội hình (-1 = không có)
    roleIndex(role, R = this.run) { return R ? R.squad.findIndex((s) => s.role === role) : -1; },
    // LEGEND vừa qua trial: who = người nhận (thay LEGEND cũ của người đó nếu có), null = từ chối. Co-op: kết quả bỏ phiếu (RunUI.resolve)
    answerJoin(who, R = this.run) {
      const J = R && R.join, s = J && who != null && R.squad[who];
      if (!J || (who != null && !s)) return null;
      R.join = null;
      if (s) s.legend = J.id;
      PF().save();
      return s ? { id: J.id, who } : null;
    },
  });

  /* ---------- BADGE + tiền + Shop / Locker Room (giai đoạn 2; làm lại 2026-10-28: BADGE của cả đội, không cộng chỉ số) ---------- */
  Object.assign(Run, {
    badge(id) { return C().badges[id] || null; },
    roll([lo, hi]) { return lo + Math.floor(Math.random() * (hi - lo + 1)); },
    // hiệu lực 1 BADGE trong túi: số liệu gốc, đã nâng cấp thì ghép badges[id].up lên
    eff(b) {
      const d = this.badge(b.id);
      return !d ? {} : b.up && d.up ? Object.assign({}, d, d.up) : d;
    },
    // BADGE tốt đang có (không tính chấn thương) -> hiệu lực
    effs(R = this.run) { return ((R && R.bag) || []).filter((b) => !this.badge(b.id).injury).map((b) => this.eff(b)); },
    bsum(k, R = this.run) { return this.effs(R).reduce((s, e) => s + (+e[k] || 0), 0); },
    bmax(k, R = this.run) { return this.effs(R).reduce((m, e) => Math.max(m, +e[k] || 0), 0); },
    bany(k, R = this.run) { return this.effs(R).some((e) => !!e[k]); },
    // opts trận từ BADGE của đội (đội 0 = đội bạn): trường phái (coreBoost / draftBias), lượt chọn (draftCards / rerollBonus / draftBonus),
    // tỉ số (Home Crowd), nạp Tuyệt kỹ (ultGain), VAR (varCheck theo đội bị thủng lưới), bù giờ (addedTime)
    matchOpts(R = this.run) {
      const boost = {}, bias = {}, o = {};
      let score = null, gain = 1, V = null;
      for (const e of this.effs(R)) {
        if (e.school) { boost[e.school] = (boost[e.school] || 0) + e.power; bias[e.school] = Math.max(bias[e.school] || 1, e.bias); }
        if (e.score) score = score ? [score[0] + e.score[0], score[1] + e.score[1]] : e.score.slice();
        if (e.ultGain) gain *= e.ultGain;
        if (e.varCheck && (!V || e.varCheck.chance > V.chance)) V = Object.assign({}, e.varCheck);
      }
      if (Object.keys(boost).length) { o.coreBoost = [boost, null]; o.draftBias = [bias, null]; }
      if (score) o.score = score;
      if (gain !== 1) o.ultGain = [gain, null];
      const cards = this.bsum('draftCards', R), rr = this.bsum('rerolls', R), extra = this.bsum('draftBonus', R), add = this.bmax('addedTime', R);
      if (cards) o.draftCards = [cards, 0];
      if (rr) o.rerollBonus = [rr, 0];
      if (extra) o.draftBonus = [extra, 0];
      if (V) o.varCheck = [V, null];
      if (add) o.addedTime = [add, 0];
      return o;
    },
    // BADGE tốt không trùng trong túi (chấn thương thì xét theo từng người: injured)
    has(id, R = this.run) { return !!R && R.bag.some((b) => b.id === id); },
    injured(id, who, R = this.run) { return !!R && R.bag.some((b) => b.id === id && b.who === who); },
    // chấn thương trong túi: [{ b, k (vị trí trong túi) }]
    injuries(R = this.run) { return R ? R.bag.map((b, k) => ({ b, k })).filter((x) => this.badge(x.b.id).injury) : []; },
    // BADGE nâng cấp được: [{ b, k }]
    upgradable(R = this.run) { return R ? R.bag.map((b, k) => ({ b, k })).filter((x) => !x.b.up && this.badge(x.b.id).up && !this.badge(x.b.id).injury) : []; },
    // bốc n BADGE khác nhau chưa có trong túi (không có chấn thương), độ hiếm theo trọng số w
    rollBadges(n, w, R = this.run) {
      const B = C().badges, out = [];
      const taken = this.taken(R);
      const free = (rar) => Object.keys(B).filter((id) => !B[id].injury && (!rar || B[id].rarity === rar) && !taken.has(id) && !out.includes(id));
      while (out.length < n) {
        let list = free(weighted(Math.random, w));
        if (!list.length) list = free(null);
        if (!list.length) break;
        out.push(list[Math.floor(Math.random() * list.length)]);
      }
      return out;
    },
    // BADGE vào túi của đội (Shop / sự kiện / thưởng): null = không có gì
    give(id, R = this.run) {
      if (!id || !this.badge(id) || this.badge(id).injury || this.has(id, R)) return null;
      R.bag.push({ id, up: false });
      return id;
    },
    // chấn thương ngẫu nhiên vào 1 người ngẫu nhiên của đội (Skill game hỏng / sự kiện) -> { id, who } | { blocked: true } (Shin Guards) | null
    injure(R = this.run) {
      const g = this.bsum('guard', R);
      if (!R.guard || R.guard.act !== R.act) R.guard = { act: R.act, n: 0 };
      if (R.guard.n < g) { R.guard.n++; return { blocked: true }; }
      const B = C().badges, opts = [];
      for (let who = 0; who < R.squad.length; who++) for (const id in B) if (B[id].injury && !this.injured(id, who, R)) opts.push({ id, who });
      if (!opts.length) return null;
      const x = opts[Math.floor(Math.random() * opts.length)];
      R.bag.push({ id: x.id, up: false, who: x.who });
      return x;
    },
    // thưởng sau trận (của cả đội): chọn i (null = bỏ qua). Co-op: kết quả bỏ phiếu (RunUI.resolve)
    pick(i) {
      const R = this.run;
      if (!R || !R.offer) return null;
      const id = i == null ? null : R.offer.ids[i] || null;
      R.offer = null;
      this.give(id, R);
      PF().save();
      return id;
    },

    // Shop: run.shop.size BADGE (Season Ticket: rẻ hơn) + chữa 1 chấn thương · 1 món HOT ngẫu nhiên giá x run.shop.hot
    openShop(R = this.run) {
      const S = C().shop, off = Math.min(0.8, this.bmax('shopOff', R));
      const items = this.rollBadges(S.size, C().rarityWeights.shop, R)
        .map((id) => ({ id, price: Math.round((S.price[this.badge(id).rarity] || 99) * (1 - off)), sold: false }));
      const hot = S.hot && items.length ? items[Math.floor(Math.random() * items.length)] : null;
      if (hot) { hot.hot = true; hot.price = Math.round(hot.price * S.hot); }
      return { kind: 'shop', healed: false, items };
    },
    healPrice(R = this.run) { return Math.round(C().shop.heal * (1 - Math.min(0.8, this.bmax('shopOff', R)))); },
    // Locker Room: left = số việc làm được (Ice Bath: 2)
    openRest(R = this.run) { return { kind: 'rest', left: this.bany('restTwice', R) ? 2 : 1 }; },
    // xong 1 việc ở Locker Room: còn lượt thì ở lại
    restUsed(R) {
      if (R.room && R.room.kind === 'rest' && R.room.left > 1) R.room.left--;
      else R.room = null;
    },
    buy(i, key = 'host') {
      const R = this.run, it = R && R.room && R.room.kind === 'shop' && R.room.items[i], P = R && this.pl(key, R);
      if (!it || !P || it.sold || P.cash < it.price || this.has(it.id)) return false;
      P.cash -= it.price;
      it.sold = true;
      this.give(it.id, R);
      PF().save();
      return true;
    },
    // chữa chấn thương ở vị trí k trong túi (Shop: tốn tiền, 1 lần · Locker Room: miễn phí, dùng 1 lượt của phòng)
    heal(k, key = 'host') {
      const R = this.run, room = R && R.room, b = R && R.bag[k], P = R && this.pl(key, R);
      if (!room || !b || !P || !this.badge(b.id).injury) return false;
      if (room.kind === 'shop') {
        if (room.healed || P.cash < this.healPrice(R)) return false;
        P.cash -= this.healPrice(R);
        room.healed = true;
      } else if (room.kind === 'rest') this.restUsed(R);
      else return false;
      R.bag.splice(k, 1);
      PF().save();
      return true;
    },
    // Locker Room: nâng cấp BADGE ở vị trí k trong túi (dùng 1 lượt của phòng)
    upgrade(k) {
      const R = this.run, b = R && R.bag[k], d = b && this.badge(b.id);
      if (!R || !R.room || R.room.kind !== 'rest' || !b || b.up || !d.up || d.injury) return false;
      b.up = true;
      this.restUsed(R);
      PF().save();
      return true;
    },
    // kết quả Skill game / LEGEND TRIAL (Profile.awardMatch gọi thay cho thưởng trận) -> { tier, ok, cash, badge, injury, legend, lines }
    recordDrill(game) {
      const R = this.run, o = game.opts.run;
      if (R && R.mirror) { const t = (game.drill && game.drill.tier) || 0; return { tier: t, ok: t > 0, trial: !!(o && o.trial), lines: [], mirror: true }; }
      if (!R || !o || o.nonce !== R.nonce || !R.room || (R.room.kind !== 'skill' && R.room.kind !== 'trial')) return null;
      return this.drillDone(R, (game.drill && game.drill.tier) || 0);
    },
    // tier: 0 = hỏng (chấn thương) · 1 ĐỒNG · 2 BẠC · 3 VÀNG — thưởng run.tierReward. LEGEND TRIAL: trialDone
    drillDone(R, tier) {
      if (R.room.kind === 'trial') return this.trialDone(R, tier);
      // co-op: tiền về người vừa đá bài (R.room.player); BADGE vào túi cả đội; chấn thương rơi vào 1 người ngẫu nhiên của đội
      const n = this.find(R.next), drill = R.room.drill, rw = C().tierReward[tier], out = { tier, ok: tier > 0, lines: [] };
      const key = this.pl(R.room.player, R) ? R.room.player : 'host', P = this.pl(key, R);
      R.pending = null; R.next = null; R.room = null;
      if (n) this.advance(R, n);
      R.log.push({ act: R.act, node: n ? n.id : null, kind: 'skill', drill, tier, ok: tier > 0 });
      if (rw) {
        out.cash = this.roll(rw.cash);
        P.cash += out.cash;
        out.lines.push({ label: SFC.t('Run cash +${n}', { n: out.cash }), note: true });
        if (rw.badge) {
          out.badge = this.give(this.rollBadges(1, C().rarityWeights.match, R)[0], R);
          if (out.badge) out.lines.push({ label: SFC.t('BADGE: {name}', { name: this.badge(out.badge).name }), note: true });
        }
        if (rw.offer) {
          R.offer = { ids: this.rollBadges(C().offer, C().rarityWeights.match, R), kind: 'skill' };
          out.lines.push({ label: SFC.t('Pick a badge on the map'), note: true });
        }
      } else {
        out.injury = this.injure(R);
        if (out.injury && out.injury.blocked) out.lines.push({ label: SFC.t('Shin Guards blocked an injury!'), note: true });
        else if (out.injury) out.lines.push({ label: SFC.t('Injury: {name} · {who}', { name: this.badge(out.injury.id).name, who: this.memberName(out.injury.who, R) }), note: true });
      }
      return out;
    },
    // LEGEND TRIAL xong: qua -> LEGEND xin vào đội (R.join: chọn người nhận / từ chối) · hỏng -> không mất gì
    trialDone(R, tier) {
      const n = this.find(R.next), id = R.room.legend, L = this.legend(id), out = { tier, ok: tier > 0, trial: true, legend: id, lines: [] };
      R.pending = null; R.next = null; R.room = null;
      if (n) this.advance(R, n);
      R.log.push({ act: R.act, node: n ? n.id : null, kind: 'trial', legend: id, ok: tier > 0 });
      if (tier > 0 && L) {
        R.join = { id };
        out.lines.push({ label: SFC.t('{name} wants to join!', { name: L.name }), note: true });
      } else out.lines.push({ label: SFC.t('Trial failed. No harm done.'), note: true });
      return out;
    },
    // bỏ qua LEGEND TRIAL (không đá): qua node, không được gì
    skipTrial() {
      const R = this.run, n = R && R.room && R.room.kind === 'trial' && this.find(R.next);
      if (!n) return false;
      R.next = null; R.room = null;
      this.advance(R, n);
      R.log.push({ act: R.act, node: n.id, kind: 'trial', legend: n.legend, ok: false, skip: true });
      PF().save();
      return true;
    },
    // sự kiện ???: lựa chọn i dùng được không (đủ tiền / có chấn thương để chữa)
    // co-op: tiền của sự kiện tính cho cả nhóm — mọi người có mặt cùng trả cost / cùng nhận tiền thắng, nên ai cũng phải đủ tiền
    canChoose(c, R = this.run) {
      if (c.cost && this.keys(R).some((k) => this.pl(k, R).cash < c.cost)) return false;
      if (c.healAll && !this.injuries(R).length) return false;
      return true;
    },
    // chọn lựa chọn i của sự kiện đang mở -> danh sách kết quả [{ kind: 'badge' | 'injury' | 'blocked' | 'cash' | 'heal' | 'lost', id?, who?, n? }]
    choose(i) {
      const R = this.run, ev = R && R.room && R.room.kind === 'event' && C().events[R.room.id], c = ev && ev.choices[i];
      if (!c || !this.canChoose(c)) return null;
      const out = [], keys = this.keys(R);
      if (c.cost) for (const k of keys) this.pl(k, R).cash -= c.cost;
      const won = c.chance == null || Math.random() < c.chance;
      if (c.badge) {
        const w = c.badge === 'any' ? C().rarityWeights.match : { [c.badge]: 1 };
        const id = this.give(this.rollBadges(1, w, R)[0], R);
        if (id) out.push({ kind: 'badge', id });
      }
      if (c.win && won) { for (const k of keys) this.pl(k, R).cash += c.win.cash || 0; out.push({ kind: 'cash', n: c.win.cash }); }
      if (c.chance != null && !won) out.push({ kind: 'lost' });
      if (c.injury && Math.random() < c.injury) {
        const x = this.injure(R);
        if (x && x.blocked) out.push({ kind: 'blocked' }); else if (x) out.push({ kind: 'injury', id: x.id, who: x.who });
      }
      if (c.healAll) { R.bag = R.bag.filter((b) => !this.badge(b.id).injury); out.push({ kind: 'heal' }); }
      R.room = null;
      PF().save();
      return out;
    },
    leaveRoom() {
      const R = this.run;
      if (!R || !R.room) return;
      R.room = null;
      PF().save();
    },
  });

  /* ---------- CO-OP (phòng GOAT PATH online, user 2026-10-26) ----------
   * Máy host gọi các hàm này (khách gửi thao tác qua mạng, src/ui/runmap.js -> Session.runAction -> host). key = 'host' | mã hồ sơ khách.
   * Bỏ phiếu: đường đi trên map (node), lựa chọn sự kiện ??? (choose), Locker Room (rest), thưởng chọn 1 trong 3 BADGE (pick, BADGE là của
   * cả đội — 2026-10-28), người nhận LEGEND vừa qua trial (join: số thứ tự trong đội / no) — đủ phiếu người có mặt hoặc quá
   * coop.voteTime giây từ phiếu đầu thì bốc 1 phiếu ngẫu nhiên (lựa chọn nhiều phiếu dễ trúng hơn). Ví riêng, Shop ai mua người nấy trả.
   * Skill game xoay vòng 1 người đá. Đối thủ mạnh lên theo số người thật (coopScale). */
  Object.assign(Run, {
    mirrorOn: false,   // máy này là khách phòng run: Run.run = mirrorR (bản sao host gửi)
    mirrorR: null,
    // hồ sơ người chơi trong run (ví): host = chính R (cash), khách = R.guests[mã]
    pl(key, R = this.run) { return !R ? null : !key || key === 'host' ? R : (R.guests && R.guests[key]) || null; },
    // người đang có mặt: host + khách đang ở trong phòng
    keys(R = this.run) { return ['host'].concat(Object.keys((R && R.guests) || {}).filter((k) => R.guests[k].on)); },
    coopOn(R = this.run) { return !!R && this.keys(R).length > 1; },
    // mã của máy này trong run (khách: mã hồ sơ)
    myKey() { return this.mirrorOn ? PF().data.uid : 'host'; },
    // ô đội hình người có mã key đang đứng (-1 = không)
    seatOf(key, R = this.run) { return !R ? -1 : key === 'host' ? 0 : R.squad.findIndex((s, i) => i && s.h === key); },
    // BADGE không được bốc lại: trong túi + đang chờ chọn
    taken(R = this.run) {
      const set = new Set((R ? R.bag : []).map((b) => b.id));
      if (R && R.offer) R.offer.ids.forEach((id) => set.add(id));
      return set;
    },
    clearOffers(R) { R.offer = null; R.join = null; },
    // đội còn đang chọn BADGE / trả lời LEGEND -> chưa đi tiếp được
    busy(R = this.run) { return !!R && !!(R.offer || R.join); },
    // người đá Skill game tiếp theo (xoay vòng trong số người có mặt)
    nextPlayer(R) {
      const ks = this.keys(R);
      R.turn = (R.turn || 0) + 1;
      return ks[R.turn % ks.length];
    },
    // phòng đổi người: members = [{ key, name, look, role }] các khách đang ở trong phòng (không tính host).
    // Khách mới: ví bắt đầu bằng cash.start; ngồi vào ô đồng đội AI cùng vị trí (BADGE của ô đó giữ nguyên)
    syncRoom(members, R = this.run) {
      if (!R) return;
      R.guests = R.guests || {};
      for (const k in R.guests) R.guests[k].on = false;
      for (const m of members) {
        if (!m || !m.key || m.key === 'host') continue;
        const g = R.guests[m.key] || (R.guests[m.key] = { cash: C().cash.start });
        Object.assign(g, { name: m.name, look: m.look, on: true });
      }
      R.squad.forEach((s, i) => {
        if (!i) return;
        const m = members.find((x) => x.role === s.role && R.guests[x.key]);
        if (m) s.h = m.key; else delete s.h;
      });
      // người rời phòng giữa lúc bỏ phiếu: bỏ phiếu của họ
      if (R.vote) for (const k in R.vote.ballots) if (!this.keys(R).includes(k)) delete R.vote.ballots[k];
      if (R.room && R.room.ready) R.room.ready = R.room.ready.filter((k) => this.keys(R).includes(k));
    },
    // lựa chọn hợp lệ của 1 cuộc bỏ phiếu
    voteOptions(kind, R = this.run) {
      const rm = R.room;
      if (kind === 'node') return !this.active() || rm || R.actNew || this.busy(R) ? [] : this.available().map((n) => n.id);
      if (kind === 'pick') return R.offer ? R.offer.ids.map((x, i) => String(i)).concat(['skip']) : [];
      if (kind === 'join') return R.join ? R.squad.map((x, i) => String(i)).concat(['no']) : [];
      if (kind === 'choose' && rm && rm.kind === 'event') return C().events[rm.id].choices.map((c, i) => (this.canChoose(c, R) ? String(i) : null)).filter((x) => x != null);
      if (kind === 'rest' && rm && rm.kind === 'rest') {
        const out = this.injuries(R).map((x) => 'heal:' + x.k);
        this.upgradable(R).forEach((x) => out.push('up:' + x.k));
        return out.concat(['leave']);
      }
      return [];
    },
    // 1 người bỏ phiếu (đổi phiếu được tới khi chốt). true = nhận
    castVote(key, kind, v, now = Date.now()) {
      const R = this.run;
      if (!R || !this.keys(R).includes(key) || !this.voteOptions(kind, R).includes(String(v))) return false;
      if (!R.vote || R.vote.kind !== kind) R.vote = { kind, ballots: {}, t0: now };
      R.vote.ballots[key] = String(v);
      return true;
    },
    // đủ phiếu người có mặt, hoặc quá coop.voteTime giây từ phiếu đầu
    voteReady(now = Date.now(), R = this.run) {
      const V = R && R.vote;
      if (!V || !Object.keys(V.ballots).length) return false;
      return this.keys(R).every((k) => V.ballots[k] != null) || now - V.t0 >= C().coop.voteTime * 1000;
    },
    // chốt: bốc 1 phiếu ngẫu nhiên (lựa chọn nhiều phiếu dễ trúng hơn) -> { kind, v, voters: người bầu lựa chọn trúng } (phiếu không còn hợp lệ bị bỏ)
    voteRoll(R = this.run) {
      const V = R && R.vote;
      if (!V) return null;
      R.vote = null;
      const ok = this.voteOptions(V.kind, R), ballots = Object.keys(V.ballots).filter((k) => ok.includes(V.ballots[k]));
      if (!ballots.length) return null;
      const v = V.ballots[ballots[Math.floor(Math.random() * ballots.length)]];
      return { kind: V.kind, v, voters: ballots.filter((k) => V.ballots[k] === v) };
    },
    // Shop co-op: người này xong mua sắm; mọi người có mặt xong -> rời Shop. true = đã rời
    shopReady(key, R = this.run) {
      const rm = R && R.room;
      if (!rm || rm.kind !== 'shop') return false;
      rm.ready = rm.ready || [];
      if (!rm.ready.includes(key)) rm.ready.push(key);
      if (this.keys(R).every((k) => rm.ready.includes(k))) { R.room = null; PF().save(); return true; }
      PF().save();
      return false;
    },
    // đối thủ mạnh lên theo số người thật ra sân: Elo AI + coop.eloPer, chỉ số x (1 + coop.statPer) mỗi người thêm
    coopScale(n) {
      const K = C().coop, x = Math.max(0, n - 1);
      return { elo: K.eloPer * x, statMul: 1 + K.statPer * x };
    },

    /* ---------- bản sao cho khách ---------- */
    // host: trạng thái gửi cả phòng (null = chưa có run)
    share() {
      const R = this.mirrorOn ? null : this.run;
      if (!R) return null;
      return Object.assign({}, R, { log: R.log.slice(-12), hostName: PF().data.name || 'PLAYER', hostLook: SFC.Profile.avatar().look });
    },
    // khách: nhận bản sao (đã lọc như run lưu). Hết run: gold meta + tiến trình CORE ROAD cộng cho máy này 1 lần mỗi run
    mirror(st) {
      this.mirrorOn = true;
      const R = this.sanitize(st);
      if (R) {
        if (!R.squad) R.squad = this.makeSquad(null);
        R.mirror = true;
        if ((R.over || R.won) && R.metaGold != null && this.paidNonce !== R.nonce) {
          this.paidNonce = R.nonce;
          PF().data.gold += R.metaGold;
          if (C().coreRoad && C().coreRoad.fromRuns) { this.stats().road += R.roadGain; R.newCores = this.unlockRoad(true); }
          PF().save();
        }
      }
      this.mirrorR = R;
      return R;
    },
    // rời phòng: thôi xem bản sao (Run.run lại là run của máy này)
    leaveMirror() { this.mirrorOn = false; this.mirrorR = null; },
  });

  SFC.Run = Run;
})();
