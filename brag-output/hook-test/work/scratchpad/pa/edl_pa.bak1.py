# PvP hooks P1h-P25h (batch pa, see ../pvp-plan.md). exec'd by edl.py with seg / meme / F / phook / SPLIT / EDL in scope.
# Takes: frames/pa_<scene>_s7 (scenes_pa.js, 3v3, every player named after his cam handle, same look as the portrait).
# Every hook: player cams on screen from frame 0 (t0 < 0, so the slide-in is already over), first caption at frame 0,
# the game in a window between the cams, captions over the top of the window, voice/text chat lines under it.

_H = 4.0

# ---- layouts (1080x1920) ----
# duo: two 470x340 cams at y 40..380 (VS between them), game window 380..1420, chat lines 1442 / 1527
_DUO_Y, _WIN_DUO, _CAP_DUO, _CH_DUO = 40, 1040, 404, (1442, 1527)
# row: three 326x254 cams of one squad at y 40..294, game window 350..1450, chat lines 1470 / 1555 / 1640
_ROW_Y, _WIN_ROW, _CAP_ROW, _CH_ROW = 40, 1100, 368, (1470, 1555, 1640)
# squads: us (side 0) 40..290, them (side 1) 1560..1810, game window 370..1430, one chat line at 1446
_SQ_Y, _SQ_Y2, _WIN_SQ, _CAP_SQ, _CH_SQ = 40, 1560, 1060, 392, 1446


def _w(v0, v1, take, c0, cam, h, rate=None, **kw):
    """a segment of game footage in the window between the cams"""
    return seg(v0, v1, take, c0, rate=rate, cam=cam, layout='fit', h=h, **kw)


def _fix(z, fx, fy, drift=None):
    d = {'z': z, 'fx': fx, 'fy': fy}
    if drift: d['drift'] = drift
    return d


def _cam(h, side=0, talk=(), react=(), hit=(), dead=None, label=None, **kw):
    d = {'h': h, 'side': side, 'talk': [list(x) for x in talk], 'react': [list(x) for x in react], 'hit': list(hit)}
    if dead is not None: d['dead'] = dead
    if label: d['label'] = label
    d.update(kw)
    return d


def _cams(layout, players, vs=False):
    d = {'k': 'cams', 't0': -0.5, 't1': _H, 'layout': layout, 'players': players, 'vs': vs}
    if layout == 'duo': d['y'] = _DUO_Y
    elif layout == 'row': d['y'] = _ROW_Y
    elif layout == 'squads': d['y'], d['y2'] = _SQ_Y, _SQ_Y2
    return d


def _chat(h, s, t0, t1=_H, y=_CH_DUO[0]):
    return {'k': 'chat', 'h': h, 's': s, 't0': t0, 't1': t1, 'y': y}


def _m(s, t0, t1, y, size=92, pop=True):
    return meme(s, t0, t1, y=y, size=size, pop=pop)


# ---------------------------------------------------------------- P1: "1v1 me" -> dropkicked at kickoff (0.8 s)
# pa_1v1: whistle 0.37, windup 0.6, contact 0.8 (BYE! 0.83)
_T = 'pa_1v1_s7'
_c = _fix(1.65, 345, 150)
EDL['P1h'] = phook(
    [_w(0, 0.83, _T, 0.0, _c, _WIN_DUO),
     _w(0.83, 1.08, _T, 0.87, _fix(1.95, 330, 185), _WIN_DUO, rate=0),
     _w(1.08, 1.68, _T, 0.87, _c, _WIN_DUO, rate=0.5),
     _w(1.68, _H, _T, 1.17, _c, _WIN_DUO)],
    [_cams('duo', [_cam('NGH', 0, talk=[[1.2, 1.9]], react=[[0.42, '😈'], [1.6, '😂']]),
                   _cam('xX_vex_Xx', 1, talk=[[0.0, 0.55]], react=[[0.05, '😤'], [1.1, '💀']], hit=[0.83], dead=1.1)], vs=True),
     _m('my friend said<br>"1v1 me"', 0, 1.3, _CAP_DUO, 92, pop=False),
     _m('1v1 lasted<br>0.8 seconds 💀', 1.4, _H, _CAP_DUO, 92),
     _chat('xX_vex_Xx', 'rematch. now.', 2.4, _H, _CH_DUO[0])],
    [['pulse', 0, 0.83, {}], ['groove', 1.08, _H, {}]], [[0.83, 1.5]], mute=[[0.83, 1.08]], nocut=[1.68])

# ---------------------------------------------------------------- P2: he typed "ez" -> GIANT FIST from behind, into the wall
# pa_ez: EZ 0.13, punch 0.93, impact 1.0, bonk (wall) 1.67
_T = 'pa_ez_s7'
EDL['P2h'] = phook(
    [_w(0, 1.0, _T, 0.0, _fix(1.7, 305, 200), _WIN_DUO),
     _w(1.0, 1.25, _T, 1.0, _fix(1.9, 'focus', 'focus'), _WIN_DUO, rate=0),
     _w(1.25, _H, _T, 1.0, _fix(1.6, 362, 100), _WIN_DUO)],
    [_cams('duo', [_cam('NGH', 0, talk=[[2.45, 3.1]], react=[[0.55, '😐'], [1.3, '😈'], [2.5, '😂']]),
                   _cam('bigboss99', 1, talk=[[0.0, 0.6]], react=[[0.1, '😂'], [1.35, '💀']], hit=[1.0, 1.92], dead=2.0)], vs=True),
     _m('he typed "ez"<br>in chat', 0, 1.0, _CAP_DUO, 96, pop=False),
     _m('instant<br>karma 💀', 1.3, _H, _CAP_DUO, 100),
     _chat('bigboss99', 'ez', -0.2, 2.35, _CH_DUO[0]),
     _chat('NGH', 'ez', 2.45, _H, _CH_DUO[0])],
    [['pulse', 0, 1.0, {}], ['groove', 1.25, _H, {}]], [[1.0, 1.5], [1.92, 1.0]], mute=[[1.0, 1.25]])

# ---------------------------------------------------------------- P3: queue with randoms -> my random passes it to their striker
# pa_randoms: pass 0.3, recv 0.53, pass to the enemy 0.9 (HERE U GO), INTERCEPT 1.13, shot 1.43, goal 1.83
_T = 'pa_randoms_s7'
EDL['P3h'] = phook(
    [_w(0, _H, _T, 0.0, _fix(1.5, 172, 170), _WIN_SQ)],
    [_cams('squads', [_cam('panda.exe', 0, label='panda.exe (you)', talk=[[0.0, 0.35]], react=[[1.0, '😐'], [1.95, '😭']]),
                      _cam('mochi', 0, react=[[1.95, '💀']]),
                      _cam('DUKE', 0, talk=[[2.3, 3.0]], react=[[0.95, '😇'], [2.0, '😳']]),
                      _cam('ratking', 1, talk=[[1.9, 2.6]], react=[[1.2, '😂'], [1.95, '😈']]),
                      _cam('jinx', 1, react=[[2.0, '😂']]),
                      _cam('m0le', 1, react=[[2.1, '🤣']])]),
     _m('POV: you queue<br>with randoms', 0, 1.15, _CAP_SQ, 88, pop=False),
     _m('wrong team,<br>bro 💀', 1.2, _H, _CAP_SQ, 92),
     _chat('DUKE', 'my bad 😅', 2.3, _H, _CH_SQ)],
    [['tension', 0, 1.83, {}], ['groove', 1.83, _H, {}]], [[0.9, 0.6], [1.83, 1.3]])

# ---------------------------------------------------------------- P4: 1 star from promotion -> 2-2, 0:05, METEOR SHOT, GOAL x2
# pa_promo: ult 0.47 (cut-in to 1.07), strike 1.67, keeper hit 2.33, goal 2.47
_T = 'pa_promo_s7'
EDL['P4h'] = phook(
    [_w(0, 2.45, _T, 0.1, F(1.55, 0.15, dy=-28), _WIN_SQ),
     _w(2.45, _H, _T, 2.55, _fix(1.0, 320, 180), _WIN_SQ)],
    [_cams('squads', [_cam('NGH', 0, talk=[[0.3, 0.95], [2.35, 3.8]], react=[[0.4, '😤'], [2.4, '🔥']]),
                      _cam('tuanbeo', 0, talk=[[2.4, 3.8]], react=[[2.5, '😱']]),
                      _cam('kaito_04', 0, talk=[[0.0, 0.3], [2.4, 3.8]], react=[[2.45, '🥳']]),
                      _cam('zzz_mi', 1, react=[[2.45, '💀']], hit=[2.23]),
                      _cam('bigboss99', 1, react=[[2.6, '😡']]),
                      _cam('xX_vex_Xx', 1, react=[[2.5, '😭']])]),
     _m('1 star from<br>promotion 😰', 0, 1.6, _CAP_SQ, 92, pop=False),
     _m('PROMOTED 🔥', 2.33, _H, _CAP_SQ, 110),
     _chat('kaito_04', '5 SECONDS', -0.2, 1.6, _CH_SQ)],
    [['tension', 0, 2.3, {}], ['groove', 2.3, _H, {}]], [[0.33, 0.8], [2.3, 1.6]], heart=[[0, 0.33]])

# ---------------------------------------------------------------- P5: my friend's first match -> the dribble of his life, into our net
# pa_firstmatch: NO NO NO 0.93, dodge 1.43, shot 1.6, goal 1.73 (Own goal), GOLAZO 1.95
_T = 'pa_firstmatch_s7'
EDL['P5h'] = phook(
    [_w(0, _H, _T, 0.25, F(1.6, 0.15, dy=-22), _WIN_ROW)],
    [_cams('row', [_cam('NGH', react=[[1.6, '💀'], [2.7, '🤦']]),
                   _cam('tuanbeo', talk=[[0.65, 1.3]], react=[[0.7, '😱'], [1.6, '😭']]),
                   _cam('kaito_04', label='kaito_04 (new)', talk=[[0.0, 1.2], [2.2, 3.0]], react=[[1.55, '🥳']])]),
     _m("my friend's<br>first match", 0, 1.4, _CAP_ROW, 96, pop=False),
     _m('he scored! 🥳', 1.5, 2.4, _CAP_ROW, 96),
     _m('...in our<br>own net 😭', 2.45, _H, _CAP_ROW, 96),
     _chat('kaito_04', 'did I score??', 2.2, _H, _CH_ROW[0])],
    [['calm', 0, 1.45, {}], ['groove', 1.45, _H, {}]], [[1.45, 1.2]])

# ---------------------------------------------------------------- P6: the friend who always brings Titan -> squashes his own teammates
# pa_titan: ult 0.3 (cut-in to 0.9), SQUISH (NGH) 1.57, BONK (kaito) 1.9
_T = 'pa_titan_s7'
EDL['P6h'] = phook(
    [_w(0, _H, _T, 0.2, F(1.55, 0.2, dy=-20), _WIN_ROW)],
    [_cams('row', [_cam('NGH', talk=[[1.95, 2.8]], react=[[1.45, '💀'], [2.0, '😡']], hit=[1.37]),
                   _cam('tuanbeo', talk=[[0.0, 0.7]], react=[[0.1, '😈'], [1.5, '😂']]),
                   _cam('kaito_04', react=[[1.8, '😭']], hit=[1.7])]),
     _m('the friend who<br>always brings Titan', 0, 1.35, _CAP_ROW, 88, pop=False),
     _m("we're on<br>his team 💀", 1.45, _H, _CAP_ROW, 96),
     _chat('NGH', "BRO I'M YOUR TEAMMATE", 1.95, _H, _CH_ROW[0])],
    [['pulse', 0, 0.7, {}], ['groove', 0.7, _H, {}]], [[0.1, 0.8], [1.37, 1.2], [1.7, 1.0]])

# ---------------------------------------------------------------- P7: "don't dropkick me" -> so I didn't: HUNDRED FISTS
# pa_dontdk: DON'T 0.1, ult 0.57 (cut-in to 1.17), punches 1.17-2.4, blast 2.53, wall 2.77
_T = 'pa_dontdk_s7'
EDL['P7h'] = phook(
    [_w(0, _H, _T, 0.25, F(1.7, 0.2, dy=-25), _WIN_DUO)],
    [_cams('duo', [_cam('xX_vex_Xx', 0, talk=[[0.95, 2.2]], react=[[0.35, '😇'], [2.35, '😈']]),
                   _cam('mochi', 1, talk=[[0.0, 0.6]], react=[[0.1, '🥺'], [2.35, '💀']], hit=[0.95, 1.25, 1.55, 1.85, 2.15, 2.28], dead=2.45)], vs=True),
     _m('he said "don\'t<br>dropkick me"', 0, 1.15, _CAP_DUO, 92, pop=False),
     _m("so I didn't 😇", 1.2, _H, _CAP_DUO, 96),
     _chat('mochi', "THAT'S WORSE", 2.6, _H, _CH_DUO[0])],
    [['tension', 0, 0.92, {}], ['groove', 0.92, _H, {}]], [[0.32, 0.8], [2.28, 1.5]])

# ---------------------------------------------------------------- P8: trash talk vs reality -> wall slam
# pa_trash: kick 1.23, contact 1.43, wall 1.5, ball back 1.73
_T = 'pa_trash_s7'
_c = _fix(1.6, 460, 100)
EDL['P8h'] = phook(
    [_w(0, 1.35, _T, 0.15, _c, _WIN_DUO),
     _w(1.35, 1.6, _T, 1.53, _fix(1.8, 460, 100), _WIN_DUO, rate=0),
     _w(1.6, _H, _T, 1.53, _c, _WIN_DUO)],
    [_cams('duo', [_cam('jinx', 0, talk=[[0.0, 1.15]], react=[[0.1, '😎'], [1.6, '💀']], hit=[1.35], dead=1.6),
                   _cam('tuanbeo', 1, talk=[[2.45, 3.2]], react=[[0.6, '😐'], [1.7, '😈']])], vs=True),
     _m('trash talk:', 0, 1.33, _CAP_DUO, 110, pop=False),
     _m('reality:', 1.36, _H, _CAP_DUO, 110),
     _chat('jinx', 'ur all bots', -0.2, 2.35, _CH_DUO[0]),
     _chat('jinx', 'watch this 😎', 0.55, 2.35, _CH_DUO[1]),
     _chat('tuanbeo', 'bots huh', 2.45, _H, _CH_DUO[0])],
    [['pulse', 0, 1.35, {}], ['groove', 1.6, _H, {}]], [[1.35, 1.6]], mute=[[1.35, 1.6]])

# ---------------------------------------------------------------- P9: my duo steals my goal on the line. MINE!
# pa_steal: shot 0.4, keeper dives 0.53, tap 1.57, goal 1.7
_T = 'pa_steal_s7'
EDL['P9h'] = phook(
    [_w(0, _H, _T, 0.1, F(1.75, 0.15, dy=-30), _WIN_DUO)],
    [_cams('duo', [_cam('NGH', 0, talk=[[0.25, 0.8]], react=[[0.3, '😎'], [1.55, '😐'], [2.6, '😡']]),
                   _cam('tuanbeo', 0, talk=[[1.45, 2.1]], react=[[1.55, '😈'], [2.65, '😇']])]),
     _m('when your duo<br>steals your goal', 0, 1.45, _CAP_DUO, 92, pop=False),
     _m('MINE.', 1.5, 2.5, _CAP_DUO, 120),
     _chat('tuanbeo', "you're welcome 😇", 2.55, _H, _CH_DUO[0])],
    [['calm', 0, 1.47, {}], ['groove', 1.47, _H, {}]], [[1.47, 0.9], [1.57, 1.2]])

# ---------------------------------------------------------------- P10: voice chat when the meteor lands (6 cams)
# pa_meteor: ult 0.23 (cut-in to 0.83), DUKE leaves the map 0.87, reticle hunts us, KRAKOOM ~2.27
_T = 'pa_meteor_s7'
_IMP = 2.13     # video time of the crash (take 2.23)
EDL['P10h'] = phook(
    [_w(0, _H, _T, 0.1, F(1.5, 0.15, dy=-15), _WIN_SQ)],
    [_cams('squads', [_cam('NGH', 0, talk=[[0.9, _IMP]], react=[[1.0, '😱'], [_IMP + 0.12, '💀']], hit=[_IMP], dead=_IMP + 0.3),
                      _cam('tuanbeo', 0, talk=[[1.05, _IMP]], react=[[1.2, '😨'], [_IMP + 0.2, '💀']], hit=[_IMP], dead=_IMP + 0.35),
                      _cam('kaito_04', 0, talk=[[1.3, _IMP]], react=[[1.4, '😱'], [_IMP + 0.28, '💀']], hit=[_IMP], dead=_IMP + 0.4),
                      _cam('mochi', 1, react=[[_IMP + 0.2, '😂']]),
                      _cam('DUKE', 1, talk=[[0.05, 0.75], [_IMP + 0.1, 3.4]], react=[[0.1, '😈'], [_IMP + 0.1, '😂']]),
                      _cam('panda.exe', 1, react=[[_IMP + 0.3, '🤣']])]),
     _m('voice chat when<br>the meteor lands', 0, _IMP, _CAP_SQ, 92, pop=False),
     _m('squad wipe 💀', _IMP + 0.15, _H, _CAP_SQ, 104),
     _chat('NGH', 'RUN RUN RUN', 1.0, _IMP, _CH_SQ)],
    [['tension', 0, _IMP, {}], ['groove', _IMP, _H, {}]], [[0.13, 0.8], [_IMP, 1.6]])

# ---------------------------------------------------------------- P11: 3 friends vs 3 strangers -> triple dropkick, walk it in
# pa_strangers: windups 0.73, TRIPLE ~1.0-1.2, ball to me 1.7, shot 2.0, goal 2.33
_T = 'pa_strangers_s7'
EDL['P11h'] = phook(
    [_w(0, _H, _T, 0.2, F(1.55, 0.2, dy=-36), _WIN_SQ)],
    [_cams('squads', [_cam('NGH', 0, talk=[[0.0, 0.55], [1.85, 3.3]], react=[[0.9, '😈'], [1.88, '🔥']]),
                      _cam('tuanbeo', 0, talk=[[0.5, 0.8], [1.9, 3.3]], react=[[0.95, '😈'], [1.95, '😂']]),
                      _cam('kaito_04', 0, talk=[[0.5, 0.8], [1.9, 3.3]], react=[[1.0, '😈'], [1.92, '🔥']]),
                      _cam('ratking', 1, react=[[1.0, '💀']], hit=[0.77], dead=1.05),
                      _cam('jinx', 1, react=[[1.1, '😳']]),
                      _cam('m0le', 1, react=[[1.9, '😭']])]),
     _m('3 friends vs<br>3 strangers', 0, 1.15, _CAP_SQ, 96, pop=False),
     _m('friendship is<br>a weapon 😈', 1.2, _H, _CAP_SQ, 92),
     _chat('NGH', '3... 2... 1...', -0.2, 0.75, _CH_SQ),
     _chat('ratking', 'reported.', 2.5, _H, _CH_SQ)],
    [['pulse', 0, 0.77, {}], ['groove', 0.77, _H, {}]], [[0.77, 1.3], [1.83, 1.0]])

# ---------------------------------------------------------------- P12: he rage quit (the game's own LEFT banner)... the AI that took over scores
# pa_ragequit: kick 0.43, fly 0.77, LEFT banner 1.23, AI back 1.53, steal 1.63, shot 2.1, goal 2.6
_T = 'pa_ragequit_s7'
EDL['P12h'] = phook(
    [_w(0, 1.0, _T, 0.15, F(1.55, 0.2, dy=-22), _WIN_DUO),
     _w(1.0, 1.9, _T, 1.15, _fix(0.92, 318, 180), _WIN_DUO),
     _w(1.9, _H, _T, 2.05, F(1.5, 0.15, dy=-30), _WIN_DUO)],
    [_cams('duo', [_cam('NGH', 0, talk=[[0.3, 0.9]], react=[[0.3, '😈'], [1.15, '😂'], [1.62, '😳'], [2.42, '💀']], hit=[1.58]),
                   _cam('xX_vex_Xx', 1, react=[[0.75, '😡']], hit=[0.62], dead=1.08)], vs=True),
     _m('he rage quit 😂', 0, 1.5, _CAP_DUO, 100, pop=False),
     _m('the bot that<br>replaced him:', 1.55, 2.38, _CAP_DUO, 92),
     _m('...is better 💀', 2.42, _H, _CAP_DUO, 100),
     _chat('xX_vex_Xx', 'this game is trash 😡', 0.8, 1.9, _CH_DUO[0])],
    [['pulse', 0, 1.08, {}], ['groove', 1.08, _H, {}]], [[0.62, 1.2], [1.58, 0.9], [2.38, 1.2]])

# ---------------------------------------------------------------- P13: the friend who never passes -> double dropkick by his own squad
# pa_nopass: PASS! 0.2 / 0.6 / 1.0, kicks 1.43, contact 1.63, then the ball finally moves 2.83
_T = 'pa_nopass_s7'
EDL['P13h'] = phook(
    [_w(0, _H, _T, 0.25, F(1.55, 0.2, dy=-12), _WIN_ROW)],
    [_cams('row', [_cam('NGH', talk=[[0.0, 0.45], [0.75, 1.15]], react=[[1.45, '😈']]),
                   _cam('tuanbeo', talk=[[2.6, 3.4]], react=[[0.6, '😎'], [1.5, '💀']], hit=[1.38]),
                   _cam('kaito_04', talk=[[0.4, 0.85]], react=[[1.5, '😈']])]),
     _m('the friend who<br>never passes', 0, 1.3, _CAP_ROW, 96, pop=False),
     _m('squad<br>intervention', 1.4, _H, _CAP_ROW, 100),
     _chat('NGH', 'PASS', -0.2, 2.5, _CH_ROW[0]),
     _chat('kaito_04', 'PASS IT', 0.45, 2.5, _CH_ROW[1]),
     _chat('tuanbeo', 'ok ok I pass now', 2.6, _H, _CH_ROW[0])],
    [['pulse', 0, 1.38, {}], ['groove', 1.38, _H, {}]], [[1.38, 1.3]])

# ---------------------------------------------------------------- P14: "I'd score from here" -> a black hole drags the defenders and my friend in goal into the net
# pa_bet: shot 0.6, grabs the defenders 0.6 / 0.7, the keeper 1.5, goal 2.63
_T = 'pa_bet_s7'
EDL['P14h'] = phook(
    [_w(0, _H, _T, 0.2, F(1.55, 0.15, dy=-25), _WIN_DUO)],
    [_cams('duo', [_cam('NGH', 0, talk=[[2.5, 3.2]], react=[[0.45, '😈'], [2.5, '😎']]),
                   _cam('bigboss99', 1, talk=[[0.0, 0.6], [1.35, 2.35]], react=[[0.1, '😂'], [1.3, '😳'], [2.42, '💀']], hit=[1.27, 2.37], dead=2.45)], vs=True),
     _m('I bet my friend<br>I\'d score from here', 0, 1.5, _CAP_DUO, 88, pop=False),
     _m("he's in the<br>net too 💀", 2.42, _H, _CAP_DUO, 96),
     _chat('bigboss99', 'from there? no chance', -0.2, 1.4, _CH_DUO[0]),
     _chat('bigboss99', 'WHY AM I MOVING', 1.4, _H, _CH_DUO[0])],
    [['tension', 0, 2.37, {}], ['groove', 2.37, _H, {}]], [[0.37, 1.0], [2.37, 1.4]])

# ---------------------------------------------------------------- P15: best friends, different teams -> he sprints off his line and dropkicks me
# pa_bestie: off his line 0.55, windup 1.0, contact 1.27, SORRY! 1.8
_T = 'pa_bestie_s7'
_c = F(1.7, 0.18, dy=-22)
EDL['P15h'] = phook(
    [_w(0, 1.13, _T, 0.1, _c, _WIN_DUO),
     _w(1.13, 1.38, _T, 1.23, _fix(1.95, 'focus', 'focus'), _WIN_DUO, rate=0),
     _w(1.38, _H, _T, 1.23, _c, _WIN_DUO)],
    [_cams('duo', [_cam('NGH', 0, talk=[[0.0, 0.8]], react=[[0.3, '😅'], [1.42, '💀']], hit=[1.13], dead=1.45),
                   _cam('zzz_mi', 1, talk=[[1.95, 2.7]], react=[[0.8, '😈'], [1.95, '😇']])], vs=True),
     _m('best friends.<br>different teams.', 0, 1.13, _CAP_DUO, 92, pop=False),
     _m('friendship<br>ended 💀', 1.4, _H, _CAP_DUO, 100),
     _chat('zzz_mi', 'sorry bestie 💀', 2.0, _H, _CH_DUO[0])],
    [['tension', 0, 1.13, {}], ['groove', 1.38, _H, {}]], [[1.13, 1.5]], mute=[[1.13, 1.38]])

# ---------------------------------------------------------------- P16: he picked aura farming -> I faint before I touch him
# pa_aura: ult 0.13 (cut-in to 0.73), I walk up 0.8, *faints* 1.73
_T = 'pa_aura_s7'
EDL['P16h'] = phook(
    [_w(0, _H, _T, 0.1, F(1.85, 0.2, dy=-22), _WIN_DUO)],
    [_cams('duo', [_cam('kaito_04', 0, talk=[[0.75, 1.5]], react=[[1.7, '😵']], hit=[1.6], dead=1.7),
                   _cam('bigboss99', 1, react=[[0.7, '😎'], [2.3, '😂']])], vs=True),
     _m('he picked<br>aura farming', 0, 1.52, _CAP_DUO, 96, pop=False),
     _m("didn't even<br>touch him", 1.62, _H, _CAP_DUO, 96),
     _chat('kaito_04', 'I JUST FAINTED??', 2.2, _H, _CH_DUO[0])],
    [['calm', 0, 1.6, {}], ['groove', 1.6, _H, {}]], [[0.0, 0.8], [1.6, 1.2]])

# ---------------------------------------------------------------- P17: the whole lobby only dropkicks -> all six fly, the ball rolls in alone
# pa_lobby: whistle 0.3, kicks 0.53, SMASH 0.73, the ball rolls 1.87, goal 2.9
_T = 'pa_lobby_s7'
_IMP = 0.7
_six = [('NGH', 0), ('tuanbeo', 0), ('kaito_04', 0), ('zzz_mi', 1), ('bigboss99', 1), ('xX_vex_Xx', 1)]
EDL['P17h'] = phook(
    [_w(0, _IMP, _T, 0.0, _fix(1.6, 320, 186), _WIN_SQ),
     _w(_IMP, _IMP + 0.25, _T, 0.73, _fix(1.75, 320, 190), _WIN_SQ, rate=0),
     _w(_IMP + 0.25, 1.75, _T, 0.73, _fix(1.6, 320, 186), _WIN_SQ),
     _w(1.75, 2.75, _T, 1.8, F(1.6, 0.25, dy=-28), _WIN_SQ, rate=1.47),
     _w(2.75, _H, _T, 3.27, F(1.6, 0.25, dy=-28), _WIN_SQ, rate=0.8)],
    [_cams('squads', [_cam(h, s, talk=[[0.0, 0.5]], react=[[_IMP + 0.05 + 0.05 * i, '💀']], hit=[_IMP], dead=_IMP + 0.3)
                      for i, (h, s) in enumerate(_six)]),
     _m('when the lobby<br>only dropkicks', 0, 1.6, _CAP_SQ, 96, pop=False),
     _m('nobody<br>survived 💀', 1.7, 2.75, _CAP_SQ, 96),
     _m('except the ball ⚽', 2.8, _H, _CAP_SQ, 96)],
    [['tension', 0, _IMP, {}], ['groove', _IMP + 0.25, _H, {}]], [[_IMP, 1.6], [2.75, 1.0]], mute=[[_IMP, _IMP + 0.25]], nocut=[2.75])

# ---------------------------------------------------------------- P18: my friend went AFK -> their clearance smacks his head and goes in
# pa_afk: AFK 0.15, clearance 0.9, BONK 0.97, goal 1.17
_T = 'pa_afk_s7'
_c = _fix(1.85, 530, 192)
EDL['P18h'] = phook(
    [_w(0, 0.9, _T, 0.0, _c, _WIN_ROW),
     _w(0.9, 1.5, _T, 0.9, _c, _WIN_ROW, rate=0.4),
     _w(1.5, _H, _T, 1.14, _c, _WIN_ROW)],
    [_cams('row', [_cam('NGH', talk=[[0.1, 0.8]], react=[[1.55, '😂']]),
                   _cam('tuanbeo', talk=[[1.6, 2.4]], react=[[1.6, '💀']]),
                   _cam('kaito_04', label='kaito_04 · AFK', react=[[2.65, '😳']], dead=-1)]),
     _m('my friend went<br>AFK mid-match', 0, 1.0, _CAP_ROW, 92, pop=False),
     _m('he still<br>scored 💀', 1.55, _H, _CAP_ROW, 100),
     _chat('NGH', 'kaito?? u there', -0.2, 1.5, _CH_ROW[0]),
     _chat('kaito_04', 'back. what did I miss', 2.6, _H, _CH_ROW[0])],
    [['calm', 0, 1.5, {}], ['groove', 1.5, _H, {}]], [[1.0, 1.0], [1.57, 1.2]], nocut=[0.9, 1.5])

# ---------------------------------------------------------------- P19: don't celebrate in front of your friend -> SIUUU... dropkick mid-air
# pa_celebrate: shot 0.13, goal 0.37, play resumes 0.9, SIUUU jump 1.23, windup 1.37, contact 1.57
_T = 'pa_celebrate_s7'
_c = F(1.7, 0.2, dy=-36)
EDL['P19h'] = phook(
    [_w(0, 1.57, _T, 0.0, _c, _WIN_DUO),
     _w(1.57, 1.82, _T, 1.63, _fix(1.95, 'focus', 'focus'), _WIN_DUO, rate=0),
     _w(1.82, _H, _T, 1.63, _c, _WIN_DUO)],
    [_cams('duo', [_cam('NGH', 0, talk=[[1.9, 2.6]], react=[[0.45, '😐'], [1.85, '😈']]),
                   _cam('m0le', 1, talk=[[0.35, 1.5]], react=[[0.4, '🥳'], [1.85, '💀']], hit=[1.57], dead=1.85)], vs=True),
     _m("don't celebrate in<br>front of your friend", 0, 1.55, _CAP_DUO, 84, pop=False),
     _m('he had it<br>coming', 1.85, _H, _CAP_DUO, 100),
     _chat('m0le', 'ok that was fair', 2.6, _H, _CH_DUO[0])],
    [['pulse', 0, 1.57, {}], ['groove', 1.82, _H, {}]], [[0.37, 1.0], [1.57, 1.5]], mute=[[1.57, 1.82]])

# ---------------------------------------------------------------- P20: he said he was a pro -> a slick dodge... off the post from 5 metres
# pa_pro: dodge 0.4, shot 1.37, CLANG 1.53, ... 2.07
_T = 'pa_pro_s7'
EDL['P20h'] = phook(
    [_w(0, _H, _T, 0.1, F(1.7, 0.18, dy=-18), _WIN_ROW)],
    [_cams('row', [_cam('mochi', talk=[[0.0, 1.2]], react=[[0.35, '😎'], [1.6, '😭']]),
                   _cam('DUKE', talk=[[2.0, 2.8]], react=[[1.5, '💀']]),
                   _cam('panda.exe', react=[[1.6, '😂']])]),
     _m('he said he<br>was a pro', 0, 1.4, _CAP_ROW, 100, pop=False),
     _m('pro at hitting<br>the post', 1.5, _H, _CAP_ROW, 96),
     _chat('mochi', 'watch this', -0.2, 1.4, _CH_ROW[0]),
     _chat('DUKE', '"pro" 💀', 2.0, _H, _CH_ROW[0])],
    [['groove', 0, 1.43, {'light': True}], ['groove', 1.63, _H, {}]], [[1.43, 1.2]], mute=[[1.43, 1.63]])

# ---------------------------------------------------------------- P21 (family: the silent friend who carries): never says a word... LIGHTNING DASH through all three
# pa_quiet: ult 0.57 (cut-in to 1.17), dash 1.2-1.45, shot 1.73, goal 1.93
_T = 'pa_quiet_s7'
EDL['P21h'] = phook(
    [_w(0, _H, _T, 0.25, F(1.5, 0.2, dy=-22), _WIN_ROW)],
    [_cams('row', [_cam('NGH', talk=[[0.0, 0.4], [1.65, 2.6]], react=[[1.65, '🔥']]),
                   _cam('tuanbeo', talk=[[0.3, 1.3]], react=[[1.0, '😱']]),
                   _cam('kaito_04', react=[[2.35, '🫡']])]),
     _m('the quiet one<br>in every squad', 0, 1.3, _CAP_ROW, 96, pop=False),
     _m("doesn't talk.<br>just carries.", 1.4, _H, _CAP_ROW, 96),
     _chat('tuanbeo', 'is kaito even on call?', -0.2, 1.4, _CH_ROW[0]),
     _chat('kaito_04', '.', 2.3, _H, _CH_ROW[0])],
    [['tension', 0, 0.95, {}], ['groove', 0.95, _H, {}]], [[0.32, 0.8], [0.95, 1.3], [1.62, 1.0]])

# ---------------------------------------------------------------- P22 (family: duo combo): the duo syncs -> ENDLESS TIKI-TAKA, four golden passes, goal
# pa_sync: ult 0.3 (cut-in to 0.9), golden passes 0.9-1.9, shot 1.93, goal 2.23
_T = 'pa_sync_s7'
EDL['P22h'] = phook(
    [_w(0, _H, _T, 0.15, F(1.6, 0.2, dy=-25), _WIN_DUO)],
    [_cams('duo', [_cam('mochi', 0, talk=[[0.0, 0.3], [0.85, 1.0], [1.32, 1.47], [1.75, 1.9], [2.1, 3.3]], react=[[2.12, '🔥']]),
                   _cam('DUKE', 0, talk=[[1.05, 1.2], [1.52, 1.67], [2.1, 3.3]], react=[[2.18, '🎶']])]),
     _m('when the duo<br>finally syncs', 0, 1.6, _CAP_DUO, 96, pop=False),
     _m('2 brains,<br>1 frequency', 2.1, _H, _CAP_DUO, 96),
     _chat('mochi', 'NOW', -0.2, 0.9, _CH_DUO[0])],
    [['tension', 0, 0.75, {}], ['groove', 0.75, _H, {}]], [[0.15, 0.8], [2.08, 1.3]])

# ---------------------------------------------------------------- P23 (family: keepers in street 3v3): no fixed keeper -> all three step out, he walks it in
# pa_keeper: NOT ME 0.97, shot 1.27, goal 1.77
_T = 'pa_keeper_s7'
EDL['P23h'] = phook(
    [_w(0, _H, _T, 0.0, _fix(1.6, 160, 182), _WIN_ROW)],
    [_cams('row', [_cam('NGH', talk=[[0.0, 0.5]], react=[[1.85, '😭']]),
                   _cam('tuanbeo', talk=[[0.45, 0.85]], react=[[1.9, '💀']]),
                   _cam('kaito_04', talk=[[0.8, 1.2]], react=[[1.95, '🤡']])]),
     _m('street 3v3 has<br>no fixed keeper', 0, 1.3, _CAP_ROW, 92, pop=False),
     _m('so nobody<br>kept 💀', 1.4, _H, _CAP_ROW, 100),
     _chat('NGH', "who's in goal??", -0.2, _H, _CH_ROW[0]),
     _chat('tuanbeo', 'not me', 0.45, _H, _CH_ROW[1]),
     _chat('kaito_04', 'not me', 0.8, _H, _CH_ROW[2])],
    [['calm', 0, 1.77, {}], ['groove', 1.77, _H, {}]], [[1.77, 1.2]])

# ---------------------------------------------------------------- P24 (family: signature ultimate reveal): "what does your ultimate do?" -> CLONE ARMY mugs me
# pa_reveal: ult 0.53 (cut-in to 1.13), POOF 1.2, 4 HIT 1.73, he takes the ball 2.1
_T = 'pa_reveal_s7'
EDL['P24h'] = phook(
    [_w(0, _H, _T, 0.2, F(1.75, 0.2, dy=-22), _WIN_DUO)],
    [_cams('duo', [_cam('NGH', 0, talk=[[0.0, 0.3], [2.2, 2.9]], react=[[1.0, '😳'], [1.65, '💀']], hit=[1.5]),
                   _cam('zzz_mi', 1, talk=[[0.3, 0.9]], react=[[0.3, '😇'], [1.6, '😈']])], vs=True),
     _m('"what does your<br>ultimate do?"', 0, 1.0, _CAP_DUO, 92, pop=False),
     _m('live demo:', 1.05, _H, _CAP_DUO, 104),
     _chat('zzz_mi', 'wanna see? 😇', 0.3, 1.5, _CH_DUO[0]),
     _chat('NGH', "I'M GOOD THANKS", 2.2, _H, _CH_DUO[0])],
    [['tension', 0, 1.0, {}], ['groove', 1.0, _H, {}]], [[0.33, 0.8], [1.5, 1.3]])

# ---------------------------------------------------------------- P25 (family: the last-second own goal): 2-2, last second -> his clearance hits his own teammate, GOAL x2
# pa_lastsecond: shot 0.5, he blocks it 0.8, clearance 1.1, BONK off his teammate 1.13, goal 1.47
_T = 'pa_lastsecond_s7'
_c = _fix(1.75, 498, 182)
EDL['P25h'] = phook(
    [_w(0, 0.95, _T, 0.0, _c, _WIN_SQ),
     _w(0.95, 1.75, _T, 0.95, _c, _WIN_SQ, rate=0.4),
     _w(1.75, 2.25, _T, 1.27, _c, _WIN_SQ),
     _w(2.25, _H, _T, 1.77, _fix(1.0, 320, 180), _WIN_SQ)],
    [_cams('squads', [_cam('NGH', 0, talk=[[0.3, 0.6], [1.95, 3.6]], react=[[1.55, '😳'], [1.98, '🔥']]),
                      _cam('tuanbeo', 0, talk=[[1.95, 3.6]], react=[[2.05, '😱']]),
                      _cam('kaito_04', 0, talk=[[1.95, 3.6]], react=[[2.0, '🙏']]),
                      _cam('zzz_mi', 1, react=[[2.1, '🤦']]),
                      _cam('bigboss99', 1, react=[[1.55, '😱'], [2.05, '😭']]),
                      _cam('xX_vex_Xx', 1, react=[[1.6, '💀']], hit=[1.5])]),
     _m('last second.<br>2-2.', 0, 1.4, _CAP_SQ, 104, pop=False),
     _m('thank you 🙏', 1.98, _H, _CAP_SQ, 104),
     _chat('bigboss99', "I'm uninstalling", 2.6, _H, _CH_SQ)],
    [['tension', 0, 0.95, {}], ['calm', 0.95, 1.75, {}], ['groove', 1.95, _H, {}]], [[1.5, 1.2], [1.95, 1.5]], heart=[[0, 0.95]], nocut=[0.95, 1.75])
