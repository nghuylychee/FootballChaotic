/* CupUI — FOOTBALL STORY (docs/FOOTBALL_STORY.md). Logic: src/meta/cup.js (SFC.Cup), nội dung: config/stories.config.js.
 *   page 'story' (tab thứ 2 màn PLAY, vẽ trong khung pt-* của Menu): thẻ các Story (ảnh bìa, sao, kết quả xa nhất) + tổng completion · START
 *   page 'cup'   (màn của 1 lượt chơi): đường đi 4 vòng tới cúp + đối thủ kế tiếp + kết quả các nhánh khác + hội thoại
 *                Cốt truyện = cut scene kiểu PROLOGUE (SFC.Story, khuôn cảnh ở src/ui/story-cup.js): mở cup · trước trận (có cảnh VS) ·
 *                sau trận thắng · nâng cúp. KICK OFF -> cut scene trước trận -> main.js startCupMatch.
 *                Hết cup: màn bị loại (KNOCKED OUT) / vô địch (CHAMPIONS) + thưởng của lượt chơi.
 * Menu gọi: storyItems / renderStory (page 'story', đi phím bằng Menu.playInput) · render / input / click / back (page 'cup')
 */
window.SFC = window.SFC || {};

(function () {
  const _t = SFC.t;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const CUP = () => SFC.Cup;
  const PX = () => SFC.PixelIcon;
  const TEAMS = () => SFC_CONFIG.teams.list;
  const CORES = () => SFC_CONFIG.cores.list;
  const PROG = () => SFC_CONFIG.progression;
  const STEAM_SOON = () => !(SFC_CONFIG.demo && SFC_CONFIG.demo.steamUrl);

  const CupUI = {
    pages: ['cup'],
    pick: 0,          // Story đang chọn ở page 'story' (chỉ số trong stories.list)
    key: null,        // trạng thái lượt chơi đã xử lý (đổi -> mở hội thoại mới)
    view: 'bracket',  // bracket · out · champ
    sel: 0,           // nút đang chọn ở page 'cup'
    quitArm: false,   // QUIT CUP: bấm 2 lần mới bỏ

    /* ================= page 'story' (tab PLAY) ================= */
    storyItems(menu) {
      const list = CUP().list();
      const items = list.map((s, i) => ({ kind: 'btn', card: true, sid: s.id, label: s.name, act: () => this.tryStart(menu, i) }));
      items.push({ kind: 'btn', main: true, label: _t('START'), act: () => this.tryStart(menu, this.pick) });
      return items;
    },
    // trạng thái hiện trên thẻ: [chữ, class]
    status(s) {
      if (s.soon) return [_t('COMING SOON'), 'soon'];
      if (CUP().demoLocked(s)) return [STEAM_SOON() ? _t('FULL GAME') : _t('FULL GAME · WISHLIST'), 'lock'];
      const r = CUP().rec(s.id);
      if (r.wins) return [r.wins > 1 ? _t('CHAMPION ×{n}', { n: r.wins }) : _t('CHAMPION'), 'won'];
      if (r.best) return [_t('Best: {round}', { round: CUP().roundName(r.best) }), ''];
      if (r.plays) return [_t('Out in the {round}', { round: CUP().roundName(0) }), ''];
      return [_t('NEW'), 'new'];
    },
    starRow(s) {
      const got = s.soon ? [] : CUP().rec(s.id).stars;
      return (s.stars || [{}, {}, {}]).map((x) => `<i class="${got.includes(x.id) ? 'on' : ''}">★</i>`).join('');
    },
    renderStory(menu, items) {
      const list = CUP().list(), tot = CUP().totals();
      const cur = items[menu.sel];
      if (cur && cur.card) this.pick = list.findIndex((s) => s.id === cur.sid);
      this.pick = Math.max(0, Math.min(list.length - 1, this.pick));
      const sub = `<span class="pt-area fs-sum">${PX().ui('trophy', 'sm')} ${esc(_t('{n}/{max} CUPS', { n: tot.cups, max: tot.cupsMax }))} · <b>★</b> ${tot.stars}/${tot.starsMax}</span>`;
      const cards = list.map((s, i) => {
        const [st, cls] = this.status(s);
        const on = i === this.pick;
        return `<button class="fs-card ${cls} ${menu.sel === i ? 'sel' : ''} ${on ? 'on' : ''}" data-i="${i}" style="--sc:${s.color}">
          <canvas data-scover="${s.id}" width="120" height="64"></canvas>
          ${cls === 'soon' || cls === 'lock' ? `<span class="fs-lock">${PX().ui('lock', 'x2')}</span>` : ''}
          <b class="fs-name">${esc(s.name)}</b>
          <span class="fs-stars">${this.starRow(s)}</span>
          ${s.tier ? `<span class="fs-tier" title="${esc(_t('DIFFICULTY'))}">${[1, 2, 3, 4].map((k) => `<i class="${k <= s.tier ? 'on' : ''}"></i>`).join('')}</span>` : ''}
          <em class="fs-st">${esc(st)}</em>
        </button>`;
      }).join('');
      const s = list[this.pick], iStart = items.findIndex((x) => x.main);
      const ok = CUP().playable(s);
      const goals = s.soon ? '' : `<div class="fs-goals">${(s.stars || []).map((x) => {
        const got = CUP().rec(s.id).stars.includes(x.id);
        return `<span class="${got ? 'on' : ''}"><i>${got ? '★' : '☆'}</i>${esc(x.desc)}</span>`;
      }).join('')}</div>`;
      const msg = menu.msg ? `<div class="m-msg ${menu.msgErr ? 'err' : ''}">${esc(menu.msg)}</div>` : '';
      return `<div class="pt-main pt-story">
          ${menu.playTabs('story', sub)}
          <div class="fs-cards">${cards}</div>
          <div class="fs-info" style="--sc:${s.color}">
            <div class="fs-blurb"><b>${esc(s.name)}</b><span>${esc(s.blurb || '')}</span></div>
            ${goals}
          </div>
          ${msg}
          <div class="pt-acts"><button class="pt-btn go ${ok ? '' : 'dis'} ${menu.sel === iStart ? 'sel' : ''}" data-i="${iStart}">${esc(_t('START'))}</button></div>
          <div class="pt-hint">${esc(_t('Co-op vs bots · 4 knockout matches · lose and you are out'))}</div>
        </div>
        <button class="pt-back" data-back="1">◀ ${esc(_t('BACK'))}</button>`;
    },
    // ảnh bìa thẻ Story (sân của Story, 2 đội của trận chung kết)
    bind(menu) {
      menu.el.querySelectorAll('canvas[data-scover]').forEach((cv) => {
        const s = CUP().get(cv.dataset.scover);
        if (!s || !SFC_CONFIG.arenas[s.cover]) return;
        const away = s.rounds ? s.rounds[s.rounds.length - 1].team : SFC_CONFIG.teams.order[0];
        const img = SFC.Background.thumb(s.cover, SFC_CONFIG.mainPath.playerTeam.id, away);
        const ctx = cv.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 20, 22, 600, 224, 0, 0, cv.width, cv.height);
        if (!CUP().playable(s)) { ctx.fillStyle = 'rgba(7,5,10,0.72)'; ctx.fillRect(0, 0, cv.width, cv.height); }
      });
    },
    tryStart(menu, i) {
      const s = CUP().list()[i];
      this.pick = i;
      if (!s) return;
      if (s.soon) return menu.setMsg(_t('This story is coming soon.'), true);
      if (CUP().demoLocked(s)) {
        // CrazyGames: link cửa hàng chỉ ở menu chính / lúc hết demo -> chỉ báo khoá
        if (SFC_STORE === 'crazygames') return menu.setMsg(_t('This story is in the full game.'), true);
        return menu.go('wishlist');
      }
      if (!CUP().start(s.id)) return;
      this.reset();
      menu.go('cup');
    },
    reset() { this.key = null; this.view = 'bracket'; this.sel = 0; this.quitArm = false; },

    /* ================= page 'cup' (1 lượt chơi) ================= */
    // trạng thái lượt chơi đổi (mới bắt đầu / vừa đá xong 1 trận) -> chiếu cut scene + chọn màn
    sync() {
      const R = CUP().run, s = CUP().story();
      if (!R || !s) return;
      const key = R.results.length + (R.out ? 'o' : '') + (R.champion ? 'c' : '');
      if (this.key === key) return;
      this.key = key;
      this.sel = 0;
      this.quitArm = false;
      const n = R.results.length, last = n ? s.rounds[n - 1] : null;
      if (!n) return this.cut(this.scenes(s.intro, 'intro'), 'bracket');
      if (R.out) { this.view = 'out'; return; }
      if (R.champion) return this.cut(this.scenes(last.after, 'after', last.team).concat(this.scenes(s.outro, 'outro')), 'champ');
      this.cut(this.scenes(last.after, 'after', last.team), 'bracket');
    },
    // lời thoại config -> cảnh cut scene (mỗi dòng 1 cảnh). kind: intro · before · after · outro, team = đối thủ của vòng
    scenes(lines, kind, team = null) {
      const s = CUP().story(), out = [];
      const def = (who) => (kind === 'outro' ? 'cupLift' : who === 'host' ? (kind === 'intro' ? 'cupAlley' : 'cupHost')
        : kind === 'after' && who === 'opp' ? 'cupSad' : 'cupTalk');
      // trước trận: cảnh VS (tên vòng) trước câu đầu tiên của 2 đội
      let vs = kind === 'before';
      if (kind === 'outro') out.push({ art: 'cupLift', theme: s.theme, trophy: s.trophy, dur: 2.2, lines: [{ at: 0.3, text: _t('CHAMPIONS'), style: 'title' }] });
      for (const l of lines || []) {
        if (vs && l.who !== 'host') {
          vs = false;
          out.push({ art: 'cupFace', team, theme: s.theme, dur: 2.4, lines: [{ at: 0.35, text: _t('VS'), style: 'shout' }, { at: 0.7, text: CUP().roundName(CUP().run.round), style: 'sub' }] });
        }
        const art = l.art || def(l.who);
        out.push({ art, team: l.team || team, who: l.who, zoom: l.zoom, color: s.color, dur: l.dur || 1.6 + l.text.length * 0.035,
          theme: s.theme, trophy: s.trophy, fillers: s.fillers,
          lines: [{ at: 0.25, who: l.who, text: l.text, style: 'caption' }] });
      }
      // cảnh liền nhau cùng khuôn + cùng người: hình chạy tiếp, chỉ đổi lời thoại
      out.forEach((sc, i) => { const p = out[i - 1]; if (p && p.art === sc.art && p.who === sc.who && p.team === sc.team) sc.keep = true; });
      return out;
    },
    // người nói trên hộp chữ cut scene: tên + màu
    speaker(who, sc) {
      if (who === 'you') return { name: SFC.Profile.data.name || 'PLAYER', color: '#ffe14f' };
      if (who === 'opp') { const t = TEAMS()[sc.team] || {}; return { name: (t.players || [])[2] || t.name || '', color: t.kit ? t.kit.shirt : '#fff' }; }
      return { name: SFC_CONFIG.stories.host, color: (CUP().story() || {}).color || '#ffe14f' };
    },
    // chiếu cut scene (app.screen = 'story', nhạc menu vẫn phát); xong / bỏ qua -> then
    cut(scenes, then) {
      if (!scenes.length) return this.finish(then);
      const app = SFC.Menu.app;
      app.screen = 'story';
      SFC.Story.play(scenes, () => {
        if (then !== 'kick') app.screen = 'menu';
        this.finish(then);
        if (then !== 'kick' && app.screen === 'menu') SFC.Menu.render();
      }, null, { speaker: (w, sc) => this.speaker(w, sc), music: true });
    },
    finish(then) {
      if (then === 'kick') return SFC.Menu.app.startCupMatch();
      this.view = then;
      this.sel = 0;
      if (then === 'champ') SFC.Audio.upgrade();
    },

    // nút ở page 'cup' theo màn đang mở
    buttons() {
      if (this.view === 'bracket') {
        return [
          { k: 'kick', main: true, label: _t('KICK OFF') },
          { k: 'quit', label: this.quitArm ? _t('CONFIRM QUIT') : _t('QUIT CUP'), danger: this.quitArm },
        ];
      }
      return [{ k: 'again', main: true, label: _t('PLAY AGAIN') }, { k: 'back', label: _t('BACK') }];
    },
    act(menu, k) {
      SFC.Audio.menu();
      const R = CUP().run;
      if (k === 'kick') {
        const rd = CUP().current();
        if (!rd) return;
        return this.cut(this.scenes(rd.before, 'before', rd.team), 'kick');
      }
      if (k === 'quit') {
        if (!this.quitArm) { this.quitArm = true; menu.setMsg(_t('Quit this cup? Your progress in this run will be lost.'), true); return; }
        return this.leave(menu);
      }
      if (k === 'again') {
        const id = R && R.id;
        this.reset();
        if (id && CUP().start(id)) return menu.render();
        return this.leave(menu);
      }
      if (k === 'back') return this.leave(menu);
    },
    leave(menu) { CUP().abort(); this.reset(); menu.msg = ''; menu.go('story'); },

    render(menu) {
      const R = CUP().run, s = CUP().story();
      if (!R || !s) { menu.go('story'); return; }
      this.sync();
      const rd = CUP().current(), r = R.round;
      // hết cup: dòng phụ để trống (màn kết đã có chữ CHAMPIONS / KNOCKED OUT to)
      const title = R.champion || R.out ? '' : CUP().roundName(r);
      const head = `<div class="cu-head" style="--sc:${s.color}"><b>${esc(s.name)}</b>${title ? `<span>${esc(title)}</span>` : ''}</div>`;
      const btns = this.buttons().map((b, i) => `<button class="pt-btn ${b.main ? 'go' : ''} ${b.danger ? 'danger' : ''} ${i === this.sel ? 'sel' : ''}" data-cb="${b.k}">${esc(b.label)}</button>`).join('');
      const msg = menu.msg ? `<div class="m-msg ${menu.msgErr ? 'err' : ''}">${esc(menu.msg)}</div>` : '';
      let body;
      if (this.view === 'out' || this.view === 'champ') body = this.track(R, s) + this.endPanel(R, s);
      else body = `${this.track(R, s)}<div class="cu-mid">${rd ? this.oppCard(rd) : ''}${this.ticker(R, s)}</div>`;
      menu.el.innerHTML = `<div class="cu-page">${head}${body}${msg}
          <div class="cu-acts">${btns}</div>
        </div>`;
      menu.bindAvatars();
    },

    // đường đi 4 vòng tới cúp: vòng đã thắng (tỉ số) · vòng đang tới · vòng bị loại
    track(R, s) {
      const nodes = s.rounds.map((rd, i) => {
        const res = R.results[i] && R.results[i].find((m) => m.a === 0);
        const t = TEAMS()[rd.team] || {};
        const st = res ? (res.w === 0 ? 'won' : 'lost') : i === R.round && !R.out ? 'next' : 'todo';
        const hidden = st === 'todo' && i > CUP().rec(s.id).best;   // vòng chưa từng tới: bóng đen + ???
        const score = res ? `<em>${res.sa} - ${res.sb}</em>` : '';
        return `<div class="cu-node ${st}" style="--tc:${t.kit ? t.kit.shirt : '#888'}">
          <span class="cu-rn">${esc(CUP().roundName(i))}</span>
          <canvas data-team="${rd.team}" data-idx="2" ${hidden ? 'data-sil="1"' : ''}></canvas>
          <b>${esc(hidden ? '???' : t.short || '')}</b>${score}
        </div>`;
      });
      return `<div class="cu-track">${nodes.join('<i class="cu-link"></i>')}<i class="cu-link"></i><div class="cu-node cup ${R.champion ? 'won' : ''}">${PX().ui('trophy', 'x2')}</div></div>`;
    },
    // đối thủ kế tiếp: tên, dòng phụ, mô tả, 3 cầu thủ, Core đặc trưng
    oppCard(rd) {
      const t = TEAMS()[rd.team];
      if (!t) return '';
      const sig = rd.signature && CORES()[rd.signature];
      const mod = rd.mod && SFC_CONFIG.stories.mods[rd.mod];   // luật trận của đội (src/systems/matchmods.js)
      return `<div class="cu-opp" style="--tc:${t.kit.shirt}">
          <div class="cu-opp-h"><span>${esc(_t('NEXT OPPONENT'))}</span><b>${esc(t.name)}</b><em>${esc(t.tagline || '')}</em></div>
          <div class="cu-opp-b">
            <div class="cu-pl">${[0, 1, 2].map((i) => `<canvas data-team="${rd.team}" data-idx="${i}"></canvas>`).join('')}</div>
            <div class="cu-opp-d"><span>${esc(t.desc || '')}</span>${sig ? `<span class="cu-sig">${PX().core(rd.signature, 'sm')} ${esc(_t('Signature: {core}', { core: sig.name }))}</span>` : ''}${mod ? `<span class="cu-rule"><b>${esc(_t('PITCH RULE'))} · ${esc(mod.name)}</b>${esc(mod.hint)}</span>` : ''}</div>
          </div>
        </div>`;
    },
    // kết quả các nhánh khác của vòng vừa xong (kình địch lên đầu)
    ticker(R, s) {
      const n = R.results.length;
      if (!n) return `<div class="cu-tick"><div class="cu-tick-h">${esc(_t('{n} TEAMS · ONE TROPHY', { n: 16 }))}</div><span>${esc(s.blurb || '')}</span></div>`;
      const rival = s.rival != null ? [1, 2, 4, 8][s.rival] : -1;
      const others = R.results[n - 1].filter((m) => m.a !== 0).sort((x, y) => (y.w === rival) - (x.w === rival)).slice(0, 4);
      const row = (m) => {
        const A = CUP().teamAt(m.a), B = CUP().teamAt(m.b);
        return `<div class="cu-res ${m.w === rival ? 'rival' : ''}"><b class="${m.w === m.a ? 'w' : ''}">${esc(A.name)}</b><em>${m.sa} - ${m.sb}</em><b class="${m.w === m.b ? 'w' : ''}">${esc(B.name)}</b></div>`;
      };
      return `<div class="cu-tick"><div class="cu-tick-h">${esc(_t('OTHER RESULTS · {round}', { round: CUP().roundName(n - 1) }))}</div>${others.map(row).join('')}</div>`;
    },
    // màn hết cup: vòng đã tới, gold của lượt chơi, sao mới, costume vô địch
    endPanel(R, s) {
      const n = R.results.length, rd = s.rounds[n - 1];
      const line = R.champion ? _t('You won {story}!', { story: s.name })
        : _t('Knocked out in the {round} by {team}.', { round: CUP().roundName(n - 1), team: (TEAMS()[rd.team] || {}).name || '' });
      const stars = (s.stars || []).map((x) => {
        const got = CUP().rec(s.id).stars.includes(x.id), fresh = R.starsNew.includes(x.id);
        return `<span class="${got ? 'on' : ''} ${fresh ? 'new' : ''}"><i>${got ? '★' : '☆'}</i>${esc(x.desc)}${fresh ? ` <u>${esc(_t('NEW'))}</u>` : ''}</span>`;
      }).join('');
      const it = R.item && PROG().items[R.item];
      const item = it ? `<div class="cu-item"><span class="cu-ib"><canvas data-avatar="spin" data-try="${R.item}" class="big"></canvas></span>
          <div><b>${esc(it.name)}</b><span>${esc(_t('Champion reward · added to your INVENTORY'))}</span></div></div>` : '';
      return `<div class="cu-end ${R.champion ? 'champ' : 'out'}">
          <div class="cu-big"><b>${esc(R.champion ? _t('CHAMPIONS') : _t('KNOCKED OUT'))}</b><span>${esc(line)}</span></div>
          <div class="cu-sum">
            <div class="cu-gold"><i class="coin"></i>+${R.gold} <span>${esc(_t('gold this run'))}</span></div>
            <div class="fs-goals">${stars}</div>
          </div>
          ${item}
        </div>`;
    },
    input(menu, input) {
      const n = this.buttons().length;
      for (const d of ['left', 'right', 'up', 'down']) {
        if (!input.wasPressed(d)) continue;
        this.sel = (this.sel + (d === 'left' || d === 'up' ? n - 1 : 1)) % n;
        SFC.Audio.menu();
        return menu.render();
      }
      if (input.wasPressed('confirm')) this.act(menu, this.buttons()[this.sel].k);
    },
    click(menu, e) {
      const b = e.target.closest('[data-cb]');
      if (!b) return false;
      this.sel = Math.max(0, this.buttons().findIndex((x) => x.k === b.dataset.cb));
      this.act(menu, b.dataset.cb);
      return true;
    },
    // Esc: màn bracket: hỏi bỏ cup (bấm lại để bỏ) · hết cup: về trang FOOTBALL STORY (cut scene tự xử lý phím: giữ để bỏ qua)
    back(menu) {
      if (this.view === 'bracket') return this.act(menu, 'quit');
      this.leave(menu);
    },
  };

  SFC.CupUI = CupUI;
})();
