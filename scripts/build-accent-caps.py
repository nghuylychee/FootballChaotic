# Dựng font phụ "SFC Accent Caps" (assets/fonts/SFCAccentCaps.woff2): chữ hoa có dấu vẽ lại đủ cao.
# Press Start 2P ép chữ hoa có dấu thấp bằng chữ thường để dấu lọt trong ô 8×8 (MUéVETE, PRóLOGO, VOCê).
# Ở đây lấy nguyên pixel của chữ hoa gốc (7 hàng) + dấu của chữ thường có dấu (á à â ã ä), đặt dấu lên trên ô chữ.
# Dấu nhô lên trên ô chữ 1/4 cỡ chữ; số đo dọc giữ y như Press Start 2P nên dòng có dấu không cao hơn dòng thường.
# Chỉ ngôn ngữ có `accentCaps: true` trong src/i18n/<mã>.js mới dùng font này (css/style.css: :root.accent-caps).
#
#   pip install fonttools brotli
#   python scripts/build-accent-caps.py
#
# Ngôn ngữ mới cần thêm chữ (È Î Ö...): thêm vào GLYPHS rồi chạy lại, nhớ thêm mã chữ vào unicode-range trong css/style.css.
# Giấy phép: chữ lấy từ Press Start 2P (SIL OFL 1.1, tên "Press Start 2P" được bảo lưu) -> bản sửa phải mang tên khác.
import os
from fontTools.ttLib import TTFont
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.recordingPen import DecomposingRecordingPen

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = os.path.join(ROOT, 'assets/fonts/PressStart2P-latin.woff2')
OUT = os.path.join(ROOT, 'assets/fonts/SFCAccentCaps.woff2')

# chữ cần vẽ: (chữ hoa gốc, chữ thường lấy dấu)
GLYPHS = {
    'À': ('A', 'à'), 'Á': ('A', 'á'), 'Â': ('A', 'â'), 'Ã': ('A', 'ã'),
    'É': ('E', 'é'), 'Ê': ('E', 'ê'), 'Í': ('I', 'á'),
    'Ó': ('O', 'ó'), 'Ô': ('O', 'ô'), 'Õ': ('O', 'õ'),
    'Ú': ('U', 'ú'), 'Ü': ('U', 'ü'), 'Ñ': ('N', 'ñ'),
}
# dấu sát đỉnh chữ dính thành cục -> nâng thêm 1 hàng (Â: dấu mũ trên đỉnh nhọn của A)
EXTRA_LIFT = {'Â': 1}

src = TTFont(SRC)
gs, cmap = src.getGlyphSet(), src.getBestCmap()
PX = src['head'].unitsPerEm // 8          # 1 pixel = 125 unit


def bitmap(ch):
    """pixel đang tô của 1 chữ: {(cột, hàng)}, hàng 1-7 là thân chữ hoa"""
    pen = DecomposingRecordingPen(gs)
    gs[cmap[ord(ch)]].draw(pen)
    polys, cur = [], []
    for op, args in pen.value:
        if op == 'moveTo': cur = [args[0]]
        elif op in ('lineTo', 'qCurveTo', 'curveTo'): cur.extend(args)
        elif op in ('closePath', 'endPath'):
            if cur: polys.append(cur)
            cur = []

    def inside(x, y):
        wn = 0
        for p in polys:
            for i in range(len(p)):
                (x1, y1), (x2, y2) = p[i], p[(i + 1) % len(p)]
                if (y1 <= y < y2 or y2 <= y < y1) and x1 + (y - y1) * (x2 - x1) / (y2 - y1) > x:
                    wn += 1 if y2 > y1 else -1
        return wn != 0
    return {(c, r) for r in range(-2, 11) for c in range(8) if inside(c * PX + PX / 2, r * PX + PX / 2)}


def compose(ch):
    base, lower = GLYPHS[ch]
    accent = {(c, r) for (c, r) in bitmap(lower) if r >= 6}     # dấu nằm trên x-height (hàng 6-7) của chữ thường
    lift = 2 + EXTRA_LIFT.get(ch, 0)
    return bitmap(base) | {(c, r + lift) for (c, r) in accent}


def contours(px):
    """viền vùng pixel, chiều kim đồng hồ (vùng tô bên phải) như TrueType; cạnh chung giữa 2 pixel tự triệt tiêu"""
    edges = {}

    def add(a, b):
        if b in edges and a in edges[b]:
            edges[b].remove(a)
            if not edges[b]: del edges[b]
        else:
            edges.setdefault(a, []).append(b)
    for (c, r) in px:
        add((c, r), (c, r + 1)); add((c, r + 1), (c + 1, r + 1)); add((c + 1, r + 1), (c + 1, r)); add((c + 1, r), (c, r))
    loops = []
    while edges:
        start = min(edges)
        loop, cur = [start], start
        while True:
            nxt = edges[cur].pop(0)
            if not edges[cur]: del edges[cur]
            cur = nxt
            if cur == start: break
            loop.append(cur)
        loops.append([p for i, p in enumerate(loop)     # bỏ điểm nằm giữa đoạn thẳng
                      if (p[0] - loop[i - 1][0]) * (loop[(i + 1) % len(loop)][1] - p[1]) != (p[1] - loop[i - 1][1]) * (loop[(i + 1) % len(loop)][0] - p[0])])
    return loops


order, glyphs, metrics, cmap_out = ['.notdef'], {'.notdef': TTGlyphPen(None).glyph()}, {'.notdef': (1000, 0)}, {}
for ch in GLYPHS:
    name = cmap[ord(ch)]
    px = compose(ch)
    pen = TTGlyphPen(None)
    for loop in contours(px):
        pen.moveTo((loop[0][0] * PX, loop[0][1] * PX))
        for p in loop[1:]: pen.lineTo((p[0] * PX, p[1] * PX))
        pen.closePath()
    order.append(name)
    glyphs[name] = pen.glyph()
    metrics[name] = (src['hmtx'][name][0], min(c for c, r in px) * PX)
    cmap_out[ord(ch)] = name

fb = FontBuilder(src['head'].unitsPerEm, isTTF=True)
fb.setupGlyphOrder(order)
fb.setupCharacterMap(cmap_out)
fb.setupGlyf(glyphs)
fb.setupHorizontalMetrics(metrics)
os2 = src['OS/2']
fb.setupHorizontalHeader(ascent=src['hhea'].ascent, descent=src['hhea'].descent, lineGap=src['hhea'].lineGap)
fb.setupOS2(version=4, sTypoAscender=os2.sTypoAscender, sTypoDescender=os2.sTypoDescender, sTypoLineGap=os2.sTypoLineGap,
            usWinAscent=os2.usWinAscent + 3 * PX, usWinDescent=os2.usWinDescent,   # win cao hơn: Windows không cắt phần dấu
            fsSelection=os2.fsSelection, sCapHeight=os2.sCapHeight, sxHeight=os2.sxHeight, usWeightClass=400, achVendID='NONE')
fb.setupNameTable({
    'copyright': 'Copyright 2012 The Press Start 2P Project Authors (cody@zone38.net). Accented capitals redrawn for Street Football Chaos.',
    'familyName': 'SFC Accent Caps', 'styleName': 'Regular', 'uniqueFontIdentifier': 'SFCAccentCaps-Regular',
    'fullName': 'SFC Accent Caps', 'psName': 'SFCAccentCaps-Regular', 'version': 'Version 1.000',
    'licenseDescription': 'This Font Software is licensed under the SIL Open Font License, Version 1.1.',
    'licenseInfoURL': 'https://openfontlicense.org',
})
fb.setupPost()
fb.font.flavor = 'woff2'
fb.save(OUT)

print(f'{os.path.relpath(OUT, ROOT)}: {len(GLYPHS)} chữ')
for ch in GLYPHS:
    px = compose(ch)
    print(ch, ' '.join(''.join('#' if (c, r) in px else '.' for c in range(8)) for r in range(10, 0, -1)))
