# run-10: dòng báo che nút BACK / bảng chú thích · thẻ mờ không nói lý do · LOCKER ROOM cắt nhãn / tên / dòng độ hiếm
import sys
import os; UX = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # = docs/ux-review/harness
sys.path.insert(0, UX)
QUERY = '?runtest'
PROFILE = None
SEED = "(()=>{let s=99;Math.random=()=>{s=(s*1103515245+12345)>>>0;return s/4294967296;};})();"


def steps(pg, h):
    h.wait(400)
    h.move(1265, 712, wait=100)
    # Who wears it?: 1 người đã đeo đúng món này
    h.js(SEED + "SFC.RunTest.card('gear'); const R=SFC.Run.run; R.squad[1].gear=[Object.assign({}, R.offer.gear[0], {up:false})]; SFC.Menu.render()")
    h.wait(700)
    h.key('Enter', wait=1600)
    h.click('.lg-pick.dis button.sq-card', wait=1800)
    # LOCKER ROOM: 1 thẻ chữa (tên người dưới thẻ) rồi đủ BADGE (2 hàng)
    h.move(1265, 712, wait=100)
    h.js(SEED + "SFC.RunTest.card('rest')")
    h.wait(1600)
    h.js(SEED + "SFC.RunTest.badges=Object.keys(SFC_CONFIG.run.badges).filter(id=>!SFC_CONFIG.run.badges[id].injury); SFC.RunTest.card('rest')")
    h.wait(2000)
    # dòng báo trên map
    h.js(SEED + "SFC.RunTest.badges=[]; SFC.RunTest.card('map'); SFC.Menu.setMsg('BADGE: Kit Bag')")
    h.wait(1800)


if __name__ == '__main__':
    from ux import record
    record('http://localhost:8701', steps, UX + '/videos/run-10-before.mp4', query=QUERY, profile=PROFILE)
    record('http://localhost:8714', steps, UX + '/videos/run-10-after.mp4', query=QUERY, profile=PROFILE)
