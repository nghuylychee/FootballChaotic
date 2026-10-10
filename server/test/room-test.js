/* Kiểm tra máy chủ riêng: node server/test/room-test.js (hoặc npm test trong server/)
 * 1. Room trong cùng tiến trình: 2 "khách" giả, đá hết 1 trận (tua nhanh), đo thời gian mô phỏng / snapshot
 * 2. WebSocket thật: bật server/index.js ở cổng ngẫu nhiên, 2 kết nối tạo + vào phòng, START, nhận snapshot ~3 giây,
 *    đo băng thông, người tạo phòng rời giữa trận -> người còn lại thành chủ phòng
 */
const assert = require('assert');
const path = require('path');
const { spawn } = require('child_process');
const WebSocket = require('ws');
const { load } = require('../sim');

const { SFC } = load();
const NET = globalThis.SFC_CONFIG.net;
const pf = (name, role) => ({ name, role, level: 1, look: {}, cores: null, mate: null });

function inProcessMatch() {
  const sent = { n: 0, bytes: 0, snaps: 0, types: {} };
  const room = new SFC.Room({
    send: (m) => { const s = JSON.stringify(m); sent.n++; sent.bytes += s.length; sent.types[m.t] = (sent.types[m.t] || 0) + 1; if (m.t === 's') sent.snaps++; },
    drop: () => {},
    snapshotEvery: NET.server.snapshotEvery,
  });
  room.onData({ t: 'hello', v: NET.protocol, pf: pf('ALICE', 'FWD') }, 'a');
  room.onData({ t: 'hello', v: NET.protocol, pf: pf('BOB', 'FWD') }, 'b');
  assert.strictEqual(room.lobby.owner, 'a', 'first player owns the room');
  assert.strictEqual(room.lobby.members.length, 2);
  room.onData({ t: 'begin', area: 0 }, 'b');
  assert.strictEqual(room.status, 'lobby', 'non-owner cannot start');
  room.onData({ t: 'begin', area: 99 }, 'a');
  assert.strictEqual(room.status, 'playing', 'owner starts');
  room.onData({ t: 'intro' }, 'a');
  room.onData({ t: 'intro' }, 'b');
  assert.ok(!room.introHold, 'intro released once everyone watched it');

  const STEP = 1 / 60;
  let ticks = 0, simNs = 0n;
  while (room.active && ticks < 60 * 60 * 20) {
    // phím ngẫu nhiên đổi mỗi ~0.5 giây
    if (ticks % 30 === 0) for (const id of ['a', 'b']) room.onData({ t: 'i', d: (Math.random() * 4096) | 0, p: (Math.random() * 4096) | 0 }, id);
    const t0 = process.hrtime.bigint();
    room.introClock(STEP);
    if (!room.introHold) room.step(STEP, null);
    simNs += process.hrtime.bigint() - t0;
    ticks++;
  }
  const g = room.game;
  assert.strictEqual(g.state, 'ended', 'match finishes');
  assert.ok(sent.types.start === 2 && sent.snaps > 0);
  const ms = Number(simNs) / 1e6 / ticks;
  console.log(`in-process: ${ticks} ticks (${(ticks / 3600).toFixed(1)} min), ${g.teams[0].score}-${g.teams[1].score}, ` +
    `${ms.toFixed(3)} ms/tick incl. snapshot JSON, ${(sent.bytes / sent.snaps).toFixed(0)} B/snapshot, ` +
    `~${(sent.bytes / (ticks / 60) / 1024).toFixed(1)} KB/s per player`);
  // hết trận: không gửi gì thêm
  const before = sent.n;
  room.step(STEP, null);
  assert.strictEqual(sent.n, before, 'idle after the final snapshot');
  room.onData({ t: 'toLobby' }, 'a');
  assert.strictEqual(room.status, 'lobby');
  // chủ phòng rời phòng chờ -> người còn lại thành chủ phòng
  room.gone('a');
  assert.strictEqual(room.lobby.owner, 'b');
}

function client(url) {
  const ws = new WebSocket(url);
  const c = { ws, msgs: [], bytes: 0, wait: null };
  ws.on('message', (data) => {
    c.bytes += data.length;
    const m = JSON.parse(data);
    c.msgs.push(m);
    if (c.wait && c.wait.fn(m)) { const w = c.wait; c.wait = null; w.res(m); }
  });
  c.send = (m) => ws.send(JSON.stringify(m));
  c.next = (fn, ms = 4000) => {
    const hit = c.msgs.find(fn);
    if (hit) { c.msgs = c.msgs.filter((x) => x !== hit); return Promise.resolve(hit); }
    return new Promise((res, rej) => { c.wait = { fn, res }; setTimeout(() => rej(new Error('timeout waiting for message')), ms); });
  };
  c.open = new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
  return c;
}

async function overWebSocket() {
  const port = 20000 + Math.floor(Math.random() * 20000);
  const proc = spawn(process.execPath, [path.join(__dirname, '..', 'index.js')], { env: Object.assign({}, process.env, { PORT: String(port) }), stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((res) => proc.stdout.once('data', res));
  const url = `ws://localhost:${port}`;
  try {
    const A = client(url), B = client(url), C = client(url);
    await Promise.all([A.open, B.open, C.open]);
    A.send({ t: 'create', v: NET.protocol });
    const room = await A.next((m) => m.t === 'room');
    assert.strictEqual(room.code.length, NET.codeLength);
    assert.ok(NET.server.codeFirst.includes(room.code[0]), 'server room codes start with a server character');
    B.send({ t: 'join', code: 'ZZZZZZ', v: NET.protocol });
    assert.strictEqual((await B.next((m) => m.t === 'err')).e, 'room-missing');
    B.send({ t: 'join', code: room.code, v: NET.protocol });
    const joined = await B.next((m) => m.t === 'room');
    A.send({ t: 'hello', v: NET.protocol, pf: pf('ALICE', 'FWD') });
    B.send({ t: 'hello', v: NET.protocol, pf: pf('BOB', 'DEF') });
    await B.next((m) => m.t === 'lobby' && m.m.length === 2);
    C.send({ t: 'join', code: room.code, v: NET.protocol });
    await C.next((m) => m.t === 'room');
    C.send({ t: 'hello', v: NET.protocol, pf: pf('CARA', 'FWD') });
    const lobby = await B.next((m) => m.t === 'lobby' && m.m.length === 3);
    assert.strictEqual(lobby.o, room.id, 'creator owns the room');
    A.send({ t: 'begin', area: 0 });
    await A.next((m) => m.t === 'start');
    await B.next((m) => m.t === 'start');
    A.send({ t: 'intro' });
    B.send({ t: 'intro' });
    C.send({ t: 'intro' });
    await B.next((m) => m.t === 's');
    const b0 = B.bytes, t0 = Date.now();
    await new Promise((r) => setTimeout(r, 3000));
    const snaps = B.msgs.filter((m) => m.t === 's').length;
    const kbs = (B.bytes - b0) / ((Date.now() - t0) / 1000) / 1024;
    console.log(`websocket: ${snaps} snapshots in 3 s (~${(snaps / 3).toFixed(0)}/s), ~${kbs.toFixed(1)} KB/s to one player`);
    assert.ok(snaps > 60, 'snapshots arrive at ~30/s');
    // người tạo phòng rời giữa trận (còn 2 người) -> AI đá thay, trận vẫn chạy, B thành chủ phòng
    A.ws.close();
    const drop = await B.next((m) => m.t === 'drop');
    assert.strictEqual(drop.o, joined.id, 'ownership moves to the next player');
    // chủ phòng mới đưa cả phòng về phòng chờ
    B.send({ t: 'toLobby' });
    const back = await C.next((m) => m.t === 'lobby' && m.m.length === 2);
    assert.strictEqual(back.o, joined.id);
    const health = await (await fetch(`http://localhost:${port}/healthz`)).json();
    assert.ok(health.ok && health.rooms === 1 && health.matches === 0);
    B.ws.close();
    C.ws.close();
  } finally {
    proc.kill('SIGTERM');
  }
}

(async () => {
  inProcessMatch();
  await overWebSocket();
  console.log('OK');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
