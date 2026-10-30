# Cycle 1 clip: "NO REFEREE." (variant A, impact hook)

**Test:** first-2s hook. Variant A = the very first frame is an in-game hit (sprint dropkick, SMASH!), no title card or setup text before it. See `game-promo/experiment_log.md`, cycle 1.
**What it is:** Street Football Chaos, 3v3 pixel street football with no referee: your tackle is a dropkick, and goals let you stack Cores into anime Ultimates.
**Who for:** non-Vietnamese Shorts viewers who like arcade / indie / pixel games and football (Phase 0: learn which hooks hold them).
**Format:** vertical 1080×1920, 30 fps, 15.6 s, H.264 + AAC. English on-screen text only.
**Footage:** real game, headless capture (`work/c1/c1_scenes.js`, every player scripted). New arenas and Ultimates no earlier clip used: cage, pirate cove, cyber, harbor; Medusa Gaze, Rocket Punch, Monster Truck.
**Video-only tweaks (nothing written to the repo):** players are puppets of the director; Flying Kick + Wall Slam Cores and the three Ultimates are granted at runtime; celebration zoom and vignette off; Monster Truck's screen-space "MONSTER TRUCK!" callout off (the vertical crop would slice it; the cut-in already names it).

## Storyboard (built)

| Time | Beat | Footage | Text |
|---|---|---|---|
| 0.00–0.90 | HOOK | Cage: frame 0 = sprint dropkick contact (FLYING KICK! SMASH!), victim slams into the fence under the "NO REFS" banner (BONK! CRACK!) | `NO REFEREE.` from 0.30 |
| 0.90–3.20 | Football | Loose ball, pass, one-touch finish, GOAL, scorer | `3V3 STREET FOOTBALL` |
| 3.20–6.40 | Ultimate 1 | Pirate cove: MEDUSA GAZE cut-in, three opponents turn to stone, she runs past the statues and scores | `STACK CORES. UNLOCK ULTIMATES.` (to 5.00) |
| 6.40–8.80 | Ultimate 2 | Cyber: ROCKET PUNCH cut-in, fist crosses the whole pitch, KAPOW! into the wall | |
| 8.80–11.60 | Ultimate 3 | Harbor: MONSTER TRUCK cut-in, three SQUASH! | |
| 11.60–15.60 | End card | Flash, logo over the dimmed harbor | `STREET FOOTBALL CHAOS` · `3v3 · 50 Cores · 36 Ultimates` · `COMING SOON TO STEAM` |

Cuts sit on a 150 BPM grid (0.4 s beats). Text stays inside y 250–1300 (clear of the Shorts title / button overlay).

## Sound
150 BPM A-minor chiptune-punk bed that starts on the first hit (no intro), with a low boom + crash on frame 0. Drums drop out under each cut-in so the game's own cut-in stinger carries it, with a brass stab and a short riser. All game SFX are the game's own WebAudio recipes, rendered offline from the logged events. Big hit + held chord into the end card.
