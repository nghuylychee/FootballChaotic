src = open('edl_pa.py', encoding='utf-8').read()


def rep(old, new, cnt=1):
    global src
    assert src.count(old) == cnt, (src.count(old), old[:90])
    src = src.replace(old, new)


# P4 goal v2.3
rep("[['tension', 0, 2.37, {}], ['groove', 2.37, _H, {}]], [[0.37, 0.8], [2.37, 1.6]], heart=[[0, 0.37]])",
    "[['tension', 0, 2.3, {}], ['groove', 2.3, _H, {}]], [[0.33, 0.8], [2.3, 1.6]], heart=[[0, 0.33]])")
rep("_m('PROMOTED 🔥', 2.4, _H, _CAP_SQ, 110)", "_m('PROMOTED 🔥', 2.33, _H, _CAP_SQ, 110)")
# P5 goal v1.45
rep("[['calm', 0, 1.48, {}], ['groove', 1.48, _H, {}]], [[1.48, 1.2]])", "[['calm', 0, 1.45, {}], ['groove', 1.45, _H, {}]], [[1.45, 1.2]])")
# P9 goal 1.57
rep("[['calm', 0, 1.47, {}], ['groove', 1.47, _H, {}]], [[1.47, 1.2]])", "[['calm', 0, 1.47, {}], ['groove', 1.47, _H, {}]], [[1.47, 0.9], [1.57, 1.2]])")
# P10 impact
rep("_IMP = 2.17     # video time of the crash (take 2.27)", "_IMP = 2.13     # video time of the crash (take 2.23)")
# P11 goal 1.83
rep("talk=[[0.0, 0.55], [2.15, 3.3]], react=[[0.9, '😈'], [2.2, '🔥']]", "talk=[[0.0, 0.55], [1.85, 3.3]], react=[[0.9, '😈'], [1.88, '🔥']]")
rep("talk=[[0.5, 0.8], [2.2, 3.3]], react=[[0.95, '😈'], [2.3, '😂']]", "talk=[[0.5, 0.8], [1.9, 3.3]], react=[[0.95, '😈'], [1.95, '😂']]")
rep("talk=[[0.5, 0.8], [2.2, 3.3]], react=[[1.0, '😈'], [2.25, '🔥']]", "talk=[[0.5, 0.8], [1.9, 3.3]], react=[[1.0, '😈'], [1.92, '🔥']]")
rep("_cam('m0le', 1, react=[[2.2, '😭']])", "_cam('m0le', 1, react=[[1.9, '😭']])")
rep("[['pulse', 0, 0.78, {}], ['groove', 0.78, _H, {}]], [[0.78, 1.3], [2.13, 1.0]])", "[['pulse', 0, 0.77, {}], ['groove', 0.77, _H, {}]], [[0.77, 1.3], [1.83, 1.0]])")
rep("hit=[0.78], dead=1.05", "hit=[0.77], dead=1.05")
# P12 steal 1.58, goal 2.38
rep("react=[[0.3, '😈'], [1.15, '😂'], [1.55, '😳'], [2.5, '💀']], hit=[1.48]", "react=[[0.3, '😈'], [1.15, '😂'], [1.62, '😳'], [2.42, '💀']], hit=[1.58]")
rep("_m('the bot that<br>replaced him:', 1.55, 2.45, _CAP_DUO, 92),\n     _m('...is better 💀', 2.5, _H, _CAP_DUO, 100),",
    "_m('the bot that<br>replaced him:', 1.55, 2.38, _CAP_DUO, 92),\n     _m('...is better 💀', 2.42, _H, _CAP_DUO, 100),")
rep("[[0.62, 1.2], [1.48, 0.9], [2.45, 1.2]]", "[[0.62, 1.2], [1.58, 0.9], [2.38, 1.2]]")
# P14 goal 2.37
rep("react=[[0.1, '😂'], [1.35, '😳'], [2.5, '💀']], hit=[1.3, 2.43], dead=2.5", "react=[[0.1, '😂'], [1.3, '😳'], [2.42, '💀']], hit=[1.27, 2.37], dead=2.45")
rep("_m(\"he's in the<br>net too 💀\", 2.48, _H, _CAP_DUO, 96)", "_m(\"he's in the<br>net too 💀\", 2.42, _H, _CAP_DUO, 96)")
rep("[['tension', 0, 2.43, {}], ['groove', 2.43, _H, {}]], [[0.4, 1.0], [2.43, 1.4]])", "[['tension', 0, 2.37, {}], ['groove', 2.37, _H, {}]], [[0.37, 1.0], [2.37, 1.4]])")
# P15 hit 1.13
rep("""    [_w(0, 1.17, _T, 0.1, _c, _WIN_DUO),
     _w(1.17, 1.42, _T, 1.27, _fix(1.95, 'focus', 'focus'), _WIN_DUO, rate=0),
     _w(1.42, _H, _T, 1.27, _c, _WIN_DUO)],""",
    """    [_w(0, 1.13, _T, 0.1, _c, _WIN_DUO),
     _w(1.13, 1.38, _T, 1.23, _fix(1.95, 'focus', 'focus'), _WIN_DUO, rate=0),
     _w(1.38, _H, _T, 1.23, _c, _WIN_DUO)],""")
rep("react=[[0.3, '😅'], [1.45, '💀']], hit=[1.17], dead=1.5", "react=[[0.3, '😅'], [1.42, '💀']], hit=[1.13], dead=1.45")
rep("_m('best friends.<br>different teams.', 0, 1.17, _CAP_DUO, 92, pop=False)", "_m('best friends.<br>different teams.', 0, 1.13, _CAP_DUO, 92, pop=False)")
rep("_m('friendship<br>ended 💀', 1.45, _H, _CAP_DUO, 100)", "_m('friendship<br>ended 💀', 1.4, _H, _CAP_DUO, 100)")
rep("[['tension', 0, 1.17, {}], ['groove', 1.42, _H, {}]], [[1.17, 1.5]], mute=[[1.17, 1.42]])", "[['tension', 0, 1.13, {}], ['groove', 1.38, _H, {}]], [[1.13, 1.5]], mute=[[1.13, 1.38]])")
# P16 faint 1.6
rep("_cam('kaito_04', 0, talk=[[0.75, 1.5]], react=[[1.75, '😵']], hit=[1.63], dead=1.75)", "_cam('kaito_04', 0, talk=[[0.75, 1.5]], react=[[1.7, '😵']], hit=[1.6], dead=1.7)")
rep("_m(\"didn't even<br>touch him\", 1.65, _H, _CAP_DUO, 96)", "_m(\"didn't even<br>touch him\", 1.62, _H, _CAP_DUO, 96)")
rep("_m('he picked<br>aura farming', 0, 1.55, _CAP_DUO, 96, pop=False)", "_m('he picked<br>aura farming', 0, 1.52, _CAP_DUO, 96, pop=False)")
rep("[['calm', 0, 1.63, {}], ['groove', 1.63, _H, {}]], [[0.03, 0.8], [1.63, 1.2]])", "[['calm', 0, 1.6, {}], ['groove', 1.6, _H, {}]], [[0.0, 0.8], [1.6, 1.2]])")
# P17 hit 0.7, slow roll -> fast forward to the goal (take 4.05)
rep("_IMP = 0.75\n_six", "_IMP = 0.7\n_six")
rep("""     _w(_IMP, _IMP + 0.25, _T, 0.77, _fix(1.75, 320, 190), _WIN_SQ, rate=0),
     _w(_IMP + 0.25, 1.75, _T, 0.77, _fix(1.6, 320, 186), _WIN_SQ),
     _w(1.75, _H, _T, 1.9, F(1.6, 0.2, dy=-28), _WIN_SQ)],""",
    """     _w(_IMP, _IMP + 0.25, _T, 0.73, _fix(1.75, 320, 190), _WIN_SQ, rate=0),
     _w(_IMP + 0.25, 1.75, _T, 0.73, _fix(1.6, 320, 186), _WIN_SQ),
     _w(1.75, 2.97, _T, 1.85, F(1.6, 0.25, dy=-28), _WIN_SQ, rate=1.8),
     _w(2.97, _H, _T, 4.05, F(1.6, 0.25, dy=-28), _WIN_SQ, rate=0.5)],""")
rep("_m('nobody survived 💀', 1.7, 2.75, _CAP_SQ, 96),\n     _m('except the ball', 2.8, _H, _CAP_SQ, 96)],",
    "_m('nobody survived 💀', 1.7, 2.9, _CAP_SQ, 96),\n     _m('except the ball ⚽', 2.95, _H, _CAP_SQ, 96)],")
rep("[['tension', 0, _IMP, {}], ['groove', _IMP + 0.25, _H, {}]], [[_IMP, 1.6], [2.75, 1.0]], mute=[[_IMP, _IMP + 0.25]])",
    "[['tension', 0, _IMP, {}], ['groove', _IMP + 0.25, _H, {}]], [[_IMP, 1.6], [2.97, 1.0]], mute=[[_IMP, _IMP + 0.25]], nocut=[2.97])")
# P21 goal 1.62, dash 0.95
rep("[['tension', 0, 0.95, {}], ['groove', 0.95, _H, {}]], [[0.32, 0.8], [1.0, 1.3], [1.68, 1.0]])", "[['tension', 0, 0.95, {}], ['groove', 0.95, _H, {}]], [[0.32, 0.8], [0.95, 1.3], [1.62, 1.0]])")
rep("_cam('NGH', talk=[[0.0, 0.4], [1.75, 2.6]], react=[[1.75, '🔥']])", "_cam('NGH', talk=[[0.0, 0.4], [1.65, 2.6]], react=[[1.65, '🔥']])")
rep("_cam('tuanbeo', talk=[[0.3, 1.3]], react=[[1.7, '😱']])", "_cam('tuanbeo', talk=[[0.3, 1.3]], react=[[1.0, '😱']])")
# P22 passes 0.88 1.08 1.35 1.55, shot 1.78, goal 2.08
rep("_cam('mochi', 0, talk=[[0.0, 0.3], [0.75, 0.95], [1.2, 1.4], [2.1, 3.3]], react=[[2.15, '🔥']])", "_cam('mochi', 0, talk=[[0.0, 0.3], [0.85, 1.0], [1.32, 1.47], [1.75, 1.9], [2.1, 3.3]], react=[[2.12, '🔥']])")
rep("_cam('DUKE', 0, talk=[[0.97, 1.17], [1.42, 1.62], [2.1, 3.3]], react=[[2.2, '🎶']])", "_cam('DUKE', 0, talk=[[1.05, 1.2], [1.52, 1.67], [2.1, 3.3]], react=[[2.18, '🎶']])")
# P24 hit 1.5
rep("react=[[1.0, '😳'], [1.7, '💀']], hit=[1.53]", "react=[[1.0, '😳'], [1.65, '💀']], hit=[1.5]")
rep("[['tension', 0, 1.0, {}], ['groove', 1.0, _H, {}]], [[0.33, 0.8], [1.53, 1.3]])", "[['tension', 0, 1.0, {}], ['groove', 1.0, _H, {}]], [[0.33, 0.8], [1.5, 1.3]])")
# P25 bonk 1.5
rep("_cam('xX_vex_Xx', 1, react=[[1.55, '💀']], hit=[1.4])", "_cam('xX_vex_Xx', 1, react=[[1.6, '💀']], hit=[1.5])")
rep("react=[[1.45, '😳'], [1.98, '🔥']]", "react=[[1.55, '😳'], [1.98, '🔥']]")
rep("_cam('bigboss99', 1, react=[[1.45, '😱'], [2.05, '😭']])", "_cam('bigboss99', 1, react=[[1.55, '😱'], [2.05, '😭']])")
rep("[[1.4, 1.2], [1.95, 1.5]], heart=[[0, 0.95]], nocut=[0.95, 1.75])", "[[1.5, 1.2], [1.95, 1.5]], heart=[[0, 0.95]], nocut=[0.95, 1.75])")
open('edl_pa.py', 'w', encoding='utf-8').write(src)
print('ok')
