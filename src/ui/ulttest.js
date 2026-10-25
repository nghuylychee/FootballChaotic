/* PHÒNG TEST TUYỆT KỸ (chỉ bản dev, SFC_DEBUG): thử cảm giác từng Tuyệt kỹ thật nhanh, không cần đạt công thức.
 * Mở: SETTINGS › TEST › ULT TEST ROOM, hoặc index.html?ulttest (vào thẳng phòng test, ?ulttest=moon_stomp chọn sẵn chiêu).
 * Trận luyện tập 3v3 (không giờ, không chọn Core), năng lượng X tự nạp đầy, không ghi gì vào hồ sơ / sổ Tuyệt kỹ.
 * Phím: [ ] đổi chiêu · \ bật / tắt dạng thức tỉnh (X4) · O đối thủ cũng có Tuyệt kỹ mới · F đối thủ đứng yên (bia tập) · B bóng về chân · N giao bóng lại · H ẩn bảng.
 * Bản đóng gói: cả file thành rỗng (scripts/strip-debug.js xoá nhánh SFC_DEBUG, MARKERS có 'ULT TEST').
 */
window.SFC = window.SFC || {};

if (SFC_DEBUG) (function () {
  const U = SFC.U;
  const CORES = () => SFC_CONFIG.cores;
  // thứ tự: 8 Tuyệt kỹ gốc rồi 28 Tuyệt kỹ lai (như ULT BOOK)
  const list = () => { const R = CORES().ults; return Object.values(R.base).concat(R.hybrids.map((h) => h.id)).filter((id) => CORES().list[id]); };
  // chiêu mới của đợt thiết kế lại (docs/ULT_REDESIGN.md): đánh dấu NEW trên bảng
  // + các chiêu sửa lại ở đợt 2 (sau khi user thử phòng test)
  const fresh = () => new Set(Object.values(CORES().ults.renamed || {}).concat(['chaos_roulette', 'comet_onetwo', 'iron_hammer', 'pinball_kick', 'phase_step', 'cannonball', 'boulder_shot']));
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

  const UltTest = {
    active: false,
    idx: 0, lv: 1, opp: false, freeze: false, hide: false,
    refill: 1.2,   // giây sau khi dùng chiêu thì nạp đầy lại

    start(app, id) {
      const C = SFC_CONFIG.game, ids = list();
      if (id && ids.includes(id)) this.idx = ids.indexOf(id);
      app.startMatch({
        home: 'street_kings', away: 'neon_strikers', difficulty: 'normal', humanTeam: 0, training: true, teamSize: [3, 3], noUlts: true,
        solo: [C.roles.indexOf('FWD'), null],
        avatars: [Object.assign(SFC.Profile.avatar(), { role: 'FWD' }, app.avatarStats()), null],
      });
      this.app = app;
      this.g = app.game;
      this.active = true;
      this.usedAt = -1;
      this.mount();
      this.apply();
      if (this.freeze) this.setFreeze(true);
      if (!this.timer) this.timer = setInterval(() => this.tick(), 50);
    },

    stop() {
      this.active = false;
      clearInterval(this.timer); this.timer = 0;
      if (this.el) { this.el.remove(); this.el = null; }
    },

    // gán Tuyệt kỹ đang chọn cho người chơi (thẳng vào danh sách Core, không qua setUlt -> không ghi sổ Tuyệt kỹ / banner khám phá)
    give(p, id, lv) {
      const cs = this.g.cores, own = cs.own[p.id] || (cs.own[p.id] = []);
      for (let i = own.length - 1; i >= 0; i--) if (cs.def(own[i]).role === 'ult') own.splice(i, 1);
      own.push(id);
      p.ult = id; p.ultLv = lv;
      p.res.ult = 1;
      const b = SFC.CoreBehaviors[id];
      if (b && b.onAdd) b.onAdd(cs, p.team, cs.sp(id, p));
    },
    me() { return this.g && this.g.controlled; },
    cur() { return list()[this.idx]; },
    apply() {
      const p = this.me();
      if (!p) return;
      this.give(p, this.cur(), this.lv);
      this.usedAt = -1;
      const d = CORES().list[this.cur()];
      SFC.UI.banner(SFC.CoreSystem.ultName(this.cur(), this.lv).toUpperCase(), 'ULT TEST', '#ffe14f', 1.1);
      this.render();
    },
    setFreeze(on) {
      const g = this.g;
      if (!this.baseDiff) this.baseDiff = g.difficulty;
      g.difficulty = on ? Object.assign({}, this.baseDiff, { speedMult: 0 }) : this.baseDiff;
    },

    tick() {
      const app = this.app;
      if (!this.active) return;
      if (!app || app.game !== this.g) { this.stop(); return; }   // rời trận
      if (this.el) this.el.style.display = app.screen === 'game' ? '' : 'none';
      const g = this.g, p = this.me();
      if (!p || g.state === 'ended') return;
      // năng lượng: dùng xong chờ refill giây rồi nạp đầy
      if (p.res.ult < 1) {
        if (this.usedAt < 0) this.usedAt = performance.now();
        if (performance.now() - this.usedAt > this.refill * 1000) { p.res.ult = 1; this.usedAt = -1; }
      }
      if (this.opp) {
        const pool = [...fresh()].filter((id) => CORES().list[id]);
        for (const o of g.teams[1].players) {
          if (!g.cores.ultOf(o)) this.give(o, U.pick(pool), 1);
          if (o.res.ult < 1 && Math.random() < 0.01) o.res.ult = 1;
        }
      }
    },

    mount() {
      if (this.el) this.el.remove();
      const el = this.el = document.createElement('div');
      el.style.cssText = 'position:absolute;left:6px;top:30px;z-index:50;max-width:190px;padding:3px 5px;background:rgba(20,12,22,.78);'
        + 'border:1px solid #ffe14f;color:#c7ccd6;font:8px/1.4 "Press Start 2P",monospace;pointer-events:none';
      document.getElementById('stage').appendChild(el);
      if (!this.keyed) {
        this.keyed = true;
        window.addEventListener('keydown', (e) => this.key(e), true);
      }
    },
    render() {
      if (!this.el) return;
      const ids = list(), id = this.cur(), d = CORES().list[id], A = CORES().archetypes;
      const tags = d.tags.map((t) => `<span style="color:${A[t].color}">${esc(A[t].label)}</span>`).join(' + ');
      const isNew = fresh().has(id) ? ' <span style="color:#3ff6ff">NEW</span>' : '';
      this.el.innerHTML = this.hide
        ? `<span style="color:#ffe14f">ULT TEST</span> · H`
        : `<div style="color:#ffe14f">ULT ${this.idx + 1}/${ids.length}${isNew}</div>`
        + `<div style="color:#fff">${esc(SFC.CoreSystem.ultName(id, this.lv))}${SFC.CoreSystem.awaken(id, this.lv) ? ' <span style="color:#ffe14f">AWAKENED</span>' : ''}</div>`
        + `<div>${tags}</div>`
        + (SFC.CoreSystem.awaken(id, this.lv) ? `<div style="color:#ffe14f">${esc(SFC.CoreSystem.ultDesc(id, this.lv))}</div>` : '')
        + `<div style="color:${d.needsBall ? '#ffe14f' : d.noBall ? '#ff8a9a' : '#6bff4f'}">${d.needsBall ? 'NEEDS YOUR BALL' : d.noBall ? 'ONLY WITHOUT BALL' : 'ANYTIME'}</div>`
        + `<div style="margin-top:2px">[ ] \\AWAKEN O:${this.opp ? 'ON' : 'off'} F:${this.freeze ? 'ON' : 'off'}</div>`
        + `<div>B:BALL N:RESET H:HIDE</div>`;
    },

    key(e) {
      if (!this.active || !this.app || this.app.screen !== 'game' || this.app.game !== this.g) return;
      const n = list().length;
      let used = true;
      switch (e.code) {
        case 'BracketLeft': this.idx = (this.idx + n - 1) % n; this.apply(); break;
        case 'BracketRight': this.idx = (this.idx + 1) % n; this.apply(); break;
        case 'Backslash': this.lv = this.lv > 1 ? 1 : 2; this.apply(); break;
        case 'KeyO':
          this.opp = !this.opp;
          if (!this.opp) for (const o of this.g.teams[1].players) { const own = this.g.cores.own[o.id] || []; this.g.cores.own[o.id] = own.filter((c) => this.g.cores.def(c).role !== 'ult'); }
          this.render();
          break;
        case 'KeyF': this.freeze = !this.freeze; this.setFreeze(this.freeze); this.render(); break;
        case 'KeyB': {
          const g = this.g, p = this.me();
          if (p && g.state === 'play') { if (g.ball.owner) g.ball.owner = null; g.ball.x = p.x; g.ball.y = p.y; g.ball.z = 0; g.gainPossession(p); }
          break;
        }
        case 'KeyN': this.g.kickoff(0); break;
        case 'KeyH': this.hide = !this.hide; this.render(); break;
        default: used = false;
      }
      if (used) { e.preventDefault(); e.stopPropagation(); }
    },
  };

  SFC.UltTest = UltTest;
})();
