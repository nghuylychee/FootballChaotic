"""review sheet from render_<ID>/ frames: python scratchpad/pa/review.py out.jpg ID ...  (8 frames per hook across 0-4.0)"""
import sys, os
from PIL import Image, ImageDraw
out, ids = sys.argv[1], sys.argv[2:]
T = [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.8]
W, H = 216, 384
S = Image.new('RGB', (W * len(T) + 50, H * len(ids)), 'black')
d = ImageDraw.Draw(S)
for r, i in enumerate(ids):
    d.text((4, r * H + 6), i, fill='yellow')
    for c, t in enumerate(T):
        f = f'render_{i}/{int(round(t * 30)):04d}.png'
        if not os.path.exists(f): continue
        im = Image.open(f).convert('RGB').resize((W, H))
        ImageDraw.Draw(im).text((4, 4), f'{t:.1f}', fill='yellow')
        S.paste(im, (50 + c * W, r * H))
S.save(out, quality=80)
print(out)
