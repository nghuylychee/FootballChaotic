/* UI — lớp DOM trong trận: HUD, chọn Core, pause / menu online, kết quả, thông báo
 * (các màn ngoài trận nằm ở ui/menu.js)
 */
window.SFC = window.SFC || {};

(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const CORES = () => SFC_CONFIG.cores;

  const ARCH = (tag) => CORES().archetypes[tag] || { label: tag, icon: '?', color: '#9aa3b5' };
  const RARITY = (r) => (SFC_CONFIG.progression.rarities[r] || { label: '', color: '#b0c3d9' });

  const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
  // vai trò + thứ Core tạo / dùng: "TẠO: Đà", "DÙNG: Nộ / Giáp", "NỀN", "TUYỆT KỸ (X)"
  function roleText(c) {
    const L = CORES().roleLabels;
    if (c.role === 'gen' || c.role === 'use') {
      const mech = c.tags.map((t) => ARCH(t).mech).filter(Boolean).join(' / ');
      return mech ? `${L[c.role]}: ${mech}` : L[c.role];
    }
    return L[c.role] || '';
  }
  // build nổi bật nhất của đội: "🏃 TỐC ĐỘ IV"
  function buildLabel(game, team) {
    const t = game.cores.traits(team)[0];
    if (!t) return '';
    const a = ARCH(t.tag);
    return `<span class="build-tag ${t.tier ? 'on' : ''}" style="--c:${a.color}">${a.icon} ${a.label} ${ROMAN[t.count] || t.count}</span>`;
  }

  // ô Core nhỏ: viền màu trường phái (Core cầu nối: 2 màu), Tuyệt kỹ viền vàng
  function coreChip(id) {
    const c = CORES().list[id];
    const a = ARCH(c.tags[0]), b = ARCH(c.tags[1] || c.tags[0]);
    return `<span class="chip ${c.role === 'ult' ? 'ult' : ''}" style="--c:${a.color};--c2:${b.color}" title="${esc(c.name)} — ${esc(c.desc)}">${c.icon}</span>`;
  }

  // Cộng hưởng đang có của 1 đội: icon + số Core (bậc >= 2 sáng lên)
  function traitChips(game, team) {
    return game.cores.traits(team).map((t) => {
      const a = ARCH(t.tag);
      return `<span class="trait ${t.tier ? 'on' : ''}" style="--c:${a.color}" title="${a.label}: ${t.count} Core">${a.icon}${t.count}</span>`;
    }).join('');
  }

  // Ô trên thanh kỹ năng (giữa đáy màn hình, kiểu LoL). atk = đòn phòng ngự: chỉ dùng được khi đội mình không có bóng
  const SLOTS = [
    { k: 'light', action: 'shoot', icon: '👊', name: 'LIGHT', atk: true, max: () => SFC_CONFIG.game.combat.light.cooldown, act: ['jab'] },
    { k: 'hard', action: 'lob', icon: '💥', name: 'HARD', atk: true, max: () => SFC_CONFIG.game.combat.hard.cooldown, act: ['windup', 'kick'] },
    { k: 'skill', action: 'skill', icon: '💨', name: 'DASH', max: () => SFC_CONFIG.game.skill.cooldown, act: ['dash'] },
  ];
  const keyLabel = (action) => (SFC_CONFIG.controls.bindings[action] || ['?'])[0].replace(/^(Key|Digit)/, '');

  function helpTable(list) {
    return list.map(([k, v]) => `<div class="hk"><kbd>${esc(k)}</kbd><span>${esc(v)}</span></div>`).join('');
  }

  const PAUSE_SINGLE = [['resume', 'RESUME'], ['restart', 'RESTART'], ['menu', 'MAIN MENU']];
  const PAUSE_ONLINE = [['resume', 'BACK TO MATCH'], ['leave', 'LEAVE ROOM']];

  const UI = {
    init(app) {
      this.app = app;
      this.el = {
        menu: $('menu'), draft: $('draft'), pause: $('pause'), end: $('end'),
        hud: $('hud'), abar: $('abar'), banner: $('banner'), toasts: $('toasts'),
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
      if (name === 'menu') this.el.abar.classList.add('hidden');
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
      const sets = CORES().sets;
      const ownedTags = new Set(game.cores.owned[me].flatMap((id) => CORES().list[id].tags));
      const timer = d.limit > 0 ? `<span id="draft-timer" class="draft-timer">${Math.ceil(Math.max(0, d.t))}s</span>` : '';
      const cards = opts.map((id, i) => {
        const c = CORES().list[id];
        const a = ARCH(c.tags[0]), a2 = ARCH(c.tags[1] || c.tags[0]);
        const rar = RARITY(c.rarity);
        const chosen = picked && (d.localPick === i || d.picked[me] === id);
        const match = c.tags.some((t) => ownedTags.has(t));
        // tiến độ Cộng hưởng nếu lấy lá này: TỐC ĐỘ 1 → 2 ✦ (✦ = mở bậc mới)
        const prog = c.tags.filter((t) => sets[t]).map((t) => {
          const cur = game.cores.tagCount(me, t), next = cur + 1, bonus = sets[t][next];
          return `<div class="cs-row ${bonus ? 'up' : ''}" style="--c:${ARCH(t).color}"><b>${ARCH(t).icon} ${cur} → ${next}${bonus ? ' ✦' : ''}</b>${bonus ? `<span>${esc(bonus)}</span>` : ''}</div>`;
        }).join('');
        const tags = c.tags.map((t) => `<span style="--c:${ARCH(t).color}">${ARCH(t).icon} ${ARCH(t).label}</span>`).join('');
        return `<div class="card ${c.role === 'ult' ? 'ult' : ''} ${!picked && i === this.draftSel ? 'sel' : ''} ${chosen ? 'chosen' : ''}" data-pick="${i}" style="--c:${a.color};--c2:${a2.color};--t:${rar.color}">
          <div class="card-key">${i + 1}</div>
          ${match && !picked ? '<div class="card-match">MATCH</div>' : ''}
          <div class="card-tags">${tags}</div>
          <div class="card-art">${SFC.CorePreview.html(id, 132, 56)}<span class="card-emoji">${c.icon}</span>${c.role === 'ult' ? '<kbd class="card-x">X</kbd>' : ''}</div>
          <div class="card-name">${esc(c.name)}</div>
          <div class="card-tier">${rar.label} · ${roleText(c)}</div>
          <div class="card-desc">${esc(c.desc)}</div>
          <div class="card-set">${prog}</div>
        </div>`;
      }).join('');
      const opp = game.teams[1 - me];
      const left = (d.rerolls && d.rerolls[me]) || 0;
      const reroll = picked ? '' : `<button class="draft-reroll ${left ? '' : 'off'}" data-act="reroll"><kbd>${esc(keyLabel('reroll'))}</kbd> REROLL 3 (${left} left)</button>`;
      const sub = picked ? 'Picked · waiting for opponent...' : 'Pick 1 Core for your whole team · keys 1 / 2 / 3 or ←→ + Enter';
      this.el.draft.classList.toggle('waiting', picked);
      this.el.draft.innerHTML = `
        <div class="draft-title">${d.pre ? 'STARTING CORE' : 'CORE UPGRADE'} <span>${d.round}/${total}</span>${timer}</div>
        <div class="draft-sub">${sub}${reroll}</div>
        <div class="cards">${cards}</div>
        <div class="draft-opp"><span>Your build:</span> ${traitChips(game, me) || '<em>—</em>'} <span class="sep">·</span> <span>${esc(opp.cfg.name)}:</span> ${traitChips(game, opp.index) || '<em>—</em>'}</div>`;
      SFC.CorePreview.scan(this.el.draft);
    },

    // đổi lá đang chọn mà không vẽ lại (giữ ảnh động đang chạy)
    setDraftSel(i) {
      this.draftSel = i;
      this.el.draft.querySelectorAll('.card[data-pick]').forEach((c) => c.classList.toggle('sel', +c.dataset.pick === i));
    },

    draftInput(input, game) {
      const d = game.draft;
      if (!d || d.picked[game.humanTeam]) return;
      const n = (d.options[game.humanTeam] || []).length;
      if (!n) return;
      let changed = false;
      let sel = this.draftSel;
      if (input.wasPressed('left')) { sel = (sel + n - 1) % n; changed = true; }
      if (input.wasPressed('right')) { sel = (sel + 1) % n; changed = true; }
      if (changed) { SFC.Audio.menu(); this.setDraftSel(sel); }
      let pick = -1;
      if (input.wasPressed('pick1')) pick = 0;
      if (input.wasPressed('pick2')) pick = 1;
      if (input.wasPressed('pick3')) pick = 2;
      if (input.wasPressed('confirm')) pick = this.draftSel;
      if (pick >= 0 && pick < n) this.pick(game, pick);
      else if (input.wasPressed('reroll')) this.doAct('reroll');
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
        ${this.online ? '<div class="pause-note">Online matches keep running</div>' : ''}
        <div class="pause-items">${items}</div>
        <div class="help small">
          <div class="help-col"><h4>ATTACK</h4>${helpTable(ctr.attack)}</div>
          <div class="help-col"><h4>DEFENSE</h4>${helpTable(ctr.defense)}${helpTable(ctr.teammateHasBall)}</div>
          <div class="help-col"><h4>SYSTEM</h4>${helpTable(ctr.system)}</div>
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
      if (!this.online) return [['restart', 'PLAY AGAIN'], ['menu', 'MAIN MENU']];
      return SFC.Online.isHost ? [['lobby', 'BACK TO LOBBY'], ['leave', 'LEAVE ROOM']] : [['leave', 'LEAVE ROOM']];
    },

    renderEnd(game) {
      const h = game.humanTeam, me = game.teams[h], op = game.teams[1 - h];
      const res = me.score > op.score ? ['VICTORY!', 'win'] : me.score < op.score ? ['DEFEAT...', 'lose'] : ['DRAW', 'draw'];
      const build = (t) => {
        const ids = game.cores.owned[t.index];
        return buildLabel(game, t.index) + (ids.length ? ids.map((id) => `<div class="b-item">${coreChip(id)} ${esc(CORES().list[id].name)}</div>`).join('') : '<em>No cores</em>');
      };
      const note = this.online && !SFC.Online.isHost ? 'Waiting for the host to return to the lobby...' : 'Try a different build next time?';
      // sân luôn vẽ đội 0 bên trái -> tỉ số giữ đúng thứ tự trái / phải
      const t0 = game.teams[0], t1 = game.teams[1];
      this.el.end.innerHTML = `
        <div class="end-title ${res[1]}">${res[0]}</div>
        <div class="end-score"><span style="color:${t0.cfg.kit.shirt}">${esc(t0.cfg.name)}</span> <b>${t0.score} - ${t1.score}</b> <span style="color:${t1.cfg.kit.shirt}">${esc(t1.cfg.name)}</span></div>
        <div class="builds">
          <div class="build"><h4>YOUR BUILD</h4>${build(me)}</div>
          ${game.reward ? this.rewardPanel(game.reward) : ''}
          <div class="build"><h4>OPPONENT BUILD</h4>${build(op)}</div>
        </div>
        ${this.momentPanel(game)}
        <div class="end-note">${note}</div>
        <div class="pause-items row-items" id="end-items"></div>`;
      this.el.end.classList.toggle('has-moment', !!(game.moments && game.moments.length));
      this.renderEndItems();
      SFC.CorePreview.scan(this.el.end);
      if (game.reward) this.playReward(game.reward);
    },

    // "Khoảnh khắc của trận": khoảnh khắc điểm cao nhất (Tuyệt kỹ, combo HIT) + ảnh động của Core đó
    momentPanel(game) {
      const list = game.moments || [];
      if (!list.length) return '';
      const best = list.reduce((a, b) => (b.score > a.score ? b : a));
      const c = CORES().list[best.id], tm = game.teams[best.team];
      const count = (t) => {
        const u = list.filter((m) => m.team === t && m.kind === 'ult').length;
        const hit = list.filter((m) => m.team === t && m.kind === 'combo').reduce((a, m) => Math.max(a, m.n || 0), 0);
        return `${u ? `Ultimate ×${u}` : ''}${u && hit ? ' · ' : ''}${hit ? `Combo ${hit} HIT` : ''}` || '—';
      };
      const me = game.humanTeam;
      return `<div class="moment" style="--c:${ARCH(c.tags[0]).color}">
        ${SFC.CorePreview.html(best.id, 150, 64)}
        <div class="mo-info">
          <h4>MOMENT OF THE MATCH</h4>
          <div class="mo-name">${c.icon} ${esc(best.text)}</div>
          <div class="mo-sub"><span style="color:${tm.cfg.kit.shirt}">${esc(tm.cfg.short)}</span>${best.player ? ' · ' + esc(best.player) : ''} · ${esc(c.name)}</div>
          <div class="mo-sub">You: ${count(me)} <span class="sep">·</span> Opponent: ${count(1 - me)}</div>
        </div>
      </div>`;
    },

    renderEndItems() {
      const el = document.getElementById('end-items');
      if (el) el.innerHTML = this.endItems().map(([k, l], i) => `<button class="${i === this.endSel ? 'sel' : ''}" data-act="${k}">${l}</button>`).join('');
    },

    /* ---------- thưởng sau trận: các dòng hiện lần lượt, gold đếm lên, thanh XP chạy qua từng level ---------- */
    rewardPanel(r) {
      const lines = r.lines.map((l, i) => `<div class="rw-line" data-rw="${i}"><span>${esc(l.label)}</span>${
        l.mult || l.note ? '' : `<b class="x">+${l.xp} XP</b><b class="g"><i class="coin"></i>+${l.gold}</b>`}</div>`).join('');
      return `<div class="build reward">
        <h4>REWARDS</h4>
        <div class="rw-lines">${lines}</div>
        <div class="rw-total"><span class="gold"><i class="coin"></i><b id="rw-gold">+0</b></span><b id="rw-xp" class="x">+0 XP</b></div>
        <div class="lvrow"><span class="lv" id="rw-lv">LV ${r.before.level}</span><div class="xpbar"><i id="rw-bar"></i></div></div>
        <div class="rw-up" id="rw-up"></div>
      </div>`;
    },

    playReward(r) {
      cancelAnimationFrame(this.rwRaf);
      const $$ = (id) => document.getElementById(id);
      const t0 = performance.now();
      const nLines = r.lines.length;
      const LINE = 0.28, COUNT = 1.1;
      const startCount = 0.3 + nLines * LINE;
      // quãng XP phải chạy: tính theo "level thập phân" để thanh chạy qua từng level
      const need = (lv) => SFC.Profile.xpToNext(lv);
      const from = r.before.level + (r.before.need === Infinity ? 0 : r.before.xp / r.before.need);
      const to = r.after.level + (r.after.need === Infinity ? 0 : r.after.xp / r.after.need);
      let shownLv = r.before.level;
      const step = (now) => {
        const t = (now - t0) / 1000;
        for (let i = 0; i < nLines; i++) {
          const el = document.querySelector(`[data-rw="${i}"]`);
          if (el && t > 0.3 + i * LINE && !el.classList.contains('in')) { el.classList.add('in'); SFC.Audio.menu(); }
        }
        const k = Math.max(0, Math.min(1, (t - startCount) / COUNT));
        const e = 1 - (1 - k) * (1 - k);
        const gold = $$('rw-gold'), xp = $$('rw-xp'), bar = $$('rw-bar'), lv = $$('rw-lv'), up = $$('rw-up');
        if (!gold) return; // đã rời màn kết quả
        gold.textContent = '+' + Math.round((r.gold + (k >= 1 ? r.levelGold : 0)) * e);
        xp.textContent = '+' + Math.round(r.xp * e) + ' XP';
        const cur = from + (to - from) * e;
        const level = Math.min(Math.floor(cur), r.after.level);
        bar.style.width = (need(level) === Infinity ? 100 : (cur - level) * 100) + '%';
        if (level > shownLv) {
          shownLv = level;
          lv.textContent = 'LV ' + level;
          up.innerHTML = `<b class="lvup">LEVEL UP! LV ${level}</b><span class="gold"><i class="coin"></i>+${SFC_CONFIG.progression.levelUpGold}</span>`;
          up.classList.remove('pop'); void up.offsetWidth; up.classList.add('pop');
          SFC.Audio.upgrade();
        }
        if (k >= 1) {
          if (r.eligible.length && !up.dataset.done) {
            up.dataset.done = 1;
            up.insertAdjacentHTML('beforeend', `<div class="rw-new">Unlocked: ${r.eligible.map(esc).join(', ')}</div>`);
          }
          return;
        }
        this.rwRaf = requestAnimationFrame(step);
      };
      this.rwRaf = requestAnimationFrame(step);
    },

    endInput(input) {
      const n = this.endItems().length;
      if (input.wasPressed('left') || input.wasPressed('up')) { this.endSel = (this.endSel + n - 1) % n; this.renderEndItems(); }
      if (input.wasPressed('right') || input.wasPressed('down')) { this.endSel = (this.endSel + 1) % n; this.renderEndItems(); }
      if (input.wasPressed('confirm')) this.doAct(this.endItems()[this.endSel][0]);
    },

    doAct(act) {
      SFC.Audio.menu();
      if (act === 'resume') this.app.resume();
      if (act === 'restart') this.app.restart();
      if (act === 'menu') this.app.toMenu();
      if (act === 'leave') SFC.Online.leave();
      if (act === 'lobby') SFC.Online.backToLobby();
      if (act === 'reroll') this.app.rerollCore();
    },

    /* ================= HUD ================= */
    updateHud(game) {
      if (!game) return;
      const c = this.hudCache;
      const t0 = game.teams[0], t1 = game.teams[1];
      const training = !!(game.opts && game.opts.training);
      const time = game.golden ? 'GOLDEN' : SFC.U.fmtTime(game.remaining);
      const phase = game.golden ? 'GOLDEN GOAL' : game.finalPush ? 'FINAL PUSH x' + SFC_CONFIG.game.match.finalPushGoalValue : '';
      const cores = game.cores.owned[0].join() + '|' + game.cores.owned[1].join();
      // lượt chọn Core: đang chờ bàn thắng / còn bao lâu tới lượt kế
      const pend = game.draftPending(), next = game.draftNextIn();
      const coreLine = pend > 0 ? `<div class="hud-core on">✦ CORE +${pend} · waiting for a goal</div>`
        : next != null ? `<div class="hud-core">✦ Next Core in ${SFC.U.fmtTime(next)}</div>` : '';
      const key = [t0.score, t1.score, time, phase, cores, coreLine].join('#');
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
            <div class="hud-cores">${game.humanTeam === 0 ? '' : game.cores.owned[0].map((id) => coreChip(id)).join('')}</div>
            <div class="hud-traits">${traitChips(game, 0)}</div>
            ${this.ultMeter(game, 0)}
          </div>
          <div class="hud-mid">${training ? '<div class="hud-time">TRAINING</div>' : `
            <div class="hud-score"><b style="color:${t0.cfg.kit.shirt}">${t0.score}</b><span>-</span><b style="color:${t1.cfg.kit.shirt}">${t1.score}</b></div>
            <div class="hud-time ${game.finalPush || game.golden ? 'hot' : ''}">${time}</div>
            ${phase ? `<div class="hud-phase">${phase}</div>` : ''}`}
            ${coreLine}
          </div>
          <div class="hud-team r" style="--c:${t1.cfg.kit.shirt}">
            <div class="hud-name">${tag(1)} ${esc(t1.cfg.short)}</div>
            <div class="hud-cores">${game.humanTeam === 1 ? '' : game.cores.owned[1].map((id) => coreChip(id)).join('')}</div>
            <div class="hud-traits">${traitChips(game, 1)}</div>
            ${this.ultMeter(game, 1)}
          </div>`;
        c.ultBars = [0, 1].map((t) => this.el.hud.querySelector(`.hud-ult[data-t="${t}"]`));
        c.ultVals = [-1, -1];
      }
      // năng lượng Tuyệt kỹ 2 đội (cập nhật mỗi khung)
      for (let t = 0; t < 2; t++) {
        const el = c.ultBars && c.ultBars[t], v = Math.round(game.ult[t] * 100);
        if (!el || v === c.ultVals[t]) continue;
        c.ultVals[t] = v;
        el.style.setProperty('--u', (v / 100).toFixed(2));
        el.classList.toggle('full', v >= 100);
        el.querySelector('em').textContent = v + '%';
      }
      this.updateBar(game);
      // đồng hồ chọn Core (online)
      if (game.state === 'draft' && game.draft && game.draft.limit > 0) {
        const el = document.getElementById('draft-timer');
        const s = Math.ceil(Math.max(0, game.draft.t)) + 's';
        if (el && el.textContent !== s) el.textContent = s;
      }
    },

    // thanh năng lượng Tuyệt kỹ nhỏ trên HUD của mỗi đội (icon Tuyệt kỹ nếu đã có)
    // (chỉ khi đội đã có Tuyệt kỹ)
    ultMeter(game, t) {
      const id = game.cores.ultOf(t), c = id && CORES().list[id];
      if (!c) return '';
      return `<div class="hud-ult has" data-t="${t}" title="${esc(c.name + ': Ultimate energy')}"><b>${c.icon}</b><i></i><em>0%</em></div>`;
    },

    /* ================= THANH KỸ NĂNG (giữa đáy, kiểu LoL) ================= */
    updateBar(game) {
      const el = this.el.abar, p = game.controlled;
      el.classList.toggle('hidden', !p || this.current === 'menu');
      if (!p) return;
      const c = this.hudCache.bar || (this.hudCache.bar = {});
      const owned = game.cores.owned[p.team];
      const key = p.id + '|' + owned.join();
      if (c.key !== key) {
        c.key = key;
        const kit = game.teams[p.team].cfg.kit;
        const ult = game.cores.ultOf(p.team);
        const nItems = Math.max(SFC_CONFIG.game.match.maxUpgrades, owned.length);
        const items = [];
        for (let i = 0; i < nItems; i++) items.push(owned[i] ? coreChip(owned[i]) : '<span class="chip empty"></span>');
        el.style.setProperty('--c', kit.shirt);
        el.innerHTML = `
          <div class="ab-por"><canvas width="22" height="22"></canvas><div class="ab-name">${esc(p.name)}</div>${game.lockedPlayer(p.team) ? '' : `<kbd>${esc(keyLabel('switch'))}</kbd>`}</div>
          <div class="ab-mid">
            <div class="ab-res"></div>
            <div class="ab-slots">${SLOTS.map((s) => `
              <div class="ab-slot" data-k="${s.k}" title="${s.name}">
                <i>${s.icon}</i><div class="sw"></div><b></b><kbd>${esc(keyLabel(s.action))}</kbd>
              </div>`).join('')}${ult ? `
              <div class="ab-slot ult" data-k="ult" title="${esc(`ULTIMATE: ${CORES().list[ult].name}. Charge it by scoring and stealing the ball`)}">
                <div class="ult-fill"></div><i>${CORES().list[ult].icon}</i><b class="ult-pct"></b><kbd>${esc(keyLabel('ultimate'))}</kbd>
              </div>` : ''}
            </div>
            <div class="ab-stam"><i></i></div>
          </div>
          <div class="ab-items">${items.join('')}</div>`;
        this.drawPortrait(el.querySelector('canvas'), p, game);
        c.slots = SLOTS.map((s) => {
          const node = el.querySelector(`[data-k="${s.k}"]`);
          return { s, node, sw: node.querySelector('.sw'), txt: node.querySelector('b'), last: -1, lastTxt: null, cls: '' };
        });
        c.stam = el.querySelector('.ab-stam i');
        c.lastStam = -1;
        c.res = el.querySelector('.ab-res');
        c.ult = el.querySelector('[data-k="ult"]');
        c.lastRes = null; c.lastUlt = -1;
      }
      this.updateBarExtras(game, p, c);

      const teamHas = !!game.ball.owner && game.ball.owner.team === p.team;
      for (const sl of c.slots) {
        const rem = Math.max(0, p.cd[sl.s.k] || 0);
        const frac = Math.min(1, rem / sl.s.max());
        if (Math.abs(frac - sl.last) > 0.005) sl.sw.style.setProperty('--p', frac.toFixed(3));
        const txt = rem <= 0 ? '' : rem < 1 ? rem.toFixed(1) : String(Math.ceil(rem));
        if (txt !== sl.lastTxt) sl.txt.textContent = txt;
        // hồi xong -> lóe sáng
        if (sl.last > 0 && frac <= 0) { sl.node.classList.remove('ready'); void sl.node.offsetWidth; sl.node.classList.add('ready'); }
        sl.last = frac; sl.lastTxt = txt;
        const cls = (rem > 0 ? ' cd' : '') + (sl.s.atk && teamHas ? ' off' : '') + (sl.s.act.includes(p.state) ? ' act' : '');
        if (cls !== sl.cls) {
          sl.cls = cls;
          sl.node.classList.toggle('cd', rem > 0);
          sl.node.classList.toggle('off', !!(sl.s.atk && teamHas));
          sl.node.classList.toggle('act', sl.s.act.includes(p.state));
        }
      }
      const st = Math.round((p.stamina / SFC_CONFIG.game.player.staminaMax) * 100);
      if (st !== c.lastStam) {
        c.lastStam = st;
        c.stam.style.width = st + '%';
        c.stam.classList.toggle('low', p.stamina <= SFC_CONFIG.game.player.staminaMinToSprint * 2);
      }
    },

    // bộ đếm tài nguyên (Đà / Nhịp / Nộ / Giáp) + thanh năng lượng Tuyệt kỹ
    updateBarExtras(game, p, c) {
      const R = CORES().resources, t = p.team;
      const parts = [];
      const pips = (res, n, max) => `<span class="res" style="--c:${res === 'guard' ? '#c7ccd6' : res === 'rhythm' ? '#ffd23f' : res === 'rage' ? '#ff3d5a' : '#3ff6ff'}">${R[res].icon}${'●'.repeat(n)}<i>${'○'.repeat(Math.max(0, max - n))}</i></span>`;
      if (game.cores.resActive(t, 'momentum')) parts.push(pips('momentum', p.res.momentum, game.cores.resMax(t, 'momentum')));
      if (game.cores.resActive(t, 'rhythm')) parts.push(pips('rhythm', game.rhythm[t], R.rhythm.max));
      if (game.cores.resActive(t, 'rage')) parts.push(pips('rage', p.res.rage, R.rage.max));
      if (p.res.guard > 0 || game.cores.resActive(t, 'guard')) parts.push(pips('guard', p.res.guard, R.guard.max));
      const html = parts.join('');
      if (html !== c.lastRes) { c.lastRes = html; c.res.innerHTML = html; c.res.classList.toggle('hidden', !html); }
      if (c.ult) {
        const v = Math.round(game.ult[t] * 100);
        if (v !== c.lastUlt) {
          const prev = c.lastUlt;
          c.lastUlt = v;
          c.ult.style.setProperty('--u', (v / 100).toFixed(2));
          c.ult.classList.toggle('ready', v >= 100);
          c.ult.classList.toggle('full', v >= 100);
          c.ult.querySelector('.ult-pct').textContent = v >= 100 ? 'FULL' : v + '%';   // sẵn sàng: viền vàng + rung
          // vừa được nạp: "+20%" bay lên · vừa dùng: thanh rút cạn
          if (prev >= 0 && v > prev) {
            const f = document.createElement('span');
            f.className = 'ult-gain';
            f.textContent = '+' + (v - prev) + '%';
            c.ult.appendChild(f);
            setTimeout(() => f.remove(), 1100);
            c.ult.classList.remove('gain'); void c.ult.offsetWidth; c.ult.classList.add('gain');
          } else if (prev >= 100 && v === 0) {
            c.ult.classList.remove('drain'); void c.ult.offsetWidth; c.ult.classList.add('drain');
          }
        }
      }
    },

    // chân dung pixel: vẽ lại sprite cầu thủ (đầu + vai) vào canvas nhỏ
    drawPortrait(cv, p, game) {
      const ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, cv.width, cv.height);
      SFC.Sprites.drawPlayer(ctx, {
        x: 11, y: 28, vx: 0, vy: 0, facing: Math.PI / 2, anim: 0, flash: 0, state: 'normal',
        team: p.team, role: p.role, look: p.look,
      }, game);
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
          this.banner(e.value > 1 ? `GOAL x${e.value}!` : 'GOAL!', e.own ? 'Own goal!' : `${e.scorer} · ${t.cfg.name}`, t.cfg.kit.shirt, 2.2);
        }
        if (e.type === 'banner') this.banner(e.text, e.sub, e.color, 2.2);
        // khoảnh khắc của trận (màn kết quả)
        if (e.type === 'ultimate') (game.moments || (game.moments = [])).push({ kind: 'ult', team: e.team, id: e.id, player: e.player, text: 'ULTIMATE · ' + CORES().list[e.id].name.toUpperCase(), score: 60 });
        if (e.type === 'moment') (game.moments || (game.moments = [])).push({ kind: 'combo', team: e.team, id: e.id, text: e.text, n: parseInt(e.text, 10) || 0, score: e.score });
        if (e.type === 'draft') { this.draftSel = 0; this.renderDraft(game); if (!overlay) this.show('draft'); }
        if (e.type === 'draftWait' && game.draft) this.renderDraft(game);
        if (e.type === 'corePicked') {
          if (this.current === 'draft') this.show(null);
          for (const pk of e.picks) {
            const c = CORES().list[pk.id], t = game.teams[pk.team];
            this.toast(`<span class="dot" style="background:${t.cfg.kit.shirt}"></span>${esc(t.cfg.short)} gets ${coreChip(pk.id)} <b>${esc(c.name)}</b>`);
          }
        }
        if (e.type === 'end') {
          // thưởng XP / gold: tính 1 lần cho người chơi tại máy này (chơi đơn + online)
          if (!game.reward && game.humanTeam >= 0 && SFC.Profile.data) game.reward = SFC.Profile.awardMatch(game);
          this.endSel = 0;
          setTimeout(() => { if (this.app.game === game) { this.renderEnd(game); this.show('end'); } }, 900);
        }
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
