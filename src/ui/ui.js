/* UI — lớp DOM phủ trên canvas: menu, HUD, chọn Core, pause, kết quả, thông báo */
window.SFC = window.SFC || {};

(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const TEAMS = () => SFC_CONFIG.teams;
  const CORES = () => SFC_CONFIG.cores;
  const STAT_LABELS = { speed: 'TỐC ĐỘ', power: 'LỰC SÚT', pass: 'CHUYỀN', tackle: 'TẮC BÓNG', dribble: 'RÊ DẮT', accuracy: 'CHÍNH XÁC' };

  function coreChip(id, team) {
    const c = CORES().list[id];
    const cat = CORES().categories[c.category];
    return `<span class="chip" style="--c:${cat.color}" title="${esc(c.name)} — ${esc(c.desc)}">${c.icon}</span>`;
  }

  function helpTable(list) {
    return list.map(([k, v]) => `<div class="hk"><kbd>${esc(k)}</kbd><span>${esc(v)}</span></div>`).join('');
  }

  const UI = {
    init(app) {
      this.app = app;
      this.el = {
        menu: $('menu'), draft: $('draft'), pause: $('pause'), end: $('end'),
        hud: $('hud'), hint: $('hint'), banner: $('banner'), toasts: $('toasts'),
      };
      this.menuRow = 0;
      this.draftSel = 0;
      this.pauseSel = 0;
      this.endSel = 0;
      this.hudCache = {};
      this.bindMouse();
      this.renderMenu();
    },

    show(name) {
      ['menu', 'draft', 'pause', 'end'].forEach((k) => this.el[k].classList.toggle('hidden', k !== name));
      const inGame = name !== 'menu';
      this.el.hud.classList.toggle('hidden', !inGame);
      this.el.hint.classList.toggle('hidden', !inGame);
    },

    /* ================= MENU ================= */
    menuOptions() {
      const order = TEAMS().order;
      const diffs = SFC_CONFIG.game.ai.difficultyOrder;
      return { order, opp: ['random'].concat(order), diffs };
    },

    renderMenu() {
      const s = this.app.sel, o = this.menuOptions();
      const team = TEAMS().list[o.order[s.team]];
      const oppId = o.opp[s.opp];
      const oppName = oppId === 'random' ? '??? NGẪU NHIÊN' : TEAMS().list[oppId].name;
      const diff = SFC_CONFIG.game.ai.difficulty[o.diffs[s.diff]];
      const ctr = SFC_CONFIG.controls.help;
      const stats = Object.keys(STAT_LABELS).map((k) => {
        const v = team.stats[k] || 1;
        const w = Math.round(Math.max(0.1, Math.min(1, (v - 0.7) / 0.6)) * 100);
        return `<div class="stat"><span>${STAT_LABELS[k]}</span><i><b style="width:${w}%"></b></i></div>`;
      }).join('');
      const kit = team.kit;

      this.el.menu.innerHTML = `
        <div class="menu-left">
          <div class="logo">
            <div class="l1">STREET</div><div class="l2">FOOTBALL</div><div class="l3">CHAOS</div>
            <div class="tag">Football meets Arcade Combat</div>
          </div>
          <div class="rows">
            ${this.row(0, 'ĐỘI CỦA BẠN', team.name)}
            ${this.row(1, 'ĐỐI THỦ', oppName)}
            ${this.row(2, 'ĐỘ KHÓ', diff.label)}
            <div class="row start ${this.menuRow === 3 ? 'sel' : ''}" data-row="3"><button data-act="start">▶ BẮT ĐẦU</button></div>
          </div>
          <div class="nav-hint">↑↓ chọn · ←→ đổi · Enter bắt đầu</div>
        </div>
        <div class="menu-right">
          <div class="team-card" style="--shirt:${kit.shirt};--accent:${kit.accent}">
            <div class="tc-head"><span class="kit"><i style="background:${kit.shirt}"></i><i style="background:${kit.accent}"></i><i style="background:${kit.shorts}"></i></span>
              <div><div class="tc-name">${esc(team.name)}</div><div class="tc-tag">${esc(team.tagline)}</div></div></div>
            <div class="tc-desc">${esc(team.desc)}</div>
            <div class="stats">${stats}</div>
          </div>
          <div class="help">
            <div class="help-col"><h4>TẤN CÔNG</h4>${helpTable(ctr.attack)}</div>
            <div class="help-col"><h4>PHÒNG NGỰ</h4>${helpTable(ctr.defense)}${helpTable(ctr.teammateHasBall)}</div>
          </div>
        </div>`;
    },

    row(i, label, value) {
      return `<div class="row ${this.menuRow === i ? 'sel' : ''}" data-row="${i}">
        <label>${label}</label>
        <div class="picker"><button data-act="prev" data-row="${i}">◀</button><span>${esc(value)}</span><button data-act="next" data-row="${i}">▶</button></div>
      </div>`;
    },

    menuChange(row, delta) {
      const s = this.app.sel, o = this.menuOptions();
      const wrap = (v, n) => (v + n) % n;
      if (row === 0) s.team = wrap(s.team + delta, o.order.length);
      if (row === 1) s.opp = wrap(s.opp + delta, o.opp.length);
      if (row === 2) s.diff = wrap(s.diff + delta, o.diffs.length);
      SFC.Audio.menu();
      this.renderMenu();
    },

    menuInput(input) {
      if (input.wasPressed('up')) { this.menuRow = (this.menuRow + 3) % 4; SFC.Audio.menu(); this.renderMenu(); }
      if (input.wasPressed('down')) { this.menuRow = (this.menuRow + 1) % 4; SFC.Audio.menu(); this.renderMenu(); }
      if (this.menuRow < 3) {
        if (input.wasPressed('left')) this.menuChange(this.menuRow, -1);
        if (input.wasPressed('right')) this.menuChange(this.menuRow, 1);
      }
      if (input.wasPressed('confirm')) this.app.startMatch();
    },

    /* ================= DRAFT ================= */
    renderDraft(game) {
      const d = game.draft;
      if (!d) return;
      const total = SFC_CONFIG.game.match.upgradeTimes.length;
      const cards = d.options.map((id, i) => {
        const c = CORES().list[id];
        const cat = CORES().categories[c.category];
        const tier = CORES().tiers[c.tier] || { label: '', color: '#fff' };
        return `<div class="card ${i === this.draftSel ? 'sel' : ''}" data-pick="${i}" style="--c:${cat.color};--t:${tier.color}">
          <div class="card-key">${i + 1}</div>
          <div class="card-cat">${cat.label}</div>
          <div class="card-icon">${c.icon}</div>
          <div class="card-name">${esc(c.name)}</div>
          <div class="card-tier">${tier.label}</div>
          <div class="card-desc">${esc(c.desc)}</div>
        </div>`;
      }).join('');
      const opp = game.teams[1 - game.humanTeam];
      const oppCores = game.cores.owned[opp.index].map((id) => coreChip(id)).join('') || '<em>—</em>';
      this.el.draft.innerHTML = `
        <div class="draft-title">CORE UPGRADE <span>${d.round}/${total}</span></div>
        <div class="draft-sub">Chọn 1 Core cho cả đội · phím 1 / 2 / 3 hoặc ←→ + Enter</div>
        <div class="cards">${cards}</div>
        <div class="draft-opp">${esc(opp.cfg.name)} build: ${oppCores}</div>`;
    },

    draftInput(input, game) {
      const n = game.draft ? game.draft.options.length : 0;
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
      game.pickCore(i);
      this.show(null);
    },

    /* ================= PAUSE ================= */
    pauseItems: [['resume', 'TIẾP TỤC'], ['restart', 'ĐÁ LẠI'], ['menu', 'VỀ MENU']],

    renderPause() {
      const ctr = SFC_CONFIG.controls.help;
      const items = this.pauseItems.map(([k, l], i) => `<button class="${i === this.pauseSel ? 'sel' : ''}" data-act="${k}">${l}</button>`).join('');
      this.el.pause.innerHTML = `
        <div class="pause-title">PAUSED</div>
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
    endItems: [['restart', 'ĐÁ LẠI'], ['menu', 'VỀ MENU']],

    renderEnd(game) {
      const h = game.humanTeam, me = game.teams[h], op = game.teams[1 - h];
      const res = me.score > op.score ? ['CHIẾN THẮNG!', 'win'] : me.score < op.score ? ['THUA RỒI...', 'lose'] : ['HÒA', 'draw'];
      const build = (t) => {
        const ids = game.cores.owned[t.index];
        return ids.length ? ids.map((id) => `<div class="b-item">${coreChip(id)} ${esc(CORES().list[id].name)}</div>`).join('') : '<em>Không có core</em>';
      };
      const items = this.endItems.map(([k, l], i) => `<button class="${i === this.endSel ? 'sel' : ''}" data-act="${k}">${l}</button>`).join('');
      this.el.end.innerHTML = `
        <div class="end-title ${res[1]}">${res[0]}</div>
        <div class="end-score"><span style="color:${me.cfg.kit.shirt}">${esc(me.cfg.name)}</span> <b>${me.score} - ${op.score}</b> <span style="color:${op.cfg.kit.shirt}">${esc(op.cfg.name)}</span></div>
        <div class="builds">
          <div class="build"><h4>BUILD CỦA BẠN</h4>${build(me)}</div>
          <div class="build"><h4>BUILD ĐỐI THỦ</h4>${build(op)}</div>
        </div>
        <div class="end-note">Lần sau thử một kiểu đá khác?</div>
        <div class="pause-items row-items">${items}</div>`;
    },

    endInput(input) {
      const n = this.endItems.length;
      if (input.wasPressed('left') || input.wasPressed('up')) { this.endSel = (this.endSel + n - 1) % n; this.renderEnd(this.app.game); }
      if (input.wasPressed('right') || input.wasPressed('down')) { this.endSel = (this.endSel + 1) % n; this.renderEnd(this.app.game); }
      if (input.wasPressed('confirm')) this.doAct(this.endItems[this.endSel][0]);
    },

    doAct(act) {
      SFC.Audio.menu();
      if (act === 'resume') this.app.resume();
      if (act === 'restart') this.app.restart();
      if (act === 'menu') this.app.toMenu();
      if (act === 'start') this.app.startMatch();
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
        this.el.hud.innerHTML = `
          <div class="hud-team l" style="--c:${t0.cfg.kit.shirt}">
            <div class="hud-name">${esc(t0.cfg.short)}${game.humanTeam === 0 ? ' <small>P1</small>' : ''}</div>
            <div class="hud-cores">${game.cores.owned[0].map((id) => coreChip(id)).join('')}</div>
          </div>
          <div class="hud-mid">
            <div class="hud-score"><b style="color:${t0.cfg.kit.shirt}">${t0.score}</b><span>-</span><b style="color:${t1.cfg.kit.shirt}">${t1.score}</b></div>
            <div class="hud-time ${game.finalPush || game.golden ? 'hot' : ''}">${time}</div>
            ${phase ? `<div class="hud-phase">${phase}</div>` : ''}
          </div>
          <div class="hud-team r" style="--c:${t1.cfg.kit.shirt}">
            <div class="hud-name">${esc(t1.cfg.short)}</div>
            <div class="hud-cores">${game.cores.owned[1].map((id) => coreChip(id)).join('')}</div>
          </div>`;
      }
      // hint theo ngữ cảnh
      const b = game.ball, p = game.controlled;
      const H = SFC_CONFIG.controls.hints;
      const mode = !p ? '' : b.owner === p ? 'attack' : b.owner && b.owner.team === p.team ? 'support' : 'defense';
      if (c.mode !== mode) { c.mode = mode; this.el.hint.textContent = H[mode] || ''; }
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

    consume(game) {
      const evs = game.events.splice(0);
      if (game.silent) return;
      for (const e of evs) {
        if (e.type === 'goal') {
          const t = game.teams[e.team];
          this.banner(e.value > 1 ? `GOAL x${e.value}!` : 'GOAL!', e.own ? 'Phản lưới nhà!' : `${e.scorer} · ${t.cfg.name}`, t.cfg.kit.shirt, 2.2);
        }
        if (e.type === 'banner') this.banner(e.text, e.sub, e.color, 2.2);
        if (e.type === 'draft') { this.draftSel = 0; this.renderDraft(game); this.show('draft'); }
        if (e.type === 'corePicked') {
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
        const btn = e.target.closest('[data-act],[data-pick]');
        if (!btn) return;
        if (btn.dataset.pick != null && this.app.game) return this.pick(this.app.game, +btn.dataset.pick);
        const act = btn.dataset.act;
        if (act === 'prev' || act === 'next') {
          this.menuRow = +btn.dataset.row;
          return this.menuChange(+btn.dataset.row, act === 'prev' ? -1 : 1);
        }
        this.doAct(act);
      });
    },
  };

  SFC.UI = UI;
})();
