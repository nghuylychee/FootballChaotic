import sys, os, json
import os; UX = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))   # = docs/ux-review/harness
OUT = UX + '/review/match'
sys.path.insert(0, UX)
from ux import *
B = 'http://localhost:8701'

def P(name):
    return OUT + '/' + name

def state(h):
    return h.js("(() => { const g = SFC.app.game; return { screen: SFC.app.screen, st: g && g.state, ui: SFC.UI.current, intro: SFC.Intro.active, draft: !!(g && g.draft), el: g && g.elapsed, sc: g && g.teams.map(t=>t.score) }; })()")

def wait_draft(h, tries=30):
    for i in range(tries):
        s = state(h)
        if s['draft'] and s['ui'] == 'draft':
            return s
        h.wait(300)
    return state(h)

def wait_state(h, st, tries=40):
    for i in range(tries):
        s = state(h)
        if s['st'] == st:
            return s
        h.wait(250)
    return state(h)

# ghi bàn thật cho đội t (0 = đội mình) : đặt bóng vào lưới
GOAL_JS = """(t) => { const g = SFC.app.game, f = g.field, b = g.ball; const me = g.controlled;
  if (b.owner) { b.owner.hasBall = false; b.owner = null; }
  b.owner = null; b.z = 0; b.vz = 0; b.vy = 0;
  const side = t === 0 ? 1 : -1; b.netSide = side; b.x = t === 0 ? f.x + f.w + b.r + 4 : f.x - b.r - 4; b.y = f.cy; b.vx = side * 10;
  b.lastTouch = t === 0 ? me : g.teams[1].players[0]; return [b.x, f.x, f.w]; }"""

def goal(h, t=0):
    return h.js(GOAL_JS, t)

# ẩn bảng RUN TEST (chỉ bản dev) cho ảnh sạch
def hide_dev(h):
    h.js("(() => { const t = SFC.RunTest; if (t && t.el) t.el.style.visibility = 'hidden'; window.__hideDev = setInterval(() => { const t = SFC.RunTest; if (t && t.el) t.el.style.visibility = 'hidden'; }, 100); })()")
