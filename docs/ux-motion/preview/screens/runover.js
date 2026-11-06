/* RUN OVER / CHAMPIONS — src/ui/runmap.js endCard (CONTINUE chọn sẵn, mục đầu của targets), CSS .rm-best, .rb-bar s.new */
(function () {
  'use strict';
  const C01 = MP.clamp01;
  function mock(stage) {
    stage.appendChild(MP.html(`
      <div class="g-map"><i style="left:60px;top:150px"></i><i style="left:200px;top:90px"></i><i style="left:340px;top:150px"></i></div>
      <div class="g-veil o-veil"></div>
      <div class="g o-c o-title">RUN OVER</div>
      <div class="g o-c o-line">Knocked out by Rooftop Kings <em>· 1 - 2</em></div>
      <div class="g o-c o-reach">REACHED ACT 1 · FLOOR 5 <u class="o-best">NEW BEST</u></div>
      <div class="g o-c o-tally"><span>● 3 wins</span><i>·</i><span>♛ 0 bosses</span></div>
      <div class="g o-c o-bring">
        <span class="o-chip"><span style="color:var(--gold)">●</span><em>GOLD</em><b class="v-gold">+42</b></span>
        <span class="o-chip road"><span style="color:var(--gold)">★</span><em>CORE ROAD</em><b>+75</b><u><s style="width:30%"></s><s class="new" style="left:30%;width:25%"></s></u><small>Next Core in 40 ★</small></span>
      </div>
      <div class="g o-c o-cores"><em>NEW CORES</em><div>
        <span class="o-core"><i></i><span><b>Thunder Kick</b><small>Long charge: a lightning ball pierces and stuns.</small></span></span>
        <span class="o-core"><i></i><span><b>Speed Demon</b><small>Quicker off the ball, and you crackle sooner.</small></span></span></div></div>
      <div class="g o-c o-btn"><i class="g-cur"></i><span class="g-btn sel">CONTINUE</span></div>`));
    const q = (s) => stage.querySelector(s);
    return { veil: q('.o-veil'), title: q('.o-title'), line: q('.o-line'), reach: q('.o-reach'), best: q('.o-best'), tally: q('.o-tally'),
      bring: q('.o-bring'), bar: q('.o-chip u s.new'), gold: q('.v-gold'), cores: q('.o-cores'), btn: q('.o-btn'), cur: q('.g-cur') };
  }
  const kfBest = [{ transform: 'scale(1.8)', opacity: 0 }, { transform: 'none', opacity: 1 }];   // @keyframes rmBest
  const kfGrow = [{ transform: 'scaleX(0)' }, { transform: 'none' }];                           // @keyframes rbGrow
  const kfDrop = [{ opacity: 0, transform: 'translateY(-12px)' }, { opacity: 1, transform: 'none' }];
  const kfUp = [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }];

  MP.screen({
    id: 'runover', short: 'RUN OVER', name: 'RUN OVER / CHAMPIONS', sub: 'tổng kết cả run', prio: 'High', group: 'vào ít · cảm xúc cao', effort: 'M',
    pre: 0.5, preLabel: 'MÀN KẾT QUẢ TRẬN THUA<br>(vừa bấm CONTINUE)',
    problem: 'Tổng kết cả run hiện một cục (chỉ NEW BEST và thanh CORE ROAD chạy trễ). CONTINUE chọn sẵn và nhận Enter từ 0s, mà CONTINUE = xoá run: bấm liên tay qua màn kết quả là mất màn tổng kết. Trỏ phím sang ô Core mới vẽ lại → 2 anim chạy lại.',
    fix: '6 nhịp ≈2.3s (tiêu đề → thua ai + tới đâu → NEW BEST → đếm thắng → phần mang về → Core mới → CONTINUE), Enter từ 2.4s, bấm sớm = hiện đủ + khoá 0.3s.',
    css: `
  .o-veil { background: rgba(7, 5, 10, 0.95); }
  .o-c { left: 0; width: 640px; display: flex; justify-content: center; align-items: center; gap: 6px; text-align: center; }
  .o-title { top: 65px; font: 20px/1 var(--f-px); color: #ff5a6e; letter-spacing: 3px; text-shadow: 3px 3px 0 #121316; }
  .o-line { top: 91px; font-size: 19px; line-height: 1; color: #e6dccb; }
  .o-line em { font: 11px/1 var(--f-px); color: #fff; font-style: normal; }
  .o-reach { top: 116px; font: 7px/1 var(--f-px); color: #c7ccd6; letter-spacing: 1px; }
  .o-best { text-decoration: none; font: 6px/1 var(--f-px); padding: 2px 4px 1px; color: #121316; background: var(--gold); box-shadow: 1px 1px 0 #121316; }
  .o-tally { top: 131px; font-size: 15px; color: var(--gold); gap: 8px; }
  .o-tally i { font-style: normal; color: var(--muted); }
  .o-bring { top: 160px; gap: 8px; align-items: stretch; }
  .o-chip { display: grid; grid-template-columns: auto auto auto; align-items: center; column-gap: 4px; row-gap: 3px; padding: 5px 8px; background: #14161c;
    border: 1px solid #323742; box-shadow: 2px 2px 0 #121316; text-align: left; }
  .o-chip.road { min-width: 150px; border-color: var(--gold); }
  .o-chip em { font: 6px/1 var(--f-px); color: #c7ccd6; font-style: normal; letter-spacing: 1px; }
  .o-chip b { font: 9px/1 var(--f-px); color: var(--gold); font-weight: 400; }
  .o-chip u { grid-column: 1 / -1; position: relative; display: block; height: 6px; background: #2a2e38; border: 1px solid #121316; }
  .o-chip u s { position: absolute; top: 0; bottom: 0; left: 0; background: #8a8f9c; }
  .o-chip u s.new { background: var(--gold); transform-origin: left; }
  .o-chip small { grid-column: 1 / -1; font-size: 11px; line-height: 1; color: var(--muted); }
  .o-cores { top: 214px; flex-direction: column; gap: 4px; }
  .o-cores > em { font: 6px/1 var(--f-px); color: #6bff4f; font-style: normal; letter-spacing: 1px; }
  .o-cores > div { display: flex; gap: 8px; }
  .o-core { width: 272px; display: flex; align-items: center; gap: 7px; padding: 3px 10px 3px 3px; background: #14161c; border: 1px solid #323742; box-shadow: 2px 2px 0 #121316; text-align: left; }
  .o-core > i { width: 26px; height: 26px; flex: none; background: #1c2a1a; border: 1px solid #6bff4f; }
  .o-core b { display: block; font: 7px/1.2 var(--f-px); color: #fff; font-weight: 400; }
  .o-core small { display: block; font-size: 12px; line-height: 1; color: #c7ccd6; margin-top: 3px; }
  .o-btn { top: 272px; height: 24px; }
  .o-btn .g-btn, .o-btn .g-cur { position: relative; }`,
    cols: [
      {
        tag: 'Before', title: 'Code hiện tại', cta: 'CONTINUE → xoá run, về tab', total: 1.3, ctaAt: 0,
        line: '<b>1.3s</b> · hiện cùng lúc, chỉ NEW BEST (0.3s) và thanh CORE ROAD (0.4s) chạy trễ; Enter từ 0s là xoá run',
        build(stage, tl) {
          const m = mock(stage);
          tl.anim(m.best, kfBest, { at: 0.3, dur: 0.35, ease: 'steps(3)' });   // .rm-best rmBest 0.35s steps(3) 0.3s both
          tl.anim(m.bar, kfGrow, { at: 0.4, dur: 0.9, ease: 'steps(9)' });    // .rb-bar s.new rbGrow 0.9s steps(9) 0.4s both
          MP.bob(tl, m.cur);
        },
      },
      {
        tag: 'After', title: 'Stagger đủ + bấm để hiện đủ', cta: 'CONTINUE → xoá run, về tab', total: 2.3, ctaAt: 2.4, skipTo: 2.3,
        line: '<b>2.3s</b> · 6 nhịp, CONTINUE hiện cuối và nhận Enter từ 2.4s; bấm giữa chừng = hiện đủ',
        build(stage, tl) {
          const m = mock(stage);
          tl.anim(m.veil, [{ opacity: 0 }, { opacity: 1 }], { dur: 0.2, ease: 'steps(3)' });
          tl.anim(m.title, [{ opacity: 0, transform: 'scale(2)' }, { opacity: 1, transform: 'none' }], { at: 0.1, dur: 0.35, ease: 'steps(4)' });
          tl.anim(m.line, kfDrop, { at: 0.5, dur: 0.25, ease: 'steps(4)' });
          tl.anim(m.reach, kfDrop, { at: 0.5, dur: 0.25, ease: 'steps(4)' });
          tl.anim(m.best, kfBest, { at: 0.8, dur: 0.35, ease: 'steps(3)' });
          tl.anim(m.tally, [{ opacity: 0, transform: 'scale(1.3)' }, { opacity: 1, transform: 'none' }], { at: 0.95, dur: 0.25, ease: 'steps(3)' });
          tl.anim(m.bring, kfUp, { at: 1.25, dur: 0.25, ease: 'steps(3)' });
          tl.tick((t) => { m.gold.textContent = '+' + Math.round(42 * MP.easeOut2(C01((t - 1.25) / 0.6))); });
          tl.anim(m.bar, kfGrow, { at: 1.35, dur: 0.9, ease: 'steps(9)' });
          tl.anim(m.cores, kfUp, { at: 1.7, dur: 0.3, ease: 'steps(3)' });
          tl.anim(m.btn, [{ opacity: 0 }, { opacity: 1 }], { at: 2.1, dur: 0.2, ease: 'steps(3)' });
          MP.bob(tl, m.cur);
        },
      },
    ],
  });
})();
