"""contact sheet: python sheet.py <dir> <out.jpg> [cols] [glob]"""
import sys, glob, os
from PIL import Image
d, out = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 3
pat = sys.argv[4] if len(sys.argv) > 4 else 'still_*.png'
fs = sorted(glob.glob(os.path.join(d, pat)))
W, H = 640, 360
rows = (len(fs) + cols - 1) // cols
sh = Image.new('RGB', (cols * W, rows * H), 'black')
for i, f in enumerate(fs):
    im = Image.open(f).convert('RGB').resize((W, H))
    sh.paste(im, ((i % cols) * W, (i // cols) * H))
sh.save(out, quality=85)
print(len(fs), 'frames ->', out)
