/* VFX Sandbox (Giai đoạn 0) — trang thử bộ công cụ hiệu ứng (systems/vfxkit.js + render/vfx.js).
 * "Khoảnh khắc" = bản nháp ghép các viên gạch cho từng Core trong docs/CORE_DESIGN.md, để duyệt độ đã mắt
 * trước khi làm Core thật (logic gameplay ở đây là tạm, Giai đoạn 3 sẽ chuyển vào systems/cores.js).
 */
(function () {
  const U = SFC.U, Act = SFC.Actions;
  const STEP = 1 / 60;
  const $ = (id) => document.getElementById(id);

  // sandbox: không chọn Core giữa trận, không hết giờ
  SFC_CONFIG.game.match.maxUpgrades = 0;

  let g = null;
  let aiOn = false;
  let paused = false;   // debug: dừng vòng lặp của trang để tua bằng step()
  const timers = [];     // { t, fn } — đếm theo thời gian thật (chạy cả lúc hit-stop)
  const watchers = [];   // fn(dt) -> true = xong
  const later = (t, fn) => timers.push({ t, fn });
  const every = (fn) => watchers.push(fn);

  // AI có thể tắt để mục tiêu đứng yên khi xem hiệu ứng
  const aiUpdate = SFC.AI.update.bind(SFC.AI);
  SFC.AI.update = (dt, game) => {
    if (aiOn) return aiUpdate(dt, game);
    for (const p of game.players) if (!(p.isControlled && game.isHuman(p.team))) { p.intent.mx = p.intent.my = 0; p.intent.sprint = false; }
  };

  const me = () => g.teams[0].players[1];
  const opps = () => g.teams[1].players;
  const fx = () => g.effects;
  const dir = () => g.teams[0].dir;
  const nearest = (list, p) => list.reduce((a, b) => (U.dist(b, p) < U.dist(a, p) ? b : a));

  function newGame() {
    timers.length = 0; watchers.length = 0;
    g = new SFC.Game({ home: 'street_kings', away: 'neon_strikers', difficulty: 'normal', humanTeam: 0, solo: [1, null] });
    arrange();
  }

  // xếp cảnh: cầu thủ vàng giữ bóng giữa sân, 2 đối thủ đứng chắn trước mặt
  function arrange() {
    const f = g.field;
    timers.length = 0; watchers.length = 0;
    g.state = 'play';
    g.freezeT = 0; g.slowT = 0;
    g.effects.clearHazards();
    g.effects._vw = null; g.effects._vo = null; // xoá sạch VFX (chữ comic, vết nứt, cut-in...)
    g.effects.particles.length = 0; g.effects.texts.length = 0;
    const place = (p, x, y, facing) => Object.assign(p, {
      x, y, vx: 0, vy: 0, kbx: 0, kby: 0, airZ: 0, airVz: 0, state: 'normal', stateT: 0, hitImmune: 0, atkType: null,
      facing, sizeTarget: 1, sizeT: 0,
    });
    place(me(), f.x + 190, f.cy, 0);
    place(g.teams[0].players[0], f.x + 80, f.cy - 60, 0);
    place(opps()[0], f.x + 228, f.cy - 12, Math.PI);
    place(opps()[1], f.x + 236, f.cy + 24, Math.PI);
    g.ball.reset(me().x, me().y);
    g.gainPossession(me());
  }

  function giveBall(p) { if (g.ball.owner !== p) { g.ball.owner = null; g.gainPossession(p); } }

  // hất tung o ra xa khỏi điểm from
  function launch(o, from, kb = 300, up = 200, stun = 1.1, d = null) {
    d = d || U.norm(o.x - from.x, o.y - from.y + 0.01);
    o.hitImmune = 0;
    o.hit({ stun, kbx: d.x * kb, kby: d.y * kb, launch: up, type: 'hard' });
  }

  // chờ người nhảy chạm đất lần đầu
  function onLand(p, fn) {
    let falling = false;
    every(() => {
      if (p.airVz < 0) falling = true;
      if (falling && (p.airZ <= 0.05 || p.airVz >= 0)) { fn(); return true; }
      return false;
    });
  }

  // Tuyệt kỹ mở màn bằng cut-in: dừng hình trong lúc dải chân dung chạy qua
  function ultimate(p, name, color, then) {
    fx().cutIn(p.id, name, color, 0.8);
    g.hitStop(0.8);
    g.sfx('upgrade');
    later(0.8, then);
  }

  /* ================= KHOẢNH KHẮC ================= */
  const MOMENTS = [
    { key: '1', name: 'Dậm Đất', sub: 'Võ Sĩ Đá · SW DC SH HS', color: '#8847ff', run() {
      const p = me();
      p.airVz = 240; p.airZ = 0.5;
      fx().burst(p.x, p.y, 0, '#8a7f70', 10, 60);
      g.sfx('whoosh');
      onLand(p, () => {
        const R = 58;
        g.hitStop(0.09);
        fx().zoom(p.x, p.y - 6, 0.16, 0.3);
        fx().wave(p.x, p.y, R, '#ffffff', 0.55, 3);
        fx().wave(p.x, p.y, R * 0.6, '#ffe14f', 0.4, 2);
        fx().decal('crack', p.x, p.y, 1.8, 4);
        fx().shake(7, 0.4);
        fx().burst(p.x, p.y, 0, '#8a7f70', 24, 140, 0.7);
        fx().comic(p.x, p.y - 34, 'RẦM!', '#ffe14f', 1.3);
        for (const o of opps()) if (U.dist(o, p) < R) launch(o, p, 160, 230, 1.2);
        g.sfx('hit');
      });
    } },
    { key: '2', name: 'Tay Cao Su', sub: 'Đấu Sĩ + Tiki-taka · LB CO HS', color: '#ff8ac0', run() {
      const p = me(), o = nearest(opps(), p);
      fx().stretch(p.id, o.x, o.y, 0.45);
      g.sfx('whoosh');
      later(0.18, () => {
        const d = U.norm(p.x - o.x, p.y - o.y);
        g.hitStop(0.07);
        fx().zoom(o.x, o.y, 0.12, 0.25);
        fx().comic(o.x, o.y - 26, 'BOING!', '#ff8ac0');
        fx().burst(o.x, o.y, 10, '#fff6a0', 10, 90);
        o.hitImmune = 0;
        o.hit({ stun: 0.7, kbx: d.x * 260, kby: d.y * 260, type: 'light' });
        g.sfx('tackle');
      });
    } },
    { key: '3', name: 'Đại Phân Thân', sub: 'Tuyệt kỹ Ảo Ảnh · CL CO IF', color: '#9d7bff', run() {
      const p = me();
      ultimate(p, 'ĐẠI PHÂN THÂN', '#9d7bff', () => {
        const o = g.ball.owner && g.ball.owner.team === 1 ? g.ball.owner : nearest(opps(), p);
        fx().burst(p.x, p.y, 6, '#d8d0e0', 24, 120, 0.7);
        fx().comic(p.x, p.y - 30, 'POOF!', '#d8d0e0');
        for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
          const tx = o.x + Math.cos(a) * 24, ty = o.y + Math.sin(a) * 16;
          fx().clone(p.id, p.x, p.y, (tx - p.x) * 2.2, (ty - p.y) * 2.2, 1.4);
        }
        later(0.55, () => {
          g.hitStop(0.1);
          fx().impactFrame();
          fx().shake(5);
          fx().combo(o.x, o.y - 30, 4);
          fx().burst(o.x, o.y, 10, '#fff6a0', 16, 120);
          o.hitImmune = 0;
          o.hit({ stun: 1.2, kbx: 0, kby: 0, type: 'light' });
          g.sfx('hit');
        });
      });
    } },
    { key: '4', name: 'Sút Lỗ Đen', sub: 'Sát Thủ · BL PL PT', color: '#9d7bff', run() {
      const p = me();
      giveBall(p);
      p.facing = dir() > 0 ? 0 : Math.PI;
      Act.shoot(g, p, 1.0, 0);
      g.ball.skin = 'blackhole';
      fx().vortex(0, 0, 46, 1.4, 'ball');
      fx().comic(p.x, p.y - 30, 'VÙÙÙ!', '#9d7bff');
      fx().shake(3, 0.5);
      g.sfx('zap');
      let T = 1.4;
      every((dt) => {
        T -= dt;
        const b = g.ball;
        // lực hút: đối thủ gần đường bay trượt về phía bóng
        for (const o of opps()) {
          const d = Math.hypot(o.x - b.x, o.y - b.y);
          if (d < 64 && d > 3) {
            const k = (1 - d / 64) * 1500 * dt;
            o.kbx += ((b.x - o.x) / d) * k; o.kby += ((b.y - o.y) / d) * k;
            // bị hút lệch khỏi vị trí nhưng không chạm được bóng (trừ người trông khung — vẫn được cứu thua)
            if (!g.inKeeperZone(o)) b.noPickup.set(o.id, 0.15);
          }
        }
        return T <= 0 || !!b.owner;
      });
    } },
    { key: '5', name: 'Cú Sút Sao Băng', sub: 'Tuyệt kỹ Sát Thủ · SM IF BL SH', color: '#ff6a1f', run() {
      const p = me();
      giveBall(p);
      ultimate(p, 'CÚ SÚT SAO BĂNG', '#ff6a1f', () => {
        p.airVz = 300; p.airZ = 0.5;
        const b = g.ball;
        b.kick(p, 0, 0, 300); b.skin = 'fireball';
        fx().burst(p.x, p.y, 0, '#8a7f70', 14, 90);
        g.sfx('whoosh');
        later(0.45, () => { g.slowMo(0.25, 0.45); fx().speedLines(0.5); fx().zoom(p.x, p.y - p.airZ, 0.18, 0.5); });
        later(0.62, () => {
          const goal = g.attackGoal(0), b2 = g.ball;
          const dx = goal.x - b2.x, dy = goal.y - b2.y, d = Math.hypot(dx, dy) || 1;
          b2.kick(p, (dx / d) * 560, (dy / d) * 560, -40);
          b2.skin = 'fireball'; b2.kind = 'shot';
          fx().shake(5);
          fx().comic(b2.x, b2.y - b2.z - 10, 'BÙM!', '#ff6a1f', 1.2);
          g.sfx('kick', 1);
          every(() => {
            const b3 = g.ball;
            if (b3.skin !== 'fireball') return true;
            fx().burst(b3.x, b3.y, b3.z + 3, Math.random() < 0.5 ? '#ff6a1f' : '#ffd23f', 3, 40, 0.4);
            if (b3.netSide || g.state === 'goal') {
              fx().impactFrame(); fx().shake(8, 0.5); g.hitStop(0.12);
              fx().burst(b3.x, b3.y, 10, '#ffd23f', 30, 180, 0.8);
              fx().wave(b3.x, b3.y, 40, '#ff6a1f', 0.5, 3);
              return true;
            }
            return false;
          });
        });
      });
    } },
    { key: '6', name: 'Tia Chớp Xuyên Sân', sub: 'Tuyệt kỹ Tốc Độ · SM CO IF TR DC', color: '#7fe7ff', run() {
      const p = me();
      fx().callout('TIA CHỚP!', '#7fe7ff', 1.0);
      fx().tint('#0a1830', 0.7, 0.45);
      g.slowMo(0.25, 0.35);
      g.sfx('zap');
      later(0.3, () => {
        const f = g.field, x0 = p.x, y0 = p.y;
        const x1 = U.clamp(p.x + dir() * 220, f.x + 10, f.x + f.w - 10), y1 = p.y;
        for (let i = 0; i < 3; i++) fx().bolt(x0, y0 - 8 + i * 2, x1, y1 - 6, i ? '#7fe7ff' : '#ffffff', 0.5);
        for (let x = x0; dir() * (x1 - x) > 0; x += dir() * 14) fx().decal('scorch', x, y0, 0.7, 2.5);
        for (const o of opps()) {
          if (U.segDist(o.x, o.y, x0, y0, x1, y1) > 18) continue;
          o.hitImmune = 0;
          o.hit({ stun: 1.1, kbx: 0, kby: (o.y < y0 ? -1 : 1) * 140, type: 'slash' });
          fx().bolt(o.x, o.y - 22, o.x, o.y - 2, '#bdf4ff', 0.4);
          fx().burst(o.x, o.y, 8, '#bdf4ff', 12, 90);
        }
        fx().afterimage(p);
        p.x = x1; p.y = y1;
        if (g.ball.owner === p) g.ball.follow(0);
        g.hitStop(0.08);
        fx().impactFrame();
        fx().speedLines(0.4);
        fx().shake(6, 0.35);
        g.sfx('zap');
      });
    } },
    { key: '7', name: 'Hoá Khổng Lồ', sub: 'Tuyệt kỹ Thép · GI SH DC', color: '#ffd23f', run() {
      const p = me();
      ultimate(p, 'HOÁ KHỔNG LỒ', '#ffd23f', () => {
        p.giant(2, 5);
        fx().comic(p.x, p.y - 50, 'KHỔNG LỒ!', '#ffd23f', 1.4);
        fx().shake(6, 0.4);
        fx().wave(p.x, p.y, 40, '#ffd23f', 0.5, 3);
        let T = 5, stepT = 0;
        every((dt) => {
          T -= dt; stepT -= dt;
          if (stepT <= 0 && Math.hypot(p.vx, p.vy) > 20) {
            stepT = 0.32;
            fx().shake(2.5, 0.12);
            fx().decal('crack', p.x, p.y, 0.6, 1.5);
            fx().burst(p.x, p.y, 0, '#8a7f70', 5, 40);
            g.sfx('wall');
          }
          for (const o of opps()) if (o.state !== 'stun' && U.dist(o, p) < p.radius + o.radius + 4) launch(o, p, 360, 220, 1.0);
          return T <= 0;
        });
      });
    } },
    { key: '8', name: 'Chưởng Sóng', sub: 'Sát Thủ · BM SH CO', color: '#7fe7ff', run() {
      const p = me(), dx = dir();
      p.facing = dx > 0 ? 0 : Math.PI;
      fx().projectile('orb', p.x + dx * 10, p.y, 0, 0, 0.35);
      fx().zoom(p.x, p.y, 0.1, 0.35);
      g.sfx('zap');
      later(0.35, () => {
        fx().beam(p.x + dx * 8, p.y - 6, dx > 0 ? 0 : Math.PI, 300, 22, '#7fe7ff', 0.7);
        fx().shake(5, 0.6);
        fx().callout('CHƯỞNG SÓNG!', '#7fe7ff', 0.9);
        g.sfx('kick', 1);
        if (g.ball.owner === p) Act.shoot(g, p, 1.0, 0);
        for (const o of opps()) {
          const dy = o.y - p.y;
          if ((o.x - p.x) * dx > 0 && Math.abs(dy) < 18) { o.hitImmune = 0; o.hit({ stun: 0.8, kbx: dx * 120, kby: (dy >= 0 ? 1 : -1) * 300, type: 'slash' }); }
        }
      });
    } },
    { key: '9', name: 'Bách Quyền', sub: 'Tuyệt kỹ Đấu Sĩ · SM CO TR IF DC', color: '#ff3d5a', run() {
      const p = me(), o = nearest(opps(), p);
      ultimate(p, 'BÁCH QUYỀN', '#ff3d5a', () => {
        const side = p.x < o.x ? -1 : 1;
        fx().afterimage(p);
        p.x = o.x + side * 14; p.y = o.y; p.facing = side > 0 ? Math.PI : 0;
        if (g.ball.owner === p) g.ball.follow(0);
        o.hitImmune = 0; o.hit({ stun: 1.6, type: 'light' }); o.kbx = o.kby = 0;
        fx().tint('#300000', 1.2, 0.35);
        fx().speedLines(1.2, o.x, o.y - 8, '#ffcfcf');
        let n = 0;
        const punch = () => {
          n++;
          fx().stretch(p.id, o.x + U.rand(-6, 6), o.y + U.rand(-8, 4), 0.1);
          fx().burst(o.x + U.rand(-4, 4), o.y - 8 + U.rand(-6, 6), 8, '#fff6a0', 4, 60, 0.3);
          if (n % 4 === 0) fx().combo(o.x, o.y - 30, n);
          fx().shake(1.5, 0.05);
          if (n % 2) g.sfx('tackle');
          o.state = 'stun'; o.stateT = Math.max(o.stateT, 0.5); o.kbx = o.kby = 0;
          if (n < 20) later(0.05, punch); else later(0.08, finisher);
        };
        const finisher = () => {
          const f = g.field;
          g.hitStop(0.14);
          fx().impactFrame();
          fx().combo(o.x, o.y - 30, 20);
          fx().zoom(o.x, o.y, 0.2, 0.35);
          fx().shake(8, 0.4);
          // đánh văng về phía bức tường gần nhất -> chắc chắn BONK
          const toTop = o.y - f.y < f.y + f.h - o.y;
          launch(o, p, 560, 200, 1.4, U.norm(-side * 0.35, toTop ? -1 : 1));
          g.sfx('hit');
          every(() => {
            const r = o.radius + 1;
            if (o.y <= f.y + r || o.y >= f.y + f.h - r || o.x <= f.x + r || o.x >= f.x + f.w - r) {
              fx().decal('wallcrack', o.x, o.y, 1.4, 5);
              fx().burst(o.x, o.y, 10, '#d9cbb0', 16, 100);
              return true;
            }
            return o.state !== 'stun';
          });
        };
        punch();
      });
    } },
    { key: '0', name: 'Né Hoàn Hảo', sub: 'Ảo Ảnh · SM FL CO', color: '#c9b5ff', run() {
      const p = me();
      fx().tint('#6a3dff', 1.3, 0.28);
      g.slowMo(0.3, 1.1);
      fx().comic(p.x, p.y - 30, 'NÉ!', '#c9b5ff', 1.2);
      fx().speedLines(0.6, p.x, p.y, '#c9b5ff');
      p.cd.skill = 0;
      Act.skill(g, p, 0, -1);
      g.sfx('whoosh');
    } },
    { key: '', name: 'Thiên Thạch Giáng', sub: 'Tuyệt kỹ Võ Sĩ Đá · IF SH DC SW', color: '#ff6a1f', run() {
      const p = me(), o = nearest(opps(), p);
      ultimate(p, 'THIÊN THẠCH GIÁNG', '#ff6a1f', () => {
        p.airVz = 560; p.airZ = 0.5;
        fx().burst(p.x, p.y, 0, '#8a7f70', 16, 110);
        fx().wave(p.x, p.y, 24, '#ffffff', 0.4, 2);
        g.sfx('whoosh');
        const target = { x: o.x, y: o.y };
        let falling = false, ringT = 0;
        every((dt) => {
          p.x += (target.x - p.x) * Math.min(1, dt * 2.5);
          p.y += (target.y - p.y) * Math.min(1, dt * 2.5);
          if ((ringT -= dt) <= 0) { ringT = 0.18; fx().wave(target.x, target.y, 26, '#ff3d5a', 0.3, 1); }
          if (p.airVz < 0) {
            falling = true;
            fx().burst(p.x, p.y, p.airZ + 6, Math.random() < 0.5 ? '#ff6a1f' : '#ffd23f', 3, 50, 0.4);
          }
          if (falling && (p.airZ <= 0.05 || p.airVz >= 0)) {
            const R = 64;
            g.hitStop(0.13);
            fx().impactFrame();
            fx().shake(10, 0.5);
            fx().zoom(p.x, p.y, 0.2, 0.4);
            fx().wave(p.x, p.y, R, '#ff6a1f', 0.6, 4);
            fx().wave(p.x, p.y, R * 0.6, '#ffffff', 0.45, 2);
            fx().decal('crater', p.x, p.y, 1.8, 5);
            fx().burst(p.x, p.y, 4, '#ff6a1f', 30, 190, 0.9);
            fx().burst(p.x, p.y, 2, '#6a6470', 20, 80, 1.2);
            fx().comic(p.x, p.y - 40, 'ẦM!!', '#ff6a1f', 1.5);
            for (const q of opps()) if (U.dist(q, p) < R) launch(q, p, 240, 260, 1.5);
            g.sfx('hit');
            return true;
          }
          return false;
        });
      });
    } },
    { key: '', name: 'Bóng Bom', sub: 'Hỗn Loạn · BL SW SH', color: '#ff3d5a', run() {
      const b = g.ball;
      let T = 3, last = 4;
      every((dt) => {
        T -= dt;
        b.skin = 'bomb'; // giữ hình bom kể cả khi có người khống chế bóng
        const n = Math.ceil(T);
        if (n < last && n > 0) { last = n; fx().comic(b.x, b.y - b.z - 16, String(n), '#ff3d5a', 1.2, 0.5); g.sfx('menu'); }
        if (T > 0) return false;
        b.skin = null;
        const x = b.owner ? b.owner.x : b.x, y = b.owner ? b.owner.y : b.y;
        g.hitStop(0.1);
        fx().impactFrame();
        fx().shake(9, 0.5);
        fx().wave(x, y, 55, '#ff6a1f', 0.55, 4);
        fx().decal('scorch', x, y, 2, 5);
        fx().decal('crack', x, y, 1.2, 4);
        fx().burst(x, y, 6, '#ff6a1f', 30, 180, 0.8);
        fx().burst(x, y, 4, '#6a6470', 20, 70, 1.2);
        fx().comic(x, y - 36, 'BÙMMM!', '#ff6a1f', 1.5);
        const holder = b.owner;
        if (holder) g.looseBall(holder, U.rand(-1, 1), U.rand(-1, 1), 200);
        for (const q of g.players) if (U.dist(q, { x, y }) < 55) launch(q, { x, y: y + 1 }, 260, 240, 1.2);
        g.sfx('hit');
        return true;
      });
    } },
  ];

  /* ================= VIÊN GẠCH ================= */
  let comboN = 0, skinI = 0;
  const SKINS = ['blackhole', 'bomb', 'fireball', 'light', 'melon', 'bowling', 'chicken', null];
  const BRICKS = [
    ['HS · Hit-stop', () => { g.hitStop(0.2); fx().comic(me().x, me().y - 30, 'HIT-STOP', '#ffffff', 0.7); }],
    ['SM · Slow-mo', () => g.slowMo(0.3, 1.5)],
    ['ZM · Punch-zoom', () => fx().zoom(me().x, me().y - 6, 0.22, 0.45)],
    ['IF · Impact frame', () => { fx().O.impactCd = 0; fx().impactFrame(0.1); }],
    ['SL · Speed lines', () => fx().speedLines(0.9)],
    ['CO · Callout', () => fx().callout('PHÁ ÂM CHƯỚNG!', '#7fe7ff')],
    ['CO · Chữ comic', () => fx().comic(me().x, me().y - 30, U.pick(['POW!', 'BAM!', 'WHAM!', 'CLANG!', 'BOING!']), '#ffe14f', 1.2)],
    ['CO · Combo HIT', () => fx().combo(me().x, me().y - 30, ++comboN)],
    ['Cut-in', () => fx().cutIn(me().id, 'TÊN TUYỆT KỸ', '#ffe14f', 0.9)],
    ['SW · Sóng chấn', () => fx().wave(me().x, me().y, 55, '#ffffff', 0.55, 3)],
    ['DC · Vết nứt', () => fx().decal('crack', me().x + 20, me().y, 1.5, 5)],
    ['DC · Hố', () => fx().decal('crater', me().x + 20, me().y, 1.6, 5)],
    ['DC · Cháy xém', () => fx().decal('scorch', me().x + 20, me().y, 1.6, 5)],
    ['DC · Vết trượt', () => fx().decal('skid', me().x, me().y, 1.5, 4, dir() > 0 ? 0 : Math.PI)],
    ['DC · Nứt tường', () => fx().decal('wallcrack', me().x, g.field.y + 2, 1.5, 5)],
    ['LB · Tay co giãn', () => { const o = nearest(opps(), me()); fx().stretch(me().id, o.x, o.y, 0.5); }],
    ['CL · Phân thân', () => { const p = me(); fx().clone(p.id, p.x, p.y, 70, -60, 2); fx().clone(p.id, p.x, p.y, 70, 60, 2); }],
    ['PJ · Lưỡi gió', () => fx().projectile('wind', me().x, me().y, dir() * 320, 0, 0.8)],
    ['PJ · Cầu năng lượng', () => fx().projectile('orb', me().x, me().y, dir() * 220, 0, 1)],
    ['BM · Luồng tia', () => fx().beam(me().x, me().y - 6, dir() > 0 ? 0 : Math.PI, 260, 20, '#7fe7ff', 0.7)],
    ['PL · Lỗ đen', () => fx().vortex(me().x + dir() * 50, me().y - 8, 44, 2)],
    ['Tia sét', () => { const o = nearest(opps(), me()); fx().bolt(me().x, me().y - 8, o.x, o.y - 8, '#bdf4ff', 0.5); }],
    ['GI · Khổng lồ bật/tắt', () => { const p = me(); p.giant(p.sizeTarget > 1 ? 1 : 2, 0); }],
    ['BL · Đổi skin bóng', () => { g.ball.skin = SKINS[skinI++ % SKINS.length]; }],
    ['Phủ màu sepia', () => fx().tint('#704214', 1.5, 0.3)],
  ];

  /* ================= UI ================= */
  function scene() {
    const el = $('scene');
    const items = [
      [() => `AI: ${aiOn ? 'CHẠY' : 'ĐỨNG YÊN'}`, () => { aiOn = !aiOn; }],
      [() => 'XẾP LẠI CẢNH', () => arrange()],
      [() => `GIẢM NHÁY: ${SFC.FXSettings.reduceFlash ? 'BẬT' : 'TẮT'}`, () => { SFC.FXSettings.reduceFlash = !SFC.FXSettings.reduceFlash; SFC.FXSettings.save(); }],
      [() => `ÂM THANH: ${SFC.Audio.muted ? 'TẮT' : 'BẬT'}`, () => SFC.Audio.toggleMute()],
    ];
    el.innerHTML = '';
    items.forEach(([label, act]) => {
      const b = document.createElement('button');
      b.className = 'btn';
      b.textContent = label();
      b.onclick = () => { SFC.Audio.unlock(); act(); scene(); };
      el.appendChild(b);
    });
  }

  // Core thật (systems/cores.js) cho đội vàng — bật / tắt từng lá để xem hành vi + hình của nó trong trận
  function coreButtons() {
    const C = SFC_CONFIG.cores, el = $('cores'), tools = $('coretools');
    el.innerHTML = '';
    Object.keys(C.list).forEach((id) => {
      const c = C.list[id], a = C.archetypes[c.tags[0]];
      const b = document.createElement('button');
      const on = g.cores.has(0, id);
      b.className = 'btn' + (on ? ' on' : '');
      b.style.setProperty('--c', a.color);
      b.title = c.desc;
      b.innerHTML = `${c.icon} ${c.name}<small>${c.tags.map((t) => C.archetypes[t].label).join(' · ')} · ${C.roleLabels[c.role]}</small>`;
      b.onclick = () => {
        SFC.Audio.unlock();
        if (g.cores.has(0, id)) { g.cores.owned[0].splice(g.cores.owned[0].indexOf(id), 1); delete g.cores.state[0][id]; }
        else g.cores.add(0, id);
        coreButtons();
      };
      el.appendChild(b);
    });
    tools.innerHTML = '';
    [
      ['ĐẦY TÀI NGUYÊN', () => { for (const p of g.teams[0].players) { p.res.momentum = g.cores.resMax(0, 'momentum'); p.res.rage = 5; p.res.guard = 2; } g.rhythm[0] = 5; }],
      ['ĐẦY TUYỆT KỸ (X)', () => { g.ult[0] = 1; }],
      ['BỎ HẾT CORE', () => { g.cores.owned[0].length = 0; g.cores.state[0] = {}; for (const p of g.teams[0].players) p.res = { momentum: 0, rage: 0, guard: 0 }; g.rhythm[0] = 0; coreButtons(); }],
    ].forEach(([label, fn]) => {
      const b = document.createElement('button');
      b.className = 'btn';
      b.textContent = label;
      b.onclick = () => { SFC.Audio.unlock(); fn(); };
      tools.appendChild(b);
    });
  }

  function buttons() {
    const m = $('moments');
    MOMENTS.forEach((mo) => {
      const b = document.createElement('button');
      b.className = 'btn';
      b.style.setProperty('--c', mo.color);
      b.innerHTML = `${mo.key ? `<kbd>${mo.key}</kbd> ` : ''}${mo.name}<small>${mo.sub}</small>`;
      b.onclick = () => { SFC.Audio.unlock(); mo.run(); };
      m.appendChild(b);
    });
    const k = $('bricks');
    BRICKS.forEach(([name, fn]) => {
      const b = document.createElement('button');
      b.className = 'btn';
      b.textContent = name;
      b.onclick = () => { SFC.Audio.unlock(); fn(); };
      k.appendChild(b);
    });
  }

  window.addEventListener('keydown', (e) => {
    const mo = MOMENTS.find((x) => x.key && e.code === 'Digit' + x.key);
    if (mo) { SFC.Audio.unlock(); mo.run(); }
  });

  /* ================= VÒNG LẶP ================= */
  function tickScript(dt) {
    for (const t of timers.slice()) {
      if ((t.t -= dt) <= 0) { timers.splice(timers.indexOf(t), 1); t.fn(); }
    }
    for (const w of watchers.slice()) if (w(dt)) watchers.splice(watchers.indexOf(w), 1);
  }

  function boot() {
    SFC.Input.init(SFC_CONFIG.controls.bindings);
    SFC.Renderer.init($('game'));
    newGame();
    scene();
    buttons();
    coreButtons();
    let last = performance.now(), acc = 0;
    const frame = (now) => {
      acc += Math.min(0.1, (now - last) / 1000);
      last = now;
      if (paused) acc = 0;
      while (acc >= STEP) {
        tickScript(STEP);
        g.elapsed = 0;
        if (g.state === 'ended' || g.state === 'draft') arrange();
        g.update(STEP, SFC.Input);
        g.events.length = 0;
        SFC.Input.endFrame();
        acc -= STEP;
      }
      SFC.Renderer.render(g);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    // debug: tua n bước mô phỏng (kể cả kịch bản hiệu ứng) rồi vẽ — dùng khi tab bị hãm requestAnimationFrame
    const step = (n = 1) => {
      for (let i = 0; i < n; i++) { tickScript(STEP); g.elapsed = 0; g.update(STEP, SFC.Input); g.events.length = 0; }
      SFC.Renderer.render(g);
    };
    window.SFC.sandbox = { get game() { return g; }, MOMENTS, BRICKS, arrange, step, setAI: (v) => { aiOn = v; }, pause: (v) => { paused = v; } };
  }

  if (document.fonts && document.fonts.load) {
    Promise.race([
      Promise.all([document.fonts.load('8px "Press Start 2P"'), document.fonts.load('16px "VT323"')]),
      new Promise((r) => setTimeout(r, 1500)),
    ]).finally(boot);
  } else boot();
})();
