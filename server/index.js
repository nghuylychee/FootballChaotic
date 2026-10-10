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
  LOBBY_TTL: num(process.env.LOBBY_TTL, 1800),           // giây: phòng chờ không ai gửi gì quá lâu thì đóng
  MSG_RATE: num(process.env.MSG_RATE, 200),              // gói / giây / người, quá thì ngắt
  IDLE_EXIT: num(process.env.IDLE_EXIT, 0),              // giây không có ai -> thoát (nền tảng tự bật lại khi có người; 0 = tắt)
  SHUTDOWN_GRACE: num(process.env.SHUTDOWN_GRACE, 60),   // SIGTERM: chờ trận đang đá tối đa bấy nhiêu giây
  LOG_STATS: num(process.env.LOG_STATS, 0),              // giây giữa 2 dòng thống kê (0 = tắt)
};
const STEP = 1 / 60;
const MAX_BUFFER = 1 << 20;   // người chơi nhận chậm tới mức đọng 1 MB -> ngắt (khỏi phình bộ nhớ)

const rooms = new Map();      // mã phòng -> { code, room, clients: Map(id -> client), touched }
const clients = new Set();    // mọi kết nối: { id, ws, room, msgs, alive }
let draining = false;         // đang tắt: không nhận phòng mới
let bytesOut = 0;

/* ================= PHÒNG ================= */
function newCode() {
  const chars = NET.codeChars, n = NET.server.codeLength;
  for (;;) {
    let s = '';
    for (let i = 0; i < n; i++) s += chars[crypto.randomInt(chars.length)];
    if (!rooms.has(s)) return s;
  }
}

function out(c, data) {
  if (c.ws.readyState !== 1) return;
  if (c.ws.bufferedAmount > MAX_BUFFER) { c.ws.terminate(); return; }
  c.ws.send(data);
  bytesOut += data.length;
}

function createRoom() {
  const entry = { code: newCode(), clients: new Map(), touched: Date.now() };
  entry.room = new SFC.Room({
    // JSON 1 lần, phát cho mọi người trong phòng
    send: (msg, id) => {
      const data = JSON.stringify(msg);
      if (id != null) { const c = entry.clients.get(id); if (c) out(c, data); return; }
      for (const c of entry.clients.values()) out(c, data);
    },
    drop: (id) => { const c = entry.clients.get(id); if (c) c.ws.close(1000); },
    snapshotEvery: NET.server.snapshotEvery || 1,
  });
  rooms.set(entry.code, entry);
  return entry;
}

function closeRoom(entry) {
  rooms.delete(entry.code);
  for (const c of entry.clients.values()) { c.room = null; try { c.ws.send(JSON.stringify({ t: 'bye' })); c.ws.close(1000); } catch (e) { /* bỏ qua */ } }
  entry.clients.clear();
}

function attach(c, entry) {
  c.room = entry;
  entry.clients.set(c.id, c);
  entry.touched = Date.now();
  c.ws.send(JSON.stringify({ t: 'room', code: entry.code, id: c.id }));
}

function leave(c) {
  const entry = c.room;
  if (!entry) return;
  c.room = null;
  entry.clients.delete(c.id);
  entry.room.gone(c.id);
  if (!entry.clients.size) rooms.delete(entry.code);
}

/* ================= KẾT NỐI ================= */
const err = (c, e) => c.ws.send(JSON.stringify({ t: 'err', e }));

function handshake(c, msg) {
  if (msg.t === 'create') {
    if (msg.v !== NET.protocol) return err(c, 'version');
    if (draining || rooms.size >= ENV.MAX_ROOMS) return err(c, 'server-full');
    return attach(c, createRoom());
  }
  if (msg.t === 'join') {
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

const wss = new WebSocketServer({ server, maxPayload: 16 * 1024, perMessageDeflate: false });

wss.on('connection', (ws) => {
  const c = { id: 'c' + crypto.randomBytes(5).toString('hex'), ws, room: null, msgs: 0, alive: true };
  clients.add(c);
  ws.on('pong', () => { c.alive = true; });
  ws.on('message', (raw) => {
    if (++c.msgs > ENV.MSG_RATE) { ws.close(1008, 'rate'); return; }
    let msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }
    if (!msg || typeof msg.t !== 'string') return;
    if (!c.room) { handshake(c, msg); return; }
    c.room.touched = Date.now();
    c.room.room.onData(msg, c.id);
    wake();
  });
  ws.on('close', () => { clients.delete(c); leave(c); });
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
    for (const e of rooms.values()) {
      const r = e.room;
      if (!r.active) continue;
      r.introClock(STEP);
      if (!r.introHold) r.step(STEP, null);
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
    // ping 15 giây / lần: ai không trả lời lần trước thì ngắt
    if (sec % 15 === 0) {
      if (!c.alive) { c.ws.terminate(); continue; }
      c.alive = false;
      try { c.ws.ping(); } catch (e) { /* bỏ qua */ }
    }
  }
  // phòng chờ bỏ không quá lâu
  for (const e of [...rooms.values()]) if (e.room.status === 'lobby' && now - e.touched > ENV.LOBBY_TTL * 1000) closeRoom(e);
  // không có ai -> thoát (tuỳ chọn)
  idleFor = clients.size || rooms.size ? 0 : idleFor + 1;
  if (ENV.IDLE_EXIT && idleFor >= ENV.IDLE_EXIT) { console.log('[server] idle, exiting'); process.exit(0); }
  if (ENV.LOG_STATS && sec % ENV.LOG_STATS === 0) {
    const matches = [...rooms.values()].filter((e) => e.room.status === 'playing').length;
    console.log(`[stats] rooms=${rooms.size} matches=${matches} clients=${wss.clients.size} out=${((bytesOut - lastBytes) / ENV.LOG_STATS / 1024).toFixed(1)}KB/s heap=${(process.memoryUsage().heapUsed / 1048576).toFixed(1)}MB`);
    lastBytes = bytesOut;
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
    for (const e of [...rooms.values()]) closeRoom(e);
    server.close();
    setTimeout(() => process.exit(0), 300);
  }, 1000);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

server.listen(ENV.PORT, () => console.log(`[server] listening on :${ENV.PORT} · protocol ${NET.protocol}`));

module.exports = { rooms, ENV };
