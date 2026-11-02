# run-06: sự kiện ??? — gợi ý khó hiểu, chọn sẵn lựa chọn không dùng được, kết quả chỉ là 1 dòng nhỏ dưới map
import sys
import os; UX = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # = docs/ux-review/harness
sys.path.insert(0, UX)
QUERY = '?runtest'
PROFILE = None
SEED = "(()=>{let s=55;Math.random=()=>{s=(s*1103515245+12345)>>>0;return s/4294967296;};})();"
# đứng ở node tầng 0 rồi mở sự kiện id với tiền run = cash
OPEN = SEED + "(([id, cash]) => { SFC.RunTest.card('map'); const R=SFC.Run.run,n=R.map.floors[0][0]; R.at=n.id; R.path=[n.id]; R.cash=cash; R.room={kind:'event',id}; SFC.RunUI.reset(); SFC.Menu.render(); })"


def steps(pg, h):
    h.wait(400)
    h.move(640, 600, wait=100)
    # thiếu tiền: Bet mờ — đang được chọn sẵn? bấm vào thì nói gì?
    h.js(OPEN + "(['bet', 10])")
    h.wait(1800)
    h.click('.rm-sheet-foot .pt-btn', nth=0, wait=1800)
    # đủ tiền, thắng cược (cố định kết quả)
    h.move(640, 600, wait=100)
    h.js(OPEN + "(['bet', 100])")
    h.wait(1000)
    h.js("Math.random=()=>0.1")
    h.click('.rm-sheet-foot .pt-btn', nth=0, wait=2600)
    # OLD COACH: được BADGE + dính chấn thương
    h.move(640, 600, wait=100)
    h.js(OPEN + "(['coach', 100])")
    h.wait(1400)
    h.js("Math.random=()=>0.1")
    h.click('.rm-sheet-foot .pt-btn', nth=0, wait=2600)


if __name__ == '__main__':
    from ux import record
    record('http://localhost:8701', steps, UX + '/videos/run-06-before.mp4', query=QUERY, profile=PROFILE)
    record('http://localhost:8714', steps, UX + '/videos/run-06-after.mp4', query=QUERY, profile=PROFILE)
