/* RunUI — GOAT PATH (docs/RUN_DESIGN.md). Logic: src/meta/run.js (SFC.Run), số liệu: config/run.config.js.
 *   page 'run'    (tab màn PLAY, vẽ trong khung pt-* của Menu): 3 act (sân + boss) + kỷ lục · START RUN / CONTINUE · FORFEIT RUN
 *   page 'runmap' (màn 1 run): thanh trên (tên act + FORFEIT / BACK) + map của act đang đá rộng hết màn, cuộn dọc kiểu Slay the Spire
 *                 (tầng 0 dưới cùng, boss trên cùng; lăn chuột, không hiện thanh cuộn). Node chỉ cho biết loại, đối thủ biết khi vào trận.
 *                 Thẻ che map: thẻ mở act · thưởng chọn 1 trong 3 BADGE · SHOP · LOCKER ROOM · SKILL GAME (giới thiệu bài) · sự kiện ???
 *                 · túi BADGE (thanh 6 chỉ số character) · hết run: RUN OVER / CHAMPIONS + gold quy đổi, CONTINUE = xoá run về tab.
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

  const RunUI = {
    pages: ['runmap'],
    sel: 0,            // page 'runmap': mục đang chọn (node chọn được trước, rồi tới nút)
    quitArm: false,    // FORFEIT: bấm 2 lần
    key: null,         // trạng thái đã vẽ (đổi -> cuộn map về chỗ đang đứng)
    scroll: null,      // vị trí cuộn map giữ qua các lần vẽ lại
    bagOpen: false,    // đang xem túi BADGE

    /* ================= page 'run' (tab PLAY) ================= */
    tabItems(menu) {
      const R = RUN().run, live = RUN().active(), items = [];
      items.push({ kind: 'btn', main: true, label: R ? _t('CONTINUE') : _t('START RUN'), act: () => {
        if (!R) { RUN().start(); this.reset(); }
        menu.go('runmap');
      } });
      if (live) items.push({ kind: 'btn', forfeit: true, label: this.quitArm ? _t('CONFIRM FORFEIT') : _t('FORFEIT RUN'), act: () => this.forfeit(menu) });
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
        return `<div class="rt-act ${on ? 'on' : ''} ${done ? 'done' : ''} ${lock ? 'lock' : ''}" style="--ac:${a.color}" ${lock ? `title="${esc(_t('FULL GAME'))}"` : ''}>
            <canvas data-ract="${i}" width="120" height="56"></canvas>
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
          ${where}${msg}
          <div class="pt-acts">${btn((x) => x.forfeit)}${btn((x) => x.main)}</div>
          <div class="pt-hint">${esc(_t('3 acts · pick your path · lose once and the run is over'))}</div>
        </div>
        <button class="pt-back" data-back="1">◀ ${esc(_t('BACK'))}</button>`;
    },
    // ảnh sân của từng act (tab 'run')
    bind(menu) {
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
    reset() { this.sel = 0; this.quitArm = false; this.key = null; this.scroll = null; this.bagOpen = false; },

    /* ================= page 'runmap' ================= */
    // mục chọn được. Thứ tự che: hết run > thưởng chọn BADGE > phòng (Shop / Locker Room / Skill game / sự kiện) > thẻ mở act > túi đồ > map.
    // Mỗi mục: { k, key (data-rt), ... }; node map: k 'node' + id (data-rn)
    targets() {
      const R = RUN().run;
      if (!R) return [];
      const T = (k, extra = {}) => Object.assign({ k, key: k + (extra.i != null ? ':' + extra.i : extra.id ? ':' + extra.id : '') }, extra);
      if (!RUN().active()) return [T('end', { main: true })];
      if (R.offer) return R.offer.ids.map((id, i) => T('pick', { i, id })).concat([T('skip')]);
      const rm = R.room;
      if (rm && rm.kind === 'shop') {
        const heal = rm.healed ? [] : RUN().injuries().map((b) => T('heal', { id: b.id }));
        return rm.items.map((x, i) => T('buy', { i, id: x.id })).concat(heal, [T('leave', { main: true })]);
      }
      if (rm && rm.kind === 'rest') {
        const up = R.bag.filter((b) => !b.up && !RUN().badge(b.id).noUp && !RUN().badge(b.id).injury).map((b) => T('up', { id: b.id }));
        return RUN().injuries().map((b) => T('heal', { id: b.id })).concat(up, [T('leave')]);
      }
      if (rm && rm.kind === 'skill') return [T('drill', { main: true })];
      if (rm && rm.kind === 'event') return CFG().events[rm.id].choices.map((c, i) => T('choose', { i }));
      if (R.actNew) return [T('actgo', { main: true })];
      if (this.bagOpen) return [T('close', { main: true })];
      return RUN().available().map((n) => T('node', { id: n.id })).concat([T('bag'), T('forfeit'), T('back')]);
    },
    // bố cục (user 2026-10-25: không hiện thông tin đối thủ trước trận, không thanh cuộn): thanh trên (act + tiền + nút) · map rộng hết màn
    render(menu) {
      const R = RUN().run;
      if (!R) { menu.go('run'); return; }
      // cut-scene chờ chiếu: hạ boss (R.cue) · mở act (lần đầu vào act)
      if (R.cue) { const act = +R.cue.split(':')[1]; R.cue = null; SFC.Profile.save(); return this.cutscene(act, 'after', () => this.back2map()); }
      if (R.actNew && RUN().active() && !R.seen.includes('intro:' + R.act)) {
        R.seen.push('intro:' + R.act); SFC.Profile.save();
        return this.cutscene(R.act, 'intro', () => this.back2map());
      }
      const T = this.targets();
      this.sel = Math.max(0, Math.min(T.length - 1, this.sel));
      const key = [R.act, R.at, R.over, R.won, R.actNew, !!R.offer, R.room && R.room.kind, this.bagOpen].join(':');
      if (this.key !== key) {
        // trạng thái đổi (vừa xong 1 node / act mới / mở phòng / hết run): chọn mục đầu, cuộn về chỗ đang đứng
        const mapChanged = !this.key || this.key.split(':').slice(0, 2).join(':') !== key.split(':').slice(0, 2).join(':');
        this.key = key; this.sel = 0; this.quitArm = false;
        if (mapChanged) this.scroll = null;
      }
      const A = RUN().act(R.act);
      const dots = RUN().acts().map((a, i) => `<i class="${i < R.act || R.won ? 'done' : i === R.act ? 'on' : ''}" style="--c:${a.color}"></i>`).join('');
      const inj = RUN().injuries().length;
      const bar = T.filter((t) => t.k === 'bag' || t.k === 'forfeit' || t.k === 'back').map((t) => this.btn(T, t,
        t.k === 'bag' ? `${PX().ui('card', 'sm')} ${R.bag.length - inj}${inj ? ` <u class="inj">${PX().ui('boom', 'sm')}${inj}</u>` : ''}`
          : esc(t.k === 'forfeit' ? (this.quitArm ? _t('CONFIRM FORFEIT') : _t('FORFEIT RUN')) : _t('BACK')), t.k === 'forfeit' && this.quitArm ? 'danger' : '')).join('');
      const msg = menu.msg ? `<div class="m-msg run-msg ${menu.msgErr ? 'err' : ''}">${esc(menu.msg)}</div>` : '';
      menu.el.innerHTML = `<div class="rm-page" style="--ac:${A.color}">
          <div class="rm-bar"><div class="rm-head"><span>${esc(_t('ACT {n}', { n: R.act + 1 }))} <u>${dots}</u></span><b>${esc(A.name)}</b></div>
            <div class="rm-acts"><span class="rm-cash" title="${esc(_t('Run cash'))}">$${R.cash}</span>${bar}</div></div>
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
      if (!RUN().active()) return this.endCard(R, T);
      if (R.offer) return this.offerCard(R, T);
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
            data-rn="${n.id}" style="left:${p.x}px;top:${p.y}px;--nc:${N.color}" title="${esc(N.name)}">${icon}${boss ? `<i class="rm-crown">${PX().ui('crown', 'sm')}</i>` : ''}</button>`;
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
      return `<button class="bd-card ${d.injury ? 'inj' : ''} ${extra.dis ? 'dis' : ''} ${sel ? 'sel' : ''}" ${t ? `data-rt="${t.key}"` : ''} style="--rc:${col}" title="${esc(d.desc)}">
          <span class="bd-ico">${this.badgeIcon(b.id)}</span>
          <b>${esc(d.name)}${b.up ? '+' : ''}</b>
          <span class="bd-fx">${this.chips(b)}</span>
          <em>${esc(d.injury ? _t('INJURY') : rar.label)}</em>${tag}
        </button>`;
    },
    // thanh 6 chỉ số của character trong run (nền + BADGE)
    statBar(R) {
      const A = SFC_CONFIG.progression.attrs, r = RUN().ratings(R);
      return `<div class="bd-stats">${A.order.map((s) => `<span style="--c:${A.list[s].color}" title="${esc(A.list[s].label)}">${PX().html(A.list[s].icon, '', 'sm')}<i>${esc(A.list[s].short)}</i><b class="${r[s] > A.fixed ? 'up' : r[s] < A.fixed ? 'down' : ''}">${r[s]}</b></span>`).join('')}</div>`;
    },
    sheet(cls, title, sub, body, foot) {
      return `<div class="rm-actcard rm-sheet ${cls}"><b>${esc(title)}</b>${sub ? `<span>${esc(sub)}</span>` : ''}${body}<div class="rm-sheet-foot">${foot}</div></div>`;
    },
    offerCard(R, T) {
      const cards = T.filter((t) => t.k === 'pick').map((t) => this.card(T, t, { id: t.id, up: false })).join('');
      const title = R.offer.kind === 'treasure' ? _t('TREASURE') : _t('PICK A BADGE');
      return this.sheet('', title, '', `<div class="bd-row">${cards}</div>`, this.btn(T, T.find((t) => t.k === 'skip'), esc(_t('SKIP'))));
    },
    shopCard(R, T) {
      const rm = R.room;
      const items = T.filter((t) => t.k === 'buy').map((t) => {
        const it = rm.items[t.i];
        return this.card(T, t, { id: it.id, up: false }, it.sold ? { tag: _t('SOLD'), dis: true } : { price: it.price, poor: R.cash < it.price });
      }).join('');
      const heal = T.filter((t) => t.k === 'heal').map((t) => this.card(T, t, { id: t.id }, { price: CFG().shop.heal, poor: R.cash < CFG().shop.heal, tag: _t('HEAL') })).join('');
      return this.sheet('shop', _t('SHOP'), '', `<div class="bd-row">${items}</div>${heal ? `<div class="bd-sub">${esc(_t('Treat an injury'))}</div><div class="bd-row">${heal}</div>` : ''}`,
        `<span class="rm-cash">$${R.cash}</span>${this.btn(T, T.find((t) => t.k === 'leave'), esc(_t('LEAVE')))}`);
    },
    restCard(R, T) {
      const heal = T.filter((t) => t.k === 'heal').map((t) => this.card(T, t, { id: t.id }, { tag: _t('HEAL') })).join('');
      const up = T.filter((t) => t.k === 'up').map((t) => this.card(T, t, { id: t.id, up: true }, { tag: _t('UPGRADE') })).join('');
      // 1 hàng tự xuống dòng: thẻ chữa (nhãn HEAL) rồi thẻ nâng cấp (nhãn UPGRADE, hiện số liệu sau nâng cấp)
      const body = heal || up ? `<div class="bd-row wrap">${heal}${up}</div>` : `<div class="bd-sub">${esc(_t('Nothing to do here. Catch your breath.'))}</div>`;
      return this.sheet('rest', _t('LOCKER ROOM'), _t('Pick one'), `<div class="bd-scroll">${body}</div>`, this.btn(T, T.find((t) => t.k === 'leave'), esc(_t('LEAVE'))));
    },
    drillCard(R, T) {
      const D = CFG().drills[R.room.drill];
      return this.sheet('drill', _t('SKILL GAME'), D.name, `<div class="rm-drill">${PX().ui(D.icon, 'x3')}<p>${esc(D.desc)}</p>
          <div class="rm-stakes"><span class="ok">${PX().ui('check', 'sm')} ${esc(_t('Cash + a badge'))}</span><span class="bad">${PX().ui('boom', 'sm')} ${esc(_t('Fail: an injury'))}</span></div></div>`,
        this.btn(T, T[0], esc(_t('START'))));
    },
    eventCard(R, T) {
      const E = CFG().events[R.room.id];
      const btns = T.map((t) => {
        const c = E.choices[t.i], ok = RUN().canChoose(c);
        const hint = [c.cost ? `-$${c.cost}` : '', c.badge ? 'BADGE' : '', c.injury ? `${PX().ui('boom', 'sm')}?` : '', c.win ? `$${c.win.cash}?` : '', c.healAll ? PX().ui('check', 'sm') : ''].filter(Boolean).join(' ');
        return this.btn(T, t, `${esc(c.label)}${hint ? ` <em>${hint}</em>` : ''}`, ok ? '' : 'dis');
      }).join('');
      return this.sheet('event', E.title, '', `<div class="rm-drill">${PX().ui(E.icon, 'x3')}<p>${esc(E.text)}</p></div>`, btns);
    },
    bagCard(R, T) {
      const cards = R.bag.map((b) => this.card(T, null, b)).join('') || `<div class="bd-sub">${esc(_t('No badges yet. Win matches to earn them.'))}</div>`;
      return this.sheet('bag', _t('BADGES'), '', `${this.statBar(R)}<div class="bd-scroll"><div class="bd-row wrap">${cards}</div></div>`, this.btn(T, T[0], esc(_t('CLOSE'))));
    },
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
          ${this.btn(T, T[0], esc(_t('CONTINUE')))}
        </div>`;
    },
    // bản DEMO: hạ boss act cuối được chơi
    demoCard(R, T) {
      return `<div class="rm-actcard rm-end champ"><b>${esc(_t('DEMO COMPLETE'))}</b><span>${esc(_t('The full game has two more acts.'))}</span>
          <div class="rm-tally"><span><i class="coin"></i>+${R.metaGold || 0}</span>${R.roadGain ? `<span>${PX().ui('star', 'sm')} +${R.roadGain}</span>` : ''}</div>
          ${this.btn(T, T[0], esc(_t('CONTINUE')))}</div>`;
    },
    // thẻ mở act: tên act + boss cuối act
    actCard(R, T) {
      const A = RUN().act(R.act), boss = TEAMS()[R.bosses[R.act]];
      return `<div class="rm-actcard" style="--ac:${A.color}">
          <span>${esc(_t('ACT {n}', { n: R.act + 1 }))}</span><b>${esc(A.name)}</b>
          <div class="rm-actboss"><canvas data-team="${R.bosses[R.act]}" data-idx="2"></canvas><em>${PX().ui('crown', 'sm')} ${esc(boss.name)}</em></div>
          ${this.btn(T, T[0], esc(_t('LET\'S GO')))}
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
      if (t.k !== 'forfeit') menu.msg = '';
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
        case 'pick': { const id = RUN().pick(t.i); if (id) menu.setMsg(_t('BADGE: {name}', { name: B(id).name })); break; }
        case 'skip': RUN().pick(null); break;
        case 'buy':
          if (!RUN().buy(t.i)) { menu.setMsg(R.room.items[t.i].sold ? _t('Already sold.') : _t('Not enough cash.'), true); return; }
          break;
        case 'heal':
          if (!RUN().heal(t.id)) { menu.setMsg(_t('Not enough cash.'), true); return; }
          menu.setMsg(_t('Healed: {name}', { name: B(t.id).name }));
          break;
        case 'up': if (RUN().upgrade(t.id)) menu.setMsg(_t('Upgraded: {name}', { name: B(t.id).name + '+' })); break;
        case 'leave': RUN().leaveRoom(); break;
        case 'drill': return SFC.Menu.app.startRunMatch();
        case 'choose': {
          const res = RUN().choose(t.i);
          if (!res) { menu.setMsg(_t('You cannot do that right now.'), true); return; }
          const say = res.map((x) => x.kind === 'badge' ? _t('BADGE: {name}', { name: B(x.id).name }) : x.kind === 'injury' ? _t('Injury: {name}', { name: B(x.id).name })
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
      const t = f('close') || f('skip') || f('leave') || (f('node') || f('back') ? f('back') : null) || (T.length === 1 && T[0].k !== 'drill' ? T[0] : null);
      if (t) this.act(menu, t);
    },
  };
  const _tn = (...a) => SFC.tn(...a);

  SFC.RunUI = RunUI;
})();
