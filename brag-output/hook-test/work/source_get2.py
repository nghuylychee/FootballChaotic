"""Download the second round of real-football sources (clean 4K scene packs, video only) into ../source/r3/<id>.mp4 + sources2.json.
usage: python source_get.py   (skips files already there)"""
import sys, os, json, subprocess
from concurrent.futures import ThreadPoolExecutor
import imageio_ffmpeg

OUT = os.path.join('..', 'source', 'r3')
os.makedirs(OUT, exist_ok=True)
# id, what it is, game move it echoes
PICKS = [
    ('ARVQrBlYqXQ', 'Pepe craziest moments: tackles, fights, red cards', 'dropkick'), ('04Q6ybR1bLc', 'Ramos best tackles and blocks', 'dropkick'),
    ('1GVjJNYOMyA', 'Ramos 4K clips', 'dropkick'), ('cNMlB7Fz-W8', 'Ramos scenepack 4K', 'dropkick'), ('DblKkPBkhCk', 'Pepe 4K clips', 'dropkick'),
    ('xspxc-YrXmQ', 'Zlatan best 4K clips', 'aura'), ('F42fW1CfHxk', 'Ronaldo 4K clips', 'aura'), ('29mtSn1RdMQ', 'Ronaldo free clips 4K 60fps', 'aura'),
    ('VqL4Cqrnle4', 'Messi 4K clips', 'dash'), ('QduBvCxXhVw', 'Messi celebration scenepack', 'aura'), ('KQr86FZwHD4', 'Neymar 4K clips', 'flop'),
    ('zSPkdQZiR5U', 'Neymar celebration scenepack', 'aura'), ('_l1SMZUDC8g', 'Vinicius free clips', 'aura'), ('PD1KPNeroDM', 'Haaland 4K clips', 'titan'),
    ('VuhF---3qMw', 'Mbappe 4K scenepack', 'dash'), ('p5Uf4k44E3w', 'Ronaldo bicycle kick 4K', 'scissor'), ('fp4Z-3-BHGE', 'Messi bicycle kick 4K', 'scissor'),
    ('mJrhYS6-9yI', 'Roberto Carlos free kick 4K 60fps', 'curve'), ('q6mZ3ORXeB0', 'Ronaldinho scenepack', 'clones'), ('rLpdzMqM-HI', 'Players dancing 4K', 'aura'),
    ('yhAhbqclIzw', 'Balotelli 4K clips', 'aura'), ('mqTA-9UH16s', 'Enzo Fernandez crazy goal vs England 4K', 'meteor'),
    ('d8aES-7D1Ug', 'Neymar free kick vs PSG 4K 60fps', 'curve'), ('1B9PsVQXEG8', 'Keeper reel: Ochoa saves', 'keeper_save'),
    ('dK-m64roJpU', 'Best saves, World Cup 2026', 'keeper_save'),
]
ff = imageio_ffmpeg.get_ffmpeg_exe()


def get(p):
    vid, what, move = p
    dst = os.path.join(OUT, f'{vid}.mp4')
    if os.path.exists(dst): return vid, 'have'
    r = subprocess.run([sys.executable, '-m', 'yt_dlp', '-q', '--no-warnings', '--no-playlist', '--ffmpeg-location', ff,
                        '-f', 'bv*[height<=2160][ext=mp4]/bv*[height<=2160]/b[height<=2160]', '-o', dst,
                        f'https://www.youtube.com/watch?v={vid}'], capture_output=True, text=True, encoding='utf-8')
    return vid, 'ok' if os.path.exists(dst) else 'FAIL ' + r.stderr.strip()[-200:]


with ThreadPoolExecutor(4) as ex:
    res = dict(ex.map(get, PICKS))
meta = json.load(open('candidates2.json', encoding='utf-8'))
views = {h['id']: (h['views'], h['title'], h['duration']) for hs in meta.values() for h in hs}
src = [{'id': v, 'file': f'r3/{v}.mp4', 'what': w, 'move': m, 'views': views.get(v, (0,))[0], 'title': views.get(v, (0, ''))[1],
        'duration': views.get(v, (0, '', 0))[2], 'status': res[v]} for v, w, m in PICKS]
json.dump(src, open('sources2.json', 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
print(sum(1 for s in src if s['status'] in ('ok', 'have')), 'of', len(src), 'downloaded')
for s in src:
    if s['status'] not in ('ok', 'have'): print(' ', s['id'], s['what'], s['status'])
