# batch sa: S11-S23 staged skits (scenes in scenes_sa.js). Run through edl.py (seg / meme / F / S / EDL in scope).
FZ = lambda z: {'z': z, 'fx': 'focus', 'fy': 'focus'}   # hold still on the focus at the segment start

# S11 MELON: the shot turns into a watermelon and SPLATs on the keeper; the melon dribbles in
EDL['S11'] = S(4.2, [seg(0, 0.75, 'sa_melon_s7', 0.2, cam=F(1.9, 0.2)),
                     seg(0.75, 1.85, 'sa_melon_s7', 0.95, rate=0.5, cam=F(2.3, 0.2)),
                     seg(1.85, 2.1, 'sa_melon_s7', 1.48, rate=0, cam=FZ(2.7)),
                     seg(2.1, 4.2, 'sa_melon_s7', 1.48, cam=F(2.2, 0.2))],
               [meme('fruit ninja 🍉', 0, 1.8, pop=False, size=110), meme('SPLAT.', 1.88, 3.0, size=124),
                meme('it still<br>counts 💀', 3.05, 4.2, size=96)],
               [['groove', 0, 0.75, {}], ['calm', 0.75, 1.85, {}], ['groove', 2.1, 4.2, {}]],
               [[1.85, 1.5], [3.02, 0.9]], mute=[[1.85, 2.1]], nocut=[0.75])

# S12 CUBE: the shot turns into a cube and tumbles at goal, clunk... clunk... stops on the line... clunk, in
EDL['S12'] = S(4.8, [seg(0, 3.15, 'sa_cube_s7', 0.1, cam=F(2.5, 0.15)),
                     seg(3.15, 3.65, 'sa_cube_s7', 3.25, rate=0.4, cam=F(2.8, 0.15)),
                     seg(3.65, 4.8, 'sa_cube_s7', 3.45, cam=F(2.6, 0.15))],
               [meme('who made<br>this ball', 0, 2.4, pop=False, size=104), meme('one more<br>clunk...', 2.45, 3.48, size=96),
                meme('it counts 😐', 3.55, 4.8, size=104)],
               [['groove', 0, 2.4, {}], ['tension', 2.4, 3.5, {}], ['groove', 3.52, 4.8, {}]],
               [[3.52, 1.3]], nocut=[3.15, 3.65])

# S13 WHEEL: the ball turns into a wheel and runs round the centre circle, all four chase it... and it laps them
WCAM = {'z': 2.1, 'fx': 332, 'fy': 178}
EDL['S13'] = S(4.8, [seg(0, 1.2, 'sa_wheel_s7', 0.0, cam=WCAM),
                     seg(1.2, 2.46, 'sa_wheel_s7', 1.2, rate=1.35, cam=WCAM),
                     seg(2.46, 3.46, 'sa_wheel_s7', 2.9, rate=0.4, cam=WCAM),
                     seg(3.46, 4.8, 'sa_wheel_s7', 3.3, cam=WCAM)],
               [meme('the ball is<br>running away', 0, 1.6, pop=False, size=100), meme('come back 😭', 1.65, 2.42, size=100),
                meme('it LAPPED<br>them 💀', 2.5, 4.8, size=108)],
               [['groove', 0, 2.46, {}], ['calm', 2.46, 3.46, {}], ['groove', 3.46, 4.8, {}]],
               [[2.54, 1.2]], nocut=[1.2, 2.46, 3.46])

# S14 PARKED BUS: all six of them on the goal line, Meteor Shot goes through the lot
EDL['S14'] = S(4.8, [seg(0, 1.5, 'sa_bus_s7', 0.05, cam={'z': 1.9, 'fx': 500, 'fy': 200}),
                     seg(1.5, 2.3, 'sa_bus_s7', 1.5, rate=1.5, cam=F(1.9, 0.2)),
                     seg(2.3, 3.1, 'sa_bus_s7', 2.7, rate=0.5, cam=F(1.9, 0.25)),
                     seg(3.1, 3.35, 'sa_bus_s7', 3.12, rate=0, cam=FZ(2.3)),
                     seg(3.35, 4.8, 'sa_bus_s7', 3.12, cam=F(1.9, 0.2))],
               [meme('6 defenders<br>on the line', 0, 1.5, pop=False, size=100), meme('watch this', 1.55, 3.05, size=96),
                meme("parking the bus<br>didn't work", 3.38, 4.8, size=88)],
               [['tension', 0, 3.1, {}], ['groove', 3.35, 4.8, {}]],
               [[3.1, 1.6], [3.4, 0.9]], mute=[[3.1, 3.35]], nocut=[2.3])

# S15 BUDGET KEEPER: their keeper is 0.45x size; full-stretch dive... with tiny legs
TCAM = {'z': 3.4, 'fx': 538, 'fy': 202}
EDL['S15'] = S(4.0, [seg(0, 1.45, 'sa_tiny_s7', 0.05, cam=TCAM),
                     seg(1.45, 2.25, 'sa_tiny_s7', 1.5, rate=0.5, cam=TCAM),
                     seg(2.25, 4.0, 'sa_tiny_s7', 1.9, cam=TCAM)],
               [meme('budget keeper', 0, 1.6, pop=False, size=110), meme('he tried 🥲', 1.9, 4.0, size=110)],
               [['calm', 0, 1.45, {}], ['groove', 1.85, 4.0, {}]],
               [[1.85, 1.2]], nocut=[1.45, 2.25])

# S16 TOO EARLY: shoots, turns away for the SIUUU, the keeper catches it, dropkicked mid-jump
EDL['S16'] = S(4.2, [seg(0, 0.95, 'sa_siuuu_s7', 0.0, cam=F(2.0, 0.15)),
                     seg(0.95, 1.65, 'sa_siuuu_s7', 0.95, rate=0.5, cam=F(2.1, 0.15)),
                     seg(1.65, 1.9, 'sa_siuuu_s7', 1.3, rate=0, cam=FZ(2.4)),
                     seg(1.9, 4.2, 'sa_siuuu_s7', 1.3, cam=F(1.9, 0.2))],
               [meme("don't celebrate<br>too early", 0, 1.65, pop=False, size=92),
                meme('he never finished<br>the siuuu', 1.95, 4.2, size=88)],
               [['groove', 0, 0.95, {}], ['calm', 0.95, 1.65, {}], ['groove', 1.9, 4.2, {}]],
               [[1.65, 1.5]], mute=[[1.65, 1.9]], nocut=[0.95])

# S17 TAP-IN THIEF: my shot is rolling into the empty net, my teammate sprints in and taps it over the line
EDL['S17'] = S(4.1, [seg(0, 2.25, 'sa_tapin_s7', 0.1, cam=F(2.2, 0.12)),
                     seg(2.25, 2.5, 'sa_tapin_s7', 2.33, rate=0, cam=FZ(2.6)),
                     seg(2.5, 4.1, 'sa_tapin_s7', 2.35, cam=F(2.2, 0.15))],
               [meme('my teammate<br>stealing my goal', 0, 2.25, pop=False, size=92),
                meme('it was ALREADY<br>going in 😐', 2.55, 4.1, size=88)],
               [['calm', 0, 2.25, {}], ['groove', 2.5, 4.1, {}]],
               [[2.25, 1.4]], mute=[[2.25, 2.5]])

# S18 WRONG GOAL: the dribble of his life, past everyone... into his own net (the game says "Own goal!")
EDL['S18'] = S(4.3, [seg(0, 2.3, 'sa_wronggoal_s7', 0.05, cam=F(2.0, 0.15)),
                     seg(2.3, 2.6, 'sa_wronggoal_s7', 2.35, rate=0.4, cam=F(2.1, 0.2)),
                     seg(2.6, 4.3, 'sa_wronggoal_s7', 2.47, layout='fit', h=1000, cam={'z': 0.95, 'fx': 232, 'fy': 205})],
               [meme('best dribble<br>of my life', 0, 2.3, pop=False, size=100), meme('wrong goal bro 💀', 2.65, 4.3, size=96)],
               [['groove', 0, 2.3, {}], ['calm', 2.3, 2.6, {}], ['groove', 2.6, 4.3, {}]],
               [[2.6, 1.4]], nocut=[2.3])

# S19 FINALLY GETS THE BALL: four of them round him, the pass arrives... all four dropkick at once
FCAM = {'z': 2.4, 'fx': 334, 'fy': 190}
EDL['S19'] = S(4.15, [seg(0, 1.3, 'sa_finally_s7', 0.0, cam=FCAM),
                      seg(1.3, 1.55, 'sa_finally_s7', 1.38, rate=0, cam=FCAM),
                      seg(1.55, 4.15, 'sa_finally_s7', 1.38, cam=FCAM)],
               [meme('when you finally<br>get the ball', 0, 1.3, pop=False, size=92),
                meme('touched it for<br>0.2 seconds', 1.6, 4.15, size=92)],
               [['calm', 0, 1.3, {}], ['groove', 1.55, 4.15, {}]],
               [[1.3, 1.6]], mute=[[1.3, 1.55]])

# S20 DOMINOES: nine of them in a U, one punch, down the line, round and back up... onto him
DCAM = {'z': 2.5, 'fx': 318, 'fy': 150}
EDL['S20'] = S(4.4, [seg(0, 2.6, 'sa_domino_s7', 0.1, cam=DCAM),
                     seg(2.6, 2.85, 'sa_domino_s7', 2.74, rate=0, cam=DCAM),
                     seg(2.85, 4.4, 'sa_domino_s7', 2.74, cam=DCAM)],
               [meme('domino effect', 0, 1.9, pop=False, size=110), meme('so satisfying 😌', 1.95, 2.6, size=96),
                meme('karma.', 2.9, 4.4, size=124)],
               [['groove', 0, 2.6, {}], ['groove', 2.85, 4.4, {}]],
               [[2.6, 1.5]], mute=[[2.6, 2.85]])

# S21 PINBALL: one shot, walls, two bumpers (players), a portal... JACKPOT
EDL['S21'] = S(4.4, [seg(0, 4.4, 'sa_pinball_s7', 0.05, cam=F(1.6, 0.2))],
               [meme('pinball mode 🕹️', 0, 3.2, pop=False, size=104), meme('new high<br>score', 3.25, 4.4, size=104)],
               [['groove', 0, 4.4, {}]],
               [[3.17, 1.3]])

# S22 ZERO-G: everyone (and the ball) floats up... gravity comes back for the players. not the ball.
GCAM = {'z': 1.85, 'fx': 322, 'fy': 180}
EDL['S22'] = S(4.45, [seg(0, 4.45, 'sa_gravity_s7', 0.3, cam=GCAM)],
               [meme('someone turned<br>off gravity', 0, 2.4, pop=False, size=96), meme('...and back on', 2.45, 3.4, size=96),
                meme('except the<br>ball 🎈', 3.45, 4.45, size=100)],
               [['calm', 0, 2.62, {}], ['groove', 2.66, 4.45, {}]],
               [[2.66, 1.4]])

# S23 BIG GUY JUMPS: a giant does a little hop; the whole pitch goes down
BCAM = {'z': 1.9, 'fx': 322, 'fy': 200}
EDL['S23'] = S(4.0, [seg(0, 0.9, 'sa_titan_s7', 0.05, cam=BCAM),
                     seg(0.9, 1.95, 'sa_titan_s7', 0.95, rate=0.75, cam=BCAM),
                     seg(1.95, 2.2, 'sa_titan_s7', 1.79, rate=0, cam=BCAM),
                     seg(2.2, 4.0, 'sa_titan_s7', 1.79, cam=BCAM)],
               [meme('when the big guy<br>jumps', 0, 1.95, pop=False, size=96), meme('everyone else:<br>💀', 2.25, 4.0, size=100)],
               [['tension', 0, 1.95, {}], ['groove', 2.2, 4.0, {}]],
               [[1.95, 1.7]], mute=[[1.95, 2.2]], nocut=[0.9])
