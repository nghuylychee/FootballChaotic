"""Render + mix + encode clips end to end, 4 renderers at a time.
usage: python build.py <ID> [ID ...] [--jobs N]   (BODY is rendered from 4.0 s on; R/G clips only up to their split; S clips in full)
       python build.py --encode-only <ID> ...   (re-mix audio and re-encode from existing frames)"""
import sys, os, json, subprocess
from concurrent.futures import ThreadPoolExecutor

py = sys.executable
args = sys.argv[1:]
only_encode = '--encode-only' in args
jobs = int(args[args.index('--jobs') + 1]) if '--jobs' in args else 4
ids = [a for i, a in enumerate(args) if not a.startswith('--') and (i == 0 or args[i - 1] != '--jobs')]
EDL = json.load(open('edl.json', encoding='utf-8'))


def render(ID):
    E = EDL[ID]
    if E.get('hookframes'): return f'{ID}: re-uses render_{E["hookframes"]} + render_{E["body"]} (nothing to render)'
    if ID == 'BODY' or E.get('is_body'): rng = ['--from', str(E['drop'])]
    elif E.get('body'): rng = ['--to', str(E['split'])]
    else: rng = []
    r = subprocess.run([py, 'render.py', ID] + rng, capture_output=True, text=True)
    return f"{ID}: {(r.stdout.strip().splitlines() or ['?'])[-1]}" + (f"\n  ERR {r.stderr.strip()[-600:]}" if r.returncode else '')


def finish(ID):
    if ID == 'BODY' or EDL[ID].get('is_body') or EDL[ID].get('is_hook'): return f'{ID}: frames only'
    a = subprocess.run([py, 'audio.py', ID], capture_output=True, text=True)
    e = subprocess.run([py, 'encode.py', ID], capture_output=True, text=True)
    return f"{ID}: {a.stdout.strip()} | {e.stdout.strip()}" + (f"\n  ERR {a.stderr.strip()[-400:]} {e.stderr.strip()[-400:]}" if a.returncode or e.returncode else '')


with open('build.log', 'a', encoding='utf-8') as log:
    if not only_encode:
        with ThreadPoolExecutor(jobs) as ex:
            for res in ex.map(render, ids):
                print(res, flush=True); log.write(res + '\n'); log.flush()
    for ID in ids:
        res = finish(ID)
        print(res, flush=True); log.write(res + '\n'); log.flush()
