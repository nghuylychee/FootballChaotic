/* Menu — các màn ngoài trận: Trang chủ (thẻ hồ sơ) · Chơi đơn · Online (tạo / vào phòng / phòng chờ) ·
 *        Shop (trang phục + mở khoá Core) · Nhân vật (tủ đồ, đổi tên) · Đặt tên · Hướng dẫn
 * Mỗi trang khai báo danh sách mục (items): nút (btn) hoặc bộ chọn ←→ (pick).
 * ↑↓ chọn mục · ←→ đổi giá trị · Enter xác nhận · Esc / Backspace quay lại
 */
window.SFC = window.SFC || {};

(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const TEAMS = () => SFC_CONFIG.teams;
  const STAT_LABELS = { speed: 'TỐC ĐỘ', power: 'LỰC SÚT', pass: 'CHUYỀN', tackle: 'ĐỐI KHÁNG', dribble: 'RÊ DẮT', accuracy: 'CHÍNH XÁC' };
  const Online = () => SFC.Online;
  const ROLE_LABELS = { DEF: 'ĐÁ LÙI', FWD: 'ĐÁ CAO' }; // vị trí xuất phát
  const PF = () => SFC.Profile;
  const PROG = () => SFC_CONFIG.progression;
  // Shop (hộp gacha) · mở hộp · túi đồ nằm ở ui/gacha.js
  const G = () => SFC.Gacha;
  const coin = (n) => G().coin(n);
  const xpBar = (d) => G().xpBar(d);

  function helpTable(list) {
    return list.map(([k, v]) => `<div class="hk"><kbd>${esc(k)}</kbd><span>${esc(v)}</span></div>`).join('');
  }

  function teamCard(id, label, extra = '') {
    if (!id) return `<div class="team-card empty"><div class="tc-label">${esc(label)}</div><div class="tc-wait">Đang chờ người chơi...</div></div>`;
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
      if (page !== this.page) this.sel = 0;
      this.page = page;
      this.msg = msg;
      this.msgErr = err;
      if (page === 'join' && !msg) this.code = '';
      if (page === 'name') this.nameBuf = PF().data.name;
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
            { kind: 'btn', label: 'CHƠI ĐƠN', sub: 'Đấu với máy', act: () => this.go('single') },
            { kind: 'btn', label: 'LUYỆN TẬP', sub: 'Không giới hạn thời gian · chọn số người', act: () => this.go('training') },
            { kind: 'btn', label: 'ĐỐI KHÁNG ONLINE', sub: '1 vs 1 · tạo phòng', act: () => this.go('online') },
            { kind: 'btn', label: 'SHOP', sub: SFC_CONFIG.progression.coreGacha ? 'Hộp gacha · costume & Core' : 'Hộp gacha · costume', act: () => { G().shopBack = 'home'; this.go('shop'); } },
            { kind: 'btn', label: 'NHÂN VẬT', sub: 'Túi đồ · đổi tên', act: () => this.go('char') },
          ];
        case 'name':
          return [{ kind: 'btn', label: 'XÁC NHẬN', main: true, act: () => this.submitName() }];
        case 'char': {
          const d = PF().data, look = d.look, P = PROG();
          const nItems = Object.values(d.items).reduce((a, b) => a + b, 0) + Object.values(d.cores).reduce((a, b) => a + b, 0);
          return [
            { kind: 'btn', label: 'ĐỔI TÊN', sub: d.name, act: () => { this.nameBack = 'char'; this.go('name'); } },
            { kind: 'pick', label: 'MÀU DA', swatch: SFC_CONFIG.teams.skins[look.skin], change: (dd) => PF().setColor('skin', dd) },
            { kind: 'pick', label: 'MÀU TÓC', swatch: P.hairColors[look.hairColor], change: (dd) => PF().setColor('hairColor', dd) },
            { kind: 'btn', label: 'TÚI ĐỒ', sub: `${nItems} món · trang bị · phân rã`, act: () => { G().invBack = 'char'; this.go('inv'); } },
          ];
        }
        case 'single': {
          const opp = o.opp[s.opp];
          return [
            { kind: 'pick', label: 'ĐỘI CỦA BẠN', value: TEAMS().list[o.order[s.team]].name, change: (d) => { s.team = wrap(s.team + d, o.order.length); } },
            { kind: 'pick', label: 'ĐỐI THỦ', value: opp === 'random' ? '??? NGẪU NHIÊN' : TEAMS().list[opp].name, change: (d) => { s.opp = wrap(s.opp + d, o.opp.length); } },
            { kind: 'pick', label: 'ĐỘ KHÓ', value: SFC_CONFIG.game.ai.difficulty[o.diffs[s.diff]].label, change: (d) => { s.diff = wrap(s.diff + d, o.diffs.length); } },
            { kind: 'pick', label: 'ĐIỀU KHIỂN', value: this.ctrlLabel(o.order[s.team], s.ctrl), change: (d) => { s.ctrl = wrap(s.ctrl + d, SFC_CONFIG.game.roles.length + 1); } },
            { kind: 'btn', label: 'BẮT ĐẦU', main: true, act: () => app.startMatch() },
          ];
        }
        case 'training': {
          // luyện tập: số người đội bạn (1 / 2) · đối thủ (0 / 2). Đội / đối thủ / độ khó / điều khiển dùng chung với Chơi đơn
          const t = app.train, opp = o.opp[s.opp];
          const list = [
            { kind: 'pick', label: 'ĐỘI CỦA BẠN', value: TEAMS().list[o.order[s.team]].name, change: (d) => { s.team = wrap(s.team + d, o.order.length); } },
            { kind: 'pick', label: 'SỐ NGƯỜI', value: t.mine + ' NGƯỜI', change: () => { t.mine = t.mine === 1 ? 2 : 1; } },
          ];
          if (t.mine === 2) list.push({ kind: 'pick', label: 'ĐIỀU KHIỂN', value: this.ctrlLabel(o.order[s.team], s.ctrl), change: (d) => { s.ctrl = wrap(s.ctrl + d, SFC_CONFIG.game.roles.length + 1); } });
          list.push({ kind: 'pick', label: 'ĐỐI THỦ', value: t.opp ? t.opp + ' NGƯỜI' : 'KHÔNG CÓ', change: () => { t.opp = t.opp ? 0 : 2; } });
          if (t.opp) {
            list.push({ kind: 'pick', label: 'ĐỘI ĐỐI THỦ', value: opp === 'random' ? '??? NGẪU NHIÊN' : TEAMS().list[opp].name, change: (d) => { s.opp = wrap(s.opp + d, o.opp.length); } });
            list.push({ kind: 'pick', label: 'ĐỘ KHÓ', value: SFC_CONFIG.game.ai.difficulty[o.diffs[s.diff]].label, change: (d) => { s.diff = wrap(s.diff + d, o.diffs.length); } });
          }
          list.push({ kind: 'btn', label: 'BẮT ĐẦU', main: true, act: () => app.startTraining() });
          return list;
        }
        case 'online':
          return [
            { kind: 'btn', label: 'TẠO PHÒNG', sub: 'Bạn là chủ phòng · trận chạy trên máy bạn', act: () => Online().createRoom() },
            { kind: 'btn', label: 'VÀO PHÒNG', sub: 'Nhập mã phòng của bạn bè', act: () => this.go('join') },
          ];
        case 'join':
          return [{ kind: 'btn', label: 'KẾT NỐI', main: true, act: () => this.submitCode() }];
        case 'lobby': {
          const O = Online(), L = O.lobby;
          const mine = O.isHost ? L.host : L.guest;
          const list = [];
          if (mine) list.push({ kind: 'pick', label: 'ĐỘI CỦA BẠN', value: TEAMS().list[mine].name, change: (d) => O.setTeam(d) });
          if (O.isHost) list.push({ kind: 'btn', label: 'BẮT ĐẦU', main: true, disabled: !L.guestIn, act: () => O.startMatch() });
          list.push({ kind: 'btn', label: 'RỜI PHÒNG', act: () => O.leave() });
          return list;
        }
        default:
          return [];
      }
    },

    // CẢ ĐỘI (đổi người bằng Q) hoặc chỉ 1 cầu thủ: tên + vị trí xuất phát
    ctrlLabel(teamId, ctrl) {
      if (!ctrl) return 'CẢ ĐỘI';
      // 1 CẦU THỦ: character của bạn đá vị trí này
      const role = SFC_CONFIG.game.roles[ctrl - 1];
      return `${PF().data.name || 'PLAYER'} · ${ROLE_LABELS[role] || role}`;
    },

    back() {
      if (Online().status === 'busy') return;
      if (this.page === 'name') { if (PF().hasName) this.go(this.nameBack); return; } // lần đầu: bắt buộc đặt tên
      if (G().pages.includes(this.page)) return G().back(this);
      if (['single', 'training', 'online', 'tutorial', 'char'].includes(this.page)) this.go('home');
      else if (this.page === 'join') this.go('online');
      else if (this.page === 'lobby') Online().leave();
    },

    /* ---------------- vẽ ---------------- */
    render() {
      if (!this.el) return;
      const items = this.items();
      if (this.sel >= items.length) this.sel = Math.max(0, items.length - 1);
      this.el.classList.toggle('tut', this.page === 'tutorial' || G().pages.includes(this.page));
      if (this.page === 'tutorial') { this.el.innerHTML = this.renderTutorial(); this.bindAvatars(); return; }
      if (G().pages.includes(this.page)) { G().render(this); this.bindAvatars(); return; }
      const list = items.map((it, i) => this.renderItem(it, i)).join('');
      const titles = { single: 'CHƠI ĐƠN', training: 'LUYỆN TẬP', online: 'ĐỐI KHÁNG ONLINE', join: 'VÀO PHÒNG', lobby: 'PHÒNG CHỜ', name: 'TÊN CỦA BẠN', char: 'NHÂN VẬT' };
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
      const cls = ['mi', it.kind, i === this.sel ? 'sel' : '', it.main ? 'main' : '', it.disabled ? 'dis' : ''].join(' ');
      if (it.kind === 'pick') {
        const val = it.swatch ? `<i class="swatch" style="background:${it.swatch}"></i>` : esc(it.value);
        return `<div class="${cls}" data-i="${i}"><label>${esc(it.label)}</label>
          <div class="picker"><button data-i="${i}" data-d="-1">◀</button><span>${val}</span><button data-i="${i}" data-d="1">▶</button></div></div>`;
      }
      return `<button class="${cls}" data-i="${i}"><span class="mi-label">${esc(it.label)}</span>${it.sub ? `<span class="mi-sub">${esc(it.sub)}</span>` : ''}</button>`;
    },

    hint() {
      if (this.page === 'home') return '↑↓ chọn · Enter · M tắt âm';
      if (this.page === 'join') return 'Gõ mã · Enter kết nối · Esc quay lại';
      if (this.page === 'name') return PF().hasName ? 'Gõ tên (A-Z, 0-9) · Enter xác nhận · Esc quay lại' : 'Gõ tên (A-Z, 0-9) · Enter xác nhận';
      if (this.page === 'lobby') return Online().isHost ? '←→ đổi đội · Enter bắt đầu · Esc rời phòng' : '←→ đổi đội · Esc rời phòng';
      return '↑↓ chọn · ←→ đổi · Enter · Esc quay lại';
    },

    renderRight() {
      const s = this.app.sel, o = this.options();
      if (this.page === 'home') return this.profileCard();
      if (this.page === 'name') return `<div class="char-stage"><canvas class="avatar big" data-avatar="spin"></canvas><div class="char-name">${esc(this.nameBuf || '???')}</div></div>`;
      if (this.page === 'char') return this.charPanel();
      if (this.page === 'single' || this.page === 'training') return teamCard(o.order[s.team], '');
      if (this.page === 'lobby') {
        const O = Online(), L = O.lobby;
        const me = O.isHost ? 'P1 · CHỦ PHÒNG' : 'P2 · KHÁCH';
        const status = O.isHost
          ? (L.guestIn ? '<div class="lb-note ok">Sẵn sàng — Enter để bắt đầu</div>' : '<div class="lb-note">Gửi mã phòng cho bạn bè để cùng chơi</div>')
          : '<div class="lb-note">Chờ chủ phòng bắt đầu trận...</div>';
        const who = (pf) => (pf ? ` · ${pf.name} LV${pf.level}` : '');
        return `<div class="lobby">
          ${teamCard(L.host, (O.isHost ? me + ' (BẠN)' : 'P1 · CHỦ PHÒNG') + who(L.hostPf))}
          <div class="vs">VS</div>
          ${teamCard(L.guestIn ? L.guest : null, (O.isHost ? 'P2 · KHÁCH' : me + ' (BẠN)') + who(L.guestPf))}
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
      return `<div class="room-code" title="Bấm để sao chép"><span class="rc-label">MÃ PHÒNG</span><b data-copy="${esc(code)}">${esc(code)}</b></div>`;
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
        const h = SFC_CONFIG.controls.help;
        body += `<div class="help">
          <div class="help-col"><h4>TẤN CÔNG</h4>${helpTable(h.attack)}</div>
          <div class="help-col"><h4>PHÒNG NGỰ</h4>${helpTable(h.defense)}<h4>ĐỒNG ĐỘI CẦM BÓNG</h4>${helpTable(h.teammateHasBall)}</div>
          <div class="help-col"><h4>HỆ THỐNG</h4>${helpTable(h.system)}</div>
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
        <div class="tut-head"><div class="m-title">HƯỚNG DẪN</div><div class="tabs">${tabs}</div></div>
        <div class="tut-body">${body}</div>
        <div class="m-hint">←→ đổi trang · Esc quay lại</div>`;
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
          <div class="pc-gold">${coin(d.gold)}</div>
          <div class="pc-stats">${st.matches} trận · ${st.wins} thắng · ${st.goals} bàn</div>
        </div>
      </div>`;
    },

    charPanel() {
      const d = PF().data, st = d.stats;
      return `<div class="char-stage">
        <canvas class="avatar big" data-avatar="spin"></canvas>
        <div class="char-name">${esc(d.name)}</div>
        <div class="char-info">${xpBar(d)}<div class="pc-gold">${coin(d.gold)}</div>
          <div class="eq-list">${G().equippedHtml()}</div>
          <div class="pc-stats">${st.matches} trận · ${st.wins} thắng · ${st.draws} hòa · ${st.losses} thua · ${st.goals} bàn · ${st.boxes || 0} hộp</div></div>
      </div>`;
    },

    renderNameInput() {
      const n = PROG().nameMaxLength;
      const txt = esc(this.nameBuf);
      return `<div class="name-in"><span>${txt}</span><i class="caret"></i><em>${this.nameBuf.length}/${n}</em></div>`;
    },

    submitName() {
      if (!PF().setName(this.nameBuf)) { this.setMsg('Tên cần ít nhất 1 ký tự (A-Z, 0-9).', true); return; }
      SFC.Audio.pick();
      const back = this.nameBack;
      this.nameBack = 'home';
      this.go(back);
    },

    // gắn canvas character: look = hồ sơ hiện tại, hoặc bản "mặc thử" trong Shop (data-try)
    bindAvatars() {
      this.avatars = [...this.el.querySelectorAll('canvas[data-avatar]')].map((cv) => {
        const big = cv.classList.contains('big');
        cv.width = 40; cv.height = 44;
        const tryOn = cv.dataset.try;
        let look = PF().data.look;
        if (tryOn) { const it = PROG().items[tryOn]; look = Object.assign({}, look, { [it.slot]: tryOn }); }
        return { cv, look: PF().lookOf(look), big };
      });
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
        SFC.Sprites.drawAvatar(a.cv, a.look, kit, this.animT, facing);
      }
    },

    input(input) {
      // phòng chờ: chỉ Esc mới rời phòng (tránh bấm nhầm Backspace)
      const back = input.wasPressed('pause') || (this.page !== 'lobby' && input.wasPressed('back'));
      if (back) { SFC.Audio.menu(); return this.back(); }
      if (G().pages.includes(this.page)) return G().input(this, input);
      if (this.page === 'name' && input.wasPressed('confirm')) return this.submitName();
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
    },

    submitCode() {
      if (this.code.length < SFC_CONFIG.net.codeLength) { this.setMsg('Mã phòng gồm ' + SFC_CONFIG.net.codeLength + ' ký tự.', true); return; }
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
          if (navigator.clipboard) navigator.clipboard.writeText(code).then(() => this.setMsg('Đã sao chép mã phòng ' + code), () => {});
          return;
        }
        if (G().pages.includes(this.page) && G().click(this, e)) return;
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
