"""Render clips from comp.html to PNG frames.
usage: python render.py <ID> [ID ...] [--from S] [--to S] [--stills t1,t2,...]
  -> render_<ID>/NNNN.png (frame numbers are global clip time)  or  stills_<ID>/s_TT.TT.png
needs the repo served at http://127.0.0.1:8765 (python serve.py)"""
import sys, os
from playwright.sync_api import sync_playwright

FPS = 30
args = sys.argv[1:]
opt = lambda k: args[args.index(k) + 1] if k in args else None
ids = [a for i, a in enumerate(args) if not a.startswith('--') and (i == 0 or not args[i - 1].startswith('--'))]
t_from, t_to = float(opt('--from') or 0), opt('--to')
stills = [float(x) for x in opt('--stills').split(',')] if opt('--stills') else None

with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome')
    pg = b.new_page(viewport={'width': 1080, 'height': 1920})
    pg.on('pageerror', lambda e: print('PAGEERROR', e))
    for ID in ids:
        pg.goto(f'http://127.0.0.1:8765/brag-output/hook-test/work/comp.html?clip={ID}')
        dur = pg.evaluate('window.ready')
        if stills:
            out = f'stills_{ID}'; os.makedirs(out, exist_ok=True)
            for t in stills:
                pg.evaluate(f'render({t})')
                pg.screenshot(path=f'{out}/s_{t:05.2f}.png')
            print(ID, 'stills', len(stills), flush=True)
            continue
        out = f'render_{ID}'; os.makedirs(out, exist_ok=True)
        i0, i1 = int(round(t_from * FPS)), int(round((float(t_to) if t_to else dur) * FPS))
        for i in range(i0, i1):
            pg.evaluate(f'render({i / FPS})')
            pg.screenshot(path=f'{out}/{i:04d}.png')
        print(ID, 'frames', i0, '..', i1 - 1, flush=True)
    b.close()
