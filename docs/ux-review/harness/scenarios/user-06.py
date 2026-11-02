"""user-06: tab GOAT PATH — 3 thẻ ACT trông như 3 lựa chọn; START RUN / CONTINUE dễ bị bỏ qua.
Cảnh 1: chưa có run (rê chuột qua 3 act rồi tới START RUN). Cảnh 2: về trang chủ, có run đang chơi -> CONTINUE + act đang đá."""
import sys, json
import os; UX = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # = docs/ux-review/harness
sys.path.insert(0, UX)
from ux import record

QUERY = ''
PROFILE = UX + '/profile_run_map.json'


def steps(pg, h):
    # cảnh 1: cất run đi (người chơi mới, chưa có run)
    h.js("window.__r = SFC.Profile.data.run; SFC.Profile.data.run = null")
    h.wait(300)
    h.key('Enter', wait=1400)
    for x in (250, 640, 1030):
        h.move(x, 300, steps=22, wait=650)
    h.hover('.pt-btn.go', steps=22, wait=1100)
    # cảnh 2: có run đang chơi dở
    h.key('Escape', wait=900)
    h.js("SFC.Profile.data.run = window.__r")
    h.key('Enter', wait=1400)
    h.move(250, 300, steps=22, wait=800)
    h.hover('.pt-btn.go', steps=22, wait=1300)


if __name__ == '__main__':
    prof = json.load(open(PROFILE))
    which = sys.argv[1:] or ['before', 'after']
    if 'before' in which:
        record('http://localhost:8701', steps, UX + '/videos/user-06-before.mp4', query=QUERY, profile=prof)
    if 'after' in which:
        record('http://localhost:8713', steps, UX + '/videos/user-06-after.mp4', query=QUERY, profile=prof)
