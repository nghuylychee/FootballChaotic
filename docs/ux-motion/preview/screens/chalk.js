/* Khoanh phấn node trên map — src/ui/runmap.js chalk / chalkRing (vào node sau dur + 0.25s), CSS .rm-ring.draw, .rm-chalk .dust */
(function () {
  'use strict';
  const NX = 330, NY = 150, R = 23;   // node đang chọn (tâm) · bán kính vòng = 14 + 9
  // vòng phấn: đường tròn lệch vài px (chalkPath của game cũng nhiễu bán kính theo seed)
  const ring = (x, y, r) => 'M' + Array.from({ length: 25 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2 - Math.PI / 2, rr = r + Math.sin(i * 2.3) * 1.4;
    return `${(x + Math.cos(a) * rr).toFixed(1)} ${(y + Math.sin(a) * rr).toFixed(1)}`;
  }).join(' L');
  function mock(stage) {
    stage.appendChild(MP.html(`
      <div class="c-map"></div>
      ${[[90, 180], [210, 110], [210, 240], [330, 230]].map(([x, y]) => `<i class="c-node" style="left:${x}px;top:${y}px"></i>`).join('')}
      <i class="c-node avail sel" style="left:${NX}px;top:${NY}px"></i>
      <svg class="c-svg" width="640" height="360"><defs><filter id="cChalk" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3" result="n"/>
        <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G"/></filter></defs>
        <path class="c-main" pathLength="1" d="${ring(NX, NY, R)}"/><path class="c-thin" pathLength="1" d="${ring(NX + 1.5, NY - 1, R - 2)}"/>
        ${[0, 1, 2, 3, 4].map((i) => `<rect class="c-dust" x="${NX + 20 + i * 3 - 6}" y="${NY - 24 + (i % 2) * 3}" width="2" height="2"/>`).join('')}</svg>
      <div class="g c-next">→ vào node (intro trận)</div>`));
    const q = (s) => stage.querySelector(s);
    return { main: q('.c-main'), thin: q('.c-thin'), dust: [...stage.querySelectorAll('.c-dust')], next: q('.c-next') };
  }
  const kfDraw = [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }];   // rmChalk
  const kfDust = [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(8px)' }];   // rmDust
  function draw(tl, m, dur, dust, done) {
    tl.anim(m.main, kfDraw, { dur, ease: 'cubic-bezier(0.4, 0.1, 0.5, 1)', fill: 'forwards' });
    tl.anim(m.thin, kfDraw, { at: 0.04, dur, ease: 'cubic-bezier(0.4, 0.1, 0.5, 1)', fill: 'forwards' });
    if (dust) m.dust.forEach((d, i) => tl.anim(d, kfDust, { at: dur + i * 0.03, dur: 0.4, ease: 'steps(4)', fill: 'forwards' }));
    tl.tick((t) => { m.next.style.display = t >= done ? 'flex' : 'none'; });
  }

  MP.screen({
    id: 'chalk', short: 'Khoanh phấn', name: 'Khoanh phấn node', sub: 'mỗi lần chọn node trên map', prio: 'Low', group: 'vào nhiều · cảm xúc thấp', effort: 'S',
    problem: 'Mỗi node (≈8 lần mỗi act): nét phấn 0.45s + bụi tới 0.97s, khoá mọi phím 0.7s, không bỏ qua được; bụi bị cắt khi màn đổi ở 0.7s.',
    fix: 'A: giữ nét phấn, Enter lần 2 = vào node ngay. B: rút còn 0.35s (nét 0.3s, bỏ bụi).',
    css: `
  .c-map { position: absolute; inset: 0; background: #1d2a22; }
  .c-map::after { content: ""; position: absolute; left: 30px; right: 30px; top: 30px; bottom: 30px; border: 1px solid rgba(236,228,200,0.35); }
  .c-node { position: absolute; width: 28px; height: 28px; margin: -14px 0 0 -14px; border-radius: 50%; background: #3a404d; border: 2px solid #8a8f9c; box-shadow: 2px 3px 0 rgba(0,0,0,0.5); }
  .c-node.avail { border-color: var(--gold); }
  .c-node.sel { transform: scale(1.2); background: #3a3310; border-color: #fff; box-shadow: 0 0 0 2px var(--gold), 0 0 0 3px #121316, 2px 3px 0 rgba(0,0,0,0.5); }
  .c-svg { position: absolute; left: 0; top: 0; overflow: visible; }
  .c-svg path { fill: none; stroke: rgba(255,255,255,0.88); stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; filter: url(#cChalk); stroke-dasharray: 1 1; stroke-dashoffset: 1; }
  .c-svg path.c-thin { stroke: rgba(255,255,255,0.45); stroke-width: 1.6; }
  .c-dust { fill: rgba(255,255,255,0.7); opacity: 0; }
  .c-next { inset: 0; display: none; align-items: center; justify-content: center; background: #0a0b0e; font: 11px/1 var(--f-px); color: #e6dccb; }`,
    cols: [
      {
        tag: 'Before', title: 'Code hiện tại', cta: '', total: 1.0, ctaAt: Infinity,
        tap: (ct) => (ct < 0.7 ? { ignore: 'khoá (đang khoanh)' } : { ignore: 'đã vào node' }),
        state: (ct) => (ct < 0.7 ? ['khoá 0.7s', 'lock'] : ['đã vào node', 'lock']),
        line: 'Khoá <b>0.7s</b> mỗi node, không bỏ qua; bụi tới 0.97s bị cắt ở 0.7s',
        build(stage, tl) { draw(tl, mock(stage), 0.45, true, 0.7); },
      },
      {
        tag: 'Option A', title: 'Giữ nét, Enter = vào ngay', cta: '', total: 1.0, ctaAt: Infinity,
        tap: (ct) => (ct < 0.7 ? { jump: 0.7, msg: 'vào node ngay' } : { ignore: 'đã vào node' }),
        state: (ct) => (ct < 0.7 ? ['bấm = vào ngay', 'skip'] : ['đã vào node', 'lock']),
        line: 'Vẫn <b>0.7s</b> nếu không bấm; Enter lần 2 = vào node ngay',
        build(stage, tl) { draw(tl, mock(stage), 0.45, true, 0.7); },
      },
      {
        tag: 'Option B', title: 'Rút còn 0.35s', cta: '', total: 0.65, ctaAt: Infinity,
        tap: (ct) => (ct < 0.35 ? { ignore: 'khoá 0.35s' } : { ignore: 'đã vào node' }),
        state: (ct) => (ct < 0.35 ? ['khoá 0.35s', 'lock'] : ['đã vào node', 'lock']),
        line: 'Nét phấn <b>0.3s</b>, không bụi, vào node ở 0.35s',
        build(stage, tl) { draw(tl, mock(stage), 0.3, false, 0.35); },
      },
    ],
  });
})();
