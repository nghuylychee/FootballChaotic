"""run look.py for several pa scenes, 2 at a time: python scratchpad/pa/looks.py secs every scene..."""
import sys, subprocess
from concurrent.futures import ThreadPoolExecutor
secs, every, scenes = sys.argv[1], sys.argv[2], sys.argv[3:]
def run(s):
    r = subprocess.run([sys.executable, 'look.py', s, secs, '7', every], capture_output=True, text=True)
    out = (r.stdout + r.stderr).strip().splitlines()
    keep = [l for l in out if 'PAGEERROR' in l or l.startswith('marks') or ' frames ' in l or 'sfx' in l[:4]]
    return s + ':\n  ' + '\n  '.join(keep[-4:])
with ThreadPoolExecutor(2) as ex:
    for res in ex.map(run, scenes): print(res, flush=True)
