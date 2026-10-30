"""contact sheet from captured frames: python fsheet.py <take> <out.jpg> t1,t2,... [cols]"""
import sys
from PIL import Image
take, out, ts = sys.argv[1], sys.argv[2], [float(x) for x in sys.argv[3].split(',')]
cols = int(sys.argv[4]) if len(sys.argv) > 4 else 4
W, H = 640, 360
rows = (len(ts) + cols - 1) // cols
sh = Image.new('RGB', (cols * W, rows * H))
for i, t in enumerate(ts):
    im = Image.open(f'frames/{take}/{int(round(t * 30)):04d}.png').convert('RGB').resize((W, H))
    sh.paste(im, ((i % cols) * W, (i // cols) * H))
sh.save(out, quality=85)
