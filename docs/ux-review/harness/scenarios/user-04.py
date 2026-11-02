# user-04: tài xế KIT VAN — trước: đứng cả người trên khung cửa · sau: ngồi sau bậu cửa (ghế lái, 2 tay tì bậu)
import sys
import os; UX = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # = docs/ux-review/harness
sys.path.insert(0, UX)
QUERY = '?runtest'
PROFILE = None
# hàng trong xe ngẫu nhiên: cố định Math.random ngay trước khi mở Shop để 2 bản giống nhau
SEED = "(()=>{let s=12345;Math.random=()=>{s=(s*1103515245+12345)>>>0;return s/4294967296;};})();"


def steps(pg, h):
    h.wait(500)
    h.js(SEED + "SFC.RunTest.card('shop')")
    h.move(700, 600, wait=1500)
    # trỏ 2 món để tài xế nói
    h.hover('.kv-hit', nth=0, wait=1100)
    h.hover('.kv-hit', nth=3, wait=1100)
    h.move(1180, 560, wait=500)
    # phóng to vào cabin để thấy rõ tài xế
    h.js("(() => { const p = document.querySelector('.kv-page'); p.style.transition = 'transform .6s'; p.style.transformOrigin = '81% 37%'; p.style.transform = 'scale(2.6)'; })()")
    h.wait(3200)
    h.js("(() => { const p = document.querySelector('.kv-page'); p.style.transform = ''; })()")
    h.wait(1000)


if __name__ == '__main__':
    from ux import record
    record('http://localhost:8701', steps, UX + '/videos/user-04-before.mp4', query=QUERY, profile=PROFILE)
    record('http://localhost:8714', steps, UX + '/videos/user-04-after.mp4', query=QUERY, profile=PROFILE)
