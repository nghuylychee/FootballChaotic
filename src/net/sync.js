/* Sync — đóng gói / áp trạng thái trận giữa host và máy khách (online PvP)
 * - Host: snapshot(g) mỗi N bước + các lệnh hiệu ứng / âm thanh / sự kiện phát sinh (capture)
 * - Khách: apply(g, snap) lên một Game "gương" (không tự mô phỏng), nội suy vị trí giữa 2 snapshot
 * - Phím khách gửi dạng bitmask (RemoteInput ở host giả lập lại SFC.Input)
 */
window.SFC = window.SFC || {};

(function () {
  const ACTIONS = ['up', 'down', 'left', 'right', 'sprint', 'pass', 'through', 'lob', 'shoot', 'skill', 'switch'];
  const BIT = {};
  ACTIONS.forEach((a, i) => (BIT[a] = 1 << i));

  const r1 = (v) => Math.round(v * 10) / 10;
  const r2 = (v) => Math.round(v * 100) / 100;
  const pk = (v) => (typeof v === 'number' ? r2(v) : typeof v === 'boolean' ? (v ? 1 : 0) : v);
  const lerp = (a, b, t) => a + (b - a) * t;

  // các trường cầu thủ cần để vẽ (sprites + renderer)
  const PF = ['x', 'y', 'vx', 'vy', 'facing', 'state', 'stamina', 'charging', 'charge',
    'passMode', 'passCharge', 'passBase', 'flash', 'anim', 'ironCd'];
  const P_BOOL = { charging: true };

  /** Phím của người chơi ở máy khách, được host dùng thay cho SFC.Input */
  class RemoteInput {
    constructor() { this.down = 0; this.pressed = 0; this.pending = 0; }
    receive(down, pressed) { this.down = down | 0; this.pending |= pressed | 0; }
    beginFrame() { this.pressed = this.pending; this.pending = 0; }
    // nhấn-thả nhanh giữa 2 gói tin vẫn tính là đang giữ ở bước đó (để sút/chuyền chạm nhẹ)
    isDown(a) { return !!((this.down | this.pressed) & BIT[a]); }
    wasPressed(a) { return !!(this.pressed & BIT[a]); }
    wasReleased() { return false; }
    endFrame() { this.pressed = 0; }
    reset() { this.down = this.pressed = this.pending = 0; }
  }

  const NULL_INPUT = { isDown: () => false, wasPressed: () => false, wasReleased: () => false, endFrame() {} };

  const Sync = {
    ACTIONS,
    RemoteInput,
    NULL_INPUT,

    encode(fn) {
      let m = 0;
      for (const a of ACTIONS) if (fn(a)) m |= BIT[a];
      return m;
    },

    /* ---------------- HOST ---------------- */
    // Ghi lại mọi hiệu ứng / âm thanh phát sinh để gửi kèm snapshot
    capture(g) {
      const out = (g.netOut = { fx: [], sfx: [], ev: [] });
      const E = g.effects;
      for (const m of ['burst', 'text', 'ring', 'shake', 'flash']) {
        const orig = E[m];
        E[m] = function (...a) { out.fx.push([m].concat(a.map(pk))); return orig.apply(this, a); };
      }
      const oa = E.afterimage;
      E.afterimage = function (p) { out.fx.push(['afterimage', p.id, r1(p.x), r1(p.y), r2(p.facing), r2(p.anim)]); return oa.call(this, p); };
      const os = g.sfx;
      g.sfx = function (n, a) { out.sfx.push(a === undefined ? [n] : [n, pk(a)]); return os.call(this, n, a); };
    },

    // gom sự kiện trận (goal, banner, draft...) trước khi UI tiêu thụ
    collectEvents(g) {
      for (const e of g.events) g.netOut.ev.push(e);
    },

    drain(g) {
      const o = g.netOut, res = { fx: o.fx, sfx: o.sfx, ev: o.ev };
      g.netOut.fx = []; g.netOut.sfx = []; g.netOut.ev = [];
      return res;
    },

    snapshot(g) {
      const b = g.ball, E = g.effects, d = g.draft;
      const s = {
        st: g.state, sT: r2(g.stateT), tm: r2(g.time), el: r2(g.elapsed), gT: r2(g.goldenT || 0),
        fp: g.finalPush ? 1 : 0, gg: g.golden ? 1 : 0,
        sc: [g.teams[0].score, g.teams[1].score],
        ct: g.ctrl.map((p) => (p ? p.id : -1)),
        p: g.players.map((p) => PF.map((k) => pk(p[k]))),
        b: [r1(b.x), r1(b.y), r1(b.z), r1(b.vx), r1(b.vy), r1(b.vz), r1(b.roll), b.owner ? b.owner.id : -1,
          b.fx.fire ? 1 : 0, b.fx.thunder ? 1 : 0],
        co: g.cores.owned,
        ae: [0, 1].map((t) => (g.cores.shieldReady(t) ? 1 : 0)),
        hz: {
          f: E.fires.map((o) => [r1(o.x), r1(o.y), r2(o.t), o.max, o.r]),
          m: E.mines.map((o) => [r1(o.x), r1(o.y), o.team, r2(o.arm), o.r]),
          s: E.slashes.map((o) => [r1(o.x), r1(o.y), r2(o.dx), r2(o.dy), o.len, r2(o.t), o.max]),
          d: E.decoys.map((o) => [r1(o.x), r1(o.y), r1(o.vx), r1(o.vy), o.srcId]),
        },
      };
      if (d) {
        const picked = {};
        for (const t in d.options) picked[t] = d.picked[t] ? 1 : 0;
        s.dr = { o: d.options, pk: picked, r: d.round, l: d.limit, t: r1(d.t) };
      }
      return s;
    },

    /* ---------------- KHÁCH ---------------- */
    apply(g, s) {
      g.state = s.st; g.stateT = s.sT; g.time = s.tm; g.elapsed = s.el; g.goldenT = s.gT;
      g.finalPush = !!s.fp; g.golden = !!s.gg;
      g.teams[0].score = s.sc[0]; g.teams[1].score = s.sc[1];
      g.ctrl = s.ct.map((id) => g.players.find((p) => p.id === id) || null);

      s.p.forEach((row, i) => {
        const p = g.players[i];
        PF.forEach((k, j) => { p[k] = P_BOOL[k] ? !!row[j] : row[j]; });
      });

      const b = g.ball, bb = s.b;
      [b.x, b.y, b.z, b.vx, b.vy, b.vz, b.roll] = bb;
      b.owner = bb[7] >= 0 ? g.players.find((p) => p.id === bb[7]) : null;
      b.fx = {};
      if (bb[8]) b.fx.fire = {};
      if (bb[9]) b.fx.thunder = {};

      // Core: chỉ thêm id mới (giữ nguyên thứ tự sở hữu)
      for (let t = 0; t < 2; t++) {
        const own = g.cores.owned[t];
        for (const id of s.co[t]) if (!own.includes(id)) own.push(id);
        g.cores.st(t, 'aegis_wall').ready = !!s.ae[t];
      }

      const E = g.effects, h = s.hz;
      E.fires = h.f.map(([x, y, t, max, r]) => ({ x, y, t, max, r }));
      E.mines = h.m.map(([x, y, team, arm, r]) => ({ x, y, team, arm, r }));
      E.slashes = h.s.map(([x, y, dx, dy, len, t, max]) => ({ x, y, dx, dy, len, t, max }));
      E.decoys = h.d.map(([x, y, vx, vy, srcId]) => {
        const src = g.players.find((p) => p.id === srcId);
        return {
          x, y, vx, vy, alive: true,
          runner: src ? { team: src.team, role: src.role, look: src.look, facing: Math.atan2(vy, vx), anim: g.time * 1.3 } : null,
        };
      });

      if (s.dr) {
        const prev = g.draft;
        g.draft = { options: s.dr.o, picked: Object.assign({}, s.dr.pk), round: s.dr.r, limit: s.dr.l, t: s.dr.t, aiPicks: [] };
        // khách vừa chọn nhưng host chưa xác nhận -> giữ trạng thái đã chọn
        if (prev && prev.round === s.dr.r && prev.localPick != null) {
          g.draft.localPick = prev.localPick;
          g.draft.picked[g.humanTeam] = 1;
        }
      } else g.draft = null;
    },

    // nội suy vị trí giữa snapshot a (đã apply) và b
    blend(g, a, b, t) {
      if (!b || t <= 0) return;
      const sameOwner = a.b[7] === b.b[7];
      a.p.forEach((row, i) => {
        const p = g.players[i], nb = b.p[i];
        // bỏ qua nếu dịch chuyển quá xa (giao bóng lại, dịch chuyển tức thời)
        if (Math.abs(nb[0] - row[0]) + Math.abs(nb[1] - row[1]) > 40) return;
        p.x = lerp(row[0], nb[0], t);
        p.y = lerp(row[1], nb[1], t);
        p.facing = row[4] + SFC.U.angleDiff(row[4], nb[4]) * t;
      });
      const ball = g.ball;
      if (sameOwner && Math.abs(b.b[0] - a.b[0]) + Math.abs(b.b[1] - a.b[1]) < 60) {
        ball.x = lerp(a.b[0], b.b[0], t);
        ball.y = lerp(a.b[1], b.b[1], t);
        ball.z = lerp(a.b[2], b.b[2], t);
      }
    },

    // vệt bóng tính tại máy khách theo vị trí đã vẽ
    trail(g) {
      const b = g.ball;
      if (b.owner) { b.trail.length = 0; return; }
      b.trail.unshift({ x: b.x, y: b.y, z: b.z });
      if (b.trail.length > SFC_CONFIG.game.ball.trailLength) b.trail.pop();
    },

    replay(g, pack) {
      for (const f of pack.fx) {
        const [m, ...a] = f;
        if (m === 'afterimage') {
          const p = g.players.find((q) => q.id === a[0]);
          if (p) g.effects.afterimage({ x: a[1], y: a[2], facing: a[3], team: p.team, role: p.role, look: p.look, anim: a[4] });
        } else if (g.effects[m]) g.effects[m](...a);
      }
      for (const [n, a] of pack.sfx) if (SFC.Audio[n]) SFC.Audio[n](a);
      for (const e of pack.ev) g.events.push(e);
    },
  };

  SFC.Sync = Sync;
})();
