# batch pd: PvP bodies B22-B31 (4.0 -> 11.4; body() adds the PvP end card at 10.2). exec'd by edl.py with
# seg / meme / F / body / END_CARD_PVP / SPLIT / RG_DUR / EDL in scope. Every name here is _PD-prefixed (shared namespace).
# Takes: frames/pd_<scene>_s7 (scenes_pd.js): online-style 3v3, the cast's handles + looks on the pitch, the game's own
# room lobby / match intro / results / friends screens. Cam and chat timings are read from each take's marks.
import json as _PD_json, os as _PD_os

_PD_END = 11.4
_PD_MK = {}


def _PD_marks(take):
    if take not in _PD_MK:
        p = _PD_os.path.join('frames', take, 'meta.json')
        _PD_MK[take] = _PD_json.load(open(p))['marks'] if _PD_os.path.exists(p) else {}
    return _PD_MK[take]


def _PD_fz(z, fx, fy):
    return {'z': z, 'fx': fx, 'fy': fy}


def _PD_win(v0, v1, take, c0, cam, h=1040, rate=None, **kw):
    """the game in a window between the cams (layout fit)"""
    return seg(v0, v1, take, c0, rate=rate, cam=cam, layout='fit', h=h, **kw)


def _PD_v(sg, c):
    r = sg.get('rate', 1)
    return round(sg['v0'] + (c - sg['c0']) / (r or 1), 3)


def _PD_at(sg, key, default=None):
    """video time of a take mark inside segment sg (None if it falls outside)"""
    c = _PD_marks(sg['clip']).get(key, default)
    if c is None or not sg.get('rate', 1):
        return None
    v = _PD_v(sg, c)
    return v if sg['v0'] - 1e-6 <= v < sg['v1'] else None


def _PD_first(segs, key, default=None):
    for sg in segs:
        v = _PD_at(sg, key)
        if v is not None:
            return v
    return default


def _PD_hits(segs, name):
    """every hit_<name>_n mark of the takes, as video times inside segs"""
    out = []
    for sg in segs:
        if not sg.get('rate', 1):
            continue
        for k, c in _PD_marks(sg['clip']).items():
            if k.startswith('hit_' + name + '_'):
                v = _PD_v(sg, c)
                if sg['v0'] <= v < sg['v1']:
                    out.append(v)
    return sorted(out)


def _PD_p(h, side=0, talk=(), react=(), hit=(), dead=None, **kw):
    e = {'h': h, 'side': side, 'talk': [list(x) for x in talk], 'react': [list(x) for x in react], 'hit': sorted(hit), 'zoom': 1.45, 'py': 8}
    if dead is not None:
        e['dead'] = dead
    e.update(kw)
    return e


def _PD_cams(t0, t1, layout, players, **kw):
    e = {'k': 'cams', 't0': t0, 't1': t1, 'layout': layout, 'players': players}
    e.update(kw)
    return e


def _PD_chat(h, s, t0, t1, y=1445):
    return {'k': 'chat', 'h': h, 's': s, 't0': t0, 't1': t1, 'y': y}


def _PD_tag(a, b, c, t0, t1, y=1380):
    return {'k': 'tag', 'a': a, 'b': b, 'c': c, 't0': t0, 't1': t1, 'y': y}


def _PD_yell(hits, emotes=('😡', '💀', '😵'), talk=0.55):
    """a stunned player screams: talk + an emote on every hit"""
    return ([[t, t + talk] for t in hits], [[t + 0.05, emotes[i % len(emotes)]] for i, t in enumerate(hits)])


_PD_OUTRO = ['outro', 10.2, _PD_END, {}]
_PD_US, _PD_RIV = ['kaito_04', 'tuanbeo', 'NGH'], ['xX_vex_Xx', 'zzz_mi', 'bigboss99']
_PD_SQ_Y = 400        # captions over the top of the game window (squads layout)
_PD_LOW_Y = 1560      # captions in the band under the window (duo / row layouts)


def _PD_squads(t0, t1, segs, extra=None, vs=False):
    """Us on top, Rivals at the bottom; every hit in the takes shakes that cam (+ a scream); extra[h] adds talk / react / dead"""
    extra = extra or {}
    pls = []
    for side, team in ((0, _PD_US), (1, _PD_RIV)):
        for h in team:
            hits = [t for t in _PD_hits(segs, h) if t0 <= t < t1]
            talk, react = _PD_yell(hits)
            x = extra.get(h, {})
            pls.append(_PD_p(h, side, talk=talk + x.get('talk', []), react=react + x.get('react', []), hit=hits,
                             dead=x.get('dead'), **({'live': True} if x.get('live') else {})))
    return _PD_cams(t0, t1, 'squads', pls, y=40, y2=1610)


# ---------------- B22 PRIVATE ROOM: code -> lobby fills up -> kickoff -> a punch-up, nobody follows the tap, it trickles in ----------------
_t = 'pd_brawl_s7'
_s0 = _PD_win(4.0, 4.5, 'pd_room_s7', 0.05, _PD_fz(1.0, 216, 166), h=1000)
_s1 = _PD_win(4.5, 5.75, 'pd_room_s7', 0.55, _PD_fz(1.0, 460, 166), h=1000)
_s2 = _PD_win(5.75, 7.75, _t, 0.3, _PD_fz(1.55, 385, 205))
_s3 = _PD_win(7.75, 8.85, _t, 1.75, _PD_fz(1.55, 520, 205))
_s4 = _PD_win(8.85, 10.2, _t, 2.85, _PD_fz(1.55, 365, 205))
_s5 = _PD_win(10.2, _PD_END, _t, 4.2, _PD_fz(1.55, 365, 205), rate=0.5, dim=0.82)
_g = _PD_first([_s3], 'goal', 8.57)
_kick = _PD_first([_s2], 'hit_zzz_mi_1', 6.45)
EDL['B22'] = body(
    [_s0, _s1, _s2, _s3, _s4, _s5],
    [_PD_squads(5.75, 10.2, [_s2, _s4], {
        'NGH': {'react': [[_kick + 0.05, '😈'], [_g + 0.1, '😂']], 'talk': [[_g + 0.05, _g + 0.8]]},
        'kaito_04': {'talk': [[8.9, 9.8]], 'react': [[_g + 0.15, '🤯']]},
        'tuanbeo': {'react': [[_kick + 0.1, '😈'], [_g + 0.2, '😭']]},
        'zzz_mi': {'talk': [[6.6, 7.7]]},
        'bigboss99': {'talk': [[9.45, 10.2]], 'react': [[_g + 0.1, '💀']]},
        'xX_vex_Xx': {'react': [[_g + 0.25, '😐']]}}),
     meme('private room.<br>just the boys', 4.05, 5.7, y=150, size=100),
     _PD_chat('tuanbeo', 'code??', 4.2, 5.7, y=1440),
     _PD_chat('NGH', 'K7P2X9Q', 4.6, 5.7, y=1530),
     meme('kickoff:', 5.85, 6.6, y=_PD_SQ_Y, size=104),
     meme('nobody went<br>for the ball', 6.7, 7.7, y=_PD_SQ_Y),
     _PD_chat('zzz_mi', 'WHO DROPKICKED ME 😡', 6.6, 7.7),
     meme('meanwhile,<br>the ball:', 7.8, _g - 0.03, y=_PD_SQ_Y),
     meme('1-0 💀', _g + 0.03, 10.15, y=_PD_SQ_Y, size=130),
     _PD_chat('kaito_04', 'wait who scored??', 8.9, 9.8),
     _PD_chat('bigboss99', 'HOW 😭', 9.45, 10.2, y=1525)],
    [['calm', 4.0, 5.75, {}], ['groove', 5.75, 10.2, {'melodyFrom': 7.75}], _PD_OUTRO],
    [[5.75, 0.9], [_kick, 1.2], [_g, 1.3], [10.2, 1.3]],
    end=END_CARD_PVP, nocut=[10.2])

# ---------------- B23 MATCHED WITH STRANGERS: 3 randoms, zero words -> steal, one-touch, one-touch, goal -> friend requests ----------------
_t = 'pd_chem_s7'
_c1 = _PD_win(4.0, 4.6, _t, 0.0, F(1.55, 0.15), h=1060)
_c2 = _PD_win(4.6, 6.2, _t, 0.6, F(1.55, 0.15), h=1060, rate=0.5)
_c3 = _PD_win(6.2, 7.5, _t, 1.4, F(1.55, 0.15), h=1060)
_FZ = _PD_fz(1.8, 563, 100)
_f1 = _PD_win(7.5, 10.05, 'pd_friends_s7', 0.0, _FZ, h=1060)
_f2 = _PD_win(10.05, 10.2, 'pd_friends_s7', 2.55, _FZ, h=1060, rate=0)
_f3 = _PD_win(10.2, _PD_END, 'pd_friends_s7', 2.55, _FZ, h=1060, rate=0, dim=0.82)
_punch = _PD_first([_c1, _c2], 'punch', 4.47)
_goal = _PD_first([_c3], 'goal', 6.8)
_r1, _r2 = _PD_first([_f1], 'req_ratking', 7.8), _PD_first([_f1], 'req_m0le', 8.27)
_o1, _o2 = _PD_first([_f1], 'ok_ratking', 8.87), _PD_first([_f1], 'ok_m0le', 9.37)
EDL['B23'] = body(
    [_c1, _c2, _c3, _f1, _f2, _f3],
    [_PD_cams(4.0, 10.2, 'row', [
        _PD_p('jinx', 0, talk=[[4.35, 5.1], [_goal + 0.1, _goal + 0.6], [_o1, _o1 + 0.4], [_o2, _o2 + 0.4]],
              react=[[_PD_first([_c2], 'recv1', 5.5), '👀'], [_goal + 0.1, '😭'], [_o2 + 0.05, '🤝']]),
        _PD_p('ratking', 0, talk=[[7.3, 7.75]], react=[[_punch, '😤'], [_goal + 0.15, '🔥'], [_o1 + 0.05, '😎']]),
        _PD_p('m0le', 0, talk=[[_goal + 0.05, 7.6]], react=[[_PD_first([_c3], 'shot', 6.27), '😤'], [_goal + 0.2, '🤯'], [_o2 + 0.05, '🥹']])], y=40),
     meme('queued solo.<br>2 randoms.', 4.05, 5.55, y=_PD_LOW_Y),
     _PD_chat('jinx', 'hi?', 4.35, 5.1),
     meme('zero words.<br>perfect goal', 5.65, _goal + 0.6, y=_PD_LOW_Y),
     _PD_chat('m0le', 'WHO ARE YOU GUYS 😭', _goal + 0.05, 7.6),
     _PD_chat('ratking', 'add me', 7.3, 7.9, y=1525),
     meme('came for ranked.<br>left with friends 🤝', 7.75, 10.15, y=_PD_LOW_Y)],
    [['groove', 4.0, 10.2, {'melodyFrom': 6.2}], _PD_OUTRO],
    [[4.0, 0.6], [_punch, 0.9], [_goal, 1.3], [7.5, 0.6], [10.2, 1.3]],
    end=END_CARD_PVP, nocut=[4.6, 6.2, 10.05, 10.2])

# ---------------- B24 ULTIMATE CLASH: the intro cards (my TITAN, his HUNDRED FISTS) -> 20 punches on a giant -> 0 damage -> BONK ----------------
_t = 'pd_clash_fists_s7'
_i1 = _PD_win(4.0, 4.7, 'pd_intro_s7', 2.2, _PD_fz(1.75, 125, 190), h=1000)
_i2 = _PD_win(4.7, 5.45, 'pd_intro_s7', 2.9, _PD_fz(1.75, 438, 190), h=1000)
_k1 = _PD_win(5.45, 6.5, _t, 0.25, F(1.45, 0.2), h=1000)
_k2 = _PD_win(6.5, 8.75, _t, 2.05, F(1.45, 0.2), h=1000)
_k3 = _PD_win(8.75, 9.85, _t, 4.3, F(1.45, 0.2), h=1000, rate=1.7)
_k4 = _PD_win(9.85, 10.2, _t, 6.17, F(1.45, 0.2), h=1000)
_k5 = _PD_win(10.2, _PD_END, _t, 6.52, F(1.45, 0.2), h=1000, rate=0.03, dim=0.82)
_bonk = ([v for v in _PD_hits([_k3, _k4], 'bigboss99')] or [9.8])[-1]
_fist0 = _PD_first([_k2], 'hit_tuanbeo_1', 7.15)
EDL['B24'] = body(
    [_i1, _i2, _k1, _k2, _k3, _k4, _k5],
    [_PD_cams(4.0, 10.2, 'duo', [
        _PD_p('tuanbeo', 0, talk=[[5.5, 6.2], [8.85, 10.2]], react=[[4.1, '😈'], [7.6, '🥱'], [8.85, '😎']],
              hit=[_fist0 + 0.25 * i for i in range(6)], label='tuanbeo (YOU)'),
        _PD_p('bigboss99', 1, talk=[[6.55, 7.5], [_bonk, _bonk + 0.4]], react=[[4.8, '😤'], [8.8, '😳'], [_bonk + 0.05, '💀']], hit=[_bonk])], vs=True, y=40),
     meme('everyone brings<br>an ultimate', 4.05, 5.4, y=_PD_LOW_Y),
     _PD_tag('YOU', 'TITAN', '#ffe14f', 4.1, 4.68, y=1230),
     _PD_tag('HIM', 'HUNDRED FISTS', '#ff3d5a', 4.75, 5.43, y=1230),
     meme('mine: TITAN 😈', 5.5, 6.45, y=_PD_LOW_Y),
     meme('his:<br>HUNDRED FISTS', 6.55, 7.45, y=_PD_LOW_Y, size=88),
     meme('20 punches...', 7.55, 8.7, y=_PD_LOW_Y),
     meme('0 damage 😎', 8.8, 10.15, y=_PD_LOW_Y, size=104),
     _PD_chat('tuanbeo', 'titan is stun immune 😂', 8.85, 10.2, y=1430)],
    [['tension', 4.0, 5.45, {}], ['groove', 5.45, 10.2, {'melodyFrom': 6.5}], _PD_OUTRO],
    [[4.0, 0.6], [5.45, 1.0], [6.5, 1.0], [8.7, 1.2], [_bonk, 1.4], [10.2, 1.3]],
    end=END_CARD_PVP, nocut=[4.7, 9.85, 10.2])

# ---------------- B25 COMEBACK: 0-2 (they type gg) -> 1-2 punch steal -> 2-2 Lightning Dash -> 3-2 Meteor Shot ----------------
_a1 = _PD_win(4.0, 5.95, 'pd_cb1_s7', 0.0, F(1.5, 0.18))
_a2 = _PD_win(5.95, 7.45, 'pd_cb2_s7', 0.25, F(1.5, 0.18))
_a3 = _PD_win(7.45, 10.2, 'pd_cb3_s7', 0.25, F(1.45, 0.2))
_a4 = _PD_win(10.2, _PD_END, 'pd_cb3_s7', 3.0, F(1.45, 0.2), rate=0.14, dim=0.82)
_g1, _g2, _g3 = _PD_first([_a1], 'goal', 5.6), _PD_first([_a2], 'goal', 7.13), _PD_first([_a3], 'goal', 9.6)
EDL['B25'] = body(
    [_a1, _a2, _a3, _a4],
    [_PD_squads(4.0, 10.2, [_a1, _a2, _a3], {
        'bigboss99': {'talk': [[4.25, 5.6]], 'react': [[4.2, '😂'], [_g1 + 0.1, '😐'], [_g3 + 0.1, '😭']]},
        'zzz_mi': {'react': [[4.6, '🥱'], [_g2 + 0.1, '😳'], [_g3 + 0.15, '💀']]},
        'xX_vex_Xx': {'react': [[_g2 + 0.2, '😡'], [_g3 + 0.2, '😵']]},
        'NGH': {'talk': [[_g1, _g1 + 0.6], [_g3, 10.2]], 'react': [[4.3, '😤'], [_g1 + 0.05, '🔥'], [_g3 + 0.05, '🤯']]},
        'kaito_04': {'talk': [[_g2, _g2 + 0.7]], 'react': [[_g2 + 0.05, '⚡'], [_g3 + 0.1, '🔥']]},
        'tuanbeo': {'talk': [[_g3 + 0.1, 10.2]], 'react': [[_g1 + 0.15, '😤'], [_g3 + 0.15, '😭']]}}),
     meme('down 0-2.<br>they typed gg', 4.05, 5.5, y=_PD_SQ_Y),
     _PD_chat('bigboss99', 'gg ez 😂', 4.25, 5.6),
     meme('1-2', _g1 + 0.02, 6.9, y=1180, size=150),
     meme('2-2 👀', _g2 + 0.02, 8.5, y=1180, size=140),
     meme('3-2 🔥', _g3 + 0.02, 10.15, y=1180, size=150),
     _PD_chat('NGH', 'gg ez 🙂', _g3 + 0.15, 10.2)],
    [['tension', 4.0, 5.6, {}], ['groove', 5.6, 10.2, {'melodyFrom': 7.45}], _PD_OUTRO],
    [[4.0, 0.6], [_g1, 1.0], [_g2, 1.2], [_g3, 1.5], [10.2, 1.3]],
    heart=[[4.0, 5.5]], end=END_CARD_PVP, nocut=[10.2])

# ---------------- B26 NO FIXED KEEPER: tuanbeo backs into the box (gloves) -> SAVE! -> all three stand in it -> all dive, it goes in ----------------
_KZ = _PD_fz(1.7, 150, 203)
_q1 = _PD_win(4.0, 6.3, 'pd_keep_save_s7', 0.05, F(1.9, 0.18))
_q2 = _PD_win(6.3, 7.95, 'pd_keep_three_s7', 0.3, _KZ)
_q3 = _PD_win(7.95, 9.1, 'pd_keep_three_s7', 1.95, _KZ, rate=0.4)
_q4 = _PD_win(9.1, 10.2, 'pd_keep_three_s7', 2.41, _KZ, rate=0.76)
_q5 = _PD_win(10.2, _PD_END, 'pd_keep_three_s7', 3.24, _KZ, rate=0, dim=0.82)
_sv = _PD_first([_q1], 'save', 5.6)
_gl = _PD_first([_q3, _q4], 'goal', 8.75)
EDL['B26'] = body(
    [_q1, _q2, _q3, _q4, _q5],
    [_PD_squads(4.0, 10.2, [_q1, _q2], {
        'tuanbeo': {'talk': [[_sv, _sv + 0.8]], 'react': [[_sv + 0.05, '😎'], [_gl + 0.1, '😭']]},
        'kaito_04': {'react': [[6.5, '🧤'], [_gl + 0.15, '💀']]},
        'NGH': {'talk': [[6.4, 7.0]], 'react': [[_gl + 0.2, '🤡']]},
        'zzz_mi': {'talk': [[_gl + 0.1, 10.2]], 'react': [[_gl + 0.1, '😂']]},
        'bigboss99': {'react': [[_sv + 0.1, '😑'], [_gl + 0.2, '🤣']]}}),
     meme('street 3v3:<br>no fixed keeper', 4.05, 5.25, y=_PD_SQ_Y),
     meme("whoever's in the<br>box keeps 🧤", 5.3, 6.6, y=_PD_SQ_Y, size=88),
     _PD_chat('tuanbeo', 'EZ SAVE 😎', _sv + 0.05, 6.3),
     meme('so we ALL<br>stood in it', 6.7, 7.9, y=_PD_SQ_Y),
     meme('3 keepers.<br>0 saves 💀', _gl + 0.05, 10.15, y=_PD_SQ_Y),
     _PD_chat('zzz_mi', '3 KEEPERS LMAOOO', _gl + 0.2, 10.2)],
    [['groove', 4.0, 7.95, {}], ['calm', 7.95, 8.75, {}], ['groove', 8.75, 10.2, {'melodyFrom': 8.75}], _PD_OUTRO],
    [[4.0, 0.6], [_sv, 1.0], [6.3, 0.7], [_gl, 1.4], [10.2, 1.3]],
    end=END_CARD_PVP, nocut=[7.95, 9.1, 10.2])

# ---------------- B27 RESULTS FLEX: the winner (GOAL x2) -> VICTORY 3-1 -> our cores -> their cores -> gg / gg ez ----------------
_w1 = _PD_win(4.0, 5.3, 'pd_win_s7', 0.2, F(1.5, 0.18), h=1120)
_r1 = _PD_win(5.3, 6.5, 'pd_res_win_s7', 0.95, _PD_fz(1.25, 317, 100), h=1120)
_r2 = _PD_win(6.5, 7.9, 'pd_res_win_s7', 2.15, _PD_fz(1.75, 127, 168), h=1120)
_r3 = _PD_win(7.9, 9.2, 'pd_res_win_s7', 3.55, _PD_fz(1.75, 513, 168), h=1120)
_r4 = _PD_win(9.2, 10.2, 'pd_res_win_s7', 4.85, _PD_fz(1.15, 318, 150), h=1120)
_r5 = _PD_win(10.2, _PD_END, 'pd_res_win_s7', 5.85, _PD_fz(1.15, 318, 150), h=1120, rate=0.25, dim=0.82)
_wg = _PD_first([_w1], 'goal', 4.63)
_LOW27 = 1490
# all six cams in one row over the window: both squads watch the results screen
EDL['B27'] = body(
    [_w1, _r1, _r2, _r3, _r4, _r5],
    [_PD_cams(4.0, 10.2, 'row', [
        _PD_p('kaito_04', 0, react=[[_wg + 0.1, '🤯'], [7.0, '💅']]),
        _PD_p('tuanbeo', 0, react=[[_wg + 0.15, '😭'], [7.3, '😎']]),
        _PD_p('NGH', 0, talk=[[_wg, _wg + 0.7], [9.0, 9.7]], react=[[_wg + 0.05, '🔥'], [6.55, '😎']]),
        _PD_p('xX_vex_Xx', 1, talk=[[9.6, 10.2]], react=[[_wg + 0.2, '😡'], [8.2, '😶']], label='vex'),
        _PD_p('zzz_mi', 1, talk=[[8.0, 8.6]], react=[[_wg + 0.1, '😩']]),
        _PD_p('bigboss99', 1, talk=[[8.4, 9.0]], react=[[_wg + 0.15, '💀'], [9.3, '😡']], label='bigboss')], y=40),
     meme('won it on<br>the last kick', 4.05, 5.25, y=_LOW27),
     meme('then the results<br>screen hits 😎', 5.35, 6.45, y=_LOW27, size=88),
     meme('our cores', 6.55, 7.85, y=_LOW27, size=104),
     meme('their cores', 7.95, 9.15, y=_LOW27, size=104),
     meme('screenshot it.<br>group chat 📸', 9.25, 10.15, y=_LOW27, size=88),
     _PD_chat('zzz_mi', 'gg', 8.0, 8.9, y=1690),
     _PD_chat('bigboss99', 'gg', 8.4, 9.2, y=1775),
     _PD_chat('NGH', 'gg ez 😎', 9.0, 10.2, y=1690),
     _PD_chat('xX_vex_Xx', 'rematch. now.', 9.6, 10.2, y=1775)],
    [['groove', 4.0, 10.2, {'melodyFrom': 5.3}], _PD_OUTRO],
    [[4.0, 0.6], [_wg, 1.3], [5.3, 1.0], [10.2, 1.3]],
    end=END_CARD_PVP, nocut=[10.2])

# ---------------- B28 RAGE QUIT: 4-0, he gets dropkicked, "xX_vex_Xx LEFT · AI takes over", the AI in his boots scores ----------------
_t = 'pd_rage_s7'
_e1 = _PD_win(4.0, 5.6, _t, 0.5, F(1.55, 0.18))
_e2 = _PD_win(5.6, 7.0, _t, 2.1, F(1.55, 0.18))
_e3 = _PD_win(7.0, 8.0, _t, 3.5, F(1.55, 0.18), rate=1.5)
_e4 = _PD_win(8.0, 9.75, _t, 5.0, F(1.55, 0.18))
_e5 = _PD_win(9.75, 10.2, _t, 6.75, F(1.55, 0.18), rate=0.4)
_e6 = _PD_win(10.2, _PD_END, _t, 6.93, F(1.55, 0.18), rate=0, dim=0.82)
_left = _PD_first([_e1], 'left', 5.0)
_ai = _PD_first([_e2], 'ai', 6.07)
_eg = _PD_first([_e4], 'goal', 9.23)
EDL['B28'] = body(
    [_e1, _e2, _e3, _e4, _e5, _e6],
    [_PD_squads(4.0, 10.2, [_e1, _e2, _e3, _e4], {
        'xX_vex_Xx': {'talk': [[4.45, _left]], 'react': [[4.45, '😡']], 'dead': _left},
        'zzz_mi': {'talk': [[5.4, 6.3], [_eg + 0.1, 10.2]], 'react': [[_left + 0.1, '💀'], [_eg + 0.1, '😂']]},
        'bigboss99': {'react': [[_left + 0.2, '😂'], [_eg + 0.15, '🤣']]},
        'NGH': {'talk': [[6.75, 7.6]], 'react': [[4.2, '😈'], [_eg + 0.1, '💀']]},
        'kaito_04': {'talk': [[8.0, 9.15]], 'react': [[_eg + 0.2, '😭']]},
        'tuanbeo': {'react': [[_eg + 0.15, '🤡']]}}),
     meme('4-0 up 😈', 4.05, 5.0, y=_PD_SQ_Y, size=110),
     _PD_chat('xX_vex_Xx', 'this game is rigged', 4.45, _left),
     meme('he rage quit 💀', _left + 0.1, 6.4, y=_PD_SQ_Y),
     _PD_chat('zzz_mi', 'bro left 💀', 5.4, 6.3),
     meme('the AI took<br>his spot...', 6.5, 7.9, y=_PD_SQ_Y),
     _PD_chat('NGH', 'the bot?? 😭', 6.75, 7.6),
     _PD_chat('kaito_04', 'why is the bot cooking', 8.0, 9.15),
     meme('the AI is<br>better 💀', _eg + 0.05, 10.15, y=_PD_SQ_Y),
     _PD_chat('zzz_mi', 'the bot plays better than him', _eg + 0.15, 10.2)],
    [['groove', 4.0, 10.2, {'melodyFrom': 7.0}], _PD_OUTRO],
    [[4.0, 0.6], [_left, 1.2], [_eg, 1.3], [10.2, 1.3]],
    end=END_CARD_PVP, nocut=[7.0, 8.0, 9.75, 10.2])

# ---------------- B29 3-FRIEND PASSING CHAIN: five one-touch passes up the pitch, finish; cams light up on every touch ----------------
_t = 'pd_tiki_s7'
_p1 = _PD_win(4.0, 7.8, _t, 0.05, F(1.55, 0.16))
_p2 = _PD_win(7.8, 9.1, _t, 0.3, _PD_fz(1.0, 372, 205), rate=2.5)        # the whole chain again, wide, 2.5x
_p2b = _PD_win(9.1, 10.2, _t, 3.75, F(1.55, 0.16), rate=0.7)
_p3 = _PD_win(10.2, _PD_END, _t, 4.52, F(1.55, 0.16), rate=0, dim=0.82)
_pv = [_PD_first([_p1], 'pass%d' % i, 4.0 + 0.6 * i) for i in range(1, 6)]
_sh = _PD_first([_p1], 'shot', 7.3)
_tg = _PD_first([_p1, _p2], 'goal', 7.62)
_touch = {'kaito_04': [_pv[0], _pv[3]], 'tuanbeo': [_pv[1], _pv[4]], 'NGH': [_pv[2], _sh]}
EDL['B29'] = body(
    [_p1, _p2, _p2b, _p3],
    [_PD_squads(4.0, 10.2, [_p1], {
        'kaito_04': {'talk': [[t - 0.25, t + 0.15] for t in _touch['kaito_04']] + [[_tg, 10.2]], 'react': [[_tg + 0.1, '🔥']]},
        'tuanbeo': {'talk': [[t - 0.25, t + 0.15] for t in _touch['tuanbeo']] + [[_tg + 0.1, 10.2]], 'react': [[_tg + 0.15, '😭']]},
        'NGH': {'talk': [[t - 0.25, t + 0.15] for t in _touch['NGH']] + [[_tg, 10.2]], 'react': [[_tg + 0.05, '🤯']]},
        'zzz_mi': {'react': [[_pv[3] + 0.1, '😵‍💫'], [_tg + 0.2, '😐']]},
        'bigboss99': {'react': [[_pv[2] + 0.1, '😤'], [_tg + 0.2, '💀']]},
        'xX_vex_Xx': {'react': [[_tg + 0.1, '😭']]}}),
     meme('when the squad<br>actually passes', 4.05, 5.6, y=_PD_SQ_Y),
     *[meme(str(i + 1), _pv[i], (_pv[i + 1] if i < 4 else _sh) - 0.03, y=1150, size=150) for i in range(5)],
     _PD_chat('kaito_04', 'one-two?', 4.3, 5.2),
     _PD_chat('NGH', 'SHOOT??', _pv[4] - 0.2, _sh + 0.2),
     meme('TIKI-TAKA 🔥', _tg + 0.05, 9.05, y=_PD_SQ_Y, size=110),
     _PD_chat('tuanbeo', 'NO WAY 😭😭', _tg + 0.2, 9.2),
     meme("we've never<br>practiced this", 9.12, 10.15, y=_PD_SQ_Y)],
    [['groove', 4.0, 10.2, {'melodyFrom': _pv[2]}], _PD_OUTRO],
    [[4.0, 0.6], [_tg, 1.4], [10.2, 1.3]],
    end=END_CARD_PVP, nocut=[10.2])

# ---------------- B30 SIX PLAYERS, EVERYTHING AT ONCE: six ultimates back to back, a bomb ball, clones, a giant ----------------
_t = 'pd_chaos6_s7'
_M30 = _PD_marks(_t)
_ults = sorted([(c, k[4:]) for k, c in _M30.items() if k.startswith('ult_')])
# keep 0.3 s of every cut-in (the banner slides in) and the action between them
_cuts, _v = [], 4.0
_c0 = 0.15
for _i, (_cu, _h) in enumerate(_ults):
    _cuts.append((_c0, _cu + 0.32))
    _c0 = _cu + 0.6
_cuts.append((_c0, 7.15))
_x_segs = []
for _a, _b in _cuts:
    _len = _b - _a
    if _v + _len > 10.2:
        _len = 10.2 - _v
    if _len <= 0.05:
        continue
    _x_segs.append(_PD_win(_v, round(_v + _len, 3), _t, _a, F(1.3, 0.12)))
    _v = round(_v + _len, 3)
if _v < 10.2:
    _x_segs.append(_PD_win(_v, 10.2, _t, min(7.1, _x_segs[-1]['c0'] + (_x_segs[-1]['v1'] - _x_segs[-1]['v0'])), F(1.3, 0.12), rate=0.2))
_x_end = _PD_win(10.2, _PD_END, _t, 7.15, F(1.3, 0.12), rate=0, dim=0.82)
_ultv = {h: _PD_first(_x_segs, 'ult_' + h) for _c, h in _ults}
_EM30 = {'NGH': '☄️', 'tuanbeo': '😤', 'kaito_04': '⚡', 'zzz_mi': '😌', 'bigboss99': '👊', 'xX_vex_Xx': '😈'}
_e30 = {h: {'talk': [[v, v + 0.6]] if v else [], 'react': [[v + 0.02, _EM30.get(h, '🔥')]] if v else []} for h, v in _ultv.items()}
EDL['B30'] = body(
    _x_segs + [_x_end],
    [_PD_squads(4.0, 10.2, _x_segs, _e30),
     meme('6 players.<br>6 ultimates.', 4.05, 5.5, y=_PD_SQ_Y),
     _PD_chat('zzz_mi', 'WHAT IS HAPPENING', 6.2, 7.3),
     _PD_chat('kaito_04', 'EVERYONE PRESSED X 😭', 7.4, 8.6),
     meme('6 players.<br>0 brain cells.', 8.8, 10.15, y=_PD_SQ_Y, size=96)],
    [['groove', 4.0, 10.2, {'melodyFrom': 6.0}], _PD_OUTRO],
    [[4.0, 0.6]] + [[v, 0.8] for v in _ultv.values() if v] + [[10.2, 1.3]],
    end=END_CARD_PVP, nocut=[s['v0'] for s in _x_segs[1:]] + [10.2])

# ---------------- B31 THE REMATCH LOOP: DEFEAT -> "rematch?" -> lobby START -> goal -> VICTORY -> "one more" -> DEFEAT -> VICTORY -> 4am ----------------
_RZ = _PD_fz(1.3, 317, 95)
_l1 = _PD_win(4.0, 5.2, 'pd_res_lose_s7', 0.95, _RZ, h=1000)
_lb = _PD_win(5.2, 5.6, 'pd_room_s7', 1.65, _PD_fz(0.63, 320, 181), h=680)
_gl1 = _PD_win(5.6, 6.2, 'fire_goal_s7', 0.75, F(1.6, 0.2), h=1000)
_w1b = _PD_win(6.2, 7.3, 'pd_res_win2_s7', 0.95, _RZ, h=1000)
_l2 = _PD_win(7.3, 8.3, 'pd_res_lose2_s7', 0.95, _RZ, h=1000)
_gl2 = _PD_win(8.3, 8.9, 'ga_thunder_s7', 0.8, F(1.6, 0.2), h=1000)
_w2 = _PD_win(8.9, 10.2, 'pd_res_win3_s7', 0.95, _RZ, h=1000)
_w3 = _PD_win(10.2, _PD_END, 'pd_res_win3_s7', 2.25, _RZ, h=1000, rate=0.25, dim=0.82)
EDL['B31'] = body(
    [_l1, _lb, _gl1, _w1b, _l2, _gl2, _w2, _w3],
    [_PD_cams(4.0, 10.2, 'duo', [
        _PD_p('NGH', 0, talk=[[4.4, 5.1], [7.6, 8.3]], react=[[4.1, '😐'], [6.25, '😈'], [7.35, '😭'], [8.95, '🥱']]),
        _PD_p('bigboss99', 1, talk=[[4.75, 5.2], [6.5, 7.3], [9.1, 10.2]], react=[[4.15, '😂'], [6.3, '😡'], [7.4, '😈'], [9.0, '😤']])], vs=True, y=40),
     meme('we lost 😐', 4.05, 5.15, y=_PD_LOW_Y, size=104),
     _PD_chat('NGH', 'rematch?', 4.4, 5.2, y=1430),
     _PD_chat('bigboss99', 'bet', 4.75, 5.2, y=1505),
     meme('rematch.', 5.25, 6.15, y=_PD_LOW_Y, size=104),
     meme('we won.', 6.25, 7.25, y=_PD_LOW_Y, size=104),
     _PD_chat('bigboss99', 'one more', 6.5, 7.3, y=1430),
     meme('one more.', 7.35, 8.85, y=_PD_LOW_Y, size=104),
     _PD_chat('NGH', 'ONE MORE', 7.6, 8.3, y=1430),
     meme("it's 4am 💀", 8.95, 10.15, y=_PD_LOW_Y, size=104),
     _PD_chat('bigboss99', 'last one i swear', 9.1, 10.2, y=1430)],
    [['groove', 4.0, 10.2, {'melodyFrom': 6.2}], _PD_OUTRO],
    [[4.0, 0.6], [5.2, 0.7], [6.2, 1.0], [7.3, 0.8], [8.9, 1.0], [10.2, 1.3]],
    end=END_CARD_PVP, nocut=[10.2])
