"""Capture real gameplay frames from the game in headless Chrome with a fake clock (shorts director).
usage: python cap.py <scene> <seconds> [seed] [--stills a,b,c] [--every N]
  frames -> frames/<scene>/NNNN.png + meta.json ; stills -> frames/<scene>/still_TT.TT.png
  --every N : only save every Nth frame (quick look while staging a scene)"""
import sys, os, json, shutil, datetime
sys.path.insert(0, 'pylib')
from playwright.sync_api import sync_playwright

SEED_JS = """
(() => { let s = %d >>> 0; Math.random = function () { s = (s + 0x6D2B79F5) >>> 0; let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
localStorage.setItem('sfc_fx', '{}');
"""
PROFILE = {"v": 2, "name": "NGH", "level": 12, "xp": 0, "gold": 99999, "items": {}, "cores": {},
           "look": {"hair": "spiky", "face": "none", "shoes": "kicks", "fx": "nofx", "skin": 0, "hairColor": 0},
           "tut": {"done": True, "heirloom": True},
           "stats": {"matches": 40, "wins": 25, "draws": 5, "losses": 10, "goals": 88, "boxes": 3}}

FPS = int(sys.argv[sys.argv.index('--fps') + 1]) if '--fps' in sys.argv else 30
NOHUD = '--nohud' in sys.argv
args = [a for a in sys.argv[1:]]
scene, secs = args[0], float(args[1])
name, _, arena = scene.partition(':')
seed = int(args[2]) if len(args) > 2 and not args[2].startswith('--') else 7
stills = [float(x) for x in args[args.index('--stills') + 1].split(',')] if '--stills' in args else None
every = int(args[args.index('--every') + 1]) if '--every' in args else 1

out = os.path.join('frames', ('T_' if NOHUD else '') + scene.replace(':', '_'))
if stills is None:
    shutil.rmtree(out, ignore_errors=True)
os.makedirs(out, exist_ok=True)
director = open('steam_scenes.js', encoding='utf-8').read()

with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome')
    pg = b.new_page(viewport={'width': 1920, 'height': 1080})
    pg.on('pageerror', lambda e: print('PAGEERROR', e))
    pg.add_init_script(SEED_JS % seed)
    pg.add_init_script("""(() => { const key = (window.SFC_CONFIG && SFC_CONFIG.progression && SFC_CONFIG.progression.storageKey) || 'sfc_profile_v1';
      const d = %s; for (const k of ['sfc_profile_v1','sfc_profile_v2','sfc_profile']) localStorage.setItem(k, JSON.stringify(d)); })();""" % json.dumps(PROFILE))
    pg.clock.install(time=datetime.datetime(2026, 1, 1, tzinfo=datetime.timezone.utc))
    pg.goto('http://127.0.0.1:8765/index.html')
    pg.clock.run_for(2000)
    pg.wait_for_function('document.fonts.status === "loaded"')
    pg.clock.run_for(300)
    pg.clock.pause_at(datetime.datetime.fromtimestamp((pg.evaluate('Date.now()') + 200) / 1000, tz=datetime.timezone.utc))
    pg.add_script_tag(content=director)
    pg.evaluate(f'BRAG.setup({json.dumps(name)}, {json.dumps(arena or None)})')
    if NOHUD:
        pg.add_style_tag(content='#hud,#abar,#banner,#toasts,#prompt,#coach{display:none!important}')
    n = int(round(secs * FPS))
    meta, cur = [], 0.0
    targets = None if stills is None else sorted(stills)
    for i in range(n):
        t = i / FPS
        info = pg.evaluate(f'BRAG.frame({t})')
        nxt = (i + 1) * 1000 / FPS
        pg.clock.run_for(int(round(nxt - cur)))
        cur += int(round(nxt - cur))
        meta.append(info)
        if targets is None:
            if i % every == 0:
                pg.screenshot(path=os.path.join(out, f'{i:04d}.png'))
        elif targets and t >= targets[0] - 1e-6:
            pg.screenshot(path=os.path.join(out, f'still_{t:05.2f}.png'))
            targets.pop(0)
            if not targets:
                break
    sfx = pg.evaluate('BRAG.sfx')
    marks = pg.evaluate('BRAG.marks')
    b.close()

if stills is None:
    json.dump({'fps': FPS, 'frames': meta, 'sfx': sfx, 'marks': marks}, open(os.path.join(out, 'meta.json'), 'w'))
print(scene, 'frames', len(meta), 'marks', marks, 'score', meta[-1].get('score') if meta else None)
print('sfx', [(round(s['t'], 2), s['name']) for s in sfx][:40])
