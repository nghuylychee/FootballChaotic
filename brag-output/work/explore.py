import sys, json
sys.path.insert(0, 'pylib')
from playwright.sync_api import sync_playwright

SEED_JS = """
(() => { let s = %d >>> 0; Math.random = function () { s = (s + 0x6D2B79F5) >>> 0; let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
localStorage.setItem('sfc_fx', '{}');
"""

def open_page(p, seed=7):
    b = p.chromium.launch(channel='chrome', args=['--autoplay-policy=no-user-gesture-required'])
    pg = b.new_page(viewport={'width': 1920, 'height': 1080})
    pg.add_init_script(SEED_JS % seed)
    pg.clock.install(time=1_700_000_000_000)
    pg.goto('http://127.0.0.1:8765/index.html')
    pg.clock.run_for(2500)
    pg.wait_for_function('document.fonts.status === "loaded"')
    pg.clock.run_for(500)
    return b, pg

if __name__ == '__main__':
    with sync_playwright() as p:
        b, pg = open_page(p)
        print(pg.evaluate('Object.keys(SFC)'))
        print(pg.evaluate('JSON.stringify(SFC.Profile.data).slice(0,400)'))
        pg.screenshot(path='x_menu.png')
        b.close()
