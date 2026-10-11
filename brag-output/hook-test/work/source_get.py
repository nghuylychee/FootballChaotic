"""Download the picked real-football clips (video only, <=1080 wide) into ../source/r2/<id>.mp4 + sources.json (title, views, move).
usage: python source_get.py   (skips files already there)"""
import sys, os, json, subprocess
from concurrent.futures import ThreadPoolExecutor
import imageio_ffmpeg

OUT = os.path.join('..', 'source', 'r2')
os.makedirs(OUT, exist_ok=True)
# id, what it is, game move it echoes
PICKS = [
    ('WRDzXV7IgiI', 'Cantona kung-fu kick 1995', 'dropkick'), ('yeaON2fLeno', "De Jong's kung-fu kick on Xabi Alonso, 2010 final", 'dropkick'),
    ('vF4iWIE77Ts', 'Zidane headbutts Materazzi', 'headbutt'), ('DL2fzmMPTMI', 'Suarez bites Chiellini', 'bite'),
    ('fWnsrTx9Y6E', 'Pepe red card (stamps on Casquero)', 'stomp'), ('Ec0CT8yzjAo', 'Pepe kicking out, red card', 'dropkick'),
    ('ptUqab-RBEw', 'Cuadrado red card vs Ramos', 'flop'), ('vAD6bxoojfw', 'Feyenoord keeper thinks outside the box', 'keeper'),
    ('Oc8x1j2E-38', 'Keeper Ricardo Goss punches a player', 'punch'), ('6nGkafx3-Ks', 'Roy Keane on Alf-Inge Haaland', 'dropkick'),
    ('KCoaeuKgd_w', 'Diego Costa vs Fazio fight', 'punch'), ('l-SB8umpypM', 'Muller high kick vs Ajax', 'dropkick'),
    ('6S3flAAkBO0', 'Balotelli "Why always me?"', 'aura'), ('qbJ0ZFSv7ic', 'Neymar rolling, 2018', 'flop'),
    ('OiW0IPrv1Ro', 'Rivaldo dive, 2002', 'flop'), ('MgrVpZUGToI', "Busquets' peek after being fouled", 'flop'),
    ('favUcsMcxCY', 'Player dives at the touch of the referee', 'flop'), ('crKwlbwvr88', 'Roberto Carlos free kick, 1997', 'curve'),
    ('B02Aa-7GCWY', 'Hulk power shot in training', 'meteor'), ('TZd_CU1MVHw', 'Hulk free kick into the wall', 'meteor'),
    ('2V7GakGutlQ', "Ronaldo's knuckleball at 1000 fps", 'thunder'), ('RM_5tJncHww', "Zlatan's bicycle kick vs England", 'scissor'),
    ('qZV9UWY5wwY', "Rooney's bicycle kick, Manchester derby", 'scissor'), ('v19OXidntFk', "Higuita's scorpion kick", 'keeper'),
    ('o3NKSLKTeDM', "'World's best' penalty save", 'keeper'), ('b19zyNR7DDo', "Ibrahimovic throws the ball at the keeper's face", 'face'),
    ('hYOXtngsE4U', "Rimando's face save", 'face'), ('QMx6ssastKI', 'Goalkeeper knocks himself out', 'keeper'),
    ('wXiiKbZWLDM', "Zieler's unlucky punch", 'keeper'), ('CSSGqzsM4B0', 'Messi dribble vs USA', 'dash'),
    ('NJZn7tCQemU', 'Messi vs 8 Atletico players', 'clones'), ('0AveWEbJ1HY', 'Mbappe at 39 km/h', 'dash'),
    ('zJTCZg96Qf8', 'Neymar rainbow flick', 'aura'), ('jooT2tmk4WY', 'Ronaldinho no-look', 'aura'),
    ('ZcOmw4rDCQU', 'Ronaldo celebration, loudest roar', 'aura'), ('3AyqBXO5g40', 'Cole Palmer cold celebration', 'aura'),
    ('RxaI6K7CqfU', 'Haaland celebration', 'titan'), ('qnKNyAn1Zl8', 'Rodrygo and Vinicius dance', 'clones'),
    ('qruhGfyKENc', 'Referee blocks a goal-bound shot', 'chaos'), ('xSfwcI8wsMY', 'Worst open goal miss ever', 'miss'),
    ('yTHyVcD40zQ', "Dzeko's open goal miss", 'miss'), ('kHWNk6Y2uy0', "Maguire's own goal celebration", 'chaos'),
    ('rnKk3fTncro', "Haiti keeper's own goal", 'chaos'), ('ivfTNE9WDGo', 'Clumsy own goal, Copenhagen vs Rijeka', 'chaos'),
    ('xHzZ5QdGBIw', 'Shaolin Soccer: goalkeeper K.O. (film)', 'meteor'),
]
ff = imageio_ffmpeg.get_ffmpeg_exe()


def get(p):
    vid, what, move = p
    dst = os.path.join(OUT, f'{vid}.mp4')
    if os.path.exists(dst): return vid, 'have'
    r = subprocess.run([sys.executable, '-m', 'yt_dlp', '-q', '--no-warnings', '--no-playlist', '--ffmpeg-location', ff,
                        '-f', 'bv*[height<=1920][ext=mp4]/bv*[height<=1920]/b[height<=1920]', '-o', dst,
                        f'https://www.youtube.com/watch?v={vid}'], capture_output=True, text=True, encoding='utf-8')
    return vid, 'ok' if os.path.exists(dst) else 'FAIL ' + r.stderr.strip()[-200:]


with ThreadPoolExecutor(4) as ex:
    res = dict(ex.map(get, PICKS))
meta = json.load(open('candidates.json', encoding='utf-8'))['queries']
views = {h['id']: (h['views'], h['title'], h['duration']) for q in meta.values() for h in q['hits']}
src = [{'id': v, 'file': f'r2/{v}.mp4', 'what': w, 'move': m, 'views': views.get(v, (0,))[0], 'title': views.get(v, (0, ''))[1],
        'duration': views.get(v, (0, '', 0))[2], 'status': res[v]} for v, w, m in PICKS]
json.dump(src, open('sources.json', 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
print(sum(1 for s in src if s['status'] in ('ok', 'have')), 'of', len(src), 'downloaded')
for s in src:
    if s['status'] not in ('ok', 'have'): print(' ', s['id'], s['what'], s['status'])
