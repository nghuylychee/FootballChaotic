"""menus-03 — số thưởng chờ nhận (7) trên nút cúp biến mất khi vào TROPHY ROOM.
Cùng các bước chuột trên 2 bản: nút cúp trang chủ · nhãn ALBUM (2 lần) · dòng ACHIEVEMENTS trong mục lục (2 lần).
"""
import sys
import os; UX = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # = docs/ux-review/harness
sys.path.insert(0, UX)
from ux import record

QUERY = ''
PROFILE = None


def steps(pg, h):
    h.wait(300)
    # trang chủ: nút cúp có số 7
    h.hover('.hm-ach', steps=30, wait=1100)
    h.click(None, wait=1600)
    # phòng: bấm nhãn ALBUM
    h.move(652, 527, steps=30, wait=500)
    h.click(None, wait=1300)
    h.click(None, wait=1600)
    # album: dòng ACHIEVEMENTS trong mục lục
    h.move(900, 413, steps=30, wait=600)
    h.click(None, wait=1300)
    h.click(None, wait=1700)


if __name__ == '__main__':
    record('http://localhost:8701', steps, UX + '/videos/menus-03-before.mp4', query=QUERY, profile=PROFILE)
    record('http://localhost:8712', steps, UX + '/videos/menus-03-after.mp4', query=QUERY, profile=PROFILE)
