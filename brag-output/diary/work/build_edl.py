"""Build edl.json for DEAR DIARY: page segments are timed from their handwriting (same char timing as comp.html),
gameplay segments are fixed clips of the captured takes. usage: python build_edl.py"""
import json

CPS = 17          # handwriting speed (chars / s)
HOLD = 0.92       # reading time after the last word of a page
FLIP = 0.5        # page turn


def wdur(text, cps=CPS):
    """time from a row's start until its last char is on the page (comp.html charTimes)"""
    t = 0.0
    for i, ch in enumerate(text):
        t += 0.5 / cps if ch == ' ' else 1 / cps
        if ch in '.,!?' and i < len(text) - 1:
            t += 0.16
    return t


PAGES = {
    'd1': {'day': 'Day 1', 'photo': {'who': 'uncle', 'take': 'village', 'i': 0, 'x': 330, 'y': 180, 'rot': -0.035}, 'cap': 'uncle Sau :)',
           'rows': {0: 'Dear diary,', 1: 'First match vs the uncles.', 2: 'They are very kind.', 4: 'P.S. They have a stool.'}},
    'd2': {'day': 'Day 2', 'photo': {'who': 'feathers', 'take': 'rooftop', 'i': 0, 'x': 320, 'y': 180, 'rot': 0.03}, 'cap': 'the pigeon gang <3',
           'rows': {0: 'Rooftop match!', 1: 'Nice view. Lots of pigeons.', 3: 'P.S. I need a new hat.'}},
    'd3': {'day': 'Day 3', 'photo': {'who': 'var', 'take': 'refs', 'i': 0, 'x': 330, 'y': 180, 'rot': -0.025}, 'cap': 'a REAL referee!',
           'rows': {0: 'Real referees today!', 1: 'Finally, fair football.', 3: 'P.S. I got a yellow card.', 4: "I don't know why."}},
    'd4': {'day': 'Day 4', 'photo': {'who': 'grandpa', 'take': 'leo', 'i': 0, 'x': 400, 'y': 180, 'rot': 0.035}, 'cap': 'the grandpas :)',
           'rows': {0: 'Old men today.', 1: 'Should be easy.'}},
    'd5': {'day': 'Day 5', 'photo': {'who': 'kid', 'take': 'leo', 'i': 150, 'x': 250, 'y': 180, 'rot': -0.05, 'dmg': 'soot'}, 'cap': 'me',
           'burnt': True, 'rows': {0: 'I still want to', 1: 'play football.'}},
}

segs, v = [], 0.0


def page(pid, write, pre=(), marks=(), flip=False, hold=HOLD, start=0.25, gap=0.3, extra=None):
    """write: rows to hand-write in order (each starts `gap` s after the previous ends); marks run before the writing"""
    global v
    P = PAGES[pid]
    t = (FLIP + 0.12 if flip else start)
    ms = []
    for m in marks:
        m = dict(m, at=t)
        ms.append(m)
        t += m.get('dur', 0.5) + 0.2
    ws = []
    for w in write:
        row, cps = (w, CPS) if isinstance(w, int) else (w[0], w[1])
        ws.append({'row': row, 'at': round(t, 3), 'cps': cps})
        t += wdur(P['rows'][row], cps) + gap
    s = {'v0': round(v, 3), 'v1': round(v + t - gap + hold, 3), 'mode': 'page', 'page': pid, 'pre': list(pre), 'write': ws, 'marks': ms}
    if flip:
        s['flip'] = FLIP
    if extra:
        s.update(extra(s, t - gap))
    segs.append(s)
    v = s['v1']
    return s


def game(take, c0, c1, cam, **kw):
    global v
    s = dict({'v0': round(v, 3), 'v1': round(v + (c1 - c0), 3), 'take': take, 'c0': c0, 'r': 1, 'cam': cam}, **kw)
    segs.append(s)
    v = s['v1']
    return s


# Day 1: the uncles are very kind
page('d1', [1, 2], pre=[0], start=0.2)
game('village', 0.75, 5.7, {'t': 'path', 'z': 5.8, 'pts': [[0.75, 212, 190], [1.9, 228, 190], [2.6, 285, 190], [3.02, 262, 190], [3.4, 236, 190], [5.7, 214, 190]]}, cut=True)
page('d1', [4], pre=[0, 1, 2], marks=[{'kind': 'horns', 'dur': 0.95}])
# Day 2: lots of pigeons
page('d2', [0, 1], flip=True)
game('rooftop', 0.6, 3.2, {'t': 'pt', 'x': 290, 'y': 222, 'z': 6.0}, cut=True)
game('rooftop', 3.2, 5.6, {'t': 'kid', 'dy': -6, 'z': 6.5}, blend=0.5)
page('d2', [3], pre=[0, 1], marks=[{'kind': 'scribble', 'dur': 0.55}])
# Day 3: real referees, finally fair football
page('d3', [0, 1], flip=True)
game('refs', 0.3, 2.7, {'t': 'mix', 'a': 'kid', 'b': {'pl': 5}, 'k': 0.4, 'z': 5.6}, cut=True, blend=0.3)
game('refs', 3.45, 4.85, {'t': 'mix', 'a': 'kid', 'b': {'pl': 5}, 'k': 0.35, 'z': 6.2}, cut=True)
s = game('refs', 4.85, 4.85, {'t': 'kid', 'dy': -22, 'z': 7.6}, freeze=True, card=True, blend=0.16)
s['r'] = 0; s['v1'] = round(s['v0'] + 1.35, 3); v = s['v1']
page('d3', [3, 4], pre=[0, 1], marks=[{'kind': 'card', 'dur': 0.3}], gap=0.45)
# Day 4: old men, should be easy
page('d4', [0, 1], flip=True)
game('leo', 0.55, 2.65, {'t': 'pt', 'x': 462, 'y': 180, 'z': 3.2}, cut=True, wide=True)
game('leo', 2.65, 5.1, {'t': 'pl', 'i': 5, 'dy': -12, 'z': 5.6}, cut=True, blend=0.25)
# Day 5: the page is singed. "I still want to play football." -> "still" underlined twice -> logo
d5 = page('d5', [(0, 12), (1, 12)], start=0.6, gap=0.25, hold=0,
          extra=lambda s, end: {'under': {'row': 0, 'word': 'still', 'at': round(end + 0.35, 3), 'dur': 0.5}, 'outro': round(end + 1.35, 3)})
d5['v1'] = round(d5['v0'] + d5['outro'] + 2.7, 3); v = d5['v1']

# sounds that fired just before a cut point: the pigeons' coo
roof = next(s for s in segs if s.get('take') == 'rooftop')
E = {'fps': 30, 'dur': round(v, 3), 'pages': PAGES, 'segs': segs, 'extra': [{'t': round(roof['v0'] + 0.03, 3), 'name': 'ult', 'arg': 'mod.coo'}]}
json.dump(E, open('edl.json', 'w'), indent=1)
for s in segs:
    print(f"{s['v0']:6.2f}-{s['v1']:6.2f}  {s.get('page') or s['take']:8s}  " + (' '.join(f"r{w['row']}@{w['at']}" for w in s.get('write', [])) or f"c0 {s.get('c0')}"))
print('dur', E['dur'])
