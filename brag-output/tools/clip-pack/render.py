"""Turn captured takes into editable clips: game-accurate audio + 16:9 full frame + 9:16 crop that follows the action.
usage: python render.py <pack> [take ...]   (default: every take in <pack>/work/takes.json; run capture.py first)
  takes  : <pack>/work/takes.json = { "<clip name>": ["<frames dir under work/frames>", <seconds to keep>], ... }
  audio  : the game's own WebAudio SFX (src/core/audio.js) rendered offline from the logged events + crowd bed
  out    : <pack>/<name>_16x9.mp4  <pack>/<name>_9x16.mp4  <pack>/<name>.wav
needs the repo served at http://127.0.0.1:8765 (python -m http.server 8765 from the repo root)"""
import sys, os, json, base64, shutil, subprocess, wave
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'work', 'pylib'))
import numpy as np
from PIL import Image
import imageio_ffmpeg
from playwright.sync_api import sync_playwright

FPS, SR, FW, FH = 30, 44100, 1920, 1080
CROWD = 0.22          # arena crowd.sound (arenas.config.js)
GAIN = 6              # one gain for every clip: game master volume 0.3 peaks ~-21 dBFS -> ~-1 dBFS, relative levels kept
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

AUDIO_JS = """async ([events, dur, crowd, gain]) => {
  SFC.Audio.unlock();
  SFC.Audio.crowdLevel(crowd, true);
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


def render_audio(pg, events, dur, path):
    # any same-origin page without the game booting: the tool folder's directory listing
    pg.goto('http://127.0.0.1:8765/brag-output/tools/clip-pack/')
    pg.evaluate("""(dur) => { window.AudioContext = function () {
        const c = new OfflineAudioContext(2, Math.ceil(dur * 44100), 44100); c.resume = () => Promise.resolve(); window.__ctx = c; return c; }; }""", dur)
    for s in ['config/game.config.js', 'config/music.config.js', 'src/core/utils.js', 'src/core/audio.js']:
        pg.add_script_tag(url=f'/{s}')
    pcm = base64.b64decode(pg.evaluate(AUDIO_JS, [events, dur, CROWD, GAIN]))
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm)


def encode(src_pattern, wav, mp4):
    subprocess.run([ffmpeg, '-nostdin', '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', src_pattern, '-i', wav,
                    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', '-preset', 'medium',
                    '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', mp4], check=True)


def vertical(frames_dir, meta, n, tmp):
    """9:16 window (608x1080 of the 1920x1080 plate) panning with the scene's focus, upscaled 1080x1920 nearest-neighbour."""
    shutil.rmtree(tmp, ignore_errors=True); os.makedirs(tmp)
    w = round(FH * 9 / 16)
    xs = np.array([(meta['frames'][i].get('focus') or {'x': 320})['x'] * 3 for i in range(n)], float)
    # forward + backward EMA: smooth pan with no lag behind a fast ball
    for i in range(1, n): xs[i] = xs[i - 1] + (xs[i] - xs[i - 1]) * 0.2
    for i in range(n - 2, -1, -1): xs[i] = xs[i + 1] + (xs[i] - xs[i + 1]) * 0.2
    for i in range(n):
        left = int(min(max(xs[i] - w / 2, 0), FW - w))
        Image.open(f'{frames_dir}/{i:04d}.png').convert('RGB').crop((left, 0, left + w, FH)) \
            .resize((1080, 1920), Image.NEAREST).save(f'{tmp}/{i:04d}.png')


pack = sys.argv[1]
work = os.path.join(pack, 'work')
TAKES = json.load(open(os.path.join(work, 'takes.json'), encoding='utf-8'))
names = sys.argv[2:] or list(TAKES)
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome')
    pg = b.new_page()
    pg.on('pageerror', lambda e: print('PAGEERROR', e))
    for name in names:
        d, keep = TAKES[name]
        fdir = os.path.join(work, 'frames', d)
        meta = json.load(open(f'{fdir}/meta.json'))
        n = min(len(meta['frames']), int(round(keep * FPS)))
        dur = n / FPS
        wav = os.path.join(pack, f'{name}.wav')
        render_audio(pg, [e for e in meta['sfx'] if e['t'] < dur], dur, wav)
        # 16:9: link the first n frames into a clean sequence
        seq = os.path.join(work, f'seq_{name}')
        shutil.rmtree(seq, ignore_errors=True); os.makedirs(seq)
        for i in range(n): shutil.copyfile(f'{fdir}/{i:04d}.png', f'{seq}/{i:04d}.png')
        encode(f'{seq}/%04d.png', wav, os.path.join(pack, f'{name}_16x9.mp4'))
        vertical(fdir, meta, n, seq)
        encode(f'{seq}/%04d.png', wav, os.path.join(pack, f'{name}_9x16.mp4'))
        shutil.rmtree(seq, ignore_errors=True)
        print('wrote', name, round(dur, 2), 's', flush=True)
    b.close()
