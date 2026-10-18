/* UIHelpers — hàm vẽ dùng chung cho giao diện trong trận (SFC.UI: ui/matchui.js · hud.js · draft.js · endscreen.js):
 * esc, ô Core (coreChip), tên Tuyệt kỹ, trường phái kiểu TFT (traitChips / traitList), lá Core nhỏ (miniCard), nhãn phím
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
    return `<span class="chip ${c.role === 'ult' ? 'ult' : ''}" style="--c:${a.color};--c2:${b.color}" title="${esc(c.name)} — ${esc(SFC.CoreScale.plain(id))}">${PX().core(id)}</span>`;
  }

  // mốc công thức Tuyệt kỹ của số Core count: 0 (chưa) · 2 · 3 · 4 (cores.ults.tiers)
  const TIERS = () => CORES().ults.tiers;
  const tierOf = (count) => TIERS().reduce((t, m) => (count >= m ? m : t), 0);
  // tên Tuyệt kỹ ở 1 mốc: đã khám phá (sổ Tuyệt kỹ) -> tên + ★, chưa -> ???
  function ultName(id, lv) {
    const c = CORES().list[id], known = SFC.Profile && SFC.Profile.data && SFC.Profile.ultKnown(id + ':' + lv);
    return c && known ? c.name + (lv > 1 ? ' ' + '★'.repeat(lv) : '') : '???';
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
      return `<div class="trait-row t${tier}" style="--c:${a.color};--tc:${TIER_COLOR[tier] || TIER_COLOR[0]}">
        <span class="tr-hex">${PX().arch(t.tag, 'sm')}</span><b class="tr-n">${t.count}</b><span class="tr-name">${esc(a.label)}</span><span class="tr-steps">${steps}</span></div>${bonus}`;
    }).join('');
  }

  // lá Core nhỏ trên màn Pause (ô chưa có Core: mặt úp ???)
  function miniCard(id) {
    if (!id) return '<div class="mcard empty"><b>???</b></div>';
    const c = CORES().list[id], r = RARITY(c.rarity);
    return `<div class="mcard ${c.role === 'ult' ? 'ult' : ''}" style="--t:${r.color}" title="${esc(c.name)} — ${esc(SFC.CoreScale.plain(id))}">
      <div class="mc-tags">${c.tags.map((t) => PX().arch(t, 'sm')).join('')}</div>
      <div class="mc-art">${SFC.CorePreview.html(id, 72, 40)}<span class="card-emoji">${PX().core(id)}</span></div>
      <div class="mc-name">${esc(c.name)}</div>
      <div class="mc-stat" style="--sc:${SFC.CoreScale.color(id)}">${esc(SFC.CoreScale.label(id))}</div>
    </div>`;
  }
  const keyLabel = (action) => SFC.Input.label(action);

  /* Nút PlayStation ✕ △ ○ □: chữ trong font lệch cỡ (○ □ nhỏ hơn ✕ △) -> icon SVG cùng khung 16x16, cùng độ dày nét.
   * Tự thay trong mọi <kbd> (gợi ý phím ở menu / HUD / trang Controls in nhãn bằng chữ, không cần sửa từng chỗ) */
  const PS_ICON = {
    '✕': '<path d="M3.5 3.5 12.5 12.5M12.5 3.5 3.5 12.5"/>',
    '△': '<path d="M8 2.5 13.75 12.75H2.25Z"/>',
    '○': '<circle cx="8" cy="8" r="5.25"/>',
    '□': '<rect x="3" y="3" width="10" height="10"/>',
  };
  const psIcon = (s) => `<svg class="ps-ico" viewBox="0 0 16 16" role="img" aria-label="${s}">${PS_ICON[s]}</svg>`;
  const PS_RE = /[✕△○□]/;
  // chỉ thay khi trong kbd toàn ký hiệu + dấu nối ("✕ / △"), chữ khác giữ nguyên
  function psKbd(k) {
    const t = k.textContent;
    if (!PS_RE.test(t) || k.querySelector('svg') || !/^[✕△○□\s/+·]+$/.test(t)) return;
    k.innerHTML = [...t].map((ch) => (PS_ICON[ch] ? psIcon(ch) : esc(ch))).join('');
  }
  function psScan(n) {
    if (n.nodeType === 3) n = n.parentNode;
    if (!n || n.nodeType !== 1) return;
    if (n.tagName === 'KBD') return psKbd(n);
    if (PS_RE.test(n.textContent)) n.querySelectorAll('kbd').forEach(psKbd);
  }
  if (document.body) {
    new MutationObserver((ms) => { for (const m of ms) m.addedNodes.forEach(psScan); })
      .observe(document.body, { childList: true, subtree: true });
  }

  SFC.UIHelpers = { $, esc, CORES, ARCH, PX, RARITY, coreChip, ultName, traitChips, traitList, miniCard, keyLabel, psIcon };
})();
