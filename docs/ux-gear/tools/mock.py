# chụp mockup tools/mockups/gear-pick.html: mỗi phương án × trạng thái -> mock/<opt>-<st>.png (+ đo DOM trong khung)
import os, sys, json
from playwright.sync_api import sync_playwright
BASE = os.environ.get('UX_BASE', 'http://localhost:8730')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'mock'); os.makedirs(OUT, exist_ok=True)
OPTS = sys.argv[1].split(',') if len(sys.argv) > 1 else ['A', 'B', 'C', 'D', 'E']
STS = sys.argv[2].split(',') if len(sys.argv) > 2 else ['pick', 'who', 'full', 'school']
DOM = r"""() => {
  const root = document.getElementById('scr');
  const vis = (e) => { if (!e) return false; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 1 && r.height > 1 && cs.visibility !== 'hidden' && +cs.opacity > 0.05; };
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n, texts = [];
  while ((n = w.nextNode())) { const t = n.textContent.trim(); if (t && vis(n.parentElement)) texts.push(t); }
  const words = texts.join(' ').split(/\s+/).filter(Boolean), nums = words.filter((t) => /\d/.test(t));
  let boxes = 0, colors = new Set();
  root.querySelectorAll('*').forEach((e) => { if (!vis(e)) return; const cs = getComputedStyle(e);
    const bw = ['Top', 'Right', 'Bottom', 'Left'].filter((s) => parseFloat(cs['border' + s + 'Width']) > 0 && cs['border' + s + 'Style'] !== 'none').length; if (bw >= 3) boxes++;
    [cs.color, bw ? cs.borderTopColor : null].forEach((c) => { if (!c) return; const m = c.match(/\d+(\.\d+)?/g).map(Number); if (m.length > 3 && m[3] < 0.3) return; const [r, g, b] = m; if (Math.max(r, g, b) - Math.min(r, g, b) > 60) colors.add(`${r},${g},${b}`); }); });
  return { texts: texts.length, words: words.length, numbers: nums.length, boxes, colors: colors.size };
}"""
res = {}
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome')
    pg = b.new_page(viewport={'width': 1320, 'height': 900})
    pg.goto(BASE + '/tools/mockups/gear-pick.html?opt=A', wait_until='load')
    pg.wait_for_function('window.GP', timeout=60000)
    pg.wait_for_timeout(800)
    for o in OPTS:
        for s in STS:
            pg.evaluate(f"GP.set({{ opt: '{o}', st: '{s}', view: '', anim: false }})")
            pg.wait_for_timeout(500)
            pg.locator('#wrap').screenshot(path=os.path.join(OUT, f'{o}-{s}.png'))
            if o != 'now':
                res[f'{o}-{s}'] = pg.evaluate(DOM)
                print(o, s, res[f'{o}-{s}'])
    errs = []
    b.close()
json.dump(res, open(os.path.join(OUT, 'dom.json'), 'w'), indent=1)
