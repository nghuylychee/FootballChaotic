/* UI (SFC.UI) — lõi giao diện DOM của 1 trận: init, show (đổi lớp phủ draft / pause / end; về menu thì ẩn hết), pause,
 * consume (sự kiện trận -> banner / toast / màn chọn / màn kết quả), chuột.
 * Các phần khác gắn thêm vào SFC.UI (nạp sau file này, scripts/manifest.js): ui/hud.js (HUD, thanh kỹ năng, banner / toast) ·
 * ui/draft.js (chọn Core) · ui/endscreen.js (kết quả) · ui/endtest.js (dev). Hàm vẽ dùng chung: ui/helpers.js. Màn ngoài trận: ui/menu.js
 */
window.SFC = window.SFC || {};

(function () {
  const { $, esc, CORES, PX, coreChip, traitList, miniCard } = SFC.UIHelpers;
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
      if (name === 'draft' && this.current !== 'draft') this.draftArm();   // màn chọn hiện ra (cả lúc quay lại từ Pause): chặn phím chốc lát
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
      this.forfeitArm = false;   // mở Pause: FORFEIT luôn về bước 1
      clearTimeout(this.forfeitTimer);
      const g = this.app.game, me = g ? g.humanTeam : -1;
      const items = this.pauseItems.map(([k, l], i) => `<button class="${i === this.pauseSel ? 'sel' : ''}" data-act="${k}">${esc(l)}</button>`).join('');
      let build = '';
      if (g && me >= 0) {
        // mỗi người 1 hàng (bạn trước, rồi đồng đội — user 2026-11-01): trường phái bên trái, lá Core bên phải.
        // ô Core = số lượt chọn của trận; Tuyệt kỹ (nếu đã mở) là lá riêng viền vàng ở cuối, không chiếm ô Core
        const row = (q, head) => {
          const all = g.cores.coresOf(q), owned = all.filter((id) => CORES().list[id].role !== 'ult');
          const ult = all.find((id) => CORES().list[id].role === 'ult'), n = Math.max(SFC_CONFIG.game.match.maxUpgrades, owned.length);
          const slots = Array.from({ length: n }, (_, i) => miniCard(owned[i])).concat(ult ? [miniCard(ult)] : []);
          const hint = q === mp ? `<em>${esc(_t('Stack Cores of one school to unlock an Ultimate'))}</em>` : '';
          // trường phái gọn (user 2026-11-01): icon + số Core + các mốc, 2 cột, không ghi Tuyệt kỹ từng mốc -> không cần thanh cuộn
          const tl = traitList(g, q);
          return `<div class="pause-build"><div class="pb-traits"><h4>${head}</h4>${tl ? `<div class="pb-tl">${tl}</div>` : hint}</div><div class="pb-cards">${slots.join('')}</div></div>`;
        };
        const mp = g.cores.seatOwner(g.me), mates = mp ? g.teams[mp.team].players.filter((q) => q !== mp) : [];
        build = `<div class="pause-rows">${[row(mp, esc(_t('YOUR BUILD')))].concat(mates.map((q) => row(q, `<u>${esc(q.role)}</u> ${esc(q.name)}`))).join('')}</div>`;
      }
      // RESUME / FORFEIT: giữa đáy màn (user 2026-11-01)
      this.el.pause.innerHTML = `
        <div class="pause-title">${esc(this.online || this.ranked ? _t('MENU') : _t('PAUSED'))}</div>
        ${this.online || this.ranked ? `<div class="pause-note">${esc(_t('Online matches keep running'))}</div>` : ''}
        ${build}
        <div class="pause-items row-items pause-foot">${items}</div>`;
      // dải "trận này" ngay dưới bảng build (pauseMatch)
      const rows = this.el.pause.querySelector('.pause-rows'), extra = rows && this.pauseMatch(g);
      if (extra) rows.insertAdjacentHTML('afterend', extra);
      SFC.CorePreview.scan(this.el.pause);
    },

    // Pause · dải "trận này" (GOAT PATH / FOOTBALL STORY): luật sân của đối thủ (tên + gợi ý) · LEGEND của bạn (kỹ thuật + phím + nhược
    // điểm) · BADGE của cả đội (icon, mô tả ở tooltip). Banner luật sân chỉ hiện 1 lần lúc bóng lăn và thanh kỹ năng không nhận chuột
    // -> Pause là chỗ đọc lại. Không có gì thì không vẽ. Nằm riêng giữa bảng build và hàng nút, không đụng nút Pause
    pauseMatch(g) {
      const out = [], RU = SFC.RunUI, mod = g.opts.mod && SFC_CONFIG.stories.mods[g.opts.mod];
      if (mod) {
        const opp = g.teams[1 - g.humanTeam];
        out.push(`<div class="pm-box pm-rule" style="--c:${opp.cfg.kit.shirt}"><p><b>${PX().ui('whistle', 'sm')}${esc(mod.name)}</b> ${esc(mod.hint)}</p></div>`);
      }
      const p = g.cores.seatOwner(g.me), L = p && p.legend && SFC.Run && SFC.Run.legend(p.legend);
      if (L && RU) out.push(`<div class="pm-box pm-leg" style="--lc:${L.color}"><h5 title="${esc(L.title + ' · ' + L.flawDesc)}">${esc(L.name)}</h5><div>${RU.comboChip(L)}${RU.flawChip(L)}</div></div>`);
      const bds = RU ? this.runBadges(g) : [], RAR = SFC_CONFIG.progression.rarities;
      if (bds.length) {
        const icons = bds.map((b) => `<span class="sq-b" style="--rc:${RAR[SFC.Run.badge(b.id).rarity].color}" data-tip="${esc(RU.badgeTip(b.id, b.up))}">${RU.badgeIcon(b.id, '')}</span>`).join('');
        out.push(`<div class="pm-box pm-bds"><h5>${esc(_t('TEAM BADGES'))}</h5><div>${icons}</div></div>`);
      }
      return out.length ? `<div class="pause-match">${out.join('')}</div>` : '';
    },

    // đổi nút đang chọn mà không vẽ lại (giữ ảnh động của các lá Core)
    setPauseSel() {
      this.el.pause.querySelectorAll('.pause-items button').forEach((b, i) => b.classList.toggle('sel', i === this.pauseSel));
    },

    pauseInput(input) {
      // cần phải tay cầm: cuộn bảng build (chuột: con lăn, bảng có thanh cuộn)
      const ry = SFC.Pad ? SFC.Pad.rstickY : 0, box = ry && this.el.pause.querySelector('.pb-traits');
      if (box) box.scrollTop += ry * 5;
      // không vòng quanh: trái ở RESUME thì đứng yên (không nhảy sang FORFEIT ở cuối hàng)
      const n = this.pauseItems.length;
      if (input.wasPressed('up') || input.wasPressed('left')) { this.pauseSel = Math.max(0, this.pauseSel - 1); this.setPauseSel(); }
      if (input.wasPressed('down') || input.wasPressed('right')) { this.pauseSel = Math.min(n - 1, this.pauseSel + 1); this.setPauseSel(); }
      if (input.wasPressed('pause') || input.wasPressed('back')) return this.app.resume();
      if (input.wasPressed('confirm')) this.pauseAct(this.pauseItems[this.pauseSel][0]);
    },

    // FORFEIT / GIVE UP trong Pause bấm 2 lần (như FORFEIT RUN ở tab GOAT PATH, LEAVE ROOM): lần 1 = CONFIRM FORFEIT đỏ
    // + dòng hậu quả trên nút, 3 giây không bấm lại thì về như cũ; lần 2 mới bỏ trận
    pauseAct(act) {
      if (act === 'forfeit' && !this.forfeitArm) {
        SFC.Audio.menu();
        this.forfeitArm = true;
        clearTimeout(this.forfeitTimer);
        this.forfeitTimer = setTimeout(() => { this.forfeitArm = false; this.renderForfeit(); }, 3000);
        this.renderForfeit();
        return;
      }
      this.forfeitArm = false;
      clearTimeout(this.forfeitTimer);
      this.doAct(act);
    },
    // đổi nút FORFEIT + dòng cảnh báo tại chỗ (không vẽ lại cả Pause -> giữ ảnh động các lá Core)
    renderForfeit() {
      const i = this.pauseItems.findIndex(([k]) => k === 'forfeit');
      const b = i >= 0 && this.el.pause.querySelectorAll('.pause-items button')[i];
      if (!b) return;
      // giữ bề rộng nút khi đổi chữ: chuột bấm lần 2 vẫn trúng nút, hàng nút không xô lệch
      b.style.minWidth = this.forfeitArm ? b.offsetWidth + 'px' : '';
      b.classList.toggle('danger', !!this.forfeitArm);
      b.textContent = this.forfeitArm ? _t('CONFIRM FORFEIT') : this.pauseItems[i][1];
      let w = this.el.pause.querySelector('.pause-warn');
      const note = this.forfeitArm ? this.forfeitNote() : '';
      if (!note) { if (w) w.remove(); return; }
      if (!w) { w = document.createElement('div'); w.className = 'pause-warn'; this.el.pause.appendChild(w); }
      w.textContent = note;
    },
    // bỏ trận thì mất gì (chuỗi có sẵn ở tab GOAT PATH / FOOTBALL STORY / trận xếp hạng)
    forfeitNote() {
      const o = (this.app.game && this.app.game.opts) || {};
      if (o.mainPath) return _t('Forfeit counts as a loss.');
      if (o.cup) return _t('Quit this cup? Your progress in this run will be lost.');
      if (o.trial) return '';
      if (o.drill) return `${_t('FAIL')} · ${_t('An injury')}`;
      if (o.run) return _t('Forfeit this run? It counts as a loss.');
      return '';
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
          this.leaveArm = false;
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
        if (btn.dataset.act && btn.closest('#pause')) return this.pauseAct(btn.dataset.act);   // FORFEIT bấm 2 lần
        if (btn.dataset.pick != null && this.app.game) return this.pick(this.app.game, +btn.dataset.pick);
        if (this.pendingReveal && btn.closest('#end')) return this.openReveal();   // còn thẻ chưa mở
        this.doAct(btn.dataset.act);
      });
      // rê chuột = chọn (lá Core ở màn chọn, nút Pause): chuột và phím dùng chung 1 lựa chọn, Enter lấy đúng cái đang trỏ.
      // Chỉ khi chuột thật sự di chuyển: màn vừa mở dưới con trỏ đứng yên không cướp lựa chọn của phím / tay cầm
      let mx = -1, my = -1;
      document.addEventListener('mousemove', (e) => {
        if (e.clientX === mx && e.clientY === my) return;
        mx = e.clientX; my = e.clientY;
        this.hoverSel(e.target);
      });
    },

    hoverSel(el) {
      if (!el || !el.closest) return;
      const card = el.closest('#draft .card[data-pick]'), g = this.app.game;
      if (card) {
        const i = +card.dataset.pick, d = g && g.draft;
        if (this.current !== 'draft' || !d || d.picked[g.me] || this.draftAnimActive || this.draftMorphActive || i === this.draftSel) return;
        SFC.Audio.menu();
        this.setDraftSel(i);
        return;
      }
      const b = el.closest('#pause .pause-items button');
      if (!b || this.current !== 'pause') return;
      const i = [...b.parentNode.children].indexOf(b);
      if (i >= 0 && i !== this.pauseSel) { this.pauseSel = i; this.setPauseSel(); }
    },
  };

  SFC.UI = UI;
})();
