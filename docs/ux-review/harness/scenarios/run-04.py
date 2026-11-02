# run-04: KIT VAN — thẻ giá không đủ tiền, nhãn BADGE (cả đội) / GEAR (1 người), dòng HOT, mua GEAR không cắt bàn tay
import sys
import os; UX = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # = docs/ux-review/harness
sys.path.insert(0, UX)
QUERY = '?runtest'
PROFILE = None
# hàng trong xe ngẫu nhiên: cố định Math.random ngay trước khi mở Shop (móc: coin 40 · drink 110 · sponsor 35 HOT · GEAR scarf 70 · GEAR band 70)
SEED = "(()=>{let s=12345;Math.random=()=>{s=(s*1103515245+12345)>>>0;return s/4294967296;};})();"


def steps(pg, h):
    h.wait(400)
    h.js(SEED + "SFC.RunTest.card('shop'); SFC.Run.run.cash = 75; SFC.Menu.render()")
    h.move(640, 640, wait=1800)
    h.hover('.kv-hit', nth=2, wait=1500)    # BADGE HOT
    h.hover('.kv-hit', nth=3, wait=1500)    # GEAR
    h.hover('.kv-hit', nth=1, wait=900)     # 110: không đủ tiền
    h.click('.kv-hit', nth=1, wait=1300)
    h.click('.kv-hit', nth=3, wait=2200)    # mua GEAR


if __name__ == '__main__':
    from ux import record
    record('http://localhost:8701', steps, UX + '/videos/run-04-before.mp4', query=QUERY, profile=PROFILE)
    record('http://localhost:8714', steps, UX + '/videos/run-04-after.mp4', query=QUERY, profile=PROFILE)
