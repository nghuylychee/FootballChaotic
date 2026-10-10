/* Kiểm tra phía người chơi (src/net/online.js + transport-server.js + Room làm host) không cần trình duyệt:
 * mỗi "máy" = 1 vm context nạp đúng các file game (menu / UI / vẽ thay bằng stub), P2P thay bằng mạng giả trong bộ nhớ.
 *  1. Phòng máy chủ riêng: A tạo phòng (mã 6 ký tự), B vào, A là chủ phòng, START, B nhận snapshot, A về phòng chờ
 *  2. Máy chủ không tới được: A tạo phòng -> tự chuyển sang làm host (P2P giả), B vào bằng mã 7 ký tự, đá, về phòng chờ
 * node server/test/client-test.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
// file của máy chủ + phần khách online (scripts/manifest.js), theo thứ tự nạp của game
const manifest = require(path.join(ROOT, 'scripts', 'manifest.js'));
const SERVER_FILES = manifest.files('server');
const FILES = manifest.files('game').filter((f) => SERVER_FILES.includes(f) || ['src/net/transport-server.js', 'src/net/online.js'].includes(f));
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
      this.code = 'P2PCODE';   // 7 ký tự
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
    close() { if (this.hosting) hub.delete(this.code); this.hosting = false; this.hostT = null; },
  };
  return T;
}

/* ---------- 1 máy người chơi ---------- */
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
  SFC.NetPeer = fakePeer();
  SFC.Profile.load();
  SFC.Profile.data.name = name;
  const app = {
    sel: { ctrl: 2 }, screen: 'menu',
    mateSpec: () => null,
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
  return { name, SFC, O: SFC.Online, log, input, app };
}

// chạy vòng lặp game của các máy (60 bước/giây) trong ms
async function play(ms, ...ms_) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    for (const m of ms_) {
      if (m.O.game) m.O.tick(1 / 60, m.input);
      if (m.O.game) m.O.view(performance.now());
    }
    await sleep(16);
  }
}

async function serverRoom(url) {
  const A = machine('ALICE', url), B = machine('BOB', url);
  A.O.createRoom();
  await until(() => A.O.status === 'lobby' && A.O.lobby.members.length === 1, 5000, 'A in server lobby');
  assert.ok(A.O.onServer && !A.O.isHost, 'server room: creator is a guest');
  assert.strictEqual(A.O.code.length, 6);
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
  A.O.backToLobby();
  await until(() => A.O.status === 'lobby' && B.O.status === 'lobby', 5000, 'back to lobby');
  B.O.leave(); A.O.leave();
  console.log('server room: OK (create 6-char code, join, owner start, snapshots, back to lobby)');
}

async function fallbackRoom() {
  const dead = 'ws://localhost:1';   // không có máy chủ
  const A = machine('ALICE', dead), B = machine('BOB', dead);
  const t0 = Date.now();
  A.O.createRoom();
  await until(() => A.O.status === 'lobby', 8000, 'fallback host lobby');
  assert.ok(A.O.isHost && A.O.isOwner && !A.O.onServer, 'fell back to player-hosted');
  assert.ok(A.log.msgs.some((m) => /Server unreachable/.test(m)), 'player is told about the fallback');
  console.log(`fallback after ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  B.O.joinRoom(A.O.code);   // 7 ký tự -> P2P
  await until(() => B.O.lobby.members.length === 2 && A.O.lobby.members.length === 2, 5000, 'p2p lobby');
  assert.ok(!B.O.isOwner && B.O.lobby.owner === 'host');
  A.O.startMatch();
  await until(() => A.log.entered && B.log.entered, 5000, 'p2p match start');
  A.O.introDone(); B.O.introDone();
  await play(1500, A, B);
  assert.ok(B.O.buf.length > 0, 'guest receives snapshots from player host');
  assert.ok(A.O.game.time > 0.5, 'host simulates');
  A.O.backToLobby();
  await until(() => A.O.status === 'lobby' && B.O.status === 'lobby', 5000, 'p2p back to lobby');
  console.log('player-hosted fallback: OK (create, 7-char join, start, snapshots, back to lobby)');
}

(async () => {
  const port = 20000 + Math.floor(Math.random() * 20000);
  const proc = spawn(process.execPath, [path.join(__dirname, '..', 'index.js')], { env: Object.assign({}, process.env, { PORT: String(port) }), stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((res) => proc.stdout.once('data', res));
  try {
    await serverRoom(`ws://localhost:${port}`);
    await fallbackRoom();
    console.log('OK');
  } finally {
    proc.kill('SIGTERM');
  }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
