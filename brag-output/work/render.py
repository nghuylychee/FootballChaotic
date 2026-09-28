"""Render comp.html frame by frame. usage: python render.py [--stills t1,t2,...]"""
import sys, os
sys.path.insert(0, 'pylib')
from playwright.sync_api import sync_playwright

FPS, DUR = 30, 21.85
stills = None
if '--stills' in sys.argv:
    stills = [float(x) for x in sys.argv[sys.argv.index('--stills') + 1].split(',')]
os.makedirs('render', exist_ok=True)
os.makedirs('stills', exist_ok=True)

with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome')
    pg = b.new_page(viewport={'width': 1920, 'height': 1080})
    pg.goto('http://127.0.0.1:8765/brag-output/work/comp.html')
    pg.evaluate('window.ready')
    if stills:
        for t in stills:
            pg.evaluate(f'render({t})')
            pg.screenshot(path=f'stills/s_{t:05.2f}.png')
    else:
        n = int(round(DUR * FPS))
        for i in range(n):
            pg.evaluate(f'render({i / FPS})')
            pg.screenshot(path=f'render/{i:04d}.png')
            if i % 60 == 0:
                print('frame', i, flush=True)
    b.close()
