# match-02 · Pause > FORFEIT (RUN OVER) bấm 1 phát là mất cả run, không hỏi lại (run thật, vào từ map)
import os; UX = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # = docs/ux-review/harness
QUERY = ''
PROFILE = UX + '/profile_run_map.json'


def _until(h, js, tries=60, every=120):
    for _ in range(tries):
        if h.js(js):
            return True
        h.wait(every)
    return False


def steps(pg, h):
    h.go('runmap', wait=700)
    h.key('Enter', wait=100)                                  # trận Matchday đầu
    _until(h, "SFC.Intro.active")
    h.wait(450)
    h.key('Enter', wait=100)                                  # qua màn VS
    _until(h, "SFC.UI.current === 'draft'")
    h.wait(600)
    h.key('Enter', wait=100)                                  # lấy Core đầu
    _until(h, "SFC.app.game && SFC.app.game.state === 'play'")
    h.wait(900)
    h.key('Escape', wait=1000)                                # Pause
    h.key('ArrowRight', wait=900)                             # sang FORFEIT (RUN OVER)
    h.key('Enter', wait=4200)                                 # 1 lần Enter (lỡ tay)
    h.key('Escape', wait=1200)                                # đổi ý: quay lại trận
