# bodies B7-B11 (alternative 4.0-11.4 middles, see ../bodies.md). exec'd by edl.py with seg / meme / F / body / SPLIT / EDL in scope.
# New takes: frames/bb_<scene>_s7 (scenes_bb.js, 2v2 like every other take). Reused: g_blackhole, gb_ghost_ball, r2_curve, sb_face_save,
# giant_keeper, ga_ppass, gb_tiki, gb_wall_slam, nopass. body() adds the end card at 10.2; each body gives a dimmed seg under it.

def _fz(z, fx, fy):
    return {'z': z, 'fx': fx, 'fy': fy}

def _freeze(a, b, take, c, z=2.3):
    return seg(a, b, take, c, rate=0, cam={'z': z, 'fx': 'focus', 'fy': 'focus'})

def _tag(a, b, c, t0, t1, y=1380):
    return {'k': 'tag', 'a': a, 'b': b, 'c': c, 't0': t0, 't1': t1, 'y': y}

_END = 11.4
_DRAFT_Y = 1560     # captions over a draft screen sit under the card (as in G43)

# B7 BUILD / DRAFT: STARTING CORE 1/5, the cursor walks to Black Hole Shot, pick -> it in action -> CORE UPGRADE 2/5, Fireball ->
#    both on one charged shot: a burning black hole drags the defenders and the keeper through the fire into the net
#    marks: bb_draft1 sel 0.5/1.0, pick 1.6 · g_blackhole shot 0.6 · bb_draft2 sel 0.5, pick 1.17 · bb_stack shot 0.6, goal 2.33
EDL['B7'] = body(
    [seg(4.0, 5.6, 'bb_draft1_s7', 0.0, cam=F(2.0, 0.3)),
     seg(5.6, 6.9, 'g_blackhole_s7', 0.48, rate=1.1, cam=F(1.9, 0.2)),
     seg(6.9, 7.9, 'bb_draft2_s7', 0.15, cam=F(2.0, 0.3)),
     seg(7.9, 10.2, 'bb_stack_s7', 0.33, cam=F(1.9, 0.2)),
     seg(10.2, _END, 'bb_stack_s7', 2.6, rate=0.65, cam=F(1.9, 0.2), dim=0.82)],
    [meme('and you pick<br>superpowers', 4.05, 5.55, y=_DRAFT_Y),
     _tag('PICK 1', 'BLACK HOLE SHOT', '#9d7bff', 5.67, 6.85),
     meme('then stack<br>another', 6.93, 7.88, y=_DRAFT_Y),
     _tag('PICK 1 + PICK 2', 'BLACK HOLE<br>+ FIREBALL', '#ff8a3d', 8.2, 10.15),
     meme('build your own<br>playstyle', 8.95, 10.15)],
    [['groove', 4.0, 10.2, {'melodyFrom': 7.9}], ['outro', 10.2, _END, {}]],
    [[4.0, 0.7], [5.6, 1.0], [7.9, 1.0], [9.9, 1.2], [10.2, 1.3]])

# B8 RIVAL: he dropkicks me off the ball -> CORE UPGRADE 2/5: Giant Fist -> EZ... GIANT! (freeze on REVENGE!), he flies into his own keeper,
#    I take it back and score
#    marks: bb_revenge kick 0.3, fly 0.67, ez 2.77, punch 3.17, payback 3.37, own 3.57, shot 3.83, goal 4.0 · bb_draft3 sel 0.5, pick 1.17
EDL['B8'] = body(
    [seg(4.0, 5.4, 'bb_revenge_s7', 0.05, cam=F(2.0, 0.15), punch=[4.6]),
     seg(5.4, 6.65, 'bb_draft3_s7', -0.1, cam=F(2.0, 0.3)),
     seg(6.65, 7.35, 'bb_revenge_s7', 2.65, cam=F(2.0, 0.15)),
     _freeze(7.35, 7.6, 'bb_revenge_s7', 3.45, z=2.1),
     seg(7.6, 8.3, 'bb_revenge_s7', 3.45, rate=0.5, cam=F(2.0, 0.15)),
     seg(8.3, 10.2, 'bb_revenge_s7', 3.8, cam=F(1.9, 0.15)),
     seg(10.2, _END, 'bb_revenge_s7', 4.8, cam=F(1.9, 0.15), dim=0.82)],
    [meme('this guy<br>dropkicked me 😐', 4.05, 5.35),
     meme('so I picked<br>GIANT FIST', 5.45, 6.62, y=_DRAFT_Y),
     meme('payback time 😈', 6.7, 8.25),
     meme('revenge is best<br>served giant', 8.4, 10.15)],
    [['groove', 4.0, 10.2, {'melodyFrom': 7.6}], ['outro', 10.2, _END, {}]],
    [[4.0, 0.7], [4.58, 1.1], [6.65, 0.9], [7.35, 1.6], [8.5, 1.2], [10.2, 1.3]],
    mute=[[7.35, 7.6]], nocut=[7.6, 8.3])

# B9 KEEPERS HATE THIS: Ghost Ball (he dives at a fake) -> Dragon Curl round him -> two face saves and it still goes in ->
#    Meteor Shot through the 4-metre keeper (KRAKOOM)
#    marks: gb_ghost_ball shot 1.03, dive 1.37, goal 1.7 · r2_curve shot 0.57, goal 1.07 · sb_face_save shot 0.5, bonk 0.77 / 1.73, goal 2.07 ·
#           giant_keeper kick 3.23, blast 3.9, goal 3.97
EDL['B9'] = body(
    [seg(4.0, 4.45, 'gb_ghost_ball_s7', 0.55, cam=F(2.1, 0.12, dx=30)),
     seg(4.45, 5.25, 'gb_ghost_ball_s7', 1.0, rate=0.5, cam=F(2.1, 0.12, dx=30)),
     seg(5.25, 5.7, 'gb_ghost_ball_s7', 1.4, cam=F(2.1, 0.12, dx=30)),
     seg(5.7, 5.92, 'r2_curve_s7', 0.35, cam=F(2.0, 0.15)),
     seg(5.92, 6.78, 'r2_curve_s7', 0.57, rate=0.5, cam=F(2.0, 0.15)),
     seg(6.78, 7.1, 'r2_curve_s7', 1.0, cam=F(2.0, 0.15)),
     seg(7.1, 8.6, 'sb_face_save_s7', 0.42, rate=1.15, cam=F(2.2, 0.15)),
     seg(8.6, 10.2, 'giant_keeper_s7', 2.9, cam=F(1.8, 0.2, dx=40)),
     seg(10.2, _END, 'giant_keeper_s7', 4.5, rate=0.42, cam=F(1.8, 0.2, dx=40), dim=0.82)],
    [meme('keepers hate<br>this game', 4.05, 5.65),
     _tag('CORE', 'GHOST BALL', '#c69bff', 4.1, 5.65),
     meme('it bent<br>around him', 5.75, 7.05),
     _tag('CORE', 'DRAGON CURL', '#5dff8a', 5.75, 7.05),
     meme('saved it twice.<br>still in 💀', 7.15, 8.55),
     meme('0 clean sheets', 8.65, 10.15),
     _tag('ULTIMATE', 'METEOR SHOT', '#ff6a1f', 8.65, 10.15)],
    [['groove', 4.0, 10.2, {'melodyFrom': 7.1}], ['outro', 10.2, _END, {}]],
    [[4.0, 0.7], [5.55, 1.0], [6.85, 1.0], [7.4, 0.8], [8.24, 0.8], [8.53, 1.0], [9.6, 1.5], [10.2, 1.3]],
    nocut=[4.45, 5.25, 5.92, 6.78])

# B10 TEAMWORK: golden Phantom Pass through three of them -> Endless Tiki-Taka, goal -> the wall assist, goal ->
#    the teammate who wanted it: PASS!!! ... dropkick (freeze)
#    marks: ga_ppass pass 0.53, recv 1.53 · gb_tiki ult 0.3, shot 1.93, goal 2.2 · gb_wall_slam hit 0.6, back 0.93, shot 2.37, goal 2.53 ·
#           nopass kick 2.57, hit 2.73
EDL['B10'] = body(
    [seg(4.0, 5.5, 'ga_ppass_s7', 0.35, cam=_fz(1.8, 318, 200)),
     seg(5.5, 6.9, 'gb_tiki_s7', 0.85, cam=F(2.1, 0.15)),
     seg(6.9, 7.7, 'gb_wall_slam_s7', 0.35, cam=F(2.15, 0.12)),
     seg(7.7, 8.4, 'gb_wall_slam_s7', 1.95, cam=F(2.0, 0.15)),
     seg(8.4, 9.38, 'nopass_s7', 1.75, cam=F(1.9, 0.14, dy=-12)),
     _freeze(9.38, 9.63, 'nopass_s7', 2.75),
     seg(9.63, 10.2, 'nopass_s7', 2.75, cam=F(1.9, 0.2)),
     seg(10.2, _END, 'nopass_s7', 3.32, cam=F(1.9, 0.2), dim=0.82)],
    [meme("and it's a<br>team game", 4.05, 5.45),
     _tag('CORE', 'PHANTOM PASS', '#ffe14f', 4.1, 5.45, y=1540),
     meme('tiki-taka<br>but anime', 5.55, 6.85),
     _tag('ULTIMATE', 'ENDLESS TIKI-TAKA', '#7fe7ff', 5.55, 6.85),
     meme('even the wall<br>assists 🧱', 6.95, 8.35, y=1380),
     _tag('CORE', 'WALL SLAM', '#ff3d5a', 6.95, 8.35, y=1620),
     meme('pass it or get<br>dropkicked', 8.45, 10.15)],
    [['groove', 4.0, 10.2, {'melodyFrom': 6.9}], ['outro', 10.2, _END, {}]],
    [[4.0, 0.7], [4.23, 0.9], [6.82, 1.0], [7.15, 1.2], [8.28, 1.0], [9.38, 1.5], [10.2, 1.3]],
    mute=[[9.38, 9.63]], nocut=[9.63])

# B11 CLUTCH: 1-2, 0:05, FINAL PUSH (goals x2) -> the steal -> CLONE ARMY -> the keeper bites on a decoy (slow-mo) -> GOAL x2 -> 3-2
#    marks: bb_clutch punch 0.57, own 0.87, ult 2.27 (cut-in to 2.87), shot 3.97, goal 4.13
EDL['B11'] = body(
    [seg(4.0, 5.55, 'bb_clutch_s7', 0.0, layout='fit', h=1470, cam=_fz(1.36, 320, 180)),
     seg(5.55, 6.55, 'bb_clutch_s7', 2.15, layout='fit', h=1470, cam=_fz(1.36, 418, 180)),
     seg(6.55, 7.2, 'bb_clutch_s7', 3.15, cam=F(1.9, 0.18)),
     seg(7.2, 8.0, 'bb_clutch_s7', 3.8, rate=0.5, cam=F(1.9, 0.18)),
     seg(8.0, 8.4, 'bb_clutch_s7', 4.2, cam=F(1.9, 0.18)),
     seg(8.4, 10.2, 'bb_clutch_s7', 4.6, cam={'z': 1.8, 'fx': 300, 'fy': 150, 'drift': 0.12}),
     seg(10.2, _END, 'bb_clutch_s7', 6.4, rate=0.1, cam=_fz(2.0, 300, 150), dim=0.82)],
    [meme('down 1-2.<br>5 seconds left.', 4.05, 5.5, y=1655),
     meme('goals count<br>double 👀', 5.6, 7.0, y=1655),
     meme("it's never<br>over", 8.45, 10.15, y=1420, size=104)],
    [['tension', 4.0, 5.55, {}], ['groove', 5.55, 10.2, {'melodyFrom': 7.2}], ['outro', 10.2, _END, {}]],
    [[4.0, 0.7], [4.63, 0.9], [5.55, 1.2], [7.86, 1.4], [8.4, 1.0], [10.2, 1.3]],
    heart=[[4.0, 5.5]], nocut=[7.2, 8.0])
