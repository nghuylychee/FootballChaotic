/* Màn kết quả — gắn vào SFC.UI (ui/matchui.js): Beat 1 ăn mừng trên sân -> Beat 2 bảng tỉ số + thưởng XP / gold / Elo,
 * mở thẻ (ui/reveal.js) / bài tập (ui/drill.js), nút sau trận (doAct)
 */
window.SFC = window.SFC || {};

(function () {
  const { $, esc, CORES, PX, coreChip } = SFC.UIHelpers;
  const _t = SFC.t, _tn = SFC.tn;   // dịch theo ngôn ngữ đang chọn (engine/i18n.js)

  Object.assign(SFC.UI, {
    /* ================= END (2 NHỊP: BEAT 1 ĂN MỪNG TRÊN SÂN → BEAT 2 BẢNG TỈ SỐ + TIẾN ĐỘ) ================= */
    endItems() {
      if (!this.roomMatch) {
        const mp = this.app.game && this.app.game.opts.mainPath;
        // thẻ drill bấm LATER: mở lại ở INVENTORY (không có nút ở đây)
        // bản DEMO hết Area đá được: restart -> màn WISHLIST (app.startMainPath)
        // trận Main Path: chỉ 1 nút về phòng chờ (bản DEMO hết Area: CONTINUE -> màn WISHLIST)
        // FOOTBALL STORY: 1 nút về màn cup (vòng kế / bị loại / vô địch)
        if (this.app.game && this.app.game.opts.cup) return [['cup', _t('CONTINUE')]];
        return mp ? (SFC.MainPath.demoOver() ? [['restart', _t('CONTINUE')]] : [['menu', _t('LOBBY')]]) : [['restart', _t('PLAY AGAIN')], ['menu', _t('MAIN MENU')]];
      }
      return SFC.Session.isOwner ? [['lobby', _t('BACK TO LOBBY')], ['leave', _t('LEAVE ROOM')]] : [['leave', _t('LEAVE ROOM')]];
    },

    // tổng hợp thống kê trận: xếp hạng cầu thủ theo Bàn thắng → Kiến tạo → Cứu thua → Sút và chọn 1 MVP duy nhất
    matchSummary(game) {
      const t0 = game.teams[0], t1 = game.teams[1];
      const win = t0.score > t1.score ? 0 : t1.score > t0.score ? 1 : -1;
      const msOf = (p) => p.mstats || { goals: 0, assists: 0, saves: 0, shots: 0 };
      const cmp = (a, b) => {
        const ma = msOf(a), mb = msOf(b);
        return (mb.goals - ma.goals) || (mb.assists - ma.assists) || (mb.saves - ma.saves) || (mb.shots - ma.shots);
      };
      const pool = (win >= 0 ? game.teams[win].players : game.players).slice().sort(cmp);
      const top = pool[0], tms = top && msOf(top);
      const mvp = top && (win >= 0 || (tms.goals + tms.assists + tms.saves + tms.shots > 0)) ? top : null;
      return { win, mvp, msOf, cmp };
    },

    // Beat 1: giữ nguyên sân + rung màn hình sau tiếng còi mãn cuộc — đội thắng ăn mừng tại chỗ, đội thua quỳ gối thất vọng
    beginOutro(game) {
      clearTimeout(this.outroTimer);
      if (!game.players.some((p) => p.celId) && SFC.Celebrate) SFC.Celebrate.startEnd(game);
      this.outroActive = true;
      this.outroAt = performance.now();
      this.clearToasts();
      const dur = (SFC_CONFIG.game.match && SFC_CONFIG.game.match.outroDuration) || 3.0;
      this.renderOutro(game, dur);
      this.show('end');
      this.el.end.classList.add('outro');
      this.outroTimer = setTimeout(() => this.finishOutro(), dur * 1000);
    },

    renderOutro(game, dur) {
      const { win } = this.matchSummary(game);
      const t0 = game.teams[0], t1 = game.teams[1];
      const wt = win >= 0 ? game.teams[win] : null;
      const h = game.humanTeam;
      const resLabel = h < 0 ? (wt ? _t('WINNER') : _t('DRAW'))
        : win === h ? _t('VICTORY!') : win >= 0 ? _t('DEFEAT...') : _t('DRAW');
      const resCls = h < 0 ? (wt ? 'win' : 'draw') : win === h ? 'win' : win >= 0 ? 'lose' : 'draw';
      const devBar = SFC_DEBUG && this._devEndMode ? this.devEndBar('outro') : '';
      this.el.end.innerHTML = `
        ${devBar}
        <div class="outro-top ${resCls}" style="--c:${wt ? wt.cfg.kit.shirt : '#fff'}">
          <div class="ot-res">${esc(resLabel)}</div>
          <div class="ot-sub">
            ${wt ? `<span class="ot-win">${esc(_t('WINNER'))}</span><b style="color:${wt.cfg.kit.shirt}">${esc(wt.cfg.name)}</b>` : `<b>${esc(_t('DRAW'))}</b>`}
            <span class="ot-score">${t0.score} - ${t1.score}</span>
          </div>
        </div>
        <div class="outro-foot"><div class="outro-bar" style="--dur:${dur}s"></div></div>`;
    },

    finishOutro() {
      if (!this.outroActive) return;
      clearTimeout(this.outroTimer);
      this.outroActive = false;
      this.el.end.classList.remove('outro');
      const g = this.app.game;
      if (g && g.state === 'ended') {
        this.renderEnd(g);
        this.show('end');
      }
    },

    // Beat 2: Trái = Tiến độ xếp hạng & Thưởng XP · Phải = Bảng tỉ số 2 đội (tối đa 5 Core/Ult + 4 cột GOALS, ASSISTS, SAVES, SHOTS)
    renderEnd(game) {
      const h = game.humanTeam >= 0 ? game.humanTeam : 0;
      const me = game.teams[h], op = game.teams[1 - h];
      const res = me.score > op.score ? [_t('VICTORY!'), 'win'] : me.score < op.score ? [_t('DEFEAT...'), 'lose'] : [_t('DRAW'), 'draw'];
      const { win, mvp, msOf, cmp } = this.matchSummary(game);
      // đội thắng xếp trên (kiểu Rocket League); nếu hoà thì đội của bạn xếp trên
      const orderedTeams = win >= 0 ? [game.teams[win], game.teams[1 - win]] : [me, op];
      const teamBlock = (t, ti) => {
        const isWin = win === t.index, isMine = t.index === game.humanTeam;
        const rows = t.players.slice().sort(cmp).map((q) => {
          const rawIds = game.cores.coresOf(q), mine = q === game.controlled;
          const ids = rawIds.filter((id) => CORES().list[id].role !== 'ult').concat(rawIds.filter((id) => CORES().list[id].role === 'ult'));
          const ms = msOf(q);
          const chips = ids.length ? ids.map((id) => `<span class="b-chip">${coreChip(id)}</span>`).join('') : `<em class="sb-nocore">—</em>`;
          const badge = q === mvp ? `<span class="sb-badge mvp">${PX().ui('star', 'sm')}${esc(_t('MVP'))}</span>` : '';
          return `<div class="sb-row ${mine ? 'me' : ''} ${q === mvp ? 'is-mvp' : ''}">
            <div class="sb-who">
              <canvas class="sb-por" width="18" height="18" data-pid="${q.id}"></canvas>
              <b class="sb-name">${esc(q.name)}</b>
              ${mine ? `<em class="sb-you">${esc(_t('YOU'))}</em>` : ''}
              ${badge}
            </div>
            <div class="sb-cores">${chips}</div>
            <span class="sb-c">${ms.goals}</span>
            <span class="sb-c">${ms.assists}</span>
            <span class="sb-c">${ms.saves}</span>
            <span class="sb-c">${ms.shots}</span>
          </div>`;
        }).join('');
        return `<div class="sb-team ${isWin ? 'winner' : ''}" style="--c:${t.cfg.kit.shirt}">
          <div class="sb-thead">
            <div class="sb-tleft">
              <i class="sb-swatch"></i>
              <b class="sb-tname">${esc(t.cfg.name)}</b>
              ${isMine ? `<span class="sb-mtag">${esc(_t('YOUR TEAM'))}</span>` : ''}
              <b class="sb-tscore">${t.score}</b>
            </div>
            <div class="sb-cols">
              ${ti === 0 ? `<span>${esc(_t('GOALS'))}</span><span>${esc(_t('ASSISTS'))}</span><span>${esc(_t('SAVES'))}</span><span>${esc(_t('SHOTS'))}</span>` : `<span></span><span></span><span></span><span></span>`}
            </div>
          </div>
          <div class="sb-rows">${rows}</div>
        </div>`;
      };
      const note = this.roomMatch && !SFC.Session.isOwner ? `<div class="end-note">${esc(_t('Waiting for the host to return to the lobby...'))}</div>` : '';
      const t0 = game.teams[0], t1 = game.teams[1];
      const devBar = SFC_DEBUG && this._devEndMode ? this.devEndBar(this._devEndMode) : '';
      clearTimeout(this.sbTimer);
      this.rwSkip = false;
      this.rwDone = !game.reward;
      this.rwFocus = !!game.reward;
      this.el.end.classList.remove('outro', 'sb-shown');
      this.el.end.classList.toggle('rw-focus', this.rwFocus);
      this.el.end.innerHTML = `
        ${devBar}
        <div class="end-head">
          <div class="end-title ${res[1]}">${esc(res[0])}</div>
          <div class="end-score"><span style="color:${t0.cfg.kit.shirt}">${esc(t0.cfg.name)}</span> <b>${t0.score} - ${t1.score}</b> <span style="color:${t1.cfg.kit.shirt}">${esc(t1.cfg.name)}</span></div>
        </div>
        <div class="end-body ${game.reward ? 'has-rw' : 'only-sb'}">
          ${game.reward ? `<div class="end-left">${this.rewardPanel(game.reward)}</div>` : ''}
          <div class="sb-wrap">${orderedTeams.map((t, i) => teamBlock(t, i)).join('')}</div>
        </div>
        <div class="end-act">${note}<div class="pause-items row-items" id="end-items"></div></div>`;
      this.el.end.querySelectorAll('canvas.sb-por[data-pid]').forEach((cv) => {
        const p = game.players.find((q) => q.id === +cv.dataset.pid);
        if (p) this.drawPortrait(cv, p, game);
      });
      this.renderEndItems();
      SFC.CorePreview.scan(this.el.end);
      // Main Path: Core / hộp mới -> màn mở thẻ sau khi thưởng chạy xong (Enter trước đó thì mở ngay)
      const unlocks = game.reward && game.reward.path ? game.reward.path.rewards.filter((x) => x.kind !== 'gold') : [];
      this.pendingReveal = unlocks.length ? unlocks : null;
      this.drillAfter = null;   // vừa lên level (chơi đơn): { earned, from, to } -> màn LEVEL UP của DRILL sau thưởng + sau màn mở thẻ (autoDrill)
      if (game.reward) this.playReward(game.reward);
    },

    // xong toàn bộ diễn tiến độ ở giữa màn hình (và đóng xong mở thẻ / drill nếu có) -> trượt cột tiến độ sang trái + hiện bảng tỉ số bên phải
    revealScoreboard() {
      clearTimeout(this.sbTimer);
      if (!this.rwFocus) return;
      if (this.pendingReveal || SFC.Reveal.active || this.drillAfter || SFC.Drill.active) return;
      this.rwFocus = false;
      this.el.end.classList.remove('rw-focus');
      this.el.end.classList.add('sb-shown');
      if (SFC.Audio && SFC.Audio.whoosh) SFC.Audio.whoosh();
      this.showEndItems();
    },

    openReveal() {
      const list = this.pendingReveal;
      this.pendingReveal = null;
      clearTimeout(this.revealTimer);
      if (list) {
        SFC.Reveal.open(list, () => {
          this.renderEndItems();
          this.autoDrill();
          if (!this.drillAfter && !SFC.Drill.active) this.sbTimer = setTimeout(() => this.revealScoreboard(), 220);
        });
      }
    },

    // màn LEVEL UP (thẻ drill vừa nhận: OPEN NOW / LATER) tự mở sau khi thưởng chạy xong;
    // có màn mở thẻ (Main Path) thì đợi nó đóng rồi mới mở (không chồng 2 lớp phủ)
    autoDrill() {
      const notice = this.drillAfter;
      if (!notice || this.pendingReveal || SFC.Reveal.active) return;
      this.drillAfter = null;
      setTimeout(() => {
        const g = this.app.game;
        if (this.current === 'end' && g && g.state === 'ended' && !SFC.Drill.active && !SFC.Reveal.active) this.openDrill(notice);
        else this.revealScoreboard();
      }, 400);
    },

    renderEndItems() {
      const el = document.getElementById('end-items');
      this.endSel = Math.min(this.endSel, this.endItems().length - 1);
      if (el) el.innerHTML = this.endItems().map(([k, l], i) => `<button class="${i === this.endSel ? 'sel' : ''}" data-act="${k}">${esc(l)}</button>`).join('');
      this.showEndItems();
    },

    // màn kết quả cao hơn khung 360 (hiếm): cuộn để nút đang chọn luôn nhìn thấy.
    // Chỉ cuộn #end — scrollIntoView cuộn cả #stage / body làm lệch khung game
    showEndItems() {
      const box = this.el.end, b = box.querySelector('#end-items .sel');
      if (!b) return;
      let top = 0;
      for (let n = b; n && n !== box; n = n.offsetParent) top += n.offsetTop;
      if (top < box.scrollTop) box.scrollTop = top - 2;
      else if (top + b.offsetHeight > box.scrollTop + box.clientHeight) box.scrollTop = top + b.offsetHeight - box.clientHeight + 2;
    },

    /* ---------- thưởng sau trận: cột trái (Xếp hạng Area + Thưởng & XP) ---------- */
    rewardPanel(r) {
      const lines = r.lines.map((l, i) => `<div class="rw-line" data-rw="${i}"><span>${esc(l.label)}</span>${
        l.mult || l.note ? '' : `<b class="x">+${l.xp} XP</b><b class="g"><i class="coin"></i>+${l.gold}</b>`}</div>`).join('');
      return `${r.path ? this.pathResult(r.path) : ''}
        <div class="build reward">
          <h4>${esc(_t('REWARDS'))}</h4>
          <div class="rw-lines">${lines}</div>
          <div class="rw-total"><span class="gold"><i class="coin"></i><b id="rw-gold">+0</b></span><b id="rw-xp" class="x">+0 XP</b></div>
          <div class="lvrow"><span class="lv" id="rw-lv">${esc(_t('LV {n}', { n: r.before.level }))}</span><div class="xpbar"><i id="rw-bar"></i></div></div>
          <div class="rw-up" id="rw-up"></div>
        </div>`;
    },

    // Main Path sau trận: Elo +/- (đếm lên ở playReward), thanh tiến độ tới Area kế + huy hiệu LÊN / RỚT AREA nổi bật
    pathResult(p) {
      const MP = SFC.MainPath, a = p.after, A = MP.area(a.area), prevA = MP.area(p.before.area), next = MP.area(a.area + 1);
      const pct = (elo) => Math.round(Math.max(0, Math.min(1, MP.frac(elo, a.area))) * 100);
      const isUp = p.event === 'up', isDown = p.event === 'down';
      const stamp = isDown
        ? `<div class="rp-stamp down">▼ ${esc(_t('DEMOTED TO {area}', { area: A.name }))}</div>`
        : isUp
          ? `<div class="rp-stamp up">▲ ${esc(p.first ? _t('NEW AREA UNLOCKED: {area}', { area: A.name }) : _t('PROMOTED TO {area}', { area: A.name }))}</div>`
          : '';
      const msg = isUp
        ? (MP.demoLocked(a.area) ? (SFC_CONFIG.demo.steamUrl ? _t('DEMO COMPLETE · WISHLIST ON STEAM!') : _t('DEMO COMPLETE · COMING SOON TO STEAM!'))
          : `${prevA.name} → ${A.name}`)
        : isDown ? `${prevA.name} → ${A.name}`
        : next ? _t('{n} to {area}', { n: '{stars}', area: MP.demoLocked(a.area + 1) || a.area + 1 > MP.state.best ? '???' : next.name }) : _t('TOP AREA');
      const sign = p.delta > 0 ? '+' : '';
      // thanh: vị trí cũ (mờ) -> vị trí mới; đổi Area thì chỉ vẽ vị trí mới
      const from = p.before.area === a.area ? pct(p.before.elo) : pct(a.elo);
      return `<div class="rw-path ${isUp ? 'promoted big' : ''} ${isDown ? 'demoted' : ''} ${p.delta < 0 ? 'bad' : ''}" style="--ac:${A.color}">
        ${stamp}
        <div class="rp-top">
          <div class="rp-div">${PX().area(A.id, 'sm')} <span>${esc(A.name)}</span></div>
          <div class="rp-row">${PX().ui('star')}<b class="rp-elo" data-elo-from="${p.before.elo}" data-elo-to="${a.elo}">${p.before.elo}</b><span class="rp-delta">${sign}${p.delta}</span></div>
        </div>
        <div class="rp-bar"><i class="was" style="width:${from}%"></i><i class="now" style="width:${pct(a.elo)}%"></i></div>
        <div class="rp-msg">${esc(msg).replace('{stars}', next ? PX().elo(next.elo - a.elo) : '')}</div>
      </div>`;
    },

    playReward(r) {
      cancelAnimationFrame(this.rwRaf);
      const $$ = (id) => document.getElementById(id);
      const t0 = performance.now();
      const nLines = r.lines.length;
      const LINE = 0.24, COUNT = 1.0;
      const startCount = 0.25 + nLines * LINE;
      // âm báo lên / rớt Area ngay khi bảng hiện ra để người chơi không thể bỏ lỡ
      if (r.path && r.path.event === 'down' && SFC.Audio && SFC.Audio.buzz) SFC.Audio.buzz();
      else if (r.path && r.path.event === 'up' && SFC.Audio && SFC.Audio.upgrade) SFC.Audio.upgrade();
      // quãng XP phải chạy: tính theo "level thập phân" để thanh chạy qua từng level
      const need = (lv) => SFC.Profile.xpToNext(lv);
      const from = r.before.level + (r.before.need === Infinity ? 0 : r.before.xp / r.before.need);
      const to = r.after.level + (r.after.need === Infinity ? 0 : r.after.xp / r.after.need);
      let shownLv = r.before.level;
      const step = (now) => {
        const t = this.rwSkip ? 999 : (now - t0) / 1000;
        for (let i = 0; i < nLines; i++) {
          const el = document.querySelector(`[data-rw="${i}"]`);
          if (el && t > 0.25 + i * LINE && !el.classList.contains('in')) { el.classList.add('in'); if (!this.rwSkip) SFC.Audio.menu(); }
        }
        const k = Math.max(0, Math.min(1, (t - startCount) / COUNT));
        const e = 1 - (1 - k) * (1 - k);
        const gold = $$('rw-gold'), xp = $$('rw-xp'), bar = $$('rw-bar'), lv = $$('rw-lv'), up = $$('rw-up');
        if (!gold) return; // đã rời màn kết quả
        gold.textContent = '+' + Math.round((r.gold + (k >= 1 ? r.levelGold : 0)) * e);
        const elo = document.querySelector('[data-elo-to]');
        if (elo) elo.textContent = Math.round(+elo.dataset.eloFrom + (+elo.dataset.eloTo - +elo.dataset.eloFrom) * e);
        xp.textContent = '+' + Math.round(r.xp * e) + ' XP';
        const cur = from + (to - from) * e;
        const level = Math.min(Math.floor(cur), r.after.level);
        bar.style.width = (need(level) === Infinity ? 100 : (cur - level) * 100) + '%';
        if (level > shownLv) {
          shownLv = level;
          lv.textContent = _t('LV {n}', { n: level });
          up.innerHTML = `<b class="lvup">${esc(_t('LEVEL UP! LV {n}', { n: level }))}</b><span class="gold"><i class="coin"></i>+${SFC_CONFIG.progression.levelUpGold}</span>`;
          up.classList.remove('pop'); void up.offsetWidth; up.classList.add('pop');
          SFC.Audio.upgrade();
        }
        if (k >= 1) {
          this.rwDone = true;
          if (this.pendingReveal && !this.revealTimer) this.revealTimer = setTimeout(() => { this.revealTimer = null; this.openReveal(); }, 450);
          if (!up.dataset.done) {
            up.dataset.done = 1;
            if (r.eligible.length) up.insertAdjacentHTML('beforeend', `<div class="rw-new">${esc(_t('Unlocked: {list}', { list: r.eligible.join(', ') }))}</div>`);
            // lên level: thẻ drill vừa nhận (chỉ khi không có dòng Unlocked, giữ khung thưởng tối đa 2 dòng)
            const gained = SFC.Profile.statsHidden() ? 0 : r.levelUps.length * SFC_CONFIG.progression.attrs.drills.perLevel;   // hệ chỉ số ẩn: không báo thẻ drill
            const where = this.roomMatch ? ' · ' + _t('open in INVENTORY') : '';
            if (!r.eligible.length && gained > 0) up.insertAdjacentHTML('beforeend', `<div class="rw-new pts">${esc(_tn('★ +{n} DRILL CARD', '★ +{n} DRILL CARDS', gained) + where)}</div>`);
            // chạm trần level theo Main Path: XP vẫn tích, lên hạng là lên level
            else if (!r.eligible.length && r.capped) up.insertAdjacentHTML('beforeend', `<div class="rw-new">${esc(_t('LV CAP · win RANKED matches to raise it (XP is saved)'))}</div>`);
            this.showEndItems();   // dòng thưởng vừa thêm có thể đẩy nút xuống
            // chơi đơn: vừa lên level -> tự mở màn LEVEL UP của DRILL (online tự xử lý phím -> chỉ tích thẻ, mở ở INVENTORY)
            this.drillAfter = !this.roomMatch && gained > 0 ? { earned: gained, from: r.before.level, to: r.after.level } : null;
            this.autoDrill();
            if (!this.pendingReveal && !this.drillAfter) {
              this.sbTimer = setTimeout(() => this.revealScoreboard(), this.rwSkip ? 60 : 420);
            }
          }
          return;
        }
        this.rwRaf = requestAnimationFrame(step);
      };
      this.rwRaf = requestAnimationFrame(step);
    },

    endInput(input) {
      // đang ở Beat 1 (ăn mừng trên sân): bấm Enter / Space / Esc (sau 0,45s) chuyển ngay sang bảng tỉ số (Beat 2)
      if (this.outroActive) {
        if (performance.now() - (this.outroAt || 0) > 450 && (input.wasPressed('confirm') || input.wasPressed('back') || input.wasPressed('shoot') || input.wasPressed('pass'))) {
          SFC.Audio.menu();
          this.finishOutro();
        }
        return;
      }
      // còn thẻ chưa mở: Enter mở luôn thay vì sang trận kế
      if (this.pendingReveal) { if (input.wasPressed('confirm')) this.openReveal(); return; }
      if (SFC_DEBUG && this._devBackup && (input.wasPressed('back') || input.wasPressed('pause'))) {
        SFC.Audio.menu();
        return this.devEndTest('back');
      }
      // đang diễn tiến độ ở giữa màn hình: bấm xác nhận để tua nhanh & trượt sang hiện bảng tỉ số
      if (this.rwFocus) {
        if (input.wasPressed('confirm') || input.wasPressed('shoot') || input.wasPressed('pass')) {
          if (!this.rwDone) this.rwSkip = true;
          else this.revealScoreboard();
        }
        return;
      }
      const n = this.endItems().length;
      if (input.wasPressed('left') || input.wasPressed('up')) { this.endSel = (this.endSel + n - 1) % n; this.renderEndItems(); }
      if (input.wasPressed('right') || input.wasPressed('down')) { this.endSel = (this.endSel + 1) % n; this.renderEndItems(); }
      if (input.wasPressed('confirm')) this.doAct(this.endItems()[this.endSel][0]);
    },

    doAct(act) {
      SFC.Audio.menu();
      if (act === 'resume') this.app.resume();
      if (act === 'restart') this.app.restart();
      if (act === 'forfeit') this.app.forfeit();
      // trận Main Path xong -> về trang Main Path
      if (act === 'menu') this.app.toMenu(this.app.game && this.app.game.opts.mainPath ? 'party' : 'home');
      if (act === 'cup') this.app.toMenu('cup');
      if (act === 'leave') SFC.Session.leave();
      if (act === 'lobby') SFC.Session.backToLobby();
      if (act === 'reroll') this.app.rerollCore();
      if (act === 'skiptut') SFC.Tutorial.skip();
      if (act === 'rfxskip') SFC.RecipeFx.skip();
    },

    // màn DRILL trên màn kết quả; notice = { earned, from, to } -> bắt đầu ở màn LEVEL UP (OPEN NOW / LATER).
    // Đóng (mở hết / LATER) -> vẽ lại nút kết quả + trượt tiến độ sang trái hiện bảng tỉ số
    openDrill(notice) {
      SFC.Drill.open(() => {
        this.renderEndItems();
        this.sbTimer = setTimeout(() => this.revealScoreboard(), 200);
      }, { notice });
    },
  });
})();
