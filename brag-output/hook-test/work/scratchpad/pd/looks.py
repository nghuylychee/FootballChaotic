"""run look.py for several scenes, 2 Chromes at a time: python scratchpad/pd/looks.py scene:secs[:every] ..."""
import sys, subprocess
from concurrent.futures import ThreadPoolExecutor
def run(a):
    p = a.split(':'); sc, secs = p[0], p[1]; ev = p[2] if len(p) > 2 else '6'
    r = subprocess.run([sys.executable, 'look.py', sc, secs, '7', ev], capture_output=True, text=True)
    out = (r.stdout + r.stderr)
    m = [l for l in out.splitlines() if 'marks' in l or 'PAGEERROR' in l or 'Error' in l]
    return sc + ': ' + ' | '.join(x[:700] for x in m[-2:])
with ThreadPoolExecutor(2) as ex:
    for res in ex.map(run, sys.argv[1:]): print(res, flush=True)
