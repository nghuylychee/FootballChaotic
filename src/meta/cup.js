/* Cup — FOOTBALL STORY (docs/FOOTBALL_STORY.md, config/stories.config.js): 1 Story = 1 cup knockout 16 đội, 4 trận.
 * Lượt chơi (run) chỉ nằm trong bộ nhớ: thoát giữa cup = hết cup (thưởng các trận đã thắng đã cộng ngay lúc thắng).
 * Hồ sơ lưu tiến độ từng Story: Profile.data.story = { <id>: { best, plays, wins, finals, stars: [id sao], first?, fin? } }
 *   best = số trận thắng xa nhất trong 1 lần chơi (4 = vô địch) · plays = số lần bắt đầu · wins = số lần vô địch · finals = số lần vào chung kết.
 *   first = thời điểm vô địch lần đầu (ms) · fin = [bạn, đối thủ] tỉ số chung kết thắng đậm nhất (PHÒNG TRƯNG BÀY, src/ui/trophies.js).
 * Bracket: 16 ô, bạn ở ô 0. Đối thủ vòng r đứng ở ô 1 · 2 · 4 · 8 (luôn thắng nhánh của mình tới khi gặp bạn);
 * các ô khác là đội lấp (fillers). Trận không có bạn: giả lập ra tỉ số; đội kình địch (rival) luôn thắng đậm.
 * UI: src/ui/cup.js · thưởng cộng trong Profile.awardMatch (record) · trận dựng ở main.js (startCupMatch).
 * Co-op online (phòng Story, src/net/room.js): máy làm host giữ lượt chơi thật (bracket, giả lập nhánh khác) và gửi share() cho cả phòng;
 * khách giữ bản sao mirror(state) (run.mirror = true). Thưởng tính riêng từng máy (pay: gold vòng thắng, best, vô địch, costume, sao hat-trick
 * của chính mình); sao của cả đội (vô địch, chung kết sạch lưới...) máy host tính rồi gửi kèm (ts), khách nhận khi đồng bộ.
 */
window.SFC = window.SFC || {};

(function () {
  const C = () => SFC_CONFIG.stories;
  const PF = () => SFC.Profile;
  const ROUNDS = 4, SIZE = 16;
  const OPP_SLOT = [1, 2, 4, 8];   // ô của đối thủ vòng r
  const irnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  const Cup = {
    run: null,   // lượt chơi đang dở (null = không đá cup nào)

    list() { return C().list; },
    get(id) { return C().list.find((s) => s.id === id) || null; },
    index(id) { return C().list.findIndex((s) => s.id === id); },
    roundName(r) { return C().roundNames[r] || ''; },
    // bản DEMO: chỉ chơi được demo.stories Story đầu (Story chưa có nội dung không tính)
    demoLocked(s) {
      if (!SFC_DEMO) return false;
      const n = (SFC_CONFIG.demo && SFC_CONFIG.demo.stories) || 1;
      return C().list.filter((x) => !x.soon).indexOf(s) >= n;
    },
    playable(s) { return !!s && !s.soon && !this.demoLocked(s); },

    /* ---------- hồ sơ ---------- */
    blankRec() { return { best: 0, plays: 0, wins: 0, finals: 0, stars: [] }; },
    sanitize(raw) {
      const out = {};
      if (!raw || typeof raw !== 'object') return out;
      for (const s of C().list) {
        const r = raw[s.id];
        if (!r || typeof r !== 'object' || s.soon) continue;
        const n = (v, hi) => Math.max(0, Math.min(hi, Math.floor(+v || 0)));
        out[s.id] = {
          best: n(r.best, ROUNDS), plays: n(r.plays, 1e9), wins: n(r.wins, 1e9), finals: n(r.finals, 1e9),
          stars: Array.isArray(r.stars) ? [...new Set(r.stars.filter((id) => (s.stars || []).some((x) => x.id === id)))] : [],
        };
        if (out[s.id].wins && +r.first > 0) out[s.id].first = Math.floor(+r.first);
        if (out[s.id].wins && Array.isArray(r.fin) && r.fin.length === 2) out[s.id].fin = [n(r.fin[0], 99), n(r.fin[1], 99)];
      }
      return out;
    },
    rec(id) {
      const d = PF().data;
      if (!d.story) d.story = {};
      return d.story[id] || (d.story[id] = this.blankRec());
    },
    // tổng completion (trang FOOTBALL STORY + thành tích)
    totals() {
      const real = C().list.filter((s) => !s.soon), recs = real.map((s) => (PF().data.story || {})[s.id] || this.blankRec());
      return {
        cups: recs.filter((r) => r.wins > 0).length, cupsMax: real.length,
        stars: recs.reduce((n, r) => n + r.stars.length, 0), starsMax: real.reduce((n, s) => n + (s.stars || []).length, 0),
        finals: recs.reduce((n, r) => n + r.finals, 0),
      };
    },
    won(id) { return this.rec(id).wins > 0; },

    /* ---------- lượt chơi ---------- */
    // bắt đầu 1 cup: dựng bracket + 2 đồng đội AI cố định cả cup
    start(id) {
      const s = this.get(id);
      if (!this.playable(s)) return null;
      const fill = shuffle(s.fillers.slice());
      const slots = new Array(SIZE).fill(null);
      slots[0] = SFC_CONFIG.mainPath.playerTeam.id;
      OPP_SLOT.forEach((k, r) => { slots[k] = s.rounds[r].team; });
      for (let k = 0, f = 0; k < SIZE; k++) if (!slots[k]) slots[k] = fill[f++ % fill.length];
      this.run = { id, round: 0, slots, results: [], out: false, champion: false, gold: 0, starsNew: [], mates: this.pickMates(s),
        scored: 0, minMargin: 99, golden: false,
        nonce: Math.random().toString(36).slice(2, 10), paid: {}, ts: [] };   // nonce: phân biệt lượt chơi (co-op) · paid: vòng đã trả thưởng · ts: sao cả đội vừa đạt   // cho sao thử thách: tổng bàn ghi · cách biệt nhỏ nhất · đã có trận phải đá bàn thắng vàng
      const r = this.rec(id);
      r.plays++;
      PF().save();
      return this.run;
    },
    abort() { this.run = null; },
    story() { return this.run ? this.get(this.run.id) : null; },
    // vòng đang chờ đá (cup đã xong: null)
    current() {
      const R = this.run, s = this.story();
      return R && s && !R.out && !R.champion ? s.rounds[R.round] : null;
    },

    // đồng đội AI vào trận vòng rd: Mates.spec + chỉ số theo trình đội đối thủ (stories.mateStats) — chơi một mình (main.js) và co-op (ui/cup.js)
    mateSpec(m, role, rd) {
      const spec = SFC.Mates.spec(m, role), C = SFC_CONFIG.stories.mateStats;
      const opp = rd && SFC_CONFIG.teams.list[rd.team] && SFC_CONFIG.teams.list[rd.team].stats;
      if (!C || !opp) return spec;
      for (const k in opp) spec.stats[k] = Math.max(C.min, Math.min(C.max, opp[k]));   // chép từng chỉ số (trung bình đều làm đội bạn nhanh hơn hẳn)
      return spec;
    },

    // 2 đồng đội AI của bạn (chơi một mình): đồng đội đang chọn + 1 người trong đội hình (thiếu thì 1 cầu thủ ngẫu nhiên cùng trình vòng đầu)
    pickMates(s) {
      const M = SFC.Mates, active = M.active(), roster = M.roster().filter((m) => m !== active);
      const out = [active, roster[0]].filter(Boolean);
      const taken = [PF().data.name].concat(out.map((m) => m.name));
      while (out.length < SFC_CONFIG.game.roles.length - 1) out.push(SFC.MainPath.fakePlayer(s.rounds[0].elo, taken));
      return out;
    },

    /* ---------- bracket ---------- */
    // các cặp đấu của vòng r: [[ô a, ô b], ...] (vòng 0: ô liền nhau; vòng sau: đội thắng của 2 cặp liền nhau)
    pairs(r) {
      const R = this.run;
      if (r === 0) { const out = []; for (let k = 0; k < SIZE; k += 2) out.push([k, k + 1]); return out; }
      const prev = R.results[r - 1];
      if (!prev) return [];
      const out = [];
      for (let i = 0; i < prev.length; i += 2) out.push([prev[i].w, prev[i + 1].w]);
      return out;
    },
    // giả lập 1 trận không có bạn: đối thủ sắp gặp bạn luôn thắng (đi đúng nhánh), kình địch thắng đậm
    simMatch(a, b) {
      // path: đối thủ các vòng sau của bạn (mỗi đội nằm 1 nhánh riêng nên không gặp nhau trước khi gặp bạn)
      const s = this.story(), R = this.run, path = OPP_SLOT.filter((k, r) => r > R.round);
      const rivalSlot = s.rival != null ? OPP_SLOT[s.rival] : -1;
      let w = OPP_SLOT.includes(a) && path.includes(a) ? a : OPP_SLOT.includes(b) && path.includes(b) ? b : Math.random() < 0.5 ? a : b;
      const big = w === rivalSlot;
      const ws = big ? irnd(4, 7) : irnd(1, 4), ls = big ? irnd(0, 1) : irnd(0, ws - 1);
      return { a, b, w, sa: w === a ? ws : ls, sb: w === b ? ws : ls };
    },
    // chốt vòng hiện tại sau trận của bạn (mine = { my, op } tỉ số của bạn)
    closeRound(mine) {
      const R = this.run, r = R.round;
      R.results[r] = this.pairs(r).map(([a, b]) => {
        if (a === 0 || b === 0) {
          const opp = a === 0 ? b : a, win = mine.my > mine.op;
          return { a: 0, b: opp, w: win ? 0 : opp, sa: mine.my, sb: mine.op };
        }
        return this.simMatch(a, b);
      });
    },
    // tên đội ở ô k
    teamAt(k) {
      const id = this.run.slots[k];
      return SFC_CONFIG.teams.list[id] || { name: id, short: '???', kit: { shirt: '#888' } };
    },

    /* ---------- kết quả trận (Profile.awardMatch gọi, 1 lần mỗi trận) ---------- */
    // trả về { lines (dòng thưởng thêm), round, win, champion, out, item, starsNew }
    // Máy chạy cup (chơi một mình / host co-op): chốt vòng + đi tiếp. Khách co-op (run.mirror): chỉ thưởng của mình, vòng do host gửi
    record(result, game) {
      const R = this.run, s = this.story(), oc = game.opts.cup;
      if (!R || !s || !oc || oc.id !== R.id) return null;
      const me = game.humanTeam, my = game.teams[me].score, op = game.teams[1 - me].score, r = oc.round | 0, win = my > op;
      if (R.mirror) {
        const pay = this.pay(R, s, r, win, my, op, game);
        return pay && { lines: pay.lines, round: r, win, champion: win && r === ROUNDS - 1, out: !win, item: pay.item, starsNew: pay.starsNew };
      }
      if (R.out || R.champion || r !== R.round) return null;
      this.closeRound({ my, op });
      R.scored += my; R.minMargin = Math.min(R.minMargin, my - op); R.golden = R.golden || !!game.golden;
      // sao của cả đội: máy này nhận ngay, khách co-op nhận qua share (ts)
      R.ts = this.teamStars(s, R, game, r, win, my, op);
      const fresh = this.grant(s, R.ts);
      const pay = this.pay(R, s, r, win, my, op, game) || { lines: [], item: null, starsNew: [] };
      if (win) {
        if (r === ROUNDS - 1) R.champion = true;
        else R.round++;
      } else R.out = true;
      const starsNew = fresh.concat(pay.starsNew);
      R.starsNew = R.starsNew.concat(fresh);
      PF().save();
      return { lines: pay.lines, round: r, win, champion: R.champion, out: R.out, item: pay.item, starsNew };
    },
    // sao của cả đội đạt ở trận vừa xong (id sao): chỉ tính khi thắng chung kết
    teamStars(s, R, game, r, win, my, op) {
      if (!win || r !== ROUNDS - 1) return [];
      const ok = {
        champ: () => true, cleanFinal: () => op === 0, bigWin: () => my - op >= 3, noGolden: () => !R.golden,
        goals: (x) => R.scored >= (x.n || 12), sweep: () => R.minMargin >= 2,
        modClean: () => !!(game.mod && game.mod.cfg && !game.mod.hits),   // luật trận chung kết không trúng đội bạn lần nào
      };
      return (s.stars || []).filter((x) => ok[x.kind] && ok[x.kind](x)).map((x) => x.id);
    },
    // ghi sao (id) vào hồ sơ, trả về các sao mới
    grant(s, ids) {
      const rec = this.rec(s.id), out = [];
      for (const id of ids || []) if ((s.stars || []).some((x) => x.id === id) && !rec.stars.includes(id)) { rec.stars.push(id); out.push(id); }
      return out;
    },
    // thưởng riêng của người chơi máy này cho vòng r (1 lần mỗi vòng mỗi lượt chơi): gold vòng thắng, vòng xa nhất, vào chung kết,
    // vô địch (costume lần đầu, ngày vô địch, tỉ số chung kết đẹp nhất), sao hat-trick của chính mình
    pay(R, s, r, win, my, op, game) {
      R.paid = R.paid || {};
      if (R.paid[r]) return null;
      R.paid[r] = true;
      const rec = this.rec(s.id), lines = [];
      const p = game.controlled, starsNew = p && p.mstats && p.mstats.goals >= 3 ? this.grant(s, (s.stars || []).filter((x) => x.kind === 'hattrick').map((x) => x.id)) : [];
      let item = null;
      if (win) {
        const gold = (s.reward && s.reward.gold && s.reward.gold[r]) || 0;
        if (gold) lines.push({ label: SFC.t('{round} won', { round: this.roundName(r) }), xp: 0, gold });
        R.gold += gold;
        rec.best = Math.max(rec.best, r + 1);
        if (r === ROUNDS - 1) {
          // costume vô địch: chỉ lần đầu
          if (!rec.wins && s.reward && s.reward.item && SFC_CONFIG.progression.items[s.reward.item]) {
            item = s.reward.item;
            PF().data.items[item] = (PF().data.items[item] || 0) + 1;
          }
          rec.wins++;
          if (!rec.first) rec.first = Date.now();
          if (!rec.fin || my - op > rec.fin[0] - rec.fin[1] || (my - op === rec.fin[0] - rec.fin[1] && my > rec.fin[0])) rec.fin = [my, op];
        } else if (r + 1 === ROUNDS - 1) rec.finals++;
      }
      R.starsNew = R.starsNew.concat(starsNew);
      R.item = item || R.item || null;
      PF().save();
      return { lines, item, starsNew };
    },

    /* ---------- co-op online (phòng Story) ---------- */
    // máy làm host: trạng thái lượt chơi gửi cả phòng (null = chưa bắt đầu / đã thoát cup)
    share() {
      const R = this.run;
      if (!R || R.mirror) return null;
      return { n: R.nonce, id: R.id, round: R.round, slots: R.slots, results: R.results, out: R.out, champion: R.champion, ts: R.ts || [] };
    },
    // khách: nhận trạng thái host gửi (đã lọc). Trả về { fresh } = lượt chơi mới với máy này (vừa bắt đầu / vừa vào phòng giữa cup)
    mirror(st) {
      if (!st || typeof st !== 'object') { if (this.run && this.run.mirror) this.run = null; return { fresh: false }; }
      const s = this.get(st.id);
      if (!s || s.soon) return { fresh: false };
      const same = this.run && this.run.mirror && this.run.id === s.id && this.run.nonce === String(st.n);
      const R = same ? this.run : { mirror: true, nonce: String(st.n), gold: 0, starsNew: [], item: null, paid: {}, mates: [], scored: 0, minMargin: 99, golden: false };
      const team = (id) => (typeof id === 'string' && SFC_CONFIG.teams.list[id] ? id : null);
      const n = (v, hi) => Math.max(0, Math.min(hi, Math.floor(+v || 0)));
      const slots = Array.from({ length: SIZE }, (x, k) => team(Array.isArray(st.slots) ? st.slots[k] : null) || (k === 0 ? SFC_CONFIG.mainPath.playerTeam.id : s.rounds[0].team));
      const results = (Array.isArray(st.results) ? st.results.slice(0, ROUNDS) : []).map((list) => (Array.isArray(list) ? list.slice(0, SIZE / 2) : [])
        .map((m) => ({ a: n(m && m.a, SIZE - 1), b: n(m && m.b, SIZE - 1), w: n(m && m.w, SIZE - 1), sa: n(m && m.sa, 99), sb: n(m && m.sb, 99) })));
      Object.assign(R, { id: s.id, round: n(st.round, ROUNDS - 1), slots, results, out: !!st.out, champion: !!st.champion });
      if (!same) { this.rec(s.id).plays++; }
      // sao của cả đội host vừa tính (vô địch, chung kết sạch lưới...)
      R.starsNew = R.starsNew.concat(this.grant(s, Array.isArray(st.ts) ? st.ts.filter((x) => typeof x === 'string') : []));
      this.run = R;
      PF().save();
      return { fresh: !same };
    },

    // bỏ cup giữa trận (Pause > FORFEIT): tính thua, hết cup. Trận vẫn tính vào thống kê như trận thua
    forfeit(game) {
      const R = this.run;
      if (!R || R.out || R.champion) return;
      const d = PF().data;
      d.stats.matches++; d.stats.losses++;
      this.closeRound({ my: 0, op: 1 });
      R.out = true;
      PF().save();
    },
  };

  SFC.Cup = Cup;
})();
