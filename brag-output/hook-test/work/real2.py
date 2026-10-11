"""Cut the batch-2 real hooks (picks2.json) into real/<id>/NNNN.png @30 fps, 1080x1920 + count.json. Same crop math as real.py.
usage: python real2.py [id ...]"""
import sys, os, json, re, shutil, subprocess
import imageio_ffmpeg

ff = imageio_ffmpeg.get_ffmpeg_exe()
SRC = os.path.join('..', 'source')
want = set(sys.argv[1:])
for p in json.load(open('picks2.json', encoding='utf-8')):
    if want and p['id'] not in want: continue
    src = os.path.join(SRC, p['file'])
    info = subprocess.run([ff, '-hide_banner', '-i', src], capture_output=True, text=True, encoding='utf-8', errors='replace').stderr
    w, hh = map(int, re.search(r'Video: .*?(\d{3,5})x(\d{3,5})', info).groups())
    zoom = float(p.get('zoom', 1.0))
    ch = hh / zoom; cw = ch * 9 / 16
    if cw > w: cw = w / zoom; ch = cw * 16 / 9
    x = int(min(max(float(p.get('cx', 0.5)) * w - cw / 2, 0), w - cw)); y = int(min(max(float(p.get('cy', 0.5)) * hh - ch / 2, 0), hh - ch))
    t0, t1 = float(p['in']), float(p['out']) + 0.25
    slow = float(p.get('slow', 1.0))
    out = os.path.join('real', p['id'])
    shutil.rmtree(out, ignore_errors=True); os.makedirs(out)
    vf = (f'setpts=PTS/{slow},' if slow != 1 else '') + f'crop={int(cw)}:{int(ch)}:{x}:{y},scale=1080:1920:flags=lanczos,fps=30'
    subprocess.run([ff, '-nostdin', '-y', '-loglevel', 'error', '-ss', f'{t0:.3f}', '-t', f'{t1 - t0:.3f}', '-i', src, '-an', '-vf', vf,
                    '-start_number', '0', os.path.join(out, '%04d.png')], check=True)
    n = len([f for f in os.listdir(out) if f.endswith('.png')])
    json.dump({'n': n, 'src': p['file'], 'in': t0, 'out': t1, 'crop': [x, y, int(cw), int(ch)]}, open(os.path.join(out, 'count.json'), 'w'))
    print(p['id'], p['file'][:30], f'{w}x{hh}', 'frames', n, flush=True)
