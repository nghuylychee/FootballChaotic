"""run-09: dải đội hình trên map là nút không nhãn, BADGE của đội không thấy trên map; trong SQUAD chỉ rê chuột mới đọc được BADGE / GEAR / LEGEND.
Map (runtest: 8 BADGE, 1 LEGEND, 2 GEAR) -> rê chuột qua dải đội hình -> phím: ↓ Enter (mở SQUAD) -> ↑ → ↑ ← (đọc từng món bằng phím)."""
import sys, json
import os; UX = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # = docs/ux-review/harness
sys.path.insert(0, UX)
from ux import record

QUERY = '?runtest'
PROFILE = None
SETUP = ("SFC.RunTest.badges = ['report','coin','ticket','var','camp','kitbag','drink','watch']; SFC.RunTest.legs = ['ramen', null, null]; SFC.RunTest.card('map');"
         "SFC.Run.run.squad[1].gear = [{ id: 'spikes', r: 'rare' }, { id: 'boots', r: 'epic' }]; SFC.Menu.render()")


def steps(pg, h):
    h.wait(600)
    h.js(SETUP)
    h.wait(1300)
    h.move(250, 70, steps=26, wait=1100)       # dải đội hình góc trên trái
    h.move(1230, 690, steps=20, wait=300)      # chuột ra góc, đi bằng phím
    h.key('ArrowDown', wait=500)
    h.key('Enter', wait=1000)                  # mở SQUAD
    for k in ['ArrowUp', 'ArrowRight', 'ArrowUp', 'ArrowLeft']:
        h.key(k, wait=1200)


if __name__ == '__main__':
    which = sys.argv[1:] or ['before', 'after']
    if 'before' in which:
        record('http://localhost:8701', steps, UX + '/videos/run-09-before.mp4', query=QUERY, profile=PROFILE)
    if 'after' in which:
        record('http://localhost:8713', steps, UX + '/videos/run-09-after.mp4', query=QUERY, profile=PROFILE)
