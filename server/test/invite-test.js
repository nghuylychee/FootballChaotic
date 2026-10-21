/* Kiểm tra mời bạn bè qua Steam (src/net/transport-steam.js + session.js + src/ui/online.js) với steamworks.js giả, không cần Steam:
 *  1. Không có Steam (PeerJS): Session.canInvite = false (không hiện nút INVITE FRIENDS)
 *  2. Mở game bằng lời mời (+connect_lobby <id>): tự vào đúng lobby (id 64 bit chính xác) khi menu đã sẵn sàng
 *  3. Phòng Steam (cả khách): canInvite, invite() mở bảng mời của đúng lobby
 *  4. Nhận lời mời lúc đang ở phòng khác: rời phòng cũ rồi vào phòng mới · lời mời vào chính phòng đang ở: bỏ qua
 *  5. Lobby id đã bị làm tròn (number) / không đúng định dạng: bỏ qua, không vào nhầm phòng
 *  6. Đang đá trận: báo đã nhận lời, hết trận (về menu) mới vào
 * node server/test/invite-test.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', '..');
const manifest = require(path.join(ROOT, 'scripts', 'manifest.js'));
const SERVER_FILES = manifest.files('server');
const CLIENT = ['src/net/transport-server.js', 'src/net/transport-steam.js', 'src/net/predict.js', 'src/net/session.js', 'src/ui/online.js'];
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

function machine(steam) {
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
  const log = { pages: [], msgs: [], banners: [] };
  ctx.SFC = { Audio: { pick() {} }, Pad: null, Storage: { getJSON: (k, d) => d, setJSON() {}, remove() {} } };
  for (const f of FILES) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  const SFC = ctx.SFC;
  ctx.SFC_CONFIG.net.server.url = '';
  ctx.SFC_CONFIG.net.server.urls = [];   // không đụng máy chủ thật: phòng luôn do người chơi làm host
  SFC.NetPeer = { available: () => true, on() {}, host: () => Promise.resolve('KXQMRTA'), join: () => Promise.resolve(), send() {}, close() {}, drop() {}, id: 'host' };
  SFC.Profile.load();
  SFC.Profile.data.name = 'TESTER';
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
  assert.strictEqual(SFC.NetSteam.launchInvite(), null, 'the launch invite is used once');
  console.log('2. launch invite: OK (+connect_lobby id -> room ' + code(id1) + ')');

  assert.strictEqual(m.O.canInvite, true, 'guests in a Steam lobby can invite too');
  assert.ok(m.O.invite(), 'invite() opens the dialog');
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
  console.log('OK');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
