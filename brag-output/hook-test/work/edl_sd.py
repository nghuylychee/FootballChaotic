# batch sd: S49-S60 (staged skits). Runs inside edl.py with seg / meme / F / S / EDL in scope.
# Takes: frames/sd_<name>_s7 (scenes_sd.js). v = video time, c = take time; marks noted per clip.
SDZ = lambda z: {'z': z, 'fx': 'focus', 'fy': 'focus'}   # hold still on the focus at the segment start

# S49 1v1 with the keeper... he goes golden (aura), then HUNDRED FISTS on the striker, 20 HIT, then picks the ball up
# marks: power 0.83, ult 1.7 (cut-in to 2.3), punches 2.27-3.6, finisher 3.63, save 4.07
EDL['S49'] = S(4.6,
  [seg(0, 1.7, 'sd_keeper_fists_s7', 0.0, cam=F(2.0, 0.15)),
   seg(1.7, 2.1, 'sd_keeper_fists_s7', 1.7, rate=1.5, layout='fit', h=620, cam={'z': 0.75, 'fx': 350, 'fy': 175}),   # the whole cut-in banner
   seg(2.1, 3.18, 'sd_keeper_fists_s7', 2.3, rate=1.25, cam=F(2.1, 0.15)),
   seg(3.18, 3.43, 'sd_keeper_fists_s7', 3.68, rate=0, cam=SDZ(2.4)),
   seg(3.43, 4.6, 'sd_keeper_fists_s7', 3.68, cam=F(2.0, 0.15))],
  [meme('1v1 with<br>the keeper 😎', 0, 1.1, pop=False, size=100),
   meme('the keeper went<br>super saiyan', 1.15, 3.15, size=92),
   meme('clean sheet 🧤', 3.47, 4.6, size=104)],
  [['calm', 0, 0.83, {}], ['tension', 0.83, 1.7, {}], ['groove', 1.7, 3.18, {}], ['groove', 3.43, 4.6, {}]],
  [[0.83, 1.0], [1.7, 0.8], [3.18, 1.6]], mute=[[3.18, 3.43]], nocut=[3.43])

# S50 the shot splits in two in mid-air, one ball each side of the keeper, both in: the scoreboard says 2-0
# marks: shot 0.57, split 0.67, goal2 0.93, goal 0.97
EDL['S50'] = S(4.2,
  [seg(0, 0.62, 'sd_split_s7', 0.05, cam=F(2.0, 0.15)),
   seg(0.62, 1.42, 'sd_split_s7', 0.67, rate=0.4, cam=F(2.1, 0.15)),
   seg(1.42, 2.05, 'sd_split_s7', 0.99, cam=F(2.1, 0.15)),
   seg(2.05, 4.2, 'sd_split_s7', 1.9, rate=0.68, layout='fit', h=700, cam={'z': 3.6, 'fx': 320, 'fy': 20})],
  [meme('new shot<br>technique 🤫', 0, 2.0, pop=False, size=104),
   meme('2 goals.<br>1 shot. ✌️', 2.1, 4.2, size=110)],
  [['groove', 0, 0.62, {}], ['calm', 0.62, 1.42, {}], ['groove', 1.42, 4.2, {}]],
  [[0.62, 1.0], [1.32, 1.3], [2.05, 1.2]], nocut=[0.62, 1.42])

# S51 their keeper POOFs into three... all three dive the same way; the ball rolls in the other corner; 10 / 10 / 10
# marks: poof 0.13, shot 1.43, dive 1.53, goal 1.77, judges 2.23 (+0.12, +0.24); reset at 4.17
EDL['S51'] = S(4.1,
  [seg(0, 0.85, 'sd_triple_keeper_s7', 0.58, cam=F(2.0, 0.1, dy=-15)),
   seg(0.85, 1.85, 'sd_triple_keeper_s7', 1.43, rate=0.42, cam=F(2.0, 0.1, dy=-15)),
   seg(1.85, 4.1, 'sd_triple_keeper_s7', 1.85, cam=F(2.0, 0.1, dy=-15))],
  [meme('triple keeper 🧤', 0, 1.25, pop=False, size=108),
   meme('synchronized<br>diving', 1.3, 2.2, size=104),
   meme('the judges:', 2.22, 4.1, size=110)],
  [['groove', 0, 0.85, {}], ['calm', 0.85, 1.85, {}], ['groove', 1.85, 4.1, {}]],
  [[1.9, 1.2], [2.23, 0.6], [2.35, 0.6], [2.47, 0.9]], nocut=[0.85, 1.85])

# S52 a 10-man wall (all the same guy) jumps for the free kick... it goes under them
# marks: whistle 0.3, jump 1.03, shot 1.1, under 1.33, goal 1.63, look 2.07; reset at 4.0
EDL['S52'] = S(4.2,
  [seg(0, 0.85, 'sd_wall_jump_s7', 0.2, cam=F(1.85, 0.1)),
   seg(0.85, 1.75, 'sd_wall_jump_s7', 1.05, rate=0.4, cam=F(1.85, 0.1)),
   seg(1.75, 4.2, 'sd_wall_jump_s7', 1.41, cam=F(1.85, 0.1))],
  [meme('10-man wall 🧱', 0, 1.75, pop=False, size=108),
   meme('never jump in<br>the wall 💀', 2.0, 4.2, size=96)],
  [['tension', 0, 0.85, {}], ['calm', 0.85, 1.75, {}], ['groove', 1.75, 4.2, {}]],
  [[1.97, 1.3]], nocut=[0.85, 1.75])

# S53 he's through on our empty net... our guy from the far half throws a punch: the arm crosses the pitch, BOING, ball back
# marks: punch 1.23, grab 1.7, home 2.37 (o1 ends near x 125)
EDL['S53'] = S(4.0,
  [seg(0, 1.2, 'sd_long_arm_s7', 0.0, cam=F(2.2, 0.12)),
   seg(1.2, 2.6, 'sd_long_arm_s7', 1.2, rate=0.85, layout='fit', h=900, cam={'z': 0.85, 'fx': 305, 'fy': 205}),
   seg(2.6, 4.0, 'sd_long_arm_s7', 2.39, cam={'z': 2.4, 'fx': 128, 'fy': 196})],
  [meme("he's through<br>on goal 😰", 0, 1.2, pop=False, size=100),
   meme('long arm<br>of the law 👮', 1.25, 4.0, size=100)],
  [['tension', 0, 1.2, {}], ['groove', 1.2, 4.0, {}]],
  [[1.23, 0.8], [1.75, 1.3], [2.6, 0.7]], nocut=[1.2])

# S54 four players, one loose ball: a cartoon fight cloud... one walks out with the ball, #1, the other three flat out
# marks: cloud 0.83, clear 2.6, crown 2.87
EDL['S54'] = S(4.3,
  [seg(0, 0.65, 'sd_royale_s7', 0.2, cam={'z': 2.4, 'fx': 320, 'fy': 196}),
   seg(0.65, 2.45, 'sd_royale_s7', 0.85, cam={'z': 2.7, 'fx': 320, 'fy': 192}),
   seg(2.45, 4.3, 'sd_royale_s7', 2.65, cam={'z': 2.6, 'fx': 320, 'fy': 200})],
  [meme('50/50/50/50', 0, 2.42, pop=False, size=108),
   meme('victory<br>royale 👑', 2.75, 4.3, size=110)],
  [['tension', 0, 0.63, {}], ['groove', 0.63, 4.3, {}]],
  [[0.63, 1.4], [2.45, 0.9], [2.67, 1.1]], nocut=[0.65])

# S55 dropkick by the top wall: he flies over it into the stands... and the crowd passes him along (crowd surfing)
# marks: windup 1.0, hit 1.33, land 2.13 (stands), surfs right ~34 px/s
EDL['S55'] = S(4.6,
  [seg(0, 1.25, 'sd_stands_s7', 0.35, layout='fit', h=1000, cam=F(2.0, 0.15)),
   seg(1.25, 2.1, 'sd_stands_s7', 1.6, layout='fit', h=900, cam={'z': 2.6, 'fx': 192, 'fy': 30}),
   seg(2.1, 4.6, 'sd_stands_s7', 2.45, layout='fit', h=900, cam={'z': 2.6, 'fx': 212, 'fy': 30})],
  [meme('how far can a<br>dropkick go?', 0, 1.25, y=220, pop=False, size=96),
   meme('into the<br>stands 🏟️', 1.3, 2.4, y=220, size=104),
   meme("now he's<br>crowd surfing 🤘", 2.45, 4.6, y=220, size=96)],
  [['groove', 0, 0.98, {}], ['groove', 0.98, 4.6, {}]],
  [[0.98, 1.4], [1.78, 1.0]], crowd=[[1.78, 4.6]], nocut=[2.1])

# S56 last kick of the game: post... post... in (as the clock hits zero)
# marks: shot 0.63, post1 0.9, post2 1.33, goal 1.47, full-time whistle 2.0
_S56CLK = [('0:03', 0, 0.6), ('0:02', 0.6, 1.2), ('0:01', 1.2, 2.32)]
EDL['S56'] = S(4.2,
  [seg(0, 0.85, 'sd_last_second_s7', 0.0, cam=F(2.2, 0.15, dy=-15)),
   seg(0.85, 1.81, 'sd_last_second_s7', 0.85, rate=0.5, cam=F(2.2, 0.15, dy=-15)),
   seg(1.81, 2.06, 'sd_last_second_s7', 1.34, rate=0, cam=SDZ(2.5)),
   seg(2.06, 2.4, 'sd_last_second_s7', 1.34, rate=0.5, cam=F(2.2, 0.15, dy=-15)),
   seg(2.4, 4.2, 'sd_last_second_s7', 1.51, cam=F(2.2, 0.15, dy=-15))],
  [meme('last kick<br>of the game', 0, 2.3, pop=False, size=100)]
  + [meme(f'⏱ {s}', a, b, y=1600, size=104, pop=False) for s, a, b in _S56CLK]
  + [meme('⏱ <b>0:00</b>', 2.32, 4.2, y=1600, size=116),
     meme("IT'S IN 😭", 2.36, 4.2, size=120)],
  [['tension', 0, 1.81, {}], ['groove', 2.32, 4.2, {}]],
  [[0.95, 0.9], [1.81, 1.4], [2.32, 1.6]], mute=[[1.81, 2.06]], heart=[[0, 1.8]], crowd=[[2.32, 4.2]], nocut=[0.85, 2.06, 2.4])

# S57 goal... my teammate: "meh." So I POOF eight of me and we dance in a ring round me
# marks: shot 0.3, goal 0.47, meh 0.87, huh 1.23, poof 1.47, party 1.9
EDL['S57'] = S(4.4,
  [seg(0, 4.4, 'sd_clone_party_s7', 0.15, cam=F(2.1, 0.1))],
  [meme('my teammate<br>when I score:', 0, 1.28, pop=False, size=100),
   meme('so I brought<br>my own squad 🕺', 1.35, 4.4, size=92)],
  [['groove', 0, 0.6, {}], ['calm', 0.6, 1.3, {}], ['groove', 1.32, 4.4, {}]],
  [[0.32, 1.0], [1.32, 1.2]], crowd=[[0.32, 4.4]])

# S58 the keeper catches it... it's a bomb: 3, 2, 1, panic, KABOOM, the ball trickles in
# marks: shot 0.53, catch 0.73, ticks 0.97 1.47 1.93, notice 1.4, boom 2.4, goal 3.27
EDL['S58'] = S(4.25,
  [seg(0, 2.38, 'sd_bomb_keeper_s7', 0.02, cam=F(2.1, 0.15)),
   seg(2.38, 2.63, 'sd_bomb_keeper_s7', 2.45, rate=0, cam=SDZ(2.4)),
   seg(2.63, 4.25, 'sd_bomb_keeper_s7', 2.45, cam=F(2.1, 0.15))],
  [meme('he saves<br>everything 🧤', 0, 2.36, pop=False, size=100),
   meme("should've let<br>it in 💀", 2.7, 4.25, size=100)],
  [['groove', 0, 0.75, {}], ['tension', 0.75, 2.38, {}], ['groove', 2.63, 4.25, {}]],
  [[0.73, 0.7], [2.38, 1.7], [3.47, 1.0]], mute=[[2.38, 2.63]], nocut=[2.63])

# S59 METEOR SHOT: both defenders and the keeper dive out of its way ("NOPE!"), it goes in, the net catches fire
# marks: ult 0.4 (cut-in to 1.0), jump 1.0, meteor 1.63, dodges 1.63 1.73 2.0, goal 2.2, fwoosh 2.53
EDL['S59'] = S(4.0,
  [seg(0, 0.4, 'sd_dodge_s7', 0.0, cam={'z': 1.8, 'fx': 478, 'fy': 196}),
   seg(0.4, 0.8, 'sd_dodge_s7', 0.4, rate=1.5, cam={'z': 1.8, 'fx': 478, 'fy': 196}),
   seg(0.8, 1.43, 'sd_dodge_s7', 1.0, cam={'z': 1.8, 'fx': 478, 'fy': 196}),
   seg(1.43, 2.19, 'sd_dodge_s7', 1.63, rate=0.75, cam=F(1.9, 0.2)),
   seg(2.19, 4.0, 'sd_dodge_s7', 2.2, cam=F(1.9, 0.15))],
  [meme('meteor shot<br>incoming ☄️', 0, 1.4, pop=False, size=100),
   meme('everyone<br>dodged', 1.45, 2.42, size=110),
   meme('except the<br>net 🔥', 2.47, 4.0, size=110)],
  [['pulse', 0, 0.4, {}], ['tension', 0.4, 1.43, {}], ['groove', 1.43, 4.0, {}]],
  [[1.43, 1.2], [2.19, 1.5]], nocut=[0.4, 0.8, 1.43, 2.19])

# S60 penalty: Titan-size keeper, pocket-size striker... the shot rolls between his feet (NUTMEG)
# marks: whistle 0.3, stomps 0.5 0.93, shot 1.9, meg 2.4, goal 2.7
EDL['S60'] = S(4.1,
  [seg(0, 1.7, 'sd_tiny_pen_s7', 0.2, cam=F(2.25, 0.1)),
   seg(1.7, 2.5, 'sd_tiny_pen_s7', 1.9, rate=0.8, cam=F(2.25, 0.1)),
   seg(2.5, 4.1, 'sd_tiny_pen_s7', 2.54, cam=F(2.25, 0.1))],
  [meme('penalty but<br>unfair', 0, 1.95, pop=False, size=108),
   meme('unfair for<br>who? 🥜', 2.35, 4.1, size=108)],
  [['tension', 0, 1.7, {}], ['calm', 1.7, 2.5, {}], ['groove', 2.5, 4.1, {}]],
  [[0.3, 0.8], [0.73, 0.8], [2.3, 0.9], [2.66, 1.3]], nocut=[1.7, 2.5])
