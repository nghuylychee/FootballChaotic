"""Quick look at game screens. usage: python peek.py name 'js setup' [advance_ms] ..."""
import sys, json, datetime
sys.path.insert(0, 'pylib')
from playwright.sync_api import sync_playwright
SEED_JS = """(() => { let s = 7 >>> 0; Math.random = function () { s = (s + 0x6D2B79F5) >>> 0; let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
localStorage.setItem('sfc_fx', '{}');"""
PROFILE = {"v": 2, "name": "NGH", "level": 12, "xp": 0, "gold": 99999, "items": {}, "cores": {},
           "look": {"hair": "spiky", "face": "none", "shoes": "kicks", "fx": "nofx", "skin": 0, "hairColor": 0},
           "tut": {"done": True, "heirloom": True},
           "stats": {"matches": 40, "wins": 25, "draws": 5, "losses": 10, "goals": 88, "boxes": 3}}
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome')
    pg = b.new_page(viewport={'width': 1920, 'height': 1080})
    pg.on('pageerror', lambda e: print('PAGEERROR', e))
    pg.add_init_script(SEED_JS)
    pg.add_init_script("""(() => { const d = %s; for (const k of ['sfc_profile_v1','sfc_profile_v2','sfc_profile']) localStorage.setItem(k, JSON.stringify(d)); })();""" % json.dumps(PROFILE))
    pg.clock.install(time=datetime.datetime(2026, 1, 1, tzinfo=datetime.timezone.utc))
    pg.goto('http://127.0.0.1:8765/index.html')
    pg.clock.run_for(2000)
    pg.wait_for_function('document.fonts.status === "loaded"')
    pg.clock.run_for(300)
    args = sys.argv[1:]
    for i in range(0, len(args), 3):
        name, js, ms = args[i], args[i + 1], int(args[i + 2])
        r = pg.evaluate(js)
        if r is not None: print(name, '->', str(r)[:800])
        pg.clock.run_for(ms)
        pg.screenshot(path=f'peek_{name}.png')
    b.close()
