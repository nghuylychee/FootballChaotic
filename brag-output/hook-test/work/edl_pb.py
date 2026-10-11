# batch pb: PvP hooks P26-P50 (0 -> 4.0 each, phook(); edl_zz_combo.py pairs P<n>h with body B<12 + (n-1) % 20>).
# exec'd by edl.py with seg / meme / F / phook / SPLIT / EDL in scope. Every helper here is _PB-prefixed (shared namespace).
# Takes: frames/pb_<scene>_s7 (scenes_pb.js), all online-style 3v3, every player named + dressed as his cam's handle, real
# mechanics only (no friendly fire, no scripted physics; keeper SAVE / PARRY / SLIP rolls picked like a seed).
# Squads: Us = Street Kings (red): NGH, tuanbeo, kaito_04 · Rivals = Neon Strikers (pink): zzz_mi, bigboss99, xX_vex_Xx ·
# Randoms 1 = Cyber United (blue): mochi, DUKE, panda.exe (P30 only).
# Signature ultimates (coordinator's table): NGH Meteor Shot · tuanbeo Titan · kaito_04 Lightning Dash · zzz_mi Aura Farming ·
# bigboss99 Hundred Fists · xX_vex_Xx Meteor Drop · mochi Clone Army.
#
# Layout (1080x1920): cams on screen from frame 0 (t0 = -1: no slide-in on the thumbnail) at the top (duo / row / one big cam)
# or top + bottom (squads); the game in a window (layout='fit', h=1240 -> y 280-1520); captions over the top of the window;
# chat lines in the band under it. Window h=1240 -> y 280-1520 (the cams overlap its top edge).

_PB_END = SPLIT
_PB_H = 1240


def _PB_W(v0, v1, take, c0, cam=None, rate=None, **kw):
    """a game segment in the window"""
    return seg(v0, v1, take, c0, rate=rate, cam=cam or F(1.5, 0.2, dy=-20), layout='fit', h=_PB_H, **kw)


def _PB_FZ(z, fx, fy, **kw):
    return dict(z=z, fx=fx, fy=fy, **kw)


def _PB_P(h, talk=(), react=(), hit=(), dead=None, **kw):
    d = {'h': h, 'talk': [list(x) for x in talk], 'react': [list(x) for x in react], 'hit': list(hit)}
    if dead is not None: d['dead'] = dead
    d.update(kw)
    return d


def _PB_DUO(a, b, vs=True, y=24):
    return {'k': 'cams', 't0': -1, 't1': _PB_END, 'layout': 'duo', 'vs': vs, 'y': y, 'players': [a, b]}


def _PB_ROW(players, y=30):
    return {'k': 'cams', 't0': -1, 't1': _PB_END, 'layout': 'row', 'y': y, 'players': players}


def _PB_SQ(us, them, y=30, y2=1645):
    return {'k': 'cams', 't0': -1, 't1': _PB_END, 'layout': 'squads', 'y': y, 'y2': y2,
            'players': [dict(p, side=0) for p in us] + [dict(p, side=1) for p in them]}


def _PB_ONE(p, x=250, y=24, w=580, h2=330):
    return {'k': 'cams', 't0': -1, 't1': _PB_END, 'layout': 'corner', 'players': [dict(p, x=x, y=y, w=w, h2=h2)]}


_PB_C1, _PB_C2 = 1545, 1638        # chat rows under the window


def _PB_CHAT(h, s, t0, t1=_PB_END, y=_PB_C1):
    return {'k': 'chat', 'h': h, 's': s, 't0': t0, 't1': t1, 'y': y}


def _PB_M(s, t0, t1=_PB_END, y=378, size=92, pop=True):
    return meme(s, t0, t1, y=y, size=size, pop=pop)


# ---------------------------------------------------------------------------------------------------------------
# P26 THE REMATCH: we won 5-0, bigboss99 wants a rematch; NGH showboats by the wall... bigboss99's HUNDRED FISTS: 20 punches,
#   slammed into the wall (freeze). pb_fists: cut-in 0.8, punches 1.4-2.6, blast 2.73, wall 2.97  (v = take - 0.25 to the freeze)
EDL['P26h'] = phook(
    [_PB_W(0, 2.72, 'pb_fists_s7', 0.25, cam=F(1.55, 0.2, dy=-12)),
     _PB_W(2.72, 2.95, 'pb_fists_s7', 2.97, rate=0, cam=_PB_FZ(1.8, 'focus', 'focus')),
     _PB_W(2.95, _PB_END, 'pb_fists_s7', 2.97, cam=F(1.55, 0.2, dy=-12))],
    [_PB_DUO(_PB_P('NGH', label='NGH (me)', talk=[[0, 0.5]], react=[[0.6, '😳'], [2.75, '💀']], hit=[1.15, 1.45, 1.75, 2.05, 2.35, 2.48, 2.72], dead=2.75),
             _PB_P('bigboss99', talk=[[0.05, 0.85], [3.0, 3.8]], react=[[0.55, '😈'], [3.0, '😂']])),
     _PB_M('we won 5-0.<br>he wants a rematch', 0, 1.25, size=84, pop=False),
     _PB_M("should've<br>said no 💀", 2.78, size=100),
     _PB_CHAT('bigboss99', 'rematch? 🙂', -0.5, 1.6),
     _PB_CHAT('NGH', 'ok nvm GG 😭', 3.05)],
    [['tension', 0, 0.55, {}], ['groove', 0.55, _PB_END, {}]],
    [[0.55, 1.0], [2.48, 1.3], [2.72, 1.6]],
    mute=[[2.72, 2.95]], nocut=[2.72, 2.95])

# P27 THE DUO SIGNAL: "NOW" -> tuanbeo slides it to NGH, one touch, METEOR SHOT, the net catches fire.
#   pb_duo: pass 0.43, recv 0.77, cut-in 0.9, leap 1.5, strike 2.13, goal 2.87  (v = take - 0.15)
EDL['P27h'] = phook(
    [_PB_W(0, _PB_END, 'pb_duo_s7', 0.15, cam=F(1.4, 0.18, dy=-25))],
    [_PB_DUO(_PB_P('NGH', label='NGH (me)', talk=[[0.62, 1.0], [2.75, 3.6]], react=[[0.75, '😤'], [2.75, '🔥']]),
             _PB_P('tuanbeo', talk=[[0.1, 0.5], [2.8, 3.8]], react=[[2.8, '🥳']]), vs=False),
     _PB_M('me + my duo<br>have a signal', 0, 1.3, size=96, pop=False),
     _PB_M('works every<br>time 😌', 2.78, size=96),
     _PB_CHAT('tuanbeo', 'NOW', 0.12, 1.4),
     _PB_CHAT('NGH', 'NOW', 0.62, 1.4, y=_PB_C2)],
    [['tension', 0, 0.75, {}], ['groove', 0.75, _PB_END, {}]],
    [[0.75, 1.0], [1.98, 1.0], [2.72, 1.5]])

# P28 THE BOMB PASS: tuanbeo carries the bomb ball through the countdown, passes it to kaito_04 on "1"... KABOOM.
#   (Bomb Ball's blast hits everyone near it, teammates too: the game's own rule.) pb_bomb: "2" ~1.0, "1" ~2.0, pass 2.07,
#   recv 2.27, boom 3.0  (v = take - 0.95)
EDL['P28h'] = phook(
    [_PB_W(0, _PB_END, 'pb_bomb_s7', 0.95, cam=F(1.6, 0.2, dy=-22))],
    [_PB_DUO(_PB_P('tuanbeo', react=[[1.12, '😈'], [2.9, '😂']], talk=[[2.95, 3.8]]),
             _PB_P('kaito_04', label='kaito_04 (me)', react=[[1.35, '😨'], [2.08, '💀']], hit=[2.05], dead=2.08, talk=[[2.3, 2.9]]), vs=False),
     _PB_M('when your teammate<br>passes you the bomb', 0, 1.1, size=82, pop=False),
     _PB_M('with 1 second left', 1.15, 2.0, size=84),
     _PB_M('thanks bro 💀', 2.15, size=100),
     _PB_CHAT('kaito_04', 'WHY 😭', 2.3),
     _PB_CHAT('tuanbeo', 'my bad 😇', 2.95, y=_PB_C2)],
    [['tension', 0, 2.05, {}], ['groove', 2.05, _PB_END, {}]],
    [[1.12, 0.8], [2.05, 1.6]], heart=[[0, 2.0]])

# P29 NO FIXED KEEPER: street 3v3, whoever stands in the box keeps. tuanbeo + kaito_04 both step out arguing who goes in goal...
#   bigboss99 rolls it into the empty net. pb_nokeeper: shot 1.5, goal 2.0
EDL['P29h'] = phook(
    [_PB_W(0, _PB_END, 'pb_nokeeper_s7', 0.0, cam=F(1.45, 0.2, dy=-22))],
    [_PB_ROW([_PB_P('tuanbeo', talk=[[0.1, 0.7], [1.2, 1.5]], react=[[2.05, '💀']]),
              _PB_P('kaito_04', talk=[[0.7, 1.2]], react=[[2.1, '🤦']]),
              _PB_P('bigboss99', react=[[1.45, '😏'], [2.05, '😂']], talk=[[2.1, 2.8]])]),
     _PB_M('street 3v3:<br>no fixed keeper', 0, 1.5, size=94, pop=False),
     _PB_M('so nobody<br>went in goal 💀', 2.05, size=94),
     _PB_CHAT('tuanbeo', 'you go in goal', -0.5, 2.0),
     _PB_CHAT('kaito_04', 'no YOU go', 0.7, 2.0, y=_PB_C2),
     _PB_CHAT('bigboss99', 'thanks 🙏', 2.15)],
    [['calm', 0, 1.5, {}], ['groove', 1.5, _PB_END, {}]],
    [[1.5, 0.7], [2.0, 1.4]])

# P30 THE ULTIMATE REVEAL: matched vs Cyber United; their quiet one (mochi) never used his ultimate... CLONE ARMY: four fakes,
#   each of us chases a different one, he walks it in. pb_clones: cut-in 0.5, fakes out 1.1, shot 2.4, goal 2.67
EDL['P30h'] = phook(
    [_PB_W(0, _PB_END, 'pb_clones_s7', 0.0, cam=F(1.35, 0.2, dy=-20))],
    [_PB_SQ([_PB_P('NGH', react=[[2.0, '😵‍💫'], [2.72, '💀']], talk=[[1.4, 2.0]]),
             _PB_P('tuanbeo', react=[[1.3, '😵'], [2.75, '😭']], talk=[[1.2, 1.7]]),
             _PB_P('kaito_04', react=[[1.25, '🤯'], [2.8, '🫠']])],
            [_PB_P('DUKE', react=[[2.75, '😂']]),
             _PB_P('mochi', talk=[[2.8, 3.6]], react=[[0.5, '😈'], [2.72, '😎']]),
             _PB_P('panda.exe', react=[[2.78, '🔥']])]),
     _PB_M("he hadn't used<br>his ultimate yet", 0, 1.1, size=88, pop=False),
     _PB_M('which one<br>was real?? 😭', 2.7, size=96),
     _PB_CHAT('tuanbeo', 'WHICH ONE IS HIM', 1.2, 2.6),
     _PB_CHAT('mochi', 'all of them 🙂', 2.8)],
    [['tension', 0, 0.5, {}], ['groove', 0.5, _PB_END, {}]],
    [[0.5, 1.0], [1.1, 0.7], [2.67, 1.4]])

# P31 THE RESULTS SCREEN: last second of a 5-0, the whistle, the game's own results screen (room match: VICTORY, both squads'
#   builds), the squad screenshots it. pb_results: whistle 0.57, results ~1.47
EDL['P31h'] = phook(
    [_PB_W(0, 1.45, 'pb_results_s7', 0.0, cam=F(1.35, 0.15, dy=-10)),
     _PB_W(1.45, _PB_END, 'pb_results_s7', 1.45, cam=_PB_FZ(1.05, 320, 128, drift=0.06))],
    [_PB_SQ([_PB_P('NGH', label='NGH (me)', talk=[[1.55, 2.2], [3.0, 3.7]], react=[[1.5, '😎']]),
             _PB_P('tuanbeo', talk=[[2.2, 2.8]], react=[[1.55, '🥳']]),
             _PB_P('kaito_04', react=[[1.6, '😂'], [3.0, '📸']])],
            [_PB_P('zzz_mi', react=[[1.65, '😑']]),
             _PB_P('bigboss99', react=[[1.55, '😭']], talk=[[2.2, 2.9]]),
             _PB_P('xX_vex_Xx', react=[[1.6, '💀']])]),
     _PB_M('POV: the results<br>screen loads', 0, 1.45, size=94, pop=False),
     _PB_M('screenshot it 📸', 1.6, size=92, y=1230),
     _PB_CHAT('bigboss99', 'rematch.', 2.2, 3.0),
     _PB_CHAT('NGH', '📸📸📸', 3.0)],
    [['tension', 0, 0.57, {}], ['groove', 0.57, _PB_END, {}]],
    [[0.57, 0.9], [1.45, 1.3]], nocut=[1.45])

# P32 "GG" vs "GG EZ": zzz_mi typed gg, bigboss99 typed gg ez... all three of us dropkick him at once (zzz_mi untouched).
#   Only one boot can land (the game's stun rule): one SMASH, two MISS. pb_ggez: windups 0.93, boots 1.23
EDL['P32h'] = phook(
    [_PB_W(0, 1.0, 'pb_ggez_s7', 0.1, cam=F(1.6, 0.2, dy=-22)),
     _PB_W(1.0, 1.6, 'pb_ggez_s7', 1.1, rate=0.5, cam=F(1.75, 0.2, dy=-18)),
     _PB_W(1.6, _PB_END, 'pb_ggez_s7', 1.4, cam=F(1.5, 0.2, dy=-22))],
    [_PB_DUO(_PB_P('zzz_mi', react=[[0.15, '😇'], [1.35, '😳']]),
             _PB_P('bigboss99', react=[[0.15, '😏'], [1.32, '💀']], hit=[1.27], dead=1.3), vs=False),
     _PB_M('"gg" vs "gg ez"', 0, 1.05, size=104, pop=False),
     _PB_M('the whole squad<br>replied 💀', 1.7, size=92),
     _PB_CHAT('zzz_mi', 'gg wp 🤝', -0.5),
     _PB_CHAT('bigboss99', 'gg ez', -0.5, y=_PB_C2)],
    [['tension', 0, 0.83, {}], ['groove', 0.83, _PB_END, {}]],
    [[0.83, 0.7], [1.27, 1.5]], nocut=[1.0, 1.6])

# P33 THE SILENT CARRY: NGH and tuanbeo never stop talking, kaito_04's mic is off... LIGHTNING DASH through two of them, goal,
#   then his only word. pb_carry: cut-in 0.57, dash 1.2, shot 1.4, goal 1.67
EDL['P33h'] = phook(
    [_PB_W(0, _PB_END, 'pb_carry_s7', 0.0, cam=F(1.4, 0.2, dy=-22))],
    [_PB_ROW([_PB_P('NGH', talk=[[0, 0.55], [0.95, 1.35], [1.75, 2.6]], react=[[1.75, '😱']]),
              _PB_P('tuanbeo', talk=[[0.5, 0.95], [1.35, 1.75], [2.6, 3.4]], react=[[1.8, '🤯']]),
              _PB_P('kaito_04', label='kaito_04 🔇', react=[[3.3, '😐']])]),
     _PB_M('the friend who<br>never talks', 0, 1.55, size=96, pop=False),
     _PB_M('he just carries', 1.8, size=92),
     _PB_CHAT('NGH', 'BRO??', 1.8),
     _PB_CHAT('tuanbeo', 'SAY SOMETHING 😭', 2.6, y=_PB_C2),
     _PB_CHAT('kaito_04', 'gg', 3.35, y=_PB_C2 + 93)],
    [['calm', 0, 0.57, {}], ['groove', 0.57, _PB_END, {}]],
    [[0.57, 0.9], [1.2, 1.3], [1.67, 1.4]])

# P34 THE FRIEND WHO LAUGHS AT EVERYTHING: tuanbeo gets dropkicked, kaito_04 just stands there laughing... zzz_mi dropkicks him.
#   pb_laugh: windup 0.63, tuanbeo hit 0.97, windup 1.53, kaito hit 1.87  (v = take - 0.2)
EDL['P34h'] = phook(
    [_PB_W(0, _PB_END, 'pb_laugh_s7', 0.2, cam=F(1.6, 0.2, dy=-25))],
    [_PB_DUO(_PB_P('tuanbeo', hit=[0.77], react=[[0.82, '💀'], [1.75, '😂']], talk=[[2.0, 3.0]]),
             _PB_P('kaito_04', talk=[[0.85, 1.6], [3.0, 3.7]], react=[[0.85, '😂'], [1.72, '💀']], hit=[1.67], dead=1.7), vs=False),
     _PB_M('the friend who<br>laughs at you', 0, 1.6, size=94, pop=False),
     _PB_M('instant karma', 1.75, size=100),
     _PB_CHAT('kaito_04', '😂😂😂😂', 0.85, 1.65),
     _PB_CHAT('tuanbeo', '😂😂😂😂', 1.95),
     _PB_CHAT('kaito_04', 'not funny', 3.0, y=_PB_C2)],
    [['groove', 0, _PB_END, {}]],
    [[0.77, 1.2], [1.67, 1.5]])

# P35 THE PARTY INVITE: the friend who "doesn't play games" asks what X does (X = ultimate)... TITAN, bowls all three over.
#   pb_titan: cut-in 0.4, grows 1.0, charges 1.43, BONK 1.9 / 2.2
EDL['P35h'] = phook(
    [_PB_W(0, _PB_END, 'pb_titan_s7', 0.0, cam=F(1.4, 0.2, dy=-25))],
    [_PB_ROW([_PB_P('NGH', label='NGH (me)', react=[[1.0, '😳'], [2.25, '🤯']], talk=[[2.3, 3.0]]),
              _PB_P('tuanbeo', label='tuanbeo (new)', talk=[[0.05, 0.45]], react=[[3.0, '😇']]),
              _PB_P('kaito_04', react=[[1.95, '😱']], talk=[[3.0, 3.6]])]),
     _PB_M('invited my friend who<br>"doesn\'t play games"', 0, 1.4, size=76, pop=False),
     _PB_M('he plays games.', 2.0, size=96),
     _PB_CHAT('tuanbeo', 'what does X do', -0.5, 1.4),
     _PB_CHAT('NGH', 'BRO WHAT', 2.3)],
    [['calm', 0, 0.4, {}], ['groove', 0.4, _PB_END, {}]],
    [[0.4, 1.0], [1.0, 0.8], [1.9, 1.3], [2.2, 1.0]])

# P36 THE PRIVATE ROOM: the code goes in the group chat, six of us on the centre spot, the whistle... nobody touches the ball.
#   pb_brawl: whistle 0.87, boots / punches 1.2-1.3, landings 1.8
EDL['P36h'] = phook(
    [_PB_W(0, 1.85, 'pb_brawl_s7', 0.0, cam=F(1.45, 0.2, dy=-22)),
     _PB_W(1.85, _PB_END, 'pb_brawl_s7', 1.85, cam=_PB_FZ(1.15, 228, 205, drift=-0.05))],
    [_PB_SQ([_PB_P('NGH', label='NGH (me)', talk=[[0, 0.8]], hit=[1.22], react=[[1.4, '😵']]),
             _PB_P('tuanbeo', talk=[[1.0, 1.6], [2.2, 3.0]], hit=[1.85], react=[[2.1, '😂']]),
             _PB_P('kaito_04', talk=[[1.1, 1.7]], hit=[1.24], react=[[1.45, '😡']])],
            [_PB_P('zzz_mi', hit=[1.22], react=[[1.4, '💀']], talk=[[1.5, 2.2]]),
             _PB_P('bigboss99', talk=[[0.95, 1.5]], react=[[1.0, '😈'], [2.0, '🤣']], hit=[1.83]),
             _PB_P('xX_vex_Xx', hit=[1.3], react=[[1.5, '😤']], talk=[[1.6, 2.4]])]),
     _PB_M('private room<br>with the boys', 0, 0.95, size=96, pop=False),
     _PB_M('0 football<br>was played', 1.9, size=100),
     _PB_CHAT('NGH', 'room code: 7KQX4RM', -0.5, 1.0),
     _PB_CHAT('tuanbeo', 'AGAIN 😂', 2.2)],
    [['tension', 0, 0.87, {}], ['groove', 0.87, _PB_END, {}]],
    [[0.87, 0.6], [1.2, 1.4], [1.83, 0.9]])

# P37 3 FRIENDS, 1 BRAIN CELL: one-touch triangle NGH -> tuanbeo -> kaito_04 -> NGH past all three of them, goal. The brain
#   cell (🧠) hops cam to cam with the ball. pb_tiki: passes 0.37 / 0.97 / 1.67, shot 2.1, goal 2.37  (v = take - 0.15)
EDL['P37h'] = phook(
    [_PB_W(0, _PB_END, 'pb_tiki_s7', 0.15, cam=F(1.35, 0.2, dy=-22))],
    [_PB_ROW([_PB_P('NGH', talk=[[0, 0.25], [1.5, 1.95], [2.25, 3.2]], react=[[0, '🧠'], [1.52, '🧠'], [2.25, '🥳']], emHold=0.6),
              _PB_P('tuanbeo', talk=[[0.25, 0.85], [2.3, 3.3]], react=[[0.58, '🧠'], [2.3, '🔥']], emHold=0.6),
              _PB_P('kaito_04', talk=[[0.85, 1.5], [2.35, 3.0]], react=[[1.25, '🧠'], [2.35, '😎']], emHold=0.6)]),
     _PB_M('3 friends.<br>1 brain cell.', 0, 1.8, size=100, pop=False),
     _PB_M('it was enough 🧠', 2.3, size=90)],
    [['groove', 0, _PB_END, {}]],
    [[0.22, 0.5], [0.82, 0.5], [1.52, 0.5], [2.22, 1.4]])

# P38 RANKED NERVES: open net, NGH freezes (two baby steps, a look back)... xX_vex_Xx dropkicks him from behind.
#   pb_nerves: windup 1.13, boot 1.47  (v = take - 0.1)
EDL['P38h'] = phook(
    [_PB_W(0, 1.37, 'pb_nerves_s7', 0.1, cam=F(1.55, 0.18, dy=-25)),
     _PB_W(1.37, 1.6, 'pb_nerves_s7', 1.47, rate=0, cam=_PB_FZ(1.85, 'focus', 'focus')),
     _PB_W(1.6, _PB_END, 'pb_nerves_s7', 1.47, cam=F(1.55, 0.18, dy=-25))],
    [_PB_ONE(_PB_P('NGH', label='NGH (me) · RANKED', live=True, react=[[0.2, '😰'], [0.9, '😬'], [1.62, '💀']], hit=[1.37], dead=1.62, py=10)),
     _PB_M('ranked. open net.<br>no pressure.', 0, 1.35, size=86, pop=False),
     _PB_M('pressure.', 1.65, size=120),
     _PB_CHAT('tuanbeo', 'SHOOT', 0.45, 1.37),
     _PB_CHAT('kaito_04', 'SHOOOOOT', 0.8, 1.37, y=_PB_C2),
     _PB_CHAT('tuanbeo', 'bro 💀', 1.9)],
    [['tension', 0, 1.37, {}], ['groove', 1.6, _PB_END, {}]],
    [[1.37, 1.6]], mute=[[1.37, 1.6]], heart=[[0, 1.37]], nocut=[1.37, 1.6])

# P39 LAST-SECOND OWN GOAL x2: FINAL PUSH, 2-2, bigboss99 crosses to the far post, tuanbeo steps in to clear it facing his own
#   goal... his boot puts it in: GOAL x2, Own goal. pb_own2: windup 0.5, cross 0.53, boot 0.8, goal 1.33  (slow-mo take 0.6-0.95)
EDL['P39h'] = phook(
    [_PB_W(0, 0.6, 'pb_own2_s7', 0.0, cam=F(1.4, 0.2, dy=-18)),
     _PB_W(0.6, 1.3, 'pb_own2_s7', 0.6, rate=0.5, cam=F(1.6, 0.25, dy=-15)),
     _PB_W(1.3, 1.62, 'pb_own2_s7', 0.95, cam=F(1.45, 0.2, dy=-15)),
     _PB_W(1.62, _PB_END, 'pb_own2_s7', 1.27, cam=_PB_FZ(0.95, 240, 175))],
    [_PB_SQ([_PB_P('NGH', label='NGH (me)', react=[[1.75, '😭']]),
             _PB_P('tuanbeo', talk=[[0.2, 0.95]], react=[[1.1, '😨'], [1.75, '💀']]),
             _PB_P('kaito_04', react=[[1.8, '🤦']])],
            [_PB_P('zzz_mi', react=[[1.8, '😂']]),
             _PB_P('bigboss99', react=[[1.7, '😂']], talk=[[1.8, 2.6]]),
             _PB_P('xX_vex_Xx', react=[[1.85, '🤣']])]),
     _PB_M('final push:<br>goals count x2', 0, 1.15, size=92, pop=False),
     _PB_M('own goals<br>too 💀', 1.7, size=100, y=1160),
     _PB_CHAT('tuanbeo', 'I GOT IT I GOT IT', 0.2, 1.6),
     _PB_CHAT('kaito_04', 'HOW 😭', 1.9)],
    [['tension', 0, 1.0, {}], ['groove', 1.45, _PB_END, {}]],
    [[1.0, 0.8], [1.45, 1.5]],
    mute=[[1.0, 1.45]], nocut=[0.6, 1.3, 1.62], heart=[[0, 1.0]])

# P40 6 PLAYERS, 1 BALL: a pile-up of punches in front of goal; NGH's boot at bigboss99 meets the loose ball first, it trundles
#   in on its own while the other four keep brawling. pb_pileup: boot 0.4, punches 0.7 / 0.8 / 1.13, boots 1.5 / 1.8, goal 1.9
EDL['P40h'] = phook(
    [_PB_W(0, _PB_END, 'pb_pileup_s7', 0.0, cam=_PB_FZ(1.25, 478, 206))],
    [_PB_SQ([_PB_P('NGH', label='NGH (me)', talk=[[0, 1.9]], hit=[1.5], react=[[2.0, '🤨']]),
             _PB_P('tuanbeo', talk=[[0.3, 1.9]], hit=[0.8, 1.8], react=[[2.05, '😳']]),
             _PB_P('kaito_04', talk=[[0.5, 1.9]], hit=[1.13], react=[[1.2, '😡'], [2.1, '🥳']])],
            [_PB_P('zzz_mi', talk=[[0.4, 1.9]], hit=[0.7], react=[[2.1, '😭']]),
             _PB_P('bigboss99', talk=[[0, 0.4]], hit=[0.4], react=[[0.5, '😵'], [2.0, '💀']]),
             _PB_P('xX_vex_Xx', talk=[[0.6, 1.9]], hit=[1.13], react=[[2.05, '😱']])]),
     _PB_M('6 players.<br>1 ball.', 0, 0.95, size=104, pop=False),
     _PB_M('the ball:', 1.0, 1.9, size=100),
     _PB_M('nobody<br>noticed 💀', 2.0, size=100),
     _PB_CHAT('NGH', 'wait who scored', 2.3)],
    [['pulse', 0, 1.9, {}], ['groove', 1.9, _PB_END, {}]],
    [[0.4, 1.0], [1.5, 0.7], [1.9, 1.4]])

# P41 3AM: "last game, I promise"... bigboss99 kicks off with a THUNDER KICK from the centre spot, it zaps through NGH and the
#   keeper slips: 0-1 in a second. pb_3am: whistle 0.5, strike 0.87, zap 0.9, goal 1.43
EDL['P41h'] = phook(
    [_PB_W(0, _PB_END, 'pb_3am_s7', 0.0, cam=F(1.3, 0.22, dy=-20))],
    [_PB_ROW([_PB_P('NGH', label='NGH (me)', hit=[0.9], react=[[0.95, '😵'], [1.5, '💀']], talk=[[2.3, 3.0]]),
              _PB_P('tuanbeo', talk=[[0, 0.8]], react=[[1.5, '🫠']]),
              _PB_P('kaito_04', react=[[1.45, '😭']])]),
     _PB_M('3am with<br>the boys', 0, 1.35, size=100, pop=False),
     _PB_M('conceded in<br>1 second 💀', 1.5, size=94),
     _PB_CHAT('tuanbeo', 'last game I promise', -0.5, 1.45),
     _PB_CHAT('NGH', 'ok ONE more', 2.3)],
    [['calm', 0, 0.5, {}], ['groove', 0.5, _PB_END, {}]],
    [[0.5, 0.6], [0.87, 1.2], [1.43, 1.4]])

# P42 THE FRIEND IN GOAL: bigboss99 runs at goal, kaito_04 rushes out of the box at the MAN; the shot goes past him, his
#   dropkick sends bigboss99 flying... the ball is already in. pb_keeper_dk: shot 0.47, windup 0.5, boot 0.8, goal 0.8
EDL['P42h'] = phook(
    [_PB_W(0, 0.35, 'pb_keeper_dk_s7', 0.0, cam=_PB_FZ(1.45, 150, 200)),
     _PB_W(0.35, 1.55, 'pb_keeper_dk_s7', 0.35, rate=0.5, cam=_PB_FZ(1.6, 140, 198)),
     _PB_W(1.55, _PB_END, 'pb_keeper_dk_s7', 0.95, cam=_PB_FZ(1.35, 160, 196))],
    [_PB_DUO(_PB_P('kaito_04', talk=[[0.1, 0.9]], react=[[1.3, '😎'], [2.0, '😳']]),
             _PB_P('bigboss99', hit=[1.25], react=[[1.3, '💀'], [2.2, '😂']], talk=[[2.3, 3.2]])),
     _PB_M('when your friend<br>plays keeper', 0, 1.2, size=94, pop=False),
     _PB_M('he got the man.<br>not the ball.', 1.65, size=88),
     _PB_CHAT('kaito_04', 'I GOT HIM', 0.1, 1.6),
     _PB_CHAT('NGH', 'KAITO THE BALL 😭', 1.75)],
    [['tension', 0, 0.6, {}], ['groove', 1.25, _PB_END, {}]],
    [[0.6, 0.7], [1.25, 1.5]], nocut=[0.35, 1.55])

# P43 DUO COMBO: tuanbeo's BLACK HOLE SHOT drags two of them together on its way in, NGH's GROUND SLAM lands on the pair.
#   pb_bh: shot 0.43, windup 0.77, goal 1.0, slam lands 1.53
EDL['P43h'] = phook(
    [_PB_W(0, _PB_END, 'pb_bh_s7', 0.0, cam=_PB_FZ(1.3, 420, 200))],
    [_PB_SQ([_PB_P('NGH', label='NGH (me)', talk=[[0.5, 1.0], [1.7, 2.5]], react=[[1.6, '😤']]),
             _PB_P('tuanbeo', talk=[[0, 0.5], [2.5, 3.2]], react=[[1.05, '🕳️']]),
             _PB_P('kaito_04', react=[[1.6, '🔥']])],
            [_PB_P('zzz_mi', hit=[1.53], react=[[0.6, '😵'], [1.6, '💀']], dead=1.6),
             _PB_P('bigboss99', react=[[1.05, '😭']]),
             _PB_P('xX_vex_Xx', hit=[1.53], react=[[0.65, '😵‍💫'], [1.62, '💀']], dead=1.62)]),
     _PB_M('duo combo:<br>he groups them...', 0, 1.45, size=90, pop=False),
     _PB_M('...I slam them 💥', 1.55, size=92),
     _PB_CHAT('tuanbeo', 'grouped 🕳️', 0.45, 1.5),
     _PB_CHAT('NGH', 'say less', 1.5)],
    [['tension', 0, 0.43, {}], ['groove', 0.43, _PB_END, {}]],
    [[0.43, 1.0], [1.0, 1.2], [1.53, 1.5]])

# P44 AFK IN THE BOX: kaito_04 went AFK standing in our box (street 3v3: whoever's in the box keeps), bigboss99 smashes it
#   straight at him... SAVE. pb_afk: shot 0.77, save 0.97
EDL['P44h'] = phook(
    [_PB_W(0, 0.7, 'pb_afk_s7', 0.0, cam=_PB_FZ(1.45, 150, 200)),
     _PB_W(0.7, 1.3, 'pb_afk_s7', 0.7, rate=0.5, cam=_PB_FZ(1.6, 130, 200)),
     _PB_W(1.3, _PB_END, 'pb_afk_s7', 1.0, cam=_PB_FZ(1.45, 140, 200))],
    [_PB_DUO(_PB_P('kaito_04', label='kaito_04 · AFK', dead=-1, react=[[1.0, '🧤']]),
             _PB_P('bigboss99', talk=[[0.2, 0.8]], react=[[1.05, '😡']])),
     _PB_M('our keeper<br>went AFK', 0, 1.0, size=100, pop=False),
     _PB_M('best save<br>of the match 🧤', 1.15, size=92),
     _PB_CHAT('kaito_04', 'brb food 🍜', -0.5, 1.1),
     _PB_CHAT('NGH', 'KAITO???', 1.2),
     _PB_CHAT('kaito_04', 'what did i miss', 2.6, y=_PB_C2)],
    [['calm', 0, 0.84, {}], ['groove', 1.1, _PB_END, {}]],
    [[0.84, 1.4]], mute=[[0.84, 1.1]], nocut=[0.7, 1.3])

# P45 "I GOT HIM": NGH flies in with a dropkick, xX_vex_Xx dodges at the last frame (PERFECT DODGE: the pitch slows down),
#   NGH kicks thin air. pb_whiff: windup 0.67, dodge 0.93, boot 0.97 (MISS)
EDL['P45h'] = phook(
    [_PB_W(0, _PB_END, 'pb_whiff_s7', 0.0, cam=F(1.75, 0.2, dy=-22))],
    [_PB_DUO(_PB_P('NGH', label='NGH (me)', talk=[[0, 0.9]], react=[[0.55, '😤'], [1.35, '😐']]),
             _PB_P('xX_vex_Xx', react=[[0.95, '😏']], talk=[[1.9, 2.6]])),
     _PB_M('"I got him"', 0, 0.95, size=110, pop=False),
     _PB_M('he did not<br>have him', 1.15, size=100),
     _PB_CHAT('NGH', 'I GOT HIM I GOT HIM', -0.5, 1.1),
     _PB_CHAT('xX_vex_Xx', 'too slow 🥱', 1.9)],
    [['tension', 0, 0.93, {}], ['calm', 0.93, 2.3, {}], ['groove', 2.3, _PB_END, {}]],
    [[0.93, 1.2]])

# P46 EVERYONE'S ULTIMATE AT ONCE: METEOR DROP, TITAN, HUNDRED FISTS back to back (cut-ins at 1.5x), then all of it lands.
#   pb_ults: cut-ins 0.3 / 1.03 / 1.77, fists 2.37-3.43, crater 3.5. v = take/1.5 to 1.6, then 1.6 + (take-2.4)/0.875
EDL['P46h'] = phook(
    [_PB_W(0, 1.6, 'pb_ults_s7', 0.0, rate=1.5, cam=_PB_FZ(1.3, 345, 204)),
     _PB_W(1.6, _PB_END, 'pb_ults_s7', 2.4, rate=0.875, cam=_PB_FZ(1.3, 345, 204))],
    [_PB_SQ([_PB_P('NGH', label='NGH (me)', react=[[1.25, '😱'], [2.9, '💀']], hit=[1.8, 2.2, 2.6, 2.86], dead=2.9),
             _PB_P('tuanbeo', react=[[0.69, '😤'], [2.9, '😎']], talk=[[0.69, 1.4]]),
             _PB_P('kaito_04', react=[[2.0, '😵']], hit=[2.86])],
            [_PB_P('zzz_mi', react=[[1.4, '🫣'], [2.9, '😵']], hit=[2.86]),
             _PB_P('bigboss99', react=[[1.18, '😈']], talk=[[1.18, 1.9]]),
             _PB_P('xX_vex_Xx', react=[[0.2, '😈']], talk=[[0.2, 0.9]])]),
     _PB_M("everyone's ultimate<br>at the same time", 0, 1.6, size=84, pop=False, y=1120),   # under the cut-ins / GIANT! callout
     _PB_M('6 players.<br>0 survivors.', 1.98, size=96)],
    [['tension', 0, 1.6, {}], ['groove', 1.6, _PB_END, {}]],
    [[0.2, 0.7], [0.69, 0.8], [1.18, 0.9], [1.79, 1.0], [2.86, 1.6]], nocut=[1.6])

# P47 REVENGE: xX_vex_Xx dropkicked me at kickoff... two minutes later, same guy on the ball by the wall: IRON BOOTS +
#   WALL SLAM, CRACK. pb_kicked: whistle 0.3, boot 0.83 · pb_payback: windup 0.5, boot 0.7, wall 0.73
EDL['P47h'] = phook(
    [_PB_W(0, 1.5, 'pb_kicked_s7', 0.0, cam=F(1.6, 0.2, dy=-22)),
     _PB_W(1.5, 2.25, 'pb_payback_s7', 0.0, cam=F(1.6, 0.2, dy=-12)),
     _PB_W(2.25, 2.5, 'pb_payback_s7', 0.75, rate=0, cam=_PB_FZ(1.9, 'focus', 'focus')),
     _PB_W(2.5, _PB_END, 'pb_payback_s7', 0.75, cam=F(1.6, 0.2, dy=-12))],
    [_PB_DUO(_PB_P('NGH', label='NGH (me)', hit=[0.83], react=[[0.88, '💀'], [1.55, '😤'], [2.3, '😌']], talk=[[1.55, 2.1]]),
             _PB_P('xX_vex_Xx', react=[[0.5, '😈'], [0.95, '😂'], [2.28, '💀']], hit=[2.22], dead=2.3, talk=[[0.95, 1.45]])),
     _PB_M('he dropkicked me<br>at kickoff', 0, 1.45, size=94, pop=False),
     _PB_M('2 minutes later', 1.55, 2.2, size=88),
     _PB_M("we're even 😌", 2.35, size=100, y=1250),
     _PB_CHAT('xX_vex_Xx', '😂😂😂', 0.95, 1.5),
     _PB_CHAT('NGH', 'remember me?', 1.6, 2.4),
     _PB_CHAT('xX_vex_Xx', 'ok fair 😭', 2.6)],
    [['groove', 0, 1.5, {}], ['tension', 1.5, 2.22, {}], ['groove', 2.5, _PB_END, {}]],
    [[0.83, 1.2], [1.5, 0.6], [2.22, 1.6]], mute=[[2.25, 2.5]], nocut=[2.25, 2.5])

# P48 CELEBRATED TOO EARLY: NGH shoots, the squad is already screaming... bigboss99 happened to be strolling through his box:
#   SAVE. pb_early: shot 0.53, save 0.67 (slow-mo take 0.45-0.8)
EDL['P48h'] = phook(
    [_PB_W(0, 0.45, 'pb_early_s7', 0.0, cam=_PB_FZ(1.4, 495, 205)),
     _PB_W(0.45, 1.5, 'pb_early_s7', 0.45, rate=1 / 3, cam=_PB_FZ(1.55, 510, 205)),
     _PB_W(1.5, _PB_END, 'pb_early_s7', 0.8, cam=_PB_FZ(1.4, 495, 205))],
    [_PB_SQ([_PB_P('NGH', label='NGH (me)', talk=[[0.7, 1.3]], react=[[0.7, '🥳'], [1.35, '😐']]),
             _PB_P('tuanbeo', talk=[[0.75, 1.3]], react=[[0.75, '🥳'], [1.4, '😐']]),
             _PB_P('kaito_04', talk=[[0.8, 1.3]], react=[[0.8, '🥳'], [1.45, '😐']])],
            [_PB_P('zzz_mi', react=[[1.6, '😂']]),
             _PB_P('bigboss99', react=[[1.3, '😏']], talk=[[1.9, 2.6]]),
             _PB_P('xX_vex_Xx', react=[[1.65, '🤣']])]),
     _PB_M('we celebrated<br>too early', 0, 1.25, size=96, pop=False),
     _PB_M('he was just<br>walking past 💀', 1.4, size=90),
     _PB_CHAT('NGH', 'GOAAAAL', 0.7, 1.4),
     _PB_CHAT('bigboss99', 'lol', 1.9)],
    [['tension', 0, 0.65, {}], ['calm', 0.65, 1.25, {}], ['groove', 1.5, _PB_END, {}]],
    [[0.55, 0.7], [1.12, 1.3]], mute=[[1.25, 1.5]], nocut=[0.45, 1.5])

# P49 SQUAD WIPE: all three of us press xX_vex_Xx at once... GROUND SLAM, three of us in the air, three cams go grey.
#   pb_wipe: windup 0.8, leap 1.07, lands 1.57
EDL['P49h'] = phook(
    [_PB_W(0, _PB_END, 'pb_wipe_s7', 0.0, cam=_PB_FZ(1.45, 330, 206))],
    [_PB_ROW([_PB_P('NGH', label='NGH (me)', talk=[[0.1, 0.9]], hit=[1.57], dead=1.62, react=[[1.62, '💀']]),
              _PB_P('tuanbeo', talk=[[0.4, 1.0]], hit=[1.57], dead=1.7, react=[[1.7, '💀']]),
              _PB_P('kaito_04', talk=[[0.6, 1.1]], hit=[1.57], dead=1.78, react=[[1.78, '💀']])]),
     _PB_M('when all 3 of us<br>press the same guy', 0, 1.5, size=86, pop=False),
     _PB_M('squad wipe.', 1.65, size=110),
     _PB_CHAT('NGH', 'GET HIM', 0.1, 1.5),
     _PB_CHAT('xX_vex_Xx', '3 for 1 😈', 1.85)],
    [['tension', 0, 1.57, {}], ['groove', 1.57, _PB_END, {}]],
    [[0.8, 0.6], [1.57, 1.6]])

# P50 THE FRIEND NOBODY TRUSTS: 0:03 left, down 2-3 in FINAL PUSH, the ball goes to tuanbeo... FIREBALL from distance, the
#   keeper gets a hand to it (SLIP), GOAL x2 -> 4-3. pb_doubt: pass 0.3, recv 0.7, strike 1.07, goal 1.43 (slow-mo take 0.6-1.05)
EDL['P50h'] = phook(
    [_PB_W(0, 0.6, 'pb_doubt_s7', 0.0, cam=F(1.4, 0.2, dy=-20)),
     _PB_W(0.6, 1.5, 'pb_doubt_s7', 0.6, rate=0.5, cam=F(1.55, 0.2, dy=-18)),
     _PB_W(1.5, _PB_END, 'pb_doubt_s7', 1.05, cam=F(1.35, 0.2, dy=-20))],
    [_PB_ROW([_PB_P('NGH', label='NGH (me)', talk=[[0.9, 1.5], [1.95, 2.6]], react=[[0.95, '😬'], [1.9, '🤯']]),
              _PB_P('tuanbeo', react=[[1.3, '😤'], [2.0, '😎']], talk=[[2.6, 3.4]]),
              _PB_P('kaito_04', talk=[[0.55, 1.2], [1.95, 2.8]], react=[[0.6, '😱'], [1.95, '😭']])]),
     _PB_M('3 seconds left.<br>it goes to HIM', 0, 1.35, size=90, pop=False),
     _PB_M('we never<br>doubted him 🙏', 1.95, size=94),
     _PB_CHAT('kaito_04', 'NOOOO', 0.55, 1.5),
     _PB_CHAT('NGH', 'SHOOT IT', 0.9, 1.5, y=_PB_C2),
     _PB_CHAT('tuanbeo', 'told you 😎', 2.6)],
    [['tension', 0, 1.34, {}], ['groove', 1.34, _PB_END, {}]],
    [[1.34, 1.2], [1.9, 1.5]], heart=[[0, 1.3]], nocut=[0.6, 1.5])
