/* Gacha — các trang meta dùng chung khung #menu (Menu gọi vào khi page thuộc Gacha.pages):
 *   shop : chọn hộp gacha (costume / Core), xem tỉ lệ theo độ hiếm + toàn bộ món trong hộp
 *   open : quay hộp kiểu CSGO — dải item chạy chậm dần rồi dừng ở món trúng, sau đó hiện kết quả
 *   inv  : túi đồ — trang bị costume, phân rã món (hoặc toàn bộ đồ trùng) ra gold
 * Menu gọi: render(menu) · input(menu, input) · click(menu, e) · tick(menu) · back(menu)
 */
window.SFC = window.SFC || {};

(function () {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const PF = () => SFC.Profile;
  const PROG = () => SFC_CONFIG.progression;
  const CORE_LIST = () => SFC_CONFIG.cores.list;
  const DEFAULT_RAR = { label: 'MẶC ĐỊNH', color: '#6a5f6e', value: 0 };
  const RAR = (r) => PROG().rarities[r] || DEFAULT_RAR;
  const rank = (r) => PROG().rarityOrder.indexOf(r);            // -1 = đồ mặc định
  const FX_ICON = {
    nofx: '', sparkle: '✨', bubbles: '🫧', leaves: '🍃', hearts: '💖', snow: '❄️', smoke: '🌫️', dust: '💨', notes: '🎵',
    confetti: '🎊', petals: '🌸', coins: '🪙', neon: '💠', frost: '🧊', lightning: '⚡', rainbow: '🌈', fire: '🔥',
    shadow: '👻', galaxy: '🌌', aura: '🌟',
  };
  const INV_TABS = [['all', 'TẤT CẢ'], ['hair', 'TÓC & MŨ'], ['face', 'MẶT'], ['shoes', 'GIÀY'], ['fx', 'HIỆU ỨNG'], ['core', 'CORE']];
  const INV_COLS = 6;
  const REEL_STEP = 56, REEL_CARD = 52, REEL_W = 560; // khớp CSS .rcard / .reel
  const REASON = { gold: 'Không đủ gold.', level: 'Chưa đủ level để mở hộp này.' };
  const wrap = (v, n) => ((v % n) + n) % n;
  const ARCH = () => SFC_CONFIG.cores.archetypes;
  const ARCH_KEYS = () => ['all'].concat(Object.keys(ARCH()));

  // "Thường đi cùng": 2–3 Core hợp build với Core id (cùng trường phái; ưu tiên TẠO <-> DÙNG, Tuyệt kỹ, cầu nối)
  function suggest(id) {
    const L = CORE_LIST(), c = L[id];
    if (c.tags.includes('chaos')) return [];
    const pair = { gen: 'use', use: 'gen' };
    return Object.keys(L).filter((k) => k !== id && L[k].tags.some((t) => c.tags.includes(t)))
      .map((k) => {
        const o = L[k];
        let s = o.tags.filter((t) => c.tags.includes(t)).length;
        if (pair[c.role] === o.role) s += 3;
        if (o.role === 'ult' && c.role !== 'ult') s += 2;
        if (o.tags.length > 1) s += 1;
        s += Math.max(0, rank(o.rarity)) * 0.1;
        return { k, s };
      })
      .sort((a, b) => b.s - a.s).slice(0, 3).map((x) => x.k);
  }

  function roleText(c) {
    const L = SFC_CONFIG.cores.roleLabels;
    if (c.role === 'gen' || c.role === 'use') {
      const mech = c.tags.map((t) => ARCH()[t] && ARCH()[t].mech).filter(Boolean).join(' / ');
      return mech ? `${L[c.role]}: ${mech}` : L[c.role];
    }
    return L[c.role] || '';
  }

  function coin(n) { return `<span class="gold"><i class="coin"></i>${Number(n).toLocaleString('en-US')}</span>`; }

  // thanh XP + level (trang chủ, nhân vật, shop, túi đồ)
  function xpBar(d) {
    const need = PF().xpToNext(d.level);
    const pct = need === Infinity ? 100 : Math.round((d.xp / need) * 100);
    return `<div class="lvrow"><span class="lv">LV ${d.level}</span>
      <div class="xpbar"><i style="width:${pct}%"></i></div>
      <span class="xpnum">${need === Infinity ? 'MAX' : `${Math.floor(d.xp)}/${need} XP`}</span></div>`;
  }

  // hộp gacha vẽ bằng CSS (thân + nắp + dải ruy băng + dấu ?)
  function boxArt(color, big = false) {
    return `<div class="boxart ${big ? 'big' : ''}" style="--bc:${color}"><i></i><b>?</b></div>`;
  }

  function nameOf(e) { return e.kind === 'core' ? CORE_LIST()[e.id].name : PROG().items[e.id].name; }

  // icon của 1 món: costume = canvas (vẽ ở bindIcons), Core = emoji
  function iconHtml(e) {
    if (e.kind === 'core') return `<span class="ic-emoji">${CORE_LIST()[e.id].icon}</span>`;
    const it = PROG().items[e.id];
    return `<canvas data-icon="${e.id}" width="40" height="40"></canvas>${it.slot === 'fx' && FX_ICON[e.id] ? `<span class="ic-fx">${FX_ICON[e.id]}</span>` : ''}`;
  }

  // món trong túi đồ / trong hộp: { kind: item | core, id, rarity, count, def }
  function entry(kind, id) {
    // gacha Core tắt: mọi Core là "có sẵn" (không đếm số lượng, không phân rã)
    const def = kind === 'core' ? !PROG().coreGacha || PROG().starterCores.includes(id) : !!PROG().items[id].default;
    return { kind, id, rarity: def && kind !== 'core' ? null : PF().rarityOf(kind, id), count: PF().count(kind, id), def };
  }

  const Gacha = {
    pages: ['shop', 'open', 'inv'],
    coin, xpBar,
    boxSel: 0,        // 0..số hộp-1 = hộp, cuối cùng = nút TÚI ĐỒ
    invTab: 0,
    invSel: 0,
    invArch: 0,       // mục CORE: lọc theo trường phái (0 = tất cả)
    opening: null,    // lượt quay hiện tại
    confirm: null,    // { key, t } — phân rã món hiếm cần bấm 2 lần
    shopBack: 'home',
    invBack: 'char',

    /* ================= VẼ ================= */
    render(menu) {
      const page = menu.page;
      const body = page === 'shop' ? this.pageShop(menu) : page === 'open' ? this.pageOpen(menu) : this.pageInv(menu);
      const msg = menu.msg ? `<div class="m-msg ${menu.msgErr ? 'err' : ''}">${esc(menu.msg)}</div>` : '';
      menu.el.innerHTML = body.replace('<!--msg-->', msg);
      this.bindIcons(menu);
      SFC.CorePreview.scan(menu.el);
      if (page === 'inv') this.keepVisible(menu.el.querySelector('.inv-grid'), menu.el.querySelector('.icard.sel'));
    },

    header(title, mid = '') {
      const d = PF().data;
      return `<div class="tut-head shop-head">
        <div class="m-title">${title}</div>${mid}
        <div class="shop-wallet">${xpBar(d)}${coin(d.gold)}</div>
      </div>`;
    },

    // vẽ icon costume: character (look hiện tại) mặc thử món đó, phóng to vùng liên quan
    bindIcons(menu) {
      const kit = menu.kit();
      menu.el.querySelectorAll('canvas[data-icon]').forEach((cv) => {
        const id = cv.dataset.icon, it = PROG().items[id];
        const look = PF().lookOf(Object.assign({}, PF().data.look, { [it.slot]: id }));
        SFC.Sprites.drawItemIcon(cv, look, kit, it.slot);
      });
    },

    keepVisible(box, row) {
      if (!box || !row) return;
      if (row.offsetTop < box.scrollTop) box.scrollTop = row.offsetTop - 2;
      else if (row.offsetTop + row.offsetHeight > box.scrollTop + box.clientHeight) box.scrollTop = row.offsetTop + row.offsetHeight - box.clientHeight + 2;
    },

    /* ---------- SHOP: danh sách hộp ---------- */
    pageShop() {
      const d = PF().data, P = PROG();
      const n = P.boxOrder.length;
      this.boxSel = Math.min(this.boxSel, n);
      const rows = P.boxOrder.map((id, i) => {
        const b = P.boxes[id], lock = b.level > d.level;
        return `<button class="boxrow ${i === this.boxSel ? 'sel' : ''} ${lock ? 'lock' : ''}" data-box="${i}" style="--bc:${b.color}">
          ${boxArt(b.color)}
          <div class="br-info"><div class="br-name">${esc(b.name)}</div>
            <div class="br-sub">${b.kind === 'core' ? 'CORE' : 'COSTUME'} · ${lock ? `🔒 LV ${b.level}` : coin(b.price)}</div></div>
        </button>`;
      }).join('') + `<button class="boxrow inv-link ${this.boxSel === n ? 'sel' : ''}" data-box="${n}">
          <div class="br-info"><div class="br-name">TÚI ĐỒ →</div><div class="br-sub">Trang bị · phân rã ra gold</div></div></button>`;
      if (this.boxSel === n) {
        return `${this.header('SHOP')}
          <div class="gacha-body shop-g"><div class="box-list">${rows}</div>
            <div class="box-detail center"><div class="sd-name">TÚI ĐỒ</div><div class="sd-desc">Xem đồ đã quay được, trang bị cho character hoặc phân rã đồ không cần ra gold để quay tiếp.</div>
            <div class="sd-act"><kbd>Enter</kbd> MỞ TÚI ĐỒ</div></div></div>
          <!--msg--><div class="m-hint">↑↓ chọn · Enter mở · Esc quay lại</div>`;
      }
      const id = P.boxOrder[this.boxSel], b = P.boxes[id], c = PF().canOpen(id);
      const odds = PF().boxOdds(id).map((o) => {
        const r = RAR(o.rarity);
        return `<div class="odd" style="--rc:${r.color}"><span>${r.label}</span><i><b style="width:${Math.max(2, o.pct)}%"></b></i><em>${o.pct < 1 ? o.pct.toFixed(1) : Math.round(o.pct)}%</em></div>`;
      }).join('');
      const pool = PF().boxPool(id).sort((a, b2) => rank(b2.rarity) - rank(a.rarity)).map((x) => {
        const e = entry(x.kind, x.id), own = e.count > 0;
        return `<div class="icard mini ${own ? 'owned' : ''}" style="--rc:${RAR(x.rarity).color}" title="${esc(nameOf(e))}">${iconHtml(e)}${own ? `<b class="ic-count">×${e.count}</b>` : ''}</div>`;
      }).join('');
      const act = c.ok ? `<kbd>Enter</kbd> MỞ HỘP · ${coin(b.price)}` : c.reason === 'level' ? `<span class="bad">🔒 Cần LV ${b.level}</span>` : `<span class="bad">Không đủ gold (${coin(b.price)})</span>`;
      return `${this.header('SHOP')}
        <div class="gacha-body shop-g">
          <div class="box-list">${rows}</div>
          <div class="box-detail">
            <div class="bd-top">${boxArt(b.color, true)}
              <div class="bd-info"><div class="sd-name">${esc(b.name)}</div><div class="sd-desc">${esc(b.desc)}</div><div class="sd-act">${act}</div></div>
            </div>
            <div class="bd-odds">${odds}</div>
            <div class="bd-pool">${pool}</div>
          </div>
        </div>
        <!--msg--><div class="m-hint">↑↓ chọn hộp · Enter mở hộp · Esc quay lại</div>`;
    },

    openBox(menu, boxId) {
      const r = PF().openBox(boxId);
      if (!r.ok) { SFC.Audio.menu(); menu.setMsg(REASON[r.reason] || 'Không mở được hộp.', true); return; }
      SFC.Audio.whoosh();
      // dừng lệch ngẫu nhiên trong ô trúng (như CSGO) -> hồi hộp đến giây cuối
      const jitter = (Math.random() - 0.5) * (REEL_CARD - 10);
      this.opening = {
        boxId, win: r.win, reel: r.reel, t0: performance.now(), dur: PROG().reelTime,
        dist: PROG().reelWinIndex * REEL_STEP + REEL_CARD / 2 - REEL_W / 2 + jitter,
        pos: 0, lastIdx: -1, done: false, dismantled: 0,
      };
      menu.go('open');
    },

    /* ---------- MỞ HỘP: dải quay + kết quả ---------- */
    pageOpen() {
      const o = this.opening, b = PROG().boxes[o.boxId];
      const cards = o.reel.map((x) => `<div class="rcard" style="--rc:${RAR(x.rarity).color}">${iconHtml(entry(x.kind, x.id))}</div>`).join('');
      const reveal = o.done ? this.revealHtml(o) : '<div class="reveal wait"><span>Đang quay...</span><span><kbd>Enter</kbd> bỏ qua</span></div>';
      return `${this.header('MỞ HỘP', `<div class="open-box">${boxArt(b.color)}<span>${esc(b.name)}</span></div>`)}
        <div class="reel-wrap ${o.done ? 'done' : ''}" style="--rc:${RAR(o.win.rarity).color}">
          <div class="reel"><div class="reel-strip" style="transform:translateX(${-(o.done ? o.dist : o.pos)}px)">${cards}</div></div>
          <i class="reel-mark"></i>
        </div>
        ${reveal}
        <!--msg--><div class="m-hint">${o.done ? 'Enter mở tiếp · E trang bị · X phân rã · Esc về Shop' : 'Enter bỏ qua'}</div>`;
    },

    revealHtml(o) {
      const w = o.win, r = RAR(w.rarity), b = PROG().boxes[o.boxId];
      const e = entry(w.kind, w.id);
      const isCore = w.kind === 'core';
      let art, note = '';
      if (isCore) {
        const c = CORE_LIST()[w.id];
        // mở hộp ra Core: phát luôn khoảnh khắc của Core đó
        art = `<div class="rv-core-art">${SFC.CorePreview.html(w.id, 150, 66)}<span class="card-emoji">${c.icon}</span>${c.role === 'ult' ? '<kbd class="card-x">X</kbd>' : ''}</div>`;
        const lv = PF().coreLevel(w.id);
        note = lv > PF().data.level ? `<span class="bad">Cần LV ${lv} để dùng trong trận</span>` : 'Đã vào pool chọn Core giữa trận';
      } else {
        art = `<canvas class="avatar" data-avatar="spin" data-try="${w.id}"></canvas>`;
        note = PROG().slots[PROG().items[w.id].slot].label;
      }
      const equipped = !isCore && PF().data.look[PROG().items[w.id].slot] === w.id;
      const acts = [
        `<span class="rv-act"><kbd>Enter</kbd> MỞ TIẾP ${coin(b.price)}</span>`,
        !isCore && e.count > 0 ? `<span class="rv-act ${equipped ? 'on' : ''}"><kbd>E</kbd> ${equipped ? 'ĐANG MẶC' : 'TRANG BỊ'}</span>` : '',
        e.count > 0 && !o.dismantled ? `<span class="rv-act"><kbd>X</kbd> PHÂN RÃ +${PF().dismantleValue(w.kind, w.id)}</span>` : '',
        o.dismantled ? `<span class="rv-act ok">Đã phân rã ${coin('+' + o.dismantled)}</span>` : '',
      ].join('');
      return `<div class="reveal r-${w.rarity}" style="--rc:${r.color}">
        <div class="rv-art">${art}</div>
        <div class="rv-info">
          <div class="rv-rar">${r.label}</div>
          <div class="rv-name">${esc(nameOf(e))}</div>
          <div class="rv-sub">${note} · trong túi đồ ×${e.count}</div>
          <div class="rv-acts">${acts}</div>
        </div>
      </div>`;
    },

    // gọi mỗi khung hình từ Menu.animate: chạy dải quay theo thời gian thực (easing chậm dần như CSGO)
    tick(menu) {
      const o = this.opening;
      if (!o || o.done || menu.page !== 'open') return;
      const strip = menu.el.querySelector('.reel-strip');
      if (!strip) return;
      const k = Math.min(1, (performance.now() - o.t0) / 1000 / o.dur);
      const e = 1 - Math.pow(1 - k, 4);
      o.pos = o.dist * e;
      strip.style.transform = `translateX(${-o.pos}px)`;
      const idx = Math.floor((o.pos + REEL_W / 2) / REEL_STEP);
      if (idx !== o.lastIdx) { o.lastIdx = idx; SFC.Audio.tick(); }
      if (k >= 1) {
        o.done = true;
        SFC.Audio.reveal(Math.max(0, rank(o.win.rarity)));
        menu.render();
      }
    },

    /* ---------- TÚI ĐỒ ---------- */
    invEntries() {
      const tab = INV_TABS[this.invTab][0], P = PROG(), d = PF().data;
      const out = [];
      if (tab !== 'core') {
        for (const id in P.items) {
          if (tab !== 'all' && P.items[id].slot !== tab) continue;
          if (PF().count('item', id) > 0) out.push(entry('item', id));
        }
      }
      if (tab === 'core' || tab === 'all') {
        const arch = tab === 'core' ? ARCH_KEYS()[this.invArch] : 'all';
        const ok = (id) => arch === 'all' || CORE_LIST()[id].tags.includes(arch);
        if (!P.coreGacha) {
          // gacha Core tắt: mục CORE là bộ sưu tập đủ mọi Core (xem ảnh động, gợi ý build); mục TẤT CẢ chỉ còn costume
          if (tab === 'core') Object.keys(CORE_LIST()).filter(ok).forEach((id) => out.push(entry('core', id)));
        } else {
          for (const id of Object.keys(d.cores)) if (d.cores[id] > 0 && ok(id)) out.push(entry('core', id));
          if (tab === 'core') P.starterCores.filter(ok).forEach((id) => out.push(entry('core', id)));
        }
      }
      // hiếm nhất lên đầu, đồ mặc định xuống cuối
      return out.sort((a, b) => rank(b.rarity) - rank(a.rarity) || (a.kind === b.kind ? 0 : a.kind === 'item' ? -1 : 1));
    },

    isEquipped(e) {
      if (e.kind === 'core') return PF().unlockedCores().includes(e.id);
      return PF().data.look[PROG().items[e.id].slot] === e.id;
    },

    pageInv() {
      const list = this.invEntries();
      this.invSel = Math.max(0, Math.min(this.invSel, list.length - 1));
      const tabs = `<div class="tabs">${INV_TABS.map(([, l], i) => `<button class="tab ${i === this.invTab ? 'sel' : ''}" data-itab="${i}">${l}</button>`).join('')}</div>`;
      const coreTab = INV_TABS[this.invTab][0] === 'core';
      let filter = '';
      if (coreTab) {
        filter = `<div class="arch-filter">${ARCH_KEYS().map((k, i) => {
          const a = ARCH()[k];
          return `<button class="af ${i === this.invArch ? 'sel' : ''}" data-iarch="${i}" style="--c:${a ? a.color : '#e6dccb'}" title="${a ? a.label : 'Tất cả'}">${a ? a.icon : '★'}</button>`;
        }).join('')}</div>`;
      }
      const dupes = this.dupes(list);
      const cards = list.map((e, i) => {
        const cls = [i === this.invSel ? 'sel' : '', this.isEquipped(e) && e.kind === 'item' ? 'eq' : '', e.def ? 'def' : ''].join(' ');
        const badge = e.def ? '' : `<b class="ic-count">×${e.count}</b>`;
        return `<div class="icard ${cls}" data-ic="${i}" style="--rc:${RAR(e.rarity).color}">${iconHtml(e)}${badge}${cls.includes('eq') ? '<i class="ic-eq">E</i>' : ''}</div>`;
      }).join('') || '<div class="inv-empty">Chưa có món nào — mở hộp trong SHOP nhé!</div>';
      return `${this.header('TÚI ĐỒ', tabs)}
        <div class="gacha-body inv-g">
          <div class="inv-left">${filter}<div class="inv-grid">${cards}</div></div>
          <div class="inv-detail">${list[this.invSel] ? this.invDetail(list[this.invSel]) : ''}</div>
        </div>
        <!--msg--><div class="m-hint">Q / E đổi mục${coreTab ? ' · Z lọc trường phái' : ''} · ←↑↓→ chọn${coreTab && !PROG().coreGacha ? '' : ' · Enter trang bị · X phân rã'}${dupes.count ? ` · R phân rã ${dupes.count} đồ trùng (+${dupes.gold})` : ''} · Esc quay lại</div>`;
    },

    invDetail(e) {
      const r = RAR(e.rarity), val = PF().dismantleValue(e.kind, e.id);
      const count = e.def ? 'Có sẵn' : `Số lượng ×${e.count}`;
      if (e.kind === 'core') {
        const c = CORE_LIST()[e.id], cat = ARCH()[c.tags[0]], cat2 = ARCH()[c.tags[1] || c.tags[0]];
        const lv = PF().coreLevel(e.id), ok = lv <= PF().data.level;
        const status = !PROG().coreGacha ? 'Có sẵn cho mọi người chơi' : e.def ? 'Core cơ bản — luôn trong pool' : ok ? 'Đang trong pool chọn Core' : `<span class="bad">Cần LV ${lv} để dùng</span>`;
        const tags = c.tags.map((t) => `<span style="--c:${ARCH()[t].color}">${ARCH()[t].icon} ${ARCH()[t].label}</span>`).join('');
        const sug = suggest(e.id).map((k) => {
          const o = CORE_LIST()[k], have = PROG().coreGacha && PF().count('core', k) > 0;
          return `<div class="sug ${have ? 'have' : ''}" style="--c:${ARCH()[o.tags[0]].color}" title="${esc(o.desc)}">${o.icon} ${esc(o.name)}${have ? ' ✓' : ''}</div>`;
        }).join('');
        return `<div class="card static ${c.role === 'ult' ? 'ult' : ''}" style="--c:${cat.color};--c2:${cat2.color};--t:${r.color}">
            <div class="card-tags">${tags}</div>
            <div class="card-art">${SFC.CorePreview.html(e.id, 132, 56)}<span class="card-emoji">${c.icon}</span>${c.role === 'ult' ? '<kbd class="card-x">X</kbd>' : ''}</div>
            <div class="card-name">${esc(c.name)}</div><div class="card-tier">${r.label} · ${esc(roleText(c))}</div>
            <div class="card-desc">${esc(c.desc)}</div></div>
          <div class="sd-side"><div class="sd-req">${count}</div><div class="sd-note">${status}</div>
            ${sug ? `<div class="sug-h">THƯỜNG ĐI CÙNG</div>${sug}` : ''}
            <div class="sd-act">${e.def ? '' : `<kbd>X</kbd> PHÂN RÃ ${coin('+' + val)}`}</div></div>`;
      }
      const it = PROG().items[e.id], eq = this.isEquipped(e);
      return `<div class="sd-preview"><canvas class="avatar big" data-avatar="spin" data-try="${e.id}"></canvas></div>
        <div class="sd-side">
          <div class="rv-rar" style="--rc:${r.color}">${r.label}</div>
          <div class="sd-name">${esc(it.name)}</div>
          <div class="sd-desc">${esc(it.desc)}</div>
          <div class="sd-req">${PROG().slots[it.slot].label} · ${count}</div>
          <div class="sd-act">${eq ? '<span class="on">ĐANG MẶC</span>' : '<kbd>Enter</kbd> TRANG BỊ'}</div>
          ${e.def ? '' : `<div class="sd-act"><kbd>X</kbd> PHÂN RÃ ${coin('+' + val)}</div>`}
        </div>`;
    },

    // đồ trùng trong mục đang xem: phân rã hết, mỗi món giữ lại 1
    dupes(list = this.invEntries()) {
      let count = 0, gold = 0;
      for (const e of list) if (!e.def && e.count > 1) { count += e.count - 1; gold += (e.count - 1) * PF().dismantleValue(e.kind, e.id); }
      return { count, gold };
    },

    // bấm 2 lần trong 3 giây mới thực hiện (món hiếm / món cuối đang mặc / phân rã hàng loạt)
    confirmed(menu, key, text) {
      const now = performance.now();
      if (this.confirm && this.confirm.key === key && now - this.confirm.t < 3000) { this.confirm = null; return true; }
      this.confirm = { key, t: now };
      SFC.Audio.menu();
      menu.setMsg(text, true);
      return false;
    },

    dismantleEntry(menu, e) {
      if (!e || e.def || e.count <= 0) return;
      const r = rank(e.rarity), last = e.count === 1;
      const risky = r >= rank('epic') || (last && this.isEquipped(e)) || (last && e.kind === 'core');
      const val = PF().dismantleValue(e.kind, e.id);
      if (risky && !this.confirmed(menu, 'x:' + e.kind + e.id, `Nhấn X lần nữa để phân rã ${nameOf(e)} (+${val} gold)`)) return;
      const g = PF().dismantle(e.kind, e.id);
      SFC.Audio.dismantle();
      menu.setMsg(`Phân rã ${nameOf(e)}: +${g} gold`);
      return g;
    },

    equipEntry(menu, e) {
      if (!e || e.kind !== 'item') return;
      if (this.isEquipped(e)) return;
      PF().equip(e.id);
      SFC.Audio.pick();
      menu.setMsg(`Đang mặc: ${nameOf(e)}`);
    },

    /* ================= PHÍM ================= */
    input(menu, input) {
      if (menu.page === 'shop') return this.inputShop(menu, input);
      if (menu.page === 'open') return this.inputOpen(menu, input);
      return this.inputInv(menu, input);
    },

    inputShop(menu, input) {
      const n = PROG().boxOrder.length + 1;
      let moved = false;
      if (input.wasPressed('up')) { this.boxSel = wrap(this.boxSel - 1, n); moved = true; }
      if (input.wasPressed('down')) { this.boxSel = wrap(this.boxSel + 1, n); moved = true; }
      if (moved) { menu.msg = ''; SFC.Audio.menu(); menu.render(); }
      if (input.wasPressed('confirm')) this.activateBox(menu);
    },

    activateBox(menu) {
      const order = PROG().boxOrder;
      if (this.boxSel >= order.length) { SFC.Audio.menu(); this.invBack = 'shop'; return menu.go('inv'); }
      this.openBox(menu, order[this.boxSel]);
    },

    inputOpen(menu, input) {
      const o = this.opening;
      if (!o) return;
      if (!o.done) { if (input.wasPressed('confirm')) o.t0 = performance.now() - o.dur * 1000; return; }
      if (input.wasPressed('confirm')) return this.openBox(menu, o.boxId);
      if (input.wasPressed('sprint') && o.win.kind === 'item') { this.equipEntry(menu, entry('item', o.win.id)); menu.render(); }
      if (input.wasPressed('dismantle') && !o.dismantled) {
        const e = entry(o.win.kind, o.win.id);
        const g = this.dismantleEntry(menu, e);
        if (g) { o.dismantled = g; menu.render(); }
      }
    },

    inputInv(menu, input) {
      const list = this.invEntries(), n = list.length;
      let moved = false;
      if (input.wasPressed('switch')) { this.invTab = wrap(this.invTab - 1, INV_TABS.length); this.invSel = 0; moved = true; }
      if (input.wasPressed('sprint')) { this.invTab = wrap(this.invTab + 1, INV_TABS.length); this.invSel = 0; moved = true; }
      if (input.wasPressed('skill') && INV_TABS[this.invTab][0] === 'core') { this.invArch = wrap(this.invArch + 1, ARCH_KEYS().length); this.invSel = 0; moved = true; }
      if (n) {
        if (input.wasPressed('left')) { this.invSel = Math.max(0, this.invSel - 1); moved = true; }
        if (input.wasPressed('right')) { this.invSel = Math.min(n - 1, this.invSel + 1); moved = true; }
        if (input.wasPressed('up') && this.invSel >= INV_COLS) { this.invSel -= INV_COLS; moved = true; }
        if (input.wasPressed('down') && this.invSel + INV_COLS < n) { this.invSel += INV_COLS; moved = true; }
      }
      if (moved) { menu.msg = ''; this.confirm = null; SFC.Audio.menu(); return menu.render(); }
      const e = list[this.invSel];
      if (input.wasPressed('confirm')) this.equipEntry(menu, e);
      if (input.wasPressed('dismantle')) this.dismantleEntry(menu, e);
      if (input.wasPressed('restart')) this.dismantleDupes(menu, list);
    },

    dismantleDupes(menu, list) {
      const d = this.dupes(list);
      if (!d.count) return menu.setMsg('Không có đồ trùng trong mục này.');
      if (!this.confirmed(menu, 'dupes' + this.invTab, `Nhấn R lần nữa để phân rã ${d.count} đồ trùng (+${d.gold} gold)`)) return;
      let gold = 0;
      for (const e of list) for (let i = 1; i < e.count && !e.def; i++) gold += PF().dismantle(e.kind, e.id);
      SFC.Audio.dismantle();
      menu.setMsg(`Đã phân rã ${d.count} đồ trùng: +${gold} gold`);
    },

    // Esc / Backspace
    back(menu) {
      if (menu.page === 'open') {
        if (this.opening && !this.opening.done) { this.opening.t0 = performance.now() - this.opening.dur * 1000; this.tick(menu); }
        return menu.go('shop');
      }
      if (menu.page === 'inv') return menu.go(this.invBack);
      return menu.go(this.shopBack);
    },

    /* ================= CHUỘT ================= */
    click(menu, e) {
      const box = e.target.closest('[data-box]');
      if (box) {
        const i = +box.dataset.box;
        if (i === this.boxSel) this.activateBox(menu);
        else { this.boxSel = i; menu.msg = ''; SFC.Audio.menu(); menu.render(); }
        return true;
      }
      const af = e.target.closest('[data-iarch]');
      if (af) { this.invArch = +af.dataset.iarch; this.invSel = 0; menu.msg = ''; SFC.Audio.menu(); menu.render(); return true; }
      const tab = e.target.closest('[data-itab]');
      if (tab) { this.invTab = +tab.dataset.itab; this.invSel = 0; menu.msg = ''; SFC.Audio.menu(); menu.render(); return true; }
      const ic = e.target.closest('[data-ic]');
      if (ic) {
        const i = +ic.dataset.ic;
        if (i === this.invSel) this.equipEntry(menu, this.invEntries()[i]);
        else { this.invSel = i; menu.msg = ''; SFC.Audio.menu(); menu.render(); }
        return true;
      }
      return false;
    },

    // costume đang mặc (hiện ở trang NHÂN VẬT)
    equippedHtml() {
      const look = PF().data.look, P = PROG();
      return Object.keys(P.slots).map((slot) => {
        const id = look[slot], e = entry('item', id);
        return `<div class="eq-row" style="--rc:${RAR(e.rarity).color}"><span>${P.slots[slot].label}</span><b>${esc(P.items[id].name)}</b></div>`;
      }).join('');
    },
  };

  SFC.Gacha = Gacha;
})();
