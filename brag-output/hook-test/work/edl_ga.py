# batch ga: G11-G23 gameplay hooks (0-4.0 s of one Core, then the shared BODY). Takes: frames/ga_<scene>_s7 (scenes_ga.js).
# exec'd by edl.py with seg / meme / F / rg / SPLIT / EDL in scope.

# G11 FIREBALL: charged shot skims the floor, a carpet of fire; both defenders run into it (HOT! OUCH!), it crawls into the net
EDL['G11'] = rg([seg(0, 0.9, 'ga_fireball_s7', 0.1, cam=F(1.8, 0.12)),
                 seg(0.9, 1.6, 'ga_fireball_s7', 1.0, rate=0.5, cam=F(1.8, 0.12)),
                 seg(1.6, SPLIT, 'ga_fireball_s7', 1.35, cam=F(1.8, 0.12))],
                [meme('the pitch is<br>lava now', 0, 1.85, pop=False, size=100), meme('they did NOT<br>check the floor', 1.95, 3.95, size=88)],
                [['pulse', 0, 0.4, {}], ['groove', 0.4, SPLIT, {}]], [[0.4, 1.2], [1.0, 0.9], [2.42, 1.1]], nocut=[0.9, 1.6])

# G12 THUNDER KICK: long charge, lightning ball straight through the defender in the lane (freeze on the pierce), goal
EDL['G12'] = rg([seg(0, 0.55, 'ga_thunder_s7', 0.35, cam=F(2.1, 0.15)),
                 seg(0.55, 0.83, 'ga_thunder_s7', 0.9, rate=0.25, cam=F(2.2, 0.2)),
                 seg(0.83, 1.13, 'ga_thunder_s7', 0.97, rate=0, cam={'z': 2.5, 'fx': 'focus', 'fy': 'focus'}),
                 seg(1.13, 2.1, 'ga_thunder_s7', 0.97, rate=0.3, cam=F(2.0, 0.2)),
                 seg(2.1, SPLIT, 'ga_thunder_s7', 1.26, cam=F(1.9, 0.2))],
                [meme('it went<br>THROUGH him', 0, 1.9, pop=False, size=100), meme("he's still<br>buzzing ⚡", 2.15, 3.95, size=92)],
                [['tension', 0, 0.83, {}], ['groove', 1.13, SPLIT, {}]], [[0.55, 0.9], [0.83, 1.5], [2.12, 1.0]],
                mute=[[0.83, 1.13]], nocut=[0.55, 1.13, 2.1])

# G13 DRAGON CURL: the shot leaves almost straight up the pitch, the green dragon bends it round the wall into the far corner
EDL['G13'] = rg([seg(0, 0.4, 'ga_curl_s7', 0.05, cam=F(1.85, 0.15)),
                 seg(0.4, 2.6, 'ga_curl_s7', 0.4, rate=0.55, cam=F(1.85, 0.15)),
                 seg(2.6, SPLIT, 'ga_curl_s7', 1.61, cam=F(1.85, 0.15))],
                [meme('the ball<br>has GPS', 0, 1.6, pop=False, size=110), meme('recalculating<br>route...', 1.65, 2.55, size=88),
                 meme('you have<br>arrived 📍', 2.62, 3.95, size=92)],
                [['tension', 0, 2.6, {}], ['groove', 2.6, SPLIT, {}]], [[0.4, 0.9], [2.6, 1.4]], nocut=[0.4, 2.6])

# G14 PHANTOM STEP: Z = teleport, the defender dropkicks the illusion (POOF, MISS, ???), meanwhile the real one scores
EDL['G14'] = rg([seg(0, 0.3, 'ga_phantom_s7', 0.05, cam=F(2.0, 0.15)),
                 seg(0.3, 1.7, 'ga_phantom_s7', 0.35, rate=0.5, cam=F(2.0, 0.15)),
                 seg(1.7, SPLIT, 'ga_phantom_s7', 1.05, cam=F(1.95, 0.1))],
                [meme('he chased<br>a ghost', 0, 1.75, pop=False, size=104), meme('meanwhile<br>the real one:', 2.0, 3.95, size=88)],
                [['calm', 0, 1.7, {}], ['groove', 1.7, SPLIT, {}]], [[0.32, 0.8], [1.0, 1.1], [3.28, 1.1]], nocut=[0.3, 1.7])

# G15 FAKE RUN: he bursts down, a purple fake with a fake ball runs up, both defenders (and the keeper) follow it; open goal
EDL['G15'] = rg([seg(0, 0.3, 'ga_fakerun_s7', 0.2, cam=F(1.85, 0.15)),
                 seg(0.3, 1.3, 'ga_fakerun_s7', 0.5, rate=0.6, cam=F(1.85, 0.15)),
                 seg(1.3, SPLIT, 'ga_fakerun_s7', 1.1, cam=F(1.85, 0.15))],
                [meme('wrong way<br>bro', 0, 2.1, pop=False, size=110), meme('the keeper<br>too 💀', 2.2, 3.95, size=96)],
                [['pulse', 0, 0.35, {}], ['groove', 0.35, SPLIT, {}]], [[0.35, 1.0], [2.43, 1.1]], nocut=[0.3, 1.3])

# G16 WIND BLADE: he dropkicks thin air ("MISS")... the wind slash flies on and drops both of them
EDL['G16'] = rg([seg(0, 0.45, 'ga_blade_s7', 0.2, cam=F(2.0, 0.15)),
                 seg(0.45, 1.85, 'ga_blade_s7', 0.65, rate=0.35, cam=F(2.0, 0.15)),
                 seg(1.85, SPLIT, 'ga_blade_s7', 1.14, cam=F(2.0, 0.15))],
                [meme('he kicked<br>the air', 0, 1.25, pop=False, size=104), meme('the air won', 1.32, 3.95, size=110)],
                [['pulse', 0, 1.25, {}], ['groove', 1.25, SPLIT, {}]], [[0.45, 0.8], [1.25, 1.3]], nocut=[0.45, 1.85])

# G17 AEGIS SHIELD: our mate dropkicks their keeper out of the goal, open net, shot... AEGIS! (freeze), "???"
EDL['G17'] = rg([seg(0, 1.0, 'ga_aegis_s7', 0.05, cam=F(1.9, 0.15)),
                 seg(1.0, 1.32, 'ga_aegis_s7', 1.05, rate=0.25, cam=F(2.1, 0.2)),
                 seg(1.32, 1.6, 'ga_aegis_s7', 1.15, rate=0, cam={'z': 2.3, 'fx': 'focus', 'fy': 'focus'}),
                 seg(1.6, 2.2, 'ga_aegis_s7', 1.15, rate=0.4, cam=F(2.0, 0.2)),
                 seg(2.2, SPLIT, 'ga_aegis_s7', 1.39, cam=F(1.95, 0.2))],
                [meme('open net.<br>easy goal', 0, 1.3, pop=False, size=104), meme('the goal has<br>a SHIELD??', 1.38, 3.95, size=92)],
                [['tension', 0, 1.32, {}], ['groove', 1.6, SPLIT, {}]], [[0.25, 0.8], [1.32, 1.5]], mute=[[1.32, 1.6]], nocut=[1.0, 1.6, 2.2])

# G18 EMP MINE: a punch at nothing drops a mine; the carrier dribbles onto it (ZAP), then his mate does the same (ZAP)
EDL['G18'] = rg([seg(0, 0.7, 'ga_emp_s7', 0.1, cam=F(2.1, 0.15)),
                 seg(0.7, 1.5, 'ga_emp_s7', 0.8, rate=0.4, cam=F(2.1, 0.15)),
                 seg(1.5, SPLIT, 'ga_emp_s7', 1.12, cam=F(2.0, 0.15))],
                [meme('watch your<br>step', 0, 2.85, pop=False, size=110), meme('him neither 💀', 2.95, 3.95, size=96)],
                [['pulse', 0, 0.88, {}], ['groove', 0.88, SPLIT, {}]], [[0.88, 1.2], [2.91, 1.1]], nocut=[0.7, 1.5])

# G19 PHANTOM PASS: 5 Rhythm, through pass = golden beam straight through 3 defenders (vertical), receiver scores
EDL['G19'] = rg([seg(0, 0.35, 'ga_ppass_s7', 0.18, cam={'z': 1.8, 'fx': 318, 'fy': 200}),
                 seg(0.35, 1.55, 'ga_ppass_s7', 0.53, rate=0.5, cam={'z': 1.8, 'fx': 318, 'fy': 200}),
                 seg(1.55, SPLIT, 'ga_ppass_s7', 1.13, cam=F(2.1, 0.12))],
                [meme('unstoppable pass', 0, 1.75, pop=False, size=92), meme('3 defenders.<br>0 touches.', 1.85, 3.95, size=88)],
                [['tension', 0, 0.35, {}], ['groove', 0.35, SPLIT, {}]], [[0.35, 1.2], [3.25, 1.0]], nocut=[0.35, 1.55])

# G20 SONIC BOOM: max Momentum, he only brushes past them... BOOM, BOOM, goal
EDL['G20'] = rg([seg(0, 0.38, 'ga_sonic_s7', 0.2, cam=F(2.0, 0.15)),
                 seg(0.38, 1.0, 'ga_sonic_s7', 0.58, rate=0.4, cam=F(2.0, 0.15)),
                 seg(1.0, 1.32, 'ga_sonic_s7', 0.83, cam=F(2.0, 0.15)),
                 seg(1.32, 1.82, 'ga_sonic_s7', 1.15, rate=0.4, cam=F(2.0, 0.15)),
                 seg(1.82, SPLIT, 'ga_sonic_s7', 1.35, cam=F(1.95, 0.15))],
                [meme("he didn't even<br>touch them", 0, 1.9, pop=False, size=92), meme('speed of<br>sound 💨', 2.0, 3.95, size=100)],
                [['groove', 0, SPLIT, {}]], [[0.38, 1.2], [1.37, 1.2], [2.85, 1.0]], nocut=[0.38, 1.0, 1.32, 1.82])

# G21 FREIGHT TRAIN: 5 Momentum, head-on into the carrier: BAM (freeze), he flies, ball's ours
EDL['G21'] = rg([seg(0, 0.75, 'ga_freight_s7', 0.15, cam=F(1.8, 0.15)),
                 seg(0.75, 1.0, 'ga_freight_s7', 0.9, rate=0, cam={'z': 2.3, 'fx': 'focus', 'fy': 'focus'}),
                 seg(1.0, 2.2, 'ga_freight_s7', 0.9, rate=0.4, cam=F(2.0, 0.2)),
                 seg(2.2, SPLIT, 'ga_freight_s7', 1.38, cam=F(2.0, 0.2))],
                [meme('human<br>freight train', 0, 1.9, pop=False, size=100), meme('choo choo 🚂', 2.0, 3.95, size=104)],
                [['tension', 0, 0.75, {}], ['groove', 1.0, SPLIT, {}]], [[0.75, 1.6]], mute=[[0.75, 1.0]], nocut=[1.0, 2.2])

# G22 ENERGY WAVE: full charge (orb at his feet), the beam fires with the ball and throws everyone aside, goal
EDL['G22'] = rg([seg(0, 0.55, 'ga_wave_s7', 0.38, cam=F(2.0, 0.15)),
                 seg(0.55, 1.95, 'ga_wave_s7', 0.93, rate=0.35, cam={'z': 1.8, 'fx': 440, 'fy': 205}),
                 seg(1.95, SPLIT, 'ga_wave_s7', 1.42, cam=F(1.85, 0.15))],
                [meme('kamehameha<br>but football', 0, 1.9, pop=False, size=100), meme('defenders<br>deleted', 2.0, 3.95, size=100)],
                [['tension', 0, 0.55, {}], ['groove', 0.55, SPLIT, {}]], [[0.55, 1.5], [1.98, 1.0]])

# G23 FIST STORM: one punch = 4 hits (real speed), slow-mo replay to count them, then the next guy
EDL['G23'] = rg([seg(0, 0.85, 'ga_fists_s7', 0.2, cam=F(2.3, 0.15)),
                 seg(0.85, 2.65, 'ga_fists_s7', 0.33, rate=0.17, cam={'z': 2.2, 'fx': 322, 'fy': 196}),
                 seg(2.65, SPLIT, 'ga_fists_s7', 1.42, cam=F(2.2, 0.15))],
                [meme('4 punches.<br>1 second.', 0, 2.6, pop=False, size=100), meme("who's next? 👊", 2.7, 3.95, size=96)],
                [['groove', 0, 0.85, {}], ['pulse', 0.85, 2.65, {}], ['groove', 2.65, SPLIT, {}]],
                [[0.2, 0.8], [1.25, 0.6], [1.45, 0.6], [1.85, 0.6], [2.45, 1.0], [2.85, 0.8], [3.06, 1.0]])
