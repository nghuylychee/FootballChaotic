"""all bodies on one sheet: python scratchpad/pd/allsheet.py OUT t1,t2,... B22 B23 ..."""
import sys, os
from PIL import Image, ImageDraw
out, ts, ids = sys.argv[1], [float(x) for x in sys.argv[2].split(',')], sys.argv[3:]
W, H = 150, 267
S = Image.new('RGB', (40 + W * len(ts), H * len(ids)), 'black')
d = ImageDraw.Draw(S)
for r, b in enumerate(ids):
    d.text((2, r * H + 4), b, fill='yellow')
    for c, t in enumerate(ts):
        f = f'render_{b}/{int(round(t * 30)):04d}.png'
        if os.path.exists(f):
            im = Image.open(f).convert('RGB').resize((W, H))
            if r == 0: ImageDraw.Draw(im).text((3, 3), f'{t:.1f}', fill='yellow')
            S.paste(im, (40 + c * W, r * H))
S.save(out, quality=85)
print(out)
