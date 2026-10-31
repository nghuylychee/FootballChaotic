/* Kiểm tra phía người chơi (src/net/session.js + transport-server.js + Room làm host) không cần trình duyệt:
 * mỗi "máy" = 1 vm context nạp đúng các file game (menu / UI / vẽ thay bằng stub), P2P thay bằng mạng giả trong bộ nhớ.
 *  1. Phòng máy chủ riêng: A tạo phòng (mã 6 ký tự), B vào, A là chủ phòng, START, B nhận snapshot, A về phòng chờ
 *  3. Nhiều máy chủ (net.server.urls): VÀO PHÒNG tìm đúng máy giữ phòng, kết nối lại đúng máy đó; 2 người chờ một mình ở 2 máy
 *     -> người ở máy đứng sau chuyển sang máy trước, chung 1 trận; chờ một mình quá searchMax -> solo
 *  2. Máy chủ không tới được: A tạo phòng -> tự chuyển sang làm host (P2P giả), B vào bằng mã 7 ký tự, đá, về phòng chờ
 *  4. Phòng co-op FOOTBALL STORY: máy chủ ping thấp -> phòng trên máy chủ, người tạo giữ cup (isLead), khách nhận bản sao, cut scene
 *     chờ cả phòng (csr), vào trận, về phòng chờ với vòng mới, người tạo rời = phòng đóng · ping cao hơn coopMaxPing -> tự làm host
 *  Cả 2: B rớt mạng giữa trận -> tự kết nối lại, lấy lại slot, A thấy RECONNECTED
 *  Mọi thông báo / banner người chơi thấy không được lộ cách kết nối (máy chủ riêng / làm host / Steam / PeerJS)
 *  Mã online (src/net/) không được gọi tới giao diện (Menu / UI / Audio / Intro / Input): UI sửa thoải mái không ảnh hưởng online
 *  Máy giả chạy đúng như game: main.js -> SFC.OnlineUI.tick / view (src/ui/online.js) -> SFC.Session
 * node server/test/client-test.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
// file của máy chủ + phần khách online + giao diện online (scripts/manifest.js), theo thứ tự nạp của game
const manifest = require(path.join(ROOT, 'scripts', 'manifest.js'));
const SERVER_FILES = manifest.files('server');
const FILES = manifest.files('game').filter((f) => SERVER_FILES.includes(f) || ['src/net/transport-server.js', 'src/net/predict.js', 'src/net/session.js', 'src/ui/online.js'].includes(f));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms = 5000, what = 'condition') => {
  const end = Date.now() + ms;
  while (!fn()) { if (Date.now() > end) throw new Error('timeout: ' + what); await sleep(10); }
};

/* ---------- mạng P2P giả (thay PeerJS / Steam) ---------- */
const hub = new Map();
let gid = 0;
function fakePeer() {
  const T = {
    hosting: false, handlers: {}, conns: new Map(), hostT: null, myId: null, code: null,
    on(h) { this.handlers = h || {}; },
    emit(n, a, b) { const h = this.handlers[n]; if (h) h(a, b); },
    message(e) { return String(e && (e.type || e)); },
    get id() { return this.hosting ? 'host' : this.myId; },
    host() {
      this.hosting = true;
      this.code = 'KXQMRTA';   // 7 ký tự, ký tự đầu không phải net.server.codeFirst
      hub.set(this.code, this);
      return Promise.resolve(this.code);
    },
    join(code) {
      const h = hub.get(code);
      if (!h) return Promise.reject({ type: 'peer-unavailable' });
      this.hostT = h;
      this.myId = 'peer' + ++gid;
      h.conns.set(this.myId, this);
      setImmediate(() => h.emit('open', this.myId));
      return Promise.resolve();
    },
    send(msg, id) {
      const data = JSON.stringify(msg);
      if (!this.hosting) { const h = this.hostT, me = this.myId; if (h) setImmediate(() => h.emit('data', JSON.parse(data), me)); return; }
      const to = id != null ? [this.conns.get(id)].filter(Boolean) : [...this.conns.values()];
      for (const g of to) setImmediate(() => g.emit('data', JSON.parse(data), 'host'));
    },
    drop(id) { this.conns.delete(id); },
    // khách rớt mạng (không bye): cả 2 phía nhận close
    sever() {
      const h = this.hostT, me = this.myId;
      if (!h) return;
      h.conns.delete(me);
      this.hostT = null;
      setImmediate(() => { h.emit('close', me); this.emit('close', 'host'); });
    },
    close() { if (this.hosting) hub.delete(this.code); this.hosting = false; this.hostT = null; },
  };
  return T;
}

/* ---------- 1 máy người chơi ---------- */
const MACHINES = [];
function machine(name, serverUrl, urls) {
  const ctx = vm.createContext({
    console, setTimeout, clearTimeout, setInterval, clearInterval, setImmediate, performance, WebSocket, Intl, URL,
    DecompressionStream, TextDecoder,   // nén trong game (transport-server.js)
    fetch, AbortSignal, AbortController,   // đo ping /healthz (nhiều máy chủ)
  });
  ctx.window = ctx;
  const mem = {};
  ctx.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
  ctx.navigator = { language: 'en', userAgent: 'node', getGamepads: () => [] };
  ctx.document = { addEventListener() {}, createElement: () => ({ getContext: () => null, style: {} }), getElementById: () => null, querySelector: () => null, body: {}, documentElement: { lang: 'en' } };
  ctx.addEventListener = () => {};
  const log = { pages: [], msgs: [], entered: 0, banners: [] };
  ctx.SFC = { Audio: { pick() {} }, Pad: null, Storage: { getJSON: (k, d) => d, setJSON() {}, remove() {} } };
  for (const f of FILES) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  const SFC = ctx.SFC;
  ctx.SFC_CONFIG.net.server.url = serverUrl;
  ctx.SFC_CONFIG.net.server.urls = urls || [];   // test: chỉ máy chủ của test (không đụng máy chủ thật trong config)
  ctx.SFC_CONFIG.net.server.keepAlive = 0.2;   // test: gói giữ thức mỗi 0,2 giây
  SFC.NetPeer = fakePeer();
  SFC.Profile.load();
  SFC.Profile.data.name = name;
  const app = {
    sel: { ctrl: 2 }, screen: 'menu',
    mateSpec: () => null,
    // như main.js app.myRole: vị trí mặc định cố định (vị trí trong phòng đi theo slot đang đứng)
    myRole() { const R = ctx.SFC_CONFIG.game.roles; return R.includes('FWD') ? 'FWD' : R[R.length - 1]; },
    toMenu(page) { this.screen = 'menu'; log.pages.push(page); SFC.Menu.page = page; },
    enterOnline(game) { this.screen = 'game'; this.game = game; log.entered++; },
    resume() {}, pause() {},
  };
  SFC.Menu = {
    app, page: 'home', msg: '', msgErr: false,
    go(page, msg = '', err = false) { this.page = page; this.msg = msg; this.msgErr = err; log.pages.push(page); if (msg) log.msgs.push(msg); },
    setMsg(msg, err) { this.msg = msg; this.msgErr = err; log.msgs.push(msg); },
    render() {},
    // tìm trận xếp hạng (menu.js): không ghép được -> người chơi giả · ghép được -> MATCH FOUND rồi vào trận
    searchSolo() { log.solo = (log.solo || 0) + 1; },
    searchFound(game) { log.found = game; },
  };
  SFC.UI = {
    banner: (t) => log.banners.push(t), consume: (g) => { g.events.length = 0; },
    pauseInput() {}, draftInput() {}, endInput() {}, renderEndItems() {},
  };
  SFC.Intro = { update() {}, wants: (o) => SFC.Room.wantsIntro(o) };
  const input = { isDown: () => false, wasPressed: () => false, wasReleased: () => false, endFrame() {} };
  const m = { name, SFC, SFC_CONFIG: ctx.SFC_CONFIG, O: SFC.Session, log, input, app };
  MACHINES.push(m);
  return m;
}

// chạy vòng lặp game của các máy (60 bước/giây) trong ms
async function play(ms, ...ms_) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    for (const m of ms_) {
      if (m.O.game) m.SFC.OnlineUI.tick(1 / 60, m.input);
      if (m.O.game) m.SFC.OnlineUI.view(performance.now());
    }
    await sleep(16);
  }
}

// B rớt mạng giữa trận -> session.js tự vào lại (tok) -> lấy lại slot, nhận snapshot, A được báo
async function dropAndRejoin(A, B, cut) {
  const seat = B.O.game.me, entered = B.log.entered;
  cut();
  await until(() => B.O.rejoining, 3000, 'B starts reconnecting');
  assert.strictEqual(B.O.status, 'playing', 'match stays on screen while reconnecting');
  await until(() => !B.O.rejoining && B.log.entered > entered, 8000, 'B rejoined');
  assert.strictEqual(B.O.game.me, seat, 'same seat after reconnecting');
  B.O.buf.length = 0;
  await play(800, A, B);
  assert.ok(B.O.buf.length > 0 || B.O.game.time > 0, 'snapshots flow again');
  assert.ok(A.log.banners.some((b) => /RECONNECTED/.test(b)), 'the other player is told');
  assert.ok(B.log.banners.some((b) => /CONNECTION LOST/.test(b)) && B.log.banners.some((b) => b === 'RECONNECTED'), 'the dropped player sees lost / reconnected');
}

// bảng ping cả trận: mỗi máy nhận ping của người kia (ms), n = số cầu thủ có ping (trận xếp hạng: cả người chơi giả)
async function pingsShared(A, B, n) {
  const pid = (m) => String(m.O.game.seatPlayer(m.O.game.me).id);
  // máy làm host chạy Room trong vòng lặp game -> vừa chờ vừa chạy. Bảng ping phát mỗi net.pingShare giây theo khung trận (vòng lặp test
  // chạy chậm hơn 60 khung/giây): ping của khách tới ngay sau 1 lần phát thì phải chờ trọn lần sau -> chờ đủ 2 nhịp + dư
  const until2 = async (fn, what) => { const end = Date.now() + (A.SFC_CONFIG.net.pingShare * 2 + 4) * 1000; while (!fn()) { if (Date.now() > end) throw new Error("timeout: " + what); await play(200, A, B); } };
  await until2(() => B.O.pings[pid(A)] != null && A.O.pings[pid(B)] != null, "match pings shared");
  for (const m of [A, B]) for (const v of Object.values(m.O.pings)) assert.ok(Number.isInteger(v) && v >= 0, "ping is a whole number of ms");
  if (n) await until2(() => Object.keys(A.O.pings).length === n, "every player has a ping");
}

async function serverRoom(url) {
  const A = machine('ALICE', url), B = machine('BOB', url);
  A.O.createRoom();
  await until(() => A.O.status === 'lobby' && A.O.lobby.members.length === 1, 5000, 'A in server lobby');
  assert.ok(A.O.onServer && !A.O.isHost, 'server room: creator is a guest');
  assert.strictEqual(A.O.code.length, 7, 'server codes look like every other code');
  assert.ok(A.SFC.NetCommon.isServerCode(A.O.code), 'first character marks a server room');
  assert.ok(A.O.isOwner, 'creator owns the room');
  // đổi sang slot vị trí khác ở đội kia rồi quay về: không vòng lặp pf <-> lobby (quá giới hạn gói -> bị ngắt)
  const home = A.O.mine.slot, other = A.O.slotOf(1, A.SFC_CONFIG.game.roles.find((r) => r !== A.O.slotRole(home)));
  A.O.requestSlot(other);
  await until(() => A.O.mine && A.O.mine.slot === other, 3000, 'A moved to the other team');
  await sleep(1500);
  assert.ok(A.O.status === 'lobby' && A.O.mine.slot === other, 'still connected after switching slot');
  assert.strictEqual(A.O.myPf().role, A.O.slotRole(other), 'profile role follows the slot');
  A.O.requestSlot(home);
  await until(() => A.O.mine && A.O.mine.slot === home, 3000, 'A moved back');
  B.O.joinRoom(A.O.code);
  await until(() => B.O.lobby.members.length === 2 && A.O.lobby.members.length === 2, 5000, 'both in lobby');
  assert.ok(!B.O.isOwner && !B.O.canStart);
  assert.ok(A.O.canStart, 'owner can start');
  A.O.startMatch();
  await until(() => A.log.entered && B.log.entered, 5000, 'match start');
  A.O.introDone(); B.O.introDone();
  await play(1500, A, B);
  assert.ok(B.O.buf.length > 0 && B.O.game.state !== 'ended', 'guest receives snapshots');
  // NETWORK STATS: ping tới máy chủ + byte gửi / nhận
  await until(() => A.SFC.NetStats.rtt != null && B.SFC.NetStats.rtt != null, 3000, 'ping measured on both sides');
  for (const m of [A, B]) { const S = m.SFC.NetStats; assert.ok(S.up > 0 && S.down > S.up, `${m.name}: bytes measured`); }
  // nén trong game: gói nhị phân deflate-raw, snapshot ~0,1 KB thay vì ~1,1 KB
  assert.ok(B.SFC.NetServer.compressed, 'server stream is compressed');
  const perSnap = B.SFC.NetStats.down / Math.max(1, B.O.game.time * 30);
  assert.ok(perSnap < 400, `compressed snapshots are small (${perSnap.toFixed(0)} B each)`);
  console.log(`in-game compression: ~${perSnap.toFixed(0)} B per snapshot on the wire`);
  await pingsShared(A, B);
  await dropAndRejoin(A, B, () => B.SFC.NetServer.ws.close());   // rớt WebSocket
  A.O.backToLobby();
  await until(() => A.O.status === 'lobby' && B.O.status === 'lobby', 5000, 'back to lobby');
  // phòng bị máy chủ đóng giữa trận (bye) -> về menu ngay, không thử kết nối lại
  A.O.startMatch();
  await until(() => A.O.status === 'playing' && B.O.status === 'playing', 5000, 'second match');
  await until(() => B.O.tok, 2000, 'B has a token');
  B.O.guestData({ t: 'bye' });
  assert.ok(!B.O.rejoining && B.O.status === 'idle', 'room closed by the server: no reconnect attempt');
  A.O.leave();
  console.log('server room: OK (7-char code, join, owner start, snapshots, drop + auto rejoin, back to lobby)');
}

// phòng co-op FOOTBALL STORY trên máy chủ riêng (ping thấp): người tạo phòng giữ cup (isLead), khách nhận bản sao, cut scene + csr,
// vào trận, về phòng chờ với vòng mới; người tạo rời = phòng đóng. Ping cao hơn net.server.coopMaxPing -> người chơi làm host như trước
async function coopServerRoom(url) {
  const A = machine('ALICE', url), B = machine('BOB', url);
  const s = A.SFC_CONFIG.stories.list.find((x) => !x.soon), rd = s.rounds[0];
  for (const m of [A, B]) m.SFC.CupUI = { skipTo() {}, reset() {}, remoteScenes: () => m.O.scenesDone() };
  A.O.createRoom({ story: s.id });
  await until(() => A.O.status === 'lobby' && A.O.lobby.members.length === 1, 5000, 'A in the co-op server lobby');
  assert.ok(A.O.onServer && A.O.isLead && A.O.isOwner && !A.O.isHost, 'co-op room on the server, creator holds the cup');
  assert.ok(A.SFC.Cup.start(s.id), 'cup starts');
  A.O.shareCup();
  B.O.joinRoom(A.O.code);
  await until(() => B.O.story === s.id && B.SFC.Cup.run && B.SFC.Cup.run.mirror, 5000, 'B mirrors the cup');
  assert.ok(!B.O.isLead, 'B does not hold the cup');
  assert.ok(!A.SFC.Cup.run.mirror, "the lead's own cup stays real");
  A.O.cueScenes('before');
  assert.ok(A.O.scenesPending, 'lead waits for the scene');
  await until(() => !A.O.scenesPending, 5000, 'everyone saw the scene');
  A.O.startStory({ away: rd.team, mates: [], match: { difficulty: 'normal', aiProfile: A.SFC.MainPath.aiProfile(30), knockout: true, cup: { id: s.id, round: 0 }, mod: rd.mod || null, barks: rd.barks || null } });
  await until(() => A.log.entered && B.log.entered, 5000, 'co-op match start');
  assert.ok(A.O.game.opts.cup && A.O.game.opts.mirror, 'the lead plays a mirror of the server match');
  A.O.introDone(); B.O.introDone();
  await play(1000, A, B);
  assert.ok(A.O.buf.length > 0 || A.O.game.time > 0, 'the lead receives snapshots');
  A.SFC.Cup.run.round = 1;   // như Cup.record sau trận thắng
  A.O.backToLobby();
  await until(() => A.O.status === 'lobby' && B.O.status === 'lobby', 5000, 'co-op back to lobby');
  await until(() => B.SFC.Cup.run && B.SFC.Cup.run.round === 1, 3000, 'guest sees the next round');
  A.O.leave();
  await until(() => B.O.status === 'idle', 5000, 'room closes when the lead leaves');
  // máy chủ chậm hơn coopMaxPing -> làm host như trước, không chờ máy chủ
  const C = machine('CARA', url);
  C.SFC.CupUI = { skipTo() {}, reset() {}, remoteScenes() {} };
  C.SFC_CONFIG.net.server.coopMaxPing = 0;
  C.O.createRoom({ story: s.id });
  await until(() => C.O.status === 'lobby', 5000, 'slow server: hosted locally');
  assert.ok(C.O.isHost && C.O.isLead && !C.O.onServer, 'player-hosted co-op room');
  C.O.leave();
  console.log('co-op server room: OK (ping ok -> server, cup held by the creator, scenes, match, next round, lead leaves = closed; slow -> self-host)');
}

// tìm trận xếp hạng: 2 người tìm cùng lúc -> chung trận, mỗi máy có Main Path riêng; không có / không tới được máy chủ -> solo
async function rankedSearch(url) {
  const A = machine('ALICE', url), B = machine('BOB', url);
  A.SFC.MainPath.state.elo = 300;
  B.SFC.MainPath.state.elo = 360;
  A.O.queue(); B.O.queue();
  assert.strictEqual(A.O.status, 'searching');
  await until(() => A.log.found && B.log.found, 15000, 'both matched');
  assert.ok(!A.log.pages.includes('lobby') && !A.log.pages.includes('online'), 'no room pages while searching');
  for (const m of [A, B]) {
    const g = m.log.found, mp = g.opts.mainPath;
    assert.ok(g.opts.ranked && mp, 'ranked match carries Main Path info');
    assert.strictEqual(mp.elo, m.SFC.MainPath.state.elo, 'each machine uses its own Main Path');
    assert.ok(mp.myElo > 0 && mp.oppElo > 0);
    const opp = g.teams[1 - g.humanTeam].players;
    assert.ok(opp.every((p) => p.elo != null), 'every opponent shows an Elo (real or AI alike)');
    m.app.enterOnline(g);   // menu.js: sau MATCH FOUND
  }
  assert.strictEqual(A.log.found.opts.mainPath.myElo, B.log.found.opts.mainPath.oppElo, 'team Elo mirrored');
  A.O.introDone(); B.O.introDone();
  await play(1200, A, B);
  assert.ok(B.O.buf.length > 0 || B.O.game.time > 0, 'ranked match runs');
  await pingsShared(A, B, A.O.game.players.length);   // người chơi giả cũng có ping: không phân biệt được người thật
  const banners = A.log.banners.length;
  B.O.leave();
  await play(600, A);
  assert.strictEqual(A.log.banners.length, banners, 'no player left banner in ranked matches');
  assert.strictEqual(A.O.status, 'playing', 'match goes on');
  A.O.leave();
  // không ai khác -> solo; huỷ tìm
  const C = machine('CARA', url);
  C.O.queue();
  C.O.cancelQueue();
  assert.strictEqual(C.O.status, 'idle', 'cancel leaves the queue');
  // huỷ lúc còn đang đo ping /healthz: không được kết nối tiếp để lại vé ma trong hàng chờ
  await sleep(500);
  assert.strictEqual((await (await fetch(url.replace(/^ws/, 'http') + '/healthz')).json()).queue, 0, 'cancel during the ping leaves no ticket behind');
  const D = machine('DAN', '');
  D.O.queue();
  assert.strictEqual(D.log.solo, 1, 'no server configured: solo at once');
  const E = machine('EVE', 'ws://localhost:1');
  E.SFC_CONFIG.net.server.queueWake = 3;   // test: máy chủ không dậy -> thử lại 3 giây rồi solo (thật: queueWake ~45 giây)
  E.O.queue();
  await until(() => E.log.solo, 8000, 'unreachable: solo');
  assert.strictEqual(E.O.status, 'idle');
  console.log('ranked search: OK (matched on the server, own Main Path per machine, solo when no server, cancel)');
}

// nhiều máy chủ: thứ tự đo ping ép sẵn (2 máy cùng ở localhost nên ping gần như bằng nhau)
function order(m, first, urls) {
  const list = urls.map((url, index) => ({ url, index, ping: url === first ? 1 : 2, h: { ok: true, queue: 0 }, ok: true }));
  list.sort((a, b) => a.ping - b.ping);
  m.SFC.NetServer.probed = { at: Date.now(), list };
}

async function multiServer(urls) {
  const [u1, u2] = urls;
  // tạo phòng ở máy ping thấp nhất (u2), B đo ra u1 trước -> u1 báo không có phòng -> thử u2 -> vào được
  const A = machine('ALICE', '', urls), B = machine('BOB', '', urls);
  order(A, u2, urls); order(B, u1, urls);
  A.O.createRoom();
  await until(() => A.O.status === 'lobby', 5000, 'A in lobby on the closest server');
  assert.strictEqual(A.SFC.NetServer.home.url, u2, 'room created on the lowest-ping server');
  B.O.joinRoom(A.O.code);
  await until(() => B.O.lobby.members.length === 2 && A.O.lobby.members.length === 2, 5000, 'B found the room on the other server');
  assert.strictEqual(B.SFC.NetServer.home.url, u2, 'joined the server that holds the room');
  A.O.startMatch();
  await until(() => A.log.entered && B.log.entered, 5000, 'multi-server match start');
  A.O.introDone(); B.O.introDone();
  await play(600, A, B);
  order(B, u1, urls);   // kết nối lại không đo ping lại: đúng máy cũ
  await dropAndRejoin(A, B, () => B.SFC.NetServer.ws.close());
  assert.strictEqual(B.SFC.NetServer.target, u2, 'reconnected to the same server');
  A.O.leave(); B.O.leave();
  console.log('multi-server rooms: OK (create on closest, join finds the room, reconnect to the same server)');

  // C chờ một mình ở u1, D chờ một mình ở u2 -> D (máy đứng sau trong danh sách) chuyển sang u1 -> chung 1 trận
  const C = machine('CARA', '', urls), D = machine('DAN', '', urls);
  for (const m of [C, D]) m.SFC_CONFIG.net.server.hopEvery = 0.5;
  order(C, u1, urls); order(D, u2, urls);
  C.O.queue(); D.O.queue();
  await until(() => D.SFC.NetServer.target === u1, 4000, 'D moved to the server where C waits');
  assert.strictEqual(C.SFC.NetServer.target, u1, 'C (first server) stays');
  await until(() => C.log.found && D.log.found, 15000, 'C and D matched');
  C.O.leave(); D.O.leave();
  // một mình ở cả 2 máy -> không chuyển, quá searchMax -> solo (người chơi giả)
  const E = machine('EVE', '', urls);
  E.SFC_CONFIG.net.server.hopEvery = 0.5;
  E.SFC_CONFIG.net.server.searchMax = 2.5;
  order(E, u2, urls);
  E.O.queue();
  await until(() => E.log.solo, 6000, 'alone everywhere: solo');
  assert.strictEqual(E.SFC.NetServer.target, u2, 'no other server had anyone waiting: never moved');
  assert.strictEqual(E.O.status, 'idle');
  console.log('multi-server search: OK (lone players on two servers meet on one, alone everywhere -> solo)');
}

async function fallbackRoom() {
  const dead = 'ws://localhost:1';   // không có máy chủ (như máy chủ đang ngủ mãi không dậy)
  // Esc khi đang chờ máy chủ dậy -> huỷ tạo phòng
  const C = machine('CARA', dead);
  C.SFC_CONFIG.net.server.wakeTimeout = 30;
  C.O.createRoom();
  await until(() => C.log.msgs.some((m) => /Creating room.*cancel/.test(m)), 4000, 'waiting message');
  C.O.cancel();
  await until(() => C.O.status === 'idle', 2000, 'Esc cancels');
  assert.strictEqual(C.SFC.Menu.msg, 'Cancelled.');
  console.log('waiting + Esc: OK (cancels)');

  const A = machine('ALICE', dead), B = machine('BOB', dead);
  A.SFC_CONFIG.net.server.wakeTimeout = 3;   // test: chờ 3 giây thay vì ~70
  const t0 = Date.now();
  A.O.createRoom();
  await until(() => A.O.status === 'lobby', 10000, 'fallback host lobby');
  assert.ok(A.O.isHost && A.O.isOwner && !A.O.onServer, 'fell back to player-hosted');
  assert.ok(Date.now() - t0 >= 2500, 'kept retrying until wakeTimeout');
  assert.ok(!A.SFC.NetCommon.isServerCode(A.O.code), 'player-hosted code is not mistaken for a server code');
  console.log(`fallback after ${((Date.now() - t0) / 1000).toFixed(1)} s of retrying`);
  B.O.joinRoom(A.O.code);   // 7 ký tự -> P2P
  await until(() => B.O.lobby.members.length === 2 && A.O.lobby.members.length === 2, 5000, 'p2p lobby');
  assert.ok(!B.O.isOwner && B.O.lobby.owner === 'host');
  A.O.startMatch();
  await until(() => A.log.entered && B.log.entered, 5000, 'p2p match start');
  A.O.introDone(); B.O.introDone();
  await play(1500, A, B);
  assert.ok(B.O.buf.length > 0, 'guest receives snapshots from player host');
  assert.ok(A.O.game.time > 0.5, 'host simulates');
  // host đo ping tới khách, khách đo ping tới host
  // ping mỗi net.pingEvery giây: chờ lần đo đầu (khách có thể vừa vào phòng chưa tới 1 giây). Mạng P2P giả không đếm byte
  await until(() => A.SFC.NetStats.rtt != null && B.SFC.NetStats.rtt != null, 3000, 'p2p ping measured on both sides');
  await pingsShared(A, B);
  await dropAndRejoin(A, B, () => B.SFC.NetPeer.sever());   // rớt kết nối P2P
  A.O.backToLobby();
  await until(() => A.O.status === 'lobby' && B.O.status === 'lobby', 5000, 'p2p back to lobby');
  console.log('player-hosted fallback: OK (create, 7-char join, start, snapshots, drop + auto rejoin, back to lobby)');
}

(async () => {
  const start = async (port) => {
    const p = spawn(process.execPath, [path.join(__dirname, '..', 'index.js')], { env: Object.assign({}, process.env, { PORT: String(port) }), stdio: ['ignore', 'pipe', 'inherit'] });
    await new Promise((res) => p.stdout.once('data', res));
    return p;
  };
  const port = 20000 + Math.floor(Math.random() * 20000);
  const proc = await start(port), proc2 = await start(port + 1);
  try {
    await serverRoom(`ws://localhost:${port}`);
    await coopServerRoom(`ws://localhost:${port}`);
    await rankedSearch(`ws://localhost:${port}`);
    await multiServer([`ws://localhost:${port}`, `ws://localhost:${port + 1}`]);
    await fallbackRoom();
    // mã PeerJS ngẫu nhiên không bao giờ trùng dạng mã máy chủ riêng
    const NC = MACHINES[0].SFC.NetCommon;
    for (let i = 0; i < 2000; i++) assert.ok(!NC.isServerCode(NC.randomCode()), 'random P2P code never looks like a server code');
    // không thông báo nào lộ cách kết nối
    const LEAK = /server|host|machine|p2p|peer|steam|webrtc|handshake|waking|dedicated/i;
    const seen = MACHINES.flatMap((m) => m.log.msgs.concat(m.log.banners));
    const leaks = seen.filter((t) => LEAK.test(t));
    assert.deepStrictEqual(leaks, [], 'player-visible text reveals the network model');
    // mọi lỗi của mọi backend -> lý do trung tính -> chữ của giao diện
    const OUI = MACHINES[0].SFC.OnlineUI;
    const rawTypes = ['network', 'webrtc', 'load', 'steam-lobby', 'steam-offline', 'server-unreachable', 'server-full', 'server-closing',
      'version', 'timeout', 'peer-unavailable', 'room-missing', 'socket-error', 'browser-incompatible', 'unavailable-id', 'something-new'];
    const texts = rawTypes.map((type) => OUI.reasonText(NC.kind({ type }))).concat(Object.values(OUI.REASONS),
      Object.values(OUI.TEXT).map((t) => (typeof t === 'function' ? t('ABCD234') : t)));
    assert.deepStrictEqual(texts.filter((t) => LEAK.test(t)), [], 'UI texts reveal the network model');
    console.log(`neutral texts: OK (${seen.length} messages/banners seen + all UI texts checked)`);
    // mã online không gọi tới giao diện
    const NET_DIR = path.join(ROOT, 'src', 'net');
    for (const f of fs.readdirSync(NET_DIR)) {
      // bỏ chú thích (/* */ và //) — chỉ kiểm code thật
      const src = fs.readFileSync(path.join(NET_DIR, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
      const hit = src.match(/SFC\.(Menu|UI|OnlineUI|Audio|Intro|Input|Renderer)\b/);
      assert.ok(!hit, `src/net/${f} uses ${hit && hit[0]}: online code must not depend on the UI`);
    }
    console.log('online/UI separation: OK (src/net/ has no UI references)');
    console.log('OK');
  } finally {
    proc.kill('SIGTERM');
    proc2.kill('SIGTERM');
  }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
