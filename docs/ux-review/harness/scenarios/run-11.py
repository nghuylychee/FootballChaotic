"""run-11: RUN OVER — phần mang về chỉ là icon + số ('★ +45' không ai hiểu, không biết còn bao xa tới Core kế).
?runtest: dựng thẻ RUN OVER (thua 1-2, +48 gold, +45 Core Road, mở được Thunder Kick, tiến trình Core Road = 105) -> nhìn -> rê chuột lên ★."""
import sys, json
import os; UX = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # = docs/ux-review/harness
sys.path.insert(0, UX)
from ux import record

QUERY = '?runtest'
PROFILE = None
SETUP = ("SFC.RunTest.card('map'); const R = SFC.Run.run; R.offer = null; R.over = true; R.log.push({ act: 0, node: '0.0', kind: 'match', team: 'pigeon_gang', my: 1, op: 2 });"
         "R.metaGold = 48; R.roadGain = 45; R.newCores = ['thunder_kick']; SFC.Run.stats().road = 105; SFC.RunUI.reset(); SFC.Menu.render()")


def steps(pg, h):
    h.wait(500)
    h.js(SETUP)
    h.wait(2600)
    h.move(770, 340, steps=28, wait=1800)   # ★ +45 (bản cũ) / chip CORE ROAD (bản mới)
    h.move(709, 470, steps=20, wait=1400)   # icon Core mới


if __name__ == '__main__':
    which = sys.argv[1:] or ['before', 'after']
    if 'before' in which:
        record('http://localhost:8701', steps, UX + '/videos/run-11-before.mp4', query=QUERY, profile=PROFILE)
    if 'after' in which:
        record('http://localhost:8713', steps, UX + '/videos/run-11-after.mp4', query=QUERY, profile=PROFILE)
