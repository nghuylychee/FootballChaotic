/* UI — lớp DOM trong trận: HUD, chọn Core, pause / menu online, kết quả, thông báo
 * (các màn ngoài trận nằm ở ui/menu.js)
 */
window.SFC = window.SFC || {};

(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const _t = SFC.t, _tn = SFC.tn;   // dịch theo ngôn ngữ đang chọn (engine/i18n.js)
  const CORES = () => SFC_CONFIG.cores;

  const ARCH = (tag) => CORES().archetypes[tag] || { label: tag, icon: '?', color: '#9aa3b5' };
  const PX = () => SFC.PixelIcon;   // icon pixel art (render/pixelicons.js)
  const RARITY = (r) => (SFC_CONFIG.progression.rarities[r] || { label: '', color: '#b0c3d9' });

  const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
  // build nổi bật nhất của đội: "🏃 TỐC ĐỘ IV"
  function buildLabel(game, team) {
    const t = game.cores.traits(team)[0];
    if (!t) return '';
    const a = ARCH(t.tag);
    return `<span class="build-tag ${t.tier ? 'on' : ''}" style="--c:${a.color}">${PX().arch(t.tag)} ${a.label} ${ROMAN[t.count] || t.count}</span>`;
  }

  // ô Core nhỏ: viền màu trường phái (Core cầu nối: 2 màu), Tuyệt kỹ viền vàng
  function coreChip(id) {
    const c = CORES().list[id];
    const a = ARCH(c.tags[0]), b = ARCH(c.tags[1] || c.tags[0]);
    return `<span class="chip ${c.role === 'ult' ? 'ult' : ''}" style="--c:${a.color};--c2:${b.color}" title="${esc(c.name)} — ${esc(SFC.CoreScale.plain(id))}">${PX().core(id)}</span>`;
  }

  // Cộng hưởng đang có của 1 đội: icon + số Core (bậc >= 2 sáng lên)
  function traitChips(game, team) {
    return game.cores.traits(team).map((t) => {
      const a = ARCH(t.tag);
      return `<span class="trait ${t.tier ? 'on' : ''}" style="--c:${a.color}" title="${esc(_tn('{arch}: {n} Core', '{arch}: {n} Cores', t.count, { arch: a.label }))}">${PX().arch(t.tag)}${t.count}</span>`;
    }).join('');
  }

  // Cộng hưởng kiểu TFT: huy hiệu lục giác theo bậc (chưa kích hoạt · đồng 2 · bạc 3 · vàng 4), số Core, các mốc 2 › 3 › 4.
  // full = kèm dòng hiệu ứng từng mốc (màn Pause). Trường phái không có Cộng hưởng (HỖN LOẠN) không hiện
  const TIER_COLOR = { 0: '#4a3f4c', 2: '#c77b3e', 3: '#c7ccd6', 4: '#ffd23f' };
  function traitList(game, team, full = false) {
    const sets = CORES().sets;
    return game.cores.traits(team).sort((a, b) => b.tier - a.tier || b.count - a.count).map((t) => {
      const a = ARCH(t.tag), marks = Object.keys(sets[t.tag] || {}).map(Number).sort((x, y) => x - y);
      const steps = marks.map((m) => `<i class="${t.count >= m ? 'on' : ''}">${m}</i>`).join('<em>›</em>');
      const bonus = full ? `<div class="tr-bonus">${marks.map((m) => `<div class="${t.count >= m ? 'on' : ''}"><b>${m}</b><span>${SFC.CoreScale.iconize(esc(sets[t.tag][m]))}</span></div>`).join('')}</div>` : '';
      return `<div class="trait-row t${t.tier}" style="--c:${a.color};--tc:${TIER_COLOR[t.tier] || TIER_COLOR[0]}">
        <span class="tr-hex">${PX().arch(t.tag, 'sm')}</span><b class="tr-n">${t.count}</b><span class="tr-name">${esc(a.label)}</span><span class="tr-steps">${steps}</span></div>${bonus}`;
    }).join('');
  }

  // lá Core nhỏ trên màn Pause (ô chưa có Core: mặt úp ???)
  function miniCard(id) {
    if (!id) return '<div class="mcard empty"><b>???</b></div>';
    const c = CORES().list[id], r = RARITY(c.rarity);
    return `<div class="mcard ${c.role === 'ult' ? 'ult' : ''}" style="--t:${r.color}" title="${esc(c.name)} — ${esc(SFC.CoreScale.plain(id))}">
      <div class="mc-tags">${c.tags.map((t) => PX().arch(t, 'sm')).join('')}</div>
      <div class="mc-art">${SFC.CorePreview.html(id, 72, 40)}<span class="card-emoji">${PX().core(id)}</span></div>
      <div class="mc-name">${esc(c.name)}</div>
      <div class="mc-stat" style="--sc:${SFC.CoreScale.color(id)}">${esc(SFC.CoreScale.label(id))}</div>
    </div>`;
  }

  // Ô trên thanh kỹ năng (giữa đáy màn hình, kiểu LoL). atk = ra đòn: dùng được mọi lúc trừ khi chính mình cầm bóng
  const SLOTS = [
    { k: 'light', action: 'shoot', icon: 'fist', atk: true, max: () => SFC_CONFIG.game.combat.light.cooldown, act: ['jab'] },
    { k: 'hard', action: 'lob', icon: 'boom', atk: true, max: () => SFC_CONFIG.game.combat.hard.cooldown, act: ['windup', 'kick'] },
    { k: 'skill', action: 'skill', icon: 'dash', max: () => SFC_CONFIG.game.skill.cooldown, act: ['dash'] },
  ];
  // tooltip ô kỹ năng ('attack|HARD' = đòn mạnh, khác độ khó HARD)
  const SLOT_NAMES = () => ({ light: SFC.tc('attack', 'LIGHT'), hard: SFC.tc('attack', 'HARD'), skill: _t('DASH') });
  const keyLabel = (action) => SFC.Input.label(action);

  // nút Pause mặc định — main.js -> beginMatch đặt lại (đã dịch) mỗi lần vào trận
  const PAUSE_SINGLE = [['resume', 'RESUME'], ['restart', 'RESTART'], ['menu', 'MAIN MENU']];

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
      const me = game.me, team = game.humanTeam;   // lượt chọn khóa theo slot người chơi (co-op: 2 slot cùng đội)
      const total = SFC_CONFIG.game.match.maxUpgrades;
      const opts = d.options[me] || [];
      const picked = !!d.picked[me];
      const mp = game.cores.seatOwner(me);   // Core là của riêng cầu thủ người chơi điều khiển
      const ownedTags = new Set(game.cores.coresOf(mp).flatMap((id) => CORES().list[id].tags));
      const timer = d.limit > 0 ? `<span id="draft-timer" class="draft-timer">${Math.ceil(Math.max(0, d.t))}s</span>` : '';
      const cards = opts.map((id, i) => {
        const c = CORES().list[id];
        const rar = RARITY(c.rarity);
        const chosen = picked && (d.localPick === i || d.picked[me] === id);
        const match = c.tags.some((t) => ownedTags.has(t));
        const tags = c.anyBuild ? `<span style="--c:${c.color || rar.color}">${PX().ui('star', 'sm')} ${esc(_t('ANY BUILD'))}</span>`
          : c.tags.map((t) => `<span style="--c:${ARCH(t).color}">${PX().arch(t, 'sm')} ${ARCH(t).label}</span>`).join('');
        // Core vừa mở khoá ở Main Path: nhãn NEW (hiện 1 lần rồi bỏ khỏi danh sách "mới")
        const isNew = game.opts.coreFresh && !!mp && !!game.cores.newShown[mp.id] && game.cores.newShown[mp.id].has(id);
        if (isNew && game.opts.mainPath) SFC.MainPath.seen(id);
        return `<div class="card ${c.role === 'ult' ? 'ult' : ''} ${!picked && i === this.draftSel ? 'sel' : ''} ${chosen ? 'chosen' : ''}" data-pick="${i}" style="--c:${rar.color};--c2:${rar.color};--t:${rar.color}">
          <div class="card-key">${i + 1}</div>
          ${isNew ? `<div class="card-new">${esc(_t('NEW'))}</div>` : ''}
          ${match && !picked ? `<div class="card-match">${esc(_t('MATCH'))}</div>` : ''}
          <div class="card-tags">${tags}</div>
          <div class="card-art">${SFC.CorePreview.html(id, 132, 56)}<span class="card-emoji">${PX().core(id)}</span>${c.role === 'ult' ? `<kbd class="card-x">${esc(keyLabel('ultimate'))}</kbd>` : ''}</div>
          <div class="card-name">${esc(c.name)}</div>
          ${SFC.CoreScale.statLine(id)}
          <div class="card-desc">${SFC.CoreScale.describe(id, game.cores.rating(id, mp || team))}</div>
        </div>`;
      }).join('');
      const opp = game.teams[1 - team];
      const left = (d.rerolls && d.rerolls[me]) || 0;
      const reroll = picked || d.noReroll ? '' : `<button class="draft-reroll ${left ? '' : 'off'}" data-act="reroll"><kbd>${esc(keyLabel('reroll'))}</kbd> ${esc(_tn('REROLL 3 ({n} left)', 'REROLL 3 ({n} left)', left))}</button>`;
      // bàn phím: không cần chú thích (bỏ dòng "Pick 1 Core..."); tay cầm không có phím số -> gợi ý nút ngắn
      const sub = picked ? esc(game.seats.length > 2 || game.humans.length < 2 ? _t('Picked · waiting for other players...') : _t('Picked · waiting for opponent...')) : SFC.Input.device === 'pad' ? `←→ + ${esc(keyLabel('confirm'))}` : '';
      this.el.draft.classList.toggle('waiting', picked);
      // lượt chọn có kịch bản (PROLOGUE): tiêu đề riêng, ghi chú dưới lá bài, lá ULTIMATE lộ diện
      this.el.draft.classList.toggle('ult-reveal', d.special === 'ult');
      const title = d.title ? esc(d.title) : `${esc(d.pre ? _t('STARTING CORE') : _t('CORE UPGRADE'))} <span>${d.round}/${total}</span>`;
      this.el.draft.innerHTML = `
        <div class="draft-title">${title}${timer}</div>
        <div class="draft-sub">${sub}${reroll}</div>
        <div class="cards">${cards}</div>
        ${d.note ? `<div class="draft-note">${esc(d.note).replace(/\*(.+?)\*/g, '<b>$1</b>')}</div>` : ''}
        <div class="draft-opp"><span>${esc(_t('Your build:'))}</span> ${traitChips(game, mp) || '<em>—</em>'}${this.mateChips(game, team, mp)} <span class="sep">·</span> <span>${esc(opp.cfg.name)}:</span> ${opp.players.map((q) => traitChips(game, q) || '<em>—</em>').join(' <span class="sep">/</span> ')}</div>`;
      SFC.CorePreview.scan(this.el.draft);
    },

    // đổi lá đang chọn mà không vẽ lại (giữ ảnh động đang chạy)
    setDraftSel(i) {
      this.draftSel = i;
      this.el.draft.querySelectorAll('.card[data-pick]').forEach((c) => c.classList.toggle('sel', +c.dataset.pick === i));
    },

    draftInput(input, game) {
      const d = game.draft;
      if (!d || d.picked[game.me]) return;
      const n = (d.options[game.me] || []).length;
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
      if (!game.draft || game.draft.picked[game.me]) return;
      this.draftSel = i;
      this.app.pickCore(i);
      if (game.state === 'draft') this.renderDraft(game);
      else if (this.current === 'draft') this.show(null);
    },

    /* ================= PAUSE / MENU TRONG TRẬN ================= */
    // Pause: build hiện tại — bên trái Cộng hưởng đạt mốc mấy (kèm hiệu ứng), bên phải các lá Core đang có (ô trống: ???)
    renderPause() {
      const g = this.app.game, me = g ? g.humanTeam : -1;
      const items = this.pauseItems.map(([k, l], i) => `<button class="${i === this.pauseSel ? 'sel' : ''}" data-act="${k}">${esc(l)}</button>`).join('');
      let build = '';
      if (g && me >= 0) {
        const mp = g.cores.seatOwner(g.me), owned = g.cores.coresOf(mp), n = Math.max(SFC_CONFIG.game.match.maxUpgrades, owned.length);
        const slots = Array.from({ length: n }, (_, i) => miniCard(owned[i]));
        build = `<div class="pause-build">
          <div class="pb-traits"><h4>${esc(_t('YOUR BUILD'))}</h4>${traitList(g, mp, true) || `<em>${esc(_t('No synergies yet'))}</em>`}</div>
          <div class="pb-cards">${slots.join('')}</div>
        </div>`;
      }
      this.el.pause.innerHTML = `
        <div class="pause-title">${esc(this.online ? _t('MENU') : _t('PAUSED'))}</div>
        ${this.online ? `<div class="pause-note">${esc(_t('Online matches keep running'))}</div>` : ''}
        ${build}
        <div class="pause-items row-items">${items}</div>`;
      SFC.CorePreview.scan(this.el.pause);
    },

    // đổi nút đang chọn mà không vẽ lại (giữ ảnh động của các lá Core)
    setPauseSel() {
      this.el.pause.querySelectorAll('.pause-items button').forEach((b, i) => b.classList.toggle('sel', i === this.pauseSel));
    },

    pauseInput(input) {
      // cần phải tay cầm: cuộn bảng build (chuột: con lăn, bảng có thanh cuộn)
      const ry = SFC.Pad ? SFC.Pad.rstickY : 0, box = ry && this.el.pause.querySelector('.pb-traits');
      if (box) box.scrollTop += ry * 5;
      const n = this.pauseItems.length;
      if (input.wasPressed('up') || input.wasPressed('left')) { this.pauseSel = (this.pauseSel + n - 1) % n; this.setPauseSel(); }
      if (input.wasPressed('down') || input.wasPressed('right')) { this.pauseSel = (this.pauseSel + 1) % n; this.setPauseSel(); }
      if (input.wasPressed('pause') || input.wasPressed('back')) return this.app.resume();
      if (input.wasPressed('confirm')) this.doAct(this.pauseItems[this.pauseSel][0]);
    },

    /* ================= END ================= */
    endItems() {
      if (!this.online) {
        const mp = this.app.game && this.app.game.opts.mainPath;
        // thẻ drill bấm LATER: mở lại ở INVENTORY (không có nút ở đây)
        // bản DEMO hết Area đá được: restart -> màn WISHLIST (app.startMainPath)
        return mp ? [['restart', SFC.MainPath.demoOver() ? _t('CONTINUE') : _t('NEXT MATCH')], ['menu', _t('LOBBY')]] : [['restart', _t('PLAY AGAIN')], ['menu', _t('MAIN MENU')]];
      }
      return SFC.Online.isOwner ? [['lobby', _t('BACK TO LOBBY')], ['leave', _t('LEAVE ROOM')]] : [['leave', _t('LEAVE ROOM')]];
    },

    renderEnd(game) {
      const h = game.humanTeam, me = game.teams[h], op = game.teams[1 - h];
      const res = me.score > op.score ? [_t('VICTORY!'), 'win'] : me.score < op.score ? [_t('DEFEAT...'), 'lose'] : [_t('DRAW'), 'draw'];
      // Main Path: Core của đối thủ mà bạn chưa mở khoá -> 🔒 + cách mở (rê chuột xem)
      const lockOf = (t, id) => (game.opts.mainPath && t !== me && !SFC.Profile.coreUnlocked(id) ? SFC.MainPath.unlockHint(id) : '');
      // build của từng cầu thủ: người chơi = danh sách Core có tên; đồng đội / đối thủ = hàng chip
      const build = (t) => t.players.map((q) => {
        const ids = game.cores.coresOf(q), mine = q === game.controlled;
        const item = (id) => {
          const lk = lockOf(t, id);
          return mine
            ? `<div class="b-item" ${lk ? `title="🔒 ${esc(lk)}"` : ''}>${coreChip(id)} ${esc(CORES().list[id].name)}${lk ? PX().ui('lock', 'sm lk') : ''}</div>`
            : `<span class="b-chip" ${lk ? `title="🔒 ${esc(lk)}"` : ''}>${coreChip(id)}${lk ? PX().ui('lock', 'sm lk') : ''}</span>`;
        };
        const list = ids.length ? ids.map(item).join('') : `<em>${esc(_t('No cores'))}</em>`;
        return `<div class="b-player ${mine ? 'me' : ''}"><div class="bp-head"><b>${esc(q.name)}</b>${buildLabel(game, q)}</div>${mine ? list : `<div class="bp-chips">${list}</div>`}</div>`;
      }).join('');
      const note = this.online && !SFC.Online.isOwner ? _t('Waiting for the host to return to the lobby...') : _t('Try a different build next time?');
      // sân luôn vẽ đội 0 bên trái -> tỉ số giữ đúng thứ tự trái / phải
      const t0 = game.teams[0], t1 = game.teams[1];
      this.el.end.innerHTML = `
        <div class="end-title ${res[1]}">${esc(res[0])}</div>
        <div class="end-score"><span style="color:${t0.cfg.kit.shirt}">${esc(t0.cfg.name)}</span> <b>${t0.score} - ${t1.score}</b> <span style="color:${t1.cfg.kit.shirt}">${esc(t1.cfg.name)}</span></div>
        <div class="builds">
          <div class="build"><h4>${esc(_t('YOUR BUILD'))}</h4>${build(me)}</div>
          ${game.reward ? this.rewardPanel(game.reward) : ''}
          <div class="build"><h4>${esc(_t('OPPONENT BUILD'))}</h4>${build(op)}</div>
        </div>
        <div class="end-foot">${this.momentPanel(game)}
          <div class="end-act"><div class="end-note">${esc(note)}</div><div class="pause-items row-items" id="end-items"></div></div>
        </div>`;
      this.el.end.classList.toggle('has-moment', !!(game.moments && game.moments.length));
      this.renderEndItems();
      SFC.CorePreview.scan(this.el.end);
      // Main Path: Core / hộp mới -> màn mở thẻ sau khi thưởng chạy xong (Enter trước đó thì mở ngay)
      const unlocks = game.reward && game.reward.path ? game.reward.path.rewards.filter((x) => x.kind !== 'gold') : [];
      this.pendingReveal = unlocks.length ? unlocks : null;
      this.drillAfter = null;   // vừa lên level (chơi đơn): { earned, from, to } -> màn LEVEL UP của DRILL sau thưởng + sau màn mở thẻ (autoDrill)
      if (game.reward) this.playReward(game.reward);
    },

    openReveal() {
      const list = this.pendingReveal;
      this.pendingReveal = null;
      clearTimeout(this.revealTimer);
      if (list) SFC.Reveal.open(list, () => { this.renderEndItems(); this.autoDrill(); });
    },

    // màn LEVEL UP (thẻ drill vừa nhận: OPEN NOW / LATER) tự mở sau khi thưởng chạy xong;
    // có màn mở thẻ (Main Path) thì đợi nó đóng rồi mới mở (không chồng 2 lớp phủ)
    autoDrill() {
      const notice = this.drillAfter;
      if (!notice || this.pendingReveal || SFC.Reveal.active) return;
      this.drillAfter = null;
      setTimeout(() => {
        const g = this.app.game;
        if (this.current === 'end' && g && g.state === 'ended' && !SFC.Drill.active && !SFC.Reveal.active) this.openDrill(notice);
      }, 400);
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
        return `${u ? _t('Ultimate ×{n}', { n: u }) : ''}${u && hit ? ' · ' : ''}${hit ? _t('Combo {n} HIT', { n: hit }) : ''}` || '—';
      };
      const me = game.humanTeam;
      // chữ dựng lúc hiện (online: khoảnh khắc combo đến từ sự kiện của host)
      const text = best.kind === 'ult' ? _t('ULTIMATE · {core}', { core: c.name.toUpperCase() }) : _t('{n} HIT!', { n: best.n });
      return `<div class="moment" style="--c:${ARCH(c.tags[0]).color}">
        ${SFC.CorePreview.html(best.id, 150, 64)}
        <div class="mo-info">
          <h4>${esc(_t('MOMENT OF THE MATCH'))}</h4>
          <div class="mo-name">${PX().core(best.id)} ${esc(text)}</div>
          <div class="mo-sub"><span style="color:${tm.cfg.kit.shirt}">${esc(tm.cfg.short)}</span>${best.player ? ' · ' + esc(best.player) : ''} · ${esc(c.name)}</div>
          <div class="mo-sub">${esc(_t('You: {stats}', { stats: count(me) }))} <span class="sep">·</span> ${esc(_t('Opponent: {stats}', { stats: count(1 - me) }))}</div>
        </div>
      </div>`;
    },

    renderEndItems() {
      const el = document.getElementById('end-items');
      this.endSel = Math.min(this.endSel, this.endItems().length - 1);
      if (el) el.innerHTML = this.endItems().map(([k, l], i) => `<button class="${i === this.endSel ? 'sel' : ''}" data-act="${k}">${esc(l)}</button>`).join('');
      this.showEndItems();
    },

    // màn kết quả cao hơn khung 360 (hiếm): cuộn để nút đang chọn luôn nhìn thấy.
    // Chỉ cuộn #end — scrollIntoView cuộn cả #stage / body làm lệch khung game
    showEndItems() {
      const box = this.el.end, b = box.querySelector('#end-items .sel');
      if (!b) return;
      let top = 0;
      for (let n = b; n && n !== box; n = n.offsetParent) top += n.offsetTop;
      if (top < box.scrollTop) box.scrollTop = top - 2;
      else if (top + b.offsetHeight > box.scrollTop + box.clientHeight) box.scrollTop = top + b.offsetHeight - box.clientHeight + 2;
    },

    /* ---------- thưởng sau trận: các dòng hiện lần lượt, gold đếm lên, thanh XP chạy qua từng level ---------- */
    rewardPanel(r) {
      const lines = r.lines.map((l, i) => `<div class="rw-line" data-rw="${i}"><span>${esc(l.label)}</span>${
        l.mult || l.note ? '' : `<b class="x">+${l.xp} XP</b><b class="g"><i class="coin"></i>+${l.gold}</b>`}</div>`).join('');
      return `<div class="build reward">
        ${r.path ? this.pathResult(r.path) : `<h4>${esc(_t('REWARDS'))}</h4>`}
        <div class="rw-lines">${lines}</div>
        <div class="rw-total"><span class="gold"><i class="coin"></i><b id="rw-gold">+0</b></span><b id="rw-xp" class="x">+0 XP</b></div>
        <div class="lvrow"><span class="lv" id="rw-lv">${esc(_t('LV {n}', { n: r.before.level }))}</span><div class="xpbar"><i id="rw-bar"></i></div></div>
        <div class="rw-up" id="rw-up"></div>
      </div>`;
    },

    // Main Path sau trận: Elo +/- (đếm lên ở playReward), thanh tiến độ tới Area kế + thông báo lên / rớt Area
    pathResult(p) {
      const MP = SFC.MainPath, a = p.after, A = MP.area(a.area), next = MP.area(a.area + 1);
      const pct = (elo) => Math.round(Math.max(0, Math.min(1, MP.frac(elo, a.area))) * 100);
      const msg = p.event === 'up'
        ? (MP.demoLocked(a.area) ? (SFC_CONFIG.demo.steamUrl ? _t('DEMO COMPLETE · WISHLIST ON STEAM!') : _t('DEMO COMPLETE · COMING SOON TO STEAM!'))
          : p.first ? _t('NEW AREA UNLOCKED: {area}', { area: A.name }) : _t('BACK TO {area}', { area: A.name }))
        : p.event === 'down' ? _t('DROPPED TO {area}', { area: A.name })
        : next ? _t('{n} ELO to {area}', { n: next.elo - a.elo, area: MP.demoLocked(a.area + 1) || a.area + 1 > MP.state.best ? '???' : next.name }) : _t('TOP AREA');
      const sign = p.delta > 0 ? '+' : '';
      // thanh: vị trí cũ (mờ) -> vị trí mới; đổi Area thì chỉ vẽ vị trí mới
      const from = p.before.area === a.area ? pct(p.before.elo) : pct(a.elo);
      return `<div class="rw-path ${p.event === 'up' && p.first ? 'big' : ''} ${p.delta < 0 ? 'bad' : ''}" style="--ac:${A.color}">
        <div class="rp-div">${PX().area(A.id, 'sm')} ${esc(A.name)}</div>
        <div class="rp-row"><b class="rp-elo" data-elo-from="${p.before.elo}" data-elo-to="${a.elo}">${p.before.elo}</b><span class="rp-delta">${sign}${p.delta} ${esc(_t('ELO'))}</span></div>
        <div class="rp-bar"><i class="was" style="width:${from}%"></i><i class="now" style="width:${pct(a.elo)}%"></i></div>
        <div class="rp-msg">${esc(msg)}</div>
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
        const elo = document.querySelector('[data-elo-to]');
        if (elo) elo.textContent = Math.round(+elo.dataset.eloFrom + (+elo.dataset.eloTo - +elo.dataset.eloFrom) * e);
        xp.textContent = '+' + Math.round(r.xp * e) + ' XP';
        const cur = from + (to - from) * e;
        const level = Math.min(Math.floor(cur), r.after.level);
        bar.style.width = (need(level) === Infinity ? 100 : (cur - level) * 100) + '%';
        if (level > shownLv) {
          shownLv = level;
          lv.textContent = _t('LV {n}', { n: level });
          up.innerHTML = `<b class="lvup">${esc(_t('LEVEL UP! LV {n}', { n: level }))}</b><span class="gold"><i class="coin"></i>+${SFC_CONFIG.progression.levelUpGold}</span>`;
          up.classList.remove('pop'); void up.offsetWidth; up.classList.add('pop');
          SFC.Audio.upgrade();
        }
        if (k >= 1) {
          if (this.pendingReveal && !this.revealTimer) this.revealTimer = setTimeout(() => { this.revealTimer = null; this.openReveal(); }, 450);
          if (!up.dataset.done) {
            up.dataset.done = 1;
            if (r.eligible.length) up.insertAdjacentHTML('beforeend', `<div class="rw-new">${esc(_t('Unlocked: {list}', { list: r.eligible.join(', ') }))}</div>`);
            // lên level: thẻ drill vừa nhận (chỉ khi không có dòng Unlocked, giữ khung thưởng tối đa 2 dòng)
            const gained = r.levelUps.length * SFC_CONFIG.progression.attrs.drills.perLevel;
            const where = this.online ? ' · ' + _t('open in INVENTORY') : '';
            if (!r.eligible.length && gained > 0) up.insertAdjacentHTML('beforeend', `<div class="rw-new pts">${esc(_tn('★ +{n} DRILL CARD', '★ +{n} DRILL CARDS', gained) + where)}</div>`);
            // chạm trần level theo Main Path: XP vẫn tích, lên hạng là lên level
            else if (!r.eligible.length && r.capped) up.insertAdjacentHTML('beforeend', `<div class="rw-new">${esc(_t('LV CAP · climb the Main Path to level up (XP is saved)'))}</div>`);
            this.showEndItems();   // dòng thưởng vừa thêm có thể đẩy nút xuống
            // chơi đơn: vừa lên level -> tự mở màn LEVEL UP của DRILL (online tự xử lý phím -> chỉ tích thẻ, mở ở INVENTORY)
            this.drillAfter = !this.online && gained > 0 ? { earned: gained, from: r.before.level, to: r.after.level } : null;
            this.autoDrill();
          }
          return;
        }
        this.rwRaf = requestAnimationFrame(step);
      };
      this.rwRaf = requestAnimationFrame(step);
    },

    endInput(input) {
      // còn thẻ chưa mở: Enter mở luôn thay vì sang trận kế
      if (this.pendingReveal) { if (input.wasPressed('confirm')) this.openReveal(); return; }
      const n = this.endItems().length;
      if (input.wasPressed('left') || input.wasPressed('up')) { this.endSel = (this.endSel + n - 1) % n; this.renderEndItems(); }
      if (input.wasPressed('right') || input.wasPressed('down')) { this.endSel = (this.endSel + 1) % n; this.renderEndItems(); }
      if (input.wasPressed('confirm')) this.doAct(this.endItems()[this.endSel][0]);
    },

    doAct(act) {
      SFC.Audio.menu();
      if (act === 'resume') this.app.resume();
      if (act === 'restart') this.app.restart();
      if (act === 'forfeit') this.app.forfeit();
      // trận Main Path xong -> về trang Main Path
      if (act === 'menu') this.app.toMenu(this.app.game && this.app.game.opts.mainPath ? 'party' : 'home');
      if (act === 'leave') SFC.Online.leave();
      if (act === 'lobby') SFC.Online.backToLobby();
      if (act === 'reroll') this.app.rerollCore();
      if (act === 'skiptut') SFC.Tutorial.skip();
    },

    // màn DRILL trên màn kết quả; notice = { earned, from, to } -> bắt đầu ở màn LEVEL UP (OPEN NOW / LATER).
    // Đóng (mở hết / LATER) -> vẽ lại nút kết quả
    openDrill(notice) {
      SFC.Drill.open(() => this.renderEndItems(), { notice });
    },

    /* ================= HUD ================= */
    updateHud(game) {
      if (!game) return;
      const c = this.hudCache;
      const t0 = game.teams[0], t1 = game.teams[1];
      const training = !!(game.opts && game.opts.training);
      // trận mơ PROLOGUE: có tỉ số nhưng chưa có đồng hồ tới bài cuối
      const dream = !!(game.opts && game.opts.tutorial) && !game.clockOn;
      const time = game.golden ? _t('GOLDEN') : SFC.U.fmtTime(game.remaining);
      const phase = game.golden ? _t('GOLDEN GOAL') : game.finalPush ? _t('FINAL PUSH x{n}', { n: SFC_CONFIG.game.match.finalPushGoalValue }) : '';
      const cores = game.players.map((p) => game.cores.coresOf(p).join()).join('|');
      // lượt chọn Core: đang chờ bàn thắng / còn bao lâu tới lượt kế
      const pend = game.draftPending(), next = game.draftNextIn();
      const coreLine = pend > 0 ? `<div class="hud-core on">${esc(_t('✦ CORE +{n} · waiting for a goal', { n: pend }))}</div>`
        : next != null ? `<div class="hud-core">${esc(_t('✦ Next Core in {time}', { time: SFC.U.fmtTime(next) }))}</div>` : '';
      // Main Path: Area + Elo lúc vào trận
      const mp = game.opts && game.opts.mainPath;
      const pathLine = game.opts && game.opts.tutorial ? `<div class="hud-path dream">${esc(_t('PROLOGUE · THE DREAM'))}</div>`
        : !mp ? '' : `<div class="hud-path">${esc(SFC.MainPath.area(mp.area).name)} · ${mp.elo} ${esc(_t('ELO'))}</div>`;
      const key = [t0.score, t1.score, dream ? 'dream' : time, phase, cores, coreLine, pathLine].join('#');
      if (c.key !== key) {
        c.key = key;
        // nhãn người chơi theo slot: P1..P4 (co-op: 2 nhãn cùng 1 đội); người ở máy này tô vàng, cùng đội xanh, đối thủ đỏ
        const tag = (t) => game.seats.map((s, i) => (s.team !== t || s.gone ? ''
          : ` <small class="${i === game.me ? 'me' : t === game.humanTeam ? 'ally' : 'op'}">P${i + 1}</small>`)).join('');
        this.el.hud.innerHTML = `
          <div class="hud-team l" style="--c:${t0.cfg.kit.shirt}">
            <div class="hud-name">${esc(t0.cfg.short)}${tag(0)}</div>
            ${this.hudBuild(game, 0)}
            ${this.ultMeter(game, 0)}
          </div>
          <div class="hud-mid">${pathLine}${training ? `<div class="hud-time">${esc(_t('TRAINING'))}</div>` : `
            <div class="hud-score"><b style="color:${t0.cfg.kit.shirt}">${t0.score}</b><span>-</span><b style="color:${t1.cfg.kit.shirt}">${t1.score}</b></div>
            <div class="hud-time ${game.finalPush || game.golden ? 'hot' : ''}">${esc(dream ? _t('DREAM') : time)}</div>
            ${phase ? `<div class="hud-phase">${phase}</div>` : ''}`}
            ${coreLine}
          </div>
          <div class="hud-team r" style="--c:${t1.cfg.kit.shirt}">
            <div class="hud-name">${tag(1)} ${esc(t1.cfg.short)}</div>
            ${this.hudBuild(game, 1)}
            ${this.ultMeter(game, 1)}
          </div>`;
        c.ultBars = [0, 1].map((t) => this.el.hud.querySelector(`.hud-ult[data-t="${t}"]`));
        c.ultVals = [-1, -1];
      }
      // năng lượng Tuyệt kỹ 2 đội (cập nhật mỗi khung)
      for (let t = 0; t < 2; t++) {
        const el = c.ultBars && c.ultBars[t], v = Math.round(game.cores.teamUlt(t) * 100);
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

    // build trên HUD: đội của người chơi = Cộng hưởng kiểu TFT của cầu thủ mình + chip Cộng hưởng của đồng đội;
    // đội kia = mỗi cầu thủ 1 dòng (tên + chip Cộng hưởng)
    hudBuild(game, t) {
      const C = game.cores, own = t === game.humanTeam ? game.controlled : null;
      if (own) return `<div class="hud-traits tft">${traitList(game, own)}</div>${this.mateChips(game, t, own, true)}`;
      return `<div class="hud-mates">${game.teams[t].players.map((q) => `<div class="hud-pl"><em>${esc(q.name)}</em>${traitChips(game, q) || '<i>—</i>'}</div>`).join('')}</div>`;
    },
    // Cộng hưởng của đồng đội (không phải cầu thủ mình điều khiển)
    mateChips(game, t, own, block = false) {
      const mates = game.teams[t].players.filter((q) => q !== own);
      const html = mates.map((q) => traitChips(game, q)).filter(Boolean).join(' ');
      if (!html) return '';
      // co-op: đồng đội là người chơi khác -> hiện tên
      const named = mates.length === 1 && mates[0].isControlled, name = named && esc(mates[0].name);
      return block ? `<div class="hud-mates"><div class="hud-pl"><em>${named ? name : esc(_t('MATE'))}</em>${html}</div></div>` : ` <span class="sep">+</span> <span>${named ? name : esc(_t('Mate'))}:</span> ${html}`;
    },

    // thanh năng lượng Tuyệt kỹ nhỏ trên HUD của mỗi đội (icon Tuyệt kỹ nếu đã có)
    // (chỉ khi đội đã có Tuyệt kỹ)
    ultMeter(game, t) {
      const id = game.cores.ultOf(t), c = id && CORES().list[id];
      if (!c) return '';
      return `<div class="hud-ult has" data-t="${t}" title="${esc(_t('{core}: Ultimate energy', { core: c.name }))}"><b>${PX().core(id, 'sm')}</b><i></i><em>0%</em></div>`;
    },

    /* ================= THANH KỸ NĂNG (giữa đáy, kiểu LoL) ================= */
    updateBar(game) {
      const el = this.el.abar, p = game.controlled;
      el.classList.toggle('hidden', !p || this.current === 'menu');
      if (!p) return;
      const c = this.hudCache.bar || (this.hudCache.bar = {});
      const owned = game.cores.coresOf(p);
      // đổi bàn phím <-> tay cầm: vẽ lại nhãn phím trên thanh kỹ năng
      const key = p.id + '|' + owned.join() + '|' + SFC.Input.device + SFC.Pad.style;
      if (c.key !== key) {
        c.key = key;
        const kit = game.teams[p.team].cfg.kit;
        const ult = game.cores.ultOf(p), names = SLOT_NAMES();
        const nItems = Math.max(SFC_CONFIG.game.match.maxUpgrades, owned.length);
        const items = [];
        for (let i = 0; i < nItems; i++) items.push(owned[i] ? coreChip(owned[i]) : '<span class="chip empty"></span>');
        el.style.setProperty('--c', kit.shirt);
        el.innerHTML = `
          <div class="ab-por"><canvas width="22" height="22"></canvas><div class="ab-name">${esc(p.name)}</div>${game.lockedPlayer(p.team) ? '' : `<kbd>${esc(keyLabel('switch'))}</kbd>`}</div>
          <div class="ab-mid">
            <div class="ab-res"></div>
            <div class="ab-slots">${SLOTS.map((s) => `
              <div class="ab-slot" data-k="${s.k}" title="${esc(names[s.k])}">
                <i>${PX().ui(s.icon)}</i><div class="sw"></div><b></b><kbd>${esc(keyLabel(s.action))}</kbd>
              </div>`).join('')}${ult ? `
              <div class="ab-slot ult" data-k="ult" title="${esc(_t('ULTIMATE: {core}. Charge it by scoring, conceding, stealing the ball and landing punches', { core: CORES().list[ult].name }))}">
                <div class="ult-fill"></div><i>${PX().core(ult)}</i><b class="ult-pct"></b><kbd>${esc(keyLabel('ultimate'))}</kbd>
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

      // ô ra đòn chỉ mờ khi chính mình cầm bóng (đồng đội cầm bóng vẫn đánh được)
      const teamHas = game.ball.owner === p;
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
      const pips = (res, n, max) => `<span class="res" style="--c:${res === 'guard' ? '#c7ccd6' : res === 'rhythm' ? '#ffd23f' : res === 'rage' ? '#ff3d5a' : '#3ff6ff'}">${PX().res(res, 'sm')}${'●'.repeat(n)}<i>${'○'.repeat(Math.max(0, max - n))}</i></span>`;
      if (game.cores.resActive(p, 'momentum')) parts.push(pips('momentum', p.res.momentum, game.cores.resMax(p, 'momentum')));
      if (game.cores.resActive(p, 'rhythm')) parts.push(pips('rhythm', game.rhythm[t], R.rhythm.max));
      if (game.cores.resActive(p, 'rage')) parts.push(pips('rage', p.res.rage, R.rage.max));
      if (p.res.guard > 0 || game.cores.resActive(p, 'guard')) parts.push(pips('guard', p.res.guard, R.guard.max));
      const html = parts.join('');
      if (html !== c.lastRes) { c.lastRes = html; c.res.innerHTML = html; c.res.classList.toggle('hidden', !html); }
      if (c.ult) {
        const v = Math.round(game.cores.ultE(p) * 100);
        if (v !== c.lastUlt) {
          const prev = c.lastUlt;
          c.lastUlt = v;
          c.ult.style.setProperty('--u', (v / 100).toFixed(2));
          c.ult.classList.toggle('ready', v >= 100);
          c.ult.classList.toggle('full', v >= 100);
          c.ult.querySelector('.ult-pct').textContent = v >= 100 ? _t('FULL') : v + '%';   // sẵn sàng: viền vàng + rung
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
          this.banner(e.value > 1 ? _t('GOAL x{n}!', { n: e.value }) : _t('GOAL!'), e.own ? _t('Own goal!') : `${e.scorer} · ${t.cfg.name}`, t.cfg.kit.shirt, 2.2);
        }
        // banner của trận (match.js, chữ đánh dấu SFC.N_): dịch lúc hiện — online thì sự kiện đến từ máy host
        if (e.type === 'banner') this.banner(_t(e.text, e.vars), e.sub && _t(e.sub, e.vars), e.color, 2.2);
        // khoảnh khắc của trận (màn kết quả)
        if (e.type === 'ultimate') (game.moments || (game.moments = [])).push({ kind: 'ult', team: e.team, id: e.id, player: e.player, text: 'ULTIMATE · ' + CORES().list[e.id].name.toUpperCase(), score: 60 });
        if (e.type === 'moment') (game.moments || (game.moments = [])).push({ kind: 'combo', team: e.team, id: e.id, text: e.text, n: parseInt(e.text, 10) || 0, score: e.score });
        if (e.type === 'draft') { this.draftSel = 0; this.renderDraft(game); if (!overlay) this.show('draft'); }
        if (e.type === 'draftWait' && game.draft) this.renderDraft(game);
        if (e.type === 'corePicked') {
          if (this.current === 'draft') this.show(null);
          // đội mình: từng người (bạn + đồng đội); đội kia: gộp 1 dòng các lá vừa lấy
          const mine = e.picks.filter((pk) => pk.team === game.humanTeam), other = e.picks.filter((pk) => pk.team !== game.humanTeam);
          for (const pk of mine) {
            const c = CORES().list[pk.id], t = game.teams[pk.team], q = game.players.find((x) => x.id === pk.pid);
            this.toast(`<span class="dot" style="background:${t.cfg.kit.shirt}"></span>${_t('{player} gets {core}', { player: esc(q ? q.name : t.cfg.short), core: `${coreChip(pk.id)} <b>${esc(c.name)}</b>` })}`);
          }
          if (other.length) {
            const t = game.teams[other[0].team];
            this.toast(`<span class="dot" style="background:${t.cfg.kit.shirt}"></span>${_t('{player} gets {core}', { player: esc(t.cfg.short), core: other.map((pk) => coreChip(pk.id)).join('') })}`);
          }
        }
        if (e.type === 'end' && game.opts.tutorial) { SFC.Tutorial.onEnd(game); continue; }
        if (e.type === 'end') {
          // thưởng XP / gold: tính 1 lần cho người chơi tại máy này (chơi đơn + online)
          if (!game.reward && game.humanTeam >= 0 && SFC.Profile.data) game.reward = SFC.Profile.awardMatch(game);
          if (game.opts.mainPath && game.opts.mainPath.party) SFC.Social.afterMatch();   // người bạn trong phòng nhắn "gg! again?"
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
        if (this.pendingReveal && btn.closest('#end')) return this.openReveal();   // còn thẻ chưa mở
        this.doAct(btn.dataset.act);
      });
    },
  };

  SFC.UI = UI;
})();
