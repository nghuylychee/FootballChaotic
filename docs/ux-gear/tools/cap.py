# chụp màn GEAR hiện tại (main) cho review 2026-11-06: 5 trạng thái, dữ liệu cố định -> docs/ux-gear/shots (cần npm run serve -- --port 8730)
import os, sys, json
SP = os.path.dirname(os.path.abspath(__file__))
os.environ.setdefault('UX_OUT', os.path.join(SP, '..', 'shots'))   # UX_OUT=../shots/after: ảnh sau khi sửa
sys.path.insert(0, os.path.join(SP, '..', '..', 'ux-screens'))
import capture as C  # noqa

SETUP = r"""() => {
  SFC.RunTest.card('gear');
  const Run = SFC.Run, R = Run.run, POS = (r) => R.squad.findIndex((s) => s.role === r);
  // đồng đội có trường phái -> GEAR trường phái khớp với người đó
  const mates = R.squad.map((s, i) => ({ i, sch: s.m && !s.h ? Run.schoolsOf(s.m) : [] })).filter((x) => x.sch.length);
  const sch = mates.length ? mates[0].sch[0] : 'chaos';
  const sid = Object.keys(SFC_CONFIG.run.gear.list).find((k) => SFC_CONFIG.run.gear.list[k].school === sch);
  R.squad.forEach((s) => { s.gear = []; });
  R.squad[POS('FWD')].gear = [{ id: 'spikes', r: 'common', up: false }];
  R.squad[POS('MID')].gear = [{ id: 'boots', r: 'rare', up: false }, { id: 'band', r: 'common', up: false }, { id: 'wraps', r: 'common', up: false }];
  R.squad[POS('DEF')].gear = [{ id: 'socks', r: 'common', up: false }];
  R.offer = { gear: [{ id: 'socks', r: 'rare' }, { id: sid, r: 'rare' }, { id: 'gloves', r: 'epic' }], kind: 'match', sel: null, who: null };
  SFC.Profile.save(); SFC.RunUI.key = null; SFC.Menu.render();
  return { sch, sid, roles: R.squad.map((s) => s.role), mates };
}"""

def base(pg, h):
    h.wait(400)
    print(h.js(SETUP))
    h.wait(1500)

def st(*keys):
    def f(pg, h):
        base(pg, h)
        for k in keys:
            h.key(k, wait=700)
        h.wait(800)
    return f

RT = dict(query='?runtest', init=C.SEED)
C.SCREENS.update({
    'g1': dict(title='GEAR · bước 1 · trỏ món 1 (chỉ số)', setup=st(), **RT),
    'g1s': dict(title='GEAR · bước 1 · trỏ món 2 (trường phái)', setup=st('ArrowRight'), **RT),
    'g2': dict(title='GEAR · bước 2 · chọn người (chọn sẵn)', setup=st('Enter'), **RT),
    'g2s': dict(title='GEAR · bước 2 · món trường phái', setup=st('ArrowRight', 'Enter'), **RT),
    'g3': dict(title='GEAR · bước 3 · bỏ món ra', setup=st('Enter', 'ArrowRight', 'Enter'), **RT),
})
if __name__ == '__main__':
    for sid in sys.argv[1:]:
        C.capture(sid)
