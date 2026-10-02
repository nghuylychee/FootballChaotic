"""One row per clip, frames every STEP: python strip.py out.jpg step clip1 clip2 ..."""
import sys, glob, os
sys.path.insert(0, 'pylib')
from PIL import Image, ImageDraw
out, step, clips = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
W, H = 256, 144
rows = []
for c in clips:
    fs = sorted(glob.glob(f'frames/{c}/[0-9]*.png'))[::step]
    rows.append((c, fs))
cols = max(len(f) for _, f in rows)
s = Image.new('RGB', (W * cols, (H + 16) * len(rows)), 'black')
d = ImageDraw.Draw(s)
for r, (c, fs) in enumerate(rows):
    for i, f in enumerate(fs):
        im = Image.open(f).convert('RGB').resize((W, H))
        s.paste(im, (i * W, r * (H + 16) + 16))
        d.text((i * W + 3, r * (H + 16) + 2), f'{c[:14]} {int(os.path.basename(f)[:4]) / 30:.1f}', fill='yellow')
s.save(out, quality=82)
