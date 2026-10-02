"""Soundtrack for one Short: music beds from edl.json + game SFX placed on the game's own logged events.
usage: python audio_short.py <ID>  -> short_<ID>.wav
One key (A minor, 160 BPM), SFX tuned to A and mixed under the music, one shared room."""
import sys, json
sys.path.insert(0, 'pylib')
import numpy as np
from scipy.signal import fftconvolve, butter, sosfilt
import wave

ID = 'TEASER'
E = json.load(open('edl_teaser.json'))
SR = 44100
DUR = E['dur']
N = int(SR * DUR)
rng = np.random.default_rng(11)
BEAT = 60 / 160
S16 = BEAT / 4
POV = False

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


M = E['marks']
DROP = 0.0
CHORDS = [(57, [69, 72, 76]), (53, [65, 69, 72]), (48, [67, 72, 76]), (55, [67, 71, 74])]   # Am F C G
def grid(t0, t1, step=S16):
    i = int(np.ceil((t0 - DROP) / step - 1e-6)); t = DROP + i * step
    while t < t1 - 1e-6:
        yield i, t
        i += 1; t = DROP + i * step
def groove(t0, t1, melody=False, big=False, light=False):
    for i, t in grid(t0, t1):
        step = i % 16
        root, tri_ = CHORDS[int(np.floor((t - DROP) / (4 * BEAT))) % 4]
        g = 0.75 if light else 1.0
        if step % 4 == 0: add(music, t, kick(), 0.9 * g)
        if step in (4, 12): add(music, t, snare(), 0.55 * g)
        add(music, t, hat(open_=(step % 4 == 2)), (0.10 if step % 2 == 0 else 0.055) * g, pan=0.35)
        if big and step % 2 == 1: add(music, t, hat(), 0.04, pan=-0.35)
        if big and step == 0: add(music, t, crash(1.2), 0.1)
        if step % 2 == 0: add(music, t, bassnote(root - 12 + (12 if step % 4 == 2 else 0), S16 * 1.8), 0.42 * g)
        add(music, t, lead(tri_[step % 3], S16 * 0.9), 0.11 * g, pan=-0.25)
        if melody and step % 4 == 0: add(music, t, lead(tri_[(step // 4) % 3] + 12, BEAT * 0.95, 0.5), 0.10 * g, pan=0.2)
def halftime(t0, t1):
    for i, t in grid(t0, t1):
        step = i % 16
        if step == 0: add(music, t, kick(), 0.8)
        if step == 8: add(music, t, snare(), 0.5)
        if step % 4 == 0: add(music, t, bassnote(45, S16 * 3.5), 0.38)
        if step % 2 == 0: add(music, t, hat(), 0.04, pan=0.35)
def drone(t0, t1, gain=0.25):
    k = int((t1 - t0) * SR)
    add(music, t0, lp(square(midi(33), k) * 0.5 + tri(midi(45), k), 500) * env(k, 0.02, 10, 1, 0.3), gain)
def keysbed(t0, t1):
    seq = [(57, [69, 72, 76, 79])]
    t, k = t0, 0
    while t < t1 - 0.05:
        if k % 8 == 0: add(music, t, keys(45, BEAT * 8), 0.2)
        add(music, t, keys([69, 72, 76, 79][k % 4], BEAT * 1.6), 0.15, pan=-0.2 + 0.13 * (k % 4))
        t += BEAT / 2; k += 1

# 0 cold open: soft keys + distant crowd, cut dead at the impact
keysbed(0.0, M['kick'])
add(fx, 0.0, lp(rng.standard_normal(int(M['kick'] * SR)), 900) * 0.6, 0.05)
# freeze + slow-mo: silence, a long low whoosh, impact with a big tail
add(fx, M['kick'], impact(1.6), 0.6); add(fx, M['kick'], crash(2.0), 0.18); add(fx, M['kick'], punch(), 0.5)
add(fx, M['kick'] + 0.4, whoosh(0.7, up=False), 0.25)
add(fx, M['title'] - 0.6, riser(0.6), 0.25)
# title drop
add(fx, M['title'], impact(1.5), 0.5); add(fx, M['title'], crash(2.0), 0.2)
groove(M['title'], M['esc1'])
add(fx, M['esc1'] - 3.0, riser(3.0), 0.32)
# break: silence -> boss slam -> drone with a ticking pulse
add(fx, M['brk'] + 0.3, impact(1.6), 0.6); add(fx, M['brk'] + 0.3, crash(2.2), 0.16)
drone(M['brk'] + 0.3, M['bar0'])
for i, t in grid(M['brk'] + 0.3 + BEAT, M['bar0'], BEAT): add(fx, t, thump(), 0.22)
add(fx, M['bar0'] - 0.75, riser(0.75), 0.3)
# ultimate barrage: full groove + melody, a stinger on every cut-in
groove(M['bar0'], M['cl'] + 2 * BEAT * 3 + BEAT * 2, melody=True, big=True)
for t0 in E['stingers']: stinger(t0 + 0.01, 0.15); add(fx, t0 - 0.02, whoosh(0.3), 0.16)
# climax: groove keeps going through the cut-in, then half-time + heartbeat, silence on the slow-mo, explode on the goal
ht0 = M['slow0'] - 4 * BEAT
music[int(ht0 * SR):] = 0
halftime(ht0, M['slow0'])
heartbeat(ht0, M['goal'] - 0.1, 0.45)
add(fx, M['slow0'], whoosh(1.1, up=True), 0.22)
add(fx, M['goal'], impact(1.8), 0.65); add(fx, M['goal'], crash(2.4), 0.22); add(fx, M['goal'] + 0.05, cheer(3.0), 0.3)
groove(M['goal'], M['end'], melody=True, big=True)
# end: hold the chord, logo hit
n = E['dur'] - M['end']
for m, gn in [(45, 0.4), (57, 0.25)]:
    add(music, M['end'], bassnote(m, n) * np.linspace(1, 0.15, int(n * SR)), gn)
for j, m in enumerate([69, 72, 76, 81]):
    k = int(n * SR)
    add(music, M['end'], lp(square(midi(m), k), 3000) * env(k, 0.005, 1.6, 0.2, 1.0), 0.07, pan=-0.4 + 0.25 * j)
add(fx, M['end'] + 0.1, impact(1.4), 0.45); add(fx, M['end'] + 0.1, crash(2.0), 0.15)
add(fx, M['end'] + 0.85, thump(), 0.35)

# game sfx on the game's own events (normal-speed segments only)
metas = {}
def meta(c):
    if c not in metas: metas[c] = json.load(open(f'frames/{c}/meta.json'))
    return metas[c]
for s in E['segs']:
    rate = s.get('rate', 1)
    if rate != 1 or s['v0'] >= M['end']: continue
    c_end = s['c0'] + (s['v1'] - s['v0'])
    for e in meta(s['clip'])['sfx']:
        c = e['t']
        if not (s['c0'] - 1e-6 <= c < c_end): continue
        v = s['v0'] + (c - s['c0']); nme = e['name']; p = rng.uniform(-0.25, 0.25)
        if abs(v - M['goal']) < 0.05: continue
        if nme == 'hit': add(fx, v, punch(), 0.4, p); add(fx, v, impact(0.6), 0.3)
        elif nme == 'kick': add(fx, v, thump(), 0.4); add(fx, v, click(), 0.22)
        elif nme == 'fire': add(fx, v, whoosh(0.5), 0.3)
        elif nme == 'zap': add(fx, v, blip(93, 0.12), 0.1); add(fx, v, whoosh(0.3), 0.2)
        elif nme == 'goal': add(fx, v, impact(1.1), 0.45); add(fx, v, crash(1.2), 0.15); add(fx, v, cheer(1.5), 0.15)
        elif nme == 'wall': add(fx, v, thump(), 0.3)
for s in E['segs']:
    for v in s.get('punch', []):
        if v not in (M['kick'], M['goal']): add(fx, v, impact(0.9), 0.25)

# mix
mix = music * 0.85 + fx * 0.85
ir_n = int(0.9 * SR); tt = np.arange(ir_n) / SR
ir = rng.standard_normal((ir_n, 2)) * np.exp(-tt / 0.25)[:, None]
ir = np.stack([lp(ir[:, 0], 5000), lp(ir[:, 1], 5000)], 1); ir /= np.abs(ir).sum(0) ** 0.5 * 12
wet = np.stack([fftconvolve(mix[:, c], ir[:, c])[:N] for c in range(2)], 1)
mix = hp((mix + wet * 0.22).T, 30).T
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
fade = int(1.4 * SR); mix[-fade:] *= np.linspace(1, 0.0, fade)[:, None] ** 1.5
mix[: int(0.01 * SR)] *= np.linspace(0, 1, int(0.01 * SR))[:, None]
mix *= 0.89 / np.abs(mix).max()
with wave.open('teaser.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())
print('wrote teaser.wav', DUR, 's, rms dBFS', round(20 * np.log10(np.sqrt((mix ** 2).mean())), 1))
