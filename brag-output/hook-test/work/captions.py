"""Caption đa ngôn ngữ cho biến thể clip (xem edl_zzz_lang.py).
usage: python captions.py export [ID ...]        -> captions/todo.csv: mọi caption (meme / end card) của các clip, kèm bản dịch đã có
       python captions.py import captions/todo.csv -> gộp cột pt-BR / es / ja / zh-CN vào captions/<lang>.json (giữ _meta, _clips, @clip)
       python captions.py copy                     -> ../share-copy.<lang>.txt: title cho mọi biến thể đã có mp4 trong ../out
       python captions.py status                   -> clip nào đã đủ bản dịch theo từng ngôn ngữ
Dịch bằng người bản xứ / freelancer: mở todo.csv bằng Google Sheets, điền cột ngôn ngữ, xuất CSV lại rồi import."""
import sys, os, re, csv, json
sys.stdout.reconfigure(encoding='utf-8', errors='replace')   # console Windows mặc định cp1252

LANGS = ['pt-BR', 'es', 'ja', 'zh-CN']
CAP = 'captions'
os.makedirs(CAP, exist_ok=True)
EDL = json.load(open('edl.json', encoding='utf-8'))
norm = lambda s: re.sub(r'\s+', ' ', str(s)).strip()
plain = lambda s: re.sub(r'\s+', ' ', re.sub(r'<br\s*/?>', ' ', s)).strip()


def load(lang):
    f = os.path.join(CAP, f'{lang}.json')
    return json.load(open(f, encoding='utf-8')) if os.path.exists(f) else {'_meta': {'size': 0.9 if lang in ('ja', 'zh-CN') else 1.0}}


def strings(ids):
    """{caption: [clip ids]} cho meme + end card, kể cả body / hookframes được tham chiếu"""
    out = {}
    def walk(cid, src, seen):
        if cid in seen or cid not in EDL: return
        seen.add(cid)
        E = EDL[cid]
        for t in E.get('texts', []):
            if t.get('k') not in ('meme', 'end'): continue
            for k in ('s', 'ask', 'slot'):
                if isinstance(t.get(k), str): out.setdefault(norm(t[k]), []).append(src)
        for ref in ('body', 'hookframes'):
            if E.get(ref): walk(E[ref], src, seen)
    for cid in ids: walk(cid, cid, set())
    return out


def cmd_export(ids):
    ids = ids or [k for k in EDL if k != '_doc' and '__' not in k and isinstance(EDL[k], dict)]
    T = {l: load(l) for l in LANGS}
    rows = strings(ids)
    f = os.path.join(CAP, 'todo.csv')
    with open(f, 'w', encoding='utf-8-sig', newline='') as fh:
        w = csv.writer(fh)
        w.writerow(['key', 'used_in', 'en'] + LANGS)
        for key, used in sorted(rows.items(), key=lambda kv: (-len(kv[1]), kv[0])):
            w.writerow([key, ' '.join(dict.fromkeys(used))[:80], plain(key)] + [T[l].get(key, '') for l in LANGS])
    print(f'{f}: {len(rows)} caption từ {len(ids)} clip. Giữ nguyên <br> (xuống dòng) và emoji trong bản dịch.')


def cmd_import(path):
    T = {l: load(l) for l in LANGS}
    n = {l: 0 for l in LANGS}
    with open(path, encoding='utf-8-sig', newline='') as fh:
        for r in csv.DictReader(fh):
            key = norm(r.get('key', ''))
            if not key: continue
            for l in LANGS:
                v = (r.get(l) or '').strip()
                if v and T[l].get(key) != v: T[l][key] = v; n[l] += 1
    for l in LANGS:
        json.dump(T[l], open(os.path.join(CAP, f'{l}.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('import:', n, '-> captions/<lang>.json. Chạy python edl.py để tạo biến thể.')


def cmd_copy():
    out_dir = os.path.join('..', 'out')
    by_lang = {}
    for vid, E in EDL.items():
        if '__' not in vid or not isinstance(E, dict): continue
        if not os.path.exists(os.path.join(out_dir, f'{vid}.mp4')): continue
        caps = [plain(t['s']) for t in E.get('texts', []) if t.get('k') == 'meme' and t['t0'] < E.get('split', 99)]
        base = E.get('base', vid.split('__')[0])
        title = f"{caps[0].rstrip(':')} vs {caps[1].rstrip(':')}" if base.startswith('R') and len(caps) > 1 else (caps[0] if caps else vid)
        by_lang.setdefault(E.get('lang'), []).append((vid, title))
    for lang, rows in by_lang.items():
        f = os.path.join('..', f'share-copy.{lang}.txt')
        with open(f, 'w', encoding='utf-8') as fh:
            fh.write(f'STREET FOOTBALL CHAOS · biến thể {lang} · title = caption mở đầu đã dịch (ID  title)\n' + '=' * 60 + '\n')
            for vid, title in sorted(rows): fh.write(f'{vid:18s}  {title}\n')
        print(f, len(rows), 'clip')
    if not by_lang: print('chưa có biến thể nào được encode trong ../out')


def cmd_status():
    ids = [k for k in EDL if k != '_doc' and '__' not in k and isinstance(EDL[k], dict)]
    for l in LANGS:
        T = load(l)
        done = [i for i in ids if all(k in T for k in strings([i]))]
        print(f'{l}: {len(done)}/{len(ids)} clip đủ bản dịch', ('-> ' + ' '.join(done[:12]) + (' …' if len(done) > 12 else '')) if done else '')


if __name__ == '__main__':
    a = sys.argv[1:]
    if not a or a[0] == 'status': cmd_status()
    elif a[0] == 'export': cmd_export(a[1:])
    elif a[0] == 'import': cmd_import(a[1] if len(a) > 1 else os.path.join(CAP, 'todo.csv'))
    elif a[0] == 'copy': cmd_copy()
    else: print(__doc__)
