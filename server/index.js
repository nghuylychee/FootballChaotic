/* Máy chủ riêng cho trận online: HTTP (/healthz) + WebSocket trên cùng 1 cổng. Không phụ thuộc nhà cung cấp:
 * chỉ cần Node (hoặc Docker), cổng PORT và cho phép WebSocket. Phụ thuộc duy nhất: ws.
 * Mỗi phòng = 1 SFC.Room (src/net/room.js, cùng bản luật với người chơi làm host), không có ghế local.
 * Nhẹ: 1 vòng lặp 60 bước/giây chung cho mọi phòng, chỉ chạy khi có trận đang đá; snapshot JSON 1 lần rồi phát cho cả phòng.
 *
 * Bắt tay (xem src/net/transport-server.js): create{v} / join{code,v} -> room{code,id} | err{e}; sau đó gói đi thẳng vào Room.
 * Biến môi trường: xem ENV bên dưới + server/README.md.
 */
const http = require('http');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const { load } = require('./sim');

const { SFC } = load();
const NET = globalThis.SFC_CONFIG.net;

const num = (v, d) => (v !== undefined && v !== '' && isFinite(+v) ? +v : d);
const ENV = {
  PORT: num(process.env.PORT, 8080),
  MAX_ROOMS: num(process.env.MAX_ROOMS, 500),
  LOBBY_TTL: num(process.env.LOBBY_TTL, 1800),           // giây: phòng không đá (phòng chờ / màn kết quả) mà không ai gửi gì quá lâu thì đóng
  MSG_RATE: num(process.env.MSG_RATE, 200),              // gói / giây / người, quá thì ngắt
  IDLE_EXIT: num(process.env.IDLE_EXIT, 0),              // giây không có ai -> thoát (nền tảng tự bật lại khi có người; 0 = tắt)
  SHUTDOWN_GRACE: num(process.env.SHUTDOWN_GRACE, 60),   // SIGTERM: chờ trận đang đá tối đa bấy nhiêu giây
  LOG_STATS: num(process.env.LOG_STATS, 0),              // giây giữa 2 dòng thống kê (0 = tắt)
  MAX_PER_IP: num(process.env.MAX_PER_IP, 10),           // số kết nối cùng lúc / 1 địa chỉ IP (0 = không giới hạn)
  JOIN_TIMEOUT: num(process.env.JOIN_TIMEOUT, 10),       // giây: kết nối phải tạo / vào phòng và được nhận vào phòng (hello) trong bấy nhiêu giây
  COMPRESSION: num(process.env.COMPRESSION, 1),          // 1 = nén WebSocket (permessage-deflate), 0 = tắt
};
// Nén: snapshot liên tiếp gần như giống hệt nhau -> deflate nhớ ngữ cảnh giữa các gói nén ~9 lần (~900 B -> ~90 B).
// Cửa sổ 4 KB (2^12) vẫn chứa vài snapshot nên nén gần bằng mặc định 32 KB, nhưng mỗi kết nối chỉ tốn ~48 KB thay vì ~256 KB.
// threshold 0: snapshot (~900 B) nhỏ hơn ngưỡng mặc định 1 KB của ws -> mặc định sẽ không nén gì.
const DEFLATE = {
  serverMaxWindowBits: 12,
  zlibDeflateOptions: { memLevel: 6, level: 6 },
  // KHÔNG đặt clientMaxWindowBits: ws sẽ từ chối (400) mọi trình duyệt không xin client_max_window_bits — Firefox
  clientNoContextTakeover: true,    // gói từ người chơi (phím) nhỏ: máy chủ không phải giữ ngữ cảnh giải nén cho từng người
  threshold: 0,
};
const STEP = 1 / 60;
const MAX_BUFFER = 1 << 20;   // người chơi nhận chậm tới mức đọng 1 MB -> ngắt (khỏi phình bộ nhớ)

const rooms = new Map();      // mã phòng -> { code, room, clients: Map(id -> client), touched }
const clients = new Set();    // mọi kết nối: { id, ws, ip, room, msgs, alive, since }
const perIp = new Map();      // địa chỉ IP -> số kết nối đang mở
let draining = false;         // đang tắt: không nhận phòng mới
let bytesOut = 0;            // byte thật đã gửi qua mạng (sau nén + khung WebSocket) của các kết nối đã đóng; đang mở: c.sock.bytesWritten
const wireOut = () => { let n = bytesOut; for (const c of clients) n += c.sock.bytesWritten; return n; };
const log = (entry, text) => console.log(`[room ${entry.code}] ${text}`);

/* ================= PHÒNG ================= */
// mã phòng: dài như mọi mã (net.codeLength), ký tự đầu trong net.server.codeFirst -> game nhận ra phòng máy chủ riêng
function newCode() {
  const chars = NET.codeChars, first = NET.server.codeFirst;
  for (;;) {
    let s = first[crypto.randomInt(first.length)];
    for (let i = 1; i < NET.codeLength; i++) s += chars[crypto.randomInt(chars.length)];
    if (!rooms.has(s)) return s;
  }
}

function out(c, data) {
  if (c.ws.readyState !== 1) return;
  if (c.ws.bufferedAmount > MAX_BUFFER) { c.ws.terminate(); return; }
  c.ws.send(data);
}

function createRoom() {
  const entry = { code: newCode(), clients: new Map(), touched: Date.now() };
  entry.room = new SFC.Room({
    // JSON 1 lần, phát cho mọi THÀNH VIÊN phòng (đã hello). Kết nối chưa được nhận vào phòng không nhận gì ngoài gói gửi riêng
    send: (msg, id) => {
      const data = JSON.stringify(msg);
      if (id != null) { const c = entry.clients.get(id); if (c) out(c, data); return; }
      for (const c of entry.clients.values()) if (entry.room.member(c.id)) out(c, data);
    },
    drop: (id) => { const c = entry.clients.get(id); if (c) c.ws.close(1000); },
    snapshotEvery: NET.server.snapshotEvery || 1,
    hooks: {
      start: (g) => { entry.ended = false; entry.startedAt = Date.now(); log(entry, `match started (${SFC.Room.Slots.mode(entry.room.lobby)}, ${entry.room.lobby.members.length} players)`); },
      toLobby: () => { if (entry.startedAt && !entry.ended) log(entry, 'match stopped before the end'); entry.startedAt = 0; },
      dropped: (name, away) => { if (away) log(entry, `a player disconnected, seat held ${NET.reconnectGrace}s`); },
      back: () => log(entry, 'a player reconnected'),
    },
  });
  rooms.set(entry.code, entry);
  log(entry, 'created');
  return entry;
}

// lỗi trong 1 phòng (bug mô phỏng / Core / AI...) -> chỉ đóng phòng đó, các phòng khác chạy tiếp
function roomFailed(entry, where, e) {
  console.error(`[room ${entry.code}] ${where} failed, closing room:`, e && e.stack || e);
  if (rooms.get(entry.code) === entry) closeRoom(entry, 'error');
}

// reason: idle | error | shutdown (phòng hết người thì leave() tự xoá + ghi log)
function closeRoom(entry, reason) {
  rooms.delete(entry.code);
  log(entry, `closed (${reason}, ${entry.clients.size} connected)`);
  for (const c of entry.clients.values()) { c.room = null; try { c.ws.send(JSON.stringify({ t: 'bye' })); c.ws.close(1000); } catch (e) { /* bỏ qua */ } }
  entry.clients.clear();
}

function attach(c, entry) {
  c.room = entry;
  c.since = Date.now();   // từ giờ phải được nhận vào phòng (hello) trong JOIN_TIMEOUT
  entry.clients.set(c.id, c);
  entry.touched = Date.now();
  c.ws.send(JSON.stringify({ t: 'room', code: entry.code, id: c.id }));
}

function leave(c) {
  const entry = c.room;
  if (!entry) return;
  c.room = null;
  entry.clients.delete(c.id);
  try { entry.room.gone(c.id); } catch (e) { roomFailed(entry, 'leave', e); return; }
  dropIfEmpty(entry);
}

// không còn kết nối nào và không ai đang chờ kết nối lại -> xoá phòng
function dropIfEmpty(entry) {
  if (entry.clients.size || entry.room.hasAway || rooms.get(entry.code) !== entry) return;
  rooms.delete(entry.code);
  log(entry, 'closed (empty)');
}

// địa chỉ người chơi: sau proxy / load balancer của nhà cung cấp thì lấy địa chỉ cuối trong X-Forwarded-For (do proxy ghi thêm)
function clientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) { const list = String(xff).split(',').map((s) => s.trim()).filter(Boolean); if (list.length) return list[list.length - 1]; }
  return req.socket.remoteAddress || '?';
}

/* ================= KẾT NỐI ================= */
const err = (c, e) => c.ws.send(JSON.stringify({ t: 'err', e }));

function handshake(c, msg) {
  if (msg.t === 'create') {
    if (msg.v !== NET.protocol) return err(c, 'version');
    if (draining) return err(c, 'server-closing');
    if (rooms.size >= ENV.MAX_ROOMS) return err(c, 'server-full');
    return attach(c, createRoom());
  }
  if (msg.t === 'join') {
    if (draining) return err(c, 'server-closing');
    const entry = rooms.get(String(msg.code || '').toUpperCase());
    if (!entry) return err(c, 'room-missing');
    if (msg.v !== NET.protocol) return err(c, 'version');
    return attach(c, entry);
  }
}

const server = http.createServer((req, res) => {
  if (req.url === '/healthz' || req.url === '/') {
    const matches = [...rooms.values()].filter((e) => e.room.status === 'playing').length;
    res.writeHead(draining ? 503 : 200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: !draining, rooms: rooms.size, matches, clients: wss.clients.size, protocol: NET.protocol }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server, maxPayload: 16 * 1024, perMessageDeflate: ENV.COMPRESSION ? DEFLATE : false });

wss.on('connection', (ws, req) => {
  const ip = clientIp(req), n = (perIp.get(ip) || 0) + 1;
  if (ENV.MAX_PER_IP && n > ENV.MAX_PER_IP) { ws.close(1008, 'too many connections'); return; }
  perIp.set(ip, n);
  const c = { id: 'c' + crypto.randomBytes(5).toString('hex'), ws, sock: req.socket, ip, room: null, msgs: 0, alive: true, since: Date.now() };
  clients.add(c);
  ws.on('pong', () => { c.alive = true; });
  ws.on('message', (raw) => {
    if (++c.msgs > ENV.MSG_RATE) { ws.close(1008, 'rate'); return; }
    let msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }
    if (!msg || typeof msg.t !== 'string') return;
    // giữ máy chủ thức (máy khách gửi mỗi net.server.keepAlive giây): không tính là phòng đang được dùng (LOBBY_TTL)
    if (msg.t === 'ka') return;
    if (!c.room) { handshake(c, msg); return; }
    const entry = c.room;
    entry.touched = Date.now();
    try { entry.room.onData(msg, c.id); } catch (e) { roomFailed(entry, `message "${msg.t}"`, e); return; }
    wake();
  });
  ws.on('close', () => {
    clients.delete(c);
    bytesOut += c.sock.bytesWritten;
    const left = (perIp.get(ip) || 1) - 1;
    if (left > 0) perIp.set(ip, left); else perIp.delete(ip);
    leave(c);
  });
  ws.on('error', () => {});
});

/* ================= VÒNG LẶP TRẬN ================= */
// chỉ chạy khi có ít nhất 1 trận đang đá; bước cố định 1/60 giây, bù trễ của bộ hẹn giờ
let loop = null, last = 0, acc = 0;
const anyActive = () => { for (const e of rooms.values()) if (e.room.active) return true; return false; };

function wake() {
  if (loop || !anyActive()) return;
  last = performance.now();
  acc = 0;
  loop = setTimeout(frame, 0);
}

function frame() {
  const now = performance.now();
  acc += Math.min(0.25, (now - last) / 1000);
  last = now;
  for (let n = 0; acc >= STEP && n < 5; n++) {
    acc -= STEP;
    for (const e of [...rooms.values()]) {
      const r = e.room;
      if (!r.active) continue;
      try {
        r.introClock(STEP);
        if (!r.introHold) r.step(STEP, null);
      } catch (err) { roomFailed(e, 'tick', err); continue; }
      if (r.endSent && !e.ended) {
        e.ended = true;
        const t = r.game.teams;
        log(e, `match ended ${t[0].score}-${t[1].score} after ${Math.round((Date.now() - e.startedAt) / 1000)}s`);
      }
    }
  }
  if (acc > STEP) acc = 0;   // tụt quá xa (máy bận) -> bỏ, không dồn bước
  if (!anyActive()) { loop = null; return; }
  loop = setTimeout(frame, Math.max(0, (STEP - acc) * 1000));
}

/* ================= BẢO TRÌ (1 lần / giây) ================= */
let sec = 0, idleFor = 0, lastBytes = 0;
setInterval(() => {
  sec++;
  const now = Date.now();
  for (const c of clients) {
    c.msgs = 0;   // giới hạn gói / giây
    // chưa tạo / vào phòng, hoặc vào rồi mà chưa được nhận (không hello / bị từ chối) quá JOIN_TIMEOUT -> ngắt
    // (phòng không còn ai thì tự xoá ở leave -> phòng tạo ra rồi bỏ đó không tồn tại quá JOIN_TIMEOUT)
    if (ENV.JOIN_TIMEOUT && (!c.room || !c.room.room.member(c.id)) && now - c.since > ENV.JOIN_TIMEOUT * 1000) { c.ws.close(1008, 'join timeout'); continue; }
    // ping 15 giây / lần: ai không trả lời lần trước thì ngắt
    if (sec % 15 === 0) {
      if (!c.alive) { c.ws.terminate(); continue; }
      c.alive = false;
      try { c.ws.ping(); } catch (e) { /* bỏ qua */ }
    }
  }
  // người mất kết nối quá net.reconnectGrace giây -> rời hẳn; phòng hết người thì xoá
  for (const e of [...rooms.values()]) {
    try { e.room.expire(now); } catch (err) { roomFailed(e, 'expire', err); continue; }
    dropIfEmpty(e);
  }
  // phòng không đá (phòng chờ / trận đã hết, mọi người ngồi ở màn kết quả) mà bỏ không quá lâu
  for (const e of [...rooms.values()]) if (!e.room.active && now - e.touched > ENV.LOBBY_TTL * 1000) closeRoom(e, 'idle');
  // không có ai -> thoát (tuỳ chọn)
  idleFor = clients.size || rooms.size ? 0 : idleFor + 1;
  if (ENV.IDLE_EXIT && idleFor >= ENV.IDLE_EXIT) { console.log('[server] idle, exiting'); process.exit(0); }
  if (ENV.LOG_STATS && sec % ENV.LOG_STATS === 0) {
    const matches = [...rooms.values()].filter((e) => e.room.status === 'playing').length;
    const wire = wireOut();
    console.log(`[stats] rooms=${rooms.size} matches=${matches} clients=${wss.clients.size} out=${((wire - lastBytes) / ENV.LOG_STATS / 1024).toFixed(1)}KB/s heap=${(process.memoryUsage().heapUsed / 1048576).toFixed(1)}MB`);
    lastBytes = wire;
  }
}, 1000).unref();

/* ================= TẮT ÊM (SIGTERM / SIGINT) ================= */
function shutdown(sig) {
  if (draining) return;
  draining = true;
  console.log(`[server] ${sig}: no new rooms, waiting for matches (max ${ENV.SHUTDOWN_GRACE}s)`);
  const deadline = Date.now() + ENV.SHUTDOWN_GRACE * 1000;
  const check = setInterval(() => {
    const playing = [...rooms.values()].some((e) => e.room.status === 'playing' && e.room.active);
    if (playing && Date.now() < deadline) return;
    clearInterval(check);
    for (const e of [...rooms.values()]) closeRoom(e, 'shutdown');
    server.close();
    setTimeout(() => process.exit(0), 300);
  }, 1000);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

server.listen(ENV.PORT, () => console.log(`[server] listening on :${ENV.PORT} · protocol ${NET.protocol}`));

module.exports = { rooms, ENV, shutdown, wireOut };
