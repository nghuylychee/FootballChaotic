"""match-08: trận GOAT PATH có luật sân (PLASTIC STOOLS), LEGEND (Kun Ramen, HOTHEAD) và 3 BADGE.
Banner luật sân chỉ hiện 1 lần lúc giao bóng -> mở Pause.
Trước: Pause chỉ có Core 3 người. Sau: thêm 1 dải luật sân + LEGEND (kỹ thuật, phím, nhược điểm) + BADGE đội (tooltip)."""
import sys
import os; UX = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # = docs/ux-review/harness
sys.path.insert(0, UX); sys.path.insert(0, UX + '/review/match'); sys.path.insert(0, UX + '/w8716')
from mlib import wait_draft, wait_state, hide_dev

QUERY = '?runtest=match&legends=ramen,,&badges=var,report,watch'
PROFILE = None
EXTRA_INIT = "(() => { let s = 20261102; Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();"

def steps(pg, h):
    hide_dev(h)
    h.key('Enter', wait=300)
    wait_draft(h, 40); h.wait(500)
    h.key('Enter', wait=200)
    getattr(h, 'mark', lambda: None)()          # video bắt đầu từ lúc chọn Core xong -> thấy banner luật sân lúc giao bóng
    wait_state(h, 'play')
    h.wait(2800)
    h.key('Escape', wait=1000)                 # Pause
    h.move(330, 600, steps=24, wait=1300)      # luật sân
    h.move(720, 586, steps=18, wait=1300)      # tên LEGEND (tooltip: danh hiệu + nhược điểm)
    h.move(1022, 612, steps=18, wait=1500)     # BADGE đầu (tooltip)
    h.move(1056, 612, steps=8, wait=1000)

if __name__ == '__main__':
    from lib import rec
    rec('http://localhost:8701', steps, UX + '/videos/match-08-before.mp4', query=QUERY, extra_init=EXTRA_INIT)
    rec('http://localhost:8716', steps, UX + '/videos/match-08-after.mp4', query=QUERY, extra_init=EXTRA_INIT)
