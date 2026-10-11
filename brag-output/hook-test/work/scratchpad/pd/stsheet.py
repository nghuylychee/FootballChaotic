"""contact sheet of stills: python scratchpad/pd/stsheet.py OUT ID [ID ...]  (stills_<ID>/s_*.png, one row per ID)"""
import sys, glob, os
from PIL import Image, ImageDraw
out, ids = sys.argv[1], sys.argv[2:]
W, H = 216, 384
rows = []
for i in ids:
    fs = sorted(glob.glob(f'stills_{i}/s_*.png'))
    rows.append((i, fs))
n = max(len(f) for _, f in rows)
S = Image.new('RGB', (W * n + 60, H * len(rows)), 'black')
d = ImageDraw.Draw(S)
for r, (i, fs) in enumerate(rows):
    d.text((4, r * H + 4), i, fill='yellow')
    for c, f in enumerate(fs):
        im = Image.open(f).convert('RGB').resize((W, H))
        ImageDraw.Draw(im).text((4, 4), os.path.basename(f)[2:7], fill='yellow')
        S.paste(im, (60 + c * W, r * H))
S.save(out, quality=85)
print(out)
