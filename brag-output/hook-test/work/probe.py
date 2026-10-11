"""Boot the game like capture.py, set up a scene and evaluate a JS expression: python probe.py <scene> "<js expr>" """
import sys, os, json, datetime
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'tools', 'clip-pack'))
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, '..', '..', 'tools', 'clip-pack', 'capture.py'), encoding='utf-8').read()
SEED_JS = src.split('SEED_JS = """')[1].split('"""')[0]
scene, expr = sys.argv[1], sys.argv[2]
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome')
    pg = b.new_page(viewport={'width': 1920, 'height': 1080})
    pg.on('pageerror', lambda e: print('PAGEERROR', e))
    pg.on('console', lambda m: print('LOG', m.text))
    pg.add_init_script(SEED_JS % 7)
    pg.clock.install(time=datetime.datetime(2026, 1, 1, tzinfo=datetime.timezone.utc))
    pg.goto('http://127.0.0.1:8765/index.html')
    pg.clock.run_for(2000)
    pg.wait_for_function('document.fonts.status === "loaded"')
    pg.add_script_tag(content=open(os.path.join(HERE, 'scenes.js'), encoding='utf-8').read())
    import glob
    for f in sorted(glob.glob(os.path.join(HERE, 'scenes_*.js'))): pg.add_script_tag(content=open(f, encoding='utf-8').read())
    pg.evaluate(f'BRAG.setup({json.dumps(scene)})')
    print(json.dumps(pg.evaluate(expr), indent=1)[:4000])
    b.close()
