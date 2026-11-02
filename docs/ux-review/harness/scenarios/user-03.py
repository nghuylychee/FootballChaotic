# user-03 · Giờ chọn Core (ranked / online): chữ "15s" nhỏ xíu -> thanh rút dần, đỏ + nhấp nháy ở mấy giây cuối
# Trận thử ?runtest=match không có giờ chọn: đặt draft.limit / t = 15 lúc màn VS, rồi đếm lùi theo giờ thật
# (giống máy chủ online gửi d.t về qua snapshot).
QUERY = '?runtest=match'
PROFILE = None

HIDE_DEV = "(() => { const t = SFC.RunTest; if (t && t.el) t.el.style.visibility = 'hidden'; window.__hideDev = setInterval(() => { const t = SFC.RunTest; if (t && t.el) t.el.style.visibility = 'hidden'; }, 100); })()"


def steps(pg, h):
    h.js(HIDE_DEV)
    h.wait(300)
    h.js("(() => { const d = SFC.app.game.draft; d.limit = 15; d.t = 15; })()")
    h.wait(500)
    h.key('Enter', wait=100)                       # qua màn VS -> STARTING CORE
    for _ in range(40):
        if h.js("SFC.UI.current === 'draft'"):
            break
        h.wait(100)
    # đồng hồ chạy theo giờ thật
    h.js("(() => { const d = SFC.app.game.draft, t0 = performance.now(); window.__clk = setInterval(() => { d.t = Math.max(0.05, 15 - (performance.now() - t0) / 1000); }, 50); })()")
    h.wait(3500)
    h.key('ArrowRight', wait=2200)                 # đổi lá: thanh vẫn chạy, lá không bị vẽ lại
    h.key('ArrowRight', wait=3800)
    h.wait(2600)                                   # mấy giây cuối
    h.key('Enter', wait=1400)                      # chọn
    h.js("clearInterval(window.__clk)")
