# CrazyGames publishing

Status of the CrazyGames release. We are in the **Basic Launch** period: only requirements marked Basic apply. Full-launch items are listed at the end for later.

Build: `npm run build:crazygames` → `dist/street-football-chaos-crazygames-<version>.zip` (DEMO, `SFC_STORE = 'crazygames'`). Try it from the repo with `index.html?store=crazygames`.

Requirement pages: [technical](https://docs.crazygames.com/requirements/technical/), [gameplay](https://docs.crazygames.com/requirements/gameplay/), [account integration](https://docs.crazygames.com/requirements/account-integration/), [multiplayer](https://docs.crazygames.com/requirements/multiplayer/), [quality](https://docs.crazygames.com/requirements/quality/).

## A. Required changes (done)

1. **SDK.** `SFC.Store` (`src/engine/store.js`, `config/store.config.js`) loads SDK v3 at boot (waits up to 6 s, plays without it on failure). `gameplayStart` on match begin / resume, `gameplayStop` on single-player pause and back to menu (ranked pause keeps playing).
2. **Language.** A saved choice wins. Otherwise the SDK `systemInfo.locale`, if it maps to one of our packs, is used without the popup (not saved). No locale, unknown locale or SDK failure: language popup.
3. **Escape removed** (restricted key, exits fullscreen): `controls.restrictedKeys`. Pause = P, back = Backspace / P; "Esc" hints show the remaining key.
4. **Demo store links** only on the main menu / end of demo: PRIVATE MATCH shows "PRIVATE MATCH is in the full game." instead of WISHLIST; Main Path doesn't pop WISHLIST.
5. **Fake Social hidden** (`social.enabled = false`): no fake friends, invites, party or chat.
6. **Name filter** (all stores, client side only): `config/namefilter.config.js`, `Profile.nameAllowed`. Typing a blocked name is refused; blocked names received from others show as `PLAYER`. The match server doesn't filter (no redeploy needed).
7. **`-webkit-user-select: none`** etc. on `body` for Safari.
8. **SETTINGS › PRIVACY NOTICE** (all stores): `config/privacy.config.js`, English only. Contact: team41.sfc@gmail.com. Update `updated` when the text changes. Risk: CrazyGames asks for a notice "for new players"; if review flags a settings-only entry, add a small link on the home screen or name step.

## B. Checks before submitting

- [ ] **Readability** at their frame sizes: 821×462 (tightest), 907×510, 1077×606, 1216×684, 1280×720, 1366×768, 1536×864, 1920×1080. Menu, PLAY, match HUD, draft, result, inventory. Home and privacy pages checked at 821×462: fine.
- [ ] **Desktop only** when submitting (no touch controls).
- [ ] **Upload to the Developer Portal preview** (private, submit for review whenever ready) and confirm there: `index.html` at zip root, SDK loads, `gameplayStart` registers, language follows their locale, match server and PeerJS reachable inside their iframe.

## C. Friends through the CrazyGames SDK (not started)

Goal: replace the fake Social with real CrazyGames friends.

SDK pieces ([user](https://docs.crazygames.com/sdk/user/), [game](https://docs.crazygames.com/sdk/game/)):
- `user.listFriends({page, size})`: id, username, avatar; logged-in players only; no online status. Max 50 per page, 1 call / 250 ms.
- `game.updateRoom({ roomId, isJoinable, inviteParams })` / `leftRoom()`: friends join or invite from the CrazyGames sidebar. `inviteLink(params)` for a copyable link.
- Joiners arrive via `addJoinRoomListener(fn)` (already in game) or `game.inviteParams` at startup.
- Guests: "Log in with CrazyGames" via `user.showAuthPrompt()`, never the main call to action, never automatic.
- Friend requests and chat stay on CrazyGames.

Plan: party = a real private room (room code in `inviteParams`), leader presses START. A `Social` interface with one backend per store (`crazygames` SDK, `steam` later, none for itch); the fake-bot backend becomes debug-only or goes.

**Open decisions**
1. Ranked parties in v1 (server grouping + protocol bump), or party = private room + invites only?
2. Replace the typed name with the CrazyGames username when logged in? (Full launch requires it.)
3. PRIVATE MATCH is locked in the demo; friends need it unlocked, at least for invite-only rooms.
4. Steam / itch: hide friends, or start Steam friends too?

## Not decided / parked

- **Sleeping match server** (Render free tier): pressing START right after opening the game can wait up to 45 s (`net.server.queueWake`); alone in the queue waits 15–25 s (`net.queue.aloneWait`) before bots. Options: keep the server awake (paid instance or an outside ping on `/healthz`), shorter waits, or both.

## Full launch (later)

One click to gameplay for new players (skip language popup + name entry), `gameplayStop` everywhere / loading events, Data module for saves, CrazyGames username and avatar, Instant Multiplayer, ads.
