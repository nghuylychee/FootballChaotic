"""Append the shared TAIL (ultimates showcase) to a host Short and encode it.
usage: python concat_short.py <ID> <out_name> <poster_t> [--host-end S] [--parts TAIL,END] [--out DIR]
  frames: render_<ID>/ + render_TAIL/  (poster baked into frame 0)   audio: short_<ID>.wav + short_TAIL.wav (30 ms crossfade)"""
import sys, os, glob, shutil, wave, subprocess
sys.path.insert(0, 'pylib')
import numpy as np
from PIL import Image
import imageio_ffmpeg

ID, NAME, POSTER = sys.argv[1], sys.argv[2], float(sys.argv[3])
FPS, SR = 30, 44100
arg = lambda k, d: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
HOST_END = float(arg('--host-end', 1e9))
PARTS = [p for p in arg('--parts', 'TAIL').split(',') if p]
out_dir = arg('--out', '../shorts-v2')
os.makedirs(out_dir, exist_ok=True)
seq = f'seq_{ID}'
shutil.rmtree(seq, ignore_errors=True); os.makedirs(seq)
host = sorted(glob.glob(f'render_{ID}/[0-9][0-9][0-9][0-9].png'))[: int(round(HOST_END * FPS))]
parts = [sorted(glob.glob(f'render_{p}/[0-9][0-9][0-9][0-9].png')) for p in PARTS]
frames = host + [f for p in parts for f in p]
for i, f in enumerate(frames):
    os.symlink(os.path.abspath(f), f'{seq}/{i:04d}.png')
poster = host[round(POSTER * FPS)]
os.remove(f'{seq}/0000.png'); os.symlink(os.path.abspath(poster), f'{seq}/0000.png')
Image.open(poster).convert('RGB').save(f'{out_dir}/{NAME}.jpg', quality=90)

def read(p):
    with wave.open(p) as w: return np.frombuffer(w.readframes(w.getnframes()), np.int16).reshape(-1, 2).astype(np.float32)
x = int(0.03 * SR)
ramp = np.linspace(0, 1, x)[:, None]
mix = read(f'short_{ID}.wav')[: int(len(host) / FPS * SR)]
for p, fr in zip(PARTS, parts):
    b = read(f'short_{p}.wav')[: int(len(fr) / FPS * SR)]
    mix = np.concatenate([mix[:-x], mix[-x:] * (1 - ramp) + b[:x] * ramp, b[x:]])
mix = mix[: int(len(frames) / FPS * SR)]
with wave.open(f'cat_{ID}.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(np.clip(mix, -32767, 32767).astype(np.int16).tobytes())

subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), '-nostdin', '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', f'{seq}/%04d.png',
                '-i', f'cat_{ID}.wav', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium',
                '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', f'{out_dir}/{NAME}.mp4'], check=True)
print('wrote', f'{out_dir}/{NAME}.mp4', round(len(frames) / FPS, 2), 's')
