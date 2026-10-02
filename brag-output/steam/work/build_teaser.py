"""Build edl_teaser.json: Steam slot #2 hype teaser "ROAD TO THE WORLD STAGE" (36s, 160 BPM, 1 bar = 1.5s).
Every cut sits on the beat grid; seg(...) appends at the running video time."""
import json

BEAT = 60 / 160
BAR = 4 * BEAT
segs, text = [], []
T = 0.0
F = lambda x: round(x, 4)

def seg(clip, c0, dur, cam=None, rate=None, hits=(), **kw):
    """hits: clip times of impacts -> camera punch, shake and flash at the matching video time."""
    global T
    r = 1 if rate is None else rate
    s = dict(v0=F(T), v1=F(T + dur), clip='T_' + clip, c0=c0, cam=cam or {'follow': True, 'z': 1.8, 'smooth': 0.16})
    if rate is not None: s['rate'] = rate
    s['punch'] = [F(T + (c - c0) / r) for c in hits if r and c0 <= c < c0 + dur * r]
    if r == 0 and hits: s['punch'] = [F(T)]
    s.update(kw)
    segs.append(s)
    T += dur
    return s

def big(t0, t1, txt, **o): text.append(dict(kind='big', t0=F(t0), t1=F(t1), text=txt, **o))
def area(t0, t1, n, name, c): text.append(dict(kind='area', t0=F(t0), t1=F(t1), n=n, name=name, c=c))

BANNER = {'z': 1.0, 'fx': 320, 'fy': 180}
FOLLOW = lambda z=1.8, s=0.16: {'follow': True, 'z': z, 'smooth': s}

# ---- 1 COLD OPEN: calm village, then the dropkick (bar 0-1) ----
seg('calm_village', 0.2, BAR, cam={'follow': True, 'z': 1.25, 'smooth': 0.08, 'drift': 0.04})
area(0.1, BAR - 0.05, 1, 'VILLAGE GREEN', '#9ccf5a')
seg('hook_village', 0.9 - BEAT, BEAT, cam=FOLLOW(1.9, 0.14))                     # wind-up, impact lands on beat 2
seg('hook_village', 0.93, BEAT, rate=0, cam=FOLLOW(2.2, 0.14), hits=[0.93])     # freeze frame on contact
seg('hook_village', 0.93, 2 * BEAT, rate=0.4, cam=FOLLOW(2.0, 0.2))             # slow-mo flight
# ---- 2 TITLE (bar 2) ----
t_title = T
seg('hook_village', 1.23, BAR, cam=FOLLOW(1.6, 0.2), hits=[1.32], dim=0.6, dimIn=0.15)
text.append(dict(kind='logo', t0=F(t_title + 0.02), t1=F(T), y=250))

# ---- 3 ESCALATION: one Area per bar, impact on the beat (bars 3-10) ----
ESC = [  # clip, impact (clip time), beat it lands on, hits, zoom, area n, name, color
    ('punch_kick_alley', 0.40, 1, [0.40, 1.43], 2.0, 2, 'BACK ALLEY', '#ff9a3d'),
    ('punch_kick_school', 1.43, 2, [0.40, 1.43], 2.0, 3, 'SCHOOLYARD', '#ffd23f'),
    ('fire_goal_rooftop', 0.90, 2, [0.90, 1.13], 1.8, 4, 'ROOFTOP', '#6ec8ff'),
    ('t_bomb_market', 1.23, 2, [1.23], 1.9, 5, 'NIGHT MARKET', '#ff3fb4'),
    ('t_blackhole_harbor', 0.83, 2, [0.57, 0.83], 1.8, 6, 'HARBOR DOCKS', '#f2a33a'),
    ('t_titan_cage', 1.47, 1.5, [1.47, 1.8], 1.8, 7, 'UNDERGROUND CAGE', '#ff3d3d'),
    ('t_drop_plaza', 2.30, 2, [2.3], 1.9, 8, 'CITY PLAZA CUP', '#2fd6c0'),
    ('t_lightning_cyber', 0.90, 0, [0.9], 1.6, 9, 'CYBER ARENA', '#9d7bff'),
]
esc0 = T
for clip, imp, beat, hits, z, n, name, col in ESC:
    b0 = T
    seg(clip, max(0.0, imp - beat * BEAT), BAR, cam=FOLLOW(z, 0.2), hits=hits)
    area(b0 + 0.03, T - 0.03, n, name, col)
big(esc0 + 0.1, esc0 + 2 * BAR - 0.1, 'ONE BALL.', c='#9ccf5a')
big(esc0 + 2 * BAR + 0.1, esc0 + 4 * BAR - 0.1, 'FOUR PLAYERS.', c='var(--gold)')
big(esc0 + 4 * BAR + 0.1, esc0 + 6 * BAR - 0.1, 'ZERO RULES.', c='var(--red)')
esc1 = T

# ---- 4 BREAK: silence, then the final boss (bars 11-12) ----
brk = T
blacks = [[F(T), F(T + 0.3)]]
seg('vs_final', 0.1, 0.3, cam={'z': 0.744, 'fx': 320, 'fy': 180})                 # under the black
seg('vs_final', 0.4, 2 * BAR - 0.3, cam={'z': 0.744, 'fx': 320, 'fy': 180, 'drift': 0.04}, hits=[0.4])
big(brk + 0.45, T - 0.05, 'THEN THE BOSSES SHOW UP.', fs=40, y=1011, c='var(--red)')

# ---- 5 ULTIMATE BARRAGE (bars 13-16) ----
bar0 = T
stingers = []
def banner(clip, c0, beats, rate=None):
    stingers.append(F(T)); seg(clip, c0, beats * BEAT, cam=BANNER, rate=rate)
banner('meteor_goal_market', 0.40, 2, rate=0.73); seg('meteor_goal_market', 1.5, 2 * BEAT, cam=FOLLOW(1.8, 0.3), hits=[1.6])
banner('fists_goal_school', 0.38, 2, rate=0.70); seg('fists_goal_school', 0.9, 2 * BEAT, cam=FOLLOW(2.1, 0.2), hits=[0.9])
banner('t_aura_rooftop', 0.40, 1); seg('t_aura_rooftop', 1.0, BEAT, cam=FOLLOW(2.0, 0.2))
banner('t_tiki_village', 0.45, 1); seg('t_tiki_village', 1.3, BEAT, cam=FOLLOW(1.8, 0.25))
banner('t_titan_cage', 0.45, 1)
banner('t_drop_plaza', 0.50, 1)
banner('t_lightning_cyber', 0.50, 1)
seg('meteor_goal_market', 2.3, BEAT, cam=FOLLOW(1.5, 0.3), hits=[2.37])
bar1 = T

# ---- 6 CLIMAX at the World Stage (bars 17-20) ----
cl = T
seg('c2_clutch_stadium', 1.3, 3 * BEAT, cam=FOLLOW(1.9, 0.12))
big(cl + 0.05, T - 0.05, 'FINAL PUSH.', c='var(--gold)')
stingers.append(F(T))
seg('c2_clutch_stadium', 2.5, 2 * BEAT, cam=BANNER)
seg('c2_clutch_stadium', 3.25, 4 * BEAT, cam=FOLLOW(1.75, 0.1))
slow0 = T
seg('c2_clutch_stadium', 4.75, 3 * BEAT, rate=(5.15 - 4.75) / (3 * BEAT), cam={'follow': True, 'z': 1.9, 'z1': 1.5, 'smooth': 0.12})
goal_v = T
seg('c2_clutch_stadium', 5.15, BAR, cam={'follow': True, 'z': 1.4, 'z1': 1.2, 'smooth': 0.1}, hits=[5.15])
big(goal_v + 0.02, T - 0.05, 'GOAL x2.', fs=120, c='var(--gold)')

# ---- 7 END (bars 21-23) ----
end0 = T
seg('c2_clutch_stadium', 6.65, 36.0 - T, rate=0.5, cam={'z': 1.15, 'fx': 320, 'fy': 185, 'drift': 0.05}, dim=0.9, dimIn=0.35)
text.append(dict(kind='end', t0=F(end0 + 0.1), t1=F(T)))

edl = dict(dur=F(T), beat=BEAT, segs=segs, text=text, blacks=blacks, stingers=stingers,
           marks=dict(title=F(t_title), esc0=F(esc0), esc1=F(esc1), brk=F(brk), bar0=F(bar0), bar1=F(bar1), cl=F(cl), slow0=F(slow0), goal=F(goal_v), end=F(end0),
                      kick=F(segs[1]['v1'])))
json.dump(edl, open('edl_teaser.json', 'w'), indent=1)
print('dur', F(T), 'segs', len(segs))
for s in segs: print(f"{s['v0']:6.3f}-{s['v1']:6.3f} {s['clip']:24s} c0={s['c0']} rate={s.get('rate', 1)} punch={s['punch']}")
