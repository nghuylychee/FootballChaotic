"""Soundtrack for the chill cut: lo-fi track + countryside ambience + the game's own ball sounds on logged events.
usage: python audio.py  -> chill_audio.wav (44.1 kHz stereo, DUR s)
Bar = 2.9 s (82.76 BPM) so the kickoff whistle (v 11.6) lands on bar 4 and the goal (v 17.36) on bar 6."""
import json, os
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR, DUR = 44100, 26.5
N = int(SR * DUR)
BAR = 2.9
BEAT = BAR / 4
rng = np.random.default_rng(7)
ROOT = os.path.join(os.path.dirname(__file__), '..', '..', '..')

def buf(): return np.zeros(N)
def at(t): return int(round(t * SR))
def add(dst, sig, t, g=1.0):
    i = at(t)
    if i >= N or i + len(sig) <= 0: return
    a, b = max(0, i), min(N, i + len(sig))
    dst[a:b] += sig[a - i:b - i] * g
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def midi(n): return 440.0 * 2 ** ((n - 69) / 12)

# ---------------- edit map (same EDL as chill_comp.html): clip time -> video time ----------------
def v_of(c):
    if c < 16.5: return c
    if c < 16.93: return 16.5 + (c - 16.5) / 0.5
    return 17.36 + (c - 16.93)

# ---------------- instruments ----------------
def ep(f, dur=2.6, vel=1.0):
    """electric piano: 2-op FM + bell tine, soft attack, long decay"""
    t = np.arange(int(dur * SR)) / SR
    idx = 1.2 * np.exp(-t * 3.0) + 0.25
    mod = np.sin(2 * np.pi * f * t) * idx
    car = np.sin(2 * np.pi * f * t + mod)
    tine = np.sin(2 * np.pi * f * 4.0 * t) * np.exp(-t * 9) * 0.12
    env = (1 - np.exp(-t * 180)) * np.exp(-t * 1.25)
    trem = 1 + 0.06 * np.sin(2 * np.pi * 4.2 * t)
    return (car + tine) * env * trem * vel

def bass(f, dur, vel=1.0):
    t = np.arange(int(dur * SR)) / SR
    env = (1 - np.exp(-t * 90)) * np.exp(-t * 1.6)
    s = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t) + 0.08 * np.sin(6 * np.pi * f * t)
    return s * env * vel

def kick():
    t = np.arange(int(0.35 * SR)) / SR
    f = 46 + 70 * np.exp(-t * 28)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) + 0.15 * rng.standard_normal(len(t)) * np.exp(-t * 120)

def snare():
    t = np.arange(int(0.3 * SR)) / SR
    n = bp(rng.standard_normal(len(t)), 900, 5000) * np.exp(-t * 18)
    body = np.sin(2 * np.pi * 185 * t) * np.exp(-t * 25)
    return n * 0.7 + body * 0.5

def hat(open_=False):
    t = np.arange(int((0.18 if open_ else 0.06) * SR)) / SR
    return hp(rng.standard_normal(len(t)), 7000) * np.exp(-t * (14 if open_ else 70))

def glock(f, vel=1.0):
    t = np.arange(int(1.6 * SR)) / SR
    s = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 6)
    return s * np.exp(-t * 3.2) * (1 - np.exp(-t * 400)) * vel

def whistle():
    t = np.arange(int(0.75 * SR)) / SR
    trill = 1 + 0.035 * np.sign(np.sin(2 * np.pi * 31 * t))
    f = 2850 * trill
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.35 * np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR)
    s += 0.25 * bp(rng.standard_normal(len(t)), 2000, 5000)
    env = np.minimum(1, t / 0.02) * np.where(t < 0.55, 1, np.exp(-(t - 0.55) * 30))
    return s * env

def chirp(f0, f1, dur):
    t = np.arange(int(dur * SR)) / SR
    f = f0 + (f1 - f0) * (t / dur) ** 0.7
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / dur) ** 1.5

def load(name):
    sr, d = wavfile.read(os.path.join(ROOT, 'assets', 'sfx', name + '.wav'))
    d = d.astype(np.float64) / 32768.0
    if d.ndim > 1: d = d.mean(axis=1)
    if sr != SR: d = np.interp(np.arange(int(len(d) * SR / sr)) * sr / SR, np.arange(len(d)), d)
    return d / (np.abs(d).max() + 1e-9)

# ---------------- music ----------------
# D major lo-fi: Gmaj9 · F#m7 · Em9 · A7sus4  |  Gmaj9 · F#m7 · Bm9 (goal) · Em9 · A7sus4 (loops back into Gmaj9)
CH = {
    'Gmaj9': (43, [59, 62, 66, 69]), 'F#m7': (42, [57, 61, 64, 69]), 'Em9': (40, [55, 59, 62, 66]),
    'A7sus': (45, [55, 59, 62, 64]), 'Bm9': (47, [57, 61, 62, 66]),
}
PROG = ['Gmaj9', 'F#m7', 'Em9', 'A7sus', 'Gmaj9', 'F#m7', 'Bm9', 'Em9', 'A7sus', 'Gmaj9']
keys, bs, drums, mel = buf(), buf(), buf(), buf()
for b, name in enumerate(PROG):
    t0 = b * BAR
    if t0 >= DUR: break
    root, notes = CH[name]
    # chord on 1 (strummed), soft re-hit on the "and" of 3
    for k, n in enumerate(notes):
        add(keys, ep(midi(n), 2.9, 0.55), t0 + k * 0.018)
        if b >= 2: add(keys, ep(midi(n), 1.3, 0.22), t0 + BEAT * 2.5 + k * 0.012)
    if b >= 2:
        add(bs, bass(midi(root), BEAT * 2.2, 0.9), t0)
        add(bs, bass(midi(root + (7 if b % 2 else 12)), BEAT * 1.2, 0.55), t0 + BEAT * 2.5)
    # drums: hats from bar 2, full kit bar 4..8 (the last bar breathes out)
    for s in range(8):
        ht = t0 + s * BEAT / 2 + (BEAT * 0.12 if s % 2 else 0)
        if 2 <= b <= 8: add(drums, hat(open_=(s == 7 and b % 2 == 1)), ht, 0.10 if b < 4 else 0.14)
    if 4 <= b <= 7:
        add(drums, kick(), t0, 0.85); add(drums, kick(), t0 + BEAT * 1.75, 0.45); add(drums, kick(), t0 + BEAT * 2.5, 0.7)
        add(drums, snare(), t0 + BEAT, 0.42); add(drums, snare(), t0 + BEAT * 3, 0.42)
    elif b in (2, 3):
        add(drums, kick(), t0, 0.35)
# little glockenspiel motif from the goal onward (bars 6-8)
MOT = [(0, 78), (0.5, 76), (1, 74), (1.5, 73), (2.5, 74), (3, 76)]
for b in (6, 7, 8):
    for bt, n in MOT[: 6 if b < 8 else 4]:
        add(mel, glock(midi(n), 0.35), b * BAR + bt * BEAT)
# goal sparkle: rising arpeggio on the downbeat of bar 6
for k, n in enumerate([74, 78, 81, 85, 86]):
    add(mel, glock(midi(n), 0.3), 6 * BAR + k * 0.07)

keys = lp(keys, 3800); bs = lp(bs, 900); drums = lp(drums, 6500)
music = keys * 0.5 + bs * 0.55 + drums * 0.8 + mel * 0.45
# tape wobble-ish warmth: gentle saturation
music = np.tanh(music * 1.3) / 1.3
# slow-mo on the shot: the music goes underwater, then opens on the goal
v = np.arange(N) / SR
muf = lp(music, 500, 2)
wet = np.clip((v - 16.3) / 0.35, 0, 1) * np.clip((17.36 - v) / 0.06, 0, 1)
music = music * (1 - wet) + muf * wet * 1.1
# fade in the first beat, leave the tail open for the loop
music *= np.clip(v / 0.25, 0, 1) * np.clip((DUR - v) / 0.35, 0, 1)

# ---------------- ambience ----------------
amb = buf()
# vinyl: hiss + crackle
hiss = bp(rng.standard_normal(N), 1500, 9000) * 0.010
crk = np.zeros(N); idx = rng.integers(0, N, 420); crk[idx] = rng.uniform(-1, 1, len(idx)) * rng.uniform(0.1, 0.6, len(idx))
crk = hp(crk, 1200) * 0.20
# wind: low pink-ish noise, slow swell
wind = lp(rng.standard_normal(N), 500) * (0.6 + 0.4 * np.sin(2 * np.pi * v / 7.3)) * 0.055
amb += hiss + crk + wind
# birds: busy at the start, sparse later; crickets as the sun goes down
def bird_phrase(t0, base):
    t = t0
    for _ in range(rng.integers(2, 5)):
        d = rng.uniform(0.05, 0.12)
        add(amb, chirp(base * rng.uniform(0.9, 1.1), base * rng.uniform(1.25, 1.6), d), t, 0.05)
        t += d + rng.uniform(0.03, 0.09)
for t0 in np.concatenate([rng.uniform(0.2, 7, 9), rng.uniform(7, 24, 7)]):
    bird_phrase(t0, rng.uniform(2600, 4200))
ct = np.arange(N) / SR
cr = np.sin(2 * np.pi * 4600 * ct) * (np.sin(2 * np.pi * 28 * ct) > 0.3) * (np.sin(2 * np.pi * 1.6 * ct) > 0.2)
amb += cr * np.clip((v - 19) / 3, 0, 1) * 0.012

# ---------------- game events ----------------
meta = json.load(open(os.path.join(os.path.dirname(__file__), 'frames', 'sunday', 'meta.json')))
fx = buf()
P = [load('ball_pass_1'), load('ball_pass_2'), load('ball_pass_3')]
K = load('ball_kick_mid')
for i, e in enumerate(meta['sfx']):
    t = v_of(e['t'])
    if e['name'] == 'whistle': add(fx, whistle(), t, 0.16)
    elif e['name'] == 'pass': add(fx, P[i % 3], t, 0.42)
    elif e['name'] == 'touch' and t > 11: add(fx, P[0], t, 0.16)
    elif e['name'] == 'kick': add(fx, K, t, 0.55)
    elif e['name'] == 'goal':
        tt = np.arange(int(0.6 * SR)) / SR
        add(fx, bp(rng.standard_normal(len(tt)), 900, 4500) * np.exp(-tt * 7), t, 0.22)   # net
        # a handful of villagers: small cheer + claps
        tt = np.arange(int(2.4 * SR)) / SR
        swell = np.clip(tt / 0.25, 0, 1) * np.exp(-np.maximum(0, tt - 0.5) * 1.6)
        cheer = bp(rng.standard_normal(len(tt)), 400, 2200) * swell * (1 + 0.3 * np.sin(2 * np.pi * 5 * tt))
        add(fx, cheer, t + 0.05, 0.05)
        for c in rng.uniform(0.15, 2.4, 22):
            n = int(0.03 * SR); add(fx, bp(rng.standard_normal(n), 800, 3500) * np.exp(-np.arange(n) / SR * 120), t + c, 0.05)
# final whistle-free ending: footsteps not needed. A last distant whistle "for the restart"? no — keep it calm.

mix = music * 0.9 + amb + fx
mix = np.tanh(mix * 1.1) / 1.1
mix /= np.abs(mix).max() / 0.89
# stereo: ambience + crackle slightly wide, music centred
L = mix + 0.5 * (hiss - crk) * 0.3
R = mix - 0.5 * (hiss - crk) * 0.3
st = np.stack([L, R], 1)
st /= np.abs(st).max() / 0.89
wavfile.write(os.path.join(os.path.dirname(__file__), 'chill_audio.wav'), SR, (st * 32767).astype(np.int16))
rms = 20 * np.log10(np.sqrt((mix ** 2).mean()) + 1e-9)
print('written chill_audio.wav', round(DUR, 2), 's, rms dBFS', round(rms, 1))
