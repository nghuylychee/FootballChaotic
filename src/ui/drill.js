/* Drill — màn DRILL (docs/DRILL_DESIGN.md): mỗi drill chờ = 1 THẺ DRILL (cọc xanh lá, nằm trong túi đồ);
 * mở thẻ = chọn 1 trong 3, cộng chỉ số character vĩnh viễn.
 * Thứ tự: notice (tuỳ chọn) -> card -> chọn 3 poster -> STRONGER! -> thẻ kế / đóng.
 *   notice: LEVEL UP! + quạt thẻ úp vừa nhận, OPEN NOW / LATER (chỉ sau trận: ui.js -> open(cb, { notice }))
 *   card  : lá thẻ rơi xuống (drop) -> chờ (idle) -> rung (charge) -> lật (flip) -> vỡ thành 3 mảnh (burst) -> 3 poster bay vào chỗ
 *   Túi đồ (gacha.js) mở thẳng từ card.
 * Giao diện "tường phố": tường gạch (màu gạch sân Back Alley) + 3 poster dán băng keo, stencil icon chỉ số trên vệt sơn,
 * chọn xong xịt chữ DONE! lên poster. Lớp phủ trên cùng (#drill), mở trên màn kết quả (ui.js) hoặc menu (CHARACTER / STATS).
 * Bảng YOU bên trái: character xoay người + 6 thanh chỉ số, ô đang chọn hiện phần tăng (vệt sáng) + OVR trước → sau.
 * Chọn xong -> màn STRONGER! (data-phase trên .dr-pw, hoạt ảnh ở CSS):
 *   in   : tiêu đề + character rơi xuống        fill : từng thanh chỉ số đầy dần, số đếm lên
 *   pop  : chớp trắng + hạt pixel + tư thế sút, OVR đóng dấu (rung nếu OVR tăng)
 *   shown: chờ Enter -> lật thẻ kế tiếp / đóng (gọi onClose)
 * drills.upScreen = false: fill + pop chạy luôn trên bảng YOU, rồi tự sang thẻ kế.
 * Khi active, main.js gọi Drill.update(dt, input) mỗi bước (vẽ character + nhận phím).
 * Số liệu drill ở config/progression.config.js -> attrs.drills; bốc / lưu / cộng ở src/core/profile.js.
 */
window.SFC = window.SFC || {};

(function () {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const A = () => SFC_CONFIG.progression.attrs;
  const PF = () => SFC.Profile;
  const K = (action, kb) => SFC.Input.key(action, kb);
  const KIT = () => SFC_CONFIG.teams.list[SFC_CONFIG.mainPath.playerTeam.id].kit;
  const PICK_DELAY = 0.55;   // (s) ô vừa chọn đóng dấu DONE rồi mới sang màn STRONGER!
  // thời lượng từng nhịp màn STRONGER! (giây); fill = mỗi chỉ số tăng, hold = giữ sau pop khi chạy trên bảng YOU
  const UP = { in: 0.3, fill: 0.35, pop: 0.45, pose: 0.35, hold: 0.8 };
  const DIRS = [Math.PI / 2, 0, -Math.PI / 2, Math.PI];   // xoay người khoe trang phục (giống menu)
  // thời lượng từng nhịp màn lật thẻ (giây), khớp CSS .dr-opening[data-phase]
  const CARD = { drop: 0.45, charge: 0.55, flip: 0.35, burst: 0.4 };
  const CONE = '#6bff4f';   // màu thẻ DRILL (cọc xanh lá, pixelicons.js -> ui-cone)
  const FAN_MAX = 5;        // màn LEVEL UP: vẽ tối đa ngần này lá úp, nhiều hơn thì ghi ×n
  const pct = (r) => ((r - A().base) / (A().max - A().base)) * 100;
  const plural = (n, w) => `${n} ${w}${n > 1 ? 'S' : ''}`;

  const Drill = {
    active: false,
    sel: 0,
    stage: null,      // notice | card | pick
    card: null,       // màn lật thẻ: { phase, t, tickT }

    // mở màn DRILL; không còn thẻ drill thì gọi onClose luôn.
    // opts.notice = { earned, from, to } -> bắt đầu ở màn LEVEL UP (sau trận), không có -> lật thẻ luôn
    open(onClose, opts = {}) {
      if (PF().drillsPending() <= 0) { if (onClose) onClose(); return; }
      const el = this.el || (this.el = document.getElementById('drill'));
      if (!this.bound) {
        this.bound = true;
        el.addEventListener('click', (e) => this.click(e));
      }
      this.onClose = onClose;
      this.active = true;
      this.busy = false;
      this.up = null;
      this.sel = 0;
      this.animT = 0;
      el.classList.remove('hidden');
      if (opts.notice) {
        this.notice = opts.notice;
        this.stage = 'notice';
        this.render();
        SFC.Audio.upgrade();
      } else this.startCard();
    },

    close() {
      if (!this.active) return;
      this.active = false;
      this.stage = null;
      this.card = null;
      this.notice = null;
      this.up = null;
      clearTimeout(this.pickT);
      this.el.classList.add('hidden');
      this.el.innerHTML = '';
      this.cv = null;
      const cb = this.onClose;
      this.onClose = null;
      if (cb) cb();
    },

    // mỗi bước (main.js): nhịp màn lật thẻ / STRONGER! · vẽ character · phím
    update(dt, input) {
      if (!this.active) return;
      if (this.card) this.tickCard(dt);
      if (!this.active) return;
      if (this.up) this.tickUp(dt);
      if (!this.active) return;
      this.drawAvatar(dt);
      if (this.stage === 'notice') this.noticeInput(input);
      else if (this.card) this.cardInput(input);
      else if (this.up) this.upInput(input);
      else this.input(input);
    },

    /* ---------------- DOM ---------------- */
    render() {
      if (this.stage === 'notice') return this.renderNotice();
      // đổi thiết bị giữa lúc lật thẻ: đang rơi / rung -> vẽ lại lúc chờ; đã lật -> sang luôn 3 poster
      if (this.card) {
        const P = this.card.phase;
        if (P === 'flip' || P === 'burst') return this.toPick();
        this.card.phase = 'idle';
        return this.renderCard();
      }
      // đổi thiết bị giữa màn STRONGER!: vẽ lại ở trạng thái đã xong; chạy trên bảng YOU thì bỏ qua hoạt ảnh
      if (this.up) {
        if (!this.up.inline) return this.renderUp(true);
        this.up = null;
        this.busy = false;
      }
      const offer = PF().drillOffer();
      if (!offer.length) return this.close();
      if (this.sel >= offer.length) this.sel = 0;
      const n = PF().drillsPending(), left = PF().rerollsLeft();
      const tiles = offer.map((id, i) => this.tile(id, i)).join('');
      // vừa lật thẻ: 3 poster bay từ giữa lá ra chỗ (chỉ lần vẽ đầu, reroll / đổi thiết bị thì không)
      const fly = this.fromCard;
      this.fromCard = false;
      const pad = SFC.Input.device === 'pad';
      const pick = pad ? `←→ + ${esc(K('confirm', 'Enter'))} pick` : '1 / 2 / 3 or ←→ + Enter pick';
      this.el.innerHTML = `<div class="drill">
        <div class="dr-wall">${this.tags()}
          <div class="dr-head"><b class="dr-title">DRILL</b><span class="dr-label">LV ${PF().data.level} · PICK 1 OF ${offer.length}</span><em class="dr-left">${n}<small>${n > 1 ? 'CARDS' : 'CARD'}</small></em></div>
          <div class="dr-body">${this.you(offer[this.sel])}<div class="dr-tiles ${fly ? 'fly' : ''}">${tiles}</div></div>
          <div class="dr-curb">
            <div class="dr-foot">
              <span class="dr-hint">${pick}</span>
              <button class="dr-btn roll ${left ? '' : 'off'}" data-act="reroll"><kbd>${esc(K('reroll', 'R'))}</kbd> REROLL (${left})</button>
              <button class="dr-btn" data-act="later"><kbd>${esc(K('back', 'Esc'))}</kbd> LATER</button>
            </div>
          </div>
        </div>
      </div>`;
      this.bindAvatar();
    },

    /* ---------------- màn LEVEL UP (sau trận): thẻ vừa nhận, OPEN NOW / LATER ---------------- */
    renderNotice() {
      const nt = this.notice, n = PF().drillsPending(), earned = Math.max(1, nt.earned || 0);
      const m = Math.min(earned, FAN_MAX);
      const fan = Array.from({ length: m }, (_, i) => `<i class="dr-mini" style="--k:${(i - (m - 1) / 2).toFixed(1)};--d:${(0.15 + i * 0.07).toFixed(2)}s">${SFC.PixelIcon.ui('cone', 'x2')}</i>`).join('');
      const ok = esc(K('confirm', 'Enter')), later = esc(K('back', 'Esc'));
      const lv = nt.to > nt.from ? `LV ${nt.from} → LV ${nt.to}` : `LV ${PF().data.level}`;
      this.el.innerHTML = `<div class="drill">
        <div class="dr-wall">${this.tags()}
          <div class="dr-notice" style="--pc:${CONE}">
            <div class="dr-up-head"><span class="dr-label">${lv}</span><b class="dr-up-title">LEVEL UP!</b></div>
            <div class="dr-nstage">
              <div class="dr-fan">${fan}${earned > FAN_MAX ? `<em class="dr-fan-n">×${earned}</em>` : ''}</div>
              <div class="dr-ninfo">
                <div class="dr-nget">+${plural(earned, 'DRILL CARD')}</div>
                <p>Open a card to pick 1 of ${A().drills.choices} drills. Each pick raises your stats for good.</p>
                <div class="dr-nown">You have ${plural(n, 'card').toLowerCase()} · they wait in your INVENTORY</div>
              </div>
            </div>
            <div class="dr-curb"><div class="dr-foot">
              <span class="dr-hint">${esc(PF().data.name || 'PLAYER')} · LV ${PF().data.level}</span>
              <button class="dr-btn roll" data-act="open"><kbd>${ok}</kbd> OPEN NOW</button>
              <button class="dr-btn" data-act="later"><kbd>${later}</kbd> LATER</button>
            </div></div>
          </div>
        </div>
      </div>`;
    },

    noticeInput(input) {
      if (input.wasPressed('pause') || input.wasPressed('back')) { SFC.Audio.menu(); return this.close(); }
      if (input.wasPressed('confirm')) { SFC.Audio.menu(); this.startCard(); }
    },

    /* ---------------- màn lật thẻ: 1 thẻ = 1 lượt chọn; lật ra 3 poster ---------------- */
    startCard() {
      // bốc (hoặc lấy lại) bộ 3 đã lưu: mặt trước lá = 3 mảnh poster của đúng bộ đó
      if (!PF().drillOffer().length) return this.close();
      this.stage = 'card';
      this.notice = null;
      this.card = { phase: 'drop', t: 0, tickT: 0 };
      this.renderCard();
      SFC.Audio.whoosh();
    },

    renderCard() {
      const c = this.card, n = PF().drillsPending(), offer = PF().drillOffer();
      const ok = esc(K('confirm', 'Enter')), later = esc(K('back', 'Esc'));
      // mặt trước: 3 mảnh poster (màu sơn + icon của từng drill) -> lúc vỡ bay ra thành 3 poster thật
      const strips = offer.map((id, i) => {
        const p = this.paint(id);
        return `<i class="dr-strip" style="--pc:${p.color};--i:${i}">${SFC.PixelIcon.html(p.icon, '', '')}</i>`;
      }).join('');
      // data-phase gắn trên .dr-opening (gốc lớp phủ): CSS điều khiển cả lá lẫn dòng gợi ý ở vỉa hè
      this.el.innerHTML = `<div class="drill dr-opening" style="--rc:${CONE}">
        <div class="dr-wall">${this.tags()}
          <div class="dr-head"><b class="dr-title">DRILL</b><span class="dr-label">LV ${PF().data.level} · OPEN A CARD</span><em class="dr-left">${n}<small>${n > 1 ? 'CARDS' : 'CARD'}</small></em></div>
          <div class="dr-cstage">
            <div class="dr-cwrap">
              <div class="rv3-rays"></div><div class="rv3-glow"></div>
              <div class="dr-cshake"><div class="dr-card">
                <div class="dr-cface dr-cback"><div class="rv3-back"><div class="rv3-frame"><i><span>${SFC.PixelIcon.ui('cone', 'x3')}</span></i><b>DRILL<br>CARD</b><span>PICK 1 OF ${offer.length}</span></div></div></div>
                <div class="dr-cface dr-cfront">${strips}</div>
              </div></div>
              <div class="rv3-parts"></div>
            </div>
            <div class="dr-flash"></div>
          </div>
          <div class="dr-curb"><div class="dr-foot">
            <span class="dr-hint">${esc(PF().data.name || 'PLAYER')} · LV ${PF().data.level}</span>
            <span class="dr-up-go dr-cgo"><kbd>${ok}</kbd> FLIP</span>
            <button class="dr-btn" data-act="later"><kbd>${later}</kbd> LATER</button>
          </div></div>
        </div>
      </div>`;
      this.cardRoot = this.el.querySelector('.dr-opening');
      this.cardSet(c.phase);
    },

    cardSet(phase) {
      const c = this.card;
      c.phase = phase; c.t = 0;
      if (this.cardRoot) this.cardRoot.dataset.phase = phase;
    },

    tickCard(dt) {
      const c = this.card;
      c.t += dt;
      if (c.phase === 'drop' && c.t >= CARD.drop) this.cardSet('idle');
      else if (c.phase === 'charge') {
        // tích tắc nhanh dần tới lúc lật (giống màn mở thẻ Core, reveal.js)
        if ((c.tickT -= dt) <= 0) { SFC.Audio.tick(); c.tickT = 0.12 - 0.09 * Math.min(1, c.t / CARD.charge); }
        if (c.t >= CARD.charge) this.flipCard();
      } else if (c.phase === 'flip' && c.t >= CARD.flip) { this.cardSet('burst'); SFC.Audio.whoosh(); }
      else if (c.phase === 'burst' && c.t >= CARD.burst) this.toPick();
    },

    flipCard() {
      this.cardSet('flip');
      const box = this.cardRoot && this.cardRoot.querySelector('.rv3-parts');
      if (box) box.innerHTML = SFC.Reveal.particles(CONE);
      SFC.Audio.reveal(2);
    },

    // Enter / click: bỏ qua lúc rơi · bắt đầu rung · lật ngay · sang 3 poster
    cardAdvance() {
      const c = this.card;
      if (!c) return;
      if ((c.phase === 'drop' && c.t > 0.15) || c.phase === 'idle') this.cardSet('charge');
      else if (c.phase === 'charge') this.flipCard();
      else if (c.phase === 'flip' || c.phase === 'burst') this.toPick();
    },

    cardInput(input) {
      if (input.wasPressed('pause') || input.wasPressed('back')) { SFC.Audio.menu(); return this.close(); }
      if (input.wasPressed('confirm')) this.cardAdvance();
    },

    // lá đã vỡ: vẽ màn chọn 3 poster, poster bay từ giữa lá ra (CSS .dr-tiles.fly)
    toPick() {
      this.stage = 'pick';
      this.card = null;
      this.cardRoot = null;
      this.fromCard = true;
      this.sel = 0;
      this.render();
    },

    // chữ graffiti mờ trên tường (giống tường sân, arenas.config.js -> graffiti)
    tags() {
      return [['STREET', 66, 5, 4, '#3ff6ff'], ['NO RULES', 49, 1, -5, '#ff3fb4']]
        .map(([t, x, y, r, c]) => `<i class="dr-tag" style="left:${x}%;top:${y}%;--r:${r}deg;--c:${c}">${t}</i>`).join('');
    },

    // icon / màu sơn của drill: của drill (Boot Camp) hoặc của chỉ số tăng nhiều nhất
    paint(id) {
      const L = A().drills.list[id];
      const main = A().order.filter((k) => L.gains[k]).reduce((a, b) => (L.gains[b] > L.gains[a] ? b : a));
      return { icon: L.icon || A().list[main].icon, color: L.color || A().list[main].color };
    },

    // 1 poster: số phím · chỉ số · stencil icon trên vệt sơn · tên · rating trước → sau + thanh · mô tả
    tile(id, i) {
      const L = A().drills.list[id], pf = PF(), gains = pf.drillGains(id);
      const keys = A().order.filter((k) => L.gains[k]);
      const { icon, color } = this.paint(id);
      const rows = keys.map((k) => {
        const r0 = pf.rating(k), r1 = pf.rating(k, gains);
        const w0 = pct(r0), w1 = pct(r1);
        return `<div class="dr-gain"><span>${A().list[k].short}</span><b>${r0}</b><em>${r1 > r0 ? `→ ${r1}` : 'MAX'}</em>
          <i class="dr-bar"><b style="width:${w0.toFixed(1)}%"></b><u style="left:${w0.toFixed(1)}%;width:${(w1 - w0).toFixed(1)}%"></u></i></div>`;
      }).join('');
      const tags = L.kind === 'all' ? 'ALL STATS' : keys.map((k) => A().list[k].short).join(' · ');
      return `<div class="dr-tile ${L.kind} ${i === this.sel ? 'sel' : ''}" data-drill="${i}" style="--d:${(i * 0.07).toFixed(2)}s;--pc:${color}">
        <div class="dr-paper">
          <div class="dr-top"><span class="dr-key">${i + 1}</span><span class="dr-tags">${tags}</span></div>
          <div class="dr-art"><i class="dr-splat"></i>${SFC.PixelIcon.html(icon, '', 'x3')}</div>
          <div class="dr-name">${esc(L.name)}</div>
          <div class="dr-gains">${rows}</div>
          <p class="dr-desc">${esc(L.desc)}</p>
        </div>
        <i class="dr-tape l"></i><i class="dr-tape r"></i>
        <div class="dr-stamp">DONE!</div>
      </div>`;
    },

    // bảng YOU: character trên vệt sơn màu drill đang chọn · tên + LV · OVR + 6 thanh chỉ số (xem trước drill id)
    you(id) {
      const pf = PF(), gains = id ? pf.drillGains(id) : {};
      const now = {};
      for (const k of A().order) now[k] = pf.rating(k);
      return `<div class="dr-you dr-pw" style="--pc:${id ? this.paint(id).color : '#ffe14f'}">
        <div class="dr-you-av"><i class="dr-splat"></i><canvas class="dr-av" width="40" height="44"></canvas><div class="rv3-parts"></div></div>
        <div class="dr-you-name">${esc(pf.data.name || 'PLAYER')} <small>LV ${pf.data.level}</small></div>
        <div class="dr-sheet">${this.sheet(now, gains, pf.ovr(), pf.ovr(gains))}</div>
        <div class="dr-flash"></div>
      </div>`;
    },

    // OVR + 6 dòng chỉ số: vals = rating hiện có, gains = phần sắp cộng (vệt sáng + "+n"), o0 → o1 = OVR
    sheet(vals, gains, o0, o1) {
      const rows = A().order.map((k) => {
        const S = A().list[k], g = gains[k] || 0, w0 = pct(vals[k]), w1 = pct(vals[k] + g);
        return `<div class="dr-row ${g ? 'up' : ''}" data-k="${k}" style="--c:${S.color}"><span>${S.short}</span><b>${vals[k]}</b>
          <i class="dr-rbar"><b style="width:${w0.toFixed(1)}%"></b><u style="left:${w0.toFixed(1)}%;width:${(w1 - w0).toFixed(1)}%"></u></i><em>${g ? `+${g}` : ''}</em></div>`;
      }).join('');
      return `<div class="dr-ob"><small>OVR</small><b>${o0}</b>${o1 !== o0 ? `<em>→ ${o1}</em>` : ''}</div>${rows}`;
    },

    // đổi ô đang chọn: không vẽ lại cả màn (giữ animation vào của các ô), chỉ phần xem trước trên bảng YOU
    setSel(i) {
      const offer = PF().drillOffer(), pf = PF(), id = offer[i];
      this.sel = i;
      this.el.querySelectorAll('.dr-tile').forEach((t) => t.classList.toggle('sel', +t.dataset.drill === i));
      const you = this.el.querySelector('.dr-you'), sh = you && you.querySelector('.dr-sheet');
      if (!sh) return;
      const gains = pf.drillGains(id), now = {};
      for (const k of A().order) now[k] = pf.rating(k);
      sh.innerHTML = this.sheet(now, gains, pf.ovr(), pf.ovr(gains));
      you.style.setProperty('--pc', this.paint(id).color);
    },

    bindAvatar() {
      this.look = PF().lookOf();
      this.cv = this.el.querySelector('canvas.dr-av');
      this.drawAvatar(0);
    },

    // character xoay người; lúc pop: tư thế vung chân sút
    drawAvatar(dt) {
      this.animT = (this.animT || 0) + dt;
      if (!this.cv || !this.cv.isConnected) return;
      let facing = DIRS[Math.floor(this.animT / 1.6) % 4], extra = null;
      const u = this.up;
      if (u && u.poseT != null && u.poseT < UP.pose) { facing = 0; extra = { atkType: 'shoot', atkT: u.poseT }; }
      SFC.Sprites.drawAvatar(this.cv, this.look, KIT(), this.animT, facing, extra);
    },

    /* ---------------- chọn / đổi / để sau ---------------- */
    pick(i) {
      if (this.busy) return;
      if (i !== this.sel && i < PF().drillOffer().length) this.setSel(i);   // bảng YOU xem trước đúng drill được chọn (phím 1/2/3, click)
      const pf = PF(), before = {};
      for (const k of A().order) before[k] = pf.rating(k);
      const o0 = pf.ovr();
      const r = pf.pickDrill(i);
      if (!r) return;
      this.busy = true;
      const t = this.el.querySelector(`.dr-tile[data-drill="${i}"]`);
      if (t) t.classList.add('done');
      this.el.querySelectorAll('.dr-tile').forEach((x) => { if (x !== t) x.classList.add('gone'); });
      SFC.Audio.upgrade();
      const keys = A().order.filter((k) => r.gains[k]);
      this.pickT = setTimeout(() => {
        if (!this.active) return;
        this.up = { id: r.id, gains: r.gains, before, keys, o0, o1: pf.ovr(), shown: Object.assign({}, before),
          inline: !A().drills.upScreen, phase: null, t: 0, poseT: null };
        if (this.up.inline) { this.upRoot = this.el.querySelector('.dr-you'); this.upSet('fill'); }
        else { this.renderUp(false); SFC.Audio.whoosh(); }
      }, PICK_DELAY * 1000);
    },

    reroll() {
      if (this.busy) return;
      if (!PF().rerollDrill()) { SFC.Audio.menu(); return; }
      this.sel = 0;
      this.render();
      SFC.Audio.whoosh();
    },

    input(input) {
      if (this.busy) return;
      if (input.wasPressed('pause') || input.wasPressed('back')) { SFC.Audio.menu(); return this.close(); }
      const n = PF().drillOffer().length;
      if (!n) return this.close();
      if (input.wasPressed('left')) { this.setSel((this.sel + n - 1) % n); SFC.Audio.menu(); }
      if (input.wasPressed('right')) { this.setSel((this.sel + 1) % n); SFC.Audio.menu(); }
      let pick = -1;
      if (input.wasPressed('pick1')) pick = 0;
      if (input.wasPressed('pick2')) pick = 1;
      if (input.wasPressed('pick3')) pick = 2;
      if (input.wasPressed('confirm')) pick = this.sel;
      if (pick >= 0 && pick < n) this.pick(pick);
      else if (input.wasPressed('reroll')) this.reroll();
    },

    click(e) {
      if (!this.active) return;
      SFC.Audio.unlock();
      const act = e.target.closest('[data-act]');
      const later = act && act.dataset.act === 'later';
      if (this.stage === 'notice') {
        if (later) { SFC.Audio.menu(); this.close(); } else if (act && act.dataset.act === 'open') { SFC.Audio.menu(); this.startCard(); }
        return;
      }
      if (this.card) {
        if (later) { SFC.Audio.menu(); this.close(); } else this.cardAdvance();
        return;
      }
      if (this.up) { if (!this.up.inline) this.advance(); return; }
      if (act) {
        if (act.dataset.act === 'reroll') this.reroll();
        if (act.dataset.act === 'later') { SFC.Audio.menu(); this.close(); }
        return;
      }
      const t = e.target.closest('[data-drill]');
      if (t) this.pick(+t.dataset.drill);
    },

    /* ---------------- màn STRONGER! sau khi chọn ---------------- */
    // done = vẽ luôn ở trạng thái đã xong (đổi thiết bị giữa chừng)
    renderUp(done) {
      const u = this.up, L = A().drills.list[u.id], { color } = this.paint(u.id);
      const n = PF().drillsPending(), ok = esc(K('confirm', 'Enter'));
      const go = n > 0 ? `<kbd>${ok}</kbd> NEXT CARD (${n} LEFT) · <kbd>${esc(K('back', 'Esc'))}</kbd> LATER` : `<kbd>${ok}</kbd> CONTINUE`;
      if (done) for (const k of u.keys) u.shown[k] = u.before[k] + u.gains[k];
      const vals = done ? u.shown : u.before;
      const rest = {};
      for (const k of u.keys) rest[k] = u.before[k] + u.gains[k] - vals[k];
      this.el.innerHTML = `<div class="drill">
        <div class="dr-wall">${this.tags()}
          <div class="dr-up dr-pw" style="--pc:${color}">
            <div class="dr-up-head"><span class="dr-label">${esc(L.name)} · COMPLETE</span><b class="dr-up-title">STRONGER!</b></div>
            <div class="dr-up-stage">
              <div class="dr-up-hero"><i class="dr-splat"></i><canvas class="dr-av" width="40" height="44"></canvas><div class="rv3-parts"></div></div>
              <div class="dr-sheet">${this.sheet(vals, rest, done ? u.o1 : u.o0, u.o1)}</div>
            </div>
            <div class="dr-curb"><div class="dr-foot"><span class="dr-hint">${esc(PF().data.name || 'PLAYER')} · LV ${PF().data.level}</span><span class="dr-up-go">${go}</span></div></div>
            <div class="dr-flash"></div>
          </div>
        </div>
      </div>`;
      this.upRoot = this.el.querySelector('.dr-up');
      this.bindAvatar();
      if (done) { this.upRoot.querySelectorAll('.dr-row.up').forEach((r) => r.classList.add('lit')); this.upSet('shown'); }
      else this.upSet('in');
    },

    upSet(phase) {
      const u = this.up;
      u.phase = phase; u.t = 0;
      if (this.upRoot) this.upRoot.dataset.phase = phase;
    },

    tickUp(dt) {
      const u = this.up;
      u.t += dt;
      if (u.poseT != null) u.poseT += dt;
      if (u.phase === 'in' && u.t >= UP.in) this.upSet('fill');
      else if (u.phase === 'fill') {
        this.fill(u.t);
        if (u.t >= u.keys.length * UP.fill) this.pop();
      } else if (u.phase === 'pop' && u.t >= (u.inline ? UP.pop + UP.hold : UP.pop)) {
        if (u.inline) this.nextAfterUp();
        else this.upSet('shown');
      }
    },

    // thanh chỉ số thứ j đầy trong khoảng [j, j + 1] x UP.fill; số đếm lên từng bước (kèm tiếng tích)
    fill(t) {
      const u = this.up, root = this.upRoot;
      if (!root) return;
      u.keys.forEach((k, j) => {
        const p = Math.max(0, Math.min(1, (t - j * UP.fill) / UP.fill));
        const cur = u.before[k] + Math.round(u.gains[k] * p);
        const row = root.querySelector(`.dr-row[data-k="${k}"]`);
        if (!row) return;
        if (p > 0) row.classList.add('lit');
        if (cur === u.shown[k]) return;
        u.shown[k] = cur;
        const w0 = pct(cur), w1 = pct(u.before[k] + u.gains[k]);
        row.querySelector('b').textContent = cur;
        row.querySelector('.dr-rbar b').style.width = `${w0.toFixed(1)}%`;
        const glow = row.querySelector('.dr-rbar u');
        glow.style.left = `${w0.toFixed(1)}%`;
        glow.style.width = `${(w1 - w0).toFixed(1)}%`;
        SFC.Audio.tick();
      });
    },

    // chớp + hạt pixel + tư thế sút; OVR tăng: đóng dấu số mới + rung
    pop() {
      const u = this.up, root = this.upRoot;
      this.fill(Infinity);
      this.upSet('pop');
      u.poseT = 0;
      SFC.Audio.upgrade();
      if (!root) return;
      const box = root.querySelector('.rv3-parts');
      if (box) box.innerHTML = SFC.Reveal.particles(this.paint(u.id).color, u.inline ? 0.45 : 0.75);
      const ob = root.querySelector('.dr-ob');
      if (ob && u.o1 > u.o0) {
        ob.innerHTML = `<small>OVR</small><b>${u.o1}</b><em>+${u.o1 - u.o0}</em>`;
        ob.classList.add('rise');
        root.classList.add('rise');
        SFC.Audio.reveal(2);
      }
    },

    // Enter / click trên màn STRONGER!: bỏ qua tới pop · hiện xong · đi tiếp
    advance() {
      const u = this.up;
      if (!u || u.inline) return;
      if (u.phase === 'in' || u.phase === 'fill') this.pop();
      else if (u.phase === 'pop' && u.t > 0.15) this.upSet('shown');
      else if (u.phase === 'shown' && u.t > 0.2) { SFC.Audio.menu(); this.nextAfterUp(); }
    },

    upInput(input) {
      if (this.up.inline) return;
      if (input.wasPressed('pause') || input.wasPressed('back')) { SFC.Audio.menu(); return this.close(); }
      if (input.wasPressed('confirm')) this.advance();
    },

    // xong màn STRONGER!: còn thẻ drill -> lật thẻ kế; hết -> đóng
    nextAfterUp() {
      this.up = null;
      this.upRoot = null;
      this.busy = false;
      if (PF().drillsPending() > 0) this.startCard(); else this.close();
    },
  };

  SFC.Drill = Drill;
})();
