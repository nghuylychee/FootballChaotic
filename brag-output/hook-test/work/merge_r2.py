"""Merge the batch-2 real-hook picks (hooks2_ra.json + hooks2_rb.json) into picks2.json: ids R11..R60 + the in-game echo for each.
usage: python merge_r2.py   (an id already in picks2.json keeps its id and its echo fields; new picks take the next free id up to R60)
Echo = a captured take whose impact lands ~0.6 s after the cut; takes rotate within a move so neighbours don't repeat."""
import json, os

ECHOES = {   # move -> [(take, take time of the impact)]
    'dropkick': [('r2_dk_side_s7', 0.53), ('r2_dk_flying_s7', 0.8), ('hook_s7', 0.9), ('r2_dk_down_s7', 0.5)],
    'stomp': [('r2_dk_down_s7', 0.5)],
    'punch': [('echo_punch_s7', 0.67), ('r2_headbutt_s7', 0.62)],
    'headbutt': [('r2_headbutt_s7', 0.62)],
    'bite': [('r2_headbutt_s7', 0.62), ('echo_punch_s7', 0.67)],
    'hundred_fists': [('fists_wall_s7', 3.13)],
    'flop': [('r2_flop_roll_s7', 0.57), ('echo_bump_s7', 0.73), ('aura_faint_s7', 1.5)],
    'meteor': [('meteor_mid_s4', 2.2), ('meteor_angle_s1', 2.57), ('fire_goal_s7', 0.87)],
    'curve': [('r2_curve_s7', 0.57)],
    'thunder': [('fire_goal_s7', 0.87)],
    'scissor': [('r2_scissor_s7', 0.67)],
    'keeper_save': [('r2_keeper_save_s7', 0.85), ('r2_keeper_kick_s7', 0.93)],
    'keeper': [('r2_keeper_save_s7', 0.85), ('r2_keeper_kick_s7', 0.93)],
    'keeper_blasted': [('meteor_mid_s4', 2.2), ('giant_keeper_s7', 3.9)],
    'face': [('r2_headbutt_s7', 0.62)],
    'dash': [('t_lightning_s7', 0.9)],
    'clones': [('clones_s7', 0.5), ('c2_clutch_s7', 2.53)],
    'aura': [('r2_siuu_s7', 0.93), ('aura_pose_s7', 0.4), ('aura_faint_s7', 1.5)],
    'titan': [('goliath_s7', 2.53)],
    'chaos': [('r2_miss_s7', 0.87), ('r2_own_goal_s7', 0.4), ('kickoff_s7', 1.13)],
    'miss': [('r2_miss_s7', 0.87)],
}
picks = []
for f in ('hooks2_ra.json', 'hooks2_rb.json', 'hooks2_rc.json'):
    if os.path.exists(f): picks += json.load(open(f, encoding='utf-8'))
old = {p['key']: p for p in json.load(open('picks2.json', encoding='utf-8'))} if os.path.exists('picks2.json') else {}
used = {}
out = []
nxt = max([int(p['id'][1:]) for p in old.values()] + [10]) + 1      # ids already handed out stay put; new picks get the next free ones
SKIP = {('mJrhYS6-9yI', 48.9), ('ARVQrBlYqXQ', 134.4), ('ARVQrBlYqXQ', 59.52)}   # dropped by hand: duplicate moment (Roberto Carlos = R33) / unreadable at phone size
seen = []                                                          # (src, in) of picks kept so far: the same moment picked twice is dropped
for h in picks:
    key = f"{h['src']}@{h['in']}"
    if (h['src'], h['in']) in SKIP: continue
    if key not in old and any(h['src'] == s0 and abs(float(h['in']) - i0) < 2.5 for s0, i0 in seen + [(o['src'], float(o['in'])) for o in old.values()]):
        continue
    seen.append((h['src'], float(h['in'])))
    if key in old: rid = old[key]['id']
    elif nxt <= 60: rid = f'R{nxt}'; nxt += 1
    else: continue
    p = dict(h, key=key, id=rid)
    p['len'] = round((h['out'] - h['in']) / h.get('slow', 1.0), 3)
    p['impact_rel'] = round((h['impact'] - h['in']) / h.get('slow', 1.0), 3)
    if key in old:                                  # keep hand-tuned echo fields
        for k in ('take', 'hit', 'c0', 'z', 'irl', 'game', 'size'):
            if k in old[key]: p[k] = old[key][k]
    if 'take' not in p:
        opts = ECHOES.get(h['move'], ECHOES['dropkick'])
        k = used.get(h['move'], 0); used[h['move']] = k + 1
        take, hit = opts[k % len(opts)]
        p.update(take=take, hit=hit, c0=round(max(0.0, hit - 0.6), 2))
    out.append(p)
out.sort(key=lambda p: int(p['id'][1:]))
json.dump(out, open('picks2.json', 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
print(len(out), 'picks ->', out[0]['id'] if out else '-', '..', out[-1]['id'] if out else '-')
for p in out: print(f"{p['id']:4s} {p['move']:14s} {p['len']:.2f}s  {p['take']:20s} c0 {p['c0']:.2f}  | {p.get('who', '')[:40]}")
