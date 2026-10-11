# Hook test: 30 Shorts (built 2026-10-10)

**Goal:** find out which kind of first 2 seconds stops people scrolling. Old clips sat at ~100 views; the Ronaldo clip got ~500. Hypothesis: a hook that borrows football culture people already know (real players, real moments) beats a hook built on game features nobody has seen yet.

**Format:** vertical 1080×1920 @30fps, YouTube Shorts / TikTok. English captions in meme style (white, black outline, top third), already on screen at frame 0, so frame 0 doubles as the thumbnail (`out/<ID>.jpg`). Real footage is always **muted**; the sound is the game's own SFX plus a chiptune bed.

## The three groups

| Group | What the first 2 s show | After that | Length |
|---|---|---|---|
| **R** · real hook (10) | 1.3–1.9 s of a real football moment, muted, with a crowd bed | Match-cut on the impact to **the same move in the game** (until 4.0 s), then the shared body | 11.4 s |
| **G** · gameplay hook (10) | The game's most readable moment | Its payoff (until 4.0 s), then the **same** shared body | 11.4 s |
| **S** · staged skit (10) | A funny or impossible situation built in the engine, presented as real | Its own punchline; no shared body; small corner watermark | 4.2–6.6 s (short loops) |

R and G differ **only in the first 4 seconds**. The body starts at 4.0 s in every R and G clip and is frame-identical, so any gap between R and G comes from the hook.

### Shared body (4.0 → 11.4 s), used by all 20 R and G clips
| Time | Footage | Caption |
|---|---|---|
| 4.0–5.6 | A punch steals the ball, then a dropkick sends the second defender into the wall | `no fouls. no refs.` |
| 5.6–7.2 | Hundred Fists: the 20-punch barrage | `just punches.` |
| 7.2–8.8 | Meteor Shot → GOAL | `and anime ultimates` |
| 8.8–10.2 | Titan bowls everyone over | `53 superpowers` |
| 10.2–11.4 | Logo + `PLAYTEST SOON · FOLLOW` + `would you play this? 👇` | loops back to frame 0 |

### R: real hooks (cut from `source/`, picks in `work/hooks.json`, cuts in `work/echo.json`)
| # | Real moment (source) | Game echo | Captions |
|---|---|---|---|
| R1 | Ronaldo raises his fist, Al-Bulayhi flips (Ronaldo compilation) | a giant punch sends him flying | `ronaldo irl:` → `ronaldo in my game:` |
| R2 | Stephen Chow's fireball kick (Shaolin Soccer, **film footage: high Content ID risk**) | Fireball shot → GOAL | `shaolin soccer:` → `my game:` |
| R3 | Zlatan's leaping elbow on Mings (0.75× slow-mo) | Meteor Drop, KRAKOOM | `zlatan irl:` → `zlatan in my game:` |
| R4 | Ronaldo boots the ball at a downed Curtis Jones (uploader's emoji cropped out) | dropkick into the wall, CRACK | `angry ronaldo irl:` → `angry ronaldo in my game:` |
| R5 | Zlatan's shoulder barge, Otamendi flies (0.65×) | one tiny BUMP, he flies across the pitch | `a shoulder barge irl:` → `…in my game:` |
| R6 | Zlatan slaps Petrasso (0.75×) | Hundred Fists into the wall | `a slap irl:` → `a slap in my game:` |
| R7 | Zlatan and Lukaku head to head (0.75×) | a 3× giant gets dropkicked across the pitch | `zlatan vs lukaku irl:` → `…in my game:` |
| R8 | Ronaldo's angry volley at the camera | Meteor Shot → GOAL | `ronaldo's volley irl:` → `…in my game:` |
| R9 | A defender collapses in front of a motionless Mbappé (low-res source) | Aura Farming: the defender charges and `*faints*` | `mbappe's aura irl:` → `aura in my game:` |
| R10 | Buffon saves Zidane's header (2006 final) | the keeper tries to stop a Meteor Shot and gets blasted | `buffon irl:` → `keepers in my game:` |

Uploader watermarks (@LFEV, ISH FUTBALL, ILINHO.FC) and the floating emoji on R4 are cropped out of frame.

### G: gameplay hooks
| # | Hook → payoff | Captions |
|---|---|---|
| G1 | Calm passing → dropkick into the wall at 1.45 s, the music stops dead | `just a normal football game` → `that was a legal tackle btw` |
| G2 | Stand-off by the wall → Hundred Fists, 20 HIT, slammed into the wall | `he said it's a contact sport` → `so he got contact` |
| G3 | Meteor Shot from the halfway line → the keeper gets blasted | `the keeper tried to save it` → `he did not save it` |
| G4 | Aura Farming, the defender freezes → he cooks him and scores | `+1000 aura` → `then he cooked him` |
| G5 | Black Hole Shot crawls toward goal, dragging both defenders into the net | `physics left the chat` → `defenders included` |
| G6 | Bomb Ball fuse on the carrier → KABOOM, all 4 launched | `hot potato but it's football` → `BOOM.` → `everyone lost` |
| G7 | Lightning Dash through two defenders | `POV: you blinked` → `2 defenders. gone.` |
| G8 | 5 s left, down by 1 → punch steal → Clone Army → goal | `5 seconds left. down by 1.` → `5v2 is fair right?` |
| G9 | Meteor Drop: leaps off screen → crashes down, KRAKOOM | `he jumped off the map` → `...and came back` |
| G10 | Juggle: punch him up and keep him there, 2 HIT → 7 HIT (1.45× speed) | `how long can he stay up?` → `he never came down` |

### S: staged skits (things the game can't actually do, presented as real)
| # | Skit | Captions |
|---|---|---|
| S1 | Your own teammate yells PASS!!! three times, then dropkicks you, takes the ball and scores | `POV: you didn't pass` → `he'll pass it himself then` → `lesson learned 💀` |
| S2 | Penalty: walk past the ball, dropkick the keeper, tap it into the empty net | `penalty technique they don't teach you` → `step 1: remove the keeper` → `step 2: walk it in` |
| S3 | The shot turns into a chicken mid-air (slow-mo), the keeper says NOPE and steps aside | `watch the ball` → `WHY IS IT A CHICKEN` → `the keeper said nope` |
| S4 | 6 defenders lined up like pins, a bowling ball, STRIKE, all of them fly, GOAL | `they parked the bus` → `so I went bowling 🎳` |
| S5 | Their keeper is 4× bigger and fills the goal → Meteor Shot, KRAKOOM, he flies | `their keeper is 4 meters tall` → `so I brought a meteor` → `KRAKOOM.` |
| S6 | Kickoff whistle → all 4 dropkick each other at once, all KO'd, the ball rolls in by itself | `kickoff in my league` → `meanwhile the ball:` → `1-0 😐` |
| S7 | A 3× giant stomps in (the screen shakes on every step) → one dropkick and he flies, CRACK | `david vs goliath` → `goliath has left the chat` |
| S8 | He summons 8 clones that all chase one player → Lightning Dash zaps through every one | `bro summoned his whole family` → `family reunion cancelled ⚡` |
| S9 | Hundred Fists on the ball: 20 HIT, ORAAA, it rockets into the goal | `hundred fists but it's the ball` → `the ball did nothing wrong` |
| S10 | A dropkick so hard he leaves the screen (BYE!)… 3 s later he lands on their keeper | `sent him to orbit` → `meanwhile, their keeper:` → `he's back 💀` |

## Posting (for the test to mean anything)
- **Interleave** R, G, S: R1, G1, S1, R2, G2, S2… One a day, the same time slot.
- Use `share-copy.txt`: the same description and pinned comment on all 30, title = the clip's first caption.
- Compare **group medians**, not single clips, on: *viewed vs swiped away* (the hook metric), average % viewed, comments asking for the game's name, subscribers.
- Any clip that hits ≥ 3× its group's median gets 3 new variants.
- Check the **Copyright** tab after posting R clips. Drop any claimed or blocked clip from the comparison.

## Output
`out/R1.mp4 … out/S10.mp4` (+ `.jpg` thumbnail = frame 0). Pipeline in `work/`: `scenes.js` (staged scenes), `caps.py` (capture), `edl.py` (every cut and caption), `real.py` (real hooks), `build.py` (render + mix + encode).
To change a caption or a cut: edit `work/edl.py`, then `python edl.py && python build.py <ID>` (the game must be served: `python serve.py`).
