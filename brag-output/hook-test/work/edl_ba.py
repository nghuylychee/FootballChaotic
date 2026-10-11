# batch ba: alternative bodies B2-B6 (4.0 -> 11.4, the end card from 10.2 is added by body()). exec'd by edl.py with
# seg / meme / F / body / SPLIT / RG_DUR / EDL in scope. New takes: frames/ba_<scene>_s7 (scenes_ba.js).
# Names here are _BA-prefixed: every edl_*.py runs in the same namespace.

def _BA_TAG(a, b, c, t0, t1, y=1400):
    return {'k': 'tag', 'a': a, 'b': b, 'c': c, 't0': t0, 't1': t1, 'y': y}


def _BA_KEY(a, b, c, t0, t1, y=1420):
    return {'k': 'key', 'a': a, 'b': b, 'c': c, 't0': t0, 't1': t1, 'y': y}


def _BA_FIX(z, fx, fy):
    return {'z': z, 'fx': fx, 'fy': fy}


_BA_OUTRO = ['outro', 10.2, RG_DUR, {}]

# B2 ULTIMATES COUNTDOWN: five ultimates in fast cuts, each with its ULTIMATE #n tag, #1 = Meteor Shot into a burning net
# takes: sb_fast_goal (dash 1.0-1.45, goal 1.5) · sd_keeper_fists (hits 2.27-3.6, blast 3.7) · sb_aura_ring (faints 1.93-2.73, KO x4 2.8)
#        gc_titans (BONK 2.3, KRAKOOM 2.48) · sd_dodge (leap 1.0, meteor 1.63, NOPE x3, goal 2.2, FWOOSH 2.53)
EDL['B2'] = body(
    [seg(4.0, 5.15, 'sb_fast_goal_s7', 0.98, cam=F(1.7, 0.35)),
     seg(5.15, 6.3, 'sd_keeper_fists_s7', 2.45, rate=1.15, cam=F(2.1, 0.15)),
     seg(6.3, 7.45, 'sb_aura_ring_s7', 1.8, rate=1.1, cam=F(2.1, 0.12)),
     seg(7.45, 8.6, 'gc_titans_s7', 1.9, cam=F(1.75, 0.2)),
     seg(8.6, 10.2, 'sd_dodge_s7', 1.0, cam=F(1.85, 0.18)),
     seg(10.2, RG_DUR, 'sd_dodge_s7', 2.6, cam=F(1.85, 0.18), dim=0.82)],
    [meme('wait till you see<br>the ultimates', 4.05, 5.85, size=88),
     _BA_TAG('ULTIMATE #5', 'LIGHTNING DASH', '#7fe7ff', 4.15, 5.12),
     _BA_TAG('ULTIMATE #4', 'HUNDRED FISTS', '#ff3d5a', 5.2, 6.27),
     _BA_TAG('ULTIMATE #3', 'AURA FARMING', '#ffe14f', 6.35, 7.42),
     _BA_TAG('ULTIMATE #2', 'TITAN', '#ff9a3d', 7.5, 8.57),
     _BA_TAG('ULTIMATE #1', 'METEOR SHOT', '#ff6a1f', 8.65, 10.15),
     meme('which one<br>is broken? 👇', 8.7, 10.15, size=100)],
    [['groove', 4.0, 10.2, {'melodyFrom': 7.45}], _BA_OUTRO],
    [[4.0, 0.7], [6.21, 1.1], [7.0, 0.8], [8.03, 1.3], [9.8, 1.2], [10.2, 1.3]])

# B3 STORY MODE: PROLOGUE cut scene (I HAVE A DREAM... / ...TO BE THE GOAT), grandpa's heirloom (LET IT OUT -> AURA FARMING),
# then the Main Path flipping through the 10 Areas (the far ones locked)
# takes: gc_story (dream 0.6, flash 3.0, GOAT 3.9, sub 4.8) · ba_transform (burst 2.0, AURA FARMING 2.05) · gc_path (area v every 0.3 from 0.3)
EDL['B3'] = body(
    [seg(4.0, 5.2, 'gc_story_s7', 0.6, layout='fit', h=810, cam=_BA_FIX(0.75, 320, 180)),
     seg(5.2, 6.3, 'gc_story_s7', 3.85, layout='fit', h=690, cam=_BA_FIX(0.64, 320, 180)),
     seg(6.3, 7.6, 'ba_transform_s7', 1.3, rate=1.1, layout='fit', h=810, cam=_BA_FIX(0.75, 320, 180)),
     seg(7.6, 10.2, 'gc_path_s7', 0.15, rate=1.15, layout='fit', h=1134, cam=_BA_FIX(1.05, 444, 180)),
     seg(10.2, RG_DUR, 'gc_path_s7', 3.14, layout='fit', h=1134, cam=_BA_FIX(1.05, 444, 180), dim=0.82)],
    [meme('it even has<br>a story mode', 4.05, 5.6, y=250, size=96),
     meme("grandpa's<br>secret move", 6.35, 7.55, y=250, size=100),
     meme('10 areas.<br>10 bosses.', 8.75, 10.15, y=110, size=100)],
    [['tension', 4.0, 6.94, {}], ['groove', 6.94, 10.2, {}], _BA_OUTRO],
    [[4.0, 0.6], [6.94, 1.4], [8.77, 0.7], [10.2, 1.3]])

# B4 DRIP AND LOOT: Legend Box (the reel spins, stops, LEGENDARY Flame Hair), then the outfit swaps on the beat, ends on crown +
# laser eyes + golden aura. takes: gc_box (open 0.37, reel stopped ~3.6, reveal 5.17-5.33) · gc_drip (fit i at 0.367 + 0.3 i, last = 8)
# drip at rate 0.8: one fit per beat (160 BPM, grid pinned at 4.0): fit3 at 7.0 ... fit8 (final) at 8.875
EDL['B4'] = body(
    [seg(4.0, 4.45, 'gc_box_s7', 0.0, cam=_BA_FIX(1.6, 300, 180)),
     seg(4.45, 5.45, 'gc_box_s7', 0.4, rate=3.2, cam=_BA_FIX(1.78, 320, 180)),
     seg(5.45, 5.75, 'gc_box_s7', 4.9, cam=_BA_FIX(1.78, 320, 180)),
     seg(5.75, 6.75, 'gc_box_s7', 5.2, cam=_BA_FIX(1.7, 240, 180)),
     seg(6.75, 10.2, 'gc_drip_s7', 1.0667, rate=0.8, cam=_BA_FIX(2.6, 443, 212)),
     seg(10.2, RG_DUR, 'gc_drip_s7', 3.8267, rate=0.8, cam=_BA_FIX(2.6, 443, 212), dim=0.82)],
    [meme('and you can<br>dress your player', 4.05, 5.7, y=1330, size=96),
     meme('W pull 🔥', 5.8, 6.7, y=1330, size=120),
     meme('fit check 👀', 6.8, 8.8, y=300, size=104),
     meme('drip > skill', 8.92, 10.15, y=300, size=120)],
    [['tension', 4.0, 5.75, {}], ['groove', 5.75, 10.2, {'melodyFrom': 8.875}], _BA_OUTRO],
    [[4.0, 0.6], [5.75, 1.3], [8.875, 1.2], [10.2, 1.3]], nocut=[5.45])

# B5 CHAOS REEL: kickoff brawl (SMASH!!), the ball turns into a chicken (BAWK!), bowling STRIKE!, dropkicked to orbit (BYE!) and back (KRAKOOM!!),
# dominoes round the U and back onto him (BONK!)
# takes: kickoff (SMASH 1.13) · chicken (shot 0.77, chicken 0.93, NOPE 1.53) · bowling (shot 1.1, STRIKE 1.53) · orbit (launch 0.57, land 3.73)
#        sa_domino (punch 0.87, d1-d9 0.97-2.57, karma 2.7)
EDL['B5'] = body(
    [seg(4.0, 5.2, 'kickoff_s7', 0.55, cam=_BA_FIX(1.9, 320, 200)),
     seg(5.2, 6.3, 'chicken_s7', 0.8, cam=F(2.6, 0.2)),
     seg(6.3, 7.4, 'bowling_s7', 1.05, cam=F(1.85, 0.22)),
     seg(7.4, 7.85, 'orbit_s7', 0.35, cam=F(1.9, 0.2)),           # BYE! (sent to orbit)
     seg(7.85, 8.5, 'orbit_s7', 3.55, cam=F(1.9, 0.2)),           # ...lands on the keeper: KRAKOOM!!
     seg(8.5, 10.2, 'sa_domino_s7', 0.8, rate=1.45, cam=_BA_FIX(2.5, 318, 150)),
     seg(10.2, RG_DUR, 'sa_domino_s7', 3.27, cam=_BA_FIX(2.5, 318, 150), dim=0.82)],
    [meme('every match<br>looks like this', 4.05, 5.55, size=96),
     meme('no two matches<br>are the same', 8.55, 10.15, size=92)],
    [['groove', 4.0, 10.2, {'melodyFrom': 7.4}], _BA_OUTRO],
    [[4.0, 0.7], [4.58, 1.2], [6.78, 1.2], [8.03, 1.3], [9.81, 1.0], [10.2, 1.3]])

# B6 CONTROLS: D PUNCH (jab, POW, ball won) · A DROPKICK (! windup, SMASH, he flies) · Z DODGE (dash through the dropkick: DODGE / MISS)
# · X ULTIMATE (Meteor Drop: cut-in, crash, KRAKOOM) · then the fight cloud: infinite chaos.
# takes: ba_punch (punch 0.6) · ba_kick (windup 0.5, hit 0.8) · ba_dodge (windup 0.57, dash 0.77) · gc_drop2 (ult 0.43, crash 2.43)
#        sd_royale (cloud 0.83-2.6)
EDL['B6'] = body(
    [seg(4.0, 5.2, 'ba_punch_s7', 0.2, cam=F(2.7, 0.12)),
     seg(5.2, 6.4, 'ba_kick_s7', 0.3, cam=F(2.4, 0.15)),
     seg(6.4, 7.6, 'ba_dodge_s7', 0.4, cam=F(2.6, 0.12)),
     seg(7.6, 8.05, 'gc_drop2_s7', 0.4, rate=1.2, cam=_BA_FIX(2.0, 320, 205)),
     seg(8.05, 9.0, 'gc_drop2_s7', 2.15, cam=_BA_FIX(2.0, 320, 205)),
     seg(9.0, 10.2, 'sd_royale_s7', 0.85, cam=_BA_FIX(2.7, 320, 192)),
     seg(10.2, RG_DUR, 'sd_royale_s7', 2.05, cam=_BA_FIX(2.6, 320, 200), dim=0.82)],
    [meme('4 buttons<br>to fight.', 4.05, 5.35, size=104),
     _BA_KEY('D', 'PUNCH', '#ffe14f', 4.3, 5.17),
     _BA_KEY('A', 'DROPKICK', '#ff3d5a', 5.25, 6.37),
     _BA_KEY('Z', 'DODGE', '#7fe7ff', 6.45, 7.57),
     _BA_KEY('X', 'ULTIMATE', '#ff6a1f', 7.65, 8.97),
     meme('infinite chaos.', 9.05, 10.15, size=110)],
    [['groove', 4.0, 10.2, {'melodyFrom': 7.6}], _BA_OUTRO],
    [[4.0, 0.7], [4.47, 0.8], [5.7, 1.1], [8.4, 1.4], [10.2, 1.3]])
