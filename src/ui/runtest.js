/* PHÒNG TEST GOAT PATH (chỉ bản dev, SFC_DEBUG): thử nhanh BADGE + LEGEND (docs/RUN_DESIGN.md "Lớp sức mạnh, BADGE mới và LEGEND")
 * mà không cần đá run từ đầu. Mở: SETTINGS › TEST › RUN TEST (trang menu 'runtest'), hoặc index.html?runtest (mở trang),
 * ?runtest=match (đá ngay) · ?runtest=trial.<id LEGEND> (vào LEGEND TRIAL) · ?runtest=skill.<id bài> (vào SKILL GAME, run.drills) · trialcard.<id> / join.<id> (thẻ giới thiệu trial / thẻ nhận LEGEND) · ?runtest=map (map thử) — kèm &badges=var,report
 * &legends=haalandroid,,ramen (LEGEND của [bạn, đồng đội 1, đồng đội 2], bỏ trống = không có) &act=0..2.
 * Trang: ACT · OPPONENT (Matchday / Elite / Boss của act) · YOU (vị trí) · LEGEND cho từng người (lệch vị trí được) · BADGE (◀▶ chọn,
 * TOGGLE BADGE thêm / bỏ, UPGRADED bật số liệu nâng cấp) · MATCH · LEGEND TRIAL · MAP · thẻ PICK A BADGE / SHOP / LOCKER ROOM /
 * LEGEND JOIN · END TEST RUN.
 * Run thử KHÔNG đụng run thật: dựng run mới rồi trả Profile.data.run về như cũ, chạy qua Run.mirrorOn / mirrorR (R.mirror = false
 * nên máy này vẫn là "host" và ghi kết quả vào run thử). END TEST RUN (hoặc tải lại trang) = run thật trở lại.
 * Trong trận test: [ ] = đổi LEGEND của bạn ngay (chỉ số + kỹ thuật + khoảnh khắc, giữ cho lần đá lại) · L = khoảnh khắc LEGEND của
 * bạn ngay (bỏ qua nghỉ / giới hạn) · K = mọi LEGEND đội bạn · 8 = bạn +1 bàn
 * · 9 = đối thủ +1 bàn (thử VAR: bàn thua ghi bằng phím không qua VAR, để thử VAR phải để đối thủ ghi thật) · 0 = thắng luôn · - = đá lại.
 * Bản đóng gói: cả file thành rỗng (scripts/strip-debug.js xoá nhánh SFC_DEBUG, MARKERS có 'RUN TEST').
 */
window.SFC = window.SFC || {};

if (SFC_DEBUG) (function () {
  const RUN = () => SFC.Run;
  const RC = () => SFC_CONFIG.run;
  const LG = () => SFC_CONFIG.legends.list;
  const wrap = (v, n) => ((v % n) + n) % n;
  const badgeIds = () => Object.keys(RC().badges).filter((id) => !RC().badges[id].injury);
  const legendIds = () => [null].concat(Object.keys(LG()));

  const RunTest = {
    act: 0, oi: 0, role: 'FWD', legs: [null, null, null], bi: 0, badges: [], up: false, ti: 0,
    active: false,

    // đối thủ của act: Matchday · Elite · Boss
    opps() {
      const A = RC().acts[this.act];
      return A.teams.map((t) => ({ team: t, kind: 'match' })).concat((A.elite || []).map((t) => ({ team: t, kind: 'elite' })), A.boss.map((t) => ({ team: t, kind: 'boss' })));
    },
    legName(id) { return id ? `${LG()[id].name} (${LG()[id].role})` : 'NONE'; },

    /* ---------- trang menu ---------- */
    items(menu) {
      const o = this.opps()[this.oi % this.opps().length], B = RC().badges, bid = badgeIds()[this.bi], on = this.badges.includes(bid);
      const roles = RUN().roles(this.role), tl = Object.keys(LG())[this.ti];
      const leg = (i, label) => ({ kind: 'pick', label, value: this.legName(this.legs[i]), danger: true,
        change: (d) => { this.legs[i] = legendIds()[wrap(legendIds().indexOf(this.legs[i]) + d, legendIds().length)]; } });
      return [
        { kind: 'pick', label: 'ACT', value: `${this.act + 1} · ${RC().acts[this.act].name}`, danger: true, change: (d) => { this.act = wrap(this.act + d, RC().acts.length); this.oi = 0; } },
        { kind: 'pick', label: 'OPPONENT', value: `${o.kind.toUpperCase()} · ${(SFC_CONFIG.teams.list[o.team] || {}).name || o.team}`, danger: true, change: (d) => { this.oi = wrap(this.oi + d, this.opps().length); } },
        { kind: 'pick', label: 'YOU PLAY', value: this.role, danger: true, change: (d) => { const R = SFC_CONFIG.game.roles; this.role = R[wrap(R.indexOf(this.role) + d, R.length)]; } },
        leg(0, `LEGEND · YOU (${roles[0]})`), leg(1, `LEGEND · ${roles[1]}`), leg(2, `LEGEND · ${roles[2]}`),
        { kind: 'pick', label: on ? 'BADGE ✓' : 'BADGE', value: `${B[bid].name} · ${B[bid].rarity}`, danger: true, change: (d) => { this.bi = wrap(this.bi + d, badgeIds().length); } },
        { kind: 'btn', label: on ? 'REMOVE BADGE' : 'ADD BADGE', sub: `${B[bid].desc} · team: ${this.badges.length ? this.badges.map((x) => B[x].name).join(', ') : 'none'}`, danger: true,
          act: () => { this.badges = on ? this.badges.filter((x) => x !== bid) : this.badges.concat([bid]); menu.render(); } },
        { kind: 'btn', label: 'ALL BADGES / NONE', sub: this.badges.length ? 'Clear every badge' : 'Give the team every badge', danger: true,
          act: () => { this.badges = this.badges.length ? [] : badgeIds(); menu.render(); } },
        { kind: 'btn', label: this.up ? 'UPGRADED: ON' : 'UPGRADED: OFF', sub: 'Badges use their Locker Room upgrade numbers', danger: true, act: () => { this.up = !this.up; menu.render(); } },
        { kind: 'btn', label: 'MATCH', sub: 'Kick off now · L legend moment · K all legends · 8 / 9 / 0 / -', danger: true, act: () => this.match(menu.app) },
        { kind: 'pick', label: 'TRIAL LEGEND', value: this.legName(tl), danger: true, change: (d) => { this.ti = wrap(this.ti + d, Object.keys(LG()).length); } },
        { kind: 'btn', label: 'LEGEND TRIAL', sub: `Play ${LG()[tl].name}'s trial now`, danger: true, act: () => this.trial(menu.app, tl) },
        { kind: 'btn', label: 'LEGEND TRIAL CARD', sub: `${LG()[tl].name}'s trial intro on the map`, danger: true, act: () => this.card('trial', tl) },
        { kind: 'btn', label: 'LEGEND JOIN CARD', sub: `${LG()[tl].name} wants to join · pick anyone`, danger: true, act: () => this.card('join', tl) },
        { kind: 'btn', label: 'MAP', sub: 'Floor 0 = legend · shop · locker room · skill · ???', danger: true, act: () => this.card('map') },
        { kind: 'btn', label: 'PICK A BADGE', sub: 'Reward card (pick 1 of 3)', danger: true, act: () => this.card('offer') },
        { kind: 'btn', label: 'PICK GEAR', sub: 'Match reward: pick 1 of 3 GEAR · then who wears it (the last player starts full: swap)', danger: true, act: () => this.card('gear') },
        { kind: 'btn', label: 'SHOP', sub: 'Cash 999 · prices with Season Ticket', danger: true, act: () => this.card('shop') },
        { kind: 'btn', label: 'LOCKER ROOM', sub: 'With an injury to heal · Ice Bath = 2 actions', danger: true, act: () => this.card('rest') },
        { kind: 'btn', label: 'END TEST RUN', sub: RUN().mirrorOn && this.R ? 'Back to your real run' : 'No test run right now', danger: true, act: () => { this.end(); menu.render(); } },
      ];
    },

    /* ---------- run thử ---------- */
    // dựng run thử theo lựa chọn trên trang (run thật giữ nguyên trong hồ sơ)
    build() {
      const Run = RUN(), PF = SFC.Profile;
      this.end();
      const real = PF.data.run, plays = Run.stats().plays;
      const R = Run.start(null, this.role);
      PF.data.run = real;
      Run.stats().plays = plays;
      PF.save();
      R.act = this.act;
      R.map = Run.genAct(R, this.act);
      R.actNew = false;
      R.seen = RC().acts.flatMap((a, i) => ['intro:' + i, 'boss:' + i]);
      R.cash = 999;
      R.bag = this.badges.map((id) => ({ id, up: this.up && !!RC().badges[id].up }));
      R.squad.forEach((s, i) => { if (this.legs[i]) s.legend = this.legs[i]; else delete s.legend; });
      Run.mirrorR = R; Run.mirrorOn = true;
      this.R = R;
      SFC.RunUI.reset();
      return R;
    },
    end() {
      if (this.R && RUN().mirrorR === this.R) RUN().leaveMirror();
      this.R = null;
      SFC.RunUI.reset();
    },
    // node đầu tiên của map thử (dùng làm node đang đá)
    first(R) { return R.map.floors[0][0]; },

    match(app) {
      const R = this.build(), o = this.opps()[this.oi % this.opps().length], n = this.first(R), A = RC().acts[this.act];
      n.kind = o.kind; n.team = o.team;
      n.elo = o.kind === 'boss' ? A.bossElo : Math.round((A.elo[0] + A.elo[1]) / 2) + (o.kind === 'elite' ? RC().eliteElo : 0);
      R.next = n.id;
      this.armed = true;
      app.startRunMatch();
    },
    trial(app, id) {
      const R = this.build(), n = this.first(R);
      n.kind = 'legend'; n.legend = id;
      R.next = n.id;
      R.room = { kind: 'trial', legend: id, drill: LG()[id].trial.drill, player: 'host' };
      this.armed = true;
      app.startRunMatch();
    },
    // SKILL GAME id (run.drills) đá ngay
    skill(app, id) {
      const R = this.build(), n = this.first(R);
      n.kind = 'skill';
      R.next = n.id;
      R.room = { kind: 'skill', drill: id, player: 'host' };
      this.armed = true;
      app.startRunMatch();
    },
    // mở map thử với 1 thẻ / phòng đang mở
    card(kind, legend) {
      const R = this.build(), Run = RUN();
      if (kind === 'map') {
        const kinds = ['legend', 'shop', 'rest', 'skill', 'event'], free = Object.keys(LG()).filter((x) => !R.squad.some((s) => s.legend === x));
        R.map.floors[0].forEach((n, i) => { n.kind = kinds[i % kinds.length]; if (n.kind === 'legend') n.legend = free[i % free.length]; delete n.team; });
      } else if (kind === 'offer') R.offer = { ids: Run.rollBadges(RC().offer, RC().rarityWeights.boss, R), kind: 'boss' };
      // GEAR: 1 GEAR sẵn cho character, người cuối đã đủ ô (thử bước đổi món)
      else if (kind === 'gear') {
        this.advance(R);
        R.squad[0].gear = Run.rollGear(1, RC().rarityWeights.gear, R).map((g) => Object.assign(g, { up: false }));
        R.squad[2].gear = Run.rollGear(Run.slots(R), RC().rarityWeights.gear, R).map((g) => Object.assign(g, { up: false }));
        R.offer = { gear: Run.rollGear(RC().offer, RC().rarityWeights.gear, R), kind: 'match', sel: null, who: null };
      }
      // Shop / Locker Room: thêm 1 chấn thương để thử chữa (Shin Guards không chặn)
      else if (kind === 'shop') { this.advance(R); R.guard = { act: R.act, n: 99 }; Run.injure(R); R.room = Run.openShop(R); }
      else if (kind === 'rest') { this.advance(R); R.guard = { act: R.act, n: 99 }; Run.injure(R); R.room = Run.openRest(R); }
      else if (kind === 'join') { this.advance(R); R.join = { id: legend }; }
      else if (kind === 'trial') { const n = this.first(R); n.kind = 'legend'; n.legend = legend; R.next = n.id; R.room = { kind: 'trial', legend, drill: LG()[legend].trial.drill, player: 'host' }; }
      SFC.Menu.go('runmap');
    },
    // đứng ở node đầu (Shop / Locker Room / thẻ cần đã vào map)
    advance(R) { const n = this.first(R); R.at = n.id; R.path = [n.id]; },

    // index.html?runtest[=match | trial.<id> | map][&badges=a,b][&legends=a,,b][&act=n]
    boot(app, arg) {
      const q = new URLSearchParams(location.search);
      if (q.get('badges')) this.badges = q.get('badges').split(',').filter((id) => badgeIds().includes(id));
      if (q.get('legends') != null) this.legs = [0, 1, 2].map((i) => { const id = q.get('legends').split(',')[i]; return LG()[id] ? id : null; });
      if (q.get('act') != null) this.act = Math.max(0, Math.min(RC().acts.length - 1, +q.get('act') || 0));
      const [k, id] = String(arg || '').split('.');
      if (k === 'match') return this.match(app);
      if (k === 'trial' && LG()[id]) return this.trial(app, id);
      if (k === 'skill' && RC().drills[id] && !RC().drills[id].trial) return this.skill(app, id);
      if ((k === 'trialcard' || k === 'join') && LG()[id]) return this.card(k === 'join' ? 'join' : 'trial', id);
      if (k === 'map') return this.card('map');
      SFC.Menu.go('runtest');
    },

    /* ---------- trong trận: phím tắt + bảng nhỏ ---------- */
    // main.js startRunMatch gọi sau khi dựng trận
    onMatch(app) {
      if (!this.armed) return;
      this.armed = false;
      this.app = app; this.g = app.game; this.active = true;
      this.mount();
      if (!this.timer) this.timer = setInterval(() => this.tick(), 200);
    },
    tick() {
      if (!this.active) return;
      if (!this.app || this.app.game !== this.g) return this.stop();
      this.render();
    },
    stop() {
      this.active = false;
      clearInterval(this.timer); this.timer = 0;
      if (this.el) { this.el.remove(); this.el = null; }
    },
    mount() {
      if (this.el) this.el.remove();
      const el = this.el = document.createElement('div');
      // góc dưới trái: không che cut-in LEGEND (cạnh trái, giữa màn)
      el.style.cssText = 'position:absolute;left:6px;bottom:44px;z-index:50;max-width:210px;padding:3px 5px;background:rgba(20,12,22,.78);'
        + 'border:1px solid #ffb02e;color:#c7ccd6;font:8px/1.4 "Press Start 2P",monospace;pointer-events:none';
      document.getElementById('stage').appendChild(el);
      if (!this.keyed) { this.keyed = true; window.addEventListener('keydown', (e) => this.key(e), true); }
      this.render();
    },
    render() {
      if (!this.el || !this.g) return;
      const g = this.g, M = SFC_CONFIG.legends.moment;
      // khoảnh khắc LEGEND tắt (legends.moment.enabled): không liệt kê trạng thái khoảnh khắc, không có phím L / K
      const legs = !M.enabled ? '' : g.players.filter((p) => p.team === 0 && p.legend && p.leg).map((p) => {
        const L = LG()[p.legend], S = p.leg;
        const st = S.t > 0 ? `<span style="color:#6bff4f">ON ${S.t > 999 ? 'END' : S.t.toFixed(1)}</span>` : S.cd > 0 ? `CD ${S.cd.toFixed(1)}` : 'READY';
        return `<div><span style="color:${L.color}">${L.title}</span> ${st} · ${S.n}/${M.max}${S.rand ? ` · ${S.rand.up}+ ${S.rand.dn}-` : ''}</div>`;
      }).join('');
      const o = g.opts, B = [o.draftCards && 'CARDS+' + o.draftCards[0], o.rerollBonus && 'REROLL+' + o.rerollBonus[0], o.draftBonus && 'EARLY PICK',
        o.varCheck && `VAR ${o.varCheck[0].chance * 100}% ${g.varN || 0}/${o.varCheck[0].n}`, o.addedTime && `+${o.addedTime[0]}s ${g.addedDone ? 'USED' : ''}`,
        o.ultGain && 'ULT x' + o.ultGain[0].toFixed(2), o.score && 'START ' + o.score.join('-'), o.drillEase && 'EASE ' + o.drillEase].filter(Boolean);
      const me = g.controlled, ML = me && me.legend && LG()[me.legend], TQ = ML && SFC_CONFIG.legends.techniques[ML.tech];
      const mine = ML ? `<div style="color:${ML.color}">YOU: ${ML.name}</div>${TQ ? `<div style="color:#fff">${TQ.name} · ${SFC.Input.techKeys(TQ)}</div>` : ''}` : '<div>YOU: NO LEGEND</div>';
      this.el.innerHTML = `<div style="color:#ffb02e">RUN TEST</div>${mine}${legs}`
        + (B.length ? `<div style="color:#fff;margin-top:2px">${B.join(' · ')}</div>` : '')
        + `<div style="margin-top:2px">[ ] SWAP LEGEND${M.enabled ? ' · L MOMENT · K ALL' : ''}</div><div>8 YOU+1 · 9 THEM+1 · 0 WIN · - REDO</div>`;
    },
    // đổi LEGEND của bạn sang LEGEND kế / trước (gồm cả NONE) ngay trong trận; nhớ lại cho lần đá lại / dựng run thử sau
    swap(d) {
      const g = this.g, p = g.controlled;
      if (!p) return;
      const ids = legendIds(), id = ids[wrap(ids.indexOf(p.legend || null) + d, ids.length)];
      SFC.Legends.swap(g, p, id);
      this.legs[0] = id;
      if (this.R) { if (id) this.R.squad[0].legend = id; else delete this.R.squad[0].legend; }
      g.emit('banner', { text: id ? LG()[id].name : 'NO LEGEND', sub: id ? (SFC_CONFIG.legends.techniques[LG()[id].tech] || {}).name || '' : '', color: id ? LG()[id].color : '#c7ccd6' });
    },
    // khoảnh khắc LEGEND ngay (bỏ qua thời gian nghỉ + giới hạn số lần)
    fire(p) {
      const g = this.g;
      if (!p || !p.leg) return;
      if (p.leg.t > 0) SFC.Legends.stop(g, p);
      p.leg.cd = 0; p.leg.n = 0; g.legCutAt = null;
      SFC.Legends.fire(g, p);
    },
    key(e) {
      if (!this.active || !this.app || this.app.screen !== 'game' || this.app.game !== this.g) return;
      const g = this.g, me = g.humanTeam;
      const goal = (team) => { g.teams[team].score++; g.emit('banner', { text: `TEST ${g.teams[0].score} - ${g.teams[1].score}`, color: '#ffb02e' }); };
      let used = true;
      if (e.code === 'BracketLeft' || e.code === 'BracketRight') this.swap(e.code === 'BracketRight' ? 1 : -1);
      else if (e.code === 'KeyL') this.fire(g.controlled);
      else if (e.code === 'KeyK') g.players.filter((p) => p.team === me && p.legend).forEach((p) => this.fire(p));
      else if (e.code === 'Digit8') goal(me);
      else if (e.code === 'Digit9') goal(1 - me);
      else if (e.code === 'Digit0') { if (g.state !== 'ended') { const t = g.teams; t[me].score = Math.max(t[me].score, t[1 - me].score + 1); if (g.drill) { g.drill.val = SFC.Drills.top(g.drill); } else g.end(); } }
      else if (e.code === 'Minus') { this.stop(); const tr = g.opts.trial; if (tr) this.trial(this.app, tr); else this.match(this.app); }
      else used = false;
      if (used) { e.preventDefault(); e.stopPropagation(); this.render(); }
    },
  };

  // MAP GOAT PATH (run thật hoặc run thử, chỉ bản dev): phím 0 = thắng ngay node trận đang chọn (Matchday / Elite / Boss), không đá.
  // Node đang chọn không phải trận -> lấy node trận đầu tiên đi được. Tỉ số 3-0, nhận tiền + bộ 3 BADGE như thắng thật; không có thưởng gold / XP.
  // Phòng co-op: không dùng (run của host)
  const winNode = () => {
    const R = RUN().run, RU = SFC.RunUI, M = SFC.Menu;
    if (!R || !RUN().active() || R.offer || R.join || R.room || R.actNew || RU.bagOpen || RU.drawing || (SFC.Session && SFC.Session.active && SFC.Session.run)) return false;
    const T = RU.targets(), t = T[RU.sel], play = (n) => n && RC().nodes[n.kind].play;
    let n = t && t.k === 'node' ? RUN().find(t.id) : null;
    if (!play(n)) n = RUN().available().find(play);
    if (!n) { M.setMsg('DEV WIN: no match node to win here', true); M.render(); return true; }
    const r = RUN().enter(n.id), m = r && r.play && RUN().match();
    if (!m) return true;
    R.seen = R.seen || [];
    if (n.kind === 'boss' && !R.seen.includes('boss:' + R.act)) R.seen.push('boss:' + R.act);   // bỏ cut-scene trước trận boss
    const out = RUN().record(null, { opts: { run: m.info }, humanTeam: 0, teams: [{ score: 3 }, { score: 0 }] });
    // thắng: không hiện dòng báo (đè nút SKIP của thẻ chọn BADGE), chỉ ghi console
    console.log(`[dev] WIN ${n.kind} · ${n.team} 3-0${out && out.cash ? ` · +$${out.cash}` : ''}`);
    M.msg = '';
    M.render();
    return true;
  };
  window.addEventListener('keydown', (e) => {
    const M = SFC.Menu;
    if (e.code !== 'Digit0' || !M || M.page !== 'runmap' || !M.app || M.app.screen !== 'menu' || M.textMode) return;
    if (winNode()) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  SFC.RunTest = RunTest;
})();
