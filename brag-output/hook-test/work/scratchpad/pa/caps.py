"""full captures of pa scenes, 2 at a time: python scratchpad/pa/caps.py secs scene..."""
import sys, subprocess, json
from concurrent.futures import ThreadPoolExecutor
secs, scenes = sys.argv[1], sys.argv[2:]
cap = '../../tools/clip-pack/capture.py'
def run(s):
    r = subprocess.run([sys.executable, cap, '..', s, secs, '7'], capture_output=True, text=True)
    out = (r.stdout + r.stderr).strip().splitlines()
    return s + ': ' + ' | '.join(l for l in out if 'marks' in l or 'PAGEERROR' in l or 'Error' in l)[-600:]
with ThreadPoolExecutor(2) as ex:
    for res in ex.map(run, scenes): print(res, flush=True)
