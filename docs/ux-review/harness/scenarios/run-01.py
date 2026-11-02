# run-01: Esc ở thẻ PICK A BADGE / KIT VAN — trước: mất thưởng / rời Shop ngay · sau: chỉ dời chọn tới SKIP / LEAVE
import sys
import os; UX = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # = docs/ux-review/harness
sys.path.insert(0, UX)
QUERY = '?runtest'
PROFILE = None
SEED = "(()=>{let s=12345;Math.random=()=>{s=(s*1103515245+12345)>>>0;return s/4294967296;};})();"


def steps(pg, h):
    h.wait(400)
    h.move(1240, 700, wait=100)
    h.js(SEED + "SFC.RunTest.card('offer')")
    h.wait(1800)
    h.key('Escape', wait=1600)
    h.key('Escape', wait=1400)
    # KIT VAN
    h.js(SEED + "SFC.RunTest.card('shop')")
    h.wait(1800)
    h.key('Escape', wait=1600)
    h.key('Escape', wait=1400)


if __name__ == '__main__':
    from ux import record
    record('http://localhost:8701', steps, UX + '/videos/run-01-before.mp4', query=QUERY, profile=PROFILE)
    record('http://localhost:8714', steps, UX + '/videos/run-01-after.mp4', query=QUERY, profile=PROFILE)
