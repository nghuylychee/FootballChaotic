/* Máy chủ riêng cho trận online: HTTP (/healthz) + WebSocket trên cùng 1 cổng. Không phụ thuộc nhà cung cấp:
 * chỉ cần Node (hoặc Docker), cổng PORT và cho phép WebSocket. Phụ thuộc duy nhất: ws.
 * Mỗi phòng = 1 SFC.Room (src/net/room.js, cùng bản luật với người chơi làm host), không có ghế local.
 * Nhẹ: 1 vòng lặp 60 bước/giây chung cho mọi phòng, chỉ chạy khi có trận đang đá; snapshot JSON 1 lần rồi phát cho cả phòng.
 *
 * Bắt tay (xem src/net/transport-server.js): create{v} / join{code,v} -> room{code,id} | err{e}; sau đó gói đi thẳng vào Room.
 * Tìm trận xếp hạng: queue{v,elo,role,pf} -> queued (đã vào hàng, src/net/matchmaker.js ghép mỗi giây) -> room{code,id}
 * (phòng xếp hạng đã ghép xong; gửi hello như vào phòng thường) | solo (không ghép được: game tự đá với người chơi giả) | err{e}.
 * unqueue = rời hàng (đóng kết nối cũng vậy).
 * Biến môi trường: xem ENV bên dưới + server/README.md.
 */
const http = require('http');
const zlib = require('zlib');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const { load } = require('./sim');

const { SFC } = load();
const NET = globalThis.SFC_CONFIG.net;
// phiên bản máy chủ = server/package.json, dạng <net.protocol>.<minor>.<patch> (cũng là tag Docker image).
// Số đầu phải bằng net.protocol của bản game này -> sai thì không chạy (đóng gói nhầm config / quên tăng phiên bản)
const VERSION = require('./package.json').version;
if (+VERSION.split('.')[0] !== NET.protocol) {
  console.error(`[server] version ${VERSION} does not match net.protocol ${NET.protocol} (major must equal the protocol)`);
  process.exit(1);
}
// phiên bản game gửi trong gói bắt tay (cv): chỉ để ghi log
const cleanCv = (v) => (typeof v === 'string' ? v.replace(/[^\w.+-]/g, '').slice(0, 32) : '') || '?';

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
  COMPRESSION: num(process.env.COMPRESSION, 1),          // 1 = nén trong game cho máy khách xin z:1 (luồng chung của phòng: roomZ), 0 = tắt (so sánh khi đo tải)
  IDLE_CPU: num(process.env.IDLE_CPU, 300),             // giây không có trận nào -> ghi log CPU nền (0 = tắt)
};
const STEP = 1 / 60;
const MAX_BUFFER = 1 << 20;   // người chơi nhận chậm tới mức đọng 1 MB -> ngắt (khỏi phình bộ nhớ)

const rooms = new Map();      // mã phòng -> { code, room, clients: Map(id -> client), touched }
const clients = new Set();    // mọi kết nối: { id, ws, ip, room, ticket, msgs, alive, since }
const queue = new SFC.Matchmaker();   // hàng chờ trận xếp hạng (vé giữ kết nối: ticket.c)
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

// Nén trong game (gói nhị phân) — cách nén DUY NHẤT: không dùng permessage-deflate của WebSocket vì proxy của nhà cung cấp có thể
// bỏ đi (Render bỏ). Máy khách xin bằng z:1 ở gói đầu (create / join / queue).
// MỖI PHÒNG 1 luồng deflate-raw dùng chung (roomZ): gói phát cho cả phòng (snapshot, lobby, sự kiện...) nén 1 lần, cùng 1 chuỗi byte
// gửi cho mọi thành viên xin nén (trước đây mỗi người 1 luồng: phòng 6 người nén cùng 1 snapshot 6 lần). Luồng giữ ngữ cảnh giữa
// các gói (snapshot liên tiếp gần giống nhau -> ~1,1 KB còn ~0,1 KB). Mỗi gói = JSON + '\n', đẩy ra bằng Z_SYNC_FLUSH -> mỗi gói nhị phân
// = trọn vẹn 1 gói tin. Người mới nhận luồng (vào phòng / kết nối lại): Z_FULL_FLUSH ngay trước gói chung kế tiếp (không tham chiếu
// gì phía trước) -> người đó giải từ đó bằng DecompressionStream mới, người đang nhận không bị ảnh hưởng.
// Gói gửi riêng 1 người (room, you{tok}, start, pong, err, bye...) = JSON chữ thường, không nén (hiếm, nhỏ; you / start là riêng tư).
// Thứ tự: mọi gói của 1 phòng đi qua hàng đợi của phòng (sendQ) -> tới máy khách đúng thứ tự Room gửi; máy khách xử lý gói chữ
// và gói nhị phân theo đúng thứ tự nhận (src/net/transport-server.js). Cửa sổ 4 KB: ~48 KB / phòng.
const zWants = (c) => !!c.zip && !!ENV.COMPRESSION;
function roomZ(entry) {
  if (entry.z) return entry.z;
  const z = zlib.createDeflateRaw({ windowBits: 12, memLevel: 6, level: 6 });
  const parts = [];
  z.on('data', (b) => parts.push(b));
  // lỗi nén (không nên xảy ra): hàng đợi kẹt -> ngắt mọi người trong phòng (ngắt kết nối = leave -> phòng hết người tự xoá)
  z.on('error', (e) => {
    console.error(`[room ${entry.code}] compression failed:`, e && e.stack || e);
    entry.sendQ.length = 0;
    for (const c of entry.clients.values()) c.ws.terminate();
  });
  entry.z = { z, parts, synced: new Set() };   // synced: id kết nối đã nhận luồng từ 1 điểm FULL_FLUSH
  return entry.z;
}

// done(): gọi sau khi gói đã vào hàng gửi (đóng kết nối ngay sau gói cuối)
// dung lượng gửi đi của phòng (byte nội dung gói sau nén, chưa tính khung WebSocket / TLS): cả phòng + trận đang đá
const usage = (entry, n) => { if (entry) { entry.sent += n; entry.matchSent += n; } };
const kb = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(2)} MB` : `${(n / 1024).toFixed(1)} KB`);

// đo CPU (ghi log khi hết trận + lúc rảnh): tính bằng % của 1 nhân. Render free = 0.1 nhân -> biểu đồ CPU của Render ~ gấp 10.
// cpu = cả tiến trình (process.cpuUsage, gồm luồng nén zlib + GC + nhận gói) · sim = Room.step trừ phần gửi · send = luồng chính trong out()
const cpuPct = (from, ms) => { const u = process.cpuUsage(from); return ((u.user + u.system) / 1000 / Math.max(1, ms)) * 100; };
const pct = (ms, wall) => ((ms / Math.max(1, wall)) * 100).toFixed(1);
const sendTime = (entry, ms) => { if (entry) entry.sendMs += ms; };
// ai = thời gian SFC.AI.update (quyết định của mọi cầu thủ máy: bot + đồng đội AI), nằm trong sim. Bọc ở đây, không đụng code game
let ticking = null;   // phòng đang chạy bước mô phỏng
const aiUpdate = SFC.AI.update;
SFC.AI.update = function (dt, g) {
  const t0 = performance.now();
  try { return aiUpdate.call(this, dt, g); } finally { if (ticking) ticking.aiMs += performance.now() - t0; }
};

// gửi 1 khung tới 1 kết nối (chữ hoặc nhị phân), đếm dung lượng của phòng
function wire(c, entry, data, binary) {
  if (c.ws.readyState !== 1) return;
  if (c.ws.bufferedAmount > MAX_BUFFER) { c.ws.terminate(); return; }
  c.ws.send(data, binary ? { binary: true, compress: false } : undefined);
  usage(entry, binary ? data.length : Buffer.byteLength(data));
}

// hàng đợi gửi của phòng: việc gửi chạy đúng thứ tự gọi; nén (bất đồng bộ) chặn các việc sau tới khi xong
function enqueue(entry, job) {
  entry.sendQ.push(job);
  if (entry.sendQ.length === 1) drainQ(entry);
}
function drainQ(entry) {
  while (entry.sendQ.length) {
    const job = entry.sendQ[0], t0 = performance.now();
    const wait = job(() => { entry.sendQ.shift(); drainQ(entry); });
    sendTime(entry, performance.now() - t0);   // chỉ phần chạy trên luồng chính (chờ zlib không tính)
    if (wait) return;   // đang nén: callback của việc này chạy tiếp hàng đợi
    entry.sendQ.shift();
  }
}

// gói riêng 1 người (chữ, không nén). Trong phòng: qua hàng đợi của phòng (sau mọi gói chung gửi trước nó). done(): sau khi đã gửi
function out(c, data, done) {
  const entry = c.room;
  if (!entry) { wire(c, null, data, false); if (done) done(); return; }
  enqueue(entry, () => { wire(c, entry, data, false); if (done) done(); return false; });
}

// gói chung cho cả phòng (cac thành viên `to`): nén 1 lần cho mọi người xin nén, chữ cho người không xin
function broadcast(entry, data, to) {
  const t0 = performance.now();
  const zs = to.filter(zWants), plain = to.filter((c) => !zWants(c));
  enqueue(entry, (next) => {
    for (const c of plain) wire(c, entry, data, false);
    if (!zs.length) return false;
    const Z = roomZ(entry);
    // người mới nhận luồng -> điểm FULL_FLUSH trước gói này (ngắt mọi tham chiếu về phía trước)
    const fresh = zs.some((c) => !Z.synced.has(c.id));
    if (fresh) Z.z.flush(zlib.constants.Z_FULL_FLUSH);
    Z.z.write(data + '\n');
    Z.z.flush(zlib.constants.Z_SYNC_FLUSH, () => {
      const t1 = performance.now();
      if (Z.parts.length) {
        const buf = Z.parts.length === 1 ? Z.parts[0] : Buffer.concat(Z.parts);
        Z.parts.length = 0;
        for (const c of zs) { if (fresh) Z.synced.add(c.id); wire(c, entry, buf, true); }
      }
      sendTime(entry, performance.now() - t1);
      next();
    });
    return true;
  });
  // phần đồng bộ chạy bên trong Room.step -> sendSync để trừ ra khỏi sim
  const ms = performance.now() - t0;
  entry.sendSync += ms;
}

// ranked = đội hình trận xếp hạng (Matchmaker.lineup); không có = phòng thường (mã phòng, chủ phòng bấm START)
function createRoom(ranked) {
  const entry = { code: newCode(), clients: new Map(), touched: Date.now(), sent: 0, matchSent: 0, stepMs: 0, sendMs: 0, sendSync: 0, aiMs: 0, sendQ: [], z: null };
  const mode = () => (ranked ? 'ranked' : SFC.Room.Slots.mode(entry.room.lobby));
  entry.room = new SFC.Room({
    ranked,
    // JSON 1 lần, phát cho mọi THÀNH VIÊN phòng (đã hello), nén 1 lần (broadcast). Kết nối chưa được nhận vào phòng không nhận gì
    // ngoài gói gửi riêng (chữ)
    send: (msg, id) => {
      const data = JSON.stringify(msg);
      if (id != null) { const c = entry.clients.get(id); if (c) out(c, data); return; }
      const to = [];
      for (const c of entry.clients.values()) if (entry.room.member(c.id)) to.push(c);
      if (to.length) broadcast(entry, data, to);
    },
    drop: (id) => { const c = entry.clients.get(id); if (c) c.ws.close(1000); },
    snapshotEvery: NET.server.snapshotEvery || 1,
    hooks: {
      start: (g) => {
        entry.ended = false; entry.startedAt = Date.now(); entry.matchSent = 0;
        entry.cpu0 = process.cpuUsage(); entry.stepMs = entry.sendMs = entry.sendSync = entry.aiMs = 0;
        log(entry, `match started (${mode()}, ${entry.room.lobby.members.length} players)`); },
      toLobby: () => { if (entry.startedAt && !entry.ended) log(entry, `match stopped before the end · sent ${kb(entry.matchSent)}`); entry.startedAt = 0; },
      dropped: (name, away) => { if (away) log(entry, `a player disconnected, seat held ${NET.reconnectGrace}s`); },
      back: () => log(entry, 'a player reconnected'),
    },
  });
  rooms.set(entry.code, entry);
  log(entry, ranked ? `created (ranked, ${ranked.seats.length} players)` : 'created');
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
  log(entry, `closed (${reason}, ${entry.clients.size} connected) · sent ${kb(entry.sent)} in total`);
  // bye đi sau mọi gói đang chờ trong hàng đợi của phòng, rồi đóng kết nối
  for (const c of entry.clients.values()) out(c, JSON.stringify({ t: 'bye' }), () => { c.room = null; try { c.ws.close(1000); } catch (e) { /* bỏ qua */ } });
  enqueue(entry, () => { entry.clients.clear(); zclose(entry); return false; });
}

function attach(c, entry) {
  c.room = entry;
  c.since = Date.now();   // từ giờ phải được nhận vào phòng (hello) trong JOIN_TIMEOUT
  entry.clients.set(c.id, c);
  entry.touched = Date.now();
  out(c, JSON.stringify({ t: 'room', code: entry.code, id: c.id, sv: VERSION }));
  log(entry, `${ranked(entry) ? 'matched' : entry.clients.size === 1 ? 'opened by' : 'joined by'} client ${c.cv}`);
}

// hết phòng: bỏ luồng nén chung
function zclose(entry) { if (entry.z) { entry.z.z.close(); entry.z = null; } }

function leave(c) {
  const entry = c.room;
  if (!entry) return;
  c.room = null;
  entry.clients.delete(c.id);
  if (entry.z) entry.z.synced.delete(c.id);   // kết nối lại = kết nối mới (id mới) -> nhận lại từ 1 điểm FULL_FLUSH
  try { entry.room.gone(c.id); } catch (e) { roomFailed(entry, 'leave', e); return; }
  dropIfEmpty(entry);
}

// không còn kết nối nào và không ai đang chờ kết nối lại -> xoá phòng
function dropIfEmpty(entry) {
  if (entry.clients.size || entry.room.hasAway || rooms.get(entry.code) !== entry) return;
  rooms.delete(entry.code);
  zclose(entry);
  log(entry, `closed (empty) · sent ${kb(entry.sent)} in total`);
}

// địa chỉ người chơi: sau proxy / load balancer của nhà cung cấp thì lấy địa chỉ cuối trong X-Forwarded-For (do proxy ghi thêm)
function clientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) { const list = String(xff).split(',').map((s) => s.trim()).filter(Boolean); if (list.length) return list[list.length - 1]; }
  return req.socket.remoteAddress || '?';
}

/* ================= KẾT NỐI ================= */
const say = (c, msg) => out(c, JSON.stringify(msg));
const err = (c, e) => say(c, { t: 'err', e, sv: VERSION });
const ranked = (entry) => !!entry.room.ranked;
const busy = () => draining || rooms.size >= ENV.MAX_ROOMS;

function handshake(c, msg) {
  if (msg.z === 1) c.zip = true;   // xin nén: nhận gói chung của phòng qua luồng nén chung (broadcast)
  if (!c.cv) c.cv = cleanCv(msg.cv);
  if (msg.t === 'queue') {
    if (msg.v !== NET.protocol) return err(c, 'version');
    if (busy()) return say(c, { t: 'solo' });   // máy chủ bận / đang tắt: đá với người chơi giả, không báo lỗi
    if (c.ticket) return;
    const pf = SFC.Profile.sanitizePublic(msg.pf) || SFC.Profile.sanitizePublic({});
    const elo = Math.max(0, Math.min(1e6, Math.round(+msg.elo) || 0));
    c.ticket = queue.add({ id: c.id, c, elo, role: pf.role || msg.role, pf, at: Date.now() });
    return say(c, { t: 'queued' });
  }
  if (msg.t === 'unqueue') { unqueue(c); return; }
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

function unqueue(c) {
  if (!c.ticket) return;
  queue.remove(c.id);
  c.ticket = null;
}

// ghép hàng chờ (1 lần / giây): nhóm ghép xong -> 1 phòng xếp hạng, mọi người vào phòng (room{code,id}) rồi tự hello
function matchmake(now) {
  const { groups, solo } = queue.tick(now);
  for (const t of solo) { t.c.ticket = null; say(t.c, { t: 'solo' }); }
  for (const g of groups) {
    for (const t of g) t.c.ticket = null;
    if (busy()) { for (const t of g) say(t.c, { t: 'solo' }); continue; }
    let entry;
    try { entry = createRoom(SFC.Matchmaker.lineup(g)); } catch (e) {
      console.error('[queue] lineup failed:', e && e.stack || e);
      for (const t of g) say(t.c, { t: 'solo' });
      continue;
    }
    for (const t of g) if (t.c.ws.readyState === 1) attach(t.c, entry);
  }
}

const server = http.createServer((req, res) => {
  if (req.url === '/healthz' || req.url === '/') {
    const matches = [...rooms.values()].filter((e) => e.room.status === 'playing').length;
    // game đọc được từ trình duyệt (CORS): đo ping, bỏ qua máy chủ đầy, tìm trận ở máy chủ có người đang chờ (queue)
    res.writeHead(draining ? 503 : 200, { 'content-type': 'application/json', 'cache-control': 'no-store', 'access-control-allow-origin': '*' });
    res.end(JSON.stringify({
      ok: !draining, rooms: rooms.size, matches, clients: wss.clients.size, queue: queue.size,
      full: rooms.size >= ENV.MAX_ROOMS, protocol: NET.protocol, version: VERSION,
    }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server, maxPayload: 16 * 1024, perMessageDeflate: false });   // nén: roomZ (trong game)

wss.on('connection', (ws, req) => {
  const ip = clientIp(req), n = (perIp.get(ip) || 0) + 1;
  if (ENV.MAX_PER_IP && n > ENV.MAX_PER_IP) { ws.close(1008, 'too many connections'); return; }
  perIp.set(ip, n);
  const c = { id: 'c' + crypto.randomBytes(5).toString('hex'), ws, sock: req.socket, ip, room: null, ticket: null, msgs: 0, alive: true, since: Date.now() };
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
    // ping (đo độ trễ, mỗi giây) cũng không tính là phòng đang được dùng: phòng bỏ không vẫn đóng theo LOBBY_TTL
    if (msg.t !== 'ping') entry.touched = Date.now();
    try { entry.room.onData(msg, c.id); } catch (e) { roomFailed(entry, `message "${msg.t}"`, e); return; }
    wake();
  });
  ws.on('close', () => {
    clients.delete(c);
    bytesOut += c.sock.bytesWritten;
    const left = (perIp.get(ip) || 1) - 1;
    if (left > 0) perIp.set(ip, left); else perIp.delete(ip);
    unqueue(c);
    leave(c);
  });
  ws.on('error', () => {});
});

/* ================= VÒNG LẶP TRẬN ================= */
// chỉ chạy khi có ít nhất 1 trận đang đá; bước cố định 1/60 giây, bù trễ của bộ hẹn giờ
let loop = null, last = 0, acc = 0;
const anyActive = () => { for (const e of rooms.values()) if (e.room.active) return true; return false; };
const activeCount = () => { let n = 0; for (const e of rooms.values()) if (e.room.active) n++; return n; };

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
      const t0 = performance.now();
      ticking = e;
      try {
        r.introClock(STEP);
        if (!r.introHold) r.step(STEP, null);
      } catch (err) { roomFailed(e, 'tick', err); continue; } finally { ticking = null; }
      e.stepMs += performance.now() - t0;
      if (r.endSent && !e.ended) {
        e.ended = true;
        const t = r.game.teams;
        e.endedAt = Date.now();
        const secs = Math.max(1, Math.round((Date.now() - e.startedAt) / 1000)), players = e.clients.size || 1;
        const bots = r.game.players.length - r.seatIds.length;   // ghế không có người = máy điều khiển
        // cpu cả tiến trình: nhiều trận chạy cùng lúc thì gồm cả các trận kia (matches=)
        const wall = Date.now() - e.startedAt, sim = Math.max(0, e.stepMs - e.sendSync);
        log(e, `match ended ${t[0].score}-${t[1].score} after ${secs}s · sent ${kb(e.matchSent)} (${(e.matchSent / 1024 / secs / players).toFixed(2)} KB/s per player, ${players} connected)` +
          ` · cpu ${cpuPct(e.cpu0, wall).toFixed(1)}% of a core (sim ${pct(sim, wall)}% incl. ai ${pct(e.aiMs, wall)}% for ${bots} bots, send ${pct(e.sendMs, wall)}%, ${activeCount() - (r.active ? 1 : 0)} other matches running)`);
      }
    }
  }
  if (acc > STEP) acc = 0;   // tụt quá xa (máy bận) -> bỏ, không dồn bước
  if (!anyActive()) { loop = null; return; }
  loop = setTimeout(frame, Math.max(0, (STEP - acc) * 1000));
}

/* ================= BẢO TRÌ (1 lần / giây) ================= */
let sec = 0, idleFor = 0, lastBytes = 0, idleCpu = null;
setInterval(() => {
  sec++;
  const now = Date.now();
  for (const c of clients) {
    c.msgs = 0;   // giới hạn gói / giây
    // chưa tạo / vào phòng, hoặc vào rồi mà chưa được nhận (không hello / bị từ chối) quá JOIN_TIMEOUT -> ngắt
    // (phòng không còn ai thì tự xoá ở leave -> phòng tạo ra rồi bỏ đó không tồn tại quá JOIN_TIMEOUT). Đang trong hàng chờ: không tính
    if (ENV.JOIN_TIMEOUT && !c.ticket && (!c.room || !c.room.room.member(c.id)) && now - c.since > ENV.JOIN_TIMEOUT * 1000) { c.ws.close(1008, 'join timeout'); continue; }
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
  // trận xếp hạng không có phòng chờ: hết trận 2 phút là đóng (màn kết quả của mỗi người không cần phòng nữa)
  for (const e of [...rooms.values()]) {
    if (!e.room.active && now - e.touched > ENV.LOBBY_TTL * 1000) closeRoom(e, 'idle');
    else if (e.room.ranked && e.endedAt && now - e.endedAt > 120000) closeRoom(e, 'done');
  }
  try { matchmake(now); } catch (e) { console.error('[queue] failed:', e && e.stack || e); }
  wake();   // trận xếp hạng có thể vừa vào (expire: quá giờ chờ người vào phòng)
  // CPU nền lúc không có trận nào đang đá (ghi log mỗi IDLE_CPU giây không trận; có trận thì đếm lại từ đầu)
  if (!ENV.IDLE_CPU || anyActive()) idleCpu = null;
  else if (!idleCpu) idleCpu = { u: process.cpuUsage(), t: now };
  else if (now - idleCpu.t >= ENV.IDLE_CPU * 1000) {
    console.log(`[server] no match for ${Math.round((now - idleCpu.t) / 1000)}s · cpu ${cpuPct(idleCpu.u, now - idleCpu.t).toFixed(1)}% of a core (${clients.size} connected, ${rooms.size} rooms)`);
    idleCpu = { u: process.cpuUsage(), t: now };
  }
  // không có ai -> thoát (tuỳ chọn)
  idleFor = clients.size || rooms.size ? 0 : idleFor + 1;
  if (ENV.IDLE_EXIT && idleFor >= ENV.IDLE_EXIT) { console.log('[server] idle, exiting'); process.exit(0); }
  if (ENV.LOG_STATS && sec % ENV.LOG_STATS === 0) {
    const matches = [...rooms.values()].filter((e) => e.room.status === 'playing').length;
    const wire = wireOut();
    console.log(`[stats] rooms=${rooms.size} matches=${matches} queue=${queue.size} clients=${wss.clients.size} out=${((wire - lastBytes) / ENV.LOG_STATS / 1024).toFixed(1)}KB/s heap=${(process.memoryUsage().heapUsed / 1048576).toFixed(1)}MB`);
    lastBytes = wire;
  }
}, 1000).unref();

/* ================= TẮT ÊM (SIGTERM / SIGINT) ================= */
function shutdown(sig) {
  if (draining) return;
  draining = true;
  console.log(`[server] ${sig}: no new rooms, waiting for matches (max ${ENV.SHUTDOWN_GRACE}s)`);
  for (const c of clients) if (c.ticket) { unqueue(c); say(c, { t: 'solo' }); }
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

server.listen(ENV.PORT, () => console.log(`[server] v${VERSION} listening on :${ENV.PORT} · protocol ${NET.protocol}`));

module.exports = { rooms, queue, ENV, shutdown, wireOut };
