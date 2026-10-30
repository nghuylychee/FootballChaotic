"""Soundtrack for one batch-3 clip (same recipe as cycle 1): the game's own SFX (rendered offline from the logged events, mapped through edl.json)
under a 150 BPM A-minor chiptune-punk bed that starts ON the first hit (no intro), drums out under each Ultimate cut-in,
one big hit into the end card. All synthesized here.
usage: python audio.py <name>   (edl_<name>.json -> game_sfx_<name>.wav, <name>_audio.wav)  (needs the repo served at http://127.0.0.1:8765)"""
import json, base64, wave, os, sys
import numpy as np
from playwright.sync_api import sync_playwright

SR = 44100
NAME = sys.argv[1]
E = json.load(open(f'edl_{NAME}.json'))
DUR = E['dur']
N = int(DUR * SR)
rng = np.random.default_rng(11)
GAME = [s for s in E['segs'] if s.get('take') and not s.get('outro')]
CUTINS = [(s['v0'], s['v1']) for s in E['segs'] if s.get('cutin')]
OUTRO = next(s['v0'] for s in E['segs'] if s.get('outro'))
BEAT = 60 / E['bpm']; S16 = BEAT / 4

# ---------------------------------------------------------------- game SFX (real WebAudio recipes, offline)
SKIP = {'touch'}
def game_events():
    metas, out = {}, []
    for s in GAME:
        m = metas.setdefault(s['take'], json.load(open(f"frames/{s['take']}/meta.json")))
        c0, c1 = s['c0'], s['c0'] + (s['v1'] - s['v0']) * s['r']
        for e in m['sfx']:
            if c0 <= e['t'] < c1 and e['name'] not in SKIP:
                out.append({'t': s['v0'] + (e['t'] - c0) / s['r'], 'name': e['name'], 'arg': e.get('arg')})
    # the first frame is the contact frame: its hit fired a frame before the cut, put it on 0
    # every cut onto a new take starts a hair after its trigger (the hit frame, the first cut-in frame): pull those sounds onto the cut
    prev = None
    for s in GAME:
        if s['take'] != prev:
            for e in metas[s['take']]['sfx']:
                if s['c0'] - 0.1 <= e['t'] < s['c0'] and e['name'] in ('hit', 'kickSwing', 'ult'):
                    out.append({'t': s['v0'], 'name': e['name'], 'arg': e.get('arg')})
        prev = s['take']
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
        pg.goto('http://127.0.0.1:8765/game-promo/clips/work/b3/blank.html')
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
def lpv(x, fc):
    from scipy.signal import lfilter
    a = np.exp(-2 * np.pi * fc / SR)
    return lfilter([1 - a], [1, -a], x)
def hp(x, fc): return x - lpv(x, fc)
def bp(x, lo, hi): return lpv(hp(x, lo), hi)
def saw(f, t): return 2 * ((f * t) % 1) - 1
def pulse(f, t, w=0.25): return np.where((f * t) % 1 < w, 1.0, -1.0)
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

def kick():
    t = tt(0.3); f = 48 + 80 * np.exp(-t * 30)
    return sine_sweep(f) * env(t, 0.001, 0.11) + 0.3 * rng.standard_normal(len(t)) * env(t, 0, 0.004)
def snare():
    t = tt(0.22); return 0.7 * bp(rng.standard_normal(len(t)), 900, 6000) * env(t, 0.001, 0.07) + 0.5 * np.sin(2 * np.pi * 190 * t) * env(t, 0.001, 0.05)
def hat(o=False):
    t = tt(0.2 if o else 0.05); return hp(rng.standard_normal(len(t)), 7000) * env(t, 0.001, 0.08 if o else 0.012) * 0.6
def cymbal(d=1.4):
    t = tt(d); return hp(rng.standard_normal(len(t)), 5000) * env(t, 0.002, d * 0.35) * 0.6
def bassn(m, d):
    t = tt(d); f = midi(m)
    return lpv(saw(f, t) * 0.7 + pulse(f / 2, t, 0.5) * 0.3, 900) * np.clip(t / 0.003, 0, 1) * np.clip((d - t) / 0.02, 0, 1)
def lead(m, d, w=0.25):
    t = tt(d); f = midi(m) * (1 + 0.004 * np.sin(2 * np.pi * 5.5 * t) * np.clip((t - 0.08) / 0.1, 0, 1))
    return lpv(pulse(f, t, w), 4200) * np.clip(t / 0.004, 0, 1) * np.clip((d - t) / 0.03, 0, 1)
def brass(ms, d, cutoff=2200):
    t = tt(d)
    x = sum(saw(midi(m) * dt, t) for m in ms for dt in (0.997, 1.003)) / (2 * len(ms))
    e = np.clip(t / 0.02, 0, 1) * np.exp(-t / (d * 0.7)) * np.clip((d - t) / 0.05, 0, 1)
    return lpv(x, cutoff) * e
def boom(d=1.6):
    t = tt(d); return sine_sweep(40 + 34 * np.exp(-t * 6)) * env(t, 0.002, 0.55) + 0.5 * lpv(rng.standard_normal(len(t)), 300) * env(t, 0, 0.12)
def riser(d):
    t = tt(d); n = rng.standard_normal(len(t)); y = np.zeros_like(n)
    for k, (lo, hi) in enumerate([(300, 1000), (800, 2500), (2000, 6000), (5000, 12000)]):
        w = np.clip(1 - np.abs((t / d) * 3 - k), 0, 1); y += bp(n, lo, hi) * w
    return y * (t / d) ** 1.6

# ---------------------------------------------------------------- the bed: Am - F - C - G, two-beat chords, 16th bass
PROG = [(45, [57, 60, 64]), (41, [53, 57, 60]), (48, [55, 60, 64]), (43, [55, 59, 62])]
RIFF = [76, None, 72, 74, None, 76, 79, None, 77, None, 76, 74, None, 72, 74, None]   # 1 bar (16 x 16ths) of lead, 2 bars per chord pair
def gated(t): return any(a - 0.02 <= t < b - 0.02 for a, b in CUTINS)
def bed(t0, t1, gain=1.0, lead_on=True):
    k = 0
    while True:
        t = t0 + k * S16
        if t >= t1: break
        st = k % 16; bar = k // 16
        root, ch = PROG[(k // 8) % 4]
        cut = gated(t)
        if not cut:
            if st in (0, 6, 8, 11): put(MUS, kick(), t, 0.95 * gain)
            if st in (4, 12): put(MUS, snare(), t, 0.7 * gain, 0.1)
            put(MUS, hat(st in (6, 14)), t, (0.28 if st % 2 else 0.42) * gain, 0.35)
            put(MUS, bassn(root + (12 if st % 4 == 2 else 0), S16 * 0.9), t, 0.5 * gain, -0.05)
            if st % 8 == 0: put(MUS, brass(ch, BEAT * 1.6, 2600), t, 0.2 * gain, -0.25)
            if lead_on and RIFF[st] and bar % 2 == 1: put(MUS, lead(RIFF[st] - 12, S16 * 1.8), t, 0.13 * gain, 0.2)
        k += 1

def build():
    # the hook: no intro, the bed starts on the SMASH with a low boom + crash
    put(FX, boom(1.4), 0.0, 0.8); put(FX, cymbal(1.2), 0.0, 0.35)
    bed(0.0, OUTRO, 1.0, lead_on=True)
    # cut-ins: drums out, one brass stab on the cut, a short riser into the payoff
    for a, b in CUTINS:
        put(FX, brass([57, 64, 69], 0.35, 2600), a, 0.4)
        put(FX, riser(b - a), a, 0.16)
        put(FX, cymbal(0.9), b, 0.25)
    # the end card: big hit, held chord, then the CTA ping
    put(FX, boom(2.2), OUTRO, 0.9); put(FX, cymbal(2.0), OUTRO, 0.4)
    put(MUS, brass([45, 57, 64, 69], 2.6, 1800), OUTRO, 0.55)
    bed(OUTRO + BEAT * 4, DUR - 0.4, 0.55, lead_on=False)
    put(FX, brass([69, 76], 0.5, 3200), OUTRO + 1.15, 0.3)
    put(MUS, brass([45, 52, 57, 64], 0.9, 1600), DUR - 0.9, 0.5); put(FX, cymbal(0.9), DUR - 0.9, 0.2)

def save(path, x):
    x = np.clip(x, -1, 1)
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype(np.int16).tobytes())

if __name__ == '__main__':
    gp = f'game_sfx_{NAME}.wav'
    if not os.path.exists(gp) or os.environ.get('REGAME'):
        render_game(gp)
    game = load(gp)
    build()
    mus = MUS * 0.3
    fx = FX * 0.5
    mix = mus + fx + game * 0.75
    mix = np.tanh(mix * 1.1) / 1.1
    mix *= 0.89 / max(1e-6, np.abs(mix).max())
    fade = np.clip((DUR - np.arange(N) / SR) / 0.3, 0, 1)[:, None]
    save(f'{NAME}_audio.wav', mix * fade)
    print('peaks music/fx/game', round(float(np.abs(mus).max()), 3), round(float(np.abs(fx).max()), 3), round(float(np.abs(game).max()), 3))
