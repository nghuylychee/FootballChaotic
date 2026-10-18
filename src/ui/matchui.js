/* UI (SFC.UI) — lõi giao diện DOM của 1 trận: init, show (đổi lớp phủ draft / pause / end; về menu thì ẩn hết), pause,
 * consume (sự kiện trận -> banner / toast / màn chọn / màn kết quả), chuột.
 * Các phần khác gắn thêm vào SFC.UI (nạp sau file này, scripts/manifest.js): ui/hud.js (HUD, thanh kỹ năng, banner / toast) ·
 * ui/draft.js (chọn Core) · ui/endscreen.js (kết quả) · ui/endtest.js (dev). Hàm vẽ dùng chung: ui/helpers.js. Màn ngoài trận: ui/menu.js
 */
window.SFC = window.SFC || {};

(function () {
  const { $, esc, CORES, coreChip, traitList, miniCard } = SFC.UIHelpers;
  const _t = SFC.t;   // dịch theo ngôn ngữ đang chọn (engine/i18n.js)

  // nút Pause mặc định — main.js -> beginMatch đặt lại (đã dịch) mỗi lần vào trận
  const PAUSE_SINGLE = [['resume', 'RESUME'], ['restart', 'RESTART'], ['menu', 'MAIN MENU']];

  const UI = {
    init(app) {
      this.app = app;
      this.el = {
        menu: $('menu'), draft: $('draft'), pause: $('pause'), end: $('end'),
        hud: $('hud'), abar: $('abar'), banner: $('banner'), toasts: $('toasts'),
      };
      this.draftSel = 0;
      this.pauseSel = 0;
      this.endSel = 0;
      this.hudCache = {};
      this.pauseItems = PAUSE_SINGLE;
      this.bindMouse();
    },

    show(name) {
      if (name === 'menu' || name === 'end') SFC.RecipeFx.cancel();   // rời trận / hết trận giữa lúc diễn mở Tuyệt kỹ
      if (name !== 'draft') this.skipDraftAnim();
      // chữ chờ chọn Core chỉ được ẩn ở updateHud (không chạy ở menu) -> rời trận / hết trận thì ẩn luôn
      if ((name === 'menu' || name === 'end') && this.el.draftWait) this.el.draftWait.classList.add('hidden');
      if (name !== 'end') {
        clearTimeout(this.outroTimer);
        clearTimeout(this.sbTimer);
        this.outroActive = false;
        this.rwFocus = false;
        this.el.end.classList.remove('outro', 'rw-focus', 'sb-shown');
      }
      ['menu', 'draft', 'pause', 'end'].forEach((k) => this.el[k].classList.toggle('hidden', k !== name));
      this.el.hud.classList.toggle('hidden', name === 'menu' || name === 'end');
      if (name === 'menu' || name === 'end') this.el.abar.classList.add('hidden');
      this.current = name;
    },

    get online() { return this.app.mode === 'online'; },
    // trận xếp hạng Main Path (chơi đơn hoặc online có người thật): cùng 1 giao diện, không lộ có người thật hay không
    get ranked() { return !!(this.app.game && this.app.game.opts.mainPath); },
    // trận trong phòng online (mã phòng, chủ phòng, phòng chờ)
    get roomMatch() { return this.online && !this.ranked; },

    /* ================= PAUSE / MENU TRONG TRẬN ================= */
    // Pause: build hiện tại — bên trái Cộng hưởng đạt mốc mấy (kèm hiệu ứng), bên phải các lá Core đang có (ô trống: ???)
    renderPause() {
      const g = this.app.game, me = g ? g.humanTeam : -1;
      const items = this.pauseItems.map(([k, l], i) => `<button class="${i === this.pauseSel ? 'sel' : ''}" data-act="${k}">${esc(l)}</button>`).join('');
      let build = '';
      if (g && me >= 0) {
        // ô Core = số lượt chọn của trận; Tuyệt kỹ (nếu đã mở) là lá riêng viền vàng ở cuối, không chiếm ô Core
        const mp = g.cores.seatOwner(g.me), all = g.cores.coresOf(mp), owned = all.filter((id) => CORES().list[id].role !== 'ult');
        const ult = all.find((id) => CORES().list[id].role === 'ult'), n = Math.max(SFC_CONFIG.game.match.maxUpgrades, owned.length);
        const slots = Array.from({ length: n }, (_, i) => miniCard(owned[i])).concat(ult ? [miniCard(ult)] : []);
        build = `<div class="pause-build">
          <div class="pb-traits"><h4>${esc(_t('YOUR BUILD'))}</h4>${traitList(g, mp, true) || `<em>${esc(_t('Stack Cores of one school to unlock an Ultimate'))}</em>`}</div>
          <div class="pb-cards">${slots.join('')}</div>
        </div>`;
      }
      this.el.pause.innerHTML = `
        <div class="pause-title">${esc(this.online || this.ranked ? _t('MENU') : _t('PAUSED'))}</div>
        ${this.online || this.ranked ? `<div class="pause-note">${esc(_t('Online matches keep running'))}</div>` : ''}
        ${build}
        <div class="pause-items row-items">${items}</div>`;
      SFC.CorePreview.scan(this.el.pause);
    },

    // đổi nút đang chọn mà không vẽ lại (giữ ảnh động của các lá Core)
    setPauseSel() {
      this.el.pause.querySelectorAll('.pause-items button').forEach((b, i) => b.classList.toggle('sel', i === this.pauseSel));
    },

    pauseInput(input) {
      // cần phải tay cầm: cuộn bảng build (chuột: con lăn, bảng có thanh cuộn)
      const ry = SFC.Pad ? SFC.Pad.rstickY : 0, box = ry && this.el.pause.querySelector('.pb-traits');
      if (box) box.scrollTop += ry * 5;
      const n = this.pauseItems.length;
      if (input.wasPressed('up') || input.wasPressed('left')) { this.pauseSel = (this.pauseSel + n - 1) % n; this.setPauseSel(); }
      if (input.wasPressed('down') || input.wasPressed('right')) { this.pauseSel = (this.pauseSel + 1) % n; this.setPauseSel(); }
      if (input.wasPressed('pause') || input.wasPressed('back')) return this.app.resume();
      if (input.wasPressed('confirm')) this.doAct(this.pauseItems[this.pauseSel][0]);
    },

    consume(game) {
      const evs = game.events.splice(0);
      if (game.silent) return;
      const overlay = this.current === 'pause';
      for (const e of evs) {
        if (e.type === 'goal') {
          const t = game.teams[e.team];
          this.banner(e.value > 1 ? _t('GOAL x{n}!', { n: e.value }) : _t('GOAL!'), e.own ? _t('Own goal!') : `${e.scorer} · ${t.cfg.name}`, t.cfg.kit.shirt, 2.2);
        }
        // banner của trận (match.js, chữ đánh dấu SFC.N_): dịch lúc hiện — online thì sự kiện đến từ máy host
        if (e.type === 'banner') this.banner(_t(e.text, e.vars), e.sub && _t(e.sub, e.vars), e.color, 2.2);
        // màn chọn Core: mở / vẽ lại / đóng (ui/draft.js)
        if (e.type === 'draft' || e.type === 'draftWait' || e.type === 'corePicked') this.draftEvent(game, e, evs, overlay);
        // Tuyệt kỹ của bạn vừa đổi theo công thức: ghi sổ Tuyệt kỹ + banner (lần đầu khám phá / tiến hoá / đổi)
        if (e.type === 'ultUnlock') this.ultUnlocked(game, e);
        if (e.type === 'corePicked') {
          // đội mình: chỉ lá bạn vừa lấy (Core đồng đội ẩn cho gọn); đội kia: gộp 1 dòng các lá vừa lấy
          const me = game.controlled;
          const mine = e.picks.filter((pk) => pk.team === game.humanTeam && me && pk.pid === me.id), other = e.picks.filter((pk) => pk.team !== game.humanTeam);
          for (const pk of mine) {
            const c = CORES().list[pk.id], t = game.teams[pk.team], q = game.players.find((x) => x.id === pk.pid);
            this.toast(`<span class="dot" style="background:${t.cfg.kit.shirt}"></span>${_t('{player} gets {core}', { player: esc(q ? q.name : t.cfg.short), core: `${coreChip(pk.id)} <b>${esc(c.name)}</b>` })}`);
          }
          if (other.length) {
            const t = game.teams[other[0].team];
            this.toast(`<span class="dot" style="background:${t.cfg.kit.shirt}"></span>${_t('{player} gets {core}', { player: esc(t.cfg.short), core: other.map((pk) => coreChip(pk.id)).join('') })}`);
          }
        }
        if (e.type === 'end' && game.opts.tutorial) { SFC.Tutorial.onEnd(game); continue; }
        if (e.type === 'end') {
          // thưởng XP / gold: tính 1 lần cho người chơi tại máy này (chơi đơn + online)
          if (!game.reward && game.humanTeam >= 0 && SFC.Profile.data) game.reward = SFC.Profile.awardMatch(game);
          if (game.opts.mainPath && game.opts.mainPath.party) SFC.Social.afterMatch();   // người bạn trong phòng nhắn "gg! again?"
          this.endSel = 0;
          if (this.app.game === game) this.beginOutro(game);
        }
      }
    },

    /* ================= CHUỘT ================= */
    bindMouse() {
      document.addEventListener('click', (e) => {
        SFC.Audio.unlock();
        if (e.target.closest('#menu')) return; // menu tự xử lý
        if (SFC_DEBUG) {
          const de = e.target.closest('[data-devend]');
          if (de) { SFC.Audio.menu(); this.devEndTest(de.dataset.devend); return; }
        }
        if (this.draftAnimActive || this.draftMorphActive) { this.skipDraftAnim(); return; }
        if (this.outroActive && e.target.closest('#end') && performance.now() - (this.outroAt || 0) > 450) {
          SFC.Audio.menu();
          this.finishOutro();
          return;
        }
        if (this.rwFocus && e.target.closest('#end')) {
          if (this.rwRaf) this.rwSkip = true;
          else if (!this.pendingReveal && !this.drillAfter) this.revealScoreboard();
          return;
        }
        const btn = e.target.closest('[data-act],[data-pick]');
        if (!btn) return;
        if (btn.dataset.pick != null && this.app.game) return this.pick(this.app.game, +btn.dataset.pick);
        if (this.pendingReveal && btn.closest('#end')) return this.openReveal();   // còn thẻ chưa mở
        this.doAct(btn.dataset.act);
      });
    },
  };

  SFC.UI = UI;
})();
