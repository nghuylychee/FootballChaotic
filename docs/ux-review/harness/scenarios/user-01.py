# user-01 · Trang chủ: mục đang chọn phải là thứ nổi nhất và phải đi theo chuột / phím
QUERY = ''
PROFILE = None

def steps(pg, h):
    h.move(640, 330, steps=1, wait=900)          # mặc định: PLAY đang chọn
    h.hover('.hn-tab', nth=2, steps=30, wait=1300)   # rê chuột lên SHOP
    h.hover('.hn-tab', nth=0, steps=40, wait=1300)   # rê chuột sang CHARACTER
    h.move(640, 300, steps=20, wait=500)         # bỏ chuột ra giữa sân, chuyển sang bàn phím
    h.key('ArrowRight', wait=1000)
    h.key('ArrowRight', wait=1000)
    h.key('ArrowLeft', wait=1000)
    h.key('ArrowLeft', wait=1100)
