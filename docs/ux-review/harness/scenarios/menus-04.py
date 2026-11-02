# menus-04 · Chuột và bàn phím chọn 2 chỗ khác nhau (SETTINGS, ULT BOOK, PRIVATE MATCH)
# Không bấm Enter / click ở PRIVATE MATCH (CREATE ROOM sẽ mở phòng thật)
QUERY = ''
PROFILE = None


def steps(pg, h):
    h.move(900, 600, steps=1, wait=100)
    h.go('settings', wait=900)                                  # SOUND & DISPLAY đang chọn
    h.hover('.mi', nth=1, steps=25, wait=700)                   # rê lên CONTROLS
    h.hover('.mi', nth=2, steps=20, wait=1100)                  # rê lên LANGUAGE
    h.key('ArrowDown', wait=1100)                               # bàn phím đi tiếp từ đâu?
    h.go('ults', wait=700)
    h.hover('.ub-t:not(.ub-none)', nth=0, steps=25, wait=700)   # rê qua vài ô của sổ
    h.hover('.ub-t:not(.ub-none)', nth=20, steps=20, wait=900)
    h.go('online', wait=800)                                    # PRIVATE MATCH: CREATE ROOM đang chọn
    h.hover('.pt-tile', nth=1, steps=30, wait=1400)             # rê lên JOIN ROOM
    h.hover('.pt-tile', nth=0, steps=30, wait=1000)             # rê về CREATE ROOM
