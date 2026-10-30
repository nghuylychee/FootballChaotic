"""zoomed contact sheet around a subject: python csheet.py <out.jpg> take:t[:x,y] ...  (x,y game px; default = kid)"""
import sys, json
from PIL import Image
out, specs = sys.argv[1], sys.argv[2:]
W, H, cols = 480, 360, 4
rows = (len(specs) + cols - 1) // cols
sh = Image.new('RGB', (cols * W, rows * H))
metas = {}
for i, s in enumerate(specs):
    parts = s.split(':')
    take, t = parts[0], float(parts[1])
    n = int(round(t * 30))
    im = Image.open(f'frames/{take}/{n:04d}.png').convert('RGB')
    if len(parts) > 2 and parts[2] == 'full':
        sh.paste(im.resize((W, H)), ((i % cols) * W, (i // cols) * H)); continue
    if len(parts) > 2:
        x, y = [float(v) for v in parts[2].split(',')]
    else:
        m = metas.setdefault(take, json.load(open(f'frames/{take}/meta.json')))
        x, y = m['frames'][n]['kid'][:2]
    cx, cy, hw, hh = x * 3, y * 3 - 20, 320, 240
    box = (int(cx - hw), int(cy - hh), int(cx + hw), int(cy + hh))
    sh.paste(im.crop(box).resize((W, H), Image.NEAREST), ((i % cols) * W, (i // cols) * H))
sh.save(out, quality=86)
