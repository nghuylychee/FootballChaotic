import sys; sys.path.insert(0,'pylib')
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome'); pg = b.new_page()
    pg.clock.install(time=1_700_000_000_000)
    pg.set_content('<body></body>')
    pg.evaluate("window.L=[]; function f(n){ L.push([n, performance.now()]); requestAnimationFrame(f);} requestAnimationFrame(f);")
    for i in range(4): pg.clock.run_for(33)
    print(pg.evaluate('L'))
    b.close()
