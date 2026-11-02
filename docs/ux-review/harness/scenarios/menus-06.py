"""menus-06 — ULT BOOK in phím Ultimate cứng 'X' thay vì phím đang gán (mặc định Space).
Cùng các bước trên 2 bản: mở ULT BOOK (đã khám phá Light Cycle), chỉ vào phím ở góc lá bài và trong ghi chú,
rồi mở CONTROLS chỉ vào dòng Ultimate để so.
"""
import sys, json
import os; UX = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # = docs/ux-review/harness
sys.path.insert(0, UX)
from ux import record

QUERY = ''
PROFILE = UX + '/scenarios/menus-06-profile.json'


def steps(pg, h):
    h.go('ults', wait=900)
    # phím ở góc ảnh động của lá Tuyệt kỹ
    h.hover('.ul-panel .card-x', steps=30, wait=1400)
    # phím trong ghi chú "Charge it, then fire it with ..."
    h.hover('.ul-panel kbd:not(.card-x)', steps=30, wait=1600)
    # CONTROLS: Ultimate thật ra đang gán vào phím nào
    h.js("SFC.ControlsView.open(); SFC.Menu.go('controls')")
    h.wait(1000)
    h.move(640, 360, steps=10, wait=300)
    row = h.js("""(() => { const el = [...document.querySelectorAll('#menu *')].find(e => e.children.length === 0 && /^ULTIMATE$/i.test((e.textContent || '').trim()));
      if (!el) return null; const r = el.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()""")
    if row:
        h.move(row[0], row[1], steps=30, wait=1800)
    else:
        h.wait(1800)


if __name__ == '__main__':
    prof = json.load(open(PROFILE))
    record('http://localhost:8701', steps, UX + '/videos/menus-06-before.mp4', query=QUERY, profile=prof)
    record('http://localhost:8712', steps, UX + '/videos/menus-06-after.mp4', query=QUERY, profile=prof)
