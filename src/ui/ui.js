/* UI — lớp DOM trong trận: HUD, chọn Core, pause / menu online, kết quả, thông báo
 * (các màn ngoài trận nằm ở ui/menu.js)
 */
window.SFC = window.SFC || {};

(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const CORES = () => SFC_CONFIG.cores;

  function coreChip(id) {
    const c = CORES().list[id];
    const cat = CORES().categories[c.category];
    return `<span class="chip" style="--c:${cat.color}" title="${esc(c.name)} — ${esc(c.desc)}">${c.icon}</span>`;
  }

  function helpTable(list) {
    return list.map(([k, v]) => `<div class="hk"><kbd>${esc(k)}</kbd><span>${esc(v)}</span></div>`).join('');
  }

  const PAUSE_SINGLE = [['resume', 'TIẾP TỤC'], ['restart', 'ĐÁ LẠI'], ['menu', 'VỀ MENU']];
  const PAUSE_ONLINE = [['resume', 'VỀ TRẬN'], ['leave', 'RỜI PHÒNG']];

  const UI = {
    init(app) {
      this.app = app;
      this.el = {
        menu: $('menu'), draft: $('draft'), pause: $('pause'), end: $('end'),
        hud: $('hud'), banner: $('banner'), toasts: $('toasts'),
      };
      this.draftSel = 0;
      this.pauseSel = 0;
      this.endSel = 0;
      this.hudCache = {};
      this.pauseItems = PAUSE_SINGLE;
      this.bindMouse();
    },

    show(name) {
      ['menu', 'draft', 'pause', 'end'].forEach((k) => this.el[k].classList.toggle('hidden', k !== name));
      this.el.hud.classList.toggle('hidden', name === 'menu');
      this.current = name;
    },

    get online() { return this.app.mode === 'online'; },

    /* ================= DRAFT ================= */
    renderDraft(game) {
      const d = game.draft;
      if (!d) return;
      const me = game.humanTeam;
      const total = SFC_CONFIG.game.match.maxUpgrades;
      const opts = d.options[me] || [];
      const picked = !!d.picked[me];
      const timer = d.limit > 0 ? `<span id="draft-timer" class="draft-timer">${Math.ceil(Math.max(0, d.t))}s</span>` : '';
      const cards = opts.map((id, i) => {
        const c = CORES().list[id];
        const cat = CORES().categories[c.category];
        const tier = CORES().tiers[c.tier] || { label: '', color: '#fff' };
        const chosen = picked && (d.localPick === i || d.picked[me] === id);
        return `<div class="card ${!picked && i === this.draftSel ? 'sel' : ''} ${chosen ? 'chosen' : ''}" data-pick="${i}" style="--c:${cat.color};--t:${tier.color}">
          <div class="card-key">${i + 1}</div>
          <div class="card-cat">${cat.label}</div>
          <div class="card-icon">${c.icon}</div>
          <div class="card-name">${esc(c.name)}</div>
          <div class="card-tier">${tier.label}</div>
          <div class="card-desc">${esc(c.desc)}</div>
        </div>`;
      }).join('');
      const opp = game.teams[1 - me];
      const oppCores = game.cores.owned[opp.index].map((id) => coreChip(id)).join('') || '<em>—</em>';
      const sub = picked ? 'Đã chọn · đang chờ đối thủ...' : 'Chọn 1 Core cho cả đội · phím 1 / 2 / 3 hoặc ←→ + Enter';
      this.el.draft.classList.toggle('waiting', picked);
      this.el.draft.innerHTML = `
        <div class="draft-title">CORE UPGRADE <span>${d.round}/${total}</span>${timer}</div>
        <div class="draft-sub">${sub}</div>
        <div class="cards">${cards}</div>
        <div class="draft-opp">${esc(opp.cfg.name)} build: ${oppCores}</div>`;
    },

    draftInput(input, game) {
      const d = game.draft;
      if (!d || d.picked[game.humanTeam]) return;
      const n = (d.options[game.humanTeam] || []).length;
      if (!n) return;
      let changed = false;
      if (input.wasPressed('left')) { this.draftSel = (this.draftSel + n - 1) % n; changed = true; }
      if (input.wasPressed('right')) { this.draftSel = (this.draftSel + 1) % n; changed = true; }
      if (changed) { SFC.Audio.menu(); this.renderDraft(game); }
      let pick = -1;
      if (input.wasPressed('pick1')) pick = 0;
      if (input.wasPressed('pick2')) pick = 1;
      if (input.wasPressed('pick3')) pick = 2;
      if (input.wasPressed('confirm')) pick = this.draftSel;
      if (pick >= 0 && pick < n) this.pick(game, pick);
    },

    pick(game, i) {
      if (!game.draft || game.draft.picked[game.humanTeam]) return;
      this.draftSel = i;
      this.app.pickCore(i);
      if (game.state === 'draft') this.renderDraft(game);
      else if (this.current === 'draft') this.show(null);
    },

    /* ================= PAUSE / MENU TRONG TRẬN ================= */
    renderPause() {
      const ctr = SFC_CONFIG.controls.help;
      const items = this.pauseItems.map(([k, l], i) => `<button class="${i === this.pauseSel ? 'sel' : ''}" data-act="${k}">${l}</button>`).join('');
      this.el.pause.innerHTML = `
        <div class="pause-title">${this.online ? 'MENU' : 'PAUSED'}</div>
        ${this.online ? '<div class="pause-note">Trận online không tạm dừng</div>' : ''}
        <div class="pause-items">${items}</div>
        <div class="help small">
          <div class="help-col"><h4>TẤN CÔNG</h4>${helpTable(ctr.attack)}</div>
          <div class="help-col"><h4>PHÒNG NGỰ</h4>${helpTable(ctr.defense)}${helpTable(ctr.teammateHasBall)}</div>
          <div class="help-col"><h4>HỆ THỐNG</h4>${helpTable(ctr.system)}</div>
        </div>`;
    },

    pauseInput(input) {
      const n = this.pauseItems.length;
      if (input.wasPressed('up')) { this.pauseSel = (this.pauseSel + n - 1) % n; this.renderPause(); }
      if (input.wasPressed('down')) { this.pauseSel = (this.pauseSel + 1) % n; this.renderPause(); }
      if (input.wasPressed('pause')) return this.app.resume();
      if (input.wasPressed('confirm')) this.doAct(this.pauseItems[this.pauseSel][0]);
    },

    /* ================= END ================= */
    endItems() {
      if (!this.online) return [['restart', 'ĐÁ LẠI'], ['menu', 'VỀ MENU']];
      return SFC.Online.isHost ? [['lobby', 'VỀ PHÒNG CHỜ'], ['leave', 'RỜI PHÒNG']] : [['leave', 'RỜI PHÒNG']];
    },

    renderEnd(game) {
      const h = game.humanTeam, me = game.teams[h], op = game.teams[1 - h];
      const res = me.score > op.score ? ['CHIẾN THẮNG!', 'win'] : me.score < op.score ? ['THUA RỒI...', 'lose'] : ['HÒA', 'draw'];
      const build = (t) => {
        const ids = game.cores.owned[t.index];
        return ids.length ? ids.map((id) => `<div class="b-item">${coreChip(id)} ${esc(CORES().list[id].name)}</div>`).join('') : '<em>Không có core</em>';
      };
      const list = this.endItems();
      const items = list.map(([k, l], i) => `<button class="${i === this.endSel ? 'sel' : ''}" data-act="${k}">${l}</button>`).join('');
      const note = this.online && !SFC.Online.isHost ? 'Chờ chủ phòng quay lại phòng chờ...' : 'Lần sau thử một kiểu đá khác?';
      // sân luôn vẽ đội 0 bên trái -> tỉ số giữ đúng thứ tự trái / phải
      const t0 = game.teams[0], t1 = game.teams[1];
      this.el.end.innerHTML = `
        <div class="end-title ${res[1]}">${res[0]}</div>
        <div class="end-score"><span style="color:${t0.cfg.kit.shirt}">${esc(t0.cfg.name)}</span> <b>${t0.score} - ${t1.score}</b> <span style="color:${t1.cfg.kit.shirt}">${esc(t1.cfg.name)}</span></div>
        <div class="builds">
          <div class="build"><h4>BUILD CỦA BẠN</h4>${build(me)}</div>
          <div class="build"><h4>BUILD ĐỐI THỦ</h4>${build(op)}</div>
        </div>
        <div class="end-note">${note}</div>
        <div class="pause-items row-items">${items}</div>`;
    },

    endInput(input) {
      const n = this.endItems().length;
      if (input.wasPressed('left') || input.wasPressed('up')) { this.endSel = (this.endSel + n - 1) % n; this.renderEnd(this.app.game); }
      if (input.wasPressed('right') || input.wasPressed('down')) { this.endSel = (this.endSel + 1) % n; this.renderEnd(this.app.game); }
      if (input.wasPressed('confirm')) this.doAct(this.endItems()[this.endSel][0]);
    },

    doAct(act) {
      SFC.Audio.menu();
      if (act === 'resume') this.app.resume();
      if (act === 'restart') this.app.restart();
      if (act === 'menu') this.app.toMenu();
      if (act === 'leave') SFC.Online.leave();
      if (act === 'lobby') SFC.Online.backToLobby();
    },

    /* ================= HUD ================= */
    updateHud(game) {
      if (!game) return;
      const c = this.hudCache;
      const t0 = game.teams[0], t1 = game.teams[1];
      const time = game.golden ? 'GOLDEN' : SFC.U.fmtTime(game.remaining);
      const phase = game.golden ? 'GOLDEN GOAL' : game.finalPush ? 'FINAL PUSH x' + SFC_CONFIG.game.match.finalPushGoalValue : '';
      const cores = game.cores.owned[0].join() + '|' + game.cores.owned[1].join();
      const key = [t0.score, t1.score, time, phase, cores].join('#');
      if (c.key !== key) {
        c.key = key;
        // nhãn người chơi: P1 / P2; người ở máy này tô vàng
        const tag = (t) => {
          if (!game.isHuman(t)) return '';
          const label = game.humans.length > 1 ? (t === 0 ? 'P1' : 'P2') : 'P1';
          return ` <small class="${t === game.humanTeam ? 'me' : 'op'}">${label}</small>`;
        };
        this.el.hud.innerHTML = `
          <div class="hud-team l" style="--c:${t0.cfg.kit.shirt}">
            <div class="hud-name">${esc(t0.cfg.short)}${tag(0)}</div>
            <div class="hud-cores">${game.cores.owned[0].map((id) => coreChip(id)).join('')}</div>
          </div>
          <div class="hud-mid">
            <div class="hud-score"><b style="color:${t0.cfg.kit.shirt}">${t0.score}</b><span>-</span><b style="color:${t1.cfg.kit.shirt}">${t1.score}</b></div>
            <div class="hud-time ${game.finalPush || game.golden ? 'hot' : ''}">${time}</div>
            ${phase ? `<div class="hud-phase">${phase}</div>` : ''}
          </div>
          <div class="hud-team r" style="--c:${t1.cfg.kit.shirt}">
            <div class="hud-name">${tag(1)} ${esc(t1.cfg.short)}</div>
            <div class="hud-cores">${game.cores.owned[1].map((id) => coreChip(id)).join('')}</div>
          </div>`;
      }
      // đồng hồ chọn Core (online)
      if (game.state === 'draft' && game.draft && game.draft.limit > 0) {
        const el = document.getElementById('draft-timer');
        const s = Math.ceil(Math.max(0, game.draft.t)) + 's';
        if (el && el.textContent !== s) el.textContent = s;
      }
    },

    /* ================= THÔNG BÁO ================= */
    banner(text, sub, color, dur = 1.8) {
      const el = this.el.banner;
      el.innerHTML = `<div class="b-main" style="color:${color || '#fff'}">${esc(text)}</div>${sub ? `<div class="b-sub">${esc(sub)}</div>` : ''}`;
      el.classList.remove('show');
      void el.offsetWidth;
      el.classList.add('show');
      clearTimeout(this._bt);
      this._bt = setTimeout(() => el.classList.remove('show'), dur * 1000);
    },

    toast(html) {
      const d = document.createElement('div');
      d.className = 'toast';
      d.innerHTML = html;
      this.el.toasts.appendChild(d);
      setTimeout(() => d.classList.add('out'), 2600);
      setTimeout(() => d.remove(), 3100);
    },

    clearToasts() {
      this.el.toasts.innerHTML = '';
      this.el.banner.classList.remove('show');
    },

    consume(game) {
      const evs = game.events.splice(0);
      if (game.silent) return;
      const overlay = this.current === 'pause';
      for (const e of evs) {
        if (e.type === 'goal') {
          const t = game.teams[e.team];
          this.banner(e.value > 1 ? `GOAL x${e.value}!` : 'GOAL!', e.own ? 'Phản lưới nhà!' : `${e.scorer} · ${t.cfg.name}`, t.cfg.kit.shirt, 2.2);
        }
        if (e.type === 'banner') this.banner(e.text, e.sub, e.color, 2.2);
        if (e.type === 'draft') { this.draftSel = 0; this.renderDraft(game); if (!overlay) this.show('draft'); }
        if (e.type === 'draftWait' && game.draft) this.renderDraft(game);
        if (e.type === 'corePicked') {
          if (this.current === 'draft') this.show(null);
          for (const pk of e.picks) {
            const c = CORES().list[pk.id], t = game.teams[pk.team];
            this.toast(`<span class="dot" style="background:${t.cfg.kit.shirt}"></span>${esc(t.cfg.short)} nhận ${coreChip(pk.id)} <b>${esc(c.name)}</b>`);
          }
        }
        if (e.type === 'end') { this.endSel = 0; this.renderEnd(game); setTimeout(() => this.app.game === game && this.show('end'), 900); }
      }
    },

    /* ================= CHUỘT ================= */
    bindMouse() {
      document.addEventListener('click', (e) => {
        SFC.Audio.unlock();
        if (e.target.closest('#menu')) return; // menu tự xử lý
        const btn = e.target.closest('[data-act],[data-pick]');
        if (!btn) return;
        if (btn.dataset.pick != null && this.app.game) return this.pick(this.app.game, +btn.dataset.pick);
        this.doAct(btn.dataset.act);
      });
    },
  };

  SFC.UI = UI;
})();
