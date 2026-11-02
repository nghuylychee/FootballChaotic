"""match-05: LEGEND TRIAL của Andrea Pirlow: phải làm 3 lần LOFTED THROUGH.
Trước: banner chỉ 'Pull it off 3 times', HUD chỉ '0 / 3 LOFTED THROUGH' (không có phím).
Sau: banner thêm '· Q + W', HUD có keycap tổ hợp phím (theo phím đang gán) suốt bài."""
import sys
import os; UX = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # = docs/ux-review/harness
sys.path.insert(0, UX); sys.path.insert(0, UX + '/review/match'); sys.path.insert(0, UX + '/w8716')
from mlib import hide_dev

QUERY = '?runtest=trial.pirlow'
PROFILE = None
EXTRA_INIT = "(() => { let s = 20261102; Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();"

def steps(pg, h):
    hide_dev(h)
    getattr(h, 'mark', lambda: None)()
    h.wait(2600)                                   # banner mở bài (2.4 s)
    h.move(640, 190, steps=24, wait=400)           # rê chuột lên bảng tiến độ trên HUD
    h.move(640, 130, steps=12, wait=2600)          # giữ: '0 / 3 LOFTED THROUGH' (+ phím ở bản sau)
    h.move(660, 600, steps=24, wait=400)           # xuống ô LEGEND trên thanh kỹ năng
    h.move(757, 686, steps=16, wait=1500)

if __name__ == '__main__':
    from lib import rec
    rec('http://localhost:8701', steps, UX + '/videos/match-05-before.mp4', query=QUERY, extra_init=EXTRA_INIT)
    rec('http://localhost:8716', steps, UX + '/videos/match-05-after.mp4', query=QUERY, extra_init=EXTRA_INIT)
