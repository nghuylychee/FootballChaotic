"""Soundtrack: one chiptune piece (A minor, 160 BPM) with SFX in the same key and room, timed to the edit."""
import json
import numpy as np
from scipy.signal import fftconvolve, butter, sosfilt
import wave

SR = 44100
DUR = 21.85
N = int(SR * DUR)
rng = np.random.default_rng(3)
BEAT = 60 / 160
S16 = BEAT / 4
DROP = 2.60                      # the groove's downbeat = the logo cut

music = np.zeros((N, 2))
fx = np.zeros((N, 2))

def midi(m): return 440.0 * 2 ** ((m - 69) / 12)
def env(n, a=0.003, d=0.1, s=0.0, r=0.02):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * (s + (1 - s) * np.exp(-t / max(d, 1e-4)))
    rel = int(r * SR)
    if rel and n > rel: e[-rel:] *= np.linspace(1, 0, rel)
    return e
def square(f, n, duty=0.5, ph=0):
    t = np.arange(n) / SR
    return np.where(((t * f + ph) % 1) < duty, 1.0, -1.0)
def tri(f, n):
    t = np.arange(n) / SR
    return 2 * np.abs(2 * ((t * f) % 1) - 1) - 1
def lp(x, fc, order=2):
    return sosfilt(butter(order, fc, 'low', fs=SR, output='sos'), x)
def hp(x, fc, order=2):
    return sosfilt(butter(order, fc, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi):
    return sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), x)
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
    nz = bp(rng.standard_normal(k), 1200, 7000) * np.exp(-t / 0.06)
    body = square(midi(57), k, 0.5) * np.exp(-t / 0.03) * 0.25   # tuned to A3
    return nz * 0.9 + body
def hat(open_=False):
    k = int((0.18 if open_ else 0.05) * SR); t = np.arange(k) / SR
    return hp(rng.standard_normal(k), 7000) * np.exp(-t / (0.06 if open_ else 0.012))
def crash(n=1.6):
    k = int(n * SR); t = np.arange(k) / SR
    return hp(rng.standard_normal(k), 4500) * np.exp(-t / 0.45)
def bassnote(m, n):
    k = int(n * SR)
    s = 0.6 * square(midi(m), k, 0.5) + 0.5 * tri(midi(m), k)
    return lp(s, 1400) * env(k, 0.002, n * 0.6, 0.4, 0.01)
def lead(m, n, duty=0.25, vib=False):
    k = int(n * SR)
    s = square(midi(m), k, duty)
    return lp(s, 5200) * env(k, 0.002, n * 0.5, 0.35, 0.01)

# ---------------- sfx (tuned to A, sits under the music) ----------------
def impact(size=1.0):
    k = int((0.5 + 0.5 * size) * SR); t = np.arange(k) / SR
    f = 55 + 165 * np.exp(-t / 0.05)                      # A3 -> A1 drop
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (0.16 + 0.2 * size))
    crunch = lp(rng.standard_normal(k), 2200) * np.exp(-t / 0.05)
    return boom * 0.9 + crunch * 0.35 * size
def thump():
    k = int(0.25 * SR); t = np.arange(k) / SR
    f = 55 + 60 * np.exp(-t / 0.03)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.08) + lp(rng.standard_normal(k), 1500) * np.exp(-t / 0.015) * 0.3
def whoosh(n=0.35, up=True):
    k = int(n * SR); t = np.arange(k) / SR
    nz = rng.standard_normal(k)
    out = np.zeros(k); seg = 512
    for i in range(0, k, seg):
        p = i / k if up else 1 - i / k
        c = 400 + 3500 * p
        out[i:i + seg] = bp(nz[i:i + seg], c * 0.7, min(c * 1.4, 18000))[: len(out[i:i + seg])]
    return out * np.sin(np.pi * t / n) ** 1.5
def punch():
    k = int(0.08 * SR); t = np.arange(k) / SR
    return lp(rng.standard_normal(k), 3000) * np.exp(-t / 0.012) + np.sin(2 * np.pi * 110 * t) * np.exp(-t / 0.02) * 0.6
def blip(m, n=0.07):
    k = int(n * SR)
    return square(midi(m), k, 0.25) * env(k, 0.001, 0.04, 0, 0.005)
def tick():
    k = int(0.02 * SR); t = np.arange(k) / SR
    return square(midi(93), k, 0.5) * np.exp(-t / 0.004)
def stinger(t0, gain):
    # cut-in: rising A-minor arpeggio in 32nds + whoosh
    for i, m in enumerate([69, 72, 76, 81, 84]):
        add(fx, t0 + i * S16 / 2, blip(m, 0.09), gain * (0.6 + 0.1 * i), pan=-0.3 + 0.15 * i)
    add(fx, t0 - 0.05, whoosh(0.4), gain * 0.8)
def riser(t0, t1):
    k = int((t1 - t0) * SR); t = np.arange(k) / SR
    nz = rng.standard_normal(k); out = np.zeros(k); seg = 1024
    for i in range(0, k, seg):
        c = 300 + 6000 * (i / k) ** 2
        out[i:i + seg] = bp(nz[i:i + seg], c * 0.8, c * 1.3)[: len(out[i:i + seg])]
    tone = square(midi(45) * (1 + 3 * (t / t[-1]) ** 2), k, 0.5) * 0.15
    return (out + lp(tone, 3000)) * (t / t[-1]) ** 2

# ---------------- the music ----------------
CHORDS = [(57, [69, 72, 76]), (53, [65, 69, 72]), (48, [67, 72, 76]), (55, [67, 71, 74])]   # Am F C G (bass roots, triads)
def bar_of(t): return int(np.floor((t - DROP) / (4 * BEAT)))

def groove(t0, t1, intensity=1.0, arp=True, melody=False, sparkle=False):
    s = t0 + ((DROP - t0) % S16)            # snap to the grid anchored at DROP
    i = int(round((s - DROP) / S16))
    t = DROP + i * S16
    while t < t1 - 1e-6:
        step = i % 16
        root, tri_ = CHORDS[bar_of(t) % 4]
        if step % 4 == 0: add(music, t, kick(), 0.9)
        if step in (4, 12): add(music, t, snare(), 0.55 * intensity)
        add(music, t, hat(open_=(step % 4 == 2)), (0.10 if step % 2 == 0 else 0.055) * intensity, pan=0.35)
        if step % 2 == 0: add(music, t, bassnote(root - 12 + (12 if step % 4 == 2 else 0), S16 * 1.8), 0.42)
        if arp:
            m = tri_[step % 3] + (12 if sparkle and step % 6 >= 3 else 0)
            add(music, t, lead(m, S16 * 0.9, 0.25), 0.11 if not sparkle else 0.13, pan=-0.25)
        if melody and step % 4 == 0:
            m = tri_[(step // 4) % 3] + 12
            add(music, t, lead(m, BEAT * 0.95, 0.5), 0.10, pan=0.2)
        i += 1; t = DROP + i * S16

# hook: bass pulse + hats, stop-time on the dropkick, then roll + riser into the logo
def hook_bed(t0, t1, roll=False):
    i = int(np.ceil((t0 - DROP) / S16)); t = DROP + i * S16
    while t < t1 - 1e-6:
        step = i % 16
        if step % 2 == 0: add(music, t, bassnote(45, S16 * 1.6), 0.4)
        if step % 4 == 0: add(music, t, kick(), 0.7)
        add(music, t, hat(), 0.06, pan=0.35)
        if roll: add(music, t, snare(0.12), 0.18 + 0.35 * (t - t0) / (t1 - t0))
        i += 1; t = DROP + i * S16
add(music, 0.0, kick(), 0.8); add(music, 0.0, bassnote(45, S16 * 1.6), 0.4)
hook_bed(0.0, 0.88)
hook_bed(1.15, 1.85)
hook_bed(1.85, DROP, roll=True)
add(fx, 1.85, riser(1.85, DROP), 0.35)

groove(DROP, 7.00, 1.0, arp=True)
# 7.00 card: drums drop out, 16th snare fill into the ults
for k in range(8): add(music, 7.35 + k * S16, snare(0.1), 0.25 + k * 0.04)
groove(8.10, 15.05, 1.1, arp=True, melody=True)
groove(15.05, 18.85, 0.8, arp=True, sparkle=True)
# outro: final A minor chord ringing out
for m, g in [(45, 0.4), (57, 0.25)]:
    add(music, 18.85, bassnote(m, 3.0) * np.linspace(1, 0.3, int(3.0 * SR)), g)
for j, m in enumerate([69, 72, 76, 81]):
    k = int(3.0 * SR)
    add(music, 18.85, lp(square(midi(m), k, 0.5), 3000) * env(k, 0.005, 1.2, 0.25, 0.8), 0.07, pan=-0.4 + 0.25 * j)
groove(18.85, 20.35, 0.7, arp=True, sparkle=True)   # one bar more, then ring out
for k in range(10):
    add(music, 20.35 + k * S16 * 2, lead([81, 76, 72, 69][k % 4], S16 * 1.5, 0.25), 0.09 * (1 - k / 10), pan=0.3 - 0.05 * k)

# ---------------- sfx on the picture ----------------
add(fx, 0.72, whoosh(0.2), 0.35)
add(fx, 0.90, impact(1.3), 0.75)
add(fx, 0.90, crash(1.2), 0.18)
add(fx, 1.33, impact(0.6), 0.45)   # wall CRACK
add(fx, 1.87, thump(), 0.3)
add(fx, DROP, impact(1.2), 0.6); add(fx, DROP, crash(), 0.28)
add(fx, 2.66, thump(), 0.45); add(fx, 2.83, impact(0.8), 0.5)
add(fx, 4.90, crash(1.0), 0.16)
add(fx, 4.96, thump(), 0.3)
add(fx, 5.45, blip(81), 0.2); add(fx, 6.05, blip(81), 0.2)
for m in (69, 76, 81): add(fx, 6.85, blip(m, 0.2), 0.14)
add(fx, 7.00, impact(1.2), 0.65); add(fx, 7.00, crash(), 0.25)
for t0 in (8.10, 10.25, 11.95, 13.35): stinger(t0, 0.28)
add(fx, 8.75, impact(0.8), 0.5)                     # BOOM
add(fx, 9.52, impact(1.4), 0.7); add(fx, 9.52, crash(), 0.3)   # GOAL
t = 10.55
while t < 11.72: add(fx, t, punch(), 0.28, pan=rng.uniform(-0.3, 0.3)); t += 0.1333
add(fx, 11.83, impact(1.0), 0.6)
add(fx, 12.25, whoosh(0.4, up=False), 0.4)
add(fx, 12.65, impact(1.4), 0.7); add(fx, 12.65, crash(), 0.22)
for c in (1.27, 1.8, 1.97, 2.5): add(fx, 13.65 + c - 1.05, impact(0.55), 0.42)
add(fx, 15.05, crash(1.0), 0.14)
g = json.load(open('frames/gacha/meta.json'))
for s in g['sfx']:
    if s['name'] == 'ui:tick' and 0.45 <= s['t'] < 2.25: add(fx, 15.05 + s['t'] - 0.45, tick(), 0.12, pan=0.2)
add(fx, 15.12, thump(), 0.3)
add(fx, 16.85, thump(), 0.4)                          # reveal
for i, m in enumerate((69, 72, 76, 81)): add(fx, 16.85 + i * 0.05, blip(m, 0.25), 0.13)
for k in range(1, 5): add(fx, 17.45 + 0.3 * k - 0.1, blip(88 if k % 2 else 84, 0.05), 0.1, pan=0.25)   # costume swaps
add(fx, 18.85, impact(1.5), 0.7); add(fx, 18.85, crash(2.5), 0.3)
add(fx, 18.90, thump(), 0.35); add(fx, 19.07, impact(0.7), 0.45)
add(fx, 19.60, thump(), 0.4)

# ---------------- mix: same room, gentle bus, fade ----------------
mix = music * 0.85 + fx * 0.8
ir_n = int(0.9 * SR); tt = np.arange(ir_n) / SR
ir = rng.standard_normal((ir_n, 2)) * np.exp(-tt / 0.22)[:, None]
ir = np.stack([lp(ir[:, 0], 5000), lp(ir[:, 1], 5000)], 1); ir /= np.abs(ir).sum(0) ** 0.5 * 12
wet = np.stack([fftconvolve(mix[:, c], ir[:, c])[:N] for c in range(2)], 1)
mix = mix + wet * 0.22
mix = hp(mix.T, 30).T
mix = np.tanh(mix * 1.1) / np.tanh(1.1)                # soft bus saturation / limiter
fade = int(0.8 * SR); mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
mix[: int(0.01 * SR)] *= np.linspace(0, 1, int(0.01 * SR))[:, None]
mix *= 0.89 / np.abs(mix).max()                        # peak ~ -1 dBFS
pcm = (mix * 32767).astype(np.int16)
with wave.open('brag.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
rms = np.sqrt((mix ** 2).mean())
print('wrote brag.wav', DUR, 's, rms dBFS', round(20 * np.log10(rms), 1))
