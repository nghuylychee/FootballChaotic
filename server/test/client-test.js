/* Kiểm tra phía người chơi (src/net/session.js + transport-server.js + Room làm host) không cần trình duyệt:
 * mỗi "máy" = 1 vm context nạp đúng các file game (menu / UI / vẽ thay bằng stub), P2P thay bằng mạng giả trong bộ nhớ.
 *  1. Phòng máy chủ riêng: A tạo phòng (mã 6 ký tự), B vào, A là chủ phòng, START, B nhận snapshot, A về phòng chờ
 *  2. Máy chủ không tới được: A tạo phòng -> tự chuyển sang làm host (P2P giả), B vào bằng mã 7 ký tự, đá, về phòng chờ
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
const FILES = manifest.files('game').filter((f) => SERVER_FILES.includes(f) || ['src/net/transport-server.js', 'src/net/session.js', 'src/ui/online.js'].includes(f));
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
function machine(name, serverUrl) {
  const ctx = vm.createContext({
    console, setTimeout, clearTimeout, setInterval, clearInterval, setImmediate, performance, WebSocket, Intl, URL,
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
  ctx.SFC_CONFIG.net.server.keepAlive = 0.2;   // test: gói giữ thức mỗi 0,2 giây
  SFC.NetPeer = fakePeer();
  SFC.Profile.load();
  SFC.Profile.data.name = name;
  const app = {
    sel: { ctrl: 2 }, screen: 'menu',
    mateSpec: () => null,
    // như main.js app.myRole
    myRole() { const R = ctx.SFC_CONFIG.game.roles; return R[this.sel.ctrl ? this.sel.ctrl - 1 : R.indexOf('FWD')]; },
    toMenu(page) { this.screen = 'menu'; log.pages.push(page); SFC.Menu.page = page; },
    enterOnline(game) { this.screen = 'game'; this.game = game; log.entered++; },
    resume() {}, pause() {},
  };
  SFC.Menu = {
    app, page: 'home', msg: '', msgErr: false,
    go(page, msg = '', err = false) { this.page = page; this.msg = msg; this.msgErr = err; log.pages.push(page); if (msg) log.msgs.push(msg); },
    setMsg(msg, err) { this.msg = msg; this.msgErr = err; log.msgs.push(msg); },
    render() {},
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

async function serverRoom(url) {
  const A = machine('ALICE', url), B = machine('BOB', url);
  A.O.createRoom();
  await until(() => A.O.status === 'lobby' && A.O.lobby.members.length === 1, 5000, 'A in server lobby');
  assert.ok(A.O.onServer && !A.O.isHost, 'server room: creator is a guest');
  assert.strictEqual(A.O.code.length, 7, 'server codes look like every other code');
  assert.ok(A.SFC.NetCommon.isServerCode(A.O.code), 'first character marks a server room');
  assert.ok(A.O.isOwner, 'creator owns the room');
  B.O.joinRoom(A.O.code);
  await until(() => B.O.lobby.members.length === 2 && A.O.lobby.members.length === 2, 5000, 'both in lobby');
  assert.ok(!B.O.isOwner && !B.O.canStart);
  assert.ok(A.O.canStart, 'owner can start');
  A.O.startMatch();
  await until(() => A.log.entered && B.log.entered, 5000, 'match start');
  A.O.introDone(); B.O.introDone();
  await play(1500, A, B);
  assert.ok(B.O.buf.length > 0 && B.O.game.state !== 'ended', 'guest receives snapshots');
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
  await dropAndRejoin(A, B, () => B.SFC.NetPeer.sever());   // rớt kết nối P2P
  A.O.backToLobby();
  await until(() => A.O.status === 'lobby' && B.O.status === 'lobby', 5000, 'p2p back to lobby');
  console.log('player-hosted fallback: OK (create, 7-char join, start, snapshots, drop + auto rejoin, back to lobby)');
}

(async () => {
  const port = 20000 + Math.floor(Math.random() * 20000);
  const proc = spawn(process.execPath, [path.join(__dirname, '..', 'index.js')], { env: Object.assign({}, process.env, { PORT: String(port) }), stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((res) => proc.stdout.once('data', res));
  try {
    await serverRoom(`ws://localhost:${port}`);
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
  }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
