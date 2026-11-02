"""run-12: BUILD YOUR SQUAD không nói phải làm gì, START RUN ẩn tới khi đủ người.
Vào màn chọn đội -> đứng nhìn -> bấm chuột vào chỗ nút START RUN (giữa màn) -> bấm Enter 2 lần."""
import sys, json
import os; UX = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # = docs/ux-review/harness
sys.path.insert(0, UX)
from ux import record

QUERY = ''
PROFILE = None   # hồ sơ mặc định (chưa có run)


def steps(pg, h):
    h.key('Enter', wait=1000)      # PLAY -> tab GOAT PATH
    h.key('Enter', wait=1600)      # START RUN -> BUILD YOUR SQUAD
    h.move(640, 470, steps=24, wait=500)
    h.click(wait=1300)             # bấm vào chỗ nút START RUN
    h.key('Enter', wait=1100)
    h.key('Enter', wait=1800)


if __name__ == '__main__':
    which = sys.argv[1:] or ['before', 'after']
    if 'before' in which:
        record('http://localhost:8701', steps, UX + '/videos/run-12-before.mp4', query=QUERY, profile=PROFILE)
    if 'after' in which:
        record('http://localhost:8713', steps, UX + '/videos/run-12-after.mp4', query=QUERY, profile=PROFILE)
