# PvP batch: 50 hooks (P1–P50) + 20 bodies (B12–B31) (plan and build, 2026-10-11)

## Built
- **50 finished clips `out/P1.mp4 … P50.mp4`** (11.4 s each): PvP hook + PvP body `B<12 + (n-1) % 20>`. All captured on the current 3v3 build; every in-game player wears his cam's look and handle; the online screens (party, matchmaking, ranked intro with ultimates, results with stars, friends panel, room code, "LEFT · AI takes over") are the game's own UI driven from scenes. Watch them in the **P** section of `review.html`; titles in `share-copy.txt`.
- Rules applied everywhere: one fixed signature ultimate per cast member, no friendly fire, no scripted physics in the hooks.
- **Your call:** P28 (the Bomb Ball blast also launches your own teammate: that's the Core's real rule, but it can read like friendly fire); ranked screens show Street Kings vs Neon Strikers instead of the captains' club kits; P12 / B28 use the "LEFT · AI takes over" banner, which only exists in non-ranked rooms, so don't caption those as ranked.
- **Weakest:** P1 (the second half is mostly walking), P17 (stunned players stand dizzy instead of lying down), P19, P32 (only one of three boots can land), P44 / P48 (the save is small at phone size), B18 (slow wide ending), B24 (the stunned Titan is drawn at normal size), B31 (two quick goals reuse old 2-a-side takes), B27's six-cam row is small.

# Plan

**Angle:** playing *against your friends* (and strangers online). Every clip makes "real people are playing this together" obvious at a glance by showing the players as **streamer-style webcam boxes**: each player is a pixel-avatar "cam" drawn by the game's own avatar renderer, with a gamer tag, a green ring while they talk, reaction emotes (😈 💀 😭 😡 😂), a shake when they get hit and grey when they're knocked out, plus Discord-style voice-chat lines. No real faces: the handles and avatars are made up, so nothing fakes a real person's reaction.

**Each finished clip** = a PvP hook (0–4.0 s) + one of the 20 PvP bodies (4.0–11.4 s), rotating: `P<n>` uses body `B<12 + (n-1) % 20>`, so each body appears in 2–3 clips. Any other pairing can be produced later without re-rendering.

## What the game really has (claims must stay inside this)
Current build (commit f37a64b and later): **online 3v3** (up to 6 players in a room), **party up to 3** friends, **matchmaking** by Elo (Elo shown as **stars**), **private rooms** with a 7-character code, **friends list** (add by username, invite, chat), **one signature ultimate per player** (CHARACTER › ULTIMATE; not drafted), Cores drafted during the match, street 3v3 has **no fixed keeper** (whoever stands in the box keeps), the results screen shows both teams' Core chips. Check `README.md`, `config/net.config.js`, `src/ui/online.js`, `src/ui/menu.js` before claiming anything else (e.g. a 1v1 mode). Online is still being finished: these clips are meant to be posted once it's open to players.

## The cast (portraits in `work/portraits/`, made-up handles)
| Squad (kit) | Players |
|---|---|
| **Us** · Street Kings (red) | `NGH` (spiky hair), `tuanbeo` (cap, mustache), `kaito_04` (headphones, shades) |
| **Rivals** · Neon Strikers (pink) | `zzz_mi` (bun, hearts), `bigboss99` (crown, gold tooth), `xX_vex_Xx` (mohawk, war paint) |
| **Randoms 1** · Cyber United (blue) | `mochi` (beanie, glasses), `DUKE` (helmet, visor), `panda.exe` (bowl cut, cyborg eye) |
| **Randoms 2** · Underground FC (green) | `ratking` (bandana, scar, smoke), `jinx` (ponytail, eyepatch), `m0le` (afro) |
The kit on the pitch must match the cam's squad (a clip with Us vs Rivals plays `home: 'street_kings', away: 'neon_strikers'`).

**Signature ultimates (fixed across every PvP clip):** NGH Meteor Shot · tuanbeo Titan · kaito_04 Lightning Dash · zzz_mi Aura Farming · bigboss99 Hundred Fists · xX_vex_Xx Meteor Drop · mochi Clone Army · DUKE Endless Tiki-Taka · panda.exe Meteor Drop · ratking Hundred Fists · jinx Aura Farming · m0le Titan.

**Realism:** the cams make PvP clips read as real matches, so they stay inside real mechanics: no friendly fire (players can't hit their own teammates), no impossible effects. Own goals, stolen tap-ins and passes to the enemy are real and fine. Ranked screens are shown with the Street Kings vs Neon Strikers kits (a real ranked match uses each captain's club kit) so the pitch matches the cams.

## P1–P50: hook ideas (starting points; keep the PvP + cams angle, change freely if something reads better)
| # | Opening line | What happens |
|---|---|---|
| 1 | `my friend said "1v1 me"` | duo cams, VS: he gets dropkicked at kickoff |
| 2 | `he typed "ez" in chat` | chat line "ez" → instant payback, his cam 💀 |
| 3 | `POV: you queue with randoms` | random teammate passes straight to the enemy |
| 4 | `1 star from promotion` | last seconds, clutch ultimate, all three cams scream |
| 5 | `my friend's first match` | he scores in his own net, squad cams 😭 |
| 6 | `the friend who only picks Titan` | every match: giant, stomps his own teammates |
| 7 | `he said "don't dropkick me"` | … |
| 8 | `trash talk vs reality` | big talk in chat, then he flies into the wall |
| 9 | `when your duo steals your goal` | teammate taps it in on the line, "MINE" |
| 10 | `voice chat when the meteor lands` | 6 cams all react at once |
| 11 | `3 friends vs 3 strangers` | squads layout, chaos |
| 12 | `he rage quit` | "left the match" banner, his cam goes grey |
| 13 | `the friend who never passes` | the squad dropkicks him (S1's idea, PvP version) |
| 14 | `I bet my friend 10k gold` | … |
| 15 | `best friends. different teams.` | keeper vs striker between two friends |
| 16 | `he picked aura farming` | stands there, the enemy faints |
| 17 | `when the whole lobby picks dropkick` | everyone flies |
| 18 | `my friend's ping was 999` | (fictional lag joke) — only if it doesn't imply a real bug |
| 19 | `don't celebrate in front of your friend` | celebration → dropkick |
| 20 | `he said he was a pro` | … |
| 21–50 | more of the same family: revenge rematches, duo combos (pass + ultimate), friendly fire, keeper swaps in street 3v3, signature ultimate reveals, the results-screen flex, "GG" vs "GG EZ", the silent friend who carries, the friend who spams emotes, party invites, private room codes, the 3-friend tiki-taka, ranked nerves, the last-second own goal, 6-player chaos | |

Each hook: first caption on screen at frame 0, the twist inside 1.8 s, payoff by 4.0. Cams visible from frame 0 so "players" reads immediately.

## B12–B31: PvP bodies (4.0 → 10.2, then the PvP end card `tag the friend you'd dropkick 👇`)
| ID | Angle |
|---|---|
| B12 | How online works: party up → matchmaking → match intro with everyone's signature ultimate → a highlight → results with stars |
| B13 | Squad up: invite friends (friends list or room code) → 3v3 → the squad celebrates on cam |
| B14 | Signature ultimates: each player's ultimate in action, name tags |
| B15 | Ranked climb: wins, stars going up |
| B16 | Voice chat chaos: a wild 3v3 sequence with all six cams reacting |
| B17 | Trash talk → payback: "ez" in chat → revenge goal |
| B18 | Online clutch: down 1 in FINAL PUSH (goals ×2) → comeback, cams erupt |
| B19 | The carry: one friend does everything (fists + meteor), the others just watch |
| B20 | Friendly fire: teammates "help" each other (stolen goals, dropkicked mate) |
| B21 | Best plays of the night: 5 quick highlights, each with the player's cam |
| B22 | Private room with friends: code → custom match → silly chaos |
| B23 | Matched with strangers: instant chemistry → team goal |
| B24 | Ultimate clash: two signature ultimates meet |
| B25 | Comeback 0-2 → 3-2 |
| B26 | No fixed keeper in street 3v3: whoever's in the box keeps (and how badly) |
| B27 | Results screen flex: both teams' Cores, "GG" in chat |
| B28 | Rage quit: the opponent leaves mid-match |
| B29 | 3-friend passing chain → goal, cams cheer |
| B30 | 6 players, everything at once (bombs, clones, giants) → `6 players. 0 brain cells.` |
| B31 | The rematch loop: lose → "rematch?" → win → "one more" |

## For the builders
Follow `work/DIRECTOR_GUIDE.md` (files, Chrome limits, lessons). PvP specifics:
- **Hooks:** `EDL['P<n>h'] = phook(segs, texts, music, boom, ...)` (0–4.0 only). Render the hook frames with `python build.py P<n>h` (frames only). The coordinator assembles `P<n>` = hook + rotating body at the end.
- **Bodies:** `EDL['B<n>'] = body(segs, texts, music, boom, end=END_CARD_PVP)`, render with `python build.py B<n>`; test it behind any finished hook, e.g. add a temporary pairing to check (or look at stills: `python render.py B<n> --stills 4.2,5.5,7,8.5,9.8,10.8`).
- **Cams** (`comp.html`): `{'k': 'cams', 't0', 't1', 'layout': 'duo' | 'squads' | 'row' | 'corner', 'vs': True, 'y': top, 'y2': bottom row top (squads), 'players': [{'h': 'NGH', 'side': 0|1, 'talk': [[t0, t1]], 'react': [[t, '💀']], 'hit': [t], 'dead': t, 'live': True, 'label': 'YOU', 'zoom': 2.0, 'x','y','w','h2'}]}`. **Chat:** `{'k': 'chat', 'h': 'zzz_mi', 's': 'BRO WHAT 😭', 't0', 't1', 'y'}`. A good stack for 1080×1920: cams at the top (or top + bottom for squads), the game in a window between them (`layout='fit', h=1000–1100, cam={'z': 0.95–1.3, ...}`), memes over the game window, chat lines in the empty band under it. Time `talk`/`react`/`hit` to the game's events (`marks` / `sfx` in the take's meta.json).
- **Matches:** the current build plays **3v3** by default (third players are fine here: PvP is 3v3). For 2-a-side moments pass `teamSize: [2, 2]` to `match({...})` (see `scenes_bb.js`). Name the in-game players after the handles if the game draws names (check `src/render/renderer.js` / `src/ui/online.js`). The online screens (party, matchmaking, intro, results, friends, room code) must be the game's own UI, driven from a scene (`SFC.Menu.go(...)`, `SFC.UI...`) and filled with the cast's handles; never draw a fake UI.
- IDs: hooks `P1h`–`P50h`, bodies `B12`–`B31`. Batch files: `scenes_<batch>.js` (prefix scene names with the batch), `edl_<batch>.py`.
