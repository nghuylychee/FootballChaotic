/* Âm thanh chiptune tổng hợp bằng WebAudio — không cần file asset */
window.SFC = window.SFC || {};

(function () {
  let ctx = null;
  let master = null;
  // 2 nhánh dưới master: hiệu ứng (kể cả khán giả) và nhạc nền — âm lượng người chơi chỉnh ở SETTINGS (meta/settings.js)
  let sfxBus = null;
  let musicBus = null;
  const vol = { sfx: 1, music: 1 };
  let muted = false;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = SFC_CONFIG.game.audio.volume;
      master.connect(ctx.destination);
      sfxBus = ctx.createGain();
      sfxBus.gain.value = vol.sfx;
      sfxBus.connect(master);
      musicBus = ctx.createGain();
      musicBus.gain.value = vol.music;
      musicBus.connect(master);
      loadSamples();
      bakeCrowd();   // khán giả tổng hợp: render sẵn (không chặn khung hình)
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function enabled() {
    return SFC_CONFIG.game.audio.enabled && !muted && ensure();
  }

  // at: thời điểm phát tuyệt đối (ctx.currentTime) — nhạc nền lên lịch trước; dest: nút nhận (mặc định sfxBus)
  // vib / vibDepth: rung tần số (Hz / biên độ Hz) · attack: giây tăng âm lượng từ 0 (mặc định bật ngay)
  function tone({ freq = 440, to = null, dur = 0.1, type = 'square', vol = 0.25, delay = 0, at = null, dest = null, vib = 0, vibDepth = 0, attack = 0 }) {
    if (!enabled()) return;
    const t = at != null ? at : ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    if (attack > 0) { g.gain.setValueAtTime(0.001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(attack, dur * 0.9)); }
    else g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    if (vib > 0 && vibDepth > 0) {
      const lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = vib; lg.gain.value = vibDepth;
      lfo.connect(lg); lg.connect(o.frequency);
      lfo.start(t); lfo.stop(t + dur + 0.02);
    }
    o.connect(g);
    g.connect(dest || sfxBus);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  // to: tần số bộ lọc trượt tới (quét gió / tiếng rít) · attack: giây tăng âm lượng từ 0
  function noise({ dur = 0.15, vol = 0.25, freq = 1200, q = 1, delay = 0, at = null, dest = null, type = 'bandpass', to = null, attack = 0 }) {
    if (!enabled()) return;
    const t = at != null ? at : ctx.currentTime + delay;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (to) f.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    if (attack > 0) { g.gain.setValueAtTime(0.001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(attack, dur * 0.9)); }
    else g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(dest || sfxBus);
    src.start(t);
  }

  /* ---------- tiếng thu sẵn (config: audio.samples) — nạp 1 lần khi có AudioContext ---------- */
  const samples = {};   // tên bộ -> các AudioBuffer đã giải mã xong

  function loadSamples() {
    const S = SFC_CONFIG.game.audio.samples || {};
    for (const name in S) {
      samples[name] = [];
      for (const file of S[name].files) {
        // XHR thay fetch: bản Electron chạy từ file://, fetch không đọc được file://
        const xhr = new XMLHttpRequest();
        xhr.open('GET', 'assets/sfx/' + file + '.wav');
        xhr.responseType = 'arraybuffer';
        xhr.onload = () => {
          if (xhr.status !== 200 && xhr.status !== 0) return;   // file:// trả status 0
          ctx.decodeAudioData(xhr.response, (buf) => samples[name].push(buf), () => {});
        };
        xhr.send();
      }
    }
  }

  // phát 1 file ngẫu nhiên trong bộ `name`, level 0..1 nhân với volume trong config.
  // Trả false khi bộ chưa có file nào nạp xong -> nơi gọi tự phát tiếng tổng hợp thay
  function sample(name, level = 1) {
    if (!enabled()) return true;
    const list = samples[name];
    if (!list || !list.length) return false;
    const src = ctx.createBufferSource();
    src.buffer = list[Math.floor(Math.random() * list.length)];
    const g = ctx.createGain();
    g.gain.value = level * SFC_CONFIG.game.audio.samples[name].volume;
    src.connect(g); g.connect(sfxBus);
    src.start();
    return true;
  }

  /* ---------- khán giả (làm lại 2026-10-30, user: tiếng rè rè khó chịu) ----------
   * Không dùng ồn trắng nữa: GIỌNG NGƯỜI TỔNG HỢP = sóng răng cưa (thanh quản) qua 3 bộ lọc formant theo nguyên âm, mỗi âm tiết đổi nguyên
   * âm + cao độ; nhiều giọng chồng lên nhau + vang sân (convolver). Render sẵn 1 lần bằng OfflineAudioContext lúc có AudioContext
   * (chạy ở luồng âm thanh, không giật khung hình): hò reo (bàn thắng) + "ồồ" (cứu thua / dội cột) + vỗ tay (hết trận).
   * Chưa render xong = im (không phát tiếng rè). User 2026-10-30: bỏ tiếng người nói chuyện (nghe không hợp) -> TIẾNG SÂN cả trận = đám đông
   * ở xa: nhiều giọng ngân dài mờ đi qua lọc thấp + vang lớn thành 1 tiếng ầm ấm, vỗ tay lác đác xa xa, ù nền; dâng hạ chậm (murmur).
   * To nhỏ theo độ ồn của sân (crowdLevel). */
  const CC = () => SFC_CONFIG.game.audio.crowd || {};
  const crowd = { level: 0, gain: null, lfoGain: null, bed: false };
  const CB = {};          // buffer đã render: amb (tiếng sân, lặp), roar, ooh, clap
  let baking = false;
  const SR = 24000;       // giọng người < 4 kHz: render ở tần số lấy mẫu thấp cho nhẹ (trình duyệt tự đổi khi phát)
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pickOf = (a) => a[Math.floor(Math.random() * a.length)];
  // formant F1 / F2 / F3 (Hz) của vài nguyên âm
  const VOWEL = { a: [730, 1090, 2440], e: [530, 1840, 2480], i: [300, 2200, 2900], o: [570, 840, 2410], u: [320, 800, 2240], uh: [640, 1190, 2390], oo: [440, 1020, 2240] };
  const TALK = ['a', 'e', 'i', 'o', 'u', 'uh', 'oo'];

  function reverbIR(o, sec, decay) {
    const len = Math.floor(o.sampleRate * sec), ir = o.createBuffer(1, len, o.sampleRate), d = ir.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    return ir;
  }
  // 1 giọng. syl: [{ t, len, v (nguyên âm), f (Hz), a (âm lượng), glide (cao độ cuối / đầu) }] · bright: lọc thấp (xa = tối hơn)
  function voice(o, dest, syl, bright, vib = 0.012) {
    const src = o.createOscillator(); src.type = 'sawtooth';
    const lfo = o.createOscillator(), lg = o.createGain(); lfo.frequency.value = rnd(4.5, 6.5); lfo.connect(lg); lg.connect(src.frequency);
    const env = o.createGain(); env.gain.value = 0;
    const lp = o.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = bright;
    const F = [0, 1, 2].map((k) => {
      const f = o.createBiquadFilter(), g = o.createGain();
      f.type = 'bandpass'; f.Q.value = [5, 9, 12][k]; g.gain.value = [1, 0.55, 0.25][k];
      src.connect(f); f.connect(g); g.connect(env);
      return f;
    });
    env.connect(lp); lp.connect(dest);
    for (const s of syl) {
      src.frequency.setTargetAtTime(s.f, s.t, 0.02);
      if (s.glide) src.frequency.setTargetAtTime(s.f * s.glide, s.t + s.len * 0.3, s.len * 0.4);
      lg.gain.setValueAtTime(s.f * vib, s.t);
      const V = VOWEL[s.v], hi = s.f > 180 ? 1.12 : 1;   // giọng cao (nữ / trẻ): formant cao hơn chút
      F.forEach((f, k) => f.frequency.setTargetAtTime(V[k] * hi * rnd(0.95, 1.05), s.t, 0.025));
      env.gain.setTargetAtTime(s.a, s.t, 0.012);
      env.gain.setTargetAtTime(0, s.t + s.len, 0.03);
    }
    src.start(0); lfo.start(0);
  }
  const pitchOf = () => (Math.random() < 0.6 ? rnd(95, 150) : rnd(175, 260));   // nam / nữ
  // hét: n người hét nguyên âm dài cùng lúc (bắt đầu lệch nhau trong spread giây), cao độ trượt glide
  function shout(o, mix, n, { vowels, pitch, len, spread, glide = 1, loud = 0.06, far = [1600, 3000], twice = 0 }) {
    for (let k = 0; k < n; k++) {
      const f = pitchOf() * pitch, syl = [];
      let t = rnd(0, spread);
      const reps = Math.random() < twice ? 2 : 1;
      for (let r = 0; r < reps; r++) {
        const l = rnd(len[0], len[1]);
        syl.push({ t, len: l, v: pickOf(vowels), f: f * rnd(0.9, 1.15), a: loud * rnd(0.6, 1), glide: glide * rnd(0.97, 1.03) });
        t += l + rnd(0.05, 0.25);
      }
      voice(o, mix, syl, rnd(far[0], far[1]), 0.025);
    }
  }
  // TIẾNG SÂN: đám đông ở xa ngân dài (không phải nói chuyện) — giọng trầm, nguyên âm mở, mỗi tiếng 1.5–4 s, chồng nhau dày
  function hum(o, mix, n, sec) {
    for (let k = 0; k < n; k++) {
      const f = pitchOf() * rnd(0.9, 1.25), a = rnd(0.015, 0.04), syl = [];
      for (let t = rnd(0, 3); t < sec; ) {
        const l = rnd(1.5, 4);
        syl.push({ t, len: l, v: pickOf(['a', 'o', 'uh', 'oo']), f: f * rnd(0.92, 1.1), a: a * rnd(0.6, 1), glide: rnd(0.96, 1.06) });
        t += l + rnd(0.4, 2.5);
      }
      voice(o, mix, syl, rnd(450, 1000), 0.02);
    }
  }
  // ồn "không khí" của đám đông (hơi thở / tiếng ồn lẫn): ồn lọc dải mềm, nhỏ, đi theo âm lượng của mix
  function air(o, mix, sec, level, freq = 900) {
    const len = Math.floor(o.sampleRate * sec), buf = o.createBuffer(1, len, o.sampleRate), d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { last = 0.97 * last + 0.03 * (Math.random() * 2 - 1); d[i] = last * 6; }   // ồn hồng-nâu, không gắt
    const s = o.createBufferSource(), f = o.createBiquadFilter(), g = o.createGain();
    s.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.5; g.gain.value = level;
    s.connect(f); f.connect(g); g.connect(mix); s.start(0);
  }
  // VỖ TAY (làm lại 2026-10-30: bản cũ là chớp ồn 12 ms lọc hẹp + vang dày -> nghe như mưa rào): 1 tiếng vỗ = 3 gai chát rất ngắn liền
  // nhau (2 bàn tay chạm nhiều điểm) + đuôi ngắn; mỗi người 1 "lòng bàn tay" (lọc dải rộng, cao độ riêng) + nhánh chát (lọc cao), vỗ
  // rate lần / giây có lệch, nhanh dần lúc đầu rồi thưa dần (tay mỏi). Ít người, rõ từng tiếng thay vì 1 bức tường ồn
  function claps(o, mix, n, sec, rate) {
    const bl = Math.floor(o.sampleRate * 0.045), burst = o.createBuffer(1, bl, o.sampleRate), d = burst.getChannelData(0);
    const spike = (at, amp, tau) => { const s0 = Math.floor(o.sampleRate * at), tn = o.sampleRate * tau; for (let i = s0; i < bl; i++) d[i] += (Math.random() * 2 - 1) * amp * Math.exp(-(i - s0) / tn); };
    spike(0, 1, 0.0012); spike(0.0025, 0.7, 0.0012); spike(0.006, 0.45, 0.0015); spike(0, 0.22, 0.009);
    for (let k = 0; k < n; k++) {
      const body = o.createBiquadFilter(), crack = o.createBiquadFilter(), g = o.createGain(), gc = o.createGain();
      body.type = 'bandpass'; body.frequency.value = rnd(800, 1900); body.Q.value = rnd(1.2, 2.4);
      crack.type = 'highpass'; crack.frequency.value = rnd(2200, 3200);
      g.gain.value = rnd(0.5, 1); gc.gain.value = rnd(0.15, 0.35);
      body.connect(g); g.connect(mix); crack.connect(gc); gc.connect(mix);
      const r0 = rnd(rate * 0.85, rate * 1.2);
      for (let t = rnd(0, 0.25); t < sec; ) {
        const s = o.createBufferSource(); s.buffer = burst; s.playbackRate.value = rnd(0.92, 1.08);
        s.connect(body); s.connect(crack); s.start(t);
        t += (1 / r0) * rnd(0.88, 1.12) * (1 + 0.35 * (t / sec));   // thưa dần về cuối
      }
    }
  }
  // render: build(o, mix) dựng các giọng vào mix -> lọc bỏ ù / chói -> khô + vang -> AudioBuffer (chuẩn hoá RMS về rms)
  function bake(sec, build, { verb = 1.6, wet = 0.4, hp = 130, lp = 3400, rms = 0.2 } = {}) {
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const o = new OAC(1, Math.floor(SR * sec), SR);
    const mix = o.createGain(), h = o.createBiquadFilter(), l = o.createBiquadFilter(), dry = o.createGain();
    h.type = 'highpass'; h.frequency.value = hp; l.type = 'lowpass'; l.frequency.value = lp;
    mix.connect(h); h.connect(l); dry.gain.value = 1; l.connect(dry); dry.connect(o.destination);
    if (wet > 0) {
      const cv = o.createConvolver(), wg = o.createGain();
      cv.normalize = true; cv.buffer = reverbIR(o, verb, 3); wg.gain.value = wet;
      l.connect(cv); cv.connect(wg); wg.connect(o.destination);
    }
    build(o, mix);
    return o.startRendering().then((buf) => {
      const d = buf.getChannelData(0);
      let sum = 0, peak = 0;
      for (let i = 0; i < d.length; i++) { sum += d[i] * d[i]; peak = Math.max(peak, Math.abs(d[i])); }
      const k = Math.min(rms / Math.max(1e-6, Math.sqrt(sum / d.length)), 0.95 / Math.max(1e-6, peak));
      for (let i = 0; i < d.length; i++) d[i] *= k;
      return buf;
    });
  }
  // vòng lặp liền mạch: render dài thêm x giây rồi trộn đuôi vào đầu
  function loopable(buf, x) {
    const d = buf.getChannelData(0), n = Math.floor(buf.sampleRate * x), len = d.length - n;
    const out = ctx.createBuffer(1, len, buf.sampleRate), o = out.getChannelData(0);
    for (let i = 0; i < len; i++) o[i] = d[i];
    for (let i = 0; i < n; i++) { const k = i / n; o[i] = d[i] * Math.sqrt(k) + d[len + i] * Math.sqrt(1 - k); }
    return out;
  }
  // âm lượng tổng của 1 sự kiện: tăng tới đỉnh ở at giây, giữ hold giây, tắt dần tới hết sec
  function swell(o, mix, sec, at, hold) {
    mix.gain.setValueAtTime(0.0001, 0);
    mix.gain.linearRampToValueAtTime(1, at);
    mix.gain.setValueAtTime(1, at + hold);
    mix.gain.exponentialRampToValueAtTime(0.001, sec);
  }
  function bakeCrowd() {
    if (baking || !(window.OfflineAudioContext || window.webkitOfflineAudioContext)) return;
    baking = true;
    // tiếng đang tắt trong config (audio.crowd: bed / goal / ooh / applause) thì không render
    const C = CC(), jobs = [
      // tiếng sân: 18 s lặp (+2 s trộn nối) — đám đông xa ngân + vỗ tay lác đác (nhỏ, mờ) + ù nền
      ['amb', bake(20, (o, mix) => {
        hum(o, mix, 70, 20);
        const cg = o.createGain(); cg.gain.value = 0.06; cg.connect(mix);
        claps(o, cg, 6, 20, 1.6);
        air(o, mix, 20, 0.03, 350);
      }, { verb: 3, wet: 0.8, hp: 110, lp: 1500 }), 2],
      ['roar', bake(4.2, (o, mix) => {
        swell(o, mix, 4.2, 0.3, 1.3);
        shout(o, mix, 60, { vowels: ['a', 'e', 'o', 'uh'], pitch: 1.7, len: [0.9, 2.2], spread: 0.25, glide: 1.12, twice: 0.4 });
        air(o, mix, 4.2, 0.12, 1100);
        claps(o, mix, 25, 4.2, 4);
      }, { verb: 2, wet: 0.55 })],
      ['ooh', bake(1.9, (o, mix) => {
        swell(o, mix, 1.9, 0.22, 0.35);
        shout(o, mix, 40, { vowels: ['u', 'oo', 'o'], pitch: 1.05, len: [0.8, 1.2], spread: 0.12, glide: 0.85, loud: 0.07 });
      }, { verb: 1.8, wet: 0.5 })],
      ['clap', bake(4, (o, mix) => {
        swell(o, mix, 4, 0.15, 1.8);
        claps(o, mix, 18, 4, 5);
        shout(o, mix, 8, { vowels: ['e', 'a', 'o'], pitch: 1.5, len: [0.4, 0.9], spread: 1.5, glide: 1.05, loud: 0.02, twice: 0.5 });
      }, { verb: 0.9, wet: 0.18, hp: 400, lp: 6000, rms: 0.12 })],
    ];
    const on = { amb: C.bed !== false, roar: (C.goal || 0) > 0, ooh: (C.ooh || 0) > 0, clap: (C.applause || 0) > 0 };
    for (const [name, job, loopX] of jobs.filter(([n]) => on[n])) job.then((buf) => { CB[name] = loopX ? loopable(buf, loopX) : buf; if (name === 'amb') ambStart(); }).catch(() => {});
  }

  // tiếng sân cả trận: 1 vòng lặp dưới crowd.gain (âm lượng theo độ ồn sân), dâng hạ chậm qua LFO
  function ambStart() {
    if (crowd.bed || !CB.amb || !ctx || CC().bed === false) return;
    if (!crowd.gain) {
      const g = ctx.createGain(); g.gain.value = 0; g.connect(sfxBus);
      const lfoGain = ctx.createGain(); lfoGain.gain.value = 0; lfoGain.connect(g.gain);
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.09; lfo.connect(lfoGain); lfo.start();
      crowd.gain = g; crowd.lfoGain = lfoGain;
    }
    const s = ctx.createBufferSource(); s.buffer = CB.amb; s.loop = true; s.connect(crowd.gain);
    s.start(ctx.currentTime, Math.random() * CB.amb.duration);
    crowd.bed = true;
    ambLevel();
  }
  function ambLevel() {
    if (!crowd.gain) return;
    const C = CC(), v = muted ? 0 : crowd.level * (C.volume || 0.35), t = ctx.currentTime;
    crowd.gain.gain.setTargetAtTime(v, t, 0.4);
    crowd.lfoGain.gain.setTargetAtTime(v * (C.murmur || 0) * 0.5, t, 0.4);
  }
  // phát 1 tiếng khán giả đã render (lệch tốc độ chút cho đỡ lặp)
  function crowdPlay(name, gain) {
    if (!enabled() || !CB[name] || gain <= 0) return;
    const s = ctx.createBufferSource(), g = ctx.createGain();
    s.buffer = CB[name]; s.playbackRate.value = rnd(0.96, 1.04); g.gain.value = gain;
    s.connect(g); g.connect(sfxBus); s.start();
  }

  /* ---------- nhạc nền (config/music.config.js): bộ lên lịch nốt theo bước móc kép, đọc trước ~0.15s ---------- */
  const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
  const midi = (n) => { const m = /^([A-G][#b]?)(-?\d)$/.exec(n); return m ? (parseInt(m[2], 10) + 1) * 12 + NOTE[m[1]] : null; };
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

  const Music = {
    want: false, playing: false, gain: null, timer: null, song: null,

    // gọi mỗi khung hình: on = đang ở ngoài trận (menu)
    update(on) {
      const M = SFC_CONFIG.music;
      on = !!(on && M && M.enabled && SFC_CONFIG.game.audio.enabled);
      if (on === this.want && (!on || this.playing)) return;
      this.want = on;
      if (on) this.start(); else this.stop();
    },

    start() {
      // AudioContext chỉ chạy sau thao tác đầu tiên của người chơi (phím / chuột) -> chưa chạy thì thử lại ở khung sau
      if (!ctx || ctx.state !== 'running') { this.want = false; return; }
      const M = SFC_CONFIG.music;
      if (!this.gain) { this.gain = ctx.createGain(); this.gain.gain.value = 0; this.gain.connect(musicBus); }
      const t = ctx.currentTime;
      this.gain.gain.cancelScheduledValues(t);
      this.gain.gain.setValueAtTime(this.gain.gain.value, t);
      this.gain.gain.linearRampToValueAtTime(M.volume, t + M.fadeIn);
      if (this.playing) return;   // đang tắt dần -> lên lại, không khởi động lại bài
      this.song = this.prepare(M.menu);
      this.pos = { sec: 0, bar: 0, st: 0 };
      this.next = t + 0.1;
      this.playing = true;
      clearInterval(this.timer);
      this.timer = setInterval(() => this.schedule(), 25);
    },

    stop() {
      if (!this.playing || !ctx) return;
      const M = SFC_CONFIG.music, t = ctx.currentTime;
      this.gain.gain.cancelScheduledValues(t);
      this.gain.gain.setValueAtTime(this.gain.gain.value, t);
      this.gain.gain.linearRampToValueAtTime(0, t + M.fadeOut);
      clearTimeout(this.stopT);
      this.stopT = setTimeout(() => { if (!this.want) { clearInterval(this.timer); this.playing = false; } }, M.fadeOut * 1000 + 50);
    },

    // tách sẵn giai điệu thành token theo bước
    prepare(S) {
      const song = Object.assign({}, S, { sections: {} });
      for (const k in S.sections) {
        const sec = Object.assign({}, S.sections[k]);
        if (sec.lead) sec.lead = sec.lead.map((bar) => bar.trim().split(/\s+/));
        song.sections[k] = sec;
      }
      return song;
    },

    schedule() {
      if (!this.playing || !ctx) return;
      const S = this.song, step = 60 / S.bpm / 4;
      while (this.next < ctx.currentTime + 0.15) {
        const swing = this.pos.st % 2 ? step * (S.swing || 0) : 0;
        this.playStep(this.next + swing, step);
        this.next += step;
        // sang bước / ô nhịp / đoạn kế tiếp
        const sec = S.sections[S.order[this.pos.sec]];
        if (++this.pos.st >= 16) {
          this.pos.st = 0;
          if (++this.pos.bar >= sec.chords.length) { this.pos.bar = 0; this.pos.sec = (this.pos.sec + 1) % S.order.length; }
        }
      }
    },

    playStep(t, step) {
      const S = this.song, I = S.instruments, P = this.pos, dest = this.gain;
      const sec = S.sections[S.order[P.sec]], st = P.st;
      const chord = S.chords[sec.chords[P.bar]];
      const last = P.bar === sec.chords.length - 1;
      const D = last && sec.fill ? Object.assign({}, sec.drums, sec.fill) : sec.drums;
      // trống
      if (D.kick && D.kick[st] === 'x') tone({ freq: I.kick.from, to: I.kick.to, dur: I.kick.dur, type: 'sine', vol: I.kick.vol, at: t, dest });
      if (D.snare && D.snare[st] === 'x') {
        noise({ dur: I.snare.dur, vol: I.snare.vol, freq: I.snare.freq, q: 0.8, at: t, dest });
        tone({ freq: I.snare.body, to: I.snare.body * 0.7, dur: 0.06, type: 'triangle', vol: I.snare.vol * 0.6, at: t, dest });
      }
      const h = D.hat && D.hat[st];
      if (h === 'x' || h === 'o') noise({ dur: h === 'o' ? I.hat.open : I.hat.dur, vol: I.hat.vol, freq: I.hat.freq, q: 0.7, type: 'highpass', at: t, dest });
      // bass: 1 gốc · 5 quãng 5 · 8 quãng tám
      const b = sec.bass && sec.bass[st];
      if (b && b !== '.') {
        const m = midi(chord.root + I.bass.octave) + ({ 1: 0, 5: 7, 8: 12 }[b] || 0);
        tone({ freq: hz(m), dur: step * I.bass.len, type: I.bass.type, vol: I.bass.vol, at: t, dest });
      }
      // hợp âm (đánh ngắn)
      if (sec.stab && sec.stab[st] === 'x') for (const n of chord.notes) tone({ freq: hz(midi(n)), dur: step * I.stab.len, type: I.stab.type, vol: I.stab.vol, at: t, dest });
      // arpeggio
      const a = sec.arp && P.bar >= (sec.arpFrom || 0) ? sec.arp[st] : null;
      if (a && a !== '.') {
        const k = +a, n = chord.notes.length;
        tone({ freq: hz(midi(chord.notes[k % n]) + 12 * (1 + Math.floor(k / n))), dur: step * I.arp.len, type: I.arp.type, vol: I.arp.vol, at: t, dest });
      }
      // giai điệu: nốt ngân tới hết các "-" phía sau
      const bar = sec.lead && sec.lead[P.bar];
      const tok = bar && bar[st];
      if (tok && tok !== '-' && tok !== '.') {
        let len = 1;
        while (bar[st + len] === '-') len++;
        const m = midi(tok);
        if (m != null) tone({ freq: hz(m), dur: step * len * 0.95, type: I.lead.type, vol: I.lead.vol, at: t, dest });
      }
    },
  };
  SFC.Music = Music;

  SFC.Audio = {
    unlock: ensure,
    // bộ tổng hợp cho các file tiếng khác (engine/ultsfx.js: tiếng riêng của từng Tuyệt kỹ)
    synth: { tone, noise },
    // kind: 'sfx' | 'music', v: 0..1 (nhân với âm lượng trong config). Gọi trước khi có AudioContext cũng được
    setVolume(kind, v) {
      vol[kind] = v;
      const bus = kind === 'music' ? musicBus : sfxBus;
      if (bus) bus.gain.setTargetAtTime(v, ctx.currentTime, 0.02);
    },
    toggleMute() { muted = !muted; if (ctx) ambLevel(); return muted; },

    // độ ồn nền của khán giả (0 = không có khán giả); gọi mỗi khung hình (render/crowd.js)
    // độ ồn tiếng sân (0 = không có khán giả); gọi mỗi khung hình (render/crowd.js). Cũng là độ to của "ồồ"
    crowdLevel(level) {
      const C = CC();
      level = !C.enabled || !SFC_CONFIG.game.audio.enabled ? 0 : level;
      if (level === crowd.level) return;
      crowd.level = level;
      if (!ctx && level <= 0) return;
      if (!ensure()) return;
      ambStart();
      ambLevel();
    },
    // bàn thắng: hò reo vỡ sân (âm lượng theo độ ồn của sân)
    crowdRoar(level) { crowdPlay('roar', level * (CC().goal || 1)); },
    // cứu thua / dội cột: "ồồ"
    crowdOoh() { crowdPlay('ooh', crowd.level * (CC().ooh || 0.6)); },
    // hết trận: vỗ tay + hò reo nhẹ
    crowdApplause(level) { crowdPlay('clap', level * (CC().applause || 0.8)); },
    // tiếng khán giả đã render xong (kiểm tra / trang nghe thử tools/audio/crowd.html)
    crowdBuffers() { return Object.assign({}, CB); },
    get muted() { return muted; },

    touch()   { if (!sample('ballBounce')) tone({ freq: 220, to: 160, dur: 0.05, type: 'triangle', vol: 0.15 }); },
    // bóng tự nảy trên mặt sân; p = độ mạnh cú nảy 0..1 (entities/ball.js)
    bounce(p = 1) { sample('ballBounce', p); },
    pass()    {
      if (sample('ballPass')) return;
      noise({ dur: 0.06, vol: 0.25, freq: 900 }); tone({ freq: 330, to: 250, dur: 0.06, type: 'triangle', vol: 0.15 });
    },
    kick(p)   {
      if (sample(p < 1 / 3 ? 'kickWeak' : p < 2 / 3 ? 'kickMid' : 'kickStrong')) return;
      noise({ dur: 0.12, vol: 0.35 + p * 0.2, freq: 600 }); tone({ freq: 160, to: 60, dur: 0.15, type: 'square', vol: 0.2 });
    },
    wall()    { if (!sample('ballBounce')) tone({ freq: 120, to: 80, dur: 0.06, type: 'square', vol: 0.12 }); },
    // bóng chạm cột dọc / xà ngang: tiếng kim loại "keng" (các tần số lệch nhau ngân ngắn + tiếng gõ)
    clang()   {
      noise({ dur: 0.05, vol: 0.22, freq: 3200, q: 2 });
      tone({ freq: 1320, to: 1260, dur: 0.45, type: 'triangle', vol: 0.2 });
      tone({ freq: 1985, to: 1940, dur: 0.32, type: 'triangle', vol: 0.12 });
      tone({ freq: 2790, dur: 0.22, type: 'square', vol: 0.04 });
      this.crowdOoh();
    },
    // trúng đòn; kind = loại đòn (Player.hit opts.type) — Hard attack có tiếng riêng
    hit(kind) {
      if (kind === 'hard' && sample('hardHit')) return;
      noise({ dur: 0.15, vol: 0.35, freq: 300 }); tone({ freq: 90, to: 40, dur: 0.18, type: 'sawtooth', vol: 0.18 });
    },
    whoosh()  { noise({ dur: 0.18, vol: 0.18, freq: 2200, q: 0.6 }); },
    tackle()  { noise({ dur: 0.08, vol: 0.3, freq: 500 }); },
    // Light attack trúng người (systems/actions.js)
    punch()   { if (!sample('punchLight')) this.tackle(); },
    // Light attack vung tay, trúng hay trượt đều phát
    swing()   { if (!sample('swingLight')) this.whoosh(); },
    // Hard attack: gồng (co chân lấy đà)
    windup()  { if (!sample('hardWindup')) this.tackle(); },
    // Hard attack hết gồng: bước chân tới + vung chân, cùng lúc
    kickSwing() { sample('hardStep'); if (!sample('hardSwing')) this.whoosh(); },
    block()   { tone({ freq: 880, to: 1320, dur: 0.12, type: 'square', vol: 0.15 }); },
    zap()     { tone({ freq: 1400, to: 200, dur: 0.18, type: 'sawtooth', vol: 0.15 }); },
    // VHS Rewind: băng tua ngược — tiếng rít trượt xuống lặp lại + nhiễu sột soạt
    rewind()  {
      for (let i = 0; i < 4; i++) tone({ freq: 1200 - i * 120, to: 300, dur: 0.22, type: 'sawtooth', vol: 0.09, delay: i * 0.21 });
      noise({ dur: 0.9, vol: 0.08, freq: 3000, q: 0.5 });
    },
    fire()    { noise({ dur: 0.3, vol: 0.2, freq: 400, q: 0.4 }); },
    save()    { tone({ freq: 440, to: 660, dur: 0.1, type: 'triangle', vol: 0.2 }); this.crowdOoh(); },
    nearMiss() { this.crowdOoh(); },
    // đánh đầu (dứt điểm 1 chạm): tiếng "bụp" trầm, ngắn — khác tiếng sút chân
    header(p = 0.6) {
      tone({ freq: 190, to: 95, dur: 0.09, type: 'triangle', vol: 0.18 + 0.1 * p });
      noise({ dur: 0.05, vol: 0.16 + 0.08 * p, freq: 1100, q: 0.9 });
    },
    // bước chân khi chạy nước rút (fx.run.stepVolume): tiếng "sột" rất nhỏ, đổi cao độ chút cho đỡ đều
    step(v = 0.5) { noise({ dur: 0.035, vol: 0.09 * v, freq: 650 + Math.random() * 250, q: 0.8, type: 'lowpass' }); },   // sút chệch sát cột / xà: chỉ khán giả "ồồ"
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
    // kỹ thuật LEGEND vừa ra (GOAT PATH): nốt vút lên + lấp lánh ngắn
    legendTech() {
      tone({ freq: 660, to: 1320, dur: 0.12, type: 'square', vol: 0.07 });
      [1568, 2093].forEach((f, i) => tone({ freq: f, dur: 0.08, type: 'triangle', vol: 0.08, delay: 0.1 + i * 0.05 }));
    },
    // khoảnh khắc LEGEND (GOAT PATH, src/systems/legends.js): tiếng khán đài ồ lên + hợp âm kèn ngắn
    legend() {
      noise({ dur: 0.7, vol: 0.12, freq: 900, q: 0.6 });
      [294, 440, 587].forEach((f, i) => tone({ freq: f, dur: 0.32, type: 'sawtooth', vol: 0.09, delay: 0.05 + i * 0.015 }));
      tone({ freq: 880, to: 1175, dur: 0.22, type: 'square', vol: 0.06, delay: 0.3 });
    },
    menu()    { tone({ freq: 660, dur: 0.04, vol: 0.12 }); },
    // GOAT PATH: khoanh phấn quanh node vừa chọn — 3 nét cào phấn ngắn lên dần theo vòng tròn (dur = thời gian vẽ)
    chalk(dur = 0.45) {
      for (let i = 0; i < 3; i++) noise({ dur: dur / 3 + 0.03, vol: 0.07, freq: 2600 + i * 500, q: 2.2, delay: i * dur / 3, attack: 0.01 });
      noise({ dur: 0.05, vol: 0.06, freq: 900, q: 0.8, type: 'lowpass', delay: dur });   // chấm phấn cuối nét
    },
    // gacha: tiếng "tách" khi dải quay chạy qua mỗi ô · nhạc lộ đồ (r = bậc hiếm 0..4) · phân rã
    tick()    { tone({ freq: 1900, dur: 0.018, type: 'square', vol: 0.05 }); },
    reveal(r = 0) {
      [523, 659, 784, 1046, 1318, 1568].slice(0, 2 + r).forEach((f, i) => tone({ freq: f, dur: 0.14, type: 'triangle', vol: 0.18, delay: i * 0.08 }));
      if (r >= 3) noise({ dur: 0.9, vol: 0.1, freq: 2400, q: 0.4, delay: 0.1 });
    },
    dismantle() { noise({ dur: 0.12, vol: 0.2, freq: 1200 }); tone({ freq: 880, to: 1760, dur: 0.12, type: 'square', vol: 0.1, delay: 0.05 }); },
  };
})();
