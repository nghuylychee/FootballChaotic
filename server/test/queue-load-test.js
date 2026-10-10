/* Thử tải hàng chờ trận xếp hạng (src/net/matchmaker.js + server/index.js). Chạy tay, không nằm trong npm test.
 *   node server/test/queue-load-test.js [tốc độ1,tốc độ2,...]   (người vào hàng / giây, mặc định 5,20,50,100,200)
 * 1. Đo riêng bước ghép (Matchmaker.tick, máy chủ chạy 1 lần / giây) theo số vé đang chờ, kể cả trường hợp xấu nhất
 *    (không ai hợp ai: mỗi vé so với mọi vé khác) + dựng đội hình 1 trận (lineup: sinh người chơi giả)
 * 2. Máy chủ thật (tiến trình riêng): người chơi giả vào hàng đều đặn với tốc độ cho trước, Elo ngẫu nhiên 0–2000.
 *    Ghép xong -> vào phòng (hello) -> nhận start -> rời phòng ngay (bye): chỉ đo phần tìm trận + dựng phòng, không đo đá trận
 *    (đá trận: xem load-test.js). Mỗi mức: CPU máy chủ (% của 1 nhân), RAM, số vé đang chờ, thời gian chờ, tỉ lệ phải đá với bot.
 */
const path = require('path');
const { fork } = require('child_process');
const WebSocket = require('ws');

const RATES = (process.argv[2] || '5,20,50,100,200').split(',').map(Number);
const PORT = 20000 + Math.floor(Math.random() * 20000);
const RUN = 15;      // giây cho người vào hàng ở mỗi mức
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- máy chủ: index.js + báo số liệu qua IPC ---------- */
if (process.argv[2] === '--server') {
  const origLog = console.log;
  console.log = (...a) => { if (!/^\[(room|server|queue)/.test(String(a[0]))) origLog(...a); };
  const { rooms, queue } = require('../index.js');
  let lastCpu = process.cpuUsage(), lastT = process.hrtime.bigint(), peakQ = 0;
  setInterval(() => { peakQ = Math.max(peakQ, queue.size); }, 100);
  setInterval(() => {
    const cpu = process.cpuUsage(lastCpu), t = process.hrtime.bigint(), secs = Number(t - lastT) / 1e9;
    lastCpu = process.cpuUsage(); lastT = t;
    const m = process.memoryUsage();
    process.send({ cpu: ((cpu.user + cpu.system) / 1e6 / secs) * 100, rss: m.rss / 1048576, heap: m.heapUsed / 1048576, queue: peakQ, rooms: rooms.size });
    peakQ = queue.size;
  }, 1000);
  setTimeout(() => process.send({ ready: true }), 300);
  return;
}

const pct = (list, p) => { if (!list.length) return 0; const s = list.slice().sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };

/* ---------- 1. bước ghép trong tiến trình này ---------- */
function bench() {
  const { SFC } = require('../sim').load();
  const MM = SFC.Matchmaker, roles = globalThis.SFC_CONFIG.game.roles;
  const pf = (n) => ({ name: n, role: 'FWD', level: 1, look: {}, cores: null, mate: null });
  const time = (fn, reps) => { const t = process.hrtime.bigint(); for (let i = 0; i < reps; i++) fn(); return Number(process.hrtime.bigint() - t) / 1e6 / reps; };
  console.log('1. Matchmaker.tick (the server runs it once a second)');
  console.log('    waiting | worst case: nobody fits      | typical: Elo 0–2000, waited 0–15 s');
  for (const n of [10, 100, 500, 1000, 2000, 5000]) {
    // xấu nhất: Elo cách nhau xa, vừa vào hàng (khoảng ghép nhỏ nhất) -> không nhóm nào, mỗi vé so với mọi vé
    const worst = () => { const m = new MM(), now = Date.now(); for (let i = 0; i < n; i++) m.add({ id: 'w' + i, elo: i * 1000, role: roles[i % 2], pf: pf('W' + i), at: now }); m.tickets.forEach((t) => { t.alone = 1e9; }); return m; };
    const mw = worst();
    const tw = time(() => mw.tick(Date.now()), n >= 2000 ? 2 : 10);
    // thường: Elo ngẫu nhiên, thời gian chờ ngẫu nhiên -> ghép được phần lớn (đo cả việc tạo nhóm)
    let groups = 0;
    const tn = time(() => {
      const m = new MM(), now = Date.now();
      for (let i = 0; i < n; i++) m.add({ id: 'n' + i, elo: Math.floor(Math.random() * 2000), role: roles[i % 2], pf: pf('N' + i), at: now - Math.random() * 15000 });
      groups = m.tick(now).groups.length;
    }, n >= 2000 ? 2 : 10);
    console.log(`    ${String(n).padStart(7)} | ${tw.toFixed(2).padStart(8)} ms${''.padEnd(18)}| ${tn.toFixed(2).padStart(7)} ms (${groups} matches made)`);
  }
  const g = [0, 1, 2, 3].map((i) => ({ id: 'l' + i, elo: 400 + i * 50, role: roles[i % 2], pf: pf('L' + i), at: Date.now() - i * 1000 }));
  const tl2 = time(() => MM.lineup(g.slice(0, 2)), 200), tl4 = time(() => MM.lineup(g), 200);
  console.log(`    lineup for 1 match: ${tl2.toFixed(3)} ms (2 players + 2 AI players) · ${tl4.toFixed(3)} ms (4 players)`);
}

/* ---------- 2. máy chủ thật ---------- */
async function live() {
  const PROTOCOL = globalThis.SFC_CONFIG.net.protocol, roles = globalThis.SFC_CONFIG.game.roles;
  const srv = fork(__filename, ['--server'], { env: Object.assign({}, process.env, { PORT: String(PORT), MAX_PER_IP: '0', LOG_STATS: '0' }), stdio: ['ignore', 'inherit', 'inherit', 'ipc'] });
  let stats = [];
  await new Promise((res) => srv.on('message', (m) => { if (m.ready) res(); else stats.push(m); }));
  console.log('\n2. Real server: queue -> matched -> join room -> start -> leave at once');
  console.log('   joins/s | server CPU, 1 core (avg / peak) | RSS    | queue (peak) | wait until start: avg / p95 | solo');
  for (const rate of RATES) {
    const waits = [];
    let solo = 0, done = 0, started = 0, open = 0;
    const join = () => {
      started++; open++;
      const ws = new WebSocket(`ws://localhost:${PORT}`), t0 = Date.now(), name = 'P' + started;
      let finished = false;
      const end = (kind) => { if (finished) return; finished = true; open--; done++; if (kind === 'solo') solo++; else if (kind === 'start') waits.push((Date.now() - t0) / 1000); try { ws.close(); } catch (e) { /* bỏ qua */ } };
      ws.on('open', () => ws.send(JSON.stringify({ t: 'queue', v: PROTOCOL, elo: Math.floor(Math.random() * 2000), role: roles[started % 2], pf: { name, role: 'FWD', level: 1, look: {}, cores: null, mate: null } })));
      ws.on('message', (d) => {
        const m = JSON.parse(d);
        if (m.t === 'room') ws.send(JSON.stringify({ t: 'hello', v: PROTOCOL, pf: { name, role: 'FWD', level: 1, look: {}, cores: null, mate: null } }));
        else if (m.t === 'start') { ws.send(JSON.stringify({ t: 'bye' })); end('start'); }
        else if (m.t === 'solo') end('solo');
      });
      ws.on('error', () => end('error'));
      ws.on('close', () => end('error'));
    };
    stats = [];
    const every = 1000 / rate, t0 = Date.now();
    let next = t0;
    while (Date.now() - t0 < RUN * 1000) {
      while (next <= Date.now()) { join(); next += every; }
      await sleep(5);
    }
    // chờ người cuối ghép xong / đá với bot (tối đa maxWait + vài giây)
    const until = Date.now() + 40000;
    while (open > 0 && Date.now() < until) await sleep(100);
    const s = stats.filter((x) => x.queue > 0 || x.cpu > 0.5);
    const cpu = s.length ? s.reduce((a, x) => a + x.cpu, 0) / s.length : 0, peak = Math.max(0, ...stats.map((x) => x.cpu));
    const rss = Math.max(0, ...stats.map((x) => x.rss)), q = Math.max(0, ...stats.map((x) => x.queue));
    const avg = waits.length ? waits.reduce((a, b) => a + b, 0) / waits.length : 0;
    console.log(`   ${String(rate).padStart(7)} | ${cpu.toFixed(1).padStart(14)} % / ${peak.toFixed(1).padStart(5)} %     | ${rss.toFixed(0).padStart(3)} MB | ${String(q).padStart(12)} | ${avg.toFixed(1).padStart(13)} s / ${pct(waits, 0.95).toFixed(1)} s  | ${solo}/${done}${open ? ` (${open} unfinished)` : ''}`);
    await sleep(2000);
  }
  srv.kill();
}

(async () => {
  bench();
  await live();
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
