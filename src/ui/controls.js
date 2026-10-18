/* Controls view — trang Settings > Controls: ĐỔI PHÍM các action trong trận (bàn phím / tay cầm).
 * Trên: hình bàn phím / tay cầm, phím của action đang chọn sáng lên. Dưới: danh sách action 2 cột, chọn + Enter (hoặc bấm chuột)
 * rồi nhấn phím / nút mới. Phím đã thuộc action khác -> 2 action đổi phím cho nhau (Settings.rebind).
 * Danh sách action đổi được: controls.remap · tên action: controls.legend. Phím menu (confirm, back, tabPrev...) cố định.
 */
window.SFC = window.SFC || {};

(function () {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const CFG = () => SFC_CONFIG.controls;
  const I = () => SFC.Input;
  const TABS = ['kb', 'xbox', 'ps'];   // XBOX / PLAYSTATION: cùng 1 bộ phím tay cầm, chỉ khác nhãn nút
  const DIRS = ['up', 'down', 'left', 'right'];
  const ARROW = { up: '↑', down: '↓', left: '←', right: '→' };
  const wrap = (v, n) => ((v % n) + n) % n;
  const MSG_HIDE = 2500;   // (ms) thông báo đổi phím tự ẩn

  // 2 cột: di chuyển + chung | chuyền / sút / kỹ năng. 'move' = dòng khoá (tay cầm: cần analog / D-pad), 'reset' = về mặc định.
  // Đổi người (switch) tạm ẩn: mọi trận hiện khoá người chơi vào 1 cầu thủ (opts.solo) nên phím không làm gì
  const COLS = {
    kb:  [['up', 'down', 'left', 'right', 'sprint', 'ultimate'], ['pass', 'through', 'lob', 'shoot', 'skill', 'reset']],
    pad: [['move', 'sprint', 'skill', 'ultimate'], ['pass', 'through', 'lob', 'shoot', 'reset']],
  };
  const pickable = (id) => id !== 'move';

  // màu phím trên hình: sel = action đang chọn · play = dùng trong trận · sys = menu / hệ thống
  function keyKind(code, sel) {
    if (sel && code === sel) return 'sel';
    const B = CFG().bindings, R = CFG().remap;
    const acts = Object.keys(B).filter((a) => B[a].includes(code));
    if (!acts.length) return '';
    return acts.some((a) => R.kb.includes(a) || R.pad.includes(a)) ? 'play' : 'sys';
  }

  /* ================= TAY CẦM ================= */
  // nét trắng trên nền tối (kiểu Hollow Knight): cần analog 2 vòng, D-pad chữ thập, nút mặt tròn trơn,
  // vai (LB / RB) là dải ôm mép trên thân, cò (LT / RT) là mấu bo tròn ngồi trên vai. Toạ độ theo khung ~550 x 390
  const GEO = {
    xbox: {
      view: '8 0 534 398',
      body: 'M275 64 C240 64 220 56 190 54 C140 50 100 56 78 74 C52 96 36 150 28 210 C20 270 18 330 36 362 C52 390 92 392 112 368 C132 344 150 300 190 286 C220 276 250 270 275 270 C300 270 330 276 360 286 C400 300 418 344 438 368 C458 392 498 390 514 362 C532 330 530 270 522 210 C514 150 498 96 472 74 C450 56 410 50 360 54 C330 56 310 64 275 64 Z',
      LB: 'M82 72 C96 46 130 33 172 33 C194 33 205 39 208 53 C176 50 134 50 108 58 C98 62 90 66 82 72 Z',
      RB: 'M468 72 C454 46 420 33 378 33 C356 33 345 39 342 53 C374 50 416 50 442 58 C452 62 460 66 468 72 Z',
      LT: 'M117 44 L120 18 C121 11 125 7 132 7 L146 7 C153 7 157 11 158 18 L161 40 Z',
      RT: 'M433 44 L430 18 C429 11 425 7 418 7 L404 7 C397 7 393 11 392 18 L389 40 Z',
      LS: [135, 128, 45, 27], RS: [338, 210, 46, 27], DPAD: [205, 212, 0, 24, 72],
      VIEW: [220, 128], MENU: [322, 128], small: 'sq', HOME: [272, 130, 26], FACE: [408, 126, 18, 38],
    },
    ps: {
      view: '4 0 542 398',
      body: 'M275 58 L380 58 C440 56 480 70 500 100 C520 140 540 240 536 320 C534 370 500 392 470 372 C446 356 432 316 414 298 C402 290 384 286 360 286 L190 286 C166 286 148 290 136 298 C118 316 104 356 80 372 C50 392 16 370 14 320 C10 240 30 140 50 100 C70 70 110 56 170 58 L275 58 Z',
      LB: 'M58 98 C72 62 106 40 160 38 L198 38 L198 58 L170 58 C116 57 80 68 58 98 Z',
      RB: 'M492 98 C478 62 444 40 390 38 L352 38 L352 58 L380 58 C434 57 470 68 492 98 Z',
      LT: 'M107 46 L110 18 C111 11 116 7 123 7 L147 7 C154 7 159 11 160 18 L163 40 Z',
      RT: 'M443 46 L440 18 C439 11 434 7 427 7 L403 7 C396 7 391 11 390 18 L387 40 Z',
      LS: [205, 214, 42, 25], RS: [345, 214, 42, 25], DPAD: [118, 138, 0, 26, 84],
      VIEW: [176, 92], MENU: [374, 92], small: 'pill', HOME: [275, 196, 13], FACE: [430, 138, 19, 40], PAD: [196, 64, 158, 88],
    },
  };

  // sel = mã nút của action đang chọn ('Pad.X') -> nút đó sáng lên
  function padSvg(style, sel) {
    const G = GEO[style];
    const k = (id) => keyKind('Pad.' + id, sel);
    const shape = (id) => `<path class="cv-line ${k(id)}" d="${G[id]}"/>`;
    const stick = (id) => {
      const [x, y, r1, r2] = G[id];
      return `<g class="${k(id)}"><circle class="cv-line" cx="${x}" cy="${y}" r="${r1}"/><circle class="cv-line thin" cx="${x}" cy="${y}" r="${r2}"/></g>`;
    };
    const [dx, dy, dr, arm, len] = G.DPAD, a = arm / 2, l = len / 2;
    const cross = `<path class="cv-line thin" d="M${dx - a} ${dy - l} h${arm} v${l - a} h${l - a} v${arm} h${-(l - a)} v${l - a} h${-arm} v${-(l - a)} h${-(l - a)} v${-arm} h${l - a} Z"/>`;
    const dpad = `<g class="play">${dr ? `<circle class="cv-line" cx="${dx}" cy="${dy}" r="${dr}"/>` : ''}${cross}</g>`;
    const [fx, fy, fr, gap] = G.FACE;
    const face = ['Y', 'B', 'X', 'A'].map((id) => {
      const [x, y] = { Y: [fx, fy - gap], B: [fx + gap, fy], X: [fx - gap, fy], A: [fx, fy + gap] }[id];
      return `<circle class="cv-line ${k(id)}" cx="${x}" cy="${y}" r="${fr}"/>`;
    }).join('');
    // View / Menu (Xbox: ô vuông bo nhỏ) · Create / Options (PlayStation: nút dài dọc)
    const small = (id) => {
      const [x, y] = G[id === 'Back' ? 'VIEW' : 'MENU'];
      return G.small === 'sq' ? `<rect class="cv-line thin ${k(id)}" x="${x - 9}" y="${y - 9}" width="18" height="18" rx="5"/>` : `<rect class="cv-line thin ${k(id)}" x="${x - 6}" y="${y - 13}" width="12" height="26" rx="6"/>`;
    };
    const [hx, hy, hr] = G.HOME;
    const pad = G.PAD ? `<rect class="cv-line thin" x="${G.PAD[0]}" y="${G.PAD[1]}" width="${G.PAD[2]}" height="${G.PAD[3]}" rx="14"/>` : '';
    return `<svg class="cv ${style}" viewBox="${G.view}" xmlns="http://www.w3.org/2000/svg">
      ${shape('LT')}${shape('RT')}${shape('LB')}${shape('RB')}
      <path class="cv-line" d="${G.body}"/>
      ${pad}<circle class="cv-line" cx="${hx}" cy="${hy}" r="${hr}"/>${small('Back')}${small('Start')}
      ${stick('LS')}${stick('RS')}${dpad}${face}
    </svg>`;
  }

  /* ================= BÀN PHÍM ================= */
  // [code, nhãn, độ rộng (đơn vị phím)] — không có code = phím trống
  const KB_ROWS = [
    [['Escape', 'Esc'], ['Digit1', '1'], ['Digit2', '2'], ['Digit3', '3'], ['Digit4', '4'], ['Digit5', '5'], ['Digit6', '6'], ['Digit7', '7'], ['Digit8', '8'], ['Digit9', '9'], ['Digit0', '0'], ['Minus', '-'], ['Equal', '='], ['Backspace', '⌫', 2]],
    [['Tab', 'Tab', 1.5], ['KeyQ', 'Q'], ['KeyW', 'W'], ['KeyE', 'E'], ['KeyR', 'R'], ['KeyT', 'T'], ['KeyY', 'Y'], ['KeyU', 'U'], ['KeyI', 'I'], ['KeyO', 'O'], ['KeyP', 'P'], ['BracketLeft', '['], ['BracketRight', ']'], ['Backslash', '\\', 1.5]],
    [['CapsLock', 'Caps', 1.75], ['KeyA', 'A'], ['KeyS', 'S'], ['KeyD', 'D'], ['KeyF', 'F'], ['KeyG', 'G'], ['KeyH', 'H'], ['KeyJ', 'J'], ['KeyK', 'K'], ['KeyL', 'L'], ['Semicolon', ';'], ['Quote', "'"], ['Enter', 'Enter', 2.25]],
    [['ShiftLeft', 'Shift', 2.25], ['KeyZ', 'Z'], ['KeyX', 'X'], ['KeyC', 'C'], ['KeyV', 'V'], ['KeyB', 'B'], ['KeyN', 'N'], ['KeyM', 'M'], ['Comma', ','], ['Period', '.'], ['Slash', '/'], ['ShiftRight', 'Shift', 2.75]],
    [['ControlLeft', 'Ctrl', 1.5], ['AltLeft', 'Alt', 1.5], ['Space', 'Space', 9], ['AltRight', 'Alt', 1.5], ['ControlRight', 'Ctrl', 1.5]],
  ];
  const ARROWS = [['ArrowUp', '↑', 1, 3], ['ArrowLeft', '←', 0, 4], ['ArrowDown', '↓', 1, 4], ['ArrowRight', '→', 2, 4]];
  const U = 25, PITCH = 28, KH = 5 * PITCH;
  const kbKeys = (a, n = 2) => (CFG().bindings[a] || []).filter((c) => !c.startsWith('Pad.')).slice(0, n).map((c) => `<kbd>${esc(I().keyName(c))}</kbd>`).join('');

  function kbSvg(sel) {
    const kbW = 15 * PITCH + 0.5 * PITCH + 3 * PITCH;
    const keys = [];
    const key = (code, label, x, y, w) => {
      const kw = w * PITCH - (PITCH - U);
      keys.push(`<g class="kk ${keyKind(code, sel)}"><rect x="${x}" y="${y}" width="${kw}" height="${U}" rx="2"/>
        <text x="${x + kw / 2}" y="${y + U / 2 + 4}" text-anchor="middle">${esc(label)}</text></g>`);
    };
    KB_ROWS.forEach((row, r) => {
      let x = 0;
      for (const [code, label, w = 1] of row) { key(code, label, x, r * PITCH + 2, w); x += w * PITCH; }
    });
    const ax = 15.5 * PITCH;
    for (const [code, label, c, r] of ARROWS) key(code, label, ax + c * PITCH, r * PITCH + 2, 1);
    return `<svg class="kv" viewBox="-2 0 ${kbW + 4} ${KH + 2}" xmlns="http://www.w3.org/2000/svg">${keys.join('')}</svg>`;
  }

  /* ================= TRANG ================= */
  SFC.ControlsView = {
    view: 'kb',
    sel: 0,          // chỉ số trong order() (đọc theo cột: hết cột trái tới cột phải)
    cap: null,       // đang chờ phím mới: action
    msg: '', msgErr: false, msgAt: 0,

    // mở trang: hiện đúng thiết bị đang dùng
    open() {
      this.view = I().device === 'pad' ? 'pad' : 'kb';
      this.padStyle = SFC.Pad.style || 'xbox';
      this.sel = this.order().indexOf(this.view === 'pad' ? 'sprint' : 'up');
      this.stop();
      this.msg = '';
    },

    order() { return COLS[this.view].flat(); },
    // [cột, hàng] của 1 ô trong order()
    cell(i) {
      const [a] = COLS[this.view];
      return i < a.length ? [0, i] : [1, i - a.length];
    },
    style() { return this.padStyle || 'xbox'; },
    tab() { return this.view === 'kb' ? 'kb' : this.style(); },
    // nhãn phím đang gán cho action trên thiết bị đang xem
    keyLabel(a) {
      const c = I().codeOf(a, this.view);
      if (!c) return '—';
      return this.view === 'pad' ? SFC.Pad.label(c, this.style()) : I().keyName(c);
    },
    actName(a) {
      const L = CFG().legend;
      return DIRS.includes(a) ? `${L.move.atk} ${ARROW[a]}` : L[a].atk;
    },

    row(id, i) {
      const _t = SFC.t, sel = i === this.sel, cls = ['rm-row'];
      if (sel) cls.push('sel');
      if (id === 'reset') {
        if (SFC.Settings.bindsChanged(this.view)) cls.push('on');
        return `<div class="${cls.join(' ')} rm-reset" data-rm="${i}"><b>${esc(_t('RESET TO DEFAULT'))}</b></div>`;
      }
      if (id === 'move') {
        return `<div class="rm-row lock"><kbd>${esc(this.style() === 'ps' ? 'L' : 'LS')}</kbd><kbd>✚</kbd><b>${esc(CFG().legend.move.atk)}</b></div>`;
      }
      const def = DIRS.includes(id) ? '' : CFG().legend[id].def;
      const code = I().codeOf(id, this.view), dflt = (I().defaults[id] || []).find((c) => c.startsWith('Pad.') === (this.view === 'pad'));
      if (code !== dflt) cls.push('chg');
      if (this.cap === id) cls.push('cap');
      const key = this.cap === id ? '…' : this.keyLabel(id);
      return `<div class="${cls.join(' ')}" data-rm="${i}"><kbd${this.view === 'pad' && this.style() === 'ps' && /[^\x00-\x7f]/.test(key) ? ' class="sym"' : ''}>${esc(key)}</kbd><b>${esc(this.actName(id))}</b>${def ? `<i><em>${esc(_t('DEF'))}</em> ${esc(def)}</i>` : ''}</div>`;
    },

    render() {
      const _t = SFC.t, K = (a, kb) => esc(I().key(a, kb));
      const tabs = TABS.map((id) => `<button class="tab ${id === this.tab() ? 'sel' : ''}" data-ctab="${id}">${esc(id === 'kb' ? _t('KEYBOARD') : id === 'ps' ? 'PLAYSTATION' : 'XBOX')}</button>`).join('');
      const order = this.order(), selId = order[this.sel];
      const selCode = pickable(selId) && selId !== 'reset' ? I().codeOf(selId, this.view) : null;
      let i = 0;
      const cols = COLS[this.view].map((col) => `<div class="rm-col">${col.map((id) => this.row(id, i++)).join('')}</div>`).join('');
      let pic, note;
      if (this.view === 'kb') {
        pic = kbSvg(selCode);
        note = _t(SFC_CONFIG.cores.draft.rerollsPerRound ? 'Menus: {confirm} confirm · {back} back · {pick} pick Core · {reroll} reroll 3 Cores' : 'Menus: {confirm} confirm · {back} back · {pick} pick Core', {
          confirm: kbKeys('confirm'), back: kbKeys('pause', 1) + kbKeys('back', 1), pick: kbKeys('pick1', 1) + kbKeys('pick2', 1) + kbKeys('pick3', 1), reroll: kbKeys('reroll') });
      } else {
        pic = padSvg(this.style(), selCode);
        const lb = (a) => { const c = (CFG().bindings[a] || []).find((x) => x.startsWith('Pad.')); return `<kbd>${c ? esc(SFC.Pad.label(c, this.style())) : '?'}</kbd>`; };
        note = _t('Menus: D-pad / stick to move · {confirm} confirm · {back} back · Teammate on the ball: {call} call for a pass', {
          confirm: lb('confirm'), back: lb('back'), call: `${lb('pass')} ${lb('through')} ${lb('lob')}` });
      }
      // đang chờ phím mới: lời nhắc thay dòng phím menu (dòng m-hint bị ẩn ở mọi màn menu)
      if (this.cap) {
        const v = { action: esc(this.actName(this.cap)), cancel: `<kbd>${this.view === 'pad' ? esc(SFC.Pad.label('Pad.Start', this.style())) : 'Esc'}</kbd>` };
        note = this.view === 'pad' ? _t('Press a button for {action} · {cancel} cancel', v) : _t('Press a key for {action} · {cancel} cancel', v);
      }
      const hint = _t('↑↓←→ select · {ok} change key · {tabs} keyboard / controller · {back} back',
          { ok: K('confirm', 'Enter'), tabs: `${K('tabPrev', 'Q')} / ${K('tabNext', 'E')}`, back: K('back', 'Esc') });
      const msg = this.msg ? `<div class="m-msg rm-msg ${this.msgErr ? 'err' : ''}">${esc(this.msg)}</div>` : '';
      return `
        <div class="tut-head"><div class="m-title">${esc(_t('CONTROLS'))}</div><div class="tabs">${tabs}</div></div>
        <div class="tut-body ctl-body ${this.view}">${pic}
          <div class="rm-list">${cols}</div>
          <div class="cv-note${this.cap ? ' cap' : ''}">${note}</div>
        </div>
        ${msg}<div class="m-hint">${hint}</div>`;
    },

    setMsg(menu, text, err = false) { this.msg = text; this.msgErr = err; this.msgAt = performance.now(); menu.render(); },

    /* ---------- đổi phím ---------- */
    start(menu, id) {
      this.cap = id;
      this.msg = '';
      // bàn phím: bắt phím thô trước khi thành action (Input.textHandler); tay cầm: đọc nút trong input()
      I().textHandler = (e) => {
        if (e.repeat) return true;
        if (e.code === 'Escape') this.stop(menu);
        else if (this.view === 'kb') this.apply(menu, e.code);
        return true;
      };
      SFC.Audio.menu();
      menu.render();
    },
    stop(menu) {
      if (I().textHandler && this.cap) I().textHandler = null;
      this.cap = null;
      if (menu) menu.render();
    },
    apply(menu, code) {
      const _t = SFC.t, id = this.cap, r = SFC.Settings.rebind(this.view, id, code);
      if (r.err === 'reserved') return this.setMsg(menu, _t('{key} is kept for {action}', { key: I().codeLabel(code, this.style()), action: CFG().legend[r.by].atk }), true);
      if (r.err) return this.setMsg(menu, _t("That key can't be used"), true);
      this.stop();
      this.msg = '';
      SFC.Audio.menu();
      if (r.swap) this.setMsg(menu, _t('Swapped with {action}', { action: this.actName(r.swap) }));
      else menu.render();
    },
    activate(menu, i) {
      const id = this.order()[i];
      if (!pickable(id)) return;
      if (id === 'reset') {
        if (!SFC.Settings.bindsChanged(this.view)) return;
        SFC.Settings.resetBinds(this.view);
        SFC.Audio.menu();
        return menu.render();
      }
      this.start(menu, id);
    },
    // tab: 'kb' | 'xbox' | 'ps' — đổi giữa XBOX / PLAYSTATION giữ nguyên dòng đang chọn
    setView(menu, tab) {
      if (tab === this.tab()) return;
      this.stop();
      const v = tab === 'kb' ? 'kb' : 'pad';
      if (tab !== 'kb') this.padStyle = tab;
      if (v !== this.view) { this.view = v; this.sel = this.order().indexOf('sprint'); }
      this.msg = '';
      SFC.Audio.menu();
      menu.render();
    },

    // gọi trước mọi xử lý phím của menu khi đang chờ phím (Esc / B không thoát trang)
    get capturing() { return !!this.cap; },

    input(menu, input) {
      if (this.msg && performance.now() - this.msgAt > MSG_HIDE) { this.msg = ''; menu.render(); }
      if (this.cap) {
        if (this.view !== 'pad') return;   // bàn phím: textHandler
        for (const c of input.pressed) {
          if (!c.startsWith('Pad.')) continue;
          if (c === 'Pad.Start') return this.stop(menu);
          if (/^Pad\.(Stick)?(Up|Down|Left|Right)$/.test(c)) continue;
          return this.apply(menu, c);
        }
        return;
      }
      const dt = (input.wasPressed('tabNext') ? 1 : 0) - (input.wasPressed('tabPrev') ? 1 : 0);
      if (dt) return this.setView(menu, TABS[wrap(TABS.indexOf(this.tab()) + dt, TABS.length)]);
      if (input.wasPressed('confirm')) return this.activate(menu, this.sel);
      const order = this.order(), cols = COLS[this.view];
      let [c, r] = this.cell(this.sel);
      const dy = (input.wasPressed('down') ? 1 : 0) - (input.wasPressed('up') ? 1 : 0);
      const dx = (input.wasPressed('right') ? 1 : 0) - (input.wasPressed('left') ? 1 : 0);
      if (!dx && !dy) return;
      if (dx) { c = wrap(c + dx, 2); r = Math.min(r, cols[c].length - 1); }
      if (dy) r = wrap(r + dy, cols[c].length);
      // dòng khoá (tay cầm: di chuyển) -> bỏ qua theo hướng đang đi
      if (!pickable(cols[c][r])) r = wrap(r + (dy || 1), cols[c].length);
      this.sel = c === 0 ? r : cols[0].length + r;
      if (order[this.sel] == null) this.sel = 0;
      SFC.Audio.menu();
      menu.render();
    },

    click(menu, e) {
      const t = e.target.closest('[data-ctab]');
      if (t) { this.setView(menu, t.dataset.ctab); return true; }
      const row = e.target.closest('[data-rm]');
      if (row) {
        if (this.cap) this.stop();
        this.sel = +row.dataset.rm;
        this.activate(menu, this.sel);
        menu.render();
        return true;
      }
      if (this.cap) { this.stop(menu); return true; }
      return false;
    },
  };
})();
