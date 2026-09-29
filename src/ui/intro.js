/* Intro — màn giới thiệu lực lượng 2 đội trước trận (kiểu truyền hình bóng đá). Số liệu: config/intro.config.js
 * Hai nửa màu áo trượt vào · huy hiệu + tên đội + OVR · thẻ cầu thủ (sprite chạy vào rồi tạo dáng, số áo, vị trí) ·
 * VS · sơ đồ đội hình trên sân mini · thanh so sánh chỉ số. Hết giờ / Enter -> trượt ra rồi gọi onDone.
 * Nhịp xuất hiện của DOM chạy bằng CSS animation-delay (--d); sprite + sơ đồ vẽ lại mỗi bước trong update().
 */
window.SFC = window.SFC || {};

(function () {
  const PX = () => SFC.PixelIcon;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const CFG = () => SFC_CONFIG.intro;
  const ROLE = { DEF: 'DEFENDER', FWD: 'FORWARD' };
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const easeOut = (k) => 1 - (1 - k) * (1 - k);

  const Intro = {
    active: false,

    // trận này có màn giới thiệu không (theo intro.modes)
    wants(opts) {
      const I = CFG();
      if (!I || !I.enabled) return false;
      const mode = opts.mainPath ? 'mainPath' : opts.training ? 'training' : 'single';
      return I.modes.includes(mode);
    },

    start(game, onDone) {
      const el = this.el || (this.el = document.getElementById('intro'));
      if (!this.bound) {
        this.bound = true;
        el.addEventListener('click', () => { if (this.active && this.closing < 0 && this.t > CFG().skipAfter) this.close(); });
      }
      this.g = game; this.onDone = onDone; this.t = 0; this.closing = -1; this.cues = {}; this.active = true;
      el.innerHTML = this.html(game);
      el.classList.remove('hidden', 'out');
      this.cards = [...el.querySelectorAll('canvas[data-pid]')].map((cv) => {
        cv.width = 40; cv.height = 44;
        const p = game.players.find((q) => q.id === +cv.dataset.pid);
        return { cv, p, kit: game.teams[p.team].cfg.kit, delay: +cv.dataset.delay };
      });
      this.pitch = el.querySelector('.in-pitch canvas');
      this.draw();
      SFC.Audio.whoosh();
    },

    update(dt, input) {
      if (!this.active) return;
      const I = CFG();
      this.t += dt;
      this.cue('vs', I.vsAt, () => SFC.Audio.hit());
      this.cards.forEach((c, i) => this.cue('c' + i, c.delay, () => SFC.Audio.menu()));
      this.cue('stats', I.statsAt, () => SFC.Audio.upgrade());
      if (this.closing < 0) {
        const skip = this.t > I.skipAfter && (input.wasPressed('confirm') || input.wasPressed('pause') || input.wasPressed('back'));
        if (skip || this.t >= I.duration) this.close();
      } else if (this.t - this.closing >= I.outro) return this.finish();
      this.draw();
    },

    cue(key, at, fn) { if (!this.cues[key] && this.t >= at) { this.cues[key] = true; fn(); } },

    close() {
      this.closing = this.t;
      this.el.style.setProperty('--out', CFG().outro + 's');
      this.el.classList.add('out');
      SFC.Audio.whoosh();
    },

    finish() {
      this.abort();
      const cb = this.onDone;
      this.onDone = null;
      if (cb) cb();
    },

    // đóng ngay, không gọi onDone (rời trận / vào trận khác)
    abort() {
      this.active = false;
      if (this.el) { this.el.classList.add('hidden'); this.el.classList.remove('out'); this.el.innerHTML = ''; }
    },

    /* ---------------- DOM ---------------- */
    html(g) {
      const I = CFG(), mp = g.opts.mainPath, MP = SFC.MainPath;
      let comp = 'FRIENDLY', title = 'MATCHDAY', venue = 'STREET COURT', venueIcon = '';
      if (mp) {
        const A = MP.area(mp.area);
        comp = `MAIN PATH · ${MP.divName(mp.area, mp.div)}`;
        title = mp.promo ? (mp.final ? 'CHAMPIONSHIP FINAL' : 'PROMOTION MATCH') : 'MATCHDAY';
        venue = A.name; venueIcon = PX().area(A.id) + ' ';
      } else if (g.opts.training) { comp = 'TRAINING'; title = 'PRACTICE MATCH'; }
      // thẻ cầu thủ hiện xen kẽ trái / phải: người chơi (character) lên đầu
      const lists = [0, 1].map((t) => g.teams[t].players.slice().sort((a, b) => (b.isControlled && g.isHuman(t) ? 1 : 0) - (a.isControlled && g.isHuman(t) ? 1 : 0)));
      const delay = {};
      let k = 0;
      for (let i = 0; i < Math.max(lists[0].length, lists[1].length); i++) {
        for (const t of [0, 1]) if (lists[t][i]) delay[lists[t][i].id] = +(I.cardsAt + k++ * I.cardGap).toFixed(2);
      }
      const boss = !!(mp && mp.promo);
      return `<div class="intro ${boss ? 'promo' : ''}" style="--c0:${g.teams[0].cfg.kit.shirt};--c1:${g.teams[1].cfg.kit.shirt};--dIn:${I.teamIn}s">
        <div class="in-bg l"></div><div class="in-bg r"></div>
        <div class="in-top"><span class="in-comp">${esc(comp)}</span><b class="in-title">${boss ? PX().ui('crown') + ' ' : ''}${esc(title)}</b></div>
        ${this.side(g, 0, lists[0], delay, false)}
        <div class="in-mid">
          <div class="in-vs" style="--d:${I.vsAt}s">VS</div>
          <div class="in-pitch" style="--d:${I.pitchAt - 0.2}s"><canvas width="124" height="74"></canvas></div>
          <div class="in-venue" style="--d:${I.pitchAt}s">${venueIcon}${esc(venue)}</div>
        </div>
        ${this.side(g, 1, lists[1], delay, boss)}
        <div class="in-foot"><span><kbd>Enter</kbd> skip</span><i class="in-timer" style="--dur:${I.duration}s"></i></div>
      </div>`;
    },

    // OVR của 1 bộ chỉ số đội: trung bình các chỉ số intro.stats x ovrScale (menu Main Path dùng chung)
    ovrOf(stats) {
      const I = CFG(), vals = I.stats.map(([key]) => stats[key] || 1);
      return Math.max(1, Math.min(99, Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * I.ovrScale)));
    },

    // chỉ số đội trong trận: trung bình Player.stats của các cầu thủ (character có chỉ số riêng); đội trống -> chỉ số đội
    teamStats(g, t) {
      const ps = g.teams[t].players, out = {};
      if (!ps.length) return g.teams[t].cfg.stats;
      for (const [key] of CFG().stats) out[key] = ps.reduce((a, p) => a + (p.stats[key] || 1), 0) / ps.length;
      return out;
    },

    side(g, t, list, delay, boss) {
      const I = CFG(), c = g.teams[t].cfg;
      const cs = this.teamStats(g, t), os = this.teamStats(g, 1 - t);
      const ovr = this.ovrOf(cs);
      const stats = I.stats.map(([key, label], i) => {
        const v = cs[key] || 1, ov = os[key] || 1;
        const w = Math.round(clamp01((v - I.statMin) / (I.statMax - I.statMin)) * 100);
        return `<div class="in-st ${v > ov + 0.001 ? 'up' : ''}" style="--d:${(I.statsAt + i * 0.05).toFixed(2)}s"><span>${label}</span><i><b style="--w:${w}%"></b></i><em>${Math.round(v * I.ovrScale)}</em></div>`;
      }).join('');
      const cards = list.map((p) => this.card(g, p, delay[p.id])).join('');
      return `<div class="in-side ${t ? 'r' : 'l'} ${boss ? 'boss' : ''}" style="--c:${c.kit.shirt};--a:${c.kit.accent};--k:${c.kit.shirtDark};--d:${I.teamIn + 0.15}s">
        <div class="in-team">
          <div class="in-crest"><span>${esc(c.short)}</span></div>
          <div class="in-tn"><b>${esc(c.name)}</b><span>${esc(c.tagline || '')}</span></div>
          <div class="in-ovr"><b>${ovr}</b><span>OVR</span></div>
          ${boss ? `<div class="in-boss">${PX().ui('crown', 'sm')} BOSS</div>` : ''}
        </div>
        <div class="in-cards">${cards}</div>
        <div class="in-stats">${stats}</div>
      </div>`;
    },

    card(g, p, d) {
      const I = CFG();
      const human = g.isHuman(p.team), you = human && p.isControlled;
      const num = you ? I.youNumber : I.numbers[p.role] || 7;
      const tag = you ? '<em class="you">YOU</em>' : human ? '<em>AI</em>' : '';
      // character có chỉ số riêng: OVR cá nhân (trung bình 6 chỉ số, như trang STATS)
      const povr = you && p.ovr ? `<b class="in-povr">${p.ovr}<span>OVR</span></b>` : '';
      return `<div class="in-card ${you ? 'you' : ''}" style="--d:${d}s">
        <div class="in-num">${num}</div>${tag}${povr}
        <canvas data-pid="${p.id}" data-delay="${d}"></canvas>
        <b class="in-name">${esc(p.name)}</b><span class="in-pos">${ROLE[p.role] || p.role}</span>
      </div>`;
    },

    /* ---------------- vẽ sprite + sơ đồ đội hình ---------------- */
    draw() {
      const I = CFG(), t = this.t;
      for (const c of this.cards) {
        const tc = t - c.delay;
        if (tc < 0) { c.cv.getContext('2d').clearRect(0, 0, c.cv.width, c.cv.height); continue; }
        const inward = c.p.team === 0 ? 0 : Math.PI;
        let facing = Math.PI / 2, extra = null;
        if (tc < I.runIn) { facing = inward; extra = { vx: 40 }; }   // chạy vào, nhìn vào giữa
        else {
          // tạo dáng định kỳ: ĐÁ CAO vung chân sút, ĐÁ LÙI tung cú đấm (lệch pha theo từng thẻ)
          const k = (tc - I.runIn + c.delay) % I.poseEvery;
          if (tc > I.runIn + 0.4 && k < I.poseTime) {
            facing = inward;
            extra = c.p.role === 'FWD' ? { atkType: 'shoot', atkT: k } : { atkType: 'light', atkT: k * 0.8 };
          }
        }
        SFC.Sprites.drawAvatar(c.cv, c.p.look, c.kit, t, facing, extra);
      }
      this.drawPitch();
    },

    drawPitch() {
      const cv = this.pitch;
      if (!cv) return;
      const I = CFG(), g = this.g, x = cv.getContext('2d'), W = cv.width, H = cv.height;
      const { px, disc, ringPx, OUT } = SFC.Sprites;
      x.clearRect(0, 0, W, H);
      px(x, 0, 0, W, H, '#1d2a22');
      for (let i = 0; i < W; i += 12) px(x, i, 0, 6, H, 'rgba(255,255,255,0.03)');
      x.strokeStyle = 'rgba(236,228,200,0.55)'; x.lineWidth = 1;
      x.strokeRect(3.5, 3.5, W - 7, H - 7);
      px(x, W / 2, 4, 1, H - 8, 'rgba(236,228,200,0.55)');
      x.beginPath(); x.arc(W / 2 + 0.5, H / 2, 9, 0, Math.PI * 2); x.stroke();
      x.strokeRect(3.5, H / 2 - 14.5, 12, 29); x.strokeRect(W - 15.5, H / 2 - 14.5, 12, 29);
      px(x, 0, H / 2 - 7, 3, 14, 'rgba(255,255,255,0.7)'); px(x, W - 3, H / 2 - 7, 3, 14, 'rgba(255,255,255,0.7)');
      // chấm cầu thủ chạy từ mép sân vào vị trí đội hình (đội 0 tấn công sang phải)
      const F = SFC_CONFIG.game.formation;
      g.players.forEach((p, i) => {
        const fm = F[p.role], k = easeOut(clamp01((this.t - I.pitchAt - i * 0.12) / 0.6));
        if (k <= 0) return;
        const tx = p.team === 0 ? fm.x : 1 - fm.x, ty = p.team === 0 ? fm.y : 1 - fm.y;
        const sx = p.team === 0 ? -0.08 : 1.08;
        const cx = 4 + (sx + (tx - sx) * k) * (W - 8), cy = 4 + ty * (H - 8);
        const kit = g.teams[p.team].cfg.kit;
        disc(x, cx, cy, 4, OUT);
        disc(x, cx, cy, 3, kit.shirt);
        px(x, cx - 1, cy - 1, 2, 2, kit.accent);
        if (g.isHuman(p.team) && p.isControlled && k >= 1) ringPx(x, cx, cy, 6 + (Math.floor(this.t * 4) % 2), '#ffe14f');
      });
    },
  };

  SFC.Intro = Intro;
})();
