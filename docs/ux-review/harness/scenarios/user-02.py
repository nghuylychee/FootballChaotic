"""user-02: map GOAT PATH — node đang chọn gần như không khác các node đi được khác; rê chuột không dời dấu chọn.
Vào map act 1 -> → → (phím) -> rê chuột qua node trái rồi node phải -> ← (phím)."""
import sys, json
import os; UX = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # = docs/ux-review/harness
sys.path.insert(0, UX)
from ux import record

QUERY = ''
PROFILE = UX + '/profile_run_map.json'


def steps(pg, h):
    h.key('Enter', wait=1000)      # PLAY -> tab GOAT PATH
    h.key('Enter', wait=1500)      # CONTINUE -> map
    h.key('ArrowRight', wait=1000)
    h.key('ArrowRight', wait=1100)
    h.hover('.rm-node.avail', nth=0, steps=26, wait=1200)
    h.hover('.rm-node.avail', nth=1, steps=26, wait=1200)
    h.key('ArrowLeft', wait=1300)


if __name__ == '__main__':
    prof = json.load(open(PROFILE))
    which = sys.argv[1:] or ['before', 'after']
    if 'before' in which:
        record('http://localhost:8701', steps, UX + '/videos/user-02-before.mp4', query=QUERY, profile=prof)
    if 'after' in which:
        record('http://localhost:8713', steps, UX + '/videos/user-02-after.mp4', query=QUERY, profile=prof)
