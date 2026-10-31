/* Kiểm tra phòng co-op (FOOTBALL STORY / GOAT PATH) trên máy chủ riêng (src/net/room.js "Phòng co-op trên máy chủ riêng"):
 * Room không có ghế local, máy giữ cup / run = chủ phòng (người tạo phòng, khách của Room). node server/test/coop-server-test.js
 * 1. Phòng Story: co{c} của chủ phòng -> gói lobby mang c (khách khác gửi co: bỏ qua) · cue -> cs cho người khác, xem xong -> csr cho
 *    chủ phòng · story{o}: lọc lại (luật trận / câu nói của đối thủ lấy từ config, trường lạ bỏ đi), Story khác phòng -> không vào trận ·
 *    co giữa trận: giữ lại, về phòng chờ mới gửi
 * 2. Phòng run: seat{r} đưa chủ phòng về vị trí trong run · ra của khách -> chuyển cho chủ phòng (kèm id + mã hồ sơ) · Skill game
 *    chạy được trên máy chủ (drills.js nạp ở máy chủ) · chỉ số / GEAR / chấn thương của ô đội hình qua lọc
 * 3. Chủ phòng mất kết nối giữa trận vẫn là chủ phòng, kết nối lại (id mới) vẫn là chủ phòng · chủ phòng rời = đóng phòng (hook close)
 */
const assert = require('assert');
const { load } = require('../sim');

const { SFC } = load();
const C = globalThis.SFC_CONFIG, NET = C.net;
const pf = (name, role, uid) => ({ name, role, level: 1, look: {}, cores: null, mate: null, uid });
const S = SFC.Room.Slots;

function room(o) {
  const sent = [], closed = [];
  const r = new SFC.Room(Object.assign({
    send: (m, id) => sent.push({ m: JSON.parse(JSON.stringify(m)), id }),
    drop: () => {},
    snapshotEvery: 2,
    hooks: { close: () => closed.push(1) },
  }, o));
  r.sent = sent;
  r.closed = closed;
  r.last = (t, id) => sent.filter((x) => x.m.t === t && (id === undefined || x.id === id)).pop();
  r.onData({ t: 'hello', v: NET.protocol, pf: pf('LEAD', 'FWD', 'leadlead1') }, 'L');
  r.onData({ t: 'hello', v: NET.protocol, pf: pf('ANNA', 'MID', 'annaanna1') }, 'a');
  return r;
}

function storyRoom() {
  const s = C.stories.list.find((x) => !x.soon), rd = s.rounds[0];
  const r = room({ story: s.id });
  assert.strictEqual(r.lobby.owner, 'L', 'creator owns the room');
  r.onData({ t: 'co', c: { n: 'abc', id: s.id, round: 0 } }, 'L');
  assert.strictEqual(r.last('lobby').m.c.n, 'abc', 'lobby carries the cup state the lead sent');
  r.onData({ t: 'co', c: { n: 'evil' } }, 'a');
  assert.strictEqual(r.coopState.n, 'abc', 'only the lead can set the cup state');

  r.onData({ t: 'cue', k: 'before' }, 'L');
  assert.ok(r.last('cs') && r.last('cs').m.k === 'before', 'scenes cued for the room');
  assert.ok(!r.last('csr'), 'still waiting for the guest');
  r.onData({ t: 'csd' }, 'a');
  assert.strictEqual(r.last('csr').id, 'L', 'lead told everyone has seen the scene');
  r.onData({ t: 'cue', k: 'drop tables' }, 'L');
  assert.strictEqual(r.sent.filter((x) => x.m.t === 'cs').length, 1, 'unknown scene kinds are ignored');

  // trận: trường lạ / luật trận giả bị bỏ, luật thật lấy từ config
  const bad = { away: rd.team, mates: [], match: { difficulty: 'normal', cup: { id: 'nope', round: 0 } } };
  r.onData({ t: 'story', o: bad }, 'L');
  assert.strictEqual(r.status, 'lobby', 'a cup from another Story never starts');
  r.onData({ t: 'story', o: { away: rd.team, mates: [], match: { cup: { id: s.id, round: 0 } } } }, 'a');
  assert.strictEqual(r.status, 'lobby', 'only the lead starts the match');
  r.onData({ t: 'story', o: {
    away: rd.team, mates: [{ name: 'MATE', ovr: 70, stats: { speed: 9 }, deck: [], look: {}, role: 'DEF' }],
    match: { difficulty: 'normal', aiProfile: { reaction: 0.3, evil: 'x' }, cup: { id: s.id, round: 0 }, mod: 'fake_mod', barks: ['HAX'], training: true, teamSize: [9, 9] },
  } }, 'L');
  assert.strictEqual(r.status, 'playing', 'lead starts the cup match');
  const o = r.startOpts;
  assert.strictEqual(o.mod, rd.mod || null, 'pitch rule comes from config');
  assert.deepStrictEqual(o.barks, rd.barks || null, 'barks come from config');
  assert.ok(!o.training && !o.teamSize, 'unknown fields dropped');
  assert.ok(o.aiProfile.reaction === 0.3 && !('evil' in o.aiProfile), 'AI profile keeps numbers only');
  assert.ok(o.mates[0][0].stats.speed <= 2.5, 'mate stats clamped');
  assert.strictEqual(r.game.seats.length, 2, 'both players on the pitch');

  // co giữa trận: không gửi lobby (khách sẽ tưởng hết trận), chỉ giữ
  const nLobby = r.sent.filter((x) => x.m.t === 'lobby').length;
  r.onData({ t: 'co', c: { n: 'abc', id: s.id, round: 1 } }, 'L');
  assert.strictEqual(r.sent.filter((x) => x.m.t === 'lobby').length, nLobby, 'no lobby packet mid-match');
  r.onData({ t: 'toLobby' }, 'L');
  assert.strictEqual(r.status, 'lobby');
  assert.strictEqual(r.last('lobby').m.c.round, 1, 'back in the lobby with the new round');
  console.log('1. story room on the server: OK (cup state from the lead, scenes + csr, cleaned match opts)');
}

function runRoom() {
  const r = room({ run: true });
  r.onData({ t: 'hello', v: NET.protocol, pf: pf('BEN', 'DEF', 'benbenben') }, 'b');
  r.onData({ t: 'co', c: { n: 7 } }, 'L');
  assert.ok(r.last('lobby').m.rn === 1 && r.last('lobby').m.r.n === 7, 'lobby carries the run copy');
  r.onData({ t: 'slot', s: S.of(0, 'MID') }, 'L');
  assert.strictEqual(S.role(r.member('L').slot), 'FWD', 'lead cannot wander off its run position');
  r.onData({ t: 'seat', r: 'DEF' }, 'L');
  assert.strictEqual(S.role(r.member('L').slot), 'DEF', 'lead moves to its run position');
  assert.strictEqual(new Set(r.lobby.members.map((m) => m.slot)).size, 3, 'whoever stood there moved aside');
  r.onData({ t: 'seat', r: 'FWD' }, 'a');
  assert.strictEqual(S.role(r.member('L').slot), 'DEF', 'guests cannot move the lead');

  r.onData({ t: 'ra', a: 'vote', k: 'node', v: '0.1', junk: { x: 1 } }, 'a');
  const ra = r.last('ra');
  assert.ok(ra && ra.id === 'L', 'guest action goes to the lead');
  assert.deepStrictEqual([ra.m.a, ra.m.k, ra.m.v, ra.m.f, ra.m.u, ra.m.junk], ['vote', 'node', '0.1', 'a', 'annaanna1', undefined], 'action cleaned + who sent it');
  const n = r.sent.filter((x) => x.m.t === 'ra').length;
  r.onData({ t: 'ra', a: 'vote' }, 'L');
  assert.strictEqual(r.sent.filter((x) => x.m.t === 'ra').length, n, 'the lead does not get its own actions back');

  // Skill game 1 người trên máy chủ: chỉ A ra sân, chỉ số / GEAR / chấn thương của ô đội hình qua lọc
  const role = S.role(r.member('a').slot), school = Object.keys(C.cores.archetypes)[0];
  r.onData({ t: 'story', o: {
    away: C.run.acts[0].teams[0], mates: [], only: ['a', 'ghost'],
    seat: { [role]: { stats: { speed: 0.8 }, ovr: 61, inj: ['ankle', 'fake'], gearBoost: { [school]: 1, nope: 3 }, gearBias: { [school]: 2 } } },
    match: { difficulty: 'normal', drill: 'finish', drillSeed: 7, drillEase: 5, teamSize: [3, 3], run: { nonce: 'x', act: 0, node: '0.0', kind: 'skill' } },
  } }, 'L');
  const g = r.game;
  assert.ok(g && g.drill && g.drill.id === 'finish', 'skill game runs on the server');
  assert.strictEqual(g.seats.length, 1, 'one player on the pitch');
  assert.deepStrictEqual(r.startOpts.teamSize, SFC.Run.drillSize('finish'), 'team size from config');
  assert.strictEqual(r.startOpts.drillEase, 0.8, 'ease clamped');
  const p = g.seatPlayer(0);
  assert.ok(p.ovr === 61 && p.inj.length === 1 && p.inj[0] === 'ankle', 'seat run stats + real injuries only');
  assert.ok(p.gearBoost && p.gearBoost[school] === 1 && !('nope' in p.gearBoost), 'school GEAR kept, junk dropped');
  assert.ok(r.last('start', 'L').m.opts.watch === 1 && r.last('start', 'b').m.opts.watch === 1, 'lead + B watch');
  for (let i = 0; i < 60; i++) r.step(1 / 60, null);
  assert.ok(Array.isArray(r.last('s').m.s.sk), 'snapshots carry the skill game progress');
  console.log('2. run room on the server: OK (seat, ra forwarded to the lead, skill game + run stats on the server)');

  // chủ phòng mất kết nối giữa trận: vẫn là chủ phòng, kết nối lại bằng tok (id mới) vẫn là chủ phòng
  const tok = r.member('L').tok;
  r.gone('L');
  assert.strictEqual(r.lobby.owner, 'L', 'lead keeps the room while away');
  r.onData({ t: 'hello', v: NET.protocol, pf: pf('LEAD', 'FWD', 'leadlead1'), tok }, 'L2');
  assert.strictEqual(r.lobby.owner, 'L2', 'lead back under its new connection id');
  r.onData({ t: 'toLobby' }, 'L2');
  assert.strictEqual(r.status, 'lobby');
  r.gone('a');
  assert.strictEqual(r.closed.length, 0, 'a guest leaving keeps the room');
  r.gone('L2');
  assert.strictEqual(r.closed.length, 1, 'lead leaving closes the room');
  console.log('3. lead away / back / leaving: OK');
}

storyRoom();
runRoom();
console.log('OK');
