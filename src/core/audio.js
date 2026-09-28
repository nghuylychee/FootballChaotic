/* Âm thanh chiptune tổng hợp bằng WebAudio — không cần file asset */
window.SFC = window.SFC || {};

(function () {
  let ctx = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = SFC_CONFIG.game.audio.volume;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function enabled() {
    return SFC_CONFIG.game.audio.enabled && !muted && ensure();
  }

  function tone({ freq = 440, to = null, dur = 0.1, type = 'square', vol = 0.25, delay = 0 }) {
    if (!enabled()) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function noise({ dur = 0.15, vol = 0.25, freq = 1200, q = 1, delay = 0 }) {
    if (!enabled()) return;
    const t = ctx.currentTime + delay;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t);
  }

  /* ---------- khán giả: tiếng rì rầm nền (vòng lặp) + hò reo / "ồồ" / vỗ tay theo sự kiện ---------- */
  const CC = () => SFC_CONFIG.game.audio.crowd || {};
  const crowd = { gain: null, lfoGain: null, level: 0 };

  // tiếng ồn "nâu" (trầm, êm hơn ồn trắng) — nền cho tiếng đám đông
  function brownBuffer(sec) {
    const len = Math.floor(ctx.sampleRate * sec), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    return buf;
  }

  function crowdStart() {
    if (crowd.gain) return;
    const g = ctx.createGain(); g.gain.value = 0; g.connect(master);
    // 2 lớp: tiếng ù đám đông (dải trầm) + tiếng nói lao xao (dải cao hơn, nhấp nhô nhanh hơn)
    const layers = [[520, 0.55, 0.19], [1150, 1.4, 0.63]];
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 0; lfoGain.connect(g.gain);
    for (const [freq, q, rate] of layers) {
      const src = ctx.createBufferSource(); src.buffer = brownBuffer(4); src.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = q;
      src.connect(bp); bp.connect(g);
      src.start(ctx.currentTime + Math.random());
      const lfo = ctx.createOscillator(); lfo.frequency.value = rate; lfo.connect(lfoGain); lfo.start();
    }
    crowd.gain = g; crowd.lfoGain = lfoGain;
  }

  // 1 tiếng đám đông: ồn lọc dải, tần số trượt from -> to, âm lượng lên đỉnh ở `peakAt` giây rồi tắt dần hết `dur` giây
  function crowdShot({ dur, peak, peakAt, from, to, q = 0.7, hold = 0, clap = false }) {
    if (!enabled() || peak <= 0) return;
    const t = ctx.currentTime, len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    if (clap) {
      // vỗ tay: rất nhiều tiếng "bép" ngắn chồng lên nhau
      for (let i = 0; i < len; i++) d[i] = 0;
      const claps = Math.floor(dur * 220);
      for (let k = 0; k < claps; k++) {
        const s0 = Math.floor(Math.random() * len), cl = Math.floor(ctx.sampleRate * 0.012);
        for (let i = 0; i < cl && s0 + i < len; i++) d[s0 + i] += (Math.random() * 2 - 1) * (1 - i / cl) * 0.5;
      }
    } else for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = clap ? 'highpass' : 'bandpass'; f.Q.value = q;
    f.frequency.setValueAtTime(from, t); f.frequency.linearRampToValueAtTime(to, t + peakAt + hold);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + peakAt);
    g.gain.setValueAtTime(peak, t + peakAt + hold);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t);
  }

  SFC.Audio = {
    unlock: ensure,
    toggleMute() { muted = !muted; this.crowdLevel(crowd.level, true); return muted; },

    // độ ồn nền của khán giả (0 = không có khán giả); gọi mỗi khung hình (render/crowd.js)
    crowdLevel(level, force = false) {
      const C = CC();
      if (!C.enabled || !SFC_CONFIG.game.audio.enabled) level = 0;
      if (level === crowd.level && !force) return;
      crowd.level = level;
      if (!ctx && level <= 0) return;
      if (!ensure()) return;
      if (level > 0) crowdStart();
      if (!crowd.gain) return;
      const v = muted ? 0 : level * (C.volume || 0.35);
      crowd.gain.gain.setTargetAtTime(v, ctx.currentTime, 0.35);
      crowd.lfoGain.gain.setTargetAtTime(v * (C.murmur || 0) * 0.5, ctx.currentTime, 0.35);
    },
    // bàn thắng: hò reo vỡ sân (âm lượng theo độ ồn của sân)
    crowdRoar(level) {
      const p = level * (CC().goal || 1) * 0.55;
      crowdShot({ dur: 3.4, peak: p, peakAt: 0.25, hold: 1.1, from: 600, to: 1050, q: 0.6 });
      crowdShot({ dur: 2.8, peak: p * 0.6, peakAt: 0.3, hold: 0.8, from: 1400, to: 2100, q: 1.2 });
    },
    // cứu thua / dội cột: "ồồ"
    crowdOoh() {
      const p = crowd.level * (CC().ooh || 0.6) * 0.45;
      crowdShot({ dur: 1.3, peak: p, peakAt: 0.35, from: 380, to: 620, q: 3 });
      crowdShot({ dur: 1.1, peak: p * 0.5, peakAt: 0.3, from: 760, to: 1100, q: 3 });
    },
    // hết trận: vỗ tay + hò reo nhẹ
    crowdApplause(level) {
      const p = level * (CC().applause || 0.8);
      crowdShot({ dur: 3.2, peak: p * 0.5, peakAt: 0.3, hold: 1.2, from: 1800, to: 2200, clap: true });
      crowdShot({ dur: 2.6, peak: p * 0.25, peakAt: 0.4, hold: 0.6, from: 700, to: 900, q: 0.6 });
    },
    get muted() { return muted; },

    touch()   { tone({ freq: 220, to: 160, dur: 0.05, type: 'triangle', vol: 0.15 }); },
    pass()    { noise({ dur: 0.06, vol: 0.25, freq: 900 }); tone({ freq: 330, to: 250, dur: 0.06, type: 'triangle', vol: 0.15 }); },
    kick(p)   { noise({ dur: 0.12, vol: 0.35 + p * 0.2, freq: 600 }); tone({ freq: 160, to: 60, dur: 0.15, type: 'square', vol: 0.2 }); },
    wall()    { tone({ freq: 120, to: 80, dur: 0.06, type: 'square', vol: 0.12 }); },
    // bóng chạm cột dọc / xà ngang: tiếng kim loại "keng" (các tần số lệch nhau ngân ngắn + tiếng gõ)
    clang()   {
      noise({ dur: 0.05, vol: 0.22, freq: 3200, q: 2 });
      tone({ freq: 1320, to: 1260, dur: 0.45, type: 'triangle', vol: 0.2 });
      tone({ freq: 1985, to: 1940, dur: 0.32, type: 'triangle', vol: 0.12 });
      tone({ freq: 2790, dur: 0.22, type: 'square', vol: 0.04 });
      this.crowdOoh();
    },
    hit()     { noise({ dur: 0.15, vol: 0.35, freq: 300 }); tone({ freq: 90, to: 40, dur: 0.18, type: 'sawtooth', vol: 0.18 }); },
    whoosh()  { noise({ dur: 0.18, vol: 0.18, freq: 2200, q: 0.6 }); },
    tackle()  { noise({ dur: 0.08, vol: 0.3, freq: 500 }); },
    block()   { tone({ freq: 880, to: 1320, dur: 0.12, type: 'square', vol: 0.15 }); },
    zap()     { tone({ freq: 1400, to: 200, dur: 0.18, type: 'sawtooth', vol: 0.15 }); },
    fire()    { noise({ dur: 0.3, vol: 0.2, freq: 400, q: 0.4 }); },
    save()    { tone({ freq: 440, to: 660, dur: 0.1, type: 'triangle', vol: 0.2 }); this.crowdOoh(); },
    // Đọc Cú Sút: g = 0 PERFECT · 1 GREAT · 2 GOOD (càng chuẩn càng cao, càng nhiều nốt)
    read(g = 2) {
      const notes = [[784, 1175, 1568], [659, 988], [587]][g] || [587];
      notes.forEach((f, i) => tone({ freq: f, dur: 0.09, type: 'square', vol: 0.12, delay: i * 0.05 }));
      if (g === 0) noise({ dur: 0.25, vol: 0.08, freq: 3000, q: 0.5 });
    },
    pick()    { tone({ freq: 523, dur: 0.08, vol: 0.18 }); tone({ freq: 784, dur: 0.12, vol: 0.18, delay: 0.08 }); },
    whistle(long) {
      tone({ freq: 2100, dur: long ? 0.5 : 0.25, type: 'sine', vol: 0.18 });
      if (long) tone({ freq: 2100, dur: 0.7, type: 'sine', vol: 0.18, delay: 0.6 });
    },
    goal() {
      [523, 659, 784, 1046].forEach((f, i) => tone({ freq: f, dur: 0.18, vol: 0.2, delay: i * 0.1 }));
      noise({ dur: 1.2, vol: 0.12, freq: 1500, q: 0.3, delay: 0.1 });
    },
    upgrade() { [392, 523, 659].forEach((f, i) => tone({ freq: f, dur: 0.12, type: 'triangle', vol: 0.2, delay: i * 0.07 })); },
    menu()    { tone({ freq: 660, dur: 0.04, vol: 0.12 }); },
    // gacha: tiếng "tách" khi dải quay chạy qua mỗi ô · nhạc lộ đồ (r = bậc hiếm 0..4) · phân rã
    tick()    { tone({ freq: 1900, dur: 0.018, type: 'square', vol: 0.05 }); },
    reveal(r = 0) {
      [523, 659, 784, 1046, 1318, 1568].slice(0, 2 + r).forEach((f, i) => tone({ freq: f, dur: 0.14, type: 'triangle', vol: 0.18, delay: i * 0.08 }));
      if (r >= 3) noise({ dur: 0.9, vol: 0.1, freq: 2400, q: 0.4, delay: 0.1 });
    },
    dismantle() { noise({ dur: 0.12, vol: 0.2, freq: 1200 }); tone({ freq: 880, to: 1760, dur: 0.12, type: 'square', vol: 0.1, delay: 0.05 }); },
  };
})();
