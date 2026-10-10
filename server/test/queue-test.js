/* Kiểm tra tìm trận xếp hạng ở mức gói tin (máy chủ chạy trong tiến trình này, net.queue rút ngắn cho nhanh):
 *  1. 2 người tìm cùng lúc -> chung 1 phòng xếp hạng, đối đầu, mỗi người 1 đồng đội giả; start kèm ranked + Elo 2 đội đúng phía
 *  2. Tìm một mình -> solo (không bị ngắt vì JOIN_TIMEOUT khi đang chờ)
 *  3. unqueue / đóng kết nối -> rời hàng
 *  4. Ghép xong mà 1 người không vào phòng -> quá joinWait vào trận luôn, người chơi giả thế ghế
 *  5. Sai phiên bản -> err version · máy chủ hết chỗ -> solo
 *  6. Trận xếp hạng: không phòng chờ / chủ phòng; còn 1 người vẫn đá tiếp
 *  7. Matchmaker.lineup (3v3): 3 / 4 / 6 người -> Elo trung bình 2 đội cân nhau, vị trí không trùng trong đội, ghế trống = người chơi giả
 * node server/test/queue-test.js
 */
const assert = require('assert');
const WebSocket = require('ws');

const PORT = 20000 + Math.floor(Math.random() * 20000);
Object.assign(process.env, { PORT: String(PORT), JOIN_TIMEOUT: '1' });
const origLog = console.log;
console.log = (...a) => { if (!String(a[0]).startsWith('[room ')) origLog(...a); };
const { rooms, queue, ENV } = require('../index.js');
const NET = globalThis.SFC_CONFIG.net;
Object.assign(NET.queue, { gather: 1, aloneWait: [1.5, 1.5], joinWait: 2, maxWait: 30 });
const SFC = globalThis.SFC;
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
  c.next = async (fn, ms = 6000) => {
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

// vào hàng chờ với Elo / vị trí
async function search(name, elo, role) {
  const c = client();
  await c.open;
  c.send({ t: 'queue', v: NET.protocol, elo, role, pf: pf(name, role) });
  await c.next((m) => m.t === 'queued');
  c.name = name;
  return c;
}

// ghép xong -> vào phòng (hello) -> start
async function enter(c) {
  c.room = await c.next((m) => m.t === 'room');
  c.send({ t: 'hello', v: NET.protocol, pf: pf(c.name, 'FWD') });
  return c;
}

(async () => {
  // 1. 2 người
  const A = await search('ALICE', 300, 'FWD');
  const B = await search('BOB', 380, 'FWD');
  await Promise.all([enter(A), enter(B)]);
  assert.strictEqual(A.room.code, B.room.code, 'both players are put in the same room');
  assert.ok(NET.server.codeFirst.includes(A.room.code[0]), 'ranked rooms use normal server room codes');
  const [sa, sb] = await Promise.all([A.next((m) => m.t === 'start'), B.next((m) => m.t === 'start')]);
  for (const s of [sa, sb]) {
    assert.ok(s.opts.ranked, 'start is marked ranked');
    assert.strictEqual(s.opts.seats.length, 2, 'two human seats');
  }
  assert.notStrictEqual(sa.opts.me, sb.opts.me);
  const ta = sa.opts.seats[sa.opts.me].team, tb = sb.opts.seats[sb.opts.me].team;
  assert.notStrictEqual(ta, tb, 'two players face each other');
  assert.deepStrictEqual([sa.opts.mainPath.myElo, sa.opts.mainPath.oppElo], [sb.opts.mainPath.oppElo, sb.opts.mainPath.myElo], 'team Elo is mirrored');
  assert.strictEqual(sa.opts.seats[sa.opts.me].avatar.elo, 300, 'seat carries the player Elo');
  for (const t of [0, 1]) {
    const m = sa.opts.mates[t];
    const n = globalThis.SFC_CONFIG.game.roles.length - 1;   // 1 người thật mỗi đội -> các vị trí còn lại là người chơi giả
    assert.ok(Array.isArray(m) && m.length === n && m.every((x) => x.fake && x.elo >= 0), `team ${t} fills its empty seats with AI players shown as players`);
  }
  assert.ok(!sa.opts.lobby && !A.msgs.some((m) => m.t === 'lobby'), 'no lobby packets in ranked rooms');
  A.send({ t: 'intro' }); B.send({ t: 'intro' });
  await A.next((m) => m.t === 's');
  assert.strictEqual(queue.size, 0, 'queue empty after the match is made');
  console.log('1. two searching players: OK (same room, opposite teams, AI teammates, mirrored team Elo)');

  // 6. không phòng chờ / chủ phòng; còn 1 người vẫn đá
  const room = rooms.get(A.room.code).room;
  A.send({ t: 'toLobby' }); A.send({ t: 'slot', s: 3 });
  await sleep(100);
  assert.strictEqual(room.status, 'playing', 'ranked rooms ignore owner controls');
  B.send({ t: 'bye' });
  await A.next((m) => m.t === 'drop');
  await sleep(100);
  assert.strictEqual(room.status, 'playing', 'match goes on with one player left (AI takes the seat)');
  console.log('6. ranked room rules: OK (no owner controls, match continues when a player leaves)');
  await Promise.all([A.close(), B.close()]);

  // 2. một mình -> solo (JOIN_TIMEOUT = 1 giây không ngắt người đang chờ)
  const C = await search('CAROL', 500, 'DEF');
  await C.next((m) => m.t === 'solo', 5000);
  assert.strictEqual(C.closed, null, 'waiting in the queue is not a join timeout');
  assert.strictEqual(queue.size, 0);
  await C.close();
  console.log('2. alone: OK (solo after aloneWait, not disconnected while waiting)');

  // 3. rời hàng
  const D = await search('DAVE', 500, 'DEF');
  assert.strictEqual(queue.size, 1);
  D.send({ t: 'unqueue' });
  await sleep(100);
  assert.strictEqual(queue.size, 0, 'unqueue removes the ticket');
  await D.close();
  const E = await search('ERIN', 500, 'DEF');
  await E.close();
  await sleep(100);
  assert.strictEqual(queue.size, 0, 'closing the connection removes the ticket');
  console.log('3. leave queue: OK (unqueue / disconnect)');

  // 4. 1 người không vào phòng
  const F = await search('FRANK', 700, 'FWD');
  const G = await search('GRACE', 720, 'DEF');
  await enter(F);
  await G.next((m) => m.t === 'room');   // G không hello
  const sf = await F.next((m) => m.t === 'start', 6000);
  assert.strictEqual(sf.opts.seats.length, 1, 'only the player who joined has a seat');
  const other = 1 - sf.opts.seats[0].team;
  assert.ok(Array.isArray(sf.opts.mates[other]) && sf.opts.mates[other].length === globalThis.SFC_CONFIG.game.roles.length && sf.opts.mates[other].every((m) => m.fake),
    'the missing player is replaced by an AI player');
  console.log('4. no-show: OK (match starts after joinWait, AI fills the seat)');
  await Promise.all([F.close(), G.close()]);

  // 5. sai phiên bản / máy chủ hết chỗ
  const H = client();
  await H.open;
  H.send({ t: 'queue', v: NET.protocol - 1, elo: 0, role: 'FWD', pf: pf('HANK', 'FWD') });
  assert.strictEqual((await H.next((m) => m.t === 'err')).e, 'version');
  await H.close();
  const max = ENV.MAX_ROOMS;
  ENV.MAX_ROOMS = 0;
  const I = client();
  await I.open;
  I.send({ t: 'queue', v: NET.protocol, elo: 0, role: 'FWD', pf: pf('IVY', 'FWD') });
  await I.next((m) => m.t === 'solo');
  ENV.MAX_ROOMS = max;
  await I.close();
  console.log('5. version / full: OK (err version, solo when the server is full)');

  // 7. lineup 3 / 4 / 6 người (3v3)
  const MM = SFC.Matchmaker, now = Date.now(), roles = globalThis.SFC_CONFIG.game.roles;
  const t = (id, elo, role, ago) => ({ id, elo, role, pf: pf(id, role), at: now - ago });
  const avgT = (L, team) => {
    const e = L.seats.filter((s) => s.team === team).map((s) => s.elo).concat(L.fakes[team].map((f) => f.elo));
    return e.reduce((a, b) => a + b, 0) / e.length;
  };
  // (Elo người giả kẹp trong ±range[1] quanh đồng đội: chọn Elo đủ gần để cân được)
  const L3 = MM.lineup([t('a', 700, 'FWD', 3000), t('b', 600, 'FWD', 2000), t('c', 500, 'FWD', 1000)]);
  assert.strictEqual(L3.fakes[0].length + L3.fakes[1].length, roles.length * 2 - 3, '3 players + AI in every empty seat');
  assert.ok(Math.abs(avgT(L3, 0) - avgT(L3, 1)) <= 1, '3 players: team Elo balanced');
  const L4 = MM.lineup([t('a', 900, 'FWD', 4000), t('b', 600, 'FWD', 3000), t('c', 500, 'FWD', 2000), t('d', 100, 'FWD', 1000)]);
  for (const team of [0, 1]) {
    const rs = L4.seats.filter((s) => s.team === team).map((s) => s.role).concat(L4.fakes[team].map((f) => f.role));
    assert.deepStrictEqual(rs.slice().sort(), roles.slice().sort(), 'roles do not clash within a team, every role filled');
  }
  assert.deepStrictEqual(L4.seats.filter((s) => s.team === 0).map((s) => s.id).sort(), ['a', 'd'], '4 players: best + worst vs the middle two');
  assert.ok(Math.abs(avgT(L4, 0) - avgT(L4, 1)) <= 1, '4 players: team Elo balanced');
  const L6 = MM.lineup(['a', 'b', 'c', 'd', 'e', 'f'].map((id, i) => t(id, 300 + i * 50, roles[i % roles.length], 6000 - i * 1000)));
  assert.deepStrictEqual(L6.fakes, [[], []], '6 players: no AI');
  for (const team of [0, 1]) assert.strictEqual(L6.seats.filter((s) => s.team === team).length, roles.length, '6 players: full teams');
  console.log('7. lineups: OK (3, 4 and 6 players balanced, roles resolved)');

  console.log('OK');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
