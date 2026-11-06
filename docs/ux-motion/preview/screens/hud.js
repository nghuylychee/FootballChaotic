/* HUD trong trận: innerHTML vẽ lại mỗi giây làm pulse vô hạn chạy lại — src/ui/hud.js updateHud (key có giây), CSS .hud-core.on, .hud-ult.full.has i */
(function () {
  'use strict';
  function mock(stage) {
    stage.appendChild(MP.html(`
      <div class="h-pitch"></div>
      <div class="g h-hud">STREET KIDS <b>1 - 0</b> ROOFTOP KINGS<em class="h-time">1:12</em></div>
      <div class="g h-zoom"><span class="h-lbl">phóng to ×4</span>
        <div class="h-row"><span>NEXT CORE · pulse 0.8s</span><b class="h-core">⚡ CORE READY</b></div>
        <div class="h-row"><span>ULT FULL · pulse 0.6s</span><b class="h-ult">★</b></div></div>
      <div class="g h-flash">↻ innerHTML</div>`));
    const q = (s) => stage.querySelector(s);
    return { core: q('.h-core'), ult: q('.h-ult'), time: q('.h-time'), flash: q('.h-flash') };
  }
  // @keyframes pulse { 50% { translateY(-1px) } } x4 cho dễ thấy
  const kfPulse = [{ transform: 'translateY(0)' }, { offset: 0.5, transform: 'translateY(-4px)' }, { transform: 'translateY(0)' }];
  const clock = (m) => (t) => { const s = 72 - Math.floor(t); m.time.textContent = `1:${String(s % 60).padStart(2, '0')}`; };

  MP.screen({
    id: 'hud', short: 'HUD', name: 'HUD trong trận', sub: 'pulse bị khởi động lại', prio: 'Low', group: 'vào nhiều · cảm xúc thấp', effort: 'M',
    problem: '<code>updateHud</code> ghi đè <code>innerHTML</code> mỗi khi key đổi, mà key có số giây, nên HUD vẽ lại mỗi giây. Pulse vô hạn 0.8s / 0.6s bị cắt ở mốc 1.0s và chạy lại từ đầu → nhịp nhún giật.',
    fix: 'Sửa chữ tại chỗ (đồng hồ, tỉ số) thay vì ghi đè cả khối, để pulse chạy liền.',
    note: 'Pulse thật chỉ nhún 1px; ở đây phóng to ×4 cho dễ thấy.',
    css: `
  .h-pitch { position: absolute; inset: 0; background: repeating-linear-gradient(90deg, #22331f 0 40px, #1d2a22 40px 80px); }
  .h-hud { left: 200px; top: 6px; width: 240px; height: 22px; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 12px; color: #e6dccb;
    background: rgba(18,20,24,0.9); border: 1px solid #323742; }
  .h-hud b { font: 8px/1 var(--f-px); color: #fff; font-weight: 400; }
  .h-hud em { font: 6px/1 var(--f-px); font-style: normal; color: #fff; }
  .h-zoom { left: 120px; top: 90px; width: 400px; height: 190px; display: flex; flex-direction: column; justify-content: center; gap: 28px; padding: 20px 30px;
    background: rgba(10,11,14,0.85); border: 1px dashed #4a5163; }
  .h-lbl { position: absolute; left: 8px; top: 6px; font-size: 12px; color: var(--muted); }
  .h-row { display: flex; align-items: center; justify-content: space-between; font-size: 14px; color: var(--muted); }
  .h-row b { font: 18px/1 var(--f-px); color: var(--gold); font-weight: 400; text-shadow: 3px 3px 0 #121316; }
  .h-flash { left: 260px; top: 34px; width: 120px; text-align: center; font-size: 13px; color: #ff5a6e; opacity: 0; }`,
    cols: [
      {
        tag: 'Before', title: 'Code hiện tại', cta: '', total: 4.0, ctaAt: Infinity, tap: () => ({ ignore: 'mục này xem nhịp, không bấm' }), state: () => ['—', 'lock'],
        line: 'Pulse chạy lại mỗi <b>1.0s</b> (lúc HUD vẽ lại) → nhịp 0.8s / 0.6s bị cắt, nhún giật',
        build(stage, tl) {
          const m = mock(stage);
          tl.anim(m.core, kfPulse, { dur: 0.8, ease: 'steps(2)', iter: Infinity, period: 1.0 });
          tl.anim(m.ult, kfPulse, { dur: 0.6, ease: 'steps(2)', iter: Infinity, period: 1.0 });
          tl.anim(m.flash, [{ opacity: 1 }, { opacity: 0 }], { dur: 0.3, ease: 'steps(2)', iter: Infinity, period: 1.0, fill: 'none' });
          tl.tick(clock(m));
        },
      },
      {
        tag: 'After', title: 'Sửa chữ tại chỗ', cta: '', total: 4.0, ctaAt: Infinity, tap: () => ({ ignore: 'mục này xem nhịp, không bấm' }), state: () => ['—', 'lock'],
        line: 'Pulse chạy liền <b>0.8s / 0.6s</b>, đồng hồ vẫn đổi mỗi giây',
        build(stage, tl) {
          const m = mock(stage);
          tl.anim(m.core, kfPulse, { dur: 0.8, ease: 'steps(2)', iter: Infinity });
          tl.anim(m.ult, kfPulse, { dur: 0.6, ease: 'steps(2)', iter: Infinity });
          tl.tick(clock(m));
        },
      },
    ],
  });
})();
