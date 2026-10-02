import sys, glob, os
sys.path.insert(0, 'pylib')
from PIL import Image, ImageDraw
fs = sorted(glob.glob('stills/s_*.png'))
sel = fs[int(sys.argv[1]):int(sys.argv[2])] if len(sys.argv) > 2 else fs
W, H, C = 640, 360, 3
s = Image.new('RGB', (W * C, H * ((len(sel) + C - 1) // C)))
d = ImageDraw.Draw(s)
for i, f in enumerate(sel):
    s.paste(Image.open(f).convert('RGB').resize((W, H)), ((i % C) * W, (i // C) * H))
    d.text(((i % C) * W + 4, (i // C) * H + 4), os.path.basename(f), fill='yellow')
s.save(sys.argv[3] if len(sys.argv) > 3 else 'ss.jpg', quality=85)
