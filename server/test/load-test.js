/* Thử tải: tăng dần số trận chạy cùng lúc tới khi máy chủ không giữ nổi 60 bước/giây.
 *   node server/test/load-test.js [mức1,mức2,...]      (mặc định 10,25,50,100,150,200,300,400)
 *   COMPRESSION=0 node server/test/load-test.js        so sánh khi tắt nén
 *   PLAYERS=4 node server/test/load-test.js            4 người / trận (2v2), mặc định 2
 * - Máy chủ chạy ở tiến trình riêng (fork), mỗi 2 giây báo: CPU % (của 1 nhân), RSS, heap, số bước mô phỏng / giây / trận
 * - Tiến trình này mở 2 WebSocket / trận (tạo phòng, vào phòng, START), mỗi khách gửi phím 10 lần/giây, đếm byte nhận
 * - Mỗi mức: chờ 3 giây cho ổn định rồi đo 6 giây. Dừng khi số bước / giây tụt dưới 57 hoặc CPU > 95%
 * Không phải test chạy tự động (npm test): tốn CPU, chạy tay khi cần ước lượng sức chứa.
 */
const path = require('path');
const { fork } = require('child_process');
const WebSocket = require('ws');

const LEVELS = (process.argv[2] || '10,25,50,100,150,200,300,400').split(',').map(Number);
const PLAYERS = Math.max(2, Math.min(4, +process.env.PLAYERS || 2));   // người / trận
const PORT = 20000 + Math.floor(Math.random() * 20000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- máy chủ: chạy index.js + báo số liệu qua IPC ---------- */
if (process.argv[2] === '--server') {
  const origLog = console.log;
  console.log = (...a) => { if (!/^\[(room|server)/.test(String(a[0]))) origLog(...a); };
  const { rooms, wireOut } = require('../index.js');
  let lastCpu = process.cpuUsage(), lastT = process.hrtime.bigint(), lastFrames = new Map(), lastWire = wireOut();
  setInterval(() => {
    const cpu = process.cpuUsage(lastCpu), t = process.hrtime.bigint(), secs = Number(t - lastT) / 1e9;
    lastCpu = process.cpuUsage(); lastT = t;
    // bước mô phỏng / giây của từng trận đang chạy
    let sum = 0, n = 0, min = Infinity;
    const frames = new Map();
    for (const [code, e] of rooms) {
      if (!e.room.active || e.room.introHold) continue;
      frames.set(code, e.room.frame);
      if (lastFrames.has(code)) { const r = (e.room.frame - lastFrames.get(code)) / secs; sum += r; n++; min = Math.min(min, r); }
    }
    lastFrames = frames;
    const m = process.memoryUsage(), wire = wireOut();
    process.send({ cpu: ((cpu.user + cpu.system) / 1e6 / secs) * 100, rss: m.rss / 1048576, heap: m.heapUsed / 1048576, rooms: rooms.size, tps: n ? sum / n : 0, minTps: n ? min : 0, wire: (wire - lastWire) / secs });
    lastWire = wire;
  }, 2000);
  return;
}

/* ---------- khách giả ---------- */
const PROTOCOL = (() => { require('../sim').load(); return globalThis.SFC_CONFIG.net.protocol; })();
const pf = (n, r) => ({ name: n, role: r, level: 1, look: {}, cores: null, mate: null });
let bytesIn = 0;
const all = [];

function client() {
  const ws = new WebSocket(`ws://localhost:${PORT}`);   // như trình duyệt: tự xin nén (permessage-deflate)
  const c = { ws, waiters: [] };
  ws.on('message', (data) => {
    bytesIn += data.length;
    if (!c.waiters.length) return;   // đang đá: không parse snapshot (tiết kiệm CPU cho máy đo)
    const m = JSON.parse(data);
    c.waiters = c.waiters.filter((w) => (w.fn(m) ? (w.res(m), false) : true));
  });
  ws.on('error', () => {});
  c.send = (m) => { if (ws.readyState === 1) ws.send(JSON.stringify(m)); };
  c.next = (fn) => new Promise((res, rej) => { c.waiters.push({ fn, res }); setTimeout(() => rej(new Error('timeout')), 15000); });
  c.open = new Promise((r) => ws.on('open', r));
  all.push(c);
  return c;
}

// 1 trận: người đầu tạo phòng, còn lại vào bằng mã. Vị trí xen kẽ FWD / DEF -> 2 người = 1v1, 4 người = 2v2 (phòng tự xếp slot)
async function startMatch(i) {
  const cs = Array.from({ length: PLAYERS }, client);
  await Promise.all(cs.map((c) => c.open));
  const [A] = cs;
  const room = A.next((m) => m.t === 'room');
  A.send({ t: 'create', v: PROTOCOL });
  const { code } = await room;
  await Promise.all(cs.slice(1).map((c) => { const j = c.next((m) => m.t === 'room'); c.send({ t: 'join', code, v: PROTOCOL }); return j; }));
  const ready = A.next((m) => m.t === 'lobby' && m.m.length === PLAYERS && m.m.every((x) => x.slot >= 0));
  for (const [k, c] of cs.entries()) {
    const joinedLobby = A.next((m) => m.t === 'lobby' && m.m.length === k + 1);
    c.send({ t: 'hello', v: PROTOCOL, pf: pf('P' + k + '_' + i, k % 2 ? 'DEF' : 'FWD') });
    await joinedLobby;   // vào lần lượt để slot xếp đúng như người thật
  }
  await ready;
  const started = cs[1].next((m) => m.t === 'start');
  A.send({ t: 'begin', area: 0 });
  await started;
  for (const c of cs) c.send({ t: 'intro' });
  // phím: 10 lần / giây mỗi khách (thực tế chỉ gửi khi đổi phím -> đây là mức nặng)
  for (const c of cs) c.timer = setInterval(() => c.send({ t: 'i', d: (Math.random() * 4096) | 0, p: Math.random() < 0.1 ? 256 : 0 }), 100);
}

(async () => {
  const srv = fork(__filename, ['--server'], { env: Object.assign({}, process.env, { PORT: String(PORT), MAX_PER_IP: '0', MAX_ROOMS: '100000' }), stdio: ['ignore', 'inherit', 'inherit', 'ipc'] });
  let stats = null;
  srv.on('message', (s) => { stats = s; });
  await sleep(1500);
  console.log(`compression ${process.env.COMPRESSION === '0' ? 'OFF' : 'ON'} · ${PLAYERS} players per match`);
  console.log('matches | server CPU (1 core) | ticks/s avg (min) | RSS     | heap    | per player on the wire');
  let running = 0;
  for (const level of LEVELS) {
    const add = [];
    for (; running < level; running++) add.push(startMatch(running));
    await Promise.all(add);
    await sleep(3000);
    // đo 6 giây: lấy trung bình các báo cáo 2 giây
    const samples = [], b0 = bytesIn, t0 = Date.now();
    for (let k = 0; k < 3; k++) { stats = null; while (!stats) await sleep(50); samples.push(stats); }
    const avg = (key) => samples.reduce((s, x) => s + x[key], 0) / samples.length;
    const perPlayer = avg('wire') / (running * PLAYERS) / 1024;
    const cpu = avg('cpu'), tps = avg('tps'), minTps = Math.min(...samples.map((x) => x.minTps));
    console.log(`${String(level).padStart(7)} | ${cpu.toFixed(0).padStart(5)} %${' '.repeat(13)} | ${tps.toFixed(1).padStart(5)} (${minTps.toFixed(0).padStart(2)})${' '.repeat(6)} | ${avg('rss').toFixed(0).padStart(4)} MB | ${avg('heap').toFixed(0).padStart(4)} MB | ${perPlayer.toFixed(1)} KB/s`);
    if (tps < 57) { console.log(`stopped: server can no longer keep 60 ticks/s at ${level} matches`); break; }
    // nén chạy ở luồng phụ của Node nên CPU vượt 100% được; trên máy chủ thuê, tổng CPU này mới là thứ bị giới hạn
    if (cpu > 95) { console.log(`stopped: ${cpu.toFixed(0)}% CPU at ${level} matches (more than 1 core in total)`); break; }
  }
  for (const c of all) { clearInterval(c.timer); c.ws.terminate(); }
  srv.kill();
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
