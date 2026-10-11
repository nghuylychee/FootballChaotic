import re
src = open('scenes_pa.js', encoding='utf-8').read()
new = open('scratchpad/pa/rework.js', encoding='utf-8').read()
END = "  });\n})();\n"

# new blocks by name
blocks = {}
for m in re.finditer(r"    /\* .*?\n    (pa_\w+)\(\) \{", new):
    blocks[m.group(1)] = m.start()
names = sorted(blocks, key=blocks.get)
starts = [blocks[n] for n in names] + [len(new)]
newb = {n: new[starts[i]:starts[i + 1]] for i, n in enumerate(names)}

for n, body in newb.items():
    fi = src.index(f"    {n}() {{")
    cs = src.rindex("    /* ", 0, fi)
    nxt = src.find("\n    /* ", fi)
    end = src.index(END)
    ce = nxt + 1 if 0 <= nxt < end else end
    src = src[:cs] + body + src[ce:]
    print('replaced', n)


def rep(old, new_, cnt=1):
    global src
    assert src.count(old) == cnt, (src.count(old), old[:100])
    src = src.replace(old, new_)


# one fixed signature ultimate per cast member (coordinator's table)
rep("""  const ULT = {
    NGH: 'meteor_strike', tuanbeo: 'titan', kaito_04: 'lightning_dash',
    zzz_mi: 'clone_army', bigboss99: 'aura_farming', xX_vex_Xx: 'hundred_fists',
    mochi: 'endless_tiki', DUKE: 'meteor_drop', 'panda.exe': 'lightning_dash',
    ratking: 'hundred_fists', jinx: 'clone_army', m0le: 'titan',
  };""", """  const ULT = {
    NGH: 'meteor_strike', tuanbeo: 'titan', kaito_04: 'lightning_dash',
    zzz_mi: 'aura_farming', bigboss99: 'hundred_fists', xX_vex_Xx: 'meteor_drop',
    mochi: 'clone_army', DUKE: 'endless_tiki', 'panda.exe': 'meteor_drop',
    ratking: 'hundred_fists', jinx: 'aura_farming', m0le: 'titan',
  };""")
# real knockback only (no extra launch)
rep("if (vx.state === 'stun' && B.marks.fly == null) { mark('fly'); vx.kbx = 300; vx.kby = -40; vx.airVz = Math.max(vx.airVz, 210); E.comic(vx.x, vx.y - 34, 'BYE!', '#ffe14f', 1.3, 0.8); }",
    "if (vx.state === 'stun' && B.marks.fly == null) { mark('fly'); E.comic(vx.x, vx.y - 34, 'BYE!', '#ffe14f', 1.3, 0.8); }")
rep("if (bb.state === 'stun' && B.marks.fly == null) { mark('fly'); bb.kbx = 330; bb.kby = -330; bb.airVz = Math.max(bb.airVz, 240); }",
    "if (bb.state === 'stun' && B.marks.fly == null) { mark('fly'); }")
rep("if (B.marks.fly != null && B.marks.bonk == null && bb.y <= F.y + bb.radius + 1) { mark('bonk'); bb.kbx *= 0.15; }",
    "if (B.marks.fly != null && B.marks.bonk == null && bb.y <= F.y + bb.radius + 1) mark('bonk');")
# P11: no forced multi-hit, no extra launch
rep("""      // all three kicks must land: every hit on him goes through while the three of them are mid-kick
      const hit0 = rk.hit.bind(rk);
      let nHits = 0;
      rk.hit = (o) => { if (B.marks.kick != null && nHits < 3) { rk.state = 'normal'; rk.hitImmune = 0; } const r = hit0(o); if (r) { nHits++; if (nHits === 3) mark('third'); } return r; };
""", "")
rep("if (rk.state === 'stun' && B.marks.fly == null && (nHits >= 3 || B.t - B.marks.kick > 0.3)) { mark('fly'); rk.kbx = 340; rk.kby = 0; rk.airVz = Math.min(Math.max(rk.airVz, 150), 200); E.comic(me.x + 30, 172, 'TRIPLE!', '#ffe14f', 1.5, 0.9); }",
    "if (rk.state === 'stun' && B.marks.fly == null) { mark('fly'); E.comic(me.x + 30, 172, 'TRIPLE!', '#ffe14f', 1.5, 0.9); }")
# P5: no celebration jump (players can't jump), the comic stays
rep("g.later(0.35, () => { nb.state = 'normal'; nb.airVz = 230; nb.airZ = 0.5; nb.facing = PI / 2; E.comic(nb.x, nb.y - 40, 'GOLAZO!', '#ffe14f', 1.2, 1.2); });",
    "g.later(0.35, () => E.comic(nb.x, nb.y - 40, 'GOLAZO!', '#ffe14f', 1.2, 1.2));")
# P25: the director is paused during the goal celebration -> schedule the comic
rep("if (!booted && b.owner == null && b.lastTouch === bb && Math.hypot(b.vx, b.vy) > 150) { booted = true; mark('boot'); }",
    "if (!booted && b.owner == null && b.lastTouch === bb && Math.hypot(b.vx, b.vy) > 150) { booted = true; mark('boot'); g.later(0.55, () => E.comic(bb.x, bb.y - 26, 'oops', '#ffffff', 1.1, 1.0)); }")
rep("        if (B.marks.goal != null && B.marks.oops == null) { mark('oops'); E.comic(bb.x, bb.y - 26, 'oops', '#ffffff', 1.1, 1.0); }\n", "")
open('scenes_pa.js', 'w', encoding='utf-8').write(src)
print('ok')
