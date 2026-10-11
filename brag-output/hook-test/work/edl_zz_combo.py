# Combos (runs last): a finished hook + another body, and a few skits + a body. Nothing is re-rendered: encode.py
# takes the hook's frames (hookframes) and the body's frames (body, shifted by body_offset for skits).
import copy as _copy

COMBO_HOOKS = ['G1', 'R12']                       # body test: the same two hooks in front of every body (B1 = their original clips)
SKIT_BODY = (['S1', 'S4', 'S5', 'S10', 'S29'], 'BODY')   # skit + body: compared with the same skits alone


def _cut(items, t, before=True, key=lambda x: x[1]):
    return [x for x in items if (key(x) < t) == before]


def _shift_seg(s, off):
    s = _copy.deepcopy(s); s['v0'] = round(s['v0'] + off, 3); s['v1'] = round(s['v1'] + off, 3)
    if 'punch' in s: s['punch'] = [round(p + off, 3) for p in s['punch']]
    return s


def _combo(h, b, off=0.0):
    H, Bd = EDL[h], EDL[b]
    split = SPLIT + off
    e = {k: v for k, v in H.items() if k not in ('segs', 'texts', 'music', 'boom', 'body', 'split', 'dur', 'mute', 'heart', 'crowd', 'nocut', 'is_hook', 'is_body')}
    e['segs'] = [s for s in H['segs'] if s['v0'] < split - 1e-6] + [_shift_seg(s, off) for s in Bd['segs'] if s['v0'] >= SPLIT - 1e-6]
    e['segs'][-1 - sum(1 for s in Bd['segs'] if s['v0'] >= SPLIT - 1e-6)]['v1'] = round(split, 3)
    e['texts'] = [t for t in H.get('texts', []) if t['t0'] < split] + [dict(t, t0=round(t['t0'] + off, 3), **({'t1': round(t['t1'] + off, 3)} if 't1' in t else {})) for t in Bd.get('texts', [])]
    e['music'] = [[m[0], m[1], min(m[2], split), m[3]] for m in H.get('music', []) if m[1] < split] + [[m[0], round(m[1] + off, 3), round(m[2] + off, 3), m[3]] for m in Bd.get('music', [])]
    e['boom'] = [x for x in H.get('boom', []) if x[0] < split] + [[round(x[0] + off, 3), x[1]] for x in Bd.get('boom', [])]
    for k in ('mute', 'heart', 'crowd'):
        v = [x for x in H.get(k, []) if x[0] < split] + [[round(x[0] + off, 3), round(x[1] + off, 3)] for x in Bd.get(k, [])]
        if v: e[k] = v
    e['nocut'] = [x for x in H.get('nocut', []) if x < split] + [round(x + off, 3) for x in Bd.get('nocut', [])]
    e.update(dur=round(Bd['dur'] + off, 3), split=round(split, 3), body=b, hookframes=h)
    if off: e['body_offset'] = round(off, 3); e.pop('drop', None)
    return e


_bodies = sorted([k for k, v in EDL.items() if isinstance(v, dict) and v.get('is_body')], key=lambda k: int(k[1:]))
for _h in COMBO_HOOKS:
    if _h in EDL:
        for _b in _bodies: EDL[f'{_h}_{_b}'] = _combo(_h, _b)
_skits, _sb = SKIT_BODY
for _s in _skits:
    if _s in EDL and _sb in EDL: EDL[f'{_s}_B1'] = _combo(_s, _sb, off=EDL[_s]['dur'] - SPLIT)

# PvP batch: P<n> = hook P<n>h + PvP body B<12 + (n-1) % 20> (only once both are defined; the body must be rendered before encoding)
import re as _re
for _k in [k for k in list(EDL) if _re.fullmatch(r'P\d+h', k)]:
    _n = int(_k[1:-1]); _b = f'B{12 + (_n - 1) % 20}'
    if _b in EDL: EDL[f'P{_n}'] = _combo(_k, _b)
