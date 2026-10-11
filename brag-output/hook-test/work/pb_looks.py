"""pb helper: quick looks for several pb scenes, 2 headless Chromes at a time.
usage: python pb_looks.py scene:secs[:every[:seed]] ...   -> sheets/<scene>_s<seed>.jpg (+ marks printed)"""
import sys, subprocess
from concurrent.futures import ThreadPoolExecutor


def run(spec):
    parts = spec.split(':')
    scene, secs = parts[0], parts[1]
    every = parts[2] if len(parts) > 2 else '4'
    seed = parts[3] if len(parts) > 3 else '7'
    r = subprocess.run([sys.executable, 'look.py', scene, secs, seed, every], capture_output=True, text=True, encoding='utf-8', errors='replace')
    out = (r.stdout + r.stderr).strip().splitlines()
    keep = [l for l in out if 'marks' in l or 'PAGEERROR' in l or 'Error' in l or 'sfx' in l]
    return f'== {spec}\n' + '\n'.join(l[:600] for l in keep[-5:])


with ThreadPoolExecutor(2) as ex:
    for res in ex.map(run, sys.argv[1:]):
        print(res, flush=True)
