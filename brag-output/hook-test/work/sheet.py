"""Contact sheet of an already captured take: python sheet.py <take> [t0] [t1] [step]  -> sheets/<take>_<t0>-<t1>.jpg
2x crop around the scene focus, clip time burned in."""
import sys, os, json, glob
from PIL import Image, ImageDraw

take = sys.argv[1]
t0 = float(sys.argv[2]) if len(sys.argv) > 2 else 0
t1 = float(sys.argv[3]) if len(sys.argv) > 3 else 99
step = int(sys.argv[4]) if len(sys.argv) > 4 else 6
d = os.path.join('frames', take)
meta = json.load(open(os.path.join(d, 'meta.json')))
fs = [f for f in sorted(glob.glob(os.path.join(d, '[0-9][0-9][0-9][0-9].png'))) if t0 * 30 <= int(os.path.basename(f)[:4]) <= t1 * 30][::step]
W, H, cols = 480, 270, 5
S = Image.new('RGB', (W * cols, H * ((len(fs) + cols - 1) // cols)), 'black')
for i, f in enumerate(fs):
    n = int(os.path.basename(f)[:4])
    foc = (meta['frames'][n] or {}).get('focus') or {'x': 320, 'y': 190}
    l = int(min(max(foc['x'] * 3 - 480, 0), 960)); t = int(min(max(foc['y'] * 3 - 270, 0), 540))
    im = Image.open(f).convert('RGB').crop((l, t, l + 960, t + 540)).resize((W, H))
    ImageDraw.Draw(im).text((6, 6), f'{n / 30:.2f}s', fill='yellow')
    S.paste(im, ((i % cols) * W, (i // cols) * H))
out = os.path.join('sheets', f'{take}_{t0:g}-{min(t1, len(meta["frames"]) / 30):g}.jpg')
S.save(out, quality=78)
print(out, 'marks', meta['marks'], 'sfx', [(round(s['t'], 2), s['name']) for s in meta['sfx'] if s['name'] not in ('touch', 'pass')][:30])
