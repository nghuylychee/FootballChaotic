"""menus-11 — TROPHY ROOM trống (chưa có run nào): kệ cúp và bảng ghim không nói cách lấp đầy.
Cùng các bước trên 2 bản (đã nhận hết thưởng ACHIEVEMENTS để phòng mở ở góc TROPHIES như người chơi mới):
mở kệ cúp · lên cúp GOAT · về phòng · sang bảng ghim RUNS.
"""
import sys
import os; UX = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # = docs/ux-review/harness
sys.path.insert(0, UX)
from ux import record

QUERY = ''
PROFILE = None


def steps(pg, h):
    # coi như đã nhận hết thưởng (không có số chờ nhận) -> phòng mở ở góc đầu như bình thường
    h.js("SFC.Profile.data.ach = SFC.Achievements.list().filter((a) => SFC.Achievements.progress(a).done).map((a) => a.id); SFC.Profile.save(); SFC.Menu.render()")
    h.wait(300)
    h.hover('.hm-ach', steps=25, wait=500)
    h.click(None, wait=1100)
    h.key('Enter', wait=1900)        # kệ cúp
    h.key('ArrowUp', wait=1700)      # cúp GOAT
    h.key('Escape', wait=700)
    h.key('ArrowRight', wait=500)
    h.key('ArrowRight', wait=800)
    h.key('Enter', wait=2200)        # bảng ghim RUNS


if __name__ == '__main__':
    record('http://localhost:8701', steps, UX + '/videos/menus-11-before.mp4', query=QUERY, profile=PROFILE)
    record('http://localhost:8712', steps, UX + '/videos/menus-11-after.mp4', query=QUERY, profile=PROFILE)
