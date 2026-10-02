#!/bin/bash
LIST="calm:village 2.2 --fps 30
hook:village 3.0 --fps 60
punch_kick:alley 1.8 --fps 30
hook:school 1.8 --fps 30
fire_goal:rooftop 1.9 --fps 30
t_bomb:market 2.2 --fps 30
t_blackhole:harbor 1.8 --fps 30
t_titan:cage 2.6 --fps 30
t_drop:plaza 3.2 --fps 30
t_lightning:cyber 2.5 --fps 30
vs_final 3.5 --fps 30
meteor_goal:market 2.8 --fps 30
fists_goal:school 2.6 --fps 30
t_aura:rooftop 2.0 --fps 30
t_tiki:village 2.0 --fps 30
c2_clutch:stadium 9.0 --fps 60"
echo "$LIST" | xargs -P 6 -L 1 sh -c 'python3 cap.py $0 $1 7 $2 $3 --nohud > logs/tz_$(echo $0 | tr : _).txt 2>&1'
echo ALLDONE
