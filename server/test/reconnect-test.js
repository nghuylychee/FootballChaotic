/* Kiểm tra kết nối lại giữa trận ở mức gói tin (máy chủ chạy trong tiến trình này, net.reconnectGrace = 2 giây):
 *  1. Mất kết nối -> người khác nhận drop{away}; vào lại bằng tok -> start{resume} đúng slot, mọi người nhận back, snapshot chạy tiếp
 *  2. tok sai / hết hạn -> expired
 *  3. Quá hạn không quay lại -> rời hẳn (trận 2 người: về phòng chờ)
 *  4. Mọi kết nối cùng rớt: phòng vẫn giữ trong hạn, 1 người vào lại được
 *  5. bye (tự rời phòng) -> không giữ chỗ
 * node server/test/reconnect-test.js
 */
const assert = require('assert');
const WebSocket = require('ws');

const PORT = 20000 + Math.floor(Math.random() * 20000);
Object.assign(process.env, { PORT: String(PORT) });
const origLog = console.log;
console.log = (...a) => { if (!String(a[0]).startsWith('[room ')) origLog(...a); };
const { rooms } = require('../index.js');
const NET = globalThis.SFC_CONFIG.net;
NET.reconnectGrace = 2;
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

// vào phòng bằng mã: kết nối mới, join, hello (kèm tok nếu kết nối lại)
async function enter(code, name, role, tok) {
  const c = client();
  await c.open;
  c.send({ t: 'join', code, v: NET.protocol });
  c.room = await c.next((m) => m.t === 'room');
  c.send({ t: 'hello', v: NET.protocol, pf: pf(name, role), tok });
  return c;
}

async function match() {
  const A = client();
  await A.open;
  A.send({ t: 'create', v: NET.protocol });
  A.room = await A.next((m) => m.t === 'room');
  A.send({ t: 'hello', v: NET.protocol, pf: pf('ALICE', 'FWD') });
  A.tok = (await A.next((m) => m.t === 'you')).tok;
  const B = await enter(A.room.code, 'BOB', 'DEF');
  B.tok = (await B.next((m) => m.t === 'you')).tok;
  await A.next((m) => m.t === 'lobby' && m.m.length === 2);
  A.send({ t: 'begin', area: 0 });
  const start = await B.next((m) => m.t === 'start');
  B.seat = start.opts.me;
  A.send({ t: 'intro' }); B.send({ t: 'intro' });
  await B.next((m) => m.t === 's');
  return { A, B, code: A.room.code };
}

(async () => {
  // 1. rớt mạng rồi vào lại
  let { A, B, code } = await match();
  assert.ok(A.tok && B.tok && A.tok !== B.tok, 'each player gets a private token');
  B.ws.terminate();   // rớt mạng (không bye)
  const drop = await A.next((m) => m.t === 'drop');
  assert.strictEqual(drop.away, 2, 'others are told the seat is held');
  assert.strictEqual(rooms.get(code).room.lobby.members.length, 2, 'away player stays a member');
  const B2 = await enter(code, 'BOB', 'DEF', B.tok);
  const resume = await B2.next((m) => m.t === 'start');
  assert.ok(resume.opts.resume, 'start is marked as a resume');
  assert.strictEqual(resume.opts.me, B.seat, 'same seat as before');
  assert.strictEqual(resume.opts.lobby.m.length, 2, 'lobby info included');
  assert.ok(!JSON.stringify(resume).includes(B.tok), 'tokens are never broadcast');
  const back = await A.next((m) => m.t === 'back');
  assert.strictEqual(back.seat, B.seat);
  await B2.next((m) => m.t === 's');
  const g = rooms.get(code).room.game;
  assert.ok(!g.seats[B.seat].gone, 'seat is back under player control');
  console.log('1. drop + rejoin: OK (same seat, others notified, snapshots resume)');

  // 2. tok sai -> expired
  const X = await enter(code, 'EVE', 'FWD', 'not-a-token');
  await X.next((m) => m.t === 'expired');
  console.log('2. wrong token: OK (expired)');

  // 3. quá hạn -> rời hẳn, trận 2 người về phòng chờ
  B2.ws.terminate();
  await A.next((m) => m.t === 'drop' && m.away);
  A.msgs.length = 0;
  const lobby = await A.next((m) => m.t === 'lobby', 6000);
  assert.strictEqual(lobby.m.length, 1, 'expired player removed');
  assert.strictEqual(rooms.get(code).room.status, 'lobby', '2-player room goes back to lobby');
  const late = await enter(code, 'BOB', 'DEF', B.tok);
  // phòng đang ở phòng chờ: tok cũ bị bỏ qua, vào như người mới
  const fresh = await late.next((m) => m.t === 'lobby' && m.m.length === 2);
  assert.ok(fresh, 'after expiry the player can rejoin the lobby as a new member');
  console.log('3. expiry: OK (removed after grace, back to lobby, can rejoin the lobby normally)');
  await Promise.all([A, late, X].map((c) => c.close()));

  // 4. mọi kết nối cùng rớt: phòng giữ trong hạn
  ({ A, B, code } = await match());
  A.ws.terminate(); B.ws.terminate();
  await sleep(300);
  assert.ok(rooms.has(code), 'room kept while players are away');
  const A2 = await enter(code, 'ALICE', 'FWD', A.tok);
  assert.ok((await A2.next((m) => m.t === 'start')).opts.resume);
  await A2.next((m) => m.t === 's');
  await sleep(3300);   // B quá hạn (hạn 2 giây + vòng kiểm 1 giây / lần)
  assert.strictEqual(rooms.get(code).room.lobby.members.length, 1, 'the one who never came back is removed');
  await A2.close();
  await sleep(100);
  assert.ok(!rooms.has(code), 'room deleted once empty and nobody is away');
  console.log('4. everyone dropped: OK (room held, one rejoins, other expires, room cleaned up)');

  // 5. bye -> không giữ chỗ
  ({ A, B, code } = await match());
  A.msgs.length = 0;
  B.send({ t: 'bye' });
  const after = await A.next((m) => m.t === 'lobby');
  assert.strictEqual(after.m.length, 1, 'leaving on purpose frees the seat immediately');
  console.log('5. bye: OK (no seat held)');

  console.log('OK');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
