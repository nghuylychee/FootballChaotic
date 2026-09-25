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

  SFC.Audio = {
    unlock: ensure,
    toggleMute() { muted = !muted; return muted; },
    get muted() { return muted; },

    touch()   { tone({ freq: 220, to: 160, dur: 0.05, type: 'triangle', vol: 0.15 }); },
    pass()    { noise({ dur: 0.06, vol: 0.25, freq: 900 }); tone({ freq: 330, to: 250, dur: 0.06, type: 'triangle', vol: 0.15 }); },
    kick(p)   { noise({ dur: 0.12, vol: 0.35 + p * 0.2, freq: 600 }); tone({ freq: 160, to: 60, dur: 0.15, type: 'square', vol: 0.2 }); },
    wall()    { tone({ freq: 120, to: 80, dur: 0.06, type: 'square', vol: 0.12 }); },
    hit()     { noise({ dur: 0.15, vol: 0.35, freq: 300 }); tone({ freq: 90, to: 40, dur: 0.18, type: 'sawtooth', vol: 0.18 }); },
    whoosh()  { noise({ dur: 0.18, vol: 0.18, freq: 2200, q: 0.6 }); },
    tackle()  { noise({ dur: 0.08, vol: 0.3, freq: 500 }); },
    block()   { tone({ freq: 880, to: 1320, dur: 0.12, type: 'square', vol: 0.15 }); },
    zap()     { tone({ freq: 1400, to: 200, dur: 0.18, type: 'sawtooth', vol: 0.15 }); },
    fire()    { noise({ dur: 0.3, vol: 0.2, freq: 400, q: 0.4 }); },
    save()    { tone({ freq: 440, to: 660, dur: 0.1, type: 'triangle', vol: 0.2 }); },
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
  };
})();
