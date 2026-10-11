"""pc helper: frame(s) with a logical-px grid (every 40 px) -> scratch image. usage: python pc_grid.py out.jpg take:frame [take:frame ...]"""
import sys
from PIL import Image, ImageDraw
out, items = sys.argv[1], sys.argv[2:]
tiles = []
for it in items:
    t, n = it.split(':')
    im = Image.open(f'frames/{t}/{int(n):04d}.png').convert('RGB')
    d = ImageDraw.Draw(im)
    for x in range(0, 640, 40):
        d.line([(x * 3, 0), (x * 3, 1080)], fill=(0, 255, 255) if x % 160 else (255, 255, 0), width=1)
        d.text((x * 3 + 3, 3), str(x), fill='yellow')
    for y in range(0, 360, 40):
        d.line([(0, y * 3), (1920, y * 3)], fill=(0, 255, 255) if y % 160 else (255, 255, 0), width=1)
        d.text((3, y * 3 + 3), str(y), fill='yellow')
    tiles.append(im.resize((960, 540)))
S = Image.new('RGB', (960 * min(2, len(tiles)), 540 * ((len(tiles) + 1) // 2)))
for i, im in enumerate(tiles): S.paste(im, ((i % 2) * 960, (i // 2) * 540))
S.save(out, quality=85)
