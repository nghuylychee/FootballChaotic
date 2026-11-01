"""Montage of comp stills: python stills_sheet.py <dir> <out.jpg> [cols]"""
import sys, os
from PIL import Image, ImageDraw
d, out = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 6
fs = sorted(f for f in os.listdir(d) if f.startswith('s_') and f.endswith('.png'))
ims = []
for f in fs:
    im = Image.open(os.path.join(d, f)).convert('RGB'); im.thumbnail((300, 534))
    dr = ImageDraw.Draw(im); dr.rectangle([0, 0, 60, 16], fill=(0, 0, 0)); dr.text((3, 2), f[2:-4] + 's', fill=(255, 255, 0)); ims.append(im)
w, h = ims[0].size; rows = (len(ims) + cols - 1) // cols
S = Image.new('RGB', (w * cols, h * rows), (20, 12, 22))
for i, im in enumerate(ims): S.paste(im, ((i % cols) * w, (i // cols) * h))
S.save(out, quality=85); print(out, len(ims))
