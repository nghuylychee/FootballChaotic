"""Render one Short from shorts_comp.html.
usage: python render_short.py <ID> [--stills t1,t2,...]   -> render_<ID>/NNNN.png  or  stills_<ID>/s_TT.TT.png"""
import sys, os
sys.path.insert(0, 'pylib')
from playwright.sync_api import sync_playwright

FPS = 30
ID = sys.argv[1]
stills = [float(x) for x in sys.argv[sys.argv.index('--stills') + 1].split(',')] if '--stills' in sys.argv else None
OUT = f'stills_{ID}' if stills else f'render_{ID}'
os.makedirs(OUT, exist_ok=True)

with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome')
    pg = b.new_page(viewport={'width': 1080, 'height': 1920})
    pg.on('pageerror', lambda e: print('PAGEERROR', e))
    pg.goto(f'http://127.0.0.1:8765/brag-output/work/shorts_comp.html?clip={ID}')
    dur = pg.evaluate('window.ready')
    if stills:
        for t in stills:
            pg.evaluate(f'render({t})')
            pg.screenshot(path=f'{OUT}/s_{t:05.2f}.png')
    else:
        n = int(round(dur * FPS))
        for i in range(n):
            pg.evaluate(f'render({i / FPS})')
            pg.screenshot(path=f'{OUT}/{i:04d}.png')
            if i % 90 == 0:
                print(ID, 'frame', i, '/', n, flush=True)
    b.close()
print('done', OUT)
