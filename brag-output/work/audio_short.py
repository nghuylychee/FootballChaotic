"""Soundtrack for one Short: music beds from edl.json + game SFX placed on the game's own logged events.
usage: python audio_short.py <ID>  -> short_<ID>.wav
One key (A minor, 160 BPM), SFX tuned to A and mixed under the music, one shared room."""
import sys, json
sys.path.insert(0, 'pylib')
import numpy as np
from scipy.signal import fftconvolve, butter, sosfilt
import wave

ID = sys.argv[1]
E = json.load(open('edl.json'))[ID]
SR = 44100
DUR = E['dur']
N = int(SR * DUR)
rng = np.random.default_rng(11)
BEAT = 60 / 160
S16 = BEAT / 4
POV = bool(E.get('pov'))

music = np.zeros((N, 2))
fx = np.zeros((N, 2))

def midi(m): return 440.0 * 2 ** ((m - 69) / 12)
def env(n, a=0.003, d=0.1, s=0.0, r=0.02):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * (s + (1 - s) * np.exp(-t / max(d, 1e-4)))
    rel = int(r * SR)
    if rel and n > rel: e[-rel:] *= np.linspace(1, 0, rel)
    return e
def square(f, n, duty=0.5):
    t = np.arange(n) / SR
    return np.where(((t * f) % 1) < duty, 1.0, -1.0)
def tri(f, n):
    t = np.arange(n) / SR
    return 2 * np.abs(2 * ((t * f) % 1) - 1) - 1
def lp(x, fc, order=2): return sosfilt(butter(order, fc, 'low', fs=SR, output='sos'), x)
def hp(x, fc, order=2): return sosfilt(butter(order, fc, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), x)
def add(buf, t, sig, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N or i + len(sig) <= 0: return
    if i < 0: sig = sig[-i:]; i = 0
    sig = sig[: N - i]
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[i:i + len(sig), 0] += sig * gain * l * 1.414
    buf[i:i + len(sig), 1] += sig * gain * r * 1.414

# ---------------- instruments ----------------
def kick(n=0.32):
    k = int(n * SR); t = np.arange(k) / SR
    f = 45 + 120 * np.exp(-t / 0.035)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.11) + 0.3 * rng.standard_normal(k) * np.exp(-t / 0.004)
def snare(n=0.22):
    k = int(n * SR); t = np.arange(k) / SR
    return bp(rng.standard_normal(k), 1200, 7000) * np.exp(-t / 0.06) * 0.9 + square(midi(57), k) * np.exp(-t / 0.03) * 0.25
def hat(open_=False):
    k = int((0.18 if open_ else 0.05) * SR); t = np.arange(k) / SR
    return hp(rng.standard_normal(k), 7000) * np.exp(-t / (0.06 if open_ else 0.012))
def crash(n=1.6):
    k = int(n * SR); t = np.arange(k) / SR
    return hp(rng.standard_normal(k), 4500) * np.exp(-t / 0.45)
def bassnote(m, n):
    k = int(n * SR)
    return lp(0.6 * square(midi(m), k) + 0.5 * tri(midi(m), k), 1400) * env(k, 0.002, n * 0.6, 0.4, 0.01)
def lead(m, n, duty=0.25):
    k = int(n * SR)
    return lp(square(midi(m), k, duty), 5200) * env(k, 0.002, n * 0.5, 0.35, 0.01)
def keys(m, n):
    # soft "piano": triangle + a little octave, slow decay
    k = int(n * SR)
    return lp(tri(midi(m), k) + 0.25 * tri(midi(m + 12), k), 2500) * env(k, 0.004, n * 0.45, 0.0, 0.05)

# ---------------- sfx (tuned to A) ----------------
def impact(size=1.0):
    k = int((0.5 + 0.5 * size) * SR); t = np.arange(k) / SR
    f = 55 + 165 * np.exp(-t / 0.05)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (0.16 + 0.2 * size)) * 0.9 + lp(rng.standard_normal(k), 2200) * np.exp(-t / 0.05) * 0.35 * size
def thump():
    k = int(0.25 * SR); t = np.arange(k) / SR
    f = 55 + 60 * np.exp(-t / 0.03)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.08) + lp(rng.standard_normal(k), 1500) * np.exp(-t / 0.015) * 0.3
def whoosh(n=0.3, up=True):
    k = int(n * SR); t = np.arange(k) / SR
    nz = rng.standard_normal(k); out = np.zeros(k); seg = 512
    for i in range(0, k, seg):
        p = i / k if up else 1 - i / k
        c = 400 + 3500 * p
        out[i:i + seg] = bp(nz[i:i + seg], c * 0.7, min(c * 1.4, 18000))[: len(out[i:i + seg])]
    return out * np.sin(np.pi * t / n) ** 1.5
def punch():
    k = int(0.09 * SR); t = np.arange(k) / SR
    return lp(rng.standard_normal(k), 3000) * np.exp(-t / 0.012) + np.sin(2 * np.pi * 110 * t) * np.exp(-t / 0.025) * 0.7
def blip(m, n=0.07):
    k = int(n * SR)
    return square(midi(m), k, 0.25) * env(k, 0.001, 0.04, 0, 0.005)
def click():
    k = int(0.03 * SR); t = np.arange(k) / SR
    return lp(rng.standard_normal(k), 2500) * np.exp(-t / 0.006)
def whistle(n=0.7):
    k = int(n * SR); t = np.arange(k) / SR
    f = midi(100) * (1 + 0.025 * np.sign(np.sin(2 * np.pi * 28 * t)))       # ref whistle trill, on E7 (5th of A)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.2 * bp(rng.standard_normal(k), 2000, 4000)
    return s * env(k, 0.01, 10, 1, 0.08) * 0.5
def cheer(n=2.2):
    k = int(n * SR); t = np.arange(k) / SR
    return bp(rng.standard_normal(k), 500, 3500) * np.minimum(1, t / 0.25) * np.exp(-np.maximum(0, t - 0.6) / 0.7)
def stinger(t0, gain):
    for i, m in enumerate([69, 72, 76, 81, 84]):
        add(fx, t0 + i * S16 / 2, blip(m, 0.09), gain * (0.6 + 0.1 * i), pan=-0.3 + 0.15 * i)
    add(fx, t0 - 0.05, whoosh(0.4), gain * 0.8)
def riser(n):
    k = int(n * SR); t = np.arange(k) / SR
    nz = rng.standard_normal(k); out = np.zeros(k); seg = 1024
    for i in range(0, k, seg):
        c = 300 + 6000 * (i / k) ** 2
        out[i:i + seg] = bp(nz[i:i + seg], c * 0.8, c * 1.3)[: len(out[i:i + seg])]
    return (out + lp(square(midi(45) * (1 + 3 * (t / t[-1]) ** 2), k) * 0.15, 3000)) * (t / t[-1]) ** 2
def heartbeat(t0, t1, gain=0.5):
    t = t0
    while t < t1:
        add(fx, t, thump(), gain); add(fx, t + 0.18, thump(), gain * 0.7); t += 0.62

# ---------------- music beds ----------------
CHORDS = [(57, [69, 72, 76]), (53, [65, 69, 72]), (48, [67, 72, 76]), (55, [67, 71, 74])]   # Am F C G
grooves = [m for m in E['music'] if m[0] == 'groove']
DROP = grooves[0][1] if grooves else 0.0
def grid(t0, t1):
    i = int(np.ceil((t0 - DROP) / S16 - 1e-6)); t = DROP + i * S16
    while t < t1 - 1e-6:
        yield i, t
        i += 1; t = DROP + i * S16
def groove(t0, t1, melodyFrom=None, light=False):
    for i, t in grid(t0, t1):
        step = i % 16
        root, tri_ = CHORDS[int(np.floor((t - DROP) / (4 * BEAT))) % 4]
        g = 0.7 if light else 1.0
        if step % 4 == 0: add(music, t, kick(), 0.9 * g)
        if step in (4, 12): add(music, t, snare(), 0.55 * g)
        add(music, t, hat(open_=(step % 4 == 2)), (0.10 if step % 2 == 0 else 0.055) * g, pan=0.35)
        if step % 2 == 0: add(music, t, bassnote(root - 12 + (12 if step % 4 == 2 else 0), S16 * 1.8), 0.42 * g)
        add(music, t, lead(tri_[step % 3], S16 * 0.9), 0.11 * g, pan=-0.25)
        if melodyFrom is not None and t >= melodyFrom and step % 4 == 0:
            add(music, t, lead(tri_[(step // 4) % 3] + 12, BEAT * 0.95, 0.5), 0.10 * g, pan=0.2)
def pulse(t0, t1):
    for i, t in grid(t0, t1):
        step = i % 16
        if step % 2 == 0: add(music, t, bassnote(45, S16 * 1.6), 0.4)
        if step % 4 == 0: add(music, t, kick(), 0.7)
        add(music, t, hat(), 0.06, pan=0.35)
def outro(t0, t1):
    n = t1 - t0
    for m, g in [(45, 0.4), (57, 0.25)]:
        add(music, t0, bassnote(m, n) * np.linspace(1, 0.2, int(n * SR)), g)
    for j, m in enumerate([69, 72, 76, 81]):
        k = int(n * SR)
        add(music, t0, lp(square(midi(m), k), 3000) * env(k, 0.005, 1.4, 0.2, 0.8), 0.07, pan=-0.4 + 0.25 * j)
    groove(t0, min(t1, t0 + 16 * S16 * 2), light=True)
def calm(t0, t1, fadeIn=0.0):
    # 4 slow soft chords, A minor 7 -> Fmaj7, under a calm arpeggio (90 BPM feel)
    b = 60 / 90
    seq = [(57, [69, 72, 76, 79]), (53, [65, 69, 72, 76])]
    t, k = t0, 0
    while t < t1 - 0.05:
        root, ch = seq[(k // 4) % 2]
        g = min(1.0, (t - t0) / fadeIn) if fadeIn else 1.0
        if k % 4 == 0: add(music, t, keys(root - 12, b * 4), 0.22 * g)
        add(music, t, keys(ch[k % 4], b * 1.6), 0.16 * g, pan=-0.2 + 0.13 * (k % 4))
        t += b / 2; k += 1
def var(t0, t1):
    k = int((t1 - t0) * SR)
    add(music, t0, lp(square(midi(33), k) * 0.5 + tri(midi(45), k), 600) * env(k, 0.05, 10, 1, 0.1), 0.25)
    for t in np.arange(t0 + 0.05, t1, 0.45): add(fx, t, blip(93, 0.06), 0.18)
def tension(t0, t1):
    for i, t in grid(t0, t1):
        if i % 4 == 0: add(music, t, bassnote(45, S16 * 3), 0.35)
        if i % 2 == 0: add(music, t, hat(), 0.05, pan=0.35)
    add(fx, t1 - 1.4, riser(1.4), 0.3)
def ingame(t0, t1, tense=False):
    # stand-in for the game's own in-match loop: quiet, steady, no edit accents
    for i, t in grid(t0, t1):
        step = i % 16
        root, tri_ = CHORDS[int(np.floor((t - DROP) / (4 * BEAT))) % 4]
        if step % 4 == 0: add(music, t, kick(), 0.35)
        if step in (4, 12): add(music, t, snare(), 0.16)
        if step % 2 == 0: add(music, t, bassnote(root - 12, S16 * 1.6), 0.2)
        add(music, t, hat(), 0.03, pan=0.3)
        if step % 2 == 1: add(music, t, lead(tri_[(step // 2) % 3], S16 * 0.8), 0.05, pan=-0.2)

for kind, t0, t1, o in E['music']:
    {'groove': groove, 'pulse': pulse, 'outro': outro, 'calm': calm, 'var': var, 'tension': tension, 'ingame': ingame}[kind](t0, t1, **o)

# ---------------- game SFX on the game's own logged events ----------------
metas = {}
def meta(c):
    if c not in metas: metas[c] = json.load(open(f'frames/{c}/meta.json'))
    return metas[c]
g_sfx = 1.0 if POV else 0.75          # PLAYER clips: raw game sound is the soundtrack
for s in E['segs']:
    rate = s.get('rate', 1)
    if not rate: continue
    c_end = s['c0'] + (s['v1'] - s['v0']) * rate
    if rate < 1: continue             # slowed replays stay quiet under the VAR bed
    for e in meta(s['clip'])['sfx']:
        c = e['t']
        if not (s['c0'] - 1e-6 <= c < c_end): continue
        v = s['v0'] + (c - s['c0']) / rate
        n = e['name']; p = rng.uniform(-0.25, 0.25)
        if n == 'hit': add(fx, v, punch(), 0.42 * g_sfx, p); add(fx, v, impact(0.6), 0.32 * g_sfx)
        elif n == 'tackle': add(fx, v, whoosh(0.18), 0.22 * g_sfx, p)
        elif n == 'whoosh': add(fx, v, whoosh(0.25), 0.25 * g_sfx, p)
        elif n == 'kick': add(fx, v, thump(), 0.4 * g_sfx); add(fx, v, click(), 0.25 * g_sfx)
        elif n == 'pass': add(fx, v, click(), 0.12 * g_sfx, p)
        elif n == 'save': add(fx, v, thump(), 0.35 * g_sfx)
        elif n == 'fire': add(fx, v, whoosh(0.5), 0.35 * g_sfx); add(fx, v, lp(rng.standard_normal(int(0.5 * SR)), 1800) * np.exp(-np.arange(int(0.5 * SR)) / SR / 0.2), 0.2 * g_sfx)
        elif n == 'goal': add(fx, v, impact(1.2), 0.5 * g_sfx); add(fx, v, crash(1.4), 0.2 * g_sfx); add(fx, v + 0.05, cheer(), 0.22 * g_sfx)
        elif n == 'whistle' and v > 0.2: add(fx, v, whistle(), 0.35)
        elif n == 'upgrade': stinger(v, 0.26)
        elif n == 'pick': [add(fx, v + i * 0.05, blip(m, 0.2), 0.14) for i, m in enumerate((69, 76, 81))]
for t0 in E.get('stingers', []): add(fx, t0 - 0.02, whoosh(0.3), 0.2)
for t0, size in E.get('boom', []):
    add(fx, t0, impact(size), 0.35); add(fx, t0, crash(0.9 + 0.4 * size), 0.1 * size)
if ID == 'C2': heartbeat(0.05, 2.4, 0.42)
if ID == 'END':   # key-clicks while the link types in, a chime when it lands
    for i in range(18): add(fx, 0.55 + i * 0.028 * (1 + (i % 3) * 0.1), click(), 0.16, pan=rng.uniform(-0.2, 0.2))
    for i, m in enumerate((69, 76, 81, 88)): add(fx, 1.08 + i * 0.06, blip(m, 0.22), 0.13)
    add(fx, 0.25, thump(), 0.45)
if ID == 'B1':   # the record stops dead on the dropkick
    music[int(2.2 * SR):int(2.42 * SR)] = 0
if ID == 'B2':   # VAR verdict stamp
    add(fx, 8.6, impact(1.1), 0.5); add(fx, 8.6, blip(81, 0.25), 0.15)

# ---------------- mix ----------------
mix = music * (0.55 if POV else 0.85) + fx * 0.85
ir_n = int(0.8 * SR); tt = np.arange(ir_n) / SR
ir = rng.standard_normal((ir_n, 2)) * np.exp(-tt / 0.2)[:, None]
ir = np.stack([lp(ir[:, 0], 5000), lp(ir[:, 1], 5000)], 1); ir /= np.abs(ir).sum(0) ** 0.5 * 12
wet = np.stack([fftconvolve(mix[:, c], ir[:, c])[:N] for c in range(2)], 1)
mix = hp((mix + wet * 0.2).T, 30).T
drive = 1.8 if POV else 1.1
mix = np.tanh(mix * drive) / np.tanh(drive)
fade = int(0.35 * SR); mix[-fade:] *= np.linspace(1, 0.6, fade)[:, None]   # short tail so the loop restarts cleanly
mix[: int(0.005 * SR)] *= np.linspace(0, 1, int(0.005 * SR))[:, None]
mix *= 0.89 / np.abs(mix).max()
with wave.open(f'short_{ID}.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())
print('wrote', f'short_{ID}.wav', DUR, 's, rms dBFS', round(20 * np.log10(np.sqrt((mix ** 2).mean())), 1))
