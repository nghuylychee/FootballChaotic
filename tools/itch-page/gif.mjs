// GIF cho trang itch.io, quay trong 1 trận thường act 1 (mô phỏng thật, AI đá thay ghế người chơi), dàn cảnh từng khoảnh khắc:
//   meteor: cầu thủ người chơi có 3 Core Striker (mở Meteor Shot), cầm bóng ở phần sân nhà ~360 px trước khung thành đối thủ
//           (gần hơn thì bóng Meteor tới khung thành còn cao hơn xà, goalHeight, bật ra), 2 hậu vệ đối thủ lao ra đón; ra chiêu.
//           Chỉ nhận lần chính quả Meteor vào lưới.
//   brawl:  cầu thủ người chơi đứng giữa đám đông, đối thủ cầm bóng lao tới; người chơi đấm (light attack) rồi đạp (hard attack).
//           Chỉ nhận lần cả đấm lẫn đạp đều trúng.
// Đồng hồ trang bị thay bằng đồng hồ giả: mỗi khung GIF = 2 bước mô phỏng 60 Hz -> GIF 30 fps đúng tốc độ thật dù chụp chậm.
// Chỉ chụp khung có "máy quay" bám theo hành động (cả sân thì quá nhỏ) -> GIF 768x432 (ZOOM).
// Ẩn chữ thông báo giữa màn (GOAL!...). Chọn đối thủ áo khác màu hẳn đội mình (khỏi trông như 1 đội), không chọn đội bồ câu (rải đầy sân).
// Cần server: npm run serve hoặc bản demo đã build; địa chỉ: biến SPRITE_URL. Chrome: biến CHROME. Cần ffmpeg trong PATH.
// GIF 64 màu (nhìn không khác 128 màu, nhẹ hơn ~25%): itch nên giữ mỗi GIF dưới 3 MB.
// Chạy: node tools/itch-page/gif.mjs <file.gif> [meteor|brawl]
import { writeFileSync, mkdirSync, mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { openGame } from '../sprite-v2/cdp.mjs';

const out = process.argv[2], KIND = process.argv[3] || 'meteor';
if (!out || !['meteor', 'brawl'].includes(KIND)) { console.error('dùng: node tools/itch-page/gif.mjs <file.gif> [meteor|brawl]'); process.exit(1); }
// khung máy quay (px game) + DPR: meteor 384x216 ở 2 px / px game (bóng bay xa) · brawl 256x144 ở 3 px / px game (đòn đánh nhỏ). Đều ra GIF 768x432
const ZOOM = KIND === 'brawl' ? 3 : 2, CW = 768 / ZOOM, CH = 432 / ZOOM, TRIES = 15;
const OPP = ['moped_boys', 'school_ghosts'];   // đội act 1 áo khác màu đội người chơi
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const { ev, close, errors, send } = await openGame(9433);
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: ZOOM / 2, mobile: false });   // khung nhìn 640x360 px game trên 1280x720 CSS px
const key = async (code, k, vk) => { await send('Input.dispatchKeyEvent', { type: 'keyDown', code, key: k, windowsVirtualKeyCode: vk }); await send('Input.dispatchKeyEvent', { type: 'keyUp', code, key: k, windowsVirtualKeyCode: vk }); };

await key('Enter', 'Enter', 13); await sleep(800);   // lần đầu mở: chọn ngôn ngữ English
await ev("SFC.Profile.setName('KAI')");
// run mới tới khi act 1 có nút trận với đội trong OPP đi được ngay (map sinh ngẫu nhiên)
let match = null;
for (let i = 0; i < 20 && !match; i++) {
  match = await ev(`(() => {
    const Run = SFC.Run, roles = Run.roles('FWD'), c = Run.candidates(), mates = {};
    roles.slice(1).forEach((r, i) => { mates[r] = c[i]; });
    const R = Run.start(mates, roles[0]); R.actNew = false; R.seen.push('intro:0'); SFC.Profile.save();
    const n = Run.available().find((x) => x.kind === 'match' && ${JSON.stringify(OPP)}.includes(x.team));
    return n ? n.id + '|' + n.team : null;
  })()`);
}
if (!match) { console.error('không ra được nút trận với ' + OPP.join(' / ')); close(); process.exit(1); }
await ev("SFC.app.toMenu('home')"); await sleep(300);
await ev("SFC.Menu.go('runmap')"); await sleep(1000);
await ev(`(() => { SFC.Run.enter(${JSON.stringify(match.split('|')[0])}); SFC.app.startRunMatch(); return 1; })()`);
console.log('trận với', match.split('|')[1]);
await sleep(2500);
for (let i = 0; i < 40; i++) {
  if ((await ev('SFC.app.game && SFC.app.game.state')) === 'play') break;
  await key('Enter', 'Enter', 13); await sleep(500);
}
await ev('(() => { const g = SFC.app.game; g.dropSeat(g.me); return 1; })()');
for (let i = 0; i < 100; i++) { if ((await ev('SFC.app.game.time')) > 7) break; await sleep(200); }   // qua thẻ luật trận

// đồng hồ giả + ẩn chữ thông báo giữa màn
await ev(`(() => {
  const real = performance.now.bind(performance), clk = window.__clk = { t: real() + 200, cb: null };
  performance.now = () => clk.t;
  window.requestAnimationFrame = (cb) => { clk.cb = cb; return 1; };
  window.__pump = (n) => { for (let i = 0; i < n; i++) { clk.t += 1000 / 60; const cb = clk.cb; clk.cb = null; if (cb) cb(clk.t); } };
  SFC.UI.el.banner.style.visibility = 'hidden';
  return 1;
})()`);
await sleep(300);

/* ---------- các cảnh: setup (1 lần) · stage (dàn cảnh) · step(i, st) mỗi khung -> 'stop' | 'fail' | undefined · cam(st) tâm máy quay · ok() ---------- */
const SCENES = {
  meteor: () => {
    const PRE = 6, POST = 150;
    let fired = false, goal = -1, meteor = false, my0 = 0;   // meteor: khung trước, bóng còn là bóng Meteor
    return {
      setup: `(() => { const g = SFC.app.game, p = g.seats[g.me].p; for (const id of ['sniper_foot', 'banana_kick', 'fire_shot']) g.cores.add(p, id); return 1; })()`,
      // người chơi cầm bóng; 2 hậu vệ đối thủ đứng giữa người chơi và khung thành, đủ xa để chưa tắc kịp trước khi người chơi bật nhảy;
      // 2 đồng đội chạy theo phía sau
      stage: `(() => {
        const g = SFC.app.game, p = g.seats[g.me].p, goal = g.attackGoal(p.team), dir = g.teams[p.team].dir;
        p.x = goal.x - dir * 360; p.y = goal.y + 25; p.vx = p.vy = 0; p.state = 'normal'; p.airZ = 0;
        g.ball.x = p.x + dir * 6; g.ball.y = p.y; g.gainPossession(p);
        g.players.filter((q) => q.team !== p.team && !g.canKeep(q)).forEach((q, i) => { q.x = p.x + dir * (130 + i * 40); q.y = p.y + (i ? 45 : -40); q.vx = q.vy = 0; });
        g.players.filter((q) => q.team === p.team && q !== p && !g.canKeep(q)).forEach((q, i) => { q.x = p.x - dir * (50 + i * 20); q.y = p.y + (i ? 50 : -55); q.vx = q.vy = 0; });
        return 1;
      })()`,
      start(st) { my0 = st.my; },
      async step(i, st) {
        // năng lượng nạp ngay lúc ra chiêu (nạp sớm thì AI tự ra chiêu trước); trong lúc cut-in AI không được sút / chuyền mất (chiêu xịt)
        if (i === PRE) {
          fired = await ev(`(() => { const g = SFC.app.game, p = g.seats[g.me].p; p.res.ult = 1; const r = g.cores.activateUltimate(p);
            if (r) { p.charging = false; p.charge = 0; p.noActT = SFC_CONFIG.cores.ultimate.cutIn + 0.05; } return r; })()`);
          if (!fired) return 'fail';
        }
        if (goal < 0 && st.my > my0) goal = meteor ? i : -2;   // bàn từ bóng bật ra (người khác chạm) không tính
        meteor = st.m;
        if (goal === -2 || i >= PRE + POST) return 'fail';
        if (goal >= 0 && i - goal >= 20) return 'stop';   // dừng ~0,7 s sau bàn thắng (trước màn ăn mừng)
      },
      freeze: () => goal >= 0,   // máy quay đứng yên từ lúc vào lưới
      cam: (st) => st.bx + st.dir * 90,   // bám bóng, nhìn về phía khung thành
      ok: () => fired && goal >= 0,
    };
  },
  brawl: () => {
    // thứ tự đòn; mỗi đòn chờ đúng tầm (đấm: đối thủ sát trước mặt · đạp: cách 16–44 px như AI) và ≥ 0,5 s sau đòn trước
    const PLAN = ['light', 'hard'];
    let k = 0, last = -99, pending = null, end = -1;
    const hits = { light: 0, hard: 0 };
    return {
      setup: '1',
      // giữa sân: đối thủ cầm bóng lao về phía người chơi, 2 đối thủ khác + 2 đồng đội đứng quanh
      stage: `(() => {
        const g = SFC.app.game, p = g.seats[g.me].p, f = g.field, dir = g.teams[p.team].dir;
        const foes = g.players.filter((q) => q.team !== p.team && !g.canKeep(q)), mates = g.players.filter((q) => q.team === p.team && q !== p && !g.canKeep(q));
        p.x = f.cx; p.y = f.cy; p.vx = p.vy = 0; p.state = 'normal'; p.airZ = 0; p.cd.light = p.cd.hard = 0;
        const o = foes[0];
        o.x = p.x + dir * 34; o.y = p.y + 4; o.vx = o.vy = 0; o.state = 'normal';
        g.ball.x = o.x - dir * 6; g.ball.y = o.y; g.gainPossession(o);
        foes.slice(1).forEach((q, i) => { q.x = p.x + dir * (60 + i * 10); q.y = p.y + (i ? 34 : -34); q.vx = q.vy = 0; });
        mates.forEach((q, i) => { q.x = p.x - dir * 30; q.y = p.y + (i ? 40 : -40); q.vx = q.vy = 0; });
        return 1;
      })()`,
      start() {},
      async step(i) {
        if (pending && i - pending.i >= (pending.t === 'hard' ? 26 : 14)) {   // sau khi ra đòn: đúng người bị nhắm bị choáng / mất bóng (đấm) hay bay lên (đạp)
          if (await ev(`(() => { const g = SFC.app.game, q = g.players.find((x) => x.id === ${JSON.stringify(pending.o.id)}); if (!q) return false;
            return ${pending.t === 'hard'} ? q.airZ > 3 || q.state === 'stun' : q.state === 'stun' || (${pending.o.had} && g.ball.owner !== q); })()`)) hits[pending.t]++;
          pending = null;
          if (k >= PLAN.length) end = i;
        }
        if (end >= 0) return i - end >= 15 ? 'stop' : undefined;
        if (i > 200) return 'fail';
        const t = PLAN[k];
        if (!t || i - last < 15 || pending) return;
        // quay mặt về đối thủ gần nhất rồi ra đòn khi đúng tầm
        const r = await ev(`(() => {
          const g = SFC.app.game, p = g.seats[g.me].p, A = SFC.Actions;
          if (p.state !== 'normal' || p.airZ > 0) return false;
          let o = null, d = 1e9;
          for (const q of g.players) if (q.team !== p.team && !g.canKeep(q) && q.state === 'normal' && q.airZ <= 0) { const dd = Math.hypot(q.x - p.x, q.y - p.y); if (dd < d) { d = dd; o = q; } }
          if (!o || !(${t === 'light'} ? d < 24 : d > 16 && d < 44)) return false;
          p.facing = Math.atan2(o.y - p.y, o.x - p.x);
          return (${t === 'light'} ? A.lightAttack(g, p) : A.hardAttack(g, p)) ? { id: o.id, had: g.ball.owner === o } : false;
        })()`);
        if (r) { pending = { t, i, o: r }; last = i; k++; }
      },
      freeze: () => false,
      cam: (st) => st.px,   // bám người chơi
      ok: () => hits.light > 0 && hits.hard > 0,
    };
  },
};

// toạ độ sân -> toạ độ màn (CSS px; ảnh chụp nhân DPR) + giới hạn máy quay
const V = JSON.parse(await ev(`(() => {
  const g = SFC.app.game, f = g.field;
  const S = SFC.Renderer.screen, r = document.getElementById('game').getBoundingClientRect(), k = r.width / S.w;
  return JSON.stringify({ k, ox: r.left - S.x * k, oy: r.top - S.y * k, x0: f.x - 30, x1: f.x + f.w + 30, gy: f.cy });
})()`));
const clampCam = (x) => Math.min(V.x1 - CW / 2, Math.max(V.x0 + CW / 2, x));
const state = async (n) => JSON.parse(await ev(`(() => { __pump(${n}); const g = SFC.app.game, p = g && g.seats[g.me].p;
  return JSON.stringify(g ? { s: g.state, my: g.teams[p.team].score, m: !!(g.ball.fx && g.ball.fx.meteor), bx: g.ball.x, px: p.x, dir: g.teams[p.team].dir } : null); })()`));

const dir = mkdtempSync(join(tmpdir(), 'sfc-gif-'));
let ok = false, setupDone = false;
for (let tr = 0; tr < TRIES && !ok; tr++) {
  for (const f of readdirSync(dir)) rmSync(join(dir, f));
  const sc = SCENES[KIND]();
  if (!setupDone) { await ev(sc.setup); setupDone = true; }
  // chờ giữa trận (không phải bàn thắng / chọn Core)
  for (let i = 0; i < 600; i++) { const st = await state(2); if (st && st.s === 'play') break; if (i % 30 === 29) await key('Digit1', '1', 49); }
  await state(90);   // 1,5 s cho chữ bật ra / sao choáng của lần trước tắt hẳn
  await ev(sc.stage);
  sc.start(await state(0));
  let n = 0, cam = null, res;
  for (let i = 0; ; i++) {
    const st = await state(2);
    if (!st || st.s === 'ended') { res = 'fail'; break; }
    res = await sc.step(i, st);
    if (res === 'fail') break;
    if (!sc.freeze()) cam = cam === null ? clampCam(sc.cam(st)) : cam + (clampCam(sc.cam(st)) - cam) * 0.12;   // máy quay lia mượt
    const clip = { x: Math.round(V.ox + (cam - CW / 2) * V.k), y: Math.round(V.oy + (V.gy - CH * 0.55) * V.k), width: Math.round(CW * V.k), height: Math.round(CH * V.k), scale: 1 };
    writeFileSync(join(dir, `f${String(n++).padStart(4, '0')}.png`), Buffer.from((await send('Page.captureScreenshot', { format: 'png', clip })).result.data, 'base64'));
    if (res === 'stop') break;
  }
  ok = res === 'stop' && sc.ok();
  console.log(`lần ${tr + 1}: ${ok ? 'được' : 'không được'}`);
}
close();
if (!ok) { console.error('không có lần nào đạt'); process.exit(1); }
mkdirSync(dirname(out), { recursive: true });
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '30', '-i', join(dir, 'f%04d.png'),
  '-vf', 'split[a][b];[a]palettegen=max_colors=64:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle', '-loop', '0', out]);
rmSync(dir, { recursive: true, force: true });
console.log(`gif -> ${out}`);
if (errors.length) console.log('lỗi trong trang:', errors);
process.exit(0);
