"""Quick look at a staged scene: capture every Nth frame and lay them out as a contact sheet.
usage: python look.py <scene> <seconds> [seed] [every]   -> sheets/<scene>_s<seed>.jpg  (crop around the scene focus, time + marks burned in)"""
import sys, os, json, glob, subprocess
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
scene, secs = sys.argv[1], sys.argv[2]
seed = sys.argv[3] if len(sys.argv) > 3 else '7'
every = sys.argv[4] if len(sys.argv) > 4 else '6'
pack = os.path.dirname(HERE)
cap = os.path.join(HERE, '..', '..', 'tools', 'clip-pack', 'capture.py')
r = subprocess.run([sys.executable, cap, pack, scene, secs, seed, '--every', every], capture_output=True, text=True)
print(r.stdout.strip()[-1500:], r.stderr.strip()[-1500:])
d = os.path.join(HERE, 'frames', f'{scene}_s{seed}')
meta = json.load(open(os.path.join(d, 'meta.json')))
fs = sorted(glob.glob(os.path.join(d, '[0-9][0-9][0-9][0-9].png')))
W, H, cols = 480, 270, 5
rows = (len(fs) + cols - 1) // cols
S = Image.new('RGB', (W * cols, H * rows), 'black')
for i, f in enumerate(fs):
    n = int(os.path.basename(f)[:4])
    fr = meta['frames'][n] if n < len(meta['frames']) else {}
    foc = (fr or {}).get('focus') or {'x': 320, 'y': 190}
    # 2x crop around the focus (what a vertical zoomed edit would show)
    cx, cy = foc['x'] * 3, foc['y'] * 3
    w, h = 960, 540
    l = int(min(max(cx - w / 2, 0), 1920 - w)); t = int(min(max(cy - h / 2, 0), 1080 - h))
    im = Image.open(f).convert('RGB').crop((l, t, l + w, t + h)).resize((W, H))
    ImageDraw.Draw(im).text((6, 6), f'{n / 30:.2f}s', fill='yellow')
    S.paste(im, ((i % cols) * W, (i // cols) * H))
os.makedirs(os.path.join(HERE, 'sheets'), exist_ok=True)
out = os.path.join(HERE, 'sheets', f'{scene}_s{seed}.jpg')
S.save(out, quality=80)
print('marks', meta['marks'], '->', out)
