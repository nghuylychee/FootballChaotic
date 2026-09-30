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
  const PX = () => SFC.PixelIcon;   // icon pixel art (render/pixelicons.js)
  // Shop (hộp gacha) · mở hộp · túi đồ nằm ở ui/gacha.js
  const G = () => SFC.Gacha;
  const TM = () => SFC.Team;          // NHÂN VẬT > TEAM: đội hình đồng đội + scout (ui/team.js)
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

  // phòng online: 1 đội = thẻ CLB (CLB riêng của người đầu tiên trong đội / đội bot ngẫu nhiên) + các slot theo vị trí.
  // Slot trống: đồng đội AI của người duy nhất trong đội, hoặc bot (đội không có người) — bấm để nhảy vào
  function lobbyTeam(t) {
    const O = SFC.Online, roles = SFC_CONFIG.game.roles, L = O.lobby, list = O.byTeam()[t];
    const coop = O.mode === 'coop', meId = O.mine && O.mine.id;
    let head, style = '--shirt:#8a8f9e;--accent:#9aa3b5';
    if (list.length) {
      const c = O.club(list[0].pf.name, !coop && t === 1, coop ? 'CO-OP SQUAD' : null), kit = c.kit;
      style = `--shirt:${kit.shirt};--accent:${kit.accent}`;
      head = `<div class="tc-head"><span class="kit"><i style="background:${kit.shirt}"></i><i style="background:${kit.accent}"></i><i style="background:${kit.shorts}"></i></span>
        <div><div class="tc-name">${esc(c.name)}</div><div class="tc-tag">${esc(c.tagline)}</div></div></div>`;
    } else {
      head = `<div class="tc-head"><span class="kit bot"><i></i><i></i><i></i></span>
        <div><div class="tc-name">??? RANDOM BOTS</div><div class="tc-tag">A random club from your Areas</div></div></div>`;
    }
    const slots = roles.map((role) => {
      const s = O.slotOf(t, role), m = O.memberAt(s), pos = ROLE_LABELS[role] || role;
      if (m) {
        const you = m.id === meId, n = L.members.indexOf(m) + 1;
        const tag = you ? '<em class="you">YOU</em>' : m.id === 'host' ? '<em>HOST</em>' : '';
        return `<div class="lb-slot ${you ? 'me' : ''}" data-slot="${s}"><u>P${n}</u><div><b>${esc(m.pf.name)}</b>${tag}
          <span>${pos} · LV${m.pf.level}${m.pf.ovr ? ` · OVR ${m.pf.ovr}` : ''}</span></div></div>`;
      }
      const mate = list.length === 1 && list[0].pf.mate;
      const who = mate ? `<b>${esc(mate.name)}</b><span>AI ${pos} · OVR ${mate.ovr} · ${mate.deck.length} Cores</span>`
        : list.length ? `<b>AI</b><span>${pos}</span>` : `<b>BOT</b><span>AI ${pos}</span>`;
      return `<div class="lb-slot open ${mate ? 'mate' : 'bot'}" data-slot="${s}"><u>+</u><div>${who}</div><i>JOIN</i></div>`;
    }).join('');
    return `<div class="team-card lb-team ${list.length ? '' : 'bots'}" style="${style}">${head}<div class="lb-slots">${slots}</div></div>`;
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

    init(app) {
      this.app = app;
      this.el = $('menu');
      this.bindMouse();
      this.render();
    },

    go(page, msg = '', err = false) {
      // nhớ mục đang chọn của từng trang: quay lại trang cũ (Esc, hết trận...) con trỏ nằm đúng mục vừa rời đi
      if (page !== this.page) {
        this.resetArmed = false;   // RESET DATA: rời trang SETTINGS là huỷ xác nhận
        this.selMemo[this.page] = this.sel;
        this.sel = this.selMemo[page] || 0;
      }
      this.page = page;
      this.msg = msg;
      this.msgErr = err;
      if (page === 'join' && !msg) this.code = '';
      if (page === 'name') this.nameBuf = PF().data.name;
      if (page === 'path') this.pathView = MPATH().state.area;   // mở Main Path: xem Area đang đá
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
          // trang chủ: dòng phụ của mọi nút viết in hoa (kể cả dòng động: hạng Main Path, hộp miễn phí...)
          return [
            { kind: 'btn', label: 'MAIN PATH', sub: this.pathSub(), act: () => this.go('path') },
            { kind: 'btn', label: 'ONLINE', sub: '2-4 players · versus or co-op', act: () => this.go('online') },
            { kind: 'btn', label: 'CHARACTER', sub: this.drillCount() ? `★ ${this.drillCount()} READY!` : SFC.Mates.scoutReady() ? '★ SCOUT REPORT READY!' : 'STATS · TEAM · APPEARANCE · INVENTORY', hot: PF().drillsPending() > 0 || SFC.Mates.scoutReady(), act: () => this.go('char') },
            { kind: 'btn', label: 'SHOP', sub: this.shopSub(), hot: Object.values(PF().data.boxes).some((n) => n > 0), act: () => { G().shopBack = 'home'; this.go('shop'); } },
            { kind: 'btn', label: 'SETTINGS', sub: 'Training · controls', act: () => this.go('settings') },
            // nút cheat tạm để test PROLOGUE (tắt: config/ftue.config.js -> cheatButton = false)
            ...(SFC_CONFIG.ftue.cheatButton ? [{ kind: 'btn', label: 'TEST FTUE', sub: 'Cheat · replay prologue', danger: true, act: () => SFC.Tutorial.begin(app) }] : []),
          ].map((it) => Object.assign(it, { sub: it.sub && it.sub.toUpperCase() }));
        case 'settings':
          return [
            { kind: 'btn', label: 'TRAINING', sub: 'No clock · pick team sizes', act: () => this.go('training') },
            { kind: 'btn', label: 'CONTROLS', sub: 'Keyboard & controller layout', act: () => { CV().open(); this.go('controls'); } },
            { kind: 'btn', label: 'PROLOGUE', sub: 'Replay the intro & tutorial match', act: () => SFC.Tutorial.begin(this.app) },
            { kind: 'btn', label: 'DRILL TEST', sub: 'Cheat · 5 drills · stats reset on close', act: () => this.testDrill() },
            // xoá toàn bộ tiến trình, chơi lại từ đầu — bấm 2 lần mới xoá (lần 1 chỉ hỏi lại, rời trang là huỷ)
            this.resetArmed
              ? { kind: 'btn', label: 'CONFIRM RESET', sub: 'Press again · this cannot be undone', danger: true, act: () => this.resetData() }
              : { kind: 'btn', label: 'RESET DATA', sub: 'Erase all progress · start over', danger: true, act: () => { this.resetArmed = true; this.setMsg('Erase level, stats, Main Path, team, items and gold? Press again to confirm.', true); } },
          ];
        case 'name':
          return [{ kind: 'btn', label: 'CONFIRM', main: true, act: () => this.submitName() }];
        case 'char': {
          const d = PF().data;
          const nItems = Object.values(d.items).reduce((a, b) => a + b, 0) + Object.values(d.cores).reduce((a, b) => a + b, 0);
          const n = PF().drillsPending(), list = [];
          // DRILL: chỉ hiện khi còn drill chờ chọn (docs/DRILL_DESIGN.md)
          if (n) list.push({ kind: 'btn', label: 'DRILL', sub: `${n} ready · pick 1 of 3`, hot: true, act: () => this.openDrill() });
          return list.concat([
            { kind: 'btn', label: 'STATS', sub: `OVR ${PF().ovr()}`, act: () => this.go('attrs') },
            { kind: 'btn', label: 'TEAM', sub: this.teamSub(), hot: SFC.Mates.scoutReady(), act: () => { TM().back0 = 'char'; TM().open(this, SFC.Mates.scoutReady() ? 1 : 0); } },
            { kind: 'btn', label: 'APPEARANCE', sub: `${d.name} · skin · hair color`, act: () => this.go('look') },
            { kind: 'btn', label: 'INVENTORY', sub: `${nItems} items · equip · dismantle`, act: () => { G().invBack = 'char'; this.go('inv'); } },
          ]);
        }
        case 'look': {
          // NGOẠI HÌNH: đổi tên + màu da / tóc (costume ở INVENTORY)
          const d = PF().data, look = d.look, P = PROG();
          return [
            { kind: 'btn', label: 'RENAME', sub: d.name, act: () => { this.nameBack = 'look'; this.go('name'); } },
            { kind: 'pick', label: 'SKIN COLOR', swatch: SFC_CONFIG.teams.skins[look.skin], change: (dd) => PF().setColor('skin', dd) },
            { kind: 'pick', label: 'HAIR COLOR', swatch: P.hairColors[look.hairColor], change: (dd) => PF().setColor('hairColor', dd) },
          ];
        }
        case 'attrs': {
          // STATS (chỉ xem): 1 dòng mỗi chỉ số (↑↓ đổi khung chi tiết) + DRILL khi còn drill chờ
          const A = ATTRS(), n = PF().drillsPending();
          const list = A.order.map((id) => ({ kind: 'attr', label: A.list[id].label, attr: id, bar: this.attrBar(id) }));
          if (n) list.push({ kind: 'btn', label: `DRILL (${n})`, sub: 'Pick 1 of 3 to raise your stats', hot: true, act: () => this.openDrill() });
          return list;
        }
        case 'path': {
          // Main Path: không chọn đối thủ / độ khó — trận kế tiếp do Area + hạng quyết định
          const MP = MPATH(), st = MP.state, n = MP.areas().length, v = this.pathView;
          const boss = TEAMS().list[MP.area(st.area).boss];
          const battle = MP.isPromo()
            ? { label: MP.isFinal() ? 'CHAMPIONSHIP FINAL' : 'PROMOTION MATCH', sub: `vs ${boss.name}`, subHtml: `${PX().ui('crown', 'sm')} vs ${esc(boss.name)}` }
            : { label: 'BATTLE', sub: `${MP.divName(st.area, st.div)} · ${st.stars}/${MP.need(st.area, st.div)} ★` };
          return [
            { kind: 'btn', label: battle.label, sub: battle.sub, subHtml: battle.subHtml, main: true, act: () => app.startMainPath() },
            { kind: 'pick', label: 'POSITION', value: this.ctrlLabel(null, s.ctrl), change: (d) => this.changeCtrl(d) },
            { kind: 'pick', label: 'TEAMMATE', value: this.mateLabel(), change: (d) => this.changeMate(d) },
            { kind: 'pick', label: 'VIEW AREA', value: `${v + 1}/${n} ${v > st.area ? '???' : MP.area(v).name}`, change: (d) => { this.pathView = wrap(v + d, n); } },
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
          const O = Online(), me = O.mine;
          const list = [];
          // như Main Path: không chọn đội (đá cho CLB riêng) — slot quyết định đội + vị trí character; đồng đội AI ra sân khi đội chỉ có mình bạn
          // SLOT: các slot trống + GUEST (ghế chờ, không ra sân) — phòng đủ 4 người vẫn đổi chỗ được qua ghế chờ
          list.push({ kind: 'pick', label: 'SLOT', value: me ? this.slotLabel(me.slot) : '—', change: (d) => O.cycleSlot(d) });
          // đội đã đủ người -> không có đồng đội AI ra sân: khóa chọn đồng đội
          const full = !!me && me.slot >= 0 && O.byTeam()[O.slotTeam(me.slot)].length >= SFC_CONFIG.game.roles.length;
          list.push({ kind: 'pick', label: 'TEAMMATE', value: full ? 'TEAM FULL · NO AI' : this.mateLabel(), disabled: full, change: (d) => { this.changeMate(d); O.updatePf(); } });
          if (O.isHost) {
            const sub = O.canStart ? (O.mode === 'coop' ? 'CO-OP vs random bots' : 'VERSUS')
              : O.benched.length ? 'Everyone on GUEST must take a slot' : 'Waiting for players...';
            list.push({ kind: 'btn', label: 'START', sub, main: true, disabled: !O.canStart, act: () => O.startMatch() });
          }
          list.push({ kind: 'btn', label: 'LEAVE ROOM', act: () => O.leave() });
          return list;
        }
        default:
          return [];
      }
    },

    // đồng đội ra sân trận Main Path kế tiếp (đổi trong đội hình)
    mateLabel() { const m = SFC.Mates.active(); return m ? `${m.name} · OVR ${m.ovr}` : '—'; },
    changeMate(d) {
      const list = SFC.Mates.roster(), i = list.indexOf(SFC.Mates.active());
      SFC.Mates.setActive(list[wrap(i + d, list.length)].id);
    },
    // dòng phụ nút TEAM: số đồng đội + tình trạng scout
    teamSub() {
      const M = SFC.Mates, n = M.roster().length, max = SFC_CONFIG.teammates.rosterMax;
      const sc = M.scoutReady() ? '★ report ready!' : M.scouting() ? 'scouting...' : 'scout idle';
      return `${n}/${max} players · ${sc}`;
    },

    // phòng online: slot = đội A (trái) / B (phải) + vị trí
    slotLabel(s) {
      const O = Online();
      if (s < 0) return 'GUEST · SITTING OUT';
      return `TEAM ${'AB'[O.slotTeam(s)]} · ${ROLE_LABELS[O.slotRole(s)] || O.slotRole(s)}`;
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
      if (TM().pages.includes(this.page)) return TM().back(this);
      if (this.page === 'attrs' || this.page === 'look') return this.go('char');
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
      this.el.classList.toggle('tut', this.page === 'tutorial' || this.page === 'controls' || G().pages.includes(this.page) || TM().pages.includes(this.page));
      if (this.page === 'tutorial') { this.el.innerHTML = this.renderTutorial(); this.bindAvatars(); return; }
      if (this.page === 'controls') { this.el.innerHTML = CV().render(); this.bindAvatars(); return; }
      if (G().pages.includes(this.page)) { G().render(this); this.bindAvatars(); return; }
      if (TM().pages.includes(this.page)) { TM().render(this); this.bindAvatars(); return; }
      const list = items.map((it, i) => this.renderItem(it, i)).join('');
      const titles = { path: 'MAIN PATH', training: 'TRAINING', settings: 'SETTINGS', online: 'ONLINE', join: 'JOIN ROOM', lobby: 'LOBBY', name: 'YOUR NAME', char: 'CHARACTER', attrs: 'STATS', look: 'APPEARANCE' };
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
          <div class="m-items">${list}</div>
          ${msg}
          <div class="m-hint">${this.hint()}</div>
        </div>
        <div class="m-right">${this.renderRight()}</div>`;
      this.bindAvatars();
    },

    renderItem(it, i) {
      const cls = ['mi', it.kind, i === this.sel ? 'sel' : '', it.main ? 'main' : '', it.disabled ? 'dis' : '', it.hot ? 'hot' : '', it.danger ? 'danger' : ''].join(' ');
      // dòng chỉ số (trang STATS, chỉ xem): tên · rating + thanh
      if (it.kind === 'attr') return `<div class="${cls}" data-i="${i}"><label>${esc(it.label)}</label><div class="st-val">${it.bar}</div></div>`;
      if (it.kind === 'pick') {
        const val = it.swatch ? `<i class="swatch" style="background:${it.swatch}"></i>` : esc(it.value);
        return `<div class="${cls}" data-i="${i}"><label>${esc(it.label)}</label>
          <div class="picker"><button data-i="${i}" data-d="-1">◀</button><span>${val}</span><button data-i="${i}" data-d="1">▶</button></div></div>`;
      }
      return `<button class="${cls}" data-i="${i}"><span class="mi-label">${esc(it.label)}</span>${it.subHtml || it.sub ? `<span class="mi-sub">${it.subHtml || esc(it.sub)}</span>` : ''}</button>`;
    },

    hint() {
      const K = (a, kb) => SFC.Input.key(a, kb), ok = K('confirm', 'Enter'), back = K('back', 'Esc');
      if (this.page === 'home') return `↑↓ select · ${ok} · ${K('mute', 'M')} mute`;
      if (this.page === 'join') return `Type the code · Enter connect · ${back} back`;
      if (this.page === 'name') return PF().hasName ? `Type a name (A-Z, 0-9) · Enter confirm · ${back} back` : 'Type a name (A-Z, 0-9) · Enter confirm';
      if (this.page === 'attrs') return `↑↓ select · ${back} back`;
      if (this.page === 'lobby') return `↑↓ select · ←→ change slot / teammate · click a slot / GUEST to move${Online().isHost ? ` · ${ok} start` : ''} · ${K('pause', 'Esc')} leave room`;
      return `↑↓ select · ←→ change · ${ok} · ${back} back`;
    },

    renderRight() {
      const s = this.app.sel, o = this.options();
      if (this.page === 'home') return this.profileCard();
      if (this.page === 'name') return `<div class="char-stage"><canvas class="avatar big" data-avatar="spin"></canvas><div class="char-name">${esc(this.nameBuf || '???')}</div></div>`;
      if (this.page === 'char') return this.charPanel();
      if (this.page === 'look') return `<div class="char-stage"><canvas class="avatar big" data-avatar="spin"></canvas><div class="char-name">${esc(PF().data.name)}</div></div>`;
      if (this.page === 'attrs') return this.attrsPanel();
      if (this.page === 'path') return this.pathPanel();
      if (this.page === 'training') return teamCard(o.order[s.team], '');
      if (this.page === 'lobby') {
        const O = Online(), n = O.lobby.members.length, max = SFC_CONFIG.net.maxPlayers;
        if (!n) return '<div class="lobby"><div class="lb-note">Loading room...</div></div>';
        const coop = O.mode === 'coop';
        const bench = O.benched;
        const status = bench.length ? '<div class="lb-note">Players on GUEST must take a slot before the match starts</div>'
          : O.isHost
            ? (O.canStart ? `<div class="lb-note ok">Ready. Press Enter to start ${coop ? 'CO-OP' : 'VERSUS'}</div>` : '<div class="lb-note">Send the room code to friends to play</div>')
            : '<div class="lb-note">Waiting for the host to start...</div>';
        // ghế chờ GUEST: không ra sân, dùng để đổi chỗ khi phòng đủ 4 người (bấm để ngồi ra)
        const meId = O.mine && O.mine.id;
        const benchList = bench.map((m) => `<b class="${m.id === meId ? 'me' : ''}">P${O.lobby.members.indexOf(m) + 1} ${esc(m.pf.name)}</b>`).join('');
        const benchRow = `<div class="lb-bench ${O.mine && O.mine.slot < 0 ? 'on' : ''}" data-slot="-1"><u>GUEST</u>${benchList || '<span>Sit out here to free your slot for a swap</span>'}</div>`;
        // chế độ theo cách mọi người đứng: 2 đội có người = VERSUS, chung 1 đội = CO-OP (đội kia bot)
        const mode = coop
          ? `<div class="lb-mode coop">CO-OP <span>· same team vs random bots · ${n}/${max}</span></div>`
          : `<div class="lb-mode">VERSUS <span>· ${n}/${max} players</span></div>`;
        return `<div class="lobby">
          ${mode}
          ${lobbyTeam(0)}
          <div class="vs">VS</div>
          ${lobbyTeam(1)}
          ${benchRow}
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
            .map((id) => `<div class="core-row" title="${esc(SFC.CoreScale.plain(id))}"><span class="chip" style="--c:${c.color}">${PX().core(id)}</span>${esc(C.list[id].name)}</div>`).join('');
          return `<div class="core-group"><h4 style="color:${c.color}">${esc(c.label)}</h4>${list}</div>`;
        }).join('');
        body += `<div class="core-grid">${groups}</div>`;
      }
      return `
        <div class="tut-head"><div class="m-title">HOW TO PLAY</div><div class="tabs">${tabs}</div></div>
        <div class="tut-body">${body}</div>
        <div class="m-hint">←→ change page · ${SFC.Input.key('back', 'Esc')} back</div>`;
    },

    // dòng phụ của nút SHOP: báo hộp miễn phí đang chờ mở (thưởng lên hạng Main Path)
    shopSub() {
      const free = Object.values(PF().data.boxes).reduce((a, b) => a + b, 0);
      if (free) return `${free} free box${free > 1 ? 'es' : ''} to open!`;
      return PROG().coreGacha ? 'Gacha boxes · costumes & Cores' : 'Gacha boxes · costumes';
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
      // Area chưa mở: silhouette + ??? (tên, sân, đối thủ, boss, phần thưởng đều ẩn)
      const locked = v > st.area, cleared = v < st.area;
      const state = locked ? `${PX().ui('lock', 'sm')} LOCKED` : cleared ? `${PX().ui('check', 'sm')} CLEARED` : 'YOU ARE HERE';
      const stars = (on, need) => Array.from({ length: need }, (_, i) => `<i class="${i < on ? 'on' : ''}">★</i>`).join('');
      const divs = [];
      for (let d = 0; d < n; d++) {
        const cur = !locked && !cleared && d === st.div, done = cleared || (!locked && d < st.div);
        const need = MP.need(v, d), pl = MP.divPlan(v, d);
        // thưởng lần đầu của hạng: lá Core (sao) · gold (sao khi Area hết Core) · hộp (lên hạng); đã nhận thì mờ
        const rw = locked ? '<em class="pr unk">???</em>' : [
          pl.cores ? `<em class="pr ${pl.coresGot >= pl.cores ? 'got' : ''}" title="New Core per new star">${PX().ui('card', 'sm')}${pl.coresGot}/${pl.cores}</em>` : '',
          pl.gold ? `<em class="pr ${pl.goldGot >= pl.gold ? 'got' : ''}" title="Gold per new star"><i class="coin"></i>${pl.gold}</em>` : '',
          pl.box ? `<em class="pr ${pl.boxGot ? 'got' : ''}" title="${esc(PROG().boxes[pl.box].name)} for reaching the next division">${PX().ui('gift', 'sm')}</em>` : '',
        ].join('');
        divs.push(`<div class="pd ${cur ? 'cur' : done ? 'done' : 'lock'}"><b>${MP.divLabel(d)}</b><span>${stars(done ? need : cur ? st.stars : 0, need)}</span><span class="prw">${rw}</span></div>`);
      }
      const promoReady = !locked && !cleared && MP.isPromo();
      const last = v === MP.areas().length - 1;
      const sig = !locked && SFC_CONFIG.cores.list[A.signature], sigGot = !!sig && PF().coreUnlocked(A.signature);
      const sigChip = locked ? '<em class="pr unk">?</em>' : sig ? `<em class="pr sig ${sigGot ? 'got' : ''}" title="${esc(sig.name)}">${PX().core(A.signature, 'sm')}</em>` : '';
      divs.push(`<div class="pd boss ${promoReady ? 'cur' : cleared ? 'done' : 'lock'}"><b>${PX().ui('crown', 'sm')}</b><span>${last ? 'FINAL' : 'PROMO'}</span><span class="prw">${sigChip}</span></div>`);
      // boss: lộ Core đặc trưng (thắng trận thăng hạng để lấy). Area chưa mở: cầu thủ vẽ dạng bóng đen, tên ???
      const teamChip = (id, boss) => {
        const t = TEAMS().list[id];
        if (locked) {
          return `<div class="po unk ${boss ? 'boss' : ''}">
            <canvas class="avatar" data-team="${id}" data-idx="1" data-sil="1"></canvas>
            <div><b>???</b><span>${boss ? `${PX().ui('crown', 'sm')} ???` : '???'}</span></div></div>`;
        }
        const sub = boss ? (sig ? `${PX().ui('crown', 'sm')}${PX().core(A.signature, 'sm')} ${esc(sig.name)}` : 'BOSS') : esc(t.tagline);
        return `<div class="po ${boss ? 'boss' : ''}" style="--shirt:${t.kit.shirt}" title="${esc(t.desc)}${boss && sig ? ` · Signature Core: ${esc(sig.name)} — ${esc(SFC.CoreScale.plain(A.signature))}` : ''}">
          <canvas class="avatar" data-team="${id}" data-idx="1"></canvas>
          <div><b>${esc(t.name)}</b><span>${sub}</span></div></div>`;
      };
      // "con đường": 10 Area nối nhau, Area đang xem nổi lên, Area đang đá có cờ, chưa mở thì dạng bóng đen
      const dots = MP.areas().map((a, i) => {
        const lk = i > st.area;
        return `<i class="${i === v ? 'sel' : ''} ${lk ? 'lock' : i < st.area ? 'done' : 'cur'}" style="--c:${lk ? '#5a4658' : a.color}" data-parea="${i}" title="${lk ? '???' : esc(a.name)}">${lk ? PX().ui('unknown') : PX().area(a.id)}</i>`;
      }).join('');
      const titles = last && st.titles && !locked ? ` · ${PX().ui('trophy', 'sm')} ×${st.titles}` : '';
      const name = locked ? '???' : esc(A.name);
      return `<div class="path ${locked ? 'locked' : ''}" style="--ac:${locked ? '#6a5f6e' : A.color}">
        <div class="ph"><span class="ph-num">AREA ${v + 1}</span><span class="ph-name">${locked ? PX().ui('unknown') : PX().area(A.id)} ${name}</span><span class="ph-state">${state}${titles}</span></div>
        <div class="ph-sub">${locked ? '???' : esc(A.sub)}${locked ? '' : this.areaCoreCount(v)}</div>
        <div class="ph-ovr">YOUR OVR <b>${PF().ovr()}</b> · AREA OVR <b>${locked ? '??' : this.areaOvr(A)}</b></div>
        <div class="pa"><canvas data-arena="${v}" width="300" height="112"></canvas>${locked ? `<div class="pa-lock"><b>???</b>${PX().ui('lock', 'x2')}<span>Win the promotion match of the previous area</span></div>` : ''}</div>
        <div class="pdivs">${divs.join('')}</div>
        <div class="popps">${A.teams.map((id) => teamChip(id, false)).join('')}${teamChip(A.boss, true)}</div>
        <div class="proad">${dots}</div>
      </div>`;
    },

    // số Core của Area (sao + boss) đã mở khoá
    areaCoreCount(a) {
      if (!SFC_CONFIG.mainPath.lockCores || PROG().coreGacha) return '';
      const A = MPATH().area(a), ids = (A.cores || []).concat(A.signature ? [A.signature] : []);
      if (!ids.length) return '';
      const have = ids.filter((id) => PF().coreUnlocked(id)).length;
      return `<span class="ph-cores ${have >= ids.length ? 'all' : ''}">${PX().ui('card', 'sm')} CORES ${have}/${ids.length}</span>`;
    },

    // vẽ ảnh sân của Area vào canvas thẻ (cắt khung quanh sân)
    drawArena(cv) {
      const MP = MPATH(), A = MP.area(+cv.dataset.arena);
      const img = SFC.Background.thumb(A.arena, SFC_CONFIG.mainPath.playerTeam.id, A.boss);
      const ctx = cv.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 20, 22, 600, 224, 0, 0, cv.width, cv.height);
      // Area chưa mở: phủ tối gần hết, chỉ còn lờ mờ đường nét sân
      if (+cv.dataset.arena > MP.state.area) { ctx.fillStyle = 'rgba(7,5,10,0.86)'; ctx.fillRect(0, 0, cv.width, cv.height); }
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
          ${this.drillCount() ? `<div class="pts-badge">★ ${this.drillCount().toUpperCase()}</div>` : ''}
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

    // 1 dòng chỉ số: rating + thanh (60 -> tối đa)
    attrBar(id) {
      const A = ATTRS(), pf = PF(), w = ((pf.data.attrs.steps[id] / (A.max - A.base)) * 100).toFixed(1);
      return `<b class="st-num">${pf.rating(id)}</b><span class="st-bar"><i class="have" style="width:${w}%"></i></span>`;
    },

    // "2 drills" — số drill chờ chọn (trang chủ / thẻ hồ sơ), '' khi không còn
    drillCount() {
      const n = PF().drillsPending();
      return n ? `${n} drill${n > 1 ? 's' : ''}` : '';
    },

    // mở màn DRILL (ui/drill.js) trên menu; đóng thì vẽ lại trang đang mở (số drill / chỉ số đã đổi)
    openDrill() { SFC.Drill.open(() => this.render()); },

    // cheat DRILL TEST: mở màn DRILL với vài drill chờ, không cần đá trận. Hồ sơ không được ghi trong lúc thử,
    // đóng màn thì trả chỉ số + drill chờ về như cũ
    // RESET DATA (SETTINGS): xoá hồ sơ rồi tải lại trang -> chạy như lần đầu chơi (đặt tên, LV1, Area đầu).
    // Giữ cài đặt máy (hiệu ứng, phím) — chỉ xoá tiến trình
    resetData() {
      PF().resetAll();
      location.reload();
    },

    testDrill(n = 5) {
      const pf = PF(), keep = JSON.parse(JSON.stringify(pf.data.attrs));
      pf.sandbox = true;
      pf.data.attrs.drills.pending = n;
      pf.data.attrs.drills.offer = null;
      SFC.Drill.open(() => {
        pf.data.attrs = keep;
        pf.sandbox = false;
        this.render();
      });
    },

    // radar 6 cạnh theo rating hiện tại. Trục từ 60 tới tối đa
    statRadar(selId) {
      const A = ATTRS(), pf = PF(), ids = A.order, n = ids.length;
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
      return `<svg class="st-radar" viewBox="0 0 128 128">${rings}${axes}
        <polygon class="have" points="${poly((id) => pf.rating(id))}"/>${labels}</svg>`;
    },

    // bảng phải trang STATS: radar + character + OVR, khung chi tiết của dòng đang chọn
    attrsPanel() {
      const A = ATTRS(), pf = PF(), it = this.items()[this.sel], id = it && it.attr;
      let detail;
      if (id) {
        const S = A.list[id];
        const mults = Object.keys(S.keys).map((k) => `<span>${KEY_LABELS[k] || k} ×${pf.attrMult(id, k).toFixed(2)}</span>`).join('');
        detail = `<div class="sd-head"><b>${esc(S.label)}</b><span>${pf.rating(id)}</span></div>
          <p>${esc(S.desc)}</p><div class="sd-mult">${mults}</div>`;
      } else {
        detail = `<div class="sd-head"><b>DRILL</b></div>
          <p>Every level gives ${A.drills.perLevel} drill: pick 1 of ${A.drills.choices} to raise your stats for good. Offers lean toward what you've already trained.</p>`;
      }
      return `<div class="st-panel">
        <div class="st-top">${this.statRadar(id)}
          <div class="st-side"><canvas class="avatar" data-avatar="spin"></canvas>
            <div class="st-ovr"><b>${pf.ovr()}</b><span>OVR</span></div></div>
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
      // người chơi mới: đặt tên xong -> PROLOGUE (cut scene + trận hướng dẫn)
      if (SFC.Tutorial.wanted()) { this.setTextMode(null); return SFC.Tutorial.begin(this.app); }
      this.go(back);
    },

    // gắn canvas character: look = hồ sơ hiện tại, hoặc bản "mặc thử" trong Shop (data-try)
    bindAvatars() {
      this.el.querySelectorAll('canvas[data-arena]').forEach((cv) => this.drawArena(cv));
      // cầu thủ đội đối thủ (Main Path): costume + áo của đội đó
      const teamAvatars = [...this.el.querySelectorAll('canvas[data-team]')].map((cv) => {
        cv.width = 40; cv.height = 44;
        const id = cv.dataset.team;
        return { cv, look: MPATH().teamLook(id, +cv.dataset.idx || 0), kit: TEAMS().list[id].kit, big: false, sil: !!cv.dataset.sil };
      });
      // đồng đội / ứng viên scout (ui/team.js): mặc áo đội riêng của người chơi
      const mateAvatars = [...this.el.querySelectorAll('canvas[data-mate]')].map((cv) => {
        cv.width = 40; cv.height = 44;
        return { cv, look: TM().lookOf(cv.dataset.mate), kit: TEAMS().list[SFC_CONFIG.mainPath.playerTeam.id].kit, big: cv.classList.contains('big') };
      }).filter((a) => a.look);
      this.avatars = teamAvatars.concat(mateAvatars, [...this.el.querySelectorAll('canvas[data-avatar]')].map((cv) => {
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
      TM().tick(this, dt); // bản đồ scout + đồng hồ
      if (!this.avatars.length) return;
      const dirs = [Math.PI / 2, 0, -Math.PI / 2, Math.PI];
      const facing = dirs[Math.floor(this.animT / 1.6) % 4];
      const kit = this.kit();
      for (const a of this.avatars) {
        if (!a.cv.isConnected) continue;
        SFC.Sprites.drawAvatar(a.cv, a.look, a.kit || kit, this.animT, facing);
        if (a.sil) silhouette(a.cv);   // Area chưa mở: đội đối thủ chỉ hiện bóng đen
      }
    },

    input(input) {
      // phòng chờ: chỉ Esc mới rời phòng (tránh bấm nhầm Backspace)
      const back = input.wasPressed('pause') || (this.page !== 'lobby' && input.wasPressed('back'));
      if (back) { SFC.Audio.menu(); return this.back(); }
      if (G().pages.includes(this.page)) return G().input(this, input);
      if (TM().pages.includes(this.page)) return TM().input(this, input);
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
      if (it.disabled) return;
      it.change(d);
      SFC.Audio.menu();
      this.render();
    },

    activate(it) {
      if (!it || it.disabled) return;
      SFC.Audio.menu();
      if (it.kind === 'btn') it.act();
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
        if (TM().pages.includes(this.page) && TM().click(this, e)) return;
        if (this.page === 'controls' && CV().click(this, e)) return;
        // Main Path: bấm 1 Area trên "con đường" để xem
        const pa = e.target.closest('[data-parea]');
        if (pa) { this.pathView = +pa.dataset.parea; SFC.Audio.menu(); this.render(); return; }
        // phòng online: bấm slot trống để nhảy vào
        const slot = this.page === 'lobby' && e.target.closest('[data-slot]');
        if (slot) { SFC.Audio.menu(); Online().requestSlot(+slot.dataset.slot); return; }
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

  // tô đen mọi pixel đã vẽ trên canvas (giữ nguyên hình dáng)
  function silhouette(cv) {
    const x = cv.getContext('2d');
    x.save();
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = '#07050a';
    x.fillRect(0, 0, cv.width, cv.height);
    x.restore();
  }

  function wrap(v, n) { return ((v % n) + n) % n; }

  SFC.Menu = Menu;
})();
