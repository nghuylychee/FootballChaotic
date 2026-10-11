# batch gc: G37-G48 gameplay / screen hooks (0-4.0 s, then the shared BODY). Takes: frames/gc_<scene>_s7 (scenes_gc.js).
# exec'd by edl.py with seg / meme / F / rg / SPLIT / EDL in scope.

def _fix(z, fx, fy):
    return {'z': z, 'fx': fx, 'fy': fy}

def _freeze(a, b, take, c):
    return seg(a, b, take, c, rate=0, cam={'z': 2.3, 'fx': 'focus', 'fy': 'focus'})


# G37 CHAOS BALL: every touch rolls the ball into something else: pass = melon, pass back = cube, shot = wheel -> goal
EDL['G37'] = rg([seg(0, 1.5, 'gc_chaos_s7', 0.22, rate=0.6, cam=F(2.5, 0.22, dy=-25)),
                 seg(1.5, 2.4, 'gc_chaos_s7', 1.12, rate=0.8, cam=F(2.5, 0.22, dy=-25)),
                 seg(2.4, SPLIT, 'gc_chaos_s7', 1.84, cam=F(2.4, 0.2, dy=-18))],
                [meme('the ball turned<br>into a melon', 0, 1.5, pop=False, size=96), meme('then a cube', 1.55, 2.4, size=104),
                 meme('then a WHEEL', 2.45, 3.95, size=104)],
                [['groove', 0, SPLIT, {}]], [[0.13, 0.7], [1.56, 0.8], [2.59, 0.9], [3.56, 1.1]], nocut=[1.5, 2.4])

# G38 WARP WALLS: shot into the top wall... out of the bottom wall, past the wall of defenders and in; slow replay of the warp
EDL['G38'] = rg([seg(0, 1.75, 'gc_warp_s7', 0.3, cam=_fix(1.6, 500, 203)),
                 seg(1.75, 3.35, 'gc_warp_s7', 1.3, rate=0.375, cam=_fix(1.6, 500, 203)),
                 seg(3.35, SPLIT, 'gc_warp_s7', 2.05, cam=_fix(1.6, 500, 203))],
                [meme('he shot at<br>the wall??', 0, 1.2, pop=False, size=100, y=110), meme('the ball<br>TELEPORTED 🌀', 1.25, 3.95, size=100, y=110)],
                [['pulse', 0, 1.23, {}], ['groove', 1.23, SPLIT, {}]], [[1.23, 1.2], [1.73, 1.0]])

# G39 COUNTER ATTACK: they all attack, one punch wins it -> COUNTER! -> he and his mate surge the length of the pitch -> goal
EDL['G39'] = rg([seg(0, 1.4, 'gc_counter_s7', 0.0, layout='fit', h=1300, cam=_fix(1.2, 290, 180)),
                 seg(1.4, SPLIT, 'gc_counter_s7', 1.4, cam=F(1.9, 0.2))],
                [meme('counter<br>attack ⚡', 0, 1.6, pop=False, size=104, y=60), meme('steal to goal:<br>2 seconds', 1.7, 3.95, size=92)],
                [['pulse', 0, 0.43, {}], ['groove', 0.43, SPLIT, {}]], [[0.43, 1.0], [2.6, 1.1]])

# G40 BOMB BALL: hot potato. He passes the bomb away, it comes straight back, every time... everyone backs off, KABOOM on him
EDL['G40'] = rg([seg(0, 3.0, 'gc_bomb_s7', 0.13, cam=_fix(2.1, 322, 185)),
                 seg(3.0, 3.25, 'gc_bomb_s7', 3.13, rate=0, cam=_fix(2.3, 322, 185)),
                 seg(3.25, SPLIT, 'gc_bomb_s7', 3.13, cam=_fix(2.1, 322, 185))],
                [meme("don't pass<br>it to me", 0, 1.7, pop=False, size=104), meme('they keep<br>passing it back', 1.75, 2.95, size=88),
                 meme('teamwork 💀', 3.05, 3.95, size=104)],
                [['tension', 0, 3.0, {}], ['groove', 3.25, SPLIT, {}]], [[3.0, 1.6]], mute=[[3.0, 3.25]], nocut=[3.25])

# G45 FINAL PUSH: down 1-2, the last 30 s start (goals x2), he scores -> GOAL x2! -> 3-2
EDL['G45'] = rg([seg(0, 1.15, 'gc_final_s7', 0.3, layout='fit', h=1100, cam=_fix(1.25, 319, 147)),
                 seg(1.15, 2.0, 'gc_final_s7', 1.45, cam=F(1.9, 0.2)),
                 seg(2.0, SPLIT, 'gc_final_s7', 2.3, cam=_fix(1.8, 319, 150))],
                [meme('goals count<br>double now', 0, 1.95, pop=False, size=96, y=110), meme('1-2 → 3-2<br>with one goal', 2.05, 3.95, size=96)],
                [['tension', 0, 1.15, {}], ['groove', 1.15, SPLIT, {}]], [[0.15, 0.8], [1.93, 1.3]])

# G46 TITAN vs TITAN: both already giant, they stomp through the little guys (BONK) and crash: KRAKOOM, both bounce off
EDL['G46'] = rg([seg(0, 0.7, 'gc_titans_s7', 1.5, cam=F(1.75, 0.2)),
                 seg(0.7, 1.4, 'gc_titans_s7', 2.2, rate=0.4, cam=F(1.75, 0.2)),
                 _freeze(1.4, 1.65, 'gc_titans_s7', 2.48),
                 seg(1.65, 3.02, 'gc_titans_s7', 2.48, rate=0.6, cam=F(1.75, 0.2)),
                 seg(3.02, SPLIT, 'gc_titans_s7', 3.3, cam=F(1.75, 0.2))],
                [meme('kaiju<br>football', 0, 1.4, pop=False, size=120, y=1330), meme("the little guys<br>didn't make it 💀", 1.7, 3.95, size=88)],
                [['tension', 0, 1.4, {}], ['groove', 1.65, SPLIT, {}]], [[1.4, 1.6]], mute=[[1.4, 1.65]], nocut=[0.7, 1.65, 3.02])

# G47 METEOR DROP, 2 for 1: they close in from both sides, he leaps off the map, they bonk heads, the meteor gets both
EDL['G47'] = rg([seg(0, 0.45, 'gc_drop2_s7', 0.0, cam=_fix(2.0, 320, 205)),
                 seg(0.45, 0.75, 'gc_drop2_s7', 0.45, rate=2.0, cam=_fix(2.0, 320, 205)),
                 seg(0.75, 2.2, 'gc_drop2_s7', 1.05, cam=_fix(2.0, 320, 205)),
                 seg(2.2, 2.45, 'gc_drop2_s7', 2.5, rate=0, cam=_fix(2.2, 320, 205)),
                 seg(2.45, SPLIT, 'gc_drop2_s7', 2.5, rate=0.6, cam=_fix(2.0, 320, 200))],
                [meme('they double<br>teamed him', 0, 2.15, pop=False, size=100), meme('2 for 1 💥', 2.25, 3.95, size=120)],
                [['tension', 0, 2.2, {}], ['groove', 2.45, SPLIT, {}]], [[2.2, 1.6]], mute=[[2.2, 2.45]], nocut=[0.45, 2.45])

# G48 LIGHTNING DASH from the kickoff: whistle, ult, lightning through both, goal; slow replay; the clock barely moved
EDL['G48'] = rg([seg(0, 0.5, 'gc_dash_s7', 0.85, cam=F(1.9, 0.25)),
                 seg(0.5, 1.05, 'gc_dash_s7', 1.4, layout='fit', h=1188, cam=_fix(1.1, 443, 180)),
                 seg(1.05, 1.6, 'gc_dash_s7', 1.95, cam=F(1.9, 0.25)),
                 seg(1.6, 2.6, 'gc_dash_s7', 2.08, rate=0.3, cam=_fix(1.9, 445, 205)),
                 seg(2.6, SPLIT, 'gc_dash_s7', 2.5, cam=_fix(2.4, 320, 133))],
                [meme('fastest goal<br>ever?', 0, 1.6, pop=False, size=104), meme('kickoff to goal:<br>1.2 seconds', 1.65, 2.55, size=92),
                 meme('the clock still<br>says 2:30', 2.65, 3.95, size=92)],
                [['pulse', 0, 1.05, {}], ['groove', 1.05, SPLIT, {}]], [[0.45, 0.7], [1.08, 1.3], [1.57, 1.0]])

# ---------------- screens ----------------
# G41 LEGEND BOX: shop -> open -> the reel spins (sped up), slows... LEGENDARY: Flame Hair
EDL['G41'] = rg([seg(0, 0.45, 'gc_box_s7', 0.0, cam=_fix(1.6, 300, 180)),
                 seg(0.45, 2.45, 'gc_box_s7', 0.4, rate=2.0, cam=_fix(1.78, 320, 180)),
                 seg(2.45, 3.05, 'gc_box_s7', 4.4, rate=1.33, cam=_fix(1.78, 320, 180)),
                 seg(3.05, SPLIT, 'gc_box_s7', 5.2, cam=_fix(1.7, 240, 180))],
                [meme('opening a<br>legendary box', 0, 1.7, pop=False, size=100, y=1330), meme('come on<br>come on...', 1.75, 3.0, size=100, y=1330),
                 meme('W pull 🔥', 3.1, 3.95, size=120, y=1330)],
                [['tension', 0, 3.05, {}], ['groove', 3.05, SPLIT, {}]], [[3.05, 1.4]], nocut=[2.45])

# G42 DRIP CHECK: APPEARANCE screen, the outfit swaps on the beat, ends on crown + laser eyes + flame boots + golden aura
EDL['G42'] = rg([seg(0, SPLIT, 'gc_drip_s7', 0.15, cam=_fix(2.6, 443, 212))],
                [meme('drip check', 0, 2.65, pop=False, size=120), meme('final boss<br>fit 👑', 2.7, 3.95, size=104)],
                [['groove', 0, SPLIT, {}]], [[2.6, 1.2]])

# G43 CORE DRAFT: three superpowers, the cursor hops across them, pick Black Hole Shot -> it in action
EDL['G43'] = rg([seg(0, 1.95, 'gc_draft_s7', 0.05, cam=F(2.0, 0.3)),
                 seg(1.95, SPLIT, 'g_blackhole_s7', 0.45, cam=F(1.9, 0.2))],
                [meme('pick your<br>superpower', 0, 1.9, pop=False, size=100, y=1560), meme('black hole<br>it is 🕳️', 2.0, 3.95, size=100)],
                [['tension', 0, 1.95, {}], ['groove', 1.95, SPLIT, {}]], [[1.95, 1.3]])

# G44 STORY MODE: the PROLOGUE cut scene ("I HAVE A DREAM..." / "...TO BE THE GOAT"), then the Main Path: 10 Areas, the far ones locked
EDL['G44'] = rg([seg(0, 1.2, 'gc_story_s7', 0.9, layout='fit', h=810, cam=_fix(0.75, 320, 180)),
                 seg(1.2, 2.0, 'gc_story_s7', 5.2, layout='fit', h=690, cam=_fix(0.64, 320, 180)),
                 seg(2.0, SPLIT, 'gc_path_s7', 0.15, rate=1.5, layout='fit', h=1134, cam=_fix(1.05, 444, 180))],
                [meme('wait, it has a<br>story mode?', 0, 1.95, pop=False, size=96, y=250), meme('10 areas.<br>10 bosses.', 2.05, 3.95, size=100, y=110)],
                [['calm', 0, 2.0, {}], ['groove', 2.0, SPLIT, {}]], [[2.0, 1.0]])
