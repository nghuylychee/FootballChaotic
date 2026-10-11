# ---------------------------------------------------------------- P6: the friend who always brings Titan -> TITAN, bowls their whole defence over, walks it in
# pa_titan: ult 0.3 (cut-in to 0.9), bowls vex 1.4, bigboss99 1.6, shot 2.77, goal 2.97
_T = 'pa_titan_s7'
EDL['P6h'] = phook(
    [_w(0, _H, _T, 0.2, F(1.5, 0.2, dy=-28), _WIN_SQ)],
    [_cams('squads', [_cam('NGH', 0, talk=[[0.25, 0.9], [2.8, 3.6]], react=[[0.3, '🙄'], [2.8, '😂']]),
                      _cam('tuanbeo', 0, talk=[[0.0, 0.6], [2.75, 3.8]], react=[[0.1, '😈'], [1.25, '😂'], [2.8, '🔥']]),
                      _cam('kaito_04', 0, react=[[0.55, '😑'], [2.85, '🫡']]),
                      _cam('zzz_mi', 1, react=[[2.85, '😭']]),
                      _cam('bigboss99', 1, react=[[1.55, '💀']], hit=[1.4], dead=1.6),
                      _cam('xX_vex_Xx', 1, react=[[1.35, '💀']], hit=[1.2], dead=1.4)]),
     _m('the friend who<br>always brings Titan', 0, 1.35, _CAP_SQ, 88, pop=False),
     _m('every. single.<br>match.', 1.45, _H, _CAP_SQ, 96),
     _chat('NGH', 'titan AGAIN??', 0.3, 2.6, _CH_SQ)],
    [['pulse', 0, 0.7, {}], ['groove', 0.7, _H, {}]], [[0.1, 0.8], [1.2, 1.1], [1.4, 1.1], [2.77, 1.2]])

# ---------------------------------------------------------------- P7: "don't dropkick me" -> so I didn't: HUNDRED FISTS (bigboss99's signature)
# pa_dontdk: DON'T 0.1, ult 0.57 (cut-in to 1.17), punches 1.2-2.4, blast 2.53, wall 2.8
_T = 'pa_dontdk_s7'
EDL['P7h'] = phook(
    [_w(0, _H, _T, 0.25, F(1.7, 0.2, dy=-25), _WIN_DUO)],
    [_cams('duo', [_cam('bigboss99', 0, talk=[[0.95, 2.2]], react=[[0.35, '😇'], [2.35, '😈']]),
                   _cam('mochi', 1, talk=[[0.0, 0.6]], react=[[0.1, '🥺'], [2.35, '💀']], hit=[0.95, 1.25, 1.55, 1.85, 2.15, 2.28], dead=2.45)], vs=True),
     _m('he said "don\'t<br>dropkick me"', 0, 1.15, _CAP_DUO, 92, pop=False),
     _m("so I didn't 😇", 1.2, _H, _CAP_DUO, 96),
     _chat('mochi', "THAT'S WORSE", 2.6, _H, _CH_DUO[0])],
    [['tension', 0, 0.92, {}], ['groove', 0.92, _H, {}]], [[0.32, 0.8], [2.28, 1.5]])

# ---------------------------------------------------------------- P10: voice chat when the meteor lands (6 cams; panda.exe's METEOR DROP)
# pa_meteor: ult 0.27 (cut-in to 0.87), panda.exe leaves the map 0.87, the reticle hunts us, KRAKOOM 2.27
_T = 'pa_meteor_s7'
_IMP = 2.17     # video time of the crash (take 2.27)
EDL['P10h'] = phook(
    [_w(0, _H, _T, 0.1, F(1.5, 0.15, dy=-15), _WIN_SQ)],
    [_cams('squads', [_cam('NGH', 0, talk=[[0.9, _IMP]], react=[[1.0, '😱'], [_IMP + 0.12, '💀']], hit=[_IMP], dead=_IMP + 0.3),
                      _cam('tuanbeo', 0, talk=[[1.05, _IMP]], react=[[1.2, '😨'], [_IMP + 0.2, '💀']], hit=[_IMP], dead=_IMP + 0.35),
                      _cam('kaito_04', 0, talk=[[1.3, _IMP]], react=[[1.4, '😱'], [_IMP + 0.28, '💀']], hit=[_IMP], dead=_IMP + 0.4),
                      _cam('mochi', 1, react=[[_IMP + 0.2, '😂']]),
                      _cam('DUKE', 1, react=[[_IMP + 0.3, '🤣']]),
                      _cam('panda.exe', 1, talk=[[0.1, 0.8], [_IMP + 0.1, 3.4]], react=[[0.15, '😈'], [_IMP + 0.1, '😂']])]),
     _m('voice chat when<br>the meteor lands', 0, _IMP, _CAP_SQ, 92, pop=False),
     _m('squad wipe 💀', _IMP + 0.15, _H, _CAP_SQ, 104),
     _chat('NGH', 'RUN RUN RUN', 1.0, _IMP, _CH_SQ)],
    [['tension', 0, _IMP, {}], ['groove', _IMP, _H, {}]], [[0.17, 0.8], [_IMP, 1.6]])

# ---------------------------------------------------------------- P12: he rage quit (the game's own LEFT banner)... the AI that took over steals it back and scores
# pa_ragequit: my punch-steal 0.67, LEFT banner 1.23, the AI's punch-steal 1.77, shot 2.13, goal 2.43
_T = 'pa_ragequit_s7'
EDL['P12h'] = phook(
    [_w(0, 1.0, _T, 0.15, F(1.6, 0.2, dy=-22), _WIN_DUO),
     _w(1.0, 1.9, _T, 1.15, _fix(0.92, 318, 180), _WIN_DUO),
     _w(1.9, _H, _T, 2.05, F(1.5, 0.15, dy=-30), _WIN_DUO)],
    [_cams('duo', [_cam('NGH', 0, talk=[[0.55, 1.0]], react=[[0.55, '😈'], [1.15, '😂'], [1.7, '😳'], [2.32, '💀']], hit=[1.62]),
                   _cam('xX_vex_Xx', 1, react=[[0.65, '😡']], hit=[0.52], dead=1.08)], vs=True),
     _m('he rage quit 😂', 0, 1.5, _CAP_DUO, 100, pop=False),
     _m('the bot that<br>replaced him:', 1.55, 2.28, _CAP_DUO, 92),
     _m('...is better 💀', 2.32, _H, _CAP_DUO, 100),
     _chat('xX_vex_Xx', 'this game is trash 😡', 0.75, 1.9, _CH_DUO[0])],
    [['pulse', 0, 1.08, {}], ['groove', 1.08, _H, {}]], [[0.52, 1.0], [1.62, 0.9], [2.28, 1.2]])

# ---------------------------------------------------------------- P13: the friend who never passes -> two of theirs dropkick him off the ball
# pa_nopass: PASS! 0.2 / 0.6 / 1.0, their double dropkick 1.33 -> contact 1.57, they walk off with it
_T = 'pa_nopass_s7'
EDL['P13h'] = phook(
    [_w(0, _H, _T, 0.25, F(1.55, 0.2, dy=-12), _WIN_ROW)],
    [_cams('row', [_cam('NGH', talk=[[0.0, 0.45], [0.75, 1.15]], react=[[1.45, '🤦']]),
                   _cam('tuanbeo', talk=[[2.6, 3.4]], react=[[0.6, '😎'], [1.45, '💀']], hit=[1.32]),
                   _cam('kaito_04', talk=[[0.4, 0.85]], react=[[1.5, '😭']])]),
     _m('the friend who<br>never passes', 0, 1.3, _CAP_ROW, 96, pop=False),
     _m("and that's why<br>you pass 💀", 1.4, _H, _CAP_ROW, 92),
     _chat('NGH', 'PASS', -0.2, 2.5, _CH_ROW[0]),
     _chat('kaito_04', 'PASS IT', 0.45, 2.5, _CH_ROW[1]),
     _chat('tuanbeo', 'ok ok next time', 2.6, _H, _CH_ROW[0])],
    [['pulse', 0, 1.32, {}], ['groove', 1.32, _H, {}]], [[1.32, 1.3]])

# ---------------------------------------------------------------- P14: "I'd score from here" -> BLACK HOLE SHOT from the halfway line, it yanks the defenders and the keeper on its way in
# pa_bet: charged shot 0.6 (VWOOM), pulls 0.7 / 0.8 / 1.0, goal 1.07
_T = 'pa_bet_s7'
_c = F(1.55, 0.15, dy=-25)
EDL['P14h'] = phook(
    [_w(0, 0.4, _T, 0.2, _c, _WIN_DUO),
     _w(0.4, 1.4, _T, 0.6, _c, _WIN_DUO, rate=0.5),
     _w(1.4, _H, _T, 1.1, _c, _WIN_DUO)],
    [_cams('duo', [_cam('NGH', 0, talk=[[1.45, 2.2]], react=[[0.4, '😈'], [1.5, '💸']]),
                   _cam('bigboss99', 1, talk=[[0.0, 0.5], [1.5, 2.6]], react=[[0.1, '😂'], [0.75, '😳'], [1.4, '💀']], dead=1.45)], vs=True),
     _m("I bet my friend<br>I'd score from here", 0, 1.38, _CAP_DUO, 88, pop=False),
     _m('pay up 💸', 1.42, _H, _CAP_DUO, 110),
     _chat('bigboss99', 'from there? no chance', -0.2, 1.4, _CH_DUO[0]),
     _chat('bigboss99', 'what was THAT', 1.5, _H, _CH_DUO[0])],
    [['tension', 0, 1.34, {}], ['groove', 1.34, _H, {}]], [[0.4, 1.0], [1.34, 1.4]], nocut=[0.4, 1.4])

# ---------------------------------------------------------------- P16: he picked aura farming (zzz_mi's signature) -> I go in with a dropkick, one calm step aside, MISS
# pa_aura: ult 0.13 (cut-in to 0.73), my windup 1.43, his dodge 1.77, MISS ~1.9
_T = 'pa_aura_s7'
EDL['P16h'] = phook(
    [_w(0, _H, _T, 0.1, F(1.85, 0.2, dy=-22), _WIN_DUO)],
    [_cams('duo', [_cam('kaito_04', 0, talk=[[0.75, 1.3]], react=[[1.85, '😳'], [2.9, '🤡']]),
                   _cam('zzz_mi', 1, react=[[0.7, '😎'], [1.75, '😇']])], vs=True),
     _m('he picked<br>aura farming', 0, 1.6, _CAP_DUO, 96, pop=False),
     _m("couldn't even<br>touch him 💀", 1.7, _H, _CAP_DUO, 92),
     _chat('kaito_04', 'HOW DID I MISS', 2.15, _H, _CH_DUO[0])],
    [['calm', 0, 1.67, {}], ['groove', 1.67, _H, {}]], [[0.03, 0.8], [1.67, 1.0]])

# ---------------------------------------------------------------- P18: my friend went AFK in our box -> street 3v3: whoever's in the box keeps. Their shot hits him: SAVE
# pa_afk: AFK 0.15, their shot 0.83, SAVE 1.07
_T = 'pa_afk_s7'
_c = _fix(1.7, 140, 196)
EDL['P18h'] = phook(
    [_w(0, 0.8, _T, 0.0, _c, _WIN_ROW),
     _w(0.8, 1.4, _T, 0.8, _c, _WIN_ROW, rate=0.5),
     _w(1.4, _H, _T, 1.1, _c, _WIN_ROW)],
    [_cams('row', [_cam('NGH', talk=[[0.1, 0.8]], react=[[0.85, '😱'], [1.45, '😂']]),
                   _cam('tuanbeo', talk=[[1.5, 2.3]], react=[[1.5, '💀']]),
                   _cam('kaito_04', label='kaito_04 · AFK', react=[[2.65, '😳']], dead=-1)]),
     _m('my friend went<br>AFK mid-match', 0, 1.2, _CAP_ROW, 92, pop=False),
     _m('best save of<br>his life 💀', 1.38, _H, _CAP_ROW, 96),
     _chat('NGH', 'kaito?? u there', -0.2, 1.4, _CH_ROW[0]),
     _chat('kaito_04', 'back. what did I miss', 2.6, _H, _CH_ROW[0])],
    [['calm', 0, 1.34, {}], ['groove', 1.34, _H, {}]], [[1.34, 1.2]], nocut=[0.8, 1.4])

# ---------------------------------------------------------------- P19: don't celebrate in front of your friend -> SIUUU before it's in... our keeper saves it, dropkick mid-pose
# pa_celebrate: shot 0.2, SIUUU 0.33, SAVE 0.37, my windup 0.9, contact 1.1
_T = 'pa_celebrate_s7'
_c = F(1.7, 0.2, dy=-28)
EDL['P19h'] = phook(
    [_w(0, 1.1, _T, 0.0, _c, _WIN_DUO),
     _w(1.1, 1.35, _T, 1.17, _fix(1.95, 'focus', 'focus'), _WIN_DUO, rate=0),
     _w(1.35, _H, _T, 1.17, _c, _WIN_DUO)],
    [_cams('duo', [_cam('NGH', 0, talk=[[1.45, 2.2]], react=[[0.45, '😐'], [1.4, '😈']]),
                   _cam('m0le', 1, talk=[[0.3, 1.0]], react=[[0.35, '🥳'], [1.37, '💀']], hit=[1.1], dead=1.4)], vs=True),
     _m("don't celebrate in<br>front of your friend", 0, 1.1, _CAP_DUO, 84, pop=False),
     _m("it didn't even<br>go in 💀", 1.38, _H, _CAP_DUO, 96),
     _chat('m0le', 'ok that was fair', 2.6, _H, _CH_DUO[0])],
    [['pulse', 0, 1.1, {}], ['groove', 1.35, _H, {}]], [[0.37, 0.7], [1.1, 1.5]], mute=[[1.1, 1.35]])

# ---------------------------------------------------------------- P22 (family: duo combo): the duo syncs -> DUKE's ENDLESS TIKI-TAKA with mochi, four golden passes, goal
# pa_sync: ult 0.3 (cut-in to 0.9), passes 1.03 / 1.23 / 1.5 / 1.7, shot 1.93, goal 2.23
_T = 'pa_sync_s7'
EDL['P22h'] = phook(
    [_w(0, _H, _T, 0.15, F(1.6, 0.2, dy=-25), _WIN_DUO)],
    [_cams('duo', [_cam('DUKE', 0, talk=[[0.0, 0.3], [0.85, 1.0], [1.32, 1.47], [1.75, 1.9], [2.1, 3.3]], react=[[2.12, '🔥']]),
                   _cam('mochi', 0, talk=[[1.05, 1.2], [1.52, 1.67], [2.1, 3.3]], react=[[2.18, '🎶']])]),
     _m('when the duo<br>finally syncs', 0, 1.6, _CAP_DUO, 96, pop=False),
     _m('2 brains,<br>1 frequency', 2.1, _H, _CAP_DUO, 96),
     _chat('DUKE', 'NOW', -0.2, 0.9, _CH_DUO[0])],
    [['tension', 0, 0.75, {}], ['groove', 0.75, _H, {}]], [[0.15, 0.8], [2.08, 1.3]])

# ---------------------------------------------------------------- P24 (family: signature ultimate reveal): "what does your ultimate do?" -> mochi's CLONE ARMY mugs me
# pa_reveal: ult 0.53 (cut-in to 1.13), POOF 1.2, 4 HIT 1.7, he takes the ball 2.1
_T = 'pa_reveal_s7'
EDL['P24h'] = phook(
    [_w(0, _H, _T, 0.2, F(1.75, 0.2, dy=-22), _WIN_DUO)],
    [_cams('duo', [_cam('NGH', 0, talk=[[0.0, 0.3], [2.2, 2.9]], react=[[1.0, '😳'], [1.65, '💀']], hit=[1.5]),
                   _cam('mochi', 1, talk=[[0.3, 0.9]], react=[[0.3, '😇'], [1.6, '😈']])], vs=True),
     _m('"what does your<br>ultimate do?"', 0, 1.0, _CAP_DUO, 92, pop=False),
     _m('live demo:', 1.05, _H, _CAP_DUO, 104),
     _chat('mochi', 'wanna see? 😇', 0.3, 1.5, _CH_DUO[0]),
     _chat('NGH', "I'M GOOD THANKS", 2.2, _H, _CH_DUO[0])],
    [['tension', 0, 1.0, {}], ['groove', 1.0, _H, {}]], [[0.33, 0.8], [1.5, 1.3]])

# ---------------------------------------------------------------- P25 (family: the last-second own goal): 2-2, last second -> their defender's clearance flies into his own net, GOAL x2
# pa_lastsecond: my through ball 0.43, his windup 1.07, he hits it 1.3, goal 1.53
_T = 'pa_lastsecond_s7'
_c = _fix(1.75, 498, 182)
EDL['P25h'] = phook(
    [_w(0, 0.95, _T, 0.0, _c, _WIN_SQ),
     _w(0.95, 1.75, _T, 0.95, _c, _WIN_SQ, rate=0.5),
     _w(1.75, 2.25, _T, 1.35, _c, _WIN_SQ),
     _w(2.25, _H, _T, 1.85, _fix(1.0, 320, 180), _WIN_SQ)],
    [_cams('squads', [_cam('NGH', 0, talk=[[0.2, 0.6], [1.95, 3.6]], react=[[1.7, '😳'], [1.98, '🔥']]),
                      _cam('tuanbeo', 0, talk=[[1.95, 3.6]], react=[[2.05, '😱']]),
                      _cam('kaito_04', 0, talk=[[1.95, 3.6]], react=[[2.0, '🙏']]),
                      _cam('zzz_mi', 1, react=[[2.05, '🤦']]),
                      _cam('bigboss99', 1, react=[[1.7, '😱'], [2.0, '😭']]),
                      _cam('xX_vex_Xx', 1, react=[[2.1, '💀']])]),
     _m('last second.<br>2-2.', 0, 1.6, _CAP_SQ, 104, pop=False),
     _m('thank you 🙏', 1.96, _H, _CAP_SQ, 104),
     _chat('bigboss99', "I'm uninstalling", 2.6, _H, _CH_SQ)],
    [['tension', 0, 0.95, {}], ['calm', 0.95, 1.75, {}], ['groove', 1.93, _H, {}]], [[1.65, 1.2], [1.93, 1.5]], heart=[[0, 0.95]], nocut=[0.95, 1.75])
