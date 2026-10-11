# batch sb: S24-S36 (staged skits). Runs inside edl.py with seg / meme / F / S / EDL in scope.
# Takes: frames/sb_<name>_s7 (scenes_sb.js). Video times v, take times c; marks noted per clip.

# S24 the ball stops on the line, wobbles (???), the keeper scrambles... it tips in
# marks: shot 0.5, line 1.83, lunge 3.57, tip 3.73, goal 4.0
EDL['S24'] = S(5.6,
  [seg(0, 0.4, 'sb_line_wobble_s7', 0.1, cam=F(2.1, 0.15)),
   seg(0.4, 1.7, 'sb_line_wobble_s7', 0.53, cam=F(2.3, 0.12)),
   seg(1.7, 3.25, 'sb_line_wobble_s7', 1.83, cam=F(2.8, 0.2, dy=10)),
   seg(3.25, 4.05, 'sb_line_wobble_s7', 3.38, rate=0.5, cam=F(2.8, 0.2, dy=10)),
   seg(4.05, 5.6, 'sb_line_wobble_s7', 3.78, cam=F(2.4, 0.15, dy=4))],
  [meme('the ball had<br>second thoughts', 0, 3.6, pop=False, size=96),
   meme('it said<br>ok fine 😮‍💨', 4.25, 5.6, size=100)],
  [['calm', 0, 1.7, {}], ['tension', 1.7, 4.27, {}], ['groove', 4.27, 5.6, {}]],
  [[1.7, 0.8], [4.27, 1.4]], heart=[[1.75, 4.15]], nocut=[0.4, 3.25, 4.05])

# S25 the keeper says BRB and walks off; empty net; post from 5 metres
# marks: shot 1.77, post 2.03
EDL['S25'] = S(4.4,
  [seg(0, 2.03, 'sb_no_keeper_s7', 0.0, cam=F(1.95, 0.12)),
   seg(2.03, 2.3, 'sb_no_keeper_s7', 2.06, rate=0, cam={'z': 2.3, 'fx': 'focus', 'fy': 'focus'}),
   seg(2.3, 4.4, 'sb_no_keeper_s7', 2.06, cam=F(2.1, 0.15))],
  [meme('no keeper.', 0, 2.03, pop=False, size=120),
   meme('still missed.', 2.32, 4.4, size=120)],
  [['groove', 0, 2.03, {}], ['calm', 2.3, 4.4, {}]],
  [[2.03, 1.5]], mute=[[2.03, 2.3]])

# S26 two Meteor Shots on one ball: mid-air clash, KABOOM, both blasted, the ball just drops
# marks: cut1 0.27, cut2 0.97, leap 1.6, swing 2.1, clash 2.27, boom 3.23
EDL['S26'] = S(5.3,
  [seg(0, 0.25, 'sb_meteor_clash_s7', 0.0, cam={'z': 2.2, 'fx': 320, 'fy': 205}),
   seg(0.25, 1.375, 'sb_meteor_clash_s7', 0.25, rate=1.2, cam={'z': 2.2, 'fx': 320, 'fy': 205}),
   seg(1.375, 1.875, 'sb_meteor_clash_s7', 1.6, cam=F(2.2, 0.2)),
   seg(1.875, 2.415, 'sb_meteor_clash_s7', 2.1, rate=0.5, cam={'z': 2.5, 'fx': 320, 'fy': 160}),
   seg(2.415, 3.2, 'sb_meteor_clash_s7', 2.37, cam={'z': 2.5, 'fx': 320, 'fy': 160}),
   seg(3.2, 3.45, 'sb_meteor_clash_s7', 3.27, rate=0, cam={'z': 2.3, 'fx': 320, 'fy': 168}),
   seg(3.45, 5.3, 'sb_meteor_clash_s7', 3.27, cam={'z': 1.72, 'fx': 320, 'fy': 200})],
  [meme('unstoppable vs<br>unstoppable', 0, 3.2, pop=False, size=92),
   meme("it's a draw 🤝", 3.5, 5.3, size=104)],
  [['tension', 0, 3.2, {}], ['groove', 3.45, 5.3, {}]],
  [[1.875, 0.8], [2.2, 1.2], [3.2, 1.7]], mute=[[3.2, 3.45]], nocut=[0.25, 1.375, 2.415])

# S27 clone wars: two armies of 8 identical clones face off, CHARGE!, all wind up at once, everybody gets wrecked
# marks: shout 0.5, charge 0.73, windup 1.03, wipe 1.4
EDL['S27'] = S(4.4,
  [seg(0, 1.3, 'sb_clone_wars_s7', 0.0, cam={'z': 1.62, 'fx': 320, 'fy': 205}),
   seg(1.3, 2.1, 'sb_clone_wars_s7', 1.3, rate=0.5, cam={'z': 1.62, 'fx': 320, 'fy': 205}),
   seg(2.1, 4.4, 'sb_clone_wars_s7', 1.7, cam={'z': 1.62, 'fx': 320, 'fy': 205})],
  [meme('clone wars', 0, 2.1, pop=False, size=120),
   meme('VAR check:<br>no foul ✅', 2.15, 4.4, size=100)],
  [['tension', 0, 1.5, {}], ['groove', 1.5, 4.4, {}]],
  [[0.5, 0.6], [1.5, 1.7]], nocut=[1.3, 2.1])

# S28 titan vs titan (giants from frame 0)... and the normal guy in the middle: SQUISH, off to space, THUD between them
# marks: run 0.93, squish 1.47, land 3.27
EDL['S28'] = S(4.6,
  [seg(0, 1.45, 'sb_titan_sandwich_s7', 0.0, cam={'z': 1.8, 'fx': 320, 'fy': 200}),
   seg(1.45, 2.05, 'sb_titan_sandwich_s7', 1.45, rate=0.5, cam={'z': 1.85, 'fx': 320, 'fy': 196}),
   seg(2.05, 3.25, 'sb_titan_sandwich_s7', 1.75, rate=1.25, cam={'z': 1.85, 'fx': 320, 'fy': 196}),
   seg(3.25, 4.6, 'sb_titan_sandwich_s7', 3.25, cam={'z': 2.1, 'fx': 320, 'fy': 200})],
  [meme('titan vs titan', 0, 1.5, pop=False, size=112),
   meme('the guy in<br>the middle 💀', 1.55, 4.6, size=96)],
  [['tension', 0, 1.49, {}], ['groove', 1.49, 4.6, {}]],
  [[1.49, 1.6], [3.27, 1.1]], nocut=[1.45, 2.05])

# S29 kickoff -> Lightning Dash -> shot -> goal, with a stopwatch from the whistle
# marks: whistle 0.4, ult 0.4, dash 1.0, shot 1.1, goal 1.5 (take ends 3.77, the reset would come at 3.9)
_S29 = [seg(0, 0.4, 'sb_fast_goal_s7', 0.0, cam=F(1.9, 0.15)),
        seg(0.4, 1.0, 'sb_fast_goal_s7', 0.4, cam=F(1.9, 0.15)),
        seg(1.0, 2.0, 'sb_fast_goal_s7', 1.0, rate=0.5, cam=F(1.9, 0.22)),
        seg(2.0, 2.25, 'sb_fast_goal_s7', 1.5, rate=0, cam={'z': 2.1, 'fx': 'focus', 'fy': 'focus'}),
        seg(2.25, 4.0, 'sb_fast_goal_s7', 1.5, cam=F(1.9, 0.12))]
def _c29(v):
    for s in _S29:
        if s['v0'] <= v < s['v1']: return s['c0'] + (v - s['v0']) * s.get('rate', 1)
    return 99
_watch = []
_v = 0.4
while _v < 2.0 - 1e-6:
    _watch.append(meme(f'⏱ {max(0, _c29(_v) - 0.4):.2f}s', round(_v, 3), round(min(_v + 1 / 15, 2.0), 3), y=1430, size=110, pop=False))
    _v += 1 / 15
_watch.append(meme('⏱ <b>1.10s</b>', 2.0, 4.0, y=1430, size=128))
EDL['S29'] = S(4.0, _S29,
  [meme('fastest goal<br>in history', 0, 4.0, pop=False, size=100)] + _watch,
  [['pulse', 0, 1.0, {}], ['groove', 2.25, 4.0, {}]],
  [[0.4, 0.6], [1.0, 1.3], [2.0, 1.6]], mute=[[2.0, 2.25]], nocut=[0.4, 1.0, 2.25])

# S30 two defenders dropkick from both sides; he takes one step back; they hit each other
# marks: windup 0.57, step 0.67, clash 0.97, walk 2.6
EDL['S30'] = S(4.2,
  [seg(0, 0.97, 'sb_double_team_s7', 0.0, cam=F(1.95, 0.15)),
   seg(0.97, 1.22, 'sb_double_team_s7', 0.99, rate=0, cam={'z': 2.3, 'fx': 'focus', 'fy': 'focus'}),
   seg(1.22, 2.02, 'sb_double_team_s7', 0.99, rate=0.5, cam=F(1.95, 0.15)),
   seg(2.02, 4.2, 'sb_double_team_s7', 1.39, cam=F(1.95, 0.15))],
  [meme('double team<br>incoming 😰', 0, 0.97, pop=False, size=100),
   meme('friendly fire<br>was on 💀', 1.25, 4.2, size=100)],
  [['tension', 0, 0.97, {}], ['groove', 1.22, 4.2, {}]],
  [[0.97, 1.5]], mute=[[0.97, 1.22]], nocut=[2.02])

# S31 one shot, five walls, in
# marks: shot 0.53, walls 0.8 1.33 1.83 2.33 2.83, goal 3.13
EDL['S31'] = S(4.9,
  [seg(0, 0.5, 'sb_trick_shot_s7', 0.03, cam=F(1.78, 0.15)),
   seg(0.5, 2.77, 'sb_trick_shot_s7', 0.53, cam=F(1.78, 0.13)),
   seg(2.77, 3.3, 'sb_trick_shot_s7', 2.8, rate=0.6, cam=F(1.85, 0.15)),
   seg(3.3, 4.9, 'sb_trick_shot_s7', 3.118, cam=F(1.85, 0.15))],
  [meme('trick shot', 0, 3.1, pop=False, size=120),
   meme('first try btw', 3.33, 4.9, size=104)],
  [['pulse', 0, 0.5, {}], ['groove', 0.5, 4.9, {}]],
  [[0.77, 0.5], [1.3, 0.6], [1.8, 0.7], [2.3, 0.8], [2.82, 1.0], [3.31, 1.4]], nocut=[0.5, 2.77, 3.3])

# S32 the shot hits the keeper in the face (BONK), pops up, lands on his head (BONK!!), trickles in
# marks: shot 0.5, bonk1 0.77, bonk2 1.73, goal 2.07
EDL['S32'] = S(4.3,
  [seg(0, 0.77, 'sb_face_save_s7', 0.0, cam=F(2.1, 0.15)),
   seg(0.77, 1.02, 'sb_face_save_s7', 0.8, rate=0, cam={'z': 2.5, 'fx': 'focus', 'fy': 'focus'}),
   seg(1.02, 2.32, 'sb_face_save_s7', 0.8, rate=0.715, cam=F(2.4, 0.15)),
   seg(2.32, 2.62, 'sb_face_save_s7', 1.73, rate=0.5, cam=F(2.4, 0.15)),
   seg(2.62, 4.3, 'sb_face_save_s7', 1.88, cam=F(2.3, 0.15))],
  [meme('save with<br>the face', 0, 2.3, pop=False, size=104),
   meme('...it still<br>went in 💀', 2.85, 4.3, size=96)],
  [['groove', 0, 0.77, {}], ['calm', 1.02, 2.32, {}], ['groove', 2.32, 4.3, {}]],
  [[0.77, 1.5], [2.32, 1.2], [2.8, 1.3]], mute=[[0.77, 1.02]], nocut=[2.32, 2.62])

# S33 dropkicked a random guy for no reason; EZ; he gets up... TITAN; tramples him from behind
# marks: kick 0.3, fly 0.63, ez 1.1, ult 2.17, chase 2.93, smash 3.63
EDL['S33'] = S(5.1,
  [seg(0, 1.2, 'sb_revenge_s7', 0.1, cam=F(1.85, 0.15)),
   seg(1.2, 1.8, 'sb_revenge_s7', 1.3, rate=1.5, cam=F(1.85, 0.15)),
   seg(1.8, 3.2, 'sb_revenge_s7', 2.2, cam=F(1.85, 0.15)),
   seg(3.2, 3.6, 'sb_revenge_s7', 3.6, rate=0.5, cam=F(1.85, 0.15)),
   seg(3.6, 5.1, 'sb_revenge_s7', 3.8, cam=F(1.8, 0.15))],
  [meme('dropkicked him<br>for no reason', 0, 1.8, pop=False, size=92),
   meme('he came back<br>for revenge', 1.85, 3.55, size=92),
   meme('karma 💀', 3.65, 5.1, size=120)],
  [['groove', 0, 1.8, {}], ['tension', 1.8, 3.25, {}], ['groove', 3.25, 5.1, {}]],
  [[0.6, 1.0], [3.27, 1.6]], nocut=[1.2, 1.8, 3.2, 3.6])

# S34 aura farming: four defenders surround him and faint one by one
# marks: ult 0.73, aura 1.37, faints 1.93 2.2 2.47 2.73, walk 3.47
EDL['S34'] = S(4.6,
  [seg(0, 1.5, 'sb_aura_ring_s7', 0.0, cam={'z': 2.15, 'fx': 320, 'fy': 202}),
   seg(1.5, 4.6, 'sb_aura_ring_s7', 1.5, cam=F(2.1, 0.12))],
  [meme('main character<br>energy', 0, 2.85, pop=False, size=100),
   meme('4 KOs.<br>0 touches.', 2.9, 4.6, size=110)],
  [['calm', 0, 1.37, {}], ['groove', 1.37, 4.6, {}]],
  [[1.37, 0.9], [1.93, 0.6], [2.2, 0.6], [2.47, 0.6], [2.73, 1.1]], nocut=[1.5])

# S35 "PASS!" ... the teammate turns around and passes it to the opponent: THX! NP! BRO?!
# marks: pass 1.53, got 1.67, np 2.13, bro 2.73
EDL['S35'] = S(4.0,
  [seg(0, 1.5, 'sb_bad_pass_s7', 0.0, cam={'z': 2.15, 'fx': 322, 'fy': 198}),
   seg(1.5, 1.9, 'sb_bad_pass_s7', 1.5, rate=0.5, cam={'z': 2.15, 'fx': 322, 'fy': 198}),
   seg(1.9, 4.0, 'sb_bad_pass_s7', 1.7, cam={'z': 2.15, 'fx': 322, 'fy': 198})],
  [meme("my teammate's<br>passing", 0, 1.9, pop=False, size=100),
   meme('perfect pass.<br>wrong team.', 1.95, 4.0, size=100)],
  [['calm', 0, 1.5, {}], ['groove', 1.5, 4.0, {}]],
  [[1.56, 1.2]], nocut=[1.5, 1.9])

# S36 the striker walks it into the empty net... the defender dropkicks HIM into the net instead, then clears
# marks: kick 1.1, fly 1.3, net 1.4, own 2.33, clear 2.7
EDL['S36'] = S(4.2,
  [seg(0, 1.0, 'sb_line_kick_s7', 0.2, cam={'z': 1.85, 'fx': 122, 'fy': 196}),
   seg(1.0, 1.5, 'sb_line_kick_s7', 1.2, rate=0.5, cam=F(2.0, 0.15, dx=-20)),
   seg(1.5, 4.2, 'sb_line_kick_s7', 1.45, cam=F(2.0, 0.15))],
  [meme('open net.<br>easy tap in', 0, 1.2, pop=False, size=100),
   meme('defending 💯', 1.25, 4.2, size=120)],
  [['tension', 0, 1.1, {}], ['groove', 1.1, 4.2, {}]],
  [[1.15, 1.5], [1.34, 1.0]], nocut=[1.5])
