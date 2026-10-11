src = open('scenes_pa.js', encoding='utf-8').read()
def rep(old, new, cnt=1):
    global src
    assert src.count(old) == cnt, (src.count(old), old[:100])
    src = src.replace(old, new)
# P6: shoot from further out
rep("if (G.x - tb.x > 100) { tb.intent.mx = 1; tb.intent.my = (G.y - tb.y) * 0.02; tb.intent.sprint = true; return; }",
    "if (G.x - tb.x > 145) { tb.intent.mx = 1; tb.intent.my = (G.y - tb.y) * 0.02; tb.intent.sprint = true; return; }")
# P14: the defenders right on the line of the shot (the real pull: 64 px)
rep("place(me, G.x - 262, G.y + 4, 0); place(d1, G.x - 170, G.y - 22, PI); place(d2, G.x - 112, G.y + 24, PI); place(kp, G.x - 18, G.y, PI);",
    "place(me, G.x - 262, G.y + 4, 0); place(d1, G.x - 176, G.y - 12, PI); place(d2, G.x - 112, G.y + 16, PI); place(kp, G.x - 18, G.y, PI);")
# P16: closer, the kick comes right after the cut-in
rep("place(me, 322, 206, 0); place(zm, 398, 202, PI);", "place(me, 350, 206, 0); place(zm, 398, 202, PI);")
rep("          if (t < 0.8) { still(me); face(me, zm); return; }\n          steer(me, zm.x - 4, zm.y, true);\n          if (U.dist(me, zm) < 40 && me.state === 'normal')",
    "          if (t < 0.75) { still(me); face(me, zm); return; }\n          steer(me, zm.x - 4, zm.y, true);\n          if (U.dist(me, zm) < 44 && me.state === 'normal')")
# P25: the pass keeps rolling to him; his dropkick meets it and sends it into his own net
rep("""          if (b.x > bb.x - 34) { bb.cd.hard = 0; bb.facing = -0.12; kicked = Act.hardAttack(g, bb); if (kicked) mark('kick'); } return; }
        if (!booted && b.owner == null && b.lastTouch === bb && Math.hypot(b.vx, b.vy) > 150) { booted = true; mark('boot'); g.later(0.55, () => E.comic(bb.x, bb.y - 26, 'oops', '#ffffff', 1.1, 1.0)); }""",
    """          if (!b.owner) { b.vx = Math.max(b.vx, 140); b.vy = (bb.y - b.y) * 1.5; }
          if (b.x > bb.x - 30) { bb.cd.hard = 0; bb.facing = 0; kicked = Act.hardAttack(g, bb); if (kicked) mark('kick'); } return; }
        if (!booted && !b.owner && B.t - B.marks.kick < 0.5) {
          b.vx = Math.max(b.vx, 90); b.vy = (bb.y - b.y) * 1.5;
          if (bb.state === 'kick' && U.dist(b, bb) < 34) {
            booted = true; mark('boot');
            const d = U.norm(G.x + 10 - b.x, G.y + 22 - b.y);
            b.kick(bb, d.x * 380, d.y * 380, 28); b.kind = 'shot'; g.sfx('kick', 1);
            g.later(0.55, () => E.comic(bb.x, bb.y - 26, 'oops', '#ffffff', 1.1, 1.0));
          }
        }""")
rep("if (booted && B.marks.goal == null) { keep(g, kp); if (kp.state === 'normal' && B.marks.dive == null) { mark('dive'); kp.cd.skill = 0; Act.dive(g, kp, 40); } }",
    "if (booted && B.marks.goal == null) { keep(g, kp); if (kp.state === 'normal' && B.marks.dive == null) { mark('dive'); kp.cd.skill = 0; Act.dive(g, kp, -40); } }")
open('scenes_pa.js', 'w', encoding='utf-8').write(src)
print('ok')
