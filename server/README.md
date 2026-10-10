# Street Football Chaos: dedicated match server

This server runs online matches so that no player has to host. It's an alternative to player-hosted rooms (Steam P2P / PeerJS); the game tries the server first and falls back to player-hosting if the server can't be reached.

- It uses the same room rules as player-hosted rooms (`src/net/room.js`) and the same match code (`src/game`, `src/entities`, `src/systems`), loaded from the repo by `sim.js`.
- It's provider-independent: plain Node plus one dependency (`ws`). It runs anywhere that can run a Docker image or Node 18+ with WebSockets.
- It's light: about 0.04 ms of CPU per room per tick (60 ticks/s), around 20 MB of memory, and nothing runs while no match is in progress. Each player receives about 25 KB/s (snapshots at 30/s).

## Run locally

```sh
cd server
npm install
npm start                 # ws://localhost:8080 · http://localhost:8080/healthz
npm test                  # server tests + client tests (no browser needed)
```

To point the game at it, set `server.url: 'ws://localhost:8080'` in [config/net.config.js](../config/net.config.js). An empty `url` means player-hosted only, which is how the game behaved before.

## Docker

Build from the repo root, because the image needs `config/`, `src/` and `index.html`:

```sh
docker build -f server/Dockerfile -t sfc-server .
docker run -p 8080:8080 sfc-server
```

A provider needs three things: run the image, expose `PORT`, and allow WebSockets. Behind HTTPS, the game connects with `wss://your-host`.

## Environment variables

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | 8080 | HTTP + WebSocket port |
| `MAX_ROOMS` | 500 | Above this, creating a room fails with "server full" |
| `LOBBY_TTL` | 1800 | Seconds a lobby can sit with no messages before it's closed |
| `MSG_RATE` | 200 | Messages per second per client before it's disconnected |
| `IDLE_EXIT` | 0 | Exit after this many seconds with nobody connected (for platforms that start the app on demand). 0 = never |
| `SHUTDOWN_GRACE` | 60 | On SIGTERM: stop accepting rooms, wait up to this many seconds for running matches, then exit |
| `LOG_STATS` | 0 | Print rooms / matches / clients / outgoing KB/s / heap every N seconds. 0 = off |

## Protocol

The handshake is `create{v}` or `join{code,v}`, answered by `room{code,id}` or `err{e}` (`version`, `room-missing`, `server-full`). After that, every message goes straight to the room. The message list is in [src/net/online.js](../src/net/online.js). `net.protocol` must match between game and server. Bump it when the message format changes and redeploy the server together with the game.

## Limits (for now)

- Rooms live in memory: a restart or redeploy ends running rooms. SIGTERM waits for matches to finish (up to `SHUTDOWN_GRACE`).
- One process, one region. For several regions, run one server per region and add a region marker to the room code.
- No matchmaking queue yet. Players join with room codes.
