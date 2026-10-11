# batch pc: PvP bodies B12-B21 (4.0 -> 11.4; body() adds the PvP end card from 10.2: "tag the friend you'd dropkick").
# exec'd by edl.py with seg / meme / F / body / END_CARD_PVP / RG_DUR / EDL in scope. Names are _PC-prefixed (shared namespace).
# New takes: frames/pc_<scene>_s7 (scenes_pc.js): the game's own online UI (party, matchmaking, intro, results, friends) filled with
# the made-up cast, and 3v3 Street Kings (us: NGH, tuanbeo, kaito_04) vs Neon Strikers (rivals: zzz_mi, bigboss99, xX_vex_Xx).
# Signature ultimates: NGH Meteor Shot · tuanbeo Titan · kaito_04 Lightning Dash · zzz_mi Aura Farming · bigboss99 Hundred Fists ·
# xX_vex_Xx Meteor Drop. Reused takes (2-a-side, scorer = NGH): punch_kick, gb_dodge, meteor_goal, sb_bad_pass, sa_tapin,
# sa_wronggoal, sc_bicycle, sb_trick_shot.
#
# Layout (1080x1920): our squad's cams in a row at the top (40-295), the game in a window (layout='fit'); rivals' cams at the
# bottom (y2=1640) when both squads are on screen; captions / chat / tags in the band between the window and the bottom.

_PC_END = RG_DUR
_PC_US = ['NGH', 'tuanbeo', 'kaito_04']
_PC_RIV = ['zzz_mi', 'bigboss99', 'xX_vex_Xx']


def _PC_FIX(z, fx, fy, **kw):
    return dict(z=z, fx=fx, fy=fy, **kw)


def _PC_W(v0, v1, take, c0, h=1100, cam=None, rate=None, **kw):
    """a game segment in the window between the cams"""
    return seg(v0, v1, take, c0, rate=rate, cam=cam or F(1.7, 0.2), layout='fit', h=h, **kw)


def _PC_P(h, talk=(), react=(), hit=(), **kw):
    d = {'h': h, 'talk': [list(x) for x in talk], 'react': [list(x) for x in react], 'hit': list(hit)}
    d.update(kw)
    return d


def _PC_ROW(t0, t1, players, y=40):
    return {'k': 'cams', 't0': t0, 't1': t1, 'layout': 'row', 'y': y, 'players': players}


def _PC_SQ(t0, t1, us, riv, y2=1640):
    """both squads: ours on top (side 0), rivals at the bottom (side 1)"""
    return {'k': 'cams', 't0': t0, 't1': t1, 'layout': 'squads', 'y': 40, 'y2': y2,
            'players': [dict(p, side=0) for p in us] + [dict(p, side=1) for p in riv]}


def _PC_ONE(t0, t1, p, x=290, y=40, w=500, h2=300):
    """one big streamer cam at the top centre (slides in from the right)"""
    return {'k': 'cams', 't0': t0, 't1': t1, 'layout': 'corner', 'players': [dict(p, x=x, y=y, w=w, h2=h2)]}


def _PC_CHAT(h, s, t0, t1, y=1490):
    return {'k': 'chat', 'h': h, 's': s, 't0': t0, 't1': t1, 'y': y}


def _PC_TAG(a, b, c, t0, t1, y=1480):
    return {'k': 'tag', 'a': a, 'b': b, 'c': c, 't0': t0, 't1': t1, 'y': y}


_PC_OUT = ['outro', 10.2, _PC_END, {}]

# ---------------------------------------------------------------------------------------------------------------
# B12 HOW ONLINE WORKS: PLAY > RANKED with the squad (START -> SEARCHING -> MATCH FOUND vs the rivals) -> the RANKED MATCH intro
#   (everyone's signature ultimate) -> kaito_04's Lightning Dash goal -> VICTORY, stars count up
#   marks: pc_party start 0.6, found 1.83 · pc_intro cards ours 0.9/1.34/1.78, theirs 1.12/1.56/2.0 ·
#          pc_ult_kaito cut-in 0.43, dash 1.03, shot 1.13, goal 1.53 · pc_res0 results 0.93, stars count 2.07-3.17
EDL['B12'] = body(
    [_PC_W(4.0, 5.16, 'pc_party_s7', 0.25, h=1000, rate=1.35, cam=_PC_FIX(0.93, 320, 185)),
     _PC_W(5.16, 5.95, 'pc_party_s7', 1.82, h=1000, cam=_PC_FIX(0.93, 320, 185, drift=0.06)),
     _PC_W(5.95, 6.65, 'pc_intro_s7', 1.75, h=1000, cam=_PC_FIX(1.25, 150, 178)),
     _PC_W(6.65, 7.35, 'pc_intro_s7', 2.4, h=1000, cam=_PC_FIX(1.25, 490, 178)),
     _PC_W(7.35, 8.95, 'pc_ult_kaito_s7', 0.72, h=1000, cam=F(1.65, 0.2)),
     _PC_W(8.95, 10.2, 'pc_res0_s7', 1.6, h=1000, rate=1.28, cam=_PC_FIX(1.15, 320, 168)),
     _PC_W(10.2, _PC_END, 'pc_res0_s7', 3.2, h=1000, rate=0.5, cam=_PC_FIX(1.15, 320, 168), dim=0.82)],
    [_PC_SQ(4.0, _PC_END,
            [_PC_P('NGH', talk=[[4.1, 4.75], [9.0, 10.1]], react=[[5.2, '😈'], [9.05, '😂']]),
             _PC_P('tuanbeo', talk=[[5.2, 5.75], [8.17, 8.8]], react=[[5.25, '😤'], [8.2, '😱']]),
             _PC_P('kaito_04', talk=[[7.35, 8.9]], react=[[7.4, '😈'], [8.2, '🔥']])],
            []),
     {'k': 'cams', 't0': 5.18, 't1': _PC_END, 'layout': 'squads', 'y2': 1640,
      'players': [_PC_P('zzz_mi', side=1, hit=[7.66], react=[[7.7, '😱']]),
                  _PC_P('bigboss99', side=1, hit=[7.68], react=[[9.05, '😡']], talk=[[9.0, 9.8]]),
                  _PC_P('xX_vex_Xx', side=1, react=[[8.2, '💀']])]},
     meme('how online<br>works:', 4.05, 5.1, y=1415, size=92),
     meme('match found 😳', 5.2, 5.9, y=1440, size=92),
     meme('everyone brings<br>an ultimate', 5.98, 7.3, y=1415, size=88),
     _PC_TAG('kaito_04', 'LIGHTNING DASH', '#7fe7ff', 7.4, 8.9, y=1440),
     meme('wins = stars ⭐', 9.0, 10.15, y=1440, size=92)],
    [['groove', 4.0, 10.2, {'melodyFrom': 7.35}], _PC_OUT],
    [[4.0, 0.6], [4.26, 0.5], [5.17, 1.1], [5.95, 0.7], [7.66, 1.2], [8.16, 1.3], [8.95, 0.7], [10.2, 1.3]],
    nocut=[5.16], end=END_CARD_PVP)

# ---------------------------------------------------------------------------------------------------------------
# B13 SQUAD UP: FRIENDS list -> invite tuanbeo (Invite sent... -> joined your party), kaito_04 joins too -> 3 READY ->
#   tuanbeo -> kaito_04 -> NGH, one touch each, GOAL -> the squad loses it on voice. Each cam appears when that friend joins.
#   marks: pc_friends inv1 0.6 (joined 1.4), inv2 1.3 (joined 2.1) · pc_teamgoal pass1 0.5, pass2 0.8, shot 1.2, goal 1.6
_B13_JOIN_T, _B13_JOIN_K = 5.06, 5.76
_B13_BIG = 7.45      # the three cams go big over a dimmed replay of the goal: the squad loses it on voice
EDL['B13'] = body(
    [_PC_W(4.0, 4.95, 'pc_friends_s7', 0.3, cam=_PC_FIX(1.75, 560, 138)),
     _PC_W(4.95, 6.0, 'pc_friends_s7', 1.3, cam=_PC_FIX(0.95, 242, 180)),
     _PC_W(6.0, 7.45, 'pc_teamgoal_s7', 0.3, cam=F(1.6, 0.18)),
     _PC_W(7.45, 10.2, 'pc_teamgoal_s7', 0.42, rate=0.5, cam=F(1.75, 0.2), dim=0.5),
     _PC_W(10.2, _PC_END, 'pc_teamgoal_s7', 1.8, rate=0.3, cam=F(1.75, 0.2), dim=0.82)],
    [{'k': 'cams', 't0': 4.0, 't1': _B13_BIG, 'layout': 'row', 'y': 40,
      'players': [_PC_P('NGH', x=30, w=326, h2=255, talk=[[4.1, 4.8], [7.0, 7.45]], react=[[5.8, '😤'], [7.3, '🔥']])]},
     {'k': 'cams', 't0': _B13_JOIN_T, 't1': _B13_BIG, 'layout': 'row', 'y': 40,
      'players': [_PC_P('tuanbeo', x=377, w=326, h2=255, talk=[[5.1, 5.6]], react=[[5.12, '👋'], [6.25, '😎']])]},
     {'k': 'cams', 't0': _B13_JOIN_K, 't1': _B13_BIG, 'layout': 'row', 'y': 40,
      'players': [_PC_P('kaito_04', x=724, w=326, h2=255, talk=[[5.8, 6.2]], react=[[5.82, '😎'], [6.55, '👀']])]},
     # big cams: two side by side, one under them, all talking at once, emotes popping
     {'k': 'cams', 't0': _B13_BIG, 't1': 10.2, 'layout': 'corner',
      'players': [_PC_P('NGH', x=40, y=420, w=490, h2=420, emHold=0.9, talk=[[7.45, 8.4], [8.7, 10.2]], react=[[7.5, '🔥'], [8.45, '😂'], [9.35, '🥳']], hit=[7.5]),
                  _PC_P('tuanbeo', x=550, y=420, w=490, h2=420, emHold=0.9, talk=[[7.5, 9.1], [9.3, 10.2]], react=[[7.6, '🥳'], [8.55, '👑'], [9.5, '😂']], hit=[7.6])]},
     {'k': 'cams', 't0': _B13_BIG + 0.12, 't1': 10.2, 'layout': 'corner',
      'players': [_PC_P('kaito_04', x=295, y=865, w=490, h2=420, emHold=0.9, talk=[[7.6, 10.2]], react=[[7.7, '😱'], [8.25, '🔥'], [9.2, '😂']], hit=[7.7])]},
     _PC_ROW(10.2, _PC_END, [_PC_P('NGH'), _PC_P('tuanbeo'), _PC_P('kaito_04')]),
     meme('invite your<br>friends', 4.05, 4.92, y=1490, size=92),
     meme("squad's ready 😤", 5.0, 5.95, y=1520, size=92),
     meme('pass, pass...<br>GOAL 🔥', 6.05, 7.4, y=1490, size=92),
     meme('the squad<br>on voice:', 7.5, 8.75, y=1490, size=92),
     _PC_CHAT('kaito_04', 'TIKI TAKAAA 🔥', 7.85, 10.15, y=1730),
     _PC_CHAT('tuanbeo', 'assist king 👑', 8.45, 10.15, y=1820),
     meme('3 friends.<br>1 brain cell.', 8.85, 10.15, y=1490, size=92)],
    [['groove', 4.0, 10.2, {'melodyFrom': 6.0}], _PC_OUT],
    [[4.0, 0.6], [4.3, 0.5], [_B13_JOIN_T, 0.8], [_B13_JOIN_K, 0.8], [6.0, 0.7], [6.9, 0.8], [7.3, 1.3], [7.45, 0.9], [10.2, 1.3]],
    crowd=[[7.3, 9.0]], end=END_CARD_PVP)

# ---------------------------------------------------------------------------------------------------------------
# B14 SIGNATURE ULTIMATES: one per player, each with his cam + a name tag (the game's own cut-in banner shows the ultimate):
#   kaito_04 Lightning Dash · zzz_mi Aura Farming · tuanbeo Titan · bigboss99 Hundred Fists · xX_vex_Xx Meteor Drop · NGH Meteor Shot
#   marks: kaito cut-in 0.43, dash 1.03 · zzz cut-in 0.37, dodge 1.07 · tuan cut-in 0.3, BONK 1.5-1.95 · boss cut-in 0.5,
#          punches 1.1-2.47 · vex cut-in 0.4, KRAKOOM 2.4 · payback (NGH) cut-in 1.3, strike 2.5, goal 3.27
_B14 = [('kaito_04', 'LIGHTNING DASH', '#7fe7ff', '😎'), ('zzz_mi', 'AURA FARMING', '#ffe14f', '😇'), ('tuanbeo', 'TITAN', '#ff9a3d', '😤'),
        ('bigboss99', 'HUNDRED FISTS', '#ff3d5a', '😈'), ('xX_vex_Xx', 'METEOR DROP', '#ff6a1f', '😈'), ('NGH', 'METEOR SHOT', '#ffb03d', '🔥')]
_B14_T = [4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.2]
EDL['B14'] = body(
    [_PC_W(4.0, 5.0, 'pc_ult_kaito_s7', 0.62, cam=F(1.7, 0.2)),
     _PC_W(5.0, 6.0, 'pc_ult_zzz_s7', 0.62, cam=F(1.7, 0.2)),
     _PC_W(6.0, 7.0, 'pc_ult_tuan_s7', 0.68, rate=1.3, cam=F(1.6, 0.2)),
     _PC_W(7.0, 8.0, 'pc_ult_boss_s7', 0.85, rate=2.0, cam=F(1.9, 0.2)),
     _PC_W(8.0, 8.35, 'pc_ult_vex_s7', 0.75, cam=_PC_FIX(1.7, 330, 200)),
     _PC_W(8.35, 9.0, 'pc_ult_vex_s7', 2.05, cam=_PC_FIX(1.7, 318, 200)),
     _PC_W(9.0, 10.2, 'pc_payback_s7', 1.75, rate=1.33, cam=F(1.6, 0.25)),
     _PC_W(10.2, _PC_END, 'pc_payback_s7', 3.35, rate=0.5, cam=F(1.6, 0.25), dim=0.82)],
    [_PC_ONE(_B14_T[i], _B14_T[i + 1], _PC_P(h, talk=[[_B14_T[i] + 0.05, _B14_T[i + 1] - 0.05]], react=[[_B14_T[i] + 0.3, e]], live=True))
     for i, (h, n, c, e) in enumerate(_B14)]
    + [_PC_TAG(h, n, c, _B14_T[i] + 0.04, _B14_T[i + 1] - 0.03 if i < 5 else 10.15) for i, (h, n, c, e) in enumerate(_B14)]
    + [meme('everyone has a<br>signature ultimate', 4.05, 5.6, y=1640, size=84),
       meme('which one<br>is yours? 👇', 9.1, 10.15, y=1640, size=88)],
    [['groove', 4.0, 10.2, {'melodyFrom': 7.0}], _PC_OUT],
    [[4.0, 0.7], [4.41, 1.0], [5.0, 0.6], [5.45, 0.8], [6.0, 0.6], [6.63, 1.1], [7.0, 0.6], [7.81, 1.2], [8.0, 0.6], [8.7, 1.5],
     [9.0, 0.6], [9.56, 1.0], [10.14, 1.2]],
    nocut=[8.35], end=END_CARD_PVP)

# ---------------------------------------------------------------------------------------------------------------
# B15 RANKED CLIMB: goal -> VICTORY +stars -> goal -> VICTORY +stars -> goal -> VICTORY: NEW AREA UNLOCKED: HARBOR DOCKS ->
#   the area's ultimate card flips: TITAN
#   marks: pc_ult_tuan goal 3.27 · pc_res* stars count 2.07-3.17 · pc_teamgoal goal 1.6 · pc_ult_kaito goal 1.53 · pc_res3 flip 6.07
EDL['B15'] = body(
    [_PC_W(4.0, 4.8, 'pc_ult_tuan_s7', 2.55, cam=F(1.7, 0.25)),
     _PC_W(4.8, 5.95, 'pc_res1_s7', 1.85, rate=1.17, cam=_PC_FIX(1.15, 320, 165)),
     _PC_W(5.95, 6.7, 'pc_teamgoal_s7', 0.95, cam=F(1.6, 0.2)),
     _PC_W(6.7, 7.75, 'pc_res2_s7', 1.95, rate=1.19, cam=_PC_FIX(1.15, 320, 165)),
     _PC_W(7.75, 8.45, 'pc_ult_kaito_s7', 1.0, cam=F(1.7, 0.2)),
     _PC_W(8.45, 9.35, 'pc_res3_s7', 2.1, rate=1.22, cam=_PC_FIX(1.15, 320, 165)),
     _PC_W(9.35, 10.2, 'pc_res3_s7', 5.98, cam=_PC_FIX(1.0, 305, 165)),
     _PC_W(10.2, _PC_END, 'pc_res3_s7', 6.83, rate=0.6, cam=_PC_FIX(1.0, 305, 165), dim=0.82)],
    [_PC_ROW(4.0, _PC_END,
             [_PC_P('NGH', talk=[[4.7, 5.3], [8.3, 9.3]], react=[[4.75, '🔥'], [8.5, '😭'], [9.5, '😳']]),
              _PC_P('tuanbeo', talk=[[6.55, 7.1], [9.4, 10.1]], react=[[6.62, '😤'], [8.52, '🥳'], [9.45, '😂']]),
              _PC_P('kaito_04', talk=[[8.2, 8.9]], react=[[5.2, '😎'], [8.3, '🔥'], [8.55, '😭']])]),
     meme('every win<br>= stars ⭐', 4.05, 5.9, y=1490, size=96),
     meme('stars unlock<br>new areas', 6.0, 7.7, y=1490, size=96),
     meme('1 more win... 😬', 7.8, 8.4, y=1520, size=92),
     meme('PROMOTED 😭', 8.47, 9.3, y=1520, size=110),
     meme('+ a new<br>ultimate 😳', 9.4, 10.15, y=1490, size=96)],
    [['groove', 4.0, 10.2, {'melodyFrom': 7.75}], _PC_OUT],
    [[4.0, 0.6], [4.72, 1.2], [4.8, 0.6], [6.6, 1.2], [6.7, 0.6], [8.28, 1.2], [8.45, 1.3], [9.35, 0.6], [9.45, 1.4], [10.2, 1.3]],
    crowd=[[8.45, 9.4]], end=END_CARD_PVP)

# ---------------------------------------------------------------------------------------------------------------
# B16 VOICE CHAT CHAOS: six cams, one wide 3v3 brawl: kaito_04 punches zzz_mi, bigboss99 dropkicks NGH, tuanbeo goes TITAN
#   and bowls both rivals over, xX_vex_Xx answers with METEOR DROP: KRAKOOM (slow-mo replay of the crater)
#   marks: pc_chaos6 POW 0.23, SMASH 0.6, Titan cut-in 0.87-1.45, BONKs 1.5-2.3, Meteor Drop cut-in 2.37-2.95, KRAKOOM 4.33
EDL['B16'] = body(
    [_PC_W(4.0, 7.0, 'pc_chaos6_s7', 0.0, h=1000, cam=_PC_FIX(1.25, 316, 200)),
     _PC_W(7.0, 7.7, 'pc_chaos6_s7', 3.0, h=1000, rate=1.71, cam=_PC_FIX(1.25, 316, 200)),
     _PC_W(7.7, 8.45, 'pc_chaos6_s7', 4.2, h=1000, cam=_PC_FIX(1.25, 316, 200)),
     _PC_W(8.45, 10.2, 'pc_chaos6_s7', 4.25, h=1000, rate=0.4, cam=_PC_FIX(1.7, 312, 197)),
     _PC_W(10.2, _PC_END, 'pc_chaos6_s7', 4.95, h=1000, rate=0.3, cam=_PC_FIX(1.7, 312, 197), dim=0.82)],
    [_PC_SQ(4.0, _PC_END,
            [_PC_P('NGH', hit=[4.6, 7.83], talk=[[4.6, 5.15], [7.85, 8.5]], react=[[4.63, '💀'], [7.86, '😱']]),
             _PC_P('tuanbeo', talk=[[4.87, 6.2], [9.3, 10.1]], react=[[4.9, '😤'], [5.7, '😂'], [9.3, '😂']]),
             _PC_P('kaito_04', hit=[7.83], talk=[[4.15, 4.6], [7.3, 8.0]], react=[[4.25, '😈'], [7.9, '😭']])],
            [_PC_P('zzz_mi', hit=[4.23, 5.53], talk=[[5.55, 6.1]], react=[[4.3, '😡'], [5.58, '😭']]),
             _PC_P('bigboss99', hit=[5.8], talk=[[4.5, 4.95], [8.05, 8.9]], react=[[4.6, '😈'], [5.82, '💀'], [8.1, '😂']]),
             _PC_P('xX_vex_Xx', talk=[[6.37, 7.3]], react=[[6.4, '😈'], [7.88, '😂']])]),
     meme('voice chat during<br>every match:', 4.05, 5.35, y=1415, size=84),
     _PC_CHAT('tuanbeo', 'TITAN TIME 😤', 5.45, 6.3, y=1450),
     _PC_CHAT('xX_vex_Xx', 'incoming ☄️', 6.4, 7.25, y=1450),
     _PC_CHAT('kaito_04', 'RUNNNN', 7.3, 7.95, y=1450),
     _PC_CHAT('bigboss99', 'BRO WHAT 😭', 8.0, 8.9, y=1450),
     meme('every. single.<br>match. 💀', 9.0, 10.15, y=1415, size=88)],
    [['groove', 4.0, 10.2, {'melodyFrom': 6.37}], _PC_OUT],
    [[4.0, 0.6], [4.23, 0.7], [4.6, 1.1], [4.87, 0.8], [5.53, 1.0], [5.8, 1.0], [6.37, 0.8], [7.83, 1.6], [8.7, 1.0], [10.2, 1.3]],
    nocut=[7.0, 7.7], end=END_CARD_PVP)

# ---------------------------------------------------------------------------------------------------------------
# B17 TRASH TALK -> PAYBACK: bigboss99's Hundred Fists on NGH (20 HIT, into the wall), he takes the ball: "ez 😂" in chat ->
#   NGH gets up, punches it off him, METEOR SHOT, GOAL -> "ez" back
#   marks: pc_ult_boss cut-in 0.5, punches 1.1-2.47, BONK 2.73 · pc_payback punch 0.77, cut-in 1.3, strike 2.5, goal 3.27
EDL['B17'] = body(
    [_PC_W(4.0, 5.55, 'pc_ult_boss_s7', 0.85, h=1000, rate=1.26, cam=F(1.8, 0.2)),
     _PC_W(5.55, 6.45, 'pc_ult_boss_s7', 2.8, h=1000, rate=0.67, cam=F(1.8, 0.2)),
     _PC_W(6.45, 9.6, 'pc_payback_s7', 0.4, h=1000, rate=0.97, cam=F(1.7, 0.22)),
     _PC_W(9.6, 10.2, 'pc_payback_s7', 3.46, h=1000, rate=0.75, cam=F(1.7, 0.22)),
     _PC_W(10.2, _PC_END, 'pc_payback_s7', 3.9, h=1000, rate=0.4, cam=F(1.7, 0.22), dim=0.82)],
    [{'k': 'cams', 't0': 4.0, 't1': _PC_END, 'layout': 'duo', 'vs': True, 'y': 30,
      'players': [_PC_P('NGH', hit=[4.25, 4.55, 4.85, 5.29], talk=[[6.5, 7.4], [9.45, 10.15]], react=[[5.3, '💀'], [6.85, '😈'], [9.43, '😂']]),
                  _PC_P('bigboss99', hit=[6.83], talk=[[4.0, 4.6], [5.6, 6.4]], react=[[4.15, '😈'], [5.62, '😂'], [6.86, '😱'], [9.45, '💀']])]},
     meme('bro hit me<br>20 times 😐', 4.05, 5.5, y=1420, size=92),
     _PC_CHAT('bigboss99', 'ez 😂', 5.6, 6.45, y=1430),
     meme('...then typed "ez"', 5.62, 6.45, y=1560, size=88),
     meme('ok. my turn 😈', 6.5, 7.95, y=1440, size=92),
     _PC_TAG('NGH', 'METEOR SHOT', '#ffb03d', 8.0, 9.5, y=1440),
     _PC_CHAT('NGH', 'ez', 9.5, 10.15, y=1430),
     meme("who's ez now? 😂", 9.52, 10.15, y=1560, size=88)],
    [['tension', 4.0, 6.45, {}], ['groove', 6.45, 10.2, {'melodyFrom': 8.6}], _PC_OUT],
    [[4.0, 0.6], [5.29, 1.3], [5.5, 0.8], [6.83, 1.0], [7.37, 0.8], [8.6, 1.2], [9.4, 1.5], [10.2, 1.3]],
    nocut=[5.55, 9.6], end=END_CARD_PVP)

# ---------------------------------------------------------------------------------------------------------------
# B18 ONLINE CLUTCH: 1-2, FINAL PUSH (goals x2): kaito_04 punches it off bigboss99, NGH's METEOR SHOT, GOAL x2 -> 3-2,
#   both squads' cams erupt
#   marks: pc_clutch POW 0.63, pass 0.93, cut-in 1.27-1.87, strike 2.5, goal 3.2
EDL['B18'] = body(
    [_PC_W(4.0, 5.3, 'pc_clutch_s7', 0.0, h=1000, cam=_PC_FIX(1.05, 320, 160)),
     _PC_W(5.3, 6.0, 'pc_clutch_s7', 1.3, h=1000, cam=_PC_FIX(1.05, 320, 160)),
     _PC_W(6.0, 7.4, 'pc_clutch_s7', 1.9, h=1000, cam=F(1.6, 0.25)),
     _PC_W(7.4, 10.2, 'pc_clutch_s7', 3.25, h=1000, rate=0.48, cam=_PC_FIX(0.78, 400, 180, drift=0.1)),
     _PC_W(10.2, _PC_END, 'pc_clutch_s7', 4.6, h=1000, rate=0.01, cam=_PC_FIX(0.86, 400, 180), dim=0.82)],
    [_PC_SQ(4.0, _PC_END,
            [_PC_P('NGH', talk=[[5.2, 6.6], [7.3, 10.15]], react=[[5.3, '😈'], [7.32, '🔥'], [8.6, '😭']], hit=[7.32, 7.95, 8.7, 9.5]),
             _PC_P('tuanbeo', talk=[[7.3, 10.15]], react=[[4.1, '😬'], [7.35, '😱'], [8.4, '🥳']], hit=[7.4, 8.15, 9.0, 9.75]),
             _PC_P('kaito_04', talk=[[4.45, 5.0], [7.3, 10.15]], react=[[4.66, '😤'], [7.38, '🔥'], [8.85, '😂']], hit=[7.5, 8.35, 9.2])],
            [_PC_P('zzz_mi', react=[[5.35, '😱'], [7.35, '😭']], talk=[[7.35, 8.2]]),
             _PC_P('bigboss99', hit=[4.63], react=[[4.66, '😡'], [7.4, '💀']]),
             _PC_P('xX_vex_Xx', react=[[7.45, '😡'], [8.9, '😭']], talk=[[8.8, 9.6]])]),
     meme('down 1.<br>final push.', 4.05, 5.25, y=1415, size=92),
     meme('every goal<br>counts x2 👀', 5.35, 7.25, y=1415, size=92),
     _PC_CHAT('kaito_04', 'NO WAYYYY', 7.4, 8.3, y=1450),
     _PC_CHAT('tuanbeo', "WE'RE SO BACK", 8.3, 9.0, y=1450),
     meme('we woke up<br>the neighbours 😭', 9.05, 10.15, y=1415, size=84)],
    [['tension', 4.0, 7.3, {}], ['groove', 7.3, 10.2, {'melodyFrom': 7.3}], _PC_OUT],
    [[4.0, 0.6], [4.63, 0.9], [5.27, 0.8], [6.6, 1.2], [7.3, 1.6], [10.2, 1.3]],
    heart=[[4.0, 5.3]], crowd=[[7.3, 9.6]], end=END_CARD_PVP)

# ---------------------------------------------------------------------------------------------------------------
# B19 THE CARRY: NGH does everything (punch steal + dropkick, dodges the next one, METEOR SHOT into a burning net),
#   tuanbeo and kaito_04 just watch on cam
#   marks: punch_kick punch 0.37, kick 1.17 · gb_dodge windup 0.33, dodge 0.57 · meteor_goal ult 0.37, goal 2.40
EDL['B19'] = body(
    [_PC_W(4.0, 5.55, 'punch_kick_s7', 0.15, cam=F(1.9, 0.16)),
     _PC_W(5.55, 7.0, 'gb_dodge_s7', 0.15, cam=F(1.9, 0.16)),
     _PC_W(7.0, 9.4, 'meteor_goal_s7', 0.25, cam=F(1.7, 0.25)),
     _PC_W(9.4, 10.2, 'meteor_goal_s7', 2.65, cam=F(1.7, 0.25)),
     _PC_W(10.2, _PC_END, 'meteor_goal_s7', 3.45, rate=0.5, cam=F(1.7, 0.25), dim=0.82)],
    [_PC_ROW(4.0, _PC_END,
             [_PC_P('NGH', talk=[[4.1, 5.4], [7.0, 9.3]], react=[[5.05, '😤'], [9.2, '😎']], live=True),
              _PC_P('tuanbeo', talk=[[5.65, 6.4]], react=[[4.5, '🍿'], [7.6, '😴'], [9.25, '👏']]),
              _PC_P('kaito_04', talk=[[6.4, 7.0]], react=[[5.0, '😐'], [8.2, '🍿']])]),
     meme('when 1 friend<br>carries the squad', 4.05, 5.5, y=1490, size=92),
     _PC_CHAT('tuanbeo', 'should we... help?', 5.65, 6.95, y=1500),
     _PC_CHAT('kaito_04', 'nah. just watch 🍿', 6.35, 6.95, y=1590),
     _PC_TAG('NGH', 'METEOR SHOT', '#ffb03d', 7.05, 9.3, y=1500),
     meme('we were just<br>there 🍿', 9.35, 10.15, y=1490, size=92)],
    [['groove', 4.0, 10.2, {'melodyFrom': 7.0}], _PC_OUT],
    [[4.0, 0.6], [4.22, 0.8], [5.02, 1.2], [5.55, 0.6], [6.0, 0.8], [7.0, 0.6], [9.15, 1.5], [10.2, 1.3]], end=END_CARD_PVP)

# ---------------------------------------------------------------------------------------------------------------
# B20 TEAMMATES "HELPING": kaito_04 passes it straight to the enemy (THX! NP! BRO?!), tuanbeo steals NGH's goal on the line
#   (MINE!), then dribbles past everyone... into our own net (GOLAZO!, Own goal!). No teammate-hitting: the game can't do that.
#   marks: sb_bad_pass pass 1.53, thx 1.67, np 2.13, bro 2.73 · sa_tapin shot 0.37, tap 2.33 · sa_wronggoal no 1.47, shot 2.33, goal 2.43
EDL['B20'] = body(
    [_PC_W(4.0, 5.5, 'sb_bad_pass_s7', 0.95, rate=1.43, cam=F(1.75, 0.16)),
     _PC_W(5.5, 6.0, 'sa_tapin_s7', 0.3, cam=F(1.75, 0.18)),
     _PC_W(6.0, 7.0, 'sa_tapin_s7', 1.75, cam=F(1.85, 0.18)),
     _PC_W(7.0, 9.0, 'sa_wronggoal_s7', 0.35, rate=1.13, cam=F(1.75, 0.18)),
     _PC_W(9.0, 10.2, 'sa_wronggoal_s7', 2.61, cam=F(1.75, 0.18)),
     _PC_W(10.2, _PC_END, 'sa_wronggoal_s7', 3.81, rate=0.3, cam=F(1.75, 0.18), dim=0.82)],
    [_PC_ROW(4.0, _PC_END,
             [_PC_P('NGH', talk=[[4.0, 4.4], [5.1, 5.45], [6.6, 7.0], [8.9, 9.6]], react=[[5.25, '😐'], [6.62, '😡'], [8.9, '💀']]),
              _PC_P('tuanbeo', talk=[[6.55, 6.95], [8.86, 9.5]], react=[[6.6, '😎'], [8.88, '🥳']]),
              _PC_P('kaito_04', talk=[[4.45, 4.9]], react=[[4.45, '😇'], [8.95, '😭']])]),
     meme('my teammates<br>"helping":', 4.05, 5.45, y=1490, size=96),
     meme('stole my goal 😐', 5.55, 6.95, y=1520, size=92),
     meme('wrong goal<br>bro 💀', 7.6, 8.95, y=1490, size=96),
     _PC_CHAT('tuanbeo', 'GOLAZO?? 🥳', 9.05, 10.15, y=1730),
     meme('with friends<br>like these 😭', 9.05, 10.15, y=1490, size=92)],
    [['groove', 4.0, 10.2, {'melodyFrom': 7.0}], _PC_OUT],
    [[4.0, 0.6], [4.41, 0.8], [5.24, 0.8], [5.5, 0.6], [6.58, 1.2], [7.0, 0.6], [8.85, 1.3], [10.2, 1.3]],
    nocut=[6.0], end=END_CARD_PVP)

# ---------------------------------------------------------------------------------------------------------------
# B21 BEST PLAYS OF THE NIGHT: #5 kaito_04 scissor kick · #4 zzz_mi Aura Farming dodge + finish · #3 tuanbeo TITAN bowling ·
#   #2 bigboss99 HUNDRED FISTS (20 HIT) · #1 NGH off five walls. Each with that player's cam.
#   marks: sc_bicycle jump 1.13, strike 1.53, goal 1.83 · pc_ult_zzz dodge 1.07, shot 2.1, goal 2.37 · pc_ult_tuan BONK 1.5-1.95 ·
#          pc_ult_boss finisher 2.47 · sb_trick_shot shot 0.53, walls 0.8-2.83, goal 3.13
_B21 = [('kaito_04', '#5', '#7fe7ff', '😎'), ('zzz_mi', '#4', '#ff3fb4', '😇'), ('tuanbeo', '#3', '#ff9a3d', '😤'),
        ('bigboss99', '#2', '#ff3d5a', '😈'), ('NGH', '#1', '#ffe14f', '🔥')]
_B21_T = [4.0, 5.2, 6.45, 7.65, 8.85, 10.2]
EDL['B21'] = body(
    [_PC_W(4.0, 5.2, 'sc_bicycle_s7', 0.75, cam=F(1.8, 0.18)),
     _PC_W(5.2, 6.45, 'pc_ult_zzz_s7', 1.0, rate=1.16, cam=F(1.7, 0.2)),
     _PC_W(6.45, 7.65, 'pc_ult_tuan_s7', 1.35, cam=F(1.6, 0.2)),
     _PC_W(7.65, 8.85, 'pc_ult_boss_s7', 1.6, rate=1.04, cam=F(1.9, 0.2)),
     _PC_W(8.85, 10.2, 'sb_trick_shot_s7', 0.72, h=920, rate=1.83, cam=F(0.86, 0.12)),
     _PC_W(10.2, _PC_END, 'sb_trick_shot_s7', 3.2, h=920, rate=0.5, cam=F(0.86, 0.12), dim=0.82)],
    [_PC_ONE(_B21_T[i], _B21_T[i + 1], _PC_P(h, talk=[[_B21_T[i] + 0.05, _B21_T[i + 1] - 0.05]], react=[[_B21_T[i + 1] - 0.55, e]], live=True))
     for i, (h, n, c, e) in enumerate(_B21)]
    + [_PC_TAG('PLAY ' + n, h, c, _B21_T[i] + 0.04, _B21_T[i + 1] - 0.03 if i < 4 else 10.15) for i, (h, n, c, e) in enumerate(_B21)]
    + [meme('best plays<br>of the night 🏆', 4.05, 5.15, y=1640, size=88),
       _PC_CHAT('zzz_mi', 'gg 🫡', 9.75, 10.15, y=1660)],
    [['groove', 4.0, 10.2, {'melodyFrom': 7.65}], _PC_OUT],
    [[4.0, 0.7], [4.53, 1.0], [5.2, 0.6], [6.37, 1.2], [6.45, 0.6], [6.95, 1.0], [7.65, 0.6], [8.48, 1.3], [8.85, 0.6], [10.15, 1.4]], end=END_CARD_PVP)
