import sys, os
from PIL import Image, ImageDraw
clip, step = sys.argv[1], int(sys.argv[2])
start = int(sys.argv[3]) if len(sys.argv) > 3 else 0
end = int(sys.argv[4]) if len(sys.argv) > 4 else 9999
d = f'frames/{clip}'
fs = sorted(f for f in os.listdir(d) if f.endswith('.png') and not f.startswith('still'))
fs = [f for f in fs if start <= int(f[:4]) <= end][::step]
cols = 4; w, h = 480, 270
rows = (len(fs) + cols - 1) // cols
S = Image.new('RGB', (w * cols, h * rows))
for i, f in enumerate(fs):
    im = Image.open(os.path.join(d, f)).convert('RGB').resize((w, h), Image.BILINEAR)
    ImageDraw.Draw(im).text((6, 6), f'{f[:4]} t={int(f[:4])/30:.2f}', fill='yellow')
    S.paste(im, ((i % cols) * w, (i // cols) * h))
S.save(f'x_{clip}.jpg', quality=80)
