"""match-07: Ultimate đầy nhưng sai luật cầm bóng (Meteor Shot cần chính mình giữ bóng) -> bấm Space.
Trước: im lặng. Sau: ô rung + 'Use it while you hold the ball'. Rồi cầm bóng -> bấm lại -> ra chiêu."""
import sys
import os; UX = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # = docs/ux-review/harness
sys.path.insert(0, UX); sys.path.insert(0, UX + '/review/match'); sys.path.insert(0, UX + '/w8716')
from mlib import wait_draft, wait_state, hide_dev

QUERY = '?runtest=match'
PROFILE = None
# Math.random có seed: 2 bản chạy cùng trận
EXTRA_INIT = "(() => { let s = 20261102; Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();"

SETUP = """(() => { const g = SFC.app.game, p = g.controlled;
  g.opts.noAI = true; g.mod = null;         // AI đứng yên, tắt luật sân (ghế nhựa ném vào người cầm bóng): 2 bản quay cùng 1 khung cảnh
  for (const q of g.players) if (q !== p) { q.intent.mx = q.intent.my = 0; q.intent.sprint = false; }
  g.cores.add(p, 'meteor_strike'); p.res.ult = 1;
  const mate = g.teams[p.team].players.find((q) => q !== p);
  g.ball.setOwner(mate);                    // đồng đội cầm bóng: Meteor Shot chưa dùng được
  window.__full = setInterval(() => { if (!window.__used) SFC.app.game.controlled.res.ult = 1; }, 50);
  return [g.cores.ultOf(p), g.cores.ultBlocked(p)]; })()"""

def steps(pg, h):
    hide_dev(h)
    h.key('Enter', wait=300)
    wait_draft(h, 40); h.wait(500)
    h.key('Enter', wait=1800)
    wait_state(h, 'play')
    h.wait(2400)                              # banner luật sân tắt
    h.js(SETUP)
    getattr(h, 'mark', lambda: None)()        # video bắt đầu ở đây
    h.move(700, 600, steps=20, wait=700)      # rê chuột tới ô Ultimate (đang tối, ghi FULL)
    h.key('Space', wait=1400)
    h.key('Space', wait=1400)
    # đưa bóng cho chính mình -> ô sáng -> bấm lại: ra chiêu
    h.js("(() => { const g = SFC.app.game; g.ball.setOwner(g.controlled); })()")
    h.wait(900)
    h.js("window.__used = true")
    h.key('Space', wait=2600)

if __name__ == '__main__':
    from lib import rec
    rec('http://localhost:8701', steps, UX + '/videos/match-07-before.mp4', query=QUERY, extra_init=EXTRA_INIT)
    rec('http://localhost:8716', steps, UX + '/videos/match-07-after.mp4', query=QUERY, extra_init=EXTRA_INIT)
