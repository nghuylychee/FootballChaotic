/* Ảnh cho trang itch.io — vẽ bằng chính code render của game (sprites / background / renderer), phóng to pixel bằng số nguyên.
 * Chạy: npm run serve (cổng 8080) rồi node tools/itch-page/export.mjs -> ghi vào tools/itch-page/out
 * Ra: banner.png (960x240) · cover.png (630x500) · logo.png · h-*.png (tiêu đề mục).
 * Ảnh chụp trong game (shot-*.png): tools/itch-page/capture.mjs
 * Xem trước cả trang: tools/itch-page/mock.html
 */
function run() {
  const S = SFC.Sprites, L = SFC_CONFIG.teams.list, P = SFC_CONFIG.progression, C = SFC_CONFIG.game.combat;
  const INK = '#121316', GOLD = '#ffcf3f', RED = '#ff3d5a', PAPER = '#f3ead7';
  const PX = '"Press Start 2P"', VT = '"VT323"';
  const files = {};

  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').imageSmoothingEnabled = false;
    return c;
  }
  // phóng to k lần, giữ pixel vuông; w / h = cắt bớt sau khi phóng (vd. 630x501 -> 630x500)
  function upscale(src, k, w = src.width * k, h = src.height * k) {
    const c = canvas(w, h), x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    x.drawImage(src, 0, 0, src.width * k, src.height * k);
    return c;
  }
  function crop(src, sx, sy, w, h) {
    const c = canvas(w, h);
    c.getContext('2d').drawImage(src, sx, sy, w, h, 0, 0, w, h);
    return c;
  }
  const save = (name, c) => { files[name] = c.toDataURL('image/png'); };

  // chữ pixel sắc cạnh: vẽ to gấp K lần rồi lấy mẫu tâm từng ô K x K -> mỗi pixel của font thành đúng 1 pixel, không viền mờ.
  // shadows: [[dx, dy, màu], ...] vẽ từ cuối lên trước
  const K = 8;
  function text(ctx, str, x, y, size, color, { font = PX, align = 'left', shadows = [] } = {}) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    for (const [dx, dy, col] of shadows.slice().reverse().concat([[0, 0, color]])) {
      const hi = canvas(W * K, H * K), hx = hi.getContext('2d');
      hx.font = `${size * K}px ${font}`;
      hx.textBaseline = 'top';
      hx.textAlign = align;
      hx.textRendering = 'optimizeSpeed';   // không ghép chữ (fi, fl)
      hx.fillStyle = col;
      hx.fillText(str, (x + dx) * K, (y + dy) * K);
      const src = hx.getImageData(0, 0, W * K, H * K).data;
      const lo = canvas(W, H), lx = lo.getContext('2d'), img = lx.createImageData(W, H), d = img.data;
      for (let j = 0; j < H; j++) {
        for (let i = 0; i < W; i++) {
          const s = (((j * K + K / 2) * W * K) + i * K + K / 2) * 4;
          if (src[s + 3] < 128) continue;
          const o = (j * W + i) * 4;
          d[o] = src[s]; d[o + 1] = src[s + 1]; d[o + 2] = src[s + 2]; d[o + 3] = 255;
        }
      }
      lx.putImageData(img, 0, 0);
      ctx.drawImage(lo, 0, 0);
    }
  }

  /* ---------- cầu thủ / bóng vẽ lên ảnh nền ---------- */
  const skins = SFC_CONFIG.teams.skins;
  const look = (o) => Object.assign({ skin: skins[0], hair: P.hairColors[0], cut: 'classic', face: 'none', shoes: 'kicks', fx: 'nofx' }, o);
  const stub = { teams: [{ cfg: L.street_kings }, { cfg: L.neon_strikers }] };
  const HW = C.hard.windup, HK = C.hard.kickTime, LS = C.light.startup;
  const POSE = {
    dropkick: { atkType: 'hard', atkT: HW + HK * 0.55 },
    punch: { atkType: 'light', atkT: LS + 0.03 },
    run: { vx: 40, anim: 0.09 },
    stun: { state: 'stun', anim: 0.3 },
  };
  function player(ctx, team, x, y, facing, lk, pose = {}) {
    S.drawPlayer(ctx, Object.assign({ x, y, vx: 0, vy: 0, facing, anim: 0, flash: 0, state: 'normal', team, look: lk }, pose), stub);
  }
  function launched(ctx, team, x, y, airZ, lk) {
    SFC.Renderer.airborne(ctx, { x, y, airZ, kbx: 320, kby: -40, state: 'stun', anim: 0.42, facing: Math.PI, team, look: lk, vx: 0, vy: 0, flash: 0 }, stub);
  }
  // bị đá ngã nằm sõng soài: pha "sprawl" của PlayerSprite.flyState chỉ có sau khi đã bay rồi chạm đất -> cho cùng 1 cầu thủ bay, chạm đất, rồi vẽ.
  // dir 1 = bị hất sang phải (đầu nằm về bên phải). Sao choáng của sprite xoay ngang theo thân (thành 1 cột cạnh đầu) -> vẽ 2 bản:
  // bản không cờ choáng (không sao, mắt mở) làm nền, chép vùng mặt (mắt gạch choáng) từ bản có cờ choáng; sao đứng vẽ riêng (stunStars)
  function lying(ctx, team, x, y, lk, dir = 1) {
    const draw = (dazed) => {
      const p = { x, y, vx: 0, vy: 0, facing: Math.PI, anim: 0, flash: 0, state: 'stun', stateT: 1.6, team, look: lk, airZ: 10, kbx: 320 * dir, kby: 0 };
      SFC.PlayerSprite.flyState(p);
      p.anim = 0.5; p.airZ = 0;
      SFC.PlayerSprite.flyState(p);
      p.anim = 0.8;
      if (!dazed) { p.fly = SFC.PlayerSprite.flyState(p); p.state = 'normal'; }
      const c = canvas(ctx.canvas.width, ctx.canvas.height);
      S.drawPlayer(c.getContext('2d'), p, stub);
      return c;
    };
    const fw = 24, fx = dir < 0 ? x - 21 : x - 3, fy = y - 26;   // vùng mặt: đầu nằm về phía dir, sao của sprite ở ngoài mép đầu
    const plain = draw(false), dazed = draw(true), pc = plain.getContext('2d');
    pc.clearRect(fx, fy, fw, 30);
    pc.drawImage(dazed, fx, fy, fw, 30, fx, fy, fw, 30);
    ctx.drawImage(plain, 0, 0);
  }
  // sao choáng như PlayerSprite3 (dấu + vàng, tâm trắng) quay quanh (cx, cy): khung nằm sõng soài không vẽ sao
  function stunStars(ctx, cx, cy, phase = 0.4) {
    const { px } = S;
    for (let i = 0; i < 3; i++) {
      const a = phase * 6 + (i * Math.PI * 2) / 3, sx = cx + Math.round(Math.cos(a) * 11), sy = cy + Math.round(Math.sin(a) * 2);
      px(ctx, sx - 1, sy, 3, 1, '#ffe14f'); px(ctx, sx, sy - 1, 1, 3, '#ffe14f'); px(ctx, sx, sy, 1, 1, '#ffffff');
    }
  }
  function spark(ctx, x, y) {
    const { px } = S;
    px(ctx, x - 5, y, 11, 1, '#fff6a0'); px(ctx, x, y - 5, 1, 11, '#fff6a0');
    for (const [dx, dy] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) px(ctx, x + dx, y + dy, 1, 1, '#ffffff');
  }
  const comic = (ctx, str, x, y, col) => text(ctx, str, x, y, 8, col, { align: 'center', shadows: [[1, 0, INK], [-1, 0, INK], [0, 1, INK], [0, -1, INK], [1, 1, INK]] });

  const LOOK = {
    hero: look({ cut: 'mohawk', face: 'shades', shoes: 'flame', hair: '#ff3d5a', skin: skins[1] }),
    mate: look({ cut: 'cap', face: 'none', shoes: 'reds', skin: skins[2] }),
    rival: look({ cut: 'afro', hair: '#3ff6ff', skin: skins[3], shoes: 'neonkick' }),
    rival2: look({ cut: 'spiky', hair: '#ff8a3f', face: 'visor', skin: skins[0] }),
    ko: look({ cut: 'bowl', hair: '#f2d16b', skin: skins[4] }),
  };

  // cảnh hành động trên nền sân thật (toạ độ sân gốc 640x360)
  function scene(arena, draw) {
    const bg = SFC.Background.thumb(arena, 'street_kings', 'neon_strikers');
    const c = canvas(bg.width, bg.height), x = c.getContext('2d');
    x.drawImage(bg, 0, 0);
    draw(x);
    return c;
  }

  /* ---------- banner 960x240 (vẽ 480x120, phóng x2) ---------- */
  {
    const full = scene('village', (x) => {
      player(x, 1, 520, 122, Math.PI, LOOK.rival2, POSE.run);
      player(x, 0, 338, 128, 0, LOOK.mate, POSE.run);
      player(x, 0, 420, 134, 0, LOOK.hero, POSE.dropkick);
      S.drawBall(x, { x: 441, y: 137, z: 0, roll: 2, fx: {}, skin: null });
      launched(x, 1, 454, 132, 16, LOOK.rival);
      spark(x, 444, 114);
      comic(x, 'CRACK!', 478, 92, '#ffffff');
    });
    const b = crop(full, 80, 20, 480, 120), x = b.getContext('2d');
    const grad = x.createLinearGradient(0, 0, 250, 0);
    grad.addColorStop(0, 'rgba(10,11,14,0.94)'); grad.addColorStop(0.55, 'rgba(10,11,14,0.75)'); grad.addColorStop(1, 'rgba(10,11,14,0)');
    x.fillStyle = grad; x.fillRect(0, 0, 250, 120);
    text(x, 'STREET FOOTBALL', 16, 30, 8, '#ffffff', { shadows: [[1, 1, INK]] });
    text(x, 'CHAOS', 15, 42, 24, RED, { shadows: [[1, 1, INK], [2, 2, GOLD]] });
    text(x, 'A CHAOTIC FOOTBALL ROGUELITE.', 16, 78, 8, PAPER, { shadows: [[1, 1, INK]] });
    save('banner.png', upscale(b, 2));
  }

  /* ---------- cover 630x500 (vẽ 126x100, phóng x5): cận cảnh 1 cú đấm POW! trên sân làng ----------
   * Cận để người to ở cỡ ô duyệt game của itch (315x250); itch đã in tên + mô tả dưới ảnh nên không có dải chữ dưới */
  {
    const full = scene('village', (x) => {
      lying(x, 1, 421, 174, LOOK.ko, -1);
      stunStars(x, 409, 146);
      player(x, 1, 469, 170, Math.PI, LOOK.rival2, POSE.stun);
      player(x, 0, 452, 170, 0, LOOK.mate, POSE.punch);
      comic(x, 'POW!', 480, 128, '#ffe14f');
    });
    const b = crop(full, 386, 84, 126, 100), x = b.getContext('2d');
    // dải tối sau logo
    const top = x.createLinearGradient(0, 0, 0, 46);
    top.addColorStop(0, 'rgba(10,11,14,0.92)'); top.addColorStop(0.7, 'rgba(10,11,14,0.65)'); top.addColorStop(1, 'rgba(10,11,14,0)');
    x.fillStyle = top; x.fillRect(0, 0, 126, 46);
    text(x, 'STREET FOOTBALL', 63, 4, 8, '#ffffff', { align: 'center', shadows: [[1, 1, INK]] });
    text(x, 'CHAOS', 62, 14, 24, RED, { align: 'center', shadows: [[1, 1, INK], [2, 2, GOLD]] });
    save('cover.png', upscale(b, 5));
  }

  /* ---------- logo trong suốt (đầu phần mô tả) ---------- */
  {
    const b = canvas(168, 52), x = b.getContext('2d');
    text(x, 'STREET FOOTBALL', 84, 2, 8, '#ffffff', { align: 'center', shadows: [[1, 1, INK]] });
    text(x, 'CHAOS', 83, 13, 32, RED, { align: 'center', shadows: [[1, 1, INK], [2, 2, GOLD]] });
    save('logo.png', upscale(b, 3));
  }

  /* ---------- tiêu đề mục (ảnh, vì phần mô tả itch không dùng được font riêng) ---------- */
  const HEADERS = { brawl: 'BRAWL FOR THE BALL', powers: 'STACK YOUR POWERS', route: 'PLAN YOUR ROUTE', legends: 'SIGN THE LEGENDS', controls: 'CONTROLS', fullgame: 'FULL GAME' };
  for (const [id, label] of Object.entries(HEADERS)) {
    const b = canvas(300, 16), x = b.getContext('2d');
    x.fillStyle = INK; x.fillRect(0, 4, 7, 7);
    x.fillStyle = RED; x.fillRect(0, 4, 6, 6);
    text(x, label, 11, 3, 8, '#ffffff', { shadows: [[1, 1, INK]] });
    x.fillStyle = '#323742'; x.fillRect(0, 14, 300, 1);
    save(`h-${id}.png`, upscale(b, 2));
  }

  files['manifest.json'] = JSON.stringify({ generated: new Date().toISOString(), files: Object.keys(files).sort() }, null, 1);
  window.__files = files;
  window.__done = true;
}

// chờ font pixel như main.js rồi mới vẽ
Promise.race([
  Promise.all([document.fonts.load('8px "Press Start 2P"'), document.fonts.load('16px "VT323"')]),
  new Promise((r) => setTimeout(r, 1500)),
]).finally(() => {
  try { run(); } catch (e) { window.__error = String(e && e.stack || e); }
});
