"""Pixel 'webcam' portraits for the PvP player cams, drawn by the game's own SFC.Sprites.drawAvatar.
usage: python portraits.py   -> portraits/<handle>.png (transparent, 10x nearest-neighbour) + portraits/players.json
Handles are made up (no real people). Each player = a team kit + a look built from real cosmetic items."""
import os, sys, json, base64, datetime, io
from PIL import Image
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
SEED_JS = open(os.path.join(HERE, '..', '..', 'tools', 'clip-pack', 'capture.py'), encoding='utf-8').read().split('SEED_JS = """')[1].split('"""')[0]
# handle, team, look (hair, face, fx, skin 0-4, hairColor 0-2)
PLAYERS = [
    ('NGH', 'street_kings', dict(hair='spiky', face='none', fx='nofx', skin=0, hairColor=0)),
    ('tuanbeo', 'street_kings', dict(hair='cap', face='mustache', fx='nofx', skin=2, hairColor=1)),
    ('kaito_04', 'street_kings', dict(hair='headphones', face='shades', fx='nofx', skin=1, hairColor=0)),
    ('zzz_mi', 'neon_strikers', dict(hair='bun', face='blush', fx='hearts', skin=1, hairColor=0)),
    ('bigboss99', 'neon_strikers', dict(hair='crown', face='goldtooth', fx='nofx', skin=3, hairColor=1)),
    ('xX_vex_Xx', 'neon_strikers', dict(hair='mohawk', face='warpaint', fx='nofx', skin=0, hairColor=2)),
    ('mochi', 'cyber_united', dict(hair='beanie', face='nerd', fx='nofx', skin=1, hairColor=1)),
    ('DUKE', 'cyber_united', dict(hair='helmet', face='visor', fx='nofx', skin=4, hairColor=0)),
    ('panda.exe', 'cyber_united', dict(hair='bowl', face='cyborg', fx='nofx', skin=0, hairColor=0)),
    ('ratking', 'underground_fc', dict(hair='bandana', face='scar', fx='smoke', skin=2, hairColor=0)),
    ('jinx', 'underground_fc', dict(hair='longhair', face='eyepatch', fx='nofx', skin=3, hairColor=2)),
    ('m0le', 'underground_fc', dict(hair='afro', face='freckles', fx='nofx', skin=4, hairColor=1)),
]
OUT = os.path.join(HERE, 'portraits')
os.makedirs(OUT, exist_ok=True)
JS = """(players) => players.map(([name, team, look]) => {
  const kit = (SFC_CONFIG.teams.list || SFC_CONFIG.teams)[team].kit;
  const full = Object.assign({}, SFC_CONFIG.progression.defaultLook, look);
  full.skin = SFC_CONFIG.teams.skins[look.skin % SFC_CONFIG.teams.skins.length];
  full.cut = look.hair;                                         // the drawn hairstyle lives in 'cut'; 'hair' is its colour
  full.hair = kit.hair[look.hairColor % kit.hair.length];
  const cv = document.createElement('canvas'); cv.width = 40; cv.height = 46;
  SFC.Sprites.drawAvatar(cv, full, kit, 0.25, Math.PI / 2);
  return [name, team, kit.shirt, cv.toDataURL('image/png')];
})"""
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome')
    pg = b.new_page()
    pg.add_init_script(SEED_JS % 7)
    pg.clock.install(time=datetime.datetime(2026, 1, 1, tzinfo=datetime.timezone.utc))
    pg.goto('http://127.0.0.1:8765/index.html')
    pg.clock.run_for(2000)
    res = pg.evaluate(JS, [[n, t, l] for n, t, l in PLAYERS])
    b.close()
meta = {}
for name, team, color, url in res:
    im = Image.open(io.BytesIO(base64.b64decode(url.split(',')[1]))).convert('RGBA')
    bbox = im.getbbox()
    im = im.crop(bbox) if bbox else im
    im = im.resize((im.width * 10, im.height * 10), Image.NEAREST)
    fn = name.replace('.', '_') + '.png'
    im.save(os.path.join(OUT, fn))
    meta[name] = {'file': f'portraits/{fn}', 'team': team, 'color': color, 'size': im.size}
json.dump(meta, open(os.path.join(OUT, 'players.json'), 'w'), indent=1)
print(len(meta), 'portraits:', ', '.join(f"{k} {v['size']}" for k, v in meta.items()))
