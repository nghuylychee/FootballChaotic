"""Render a comp page frame by frame.
usage: python render.py [--vertical] [--stills t1,t2,...]
  landscape: comp.html          -> render/            (1920x1080)
  vertical:  comp_vertical.html -> render_vertical/   (1080x1920, YouTube Shorts)"""
import sys, os
sys.path.insert(0, 'pylib')
from playwright.sync_api import sync_playwright

FPS, DUR = 30, 21.85
VERT = '--vertical' in sys.argv
COMP, OUT, SIZE = ('comp_vertical.html', 'render_vertical', (1080, 1920)) if VERT else ('comp.html', 'render', (1920, 1080))
STILLS = 'stills_vertical' if VERT else 'stills'
stills = None
if '--stills' in sys.argv:
    stills = [float(x) for x in sys.argv[sys.argv.index('--stills') + 1].split(',')]
os.makedirs(OUT, exist_ok=True)
os.makedirs(STILLS, exist_ok=True)

with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome')
    pg = b.new_page(viewport={'width': SIZE[0], 'height': SIZE[1]})
    pg.goto(f'http://127.0.0.1:8765/brag-output/work/{COMP}')
    pg.evaluate('window.ready')
    if stills:
        for t in stills:
            pg.evaluate(f'render({t})')
            pg.screenshot(path=f'{STILLS}/s_{t:05.2f}.png')
    else:
        n = int(round(DUR * FPS))
        for i in range(n):
            pg.evaluate(f'render({i / FPS})')
            pg.screenshot(path=f'{OUT}/{i:04d}.png')
            if i % 60 == 0:
                print('frame', i, flush=True)
    b.close()
