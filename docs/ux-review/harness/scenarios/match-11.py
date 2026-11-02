"""match-11: gợi ý bấm qua ở màn VS, Beat 1 sau còi và lúc đếm thưởng.
Trước: 'Enter skip' ở màn VS gần như vô hình (bị dải màu áo phủ mờ), Beat 1 và lúc đếm REWARDS không có gợi ý.
Sau: cùng 1 ô nền tối 'Enter skip' ở góc dưới phải cả 3 chỗ."""
import sys
import os; UX = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # = docs/ux-review/harness
sys.path.insert(0, UX); sys.path.insert(0, UX + '/review/match'); sys.path.insert(0, UX + '/w8716')
from mlib import wait_draft, wait_state, hide_dev

QUERY = '?runtest=match'
PROFILE = None
EXTRA_INIT = "(() => { let s = 20261102; Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();"

def steps(pg, h):
    hide_dev(h)
    getattr(h, 'mark', lambda: None)()
    h.move(1180, 640, steps=24, wait=2200)       # màn VS: góc dưới phải / trái
    h.key('Enter', wait=300)                     # bỏ qua màn VS
    wait_draft(h, 40); h.wait(400)
    h.key('Enter', wait=1600)                    # chọn Core đầu trận
    wait_state(h, 'play')
    h.wait(600)
    h.key('0', wait=2600)                        # thắng ngay (dev) -> Beat 1 trên sân
    h.wait(2400)                                 # Beat 2: đang đếm REWARDS
    h.key('Enter', wait=1600)                    # bấm qua phần đếm

if __name__ == '__main__':
    from lib import rec
    rec('http://localhost:8701', steps, UX + '/videos/match-11-before.mp4', query=QUERY, extra_init=EXTRA_INIT)
    rec('http://localhost:8716', steps, UX + '/videos/match-11-after.mp4', query=QUERY, extra_init=EXTRA_INIT)
