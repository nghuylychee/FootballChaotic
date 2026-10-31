/* Kiểm tra phòng FOOTBALL STORY co-op (src/net/room.js, story): node server/test/story-test.js
 * 1. Mọi người cùng đội 0, tối đa số vị trí, không nhảy sang đội 1 (ghế GUEST = ghế dự bị để đổi vị trí), người thứ 4 bị từ chối (full)
 * 2. Gói lobby mang id Story (k) + trạng thái cup của host (c, hook cupState)
 * 3. Cut scene trước trận: cs gửi khách, chờ đủ csd
 * 4. startStory: trận đội 0 (người thật + đồng đội AI) vs đội của vòng, đá tới hết, CONTINUE -> phòng chờ kèm trạng thái cup mới
 * 5. Trận "gương" của khách (opts.mirror) không tự chạy luật trận (vật thể tới từ host)
 */
const assert = require('assert');
const { load } = require('../sim');

const { SFC } = load();
const NET = globalThis.SFC_CONFIG.net, ROLES = globalThis.SFC_CONFIG.game.roles;
const pf = (name, role) => ({ name, role, level: 1, look: {}, cores: null, mate: null });

function storyRoom() {
  const sent = [];
  let cup = { n: 'abc', id: 'ward_cup', round: 0 };
  const room = new SFC.Room({
    send: (m, id) => sent.push({ m: JSON.parse(JSON.stringify(m)), id }),
    drop: () => {},
    local: { id: 'host', pf: () => pf('HOST', 'FWD') },
    snapshotEvery: 2,
    story: 'ward_cup',
    hooks: { cupState: () => cup },
  });
  const S = SFC.Room.Slots, L = room.lobby;
  room.onData({ t: 'hello', v: NET.protocol, pf: pf('ANNA', 'FWD') }, 'a');
  room.onData({ t: 'hello', v: NET.protocol, pf: pf('BEN', 'DEF') }, 'b');
  assert.strictEqual(L.members.length, 3);
  assert.ok(L.members.every((m) => m.slot >= 0 && S.team(m.slot) === 0), 'everyone on the same team');
  assert.strictEqual(new Set(L.members.map((m) => S.role(m.slot))).size, ROLES.length, 'one player per position');
  room.onData({ t: 'hello', v: NET.protocol, pf: pf('CARL', 'MID') }, 'c');
  assert.ok(sent.some((x) => x.m.t === 'full' && x.id === 'c'), 'a fourth player is refused');
  const aSlot = room.member('a').slot;
  room.onData({ t: 'slot', s: S.of(1, 'FWD') }, 'a');
  assert.strictEqual(room.member('a').slot, aSlot, 'no other team in a story room');
  // ghế dự bị (user 2026-10-31): ngồi được để đổi vị trí khi phòng đủ người, rồi về ô cũ
  room.onData({ t: 'slot', s: -1 }, 'a');
  assert.strictEqual(room.member('a').slot, -1, 'bench seat to swap positions');
  room.onData({ t: 'slot', s: aSlot }, 'a');
  assert.strictEqual(room.member('a').slot, aSlot);
  room.onData({ t: 'begin', area: 0 }, 'host');
  assert.strictEqual(room.status, 'lobby', 'the normal START does nothing in a story room');
  const lob = sent.filter((x) => x.m.t === 'lobby').pop();
  assert.ok(lob && lob.m.k === 'ward_cup' && lob.m.c && lob.m.c.n === 'abc', 'lobby carries the story + cup state');
  console.log('1-2. seats + lobby: OK (one team, full at 3, story id + cup state in lobby)');

  // cut scene trước trận
  room.cueScenes('before');
  assert.ok(sent.some((x) => x.m.t === 'cs' && x.m.k === 'before'), 'guests are told to play the scene');
  assert.ok(room.scenesPending, 'host waits for the guests');
  room.onData({ t: 'csd' }, 'a');
  assert.ok(room.scenesPending, 'still waiting for B');
  room.onData({ t: 'csd' }, 'b');
  assert.ok(!room.scenesPending, 'everyone watched it');
  console.log('3. synced scenes: OK');

  // trận vòng 1/8 Ward Cup: 3 người thật, không cần đồng đội AI
  const rd = globalThis.SFC_CONFIG.stories.list[0].rounds[0];
  room.startStory({
    away: rd.team, mates: [],
    match: { difficulty: 'normal', aiProfile: SFC.MainPath.aiProfile(rd.elo), knockout: true, cup: { id: 'ward_cup', round: 0 }, mod: rd.mod, barks: rd.barks, score: rd.score },
  });
  assert.strictEqual(room.status, 'playing');
  const g = room.game;
  assert.strictEqual(g.teams[1].id, rd.team, 'opponent of the round');
  assert.strictEqual(g.seats.length, 3);
  assert.ok(g.seats.every((s) => s.team === 0), 'all seats on our team');
  assert.ok(g.mod && g.mod.id === rd.mod, 'pitch rule runs on the host');
  const starts = sent.filter((x) => x.m.t === 'start');
  assert.strictEqual(starts.length, 2);
  assert.ok(starts.every((x) => x.m.opts.cup && x.m.opts.cup.id === 'ward_cup'), 'guests get the cup round');
  for (const id of ['a', 'b']) room.onData({ t: 'intro' }, id);
  room.localIntroDone();
  let ticks = 0;
  while (room.active && ticks < 60 * 60 * 20) {
    if (ticks % 30 === 0) for (const id of ['a', 'b']) room.onData({ t: 'i', d: (Math.random() * 4096) | 0, p: (Math.random() * 4096) | 0 }, id);
    room.introClock(1 / 60);
    if (!room.introHold) room.step(1 / 60, null);
    ticks++;
  }
  assert.strictEqual(g.state, 'ended', 'match finishes');
  assert.ok(g.teams[0].score !== g.teams[1].score, 'knockout: someone wins');
  // host đi tiếp vòng (game làm), CONTINUE -> phòng chờ với trạng thái cup mới
  cup = { n: 'abc', id: 'ward_cup', round: 1 };
  room.backToLobby();
  const after = sent.filter((x) => x.m.t === 'lobby').pop();
  assert.strictEqual(room.status, 'lobby');
  assert.ok(after.m.c.round === 1, 'next lobby packet carries the new cup state');
  console.log(`4. match: OK (${g.teams[0].score}-${g.teams[1].score} vs ${g.teams[1].cfg.name}, back to the cup between matches)`);

  // người mới vào giữa 2 trận: nhận ghế còn trống (B rời trước)
  room.gone('b', true);
  room.onData({ t: 'hello', v: NET.protocol, pf: pf('DEV', 'MID') }, 'd');
  assert.ok(room.member('d') && S.team(room.member('d').slot) === 0, 'late joiner takes the free seat between matches');
}

function mirrorGame() {
  const rd = globalThis.SFC_CONFIG.stories.list[0].rounds[0];
  const base = { home: 'online_p1', away: rd.team, humanTeam: 0, difficulty: 'normal', noDraft: true, mod: rd.mod, cup: { id: 'ward_cup', round: 0 } };
  SFC.Room.registerClubs([{ name: 'X' }, { id: rd.team }]);
  const host = new SFC.Game(Object.assign({}, base));
  const mirror = new SFC.Game(Object.assign({}, base, { mirror: 1 }));
  const props = (gm) => (gm.effects.props ? Object.keys(gm.effects.props).length : (gm.mod.list || []).length);
  assert.ok(host.mod.list && host.mod.list.length > 0, 'host places the stools');
  assert.ok(mirror.mod && mirror.mod.mirror && !mirror.mod.list, 'mirror keeps the rule id only');
  assert.strictEqual(props(mirror), 0, 'mirror spawns no props of its own');
  console.log('5. guest mirror: OK (rule known for drawing, no local props)');
}

storyRoom();
mirrorGame();
console.log('OK');
