"""menus-07 — muốn đổi kiểu ăn mừng / mũ: vào đâu?
Cùng các bước trên 2 bản: CHARACTER › APPEARANCE (tìm trang phục) · bấm chỗ dòng thứ 4 (bản mới: COSTUMES) ·
về CHARACTER bấm dòng CELEBRATION đang mặc · cuối cùng mở INVENTORY xem tên tab.
"""
import sys
import os; UX = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # = docs/ux-review/harness
sys.path.insert(0, UX)
from ux import record

QUERY = ''
PROFILE = None


def steps(pg, h):
    h.go('char', wait=900)
    # 1) bấm APPEARANCE (tưởng là chỗ đổi mũ / ăn mừng)
    h.hover('.m-items [data-i]', nth=1, steps=25, wait=500)
    h.click(None, wait=1300)
    # 2) bấm dòng thứ 4 của danh sách (bản mới: COSTUMES · bản cũ: trống)
    h.move(160, 340, steps=30, wait=700)
    h.click(None, wait=1500)
    # 3) về CHARACTER, bấm dòng CELEBRATION trong bảng đồ đang mặc
    h.go('char', wait=800)
    h.hover('.eq-list > *', nth=4, steps=30, wait=700)
    h.click(None, wait=1500)
    # 4) INVENTORY: tên tab trang phục
    h.js("SFC.Gacha.invBack = 'char'")
    h.go('inv', wait=600)
    h.hover('.tab', nth=0, steps=30, wait=1500)


if __name__ == '__main__':
    record('http://localhost:8701', steps, UX + '/videos/menus-07-before.mp4', query=QUERY, profile=PROFILE)
    record('http://localhost:8712', steps, UX + '/videos/menus-07-after.mp4', query=QUERY, profile=PROFILE)
