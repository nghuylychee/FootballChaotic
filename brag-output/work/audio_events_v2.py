groove(DROP, 7.00, 1.0, arp=True)
# 7.00 card: drums drop out, 16th snare fill into the ults
for k in range(8): add(music, 7.35 + k * S16, snare(0.1), 0.25 + k * 0.04)
groove(8.10, 15.05, 1.1, arp=True, melody=True)
groove(15.05, 18.85, 0.8, arp=True, sparkle=True)
# outro: final A minor chord ringing out
for m, g in [(45, 0.4), (57, 0.25)]:
    add(music, 18.85, bassnote(m, 3.0) * np.linspace(1, 0.3, int(3.0 * SR)), g)
for j, m in enumerate([69, 72, 76, 81]):
    k = int(3.0 * SR)
    add(music, 18.85, lp(square(midi(m), k, 0.5), 3000) * env(k, 0.005, 1.2, 0.25, 0.8), 0.07, pan=-0.4 + 0.25 * j)
groove(18.85, 20.35, 0.7, arp=True, sparkle=True)   # one bar more, then ring out
for k in range(10):
    add(music, 20.35 + k * S16 * 2, lead([81, 76, 72, 69][k % 4], S16 * 1.5, 0.25), 0.09 * (1 - k / 10), pan=0.3 - 0.05 * k)

# ---------------- sfx on the picture ----------------
add(fx, 0.72, whoosh(0.2), 0.35)
add(fx, 0.90, impact(1.3), 0.75)
add(fx, 0.90, crash(1.2), 0.18)
add(fx, 1.33, impact(0.6), 0.45)   # wall CRACK
add(fx, 1.87, thump(), 0.3)
add(fx, DROP, impact(1.2), 0.6); add(fx, DROP, crash(), 0.28)
add(fx, 2.66, thump(), 0.45); add(fx, 2.83, impact(0.8), 0.5)
add(fx, 4.90, crash(1.0), 0.16)
add(fx, 4.96, thump(), 0.3)
add(fx, 5.45, blip(81), 0.2); add(fx, 6.05, blip(81), 0.2)
for m in (69, 76, 81): add(fx, 6.85, blip(m, 0.2), 0.14)
add(fx, 7.00, impact(1.2), 0.65); add(fx, 7.00, crash(), 0.25)
for t0 in (8.10, 10.25, 11.95, 13.35): stinger(t0, 0.28)
add(fx, 8.75, impact(0.8), 0.5)                     # BOOM
add(fx, 9.52, impact(1.4), 0.7); add(fx, 9.52, crash(), 0.3)   # GOAL
t = 10.55
while t < 11.72: add(fx, t, punch(), 0.28, pan=rng.uniform(-0.3, 0.3)); t += 0.1333
add(fx, 11.83, impact(1.0), 0.6)
add(fx, 12.25, whoosh(0.4, up=False), 0.4)
add(fx, 12.65, impact(1.4), 0.7); add(fx, 12.65, crash(), 0.22)
for c in (1.27, 1.8, 1.97, 2.5): add(fx, 13.65 + c - 1.05, impact(0.55), 0.42)
add(fx, 15.05, crash(1.0), 0.14)
g = json.load(open('frames/gacha/meta.json'))
for s in g['sfx']:
    if s['name'] == 'ui:tick' and 0.45 <= s['t'] < 2.25: add(fx, 15.05 + s['t'] - 0.45, tick(), 0.12, pan=0.2)
add(fx, 15.12, thump(), 0.3)
add(fx, 16.85, thump(), 0.4)                          # reveal
for i, m in enumerate((69, 72, 76, 81)): add(fx, 16.85 + i * 0.05, blip(m, 0.25), 0.13)
for k in range(1, 5): add(fx, 17.45 + 0.3 * k - 0.1, blip(88 if k % 2 else 84, 0.05), 0.1, pan=0.25)   # costume swaps
add(fx, 18.85, impact(1.5), 0.7); add(fx, 18.85, crash(2.5), 0.3)
add(fx, 18.90, thump(), 0.35); add(fx, 19.07, impact(0.7), 0.45)
add(fx, 19.60, thump(), 0.4)

