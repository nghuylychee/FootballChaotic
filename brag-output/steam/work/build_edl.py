"""Build edl_steam.json (picture + captions + music cues) for the Steam gameplay trailer.
Segments are laid end to end: seg(clip, c0, dur, ...) appends at the running video time."""
import json

segs, text, music, booms = [], [], [], []
T = 0.0
F = lambda x: round(x, 3)

def seg(clip, c0, dur, layout='game', cam=None, punch_c=(), **kw):
    """punch_c: clip times of impacts -> camera punch + white flash at the matching video time."""
    global T
    s = dict(v0=F(T), v1=F(T + dur), clip=clip, c0=c0, layout=layout, cam=cam or {'follow': True, 'z': 1.8, 'smooth': 0.16})
    s['punch'] = [F(T + (c - c0)) for c in punch_c if c0 <= c < c0 + dur]
    s.update(kw)
    segs.append(s)
    T += dur
    return s

def cap(t0, t1, lines, **o): text.append(dict(kind='cap', t0=F(t0), t1=F(t1), lines=lines, **o))
def ucap(t0, t1, line, **o): cap(t0, t1, [line], x=154, y=954, fs=40, **o)   # under the UI window

UI = lambda z=1.0, fx=320, fy=180, **k: dict(z=z, fx=fx, fy=fy, **k)
BANNER = dict(z=1.0, fx=320, fy=180)    # ult cut-in: full frame so the game's own banner reads
GOLD, RED, CYAN, VIOLET, ORANGE, GREEN = 'var(--gold)', 'var(--red)', 'var(--cyan)', 'var(--violet)', '#ff6a1f', 'var(--green)'

# 1 HOOK: dropkick into the wall
seg('hook_alley', 0.0, 3.0, cam={'follow': True, 'z': 1.9, 'smooth': 0.14}, punch_c=[0.9])
cap(0.12, 2.95, ['2V2 STREET FOOTBALL', '<b>NO FOULS. NO REFS.</b>'], stagger=1.0)
music.append(['pulse', 0.0, 3.0, {}])

# 2 FOOTBALL: one-two -> goal
a = T
seg('combo_goal_rooftop', 0.25, 3.1, cam={'follow': True, 'z': 1.75, 'z1': 1.35, 'smooth': 0.12}, punch_c=[1.97])
cap(a + 0.1, T - 0.08, ['PASS. SHOOT. <b>SCORE.</b>'], c=CYAN)

# 3 COMBAT: punch steal -> dropkick
a = T
seg('punch_kick_market', 0.05, 2.9, cam={'follow': True, 'z': 2.0, 'smooth': 0.16}, punch_c=[0.37, 1.47])
cap(a + 0.1, T - 0.08, ['THE TACKLE BUTTON', 'IS A <b>DROPKICK</b>'], c=RED, stagger=0.45)
text.append(dict(kind='keys', t0=F(a + 0.2), t1=F(T - 0.05), y=780, keys=[['D', 'PUNCH', GOLD, F(a + 0.3)], ['A', 'DROPKICK', RED, F(a + 1.25)]]))
music.append(['groove', 3.0, T, {}])
booms.append([3.0, 0.9])

# 4 CORES: draft -> three Cores in play
a = T
seg('draft_harbor', 0.15, 2.5, layout='ui', cam=UI(drift=0.05))
ucap(a + 0.1, T - 0.05, 'PICK <b>CORES</b> MID-MATCH', c=GOLD)
a = T
seg('fire_goal_harbor', 0.35, 1.5, cam={'follow': True, 'z': 1.8, 'smooth': 0.2}, punch_c=[0.9])
cap(a + 0.05, T - 0.05, ['FIREBALL'], k='54 CORES', c=ORANGE)
a = T
seg('t_blackhole_cyber', 0.2, 1.3, cam={'follow': True, 'z': 1.8, 'smooth': 0.2}, punch_c=[0.6])
cap(a + 0.05, T - 0.05, ['BLACK HOLE SHOT'], k='54 CORES', c=VIOLET)
a = T
seg('t_bomb_school', 0.6, 1.3, cam={'follow': True, 'z': 1.9, 'smooth': 0.2}, punch_c=[1.27])
cap(a + 0.05, T - 0.05, ['BOMB BALL'], k='54 CORES', c=ORANGE)
music.append(['groove', segs[3]['v0'], T, {'melodyFrom': segs[4]['v0']}])

# 5 ULTIMATES: the game's own cut-in, then the result
ULTS = [  # clip, banner c0, action c0, action dur, impacts, cam
    ('meteor_goal_cage', 0.40, 0.95, 1.8, [1.6, 2.37], {'follow': True, 'z': 1.7, 'smooth': 0.25}),
    ('fists_goal_plaza', 0.40, 0.90, 1.7, [0.9, 2.23], {'follow': True, 'z': 2.0, 'smooth': 0.2}),
    ('t_drop_village', 0.40, 1.60, 1.2, [2.3], {'follow': True, 'z': 1.9, 'smooth': 0.2}),
    ('t_titan_school', 0.35, 1.00, 1.4, [1.47], {'follow': True, 'z': 1.8, 'smooth': 0.2}),
    ('t_lightning_rooftop', 0.40, 0.95, 1.25, [0.9], {'follow': True, 'z': 1.6, 'smooth': 0.3}),
    ('t_aura_market', 0.35, 1.00, 1.3, [], {'follow': True, 'z': 1.9, 'smooth': 0.2}),
    ('t_tiki_cyber', 0.40, 1.10, 1.4, [1.33], {'follow': True, 'z': 1.7, 'smooth': 0.2}),
]
u0 = T
stingers = []
for clip, b0, c0, d, hits, cam in ULTS:
    stingers.append(F(T))
    seg(clip, b0, 0.55, cam=BANNER, noband=True, pins=[])
    seg(clip, c0, d, cam=cam, punch_c=hits)
cap(segs[[s['clip'] for s in segs].index('meteor_goal_cage') + 1]['v0'] + 0.05, segs[[s['clip'] for s in segs].index('meteor_goal_cage') + 1]['v1'] - 0.05,
    ['8 ANIME <b>ULTIMATES</b>'], c=VIOLET)
music.append(['groove', u0, T, {'melodyFrom': u0, 'big': True}])
booms.append([u0, 1.2])

# 6 MAIN PATH
p0 = T
a = T
seg('path_map', 0.1, 2.4, layout='ui', cam=UI(drift=0.04))
ucap(a + 0.1, T - 0.05, 'CLIMB <b>10 AREAS</b> ON THE MAIN PATH', c=GREEN)
a = T
seg('vs_intro', 0.15, 2.2, layout='ui', cam=UI(drift=0.05))
ucap(a + 0.1, T - 0.05, "BEAT EACH AREA'S <b>BOSS</b>", c=RED)
a = T
for clip, c0 in [('montage_village', 0.9), ('montage_alley', 1.25), ('montage_harbor', 0.6), ('montage_cage', 0.6), ('montage_stadium', 0.8)]:
    seg(clip, c0, 0.6, cam={'follow': True, 'z': 1.45, 'smooth': 0.2}, pins=['score'])
cap(a + 0.05, T - 0.05, ['EVERY AREA,', '<b>A NEW ARENA</b>'], c=GOLD, stagger=0.3)
a = T
seg('reveal', 0.6, 2.2, layout='ui', cam=UI(drift=0.05))
ucap(a + 0.1, T - 0.05, 'WIN STARS. UNLOCK <b>NEW CORES</b>', c=GOLD)
music.append(['groove', p0, T, {'light': True}])

# 7 TEAM
t0 = T
seg('scout_map', 0.2, 2.2, layout='ui', cam=UI(z=1.25, fx=250, fy=150, z1=1.4, fx1=230, fy1=140))
seg('scout_report', 0.1, 2.3, layout='ui', cam=UI(drift=0.05))
ucap(t0 + 0.1, T - 0.05, 'SCOUT & RECRUIT <b>TEAMMATES</b>', c=CYAN)

# 8 STYLE
s0 = T
seg('gacha', 0.45, 2.6, layout='ui', cam=UI(drift=0.05))
seg('custom', 0.3, 2.4, layout='ui', cam=UI(z=1.45, fx=430, fy=185))
ucap(s0 + 0.1, T - 0.05, 'OPEN BOXES. <b>STYLE YOUR PLAYER.</b>', c='#ff6ad5')
music.append(['groove', t0, T, {'light': True, 'melodyFrom': t0}])

# 9 ONLINE
o0 = T
seg('lobby', 0.2, 2.0, layout='ui', cam=UI(drift=0.05))
ucap(o0 + 0.1, T - 0.05, 'ONLINE: <b>2-4 PLAYERS</b>', c=CYAN)
a = T
seg('online_street', 1.3, 2.4, cam={'follow': True, 'z': 1.6, 'smooth': 0.18}, punch_c=[2.97], pins=['score'])
cap(a + 0.08, T - 0.05, ['VERSUS <b>OR CO-OP</b>'], c=CYAN)
booms.append([o0, 1.0])

# 10 CLIMAX: final push, down 1, Clone Army, goal x2
c0 = T
seg('c2_clutch_stadium', 0.55, 1.9, cam={'follow': True, 'z': 1.9, 'smooth': 0.16}, punch_c=[1.27])
cap(c0 + 0.08, T - 0.06, ['FINAL PUSH:', '<b>GOALS COUNT DOUBLE</b>'], c=RED, stagger=0.35)
seg('c2_clutch_stadium', 2.45, 0.55, cam=BANNER, noband=True, pins=[])
seg('c2_clutch_stadium', 3.0, 2.9, cam={'follow': True, 'z': 1.8, 'z1': 1.3, 'smooth': 0.2}, punch_c=[4.93, 5.07])
music.append(['groove', o0, T, {'melodyFrom': o0, 'big': True}])
stingers.append(segs[-2]['v0'])

# 11 END
e0 = T
seg('chaos_plaza', 0.5, 5.1, cam={'z': 1.25, 'fx': 320, 'fy': 185, 'drift': 0.06}, noband=True, pins=[], dim=1, dimIn=0.4)
text.append(dict(kind='end', t0=F(e0 + 0.1), t1=F(T)))
music.append(['outro', e0, T, {}])
booms.append([e0 + 0.1, 1.5])

edl = dict(dur=F(T), segs=segs, text=text, music=music, booms=booms, stingers=stingers,
           flashCuts=[s['v0'] for s in segs if s['clip'].startswith('montage')] + [e0], dips=[F(segs[3]['v0']), F(p0), F(t0), F(o0)])
json.dump(edl, open('edl_steam.json', 'w'), indent=1)
print('dur', F(T), 'segs', len(segs))
for s in segs: print(f"{s['v0']:6.2f}-{s['v1']:6.2f} {s['clip']:22s} c0={s['c0']}")
