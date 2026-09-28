"""Capture real gameplay frames from the game in headless Chrome with a fake clock.
usage: python capture.py <scene> <seconds> [seed] [--stills a,b,c]
"""
import sys, os, json, shutil
sys.path.insert(0, 'pylib')
from playwright.sync_api import sync_playwright
from explore import SEED_JS

FPS = 30
scene, secs = sys.argv[1], float(sys.argv[2])
seed = int(sys.argv[3]) if len(sys.argv) > 3 and not sys.argv[3].startswith('--') else 7
stills = None
if '--stills' in sys.argv:
    stills = [float(x) for x in sys.argv[sys.argv.index('--stills') + 1].split(',')]

out = os.path.join('frames', scene)
if stills is None and '--probe' not in sys.argv:
    shutil.rmtree(out, ignore_errors=True)
os.makedirs(out, exist_ok=True)
director = open('scenes.js', encoding='utf-8').read()

with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome')
    pg = b.new_page(viewport={'width': 1920, 'height': 1080})
    pg.add_init_script(SEED_JS % seed)
    pg.add_init_script("localStorage.setItem('sfc_profile_v1', JSON.stringify({v:2,name:'NGH',level:12,xp:0,gold:99999,items:{},cores:{},look:{hair:'classic',face:'none',shoes:'kicks',fx:'nofx',skin:0,hairColor:0},stats:{matches:40,wins:25,draws:5,losses:10,goals:88,boxes:3}}))")
    import datetime; pg.clock.install(time=datetime.datetime(2026, 1, 1, tzinfo=datetime.timezone.utc))
    pg.goto('http://127.0.0.1:8765/index.html')
    pg.clock.run_for(2000)
    pg.wait_for_function('document.fonts.status === "loaded"')
    pg.clock.run_for(300)
    pg.clock.pause_at(datetime.datetime.fromtimestamp((pg.evaluate('Date.now()') + 200) / 1000, tz=datetime.timezone.utc))
    pg.add_script_tag(content=director)
    pg.evaluate(f'BRAG.setup({json.dumps(scene)})')
    n = int(round(secs * FPS))
    meta, cur = [], 0.0
    targets = None if stills is None else sorted(stills)
    for i in range(n):
        t = i / FPS
        info = pg.evaluate(f'BRAG.frame({t})')
        # advance the fake clock to the next frame boundary (RAF fires inside)
        nxt = (i + 1) * 1000 / FPS
        pg.clock.run_for(int(round(nxt - cur)))
        cur += int(round(nxt - cur))
        meta.append(info)
        if '--probe' in sys.argv:
            pass
        elif targets is None:
            pg.screenshot(path=os.path.join(out, f'{i:04d}.png'))
        elif targets and t >= targets[0] - 1e-6:
            pg.screenshot(path=os.path.join(out, f'still_{t:05.2f}.png'))
            targets.pop(0)
            if not targets:
                break
    sfx = pg.evaluate('BRAG.sfx')
    errs = pg.evaluate('window.__errs || []')
    b.close()

if '--probe' in sys.argv:
    import itertools
    print([m['ball'] for m in meta][::3]); print('states', [(k, round(len(list(g))/FPS,2)) for k, g in itertools.groupby(m['state'] for m in meta)])
elif stills is None:
    json.dump({'fps': FPS, 'frames': meta, 'sfx': sfx}, open(os.path.join(out, 'meta.json'), 'w'))
print(scene, 'frames', n, 'sfx', [(round(s['t'], 2), s['name']) for s in sfx][:40])
