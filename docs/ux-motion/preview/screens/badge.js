/* Chọn BADGE (Elite / Boss / Skill game) — src/ui/runmap.js offerCard, act -> fly */
(function () {
  'use strict';
  // BADGE thật trong config/run.config.js (tên · mô tả · màu độ hiếm progression.rarities)
  const BADGES = [['Scouting Report', 'Every Core pick shows one more card.', '#4b69ff'], ['VAR Monitor', 'The first goal you concede each match may get ruled out.', '#eb4b4b'], ['Referee\'s Coin', 'One more reroll on every Core pick.', '#b0c3d9']];

  function mock(stage) {
    stage.appendChild(MP.html(`
      <div class="g-map"><i style="left:60px;top:150px"></i><i style="left:200px;top:90px"></i><i style="left:200px;top:220px"></i><i style="left:340px;top:150px"></i></div>
      <div class="g-veil b-veil"></div>
      <div class="g b-title">PICK A BADGE</div>
      <div class="g b-sub">THE WHOLE TEAM GETS IT</div>
      <div class="g b-row">${BADGES.map(([n, d, rc], i) => `<div class="b-card ${i ? '' : 'sel'}" data-card="${i}" style="--rc:${rc}"><i class="b-patch"></i><b>${n}</b><p>${d}</p></div>`).join('')}</div>
      <div class="g b-team"><em>TEAM BADGES</em><s class="on"></s><s class="on"></s>${'<s></s>'.repeat(8)}</div>
      <div class="g b-foot"><span class="g-btn">SKIP</span></div>`));
    const q = (s) => stage.querySelector(s), qa = (s) => [...stage.querySelectorAll(s)];
    return { veil: q('.b-veil'), title: q('.b-title'), sub: q('.b-sub'), cards: qa('[data-card]'), team: q('.b-team'), foot: q('.b-foot') };
  }

  MP.screen({
    id: 'badge', short: 'Chọn BADGE', name: 'Chọn BADGE', sub: 'sau Elite / Boss / Skill game', prio: 'High', group: 'vào ít · cảm xúc cao', effort: 'M',
    pre: 0.5, preLabel: 'MÀN KẾT QUẢ (ELITE / BOSS)<br>(vừa bấm CONTINUE)',
    problem: 'BADGE là đồ của cả đội cho cả run, nhưng thẻ hiện tức thì, chọn sẵn thẻ 1 và Enter lấy ngay (rồi diễn BADGE bay 0.9s): bấm liên tay là lấy mù.',
    fix: 'Stagger 1.5s: lớp che → tiêu đề → 3 miếng vá lật lần lượt (như lá Core) → hàng BADGE đội → SKIP; bấm giữa chừng = hiện đủ (không chọn), khoá 0.3s.',
    css: `
  .b-veil { background: rgba(7, 5, 10, 0.86); }
  .b-title { left: 0; top: 16px; width: 640px; text-align: center; font: 14px/1 var(--f-px); color: #fff; text-shadow: 3px 3px 0 #121316; }
  .b-sub { left: 0; top: 38px; width: 640px; text-align: center; font: 7px/1 var(--f-px); color: var(--gold); letter-spacing: 2px; }
  .b-row { left: 85px; top: 56px; width: 470px; height: 168px; display: flex; gap: 10px; perspective: 600px; }
  .b-card { position: relative; flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px 8px; text-align: center;
    background: rgba(18,20,24,0.9); border: 1px solid var(--rc); box-shadow: 2px 2px 0 #121316; }
  .b-card.sel { border-color: var(--gold); box-shadow: 0 0 0 1px var(--gold), 2px 2px 0 #121316; transform: translateY(-4px); }
  .b-patch { width: 62px; height: 62px; border-radius: 50%; border: 3px solid var(--rc); background: radial-gradient(circle, color-mix(in srgb, var(--rc) 40%, #1a1c22), #1a1c22 70%);
    box-shadow: 0 0 0 2px #121316; }
  .b-card b { font: 8px/1.3 var(--f-px); color: #fff; font-weight: 400; }
  .b-card p { margin: 0; font-size: 12px; line-height: 1.05; color: #c7ccd6; }
  .b-team { left: 120px; top: 240px; width: 400px; height: 26px; display: flex; align-items: center; gap: 4px; }
  .b-team em { font: 6px/1 var(--f-px); color: var(--muted); font-style: normal; margin-right: 6px; letter-spacing: 1px; }
  .b-team s { width: 20px; height: 20px; border-radius: 50%; border: 1px dashed rgba(255,255,255,0.35); }
  .b-team s.on { border: 2px solid #4b69ff; background: #1d2a3a; }
  .b-foot { left: 0; top: 300px; width: 640px; height: 30px; }
  .b-foot .g-btn { left: 298px; top: 0; }`,
    cols: [
      {
        tag: 'Before', title: 'Code hiện tại', cta: 'PICK: Scouting Report (chưa kịp nhìn)', total: 0, ctaAt: 0,
        line: '<b>0s</b> · hiện tức thì, chọn sẵn BADGE 1, Enter nhận ngay',
        build(stage) { mock(stage); },
      },
      {
        tag: 'After', title: 'Stagger đủ + bấm để hiện đủ', cta: 'PICK: BADGE đang chọn', total: 1.5, ctaAt: 1.5, skipTo: 1.5,
        line: '<b>1.5s</b> · tiêu đề → 3 miếng vá lật lần lượt → hàng BADGE đội → SKIP; bấm sớm = hiện đủ',
        build(stage, tl) {
          const m = mock(stage);
          tl.anim(m.veil, [{ opacity: 0 }, { opacity: 1 }], { dur: 0.2, ease: 'steps(3)' });
          tl.anim(m.title, [{ opacity: 0, transform: 'scale(1.6)' }, { opacity: 1, transform: 'none' }], { at: 0.1, dur: 0.35, ease: 'steps(4)' });
          tl.anim(m.sub, [{ opacity: 0 }, { opacity: 1 }], { at: 0.35, dur: 0.2, ease: 'steps(3)' });
          // lật như lá Core trong trận (cardFlipIn: rotateY 90 -> -6 -> 0), giữ translateY(-4px) của thẻ đang chọn
          m.cards.forEach((c, i) => {
            const base = i ? '' : ' translateY(-4px)';
            tl.anim(c, [{ opacity: 0, transform: 'rotateY(90deg)' + base }, { offset: 0.75, opacity: 1, transform: 'rotateY(-6deg)' + base }, { opacity: 1, transform: 'rotateY(0deg)' + base }],
              { at: 0.55 + i * 0.15, dur: 0.35, ease: 'cubic-bezier(0.18, 0.85, 0.32, 1.1)' });
          });
          tl.anim(m.team, [{ opacity: 0 }, { opacity: 1 }], { at: 1.2, dur: 0.2, ease: 'steps(3)' });
          tl.anim(m.foot, [{ opacity: 0 }, { opacity: 1 }], { at: 1.35, dur: 0.15, ease: 'steps(3)' });
        },
      },
    ],
  });
})();
