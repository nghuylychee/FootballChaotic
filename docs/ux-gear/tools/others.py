# kiểm các màn dùng chung thẻ cầu thủ / thẻ GEAR sau khi sửa màn GEAR: SQUAD · LEGEND xin vào đội · Locker Room
import os, sys
SP = os.path.dirname(os.path.abspath(__file__))
os.environ.setdefault('UX_OUT', os.path.join(SP, '..', 'shots', 'after'))
sys.path.insert(0, SP)
import cap  # noqa
C = cap.C
def go(name, query, js):
    with C.ux.sync_playwright() as p:
        b, ctx, pg = C.ux._launch(p, None, None, None, C.PREP + C.SEED)
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        C.ux._boot(pg, C.BASE, query)
        h = C.ux.Helper(pg)
        h.wait(500)
        if js: pg.evaluate(js)
        h.wait(1800)
        pg.screenshot(path=os.path.join(os.environ['UX_OUT'], 'other-' + name + '.png'))
        print(name, 'errors:', errs)
        b.close()
go('squad', '?runtest', "() => { SFC.RunTest.card('map'); const R = SFC.Run.run; R.squad[0].gear = [{ id: 'boots', r: 'rare', up: false }]; R.squad[1].gear = [{ id: 'board', r: 'rare', up: false }]; SFC.RunUI.bagOpen = true; SFC.RunUI.key = null; SFC.Menu.render(); }")
go('join', '?runtest=join.pirlow', None)
go('locker', '?runtest&badges=var,report,watch', "() => { SFC.RunTest.card('rest'); const R = SFC.Run.run; R.squad[0].gear = [{ id: 'boots', r: 'rare', up: false }]; SFC.RunUI.key = null; SFC.Menu.render(); }")
