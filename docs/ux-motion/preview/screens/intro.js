/* Intro trận (màn VS) — src/ui/intro.js, config/intro.config.js, CSS .in-* */
(function () {
  'use strict';
  const C01 = MP.clamp01;
  const STATS = [['SPD', 62, 71], ['PWR', 55, 48], ['PAS', 70, 66], ['PHY', 48, 58], ['DRI', 66, 52], ['SHO', 58, 63]];
  const KIT = ['#4fc3ff', '#ff8a3d'];
  const F = { DEF: [0.17, 0.52], MID: [0.30, 0.32], FWD: [0.41, 0.66] };
  const ROLES = ['FWD', 'MID', 'DEF'];

  function side(t) {
    const r = t === 1, names = r ? ['Bo', 'Kiki', 'Dre'] : ['YOU', 'Mai', 'Tùng'];
    const cards = ROLES.map((p, i) => `<div class="i-card ${!r && i === 0 ? 'you' : ''}" data-card="${t}${i}"><em>${p}</em><s></s><span>${names[i]}</span><small>${r ? 'GRAVITY' : 'THUNDER'}</small></div>`).join('');
    const stats = STATS.map(([k, a, b], i) => `<div class="i-st" data-st="${i}"><span>${k}</span><i><b data-w="${r ? b : a}"></b></i><em>${r ? b : a}</em></div>`).join('');
    return `<div class="g i-side ${r ? 'r' : 'l'}" data-side="${t}">
      <div class="i-team"><i class="i-crest"></i><div class="i-tn"><b>${r ? 'ROOFTOP KINGS' : 'STREET KIDS'}</b>${r ? '' : '<span>Born on the block</span>'}</div></div>
      ${r ? '<div class="i-rule"><b>SLIPPERY PITCH</b><p>Sharp turns make you slide.</p></div>' : ''}
      <div class="i-cards">${cards}</div><div class="i-stats">${stats}</div></div>`;
  }
  function mock(stage) {
    stage.appendChild(MP.html(`<div class="i-root">
      <div class="i-bg l"></div><div class="i-bg r"></div>
      <div class="g i-top"><span>GOAT PATH · ACT 1 · STREET LEVEL</span><b>MATCHDAY</b></div>
      ${side(0)}${side(1)}
      <div class="g i-vs">VS</div>
      <div class="g i-pitch"><canvas width="124" height="74"></canvas></div>
      <div class="g i-venue">ROOFTOP COURT</div>
      <div class="g i-foot"><i class="i-timer"></i><span class="i-hint">Enter skip</span></div></div>`));
    const q = (s) => stage.querySelector(s), qa = (s) => [...stage.querySelectorAll(s)];
    return {
      root: q('.i-root'), bgL: q('.i-bg.l'), bgR: q('.i-bg.r'), top: q('.i-top'), sideL: q('[data-side="0"]'), sideR: q('[data-side="1"]'),
      vs: q('.i-vs'), pitch: q('.i-pitch'), venue: q('.i-venue'), timer: q('.i-timer'), cv: q('canvas'),
      card: (t, i) => q(`[data-card="${t}${i}"]`), rows: qa('.i-st'), bars: qa('.i-st i b'),
    };
  }
  // chấm cầu thủ chạy từ mép sân vào vị trí (intro.js drawPitch): easeOut bậc 2, start(i) / dur theo từng bản
  function pitch(cv, start, dur) {
    const x = cv.getContext('2d'), W = 124, H = 74;
    return (t) => {
      x.clearRect(0, 0, W, H);
      x.fillStyle = '#1d2a22'; x.fillRect(0, 0, W, H);
      x.strokeStyle = 'rgba(236,228,200,0.55)'; x.lineWidth = 1;
      x.strokeRect(3.5, 3.5, W - 7, H - 7);
      x.fillStyle = 'rgba(236,228,200,0.55)'; x.fillRect(W / 2, 4, 1, H - 8);
      x.beginPath(); x.arc(W / 2 + 0.5, H / 2, 9, 0, Math.PI * 2); x.stroke();
      for (let i = 0; i < 6; i++) {
        const team = i < 3 ? 0 : 1, fm = F[ROLES[i % 3]], k = MP.easeOut2(C01((t - start(i)) / dur));
        if (k <= 0) continue;
        const tx = team ? 1 - fm[0] : fm[0], ty = team ? 1 - fm[1] : fm[1], sx = team ? 1.08 : -0.08;
        const cx = 4 + (sx + (tx - sx) * k) * (W - 8), cy = 4 + ty * (H - 8);
        x.fillStyle = '#121316'; x.beginPath(); x.arc(cx, cy, 4, 0, Math.PI * 2); x.fill();
        x.fillStyle = KIT[team]; x.beginPath(); x.arc(cx, cy, 3, 0, Math.PI * 2); x.fill();
      }
    };
  }
  const kfFromL = (px) => [{ opacity: 0, transform: `translateX(-${px}px)` }, { opacity: 1, transform: 'none' }];
  const kfFromR = (px) => [{ opacity: 0, transform: `translateX(${px}px)` }, { opacity: 1, transform: 'none' }];
  const kfCardL = [{ opacity: 0, transform: 'translateX(-24px) scale(0.9)' }, { opacity: 1, transform: 'none' }];
  const kfCardR = [{ opacity: 0, transform: 'translateX(24px) scale(0.9)' }, { opacity: 1, transform: 'none' }];
  const kfDrop = [{ opacity: 0, transform: 'translateY(-12px)' }, { opacity: 1, transform: 'none' }];
  const kfFade = [{ opacity: 0 }, { opacity: 1 }];
  const kfVs = [{ opacity: 0, transform: 'scale(3) rotate(-10deg)' }, { offset: 0.55, opacity: 1, transform: 'scale(0.85) rotate(2deg)' },
    { offset: 0.8, transform: 'scale(1.1)' }, { opacity: 1, transform: 'none' }];
  // phần chung mọi bản: thanh đếm 6.2s + tự đóng (inOut 0.35s steps(5))
  function common(tl, m) {
    tl.anim(m.timer, [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { dur: 6.2, ease: 'linear' });
    tl.anim(m.root, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(1.05)' }], { at: 6.2, dur: 0.35, ease: 'steps(5)', fill: 'forwards' });
  }
  function bars(tl, m, at, dur, ease) {
    m.bars.forEach((b, j) => tl.anim(b, [{ width: '0%' }, { width: b.dataset.w + '%' }], { at: at(j % 6), dur, ease }));
  }
  const skipState = (ct) => (ct < 0.35 ? ['khoá (chống bấm nhầm)', 'lock'] : ['bấm = đóng intro', 'on']);

  MP.screen({
    id: 'intro', short: 'Intro trận', name: 'Intro trận', sub: 'màn VS trước giao bóng', prio: 'High', group: 'vào nhiều · cảm xúc cao', effort: 'S',
    problem: 'Trước mọi trận GOAT PATH (3–5 lần mỗi act): 11 nhịp lẻ, 6 thẻ cầu thủ hiện từng cái xen kẽ trái / phải mất 1.1s, tới 2.55s mới đủ.',
    fix: 'A: 1 nhịp 0.5s (nền + tiêu đề → 2 đội kèm thẻ → VS, sân, chỉ số). B: 2 nhịp 0.9s, bấm sớm = hiện đủ. Thời gian đọc 6.2s và khoá 0.35s giữ nguyên; phần lớn là số trong <code>intro.config.js</code>.',
    note: 'Sprite trong thẻ chỉ vẽ khối (game cho nó chạy tại chỗ 0.55s). Code: <b>src/ui/intro.js</b>, <b>config/intro.config.js</b>, CSS <code>.in-*</code>.',
    css: `
  .i-root { position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 45%, #15171c, #0a0b0e 75%); overflow: hidden; }
  .i-bg { position: absolute; top: 0; bottom: 0; width: 62%; }
  .i-bg.l { left: 0; background: linear-gradient(90deg, color-mix(in srgb, #4fc3ff 55%, #000) 0%, color-mix(in srgb, #4fc3ff 18%, transparent) 70%, transparent);
    clip-path: polygon(0 0, 100% 0, 76% 100%, 0 100%); }
  .i-bg.r { right: 0; background: linear-gradient(270deg, color-mix(in srgb, #ff8a3d 55%, #000) 0%, color-mix(in srgb, #ff8a3d 18%, transparent) 70%, transparent);
    clip-path: polygon(24% 0, 100% 0, 100% 100%, 0 100%); }
  .i-bg::after { content: ""; position: absolute; inset: 0; background: repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0 1px, transparent 1px 3px); }
  .i-top { left: 14px; top: 8px; width: 612px; height: 40px; text-align: center; }
  .i-top span { display: block; font-size: 13px; color: var(--muted); letter-spacing: 2px; line-height: 1; }
  .i-top b { display: block; font: 14px/1 var(--f-px); color: #fff; margin-top: 4px; text-shadow: 2px 2px 0 #121316, 3px 3px 0 #ff3d5a; font-weight: 400; }
  .i-side { top: 72px; width: 224px; height: 245px; }
  .i-side.l { left: 14px; --c: #4fc3ff; }
  .i-side.r { left: 402px; --c: #ff8a3d; }
  .i-team { position: absolute; left: 0; right: 0; top: 0; height: 32px; display: flex; align-items: center; gap: 6px; }
  .i-side.r .i-team { flex-direction: row-reverse; text-align: right; }
  .i-crest { width: 28px; height: 32px; background: linear-gradient(180deg, var(--c), #123); clip-path: polygon(0 0, 100% 0, 100% 62%, 50% 100%, 0 62%); flex: none; }
  .i-tn b { display: block; font: 14px/1.15 var(--f-px); color: #fff; font-weight: 400; text-shadow: 2px 2px 0 #121316; }
  .i-tn span { display: block; font-size: 12px; color: var(--muted); margin-top: 2px; }
  .i-rule { position: absolute; left: 0; right: 0; top: 39px; height: 40px; padding: 5px 7px 6px; background: color-mix(in srgb, var(--c) 14%, #0d0e12);
    border: 1px solid #3b4252; border-left: 4px solid var(--c); box-shadow: 2px 2px 0 #121316; }
  .i-rule b { display: block; font: 10px/1.1 var(--f-px); color: #fff; font-weight: 400; }
  .i-rule p { margin: 4px 0 0; font-size: 13px; color: #e6dccb; line-height: 1; }
  .i-cards { position: absolute; left: 0; right: 0; top: 86px; height: 110px; display: flex; gap: 4px; align-items: flex-end; }
  .i-side.r .i-cards { flex-direction: row-reverse; }
  .i-card { position: relative; flex: 1; height: 110px; background: linear-gradient(180deg, color-mix(in srgb, var(--c) 40%, #121316) 0%, #121316 70%);
    border: 1px solid #4a5163; box-shadow: 2px 2px 0 #121316; text-align: center; }
  .i-card.you { border-color: var(--gold); }
  .i-card em { position: absolute; left: 3px; top: 3px; font: 6px/1 var(--f-px); color: #e6dccb; font-style: normal; }
  .i-card.you em { color: var(--gold); }
  .i-card s { display: block; width: 34px; height: 54px; margin: 18px auto 0; background: #2f3542; border: 1px solid #4a5163; }
  .i-card span { display: block; font-size: 13px; color: #fff; margin-top: 4px; }
  .i-card small { display: block; font-size: 9px; color: var(--gold); }
  .i-stats { position: absolute; left: 0; right: 0; top: 203px; display: grid; grid-template-columns: 1fr 1fr; gap: 3px 8px; }
  .i-st { display: flex; align-items: center; gap: 3px; font-size: 12px; line-height: 1; color: var(--muted); }
  .i-side.r .i-st { flex-direction: row-reverse; }
  .i-st span { width: 18px; }
  .i-st i { flex: 1; height: 4px; background: #242730; border: 1px solid #121316; display: flex; }
  .i-side.r .i-st i { justify-content: flex-end; }
  .i-st i b { display: block; height: 100%; background: var(--c); }
  .i-st em { width: 14px; font-style: normal; color: #e6dccb; text-align: right; }
  .i-vs { left: 246px; top: 153px; width: 148px; text-align: center; font: 16px/1 var(--f-px); color: #fff; text-shadow: 2px 2px 0 #121316, -1px 0 0 #4fc3ff, 1px 0 0 #ff8a3d; }
  .i-pitch { left: 257px; top: 174px; width: 126px; height: 76px; border: 1px solid #323742; box-shadow: 2px 2px 0 #121316; line-height: 0; }
  .i-pitch canvas { width: 124px; height: 74px; image-rendering: pixelated; }
  .i-venue { left: 246px; top: 255px; width: 148px; text-align: center; font-size: 13px; color: #e6dccb; letter-spacing: 1px; }
  .i-foot { left: 14px; top: 340px; width: 612px; height: 14px; display: flex; align-items: center; gap: 8px; }
  .i-timer { flex: 1; height: 2px; background: var(--gold); opacity: 0.6; transform-origin: left; }
  .i-hint { font-size: 12px; padding: 1px 6px 2px; color: #e6dccb; background: rgba(10, 11, 14, 0.82); border: 1px solid #3b4252; line-height: 1; }`,
    cols: [
      {
        tag: 'Before', title: 'Code hiện tại', cta: 'Bỏ qua intro', total: 6.55, ctaAt: 0.35, state: skipState,
        line: 'Hiện đủ lúc <b>2.55s</b> · 11 nhịp lẻ, 6 thẻ xen kẽ trái / phải · tự đóng 6.2s',
        build(stage, tl) {
          const m = mock(stage);
          tl.anim(m.bgL, [{ transform: 'translateX(-100%)' }, { transform: 'none' }], { dur: 0.4, ease: 'steps(6)' });
          tl.anim(m.bgR, [{ transform: 'translateX(100%)' }, { transform: 'none' }], { dur: 0.4, ease: 'steps(6)' });
          tl.anim(m.top, kfDrop, { dur: 0.3, ease: 'steps(4)' });
          tl.anim(m.sideL, kfFromL(30), { at: 0.4, dur: 0.35, ease: 'steps(5)' });   // --d = teamIn + 0.15
          tl.anim(m.sideR, kfFromR(30), { at: 0.4, dur: 0.35, ease: 'steps(5)' });
          tl.anim(m.vs, kfVs, { at: 0.75, dur: 0.45, ease: 'steps(6)' });
          let k = 0;   // thẻ: cardsAt 0.9 + k·cardGap 0.22, xen kẽ trái / phải
          for (let i = 0; i < 3; i++) for (const t of [0, 1]) tl.anim(m.card(t, i), t ? kfCardR : kfCardL, { at: +(0.9 + k++ * 0.22).toFixed(2), dur: 0.3, ease: 'steps(5)' });
          tl.anim(m.pitch, kfFade, { at: 1.1, dur: 0.3, ease: 'steps(3)' });   // pitchAt - 0.2
          tl.anim(m.venue, kfFade, { at: 1.3, dur: 0.3, ease: 'steps(3)' });
          tl.tick(pitch(m.cv, (i) => 1.3 + i * 0.12, 0.6));
          m.rows.forEach((r, j) => tl.anim(r, kfFade, { at: 1.8 + (j % 6) * 0.05, dur: 0.2, ease: 'steps(3)' }));
          bars(tl, m, (j) => 1.8 + j * 0.05, 0.5, 'steps(8)');
          common(tl, m);
        },
      },
      {
        tag: 'Option A', title: 'Pop 1 nhịp', cta: 'Bỏ qua intro', total: 6.55, ctaAt: 0.35, state: skipState,
        line: 'Hiện đủ lúc <b>0.5s</b> · nền + tiêu đề → 2 đội kèm thẻ → VS, sân, chỉ số chồng trong 1 nhịp',
        build(stage, tl) {
          const m = mock(stage);
          tl.anim(m.bgL, [{ transform: 'translateX(-100%)' }, { transform: 'none' }], { dur: 0.2, ease: 'steps(3)' });
          tl.anim(m.bgR, [{ transform: 'translateX(100%)' }, { transform: 'none' }], { dur: 0.2, ease: 'steps(3)' });
          tl.anim(m.top, kfDrop, { dur: 0.2, ease: 'steps(3)' });
          tl.anim(m.sideL, kfFromL(20), { at: 0.05, dur: 0.25, ease: 'steps(4)' });
          tl.anim(m.sideR, kfFromR(20), { at: 0.05, dur: 0.25, ease: 'steps(4)' });
          tl.anim(m.vs, kfVs, { at: 0.15, dur: 0.35, ease: 'steps(6)' });
          tl.anim(m.pitch, kfFade, { at: 0.2, dur: 0.2, ease: 'steps(3)' });
          tl.anim(m.venue, kfFade, { at: 0.2, dur: 0.2, ease: 'steps(3)' });
          tl.tick(pitch(m.cv, () => 0.2, 0.3));
          m.rows.forEach((r) => tl.anim(r, kfFade, { at: 0.2, dur: 0.15, ease: 'steps(3)' }));
          bars(tl, m, () => 0.2, 0.3, 'steps(6)');
          common(tl, m);
        },
      },
      {
        tag: 'Option B', title: '2 nhịp gom', cta: 'Bỏ qua intro', total: 6.55, ctaAt: 0.9,
        line: 'Hiện đủ lúc <b>0.9s</b> · đội + VS, rồi cả 6 thẻ cùng lúc + sân + chỉ số · bấm sớm = hiện đủ',
        tap: (ct) => (ct < 0.9 ? { jump: 0.9, lock: true } : { fire: true }),
        state: (ct) => (ct < 0.9 ? ['bấm = hiện đủ', 'skip'] : ['bấm = đóng intro', 'on']),
        build(stage, tl) {
          const m = mock(stage);
          tl.anim(m.bgL, [{ transform: 'translateX(-100%)' }, { transform: 'none' }], { dur: 0.3, ease: 'steps(4)' });
          tl.anim(m.bgR, [{ transform: 'translateX(100%)' }, { transform: 'none' }], { dur: 0.3, ease: 'steps(4)' });
          tl.anim(m.top, kfDrop, { dur: 0.25, ease: 'steps(4)' });
          tl.anim(m.sideL, kfFromL(30), { at: 0.1, dur: 0.3, ease: 'steps(5)' });
          tl.anim(m.sideR, kfFromR(30), { at: 0.1, dur: 0.3, ease: 'steps(5)' });
          tl.anim(m.vs, kfVs, { at: 0.25, dur: 0.35, ease: 'steps(6)' });
          for (let i = 0; i < 3; i++) for (const t of [0, 1]) tl.anim(m.card(t, i), t ? kfCardR : kfCardL, { at: 0.45, dur: 0.25, ease: 'steps(4)' });
          tl.anim(m.pitch, kfFade, { at: 0.5, dur: 0.25, ease: 'steps(3)' });
          tl.anim(m.venue, kfFade, { at: 0.5, dur: 0.25, ease: 'steps(3)' });
          tl.tick(pitch(m.cv, () => 0.5, 0.3));
          m.rows.forEach((r) => tl.anim(r, kfFade, { at: 0.6, dur: 0.15, ease: 'steps(3)' }));
          bars(tl, m, () => 0.6, 0.3, 'steps(6)');
          common(tl, m);
        },
      },
    ],
  });
})();
