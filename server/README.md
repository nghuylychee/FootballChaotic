# Street Football Chaos: dedicated match server

This server runs online matches so that no player has to host. It's an alternative to player-hosted rooms (Steam P2P / PeerJS); the game tries the server first and falls back to player-hosting if the server can't be reached.

- It uses the same room rules as player-hosted rooms (`src/net/room.js`) and the same match code (`src/game`, `src/entities`, `src/systems`), loaded from the repo by `sim.js` (the file list is the `server` entries in `scripts/manifest.js`).
- It's provider-independent: plain Node plus one dependency (`ws`). It runs anywhere that can run a Docker image or Node 18+ with WebSockets.
- It's light: about 0.04 ms of CPU per room per tick (60 ticks/s), around 8–10 MB of heap when idle, and nothing runs while no match is in progress. Each player receives about 3 KB/s (snapshots at 30/s, compressed from about 25 KB/s).

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
| `LOG_STATS` | 0 | Print rooms / matches / queue / clients / outgoing KB/s / heap every N seconds. 0 = off |
| `MAX_PER_IP` | 10 | Open connections allowed from one IP address; extra ones are refused. 0 = no limit |
| `COMPRESSION` | 1 | WebSocket compression (`permessage-deflate`, 4 KB window). About 9× less bandwidth, about 60 % more CPU per match. 0 = off |
| `JOIN_TIMEOUT` | 10 | Seconds a connection has to create or join a room **and** be accepted into it (`hello`). Otherwise it's disconnected; a room left with nobody in it is deleted |

Behind a provider's proxy or load balancer, the player's address is read from the last entry of `X-Forwarded-For` (the one the proxy adds). Without a proxy, the socket address is used.

## Protocol

The handshake is `create{v}` or `join{code,v}`, answered by `room{code,id}` or `err{e}` (`version`, `room-missing`, `server-full`, `server-closing`). A reconnecting player joins the same way and sends its token in `hello{tok}`. After that, every message goes straight to the room. The message list is in [src/net/session.js](../src/net/session.js). `net.protocol` must match between game and server. Bump it when the message format changes and redeploy the server together with the game.

Ranked search uses a third handshake, `queue{v,elo,role,pf}`. The server answers `queued`, then either `room{code,id}` once a match is made (the client sends `hello` as usual) or `solo` when nobody can be matched. `unqueue`, or closing the connection, leaves the queue.

## Matchmaking (ranked Main Path)

PLAY › START with no friend in the party searches for real players. The queue lives in [src/net/matchmaker.js](../src/net/matchmaker.js) and is tuned by `net.queue` in `config/net.config.js`. The server matches the queue once a second, oldest ticket first:

- **Elo window:** starts at ±`range[0]` (100) and widens to ±`range[1]` (400) over `widen` seconds (15). After `anyAfter` seconds (20) a ticket accepts any Elo, so two players online at the same time always meet. Two tickets fit when their gap is within the larger of their two windows.
- **When a match starts:** 4 tickets that fit start at once. 2–3 tickets start once the oldest has waited `gather` seconds (5), in case a 3rd or 4th player arrives.
- **Alone:** with nobody else in the queue, the server sends `solo` after `aloneWait` seconds (random 6–12). Otherwise it sends `solo` after `maxWait` seconds (30).
- **Line-up:**
  - **4 players:** the highest and lowest Elo play the middle two.
  - **3 players:** the top player gets an AI teammate whose Elo evens out the two team averages.
  - **2 players:** they face each other, each with an AI teammate near their own Elo.
  - **AI fill:** AI players are `MainPath.fakePlayer`s with a name, Elo and deck, just like the ones in solo ranked matches.
  - **Arena and AI strength:** both follow the average Elo of all 4 players.
- **Ranked rooms:** no lobby and no owner. Matched players say `hello` and sit in their assigned seat. The match starts when everyone has arrived or after `joinWait` seconds (5), and an AI takes any empty seat. Players who leave are replaced by AI, and the match always plays to the end. The room closes 2 minutes after the match ends.
- **Elo** stays on each player's machine. The ticket's Elo is trusted, clamped to 0..1e6. Each `start` carries `mainPath{myElo, oppElo}` (team averages) for that player's side, and each client records its own result with `MainPath.record`.

From the player's side, every failure ends in `solo`: no server URL, server unreachable after one attempt, full, shutting down, or nobody to match. The client then plays the usual AI ranked match, and both paths look the same. The client doesn't wait for a sleeping server, because if it's asleep nobody is queued. Opening the PLAY screen wakes it for the next search.

## Robustness

- **Reconnect.** A player whose connection drops mid-match is held as "away" for `net.reconnectGrace` seconds (30, in `config/net.config.js`): the AI plays their footballer, and the room stays alive even if every connection dropped. The client retries every 2 s with its private token and gets its seat back. After the grace period the old rules apply (removed; a room left with fewer than 2 players returns to the lobby). Leaving on purpose (`bye`) or the server closing the room skips all this.
- **Errors stay in their room.** An exception while handling a message or simulating a match closes only that room (players get disconnected with "Lost connection to the server") and is logged with the room code. Other rooms keep running.
- **Only room members receive room traffic.** A connection that joined with a code but hasn't been accepted (`hello`) gets nothing but direct replies, and is dropped after `JOIN_TIMEOUT`.
- **Shutdown (SIGTERM):** create and join are refused with `server-closing` (CREATE ROOM then falls back to player-hosting), `/healthz` returns 503, running matches get up to `SHUTDOWN_GRACE` seconds to finish.
- **Logs:** one line per room event: `[room ABC123] created`, `match started (versus, 2 players)`, `match ended 3-1 after 241s`, `a player disconnected, seat held 30s`, `a player reconnected`, `closed (empty | idle | done | error | shutdown, N connected)`, plus `created (ranked, N players)` for matched rooms. Errors include the room code and a stack trace.
- **Flood limits:** `MAX_PER_IP` connections per address, `MSG_RATE` messages per second per connection, 16 KB max message, `MAX_ROOMS` rooms. Clients that stop answering pings, or fall 1 MB behind on receiving, are disconnected.

## Capacity

Measured with `node test/load-test.js` (2 clients per match, input 10 times a second; `COMPRESSION=0` to compare). The test ramps up matches until the server can't hold 60 ticks/s.

| | Compression off | Compression on |
|---|---|---|
| CPU per match (desktop core) | ~0.4–0.5 % | ~0.6–0.7 % |
| Memory | ~140 MB RSS at 200 matches | ~190 MB RSS at 200 matches |
| Bandwidth per player | ~25 KB/s (~90 MB per player-hour) | ~3 KB/s (~10 MB per player-hour) |

CPU is the limit, not RAM. On a 512 MB / 0.5 CPU instance (Render Starter), plan for roughly 30–40 matches at once with compression on. That estimate allows for cloud cores being slower than a desktop, plus headroom; confirm it with `LOG_STATS` after deploying. Bandwidth is what grows with players, which is why compression is on by default.

## Free instances that sleep (e.g. Render Free)

Free tiers usually stop the server after a period with no incoming traffic (Render: 15 minutes) and start it again on the next connection, which takes about a minute. The game and server handle this:

- **Waking early:** opening the ONLINE menu or the PLAY screen sends a request to `/healthz`, so the server starts booting while the player picks CREATE, JOIN or START.
- **Waiting instead of giving up:** CREATE / JOIN retry every 2 s for up to `net.server.wakeTimeout` seconds (70), showing "Starting the game server… Ns". On CREATE, Esc stops waiting and hosts on the player's machine. A server that never answers also falls back to player-hosting once the time is up.
- **Staying awake while in use:** players in a server room send a tiny `ka` message every `net.server.keepAlive` seconds (60), so a lobby or result screen where nobody presses anything doesn't put the server to sleep. The server ignores `ka` for `LOBBY_TTL`, so abandoned rooms still close and the server can still sleep.
- **Rooms live in memory,** so sleeping or restarting ends them. That only happens when nobody has sent anything for 15 minutes.

Render Free settings: Docker web service built from the repo root with `server/Dockerfile`. Render sets `PORT` itself. Set the health check path to `/healthz` and `MAX_ROOMS` to about **8**. The free instance has 0.1 CPU, roughly 5–8 matches at once from the load-test numbers (an estimate). Above the limit, CREATE gets `server-full` and falls back to player-hosting instead of slowing everyone down. Keep `COMPRESSION=1`: outbound bandwidth counts against the workspace's 5 GB.

## Limits (for now)

- Rooms live in memory: a restart or redeploy ends running rooms. SIGTERM waits for matches to finish (up to `SHUTDOWN_GRACE`).
- One process, one region. For several regions, run one server per region and add a region marker to the room code.
- The matchmaking queue is in memory and served by one process. Several servers would need a shared queue.
- Ranked Elo is reported by the client. Making it tamper-proof needs accounts and server-side storage.
