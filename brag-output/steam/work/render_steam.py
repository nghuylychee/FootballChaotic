"""Render steam_comp.html. usage: python render_steam.py [--stills t1,t2,...] [--range a,b] [--out DIR]"""
import sys, os
sys.path.insert(0, 'pylib')
from playwright.sync_api import sync_playwright
FPS = 30
arg = lambda k, d=None: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
stills = [float(x) for x in arg('--stills').split(',')] if '--stills' in sys.argv else None
OUT = arg('--out', 'stills' if stills else 'render')
os.makedirs(OUT, exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome')
    pg = b.new_page(viewport={'width': 1920, 'height': 1080})
    pg.on('pageerror', lambda e: print('PAGEERROR', e))
    pg.goto(f"http://127.0.0.1:8765/brag-output/steam/work/{arg('--comp', 'steam_comp.html')}")
    dur = pg.evaluate('window.ready')
    if stills:
        for t in stills:
            pg.evaluate(f'render({t})')
            pg.screenshot(path=f'{OUT}/s_{t:05.2f}.png')
    else:
        n = int(round(dur * FPS))
        a, z = [int(x) for x in arg('--range', f'0,{n}').split(',')]
        for i in range(a, min(z, n)):
            pg.evaluate(f'render({i / FPS})')
            pg.screenshot(path=f'{OUT}/{i:04d}.png')
            if i % 150 == 0: print('frame', i, '/', n, flush=True)
    b.close()
print('done')
