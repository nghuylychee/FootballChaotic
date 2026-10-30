"""vertical stills sheet: python vsheet.py <dir> <out.jpg> [cols]"""
import sys, glob, os
from PIL import Image
d, out = sys.argv[1], sys.argv[2]; cols = int(sys.argv[3]) if len(sys.argv) > 3 else 6
fs = sorted(glob.glob(os.path.join(d, 's_*.png')))
W, H = 270, 480
rows = (len(fs) + cols - 1) // cols
sh = Image.new('RGB', (cols * W, rows * H), 'black')
for i, f in enumerate(fs):
    sh.paste(Image.open(f).convert('RGB').resize((W, H)), ((i % cols) * W, (i // cols) * H))
sh.save(out, quality=85)
print(len(fs))
