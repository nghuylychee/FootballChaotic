import sys, glob
from PIL import Image, ImageDraw
files = sorted(glob.glob(sys.argv[1]))
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 3
w, h = 640, 360
rows = (len(files) + cols - 1) // cols
S = Image.new('RGB', (w * cols, h * rows), 'black')
for i, f in enumerate(files):
    im = Image.open(f).convert('RGB').resize((w, h), Image.BILINEAR)
    ImageDraw.Draw(im).text((6, 6), __import__('os').path.basename(f), fill='yellow')
    S.paste(im, ((i % cols) * w, (i // cols) * h))
S.save(sys.argv[2])
