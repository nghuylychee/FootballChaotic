"""Dựng trang báo cáo: screens/*.json (+ wireframe SVG) + shots/*.png -> report/out/index.html + report/out/shots/.
  python report/build.py   (chạy từ docs/ux-screens)
In ra map `files` để publish artifact (xem README.md).
"""
import os, json, glob, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(HERE, 'out')
MODES = ['', '.squint', '.gray', '.motion']

screens = []
for p in glob.glob(os.path.join(ROOT, 'screens', '*.json')):
    if p.endswith('journeys.json'):
        continue
    S = json.load(open(p, encoding='utf-8'))
    for o in S.get('options', []):
        if o.get('wire'):
            o['wireSvg'] = open(os.path.join(ROOT, 'screens', o['wire']), encoding='utf-8').read()
    screens.append(S)
screens.sort(key=lambda s: s.get('order', 99))

os.makedirs(os.path.join(OUT, 'shots'), exist_ok=True)
files = {}
for S in screens:
    for st in S['states']:
        for m in MODES:
            name = st['id'] + m + '.png'
            shutil.copyfile(os.path.join(ROOT, 'shots', name), os.path.join(OUT, 'shots', name))
            files['shots/' + name] = 'shots/' + name

J = os.path.join(ROOT, 'screens', 'journeys.json')
D = {'screens': screens}
if os.path.exists(J):
    D['journeys'] = json.load(open(J, encoding='utf-8'))
data = json.dumps(D, ensure_ascii=False).replace('</', '<\\/')
html = open(os.path.join(HERE, 'template.html'), encoding='utf-8').read().replace('/*DATA*/', data, 1)
open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(html)
print('index.html', len(html), 'bytes ·', len(screens), 'screen(s)')
print(json.dumps(files))
