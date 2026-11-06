/* Toast "X gets Core" trong trận — src/ui/hud.js toast (out ở 2600ms, gỡ ở 3100ms), CSS .toast (transition opacity / transform 0.4s) */
(function () {
  'use strict';
  const TS = [[0.3, '#ff8a3d', 'Bo', 'Gravity Well'], [0.9, '#ff8a3d', 'Kiki', 'Iron Wall']];
  function mock(stage) {
    stage.appendChild(MP.html(`
      <div class="s-pitch"></div>
      <div class="g s-hud">STREET KIDS <b>1 - 1</b> ROOFTOP KINGS</div>
      <div class="g s-stack">${TS.map(([, c, who, core], i) => `<div class="s-toast" data-i="${i}"><i style="background:${c}"></i>${who} gets <b>${core}</b></div>`).join('')}</div>`));
    return { toasts: [...stage.querySelectorAll('.s-toast')] };
  }
  const kfOut = [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(10px)' }];
  function life(tl, m, fadeIn) {
    m.toasts.forEach((el, i) => {
      const at = TS[i][0];
      if (fadeIn) tl.anim(el, [{ opacity: 0, transform: 'translateX(10px)' }, { opacity: 1, transform: 'none' }], { at, dur: 0.15, ease: 'ease', fill: 'none' });
      tl.anim(el, kfOut, { at: at + 2.6, dur: 0.4, ease: 'ease', fill: 'forwards' });
    });
    tl.tick((t) => m.toasts.forEach((el, i) => { const at = TS[i][0]; el.style.display = t >= at && t < at + 3.1 ? 'flex' : 'none'; }));
  }

  MP.screen({
    id: 'toast', short: 'Toast', name: 'Toast trong trận', sub: '"X gets Core"', prio: 'Low', group: 'vào nhiều · cảm xúc thấp', effort: 'S',
    problem: 'Toast hiện bật ra không có anim vào (<code>.toast</code> có transition nhưng không có trạng thái bắt đầu), chỉ có anim ra 0.4s.',
    fix: 'Fade + trượt vào 0.15s, giống chiều ra.',
    css: `
  .s-pitch { position: absolute; inset: 0; background: repeating-linear-gradient(90deg, #22331f 0 40px, #1d2a22 40px 80px); }
  .s-hud { left: 200px; top: 6px; width: 240px; height: 22px; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 12px; color: #e6dccb;
    background: rgba(18,20,24,0.9); border: 1px solid #323742; }
  .s-hud b { font: 8px/1 var(--f-px); color: #fff; font-weight: 400; }
  .s-stack { right: 8px; bottom: 8px; display: flex; flex-direction: column; gap: 3px; align-items: flex-end; }
  .s-toast { display: none; align-items: center; gap: 4px; font-size: 12px; color: #e6dccb; background: rgba(18,20,24,0.9); border: 1px solid #323742; padding: 1px 6px; }
  .s-toast i { width: 5px; height: 5px; }
  .s-toast b { color: var(--gold); font-weight: 400; }`,
    cols: [
      {
        tag: 'Before', title: 'Code hiện tại', cta: '', total: 4.0, ctaAt: Infinity, tap: () => ({ ignore: 'mục này xem nhịp, không bấm' }), state: () => ['—', 'lock'],
        line: 'Vào <b>tức thì</b> · ra mờ + trượt 0.4s ở giây 2.6',
        build(stage, tl) { life(tl, mock(stage), false); },
      },
      {
        tag: 'After', title: 'Fade vào 0.15s', cta: '', total: 4.0, ctaAt: Infinity, tap: () => ({ ignore: 'mục này xem nhịp, không bấm' }), state: () => ['—', 'lock'],
        line: 'Vào mờ + trượt <b>0.15s</b> · ra giữ nguyên',
        build(stage, tl) { life(tl, mock(stage), true); },
      },
    ],
  });
})();
