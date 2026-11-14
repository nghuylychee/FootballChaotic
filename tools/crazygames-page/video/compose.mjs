// Dựng 2 video xem trước CrazyGames từ các cảnh đã quay (capture.mjs) theo edit.json:
//   L = ngang 1920x1080 (16:9), P = dọc 1080x1620 (2:3). Không tiếng, khung đầu là ảnh cover (yêu cầu của CrazyGames).
// Máy quay: mỗi đoạn bám 1 điểm / 1 người / bóng / nắm đấm (track), độ phóng z nguyên (px game vuông đều), lia theo px video.
// Ra: tools/crazygames-page/out/cg-video-16x9.mp4 + cg-video-2x3.mp4 (ffmpeg phải có trong PATH)
// Cần server game: npm run serve. Chạy: node tools/crazygames-page/video/compose.mjs [L|P] [--stills v1,v2,...]
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { open, sleep } from './chrome.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'out');
const E = JSON.parse(readFileSync(join(HERE, 'edit.json'), 'utf8'));
const FPS = E.fps, DUR = E.segs[E.segs.length - 1].v1;
const FORMATS = { L: { w: 1920, h: 1080, file: 'cg-video-16x9.mp4' }, P: { w: 1080, h: 1620, file: 'cg-video-2x3.mp4' } };
const args = process.argv.slice(2);
const only = args.find((a) => FORMATS[a]);
const stillsArg = args.includes('--stills') ? args[args.indexOf('--stills') + 1].split(',').map(Number) : null;

const TAKES = {};
for (const s of E.segs) if (s.take && !TAKES[s.take]) TAKES[s.take] = JSON.parse(readFileSync(join(HERE, 'frames', s.take, 'meta.json'), 'utf8'));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const segAt = (v) => E.segs.find((s) => v >= s.v0 && v < s.v1) || E.segs[E.segs.length - 1];
const fidx = (s, v) => clamp(Math.round((s.c0 + (v - s.v0)) * FPS), 0, TAKES[s.take].frames.length - 1);

// điểm máy quay nhắm (toạ độ thế giới) ở khung f của cảnh
function aim(cam, f) {
  const pl = (i) => { const p = f.pl[i]; return { x: p[1], y: p[2] - Math.min(p[3], 40) }; };
  let p;
  if (cam.t === 'pt') p = { x: cam.x, y: cam.y };
  else if (cam.t === 'pl') p = pl(cam.i);
  else if (cam.t === 'ball') p = { x: f.ball[0], y: f.ball[1] - f.ball[2] };
  else if (cam.t === 'mix') { const a = pl(cam.a), b = pl(cam.b); p = { x: a.x + (b.x - a.x) * cam.k, y: a.y + (b.y - a.y) * cam.k }; }
  else if (cam.t === 'track') p = f.track || pl(cam.fb);
  return { x: p.x, y: p.y + (cam.dy || 0) };
}

// máy quay từng khung cho 1 định dạng: { take, idx, z, dx, dy, coverA }
function plan(fmt) {
  const { w, h } = FORMATS[fmt], N = Math.round(DUR * FPS), res = [];
  let cur = null, prev = null;
  for (let i = 0; i < N; i++) {
    const v = i / FPS, s = segAt(v);
    if (s.cover) { res.push({ coverA: 1 }); prev = s; continue; }
    const cam = Object.assign({}, s.cam, (fmt === 'P' && s.cam.P) || {});
    const z = fmt === 'L' ? cam.zl : cam.zp;
    const [W, H] = TAKES[s.take].size, idx = fidx(s, v);
    const raw = aim(cam, TAKES[s.take].frames[idx]);
    if (!cur || (s !== prev && s.cut) || cur.z !== z) cur = { x: raw.x, y: raw.y, z };
    else { const a = 1 - Math.exp(-1 / FPS / (s.blend || 0.3)); cur = { x: cur.x + (raw.x - cur.x) * a, y: cur.y + (raw.y - cur.y) * a, z }; }
    const hw = w / 2 / z, hh = h / 2 / z;
    const cx = clamp(cur.x, hw, W - hw), cy = clamp(cur.y, hh, H - hh);
    const coverA = s.fade ? clamp(1 - (v - s.v0) / s.fade, 0, 1) : 0;
    res.push({ take: s.take, idx, z, dx: Math.round(w / 2 - cx * z), dy: Math.round(h / 2 - cy * z), coverA });
    prev = s;
  }
  return res;
}

const { ev, errors, close } = await open('/tools/crazygames-page/video/compose.html', { port: 9434 });
try {
  for (let i = 0; i < 50; i++) { if (await ev('window.ready === true').catch(() => false)) break; await sleep(200); }
  for (const fmt of only ? [only] : Object.keys(FORMATS)) {
    const { w, h, file } = FORMATS[fmt], P = plan(fmt);
    const dir = join(HERE, 'render', stillsArg ? fmt + '-stills' : fmt);
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    const list = stillsArg ? stillsArg.map((v) => Math.min(P.length - 1, Math.round(v * FPS))) : P.map((_, i) => i);
    for (const i of list) {
      const p = P[i];
      const o = { w, h, z: p.z, dx: p.dx, dy: p.dy, coverA: p.coverA, cover: E.covers[fmt],
        frame: p.take ? `/tools/crazygames-page/video/frames/${p.take}/${String(p.idx).padStart(4, '0')}.png` : null };
      const png = await ev(`draw(${JSON.stringify(o)})`);
      const name = stillsArg ? `s_${(i / FPS).toFixed(2).padStart(5, '0')}.png` : `${String(i).padStart(4, '0')}.png`;
      writeFileSync(join(dir, name), Buffer.from(png.split(',')[1], 'base64'));
    }
    if (stillsArg) { console.log(fmt, 'stills ->', dir); continue; }
    mkdirSync(OUT, { recursive: true });
    const mp4 = join(OUT, file);
    // H.264 yuv420p (trình duyệt nào cũng chạy), không tiếng (-an), +faststart để phát ngay khi tải
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-framerate', String(FPS), '-i', join(dir, '%04d.png'),
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', mp4], { stdio: 'inherit' });
    console.log(fmt, P.length, 'frames ->', mp4);
  }
  if (errors.length) console.log('lỗi trong trang:', [...new Set(errors)].slice(0, 10));
} finally {
  close();
}
process.exit(0);
