# user-05 · PRIVATE MATCH nằm sau dòng tab chữ mờ: nút PLAY ở trang chủ + thanh tab đầu màn PLAY
QUERY = ''
PROFILE = None


def steps(pg, h):
    h.move(640, 300, steps=1, wait=1700)              # trang chủ: đọc dòng phụ dưới PLAY
    h.key('Enter', wait=1900)                         # vào màn PLAY (tab GOAT PATH)
    h.hover('.pt-tab', nth=1, steps=30, wait=1300)    # rê chuột lên tab PRIVATE MATCH
    h.key('e', wait=1900)                             # đổi sang PRIVATE MATCH
    h.key('q', wait=1300)                             # quay về GOAT PATH
