"""Soundtrack for DEAR DIARY: the game's own SFX (rendered offline from the logged events, mapped through edl.json),
a slow ukulele lullaby under the diary pages that carries on into each match and cuts dead on the gag, then crickets.
The pen is the narrator: one scratch per handwritten letter (times come from comp.html's events()), red-marker squeaks,
page turns, a card taped on. All synthesized here.
usage: python audio.py   -> game_sfx.wav, music.wav, diary_audio.wav  (needs the repo served at http://127.0.0.1:8765)"""
import json, base64, wave, os
import numpy as np
from playwright.sync_api import sync_playwright

SR = 44100
E = json.load(open('edl.json'))
DUR = E['dur']
N = int(DUR * SR)
rng = np.random.default_rng(7)
GAME = [s for s in E['segs'] if s.get('take')]
PAGES = [s for s in E['segs'] if s.get('mode') == 'page']

# ---------------------------------------------------------------- game SFX (real WebAudio recipes, offline)
def game_events():
    metas, out = {}, []
    for s in GAME:
        if s['r'] <= 0:
            continue
        m = metas.setdefault(s['take'], json.load(open(f"frames/{s['take']}/meta.json")))
        c0, c1 = s['c0'], s['c0'] + (s['v1'] - s['v0']) * s['r']
        for e in m['sfx']:
            if c0 <= e['t'] < c1 and e['name'] != 'touch':
                out.append({'t': s['v0'] + (e['t'] - c0) / s['r'], 'name': e['name'], 'arg': e.get('arg')})
    out += E.get('extra', [])   # sounds that fired just before a cut point
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
        pg.goto('http://127.0.0.1:8765/brag-output/diary/work/blank.html')
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

def whistle(d=0.32):
    t = tt(d); x = np.sin(2 * np.pi * 2950 * t) * (0.65 + 0.35 * np.sign(np.sin(2 * np.pi * 34 * t)))
    return (x + 0.15 * hp(rng.standard_normal(len(t)), 4000)) * np.clip(t / 0.01, 0, 1) * np.clip((d - t) / 0.03, 0, 1)
def roomtone(d):
    t = tt(d); return lpv(rng.standard_normal(len(t)), 500) * 0.5


# ---------------------------------------------------------------- the diary lullaby (C, 84 BPM): ukulele, soft bass, glockenspiel
# each Day starts its own phrase at t0 and is cut dead at t1 (the gag)
BPM_B = 84; S16 = 60 / BPM_B / 4; BAR_B = S16 * 16
BED = [(36, [60, 64, 67, 72], [(0, 79), (6, 76), (8, 72), (12, 74)]),
       (33, [57, 60, 64, 69], [(0, 76), (6, 72), (8, 69), (12, 71)]),
       (29, [57, 60, 65, 69], [(0, 72), (4, 74), (6, 76), (8, 77), (12, 76)]),
       (31, [55, 59, 62, 67], [(0, 74), (6, 71), (8, 67), (14, 71)])]
def strum(ms, down=True, g=1.0):
    seq = ms if down else ms[::-1]; n = int(0.6 * SR); out = np.zeros(n)
    for k, m in enumerate(seq):
        x = pluck(m, 0.55, 0.499); i = int(k * 0.014 * SR); out[i:i + len(x)] += x[:n - i] * (1 - 0.12 * k)
    return out * g / len(ms)
def glock(m, d=0.9):
    t = tt(d); f = midi(m)
    return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2.76 * f * t) * np.exp(-t * 9)) * env(t, 0.001, 0.35)
def bed(t0, t1, gain=1.0, mel=True):
    buf = np.zeros((N, 2), np.float32)
    b = 0
    while t0 + b * BAR_B < t1:
        root, ch, ml = BED[b % 4]; bt = t0 + b * BAR_B
        for st in range(16):
            t = bt + st * S16
            if t >= t1: break
            if st in (0, 6, 8, 12): put(buf, strum(ch, st != 6, 0.9 if st in (0, 8) else 0.6), t, 0.55 * gain, -0.25)
            if st in (0, 8): put(buf, bass(root + 12, S16 * 6), t, 0.3 * gain)
            if st in (4, 12): put(buf, shaker(0.5), t, 0.18 * gain, 0.3)
            if mel:
                for s_, m in ml:
                    if s_ == st: put(buf, glock(m), t, 0.17 * gain, 0.25)
        b += 1
    # cut dead (15 ms) at t1
    i1 = int(t1 * SR); n = min(int(0.015 * SR), max(0, N - i1))
    if n:
        buf[i1:i1 + n] *= np.linspace(1, 0, n)[:, None]; buf[i1 + n:] = 0
    MUS[:] += buf

# ---------------------------------------------------------------- the pen is the narrator
def pen_scratch(ch, shaky=False):
    d = rng.uniform(0.035, 0.06) * (1.4 if shaky else 1); t = tt(d)
    n = bp(rng.standard_normal(len(t)), 2200, 7000)
    wob = 0.55 + 0.45 * np.sin(2 * np.pi * rng.uniform(35, 80) * t + rng.uniform(0, 6))
    x = n * np.clip(t / 0.004, 0, 1) * np.exp(-t / (d * 0.55)) * wob
    if ch in '.,!':   # a dot: a tap
        tp = tt(0.03); x = np.concatenate([x[:len(x) // 3], np.zeros(int(0.03 * SR))])
        x[:len(tp)] += 0.6 * lpv(rng.standard_normal(len(tp)), 1500) * np.exp(-tp / 0.006)
    return x
def squeak(d):
    t = tt(d); f = rng.uniform(1300, 1800) * (1 + 0.12 * np.sin(2 * np.pi * rng.uniform(3, 6) * t))
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.3 * (0.6 + 0.4 * np.sin(2 * np.pi * 21 * t))
    felt = bp(rng.standard_normal(len(t)), 1200, 5000) * 0.8
    return (tone + felt) * np.clip(t / 0.01, 0, 1) * np.clip((d - t) / 0.03, 0, 1)
def scribble_snd(d):
    t = tt(d); return bp(rng.standard_normal(len(t)), 1800, 6500) * np.abs(np.sin(2 * np.pi * 7.5 * t)) ** 0.7 * np.clip((d - t) / 0.04, 0, 1)
def page_flip():
    d = 0.55; t = tt(d); n = rng.standard_normal(len(t))
    sw = bp(n, 600, 5000) * np.sin(np.pi * np.clip(t / 0.45, 0, 1)) ** 2 * (0.7 + 0.3 * np.sin(2 * np.pi * 34 * t))
    flap = lpv(rng.standard_normal(len(t)), 900) * np.exp(-np.clip(t - 0.4, 0, None) / 0.03) * (t > 0.4) * 1.6
    return sw + flap
def tape_slap():
    t = tt(0.4)
    thump = np.sin(2 * np.pi * (110 + 80 * np.exp(-t * 40)) * t) * np.exp(-t / 0.05)
    snap = bp(rng.standard_normal(len(t)), 1500, 8000) * np.exp(-t / 0.012)
    rip = bp(rng.standard_normal(len(t)), 2500, 9000) * (np.abs(np.sin(2 * np.pi * 90 * t)) > 0.6) * np.exp(-np.clip(t - 0.12, 0, None) / 0.05) * (t > 0.12) * 0.5
    return thump + 0.8 * snap + rip

# ---------------------------------------------------------------- timing: page events from comp.html, gags from the takes
def page_events():
    with sync_playwright() as p:
        b = p.chromium.launch(channel='chrome')
        pg = b.new_page(viewport={'width': 1080, 'height': 1920})
        pg.goto('http://127.0.0.1:8765/brag-output/diary/work/comp.html')
        pg.evaluate('window.ready')
        ev = pg.evaluate('events()')
        b.close()
    json.dump(ev, open('page_events.json', 'w'), indent=0)
    return ev
def vt(take, c):
    for s in GAME:
        if s['take'] == take and s['r'] > 0 and s['c0'] <= c < s['c0'] + (s['v1'] - s['v0']):
            return s['v0'] + (c - s['c0'])
    raise ValueError(f'{take} {c} not in the edit')
def sfx_t(take, name, arg=None):
    m = json.load(open(f'frames/{take}/meta.json'))
    return next(e['t'] for e in m['sfx'] if e['name'] == name and (arg is None or e.get('arg') == arg))

def build():
    ev = page_events()
    flips = [e['t'] for e in ev if e['kind'] == 'flip']
    C = {
        'bonk': vt('village', sfx_t('village', 'hit')),
        'flop': vt('rooftop', json.load(open('frames/rooftop/meta.json'))['marks']['flop']),
        'smash': vt('refs', sfx_t('refs', 'hit')),
        'whistle': vt('refs', sfx_t('refs', 'whistle')),
        'reel': vt('leo', sfx_t('leo', 'ult', 'mod.reel')),
        'fuse': vt('leo', sfx_t('leo', 'ult', 'mod.fuse')),
        'bump': vt('leo', sfx_t('leo', 'hit', 'hard')),
        'goal': vt('leo', sfx_t('leo', 'goal')),
    }
    C['freeze'] = next(s['v0'] for s in GAME if s.get('freeze'))
    d5 = PAGES[-1]
    C['d5'] = d5['v0']; C['under'] = d5['v0'] + d5['under']['at']; C['logo'] = d5['v0'] + d5['outro']
    print('cues', {k: round(v, 2) for k, v in C.items()}, 'flips', [round(f, 2) for f in flips])

    # every Day: the lullaby starts with the page and runs on into the match... until the gag
    for a, b in [(0.0, C['bonk']), (flips[0], C['flop']), (flips[1], C['smash']), (flips[2], C['reel'])]:
        bed(a, b, 1.0)
    # awkward silence after each gag, through the P.S.
    for a, b in [(C['bonk'] + 0.7, flips[0]), (C['flop'] + 0.7, flips[1]), (C['smash'] + 0.9, C['whistle'] - 0.1), (C['freeze'] + 1.3, flips[2])]:
        put(FX, crickets(b - a), a, 0.08, 0.4)
    # gags
    put(FX, woodblock(700), C['bonk'], 0.95); put(FX, cymbal(1.0), C['bonk'] + 0.04, 0.3)
    put(FX, slide_down(), C['flop'] - 0.05, 0.32)
    put(FX, brass([52, 59, 64], 0.3, 2200), C['smash'], 0.42); put(FX, cymbal(1.0), C['smash'], 0.3)
    put(FX, whistle(0.55), C['whistle'], 0.2)
    put(FX, brass([55, 62], 0.32, 1500), C['freeze'] + 0.25, 0.42)
    put(FX, brass([54, 61], 0.75, 1200), C['freeze'] + 0.62, 0.42)
    # Day 4 -> King Leo: the old film reel stops the music, riser, FUSION boom, "dun dun DUNNN", taiko, the bump, their goal
    put(FX, projector(C['fuse'] - C['reel']), C['reel'], 0.12)
    put(FX, riser(1.2), C['fuse'] - 1.2, 0.18)
    put(FX, boom(), C['fuse'], 0.6)
    put(FX, brass([40, 47, 52], 0.5, 1600), C['fuse'], 0.42)
    for k, (m, d) in enumerate([(52, 0.16), (52, 0.16), (48, 0.85)]): put(FX, brass([m, m + 7], d, 1500), C['fuse'] + 0.35 + k * 0.2, 0.42)
    for k in np.arange(C['fuse'] + 1.0, C['goal'] + 0.3, 60 / 132): put(FX, taiko(), k, 0.42)
    put(FX, cymbal(1.2), C['bump'], 0.3); put(FX, boom(1.0), C['bump'], 0.32)
    put(FX, brass([40, 46, 52], 0.9, 1400), C['goal'], 0.4)

    # the pen: one scratch per letter, marker squeaks, scribbles, page turns, the card
    for e in ev:
        k, t = e['kind'], e['t']
        if k == 'char': put(FX, pen_scratch(e['ch'], e['shaky']), t, rng.uniform(0.34, 0.5) * (0.85 if e['shaky'] else 1), rng.uniform(-0.15, 0.15))
        elif k == 'flip': put(FX, page_flip(), t, 0.4, 0.2)
        elif k == 'horns':
            for a, d in [(0, 0.34), (0.38, 0.34), (0.76, 0.08), (0.86, 0.08)]: put(FX, squeak(d), t + a, 0.34, -0.1)
        elif k == 'scribble': put(FX, scribble_snd(e['dur']), t, 0.45)
        elif k == 'card': put(FX, tape_slap(), t + 0.12, 0.42)
        elif k == 'under':
            put(FX, squeak(0.22), t, 0.34); put(FX, squeak(0.22), t + 0.25, 0.34)
    # after each P.S.: a small deflated "plunk... plonk"
    ends = {e['text']: e['t'] for e in ev if e['kind'] == 'rowEnd'}
    ps1, ps2, ps3 = ends['P.S. They have a stool.'], ends['P.S. I need a new hat.'], ends["I don't know why."]
    put(MUS, pluck(60, 0.9, 0.499), ps1 + 0.25, 0.5, -0.2); put(MUS, pluck(55, 1.2, 0.499), ps1 + 0.6, 0.55, -0.2)
    put(FX, glock(72, 0.8), ps2 + 0.25, 0.14, 0.3); put(FX, glock(67, 1.1), ps2 + 0.6, 0.14, 0.3)
    put(MUS, strum([57, 60, 64, 69], True, 0.8), ps3 + 0.3, 0.45, -0.2)
    # Day 5: the singed page. silence and crickets, the shaky pen... "still" underlined, a strum, the lullaby comes back for the logo
    put(FX, crickets(C['under'] - C['d5'] - 0.2), C['d5'] + 0.15, 0.06, 0.4)
    put(FX, strum([60, 64, 67, 72], True, 1.0), C['under'] + 0.2, 0.5, -0.2); put(FX, glock(84, 1.2), C['under'] + 0.25, 0.2, 0.3)
    bed(C['under'] + 0.55, DUR - 0.55, 1.5)
    put(MUS, strum([60, 64, 67, 72], True, 1.0), DUR - 0.55, 0.8, -0.2); put(MUS, bass(48, 0.5), DUR - 0.55, 0.4); put(FX, glock(84, 1.0), DUR - 0.55, 0.22, 0.3)

def save(path, x):
    x = np.clip(x, -1, 1)
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype(np.int16).tobytes())

if __name__ == '__main__':
    if not os.path.exists('game_sfx.wav') or os.environ.get('REGAME'):
        render_game('game_sfx.wav')
    game = load('game_sfx.wav')
    build()
    mus = MUS * 0.55
    fx = FX * 0.5
    mix = mus + fx + game * 0.7
    mix = np.tanh(mix * 1.1) / 1.1
    mix *= 0.89 / max(1e-6, np.abs(mix).max())
    fade = np.clip((DUR - np.arange(N) / SR) / 0.35, 0, 1)[:, None]
    save('music.wav', mus); save('diary_audio.wav', mix * fade)
    print('peaks music/fx/game', round(float(np.abs(mus).max()), 3), round(float(np.abs(fx).max()), 3), round(float(np.abs(game).max()), 3))
