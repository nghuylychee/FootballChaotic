# match-01 · Thắng 1 trận GOAT PATH (run thật, từ map): REWARDS hiện +NaN và gold / XP trong save thành NaN
import sys
import os; UX = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # = docs/ux-review/harness
QUERY = ''
PROFILE = UX + '/profile_run_map.json'


def _st(h):
    return h.js("(() => { const g = SFC.app.game; return { screen: SFC.app.screen, st: g && g.state, ui: SFC.UI.current, intro: SFC.Intro.active }; })()")


def _until(h, ok, tries=60, every=150):
    for _ in range(tries):
        s = _st(h)
        if ok(s):
            return s
        h.wait(every)
    return _st(h)


def steps(pg, h):
    # ví trước trận: SHOP hiện gold + thanh XP
    h.go('shop', wait=1000)
    # vào map GOAT PATH, chọn trận Matchday đầu
    h.go('runmap', wait=900)
    h.key('Enter', wait=200)
    _until(h, lambda s: s['intro'])
    h.wait(450)
    h.key('Enter', wait=200)                          # qua màn VS
    _until(h, lambda s: s['ui'] == 'draft')
    h.wait(450)
    h.key('Enter', wait=200)                          # lấy Core đầu
    _until(h, lambda s: s['st'] == 'play')
    h.wait(300)
    # thắng 1-0 (giống phím thắng nhanh của RUN TEST)
    h.js("(() => { const g = SFC.app.game; g.teams[0].score = 1; g.end(); })()")
    h.wait(2500)
    for _ in range(40):                               # bảng REWARDS đếm xong + trượt sang trái
        if h.js("!SFC.UI.rwFocus && !SFC.UI.outroActive"):
            break
        h.wait(150)
    h.wait(700)
    h.key('Enter', wait=200)                          # CONTINUE -> về map
    for _ in range(30):
        if h.js("SFC.app.screen === 'menu'"):
            break
        h.wait(150)
    h.wait(300)
    # ví sau trận
    h.go('shop', wait=1600)
