// Mở game trong Chrome headless qua DevTools protocol, chờ tới menu (game tự nạp sprite 2x src/render/player/*.js). Dùng chung cho các script vẽ bảng.
// Cần server game đang chạy: npm run serve (mặc định http://localhost:8080; đổi bằng biến môi trường SPRITE_URL). Chrome: biến CHROME
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

export const HERE = dirname(fileURLToPath(import.meta.url));
export const OUT = join(HERE, 'out');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.SPRITE_URL || 'http://localhost:8080';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// port: cổng DevTools riêng cho mỗi script (chạy song song không đụng nhau)
export async function openGame(port) {
  const prof = mkdtempSync(join(tmpdir(), 'sfc-sprite-'));
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, '--window-size=1280,720', 'about:blank'], { stdio: 'ignore' });
  let targets;
  for (let i = 0; i < 50; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); if (targets.find((t) => t.type === 'page')) break; } catch {} await sleep(200); }
  const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0; const wait = new Map(); const errors = [];
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; wait.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  });
  // chạy biểu thức trong trang, trả giá trị (lỗi: in ra, trả null)
  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result?.exceptionDetails) { console.log('EXC', (r.result.exceptionDetails.exception?.description || JSON.stringify(r.result.exceptionDetails)).slice(0, 1500)); return null; }
    return r.result?.result?.value;
  };
  const key = async (code, k, vk) => { await send('Input.dispatchKeyEvent', { type: 'keyDown', code, key: k, windowsVirtualKeyCode: vk }); await send('Input.dispatchKeyEvent', { type: 'keyUp', code, key: k, windowsVirtualKeyCode: vk }); };
  await send('Runtime.enable'); await send('Page.enable');
  await send('Page.navigate', { url: BASE + '/index.html?lang=en' });
  // qua màn mở đầu (Enter) tới menu
  for (let i = 0; i < 80; i++) { const s = await ev('window.SFC && SFC.app && SFC.app.screen'); if (s === 'menu') break; if (i % 4 === 3) await key('Enter', 'Enter', 13); await sleep(300); }
  await sleep(1000);
  const close = () => { ws.close(); chrome.kill(); setTimeout(() => { try { rmSync(prof, { recursive: true, force: true }); } catch {} }, 500); };
  return { ev, close, errors, send };
}

// ghi kết quả: chuỗi data URL -> <dir>/<tên>.png; object có img -> png + phần còn lại vào manifest.json
// merge = giữ mục manifest cũ của bảng không vẽ lại (pilot.mjs --only)
export function save(dir, res, merge = false) {
  mkdirSync(dir, { recursive: true });
  const mf = join(dir, 'manifest.json'), man = merge && existsSync(mf) ? JSON.parse(readFileSync(mf, 'utf8')) : {};
  for (const [k, v] of Object.entries(res)) {
    const png = (d) => writeFileSync(join(dir, k + '.png'), Buffer.from(d.split(',')[1], 'base64'));
    if (typeof v === 'string' && v.startsWith('data:')) png(v);
    else if (v && v.img) { png(v.img); man[k] = Object.assign({}, v, { img: undefined }); }
    else man[k] = v;
  }
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(man, null, 1));
}

// đoạn code chạy trong trang, dùng chung: dữ liệu game + người mẫu + bảng ô (ctx scale x2: code game vẽ gấp đôi, sprite 2x vẽ ở lưới mịn)
export const PAGE_COMMON = `
  const PlayerSprite = SFC.PlayerSprite;
  const T = SFC_CONFIG.teams, PR = SFC_CONFIG.progression, GC = SFC_CONFIG.game, RN = GC.fx.run;
  const HOME = T.list[T.order[0]].kit, AWAY = T.list[T.order[1]].kit;
  const lookOf = (o = {}) => SFC.Profile.lookOf(Object.assign({}, PR.defaultLook, o));
  const G = (kit) => ({ teams: [{ cfg: { kit } }], inKeeperZone: () => true, effects: { V: {} } });
  const DIRS = { front: Math.PI / 2, diag: Math.PI / 4, side: 0, back: -Math.PI / 2, sideL: Math.PI, diagL: Math.PI * 0.75 };
  const FAC = ['front', 'diag', 'side', 'back', 'sideL', 'diagL'];
  const P = (o) => Object.assign({ x: 0, y: 0, vx: 0, vy: 0, facing: DIRS.front, anim: 0.3, state: 'normal', flash: 0, team: 0, role: 'MID', look: lookOf(), keeper: false, airZ: 0 }, o);
  const OLD = SFC.Sprites, NEW = Object.assign({}, OLD, { drawPlayer: PlayerSprite.drawPlayer });
  const BG = '#3d6b3f';
  const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; };
  // bảng cols x rows ô cw x ch (px mịn). cell(k, r) -> [today, fn(ctx, x, y), cx?]: today = sprite hiện tại vẽ 1x rồi phóng đôi; còn lại vẽ trên ctx scale x2
  function sheet(cols, rows, cw, ch, cell, base = 6) {
    const [c, x] = cv(cols * cw, rows * ch); x.fillStyle = BG; x.fillRect(0, 0, c.width, c.height);
    const [s, sx] = cv(cw / 2, ch / 2), [b, bx] = cv(cw, ch);
    for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
      const res = cell(k, r); if (!res) continue;
      const [today, fn, cxw] = res, cx = cxw != null ? cxw : cw / 4, cy = ch / 2 - base;
      if (today) { sx.fillStyle = BG; sx.fillRect(0, 0, s.width, s.height); fn(sx, cx, cy); x.drawImage(s, k * cw, r * ch, cw, ch); }
      // vẽ vào ô nháp cỡ 1 ô rồi chép vào bảng: vẽ thẳng lên canvas bảng (rất lớn) chậm ~100 lần (đo 2026-11-01: 50 ms / người so với 0.4 ms)
      else { bx.setTransform(1, 0, 0, 1, 0, 0); bx.globalAlpha = 1; bx.globalCompositeOperation = 'source-over'; bx.fillStyle = BG; bx.fillRect(0, 0, cw, ch); bx.scale(2, 2); fn(bx, cx, cy); x.drawImage(b, k * cw, r * ch); }
      x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    }
    return c.toDataURL();
  }
`;
