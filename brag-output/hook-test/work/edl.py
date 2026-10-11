"""Edit decision lists for the 30 hook-test clips + the shared BODY -> edl.json. Times in seconds.
seg  : v0/v1 = video time; clip = frames/<take> (game) or real = real/<id> (pre-cropped 1080x1920 real footage);
       c0 = clip time at v0; rate = playback speed (0 = freeze); cam = follow {z, smooth, dx, dy} or fixed {z, fx, fy}
       (logical px, frame = x3); layout full | fit; punch = extra flash/zoom hits; dim = darken
texts: meme {s, t0, t1, y, size, pop} · badge {a, b} · end card {t0, ask, slot}
sound: music [[kind, t0, t1, opts]] · boom [[t, size]] · mute [[t0, t1]] (record stop) · crowd [[t0, t1]] · heart [[t0, t1]]
R/G clips: own frames for t < split, the BODY's frames after it (body + split); the grid of the music is pinned to 4.0 s (drop)."""
import json, os

SPLIT, RG_DUR = 4.0, 11.4


def F(z=2.0, smooth=0.18, **kw):
    return dict(follow=True, z=z, smooth=smooth, **kw)


def seg(v0, v1, clip, c0, rate=None, cam=None, **kw):
    s = {'v0': round(v0, 3), 'v1': round(v1, 3), 'clip': clip, 'c0': round(c0, 3), 'cam': cam or F()}
    if rate is not None: s['rate'] = rate
    s.update(kw)
    return s


def real(v0, v1, rid, c0=0.0, rate=None, z0=1.0, z1=1.06, **kw):
    s = {'v0': round(v0, 3), 'v1': round(v1, 3), 'real': rid, 'c0': round(c0, 3), 'z0': z0, 'z1': z1}
    if rate is not None: s['rate'] = rate
    s.update(kw)
    return s


def meme(s, t0, t1, y=300, size=92, pop=True):
    return {'k': 'meme', 's': s, 't0': t0, 't1': t1, 'y': y, 'size': size, 'pop': pop}


# ---------------- shared BODY (4.0 -> 11.4) ----------------
BODY_SEGS = [
    seg(4.0, 5.6, 'punch_kick_s7', 0.15, cam=F(2.0, 0.16)),            # punch steals it (v 4.22), dropkick lands (v 5.18)
    seg(5.6, 7.2, 'fists_goal_s7', 0.8, cam=F(2.1, 0.2)),              # the 20-punch barrage
    seg(7.2, 8.8, 'meteor_goal_s7', 1.0, cam=F(1.9, 0.25)),            # Meteor Shot -> GOAL (v 8.6)
    seg(8.8, 10.2, 't_titan_s7', 1.0, cam=F(1.9, 0.2)),                # Titan (after its cut-in banner) bowls them over
    seg(10.2, 11.4, 't_titan_s7', 2.4, cam=F(1.9, 0.2), dim=0.82),    # end card over the dimmed pitch
]
BODY_TEXT = [
    meme('no fouls.<br>no refs.', 4.05, 5.55),
    meme('just punches.', 5.65, 7.15),
    meme('and anime<br>ultimates', 7.25, 8.75),
    meme('53 superpowers', 8.85, 10.15),
    {'k': 'end', 't0': 10.2, 'y': 470, 'ask': 'would you<br>play this? 👇', 'slot': 'PLAYTEST SOON · FOLLOW'},
]
BODY_MUSIC = [['groove', 4.0, 10.2, {'melodyFrom': 7.2}], ['outro', 10.2, RG_DUR, {}]]
BODY_BOOM = [[4.0, 0.7], [8.6, 1.2], [10.2, 1.3]]


def rg(segs, texts, music, boom=(), **kw):
    e = {'dur': RG_DUR, 'drop': SPLIT, 'body': 'BODY', 'split': SPLIT,
         'segs': segs + BODY_SEGS, 'texts': texts + BODY_TEXT, 'music': music + BODY_MUSIC, 'boom': list(boom) + BODY_BOOM}
    e.update(kw)
    return e


# alternative bodies (B2, B3, ...): same slot as BODY (4.0 -> 11.4), same end card, different middle. Frames only; combos pair them with hooks.
END_CARD = {'k': 'end', 't0': 10.2, 'y': 470, 'ask': 'would you<br>play this? 👇', 'slot': 'PLAYTEST SOON · FOLLOW'}
END_CARD_PVP = {'k': 'end', 't0': 10.2, 'y': 470, 'ask': "tag the friend<br>you'd dropkick 👇", 'slot': 'PLAYTEST SOON · FOLLOW'}   # PvP bodies (B12-B31)


def body(segs, texts, music, boom=(), end=None, **kw):
    """segs/texts/music/boom cover 4.0-11.4 (the end card from 10.2 is added for you; give a dimmed seg under it). PvP bodies pass end=END_CARD_PVP."""
    e = {'dur': RG_DUR, 'drop': SPLIT, 'is_body': True, 'segs': [seg(0, SPLIT, segs[0]['clip'], 0)] + segs,
         'texts': texts + [end or END_CARD], 'music': music, 'boom': list(boom)}
    e.update(kw)
    return e


def phook(segs, texts, music, boom=(), **kw):
    """PvP hook only (0 -> 4.0). Saved as EDL['P<n>h']; edl_zz_combo.py adds the finished clip EDL['P<n>'] = this hook + PvP body B<12 + (n-1) % 20>."""
    e = {'dur': SPLIT, 'split': SPLIT, 'drop': SPLIT, 'is_hook': True, 'segs': segs, 'texts': texts, 'music': music, 'boom': list(boom)}
    e.update(kw)
    return e


EDL = {'_doc': __doc__}
EDL['BODY'] = {'dur': RG_DUR, 'drop': SPLIT, 'segs': [seg(0, SPLIT, 'punch_kick_s7', 0)] + BODY_SEGS, 'texts': BODY_TEXT,
               'music': BODY_MUSIC, 'boom': BODY_BOOM}

# ---------------- G: gameplay hooks (0 -> 4.0) ----------------
EDL['G1'] = rg([seg(0, 0.9, 'calm_s7', 0.2, cam=F(2.0, 0.1)), seg(0.9, 4.0, 'hook_s7', 0.35, cam=F(2.0, 0.16), punch=[1.45])],
               [meme('just a normal<br>football game', 0, 1.45, pop=False), meme('that was a<br>legal tackle btw', 2.3, 3.95, size=84)],
               [['calm', 0, 1.45, {}], ['groove', 1.65, SPLIT, {}]], [[1.45, 1.4]], mute=[[1.45, 1.65]])
EDL['G2'] = rg([seg(0, SPLIT, 'fists_wall_s7', 0.55, cam=F(2.1, 0.2))],
               [meme("he said it's a<br>contact sport", 0, 1.8, pop=False), meme('so he got<br>contact', 2.65, 3.95)],
               [['pulse', 0, 0.42, {}], ['groove', 0.42, SPLIT, {}]], [[2.58, 1.4]])
EDL['G3'] = rg([seg(0, SPLIT, 'meteor_mid_s4', 0.3, cam=F(1.9, 0.2))],
               [meme('the keeper tried<br>to save it', 0, 1.85, pop=False), meme('he did not<br>save it', 2.0, 3.95)],
               [['pulse', 0, 0.9, {}], ['groove', 0.9, SPLIT, {}]], [[1.9, 1.5]])
EDL['G4'] = rg([seg(0, 1.8, 'aura_pose_s7', 0.35, cam=F(2.2, 0.15)), seg(1.8, SPLIT, 'aura_pose_s7', 2.15, rate=1.7, cam=F(2.0, 0.2))],
               [meme('+1000 aura', 0, 1.8, pop=False, size=120), meme('then he<br>cooked him', 2.65, 3.95)],
               [['calm', 0, 2.6, {}], ['groove', 2.65, SPLIT, {}]], [[3.77, 1.2]], nocut=[1.8])
EDL['G5'] = rg([seg(0, SPLIT, 'g_blackhole_s7', 0.3, cam=F(1.9, 0.2))],
               [meme('physics left<br>the chat', 0, 1.9, pop=False), meme('defenders<br>included', 2.25, 3.95)],
               [['tension', 0, 2.2, {}], ['groove', 2.23, SPLIT, {}]], [[0.3, 1.0], [2.23, 1.3]])
EDL['G6'] = rg([seg(0, SPLIT, 't_bomb_s7', 0.0, cam=F(2.0, 0.2))],
               [meme("hot potato but<br>it's football", 0, 1.2, pop=False), meme('BOOM.', 1.3, 2.4, size=130), meme('everyone<br>lost', 2.6, 3.95)],
               [['tension', 0, 1.23, {}], ['groove', 1.4, SPLIT, {}]], [[1.23, 1.6]], mute=[[1.23, 1.4]])
EDL['G7'] = rg([seg(0, 1.2, 't_lightning_s7', 0.05, cam=F(1.8, 0.25)), seg(1.2, SPLIT, 't_lightning_s7', 1.25, rate=0.8, cam=F(1.8, 0.25))],
               [meme('POV: you<br>blinked', 0, 1.15, pop=False, size=104), meme('2 defenders.<br>gone.', 1.3, 3.95)],
               [['pulse', 0, 0.85, {}], ['groove', 0.85, SPLIT, {}]], [[0.85, 1.3]], nocut=[1.2])
EDL['G8'] = rg([seg(0, 1.8, 'c2_clutch_s7', 0.9, cam=F(2.0, 0.18)), seg(1.8, SPLIT, 'c2_clutch_s7', 2.7, rate=1.45, cam=F(1.9, 0.2))],
               [meme('5 seconds left.<br>down by 1.', 0, 1.6, pop=False, size=84), meme('5v2 is fair<br>right?', 1.7, 3.95)],
               [['tension', 0, 1.6, {}], ['groove', 1.63, SPLIT, {}]], [[3.59, 1.3]], heart=[[0, 1.6]], nocut=[1.8])
EDL['G9'] = rg([seg(0, SPLIT, 't_drop_s7', 0.25, cam=F(1.8, 0.2))],
               [meme('he jumped<br>off the map', 0, 1.9, pop=False), meme('...and came<br>back', 2.1, 3.95)],
               [['tension', 0, 2.05, {}], ['groove', 2.05, SPLIT, {}]], [[2.05, 1.6]], mute=[[1.9, 2.05]])
EDL['G10'] = rg([seg(0, SPLIT, 'juggle_s7', 0.2, rate=1.45, cam=F(2.2, 0.2))],
                [meme('how long can<br>he stay up?', 0, 2.0, pop=False), meme('he never<br>came down', 2.4, 3.95)],
                [['groove', 0, SPLIT, {}]], [[0.16, 0.8]])

# ---------------- S: staged skits (standalone, corner watermark) ----------------
def S(dur, segs, texts, music, boom=(), **kw):
    e = {'dur': dur, 'wm': True, 'segs': segs, 'texts': texts, 'music': music, 'boom': list(boom)}
    e.update(kw)
    return e


EDL['S1'] = S(6.6, [seg(0, 2.85, 'nopass_s7', 0.0, cam=F(1.9, 0.14, dy=-12)),
                    seg(2.85, 3.1, 'nopass_s7', 2.8, rate=0, cam={'z': 2.3, 'fx': 'focus', 'fy': 'focus'}),
                    seg(3.1, 5.0, 'nopass_s7', 2.8, rate=1.55, cam=F(1.9, 0.2)),
                    seg(5.0, 6.6, 'nopass_s7', 5.75, cam=F(1.9, 0.2))],
              [meme("POV: you<br>didn't pass", 0, 2.85, pop=False, size=104), meme("he'll pass it<br>himself then", 3.15, 4.95, size=84),
               meme('lesson learned 💀', 5.05, 6.6, size=84)],
              [['calm', 0, 2.85, {}], ['groove', 3.1, 6.6, {}]], [[2.85, 1.5], [4.95, 1.0]], nocut=[3.1, 5.0])
EDL['S2'] = S(6.0, [seg(0, 2.05, 'penalty_s7', 0.0, cam=F(1.9, 0.12)),
                    seg(2.05, 2.3, 'penalty_s7', 2.05, rate=0, cam={'z': 2.4, 'fx': 'focus', 'fy': 'focus'}),
                    seg(2.3, 4.6, 'penalty_s7', 2.05, rate=1.2, cam=F(1.9, 0.18)),
                    seg(4.6, 6.0, 'penalty_s7', 4.81, cam=F(1.9, 0.2))],
              [meme("penalty technique<br>they don't teach you", 0, 2.05, pop=False, size=84),
               meme('step 1: remove<br>the keeper', 2.35, 4.1, size=84), meme('step 2:<br>walk it in', 4.15, 6.0, size=84)],
              [['tension', 0, 2.05, {}], ['groove', 2.3, 6.0, {}]], [[2.05, 1.5], [4.18, 1.0]], nocut=[2.3, 4.6])
EDL['S3'] = S(4.6, [seg(0, 0.95, 'chicken_s7', 0.0, cam=F(1.9, 0.2)),
                    seg(0.95, 3.1, 'chicken_s7', 0.95, rate=0.5, cam=F(2.6, 0.2)),
                    seg(3.1, 4.6, 'chicken_s7', 2.03, cam=F(2.0, 0.2))],
              [meme('watch the ball', 0, 0.95, pop=False), meme('WHY IS IT<br>A CHICKEN', 1.0, 3.05, size=104),
               meme('the keeper<br>said nope', 3.1, 4.6, size=88)],
              [['groove', 0, 0.95, {}], ['calm', 0.95, 3.1, {}], ['groove', 3.1, 4.6, {}]], [[3.37, 1.1]], nocut=[0.95, 3.1])
EDL['S4'] = S(4.2, [seg(0, 1.4, 'bowling_s7', 0.0, cam=F(1.7, 0.15)),
                    seg(1.4, 2.4, 'bowling_s7', 1.3, rate=0.4, cam=F(2.0, 0.25)),
                    seg(2.4, 4.2, 'bowling_s7', 1.7, cam=F(1.9, 0.25))],
              [meme('they parked<br>the bus', 0, 1.4, pop=False, size=100), meme('so I went<br>bowling 🎳', 1.45, 4.2, size=96)],
              [['pulse', 0, 1.4, {}], ['groove', 1.4, 4.2, {}]], [[1.48, 1.5], [2.83, 1.0]], nocut=[1.4, 2.4])
EDL['S5'] = S(5.6, [seg(0, 2.0, 'giant_keeper_s7', 0.0, cam=F(1.85, 0.12, dx=60)),
                    seg(2.0, 3.6, 'giant_keeper_s7', 2.0, cam=F(1.8, 0.2)),
                    seg(3.6, 4.3, 'giant_keeper_s7', 3.6, rate=0.5, cam=F(1.8, 0.2)),
                    seg(4.3, 5.6, 'giant_keeper_s7', 3.95, cam=F(1.8, 0.2))],
              [meme('their keeper is<br>4 meters tall', 0, 2.0, pop=False, size=92), meme('so I brought<br>a meteor', 2.1, 3.55, size=92),
               meme('KRAKOOM.', 4.35, 5.6, size=120)],
              [['tension', 0, 2.0, {}], ['groove', 2.0, 5.6, {}]], [[3.8, 1.6]], nocut=[3.6, 4.3])
EDL['S6'] = S(6.0, [seg(0, 1.13, 'kickoff_s7', 0.0, cam={'z': 1.6, 'fx': 320, 'fy': 200}),
                    seg(1.13, 1.4, 'kickoff_s7', 1.15, rate=0, cam={'z': 2.0, 'fx': 320, 'fy': 200}),
                    seg(1.4, 2.6, 'kickoff_s7', 1.15, layout='fit', h=1000, cam={'z': 0.95, 'fx': 320, 'fy': 205}),
                    seg(2.6, 4.8, 'kickoff_s7', 2.35, rate=1.35, cam=F(1.8, 0.12)),
                    seg(4.8, 6.0, 'kickoff_s7', 5.32, cam=F(1.8, 0.2))],
              [meme('kickoff in<br>my league', 0, 1.13, pop=False, size=100), meme('meanwhile<br>the ball:', 2.65, 4.75, size=92),
               meme('1-0 😐', 4.85, 6.0, size=120)],
              [['tension', 0, 1.13, {}], ['calm', 1.4, 4.75, {}], ['groove', 4.76, 6.0, {}]], [[1.13, 1.6], [4.76, 1.0]], mute=[[1.13, 1.4]], nocut=[2.6, 4.8])
EDL['S7'] = S(5.0, [seg(0, 2.45, 'goliath_s7', 0.05, cam=F(1.8, 0.15)),
                    seg(2.45, 2.7, 'goliath_s7', 2.55, rate=0, cam={'z': 2.2, 'fx': 'focus', 'fy': 'focus'}),
                    seg(2.7, 5.0, 'goliath_s7', 2.55, cam=F(1.8, 0.18))],
              [meme('david vs<br>goliath', 0, 2.45, pop=False, size=104), meme('goliath has<br>left the chat', 2.75, 5.0, size=92)],
              [['tension', 0, 2.45, {}], ['groove', 2.7, 5.0, {}]], [[2.45, 1.6], [3.4, 1.0]], mute=[[2.45, 2.7]])
EDL['S8'] = S(4.6, [seg(0, 1.8, 'clones_s7', 0.4, cam=F(1.7, 0.15, dx=40)),
                    seg(1.8, 3.4, 'clones_s7', 2.2, cam=F(1.8, 0.25)),
                    seg(3.4, 4.6, 'clones_s7', 3.8, cam=F(1.9, 0.2))],
              [meme('bro summoned his<br>whole family', 0, 1.8, pop=False, size=88), meme('family reunion<br>cancelled ⚡', 1.85, 4.6, size=88)],
              [['tension', 0, 1.8, {}], ['groove', 1.8, 4.6, {}]], [[2.55, 1.3], [3.83, 1.0]], nocut=[3.4])
EDL['S9'] = S(4.2, [seg(0, 2.2, 'fists_ball_s7', 0.3, cam=F(2.2, 0.2)),
                    seg(2.2, 2.9, 'fists_ball_s7', 2.5, rate=0.5, cam=F(2.2, 0.25)),
                    seg(2.9, 4.2, 'fists_ball_s7', 2.85, cam=F(1.9, 0.2))],
              [meme("hundred fists but<br>it's the ball", 0, 2.15, pop=False, size=88), meme('the ball did<br>nothing wrong', 2.3, 4.2, size=88)],
              [['groove', 0, 4.2, {}]], [[2.2, 1.5]], nocut=[2.2, 2.9])
EDL['S10'] = S(5.3, [seg(0, 1.3, 'orbit_s7', 0.0, cam=F(1.9, 0.15)),
                     seg(1.3, 3.6, 'orbit_s7', 1.3, cam=F(1.9, 0.2)),
                     seg(3.6, 4.2, 'orbit_s7', 3.6, rate=0.5, cam=F(1.9, 0.2)),
                     seg(4.2, 5.3, 'orbit_s7', 3.9, cam=F(1.9, 0.2))],
               [meme('sent him<br>to orbit', 0, 1.3, pop=False, size=104), meme('meanwhile,<br>their keeper:', 1.4, 3.6, size=88),
                meme("he's back 💀", 4.2, 5.3, size=104)],
               [['groove', 0, 1.3, {}], ['calm', 1.3, 3.65, {}], ['groove', 3.73, 5.3, {}]], [[0.57, 1.3], [3.73, 1.6]], nocut=[3.6, 4.2])

# ---------------- R: real hooks (built from hooks.json + ECHO) ----------------
# per pick: the in-game echo take, where to start it, and the caption pair
ECHO = json.load(open('echo.json', encoding='utf-8')) if os.path.exists('echo.json') else {}
HOOKS = json.load(open('hooks.json', encoding='utf-8')) if os.path.exists('hooks.json') else []
for h in HOOKS:
    e = ECHO.get(h['id'])
    if not e or not os.path.exists(os.path.join('real', h['id'], 'count.json')):
        continue
    n = json.load(open(os.path.join('real', h['id'], 'count.json')))['n']
    hook_len = min(e.get('len', 1.8), n / 30)
    imp = e.get('impact', hook_len)                 # impact time inside the real clip (seconds from its first frame)
    segs = [real(0, hook_len, h['id'], 0.0, z0=e.get('z0', 1.0), z1=e.get('z1', 1.08), punch=[imp] if imp < hook_len else [])]
    segs.append(seg(hook_len, SPLIT, e['take'], e['c0'], rate=e.get('rate'), cam=F(e.get('z', 2.0), 0.18, dx=e.get('dx', 0), dy=e.get('dy', 0)),
                    punch=[hook_len + e['hit'] - e['c0']] if e.get('hit') else []))
    texts = [meme(e['irl'], 0, hook_len, pop=False, size=e.get('size', 92)), meme(e['game'], hook_len + 0.05, SPLIT - 0.05, size=e.get('size', 92))]
    EDL[h['id']] = rg(segs, texts, [['tension', 0, hook_len, {}], ['groove', hook_len, SPLIT, {}]],
                      [[imp, 1.2], [hook_len, 1.5]] + ([[hook_len + e['hit'] - e['c0'], 1.3]] if e.get('hit') else []),
                      crowd=[[0, hook_len]], flashk=0.8)

# ---------------- batch files (edl_*.py): they see seg / real / meme / F / rg / S / EDL and add their own clips ----------------
import glob
for _f in sorted(glob.glob('edl_*.py')):
    try: exec(open(_f, encoding='utf-8').read(), globals())
    except Exception as _e: print('SKIPPED', _f, '->', repr(_e))   # one broken batch file never takes the others down

# atomic write: renders running in parallel never read a half-written edl.json
_tmp = f'edl.json.{os.getpid()}.tmp'
json.dump(EDL, open(_tmp, 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
os.replace(_tmp, 'edl.json')
print('clips:', [k for k in EDL if k != '_doc'])
