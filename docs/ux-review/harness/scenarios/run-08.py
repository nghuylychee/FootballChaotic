# run-08: mũi tên trong thẻ che map — trước: đi lần lượt theo danh sách · sau: đi theo vị trí trên màn hình (↓ = thẻ bên dưới / nút chân thẻ)
import sys
import os; UX = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # = docs/ux-review/harness
sys.path.insert(0, UX)
QUERY = '?runtest'
PROFILE = None
SEED = "(()=>{let s=777;Math.random=()=>{s=(s*1103515245+12345)>>>0;return s/4294967296;};})();"


def steps(pg, h):
    h.wait(400)
    h.move(1265, 712, wait=100)
    # LOCKER ROOM 2 hàng thẻ (đủ BADGE để nâng cấp)
    h.js(SEED + "SFC.RunTest.badges=Object.keys(SFC_CONFIG.run.badges).filter(id=>!SFC_CONFIG.run.badges[id].injury); SFC.RunTest.card('rest')")
    h.wait(1300)
    h.key('ArrowDown', wait=900)
    h.key('ArrowDown', wait=900)
    h.key('ArrowUp', wait=1100)
    # PICK A BADGE: ↓ một lần
    h.js(SEED + "SFC.RunTest.badges=[]; SFC.RunTest.card('offer')")
    h.wait(1200)
    h.key('ArrowDown', wait=1300)
    # KIT VAN: ↓ từ móc đầu
    h.js(SEED + "SFC.RunTest.card('shop')")
    h.wait(1200)
    h.key('ArrowDown', wait=1000)
    h.key('ArrowDown', wait=1300)


if __name__ == '__main__':
    from ux import record
    record('http://localhost:8701', steps, UX + '/videos/run-08-before.mp4', query=QUERY, profile=PROFILE)
    record('http://localhost:8714', steps, UX + '/videos/run-08-after.mp4', query=QUERY, profile=PROFILE)
