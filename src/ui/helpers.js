/* UIHelpers — hàm vẽ dùng chung cho giao diện trong trận (SFC.UI: ui/matchui.js · hud.js · draft.js · endscreen.js):
 * esc, ô Core (coreChip), tên Tuyệt kỹ, trường phái kiểu TFT (traitChips / traitList), lá Core nhỏ (miniCard), nhãn phím,
 * ghế dự bị phòng co-op (coopBench, dùng ở menu: ui/cup.js · ui/runmap.js)
 */
window.SFC = window.SFC || {};

(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const _t = SFC.t, _tn = SFC.tn;   // dịch theo ngôn ngữ đang chọn (engine/i18n.js)
  const CORES = () => SFC_CONFIG.cores;

  const ARCH = (tag) => CORES().archetypes[tag] || { label: tag, icon: '?', color: '#9aa3b5' };
  const PX = () => SFC.PixelIcon;   // icon pixel art (render/pixelicons.js)
  const RARITY = (r) => (SFC_CONFIG.progression.rarities[r] || { label: '', color: '#b0c3d9' });

  // build nổi bật nhất của đội: "🏃 TỐC ĐỘ IV"
  // ô Core nhỏ: viền màu trường phái (Core cầu nối: 2 màu), Tuyệt kỹ viền vàng
  function coreChip(id) {
    const c = CORES().list[id];
    const a = ARCH(c.tags[0]), b = ARCH(c.tags[1] || c.tags[0]);
    return `<span class="chip ${c.role === 'ult' ? 'ult' : ''}" style="--c:${a.color};--c2:${b.color}" data-tip="${esc(coreTip(id))}">${PX().core(id)}</span>`;
  }
  // bảng tooltip của 1 Core: icon + tên (màu độ hiếm) + trường phái + mô tả (không ghi mức sức mạnh theo chỉ số — user 2026-11-01)
  function coreTip(id) {
    const c = CORES().list[id], r = RARITY(c.rarity), a = ARCH(c.tags[0]);
    return tip({ icon: PX().core(id), name: c.name, color: c.role === 'ult' ? '#ffe14f' : r.color, tag: c.tags.map((t) => ARCH(t).label).join(' + '), tagColor: a.color,
      desc: SFC.CoreScale.plain(id) });
  }

  // mốc công thức Tuyệt kỹ của số Core count: 0 (chưa) · 2 · 3 · 4 (cores.ults.tiers)
  const TIERS = () => CORES().ults.tiers;
  const tierOf = (count) => TIERS().reduce((t, m) => (count >= m ? m : t), 0);
  // tên Tuyệt kỹ ở 1 mốc: đã khám phá (sổ Tuyệt kỹ) -> tên (mốc X4: tên thức tỉnh), chưa -> ???
  function ultName(id, lv) {
    const c = CORES().list[id], known = SFC.Profile && SFC.Profile.data && SFC.Profile.ultKnown(id + ':' + lv);
    return c && known ? SFC.CoreSystem.ultName(id, lv) : '???';
  }

  // trường phái của 1 cầu thủ: icon + số Core (đạt mốc Tuyệt kỹ thì sáng lên)
  function traitChips(game, team) {
    return game.cores.schools(team).map((t) => {
      const a = ARCH(t.tag);
      return `<span class="trait ${tierOf(t.count) ? 'on' : ''}" style="--c:${a.color}" title="${esc(_tn('{arch}: {n} Core', '{arch}: {n} Cores', t.count, { arch: a.label }))}">${PX().arch(t.tag)}${t.count}</span>`;
    }).join('');
  }

  // tiến độ công thức Tuyệt kỹ kiểu TFT: huy hiệu lục giác theo mốc (chưa · đồng 2 · bạc 3 · vàng 4), số Core, các mốc 2 › 3 › 4.
  // full = kèm Tuyệt kỹ ở từng mốc (màn Pause; chưa khám phá: ???). HỖN LOẠN không có công thức -> không hiện
  const TIER_COLOR = { 0: '#4a3f4c', 2: '#c77b3e', 3: '#c7ccd6', 4: '#ffd23f' };
  function traitList(game, team, full = false) {
    const base = CORES().ults.base;
    return game.cores.schools(team).sort((a, b) => b.count - a.count).map((t) => {
      const a = ARCH(t.tag), tier = tierOf(t.count), marks = TIERS();
      const steps = marks.map((m) => `<i class="${t.count >= m ? 'on' : ''}">${m}</i>`).join('<em>›</em>');
      const bonus = full && base[t.tag] ? `<div class="tr-bonus">${marks.map((m, i) => `<div class="${t.count >= m ? 'on' : ''}"><b>${m}</b><span>${esc(ultName(base[t.tag], i + 1))}</span></div>`).join('')}</div>` : '';
      return `<div class="trait-row t${tier}" style="--c:${a.color};--tc:${TIER_COLOR[tier] || TIER_COLOR[0]}" title="${esc(a.label)}">
        <span class="tr-hex">${PX().arch(t.tag, 'sm')}</span><b class="tr-n">${t.count}</b><span class="tr-name">${esc(a.label)}</span><span class="tr-steps">${steps}</span></div>${bonus}`;
    }).join('');
  }

  // lá Core nhỏ trên màn Pause (lượt chưa chọn: vạch thấp 1 chấm mờ — review màn 2026-11: ô ??? cỡ lá thật trông như nút bấm)
  function miniCard(id) {
    if (!id) return '<div class="mcard empty"><i></i></div>';
    const c = CORES().list[id], r = RARITY(c.rarity);
    // gọn (user 2026-11-01): ảnh + tên, không có dòng mức sức mạnh / trường phái (xem ở tooltip)
    return `<div class="mcard ${c.role === 'ult' ? 'ult' : ''}" style="--t:${r.color}" data-tip="${esc(coreTip(id))}">
      <div class="mc-art">${SFC.CorePreview.html(id, 72, 34)}<span class="card-emoji">${PX().core(id)}</span></div>
      <div class="mc-name">${esc(c.name)}</div>
    </div>`;
  }
  const keyLabel = (action) => SFC.Input.label(action);

  // "rê chuột = chọn" chỉ tính khi chuột thật sự dời: màn vẽ lại / cuộn dưới con trỏ đứng yên cũng bắn mousemove, khi đó không được
  // cướp lựa chọn của phím / tay cầm. Dùng chung cho mọi màn (Menu, LangPick, MatchUI, RunUI); nhiều listener cùng nhận 1 sự kiện
  // thì cùng 1 kết quả (nhớ sự kiện vừa xét)
  let moveX = -1, moveY = -1, moveEv = null, moveRes = false;
  function realMove(e) {
    if (e === moveEv) return moveRes;
    moveRes = e.clientX !== moveX || e.clientY !== moveY;
    moveEv = e; moveX = e.clientX; moveY = e.clientY;
    return moveRes;
  }

  // khung + tâm của 1 phần tử trên màn hình (ẩn / chưa vẽ -> null) — dùng cho navPick
  function navRect(el) {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) return null;
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, left: r.left, right: r.right, top: r.top, bottom: r.bottom };
  }
  // đi bằng phím hướng theo vị trí thật trên màn hình: chỉ số mục gần nhất theo hướng dir (up / down / left / right) tính từ khung cur.
  // rects[i] = khung mục i (null = bỏ qua, kể cả mục đang đứng). Ưu tiên mục cùng hàng (←→) / cùng cột (↑↓), gần nhất theo hướng đi;
  // không có thì mục lệch sang bên không quá xa (điểm = khoảng cách theo hướng đi + lệch sang bên x2). Không có mục nào phía đó: -1
  function navPick(rects, cur, dir) {
    const h = dir === 'left' || dir === 'right';
    let best = -1, bestScore = Infinity;
    rects.forEach((r, i) => {
      if (!r) return;
      const dx = r.x - cur.x, dy = r.y - cur.y;
      const along = dir === 'left' ? -dx : dir === 'right' ? dx : dir === 'up' ? -dy : dy;
      const across = h ? Math.abs(dy) : Math.abs(dx);
      if (along <= 2) return;
      const inLine = h ? r.top < cur.bottom && r.bottom > cur.top : r.left < cur.right && r.right > cur.left;
      if (!inLine && across > along * 1.5) return;   // lệch quá xa sang bên: không tính là "phía này"
      const score = inLine ? along + across * 0.5 : 1e4 + along + across * 2;
      if (score < bestScore) { bestScore = score; best = i; }
    });
    return best;
  }

  /* Nút PlayStation ✕ △ ○ □: chữ trong font lệch cỡ (○ □ nhỏ hơn ✕ △) -> icon SVG cùng khung 16x16, cùng độ dày nét.
   * Tự thay trong mọi <kbd> (gợi ý phím ở menu / HUD / trang Controls in nhãn bằng chữ, không cần sửa từng chỗ) */
  const PS_ICON = {
    '✕': '<path d="M3.5 3.5 12.5 12.5M12.5 3.5 3.5 12.5"/>',
    '△': '<path d="M8 2.5 13.75 12.75H2.25Z"/>',
    '○': '<circle cx="8" cy="8" r="5.25"/>',
    '□': '<rect x="3" y="3" width="10" height="10"/>',
  };
  const psIcon = (s) => `<svg class="ps-ico" viewBox="0 0 16 16" role="img" aria-label="${s}">${PS_ICON[s]}</svg>`;
  // phím Space: icon thanh cách (user 2026-11-01: không in chữ "Space") — Input vẫn trả chữ 'Space' cho canvas / chỗ không phải <kbd>
  const spaceIcon = () => '<svg class="ps-ico key-sp" viewBox="0 0 20 16" role="img" aria-label="Space"><path d="M2 6.5V11.5H18V6.5"/></svg>';
  const PS_RE = /[✕△○□]|\bSpace\b/;
  // ký hiệu PS chỉ thay khi trong kbd toàn ký hiệu + dấu nối ("✕ / △"), chữ khác giữ nguyên; "Space" thì luôn thay ("Shift + Space")
  function psKbd(k) {
    const t = k.textContent;
    if (!PS_RE.test(t) || k.querySelector('svg')) return;
    const ps = /^[✕△○□\s/+·]+$/.test(t);
    if (!ps && !/\bSpace\b/.test(t)) return;
    k.innerHTML = t.split(/(\bSpace\b|[✕△○□])/).map((ch) => (ch === 'Space' ? spaceIcon() : ps && PS_ICON[ch] ? psIcon(ch) : esc(ch))).join('');
  }
  function psScan(n) {
    if (n.nodeType === 3) n = n.parentNode;
    if (!n || n.nodeType !== 1) return;
    if (n.tagName === 'KBD') return psKbd(n);
    if (/[✕△○□]|Space/.test(n.textContent)) n.querySelectorAll('kbd').forEach(psKbd);   // không dùng \b: chữ cạnh kbd dính liền ("FULLSpace")
  }
  if (document.body) {
    new MutationObserver((ms) => { for (const m of ms) m.addedNodes.forEach(psScan); })
      .observe(document.body, { childList: true, subtree: true });
  }

  /* TOOLTIP CỦA GAME (user 2026-11-01): thay tooltip mặc định của trình duyệt bằng bảng popup cùng theme (#gtip trong #stage, co giãn theo khung
   * game). Mọi phần tử có title tự dùng bảng này: title chuyển sang data-tip-text (trình duyệt không hiện bảng của nó nữa) — chuỗi
   * "Tên · dòng · dòng" / "Tên — mô tả": phần đầu là tiêu đề, phần sau mỗi đoạn 1 dòng. Bảng giàu hơn (icon, màu, nhãn): data-tip = HTML
   * dựng bằng tip({...}) (đã esc). Hiện sau TIP_DELAY ms, bám chuột, lật vào trong khi sát mép; ẩn khi rời / bấm / phần tử bị vẽ lại */
  const TIP_DELAY = 180;
  // icon: HTML icon (pixel) · name · color: màu tên · tag / tagColor: nhãn nhỏ (độ hiếm, trường phái...) · desc · lines: [chuỗi] (dòng phụ, mờ)
  function tip(o) {
    const head = `<div class="gt-head">${o.icon ? `<i class="gt-ico">${o.icon}</i>` : ''}<b${o.color ? ` style="color:${o.color}"` : ''}>${esc(o.name || '')}</b>${o.tag ? `<u style="--tc:${o.tagColor || '#9aa3b5'}">${esc(o.tag)}</u>` : ''}</div>`;
    return head + (o.desc ? `<p>${esc(o.desc)}</p>` : '') + (o.lines || []).filter(Boolean).map((l) => `<p class="gt-sub">${esc(l)}</p>`).join('');
  }
  // chuỗi title thường -> HTML bảng: "A · B · C" / "A — B" (có từ 2 đoạn) = tiêu đề A + từng dòng; 1 đoạn = 1 đoạn chữ
  function tipText(t) {
    const parts = t.includes(' — ') ? [t.slice(0, t.indexOf(' — ')), t.slice(t.indexOf(' — ') + 3)] : t.split(' · ');
    if (parts.length < 2) return `<p>${esc(t).replace(/\n/g, '<br>')}</p>`;
    return `<div class="gt-head"><b>${esc(parts[0])}</b></div>` + parts.slice(1).map((x) => `<p>${esc(x).replace(/\n/g, '<br>')}</p>`).join('');
  }
  const Tip = {
    el: null, target: null, timer: 0, mx: 0, my: 0,
    init() {
      if (this.el || !document.body) return;
      // bảng hiện bằng phím (showFor): màn vẽ lại dưới con trỏ đứng yên cũng bắn sự kiện chuột -> chỉ tính khi chuột thật sự dời
      const still = (e) => this.pinned && e.clientX === this.rx && e.clientY === this.ry;
      document.addEventListener('mouseover', (e) => { if (!still(e)) this.over(e); }, true);
      document.addEventListener('mousemove', (e) => {
        if (still(e)) return;
        this.rx = e.clientX; this.ry = e.clientY;
        if (this.pinned) this.hide();
        this.mx = e.clientX; this.my = e.clientY; if (this.shown()) this.place();
      }, true);
      document.addEventListener('mousedown', () => this.hide(), true);
      document.addEventListener('keydown', () => { if (!this.pinned) this.hide(); }, true);   // bảng hiện bằng phím: tự ẩn khi phần tử bị vẽ lại
      document.addEventListener('wheel', () => this.hide(), true);
    },
    shown() { return this.el && this.el.style.display === 'block'; },
    // phần tử có tooltip gần nhất dưới chuột; title -> data-tip-text (tắt bảng mặc định)
    find(n) {
      for (; n && n.nodeType === 1; n = n.parentNode) {
        if (n.hasAttribute('title')) {
          const t = n.getAttribute('title');
          n.removeAttribute('title');
          if (t) n.setAttribute('data-tip-text', t);
        }
        if (n.hasAttribute('data-tip') || n.hasAttribute('data-tip-text')) return n;
      }
      return null;
    },
    over(e) {
      this.mx = e.clientX; this.my = e.clientY;
      const t = this.find(e.target);
      if (t === this.target) return;
      this.hide();
      if (!t) return;
      this.target = t;
      this.timer = setTimeout(() => this.show(), TIP_DELAY);
    },
    show() {
      const t = this.target, stage = document.getElementById('stage');
      if (!t || !t.isConnected || !stage) return this.hide();
      const html = t.getAttribute('data-tip') || tipText(t.getAttribute('data-tip-text') || '');
      if (!html) return;
      if (!this.el || !this.el.isConnected) { this.el = document.createElement('div'); this.el.id = 'gtip'; stage.appendChild(this.el); }
      this.el.innerHTML = html;
      this.el.style.display = 'block';
      this.place();
      // mỗi lần hiện chỉ 1 vòng theo dõi: showFor gọi lại show() không qua hide() -> vòng cũ tự dừng theo mã lượt
      const run = this.loopId = (this.loopId || 0) + 1;
      const loop = () => {   // phần tử bị vẽ lại / rời khỏi -> ẩn (hiện bằng phím: không cần chuột đang trỏ)
        if (run !== this.loopId || !this.shown()) return;
        if (!this.target || !this.target.isConnected || (!this.pinned && !this.target.matches(':hover'))) return this.hide();
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    },
    // vị trí trong toạ độ #stage (640x360, đang bị scale): cạnh dưới phải con trỏ, sát mép thì lật sang trái / lên trên
    place() {
      const stage = document.getElementById('stage'), r = stage.getBoundingClientRect(), k = r.width / stage.offsetWidth || 1;
      const x = (this.mx - r.left) / k, y = (this.my - r.top) / k, w = this.el.offsetWidth, h = this.el.offsetHeight;
      const W = stage.offsetWidth, H = stage.offsetHeight;
      let left = x + 10, top = y + 14;
      if (left + w > W - 4) left = Math.max(4, x - w - 8);
      if (top + h > H - 4) top = Math.max(4, y - h - 8);
      this.el.style.left = Math.round(left) + 'px';
      this.el.style.top = Math.round(top) + 'px';
    },
    // hiện ngay bảng của phần tử el đang được chọn bằng phím / tay cầm (UX run-09: trước đây chỉ rê chuột mới đọc được),
    // đặt cạnh dưới phải phần tử; ẩn khi bấm phím / chuột như thường hoặc khi el bị vẽ lại
    showFor(el) {
      const t = el && this.find(el);
      if (!t) return this.hide();
      const r = t.getBoundingClientRect();
      clearTimeout(this.timer); this.timer = 0;
      this.target = t; this.pinned = true;
      this.mx = r.right - 2; this.my = r.bottom - 6;
      this.show();
    },
    hide() {
      clearTimeout(this.timer); this.timer = 0;
      this.target = null; this.pinned = false;
      if (this.el) this.el.style.display = 'none';
    },
  };
  Tip.init();
  SFC.Tip = Tip;

  // ghế dự bị phòng co-op (Story / GOAT PATH, user 2026-10-31): phòng đủ 3 người thì ngồi đây cho trống ô để đổi vị trí.
  // ms = người đang ngồi (mặt + tên) · attrs = thuộc tính nút (data-li / data-rt) · sel = đang chọn · off = chỉ xem (không ngồi được)
  function coopBench(ms, meId, attrs, sel, off) {
    const who = ms.map((m) => `<span class="cb-p ${m.id === meId ? 'me' : ''}"><canvas data-mmlook="${esc(JSON.stringify((m.pf && m.pf.look) || {}))}" data-mmaway="0"></canvas><b>${esc(m.pf ? m.pf.name : '')}</b></span>`).join('');
    const tip = esc(_t('Sit out here to free your slot for a swap'));
    return `<button class="co-bench ${sel ? 'sel' : ''} ${off ? 'off' : ''}" ${attrs || ''} title="${tip}"><u>${esc(_t('BENCH'))}</u>${who || `<span>${tip}</span>`}</button>`;
  }

  SFC.UIHelpers = { $, esc, CORES, ARCH, PX, RARITY, coreChip, ultName, traitChips, traitList, miniCard, keyLabel, psIcon, spaceIcon, realMove, navRect, navPick, coopBench, tip, coreTip };
})();
