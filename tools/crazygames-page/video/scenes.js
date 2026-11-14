/* Kịch bản quay video xem trước CrazyGames (capture.mjs nạp sau khi game khởi động, chạy mô phỏng THẬT của game).
 * Chỉnh riêng cho video, không ghi gì vào game: mọi cầu thủ là con rối của kịch bản (g.aiHook), Core / Tuyệt kỹ cấp lúc chạy,
 * tắt zoom ăn mừng + vignette (compose.mjs tự lo máy quay), tắt màn VS.
 * Cảnh: village (cảnh của ảnh cover sống dậy: dropkick CRACK! + đấm POW!, nhặt bóng, sút vào), truck, medusa, chicken (+ rocket, không dùng) (Tuyệt kỹ, trên sân sáng:
 * ô video trên trang chủ CrazyGames nhỏ và nằm giữa các cover rực rỡ, sân đêm nhìn đục). */
(function () {
  const U = SFC.U, Act = SFC.Actions, PI = Math.PI;
  const app = SFC.app;
  const B = (window.CGV = { t: 0, dir: null, timeline: [], done: 0, marks: {}, track: null, stepT: 0 });
  SFC_CONFIG.intro.enabled = false;
  const G = SFC_CONFIG.game;
  G.celebration.camera.zoom = 1;
  G.render.vignette = 0;
  SFC.Renderer.vig = SFC.Background.vignette(SFC.Renderer.screen.w, SFC.Renderer.screen.h);
  G.match.kickoffVary = null;
  const NULL = SFC.Sync.NULL_INPUT;

  const ai0 = SFC.AI.update.bind(SFC.AI);
  SFC.AI.update = (dt, g) => { ai0(dt, g); B.stepT += dt; if (B.dir) B.dir(dt, g, B.stepT); };

  const place = (p, x, y, facing) => Object.assign(p, {
    x, y, vx: 0, vy: 0, kbx: 0, kby: 0, airZ: 0, airVz: 0, state: 'normal', stateT: 0, hitImmune: 0,
    facing: facing != null ? facing : p.team ? PI : 0,
  });
  const face = (p, q) => { p.facing = Math.atan2(q.y - p.y, q.x - p.x); };
  const steer = (p, x, y, v = 1, sprint = false) => {
    const d = Math.hypot(x - p.x, y - p.y);
    if (d < 1.5) { p.intent.mx = 0; p.intent.my = 0; p.intent.sprint = false; return true; }
    const n = U.norm(x - p.x, y - p.y), k = Math.min(1, d / 14) * v;
    p.intent.mx = n.x * k; p.intent.my = n.y * k; p.intent.sprint = !!sprint;
    return false;
  };
  const still = (p) => { p.intent.mx = 0; p.intent.my = 0; p.intent.sprint = false; };
  const give = (g, p) => { if (g.ball.owner && g.ball.owner !== p) g.ball.owner = null; g.gainPossession(p); };
  const mark = (k) => { if (B.marks[k] == null) B.marks[k] = B.t; };
  // Tuyệt kỹ cấp thẳng (như phòng ULT TEST: không vào ULT BOOK, không báo khám phá)
  const giveUlt = (g, p, id, lv = 1) => {
    const cs = g.cores, own = cs.own[p.id] || (cs.own[p.id] = []);
    own.push(id); p.ult = id; p.ultLv = lv; p.res.ult = 1;
    const b = SFC.CoreBehaviors[id];
    if (b && b.onAdd) b.onAdd(cs, p.team, cs.sp(id, p));
  };
  // ngoại hình như các nhân vật trong ảnh cover (tools/itch-page/generate.js LOOK)
  const skins = SFC_CONFIG.teams.skins;
  const LOOK = {
    hero: { cut: 'mohawk', face: 'shades', shoes: 'flame', hair: '#ff3d5a', skin: skins[1] },
    mate: { cut: 'cap', face: 'none', shoes: 'reds', skin: skins[2] },
    rival: { cut: 'afro', hair: '#3ff6ff', skin: skins[3], shoes: 'neonkick' },
    rival2: { cut: 'spiky', hair: '#ff8a3f', face: 'visor', skin: skins[0] },
    ko: { cut: 'bowl', hair: '#f2d16b', skin: skins[4] },
  };
  const dress = (p, k) => Object.assign(p.look, LOOK[k]);

  function match(home, away, arena) {
    app.startMatch({ home, away, difficulty: 'normal', humanTeam: -1, noDraft: true, arena });
    app.screen = 'game';
    const g = app.game;
    g.state = 'play'; g.stateT = 0;
    B.puppets = new Set(g.players);
    g.aiHook = (p) => B.puppets.has(p);
    for (const p of g.players) { p.cd.light = p.cd.hard = p.cd.skill = 999; }
    return g;
  }
  const team = (g, t) => g.teams[t].players;

  // 1 khung video: chạy mốc kịch bản, n bước mô phỏng 60 Hz, vẽ, trả ảnh canvas 1x + vị trí
  B.step = function (t, n) {
    B.t = t;
    while (B.done < B.timeline.length && t >= B.timeline[B.done][0]) { B.timeline[B.done][1](); B.done++; }
    const g = app.game;
    if (B.onFrame) B.onFrame(g, t);
    const r1 = (v) => Math.round(v * 10) / 10;
    const info = {
      state: g.state,
      ball: [r1(g.ball.x), r1(g.ball.y), Math.round(g.ball.z)],
      score: [g.teams[0].score, g.teams[1].score],
      pl: g.players.map((p) => [p.team, r1(p.x), r1(p.y), Math.round(p.airZ)]),
      track: B.track ? { x: r1(B.track.x), y: r1(B.track.y) } : null,
    };
    for (let i = 0; i < n; i++) {
      window.__clk.add(1000 / 60);
      g.update(1 / 60, NULL);
      SFC.UI.consume(g);
    }
    SFC.Renderer.render(g);
    return { info, png: SFC.Renderer.canvas.toDataURL('image/png') };
  };

  const SCENES = {
    /* village: ảnh cover sống dậy. Đội đỏ (street_kings) vs đội hồng (neon_strikers), đúng vị trí trong cover:
       tóc xanh dẫn bóng sang trái, mohawk chạy nước rút tới dropkick (CRACK!), cùng lúc mũ lưỡi trai đấm visor (POW!);
       mohawk nhặt bóng, dẫn sang phải, sút vào khung thành trống */
    village() {
      const g = match('street_kings', 'neon_strikers', 'village');
      const f = g.field, [a0, a1, a2] = team(g, 0), [o0, o1, o2] = team(g, 1);
      const H = a2, M = a1, V = o2, R = o1, K = o0;   // H mohawk, M mũ lưỡi trai, V tóc xanh (cầm bóng), R visor, K tóc vàng
      dress(H, 'hero'); dress(M, 'mate'); dress(V, 'rival'); dress(R, 'rival2'); dress(K, 'ko');
      g.cores.add(H, 'flying_kick');
      place(V, 466, 170, PI); give(g, V);
      place(H, 392, 192, 0);
      place(M, 492, 176, 0); place(R, 509, 176, PI);
      place(K, 340, 176, 0);
      place(a0, f.x + 30, f.cy, 0);
      let phase = 'run';
      B.dir = (dt, g, t) => {
        still(a0); face(a0, g.ball);
        if (phase === 'run') {
          if (g.ball.owner === V) { V.intent.mx = -0.3; V.intent.my = 0; }
          still(M); still(R); still(K); face(K, V);
          const d = Math.hypot(V.x - H.x, V.y - H.y);
          if (d > 30) steer(H, V.x - 4, V.y + 4, 1, true);
          else { H.cd.hard = 0; face(H, { x: V.x, y: V.y - 2 }); if (Act.hardAttack(g, H)) { mark('windup'); phase = 'kick'; } }
          // đấm cùng lúc cú đá chạm người
          return;
        }
        if (phase === 'kick') {
          if (V.state === 'stun' || V.airZ > 0) mark('crack');
          if (B.marks.crack != null) { still(V); if (!B.marks.punch) { M.cd.light = 0; M.facing = 0; if (Act.lightAttack(g, M)) mark('punch'); } }
          else if (g.ball.owner === V) { V.intent.mx = -0.2; V.intent.my = 0; }
          still(K); face(K, V); still(R);
          if (B.marks.crack != null && H.state === 'normal') phase = 'collect';
          return;
        }
        still(V); still(R); still(K); still(M);
        if (phase === 'collect') {
          if (g.ball.owner === H) { mark('collect'); phase = 'carry'; return; }
          steer(H, g.ball.x, g.ball.y, 1, true);
          return;
        }
        if (phase === 'carry') {
          // dẫn tới gần khung thành rồi mới sút: máy quay bám người (z 6, khung rộng 320 px) thấy được bóng vào lưới
          H.intent.mx = 1; H.intent.my = (f.cy - 20 - H.y) / 60; H.intent.sprint = true;
          if (H.x > f.x + f.w - 130) { H.facing = 0; Act.shoot(g, H, 0.9, 0.1); mark('shot'); phase = 'done'; }
          return;
        }
        still(H);
      };
      B.onFrame = (g) => { if (g.state === 'goal') mark('goal'); };
    },

    /* quảng trường: 3 người của họ cầm bóng; người mình gọi Monster Truck */
    truck() {
      const g = match('street_kings', 'iron_harbor', 'plaza');
      const f = g.field, [a0, a1, a2] = team(g, 0), [o0, o1, o2] = team(g, 1);
      const Hh = a2;
      dress(Hh, 'hero');
      giveUlt(g, Hh, 'monster_truck');
      g.effects.callout = () => {};   // chữ to giữa màn hình bị khung dọc cắt; cut-in đã có tên Tuyệt kỹ
      place(Hh, f.cx - 110, f.cy + 10, 0);
      place(o1, f.cx - 20, f.cy + 4, PI); give(g, o1);
      place(o0, f.cx + 40, f.cy - 30, PI); place(o2, f.cx + 70, f.cy + 36, PI);
      place(a0, f.x + 40, f.cy, 0); place(a1, f.cx - 150, f.cy - 80, 0);
      let phase = 'wait';
      B.dir = (dt, g, t) => {
        still(a0); still(a1); face(a1, Hh);
        for (const p of [o0, o2]) { still(p); if (p.state === 'normal') face(p, Hh); }
        if (phase === 'wait') {
          if (g.ball.owner === o1) { o1.intent.mx = -0.18; o1.intent.my = 0; }
          still(Hh); face(Hh, o1);
          if (t > 0.45 && g.cores.activateUltimate(Hh)) { mark('cast'); phase = 'drive'; }
          return;
        }
        // xe tải tự lái người ra chiêu (AI); những người còn lại đứng sững
        B.puppets.delete(Hh);
        if (o1.state === 'normal' && g.ball.owner === o1) still(o1);
        let n = 0; for (const p of [o0, o1, o2]) if (p.state === 'stun') n++;
        if (n) mark('squash1');
        if (n >= 2) mark('squash2');
        if (n >= 3) mark('squash3');
      };
      B.onFrame = (g) => { if (g.state === 'goal') mark('goal'); };
    },

    /* sân vận động: đội trưởng của họ dẫn bóng tới cùng 2 đồng đội; mohawk nhìn: cả 3 hoá đá, cậu dẫn bóng vào */
    medusa() {
      const g = match('street_kings', 'crane_crushers', 'stadium');
      const f = g.field, [a0, a1, a2] = team(g, 0), [o0, o1, o2] = team(g, 1);
      const Hh = a2;
      dress(Hh, 'hero');
      giveUlt(g, Hh, 'medusa_gaze');
      place(Hh, f.cx - 60, f.cy + 6, 0);
      place(o1, f.cx + 40, f.cy + 2, PI); give(g, o1);
      place(o0, f.cx + 66, f.cy - 38, PI); place(o2, f.cx + 72, f.cy + 44, PI);
      place(a0, f.x + 40, f.cy, 0); place(a1, f.cx - 120, f.cy - 70, 0);
      let phase = 'wait';
      B.dir = (dt, g, t) => {
        still(a0); still(a1); face(a1, Hh);
        if (phase === 'wait') {
          for (const p of [o0, o1, o2]) { p.intent.mx = -0.22; p.intent.my = 0; }
          still(Hh); face(Hh, o1);
          if (t > 0.5 && g.cores.activateUltimate(Hh)) { mark('cast'); phase = 'gaze'; }
          return;
        }
        for (const p of [o0, o1, o2]) still(p);
        if (phase === 'gaze') {
          if (o1.stoneT > 0 || o0.stoneT > 0 || [o0, o1, o2].some((p) => p.state === 'stun')) mark('stone');
          if (B.marks.stone != null && Hh.state === 'normal' && !Hh.holdT) phase = 'walk';
          return;
        }
        if (phase === 'walk') {
          if (g.ball.owner !== Hh) {
            const b = g.ball;
            if (Math.abs(Hh.y - b.y) > 8 && b.x - Hh.x > 24) steer(Hh, Hh.x + 10, b.y, 1, true);
            else steer(Hh, b.x, b.y, 1, true);
            return;
          }
          mark('take');
          if (Hh.x < f.cx + 90) { Hh.intent.mx = 1; Hh.intent.my = (f.cy - Hh.y) / 40; Hh.intent.sprint = true; }
          else { Hh.facing = 0; Act.shoot(g, Hh, 0.8, -0.2); mark('shot'); phase = 'done'; }
          return;
        }
        still(Hh);
      };
      B.onFrame = (g) => { if (g.state === 'goal') mark('goal'); };
    },

    /* sân trường: 3 người của họ đứng thành hàng, người đầu cầm bóng; mohawk bắn Chicken Ray xuyên cả hàng -> 3 con gà,
       cậu nhặt bóng rơi, dẫn qua đám gà, sút vào, ăn mừng */
    chicken() {
      const g = match('street_kings', 'chrome_wolves', 'school');
      const f = g.field, [a0, a1, a2] = team(g, 0), [o0, o1, o2] = team(g, 1);
      const Hh = a2;
      dress(Hh, 'hero');
      giveUlt(g, Hh, 'chicken_ray');
      place(Hh, f.cx - 90, f.cy - 10, 0);
      place(o1, f.cx - 20, f.cy - 10, PI); give(g, o1);
      place(o0, f.cx + 30, f.cy - 6, PI); place(o2, f.cx + 80, f.cy - 12, PI);
      place(a0, f.x + 40, f.cy, 0); place(a1, f.cx - 150, f.cy + 70, 0);
      let phase = 'wait';
      B.dir = (dt, g, t) => {
        still(a0); still(a1); face(a1, Hh);
        if (phase === 'wait') {
          for (const p of [o0, o1, o2]) { p.intent.mx = -0.15; p.intent.my = 0; }
          still(Hh); face(Hh, o1);
          if (t > 0.45 && g.cores.activateUltimate(Hh)) { mark('cast'); phase = 'zap'; }
          return;
        }
        if (phase === 'zap') {
          for (const p of [o0, o1, o2]) still(p);
          still(Hh);
          if ([o0, o1, o2].some((p) => p.chickenT > 0 || p.chicken)) mark('chicken');
          if (B.marks.chicken != null && B.t - B.marks.chicken > 0.4 && Hh.state === 'normal') phase = 'take';
          return;
        }
        // gà chạy lon ton quanh chỗ đứng
        for (const [i, p] of [o0, o1, o2].entries()) { const a = B.t * 3 + i * 2.1; p.intent.mx = Math.cos(a) * 0.6; p.intent.my = Math.sin(a * 1.3) * 0.6; p.intent.sprint = false; }
        if (phase === 'take') {
          if (g.ball.owner !== Hh) { steer(Hh, g.ball.x, g.ball.y, 1, true); return; }
          mark('take'); phase = 'carry';
        }
        if (phase === 'carry') {
          Hh.intent.mx = 1; Hh.intent.my = (f.cy - Hh.y) / 50; Hh.intent.sprint = true;
          if (Hh.x > f.x + f.w - 130) { Hh.facing = 0; Act.shoot(g, Hh, 0.9, -0.1); mark('shot'); phase = 'done'; }
          return;
        }
        still(Hh);
      };
      B.onFrame = (g) => { if (g.state === 'goal') mark('goal'); };
    },

    /* sân trường: tiền đạo của họ ở tít bên kia; người mình bắn nắm đấm băng qua cả sân */
    rocket() {
      const g = match('street_kings', 'chrome_wolves', 'school');
      const f = g.field, [a0, a1, a2] = team(g, 0), [o0, o1, o2] = team(g, 1);
      const Hh = a1, T = o2;
      dress(Hh, 'hero');
      giveUlt(g, Hh, 'rocket_punch');
      place(Hh, f.cx - 120, f.cy + 46, 0);
      place(T, f.cx + 130, f.cy - 36, PI); give(g, T);
      place(o0, f.cx + 60, f.cy + 80, PI); place(o1, f.x + f.w - 40, f.cy, PI);
      place(a0, f.x + 40, f.cy, 0); place(a2, f.cx - 30, f.cy - 80, 0);
      let phase = 'wait';
      B.dir = (dt, g, t) => {
        still(a0); still(a2); face(a2, T); still(o0); face(o0, Hh); still(o1);
        if (phase === 'wait') {
          if (g.ball.owner === T) { T.intent.mx = -0.12; T.intent.my = 0.02; }
          still(Hh); face(Hh, T);
          if (t > 0.45 && g.cores.activateUltimate(Hh)) { mark('cast'); phase = 'fly'; }
          return;
        }
        if (T.state === 'stun' || T.airZ > 0) mark('kapow');
        if (B.marks.kapow == null && g.ball.owner === T) { T.intent.mx = -0.08; T.intent.my = 0; } else still(T);
        still(Hh);
      };
      // máy quay bám nắm đấm (đạn rocket trong bộ VFX)
      B.onFrame = (g) => {
        const r = ((g.effects.V && g.effects.V.shots) || []).filter((q) => q.kind === 'rocket' && q.t > 0).pop();
        B.track = r ? { x: r.x, y: r.y } : null;
      };
    },
  };

  // peek_<arena>: chỉ mở sân để xem màu (chọn sân sáng cho video)
  B.setup = function (name) {
    if (name.startsWith('peek_')) { match('street_kings', 'neon_strikers', name.slice(5)); return; }
    SCENES[name]();
  };
})();
