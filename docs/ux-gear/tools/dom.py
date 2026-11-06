# đếm trên DOM thẻ che: chữ, số, khung, màu chữ/viền khác nhau, diện tích từng khối, khoảng cách hàng / cột
import os, sys, json
SP = os.path.dirname(os.path.abspath(__file__))
os.environ.setdefault('UX_OUT', os.path.join(SP, '..', 'shots'))
sys.path.insert(0, SP)
import cap  # noqa
C = cap.C
JS = r"""() => {
  const root = document.querySelector('.rm-actcard'); if (!root) return null;
  const S = document.getElementById('stage').getBoundingClientRect(), k = 1280 / S.width;
  const vis = (e) => { if (!e) return false; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 1 && r.height > 1 && cs.visibility !== 'hidden' && +cs.opacity > 0.05; };
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n, texts = [];
  while ((n = w.nextNode())) { const t = n.textContent.trim(); if (t && vis(n.parentElement)) texts.push(t); }
  const words = texts.join(' ').split(/\s+/).filter(Boolean);
  const nums = words.filter((t) => /\d/.test(t));
  let boxes = 0, colors = new Set(), icons = 0;
  root.querySelectorAll('*').forEach((e) => {
    if (!vis(e)) return; const cs = getComputedStyle(e);
    const bw = ['Top', 'Right', 'Bottom', 'Left'].filter((s) => parseFloat(cs['border' + s + 'Width']) > 0 && cs['border' + s + 'Style'] !== 'none').length;
    if (bw >= 3) boxes++;
    if (e.matches('canvas, svg, .px, [class*="px-"]')) icons++;
    [cs.color, bw ? cs.borderTopColor : null].forEach((c) => { if (!c) return; const m = c.match(/\d+(\.\d+)?/g).map(Number); if (m.length > 3 && m[3] < 0.3) return;
      const [r, g, b] = m, mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx - mn > 60) colors.add(`${r},${g},${b}`); });
  });
  const rect = (sel) => { const els = [...root.querySelectorAll(sel)].filter(vis); if (!els.length) return null; const rs = els.map((e) => e.getBoundingClientRect());
    const x0 = Math.min(...rs.map((r) => r.left)), y0 = Math.min(...rs.map((r) => r.top)), x1 = Math.max(...rs.map((r) => r.right)), y1 = Math.max(...rs.map((r) => r.bottom));
    return { n: els.length, x: Math.round((x0 - S.left) * k), y: Math.round((y0 - S.top) * k), w: Math.round((x1 - x0) * k), h: Math.round((y1 - y0) * k), area: Math.round(rs.reduce((a, r) => a + r.width * r.height, 0) * k * k) }; };
  const gc = [...root.querySelectorAll('.gr-card')].filter(vis).map((e) => e.getBoundingClientRect()), pc = [...root.querySelectorAll('.sq-card')].filter(vis).map((e) => e.getBoundingClientRect());
  const gaps = gc.length && pc.length ? { rowGap: Math.round((pc[0].top - gc[0].bottom) * k), colGap: gc.length > 1 ? Math.round((gc[1].left - gc[0].right) * k) : null } : null;
  return { texts: texts.length, words: words.length, numbers: nums.length, boxes, icons, colors: colors.size, colorList: [...colors],
    gearRow: rect('.gr-card, .gx-card'), players: rect('.sq-card, .gx-m, .gx-p'), stats: rect('.sq-st'), gaps, sample: texts.slice(0, 80) };
}"""
def run(sid):
    S = C.SCREENS[sid]
    with C.ux.sync_playwright() as p:
        b, ctx, pg = C.ux._launch(p, None, S.get('profile'), None, C.PREP + S.get('init', ''))
        C.ux._boot(pg, C.BASE, S.get('query', ''))
        h = C.ux.Helper(pg)
        S['setup'](pg, h)
        r = pg.evaluate(JS)
        b.close()
    return r
if __name__ == '__main__':
    out = {}
    for sid in sys.argv[1:]:
        out[sid] = run(sid)
        d = dict(out[sid]); d.pop('sample', None); d.pop('colorList', None)
        print(sid, json.dumps(d))
    json.dump(out, open(os.path.join(os.environ['UX_OUT'], 'dom.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
