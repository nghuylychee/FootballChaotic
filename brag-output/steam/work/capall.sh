#!/bin/bash
# scene secs
LIST="hook:alley 3.0
combo_goal:rooftop 3.4
punch_kick:market 3.5
draft:harbor 3.0
fire_goal:harbor 3.5
t_blackhole:cyber 3.0
t_bomb:school 3.0
meteor_goal:cage 4.0
fists_goal:plaza 7.0
t_drop:village 3.5
t_titan:school 3.5
t_lightning:rooftop 2.5
t_aura:market 3.5
t_tiki:cyber 3.5
path_map 3.0
vs_intro 3.6
montage:village 2.5
montage:alley 2.5
montage:harbor 2.5
montage:cage 2.5
montage:stadium 2.5
reveal 3.0
scout_map 3.0
scout_report 2.5
gacha 3.5
custom 4.5
lobby 2.5
online:street 4.0
c2_clutch:stadium 9.0
chaos:plaza 6.0"
echo "$LIST" | xargs -P 6 -L 1 sh -c 'python3 cap.py $0 $1 7 > logs/cap_$(echo $0 | tr : _).txt 2>&1'
echo ALLDONE
