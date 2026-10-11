# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Street Football Chaos: a 3v3 top-down arcade football game in plain browser JavaScript (canvas, procedural pixel art, WebAudio). It ships as a web build (itch.io) and an Electron desktop build (Steam). The README (in Vietnamese) documents gameplay rules and tuning knobs in detail. Some of it is out of date: its online section predates the dedicated server, and its Core/team counts are old.

## Commands

| Task | Command |
|---|---|
| Serve the game (http://localhost:8080) | `npm run serve` (`-- --port N`) |
| Game + local dedicated match server (ws://localhost:8081, URL injected at serve time) | `npm run online` |
| Desktop build in dev (Electron; Steam P2P if Steam is running, App ID 480 from `steam_appid.txt`) | `npm start` |
| Match server tests (server + client, no browser) | `npm run server:test` |
| Single test file | `node server/test/room-test.js`, `client-test.js`, `hardening-test.js`, `reconnect-test.js`, `queue-test.js` or `compression-test.js` |
| Translation check (missing keys, `{var}` / tag mismatches; exits 1 on errors) | `node scripts/i18n-check.js` |
| Rebuild the Japanese subset font after editing `src/i18n/ja.js` | `python scripts/build-ja-font.py` |
| Steam build (`dist/steam`; Steam page not live yet, so this build is behind) | `npm run build:steam` |
| itch.io web / desktop builds (DEMO) | `npm run build:itch-web` / `npm run build:itch-desktop` |
| CrazyGames web build (DEMO) | `npm run build:crazygames` |

There is no bundler, linter or unit-test framework for the game itself. Gameplay is checked in the running game:
- `sandbox.html` is the VFX/Core playground.
- `SFC.app.game` in the console gives live access to the match, e.g. `SFC.app.game.cores.add(0, 'thunder_kick')`.
- `SFC.Profile.data` holds the save; call `SFC.Profile.save()` after editing it.
- `index.html?lang=es` forces a language; `?lang=pseudo` turns on pseudo-localization.

Opening `index.html` from disk mostly works, but browsers block the XHR that loads `assets/sfx/*.wav` over `file://`, so recorded SFX fall back to synthesized sound. Use `npm run serve` when sound matters.

## Architecture

**No modules.** Every file is a classic `<script>`, and **load order matters**. Each file is an IIFE that attaches to the global `window.SFC` namespace (`SFC.Game`, `SFC.Session`, ...). Tuning data lives in `window.SFC_CONFIG.*`, defined by `config/*.config.js`. All balance numbers belong in `config/`, not in code.

**Script list = `scripts/manifest.js`, the single source.** It lists every file in load order, and each file names the targets that load it:
- `game` = `index.html`
- `sandbox` = `sandbox.html`
- `itch` = `tools/itch-page/generate.html`
- `server` = the match server, loaded directly by `server/sim.js`; simulation code only

To add, remove or reorder a script, edit `FILES` there and run `npm run manifest`. That rewrites the `<!-- scripts:begin -->…<!-- scripts:end -->` block in each HTML page; never edit that block by hand.
- `npm run serve` / `npm run online` regenerate stale pages on start.
- Every `npm run build:*` fails via `node scripts/manifest.js --check` if the pages are out of date.

**Folders under `src/`.**
- `engine/`: utils, input, gamepad, audio, storage, i18n.
- `meta/`: profile, mainpath, teammates, settings, social (progression and save data).
- `entities/`, `systems/`, `game/`: the simulation.
- `render/`, `ui/`: drawing and screens.
- `net/`: online play.

"Core" always means the **Core Upgrade** gameplay feature (`cores.config.js`, `systems/cores*.js`), never a folder.

**Runtime.**
- `src/main.js` owns `SFC.app`: screens (`menu | game | pause | intro | story`), modes (`single | online`), and a fixed 60 Hz step driven by `requestAnimationFrame`. A Web Worker clock keeps online matches ticking in hidden tabs.
- `SFC.Game` (`src/game/match.js`) is one match: a kickoff → play → goal → draft → end state machine, configured entirely by an `opts` object. Examples: `humanTeam: -1` for an AI-only demo, `seats` for online slots, `solo`, `training`, `mainPath`, `tutorial`. The header comment documents every option.
- The simulation is `src/entities/` + `src/systems/`:
  - `actions`: kicks, passes, attacks
  - `ai`, `human`: the controllers
  - `cores` / `cores-new`: `CoreSystem`, plus per-Core `Behaviors` objects hooked by id (`onShoot`, `onPass`, ...)
  - `effects`: VFX state; `vfxkit.js` extends `SFC.Effects.prototype`
- `src/render/` and `src/ui/` only read game state. The simulation has no DOM dependencies, which is what lets it run headless on the server.

**Meta / persistence.**
- `SFC.Profile` (level, gold, inventory, attributes), `SFC.MainPath` (career ladder: Areas are Elo ranges; ranked 3v3 against real players when the server can match some, empty seats / unmatched players get bot-driven fake players from `matchmake()`; a `pending` loss is saved at kickoff so quitting mid-match still counts), `SFC.Mates` (AI teammates) and `SFC.Social` (placeholder friend list / chat / username friend requests / 3-player party with bot-driven fake friends, key `sfc_social_v1`) are all saved through `SFC.Storage`.
- `SFC.Achievements` (`src/meta/achievements.js`, list in `config/achievements.config.js`, page `src/ui/achievements.js` behind the trophy button under SETTINGS on the home screen) computes progress straight from the profile (stats, Elo, unlocked Cores…). The profile only stores claimed ids (`Profile.data.ach`). Rewards go straight in: a costume to the inventory, or a free gacha box to the SHOP.
- `SFC.Storage` writes to `localStorage` on the web and to JSON files with `.bak` copies on desktop (via `electron/preload.js`). See `docs/SAVE.md`.

**Online** (`src/net/`). The model is host-authoritative, and the same room logic runs in two places:
- `room.js` (`SFC.Room`) holds the UI-free room rules: lobby slots, owner, starting a match, the tick loop, snapshot broadcast. It runs in the browser when a player hosts (Steam P2P via `transport-steam.js`, or PeerJS/WebRTC via `transport-peer.js`) and in Node on the dedicated server (`server/`, reached through `transport-server.js`).
- `session.js` (`SFC.Session`) is the player's online session and has **no UI**. It never calls `Menu`, `UI`, `Audio`, `Intro` or `Input`, and contains no player-facing text. It reports everything through events (`Session.on('busy' | 'waiting' | 'lobby' | 'notice' | 'role' | 'start' | 'toLobby' | 'player' | 'owner' | 'reconnecting' | 'getReady' | 'closed', fn)`) with neutral reason codes. It gets game data through `Session.provide({ profile, area })`. Guests send input bitmasks and draw a **mirror `Game` that is never simulated**.
- `src/ui/online.js` (`SFC.OnlineUI`) is the online UI. It turns those events into pages, messages, banners and sounds, owns all online texts (`TEXT`, `REASONS`), and routes in-match input (pause overlay, draft, result screen, intro). `main.js` calls `OnlineUI.tick/view`, while menus call `Session`'s commands (`createRoom`, `joinRoom`, `cancel`, `leave`, `startMatch`, `requestSlot`, `updateProfile`, `prepare`…) and read its state. To change how online looks, edit the UI files only; `client-test.js` fails if `src/net/` references the UI.
- **Where players find it:** the PLAY screen has two tabs, switched with Q/E (LB/RB) in the style of Rocket League.
  - **RANKED** is menu page `party`: Main Path matchmaking. Its header (Area + progress bar) opens **GOAT PATH** (page `road`, `src/ui/road.js`): a horizontal sea map where each Area is an island (its arena thumbnail, name flag, entry Ultimate / Cores). The ⅓ / ⅔ Core Road milestones are waypoints on the path, and the player's character stands at their current Elo. Everything is shown (`mainPath.roadSpoilers: true`; `false` hides unreached Areas as `???`).
  - **PRIVATE MATCH** covers pages `online`, `join` and `lobby`: room codes, versus or co-op vs bots, no Elo. It's drawn by `Menu.renderPrivate` in the same `pt-*` layout. OnlineUI still navigates with `Menu.go('online' | 'join' | 'lobby')`.
- `isHost` means this machine runs the match. `isOwner` means this player controls START / BACK TO LOBBY. Use `isOwner` for UI gating.
- CREATE ROOM tries the server first when `net.server.url` is set (empty by default), then falls back to player-hosting. All room codes are 7 characters; JOIN recognises a server room by its first character (`net.server.codeFirst`, see `NetCommon.isServerCode`). Steam codes always start A–D, and PeerJS codes avoid those characters.
- **Players must never be able to tell which model a room uses.** Every message, error text (`ERRORS` in `transport.js`), room code and lobby tag (HOST = room owner) is identical across server, Steam and PeerJS. Don't mention servers, hosting machines, P2P, Steam, PeerJS or waking in player-facing text; `client-test.js` fails if any appears.
- `sync.js` defines what guests see:
  - `snapshot()` / `apply()` copy the player fields named in `PF`.
  - `capture()` wraps a **hard-coded list of `Effects` method names** and replays them on guests.
  - A new player field that rendering needs, or a new effect method guests should see, must be added there. Otherwise it silently won't appear online.
- **Ranked matchmaking** (PLAY › START with no party). `Session.queue()` sends `queue{elo,role,pf}` to the server, where `src/net/matchmaker.js` (`net.queue`, server-only) groups 2–4 players by a widening Elo window. A `Room` with `ranked` lineup then plays the match with no lobby or owner, and AI fills the empty seats. The client gets `start{opts.ranked, opts.mainPath}` and records its own Elo.
  - Every failure emits `solo`, and the menu runs the offline `MainPath.matchmake()`.
  - **Players must not be able to tell real players from AI** (the user's decision). Both look the same in MATCH FOUND, the intro (Elo badges), the pause menu (it doesn't freeze ranked matches, offline included), the draft timer and the result screen. Only your own control ring shows, and there are no away/left banners. One accepted exception (the user's call): online ranked matches show the ping readout (`src/ui/online.js`), offline ones have none.
  - UI code tells ranked apart with `game.opts.mainPath` (`UI.ranked`), and online rooms with `UI.roomMatch`.
- Reconnect lives in `Room` too: a mid-match disconnect marks the member `away` for `net.reconnectGrace` seconds (AI plays the seat). `hello{tok}` reclaims it via `rejoin()`, and whoever runs the Room must call `room.expire(Date.now())` periodically. Never send a `lobby` packet mid-match: guests treat it as "match over, back to lobby"; resume data travels inside `start{opts.resume, opts.lobby}`.
- Bump `net.protocol` when the message format changes. The server must be redeployed together with the client.
- **Versions.**
  - Server: `server/package.json` `version` is `<net.protocol>.<minor>.<patch>` (semver, e.g. `5.1.0`), and it's also the Docker image tag. The server refuses to start if the major doesn't equal `net.protocol`, so a protocol bump means the server goes to `<new protocol>.0.0` (or `.1.0`).
  - Client: the game's semver is `version` in the root `package.json`. The full client version is `<version>-<net.protocol>` (e.g. `1.1.0-5`; `NetCommon.clientVersion()`), shown on the SETTINGS heading. Dev runs show `dev-<protocol>`, because `config/build.config.js` has `SFC_VERSION_STRING = 'dev'` and `scripts/strip-debug.js` writes the real number when packaging.
  - The handshake carries both (`cv` from the client, `sv` in `room` / `err` replies), and the server logs which client version opened or joined each room. `/healthz` reports `version`.
- **Live server deployment is manual.** The match server runs on Render (`wss://sfc-server.onrender.com`, the `net.server.url`) from the Docker Hub image `team41sfc/sfc-server:<tag>`.
  - `npm run server:image` builds and smoke-tests the image locally (tag = server version). That's all Claude does by default.
  - Pushing (`npm run server:image -- --push`) only happens when the user asks for it in chat; pushes to the hub are limited.
  - The user switches the tag on Render and deploys by hand. Until then the live server keeps the old protocol, so a client with a newer `net.protocol` falls back to player-hosting / AI ranked.
- `server/README.md` covers server env vars, Docker (`docker build -f server/Dockerfile .`, built from the repo root) and the handshake.

**Build flavors** (`config/build.config.js`):
- `SFC_DEBUG`: dev-only features (test menus, cheats). `scripts/strip-debug.js` runs as electron-builder `afterPack` and inside `build-web.js`, and uses Terser to delete `if (SFC_DEBUG)` branches. The build **fails** if dev-only marker strings (the `MARKERS` list) survive outside those branches.
- `SFC_STORE`: which store this build ships to: `'none'` (run from the repo) | `'steam'` | `'itch'` (web + desktop) | `'crazygames'`. `strip-debug.js` writes it when packaging (from `build-web.js <target>`, or env `SFC_STORE` for Electron, default `steam`). Gate platform-specific behaviour on this, not on new booleans.
- `SFC_DEMO`: the itch.io and CrazyGames builds. `config/demo.config.js` locks Area 3+ and ONLINE.
- The itch desktop build excludes `steamworks.js`, so it uses PeerJS like the web build.
- Dev runs can pretend to be a store with `index.html?store=crazygames`.
- **CrazyGames** (`SFC_STORE === 'crazygames'`, Basic launch: only Basic requirements apply):
  - `SFC.Store` (`src/engine/store.js`, `config/store.config.js`) loads the CrazyGames SDK v3 at runtime; boot waits for it (`initTimeout`). It exposes `locale()` and `gameplay(on)` (start/stop on match begin, single-player pause/resume, back to menu; ranked pause stays "playing").
  - Language: a saved choice wins; otherwise a store locale that maps to a pack is used without the popup (not saved). No locale, or no matching pack, shows the language popup.
  - Escape is a restricted key (it exits fullscreen): `controls.restrictedKeys` strips it from every binding, and `Input.key(action, 'Esc')` falls back to the action's remaining key (back → Backspace, pause → P).
  - Store links only on the main menu or at the end of the demo: PRIVATE MATCH shows a "full game" message instead of the WISHLIST screen, and Main Path doesn't pop WISHLIST.
  - `social.enabled` is false: no fake friends, invites, party or chat.
- SETTINGS › PRIVACY NOTICE shows `config/privacy.config.js` (English only, not translated). Update the text when the game starts collecting anything new. Every store.
- Player names go through `Profile.nameAllowed` (`config/namefilter.config.js`), **client side only**: `setName` rejects blocked names, and every name received from others (`sanitizePublic`: room members, match seats; club names in `Session.guestStart`) becomes `nameFilter.fallback`. The dedicated server doesn't load the list, so editing it needs no redeploy. Every store, not just CrazyGames.

**Localization.**
- English source strings are the keys: `SFC.t('...')`, `SFC.tn` for plurals, `SFC.tc('ctx', '...')` for context variants. In UI files the alias is `_t`, never `t`.
- Config text fields are translated in place according to `src/i18n/fields.js`.
- Packs live in `src/i18n/{pt-BR,pt-PT,es,ja}.js`. When adding a player-facing string, add it to every pack, run `i18n-check`, and rebuild the ja font.
- Process, style guide and glossary: `docs/LOCALIZATION.md`, `docs/i18n/`.

## Marketing tools

`tools/mkt/` is the wishlist-marketing toolset (link router + UTM, streamer finder, outreach mailer, press kit / copy generator, publish queue, analytics, dashboard); `tools/mkt/README.md` documents every tool. Plain Node ESM, no dependencies; `npm run mkt:test` runs its tests (mocked HTTP, no network). Credentials live in `tools/mkt/.env` (never committed), local data in `tools/mkt/data/`, generated files in `tools/mkt/out/`. `tools/mkt/presskit/facts.json` is the single source for every public number and blurb (3v3, 54 Cores, 8 ultimates, 10 Areas); change it there and run `npm run mkt:presskit`. Language variants of the hook-test clips are made in `brag-output/hook-test/work/` with `captions.py` + `edl_zzz_lang.py`.

## Conventions

- Code comments are written in Vietnamese; keep new comments in Vietnamese to match. Player-facing text is English (the i18n key).
- Design docs to read before changing these systems: `docs/CORE_DESIGN.md` (Core rules, including "no invisible Cores": every Core needs a visual in `src/render/vfx.js`), `docs/DRILL_DESIGN.md`, `docs/TEAMMATE_DESIGN.md`, `docs/SFX.md`, `docs/SAVE.md`.
- To add a Core: add an entry in `config/cores.config.js` (its `desc` is one short line of 7–10 words with no numbers or `{param}` values; the user decided players don't read numbers), and give it exactly one unlock spot: `progression.starterCores` or a Core Road notch (`mainpath.config.js → areas[].road`; ults go in `areas[].ult`). The in-match draft picks at random from every Core the player has unlocked (`docs/CORE_ROAD.md`). If it needs custom behaviour, add a `Behaviors` entry in `src/systems/cores.js` or `cores-new.js` (the hook list is at the top of each file), plus a preview scene in `src/ui/corepreview.js` (`SCENES`).
