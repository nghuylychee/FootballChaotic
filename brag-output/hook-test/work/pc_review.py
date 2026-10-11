"""pc helper: review sheet of rendered bodies (render_<ID>/), 24 frames each from 4.0 to 11.4 -> sheets/pc_<name>.jpg"""
import sys, os
from PIL import Image, ImageDraw
name, ids = sys.argv[1], sys.argv[2:]
W, H, cols, n = 160, 284, 12, 24
S = Image.new('RGB', (W * cols + 50, H * 2 * len(ids)), 'black')
d = ImageDraw.Draw(S)
for r, ID in enumerate(ids):
    d.text((4, r * 2 * H + 4), ID, fill='yellow')
    for i in range(n):
        f = 120 + round(i * (221 / (n - 1)))
        p = f'render_{ID}/{f:04d}.png'
        if not os.path.exists(p): continue
        im = Image.open(p).convert('RGB').resize((W, H))
        ImageDraw.Draw(im).text((3, 3), f'{f / 30:.2f}', fill='yellow')
        S.paste(im, (50 + (i % cols) * W, (r * 2 + i // cols) * H))
S.save(f'sheets/pc_{name}.jpg', quality=80)
print(f'sheets/pc_{name}.jpg', S.size)
