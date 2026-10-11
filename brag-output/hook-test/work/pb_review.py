"""pb helper: review sheets from finished renders, 8 frames per hook. usage: python pb_review.py name ID [ID ...] -> sheets/pb_<name>.jpg"""
import sys, os
from PIL import Image, ImageDraw
name, ids = sys.argv[1], sys.argv[2:]
ts = [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.9]
W, H = 240, 427
S = Image.new('RGB', (W * len(ts), H * len(ids)), 'black')
for r, ID in enumerate(ids):
    for c, t in enumerate(ts):
        f = f'render_{ID}/{int(round(t * 30)):04d}.png'
        if not os.path.exists(f): continue
        im = Image.open(f).convert('RGB').resize((W, H), Image.LANCZOS)
        ImageDraw.Draw(im).text((5, 5), f'{ID} {t:.1f}', fill='yellow')
        S.paste(im, (c * W, r * H))
S.save(f'sheets/pb_{name}.jpg', quality=85)
print('->', f'sheets/pb_{name}.jpg')
