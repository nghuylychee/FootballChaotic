"""Chụp màn cho review UX tầng màn hình (docs/ux-screens/README.md).
Mỗi màn xuất 4 ảnh vào shots/: <id>.png (gốc) · <id>.squint.png (làm mờ) · <id>.gray.png (xám) · <id>.motion.png (chỗ đang động)
+ shots/<id>.json (mục đang chọn sẵn, thứ tự focus phím, % màn hình đang động).
  python capture.py                 -> mọi màn trong SCREENS
  python capture.py map-start map-mid
Cần game đang chạy (npm run serve), mặc định http://localhost:8730 (đổi bằng biến môi trường UX_BASE).
"""
import os, sys, io, json
from PIL import Image, ImageFilter, ImageOps
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'ux-review', 'harness'))
import ux   # noqa: E402  (bộ chụp của review 2026-11-02)

BASE = os.environ.get('UX_BASE', 'http://localhost:8730')
OUT = os.path.join(HERE, 'shots')
RUN_MAP = json.load(open(os.path.join(HERE, '..', 'ux-review', 'harness', 'profile_run_map.json'), encoding='utf-8'))

# chặn hẳn máy chủ thật (*.onrender.com): không bao giờ mở phòng thật khi chụp (xem docs/ux-review/README.md, An toàn)
PREP = r"""(() => {
  const bad = (u) => /onrender\.com/i.test(String(u && u.url || u));
  const WS = window.WebSocket;
  const Safe = function (u, p) { if (bad(u)) throw new Error('blocked live server ' + u); return p === undefined ? new WS(u) : new WS(u, p); };
  Safe.prototype = WS.prototype; Safe.CONNECTING = 0; Safe.OPEN = 1; Safe.CLOSING = 2; Safe.CLOSED = 3;
  window.WebSocket = Safe;
  const f = window.fetch;
  window.fetch = function (u) { if (bad(u)) return Promise.reject(new TypeError('blocked live server')); return f.apply(this, arguments); };
})();"""

SQUINT = 12        # bán kính Gaussian (px trên ảnh 1280x720) ~ nheo mắt
MOTION_FRAMES = 14 # số khung chụp liên tiếp để dò chỗ đang động (~2-3 giây)


# ---------- các màn ----------
# setup(pg, h): đưa game tới đúng màn, đứng yên ở trạng thái cần chụp

def map_start(pg, h):
    """Map act 1 lúc vừa vào: chưa đi node nào, 3 trận đầu chọn được."""
    h.go('runmap', wait=1500)


MID_JS = r"""() => {
  // giữa act 1: đã qua Matchday -> Skill game -> LEGEND TRIAL (Pirlow về người thứ 2), đứng ở 2.1, đi tiếp được Skill game / Elite
  const Run = SFC.Run, R = Run.run;
  R.path = ['0.0', '1.1', '2.1']; R.at = '2.1'; R.floors = 3;
  R.cash = 85;
  R.bag = [{ id: 'report', up: false }, { id: 'coin', up: false }, { id: 'watch', up: false }];
  R.squad[1].legend = 'pirlow';
  R.squad[0].gear = [{ id: 'boots', r: 'rare', up: false }];
  R.squad[2].gear = [{ id: 'spikes', r: 'common', up: false }];
  R.guard = { act: R.act, n: 99 }; Run.injure(R);
  SFC.Profile.save(); SFC.RunUI.key = null; SFC.Menu.render();
}"""


def map_mid(pg, h):
    """Map giữa act 1: vài node đã qua, có BADGE / GEAR / LEGEND / chấn thương, 2 node đi tiếp."""
    h.go('runmap', wait=1200)
    h.js(MID_JS)
    h.wait(1200)


# Math.random cố định: thẻ thưởng / hàng KIT VAN / trận thử ra giống nhau mỗi lần chụp
SEED = "(() => { let s = 20261104; Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();"
HIDE_DEV = "(() => { const f = () => { const t = SFC.RunTest; if (t && t.el) t.el.style.visibility = 'hidden'; }; f(); setInterval(f, 100); })()"
MATCH_Q = '?runtest=match&legends=ramen,,&badges=var,report,watch'   # trận GOAT PATH có luật sân + LEGEND + 3 BADGE


def until(h, js, tries=60, every=150):
    for _ in range(tries):
        if h.js(js):
            return True
        h.wait(every)
    return False


def home(pg, h):
    h.go('home', wait=1500)


def tab_new(pg, h):
    h.js("SFC.Profile.data.run = null")
    h.go('run', wait=1500)


def tab_run(pg, h):
    h.go('run', wait=1500)


def squad_empty(pg, h):
    h.key('Enter', wait=1000)      # PLAY -> tab GOAT PATH
    h.key('Enter', wait=1600)      # START RUN -> BUILD YOUR SQUAD


def squad_pick2(pg, h):
    h.key('Enter', wait=700)       # ứng viên đang chọn -> ô trống kế
    h.key('Enter', wait=1200)


def card(kind):
    def f(pg, h):
        h.wait(400)
        h.js(f"SFC.RunTest.card('{kind}')")
        h.wait(1800)
    return f


def gear_who(pg, h):
    card('gear')(pg, h)
    h.key('Enter', wait=1500)      # lấy món đầu -> chọn người đeo


EVENT_JS = ("(([id, cash]) => { SFC.RunTest.card('map'); const R = SFC.Run.run, n = R.map.floors[0][0]; R.at = n.id; R.path = [n.id]; R.cash = cash;"
            " R.room = { kind: 'event', id }; SFC.RunUI.reset(); SFC.Menu.render(); })")


def event(pg, h):
    h.wait(400)
    h.js(EVENT_JS + "(['coach', 100])")
    h.wait(1800)


def event_result(pg, h):
    event(pg, h)
    h.key('Enter', wait=2600)      # lựa chọn đầu


RUNOVER_JS = ("SFC.RunTest.card('map'); const R = SFC.Run.run; R.offer = null; R.over = true; R.log.push({ act: 0, node: '0.0', kind: 'match', team: 'pigeon_gang', my: 1, op: 2 });"
              "R.metaGold = 48; R.roadGain = 45; R.newCores = ['thunder_kick']; SFC.Run.stats().road = 105; SFC.RunUI.reset(); SFC.Menu.render()")


def runover(pg, h):
    h.wait(500)
    h.js(RUNOVER_JS)
    h.wait(2600)


def vs(pg, h):
    h.js(HIDE_DEV)
    until(h, "SFC.Intro.active")
    h.wait(1600)


def draft(pg, h):
    h.js(HIDE_DEV)
    until(h, "SFC.Intro.active")
    h.wait(400)
    h.key('Enter', wait=200)       # qua màn VS
    until(h, "SFC.UI.current === 'draft'")
    h.wait(1200)


def hud(pg, h):
    draft(pg, h)
    h.key('Enter', wait=200)       # lấy Core đầu
    until(h, "SFC.app.game && SFC.app.game.state === 'play'")
    h.wait(5000)                   # qua banner luật sân lúc giao bóng


def pause(pg, h):
    hud(pg, h)
    h.key('Escape', wait=1200)


def result(beat):
    def f(pg, h):
        hud(pg, h)
        h.key('0', wait=200)       # dev: thắng ngay
        until(h, "SFC.app.game && SFC.app.game.state === 'ended'")
        h.wait(2200 if beat == 1 else 6500)
    return f


RT = dict(query='?runtest', init=SEED)
MT = dict(query=MATCH_Q, init=SEED)
SCREENS = {
    'home': dict(title='Trang chủ', setup=home),
    'tab-new': dict(title='PLAY › GOAT PATH · chưa có run', profile=RUN_MAP, setup=tab_new),
    'tab-run': dict(title='PLAY › GOAT PATH · đang có run', profile=RUN_MAP, setup=tab_run),
    # 2 trạng thái trong 1 phiên: trận demo sau menu tiêu Math.random theo từng khung, seed không giữ được hàng ghế giống nhau
    'squad-empty': dict(title='BUILD YOUR SQUAD · vừa vào', setup=squad_empty, then=('squad-ready', 'BUILD YOUR SQUAD · đủ người', squad_pick2)),
    'map-start': dict(title='Map GOAT PATH · đầu act', profile=RUN_MAP, setup=map_start),
    'map-mid': dict(title='Map GOAT PATH · giữa act', profile=RUN_MAP, setup=map_mid),
    'badge': dict(title='Thưởng: chọn BADGE', setup=card('offer'), **RT),
    'gear-pick': dict(title='Thưởng: chọn GEAR', setup=card('gear'), **RT),
    'gear-who': dict(title='GEAR: chọn người đeo', setup=gear_who, **RT),
    'kitvan': dict(title='KIT VAN', setup=card('shop'), **RT),
    # có sẵn 3 BADGE để LOCKER ROOM có cả thẻ nâng cấp (run thử trống chỉ có 1 thẻ HEAL)
    'locker': dict(title='LOCKER ROOM', setup=card('rest'), query='?runtest&badges=var,report,watch', init=SEED),
    'event': dict(title='Sự kiện ???', setup=event, **RT),
    'event-result': dict(title='Sự kiện ??? · kết quả', setup=event_result, **RT),
    'legend-trial': dict(title='LEGEND TRIAL · thẻ vào', query='?runtest=trialcard.pirlow', init=SEED, setup=lambda pg, h: h.wait(1800)),
    'legend-join': dict(title='LEGEND · chọn người nhận', query='?runtest=join.pirlow', init=SEED, setup=lambda pg, h: h.wait(1800)),
    'vs': dict(title='Màn VS', setup=vs, **MT),
    'draft': dict(title='Chọn Core đầu trận', setup=draft, **MT),
    'hud': dict(title='HUD trong trận', setup=hud, **MT),
    'pause': dict(title='Pause', setup=pause, **MT),
    'result-1': dict(title='Kết quả · nhịp 1 (trên sân)', setup=result(1), **MT),
    'result-2': dict(title='Kết quả · nhịp 2 (thưởng)', setup=result(2), **MT),
    'runover': dict(title='RUN OVER', setup=runover, **RT),
}


# ---------- xử lý ảnh ----------

def squint(img):
    return img.filter(ImageFilter.GaussianBlur(SQUINT))


def gray(img):
    return ImageOps.grayscale(img).convert('RGB')


def motion(frames):
    """Heatmap chỗ đổi giữa các khung liên tiếp, phủ đỏ lên nền xám tối. Trả (ảnh, % diện tích có động)."""
    arr = [np.asarray(f.convert('L'), dtype=np.int16) for f in frames]
    acc = np.zeros(arr[0].shape, dtype=np.float32)
    for a, b in zip(arr, arr[1:]):
        acc += (np.abs(b - a) > 10)
    heat = acc / max(1, len(arr) - 1)
    moving = float((heat > 0).mean() * 100)
    # nở vùng động 1 chút: chi tiết pixel 1-2px vẫn thấy được trên ảnh thu nhỏ
    hm = Image.fromarray((np.clip(heat, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(7))
    a = np.clip(np.asarray(hm, dtype=np.float32) / 255 * 1.6, 0, 0.9)[..., None]
    base = np.asarray(gray(frames[0]), dtype=np.float32) * 0.4
    red = np.zeros_like(base); red[..., 0] = 255; red[..., 1] = 60
    out = base * (1 - a) + red * a
    return Image.fromarray(out.astype(np.uint8)), moving


FOCUS_JS = r"""() => {
  const sel = [...document.querySelectorAll('#stage .sel')].find((e) => e.offsetParent !== null && e.getClientRects().length);   // chỉ phần tử đang hiện (menu ẩn sau trận vẫn còn .sel)
  const r = sel && sel.getBoundingClientRect();
  let order = [];
  try { if (SFC.Menu.page === 'runmap') order = SFC.RunUI.targets().map((t) => t.key); } catch (e) {}
  return { page: SFC.Menu.page, sel: sel ? { cls: String(sel.className), txt: (sel.innerText || '').trim().slice(0, 60),
    x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } : null, order };
}"""


def snap(pg, sid, title):
    """chụp trạng thái đang đứng: 4 ảnh + json"""
    frames = []
    for _ in range(MOTION_FRAMES):
        frames.append(Image.open(io.BytesIO(pg.screenshot())).convert('RGB'))
        pg.wait_for_timeout(120)
    info = pg.evaluate(FOCUS_JS)
    img = frames[0]
    img.save(os.path.join(OUT, sid + '.png'))
    squint(img).save(os.path.join(OUT, sid + '.squint.png'))
    gray(img).save(os.path.join(OUT, sid + '.gray.png'))
    mimg, moving = motion(frames)
    mimg.save(os.path.join(OUT, sid + '.motion.png'))
    info.update(id=sid, title=title, moving_pct=round(moving, 1))
    json.dump(info, open(os.path.join(OUT, sid + '.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(sid, 'ok', 'moving %.1f%%' % moving, 'sel:', info['sel'] and info['sel']['txt'])


def capture(sid):
    S = SCREENS[sid]
    os.makedirs(OUT, exist_ok=True)
    with ux.sync_playwright() as p:
        b, ctx, pg = ux._launch(p, None, S.get('profile'), None, PREP + S.get('init', ''))
        ux._boot(pg, BASE, S.get('query', ''))
        h = ux.Helper(pg)
        S['setup'](pg, h)
        if S.get('then'):   # chụp nối tiếp trong cùng phiên: trạng thái sau là trạng thái trước + vài thao tác (cùng dữ liệu ngẫu nhiên)
            snap(pg, sid, S['title'])
            sid2, title2, step = S['then']
            step(pg, h)
            sid, S = sid2, dict(title=title2)
        snap(pg, sid, S['title'])
        b.close()


if __name__ == '__main__':
    for sid in sys.argv[1:] or list(SCREENS):
        capture(sid)
