/* Banner đầu trận (tên node trong run) + lượt chọn Core đầu trận — src/ui/hud.js banner, src/main.js kickoff, CSS #banner / bannerIn */
(function () {
  'use strict';
  const P = 1.2;   // người chơi chọn lá (giả lập; sau khoá 0.5s)
  function mock(stage) {
    stage.appendChild(MP.html(`
      <div class="n-pitch"></div>
      <div class="g n-hud">STREET KIDS <b>0 - 0</b> ROOFTOP KINGS<em>2:30</em></div>
      <div class="g n-abar" data-l="thanh kỹ năng"></div>
      <div class="g n-banner"><div class="n-main">MATCHDAY</div><div class="n-sub">Street Level · vs Rooftop Kings</div></div>
      <div class="n-draft"><div class="g n-dtitle">STARTING CORE</div>
        <div class="g n-cards">${[0, 1, 2].map((i) => `<div class="n-card" data-c="${i}"><b>${['Thunder Kick', 'Speed Demon', 'Iron Wall'][i]}</b><s></s></div>`).join('')}</div>
        <div class="g n-build" data-l="YOUR BUILD"></div></div>`));
    const q = (s) => stage.querySelector(s);
    return { banner: q('.n-banner'), draft: q('.n-draft'), cards: [...stage.querySelectorAll('.n-card')] };
  }
  const kfIn = [{ opacity: 0, transform: 'scale(2.2)' }, { offset: 0.1, opacity: 1, transform: 'scale(0.95)' }, { offset: 0.16, transform: 'scale(1)' },
    { offset: 0.82, opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.05)' }];   // @keyframes bannerIn
  // lượt chọn Core đầu trận (rút gọn của draft.js: lật lá lệch 0.02 / 0.10 / 0.18 · chọn ở P · mờ #draft 0.35s ở P + 1.15 · ẩn ở P + 1.53)
  function draft(tl, m, at) {
    m.cards.forEach((c, i) => tl.anim(c, [{ opacity: 0, transform: 'rotateY(90deg)' }, { offset: 0.75, opacity: 1, transform: 'rotateY(-6deg)' }, { opacity: 1, transform: 'rotateY(0deg)' }],
      { at: at + 0.02 + i * 0.08, dur: 0.38, ease: 'cubic-bezier(0.18, 0.85, 0.32, 1.1)', fill: 'backwards' }));
    tl.anim(m.cards[0], [{ transform: 'none' }, { transform: 'translateY(-8px) scale(1.08)' }], { at: P, dur: 0.1, ease: 'steps(2)', fill: 'forwards' });
    m.cards.slice(1).forEach((c) => tl.anim(c, [{ opacity: 1 }, { opacity: 0.15 }], { at: P, dur: 0.25, ease: 'ease', fill: 'forwards' }));
    tl.anim(m.cards[0], [{ transform: 'translateY(-8px) scale(1.08)', opacity: 1 }, { transform: 'translate(174px, 119px) scale(0.15)', opacity: 0.25 }],
      { at: P + 0.2, dur: 0.42, ease: 'cubic-bezier(0.25, 0.9, 0.32, 1)', fill: 'forwards' });
    tl.anim(m.draft, [{ opacity: 1 }, { opacity: 0 }], { at: P + 1.15, dur: 0.35, ease: 'ease-out', fill: 'forwards' });
    tl.tick((t) => {
      m.draft.style.display = t >= at && t < P + 1.53 ? '' : 'none';
      m.cards[0].style.visibility = t >= P + 0.62 ? 'hidden' : '';
    });
  }

  MP.screen({
    id: 'banner', short: 'Banner', name: 'Banner đầu trận', sub: 'tên node / KICK OFF', prio: 'Med', group: 'vào nhiều · cảm xúc cao', effort: 'S',
    problem: 'Banner đầu trận (tên node 1.8s, KICK OFF 1.4–1.6s) và lượt chọn Core đầu trận mở cùng một khung hình, <code>#draft</code> nằm trên che mất banner. JS gỡ class ở <code>dur</code> trong khi keyframe dài 2.2s, nên banner tắt cụt ngay đầu đoạn mờ. (GOAL! 2.2s không bị.)',
    fix: 'Banner chia 3 đoạn do JS điều khiển: vào 0.35s + giữ <code>dur</code> + ra 0.3s. Banner đầu trận hiện sau khi chọn Core xong.',
    note: 'Người chơi giả lập chọn lá 1 ở giây 1.2 (cả 2 cột). Code: <b>src/main.js</b> <code>kickoff</code>, <b>src/ui/hud.js</b> <code>banner</code>, CSS <code>#banner.show</code>.',
    css: `
  .n-pitch { position: absolute; inset: 0; background: repeating-linear-gradient(90deg, #22331f 0 40px, #1d2a22 40px 80px); }
  .n-pitch::after { content: ""; position: absolute; left: 319px; top: 30px; bottom: 30px; width: 2px; background: rgba(236,228,200,0.4); }
  .n-hud { left: 200px; top: 6px; width: 240px; height: 22px; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 12px; color: #e6dccb;
    background: rgba(18,20,24,0.9); border: 1px solid #323742; }
  .n-hud b { font: 8px/1 var(--f-px); color: #fff; font-weight: 400; }
  .n-hud em { font: 6px/1 var(--f-px); font-style: normal; color: #fff; }
  .n-abar { left: 8px; top: 318px; width: 222px; height: 34px; background: rgba(18,20,24,0.9); border: 1px solid #323742; }
  .n-banner { left: 0; top: 118px; width: 640px; text-align: center; opacity: 0; }
  .n-main { font: 26px/1 var(--f-px); color: #ffb02e; text-shadow: 2px 2px 0 #121316, 4px 4px 0 rgba(0,0,0,0.5); }
  .n-sub { font-size: 15px; margin-top: 6px; color: #fff; text-shadow: 1px 1px 0 #121316; }
  .n-draft { position: absolute; inset: 0; background: rgba(10, 11, 14, 0.78); }
  .n-dtitle { left: 0; top: 38px; width: 640px; text-align: center; font: 16px/1 var(--f-px); color: var(--gold); text-shadow: 2px 2px 0 #121316; }
  .n-cards { left: 83px; top: 78px; width: 474px; height: 196px; display: flex; gap: 12px; perspective: 900px; }
  .n-card { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 10px; background: #1a1c22; border: 2px solid #323742; box-shadow: 4px 4px 0 #121316; }
  .n-card b { font: 8px/1.2 var(--f-px); color: #fff; font-weight: 400; text-align: center; }
  .n-card s { width: 100px; height: 90px; background: #2f3542; border: 1px solid #4a5163; }
  .n-build { left: 295px; top: 282px; width: 50px; height: 50px; border: 1px solid #8a6d3b; background: #121316; }`,
    cols: [
      {
        tag: 'Before', title: 'Code hiện tại', cta: '', total: P + 1.53, ctaAt: Infinity,
        tap: () => ({ ignore: 'mục này xem nhịp, không bấm' }), state: () => ['—', 'lock'],
        line: 'Banner và draft mở <b>cùng lúc</b>, draft che banner; banner bị gỡ ở 1.8s (keyframe 2.2s) nên người chơi gần như không thấy',
        build(stage, tl) {
          const m = mock(stage);
          tl.anim(m.banner, kfIn, { dur: 2.2, ease: 'ease-out', fill: 'forwards' });
          tl.tick((t) => { m.banner.style.visibility = t >= 1.8 ? 'hidden' : ''; });   // hud.js: bỏ class .show ở dur = 1.8s -> về opacity 0 tức thì
          draft(tl, m, 0.02);
        },
      },
      {
        tag: 'After', title: 'Draft trước, banner sau', cta: '', total: P + 1.58 + 2.45, ctaAt: Infinity,
        tap: () => ({ ignore: 'mục này xem nhịp, không bấm' }), state: () => ['—', 'lock'],
        line: 'Chọn Core xong (2.73s) mới tới banner: vào <b>0.35s</b> + giữ 1.8s + ra 0.3s, không bị che, không tắt cụt',
        build(stage, tl) {
          const m = mock(stage);
          draft(tl, m, 0.02);
          const b = P + 1.58;
          tl.anim(m.banner, [{ opacity: 0, transform: 'scale(2.2)' }, { offset: 0.63, opacity: 1, transform: 'scale(0.95)' }, { opacity: 1, transform: 'scale(1)' }],
            { at: b, dur: 0.35, ease: 'ease-out', fill: 'forwards' });
          tl.anim(m.banner, [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.05)' }], { at: b + 0.35 + 1.8, dur: 0.3, ease: 'ease-in', fill: 'forwards' });
        },
      },
    ],
  });
})();
