src = open('edl_pa.py', encoding='utf-8').read()


def rep(old, new, cnt=1):
    global src
    assert src.count(old) == cnt, (src.count(old), old[:90])
    src = src.replace(old, new)


# P1: camera a little higher so the flight stays under the caption
rep("_T = 'pa_1v1_s7'\n_c = _fix(1.7, 345, 182)", "_T = 'pa_1v1_s7'\n_c = _fix(1.7, 345, 162)")
# P2: before the punch on the two of them, after it on the wall (camera at its top limit so the wall sits under the caption)
rep("""_T = 'pa_ez_s7'
_c = F(1.7, 0.2, dy=-25)
EDL['P2h'] = phook(
    [_w(0, 1.0, _T, 0.0, _c, _WIN_DUO),
     _w(1.0, 1.25, _T, 1.0, _fix(1.9, 'focus', 'focus'), _WIN_DUO, rate=0),
     _w(1.25, _H, _T, 1.0, _c, _WIN_DUO)],""",
    """_T = 'pa_ez_s7'
EDL['P2h'] = phook(
    [_w(0, 1.0, _T, 0.0, _fix(1.7, 305, 200), _WIN_DUO),
     _w(1.0, 1.25, _T, 1.0, _fix(1.9, 'focus', 'focus'), _WIN_DUO, rate=0),
     _w(1.25, _H, _T, 1.0, _fix(1.6, 362, 100), _WIN_DUO)],""")
rep("_m('karma has<br>5 rage 💀', 1.3, _H, _CAP_DUO, 92)", "_m('instant<br>karma 💀', 1.3, _H, _CAP_DUO, 100)")
# P3: a bit wider, a bit lower
rep("[_w(0, _H, _T, 0.0, _fix(1.6, 168, 178), _WIN_SQ)]", "[_w(0, _H, _T, 0.0, _fix(1.5, 172, 170), _WIN_SQ)]")
# P4: after the goal, the whole pitch: GOAL x2 banner + the score
rep("[_w(0, _H, _T, 0.1, F(1.55, 0.15, dy=-28), _WIN_SQ)]",
    "[_w(0, 2.45, _T, 0.1, F(1.55, 0.15, dy=-28), _WIN_SQ),\n     _w(2.45, _H, _T, 2.55, _fix(1.0, 320, 180), _WIN_SQ)]")
# P8: fixed, camera at its top limit
rep("_T = 'pa_trash_s7'\n_c = F(1.8, 0.2, dy=-20)", "_T = 'pa_trash_s7'\n_c = _fix(1.6, 460, 100)")
rep("_w(1.35, 1.6, _T, 1.5, _fix(1.95, 'focus', 'focus'), _WIN_DUO, rate=0),\n     _w(1.6, _H, _T, 1.5, _c, _WIN_DUO)],",
    "_w(1.35, 1.6, _T, 1.53, _fix(1.8, 460, 100), _WIN_DUO, rate=0),\n     _w(1.6, _H, _T, 1.53, _c, _WIN_DUO)],")
# P11: lower in the window (TRIPLE! clears the caption)
rep("[_w(0, _H, _T, 0.2, F(1.55, 0.2, dy=-22), _WIN_SQ)],\n    [_cams('squads', [_cam('NGH', 0, talk=[[0.0, 0.55]",
    "[_w(0, _H, _T, 0.2, F(1.55, 0.2, dy=-36), _WIN_SQ)],\n    [_cams('squads', [_cam('NGH', 0, talk=[[0.0, 0.55]")
# P12: wide enough for the whole LEFT banner
rep("_w(1.0, 1.9, _T, 1.15, _fix(1.06, 310, 168), _WIN_DUO),", "_w(1.0, 1.9, _T, 1.15, _fix(0.92, 318, 180), _WIN_DUO),")
# P17: shorter first caption (3 lines before), lower skull
rep("_m('when the whole lobby<br>only dropkicks', 0, 1.6, _CAP_SQ, 84, pop=False),", "_m('when the lobby<br>only dropkicks', 0, 1.6, _CAP_SQ, 96, pop=False),")
rep("_m('nobody survived 💀', 1.7, 2.9, _CAP_SQ, 96),", "_m('nobody<br>survived 💀', 1.7, 2.9, _CAP_SQ, 96),")
# P19: freeze two frames after the white impact flash
rep("_w(1.57, 1.82, _T, 1.57, _fix(1.95, 'focus', 'focus'), _WIN_DUO, rate=0),\n     _w(1.82, _H, _T, 1.57, _c, _WIN_DUO)],",
    "_w(1.57, 1.82, _T, 1.63, _fix(1.95, 'focus', 'focus'), _WIN_DUO, rate=0),\n     _w(1.82, _H, _T, 1.63, _c, _WIN_DUO)],")
# P25: after the goal, the whole pitch: GOAL x2 / Own goal! banner
rep("     _w(1.75, _H, _T, 1.27, _c, _WIN_SQ)],\n    [_cams('squads', [_cam('NGH', 0, talk=[[0.3, 0.6], [1.95, 3.6]]",
    "     _w(1.75, 2.25, _T, 1.27, _c, _WIN_SQ),\n     _w(2.25, _H, _T, 1.77, _fix(1.0, 320, 180), _WIN_SQ)],\n    [_cams('squads', [_cam('NGH', 0, talk=[[0.3, 0.6], [1.95, 3.6]]")
open('edl_pa.py', 'w', encoding='utf-8').write(src)

s = open('scenes_pa.js', encoding='utf-8').read()
old = "for (const [a, c, dy] of pairs) { const sy = dy < 0 ? -1 : dy > 0 ? 1 : 0.15; smash(a, -230, sy * 170, 190, 3.2); smash(c, 230, sy * 170 + (dy === 0 ? -20 : 0), 190, 3.2); }"
assert s.count(old) == 1
s = s.replace(old, old.replace('190, 3.2)', '190, 6)'))
old = "if (B.marks.boom != null && B.t - B.marks.boom > 1.1 && B.marks.roll == null) { mark('roll'); b.vx = 150; b.vy = 0; }\n        if (B.marks.roll != null && B.marks.goal == null) { const G0 = g.attackGoal(0); b.owner = null; b.vx = Math.max(b.vx, 120); b.vy = (G0.y - b.y) * 0.8; }"
assert s.count(old) == 1
s = s.replace(old, "if (B.marks.boom != null && B.t - B.marks.boom > 1.0 && B.marks.roll == null) { mark('roll'); b.vx = 175; b.vy = 0; }\n        if (B.marks.roll != null && B.marks.goal == null) { const G0 = g.attackGoal(0); b.owner = null; b.z = 0; b.vz = 0; b.vx = Math.max(b.vx, 175); b.vy = (G0.y - b.y) * 0.8; }")
open('scenes_pa.js', 'w', encoding='utf-8').write(s)
print('ok')
