"""Wireframe low-fi 2 phương án cho map GOAT PATH, vẽ từ đúng map act 1 trong profile_run_map.json
(trạng thái giữa act giống ảnh map-mid: đã qua 0.0 -> 1.1 -> 2.1, đang trỏ 3.2).
  python wire_map.py  ->  screens/map.wire-a.svg (map dọc, sửa trạng thái) + screens/map.wire-b.svg (map ngang, cả act)
Màu lấy từ class (wf-*), trang báo cáo tô theo token sáng / tối.
"""
import os, json, math

HERE = os.path.dirname(os.path.abspath(__file__))
R = json.load(open(os.path.join(HERE, '..', 'ux-review', 'harness', 'profile_run_map.json'), encoding='utf-8'))['run']
FL = R['map']['floors']
BOSS = dict(R['map']['boss'], f=7)
PATH, AT, SEL = ['0.0', '1.1', '2.1'], '2.1', '3.2'
NODES = {n['id']: n for f in FL for n in f}
NODES['boss'] = BOSS
AVAIL = set(NODES[AT]['next'])
NAME = {'match': 'MATCHDAY', 'elite': 'ELITE', 'skill': 'SKILL GAME', 'shop': 'SHOP', 'legend': 'LEGEND TRIAL', 'boss': 'BOSS'}
# hằng số thật của runmap.js (đơn vị 640x360)
MAP_W, ROW_H, PAD_X, PAD_Y, F = 576, 66, 44, 50, 7
BOX = (32, 52, 576, 270)   # khung map trên màn 640x360


def state(n):
    if n['id'] == AT: return 'at'
    if n['id'] in PATH: return 'done'
    if n['id'] in AVAIL: return 'avail'
    if n['f'] <= NODES[AT]['f']: return 'past'
    return 'future'


def glyph(kind, x, y, r):
    s = r * 0.5
    if kind == 'match':
        return f'<circle class="wf-ico" cx="{x}" cy="{y}" r="{s:.1f}"/><circle class="wf-icof" cx="{x}" cy="{y}" r="{s*0.32:.1f}"/>'
    if kind == 'elite':
        return f'<rect class="wf-ico" x="{x-s*0.8:.1f}" y="{y-s*0.6:.1f}" width="{s*1.6:.1f}" height="{s*1.2:.1f}" rx="2"/><path class="wf-ico" d="M{x-s*0.3:.1f} {y-s*0.6:.1f}v{s*0.6:.1f}M{x+s*0.2:.1f} {y-s*0.6:.1f}v{s*0.6:.1f}"/>'
    if kind == 'skill':
        return f'<path class="wf-ico" d="M{x} {y-s:.1f}L{x+s*0.8:.1f} {y+s*0.8:.1f}H{x-s*0.8:.1f}Z"/>'
    if kind == 'shop':
        return f'<text class="wf-g" x="{x}" y="{y+s*0.55:.1f}" font-size="{s*1.8:.1f}">$</text>'
    if kind == 'legend':
        pts = ' '.join(f'{x+math.cos(-math.pi/2+i*math.pi/5)*(s if i % 2 == 0 else s*0.45):.1f},{y+math.sin(-math.pi/2+i*math.pi/5)*(s if i % 2 == 0 else s*0.45):.1f}' for i in range(10))
        return f'<polygon class="wf-ico" points="{pts}"/>'
    if kind == 'boss':
        return f'<path class="wf-ico" d="M{x-s:.1f} {y+s*0.5:.1f}L{x-s:.1f} {y-s*0.5:.1f}L{x-s*0.4:.1f} {y:.1f}L{x} {y-s*0.7:.1f}L{x+s*0.4:.1f} {y:.1f}L{x+s:.1f} {y-s*0.5:.1f}L{x+s:.1f} {y+s*0.5:.1f}Z"/>'
    return ''


def node(n, x, y, r):
    st = state(n)
    sel = n['id'] == SEL
    if sel: r *= 1.2
    ring = 'leg' if n['kind'] == 'legend' else 'boss' if n['kind'] == 'boss' else ''
    out = f'<g class="wf-n {st} {ring} {"sel" if sel else ""}"><circle class="wf-nc" cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}"/>'
    out += glyph(n['kind'], round(x, 1), round(y, 1), r)
    if st == 'done':   # đã qua: dấu ✓ phấn thay viền màu act
        out += f'<path class="wf-tick" d="M{x+r*0.35:.1f} {y-r*0.95:.1f}l{r*0.25:.1f} {r*0.25:.1f}l{r*0.5:.1f} -{r*0.5:.1f}"/>'
    out += '</g>'
    return out


def label(x, y, text):
    w = len(text) * 6.2 + 12
    return (f'<g class="wf-lab"><rect x="{x-w/2:.1f}" y="{y-8:.1f}" width="{w:.1f}" height="15" rx="1"/>'
            f'<text x="{x:.1f}" y="{y+3:.1f}">{text}</text></g>')


def you(x, y):
    """Dấu BẠN: mặt nhân vật + chữ, đứng ngay dưới node đang ở."""
    return (f'<g class="wf-you"><rect x="{x-19:.1f}" y="{y:.1f}" width="38" height="13" rx="6"/>'
            f'<circle cx="{x-11:.1f}" cy="{y+6.5:.1f}" r="3.2"/><text x="{x+4:.1f}" y="{y+9.6:.1f}">BẠN</text></g>')


def pin(n, x, y):
    return f'<g class="wf-pin"><circle cx="{x}" cy="{y}" r="7"/><text x="{x}" y="{y+3}">{n}</text></g>'


def lines(P):
    out = []
    for n in NODES.values():
        for m in n['next']:
            a, b = P[n['id']], P[m]
            cls = 'done' if n['id'] in PATH and m in PATH else 'next' if n['id'] == AT and m in AVAIL else ''
            if not cls and (state(n) == 'past' or state(NODES[m]) == 'past'): cls = 'past'
            out.append(f'<line class="wf-l {cls}" x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}"/>')
    return ''.join(out)


def chrome(body, extra=''):
    """Khung chung: thanh trên (SQUAD + tiền), khung map, bảng chú thích dưới."""
    bx, by, bw, bh = BOX
    legend, lx = [], 120
    for k in ['match', 'elite', 'skill', 'shop', 'legend', 'boss']:
        legend.append(f'<g class="wf-n future {"leg" if k == "legend" else ""}" style="opacity:1"><circle class="wf-nc" cx="{lx}" cy="337" r="6.5"/>{glyph(k, lx, 337, 6.5)}</g>'
                      f'<text class="wf-t" x="{lx+10}" y="340">{NAME[k]}</text>')
        lx += len(NAME[k]) * 5.4 + 30
    top = ('<g class="wf-bar"><rect x="32" y="14" width="232" height="26" rx="2"/>'
           '<text class="wf-t" x="42" y="31">SQUAD</text>'
           '<text class="wf-t" x="96" y="31">◉ 71</text><text class="wf-t" x="136" y="31">◉ 70 ✚</text><text class="wf-t" x="188" y="31">◉ 70</text>'
           '<rect class="wf-bd" x="226" y="21" width="9" height="12"/><rect class="wf-bd" x="238" y="21" width="9" height="12"/><rect class="wf-bd" x="250" y="21" width="9" height="12"/>'
           '<rect x="552" y="14" width="56" height="26" rx="2"/><text class="wf-t" x="562" y="31">$ 85</text></g>')
    return (f'<svg class="wf" viewBox="0 0 640 360" role="img" xmlns="http://www.w3.org/2000/svg">'
            f'<rect class="wf-bg" width="640" height="360"/>{top}'
            f'<defs><clipPath id="wfc{extra}"><rect x="{bx}" y="{by}" width="{bw}" height="{bh}"/></clipPath></defs>'
            f'<rect class="wf-map" x="{bx}" y="{by}" width="{bw}" height="{bh}"/>'
            f'<g clip-path="url(#wfc{extra})">{body}</g>'
            f'<rect class="wf-frame" x="{bx}" y="{by}" width="{bw}" height="{bh}"/>'
            + ''.join(legend))


# ---------- A: map dọc như hiện nay, chỉ sửa trạng thái / thứ bậc ----------
def wire_a():
    bx, by, bw, bh = BOX
    off = 240 - (PAD_Y + (F - 2 + NODES[AT]['jy'] * 0.6) * ROW_H)   # cuộn để node đang ở nằm ở y 240 như ảnh map-mid

    def pos(n):
        if n['kind'] == 'boss': return (bx + MAP_W / 2, by - 52 + PAD_Y + off)
        fl = FL[n['f']]; k = len(fl); i = fl.index(n); slot = (MAP_W - PAD_X * 2) / k
        return (bx + PAD_X + slot * (i + 0.5) + n['jx'] * 0.3 * min(slot, 140), by - 52 + PAD_Y + (F - n['f'] + n['jy'] * 0.6) * ROW_H + off)
    P = {i: pos(n) for i, n in NODES.items()}
    pitch = (f'<g class="wf-pitch"><line x1="{bx}" y1="{by+bh/2-30}" x2="{bx+bw}" y2="{by+bh/2-30}"/>'
             f'<circle cx="{bx+bw/2}" cy="{by+bh/2-30}" r="52"/></g>')
    nodes = ''.join(node(n, *P[i], 17 if n['kind'] != 'boss' else 25) for i, n in NODES.items())
    ax, ay = P[AT]; sx, sy = P[SEL]
    body = pitch + lines(P) + nodes + you(ax, ay + 21) + label(sx, sy - 33, NAME[NODES[SEL]['kind']])
    chips = ('<g class="wf-chip"><rect x="300" y="56" width="40" height="13" rx="1"/><text x="320" y="66">▲ BOSS</text></g>'
             '<g class="wf-chip"><rect x="308" y="305" width="24" height="13" rx="1"/><text x="320" y="315">▼</text></g>')
    e = P['3.1']; d = P['1.1']; L = P['4.0']
    pins = (pin(1, round(e[0] - 30), round(e[1] - 6)) + pin(2, round(d[0] + 26), round(d[1] - 10)) + pin(3, round(ax - 32), round(ay + 28))
            + pin(4, round(L[0] + 26), round(L[1] - 12)) + pin(5, round((P['3.2'][0] + P['4.2'][0]) / 2 + 14), round((P['3.2'][1] + P['4.2'][1]) / 2)) + pin(6, 352, 62))
    return chrome(body, 'a') + chips + pins + '</svg>'


# ---------- B: map ngang, cả act trong 1 màn, boss ở khung thành bên phải ----------
def wire_b():
    bx, by, bw, bh = BOX
    colw = (bw - 92) / 7

    def pos(n):
        if n['kind'] == 'boss': return (bx + bw - 34, by + bh / 2)
        fl = FL[n['f']]; k = len(fl); i = fl.index(n); slot = (bh - 56) / k
        return (bx + 46 + (n['f'] + n['jy'] * 0.4) * colw, by + 28 + slot * (i + 0.5) + n['jx'] * 0.3 * min(slot, 80))
    P = {i: pos(n) for i, n in NODES.items()}
    cy = by + bh / 2
    pitch = (f'<g class="wf-pitch"><line x1="{bx+bw/2}" y1="{by}" x2="{bx+bw/2}" y2="{by+bh}"/><circle cx="{bx+bw/2}" cy="{cy}" r="40"/>'
             f'<rect x="{bx}" y="{cy-70}" width="58" height="140"/><rect x="{bx+bw-58}" y="{cy-70}" width="58" height="140"/></g>'
             f'<rect class="wf-goal" x="{bx-6}" y="{cy-24}" width="6" height="48"/><rect class="wf-goal" x="{bx+bw}" y="{cy-24}" width="6" height="48"/>')
    nodes = ''.join(node(n, *P[i], 13 if n['kind'] != 'boss' else 19) for i, n in NODES.items())
    ax, ay = P[AT]; sx, sy = P[SEL]
    body = pitch + lines(P) + nodes + you(ax, ay + 17) + label(sx, sy - 27, NAME[NODES[SEL]['kind']])
    s = P['6.1']
    pins = (pin(1, bx + 14, round(cy - 34)) + pin(2, bx + bw - 34, round(cy - 34)) + pin(3, round(s[0] - 2), round(s[1] - 24)) + pin(4, round(sx + 22), round(sy + 12)))
    return chrome(body, 'b') + pins + '</svg>'


if __name__ == '__main__':
    os.makedirs(os.path.join(HERE, 'screens'), exist_ok=True)
    for name, svg in (('map.wire-a.svg', wire_a()), ('map.wire-b.svg', wire_b())):
        open(os.path.join(HERE, 'screens', name), 'w', encoding='utf-8').write(svg)
        print(name, len(svg))
