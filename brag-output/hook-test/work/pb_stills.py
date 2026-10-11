"""pb helper: stills for several clips (one Chrome per clip, 2 at a time) + one montage per call.
usage: python pb_stills.py out_name t1,t2,... ID [ID ...]   -> sheets/pb_<out_name>.jpg (one row per clip)"""
import sys, os, subprocess
from concurrent.futures import ThreadPoolExecutor
from PIL import Image, ImageDraw

name, times, ids = sys.argv[1], sys.argv[2], sys.argv[3:]
ts = [float(x) for x in times.split(',')]


def run(ID):
    r = subprocess.run([sys.executable, 'render.py', ID, '--stills', times], capture_output=True, text=True)
    return ID, (r.stdout + r.stderr).strip()[-300:]


with ThreadPoolExecutor(2) as ex:
    for ID, out in ex.map(run, ids):
        print(ID, out.splitlines()[-1] if out else '', flush=True)

W, H = 270, 480
S = Image.new('RGB', (W * len(ts), H * len(ids)), 'black')
for r, ID in enumerate(ids):
    for c, t in enumerate(ts):
        f = f'stills_{ID}/s_{t:05.2f}.png'
        if not os.path.exists(f): continue
        im = Image.open(f).convert('RGB').resize((W, H), Image.LANCZOS)
        ImageDraw.Draw(im).text((6, 6), f'{ID} {t:.2f}', fill='yellow')
        S.paste(im, (c * W, r * H))
os.makedirs('sheets', exist_ok=True)
S.save(f'sheets/pb_{name}.jpg', quality=85)
print('->', f'sheets/pb_{name}.jpg')
