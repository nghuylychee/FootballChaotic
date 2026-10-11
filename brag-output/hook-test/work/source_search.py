"""Find candidate real-football hook clips on YouTube (metadata only, nothing downloaded).
usage: python source_search.py  -> candidates.json (per query: id, title, duration, views), sorted by views
Each query targets one kind of moment that maps onto a move the game can echo."""
import sys, json, subprocess
from concurrent.futures import ThreadPoolExecutor

QUERIES = {
    # violence -> dropkick / punch / hundred fists
    'cantona kung fu kick': 'dropkick', 'de jong kung fu kick world cup final 2010': 'dropkick', 'zidane headbutt materazzi': 'punch',
    'suarez bite chiellini': 'punch', 'pepe crazy moments': 'dropkick', 'sergio ramos red card moments': 'dropkick',
    'football fights shorts': 'punch', 'goalkeeper punches player football': 'punch', 'roy keane haaland tackle': 'dropkick',
    'diego costa fight moments': 'punch', 'football karate kick red card': 'dropkick', 'balotelli funny moments': 'aura',
    # flops -> tiny touch, huge flight
    'neymar dive roll': 'flop', 'rivaldo dive 2002 world cup': 'flop', 'busquets peek dive': 'flop', 'worst dives football shorts': 'flop',
    # power -> meteor / fireball / scissor
    'roberto carlos free kick 1997': 'meteor', 'hulk powerful shot goal': 'meteor', 'ronaldo knuckleball free kick': 'meteor',
    'zlatan bicycle kick england': 'scissor', 'rooney bicycle kick manchester derby': 'scissor', 'thunder strike goal shorts': 'meteor',
    # keepers -> save / keeper blasted / giant keeper
    'higuita scorpion kick': 'keeper', 'best goalkeeper saves shorts': 'keeper', 'goalkeeper funny fail shorts': 'keeper',
    'ball hits goalkeeper face': 'keeper',
    # speed and skill -> lightning dash / clones / aura
    'messi dribble past 5 players': 'dash', 'ronaldinho skills shorts': 'clones', 'mbappe speed run': 'dash',
    'neymar rainbow flick': 'aura', 'ronaldinho no look pass': 'aura', 'vinicius dance skills': 'aura',
    # celebrations -> aura farming / titan
    'ronaldo siuu celebration': 'aura', 'cole palmer cold celebration': 'aura', 'balotelli why always me': 'aura',
    'mbappe crossed arms celebration': 'aura', 'haaland meditation celebration': 'aura',
    # chaos and comedy -> skits
    'referee gets hit by ball football': 'punch', 'worst miss open goal football': 'meteor', 'funny own goal football shorts': 'chaos',
    'football funny moments shorts': 'chaos', 'shaolin soccer goalkeeper scene': 'meteor', 'shaolin soccer team kung fu': 'dropkick',
}


def search(q):
    r = subprocess.run([sys.executable, '-m', 'yt_dlp', f'ytsearch12:{q}', '--flat-playlist', '-J'], capture_output=True, text=True, encoding='utf-8')
    try: es = json.loads(r.stdout).get('entries', [])
    except Exception: es = []
    out = [{'id': e.get('id'), 'title': e.get('title'), 'duration': e.get('duration'), 'views': e.get('view_count') or 0,
            'url': f"https://www.youtube.com/watch?v={e.get('id')}"} for e in es if e.get('id')]
    return q, sorted(out, key=lambda e: -e['views'])


with ThreadPoolExecutor(6) as ex:
    res = dict(ex.map(search, QUERIES))
json.dump({'queries': {q: {'move': QUERIES[q], 'hits': res[q]} for q in QUERIES}}, open('candidates.json', 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
for q in QUERIES:
    good = [e for e in res[q] if e['duration'] and e['duration'] <= 90]
    top = good[0] if good else None
    print(f"{q[:40]:40s} {len(res[q]):2d} hits | best short: {top['views'] if top else '-':>10} {top['duration'] if top else '':>4}s {(top['title'] or '')[:50] if top else ''}")
