"""Đo đường đi: chạy thật từng mục tiêu chính của người chơi bằng phím (như người đã quen tay: chọn mặc định, bỏ qua mọi thứ
bỏ qua được), ghi lại các màn đi qua, số lần bấm, số giây. -> shots/journeys.json (dữ liệu thô cho screens/journeys.json).
  python journeys.py [start continue kickoff after shop]
"""
import os, sys, json, time
from capture import ux, PREP, SEED, RUN_MAP, OUT

# chữ ký "đang ở màn nào": đổi chữ ký = sang màn mới
SIG_JS = r"""() => {
  const a = SFC.app, M = SFC.Menu, g = a.game, R = SFC.Run && SFC.Run.run, RU = SFC.RunUI;
  if (a.screen === 'story') return 'cut-scene';
  if (a.screen === 'intro' || (SFC.Intro && SFC.Intro.active)) return 'VS';
  if (a.screen === 'game' || a.screen === 'pause') {
    if (SFC.UI.current === 'draft') return 'chọn Core';
    if (g && g.state === 'ended') return 'kết quả';
    return a.screen === 'pause' ? 'Pause' : 'trong trận';
  }
  if (M.page === 'runmap') {
    if (!R) return 'BUILD YOUR SQUAD';
    if (R.offer && R.offer.gear) return R.offer.sel == null ? 'chọn GEAR' : R.offer.who == null ? 'chọn người đeo' : 'đổi GEAR';
    if (R.offer) return 'chọn BADGE';
    if (R.join) return 'LEGEND chọn người';
    if (R.room) return { shop: 'KIT VAN', rest: 'LOCKER ROOM', event: 'sự kiện ???', skill: 'thẻ Skill game', trial: 'thẻ LEGEND TRIAL' }[R.room.kind] || R.room.kind;
    if (R.actNew) return 'thẻ mở act';
    return 'map';
  }
  return { home: 'trang chủ', run: 'tab GOAT PATH' }[M.page] || M.page;
}"""


class J:
    def __init__(self, pg, h, name):
        self.pg, self.h, self.name = pg, h, name
        self.t0 = time.time(); self.keys = 0; self.trail = []; self.mark()

    def sig(self):
        try:
            return self.h.js(SIG_JS)
        except Exception:
            return '?'

    def mark(self):
        s = self.sig()
        if not self.trail or self.trail[-1]['s'] != s:
            self.trail.append({'s': s, 't': round(time.time() - self.t0, 1), 'k': self.keys})

    def press(self, key='Enter', wait=700):
        self.keys += 1
        self.pg.keyboard.press(key)
        self.h.wait(wait); self.mark()

    def hold(self, ms=1500):
        """giữ Enter (bỏ qua cut-scene): tính 1 lần bấm"""
        self.keys += 1
        self.pg.keyboard.down('Enter'); self.h.wait(ms); self.pg.keyboard.up('Enter')
        self.h.wait(500); self.mark()

    def wait_for(self, js, ms=15000):
        end = time.time() + ms / 1000
        while time.time() < end:
            self.mark()
            if self.h.js(js):
                break
            self.h.wait(150)
        self.mark()

    def done(self):
        return {'name': self.name, 'keys': self.keys, 'secs': round(time.time() - self.t0, 1), 'trail': self.trail}


ON_MAP = "SFC.Menu.page === 'runmap' && SFC.Run.run && !SFC.Run.run.offer && !SFC.Run.run.room && !SFC.Run.run.actNew && SFC.app.screen === 'menu'"
PLAYING = "SFC.app.game && SFC.app.game.state === 'play' && SFC.UI.current !== 'draft'"


def start(pg, h):
    """Bắt đầu run mới từ trang chủ (chưa có run) tới lúc đứng trên map chọn được node."""
    h.js("SFC.Profile.data.run = null; SFC.Profile.save(); SFC.Menu.go('home')"); h.wait(800)
    j = J(pg, h, 'start')
    j.press(); j.press(wait=1200)                 # PLAY -> tab GOAT PATH -> START RUN
    j.press(); j.press()                          # 2 ứng viên đầu vào 2 ô trống
    j.press(wait=1500)                            # START RUN
    for _ in range(6):                            # cut-scene mở act: giữ để bỏ qua; thẻ mở act: LET'S GO
        if h.js(ON_MAP): break
        if j.sig() == 'cut-scene': j.hold()
        else: j.press(wait=1200)
    j.wait_for(ON_MAP, 4000)
    return j.done()


def cont(pg, h):
    """Tiếp tục run đang dở: trang chủ -> map."""
    h.go('home', wait=800)
    j = J(pg, h, 'continue')
    j.press(); j.press(wait=1200)
    j.wait_for(ON_MAP, 4000)
    return j.done()


def kickoff(pg, h):
    """Trên map: chọn node trận (mặc định) -> tới lúc giao bóng."""
    h.go('runmap', wait=1200)
    j = J(pg, h, 'kickoff')
    j.press(wait=300)                             # chọn node: vòng phấn rồi vào trận
    j.wait_for("SFC.Intro && SFC.Intro.active")
    h.wait(450)                                   # VS chặn bấm 0,35 s đầu (intro.skipAfter)
    j.press(wait=300)                             # qua VS
    j.wait_for("SFC.UI.current === 'draft'")
    j.h.wait(600)
    j.press(wait=300)                             # lấy Core đầu
    j.wait_for(PLAYING)
    return j.done()


def after(pg, h):
    """Còi kết thúc (thắng 1-0) -> về map, đã nhận thưởng."""
    kickoff(pg, h)
    h.wait(500)
    h.js("(() => { const g = SFC.app.game; g.teams[0].score = 1; g.end(); })()")
    j = J(pg, h, 'after')
    for _ in range(12):
        if h.js(ON_MAP): break
        j.press(wait=1400)
    j.wait_for(ON_MAP, 3000)
    return j.done()


def shop(pg, h):
    """Ở KIT VAN: mua món đang chọn sẵn (GEAR -> chọn người đeo) rồi rời đi."""
    h.wait(400); h.js("SFC.RunTest.card('shop')"); h.wait(1800)
    j = J(pg, h, 'shop')
    j.press(wait=2200)                            # mua món đang chọn
    for _ in range(3):                            # GEAR: chọn người đeo (đủ ô thì chọn món bỏ ra)
        if j.sig() == 'KIT VAN': break
        j.press(wait=1500)
    # rời đi: Esc đưa con trỏ tới LEAVE (RunUI.back, UX run-01: Esc không lặng lẽ rời phòng), Enter = rời
    j.press('Escape', wait=300)
    j.press('Enter', wait=1200)
    j.wait_for(ON_MAP, 3000)
    return j.done()


RUNS = {
    'start': dict(fn=start),
    'continue': dict(fn=cont, profile=RUN_MAP),
    'kickoff': dict(fn=kickoff, profile=RUN_MAP),
    'after': dict(fn=after, profile=RUN_MAP),
    'shop': dict(fn=shop, query='?runtest', init=SEED),
}

if __name__ == '__main__':
    out = {}
    path = os.path.join(OUT, 'journeys.json')
    if os.path.exists(path):
        out = json.load(open(path, encoding='utf-8'))
    for name in sys.argv[1:] or list(RUNS):
        R = RUNS[name]
        with ux.sync_playwright() as p:
            b, ctx, pg = ux._launch(p, None, R.get('profile'), None, PREP + R.get('init', ''))
            ux._boot(pg, ux_base := os.environ.get('UX_BASE', 'http://localhost:8730'), R.get('query', ''))
            h = ux.Helper(pg)
            out[name] = R['fn'](pg, h)
            b.close()
        print(name, out[name]['keys'], 'keys', out[name]['secs'], 's', ' -> '.join(x['s'] for x in out[name]['trail']))
        json.dump(out, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
