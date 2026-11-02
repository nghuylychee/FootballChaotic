# menus-08 · Phòng riêng một mình: START xám mà không nói vì sao
# CẦN máy chủ trận LOCAL: `PORT=8091 node E:/FootballChaotic/server/index.js` (chạy nền, quay xong thì tắt).
# PREP = init script (truyền vào record(..., extra_init=PREP)): chặn hẳn máy chủ thật (*.onrender.com) cho cả fetch /healthz lẫn WebSocket.
# Lý do: NetServer.probe() giữ kết quả đo ping lúc khởi động 15 giây -> chỉ đổi SFC_CONFIG.net.server.url thôi thì
# CREATE ROOM trong 15 giây đầu vẫn mở phòng trên máy chủ thật. steps() còn chờ lần đo đó xong rồi xoá cache (NetServer.probed).
QUERY = ''
PROFILE = None
PREP = r"""(() => {
  const bad = (u) => /onrender\.com/i.test(String(u && u.url || u));
  const WS = window.WebSocket;
  const Safe = function (u, p) { if (bad(u)) throw new Error('blocked live server ' + u); return p === undefined ? new WS(u) : new WS(u, p); };
  Safe.prototype = WS.prototype; Safe.CONNECTING = 0; Safe.OPEN = 1; Safe.CLOSING = 2; Safe.CLOSED = 3;
  window.WebSocket = Safe;
  const f = window.fetch;
  window.fetch = function (u) { if (bad(u)) return Promise.reject(new TypeError('blocked live server')); return f.apply(this, arguments); };
})();"""


def steps(pg, h):
    pg.wait_for_function('!SFC.NetServer.probing', timeout=10000)
    h.js("SFC_CONFIG.net.server.urls = []; SFC_CONFIG.net.server.url = 'ws://localhost:8091'; SFC.NetServer.probed = null;")
    h.move(1240, 660, steps=1, wait=100)           # chuột ở góc trống (không đè lên mục nào)
    h.go('online', wait=700)
    h.key('Enter', wait=3200)                      # CREATE ROOM (đang chọn sẵn) -> phòng chỉ có mình; nhìn phòng: START xám
    h.hover('.pt-btn.go', steps=15, wait=500)
    h.click('.pt-btn.go', wait=1300)               # bấm START
    h.click('.pt-btn.go', wait=1300)               # bấm lần nữa
    h.js("SFC.Session.leave && SFC.Session.leave()")
