/* Cup — FOOTBALL STORY (docs/FOOTBALL_STORY.md, config/stories.config.js): 1 Story = 1 cup knockout 16 đội, 4 trận.
 * Lượt chơi (run) chỉ nằm trong bộ nhớ: thoát giữa cup = hết cup (thưởng các trận đã thắng đã cộng ngay lúc thắng).
 * Hồ sơ lưu tiến độ từng Story: Profile.data.story = { <id>: { best, plays, wins, finals, stars: [id sao] } }
 *   best = số trận thắng xa nhất trong 1 lần chơi (4 = vô địch) · plays = số lần bắt đầu · wins = số lần vô địch · finals = số lần vào chung kết.
 * Bracket: 16 ô, bạn ở ô 0. Đối thủ vòng r đứng ở ô 1 · 2 · 4 · 8 (luôn thắng nhánh của mình tới khi gặp bạn);
 * các ô khác là đội lấp (fillers). Trận không có bạn: giả lập ra tỉ số; đội kình địch (rival) luôn thắng đậm.
 * UI: src/ui/cup.js · thưởng cộng trong Profile.awardMatch (record) · trận dựng ở main.js (startCupMatch).
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
      this.run = { id, round: 0, slots, results: [], out: false, champion: false, gold: 0, starsNew: [], mates: this.pickMates(s) };
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
    record(result, game) {
      const R = this.run, s = this.story();
      if (!R || !s || R.out || R.champion || !game.opts.cup || game.opts.cup.id !== R.id || game.opts.cup.round !== R.round) return null;
      const me = game.humanTeam, my = game.teams[me].score, op = game.teams[1 - me].score;
      const r = R.round, win = my > op, rec = this.rec(R.id), lines = [], starsNew = [];
      this.closeRound({ my, op });
      const star = (kind) => {
        for (const x of s.stars || []) if (x.kind === kind && !rec.stars.includes(x.id)) { rec.stars.push(x.id); starsNew.push(x.id); }
      };
      // sao không phụ thuộc thắng thua: ghi 3 bàn trong 1 trận
      const p = game.controlled;
      if (p && p.mstats && p.mstats.goals >= 3) star('hattrick');
      let item = null;
      if (win) {
        const gold = (s.reward && s.reward.gold && s.reward.gold[r]) || 0;
        if (gold) lines.push({ label: SFC.t('{round} won', { round: this.roundName(r) }), xp: 0, gold });
        R.gold += gold;
        rec.best = Math.max(rec.best, r + 1);
        if (r === ROUNDS - 1) {
          R.champion = true;
          star('champ');
          if (op === 0) star('cleanFinal');
          if (my - op >= 3) star('bigWin');
          // costume vô địch: chỉ lần đầu
          if (!rec.wins && s.reward && s.reward.item && SFC_CONFIG.progression.items[s.reward.item]) {
            item = s.reward.item;
            PF().data.items[item] = (PF().data.items[item] || 0) + 1;
          }
          rec.wins++;
        } else {
          R.round++;
          if (R.round === ROUNDS - 1) rec.finals++;
        }
      } else R.out = true;
      R.starsNew = R.starsNew.concat(starsNew);
      R.item = item || R.item || null;
      PF().save();
      return { lines, round: r, win, champion: R.champion, out: R.out, item, starsNew };
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
