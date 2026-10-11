# batch gb: G24-G36 gameplay hooks (one Core each), 0-4.0 own footage then the shared BODY. Takes: frames/gb_<core>_s7 (scenes_gb.js).
FZ = lambda z, fx, fy: {'z': z, 'fx': fx, 'fy': fy}          # fixed camera
FF = lambda z: {'z': z, 'fx': 'focus', 'fy': 'focus'}         # hold on the take's focus at the segment start

# G24 GIANT FIST: the carrier walks at him, one punch 4x his size (freeze on the fist), he flies the whole pitch into the wall
EDL['G24'] = rg([seg(0, 0.68, 'gb_giant_fist_s7', 0.05, cam=FZ(2.3, 326, 222)),
                 seg(0.68, 0.96, 'gb_giant_fist_s7', 0.73, rate=0, cam=FZ(2.9, 314, 222)),
                 seg(0.96, 2.3, 'gb_giant_fist_s7', 0.73, rate=0.6, cam=F(1.9, 0.12)),
                 seg(2.3, SPLIT, 'gb_giant_fist_s7', 1.534, cam=F(1.9, 0.1))],
                [meme('the fist was<br>bigger than him', 0, 1.85, pop=False, size=92), meme('the wall<br>caught him', 2.25, 3.95, y=640, size=96)],
                [['pulse', 0, 0.68, {}], ['groove', 0.96, SPLIT, {}]], [[0.68, 1.5], [2.24, 1.1]],
                mute=[[0.68, 0.96]], nocut=[0.96, 2.3])

# G25 WALL SLAM: dropkick into the wall (CRACK), the ball bounces straight back to his feet, he scores
EDL['G25'] = rg([seg(0, 0.62, 'gb_wall_slam_s7', 0.12, cam=FZ(2.2, 456, 150)),
                 seg(0.62, 0.84, 'gb_wall_slam_s7', 0.74, rate=0, cam=FZ(2.5, 452, 128)),
                 seg(0.84, 2.0, 'gb_wall_slam_s7', 0.74, cam=F(2.15, 0.12)),
                 seg(2.0, SPLIT, 'gb_wall_slam_s7', 1.9, cam=F(2.0, 0.15))],
                [meme('wall: 1.<br>defender: 0.', 0, 1.1, y=1380, pop=False, size=104), meme('then the wall<br>passed it back', 1.15, 2.45, y=1380, size=88),
                 meme('assist:<br>the wall 🧱', 2.55, 3.95, y=1380, size=96)],
                [['pulse', 0, 0.62, {}], ['groove', 0.84, SPLIT, {}]], [[0.62, 1.5], [2.65, 1.2]],
                mute=[[0.62, 0.84]], nocut=[0.84, 2.0])

# G26 GROUND SLAM: five of them escort the ball, he leaps in, SLAM (freeze), all five fly in slow motion
EDL['G26'] = rg([seg(0, 1.0, 'gb_ground_slam_s7', 0.25, cam=FZ(2.1, 360, 205)),
                 seg(1.0, 1.22, 'gb_ground_slam_s7', 1.26, rate=0, cam=FZ(2.45, 390, 200)),
                 seg(1.22, 2.6, 'gb_ground_slam_s7', 1.26, rate=0.55, cam=FZ(2.0, 385, 205)),
                 seg(2.6, SPLIT, 'gb_ground_slam_s7', 2.02, cam=FZ(1.85, 380, 205))],
                [meme('he hit<br>the ground', 0, 1.0, pop=False, size=104), meme('everyone<br>flew', 1.05, 3.95, size=116)],
                [['tension', 0, 1.0, {}], ['groove', 1.22, SPLIT, {}]], [[1.0, 1.6]],
                mute=[[1.0, 1.22]], nocut=[1.22, 2.6])

# G27 PERFECT DODGE: dropkick incoming, Z through it, the whole pitch goes slow-mo purple, he strolls past and scores
EDL['G27'] = rg([seg(0, SPLIT, 'gb_dodge_s7', 0.1, cam=F(2.2, 0.14))],
                [meme('matrix dodge', 0, 1.3, pop=False, size=116), meme('the defender:<br>still loading', 1.35, 3.95, size=92)],
                [['tension', 0, 0.47, {}], ['calm', 0.47, 1.35, {}], ['groove', 1.35, SPLIT, {}]], [[0.47, 1.2], [2.07, 1.1]])

# G28 SHADOW CLONE: three of him run abreast, each defender dropkicks a clone (MISS), then he does it again
EDL['G28'] = rg([seg(0, SPLIT, 'gb_clone_s7', 0.5, cam=F(2.1, 0.14))],
                [meme('which one<br>is real?', 0, 1.25, pop=False, size=104), meme('wrong 💀', 1.3, 2.05, size=120),
                 meme('try again 👀', 2.15, 3.95, size=104)],
                [['tension', 0, 1.25, {}], ['groove', 1.25, SPLIT, {}]], [[1.25, 1.2]])

# G29 BULLDOZER: he grows with the ball, a dropkick bounces off (CLANG), he bowls them over, a punch bounces off, again, goal
EDL['G29'] = rg([seg(0, 2.2, 'gb_bulldozer_s7', 0.1, cam=F(2.1, 0.14)),
                 seg(2.2, SPLIT, 'gb_bulldozer_s7', 2.3, rate=1.3, cam=F(2.0, 0.14))],
                [meme("you can't<br>tackle him", 0, 1.9, pop=False, size=104), meme('they tried.<br>twice.', 1.95, 3.95, size=100)],
                [['pulse', 0, 0.57, {}], ['groove', 0.57, SPLIT, {}]], [[0.87, 1.1], [1.87, 1.1], [3.61, 1.0]], nocut=[2.2])

# G30 GIANT KEEPER: they break through on our goal, our keeper POOFs bigger and swallows the shot
EDL['G30'] = rg([seg(0, 0.45, 'gb_giant_keeper_s7', 0.0, cam=FZ(2.4, 110, 200)),
                 seg(0.45, 1.6, 'gb_giant_keeper_s7', 0.45, rate=0.5, cam=FZ(2.4, 110, 200)),
                 seg(1.6, 2.2, 'gb_giant_keeper_s7', 0.98, rate=0, cam=FZ(2.7, 95, 200)),
                 seg(2.2, SPLIT, 'gb_giant_keeper_s7', 0.3, rate=0.33, cam=FZ(3.1, 88, 196))],
                [meme('our keeper had<br>a growth spurt', 0, 1.55, pop=False, size=92), meme('shot:<br>denied', 1.6, 2.15, size=110),
                 meme('replay: built<br>different 💪', 2.25, 3.95, size=92)],
                [['tension', 0, 0.45, {}], ['groove', 0.45, SPLIT, {}]], [[0.45, 1.0], [1.29, 1.2], [2.2, 0.8]], mute=[[1.6, 1.75]], nocut=[0.45])

# G31 RUBBER ARM: yanks a loose ball from way out of reach, the defender comes over, GET OVER HERE, punch
EDL['G31'] = rg([seg(0, 1.2, 'gb_rubber_arm_s7', 0.1, cam=FZ(2.4, 356, 206)),
                 seg(1.2, 1.75, 'gb_rubber_arm_s7', 1.3, rate=2.0, cam=FZ(2.4, 356, 206)),
                 seg(1.75, 3.0, 'gb_rubber_arm_s7', 2.4, rate=0.5, cam=FZ(2.5, 345, 206)),
                 seg(3.0, SPLIT, 'gb_rubber_arm_s7', 3.03, cam=FZ(2.4, 345, 206))],
                [meme('stretchy<br>arms', 0, 1.7, pop=False, size=112), meme('GET OVER<br>HERE', 1.8, 3.95, size=112)],
                [['pulse', 0, 0.33, {}], ['groove', 0.33, SPLIT, {}]], [[0.5, 1.0], [2.21, 1.3], [2.81, 1.0]], nocut=[1.2, 1.75, 3.0])

# G32 DRAGON UPPERCUT: 5 rage, one punch, he goes up off the top of the screen... and comes back down
EDL['G32'] = rg([seg(0, 0.62, 'gb_uppercut_s7', 0.05, cam=FZ(2.3, 335, 215)),
                 seg(0.62, 0.8, 'gb_uppercut_s7', 0.68, rate=0, cam=FZ(2.5, 335, 212)),
                 seg(0.8, 2.3, 'gb_uppercut_s7', 0.68, rate=0.6, cam=FZ(1.85, 335, 185)),
                 seg(2.3, SPLIT, 'gb_uppercut_s7', 1.58, cam=FZ(1.85, 335, 185))],
                [meme('uppercut to<br>the moon 🚀', 0, 1.8, y=1420, pop=False, size=96), meme('landing in<br>3... 2... 1...', 1.9, 3.1, y=1420, size=92),
                 meme('touchdown 💀', 3.15, 3.95, y=1420, size=104)],
                [['pulse', 0, 0.62, {}], ['tension', 0.8, 3.15, {}], ['groove', 3.15, SPLIT, {}]], [[0.62, 1.4], [3.15, 1.3]],
                mute=[[0.62, 0.8]], nocut=[0.8, 2.3])

# G33 SCISSOR KICK: a ball drops in, bicycle kick, it goes through both defenders (ZZT, ZZT) and in
EDL['G33'] = rg([seg(0, 0.7, 'gb_scissor_s7', 0.0, cam=FZ(2.2, 445, 192)),
                 seg(0.7, 2.2, 'gb_scissor_s7', 0.7, rate=0.5, cam=F(2.1, 0.2)),
                 seg(2.2, SPLIT, 'gb_scissor_s7', 1.45, cam=F(2.0, 0.15))],
                [meme('bicycle kick<br>through 2 players', 0, 1.9, pop=False, size=88), meme('2 casualties.<br>1 goal.', 1.95, 3.95, size=96)],
                [['tension', 0, 0.63, {}], ['groove', 0.63, SPLIT, {}]], [[0.63, 1.3], [1.76, 1.2]], nocut=[0.7, 2.2])

# G34 GHOST BALL: three of him, the shot fires three balls, the keeper dives at a fake
EDL['G34'] = rg([seg(0, 0.62, 'gb_ghost_ball_s7', 0.41, cam=F(2.1, 0.12)),
                 seg(0.62, 2.2, 'gb_ghost_ball_s7', 1.03, rate=0.45, cam=F(2.2, 0.1)),
                 seg(2.2, SPLIT, 'gb_ghost_ball_s7', 1.74, cam=F(2.0, 0.12))],
                [meme('the keeper picked<br>the wrong ball', 0, 1.95, pop=False, size=88), meme('3 balls.<br>1 real.', 2.0, 3.95, size=104)],
                [['pulse', 0, 0.62, {}], ['groove', 0.62, SPLIT, {}]], [[0.62, 1.0], [2.1, 1.3]], nocut=[0.62, 2.2])

# G35 FLYING KICK: full Momentum, he flies into the carrier (freeze), then the carrier flies the length of the pitch
EDL['G35'] = rg([seg(0, 0.68, 'gb_flying_kick_s7', 0.0, cam=F(2.1, 0.15)),
                 seg(0.68, 0.9, 'gb_flying_kick_s7', 0.72, rate=0, cam=FF(2.5)),
                 seg(0.9, 2.0, 'gb_flying_kick_s7', 0.72, rate=0.5, cam=F(1.95, 0.32)),
                 seg(2.0, SPLIT, 'gb_flying_kick_s7', 1.27, cam=F(2.0, 0.15))],
                [meme('he flew', 0, 0.9, pop=False, size=120), meme('then HE<br>flew', 0.95, 3.95, size=112)],
                [['pulse', 0, 0.68, {}], ['groove', 0.9, SPLIT, {}]], [[0.68, 1.5], [1.8, 1.1]],
                mute=[[0.68, 0.9]], nocut=[0.9, 2.0])

# G36 ENDLESS TIKI-TAKA: ult, the opponents crawl, 4 golden one-touch passes, max shot, goal
EDL['G36'] = rg([seg(0, SPLIT, 'gb_tiki_s7', 0.25, cam=F(2.1, 0.15))],
                [meme("they can't touch<br>the ball", 0, 1.65, pop=False, size=92), meme('4 passes.<br>0 touches.', 1.7, 3.95, y=1380, size=100)],
                [['tension', 0, 0.7, {}], ['groove', 0.7, SPLIT, {}]], [[0.05, 0.9], [1.95, 1.3]])
