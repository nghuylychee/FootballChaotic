# Bodies: 10 alternative middles for the hook clips (plan and build, 2026-10-11)

## Built
All 10 bodies are rendered. The 20 body-test clips (`out/G1_B2 … G1_B11`, `out/R12_B2 … R12_B11`) and the 5 skit + body clips (`out/S1_B1, S4_B1, S5_B1, S10_B1, S29_B1`) are encoded; see the "bodies" section of `review.html`.

| Body | What it shows (4.0 → 10.2) | Captions |
|---|---|---|
| B2 | 5 ultimates counted down #5 → #1 with name tags: Lightning Dash, Hundred Fists, Aura Farming, Titan, Meteor Shot | `wait till you see the ultimates` → `which one is broken? 👇` |
| B3 | PROLOGUE ("I HAVE A DREAM… TO BE THE GOAT"), grandpa's secret move (Aura Farming), the Main Path's 10 areas | `it even has a story mode` → `grandpa's secret move` → `10 areas. 10 bosses.` |
| B4 | Legend Box pull → LEGENDARY Flame Hair → an outfit swap on every beat → crown + laser eyes + gold aura | `and you can dress your player` → `W pull 🔥` → `fit check 👀` → `drip > skill` |
| B5 | Kickoff brawl, chicken ball, bowling STRIKE, dropkick into orbit, dominoes | `every match looks like this` → `no two matches are the same` |
| B6 | Keycaps D PUNCH · A DROPKICK · Z DODGE · X ULTIMATE over each action | `4 buttons to fight.` → `infinite chaos.` |
| B7 | The real draft screen: pick Black Hole Shot → it in action → stack Fireball → a burning black hole drags everyone in | `and you pick superpowers` → `then stack another` → `build your own playstyle` |
| B8 | He gets dropkicked → picks Giant Fist → REVENGE punch into the opponent's own keeper → goal | `this guy dropkicked me 😐` → `so I picked GIANT FIST` → `payback time 😈` → `revenge is best served giant` |
| B9 | Ghost Ball, Dragon Curl, the double face save, Meteor Shot on the 4-metre keeper | `keepers hate this game` → `it bent around him` → `saved it twice. still in 💀` → `0 clean sheets` |
| B10 | Golden Phantom Pass, Tiki-Taka goal, the wall assist, then the teammate who wasn't passed to dropkicks him | `and it's a team game` → `tiki-taka but anime` → `even the wall assists 🧱` → `pass it or get dropkicked` |
| B11 | 1-2, 0:05 left, FINAL PUSH ×2 → steal → Clone Army → GOAL ×2 → 3-2 at 0:02 | `down 1-2. 5 seconds left.` → `goals count double 👀` → `it's never over` |

**The game changed while this was built** (commit f37a64b: 3v3, one signature ultimate per player instead of drafted ultimates). The new body takes are staged as 2-a-side and only draft non-ultimate Cores, so they match the rest of the footage and the current rules; captions make no team-size claim. Weakest: B11's last 1.8 s is a fairly static scoreboard shot; B5's chicken is small; B3 is all menus.

# Plan

Every R and G clip is `hook (0–4.0 s)` + `body (4.0–11.4 s)`. Until now all 110 R/G clips share one body (`BODY`, now called **B1**: no fouls → punches → ultimates → 53 superpowers → end card). These 10 new bodies (**B2–B11**) are different middles for the same slot, so we can test **which body keeps people watching** with the hook held constant.

## Rules every body follows
- Exactly 4.0 → 11.4 s, so any hook plugs in front of any body.
- **4.0–10.2: the body's own story**, **10.2–11.4: the same end card** as B1 (logo, `PLAYTEST SOON · FOLLOW`, `would you play this? 👇`) over dimmed footage. The CTA stays constant; only the middle changes.
- **The first caption at 4.0 must follow any hook** (a real-football moment, a Core showing off, a skit), so it's a bridge line ("and that's not even the ultimates"), never a reference to one specific hook.
- Real game footage only (existing takes or new captures); the game's own UI, HUD and banners are welcome. Pace from cuts and motion; every caption readable (~0.3 s per word).
- No invented claims or numbers. Only say what the game has (check `config/` and `src/` when in doubt).

## The 10 bodies
| ID | Angle | Shape (4.0 → 10.2) | Closing line before the end card |
|---|---|---|---|
| B2 | Ultimates countdown | `wait till you see the ultimates` → 4–5 ultimates in fast cuts, each with an `ULTIMATE` name tag | `which one is broken? 👇` |
| B3 | Story mode | `it even has a story mode` → PROLOGUE cut scene → Main Path → locked areas | `10 areas. 10 bosses.` |
| B4 | Drip and loot | `and you can dress your player` → Legend Box pull → outfit swaps on the beat | the best fit, `drip > skill` |
| B5 | Chaos reel | `every match looks like this` → 5 of the wildest staged moments in fast cuts (bowling strike, chicken, kickoff brawl, orbit landing, dominoes…) | `no two matches are the same` |
| B6 | Controls | `4 buttons.` → keycaps D PUNCH · A DROPKICK · Z DODGE · X ULTIMATE, each over the matching footage | `infinite chaos.` |
| B7 | Build / draft | `every round you pick a superpower` → the real draft screen, a pick → that Core in action → another pick → stacked chaos | `build your own playstyle` |
| B8 | Rival story | a 3-beat mini story: he gets dropkicked → picks revenge (Titan) → payback and a goal | a payback line (no team-size claims) |
| B9 | Keepers hate this | `keepers hate this game` → 4 goals that humiliate keepers (Thunder through, Ghost Ball, Dragon Curl, Meteor blast) | `0 clean sheets` |
| B10 | Teamwork | a size-neutral team line (the game is 3v3 since commit f37a64b) → golden Phantom Pass, Tiki-Taka, the wall assist, a finish | `pass it or get dropkicked` |
| B11 | Clutch | `down 1-2. 5 seconds left.` → FINAL PUSH (goals ×2) → clutch ultimate → 3-2 | `it's never over` |

## What gets made
- Each body is rendered once (frames from 4.0 s; no mp4 on its own).
- **Body test (22 clips):** two strong hooks, **G1** (normal play → dropkick) and **R12** (Ronaldo SIUUU), each in front of B2–B11 → `out/G1_B2.mp4 … out/R12_B11.mp4`. Their B1 versions are the existing `G1.mp4` and `R12.mp4`.
- **Skit + body (5 clips):** S1, S4, S5, S10, S29 each followed by B1 → `out/S1_B1.mp4 …`, to compare with the same skits alone.
- Any other hook + body pairing can be produced in seconds later: add it to `COMBO_HOOKS` in `work/edl_zz_combo.py`, then `python edl.py && python build.py <hook>_<body>` (no rendering: it reuses the frames).
