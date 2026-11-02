"""match-09: Skill game CHICKEN CATCH, bắt 7 con gà (mốc 3 / 6 / 10) -> hết giờ.
Trước: Beat 2 ghi 'LONG FC 0 - 0 The Uncles', bảng tỉ số toàn 0, +0 gold +0 XP + thanh LV.
Sau: Beat 2 giữ thanh 3 mốc + '7 / 10 CHICKENS', chỉ khung thưởng run ở giữa."""
import sys
import os; UX = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # = docs/ux-review/harness
sys.path.insert(0, UX); sys.path.insert(0, UX + '/review/match'); sys.path.insert(0, UX + '/w8716')
from mlib import hide_dev

QUERY = '?runtest=skill.chicken'
PROFILE = None
EXTRA_INIT = "(() => { let s = 20261102; Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();"

def steps(pg, h):
    hide_dev(h)
    h.wait(300)
    getattr(h, 'mark', lambda: None)()
    h.wait(1500)                                                   # HUD: thanh 3 mốc 3 / 6 / 10
    h.js("(() => { SFC.app.game.drill.val = 7; })()")              # bắt được 7 con gà
    h.wait(1500)
    h.js("(() => { SFC.app.game.drill.time = 0.05; })()")          # hết giờ
    h.wait(800)
    h.js("(() => { const g = SFC.app.game; if (g.state !== 'ended') g.end(); })()")
    h.wait(3600)                                                   # Beat 1: SILVER! 7 CHICKENS
    h.move(640, 400, steps=10, wait=300)
    h.wait(4200)                                                   # Beat 2

if __name__ == '__main__':
    from lib import rec
    rec('http://localhost:8701', steps, UX + '/videos/match-09-before.mp4', query=QUERY, extra_init=EXTRA_INIT)
    rec('http://localhost:8716', steps, UX + '/videos/match-09-after.mp4', query=QUERY, extra_init=EXTRA_INIT)
