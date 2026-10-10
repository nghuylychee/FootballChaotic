/* Kiểm tra máy chủ chịu lỗi / chống lạm dụng (chạy máy chủ ngay trong tiến trình này để cài lỗi giả vào 1 phòng):
 *  1. Lỗi trong 1 phòng (lúc mô phỏng / lúc xử lý gói) chỉ đóng phòng đó, phòng khác vẫn chạy
 *  2. Kết nối vào phòng mà không hello: không nhận snapshot, bị ngắt sau JOIN_TIMEOUT
 *  3. Kết nối không bắt tay / tạo phòng rồi bỏ đó: bị ngắt, phòng trống tự xoá
 *  4. Quá MAX_PER_IP kết nối từ 1 địa chỉ: kết nối thừa bị từ chối
 *  5. Phòng hết trận mà bỏ không quá LOBBY_TTL thì đóng · nhật ký phòng (tạo / bắt đầu / đóng)
 *  6. Đang tắt (SIGTERM): không nhận tạo / vào phòng, /healthz trả 503
 *  0. Mọi kiểu xin nén của trình duyệt (Chrome / Firefox / không xin) đều vào được, trình duyệt có xin thì được nén
 * node server/test/hardening-test.js
 */
const assert = require('assert');
const WebSocket = require('ws');

const PORT = 20000 + Math.floor(Math.random() * 20000);
Object.assign(process.env, { PORT: String(PORT), JOIN_TIMEOUT: '1', MAX_PER_IP: '6', LOBBY_TTL: '2' });
// nhật ký phòng: gom lại để kiểm, không in ra
const roomLog = [];
const origLog = console.log;
console.log = (...a) => { const s = a.join(' '); if (s.startsWith('[room ')) roomLog.push(s); else origLog(...a); };
const { rooms, shutdown } = require('../index.js');
const NET = globalThis.SFC_CONFIG.net;
const URL = `ws://localhost:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pf = (name, role) => ({ name, role, level: 1, look: {}, cores: null, mate: null });

function client() {
  const ws = new WebSocket(URL);
  const c = { ws, msgs: [], closed: null };
  ws.on('message', (d) => c.msgs.push(JSON.parse(d)));
  ws.on('close', (code) => { c.closed = code; });
  ws.on('error', () => {});
  c.send = (m) => ws.send(JSON.stringify(m));
  c.next = async (fn, ms = 4000) => {
    const end = Date.now() + ms;
    for (;;) {
      const i = c.msgs.findIndex(fn);
      if (i >= 0) return c.msgs.splice(i, 1)[0];
      if (Date.now() > end) throw new Error('timeout waiting for message');
      await sleep(10);
    }
  };
  c.open = new Promise((res) => ws.on('open', res));
  c.close = () => new Promise((res) => { if (c.closed != null) return res(); ws.once('close', res); ws.close(); });
  return c;
}
const waitClosed = async (c, ms = 4000) => { const end = Date.now() + ms; while (c.closed == null) { if (Date.now() > end) throw new Error('not closed'); await sleep(20); } return c.closed; };

// 2 người tạo + vào phòng, START, xem xong giới thiệu -> trận đang chạy
async function match(nameA, nameB) {
  const A = client(), B = client();
  await Promise.all([A.open, B.open]);
  A.send({ t: 'create', v: NET.protocol });
  const { code } = await A.next((m) => m.t === 'room');
  B.send({ t: 'join', code, v: NET.protocol });
  await B.next((m) => m.t === 'room');
  A.send({ t: 'hello', v: NET.protocol, pf: pf(nameA, 'FWD') });
  B.send({ t: 'hello', v: NET.protocol, pf: pf(nameB, 'DEF') });
  await A.next((m) => m.t === 'lobby' && m.m.length === 2);
  A.send({ t: 'begin', area: 0 });
  await B.next((m) => m.t === 'start');
  A.send({ t: 'intro' }); B.send({ t: 'intro' });
  await B.next((m) => m.t === 's');
  return { A, B, code };
}

// bắt tay WebSocket thô với 1 kiểu xin nén -> phần mở rộng máy chủ trả về, hoặc mã lỗi
function handshakeWith(ext) {
  const http = require('http');
  return new Promise((res) => {
    const headers = { Connection: 'Upgrade', Upgrade: 'websocket', 'Sec-WebSocket-Version': '13', 'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==' };
    if (ext) headers['Sec-WebSocket-Extensions'] = ext;
    const req = http.request({ port: PORT, path: '/', headers });
    req.on('upgrade', (r, sock) => { sock.destroy(); res({ ok: true, ext: r.headers['sec-websocket-extensions'] || '' }); });
    req.on('response', (r) => res({ ok: false, status: r.statusCode }));
    req.end();
  });
}

(async () => {
  // 0. trình duyệt xin nén khác nhau: Chrome kèm client_max_window_bits, Firefox / Safari không -> đều phải vào được
  for (const [name, offer] of [['Chrome', 'permessage-deflate; client_max_window_bits'], ['Firefox', 'permessage-deflate'], ['no compression', '']]) {
    const r = await handshakeWith(offer);
    assert.ok(r.ok, `${name} handshake refused (${r.status})`);
    if (offer) assert.ok(r.ext.startsWith('permessage-deflate'), `${name} gets compression`);
  }
  console.log('0. browser compression offers: OK (Chrome, Firefox, no compression)');

  const logged = [];
  const origError = console.error;
  console.error = (...a) => logged.push(a.join(' '));

  // 1a. lỗi lúc mô phỏng
  const r1 = await match('A1', 'B1'), r2 = await match('A2', 'B2');
  rooms.get(r1.code).room.game.update = () => { throw new Error('boom in tick'); };
  await r1.B.next((m) => m.t === 'bye');
  assert.ok(!rooms.has(r1.code), 'broken room is closed');
  assert.ok(rooms.has(r2.code), 'other room survives');
  r2.B.msgs.length = 0;
  await r2.B.next((m) => m.t === 's');
  assert.ok(logged.some((l) => l.includes(r1.code) && l.includes('boom in tick')), 'error is logged with the room code');
  // 1b. lỗi lúc xử lý gói
  rooms.get(r2.code).room.onData = () => { throw new Error('boom in message'); };
  r2.A.send({ t: 'i', d: 1, p: 0 });
  await r2.B.next((m) => m.t === 'bye');
  assert.ok(!rooms.has(r2.code), 'room with a failing message handler is closed');
  console.log('1. room errors: OK (only the failing room closes, error logged)');
  await Promise.all([r1.A, r1.B, r2.A, r2.B].map((c) => c.close()));

  // 2. vào phòng đang đá mà không hello: không nhận snapshot, bị ngắt
  const r3 = await match('A3', 'B3');
  const D = client();
  await D.open;
  D.send({ t: 'join', code: r3.code, v: NET.protocol });
  await D.next((m) => m.t === 'room');
  await sleep(500);
  assert.ok(!D.msgs.some((m) => m.t === 's'), 'non-member receives no snapshots');
  assert.strictEqual(await waitClosed(D, 3000), 1008, 'non-member is disconnected after JOIN_TIMEOUT');
  r3.B.msgs.length = 0;
  await r3.B.next((m) => m.t === 's');   // trận của 2 thành viên vẫn chạy
  console.log('2. non-member: OK (no snapshots, disconnected)');
  await Promise.all([r3.A, r3.B].map((c) => c.close()));

  // 3. không bắt tay / tạo phòng rồi bỏ đó
  const idle = client(), creator = client();
  await Promise.all([idle.open, creator.open]);
  creator.send({ t: 'create', v: NET.protocol });
  const { code } = await creator.next((m) => m.t === 'room');
  assert.ok(rooms.has(code));
  assert.strictEqual(await waitClosed(idle, 3000), 1008, 'no handshake -> disconnected');
  assert.strictEqual(await waitClosed(creator, 3000), 1008, 'created a room but never joined it -> disconnected');
  await sleep(50);
  assert.ok(!rooms.has(code), 'abandoned empty room is deleted');
  console.log('3. idle connections: OK (disconnected, empty room deleted)');

  // 4. giới hạn kết nối / IP (MAX_PER_IP = 6)
  await sleep(100);
  const many = Array.from({ length: 6 }, client);
  await Promise.all(many.map((c) => c.open));
  const extra = client();
  assert.strictEqual(await waitClosed(extra, 3000), 1008, '7th connection from the same IP is refused');
  assert.ok(many.every((c) => c.closed == null), 'the first 6 stay connected');
  await many[0].close();
  await sleep(100);
  const again = client();
  await again.open;
  await sleep(200);
  assert.strictEqual(again.closed, null, 'a slot frees up when a connection closes');
  console.log('4. per-IP limit: OK');
  await Promise.all([...many, again].map((c) => c.close()));
  await sleep(100);

  // 5. trận đã hết, mọi người ngồi ở màn kết quả -> đóng sau LOBBY_TTL (2 giây trong test)
  const r5 = await match('A5', 'B5');
  rooms.get(r5.code).room.endSent = true;   // giả như trận vừa hết
  // gói giữ thức (ka) vẫn đều đặn: không được tính là phòng đang dùng
  const ka = setInterval(() => { r5.A.send({ t: 'ka' }); r5.B.send({ t: 'ka' }); }, 300);
  await r5.B.next((m) => m.t === 'bye', 5000);
  clearInterval(ka);
  assert.ok(!rooms.has(r5.code), 'finished room left idle is closed');
  const mine = roomLog.filter((l) => l.includes(r5.code));
  assert.ok(mine.some((l) => l.includes('created')) && mine.some((l) => l.includes('match started (versus, 2 players)')) && mine.some((l) => l.includes('closed (idle')), 'room lifecycle is logged: ' + mine.join(' | '));
  assert.ok(roomLog.some((l) => l.includes(r1.code) && l.includes('closed (error')), 'failed room logged as closed (error)');
  assert.ok(roomLog.some((l) => l.includes('closed (empty)')), 'empty room logged');
  console.log('5. idle finished room + keep-alive + logging: OK');
  await Promise.all([r5.A, r5.B].map((c) => c.close()));

  // 6. đang tắt: trận đang đá được đá tiếp, nhưng không tạo / vào phòng mới
  const r6 = await match('A6', 'B6');
  shutdown('test');
  const late = client();
  await late.open;
  late.send({ t: 'create', v: NET.protocol });
  assert.strictEqual((await late.next((m) => m.t === 'err')).e, 'server-closing', 'create refused while shutting down');
  late.send({ t: 'join', code: r6.code, v: NET.protocol });
  assert.strictEqual((await late.next((m) => m.t === 'err')).e, 'server-closing', 'join refused while shutting down');
  const res = await fetch(`http://localhost:${PORT}/healthz`);
  assert.strictEqual(res.status, 503, 'health check reports draining');
  r6.B.msgs.length = 0;
  await r6.B.next((m) => m.t === 's');   // trận đang đá vẫn chạy
  console.log('6. shutdown: OK (running match continues, no new rooms or joins)');

  console.error = origError;
  console.log('OK');
  process.exit(0);
})().catch((e) => { console.error = console.log; console.error(e); process.exit(1); });
