/* Menu — các màn ngoài trận: Trang chủ (thẻ hồ sơ) · Chơi đơn · Online (tạo / vào phòng / phòng chờ) ·
 *        Nhân vật (tủ đồ, đổi tên) · Shop (trang phục + mở khoá Core) · Cài đặt (Luyện tập, Điều khiển) · Đặt tên · Hướng dẫn
 * Mỗi trang khai báo danh sách mục (items): nút (btn) hoặc bộ chọn ←→ (pick).
 * ↑↓ chọn mục · ←→ đổi giá trị · Enter xác nhận · Esc / Backspace quay lại
 */
window.SFC = window.SFC || {};

(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const _t = SFC.t, _tn = SFC.tn;   // dịch theo ngôn ngữ đang chọn (engine/i18n.js) — nhãn cố định viết thành hàm, gọi lúc vẽ
  const TEAMS = () => SFC_CONFIG.teams;
  const STAT_LABELS = () => ({ speed: _t('SPEED'), power: _t('POWER'), pass: _t('PASSING'), tackle: _t('PHYSICAL'), dribble: _t('DRIBBLE'), accuracy: _t('ACCURACY') });
  const Session = () => SFC.Session;
  const ROLE_LABELS = () => ({ DEF: _t('DEFENDER'), FWD: _t('FORWARD') }); // vị trí xuất phát
  const PF = () => SFC.Profile;
  const PROG = () => SFC_CONFIG.progression;
  const MPATH = () => SFC.MainPath;
  const STEAM_SOON = () => !SFC_CONFIG.demo.steamUrl;   // bản DEMO: chưa có trang Steam (config/demo.config.js)
  const PX = () => SFC.PixelIcon;   // icon pixel art (render/pixelicons.js)
  // Shop (hộp gacha) · mở hộp · túi đồ nằm ở ui/gacha.js
  const G = () => SFC.Gacha;
  const TM = () => SFC.Team;          // NHÂN VẬT > TEAM: đội hình đồng đội + scout (ui/team.js)
  const coin = (n) => G().coin(n);
  const xpBar = (d) => G().xpBar(d);
  const CV = () => SFC.ControlsView;   // Settings > Controls (ui/controls.js)
  const ST = () => SFC.Settings;       // Settings: âm lượng, cỡ cửa sổ (meta/settings.js)
  const ATTRS = () => PROG().attrs;     // chỉ số character (trang STATS)
  // tên chỉ số trong trận (Player.stats) cho khung chi tiết trang STATS
  const KEY_LABELS = () => ({ speed: _t('run speed'), stamina: _t('stamina refill'), power: _t('shot power'), accuracy: _t('shot aim'), pass: _t('passing'),
    dribble: _t('dribbling'), tackle: _t('steal / intercept'), knock: _t('knockback'), keeper: _t('save chance') });

  function helpTable(list) {
    return list.map(([k, v]) => `<div class="hk"><kbd>${esc(k)}</kbd><span>${esc(v)}</span></div>`).join('');
  }

  function teamCard(id, label, extra = '') {
    if (!id) return `<div class="team-card empty"><div class="tc-label">${esc(label)}</div><div class="tc-wait">${esc(_t('Waiting for player...'))}</div></div>`;
    const team = TEAMS().list[id], kit = team.kit, SL = STAT_LABELS();
    const stats = Object.keys(SL).map((k) => {
      const v = team.stats[k] || 1;
      const w = Math.round(Math.max(0.1, Math.min(1, (v - 0.7) / 0.6)) * 100);
      return `<div class="stat"><span>${SL[k]}</span><i><b style="width:${w}%"></b></i></div>`;
    }).join('');
    return `<div class="team-card" style="--shirt:${kit.shirt};--accent:${kit.accent}">
      ${label ? `<div class="tc-label">${esc(label)}</div>` : ''}
      <div class="tc-head"><span class="kit"><i style="background:${kit.shirt}"></i><i style="background:${kit.accent}"></i><i style="background:${kit.shorts}"></i></span>
        <div><div class="tc-name">${esc(team.name)}</div><div class="tc-tag">${esc(team.tagline)}</div></div></div>
      <div class="tc-desc">${esc(team.desc)}</div>
      <div class="stats">${stats}</div>${extra}
    </div>`;
  }

  // phòng online: 1 đội = thẻ CLB (CLB riêng của người đầu tiên trong đội / đội bot ngẫu nhiên) + các slot theo vị trí.
  // Slot trống: đồng đội AI của người duy nhất trong đội, hoặc bot (đội không có người) — bấm để nhảy vào
  function lobbyTeam(t) {
    const O = SFC.Session, roles = SFC_CONFIG.game.roles, L = O.lobby, list = O.byTeam()[t];
    const coop = O.mode === 'coop', meId = O.mine && O.mine.id;
    let head, style = '--shirt:#8a8f9e;--accent:#9aa3b5';
    if (list.length) {
      const c = SFC.Room.club(list[0].pf.name, !coop && t === 1, coop ? _t('CO-OP SQUAD') : null), kit = c.kit;
      style = `--shirt:${kit.shirt};--accent:${kit.accent}`;
      head = `<div class="tc-head"><span class="kit"><i style="background:${kit.shirt}"></i><i style="background:${kit.accent}"></i><i style="background:${kit.shorts}"></i></span>
        <div><div class="tc-name">${esc(c.name)}</div><div class="tc-tag">${esc(c.tagline)}</div></div></div>`;
    } else {
      head = `<div class="tc-head"><span class="kit bot"><i></i><i></i><i></i></span>
        <div><div class="tc-name">${esc(_t('??? RANDOM BOTS'))}</div><div class="tc-tag">${esc(_t('A random club from your Areas'))}</div></div></div>`;
    }
    const slots = roles.map((role) => {
      const s = O.slotOf(t, role), m = O.memberAt(s), pos = ROLE_LABELS()[role] || role;
      if (m) {
        const you = m.id === meId, n = L.members.indexOf(m) + 1;
        const tag = you ? `<em class="you">${esc(_t('YOU'))}</em>` : m.id === L.owner ? `<em>${esc(_t('HOST'))}</em>` : '';
        return `<div class="lb-slot ${you ? 'me' : ''}" data-slot="${s}"><u>P${n}</u><div><b>${esc(m.pf.name)}</b>${tag}
          <span>${pos} · ${_t('LV {n}', { n: m.pf.level })}${m.pf.ovr ? ` · ${_t('OVR {n}', { n: m.pf.ovr })}` : ''}</span></div></div>`;
      }
      const mate = list.length === 1 && list[0].pf.mate;
      const who = mate ? `<b>${esc(mate.name)}</b><span>${_t('AI {pos}', { pos })} · ${_t('OVR {n}', { n: mate.ovr })} · ${_tn('{n} Core', '{n} Cores', mate.deck.length)}</span>`
        : list.length ? `<b>${_t('AI')}</b><span>${pos}</span>` : `<b>${_t('BOT')}</b><span>${_t('AI {pos}', { pos })}</span>`;
      return `<div class="lb-slot open ${mate ? 'mate' : 'bot'}" data-slot="${s}"><u>+</u><div>${who}</div><i>${_t('JOIN')}</i></div>`;
    }).join('');
    return `<div class="team-card lb-team ${list.length ? '' : 'bots'}" style="${style}">${head}<div class="lb-slots">${slots}</div></div>`;
  }

  const Menu = {
    page: 'home',
    sel: 0,
    selMemo: {},        // page -> mục đang chọn lúc rời trang
    msg: '',
    msgErr: false,
    code: '',
    tutPage: 0,
    nameBuf: '',
    nameBack: 'home',   // đặt tên xong quay về trang nào
    avatars: [],        // canvas character đang hiện (vẽ lại mỗi khung hình để có chuyển động)
    quitAsk: false,     // trang chủ: đang hiện hộp "QUIT GAME?" (chỉ bản desktop)
    quitSel: 1,         // 0 = QUIT · 1 = CANCEL
    wishSeen: false,    // bản DEMO: đã hiện màn WISHLIST sau khi hết Area đá được (mỗi lần chạy game hiện 1 lần khi mở Main Path)
    friendsOpen: true,  // phòng chờ: khung bạn bè đang mở (nút FRIENDS ẩn / hiện)

    init(app) {
      this.app = app;
      SFC.Social.load();
      // bạn bè giả đổi trạng thái / nhắn tin / vào phòng -> vẽ lại phòng chờ (giữ nguyên chữ đang gõ)
      // danh sách đổi (bạn vào phòng thì có thêm LEAVE PARTY, bạn bè xếp lại) -> giữ con trỏ ở đúng mục đang chọn
      const key = (it) => (it ? (it.kind === 'friend' ? 'f' + it.id : it.label) : null);
      SFC.Social.onChange = () => {
        if (this.page !== 'party' || app.screen !== 'menu') return;
        const k = key(this.partyItems && this.partyItems[this.sel]);
        const i = k ? this.items().findIndex((it) => key(it) === k) : -1;
        if (i >= 0) this.sel = i;
        this.render();
      };
      this.el = $('menu');
      this.bindMouse();
      this.render();
    },

    go(page, msg = '', err = false) {
      // bản DEMO: ONLINE khoá -> màn WISHLIST. Đã tới Area bị khoá: lần đầu mở Main Path mỗi lần chạy game cũng ra màn WISHLIST
      if (SFC_DEMO && ['online', 'join', 'lobby'].includes(page)) page = 'wishlist';
      if (page === 'path' && MPATH().demoOver() && !this.wishSeen) page = 'wishlist';
      if (page === 'wishlist') this.wishSeen = MPATH().demoOver();
      // nhớ mục đang chọn của từng trang: quay lại trang cũ (Esc, hết trận...) con trỏ nằm đúng mục vừa rời đi
      if (page !== this.page) {
        this.resetArmed = false;   // RESET DATA: rời trang SETTINGS là huỷ xác nhận
        this.quitAsk = false;
        this.selMemo[this.page] = this.sel;
        this.sel = this.selMemo[page] || 0;
      }
      this.page = page;
      this.msg = msg;
      this.msgErr = err;
      if (page === 'join' && !msg) this.code = '';
      // máy chủ riêng có thể đang ngủ: mở ONLINE là đánh thức luôn, tới lúc bấm TẠO / VÀO PHÒNG đã dậy được một lúc
      if (page === 'online' || page === 'party') Session().prepare();
      if (page === 'name') this.nameBuf = PF().data.name;
      if (page === 'path') this.pathView = MPATH().state.area;   // mở Main Path: xem Area đang đá
      if (page !== 'party' && SFC.Social.chatWith) SFC.Social.chatWith = null;
      this.setTextMode(page === 'join' || page === 'name' ? page : page === 'party' && SFC.Social.chatWith ? 'chat' : null);
      this.render();
    },

    setMsg(msg, err = false) { this.msg = msg; this.msgErr = err; this.render(); },

    options() {
      const order = TEAMS().order;
      return { order, opp: ['random'].concat(order), diffs: SFC_CONFIG.game.ai.difficultyOrder };
    },

    /* ---------------- danh sách mục theo trang ---------------- */
    items() {
      const app = this.app, s = app.sel, o = this.options();
      switch (this.page) {
        case 'home': {
          // trang chủ kiểu Valorant: thanh điều hướng đáy CHARACTER · PLAY · SHOP (it.nav = thứ tự hiển thị, PLAY ở giữa) + bánh răng SETTINGS góc phải.
          // PLAY = vào chế độ chơi chính (Main Path). ONLINE tạm ẩn khỏi trang chủ (logic trang 'online' vẫn còn).
          // Mục đầu (PLAY) được chọn sẵn. Dòng phụ viết in hoa
          const drills = PF().drillsPending();
          return [
            { kind: 'btn', nav: 1, label: _t('PLAY'), sub: this.pathSub(), act: () => this.go('party') },
            { kind: 'btn', nav: 0, label: _t('CHARACTER'), sub: drills ? _tn('★ {n} drill card ready!', '★ {n} drill cards ready!', drills) : _t('STATS · APPEARANCE · INVENTORY'), hot: drills > 0, act: () => this.go('char') },
            { kind: 'btn', nav: 2, label: _t('SHOP'), sub: this.shopSub(), hot: Object.values(PF().data.boxes).some((n) => n > 0), act: () => { G().shopBack = 'home'; this.go('shop'); } },
            { kind: 'btn', gear: true, label: _t('SETTINGS'), sub: _t('Sound · display · controls'), act: () => this.go('settings') },
          ].map((it) => Object.assign(it, { sub: it.sub && it.sub.toUpperCase() }));
        }
        case 'settings':
          return [
            { kind: 'btn', label: _t('SOUND & DISPLAY'), sub: ST().desktop ? _t('Music · sound FX · resolution') : _t('Music · sound FX'), act: () => this.go('display') },
            { kind: 'btn', label: _t('CONTROLS'), sub: _t('Keyboard & controller layout'), act: () => { CV().open(); this.go('controls'); } },
            // popup chọn ngôn ngữ (ui/langpick.js); đổi xong vẽ lại trang bằng ngôn ngữ mới
            { kind: 'btn', label: _t('LANGUAGE'), sub: this.langSub(), act: () => SFC.LangPick.open({ done: () => this.render() }) },
            // trang TEST (cheat / thử nghiệm), bản Steam: bị xoá (SFC_DEV)
            ...(SFC_DEV ? [{ kind: 'btn', label: 'TEST', sub: 'Dev only · cheats & test tools', danger: true, act: () => this.go('test') }] : []),
            // xoá toàn bộ tiến trình, chơi lại từ đầu — bấm 2 lần mới xoá (lần 1 chỉ hỏi lại, rời trang là huỷ)
            this.resetArmed
              ? { kind: 'btn', label: _t('CONFIRM RESET'), sub: _t('Press again · this cannot be undone'), danger: true, act: () => this.resetData() }
              : { kind: 'btn', label: _t('RESET DATA'), sub: _t('Erase all progress · start over'), danger: true, act: () => { this.resetArmed = true; this.setMsg(_t('Erase level, stats, Main Path, team, items and gold? Press again to confirm.'), true); } },
          ];
        case 'test':
          // SETTINGS > TEST: mọi nút cheat / thử nghiệm để ở đây. Bản Steam: cả trang bị xoá (SFC_DEV)
          if (SFC_DEV) {
            return [
              // xem lại PROLOGUE (cut scene + trận mơ)
              { kind: 'btn', label: 'PROLOGUE', sub: 'Replay the intro & tutorial match', danger: true, act: () => SFC.Tutorial.begin(this.app) },
              { kind: 'btn', label: 'DRILL TEST', sub: 'Cheat · 5 drill cards · stats reset on close', danger: true, act: () => this.testDrill() },
              // màn LEVEL UP sau trận (thẻ drill vừa nhận) -> lật thẻ -> chọn, không cần đá trận
              { kind: 'btn', label: 'LEVEL UP TEST', sub: 'Cheat · level-up notice + 3 drill cards · stats reset on close', danger: true, act: () => this.testDrill(3, true) },
              // nhảy thẳng tới Area bất kỳ của Main Path (hạng thấp nhất, 0 sao) để thử Area khó. Có ghi hồ sơ
              { kind: 'pick', label: 'JUMP TO AREA', value: this.testAreaLabel(), danger: true, change: (d) => this.testArea(d) },
              // xem thử bản DEMO itch.io (config/demo.config.js): khoá Area 3+ và ONLINE, đến khi tắt game
              { kind: 'btn', label: 'DEMO MODE', sub: SFC_DEMO ? 'ON · itch.io gating · until restart' : 'OFF · preview itch.io gating', danger: true, act: () => { SFC_DEMO = !SFC_DEMO; this.wishSeen = false; this.render(); } },
            ];
          }
          return [];
        case 'display':
          // SETTINGS > SOUND & DISPLAY: lưu ngay khi đổi (meta/settings.js)
          return [
            { kind: 'pick', label: _t('MUSIC'), value: ST().volumeLabel('music'), change: (d) => ST().stepVolume('music', d) },
            { kind: 'pick', label: _t('SOUND FX'), value: ST().volumeLabel('sfx'), change: (d) => ST().stepVolume('sfx', d) },
            // cỡ cửa sổ: chỉ bản desktop (Electron)
            ...(ST().desktop ? [{ kind: 'pick', label: _t('RESOLUTION'), value: ST().resLabel(), change: (d) => ST().stepRes(d) }] : []),
          ];
        case 'name':
          return [{ kind: 'btn', label: _t('CONFIRM'), main: true, act: () => this.submitName() }];
        case 'char': {
          const d = PF().data;
          const nItems = Object.values(d.items).reduce((a, b) => a + b, 0) + Object.values(d.cores).reduce((a, b) => a + b, 0);
          return [
            // còn thẻ drill: OVR vàng + ↑ (mở ở STATS -> USE DRILL CARDS)
            { kind: 'btn', label: _t('STATS'), sub: `${PF().drillsPending() ? '↑ ' : ''}${_t('OVR {n}', { n: PF().ovr() })}`, hot: PF().drillsPending() > 0, act: () => this.go('attrs') },
            // TEAM (đội hình đồng đội, src/ui/team.js) tạm ẩn — logic + trang 'team' vẫn còn
            { kind: 'btn', label: _t('APPEARANCE'), sub: _t('{name} · skin · hair color', { name: d.name }), act: () => this.go('look') },
            { kind: 'btn', label: _t('INVENTORY'), sub: _tn('{n} item · equip · dismantle', '{n} items · equip · dismantle', nItems), act: () => { G().invBack = 'char'; this.go('inv'); } },
          ];
        }
        case 'look': {
          // NGOẠI HÌNH: đổi tên + màu da / tóc (costume ở INVENTORY)
          const d = PF().data, look = d.look, P = PROG();
          return [
            { kind: 'btn', label: _t('RENAME'), sub: d.name, act: () => { this.nameBack = 'look'; this.go('name'); } },
            { kind: 'pick', label: _t('SKIN COLOR'), swatch: SFC_CONFIG.teams.skins[look.skin], change: (dd) => PF().setColor('skin', dd) },
            { kind: 'pick', label: _t('HAIR COLOR'), swatch: P.hairColors[look.hairColor], change: (dd) => PF().setColor('hairColor', dd) },
          ];
        }
        case 'attrs': {
          // STATS (chỉ xem): 1 dòng mỗi chỉ số (↑↓ đổi khung chi tiết) + USE DRILL CARDS khi còn thẻ drill (-> túi đồ)
          const A = ATTRS(), n = PF().drillsPending();
          const list = A.order.map((id) => ({ kind: 'attr', label: A.list[id].label, attr: id, bar: this.attrBar(id) }));
          if (n) list.push({ kind: 'btn', label: _t('USE DRILL CARDS ({n})', { n }), sub: _t('Open a card to raise your stats'), hot: true, act: () => G().openInv(this, 'drill', 'attrs') });
          return list;
        }
        case 'path': {
          // Main Path: không chọn đối thủ / độ khó — BATTLE = tìm trận 2v2 theo Elo (matchmaking giả)
          const MP = MPATH(), st = MP.state, n = MP.areas().length, v = this.pathView;
          const battle = MP.demoOver()
            ? { label: STEAM_SOON() ? _t('COMING SOON TO STEAM') : _t('WISHLIST ON STEAM'), sub: _t('AREA {n}+ is in the full game', { n: st.area + 1 }), act: () => this.go('wishlist') }
            : { label: _t('BATTLE'), sub: `${MP.area(st.area).name} · ${st.elo} ${_t('ELO')}` };
          return [
            { kind: 'btn', label: battle.label, sub: battle.sub, main: true, act: battle.act || (() => this.startSearch()) },
            { kind: 'pick', label: _t('POSITION'), value: this.ctrlLabel(null, s.ctrl), change: (d) => this.changeCtrl(d) },
            { kind: 'pick', label: _t('AREA'), value: `${v + 1}/${n} ${v > st.best || MP.demoLocked(v) ? '???' : MP.area(v).name}`, change: (d) => { this.pathView = wrap(v + d, n); } },
            { kind: 'btn', label: _t('TRAINING'), sub: _t('No clock · pick team sizes'), foot: true, act: () => this.go('training') },
          ];
        }
        case 'party': {
          // phòng chờ PLAY (kiểu Valorant): START = tìm trận Main Path ngay trên màn này (người bạn trong phòng chung đội; đang tìm thì thành CANCEL) ·
          // vị trí · rời phòng · ẩn / hiện khung bạn bè; sau đó là từng dòng bạn bè (kind 'friend': ←→ đổi MỜI / CHAT, Enter làm)
          const MP = MPATH(), SO = SFC.Social, S = this.search;
          const list = [
            MP.demoOver()
              ? { kind: 'btn', main: true, label: STEAM_SOON() ? _t('COMING SOON TO STEAM') : _t('WISHLIST ON STEAM'), act: () => this.go('wishlist') }
              : S && S.lobby ? { kind: 'btn', main: true, found: true, label: _t('MATCH FOUND'), act: () => {} }
              : S ? { kind: 'btn', main: true, searching: true, label: _t('CANCEL'), act: () => this.cancelSearch() }
              : { kind: 'btn', main: true, label: _t('START'), act: () => this.startSearch() },
            { kind: 'pick', label: _t('POSITION'), value: this.ctrlLabel(null, s.ctrl), change: (d) => { if (!this.search) this.changeCtrl(d); } },
          ];
          if (SO.party.length && !S) list.push({ kind: 'btn', side: true, label: _t('LEAVE PARTY'), act: () => SO.leaveParty() });
          list.push({ kind: 'btn', ftoggle: true, label: _t('FRIENDS'), act: () => { this.friendsOpen = !this.friendsOpen; if (!this.friendsOpen && SO.chatWith) this.closeChat(); else this.render(); } });
          if (this.friendsOpen) for (const f of SO.friends()) list.push({ kind: 'friend', id: f.id, label: f.name });
          return list;
        }
        case 'training': {
          // luyện tập: số người đội bạn (1 / 2) · đối thủ (0 / 2). Đội / đối thủ / độ khó / điều khiển dùng chung với Chơi đơn
          const t = app.train, opp = o.opp[s.opp];
          const list = [
            { kind: 'pick', label: _t('YOUR TEAM'), value: TEAMS().list[o.order[s.team]].name, change: (d) => { s.team = wrap(s.team + d, o.order.length); } },
            { kind: 'pick', label: _t('YOUR PLAYERS'), value: _tn('{n} PLAYER', '{n} PLAYERS', t.mine), change: () => { t.mine = t.mine === 1 ? 2 : 1; } },
          ];
          if (t.mine === 2) list.push({ kind: 'pick', label: _t('POSITION'), value: this.ctrlLabel(o.order[s.team], s.ctrl), change: (d) => this.changeCtrl(d) });
          list.push({ kind: 'pick', label: _t('OPPONENTS'), value: t.opp ? _tn('{n} PLAYER', '{n} PLAYERS', t.opp) : _t('NONE'), change: () => { t.opp = t.opp ? 0 : 2; } });
          if (t.opp) {
            list.push({ kind: 'pick', label: _t('OPPONENT TEAM'), value: opp === 'random' ? _t('??? RANDOM') : TEAMS().list[opp].name, change: (d) => { s.opp = wrap(s.opp + d, o.opp.length); } });
            list.push({ kind: 'pick', label: _t('DIFFICULTY'), value: SFC_CONFIG.game.ai.difficulty[o.diffs[s.diff]].label, change: (d) => { s.diff = wrap(s.diff + d, o.diffs.length); } });
          }
          list.push({ kind: 'btn', label: _t('START'), main: true, act: () => app.startTraining() });
          return list;
        }
        case 'online':
          return [
            { kind: 'btn', label: _t('CREATE ROOM'), sub: _t('Get a code to share with friends'), act: () => Session().createRoom() },
            { kind: 'btn', label: _t('JOIN ROOM'), sub: _t('Enter a friend\'s room code'), act: () => this.go('join') },
          ];
        case 'join':
          return [{ kind: 'btn', label: _t('CONNECT'), main: true, act: () => this.submitCode() }];
        case 'wishlist':
          // bản DEMO: hết Area đá được / bấm ONLINE (khung bên phải: wishlistPanel)
          return [
            STEAM_SOON()
              ? { kind: 'btn', label: _t('COMING SOON TO STEAM'), sub: _t('Steam page not live yet'), main: true, act: () => this.setMsg(_t('The Steam page is coming soon!')) }
              : { kind: 'btn', label: _t('WISHLIST ON STEAM'), sub: _t('Opens the Steam page'), main: true, act: () => this.openSteam() },
            { kind: 'btn', label: _t('MAIN PATH'), sub: _t('See your progress'), act: () => this.go('path') },
            { kind: 'btn', label: _t('BACK'), sub: _t('Main menu'), act: () => this.go('home') },
          ];
        case 'lobby': {
          const O = Session(), me = O.mine;
          const list = [];
          // như Main Path: không chọn đội (đá cho CLB riêng) — slot quyết định đội + vị trí character; đồng đội AI ra sân khi đội chỉ có mình bạn
          // SLOT: các slot trống + GUEST (ghế chờ, không ra sân) — phòng đủ 4 người vẫn đổi chỗ được qua ghế chờ
          list.push({ kind: 'pick', label: _t('SLOT'), value: me ? this.slotLabel(me.slot) : '—', change: (d) => O.cycleSlot(d) });
          // đội đã đủ người -> không có đồng đội AI ra sân: khóa chọn đồng đội
          const full = !!me && me.slot >= 0 && O.byTeam()[O.slotTeam(me.slot)].length >= SFC_CONFIG.game.roles.length;
          list.push({ kind: 'pick', label: _t('TEAMMATE'), value: full ? _t('TEAM FULL · NO AI') : this.mateLabel(), disabled: full, change: (d) => { this.changeMate(d); O.updateProfile(); } });
          if (O.isOwner) {
            const sub = O.canStart ? (O.mode === 'coop' ? _t('CO-OP vs random bots') : _t('VERSUS'))
              : O.benched.length ? _t('Everyone on GUEST must take a slot') : _t('Waiting for players...');
            list.push({ kind: 'btn', label: _t('START'), sub, main: true, disabled: !O.canStart, act: () => O.startMatch() });
          }
          list.push({ kind: 'btn', label: _t('LEAVE ROOM'), act: () => O.leave() });
          return list;
        }
        default:
          return [];
      }
    },

    // đồng đội ra sân trận Main Path kế tiếp (đổi trong đội hình)
    mateLabel() { const m = SFC.Mates.active(); return m ? `${m.name} · ${_t('OVR {n}', { n: m.ovr })}` : '—'; },
    changeMate(d) {
      const list = SFC.Mates.roster(), i = list.indexOf(SFC.Mates.active());
      SFC.Mates.setActive(list[wrap(i + d, list.length)].id);
    },
    // dòng phụ nút TEAM: số đồng đội + tình trạng scout
    teamSub() {
      const M = SFC.Mates, n = M.roster().length, max = SFC_CONFIG.teammates.rosterMax;
      if (SFC_CONFIG.teammates.scout === false) return this.mateLabel();   // scout tạm ẩn: chỉ hiện đồng đội đang chọn
      const sc = M.scoutReady() ? _t('★ report ready!') : M.scouting() ? _t('scouting...') : _t('scout idle');
      return _t('{n}/{max} players · {scout}', { n, max, scout: sc });
    },

    // phòng online: slot = đội A (trái) / B (phải) + vị trí
    slotLabel(s) {
      const O = Session();
      if (s < 0) return _t('GUEST · SITTING OUT');
      return _t('TEAM {side} · {role}', { side: 'AB'[O.slotTeam(s)], role: ROLE_LABELS()[O.slotRole(s)] || O.slotRole(s) });
    },

    // chỉ đổi giữa các vị trí (1..roles) — ẩn lựa chọn CẢ ĐỘI (ctrl = 0): người chơi chỉ điều khiển character của mình
    changeCtrl(d) {
      const s = this.app.sel, n = SFC_CONFIG.game.roles.length;
      s.ctrl = wrap((s.ctrl || 1) - 1 + d, n) + 1;
    },

    // chỉ 1 cầu thủ: vị trí xuất phát (CẢ ĐỘI: không còn chọn được trên menu)
    ctrlLabel(teamId, ctrl) {
      if (!ctrl) return _t('WHOLE TEAM');
      // 1 CẦU THỦ: character của bạn đá vị trí này
      const role = SFC_CONFIG.game.roles[ctrl - 1];
      return ROLE_LABELS()[role] || role;
    },

    // SETTINGS > LANGUAGE: tên ngôn ngữ đang dùng, kèm chữ "Language" tiếng Anh để ai lỡ chọn ngôn ngữ mình không đọc được vẫn tìm ra
    langSub() {
      const I = SFC.I18n, cur = I.list().find((l) => l.id === I.lang);
      return (cur ? cur.name : I.lang) + (I.lang === 'en' ? '' : ' · Language');
    },

    back() {
      if (Session().status === 'busy') { Session().cancel(); return; }
      // trang chủ: hỏi thoát game. Trình duyệt không tự đóng tab được -> bản web không làm gì
      if (this.page === 'home') { if (ST().desktop) this.askQuit(); return; }
      if (this.page === 'name') { if (PF().hasName) this.go(this.nameBack); return; } // lần đầu: bắt buộc đặt tên
      if (G().pages.includes(this.page)) return G().back(this);
      if (TM().pages.includes(this.page)) return TM().back(this);
      if (this.page === 'attrs' || this.page === 'look') return this.go('char');
      if (this.page === 'party' && SFC.Social.chatWith) return this.closeChat();
      if (this.page === 'party' && this.search && !this.search.lobby) return this.cancelSearch();
      if (this.page === 'party') return this.go('home');
      if (this.page === 'path') return this.go('party');
      if (this.page === 'training') this.go('path');
      else if (['controls', 'display', 'test'].includes(this.page)) this.go('settings');
      else if (['path', 'online', 'tutorial', 'char', 'settings', 'wishlist'].includes(this.page)) this.go('home');
      else if (this.page === 'join') this.go('online');
      else if (this.page === 'lobby') Session().leave();
    },

    /* ---------------- vẽ ---------------- */
    render() {
      if (!this.el) return;
      const items = this.items();
      if (this.sel >= items.length) this.sel = Math.max(0, items.length - 1);
      this.el.classList.toggle('tut', this.page === 'tutorial' || this.page === 'controls' || G().pages.includes(this.page) || TM().pages.includes(this.page));
      // class riêng của trang chủ / phòng chờ: bật / tắt cả 2 trước mọi nhánh return (sót class 'party' làm vỡ layout trang chủ)
      this.el.classList.toggle('home', this.page === 'home');
      this.el.classList.toggle('party', this.page === 'party');
      this.el.classList.toggle('nofriends', this.page === 'party' && !this.friendsOpen);
      if (this.page === 'home') { this.el.innerHTML = this.renderHome(items); this.bindAvatars(); return; }
      if (this.page === 'party') { this.partyItems = items; this.el.innerHTML = this.renderParty(items); this.bindAvatars(); this.scrollChat(); return; }
      if (this.page === 'tutorial') { this.el.innerHTML = this.renderTutorial(); this.bindAvatars(); return; }
      if (this.page === 'controls') { this.el.innerHTML = CV().render(); this.bindAvatars(); return; }
      if (G().pages.includes(this.page)) { G().render(this); this.bindAvatars(); return; }
      if (TM().pages.includes(this.page)) { TM().render(this); this.bindAvatars(); return; }
      // it.foot: mục nằm dưới đáy cột trái (ngay trên dòng gợi ý phím), thứ tự ↑↓ vẫn theo danh sách
      const list = items.map((it, i) => (it.foot ? '' : this.renderItem(it, i))).join('');
      const foot = items.map((it, i) => (it.foot ? this.renderItem(it, i) : '')).join('');
      const titles = { path: _t('MAIN PATH'), training: _t('TRAINING'), settings: _t('SETTINGS'), display: _t('SOUND & DISPLAY'), test: 'TEST', online: _t('ONLINE'), join: _t('JOIN ROOM'), lobby: _t('LOBBY'), name: _t('YOUR NAME'), char: _t('CHARACTER'), attrs: _t('STATS'), look: _t('APPEARANCE'),
        wishlist: MPATH().demoOver() ? _t('DEMO COMPLETE') : _t('FULL GAME') };
      const small = this.page !== 'home';
      const msg = this.msg ? `<div class="m-msg ${this.msgErr ? 'err' : ''}">${esc(this.msg)}</div>` : '';
      this.el.innerHTML = `
        <div class="m-left">
          <div class="logo ${small ? 'small' : ''}">
            <div class="l1">STREET</div><div class="l2">FOOTBALL</div><div class="l3">CHAOS</div>
            ${small ? '' : `<div class="tag">${esc(_t('Football meets Arcade Combat'))}</div>`}
          </div>
          ${titles[this.page] ? `<div class="m-title">${esc(titles[this.page])}</div>` : ''}
          ${this.page === 'join' ? this.renderCode() : ''}
          ${this.page === 'name' ? this.renderNameInput() : ''}
          ${this.page === 'lobby' ? this.renderRoomCode() : ''}
          <div class="m-items">${list}</div>
          ${msg}
          ${foot ? `<div class="m-items m-foot">${foot}</div>` : ''}
          <div class="m-hint">${this.hint()}</div>
        </div>
        <div class="m-right">${this.renderRight()}</div>
        ${this.quitAsk ? this.renderQuit() : ''}`;
      this.bindAvatars();
    },

    /* ---------- hộp QUIT GAME? (trang chủ, Esc / Back) ---------- */
    askQuit() {
      this.quitAsk = true;
      this.quitSel = 1;   // mặc định CANCEL: bấm Enter nhầm không thoát
      this.render();
    },

    quitInput(input) {
      if (input.wasPressed('pause') || input.wasPressed('back')) return this.quitPick(false);
      if (['left', 'right', 'up', 'down'].some((k) => input.wasPressed(k))) { this.quitSel = 1 - this.quitSel; SFC.Audio.menu(); this.render(); }
      if (input.wasPressed('confirm')) this.quitPick(this.quitSel === 0);
    },

    quitPick(yes) {
      SFC.Audio.menu();
      if (yes) { window.SFC_DESKTOP.quit(); return; }
      this.quitAsk = false;
      this.render();
    },

    renderQuit() {
      const b = (label, i) => `<button class="${i === this.quitSel ? 'sel' : ''}" data-quit="${i}">${label}</button>`;
      return `<div class="quit-pop"><div class="quit-box">
          <div class="pause-title">${esc(_t('QUIT GAME?'))}</div>
          <div class="pause-items row-items">${b(esc(_t('QUIT')), 0)}${b(esc(_t('CANCEL')), 1)}</div>
        </div></div>`;
    },

    renderItem(it, i) {
      // it.locked: trông như bị khoá nhưng vẫn bấm được (bản DEMO: ONLINE -> màn WISHLIST)
      const cls = ['mi', it.kind, i === this.sel ? 'sel' : '', it.main ? 'main' : '', it.disabled ? 'dis' : '', it.locked ? 'locked' : '', it.hot ? 'hot' : '', it.danger ? 'danger' : ''].join(' ');
      // dòng chỉ số (trang STATS, chỉ xem): tên · rating + thanh
      if (it.kind === 'attr') return `<div class="${cls}" data-i="${i}"><label>${esc(it.label)}</label><div class="st-val">${it.bar}</div></div>`;
      if (it.kind === 'pick') {
        const val = it.swatch ? `<i class="swatch" style="background:${it.swatch}"></i>` : esc(it.value);
        return `<div class="${cls}" data-i="${i}"><label>${esc(it.label)}</label>
          <div class="picker"><button data-i="${i}" data-d="-1">◀</button><span>${val}</span><button data-i="${i}" data-d="1">▶</button></div></div>`;
      }
      return `<button class="${cls}" data-i="${i}"><span class="mi-label">${esc(it.label)}</span>${it.subHtml || it.sub ? `<span class="mi-sub">${it.subHtml || esc(it.sub)}</span>` : ''}</button>`;
    },

    hint() {
      const K = (a, kb) => SFC.Input.key(a, kb), ok = K('confirm', 'Enter'), back = K('back', 'Esc');
      if (this.page === 'home') return _t('{ok} select · {mute} mute', { ok, mute: K('mute', 'M') });
      if (this.page === 'join') return _t('Type the code · Enter connect · {back} back', { back });
      if (this.page === 'name') return PF().hasName ? _t('Type a name (A-Z, 0-9) · Enter confirm · {back} back', { back }) : _t('Type a name (A-Z, 0-9) · Enter confirm');
      if (this.page === 'attrs') return _t('↑↓ select · {back} back', { back });
      if (this.page === 'lobby') return _t('↑↓ select · ←→ change slot / teammate · click a slot / GUEST to move') + (Session().isOwner ? ` · ${_t('{ok} start', { ok })}` : '') + ` · ${_t('{key} leave room', { key: K('pause', 'Esc') })}`;
      return _t('↑↓ select · ←→ change · {ok} · {back} back', { ok, back });
    },

    renderRight() {
      const s = this.app.sel, o = this.options();
      if (this.page === 'home') return this.profileCard();
      if (this.page === 'name') return `<div class="char-stage"><canvas class="avatar big" data-avatar="spin"></canvas><div class="char-name">${esc(this.nameBuf || '???')}</div></div>`;
      if (this.page === 'char') return this.charPanel();
      if (this.page === 'look') return `<div class="char-stage"><canvas class="avatar big" data-avatar="spin"></canvas><div class="char-name">${esc(PF().data.name)}</div></div>`;
      if (this.page === 'attrs') return this.attrsPanel();
      if (this.page === 'path') return this.pathPanel();
      if (this.page === 'wishlist') return this.wishlistPanel();
      if (this.page === 'training') return teamCard(o.order[s.team], '');
      if (this.page === 'lobby') {
        const O = Session(), n = O.lobby.members.length, max = SFC_CONFIG.net.maxPlayers;
        if (!n) return `<div class="lobby"><div class="lb-note">${esc(_t('Loading room...'))}</div></div>`;
        const coop = O.mode === 'coop';
        const bench = O.benched;
        const note = (s, cls = '') => `<div class="lb-note ${cls}">${esc(s)}</div>`;
        const status = bench.length ? note(_t('Players on GUEST must take a slot before the match starts'))
          : O.isOwner
            ? (O.canStart ? note(coop ? _t('Ready. Press Enter to start CO-OP') : _t('Ready. Press Enter to start VERSUS'), 'ok') : note(_t('Send the room code to friends to play')))
            : note(_t('Waiting for the host to start...'));
        // ghế chờ GUEST: không ra sân, dùng để đổi chỗ khi phòng đủ 4 người (bấm để ngồi ra)
        const meId = O.mine && O.mine.id;
        const benchList = bench.map((m) => `<b class="${m.id === meId ? 'me' : ''}">P${O.lobby.members.indexOf(m) + 1} ${esc(m.pf.name)}</b>`).join('');
        const benchRow = `<div class="lb-bench ${O.mine && O.mine.slot < 0 ? 'on' : ''}" data-slot="-1"><u>${esc(_t('GUEST'))}</u>${benchList || `<span>${esc(_t('Sit out here to free your slot for a swap'))}</span>`}</div>`;
        // chế độ theo cách mọi người đứng: 2 đội có người = VERSUS, chung 1 đội = CO-OP (đội kia bot)
        const mode = coop
          ? `<div class="lb-mode coop">${esc(_t('CO-OP'))} <span>· ${esc(_t('same team vs random bots'))} · ${n}/${max}</span></div>`
          : `<div class="lb-mode">${esc(_t('VERSUS'))} <span>· ${esc(_t('{n}/{max} players', { n, max }))}</span></div>`;
        return `<div class="lobby">
          ${mode}
          ${lobbyTeam(0)}
          <div class="vs">${esc(_t('VS'))}</div>
          ${lobbyTeam(1)}
          ${benchRow}
          ${status}
        </div>`;
      }
      return '';
    },

    renderCode() {
      const n = SFC_CONFIG.net.codeLength;
      let boxes = '';
      for (let i = 0; i < n; i++) {
        const ch = this.code[i] || '';
        boxes += `<span class="cb ${i === this.code.length ? 'cur' : ''}">${esc(ch)}</span>`;
      }
      return `<div class="code-in">${boxes}</div>`;
    },

    renderRoomCode() {
      const code = Session().code || '-'.repeat(SFC_CONFIG.net.codeLength);
      return `<div class="room-code" title="${esc(_t('Click to copy'))}"><span class="rc-label">${esc(_t('ROOM CODE'))}</span><b data-copy="${esc(code)}">${esc(code)}</b></div>`;
    },

    renderTutorial() {
      const pages = SFC_CONFIG.tutorial.pages;
      const p = pages[this.tutPage];
      const tabs = pages.map((pg, i) => `<button class="tab ${i === this.tutPage ? 'sel' : ''}" data-tab="${i}">${esc(pg.title)}</button>`).join('');
      let body = '';
      if (p.lines) {
        body += p.lines.map((l) => (l[0] === '#' ? `<h4>${esc(l.slice(1).trim())}</h4>` : `<p>${esc(l)}</p>`)).join('');
      }
      if (p.type === 'controls') {
        const h = SFC.Input.helpSet();
        body += `<div class="help">
          <div class="help-col"><h4>ATTACK</h4>${helpTable(h.attack)}</div>
          <div class="help-col"><h4>DEFENSE</h4>${helpTable(h.defense)}<h4>TEAMMATE ON THE BALL</h4>${helpTable(h.teammateHasBall)}</div>
          <div class="help-col"><h4>SYSTEM</h4>${helpTable(h.system)}</div>
        </div>`;
      }
      if (p.type === 'cores') {
        const C = SFC_CONFIG.cores;
        const groups = Object.keys(C.archetypes).map((cat) => {
          const c = C.archetypes[cat];
          const list = Object.keys(C.list).filter((id) => C.list[id].tags[0] === cat)
            .map((id) => `<div class="core-row" title="${esc(SFC.CoreScale.plain(id))}"><span class="chip" style="--c:${c.color}">${PX().core(id)}</span>${esc(C.list[id].name)}</div>`).join('');
          return `<div class="core-group"><h4 style="color:${c.color}">${esc(c.label)}</h4>${list}</div>`;
        }).join('');
        body += `<div class="core-grid">${groups}</div>`;
      }
      return `
        <div class="tut-head"><div class="m-title">HOW TO PLAY</div><div class="tabs">${tabs}</div></div>
        <div class="tut-body">${body}</div>
        <div class="m-hint">←→ change page · ${SFC.Input.key('back', 'Esc')} back</div>`;
    },

    // dòng phụ của nút SHOP: báo hộp miễn phí đang chờ mở (thưởng lên hạng Main Path)
    shopSub() {
      const free = Object.values(PF().data.boxes).reduce((a, b) => a + b, 0);
      if (free) return _tn('{n} free box to open!', '{n} free boxes to open!', free);
      return PROG().coreGacha ? _t('Gacha boxes · costumes & Cores') : _t('Gacha boxes · costumes');
    },

    /* ---------------- Main Path ---------------- */
    // dòng phụ của nút MAIN PATH ở trang chủ: Area + Elo hiện tại
    pathSub() {
      const MP = MPATH(), st = MP.state;
      if (MP.demoOver()) return _t('DEMO COMPLETE · FULL GAME ON STEAM');
      return `${MP.area(st.area).name} · ${st.elo} ${_t('ELO')}`;
    },

    // thẻ Area kiểu Clash Royale: ảnh sân, khoảng Elo + Elo của bạn, Tuyệt kỹ thưởng lần đầu tới Area, chấm chuyển Area
    pathPanel() {
      const MP = MPATH(), st = MP.state, v = this.pathView, A = MP.area(v), next = MP.area(v + 1);
      // Area chưa từng tới: silhouette + ??? (tên, sân, phần thưởng đều ẩn). Bản DEMO: Area bị khoá cũng vậy, kể cả Area đang đứng
      const demo = MP.demoLocked(v), locked = v > st.best || demo, here = v === st.area;
      const state = demo ? `${PX().ui('lock', 'sm')} ${esc(_t('FULL GAME'))}` : locked ? `${PX().ui('lock', 'sm')} ${esc(_t('LOCKED'))}`
        : here ? `${esc(_t('YOU ARE HERE'))} · ${st.elo} ${esc(_t('ELO'))}` : v < st.area ? `${PX().ui('check', 'sm')} ${esc(_t('PASSED'))}` : `${PX().ui('check', 'sm')} ${esc(_t('REACHED'))}`;
      const range = next ? `${A.elo} – ${next.elo - 1}` : `${A.elo}+`;
      // thanh Elo: Area đang đứng = vị trí của bạn trong khoảng; Area dưới = đầy; Area trên = rỗng
      const pct = here ? Math.round(Math.max(0, Math.min(1, MP.frac(st.elo, v))) * 100) : v < st.area ? 100 : 0;
      const eloRow = `<div class="pe"><span>${esc(_t('ELO'))} ${esc(range)}</span>
        <div class="pe-bar"><i style="width:${pct}%"></i></div>
        <span>${here && next ? esc(_t('{n} to next', { n: next.elo - st.elo })) : ''}</span></div>`;
      // thưởng lần đầu tới Area: Tuyệt kỹ (đã có thì sáng). Area 1 / Area chưa có Tuyệt kỹ: chỉ thưởng gold + XP
      const ult = !locked && SFC_CONFIG.cores.list[A.ult], got = !!ult && PF().coreUnlocked(A.ult);
      const reward = locked
        ? `<div class="pu unk"><i>${PX().ui('unknown', 'x2')}</i><div><b>???</b><span>${esc(_t('Reach this Area to find out'))}</span></div></div>`
        : ult ? `<div class="pu ${got ? 'got' : ''}" title="${esc(SFC.CoreScale.plain(A.ult))}"><i>${PX().core(A.ult, 'x2')}</i><div><b>${esc(ult.name)}</b>
            <span>${esc(_t('ULTIMATE'))} · ${got ? `${PX().ui('check', 'sm')} ${esc(_t('UNLOCKED'))}` : esc(_t('first time you reach this Area'))}</span></div></div>`
        : `<div class="pu none"><i>${PX().ui('star', 'x2')}</i><div><b>${esc(v === 0 ? _t('STARTING AREA') : _t('NEW ULTIMATE COMING SOON'))}</b><span>${esc(_t('Gold & XP after every match'))}</span></div></div>`;
      // "con đường": 10 Area nối nhau, Area đang xem nổi lên, Area đang đá có cờ, chưa tới thì dạng bóng đen
      const dots = MP.areas().map((a, i) => {
        const lk = i > st.best || MP.demoLocked(i);
        return `<i class="${i === v ? 'sel' : ''} ${lk ? 'lock' : i < st.area ? 'done' : i === st.area ? 'cur' : ''}" style="--c:${lk ? '#5a4658' : a.color}" data-parea="${i}" title="${lk ? '???' : esc(a.name)}">${lk ? PX().ui('unknown') : PX().area(a.id)}</i>`;
      }).join('');
      const name = locked ? '???' : esc(A.name);
      return `<div class="path ${locked ? 'locked' : ''}" style="--ac:${locked ? '#6a5f6e' : A.color}">
        <div class="ph"><span class="ph-num">${esc(_t('AREA {n}', { n: v + 1 }))}</span><span class="ph-name">${locked ? PX().ui('unknown') : PX().area(A.id)} ${name}</span><span class="ph-state">${state}</span></div>
        <div class="ph-sub">${locked ? '???' : esc(A.sub)}${locked || A.reward === 1 ? '' : ` · <span class="ph-cores">${esc(_t('REWARDS ×{n}', { n: A.reward }))}</span>`}</div>
        <div class="ph-ovr">${esc(_t('YOUR OVR'))} <b>${PF().ovr()}</b> · ${esc(_t('PLAYERS OVR'))} <b>${locked ? '??' : this.areaOvr(v)}</b></div>
        <div class="pa"><canvas data-arena="${v}" width="300" height="112"></canvas>${locked ? `<div class="pa-lock"><b>???</b>${PX().ui('lock', 'x2')}<span>${esc(demo ? (STEAM_SOON() ? _t('Full game only · coming soon to Steam') : _t('Full game only · wishlist on Steam')) : _t('Reach {n} ELO to unlock', { n: A.elo }))}</span></div>` : ''}</div>
        ${eloRow}
        ${reward}
        <div class="proad">${dots}</div>
      </div>`;
    },

    /* ---------------- tìm trận: người thật (SFC.Session.queue, máy chủ riêng) hoặc người chơi giả (SFC.MainPath.matchmake) ---------------- */
    // tìm trận ngay trên phòng chờ (gọi từ chỗ khác: BATTLE ở Main Path, NEXT MATCH sau trận -> chuyển về phòng chờ rồi tìm)
    // một mình (không có bạn trong phòng): vào hàng chờ tìm người thật; không ghép được (solo) -> người chơi giả như cũ.
    // 2 cách hiện giống hệt nhau: SEARCHING -> MATCH FOUND (2 đối thủ + Elo) -> vào trận
    startSearch() {
      const M = SFC_CONFIG.mainPath.matchmaking;
      if (this.page !== 'party') this.go('party');
      const online = !SFC.Social.party.length;
      this.search = { t: 0, wait: M.searchTime[0] + Math.random() * (M.searchTime[1] - M.searchTime[0]), lobby: null, hold: 0, online };
      SFC.Audio.pick();
      if (online) Session().queue();   // không có máy chủ -> solo ngay trong lúc gọi
      this.render();
    },
    cancelSearch() {
      this.dropSearch();
      this.render();
    },
    // bỏ lượt tìm đang chạy: còn trong hàng chờ thì rời hàng; đã ghép người thật (đang hiện MATCH FOUND) thì rời phòng
    dropSearch() {
      const S = this.search;
      this.search = null;
      if (S && S.online) Session().leave();
    },
    // không ghép được người thật -> ghép người chơi giả khi tới giờ (searchTick)
    searchSolo() {
      if (this.search && this.search.online && !this.search.lobby) this.search.online = false;
    },
    // ghép được người thật: trận đã dựng (trận "gương"), hiện MATCH FOUND như ghép người chơi giả rồi vào trận
    searchFound(game) {
      const S = this.search;
      if (!S || !S.online || S.lobby || this.page !== 'party' || this.app.screen !== 'menu') { Session().leave(); return; }
      S.found = game;
    },
    // mỗi khung hình (animate): đồng hồ chờ + khoảng Elo nới dần; tới giờ thì ghép trận, hiện MATCH FOUND rồi vào trận
    searchTick(dt) {
      const S = this.search;
      if (!S) return;
      if (this.page !== 'party') { this.dropSearch(); return; }   // rời phòng chờ = huỷ tìm
      const M = SFC_CONFIG.mainPath.matchmaking;
      S.t += dt;
      if (!S.lobby) {
        const time = this.el.querySelector('[data-mm-time]'), range = this.el.querySelector('[data-mm-range]');
        if (time) time.textContent = SFC.U.fmtTime(S.t);
        if (range) range.textContent = `± ${Math.round(SFC.U.lerp(M.range[0], M.range[1], Math.min(1, S.t / M.searchTime[1])))}`;
        // người thật: hiện MATCH FOUND sau ít nhất searchTime[0] giây (như ghép người chơi giả)
        if (S.found && S.t >= M.searchTime[0]) {
          const g = S.found;
          S.lobby = { game: g, opps: g.teams[1 - g.humanTeam].players.map((p) => ({ name: p.name, elo: p.elo != null ? p.elo : '' })) };
        } else if (!S.online && S.t >= S.wait) {
          const SO = SFC.Social;
          S.lobby = MPATH().matchmake(S.t, this.app.myRole(), SO.party.length ? (r) => SO.partyMate(r) : null);
        }
        if (S.lobby) { SFC.Audio.reveal(2); this.render(); }
        return;
      }
      S.hold += dt;
      if (S.hold >= M.foundHold) {
        const lb = S.lobby;
        this.search = null;
        if (!lb.game) this.app.startRanked(lb);
        // trận người thật vẫn còn (chưa rớt mạng) -> vào trận; rớt rồi thì ghép người chơi giả luôn
        else if (Session().game === lb.game) this.app.enterOnline(lb.game);
        else this.app.startRanked(MPATH().matchmake(S.t, this.app.myRole(), null));
      }
    },

    // vẽ ảnh sân của Area vào canvas thẻ (cắt khung quanh sân)
    drawArena(cv) {
      const MP = MPATH(), A = MP.area(+cv.dataset.arena);
      const img = SFC.Background.thumb(A.arena, SFC_CONFIG.mainPath.playerTeam.id, A.teams[A.teams.length - 1]);
      const ctx = cv.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 20, 22, 600, 224, 0, 0, cv.width, cv.height);
      // Area chưa tới (bản DEMO: cả Area bị khoá): phủ tối gần hết, chỉ còn lờ mờ đường nét sân. data-tease: màn WISHLIST, khoe sân
      const a = +cv.dataset.arena;
      if (!cv.dataset.tease && (a > MP.state.best || MP.demoLocked(a))) { ctx.fillStyle = 'rgba(7,5,10,0.86)'; ctx.fillRect(0, 0, cv.width, cv.height); }
    },

    /* ---------------- bản DEMO (itch.io) ---------------- */
    // màn WISHLIST: khoe Area kế tiếp + phần còn lại của bản đầy đủ (số Area, Core, online)
    wishlistPanel() {
      const MP = MPATH(), D = SFC_CONFIG.demo, next = MP.area(D.areas), over = MP.demoOver();
      const rest = MP.areas().slice(D.areas);
      const ults = rest.filter((a) => SFC_CONFIG.cores.list[a.ult]).length;
      return `<div class="path wish" style="--ac:${next.color}">
        <div class="ph"><span class="ph-num">${esc(over ? _t('DEMO COMPLETE') : _t('FULL GAME ONLY'))}</span><span class="ph-state">${esc(STEAM_SOON() ? _t('COMING SOON') : _t('ON STEAM'))}</span></div>
        <div class="wl-head">${esc(over ? _t('THANKS FOR PLAYING!') : _t('ONLINE IS LOCKED'))}</div>
        <div class="ph-sub">${esc(over ? _t('You reached {n} ELO. The road goes on in the full game.', { n: MP.state.elo }) : _t('Online versus & co-op come with the full game.'))}</div>
        <div class="pa"><canvas data-arena="${D.areas}" data-tease="1" width="300" height="112"></canvas>
          <div class="wl-next"><span>${esc(_t('NEXT · AREA {n}', { n: D.areas + 1 }))}</span><b>${PX().area(next.id)} ${esc(next.name)}</b></div></div>
        <ul class="wl-list">
          <li>${PX().ui('crown', 'sm')}<span>${_tn('<b>{n} more Area</b> up to the World Stage', '<b>{n} more Areas</b> up to the World Stage', rest.length)}</span></li>
          <li>${PX().ui('card', 'sm')}<span>${_tn('<b>{n} more Ultimate</b> to unlock', '<b>{n} more Ultimates</b> to unlock', ults)}</span></li>
          <li>${PX().ui('fist', 'sm')}<span>${_t('<b>Online</b> versus & co-op · 2-4 players')}</span></li>
        </ul>
        <div class="wl-cta">${esc(STEAM_SOON() ? _t('The full game is coming soon to Steam') : _t('Wishlist now so Steam tells you the day it launches'))}</div>
      </div>`;
    },

    // trang Steam (config/demo.config.js): desktop mở bằng trình duyệt của máy (electron/preload.js), web mở tab mới
    openSteam() {
      const url = SFC_CONFIG.demo.steamUrl;
      if (window.SFC_DESKTOP && window.SFC_DESKTOP.openUrl) window.SFC_DESKTOP.openUrl(url);
      else window.open(url, '_blank', 'noopener');
      this.setMsg(_t('Steam page opened in your browser.'));
    },

    /* ---------------- nhập liệu ---------------- */
    /* ---------------- hồ sơ / nhân vật ---------------- */
    // kit dùng để vẽ character ngoài trận: áo đội đang chọn ở Chơi đơn
    kit() { return TEAMS().list[this.options().order[this.app.sel.team]].kit; },

    /* ---------------- phòng chờ PLAY + bạn bè (placeholder: SFC.Social) ---------------- */
    // giữa: tab chế độ · 2 ô người chơi (bạn + 1 người bạn / ô trống mời) · mô tả · LEAVE / START / MAIN PATH. Phải: khung bạn bè + chat
    renderParty(items) {
      const MP = MPATH(), st = MP.state, A = MP.area(st.area), SO = SFC.Social, d = PF().data;
      const at = (pred) => items.findIndex(pred), sel = (i) => (i === this.sel ? 'sel' : '');
      const iStart = at((x) => x.main), iPos = at((x) => x.kind === 'pick');
      const btn = (i) => (i < 0 ? '' : `<button class="pt-btn ${items[i].main ? 'go' : ''} ${items[i].searching ? 'searching' : ''} ${items[i].found ? 'found' : ''} ${sel(i)}" data-i="${i}">${esc(items[i].label)}</button>`);
      const posItem = items[iPos];
      // ô người chơi: dải tên vàng + READY như Valorant, nhân vật pixel, Elo / OVR / vị trí
      const roles = SFC_CONFIG.game.roles, myRole = this.app.myRole(), mateRole = roles.find((r) => r !== myRole) || roles[0];
      const card = (o) => `<div class="pt-card ${o.you ? 'you' : ''}" style="--ac:${o.color}">
          <div class="pt-art"><canvas class="avatar big" ${o.you ? 'data-avatar="spin"' : `data-mmlook="${esc(JSON.stringify(o.look))}" data-mmaway="0"`}></canvas></div>
          <div class="pt-ready">${esc(o.tag)}</div>
          <div class="pt-name">${esc(o.name)}</div>
          <div class="pt-meta"><span>${o.elo} ${esc(_t('ELO'))}</span><span>${esc(_t('OVR {n}', { n: o.ovr }))}</span></div>
          ${o.you ? `<div class="pt-pos ${sel(iPos)}" data-i="${iPos}"><b data-i="${iPos}" data-d="-1">◀</b>${esc(posItem.value)}<b data-i="${iPos}" data-d="1">▶</b></div>`
            : `<div class="pt-pos">${esc(ROLE_LABELS()[mateRole] || mateRole)}</div>`}
          ${o.kick ? `<button class="pt-kick" data-kick="${o.id}" title="${esc(_t('KICK'))}">✕</button>` : ''}
        </div>`;
      const slots = [card({ you: true, name: d.name, elo: st.elo, ovr: PF().ovr(), tag: _t('READY'), color: A.color })];
      const mate = SO.friend(SO.party[0]);
      if (mate) slots.push(card({ name: mate.name, elo: mate.elo, ovr: mate.ovr, tag: _t('READY'), color: A.color, look: this.friendLook(mate), kick: true, id: mate.id }));
      else slots.push(`<button class="pt-card empty" data-invite="1"><b>+</b><span>${esc(_t('INVITE A FRIEND'))}</span></button>`);
      // đang tìm trận: đồng hồ + khoảng Elo (searchTick cập nhật số mỗi khung hình) · tìm thấy: MATCH FOUND + 2 đối thủ
      const S = this.search, M = SFC_CONFIG.mainPath.matchmaking;
      const status = !S ? ''
        : S.lobby ? `<div class="pt-search found"><b>${esc(_t('MATCH FOUND'))}</b><span>${esc(_t('VS'))} ${S.lobby.opps.map((o) => `${esc(o.name)} <em>${o.elo}</em>`).join(' · ')}</span></div>`
        : `<div class="pt-search"><b>${esc(_t('SEARCHING FOR PLAYERS'))}<span class="mm-dots"><i>.</i><i>.</i><i>.</i></span></b>
            <span><i class="pt-time" data-mm-time>${SFC.U.fmtTime(S.t)}</i> · ${esc(_t('ELO RANGE'))} <i data-mm-range>± ${Math.round(SFC.U.lerp(M.range[0], M.range[1], Math.min(1, S.t / M.searchTime[1])))}</i> · ${esc(_t('same Area first'))}</span></div>`;
      const iTog = at((x) => x.ftoggle), tog = items[iTog];
      const toggle = `<button class="pt-ftoggle ${sel(iTog)} ${this.friendsOpen ? 'open' : ''}" data-i="${iTog}">${esc(tog.label)} <em>${SO.onlineCount()}</em> ${this.friendsOpen ? '▶' : '◀'}</button>`;
      const sideBtns = items.map((x, i) => (x.side ? btn(i) : '')).join('');
      const msg = this.msg ? `<div class="m-msg ${this.msgErr ? 'err' : ''}">${esc(this.msg)}</div>` : '';
      return `<div class="pt-main">
          <div class="pt-tabs"><span class="pt-tab on">${esc(_t('RANKED'))}</span><span class="pt-area" style="color:${A.color}">${PX().area(A.id, 'sm')} ${esc(A.name)} · ${st.elo} ${esc(_t('ELO'))}</span></div>
          ${toggle}
          <div class="pt-slots">${slots.join('')}</div>
          ${status}
          ${msg}
          <div class="pt-acts"><div class="pt-side-btns">${sideBtns}</div>${btn(iStart)}</div>
        </div>
        ${this.friendsOpen ? this.friendPanel(items) : ''}
        <button class="pt-back" data-back="1">◀ ${esc(_t('BACK'))}</button>`;
    },
    friendLook(f) { return PF().lookOf(Object.assign({}, PROG().defaultLook, f.look)); },
    // khung bạn bè (phải): tên bạn · số bạn online · từng dòng bạn bè (dòng đang chọn hiện nút MỜI / CHAT) · khung chat ở đáy
    friendPanel(items) {
      const SO = SFC.Social, d = PF().data, _st = { online: _t('Online'), match: _t('In a match'), offline: _t('Offline') };
      const rows = items.map((it, i) => {
        if (it.kind !== 'friend') return '';
        const f = SO.friend(it.id), stt = SO.status[f.id], on = i === this.sel;
        const status = SO.inParty(f.id) ? _t('In your party') : SO.pending[f.id] ? _t('Invite sent...') : SO.typing[f.id] ? _t('typing...') : _st[stt];
        const unread = SO.unread[f.id] ? `<i class="fr-unread">${SO.unread[f.id]}</i>` : '';
        const acts = on ? `<div class="fr-acts">
            <button class="${this.frAct === 0 ? 'on' : ''} ${SO.canInvite(f.id) ? '' : 'off'}" data-fr="${f.id}" data-fa="invite">${esc(_t('INVITE'))}</button>
            <button class="${this.frAct === 1 ? 'on' : ''}" data-fr="${f.id}" data-fa="chat">${esc(_t('CHAT'))}</button></div>` : '';
        return `<div class="fr-row ${on ? 'sel' : ''} st-${SO.inParty(f.id) ? 'party' : stt}" data-i="${i}">
            <canvas class="avatar" data-mmlook="${esc(JSON.stringify(this.friendLook(f)))}" data-mmaway="0"></canvas>
            <div class="fr-info"><b>${esc(f.name)}</b><span><i class="fr-dot"></i>${esc(status)}</span></div>${unread}${acts}</div>`;
      }).join('');
      return `<div class="pt-friends">
          <div class="fr-me"><canvas class="avatar" data-avatar="spin"></canvas><div><b>${esc(d.name)}</b><span><i class="fr-dot"></i>${esc(_t('Online'))}</span></div></div>
          <div class="fr-head">${esc(_t('FRIENDS'))} <em>${SO.onlineCount()}/${SO.data.friends.length} ${esc(_t('ONLINE'))}</em></div>
          <div class="fr-list">${rows}</div>
          ${SO.chatWith ? this.chatBox() : ''}
        </div>`;
    },
    chatBox() {
      const SO = SFC.Social, f = SO.friend(SO.chatWith), me = PF().data.name;
      const lines = SO.chat(f.id).map((m) => `<div class="ch-line ${m.me ? 'me' : ''}"><b>${esc(m.me ? me : f.name)}:</b> ${esc(m.txt)}</div>`).join('');
      const typing = SO.typing[f.id] ? `<div class="ch-typing">${esc(_t('{name} is typing...', { name: f.name }))}</div>` : '';
      const off = SO.status[f.id] === 'offline' ? `<div class="ch-typing">${esc(_t('{name} is offline', { name: f.name }))}</div>` : '';
      return `<div class="pt-chat">
          <div class="ch-head"><b>${esc(f.name)}</b><button data-chatclose="1">✕</button></div>
          <div class="ch-lines">${lines || `<div class="ch-typing">${esc(_t('Say hi!'))}</div>`}${typing}${off}</div>
          <div class="ch-in"><span data-chatbuf>${esc(this.chatBuf || '')}</span><i class="caret"></i></div>
        </div>`;
    },
    renderChatInput() { const el = this.el.querySelector('[data-chatbuf]'); if (el) el.textContent = this.chatBuf; },
    scrollChat() { const el = this.el.querySelector('.ch-lines'); if (el) el.scrollTop = el.scrollHeight; },
    openChat(id) {
      SFC.Social.openChat(id);
      this.chatBuf = '';
      this.setTextMode('chat');
      this.render();
    },
    closeChat() {
      SFC.Social.closeChat();
      this.setTextMode(null);
      this.render();
    },
    friendAction(id, act) {
      const SO = SFC.Social, f = SO.friend(id);
      if (!f) return;
      if (act === 'chat') return this.openChat(id);
      if (!SO.canInvite(id)) {
        SFC.Audio.menu();
        const why = SO.inParty(id) ? _t('{name} is already in your party', { name: f.name }) : SO.pending[id] ? _t('Invite already sent')
          : SO.partyFull() ? _t('Your party is full (max {n})', { n: SFC_CONFIG.social.partyMax }) : _t('{name} is offline', { name: f.name });
        return this.setMsg(why, true);
      }
      SO.invite(id);
      SFC.Audio.pick();
      this.setMsg(_t('Invite sent to {name}', { name: f.name }));
    },
    // phím riêng phòng chờ: đang chat thì Enter gửi; dòng bạn bè: ←→ đổi MỜI / CHAT, Enter làm. Trả về true = đã xử lý
    partyInput(input, items) {
      const SO = SFC.Social;
      if (SO.chatWith) {
        if (input.wasPressed('confirm') && this.chatBuf.trim()) { SO.send(SO.chatWith, this.chatBuf); this.chatBuf = ''; SFC.Audio.menu(); this.render(); }
        return true;
      }
      const it = items[this.sel];
      if (!it || it.kind !== 'friend') return false;
      if (input.wasPressed('up')) this.move(-1);
      if (input.wasPressed('down')) this.move(1);
      if (input.wasPressed('left') || input.wasPressed('right')) { this.frAct = 1 - (this.frAct || 0); SFC.Audio.menu(); this.render(); }
      if (input.wasPressed('confirm')) this.friendAction(it.id, this.frAct === 1 ? 'chat' : 'invite');
      return true;
    },

    // trang chủ: logo (trái trên) · bánh răng SETTINGS (phải trên) · thanh điều hướng đáy, PLAY là tab hình thang ở giữa
    renderHome(items) {
      const nav = items.map((it, i) => Object.assign({ i }, it)).filter((it) => it.nav != null).sort((a, b) => a.nav - b.nav);
      const gi = items.findIndex((it) => it.gear);
      const tab = (it) => `<button class="hn-tab ${it.label === _t('PLAY') ? 'play' : ''} ${it.i === this.sel ? 'sel' : ''} ${it.hot ? 'hot' : ''}" data-i="${it.i}">
          <span class="hn-label">${esc(it.label)}</span><span class="hn-sub">${it.subHtml || esc(it.sub || '')}</span><i class="hn-pip"></i></button>`;
      const msg = this.msg ? `<div class="m-msg ${this.msgErr ? 'err' : ''}">${esc(this.msg)}</div>` : '';
      return `<div class="hm-top">
          <div class="hm-left">
            <div class="logo"><div class="l1">STREET</div><div class="l2">FOOTBALL</div><div class="l3">CHAOS</div></div>
            ${msg}
          </div>
          <div class="hm-right">
            <button class="hm-gear ${gi === this.sel ? 'sel' : ''}" data-i="${gi}" title="${esc(_t('SETTINGS'))}">${PX().ui('gear', 'x2')}</button></div>
        </div>
        <div class="hm-nav">${nav.map(tab).join('')}</div>
        ${this.quitAsk ? this.renderQuit() : ''}`;
    },
    homeInput(input, items) {
      const nav = items.map((it, i) => ({ it, i })).filter((x) => x.it.nav != null).sort((a, b) => a.it.nav - b.it.nav).map((x) => x.i);
      const gi = items.findIndex((it) => it.gear), cur = nav.indexOf(this.sel);
      let to = this.sel;
      if (input.wasPressed('left')) to = cur < 0 ? nav[0] : nav[(cur + nav.length - 1) % nav.length];
      if (input.wasPressed('right')) to = cur < 0 ? nav[nav.length - 1] : nav[(cur + 1) % nav.length];
      if (input.wasPressed('up')) to = gi;
      if (input.wasPressed('down') && this.sel === gi) to = items.findIndex((it) => it.nav === 1);
      if (to !== this.sel && to >= 0) { this.sel = to; SFC.Audio.menu(); this.render(); }
      if (input.wasPressed('confirm')) this.activate(items[this.sel]);
    },

    profileCard() {
      const d = PF().data, st = d.stats;
      return `<div class="pcard">
        <canvas class="avatar" data-avatar="spin"></canvas>
        <div class="pc-info">
          <div class="pc-name">${esc(d.name)}</div>
          ${xpBar(d)}
          ${this.drillCount() ? `<div class="pts-badge">★ ${esc(this.drillCount().toUpperCase())}</div>` : ''}
          <div class="pc-gold">${coin(d.gold)}</div>
          <div class="pc-stats">${nbsp(esc(_t('{played} played · {wins} wins · {goals} goals', { played: st.matches, wins: st.wins, goals: st.goals })))}</div>
        </div>
      </div>`;
    },

    charPanel() {
      const d = PF().data, st = d.stats;
      return `<div class="char-stage">
        <canvas class="avatar big" data-avatar="spin"></canvas>
        <div class="char-name">${esc(d.name)}</div>
        <div class="char-info">${xpBar(d)}<div class="pc-gold"><span class="gold">${esc(_t('OVR {n}', { n: PF().ovr() }))}</span></div>
          <div class="stats st-mini">${this.attrGrid()}</div>
          <div class="eq-list">${G().equippedHtml()}</div>
          <div class="pc-stats">${nbsp(esc(_t('{w}W {d}D {l}L · {goals} goals', { w: st.wins, d: st.draws, l: st.losses, goals: st.goals })))}</div></div>
      </div>`;
    },

    /* ---------------- chỉ số character (trang STATS) ---------------- */
    // lưới chỉ số nhỏ (bảng CHARACTER): thanh 60 -> tối đa + rating
    attrGrid() {
      const A = ATTRS();
      return A.order.map((id) => {
        const r = PF().rating(id), w = Math.round(Math.max(0, (r - 60) / (A.max - 60)) * 100);
        return `<div class="stat"><span>${A.list[id].short}</span><i><b style="width:${w}%"></b></i><em>${r}</em></div>`;
      }).join('');
    },

    // 1 dòng chỉ số: rating + thanh (60 -> tối đa)
    attrBar(id) {
      const A = ATTRS(), pf = PF(), w = ((pf.data.attrs.steps[id] / (A.max - A.base)) * 100).toFixed(1);
      return `<b class="st-num">${pf.rating(id)}</b><span class="st-bar"><i class="have" style="width:${w}%"></i></span>`;
    },

    // "2 drill cards" — số thẻ drill chờ mở (trang chủ / thẻ hồ sơ), '' khi không còn
    drillCount() {
      const n = PF().drillsPending();
      return n ? _tn('{n} drill card', '{n} drill cards', n) : '';
    },

    // RESET DATA (SETTINGS): xoá hồ sơ rồi tải lại trang -> chạy như lần đầu chơi (đặt tên, LV1, Area đầu).
    // Giữ cài đặt máy (hiệu ứng, phím) — chỉ xoá tiến trình
    resetData() {
      PF().resetAll();
      SFC.Social.reset();
      location.reload();
    },

    // cheat DRILL TEST: mở màn DRILL với vài drill chờ, không cần đá trận. Hồ sơ không được ghi trong lúc thử,
    // đóng màn thì trả chỉ số + drill chờ về như cũ. Bản Steam: bị xoá (SFC_DEV)
    ...(SFC_DEV && {
      // notice = true: mở từ màn LEVEL UP như sau trận (giả lập vừa lên n level)
      testDrill(n = 5, notice = false) {
        const pf = PF(), keep = JSON.parse(JSON.stringify(pf.data.attrs));
        pf.sandbox = true;
        pf.data.attrs.drills.pending = n;
        pf.data.attrs.drills.offer = null;
        const lv = pf.data.level;
        SFC.Drill.open(() => {
          pf.data.attrs = keep;
          pf.sandbox = false;
          this.render();
        }, notice ? { notice: { earned: n, from: Math.max(1, lv - n), to: lv } } : {});
      },
      // cheat JUMP TO AREA: đặt Elo về ngưỡng của Area. Tuyệt kỹ của các Area đã bỏ qua được cấp bù (backfill)
      testArea(d) {
        const MP = MPATH(), st = MP.state, a = wrap(st.area + d, MP.areas().length);
        Object.assign(st, { elo: MP.area(a).elo, area: a, id: MP.area(a).id });
        st.best = Math.max(st.best, a);
        st.peak = Math.max(st.peak, st.elo);
        MP.backfill(st);
        PF().save();
        this.app.newDemo();   // sân nền menu theo Area mới
        this.pathView = a;
      },
      testAreaLabel() {
        const MP = MPATH(), a = MP.state.area;
        return `${a + 1}/${MP.areas().length} ${MP.area(a).name}`;
      },
    }),

    // radar 6 cạnh theo rating hiện tại. Trục từ 60 tới tối đa
    statRadar(selId) {
      const A = ATTRS(), pf = PF(), ids = A.order, n = ids.length;
      const C = 64, R = 46, lo = 60, hi = A.max;
      const at = (i, k) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; return [C + Math.cos(a) * k, C + Math.sin(a) * k]; };
      const pt = (i, v) => at(i, Math.max(0, (v - lo) / (hi - lo)) * R);
      const poly = (fn) => ids.map((id, i) => pt(i, fn(id)).map((x) => x.toFixed(1)).join(',')).join(' ');
      const rings = [70, 80, 90, hi].map((v) => `<polygon class="ring" points="${poly(() => v)}"/>`).join('');
      const axes = ids.map((id, i) => { const [x, y] = at(i, R); return `<line class="axis" x1="${C}" y1="${C}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`; }).join('');
      const labels = ids.map((id, i) => {
        const [x, y] = at(i, R + 10);
        return `<text class="${id === selId ? 'sel' : ''}" x="${x.toFixed(1)}" y="${(y + 3).toFixed(1)}">${A.list[id].short}</text>`;
      }).join('');
      return `<svg class="st-radar" viewBox="0 0 128 128">${rings}${axes}
        <polygon class="have" points="${poly((id) => pf.rating(id))}"/>${labels}</svg>`;
    },

    // bảng phải trang STATS: radar + character + OVR, khung chi tiết của dòng đang chọn
    attrsPanel() {
      const A = ATTRS(), pf = PF(), it = this.items()[this.sel], id = it && it.attr;
      let detail;
      if (id) {
        const S = A.list[id];
        const KL = KEY_LABELS();
        const mults = Object.keys(S.keys).map((k) => `<span>${esc(KL[k] || k)} ×${SFC.I18n.num(pf.attrMult(id, k), 2)}</span>`).join('');
        detail = `<div class="sd-head"><b>${esc(S.label)}</b><span>${pf.rating(id)}</span></div>
          <p>${esc(S.desc)}</p><div class="sd-mult">${mults}</div>`;
      } else {
        detail = `<div class="sd-head"><b>${esc(_t('DRILL CARDS'))}</b></div>
          <p>${esc(_t("Every level gives {n} drill card. Open it in the INVENTORY to pick 1 of {choices} drills and raise your stats for good. Offers lean toward what you've already trained.", { n: A.drills.perLevel, choices: A.drills.choices }))}</p>`;
      }
      return `<div class="st-panel">
        <div class="st-top">${this.statRadar(id)}
          <div class="st-side"><canvas class="avatar" data-avatar="spin"></canvas>
            <div class="st-ovr"><b>${pf.ovr()}</b><span>${esc(_t('OVR'))}</span></div></div>
        </div>
        <div class="st-detail">${detail}</div>
      </div>`;
    },

    // OVR người chơi (giả) của Area: từ đầu tới cuối khoảng Elo của Area (MainPath.ovrAt ± spread)
    areaOvr(a) {
      const MP = MPATH(), sp = SFC_CONFIG.mainPath.matchmaking.ovr.spread, A = MP.area(a);
      const lo = Math.round(MP.ovrAt(A.elo) - sp), hi = Math.round(MP.ovrAt(A.elo + MP.span(a) - 1) + sp);
      return `${lo}–${hi}`;
    },

    renderNameInput() {
      const n = PROG().nameMaxLength;
      const txt = esc(this.nameBuf);
      return `<div class="name-in"><span>${txt}</span><i class="caret"></i><em>${this.nameBuf.length}/${n}</em></div>`;
    },

    submitName() {
      if (!PF().setName(this.nameBuf)) { this.setMsg(_t('Your name needs at least 1 character (A-Z, 0-9).'), true); return; }
      SFC.Audio.pick();
      const back = this.nameBack;
      this.nameBack = 'home';
      // người chơi mới: đặt tên xong -> PROLOGUE (cut scene + trận hướng dẫn)
      if (SFC.Tutorial.wanted()) { this.setTextMode(null); return SFC.Tutorial.begin(this.app); }
      this.go(back);
    },

    // gắn canvas character: look = hồ sơ hiện tại, hoặc bản "mặc thử" trong Shop (data-try)
    bindAvatars() {
      this.el.querySelectorAll('canvas[data-arena]').forEach((cv) => this.drawArena(cv));
      // cầu thủ đội đối thủ (Main Path): costume + áo của đội đó
      const teamAvatars = [...this.el.querySelectorAll('canvas[data-team]')].map((cv) => {
        cv.width = 40; cv.height = 44;
        const id = cv.dataset.team;
        return { cv, look: MPATH().teamLook(id, +cv.dataset.idx || 0), kit: TEAMS().list[id].kit, big: false, sil: !!cv.dataset.sil };
      });
      // đồng đội / ứng viên scout (ui/team.js): mặc áo đội riêng của người chơi
      const mateAvatars = [...this.el.querySelectorAll('canvas[data-mate]')].map((cv) => {
        cv.width = 40; cv.height = 44;
        return { cv, look: TM().lookOf(cv.dataset.mate), kit: TEAMS().list[SFC_CONFIG.mainPath.playerTeam.id].kit, big: cv.classList.contains('big') };
      }).filter((a) => a.look);
      // người chơi giả ở màn tìm thấy trận: ngoại hình đã dựng sẵn (MainPath.matchmake), áo sân nhà / sân khách
      const P = SFC_CONFIG.mainPath.playerTeam;
      const mmAvatars = [...this.el.querySelectorAll('canvas[data-mmlook]')].map((cv) => {
        cv.width = 40; cv.height = 44;
        let look = null;
        try { look = JSON.parse(cv.dataset.mmlook); } catch (e) { /* bỏ qua */ }
        return { cv, look, kit: cv.dataset.mmaway === '1' ? P.awayKit : P.kit, big: false };
      }).filter((a) => a.look);
      this.avatars = teamAvatars.concat(mateAvatars, mmAvatars, [...this.el.querySelectorAll('canvas[data-avatar]')].map((cv) => {
        const big = cv.classList.contains('big');
        cv.width = 40; cv.height = 44;
        const tryOn = cv.dataset.try;
        let look = PF().data.look;
        if (tryOn) { const it = PROG().items[tryOn]; look = Object.assign({}, look, { [it.slot]: tryOn }); }
        return { cv, look: PF().lookOf(look), big };
      }));
      this.animate(0);
    },

    // vẽ lại character mỗi khung hình: xoay người khoe trang phục
    animate(dt) {
      this.animT = (this.animT || 0) + dt;
      G().tick(this); // dải quay hộp gacha
      TM().tick(this, dt); // bản đồ scout + đồng hồ
      this.searchTick(dt); // tìm trận Main Path
      SFC.Social.tick(dt); // bạn bè giả: trả lời mời / chat, đổi trạng thái
      if (!this.avatars.length) return;
      const dirs = [Math.PI / 2, 0, -Math.PI / 2, Math.PI];
      const facing = dirs[Math.floor(this.animT / 1.6) % 4];
      const kit = this.kit();
      for (const a of this.avatars) {
        if (!a.cv.isConnected) continue;
        SFC.Sprites.drawAvatar(a.cv, a.look, a.kit || kit, this.animT, facing);
        if (a.sil) silhouette(a.cv);   // Area chưa mở: đội đối thủ chỉ hiện bóng đen
      }
    },

    input(input) {
      if (this.quitAsk) return this.quitInput(input);
      // phòng chờ: chỉ Esc mới rời phòng (tránh bấm nhầm Backspace)
      const back = input.wasPressed('pause') || (this.page !== 'lobby' && input.wasPressed('back'));
      if (back) { SFC.Audio.menu(); return this.back(); }
      if (G().pages.includes(this.page)) return G().input(this, input);
      if (TM().pages.includes(this.page)) return TM().input(this, input);
      if (this.page === 'name' && input.wasPressed('confirm')) return this.submitName();
      if (this.page === 'controls') return CV().input(this, input);
      if (this.page === 'tutorial') {
        const n = SFC_CONFIG.tutorial.pages.length;
        if (input.wasPressed('left')) { this.tutPage = wrap(this.tutPage - 1, n); SFC.Audio.menu(); this.render(); }
        if (input.wasPressed('right')) { this.tutPage = wrap(this.tutPage + 1, n); SFC.Audio.menu(); this.render(); }
        return;
      }
      const items = this.items();
      if (!items.length) return;
      if (this.page === 'party' && this.partyInput(input, items)) return;
      if (this.page !== 'home' && input.wasPressed('up')) { this.move(-1); }
      if (this.page !== 'home' && input.wasPressed('down')) { this.move(1); }
      // trang chủ: ←→ đi dọc thanh điều hướng (CHARACTER · PLAY · SHOP), ↑ lên bánh răng SETTINGS, ↓ về thanh điều hướng
      if (this.page === 'home') return this.homeInput(input, items);
      const it = items[this.sel];
      if (it && it.kind === 'pick') {
        if (input.wasPressed('left')) this.change(it, -1);
        if (input.wasPressed('right')) this.change(it, 1);
      }
      if (input.wasPressed('confirm')) {
        // phòng chờ: Enter luôn là "Bắt đầu" với chủ phòng
        if (this.page === 'lobby' && Session().isOwner) return this.activate(items.find((x) => x.main));
        if (this.page === 'join') return this.submitCode();
        this.activate(it);
      }
    },

    move(d) {
      const n = this.items().length;
      this.sel = wrap(this.sel + d, n);
      SFC.Audio.menu();
      this.render();
    },

    change(it, d) {
      if (it.disabled) return;
      it.change(d);
      SFC.Audio.menu();
      this.render();
    },

    activate(it) {
      if (!it || it.disabled) return;
      SFC.Audio.menu();
      if (it.kind === 'btn') it.act();
    },

    submitCode() {
      if (this.code.length < SFC_CONFIG.net.codeLength) { this.setMsg(_t('Room codes are {n} characters.', { n: SFC_CONFIG.net.codeLength }), true); return; }
      Session().joinRoom(this.code);
    },

    // trang Vào phòng / Đặt tên: gõ chữ/số trực tiếp
    setTextMode(kind) {
      const I = SFC.Input;
      if (!kind) { I.textHandler = null; I.pasteHandler = null; return; }
      if (kind === 'chat') {
        // khung chat phòng chờ: gõ chữ vào chatBuf (Enter gửi / Esc đóng đi qua action confirm / back)
        const max = SFC_CONFIG.social.chatMax;
        const upd = (v) => { this.chatBuf = v.slice(0, max); this.renderChatInput(); return true; };
        I.textHandler = (e) => {
          if (e.key === 'Backspace') return upd(this.chatBuf.slice(0, -1));
          if (e.key.length === 1) return upd(this.chatBuf + e.key);
          return false;
        };
        I.pasteHandler = (text) => upd(this.chatBuf + text.replace(/\s+/g, ' '));
        return;
      }
      if (kind === 'name') {
        const upd = (v) => { this.nameBuf = PF().cleanName(v); this.msg = ''; this.render(); return true; };
        I.textHandler = (e) => {
          if (e.key === 'Backspace') return upd(this.nameBuf.slice(0, -1));
          if (e.key.length === 1 && /[a-z0-9 _-]/i.test(e.key)) return upd(this.nameBuf + e.key);
          return false;
        };
        I.pasteHandler = (text) => upd(this.nameBuf + text);
        return;
      }
      const n = SFC_CONFIG.net.codeLength;
      const add = (str) => {
        const clean = str.toUpperCase().split('').filter((c) => SFC_CONFIG.net.codeChars.includes(c)).join('');
        if (!clean) return false;
        this.code = (this.code + clean).slice(0, n);
        this.msg = '';
        this.render();
        return true;
      };
      I.textHandler = (e) => {
        if (Session().status === 'busy') return false;
        if (e.key === 'Backspace') { this.code = this.code.slice(0, -1); this.render(); return true; }
        if (e.key.length === 1 && /[a-z0-9]/i.test(e.key)) { add(e.key); return true; }
        return false;
      };
      I.pasteHandler = (text) => add(text.replace(/^.*?([A-Za-z0-9]{4,})\s*$/, '$1'));
    },

    /* ---------------- chuột ---------------- */
    bindMouse() {
      this.el.addEventListener('click', (e) => {
        SFC.Audio.unlock();
        // hộp QUIT GAME?: chỉ nhận 2 nút của hộp
        if (this.quitAsk) {
          const q = e.target.closest('[data-quit]');
          if (q) this.quitPick(q.dataset.quit === '0');
          return;
        }
        const copy = e.target.closest('[data-copy]');
        if (copy) {
          const code = copy.dataset.copy;
          if (navigator.clipboard) navigator.clipboard.writeText(code).then(() => this.setMsg(_t('Copied room code {code}', { code })), () => {});
          return;
        }
        if (G().pages.includes(this.page) && G().click(this, e)) return;
        if (TM().pages.includes(this.page) && TM().click(this, e)) return;
        if (this.page === 'controls' && CV().click(this, e)) return;
        // Main Path: bấm 1 Area trên "con đường" để xem
        const pa = e.target.closest('[data-parea]');
        if (pa) { this.pathView = +pa.dataset.parea; SFC.Audio.menu(); this.render(); return; }
        // phòng online: bấm slot trống để nhảy vào
        const slot = this.page === 'lobby' && e.target.closest('[data-slot]');
        if (slot) { SFC.Audio.menu(); Session().requestSlot(+slot.dataset.slot); return; }
        const tab = e.target.closest('[data-tab]');
        if (tab) { this.tutPage = +tab.dataset.tab; SFC.Audio.menu(); this.render(); return; }
        if (this.page === 'party') {
          const fa = e.target.closest('[data-fa]');
          if (fa) return this.friendAction(+fa.dataset.fr, fa.dataset.fa);
          if (e.target.closest('[data-chatclose]')) return this.closeChat();
          const kick = e.target.closest('[data-kick]');
          if (kick) { SFC.Audio.menu(); return SFC.Social.kick(+kick.dataset.kick); }
          if (e.target.closest('[data-back]')) { SFC.Audio.menu(); return this.back(); }
          // ô trống: nhảy tới bạn bè đầu tiên mời được
          if (e.target.closest('[data-invite]')) {
            const items = this.items(), i = items.findIndex((x) => x.kind === 'friend' && SFC.Social.canInvite(x.id));
            if (i >= 0) { this.sel = i; this.frAct = 0; SFC.Audio.menu(); this.render(); } else this.setMsg(_t('No friends online to invite'), true);
            return;
          }
        }
        const el = e.target.closest('[data-i]');
        if (!el) return;
        const i = +el.dataset.i, it = this.items()[i];
        if (!it) return;
        this.sel = i;
        if (el.dataset.d) return this.change(it, +el.dataset.d);
        if (it.kind === 'btn') return this.activate(it);
        this.render();
      });
    },
  };

  // tô đen mọi pixel đã vẽ trên canvas (giữ nguyên hình dáng)
  function silhouette(cv) {
    const x = cv.getContext('2d');
    x.save();
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = '#07050a';
    x.fillRect(0, 0, cv.width, cv.height);
    x.restore();
  }

  function wrap(v, n) { return ((v % n) + n) % n; }
  // "Jogos: 0 · Vitórias: 0 · Gols: 0": nhãn dính với số, dấu · dính vào mục trước -> chỉ xuống dòng sau dấu ·
  function nbsp(s) { return s.replace(/ · /g, '\u00a0· ').replace(/: /g, ':\u00a0'); }

  SFC.Menu = Menu;
})();
