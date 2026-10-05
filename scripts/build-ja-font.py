# Dựng font tiếng Nhật "SFC JP" (assets/fonts/DotGothic16-ja.woff2): DotGothic16 (font pixel 16px, SIL OFL 1.1) cắt chỉ còn
# những chữ bản dịch tiếng Nhật đang dùng + đủ bộ kana + dấu câu Nhật, để bản web không phải tải cả font ~2 MB chữ Hán.
# Font gốc: scripts/fonts/DotGothic16-Regular.ttf (không đóng gói vào game; nguồn: github.com/google/fonts ofl/dotgothic16).
# CSS dùng font này làm font dự phòng sau Press Start 2P / VT323 (css/style.css: @font-face "SFC JP", "SFC JP VT"):
# chữ Latin vẫn vẽ bằng font cũ, chỉ kana / chữ Hán rơi xuống font này.
#
#   pip install fonttools brotli
#   python scripts/build-ja-font.py
#
# Sửa / thêm chuỗi trong src/i18n/ja.js thì chạy lại (chữ Hán mới chưa có trong font sẽ hiện bằng font hệ thống, không phải pixel).
import os
import sys
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = os.path.join(ROOT, 'scripts/fonts/DotGothic16-Regular.ttf')
OUT = os.path.join(ROOT, 'assets/fonts/DotGothic16-ja.woff2')
TEXT = [os.path.join(ROOT, 'src/i18n/ja.js')]

# luôn có: dấu câu Nhật, hiragana, katakana, chữ toàn khổ (ＡＢＣ１２３！？) + Latin / số / ký hiệu
# (bản Nhật vẽ cả chữ Latin của chữ thân bằng font này: "SFC JP Body" trong css/style.css; tên người chơi, chuỗi chưa dịch)
ALWAYS = [(0x3000, 0x303F), (0x3040, 0x309F), (0x30A0, 0x30FF), (0xFF01, 0xFF5E), (0xFF61, 0xFF9F),
          (0x0020, 0x007E), (0x00A0, 0x00FF), (0x2010, 0x2027), (0x2190, 0x2193), (0x2605, 0x2606)]


def main():
    sys.stdout.reconfigure(encoding='utf-8')   # console Windows (cp1252) không in được chữ Việt / Nhật
    chars = set()
    for lo, hi in ALWAYS:
        chars.update(range(lo, hi + 1))
    for f in TEXT:
        with open(f, encoding='utf-8') as fh:
            chars.update(ord(c) for c in fh.read() if ord(c) >= 0x2E80)
    font = TTFont(SRC)
    have = font.getBestCmap()
    keep = sorted(c for c in chars if c in have)
    missing = sorted(c for c in chars if c not in have and not any(lo <= c <= hi for lo, hi in ALWAYS))
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['*']
    opts.name_IDs = ['*']
    opts.notdef_outline = True
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=keep)
    sub.subset(font)
    font.flavor = 'woff2'
    font.save(OUT)
    print(f'{os.path.relpath(OUT, ROOT)}: {len(keep)} chữ, {os.path.getsize(OUT) // 1024} KB')
    if missing:
        print('font gốc không có:', ''.join(chr(c) for c in missing))


if __name__ == '__main__':
    main()
