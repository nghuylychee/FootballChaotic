/* Matchmaker — hàng chờ trận xếp hạng Main Path trên máy chủ riêng (server/index.js). Không UI, không mạng:
 * máy chủ đưa vé vào (add / remove), gọi tick(now) mỗi giây, nhận lại các nhóm ghép xong + các vé phải đá với người chơi giả.
 * Luật (config net.queue):
 *  - mỗi vé có khoảng Elo nới dần theo thời gian chờ (range[0] -> range[1] trong widen giây; quá anyAfter giây = ai cũng được)
 *  - 2 vé hợp nhau khi lệch Elo <= khoảng của vé chờ lâu hơn (max 2 khoảng)
 *  - xét vé chờ lâu nhất trước: gom tối đa 4 vé hợp nhau (gần Elo nhất trước); đủ 4 -> ghép ngay,
 *    2–3 -> ghép khi vé đó đã chờ >= gather giây (xem có thêm người tới không)
 *  - hàng không có ai khác quá aloneWait giây (ngẫu nhiên), hoặc chờ quá maxWait -> solo (game tự ghép người chơi giả)
 * Matchmaker.lineup(nhóm) -> đội hình trận 2v2 giống MainPath.matchmake: người thật + người chơi giả cho ghế trống.
 * Vé: { id, elo, role, pf, at (Date.now() lúc vào hàng) } — thêm trường khác tuỳ ý (máy chủ giữ kết nối trong vé).
 */
window.SFC = window.SFC || {};

(function () {
  const Q = () => SFC_CONFIG.net.queue;
  const ROLES = () => SFC_CONFIG.game.roles;
  const avg = (list) => list.reduce((s, x) => s + x, 0) / Math.max(1, list.length);

  class Matchmaker {
    constructor() { this.tickets = []; }

    get size() { return this.tickets.length; }

    add(t) {
      const [lo, hi] = Q().aloneWait;
      t.alone = lo + Math.random() * (hi - lo);
      this.remove(t.id);
      this.tickets.push(t);
      return t;
    }

    remove(id) { this.tickets = this.tickets.filter((t) => t.id !== id); }

    // khoảng Elo của 1 vé sau bấy nhiêu giây chờ
    range(t, now) {
      const q = Q(), waited = (now - t.at) / 1000;
      if (waited >= q.anyAfter) return Infinity;
      return q.range[0] + (q.range[1] - q.range[0]) * Math.min(1, waited / Math.max(0.1, q.widen));
    }

    fits(a, b, now) { return Math.abs(a.elo - b.elo) <= Math.max(this.range(a, now), this.range(b, now)); }

    // -> { groups: [[vé...]], solo: [vé...] } (các vé này đã ra khỏi hàng)
    tick(now) {
      const q = Q(), out = { groups: [], solo: [] }, used = new Set();
      const list = this.tickets.slice().sort((a, b) => a.at - b.at);
      for (const t of list) {
        if (used.has(t)) continue;
        const waited = (now - t.at) / 1000;
        const others = list.filter((o) => o !== t && !used.has(o));
        const near = others.filter((o) => this.fits(t, o, now)).sort((a, b) => Math.abs(a.elo - t.elo) - Math.abs(b.elo - t.elo));
        const group = [t];
        for (const o of near) if (group.length < 4 && group.every((g) => this.fits(g, o, now))) group.push(o);
        if (group.length === 4 || (group.length >= 2 && waited >= q.gather)) {
          for (const g of group) used.add(g);
          out.groups.push(group);
        } else if ((!others.length && waited >= t.alone) || waited >= q.maxWait) {
          used.add(t);
          out.solo.push(t);
        }
      }
      if (used.size) this.tickets = this.tickets.filter((t) => !used.has(t));
      return out;
    }

    /**
     * Đội hình 1 trận 2v2 từ 2–4 vé:
     *  4 người: Elo cao nhất + thấp nhất vs 2 người giữa · 3 người: người cao nhất + người chơi giả vs 2 người còn lại
     *  (Elo người giả cân cho 2 đội bằng nhau) · 2 người: đối đầu, mỗi người 1 đồng đội giả quanh Elo của mình.
     * Vị trí: ai cũng được vị trí mình chọn; trùng trong đội -> người vào hàng trước giữ.
     * -> { seats: [{ id, team, role, elo, name }], fakes: [[spec...], [spec...]], taken: [tên đã dùng], arena, aiProfile }
     *    fakes = Mates.spec + { elo, fake } (giống MainPath.matchmake), arena / aiProfile theo Elo trung bình cả 4 người
     */
    static lineup(group) {
      const MP = SFC.MainPath, roles = ROLES(), q = Q();
      const hs = group.slice().sort((a, b) => b.elo - a.elo);
      const teams = hs.length >= 4 ? [[hs[0], hs[3]], [hs[1], hs[2]]] : hs.length === 3 ? [[hs[0]], [hs[1], hs[2]]] : [[hs[0]], [hs[1]]];
      const seats = [];
      teams.forEach((list, team) => {
        const used = [];
        for (const h of list.slice().sort((a, b) => a.at - b.at)) {
          const role = roles.includes(h.role) && !used.includes(h.role) ? h.role : roles.find((r) => !used.includes(r));
          used.push(role);
          seats.push({ id: h.id, team, role, elo: h.elo, name: (h.pf && h.pf.name) || 'PLAYER' });
        }
      });
      const taken = seats.map((s) => s.name);
      const fakes = [[], []];
      teams.forEach((list, team) => {
        if (list.length >= roles.length) return;
        const h = list[0], mine = seats.find((s) => s.id === h.id), other = teams[1 - team];
        const role = roles.find((r) => r !== mine.role) || roles[0];
        // đội kia đủ 2 người: Elo người giả để 2 đội ngang nhau; không thì quanh Elo người đó (giống MainPath.matchmake)
        let elo = other.length >= 2 ? 2 * avg(other.map((x) => x.elo)) - h.elo : MP.fakeElo(h.elo, q.range[0]);
        elo = Math.max(0, h.elo - q.range[1], Math.min(h.elo + q.range[1], Math.round(elo)));
        fakes[team].push(Matchmaker.fake(elo, role, taken));
      });
      const all = Math.round(avg(seats.map((s) => s.elo).concat(fakes[0].concat(fakes[1]).map((f) => f.elo))));
      const A = MP.area(MP.areaOf(all));
      return { seats, fakes, taken, arena: SFC_CONFIG.arenas[A.arena] ? A.arena : undefined, aiProfile: MP.aiProfile(all) };
    }

    // 1 người chơi giả ở mức Elo, vị trí role (taken: tên đã dùng, thêm tên mới vào)
    static fake(elo, role, taken) {
      const m = SFC.MainPath.fakePlayer(Math.max(0, Math.round(elo)), taken);
      return Object.assign(SFC.Mates.spec(m, role), { elo: m.elo, fake: true });
    }
  }

  SFC.Matchmaker = Matchmaker;
})();
