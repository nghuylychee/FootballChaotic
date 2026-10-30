"""Render comp.html for one clip. usage: python render.py <name> [--stills t1,t2,...]   (edl_<name>.json -> render_<name>/ or stills_<name>/)"""
import sys, os
from playwright.sync_api import sync_playwright
FPS = 30
name = sys.argv[1]
arg = lambda k, d=None: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
stills = [float(x) for x in arg('--stills').split(',')] if '--stills' in sys.argv else None
OUT = f'stills_{name}' if stills else f'render_{name}'
os.makedirs(OUT, exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome')
    pg = b.new_page(viewport={'width': 1080, 'height': 1920})
    pg.on('pageerror', lambda e: print('PAGEERROR', e))
    pg.goto(f'http://127.0.0.1:8765/game-promo/clips/work/b3/comp.html?edl=edl_{name}.json')
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
            if i % 150 == 0: print('frame', i, '/', n, flush=True)
    b.close()
print('done')
