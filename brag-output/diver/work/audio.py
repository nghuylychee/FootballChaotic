"""Soundtrack for the diver cut: the game's own SFX (rendered offline from the logged events, mapped through edl.json)
+ a laid-back island-funk groove (F major, 104 BPM) with comedy gags, all synthesized here.
usage: python audio.py   -> game_sfx.wav, music.wav, diver_audio.wav  (needs the repo served at http://127.0.0.1:8765)"""
import json, base64, wave, os
import numpy as np
from playwright.sync_api import sync_playwright

SR = 44100
E = json.load(open('edl.json'))
DUR = E['dur']
N = int(DUR * SR)
CUE = E['cues']
rng = np.random.default_rng(7)

# ---------------------------------------------------------------- game SFX (real WebAudio recipes, offline)
def game_events():
    metas, out = {}, []
    for s in E['segs']:
        if s['r'] <= 0 or s['take'] in ('tv', 'film'):
            continue
        m = metas.setdefault(s['take'], json.load(open(f"frames/{s['take']}/meta.json")))
        c0, c1 = s['c0'], s['c0'] + (s['v1'] - s['v0']) * s['r']
        for e in m['sfx']:
            if c0 <= e['t'] < c1 and e['name'] != 'touch':
                out.append({'t': s['v0'] + (e['t'] - c0) / s['r'], 'name': e['name'], 'arg': e.get('arg')})
    # the cut-in sting lands on the first frame of the frozen banner
    # cut-in sting on the first frame of the frozen banner; the ray's charge-up fell inside the freeze, so it opens the beam shot
    out = [e for e in out if e['arg'] != 'cut.chaos']
    out.append({'t': CUE['cutin'], 'name': 'ult', 'arg': 'cut.chaos'})
    out.append({'t': 24.9, 'name': 'ult', 'arg': 'chicken.ray'})
    return sorted(out, key=lambda e: e['t'])

AUDIO_JS = """async ([events, dur, gain]) => {
  SFC.Audio.unlock();
  await new Promise((r) => setTimeout(r, 1500));   // let the wav samples decode
  const ctx = window.__ctx, q = 128 / 44100, at = {};
  for (const e of events) { const k = Math.max(q, Math.round(e.t / q) * q).toFixed(6); (at[k] = at[k] || []).push(e); }
  for (const k of Object.keys(at)) ctx.suspend(+k).then(() => {
    for (const e of at[k]) { if (SFC.Audio[e.name]) SFC.Audio[e.name](e.arg == null ? undefined : e.arg); }
    OfflineAudioContext.prototype.resume.call(ctx);
  });
  const buf = await ctx.startRendering();
  const n = buf.length, out = new Int16Array(n * 2);
  for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < n; i++) out[i * 2 + c] = Math.max(-32767, Math.min(32767, d[i] * 32767 * gain)); }
  let s = ''; const u8 = new Uint8Array(out.buffer);
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
}"""

def render_game(path):
    ev = game_events()
    print('game events', len(ev), [(round(e['t'], 2), e['name'], e['arg']) for e in ev])
    with sync_playwright() as p:
        b = p.chromium.launch(channel='chrome')
        pg = b.new_page()
        pg.on('pageerror', lambda e: print('PAGEERROR', e))
        pg.goto('http://127.0.0.1:8765/brag-output/diver/work/blank.html')
        pg.evaluate("""(dur) => { window.AudioContext = function () {
            const c = new OfflineAudioContext(2, Math.ceil(dur * 44100), 44100); c.resume = () => Promise.resolve(); window.__ctx = c; return c; }; }""", DUR)
        for s in ['config/game.config.js', 'config/music.config.js', 'config/cores.config.js', 'src/engine/utils.js', 'src/engine/audio.js', 'src/engine/ultsfx.js']:
            pg.add_script_tag(url=f'/{s}')
        pcm = base64.b64decode(pg.evaluate(AUDIO_JS, [ev, DUR, 6]))
        b.close()
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm)

def load(path):
    with wave.open(path) as w:
        a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32767
    a = a.reshape(-1, 2)
    out = np.zeros((N, 2), np.float32); out[:min(N, len(a))] = a[:N]
    return out

# ---------------------------------------------------------------- synth helpers
def tt(d): return np.arange(int(d * SR)) / SR
def midi(m): return 440.0 * 2 ** ((m - 69) / 12)
def env(t, a=0.004, d=0.2):
    e = np.exp(-t / d)
    if a > 0: e *= np.clip(t / a, 0, 1)
    return e
def lp(x, fc):
    a = np.exp(-2 * np.pi * fc / SR); y = np.empty_like(x); z = 0.0
    for i in range(len(x)): z = (1 - a) * x[i] + a * z; y[i] = z
    return y
def lpv(x, fc):   # vectorised one-pole via cumulative filter (fast enough for short notes)
    from scipy.signal import lfilter
    a = np.exp(-2 * np.pi * fc / SR)
    return lfilter([1 - a], [1, -a], x)
def hp(x, fc):
    return x - lpv(x, fc)
def bp(x, lo, hi): return lpv(hp(x, lo), hi)
def saw(f, t): return 2 * ((f * t) % 1) - 1
def phase_saw(fc):   # saw with time-varying freq
    ph = np.cumsum(fc) / SR; return 2 * (ph % 1) - 1
def sine_sweep(fc): return np.sin(2 * np.pi * np.cumsum(fc) / SR)

MUS = np.zeros((N, 2), np.float32)
FX = np.zeros((N, 2), np.float32)
def put(buf, sig, t, g=1.0, pan=0.0):
    i = int(round(t * SR))
    if i >= N or i + len(sig) <= 0: return
    j0 = max(0, -i); sig = sig[j0:]; i = max(0, i)
    n = min(len(sig), N - i)
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[i:i + n, 0] += sig[:n] * g * l * 1.414
    buf[i:i + n, 1] += sig[:n] * g * r * 1.414

# instruments
def kick():
    t = tt(0.32); f = 45 + 75 * np.exp(-t * 28)
    return sine_sweep(f) * env(t, 0.001, 0.12) + 0.3 * rng.standard_normal(len(t)) * env(t, 0, 0.004)
def rim():
    t = tt(0.1); n = bp(rng.standard_normal(len(t)), 1500, 5000) * env(t, 0, 0.025)
    return 0.8 * n + 0.6 * np.sin(2 * np.pi * 420 * t) * env(t, 0, 0.018)
def shaker(acc=1.0):
    t = tt(0.07); return hp(rng.standard_normal(len(t)), 6000) * env(t, 0.006, 0.02) * 0.5 * acc
def bass(m, d):
    t = tt(d + 0.06); f = midi(m)
    x = np.sin(2 * np.pi * f * t) + 0.35 * lpv(saw(f, t), 600)
    e = np.clip(t / 0.005, 0, 1) * np.where(t < d, np.exp(-t / 0.6), np.exp(-d / 0.6) * np.exp(-(t - d) / 0.02))
    return x * e
def pluck(m, d=0.16, damp=0.5):
    # Karplus-Strong, short and muted: island "skank" guitar
    f = midi(m); L = max(2, int(SR / f)); n = int(d * SR)
    buf = rng.uniform(-1, 1, L); out = np.empty(n)
    for i in range(n):
        out[i] = buf[i % L]; buf[i % L] = damp * (buf[i % L] + buf[(i + 1) % L]) * 0.995
    return out * env(tt(d), 0.001, d * 0.5)
def chop(ms): return sum(pluck(m) for m in ms) / len(ms)
def marimba(m, d=0.6):
    t = tt(d); f = midi(m)
    return (np.sin(2 * np.pi * f * t) * env(t, 0.001, 0.18) + 0.28 * np.sin(2 * np.pi * 4 * f * t) * env(t, 0.001, 0.04)
            + 0.1 * np.sin(2 * np.pi * 9.8 * f * t) * env(t, 0, 0.012))
def organ(m, d):
    t = tt(d); f = midi(m) * (1 + 0.003 * np.sin(2 * np.pi * 6 * t))
    x = sum(a * np.sin(2 * np.pi * f * k * t) for k, a in [(1, 1), (2, 0.5), (3, 0.3), (4, 0.18), (6, 0.08)])
    return x * np.clip(t / 0.01, 0, 1) * np.clip((d - t) / 0.04, 0, 1)
def brass(ms, d, cutoff=2200):
    t = tt(d)
    x = sum(saw(midi(m) * dt, t) for m in ms for dt in (0.997, 1.003)) / (2 * len(ms))
    e = np.clip(t / 0.03, 0, 1) * np.exp(-t / (d * 0.7)) * np.clip((d - t) / 0.05, 0, 1)
    return lpv(x, cutoff) * e
def cymbal(d=1.4):
    t = tt(d); return hp(rng.standard_normal(len(t)), 5000) * env(t, 0.002, d * 0.35) * 0.6
def piano(m, d=1.2):
    t = tt(d); f = midi(m)
    x = sum(a * np.sin(2 * np.pi * f * k * 1.0005 ** k * t) * np.exp(-t * (1.5 + k * 0.9)) for k, a in [(1, 1), (2, 0.45), (3, 0.25), (4, 0.12), (5, 0.06)])
    return x * np.clip(t / 0.003, 0, 1)

# gags
def scratch():
    d = 0.42; t = tt(d)
    rate = 0.2 + 2.6 * np.abs(np.sin(np.pi * t / d * 2.2)) * np.where(t < d * 0.45, 1, -1)
    base = bp(rng.standard_normal(SR), 300, 3000)
    idx = np.cumsum(np.abs(rate)) * 1.0; idx = idx.astype(int) % len(base)
    x = base[idx] + 0.6 * np.sin(2 * np.pi * np.cumsum(220 * np.abs(rate)) / SR)
    return x * env(t, 0.002, 0.3)
def rewind():
    d = 0.55; t = tt(d)
    f = 900 + 1700 * (t / d) ** 0.7 + 120 * np.sin(2 * np.pi * 9 * t)
    return (0.5 * np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.35 * bp(rng.standard_normal(len(t)), 1500, 7000)) * np.clip(t / 0.03, 0, 1) * np.clip((d - t) / 0.06, 0, 1)
def slide_down():
    d = 0.55; t = tt(d); f = 1500 * (350 / 1500) ** (t / d) * (1 + 0.02 * np.sin(2 * np.pi * 7 * t))
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.08 * hp(rng.standard_normal(len(t)), 3000)) * np.clip(t / 0.02, 0, 1) * np.clip((d - t) / 0.08, 0, 1)
def woodblock(f0=820):
    t = tt(0.12); return (np.sin(2 * np.pi * f0 * (1 - 0.15 * t / 0.12) * t) + 0.4 * np.sin(2 * np.pi * f0 * 2.7 * t)) * env(t, 0.0005, 0.03)
def static(d=0.16):
    t = tt(d); return rng.standard_normal(len(t)) * 0.5 * np.clip((d - t) / 0.03, 0, 1)
def taiko():
    t = tt(0.8); f = 52 + 40 * np.exp(-t * 20)
    return sine_sweep(f) * env(t, 0.001, 0.28) + 0.4 * lpv(rng.standard_normal(len(t)), 400) * env(t, 0, 0.05)
def riser(d):
    t = tt(d); f = 300 * (6000 / 300) ** (t / d)
    n = rng.standard_normal(len(t)); y = np.zeros_like(n)
    # sweeping band of noise: crossfade through a few fixed bands
    for k, (lo, hi) in enumerate([(200, 800), (600, 2000), (1500, 5000), (4000, 12000)]):
        w = np.clip(1 - np.abs((t / d) * 3 - k), 0, 1); y += bp(n, lo, hi) * w
    return (y + 0.25 * np.sin(2 * np.pi * np.cumsum(f / 4) / SR)) * (t / d) ** 1.5
def boom(d=1.8):
    t = tt(d); return sine_sweep(38 + 30 * np.exp(-t * 6)) * env(t, 0.002, 0.6) + 0.5 * lpv(rng.standard_normal(len(t)), 300) * env(t, 0, 0.15)
def snore(d=1.2):
    t = tt(d); inh = t < d * 0.58
    rr = (0.5 + 0.5 * np.sin(2 * np.pi * 28 * t)) * lpv(rng.standard_normal(len(t)), 700) * 1.6
    wh = np.sin(2 * np.pi * np.cumsum(np.where(inh, 0, 900 - 300 * (t - d * 0.58) / (d * 0.42))) / SR) * 0.25
    e = np.where(inh, np.clip(t / (d * 0.58), 0, 1), np.clip((d - t) / (d * 0.42), 0, 1))
    return (np.where(inh, rr, wh)) * e
def crickets(d):
    # awkward silence: a cricket chirping (3 quick pulses every ~0.55 s)
    t = tt(d); x = np.zeros_like(t)
    for k0 in np.arange(0.05, d - 0.1, 0.55):
        for j in range(3):
            i = int((k0 + j * 0.05) * SR); n = min(int(0.03 * SR), len(t) - i)
            if n > 0: tn = np.arange(n) / SR; x[i:i + n] += np.sin(2 * np.pi * 4600 * tn) * np.sin(np.pi * tn / 0.03)
    return x
def projector(d):
    t = tt(d); x = 0.15 * np.sin(2 * np.pi * 60 * t)
    for k in np.arange(0, d, 1 / 18):
        i = int(k * SR); n = min(300, len(t) - i)
        if n > 0: x[i:i + n] += hp(rng.standard_normal(n), 2000) * np.exp(-np.arange(n) / 60) * 0.7
    return x

# ---------------------------------------------------------------- the groove
BPM = 104; B16 = 60 / BPM / 4; BAR = B16 * 16
CH = [  # bar chords (F, Dm, Bb, C): bass root, chop voicing, melody [(step, midi)]
    (41, [65, 69, 72], [(0, 69), (2, 72), (3, 74), (6, 72), (8, 69), (10, 67), (12, 65), (14, 69)]),
    (38, [62, 65, 69], [(0, 74), (2, 72), (4, 69), (6, 65), (8, 69), (11, 72), (12, 74)]),
    (34, [62, 65, 70], [(0, 74), (2, 77), (4, 74), (6, 72), (8, 70), (10, 69), (12, 67)]),
    (36, [64, 67, 72], [(0, 67), (2, 69), (4, 72), (6, 76), (8, 79), (10, 76), (12, 72)]),
]
def gated(t, gates): return any(a <= t < b for a, b in gates)
def groove(t0, t1, origin, layers, gates=(), gain=1.0):
    nb = int(np.ceil((t1 - origin) / BAR)) + 1
    for b in range(-1, nb):
        root, ch, mel = CH[b % 4]
        bt = origin + b * BAR
        for st in range(16):
            t = bt + st * B16 + (0.018 if st % 2 else 0)   # light 16th swing
            if t < t0 or t >= t1 or gated(t, gates): continue
            if 'drums' in layers:
                if st in (0, 7, 10): put(MUS, kick(), t, 0.85 * gain)
                if st in (4, 12): put(MUS, rim(), t, 0.42 * gain, 0.15)
                if st % 2 == 0: put(MUS, shaker(1.0 if st % 4 == 2 else 0.55), t, 0.5 * gain, 0.35)
            if 'bass' in layers:
                pat = {0: root, 3: root, 6: root + 7, 8: root + 12, 11: root + 7, 14: root + (2 if b % 4 != 3 else -1)}
                if st in pat: put(MUS, bass(pat[st] + 12, B16 * (2.2 if st != 14 else 1.6)), t, 0.5 * gain)
            if 'gtr' in layers and st in (2, 6, 10, 14):
                put(MUS, chop(ch), t, 0.42 * gain, -0.3)
            if 'mel' in layers:
                for s_, m in mel:
                    if s_ == st: put(MUS, marimba(m + 12 if b % 8 >= 4 else m), t, 0.3 * gain, 0.2)
            if 'brass' in layers and st in (0,) and b % 2 == 0:
                put(MUS, brass([root + 24, root + 28, root + 31], 0.35), t, 0.22 * gain, -0.1)

def sting_card(t):
    for i, m in enumerate([77, 81, 84, 89]): put(FX, marimba(m, 0.5), t + i * 0.045, 0.35, 0.1)
    put(FX, woodblock(900), t, 0.35, -0.2); put(FX, woodblock(1200), t + 0.09, 0.3, 0.2)

def build_music():
    full = ('drums', 'bass', 'gtr', 'mel')
    # hook: the groove is already rolling... until the record scratch
    groove(0, CUE['hookStop'], -BAR * 0.5, full)
    put(FX, scratch(), CUE['hookStop'], 0.55)
    put(FX, crickets(CUE['rew'] - CUE['hookStop'] - 0.45), CUE['hookStop'] + 0.45, 0.07, 0.4)
    put(FX, rewind(), CUE['rew'], 0.4)
    # village -> rooftop: first bar lighter, stop-time on the BONK and the SLIP
    g0 = CUE['groove']
    gates = [(CUE['bonk'] - 0.02, CUE['bonk'] + 0.42), (CUE['slip'] - 0.03, CUE['slip'] + 0.5)]
    groove(g0, g0 + BAR, g0, ('bass', 'gtr', 'drums'), gates, 0.8)
    groove(g0 + BAR, CUE['tv'][0], g0, full, gates)
    for c in CUE['cards']: sting_card(c)
    put(FX, woodblock(700), CUE['bonk'], 0.5)
    put(FX, slide_down(), CUE['slip'] - 0.05, 0.3)
    # TV: channel static, game-show organ
    t0, t1 = CUE['tv']
    put(FX, static(), t0, 0.35)
    for i, (m, d) in enumerate([(72, 0.14), (76, 0.14), (79, 0.14), (84, 0.6)]): put(MUS, organ(m, d), t0 + 0.15 + i * 0.15, 0.22)
    for i, m in enumerate([60, 64, 67, 64, 65, 69, 72, 69]): put(MUS, organ(m - 12, 0.2), t0 + 0.95 + i * 0.16, 0.12)
    put(FX, brass([67, 72, 76], 0.5, 3000), 16.42, 0.45)
    put(FX, cymbal(1.0), 16.42, 0.25)
    put(FX, static(0.08), t1 - 0.04, 0.25)
    # chopsticks: groove again, scratch callback on the freeze
    gates2 = [(CUE['scratch2'], CUE['resume2'])]
    groove(t1, CUE['cutin'], t1, full, gates2)
    put(FX, scratch(), CUE['scratch2'], 0.5)
    # cut-in: silence, taiko build, riser, hit on the beam
    for k in [0, 0.36, 0.62, 0.82, 0.96, 1.06, 1.14, 1.2]: put(FX, taiko(), CUE['cutin'] + k, 0.75)
    put(FX, riser(1.3), CUE['cutin'], 0.22)
    put(FX, brass([53, 60, 65, 69], 0.9, 2600), CUE['beam'] - 0.28, 0.5)
    put(FX, cymbal(1.6), CUE['beam'] - 0.28, 0.35)
    # payoff: full groove + brass, goal fanfare, snores
    groove(CUE['beam'] - 0.28, CUE['film'], CUE['beam'] - 0.28, full + ('brass',))
    for i, (ms, d) in enumerate([([65, 69, 72], 0.16), ([65, 69, 72], 0.16), ([70, 74, 77], 0.16), ([72, 77, 81], 0.7)]):
        put(FX, brass(ms, d, 3200), CUE['goal'] + 0.05 + i * 0.17, 0.42)
    put(FX, cymbal(1.4), CUE['goal'] + 0.56, 0.3)
    put(FX, snore(1.1), CUE['snore'], 0.5); put(FX, snore(1.1), CUE['snore'] + 1.2, 0.4)
    # film: projector + an old upright piano, in minor
    f0 = CUE['film']
    put(FX, projector(30.8 - f0), f0, 0.18)
    for i, (m, k) in enumerate([(65, 0), (68, 0.45), (72, 0.9), (70, 1.35), (68, 1.6), (67, 1.85)]):
        put(MUS, piano(m, 1.0), f0 + 0.1 + k, 0.3)
    put(MUS, piano(53, 2.0) + piano(60, 2.0), f0 + 0.1, 0.18)
    # Legends: low drone, FUSION boom, then "dun dun DUNNN"
    t = tt(32.4 - 30.8); put(MUS, np.sin(2 * np.pi * 55 * t) * 0.6 * np.clip(t / 0.4, 0, 1) * np.clip((1.6 - t) / 0.2, 0, 1), 30.8, 0.4)
    put(FX, riser(0.85), CUE['fusion'] - 0.85, 0.16)
    put(FX, boom(), CUE['fusion'], 0.9)
    put(FX, brass([48, 55, 60], 0.6, 1800), CUE['fusion'], 0.4)
    for k, (m, d) in enumerate([(60, 0.16), (60, 0.16), (56, 0.9)]):
        put(FX, brass([m, m + 7], d, 1500), 31.78 + k * 0.2, 0.45)
    # outro: the groove comes back for two bars and ends on a button
    o = CUE['outro']
    groove(o + 0.55, DUR - 0.5, o + 0.55, full)
    put(FX, brass([65, 69, 72, 77], 0.9, 3000), DUR - 0.55, 0.45)
    put(FX, kick(), DUR - 0.55, 0.8); put(FX, cymbal(1.2), DUR - 0.55, 0.3)

def save(path, x):
    x = np.clip(x, -1, 1)
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype(np.int16).tobytes())

if __name__ == '__main__':
    if not os.path.exists('game_sfx.wav') or os.environ.get('REGAME'):
        render_game('game_sfx.wav')
    game = load('game_sfx.wav')
    build_music()
    mus = MUS * 0.32
    fx = FX * 0.5
    mix = mus + fx + game * 0.7
    # gentle bus glue + peak at -1 dBFS
    mix = np.tanh(mix * 1.1) / 1.1
    mix *= 0.89 / max(1e-6, np.abs(mix).max())
    fade = np.clip((DUR - np.arange(N) / SR) / 0.35, 0, 1)[:, None]
    save('music.wav', mus); save('diver_audio.wav', mix * fade)
    print('peaks music/fx/game', round(float(np.abs(mus).max()), 3), round(float(np.abs(fx).max()), 3), round(float(np.abs(game).max()), 3))
