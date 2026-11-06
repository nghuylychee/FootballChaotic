/* Kết quả trận nhịp 2 (REWARDS + bảng tỉ số) — src/ui/endscreen.js playReward / revealScoreboard, CSS .rw-line, #end.rw-focus, #end.sb-shown */
(function () {
  'use strict';
  const C01 = MP.clamp01, OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';
  const DATA = { cash: 32, gold: 35, xp: 80, barFrom: 0.40, barTo: 0.85 };

  function mock(stage) {
    stage.style.background = 'radial-gradient(ellipse at 50% 20%, rgba(24,28,38,0.94), rgba(10,11,14,0.96) 75%), #1d2a22';
    stage.appendChild(MP.html(`
      <div class="g r-head"><div class="r-title">VICTORY!</div>
        <div class="r-score"><span style="color:#4fc3ff">STREET KIDS</span><b>2 - 1</b><span style="color:#ff8a3d">ROOFTOP KINGS</span></div></div>
      <div class="g r-left"><div class="r-box"><h4>REWARDS</h4>
        <div class="r-lines">
          <div class="r-line cash" data-rw="0"><span>Run cash</span><b class="gd">$+32</b></div>
          <div class="r-line" data-rw="1"><span>Victory</span><b class="x">+60 XP</b><b class="gd">+25</b></div>
          <div class="r-line" data-rw="2"><span>Goals ×2</span><b class="x">+20 XP</b><b class="gd">+10</b></div>
        </div>
        <div class="r-total"><span>$<b class="v-cash">+0</b></span><span>● <b class="v-gold">+0</b></span><b class="xp v-xp">+0 XP</b></div>
        <div class="r-lv"><span>LV 7</span><div class="r-bar"><i class="v-bar"></i></div></div>
        <div style="min-height:12px"></div></div></div>
      <div class="g r-sb">
        ${[['STREET KIDS', '#4fc3ff', 2, true], ['ROOFTOP KINGS', '#ff8a3d', 1, false]].map(([n, c, s, w]) => `
        <div class="r-team ${w ? 'win' : ''}" style="--c:${c}"><div class="r-thead"><i></i>${n} ${s}<em>CORES · G · A · S · SH</em></div>
          ${[0, 1, 2].map((k) => `<div class="r-row"><span>${w ? ['YOU', 'Mai', 'Tùng'][k] : ['Bo', 'Kiki', 'Dre'][k]}</span><u><s></s><s></s><s></s></u><b>${k ? 0 : s}</b><b>${k === 1 ? 1 : 0}</b><b>0</b><b>${3 - k}</b></div>`).join('')}
        </div>`).join('')}
      </div>
      <div class="g r-act"><i class="g-cur"></i><span class="g-btn sel">CONTINUE</span></div>
      <div class="g r-skip"><kbd>Enter</kbd> skip</div>`));
    const $ = (s) => stage.querySelector(s);
    return { left: $('.r-left'), box: $('.r-box'), lines: [...stage.querySelectorAll('[data-rw]')], sb: $('.r-sb'), act: $('.r-act'),
      cur: $('.g-cur'), skip: $('.r-skip'), cash: $('.v-cash'), gold: $('.v-gold'), xp: $('.v-xp'), bar: $('.v-bar') };
  }
  // đếm số + thanh XP: easeOut bậc 2 như playReward (e = 1 - (1 - k)^2)
  function counter(m, at, dur) {
    return (t) => {
      const e = MP.easeOut2(C01((t - at) / dur));
      m.cash.textContent = '+' + Math.round(DATA.cash * e);
      m.gold.textContent = '+' + Math.round(DATA.gold * e);
      m.xp.textContent = '+' + Math.round(DATA.xp * e) + ' XP';
      m.bar.style.width = ((DATA.barFrom + (DATA.barTo - DATA.barFrom) * e) * 100).toFixed(1) + '%';
    };
  }

  MP.screen({
    id: 'results', short: 'Kết quả trận', name: 'Kết quả trận', sub: 'nhịp 2: REWARDS', prio: 'High', group: 'vào nhiều · cảm xúc cao', effort: 'M',
    problem: 'Mỗi trận: 4 nhịp lẻ (3 dòng, đếm số, chờ 0.42s, trượt) tới 2.92s. CONTINUE nhận Enter từ 2.39s khi còn tàng hình; cột thưởng trượt ngang 204px đúng lúc nút hiện; dòng LEVEL UP chèn sau còn đẩy nút.',
    fix: 'A: bố cục cuối đứng yên, 1 nhịp 0.5s, Enter từ 0.5s. B: giữ thưởng ở giữa 0.7s rồi trượt, nút + Enter từ 1.0s, bấm sớm = hiện đủ. Cả 2: chừa sẵn chỗ dòng LEVEL UP.',
    note: 'Tính từ lúc vào nhịp 2, sau 3s ăn mừng trên sân. Trận thắng GOAT PATH: 3 dòng thưởng. Code: <b>src/ui/endscreen.js</b> <code>playReward</code>, <code>revealScoreboard</code>.',
    css: `
  .r-head { left: 14px; top: 22px; width: 612px; height: 46px; display: flex; flex-direction: column; align-items: center; gap: 3px; border-bottom: 1px solid #323742; }
  .r-title { font: 32px/0.9 var(--f-vt); letter-spacing: 2px; color: var(--gold); }
  .r-score { font: 16px/1 var(--f-vt); display: flex; gap: 8px; align-items: baseline; }
  .r-score b { font: 11px/1 var(--f-px); color: #fff; }
  .r-left { left: 14px; top: 80px; width: 204px; height: 176px; }
  .r-box { position: absolute; inset: 0; padding: 6px 8px; display: flex; flex-direction: column; gap: 3px; border: 1px solid var(--gold);
    box-shadow: 0 0 0 1px rgba(255,225,79,0.25); background: rgba(18, 20, 24, 0.9); }
  .r-box h4 { margin: 0 0 1px; font: 13px/1 var(--f-vt); color: #fff; letter-spacing: 1px; font-weight: 400; }
  .r-lines { display: flex; flex-direction: column; gap: 2px; flex: 1; }
  .r-line { display: flex; align-items: center; gap: 4px; font-size: 13px; }
  .r-line span { flex: 1; color: #e6dccb; }
  .r-line .x { color: #9dff3d; font-size: 12px; }
  .r-line .gd { color: var(--gold); font-size: 12px; }
  .r-line.cash { margin: 0 -3px; padding: 1px 3px; background: linear-gradient(90deg, rgba(255,225,79,0.16), rgba(255,225,79,0.03)); box-shadow: inset 2px 0 0 var(--gold); }
  .r-total { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #323742; padding-top: 3px; font: 9px/1 var(--f-px); color: var(--gold); }
  .r-total .xp { font: 15px/1 var(--f-vt); color: #9dff3d; }
  .r-lv { display: flex; align-items: center; gap: 6px; font-size: 13px; }
  .r-bar { flex: 1; height: 5px; background: #242730; border: 1px solid #121316; }
  .r-bar i { display: block; height: 100%; background: #9dff3d; }
  .r-sb { left: 226px; top: 80px; width: 400px; height: 176px; display: flex; flex-direction: column; gap: 6px; }
  .r-team { flex: 1; border: 1px solid #323742; background: rgba(18, 20, 24, 0.9); padding: 4px 6px; display: flex; flex-direction: column; gap: 3px; }
  .r-team.win { border-color: var(--gold); }
  .r-thead { display: flex; align-items: center; gap: 6px; font: 9px/1 var(--f-px); color: #fff; }
  .r-thead i { width: 8px; height: 8px; background: var(--c); }
  .r-thead em { margin-left: auto; font: 11px/1 var(--f-vt); color: var(--muted); font-style: normal; letter-spacing: 1px; }
  .r-row { display: grid; grid-template-columns: 110px 1fr repeat(4, 28px); align-items: center; gap: 4px; font-size: 13px; color: #e6dccb; }
  .r-row u { text-decoration: none; display: flex; gap: 2px; }
  .r-row u s { width: 10px; height: 10px; background: #2f3542; border: 1px solid #4a5163; }
  .r-row b { font-weight: 400; text-align: center; }
  .r-act { left: 0; top: 280px; width: 640px; height: 24px; }
  .r-act .g-btn { left: 285px; top: 0; }
  .r-act .g-cur { left: 276px; top: 7px; }
  .r-skip { right: 18px; bottom: 10px; font-size: 12px; padding: 1px 6px 2px; color: #e6dccb; background: rgba(10, 11, 14, 0.82); border: 1px solid #3b4252; }
  .r-skip kbd { font: inherit; padding: 0 3px; border: 1px solid #555; }`,
    cols: [
      {
        tag: 'Before', title: 'Code hiện tại', cta: 'CONTINUE', total: 2.92, ctaAt: 2.39,
        line: '<b>2.92s</b> tới khi nút hiện đủ · 4 nhịp lẻ · CONTINUE nhận Enter từ 2.39s khi còn tàng hình',
        // endInput: đang đếm = tua (rwSkip, bảng hiện sau 60ms) · đếm xong mà còn rw-focus = hiện bảng ngay · sau đó = CONTINUE
        tap: (ct) => (ct < 1.97 ? { jump: 2.33, msg: 'tua: hiện hết số' } : ct < 2.39 ? { jump: 2.39, msg: 'hiện bảng tỉ số' } : { fire: true }),
        state: (ct) => (ct < 1.97 ? ['bấm = tua số', 'skip'] : ct < 2.39 ? ['bấm = hiện bảng', 'skip'] : ['nhận phím: CONTINUE', 'on']),
        build(stage, tl) {
          const m = mock(stage);
          m.lines.forEach((el, i) => tl.anim(el, [{ opacity: 0, transform: 'translateX(-6px)' }, { opacity: 1, transform: 'none' }], { at: 0.25 + i * 0.24, dur: 0.15, ease: 'ease' }));
          tl.tick(counter(m, 0.97, 1.0));
          tl.anim(m.left, [{ transform: 'translateX(204px) scale(1.04)' }, { transform: 'none' }], { at: 2.39, dur: 0.42, ease: OUT });
          tl.anim(m.sb, [{ opacity: 0 }, { opacity: 1 }], { at: 2.55, dur: 0.32, ease: 'ease' });
          tl.anim(m.sb, [{ transform: 'translateX(20px)' }, { transform: 'none' }], { at: 2.55, dur: 0.34, ease: OUT });
          tl.anim(m.act, [{ opacity: 0 }, { opacity: 1 }], { at: 2.67, dur: 0.25, ease: 'ease' });
          tl.tick((t) => { m.skip.style.display = t < 2.39 ? '' : 'none'; });
          MP.bob(tl, m.cur);
        },
      },
      {
        tag: 'Option A', title: 'Pop 1 nhịp', cta: 'CONTINUE', total: 0.45, ctaAt: 0.5,
        line: '<b>0.5s</b> · bố cục cuối đứng yên, thưởng + số + bảng + nút trong 1 nhịp, Enter từ 0.5s',
        build(stage, tl) {
          const m = mock(stage);
          tl.anim(m.box, [{ opacity: 0, transform: 'scale(0.96)' }, { opacity: 1, transform: 'none' }], { dur: 0.2, ease: 'steps(3)' });
          tl.tick(counter(m, 0.1, 0.35));
          tl.anim(m.sb, [{ opacity: 0, transform: 'translateX(8px)' }, { opacity: 1, transform: 'none' }], { at: 0.15, dur: 0.15, ease: 'steps(3)' });
          tl.anim(m.act, [{ opacity: 0 }, { opacity: 1 }], { at: 0.3, dur: 0.15, ease: 'steps(3)' });
          tl.tick(() => { m.skip.style.display = 'none'; });
          MP.bob(tl, m.cur);
        },
      },
      {
        tag: 'Option B', title: 'Giữ khoảnh khắc thưởng', cta: 'CONTINUE', total: 1.0, ctaAt: 1.0, skipTo: 1.0,
        line: '<b>1.0s</b> · thưởng ở giữa 0.7s rồi trượt; nút hiện và nhận Enter khi trượt xong',
        build(stage, tl) {
          const m = mock(stage);
          tl.anim(m.box, [{ opacity: 0, transform: 'scale(0.9)' }, { opacity: 1, transform: 'none' }], { dur: 0.25, ease: 'steps(4)' });
          tl.tick(counter(m, 0.15, 0.5));
          tl.anim(m.left, [{ transform: 'translateX(204px) scale(1.04)' }, { transform: 'none' }], { at: 0.7, dur: 0.3, ease: OUT });
          tl.anim(m.sb, [{ opacity: 0, transform: 'translateX(20px)' }, { opacity: 1, transform: 'none' }], { at: 0.8, dur: 0.2, ease: OUT });
          tl.anim(m.act, [{ opacity: 0 }, { opacity: 1 }], { at: 0.85, dur: 0.15, ease: 'steps(3)' });
          tl.tick(() => { m.skip.style.display = 'none'; });
          MP.bob(tl, m.cur);
        },
      },
    ],
  });
})();
