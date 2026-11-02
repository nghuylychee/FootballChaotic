# menus-10 · Popup LANGUAGE (SETTINGS) không đóng được bằng chuột, rê chuột làm cả popup đổi ngôn ngữ
QUERY = ''
PROFILE = None


def steps(pg, h):
    h.move(200, 600, steps=1, wait=100)
    h.go('settings', wait=600)
    h.click('.mi', nth=2, wait=900)                    # mở LANGUAGE
    h.hover('.lp-row', nth=1, steps=25, wait=600)      # rê qua Brasil
    h.hover('.lp-row', nth=2, steps=12, wait=900)      # rê qua Português: cả popup đổi tiếng
    h.move(1120, 420, steps=30, wait=1100)             # rời danh sách, ra ngoài khung
    h.click(None, wait=1300)                           # bấm ra ngoài khung
    h.click('.mi', nth=2, wait=900)                    # (bản sau: mở lại) LANGUAGE
    h.move(650, 600, steps=30, wait=700)               # chỗ nút ◀ BACK của popup (bản sau)
    h.click(None, wait=1300)
