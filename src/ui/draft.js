/* Màn chọn Core (draft) — gắn vào SFC.UI (ui/matchui.js): vẽ 3 lá, chọn bằng phím / chuột, ảnh động lá bay vào YOUR BUILD rồi
 * khối build bay về thanh kỹ năng, chữ chờ người khác chọn (draftWaitView), sự kiện draft / draftWait / corePicked (draftEvent)
 */
window.SFC = window.SFC || {};

(function () {
  const { $, esc, CORES, ARCH, PX, RARITY, ultName, traitChips, keyLabel } = SFC.UIHelpers;
  const _t = SFC.t, _tn = SFC.tn;   // dịch theo ngôn ngữ đang chọn (engine/i18n.js)

  Object.assign(SFC.UI, {
    /* ================= DRAFT ================= */
    // flip = lượt mới / đổi bài: lá lật vào (CSS .cards.flip). Vẽ lại vì đổi tay cầm thì không lật
    renderDraft(game, flip = false) {
      const d = game.draft;
      if (!d) return;
      const me = game.me, team = game.humanTeam;   // lượt chọn khóa theo slot người chơi (co-op: 2 slot cùng đội)
      const total = SFC_CONFIG.game.match.maxUpgrades;
      const opts = d.options[me] || [];
      const picked = !!d.picked[me];
      const mp = game.cores.seatOwner(me);   // Core là của riêng cầu thủ người chơi điều khiển
      const ownedTags = new Set(game.cores.coresOf(mp).flatMap((id) => CORES().list[id].tags));
      // giờ chọn (ranked / online): thanh rút dần ngang hàng lá bài + số giây nhỏ (#draft-timer: chữ do updateHud cập nhật,
      // thanh do draftClockView chạy mỗi khung)
      const clock = d.limit > 0 ? `<div class="draft-clock n${opts.length}"><i></i><b id="draft-timer">${Math.ceil(Math.max(0, d.t))}s</b></div>` : '';
      const cards = opts.map((id, i) => {
        const c = CORES().list[id];
        const rar = RARITY(c.rarity);
        const chosen = picked && (d.localPick === i || d.picked[me] === id);
        const match = c.tags.some((t) => ownedTags.has(t));
        // lá này mở / tiến hoá Tuyệt kỹ: "→ METEOR SHOT ★★" (đã khám phá) hoặc "→ ??? NEW ULTIMATE"
        const nu = mp && !picked && game.cores.recipesOn() && game.cores.bestRecipe(mp, id);
        const ultTag = nu ? `<div class="card-ultnext">${PX().ui('star', 'sm')} ${esc(ultName(nu.id, nu.lv) === '???' ? _t('??? NEW ULTIMATE') : ultName(nu.id, nu.lv))}</div>` : '';
        const tags = c.anyBuild ? `<span style="--c:${c.color || rar.color}">${PX().ui('star', 'sm')} ${esc(_t('ANY BUILD'))}</span>`
          : c.tags.map((t) => `<span style="--c:${ARCH(t).color}">${PX().arch(t, 'sm')} ${ARCH(t).label}</span>`).join('');
        // Core vừa mở khoá ở Main Path: nhãn NEW (hiện 1 lần rồi bỏ khỏi danh sách "mới")
        const isNew = game.opts.coreFresh && !!mp && !!game.cores.newShown[mp.id] && game.cores.newShown[mp.id].has(id);
        if (isNew && game.opts.mainPath) SFC.MainPath.seen(id);
        return `<div class="card ${c.role === 'ult' ? 'ult' : ''} ${!picked && i === this.draftSel ? 'sel' : ''} ${chosen ? 'chosen' : ''}" data-pick="${i}" style="--c:${rar.color};--c2:${rar.color};--t:${rar.color}">
          <div class="card-key">${i + 1}</div>
          ${isNew ? `<div class="card-new">${esc(_t('NEW'))}</div>` : ''}
          ${match && !picked ? `<div class="card-match">${esc(_t('MATCH'))}</div>` : ''}
          ${ultTag}
          <div class="card-tags">${tags}</div>
          <div class="card-art">${SFC.CorePreview.html(id, 132, 56)}<span class="card-emoji">${PX().core(id)}</span>${c.role === 'ult' ? `<kbd class="card-x">${esc(keyLabel('ultimate'))}</kbd>` : ''}</div>
          <div class="card-name">${esc(c.name)}</div>
          ${SFC.CoreScale.statLine(id)}
          <div class="card-desc">${SFC.CoreScale.describe(id, game.cores.rating(id, mp || team))}</div>
        </div>`;
      }).join('');
      const left = (d.rerolls && d.rerolls[me]) || 0;
      // cores.draft.rerollsPerRound = 0: tạm bỏ đổi bài -> không có nút REROLL.
      // Nút thật ngay dưới góc phải hàng lá (UX màn draft, owner: nằm dưới tiêu đề thì đọc lướt bỏ qua): mắt đọc hết lá là tới đây.
      // Đổi bài = đổi mọi lá đang chia (3, 4 khi có Scouting Report) -> chữ không ghi số lá
      const reroll = picked || d.noReroll || !SFC_CONFIG.cores.draft.rerollsPerRound ? '' : `<button class="draft-reroll ${left ? '' : 'off'}" data-act="reroll"><kbd>${esc(keyLabel('reroll'))}</kbd><span>${esc(_tn('REROLL ({n} left)', 'REROLL ({n} left)', left))}</span></button>`;
      // bàn phím: không cần chú thích (bỏ dòng "Pick 1 Core..."); tay cầm không có phím số -> gợi ý nút ngắn
      const sub = picked ? esc(game.seats.length > 2 || game.humans.length < 2 ? _t('Picked · waiting for other players...') : _t('Picked · waiting for opponent...')) : SFC.Input.device === 'pad' ? `←→ + ${esc(keyLabel('confirm'))}` : '';
      this.el.draft.classList.toggle('waiting', picked);
      // lượt chọn có kịch bản (PROLOGUE): tiêu đề riêng, ghi chú dưới lá bài, lá ULTIMATE lộ diện
      this.el.draft.classList.toggle('ult-reveal', d.special === 'ult');
      // lượt chọn thêm (GOAT PATH BADGE Pre-Season Camp, d.bonus): ô Core thêm 1, tiêu đề BONUS PICK
      const nOwn = mp ? game.cores.coresOf(mp).filter((cid) => CORES().list[cid].role !== 'ult').length : 0;
      const extra = d.bonus || nOwn >= total ? 1 : 0;
      const title = d.title ? esc(d.title) : d.bonus ? `${esc(_t('BONUS PICK'))} <span>+1</span>` : `${esc(d.pre ? _t('STARTING CORE') : _t('CORE UPGRADE'))} <span>${d.round}/${total}</span>`;

      // slots: các lượt chọn Core (tối đa 4, thêm 1 khi có lượt chọn thêm) + ô Tuyệt kỹ
      const maxSlots = total + extra;
      const owned = mp ? game.cores.coresOf(mp).filter((cid) => CORES().list[cid].role !== 'ult') : [];
      const ult = mp ? game.cores.coresOf(mp).find((cid) => CORES().list[cid].role === 'ult') : null;
      const targetSlot = owned.length;
      const slots = Array.from({ length: maxSlots }, (_, idx) => {
        const id = owned[idx];
        if (id) {
          const c = CORES().list[id], a = ARCH(c.tags[0]);
          return `<div class="d-slot filled" style="--c:${a.color}" title="${esc(c.name)}">${PX().core(id, 'sm')}</div>`;
        }
        const isTarget = idx === targetSlot && d.special !== 'ult';
        return `<div class="d-slot empty ${isTarget ? 'target' : ''}" data-slot="${idx}"><b>${idx + 1}</b></div>`;
      }).join('');
      const isUltTarget = d.special === 'ult' || (targetSlot >= total && !ult);
      const ultSlot = ult ? `<div class="d-slot ult filled" title="${esc(CORES().list[ult].name)}">${PX().core(ult, 'sm')}</div>`
        : `<div class="d-slot ult empty ${isUltTarget ? 'target' : ''}" title="${esc(_t('Ultimate'))}"><kbd>${esc(keyLabel('ultimate'))}</kbd></div>`;
      const traits = traitChips(game, mp);

      this.el.draft.innerHTML = `
        <div class="draft-title">${title}</div>
        ${clock}
        <div class="draft-sub">${sub}</div>
        <div class="draft-deck"><div class="cards n${opts.length} ${flip ? 'flip' : ''}">${cards}</div>${reroll}</div>
        ${d.note ? `<div class="draft-note">${esc(d.note).replace(/\*(.+?)\*/g, '<b>$1</b>')}</div>` : ''}
        <div class="draft-build">
          <div class="draft-build-row">
            <div class="draft-square-wrap">
              <span class="draft-build-label">${esc(_t('YOUR BUILD'))}</span>
              <div class="draft-square">${slots}</div>
            </div>
            ${(ult || d.special === 'ult') ? `
            <div class="draft-ult-wrap">
              <span class="draft-build-label">${esc(_t('ULTIMATE'))}</span>
              ${ultSlot}
            </div>` : ''}
          </div>
          ${traits ? `<div class="draft-traits-row">${traits}</div>` : ''}
        </div>`;
      SFC.CorePreview.scan(this.el.draft);
      // lật xong thì gỡ .flip: ẩn / hiện lại #draft (Pause) không lật lại
      clearTimeout(this.draftFlipT);
      if (flip) this.draftFlipT = setTimeout(() => { const el = this.el.draft.querySelector('.cards.flip'); if (el) el.classList.remove('flip'); }, 350);
      this.draftClock = this.el.draft.querySelector('.draft-clock');
      this.draftClockK = -1;
      this.draftClockView(game);

      // âm thanh chia bài khi lá mới xuất hiện
      const roundKey = `${d.round}:${d.pre ? 'pre' : ''}:${d.special || ''}`;
      if (this.lastDraftRound !== roundKey && !picked) {
        this.lastDraftRound = roundKey;
        SFC.Audio.whoosh();
      }
    },

    // đổi lá đang chọn mà không vẽ lại (giữ ảnh động đang chạy)
    setDraftSel(i) {
      this.draftSel = i;
      this.el.draft.querySelectorAll('.card[data-pick]').forEach((c) => c.classList.toggle('sel', +c.dataset.pick === i));
    },

    draftInput(input, game) {
      // đang diễn mở Tuyệt kỹ (RecipeFx): Enter / Esc bỏ qua
      if (SFC.RecipeFx.active) { if (input.wasPressed('confirm') || input.wasPressed('back')) SFC.RecipeFx.skip(); return; }
      // phím số pick1..pick5 = lá 1..5 (số in trên lá, 4 / 5 khi có BADGE Scouting Report) -> chỉ số lá, -1 = không bấm
      const numKey = () => { for (let k = 5; k >= 1; k--) if (input.wasPressed('pick' + k)) return k - 1; return -1; };
      if (this.draftAnimActive || this.draftMorphActive) {
        if (input.wasPressed('confirm') || input.wasPressed('back') || numKey() >= 0) this.skipDraftAnim();
        return;
      }
      // màn chọn vừa hiện: lá còn đang chia, chưa nhận phím (draftLocked)
      if (this.draftLocked()) return;
      const d = game.draft;
      if (!d || d.picked[game.me]) return;
      const n = (d.options[game.me] || []).length;
      if (!n) return;
      let changed = false;
      let sel = this.draftSel;
      if (input.wasPressed('left')) { sel = (sel + n - 1) % n; changed = true; }
      if (input.wasPressed('right')) { sel = (sel + 1) % n; changed = true; }
      if (changed) { SFC.Audio.menu(); this.setDraftSel(sel); }
      let pick = numKey();
      if (input.wasPressed('confirm')) pick = this.draftSel;
      if (pick >= 0 && pick < n) this.pick(game, pick);
      else if (input.wasPressed('reroll') && SFC_CONFIG.cores.draft.rerollsPerRound) this.doAct('reroll');
    },

    playPickAnim(game, i, onDone) {
      const d = game.draft;
      if (!d) return onDone();
      const id = (d.options[game.me] || [])[i];
      if (!id) return onDone();
      const c = CORES().list[id], rar = RARITY(c.rarity);
      const cardEl = this.el.draft.querySelector(`.card[data-pick="${i}"]`);
      if (!cardEl) return onDone();

      // 1. Tìm ô đích trong khối vuông YOUR BUILD và tính toạ độ trước khi biến đổi
      const targetSlot = (c.role === 'ult' ? this.el.draft.querySelector('.d-slot.ult') : null)
        || this.el.draft.querySelector('.draft-square .d-slot.target')
        || this.el.draft.querySelector('.draft-square .d-slot.empty')
        || this.el.draft.querySelector('.d-slot.ult');

      if (targetSlot) {
        const stage = document.getElementById('stage') || this.el.stage || this.el.draft;
        const getStageBox = (el) => {
          const sRect = stage.getBoundingClientRect(), eRect = el.getBoundingClientRect();
          const scale = sRect.width / stage.offsetWidth;
          return {
            x: (eRect.left - sRect.left) / scale,
            y: (eRect.top - sRect.top) / scale,
            w: eRect.width / scale,
            h: eRect.height / scale,
          };
        };

        const cardBox = getStageBox(cardEl);
        const slotBox = getStageBox(targetSlot);
        const dx = (slotBox.x + slotBox.w / 2) - (cardBox.x + cardBox.w / 2);
        const dy = (slotBox.y + slotBox.h / 2) - (cardBox.y + cardBox.h / 2);
        const tarScale = slotBox.w / cardBox.w;

        cardEl.style.setProperty('--dx', `${dx.toFixed(1)}px`);
        cardEl.style.setProperty('--dy', `${dy.toFixed(1)}px`);
        cardEl.style.setProperty('--tar-scale', tarScale.toFixed(4));
      }

      // 2. Phóng to lá được chọn theo màu độ hiếm, làm mờ các lá còn lại
      this.el.draft.querySelectorAll('.card[data-pick]').forEach((card, idx) => {
        if (idx === i) card.classList.add('picked-hero');
        else card.classList.add('dimmed');
      });

      // 3. Âm thanh chọn
      SFC.Audio.pick();

      // nhịp: config/motion.config.js draft (motion review 2026-11-06, phương án A: cả chuỗi 0.85s, trước đây 1.53s)
      const M = SFC_CONFIG.motion.draft;
      // ô đích đầy (chạy hết, hoặc bấm bỏ qua: skipDraftAnim tới thẳng trạng thái cuối)
      this.draftFill = () => {
        if (!targetSlot || targetSlot.classList.contains('filled')) return;
        cardEl.style.visibility = 'hidden';
        targetSlot.classList.remove('empty', 'target');
        targetSlot.classList.add('filled');
        targetSlot.style.setProperty('--c', ARCH(c.tags[0]).color);
        targetSlot.innerHTML = PX().core(id, 'sm');
      };
      if (targetSlot) {
        // lá vừa chọn nhấc lên một chút rồi chính lá đó thu nhỏ bay vào ô build (không clone)
        this.draftAnimTimerFly = setTimeout(() => {
          cardEl.classList.add('flying-card');
          // chạm ô đích: ô loé sáng và hiện Core mới
          this.draftAnimTimer = setTimeout(() => {
            this.draftFill();
            targetSlot.classList.add('impact');
            SFC.Audio.upgrade();
            this.draftImpactTimer = setTimeout(() => targetSlot.classList.remove('impact'), 250);
          }, (M.slot - M.fly) * 1000);
        }, M.fly * 1000);
      }

      // 4. xong -> commit + khối build bay xuống thanh kỹ năng
      this.draftAnimTimerEnd = setTimeout(() => {
        this.draftAnimActive = false;
        onDone();
      }, M.end * 1000);
    },

    skipDraftAnim() {
      if (this.draftAnimActive) {
        this.draftAnimActive = false;
        clearTimeout(this.draftAnimTimerFly);
        clearTimeout(this.draftAnimTimer);
        clearTimeout(this.draftImpactTimer);
        clearTimeout(this.draftAnimTimerEnd);
        // bấm 1 lần = trạng thái cuối (motion review 2026-11-06): ô đầy luôn, khối build không bay (morph bắt đầu ở tick sau, khi lượt
        // chọn được ghi nhận -> draftSkipMorph cho morphDraftToAbar biết mà bỏ qua)
        if (this.draftFill) this.draftFill();
        this.draftSkipMorph = performance.now();
        const card = this.el.draft.querySelector('.card.picked-hero, .card.flying-card');
        if (card) {
          card.classList.remove('flying-card');
          card.style.visibility = 'hidden';
        }
        const impactSlot = this.el.draft.querySelector('.d-slot.impact');
        if (impactSlot) impactSlot.classList.remove('impact');
        const done = this.draftAnimDone;
        this.draftAnimDone = null;
        if (done) done();
      }
      if (this.draftMorphActive) {
        clearTimeout(this.draftMorphTimer);
        const done = this.draftMorphDone;
        this.draftMorphActive = false;
        this.draftMorphDone = null;
        const morphEl = document.querySelector('.morphing-square');
        if (morphEl) morphEl.remove();
        this.el.draft.classList.remove('draft-fade-out');
        const draftSquare = this.el.draft.querySelector('.draft-square');
        if (draftSquare) draftSquare.style.visibility = '';
        if (done) done();
      }
    },

    // lá vừa chọn đạt công thức Tuyệt kỹ -> diễn RecipeFx trước rồi mới gửi lượt chọn
    // (online: chỉ diễn khi đồng hồ chọn còn đủ giờ, không thì gửi luôn — banner NEW ULTIMATE vẫn báo)
    pick(game, i) {
      const d = game.draft;
      if (!d || d.picked[game.me] || SFC.RecipeFx.active || this.draftAnimActive || this.draftMorphActive || this.draftLocked()) return;
      const id = (d.options[game.me] || [])[i], mp = game.cores.seatOwner(game.me);
      const rc = id && mp && game.cores.recipesOn() ? game.cores.bestRecipe(mp, id) : null;
      this.draftSel = i;
      this.setDraftSel(i);

      const proceed = () => {
        if (rc && !(d.limit > 0 && d.t < 4)) {
          SFC.RecipeFx.play(game, mp, id, rc, () => { if (this.app.game === game) this.commitPick(game, i); });
          return;
        }
        this.commitPick(game, i);
      };

      this.draftAnimActive = true;
      this.draftAnimDone = proceed;
      this.playPickAnim(game, i, () => {
        this.draftAnimActive = false;
        this.draftAnimDone = null;
        proceed();
      });
    },

    commitPick(game, i) {
      if (!game.draft || game.draft.picked[game.me]) return;
      this.draftSel = i;
      this.app.pickCore(i);
      // chọn xong (kể cả Co-op / PvP còn người khác đang chọn): đóng màn chọn, khối YOUR BUILD bay về abar.
      // Trận vẫn dừng ở 'draft' tới khi mọi người chọn xong; trong lúc đó updateHud hiện chữ chờ giữa màn (draftWaitView)
      if (this.current === 'draft' && !this.draftMorphActive && !this.freshDraft(game)) this.closeDraft(game);
    },

    // đang có lượt chọn mới mà mình chưa chọn (chơi đơn: chọn xong lượt này thì lượt kế mở luôn)
    freshDraft(game) { return game.state === 'draft' && !!game.draft && !game.draft.picked[game.me]; },
    // đóng màn chọn: khối YOUR BUILD bay về abar rồi ẩn — trừ khi lượt mới đã mở trong lúc bay
    closeDraft(game) { this.morphDraftToAbar(game, () => { if (!this.freshDraft(game)) this.show(null); }); },

    // thanh giờ chọn Core: rút theo d.t / d.limit (khách online: d.t theo snapshot, net/sync.js), đỏ + nhấp nháy ở mấy giây cuối
    // (net.draftTimeWarn). Gọi lúc vẽ màn chọn và mỗi khung qua draftWaitView; chỉ đổi style khi giá trị đổi, không vẽ lại lá bài
    draftClockView(game) {
      const el = this.draftClock, d = game && game.draft;
      if (!el || !el.isConnected || !d || !(d.limit > 0)) return;
      const k = Math.round(Math.max(0, Math.min(1, d.t / d.limit)) * 1000);
      if (k === this.draftClockK) return;
      this.draftClockK = k;
      el.style.setProperty('--k', (k / 1000).toFixed(3));
      el.classList.toggle('warn', d.t <= (SFC_CONFIG.net.draftTimeWarn || 0));
    },

    // chữ "đang chờ người khác chọn" giữa màn: mình đã chọn, lượt chọn chưa xong, màn chọn đã đóng (gọi mỗi khung từ updateHud)
    draftWaitView(game) {
      this.draftClockView(game);
      const d = game.draft;
      const on = game.state === 'draft' && !!d && !!d.picked[game.me] && !this.current && !this.draftMorphActive;
      let el = this.el.draftWait;
      if (!el) {
        if (!on) return;
        el = this.el.draftWait = document.createElement('div');
        el.id = 'draftwait';
        this.el.draft.insertAdjacentElement('afterend', el);
      }
      el.classList.toggle('hidden', !on);
      if (!on) return;
      // cùng chữ với dòng chờ cũ trên màn chọn (không lộ đối thủ là người hay AI ở trận xếp hạng)
      const text = game.seats.length > 2 || game.humans.length < 2 ? _t('Picked · waiting for other players...') : _t('Picked · waiting for opponent...');
      const key = `${text}#${d.limit > 0 ? Math.ceil(Math.max(0, d.t)) : ''}`;
      if (el.dataset.key === key) return;
      el.dataset.key = key;
      el.innerHTML = `<span>${esc(text)}</span>${d.limit > 0 ? `<b>${Math.ceil(Math.max(0, d.t))}s</b>` : ''}`;
    },

    // biến hình khối vuông YOUR BUILD 2x2 từ draft bay vào thanh trạng thái abar ở đáy màn hình
    morphDraftToAbar(game, onDone) {
      const stage = document.getElementById('stage') || this.el.stage;
      const draftSquare = this.el.draft.querySelector('.draft-square');
      const abar = this.el.abar;
      if (!stage || !draftSquare || !abar || !game || !game.controlled) return onDone();

      this.updateBar(game);
      abar.classList.remove('hidden');

      const abarItems = abar.querySelector('.ab-items');
      if (!abarItems) return onDone();
      // vừa bấm bỏ anim chọn lá: không bay nữa, đóng luôn
      const skip = this.draftSkipMorph && performance.now() - this.draftSkipMorph < 1000;
      this.draftSkipMorph = 0;
      if (skip) return onDone();

      const getStageBox = (el) => {
        const sRect = stage.getBoundingClientRect(), eRect = el.getBoundingClientRect();
        const scale = sRect.width / stage.offsetWidth;
        return {
          x: (eRect.left - sRect.left) / scale,
          y: (eRect.top - sRect.top) / scale,
          w: eRect.width / scale,
          h: eRect.height / scale,
        };
      };

      const dBox = getStageBox(draftSquare);
      const aBox = getStageBox(abarItems);

      const morphEl = draftSquare.cloneNode(true);
      morphEl.className = 'draft-square morphing-square';
      morphEl.style.left = `${dBox.x.toFixed(1)}px`;
      morphEl.style.top = `${dBox.y.toFixed(1)}px`;
      morphEl.style.width = `${dBox.w.toFixed(1)}px`;
      morphEl.style.height = `${dBox.h.toFixed(1)}px`;
      morphEl.style.transformOrigin = 'top left';

      const dx = (aBox.x - dBox.x).toFixed(1);
      const dy = (aBox.y - dBox.y).toFixed(1);
      const mScale = (aBox.w / dBox.w).toFixed(4);

      morphEl.style.setProperty('--mex', `${dx}px`);
      morphEl.style.setProperty('--mey', `${dy}px`);
      morphEl.style.setProperty('--mscale', mScale);

      stage.appendChild(morphEl);
      draftSquare.style.visibility = 'hidden';
      this.el.draft.classList.add('draft-fade-out');

      let cleaned = false;
      const finish = () => {
        if (cleaned) return;
        cleaned = true;
        clearTimeout(this.draftMorphTimer);
        morphEl.remove();
        draftSquare.style.visibility = '';
        this.el.draft.classList.remove('draft-fade-out');
        this.draftMorphActive = false;
        this.draftMorphDone = null;

        abarItems.classList.remove('landing-pulse');
        void abarItems.offsetWidth;
        abarItems.classList.add('landing-pulse');
        setTimeout(() => abarItems.classList.remove('landing-pulse'), 400);

        onDone();
      };

      this.draftMorphActive = true;
      this.draftMorphDone = finish;
      this.draftMorphTimer = setTimeout(finish, SFC_CONFIG.motion.draft.morph * 1000);
    },

    // vừa mở lượt chọn / màn chọn vừa hiện lại (UI.show): phím chọn, đổi bài và click lá chưa có tác dụng trong
    // cores.draft.inputGrace giây -> bấm liên tục cho qua ăn mừng bàn thắng không tự lấy lá 1 khi chưa kịp nhìn
    draftArm() { this.draftOpenAt = performance.now(); },
    draftLocked() { return performance.now() - (this.draftOpenAt || 0) < (SFC_CONFIG.cores.draft.inputGrace || 0) * 1000; },

    // sự kiện trận liên quan màn chọn (UI.consume gọi): draft = mở lượt mới · draftWait = có người chọn / đổi bài · corePicked = lượt xong
    // overlay = đang mở Pause (lượt mới vẫn vẽ sẵn nhưng chưa hiện)
    draftEvent(game, e, evs, overlay) {
      if (e.type === 'draft') {
        this.draftSel = 0;
        this.draftArm();
        this.el.draft.classList.remove('draft-fade-out');
        const draftSquare = this.el.draft.querySelector('.draft-square');
        if (draftSquare) draftSquare.style.visibility = '';
        this.renderDraft(game, true);
        if (!overlay) this.show('draft');
      }
      // người khác chọn / đổi bài: không vẽ lại màn chọn của mình (vẽ lại = lá bài lật lại từ đầu).
      // Chỉ lượt của chính mình: đổi bài -> vẽ 3 lá mới · bị chọn hộ khi hết giờ -> đóng màn chọn như tự chọn
      if (e.type === 'draftWait' && game.draft && e.seat == game.me && this.current === 'draft' && !this.draftAnimActive && !this.draftMorphActive) {
        if (!game.draft.picked[game.me]) this.renderDraft(game, true);   // đổi bài: lá mới lật vào
        else this.closeDraft(game);
      }
      if (e.type === 'corePicked') {
        // Còn lượt chọn tiếp theo (tích nhiều lượt / trước FINAL PUSH) -> không đóng draft hay morph về abar
        const hasMoreDraft = game.state === 'draft' || !!game.draft || evs.some((x) => x.type === 'draft') || (typeof game.draftPending === 'function' && game.draftPending() > 0);
        if (!hasMoreDraft && this.current === 'draft' && !this.draftMorphActive) this.closeDraft(game);
      }
    },
  });
})();
