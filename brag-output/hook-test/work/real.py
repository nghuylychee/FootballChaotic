"""Cut the real-football hooks out of ../source into 1080x1920 @30 fps frame folders: real/<id>/NNNN.png + count.json
usage: python real.py [id ...]   (default: every pick in hooks.json)
crop: 9:16 window centred on crop_cx (fraction of width; null = centre), optional extra zoom from echo.json (zoom, cy)
      so the uploader's burned-in captions / watermarks fall outside the frame. Audio is never taken."""
import sys, os, json, re, shutil, subprocess
import imageio_ffmpeg

ff = imageio_ffmpeg.get_ffmpeg_exe()
SRC = os.path.join('..', 'source')
HOOKS = json.load(open('hooks.json', encoding='utf-8'))
ECHO = json.load(open('echo.json', encoding='utf-8')) if os.path.exists('echo.json') else {}
want = set(sys.argv[1:])

for h in HOOKS:
    if want and h['id'] not in want: continue
    e = ECHO.get(h['id'], {})
    src = os.path.join(SRC, h['file'])
    info = subprocess.run([ff, '-hide_banner', '-i', src], capture_output=True, text=True).stderr
    w, hh = map(int, re.search(r'Video: .*?(\d{3,5})x(\d{3,5})', info).groups())
    zoom = e.get('zoom', 1.0)
    ch = hh / zoom
    cw = ch * 9 / 16
    if cw > w: cw = w / zoom; ch = cw * 16 / 9
    cx = e.get('cx', h.get('crop_cx') if h.get('crop_cx') is not None else 0.5) * w
    cy = e.get('cy', 0.5) * hh
    x = int(min(max(cx - cw / 2, 0), w - cw)); y = int(min(max(cy - ch / 2, 0), hh - ch))
    t0 = float(e.get('in', h['in']))
    t1 = float(e.get('out', h['out'])) + float(e.get('tail', 0.25))   # a few frames past the impact for the freeze / flash
    out = os.path.join('real', h['id'])
    shutil.rmtree(out, ignore_errors=True); os.makedirs(out)
    slow = float(e.get('slow', 1.0))   # 60 fps sources slow down cleanly
    vf = (f'setpts=PTS/{slow},' if slow != 1 else '') + f'crop={int(cw)}:{int(ch)}:{x}:{y},scale=1080:1920:flags=lanczos,fps=30'
    subprocess.run([ff, '-nostdin', '-y', '-loglevel', 'error', '-ss', f'{t0:.3f}', '-t', f'{t1 - t0:.3f}', '-i', src, '-an', '-vf', vf,
                    '-start_number', '0', os.path.join(out, '%04d.png')], check=True)
    n = len([f for f in os.listdir(out) if f.endswith('.png')])
    json.dump({'n': n, 'src': h['file'], 'in': t0, 'out': t1, 'crop': [x, y, int(cw), int(ch)]}, open(os.path.join(out, 'count.json'), 'w'))
    print(h['id'], h['file'][:40], f'{w}x{hh}', 'crop', (x, y, int(cw), int(ch)), 'frames', n)
