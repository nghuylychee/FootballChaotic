/* Reveal — màn mở thẻ kiểu TCG cho phần thưởng Main Path (src/meta/mainpath.js -> record):
 *   Tuyệt kỹ mở lần đầu tới 1 Area (src: area — dải màu Area + dấu NEW AREA) · Core / hộp costume (src: star / boss, bản cũ, vẫn vẽ được)
 *   · Tuyệt kỹ bí kíp gia truyền (src: heirloom — cut scene PROLOGUE, src/ui/story.js; dải DEFEATED thành FAMILY SECRET).
 * Nhịp mỗi phần thưởng (thuộc tính data-phase trên .rv3, hoạt ảnh ở CSS):
 *   boss  : dải màu quét ngang + dấu (Core của boss: DEFEATED · Tuyệt kỹ Area: NEW AREA · bí kíp: FAMILY SECRET)
 *   drop  : mặt sau lá rơi xuống, ánh màu độ hiếm lộ trước sau lá
 *   idle  : chờ Enter / click
 *   charge: lá rung, sáng dần, tiếng tích tắc nhanh dần
 *   flip  : lật lá — chớp trắng, tia sáng xoay, hạt pixel bung (Huyền thoại / Thần thoại / boss: rung màn hình)
 *   shown : mặt trước (lá Core có ảnh động / hộp) + bảng thông tin trượt ra. Enter: phần thưởng kế / đóng
 *   out   : lá bay đi
 * Esc: bỏ qua các lá còn lại (phần thưởng đã được cộng từ trước, màn này chỉ để xem).
 * Dùng: SFC.Reveal.open(items, onClose) · SFC.Reveal.update(dt, input) mỗi bước khi active.
 */
window.SFC = window.SFC || {};

(function () {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const PROG = () => SFC_CONFIG.progression;
  const CORES = () => SFC_CONFIG.cores;
  const MP = () => SFC.MainPath;
  const PX = () => SFC.PixelIcon;
  const RAR = (r) => PROG().rarities[r] || { label: '', color: '#b0c3d9' };
  const rank = (r) => PROG().rarityOrder.indexOf(r);
  const K = (action, kb) => SFC.Input.key(action, kb);
  // thời lượng từng nhịp (giây)
  const T = { boss: 1.15, drop: 0.5, charge: 0.62, flip: 0.4, out: 0.22 };
  const BIG = 3;   // từ độ hiếm này (Huyền thoại) trở lên: rung màn hình khi lật

  const Reveal = {
    active: false,

    // items: [{ kind: core | box, id, src: area | heirloom | star | boss, area, div, boss }]; mục khác (gold) bị bỏ qua
    open(items, onClose) {
      const list = (items || []).filter((x) => (x.kind === 'core' && CORES().list[x.id]) || (x.kind === 'box' && PROG().boxes[x.id]));
      if (!list.length) { if (onClose) onClose(); return false; }
      this.el = this.el || document.getElementById('reveal');
      if (!this.bound) {
        this.bound = true;
        this.el.addEventListener('click', () => { if (this.active) this.advance(); });
      }
      this.items = list; this.i = -1; this.onClose = onClose; this.active = true;
      this.el.classList.remove('hidden');
      this.next();
      return true;
    },

    next() {
      this.i++;
      if (this.i >= this.items.length) return this.close();
      const it = this.items[this.i];
      this.el.innerHTML = this.html(it);
      this.root = this.el.querySelector('.rv3');
      SFC.CorePreview.scan(this.el);
      this.tickT = 0;
      this.stamped = false;
      this.set(it.src === 'boss' || it.src === 'heirloom' || it.src === 'area' ? 'boss' : 'drop');
      SFC.Audio.whoosh();
    },

    set(phase) {
      this.phase = phase; this.t = 0;
      if (this.root) this.root.dataset.phase = phase;
    },

    update(dt, input) {
      if (!this.active) return;
      this.t += dt;
      const P = this.phase;
      if (P === 'boss') {
        if (!this.stamped && this.t >= 0.38) { this.stamped = true; SFC.Audio.hit(); }
        if (this.t >= T.boss) { this.set('drop'); SFC.Audio.whoosh(); }
      } else if (P === 'drop' && this.t >= T.drop) this.set('idle');
      else if (P === 'charge') {
        // tích tắc nhanh dần tới lúc lật
        if ((this.tickT -= dt) <= 0) { SFC.Audio.tick(); this.tickT = 0.12 - 0.09 * Math.min(1, this.t / T.charge); }
        if (this.t >= T.charge) this.flip();
      } else if (P === 'flip' && this.t >= T.flip) this.set('shown');
      else if (P === 'out' && this.t >= T.out) this.next();
      if (!this.active) return;
      if (input.wasPressed('pause') || input.wasPressed('back')) return this.close();
      if (input.wasPressed('confirm')) this.advance();
    },

    // Enter / click: bỏ qua dải boss · lật lá · sang lá kế
    advance() {
      const P = this.phase;
      if (P === 'boss' && this.t > 0.3) { this.set('drop'); SFC.Audio.whoosh(); }
      else if ((P === 'drop' && this.t > 0.2) || P === 'idle') this.set('charge');
      else if (P === 'shown' && this.t > 0.25) { SFC.Audio.menu(); this.set('out'); }
    },

    flip() {
      const it = this.items[this.i], g = this.glow(it);
      this.set('flip');
      this.burst(g.color);
      SFC.Audio.reveal(Math.max(0, g.rank));
      if (g.rank >= BIG || it.src === 'boss' || it.src === 'heirloom' || it.src === 'area') SFC.Audio.upgrade();
    },

    close() {
      this.active = false;
      this.stamped = false;
      if (this.el) { this.el.classList.add('hidden'); this.el.innerHTML = ''; }
      this.root = null;
      const cb = this.onClose;
      this.onClose = null;
      if (cb) cb();
    },

    /* ---------- vẽ ---------- */
    // màu + bậc ánh sáng của lá: Core theo độ hiếm; boss luôn vàng; hộp theo màu hộp
    glow(it) {
      if (it.kind === 'box') { const b = PROG().boxes[it.id]; return { color: b.color, rank: 1 }; }
      const r = CORES().list[it.id].rarity, gold = it.src === 'boss' || it.src === 'heirloom' || it.src === 'area';
      return { color: gold ? '#ffd23f' : RAR(r).color, rank: gold ? Math.max(BIG, rank(r)) : rank(r) };
    },

    html(it) {
      const fam = it.src === 'heirloom', H = SFC_CONFIG.ftue.heirloom;
      const A = fam ? MP().area(0) : MP().area(it.area), g = this.glow(it), boss = it.src === 'boss', area = it.src === 'area';
      const _t = SFC.t;
      const title = esc(it.kind === 'box' ? _t('DIVISION REWARD') : fam ? _t('FAMILY SECRET ULTIMATE') : boss ? _t('BOSS SIGNATURE CORE') : area ? _t('NEW AREA ULTIMATE') : _t('NEW CORE UNLOCKED'));
      const emblem = boss ? PX().ui('crown', 'x3') : fam ? PX().ui('star', 'x3') : it.kind === 'box' ? PX().ui('gift', 'x3') : PX().area(A.id, 'x3');
      const back = `<div class="rv3-back"><div class="rv3-frame"><i><span>${emblem}</span></i><b>STREET<br>CHAOS</b><span>${esc(it.kind === 'box' ? _t('COSTUME BOX') : _t('CORE'))}</span></div></div>`;
      const front = it.kind === 'core' ? SFC.Gacha.coreCard(it.id, '', 150, 64) : this.boxFace(it);
      let band = '';
      if (boss) {
        const t = MP().team(it.boss);
        band = `<div class="rv3-band" style="--k1:${t.kit.shirt};--k2:${t.kit.shirtDark || t.kit.shorts};--k3:${t.kit.accent}">
          <span>${esc(t.name)}</span><b>${esc(_t('DEFEATED'))}</b></div>`;
      } else if (fam) {
        band = `<div class="rv3-band" style="--k1:#8a5a30;--k2:#4a2812;--k3:#ffd23f"><span>${esc(H.band)}</span><b class="fam">${esc(H.stamp)}</b></div>`;
      } else if (area) {
        band = `<div class="rv3-band" style="--k1:${A.color};--k2:#14101c;--k3:#ffd23f"><span>${PX().area(A.id)} ${esc(A.name)}</span><b class="fam">${esc(_t('NEW AREA'))}</b></div>`;
      }
      const n = this.items.length, last = this.i === n - 1;
      const count = n > 1 ? `<span class="rv3-count">${this.i + 1} / ${n}</span>` : '<span></span>';
      const ok = K('confirm', 'Enter');
      const kicker = fam ? `${PX().ui('star')} ${esc(_t('PASSED DOWN BY {who}', { who: H.giver.toUpperCase() }))}` : `${esc(_t('AREA {n}', { n: it.area + 1 }))} · ${PX().area(A.id)} ${esc(A.name)}`;
      return `<div class="rv3 k-${it.kind} ${boss || fam || area ? 'boss' : ''} ${g.rank >= BIG ? 'big' : ''}" style="--rc:${g.color};--ac:${fam ? '#ffd23f' : A.color}">
        <div class="rv3-bg"></div>
        <div class="rv3-head"><div class="rv3-kicker">${kicker}</div><div class="rv3-title">${title}</div></div>
        ${band}
        <div class="rv3-stage">
          <div class="rv3-cardwrap">
            <div class="rv3-rays"></div><div class="rv3-glow"></div>
            <div class="rv3-shake"><div class="rv3-card">
              <div class="rv3-face rv3-b">${back}</div>
              <div class="rv3-face rv3-f">${front}</div>
            </div></div>
            <div class="rv3-parts"></div>
          </div>
          <div class="rv3-side"><div class="rv3-side-in">${this.side(it)}</div></div>
        </div>
        <div class="rv3-flash"></div>
        <div class="rv3-foot">${count}
          <span class="rv3-hint h-wait"><kbd>${ok}</kbd> ${esc(_t('REVEAL'))}</span>
          <span class="rv3-hint h-shown"><kbd>${ok}</kbd> ${esc(last ? _t('CONTINUE') : _t('NEXT'))}${last ? '' : ` · <kbd>${K('back', 'Esc')}</kbd> ${esc(_t('SKIP ALL'))}`}</span>
        </div>
      </div>`;
    },

    boxFace(it) {
      const b = PROG().boxes[it.id];
      return `<div class="rv3-boxface" style="--bc:${b.color}">${SFC.Gacha.boxArt(b.color, true)}
        <div class="rv3-bf-name">${esc(b.name)}</div><div class="rv3-bf-sub">${esc(SFC.t('COSTUME BOX'))}</div></div>`;
    },

    // bảng thông tin cạnh lá (hiện sau khi lật)
    side(it) {
      const _t = SFC.t;
      if (it.kind === 'box') {
        const b = PROG().boxes[it.id];
        return `<div class="rv3-s-rar" style="color:${b.color}">${PX().ui('gift', 'sm')} ${esc(_t('DIVISION REWARD'))}</div>
          <div class="rv3-s-name">${esc(b.name)}</div>
          <div class="rv3-s-line">${esc(_t('Reached {div}', { div: MP().area(it.area).name }))}</div>
          <div class="rv3-s-note">${esc(b.desc)}</div>
          <div class="rv3-s-go">${esc(_t('Open it for free in the SHOP'))}</div>`;
      }
      const c = CORES().list[it.id], r = RAR(c.rarity), tag = c.tags[0], arch = CORES().archetypes[tag];
      // tiến độ bộ sưu tập theo trường phái chính: đã mở / tổng
      const ids = Object.keys(CORES().list).filter((id) => CORES().list[id].tags.includes(tag));
      const have = ids.filter((id) => SFC.Profile.coreUnlocked(id)).length;
      const fam = it.src === 'heirloom';
      const src = it.src === 'boss'
        ? `<div class="rv3-s-line">${PX().ui('crown', 'sm')} ${_t('Taken from {team}', { team: `<b>${esc(MP().team(it.boss).name)}</b>` })}</div>`
        : fam ? `<div class="rv3-s-line">${PX().ui('star', 'sm')} ${_t('Passed down by {who}', { who: `<b>${esc(SFC_CONFIG.ftue.heirloom.giver)}</b>` })}</div>`
        : it.src === 'area' ? `<div class="rv3-s-line">${PX().area(MP().area(it.area).id, 'sm')} ${_t('Reached {area}', { area: `<b>${esc(MP().area(it.area).name)}</b>` })}</div>`
        : `<div class="rv3-s-line">★ ${esc(_t('New star in {area}', { area: MP().area(it.area).name }))}</div>`;
      const key = `<kbd>${K('ultimate', 'X')}</kbd>`;
      // Tuyệt kỹ = kỹ năng đặc trưng: mang 1 cái vào trận (CHARACTER > ULTIMATE), có ngay từ đầu trận, nạp đầy rồi bấm X
      const isUlt = c.role === 'ult';
      const ult = isUlt ? `<div class="rv3-s-note">${_t('SIGNATURE ULTIMATE · ready from kickoff once charged, fire it with {key}', { key })}</div>` : '';
      const archRow = fam ? ''
        : `<div class="rv3-s-arch" style="--c:${arch.color}">${PX().arch(tag)} ${esc(arch.label)} <i><b style="width:${Math.round((have / ids.length) * 100)}%"></b></i> ${have}/${ids.length}</div>`;
      return `<div class="rv3-s-rar" style="color:${r.color}">${esc(r.label)}${c.role === 'ult' ? ` · ${esc(_t('ULTIMATE'))}` : ''}</div>
        <div class="rv3-s-name">${PX().core(it.id, 'x2')} ${esc(c.name)}</div>
        ${src}
        ${archRow}
        ${ult}
        <div class="rv3-s-go">${isUlt ? (fam ? esc(_t('Yours from day one · equipped')) : esc(_t('Added to your Ultimates · equip it in CHARACTER > ULTIMATE')))
          : fam ? esc(_t('Yours from day one · always in your Core pool')) : _t('Added to your Core pool · shows up as <em>NEW</em> next match')}</div>`;
    },

    // hạt pixel bung ra từ tâm lá lúc lật
    burst(color) {
      const box = this.el.querySelector('.rv3-parts');
      if (box) box.innerHTML = this.particles(color);
    },

    // HTML hạt pixel cho 1 hộp .rv3-parts (dùng chung với màn DRILL); reach = hệ số tầm bay
    particles(color, reach = 1) {
      const cols = [color, color, '#ffe14f', '#ffffff'];
      let h = '';
      for (let i = 0; i < 40; i++) {
        const a = Math.random() * Math.PI * 2, d = (70 + Math.random() * 130) * reach;
        const s = 2 + Math.floor(Math.random() * 3);
        h += `<i style="--dx:${Math.round(Math.cos(a) * d)}px;--dy:${Math.round(Math.sin(a) * d * 0.8)}px;--c:${cols[i % cols.length]};--s:${s}px;--dl:${(Math.random() * 0.08).toFixed(2)}s"></i>`;
      }
      return h;
    },
  };

  SFC.Reveal = Reveal;
})();
