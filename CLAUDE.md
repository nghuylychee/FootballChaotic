# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Street Football Chaos: a 2v2 top-down arcade football game in plain browser JavaScript (canvas, procedural pixel art, WebAudio). It ships as a web build (itch.io) and an Electron desktop build (Steam). The README (in Vietnamese) documents gameplay rules and tuning knobs in detail. Some of it is out of date: its online section predates the dedicated server, and its Core/team counts are old.

## Commands

| Task | Command |
|---|---|
| Serve the game (http://localhost:8080) | `npm run serve` (`-- --port N`) |
| Game + local dedicated match server (ws://localhost:8081, URL injected at serve time) | `npm run online` |
| Desktop build in dev (Electron; Steam P2P if Steam is running, App ID 480 from `steam_appid.txt`) | `npm start` |
| Match server tests (server + client, no browser) | `npm run server:test` |
| Single test file | `node server/test/room-test.js` or `node server/test/client-test.js` |
| Translation check (missing keys, `{var}` / tag mismatches; exits 1 on errors) | `node scripts/i18n-check.js` |
| Rebuild the Japanese subset font after editing `src/i18n/ja.js` | `python scripts/build-ja-font.py` |
| Steam build | `npm run dist` |
| itch.io web / desktop builds (DEMO) | `npm run itch-web` / `npm run itch-desktop` |

There is no bundler, linter or unit-test framework for the game itself. Gameplay is checked in the running game:
- `sandbox.html` is the VFX/Core playground.
- `SFC.app.game` in the console gives live access to the match, e.g. `SFC.app.game.cores.add(0, 'thunder_kick')`.
- `SFC.Profile.data` holds the save; call `SFC.Profile.save()` after editing it.
- `index.html?lang=es` forces a language; `?lang=pseudo` turns on pseudo-localization.

Opening `index.html` from disk mostly works, but browsers block the XHR that loads `assets/sfx/*.wav` over `file://`, so recorded SFX fall back to synthesized sound. Use `npm run serve` when sound matters.

## Architecture

**No modules.** Every file is a classic `<script>`, and **load order matters**. Each file is an IIFE that attaches to the global `window.SFC` namespace (`SFC.Game`, `SFC.Online`, ...). Tuning data lives in `window.SFC_CONFIG.*`, defined by `config/*.config.js`. All balance numbers belong in `config/`, not in code.

**Script list = `scripts/manifest.js`, the single source.** It lists every file in load order, and each file names the targets that load it:
- `game` = `index.html`
- `sandbox` = `sandbox.html`
- `itch` = `tools/itch-page/generate.html`
- `server` = the match server, loaded directly by `server/sim.js`; simulation code only

To add, remove or reorder a script, edit `FILES` there and run `npm run manifest`. That rewrites the `<!-- scripts:begin -->…<!-- scripts:end -->` block in each HTML page; never edit that block by hand.
- `npm run serve` / `npm run online` regenerate stale pages on start.
- `npm run dist` and `itch-*` fail via `node scripts/manifest.js --check` if the pages are out of date.

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
- `SFC.Profile` (level, gold, inventory, attributes), `SFC.MainPath` (career ladder: Areas are Elo ranges; matchmaking is a placeholder that fills the 2v2 with bot-driven fake players), `SFC.Mates` (AI teammates) and `SFC.Social` (placeholder friend list / chat / 2-player party with bot-driven fake friends, key `sfc_social_v1`) are all saved through `SFC.Storage`.
- `SFC.Storage` writes to `localStorage` on the web and to JSON files with `.bak` copies on desktop (via `electron/preload.js`). See `docs/SAVE.md`.

**Online** (`src/net/`). The model is host-authoritative, and the same room logic runs in two places:
- `room.js` (`SFC.Room`) holds the UI-free room rules: lobby slots, owner, starting a match, the tick loop, snapshot broadcast. It runs in the browser when a player hosts (Steam P2P via `transport-steam.js`, or PeerJS/WebRTC via `transport-peer.js`) and in Node on the dedicated server (`server/`, reached through `transport-server.js`).
- `online.js` is the client: lobby UI state, and guests that send input bitmasks and draw a **mirror `Game` that is never simulated**.
- `isHost` means this machine runs the match. `isOwner` means this player controls START / BACK TO LOBBY. Use `isOwner` for UI gating.
- CREATE ROOM tries the server first when `net.server.url` is set (empty by default), then falls back to player-hosting. All room codes are 7 characters; JOIN recognises a server room by its first character (`net.server.codeFirst`, see `NetCommon.isServerCode`). Steam codes always start A–D, and PeerJS codes avoid those characters.
- **Players must never be able to tell which model a room uses.** Every message, error text (`ERRORS` in `transport.js`), room code and lobby tag (HOST = room owner) is identical across server, Steam and PeerJS. Don't mention servers, hosting machines, P2P, Steam, PeerJS or waking in player-facing text; `client-test.js` fails if any appears.
- `sync.js` defines what guests see:
  - `snapshot()` / `apply()` copy the player fields named in `PF`.
  - `capture()` wraps a **hard-coded list of `Effects` method names** and replays them on guests.
  - A new player field that rendering needs, or a new effect method guests should see, must be added there. Otherwise it silently won't appear online.
- Reconnect lives in `Room` too: a mid-match disconnect marks the member `away` for `net.reconnectGrace` seconds (AI plays the seat). `hello{tok}` reclaims it via `rejoin()`, and whoever runs the Room must call `room.expire(Date.now())` periodically. Never send a `lobby` packet mid-match: guests treat it as "match over, back to lobby"; resume data travels inside `start{opts.resume, opts.lobby}`.
- Bump `net.protocol` when the message format changes. The server must be redeployed together with the client.
- `server/README.md` covers server env vars, Docker (`docker build -f server/Dockerfile .`, built from the repo root) and the handshake.

**Build flavors** (`config/build.config.js`):
- `SFC_DEV`: dev-only features (test menus, cheats). `scripts/strip-dev.js` runs as electron-builder `afterPack` and inside `build-web.js`, and uses Terser to delete `if (SFC_DEV)` branches. The build **fails** if dev-only marker strings (the `MARKERS` list) survive outside those branches.
- `SFC_DEMO`: the itch.io builds. `config/demo.config.js` locks Area 3+ and ONLINE.
- The itch desktop build excludes `steamworks.js`, so it uses PeerJS like the web build.

**Localization.**
- English source strings are the keys: `SFC.t('...')`, `SFC.tn` for plurals, `SFC.tc('ctx', '...')` for context variants. In UI files the alias is `_t`, never `t`.
- Config text fields are translated in place according to `src/i18n/fields.js`.
- Packs live in `src/i18n/{pt-BR,pt-PT,es,ja}.js`. When adding a player-facing string, add it to every pack, run `i18n-check`, and rebuild the ja font.
- Process, style guide and glossary: `docs/LOCALIZATION.md`, `docs/i18n/`.

## Conventions

- Code comments are written in Vietnamese; keep new comments in Vietnamese to match. Player-facing text is English (the i18n key).
- Design docs to read before changing these systems: `docs/CORE_DESIGN.md` (Core rules, including "no invisible Cores": every Core needs a visual in `src/render/vfx.js`), `docs/DRILL_DESIGN.md`, `docs/TEAMMATE_DESIGN.md`, `docs/SFX.md`, `docs/SAVE.md`.
- To add a Core: add an entry in `config/cores.config.js`. If it needs custom behaviour, add a `Behaviors` entry in `src/systems/cores.js` or `cores-new.js` (the hook list is at the top of each file), plus a preview scene in `src/ui/corepreview.js` (`SCENES`).
