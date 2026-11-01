"""Batch 5 edit lists (Titan recipe: opener = ours goes through all three and scores, then a second Ultimate, end card). python edls.py"""
import json
CAPS = [
    {"v0": 0.3, "v1": 1.85, "y": 1170, "text": "NO REFEREE."},
    {"v0": 1.95, "v1": 3.2, "y": 250, "text": "3V3 STREET FOOTBALL"},
    {"v0": 3.2, "v1": 5.0, "y": 250, "text": "STACK CORES.<br>UNLOCK ULTIMATES."},
]
def clip(segs):
    return {"fps": 30, "dur": 10.4, "bpm": 150, "hit": 0.0, "segs": segs, "caps": CAPS}
CUT = lambda take: {"v0": 3.2, "v1": 3.8, "take": take, "c0": 0.4, "r": 1, "cam": {"t": "pl", "i": 1, "dy": -14, "z": 3.4}, "cut": True, "cutin": True}
OUT = lambda take, r=0.45: {"v0": 6.4, "v1": 10.4, "take": take, "c0": 3.6, "r": r, "cam": {"t": "pt", "x": 320, "y": 180, "z": 1.6875}, "cut": True, "outro": True}

E = {
    # frame 0: the MAX boulder's first SQUASH; three in 0.7 s; jump to the boulder crumbling, ours runs onto the ball and scores
    "boulder": clip([
        {"v0": 0.0, "v1": 1.1, "take": "boulder", "c0": 2.8, "r": 1, "cam": {"t": "pl", "i": 1, "dy": -16, "z": 3.0}, "cut": True},
        {"v0": 1.1, "v1": 2.0, "take": "boulder", "c0": 6.6, "r": 1.5, "cam": {"t": "pl", "i": 1, "dy": -10, "z": 2.8}, "cut": True},
        {"v0": 2.0, "v1": 3.2, "take": "boulder", "c0": 7.95, "r": 1, "cam": {"t": "ball", "z": 2.6}, "blend": 0.4},
        CUT("comet"),
        {"v0": 3.8, "v1": 6.4, "take": "comet", "c0": 1.0, "r": 1, "cam": {"t": "ball", "z": 2.8}, "cut": True, "blend": 0.4},
        OUT("comet"),
    ]),
    # frame 0: mid slow-motion zip past their three; time snaps back, all three slip, spiral shot, goal at 1.35
    "bullet": clip([
        {"v0": 0.0, "v1": 1.1, "take": "bullet", "c0": 1.05, "r": 1, "cam": {"t": "pl", "i": 1, "dy": -10, "z": 3.0}, "cut": True},
        {"v0": 1.1, "v1": 2.0, "take": "bullet", "c0": 2.15, "r": 1, "cam": {"t": "ball", "z": 2.6}, "blend": 0.3},
        {"v0": 2.0, "v1": 3.2, "take": "bullet", "c0": 3.05, "r": 1, "cam": {"t": "ball", "z": 2.4}, "blend": 0.4},
        CUT("panic"),
        {"v0": 3.8, "v1": 6.4, "take": "panic", "c0": 1.0, "r": 1, "cam": {"t": "ball", "z": 2.5}, "cut": True, "blend": 0.5},
        OUT("panic"),
    ]),
    # frame 0: the first BLINK! through their wall; out the other side, runs on, scores at 2.3
    "phase": clip([
        {"v0": 0.0, "v1": 1.1, "take": "phase", "c0": 1.0, "r": 1, "cam": {"t": "pl", "i": 1, "dy": -10, "z": 3.0}, "cut": True, "blend": 0.3},
        {"v0": 1.1, "v1": 2.0, "take": "phase", "c0": 2.1, "r": 1, "cam": {"t": "pl", "i": 1, "dy": -10, "z": 2.8}, "blend": 0.4},
        {"v0": 2.0, "v1": 3.2, "take": "phase", "c0": 3.0, "r": 1, "cam": {"t": "ball", "z": 2.6}, "blend": 0.4},
        CUT("clones"),
        {"v0": 3.8, "v1": 6.4, "take": "clones", "c0": 1.0, "r": 1, "cam": {"t": "mix", "a": {"pl": 1}, "b": {"pl": 4}, "k": 0.5, "dy": -8, "z": 3.2}, "cut": True, "blend": 0.4},
        OUT("clones", 0.35),
    ]),
}
for k, v in E.items():
    json.dump(v, open(f'edl_{k}.json', 'w'), indent=1)
print('ok', list(E))
