"""Contact sheet: python sheet.py <dir> <out.jpg> [step] [start] [end] [cols] [crop x0,y0,x1,y1]"""
import sys, os
from PIL import Image, ImageDraw
d, out = sys.argv[1], sys.argv[2]
step = int(sys.argv[3]) if len(sys.argv) > 3 else 3
a = int(sys.argv[4]) if len(sys.argv) > 4 else 0
z = int(sys.argv[5]) if len(sys.argv) > 5 else 99999
cols = int(sys.argv[6]) if len(sys.argv) > 6 else 5
crop = [int(v) for v in sys.argv[7].split(',')] if len(sys.argv) > 7 else None
fs = sorted(f for f in os.listdir(d) if f.endswith('.png') and f[:4].isdigit() and a <= int(f[:4]) <= z and int(f[:4]) % step == 0)
ims = []
for f in fs:
    im = Image.open(os.path.join(d, f)).convert('RGB')
    if crop: im = im.crop(crop)
    im.thumbnail((480, 480)); dr = ImageDraw.Draw(im); dr.rectangle([0, 0, 70, 18], fill=(0, 0, 0)); dr.text((4, 3), f'{int(f[:4]) / 30:.2f}s', fill=(255, 255, 0))
    ims.append(im)
w, h = ims[0].size; rows = (len(ims) + cols - 1) // cols
S = Image.new('RGB', (w * cols, h * rows), (20, 12, 22))
for i, im in enumerate(ims): S.paste(im, ((i % cols) * w, (i // cols) * h))
S.save(out, quality=82); print(out, len(ims), S.size)
