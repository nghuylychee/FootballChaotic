"""pb helper: montage of existing stills. usage: python pb_mont.py out t1,t2,.. ID [ID ...] -> sheets/pb_<out>.jpg"""
import sys, os
from PIL import Image, ImageDraw
name, ts, ids = sys.argv[1], [float(x) for x in sys.argv[2].split(',')], sys.argv[3:]
W, H = 324, 576
S = Image.new('RGB', (W * len(ts), H * len(ids)), 'black')
for r, ID in enumerate(ids):
    for c, t in enumerate(ts):
        f = f'stills_{ID}/s_{t:05.2f}.png'
        if not os.path.exists(f): continue
        im = Image.open(f).convert('RGB').resize((W, H), Image.LANCZOS)
        ImageDraw.Draw(im).text((6, 6), f'{ID} {t:.2f}', fill='yellow')
        S.paste(im, (c * W, r * H))
S.save(f'sheets/pb_{name}.jpg', quality=85)
print('->', f'sheets/pb_{name}.jpg')
