"""stills montage: python scratchpad/pa/montage.py out.jpg ID ID ... (rows = hooks, cols = stills)"""
import sys, glob, os
from PIL import Image, ImageDraw
out, ids = sys.argv[1], sys.argv[2:]
W, H = 270, 480
rows = []
for i in ids:
    fs = sorted(glob.glob(f'stills_{i}/s_*.png'))
    rows.append((i, fs))
cols = max(len(f) for _, f in rows)
S = Image.new('RGB', (W * cols + 60, H * len(rows)), 'black')
d = ImageDraw.Draw(S)
for r, (i, fs) in enumerate(rows):
    d.text((4, r * H + 6), i, fill='yellow')
    for c, f in enumerate(fs):
        im = Image.open(f).convert('RGB').resize((W, H))
        ImageDraw.Draw(im).text((4, 4), os.path.basename(f)[2:-4], fill='yellow')
        S.paste(im, (60 + c * W, r * H))
S.save(out, quality=82)
print(out)
