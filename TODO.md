# TODO: UX overhaul

## 1. Tutorial
- The game doesn't teach itself; new players don't understand it.
- Needs a proper tutorial / onboarding.

## 2. Clean up the match HUD
- The match screen is too cluttered right now.
- Reference: Rocket League shows only a scoreboard and the boost meter.
- Goal: cut the in-match HUD down to the essentials.

## 3. End-of-match screen [DONE]
- Resolved: 2-beat post-match flow implemented (`src/ui/ui.js`, `css/style.css`, `src/systems/celebrate.js`, `src/render/celebrate-draw.js`):
  - Beat 1: 3s on-pitch finale (skippable) where winners celebrate in place, losers play a disappointed pose, and the camera keeps the gentle continuous final-whistle rumble (`shakeShot`).
  - Beat 2: Centered title & score header, staged progression-to-scoreboard reveal (Ranked Standing + Rewards/XP animate centered first, then slide left as the 2-team scoreboard with `GOALS`, `ASSISTS`, `SAVES`, `SHOTS`, `★ MVP` badge, portraits, and up to 5 Core/Ultimate chips reveals on the right).

## 4. Player readability [DONE]
- Resolved: unified team foot rings implemented in `src/render/renderer.js` and `config/game.config.js` (green for player, cyan for allies, red for opponents). Hair/shirt changes no longer needed.

## 5. Goal replay (idea)
- Maybe add a replay after each goal; nearly every football game has one.
- Open question: how it fits with the goal celebration / goal-cam zoom that already plays after a goal.

## 6. Controls: dash key [DONE]
- Resolved: sprint stays (the whole SPEED school is built on it: crackle `p.surge`, `onSprintStart`, Flying Kick...).
- Dash / skill move moved to Q, switch player to Z (keyboard only; controller unchanged). Menus have their own `tabPrev` / `tabNext` / `filter` / `equip` actions, so changing match keys never moves menu navigation.
- Tried double-tap E for dash: too slow for this game. The input layer still supports double-tap bindings (`Tap2.<code>`, `controls.doubleTap`).

## 8. Key remapping + controls screen overhaul
- Players can rebind in-match controls (keyboard and controller). Menu navigation stays fixed.
- Overhaul SETTINGS › CONTROLS around it.

## 7. Ranked demotion awareness [DONE]
- Resolved: bold animated `▼ DEMOTED TO {area}` shake stamp and `▲ PROMOTED TO {area}` / `▲ NEW AREA UNLOCKED: {area}` gold stamp added to the post-match Ranked Standing panel (`src/ui/ui.js`, `css/style.css`) with audio feedback on Beat 2 entry.
