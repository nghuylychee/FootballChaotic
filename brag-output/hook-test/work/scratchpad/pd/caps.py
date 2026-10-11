"""full captures, 2 Chromes at a time: python scratchpad/pd/caps.py scene:secs ..."""
import sys, subprocess
from concurrent.futures import ThreadPoolExecutor
def run(a):
    sc, secs = a.split(':')
    r = subprocess.run([sys.executable, '../../tools/clip-pack/capture.py', '..', sc, secs, '7'], capture_output=True, text=True)
    out = r.stdout + r.stderr
    return sc + ': ' + ' | '.join(l[:900] for l in out.splitlines() if 'marks' in l or 'PAGEERROR' in l or 'Error' in l)
with ThreadPoolExecutor(2) as ex:
    for res in ex.map(run, sys.argv[1:]): print(res, flush=True)
