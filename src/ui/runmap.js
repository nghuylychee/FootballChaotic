/* RunUI — GOAT PATH (docs/RUN_DESIGN.md). Logic: src/meta/run.js (SFC.Run), số liệu: config/run.config.js.
 *   page 'run'    (tab màn PLAY, vẽ trong khung pt-* của Menu): 3 act (sân + boss) + kỷ lục · START RUN / CONTINUE · FORFEIT RUN
 *   page 'runmap' (màn 1 run): thanh trên (tên act + FORFEIT / BACK) + map của act đang đá rộng hết màn, cuộn dọc kiểu Slay the Spire
 *                 (tầng 0 dưới cùng, boss trên cùng; lăn chuột, không hiện thanh cuộn). Node chỉ cho biết loại, đối thủ biết khi vào trận.
 *                 Thẻ che map: thẻ mở act · thưởng chọn 1 trong 3 BADGE · SHOP · LOCKER ROOM · SKILL GAME (giới thiệu bài) · sự kiện ???
 *                 · SQUAD (3 thẻ cầu thủ: thanh chỉ số nền / BADGE / chấn thương + BADGE đang đeo) · WHO GETS IT? (BADGE vừa nhận -> chọn
 *                 người đeo) · hết run: RUN OVER / CHAMPIONS + gold quy đổi, CONTINUE = xoá run về tab.
 *                 Thanh trên có dải đội hình (mặt + OVR + dấu chấn thương của 3 người) = nút mở SQUAD.
 *                 Chưa có run + this.pick: màn chọn 2 đồng đội (BUILD YOUR SQUAD) trước khi START RUN (user 2026-10-26).
 * Co-op (phòng GOAT PATH online, docs/RUN_DESIGN.md "Co-op"): PLAY WITH FRIENDS / JOIN ở tab. Run là của máy host; khách xem bản sao
 *                 (Run.mirror) và gửi thao tác (Session.runAction -> host RunUI.apply). Node / sự kiện / Locker Room = bỏ phiếu (dấu phiếu trên
 *                 node / nút), BADGE / ví / Shop riêng từng người, Skill game 1 người (xoay vòng). Thanh trên thêm mã phòng + LEAVE ROOM.
 * Phím: ←→ đổi node chọn được · ↓ xuống hàng nút · ↑ về node · Enter = vào node. Chuột: bấm node chọn được = vào.
 * Menu gọi: tabItems / renderTab (page 'run', đi phím bằng Menu.playInput) · render / input / click / back (page 'runmap')
 */
window.SFC = window.SFC || {};

(function () {
  const _t = SFC.t;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const RUN = () => SFC.Run;
  const PX = () => SFC.PixelIcon;
  const TEAMS = () => SFC_CONFIG.teams.list;
  const CFG = () => SFC_CONFIG.run;
  // kích thước map (px trong khung 640x360): khoảng cách cột / tầng, lề
  // sa bàn chiến thuật (user 2026-10-25): sân dọc, khung thành nhà dưới cùng (tầng 0), boss đứng trong khung thành đối thủ trên cùng
  const MAP_W = 576, ROW_H = 66, PAD_X = 44, PAD_Y = 50;

  // thứ tự vị trí ở bước chọn vị trí của bạn (tấn công -> phòng ngự), chỉ những vị trí có trong game.roles
  const POS = () => ['FWD', 'MID', 'DEF'].filter((r) => SFC_CONFIG.game.roles.includes(r));
  // phòng GOAT PATH co-op: đang ở trong phòng · máy này làm host (giữ run thật)
  const ON = () => SFC.Session;
  const inRoom = () => !!SFC.Session && ON().active && ON().run;
  const isHost = () => !inRoom() || ON().isHost;

  const RunUI = {
    pages: ['runmap'],
    sel: 0,            // page 'runmap': mục đang chọn (node chọn được trước, rồi tới nút)
    quitArm: false,    // FORFEIT: bấm 2 lần
    key: null,         // trạng thái đã vẽ (đổi -> cuộn map về chỗ đang đứng)
    scroll: null,      // vị trí cuộn map giữ qua các lần vẽ lại
    bagOpen: false,    // đang xem SQUAD
    pick: null,        // màn BUILD YOUR SQUAD trước run: { me: vị trí của bạn, cands: [m], mates: { vị trí: chỉ số trong cands }, order: [vị trí theo thứ tự chọn] }
    leaveArm: false,   // LEAVE ROOM (co-op): bấm 2 lần
    roomRun: false,    // đang / vừa ở phòng GOAT PATH co-op (nhớ lại lúc phòng đóng — OnlineUI)
    joining: false,    // tab 'run': đang gõ mã phòng để vào phòng bạn bè (JOIN ngay trên tab, không sang PRIVATE MATCH)

    /* ================= page 'run' (tab PLAY) ================= */
    tabItems(menu) {
      const R = RUN().run, live = RUN().active(), items = [];
      // JOIN: ô mã phòng thay cho hàng nút (gõ mã, Enter = CONNECT, Esc / CANCEL = thôi)
      if (this.joining) {
        items.push({ kind: 'btn', main: true, label: _t('CONNECT'), act: () => menu.submitCode() });
        items.push({ kind: 'btn', cancel: true, label: _t('CANCEL'), act: () => this.stopJoin(menu) });
        return items;
      }
      items.push({ kind: 'btn', main: true, label: R ? _t('CONTINUE') : _t('START RUN'), act: () => {
        if (!R) { this.reset(); this.newPick(); }
        menu.go('runmap');
      } });
      if (live) items.push({ kind: 'btn', forfeit: true, label: this.quitArm ? _t('CONFIRM FORFEIT') : _t('FORFEIT RUN'), act: () => this.forfeit(menu) });
      // co-op online (khoá như PRIVATE MATCH: Platform.privateMatch): mở phòng với run đang có (hoặc run mới) · vào phòng của bạn bè bằng mã
      if (SFC.Platform.privateMatch) {
        items.push({ kind: 'btn', coop: true, label: _t('HOST'), act: () => { this.reset(); this.roomRun = true; ON().createRoom({ run: true }); } });
        items.push({ kind: 'btn', joinRoom: true, label: _t('JOIN'), act: () => this.startJoin(menu) });
      }
      return items;
    },
    renderTab(menu, items) {
      const R = RUN().run, st = RUN().stats();
      const sub = `<span class="pt-area rt-sum">${PX().ui('ball', 'sm')} ${esc(_t('{n} RUNS', { n: st.plays }))} · ${PX().ui('trophy', 'sm')} ${st.wins} · ${PX().ui('crown', 'sm')} ${st.bosses}</span>`;
      // 3 act: sân thu nhỏ + boss (act chưa từng tới: boss bóng đen)
      const reach = R ? Math.max(R.act, st.bestAct) : st.bestAct;
      const acts = RUN().acts().map((a, i) => {
        const boss = R ? R.bosses[i] : a.boss[0], seen = i <= reach || st.wins > 0, on = R && R.act === i && RUN().active();
        const done = R ? i < R.act || R.won : false, lock = SFC_DEMO && i >= ((SFC_CONFIG.demo && SFC_CONFIG.demo.runActs) || 1);
        return `<div class="rt-act ${on ? 'on' : ''} ${done ? 'done' : ''} ${lock ? 'lock' : ''}" style="--ac:${a.color}">
            <canvas data-ract="${i}" width="180" height="84"></canvas>
            <span class="rt-n">${esc(_t('ACT {n}', { n: i + 1 }))}</span>
            <b>${esc(a.name)}</b>
            <span class="rt-boss"><canvas data-team="${boss}" data-idx="2" ${seen ? '' : 'data-sil="1"'}></canvas>${PX().ui('crown', 'sm')}<em>${esc(seen ? TEAMS()[boss].name : '???')}</em></span>
          </div>`;
      }).join('<i class="rt-link"></i>');
      const btn = (f) => {
        const i = items.findIndex(f);
        if (i < 0) return '';
        const it = items[i];
        return `<button class="pt-btn ${it.main ? 'go' : ''} ${it.forfeit && this.quitArm ? 'danger' : ''} ${menu.sel === i ? 'sel' : ''}" data-i="${i}">${esc(it.label)}</button>`;
      };
      const where = R && RUN().active() ? `<div class="rt-where">${esc(_t('ACT {n}', { n: R.act + 1 }))} · ${esc(RUN().act(R.act).name)} · ${esc(_t('FLOOR {n}', { n: RUN().floor() + 2 }))}</div>` : '';
      const msg = menu.msg ? `<div class="m-msg ${menu.msgErr ? 'err' : ''}">${esc(menu.msg)}</div>` : '';
      return `<div class="pt-main pt-run">
          ${menu.playTabs('run', sub)}
          <div class="rt-acts">${acts}</div>
          ${where}
          <div class="rt-bottom">${this.joining ? `<div class="pt-joinbox rt-join"><div class="pt-jtitle">${esc(_t('JOIN ROOM'))}</div>${menu.renderCode()}</div>` : ''}${msg}
            ${!this.joining && items.some((x) => x.forfeit) ? `<div class="pt-acts">${btn((x) => x.forfeit)}</div>` : ''}
            <div class="pt-acts">${this.joining ? btn((x) => x.cancel) + btn((x) => x.main)
              : btn((x) => x.joinRoom) + btn((x) => x.main) + btn((x) => x.coop)}</div></div>
        </div>
        <button class="pt-back" data-back="1">◀ ${esc(_t('BACK'))}</button>`;
    },
    // JOIN trên tab: bật / tắt ô gõ mã phòng (Menu.setTextMode 'join' = cùng ô mã của PRIVATE MATCH, Menu.submitCode)
    startJoin(menu) { this.joining = true; menu.joinFrom = 'run'; menu.code = ''; menu.msg = ''; menu.sel = 0; menu.render(); },
    stopJoin(menu) { this.joining = false; menu.code = ''; menu.msg = ''; menu.setTextMode(null); menu.sel = 0; menu.render(); },
    // ảnh sân của từng act (tab 'run')
    bind(menu) {
      menu.setTextMode(this.joining ? 'join' : null);
      menu.el.querySelectorAll('canvas[data-ract]').forEach((cv) => {
        const a = RUN().act(+cv.dataset.ract), R = RUN().run;
        if (!a || !SFC_CONFIG.arenas[a.arena]) return;
        const img = SFC.Background.thumb(a.arena, SFC_CONFIG.mainPath.playerTeam.id, R ? R.bosses[+cv.dataset.ract] : a.boss[0]);
        const ctx = cv.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 20, 22, 600, 224, 0, 0, cv.width, cv.height);
      });
    },
    // FORFEIT RUN (bấm 2 lần): hết run, về màn kết thúc
    forfeit(menu) {
      if (!this.quitArm) { this.quitArm = true; menu.setMsg(_t('Forfeit this run? It counts as a loss.'), true); return; }
      this.quitArm = false;
      RUN().forfeit();
      menu.msg = '';
      menu.go('runmap');
    },
    reset() { this.sel = 0; this.quitArm = false; this.key = null; this.scroll = null; this.bagOpen = false; this.pick = null; },

    /* ================= page 'runmap' ================= */
    // mục chọn được. Thứ tự che: hết run > thưởng chọn BADGE > phòng (Shop / Locker Room / Skill game / sự kiện) > thẻ mở act > túi đồ > map.
    // Mỗi mục: { k, key (data-rt), ... }; node map: k 'node' + id (data-rn)
    targets() {
      const R = RUN().run, room = inRoom(), host = isHost();
      const T = (k, extra = {}) => Object.assign({ k, key: k + (extra.i != null ? ':' + extra.i : extra.id ? ':' + extra.id : '') }, extra);
      if (!R) {
        const inv = room && ON().canInvite ? [T('invite')] : [];
        // khách phòng co-op: host chưa bắt đầu run -> đổi sang ô vị trí còn trống / rời phòng
        if (room && !host) return POS().map((r) => T('slot', { id: r })).concat(inv, [T('leaveroom')]);
        const P = this.pick;
        if (!P) return [];
        // 3 ô vị trí (bấm = nhảy sang ô đó; ✕ = bỏ đồng đội AI ở ô đó để chọn lại) · ứng viên lấp ô trống kế tiếp (đủ ô vẫn hiện, mờ)
        // · START RUN giữa dưới khi đủ ô
        const used = Object.values(P.mates);
        const unpick = POS().filter((r) => P.mates[r] != null).map((r) => T('unpick', { id: r }));
        const cands = P.cands.map((m, i) => T('cand', { i })).filter((t) => !used.includes(t.i));
        const go = this.pkReady() ? [T('go', { main: true })] : [];
        return POS().map((r) => T('slot', { id: r })).concat(unpick, cands, go, inv, [T('cancel')]);
      }
      // lượt chọn / gắn BADGE của chính máy này (co-op: mỗi người 1 lượt riêng; chơi một mình: R)
      const P = RUN().pl(RUN().myKey(), R) || {};
      if (!RUN().active()) return host ? [T('end', { main: true })] : [T('leaveroom')];
      if (P.assign) return [0, 1, 2].map((i) => T('who', { i }));
      if (P.offer) return P.offer.ids.map((id, i) => T('pick', { i, id })).concat([T('skip')]);
      const rm = R.room;
      if (rm && rm.kind === 'shop') {
        const heal = rm.healed ? [] : RUN().injuries().map((x) => T('heal', { i: x.k }));
        const done = room && (rm.ready || []).includes(RUN().myKey());
        return (done ? [] : rm.items.map((x, i) => T('buy', { i, id: x.id })).concat(heal)).concat(done ? [] : [T('leave', { main: true })]);
      }
      if (rm && rm.kind === 'rest') {
        const up = R.bag.map((b, k) => ({ b, k })).filter((x) => !x.b.up && !RUN().badge(x.b.id).noUp && !RUN().badge(x.b.id).injury).map((x) => T('up', { i: x.k }));
        return RUN().injuries().map((x) => T('heal', { i: x.k })).concat(up, [T('leave')]);
      }
      // co-op: người đá bài (hoặc host) bấm START
      if (rm && rm.kind === 'skill') return !room || host || rm.player === RUN().myKey() ? [T('drill', { main: true })] : [];
      if (rm && rm.kind === 'event') return CFG().events[rm.id].choices.map((c, i) => T('choose', { i }));
      if (R.actNew) return host ? [T('actgo', { main: true })] : [];
      if (this.bagOpen) return [T('close', { main: true })];
      // co-op: chờ người khác chọn xong BADGE thì mới bỏ phiếu đi tiếp · thanh trên: LEAVE ROOM (host còn FORFEIT)
      const nodes = room && RUN().busy(R).length ? [] : RUN().available().map((n) => T('node', { id: n.id }));
      const bar = !room ? [T('forfeit'), T('back')] : (ON().canInvite ? [T('invite')] : []).concat(host ? [T('forfeit'), T('leaveroom')] : [T('leaveroom')]);
      return nodes.concat([T('bag')], bar);   // bag = dải đội hình (mở SQUAD)
    },
    // bố cục (user 2026-10-25: không hiện thông tin đối thủ trước trận, không thanh cuộn): thanh trên (act + tiền + nút) · map rộng hết màn
    render(menu) {
      const R = RUN().run;
      // phòng co-op chưa có run: host chọn đội hình (mở sẵn màn chọn) · khách chờ host
      if (!R && inRoom() && !isHost()) return this.renderWait(menu);
      if (!R && inRoom() && !this.pick) this.newPick();
      if (!R && this.pick) return this.renderPick(menu);
      if (!R) { menu.go('run'); return; }
      // cut-scene chờ chiếu: hạ boss (R.cue) · mở act (lần đầu vào act). Khách co-op: host báo chiếu (remoteScenes)
      if (!R.mirror && R.cue) { const act = +R.cue.split(':')[1]; R.cue = null; SFC.Profile.save(); this.cueRoom(act, 'after'); return this.cutscene(act, 'after', () => this.back2map()); }
      if (!R.mirror && R.actNew && RUN().active() && !R.seen.includes('intro:' + R.act)) {
        R.seen.push('intro:' + R.act); SFC.Profile.save();
        this.cueRoom(R.act, 'intro');
        return this.cutscene(R.act, 'intro', () => this.back2map());
      }
      const T = this.targets();
      this.sel = Math.max(0, Math.min(T.length - 1, this.sel));
      const P = RUN().pl(RUN().myKey(), R) || R;
      const key = [R.act, R.at, R.over, R.won, R.actNew, !!P.offer, R.room && R.room.kind, this.bagOpen, !!P.assign].join(':');
      if (this.key !== key) {
        // trạng thái đổi (vừa xong 1 node / act mới / mở phòng / hết run): chọn mục đầu, cuộn về chỗ đang đứng
        const mapChanged = !this.key || this.key.split(':').slice(0, 2).join(':') !== key.split(':').slice(0, 2).join(':');
        this.key = key; this.sel = 0; this.quitArm = false;
        if (mapChanged) this.scroll = null;
      }
      const A = RUN().act(R.act);
      const dots = RUN().acts().map((a, i) => `<i class="${i < R.act || R.won ? 'done' : i === R.act ? 'on' : ''}" style="--c:${a.color}"></i>`).join('');
      // dải đội hình luôn hiện (kể cả khi nút không chọn được vì đang có thẻ che): bấm = mở SQUAD
      const tb = T.find((t) => t.k === 'bag');
      const strip = `<button class="pt-btn rm-strip ${tb && T.indexOf(tb) === this.sel ? 'sel' : ''}" ${tb ? `data-rt="${tb.key}"` : 'disabled'}>${this.strip(R)}</button>`;
      const bar = this.roomChip() + strip + T.filter((t) => ['forfeit', 'back', 'leaveroom', 'invite'].includes(t.k)).map((t) => this.btn(T, t,
        esc(t.k === 'forfeit' ? (this.quitArm ? _t('CONFIRM FORFEIT') : _t('FORFEIT RUN')) : t.k === 'invite' ? _t('INVITE') : t.k === 'leaveroom' ? (this.leaveArm ? _t('CONFIRM LEAVE') : _t('LEAVE ROOM')) : _t('BACK')),
        (t.k === 'forfeit' && this.quitArm) || (t.k === 'leaveroom' && this.leaveArm) ? 'danger' : '')).join('');
      const note = menu.msg || this.waitNote(R);
      const msg = note ? `<div class="m-msg run-msg ${menu.msg && menu.msgErr ? 'err' : ''}">${esc(note)}</div>` : '';
      menu.el.innerHTML = `<div class="rm-page ${inRoom() ? 'coop' : ''}" style="--ac:${A.color}">
          <div class="rm-bar"><div class="rm-head"><span>${esc(_t('ACT {n}', { n: R.act + 1 }))} <u>${dots}</u></span><b>${esc(A.name)}</b></div>
            <div class="rm-acts"><span class="rm-cash" title="${esc(_t('Run cash'))}">$${P.cash}</span>${bar}</div></div>
          <div class="rm-map">${this.mapHtml(R, T)}</div>
          ${msg}${this.overlay(R, T)}
        </div>`;
      this.bindMap(menu);
      menu.bindAvatars();
    },
    btn(T, t, html, cls = '') {
      return `<button class="pt-btn ${t.main ? 'go' : ''} ${cls} ${T.indexOf(t) === this.sel ? 'sel' : ''}" data-rt="${t.key}">${html}</button>`;
    },
    // lớp che map theo trạng thái
    overlay(R, T) {
      const P = RUN().pl(RUN().myKey(), R) || R;
      if (!RUN().active()) return this.endCard(R, T);
      if (P.assign) return this.assignCard(R, T, P.assign.id);
      if (P.offer) return this.offerCard(R, T, P.offer);
      const rm = R.room;
      if (rm && rm.kind === 'shop') return this.shopCard(R, T);
      if (rm && rm.kind === 'rest') return this.restCard(R, T);
      if (rm && rm.kind === 'skill') return this.drillCard(R, T);
      if (rm && rm.kind === 'event') return this.eventCard(R, T);
      if (R.actNew) return this.actCard(R, T);
      if (this.bagOpen) return this.bagCard(R, T);
      return '';
    },

    // map: vạch sân + đường nét đứt (SVG) + node (nút). Toạ độ: mỗi tầng dàn đều node theo thứ tự cột trên cả bề ngang
    // (user 2026-10-25: không dồn 1 bên; giữ thứ tự cột nên đường đi vẫn không cắt nhau), lệch nhẹ jx / jy; tầng f từ dưới lên, boss giữa trên cùng
    pos(n) {
      const F = CFG().map.floors;
      if (n.kind === 'boss') return { x: MAP_W / 2, y: PAD_Y };
      const fl = RUN().run.map.floors[n.f], k = fl.length, i = fl.indexOf(n), slot = (MAP_W - PAD_X * 2) / k;
      return { x: Math.round(PAD_X + slot * (i + 0.5) + n.jx * 0.3 * Math.min(slot, 140)), y: Math.round(PAD_Y + (F - n.f + n.jy * 0.6) * ROW_H) };
    },
    // vạch phấn của sân: biên, giữa sân, vòng tròn giữa, vòng cấm + khung thành 2 đầu
    pitch(w, h) {
      const m = 14, bw = w * 0.56, gw = w * 0.26, pd = 92, gd = 34, goal = 88;
      const end = (top) => {
        const y = top ? m : h - m, d = top ? 1 : -1;
        return `<path d="M${(w - bw) / 2} ${y} v${d * pd} h${bw} v${-d * pd}"/><path d="M${(w - gw) / 2} ${y} v${d * gd} h${gw} v${-d * gd}"/>
          <circle cx="${w / 2}" cy="${y + d * (pd - 22)}" r="2" class="dot"/>
          <path d="M${w / 2 - 34} ${y + d * pd} A 40 40 0 0 ${top ? 0 : 1} ${w / 2 + 34} ${y + d * pd}"/>
          <rect class="goal" x="${(w - goal) / 2}" y="${top ? y - 10 : y}" width="${goal}" height="10"/>`;
      };
      return `<g class="rm-pitch"><rect x="${m}" y="${m}" width="${w - m * 2}" height="${h - m * 2}"/>
          <line x1="${m}" y1="${h / 2}" x2="${w - m}" y2="${h / 2}"/><circle cx="${w / 2}" cy="${h / 2}" r="52"/><circle cx="${w / 2}" cy="${h / 2}" r="2" class="dot"/>
          ${end(true)}${end(false)}</g>`;
    },
    mapHtml(R, T) {
      const M = R.map, F = CFG().map.floors;
      const all = M.floors.flat().concat([M.boss]);
      const avail = new Set(T.filter((t) => t.k === 'node').map((t) => t.id)), done = new Set(R.path);
      const width = MAP_W, height = PAD_Y * 2 + F * ROW_H;
      const lines = [];
      for (const n of all) for (const id of n.next) {
        const m = id === 'boss' ? M.boss : all.find((x) => x.id === id), a = this.pos(n), b = this.pos(m);
        const cls = done.has(n.id) && done.has(m.id) ? 'done' : n.id === R.at && avail.has(m.id) ? 'next' : '';
        lines.push(`<line class="${cls}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`);
      }
      const atF = R.at ? RUN().find(R.at).f : -1;
      const sel = T[this.sel];
      const last = R.log[R.log.length - 1];
      // ??? đã vào: icon theo thứ đã gặp (sự kiện / rương / Skill game / Shop)
      const GOT = { event: 'unknown', treasure: 'gift', skill: 'cone', shop: 'shop' };
      // trận: chỉ hiện loại node, đối thủ biết khi vào trận (boss đã lộ ở thẻ mở act)
      const nodes = all.map((n) => {
        const N = RUN().node(n.kind), p = this.pos(n), boss = n.kind === 'boss';
        const st = n.id === R.at ? 'at' : done.has(n.id) ? 'done' : avail.has(n.id) ? 'avail' : n.f <= atF ? 'past' : '';
        const lost = R.over && !R.forfeit && last && last.act === R.act && last.node === n.id && last.kind !== 'skill';
        const icon = boss ? `<canvas data-team="${n.team}" data-idx="2"></canvas>` : PX().ui(n.got ? GOT[n.got] : N.icon, 'x2');
        return `<button class="rm-node k-${n.kind} ${st} ${lost ? 'lost' : ''} ${sel && sel.id === n.id ? 'sel' : ''}"
            data-rn="${n.id}" style="left:${p.x}px;top:${p.y}px;--nc:${N.color}">${icon}${boss ? `<i class="rm-crown">${PX().ui('crown', 'sm')}</i>` : ''}${this.votes(R, 'node', n.id)}</button>`;
      }).join('');
      return `<div class="rm-inner" style="width:${width}px;height:${height}px">
          <svg class="rm-lines" width="${width}" height="${height}">${this.pitch(width, height)}${lines.join('')}</svg>${nodes}
        </div>`;
    },

    /* ---------- BADGE: thẻ + chip hiệu lực (icon + số, không câu dài — ui-image-first) ---------- */
    badgeIcon(id, cls = 'x2') {
      const d = RUN().badge(id), A = SFC_CONFIG.progression.attrs;
      if (d.icon) return PX().ui(d.icon, cls);
      if (d.school) return PX().arch(d.school, cls);
      const top = Object.keys(d.stats || {}).sort((a, b) => Math.abs(d.stats[b]) - Math.abs(d.stats[a]))[0];
      return top ? PX().html(A.list[top].icon, '', cls) : PX().ui('card', cls);
    },
    chips(b) {
      const e = RUN().eff(b), A = SFC_CONFIG.progression.attrs, out = [];
      for (const s of A.order) if (e.stats && e.stats[s]) out.push(`<i class="${e.stats[s] < 0 ? 'neg' : ''}" style="--c:${A.list[s].color}">${esc(A.list[s].short)} ${e.stats[s] > 0 ? '+' : ''}${e.stats[s]}</i>`);
      if (e.school) out.push(`<i style="--c:${SFC_CONFIG.cores.archetypes[e.school].color}">${esc(SFC_CONFIG.cores.archetypes[e.school].label)} ▲</i>`);
      if (e.score) out.push(`<i style="--c:#ffe14f">${e.score[0]}-${e.score[1]}</i>`);
      if (e.ultGain) out.push(`<i style="--c:#ff9a3d">ULT ▲</i>`);
      return out.join('');
    },
    // thẻ BADGE: b = { id, up } · price: giá (Shop) · t: mục chọn được (null = chỉ xem)
    card(T, t, b, extra = {}) {
      const d = RUN().badge(b.id), rar = d.injury ? null : SFC_CONFIG.progression.rarities[d.rarity];
      const col = d.injury ? '#ff5a6e' : rar.color, sel = t && T.indexOf(t) === this.sel;
      const tag = extra.price != null ? `<u class="bd-price ${extra.poor ? 'poor' : ''}">$${extra.price}</u>` : extra.tag ? `<u class="bd-tag">${esc(extra.tag)}</u>` : '';
      const who = extra.who != null ? `<u class="bd-who">${esc(RUN().memberName(extra.who))}</u>` : '';
      return `<button class="bd-card ${d.injury ? 'inj' : ''} ${extra.dis ? 'dis' : ''} ${sel ? 'sel' : ''}" ${t ? `data-rt="${t.key}"` : ''} style="--rc:${col}">
          <span class="bd-ico">${this.badgeIcon(b.id)}</span>
          <b>${esc(d.name)}${b.up ? '+' : ''}</b>
          <span class="bd-fx">${this.chips(b)}</span>
          <em>${esc(d.injury ? _t('INJURY') : rar.label)}</em>${tag}${who}${extra.votes || ''}
        </button>`;
    },
    /* ---------- ĐỘI HÌNH (user 2026-10-26) ---------- */
    // canvas nhân vật: character = data-avatar, đồng đội / ứng viên = ngoại hình dựng sẵn (data-mmlook, áo sân nhà)
    face(look, you) {
      return you ? '<canvas data-avatar="1"></canvas>' : `<canvas data-mmlook="${esc(JSON.stringify(look))}"></canvas>`;
    },
    // dải đội hình trên thanh map: mặt + OVR + dấu chấn thương từng người
    strip(R) {
      return R.squad.map((s, i) => {
        const inj = RUN().injuryIds(i, R).length;
        return `<span class="rs-m ${inj ? 'hurt' : ''} ${s.h || (s.you && inRoom()) ? 'human' : ''}">${this.face(RUN().memberLook(i, R), s.you && !R.mirror)}<b>${RUN().ovrOf(i, R)}</b>${inj ? `<i class="rs-x">✚</i>` : ''}</span>`;
      }).join('');
    },
    // thanh 6 chỉ số: phần nền · phần BADGE cộng (xanh) · phần chấn thương trừ (đỏ sọc) · xem trước (vàng nhấp nháy, assign)
    statRows(R, i, preview) {
      const A = SFC_CONFIG.progression.attrs, base = RUN().baseRatings(i, R), fin = RUN().ratingsOf(i, R), max = A.max;
      const plus = {}, minus = {};
      for (const b of R.bag) if ((b.who || 0) === i) {
        const e = RUN().eff(b);
        for (const s in e.stats || {}) { if (e.stats[s] > 0) plus[s] = (plus[s] || 0) + e.stats[s]; else minus[s] = (minus[s] || 0) - e.stats[s]; }
      }
      const next = preview ? RUN().ratingsOf(i, Object.assign({}, R, { bag: R.bag.concat([{ id: preview, up: false, who: i }]) })) : null;
      const pc = (v) => Math.max(0, Math.min(100, (v / max) * 100)).toFixed(1) + '%';
      return `<div class="sq-stats">${A.order.map((s) => {
        const keep = Math.max(0, base[s] - (minus[s] || 0)), up = Math.max(0, fin[s] - keep), gain = next ? Math.max(0, next[s] - fin[s]) : 0;
        const lost = Math.min(minus[s] || 0, max - fin[s]);
        return `<div class="sq-row" style="--c:${A.list[s].color}" title="${esc(A.list[s].label)}"><i>${esc(A.list[s].short)}</i>
            <span class="sq-bar"><u style="width:${pc(keep)}"></u><s class="up" style="width:${pc(up)}"></s>${gain ? `<s class="pre" style="width:${pc(gain)}"></s>` : ''}${lost ? `<s class="dn" style="width:${pc(lost)}"></s>` : ''}</span>
            <b class="${gain ? 'pre' : minus[s] ? 'dn' : up ? 'up' : ''}">${gain ? next[s] : fin[s]}</b></div>`;
      }).join('')}</div>`;
    },
    // thẻ 1 cầu thủ trong đội hình: mặt + tên + vị trí + OVR · 6 thanh chỉ số · BADGE đang đeo (chấn thương đỏ). t: chọn được (assign)
    squadCard(R, i, T, t, preview) {
      const s = R.squad[i], sel = t && T.indexOf(t) === this.sel, inj = RUN().injuryIds(i, R).length;
      const ovr = RUN().ovrOf(i, R), ovr2 = preview ? RUN().ovrOf(i, Object.assign({}, R, { bag: R.bag.concat([{ id: preview, up: false, who: i }]) })) : ovr;
      const badges = R.bag.filter((b) => (b.who || 0) === i).map((b) => {
        const d = RUN().badge(b.id);
        return `<span class="sq-b ${d.injury ? 'inj' : ''}" style="--rc:${d.injury ? '#ff5a6e' : SFC_CONFIG.progression.rarities[d.rarity].color}" title="${esc(d.name + (b.up ? '+' : '') + ' · ' + d.desc)}">${this.badgeIcon(b.id, '')}</span>`;
      }).join('');
      return `<${t ? 'button' : 'div'} class="sq-card ${sel ? 'sel' : ''} ${s.you ? 'you' : ''}" ${t ? `data-rt="${t.key}"` : ''}>
          <div class="sq-top">${this.face(RUN().memberLook(i, R), s.you && !R.mirror)}
            <div class="sq-id"><b>${esc(RUN().memberName(i, R))}</b><em>${esc(s.role)}${RUN().seatOf(RUN().myKey(), R) === i ? ' · ' + esc(_t('YOU')) : s.h || (s.you && R.mirror) ? ' · ' + esc(_t('PLAYER')) : ''}</em></div>
            <span class="sq-ovr ${ovr2 > ovr ? 'pre' : ''}">${ovr2}</span>${inj ? `<i class="rs-x">✚</i>` : ''}</div>
          ${this.statRows(R, i, preview)}
          <div class="sq-badges">${badges || `<em>${esc(_t('No badges'))}</em>`}</div>
        </${t ? 'button' : 'div'}>`;
    },
    // BADGE vừa nhận: chọn người đeo (thẻ cầu thủ xem trước chỉ số sau khi đeo)
    assignCard(R, T, id) {
      const d = RUN().badge(id);
      const cards = T.map((t) => this.squadCard(R, t.i, T, t, d.stats ? id : null)).join('');
      return this.sheet('assign', _t('WHO GETS IT?'), '', `<div class="sq-give">${this.card(T, null, { id, up: false })}${d.stats ? '' : `<p>${esc(_t('Works for the whole team.'))}</p>`}</div><div class="sq-row3">${cards}</div>`, '');
    },
    squadSheet(R, T) {
      return this.sheet('squad', _t('SQUAD'), '', `<div class="sq-row3">${[0, 1, 2].map((i) => this.squadCard(R, i, T, null)).join('')}</div>`, this.btn(T, T[0], esc(_t('CLOSE'))));
    },
    /* ---------- màn BUILD YOUR SQUAD (user 2026-10-26): 3 ô vị trí, bấm ô = character của bạn nhảy sang (đồng đội AI ở ô đó đổi chỗ
     * với bạn), ứng viên lấp ô trống kế tiếp. Phòng co-op: ô có bạn bè đứng thì không nhảy vào được; vị trí của host = ô host đứng trong
     * phòng (Room.seatHost), ô của bạn bè vẫn cần 1 đồng đội AI dự phòng (không chọn thì lấy ngẫu nhiên lúc START RUN). ---------- */
    newPick() { this.pick = { me: 'FWD', cands: RUN().candidates(), mates: {}, order: [] }; },
    // vị trí của máy này: phòng co-op = ô đang đứng trong phòng
    pkMe() {
      const O = ON(), m = inRoom() && O.mine;
      return m && m.slot >= 0 ? O.slotRole(m.slot) : this.pick ? this.pick.me : 'FWD';
    },
    // người khác trong phòng đang đứng ở vị trí role (null = không ai)
    pkHuman(role) {
      if (!inRoom()) return null;
      const O = ON(), m = O.memberAt(O.slotOf(0, role));
      return m && (!O.mine || m.id !== O.mine.id) ? m : null;
    },
    // ô trống kế tiếp cần chọn đồng đội (theo thứ tự FWD -> MID -> DEF)
    pkNext() {
      const P = this.pick, me = this.pkMe();
      return POS().find((r) => r !== me && !this.pkHuman(r) && P.mates[r] == null) || null;
    },
    pkReady() { return !!this.pick && !this.pkNext(); },
    // nhảy sang ô role: đồng đội AI đang ở đó đổi sang ô cũ của mình
    pkMove(menu, role) {
      const P = this.pick, me = this.pkMe();
      if (role === me) return;
      if (this.pkHuman(role)) return menu.setMsg(_t('A friend is playing there.'), true);
      if (P.mates[role] != null) { P.mates[me] = P.mates[role]; P.order = P.order.map((r) => (r === role ? me : r)); }
      delete P.mates[role];
      P.me = role;
      if (inRoom()) ON().seatHost(role);
    },
    renderPick(menu) {
      const P = this.pick, T = this.targets(), me = this.pkMe(), next = this.pkNext(), room = inRoom();
      this.sel = Math.max(0, Math.min(T.length - 1, this.sel));
      const A = SFC_CONFIG.progression.attrs;
      // không hiện cả 6 chỉ số (rối): chỉ 2 chỉ số mạnh nhất của người đứng ô
      const mini = (mem) => {
        const r = RUN().baseOf(mem), top = A.order.slice().sort((a, b) => r[b] - r[a]).slice(0, 2);
        return `<span class="bd-fx">${top.map((x) => `<i style="--c:${A.list[x].color}">${esc(A.list[x].short)} ${r[x]}</i>`).join('')}</span>`;
      };
      const ovr = (mem) => { const v = Object.values(RUN().baseOf(mem)); return Math.round(v.reduce((a, b) => a + b, 0) / v.length); };
      const label = (t) => esc(t.k === 'invite' ? _t('INVITE') : room ? (this.leaveArm ? _t('CONFIRM LEAVE') : _t('LEAVE ROOM')) : _t('BACK'));
      const btns = T.filter((t) => ['invite', 'cancel'].includes(t.k)).map((t) => this.btn(T, t, label(t), t.k === 'cancel' && this.leaveArm ? 'danger' : '')).join('');
      const go = T.find((t) => t.k === 'go'), unpick = (role) => T.find((t) => t.k === 'unpick' && t.id === role);
      const slots = T.filter((t) => t.k === 'slot').map((t) => {
        const role = t.id, h = this.pkHuman(role), ci = P.mates[role], m = ci != null ? P.cands[ci] : null, sel = T.indexOf(t) === this.sel ? 'sel' : '';
        let body;
        if (role === me) body = `${this.face(null, true)}<b>${esc(SFC.Profile.data.name || 'PLAYER')}</b><span class="sq-ovr">${ovr({ role })}</span>${mini({ role })}<u class="pk-tag me">${esc(_t('YOU'))}</u>`;
        else if (h) body = `${this.face(h.pf.look, false)}<b>${esc(h.pf.name)}</b><span class="sq-ovr">${ovr({ role })}</span>${mini({ role })}<u class="pk-tag">${esc(_t('PLAYER'))}</u>`;
        else if (m) {
          const x = unpick(role);
          body = `${this.face(RUN().mateLook(m), false)}<b>${esc(m.name)}</b><span class="sq-ovr">${ovr({ role, m })}</span>${mini({ role, m })}<u class="pk-tag ai">AI</u>
            <i class="pk-x ${T.indexOf(x) === this.sel ? 'sel' : ''}" data-rt="${x.key}">✕</i>`;
        }
        else body = `<div class="pk-q">?</div>`;
        return `<button class="pk-slot ${role === next ? 'on' : ''} ${!m && !h && role !== me ? 'empty' : ''} ${role === me ? 'mine' : ''} ${sel}" data-rt="${t.key}"><em>${esc(role)}</em>${body}</button>`;
      }).join('');
      const cands = T.filter((t) => t.k === 'cand').map((t) => {
        // sở trường (chỉ số lệch so với nền vị trí) + trường phái Core nhiều nhất trong deck (Core AI của họ bốc từ deck)
        const m = P.cands[t.i], mem = { role: next, m }, cnt = {};
        for (const id of m.deck) { const tg = (SFC_CONFIG.cores.list[id].tags || [])[0]; if (tg) cnt[tg] = (cnt[tg] || 0) + 1; }
        const sch = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a]).slice(0, 2);
        const tr = RUN().traits(mem).filter((x) => x.d > 0).slice(0, 2)
          .map((x) => `<i style="--c:${A.list[x.s].color}">${esc(A.list[x.s].short)} +${x.d}</i>`).join('');
        return `<button class="pk-cand ${T.indexOf(t) === this.sel ? 'sel' : ''} ${next ? '' : 'dis'}" data-rt="${t.key}">${this.face(RUN().mateLook(m), false)}
            <b>${esc(m.name)}</b><span class="sq-ovr">${ovr(mem)}</span><span class="bd-fx">${tr}</span><span class="pk-sch">${sch.map((x) => PX().arch(x, 'sm')).join('')}</span></button>`;
      }).join('');
      const msg = menu.msg ? `<div class="m-msg ${menu.msgErr ? 'err' : ''}">${esc(menu.msg)}</div>` : '';
      menu.el.innerHTML = `<div class="rm-page pk-page ${room ? 'coop' : ''}">
          <div class="rm-bar"><div class="rm-head"><b>${esc(_t('BUILD YOUR SQUAD'))}</b></div><div class="rm-acts">${this.roomChip()}${btns}</div></div>
          <div class="pk-slots">${slots}</div>
          <div class="pk-hint">${esc(next ? _t('Pick your {role}', { role: next }) : _t('Badges you find on the path can go on anyone.'))}</div>
          <div class="pk-sub">${esc(_t('Click a position to play there'))}</div>
          <div class="pk-cands">${cands}</div>${msg}
          ${go ? `<div class="pk-go">${this.btn(T, go, esc(_t('START RUN')))}</div>` : ''}
        </div>`;
      menu.bindAvatars();
    },
    sheet(cls, title, sub, body, foot) {
      return `<div class="rm-actcard rm-sheet ${cls}"><b>${esc(title)}</b>${sub ? `<span>${esc(sub)}</span>` : ''}${body}<div class="rm-sheet-foot">${foot}</div></div>`;
    },
    offerCard(R, T, offer) {
      const cards = T.filter((t) => t.k === 'pick').map((t) => this.card(T, t, { id: t.id, up: false })).join('');
      const title = offer.kind === 'treasure' ? _t('TREASURE') : _t('PICK A BADGE');
      return this.sheet('', title, '', `<div class="bd-row">${cards}</div>`, this.btn(T, T.find((t) => t.k === 'skip'), esc(_t('SKIP'))));
    },
    shopCard(R, T) {
      const rm = R.room, P = RUN().pl(RUN().myKey(), R) || R;
      const items = T.filter((t) => t.k === 'buy').map((t) => {
        const it = rm.items[t.i];
        return this.card(T, t, { id: it.id, up: false }, it.sold ? { tag: _t('SOLD'), dis: true } : { price: it.price, poor: P.cash < it.price });
      }).join('');
      const heal = T.filter((t) => t.k === 'heal').map((t) => this.card(T, t, R.bag[t.i], { price: CFG().shop.heal, poor: P.cash < CFG().shop.heal, who: R.bag[t.i].who || 0 })).join('');
      // co-op: ví riêng; bấm LEAVE = xong mua sắm, Shop đóng khi mọi người xong
      const lv = T.find((t) => t.k === 'leave');
      const body = lv ? `<div class="bd-row">${items}</div>${heal ? `<div class="bd-sub">${esc(_t('Treat an injury'))}</div><div class="bd-row">${heal}</div>` : ''}`
        : `<div class="bd-sub">${esc(_t('Waiting for the others to finish shopping...'))}</div>`;
      return this.sheet('shop', _t('SHOP'), '', body, `<span class="rm-cash">$${P.cash}</span>${lv ? this.btn(T, lv, esc(inRoom() ? _t('DONE') : _t('LEAVE'))) : ''}`);
    },
    restCard(R, T) {
      // co-op: bỏ phiếu (dấu phiếu trên thẻ)
      const heal = T.filter((t) => t.k === 'heal').map((t) => this.card(T, t, R.bag[t.i], { tag: _t('HEAL'), who: R.bag[t.i].who || 0, votes: this.votes(R, 'rest', 'heal:' + t.i) })).join('');
      const up = T.filter((t) => t.k === 'up').map((t) => this.card(T, t, Object.assign({}, R.bag[t.i], { up: true }), { tag: _t('UPGRADE'), who: R.bag[t.i].who || 0, votes: this.votes(R, 'rest', 'up:' + t.i) })).join('');
      // 1 hàng tự xuống dòng: thẻ chữa (nhãn HEAL) rồi thẻ nâng cấp (nhãn UPGRADE, hiện số liệu sau nâng cấp)
      const body = heal || up ? `<div class="bd-row wrap">${heal}${up}</div>` : `<div class="bd-sub">${esc(_t('Nothing to do here. Catch your breath.'))}</div>`;
      return this.sheet('rest', _t('LOCKER ROOM'), inRoom() ? _t('Vote for one') : _t('Pick one'), `<div class="bd-scroll">${body}</div>`,
        this.btn(T, T.find((t) => t.k === 'leave'), esc(_t('LEAVE')) + this.votes(R, 'rest', 'leave')));
    },
    // giới thiệu SKILL GAME: mô tả + 3 mốc (số cần đạt + thưởng: $ · $ + BADGE · $ + chọn 1 trong 3) + hỏng = chấn thương
    drillCard(R, T) {
      const D = CFG().drills[R.room.drill], TC = CFG().tiers, unit = SFC.UI.drillUnit({ cfg: D });
      const reward = [_t('Cash'), _t('Cash + a badge'), _t('Cash + pick 1 of 3')];
      const tiers = D.tiers.map((x, i) => `<span class="rm-tier" style="--mc:${TC[i].color}"><i></i><b>${x}</b><em>${esc(TC[i].name)}</em><u>${esc(reward[i])}</u></span>`).join('');
      // co-op: 1 người đá (xoay vòng), người khác xem
      const pk = R.room.player, who = !inRoom() ? '' : `<div class="rm-turn">${esc(pk === RUN().myKey() ? _t('Your turn!') : _t('{name} plays this one', { name: this.keyName(R, pk) }))}</div>`;
      return this.sheet('drill', _t('SKILL GAME'), D.name, `${who}<div class="rm-drill">${PX().ui(D.icon, 'x3')}<p>${esc(D.desc)}<br><small>${D.time}s · ${esc(unit)}</small></p></div>
          <div class="rm-tiers">${tiers}<span class="rm-tier fail"><i></i><b>&lt;${D.tiers[0]}</b><em>${esc(_t('FAIL'))}</em><u>${esc(_t('An injury'))}</u></span></div>`,
        T[0] ? this.btn(T, T[0], esc(_t('START'))) : '');
    },
    eventCard(R, T) {
      const E = CFG().events[R.room.id];
      const btns = T.map((t) => {
        const c = E.choices[t.i], ok = RUN().canChoose(c);
        const hint = [c.cost ? `-$${c.cost}` : '', c.badge ? 'BADGE' : '', c.injury ? `${PX().ui('boom', 'sm')}?` : '', c.win ? `$${c.win.cash}?` : '', c.healAll ? PX().ui('check', 'sm') : ''].filter(Boolean).join(' ');
        return this.btn(T, t, `${esc(c.label)}${hint ? ` <em>${hint}</em>` : ''}${this.votes(R, 'choose', String(t.i))}`, ok ? '' : 'dis');
      }).join('');
      return this.sheet('event', E.title, '', `<div class="rm-drill">${PX().ui(E.icon, 'x3')}<p>${esc(E.text)}</p></div>`, btns);
    },
    bagCard(R, T) { return this.squadSheet(R, T); },
    // hết run: CHAMPIONS / RUN OVER + trận đã thắng, boss đã hạ, gold quy đổi (thẻ che map như thẻ mở act)
    endCard(R, T) {
      const games = R.log.filter((x) => x.kind !== 'skill'), wins = games.filter((x) => x.my > x.op), last = games[games.length - 1];
      const bosses = wins.filter((x) => x.kind === 'boss').length;
      if (R.demoEnd) return this.demoCard(R, T);
      const line = R.won ? _t('You beat every act. You are the GOAT.')
        : R.forfeit ? _t('You forfeited the run.')
        : last ? _t('Knocked out by {team}.', { team: (TEAMS()[last.team] || {}).name || '' }) : '';
      const score = !R.won && !R.forfeit && last ? `<em class="rm-score">${last.my} - ${last.op}</em>` : '';
      return `<div class="rm-actcard rm-end ${R.won ? 'champ' : 'out'}">
          <b>${esc(R.won ? _t('CHAMPIONS') : _t('RUN OVER'))}</b><span>${esc(line)}</span>${score}
          <div class="rm-tally"><span>${PX().ui('ball', 'sm')} ${esc(_tn('{n} win', '{n} wins', wins.length))}</span><span>${PX().ui('crown', 'sm')} ${bosses}</span>
            ${R.metaGold ? `<span><i class="coin"></i>+${R.metaGold}</span>` : ''}${R.roadGain ? `<span title="${esc(_t('Core Road progress'))}">${PX().ui('star', 'sm')} +${R.roadGain}</span>` : ''}</div>
          ${(R.newCores || []).length ? `<div class="rm-newcores"><em>${esc(_t('NEW CORES'))}</em>${R.newCores.map((id) => `<span title="${esc(SFC_CONFIG.cores.list[id].name)}">${PX().core(id, 'x2')}</span>`).join('')}</div>` : ''}
          ${this.endBtn(T)}
        </div>`;
    },
    // bản DEMO: hạ boss act cuối được chơi
    demoCard(R, T) {
      return `<div class="rm-actcard rm-end champ"><b>${esc(_t('DEMO COMPLETE'))}</b><span>${esc(_t('The full game has two more acts.'))}</span>
          <div class="rm-tally"><span><i class="coin"></i>+${R.metaGold || 0}</span>${R.roadGain ? `<span>${PX().ui('star', 'sm')} +${R.roadGain}</span>` : ''}</div>
          ${this.endBtn(T)}</div>`;
    },
    // nút thẻ hết run: CONTINUE (chơi một mình / host) · khách co-op: LEAVE ROOM (host quyết định bắt đầu run mới)
    endBtn(T) {
      const t = T[0];
      if (!t) return '';
      return t.k === 'leaveroom' ? this.btn(T, t, esc(this.leaveArm ? _t('CONFIRM LEAVE') : _t('LEAVE ROOM')), this.leaveArm ? 'danger' : '') : this.btn(T, t, esc(_t('CONTINUE')));
    },
    // thẻ mở act: tên act + boss cuối act
    actCard(R, T) {
      const A = RUN().act(R.act), boss = TEAMS()[R.bosses[R.act]];
      return `<div class="rm-actcard" style="--ac:${A.color}">
          <span>${esc(_t('ACT {n}', { n: R.act + 1 }))}</span><b>${esc(A.name)}</b>
          <div class="rm-actboss"><canvas data-team="${R.bosses[R.act]}" data-idx="2"></canvas><em>${PX().ui('crown', 'sm')} ${esc(boss.name)}</em></div>
          ${T[0] ? this.btn(T, T[0], esc(_t('LET\'S GO'))) : ''}
        </div>`;
    },
    /* ---------- câu chuyện từng act (giai đoạn 4): cut-scene kiểu PROLOGUE, khuôn cảnh của FOOTBALL STORY (src/ui/story-cup.js) ---------- */
    // người dẫn truyện của act = người dẫn của Story cũ (acts[].narrator = id Story)
    narrator(A) {
      const S = SFC_CONFIG.stories.list.find((x) => x.id === A.narrator);
      return (S && S.narrator) || { name: 'GOAT PATH' };
    },
    // lời thoại config -> cảnh (mỗi dòng 1 cảnh). kind: intro · boss · after
    scenes(a, kind) {
      const A = RUN().act(a), R = RUN().run, N = this.narrator(A), boss = R.bosses[a], out = [];
      const lines = kind === 'intro' ? A.intro : kind === 'boss' ? A.bossTalk : A.after;
      const stage = (A.stages || [])[kind === 'intro' ? 0 : kind === 'boss' ? 1 : 2] || '';
      const base = { color: A.color, stage, vivid: false };
      const add = (sc) => out.push(Object.assign({}, base, sc));
      if (A.tell && stage) add({ card: true, dur: 1.7, lines: [] });
      // trước trận boss: cảnh VS với đội boss
      if (kind === 'boss') add({ art: 'cupFace', team: boss, theme: A.theme, dur: 2.4, lines: [{ at: 0.35, text: _t('VS'), style: 'shout' }, { at: 0.7, text: _t('BOSS'), style: 'sub' }] });
      const def = (who) => (who === 'host' ? (kind === 'intro' ? 'cupAlley' : N.art || 'cupHost') : kind === 'after' && who === 'opp' ? 'cupSad' : 'cupTalk');
      for (const l of lines || []) {
        const text = l.text.replace('{boss}', (TEAMS()[boss] || {}).name || '');
        const sfx = l.sfx ? [{ at: 0.05, text: l.sfx, style: 'shout' }] : [];
        add({ art: l.art || def(l.who), team: l.team || boss, who: l.who, dur: 1.6 + text.length * 0.035, theme: A.theme, trophy: A.trophy,
          fillers: A.teams, host: N, lines: sfx.concat([{ at: 0.25, who: l.who, text, style: 'caption' }]) });
      }
      // cảnh liền nhau cùng khuôn + cùng người: hình chạy tiếp, chỉ đổi lời thoại
      out.forEach((sc, i) => { const p = out[i - 1]; if (p && p.art === sc.art && p.who === sc.who && p.team === sc.team) sc.keep = true; });
      return out;
    },
    speaker(a, who, sc) {
      if (who === 'you') return { name: SFC.Profile.data.name || 'PLAYER', color: '#ffe14f' };
      if (who === 'opp') { const t = TEAMS()[sc.team] || {}; return { name: (t.players || [])[2] || t.name || '', color: t.kit ? t.kit.shirt : '#fff' }; }
      const A = RUN().act(a);
      return { name: this.narrator(A).name, color: A.color };
    },
    // chiếu cut-scene (app.screen = 'story', nhạc menu vẫn phát), xong / bỏ qua -> then
    cutscene(a, kind, then) {
      const sc = this.scenes(a, kind), app = SFC.Menu.app;
      if (!sc.length) return then();
      app.screen = 'story';
      SFC.Story.play(sc, () => then(), null, { speaker: (w, s) => this.speaker(a, w, s), music: true, tell: RUN().act(a).tell });
    },
    back2map() {
      const app = SFC.Menu.app;
      app.screen = 'menu';
      if (SFC.Menu.page === 'runmap') SFC.Menu.render();
    },
    // sau khi vẽ: giữ / đặt vị trí cuộn (cuộn bằng lăn chuột, không hiện thanh cuộn)
    bindMap(menu) {
      const box = menu.el.querySelector('.rm-map');
      if (!box) return;
      if (this.scroll != null) box.scrollTop = this.scroll;
      else {
        const n = RUN().run.at ? RUN().find(RUN().run.at) : RUN().run.map.floors[0][0];
        box.scrollTop = Math.max(0, this.pos(n).y - box.clientHeight * 0.7);
      }
      box.addEventListener('scroll', () => { this.scroll = box.scrollTop; });
    },
    // phím: giữ mục đang chọn trong khung nhìn (node trên map / thẻ trong khung cuộn)
    reveal(menu) {
      const box = menu.el.querySelector('.rm-map'), el = box && box.querySelector('.rm-node.sel');
      if (el) {
        const y = el.offsetTop, h = box.clientHeight;
        if (y < box.scrollTop + 40 || y > box.scrollTop + h - 40) { box.scrollTop = Math.max(0, y - h * 0.6); this.scroll = box.scrollTop; }
      }
      const card = menu.el.querySelector('.bd-scroll .sel');
      if (card) card.scrollIntoView({ block: 'nearest' });
    },

    act(menu, t) {
      if (!t) return;
      SFC.Audio.menu();
      const R = RUN().run, B = (id) => RUN().badge(id);
      if (t.k !== 'forfeit') this.quitArm = false;
      if (t.k !== 'forfeit' && t.k !== 'leaveroom' && !(t.k === 'cancel' && inRoom())) menu.msg = '';
      if (inRoom() && this.coopAct(menu, t)) return menu.render();
      switch (t.k) {
        case 'actgo': R.actNew = false; SFC.Profile.save(); break;
        case 'end': {
          // bản DEMO hết act: sang màn WISHLIST (cửa hàng không cho tự mở: Platform.autoWishlist -> về tab)
          const demo = R.demoEnd && SFC.Platform.autoWishlist;
          RUN().clear(); this.reset();
          return menu.go(demo ? 'wishlist' : 'run');
        }
        case 'back': return menu.go('run');
        case 'bag': this.bagOpen = true; break;
        case 'close': this.bagOpen = false; break;
        case 'forfeit':
          if (!this.quitArm) { this.quitArm = true; menu.setMsg(_t('Forfeit this run? It counts as a loss.'), true); return; }
          this.quitArm = false; menu.msg = '';
          RUN().forfeit();
          break;
        case 'pick': RUN().pick(t.i); break;
        case 'who': { const id = RUN().assign(t.i); if (id) menu.setMsg(_t('{name} → {who}', { name: B(id).name, who: RUN().memberName(t.i) })); break; }
        case 'slot': this.pkMove(menu, t.id); break;
        case 'cand': {
          const r = this.pkNext();
          if (!r) { menu.setMsg(_t('Remove a teammate to pick again.'), true); return; }
          this.pick.mates[r] = t.i; this.pick.order.push(r);
          break;
        }
        // bỏ đồng đội AI ở ô này (ô trống lại, chọn người khác)
        case 'unpick': delete this.pick.mates[t.id]; this.pick.order = this.pick.order.filter((r) => r !== t.id); break;
        case 'cancel': this.pick = null; return menu.go('run');
        case 'go': {
          const P = this.pick, mates = {};
          for (const r in P.mates) mates[r] = P.cands[P.mates[r]];
          RUN().start(mates, this.pkMe());
          this.reset();
          break;
        }
        case 'skip': RUN().pick(null); break;
        case 'buy':
          if (!RUN().buy(t.i)) { menu.setMsg(R.room.items[t.i].sold ? _t('Already sold.') : _t('Not enough cash.'), true); return; }
          break;
        case 'heal': {
          const id = R.bag[t.i].id;
          if (!RUN().heal(t.i)) { menu.setMsg(_t('Not enough cash.'), true); return; }
          menu.setMsg(_t('Healed: {name}', { name: B(id).name }));
          break;
        }
        case 'up': { const id = R.bag[t.i].id; if (RUN().upgrade(t.i)) menu.setMsg(_t('Upgraded: {name}', { name: B(id).name + '+' })); break; }
        case 'leave': RUN().leaveRoom(); break;
        case 'drill': return SFC.Menu.app.startRunMatch();
        case 'choose': {
          const res = RUN().choose(t.i);
          if (!res) { menu.setMsg(_t('You cannot do that right now.'), true); return; }
          const say = res.map((x) => x.kind === 'badge' ? _t('BADGE: {name}', { name: B(x.id).name }) : x.kind === 'injury' ? _t('Injury: {name} · {who}', { name: B(x.id).name, who: RUN().memberName(x.who) })
            : x.kind === 'cash' ? _t('Run cash +${n}', { n: x.n }) : x.kind === 'heal' ? _t('All injuries healed.') : x.kind === 'lost' ? _t('No luck.') : '').filter(Boolean);
          if (say.length) menu.setMsg(say.join(' · '), res.some((x) => x.kind === 'injury' || x.kind === 'lost'));
          break;
        }
        case 'node': {
          const r = RUN().enter(t.id);
          if (!r) return;
          // trận boss: cut-scene trước trận (1 lần mỗi act) rồi vào trận
          if (r.play && r.node.kind === 'boss' && !R.seen.includes('boss:' + R.act)) {
            R.seen.push('boss:' + R.act); SFC.Profile.save();
            return this.cutscene(R.act, 'boss', () => SFC.Menu.app.startRunMatch());
          }
          if (r.play) return SFC.Menu.app.startRunMatch();
          break;
        }
      }
      menu.render();
    },
    input(menu, input) {
      const T = this.targets(), n = T.length;
      if (!n) return;
      const nNode = T.filter((t) => t.k === 'node').length, onNode = this.sel < nNode;
      for (const d of ['left', 'right', 'up', 'down']) {
        if (!input.wasPressed(d)) continue;
        if (nNode) {
          // map: ←→ đi trong hàng (node / nút) · ↓ xuống nút · ↑ về node
          if (d === 'left' || d === 'right') {
            const lo = onNode ? 0 : nNode, len = onNode ? nNode : n - nNode;
            if (len > 0) this.sel = lo + ((this.sel - lo + (d === 'left' ? len - 1 : 1)) % len);
          } else if (d === 'down' && onNode && n > nNode) this.sel = nNode;
          else if (d === 'up' && !onNode) this.sel = 0;
        } else this.sel = (this.sel + (d === 'left' || d === 'up' ? n - 1 : 1)) % n;   // thẻ che: đi lần lượt
        SFC.Audio.menu();
        menu.render();
        return this.reveal(menu);
      }
      if (input.wasPressed('confirm')) this.act(menu, T[this.sel]);
    },
    click(menu, e) {
      const T = this.targets();
      const nb = e.target.closest('[data-rn]');
      if (nb) {
        const i = T.findIndex((t) => t.k === 'node' && t.id === nb.dataset.rn);
        if (i >= 0) { this.sel = i; this.act(menu, T[i]); }
        return true;
      }
      const b = e.target.closest('[data-rt]');
      if (!b) return false;
      const i = T.findIndex((t) => t.key === b.dataset.rt);
      if (i >= 0) { this.sel = i; this.act(menu, T[i]); }
      return true;
    },
    // Esc: túi đồ = đóng · thưởng = bỏ qua · Shop / Locker Room = rời · thẻ khác = nút chính · map = về tab GOAT PATH
    back(menu) {
      const T = this.targets(), f = (k) => T.find((t) => t.k === k);
      if (!RUN().run && this.pick) return this.act(menu, f('undo') || f('cancel'));
      const t = f('close') || f('skip') || f('leave') || (f('node') || f('back') ? f('back') : null) || (T.length === 1 && T[0].k !== 'drill' ? T[0] : null);
      if (t) this.act(menu, t);
    },
  };
  /* ================= CO-OP (phòng GOAT PATH online) ================= */
  Object.assign(RunUI, {
    // thao tác trong phòng: trả về true = đã xử lý (gửi host / host tự áp)
    coopAct(menu, t) {
      const R = RUN().run, host = isHost(), rm = R && R.room, P = R && RUN().pl(RUN().myKey(), R);
      if (t.k !== 'leaveroom' && t.k !== 'cancel') this.leaveArm = false;   // cancel = LEAVE ROOM ở màn BUILD YOUR SQUAD
      const send = (m) => { if (host) this.apply('host', m); else ON().runAction(m); };
      switch (t.k) {
        case 'leaveroom': case 'cancel':
          if (!this.leaveArm) { this.leaveArm = true; menu.setMsg(!host ? _t('Leave the room? Your friends keep playing.') : R ? _t('Leave? The co-op run ends for everyone in the room.') : _t('Leave? The room closes for everyone.'), true); return true; }
          this.leaveArm = false; menu.msg = '';
          ON().leave();
          return true;
        case 'invite': SFC.OnlineUI.invite(menu); return true;
        case 'node': send({ a: 'vote', k: 'node', v: t.id }); return true;
        case 'choose': send({ a: 'vote', k: 'choose', v: String(t.i) }); return true;
        case 'up': send({ a: 'vote', k: 'rest', v: 'up:' + t.i }); return true;
        case 'heal':
          if (rm && rm.kind === 'rest') send({ a: 'vote', k: 'rest', v: 'heal:' + t.i });
          else if (P.cash < CFG().shop.heal) menu.setMsg(_t('Not enough cash.'), true);
          else send({ a: 'heal', k: t.i });
          return true;
        case 'leave':
          if (rm && rm.kind === 'rest') send({ a: 'vote', k: 'rest', v: 'leave' });
          else send({ a: 'ready' });
          return true;
        case 'buy': {
          const it = rm && rm.items[t.i];
          if (!it || it.sold) menu.setMsg(_t('Already sold.'), true);
          else if (P.cash < it.price) menu.setMsg(_t('Not enough cash.'), true);
          else send({ a: 'buy', i: t.i });
          return true;
        }
        case 'pick': send({ a: 'pick', i: t.i }); return true;
        case 'skip': send({ a: 'pick', i: -1 }); return true;
        case 'who': send({ a: 'who', i: t.i }); return true;
        case 'drill': send({ a: 'drill' }); return true;
        // chỉ host
        case 'actgo': R.actNew = false; SFC.Profile.save(); ON().shareRun(); return true;
        case 'end': RUN().clear(); this.reset(); ON().shareRun(); return true;
        // khách chưa có run: đổi sang ô còn trống trong phòng (host: nhảy ô ở màn BUILD YOUR SQUAD, xử lý chung với chơi một mình)
        case 'slot':
          if (host) return false;
          if (this.pkHuman(t.id)) { menu.setMsg(_t('A friend is playing there.'), true); return true; }
          ON().requestSlot(ON().slotOf(0, t.id));
          return true;
        case 'go': {
          const Pk = this.pick, mates = {};
          for (const r in Pk.mates) mates[r] = Pk.cands[Pk.mates[r]];
          RUN().start(mates, this.pkMe());
          this.reset();
          ON().seatHost(RUN().run.squad[0].role);
          ON().shareRun();
          return true;
        }
      }
      return false;
    },
    // máy host áp 1 thao tác (key = 'host' | mã hồ sơ khách gửi tới qua Session — đã qua kiểm tra của Run)
    apply(key, m) {
      const R = RUN().run;
      if (!R || R.mirror || !m) return;
      const rm = R.room, i = clampI(m.i);
      switch (m.a) {
        case 'vote': RUN().castVote(key, String(m.k), String(m.v)); break;
        case 'pick': RUN().pick(i >= 0 ? i : null, key); break;
        case 'who': RUN().assign(i, key); break;
        case 'buy': RUN().buy(i, key); break;
        case 'heal': if (rm && rm.kind === 'shop') RUN().heal(clampI(m.k), key); break;
        case 'ready': RUN().shopReady(key); break;
        case 'drill': if (rm && rm.kind === 'skill' && (key === 'host' || rm.player === key)) return this.startCoop(); break;
      }
      SFC.Profile.save();
      if (!this.resolve()) this.refresh();
    },
    // host: lá phiếu đủ / hết giờ -> chốt rồi làm theo. true = đã xử lý (đã gửi phòng + vẽ lại)
    resolve() {
      if (!RUN().voteReady()) return false;
      const res = RUN().voteRoll(), R = RUN().run, menu = SFC.Menu;
      if (!res) { this.refresh(); return true; }
      if (res.kind === 'node') {
        const r = RUN().enter(res.v);
        if (r && r.play) {
          // trận boss: cut-scene trước trận chiếu cùng lúc ở mọi máy (1 lần mỗi act), chờ khách xem xong rồi vào trận
          if (r.node.kind === 'boss' && !R.seen.includes('boss:' + R.act)) {
            R.seen.push('boss:' + R.act); SFC.Profile.save();
            this.refresh();
            this.cueRoom(R.act, 'boss');
            this.cutscene(R.act, 'boss', () => this.waitScenes(() => this.startCoop()));
            return true;
          }
          this.refresh();
          this.startCoop();
          return true;
        }
      } else if (res.kind === 'choose') {
        const out = RUN().choose(+res.v, res.voters) || [];
        const B = (id) => RUN().badge(id);
        const say = out.map((x) => x.kind === 'badge' ? _t('BADGE: {name}', { name: B(x.id).name }) : x.kind === 'injury' ? _t('Injury: {name} · {who}', { name: B(x.id).name, who: RUN().memberName(x.who) })
          : x.kind === 'cash' ? _t('Run cash +${n}', { n: x.n }) : x.kind === 'heal' ? _t('All injuries healed.') : x.kind === 'lost' ? _t('No luck.') : '').filter(Boolean);
        if (say.length) menu.setMsg(say.join(' · '), out.some((x) => x.kind === 'injury' || x.kind === 'lost'));
      } else if (res.kind === 'rest') {
        const [a, k] = res.v.split(':');
        if (a === 'heal') RUN().heal(+k);
        else if (a === 'up') RUN().upgrade(+k);
        else RUN().leaveRoom();
      }
      SFC.Profile.save();
      this.refresh();
      return true;
    },
    // host: gửi bản sao mới cho phòng + vẽ lại màn của máy này
    refresh() {
      ON().shareRun();
      if (SFC.Menu.page === 'runmap' && SFC.Menu.app.screen === 'menu') SFC.Menu.render();
    },
    // host: dựng trận / Skill game của node đang chọn cho cả phòng (mỗi người đá vị trí đang đứng với chỉ số của ô đội hình đó,
    // ô không có người = đồng đội AI của run). Skill game: chỉ người tới lượt ra sân, người khác xem
    startCoop() {
      const M = RUN().match(), R = RUN().run, O = ON();
      if (!M || !R || !O.isHost) return;
      const S = SFC.Room.Slots, L = O.lobby, here = L.members.filter((m) => m.slot >= 0 && !m.away);
      const idOf = (key) => { const m = key === 'host' ? O.room.member('host') : here.find((x) => x.pf && x.pf.uid === key); return m ? m.id : null; };
      const only = M.drill ? [idOf(R.room.player) || 'host'] : null;
      const playing = only ? here.filter((m) => only.includes(m.id)) : here;
      const roles = playing.map((m) => S.role(m.slot));
      const seat = {};
      R.squad.forEach((s, i) => { seat[s.role] = { stats: RUN().statsOf(i), ovr: RUN().ovrOf(i), inj: RUN().injuryIds(i) }; });
      // đồng đội AI: ô đội hình không có người ra sân (Skill game 1 người: không có, trừ bài cả đội)
      const size = M.drill ? M.teamSize[0] : SFC_CONFIG.game.roles.length;
      const mates = size > playing.length ? RUN().mateSpecs().filter((x) => !roles.includes(x.role)).slice(0, size - playing.length) : [];
      // đối thủ mạnh lên theo số người thật ra sân
      const sc = RUN().coopScale(playing.length), ai = SFC.MainPath.aiProfile(M.elo + sc.elo);
      const match = {
        difficulty: 'normal', aiProfile: ai, mateProfile: ai, humanTeam: 0, statMul: [1, sc.statMul],
        arena: SFC_CONFIG.arenas[M.arena] ? M.arena : undefined, run: M.info,
      };
      if (M.drill) Object.assign(match, { drill: M.drill, drillSeed: Math.floor(Math.random() * 2 ** 31), teamSize: M.teamSize.slice(), noDraft: true });
      else Object.assign(match, { signature: [null, M.signature], knockout: true, mod: M.mod, barks: M.barks }, RUN().matchOpts());
      O.startStory({ away: M.team, mates, seat, only, match });
    },
    // host: chờ khách xem xong cut scene (tối đa net.sceneWait giây)
    waitScenes(go) {
      clearInterval(this.waitT);
      const done = () => { clearInterval(this.waitT); SFC.Menu.msg = ''; go(); };
      if (!ON().scenesPending) return done();
      SFC.Menu.setMsg(_t('Waiting for the others to finish the scene...'));
      this.waitT = setInterval(() => { if (!ON().scenesPending || !inRoom()) done(); }, 250);
    },
    // host: báo cả phòng chiếu cut scene của act
    cueRoom(act, kind) { if (inRoom() && ON().isHost) ON().cueScenes(`run:${act}:${kind}`); },
    // khách: host báo chiếu cut scene -> chiếu cùng, xong báo lại
    remoteScenes(kind) {
      const [, a, k] = kind.split(':'), act = +a;
      if (SFC.Menu.app.screen !== 'menu' || !RUN().act(act)) { ON().scenesDone(); return; }
      this.cutscene(act, k, () => { this.back2map(); ON().scenesDone(); });
    },
    // host: phòng đổi người -> ví / ô đội hình của khách (gọi trước mỗi lần gửi bản sao)
    syncRoom() {
      const R = RUN().run, O = ON();
      if (!R || R.mirror || !O.room) return;
      const S = SFC.Room.Slots;
      RUN().syncRoom(O.lobby.members.filter((m) => m.id !== 'host' && !m.away && m.slot >= 0 && m.pf)
        .map((m) => ({ key: m.pf.uid || m.id, name: m.pf.name, look: m.pf.look, role: S.role(m.slot) })));
    },
    // tên người có mã key (co-op)
    keyName(R, key) {
      if (key === RUN().myKey()) return _t('YOU');
      if (key === 'host') return R.mirror ? R.hostName || 'HOST' : SFC.Profile.data.name || 'PLAYER';
      return (R.guests[key] && R.guests[key].name) || 'PLAYER';
    },
    // dấu phiếu trên node / nút / thẻ (mỗi phiếu 1 chấm, phiếu của mình vàng)
    votes(R, kind, v) {
      const V = inRoom() && R.vote;
      if (!V || V.kind !== kind) return '';
      const ks = Object.keys(V.ballots).filter((k) => V.ballots[k] === String(v));
      return ks.length ? `<i class="rv">${ks.map((k) => `<u class="${k === RUN().myKey() ? 'me' : ''}" title="${esc(this.keyName(R, k))}"></u>`).join('')}</i>` : '';
    },
    // dòng báo co-op dưới map: đang chờ ai / đã bao nhiêu phiếu
    waitNote(R) {
      if (!inRoom()) return '';
      const me = RUN().myKey(), host = isHost(), hostName = this.keyName(R, 'host');
      if (!RUN().active()) return host ? '' : _t('Waiting for {name}...', { name: hostName });
      const busy = RUN().busy(R).filter((k) => k !== me), mine = RUN().pl(me, R);
      if (mine.offer || mine.assign) return '';
      if (busy.length) return _t('Waiting for {names} to pick a badge...', { names: busy.map((k) => this.keyName(R, k)).join(', ') });
      if (R.actNew && !host) return _t('Waiting for {name}...', { name: hostName });
      if (R.vote) return _t('Votes: {n}/{max}', { n: Object.keys(R.vote.ballots).length, max: RUN().keys(R).length });
      if (!R.room && !R.actNew && RUN().keys(R).length > 1) return _t('Vote for the next stop');
      return '';
    },
    // mã phòng trên thanh map (bấm = chép)
    roomChip() {
      if (!inRoom()) return '';
      const code = ON().code || '';
      return `<span class="rm-room" data-copy="${esc(code)}"><em>${esc(_t('ROOM CODE'))}</em><b>${esc(code)}</b></span>`;
    },
    // khách: host chưa bắt đầu run -> mã phòng + 3 ô vị trí (bấm ô trống = đổi sang đó) + chờ host
    renderWait(menu) {
      const T = this.targets(), O = ON(), L = O.lobby;
      this.sel = Math.max(0, Math.min(T.length - 1, this.sel));
      const me = this.pkMe();
      const slots = T.filter((t) => t.k === 'slot').map((t) => {
        const m = O.memberAt(O.slotOf(0, t.id)), sel = T.indexOf(t) === this.sel ? 'sel' : '';
        const body = m ? `${this.face(m.pf.look, false)}<b>${esc(m.pf.name)}</b><u class="pk-tag ${t.id === me ? 'me' : ''}">${esc(t.id === me ? _t('YOU') : m.id === L.owner ? _t('HOST') : _t('PLAYER'))}</u>`
          : `<div class="pk-q">AI</div>`;
        return `<button class="pk-slot ${m ? '' : 'empty'} ${t.id === me ? 'mine' : ''} ${sel}" data-rt="${t.key}"><em>${esc(t.id)}</em>${body}</button>`;
      }).join('');
      const btns = T.filter((t) => t.k !== 'slot').map((t) => this.btn(T, t, esc(t.k === 'invite' ? _t('INVITE') : this.leaveArm ? _t('CONFIRM LEAVE') : _t('LEAVE ROOM')), t.k === 'leaveroom' && this.leaveArm ? 'danger' : '')).join('');
      const host = L.members.find((x) => x.id === L.owner);
      const msg = menu.msg ? `<div class="m-msg ${menu.msgErr ? 'err' : ''}">${esc(menu.msg)}</div>` : '';
      menu.el.innerHTML = `<div class="rm-page pk-page coop">
          <div class="rm-bar"><div class="rm-head"><b>GOAT PATH</b></div><div class="rm-acts">${this.roomChip()}${btns}</div></div>
          <div class="pk-slots">${slots}</div>
          <div class="pk-hint">${esc(_t('Waiting for {name} to start the run...', { name: host ? host.pf.name : 'HOST' }))}</div>
          <div class="pk-sub">${esc(_t('Click a position to play there'))}</div>${msg}
        </div>`;
      menu.bindAvatars();
    },
  });
  const clampI = (v) => Math.max(-1, Math.min(99, Math.floor(+v || 0)));
  // host: hết giờ bỏ phiếu thì chốt (đủ phiếu đã chốt ngay lúc nhận phiếu)
  setInterval(() => {
    if (inRoom() && ON().isHost && ON().status === 'lobby' && RUN().run && RUN().run.vote && SFC.Menu.app && SFC.Menu.app.screen === 'menu') RunUI.resolve();
  }, 400);

  const _tn = (...a) => SFC.tn(...a);

  SFC.RunUI = RunUI;
})();
