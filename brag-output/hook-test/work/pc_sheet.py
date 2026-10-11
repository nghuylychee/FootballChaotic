"""pc helper: contact sheet of stills_<ID>/ for several bodies -> sheets/pc_<name>.jpg (one row per body, time burned in)."""
import sys, glob, os
from PIL import Image, ImageDraw
name, ids = sys.argv[1], sys.argv[2:]
W, H = 216, 384
rows = []
for ID in ids:
    fs = sorted(glob.glob(f'stills_{ID}/s_*.png'))
    rows.append((ID, fs))
cols = max(len(f) for _, f in rows)
S = Image.new('RGB', (W * cols + 60, H * len(rows)), 'black')
d = ImageDraw.Draw(S)
for r, (ID, fs) in enumerate(rows):
    d.text((6, r * H + 6), ID, fill='yellow')
    for c, f in enumerate(fs):
        im = Image.open(f).convert('RGB').resize((W, H))
        ImageDraw.Draw(im).text((4, 4), os.path.basename(f)[2:7], fill='yellow')
        S.paste(im, (60 + c * W, r * H))
S.save(f'sheets/pc_{name}.jpg', quality=82)
print(f'sheets/pc_{name}.jpg', S.size)
