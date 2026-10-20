/* TrophyUI — PHÒNG TRƯNG BÀY (TROPHY ROOM): nút cúp dưới SETTINGS ở trang chủ. Chỗ người chơi nhìn lại thành tựu của mình.
 *   giữa: căn phòng vẽ pixel (canvas 640x360 bằng bộ hàm cut scene, SFC.Story.paint), mỗi Story 1 tủ kính trên bục:
 *         đã vô địch = cúp riêng của Story (stories.list[].trophy, vẽ ở src/ui/story-cup.js) toả sáng · chưa = bục phủ vải + dấu ? ·
 *         khoá (demo / COMING SOON) = ổ khoá. Biển dưới bục: màu Story + 3 sao thử thách. Character của bạn đứng ngắm tủ đang chọn.
 *   phải: tủ đang chọn — trạng thái, ngày vô địch đầu, tỉ số chung kết đẹp nhất, số lần chơi, sao, costume vô địch.
 *   dưới: tường kỷ lục (Elo cao nhất, Area xa nhất, thống kê sự nghiệp, ULT BOOK) + nút ACHIEVEMENTS (trang src/ui/achievements.js).
 * ←→ chọn tủ · ↓ xuống ACHIEVEMENTS · Enter: tủ = mở Story đó ở tab FOOTBALL STORY, ACHIEVEMENTS = mở danh sách thành tích.
 * Số liệu: Profile.data.story (src/meta/cup.js: best, wins, plays, stars, first, fin) · MainPath.state (peak, best) · Profile.data.stats.
 * Menu gọi: open · render · input · click · back · tick (mỗi khung hình vẽ lại phòng)
 */
window.SFC = window.SFC || {};

(function () {
  const _t = SFC.t;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const CUP = () => SFC.Cup;
  const PF = () => SFC.Profile;
  const MP = () => SFC.MainPath;
  const PX = () => SFC.PixelIcon;
  const G = () => SFC.Gacha;
  const PROG = () => SFC_CONFIG.progression;
  const K = (a, kb) => SFC.Input.key(a, kb);
  const SHOW = 4;   // số tủ hiện cùng lúc (Story nhiều hơn: trượt theo tủ đang chọn)
  const GAP = 150;  // khoảng cách tâm 2 tủ (px canvas)

  const TrophyUI = {
    pages: ['trophy'],
    sel: 0,       // 0..n-1 = tủ Story · n = nút ACHIEVEMENTS
    first: 0,     // tủ đầu tiên đang hiện
    hx: null,     // x character (đi dần tới tủ đang chọn)
    t: 0,

    open(menu) {
      const list = CUP().list();
      // mở ở tủ Story vô địch gần nhất, chưa có thì tủ đầu
      const won = list.map((s, i) => [i, s.soon ? 0 : CUP().rec(s.id).first || 0]).sort((a, b) => b[1] - a[1]);
      this.sel = won.length && won[0][1] ? won[0][0] : 0;
      this.first = 0; this.hx = null;
      menu.msg = '';
      menu.go('trophy');
    },
    n() { return CUP().list().length; },
    // tủ i: trạng thái hiện trong phòng
    state(s) {
      if (s.soon || CUP().demoLocked(s)) return 'lock';
      const r = CUP().rec(s.id);
      return r.wins ? 'won' : r.plays ? 'tried' : 'new';
    },
    // tâm x của tủ i trên canvas
    caseX(i) {
      const k = Math.min(SHOW, this.n());
      return 320 + (i - this.first - (k - 1) / 2) * GAP;
    },
    keepWindow() {
      const n = this.n();
      if (this.sel >= n) return;
      if (this.sel < this.first) this.first = this.sel;
      if (this.sel >= this.first + SHOW) this.first = this.sel - SHOW + 1;
      this.first = Math.max(0, Math.min(Math.max(0, n - SHOW), this.first));
    },

    render(menu) {
      const list = CUP().list(), n = list.length;
      this.sel = Math.max(0, Math.min(n, this.sel));
      this.keepWindow();
      const tot = CUP().totals(), cnt = SFC.Achievements.count(), ready = SFC.Achievements.claimable().length;
      const sum = `<div class="ac-sum">${PX().ui('trophy')} <b>${tot.cups}</b>/${tot.cupsMax} · <b>★</b> ${tot.stars}/${tot.starsMax}</div>`;
      const head = G().header(esc(_t('TROPHY ROOM')), sum, false);
      const s = list[Math.min(this.sel, n - 1)];
      const achSel = this.sel === n;
      const arrows = n > SHOW ? `<button class="tr-nav l ${this.first ? '' : 'off'}" data-tnav="-1">◀</button><button class="tr-nav r ${this.first + SHOW < n ? '' : 'off'}" data-tnav="1">▶</button>` : '';
      const msg = menu.msg ? `<div class="m-msg ${menu.msgErr ? 'err' : ''}">${esc(menu.msg)}</div>` : '';
      menu.el.innerHTML = `${head}
        <div class="gacha-body tr-g">
          <div class="tr-left">
            <div class="tr-hall"><canvas class="tr-cv" width="640" height="360"></canvas>${arrows}</div>
            ${this.wall(cnt, ready, achSel)}
          </div>
          <div class="box-detail tr-detail" style="--sc:${s ? s.color : '#ffd23f'}">${s ? this.detail(s) : ''}</div>
        </div>${msg}`;
      G().bindIcons(menu);
      menu.bindAvatars();
      this.draw(menu);
    },

    // tường kỷ lục + nút ACHIEVEMENTS
    wall(cnt, ready, achSel) {
      const st = MP().state, d = PF().data, A = MP().area(st.best) || {};
      const book = PF().ultEntries().filter((e) => PF().ultKnown(e.key)).length, bookMax = PF().ultEntries().length;
      // icon + số là chính, tên ô ở tooltip (bớt chữ, user 2026-10-20)
      const cell = (label, icon, val) => `<div class="tr-rec" title="${esc(label)}">${icon}<b>${val}</b></div>`;
      return `<div class="tr-wall">
          ${cell(_t('PEAK'), PX().ui('star'), st.peak)}
          ${cell(`${_t('BEST AREA')} · ${A.name || ''}`, A.id ? PX().area(A.id, 'x2') : '', '')}
          ${cell(_t('MATCHES'), PX().ui('ball'), d.stats.matches)}
          ${cell(_t('WINS'), PX().ui('crown'), d.stats.wins)}
          ${cell(_t('GOALS'), PX().ui('target'), d.stats.goals)}
          ${cell(_t('ULT BOOK'), PX().ui('card'), `${book}/${bookMax}`)}
          <button class="tr-ach ${achSel ? 'sel' : ''} ${ready ? 'hot' : ''}" data-tach="1" title="${esc(_t('ACHIEVEMENTS'))}">${PX().ui('trophy', 'x2')}<em>${cnt.done}/${cnt.total}</em>${ready ? `<u title="${esc(_t('{n} TO CLAIM', { n: ready }))}">${ready}</u>` : ''}</button>
        </div>`;
    },

    // bảng phải: tủ đang chọn
    detail(s) {
      const stt = this.state(s), r = s.soon ? CUP().blankRec() : CUP().rec(s.id);
      const [label] = SFC.CupUI.status(s);
      // dữ kiện = icon + số, tên ở tooltip
      const rows = [];
      if (stt === 'won') {
        rows.push([_t('CHAMPION'), PX().ui('trophy', 'sm'), `×${r.wins}`]);
        if (r.first) {
          let date = '';
          try { date = new Date(r.first).toLocaleDateString(SFC.I18n.locale(), { year: 'numeric', month: 'short', day: 'numeric' }); } catch (e) { date = new Date(r.first).toDateString(); }
          rows.push([_t('First won: {date}', { date }), PX().ui('calendar', 'sm'), date]);
        }
        if (r.fin) rows.push([_t('Best final: {score}', { score: `${r.fin[0]} - ${r.fin[1]}` }), PX().ui('ball', 'sm'), `${r.fin[0]} - ${r.fin[1]}`]);
      }
      if (!s.soon && r.plays) rows.push([_t('Runs: {n}', { n: r.plays }), PX().ui('people', 'sm'), `×${r.plays}`]);
      const stars = s.soon ? '' : `<div class="fs-goals">${(s.stars || []).map((x) => {
        const got = r.stars.includes(x.id);
        return `<span class="${got ? 'on' : ''}"><i>${got ? '★' : '☆'}</i>${esc(x.desc)}</span>`;
      }).join('')}</div>`;
      const it = s.reward && s.reward.item && PROG().items[s.reward.item];
      const own = it && (stt === 'won' || (PF().data.items[s.reward.item] || 0) > 0);
      const reward = !it ? '' : `<div class="tr-rw" title="${esc(own ? it.name : _t('Win the cup to unlock'))}">${PX().ui('gift', 'sm')}
          <span class="ac-ri big ${own ? '' : 'tr-sil'}" style="--rc:${s.color}">${own ? `<canvas data-icon="${s.reward.item}" width="40" height="40" style="width:48px;height:48px"></canvas>` : PX().ui('lock', 'x2')}</span>
          <b style="color:${own ? s.color : 'var(--muted)'}">${esc(own ? it.name : '???')}</b></div>`;
      const go = CUP().playable(s) ? `<button class="ac-act claim" data-tgo="1"><kbd>${esc(K('confirm', 'Enter'))}</kbd> ${esc(stt === 'won' ? _t('PLAY AGAIN') : _t('PLAY THIS STORY'))}</button>` : '';
      return `<div class="tr-scroll"><div class="tr-dh"><b>${esc(s.name)}</b>${stt === 'won' ? '' : `<em class="tr-st ${stt}">${esc(label)}</em>`}</div>
        ${rows.length ? `<div class="tr-facts">${rows.map(([t, ic, v]) => `<span title="${esc(t)}">${ic}<b>${esc(v)}</b></span>`).join('')}</div>` : ''}
        ${stars}${reward}</div>${go}`;
    },

    /* ---------- căn phòng (canvas) ---------- */
    tick(menu, dt) {
      if (menu.page !== 'trophy') return;
      this.t += dt;
      this.draw(menu, dt);
    },
    draw(menu, dt = 0) {
      const cv = menu.el && menu.el.querySelector('.tr-cv');
      if (!cv || !SFC.Story.paint || !SFC.StoryCup) return;
      const list = CUP().list(), n = list.length, t = this.t;
      const tx = this.sel < n ? this.caseX(this.sel) : 320;
      if (this.hx == null) this.hx = tx;
      this.hx += (tx - this.hx) * Math.min(1, dt * 6);
      SFC.Story.paint(cv, (H) => {
        const ctx = H.ctx;
        // tường: giấy dán tường đỏ rượu sọc mờ, phào vàng, ốp gỗ chân tường
        H.rect(0, 0, H.W, 250, H.vgrad(0, 250, ['#140a14', '#26101f', '#361628']));
        for (let x = 8; x < H.W; x += 24) H.rect(x, 22, 2, 178, 'rgba(255,220,180,0.035)');
        H.rect(0, 16, H.W, 4, '#6a4a20'); H.rect(0, 18, H.W, 1, '#c9a020');
        H.rect(0, 200, H.W, 50, H.vgrad(200, 250, ['#4a2c1a', '#2e1a10'])); H.rect(0, 200, H.W, 3, '#6a4428');
        for (let x = 20; x < H.W; x += 80) { H.rect(x, 210, 60, 30, 'rgba(0,0,0,0.18)'); H.rect(x, 210, 60, 1, 'rgba(255,200,140,0.12)'); }
        // sàn + thảm đỏ giữa phòng
        H.rect(0, 250, H.W, 110, H.vgrad(250, 360, ['#2a1a14', '#0e0806']));
        ctx.fillStyle = '#5a1420'; ctx.beginPath(); ctx.moveTo(250, 250); ctx.lineTo(390, 250); ctx.lineTo(470, 360); ctx.lineTo(170, 360); ctx.fill();
        ctx.strokeStyle = '#c9a020'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(258, 252); ctx.lineTo(182, 360); ctx.moveTo(382, 252); ctx.lineTo(458, 360); ctx.stroke();
        for (let i = this.first; i < Math.min(n, this.first + SHOW); i++) this.drawCase(H, list[i], this.caseX(i), t, i === this.sel);
        // character đứng ngắm tủ đang chọn (quay lưng lại màn hình)
        H.hero(this.hx, 352, 2.6, t, -Math.PI / 2);
        H.vignette(0.5);
      });
    },
    drawCase(H, s, x, t, on) {
      const ctx = H.ctx, stt = this.state(s), r = s.soon ? CUP().blankRec() : CUP().rec(s.id), C = SFC.StoryCup;
      const won = stt === 'won';
      // đèn trần + chùm sáng xuống tủ
      H.rect(x - 8, 20, 16, 5, '#1a1218'); H.rect(x - 5, 25, 10, 3, won || on ? '#fff3c0' : '#5a5060');
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(0, 28, 0, 262);
      const a = (on ? 0.22 : 0.08) + (won ? 0.1 : 0);
      g.addColorStop(0, `rgba(255,236,190,${a})`); g.addColorStop(1, 'rgba(255,236,190,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 6, 28); ctx.lineTo(x + 6, 28); ctx.lineTo(x + 58, 262); ctx.lineTo(x - 58, 262); ctx.fill();
      ctx.restore();
      // bục đá
      H.rect(x - 48, 196, 96, 70, H.INK); H.rect(x - 46, 198, 92, 66, H.vgrad(198, 264, ['#e8e2d6', '#a8a094']));
      H.rect(x - 46, 198, 92, 4, '#fffaf0'); H.rect(x - 52, 262, 104, 6, H.INK); H.rect(x - 50, 262, 100, 4, '#8a8276');
      // biển tên: màu Story + 3 sao
      H.rect(x - 30, 214, 60, 26, H.INK); H.rect(x - 29, 215, 58, 24, stt === 'lock' ? '#3a3440' : s.color);
      H.rect(x - 29, 215, 58, 3, 'rgba(255,255,255,0.3)');
      (s.stars || [{}, {}, {}]).slice(0, 3).forEach((st, k) => {
        const sx = x - 15 + k * 15, sy = 227, got = r.stars.includes(st.id);
        const c = got ? '#ffd23f' : 'rgba(20,12,22,0.55)';
        H.rect(sx - 1, sy - 4, 3, 9, c); H.rect(sx - 4, sy - 1, 9, 3, c); H.rect(sx - 2, sy - 2, 5, 5, c);
      });
      // vạch số lần vô địch dưới biển
      for (let k = 0; k < Math.min(5, r.wins); k++) H.rect(x - 14 + k * 6, 246, 4, 4, '#ffd23f');
      // tủ kính
      const top = 104, bot = 196;
      H.rect(x - 40, top, 80, bot - top, 'rgba(160,200,255,0.06)');
      if (won) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        H.glow(x, 160, 46 + Math.sin(t * 3 + x) * 4, '255,210,80', on ? 0.55 : 0.35);
        ctx.restore();
        C.trophy(H, s.trophy, x, 192, 3.2, t + x * 0.01);
        // lấp lánh
        for (let k = 0; k < 3; k++) {
          const u = (t * 0.7 + k * 0.37 + x * 0.003) % 1;
          if (u < 0.3) { const sx = x - 26 + H.hash(k + Math.floor(t * 0.7 + k * 0.37) * 7 + x) * 52, sy = 120 + H.hash(k * 5 + Math.floor(t * 0.7)) * 60; H.rect(sx - 1, sy - 3, 2, 7, '#fff8d0'); H.rect(sx - 3, sy - 1, 7, 2, '#fff8d0'); }
        }
      } else if (stt === 'lock') {
        // ổ khoá
        H.rect(x - 9, 140, 18, 16, H.INK); H.rect(x - 7, 142, 14, 12, '#7a7480'); H.rect(x - 1, 145, 2, 5, H.INK);
        ctx.strokeStyle = H.INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, 140, 6, Math.PI, 0); ctx.stroke();
      } else {
        // bục phủ vải nhung: chưa vô địch
        ctx.fillStyle = H.INK; ctx.beginPath(); ctx.moveTo(x - 26, 196); ctx.quadraticCurveTo(x - 22, 140, x, 132); ctx.quadraticCurveTo(x + 22, 140, x + 26, 196); ctx.fill();
        ctx.fillStyle = '#4a1a5a'; ctx.beginPath(); ctx.moveTo(x - 24, 195); ctx.quadraticCurveTo(x - 20, 142, x, 135); ctx.quadraticCurveTo(x + 20, 142, x + 24, 195); ctx.fill();
        H.rect(x - 10, 150, 2, 44, '#6a2a7a'); H.rect(x + 8, 156, 2, 38, '#34103e');
        // dấu ? pixel
        const q = (px, py, w, h) => H.rect(x + px * 2, 154 + py * 2, w * 2, h * 2, stt === 'tried' ? '#ffd23f' : '#c9a0e0');
        q(-2, 0, 4, 1); q(-3, 1, 1, 2); q(2, 1, 1, 2); q(1, 3, 1, 1); q(0, 4, 1, 2); q(0, 7, 1, 1);
      }
      // khung kính + vệt phản chiếu
      ctx.strokeStyle = '#c9a020'; ctx.lineWidth = 2; ctx.strokeRect(x - 40, top, 80, bot - top);
      H.rect(x - 42, top - 6, 84, 6, H.INK); H.rect(x - 41, top - 5, 82, 4, '#8a6a2a');
      ctx.save(); ctx.globalAlpha = 0.12; ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.moveTo(x - 30, top + 4); ctx.lineTo(x - 18, top + 4); ctx.lineTo(x - 36, bot - 10); ctx.lineTo(x - 38, bot - 22); ctx.fill();
      ctx.restore();
      // mũi tên nảy trên tủ đang chọn
      if (on) {
        const b = Math.abs(Math.sin(t * 4)) * 5;
        H.rect(x - 7, 80 - b, 14, 4, H.INK); H.rect(x - 5, 84 - b, 10, 3, H.INK); H.rect(x - 3, 87 - b, 6, 3, H.INK);
        H.rect(x - 6, 80 - b, 12, 3, '#ffe14f'); H.rect(x - 4, 83 - b, 8, 3, '#ffe14f'); H.rect(x - 2, 86 - b, 4, 3, '#ffe14f');
      }
    },

    /* ---------- điều khiển ---------- */
    act(menu) {
      const list = CUP().list(), n = list.length;
      if (this.sel === n) { SFC.Audio.menu(); return SFC.AchUI.open(menu); }
      const s = list[this.sel];
      if (!s) return;
      if (!CUP().playable(s)) { SFC.Audio.menu(); return menu.setMsg(s.soon ? _t('This story is coming soon.') : _t('This story is in the full game.'), true); }
      SFC.Audio.menu();
      SFC.CupUI.pick = this.sel;
      menu.msg = '';
      menu.go('story');
      // chọn sẵn thẻ Story đó trên tab FOOTBALL STORY
      const items = menu.items(), k = items.findIndex((x) => x.sid === s.id);
      if (k >= 0) { menu.sel = k; menu.render(); }
    },
    move(menu, to) {
      if (to === this.sel) return;
      this.sel = to; menu.msg = ''; SFC.Audio.menu(); menu.render();
    },
    input(menu, input) {
      const n = this.n();
      if (input.wasPressed('left') && this.sel < n) return this.move(menu, Math.max(0, this.sel - 1));
      if (input.wasPressed('right') && this.sel < n) return this.move(menu, Math.min(n - 1, this.sel + 1));
      if (input.wasPressed('down') && this.sel < n) { this.lastCase = this.sel; return this.move(menu, n); }
      if (input.wasPressed('up') && this.sel === n) return this.move(menu, Math.min(n - 1, this.lastCase || 0));
      if (input.wasPressed('confirm')) this.act(menu);
    },
    click(menu, e) {
      const n = this.n();
      if (e.target.closest('[data-tach]')) { this.sel = n; this.act(menu); return true; }
      if (e.target.closest('[data-tgo]')) { this.act(menu); return true; }
      const nav = e.target.closest('[data-tnav]');
      if (nav) { this.first = Math.max(0, Math.min(Math.max(0, n - SHOW), this.first + +nav.dataset.tnav * SHOW)); this.move(menu, this.first); return true; }
      const cv = e.target.closest('.tr-cv');
      if (cv) {
        // bấm vào tủ: chọn (bấm lần 2 = mở Story)
        const rc = cv.getBoundingClientRect(), x = ((e.clientX - rc.left) / rc.width) * 640;
        for (let i = this.first; i < Math.min(n, this.first + SHOW); i++) {
          if (Math.abs(x - this.caseX(i)) < GAP / 2) { if (i === this.sel) this.act(menu); else this.move(menu, i); return true; }
        }
        return true;
      }
      return false;
    },
    back(menu) { menu.go('home'); },
  };

  SFC.TrophyUI = TrophyUI;
})();
