/* HUD trong trận — gắn vào SFC.UI (ui/matchui.js): tỉ số / đồng hồ / lượt Core kế tiếp, thanh kỹ năng giữa đáy (kiểu LoL),
 * chân dung, banner giữa màn + toast góc màn
 */
window.SFC = window.SFC || {};

(function () {
  const { $, esc, CORES, PX, coreChip, traitChips, traitList, keyLabel } = SFC.UIHelpers;
  const _t = SFC.t;   // dịch theo ngôn ngữ đang chọn (engine/i18n.js)

  // Ô trên thanh kỹ năng (giữa đáy màn hình, kiểu LoL). atk = ra đòn: dùng được mọi lúc trừ khi chính mình cầm bóng
  const SLOTS = [
    { k: 'light', action: 'shoot', icon: 'fist', atk: true, max: () => SFC_CONFIG.game.combat.light.cooldown, act: ['jab'] },
    { k: 'hard', action: 'lob', icon: 'boom', atk: true, max: () => SFC_CONFIG.game.combat.hard.cooldown, act: ['windup', 'kick'] },
    { k: 'skill', action: 'skill', icon: 'dash', max: () => SFC_CONFIG.game.skill.cooldown, act: ['dash'] },
  ];
  // tooltip ô kỹ năng ('attack|HARD' = đòn mạnh, khác độ khó HARD)
  const SLOT_NAMES = () => ({ light: SFC.tc('attack', 'LIGHT'), hard: SFC.tc('attack', 'HARD'), skill: _t('DASH') });

  Object.assign(SFC.UI, {
    /* ================= HUD ================= */
    updateHud(game) {
      if (!game) return;
      this.draftWaitView(game);
      const c = this.hudCache;
      const t0 = game.teams[0], t1 = game.teams[1];
      const training = !!(game.opts && game.opts.training);
      // trận mơ PROLOGUE: có tỉ số nhưng chưa có đồng hồ tới bài cuối
      const dream = !!(game.opts && game.opts.tutorial) && !game.clockOn;
      const time = game.golden ? _t('GOLDEN') : SFC.U.fmtTime(game.remaining);
      const phase = game.golden ? _t('GOLDEN GOAL') : game.finalPush ? _t('FINAL PUSH x{n}', { n: SFC_CONFIG.game.match.finalPushGoalValue }) : '';
      const cores = game.players.map((p) => game.cores.coresOf(p).join()).join('|');
      // lượt chọn Core: đang chờ bàn thắng / còn bao lâu tới lượt kế
      const pend = game.draftPending(), next = game.draftNextIn();
      const coreLine = pend > 0 ? `<div class="hud-core on">${esc(_t('✦ CORE +{n} · waiting for a goal', { n: pend }))}</div>`
        : next != null ? `<div class="hud-core">${esc(_t('✦ Next Core in {time}', { time: SFC.U.fmtTime(next) }))}</div>` : '';
      // Main Path: Area + Elo lúc vào trận
      const mp = game.opts && game.opts.mainPath;
      const cupO = game.opts && game.opts.cup, cupS = cupO && SFC.Cup.get(cupO.id);
      const pathLine = game.opts && game.opts.tutorial ? `<div class="hud-path dream">${esc(_t('PROLOGUE · THE DREAM'))}</div>`
        : cupS ? `<div class="hud-path" style="color:${cupS.color}">${esc(cupS.name)} · ${esc(SFC.Cup.roundName(cupO.round))}</div>`
        : game.opts && game.opts.run ? this.runLine(game.opts.run)
        : !mp ? '' : `<div class="hud-path">${esc(SFC.MainPath.area(mp.area).name)} · ${PX().elo(mp.elo)}</div>`;
      const key = [t0.score, t1.score, dream ? 'dream' : time, phase, cores, coreLine, pathLine].join('#');
      if (c.key !== key) {
        c.key = key;
        // nhãn người chơi theo slot: P1..P4 (co-op: 2 nhãn cùng 1 đội); người ở máy này tô vàng, cùng đội xanh, đối thủ đỏ
        const tag = (t) => game.seats.map((s, i) => (s.team !== t || s.gone ? ''
          : ` <small class="${i === game.me ? 'me' : t === game.humanTeam ? 'ally' : 'op'}">P${i + 1}</small>`)).join('');
        this.el.hud.innerHTML = `
          <div class="hud-team l" style="--c:${t0.cfg.kit.shirt}">
            <div class="hud-name">${esc(t0.cfg.short)}${tag(0)}</div>
            ${this.hudBuild(game, 0)}
            ${this.ultMeter(game, 0)}
          </div>
          <div class="hud-mid">${pathLine}${training ? `<div class="hud-time">${esc(_t('TRAINING'))}</div>` : `
            <div class="hud-score"><b style="color:${t0.cfg.kit.shirt}">${t0.score}</b><span>-</span><b style="color:${t1.cfg.kit.shirt}">${t1.score}</b></div>
            <div class="hud-time ${game.finalPush || game.golden ? 'hot' : ''}">${esc(dream ? _t('DREAM') : time)}</div>
            ${phase ? `<div class="hud-phase">${phase}</div>` : ''}`}
            ${coreLine}
          </div>
          <div class="hud-team r" style="--c:${t1.cfg.kit.shirt}">
            <div class="hud-name">${tag(1)} ${esc(t1.cfg.short)}</div>
            ${this.hudBuild(game, 1)}
            ${this.ultMeter(game, 1)}
          </div>`;
        c.ultBars = [0, 1].map((t) => this.el.hud.querySelector(`.hud-ult[data-t="${t}"]`));
        c.ultVals = [-1, -1];
      }
      // năng lượng Tuyệt kỹ 2 đội (cập nhật mỗi khung)
      for (let t = 0; t < 2; t++) {
        const el = c.ultBars && c.ultBars[t], v = Math.round(game.cores.teamUlt(t) * 100);
        if (!el || v === c.ultVals[t]) continue;
        c.ultVals[t] = v;
        el.style.setProperty('--u', (v / 100).toFixed(2));
        el.classList.toggle('full', v >= 100);
        el.querySelector('em').textContent = v + '%';
      }
      this.updateBar(game);
      // đồng hồ chọn Core (online)
      if (game.state === 'draft' && game.draft && game.draft.limit > 0) {
        const el = document.getElementById('draft-timer');
        const s = Math.ceil(Math.max(0, game.draft.t)) + 's';
        if (el && el.textContent !== s) el.textContent = s;
      }
    },

    // GOAT PATH: dòng act · loại node dưới tỉ số
    runLine(o) {
      const A = SFC.Run.act(o.act) || {}, N = SFC.Run.node(o.kind) || {}, D = o.drill && SFC_CONFIG.run.drills[o.drill];
      return `<div class="hud-path" style="color:${A.color || '#ffe14f'}">${esc(A.name || '')} · ${esc(D ? D.name : N.name || '')}</div>`;
    },

    // build trên HUD: đội của người chơi = tiến độ công thức Tuyệt kỹ kiểu TFT của cầu thủ mình;
    // đội kia = mỗi cầu thủ 1 dòng (tên + chip trường phái)
    hudBuild(game, t) {
      const C = game.cores, own = t === game.humanTeam ? game.controlled : null;
      // đội mình: chỉ trường phái của bạn (Core đồng đội ẩn cho gọn)
      if (own) return `<div class="hud-traits tft">${traitList(game, own)}</div>`;
      return `<div class="hud-mates">${game.teams[t].players.map((q) => `<div class="hud-pl"><em>${esc(q.name)}</em>${traitChips(game, q) || '<i>—</i>'}</div>`).join('')}</div>`;
    },

    // thanh năng lượng Tuyệt kỹ nhỏ trên HUD (icon Tuyệt kỹ nếu đã có), chỉ khi đội đã có Tuyệt kỹ.
    // Đội của người chơi: không hiện (user 2026-10-17 — Tuyệt kỹ của mình đã ở ô X, của đồng đội thì không cần) -> chỉ còn thanh của đội đối thủ
    ultMeter(game, t) {
      if (t === game.humanTeam) return '';
      const id = game.cores.ultOf(t), c = id && CORES().list[id];
      if (!c) return '';
      return `<div class="hud-ult has" data-t="${t}" title="${esc(_t('{core}: Ultimate energy', { core: c.name }))}"><b>${PX().core(id, 'sm')}</b><i></i><em>0%</em></div>`;
    },

    /* ================= THANH KỸ NĂNG (giữa đáy, kiểu LoL) ================= */
    updateBar(game) {
      const el = this.el.abar, p = game.controlled;
      el.classList.toggle('hidden', !p || this.current === 'menu' || this.current === 'end');
      if (!p) return;
      const c = this.hudCache.bar || (this.hudCache.bar = {});
      const owned = game.cores.coresOf(p);
      // đổi bàn phím <-> tay cầm: vẽ lại nhãn phím trên thanh kỹ năng
      const key = p.id + '|' + owned.join() + '|' + (p.ultLv || 1) + '|' + SFC.Input.device + SFC.Pad.style;
      if (c.key !== key) {
        c.key = key;
        const kit = game.teams[p.team].cfg.kit;
        const ult = game.cores.ultOf(p), names = SLOT_NAMES(), ultName = ult ? SFC.CoreSystem.ultName(ult, p.ultLv) : '';
        // ô Core = số lượt chọn của trận (Tuyệt kỹ đã nằm ở ô X, không lặp lại ở đây)
        const cores = owned.filter((id) => CORES().list[id].role !== 'ult');
        const nItems = Math.max(SFC_CONFIG.game.match.maxUpgrades, cores.length);
        const items = [];
        for (let i = 0; i < nItems; i++) items.push(cores[i] ? coreChip(cores[i]) : '<span class="chip empty"></span>');
        el.style.setProperty('--c', kit.shirt);
        el.innerHTML = `
          <div class="ab-por"><canvas width="22" height="22"></canvas><div class="ab-name">${esc(p.name)}</div>${game.lockedPlayer(p.team) ? '' : `<kbd>${esc(keyLabel('switch'))}</kbd>`}</div>
          <div class="ab-mid">
            <div class="ab-slots">${SLOTS.map((s) => `
              <div class="ab-slot" data-k="${s.k}" title="${esc(names[s.k])}">
                <i>${PX().ui(s.icon)}</i><div class="sw"></div><b></b><kbd>${esc(keyLabel(s.action))}</kbd>
              </div>`).join('')}${ult ? `
              <div class="ab-slot ult lv${p.ultLv || 1}" data-k="ult" title="${esc(_t('ULTIMATE: {core}. Charges over time, plus extra when you concede, score, steal the ball or land punches', { core: ultName }))}">
                <div class="ult-fill"></div><i>${PX().core(ult)}</i><b class="ult-pct"></b><kbd>${esc(keyLabel('ultimate'))}</kbd>
              </div>` : ''}
            </div>
            <div class="ab-stam"><i></i></div>
          </div>
          <div class="ab-items">${items.join('')}</div>`;
        this.drawPortrait(el.querySelector('canvas'), p, game);
        c.slots = SLOTS.map((s) => {
          const node = el.querySelector(`[data-k="${s.k}"]`);
          return { s, node, sw: node.querySelector('.sw'), txt: node.querySelector('b'), last: -1, lastTxt: null, cls: '' };
        });
        c.stam = el.querySelector('.ab-stam i');
        c.lastStam = -1;
        c.ult = el.querySelector('[data-k="ult"]');
        c.lastUlt = -1;
      }
      this.updateBarExtras(game, p, c);

      // ô ra đòn chỉ mờ khi chính mình cầm bóng (đồng đội cầm bóng vẫn đánh được)
      const teamHas = game.ball.owner === p;
      for (const sl of c.slots) {
        const rem = Math.max(0, p.cd[sl.s.k] || 0);
        const frac = Math.min(1, rem / sl.s.max());
        if (Math.abs(frac - sl.last) > 0.005) sl.sw.style.setProperty('--p', frac.toFixed(3));
        const txt = rem <= 0 ? '' : rem < 1 ? rem.toFixed(1) : String(Math.ceil(rem));
        if (txt !== sl.lastTxt) sl.txt.textContent = txt;
        // hồi xong -> lóe sáng
        if (sl.last > 0 && frac <= 0) { sl.node.classList.remove('ready'); void sl.node.offsetWidth; sl.node.classList.add('ready'); }
        sl.last = frac; sl.lastTxt = txt;
        const cls = (rem > 0 ? ' cd' : '') + (sl.s.atk && teamHas ? ' off' : '') + (sl.s.act.includes(p.state) ? ' act' : '');
        if (cls !== sl.cls) {
          sl.cls = cls;
          sl.node.classList.toggle('cd', rem > 0);
          sl.node.classList.toggle('off', !!(sl.s.atk && teamHas));
          sl.node.classList.toggle('act', sl.s.act.includes(p.state));
        }
      }
      const st = Math.round((p.stamina / SFC_CONFIG.game.player.staminaMax) * 100);
      if (st !== c.lastStam) {
        c.lastStam = st;
        c.stam.style.width = st + '%';
        c.stam.classList.toggle('low', p.stamina <= SFC_CONFIG.game.player.staminaMinToSprint * 2);
      }
    },

    // thanh năng lượng Tuyệt kỹ (tài nguyên trường phái đã bỏ — docs/ULT_RECIPE.md)
    updateBarExtras(game, p, c) {
      if (c.ult) {
        // Tuyệt kỹ cần bóng (needsBall) mà đội mình không cầm bóng: ô X mờ (bấm không ra chiêu)
        const blocked = game.cores.ultBlocked(p);
        if (blocked !== c.lastBlocked) { c.lastBlocked = blocked; c.ult.classList.toggle('off', blocked); }
        const v = Math.round(game.cores.ultE(p) * 100);
        if (v !== c.lastUlt) {
          const prev = c.lastUlt;
          c.lastUlt = v;
          c.ult.style.setProperty('--u', (v / 100).toFixed(2));
          c.ult.classList.toggle('ready', v >= 100);
          c.ult.classList.toggle('full', v >= 100);
          c.ult.querySelector('.ult-pct').textContent = v >= 100 ? _t('FULL') : v + '%';   // sẵn sàng: viền vàng + rung
          // vừa được nạp: "+20%" bay lên · vừa dùng: thanh rút cạn
          // nạp theo thời gian tăng từng 1%: chỉ hiện "+x%" khi được nạp một cục (ghi bàn, cướp bóng, đấm trúng)
          if (prev >= 0 && v - prev >= 3) {
            const f = document.createElement('span');
            f.className = 'ult-gain';
            f.textContent = '+' + (v - prev) + '%';
            c.ult.appendChild(f);
            setTimeout(() => f.remove(), 1100);
            c.ult.classList.remove('gain'); void c.ult.offsetWidth; c.ult.classList.add('gain');
          } else if (prev >= 100 && v === 0) {
            c.ult.classList.remove('drain'); void c.ult.offsetWidth; c.ult.classList.add('drain');
          }
        }
      }
    },

    // chân dung pixel: vẽ lại sprite cầu thủ (đầu + vai) vào canvas nhỏ
    drawPortrait(cv, p, game) {
      const ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, cv.width, cv.height);
      SFC.Sprites.drawPlayer(ctx, {
        x: Math.round(cv.width / 2), y: cv.height + 6, vx: 0, vy: 0, facing: Math.PI / 2, anim: 0, flash: 0, state: 'normal',
        team: p.team, role: p.role, look: p.look,
      }, game);
    },

    /* ================= THÔNG BÁO ================= */
    banner(text, sub, color, dur = 1.8) {
      const el = this.el.banner;
      el.innerHTML = `<div class="b-main" style="color:${color || '#fff'}">${esc(text)}</div>${sub ? `<div class="b-sub">${esc(sub)}</div>` : ''}`;
      el.classList.remove('show');
      void el.offsetWidth;
      el.classList.add('show');
      clearTimeout(this._bt);
      this._bt = setTimeout(() => el.classList.remove('show'), dur * 1000);
    },

    ultUnlocked(game, e) {
      const mp = game.cores.seatOwner(game.me);
      if (!mp || e.pid !== mp.id || !CORES().list[e.id]) return;
      const fresh = !game.opts.tutorial && SFC.Profile.data ? SFC.Profile.discoverUlt(e.id, e.lv) : false;
      // vừa diễn RecipeFx cho đúng công thức này: không hiện banner lặp lại
      if (SFC.RecipeFx.shown === e.id + ':' + e.lv) { SFC.RecipeFx.shown = null; return; }
      const name = SFC.CoreSystem.ultName(e.id, e.lv);
      const title = fresh ? _t('NEW ULTIMATE DISCOVERED!') : e.evolved ? _t('ULTIMATE EVOLVED!') : _t('NEW ULTIMATE!');
      this.banner(title, name, '#ffd23f', 2.4);
      SFC.Audio.upgrade();
    },

    toast(html) {
      const d = document.createElement('div');
      d.className = 'toast';
      d.innerHTML = html;
      this.el.toasts.appendChild(d);
      setTimeout(() => d.classList.add('out'), 2600);
      setTimeout(() => d.remove(), 3100);
    },

    clearToasts() {
      this.el.toasts.innerHTML = '';
      this.el.banner.classList.remove('show');
    },
  });
})();
