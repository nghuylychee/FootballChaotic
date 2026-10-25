/* Run — GOAT PATH (docs/RUN_DESIGN.md, config/run.config.js): run 3 act kiểu Slay the Spire. Không dính DOM (để sau này co-op chạy được).
 * Run đang dở lưu ở Profile.data.run (lưu sau mỗi node, thoát game vào lại vẫn tiếp), null = không có run:
 *   { seed, nonce, act, bosses: [id đội boss từng act], spare: [boss không được bốc], map, at, path, log, pending, over, won, started,
 *     cash ($ trong run), bag: [{ id, up }] (BADGE, up = đã nâng cấp), offer: { ids, kind } (thưởng chọn 1 sau trận thắng),
 *     room: { kind: 'shop', items: [{ id, price, sold }], healed } | { kind: 'rest' } | { kind: 'skill', drill } | { kind: 'event', id }
 *           (đang đứng trong Shop / Locker Room / trước Skill game / trong sự kiện ???),
 *     floors (số node đã qua cả run), metaGold (gold meta đã quy đổi lúc hết run, null = chưa) }
 *   map = { floors: [[node]], boss: node } của act đang đá. node = { id 'f.c', f, c, kind, team?, elo?, next: [id], jx, jy }
 *   at = id node vừa xong (null = chưa vào node nào của act) · path = các node đã qua ở act này · log = các trận đã đá
 *   pending = id node đang đá dở (ghi lúc giao bóng): tắt game giữa trận -> lần chạy sau tính thua (settle), giống Main Path
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

  // dữ liệu đối thủ theo id đội: lấy từ vòng FOOTBALL STORY cũ có đội đó (sân, Core đặc trưng, luật trận, câu nói)
  let OPP = null;
  function oppTable() {
    if (OPP) return OPP;
    OPP = {};
    for (const s of SFC_CONFIG.stories.list) for (const rd of s.rounds || []) if (!OPP[rd.team]) OPP[rd.team] = rd;
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
    get run() { return PF().data ? PF().data.run || null : null; },
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
      const ids = new Set(), okNode = (n) => n && typeof n === 'object' && typeof n.id === 'string' && kinds[n.kind] && (!n.team || T[n.team]);
      for (const fl of m.floors) {
        if (!Array.isArray(fl) || !fl.length || !fl.every(okNode)) return null;
        fl.forEach((n) => ids.add(n.id));
      }
      if (!okNode(m.boss) || m.boss.id !== 'boss') return null;
      ids.add('boss');
      for (const fl of m.floors) for (const n of fl) if (!Array.isArray(n.next) || !n.next.every((x) => ids.has(x))) return null;
      const id = (x) => (typeof x === 'string' && ids.has(x) ? x : null);
      const B = C().badges, isB = (x) => typeof x === 'string' && !!B[x];
      const bag = (Array.isArray(raw.bag) ? raw.bag : []).filter((b) => b && isB(b.id)).map((b) => ({ id: b.id, up: !!b.up && !B[b.id].noUp && !B[b.id].injury }));
      const offer = raw.offer && Array.isArray(raw.offer.ids) && raw.offer.ids.every(isB) ? { ids: raw.offer.ids.slice(0, 5), kind: String(raw.offer.kind || 'match') } : null;
      const rm = raw.room, room = !rm || typeof rm !== 'object' ? null
        : rm.kind === 'rest' ? { kind: 'rest' }
        : rm.kind === 'skill' && C().drills[rm.drill] ? { kind: 'skill', drill: rm.drill }
        : rm.kind === 'event' && C().events[rm.id] ? { kind: 'event', id: rm.id }
        : rm.kind === 'shop' && Array.isArray(rm.items) ? { kind: 'shop', healed: !!rm.healed, items: rm.items.filter((x) => x && isB(x.id)).map((x) => ({ id: x.id, price: clampInt(x.price, 0, 9999), sold: !!x.sold })) }
        : null;
      return {
        cash: clampInt(raw.cash, 0, 99999), bag, offer, room, floors: clampInt(raw.floors, 0, 999),
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
    start() {
      const seed = Math.floor(Math.random() * 2 ** 31), rng = SFC.U.seeded(seed);
      const bosses = C().acts.map((a) => a.boss[Math.floor(rng() * a.boss.length)]);
      const spare = C().acts.flatMap((a, i) => a.boss.filter((b) => b !== bosses[i]));
      const R = { seed, nonce: Math.random().toString(36).slice(2, 10), act: 0, bosses, spare, map: null, at: null, path: [],
        log: [], pending: null, over: false, won: false, actNew: true, started: Date.now(),   // actNew: màn map chiếu thẻ mở act
        cash: C().cash.start, bag: [], offer: null, room: null, floors: 0, metaGold: null,
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
      if (!R || !R.pending || R.over || R.won) return false;
      // tắt game giữa Skill game: tính hỏng bài (chấn thương), không mất run
      if (R.room && R.room.kind === 'skill') { this.drillDone(R, false); PF().save(); return true; }
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
      // số trận trên mọi đường đi (tầng 0 -> tầng cuối)
      const play = (n) => !!C().nodes[n.kind].play;
      const spare = act.spareBoss ? R.spare.filter((id) => C().acts.findIndex((x) => x.boss.includes(id)) < a) : [];
      // k = số trận · ke = số Elite (Matchday chỉ lấy đội của act, Elite có thêm boss dư) -> đủ đội khác nhau cho cả đường
      const maxM = Math.min(M.maxMatches, act.teams.length + spare.length);
      let bad = 0;
      const walk = (n, k, ke) => {
        k += play(n) ? 1 : 0;
        ke += n.kind === 'elite' ? 1 : 0;
        if (!n.next.length) { if (k < M.minMatches || k > maxM || k - Math.min(ke, spare.length) > act.teams.length) bad++; return; }
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
        const pool = n.kind === 'elite' ? act.teams.concat(spare) : act.teams;
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
      // Skill game: màn giới thiệu bài trước (R.room skill), qua node lúc đá xong (recordDrill)
      if (kind === 'skill') {
        const ids = Object.keys(C().drills);
        R.next = id;
        R.room = { kind: 'skill', drill: ids[Math.floor(Math.random() * ids.length)] };
        PF().save();
        return { room: 'skill', node: n };
      }
      this.advance(R, n);
      if (kind === 'shop') R.room = this.openShop();
      else if (kind === 'rest') R.room = { kind: 'rest' };
      else if (kind === 'event') { const ev = Object.keys(C().events); R.room = { kind: 'event', id: ev[Math.floor(Math.random() * ev.length)] }; }
      else if (kind === 'treasure') R.offer = { ids: this.rollBadges(C().offer, C().rarityWeights.match), kind: 'treasure' };
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
    // trận của node đang chọn (R.next) -> dữ liệu dựng trận
    match() {
      const R = this.run, n = R && this.active() && R.next && this.find(R.next);
      if (!n) return null;
      // Skill game: đối thủ = 1 đội ngẫu nhiên của act (chỉ để mặc áo), Elo như trận cùng tầng, sân của act
      if (R.room && R.room.kind === 'skill') {
        const A = this.act(R.act), F = C().map.floors, team = A.teams[Math.floor(Math.random() * A.teams.length)];
        const elo = Math.round(A.elo[0] + (A.elo[1] - A.elo[0]) * Math.min(1, n.f / Math.max(1, F - 2)));
        return { node: n, team, elo, arena: A.arena, drill: R.room.drill, info: { nonce: R.nonce, act: R.act, node: n.id, kind: 'skill', drill: R.room.drill } };
      }
      if (!C().nodes[n.kind].play) return null;
      const o = this.opp(n.team) || {};
      return { node: n, team: n.team, elo: n.elo, arena: o.arena, signature: o.signature || null, mod: o.mod || null, barks: o.barks || null,
        info: { nonce: R.nonce, act: R.act, node: n.id, kind: n.kind } };
    },
    // 2 đồng đội AI: đồng đội đang chọn + 1 người trong đội hình (thiếu thì cầu thủ ngẫu nhiên cùng trình node) — như Cup.pickMates
    pickMates(elo) {
      const M = SFC.Mates, active = M.active(), roster = M.roster().filter((m) => m !== active);
      const out = [active, roster[0]].filter(Boolean);
      const taken = [PF().data.name].concat(out.map((m) => m.name));
      while (out.length < SFC_CONFIG.game.roles.length - 1) out.push(SFC.MainPath.fakePlayer(elo, taken));
      return out;
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
      // tiền + thưởng chọn 1 trong 3 BADGE (hiện ở map, lưu trong run: tải lại không đổi được bộ khác)
      const cash = this.roll(C().cash.win[n.kind] || C().cash.win.match);
      R.cash += cash;
      out.cash = cash;
      out.lines.push({ label: SFC.t('Run cash +${n}', { n: cash }), note: true });
      R.offer = { ids: this.rollBadges(C().offer, C().rarityWeights[n.kind] || C().rarityWeights.match), kind: n.kind };
      if (n.kind === 'boss') {
        this.stats().bosses++;
        out.actDone = true;
        R.cue = 'after:' + R.act;   // map chiếu cut-scene hạ boss trước khi tiếp
        const demoActs = SFC_DEMO && SFC_CONFIG.demo ? SFC_CONFIG.demo.runActs || 1 : 0;
        if (R.act >= C().acts.length - 1) { R.won = out.won = true; this.stats().wins++; R.offer = null; this.finish(R); }
        // bản DEMO: hết act được chơi = hết run (DEMO COMPLETE), không tính vô địch
        else if (demoActs && R.act + 1 >= demoActs) { R.over = out.over = R.demoEnd = true; R.offer = null; this.finish(R); }
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

  /* ---------- BADGE + tiền + Shop / Locker Room (giai đoạn 2) ---------- */
  Object.assign(Run, {
    badge(id) { return C().badges[id] || null; },
    roll([lo, hi]) { return lo + Math.floor(Math.random() * (hi - lo + 1)); },
    // hiệu lực 1 BADGE trong túi (đã nâng cấp: số liệu x up.mult)
    eff(b) {
      const d = this.badge(b.id), k = b.up ? C().up.mult : 1, out = {};
      if (!d) return out;
      if (d.stats) { out.stats = {}; for (const s in d.stats) out.stats[s] = Math.round(d.stats[s] * k); }
      if (d.school) { out.school = d.school; out.power = Math.round(d.power * k); out.bias = 1 + (d.bias - 1) * k; }
      if (d.score) out.score = d.score.slice();
      if (d.ultGain) out.ultGain = 1 + (d.ultGain - 1) * k;
      return out;
    },
    // rating 6 chỉ số của character trong run: nền attrs.fixed + BADGE (kẹp 40..attrs.max)
    ratings(R = this.run) {
      const A = SFC_CONFIG.progression.attrs, out = {};
      for (const id of A.order) out[id] = A.fixed;
      for (const b of (R && R.bag) || []) { const e = this.eff(b); for (const s in e.stats || {}) out[s] += e.stats[s]; }
      for (const id of A.order) out[id] = Math.max(40, Math.min(A.max, out[id]));
      return out;
    },
    // Player.stats của character (cùng công thức Profile.attrMult)
    avatarStats(R = this.run) {
      const A = SFC_CONFIG.progression.attrs, r = this.ratings(R), out = {};
      for (const id of A.order) for (const key in A.list[id].keys) { const w = A.list[id].keys[key]; out[key] = 1 + (r[id] / A.scale - 1) * (w == null ? 1 : w); }
      return out;
    },
    // opts trận từ BADGE (đội 0 = đội bạn): Core trường phái mạnh hơn / ra thường hơn, tỉ số khởi đầu, nạp Tuyệt kỹ
    matchOpts(R = this.run) {
      const boost = {}, bias = {}, o = {};
      let score = null, gain = 1;
      for (const b of (R && R.bag) || []) {
        const e = this.eff(b);
        if (e.school) { boost[e.school] = (boost[e.school] || 0) + e.power; bias[e.school] = Math.max(bias[e.school] || 1, e.bias); }
        if (e.score) score = score ? [score[0] + e.score[0], score[1] + e.score[1]] : e.score;
        if (e.ultGain) gain *= e.ultGain;
      }
      if (Object.keys(boost).length) { o.coreBoost = [boost, null]; o.draftBias = [bias, null]; }
      if (score) o.score = score;
      if (gain !== 1) o.ultGain = [gain, null];
      return o;
    },
    has(id, R = this.run) { return !!R && R.bag.some((b) => b.id === id); },
    injuries(R = this.run) { return R ? R.bag.filter((b) => this.badge(b.id).injury) : []; },
    // bốc n BADGE khác nhau chưa có trong túi (không có chấn thương), độ hiếm theo trọng số w
    rollBadges(n, w, R = this.run) {
      const B = C().badges, out = [];
      const free = (rar) => Object.keys(B).filter((id) => !B[id].injury && (!rar || B[id].rarity === rar) && !this.has(id, R) && !out.includes(id));
      while (out.length < n) {
        let list = free(weighted(Math.random, w));
        if (!list.length) list = free(null);
        if (!list.length) break;
        out.push(list[Math.floor(Math.random() * list.length)]);
      }
      return out;
    },
    give(id, R = this.run) { if (this.badge(id) && !this.has(id, R)) R.bag.push({ id, up: false }); },
    // chấn thương ngẫu nhiên chưa có (Skill game hỏng / sự kiện) -> id | null
    injure(R = this.run) {
      const B = C().badges, list = Object.keys(B).filter((id) => B[id].injury && !this.has(id, R));
      if (!list.length) return null;
      const id = list[Math.floor(Math.random() * list.length)];
      R.bag.push({ id, up: false });
      return id;
    },
    // thưởng sau trận: chọn i (null = bỏ qua)
    pick(i) {
      const R = this.run;
      if (!R || !R.offer) return null;
      const id = i == null ? null : R.offer.ids[i];
      if (id) this.give(id);
      R.offer = null;
      PF().save();
      return id;
    },

    // Shop: run.shop.size BADGE + chữa 1 chấn thương
    openShop() {
      const S = C().shop;
      return { kind: 'shop', healed: false, items: this.rollBadges(S.size, C().rarityWeights.shop).map((id) => ({ id, price: S.price[this.badge(id).rarity] || 99, sold: false })) };
    },
    buy(i) {
      const R = this.run, it = R && R.room && R.room.kind === 'shop' && R.room.items[i];
      if (!it || it.sold || R.cash < it.price || this.has(it.id)) return false;
      R.cash -= it.price;
      it.sold = true;
      this.give(it.id);
      PF().save();
      return true;
    },
    // chữa chấn thương thứ k trong túi (Shop: tốn tiền, 1 lần · Locker Room: miễn phí, xong phòng)
    heal(id) {
      const R = this.run, room = R && R.room;
      if (!room || !this.badge(id) || !this.badge(id).injury || !this.has(id)) return false;
      if (room.kind === 'shop') {
        if (room.healed || R.cash < C().shop.heal) return false;
        R.cash -= C().shop.heal;
        room.healed = true;
      } else if (room.kind === 'rest') R.room = null;
      else return false;
      R.bag = R.bag.filter((b) => b.id !== id);
      PF().save();
      return true;
    },
    // Locker Room: nâng cấp 1 BADGE (xong phòng)
    upgrade(id) {
      const R = this.run, b = R && R.bag.find((x) => x.id === id), d = b && this.badge(id);
      if (!R || !R.room || R.room.kind !== 'rest' || !b || b.up || d.noUp || d.injury) return false;
      b.up = true;
      R.room = null;
      PF().save();
      return true;
    },
    // kết quả Skill game (Profile.awardMatch gọi thay cho thưởng trận) -> { ok, cash, badge, injury, lines }
    recordDrill(game) {
      const R = this.run, o = game.opts.run;
      if (!R || !o || o.nonce !== R.nonce || !R.room || R.room.kind !== 'skill') return null;
      return this.drillDone(R, !!(game.drill && game.drill.ok));
    },
    drillDone(R, ok) {
      const n = this.find(R.next), drill = R.room.drill, out = { ok, lines: [] };
      R.pending = null; R.next = null; R.room = null;
      if (n) this.advance(R, n);
      R.log.push({ act: R.act, node: n ? n.id : null, kind: 'skill', drill, ok });
      if (ok) {
        out.cash = this.roll(C().cash.win.skill);
        R.cash += out.cash;
        out.badge = this.rollBadges(1, C().rarityWeights.match, R)[0] || null;
        if (out.badge) this.give(out.badge, R);
        out.lines.push({ label: SFC.t('Run cash +${n}', { n: out.cash }), note: true });
        if (out.badge) out.lines.push({ label: SFC.t('BADGE: {name}', { name: this.badge(out.badge).name }), note: true });
      } else {
        out.injury = this.injure(R);
        if (out.injury) out.lines.push({ label: SFC.t('Injury: {name}', { name: this.badge(out.injury).name }), note: true });
      }
      return out;
    },
    // sự kiện ???: lựa chọn i dùng được không (đủ tiền / có chấn thương để chữa)
    canChoose(c, R = this.run) {
      if (c.cost && R.cash < c.cost) return false;
      if (c.healAll && !this.injuries(R).length) return false;
      return true;
    },
    // chọn lựa chọn i của sự kiện đang mở -> danh sách kết quả [{ kind: 'badge' | 'injury' | 'cash' | 'heal' | 'none', id?, n? }]
    choose(i) {
      const R = this.run, ev = R && R.room && R.room.kind === 'event' && C().events[R.room.id], c = ev && ev.choices[i];
      if (!c || !this.canChoose(c)) return null;
      const out = [];
      if (c.cost) R.cash -= c.cost;
      const won = c.chance == null || Math.random() < c.chance;
      if (c.badge) {
        const w = c.badge === 'any' ? C().rarityWeights.match : { [c.badge]: 1 };
        const id = this.rollBadges(1, w)[0];
        if (id) { this.give(id); out.push({ kind: 'badge', id }); }
      }
      if (c.win && won) { R.cash += c.win.cash || 0; out.push({ kind: 'cash', n: c.win.cash }); }
      if (c.chance != null && !won) out.push({ kind: 'lost' });
      if (c.injury && Math.random() < c.injury) { const id = this.injure(); if (id) out.push({ kind: 'injury', id }); }
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

  SFC.Run = Run;
})();
