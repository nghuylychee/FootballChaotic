# batch gd: G49-G60. 0-4.0 own footage, then the shared BODY. exec'd by edl.py with seg / meme / F / rg / SPLIT / EDL in scope.
# G49-G50: new takes (scenes_gd.js: gd_keeper, gd_juggle10).
# G51-G60: CAPTION VARIANTS. Footage, cuts, music, booms, mutes copied literally from the original clip's entry
#          (edl.py / edl_ga.py / edl_gb.py as of 2026-10-10); only the two hook captions change.
FZ = lambda z, fx, fy: {'z': z, 'fx': fx, 'fy': fy}          # fixed camera
FF = lambda z: {'z': z, 'fx': 'focus', 'fy': 'focus'}         # hold on the take's focus at the segment start

# G49 KEEPER SAVE: full-power shot at the top corner (slow-mo), full-stretch dive, fingertips, PARRY (freeze), ball spins away
EDL['G49'] = rg([seg(0, 0.5, 'gd_keeper_s7', 0.13, cam=FZ(1.7, 488, 205)),
                 seg(0.5, 1.4, 'gd_keeper_s7', 0.63, rate=0.3, cam={'z': 1.95, 'fx': 510, 'fy': 198, 'drift': 0.22}),
                 seg(1.4, 1.65, 'gd_keeper_s7', 0.9, rate=0, cam=FZ(2.9, 540, 182)),
                 seg(1.65, 2.4, 'gd_keeper_s7', 0.9, rate=0.4, cam=F(2.1, 0.15)),
                 seg(2.4, SPLIT, 'gd_keeper_s7', 1.2, cam=F(2.0, 0.12))],
                [meme('the keeper<br>said no', 0, 1.6, pop=False, size=110), meme('top bins?<br>not today 🧤', 1.68, 3.95, size=100)],
                [['tension', 0, 1.4, {}], ['groove', 1.65, SPLIT, {}]], [[0.5, 0.8], [1.4, 1.5]],
                mute=[[1.4, 1.65]], nocut=[0.5, 1.65, 2.4])

# G50 JUGGLE x10: pop him up, punch after punch, one counter racing up (1.5x), freeze on the red 10, he's spiked into the floor
EDL['G50'] = rg([seg(0, 0.5, 'gd_juggle10_s7', 0.15, cam=F(2.3, 0.15)),
                 seg(0.5, 2.4, 'gd_juggle10_s7', 0.65, rate=1.5, cam=F(2.3, 0.15)),
                 seg(2.4, 2.7, 'gd_juggle10_s7', 3.5, rate=0, cam=FF(2.45)),
                 seg(2.7, SPLIT, 'gd_juggle10_s7', 3.5, rate=0.97, cam=F(2.3, 0.15))],
                [meme('10 hit combo<br>or I uninstall', 0, 2.35, pop=False, size=96), meme('still<br>installed ✅', 2.45, 3.95, size=110)],
                [['tension', 0, 2.4, {}], ['groove', 2.7, SPLIT, {}]], [[0.27, 0.7], [2.4, 1.6], [2.83, 1.0]],
                mute=[[2.4, 2.7]], nocut=[0.5, 2.7])

# ---------------- G51-G60: caption variants (same picture, new words) ----------------
# G51 <- G1 (calm passing -> dropkick into the wall). Angle: "rate this".  Original: 'just a normal football game' -> 'that was a legal tackle btw'
EDL['G51'] = rg([seg(0, 0.9, 'calm_s7', 0.2, cam=F(2.0, 0.1)), seg(0.9, 4.0, 'hook_s7', 0.35, cam=F(2.0, 0.16), punch=[1.45])],
                [meme('rate this tackle<br>1 to 10 👇', 0, 1.45, pop=False, size=92), meme('the wall gave<br>it a 10 🧱', 2.3, 3.95, size=92)],
                [['calm', 0, 1.45, {}], ['groove', 1.65, SPLIT, {}]], [[1.45, 1.4]], mute=[[1.45, 1.65]])

# G52 <- G2 (stand-off by the wall -> Hundred Fists, 20 HIT, into the wall). Angle: challenge the viewer.  Original: "he said it's a contact sport" -> 'so he got contact'
EDL['G52'] = rg([seg(0, SPLIT, 'fists_wall_s7', 0.55, cam=F(2.1, 0.2))],
                [meme('count the<br>punches 👀', 0, 1.8, pop=False, size=108), meme('did you<br>get 20? 👇', 2.65, 3.95, size=104)],
                [['pulse', 0, 0.42, {}], ['groove', 0.42, SPLIT, {}]], [[2.58, 1.4]])

# G53 <- G3 (Meteor Shot from the halfway line, the keeper gets blasted). Angle: question.  Original: 'the keeper tried to save it' -> 'he did not save it'
EDL['G53'] = rg([seg(0, SPLIT, 'meteor_mid_s4', 0.3, cam=F(1.9, 0.2))],
                [meme('would you try<br>to save this?', 0, 1.85, pop=False, size=96), meme('he tried 💀', 2.0, 3.95, size=110)],
                [['pulse', 0, 0.9, {}], ['groove', 0.9, SPLIT, {}]], [[1.9, 1.5]])

# G54 <- G5 (Black Hole Shot drags both defenders into the net). Angle: relatable gamer line.  Original: 'physics left the chat' -> 'defenders included'
EDL['G54'] = rg([seg(0, SPLIT, 'g_blackhole_s7', 0.3, cam=F(1.9, 0.2))],
                [meme('when you carry<br>the whole team', 0, 1.9, pop=False, size=96), meme('the OTHER<br>team 💀', 2.25, 3.95, size=108)],
                [['tension', 0, 2.2, {}], ['groove', 2.23, SPLIT, {}]], [[0.3, 1.0], [2.23, 1.3]])

# G55 <- G12 (Thunder Kick goes straight through the defender, freeze on the pierce). Angle: POV.  Original: 'it went THROUGH him' -> "he's still buzzing ⚡"
EDL['G55'] = rg([seg(0, 0.55, 'ga_thunder_s7', 0.35, cam=F(2.1, 0.15)),
                 seg(0.55, 0.83, 'ga_thunder_s7', 0.9, rate=0.25, cam=F(2.2, 0.2)),
                 seg(0.83, 1.13, 'ga_thunder_s7', 0.97, rate=0, cam={'z': 2.5, 'fx': 'focus', 'fy': 'focus'}),
                 seg(1.13, 2.1, 'ga_thunder_s7', 0.97, rate=0.3, cam=F(2.0, 0.2)),
                 seg(2.1, SPLIT, 'ga_thunder_s7', 1.26, cam=F(1.9, 0.2))],
                [meme('POV: you<br>blocked the shot', 0, 1.9, pop=False, size=100), meme('you did not<br>block the shot ⚡', 2.15, 3.95, size=88)],
                [['tension', 0, 0.83, {}], ['groove', 1.13, SPLIT, {}]], [[0.55, 0.9], [0.83, 1.5], [2.12, 1.0]],
                mute=[[0.83, 1.13]], nocut=[0.55, 1.13, 2.1])

# G56 <- G17 (open net, shot... AEGIS shield on the line). Angle: curiosity question -> fake-serious patch note.  Original: 'open net. easy goal' -> 'the goal has a SHIELD??'
EDL['G56'] = rg([seg(0, 1.0, 'ga_aegis_s7', 0.05, cam=F(1.9, 0.15)),
                 seg(1.0, 1.32, 'ga_aegis_s7', 1.05, rate=0.25, cam=F(2.1, 0.2)),
                 seg(1.32, 1.6, 'ga_aegis_s7', 1.15, rate=0, cam={'z': 2.3, 'fx': 'focus', 'fy': 'focus'}),
                 seg(1.6, 2.2, 'ga_aegis_s7', 1.15, rate=0.4, cam=F(2.0, 0.2)),
                 seg(2.2, SPLIT, 'ga_aegis_s7', 1.39, cam=F(1.95, 0.2))],
                [meme('how did this<br>not go in?', 0, 1.3, pop=False, size=100), meme('patch notes:<br>goals have shields', 1.38, 3.95, size=88)],
                [['tension', 0, 1.32, {}], ['groove', 1.6, SPLIT, {}]], [[0.25, 0.8], [1.32, 1.5]], mute=[[1.32, 1.6]], nocut=[1.0, 1.6, 2.2])

# G57 <- G22 (Energy Wave: the beam fires with the ball, everyone thrown aside). Angle: fake-serious story.  Original: 'kamehameha but football' -> 'defenders deleted'
EDL['G57'] = rg([seg(0, 0.55, 'ga_wave_s7', 0.38, cam=F(2.0, 0.15)),
                 seg(0.55, 1.95, 'ga_wave_s7', 0.93, rate=0.35, cam={'z': 1.8, 'fx': 440, 'fy': 205}),
                 seg(1.95, SPLIT, 'ga_wave_s7', 1.42, cam=F(1.85, 0.15))],
                [meme('coach said:<br>shoot harder', 0, 1.9, pop=False, size=100), meme('so I did 💥', 2.0, 3.95, size=110)],
                [['tension', 0, 0.55, {}], ['groove', 0.55, SPLIT, {}]], [[0.55, 1.5], [1.98, 1.0]])

# G58 <- G24 (one punch 4x his size, he flies the whole pitch into the wall). Angle: relatable gamer line.  Original: 'the fist was bigger than him' -> 'the wall caught him'
EDL['G58'] = rg([seg(0, 0.68, 'gb_giant_fist_s7', 0.05, cam=FZ(2.3, 326, 222)),
                 seg(0.68, 0.96, 'gb_giant_fist_s7', 0.73, rate=0, cam=FZ(2.9, 314, 222)),
                 seg(0.96, 2.3, 'gb_giant_fist_s7', 0.73, rate=0.6, cam=F(1.9, 0.12)),
                 seg(2.3, SPLIT, 'gb_giant_fist_s7', 1.534, cam=F(1.9, 0.1))],
                [meme("when he says<br>'1v1 me'", 0, 1.85, pop=False, size=100), meme('he left<br>the lobby 💀', 2.25, 3.95, y=640, size=100)],
                [['pulse', 0, 0.68, {}], ['groove', 0.96, SPLIT, {}]], [[0.68, 1.5], [2.24, 1.1]],
                mute=[[0.68, 0.96]], nocut=[0.96, 2.3])

# G59 <- G26 (five of them escort the ball, he leaps in, SLAM, all five fly). Angle: prediction challenge.  Original: 'he hit the ground' -> 'everyone flew'
EDL['G59'] = rg([seg(0, 1.0, 'gb_ground_slam_s7', 0.25, cam=FZ(2.1, 360, 205)),
                 seg(1.0, 1.22, 'gb_ground_slam_s7', 1.26, rate=0, cam=FZ(2.45, 390, 200)),
                 seg(1.22, 2.6, 'gb_ground_slam_s7', 1.26, rate=0.55, cam=FZ(2.0, 385, 205)),
                 seg(2.6, SPLIT, 'gb_ground_slam_s7', 2.02, cam=FZ(1.85, 380, 205))],
                [meme('5v1.<br>who wins?', 0, 1.0, pop=False, size=112), meme('not the 5 💀', 1.05, 3.95, size=112)],
                [['tension', 0, 1.0, {}], ['groove', 1.22, SPLIT, {}]], [[1.0, 1.6]],
                mute=[[1.0, 1.22]], nocut=[1.22, 2.6])

# G60 <- G27 (dropkick incoming, perfect dodge, the pitch goes slow-mo purple, he strolls past and scores). Angle: relatable meme.  Original: 'matrix dodge' -> 'the defender: still loading'
EDL['G60'] = rg([seg(0, SPLIT, 'gb_dodge_s7', 0.1, cam=F(2.2, 0.14))],
                [meme('me dodging my<br>responsibilities', 0, 1.3, pop=False, size=92), meme('and still<br>scoring 😎', 1.35, 3.95, size=104)],
                [['tension', 0, 0.47, {}], ['calm', 0.47, 1.35, {}], ['groove', 1.35, SPLIT, {}]], [[0.47, 1.2], [2.07, 1.1]])
