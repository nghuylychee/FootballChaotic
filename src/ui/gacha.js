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
  const _t = SFC.t, _tn = SFC.tn;
  const PROG = () => SFC_CONFIG.progression;
  const CORE_LIST = () => SFC_CONFIG.cores.list;
  const RAR = (r) => PROG().rarities[r] || { label: _t('DEFAULT'), color: '#6a5f6e', value: 0 };
  const rank = (r) => PROG().rarityOrder.indexOf(r);            // -1 = đồ mặc định
  // emoji dự phòng cho icon trail (hình chính: pixel art 'fx-<id>' ở render/pixelicons.js)
  const FX_ICON = {
    nofx: '', sparkle: '✨', bubbles: '🫧', leaves: '🍃', hearts: '💖', snow: '❄️', smoke: '🌫️', dust: '💨', notes: '🎵',
    confetti: '🎊', petals: '🌸', coins: '🪙', neon: '💠', frost: '🧊', lightning: '⚡', rainbow: '🌈', fire: '🔥',
    shadow: '👻', galaxy: '🌌', aura: '🌟',
  };
  // wear = costume (lọc theo slot) · core = Core (lọc theo trường phái) · drill = thẻ DRILL (mở -> chọn 1 trong 3, ui/drill.js)
  const INV_TABS = [['wear'], ['core'], ['drill']];
  const INV_LABEL = () => ({ wear: _t('APPEARANCE'), core: _t('CORES'), drill: _t('DRILL CARDS') });   // dịch lúc vẽ (đổi ngôn ngữ khi đang chạy)
  const DRILL_COLOR = '#6bff4f';   // viền / ánh thẻ DRILL (cọc xanh lá)
  const INV_COLS = 6;
  const REEL_STEP = 56, REEL_CARD = 52, REEL_W = 560; // khớp CSS .rcard / .reel
  const REASON = () => ({ gold: _t('Not enough gold.'), level: _t('Your level is too low for this box.') });
  const wrap = (v, n) => ((v % n) + n) % n;
  const K = (action, kb) => SFC.Input.key(action, kb);   // nhãn phím gợi ý theo thiết bị
  const ARCH = () => SFC_CONFIG.cores.archetypes;
  const PX = () => SFC.PixelIcon;   // icon pixel art (render/pixelicons.js)
  const ARCH_KEYS = () => ['all'].concat(Object.keys(ARCH()));
  const SLOT_KEYS = () => ['all'].concat(Object.keys(PROG().slots));

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



  // lá Core tĩnh (túi đồ, màn mở thẻ): trường phái, ảnh động, tên, chỉ số scale, mô tả. Viền lá = màu độ hiếm
  function coreCard(id, cls = '', w = 132, h = 56) {
    const c = CORE_LIST()[id], r = RAR(c.rarity);
    // anyBuild (AURA FARMING): hợp mọi trường phái -> nhãn ANY BUILD thay cho trường phái gắn tạm
    const tags = c.anyBuild ? `<span style="--c:${c.color || r.color}">${PX().ui('star', 'sm')} ${_t('ANY BUILD')}</span>`
      : c.tags.map((t) => `<span style="--c:${ARCH()[t].color}">${PX().arch(t, 'sm')} ${ARCH()[t].label}</span>`).join('');
    return `<div class="card static ${c.role === 'ult' ? 'ult' : ''} ${cls}" style="--c:${r.color};--c2:${r.color};--t:${r.color}">
        <div class="card-tags">${tags}</div>
        <div class="card-art">${SFC.CorePreview.html(id, w, h)}<span class="card-emoji">${PX().core(id)}</span>${c.role === 'ult' ? `<kbd class="card-x">${K('ultimate', 'X')}</kbd>` : ''}</div>
        <div class="card-name">${esc(c.name)}</div>
        ${SFC.CoreScale.statLine(id)}
        <div class="card-desc">${SFC.CoreScale.describe(id)}</div></div>`;
  }

  // số tiền viết theo ngôn ngữ đang chọn (1,200 / 1.200)
  function coin(n) { return `<span class="gold"><i class="coin"></i>${SFC.I18n.num(n)}</span>`; }

  // thanh XP + level (trang chủ, nhân vật, shop, túi đồ)
  function xpBar(d) {
    const need = PF().xpToNext(d.level);
    // chạm trần level theo Main Path (Profile.levelCap): thanh đầy, XP dư vẫn tích
    const capped = PF().levelCapped();
    const pct = need === Infinity || capped ? 100 : Math.round(Math.min(1, d.xp / need) * 100);
    return `<div class="lvrow"><span class="lv">${SFC.t('LV {n}', { n: d.level })}</span>
      <div class="xpbar"><i style="width:${pct}%"></i></div>
      <span class="xpnum">${need === Infinity ? SFC.t('MAX') : capped ? SFC.t('LV CAP') : `${Math.floor(d.xp)}/${need} XP`}</span></div>`;
  }

  // hộp gacha vẽ bằng CSS (thân + nắp + dải ruy băng + dấu ?)
  function boxArt(color, big = false) {
    return `<div class="boxart ${big ? 'big' : ''}" style="--bc:${color}"><i></i><b>?</b></div>`;
  }

  function nameOf(e) { return e.kind === 'drill' ? _t('Drill Card') : e.kind === 'core' ? CORE_LIST()[e.id].name : PROG().items[e.id].name; }

  // icon của 1 món: costume = canvas (vẽ ở bindIcons), Core = emoji
  function iconHtml(e) {
    if (e.kind === 'drill') return `<span class="ic-emoji">${PX().ui('cone', 'x2')}</span>`;
    if (e.kind === 'core') return `<span class="ic-emoji">${PX().core(e.id, 'x2')}</span>`;
    const it = PROG().items[e.id];
    return `<canvas data-icon="${e.id}" width="40" height="40"></canvas>${it.slot === 'fx' && FX_ICON[e.id] ? `<span class="ic-fx">${PX().html('fx-' + e.id, FX_ICON[e.id])}</span>` : ''}`;
  }

  // món trong túi đồ / trong hộp: { kind: item | core, id, rarity, count, def }
  function entry(kind, id) {
    // gacha Core tắt: mọi Core là "có sẵn" (không đếm số lượng, không phân rã)
    const def = kind === 'core' ? !PROG().coreGacha || PROG().starterCores.includes(id) : !!PROG().items[id].default;
    // gacha Core tắt: Core chưa mở khoá theo Main Path vẫn hiện trong bộ sưu tập nhưng bị khoá
    const locked = kind === 'core' && !PROG().coreGacha && !PF().coreUnlocked(id);
    return { kind, id, rarity: def && kind !== 'core' ? null : PF().rarityOf(kind, id), count: PF().count(kind, id), def, locked };
  }

  const Gacha = {
    pages: ['shop', 'open', 'inv'],
    coin, xpBar, coreCard, boxArt,
    boxSel: 0,        // 0..số hộp-1 = hộp, cuối cùng = nút TÚI ĐỒ
    invTab: 0,
    invSel: 0,
    invArch: 0,       // mục CORE: lọc theo trường phái (0 = tất cả)
    invSlot: 0,       // mục APPEARANCE: lọc theo slot costume (0 = tất cả)
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
        const b = P.boxes[id], free = PF().freeBoxes(id), lock = b.level > d.level && !free;
        const price = free ? `<span class="free">${PX().ui('gift', 'sm')} ${_t('FREE ×{n}', { n: free })}</span>` : lock ? `${PX().ui('lock', 'sm')} ${_t('LV {n}', { n: b.level })}` : coin(b.price);
        return `<button class="boxrow ${i === this.boxSel ? 'sel' : ''} ${lock ? 'lock' : ''}" data-box="${i}" style="--bc:${b.color}">
          ${boxArt(b.color)}
          <div class="br-info"><div class="br-name">${esc(b.name)}</div>
            <div class="br-sub">${b.kind === 'core' ? _t('CORE') : _t('COSTUME')} · ${price}</div></div>
        </button>`;
      }).join('') + `<button class="boxrow inv-link ${this.boxSel === n ? 'sel' : ''}" data-box="${n}">
          <div class="br-info"><div class="br-name">${_t('INVENTORY')} →</div><div class="br-sub">${_t('Equip · dismantle for gold')}</div></div></button>`;
      if (this.boxSel === n) {
        return `${this.header(_t('SHOP'))}
          <div class="gacha-body shop-g"><div class="box-list">${rows}</div>
            <div class="box-detail center"><div class="sd-name">${_t('INVENTORY')}</div><div class="sd-desc">${_t("See everything you have pulled, equip it on your character, or dismantle what you don't need into gold for more spins.")}</div>
            <div class="sd-act"><kbd>${K('confirm', 'Enter')}</kbd> ${_t('OPEN INVENTORY')}</div></div></div>
          <!--msg--><div class="m-hint">${_t('↑↓ select · {ok} open · {back} back', { ok: K('confirm', 'Enter'), back: K('back', 'Esc') })}</div>`;
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
      const act = c.free ? `<kbd>${K('confirm', 'Enter')}</kbd> ${_t('OPEN FREE BOX')} <span class="free">${PX().ui('gift', 'sm')} ×${PF().freeBoxes(id)}</span>`
        : c.ok ? `<kbd>${K('confirm', 'Enter')}</kbd> ${_t('OPEN BOX · {price}', { price: coin(b.price) })}` : c.reason === 'level' ? `<span class="bad">${PX().ui('lock', 'sm')} ${_t('Requires LV {n}', { n: b.level })}</span>` : `<span class="bad">${_t('Not enough gold ({price})', { price: coin(b.price) })}</span>`;
      return `${this.header(_t('SHOP'))}
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
        <!--msg--><div class="m-hint">${_t('↑↓ select box · {ok} open box · {back} back', { ok: K('confirm', 'Enter'), back: K('back', 'Esc') })}</div>`;
    },

    openBox(menu, boxId) {
      const r = PF().openBox(boxId);
      if (!r.ok) { SFC.Audio.menu(); menu.setMsg(REASON()[r.reason] || _t('Could not open the box.'), true); return; }
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
      const reveal = o.done ? this.revealHtml(o) : `<div class="reveal wait"><span>${_t('Spinning...')}</span><span><kbd>${K('confirm', 'Enter')}</kbd> ${_t('skip')}</span></div>`;
      return `${this.header(_t('OPEN BOX'), `<div class="open-box">${boxArt(b.color)}<span>${esc(b.name)}</span></div>`)}
        <div class="reel-wrap ${o.done ? 'done' : ''}" style="--rc:${RAR(o.win.rarity).color}">
          <div class="reel"><div class="reel-strip" style="transform:translateX(${-(o.done ? o.dist : o.pos)}px)">${cards}</div></div>
          <i class="reel-mark"></i>
        </div>
        ${reveal}
        <!--msg--><div class="m-hint">${o.done ? _t('{ok} open another · {equip} equip · {dismantle} dismantle · {back} back to Shop', { ok: K('confirm', 'Enter'), equip: K('sprint', 'E'), dismantle: K('dismantle', 'X'), back: K('back', 'Esc') }) : _t('{ok} skip', { ok: K('confirm', 'Enter') })}</div>`;
    },

    revealHtml(o) {
      const w = o.win, r = RAR(w.rarity), b = PROG().boxes[o.boxId];
      const e = entry(w.kind, w.id);
      const isCore = w.kind === 'core';
      let art, note = '';
      if (isCore) {
        const c = CORE_LIST()[w.id];
        // mở hộp ra Core: phát luôn khoảnh khắc của Core đó
        art = `<div class="rv-core-art">${SFC.CorePreview.html(w.id, 150, 66)}<span class="card-emoji">${PX().core(w.id)}</span>${c.role === 'ult' ? `<kbd class="card-x">${K('ultimate', 'X')}</kbd>` : ''}</div>`;
        const lv = PF().coreLevel(w.id);
        note = lv > PF().data.level ? `<span class="bad">${_t('Requires LV {n} to use in matches', { n: lv })}</span>` : _t('Added to your mid-match Core pool');
      } else {
        art = `<canvas class="avatar" data-avatar="spin" data-try="${w.id}"></canvas>`;
        note = PROG().slots[PROG().items[w.id].slot].label;
      }
      const equipped = !isCore && PF().data.look[PROG().items[w.id].slot] === w.id;
      const acts = [
        `<span class="rv-act"><kbd>${K('confirm', 'Enter')}</kbd> ${_t('OPEN ANOTHER')} ${PF().freeBoxes(o.boxId) ? `<span class="free">${PX().ui('gift', 'sm')} ${_t('FREE ×{n}', { n: PF().freeBoxes(o.boxId) })}</span>` : coin(b.price)}</span>`,
        !isCore && e.count > 0 ? `<span class="rv-act ${equipped ? 'on' : ''}"><kbd>${K('sprint', 'E')}</kbd> ${equipped ? _t('EQUIPPED') : _t('EQUIP')}</span>` : '',
        e.count > 0 && !o.dismantled ? `<span class="rv-act"><kbd>${K('dismantle', 'X')}</kbd> ${_t('DISMANTLE +{n}', { n: PF().dismantleValue(w.kind, w.id) })}</span>` : '',
        o.dismantled ? `<span class="rv-act ok">${_t('Dismantled {gold}', { gold: coin('+' + o.dismantled) })}</span>` : '',
      ].join('');
      return `<div class="reveal r-${w.rarity}" style="--rc:${r.color}">
        <div class="rv-art">${art}</div>
        <div class="rv-info">
          <div class="rv-rar">${r.label}</div>
          <div class="rv-name">${esc(nameOf(e))}</div>
          <div class="rv-sub">${note} · ${_t('in inventory ×{n}', { n: e.count })}</div>
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
      // thẻ DRILL: 1 ô gộp, số thẻ = số drill chờ chọn (Profile.drillsPending)
      if (tab === 'drill') {
        const n = PF().drillsPending();
        return n > 0 ? [{ kind: 'drill', id: 'drill', rarity: null, count: n, def: false, locked: false }] : [];
      }
      if (tab === 'wear') {
        const slot = SLOT_KEYS()[this.invSlot];
        for (const id in P.items) {
          if (slot !== 'all' && P.items[id].slot !== slot) continue;
          if (PF().count('item', id) > 0) out.push(entry('item', id));
        }
      }
      if (tab === 'core') {
        const arch = ARCH_KEYS()[this.invArch];
        const ok = (id) => arch === 'all' || CORE_LIST()[id].tags.includes(arch);
        if (!P.coreGacha) {
          // gacha Core tắt: mục CORE là bộ sưu tập đủ mọi Core (xem ảnh động, gợi ý build)
          Object.keys(CORE_LIST()).filter(ok).forEach((id) => out.push(entry('core', id)));
        } else {
          for (const id of Object.keys(d.cores)) if (d.cores[id] > 0 && ok(id)) out.push(entry('core', id));
          P.starterCores.filter(ok).forEach((id) => out.push(entry('core', id)));
        }
      }
      // Core đã mở trước Core còn khoá · hiếm nhất lên đầu, đồ mặc định xuống cuối
      return out.sort((a, b) => !!a.locked - !!b.locked || rank(b.rarity) - rank(a.rarity) || (a.kind === b.kind ? 0 : a.kind === 'item' ? -1 : 1));
    },

    isEquipped(e) {
      if (e.kind === 'drill') return false;
      if (e.kind === 'core') return PF().unlockedCores().includes(e.id);
      return PF().data.look[PROG().items[e.id].slot] === e.id;
    },

    pageInv() {
      const list = this.invEntries();
      this.invSel = Math.max(0, Math.min(this.invSel, list.length - 1));
      const tabs = `<div class="tabs">${INV_TABS.map(([k], i) => `<button class="tab ${i === this.invTab ? 'sel' : ''}" data-itab="${i}">${INV_LABEL()[k]}</button>`).join('')}</div>`;
      const tab = INV_TABS[this.invTab][0], coreTab = tab === 'core', drillTab = tab === 'drill';
      // nút lọc (dùng chung CORES / APPEARANCE): ★ = tất cả, còn lại = icon pixel + màu của nhóm
      const chips = (keys, sel, attr, group) => `<div class="arch-filter">${keys.map((k, i) => {
        const g = group(k);
        return `<button class="af ${i === sel ? 'sel' : ''}" ${attr}="${i}" style="--c:${g ? g.color : '#e6dccb'}" title="${g ? g.label : _t('All')}">${g ? g.icon : '★'}</button>`;
      }).join('')}</div>`;
      let filter = '';
      if (coreTab) filter = chips(ARCH_KEYS(), this.invArch, 'data-iarch', (k) => ARCH()[k] && { color: ARCH()[k].color, label: ARCH()[k].label, icon: PX().arch(k) });
      else if (tab === 'wear') filter = chips(SLOT_KEYS(), this.invSlot, 'data-islot', (k) => PROG().slots[k] && { color: PROG().slots[k].color, label: PROG().slots[k].label, icon: PX().html(PROG().slots[k].icon) });
      const dupes = this.dupes(list);
      const empty = drillTab ? _t('No drill cards yet. Level up to earn them!') : _t('Nothing here yet. Open a box in the SHOP!');
      const cards = list.map((e, i) => {
        const cls = [i === this.invSel ? 'sel' : '', this.isEquipped(e) && e.kind === 'item' ? 'eq' : '', e.def ? 'def' : '', e.locked ? 'lock' : ''].join(' ');
        const badge = e.def ? '' : `<b class="ic-count">×${e.count}</b>`;
        const rc = e.kind === 'drill' ? DRILL_COLOR : RAR(e.rarity).color;
        return `<div class="icard ${cls}" data-ic="${i}" style="--rc:${rc}">${iconHtml(e)}${badge}${cls.includes('eq') ? '<i class="ic-eq">E</i>' : ''}${e.locked ? PX().ui('lock', 'ic-lock') : ''}</div>`;
      }).join('') || `<div class="inv-empty">${empty}</div>`;
      const hint = [
        _t('{a} / {b} switch tab', { a: K('switch', 'Q'), b: K('sprint', 'E') }),
        filter ? (coreTab ? _t('{key} filter by archetype', { key: K('skill', 'Z') }) : _t('{key} filter by slot', { key: K('skill', 'Z') })) : '',
        _t('←↑↓→ select'),
        drillTab ? (list.length ? _t('{key} open', { key: K('confirm', 'Enter') }) : '') : coreTab && !PROG().coreGacha ? ''
          : _t('{key} equip', { key: K('confirm', 'Enter') }) + ' · ' + _t('{key} dismantle', { key: K('dismantle', 'X') }),
        dupes.count ? _tn('{key} dismantle {n} duplicate (+{gold})', '{key} dismantle {n} duplicates (+{gold})', dupes.count, { key: K('restart', 'R'), gold: dupes.gold }) : '',
        _t('{key} back', { key: K('back', 'Esc') }),
      ].filter(Boolean).join(' · ');
      return `${this.header(_t('INVENTORY'), tabs)}
        <div class="gacha-body inv-g">
          <div class="inv-left">${filter}<div class="inv-grid">${cards}</div></div>
          <div class="inv-detail">${list[this.invSel] ? this.invDetail(list[this.invSel]) : ''}</div>
        </div>
        <!--msg--><div class="m-hint">${hint}</div>`;
    },

    invDetail(e) {
      if (e.kind === 'drill') {
        const D = PROG().attrs.drills;
        return `<div class="sd-preview inv-drill" style="--rc:${DRILL_COLOR}">${PX().ui('cone', 'x3')}</div>
        <div class="sd-side">
          <div class="rv-rar" style="--rc:${DRILL_COLOR}">${_t('LEVEL-UP REWARD')}</div>
          <div class="sd-name">${_t('DRILL CARD')}</div>
          <div class="sd-desc">${_tn('Open a card to pick 1 of {choices} drills. Each pick raises your stats for good. You earn {n} card every level.', 'Open a card to pick 1 of {choices} drills. Each pick raises your stats for good. You earn {n} cards every level.', D.perLevel, { choices: D.choices })}</div>
          <div class="sd-req">${_t('Owned ×{n}', { n: e.count })}</div>
          <div class="sd-act"><kbd>${K('confirm', 'Enter')}</kbd> ${_t('OPEN')}</div>
        </div>`;
      }
      const r = RAR(e.rarity), val = PF().dismantleValue(e.kind, e.id);
      const count = e.def ? _t('Default') : _t('Owned ×{n}', { n: e.count });
      if (e.kind === 'core') {
        const lv = PF().coreLevel(e.id), ok = lv <= PF().data.level;
        // gacha Core tắt: Core mở theo Main Path (bộ có sẵn / sao của Area / boss)
        const pathStatus = () => {
          if (!SFC_CONFIG.mainPath.lockCores) return _t('Available to every player');
          if (e.locked) return `<span class="bad">${PX().ui('lock', 'sm')} ${esc(SFC.MainPath.unlockHint(e.id))}</span>`;
          return SFC.MainPath.coreSource(e.id).kind === 'starter' ? _t('Starter Core, always in your pool') : _t('Unlocked on the Main Path · in your Core draft pool');
        };
        const status = !PROG().coreGacha ? pathStatus() : e.def ? _t('Starter Core, always in your pool') : ok ? _t('In your Core draft pool') : `<span class="bad">${_t('Requires LV {n}', { n: lv })}</span>`;
        const sug = suggest(e.id).map((k) => {
          const o = CORE_LIST()[k], have = PROG().coreGacha ? PF().count('core', k) > 0 : PF().coreUnlocked(k);
          return `<div class="sug ${have ? 'have' : ''}" style="--c:${ARCH()[o.tags[0]].color}" title="${esc(SFC.CoreScale.plain(k))}">${PX().core(k)} ${esc(o.name)} ${have ? PX().ui('check', 'sm') : PX().ui('lock', 'sm')}</div>`;
        }).join('');
        return `${coreCard(e.id, e.locked ? 'locked' : '')}
          <div class="sd-side"><div class="sd-req">${e.locked ? _t('Locked') : count}</div><div class="sd-note">${status}</div>
            ${sug ? `<div class="sug-h">${_t('OFTEN PAIRED WITH')}</div>${sug}` : ''}
            <div class="sd-act">${e.def ? '' : `<kbd>${K('dismantle', 'X')}</kbd> ${_t('DISMANTLE {gold}', { gold: coin('+' + val) })}`}</div></div>`;
      }
      const it = PROG().items[e.id], eq = this.isEquipped(e);
      return `<div class="sd-preview"><canvas class="avatar big" data-avatar="spin" data-try="${e.id}"></canvas></div>
        <div class="sd-side">
          <div class="rv-rar" style="--rc:${r.color}">${r.label}</div>
          <div class="sd-name">${esc(it.name)}</div>
          <div class="sd-desc">${esc(it.desc)}</div>
          <div class="sd-req">${PROG().slots[it.slot].label} · ${count}</div>
          <div class="sd-act">${eq ? `<span class="on">${_t('EQUIPPED')}</span>` : `<kbd>${K('confirm', 'Enter')}</kbd> ${_t('EQUIP')}`}</div>
          ${e.def ? '' : `<div class="sd-act"><kbd>${K('dismantle', 'X')}</kbd> ${_t('DISMANTLE {gold}', { gold: coin('+' + val) })}</div>`}
        </div>`;
    },

    // đồ trùng trong mục đang xem: phân rã hết, mỗi món giữ lại 1
    dupes(list = this.invEntries()) {
      let count = 0, gold = 0;
      for (const e of list) if (!e.def && e.kind !== 'drill' && e.count > 1) { count += e.count - 1; gold += (e.count - 1) * PF().dismantleValue(e.kind, e.id); }
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
      if (!e || e.def || e.kind === 'drill' || e.count <= 0) return;
      const r = rank(e.rarity), last = e.count === 1;
      const risky = r >= rank('epic') || (last && this.isEquipped(e)) || (last && e.kind === 'core');
      const val = PF().dismantleValue(e.kind, e.id);
      if (risky && !this.confirmed(menu, 'x:' + e.kind + e.id, _t('Press {key} again to dismantle {name} (+{gold} gold)', { key: K('dismantle', 'X'), name: nameOf(e), gold: val }))) return;
      const g = PF().dismantle(e.kind, e.id);
      SFC.Audio.dismantle();
      menu.setMsg(_t('Dismantled {name}: +{gold} gold', { name: nameOf(e), gold: g }));
      return g;
    },

    equipEntry(menu, e) {
      if (e && e.kind === 'drill') return this.openDrillCard(menu);
      if (!e || e.kind !== 'item') return;
      if (this.isEquipped(e)) return;
      PF().equip(e.id);
      SFC.Audio.pick();
      menu.setMsg(_t('Equipped: {name}', { name: nameOf(e) }));
    },

    // mở 1 thẻ DRILL: màn lật thẻ -> chọn 1 trong 3 (ui/drill.js); đóng thì vẽ lại túi đồ (số thẻ đã đổi)
    openDrillCard(menu) {
      SFC.Drill.open(() => menu.render());
    },

    // mở túi đồ ở đúng mục (vd. nút USE DRILL CARDS ở STATS); back = trang về khi bấm Esc
    openInv(menu, tabKey, back) {
      const i = INV_TABS.findIndex(([k]) => k === tabKey);
      if (i >= 0) { this.invTab = i; this.invSel = 0; }
      this.invBack = back;
      menu.go('inv');
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
      const tab = INV_TABS[this.invTab][0];
      if (input.wasPressed('skill') && tab === 'core') { this.invArch = wrap(this.invArch + 1, ARCH_KEYS().length); this.invSel = 0; moved = true; }
      if (input.wasPressed('skill') && tab === 'wear') { this.invSlot = wrap(this.invSlot + 1, SLOT_KEYS().length); this.invSel = 0; moved = true; }
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
      if (!d.count) return menu.setMsg(_t('No duplicates in this tab.'));
      if (!this.confirmed(menu, 'dupes' + this.invTab, _tn('Press {key} again to dismantle {n} duplicate (+{gold} gold)', 'Press {key} again to dismantle {n} duplicates (+{gold} gold)', d.count, { key: K('restart', 'R'), gold: d.gold }))) return;
      let gold = 0;
      for (const e of list) for (let i = 1; i < e.count && !e.def; i++) gold += PF().dismantle(e.kind, e.id);
      SFC.Audio.dismantle();
      menu.setMsg(_tn('Dismantled {n} duplicate: +{gold} gold', 'Dismantled {n} duplicates: +{gold} gold', d.count, { gold }));
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
      const sf = e.target.closest('[data-islot]');
      if (sf) { this.invSlot = +sf.dataset.islot; this.invSel = 0; menu.msg = ''; SFC.Audio.menu(); menu.render(); return true; }
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
