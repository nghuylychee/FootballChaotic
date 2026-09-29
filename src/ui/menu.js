/* Menu — các màn ngoài trận: Trang chủ (thẻ hồ sơ) · Chơi đơn · Online (tạo / vào phòng / phòng chờ) ·
 *        Nhân vật (tủ đồ, đổi tên) · Shop (trang phục + mở khoá Core) · Cài đặt (Luyện tập, Điều khiển) · Đặt tên · Hướng dẫn
 * Mỗi trang khai báo danh sách mục (items): nút (btn) hoặc bộ chọn ←→ (pick).
 * ↑↓ chọn mục · ←→ đổi giá trị · Enter xác nhận · Esc / Backspace quay lại
 */
window.SFC = window.SFC || {};

(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const TEAMS = () => SFC_CONFIG.teams;
  const STAT_LABELS = { speed: 'SPEED', power: 'POWER', pass: 'PASSING', tackle: 'PHYSICAL', dribble: 'DRIBBLE', accuracy: 'ACCURACY' };
  const Online = () => SFC.Online;
  const ROLE_LABELS = { DEF: 'DEFENDER', FWD: 'FORWARD' }; // vị trí xuất phát
  const PF = () => SFC.Profile;
  const PROG = () => SFC_CONFIG.progression;
  const MPATH = () => SFC.MainPath;
  // Shop (hộp gacha) · mở hộp · túi đồ nằm ở ui/gacha.js
  const G = () => SFC.Gacha;
  const coin = (n) => G().coin(n);
  const xpBar = (d) => G().xpBar(d);
  const CV = () => SFC.ControlsView;   // Settings > Controls (ui/controls.js)
  const ATTRS = () => PROG().attrs;     // chỉ số character (trang STATS)
  // tên chỉ số trong trận (Player.stats) cho khung chi tiết trang STATS
  const KEY_LABELS = { speed: 'run speed', stamina: 'stamina refill', power: 'shot power', accuracy: 'shot aim', pass: 'passing',
    dribble: 'dribbling', tackle: 'steal / intercept', knock: 'knockback', keeper: 'save chance' };

  function helpTable(list) {
    return list.map(([k, v]) => `<div class="hk"><kbd>${esc(k)}</kbd><span>${esc(v)}</span></div>`).join('');
  }

  function teamCard(id, label, extra = '') {
    if (!id) return `<div class="team-card empty"><div class="tc-label">${esc(label)}</div><div class="tc-wait">Waiting for player...</div></div>`;
    const team = TEAMS().list[id], kit = team.kit;
    const stats = Object.keys(STAT_LABELS).map((k) => {
      const v = team.stats[k] || 1;
      const w = Math.round(Math.max(0.1, Math.min(1, (v - 0.7) / 0.6)) * 100);
      return `<div class="stat"><span>${STAT_LABELS[k]}</span><i><b style="width:${w}%"></b></i></div>`;
    }).join('');
    return `<div class="team-card" style="--shirt:${kit.shirt};--accent:${kit.accent}">
      ${label ? `<div class="tc-label">${esc(label)}</div>` : ''}
      <div class="tc-head"><span class="kit"><i style="background:${kit.shirt}"></i><i style="background:${kit.accent}"></i><i style="background:${kit.shorts}"></i></span>
        <div><div class="tc-name">${esc(team.name)}</div><div class="tc-tag">${esc(team.tagline)}</div></div></div>
      <div class="tc-desc">${esc(team.desc)}</div>
      <div class="stats">${stats}</div>${extra}
    </div>`;
  }

  const Menu = {
    page: 'home',
    sel: 0,
    selMemo: {},        // page -> mục đang chọn lúc rời trang
    msg: '',
    msgErr: false,
    code: '',
    tutPage: 0,
    nameBuf: '',
    nameBack: 'home',   // đặt tên xong quay về trang nào
    avatars: [],        // canvas character đang hiện (vẽ lại mỗi khung hình để có chuyển động)
    pend: {},           // trang STATS: số bước đang cộng thử của từng chỉ số

    init(app) {
      this.app = app;
      this.el = $('menu');
      this.bindMouse();
      this.render();
    },

    go(page, msg = '', err = false) {
      // nhớ mục đang chọn của từng trang: quay lại trang cũ (Esc, hết trận...) con trỏ nằm đúng mục vừa rời đi
      if (page !== this.page) {
        this.selMemo[this.page] = this.sel;
        this.sel = this.selMemo[page] || 0;
      }
      this.page = page;
      this.msg = msg;
      this.msgErr = err;
      if (page === 'join' && !msg) this.code = '';
      if (page === 'name') this.nameBuf = PF().data.name;
      if (page === 'path') this.pathView = MPATH().state.area;   // mở Main Path: xem Area đang đá
      if (page === 'attrs') this.pend = {};                        // trang STATS: các bước đang cộng thử (chưa xác nhận)
      this.setTextMode(page === 'join' || page === 'name' ? page : null);
      this.render();
    },

    setMsg(msg, err = false) { this.msg = msg; this.msgErr = err; this.render(); },

    options() {
      const order = TEAMS().order;
      return { order, opp: ['random'].concat(order), diffs: SFC_CONFIG.game.ai.difficultyOrder };
    },

    /* ---------------- danh sách mục theo trang ---------------- */
    items() {
      const app = this.app, s = app.sel, o = this.options();
      switch (this.page) {
        case 'home':
          return [
            { kind: 'btn', label: 'MAIN PATH', sub: this.pathSub(), act: () => this.go('path') },
            { kind: 'btn', label: 'ONLINE VERSUS', sub: '1 vs 1 · create a room', act: () => this.go('online') },
            { kind: 'btn', label: 'CHARACTER', sub: PF().pointsFree() > 0 ? `★ ${PF().pointsFree()} stat points to spend!` : 'Stats · inventory · rename', hot: PF().pointsFree() > 0, act: () => this.go('char') },
            { kind: 'btn', label: 'SHOP', sub: SFC_CONFIG.progression.coreGacha ? 'Gacha boxes · costumes & Cores' : 'Gacha boxes · costumes', act: () => { G().shopBack = 'home'; this.go('shop'); } },
            { kind: 'btn', label: 'SETTINGS', sub: 'Training · controls', act: () => this.go('settings') },
          ];
        case 'settings':
          return [
            { kind: 'btn', label: 'TRAINING', sub: 'No clock · pick team sizes', act: () => this.go('training') },
            { kind: 'btn', label: 'CONTROLS', sub: 'Keyboard & controller layout', act: () => { CV().open(); this.go('controls'); } },
          ];
        case 'name':
          return [{ kind: 'btn', label: 'CONFIRM', main: true, act: () => this.submitName() }];
        case 'char': {
          const d = PF().data, look = d.look, P = PROG();
          const nItems = Object.values(d.items).reduce((a, b) => a + b, 0) + Object.values(d.cores).reduce((a, b) => a + b, 0);
          const free = PF().pointsFree();
          return [
            { kind: 'btn', label: 'STATS', sub: `OVR ${PF().ovr()}${free > 0 ? ` · ${free} pts free` : ''}`, hot: free > 0, act: () => this.go('attrs') },
            { kind: 'btn', label: 'RENAME', sub: d.name, act: () => { this.nameBack = 'char'; this.go('name'); } },
            { kind: 'pick', label: 'SKIN COLOR', swatch: SFC_CONFIG.teams.skins[look.skin], change: (dd) => PF().setColor('skin', dd) },
            { kind: 'pick', label: 'HAIR COLOR', swatch: P.hairColors[look.hairColor], change: (dd) => PF().setColor('hairColor', dd) },
            { kind: 'btn', label: 'INVENTORY', sub: `${nItems} items · equip · dismantle`, act: () => { G().invBack = 'char'; this.go('inv'); } },
          ];
        }
        case 'attrs': {
          // STATS: 1 dòng mỗi chỉ số (←→ cộng / bớt bước đang thử), CONFIRM, RESPEC
          const A = ATTRS(), pf = PF(), pend = this.pend;
          const nPend = A.order.reduce((a, id) => a + (pend[id] || 0), 0);
          const list = A.order.map((id) => ({
            kind: 'pick', label: A.list[id].label, attr: id, bar: this.attrBar(id),
            change: (dd) => this.changeAttr(id, dd), enter: () => this.commitAttrs(),
          }));
          list.push({ kind: 'btn', label: 'CONFIRM', main: true, disabled: !nPend,
            sub: nPend ? `+${nPend} step${nPend > 1 ? 's' : ''} · ${pf.pointsFree() - pf.pointsFree(pend)} pts` : 'Add points with ←→', act: () => this.commitAttrs() });
          const spent = pf.spentPoints(), cost = pf.respecCost(), poor = pf.data.gold < cost;
          list.push({ kind: 'btn', label: 'RESPEC', disabled: !spent || poor,
            sub: !spent ? 'Nothing spent yet' : `Refund ${spent} pts · ${cost} gold${poor ? ' (not enough)' : ''}`, act: () => this.respecAttrs() });
          return list;
        }
        case 'path': {
          // Main Path: không chọn đối thủ / độ khó — trận kế tiếp do Area + hạng quyết định
          const MP = MPATH(), st = MP.state, n = MP.areas().length, v = this.pathView;
          const boss = TEAMS().list[MP.area(st.area).boss];
          const battle = MP.isPromo()
            ? { label: MP.isFinal() ? 'CHAMPIONSHIP FINAL' : 'PROMOTION MATCH', sub: `👑 vs ${boss.name}` }
            : { label: 'BATTLE', sub: `${MP.divName(st.area, st.div)} · ${st.stars}/${MP.need(st.area, st.div)} ★` };
          return [
            { kind: 'btn', label: battle.label, sub: battle.sub, main: true, act: () => app.startMainPath() },
            { kind: 'pick', label: 'POSITION', value: this.ctrlLabel(null, s.ctrl), change: (d) => this.changeCtrl(d) },
            { kind: 'pick', label: 'VIEW AREA', value: `${v + 1}/${n} ${MP.area(v).name}`, change: (d) => { this.pathView = wrap(v + d, n); } },
          ];
        }
        case 'training': {
          // luyện tập: số người đội bạn (1 / 2) · đối thủ (0 / 2). Đội / đối thủ / độ khó / điều khiển dùng chung với Chơi đơn
          const t = app.train, opp = o.opp[s.opp];
          const list = [
            { kind: 'pick', label: 'YOUR TEAM', value: TEAMS().list[o.order[s.team]].name, change: (d) => { s.team = wrap(s.team + d, o.order.length); } },
            { kind: 'pick', label: 'YOUR PLAYERS', value: t.mine + (t.mine === 1 ? ' PLAYER' : ' PLAYERS'), change: () => { t.mine = t.mine === 1 ? 2 : 1; } },
          ];
          if (t.mine === 2) list.push({ kind: 'pick', label: 'POSITION', value: this.ctrlLabel(o.order[s.team], s.ctrl), change: (d) => this.changeCtrl(d) });
          list.push({ kind: 'pick', label: 'OPPONENTS', value: t.opp ? t.opp + ' PLAYERS' : 'NONE', change: () => { t.opp = t.opp ? 0 : 2; } });
          if (t.opp) {
            list.push({ kind: 'pick', label: 'OPPONENT TEAM', value: opp === 'random' ? '??? RANDOM' : TEAMS().list[opp].name, change: (d) => { s.opp = wrap(s.opp + d, o.opp.length); } });
            list.push({ kind: 'pick', label: 'DIFFICULTY', value: SFC_CONFIG.game.ai.difficulty[o.diffs[s.diff]].label, change: (d) => { s.diff = wrap(s.diff + d, o.diffs.length); } });
          }
          list.push({ kind: 'btn', label: 'START', main: true, act: () => app.startTraining() });
          return list;
        }
        case 'online':
          return [
            { kind: 'btn', label: 'CREATE ROOM', sub: 'You host · the match runs on your machine', act: () => Online().createRoom() },
            { kind: 'btn', label: 'JOIN ROOM', sub: 'Enter a friend\'s room code', act: () => this.go('join') },
          ];
        case 'join':
          return [{ kind: 'btn', label: 'CONNECT', main: true, act: () => this.submitCode() }];
        case 'lobby': {
          const O = Online(), L = O.lobby;
          const mine = O.isHost ? L.host : L.guest;
          const list = [];
          if (mine) list.push({ kind: 'pick', label: 'YOUR TEAM', value: TEAMS().list[mine].name, change: (d) => O.setTeam(d) });
          if (O.isHost) list.push({ kind: 'btn', label: 'START', main: true, disabled: !L.guestIn, act: () => O.startMatch() });
          list.push({ kind: 'btn', label: 'LEAVE ROOM', act: () => O.leave() });
          return list;
        }
        default:
          return [];
      }
    },

    // chỉ đổi giữa các vị trí (1..roles) — ẩn lựa chọn CẢ ĐỘI (ctrl = 0): người chơi chỉ điều khiển character của mình
    changeCtrl(d) {
      const s = this.app.sel, n = SFC_CONFIG.game.roles.length;
      s.ctrl = wrap((s.ctrl || 1) - 1 + d, n) + 1;
    },

    // chỉ 1 cầu thủ: tên + vị trí xuất phát (CẢ ĐỘI: không còn chọn được trên menu)
    ctrlLabel(teamId, ctrl) {
      if (!ctrl) return 'WHOLE TEAM';
      // 1 CẦU THỦ: character của bạn đá vị trí này
      const role = SFC_CONFIG.game.roles[ctrl - 1];
      return `${PF().data.name || 'PLAYER'} · ${ROLE_LABELS[role] || role}`;
    },

    back() {
      if (Online().status === 'busy') return;
      if (this.page === 'name') { if (PF().hasName) this.go(this.nameBack); return; } // lần đầu: bắt buộc đặt tên
      if (G().pages.includes(this.page)) return G().back(this);
      if (this.page === 'attrs') {
        // còn bước chưa xác nhận: bấm 2 lần mới bỏ
        const n = Object.values(this.pend).reduce((a, b) => a + b, 0);
        if (n && !G().confirmed(this, 'discard', `Press ${SFC.Input.key('back', 'Esc')} again to discard ${n} pending step${n > 1 ? 's' : ''}`)) return;
        this.pend = {};
        return this.go('char');
      }
      if (['training', 'controls'].includes(this.page)) this.go('settings');
      else if (['path', 'online', 'tutorial', 'char', 'settings'].includes(this.page)) this.go('home');
      else if (this.page === 'join') this.go('online');
      else if (this.page === 'lobby') Online().leave();
    },

    /* ---------------- vẽ ---------------- */
    render() {
      if (!this.el) return;
      const items = this.items();
      if (this.sel >= items.length) this.sel = Math.max(0, items.length - 1);
      this.el.classList.toggle('tut', this.page === 'tutorial' || this.page === 'controls' || G().pages.includes(this.page));
      if (this.page === 'tutorial') { this.el.innerHTML = this.renderTutorial(); this.bindAvatars(); return; }
      if (this.page === 'controls') { this.el.innerHTML = CV().render(); this.bindAvatars(); return; }
      if (G().pages.includes(this.page)) { G().render(this); this.bindAvatars(); return; }
      const list = items.map((it, i) => this.renderItem(it, i)).join('');
      const titles = { path: 'MAIN PATH', training: 'TRAINING', settings: 'SETTINGS', online: 'ONLINE VERSUS', join: 'JOIN ROOM', lobby: 'LOBBY', name: 'YOUR NAME', char: 'CHARACTER', attrs: 'STATS' };
      const small = this.page !== 'home';
      const msg = this.msg ? `<div class="m-msg ${this.msgErr ? 'err' : ''}">${esc(this.msg)}</div>` : '';
      this.el.innerHTML = `
        <div class="m-left">
          <div class="logo ${small ? 'small' : ''}">
            <div class="l1">STREET</div><div class="l2">FOOTBALL</div><div class="l3">CHAOS</div>
            ${small ? '' : '<div class="tag">Football meets Arcade Combat</div>'}
          </div>
          ${titles[this.page] ? `<div class="m-title">${titles[this.page]}</div>` : ''}
          ${this.page === 'join' ? this.renderCode() : ''}
          ${this.page === 'name' ? this.renderNameInput() : ''}
          ${this.page === 'lobby' ? this.renderRoomCode() : ''}
          ${this.page === 'attrs' ? `<div class="st-head"><span>FREE POINTS</span><b>${PF().pointsFree(this.pend)}</b></div>` : ''}
          <div class="m-items">${list}</div>
          ${msg}
          <div class="m-hint">${this.hint()}</div>
        </div>
        <div class="m-right">${this.renderRight()}</div>`;
      this.bindAvatars();
    },

    renderItem(it, i) {
      const cls = ['mi', it.kind, i === this.sel ? 'sel' : '', it.main ? 'main' : '', it.disabled ? 'dis' : '', it.hot ? 'hot' : '', it.bar ? 'st-row' : ''].join(' ');
      // dòng chỉ số (trang STATS): rating + thanh bước + giá bước kế tiếp
      if (it.bar) {
        return `<div class="${cls}" data-i="${i}"><label>${esc(it.label)}</label>
          <div class="picker"><button data-i="${i}" data-d="-1">◀</button>${it.bar}<button data-i="${i}" data-d="1">▶</button></div></div>`;
      }
      if (it.kind === 'pick') {
        const val = it.swatch ? `<i class="swatch" style="background:${it.swatch}"></i>` : esc(it.value);
        return `<div class="${cls}" data-i="${i}"><label>${esc(it.label)}</label>
          <div class="picker"><button data-i="${i}" data-d="-1">◀</button><span>${val}</span><button data-i="${i}" data-d="1">▶</button></div></div>`;
      }
      return `<button class="${cls}" data-i="${i}"><span class="mi-label">${esc(it.label)}</span>${it.sub ? `<span class="mi-sub">${esc(it.sub)}</span>` : ''}</button>`;
    },

    hint() {
      const K = (a, kb) => SFC.Input.key(a, kb), ok = K('confirm', 'Enter'), back = K('back', 'Esc');
      if (this.page === 'home') return `↑↓ select · ${ok} · ${K('mute', 'M')} mute`;
      if (this.page === 'join') return `Type the code · Enter connect · ${back} back`;
      if (this.page === 'name') return PF().hasName ? `Type a name (A-Z, 0-9) · Enter confirm · ${back} back` : 'Type a name (A-Z, 0-9) · Enter confirm';
      if (this.page === 'attrs') return `←→ add / remove · ${ok} confirm · ${back} back`;
      if (this.page === 'lobby') return Online().isHost ? `←→ change team · ${ok} start · ${K('pause', 'Esc')} leave room` : `←→ change team · ${K('pause', 'Esc')} leave room`;
      return `↑↓ select · ←→ change · ${ok} · ${back} back`;
    },

    renderRight() {
      const s = this.app.sel, o = this.options();
      if (this.page === 'home') return this.profileCard();
      if (this.page === 'name') return `<div class="char-stage"><canvas class="avatar big" data-avatar="spin"></canvas><div class="char-name">${esc(this.nameBuf || '???')}</div></div>`;
      if (this.page === 'char') return this.charPanel();
      if (this.page === 'attrs') return this.attrsPanel();
      if (this.page === 'path') return this.pathPanel();
      if (this.page === 'training') return teamCard(o.order[s.team], '');
      if (this.page === 'lobby') {
        const O = Online(), L = O.lobby;
        const me = O.isHost ? 'P1 · HOST' : 'P2 · GUEST';
        const status = O.isHost
          ? (L.guestIn ? '<div class="lb-note ok">Ready. Press Enter to start</div>' : '<div class="lb-note">Send the room code to a friend to play</div>')
          : '<div class="lb-note">Waiting for the host to start...</div>';
        const who = (pf) => (pf ? ` · ${pf.name} LV${pf.level}` : '');
        return `<div class="lobby">
          ${teamCard(L.host, (O.isHost ? me + ' (YOU)' : 'P1 · HOST') + who(L.hostPf))}
          <div class="vs">VS</div>
          ${teamCard(L.guestIn ? L.guest : null, (O.isHost ? 'P2 · GUEST' : me + ' (YOU)') + who(L.guestPf))}
          ${status}
        </div>`;
      }
      return '';
    },

    renderCode() {
      const n = SFC_CONFIG.net.codeLength;
      let boxes = '';
      for (let i = 0; i < n; i++) {
        const ch = this.code[i] || '';
        boxes += `<span class="cb ${i === this.code.length ? 'cur' : ''}">${esc(ch)}</span>`;
      }
      return `<div class="code-in">${boxes}</div>`;
    },

    renderRoomCode() {
      const code = Online().code || '-----';
      return `<div class="room-code" title="Click to copy"><span class="rc-label">ROOM CODE</span><b data-copy="${esc(code)}">${esc(code)}</b></div>`;
    },

    renderTutorial() {
      const pages = SFC_CONFIG.tutorial.pages;
      const p = pages[this.tutPage];
      const tabs = pages.map((pg, i) => `<button class="tab ${i === this.tutPage ? 'sel' : ''}" data-tab="${i}">${esc(pg.title)}</button>`).join('');
      let body = '';
      if (p.lines) {
        body += p.lines.map((l) => (l[0] === '#' ? `<h4>${esc(l.slice(1).trim())}</h4>` : `<p>${esc(l)}</p>`)).join('');
      }
      if (p.type === 'controls') {
        const h = SFC.Input.helpSet();
        body += `<div class="help">
          <div class="help-col"><h4>ATTACK</h4>${helpTable(h.attack)}</div>
          <div class="help-col"><h4>DEFENSE</h4>${helpTable(h.defense)}<h4>TEAMMATE ON THE BALL</h4>${helpTable(h.teammateHasBall)}</div>
          <div class="help-col"><h4>SYSTEM</h4>${helpTable(h.system)}</div>
        </div>`;
      }
      if (p.type === 'cores') {
        const C = SFC_CONFIG.cores;
        const groups = Object.keys(C.archetypes).map((cat) => {
          const c = C.archetypes[cat];
          const list = Object.keys(C.list).filter((id) => C.list[id].tags[0] === cat)
            .map((id) => `<div class="core-row" title="${esc(C.list[id].desc)}"><span class="chip" style="--c:${c.color}">${C.list[id].icon}</span>${esc(C.list[id].name)}</div>`).join('');
          return `<div class="core-group"><h4 style="color:${c.color}">${esc(c.label)}</h4>${list}</div>`;
        }).join('');
        body += `<div class="core-grid">${groups}</div>`;
      }
      return `
        <div class="tut-head"><div class="m-title">HOW TO PLAY</div><div class="tabs">${tabs}</div></div>
        <div class="tut-body">${body}</div>
        <div class="m-hint">←→ change page · ${SFC.Input.key('back', 'Esc')} back</div>`;
    },

    /* ---------------- Main Path ---------------- */
    // dòng phụ của nút MAIN PATH ở trang chủ: hạng + sao hiện tại
    pathSub() {
      const MP = MPATH(), st = MP.state;
      if (MP.isPromo()) return `${MP.divName(st.area, st.div)} · ${MP.isFinal() ? 'FINAL' : 'PROMOTION'} ready!`;
      return `${MP.divName(st.area, st.div)} · ${st.stars}/${MP.need(st.area, st.div)} ★`;
    },

    // thẻ Area kiểu Clash Royale: ảnh sân, các hạng + sao, đội đối thủ + boss, chấm chuyển Area
    pathPanel() {
      const MP = MPATH(), st = MP.state, v = this.pathView, A = MP.area(v), n = MP.nDiv();
      const locked = v > st.area, cleared = v < st.area;
      const state = locked ? '🔒 LOCKED' : cleared ? '✔ CLEARED' : 'YOU ARE HERE';
      const stars = (on, need) => Array.from({ length: need }, (_, i) => `<i class="${i < on ? 'on' : ''}">★</i>`).join('');
      const divs = [];
      for (let d = 0; d < n; d++) {
        const cur = !locked && !cleared && d === st.div, done = cleared || (!locked && d < st.div);
        const need = MP.need(v, d);
        divs.push(`<div class="pd ${cur ? 'cur' : done ? 'done' : 'lock'}"><b>${MP.divLabel(d)}</b><span>${stars(done ? need : cur ? st.stars : 0, need)}</span></div>`);
      }
      const promoReady = !locked && !cleared && MP.isPromo();
      const last = v === MP.areas().length - 1;
      divs.push(`<div class="pd boss ${promoReady ? 'cur' : cleared ? 'done' : 'lock'}"><b>👑</b><span>${last ? 'FINAL' : 'PROMO'}</span></div>`);
      const teamChip = (id, boss) => {
        const t = TEAMS().list[id];
        return `<div class="po ${boss ? 'boss' : ''}" style="--shirt:${t.kit.shirt}" title="${esc(t.desc)}">
          <canvas class="avatar" data-team="${id}" data-idx="1"></canvas>
          <div><b>${esc(t.name)}</b><span>${boss ? 'BOSS' : esc(t.tagline)}</span></div></div>`;
      };
      // "con đường": 10 Area nối nhau, Area đang xem nổi lên, Area đang đá có cờ, chưa mở thì mờ
      const dots = MP.areas().map((a, i) => `<i class="${i === v ? 'sel' : ''} ${i > st.area ? 'lock' : i < st.area ? 'done' : 'cur'}" style="--c:${a.color}" data-parea="${i}" title="${esc(a.name)}">${a.icon}</i>`).join('');
      const titles = last && st.titles ? ` · 🏆 ×${st.titles}` : '';
      return `<div class="path ${locked ? 'locked' : ''}" style="--ac:${A.color}">
        <div class="ph"><span class="ph-num">AREA ${v + 1}</span><span class="ph-name">${A.icon} ${esc(A.name)}</span><span class="ph-state">${state}${titles}</span></div>
        <div class="ph-sub">${esc(A.sub)}</div>
        <div class="ph-ovr">YOUR OVR <b>${PF().ovr()}</b> · AREA OVR <b>${this.areaOvr(A)}</b></div>
        <div class="pa"><canvas data-arena="${v}" width="300" height="112"></canvas>${locked ? '<div class="pa-lock">🔒<span>Win the promotion match of the previous area</span></div>' : ''}</div>
        <div class="pdivs">${divs.join('')}</div>
        <div class="popps">${A.teams.map((id) => teamChip(id, false)).join('')}${teamChip(A.boss, true)}</div>
        <div class="proad">${dots}</div>
      </div>`;
    },

    // vẽ ảnh sân của Area vào canvas thẻ (cắt khung quanh sân)
    drawArena(cv) {
      const MP = MPATH(), A = MP.area(+cv.dataset.arena);
      const img = SFC.Background.thumb(A.arena, SFC_CONFIG.mainPath.playerTeam.id, A.boss);
      const ctx = cv.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 20, 22, 600, 224, 0, 0, cv.width, cv.height);
    },

    /* ---------------- nhập liệu ---------------- */
    /* ---------------- hồ sơ / nhân vật ---------------- */
    // kit dùng để vẽ character ngoài trận: áo đội đang chọn ở Chơi đơn
    kit() { return TEAMS().list[this.options().order[this.app.sel.team]].kit; },

    profileCard() {
      const d = PF().data, st = d.stats;
      return `<div class="pcard">
        <canvas class="avatar" data-avatar="spin"></canvas>
        <div class="pc-info">
          <div class="pc-name">${esc(d.name)}</div>
          ${xpBar(d)}
          ${PF().pointsFree() > 0 ? `<div class="pts-badge">★ ${PF().pointsFree()} STAT PTS</div>` : ''}
          <div class="pc-gold">${coin(d.gold)}</div>
          <div class="pc-stats">${st.matches} played · ${st.wins} wins · ${st.goals} goals</div>
        </div>
      </div>`;
    },

    charPanel() {
      const d = PF().data, st = d.stats;
      return `<div class="char-stage">
        <canvas class="avatar big" data-avatar="spin"></canvas>
        <div class="char-name">${esc(d.name)}</div>
        <div class="char-info">${xpBar(d)}<div class="pc-gold">${coin(d.gold)}</div>
          <div class="stats st-mini">${this.attrGrid()}</div>
          <div class="eq-list">${G().equippedHtml()}</div>
          <div class="pc-stats">${st.wins}W ${st.draws}D ${st.losses}L · ${st.goals} goals · ${st.boxes || 0} boxes</div></div>
      </div>`;
    },

    /* ---------------- chỉ số character (trang STATS) ---------------- */
    // lưới chỉ số nhỏ (bảng CHARACTER): thanh 60 -> tối đa + rating
    attrGrid() {
      const A = ATTRS();
      return A.order.map((id) => {
        const r = PF().rating(id), w = Math.round(Math.max(0, (r - 60) / (A.max - 60)) * 100);
        return `<div class="stat"><span>${A.list[id].short}</span><i><b style="width:${w}%"></b></i><em>${r}</em></div>`;
      }).join('');
    },

    // 1 dòng chỉ số: rating · thanh (đã xác nhận + đang thử, vạch chia + màu theo bậc giá) · giá bước kế tiếp
    attrBar(id) {
      const A = ATTRS(), pf = PF(), pend = this.pend;
      const have = pf.data.attrs.steps[id], add = pend[id] || 0, n = A.max - A.base;
      const cost = pf.nextCost(id, pend);
      const pct = (steps) => ((steps / n) * 100).toFixed(1) + '%';
      // màu từng bậc giá (thanh đầy / nền), vạch chia ở mốc cuối mỗi bậc
      const tints = [['var(--gold)', '#2a1f2c'], ['#ff9a3d', '#34222e'], ['#ff5a6e', '#3e2129']];
      let from = 0;
      const stops = A.tierCost.map(([upTo], i) => { const a = pct(from), b = pct(upTo - A.base); from = upTo - A.base; return [tints[Math.min(i, 2)], a, b]; });
      const grad = (k) => `linear-gradient(90deg, ${stops.map(([c, a, b]) => `${c[k]} ${a} ${b}`).join(', ')})`;
      const cuts = A.tierCost.slice(0, -1).map(([upTo]) => `<b class="cut" style="left:${pct(upTo - A.base)}"></b>`).join('');
      const flash = performance.now() - (this.attrFlashT || 0) < 900 && (this.attrFlash || {})[id] ? ' flash' : '';
      return `<b class="st-num${add ? ' up' : ''}${flash}">${pf.rating(id, pend)}</b>`
        + `<span class="st-bar" style="--tg:${grad(0)};--tt:${grad(1)}"><i class="have" style="width:${pct(have)}"></i>`
        + `<i class="add" style="left:${pct(have)};width:${pct(add)}"></i>${cuts}</span>`
        + `<em class="st-cost">${cost ? cost + 'P' : 'MAX'}</em>`;
    },

    // ←→ trên 1 dòng chỉ số: → cộng thử 1 bước (đủ điểm, chưa tối đa), ← bớt bước đang thử (không bớt dưới mức đã xác nhận)
    changeAttr(id, d) {
      const A = ATTRS(), pf = PF(), pend = this.pend, cur = pend[id] || 0;
      this.msg = ''; this.msgErr = false;
      if (d < 0) { if (cur > 0) pend[id] = cur - 1; return; }
      const cost = pf.nextCost(id, pend);
      if (!cost) { this.msg = `${A.list[id].label} is maxed at ${A.max}.`; this.msgErr = true; return; }
      const free = pf.pointsFree(pend);
      if (free < cost) { this.msg = `Need ${cost} point${cost > 1 ? 's' : ''} (${free} free).`; this.msgErr = true; return; }
      pend[id] = cur + 1;
    },

    commitAttrs() {
      const pend = this.pend;
      if (!Object.values(pend).some((v) => v > 0)) return;
      if (!PF().commitSteps(pend)) { this.setMsg('Not enough points.', true); return; }
      this.attrFlash = Object.assign({}, pend);
      this.attrFlashT = performance.now();
      this.pend = {};
      SFC.Audio.upgrade();
      this.setMsg('Stats saved.');
    },

    respecAttrs() {
      const pf = PF(), spent = pf.spentPoints(), cost = pf.respecCost();
      if (!G().confirmed(this, 'respec', `Press ${SFC.Input.key('confirm', 'Enter')} again to reset all stats (-${cost} gold)`)) return;
      const r = pf.respec();
      if (!r.ok) { this.setMsg(r.reason === 'gold' ? `Respec costs ${cost} gold.` : 'Nothing to reset.', true); return; }
      this.pend = {};
      SFC.Audio.dismantle();
      this.setMsg(`Stats reset. ${spent} points refunded.`);
    },

    // radar 6 cạnh: vàng = đã xác nhận, xanh viền = tính cả bước đang thử. Trục từ 60 tới tối đa
    statRadar(selId) {
      const A = ATTRS(), pf = PF(), pend = this.pend, ids = A.order, n = ids.length;
      const C = 64, R = 46, lo = 60, hi = A.max;
      const at = (i, k) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; return [C + Math.cos(a) * k, C + Math.sin(a) * k]; };
      const pt = (i, v) => at(i, Math.max(0, (v - lo) / (hi - lo)) * R);
      const poly = (fn) => ids.map((id, i) => pt(i, fn(id)).map((x) => x.toFixed(1)).join(',')).join(' ');
      const rings = [70, 80, 90, hi].map((v) => `<polygon class="ring" points="${poly(() => v)}"/>`).join('');
      const axes = ids.map((id, i) => { const [x, y] = at(i, R); return `<line class="axis" x1="${C}" y1="${C}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`; }).join('');
      const labels = ids.map((id, i) => {
        const [x, y] = at(i, R + 10);
        return `<text class="${id === selId ? 'sel' : ''}" x="${x.toFixed(1)}" y="${(y + 3).toFixed(1)}">${A.list[id].short}</text>`;
      }).join('');
      const any = ids.some((id) => pend[id] > 0);
      return `<svg class="st-radar" viewBox="0 0 128 128">${rings}${axes}
        <polygon class="have" points="${poly((id) => pf.rating(id))}"/>
        ${any ? `<polygon class="pend" points="${poly((id) => pf.rating(id, pend))}"/>` : ''}${labels}</svg>`;
    },

    // bảng phải trang STATS: radar + character + OVR, khung chi tiết của dòng đang chọn
    attrsPanel() {
      const A = ATTRS(), pf = PF(), pend = this.pend, it = this.items()[this.sel], id = it && it.attr;
      const o0 = pf.ovr(), o1 = pf.ovr(pend);
      let detail;
      if (id) {
        const S = A.list[id], r0 = pf.rating(id), r1 = pf.rating(id, pend);
        const mults = Object.keys(S.keys).map((k) => {
          const a = pf.attrMult(id, k).toFixed(2), b = pf.attrMult(id, k, pend).toFixed(2);
          return `<span>${KEY_LABELS[k] || k} ×${a}${b !== a ? ` → <em>×${b}</em>` : ''}</span>`;
        }).join('');
        detail = `<div class="sd-head"><b>${esc(S.label)}</b><span>${r0}${r1 !== r0 ? ` → <em>${r1}</em>` : ''}</span></div>
          <p>${esc(S.desc)}</p><div class="sd-mult">${mults}</div>`;
      } else {
        const tiers = A.tierCost.map(([upTo, c]) => `${c} pt up to ${upTo}`).join(' · ');
        detail = `<div class="sd-head"><b>HOW IT WORKS</b></div>
          <p>Every level gives ${A.pointsPerLevel} points. Higher stats cost more: ${tiers}.</p>`;
      }
      return `<div class="st-panel">
        <div class="st-top">${this.statRadar(id)}
          <div class="st-side"><canvas class="avatar" data-avatar="spin"></canvas>
            <div class="st-ovr"><b>${o0}${o1 !== o0 ? `<em>→${o1}</em>` : ''}</b><span>OVR</span></div></div>
        </div>
        <div class="st-detail">${detail}</div>
      </div>`;
    },

    // OVR của Area (Main Path): khoảng OVR các đội của Area (tính như màn giới thiệu trước trận)
    areaOvr(A) {
      const list = A.teams.concat(A.boss).map((tid) => SFC.Intro.ovrOf(TEAMS().list[tid].stats));
      const lo = Math.min(...list), hi = Math.max(...list);
      return lo === hi ? `${lo}` : `${lo}–${hi}`;
    },

    renderNameInput() {
      const n = PROG().nameMaxLength;
      const txt = esc(this.nameBuf);
      return `<div class="name-in"><span>${txt}</span><i class="caret"></i><em>${this.nameBuf.length}/${n}</em></div>`;
    },

    submitName() {
      if (!PF().setName(this.nameBuf)) { this.setMsg('Your name needs at least 1 character (A-Z, 0-9).', true); return; }
      SFC.Audio.pick();
      const back = this.nameBack;
      this.nameBack = 'home';
      this.go(back);
    },

    // gắn canvas character: look = hồ sơ hiện tại, hoặc bản "mặc thử" trong Shop (data-try)
    bindAvatars() {
      this.el.querySelectorAll('canvas[data-arena]').forEach((cv) => this.drawArena(cv));
      // cầu thủ đội đối thủ (Main Path): costume + áo của đội đó
      const teamAvatars = [...this.el.querySelectorAll('canvas[data-team]')].map((cv) => {
        cv.width = 40; cv.height = 44;
        const id = cv.dataset.team;
        return { cv, look: MPATH().teamLook(id, +cv.dataset.idx || 0), kit: TEAMS().list[id].kit, big: false };
      });
      this.avatars = teamAvatars.concat([...this.el.querySelectorAll('canvas[data-avatar]')].map((cv) => {
        const big = cv.classList.contains('big');
        cv.width = 40; cv.height = 44;
        const tryOn = cv.dataset.try;
        let look = PF().data.look;
        if (tryOn) { const it = PROG().items[tryOn]; look = Object.assign({}, look, { [it.slot]: tryOn }); }
        return { cv, look: PF().lookOf(look), big };
      }));
      this.animate(0);
    },

    // vẽ lại character mỗi khung hình: xoay người khoe trang phục
    animate(dt) {
      this.animT = (this.animT || 0) + dt;
      G().tick(this); // dải quay hộp gacha
      if (!this.avatars.length) return;
      const dirs = [Math.PI / 2, 0, -Math.PI / 2, Math.PI];
      const facing = dirs[Math.floor(this.animT / 1.6) % 4];
      const kit = this.kit();
      for (const a of this.avatars) {
        if (!a.cv.isConnected) continue;
        SFC.Sprites.drawAvatar(a.cv, a.look, a.kit || kit, this.animT, facing);
      }
    },

    input(input) {
      // phòng chờ: chỉ Esc mới rời phòng (tránh bấm nhầm Backspace)
      const back = input.wasPressed('pause') || (this.page !== 'lobby' && input.wasPressed('back'));
      if (back) { SFC.Audio.menu(); return this.back(); }
      if (G().pages.includes(this.page)) return G().input(this, input);
      if (this.page === 'name' && input.wasPressed('confirm')) return this.submitName();
      if (this.page === 'controls') return CV().input(this, input);
      if (this.page === 'tutorial') {
        const n = SFC_CONFIG.tutorial.pages.length;
        if (input.wasPressed('left')) { this.tutPage = wrap(this.tutPage - 1, n); SFC.Audio.menu(); this.render(); }
        if (input.wasPressed('right')) { this.tutPage = wrap(this.tutPage + 1, n); SFC.Audio.menu(); this.render(); }
        return;
      }
      const items = this.items();
      if (!items.length) return;
      if (input.wasPressed('up')) { this.move(-1); }
      if (input.wasPressed('down')) { this.move(1); }
      const it = items[this.sel];
      if (it && it.kind === 'pick') {
        if (input.wasPressed('left')) this.change(it, -1);
        if (input.wasPressed('right')) this.change(it, 1);
      }
      if (input.wasPressed('confirm')) {
        // phòng chờ: Enter luôn là "Bắt đầu" với chủ phòng
        if (this.page === 'lobby' && Online().isHost) return this.activate(items.find((x) => x.main));
        if (this.page === 'join') return this.submitCode();
        this.activate(it);
      }
    },

    move(d) {
      const n = this.items().length;
      this.sel = wrap(this.sel + d, n);
      SFC.Audio.menu();
      this.render();
    },

    change(it, d) {
      it.change(d);
      SFC.Audio.menu();
      this.render();
    },

    activate(it) {
      if (!it || it.disabled) return;
      SFC.Audio.menu();
      if (it.kind === 'btn') it.act();
      else if (it.enter) it.enter();
    },

    submitCode() {
      if (this.code.length < SFC_CONFIG.net.codeLength) { this.setMsg('Room codes are ' + SFC_CONFIG.net.codeLength + ' characters.', true); return; }
      Online().joinRoom(this.code);
    },

    // trang Vào phòng / Đặt tên: gõ chữ/số trực tiếp
    setTextMode(kind) {
      const I = SFC.Input;
      if (!kind) { I.textHandler = null; I.pasteHandler = null; return; }
      if (kind === 'name') {
        const upd = (v) => { this.nameBuf = PF().cleanName(v); this.msg = ''; this.render(); return true; };
        I.textHandler = (e) => {
          if (e.key === 'Backspace') return upd(this.nameBuf.slice(0, -1));
          if (e.key.length === 1 && /[a-z0-9 _-]/i.test(e.key)) return upd(this.nameBuf + e.key);
          return false;
        };
        I.pasteHandler = (text) => upd(this.nameBuf + text);
        return;
      }
      const n = SFC_CONFIG.net.codeLength;
      const add = (str) => {
        const clean = str.toUpperCase().split('').filter((c) => SFC_CONFIG.net.codeChars.includes(c)).join('');
        if (!clean) return false;
        this.code = (this.code + clean).slice(0, n);
        this.msg = '';
        this.render();
        return true;
      };
      I.textHandler = (e) => {
        if (Online().status === 'busy') return false;
        if (e.key === 'Backspace') { this.code = this.code.slice(0, -1); this.render(); return true; }
        if (e.key.length === 1 && /[a-z0-9]/i.test(e.key)) { add(e.key); return true; }
        return false;
      };
      I.pasteHandler = (text) => add(text.replace(/^.*?([A-Za-z0-9]{4,})\s*$/, '$1'));
    },

    /* ---------------- chuột ---------------- */
    bindMouse() {
      this.el.addEventListener('click', (e) => {
        SFC.Audio.unlock();
        const copy = e.target.closest('[data-copy]');
        if (copy) {
          const code = copy.dataset.copy;
          if (navigator.clipboard) navigator.clipboard.writeText(code).then(() => this.setMsg('Copied room code ' + code), () => {});
          return;
        }
        if (G().pages.includes(this.page) && G().click(this, e)) return;
        if (this.page === 'controls' && CV().click(this, e)) return;
        // Main Path: bấm 1 Area trên "con đường" để xem
        const pa = e.target.closest('[data-parea]');
        if (pa) { this.pathView = +pa.dataset.parea; SFC.Audio.menu(); this.render(); return; }
        const tab = e.target.closest('[data-tab]');
        if (tab) { this.tutPage = +tab.dataset.tab; SFC.Audio.menu(); this.render(); return; }
        const el = e.target.closest('[data-i]');
        if (!el) return;
        const i = +el.dataset.i, it = this.items()[i];
        if (!it) return;
        this.sel = i;
        if (el.dataset.d) return this.change(it, +el.dataset.d);
        if (it.kind === 'btn') return this.activate(it);
        this.render();
      });
    },
  };

  function wrap(v, n) { return ((v % n) + n) % n; }

  SFC.Menu = Menu;
})();
