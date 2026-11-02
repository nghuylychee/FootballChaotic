"""Dựng lại trang báo cáo UX: issues/*.json + report/meta.json + report/template.html -> report/out/index.html
  python docs/ux-review/report/build.py
Video: chỉ chép những file đang có trong harness/videos/ (vừa quay lại) vào report/out/videos/. Video không có ở máy
thì vẫn giữ đường dẫn videos/<id>-before.mp4: bản cũ đã nằm trên artifact, publish lại cùng url thì file không gửi được giữ nguyên.
In ra map `files` (chỉ video mới) để đưa vào Artifact publish (url = README.md, root = report/out).
"""
import json, os, glob, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # docs/ux-review
R = os.path.join(ROOT, 'report')
OUT = os.path.join(R, 'out')
VID = os.path.join(ROOT, 'harness', 'videos')
AREA = {'menus': 'Trang chủ & menu', 'run': 'GOAT PATH', 'match': 'Trong trận'}
USER_ORDER = ['user-01', 'user-02', 'user-03', 'user-04', 'user-05', 'user-06']
SEV = {'high': 0, 'med': 1, 'low': 2}
AREA_ORDER = {'menus': 0, 'run': 1, 'match': 2}

meta = json.load(open(os.path.join(R, 'meta.json'), encoding='utf-8'))
issues = []
for f in glob.glob(os.path.join(ROOT, 'issues', '*.json')):
    it = json.load(open(f, encoding='utf-8'))
    if it.get('status') == 'dropped':   # owner chọn "Không sửa" và đã chốt bỏ: không hiện nữa
        continue
    it['areaLabel'] = AREA.get(it.get('area'), it.get('area', ''))
    issues.append(it)


def key(it):
    if it['id'] in USER_ORDER:
        return (0, USER_ORDER.index(it['id']), 0, '')
    return (1, SEV.get(it.get('severity'), 1), AREA_ORDER.get(it.get('area'), 3), it['id'])


issues.sort(key=key)
os.makedirs(os.path.join(OUT, 'videos'), exist_ok=True)
files = {}
for it in issues:
    for k in ('before', 'after'):
        name = f"{it['id']}-{k}.mp4"
        it[k] = 'videos/' + name
        src = os.path.join(VID, name)
        if os.path.exists(src):   # vừa quay lại -> gửi lên
            shutil.copyfile(src, os.path.join(OUT, 'videos', name))
            files['videos/' + name] = 'videos/' + name
    for x in ('evidence', 'where', 'repro', 'direction'):
        it.pop(x, None)

tpl = open(os.path.join(R, 'template.html'), encoding='utf-8').read()
blob = json.dumps(dict(meta, issues=issues), ensure_ascii=False).replace('</', '<\\/')
open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(tpl.replace('/*__DATA__*/', blob))
print(len(issues), 'issues ·', len(files), 'video mới')
print('files =', json.dumps(files))
