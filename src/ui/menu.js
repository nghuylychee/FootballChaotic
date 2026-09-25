/* Menu — các màn ngoài trận: Trang chủ · Chơi đơn · Online (tạo / vào phòng / phòng chờ) · Hướng dẫn
 * Mỗi trang khai báo danh sách mục (items): nút (btn) hoặc bộ chọn ←→ (pick).
 * ↑↓ chọn mục · ←→ đổi giá trị · Enter xác nhận · Esc / Backspace quay lại
 */
window.SFC = window.SFC || {};

(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const TEAMS = () => SFC_CONFIG.teams;
  const STAT_LABELS = { speed: 'TỐC ĐỘ', power: 'LỰC SÚT', pass: 'CHUYỀN', tackle: 'TẮC BÓNG', dribble: 'RÊ DẮT', accuracy: 'CHÍNH XÁC' };
  const Online = () => SFC.Online;

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
      this.setTextMode(page === 'join');
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
            { kind: 'btn', label: 'ĐỐI KHÁNG ONLINE', sub: '1 vs 1 · tạo phòng', act: () => this.go('online') },
            { kind: 'btn', label: 'HƯỚNG DẪN', sub: 'Điều khiển · luật · Core', act: () => { this.tutPage = 0; this.go('tutorial'); } },
          ];
        case 'single': {
          const opp = o.opp[s.opp];
          return [
            { kind: 'pick', label: 'ĐỘI CỦA BẠN', value: TEAMS().list[o.order[s.team]].name, change: (d) => { s.team = wrap(s.team + d, o.order.length); } },
            { kind: 'pick', label: 'ĐỐI THỦ', value: opp === 'random' ? '??? NGẪU NHIÊN' : TEAMS().list[opp].name, change: (d) => { s.opp = wrap(s.opp + d, o.opp.length); } },
            { kind: 'pick', label: 'ĐỘ KHÓ', value: SFC_CONFIG.game.ai.difficulty[o.diffs[s.diff]].label, change: (d) => { s.diff = wrap(s.diff + d, o.diffs.length); } },
            { kind: 'btn', label: 'BẮT ĐẦU', main: true, act: () => app.startMatch() },
          ];
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

    back() {
      if (Online().status === 'busy') return;
      if (this.page === 'single' || this.page === 'online' || this.page === 'tutorial') this.go('home');
      else if (this.page === 'join') this.go('online');
      else if (this.page === 'lobby') Online().leave();
    },

    /* ---------------- vẽ ---------------- */
    render() {
      if (!this.el) return;
      const items = this.items();
      if (this.sel >= items.length) this.sel = Math.max(0, items.length - 1);
      this.el.classList.toggle('tut', this.page === 'tutorial');
      if (this.page === 'tutorial') { this.el.innerHTML = this.renderTutorial(); return; }
      const list = items.map((it, i) => this.renderItem(it, i)).join('');
      const titles = { single: 'CHƠI ĐƠN', online: 'ĐỐI KHÁNG ONLINE', join: 'VÀO PHÒNG', lobby: 'PHÒNG CHỜ' };
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
          ${this.page === 'lobby' ? this.renderRoomCode() : ''}
          <div class="m-items">${list}</div>
          ${msg}
          <div class="m-hint">${this.hint()}</div>
        </div>
        <div class="m-right">${this.renderRight()}</div>`;
    },

    renderItem(it, i) {
      const cls = ['mi', it.kind, i === this.sel ? 'sel' : '', it.main ? 'main' : '', it.disabled ? 'dis' : ''].join(' ');
      if (it.kind === 'pick') {
        return `<div class="${cls}" data-i="${i}"><label>${esc(it.label)}</label>
          <div class="picker"><button data-i="${i}" data-d="-1">◀</button><span>${esc(it.value)}</span><button data-i="${i}" data-d="1">▶</button></div></div>`;
      }
      return `<button class="${cls}" data-i="${i}"><span class="mi-label">${esc(it.label)}</span>${it.sub ? `<span class="mi-sub">${esc(it.sub)}</span>` : ''}</button>`;
    },

    hint() {
      if (this.page === 'home') return '↑↓ chọn · Enter · M tắt âm';
      if (this.page === 'join') return 'Gõ mã · Enter kết nối · Esc quay lại';
      if (this.page === 'lobby') return Online().isHost ? '←→ đổi đội · Enter bắt đầu · Esc rời phòng' : '←→ đổi đội · Esc rời phòng';
      return '↑↓ chọn · ←→ đổi · Enter · Esc quay lại';
    },

    renderRight() {
      const s = this.app.sel, o = this.options();
      if (this.page === 'single') return teamCard(o.order[s.team], '');
      if (this.page === 'lobby') {
        const O = Online(), L = O.lobby;
        const me = O.isHost ? 'P1 · CHỦ PHÒNG' : 'P2 · KHÁCH';
        const status = O.isHost
          ? (L.guestIn ? '<div class="lb-note ok">Sẵn sàng — Enter để bắt đầu</div>' : '<div class="lb-note">Gửi mã phòng cho bạn bè để cùng chơi</div>')
          : '<div class="lb-note">Chờ chủ phòng bắt đầu trận...</div>';
        return `<div class="lobby">
          ${teamCard(L.host, O.isHost ? me + ' (BẠN)' : 'P1 · CHỦ PHÒNG')}
          <div class="vs">VS</div>
          ${teamCard(L.guestIn ? L.guest : null, O.isHost ? 'P2 · KHÁCH' : me + ' (BẠN)')}
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
        const groups = Object.keys(C.categories).map((cat) => {
          const c = C.categories[cat];
          const list = Object.keys(C.list).filter((id) => C.list[id].category === cat)
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
    input(input) {
      // phòng chờ: chỉ Esc mới rời phòng (tránh bấm nhầm Backspace)
      const back = input.wasPressed('pause') || (this.page !== 'lobby' && input.wasPressed('back'));
      if (back) { SFC.Audio.menu(); return this.back(); }
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

    // trang Vào phòng: gõ chữ/số trực tiếp
    setTextMode(on) {
      const I = SFC.Input;
      if (!on) { I.textHandler = null; I.pasteHandler = null; return; }
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
