# Street Football Chaos: dedicated match server

This server runs online matches so that no player has to host. It's an alternative to player-hosted rooms (Steam P2P / PeerJS); the game tries the server first and falls back to player-hosting if the server can't be reached.

- It uses the same room rules as player-hosted rooms (`src/net/room.js`) and the same match code (`src/game`, `src/entities`, `src/systems`), loaded from the repo by `sim.js` (the file list is the `server` entries in `scripts/manifest.js`).
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

Build from the repo root, because the image needs `config/`, `src/` and `scripts/manifest.js`:

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
| `LOBBY_TTL` | 1800 | Seconds a room that isn't playing (lobby, or a finished match left on the result screen) can sit with no messages before it's closed |
| `MSG_RATE` | 200 | Messages per second per client before it's disconnected |
| `IDLE_EXIT` | 0 | Exit after this many seconds with nobody connected (for platforms that start the app on demand). 0 = never |
| `SHUTDOWN_GRACE` | 60 | On SIGTERM: stop accepting rooms, wait up to this many seconds for running matches, then exit |
| `LOG_STATS` | 0 | Print rooms / matches / clients / outgoing KB/s / heap every N seconds. 0 = off |
| `MAX_PER_IP` | 10 | Open connections allowed from one IP address; extra ones are refused. 0 = no limit |
| `JOIN_TIMEOUT` | 10 | Seconds a connection has to create or join a room **and** be accepted into it (`hello`). Otherwise it's disconnected; a room left with nobody in it is deleted |

Behind a provider's proxy or load balancer, the player's address is read from the last entry of `X-Forwarded-For` (the one the proxy adds). Without a proxy, the socket address is used.

## Protocol

The handshake is `create{v}` or `join{code,v}`, answered by `room{code,id}` or `err{e}` (`version`, `room-missing`, `server-full`, `server-closing`). After that, every message goes straight to the room. The message list is in [src/net/online.js](../src/net/online.js). `net.protocol` must match between game and server. Bump it when the message format changes and redeploy the server together with the game.

## Robustness

- **Errors stay in their room.** An exception while handling a message or simulating a match closes only that room (players get disconnected with "Lost connection to the server") and is logged with the room code. Other rooms keep running.
- **Only room members receive room traffic.** A connection that joined with a code but hasn't been accepted (`hello`) gets nothing but direct replies, and is dropped after `JOIN_TIMEOUT`.
- **Shutdown (SIGTERM):** create and join are refused with `server-closing` (CREATE ROOM then falls back to player-hosting), `/healthz` returns 503, running matches get up to `SHUTDOWN_GRACE` seconds to finish.
- **Logs:** one line per room event: `[room ABC123] created`, `match started (versus, 2 players)`, `match ended 3-1 after 241s`, `closed (empty | idle | error | shutdown, N connected)`. Errors include the room code and a stack trace.
- **Flood limits:** `MAX_PER_IP` connections per address, `MSG_RATE` messages per second per connection, 16 KB max message, `MAX_ROOMS` rooms. Clients that stop answering pings, or fall 1 MB behind on receiving, are disconnected.

## Limits (for now)

- Rooms live in memory: a restart or redeploy ends running rooms. SIGTERM waits for matches to finish (up to `SHUTDOWN_GRACE`).
- One process, one region. For several regions, run one server per region and add a region marker to the room code.
- No matchmaking queue yet. Players join with room codes.
