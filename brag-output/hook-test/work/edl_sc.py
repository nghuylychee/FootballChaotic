# batch sc: S37-S48 staged skits (scenes in scenes_sc.js, takes frames/sc_<name>_s7). Runs inside edl.py (seg / meme / F / S / EDL in scope).
# Names here are SC_-prefixed: every edl_*.py runs in the same namespace.
SC_FZ = lambda z: {'z': z, 'fx': 'focus', 'fy': 'focus'}          # hold still on the focus at the segment start
SC_C = lambda z, x, y: {'z': z, 'fx': x, 'fy': y}                  # fixed camera

# S37 penalty: the keeper sprints off his line and dropkicks the striker before he reaches the ball. SAVE! NEXT!
# marks: windup 1.1, kick 1.33, save 1.97, held 2.43, next 2.93
SC_t = 'sc_keeper_dk_s7'
EDL['S37'] = S(4.05,
  [seg(0, 1.33, SC_t, 0.0, cam=F(2.1, 0.14)),
   seg(1.33, 1.58, SC_t, 1.5, rate=0, cam=SC_FZ(2.4)),
   seg(1.58, 2.5, SC_t, 1.5, cam=F(2.0, 0.15)),
   seg(2.5, 4.05, SC_t, 2.28, rate=1.2, cam=F(2.0, 0.15))],
  [meme('keepers in<br>my league', 0, 1.33, pop=False, size=104),
   meme('penalty<br>saved ✅', 1.62, 4.05, size=110)],
  [['tension', 0, 1.33, {}], ['groove', 1.58, 4.05, {}]],
  [[1.33, 1.5]], mute=[[1.33, 1.58]], nocut=[2.5])

# S38 spawn kill: kickoff, dropkicked at once; RESPAWN, dropkicked x2; RESPAWN, x3; RAGE QUIT
# marks: kick1 0.5, spawn1 1.37, kick2 1.63, spawn2 2.47, kick3 2.73, quit 3.47
SC_t = 'sc_spawn_s7'
SC_c = SC_C(2.1, 320, 196)
EDL['S38'] = S(4.75,
  [seg(0, 0.5, SC_t, 0.0, cam=SC_c),
   seg(0.5, 0.75, SC_t, 0.53, rate=0, cam=SC_c),
   seg(0.75, 4.75, SC_t, 0.53, cam=SC_c)],
  [meme('spawn kill', 0, 3.65, pop=False, size=120),
   meme('he uninstalled 💀', 3.72, 4.75, size=100)],
  [['pulse', 0, 0.5, {}], ['groove', 0.75, 4.75, {}]],
  [[0.5, 1.4], [1.85, 0.9], [2.95, 1.0], [3.69, 0.7]], mute=[[0.5, 0.75]])

# S39 batter up: the pitcher lobs it in, Giant Fist swing, CRACK, the ball leaves the stadium; everyone looks up, he trots round the bases
# marks: throw 0.97, hit 1.6, gone 2.2, base1 3.1, base2 3.83, base3 4.57, base4 5.3
SC_t = 'sc_homerun_s7'
SC_c = SC_C(2.0, 332, 196)
EDL['S39'] = S(4.6,
  [seg(0, 1.1, SC_t, 0.5, cam=SC_c),
   seg(1.1, 1.35, SC_t, 1.61, rate=0, cam=SC_c),
   seg(1.35, 2.3, SC_t, 1.66, cam=SC_c),
   seg(2.3, 4.6, SC_t, 2.57, rate=1.2, cam=SC_c)],
  [meme('batter up ⚾', 0, 1.1, pop=False, size=110),
   meme('we only had<br>one ball 😐', 2.35, 4.6, size=96)],
  [['tension', 0, 1.1, {}], ['groove', 1.35, 4.6, {}]],
  [[1.1, 1.6]], mute=[[1.1, 1.35]], crowd=[[1.9, 3.6]], nocut=[2.3])

# S40 why always me: he's just standing there; a shot, a clearance and a pass all hit him in the head
# marks: bonk1 0.77, bonk2 1.8, bonk3 2.8, why 3.4
SC_t = 'sc_always_me_s7'
SC_c = SC_C(2.15, 318, 210)
EDL['S40'] = S(4.55,
  [seg(0, 1.2, SC_t, 0.0, cam=SC_c),
   seg(1.2, 1.45, SC_t, 1.2, rate=1.4, cam=SC_c),
   seg(1.45, 2.1, SC_t, 1.55, cam=SC_c),
   seg(2.1, 2.35, SC_t, 2.2, rate=1.4, cam=SC_c),
   seg(2.35, 2.6, SC_t, 2.55, cam=SC_c),
   seg(2.6, 2.82, SC_t, 2.92, rate=0, cam=SC_c),
   seg(2.82, 4.55, SC_t, 2.82, cam=SC_c)],
  [meme('why always me', 0, 2.6, pop=False, size=110),
   meme('he was just<br>standing there 😭', 2.88, 4.55, size=90)],
  [['groove', 0, 2.6, {}], ['groove', 2.82, 4.55, {}]],
  [[0.77, 0.6], [1.7, 0.8], [2.6, 1.4]], mute=[[2.6, 2.82]], nocut=[1.2, 1.45, 2.1, 2.35])

# S41 50/50 ball: both punch, both bounce off, ROUND 2, ROUND 3, FINAL ROUND: double dropkick, DOUBLE K.O., the ball never moved
# marks: hit1 0.67, hit2 1.53, hit3 2.4, round4 2.93, hit4 3.37, ko 4.23 (both land flat, KO'd)
SC_t = 'sc_fifty_s7'
SC_c = SC_C(2.15, 320, 200)
EDL['S41'] = S(4.9,
  [seg(0, 1.2, SC_t, 0.1, cam=SC_c),
   seg(1.2, 2.6, SC_t, 1.3, rate=1.35, cam=SC_c),
   seg(2.6, 2.78, SC_t, 3.19, cam=SC_c),
   seg(2.78, 3.03, SC_t, 3.38, rate=0, cam=SC_c),
   seg(3.03, 4.9, SC_t, 3.42, cam=SC_C(2.0, 320, 200))],
  [meme('50/50 ball', 0, 2.78, pop=False, size=120),
   meme('still 50/50 💀', 3.5, 4.9, size=110)],
  [['groove', 0, 2.78, {}], ['groove', 3.03, 4.9, {}]],
  [[0.57, 0.5], [1.37, 0.6], [2.01, 0.7], [2.78, 1.5]], mute=[[2.78, 3.03]], nocut=[1.2, 2.6])

# S42 catch the chicken: two dive at it and bonk heads, one faceplants, it hops the keeper and scores
# marks: bonk 0.67, mdive 1.93, kdive 3.03, hop 3.2, goal 3.53
SC_t = 'sc_chicken_run_s7'
EDL['S42'] = S(4.9,
  [seg(0, 0.67, SC_t, 0.0, cam=F(2.0, 0.18)),
   seg(0.67, 0.9, SC_t, 0.8, rate=0, cam=SC_FZ(2.2)),
   seg(0.9, 2.8, SC_t, 0.69, cam=F(2.0, 0.18)),
   seg(2.8, 3.35, SC_t, 2.59, rate=1.4, cam=F(2.0, 0.18)),
   seg(3.35, 4.9, SC_t, 3.36, cam=F(2.0, 0.18))],
  [meme('catch the<br>chicken', 0, 3.5, pop=False, size=104),
   meme('sign him 🐔', 3.58, 4.9, size=120)],
  [['groove', 0, 0.67, {}], ['groove', 0.9, 4.9, {}]],
  [[0.67, 1.3], [3.56, 1.0]], mute=[[0.67, 0.9]], nocut=[2.8, 3.35])

# S43 1% battery: the keeper sleeps on his line (Zzz), wakes for the shot, dropkicks it the length of the pitch, back to sleep
# marks: shot 1.47, wake 1.53, kick 1.83, sleep 2.53, goal 2.8
SC_t = 'sc_sleepy_keeper_s7'
EDL['S43'] = S(4.7,
  [seg(0, 1.3, SC_t, 0.2, cam=F(1.9, 0.15)),
   seg(1.3, 1.63, SC_t, 1.5, cam=F(1.9, 0.15)),
   seg(1.63, 1.88, SC_t, 1.84, rate=0, cam=SC_C(2.2, 540, 200)),
   seg(1.88, 2.85, SC_t, 1.86, cam=F(1.7, 0.4)),
   seg(2.85, 3.3, SC_t, 2.83, cam=SC_C(1.9, 110, 200)),
   seg(3.3, 4.7, SC_t, 3.3, cam=SC_C(2.2, 548, 200))],
  [meme('keeper on<br>1% battery', 0, 1.63, pop=False, size=104),
   meme('FULL CHARGE ⚡', 1.68, 3.25, size=104),
   meme('back to 1% 😴', 3.33, 4.7, size=104)],
  [['calm', 0, 1.63, {}], ['groove', 1.88, 3.3, {}], ['calm', 3.3, 4.7, {}]],
  [[1.63, 1.5], [2.82, 1.0]], mute=[[1.63, 1.88]], nocut=[1.3, 2.85])

# S44 time stop: a dropkick and a diving keeper inches from him... TIME STOP; he strolls round them and taps it in; time resumes: GOAL
# marks: kick0 0.6, stop 0.63, tap 2.87, pose 3.73, resume 4.1, goal 4.13
SC_t = 'sc_time_stop_s7'
SC_c = SC_C(2.25, 526, 198)
EDL['S44'] = S(4.4,
  [seg(0, 0.76, SC_t, 0.0, cam=SC_c),
   seg(0.76, 1.06, SC_t, 0.76, rate=0, cam=SC_c),
   seg(1.06, 2.66, SC_t, 0.76, rate=1.85, cam=SC_c),
   seg(2.66, 3.04, SC_t, 3.72, cam=SC_c),
   seg(3.04, 4.4, SC_t, 4.1, cam=SC_c)],
  [meme('no way<br>through?', 0, 1.06, pop=False, size=110),
   meme('time stop ⏸️', 1.1, 2.98, size=110),
   meme('nobody saw<br>a thing 🤫', 3.08, 4.4, size=100)],
  [['tension', 0, 0.76, {}], ['groove', 3.04, 4.4, {}]],
  [[0.76, 1.4], [3.04, 1.3]], heart=[[1.06, 2.98]], mute=[[0.76, 3.04]], nocut=[1.06, 2.66])

# S45 bowling part 2: one pin wobbles and stays up; he sprints in and dropkicks it into the net. SPARE!
# marks: shot 0.6, pin1 0.7, wobble 0.83, stay 1.7, windup 2.43, kick 2.67, net 2.87, spare 3.03
SC_t = 'sc_spare_s7'
EDL['S45'] = S(4.2,
  [seg(0, 1.6, SC_t, 0.15, cam=F(2.0, 0.15)),
   seg(1.6, 2.2, SC_t, 1.75, rate=1.3, cam=F(2.0, 0.15)),
   seg(2.2, 2.34, SC_t, 2.53, cam=F(2.0, 0.15)),
   seg(2.34, 2.57, SC_t, 2.8, rate=0, cam=SC_FZ(2.2)),
   seg(2.57, 4.2, SC_t, 2.69, cam=F(2.0, 0.15))],
  [meme('bowling<br>part 2 🎳', 0, 1.0, pop=False, size=104),
   meme('1 pin left 😤', 1.05, 2.34, size=104),
   meme('picking up<br>the spare', 2.62, 4.2, size=100)],
  [['groove', 0, 2.34, {}], ['groove', 2.57, 4.2, {}]],
  [[0.7, 1.0], [2.34, 1.5], [2.91, 1.0]], mute=[[2.34, 2.57]], nocut=[1.6, 2.2])

# S46 oscar worthy: the tiniest tap, a five-roll dive (AAAAH! MY LEG!!), the keeper comes out to check... he gets up and scores
# marks: touch 0.83, lie 2.2, huh 2.47, up 3.17, shot 3.23, goal 3.43
SC_t = 'sc_oscar_s7'
EDL['S46'] = S(4.4,
  [seg(0, 0.85, SC_t, 0.0, cam=F(2.0, 0.15)),
   seg(0.85, 2.2, SC_t, 0.85, cam=F(2.0, 0.15)),
   seg(2.2, 2.8, SC_t, 2.2, rate=1.6, cam=F(2.0, 0.15)),
   seg(2.8, 4.4, SC_t, 3.16, cam=F(2.0, 0.15))],
  [meme('oscar worthy 🏆', 0, 2.8, pop=False, size=104),
   meme('miraculous<br>recovery 🙏', 2.85, 4.4, size=100)],
  [['groove', 0, 0.85, {}], ['calm', 0.85, 2.8, {}], ['groove', 2.8, 4.4, {}]],
  [[0.85, 0.8], [3.01, 1.2]], nocut=[0.85, 2.2, 2.8])

# S47 the perfect cross: a looping cross, a bicycle kick into the top corner (slow-mo + freeze)... and he lands flat on his back. OOF.
# marks: cross 0.53, jump 1.13, strike 1.53, goal 1.83, land 1.9
SC_t = 'sc_bicycle_s7'
SC_c = SC_C(2.3, 526, 192)
EDL['S47'] = S(4.1,
  [seg(0, 1.0, SC_t, 0.25, cam=SC_c),
   seg(1.0, 1.56, SC_t, 1.25, rate=0.5, cam=SC_c),
   seg(1.56, 1.86, SC_t, 1.55, rate=0, cam=SC_c),
   seg(1.86, 2.4, SC_t, 1.63, rate=0.6, cam=SC_c),
   seg(2.4, 4.1, SC_t, 1.88, cam=SC_c)],
  [meme('when the cross<br>is perfect', 0, 2.35, pop=False, size=92),
   meme('worth it 🤕', 2.55, 4.1, size=110)],
  [['tension', 0, 1.56, {}], ['groove', 1.86, 4.1, {}]],
  [[1.56, 1.5], [2.33, 1.0]], mute=[[1.56, 1.86]], nocut=[1.0, 1.86, 2.4])

# S48 he's open: wide open, I'M OPEN!, the pass is on its way... a flying kick from off-screen (slow-mo), SMASH, he takes the ball
# marks: pass 0.93, fly 1.4, hit 1.9
SC_t = 'sc_was_open_s7'
SC_c = SC_C(1.95, 470, 214)
EDL['S48'] = S(4.0,
  [seg(0, 1.45, SC_t, 0.15, cam=SC_c),
   seg(1.45, 2.3, SC_t, 1.6, rate=0.35, cam=SC_c),
   seg(2.3, 2.55, SC_t, 1.92, rate=0, cam=SC_c),
   seg(2.55, 4.0, SC_t, 1.95, cam=SC_c)],
  [meme("he's open!", 0, 2.3, pop=False, size=110),
   meme('he WAS open', 2.6, 4.0, size=110)],
  [['calm', 0, 1.45, {}], ['tension', 1.45, 2.3, {}], ['groove', 2.55, 4.0, {}]],
  [[2.3, 1.6]], mute=[[2.3, 2.55]], nocut=[1.45])
