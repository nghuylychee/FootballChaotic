/* Kiểm tra mời bạn bè qua nền tảng (src/platform/* + transport-steam.js + session.js + src/ui/online.js) với steamworks.js /
 * SDK CrazyGames giả, không cần Steam / trình duyệt:
 *  1. Không có Steam (PeerJS): Session.canInvite = false (không hiện nút INVITE FRIENDS)
 *  2. Mở game bằng lời mời (+connect_lobby <id>): tự vào đúng lobby (id 64 bit chính xác) khi menu đã sẵn sàng
 *  3. Phòng Steam (cả khách): canInvite, invite() mở bảng mời của đúng lobby
 *  4. Nhận lời mời lúc đang ở phòng khác: rời phòng cũ rồi vào phòng mới · lời mời vào chính phòng đang ở: bỏ qua
 *  5. Lobby id đã bị làm tròn (number) / không đúng định dạng: bỏ qua, không vào nhầm phòng
 *  6. Đang đá trận: báo đã nhận lời, hết trận (về menu) mới vào
 *  CrazyGames (SFC_STORE = 'crazygames'):
 *  7. Mở game bằng lời mời (inviteParams): vào đúng phòng · tên tài khoản CrazyGames · bỏ qua PROLOGUE
 *  8. Báo phòng (updateRoom): còn chỗ = joinable · nút mời = chép link có mã phòng
 *  9. Bạn bấm vào phòng khác lúc đang ở phòng (join listener): rời rồi vào · mã sai: bỏ qua · rời: leftRoom
 * 10. Làm host: lobby joinable -> trận: không joinable -> rời: leftRoom · nền tảng khác: không gọi SDK
 * node server/test/invite-test.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', '..');
const manifest = require(path.join(ROOT, 'scripts', 'manifest.js'));
const SERVER_FILES = manifest.files('server');
const CLIENT = ['config/platform.config.js', 'src/platform/platform.js', 'src/platform/crazygames.js', 'src/net/transport-server.js',
  'src/net/transport-steam.js', 'src/platform/steam.js', 'src/net/predict.js', 'src/net/session.js', 'src/ui/online.js'];
const FILES = manifest.files('game').filter((f) => SERVER_FILES.includes(f) || CLIENT.includes(f));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms = 4000, what = 'condition') => {
  const end = Date.now() + ms;
  while (!fn()) { if (Date.now() > end) throw new Error('timeout: ' + what); await sleep(10); }
};

const HIGH = 0x01860000n;
const lobbyId = (low) => (HIGH << 32n) | BigInt(low);

/* ---------- steamworks.js giả: lobby trong bộ nhớ, P2P không đi đâu ---------- */
function fakeSteam(launchLobby) {
  const st = { joined: [], left: [], invites: [], cbs: {}, nextLow: 0x2a3b4c5d };
  const lobby = (id) => ({
    id,
    leave() { st.left.push(id); },
    openInviteDialog() { st.invites.push(id); },
    getMembers: () => [],
    getOwner: () => ({ steamId64: 76561198000000001n }),
  });
  st.client = {
    localplayer: { getSteamId: () => ({ steamId64: 76561198000000002n }) },
    matchmaking: {
      createLobby: () => Promise.resolve(lobby(lobbyId(st.nextLow++))),
      joinLobby: (id) => { st.joined.push(id); return Promise.resolve(lobby(id)); },
    },
    networking: { isP2PPacketAvailable: () => 0, readP2PPacket() {}, acceptP2PSession() {}, sendP2PPacket: () => true },
    callback: {
      register(cb, fn) { (st.cbs[cb] = st.cbs[cb] || []).push(fn); return { disconnect() { st.cbs[cb] = st.cbs[cb].filter((f) => f !== fn); } }; },
    },
  };
  // callback của Steam (GameLobbyJoinRequested = 8)
  st.fire = (cb, v) => (st.cbs[cb] || []).forEach((fn) => fn(v));
  st.api = { client: st.client, toBuffer: (s) => Buffer.from(s, 'utf8'), fromBuffer: (b) => b.toString('utf8'), launchLobby };
  return st;
}

/* ---------- SDK CrazyGames giả: ghi lại mọi lệnh gửi ---------- */
function fakeCG(invite) {
  const cg = { calls: [], listeners: [] };
  cg.SDK = {
    environment: 'local',
    init: () => Promise.resolve(),
    user: { isUserAccountAvailable: true, systemInfo: { locale: 'en-US' }, getUser: () => Promise.resolve({ username: 'cg.friend_01' }) },
    game: {
      inviteParams: invite ? { room: invite } : null,
      isInstantMultiplayer: false,
      updateRoom: (o) => cg.calls.push(['updateRoom', JSON.parse(JSON.stringify(o))]),
      leftRoom: () => cg.calls.push(['leftRoom']),
      inviteLink: (p) => 'https://www.crazygames.com/game/street-football-chaos?room=' + p.room,
      addJoinRoomListener: (fn) => cg.listeners.push(fn),
      gameplayStart() {}, gameplayStop() {},
    },
  };
  cg.join = (params) => cg.listeners.forEach((fn) => fn(params));
  cg.rooms = () => cg.calls.filter((c) => c[0] === 'updateRoom').map((c) => c[1]);
  cg.last = () => (cg.calls.length ? cg.calls[cg.calls.length - 1][0] : null);
  return cg;
}

function machine(steam, cg) {
  const ctx = vm.createContext({
    console, setTimeout, clearTimeout, setInterval, clearInterval, setImmediate, performance, Intl, URL, Buffer,
    DecompressionStream, TextDecoder, fetch, AbortSignal, AbortController,
  });
  ctx.window = ctx;
  const mem = {};
  ctx.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
  ctx.navigator = { language: 'en', userAgent: 'node', getGamepads: () => [] };
  ctx.document = { addEventListener() {}, createElement: () => ({ getContext: () => null, style: {} }), getElementById: () => null, querySelector: () => null, body: {}, documentElement: { lang: 'en' } };
  ctx.addEventListener = () => {};
  if (steam) ctx.SFC_STEAM = steam.api;
  if (cg) ctx.CrazyGames = { SDK: cg.SDK };
  const log = { pages: [], msgs: [], banners: [] };
  ctx.SFC = { Audio: { pick() {} }, Pad: null, Storage: { getJSON: (k, d) => d, setJSON() {}, remove() {} } };
  for (const f of FILES) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  const SFC = ctx.SFC;
  ctx.SFC_CONFIG.net.server.url = '';
  ctx.SFC_CONFIG.net.server.urls = [];   // không đụng máy chủ thật: phòng luôn do người chơi làm host
  SFC.NetPeer = { available: () => true, on() {}, host: () => Promise.resolve('KXQMRTA'), join: () => Promise.resolve(), send() {}, close() {}, drop() {}, id: 'host' };
  SFC.Profile.load();
  if (!cg) SFC.Profile.data.name = 'TESTER';
  const app = {
    sel: { ctrl: 2 }, screen: 'menu', mode: 'single',
    mateSpec: () => null,
    myRole() { const R = ctx.SFC_CONFIG.game.roles; return R.includes('FWD') ? 'FWD' : R[R.length - 1]; },
    toMenu(page) { this.screen = 'menu'; SFC.Menu.page = page; log.pages.push(page); },
    enterOnline() { this.screen = 'game'; },
    resume() {}, pause() {},
  };
  SFC.Menu = {
    app, el: {}, page: 'home', msg: '', code: '', search: null,
    go(page, msg = '') { this.page = page; this.msg = msg; log.pages.push(page); if (msg) log.msgs.push(msg); },
    setMsg(msg) { this.msg = msg; log.msgs.push(msg); },
    render() {},
    cancelSearch() { this.search = null; },
  };
  SFC.UI = { banner: (t) => log.banners.push(t), consume() {} };
  SFC.CupUI = { reset() {}, skipTo() {}, remoteScenes() {} };
  return { SFC, O: SFC.Session, log, app, ctx };
}

(async () => {
  // 1. không có Steam: chỉ có mã phòng
  {
    const m = machine(null);
    m.O.createRoom({ story: 'ward_cup' });
    await until(() => m.O.status === 'lobby', 2000, 'PeerJS room');
    assert.strictEqual(m.O.canInvite, false, 'no invite button without Steam');
    m.O.leave();
    console.log('1. no Steam: OK (no invite, code only)');
  }

  // 2. mở game bằng lời mời (+connect_lobby) · 3. bảng mời của đúng lobby
  const id1 = lobbyId(0x11223344), id2 = lobbyId(0x55667788);
  const steam = fakeSteam(id1.toString());
  const m = machine(steam);
  const SFC = m.SFC, code = (id) => SFC.NetCommon.encodeCode(Number(id & 0xffffffffn));
  await until(() => m.O.status === 'lobby' && m.O.code === code(id1), 3000, 'launch invite joins the lobby');
  assert.deepStrictEqual(steam.joined, [id1], 'joined the exact 64-bit lobby id from the command line');
  assert.strictEqual(SFC.Platform.id, 'steam');
  assert.strictEqual(SFC.Platform.launchInvite(), null, 'the launch invite is used once');
  console.log('2. launch invite: OK (+connect_lobby id -> room ' + code(id1) + ')');

  assert.strictEqual(m.O.canInvite, true, 'guests in a Steam lobby can invite too');
  assert.strictEqual(m.O.inviteMode, 'dialog');
  assert.strictEqual(await m.O.invite(), 'opened', 'invite() opens the dialog');
  assert.deepStrictEqual(steam.invites, [id1], 'invite dialog of the current lobby');
  console.log('3. invite dialog: OK');

  // 4. lời mời vào phòng khác lúc đang ở phòng: rời rồi vào · lời mời vào chính phòng đang ở: bỏ qua
  steam.fire(8, { lobby_steam_id: id1, friend_steam_id: 76561198000000001n });
  await sleep(700);
  assert.strictEqual(m.O.code, code(id1), 'same room: stays');
  assert.strictEqual(steam.joined.length, 1, 'same room: no rejoin');
  steam.fire(8, { lobby_steam_id: id2, friend_steam_id: 76561198000000001n });
  await until(() => m.O.status === 'lobby' && m.O.code === code(id2), 3000, 'invite while in a room');
  assert.ok(steam.left.some((x) => x === id1), 'left the old lobby');
  assert.strictEqual(steam.joined[steam.joined.length - 1], id2, 'joined the invited lobby');
  await sleep(300);
  assert.ok(!steam.left.includes(id2), 'the old room closing late does not close the new one');
  console.log('4. invite while in a room: OK (left ' + code(id1) + ', joined ' + code(id2) + ')');

  // 5. id bị làm tròn / sai định dạng: bỏ qua
  const n = steam.joined.length;
  steam.fire(8, { lobby_steam_id: Number(lobbyId(0x0abcdef1)), friend_steam_id: 1 });
  steam.fire(8, { lobby_steam_id: 76561198000000003n, friend_steam_id: 1 });
  await sleep(700);
  assert.strictEqual(steam.joined.length, n, 'rounded / non-lobby ids are ignored');
  assert.strictEqual(m.O.code, code(id2));
  console.log('5. unreadable ids: OK (ignored)');

  // 6. đang đá trận: báo, hết trận mới vào
  m.O.leave();
  await sleep(300);
  m.app.screen = 'game';
  const id3 = lobbyId(0x0badf00d);
  steam.fire(8, { lobby_steam_id: id3, friend_steam_id: 1 });
  await sleep(700);
  assert.strictEqual(m.O.status, 'idle', 'no join mid-match');
  assert.ok(m.log.banners.includes('INVITE ACCEPTED'), 'player is told the invite was accepted');
  m.app.screen = 'menu';
  await until(() => m.O.status === 'lobby' && m.O.code === code(id3), 3000, 'join after the match');
  assert.strictEqual(m.SFC.Menu.page, 'lobby', 'lands in the room (a story room moves on to its own page on the first lobby packet)');
  console.log('6. invite during a match: OK (joined after it)');

  // chữ người chơi thấy không lộ cách kết nối
  const bad = /steam|p2p|peer|server|host(ing)? machine/i;
  for (const t of [...m.log.msgs, ...m.log.banners]) assert.ok(!bad.test(t), 'neutral text: ' + t);

  /* ================= CrazyGames ================= */
  // như boot (main.js): nạp xong -> SFC_STORE -> Platform.ready() -> watchInvites + tên tài khoản
  const cgMachine = async (cg) => {
    const c = machine(null, cg);
    c.ctx.SFC_STORE = 'crazygames';
    c.ctx.SFC_DEMO = true;   // bản CrazyGames là DEMO nhưng vẫn mở phòng riêng (platform.config.js)
    c.copied = [];
    c.ctx.navigator.clipboard = { writeText: (t) => { c.copied.push(t); return Promise.resolve(); } };
    await c.SFC.Platform.ready();
    c.O.watchInvites();
    const acc = c.SFC.Platform.user();
    if (!c.SFC.Profile.hasName && acc) c.SFC.Profile.setName(acc.name);
    return c;
  };
  const roomA = SFC.NetCommon.encodeCode(0x1234567), roomB = SFC.NetCommon.encodeCode(0x2345678);

  // 7. mở game bằng lời mời
  const cg = fakeCG(roomA);
  const c = await cgMachine(cg);
  assert.strictEqual(c.SFC.Platform.id, 'crazygames');
  assert.strictEqual(c.SFC.Platform.privateMatch, true, 'demo keeps PRIVATE MATCH on CrazyGames');
  assert.strictEqual(c.SFC.Profile.data.name, 'CGFRIEND_01', 'CrazyGames username becomes the name');
  assert.strictEqual(c.SFC.OnlineUI.joining, true, 'opened from an invite: onboarding is skipped');
  await until(() => c.O.status === 'lobby' && c.O.code === roomA, 3000, 'launch invite joins the room');
  assert.strictEqual(c.SFC.Platform.launchInvite(), null, 'the launch invite is used once');
  console.log('7. CrazyGames launch invite: OK (room ' + roomA + ', name ' + c.SFC.Profile.data.name + ')');

  // 8. báo phòng + link mời
  await until(() => cg.rooms().length, 2500, 'updateRoom');
  assert.deepStrictEqual(cg.rooms()[0], { roomId: roomA, isJoinable: true, inviteParams: { room: roomA } });
  assert.strictEqual(c.O.inviteMode, 'link');
  c.SFC.OnlineUI.invite(c.SFC.Menu);
  await until(() => c.copied.length, 1000, 'invite link copied');
  assert.ok(c.copied[0].endsWith('room=' + roomA), 'link carries the room code: ' + c.copied[0]);
  await until(() => c.log.msgs.some((t) => /link copied/.test(t)), 1000, 'copied message');
  console.log('8. CrazyGames room + invite link: OK');

  // 9. join listener: mã sai / chính phòng đang ở: bỏ qua · phòng khác: rời rồi vào
  cg.join({ room: 'bad' });
  cg.join({ room: roomA });
  await sleep(700);
  assert.strictEqual(c.O.code, roomA, 'bad code / same room: stays');
  cg.join({ room: roomB.toLowerCase() });
  await until(() => c.O.status === 'lobby' && c.O.code === roomB, 3000, 'join listener moves to the new room');
  await until(() => cg.rooms().some((r) => r.roomId === roomB), 2500, 'new room reported');
  c.O.leave();
  await until(() => cg.last() === 'leftRoom', 2500, 'leftRoom after leaving');
  console.log('9. CrazyGames join listener: OK (' + roomA + ' -> ' + roomB + ', leftRoom)');

  // 10. làm host: lobby -> trận -> rời
  const cg2 = fakeCG(null);
  const h = await cgMachine(cg2);
  assert.strictEqual(h.SFC.OnlineUI.joining, false);
  h.O.createRoom({ direct: true });
  await until(() => h.O.status === 'lobby', 2000, 'host room');
  const code10 = h.O.code;
  await until(() => cg2.rooms().length, 2500, 'host room reported');
  assert.deepStrictEqual(cg2.rooms()[0], { roomId: code10, isJoinable: true, inviteParams: { room: code10 } });
  // 1 người chưa đủ để START (Slots.ready): gọi thẳng hook Room dùng lúc vào trận / về phòng chờ
  const hooks = h.O.roomHooks();
  hooks.start({ opts: {} });
  assert.strictEqual(h.O.status, 'playing');
  await until(() => cg2.rooms().length === 2, 2500, 'match reported');
  assert.strictEqual(cg2.rooms()[1].isJoinable, false, 'not joinable mid-match');
  hooks.toLobby();
  await until(() => cg2.rooms().length === 3, 2500, 'back in the lobby reported');
  assert.strictEqual(cg2.rooms()[2].isJoinable, true, 'joinable again after the match (same group plays on)');
  h.O.leave();
  await until(() => cg2.last() === 'leftRoom', 2500, 'leftRoom');
  // nền tảng khác: không gọi SDK, không có nút mời
  const n2 = cg2.calls.length;
  h.ctx.SFC_STORE = 'none';
  h.O.createRoom({ direct: true });
  await until(() => h.O.status === 'lobby', 2000, 'room without platform');
  await sleep(1300);
  assert.strictEqual(cg2.calls.length, n2, 'no SDK calls on other platforms');
  assert.strictEqual(h.O.canInvite, false);
  console.log('10. CrazyGames host: OK (joinable lobby -> match -> lobby -> leftRoom; silent elsewhere)');
  for (const t of [...c.log.msgs, ...h.log.msgs]) assert.ok(!bad.test(t), 'neutral text: ' + t);
  console.log('OK');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
