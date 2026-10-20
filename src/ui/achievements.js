/* AchUI — trang ACHIEVEMENTS (nút ACHIEVEMENTS trong PHÒNG TRƯNG BÀY, src/ui/trophies.js; dùng chung khung #menu như ui/gacha.js, Menu gọi vào khi page thuộc AchUI.pages).
 *   trái: danh sách thành tích (nhận được thưởng lên đầu · đang làm · đã nhận xuống cuối), mỗi dòng: icon nhóm, tên, mô tả,
 *         thanh tiến độ, phần thưởng nhỏ, trạng thái (CLAIM / ✓)
 *   phải: thành tích đang chọn — phần thưởng to (costume vẽ trên character / hộp), tiến độ, Enter nhận thưởng
 * Logic + số liệu: src/meta/achievements.js, config/achievements.config.js
 * Menu gọi: render(menu) · input(menu, input) · click(menu, e) · back(menu) · open(menu)
 */
window.SFC = window.SFC || {};

(function () {
  const _t = SFC.t;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const AC = () => SFC.Achievements;
  const PROG = () => SFC_CONFIG.progression;
  const PX = () => SFC.PixelIcon;
  const G = () => SFC.Gacha;
  const K = (a, kb) => SFC.Input.key(a, kb);

  const AchUI = {
    pages: ['ach'],
    sel: 0,
    order: null,   // thứ tự id chốt lúc mở trang: nhận thưởng xong dòng đứng yên tại chỗ (không nhảy, giữ chỗ người chơi đang xem)

    open(menu) { this.sel = 0; this.order = null; menu.msg = ''; menu.go('ach'); },

    // thứ tự hiện (chốt 1 lần mỗi lần mở trang): nhận được thưởng · đang làm (gần xong trước) · đã nhận (giữ thứ tự config)
    rows() {
      const list = AC().list().map((a, i) => ({ a, i, p: AC().progress(a) }));
      if (!this.order) {
        const rank = (r) => (r.p.claimed ? 2 : r.p.done ? 0 : 1);
        this.order = list.slice().sort((x, y) => rank(x) - rank(y) || (rank(x) === 1 ? y.p.pct - x.p.pct : 0) || x.i - y.i).map((r) => r.a.id);
      }
      const at = (r) => { const k = this.order.indexOf(r.a.id); return k < 0 ? 1e6 + r.i : k; };
      return list.sort((x, y) => at(x) - at(y));
    },

    // phần thưởng: costume = canvas (vẽ ở Gacha.bindIcons) · hộp = hộp vẽ bằng CSS
    rewardArt(r, big = false) {
      if (r.item && PROG().items[r.item]) {
        const s = big ? 64 : 40;
        return `<span class="ac-ri ${big ? 'big' : ''}" style="--rc:${AC().rewardColor(r)}"><canvas data-icon="${r.item}" width="40" height="40" style="width:${s}px;height:${s}px"></canvas></span>`;
      }
      const b = PROG().boxes[r.box];
      return b ? `<span class="ac-ri box ${big ? 'big' : ''}" style="--rc:${b.color}">${G().boxArt(b.color, big)}${(r.n || 1) > 1 ? `<b>×${r.n}</b>` : ''}</span>` : '';
    },

    render(menu) {
      const rows = this.rows(), n = rows.length;
      this.sel = Math.max(0, Math.min(this.sel, n - 1));
      const cnt = AC().count(), ready = AC().claimable().length;
      const list = rows.map((r, i) => {
        const g = AC().group(r.a), p = r.p;
        const state = p.claimed ? `<i class="ac-st ok">${PX().ui('check', 'sm')}</i>`
          : p.done ? `<i class="ac-st claim">${esc(_t('CLAIM'))}</i>` : `<i class="ac-st num">${p.value}/${p.target}</i>`;
        return `<div class="ac-row ${i === this.sel ? 'sel' : ''} ${p.claimed ? 'got' : p.done ? 'ready' : ''}" data-ac="${i}" style="--gc:${g.color}">
          <span class="ac-ic">${PX().html(g.icon, '', 'x2')}</span>
          <span class="ac-tx"><b>${esc(r.a.name)}</b><em>${esc(r.a.desc)}</em><i class="ac-bar"><i style="width:${Math.round(p.pct * 100)}%"></i></i></span>
          ${this.rewardArt(r.a.reward)}
          ${state}
        </div>`;
      }).join('');
      const head = G().header(esc(_t('ACHIEVEMENTS')), `<div class="ac-sum">${PX().ui('trophy')} <b>${cnt.done}</b>/${cnt.total}${ready ? ` <span class="ac-new">${esc(_t('{n} TO CLAIM', { n: ready }))}</span>` : ''}</div>`, false);
      const msg = menu.msg ? `<div class="m-msg ${menu.msgErr ? 'err' : ''}">${esc(menu.msg)}</div>` : '';
      menu.el.innerHTML = `${head}
        <div class="gacha-body ac-g">
          <div class="ac-list">${list}</div>
          <div class="box-detail ac-detail">${rows[this.sel] ? this.detail(rows[this.sel]) : ''}</div>
        </div>${msg}`;
      G().bindIcons(menu);
      G().keepVisible(menu.el.querySelector('.ac-list'), menu.el.querySelector('.ac-row.sel'));
    },

    // bảng phải: phần thưởng to + tiến độ + hành động
    detail(r) {
      const a = r.a, p = r.p, g = AC().group(a), rw = a.reward || {};
      const rar = rw.item ? (PROG().rarities[(PROG().items[rw.item] || {}).rarity] || {}).label : _t('BOX');
      const act = p.claimed ? `<div class="ac-act ok">${PX().ui('check', 'sm')} ${esc(_t('CLAIMED'))}</div>`
        : p.done ? `<button class="ac-act claim" data-claim="1"><kbd>${esc(K('confirm', 'Enter'))}</kbd> ${esc(_t('CLAIM REWARD'))}</button>`
        : `<div class="ac-act">${esc(_t('IN PROGRESS'))} · ${p.value}/${p.target}</div>`;
      return `<div class="ac-dh" style="--gc:${g.color}"><span class="ac-ic big">${PX().html(g.icon, '', 'x3')}</span>
          <div><div class="sd-name">${esc(a.name)}</div><div class="ac-dd">${esc(a.desc)}</div></div></div>
        <i class="ac-bar big"><i style="width:${Math.round(p.pct * 100)}%"></i></i>
        <div class="ac-rw">
          <div class="ac-rh">${PX().ui('gift', 'sm')} ${esc(_t('REWARD'))}</div>
          <div class="ac-rb">${this.rewardArt(rw, true)}<div><b style="color:${AC().rewardColor(rw)}">${esc(AC().rewardName(rw))}</b><span>${esc(rar || '')}</span>
            <span>${esc(rw.item ? _t('Goes straight to your INVENTORY') : _t('Open it for free in the SHOP'))}</span></div></div>
        </div>
        ${act}`;
    },

    claim(menu, r) {
      if (!r || r.p.claimed) return;
      if (!r.p.done) { SFC.Audio.menu(); menu.setMsg(_t('Not done yet'), true); return; }
      const rw = AC().claim(r.a.id);
      if (!rw) return;
      // thưởng hộp: mở luôn (màn quay hộp của SHOP, Esc quay về đây; hộp còn lại vẫn mở tiếp được bằng OPEN ANOTHER)
      if (rw.box && PROG().boxes[rw.box]) { G().openBack = 'ach'; G().openBox(menu, rw.box); return; }
      SFC.Audio.upgrade();
      menu.setMsg(_t('Claimed: {reward}', { reward: AC().rewardName(rw) }));
    },

    input(menu, input) {
      const rows = this.rows(), n = rows.length;
      let to = this.sel;
      if (input.wasPressed('up')) to = Math.max(0, this.sel - 1);
      if (input.wasPressed('down')) to = Math.min(n - 1, this.sel + 1);
      if (to !== this.sel) { this.sel = to; menu.msg = ''; SFC.Audio.menu(); menu.render(); return; }
      if (input.wasPressed('confirm')) this.claim(menu, rows[this.sel]);
    },

    click(menu, e) {
      if (e.target.closest('[data-claim]')) { this.claim(menu, this.rows()[this.sel]); return true; }
      const row = e.target.closest('[data-ac]');
      if (!row) return false;
      const i = +row.dataset.ac, rows = this.rows();
      if (i === this.sel && rows[i] && rows[i].p.done && !rows[i].p.claimed) this.claim(menu, rows[i]);
      else { this.sel = i; menu.msg = ''; SFC.Audio.menu(); menu.render(); }
      return true;
    },

    back(menu) { this.order = null; menu.go('trophy'); },   // mở từ PHÒNG TRƯNG BÀY (src/ui/trophies.js)
  };

  SFC.AchUI = AchUI;
})();
