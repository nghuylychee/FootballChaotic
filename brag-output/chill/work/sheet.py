"""Contact sheet of stills: python sheet.py out.jpg dir [cols] [w]"""
import sys, glob, os
from PIL import Image, ImageDraw
out, d = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 4
W = int(sys.argv[4]) if len(sys.argv) > 4 else 480
fs = sorted(glob.glob(os.path.join(d, 'still_*.png')) or glob.glob(os.path.join(d, 's_*.png')))
im0 = Image.open(fs[0]); H = int(W * im0.height / im0.width)
rows = (len(fs) + cols - 1) // cols
s = Image.new('RGB', (W * cols, (H + 18) * rows), 'black')
dr = ImageDraw.Draw(s)
for i, f in enumerate(fs):
    im = Image.open(f).convert('RGB').resize((W, H))
    x, y = (i % cols) * W, (i // cols) * (H + 18)
    s.paste(im, (x, y + 18)); dr.text((x + 4, y + 3), os.path.basename(f), fill='yellow')
s.save(out, quality=85)
