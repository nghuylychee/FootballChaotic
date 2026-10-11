"""Assemble one clip: its own frames (+ a body's frames after EDL.split) + short_<ID>.wav -> ../out/<ID>.mp4 and <ID>.jpg
EDL extras: hookframes = take the frames before the split from render_<that clip> (combos re-use a finished hook);
            body_offset = the body plays shifted by this many seconds (a skit of any length + a body rendered from 4.0 s).
usage: python encode.py <ID> [ID ...]"""
import sys, os, json, shutil, subprocess
from PIL import Image
import imageio_ffmpeg

FPS = 30
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
EDL = json.load(open('edl.json', encoding='utf-8'))
OUT = os.path.join('..', 'out')
os.makedirs(OUT, exist_ok=True)

for ID in sys.argv[1:]:
    E = EDL[ID]
    n = int(round(E['dur'] * FPS))
    split = int(round(E['split'] * FPS)) if E.get('body') else n
    seq = f'seq_{ID}'
    shutil.rmtree(seq, ignore_errors=True); os.makedirs(seq)
    for i in range(n):
        off = int(round(E.get('body_offset', 0) * FPS))
        src = f"render_{E.get('hookframes', ID)}/{i:04d}.png" if i < split else f"render_{E['body']}/{i - off:04d}.png"
        try: os.link(src, f'{seq}/{i:04d}.png')
        except OSError: shutil.copyfile(src, f'{seq}/{i:04d}.png')
    mp4 = os.path.join(OUT, f'{ID}.mp4')
    subprocess.run([ffmpeg, '-nostdin', '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', f'{seq}/%04d.png', '-i', f'short_{ID}.wav',
                    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium', '-r', str(FPS),
                    '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', mp4], check=True)
    # poster = frame 0: every clip opens on a settled, captioned frame, so the thumbnail and the first frame are the same image
    Image.open(f'{seq}/0000.png').convert('RGB').save(os.path.join(OUT, f'{ID}.jpg'), quality=90)
    shutil.rmtree(seq, ignore_errors=True)
    print('wrote', mp4, round(n / FPS, 2), 's', flush=True)
