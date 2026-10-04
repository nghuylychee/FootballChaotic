/* Controls view — trang Settings > Controls: hình tay cầm (Xbox / PlayStation) có chú thích từng nút,
 * và hình bàn phím tô màu các phím dùng trong game. Tự sinh từ controls.config.js (bindings + legend),
 * nên đổi phím trong config thì hình vẽ đổi theo.
 */
window.SFC = window.SFC || {};

(function () {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const CFG = () => SFC_CONFIG.controls;
  const VIEWS = [['kb', 'KEYBOARD'], ['xbox', 'XBOX'], ['ps', 'PLAYSTATION']];   // tên tab: KEYBOARD dịch lúc vẽ, tên hãng giữ nguyên
  const DIRS = ['up', 'down', 'left', 'right'];
  const wrap = (v, n) => ((v % n) + n) % n;

  // các action gán vào 1 mã phím / nút (chỉ những action có chú thích trong legend = dùng trong trận)
  function actionsOf(codes) {
    const B = CFG().bindings, L = CFG().legend, out = [];
    if (DIRS.some((d) => (B[d] || []).some((c) => codes.includes(c)))) out.push('move');
    for (const a of Object.keys(L)) if (a !== 'move' && (B[a] || []).some((c) => codes.includes(c))) out.push(a);
    return out;
  }

  // dòng chú thích: [tấn công, phòng ngự]
  function legendLines(acts) {
    const L = CFG().legend;
    const atk = acts.map((a) => L[a].atk).filter(Boolean).join(' / ');
    const def = acts.map((a) => L[a].def).filter(Boolean).join(' / ');
    return { atk, def };
  }

  /* ================= TAY CẦM ================= */
  // toạ độ trong khung tay cầm (228 x 150); vị trí cần / D-pad khác nhau giữa Xbox và PlayStation
  const ANCHORS = {
    xbox: { LS: [58, 58], DPAD: [84, 96], RS: [144, 96], VIEW: [96, 52], MENU: [132, 52], HOME: [114, 36] },
    ps:   { DPAD: [56, 60], LS: [84, 98], RS: [144, 98], VIEW: [78, 38], MENU: [150, 38], HOME: [114, 78] },
  };
  const FACE = [170, 60], FACE_GAP = 14;
  const FACE_COLORS = {
    xbox: { A: '#6cc24a', B: '#e2453c', X: '#3a8fe0', Y: '#f2c230' },
    ps:   { A: '#8fb0f0', B: '#f0636b', X: '#e58ad1', Y: '#3fc6a4' },
  };
  // các nút có chú thích: id, mã phím ảo, toạ độ, vị trí nhãn (L / R = cột trái / phải · TL / TR = phía trên)
  function padButtons(style) {
    const A = ANCHORS[style];
    const [fx, fy] = FACE;
    return [
      { id: 'LT', codes: ['Pad.LT'], at: [48, 6], side: 'L' },
      { id: 'LB', codes: ['Pad.LB'], at: [50, 19], side: 'L' },
      { id: 'Back', codes: ['Pad.Back'], at: A.VIEW, side: 'TL' },
      { id: 'LS', codes: ['Pad.StickUp', 'Pad.StickDown', 'Pad.StickLeft', 'Pad.StickRight', 'Pad.LS'], at: A.LS, side: 'L', chip: style === 'ps' ? 'L' : 'LS' },
      { id: 'DPAD', codes: ['Pad.Up', 'Pad.Down', 'Pad.Left', 'Pad.Right'], at: A.DPAD, side: 'L', chip: '✚' },
      { id: 'RT', codes: ['Pad.RT'], at: [180, 6], side: 'R' },
      { id: 'RB', codes: ['Pad.RB'], at: [178, 19], side: 'R' },
      { id: 'Start', codes: ['Pad.Start'], at: A.MENU, side: 'TR' },
      { id: 'Y', codes: ['Pad.Y'], at: [fx, fy - FACE_GAP], side: 'R', face: true },
      { id: 'B', codes: ['Pad.B'], at: [fx + FACE_GAP, fy], side: 'R', face: true },
      { id: 'X', codes: ['Pad.X'], at: [fx - FACE_GAP, fy], side: 'R', face: true },
      { id: 'A', codes: ['Pad.A'], at: [fx, fy + FACE_GAP], side: 'R', face: true },
      { id: 'RS', codes: ['Pad.RS'], at: A.RS, side: 'R', chip: style === 'ps' ? 'R' : 'RS' },
    ];
  }

  const W = 596, H = 250;          // khung SVG (vừa thân trang 640x360)
  const OX = 184, OY = 50;         // vị trí tay cầm trong khung
  const BODY = 'M50 24 H178 C204 24 216 38 222 64 L230 114 C234 138 214 152 198 140 L172 114 H56 L30 140 C14 152 -6 138 -2 114 L6 64 C12 38 24 24 50 24 Z';

  function padSvg(style) {
    const P = SFC.Pad, A = ANCHORS[style], colors = FACE_COLORS[style];
    const btns = padButtons(style).map((b) => Object.assign(b, { acts: actionsOf(b.codes) })).filter((b) => b.acts.length);

    // nhãn: 2 cột trái / phải xếp theo y của nút (ít đường chéo nhau); View / Menu nhỏ ở giữa -> nhãn phía trên tay cầm
    const lines = [], labels = [];
    const label = (b, x, y, left) => {
      const chip = b.chip || P.label('Pad.' + b.id, style);
      const sym = /[^\x00-\x7f]/.test(chip);   // ✕ ○ □ △ ✚: font to hơn cho dễ nhìn
      const cw = sym ? 18 : Math.max(16, chip.length * 5 + 8);
      const cx = left ? x - cw : x;
      const { atk, def } = legendLines(b.acts);
      const fill = b.face ? colors[b.id] : null;
      const tx = left ? cx - 4 : cx + cw + 4, anchor = left ? 'end' : 'start';
      const two = atk && def;
      const text = [
        // nút 2 công dụng: ATK (đỏ) / DEF (xanh) mỗi dòng một; chỉ tấn công: chữ trắng không nhãn; chỉ phòng ngự: DEF (xanh)
        atk ? `<text class="cv-atk${two ? ' both' : ''}" x="${tx}" y="${two ? y - 1 : y + 4}" text-anchor="${anchor}">${two ? `<tspan class="cv-tag">${esc(SFC.t('ATK'))} </tspan>` : ''}${esc(atk)}</text>` : '',
        def ? `<text class="cv-def" x="${tx}" y="${two ? y + 10 : y + 4}" text-anchor="${anchor}"><tspan class="cv-tag">${esc(SFC.t('DEF'))} </tspan>${esc(def)}</text>` : '',
      ].join('');
      labels.push(`<g class="cv-label"><rect class="cv-chip" x="${cx}" y="${y - 7}" width="${cw}" height="14" rx="2"${fill ? ` style="stroke:${fill}"` : ''}/>
        <text class="cv-chip-t${sym ? ' sym' : ''}" x="${cx + cw / 2}" y="${y + (sym ? 4 : 3)}" text-anchor="middle"${fill ? ` style="fill:${fill}"` : ''}>${esc(chip)}</text>${text}</g>`);
    };
    for (const side of ['L', 'R']) {
      // cùng độ cao: nút xa tâm hơn (B) xếp trước nút gần tâm (X)
      const list = btns.filter((b) => b.side === side).sort((a, b) => a.at[1] - b.at[1] || b.at[0] - a.at[0]);
      const top = 22, bottom = H - 14;
      list.forEach((b, i) => {
        const y = Math.round(top + ((bottom - top) * (i + 0.5)) / list.length);
        const ax = OX + b.at[0], ay = OY + b.at[1];
        const edge = side === 'L' ? 170 : W - 170;
        lines.push(`<polyline class="cv-lead" points="${ax},${ay} ${edge + (side === 'L' ? 6 : -6)},${y} ${edge},${y}"/>`);
        label(b, edge, y, side === 'L');
      });
    }
    for (const b of btns.filter((x) => x.side[0] === 'T')) {
      const ax = OX + b.at[0], ay = OY + b.at[1], y = 20, left = b.side === 'TL';
      lines.push(`<polyline class="cv-lead" points="${ax},${ay} ${ax},${y + 7}"/>`);
      label(b, left ? ax + 8 : ax - 8, y, left);
    }

    // thân tay cầm
    const [fx, fy] = FACE;
    const stick = ([x, y]) => `<circle class="cv-well" cx="${x}" cy="${y}" r="14"/><circle class="cv-stick" cx="${x}" cy="${y}" r="10"/><circle class="cv-stick-top" cx="${x}" cy="${y}" r="6"/>`;
    const dpad = ([x, y]) => `<path class="cv-dpad" d="M${x - 4} ${y - 12} h8 v8 h8 v8 h-8 v8 h-8 v-8 h-8 v-8 h8 Z"/>`;
    const face = ['Y', 'B', 'X', 'A'].map((id) => {
      const [x, y] = { Y: [fx, fy - FACE_GAP], B: [fx + FACE_GAP, fy], X: [fx - FACE_GAP, fy], A: [fx, fy + FACE_GAP] }[id];
      return `<circle class="cv-face" cx="${x}" cy="${y}" r="7" style="stroke:${colors[id]}"/><text class="cv-face-t${style === 'ps' ? ' sym' : ''}" x="${x}" y="${y + (style === 'ps' ? 4 : 3)}" text-anchor="middle" style="fill:${colors[id]}">${esc(P.label('Pad.' + id, style))}</text>`;
    }).join('');
    const small = ([x, y]) => `<rect class="cv-small" x="${x - 6}" y="${y - 3}" width="12" height="6" rx="3"/>`;
    // vỏ (dưới đường chú thích) · nút bấm (trên đường chú thích, để đường như mọc ra từ dưới nút)
    const shell = `
      <rect class="cv-trig" x="30" y="0" width="40" height="16" rx="5"/><rect class="cv-trig" x="158" y="0" width="40" height="16" rx="5"/>
      <path class="cv-bump" d="M24 26 C28 16 40 13 76 14 L78 24 Z"/><path class="cv-bump" d="M204 26 C200 16 188 13 152 14 L150 24 Z"/>
      <path class="cv-body" d="${BODY}"/>
      ${style === 'ps' ? '<rect class="cv-pad" x="92" y="28" width="44" height="30" rx="3"/>' : ''}
      <circle class="cv-home" cx="${A.HOME[0]}" cy="${A.HOME[1]}" r="6"/>`;
    const controls = `${small(A.VIEW)}${small(A.MENU)}${stick(A.LS)}${stick(A.RS)}${dpad(A.DPAD)}${face}`;

    return `<svg class="cv" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(${OX} ${OY})">${shell}</g>
      ${lines.join('')}
      <g transform="translate(${OX} ${OY})">${controls}</g>
      ${labels.join('')}
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
  const KB_LABEL = {};
  for (const row of KB_ROWS) for (const [code, label] of row) KB_LABEL[code] = label;
  for (const [code, label] of ARROWS) KB_LABEL[code] = label;
  const kbName = (code) => KB_LABEL[code] || code.replace(/^(Key|Digit|Numpad)/, '');
  const kbCodes = (a) => (CFG().bindings[a] || []).filter((c) => !c.startsWith('Pad.'));
  const kbKeys = (a, n = 2) => kbCodes(a).slice(0, n).map((c) => `<kbd>${esc(kbName(c))}</kbd>`).join('');

  // màu phím: play = dùng trong trận (tấn công hoặc phòng ngự) · sys = menu / hệ thống
  function keyKind(code) {
    const B = CFG().bindings, L = CFG().legend;
    const acts = Object.keys(B).filter((a) => B[a].includes(code));
    if (!acts.length) return { kind: '', acts };
    const play = acts.filter((a) => DIRS.includes(a) || (L[a] && (L[a].atk || L[a].def) && !['pause', 'mute'].includes(a)));
    if (play.length) return { kind: 'play', acts };
    return { kind: 'sys', acts };
  }

  function kbSvg() {
    const kbW = 15 * PITCH + 0.5 * PITCH + 3 * PITCH;
    const ox = Math.round((W - kbW) / 2), keys = [];
    const key = (code, label, x, y, w) => {
      const { kind, acts } = keyKind(code);
      const kw = w * PITCH - (PITCH - U);
      keys.push(`<g class="kk ${kind}"><title>${esc(acts.length ? acts.join(', ') : label)}</title>
        <rect x="${x}" y="${y}" width="${kw}" height="${U}" rx="2"/>
        <text x="${x + kw / 2}" y="${y + U / 2 + 4}" text-anchor="middle">${esc(label)}</text></g>`);
    };
    KB_ROWS.forEach((row, r) => {
      let x = ox;
      for (const [code, label, w = 1] of row) { key(code, label, x, r * PITCH + 2, w); x += w * PITCH; }
    });
    const ax = ox + 15.5 * PITCH;
    for (const [code, label, c, r] of ARROWS) key(code, label, ax + c * PITCH, r * PITCH + 2, 1);
    return `<svg class="kv" viewBox="${ox - 2} 0 ${kbW + 4} ${KH + 2}" xmlns="http://www.w3.org/2000/svg">${keys.join('')}</svg>`;
  }

  // chú thích bàn phím: cùng nội dung legend với tay cầm, mỗi action một ô (phím · tấn công · phòng ngự)
  function kbLegend() {
    const L = CFG().legend;
    return Object.keys(L).map((a) => {
      const keys = a === 'move' ? `<kbd>${DIRS.map((d) => esc(kbName(kbCodes(d)[0] || ''))).join('')}</kbd>` : kbKeys(a);
      if (a !== 'move' && !kbCodes(a).length) return '';
      const { atk, def } = legendLines([a]);
      const ATK = esc(SFC.t('ATK')), DEF = esc(SFC.t('DEF'));
      return `<div class="kl"><span class="kl-k">${keys}</span><span class="kl-t">${atk ? (def ? `<b class="both"><em>${ATK}</em> ${esc(atk)}</b>` : `<b>${esc(atk)}</b>`) : ''}${def ? `<i><em>${DEF}</em> ${esc(def)}</i>` : ''}</span></div>`;
    }).join('');
  }

  /* ================= TRANG ================= */
  SFC.ControlsView = {
    view: 'kb',

    // mở trang: hiện đúng thiết bị đang dùng
    open() { this.view = SFC.Input.device === 'pad' ? SFC.Pad.style : 'kb'; },

    render() {
      const _t = SFC.t;
      const tabs = VIEWS.map(([id, name]) => `<button class="tab ${id === this.view ? 'sel' : ''}" data-ctab="${id}">${id === 'kb' ? esc(_t('KEYBOARD')) : name}</button>`).join('');
      let body;
      if (this.view === 'kb') {
        body = `${kbSvg()}
          <div class="kv-key"><span class="play">${esc(_t('In match'))}</span><span class="sys">${esc(_t('Menus & system'))}</span></div>
          <div class="kv-legend">${kbLegend()}
            <div class="kl"><span class="kl-k">${kbKeys('pass', 1)}${kbKeys('through', 1)}${kbKeys('lob', 1)}</span><span class="kl-t"><b>${esc(_t('Teammate on the ball:'))}</b><b>${esc(_t('call for a pass'))}</b></span></div></div>
          <div class="cv-note">${_t('Menus: {confirm} confirm · {back} back · {pick} pick Core · {reroll} reroll 3 Cores', {
            confirm: kbKeys('confirm'), back: kbKeys('pause', 1) + kbKeys('back', 1), pick: kbKeys('pick1', 1) + kbKeys('pick2', 1) + kbKeys('pick3', 1), reroll: kbKeys('reroll') })}</div>`;
      } else {
        const lb = (a) => {
          const c = (CFG().bindings[a] || []).find((x) => x.startsWith('Pad.'));
          return `<kbd>${c ? esc(SFC.Pad.label(c, this.view)) : '?'}</kbd>`;
        };
        body = `${padSvg(this.view)}
          <div class="cv-note">${_t('Menus: D-pad / stick to move · {confirm} confirm · {back} back · Teammate on the ball: {call} call for a pass', {
            confirm: lb('confirm'), back: lb('back'), call: `${lb('pass')} ${lb('through')} ${lb('lob')}` })}</div>`;
      }
      return `
        <div class="tut-head"><div class="m-title">${esc(_t('CONTROLS'))}</div><div class="tabs">${tabs}</div></div>
        <div class="tut-body ctl-body">${body}</div>
        <div class="m-hint">${_t('←→ switch view · {back} back', { back: SFC.Input.key('back', 'Esc') })}</div>`;
    },

    input(menu, input) {
      const i = VIEWS.findIndex(([id]) => id === this.view);
      let d = 0;
      if (input.wasPressed('left')) d = -1;
      if (input.wasPressed('right')) d = 1;
      if (!d) return;
      this.view = VIEWS[wrap(i + d, VIEWS.length)][0];
      SFC.Audio.menu();
      menu.render();
    },

    click(menu, e) {
      const t = e.target.closest('[data-ctab]');
      if (!t) return false;
      this.view = t.dataset.ctab;
      SFC.Audio.menu();
      menu.render();
      return true;
    },
  };
})();
