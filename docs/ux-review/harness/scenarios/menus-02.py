"""menus-02 — nhận thưởng ACHIEVEMENTS bằng Enter liên tục.
Cùng các bước trên 2 bản: mở ACHIEVEMENTS (7 thưởng chờ nhận, 640 gold), bấm Enter 6 lần, chậm.
Bản cũ: lần Enter thứ 3 / 5 là OPEN ANOTHER tốn 100 gold. Bản mới: về ACHIEVEMENTS, nhận thưởng kế, gold giữ nguyên.
"""
import sys
import os; UX = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # = docs/ux-review/harness
sys.path.insert(0, UX)
from ux import record

QUERY = ''
PROFILE = None


def steps(pg, h):
    h.js("SFC.AchUI.open(SFC.Menu)")
    h.wait(600)
    # chỉ chuột vào dòng mô tả phần thưởng (bản cũ: "Open it for free in the SHOP")
    h.move(1030, 440, steps=25, wait=1300)
    h.key('Enter', wait=1100)    # nhận Kickoff -> quay hộp
    h.key('Enter', wait=1500)    # bỏ qua dải quay -> kết quả (gold 640)
    h.key('Enter', wait=1600)    # tưởng là "tiếp" -> bản cũ: mua hộp 100 gold
    h.key('Enter', wait=1500)
    h.key('Enter', wait=1500)
    h.key('Enter', wait=1700)


if __name__ == '__main__':
    record('http://localhost:8701', steps, UX + '/videos/menus-02-before.mp4', query=QUERY, profile=PROFILE)
    record('http://localhost:8712', steps, UX + '/videos/menus-02-after.mp4', query=QUERY, profile=PROFILE)
