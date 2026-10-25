/* RoadUI — trang AREA MAP (tên cũ GOAT PATH, nay là tên chế độ run — docs/RUN_DESIGN.md): hành trình xếp hạng dạng bản đồ biển trình bày ngang (kiểu Trophy Road của Clash Royale).
 *   Mở từ màn PLAY › RANKED: bấm cụm "Area + thanh tiến độ" ở đầu màn (hoặc ↑ chọn rồi Enter).
 *   Mỗi Area = 1 đảo pixel (màu Area, sân thu nhỏ của Area ở giữa, cờ tên phía trên, Tuyệt kỹ + Core vào Area phía dưới).
 *   Đảo nối nhau bằng đường đi zigzag; mốc ⅓ / ⅔ của Core Road = cột mốc trên đường (★Elo + Core mở ở đó).
 *   Nhân vật của bạn đứng trên đường đúng chỗ Elo hiện tại; đoạn đã đi tô vàng. Thanh dưới: chi tiết đảo đang chọn.
 *   ←→ chọn đảo (camera trượt theo) · lăn chuột = cuộn ngang · bấm đảo để chọn.
 *   mainPath.roadSpoilers = false: Area chưa từng tới hiện ??? + bóng xám (mặc định true: hiện hết).
 * Số liệu: config/mainpath.config.js (areas[].elo / road) · mốc: SFC.MainPath.roadElo
 * Menu gọi: render(menu) · input(menu, input) · click(menu, e) · back(menu) · open(menu)
 */
window.SFC = window.SFC || {};

(function () {
  const _t = SFC.t;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const MP = () => SFC.MainPath;
  const PF = () => SFC.Profile;
  const CORES = () => SFC_CONFIG.cores;
  const PX = () => SFC.PixelIcon;
  const G = () => SFC.Gacha;

  // bố cục thế giới (px): khoảng cách tâm 2 đảo, lề 2 đầu, chiều cao, tâm đảo zigzag trên / dưới, nửa bề rộng đảo + khoảng hở
  const STEP = 330, PAD = 120, H = 200, YS = [76, 128], EDGE = 75 + 18;

  const RoadUI = {
    pages: ['road'],
    sel: 0,

    // mở ở Area đang đứng
    open(menu) { this.sel = MP().state.area; this.scroll = null; menu.msg = ''; menu.go('road'); },

    // Area a đã lộ (tên / phần thưởng) · bản DEMO: Area bị khoá luôn ẩn
    seen(a) { return !MP().demoLocked(a) && (a <= MP().state.best || SFC_CONFIG.mainPath.roadSpoilers !== false); },
    // tâm đảo a trên bản đồ
    pos(a) { return { x: PAD + a * STEP, y: YS[a % 2] }; },
    // điểm trên đường đi từ đảo a sang đảo a + 1 theo tiến độ Elo t trong Area (Area cuối: kéo dài về bên phải).
    // Các mốc ⅓ / ⅔ rơi vào khoảng biển giữa 2 đảo (không đè lên đảo): t 0 -> tâm đảo, ⅓ / ⅔ -> chia đều khoảng biển, 1 -> đảo kế
    along(a, t) {
      const p = this.pos(a), q = MP().area(a + 1) ? this.pos(a + 1) : { x: p.x + STEP * 0.8, y: p.y };
      const m = EDGE / STEP, k = [[0, 0], [1 / 3, m + (1 - 2 * m) / 3], [2 / 3, m + (2 * (1 - 2 * m)) / 3], [1, 1]];
      let u = 1;
      for (let i = 1; i < k.length; i++) {
        if (t <= k[i][0]) { const [t0, u0] = k[i - 1], [t1, u1] = k[i]; u = u0 + ((t - t0) / (t1 - t0)) * (u1 - u0); break; }
      }
      return { x: p.x + (q.x - p.x) * u, y: p.y + (q.y - p.y) * u };
    },

    // 1 phần thưởng: Tuyệt kỹ (khung vàng) / Core (viền màu trường phái). Đã có: sáng + ✓ · chưa có: mờ · chưa lộ: bóng xám
    reward(id, show, big = false) {
      const c = CORES().list[id];
      if (!c) return '';
      const have = PF().coreUnlocked(id), ult = c.role === 'ult', col = (CORES().archetypes[c.tags[0]] || {}).color || '#e6dccb';
      const title = show ? `${c.name}${ult ? ' · ' + _t('ULTIMATE') : ''}` : (ult ? _t('ULTIMATE') : _t('CORE')) + ' · ???';
      return `<i class="rd-rw ${ult ? 'ult' : ''} ${big ? 'big' : ''} ${have ? 'got' : show ? 'next' : 'sil'}" style="--c:${show ? col : '#525a6b'}" title="${esc(title)}">${PX().core(id, show ? '' : 'sil')}${have ? `<em>${PX().ui('check', 'sm')}</em>` : ''}</i>`;
    },

    // vị trí của bạn trên đường: đảo Area đang đứng + tỉ lệ trong khoảng Elo của Area
    mePos() {
      const st = MP().state;
      return this.along(st.area, Math.max(0, Math.min(1, MP().frac(st.elo, st.area))));
    },

    island(A, a) {
      const st = MP().state, show = this.seen(a), p = this.pos(a), next = MP().area(a + 1);
      const here = a === st.area, reached = a <= st.best;
      const entry = (A.road || [])[0] || [];
      const range = next ? `${A.elo}–${next.elo - 1}` : `${A.elo}+`;
      const flagPos = a % 2 ? 'low' : 'high';
      return `<div class="rd-isl ${here ? 'here' : ''} ${reached ? 'reached' : 'ahead'} ${a === this.sel ? 'sel' : ''} ${flagPos}" data-rd="${a}"
          style="left:${p.x}px;top:${p.y}px;--ac:${show ? A.color : '#6a5f6e'}">
          <div class="rd-flag"><b>${a + 1}</b><span>${show ? esc(A.name) : '???'}</span><em>${PX().elo(esc(range))}</em></div>
          <div class="rd-foam"></div><div class="rd-cliff"></div>
          <div class="rd-land"><canvas data-arena="${a}" data-tease="1" width="300" height="112"></canvas>${show ? '' : `<i class="rd-q">${PX().ui('unknown', 'x2')}</i>`}</div>
          ${reached ? '' : `<i class="rd-lock">${PX().ui('lock', 'sm')}</i>`}
          ${entry.length ? `<div class="rd-loot">${entry.map((id) => this.reward(id, show, CORES().list[id] && CORES().list[id].role === 'ult')).join('')}</div>` : ''}
        </div>`;
    },

    // cột mốc ⅓ / ⅔ trên đường đi tới đảo kế
    nodes(A, a) {
      const show = this.seen(a), st = MP().state, n = Math.max(1, (A.road || []).length);
      return (A.road || []).map((ids, i) => {
        if (i === 0 || !ids.length) return '';
        const e = MP().roadElo(a, i), p = this.along(a, i / n), done = st.peak >= e;
        // 2 cột mốc so le: Core của mốc ⅓ phía trên đường, mốc ⅔ phía dưới (không chồng lên nhau)
        return `<div class="rd-node ${done ? 'done' : ''} ${a > st.best ? 'ahead' : ''} ${i % 2 ? 'up' : 'dn'}" style="left:${p.x}px;top:${p.y}px">
            <i class="rd-stone"></i><span class="rd-ne">${PX().elo(e)}</span><span class="rd-nl">${ids.map((id) => this.reward(id, show)).join('')}</span></div>`;
      }).join('');
    },

    // đường đi: cả đường (nét đứt) + đoạn đã đi (vàng) tới chỗ bạn đang đứng
    path() {
      const areas = MP().areas(), last = areas.length - 1, me = this.mePos(), st = MP().state;
      const pts = areas.map((A, a) => this.pos(a));
      pts.push(this.along(last, 1));
      const done = pts.slice(0, st.area + 1).concat([me]);
      const P = (l) => l.map((p) => `${Math.round(p.x)},${Math.round(p.y)}`).join(' ');
      const W = PAD * 2 + last * STEP + STEP * 0.8;
      return `<svg class="rd-path" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
          <polyline class="all" points="${P(pts)}"/><polyline class="done" points="${P(done)}"/></svg>`;
    },

    // thanh dưới: chi tiết đảo đang chọn
    info(a) {
      const A = MP().area(a), st = MP().state, show = this.seen(a), next = MP().area(a + 1), L = CORES().list;
      const range = next ? `${A.elo}–${next.elo - 1}` : `${A.elo}+`;
      const status = MP().demoLocked(a) ? _t('FULL GAME') : a === st.area ? _t('YOU ARE HERE') : a <= st.best ? _t('REACHED') : _t('LOCKED');
      const name = (id) => (show && L[id] ? esc(L[id].name) : '???');
      const groups = (A.road || []).map((ids, i) => {
        const all = ids;
        if (!all.length) return '';
        return `<span class="rd-ig ${st.peak >= MP().roadElo(a, i) ? 'done' : ''}">${PX().elo(MP().roadElo(a, i))} ${all.map((id) => `${this.reward(id, show)}<b class="${L[id] && L[id].role === 'ult' ? 'ult' : ''}">${name(id)}</b>`).join(' ')}</span>`;
      }).join('');
      const starter = a === 0 ? `<span class="rd-ig done">${PX().ui('star', 'sm')} ${esc(_t('{n} starter Cores', { n: SFC_CONFIG.progression.starterCores.filter((id) => L[id] && L[id].role !== 'ult').length }))}</span>` : '';
      return `<div class="rd-info" style="--ac:${show ? A.color : '#6a5f6e'}">
          <span class="rd-ib">${show ? PX().area(A.id, 'x2') : PX().ui('unknown', 'x2')}</span>
          <div class="rd-ih"><b>${esc(_t('AREA {n}', { n: a + 1 }))} · ${show ? esc(A.name) : '???'}</b><span>${show ? esc(A.sub) : ''}</span>
            <em>${PX().elo(esc(range))} · ${esc(status)}</em></div>
          <div class="rd-iw">${starter}${groups || `<span class="rd-ig">${esc(_t('Gold & XP after every match'))}</span>`}</div>
        </div>`;
    },

    render(menu) {
      const areas = MP().areas(), st = MP().state, L = CORES().list;
      this.sel = Math.max(0, Math.min(this.sel, areas.length - 1));
      const old = menu.el.querySelector('.rd-view'), from = old ? old.scrollLeft : this.scroll;
      const normal = Object.keys(L).filter((id) => L[id].role !== 'ult');
      const sum = `<div class="rd-sum">${PX().elo(st.elo)} <span>${esc(_t('CORES {n}/{total}', { n: PF().collection().length, total: normal.length }))}</span>
        <span>${esc(_t('ULT BOOK {n}/{total}', { n: PF().data.ultBook.length, total: PF().ultEntries().length }))}</span></div>`;
      const me = this.mePos(), W = PAD * 2 + (areas.length - 1) * STEP + STEP * 0.8;
      const msg = menu.msg ? `<div class="m-msg ${menu.msgErr ? 'err' : ''}">${esc(menu.msg)}</div>` : '';
      menu.el.innerHTML = `${G().header(esc(_t('AREA MAP')), sum)}
        <div class="rd-view"><div class="rd-world" style="width:${W}px;height:${H}px">
          ${this.path()}
          ${areas.map((A, a) => this.nodes(A, a)).join('')}
          ${areas.map((A, a) => this.island(A, a)).join('')}
          <div class="rd-me" style="left:${me.x}px;top:${me.y}px"><b>${esc(_t('YOU'))}</b><canvas class="avatar" data-avatar="spin"></canvas></div>
        </div></div>
        ${this.info(this.sel)}${msg}`;
      const view = menu.el.querySelector('.rd-view');
      // camera: giữ chỗ cũ rồi trượt tới đảo đang chọn (lần đầu: đặt thẳng)
      const target = Math.max(0, this.pos(this.sel).x - view.clientWidth / 2);
      if (from != null) {
        view.scrollLeft = from;
        view.scrollTo({ left: target, behavior: 'smooth' });
        // trình duyệt không chạy cuộn mượt (tab nền / tắt hiệu ứng): đặt thẳng
        setTimeout(() => { if (view.isConnected && Math.abs(view.scrollLeft - target) > 4) view.scrollLeft = target; }, 450);
      } else view.scrollLeft = target;
      this.scroll = target;
      // lăn chuột dọc = cuộn ngang
      view.addEventListener('wheel', (e) => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { view.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false });
    },

    input(menu, input) {
      const n = MP().areas().length;
      let to = this.sel;
      if (input.wasPressed('left') || input.wasPressed('up')) to = Math.max(0, this.sel - 1);
      if (input.wasPressed('right') || input.wasPressed('down')) to = Math.min(n - 1, this.sel + 1);
      if (to !== this.sel) { this.sel = to; SFC.Audio.menu(); menu.render(); }
    },

    click(menu, e) {
      const isl = e.target.closest('[data-rd]');
      if (!isl) return false;
      this.sel = +isl.dataset.rd; SFC.Audio.menu(); menu.render();
      return true;
    },

    back(menu) { this.scroll = null; menu.go('party'); },
  };

  SFC.RoadUI = RoadUI;
})();
