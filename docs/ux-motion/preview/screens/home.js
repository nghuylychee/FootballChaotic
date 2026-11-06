/* Tab trang chủ: hnPop chạy lại mỗi lần Menu.render — src/ui/menu.js renderHome, CSS .hn-tab.sel (hnPop 0.2s steps(3)) */
(function () {
  'use strict';
  const EV = [[1.2, '↻ vẽ lại: tin nhắn tự ẩn'], [2.2, '→ người chơi chọn SHOP'], [3.2, '↻ vẽ lại: đổi tay cầm / rê chuột']];
  function mock(stage) {
    stage.appendChild(MP.html(`
      <div class="t-bg"></div>
      <div class="g t-logo">STREET<br>FOOTBALL<br>CHAOS</div>
      <div class="g t-nav"><span class="t-tab" data-t="char"><b>CHARACTER</b></span><span class="t-tab play" data-t="play"><b>PLAY</b><small>GOAT PATH</small></span><span class="t-tab" data-t="shop"><b>SHOP</b></span></div>
      <div class="g t-ev"></div>`));
    const q = (s) => stage.querySelector(s);
    return { play: q('[data-t="play"]'), shop: q('[data-t="shop"]'), ev: q('.t-ev') };
  }
  const kfPop = [{ transform: 'translateY(8px)' }, { transform: 'none' }];   // @keyframes hnPop
  function base(tl, m) {
    tl.tick((t) => {
      m.play.classList.toggle('sel', t < 2.2);
      m.shop.classList.toggle('sel', t >= 2.2);
      const e = EV.find(([at]) => t >= at && t < at + 0.7);
      m.ev.textContent = e ? e[1] : '';
      m.ev.style.display = e ? 'block' : 'none';
    });
  }

  MP.screen({
    id: 'home', short: 'Tab Home', name: 'Tab trang chủ', sub: 'khối tab đang chọn bật lên', prio: 'Low', group: 'vào nhiều · cảm xúc thấp', effort: 'S',
    problem: '<code>hnPop</code> gắn vào class <code>.sel</code>, mà <code>Menu.render</code> ghi đè <code>innerHTML</code> mỗi lần vẽ lại (tin nhắn tự ẩn 3.5s, đổi tay cầm, hỏi thoát…), nên tab đang chọn bật lên lại dù không đổi gì.',
    fix: 'Chỉ thêm class bật khi mục chọn thật sự đổi (nhớ tab vừa bật).',
    css: `
  .t-bg { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(10,11,14,0.88) 0%, rgba(10,11,14,0.35) 34%, rgba(10,11,14,0.2) 62%, rgba(10,11,14,0.9) 100%), #1d2a22; }
  .t-logo { left: 22px; top: 18px; font: 14px/1.3 var(--f-px); color: var(--gold); text-shadow: 2px 2px 0 #121316; }
  .t-nav { left: 0; top: 310px; width: 640px; height: 50px; display: flex; justify-content: center; align-items: flex-end; gap: 0; background: rgba(14,16,20,0.92); border-top: 2px solid #121316; }
  .t-tab { width: 150px; height: 44px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; background: #23262e; border: 2px solid #565c6b; border-bottom: 0; }
  .t-tab.play { width: 210px; height: 58px; margin: 0 14px; background: #1b1d24; border-color: var(--gold); }
  .t-tab b { font: 21px/1 var(--f-vt); letter-spacing: 2px; color: #e6dccb; font-weight: 400; }
  .t-tab small { font-size: 10px; color: var(--muted); }
  .t-tab.sel { height: 56px; background: var(--gold); border-color: #fff; }
  .t-tab.play.sel { height: 62px; }
  .t-tab.sel b { color: #121316; }
  .t-tab.sel small { color: #6a4a00; }
  .t-ev { left: 0; top: 150px; width: 640px; text-align: center; font-size: 18px; color: #fff; display: none; }`,
    cols: [
      {
        tag: 'Before', title: 'Code hiện tại', cta: '', total: 3.9, ctaAt: Infinity, tap: () => ({ ignore: 'mục này xem nhịp, không bấm' }), state: () => ['—', 'lock'],
        line: 'Tab bật lên <b>4 lần</b>: lúc mở, 2 lần vẽ lại không đổi gì, 1 lần đổi tab thật',
        build(stage, tl) {
          const m = mock(stage);
          base(tl, m);
          [0, 1.2].forEach((at) => tl.anim(m.play, kfPop, { at, dur: 0.2, ease: 'steps(3)', fill: 'none' }));
          [2.2, 3.2].forEach((at) => tl.anim(m.shop, kfPop, { at, dur: 0.2, ease: 'steps(3)', fill: 'none' }));
        },
      },
      {
        tag: 'After', title: 'Bật khi đổi tab', cta: '', total: 3.9, ctaAt: Infinity, tap: () => ({ ignore: 'mục này xem nhịp, không bấm' }), state: () => ['—', 'lock'],
        line: 'Tab bật lên <b>2 lần</b>: lúc mở và lúc đổi tab',
        build(stage, tl) {
          const m = mock(stage);
          base(tl, m);
          tl.anim(m.play, kfPop, { at: 0, dur: 0.2, ease: 'steps(3)', fill: 'none' });
          tl.anim(m.shop, kfPop, { at: 2.2, dur: 0.2, ease: 'steps(3)', fill: 'none' });
        },
      },
    ],
  });
})();
