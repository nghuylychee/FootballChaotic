"""Dựng trang báo cáo: screens/*.json (+ wireframe SVG) + shots/*.png (+ shots/after/*.png = ảnh sau khi sửa)
-> report/out/index.html + report/out/shots/. Dòng "đã sửa" của từng màn lấy từ Nhật ký trong README.md (dòng "- <ngày> — `<id>` ...").
  python report/build.py   (chạy từ docs/ux-screens)
In ra map `files` để publish artifact (xem README.md).
"""
import os, re, json, glob, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(HERE, 'out')
MODES = ['', '.squint', '.gray', '.motion']

screens = []
for p in glob.glob(os.path.join(ROOT, 'screens', '*.json')):
    if p.endswith('journeys.json') or p.endswith('event-scenes.json'):   # 2 mục riêng, không phải màn
        continue
    S = json.load(open(p, encoding='utf-8'))
    for o in S.get('options', []):
        if o.get('wire'):
            o['wireSvg'] = open(os.path.join(ROOT, 'screens', o['wire']), encoding='utf-8').read()
    screens.append(S)
screens.sort(key=lambda s: s.get('order', 99))

# Nhật ký README: dòng đã xử lý góp ý của từng màn (dòng cuối cùng nhắc tới màn đó thắng)
LOG = re.compile(r'^- (\d{4}-\d{2}-\d{2}) — `([a-z-]+)` (.*)$')
for line in open(os.path.join(ROOT, 'README.md'), encoding='utf-8'):
    m = LOG.match(line.strip())
    if m:
        for S in screens:
            if S['id'] == m.group(2):
                S['done'] = {'at': m.group(1), 'text': m.group(3).replace('`', '')}

os.makedirs(os.path.join(OUT, 'shots', 'after'), exist_ok=True)
files = {}
for S in screens:
    for st in S['states']:
        st['after'] = os.path.exists(os.path.join(ROOT, 'shots', 'after', st['id'] + '.png'))
        for m in MODES:
            for sub in [''] + (['after/'] if st['after'] else []):
                name = sub + st['id'] + m + '.png'
                shutil.copyfile(os.path.join(ROOT, 'shots', name), os.path.join(OUT, 'shots', name))
                files['shots/' + name] = 'shots/' + name

J = os.path.join(ROOT, 'screens', 'journeys.json')
D = {'screens': screens}
if os.path.exists(J):
    D['journeys'] = json.load(open(J, encoding='utf-8'))
EV = os.path.join(ROOT, 'screens', 'event-scenes.json')   # sự kiện ???: cách diễn từng tình huống (owner 2026-11-05), góp ý theo từng sự kiện
if os.path.exists(EV):
    D['eventScenes'] = json.load(open(EV, encoding='utf-8'))
data = json.dumps(D, ensure_ascii=False).replace('</', '<\\/')
html = open(os.path.join(HERE, 'template.html'), encoding='utf-8').read().replace('/*DATA*/', data, 1)
open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(html)
print('index.html', len(html), 'bytes ·', len(screens), 'screen(s)')
print(json.dumps(files))
