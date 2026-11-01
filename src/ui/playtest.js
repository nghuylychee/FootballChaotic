/* PHÒNG TEST GAMEPLAY (chỉ bản dev, SFC_DEBUG): thử cảm giác bóng đá thuần (chuyền / nhận / sút / tranh chấp) với số người tuỳ ý.
 * Mở: SETTINGS › TEST › GAMEPLAY TEST, hoặc index.html?playtest.
 * Trận luyện tập (không giờ, không chọn Core, không Tuyệt kỹ, không ghi gì vào hồ sơ). Character của bạn đá ĐÁ CAO.
 * Bảng góc trái: bấm nút hoặc phím — 4 / 5 bớt / thêm đồng đội (0..2) · 6 / 7 bớt / thêm đối thủ (0..3) · T đối thủ đứng yên (bia) ·
 * Y đổi độ khó AI · U thêm 1 Core ngẫu nhiên cho bạn · B bóng về chân · N giao bóng lại · H ẩn bảng.
 * Số đo: tốc độ bóng, tốc độ bóng lúc rời chân / lúc tới người nhận của đường chuyền gần nhất, tốc độ chạy của bạn, phím đang đệm.
 * Bản đóng gói: cả file thành rỗng (scripts/strip-debug.js xoá nhánh SFC_DEBUG, MARKERS có 'GAMEPLAY TEST').
 */
window.SFC = window.SFC || {};

if (SFC_DEBUG) (function () {
  const U = SFC.U;
  const C = () => SFC_CONFIG.game;
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

  const PlayTest = {
    active: false,
    mates: 2, opps: 3, diff: 1, freeze: false, hide: false,

    start(app) {
      this.app = app;
      this.launch();
      this.active = true;
      this.mount();
      if (!this.timer) this.timer = setInterval(() => this.tick(), 50);
    },

    // (đá lại) trận luyện tập theo số người / độ khó đang chọn. teamSize bỏ người từ vị trí đầu -> character (FWD) luôn ở cuối đội
    launch() {
      const app = this.app, n = this.mates + 1, diffs = C().ai.difficultyOrder;
      app.startMatch({
        home: 'street_kings', away: 'neon_strikers', difficulty: diffs[this.diff], humanTeam: 0, training: true, noUlts: true,
        teamSize: [n, this.opps], solo: [n - 1, null],
        avatars: [Object.assign(SFC.Profile.avatar(), { role: 'FWD' }, app.avatarStats()), null],
      });
      this.g = app.game;
      this.baseDiff = null;
      this.pass = null; this.last = null;
      if (this.freeze) this.setFreeze(true);
      this.render();
    },

    stop() {
      this.active = false;
      clearInterval(this.timer); this.timer = 0;
      if (this.el) { this.el.remove(); this.el = null; }
    },

    me() { return this.g && this.g.controlled; },
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
      const b = this.g.ball;
      // đường chuyền gần nhất: tốc độ lúc rời chân (lần đá mới có kind 'pass') -> tốc độ ngay trước khi có người chạm
      if (!b.owner && b.kind === 'pass') {
        if (!this.pass || this.pass.n !== b.kickN) this.pass = { n: b.kickN, v0: b.speed, v1: b.speed };
        else this.pass.v1 = b.speed;
      } else if (this.pass) { this.last = this.pass; this.pass = null; }
      if (!this.hide) this.render();
    },

    mount() {
      if (this.el) this.el.remove();
      const el = this.el = document.createElement('div');
      el.style.cssText = 'position:absolute;left:6px;top:30px;z-index:50;width:200px;padding:3px 5px;background:rgba(20,12,22,.8);'
        + 'border:1px solid #6bff4f;color:#c7ccd6;font:8px/1.5 "Press Start 2P",monospace';
      // bấm nút trên bảng không lọt xuống sân (chuột trong trận)
      for (const ev of ['mousedown', 'mouseup', 'pointerdown', 'click']) el.addEventListener(ev, (e) => e.stopPropagation());
      el.addEventListener('click', (e) => { const k = e.target.dataset && e.target.dataset.k; if (k) this.act(k); });
      document.getElementById('stage').appendChild(el);
      if (!this.keyed) {
        this.keyed = true;
        window.addEventListener('keydown', (e) => this.key(e), true);
      }
    },
    render() {
      if (!this.el) return;
      const btn = (k, label) => `<span data-k="${k}" style="cursor:pointer;color:#fff;background:#3a2a40;padding:0 3px;margin:0 1px">${label}</span>`;
      if (this.hide) { this.el.innerHTML = `<span style="color:#6bff4f">GAMEPLAY TEST</span> ${btn('hide', 'H')}`; return; }
      const g = this.g, b = g.ball, p = this.me(), diffs = C().ai.difficultyOrder;
      const spd = (v) => Math.round(v);
      const run = p ? spd(Math.hypot(p.vx, p.vy)) : 0;
      const pz = this.pass || this.last;
      const buf = (g.inputBuf && g.inputBuf[g.me]) || {};
      const bufs = Object.keys(buf).filter((k) => buf[k] > 0).join(' ') || '-';
      const state = b.owner ? (b.owner.team === 0 ? 'OURS' : 'THEIRS') : (b.kind || 'loose').toUpperCase() + (b.keepPace ? ' KEEP' : '');
      this.el.innerHTML = `<div style="color:#6bff4f">GAMEPLAY TEST</div>`
        + `<div>MATES ${btn('m-', '−')} ${this.mates} ${btn('m+', '+')} <span style="color:#6c7385">4/5</span></div>`
        + `<div>OPPS&nbsp; ${btn('o-', '−')} ${this.opps} ${btn('o+', '+')} <span style="color:#6c7385">6/7</span></div>`
        + `<div>AI ${btn('diff', esc(diffs[this.diff].toUpperCase()))} ${btn('freeze', this.freeze ? 'FROZEN' : 'LIVE')} <span style="color:#6c7385">Y T</span></div>`
        + `<div>${btn('core', '+CORE')} ${btn('ball', 'BALL')} ${btn('reset', 'RESET')} ${btn('hide', 'H')}</div>`
        + `<div style="margin-top:3px;color:#ffe14f">BALL ${b.owner ? 0 : spd(b.speed)} · ${esc(state)}</div>`
        + `<div>PASS ${pz ? `${spd(pz.v0)} → ${spd(pz.v1)}` : '-'}</div>`
        + `<div>YOU ${run} px/s</div>`
        + `<div>BUF ${esc(bufs)}</div>`;
    },

    act(k) {
      const g = this.g, p = this.me(), diffs = C().ai.difficultyOrder;
      switch (k) {
        case 'm-': if (this.mates > 0) { this.mates--; this.launch(); } break;
        case 'm+': if (this.mates < 2) { this.mates++; this.launch(); } break;
        case 'o-': if (this.opps > 0) { this.opps--; this.launch(); } break;
        case 'o+': if (this.opps < 3) { this.opps++; this.launch(); } break;
        case 'diff': this.diff = (this.diff + 1) % diffs.length; this.launch(); break;
        case 'freeze': this.freeze = !this.freeze; this.setFreeze(this.freeze); break;
        case 'core': {
          // Core thường ngẫu nhiên chưa có (không phải Tuyệt kỹ)
          if (!p) break;
          const L = SFC_CONFIG.cores.list, own = g.cores.own[p.id] || [];
          const pool = Object.keys(L).filter((id) => L[id].role !== 'ult' && !own.includes(id));
          if (pool.length) { const id = U.pick(pool); g.cores.add(p, id); SFC.UI.banner(L[id].name, 'GAMEPLAY TEST', '#6bff4f', 1); }
          break;
        }
        case 'ball':
          if (p && g.state === 'play') { if (g.ball.owner) g.ball.owner = null; g.ball.x = p.x; g.ball.y = p.y; g.ball.z = 0; g.gainPossession(p); }
          break;
        case 'reset': g.kickoff(0); break;
        case 'hide': this.hide = !this.hide; break;
        default: return;
      }
      this.render();
    },

    key(e) {
      if (!this.active || !this.app || this.app.screen !== 'game' || this.app.game !== this.g) return;
      const map = { Digit4: 'm-', Digit5: 'm+', Digit6: 'o-', Digit7: 'o+', KeyY: 'diff', KeyT: 'freeze', KeyU: 'core', KeyB: 'ball', KeyN: 'reset', KeyH: 'hide' };
      const k = map[e.code];
      if (!k) return;
      e.preventDefault(); e.stopPropagation();
      this.act(k);
    },
  };

  SFC.PlayTest = PlayTest;
})();
