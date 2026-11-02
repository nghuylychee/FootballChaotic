# menus-09 · Trận demo phía sau lộ qua chữ menu ở các trang con (ULT BOOK, SETTINGS, CHARACTER)
# Chữ bật ra của trận demo (SMASH!, SAVE!) tới ngẫu nhiên -> script gọi thêm vài chữ đúng chỗ để lần quay nào cũng thấy
# (bản sau tự xoá chữ bật ra ngoài trang chủ nên sẽ không hiện).
QUERY = ''
PROFILE = None

POPS = "(() => { const E = SFC.app.demo.effects; E.pop(350, 190, 'SMASH!', 'huge'); E.pop(470, 120, 'SAVE!', 'good'); E.pop(250, 250, 'POW!', 'heavy'); })()"


def steps(pg, h):
    h.move(1270, 715, steps=1, wait=100)
    h.go('ults', wait=900)
    h.js(POPS); h.wait(2200)
    h.go('settings', wait=600)
    h.js(POPS); h.wait(2200)
    h.go('char', wait=600)
    h.js(POPS); h.wait(2000)
