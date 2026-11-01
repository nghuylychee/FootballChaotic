# Batch 4 clips (2026-11-01): first-2s hook, impact-first vs setup-first

**Why this variable.** The geography gate is formally off (2 of the latest 3 batches are above 30% non-Vietnam), so a hook test speaks for a mixed audience again. Open hypothesis 1 has six impact-first Shorts on the channel and **no setup-first Short at all**. Usage limits are still unreadable → 2-clip cap → one clip per variant.

**Hypothesis.** If the first 2 seconds show the hit itself instead of the build-up to it, then stayed-to-watch is higher, because Shorts viewers decide in about a second and a hit reads without language.
- Primary metric: stayed-to-watch (swipe-away). Secondary: % viewed, non-Vietnam share.
- One clip per variant can't conclude anything. Later batches add more B (setup-first) clips, alternating which variant takes the first slot.

**Kept the same in both:** the batch-3 build (first Ultimate → goal → second Ultimate with its cast → end card), 10.4 s, the same 3 captions and timings (`NO REFEREE.` · `3V3 STREET FOOTBALL` · `STACK CORES. UNLOCK ULTIMATES.`), the same end card and "Coming soon to Steam" CTA, the same 150 BPM music bed starting at 0 s, the indie-gamedev metadata template (batch-2 D1 / batch 3), and the same publish window (EU evening, 40 min apart).
**Differs:** where the first hit lands, plus the content (each clip shows different Ultimates).

| Clip | Variant | 0–2 s | Then | Away team / arenas | Slot (GMT+7) |
|---|---|---|---|---|---|
| `b4-sling.mp4` | **B setup-first** | Ours walks the ball up to their wall of three, his mate jogging beside him; SLINGSHOT! pops over him at 1.4 s; BOING! at **1.6 s**, the mate flies through two of them (BONK! BONK! 1.77 / 1.87 s) | the mate lands and scores (2.5 s) → LIGHT CYCLE: a neon wall across their path, they walk into it, ZZT! ×3 → end card | Block Wardens (street) / Night Owls (cyber) | 2026-11-02 02:00 |
| `b4-cannon.mp4` | **A impact-first** | Frame 0 is the KABOOM impact frame: the CANNONBALL bomb explodes in their box, all three launched | the ball rolls into the net (1.8 s) → MEGA BOOMERANG laps the roof, WHACK! ×3 → end card | Moped Boys (harbor) / Pigeon Gang (rooftop) | 2026-11-02 02:40 |

The soundtrack's opening boom + crash lands on each clip's first hit (0 s in A, 1.6 s in B).

**Footage:** all 4 scenes captured in this run (`work/b4/b4_scenes.js`, the real game, every player scripted). Cannonball, Mega Boomerang, Slingshot and Light Cycle appear in no earlier clip, and neither do the four away teams. All 13 arenas have appeared before; arenas repeat, openings don't.
**Video-only tweaks (nothing written to the repo):** players are puppets of the director; Ultimates granted at runtime, with energy given only on the scripted cast frame (in the first sling take the AI fired the Ultimate on its own); celebration zoom and vignette off. Cannon take = seed 11 (seed 7 bounced the bomb off a defender).
**Game change since batch 3:** the Ultimate cut-in no longer freezes the match and is now a small card at the top left. The second-Ultimate cut opens on the caster as the card slides in; the move name then pops over him.
**Encode:** 1080×1920, 30 fps, H.264 two-pass 2.5 Mbps + AAC 160k (cannon 3.4 MB, sling 3.5 MB). Pipeline = the batch-3 brag pipeline (cap.py → comp.html → audio.py → render.py).
