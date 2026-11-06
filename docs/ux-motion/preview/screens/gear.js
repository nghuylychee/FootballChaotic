/* Chọn GEAR (sau mỗi trận Matchday thắng) — src/ui/runmap.js gearCard / firstSel / input */
(function () {
  'use strict';
  // GEAR thật trong config/run.config.js (tên · chip · màu chỉ số / trường phái · màu độ hiếm · mô tả)
  const GEAR = [['Running Spikes', 'PAC +6', '#3ff6ff', '#b0c3d9', 'Top speed and acceleration.'], ['Power Boots', 'SHO +6', '#ff7a3d', '#4b69ff', 'Shot power and accuracy.'], ['GPS Vest', 'SPEED ▲', '#3ff6ff', '#8847ff', 'SPEED Cores come more often and hit harder.']];
  const SQUAD = [['YOU', 'FWD', 70], ['Mai', 'MID', 70], ['Tùng', 'DEF', 69]];

  function mock(stage) {
    stage.appendChild(MP.html(`
      <div class="g-map"><i style="left:40px;top:170px"></i><i style="left:150px;top:110px"></i><i style="left:150px;top:230px"></i><i style="left:260px;top:170px"></i></div>
      <div class="g-veil k-veil"></div>
      <div class="g k-steps"><span class="on"><i>1</i>PICK GEAR</span><span>▶</span><span><i>2</i>Who wears it?</span></div>
      <div class="g k-sub">ONE PLAYER WEARS IT</div>
      ${GEAR.map(([n, chip, c, rc, d], i) => `<div class="g k-gear ${i ? '' : 'sel'}" data-gear="${i}" style="left:${20 + i * 202}px;--c:${c};--rc:${rc}">
        <i class="k-tag"></i><div><b>${n}</b><u>${chip}</u><p>${d}</p></div></div>`).join('')}
      ${SQUAD.map(([n, p, o], i) => `<div class="g k-card" data-card="${i}" style="left:${40 + i * 190}px">
        <header><s></s><span>${n}<br>${p}</span><em>${o}</em></header>
        ${['PAC', 'SHO', 'PAS', 'DRI', 'FIG', 'GK'].map((s, j) => `<div class="k-row"><span>${s}</span><i><b style="width:${55 + ((i * 7 + j * 11) % 30)}%"></b></i></div>`).join('')}
        <div class="k-slots"><s class="${i === 1 ? 'full' : 'ghost'}"></s><s class="${i === 1 ? 'ghost' : ''}"></s></div></div>`).join('')}
      <div class="g k-foot"><span class="g-btn">SKIP</span></div>
      <div class="g k-keys">←↑↓→ select · <kbd>Enter</kbd> PICK</div>`));
    const q = (s) => stage.querySelector(s), qa = (s) => [...stage.querySelectorAll(s)];
    return { veil: q('.k-veil'), head: q('.k-steps'), sub: q('.k-sub'), gears: qa('[data-gear]'), cards: qa('[data-card]'), foot: q('.k-foot'), keys: q('.k-keys') };
  }

  MP.screen({
    id: 'gear', short: 'Chọn GEAR', name: 'Chọn GEAR', sub: 'sau mỗi trận Matchday thắng', prio: 'High', group: 'vào nhiều · cảm xúc cao', effort: 'M',
    pre: 0.5, preLabel: 'MÀN KẾT QUẢ<br>(vừa bấm CONTINUE)',
    problem: 'Không có anim, chọn sẵn món 1, Enter nhận ngay: bấm liên tay từ màn kết quả là chọn mù món 1 và đeo cho người đầu tiên.',
    fix: 'Pop 0.5s (lớp che → bước + 3 món cùng nhịp → thẻ cầu thủ → SKIP), Enter bị bỏ qua 0.5s đầu. Chỉ chạy khi <code>RunUI.key</code> đổi (mở thẻ lần đầu), vì <code>Menu.render</code> ghi đè <code>innerHTML</code> mỗi lần bấm phím.',
    css: `
  .k-veil { background: rgba(7, 5, 10, 0.86); }
  .k-steps { left: 0; top: 10px; width: 640px; display: flex; justify-content: center; align-items: center; gap: 8px; font-size: 15px; color: var(--muted); }
  .k-steps i { font: 7px/1 var(--f-px); font-style: normal; padding: 3px 4px 2px; background: #323742; color: #e6dccb; margin-right: 4px; }
  .k-steps .on { color: var(--gold); }
  .k-steps .on i { background: var(--gold); color: #121316; }
  .k-sub { left: 0; top: 30px; width: 640px; text-align: center; font: 7px/1 var(--f-px); color: var(--gold); letter-spacing: 2px; }
  .k-gear { top: 44px; width: 196px; height: 46px; display: flex; gap: 6px; align-items: center; padding: 4px 6px; background: rgba(18,20,24,0.9);
    border: 1px solid var(--rc); box-shadow: 2px 2px 0 #121316; }
  .k-gear.sel { border-color: var(--gold); box-shadow: 0 0 0 1px var(--gold), 2px 2px 0 #121316; }
  .k-tag { width: 28px; height: 34px; flex: none; background: color-mix(in srgb, var(--rc) 35%, #1a1c22); clip-path: polygon(30% 0, 100% 0, 100% 100%, 0 100%, 0 30%); }
  .k-gear b { display: block; font: 7px/1.2 var(--f-px); color: #fff; font-weight: 400; }
  .k-gear u { display: inline-block; text-decoration: none; font: 6px/1 var(--f-px); padding: 2px 3px; margin-top: 3px; color: #121316; background: var(--c); }
  .k-gear p { margin: 3px 0 0; font-size: 11px; line-height: 1; color: #c7ccd6; }
  .k-card { top: 100px; width: 180px; height: 176px; padding: 6px; background: rgba(18,20,24,0.9); border: 1px solid #323742; box-shadow: 2px 2px 0 #121316;
    display: flex; flex-direction: column; gap: 4px; }
  .k-card header { display: flex; align-items: center; gap: 6px; font: 7px/1 var(--f-px); color: #fff; }
  .k-card header s { width: 26px; height: 26px; background: #2f3542; border: 1px solid #4a5163; }
  .k-card header em { margin-left: auto; font: 9px/1 var(--f-px); color: var(--gold); font-style: normal; }
  .k-row { display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--muted); }
  .k-row span { width: 24px; }
  .k-row i { flex: 1; height: 4px; background: #242730; border: 1px solid #121316; }
  .k-row i b { display: block; height: 100%; background: #9aa3b5; }
  .k-slots { display: flex; gap: 4px; margin-top: auto; }
  .k-slots s { width: 22px; height: 22px; border: 1px dashed rgba(255,255,255,0.35); }
  .k-slots s.full { border: 1px solid #c77dff; background: #2a1d3a; }
  .k-slots s.ghost { border: 1px dashed var(--gold); background: rgba(255,225,79,0.12); }
  .k-foot { left: 0; top: 296px; width: 640px; height: 30px; }
  .k-foot .g-btn { left: 296px; top: 0; }
  .k-keys { left: 0; top: 330px; width: 640px; text-align: center; font-size: 12px; color: var(--muted); }
  .k-keys kbd { font: inherit; padding: 0 3px; border: 1px solid #555; color: #e6dccb; }`,
    cols: [
      {
        tag: 'Before', title: 'Code hiện tại', cta: 'PICK: Running Spikes (chưa kịp nhìn)', total: 0, ctaAt: 0,
        line: '<b>0s</b> · mở tức thì, chọn sẵn món 1, Enter nhận ngay: bấm liên tay là chọn mù',
        build(stage) { mock(stage); },
      },
      {
        tag: 'After', title: 'Pop 1 nhịp + khoá 0.5s', cta: 'PICK: món đang chọn', total: 0.45, ctaAt: 0.5,
        line: '<b>0.5s</b> · lớp che → bước + 3 món → thẻ cầu thủ → SKIP; Enter bị bỏ qua 0.5s đầu',
        build(stage, tl) {
          const m = mock(stage);
          tl.anim(m.veil, [{ opacity: 0 }, { opacity: 1 }], { dur: 0.12, ease: 'steps(2)' });
          tl.anim(m.head, [{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'none' }], { at: 0.05, dur: 0.2, ease: 'steps(3)' });
          tl.anim(m.sub, [{ opacity: 0 }, { opacity: 1 }], { at: 0.05, dur: 0.2, ease: 'steps(3)' });
          m.gears.forEach((g) => tl.anim(g, [{ opacity: 0, transform: 'scale(0.92)' }, { opacity: 1, transform: 'none' }], { at: 0.1, dur: 0.25, ease: 'steps(4)' }));
          m.cards.forEach((c) => tl.anim(c, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { at: 0.2, dur: 0.2, ease: 'steps(3)' }));
          tl.anim(m.foot, [{ opacity: 0 }, { opacity: 1 }], { at: 0.3, dur: 0.15, ease: 'steps(3)' });
          tl.anim(m.keys, [{ opacity: 0 }, { opacity: 1 }], { at: 0.3, dur: 0.15, ease: 'steps(3)' });
        },
      },
    ],
  });
})();
