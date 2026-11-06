# chạy thử luồng màn GEAR mới (phương án B) bằng phím / chuột thật: đeo · đổi · rê chuột ở bước 1 · món mua ở KIT VAN -> ../shots/after/flow-*.png
import os, sys, json
SP = os.path.dirname(os.path.abspath(__file__))
os.environ.setdefault('UX_OUT', os.path.join(SP, '..', 'shots', 'after'))
sys.path.insert(0, SP)
import cap  # noqa
C = cap.C
OUT = os.environ['UX_OUT']
STATE = "() => { const R = SFC.Run.run, O = R.offer; return { offer: O ? { sel: O.sel, who: O.who, kind: O.kind } : null, gear: R.squad.map((s) => (s.gear || []).map((g) => g.id)), msg: SFC.Menu.msg, sel: SFC.RunUI.sel, drawing: SFC.RunUI.drawing } }"

def shot(pg, name):
    pg.screenshot(path=os.path.join(OUT, 'flow-' + name + '.png'))

def run(name, steps):
    S = C.SCREENS['g1']
    with C.ux.sync_playwright() as p:
        b, ctx, pg = C.ux._launch(p, None, None, None, C.PREP + S.get('init', ''))
        C.ux._boot(pg, C.BASE, S.get('query', ''))
        h = C.ux.Helper(pg)
        cap.base(pg, h)
        for st in steps:
            kind, arg = st[0], st[1]
            if kind == 'key': h.key(arg, wait=st[2] if len(st) > 2 else 700)
            elif kind == 'shot': shot(pg, name + '-' + arg)
            elif kind == 'state': print(name, arg, json.dumps(pg.evaluate(STATE)))
            elif kind == 'js': pg.evaluate(arg); h.wait(st[2] if len(st) > 2 else 900)
            elif kind == 'hover':
                box = pg.locator(arg).first.bounding_box(); pg.mouse.move(box['x'] + 5, box['y'] + 5); pg.mouse.move(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2); h.wait(400)
            elif kind == 'wait': h.wait(arg)
        b.close()

if __name__ == '__main__':
    which = sys.argv[1:] or ['wear', 'swap', 'hover', 'shop', 'anim']
    if 'wear' in which:   # Grip Socks -> người chọn sẵn (còn ô) -> đeo
        run('wear', [('state', 'start'), ('key', 'Enter', 800), ('state', 'step2'), ('key', 'Enter', 250), ('shot', 'mid'), ('wait', 1600), ('state', 'done'), ('shot', 'done')])
    if 'swap' in which:   # Grip Socks -> người đủ ô -> mở món bỏ ra -> đổi món chọn sẵn
        run('swap', [('key', 'Enter', 800), ('key', 'ArrowRight', 500), ('key', 'Enter', 800), ('state', 'open'), ('key', 'Enter', 500), ('shot', 'mid'), ('wait', 2600), ('state', 'done')])
    if 'hover' in which:  # bước 1: rê chuột sang thẻ món thứ 3 -> dải SQUAD đổi theo (không vẽ lại)
        run('hover', [('wait', 300), ('hover', '.gx-card.g2'), ('shot', 'g2'), ('state', 'hover')])
    if 'shop' in which:   # món mua ở KIT VAN: vào thẳng bước 2, không BACK
        run('shop', [('js', "SFC.Run.run.offer = { gear: [{ id: 'spikes', r: 'rare' }], kind: 'shop', sel: 0, who: null }; SFC.RunUI.key = null; SFC.Menu.render()", 1200), ('shot', 'step2'), ('state', 'shop'), ('key', 'Escape', 500), ('state', 'esc')])
    if 'anim' in which:   # nhịp hiện của bước 1 / bước 2 (khung 0.1 / 0.25 / 0.6 s)
        run('anim', [('js', "SFC.RunUI.key = null; SFC.Menu.render()", 100), ('shot', 's1-0.1'), ('wait', 150), ('shot', 's1-0.25'), ('wait', 350), ('shot', 's1-0.6'),
                     ('key', 'Enter', 100), ('shot', 's2-0.1'), ('wait', 150), ('shot', 's2-0.25'), ('wait', 350), ('shot', 's2-0.6')])
