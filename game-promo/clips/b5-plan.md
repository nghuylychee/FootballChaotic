# Batch 5 clips (2026-11-01): the Titan recipe, three nearby options

**Owner instruction (chat, 2026-11-01 ~12:00 GMT+7):** "lên thêm cho t 3 content mới liền (không lên lịch) dựa vào mấy cái clip view ngoại đi, suy đoán coi cái gì làm nó tốt rồi thử các option gần đó": upload 3 more new Shorts right now, Public, not scheduled. Base them on the Shorts that reached foreign viewers, guess what made them work, and try nearby options. This overrides the 2-clip cap for this batch (usage still unreadable) and the publish-slot rule. It's the 2nd batch in 24h, within the batch limit.

## What the two foreign-reaching Shorts share (the guess)
| | A#1 "No referee…" (14% Vietnam) | b3-titan "…grow giant" (28% Vietnam) |
|---|---|---|
| Opener | Sprint dropkick into the fence; then Medusa turns their three to stone and she runs past and scores; Monster Truck runs over all three | TITAN: ours grows giant with the ball, bowls through all three in a row, scores |
| Stayed to watch | 20.3% | 19.8% |
| First minutes | Slow (39 views in 2h) | Slow (0 views in 13 min) |
| Published | Directly Public, 16:48 GMT+7 | Directly Public, 16:04 GMT+7 |

The 4 Vietnam-heavy Shorts (D1, D2, rage, fists) also open on a hit, but their openers are a fight beat (uppercut, pinball, stomp rings, punch barrage), not one player going through the whole team to score.

**Guess:** a "1 vs 3" opener, one of ours going straight through all three defenders and scoring, reads instantly with no language, holds viewers (~20% stayed), and so gets pushed beyond the first test audience. Low confidence: n=2, and the slow start (no early Vietnamese burst) may matter as much as the content.

## The 3 clips: Titan recipe, only the steamroll changes
Kept from b3-titan: the build (opener → goal → second Ultimate with its cast → end card), 10.4 s, impact-first (frame 0 = the first hit), the same 3 captions, end card and "Coming soon to Steam" CTA, the 150 BPM bed, the "Making a football game where you can …" title and the indie-gamedev description/hashtags/tags, published directly Public. Publish time differs: Sunday ~12:40 GMT+7 now, Titan went out Friday 16:04.

| Clip | Nearby option | Opener (0–3.2 s) | Second Ultimate | Away teams / arenas |
|---|---|---|---|---|
| `b5-boulder.mp4` | **Grow + bowl over** (closest to Titan) | BOULDER RIDER at MAX: ROLL OUT!, SQUASH! ×3 in 0.7 s; it crumbles, ours runs onto the ball and scores | COMET ONE-TWO: one-two, BOING!, BICYCLE KICK! into the net | Rust Buckets (stadium) / Market Mamas (harbor) |
| `b5-bullet.mp4` | **Run past all three** | BULLET TIME: blue slow motion, ours zips between their three; time snaps back, SLIP! ×3, spiral shot, goal at 1.35 s | PANIC BALL: the ball turns into a ghost, EEK! BOO! ×2, back to his feet | Retired Refs (pirate cove) / School Ghosts (cage) |
| `b5-phase.mp4` | **Get through by trickery** | PHASE STEP: BLINK! ×4 through portals, decoys left behind, out the other side, scores at 2.3 s | CLONE ARMY: four clones rush their carrier, impact frame, 4 HIT! | Fortune Tellers (cyber) / Grandpa Squad (school) |

**Read-out (judge after 72h, ~2026-11-04 12:30; or ~1,000 views):** for each, non-Vietnam share, stayed-to-watch, and whether it gets past the ~170–270 view band. If all three behave like Titan, the 1-vs-3 opener is a lead worth a proper A/B. If none do, Titan's reach was likely the slow start / luck, not the content.

**Footage:** all 6 scenes captured in this run (`work/b5/b5_scenes.js`), none used in any earlier clip (Ultimates or away teams).
**Video-only tweaks (nothing written to the repo):** players are puppets of the director; Ultimates granted at runtime with energy only on the scripted cast frame; Boulder Rider `aiHit = 1` (every rhythm press lands, as for a player who hits the timing); celebration zoom and vignette off. Pitch Tilt was captured and dropped (it reads as everyone drifting sideways); Comet One-Two replaced it. Boulder clip has one jump cut (from the third SQUASH to the boulder crumbling).
**Encode:** 1080×1920, 30 fps, H.264 two-pass 2.5 Mbps + AAC 160k (3.3–3.4 MB each).
