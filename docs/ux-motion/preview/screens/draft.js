/* Chọn Core trong trận (draft) + anim chọn lá → ô build → khối build bay xuống thanh kỹ năng — src/ui/draft.js renderDraft / playPickAnim / skipDraftAnim / morphDraftToAbar */
(function () {
  'use strict';
  const P = 1.4;                                  // người chơi chọn lá 1 (giả lập; khoá 0.5s đã qua)
  const DX = 174, DY = 119, S = 0.1467;           // lá 1 (tâm 158,176) -> ô trống kế tiếp (tâm 332,295), cỡ 22/150
  const CARDS = [['Thunder Kick', '#ffe14f', 'Long charge: a lightning ball pierces.'], ['Speed Demon', '#3ff6ff', 'Quicker off the ball.'], ['Iron Wall', '#ff7a3d', 'Block shots with a solid stance.']];

  function mock(stage) {
    stage.appendChild(MP.html(`
      <div class="d-pitch"></div>
      <div class="g d-abar"><span data-l="thanh kỹ năng"></span><div class="d-items"><i class="f"></i><i></i><i></i><i></i></div></div>
      <div class="d-draft">
        <div class="g d-title">CORE UPGRADE <span>2/4</span></div>
        <div class="g d-sub">Pick one · it joins your build</div>
        <div class="g d-cards">${CARDS.map(([n, c, d], i) => `<div class="d-card ${i ? '' : 'sel'}" data-c="${i}" style="--c:${c}"><b>${n}</b><s></s><p>${d}</p></div>`).join('')}</div>
        <div class="g d-buildlbl">YOUR BUILD</div>
        <div class="g d-square"><i class="f"></i><i class="t"></i><i></i><i></i></div>
      </div>
      <div class="g d-square d-morph"><i class="f"></i><i class="f" style="--c:#ffe14f"></i><i></i><i></i></div>`));
    const q = (s) => stage.querySelector(s), qa = (s) => [...stage.querySelectorAll(s)];
    return { draft: q('.d-draft'), cards: qa('.d-card'), square: q('.d-draft .d-square'), slot: q('.d-draft .d-square .t'), morph: q('.d-morph'), items: q('.d-items') };
  }
  const kfFlip = [{ opacity: 0, transform: 'rotateY(90deg)' }, { offset: 0.75, opacity: 1, transform: 'rotateY(-6deg)' }, { opacity: 1, transform: 'rotateY(0deg)' }];   // cardFlipIn
  // chuỗi chọn lá: tA = nhấc/mờ, tF = lá bay, tS = ô đầy + loé, tM = khối build bay xuống thanh kỹ năng (+ #draft mờ), tE = xong
  function pick(tl, m, tA, fly, tS, tM, morph, fade) {
    const c0 = m.cards[0];
    tl.anim(c0, [{ transform: 'none' }, { transform: 'translateY(-8px) scale(1.08)' }], { at: tA, dur: 0.1, ease: 'steps(2)', fill: 'forwards' });
    m.cards.slice(1).forEach((c) => {
      tl.anim(c, [{ opacity: 1, filter: 'none' }, { opacity: 0.15, filter: 'grayscale(0.85)' }], { at: tA, dur: 0.25, ease: 'ease', fill: 'forwards' });
      tl.anim(c, [{ transform: 'none' }, { transform: 'translateY(14px) scale(0.92)' }], { at: tA, dur: 0.1, ease: 'steps(2)', fill: 'forwards' });
    });
    tl.anim(c0, [{ transform: 'translateY(-8px) scale(1.08)', opacity: 1 }, { offset: 0.5, transform: `translate(${DX * 0.55}px, ${DY * 0.45 - 14}px) scale(${1 - (1 - S) * 0.5})`, opacity: 0.85 },
      { transform: `translate(${DX}px, ${DY}px) scale(${S})`, opacity: 0.25 }], { at: fly[0], dur: fly[1], ease: 'cubic-bezier(0.25, 0.9, 0.32, 1)', fill: 'forwards' });
    tl.anim(m.slot, [{ background: '#fff', transform: 'scale(1.3)' }, { offset: 0.45, background: 'rgba(255,255,255,0.4)', transform: 'scale(1.12)' }, { background: '#1d1a10', transform: 'none' }],
      { at: tS, dur: 0.35, ease: 'ease-out', fill: 'none' });
    tl.anim(m.morph, [{ transform: 'translate(0, 0) scale(1)', opacity: 1 }, { transform: 'translate(-125px, 31px) scale(0.9)', opacity: 0.95 }],
      { at: tM, dur: morph, ease: 'cubic-bezier(0.18, 0.85, 0.25, 1)', fill: 'forwards' });
    tl.anim(m.draft, [{ opacity: 1 }, { opacity: 0 }], { at: tM, dur: fade, ease: 'ease-out', fill: 'forwards' });
    tl.anim(m.items, [{ transform: 'scale(1.35)', filter: 'brightness(2)' }, { offset: 0.5, transform: 'scale(1.1)', filter: 'brightness(1.4)' }, { transform: 'scale(1)', filter: 'brightness(1)' }],
      { at: tM + morph, dur: 0.35, ease: 'steps(2)', fill: 'none' });
    tl.tick((t, f) => {
      c0.style.visibility = t >= tS ? 'hidden' : '';
      m.slot.classList.toggle('f', t >= tS && !f.nofill);
      m.slot.classList.toggle('t', !(t >= tS && !f.nofill));
      m.square.style.visibility = t >= tM ? 'hidden' : '';
      m.morph.style.display = t >= tM && t < tM + morph ? '' : 'none';
      m.morph.children[1].className = f.nofill ? '' : 'f';
      m.draft.style.display = t >= tM + morph ? 'none' : '';
      m.items.children[1].className = t >= tM + morph && !f.nofill ? 'f' : '';
    });
  }

  MP.screen({
    id: 'draft', short: 'Chọn Core', name: 'Chọn Core (draft)', sub: '4 lượt mỗi trận', prio: 'Med', group: 'vào nhiều · cảm xúc cao', effort: 'S',
    problem: '4 lần mỗi trận: lá lật lệch 0.02 / 0.10 / 0.18s; sau khi chọn còn 1.53s diễn (nhấc → bay vào ô → loé → khối build bay xuống thanh kỹ năng). Bấm bỏ anim: lần 1 dừng ở trạng thái giữa (ô chưa đầy), lần 2 mới bỏ morph. Lá lật lại sau PAUSE / đổi tay cầm. Khoá 0.5s đã tốt.',
    fix: 'Lá lật cả cụm 1 nhịp 0.3s; chuỗi chọn rút còn 0.85s (bay 0.3s, morph 0.3s); bấm 1 lần = trạng thái cuối (ô đầy, draft đóng). Giữ khoá 0.5s; không chạy lại khi về từ PAUSE.',
    note: 'Người chơi giả lập chọn lá 1 ở giây 1.4 (cả 2 cột). Bấm thử trong lúc diễn chọn lá ở bản Before để thấy ô còn trống. Code: <b>src/ui/draft.js</b> <code>playPickAnim</code>, <code>skipDraftAnim</code>, <code>morphDraftToAbar</code>.',
    css: `
  .d-pitch { position: absolute; inset: 0; background: repeating-linear-gradient(90deg, #22331f 0 40px, #1d2a22 40px 80px); }
  .d-abar { left: 8px; top: 318px; width: 222px; height: 34px; background: rgba(18,20,24,0.9); border: 1px solid #323742; }
  .d-items { position: absolute; left: 170px; top: 7px; width: 50px; height: 22px; display: grid; grid-template-columns: repeat(4, 11px); gap: 1px; }
  .d-items i { height: 22px; background: #14161b; border: 1px dashed #3a4252; }
  .d-items i.f { background: #2a2410; border: 1px solid #ffe14f; }
  .d-draft { position: absolute; inset: 0; background: rgba(10, 11, 14, 0.78); }
  .d-title { left: 0; top: 38px; width: 640px; text-align: center; font: 16px/1 var(--f-px); color: var(--gold); text-shadow: 2px 2px 0 #121316; }
  .d-title span { font-size: 8px; color: var(--muted); }
  .d-sub { left: 0; top: 58px; width: 640px; text-align: center; font-size: 13px; color: var(--muted); }
  .d-cards { left: 83px; top: 78px; width: 474px; height: 196px; display: flex; gap: 12px; perspective: 900px; }
  .d-card { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 10px 9px; background: #1a1c22; border: 2px solid #323742; box-shadow: 4px 4px 0 #121316; text-align: center; }
  .d-card.sel { border-color: var(--c); }
  .d-card b { font: 8px/1.2 var(--f-px); color: var(--c); font-weight: 400; }
  .d-card s { width: 110px; height: 90px; background: #2f3542; border: 1px solid #4a5163; }
  .d-card p { margin: 0; font-size: 12px; line-height: 1.05; color: #e6dccb; }
  .d-buildlbl { left: 0; top: 282px; width: 640px; text-align: center; font: 6px/1 var(--f-px); color: var(--muted); letter-spacing: 1px; }
  .d-square { left: 295px; top: 292px; width: 50px; height: 50px; padding: 2px; display: grid; grid-template-columns: repeat(2, 22px); gap: 2px;
    background: #121316; border: 1px solid #8a6d3b; }
  .d-square i { width: 22px; height: 22px; background: #14161b; border: 1px dashed #3a4252; }
  .d-square i.t { border: 1px solid var(--gold); box-shadow: 0 0 6px rgba(255,225,79,0.5); }
  .d-square i.f { background: #1d1a10; border: 1px solid #ffe14f; }`,
    cols: [
      {
        tag: 'Before', title: 'Code hiện tại', cta: '', total: P + 1.88, ctaAt: Infinity,
        // draftInput: khoá 0.5s · chọn = lá đang trỏ · đang diễn chọn lá: bấm = skipDraftAnim (ẩn lá, KHÔNG lấp ô, sang morph) · đang morph: bấm = bỏ morph
        tap: (ct) => (ct < 0.5 ? { ignore: 'khoá 0.5s (inputGrace)' } : ct < P ? { jump: P, msg: 'chọn lá đang trỏ' }
          : ct < P + 1.15 ? { jump: P + 1.15, flag: 'nofill', msg: 'bấm 1: ô chưa đầy, sang morph' } : ct < P + 1.53 ? { jump: P + 1.53, msg: 'bấm 2: bỏ morph' } : { ignore: 'đã đóng' }),
        state: (ct) => (ct < 0.5 ? ['khoá 0.5s', 'lock'] : ct < P ? ['nhận phím: chọn lá', 'on'] : ct < P + 1.15 ? ['bấm = bỏ (dừng giữa chừng)', 'skip'] : ct < P + 1.53 ? ['bấm = bỏ morph', 'skip'] : ['đã đóng', 'lock']),
        line: 'Lá lật đủ ở <b>0.56s</b> · sau khi chọn còn <b>1.53s</b> diễn (+0.35s loé thanh); bỏ qua phải bấm 2 lần',
        build(stage, tl) {
          const m = mock(stage);
          m.cards.forEach((c, i) => tl.anim(c, kfFlip, { at: 0.02 + i * 0.08, dur: 0.38, ease: 'cubic-bezier(0.18, 0.85, 0.32, 1.1)', fill: 'backwards' }));
          pick(tl, m, P, [P + 0.2, 0.42], P + 0.62, P + 1.15, 0.38, 0.35);
        },
      },
      {
        tag: 'After', title: 'Lật 1 nhịp + chọn gọn', cta: '', total: P + 1.1, ctaAt: Infinity,
        tap: (ct) => (ct < 0.5 ? { ignore: 'khoá 0.5s' } : ct < P ? { jump: P, msg: 'chọn lá đang trỏ' } : ct < P + 0.85 ? { jump: P + 0.85, lock: true, msg: 'hiện đủ: ô đầy, đóng' } : { ignore: 'đã đóng' }),
        state: (ct) => (ct < 0.5 ? ['khoá 0.5s', 'lock'] : ct < P ? ['nhận phím: chọn lá', 'on'] : ct < P + 0.85 ? ['bấm = tới cuối', 'skip'] : ['đã đóng', 'lock']),
        line: 'Lá lật cùng lúc, đủ ở <b>0.3s</b> · chuỗi chọn <b>0.85s</b>; bấm 1 lần = ô đầy, draft đóng',
        build(stage, tl) {
          const m = mock(stage);
          m.cards.forEach((c) => tl.anim(c, kfFlip, { at: 0, dur: 0.3, ease: 'cubic-bezier(0.18, 0.85, 0.32, 1.1)', fill: 'backwards' }));
          pick(tl, m, P, [P + 0.1, 0.3], P + 0.4, P + 0.55, 0.3, 0.25);
        },
      },
    ],
  });
})();
