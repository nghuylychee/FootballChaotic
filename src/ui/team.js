/* Team — trang đồng đội trong NHÂN VẬT (dùng chung khung #menu như ui/gacha.js; Menu gọi vào khi page thuộc Team.pages):
 *   team  : 2 tab — ROSTER (đội hình: chọn đồng đội ra sân, xem chỉ số + deck Core, bán) · SCOUT (trạm scout: bản đồ thế giới pixel,
 *           máy bay bay vòng quanh trong lúc scout theo giờ thật; nâng cấp trạm bằng gold)
 *   report: báo cáo scout — 3 ứng viên (chỉ số + deck), chọn 1 người để tuyển (trả phí chuyển nhượng) hoặc bỏ qua cả 3
 * Số liệu: config/teammates.config.js · logic: src/meta/teammates.js
 * Menu gọi: render(menu) · input(menu, input) · click(menu, e) · tick(menu, dt) · back(menu) · lookOf(key)
 */
window.SFC = window.SFC || {};

(function () {
  const _t = SFC.t, _tn = SFC.tn;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const M = () => SFC.Mates;
  const CFG = () => SFC_CONFIG.teammates;
  const A = () => SFC_CONFIG.progression.attrs;
  const CORES = () => SFC_CONFIG.cores;
  const RAR = (r) => SFC_CONFIG.progression.rarities[r] || { label: '', color: '#b0c3d9' };
  const PX = () => SFC.PixelIcon;
  const G = () => SFC.Gacha;
  const K = (a, kb) => SFC.Input.key(a, kb);
  const wrap = (v, n) => ((v % n) + n) % n;
  const TABS = [['roster'], ['scout']];
  const TAB_LABEL = () => ({ roster: _t('ROSTER'), scout: _t('SCOUT') });   // dịch lúc vẽ

  // thời gian còn lại: 1:05:09 / 12:31
  function fmtLeft(ms) {
    const s = Math.ceil(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    const p2 = (n) => String(n).padStart(2, '0');
    return h ? `${h}:${p2(m)}:${p2(ss)}` : `${m}:${p2(ss)}`;
  }

  /* ---------- bản đồ thế giới pixel (40 x 18 ô, mỗi ô 8px) ---------- */
  const WORLD = [
    '........................................',
    '...####.......#####......#######........',
    '..#######...########...###########......',
    '.#########..#######...#############.....',
    '..########...#####....############......',
    '...######.....###......##########....#..',
    '....####......#####.....#######.....###.',
    '.....###.....#######.....####......####.',
    '......##....#########.....##........##..',
    '.......###..#########..........##.......',
    '........###..#######..........####......',
    '........####..#####...........#####.....',
    '.........###...###.............###......',
    '..........##....#...............#.......',
    '..........#.......................####..',
    '.................................######.',
    '..................................####..',
    '........................................',
  ];
  // điểm scout trên bản đồ (khớp config regions theo thứ tự) + trụ sở (HQ)
  const SPOTS = [[6, 11], [11, 4], [16, 7], [15, 11], [27, 3], [35, 15], [23, 6], [33, 6]];
  const HQ = [18, 8];
  const PLANE = ['....w....', '...www...', 'wwwwwwwww', '.wwwwwww.', '...www...', '..w.w.w..'];   // máy bay nhìn từ trên (hướng lên)

  const Team = {
    pages: ['team', 'report'],
    tab: 0,
    sel: 0,          // ROSTER: đồng đội đang xem
    offerSel: 0,     // báo cáo scout: ứng viên đang chọn
    confirm: null,
    mapT: 0,
    back0: 'char',

    open(menu, tab = 0) { this.tab = tab; this.sel = Math.max(0, M().roster().findIndex((m) => m.id === M().T.active)); menu.go('team'); },

    /* ================= VẼ ================= */
    render(menu) {
      const body = menu.page === 'report' ? this.pageReport() : this.tab === 0 ? this.pageRoster() : this.pageScout();
      const msg = menu.msg ? `<div class="m-msg ${menu.msgErr ? 'err' : ''}">${esc(menu.msg)}</div>` : '';
      menu.el.innerHTML = body.replace('<!--msg-->', msg);
      SFC.CorePreview.scan(menu.el);
      this.map = menu.el.querySelector('canvas.world');
      if (this.map) this.drawMap();
    },

    header(title, mid = '') {
      const d = SFC.Profile.data;
      return `<div class="tut-head shop-head"><div class="m-title">${title}</div>${mid}
        <div class="shop-wallet">${G().xpBar(d)}${G().coin(d.gold)}</div></div>`;
    },
    tabs() {
      const ready = M().scoutReady();
      return `<div class="tabs">${TABS.map(([k], i) => `<button class="tab ${i === this.tab ? 'sel' : ''}" data-ttab="${i}">${TAB_LABEL()[k]}${k === 'scout' && ready ? ' <b class="tm-dot">!</b>' : ''}</button>`).join('')}</div>`;
    },

    // hàng chỉ số: 6 thanh (tô màu chỉ số), số rating
    statBars(m) {
      return `<div class="tm-stats">${A().order.map((id) => {
        const s = A().list[id], v = m.ratings[id], w = Math.round(((v - 40) / 59) * 100);
        return `<div class="tm-st" style="--c:${s.color}"><span>${s.short}</span><i><b style="width:${Math.max(4, w)}%"></b></i><em class="${v >= m.ovr + 3 ? 'hi' : v <= m.ovr - 3 ? 'lo' : ''}">${v}</em></div>`;
      }).join('')}</div>`;
    },
    // deck Core: ô icon viền độ hiếm (rê chuột xem mô tả)
    deckGrid(m) {
      return `<div class="tm-deck">${m.deck.map((id) => {
        const c = CORES().list[id];
        return `<div class="tm-core ${c.role === 'ult' ? 'ult' : ''}" style="--rc:${RAR(c.rarity).color}" title="${esc(c.name)} — ${esc(SFC.CoreScale.plain(id, m.ratings[(SFC.CoreScale.statsOf(id)[0])] || m.ovr))}">${PX().core(id)}</div>`;
      }).join('')}</div>`;
    },
    archTags(m) {
      return M().deckArchs(m).slice(0, 2).map((a) => `<span style="--c:${CORES().archetypes[a.tag].color}">${PX().arch(a.tag, 'sm')} ${CORES().archetypes[a.tag].label}</span>`).join('');
    },
    ovrBadge(m, big = false) {
      const g = M().grade(m), r = RAR(g.rarity);
      return `<div class="tm-ovr ${big ? 'big' : ''}" style="--rc:${r.color}"><b>${m.ovr}</b><span>${_t('OVR')}</span><em>${g.label}</em></div>`;
    },

    /* ---------- ROSTER ---------- */
    pageRoster() {
      const T = M().T, list = M().roster(), max = CFG().rosterMax;
      this.sel = Math.max(0, Math.min(this.sel, list.length - 1));
      const rows = [];
      for (let i = 0; i < max; i++) {
        const m = list[i];
        if (!m) { rows.push(`<div class="tm-row empty"><span>${_t('EMPTY SLOT')}</span><em>${_t('Scout to recruit')}</em></div>`); continue; }
        const g = M().grade(m);
        rows.push(`<button class="tm-row ${i === this.sel ? 'sel' : ''} ${m.id === T.active ? 'act' : ''}" data-tm="${i}" style="--rc:${RAR(g.rarity).color}">
          <canvas class="avatar" data-mate="r${m.id}"></canvas>
          <div class="tm-info"><b>${esc(m.name)}</b><span class="tm-tags">${this.archTags(m)}</span></div>
          ${this.ovrBadge(m)}${m.id === T.active ? `<i class="tm-act">${_t('IN TEAM')}</i>` : ''}
        </button>`);
      }
      const m = list[this.sel];
      const detail = m ? `<div class="tm-detail">
          <div class="tm-top"><canvas class="avatar big" data-mate="r${m.id}"></canvas>
            <div><div class="sd-name">${esc(m.name)}</div><div class="tm-tags">${this.archTags(m)}</div>${this.ovrBadge(m, true)}</div></div>
          ${this.statBars(m)}
          <div class="tm-h">${_t('CORE DECK')} <em>${_tn('{n} card · drafts 1 per round in matches', '{n} cards · drafts 1 per round in matches', m.deck.length)}</em></div>
          ${this.deckGrid(m)}
          <div class="sd-act">${m.id === T.active ? `<span class="on">${_t('PLAYS WITH YOU')}</span>` : `<kbd>${K('confirm', 'Enter')}</kbd> ${_t('SET AS TEAMMATE')}`}
            ${list.length > 1 ? ` · <kbd>${K('dismantle', 'X')}</kbd> ${_t('SELL {gold}', { gold: G().coin('+' + M().sellValue(m)) })}` : ''}</div>
        </div>` : '';
      return `${this.header(_t('TEAM'), this.tabs())}
        <div class="gacha-body tm-g"><div class="tm-list">${rows.join('')}</div>${detail}</div>
        <!--msg--><div class="m-hint">${_t('{a} / {b} switch tab · ↑↓ select · {ok} set as teammate · {sell} sell · {back} back', { a: K('switch', 'Q'), b: K('sprint', 'E'), ok: K('confirm', 'Enter'), sell: K('dismantle', 'X'), back: K('back', 'Esc') })}</div>`;
    },

    /* ---------- SCOUT ---------- */
    pageScout() {
      const st = M().station(), nx = M().nextStation(), T = M().T, sc = M().scouting(), ready = M().scoutReady();
      const region = esc(M().regionName(sc));
      let status;
      if (!sc) status = `<div class="sc-status">${_t('<b>Scout is free.</b> Send a scout out to find new players.')}<div class="sd-act"><kbd>${K('confirm', 'Enter')}</kbd> ${_t('START SCOUTING · {n} min', { n: st.minutes })}</div></div>`;
      else if (!ready) status = `<div class="sc-status"><b>${_t('Scouting {region}...', { region })}</b><div class="sc-bar"><i data-scbar></i></div><div class="sc-left" data-scleft>${fmtLeft(M().scoutLeft())}</div></div>`;
      else status = `<div class="sc-status ready">${_tn('<b>SCOUT REPORT READY!</b> {n} player found in {region}.', '<b>SCOUT REPORT READY!</b> {n} players found in {region}.', CFG().offers, { region })}<div class="sd-act"><kbd>${K('confirm', 'Enter')}</kbd> ${_t('VIEW REPORT')}</div></div>`;
      const lv = T.station, O = CFG().ovr, MP = SFC.MainPath, area = Math.floor(MP.state.best / MP.nDiv());
      const center = Math.round(O.base + O.perArea * area + st.ovrBonus);
      const up = nx ? `<div class="sd-act"><kbd>${K('restart', 'R')}</kbd> ${_t('UPGRADE {gold} → {n} min · OVR +{ovr}', { gold: G().coin(nx.cost), n: nx.minutes, ovr: nx.ovrBonus })}</div>` : `<div class="sd-act on">${_t('MAX LEVEL')}</div>`;
      return `${this.header(_t('TEAM'), this.tabs())}
        <div class="gacha-body sc-g">
          <div class="sc-map"><canvas class="world" width="320" height="144"></canvas>${status}</div>
          <div class="sc-side">
            <div class="tm-h">${_t('SCOUT STATION')} <em>${_t('LV {n}/{max}', { n: lv, max: CFG().station.length })}</em></div>
            <div class="sc-line">${_t('Scout time <b>{n} min</b>', { n: st.minutes })}</div>
            <div class="sc-line">${_t('Expected OVR <b>{min}-{max}</b>', { min: center - O.spread, max: center + O.spread })}</div>
            <div class="sc-line">${_t('Deck quality <b>tier {n}</b>', { n: Math.min(4, Math.floor(area / 2) + st.deckBonus) + 1 })}</div>
            <div class="sc-note">${_t('Go further on the Main Path to meet stronger players.')}</div>
            ${up}
          </div>
        </div>
        <!--msg--><div class="m-hint">${[
          _t('{a} / {b} switch tab', { a: K('switch', 'Q'), b: K('sprint', 'E') }),
          ready ? _t('{key} view report', { key: K('confirm', 'Enter') }) : sc ? '' : _t('{key} start scouting', { key: K('confirm', 'Enter') }),
          _t('{key} upgrade station', { key: K('restart', 'R') }),
          _t('{key} back', { key: K('back', 'Esc') }),
        ].filter(Boolean).join(' · ')}</div>`;
    },

    /* ---------- báo cáo scout: 3 ứng viên ---------- */
    pageReport() {
      const sc = M().scouting();
      if (!sc) return `${this.header(_t('SCOUT REPORT'))}<div class="gacha-body"></div>`;
      const cards = sc.offers.map((m, i) => {
        const g = M().grade(m), r = RAR(g.rarity), c = M().canRecruit(i);
        return `<div class="sr-card ${i === this.offerSel ? 'sel' : ''}" data-of="${i}" style="--rc:${r.color}">
          <div class="sr-top"><canvas class="avatar" data-mate="o${i}"></canvas>${this.ovrBadge(m, true)}</div>
          <div class="sr-name">${esc(m.name)}</div>
          <div class="tm-tags">${this.archTags(m)}</div>
          ${this.statBars(m)}
          <div class="tm-h">${_t('DECK')} <em>${m.deck.length}</em></div>
          ${this.deckGrid(m)}
          <div class="sr-fee ${c.ok ? '' : 'bad'}">${G().coin(m.fee)}</div>
        </div>`;
      }).join('');
      return `${this.header(_t('SCOUT REPORT'), `<div class="sr-region">${esc(M().regionName(sc))}</div>`)}
        <div class="sr-cards">${cards}</div>
        <!--msg--><div class="m-hint">${_t('←→ select · {ok} recruit (pay fee) · {pass} pass on all · {back} decide later', { ok: K('confirm', 'Enter'), pass: K('dismantle', 'X'), back: K('back', 'Esc') })}</div>`;
    },

    // ngoại hình để vẽ avatar: 'r<id>' đồng đội trong đội hình · 'o<i>' ứng viên thứ i
    lookOf(key) {
      const m = key[0] === 'r' ? M().roster().find((x) => x.id === +key.slice(1)) : (M().scouting() || { offers: [] }).offers[+key.slice(1)];
      return m ? SFC.Profile.lookOf(Object.assign({}, SFC_CONFIG.progression.defaultLook, m.look)) : null;
    },

    /* ---------- bản đồ + máy bay ---------- */
    drawMap() {
      const cv = this.map, x = cv.getContext('2d'), W = cv.width, H = cv.height, t = this.mapT;
      x.imageSmoothingEnabled = false;
      x.fillStyle = '#0d1830'; x.fillRect(0, 0, W, H);
      // sóng biển: chấm lấp lánh
      x.fillStyle = '#16284d';
      for (let yy = 4; yy < H; yy += 8) for (let xx = ((yy / 8) % 2) * 4 + Math.floor(t * 6) % 8; xx < W; xx += 16) x.fillRect(xx, yy, 2, 1);
      // lục địa: ô 8px, viền sáng trên + bóng dưới
      const S = 8;
      WORLD.forEach((row, j) => [...row].forEach((ch, i) => {
        if (ch !== '#') return;
        x.fillStyle = '#2f6b3a'; x.fillRect(i * S, j * S, S, S);
        if (!WORLD[j - 1] || WORLD[j - 1][i] !== '#') { x.fillStyle = '#5fae5a'; x.fillRect(i * S, j * S, S, 2); }
        if (!WORLD[j + 1] || WORLD[j + 1][i] !== '#') { x.fillStyle = '#1d4526'; x.fillRect(i * S, j * S + S - 2, S, 2); }
      }));
      const sc = M().scouting(), ready = M().scoutReady();
      const spot = (k) => ({ x: SPOTS[k][0] * S + 4, y: SPOTS[k][1] * S + 4 });
      const hq = { x: HQ[0] * S + 4, y: HQ[1] * S + 4 };
      // điểm scout: chấm nhấp nháy; nơi đang scout sáng vàng
      const regIdx = sc ? (sc.ri || 0) % SPOTS.length : -1;
      SPOTS.forEach((_, k) => {
        const p = spot(k), on = k === regIdx, blink = Math.floor(t * 3 + k) % 2;
        x.fillStyle = on ? (blink ? '#ffe14f' : '#ff9a3d') : blink ? '#9aa3b5' : '#5a6478';
        x.fillRect(p.x - 1, p.y - 1, 3, 3);
        if (on) { const r = 4 + ((t * 10) % 8); x.strokeStyle = 'rgba(255,225,79,' + (1 - r / 12) + ')'; x.strokeRect(p.x - r, p.y - r, r * 2, r * 2); }
      });
      // trụ sở
      x.fillStyle = '#ff3d5a'; x.fillRect(hq.x - 2, hq.y - 2, 5, 5); x.fillStyle = '#ffffff'; x.fillRect(hq.x, hq.y, 1, 1);
      // máy bay: chưa scout = đậu ở HQ · đang scout = bay vòng quanh thế giới rồi lượn quanh điểm scout · xong = đậu ở điểm scout
      let px, py, ang;
      if (!sc) { px = hq.x; py = hq.y - 6 + Math.sin(t * 2) * 1.5; ang = -Math.PI / 2; }
      else if (ready) { const p = spot(regIdx); px = p.x; py = p.y - 8 + Math.sin(t * 3) * 1.5; ang = -Math.PI / 2; }
      else {
        const k = (t * 0.12) % 1, a = k * Math.PI * 2;
        const cx = W / 2, cy = H / 2, rx = W * 0.4, ry = H * 0.34;
        px = cx + Math.cos(a) * rx; py = cy + Math.sin(a) * ry;
        ang = Math.atan2(Math.cos(a) * ry, -Math.sin(a) * rx);
        // vệt đứt quãng phía sau
        x.fillStyle = 'rgba(255,255,255,0.55)';
        for (let i = 1; i < 14; i++) {
          const b = a - i * 0.07;
          if (i % 2) x.fillRect(Math.round(cx + Math.cos(b) * rx), Math.round(cy + Math.sin(b) * ry), 1, 1);
        }
      }
      // vẽ máy bay xoay theo hướng bay (làm tròn 8 hướng để giữ nét pixel)
      const dir = Math.round(ang / (Math.PI / 4)) * (Math.PI / 4);
      x.save(); x.translate(Math.round(px), Math.round(py)); x.rotate(dir + Math.PI / 2);
      // máy bay phóng 2x (mỗi pixel 2x2) + viền mực cho nổi trên nền biển
      PLANE.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === 'w') { x.fillStyle = '#140c16'; x.fillRect((i - 4) * 2 - 1, (j - 3) * 2 - 1, 4, 4); } }));
      PLANE.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === 'w') { x.fillStyle = j === 2 ? '#ffe14f' : '#ffffff'; x.fillRect((i - 4) * 2, (j - 3) * 2, 2, 2); } }));
      x.restore();
      // mây trôi
      x.fillStyle = 'rgba(230,236,245,0.35)';
      for (let i = 0; i < 4; i++) {
        const cx = ((i * 97 + t * (8 + i * 3)) % (W + 40)) - 20, cy = 18 + i * 31;
        x.fillRect(Math.round(cx), cy, 12, 3); x.fillRect(Math.round(cx) + 3, cy - 2, 6, 2);
      }
    },

    // mỗi khung hình (Menu.animate): máy bay + đồng hồ scout; hết giờ thì vẽ lại trang để hiện nút báo cáo
    tick(menu, dt) {
      if (!this.pages.includes(menu.page)) return;
      this.mapT += dt;
      if (this.map && this.map.isConnected) this.drawMap();
      const left = menu.el.querySelector('[data-scleft]');
      if (left) {
        const sc = M().scouting(), ms = M().scoutLeft();
        left.textContent = fmtLeft(ms);
        const bar = menu.el.querySelector('[data-scbar]');
        if (bar && sc) bar.style.width = Math.round((1 - ms / Math.max(1, sc.end - sc.start)) * 100) + '%';
        if (ms <= 0) { SFC.Audio.reveal(2); menu.render(); }
      }
    },

    /* ================= PHÍM ================= */
    input(menu, input) {
      if (menu.page === 'report') return this.inputReport(menu, input);
      if (input.wasPressed('switch') || input.wasPressed('sprint')) { this.tab = 1 - this.tab; menu.msg = ''; SFC.Audio.menu(); return menu.render(); }
      if (this.tab === 0) return this.inputRoster(menu, input);
      return this.inputScout(menu, input);
    },
    inputRoster(menu, input) {
      const list = M().roster(), n = list.length;
      if (input.wasPressed('up')) { this.sel = wrap(this.sel - 1, n); this.confirm = null; menu.msg = ''; SFC.Audio.menu(); return menu.render(); }
      if (input.wasPressed('down')) { this.sel = wrap(this.sel + 1, n); this.confirm = null; menu.msg = ''; SFC.Audio.menu(); return menu.render(); }
      const m = list[this.sel];
      if (!m) return;
      if (input.wasPressed('confirm')) this.setActive(menu, m);
      if (input.wasPressed('dismantle')) this.sell(menu, m);
    },
    setActive(menu, m) {
      if (m.id === M().T.active) return;
      M().setActive(m.id);
      SFC.Audio.pick();
      menu.setMsg(_t('{name} will play with you.', { name: m.name }));
    },
    sell(menu, m) {
      if (M().roster().length <= 1) return menu.setMsg(_t('You need at least one teammate.'), true);
      const now = performance.now(), key = 'sell' + m.id;
      if (!this.confirm || this.confirm.key !== key || now - this.confirm.t > 3000) {
        this.confirm = { key, t: now };
        SFC.Audio.menu();
        return menu.setMsg(_t('Press {key} again to sell {name} (+{gold} gold)', { key: K('dismantle', 'X'), name: m.name, gold: M().sellValue(m) }), true);
      }
      this.confirm = null;
      const g = M().sell(m.id);
      SFC.Audio.dismantle();
      this.sel = Math.max(0, this.sel - 1);
      menu.setMsg(_t('Sold {name}: +{gold} gold', { name: m.name, gold: g }));
    },
    inputScout(menu, input) {
      if (input.wasPressed('confirm')) this.scoutAction(menu);
      if (input.wasPressed('restart')) this.upgrade(menu);
    },
    scoutAction(menu) {
      if (M().scoutReady()) { this.offerSel = 0; SFC.Audio.whoosh(); return menu.go('report'); }
      if (M().scouting()) return menu.setMsg(_t('The scout is still out. Come back later!'));
      M().startScout();
      SFC.Audio.whoosh();
      menu.setMsg(_t('Scout sent to {region}!', { region: M().regionName() }));
    },
    upgrade(menu) {
      const nx = M().nextStation();
      if (!nx) return menu.setMsg(_t('Scout station is at max level.'));
      if (!M().upgradeStation()) return menu.setMsg(_t('Not enough gold ({price})', { price: nx.cost }), true);
      SFC.Audio.upgrade();
      menu.setMsg(_t('Scout station upgraded to LV {n}!', { n: M().T.station }));
    },
    inputReport(menu, input) {
      const sc = M().scouting();
      if (!sc) return menu.go('team');
      const n = sc.offers.length;
      let moved = false;
      if (input.wasPressed('left')) { this.offerSel = wrap(this.offerSel - 1, n); moved = true; }
      if (input.wasPressed('right')) { this.offerSel = wrap(this.offerSel + 1, n); moved = true; }
      if (moved) { this.confirm = null; menu.msg = ''; SFC.Audio.menu(); return this.setOfferSel(menu); }
      if (input.wasPressed('confirm')) this.recruit(menu, this.offerSel);
      if (input.wasPressed('dismantle')) this.decline(menu);
    },
    // đổi ứng viên đang chọn mà không vẽ lại (giữ avatar đang chạy)
    setOfferSel(menu) { menu.el.querySelectorAll('.sr-card').forEach((c) => c.classList.toggle('sel', +c.dataset.of === this.offerSel)); },
    recruit(menu, i) {
      const r = M().recruit(i);
      if (!r.ok) {
        const why = { full: _t('Roster is full ({n}). Sell a teammate first.', { n: CFG().rosterMax }), gold: _t('Not enough gold for the transfer fee.') }[r.reason] || _t('Cannot recruit.');
        SFC.Audio.menu();
        return menu.setMsg(why, true);
      }
      SFC.Audio.reveal(3);
      this.tab = 0;
      this.sel = M().roster().length - 1;
      menu.go('team', _t('{name} joined your team!', { name: r.mate.name }));
    },
    decline(menu) {
      const now = performance.now();
      if (!this.confirm || this.confirm.key !== 'decline' || now - this.confirm.t > 3000) {
        this.confirm = { key: 'decline', t: now };
        SFC.Audio.menu();
        return menu.setMsg(_tn('Press {key} again to pass on the {n} player.', 'Press {key} again to pass on all {n} players.', M().scouting().offers.length, { key: K('dismantle', 'X') }), true);
      }
      this.confirm = null;
      M().decline();
      SFC.Audio.dismantle();
      this.tab = 1;
      menu.go('team', _t('Report discarded. Send a new scout any time.'));
    },

    back(menu) {
      if (menu.page === 'report') { this.tab = 1; return menu.go('team'); }
      return menu.go(this.back0);
    },

    /* ================= CHUỘT ================= */
    click(menu, e) {
      const tab = e.target.closest('[data-ttab]');
      if (tab) { this.tab = +tab.dataset.ttab; menu.msg = ''; SFC.Audio.menu(); menu.render(); return true; }
      const row = e.target.closest('[data-tm]');
      if (row) {
        const i = +row.dataset.tm;
        if (i === this.sel) this.setActive(menu, M().roster()[i]);
        else { this.sel = i; menu.msg = ''; SFC.Audio.menu(); menu.render(); }
        return true;
      }
      const of = e.target.closest('[data-of]');
      if (of) {
        const i = +of.dataset.of;
        if (i === this.offerSel) this.recruit(menu, i);
        else { this.offerSel = i; SFC.Audio.menu(); this.setOfferSel(menu); }
        return true;
      }
      if (e.target.closest('.sc-status')) { this.scoutAction(menu); return true; }
      return false;
    },
  };

  SFC.Team = Team;
})();
