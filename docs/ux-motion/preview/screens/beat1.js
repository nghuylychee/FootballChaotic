/* Kết quả nhịp 1 (VICTORY! trên sân) -> nhịp 2 — src/ui/endscreen.js beginOutro / finishOutro (cắt cứng), CSS #end.outro, .outro-top, .outro-bar */
(function () {
  'use strict';
  function mock(stage) {
    stage.appendChild(MP.html(`
      <div class="e-pitch">${[[180, 170], [230, 210], [260, 150], [420, 190], [460, 230], [500, 160]].map(([x, y], i) => `<i style="left:${x}px;top:${y}px;background:${i < 3 ? '#4fc3ff' : '#ff8a3d'}"></i>`).join('')}</div>
      <div class="e-vig"></div>
      <div class="g e-top"><div class="e-res">VICTORY!</div><div class="e-score">2 - 1</div></div>
      <div class="g e-foot"><i class="e-bar"></i><span>Enter skip</span></div>
      <div class="e-b2"><div class="g e-head"><b>VICTORY!</b><span>STREET KIDS <em>2 - 1</em> ROOFTOP KINGS</span></div>
        <div class="g e-box"><h4>REWARDS</h4>${['Run cash', 'Victory', 'Goals ×2'].map((l, i) => `<div class="e-line" data-l="${i}">${l}</div>`).join('')}</div></div>`));
    const q = (s) => stage.querySelector(s);
    return { top: q('.e-top'), bar: q('.e-bar'), b2: q('.e-b2'), lines: [...stage.querySelectorAll('.e-line')] };
  }
  // nhịp 1 chung: băng VICTORY! inDrop 0.28s steps(4), thanh 3s; nhịp 2 bắt đầu ở 3.0s (dòng thưởng đầu ở +0.25 / +0.49 / +0.73)
  function base(tl, m) {
    tl.anim(m.top, [{ opacity: 0, transform: 'translateY(-12px)' }, { opacity: 1, transform: 'none' }], { dur: 0.28, ease: 'steps(4)' });
    tl.anim(m.bar, [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { dur: 3.0, ease: 'linear' });
    m.lines.forEach((el, i) => tl.anim(el, [{ opacity: 0, transform: 'translateX(-6px)' }, { opacity: 1, transform: 'none' }], { at: 3.0 + 0.25 + i * 0.24, dur: 0.15, ease: 'ease' }));
    tl.tick((t) => { m.b2.style.display = t >= 3.0 ? 'block' : 'none'; });
  }
  const tap = (ct) => (ct < 0.45 ? { ignore: 'khoá 0.45s' } : ct < 3.0 ? { jump: 3.0, msg: 'sang nhịp 2' } : { ignore: 'nhịp 2: xem mục Kết quả trận' });
  const state = (ct) => (ct < 0.45 ? ['khoá 0.45s', 'lock'] : ct < 3.0 ? ['bấm = sang nhịp 2', 'skip'] : ['nhịp 2', 'lock']);

  MP.screen({
    id: 'beat1', short: 'Nhịp 1 → 2', name: 'Kết quả nhịp 1 → nhịp 2', sub: 'VICTORY! trên sân rồi sang bảng thưởng', prio: 'Low', group: 'vào nhiều · cảm xúc cao', effort: 'S',
    problem: 'Nhịp 1 đúng quy tắc (băng 0.28s, giữ 3s ăn mừng, khoá 0.45s). Sang nhịp 2 là cắt cứng: nền tối và cả khối hiện tức thì.',
    fix: 'Nền nhịp 2 mờ vào 0.15s; phần còn lại theo mục Kết quả trận.',
    css: `
  .e-pitch { position: absolute; inset: 0; background: repeating-linear-gradient(90deg, #22331f 0 40px, #1d2a22 40px 80px); }
  .e-pitch i { position: absolute; width: 12px; height: 18px; border: 1px solid #121316; }
  .e-vig { position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(10,11,14,0.45) 100%); }
  .e-top { left: 0; top: 0; width: 640px; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 12px 6px;
    background: linear-gradient(180deg, rgba(10,11,14,0.92) 0%, rgba(10,11,14,0.68) 72%, transparent 100%); }
  .e-res { font: 32px/0.9 var(--f-vt); letter-spacing: 3px; color: var(--gold); text-shadow: 2px 2px 0 #121316; }
  .e-score { font: 16px/1 var(--f-px); color: #fff; background: rgba(18,20,24,0.85); border: 1px solid #323742; padding: 4px 9px 2px; box-shadow: 2px 2px 0 #121316; margin-top: 3px; }
  .e-foot { left: 18px; top: 344px; width: 604px; display: flex; align-items: center; gap: 8px; font-size: 12px; color: #e6dccb; }
  .e-bar { flex: 1; height: 2px; background: var(--gold); opacity: 0.7; transform-origin: left; }
  .e-b2 { position: absolute; inset: 0; display: none; background: radial-gradient(ellipse at 50% 20%, rgba(24,28,38,0.94), rgba(10,11,14,0.96) 75%), #1d2a22; }
  .e-head { left: 14px; top: 22px; width: 612px; height: 46px; display: flex; flex-direction: column; align-items: center; gap: 3px; border-bottom: 1px solid #323742; }
  .e-head b { font: 32px/0.9 var(--f-vt); letter-spacing: 2px; color: var(--gold); font-weight: 400; }
  .e-head span { font-size: 16px; color: #e6dccb; }
  .e-head em { font: 11px/1 var(--f-px); font-style: normal; color: #fff; }
  .e-box { left: 218px; top: 80px; width: 212px; height: 183px; padding: 6px 8px; border: 1px solid var(--gold); background: rgba(18,20,24,0.9); display: flex; flex-direction: column; gap: 3px; }
  .e-box h4 { margin: 0; font: 13px/1 var(--f-vt); color: #fff; font-weight: 400; letter-spacing: 1px; }
  .e-line { font-size: 13px; color: #e6dccb; }`,
    cols: [
      {
        tag: 'Before', title: 'Code hiện tại', cta: '', total: 3.9, ctaAt: Infinity, tap, state,
        line: 'Nhịp 1 <b>3.0s</b> · sang nhịp 2 cắt cứng (nền tối + khối hiện tức thì)',
        build(stage, tl) { base(tl, mock(stage)); },
      },
      {
        tag: 'After', title: 'Mờ vào 0.15s', cta: '', total: 3.9, ctaAt: Infinity, tap, state,
        line: 'Nhịp 1 giữ nguyên · nền nhịp 2 mờ vào <b>0.15s</b>',
        build(stage, tl) {
          const m = mock(stage);
          base(tl, m);
          tl.anim(m.b2, [{ opacity: 0 }, { opacity: 1 }], { at: 3.0, dur: 0.15, ease: 'steps(3)' });
        },
      },
    ],
  });
})();
