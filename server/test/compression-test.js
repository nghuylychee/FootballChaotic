/* Kiểm tra nén chung của phòng (server/index.js roomZ): node server/test/compression-test.js
 *  1. Thứ tự: gói chữ gửi riêng (room, you, start) và gói chung nén tới đúng thứ tự Room gửi (you trước lobby có mình, start trước snapshot)
 *  2. Nén 1 lần: 2 người xin nén nhận CÙNG chuỗi byte cho cùng 1 gói chung; người không xin nén nhận JSON chữ, cùng nội dung
 *  3. Người vào sau (B, C) giải được từ điểm FULL_FLUSH của mình; người đang nhận (A) giải tiếp không lỗi
 *  4. Kết nối lại giữa trận (hello{tok}) bằng kết nối mới: giải luồng từ đầu kết nối mới, snapshot chạy tiếp
 * Giải mã như game: mỗi kết nối 1 luồng deflate-raw, mỗi gói nhị phân = trọn vẹn các gói tin (JSON + '\n').
 */
const assert = require('assert');
const zlib = require('zlib');
const WebSocket = require('ws');

const PORT = 20000 + Math.floor(Math.random() * 20000);
Object.assign(process.env, { PORT: String(PORT) });
const origLog = console.log;
console.log = (...a) => { if (!String(a[0]).startsWith('[room ')) origLog(...a); };
require('../index.js');
const NET = globalThis.SFC_CONFIG.net;
const URL = `ws://localhost:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pf = (name) => ({ name, role: 'FWD', level: 1, look: {}, cores: null, mate: null });

// 1 kết nối: giải luồng nén theo đúng thứ tự khung (giải lại cả luồng từ khung nhị phân đầu, lấy phần mới — đủ nhanh cho test)
function client(zip) {
  const ws = new WebSocket(URL);
  const c = { ws, msgs: [], bins: [], first: true };
  let decoded = 0;
  ws.on('message', (d, binary) => {
    if (!binary) { c.msgs.push(JSON.parse(String(d))); return; }
    c.bins.push(Buffer.from(d));
    const text = zlib.inflateRawSync(Buffer.concat(c.bins), { finishFlush: zlib.constants.Z_SYNC_FLUSH }).toString();
    const lines = text.split('\n');
    assert.strictEqual(lines.pop(), '', 'each binary frame ends on a whole message');
    for (const line of lines.slice(decoded)) c.msgs.push(JSON.parse(line));
    decoded = lines.length;
  });
  ws.on('error', () => {});
  c.send = (m) => { if (c.first && zip) m = Object.assign({ z: 1 }, m); c.first = false; ws.send(JSON.stringify(m)); };
  c.next = async (fn, ms = 5000) => {
    const end = Date.now() + ms;
    for (;;) {
      const m = c.msgs.find(fn);
      if (m) return m;
      if (Date.now() > end) throw new Error('timeout waiting for message');
      await sleep(10);
    }
  };
  c.idx = (fn) => c.msgs.findIndex(fn);
  c.open = new Promise((res) => ws.on('open', res));
  return c;
}

(async () => {
  const A = client(true), B = client(true), C = client(false);
  await Promise.all([A.open, B.open, C.open]);
  A.send({ t: 'create', v: NET.protocol });
  const { code } = await A.next((m) => m.t === 'room');
  A.send({ t: 'hello', v: NET.protocol, pf: pf('A') });
  await A.next((m) => m.t === 'lobby' && m.m.length === 1);
  for (const [k, c] of [[2, B], [3, C]]) {
    c.send({ t: 'join', code, v: NET.protocol });
    await c.next((m) => m.t === 'room');
    c.send({ t: 'hello', v: NET.protocol, pf: pf('P' + k) });
    await A.next((m) => m.t === 'lobby' && m.m.length === k);
  }
  A.send({ t: 'begin', area: 0 });
  for (const c of [A, B, C]) { await c.next((m) => m.t === 'start'); c.send({ t: 'intro' }); }
  await A.next((m) => m.t === 's' && m.f > 60);
  await sleep(300);

  // 1. thứ tự
  for (const [name, c] of [['A', A], ['B', B], ['C', C]]) {
    const you = c.idx((m) => m.t === 'you'), lob = c.idx((m) => m.t === 'lobby'), start = c.idx((m) => m.t === 'start'), snap = c.idx((m) => m.t === 's');
    assert.ok(c.idx((m) => m.t === 'room') < you && you < lob, `${name}: room, you, then lobby`);
    assert.ok(start >= 0 && snap > start, `${name}: start before the first snapshot`);
  }
  console.log('1. order: OK (private text and shared compressed messages arrive in send order)');

  // 2. nén 1 lần: khung nhị phân cuối của B có trong các khung của A (cùng chuỗi byte); C nhận chữ cùng nội dung
  assert.ok(C.bins.length === 0 && B.bins.length > 10, 'C gets text only, B gets binary');
  const lastB = B.bins[B.bins.length - 2];
  assert.ok(A.bins.some((b) => b.equals(lastB)), 'A and B receive byte-identical frames for the same broadcast');
  const fs = (c) => c.msgs.filter((m) => m.t === 's').map((m) => m.f);
  const fa = fs(A), fb = fs(B), fc = fs(C), common = fb.filter((f) => fc.includes(f) && fa.includes(f));
  assert.ok(common.length > 20, 'same snapshots for compressed and plain clients');
  console.log(`2. compress once: OK (identical frames for A and B, plain JSON for C, ${common.length} common snapshots)`);

  // 3. A (nhận từ đầu, qua 2 điểm FULL_FLUSH khi B rồi C vào) và B (vào sau) đều giải liên tục: frame tăng dần
  for (const [name, f] of [['A', fa], ['B', fb]]) assert.ok(f.every((x, i) => i === 0 || x > f[i - 1]), `${name}: snapshot frames increase`);
  console.log('3. late joiners: OK (decode from their own reset point, earlier members unaffected)');

  // 4. B rớt giữa trận -> kết nối mới hello{tok} -> giải luồng mới từ đầu
  const tok = B.msgs.find((m) => m.t === 'you').tok;
  B.ws.terminate();
  await A.next((m) => m.t === 'drop');
  const B2 = client(true);
  await B2.open;
  B2.send({ t: 'join', code, v: NET.protocol });
  await B2.next((m) => m.t === 'room');
  B2.send({ t: 'hello', v: NET.protocol, pf: pf('P2'), tok });
  await B2.next((m) => m.t === 'start' && m.opts.resume);
  const before = fs(A).length;
  await B2.next((m) => m.t === 's');
  await sleep(500);
  const f2 = fs(B2);
  assert.ok(f2.length > 5 && f2.every((x, i) => i === 0 || x > f2[i - 1]), 'rejoined client decodes snapshots');
  assert.ok(fs(A).length > before, 'A keeps decoding after the rejoin reset point');
  assert.ok(B2.idx((m) => m.t === 'start') < B2.idx((m) => m.t === 's'), 'resume start before snapshots');
  console.log('4. rejoin: OK (new connection decodes from its reset point, others keep going)');

  origLog('OK');
  process.exit(0);
})().catch((e) => { origLog(e); process.exit(1); });
