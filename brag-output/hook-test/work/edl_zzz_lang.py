# Biến thể ngôn ngữ (tool 2 của kế hoạch marketing): <ID>__<lang> cho mọi clip đã có đủ bản dịch caption trong captions/<lang>.json.
# Chạy sau cùng (zzz) để biến thể của combo cũng có. Quy trình: python captions.py export -> dịch captions/todo.csv ->
# python captions.py import captions/todo.csv -> python edl.py -> python build.py BODY__pt-BR R12__pt-BR ... -> python captions.py copy
# captions/<lang>.json: { "_meta": {"size": 0.9}, "_clips": ["R12", ...] (tùy chọn: ép tạo kể cả khi thiếu bản dịch),
#                        "<caption gốc>": "<bản dịch>", "@R12": { "<caption gốc>": "<bản dịch riêng cho clip R12>" } }
# Chuỗi chưa dịch giữ nguyên tiếng Anh và được ghi vào captions/missing.<lang>.txt.
import copy as _copy, glob as _glob, json as _json, os as _os, re as _re

_norm = lambda s: _re.sub(r'\s+', ' ', str(s)).strip()
_TEXT_KEYS = ('s', 'ask', 'slot', 'a', 'b', 'msg', 'label')       # các trường chữ trong EDL.texts (meme / end / tag / badge / chat)
_REQUIRED = {'meme', 'end'}                                         # chỉ 2 loại này bắt buộc có bản dịch; tag / badge (tên riêng) thì tùy
_report = {}
for _f in sorted(_glob.glob(_os.path.join('captions', '*.json'))):
    _lang = _os.path.splitext(_os.path.basename(_f))[0]
    if _lang.startswith('_') or _lang == 'todo': continue
    try: _T = _json.load(open(_f, encoding='utf-8'))
    except Exception as _e: print('SKIPPED', _f, '->', repr(_e)); continue
    _meta = _T.get('_meta', {})
    _size = float(_meta.get('size', 1.0))
    _forced = set(_T.get('_clips') or [])
    _missing = set()

    def _lookup(s, cid):
        key = _norm(s)
        over = _T.get('@' + cid) or {}
        if key in over: return over[key]
        if key in _T and not key.startswith(('_', '@')): return _T[key]
        return None

    def _strings(cid, seen=None):
        """mọi chuỗi bắt buộc của clip cid, tính cả body / hookframes"""
        seen = seen or set()
        if cid in seen or cid not in EDL: return set()
        seen.add(cid)
        E = EDL[cid]
        out = {_norm(t[k]) for t in E.get('texts', []) if t.get('k') in _REQUIRED for k in _TEXT_KEYS if isinstance(t.get(k), str)}
        for ref in ('body', 'hookframes'):
            if E.get(ref): out |= _strings(E[ref], seen)
        return out

    def _variant(cid, seen):
        vid = f'{cid}__{_lang}'
        if vid in EDL or vid in seen: return vid
        seen.add(vid)
        E = _copy.deepcopy(EDL[cid])
        for t in E.get('texts', []):
            for k in _TEXT_KEYS:
                if isinstance(t.get(k), str):
                    tr = _lookup(t[k], cid)
                    if tr is None:
                        if t.get('k') in _REQUIRED: _missing.add(_norm(t[k]))
                    else: t[k] = tr
            if t.get('k') == 'meme' and _size != 1.0: t['size'] = round(t.get('size', 92) * _size)
        for ref in ('body', 'hookframes'):
            if E.get(ref) and E[ref] in EDL: E[ref] = _variant(E[ref], seen)
        E['lang'] = _lang
        E['base'] = cid
        EDL[vid] = E
        return vid

    _seen, _made = set(), []
    for _cid in [k for k in list(EDL) if k != '_doc' and '__' not in k and isinstance(EDL[k], dict)]:
        if _cid in _forced or all(_lookup(s, _cid) is not None for s in _strings(_cid)):
            _variant(_cid, _seen); _made.append(_cid)
    if _missing:
        open(_os.path.join('captions', f'missing.{_lang}.txt'), 'w', encoding='utf-8').write('\n'.join(sorted(_missing)) + '\n')
    _report[_lang] = (len(_made), len(_missing))
if _report:
    print('lang variants:', ', '.join(f'{l}: {n} clips ({m} missing captions)' for l, (n, m) in _report.items()))   # ASCII: console cp1252
