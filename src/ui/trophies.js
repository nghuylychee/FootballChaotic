/* TrophyUI — PHÒNG TRƯNG BÀY (TROPHY ROOM), làm lại 2026-10-31 (user duyệt mockup tools/mockups/trophy-room.html): phòng câu lạc bộ
 * đường phố của bạn, vẽ pixel art thật trên canvas 320x180 (1 pixel = 2x2 trên khung 640x360, như KIT VAN: khối màu cứng, viền mực,
 * không gradient / glow); chữ + số là DOM bằng font pixel của game. Nút cúp dưới SETTINGS ở trang chủ.
 *   view 'room'  : 3 góc — kệ cúp · bàn có album sticker · bảng ghim ảnh. ←→ đi giữa các góc (character đi theo), Enter mở góc
 *   view 'shelf' : cúp GOAT (phá đảo cả run) tầng trên + 3 cúp act (hạ boss act) tầng dưới; huy chương đồng / bạc / vàng theo số lần
 *                  (MEDALS); kệ nhỏ cúp FOOTBALL STORY cũ đã vô địch. ←→ / ↑↓ chọn cúp
 *   view 'album' : album sticker: LEGENDS · BADGES · GEAR · RIVALS (đội Elite / Boss đã hạ) · ULTIMATES (mở ULT BOOK) · ACHIEVEMENTS
 *                  (mở danh sách thành tích). ←→ / Q E đổi trang, Enter ở 2 trang cuối = mở trang đó
 *   view 'board' : polaroid 12 run gần nhất (đội hình + LEGEND, CHAMPIONS / KO, đường đi theo tầng) + bảng phấn kỷ lục (icon + số, tên ở tooltip)
 * Esc: view con -> phòng · phòng -> trang chủ. Số liệu: Profile.data.runs (SFC.Run: acts, seen, hist, best, wins, bosses, plays),
 * Profile.data.story (cúp Story cũ), ULT BOOK, SFC.Achievements. Menu gọi: open · render · input · click · back · tick
 */
window.SFC = window.SFC || {};

(function () {
  const _t = SFC.t;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const PF = () => SFC.Profile;
  const RUN = () => SFC.Run;
  const RC = () => SFC_CONFIG.run;
  const PX = () => SFC.PixelIcon;
  const LW = 320, LH = 180, O = '#120c16';
  const MEDALS = [['#d08a4a', 1], ['#d4dbe8', 5], ['#ffd23f', 10]];   // đồng · bạc · vàng ở 1 · 5 · 10 lần
  const ZONES = [{ x: 60, v: 'shelf' }, { x: 163, v: 'album' }, { x: 262, v: 'board' }];   // x character (canvas thấp) ở từng góc
  const PAGES = ['legend', 'badge', 'gear', 'rival', 'ult', 'ach'];

  /* ---------- sprite cúp pixel (lưới chữ, viền mực tự thêm), mỗi act 1 kiểu + cúp GOAT có sừng dê ---------- */
  const PAL = { y: '#ffd23f', Y: '#c9a020', w: '#fff6d0', o: '#ff7a1f', O: '#c85410', p: '#c77bff', P: '#8a4fd0', m: '#9aa3b5', g: '#4bbf4b', G: '#2f8a3a',
    h: '#efe2c4', H: '#b8a888', b: '#5a3820', B: '#8a5a30', r: '#ff3d5a' };
  const ART = {
    // THE BLOCK: cọc giao thông mạ vàng đỉnh
    act0: ['.....yy.....', '.....yy.....', '.....oo.....', '....oooo....', '....wwww....', '...oooooo...', '...ooOooo...', '..wwwwwwww..', '..oooooooo..', '.ooooOOoooo.',
      '.OOOOOOOOOO.', '...bbbbbb...', '..BBBBBBBB..', '..bbbbbbbb..'],
    // NIGHT CITY: ngôi sao neon trên cột
    act1: ['.....pp.....', '.....pp.....', '....pwpp....', 'pppppwpppppp', '.ppppppppPp.', '..pppppppp..', '...pppPpp...', '..ppp..ppp..', '..pp....pp..', '.....mm.....',
      '.....mm.....', '...bbbbbb...', '..BBBBBBBB..', '..bbbbbbbb..'],
    // THE LEGENDS: quả bóng vàng trong vòng nguyệt quế
    act2: ['............', '.g..yyyy..g.', 'gg.yYyyYy.gg', 'g.yyyYYyyy.g', 'g.yYyyyyYy.g', 'gG.yyYYyy.Gg', '.gg.yyyy.gg.', '..gG....Gg..', '...gg..gg...', '.....yy.....',
      '.....yy.....', '...bbbbbb...', '..BBBBBBBB..', '..bbbbbbbb..'],
    // THE GOAT: cúp vàng có 2 sừng dê, ngôi sao đỏ giữa
    goat: ['...hh......hh...', '..hH........Hh..', '..h..........h..', '..hh.yyyyyy.hh..', '...h.ywyyyyy.h..', '.yyyyyyyyyyyyyy.', 'y..yyyyrryyyy..y', 'y..yyyrrrryyy..y',
      '.yy.yyyrryyyy.y.', '....yyyyyyyy....', '.....yYyyyy.....', '......yyyy......', '.......yy.......', '.......yy.......', '.....YYYYYY.....', '....bbbbbbbb....', '....BBBBBBBB....', '....bbbbbbbb....'],
  };
  // vẽ sprite kind, tâm x, đáy y, phóng s (nguyên), sil = bóng đen (chưa đạt)
  function sprite(L, kind, x, y, s, sil) {
    const g = ART[kind], h = g.length, w = g[0].length, x0 = Math.round(x - (w * s) / 2), y0 = Math.round(y - h * s);
    const on = (i, j) => i >= 0 && j >= 0 && i < h && j < w && g[i][j] !== '.';
    for (let i = -1; i <= h; i++) for (let j = -1; j <= w; j++) {
      const c = on(i, j) ? (sil ? '#2a2030' : PAL[g[i][j]]) : on(i - 1, j) || on(i + 1, j) || on(i, j - 1) || on(i, j + 1) ? O : null;
      if (c) { L.fillStyle = c; L.fillRect(x0 + j * s, y0 + i * s, s, s); }
    }
    return { x0, y0, w: w * s, h: h * s };
  }

  let cv = null, L = null, buf = null;
  const P = (x, y, w, h, c) => { L.fillStyle = c; L.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const disc = (cx, cy, r, c) => { for (let y = -r; y <= r; y++) { const h = Math.round(Math.sqrt(r * r - y * y)); P(cx - h, cy + y, h * 2 + 1, 1, c); } };
  const hsh = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  // nhân vật 40x44 1:1 (chân ở y)
  function figure(look, kit, x, y, t, facing) {
    if (!buf) { buf = document.createElement('canvas'); buf.width = 40; buf.height = 44; }
    SFC.Sprites.drawAvatar(buf, look, kit, t, facing);
    L.drawImage(buf, Math.round(x - 20), Math.round(y - 44));
  }

  /* ---------- nền chung: tường gạch + sàn bê tông (dither) ---------- */
  function wall(y1) {
    P(0, 0, LW, y1, '#2a1e22');
    for (let y = 0; y < y1; y += 6) for (let x = (y / 6) % 2 ? -6 : 0; x < LW; x += 12) { P(x, y, 11, 5, '#33252a'); P(x, y, 11, 1, '#3b2b30'); }
    P(0, y1 - 3, LW, 3, '#1a1216');
  }
  function floor(y0) {
    P(0, y0, LW, LH - y0, '#3e3834');
    for (let y = y0 + 1; y < LH; y += 2) for (let x = (y % 4 ? 0 : 1); x < LW; x += 2) if (hsh(x * 7 + y * 13) < 0.25) P(x, y, 1, 1, '#4a4440');
    P(0, y0, LW, 1, '#58504a');
  }
  // tấm ván kệ gỗ dài w, mép trên ở y
  function plank(x, y, w) { P(x - 1, y - 1, w + 2, 5, O); P(x, y, w, 3, '#8a5a30'); P(x, y, w, 1, '#a8743e'); P(x, y + 3, w, 1, '#5a3820'); }
  // biển đồng dưới cúp
  function plaque(cx, y, w, c) { P(cx - w / 2 - 1, y - 1, w + 2, 7, O); P(cx - w / 2, y, w, 5, '#c9a020'); P(cx - w / 2, y, w, 1, '#ffe14f'); if (c) P(cx - w / 2 + 2, y + 2, w - 4, 1, c); }
  // ngoặc vàng chọn quanh khung (x, y, w, h)
  function brackets(x, y, w, h, t) {
    const k = Math.floor(t * 4) % 2, c = '#ffd23f', a = 4;
    x -= 3 + k; y -= 3 + k; w += 6 + k * 2; h += 6 + k * 2;
    for (const [px, py, sx, sy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) {
      P(sx > 0 ? px : px - a, py - (sy > 0 ? 0 : 1), a, 1, c); P(px - (sx > 0 ? 0 : 1), sy > 0 ? py : py - a, 1, a, c);
    }
  }
  // lấp lánh 1 pixel trên cúp đã đạt
  function sparkle(b, t, seed) {
    const k = Math.floor(t * 3 + seed);
    if (k % 3) return;
    const x = b.x0 + Math.floor(hsh(k + seed) * b.w), y = b.y0 + Math.floor(hsh(k * 3 + seed) * b.h * 0.6);
    P(x, y - 1, 1, 3, '#ffffff'); P(x - 1, y, 3, 1, '#ffffff');
  }

  /* ---------- dữ liệu ---------- */
  const stats = () => RUN().stats();
  const actRec = (i) => (stats().acts || [])[i] || { n: 0, first: 0 };
  const badgeIds = () => Object.keys(RC().badges).filter((id) => !RC().badges[id].injury);
  const rivalIds = () => [...new Set(RC().acts.flatMap((a) => (a.elite || []).concat(a.boss || [])))].filter((id) => SFC_CONFIG.teams.list[id]);
  const pageDef = () => {
    const seen = stats().seen || {}, n = (k, ids) => ids.filter((id) => seen[k] && seen[k][id]).length;
    const LG = Object.keys(SFC_CONFIG.legends.list), G = Object.keys(RC().gear.list), U = PF().ultEntries(), A = SFC.Achievements.count();
    return {
      legend: { name: _t('LEGENDS'), icon: 'star', c: '#c7a6ff', got: n('legend', LG), n: LG.length },
      badge: { name: _t('BADGES'), icon: 'gift', c: '#ff7a3d', got: n('badge', badgeIds()), n: badgeIds().length },
      gear: { name: _t('GEAR'), icon: 'kitbag', c: '#3ff6ff', got: n('gear', G), n: G.length },
      rival: { name: _t('RIVALS'), icon: 'fist', c: '#ff5a6e', got: n('rival', rivalIds()), n: rivalIds().length },
      ult: { name: _t('ULTIMATES'), icon: 'book', c: '#ffd23f', got: U.filter((e) => PF().ultKnown(e.key)).length, n: U.length },
      ach: { name: _t('ACHIEVEMENTS'), icon: 'trophy', c: '#6bff4f', got: A.done, n: A.total },
    };
  };
  const albumPct = () => { const D = Object.values(pageDef()); return Math.round((D.reduce((a, p) => a + p.got, 0) / Math.max(1, D.reduce((a, p) => a + p.n, 0))) * 100); };
  const date = (ms) => {
    if (!ms) return '';
    try { return new Date(ms).toLocaleDateString(SFC.I18n.locale(), { year: 'numeric', month: 'short', day: 'numeric' }); } catch (e) { return new Date(ms).toDateString(); }
  };
  const clock = (s) => (s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : '–');
  const storyCups = () => (SFC.Cup ? SFC.Cup.list().filter((s) => !s.soon && SFC.Cup.rec(s.id).wins > 0) : []);

  const TrophyUI = {
    pages: ['trophy'],
    view: 'room', zone: 0, cup: 0, page: 'legend', pol: 0,
    hx: null, t: 0,

    open(menu) {
      this.view = 'room'; this.hx = null;
      menu.msg = '';
      menu.go('trophy');
    },

    /* ---------- DOM ---------- */
    render(menu) {
      const head = `<div class="tr2-top"><div class="m-title">${esc(_t('TROPHY ROOM'))}</div><div class="tr2-chips">
          <span title="${esc(_t('GOAT runs'))}">${PX().ui('trophy', 'sm')}<b>${stats().wins}</b></span>
          <span title="${esc(_t('Runs'))}">${PX().ui('ball', 'sm')}<b>${stats().plays}</b></span>
          <span title="${esc(_t('Album'))}">${PX().ui('book', 'sm')}<b>${albumPct()}%</b></span></div></div>`;
      const body = this.view === 'shelf' ? this.shelfDom() : this.view === 'album' ? this.albumDom() : this.view === 'board' ? this.boardDom() : this.roomDom();
      menu.el.innerHTML = `<div class="tr2 v-${this.view}"><canvas class="tr2-cv" width="${LW}" height="${LH}"></canvas>${head}${body}</div>`;
      cv = menu.el.querySelector('.tr2-cv');
      L = cv.getContext('2d');
      L.imageSmoothingEnabled = false;
      this.bindCanvases(menu);
      this.draw();
    },
    // phòng: nhãn 3 góc (tên + 1 con số)
    roomDom() {
      const D = pageDef(), cups = [0, 1, 2].filter((i) => actRec(i).n).length + (stats().wins ? 1 : 0);
      const lab = [[_t('TROPHIES'), `${cups}/4`], [_t('ALBUM'), `${albumPct()}%`], [_t('RUNS'), String((stats().hist || []).length)]];
      void D;
      return ZONES.map((z, i) => `<button class="tr2-zone ${i === this.zone ? 'on' : ''}" data-tz="${i}" style="left:${z.x * 2}px"><b>${esc(lab[i][0])}</b><em>${esc(lab[i][1])}</em></button>`).join('');
    },
    // kệ cúp: số lần + ngày đầu dưới mỗi cúp, cúp đang chọn có dòng chi tiết
    shelfDom() {
      const A = RC().acts, cups = this.cupList();
      const sel = cups[this.cup];
      const cell = (c, i) => `<button class="tr2-cup ${i === this.cup ? 'on' : ''} ${c.n ? '' : 'none'}" data-tc="${i}" style="left:${c.x * 2}px;top:${c.py * 2 + 12}px">
          ${PX().ui(c.goat ? 'trophy' : 'crown', 'sm')}<b>${c.n}</b></button>`;
      const medals = (n) => MEDALS.map(([col, at]) => `<i class="${n >= at ? 'on' : ''}" style="--m:${col}" title="×${at}"></i>`).join('');
      const old = storyCups().length ? `<div class="tr2-old" title="${esc(_t('FOOTBALL STORY'))}">${PX().ui('film', 'sm')}</div>` : '';
      return `${cups.map(cell).join('')}${old}
        <div class="tr2-strip" style="--c:${sel.color}"><b>${esc(sel.name)}</b>
          <span title="${esc(sel.goat ? _t('GOAT runs') : _t('Bosses beaten'))}">${PX().ui(sel.goat ? 'trophy' : 'crown', 'sm')}${sel.n}</span>
          ${sel.first ? `<span title="${esc(_t('First'))}">${PX().ui('calendar', 'sm')}${esc(date(sel.first))}</span>` : ''}
          <span class="tr2-med">${medals(sel.n)}</span></div>`;
    },
    cupList() {
      const A = RC().acts, st = stats();
      const firstWin = (st.hist || []).filter((h) => h.won).map((h) => h.d).sort((a, b) => a - b)[0] || 0;
      return [
        { kind: 'act0', x: 70, py: 138, n: actRec(0).n, first: actRec(0).first, name: A[0].name, color: A[0].color },
        { kind: 'act1', x: 160, py: 138, n: actRec(1).n, first: actRec(1).first, name: A[1].name, color: A[1].color },
        { kind: 'act2', x: 250, py: 138, n: actRec(2).n, first: actRec(2).first, name: A[2].name, color: A[2].color },
        { kind: 'goat', x: 160, py: 80, n: st.wins, first: firstWin, name: _t('THE GOAT'), color: '#ffd23f', goat: true },
      ];
    },
    // album: trang trái = sticker của trang đang mở · trang phải = mục lục
    albumDom() {
      const D = pageDef(), P0 = D[this.page], seen = stats().seen || {};
      const has = (k, id) => !!(seen[k] && seen[k][id]);
      let left = '';
      if (this.page === 'legend') {
        const LG = SFC_CONFIG.legends.list;
        left = `<div class="tr2-stk l5">${Object.keys(LG).map((id) => {
          const got = has('legend', id), Lg = LG[id];
          return `<span class="tr2-st ${got ? 'got' : ''}" style="--c:${Lg.color}" title="${esc(got ? Lg.name : '???')}"><canvas width="40" height="44" data-trlg="${id}"></canvas><b>${esc(got ? Lg.title : '???')}</b></span>`;
        }).join('')}</div>`;
      } else if (this.page === 'badge' || this.page === 'gear') {
        const ids = this.page === 'badge' ? badgeIds() : Object.keys(RC().gear.list);
        left = `<div class="tr2-stk l6">${ids.map((id) => {
          const d = this.page === 'badge' ? RC().badges[id] : RC().gear.list[id], got = has(this.page, id);
          const rc = (SFC_CONFIG.progression.rarities[d.rarity || 'common'] || {}).color || '#9aa3b5';
          const ic = this.page === 'badge' ? SFC.RunUI.badgeIcon(id, '') : PX().html(d.icon || 'ui-card', '', '');
          return `<span class="tr2-st patch ${got ? 'got' : ''}" style="--c:${rc}" title="${esc(got ? d.name : '???')}"><i>${ic}</i></span>`;
        }).join('')}</div>`;
      } else if (this.page === 'rival') {
        const T = SFC_CONFIG.teams.list, boss = new Set(RC().acts.flatMap((a) => a.boss || []));
        left = `<div class="tr2-stk l5">${rivalIds().map((id) => {
          const got = has('rival', id);
          return `<span class="tr2-st ${got ? 'got' : ''} ${boss.has(id) ? 'boss' : ''}" style="--c:${T[id].kit.accent || '#ff5a6e'}" title="${esc(got ? T[id].name : '???')}"><canvas width="40" height="44" data-trteam="${id}"></canvas><b>${esc(got ? T[id].short : '???')}</b></span>`;
        }).join('')}</div>`;
      } else {
        // ULTIMATES / ACHIEVEMENTS: số lớn + nút mở trang đầy đủ
        left = `<div class="tr2-big" style="--c:${P0.c}">${PX().ui(P0.icon, 'x3')}<b>${P0.got}<em>/${P0.n}</em></b>
          <button class="ac-act claim" data-topen="1">${esc(_t('OPEN'))}</button></div>`;
      }
      const idx = PAGES.map((k) => {
        const p = D[k];
        return `<button class="tr2-idx ${k === this.page ? 'on' : ''}" data-tp="${k}" style="--c:${p.c}">${PX().ui(p.icon, 'sm')}<span>${esc(p.name)}<i><u style="width:${(p.got / Math.max(1, p.n)) * 100}%"></u></i></span><em>${p.got}/${p.n}</em></button>`;
      }).join('');
      return `<div class="tr2-page l"><div class="tr2-ph" style="--c:${P0.c}"><b>${esc(P0.name)}</b><i><u style="width:${(P0.got / Math.max(1, P0.n)) * 100}%"></u></i></div>${left}</div>
        <div class="tr2-page r"><div class="tr2-ph"><b>${albumPct()}%</b></div>${idx}</div>`;
    },
    // bảng ghim: polaroid (lưới 3 x 2, 6 ảnh / trang — chân dung giữ 1:1) + bảng phấn kỷ lục (icon + số)
    boardDom() {
      const H = stats().hist || [], st = stats(), A = RC().acts, T = SFC_CONFIG.teams.list;
      this.pol = Math.max(0, Math.min(Math.max(0, H.length - 1), this.pol));
      const PER = 6, pg = Math.floor(this.pol / PER), list = H.slice(pg * PER, pg * PER + PER);
      const pols = list.map((h, k) => {
        const i = pg * PER + k, Ac = A[h.act] || A[0], lg = (h.sq.find((q) => q.you) || h.sq[0] || {}).lg || h.sq.map((q) => q.lg).find(Boolean);
        const res = h.won ? `<u class="win">${esc(_t('CHAMPIONS'))}</u>` : h.by ? `<u class="ko">KO · ${esc(T[h.by].short)}</u>` : `<u class="ko">${esc(_t('OUT'))}</u>`;
        const path = A.map((a, ai) => `<i class="${ai < h.act || h.won ? 'boss' : ai === h.act ? 'on' : ''}" style="--w:${ai === h.act && !h.won ? Math.min(100, ((h.f + 1) / (RC().map.floors + 1)) * 100) : 100}%"></i>`).join('');
        return `<button class="tr2-pol ${i === this.pol ? 'on' : ''}" data-tpol="${i}" style="--ac:${Ac.color}" title="${esc(date(h.d))}">
            <span class="tp-ph">${lg ? `<canvas class="lg" width="40" height="44" data-trlg="${lg}"></canvas>` : ''}${h.sq.map((q, qi) => `<canvas width="40" height="44" data-trsq="${i}.${qi}"></canvas>`).join('')}${res}</span>
            <span class="tp-cap"><b>${h.won ? 'GOAT' : esc(_t('ACT {n}', { n: h.act + 1 }))}</b><em>${h.my}-${h.op}</em></span><span class="tp-path">${path}</span></button>`;
      }).join('') || `<div class="tr2-empty">${PX().ui('ball', 'x2')}</div>`;
      // nemesis: đội loại bạn nhiều nhất · LEGEND hay dùng nhất (ô của bạn)
      const tally = (arr) => { const m = {}; for (const x of arr) if (x) m[x] = (m[x] || 0) + 1; return Object.keys(m).sort((a, b) => m[b] - m[a])[0] || null; };
      const nem = tally(H.map((h) => h.by)), fav = tally(H.map((h) => (h.sq.find((q) => q.you) || {}).lg));
      const rec = (title, icon, val) => `<div class="tr2-rec" title="${esc(title)}">${icon}<b>${val}</b></div>`;
      const pages = H.length > PER ? `<span class="tr2-pg">${pg + 1}/${Math.ceil(H.length / PER)}</span>` : '';
      return `<div class="tr2-cork">${pols}${pages}</div>
        <div class="tr2-chalk">
          ${rec(_t('GOAT runs'), PX().ui('trophy', 'x2'), st.wins)}
          ${rec(_t('Bosses beaten'), PX().ui('crown', 'x2'), st.bosses)}
          ${rec(_t('Most goals in a run'), PX().ui('ball', 'x2'), (st.best && st.best.goals) || 0)}
          ${rec(_t('Fastest GOAT run'), PX().ui('calendar', 'x2'), clock(st.best && st.best.fast))}
          ${rec(_t('Favourite LEGEND'), fav ? `<canvas width="40" height="44" data-trlg="${fav}"></canvas>` : PX().ui('star', 'x2'), '')}
          ${rec(_t('Nemesis'), nem ? `<canvas width="40" height="44" data-trteam="${nem}"></canvas>` : PX().ui('fist', 'x2'), '')}
        </div>`;
    },
    // vẽ chân dung vào các canvas DOM (LEGEND / đội đối thủ / đội hình 1 run)
    bindCanvases(menu) {
      const kit = SFC_CONFIG.mainPath.playerTeam.kit, T = SFC_CONFIG.teams.list, H = stats().hist || [];
      const look = (o) => PF().lookOf(Object.assign({}, SFC_CONFIG.progression.defaultLook, o || {}));
      menu.el.querySelectorAll('canvas[data-trlg]').forEach((c) => SFC.Sprites.drawAvatar(c, SFC.LegendDraw.lookOf(SFC_CONFIG.legends.list[c.dataset.trlg]), kit, 0.3, Math.PI / 2));
      menu.el.querySelectorAll('canvas[data-trteam]').forEach((c) => {
        const t = T[c.dataset.trteam];
        SFC.Sprites.drawAvatar(c, look((t.looks || [])[0]), t.kit, 0.3, Math.PI / 2);
      });
      menu.el.querySelectorAll('canvas[data-trsq]').forEach((c) => {
        const [i, qi] = c.dataset.trsq.split('.').map(Number), q = H[i] && H[i].sq[qi];
        if (q) SFC.Sprites.drawAvatar(c, q.you ? PF().avatar().look : look(q.look), kit, 0.3, Math.PI / 2);
      });
    },

    /* ---------- canvas pixel ---------- */
    tick(menu, dt) {
      if (menu.page !== 'trophy' || !cv || !cv.isConnected) return;
      this.t += dt;
      this.draw(dt);
    },
    draw(dt = 0) {
      if (!L) return;
      const t = this.t;
      if (this.view === 'room') this.drawRoom(t, dt);
      else if (this.view === 'shelf') this.drawShelf(t);
      else if (this.view === 'album') this.drawAlbum();
      else this.drawBoard();
    },
    drawRoom(t, dt) {
      wall(122); floor(122);
      // thảm cỏ cũ giữa sàn
      P(96, 146, 128, 26, O); P(97, 147, 126, 24, '#2f6a34');
      for (let x = 97; x < 223; x += 8) P(x, 147, 4, 24, '#357a3a');
      P(159, 147, 1, 24, '#d8e8d0'); P(97, 147, 126, 1, '#4a9a4a');
      // ---- kệ cúp (trái) ----
      P(9, 26, 3, 96, '#5a3820'); P(108, 26, 3, 96, '#5a3820'); P(9, 26, 102, 2, '#8a5a30');
      plank(8, 60, 104); plank(8, 96, 104); plank(8, 118, 104);
      const cups = this.cupList(), on = this.zone === 0;
      const g = sprite(L, 'goat', 60, 60, 2, !stats().wins);
      if (stats().wins) sparkle(g, t, 1);
      [0, 1, 2].forEach((i) => { const b = sprite(L, 'act' + i, 26 + i * 34, 96, 2, !cups[i].n); if (cups[i].n) sparkle(b, t, i + 3); });
      // kệ thấp: cúp FOOTBALL STORY cũ đã vô địch (nhỏ)
      const old = storyCups();
      if (old.length && SFC.Story && SFC.StoryCup) SFC.Story.paint(cv, (H) => old.slice(0, 4).forEach((s, i) => SFC.StoryCup.trophy(H, s.trophy, 24 + i * 24, 118, 0.32, t)));
      // ---- bàn + album (giữa) ----
      P(132, 104, 64, 4, O); P(133, 104, 62, 3, '#8a5a30'); P(133, 104, 62, 1, '#a8743e');
      P(136, 108, 4, 14, '#5a3820'); P(188, 108, 4, 14, '#5a3820');
      // đèn bàn
      P(140, 78, 2, 26, '#3a3a40'); P(134, 74, 14, 5, O); P(135, 75, 12, 3, '#5a5a64'); P(136, 78, 10, 1, '#ffe9a8');
      // album mở
      P(150, 94, 38, 11, O); P(151, 95, 17, 9, '#efe6d2'); P(170, 95, 17, 9, '#e2d8c0'); P(168, 95, 2, 9, '#b8ac90');
      const sc = ['#c77bff', '#ff7a3d', '#3ff6ff', '#ff5a6e', '#ffd23f', '#6bff4f'];
      for (let i = 0; i < 6; i++) P(153 + (i % 3) * 5, 97 + Math.floor(i / 3) * 4, 3, 3, sc[i]);
      for (let i = 0; i < 6; i++) P(172 + (i % 3) * 5, 97 + Math.floor(i / 3) * 4, 3, 3, i < 2 ? '#c8bca0' : '#d8ceb6');
      // ---- bảng ghim (phải) ----
      P(214, 26, 98, 72, O); P(215, 27, 96, 70, '#9a6436');
      P(217, 29, 92, 66, '#b07a44');
      for (let y = 29; y < 95; y += 2) for (let x = 217 + (y % 4 ? 0 : 1); x < 309; x += 3) if (hsh(x * 3 + y * 7) < 0.3) P(x, y, 1, 1, '#9a6436');
      const H = stats().hist || [], A = RC().acts;
      for (let i = 0; i < 8; i++) {
        const x = 221 + (i % 4) * 22, y = 33 + Math.floor(i / 4) * 31, h = H[i];
        if (!h) continue;
        P(x - 1, y - 1, 20, 26, O); P(x, y, 18, 24, '#f4eee2');
        P(x + 2, y + 2, 14, 13, (A[h.act] || A[0]).color); P(x + 2, y + 9, 14, 6, '#2a2e38');
        P(x + 8, y - 2, 2, 2, ['#e0403a', '#3a8ae0', '#ffd23f'][i % 3]);
        if (h.won) P(x + 3, y + 18, 12, 3, '#ffd23f'); else P(x + 3, y + 18, 12, 1, '#c8bca0');
      }
      // ---- character đi tới góc đang chọn ----
      const tx = ZONES[this.zone].x;
      if (this.hx == null) this.hx = tx;
      const step = Math.min(1, dt * 6);
      this.hx += (tx - this.hx) * step;
      const moving = Math.abs(tx - this.hx) > 1;
      figure(PF().avatar().look, SFC_CONFIG.mainPath.playerTeam.kit, this.hx, 176, moving ? t * 2 : 0.3, moving ? (tx > this.hx ? 0 : Math.PI) : -Math.PI / 2);
      void on;
    },
    drawShelf(t) {
      wall(180);
      // tủ gỗ lớn
      P(20, 22, 4, 150, '#5a3820'); P(296, 22, 4, 150, '#5a3820'); P(20, 22, 280, 3, '#8a5a30');
      plank(20, 80, 280); plank(20, 138, 280);
      P(20, 168, 280, 4, '#5a3820');
      const cups = this.cupList();
      cups.forEach((c, i) => {
        const b = sprite(L, c.kind, c.x, c.py, 3, !c.n);
        if (c.n) sparkle(b, t, i + 1);
        plaque(c.x, c.py + 5, c.goat ? 40 : 32, c.color);
        if (i === this.cup) brackets(b.x0, b.y0, b.w, b.h + 10, t);
      });
      // kệ nhỏ trên cùng bên phải: cúp FOOTBALL STORY cũ đã vô địch
      const old = storyCups();
      if (old.length && SFC.Story && SFC.StoryCup) {
        plank(236, 44, 58);
        SFC.Story.paint(cv, (H) => old.slice(0, 4).forEach((s, i) => SFC.StoryCup.trophy(H, s.trophy, 244 + i * 14, 44, 0.3, t)));
      }
    },
    drawAlbum() {
      // mặt bàn gỗ + cuốn album mở (2 trang giấy, gáy giữa)
      P(0, 0, LW, LH, '#3a2618');
      for (let y = 0; y < LH; y += 9) P(0, y, LW, 1, '#33200f');
      P(13, 21, 294, 154, O); P(14, 22, 292, 152, '#6a3a1a');
      P(17, 24, 142, 147, '#efe6d2'); P(161, 24, 142, 147, '#efe6d2');
      P(157, 24, 6, 147, '#c8bca0'); P(159, 24, 2, 147, '#a89c80');
      P(17, 168, 142, 3, '#d8ceb6'); P(161, 168, 142, 3, '#d8ceb6');
    },
    drawBoard() {
      wall(180);
      // bảng gỗ bần
      P(6, 22, 214, 152, O); P(7, 23, 212, 150, '#7a4a22'); P(10, 26, 206, 144, '#b07a44');
      for (let y = 26; y < 170; y += 2) for (let x = 10 + (y % 4 ? 0 : 1); x < 216; x += 3) if (hsh(x * 3 + y * 7) < 0.3) P(x, y, 1, 1, '#9a6436');
      // bảng phấn
      P(226, 22, 90, 152, O); P(227, 23, 88, 150, '#6a4422'); P(230, 26, 82, 144, '#24382c');
      for (let i = 0; i < 18; i++) P(232 + hsh(i) * 76, 28 + hsh(i * 9) * 140, 2, 1, '#2e4636');
      P(234, 166, 12, 2, '#e8ecf5');
    },

    /* ---------- điều khiển ---------- */
    go(menu, view) { this.view = view; SFC.Audio.menu(); menu.render(); },
    openPage(menu) {
      if (this.page === 'ult') { SFC.Audio.menu(); menu.ultsBack = 'trophy'; return menu.go('ults'); }
      if (this.page === 'ach') { SFC.Audio.menu(); return SFC.AchUI.open(menu); }
    },
    input(menu, input) {
      const L1 = input.wasPressed('left'), R1 = input.wasPressed('right'), ok = input.wasPressed('confirm');
      if (this.view === 'room') {
        if (L1 || R1) { this.zone = Math.max(0, Math.min(2, this.zone + (R1 ? 1 : -1))); SFC.Audio.menu(); return menu.render(); }
        if (ok) return this.go(menu, ZONES[this.zone].v);
        return;
      }
      if (this.view === 'shelf') {
        if (input.wasPressed('up')) { this.cup = 3; SFC.Audio.menu(); return menu.render(); }
        if (input.wasPressed('down') && this.cup === 3) { this.cup = 1; SFC.Audio.menu(); return menu.render(); }
        if (L1 || R1) { this.cup = this.cup === 3 ? (R1 ? 2 : 0) : Math.max(0, Math.min(2, this.cup + (R1 ? 1 : -1))); SFC.Audio.menu(); return menu.render(); }
        return;
      }
      if (this.view === 'album') {
        const d = (R1 || input.wasPressed('tabNext') || input.wasPressed('down') ? 1 : 0) - (L1 || input.wasPressed('tabPrev') || input.wasPressed('up') ? 1 : 0);
        if (d) { this.page = PAGES[(PAGES.indexOf(this.page) + d + PAGES.length) % PAGES.length]; SFC.Audio.menu(); return menu.render(); }
        if (ok) return this.openPage(menu);
        return;
      }
      const n = (stats().hist || []).length;
      if ((L1 || R1) && n) { this.pol = Math.max(0, Math.min(n - 1, this.pol + (R1 ? 1 : -1))); SFC.Audio.menu(); return menu.render(); }
    },
    click(menu, e) {
      const z = e.target.closest('[data-tz]');
      if (z) { const i = +z.dataset.tz; if (i === this.zone) this.go(menu, ZONES[i].v); else { this.zone = i; SFC.Audio.menu(); menu.render(); } return true; }
      const c = e.target.closest('[data-tc]');
      if (c) { this.cup = +c.dataset.tc; SFC.Audio.menu(); menu.render(); return true; }
      const p = e.target.closest('[data-tp]');
      if (p) { if (p.dataset.tp === this.page) this.openPage(menu); else { this.page = p.dataset.tp; SFC.Audio.menu(); menu.render(); } return true; }
      if (e.target.closest('[data-topen]')) { this.openPage(menu); return true; }
      const pl = e.target.closest('[data-tpol]');
      if (pl) { this.pol = +pl.dataset.tpol; SFC.Audio.menu(); menu.render(); return true; }
      // phòng: bấm vào góc trên canvas = đi tới / mở góc đó
      const cvEl = e.target.closest('.tr2-cv');
      if (cvEl && this.view === 'room') {
        const rc = cvEl.getBoundingClientRect(), x = ((e.clientX - rc.left) / rc.width) * LW;
        const i = x < 120 ? 0 : x < 206 ? 1 : 2;
        if (i === this.zone) this.go(menu, ZONES[i].v); else { this.zone = i; SFC.Audio.menu(); menu.render(); }
        return true;
      }
      return false;
    },
    back(menu) {
      if (this.view !== 'room') { this.view = 'room'; SFC.Audio.menu(); return menu.render(); }
      menu.go('home');
    },
  };

  SFC.TrophyUI = TrophyUI;
})();
