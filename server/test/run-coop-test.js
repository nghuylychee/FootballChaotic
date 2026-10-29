/* Kiểm tra GOAT PATH co-op (src/net/room.js run + src/meta/run.js co-op): node server/test/run-coop-test.js
 * 1. Phòng run: cả phòng đội 0, gói lobby mang rn + bản sao run (hook runState), khách gửi ra -> hook runAction, host đứng đúng vị trí
 * 2. Skill game 1 người: only = [id] -> người đó ra sân, người còn lại nhận start{watch} (me = -1); host không ra sân thì chỉ xem
 * 3. Run co-op: khách ngồi vào ô đồng đội AI, ví riêng, 1 bộ 3 BADGE của cả đội sau trận thắng (bỏ phiếu, 2026-10-28)
 * 4. Bỏ phiếu: đủ phiếu thì chốt, lựa chọn bốc theo số phiếu, phiếu không hợp lệ bị bỏ; Shop đóng khi mọi người xong
 * 5. Bản sao khách: Run.run = bản sao, ghi kết quả không đụng run thật; rời phòng -> run riêng của khách trở lại
 * 6. LEGEND: qua LEGEND TRIAL -> chọn ai trong đội nhận (lệch vị trí được, co-op bỏ phiếu); chỉ số + đồng đội vào trận mang LEGEND;
 *    khoảnh khắc LEGEND cộng chỉ số rồi trả lại; THẺ ĐỎ; BADGE của đội vào opts trận
 */
const assert = require('assert');
const { load } = require('../sim');

const { SFC } = load();
// Skill game + chấn thương chỉ nạp ở bản game (phòng run luôn do người chơi làm host) -> test tự nạp
for (const f of ['src/systems/drills.js', 'src/systems/hurt.js', 'src/systems/legends.js']) require('vm').runInThisContext(require('fs').readFileSync(require('path').join(__dirname, '../..', f), 'utf8'), { filename: f });
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

  // thắng 1 trận: ví riêng + 1 bộ 3 BADGE của cả đội, bỏ phiếu chọn
  const r = Run.enter(ids[0]);
  assert.ok(r && r.play);
  const M = Run.match();
  const fake = { opts: { run: M.info }, humanTeam: 0, teams: [{ score: 2 }, { score: 0 }] };
  const before = [R.cash, R.guests.annaanna1.cash];
  Run.record('win', fake);
  assert.ok(R.cash > before[0] && R.guests.annaanna1.cash > before[1], 'everyone gets cash');
  assert.strictEqual(R.offer.ids.length, RC.offer, 'one team offer');
  assert.strictEqual(new Set(R.offer.ids).size, RC.offer, 'no badge offered twice');
  assert.ok(Run.busy(), 'nobody moves on before the team picks');
  assert.strictEqual(Run.voteOptions('node').length, 0, 'map vote locked while picking');
  assert.ok(!Run.castVote('host', 'pick', '7'), 'invalid pick refused');
  const pick = R.offer.ids[1];
  for (const k of Run.keys()) Run.castVote(k, 'pick', '1');
  const res = Run.voteRoll();
  assert.ok(res.kind === 'pick' && res.v === '1');
  Run.pick(+res.v);
  assert.ok(R.bag.some((b) => b.id === pick && b.who == null), 'the voted badge goes to the whole team');
  assert.ok(!Run.busy() && !R.offer);
  console.log('3. rewards: OK (own wallet each, one team offer, picked by vote)');

  // Shop: ai mua người nấy trả, đóng khi mọi người xong
  R.room = Run.openShop();
  R.guests.benbenben.cash = 999;
  const price = R.room.items[0].price, cashA = R.cash;
  assert.ok(Run.buy(0, 'benbenben'), 'guest buys');
  assert.strictEqual(R.cash, cashA, 'host wallet untouched');
  assert.ok(!Run.buy(0, 'host'), 'sold item gone for everyone');
  assert.strictEqual(R.guests.benbenben.cash, 999 - price);
  assert.ok(Run.has(R.room.items[0].id), 'bought badge goes to the team bag');
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

// LEGEND (config/legends.config.js, src/systems/legends.js)
function legendLogic() {
  const PF = SFC.Profile, Run = SFC.Run, LG = globalThis.SFC_CONFIG.legends.list;
  PF.data = PF.sanitize(null);
  PF.data.name = 'HOST';
  const R = Run.start(null, 'FWD');
  R.actNew = false;
  Run.syncRoom([{ key: 'annaanna1', name: 'ANNA', look: {}, role: 'MID' }]);
  const mid = Run.roleIndex('MID'), def = Run.roleIndex('DEF');
  // node LEGEND trên map có sẵn LEGEND
  for (let a = 0; a < 3; a++) for (const fl of Run.genAct(R, a).floors) for (const n of fl) if (n.kind === 'legend') assert.ok(LG[n.legend], 'legend node carries a legend');
  // qua trial của Pirlow (MID): ai trong đội cũng nhận được, co-op bỏ phiếu (số thứ tự / no)
  const next = Run.available()[0];
  R.next = next.id;
  R.room = { kind: 'trial', legend: 'pirlow', drill: LG.pirlow.trial.drill, player: 'host' };
  const M = Run.match();
  assert.ok(M.trial === 'pirlow' && M.drill === LG.pirlow.trial.drill && M.info.kind === 'legend', 'trial match data');
  const base = Run.ratingsOf(mid).passing;
  Run.drillDone(R, 1);
  assert.deepStrictEqual(R.join, { id: 'pirlow' }, 'passed trial: legend asks to join');
  assert.ok(Run.busy(), 'map waits for the answer');
  assert.deepStrictEqual(Run.voteOptions('join'), ['0', '1', '2', 'no'], 'vote on who gets him');
  for (const k of Run.keys()) Run.castVote(k, 'join', String(mid));
  const jv = Run.voteRoll();
  Run.answerJoin(jv.v === 'no' ? null : +jv.v);
  assert.strictEqual(R.squad[mid].legend, 'pirlow');
  assert.strictEqual(Run.ratingsOf(mid).passing, base + LG.pirlow.stats.passing, 'legend stats apply');
  const back = Run.sanitize(JSON.parse(JSON.stringify(R)));
  assert.strictEqual(back.squad[mid].legend, 'pirlow', 'legend survives save / load');
  // lệch vị trí: Haalandroid (FWD) cho hậu vệ AI
  R.join = { id: 'haalandroid' };
  Run.answerJoin(def);
  assert.strictEqual(Run.mateSpecs().find((x) => x.role === 'DEF').legend, 'haalandroid', 'off-position legend goes into the match');
  assert.strictEqual(Run.sanitize(JSON.parse(JSON.stringify(R))).squad[def].legend, 'haalandroid', 'off-position legend survives save / load');
  R.join = { id: 'ramen' };
  assert.strictEqual(Run.answerJoin(null), null, 'NO THANKS');
  assert.ok(!R.join && R.squad[def].legend === 'haalandroid', 'declined: nothing changes');
  // trial hỏng: không có LEGEND, không chấn thương
  const n2 = Run.available()[0] || next;
  R.next = n2.id; R.room = { kind: 'trial', legend: 'kantay', drill: 'brawl', player: 'host' };
  const inj = Run.injuries().length;
  Run.drillDone(R, 0);
  assert.ok(!R.join && Run.injuries().length === inj, 'failed trial costs nothing');
  // trận: khoảnh khắc LEGEND cộng chỉ số rồi trả lại · THẺ ĐỎ
  const rd = globalThis.SFC_CONFIG.stories.list[0].rounds[0], MP = globalThis.SFC_CONFIG.mainPath;
  const g = new SFC.Game({ home: MP.playerTeam.id, away: rd.team, humanTeam: 0, solo: [0, null], silent: true, noDraft: true,
    avatars: [{ name: 'K', look: {}, role: 'MID', legend: 'kantay' }, null],
    mates: [[{ name: 'R', role: 'DEF', ovr: 70, legend: 'ramen' }], null] });
  const k = g.players.find((q) => q.legend === 'kantay'), rm = g.players.find((q) => q.legend === 'ramen');
  assert.ok(k && rm && k.leg && rm.leg, 'players carry their legend');
  const sp = k.stats.speed;
  g.state = 'play';
  const MO = globalThis.SFC_CONFIG.legends.moment;
  SFC.Legends.on(g, 'steal', k);
  assert.ok(!MO.enabled && k.leg.t === 0 && k.stats.speed === sp, 'moments switched off: no stat boost (user 2026-10-29)');
  // cơ chế khoảnh khắc vẫn còn (bật lại được): thử với cờ bật
  MO.enabled = true;
  SFC.Legends.on(g, 'steal', k);
  assert.ok(k.leg.t > 0 && k.stats.speed > sp, 'moment boosts stats when enabled');
  for (let i = 0; i < 60 * 6; i++) SFC.Legends.update(g, 1 / 60);
  assert.ok(Math.abs(k.stats.speed - sp) < 1e-9 && k.leg.cd > 0, 'moment ends, stats back');
  MO.enabled = false;
  for (let i = 0; i < LG.ramen.flaw.hits; i++) SFC.Legends.on(g, 'hardHit', rm);
  assert.ok(rm.noActT > 0, 'too many heavy hits = red card');
  // BADGE của đội -> opts trận
  R.bag = [{ id: 'report', up: false }, { id: 'coin', up: true }, { id: 'var', up: false }, { id: 'camp', up: false }, { id: 'watch', up: false }];
  const o = Run.matchOpts();
  assert.ok(o.draftCards[0] === 1 && o.rerollBonus[0] === 2 && o.draftBonus[0] === 1 && o.varCheck[0].n === 1 && o.addedTime[0] === 20, 'team badges -> match opts');
  const g2 = new SFC.Game(Object.assign({ home: MP.playerTeam.id, away: rd.team, humanTeam: 0, solo: [0, null], silent: true }, o));
  assert.strictEqual(g2.draft.options[0].length, globalThis.SFC_CONFIG.game.match.upgradeChoices + 1, 'Scouting Report: one more card');
  assert.strictEqual(g2.draft.rerolls[0], globalThis.SFC_CONFIG.cores.draft.rerollsPerRound + 2, "Referee's Coin: more rerolls");
  g2.pickCore(0);
  assert.ok(g2.draft && g2.draft.bonus, 'Pre-Season Camp: a bonus pick before kickoff');
  g2.pickCore(0);
  assert.strictEqual(g2.cores.coresOf(g2.seatPlayer(0)).filter((id) => globalThis.SFC_CONFIG.cores.list[id].role !== 'ult').length, 2, 'two Cores before kickoff');
  assert.strictEqual(g2.upgradeIdx, 1, 'bonus pick does not eat a regular round');
  // KỸ THUẬT theo LEGEND: trong run chỉ kỹ thuật của LEGEND mình; ngoài run 4 kỹ thuật cũ như trước
  const Lg = SFC.Legends, run = { nonce: 'x', act: 0, node: '0.0', kind: 'match' };
  const g3 = new SFC.Game({ home: MP.playerTeam.id, away: rd.team, humanTeam: 0, solo: [2, null], silent: true, noDraft: true, run,
    avatars: [{ name: 'H', look: {}, role: 'FWD', legend: 'haalandroid' }, null], mates: [[{ name: 'R', role: 'DEF', ovr: 70, legend: 'ramen' }, { name: 'M', role: 'MID', ovr: 70 }], null] });
  const h = g3.players.find((q) => q.legend === 'haalandroid'), r2 = g3.players.find((q) => q.legend === 'ramen'), plain = g3.players.find((q) => q.team === 0 && !q.legend);
  assert.ok(Lg.tech(g3, h, 'bruiser') && !Lg.tech(g3, h, 'chip') && !Lg.tech(g3, h, 'power'), 'run: only your legend technique');
  assert.ok(!Lg.tech(g3, plain, 'chip'), 'run: no legend, no technique');
  const g4 = new SFC.Game({ home: MP.playerTeam.id, away: rd.team, humanTeam: 0, solo: [2, null], silent: true, noDraft: true });
  const q = g4.seatPlayer(0);
  assert.ok(Lg.tech(g4, q, 'finesse') && Lg.tech(g4, q, 'chip') && !Lg.tech(g4, q, 'power'), 'outside runs: the 4 old techniques as before');
  // lướt khi cầm bóng chỉ ra lúc nhấc phím skill; bấm skill trước rồi sút = sút bổng (ngoài run: ai cũng có)
  const inp = (down, pressed = []) => ({ isDown: (k) => down.includes(k), wasPressed: (k) => pressed.includes(k), stick: null });
  g4.state = 'play'; g4.ball.setOwner(q); q.state = 'normal'; q.cd.skill = 0;
  SFC.Human.update(1 / 60, g4, inp(['skill'], ['skill']), 0);
  assert.ok(q.state === 'normal' && q.skillArm, 'skill down with the ball: no dash yet');
  SFC.Human.update(1 / 60, g4, inp(['skill', 'shoot'], ['shoot']), 0);
  assert.ok(q.charging && q.shotStyle === 'chip' && !q.skillArm, 'skill first, then shoot = chip shot');
  q.charging = false; q.shotStyle = null; g4.ball.setOwner(q); q.state = 'normal';
  SFC.Human.update(1 / 60, g4, inp(['skill'], ['skill']), 0);
  SFC.Human.update(1 / 60, g4, inp([]), 0);
  assert.strictEqual(q.state, 'dash', 'releasing skill = dash');
  // BRUISER RUN (Haalandroid): dẫn bóng + giữ chạy nhanh, bấm C = giật chỏ đối thủ sát bên văng ra; đúng lúc bị đấm = người đấm văng ngược
  g3.state = 'play'; g3.ball.setOwner(h); h.state = 'normal'; h.techCd = 0;
  const e1 = g3.teams[1].players[1];
  e1.x = h.x + 14; e1.y = h.y; e1.state = 'normal';
  SFC.Human.update(1 / 60, g3, inp(['sprint', 'trick'], ['trick']), 0);
  assert.ok(e1.state === 'stun' && g3.ball.owner === h, 'bruiser: elbow shoves the defender, ball kept');
  e1.state = 'normal'; e1.stateT = 0; e1.hitImmune = 0; h.techCd = 0;
  Lg.bruiser(g3, h);
  e1.x = h.x + 40; e1.state = 'normal'; e1.hitImmune = 0;
  assert.ok(Lg.parry(g3, h, e1) && e1.state === 'stun', 'bruiser: a tackle in the window bounces off');
  // POWER SHOT (Balotello, F + D)
  const g6 = new SFC.Game({ home: MP.playerTeam.id, away: rd.team, humanTeam: 0, solo: [2, null], silent: true, noDraft: true, run,
    avatars: [{ name: 'B', look: {}, role: 'FWD', legend: 'balotello' }, null] });
  const bl = g6.seatPlayer(0);
  g6.state = 'play'; g6.ball.setOwner(bl); bl.state = 'normal';
  SFC.Human.update(1 / 60, g6, inp(['power', 'shoot'], ['shoot']), 0);
  assert.strictEqual(bl.shotStyle, 'power', 'F + shoot = power shot');
  bl.charge = 1; SFC.Human.update(1 / 60, g6, inp([]), 0);
  assert.ok(g6.effects.V.legtech[bl.id] && g6.effects.V.legtech[bl.id].id === 'power', 'power shot plays its own animation');
  // RAINBOW FLICK (Neymor): bóng vòng qua đầu rồi về lại chân người đang chạy
  const g7 = new SFC.Game({ home: MP.playerTeam.id, away: rd.team, humanTeam: 0, solo: [2, null], silent: true, noDraft: true, run,
    avatars: [{ name: 'N', look: {}, role: 'FWD', legend: 'neymor' }, null] });
  const ny = g7.seatPlayer(0);
  g7.state = 'play'; g7.ball.setOwner(ny); ny.state = 'normal'; ny.facing = 0;
  assert.ok(Lg.rainbow(g7, ny), 'rainbow starts');
  let peak = 0;
  for (let i = 0; i < 60 && !g7.ball.owner; i++) { ny.intent.mx = 1; ny.intent.my = 0; g7.update(1 / 60, null); g7.state = 'play'; peak = Math.max(peak, g7.ball.z); }
  assert.ok(peak > 20 && g7.ball.owner === ny, `rainbow goes over the head (${peak.toFixed(1)}px) and lands back at his feet`);
  // XOẠC (Ramen, chạy nhanh + A): trượt tới, chạm đối thủ = họ bay lộn + rơi bóng
  const opp = g3.teams[1].players[0];
  g3.ball.setOwner(opp); r2.state = 'normal'; r2.x = opp.x - 60; r2.y = opp.y; r2.techCd = 0;
  assert.ok(Lg.slide(g3, r2, 1, 0), 'slide starts');
  for (let i = 0; i < 40 && g3.ball.owner === opp; i++) { r2.update(1 / 60); Lg.update(g3, 1 / 60); }
  assert.ok(g3.ball.owner !== opp && g3.effects.V.legtech[opp.id] && g3.effects.V.legtech[opp.id].id === 'flip', 'slide tackle: ball loose, victim flips');
  // ENGINE PRESS (Kantay): tự đuổi bóng, rút thể lực nhanh hơn chạy nhanh thường
  const g5 = new SFC.Game({ home: MP.playerTeam.id, away: rd.team, humanTeam: 0, solo: [1, null], silent: true, noDraft: true, run,
    avatars: [{ name: 'K', look: {}, role: 'MID', legend: 'kantay' }, null] });
  const k5 = g5.seatPlayer(0), o5 = g5.teams[1].players[0];
  g5.state = 'play'; g5.ball.setOwner(o5); k5.state = 'normal'; k5.stamina = 100;
  assert.ok(Lg.engine(g5, k5, 0.5) && k5.intent.sprint && k5.stamina < 100, 'engine press chases and drains stamina');
  console.log('6. legends: OK (trial -> join anyone, off-position, vote, stats, moment, red card, team badges, techniques gate, dash on skill release, slide tackle)');
}

runRoom();
runLogic();
legendLogic();
console.log('OK');
