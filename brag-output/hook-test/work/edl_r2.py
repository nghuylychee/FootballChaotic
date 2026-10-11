# R11-R60: batch-2 real hooks (picks2.json from merge_r2.py, frames from real2.py). Runs inside edl.py (seg / real / meme / F / rg in scope).
import json as _json, os as _os
if _os.path.exists('picks2.json'):
    for _p in _json.load(open('picks2.json', encoding='utf-8')):
        _cnt = _os.path.join('real', _p['id'], 'count.json')
        if not _os.path.exists(_cnt) or not _os.path.exists(_os.path.join('frames', _p['take'], 'meta.json')):
            continue
        _n = _json.load(open(_cnt))['n']
        _L = round(min(float(_p['len']), _n / 30), 3)
        _imp = min(float(_p['impact_rel']), _L)
        _hit_v = round(_L + float(_p['hit']) - float(_p['c0']), 3)
        _size = _p.get('size', 92 if max(len(_p['irl']), len(_p['game'])) < 18 else 84)
        _segs = [real(0, _L, _p['id'], 0.0, z0=1.0, z1=1.08, punch=[_imp] if _imp < _L - 0.02 else []),
                 seg(_L, SPLIT, _p['take'], float(_p['c0']), cam=F(_p.get('z', 2.0), 0.18), punch=[_hit_v] if _hit_v < SPLIT else [])]
        _texts = [meme(_p['irl'], 0, _L, pop=False, size=_size), meme(_p['game'], _L + 0.05, SPLIT - 0.05, size=_size)]
        EDL[_p['id']] = rg(_segs, _texts, [['tension', 0, _L, {}], ['groove', _L, SPLIT, {}]],
                           [[_imp, 1.2], [_L, 1.5]] + ([[_hit_v, 1.3]] if _hit_v < SPLIT else []), crowd=[[0, _L]], flashk=0.8)
