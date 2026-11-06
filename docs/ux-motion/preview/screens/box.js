/* Kết quả mở hộp (SHOP › OPEN BOX) — src/ui/gacha.js tick / revealHtml, CSS .reveal (rvIn 0.35s steps(4)) */
(function () {
  'use strict';
  const C01 = MP.clamp01;
  const RC = { common: '#b0c3d9', rare: '#4b69ff', epic: '#8847ff', legendary: '#eb4b4b', mythic: '#e4ae39' };
  const PATTERN = ['common', 'common', 'rare', 'common', 'epic', 'common', 'rare', 'common', 'common', 'legendary', 'common', 'rare'];
  const WIN = 40, STEP = 56, CARD = 52, REEL_W = 560, DUR = 4.8;
  const DIST = WIN * STEP + CARD / 2 - REEL_W / 2;   // gacha.js openBox (bỏ phần lệch ngẫu nhiên để 2 cột dừng y hệt)
  const strip = Array.from({ length: 46 }, (x, i) => (i === WIN ? 'epic' : PATTERN[i % PATTERN.length]));

  function mock(stage) {
    stage.appendChild(MP.html(`<div class="x-bg"></div>
      <div class="g x-head"><b>OPEN BOX</b><span><i></i>Street Box</span></div>
      <span class="g-btn x-back">◀ BACK</span>
      <div class="g x-reel" style="--rc:${RC.epic}"><div class="x-strip">${strip.map((r, i) => `<i style="--rc:${RC[r]}">${i === WIN ? '<b class="x-flash"></b>' : ''}</i>`).join('')}</div></div>
      <i class="g x-mark"></i>
      <div class="g x-wait"><span>Spinning...</span><span class="g-btn" style="position:relative">Enter skip</span></div>
      <div class="g x-rev" style="--rc:${RC.epic}"><div class="x-art"><s></s></div><div class="x-info">
        <div class="x-rar">EPIC</div><div class="x-name">Neon Headband</div><div class="x-sub">Head · in inventory ×1</div>
        <div class="x-acts"><span class="g-btn main"><kbd>Enter</kbd>OPEN ANOTHER ● 120</span><span class="g-btn"><kbd>E</kbd>EQUIP</span><span class="g-btn"><kbd>X</kbd>DISMANTLE +15</span></div></div></div>
      <div class="g x-hint">Enter open another · E equip · X dismantle · Esc back to Shop</div>`));
    const q = (s) => stage.querySelector(s);
    return { reel: q('.x-reel'), strip: q('.x-strip'), flash: q('.x-flash'), wait: q('.x-wait'), rev: q('.x-rev'), art: q('.x-art'),
      rar: q('.x-rar'), name: q('.x-name'), sub: q('.x-sub'), acts: q('.x-acts') };
  }
  // dải quay: e = 1 - (1 - k)^4 theo thời gian thật (gacha.js tick), dừng ở DUR -> o.done
  function reel(m) {
    return (t) => {
      const k = C01(t / DUR), e = 1 - Math.pow(1 - k, 4);
      m.strip.style.transform = `translateX(${-(DIST * e).toFixed(1)}px)`;
      const done = t >= DUR;
      m.reel.classList.toggle('done', done);
      m.wait.style.display = done ? 'none' : 'flex';
      m.rev.style.display = done ? 'flex' : 'none';
    };
  }

  MP.screen({
    id: 'box', short: 'Mở hộp', name: 'Kết quả mở hộp', sub: 'SHOP › OPEN BOX', prio: 'High', group: 'vào ít · cảm xúc cao', effort: 'S',
    problem: 'Kết quả bật 1 khối 0.35s (độ hiếm, tên, nút cùng lúc). Enter lúc quay = tua, Enter ngay sau đó = OPEN ANOTHER: trừ gold, quay hộp mới. Phím E / X và tin nhắn tự ẩn 3.5s vẽ lại → khối kết quả bật lại.',
    fix: 'Giữ dải quay 4.8s; khi dừng: loé ô trúng → hình → độ hiếm + tên → nút (≈1.0s). OPEN ANOTHER chỉ nhận Enter sau 5.95s, hoặc 0.3s sau khi tua. E / X sửa tại chỗ, không vẽ lại khối.',
    css: `
  .x-bg { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(10,11,14,0.92), rgba(10,11,14,0.86)), #1d2a22; }
  .x-head { left: 20px; top: 12px; display: flex; align-items: flex-end; gap: 10px; }
  .x-head b { font: 12px/1 var(--f-px); color: #fff; font-weight: 400; }
  .x-head span { display: flex; align-items: flex-end; gap: 6px; font-size: 16px; color: #fff; }
  .x-head span i { width: 22px; height: 18px; background: #ffb02e; border: 1px solid #121316; }
  .x-back { right: 20px; top: 10px; }
  .x-reel { left: 40px; top: 52px; width: 560px; height: 70px; overflow: hidden; background: #121316; border: 1px solid #323742;
    border-top: 2px solid #8a6d3b; border-bottom: 2px solid #8a6d3b; box-shadow: inset 0 0 18px rgba(0,0,0,0.8), 2px 2px 0 #121316;
    -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 70px, #000 490px, transparent 560px); mask-image: linear-gradient(90deg, transparent 0, #000 70px, #000 490px, transparent 560px); }
  .x-reel.done { border-color: var(--rc); box-shadow: inset 0 0 18px rgba(0,0,0,0.8), 0 0 12px color-mix(in srgb, var(--rc) 60%, transparent), 2px 2px 0 #121316; }
  .x-strip { position: absolute; left: 0; top: 7px; display: flex; gap: 4px; will-change: transform; }
  .x-strip i { position: relative; flex: none; width: 52px; height: 54px; background: linear-gradient(180deg, #1a1c22 35%, color-mix(in srgb, var(--rc) 35%, #1a1c22));
    border: 1px solid #323742; border-bottom: 4px solid var(--rc); }
  .x-strip i::before { content: ""; position: absolute; left: 13px; top: 9px; width: 24px; height: 24px; background: color-mix(in srgb, var(--rc) 50%, #2f3542); }
  .x-flash { position: absolute; inset: 0; background: #fff; opacity: 0; }
  .x-mark { left: 319px; top: 47px; width: 2px; height: 80px; background: var(--gold); box-shadow: 0 0 6px var(--gold); }
  .x-wait { left: 110px; top: 136px; width: 420px; height: 50px; display: flex; align-items: center; justify-content: space-between; padding: 6px 16px;
    border: 1px solid #323742; font-size: 15px; color: var(--muted); }
  .x-rev { left: 110px; top: 136px; width: 420px; height: 104px; display: flex; align-items: center; gap: 12px; padding: 6px 16px 6px 8px;
    background: rgba(18,20,24,0.9); border: 1px solid var(--rc); box-shadow: 0 0 0 1px color-mix(in srgb, var(--rc) 35%, transparent), 3px 3px 0 #121316; }
  .x-art { width: 84px; height: 88px; display: flex; align-items: center; justify-content: center; background: radial-gradient(ellipse at 50% 80%, color-mix(in srgb, var(--rc) 45%, transparent), transparent 65%); }
  .x-art s { width: 46px; height: 70px; background: #2f3542; border: 1px solid #4a5163; }
  .x-info { display: flex; flex-direction: column; gap: 3px; }
  .x-rar { font-size: 14px; letter-spacing: 2px; color: var(--rc); text-shadow: 1px 1px 0 #121316; }
  .x-name { font-size: 26px; line-height: 1; color: #fff; letter-spacing: 1px; text-shadow: 2px 2px 0 #121316; transform-origin: left center; }
  .x-sub { font-size: 13px; color: var(--muted); }
  .x-acts { display: flex; gap: 8px; margin-top: 3px; }
  .x-acts .g-btn { position: relative; }
  .x-acts kbd { font: inherit; padding: 0 2px; border: 1px solid currentColor; margin-right: 3px; }
  .x-hint { left: 0; top: 338px; width: 640px; text-align: center; font-size: 12px; color: var(--muted); }`,
    cols: [
      {
        tag: 'Before', title: 'Code hiện tại', cta: 'OPEN ANOTHER → trừ 120 gold, quay hộp mới', total: 5.15, ctaAt: DUR,
        line: '<b>5.15s</b> · quay 4.8s rồi cả khối bật 0.35s; OPEN ANOTHER nhận Enter ngay khi dải dừng',
        // Enter lúc quay: dời t0 -> dừng ngay, khối kết quả bật từ lúc đó · sau khi dừng: OPEN ANOTHER
        tap: (ct) => (ct < DUR ? { jump: DUR, msg: 'tua: dừng dải quay' } : { fire: true }),
        state: (ct) => (ct < DUR ? ['bấm = tua', 'skip'] : ['nhận phím: OPEN ANOTHER', 'on']),
        build(stage, tl) {
          const m = mock(stage);
          tl.tick(reel(m));
          tl.anim(m.rev, [{ transform: 'scale(0.7)', opacity: 0 }, { transform: 'none', opacity: 1 }], { at: DUR, dur: 0.35, ease: 'steps(4)' });
        },
      },
      {
        tag: 'After', title: 'Stagger kết quả + khoá mua', cta: 'OPEN ANOTHER → trừ 120 gold, quay hộp mới', total: 5.8, ctaAt: 5.95, skipTo: 5.8,
        line: '<b>5.8s</b> · quay giữ nguyên → loé ô trúng → hình → độ hiếm + tên → nút; mua tiếp chỉ nhận sau 5.95s',
        build(stage, tl) {
          const m = mock(stage);
          tl.tick(reel(m));
          tl.anim(m.flash, [{ opacity: 0.9 }, { opacity: 0 }], { at: DUR, dur: 0.2, ease: 'steps(2)', fill: 'forwards' });
          tl.anim(m.rev, [{ transform: 'scale(0.9)', opacity: 0 }, { transform: 'none', opacity: 1 }], { at: 4.85, dur: 0.25, ease: 'steps(3)' });
          tl.anim(m.art, [{ transform: 'scale(0.7)', opacity: 0 }, { transform: 'none', opacity: 1 }], { at: 4.95, dur: 0.35, ease: 'steps(4)' });
          tl.anim(m.rar, [{ opacity: 0 }, { opacity: 1 }], { at: 5.25, dur: 0.15, ease: 'steps(2)' });
          tl.anim(m.name, [{ transform: 'scale(1.4)', opacity: 0 }, { transform: 'none', opacity: 1 }], { at: 5.25, dur: 0.3, ease: 'steps(3)' });
          tl.anim(m.sub, [{ opacity: 0 }, { opacity: 1 }], { at: 5.55, dur: 0.25, ease: 'steps(3)' });
          tl.anim(m.acts, [{ opacity: 0 }, { opacity: 1 }], { at: 5.55, dur: 0.25, ease: 'steps(3)' });
        },
      },
    ],
  });
})();
