"""menus-05 — INVENTORY dùng bằng chuột: mặc đồ, phân rã, phân rã đồ trùng.
Cùng các bước trên 2 bản (6 trang phục, mỗi món ×2): chọn Neon Kicks · bấm EQUIP · bấm DISMANTLE · bấm 2 lần chỗ ngay dưới lưới
(bản mới: nút phân rã đồ trùng).
"""
import sys, json
import os; UX = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # = docs/ux-review/harness
sys.path.insert(0, UX)
from ux import record

QUERY = ''
PROFILE = UX + '/scenarios/menus-05-profile.json'


def steps(pg, h):
    h.js("SFC.Gacha.invBack = 'char'")
    h.go('inv', wait=900)
    # chọn Neon Kicks
    h.hover('.icard', nth=1, steps=25, wait=400)
    h.click(None, wait=900)
    # bấm dòng EQUIP ở bảng phải
    h.hover('.inv-detail .sd-act', nth=0, steps=30, wait=600)
    h.click(None, wait=1300)
    # bấm dòng DISMANTLE
    h.hover('.inv-detail .sd-act', nth=1, steps=30, wait=600)
    h.click(None, wait=1300)
    # ngay dưới lưới (bản mới: nút phân rã đồ trùng) — bấm 2 lần để xác nhận
    h.move(245, 405, steps=30, wait=700)
    h.click(None, wait=1000)
    h.click(None, wait=1600)


if __name__ == '__main__':
    prof = json.load(open(PROFILE))
    record('http://localhost:8701', steps, UX + '/videos/menus-05-before.mp4', query=QUERY, profile=prof)
    record('http://localhost:8712', steps, UX + '/videos/menus-05-after.mp4', query=QUERY, profile=prof)
