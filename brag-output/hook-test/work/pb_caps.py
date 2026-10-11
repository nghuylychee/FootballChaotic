"""pb helper: full 30 fps takes for several pb scenes, 2 headless Chromes at a time.
usage: python pb_caps.py scene:secs[:seed] ...   -> frames/<scene>_s<seed>/ (marks printed)"""
import sys, subprocess
from concurrent.futures import ThreadPoolExecutor


def run(spec):
    parts = spec.split(':')
    scene, secs = parts[0], parts[1]
    seed = parts[2] if len(parts) > 2 else '7'
    r = subprocess.run([sys.executable, '../../tools/clip-pack/capture.py', '..', scene, secs, seed], capture_output=True, text=True, encoding='utf-8', errors='replace')
    out = (r.stdout + r.stderr).strip().splitlines()
    keep = [l for l in out if 'marks' in l or 'PAGEERROR' in l or 'Error' in l]
    return f'== {spec}\n' + '\n'.join(l[:400] for l in keep[-4:])


with ThreadPoolExecutor(2) as ex:
    for res in ex.map(run, sys.argv[1:]):
        print(res, flush=True)
