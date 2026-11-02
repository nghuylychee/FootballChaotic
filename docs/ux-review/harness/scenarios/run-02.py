"""run-02: map không cuộn được bằng phím / tay cầm, không có dấu nào cho biết map còn phía trên.
Vào map act 1 -> ↑ x5 (xem đường tới boss) -> giữ -> ↓ x5 (về chỗ đang đứng)."""
import sys, json
import os; UX = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # = docs/ux-review/harness
sys.path.insert(0, UX)
from ux import record

QUERY = ''
PROFILE = UX + '/profile_run_map.json'


def steps(pg, h):
    h.key('Enter', wait=1000)      # PLAY -> tab GOAT PATH
    h.key('Enter', wait=1800)      # CONTINUE -> map (nhìn mép trên khung)
    for i in range(5):
        h.key('ArrowUp', wait=650)
    h.wait(1100)
    for i in range(5):
        h.key('ArrowDown', wait=650)
    h.wait(900)


if __name__ == '__main__':
    prof = json.load(open(PROFILE))
    which = sys.argv[1:] or ['before', 'after']
    if 'before' in which:
        record('http://localhost:8701', steps, UX + '/videos/run-02-before.mp4', query=QUERY, profile=prof)
    if 'after' in which:
        record('http://localhost:8713', steps, UX + '/videos/run-02-after.mp4', query=QUERY, profile=prof)
