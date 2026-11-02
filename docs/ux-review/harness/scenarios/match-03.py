# match-03 · Chọn Core + Pause: chuột trỏ 1 chỗ, phím chọn chỗ khác -> 2 thứ cùng sáng, Enter lấy cái không trỏ
QUERY = '?runtest=match'
PROFILE = None

HIDE_DEV = "(() => { const t = SFC.RunTest; if (t && t.el) t.el.style.visibility = 'hidden'; window.__hideDev = setInterval(() => { const t = SFC.RunTest; if (t && t.el) t.el.style.visibility = 'hidden'; }, 100); })()"


def _until(h, js, tries=50, every=120):
    for _ in range(tries):
        if h.js(js):
            return True
        h.wait(every)
    return False


def steps(pg, h):
    h.js(HIDE_DEV)
    h.move(640, 640, steps=1, wait=500)
    h.key('Enter', wait=100)                                   # qua màn VS
    _until(h, "SFC.UI.current === 'draft'")
    h.wait(900)
    h.key('ArrowRight', wait=900)                              # phím: lá 2
    h.hover('#draft .card[data-pick]', nth=2, steps=40, wait=1300)   # chuột: lá 3
    h.key('Enter', wait=2600)                                  # lá nào bay vào YOUR BUILD?
    _until(h, "SFC.app.game && SFC.app.game.state === 'play'")
    h.wait(300)
    h.key('Escape', wait=700)                                  # Pause
    h.hover('#pause .pause-items button', nth=1, steps=30, wait=1800)  # chuột lên FORFEIT (phím vẫn ở RESUME)
