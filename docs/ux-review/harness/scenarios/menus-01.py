"""menus-01 — SHOP / OPEN BOX dùng bằng chuột.
Cùng các bước trên 2 bản: bấm dòng OPEN BOX · bấm lại ô hộp đang chọn (bản cũ = mua luôn) · bấm EQUIP · bấm góc ◀ BACK.
"""
import sys, json
import os; UX = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # = docs/ux-review/harness
sys.path.insert(0, UX)
from ux import record

QUERY = ''
PROFILE = None


def steps(pg, h):
    h.go('shop', wait=900)
    # 1) rê chuột tới dòng "OPEN BOX · 100" và bấm
    h.hover('.box-detail .sd-act', steps=30, wait=900)
    h.click(None, wait=1300)
    # 2) bấm lại ô Street Box đang chọn bên trái (bản cũ: mua luôn, không hỏi)
    h.move(235, 175, steps=30, wait=700)
    h.click(None, wait=900)
    h.wait(4300)   # chờ dải quay dừng
    # 3) bấm EQUIP trên kết quả
    h.hover('.rv-act', nth=1, steps=30, wait=700)
    h.click(None, wait=1100)
    # 4) tìm đường quay lại bằng chuột: góc trên trái (◀ BACK)
    h.move(62, 40, steps=30, wait=600)
    h.click(None, wait=1300)


if __name__ == '__main__':
    record('http://localhost:8701', steps, UX + '/videos/menus-01-before.mp4', query=QUERY, profile=PROFILE)
    record('http://localhost:8712', steps, UX + '/videos/menus-01-after.mp4', query=QUERY, profile=PROFILE)
