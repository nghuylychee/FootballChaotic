/* Kiểm tra người mất kết nối NGOÀI lúc đang đá (shared/net/room.js "Kết nối lại"), ở mức Room (không mạng). node server/test/away-test.js
 * 1. Phòng Story trên máy chủ riêng: khách mất kết nối ở phòng chờ -> giữ chỗ (lobby a = 1) · máy giữ vào trận -> khách vắng vẫn có ghế,
 *    AI đá thay từ đầu (drop ngay sau start, không có đồng đội AI trùng vị trí) · kết nối lại -> rj + start{resume} đúng ghế,
 *    opts.lobby có loại phòng + trạng thái cup
 * 2. Hết trận khi còn vắng: vẫn giữ chỗ · kết nối lại ở phòng chờ -> rj + lobby (hết a)
 * 3. Kết nối lại sau tiếng còi, trước khi về phòng chờ: chưa thấy hết trận -> start + gói snapshot cuối · đã thấy (end) -> không dựng lại trận
 * 4. Máy giữ mất kết nối ở phòng chờ: phòng không đóng, vẫn là chủ phòng; quay lại (id mới) vẫn là chủ phòng
 * 5. Quá hạn ở phòng chờ -> rời hẳn · bye -> rời ngay · phòng PRIVATE MATCH: chủ phòng vắng -> chủ phòng chuyển cho người đang có mặt
 * 6. Người chơi làm host: hook dropped(name, away) / back ở phòng chờ
 */
const assert = require('assert');
const { load } = require('../sim');

const { SFC } = load();
const C = globalThis.SFC_CONFIG, NET = C.net;
NET.reconnectGrace = 30;
const pf = (name, role, uid) => ({ name, role, level: 1, look: {}, cores: null, mate: null, uid });

function room(o, members = [['L', 'LEAD', 'FWD'], ['a', 'ANNA', 'MID']]) {
  const sent = [], closed = [], hooked = [];
  const r = new SFC.Room(Object.assign({
    send: (m, id) => sent.push({ m: JSON.parse(JSON.stringify(m)), id }),
    drop: () => {},
    snapshotEvery: 2,
    hooks: { close: () => closed.push(1), dropped: (n, away) => hooked.push(['dropped', n, away]), back: (n) => hooked.push(['back', n]) },
  }, o));
  Object.assign(r, { sent, closed, hooked });
  r.last = (t, id) => sent.filter((x) => x.m.t === t && (id === undefined || x.id === id)).pop();
  r.all = (t, id) => sent.filter((x) => x.m.t === t && (id === undefined || x.id === id));
  r.tok = {};
  for (const [id, name, role] of members) {
    r.onData({ t: 'hello', v: NET.protocol, pf: pf(name, role, `${name.toLowerCase()}uid1`) }, id);
    const y = r.last('you', id);
    if (y) r.tok[name] = y.m.tok;
  }
  return r;
}
const story = () => C.stories.list.find((x) => !x.soon);
// máy giữ dựng trận cup: đồng đội AI cho mọi vị trí (Room bỏ các vị trí đã có người, kể cả người đang vắng)
function kick(r) {
  const s = story(), rd = s.rounds[0];
  const mates = C.game.roles.map((role) => ({ name: `MATE ${role}`, ovr: 70, stats: {}, deck: [], look: {}, role }));
  r.onData({ t: 'story', o: { away: rd.team, mates, match: { difficulty: 'normal', cup: { id: s.id, round: 0 } } } }, r.lobby.owner);
  assert.strictEqual(r.status, 'playing', 'cup match started');
}
// hết trận (tiếng còi) rồi bước tới khi Room gửi snapshot cuối
function finish(r) {
  r.game.end();
  for (let i = 0; i < 10 && !r.endSent; i++) r.step(1 / 60, null);
  assert.ok(r.endSent, 'match ended');
}

// 1. vắng ở phòng chờ -> vào trận vẫn có ghế, AI đá thay -> quay lại đúng ghế
{
  const r = room({ story: story().id });
  r.onData({ t: 'co', c: { n: 'cup1', id: story().id, round: 0 } }, 'L');
  r.gone('a');
  assert.strictEqual(r.lobby.members.length, 2, 'away guest keeps their place in the lobby');
  const lob = r.last('lobby').m;
  assert.strictEqual(lob.m.find((x) => x.id === 'a').a, 1, 'lobby marks them away');
  assert.ok(!JSON.stringify(lob).includes(r.tok.ANNA), 'tokens never broadcast');
  assert.deepStrictEqual(r.hooked.pop(), ['dropped', 'ANNA', true]);

  kick(r);
  const g = r.game, seat = r.seatOf.a;
  assert.strictEqual(g.seats.length, 2, 'the away guest still has a seat');
  assert.ok(g.seats[seat].gone, 'AI plays that seat from kickoff');
  assert.ok(!r.remotes.a, 'no input expected from them');
  assert.ok(!r.all('start', 'a').length, 'no start sent to a dead connection');
  const drop = r.last('drop');
  assert.ok(drop && drop.m.seat === seat && drop.m.away > 0, 'everyone told the seat is AI-driven');
  const mid = C.game.roles.indexOf('MID');
  assert.ok(!g.teams[0].players.some((p) => p.name === 'MATE MID'), 'no duplicate AI mate on the away guest\'s position');
  assert.ok(g.teams[0].players[mid] && g.teams[0].players[mid].name === 'ANNA', 'their own character plays their position');
  assert.ok(!r.introWait.has('a'), 'intro does not wait for them');

  r.onData({ t: 'hello', v: NET.protocol, pf: pf('ANNA', 'MID', 'annauid1'), tok: r.tok.ANNA }, 'a2');
  assert.ok(r.last('rj', 'a2'), 'rejoined');
  const st = r.last('start', 'a2').m.opts;
  assert.ok(st.resume && st.me === seat, 'resume into their own seat');
  assert.strictEqual(st.lobby.k, story().id, 'resume carries the room kind');
  assert.strictEqual(st.lobby.c.n, 'cup1', 'resume carries the cup state');
  assert.ok(!g.seats[seat].gone && r.remotes.a2, 'seat back under player control');
  assert.strictEqual(r.last('back').m.seat, seat);
  console.log('1. away in the lobby: OK (place kept, seat AI-driven from kickoff, rejoin takes it back)');
}

// 2. vắng tới hết trận -> vẫn giữ chỗ, quay lại ở phòng chờ
{
  const r = room({ story: story().id });
  kick(r);
  r.gone('a');
  finish(r);
  r.onData({ t: 'toLobby' }, 'L');
  assert.strictEqual(r.status, 'lobby');
  assert.ok(r.member('a') && r.member('a').away, 'still held after the match');
  assert.strictEqual(r.last('lobby').m.m.find((x) => x.id === 'a').a, 1);
  r.onData({ t: 'hello', v: NET.protocol, pf: pf('ANNA', 'MID', 'annauid1'), tok: r.tok.ANNA }, 'a2');
  assert.ok(r.last('rj', 'a2'), 'rejoined in the lobby');
  const lob = r.last('lobby').m;
  assert.ok(lob.m.find((x) => x.id === 'a2') && !lob.m.some((x) => x.a), 'lobby shows them back');
  assert.ok(!r.all('start', 'a2').length, 'no match to resume');
  console.log('2. away through the final whistle: OK (kept, rejoins in the lobby)');
}

// 3. quay lại sau tiếng còi, trước khi về phòng chờ
{
  const r = room({ story: story().id });
  kick(r);
  r.gone('a');
  finish(r);
  const tok = r.tok.ANNA;
  r.onData({ t: 'hello', v: NET.protocol, pf: pf('ANNA', 'MID', 'annauid1'), tok }, 'a2');
  assert.ok(r.last('start', 'a2').m.opts.resume, 'a reopened game gets the match');
  const last = r.last('s', 'a2');
  assert.ok(last, 'and the final snapshot (result screen)');
  assert.strictEqual(last.m.f, r.lastPack.f);
  r.gone('a2');
  r.onData({ t: 'hello', v: NET.protocol, pf: pf('ANNA', 'MID', 'annauid1'), tok, end: 1 }, 'a3');
  assert.ok(r.last('rj', 'a3') && !r.all('start', 'a3').length, 'a game already on the result screen is not rebuilt');
  console.log('3. rejoin after the whistle: OK (final snapshot resent, or skipped when already seen)');
}

// 4. máy giữ vắng ở phòng chờ
{
  const r = room({ run: true });
  r.gone('L');
  assert.ok(!r.closed.length, 'room stays open while the lead is away');
  assert.strictEqual(r.lobby.owner, 'L', 'lead keeps the room');
  r.onData({ t: 'hello', v: NET.protocol, pf: pf('LEAD', 'FWD', 'leaduid1'), tok: r.tok.LEAD }, 'L2');
  assert.strictEqual(r.lobby.owner, 'L2', 'lead back under the new id');
  r.gone('L2');
  r.expire(Date.now() + 31000);
  assert.ok(r.closed.length, 'lead never back -> room closes');
  console.log('4. lead away in the lobby: OK (room held, still lead on return, closes on expiry)');
}

// 5. quá hạn / bye / chủ phòng PRIVATE MATCH vắng
{
  const r = room({ story: story().id });
  r.gone('a');
  r.expire(Date.now() + 31000);
  assert.ok(!r.member('a') && r.last('lobby').m.m.length === 1, 'expired -> removed');
  const p = room({}, [['A', 'ALICE', 'FWD'], ['B', 'BOB', 'DEF']]);
  p.onData({ t: 'bye' }, 'B');
  assert.ok(!p.member('B'), 'bye frees the place right away');
  const q = room({}, [['A', 'ALICE', 'FWD'], ['B', 'BOB', 'DEF']]);
  q.gone('A');
  assert.strictEqual(q.lobby.owner, 'B', 'owner away -> someone present can START');
  q.onData({ t: 'begin', area: 0 }, 'B');
  assert.strictEqual(q.status, 'playing', 'match starts with the away player AI-driven');
  assert.ok(q.game.seats[q.seatOf.A].gone);
  console.log('5. expiry / bye / private owner away: OK');
}

// 6. người chơi làm host: hook ở phòng chờ
{
  const r = room({ local: { id: 'host', pf: () => pf('HOSTY', 'FWD', 'hostuid1') } }, [['g', 'GUS', 'DEF']]);
  r.gone('g');
  assert.deepStrictEqual(r.hooked.pop(), ['dropped', 'GUS', true]);
  r.onData({ t: 'hello', v: NET.protocol, pf: pf('GUS', 'DEF', 'gusuid1'), tok: r.tok.GUS }, 'g');
  assert.deepStrictEqual(r.hooked.pop(), ['back', 'GUS']);
  assert.ok(!r.member('g').away);
  console.log('6. player-hosted lobby: OK (dropped / back hooks)');
}

console.log('OK');
process.exit(0);
