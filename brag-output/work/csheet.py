"""Contact sheet of a captured scene: python csheet.py <scene> [step]  -> sheet_<scene>.jpg"""
import sys, glob, os, json
sys.path.insert(0, 'pylib')
from PIL import Image, ImageDraw

scene = sys.argv[1]
step = int(sys.argv[2]) if len(sys.argv) > 2 else 6
files = sorted(glob.glob(f'frames/{scene}/[0-9]*.png'))[::step]
W, H, cols = 480, 270, 4
rows = (len(files) + cols - 1) // cols
sheet = Image.new('RGB', (W * cols, H * rows), 'black')
meta = json.load(open(f'frames/{scene}/meta.json')) if os.path.exists(f'frames/{scene}/meta.json') else None
for i, f in enumerate(files):
    im = Image.open(f).convert('RGB').resize((W, H))
    d = ImageDraw.Draw(im)
    n = int(os.path.basename(f)[:4])
    d.rectangle([0, 0, 120, 22], fill='black'); d.text((4, 4), f'{n / 30:.2f}s', fill='yellow')
    sheet.paste(im, ((i % cols) * W, (i // cols) * H))
sheet.save(f'sheet_{scene}.jpg', quality=80)
print(f'sheet_{scene}.jpg', len(files))
