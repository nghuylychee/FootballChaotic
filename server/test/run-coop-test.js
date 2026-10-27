/* Kiểm tra GOAT PATH co-op (src/net/room.js run + src/meta/run.js co-op): node server/test/run-coop-test.js
 * 1. Phòng run: cả phòng đội 0, gói lobby mang rn + bản sao run (hook runState), khách gửi ra -> hook runAction, host đứng đúng vị trí
 * 2. Skill game 1 người: only = [id] -> người đó ra sân, người còn lại nhận start{watch} (me = -1); host không ra sân thì chỉ xem
 * 3. Run co-op: khách ngồi vào ô đồng đội AI, ví riêng, bộ 3 BADGE riêng sau trận thắng, gắn BADGE cho ai cũng được
 * 4. Bỏ phiếu: đủ phiếu thì chốt, lựa chọn bốc theo số phiếu, phiếu không hợp lệ bị bỏ; Shop đóng khi mọi người xong
 * 5. Bản sao khách: Run.run = bản sao, ghi kết quả không đụng run thật; rời phòng -> run riêng của khách trở lại
 */
const assert = require('assert');
const { load } = require('../sim');

const { SFC } = load();
// Skill game + chấn thương chỉ nạp ở bản game (phòng run luôn do người chơi làm host) -> test tự nạp
for (const f of ['src/systems/drills.js', 'src/systems/hurt.js']) require('vm').runInThisContext(require('fs').readFileSync(require('path').join(__dirname, '../..', f), 'utf8'), { filename: f });
const NET = globalThis.SFC_CONFIG.net, RC = globalThis.SFC_CONFIG.run;
const pf = (name, role, uid) => ({ name, role, level: 1, look: {}, cores: null, mate: null, uid });

function runRoom() {
  const sent = [], acts = [];
  let state = { n: 1 };
  const room = new SFC.Room({
    send: (m, id) => sent.push({ m: JSON.parse(JSON.stringify(m)), id }),
    drop: () => {},
    local: { id: 'host', pf: () => pf('HOST', 'FWD', 'hosthost1') },
    snapshotEvery: 2,
    run: true,
    hooks: { runState: () => state, runAction: (id, m) => acts.push({ id, m }) },
  });
  const S = SFC.Room.Slots, L = room.lobby;
  room.onData({ hello: 1, t: 'hello', v: NET.protocol, pf: pf('ANNA', 'FWD', 'annaanna1') }, 'a');
  room.onData({ t: 'hello', v: NET.protocol, pf: pf('BEN', 'DEF', 'benbenben') }, 'b');
  assert.ok(L.members.every((m) => S.team(m.slot) === 0), 'everyone on our team');
  const lob = sent.filter((x) => x.m.t === 'lobby').pop();
  assert.ok(lob.m.rn === 1 && lob.m.r && lob.m.r.n === 1, 'lobby carries the run copy');
  room.onData({ t: 'ra', a: 'vote', k: 'node', v: '0.1' }, 'a');
  assert.ok(acts.length === 1 && acts[0].id === 'a' && acts[0].m.a === 'vote', 'guest action reaches the host');
  room.onData({ t: 'slot', s: S.of(0, 'MID') }, 'host');
  assert.strictEqual(S.role(room.member('host').slot), 'FWD', 'host cannot wander off its run position');
  room.seatHost('DEF');
  assert.strictEqual(S.role(room.member('host').slot), 'DEF', 'host moves to its run position');
  assert.strictEqual(new Set(L.members.map((m) => m.slot)).size, 3, 'whoever stood there moved aside');
  room.onData({ t: 'begin', area: 0 }, 'host');
  assert.strictEqual(room.status, 'lobby', 'the normal START does nothing in a run room');
  console.log('1. run room: OK (one team, run copy in lobby, ra -> host, host seated on its run role)');

  // Skill game: chỉ A ra sân (bài 1 người), host + B xem
  const rd = globalThis.SFC_CONFIG.stories.list[0].rounds[0];
  sent.length = 0;
  room.startStory({
    away: rd.team, mates: [], only: ['a'], seat: { [S.role(room.member('a').slot)]: { stats: { speed: 0.8 }, ovr: 61, inj: ['ankle'] } },
    match: { difficulty: 'normal', aiProfile: SFC.MainPath.aiProfile(30), humanTeam: 0, drill: 'finish', drillSeed: 7, teamSize: [1, 1], noDraft: true,
      run: { nonce: 'x', act: 0, node: '0.0', kind: 'skill', drill: 'finish' } },
  });
  const g = room.game;
  assert.strictEqual(g.seats.length, 1, 'one player on the pitch');
  assert.strictEqual(g.me, -1, 'the host only watches');
  assert.strictEqual(g.humanTeam, 0, 'host still sees our team');
  assert.ok(g.drill && g.drill.id === 'finish', 'skill game runs on the host');
  const p = g.seatPlayer(0);
  assert.ok(p.inj && p.inj[0] === 'ankle' && p.ovr === 61, 'seat carries the run stats + injuries');
  const st = sent.filter((x) => x.m.t === 'start');
  assert.ok(st.some((x) => x.id === 'a' && x.m.opts.me === 0), 'the player gets a seat');
  assert.ok(st.some((x) => x.id === 'b' && x.m.opts.watch === 1 && x.m.opts.me === -1), 'the others watch');
  for (let i = 0; i < 60 * 3; i++) room.step(1 / 60, null);
  const snap = sent.filter((x) => x.m.t === 's').pop();
  assert.ok(snap && Array.isArray(snap.m.s.sk), 'snapshots carry the skill game progress');
  room.backToLobby();
  assert.strictEqual(room.watchIds.length, 0);
  console.log('2. one-player skill game: OK (seat for the player, watch for the rest, progress in snapshots)');
}

function runLogic() {
  const PF = SFC.Profile, Run = SFC.Run;
  PF.data = PF.sanitize(null);
  PF.data.name = 'HOST';
  const R = Run.start(null, 'FWD');
  R.actNew = false;
  // 2 khách vào: A đứng MID, B đứng DEF
  Run.syncRoom([{ key: 'annaanna1', name: 'ANNA', look: {}, role: 'MID' }, { key: 'benbenben', name: 'BEN', look: {}, role: 'DEF' }]);
  assert.deepStrictEqual(Run.keys(), ['host', 'annaanna1', 'benbenben']);
  assert.ok(R.squad.slice(1).every((s) => s.h), 'guests take the AI seats');
  assert.strictEqual(Run.memberName(Run.seatOf('annaanna1')), 'ANNA');
  assert.strictEqual(R.guests.annaanna1.cash, RC.cash.start, 'new wallet');

  // bỏ phiếu node: chưa đủ phiếu -> chưa chốt; phiếu sai bị từ chối
  const ids = Run.available().map((n) => n.id);
  assert.ok(!Run.castVote('annaanna1', 'node', 'nope'), 'invalid option refused');
  Run.castVote('host', 'node', ids[0]);
  Run.castVote('annaanna1', 'node', ids[0]);
  assert.ok(!Run.voteReady(Date.now()), 'waits for everyone');
  assert.ok(Run.voteReady(Date.now() + RC.coop.voteTime * 1000 + 1), 'or for the timer');
  Run.castVote('benbenben', 'node', ids[ids.length - 1]);
  assert.ok(Run.voteReady(), 'everyone voted');
  let wins = 0;
  for (let i = 0; i < 400; i++) {
    R.vote = { kind: 'node', t0: 0, ballots: { host: ids[0], annaanna1: ids[0], benbenben: ids[ids.length - 1] } };
    if (Run.voteRoll().v === ids[0]) wins++;
  }
  assert.ok(ids.length < 2 || (wins > 200 && wins < 340), `2 votes of 3 win about 2/3 of the time (${wins}/400)`);
  console.log('4a. votes: OK (wait for all or timer, weighted roll)');

  // thắng 1 trận: ví + bộ 3 riêng cho cả 3 người, không trùng nhau
  const r = Run.enter(ids[0]);
  assert.ok(r && r.play);
  const M = Run.match();
  const fake = { opts: { run: M.info }, humanTeam: 0, teams: [{ score: 2 }, { score: 0 }] };
  const before = [R.cash, R.guests.annaanna1.cash];
  Run.record('win', fake);
  assert.ok(R.cash > before[0] && R.guests.annaanna1.cash > before[1], 'everyone gets cash');
  const offers = Run.keys().map((k) => Run.pl(k).offer.ids).flat();
  assert.strictEqual(offers.length, 3 * RC.offer, 'everyone gets an own offer');
  assert.strictEqual(new Set(offers).size, offers.length, 'no badge offered twice');
  assert.deepStrictEqual(Run.busy().sort(), Run.keys().sort(), 'nobody moves on before picking');
  assert.strictEqual(Run.voteOptions('node').length, 0, 'map vote locked while picking');
  const pick = Run.pl('annaanna1').offer.ids[0];
  Run.pick(0, 'annaanna1');
  Run.assign(0, 'annaanna1');   // A gắn cho host
  assert.ok(R.bag.some((b) => b.id === pick && b.who === 0), 'a guest can put a badge on anyone');
  Run.pick(null, 'host'); Run.pick(null, 'benbenben');
  assert.strictEqual(Run.busy().length, 0);
  console.log('3. rewards: OK (own wallet + own offer each, badge on anyone)');

  // Shop: ai mua người nấy trả, đóng khi mọi người xong
  R.room = Run.openShop();
  R.guests.benbenben.cash = 999;
  const price = R.room.items[0].price, cashA = R.cash;
  assert.ok(Run.buy(0, 'benbenben'), 'guest buys');
  assert.strictEqual(R.cash, cashA, 'host wallet untouched');
  assert.ok(!Run.buy(0, 'host'), 'sold item gone for everyone');
  assert.strictEqual(R.guests.benbenben.cash, 999 - price);
  Run.assign(2, 'benbenben');
  Run.shopReady('host'); Run.shopReady('annaanna1');
  assert.ok(R.room, 'shop stays open until everyone is done');
  Run.shopReady('benbenben');
  assert.strictEqual(R.room, null, 'shop closes');
  console.log('4b. shop: OK (own wallet, shared stock, closes when all are done)');

  // Skill game xoay vòng
  const order = [Run.nextPlayer(R), Run.nextPlayer(R), Run.nextPlayer(R)];
  assert.strictEqual(new Set(order).size, 3, 'skill game turns rotate');
  // khách rời: không còn chờ phiếu của họ, ô trở lại AI
  Run.syncRoom([{ key: 'annaanna1', name: 'ANNA', look: {}, role: 'MID' }]);
  assert.deepStrictEqual(Run.keys(), ['host', 'annaanna1']);
  assert.ok(!R.squad.some((s) => s.h === 'benbenben'), 'left seat goes back to the AI');
  assert.ok(R.guests.benbenben && !R.guests.benbenben.on, 'wallet kept for when they come back');
  assert.ok(Run.coopScale(3).elo > 0 && Run.coopScale(3).statMul > 1 && Run.coopScale(1).statMul === 1, 'opponents scale with real players');

  // bản sao khách: Run.run = bản sao, run riêng không đụng tới
  const share = JSON.parse(JSON.stringify(Run.share()));
  const own = PF.data.run;
  Run.mirror(share);
  assert.ok(Run.run.mirror && Run.run !== own && Run.run.nonce === own.nonce, 'guest sees the copy');
  assert.strictEqual(Run.memberName(0), 'HOST', 'host drawn by its own name');
  const rec = Run.record('win', { opts: { run: { nonce: own.nonce, act: 0 } }, humanTeam: 0, teams: [{ score: 1 }, { score: 0 }] });
  assert.ok(rec && rec.mirror, 'copy does not record');
  Run.leaveMirror();
  assert.strictEqual(Run.run, own, 'own run is back after leaving');
  console.log('5. guest copy: OK');
}

runRoom();
runLogic();
console.log('OK');
