/* LangPick — popup chọn ngôn ngữ: lần đầu mở game (main.js -> boot, trước màn đặt tên) và SETTINGS > LANGUAGE.
 * Mỗi ngôn ngữ 1 dòng, tên viết bằng chính ngôn ngữ đó. Tiêu đề / ghi chú / gợi ý phím đổi theo dòng đang chọn, để người
 * không đọc được tiếng Anh vẫn hiểu mình đang chọn gì. Dòng chọn sẵn: ngôn ngữ đang dùng; lần đầu = ngôn ngữ của Steam /
 * hệ điều hành (SFC.I18n.detect).
 * ↑↓ chọn · xác nhận · quay lại (lần đầu: không có, bắt buộc chọn) · chuột: rê để xem trước, bấm để chọn.
 * Khung nằm giữa màn (trong vùng an toàn của TV), chữ cỡ như menu chính — đọc được từ xa khi chơi trên TV / console.
 */
window.SFC = window.SFC || {};

(function () {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const I = () => SFC.I18n;
  // chữ của popup, dịch theo dòng đang chọn (I18n.tIn)
  const TEXT = {
    title: SFC.N_('CHOOSE YOUR LANGUAGE'),
    note: SFC.N_('You can change it anytime in SETTINGS.'),
    hintFirst: SFC.N_('↑↓ select · {ok} confirm'),
    hint: SFC.N_('↑↓ select · {ok} confirm · {back} back'),
  };

  const LangPick = {
    active: false,
    sel: 0,

    // opts.first: lần đầu mở game · opts.done(id): đóng popup — id ngôn ngữ vừa chọn, null = quay lại không đổi
    open(opts = {}) {
      this.first = !!opts.first;
      this.done = opts.done || null;
      this.list = I().list();
      const want = this.first ? I().detect() : I().lang, now = I().lang;
      this.sel = Math.max(0, this.list.findIndex((l) => l.id === want));
      this.el = document.getElementById('langpick');
      if (!this.bound) this.bind();
      const rows = this.list.map((l, i) => `<button class="lp-row" data-lp="${i}" lang="${esc(l.id)}"><span>${esc(l.name)}</span>${
        !this.first && l.id === now ? SFC.PixelIcon.ui('check', 'sm') : ''}</button>`).join('');
      this.el.innerHTML = `<div class="lp-box" role="dialog" aria-modal="true">
          <div class="lp-title"></div>
          <div class="lp-list">${rows}</div>
          <div class="lp-note"></div>
          <div class="lp-hint"></div>
        </div>`;
      this.el.classList.remove('hidden');
      this.active = true;
      this.update();
    },

    // dòng đang chọn + chữ của popup theo ngôn ngữ dòng đó (gọi lại khi đổi bàn phím <-> tay cầm: main.js -> refreshLabels)
    update() {
      if (!this.active) return;
      const id = this.list[this.sel].id, tr = (s, v) => I().tIn(id, s, v);
      const kbd = (a, kb) => `<kbd>${esc(SFC.Input.key(a, kb))}</kbd>`;
      this.el.querySelectorAll('.lp-row').forEach((r, i) => r.classList.toggle('sel', i === this.sel));
      for (const c of ['.lp-title', '.lp-note', '.lp-hint']) this.el.querySelector(c).setAttribute('lang', id);
      this.el.querySelector('.lp-title').textContent = tr(TEXT.title);
      this.el.querySelector('.lp-note').textContent = tr(TEXT.note);
      this.el.querySelector('.lp-hint').innerHTML = this.first
        ? tr(TEXT.hintFirst, { ok: kbd('confirm', 'Enter') })
        : tr(TEXT.hint, { ok: kbd('confirm', 'Enter'), back: kbd('back', 'Esc') });
    },

    move(d) {
      const n = this.list.length;
      this.sel = (this.sel + d + n) % n;
      SFC.Audio.menu();
      this.update();
    },

    input(input) {
      if (input.wasPressed('up')) this.move(-1);
      if (input.wasPressed('down')) this.move(1);
      if (input.wasPressed('confirm')) return this.pick(this.sel);
      if (!this.first && (input.wasPressed('back') || input.wasPressed('pause'))) { SFC.Audio.menu(); this.close(null); }
    },

    pick(i) {
      const l = this.list[i];
      if (!l) return;
      SFC.Audio.pick();
      SFC.Settings.setLang(l.id);
      this.close(l.id);
    },

    close(id) {
      this.active = false;
      this.el.classList.add('hidden');
      this.el.innerHTML = '';
      const done = this.done;
      this.done = null;
      if (done) done(id);
    },

    bind() {
      this.bound = true;
      this.el.addEventListener('click', (e) => {
        SFC.Audio.unlock();
        const r = e.target.closest('[data-lp]');
        if (r && this.active) this.pick(+r.dataset.lp);
      });
      // rê chuột qua dòng nào thì xem trước dòng đó (không dựng lại các dòng -> cú bấm không bị mất)
      this.el.addEventListener('mousemove', (e) => {
        const r = e.target.closest('[data-lp]');
        if (r && this.active && +r.dataset.lp !== this.sel) { this.sel = +r.dataset.lp; this.update(); }
      });
    },
  };

  SFC.LangPick = LangPick;
})();
