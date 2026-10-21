/* CupUI — FOOTBALL STORY (docs/FOOTBALL_STORY.md). Logic: src/meta/cup.js (SFC.Cup), nội dung: config/stories.config.js.
 *   page 'story' (tab thứ 2 màn PLAY, vẽ trong khung pt-* của Menu): thẻ các Story (ảnh bìa, sao, kết quả xa nhất) + tổng completion · START
 *   page 'cup'   (màn của 1 lượt chơi): đường đi 4 vòng tới cúp + đối thủ kế tiếp + kết quả các nhánh khác + hội thoại
 *                Cốt truyện = cut scene kiểu PROLOGUE (SFC.Story, khuôn cảnh ở src/ui/story-cup.js), trình chiếu theo kiểu kể riêng
 *                của Story (s.tell: nhật ký · manga · TV · phim cũ, src/ui/story.js TELL): mở cup · trước trận (có cảnh VS) ·
 *                sau trận thắng · nâng cúp. KICK OFF -> cut scene trước trận -> main.js startCupMatch.
 *                Hết cup: màn bị loại (KNOCKED OUT) / vô địch (CHAMPIONS) + thưởng của lượt chơi.
 *   page 'slobby' (co-op online): phòng chờ của phòng Story — 3 ô vị trí (người trong phòng mang character của mình / ô trống = AI),
 *                mã phòng (bấm để chép), START CUP (chủ phòng). Bạn bè vào bằng mã: tab FOOTBALL STORY › JOIN (hoặc PRIVATE MATCH › JOIN),
 *                hoặc INVITE FRIENDS (chỉ khi backend có bảng mời bạn bè: Steam) -> bạn nhận lời là tự vào phòng (OnlineUI.tryInvite).
 *                Trong phòng: chủ phòng (máy làm host) giữ lượt chơi + bấm KICK OFF; cut scene trước trận chiếu cùng lúc ở mọi máy
 *                (Session.cueScenes), khách xem màn cup theo bản sao host gửi (Cup.mirror). Thoát phòng = hết cup với máy đó.
 * Menu gọi: storyItems / renderStory (page 'story', đi phím bằng Menu.playInput) · render / input / click / back (page 'cup' · 'slobby')
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
  const ON = () => SFC.Session;
  const ROLES = () => SFC_CONFIG.game.roles;
  // đang ở phòng Story online · máy này là chủ phòng (máy làm host)
  const inRoom = () => ON().status !== 'idle' && !!ON().story;
  const isHost = () => inRoom() && ON().isHost;
  const ownerName = () => { const L = ON().lobby, m = L.members.find((x) => x.id === L.owner); return (m && m.pf && m.pf.name) || _t('HOST'); };

  const CupUI = {
    pages: ['cup', 'slobby'],
    roomStory: null,  // id Story của phòng online đang ở (nhớ lại khi phòng đóng — OnlineUI)
    lsel: 0,          // mục đang chọn ở page 'slobby'
    leaveArm: false,  // rời phòng: bấm 2 lần
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
      // co-op online (bản DEMO khoá online như PRIVATE MATCH): tạo phòng Story mời bạn bằng mã · vào phòng của bạn bằng mã
      if (!SFC_DEMO) {
        items.push({ kind: 'btn', coop: true, label: _t('PLAY WITH FRIENDS'), act: () => this.tryStart(menu, this.pick, true) });
        items.push({ kind: 'btn', joinRoom: true, label: _t('JOIN'), act: () => { menu.joinFrom = 'story'; menu.go('join'); } });
      }
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
    // thẻ Story: tiến độ bằng hình thay cho chữ — 4 ô (trận đã thắng xa nhất) + cúp (sáng khi đã vô địch, ×n lần)
    progress(s) {
      const r = CUP().rec(s.id), title = this.status(s)[0];
      return `<span class="fs-prog" title="${esc(title)}">${[0, 1, 2, 3].map((k) => `<i class="${k < r.best ? 'on' : ''}"></i>`).join('')}<b class="${r.wins ? 'on' : ''}">${PX().ui('trophy', 'sm')}${r.wins > 1 ? `×${r.wins}` : ''}</b></span>`;
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
          ${cls === 'soon' || cls === 'lock' || cls === 'new' ? `<em class="fs-st">${esc(st)}</em>` : this.progress(s)}
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
            <div class="fs-blurb"><b>${esc(s.name)}${s.tag ? ` <em class="fs-tag" title="${esc(_t('STORYTELLING'))}">${s.tagIcon ? PX().ui(s.tagIcon, 'sm') : ''}${esc(s.tag)}</em>` : ''}</b><span>${esc(s.blurb || '')}</span></div>
            ${goals}
          </div>
          ${msg}
          <div class="pt-acts">${this.sideBtn(menu, items, (x) => x.joinRoom)}<button class="pt-btn go ${ok ? '' : 'dis'} ${menu.sel === iStart ? 'sel' : ''}" data-i="${iStart}">${esc(_t('START'))}</button>${this.sideBtn(menu, items, (x) => x.coop, ok)}</div>
          <div class="pt-hint">${esc(_t('Solo or with up to 2 friends · 4 knockout matches · lose and you are out'))}</div>
        </div>
        <button class="pt-back" data-back="1">◀ ${esc(_t('BACK'))}</button>`;
    },
    sideBtn(menu, items, f, ok = true) {
      const i = items.findIndex(f);
      return i < 0 ? '' : `<button class="pt-btn ${ok ? '' : 'dis'} ${menu.sel === i ? 'sel' : ''}" data-i="${i}">${esc(items[i].label)}</button>`;
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
    // coop: tạo phòng Story online (máy này làm host) thay vì đá một mình
    tryStart(menu, i, coop = false) {
      const s = CUP().list()[i];
      this.pick = i;
      if (!s) return;
      if (s.soon) return menu.setMsg(_t('This story is coming soon.'), true);
      if (CUP().demoLocked(s)) {
        // CrazyGames: link cửa hàng chỉ ở menu chính / lúc hết demo -> chỉ báo khoá
        if (SFC_STORE === 'crazygames') return menu.setMsg(_t('This story is in the full game.'), true);
        return menu.go('wishlist');
      }
      if (coop) { this.roomStory = s.id; this.lsel = 0; this.leaveArm = false; return ON().createRoom({ story: s.id }); }
      if (!CUP().start(s.id)) return;
      this.reset();
      menu.go('cup');
    },
    reset() { this.key = null; this.view = 'bracket'; this.sel = 0; this.quitArm = false; this.leaveArm = false; this.kicking = false; clearInterval(this.kickT); },

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
    // lời thoại config -> cảnh cut scene (mỗi dòng 1 cảnh). kind: intro · before · after · outro, team = đối thủ của vòng,
    // round = vòng (mặc định: before = vòng sắp đá, after = vòng vừa đá xong)
    // Kiểu kể (s.tell, src/ui/story.js TELL): mỗi cảnh mang stage = tên chặng (s.stages[0 mở đầu · 1..4 vòng · 5 kết]);
    // đầu intro / before / outro chèn 1 cảnh card = trang / thẻ tên chặng (nhật ký: ngày · manga: chương · TV: tập · phim: cuộn)
    scenes(lines, kind, team = null, round = null) {
      const s = CUP().story(), out = [], R = CUP().run;
      const N = s.narrator || {};   // người dẫn truyện riêng của Story (tên + look trên khuôn cupHost, art mặc định)
      const def = (who) => (kind === 'outro' ? 'cupLift' : who === 'host' ? (kind === 'intro' ? 'cupAlley' : N.art || 'cupHost')
        : kind === 'after' && who === 'opp' ? 'cupSad' : 'cupTalk');
      const r = round != null ? round : kind === 'after' ? R.results.length - 1 : R.round;
      const stage = (s.stages || [])[kind === 'intro' ? 0 : kind === 'outro' ? 5 : r + 1] || '';
      // film: đoạn kết hết hồi tưởng, phim có màu lại (outroColor)
      const base = { color: s.color, stage, channel: s.channel, ticker: (s.ticker || []).join('   ★   '), vivid: kind === 'outro' && !!s.outroColor };
      const add = (sc) => out.push(Object.assign({}, base, sc));
      if (s.tell && stage && kind !== 'after') add({ card: true, dur: 1.7, lines: [] });
      // trước trận: cảnh VS (tên vòng) trước câu đầu tiên của 2 đội
      let vs = kind === 'before';
      if (kind === 'outro') add({ art: 'cupLift', theme: s.theme, trophy: s.trophy, dur: 2.2, lines: [{ at: 0.3, text: _t('CHAMPIONS'), style: 'title' }] });
      for (const l of lines || []) {
        if (vs && l.who !== 'host') {
          vs = false;
          add({ art: 'cupFace', team, theme: s.theme, dur: 2.4, lines: [{ at: 0.35, text: _t('VS'), style: 'shout' }, { at: 0.7, text: CUP().roundName(r), style: 'sub' }] });
        }
        const art = l.art || def(l.who);
        // sfx: chữ hiệu ứng đập màn cùng câu thoại (manga: DOOM!, SLAM!...)
        const sfx = l.sfx ? [{ at: 0.05, text: l.sfx, style: 'shout' }] : [];
        add({ art, team: l.team || team, who: l.who, zoom: l.zoom, dur: l.dur || 1.6 + l.text.length * 0.035,
          theme: s.theme, trophy: s.trophy, fillers: s.fillers, host: N, item: l.item, young: l.young, fall: l.fall, vivid: !!l.color || base.vivid,
          lines: sfx.concat([{ at: 0.25, who: l.who, text: l.text, style: 'caption' }]) });
      }
      // cảnh liền nhau cùng khuôn + cùng người: hình chạy tiếp, chỉ đổi lời thoại
      out.forEach((sc, i) => { const p = out[i - 1]; if (p && p.art === sc.art && p.who === sc.who && p.team === sc.team && p.item === sc.item && p.young === sc.young) sc.keep = true; });
      return out;
    },
    // người nói trên hộp chữ cut scene: tên + màu
    speaker(who, sc) {
      if (who === 'you') return { name: SFC.Profile.data.name || 'PLAYER', color: '#ffe14f' };
      if (who === 'opp') { const t = TEAMS()[sc.team] || {}; return { name: (t.players || [])[2] || t.name || '', color: t.kit ? t.kit.shirt : '#fff' }; }
      const s = CUP().story() || {};
      return { name: (s.narrator && s.narrator.name) || SFC_CONFIG.stories.host, color: s.color || '#ffe14f' };
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
      }, null, { speaker: (w, sc) => this.speaker(w, sc), music: true, tell: (CUP().story() || {}).tell });
    },
    finish(then) {
      if (then === 'kick') return SFC.Menu.app.startCupMatch();
      // co-op: chủ phòng xem xong cut scene trước trận -> chờ cả phòng xem xong rồi vào trận · khách -> báo đã xem xong
      if (then === 'kickRoom') { this.view = 'bracket'; return this.waitKick(); }
      if (then === 'ready') { this.view = 'bracket'; ON().scenesDone(); SFC.Menu.msg = _t('Get ready...'); SFC.Menu.msgErr = false; return; }
      this.view = then;
      this.sel = 0;
      if (then === 'champ') SFC.Audio.upgrade();
    },

    // nút ở page 'cup' theo màn đang mở
    buttons() {
      // phòng co-op: chủ phòng điều khiển cup, người khác chỉ rời phòng được
      if (inRoom() && !isHost()) return [{ k: 'leave', label: this.leaveArm ? _t('CONFIRM LEAVE') : _t('LEAVE ROOM'), danger: this.leaveArm }];
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
      if (k === 'leave') return this.leaveRoom(menu);
      if (k === 'kick') {
        const rd = CUP().current();
        if (!rd) return;
        // co-op: mọi máy chiếu cùng lúc, chủ phòng vào trận khi cả phòng xem xong
        if (isHost()) { if (this.kicking) return; this.kicking = true; ON().cueScenes('before'); return this.cut(this.scenes(rd.before, 'before', rd.team), 'kickRoom'); }
        return this.cut(this.scenes(rd.before, 'before', rd.team), 'kick');
      }
      if (k === 'quit') {
        if (!this.quitArm) { this.quitArm = true; menu.setMsg(_t('Quit this cup? Your progress in this run will be lost.'), true); return; }
        return this.leave(menu);
      }
      if (k === 'again') {
        const id = R && R.id;
        this.reset();
        if (id && CUP().start(id)) { if (isHost()) ON().shareCup(); return menu.render(); }
        return this.leave(menu);
      }
      if (k === 'back') return this.leave(menu);
    },
    // hết lượt chơi: một mình -> tab FOOTBALL STORY · chủ phòng co-op -> phòng chờ Story (cả phòng theo)
    leave(menu) {
      CUP().abort(); this.reset(); menu.msg = '';
      if (isHost()) { ON().shareCup(); return menu.go('slobby'); }
      menu.go('story');
    },
    // rời phòng co-op (bấm 2 lần): hết cup với máy này, OnlineUI đưa về tab FOOTBALL STORY
    leaveRoom(menu) {
      if (!this.leaveArm) { this.leaveArm = true; menu.setMsg(isHost() ? _t('Leave? The cup ends for everyone in the room.') : _t('Leave the room? You will leave this cup.'), true); return; }
      this.leaveArm = false;
      ON().leave();
    },

    /* ---------- co-op online ---------- */
    // khách vào phòng giữa cup: coi như đã xem cut scene các vòng trước
    skipTo() {
      const R = CUP().run;
      this.reset();
      if (R) this.key = R.results.length + (R.out ? 'o' : '') + (R.champion ? 'c' : '');
      this.view = R && R.out ? 'out' : R && R.champion ? 'champ' : 'bracket';
    },
    // khách: chủ phòng bắt đầu chiếu cut scene trước trận -> chiếu cùng
    remoteScenes(kind) {
      const rd = CUP().current();
      if (kind !== 'before' || !rd || SFC.Menu.app.screen !== 'menu') { ON().scenesDone(); return; }
      this.cut(this.scenes(rd.before, 'before', rd.team), 'ready');
    },
    // chủ phòng: chờ khách xem xong cut scene (tối đa net.sceneWait giây) rồi vào trận
    waitKick() {
      clearInterval(this.kickT);
      const go = () => { clearInterval(this.kickT); this.kicking = false; SFC.Menu.msg = ''; this.startRoomMatch(); };
      if (!ON().scenesPending) return go();
      SFC.Menu.setMsg(_t('Waiting for the others to finish the scene...'));
      this.kickT = setInterval(() => { if (!ON().scenesPending || !inRoom()) go(); }, 250);
    },
    // chủ phòng dựng trận của vòng hiện tại cho cả phòng: mỗi người đá vị trí đang đứng với character của mình,
    // vị trí trống = đồng đội AI cố định của lượt chơi (Cup.run.mates)
    startRoomMatch() {
      const R = CUP().run, rd = CUP().current();
      if (!R || !rd || !isHost()) return;
      const O = ON(), taken = O.lobby.members.filter((m) => m.slot >= 0).map((m) => O.slotRole(m.slot));
      const free = ROLES().filter((r) => !taken.includes(r));
      const mates = free.map((role, i) => (R.mates[i] ? SFC.Mates.spec(R.mates[i], role) : null)).filter(Boolean);
      const ai = SFC.MainPath.aiProfile(rd.elo);
      O.startStory({
        away: rd.team, mates,
        match: {
          difficulty: 'normal', aiProfile: ai, mateProfile: ai, arena: SFC_CONFIG.arenas[rd.arena] ? rd.arena : undefined,
          signature: [null, rd.signature || null], knockout: true, cup: { id: R.id, round: R.round },
          mod: rd.mod || null, barks: rd.barks || null, score: rd.score || null,
        },
      });
    },

    render(menu) {
      if (menu.page === 'slobby') return this.renderLobby(menu);
      const R = CUP().run, s = CUP().story();
      if (!R || !s) { menu.go(inRoom() ? 'slobby' : 'story'); return; }
      this.sync();
      const rd = CUP().current(), r = R.round;
      // chỉ tên Story: vòng đang tới đã sáng trên đường đi (bớt chữ, user 2026-10-20)
      const head = `<div class="cu-head" style="--sc:${s.color}"><b>${esc(s.name)}</b></div>`;
      const btns = this.buttons().map((b, i) => `<button class="pt-btn ${b.main ? 'go' : ''} ${b.danger ? 'danger' : ''} ${i === this.sel ? 'sel' : ''}" data-cb="${b.k}">${esc(b.label)}</button>`).join('');
      // co-op: khách thấy ai đang điều khiển cup
      const wait = inRoom() && !isHost() && !menu.msg ? _t('Waiting for {name} to continue...', { name: ownerName() }) : '';
      const msg = menu.msg || wait ? `<div class="m-msg ${menu.msgErr ? 'err' : ''}">${esc(menu.msg || wait)}</div>` : '';
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
        const score = res ? `${res.sa} - ${res.sb}` : '';
        return `<div class="cu-node ${st}" style="--tc:${t.kit ? t.kit.shirt : '#888'}">
          <span class="cu-rn">${esc(CUP().roundName(i))}</span>
          <canvas data-team="${rd.team}" data-idx="2" ${hidden ? 'data-sil="1"' : ''}></canvas>
          <b>${esc(hidden ? '???' : t.short || '')}</b><em>${score}</em>
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
      // bớt chữ (user 2026-10-20): không còn đoạn mô tả đội (ở tooltip); mỗi thông tin = 1 dòng icon + chữ ngắn
      const chip = (cls, icon, name, hint) => `<span class="cu-chip ${cls}" title="${esc(hint || name)}">${icon}<b>${esc(name)}</b>${hint ? `<em>${esc(hint)}</em>` : ''}</span>`;
      return `<div class="cu-opp" style="--tc:${t.kit.shirt}" title="${esc(t.desc || '')}">
          <div class="cu-opp-h"><b>${esc(t.name)}</b><em>${esc(t.tagline || '')}</em></div>
          <div class="cu-opp-b">
            <div class="cu-pl">${[0, 1, 2].map((i) => `<canvas data-team="${rd.team}" data-idx="${i}"></canvas>`).join('')}</div>
            <div class="cu-opp-d">
              ${mod ? chip('rule', PX().ui('whistle', 'sm'), mod.name, mod.hint) : ''}
              ${sig ? chip('sig', PX().core(rd.signature, 'sm'), sig.name) : ''}
            </div>
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
      if (menu.page === 'slobby') return this.lobbyInput(menu, input);
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
      if (menu.page === 'slobby') return this.lobbyClick(menu, e);
      const b = e.target.closest('[data-cb]');
      if (!b) return false;
      this.sel = Math.max(0, this.buttons().findIndex((x) => x.k === b.dataset.cb));
      this.act(menu, b.dataset.cb);
      return true;
    },
    // Esc: màn bracket: hỏi bỏ cup (bấm lại để bỏ) · hết cup: về trang FOOTBALL STORY (cut scene tự xử lý phím: giữ để bỏ qua)
    // co-op: khách / phòng chờ Story = rời phòng (bấm 2 lần)
    back(menu) {
      if (menu.page === 'slobby' || (inRoom() && !isHost())) return this.leaveRoom(menu);
      if (this.view === 'bracket') return this.act(menu, 'quit');
      this.leave(menu);
    },

    /* ================= page 'slobby' (phòng chờ co-op của 1 Story) ================= */
    // mục chọn được: 3 ô vị trí (Enter ô trống = đứng vào đó) · START CUP (chủ phòng) · INVITE FRIENDS (chỉ khi mở được bảng mời bạn bè) · LEAVE ROOM
    lobbyItems() {
      const O = ON(), out = ROLES().map((role) => ({ k: 'slot', slot: O.slotOf(0, role), role }));
      if (O.isHost) out.push({ k: 'start', main: true, label: _t('START CUP') });
      if (O.canInvite) out.push({ k: 'invite', label: _t('INVITE FRIENDS') });
      out.push({ k: 'leave', label: this.leaveArm ? _t('CONFIRM LEAVE') : _t('LEAVE ROOM'), danger: this.leaveArm });
      return out;
    },
    lobbyAct(menu, it) {
      if (!it) return;
      SFC.Audio.menu();
      const O = ON();
      if (it.k === 'leave') return this.leaveRoom(menu);
      this.leaveArm = false;
      if (it.k === 'slot') { if (!O.memberAt(it.slot)) O.requestSlot(it.slot); return menu.render(); }
      if (it.k === 'invite') return O.invite() ? menu.render() : menu.setMsg(_t('Could not open your friend list. Share the room code instead.'), true);
      if (it.k === 'start') {
        const s = CUP().get(O.story);
        if (!O.isHost || !CUP().playable(s) || !CUP().start(s.id)) return;
        this.reset();
        O.shareCup();
        menu.msg = '';
        menu.go('cup');
      }
    },
    renderLobby(menu) {
      const O = ON(), s = CUP().get(O.story);
      if (!inRoom() || !s) { menu.go('story'); return; }
      if (CUP().run) { menu.go('cup'); return; }
      const items = this.lobbyItems(), L = O.lobby, meId = O.mine && O.mine.id;
      this.lsel = Math.max(0, Math.min(items.length - 1, this.lsel));
      // 3 ô vị trí: người trong phòng (character của họ) · ô trống = đồng đội AI, Enter để đứng vào
      const seats = items.filter((x) => x.k === 'slot').map((it) => {
        const i = items.indexOf(it), m = O.memberAt(it.slot), sel = i === this.lsel ? 'sel' : '';
        if (!m) return `<button class="sl-seat empty ${sel}" data-li="${i}"><span class="sl-role">${esc(it.role)}</span><b>+</b><em>${esc(_t('AI'))}</em><i>${esc(_t('MOVE HERE'))}</i></button>`;
        const you = m.id === meId, tag = you ? _t('YOU') : m.id === L.owner ? _t('HOST') : '';
        return `<button class="sl-seat ${you ? 'you' : ''} ${sel}" data-li="${i}"><span class="sl-role">${esc(it.role)}</span>
          <canvas class="avatar big" data-mmlook="${esc(JSON.stringify(m.pf.look))}" data-mmaway="0"></canvas>
          <b>${esc(m.pf.name)}</b><em>${tag ? esc(tag) : esc(_t('LV {n}', { n: m.pf.level }))}</em></button>`;
      }).join('');
      const code = O.code || '-'.repeat(SFC_CONFIG.net.codeLength);
      const btn = (it) => { const i = items.indexOf(it); return `<button class="pt-btn ${it.main ? 'go' : ''} ${it.danger ? 'danger' : ''} ${i === this.lsel ? 'sel' : ''}" data-li="${i}">${esc(it.label)}</button>`; };
      const note = O.isHost ? _t('Send this code to your friends. They join from FOOTBALL STORY › JOIN.') : _t('Waiting for {name} to start...', { name: ownerName() });
      const msg = menu.msg ? `<div class="m-msg ${menu.msgErr ? 'err' : ''}">${esc(menu.msg)}</div>` : '';
      menu.el.innerHTML = `<div class="cu-page sl-page">
          <div class="cu-head" style="--sc:${s.color}"><b>${esc(s.name)}</b>${s.tag ? `<em class="fs-tag">${s.tagIcon ? PX().ui(s.tagIcon, 'sm') : ''}${esc(s.tag)}</em>` : ''}</div>
          <div class="sl-code" data-copy="${esc(code)}" title="${esc(_t('Click to copy'))}"><span>${esc(_t('ROOM CODE'))}</span><b>${esc(code)}</b><i>${esc(_t('COPY'))}</i></div>
          <div class="sl-seats">${seats}</div>
          <div class="pt-note">${esc(note)}</div>${msg}
          <div class="cu-acts">${items.filter((x) => x.k !== 'slot').map(btn).join('')}</div>
        </div>`;
      menu.bindAvatars();
    },
    lobbyInput(menu, input) {
      const items = this.lobbyItems(), n = items.length;
      for (const d of ['left', 'right', 'up', 'down']) {
        if (!input.wasPressed(d)) continue;
        const nSeat = ROLES().length, seat = this.lsel < nSeat;
        // ←→ đi trong hàng (ô vị trí / nút) · ↑↓ đổi hàng
        if (d === 'left' || d === 'right') {
          const lo = seat ? 0 : nSeat, hi = seat ? nSeat : n, k = this.lsel - lo, len = hi - lo;
          this.lsel = lo + ((k + (d === 'left' ? len - 1 : 1)) % len);
        } else this.lsel = seat === (d === 'down') ? (seat ? nSeat : 0) : this.lsel;
        SFC.Audio.menu();
        return menu.render();
      }
      if (input.wasPressed('confirm')) this.lobbyAct(menu, items[this.lsel]);
    },
    lobbyClick(menu, e) {
      const b = e.target.closest('[data-li]');
      if (!b) return false;
      this.lsel = +b.dataset.li;
      this.lobbyAct(menu, this.lobbyItems()[this.lsel]);
      return true;
    },
  };

  SFC.CupUI = CupUI;
})();
