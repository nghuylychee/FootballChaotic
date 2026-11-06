/* LEGEND xin vào đội "Who gets him?" + anim ký — src/ui/runmap.js joinCard / hero / sign / tickStats, CSS .lgx, .sg-row, .lg-dpop, .lg-stamp */
(function () {
  'use strict';
  const P = 1.6;              // lúc người chơi bấm chọn (giả lập) — anim ký bắt đầu
  const T0 = 0.7, STEP = 0.38, N = 2, TEND = T0 + N * STEP + 0.25, DONE = TEND + 1.1;   // runmap.js sign: T0 700ms, STEP 380ms, tEnd + 1100ms
  const STATS = [['PAC', 72, 72], ['SHO', 70, 76], ['PAS', 72, 72], ['DRI', 71, 74], ['FIG', 70, 70], ['GK', 67, 67]];
  const SQUAD = [['YOU', 'FWD', 70], ['Mai', 'MID', 70], ['Tùng', 'DEF', 69]];

  function mock(stage) {
    stage.appendChild(MP.html(`
      <div class="g-veil l-bg"></div>
      <div class="g l-hero"><div class="l-port"><span class="l-rays">${Array.from({ length: 12 }, (_, i) => `<i style="transform:rotate(${i * 30}deg)"></i>`).join('')}</span><s></s></div>
        <div class="l-txt"><b>THE MAESTRO</b><u>Pirlow</u><div class="l-chips"><span class="l-combo">KNUCKLEBALL</span><span class="l-st">SHO ▲</span><span class="l-st">DRI ▲</span><span class="l-flaw">FEATHERWEIGHT</span></div></div></div>
      <div class="g l-who">WHO GETS HIM?</div>
      <div class="g l-note">AI teammates use his combo on their own.</div>
      ${SQUAD.map(([n, p, o], i) => `<div class="g l-card ${i ? '' : 'sel'}" data-card="${i}" style="left:${70 + i * 170}px">
        <header><b>${n}</b><em>${p}</em><strong class="l-ovr">${o}</strong></header>
        <div class="l-body"><s class="l-art"></s><div class="l-cols">${STATS.map(([k, a], j) => `<span class="l-sst" data-st="${j}"><i>${k}</i><b>${a}</b></span>`).join('')}</div></div>
        <div class="l-badges"></div></div>`).join('')}
      <div class="g l-foot"><span class="g-btn">NO THANKS</span></div>
      <div class="g l-say">▶ người chơi chọn YOU</div>
      <div class="g l-map">→ map</div>`));
    const q = (s) => stage.querySelector(s), qa = (s) => [...stage.querySelectorAll(s)];
    const card = q('[data-card="0"]');
    // chân dung bay (WAAPI 650ms) · dấu +n · NEW COMBO · chip LEGEND: dựng sẵn, timeline bật / tắt
    card.insertAdjacentHTML('beforeend', '<div class="l-stamp"><em>NEW COMBO</em><span class="l-combo">KNUCKLEBALL</span></div>');
    card.querySelector('.l-badges').innerHTML = '<span class="l-leg">THE MAESTRO</span>';
    stage.insertAdjacentHTML('beforeend', '<s class="g l-fly"></s>' + [1, 3].map((j) => `<b class="g l-pop" data-pop="${j}">+${STATS[j][2] - STATS[j][1]}</b>`).join(''));
    return { bg: q('.l-bg'), hero: q('.l-hero'), port: q('.l-port'), txt: q('.l-txt'), rays: q('.l-rays'), who: q('.l-who'), note: q('.l-note'),
      cards: qa('[data-card]'), card, foot: q('.l-foot'), say: q('.l-say'), map: q('.l-map'), fly: q('.l-fly'), ovr: card.querySelector('.l-ovr'),
      st: (j) => card.querySelector(`[data-st="${j}"] b`), pop: (j) => q(`[data-pop="${j}"]`), stamp: card.querySelector('.l-stamp'), leg: card.querySelector('.l-leg') };
  }
  // phần chung: chân dung xoay tia vô hạn (lgSpin 24s) + toàn bộ anim ký bắt đầu ở `at`
  function signAnim(tl, m, at) {
    tl.anim(m.rays, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { dur: 24, iter: Infinity });
    // chân dung từ khung LEGEND bay vào ô hình của thẻ (runmap.js sign: dx / dy theo vị trí thật)
    tl.anim(m.fly, [{ transform: 'translate(0, 0) scale(1)', opacity: 1 }, { offset: 0.45, transform: 'translate(-55px, 38px) scale(1.1)', opacity: 1 },
      { transform: 'translate(-110px, 136px) scale(0.7)', opacity: 0 }], { at, dur: 0.65, ease: 'cubic-bezier(.45, 0, .6, 1)', fill: 'forwards' });
    STATS.forEach(([, a, b], j) => {
      if (a === b) return;
      const k = [1, 3].indexOf(j), t0 = at + T0 + k * STEP;
      tl.anim(m.st(j), [{ transform: 'none' }, { offset: 0.5, transform: 'scale(1.35)' }, { transform: 'none' }], { at: t0 + 0.045, dur: 0.18, ease: 'steps(2)', iter: 3, fill: 'none' });
      tl.anim(m.pop(j), [{ transform: 'translateY(4px) scale(0.6)', opacity: 0 }, { offset: 0.2, transform: 'translateY(-4px) scale(1.2)', opacity: 1 },
        { transform: 'translateY(-18px) scale(1)', opacity: 0 }], { at: t0 + 0.27, dur: 0.9, ease: 'ease-out', fill: 'forwards' });
    });
    tl.anim(m.stamp, [{ transform: 'translate(-50%, -50%) rotate(-6deg) scale(2.6)', opacity: 0 }, { transform: 'translate(-50%, -50%) rotate(-6deg) scale(1)', opacity: 1 }],
      { at: at + TEND, dur: 0.35, ease: 'cubic-bezier(.2, 1.6, .5, 1)' });
    tl.tick((t) => {
      const on = t >= at;
      m.fly.style.display = on && t < at + 0.7 ? '' : 'none';
      m.cards.forEach((c, i) => { c.classList.toggle('out', on && i > 0); });
      m.card.classList.toggle('got', on);
      STATS.forEach(([, a, b], j) => {
        if (a === b) return;
        const k = [1, 3].indexOf(j), q = Math.max(0, Math.min(6, Math.floor((t - (at + T0 + k * STEP)) / 0.045)));
        m.st(j).textContent = Math.round(a + ((b - a) * q) / 6);
      });
      m.ovr.textContent = t >= at + TEND ? 72 : 70;
      m.stamp.style.visibility = t >= at + TEND ? 'visible' : 'hidden';
      m.leg.style.display = t >= at + TEND ? '' : 'none';
      m.say.style.display = t >= at && t < at + 0.5 ? 'block' : 'none';
      m.map.style.display = t >= at + DONE ? 'flex' : 'none';
    });
  }

  MP.screen({
    id: 'legend', short: 'Ký LEGEND', name: 'LEGEND: Who gets him? + ký', sub: 'sau khi vượt LEGEND TRIAL', prio: 'High', group: 'vào ít · cảm xúc cao', effort: 'M',
    pre: 0.5, preLabel: 'MÀN KẾT QUẢ LEGEND TRIAL<br>(vừa bấm CONTINUE)',
    problem: 'Màn chọn người nhận hiện tức thì, chọn sẵn thẻ đầu (FWD) và nhận Enter ngay: bấm liên tay là ký LEGEND cho người đầu tiên. Anim ký 2.0–3.2s khoá input, không bỏ qua được; Esc giữa chừng vẽ lại màn làm vỡ hình (timer vẫn chạy).',
    fix: 'Màn chọn: stagger ≈1.0s (chân dung + tia → tên → câu hỏi → 3 thẻ cùng lúc → NO THANKS), bấm sớm = hiện đủ + khoá 0.3s. Anim ký: bấm / Esc = nhảy tới trạng thái cuối (OVR mới + NEW COMBO).',
    note: 'Người chơi giả lập bấm chọn YOU ở giây 1.6 (cả 2 cột). LEGEND này đổi 2 chỉ số (SHO, DRI). Code: <b>src/ui/runmap.js</b> <code>joinCard</code>, <code>sign</code>, <code>tickStats</code>.',
    css: `
  .l-bg { background: radial-gradient(ellipse at 50% 30%, color-mix(in srgb, #ffb02e 14%, #1c2030), #0e1016 75%); }
  .l-hero { left: 158px; top: 12px; width: 324px; height: 104px; display: flex; align-items: center; gap: 14px; --lc: #ffb02e; }
  .l-port { position: relative; width: 110px; height: 104px; flex: none; display: flex; align-items: flex-end; justify-content: center; }
  .l-port::before { content: ''; position: absolute; inset: -6px -10px 0; background: radial-gradient(circle at 50% 55%, color-mix(in srgb, var(--lc) 55%, transparent), transparent 62%); }
  .l-rays { position: absolute; left: 50%; top: 55%; width: 0; height: 0; }
  .l-rays i { position: absolute; left: -1px; top: -60px; width: 2px; height: 26px; background: var(--lc); opacity: 0.55; transform-origin: 1px 60px; }
  .l-port s, .l-fly { position: relative; width: 50px; height: 80px; background: #3a3020; border: 1px solid #8a6d3b; }
  .l-fly { position: absolute; left: 188px; top: 34px; }
  .l-txt { display: flex; flex-direction: column; gap: 4px; }
  .l-txt b { font: 15px/1 var(--f-px); color: var(--lc); letter-spacing: 2px; text-shadow: 2px 2px 0 #121316; font-weight: 400; }
  .l-txt u { text-decoration: none; font-size: 16px; color: #e6dccb; }
  .l-chips { display: flex; flex-wrap: wrap; gap: 4px; }
  .l-combo { font: 6px/1 var(--f-px); padding: 3px 4px 2px; color: #121316; background: #ffb02e; box-shadow: 2px 2px 0 #121316; }
  .l-st { font: 6px/1 var(--f-px); padding: 3px 3px 2px; color: #9dff3d; border: 1px solid #3b4252; }
  .l-flaw { font: 5px/1 var(--f-px); padding: 3px 3px 2px; color: #ff5a6e; border: 1px solid rgba(255,90,110,0.5); }
  .l-who { left: 0; top: 122px; width: 640px; text-align: center; font: 7px/1 var(--f-px); color: var(--gold); letter-spacing: 3px; }
  .l-note { left: 0; top: 132px; width: 640px; text-align: center; font-size: 13px; color: var(--muted); }
  .l-card { top: 150px; width: 160px; height: 168px; padding: 6px; display: flex; flex-direction: column; gap: 4px; background: rgba(18,20,24,0.92);
    border: 1px solid #323742; box-shadow: 2px 2px 0 #121316; }
  .l-card.sel { border-color: var(--gold); box-shadow: 0 0 0 1px var(--gold), 2px 2px 0 #121316; }
  .l-card.got { box-shadow: 0 0 0 1px #ffb02e, 0 0 14px rgba(255,176,46,0.6), 2px 2px 0 #121316; }
  .l-card.out { opacity: 0.25; }
  .l-card header { display: flex; align-items: center; gap: 5px; font: 7px/1 var(--f-px); color: #fff; }
  .l-card header em { font-style: normal; color: var(--muted); }
  .l-card header strong { margin-left: auto; font: 10px/1 var(--f-px); color: var(--gold); font-weight: 400; }
  .l-body { flex: 1; display: flex; gap: 6px; }
  .l-art { width: 54px; background: #2f3542; border: 1px solid #4a5163; }
  .l-cols { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 6px 4px; align-content: center; }
  .l-sst { display: flex; flex-direction: column; align-items: center; gap: 2px; }
  .l-sst i { font-size: 11px; font-style: normal; color: var(--muted); }
  .l-sst b { font: 7px/1 var(--f-px); color: #fff; font-weight: 400; }
  .l-badges { min-height: 18px; display: flex; }
  .l-leg { font: 6px/1 var(--f-px); padding: 3px 4px 2px; color: #121316; background: #ffb02e; }
  .l-stamp { position: absolute; left: 50%; top: 56%; transform: translate(-50%, -50%) rotate(-6deg); display: flex; flex-direction: column; align-items: center; gap: 3px; z-index: 3; visibility: hidden; }
  .l-stamp em { font: 6px/1 var(--f-px); font-style: normal; color: #111; background: #ffb02e; padding: 2px 4px 1px; letter-spacing: 2px; }
  .l-pop { position: absolute; font: 8px/1 var(--f-px); color: #9dff3d; text-shadow: 1px 1px 0 #121316; opacity: 0; }
  .l-pop[data-pop="1"] { left: 214px; top: 186px; }
  .l-pop[data-pop="3"] { left: 214px; top: 214px; }
  .l-foot { left: 0; top: 328px; width: 640px; height: 22px; }
  .l-foot .g-btn { left: 282px; top: 0; }
  .l-say { left: 70px; top: 330px; font-size: 13px; color: var(--gold); display: none; }
  .l-map { inset: 0; display: none; align-items: center; justify-content: center; background: #1d2a22; font: 12px/1 var(--f-px); color: #e6dccb; }`,
    cols: [
      {
        tag: 'Before', title: 'Code hiện tại', cta: 'ký LEGEND', total: P + DONE, ctaAt: Infinity,
        line: '<b>0s</b> hiện tức thì, Enter = ký cho thẻ đầu · anim ký <b>2.81s</b> khoá, không bỏ qua',
        tap: (ct) => (ct < P ? { jump: P, msg: 'ký ngay cho YOU (chưa kịp xem)' } : ct < P + DONE ? { ignore: 'khoá: đang diễn ký' } : { ignore: 'đã về map' }),
        state: (ct) => (ct < P ? ['nhận phím: ký cho thẻ đầu', 'on'] : ct < P + DONE ? ['khoá (đang diễn)', 'lock'] : ['đã về map', 'lock']),
        build(stage, tl) { signAnim(tl, mock(stage), P); },
      },
      {
        tag: 'After', title: 'Stagger + ký bỏ qua được', cta: 'ký LEGEND', total: P + DONE, ctaAt: Infinity,
        line: 'Màn chọn hiện đủ ở <b>0.95s</b>, Enter từ 1.0s · anim ký giữ nhịp, bấm = tới OVR + NEW COMBO ngay',
        tap: (ct) => (ct < 0.95 ? { jump: 0.95, lock: true } : ct < P ? { jump: P, msg: 'chọn người đang trỏ' }
          : ct < P + TEND + 0.35 ? { jump: P + TEND + 0.35, lock: true, msg: 'hiện đủ: OVR + NEW COMBO' } : { ignore: 'chờ về map' }),
        state: (ct) => (ct < 0.95 ? ['bấm = hiện đủ', 'skip'] : ct < P ? ['nhận phím: ký', 'on'] : ct < P + TEND + 0.35 ? ['bấm = hiện đủ', 'skip'] : ['chờ về map', 'lock']),
        build(stage, tl) {
          const m = mock(stage);
          tl.anim(m.bg, [{ opacity: 0 }, { opacity: 1 }], { dur: 0.15, ease: 'steps(2)' });
          tl.anim(m.port, [{ opacity: 0, transform: 'scale(0.8)' }, { opacity: 1, transform: 'none' }], { at: 0.05, dur: 0.3, ease: 'steps(4)' });
          tl.anim(m.txt, [{ opacity: 0, transform: 'translateX(12px)' }, { opacity: 1, transform: 'none' }], { at: 0.2, dur: 0.25, ease: 'steps(4)' });
          tl.anim(m.who, [{ opacity: 0 }, { opacity: 1 }], { at: 0.45, dur: 0.15, ease: 'steps(3)' });
          tl.anim(m.note, [{ opacity: 0 }, { opacity: 1 }], { at: 0.45, dur: 0.15, ease: 'steps(3)' });
          // fill backwards: hết anim thì trả lại CSS (thẻ .out mờ 0.25 khi ký)
          m.cards.forEach((c) => tl.anim(c, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { at: 0.55, dur: 0.25, ease: 'steps(4)', fill: 'backwards' }));
          tl.anim(m.foot, [{ opacity: 0 }, { opacity: 1 }], { at: 0.8, dur: 0.15, ease: 'steps(3)' });
          signAnim(tl, m, P);
        },
      },
    ],
  });
})();
