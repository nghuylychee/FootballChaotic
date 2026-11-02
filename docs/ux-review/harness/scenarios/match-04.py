# match-04 · Bấm Space liên tục cho qua ăn mừng bàn thắng -> CORE UPGRADE mở ra là lá 1 bị lấy luôn, chưa kịp nhìn
# Người chơi bấm Space (tay cầm: A) mỗi ~180 ms, hết ăn mừng thì dừng sau 1 lần bấm nữa (phản xạ người thật)
QUERY = '?runtest=match'
PROFILE = None

HIDE_DEV = "(() => { const t = SFC.RunTest; if (t && t.el) t.el.style.visibility = 'hidden'; window.__hideDev = setInterval(() => { const t = SFC.RunTest; if (t && t.el) t.el.style.visibility = 'hidden'; }, 100); })()"

# ghi bàn thật cho đội mình: đặt bóng vào lưới (giống review/match/mlib.py GOAL_JS)
GOAL_JS = """(() => { const g = SFC.app.game, f = g.field, b = g.ball; const me = g.controlled;
  if (b.owner) { b.owner.hasBall = false; b.owner = null; }
  b.z = 0; b.vz = 0; b.vy = 0; b.netSide = 1; b.x = f.x + f.w + b.r + 4; b.y = f.cy; b.vx = 10; b.lastTouch = me; })()"""


def _until(h, js, tries=60, every=100):
    for _ in range(tries):
        if h.js(js):
            return True
        h.wait(every)
    return False


def steps(pg, h):
    # chuẩn bị nhanh: qua màn VS, lấy Core đầu, trận chạy, đã tới lúc có lượt Core kế (chờ bàn thắng)
    h.js(HIDE_DEV)
    h.move(640, 660, steps=1, wait=200)
    h.key('Enter', wait=100)
    _until(h, "SFC.UI.current === 'draft'")
    h.wait(700)
    h.key('Enter', wait=100)
    _until(h, "SFC.app.game && SFC.app.game.state === 'play'")
    h.js("SFC.app.game.elapsed = 31")
    h.wait(700)
    h.js(GOAL_JS)                                    # GOAL!
    _until(h, "SFC.app.game.state === 'goal'")
    # bấm Space liên tục cho qua ăn mừng, tới khi hết ăn mừng (màn chọn bật lên)
    for _ in range(40):
        h.key('Space', wait=180)
        if h.js("SFC.app.game.state !== 'goal'"):
            break
    h.key('Space', wait=180)                         # phản xạ: thêm 1 lần bấm trước khi kịp dừng tay
    h.wait(2200)                                     # nhìn kỹ: lá nào đã bị lấy chưa?
    h.key('ArrowRight', wait=500)                    # chọn có chủ ý: lá 2
    h.key('Enter', wait=1800)
