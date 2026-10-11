"""Capture every take the hook test needs (full 30 fps), a few at a time.
usage: python caps.py [name ...]   (default: all of TAKES)   -> frames/<scene>_s<seed>/ + caps.log"""
import sys, os, subprocess, json
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
CAP = os.path.join(HERE, '..', '..', 'tools', 'clip-pack', 'capture.py')
PACK = os.path.dirname(HERE)

# scene, seconds, seed
TAKES = [
    # shared body
    ('punch_kick', 3.5, 7), ('fists_goal', 6.0, 7), ('meteor_goal', 5.0, 7), ('t_titan', 4.0, 7),
    # G hooks
    ('calm', 2.0, 7), ('hook', 3.5, 7), ('fists_wall', 4.5, 7), ('meteor_mid', 4.5, 4), ('aura_pose', 6.8, 7),
    ('t_blackhole', 4.0, 7), ('g_blackhole', 4.5, 7), ('t_bomb', 4.0, 7), ('t_lightning', 3.5, 7), ('c2_clutch', 7.0, 7), ('t_drop', 4.0, 7), ('juggle', 6.0, 7),
    # S skits
    ('nopass', 6.5, 7), ('penalty', 5.5, 7), ('chicken', 3.5, 7), ('bowling', 3.5, 7), ('giant_keeper', 5.0, 7),
    ('kickoff', 6.0, 7), ('goliath', 5.0, 7), ('clones', 5.0, 7), ('fists_ball', 3.5, 7), ('orbit', 5.0, 7),
    # R echoes
    ('echo_punch', 3.0, 7), ('echo_bump', 3.0, 7), ('aura_faint', 3.5, 7), ('fire_goal', 3.5, 7), ('meteor_angle', 4.6, 1),
]


def run(t):
    scene, secs, seed = t
    r = subprocess.run([sys.executable, CAP, PACK, scene, str(secs), str(seed)], capture_output=True, text=True)
    line = (r.stdout.strip().splitlines() or ['?'])[0]
    return f'{scene}_s{seed}: {line}' + (f'\n  ERR {r.stderr.strip()[-400:]}' if r.returncode else '')


want = set(sys.argv[1:])
jobs = [t for t in TAKES if not want or t[0] in want]
with ThreadPoolExecutor(5) as ex, open(os.path.join(HERE, 'caps.log'), 'a', encoding='utf-8') as log:
    for res in ex.map(run, jobs):
        print(res, flush=True); log.write(res + '\n'); log.flush()
