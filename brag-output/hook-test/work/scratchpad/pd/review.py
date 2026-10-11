"""review sheet of a body: hook frames 3.5-4.0 (render_<HOOK>) + body frames 4.0-11.4 every STEP s
python scratchpad/pd/review.py OUT BODY [HOOK] [STEP]"""
import sys, os
from PIL import Image, ImageDraw
out, B = sys.argv[1], sys.argv[2]
H = sys.argv[3] if len(sys.argv) > 3 else 'G1'
step = float(sys.argv[4]) if len(sys.argv) > 4 else 0.2
W, Hh, cols = 180, 320, 10
ts = []
t = 3.5
while t < 11.4 - 1e-6:
    ts.append(round(t, 2)); t += step
rows = (len(ts) + cols - 1) // cols
S = Image.new('RGB', (W * cols, Hh * rows), 'black')
for k, t in enumerate(ts):
    i = int(round(t * 30))
    f = f'render_{H if t < 4.0 else B}/{i:04d}.png'
    if not os.path.exists(f): continue
    im = Image.open(f).convert('RGB').resize((W, Hh))
    ImageDraw.Draw(im).text((4, 4), f'{t:.1f}', fill='yellow')
    S.paste(im, ((k % cols) * W, (k // cols) * Hh))
S.save(out, quality=82)
print(out)
