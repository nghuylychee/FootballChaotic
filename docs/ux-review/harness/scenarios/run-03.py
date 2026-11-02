# run-03: chuột và phím chọn 2 thẻ khác nhau — trước: 2 thẻ cùng sáng, Enter lấy thẻ của phím · sau: rê chuột = dời luôn mục chọn
import sys
import os; UX = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # = docs/ux-review/harness
sys.path.insert(0, UX)
QUERY = '?runtest'
PROFILE = None
SEED = "(()=>{let s=4242;Math.random=()=>{s=(s*1103515245+12345)>>>0;return s/4294967296;};})();"


def steps(pg, h):
    h.wait(400)
    h.move(640, 690, wait=100)
    h.js(SEED + "SFC.RunTest.card('offer')")
    h.wait(1300)
    h.key('ArrowRight', wait=700)               # phím: thẻ giữa
    h.hover('.pb-card', nth=2, wait=1600)       # chuột: thẻ phải
    h.key('Enter', wait=2000)                   # nhận thẻ nào?
    # LEGEND xin vào đội: chuột trỏ 1 thẻ (xem trước chỉ số), phím đứng thẻ khác
    h.js(SEED + "SFC.RunTest.card('join','pirlow')")
    h.move(640, 690, wait=1000)
    h.key('ArrowRight', wait=600)
    h.hover('.lg-pick', nth=2, wait=1600)
    h.key('Enter', wait=3200)


if __name__ == '__main__':
    from ux import record
    record('http://localhost:8701', steps, UX + '/videos/run-03-before.mp4', query=QUERY, profile=PROFILE)
    record('http://localhost:8714', steps, UX + '/videos/run-03-after.mp4', query=QUERY, profile=PROFILE)
