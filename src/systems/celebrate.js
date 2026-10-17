/* Celebrate — ăn mừng bàn thắng (phần mô phỏng, máy chủ trận cũng chạy file này)
 * Ghi bàn (không phải phản lưới nhà) -> người ghi bàn diễn động tác trong slot costume 'cel' (progression.config.js) suốt trạng thái
 * 'goal' của trận; đồng đội chạy lại chúc mừng. Cầu thủ AI / người chơi giả chưa có động tác thì bốc theo độ hiếm (giữ cả trận).
 * File này chỉ lo chọn động tác + di chuyển (vị trí đi qua snapshot như thường). Tư thế, đạo cụ, hạt: src/render/celebrate-draw.js
 * Trạng thái trên cầu thủ: celId (động tác đang diễn, null = không) · celT (giây đã diễn) · celDir (hướng về khán đài) · celTurn
 * Online: host gửi { pid, cel } kèm sự kiện 'goal' -> máy khách gắn vào trận "gương" (Sync.replay), tự đếm celT (Session.tick).
 */
window.SFC = window.SFC || {};

(function () {
  const ITEMS = () => SFC_CONFIG.progression.items;
  const CFG = () => SFC_CONFIG.game.celebration;
  const DEF = () => SFC_CONFIG.progression.defaultLook.cel;

  // kiểu di chuyển (thiếu = đứng tại chỗ, quay mặt ra khán đài):
  //  run   : chạy về khán đài t giây rồi mới diễn · arc: chạy vòng cung dang tay suốt (máy bay)
  //  slide : chạy t giây rồi trượt gối chậm dần · back: trượt lùi (moonwalk) · crawl: nằm xuống (t giây) rồi trườn
  // t cũng là lúc bắt đầu tư thế chính ở phần vẽ (CelebrateDraw dùng chung qua lead())
  const MOVES = {
    airplane: { type: 'arc' },
    kneeslide: { type: 'slide', t: 0.45 },
    shush: { type: 'run', t: 0.55 },
    spinjump: { type: 'run', t: 0.6 },
    phonecall: { type: 'run', t: 0.5 },
    makeitrain: { type: 'run', t: 0.5 },
    moonwalk: { type: 'back' },
    worm: { type: 'crawl', t: 0.35 },
  };
  const FRONT = Math.PI / 2;   // quay mặt xuống dưới màn hình (về phía camera / khán đài gần)

  const Celebrate = {
    MOVES,
    ids() { return Object.keys(ITEMS()).filter((id) => ITEMS()[id].slot === 'cel'); },
    valid(id) { return !!(ITEMS()[id] && ITEMS()[id].slot === 'cel'); },
    // giây chạy đà trước tư thế chính (0 = diễn ngay)
    lead(id) { const m = MOVES[id]; return m && m.t && m.type !== 'crawl' ? m.t : 0; },

    // cầu thủ AI / người chơi giả: bốc 1 động tác theo độ hiếm (botWeights)
    pick() {
      const W = CFG().botWeights;
      return SFC.U.weightedPick(this.ids(), (id) => W[ITEMS()[id].default ? 'default' : ITEMS()[id].rarity] || 1);
    },

    // bàn thắng: p = người ghi bàn (null / phản lưới = không ai ăn mừng). Trả về id động tác (gửi kèm sự kiện 'goal')
    start(g, p) {
      for (const q of g.players) q.celId = null;
      if (!p) return null;
      // character của người chơi: động tác đã trang bị (máy chủ cũ bỏ mất trường cel -> mặc định); AI: bốc 1 lần, giữ cả trận
      if (!this.valid(p.look.cel)) p.look.cel = p.avatar ? DEF() : this.pick();
      const f = g.field, sy = p.y < f.cy ? -1 : 1, t = g.teams[p.team];
      // về phía khán đài gần nhất, lùi khỏi khung thành vừa ghi bàn
      const dx = -t.dir * 0.75, dy = sy, n = Math.hypot(dx, dy);
      Object.assign(p, {
        celId: p.look.cel, celT: 0, celDir: { x: dx / n, y: dy / n },
        celTurn: -Math.sign(dx || 1) * Math.sign(dy || 1),
        atkType: null, charging: false, charge: 0, bracing: false, state: 'normal', kbx: 0, kby: 0,
      });
      return p.celId;
    },

    // máy khách: sự kiện 'goal' từ host -> gắn động tác lên trận "gương" (+ dự phòng thống kê bàn thắng nếu máy chủ cũ chưa gửi stats)
    remote(g, e) {
      for (const q of g.players) q.celId = null;
      const p = e.pid >= 0 ? g.players.find((q) => q.id === e.pid) : null;
      if (p && !e.own && p.mstats) {
        p.mstats.goals++;
        p.mstats.shots = Math.max(p.mstats.shots, p.mstats.goals);
      }
      if (p && e.cel && this.valid(e.cel)) { p.celId = e.cel; p.celT = 0; }
    },

    // hết trận (Beat 1 trên sân): giữ nguyên vị trí cầu thủ; đội thắng diễn động tác ăn mừng tại chỗ (bỏ qua nhịp chạy đà),
    // đội thua diễn tư thế thất vọng (_lose), hoà thì chống gối thở (_draw). Trả về danh sách [id, celId] gửi kèm sự kiện 'end'
    startEnd(g) {
      const s0 = g.teams[0].score, s1 = g.teams[1].score;
      const win = s0 > s1 ? 0 : s1 > s0 ? 1 : -1;
      for (const p of g.players) {
        let cid = '_draw';
        if (win >= 0) {
          if (p.team === win) {
            const custom = p.avatar && this.valid(p.look.cel) && p.look.cel !== DEF() ? p.look.cel : null;
            cid = custom || (p.idx % 2 === 1 ? '_win2' : DEF());
          } else cid = '_lose';
        }
        Object.assign(p, {
          celId: cid, celT: this.lead(cid), vx: 0, vy: 0, kbx: 0, kby: 0, airZ: 0, airVz: 0,
          facing: FRONT, atkType: null, charging: false, charge: 0, bracing: false, state: 'normal',
        });
      }
      return g.players.map((p) => [p.id, p.celId]);
    },

    // máy khách: sự kiện 'end' từ host -> đồng bộ thống kê trận + tư thế ăn mừng / thất vọng của cả 6 cầu thủ
    remoteEnd(g, e) {
      if (g.effects && g.cfg && g.cfg.fx) { g.effects.shakeA = g.cfg.fx.shakeShot; g.effects.shakeT = 0.5; }
      if (Array.isArray(e.stats)) {
        for (const [id, goals, assists, saves, shots] of e.stats) {
          const p = g.players.find((q) => q.id === id);
          if (p) p.mstats = { goals: goals | 0, assists: assists | 0, saves: saves | 0, shots: shots | 0 };
        }
      }
      if (Array.isArray(e.cels) && e.cels.length) {
        for (const [id, cid] of e.cels) {
          const p = g.players.find((q) => q.id === id);
          if (p && cid) {
            Object.assign(p, {
              celId: cid, celT: this.lead(cid), vx: 0, vy: 0, kbx: 0, kby: 0, airZ: 0, airVz: 0,
              facing: FRONT, atkType: null, charging: false, charge: 0, bracing: false, state: 'normal',
            });
          }
        }
      } else {
        this.startEnd(g);
      }
    },

    // mỗi bước trong trạng thái 'goal' (Game.update): người ghi bàn diễn, đồng đội chạy lại, còn lại đứng yên
    update(g, dt) {
      const c = g.players.find((q) => q.celId);
      for (const p of g.players) {
        if (p === c) { this.step(g, p, dt); continue; }
        p.intent.mx = p.intent.my = 0;
        p.intent.sprint = false;
        if (c && c.team === p.team) {
          const dx = c.x - p.x, dy = c.y - p.y, d = Math.hypot(dx, dy);
          if (d > CFG().mateGap) { p.intent.mx = (dx / d) * CFG().mateSpeed; p.intent.my = (dy / d) * CFG().mateSpeed; }
        }
        p.update(dt);
      }
    },

    step(g, p, dt) {
      // còn trên không (vô lê, móc bóng...): đáp đất rồi mới diễn
      if (p.airZ > 0) { p.intent.mx = p.intent.my = 0; p.update(dt); return; }
      const C = CFG(), m = MOVES[p.celId] || {}, d = p.celDir || { x: 0, y: 1 };
      const t = (p.celT += dt);
      p.anim += dt;
      let vx = 0, vy = 0, face = FRONT;
      const toward = (sp) => { vx = d.x * sp; vy = d.y * sp; face = Math.atan2(vy, vx); };
      switch (m.type) {
        case 'run': if (t < m.t) toward(C.runSpeed); break;
        case 'arc': {
          const a = Math.atan2(d.y, d.x) + p.celTurn * t * 2.2;
          vx = Math.cos(a) * C.runSpeed; vy = Math.sin(a) * C.runSpeed; face = a;
          break;
        }
        case 'slide':
          if (t < m.t) toward(C.slideSpeed);
          else { const k = Math.exp(-2.6 * (t - m.t)); vx = d.x * C.slideSpeed * k; vy = d.y * C.slideSpeed * k; }
          break;
        case 'back': {   // moonwalk: mặt nhìn ngang, trượt lùi về phía khán đài
          const sx = d.x >= 0 ? 1 : -1;
          face = sx > 0 ? Math.PI : 0; vx = sx * 34;
          break;
        }
        case 'crawl': {  // con sâu: nằm xuống rồi trườn ngang
          const sx = d.x >= 0 ? 1 : -1;
          face = sx > 0 ? 0 : Math.PI;
          if (t > m.t) vx = sx * 26;
          break;
        }
        default: break;
      }
      p.vx = vx; p.vy = vy; p.facing = face;
      const f = g.field;
      p.x = SFC.U.clamp(p.x + vx * dt, f.x + 10, f.x + f.w - 10);
      p.y = SFC.U.clamp(p.y + vy * dt, f.y + 14, f.y + f.h - 6);
    },
  };

  SFC.Celebrate = Celebrate;
})();
