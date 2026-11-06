/* NEW ULTIMATE (đạt công thức ở màn chọn Core) — src/ui/recipefx.js play (STEP 0.16, DUR 2.9), CSS .rfx-* */
(function () {
  'use strict';
  const K = 3, REV = 0.25 + 0.16 * K + 0.35;   // --rev = 1.08s (3 lá cùng trường phái)
  function mock(stage, title, fresh) {
    stage.appendChild(MP.html(`
      <div class="u-rfx">
        <div class="g u-title">${title}</div>
        <div class="g u-group"><div class="u-school">⚡ THUNDER <b>×3</b></div><div class="u-slots"><i></i><i></i><i class="new"></i></div></div>
        <div class="g u-arrow">➜</div>
        <div class="g u-card">${fresh ? '<div class="u-back"><b>???</b></div>' : ''}<div class="u-front"><b>STORM CALLER</b><s></s><p>Lightning strikes every defender in a line.</p></div></div>
        <div class="g u-name">STORM CALLER</div>
        <div class="g u-note">Charge it, then fire it with <kbd>X</kbd></div>
        <div class="g u-skip">Enter skip</div>
      </div>
      <div class="g u-after">→ về màn chọn Core / trận</div>`));
    const q = (s) => stage.querySelector(s);
    return { root: q('.u-rfx'), title: q('.u-title'), group: q('.u-group'), slots: [...stage.querySelectorAll('.u-slots i')], arrow: q('.u-arrow'),
      back: q('.u-back'), front: q('.u-front'), name: q('.u-name'), note: q('.u-note'), after: q('.u-after') };
  }
  const kfPop = [{ opacity: 0, transform: 'scale(0.6)' }, { offset: 0.7, opacity: 1, transform: 'scale(1.15)' }, { opacity: 1, transform: 'none' }];   // rfxPop
  const kfGlow = [{ boxShadow: '3px 3px 0 #121316', transform: 'none' }, { offset: 0.5, boxShadow: '3px 3px 0 #121316, 0 0 10px #ffe14f', transform: 'scale(1.06)' },
    { boxShadow: '3px 3px 0 #121316', transform: 'none' }];   // rfxGlow
  const kfDrop = [{ opacity: 0, transform: 'translateY(-14px)' }, { opacity: 1, transform: 'none' }];   // rfxDrop (gốc: opacity 0, translateY(-14px))
  const kfFlip = [{ opacity: 1, transform: 'rotateY(90deg)' }, { opacity: 1, transform: 'none' }];      // rfxFlip
  const kfHide = [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'rotateY(90deg)' }];      // rfxHide
  const closeAt = (m, at) => (t) => { m.root.style.display = t >= at ? 'none' : ''; m.after.style.display = t >= at ? 'flex' : 'none'; };
  const close = () => ({ fire: true, msg: 'đóng → về trận (Ultimate đã nhận)' });

  MP.screen({
    id: 'ultimate', short: 'NEW ULTIMATE', name: 'NEW ULTIMATE', sub: 'lượt chọn Core đạt công thức', prio: 'Med', group: 'DISCOVERED / EVOLVED: vào ít · UNLOCKED: vào nhiều · cảm xúc cao', effort: 'S',
    problem: 'Tiêu đề (thứ chính) hiện gần cuối, ở 1.08s, sau 3 ô công thức, glow và mũi tên. Bản "ULTIMATE UNLOCKED" (đạt lại công thức đã biết) lặp mỗi lần trong trận mà vẫn chạy đủ ≈2.9s. Bấm = đóng ngay (tốt, giữ).',
    fix: 'DISCOVERED / EVOLVED: tiêu đề lên trước, ô công thức gom 1 nhịp, lật lá ở 0.6s, tự đóng 2.5s. UNLOCKED: pop 0.45s (tiêu đề + lá cùng lúc), tự đóng 1.2s.',
    note: 'Bản Before vẽ DISCOVERED (lần đầu, có mặt sau ???); UNLOCKED giống hệt nhưng không có mặt sau. Code: <b>src/ui/recipefx.js</b> <code>play</code>, CSS <code>.rfx-*</code>.',
    css: `
  .u-rfx { position: absolute; inset: 0; background: radial-gradient(ellipse at center, rgba(40,26,8,0.94), rgba(10,11,14,0.96)); }
  .u-title { left: 0; top: 52px; width: 640px; text-align: center; font: 14px/1 var(--f-px); color: var(--gold); text-shadow: 2px 2px 0 #121316; opacity: 0; }
  .u-group { left: 164px; top: 144px; width: 126px; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 6px 8px; border: 2px solid #ffe14f;
    background: rgba(0,0,0,0.35); box-shadow: 3px 3px 0 #121316; }
  .u-school { font: 6px/1 var(--f-px); color: #ffe14f; }
  .u-school b { color: #fff; font-weight: 400; }
  .u-slots { display: flex; gap: 4px; }
  .u-slots i { width: 34px; height: 34px; background: #1a1c22; border: 1px solid #ffe14f; opacity: 0; transform: translateY(-14px); }
  .u-slots i.new { box-shadow: 0 0 0 1px var(--gold), 0 0 6px var(--gold); }
  .u-arrow { left: 300px; top: 164px; font: 14px/1 var(--f-px); color: var(--gold); text-shadow: 2px 2px 0 #121316; opacity: 0; }
  .u-card { left: 326px; top: 74px; width: 150px; height: 196px; perspective: 400px; }
  .u-back { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; border: 2px solid #323742;
    background: repeating-linear-gradient(45deg, #1a1c22 0 6px, #22252e 6px 12px); box-shadow: 4px 4px 0 #121316; }
  .u-back b { font: 20px/1 var(--f-px); color: #525a6b; }
  .u-front { position: absolute; inset: 0; opacity: 0; display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 10px; text-align: center;
    background: #1d1a10; border: 2px solid var(--gold); box-shadow: 4px 4px 0 #121316; }
  .u-front b { font: 8px/1.2 var(--f-px); color: var(--gold); font-weight: 400; }
  .u-front s { width: 110px; height: 80px; background: #2f3542; border: 1px solid #4a5163; }
  .u-front p { margin: 0; font-size: 12px; line-height: 1.05; color: #e6dccb; }
  .u-name { left: 0; top: 278px; width: 640px; text-align: center; font: 9px/1 var(--f-px); color: #fff; text-shadow: 1px 1px 0 #121316; opacity: 0; }
  .u-note { left: 0; top: 295px; width: 640px; text-align: center; font-size: 12px; color: #e6dccb; opacity: 0; }
  .u-note kbd { font: inherit; padding: 0 3px; border: 1px solid #888; }
  .u-skip { right: 10px; bottom: 8px; font: 5px/1 var(--f-px); color: var(--muted); }
  .u-after { inset: 0; display: none; align-items: center; justify-content: center; background: #1d2a22; font: 11px/1 var(--f-px); color: #e6dccb; }`,
    cols: [
      {
        tag: 'Before', title: 'Code hiện tại (DISCOVERED)', cta: 'đóng', total: REV + 1.8, ctaAt: 0, tap: close,
        state: () => ['bấm = đóng ngay', 'on'],
        line: 'Tiêu đề + lá lật ở <b>1.08s</b>, đủ chữ lúc 1.78s, tự đóng <b>2.88s</b> (UNLOCKED cũng vậy)',
        build(stage, tl) {
          const m = mock(stage, 'NEW ULTIMATE DISCOVERED!', true);
          tl.anim(m.root, [{ opacity: 0 }, { opacity: 1 }], { dur: 0.2, ease: 'steps(3)', fill: 'backwards' });   // rfxIn
          m.slots.forEach((s, i) => tl.anim(s, kfDrop, { at: 0.15 + 0.16 * i, dur: 0.22, ease: 'steps(3)', fill: 'forwards' }));
          tl.anim(m.group, kfGlow, { at: REV - 0.3, dur: 0.5, ease: 'steps(3)' });
          tl.anim(m.arrow, kfPop, { at: REV - 0.25, dur: 0.25, ease: 'steps(3)', fill: 'forwards' });
          tl.anim(m.title, kfPop, { at: REV, dur: 0.35, ease: 'steps(4)', fill: 'forwards' });
          tl.anim(m.back, kfHide, { at: REV, dur: 0.2, ease: 'steps(2)', fill: 'forwards' });
          tl.anim(m.front, kfFlip, { at: REV, dur: 0.35, ease: 'steps(5)', fill: 'forwards' });
          tl.anim(m.name, kfPop, { at: REV + 0.25, dur: 0.3, ease: 'steps(3)', fill: 'forwards' });
          tl.anim(m.note, kfPop, { at: REV + 0.4, dur: 0.3, ease: 'steps(3)', fill: 'forwards' });
          tl.tick(closeAt(m, REV + 1.8));
        },
      },
      {
        tag: 'Option A', title: 'DISCOVERED / EVOLVED', cta: 'đóng', total: 2.5, ctaAt: 0, tap: close,
        state: () => ['bấm = đóng ngay', 'on'],
        line: 'Tiêu đề lên trước (0.05s) → ô công thức 1 nhịp → lật lá <b>0.6s</b> → tên; tự đóng 2.5s',
        build(stage, tl) {
          const m = mock(stage, 'NEW ULTIMATE DISCOVERED!', true);
          tl.anim(m.root, [{ opacity: 0 }, { opacity: 1 }], { dur: 0.15, ease: 'steps(2)', fill: 'backwards' });
          tl.anim(m.title, kfPop, { at: 0.05, dur: 0.3, ease: 'steps(4)', fill: 'forwards' });
          m.slots.forEach((s) => tl.anim(s, kfDrop, { at: 0.25, dur: 0.2, ease: 'steps(3)', fill: 'forwards' }));
          tl.anim(m.group, kfGlow, { at: 0.4, dur: 0.4, ease: 'steps(3)' });
          tl.anim(m.arrow, kfPop, { at: 0.5, dur: 0.2, ease: 'steps(3)', fill: 'forwards' });
          tl.anim(m.back, kfHide, { at: 0.6, dur: 0.2, ease: 'steps(2)', fill: 'forwards' });
          tl.anim(m.front, kfFlip, { at: 0.6, dur: 0.35, ease: 'steps(5)', fill: 'forwards' });
          tl.anim(m.name, kfPop, { at: 0.85, dur: 0.3, ease: 'steps(3)', fill: 'forwards' });
          tl.anim(m.note, kfPop, { at: 1.0, dur: 0.3, ease: 'steps(3)', fill: 'forwards' });
          tl.tick(closeAt(m, 2.5));
        },
      },
      {
        tag: 'Option B', title: 'UNLOCKED (đạt lại)', cta: 'đóng', total: 1.2, ctaAt: 0, tap: close,
        state: () => ['bấm = đóng ngay', 'on'],
        line: 'Pop <b>0.45s</b>: tiêu đề + lá cùng lúc, ô công thức hiện sẵn; tự đóng 1.2s',
        build(stage, tl) {
          const m = mock(stage, 'ULTIMATE UNLOCKED', false);
          tl.anim(m.root, [{ opacity: 0 }, { opacity: 1 }], { dur: 0.1, ease: 'steps(2)', fill: 'backwards' });
          m.slots.forEach((s) => tl.anim(s, kfDrop, { at: 0, dur: 0.01, fill: 'forwards' }));
          tl.anim(m.arrow, kfPop, { at: 0, dur: 0.01, fill: 'forwards' });
          tl.anim(m.title, kfPop, { at: 0.05, dur: 0.3, ease: 'steps(4)', fill: 'forwards' });
          tl.anim(m.front, kfFlip, { at: 0.05, dur: 0.3, ease: 'steps(5)', fill: 'forwards' });
          tl.anim(m.name, kfPop, { at: 0.2, dur: 0.2, ease: 'steps(3)', fill: 'forwards' });
          tl.anim(m.note, kfPop, { at: 0.25, dur: 0.2, ease: 'steps(3)', fill: 'forwards' });
          tl.tick(closeAt(m, 1.2));
        },
      },
    ],
  });
})();
