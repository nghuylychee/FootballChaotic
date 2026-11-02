# run-05: thẻ UPGRADE ở LOCKER ROOM — trước: y câu của BADGE gốc · sau: câu vàng ▲ nói bản + hơn chỗ nào
import sys
import os; UX = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # = docs/ux-review/harness
sys.path.insert(0, UX)
QUERY = '?runtest'
PROFILE = None
SEED = "(()=>{let s=31;Math.random=()=>{s=(s*1103515245+12345)>>>0;return s/4294967296;};})();"


def steps(pg, h):
    h.wait(400)
    h.move(640, 700, wait=100)
    h.js(SEED + "SFC.RunTest.badges=['report','coin','drink','var','watch','sponsor','ticket','shin','bibs']; SFC.RunTest.card('rest')")
    h.wait(2200)
    h.hover('.bd-card', nth=1, wait=1500)   # Scouting Report+
    h.hover('.bd-card', nth=4, wait=1500)   # VAR Monitor+
    h.hover('.bd-card', nth=8, wait=1500)   # Shin Guards+
    h.move(640, 700, wait=1000)


if __name__ == '__main__':
    from ux import record
    record('http://localhost:8701', steps, UX + '/videos/run-05-before.mp4', query=QUERY, profile=PROFILE)
    record('http://localhost:8714', steps, UX + '/videos/run-05-after.mp4', query=QUERY, profile=PROFILE)
