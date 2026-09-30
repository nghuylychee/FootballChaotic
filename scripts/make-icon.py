#!/usr/bin/env python3
"""Icon pixel art của game (tạm): lưới 32x32 -> build/icon.png (512), build/icon.ico (256/128/64/48/32/16, icon file .exe),
assets/icon.png (256, icon cửa sổ lúc chạy), build/icon-sheet.png (xem thử các cỡ).
Không cần thư viện ngoài (PNG / ICO tự ghi bằng zlib). Chạy: python3 scripts/make-icon.py
Hình: quả bóng lửa lao chéo lên (vệt lửa + tia tốc độ) trên nền ô vuông bo góc tím đêm, viền mực + viền vàng.
"""
import math, os, struct, zlib

N = 32
INK = (20, 12, 22)
PAL = {
    'bg0': (78, 46, 118), 'bg1': (62, 36, 98), 'bg2': (48, 26, 80), 'bg3': (36, 18, 62),
    'rim': (255, 225, 79), 'rimD': (201, 162, 39),
    'white': (243, 234, 215), 'wS': (201, 191, 174), 'wH': (255, 255, 255), 'blk': (32, 24, 40),
    'fy': (255, 243, 176), 'fY': (255, 225, 79), 'fo': (255, 154, 61), 'fr': (255, 61, 90), 'fR': (168, 32, 58),
    'spark': (255, 246, 192), 'line': (157, 123, 255),
}

grid = [[None] * N for _ in range(N)]   # màu RGB hoặc None (trong suốt)
fg = [[False] * N for _ in range(N)]    # pixel thuộc bóng / lửa (để kẻ viền mực)


def put(x, y, c, is_fg=False):
    if 0 <= x < N and 0 <= y < N:
        grid[y][x] = PAL[c] if isinstance(c, str) else c
        if is_fg:
            fg[y][x] = True


# ---------- nền: ô vuông bo góc, dải màu tối dần xuống dưới, viền mực + viền vàng ----------
R = 5
def inside_round(x, y, pad=0):
    lo, hi = pad, N - 1 - pad
    if not (lo <= x <= hi and lo <= y <= hi):
        return False
    r = max(1, R - pad)
    cx, cy = min(max(x, lo + r), hi - r), min(max(y, lo + r), hi - r)   # tâm góc bo gần nhất
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r + r * 0.6

for y in range(N):
    for x in range(N):
        if not inside_round(x, y, 0):
            continue
        if not inside_round(x, y, 1):
            put(x, y, INK)
        elif not inside_round(x, y, 2):
            put(x, y, 'rim' if (x + y) < N else 'rimD')
        else:
            band = min(3, (y - 2) * 4 // (N - 4))
            c = ('bg0', 'bg1', 'bg2', 'bg3')[band]
            # dither ranh giới dải
            if (y - 2) * 4 % (N - 4) < 4 and band > 0 and (x + y) % 2 == 0:
                c = ('bg0', 'bg1', 'bg2', 'bg3')[band - 1]
            put(x, y, c)

# ---------- tia tốc độ (sau lửa) ----------
for (x0, y0, ln) in ((5, 14, 5), (8, 22, 6), (13, 26, 4), (4, 19, 3)):
    for k in range(ln):
        put(x0 + k, y0 - k, 'line')

# ---------- vệt lửa: từ tâm bóng kéo chéo xuống trái, loe dần về phía bóng, mép lửa răng cưa ----------
BX, BY, BR = 19.5, 11.5, 6.5
dx, dy = -1 / math.sqrt(2), 1 / math.sqrt(2)     # hướng đuôi lửa
L = 20.0
for y in range(N):
    for x in range(N):
        px, py = x + 0.5 - BX, y + 0.5 - BY
        t = px * dx + py * dy                  # dọc đuôi
        s = -px * dy + py * dx                 # ngang đuôi
        if t <= 2 or t > L:
            continue
        k = t / L
        w = 5.6 * (1 - k) ** 1.05 + 0.8 * math.sin(t * 1.7 + (1 if s > 0 else 2.6))
        if abs(s) > w or not inside_round(x, y, 2):
            continue
        q = abs(s) / max(w, 0.01)
        if k > 0.78:
            c = 'fR' if q > 0.4 else 'fr'
        elif q < 0.28 and k < 0.55:
            c = 'fy'
        elif q < 0.5:
            c = 'fY'
        elif q < 0.78:
            c = 'fo'
        else:
            c = 'fr'
        put(x, y, c, True)

# ---------- quả bóng: vẽ tay trên lưới 13x13 (w trắng · s bóng đổ / đường khâu · b mảng đen · h ánh sáng) ----------
BALL = [
    '....wbbbw....',
    '..wwwwbwwww..',
    '.whhwwswwwww.',
    '.whwwwswwwww.',
    'wwwwwwswwwwww',
    'bwwwwwbwwwwwb',
    'bbsssbbbsssbb',
    'bwwwwbbbwwwwb',
    'wwwwswwwswwss',
    '.wbswwwwwsbs.',
    '.bbwwwwwssbb.',
    '..bbwwwssbb..',
    '....wssss....',
]
X0, Y0 = int(BX - 6), int(BY - 6)
for j2, row in enumerate(BALL):
    for i2, ch in enumerate(row):
        if ch != '.':
            put(X0 + i2, Y0 + j2, {'w': 'white', 's': 'wS', 'b': 'blk', 'h': 'wH'}[ch], True)

# ---------- viền mực quanh bóng + lửa ----------
edge = []
for y in range(N):
    for x in range(N):
        if fg[y][x] or grid[y][x] is None:
            continue
        if any(0 <= x + ox < N and 0 <= y + oy < N and fg[y + oy][x + ox] for ox, oy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
            if inside_round(x, y, 2):
                edge.append((x, y))
for x, y in edge:
    put(x, y, INK)

# ---------- tia lửa / lấp lánh ----------
for (x, y, c) in ((27, 4, 'spark'), (28, 5, 'fY'), (26, 5, 'fY'), (27, 6, 'fY'), (27, 3, 'fY'),
                  (7, 9, 'spark'), (24, 22, 'fo'), (11, 5, 'fY')):
    if grid[y][x] is not None and not fg[y][x]:
        put(x, y, c)


# ---------- ghi file ----------
def scaled(scale, src=None):
    src = src or grid
    n = len(src)
    rows = []
    for y in range(n * scale):
        row = bytearray([0])
        for x in range(n * scale):
            c = src[y // scale][x // scale]
            row += bytes(c + (255,)) if c else b'\x00\x00\x00\x00'
        rows.append(bytes(row))
    return n * scale, b''.join(rows)


def png_bytes(size, raw):
    def chunk(t, d):
        return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))


def downsample(k):
    """16px: lấy mẫu theo khối k x k, ưu tiên pixel không phải nền (giữ bóng + lửa)"""
    n = N // k
    out = [[None] * n for _ in range(n)]
    for y in range(n):
        for x in range(n):
            block = [(grid[y * k + j][x * k + i], fg[y * k + j][x * k + i]) for j in range(k) for i in range(k)]
            f = [c for c, isf in block if isf and c and c != INK]
            nonnull = [c for c, _ in block if c]
            out[y][x] = f[0] if len(f) >= 2 else (max(set(nonnull), key=nonnull.count) if nonnull else None)
    return out


root = os.path.join(os.path.dirname(__file__), '..', 'build')
os.makedirs(root, exist_ok=True)
with open(os.path.join(root, 'icon.png'), 'wb') as f:
    f.write(png_bytes(*scaled(16)))
# icon lúc chạy (cửa sổ / taskbar / Dock): assets/ được đóng gói cùng game, build/ thì không
with open(os.path.join(os.path.dirname(__file__), '..', 'assets', 'icon.png'), 'wb') as f:
    f.write(png_bytes(*scaled(8)))

# ICO chứa PNG (Windows Vista+): 256, 128, 64, 48, 32 phóng từ lưới 32, 16 lấy mẫu riêng
entries = []
for sz in (256, 128, 64, 48, 32):
    s = sz // N if sz % N == 0 else None
    if s:
        entries.append((sz, png_bytes(*scaled(s))))
    else:  # 48: phóng x3 từ 16? dùng lưới 32 phóng gần đúng
        src = [[grid[int(y * N / sz)][int(x * N / sz)] for x in range(sz)] for y in range(sz)]
        entries.append((sz, png_bytes(*scaled(1, src))))
entries.append((16, png_bytes(*scaled(1, downsample(2)))))
head = struct.pack('<HHH', 0, 1, len(entries))
off = 6 + 16 * len(entries)
dirs, datas = b'', b''
for sz, data in entries:
    dirs += struct.pack('<BBBBHHII', sz % 256, sz % 256, 0, 0, 1, 32, len(data), off + len(datas))
    datas += data
with open(os.path.join(root, 'icon.ico'), 'wb') as f:
    f.write(head + dirs + datas)

# bảng xem thử: nền tối + nền sáng, các cỡ 16 / 32 / 64 / 128 / 256
sizes = [16, 32, 64, 128, 256]
W, H = sum(sizes) + 20 * (len(sizes) + 1), (256 + 40) * 2
sheet = [[(24, 18, 30) if y < H // 2 else (236, 236, 240) for x in range(W)] for y in range(H)]
xo = 20
for sz in sizes:
    src = downsample(2) if sz == 16 else grid
    n = len(src)
    for half in (0, 1):
        y0 = half * (H // 2) + 20 + (256 - sz)
        for y in range(sz):
            for x in range(sz):
                c = src[y * n // sz][x * n // sz]
                if c:
                    sheet[y0 + y][xo + x] = c
    xo += sz + 20
rows = b''.join(b'\x00' + b''.join(bytes(c + (255,)) for c in row) for row in sheet)
def png_rect(w, h, raw):
    def chunk(t, d):
        return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))
with open(os.path.join(root, 'icon-sheet.png'), 'wb') as f:
    f.write(png_rect(W, H, rows))
print('build/icon.png, build/icon.ico, build/icon-sheet.png')
