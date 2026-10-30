# Batch 3 clips (2026-10-30): distribution test, publish time

**Owner instruction (chat, 2026-10-30 ~15:20 GMT+7):** "bypass the 24 hour rule … upload 5 new video, 2 instantly and 3 schedule, target is collect view outside of vietnam". This overrides, for this batch: the 2-batches-per-24h limit, the 2-clip cap (usage still unreadable), and the open STOP in ALERT.md.

**Variable: publish time.** The owner's split (2 now, 3 scheduled) makes publish time the one variable. Everything else is the same in all 5 clips:
- **Build:** the batch-2 format, ~10.4 s.
  - Opens on an Ultimate's first hit, with no setup.
  - The caster's team usually scores.
  - Then a second Ultimate with its cut-in.
  - End card.
- **Text:** the same 3 captions and end card as batch 2.
- **Metadata:** indie-gamedev framing (the batch-2 D1 style). English devlog-style title "Making a football game where …", the same description template with "Coming soon to Steam", hashtags #indiegame #gamedev #indiedev #pixelart, and the same 8 tags.

| Arm | Publish | UTC | What's awake |
|---|---|---|---|
| **T1 now** (2 clips) | Public on upload, 2026-10-30 ~16:30–17:30 GMT+7 | ~09:30–10:30 | Vietnam afternoon, Europe morning, US night |
| **T2 EU evening** (3 clips) | Scheduled 2026-10-31 02:00 / 02:40 / 03:20 GMT+7 | Oct 30 19:00 / 19:40 / 20:20 | Europe evening, US East afternoon, Vietnam asleep |

**Hypothesis:** If a Short goes public in the EU-evening slot instead of the Vietnam afternoon, then its non-Vietnam share of views is higher. The reason: YouTube first shows a new Short to people active at that moment, and at 19:00 UTC Vietnam is asleep.
- Primary metric: non-Vietnam share of views.
- Secondary: stayed-to-watch, % viewed.
- Judge after 72h.
- With 2 vs 3 clips this is one batch, not a conclusion. Repeat before trusting it.

## Clips (all footage new in this run, `work/b3/b3_scenes.js`; no Ultimate, opener or arena-opening used in any earlier clip)

| Clip | Arm | Opening (frame 0) → then | Second Ultimate | Away team |
|---|---|---|---|---|
| `b3-rage.mp4` | T1 now | RAGE: the ape's first STOMP! ring launches all three (plaza) | MOON STOMP: they float, VOLLEY! HOME RUN!, goal (cyber) | Crane Crushers / Glitch Squad |
| `b3-titan.mp4` | T1 now | TITAN: the GIANT's first BONK!, bowls through three, scores (stadium) | CHICKEN RAY: beam turns three into chickens (harbor) | Iron Knuckles / Chain Gang |
| `b3-fists.mp4` | T2 02:00 | HUNDRED FISTS: punch barrage to 20 HIT!, blast, goal (market) | THUNDERSTORM: bolts on all three, ZZT! (village) | Noodle Kickers / Paddy Kickers |
| `b3-hurricane.mp4` | T2 02:40 | HURRICANE KICK: the tornado swallows three in a row (rooftop) | GHOST HANDS: hands grab all three, GRAB! (school) | Sky Hoppers / Detention Club |
| `b3-magnet.mp4` | T2 03:20 | MEGA MAGNET: CLANG!, three dragged into a heap, goal (pirate cove) | METEOR SHOT: leap, BOOM!, fireball goal (alley) | Trash Pandas / Lantern Crew |

**Video-only tweaks (nothing written to the repo):**
- Every player is a puppet of the director.
- Ultimates are granted at runtime.
- Celebration zoom and vignette are off.
- Meteor Shot is taken from just past halfway, because from closer the fireball is still above the bar at the goal.

**Encode:** 1080×1920, 30 fps, H.264 two-pass ~2.5 Mbps + AAC 160k.
