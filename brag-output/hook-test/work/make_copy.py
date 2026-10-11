"""Write the posting copy and the local review page for every finished clip.
usage: python make_copy.py   -> ../share-copy.txt (titles = each clip's opening caption) + ../review.html (grid of all clips, open it in a browser)"""
import json, os, re, html

EDL = json.load(open('edl.json', encoding='utf-8'))
OUT = os.path.join('..', 'out')
PICKS = {p['id']: p for p in json.load(open('picks2.json', encoding='utf-8'))} if os.path.exists('picks2.json') else {}
HOOKS = {h['id']: h for h in json.load(open('hooks.json', encoding='utf-8'))}


def plain(s): return re.sub(r'\s+', ' ', re.sub(r'<br\s*/?>', ' ', s)).strip()


BODY_NAMES = {'B1': 'B1 · features (original body)', 'B2': 'B2 · ultimates countdown', 'B3': 'B3 · story mode', 'B4': 'B4 · drip and loot',
              'B5': 'B5 · chaos reel', 'B6': 'B6 · controls', 'B7': 'B7 · build / draft', 'B8': 'B8 · rival story', 'B9': 'B9 · keepers hate this',
              'B10': 'B10 · teamwork', 'B11': 'B11 · clutch'}
BODY_NAMES.update({f'B{n}': f'B{n} · PvP: ' + nm for n, nm in zip(range(12, 32), ['how online works', 'squad up with friends', 'signature ultimates', 'ranked climb', 'voice chat chaos', 'trash talk → payback', 'online clutch', 'the carry', 'teammates "helping"', 'best plays of the night', 'private room', 'matched with strangers', 'ultimate clash', 'comeback 0-2 → 3-2', 'no fixed keeper', 'results screen flex', 'rage quit', '3-friend passing', '6 players, 6 ultimates', 'the rematch loop'])})


def key(i):
    if '_' in i:
        h, b = i.split('_'); return (4, h[0], int(h[1:]), int(b[1:]))
    return ({'R': 0, 'G': 1, 'P': 2, 'S': 3}[i[0]], int(i[1:]))


ids = sorted([i for i in EDL if re.fullmatch(r'[RGPS]\d+(_B\d+)?', i) and os.path.exists(os.path.join(OUT, f'{i}.mp4'))], key=key)
for _h in ('G1', 'R12'):   # the body test's B1 versions are the original clips
    if _h in ids: ids.append(_h + '_B1')
ids.sort(key=key)
rows = []
for i in ids:
    combo = '_' in i
    hid = i.split('_')[0]
    E = EDL.get(i) or EDL[hid]
    caps = [plain(t['s']) for t in E.get('texts', []) if t.get('k') == 'meme' and t['t0'] < E.get('split', 99)]
    src = ''
    if i[0] == 'R':
        p = PICKS.get(i) or HOOKS.get(i) or {}
        src = p.get('who') or p.get('moment', '')
    title = f"{caps[0].rstrip(':')} vs {caps[1].rstrip(':')}" if i[0] == 'R' and len(caps) > 1 else (caps[0] if caps else i)
    if i[0] == 'P' and EDL.get(i, {}).get('body'):
        src = 'body: ' + BODY_NAMES.get(EDL[i]['body'], EDL[i]['body'])
    if combo:
        b = i.split('_')[1]
        title = f"{title}  [{BODY_NAMES.get(b, b)}]"
        src = (src + ' · ' if src else '') + 'body: ' + BODY_NAMES.get(b, b)
    rows.append({'id': i, 'title': title, 'caps': caps, 'src': src, 'dur': E['dur'], 'file': hid if (combo and i.endswith('_B1') and i not in EDL) else i, 'grp': 'X' if combo else i[0]})

with open(os.path.join('..', 'share-copy.txt'), 'w', encoding='utf-8') as f:
    f.write("STREET FOOTBALL CHAOS · hook test · copy to paste when posting\n" + '=' * 65 + "\n\n")
    f.write("PINNED COMMENT (the same on every clip so it isn't a variable in the test):\n"
            "Game: Street Football Chaos. Street football where tackles are punches and dropkicks. Playtest soon, follow and I'll drop the link here 👀\n\n")
    f.write("DESCRIPTION (the same on every clip):\nPixel street football. No tackle button, just punches, dropkicks and anime ultimates. Playtest soon.\n"
            "#shorts #indiegame #football #gamedev #pixelart\n\n")
    f.write("R clips use real match / film footage (muted). Check the Copyright tab after posting; film clips (Shaolin Soccer) are the most likely to be claimed.\n\n")
    f.write("TITLES (title = the clip's opening caption)\n" + '-' * 45 + "\n")
    grp = None
    for r in rows:
        if r['grp'] != grp:
            grp = r['grp']
            f.write({'R': '\n# R · real hook\n', 'G': '\n# G · gameplay hook\n', 'P': '\n# P · PvP hook with player cams (+ a PvP body)\n',
                     'S': '\n# S · staged skit\n', 'X': '\n# body test + skit + body (same hook, different body)\n'}[grp])
        f.write(f"{r['id']:4s} {r['title']}\n")
print('share-copy.txt:', len(rows), 'clips')

cards = {'R': [], 'G': [], 'P': [], 'S': [], 'X': []}
for r in rows:
    caps = ' → '.join(html.escape(c) for c in r['caps'])
    src = f'<div class="src">{html.escape(r["src"])}</div>' if r['src'] else ''
    cards[r['grp']].append(f'''<figure id="{r["id"]}"><video src="out/{r["file"]}.mp4" poster="out/{r["file"]}.jpg" preload="none" controls loop playsinline></video>
<figcaption><b>{r["id"]}</b> <span class="d">{r["dur"]:.1f}s</span><div class="c">{caps}</div>{src}</figcaption></figure>''')
names = {'R': 'R · real football hook → the same move in the game', 'G': 'G · gameplay hook', 'P': 'P · PvP hook with player cams (+ a PvP body)', 'S': 'S · staged skit', 'X': 'Body test (same hook, 11 bodies) + skit + body'}
sections = ''.join(f'<h2 id="g{g}">{names[g]} <small>{len(cards[g])} clips</small></h2><div class="grid">{"".join(cards[g])}</div>' for g in 'RGPSX' if cards[g])
page = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Hook test review</title>
<style>
:root {{ --bg: #f6f4f1; --card: #fff; --ink: #1b1820; --mute: #6b6573; --line: #e4dfd8; --accent: #d9304a; }}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{ --bg: #141116; --card: #1f1b22; --ink: #f1edf4; --mute: #a39cab; --line: #322c37; --accent: #ff5a72; }} }}
:root[data-theme="dark"] {{ --bg: #141116; --card: #1f1b22; --ink: #f1edf4; --mute: #a39cab; --line: #322c37; --accent: #ff5a72; }}
* {{ box-sizing: border-box; }}
body {{ margin: 0; background: var(--bg); color: var(--ink); font: 14px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; }}
header {{ position: sticky; top: 0; z-index: 2; background: var(--bg); border-bottom: 1px solid var(--line); padding: 12px 16px; display: flex; gap: 16px; align-items: baseline; flex-wrap: wrap; }}
header h1 {{ margin: 0; font-size: 18px; }}
header a {{ color: var(--accent); text-decoration: none; font-weight: 600; }}
main {{ padding: 0 16px 48px; max-width: 1500px; margin: 0 auto; }}
h2 {{ margin: 28px 0 12px; font-size: 16px; }} h2 small {{ color: var(--mute); font-weight: 400; }}
.grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 14px; }}
figure {{ margin: 0; background: var(--card); border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }}
video {{ display: block; width: 100%; aspect-ratio: 9 / 16; background: #000; }}
figcaption {{ padding: 8px 10px 10px; }}
figcaption .d {{ color: var(--mute); font-size: 12px; }}
figcaption .c {{ margin-top: 4px; }}
figcaption .src {{ margin-top: 4px; color: var(--mute); font-size: 12px; }}
</style></head><body>
<header><h1>Hook test · {len(rows)} clips</h1><a href="#gR">R ({len(cards["R"])})</a><a href="#gG">G ({len(cards["G"])})</a><a href="#gP">P ({len(cards["P"])})</a><a href="#gS">S ({len(cards["S"])})</a><a href="#gX">bodies ({len(cards["X"])})</a>
<span style="color:var(--mute)">click a clip to play · captions in order</span></header>
<main>{sections}</main></body></html>'''
open(os.path.join('..', 'review.html'), 'w', encoding='utf-8').write(page)
print('review.html:', len(rows), 'clips')
