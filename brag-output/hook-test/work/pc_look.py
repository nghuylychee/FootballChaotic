"""pc batch helper: quick look at a scene with full frames (UI screens) or a crop.
usage: python pc_look.py <scene> <secs> [every=6] [seed=7] [--crop l,t,r,b] [--cols 4] [--nocap]
  -> sheets/pc_<scene>.jpg (time + marks burned in). --nocap re-sheets the existing frames."""
import sys, os, json, glob, subprocess
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
a = sys.argv[1:]
opt = lambda k, d=None: a[a.index(k) + 1] if k in a else d
pos = [x for i, x in enumerate(a) if not x.startswith('--') and (i == 0 or not a[i - 1].startswith('--'))]
scene, secs = pos[0], pos[1]
every = pos[2] if len(pos) > 2 else '6'
seed = pos[3] if len(pos) > 3 else '7'
crop = [int(v) for v in opt('--crop', '0,0,1920,1080').split(',')]
cols = int(opt('--cols', '4'))
if '--nocap' not in a:
    cap = os.path.join(HERE, '..', '..', 'tools', 'clip-pack', 'capture.py')
    r = subprocess.run([sys.executable, cap, os.path.dirname(HERE), scene, secs, seed, '--every', every], capture_output=True, text=True)
    print(r.stdout.strip()[-2500:], r.stderr.strip()[-1500:])
d = os.path.join(HERE, 'frames', f'{scene}_s{seed}')
meta = json.load(open(os.path.join(d, 'meta.json')))
fs = sorted(glob.glob(os.path.join(d, '[0-9][0-9][0-9][0-9].png')))
if '--nocap' in a: fs = fs[::int(every)]
l, t, r_, b = crop
W = 480; H = int(W * (b - t) / (r_ - l))
rows = (len(fs) + cols - 1) // cols
S = Image.new('RGB', (W * cols, H * rows), 'black')
for i, f in enumerate(fs):
    n = int(os.path.basename(f)[:4])
    im = Image.open(f).convert('RGB').crop((l, t, r_, b)).resize((W, H))
    ImageDraw.Draw(im).text((6, 6), f'{n / 30:.2f}s', fill='yellow')
    S.paste(im, ((i % cols) * W, (i // cols) * H))
out = os.path.join(HERE, 'sheets', f'pc_{scene}.jpg')
S.save(out, quality=82)
print('marks', meta['marks'], '->', out)
