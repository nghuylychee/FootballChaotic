"""Quay video TRƯỚC / SAU cho 1 vấn đề UX, cùng 1 kịch bản trên 2 bản game.
  python docs/ux-review/harness/rec.py <id> [before|after|both] [--before URL] [--after URL]
Mặc định: before = http://localhost:8701 (bản gốc: npm run serve -- --port 8701 trên main)
          after  = http://localhost:8720 (bản đã sửa: npm run serve -- --port 8720 trong worktree / nhánh có patch)
Kịch bản: scenarios/<id>.py (steps(pg, h) + QUERY, PROFILE, EXTRA_INIT / PREP tuỳ chọn).
Video ra harness/videos/<id>-before.mp4 / -after.mp4 (thư mục bị gitignore; bản đã duyệt nằm trong artifact báo cáo).
Cần: pip install playwright imageio-ffmpeg + Chrome cài sẵn (ux.py mở channel='chrome').
"""
import sys, os, json, importlib.util

H = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, H)
sys.path.insert(0, os.path.join(H, 'review', 'match'))
from ux import record

args = sys.argv[1:]
if not args:
    sys.exit(__doc__)
iid = args[0]
which = args[1] if len(args) > 1 and not args[1].startswith('--') else 'both'


def opt(name, d):
    return args[args.index(name) + 1] if name in args else d


BASES = {'before': opt('--before', 'http://localhost:8701'), 'after': opt('--after', 'http://localhost:8720')}

spec = importlib.util.spec_from_file_location('scn_' + iid.replace('-', '_'), os.path.join(H, 'scenarios', iid + '.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
q = getattr(m, 'QUERY', '') or ''
prof = getattr(m, 'PROFILE', None)
if isinstance(prof, str):   # đường dẫn file hồ sơ JSON
    prof = json.load(open(prof if os.path.isabs(prof) else os.path.join(H, prof), encoding='utf-8'))
extra = getattr(m, 'EXTRA_INIT', None) or getattr(m, 'PREP', None)   # PREP của menus-08 chặn máy chủ thật

os.makedirs(os.path.join(H, 'videos'), exist_ok=True)
for kind in ('before', 'after'):
    if which in (kind, 'both'):
        out = os.path.join(H, 'videos', f'{iid}-{kind}.mp4')
        print(kind, '->', record(BASES[kind], m.steps, out, query=q, profile=prof, extra_init=extra))
