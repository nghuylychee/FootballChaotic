"""run-07: cut-scene act — chuột không bỏ qua được, gợi ý bỏ qua gần như vô hình, hình ⊘ trông như nút.
Lần 1: cut-scene mở act 1 (kiểu nhật ký) -> rê chuột lên góc trên phải, bấm. Lần 2: chiếu lại -> giữ chuột giữa màn 1.6 s."""
import sys, json
import os; UX = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # = docs/ux-review/harness
sys.path.insert(0, UX)
from ux import record

QUERY = ''
PROFILE = UX + '/profile_run_map.json'
PLAY = "SFC.RunUI.cutscene(0, 'intro', () => SFC.RunUI.back2map())"   # đúng cut-scene chiếu khi vào act 1


def steps(pg, h):
    h.go('runmap', wait=300)
    h.js(PLAY)
    h.wait(2400)
    h.move(1190, 38, steps=30, wait=800)   # góc trên phải: chỗ hình ⊘ (bản cũ) / nút SKIP ALL (bản mới)
    h.click(wait=1300)
    # lần 2: giữ chuột giữa màn
    h.js(PLAY)
    h.move(640, 330, steps=24, wait=900)
    pg.mouse.down(); h.wait(1600); pg.mouse.up()
    h.wait(1400)


if __name__ == '__main__':
    prof = json.load(open(PROFILE))
    which = sys.argv[1:] or ['before', 'after']
    if 'before' in which:
        record('http://localhost:8701', steps, UX + '/videos/run-07-before.mp4', query=QUERY, profile=prof)
    if 'after' in which:
        record('http://localhost:8713', steps, UX + '/videos/run-07-after.mp4', query=QUERY, profile=prof)
