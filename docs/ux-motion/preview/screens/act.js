/* Thẻ ACT (mở act, sau cut scene) — src/ui/runmap.js actCard, CSS .rm-actcard */
(function () {
  'use strict';
  function mock(stage) {
    stage.appendChild(MP.html(`
      <div class="g-map"><i style="left:60px;top:170px"></i><i style="left:180px;top:110px"></i><i style="left:180px;top:230px"></i></div>
      <div class="g-veil a-veil"></div>
      <div class="g a-c a-act">ACT 1</div>
      <div class="g a-c a-name">STREET LEVEL</div>
      <div class="g a-c a-boss"><s></s><em>♛ Rooftop Kings</em></div>
      <div class="g a-c a-btn"><i class="g-cur"></i><span class="g-btn main sel">LET'S GO</span></div>`));
    const q = (s) => stage.querySelector(s);
    return { veil: q('.a-veil'), act: q('.a-act'), name: q('.a-name'), boss: q('.a-boss'), btn: q('.a-btn'), cur: q('.g-cur') };
  }

  MP.screen({
    id: 'act', short: 'Thẻ ACT', name: 'Thẻ ACT', sub: 'mở act, sau cut scene', prio: 'Med', group: 'vào ít · cảm xúc cao', effort: 'S',
    pre: 0.5, preLabel: 'CUT SCENE MỞ ACT<br>(vừa bấm qua)',
    problem: 'Khoảnh khắc mở act nhưng không có anim nào; LET\'S GO chọn sẵn và nhận Enter ngay, nên bấm liên tay qua cut scene là qua luôn thẻ, không thấy tên act và boss.',
    fix: 'Stagger 1.1s: "ACT n" → tên act đập xuống → boss + tên → LET\'S GO; Enter từ 1.2s, bấm sớm = hiện đủ + khoá 0.3s.',
    css: `
  .a-veil { background: rgba(7, 5, 10, 0.86); }
  .a-c { left: 0; width: 640px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
  .a-act { top: 100px; font: 8px/1 var(--f-px); color: var(--muted); letter-spacing: 3px; }
  .a-name { top: 114px; font: 20px/1 var(--f-px); color: #ffb02e; letter-spacing: 3px; text-shadow: 3px 3px 0 #121316; }
  .a-boss { top: 142px; gap: 2px; }
  .a-boss s { width: 40px; height: 66px; background: #3a2a1a; border: 1px solid #8a6d3b; }
  .a-boss em { font-style: normal; font-size: 14px; color: #e6dccb; }
  .a-btn { top: 236px; flex-direction: row; gap: 6px; }
  .a-btn .g-btn, .a-btn .g-cur { position: relative; }`,
    cols: [
      {
        tag: 'Before', title: 'Code hiện tại', cta: 'LET\'S GO → map', total: 0, ctaAt: 0,
        line: '<b>0s</b> · hiện tức thì, LET\'S GO nhận Enter ngay',
        build(stage, tl) { MP.bob(tl, mock(stage).cur); },
      },
      {
        tag: 'After', title: 'Stagger + bấm để hiện đủ', cta: 'LET\'S GO → map', total: 1.1, ctaAt: 1.2, skipTo: 1.1,
        line: '<b>1.1s</b> · ACT n → tên act đập → boss → LET\'S GO; Enter từ 1.2s, bấm sớm = hiện đủ',
        build(stage, tl) {
          const m = mock(stage);
          tl.anim(m.veil, [{ opacity: 0 }, { opacity: 1 }], { dur: 0.15, ease: 'steps(2)' });
          tl.anim(m.act, [{ opacity: 0, transform: 'translateY(-10px)' }, { opacity: 1, transform: 'none' }], { at: 0.1, dur: 0.2, ease: 'steps(3)' });
          tl.anim(m.name, [{ opacity: 0, transform: 'scale(2)' }, { opacity: 1, transform: 'none' }], { at: 0.25, dur: 0.3, ease: 'steps(4)' });
          tl.anim(m.boss, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { at: 0.6, dur: 0.25, ease: 'steps(3)' });
          tl.anim(m.btn, [{ opacity: 0 }, { opacity: 1 }], { at: 0.9, dur: 0.2, ease: 'steps(3)' });
          MP.bob(tl, m.cur);
        },
      },
    ],
  });
})();
