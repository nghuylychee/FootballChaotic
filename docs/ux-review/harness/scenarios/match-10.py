"""match-10: ghi bàn -> máy quay phóng to người ghi bàn đang ăn mừng.
Trước: 'GOAL!' + 'LONG · LONG FC' nằm giữa màn, đè lên đầu người ghi bàn.
Sau: banner nằm sát dưới bảng tỉ số, thấy trọn động tác ăn mừng."""
import sys
import os; UX = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # = docs/ux-review/harness
sys.path.insert(0, UX); sys.path.insert(0, UX + '/review/match'); sys.path.insert(0, UX + '/w8716')
from mlib import wait_draft, wait_state, hide_dev, GOAL_JS

QUERY = '?runtest=match'
PROFILE = None
EXTRA_INIT = "(() => { let s = 20261102; Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();"

# AI đứng yên, người chơi đứng giữa phần sân đối thủ (máy quay đưa vào chính giữa màn) (2 bản cùng 1 khung cảnh)
SETUP = """(() => { const g = SFC.app.game, f = g.field, p = g.controlled;
  g.opts.noAI = true;
  for (const q of g.players) if (q !== p) { q.intent.mx = q.intent.my = 0; q.intent.sprint = false; }
  if (g.ball.owner) g.ball.owner = null;
  p.x = f.x + f.w * 0.62; p.y = f.cy + 10; })()"""

def steps(pg, h):
    hide_dev(h)
    h.key('Enter', wait=300)
    wait_draft(h, 40); h.wait(500)
    h.key('Enter', wait=1800)
    wait_state(h, 'play')
    h.wait(2400)                                 # banner luật sân tắt
    h.js(SETUP)
    getattr(h, 'mark', lambda: None)()
    h.wait(1200)
    h.js(GOAL_JS, 0)                             # bóng vào lưới, người chơi ghi bàn
    h.wait(3600)                                 # banner GOAL! + máy quay ăn mừng
    h.wait(800)

if __name__ == '__main__':
    from lib import rec
    rec('http://localhost:8701', steps, UX + '/videos/match-10-before.mp4', query=QUERY, extra_init=EXTRA_INIT)
    rec('http://localhost:8716', steps, UX + '/videos/match-10-after.mp4', query=QUERY, extra_init=EXTRA_INIT)
