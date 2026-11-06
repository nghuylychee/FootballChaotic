/* RecipeFx — đoạn diễn ở màn chọn Core khi lá vừa chọn đạt công thức Tuyệt kỹ (docs/ULT_RECIPE.md):
 * các lá cùng trường phái lần lượt rơi vào ô công thức (lá vừa chọn rơi cuối, sáng nhất) -> nhóm lá loé sáng -> mũi tên ->
 * lá Tuyệt kỹ lật ra (chưa khám phá: lá úp ??? lật thành tên). Lai: 2 nhóm X + Y. Thức tỉnh (X4): 4 lá, lá + tên dạng thức tỉnh.
 * Diễn TRƯỚC khi gửi lượt chọn (UI.pick): trận đang đứng ở trạng thái draft nên không lỡ pha bóng nào (online: chỉ diễn khi
 * đồng hồ chọn còn đủ giờ). Enter / click = bỏ qua. Xong -> onDone() gửi lượt chọn; banner "NEW ULTIMATE" không hiện lại.
 */
window.SFC = window.SFC || {};

(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const _t = SFC.t;
  const CORES = () => SFC_CONFIG.cores;
  const PX = () => SFC.PixelIcon;
  // nhịp: config/motion.config.js recipe (motion review 2026-11-06, phương án A cho mọi bản DISCOVERED / EVOLVED / UNLOCKED): tiêu đề hiện
  // trước, lá công thức rơi vào ô cùng 1 nhịp, lá Tuyệt kỹ lật ở flip, tự đóng ở close. Trước đây tiêu đề ở 1.08s, tự đóng 2.9s
  const SLOTS_AT = 0.25;   // lá rơi vào ô công thức (CSS .rfx-slots i, 0.2s)
  const M = () => SFC_CONFIG.motion.recipe;

  const RecipeFx = {
    active: false,

    // lá trong công thức: Core trường phái tag của người chơi (lá vừa chọn ở cuối), lấy đủ need lá
    cardsFor(game, mp, pick, tag, need) {
      const L = CORES().list;
      const own = game.cores.coresOf(mp).filter((id) => L[id].role !== 'ult' && L[id].tags.includes(tag) && id !== pick);
      const list = L[pick].tags.includes(tag) ? own.slice(-(need - 1)).concat([pick]) : own.slice(-need);
      return list.slice(-need);
    },

    // rc = { id, lv } (CoreSystem.bestRecipe); pick = id lá vừa chọn
    play(game, mp, pick, rc, onDone) {
      const C = CORES(), L = C.list, def = L[rc.id];
      if (!def) { onDone(); return; }
      const hybrid = !!def.hybrid, key = rc.id + ':' + rc.lv;
      const fresh = !(SFC.Profile.data && SFC.Profile.ultKnown(key));
      const evolved = !hybrid && rc.lv > 1;
      const need = hybrid ? C.ults.hybridTier || 2 : C.ults.tiers[rc.lv - 1];
      // nhóm lá theo trường phái của công thức (lai: 2 nhóm)
      const groups = def.tags.map((tag) => {
        const a = C.archetypes[tag] || { label: tag, color: '#e6dccb' };
        const ids = this.cardsFor(game, mp, pick, tag, need);
        const slots = ids.map((id) => `<i class="${id === pick ? 'new' : ''}" style="--d:${SLOTS_AT}s">${PX().core(id, 'x2')}</i>`).join('');
        return `<div class="rfx-group" style="--c:${a.color}"><div class="rfx-school">${PX().arch(tag, 'sm')} ${esc(a.label)} <b>×${need}</b></div><div class="rfx-slots">${slots}</div></div>`;
      });
      const tRev = M().flip;   // lúc lá Tuyệt kỹ lật ra
      // nâng cấp: luôn "EVOLVED" (thấy rõ là Tuyệt kỹ cũ mạnh lên) · lần đầu đạt công thức: "DISCOVERED"
      const title = evolved ? _t('ULTIMATE EVOLVED!') : fresh ? _t('NEW ULTIMATE DISCOVERED!') : _t('ULTIMATE UNLOCKED');
      const keyHint = `<kbd>${esc(SFC.Input.label('ultimate'))}</kbd>`;   // phím đang gán, không phải chữ X viết sẵn
      const el = $('recipefx');
      el.innerHTML = `
        <div class="rfx ${hybrid ? 'hybrid' : ''}" style="--rev:${tRev.toFixed(2)}s" data-act="rfxskip">
          <div class="rfx-title">${esc(title)}</div>
          <div class="rfx-row">
            ${groups.join('<div class="rfx-plus">+</div>')}
            <div class="rfx-arrow">➜</div>
            <div class="rfx-card">
              ${fresh ? '<div class="rfx-back"><b>???</b></div>' : ''}
              <div class="rfx-front">${SFC.Gacha.coreCard(rc.id, '', 150, 64, rc.lv)}</div>
            </div>
          </div>
          <div class="rfx-name">${esc(SFC.CoreSystem.ultName(rc.id, rc.lv))}</div>
          <div class="rfx-note">${_t('Charge it, then fire it with {key}', { key: keyHint })}</div>
          <div class="rfx-skip">${esc(_t('{ok} skip', { ok: SFC.Input.key('confirm', 'Enter') }))}</div>
        </div>`;
      el.classList.remove('hidden');
      SFC.CorePreview.scan(el);
      this.active = true;
      this.onDone = onDone;
      this.shown = key;
      // âm thanh theo nhịp: tách từng lá rơi vào ô, lật lá Tuyệt kỹ
      this.timers = [];
      this.timers.push(setTimeout(() => SFC.Audio.menu(), SLOTS_AT * 1000));
      this.timers.push(setTimeout(() => SFC.Audio.upgrade(), tRev * 1000));
      this.timers.push(setTimeout(() => this.finish(), M().close * 1000));
    },

    skip() { if (this.active) this.finish(); },

    finish() {
      if (!this.active) return;
      this.active = false;
      (this.timers || []).forEach(clearTimeout);
      const el = $('recipefx');
      el.classList.add('hidden');
      el.innerHTML = '';
      const done = this.onDone;
      this.onDone = null;
      if (done) done();
    },

    // trận kết thúc / rời trận giữa lúc diễn: tắt, không gửi lượt chọn
    cancel() {
      if (!this.active) return;
      this.onDone = null;
      this.finish();
    },
  };

  SFC.RecipeFx = RecipeFx;
})();
