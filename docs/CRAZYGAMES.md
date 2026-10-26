# CrazyGames publishing

Status of the CrazyGames release. We are in the **Basic Launch** period: only requirements marked Basic apply. Full-launch items are listed at the end for later.

Build: `npm run build:crazygames` → `dist/street-football-chaos-crazygames-<version>.zip` (DEMO, `SFC_STORE = 'crazygames'`). Try it from the repo with `index.html?store=crazygames`.

Requirement pages: [technical](https://docs.crazygames.com/requirements/technical/), [gameplay](https://docs.crazygames.com/requirements/gameplay/), [account integration](https://docs.crazygames.com/requirements/account-integration/), [multiplayer](https://docs.crazygames.com/requirements/multiplayer/), [quality](https://docs.crazygames.com/requirements/quality/).

## A. Required changes (done)

1. **SDK.** The `crazygames` platform adapter (`src/platform/crazygames.js` behind `SFC.Platform`, `config/platform.config.js`) loads SDK v3 at boot (waits up to 6 s, plays without it on failure). `gameplayStart` on match begin / resume, `gameplayStop` on single-player pause and back to menu (ranked pause keeps playing).
2. **Language.** A saved choice wins. Otherwise the SDK `systemInfo.locale`, if it maps to one of our packs, is used without the popup (not saved). No locale, unknown locale or SDK failure: language popup.
3. **Escape removed** (restricted key, exits fullscreen): `rules.crazygames.restrictedKeys` in `config/platform.config.js`, stripped by `Input.init`. Pause = P, back = Backspace / P; "Esc" hints show the remaining key.
4. **Demo store links** only on the main menu / end of demo: Main Path doesn't pop WISHLIST. (PRIVATE MATCH is open on CrazyGames for now, see C; if the demo locks it again it shows "PRIVATE MATCH is in the full game." instead of WISHLIST.)
5. **Fake Social hidden** (`rules.crazygames.fakeSocial = false`): no fake friends, invites, party or chat.
6. **Name filter** (all stores, client side only): `config/namefilter.config.js`, `Profile.nameAllowed`. Typing a blocked name is refused; blocked names received from others show as `PLAYER`. The match server doesn't filter (no redeploy needed).
7. **`-webkit-user-select: none`** etc. on `body` for Safari.
8. **SETTINGS › PRIVACY NOTICE** (all stores): `config/privacy.config.js`, English only. Contact: team41.sfc@gmail.com. Update `updated` when the text changes. Risk: CrazyGames asks for a notice "for new players"; if review flags a settings-only entry, add a small link on the home screen or name step.

## B. Checks before submitting

- [x] **Readability** at their frame sizes: 821×462 (tightest), 907×510, 1077×606, 1216×684, 1280×720, 1366×768, 1536×864, 1920×1080. The stage is 640×360 scaled in 0.25 steps (`main.js → fit`), so every size has the same layout and 821×462 / 907×510 are the smallest (1.25×). Checked at 821×462 with device scale 1: home, PLAY (both tabs), Main Path, GOAT PATH, achievements, shop, inventory, character, ultimate, team, settings, privacy, intro, match HUD, draft, result. All readable after raising the 4px labels to 5px Press Start 2P (ability-bar keys were illegible in VT323 4px; also OVR, HUD name tag, story Areas, tutorial coach/HOLD). Keep new text at 5px or more.
- [ ] **Desktop only** when submitting (no touch controls).
- [ ] **Upload to the Developer Portal preview** (private, submit for review whenever ready) and confirm there: `index.html` at zip root, SDK loads, `gameplayStart` registers, language follows their locale, match server and PeerJS reachable inside their iframe.

## C. Friends through the CrazyGames SDK (done, testing in the portal preview, not released)

Requirements: [multiplayer](https://docs.crazygames.com/requirements/multiplayer/) (Online with Friends = Full implementation; we build it now to test). SDK: [game](https://docs.crazygames.com/sdk/game/), [user](https://docs.crazygames.com/sdk/user/). Code: `src/platform/crazygames.js` (adapter), `Session.presence` / `watchInvites`, `OnlineUI.invite` / `tryInvite`. Test: `server/test/invite-test.js` 7–10.

A party = a private room (PRIVATE MATCH or a Story co-op room); the owner presses START, and after the match everyone is back in the same lobby.

| Requirement | How |
|---|---|
| Share room + status | `updateRoom({ roomId: <room code>, isJoinable, inviteParams: { room: <code> } })`, sent when it changes (checked every `platform.presenceEvery` s). Joinable = in the lobby with a free seat (6, Story 3); not joinable mid-match; `leftRoom()` on leave. Ranked rooms are never reported |
| Join without reload | `addJoinRoomListener` → Session `invite {code}` → leaves the current room / search, joins (after the match if one is running) |
| Opened from an invite | `game.inviteParams.room` at boot → joins once the menus are ready |
| Skip onboarding for joiners | Opened from an invite / instant: PROLOGUE skipped that time (still offered next launch). Logged-in players with no name get their CrazyGames username, so no name step; guests type a name (one screen) |
| Instant Multiplayer | `isInstantMultiplayer` → PRIVATE MATCH › CREATE ROOM as soon as the player is free in the menus |
| Invite link (optional) | INVITE FRIENDS in the lobby copies `inviteLink({ room })` |
| CrazyGames usernames | Only fills an empty name (a name the player chose is kept) |
| Lobby size to submit | **6** (`net.maxPlayers`; Story co-op rooms hold 3) |

Every SDK call logs `[cg] …` in the console, for checking in the preview.

**Preview test checklist** (two browsers, two CrazyGames accounts that are friends):
- [ ] A creates a room → B sees "join" in the friends sidebar / gets an invite → joins without a reload.
- [ ] B with a fresh profile, opened from the invite → lands in A's room, no PROLOGUE.
- [ ] Copied invite link opens the game into the room.
- [ ] Mid-match the room isn't joinable; after the match it is again.
- [ ] Leaving clears the room (`leftRoom`).
- [ ] Server rooms and DIRECT (PeerJS) rooms both work inside their iframe.

**Still open**
1. Friends list (`user.listFriends`): skipped; it has no online status and the SDK can't invite one specific friend (the sidebar does that).
2. Always show the CrazyGames username when logged in (Full launch wants it), instead of only filling an empty name?
3. Demo scope: PRIVATE MATCH is open on CrazyGames (`platform.crazygames.privateMatch`) only to test invites.
4. Ranked parties (server grouping + protocol bump): not started.
5. Fake Social (`fakeSocial` off here) could get a Steam / CrazyGames backend later through the same platform adapters.

## Not decided / parked

- **Sleeping match server** (Render free tier): pressing START right after opening the game can wait up to 45 s (`net.server.queueWake`); alone in the queue waits 15–25 s (`net.queue.aloneWait`) before bots. Options: keep the server awake (paid instance or an outside ping on `/healthz`), shorter waits, or both.

## Full launch (later)

One click to gameplay for new players (skip language popup + name entry), `gameplayStop` everywhere / loading events, Data module for saves, CrazyGames avatar, ads. (Username and Instant Multiplayer: see C.)
