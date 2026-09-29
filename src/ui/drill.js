/* Drill — màn DRILL (docs/DRILL_DESIGN.md): mỗi drill chờ = chọn 1 trong 3, cộng chỉ số character vĩnh viễn.
 * Giao diện "tường phố": tường gạch (màu gạch sân Back Alley) + 3 poster dán băng keo, stencil icon chỉ số trên vệt sơn,
 * chọn xong xịt chữ DONE! lên poster. Lớp phủ trên cùng (#drill), mở trên màn kết quả (ui.js) hoặc menu (CHARACTER / STATS).
 * Khi active, main.js chuyển phím cho Drill.input. Chọn xong còn drill chờ -> bộ 3 kế tiếp; hết -> đóng, gọi onClose.
 * Số liệu drill ở config/progression.config.js -> attrs.drills; bốc / lưu / cộng ở src/core/profile.js.
 */
window.SFC = window.SFC || {};

(function () {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const A = () => SFC_CONFIG.progression.attrs;
  const PF = () => SFC.Profile;
  const K = (action, kb) => SFC.Input.key(action, kb);
  const PICK_DELAY = 0.55;   // (s) ô vừa chọn đóng dấu DONE rồi mới sang bộ 3 kế tiếp

  const Drill = {
    active: false,
    sel: 0,

    // mở màn DRILL; không còn drill chờ thì gọi onClose luôn
    open(onClose) {
      if (PF().drillsPending() <= 0) { if (onClose) onClose(); return; }
      const el = this.el || (this.el = document.getElementById('drill'));
      if (!this.bound) {
        this.bound = true;
        el.addEventListener('click', (e) => this.click(e));
      }
      this.onClose = onClose;
      this.active = true;
      this.busy = false;
      this.sel = 0;
      el.classList.remove('hidden');
      this.render();
      SFC.Audio.whoosh();
    },

    close() {
      if (!this.active) return;
      this.active = false;
      clearTimeout(this.pickT);
      this.el.classList.add('hidden');
      this.el.innerHTML = '';
      const cb = this.onClose;
      this.onClose = null;
      if (cb) cb();
    },

    /* ---------------- DOM ---------------- */
    render() {
      const offer = PF().drillOffer();
      if (!offer.length) return this.close();
      if (this.sel >= offer.length) this.sel = 0;
      const n = PF().drillsPending(), left = PF().rerollsLeft();
      const tiles = offer.map((id, i) => this.tile(id, i)).join('');
      const pad = SFC.Input.device === 'pad';
      const pick = pad ? `←→ + ${esc(K('confirm', 'Enter'))} pick` : '1 / 2 / 3 or ←→ + Enter pick';
      // chữ graffiti mờ trên tường (giống tường sân, arenas.config.js -> graffiti)
      const tags = [['STREET', 66, 5, 4, '#3ff6ff'], ['NO RULES', 49, 1, -5, '#ff3fb4']]
        .map(([t, x, y, r, c]) => `<i class="dr-tag" style="left:${x}%;top:${y}%;--r:${r}deg;--c:${c}">${t}</i>`).join('');
      this.el.innerHTML = `<div class="drill">
        <div class="dr-wall">${tags}
          <div class="dr-head"><b class="dr-title">DRILL</b><span class="dr-label">LV ${PF().data.level} · PICK 1 OF ${offer.length}</span><em class="dr-left">${n}<small>LEFT</small></em></div>
          <div class="dr-tiles">${tiles}</div>
          <div class="dr-curb">
            <div class="dr-strip" id="dr-strip">${this.strip(offer[this.sel])}</div>
            <div class="dr-foot">
              <span class="dr-hint">${pick}</span>
              <button class="dr-btn roll ${left ? '' : 'off'}" data-act="reroll"><kbd>${esc(K('reroll', 'R'))}</kbd> REROLL (${left})</button>
              <button class="dr-btn" data-act="later"><kbd>${esc(K('back', 'Esc'))}</kbd> LATER</button>
            </div>
          </div>
        </div>
      </div>`;
    },

    // 1 poster: số phím · chỉ số · stencil icon trên vệt sơn · tên · rating trước → sau + thanh · mô tả
    tile(id, i) {
      const L = A().drills.list[id], pf = PF(), gains = pf.drillGains(id), span = A().max - A().base;
      const keys = A().order.filter((k) => L.gains[k]);
      // icon / màu sơn: của drill (Boot Camp) hoặc của chỉ số tăng nhiều nhất
      const main = keys.reduce((a, b) => (L.gains[b] > L.gains[a] ? b : a));
      const icon = L.icon || A().list[main].icon, color = L.color || A().list[main].color;
      const rows = keys.map((k) => {
        const r0 = pf.rating(k), r1 = pf.rating(k, gains);
        const w0 = ((r0 - A().base) / span) * 100, w1 = ((r1 - A().base) / span) * 100;
        return `<div class="dr-gain"><span>${A().list[k].short}</span><b>${r0}</b><em>${r1 > r0 ? `→ ${r1}` : 'MAX'}</em>
          <i class="dr-bar"><b style="width:${w0.toFixed(1)}%"></b><u style="left:${w0.toFixed(1)}%;width:${(w1 - w0).toFixed(1)}%"></u></i></div>`;
      }).join('');
      const tags = L.kind === 'all' ? 'ALL STATS' : keys.map((k) => A().list[k].short).join(' · ');
      return `<div class="dr-tile ${L.kind} ${i === this.sel ? 'sel' : ''}" data-drill="${i}" style="--d:${(i * 0.07).toFixed(2)}s;--pc:${color}">
        <div class="dr-paper">
          <div class="dr-top"><span class="dr-key">${i + 1}</span><span class="dr-tags">${tags}</span></div>
          <div class="dr-art"><i class="dr-splat"></i>${SFC.PixelIcon.html(icon, '', 'x3')}</div>
          <div class="dr-name">${esc(L.name)}</div>
          <div class="dr-gains">${rows}</div>
          <p class="dr-desc">${esc(L.desc)}</p>
        </div>
        <i class="dr-tape l"></i><i class="dr-tape r"></i>
        <div class="dr-stamp">DONE!</div>
      </div>`;
    },

    // dải dưới: 6 rating hiện tại, phần tăng của ô đang chọn + OVR trước → sau
    strip(id) {
      const pf = PF(), gains = id ? pf.drillGains(id) : {};
      const cells = A().order.map((k) => `<span class="${gains[k] ? 'up' : ''}">${A().list[k].short} <b>${pf.rating(k)}</b>${gains[k] ? `<em>+${gains[k]}</em>` : ''}</span>`).join('');
      const o0 = pf.ovr(), o1 = pf.ovr(gains);
      return `${cells}<span class="dr-ovr">OVR <b>${o0}</b>${o1 !== o0 ? `<em>→ ${o1}</em>` : ''}</span>`;
    },

    // đổi ô đang chọn: không vẽ lại cả màn (giữ animation vào của các ô)
    setSel(i) {
      const offer = PF().drillOffer();
      this.sel = i;
      this.el.querySelectorAll('.dr-tile').forEach((t) => t.classList.toggle('sel', +t.dataset.drill === i));
      const s = this.el.querySelector('#dr-strip');
      if (s) s.innerHTML = this.strip(offer[i]);
    },

    /* ---------------- chọn / đổi / để sau ---------------- */
    pick(i) {
      if (this.busy) return;
      const r = PF().pickDrill(i);
      if (!r) return;
      this.busy = true;
      const t = this.el.querySelector(`.dr-tile[data-drill="${i}"]`);
      if (t) t.classList.add('done');
      this.el.querySelectorAll('.dr-tile').forEach((x) => { if (x !== t) x.classList.add('gone'); });
      SFC.Audio.upgrade();
      this.pickT = setTimeout(() => {
        this.busy = false;
        if (!this.active) return;
        if (PF().drillsPending() > 0) { this.sel = 0; this.render(); SFC.Audio.whoosh(); } else this.close();
      }, PICK_DELAY * 1000);
    },

    reroll() {
      if (this.busy) return;
      if (!PF().rerollDrill()) { SFC.Audio.menu(); return; }
      this.sel = 0;
      this.render();
      SFC.Audio.whoosh();
    },

    input(input) {
      if (this.busy) return;
      if (input.wasPressed('pause') || input.wasPressed('back')) { SFC.Audio.menu(); return this.close(); }
      const n = PF().drillOffer().length;
      if (!n) return this.close();
      if (input.wasPressed('left')) { this.setSel((this.sel + n - 1) % n); SFC.Audio.menu(); }
      if (input.wasPressed('right')) { this.setSel((this.sel + 1) % n); SFC.Audio.menu(); }
      let pick = -1;
      if (input.wasPressed('pick1')) pick = 0;
      if (input.wasPressed('pick2')) pick = 1;
      if (input.wasPressed('pick3')) pick = 2;
      if (input.wasPressed('confirm')) pick = this.sel;
      if (pick >= 0 && pick < n) this.pick(pick);
      else if (input.wasPressed('reroll')) this.reroll();
    },

    click(e) {
      if (!this.active) return;
      SFC.Audio.unlock();
      const act = e.target.closest('[data-act]');
      if (act) {
        if (act.dataset.act === 'reroll') this.reroll();
        if (act.dataset.act === 'later') { SFC.Audio.menu(); this.close(); }
        return;
      }
      const t = e.target.closest('[data-drill]');
      if (t) this.pick(+t.dataset.drill);
    },
  };

  SFC.Drill = Drill;
})();
