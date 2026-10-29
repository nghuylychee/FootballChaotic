/* Legends — LEGEND của GOAT PATH trong trận (config/legends.config.js, docs/RUN_DESIGN.md "LEGEND", user 2026-10-28).
 * Nghiêng chỉ số luôn bật đã tính sẵn trong Run.statsOf; ở đây là KHOẢNH KHẮC LEGEND + nhược điểm cơ chế. p.legend = id (match.js gắn
 * từ avatars / mates / seats). Chỉ máy chạy trận mô phỏng (opts.mirror: bỏ qua); máy khách online thấy hình qua sync.js.
 *   setup(g): trạng thái p.leg của người có LEGEND + nhược điểm random (mỗi trận 1 chỉ số lên, 1 chỉ số xuống)
 *   on(g, ev, p, x): tình huống từ gameplay (cores.js / match.js gọi): steal · dodge · goal · hardHit · win (giành bóng từ đối thủ) ·
 *     longPass (x = người nhận, xa >= moment.longPass px). update(g, dt) tự xét: box (cầm bóng vào vòng cấm đối thủ) · hold (giữ bóng
 *     moment.hold giây) · final (FINAL PUSH / bàn thắng vàng: tới hết trận) · longShot (gồng sút ở sân nhà)
 *   Khoảnh khắc: cộng rating moment.stats (đổi ra hệ số Player.stats cùng công thức Run.statsOf) trong moment.dur giây, tối đa moment.max
 *     lần mỗi trận, nghỉ moment.cooldown giây giữa 2 lần. Hình: Effects.legendAura (bóng mờ huyền thoại sau lưng, render/legenddraw.js)
 *     + legendCut (cut-in chân dung bên cạnh màn hình, không dừng trận; cách nhau cutGap giây, không đè cut-in Tuyệt kỹ).
 *   HUD (ô LEGEND trên thanh kỹ năng, ui/hud.js): hud(g, p) = trạng thái đang bật / nghỉ / số lần / số đòn nặng. Máy khách online không
 *     mô phỏng -> host báo trạng thái mỗi lần đổi qua Effects.legendHud (sync.js), máy khách tự đếm lùi theo g.time.
 *   Nhược điểm: stunMul (dive: bị đánh nằm lâu hơn — chữ DIVE!) · knockMul (light: văng xa hơn) · red (ra đòn nặng đủ hits lần = THẺ ĐỎ:
 *     không ra đòn / chuyền / sút được + đi bộ time giây — chữ RED CARD!). Đánh đổi chỉ số nằm sẵn trong stats của LEGEND.
 * KỸ THUẬT ĐẶC TRƯNG (user 2026-10-29): tech(g, p, id) = p dùng được kỹ thuật nâng cao id không (human.js hỏi trước mỗi kỹ thuật). Trong
 *   run (opts.run, legends.gateInRun) chỉ kỹ thuật của LEGEND p đang mang; ngoài run 4 kỹ thuật cũ (legends.base) như trước + kỹ thuật
 *   của LEGEND nếu có. Kiểu sút power / trivela / finesse, xe đạp chổng ngược (firstTime) ở actions.js; ở đây: toePoke · rainbow · engine
 *   · slide (+ slideStep) · sweeper. Mỗi kỹ thuật ra là diễn riêng (techFx). Chỉ người chơi dùng, AI không dùng kỹ thuật (như cũ).
 * Móc: match.js (setup, update, win) · cores.js (steal, dodge, goalScored, hardHit, passReceived) · player.js hit (stunMul, knockMul).
 */
window.SFC = window.SFC || {};

(function () {
  const LC = () => SFC_CONFIG.legends;
  const ATTR = () => SFC_CONFIG.progression.attrs;
  const def = (p) => (p && p.legend && LC().list[p.legend]) || null;
  // nhược điểm cơ chế (LEGEND TRIAL: LEGEND chỉ cho mượn kỹ thuật -> p.lent, không có nhược điểm)
  const flaw = (p) => (p && !p.lent && (def(p) || {}).flaw) || null;
  // LEGEND TRIAL: 1 lần làm được kỹ thuật (src/systems/drills.js combo; ngoài trial không làm gì). at = chỗ hiện số
  const combo = (g, p, id, at) => { if (g.drill && SFC.Drills) SFC.Drills.combo(g, p, id, at); };
  const E = SFC.Effects.prototype;

  // cộng (sign 1) / trừ (sign -1) rating vào hệ số Player.stats: hệ số = 1 + (rating / scale - 1) x weight -> mỗi điểm rating = weight / scale
  function addRatings(p, map, sign) {
    const A = ATTR();
    for (const s in map || {}) {
      const keys = (A.list[s] || {}).keys || {};
      for (const k in keys) {
        const w = keys[k] == null ? 1 : keys[k];
        p.stats[k] = (p.stats[k] == null ? 1 : p.stats[k]) + (sign * map[s] * w) / A.scale;
      }
    }
  }

  const T = () => LC().tuning;
  // thời gian diễn từng kỹ thuật (s) + vệt bóng (s, 0 = không)
  const ANIM = {
    power: { t: 0.5, ball: 0.9 }, trivela: { t: 0.45, ball: 1.1 }, finesse: { t: 0.5, ball: 1.1 }, rainbow: { t: 0.6, ball: 0.75 }, bruiser: { t: 0.35 },
    bicycle: { t: 0.6, ball: 0.8 }, engine: { t: 99 }, slide: { t: 0.5 }, sweeper: { t: 0.5 }, lobthrough: { t: 0.45, ball: 1.3 },
    toepoke: { t: 0.3, ball: 0.5 }, flip: { t: 0.9 },
  };

  const Legends = {
    def,
    addRatings,
    // kỹ thuật nâng cao id dùng được không
    tech(g, p, id) {
      const L = def(p);
      if (L && L.tech === id) return true;
      if (g.opts.run && LC().gateInRun) return false;
      return LC().base.includes(id);
    },

    /* ---------- kỹ thuật LEGEND (user 2026-10-29; true = đã ra, human.js dừng xử lý phím đó) ---------- */
    // diễn kỹ thuật vừa ra: tư thế riêng trên người (Effects.legendTech, render/legenddraw.js) + vệt bóng riêng (legendBall) + hiệu ứng
    // ô LEGEND trên HUD (ui/hud.js đọc V.legtech; tên kỹ thuật hiện ở HUD, không bật chữ trên đầu — user 2026-10-29). Thời gian diễn: ANIM
    techFx(g, p, id) {
      const A = ANIM[id] || { t: 0.4 }, fx = g.effects, L = def(p);
      fx.legendTech(p.id, id, A.t);
      if (A.ball) fx.legendBall(id, A.ball);
      if (id === 'power') {
        fx.impactFrame(0.06); fx.shake(5, 0.25);
        fx.decal('crack', p.x, p.y + 2, 1.2, 2.5);
        fx.wave(p.x, p.y, 30, '#ffffff', 0.35, 3);
        g.hitStop(0.05);
      } else if (id === 'bicycle') { g.hitStop(0.06); fx.speedLines(0.3, 320, 180, L.color); }
      else if (id === 'sweeper') fx.wave(p.x, p.y, 26, L.color, 0.4, 2);
      g.sfx('legendTech');
    },
    // SÚT MŨI GIÀY: lúc thả phím sút mà lực nạp còn dưới maxCharge -> trả về lực sút thay thế (0 = không phải chạm nhanh)
    toePoke(g, p) {
      const C = T().toepoke;
      if (!(p.charge < C.maxCharge)) return 0;
      this.techFx(g, p, 'toepoke');
      return C.power;
    },
    // RAINBOW FLICK (cầm bóng, phím sút giả): bóng cuộn lên sau gót, vòng qua đầu rồi rơi xuống ngay trước mặt người đang chạy
    // (rainbowStep dắt bóng theo đường vòng mỗi bước) -> về chân, dẫn bóng tiếp. Người vẫn tự chạy như thường
    rainbow(g, p) {
      const C = T().rainbow, b = g.ball;
      if (b.owner !== p || p.noActT > 0) return false;
      p.charging = false; p.charge = 0; p.cancelPass();
      const fx = Math.cos(p.facing), fy = Math.sin(p.facing);
      b.kick(p, 0, 0, 0);
      b.freezeT = 0.05;   // không để chính mình nhặt lại ngay bước này (rainbowStep giữ tiếp mỗi bước)
      b.kind = 'pass'; b.passTarget = p;
      const near = g.teams[1 - p.team].players.some((o) => o.state !== 'stun' && Math.hypot(o.x - p.x, o.y - p.y) <= C.near);
      p.rainbow = { t: 0, x0: p.x - fx * C.behind, y0: p.y - fy * C.behind, near };
      this.techFx(g, p, 'rainbow');
      return true;
    },
    rainbowStep(g, p, dt) {
      const C = T().rainbow, R = p.rainbow, b = g.ball;
      // bóng đã bị người khác chạm / người bị đánh ngã: thả bóng rơi tự do
      if (b.owner || b.passTarget !== p || p.state === 'stun') { p.rainbow = null; return; }
      R.t += dt;
      const k = Math.min(1, R.t / C.time), tx = p.x + Math.cos(p.facing) * C.ahead, ty = p.y + Math.sin(p.facing) * C.ahead;
      const nx = R.x0 + (tx - R.x0) * k, ny = R.y0 + (ty - R.y0) * k;
      b.vx = (nx - b.x) / Math.max(dt, 1e-3); b.vy = (ny - b.y) / Math.max(dt, 1e-3);
      b.x = nx; b.y = ny; b.z = 4 * C.peak * k * (1 - k); b.vz = 0;
      b.freezeT = Math.max(b.freezeT || 0, dt * 2);   // đang bay vòng: không ai chạm được (Game.updatePossession bỏ qua bóng đang khựng)
      if (k < 1) return;
      p.rainbow = null;
      b.z = 0;
      g.gainPossession(p);
      if (R.near) combo(g, p, 'rainbow');   // LEGEND TRIAL: hất qua đầu người đang áp sát rồi giữ được bóng
    },
    // BRUISER RUN (đang dẫn bóng + giữ chạy nhanh, bấm trick / switch): giật chỏ — đối thủ sát bên bị đẩy văng + choáng; trong window s
    // sau khi bấm, ai đấm / tắc vào bạn cũng bị văng ngược (parry, actions.js gọi)
    bruiser(g, p) {
      const C = T().bruiser;
      if (g.ball.owner !== p || p.noActT > 0 || (p.techCd || 0) > g.time) return false;
      p.techCd = g.time + C.cd;
      p.elbowUntil = g.time + C.window;
      for (const o of g.teams[1 - p.team].players) if (o.state !== 'stun' && Math.hypot(o.x - p.x, o.y - p.y) <= C.range + (o.radius || 0)) this.shove(g, p, o);
      this.techFx(g, p, 'bruiser');
      return true;
    },
    // đối thủ o đấm / tắc vào p đúng lúc p đang giật chỏ -> đòn bị chặn, o văng ngược. true = đòn bị chặn
    parry(g, p, o) {
      if (!(p.elbowUntil > g.time) || !o || o.team === p.team) return false;
      p.elbowUntil = 0;
      this.shove(g, p, o);
      g.hitStop(0.05);
      g.effects.legendTech(p.id, 'bruiser', ANIM.bruiser.t);
      return true;
    },
    shove(g, p, o) {
      const C = T().bruiser, d = Math.hypot(o.x - p.x, o.y - p.y) || 1;
      o.hit({ stun: C.stun, kbx: ((o.x - p.x) / d) * C.knock, kby: ((o.y - p.y) / d) * C.knock, source: p, quiet: true });
      g.effects.burst((p.x + o.x) / 2, (p.y + o.y) / 2 - 6, 10, def(p).color, 12, 100, 0.35);
      combo(g, p, 'bruiser', o);
      g.effects.shake(3, 0.15);
      g.sfx('tackle');
    },
    // ENGINE PRESS (giữ chạy nhanh + sút, không cầm bóng): tự đuổi người cầm bóng đối phương / bóng lỏng, rút thể lực x drain;
    // chạm người cầm bóng = chọc bóng ra. Mỗi bước human.js gọi lại khi còn giữ phím; nhả phím -> update tắt hiệu ứng
    engine(g, p, dt) {
      const C = T().engine, P = SFC_CONFIG.game.player, b = g.ball, o = b.owner;
      if (p.state !== 'normal' || p.noActT > 0 || p.stamina < P.staminaMinToSprint || (o && o.team === p.team)) return false;
      const tg = o || b, dx = tg.x - p.x, dy = tg.y - p.y, d = Math.hypot(dx, dy) || 1;
      p.intent.mx = dx / d; p.intent.my = dy / d; p.intent.sprint = true;
      p.stamina = Math.max(0, p.stamina - P.staminaDrain * (C.drain - 1) * dt);
      p.engineAt = g.time;
      if (!p.engineOn) { p.engineOn = true; this.techFx(g, p, 'engine'); }
      if (o && d <= C.reach + (o.radius || 0) && (p.techCd || 0) <= g.time) {
        p.techCd = g.time + C.cd;
        g.looseBall(o, dx / d, dy / d);
        g.effects.burst(o.x, o.y, 10, def(p).color, 14, 90, 0.35);
        combo(g, p, 'engine', o);
        g.sfx('tackle');
      }
      return true;
    },
    // XOẠC BÓNG (chạy nhanh + chuyền bổng, không cầm bóng): nằm xuống trượt theo hướng mũi tên (không bấm hướng: hướng mặt);
    // chạm đối thủ đầu tiên = họ bay lộn flips vòng (rơi bóng nếu đang cầm) · hụt = nằm (slideStep)
    slide(g, p, mx, my) {
      const C = T().slide;
      if (p.state !== 'normal' || p.noActT > 0 || (p.techCd || 0) > g.time) return false;
      const l = Math.hypot(mx, my), dx = l > 0.2 ? mx / l : Math.cos(p.facing), dy = l > 0.2 ? my / l : Math.sin(p.facing);
      this.dash(g, p, dx, dy, C.time, C.speed);
      p.slideT = C.time + 0.05;
      p.techCd = g.time + C.cd;
      this.techFx(g, p, 'slide');
      return true;
    },
    // SWEEPER SPIN: đọc trúng cú sút (Actions.read -> p.sweepUntil) rồi bắt được bóng -> xoay 1 vòng, chuyền cho đồng đội dâng cao nhất,
    // người đó tăng tốc thoáng chốc
    sweeper(g, p) {
      const C = T().sweeper;
      p.sweepUntil = 0;
      p.noActT = Math.max(p.noActT || 0, C.spin);
      this.techFx(g, p, 'sweeper');
      combo(g, p, 'sweeper');
      g.later(C.spin, () => {
        if (g.ball.owner !== p || g.state !== 'play') return;
        const dir = g.teams[p.team].dir;
        let best = null;
        for (const m of g.teams[p.team].players) if (m !== p && m.state !== 'stun' && (!best || m.x * dir > best.x * dir)) best = m;
        if (!best) return;
        SFC.Actions.passTo(g, p, best, 'ground', 0, 0, 0.9);
        addRatings(best, { pace: C.boost }, 1);
        g.effects.legendAura(best.id, p.legend, C.boostT);
        g.later(C.boostT, () => addRatings(best, { pace: C.boost }, -1));
      });
    },
    // lao người theo hướng (dx, dy) như cú lướt nhưng không tốn hồi chiêu lướt
    dash(g, p, dx, dy, time, speed) {
      p.state = 'dash'; p.stateT = time;
      p.dashX = dx * speed; p.dashY = dy * speed;
      p.facing = Math.atan2(dy, dx);
      p.trailLife = 0.3; p.trailLeft = 1; p.trailT = time / 2;
      g.effects.afterimage(p, p.trailLife);
      g.sfx('whoosh');
    },
    // XOẠC BÓNG đang trượt: chạm đối thủ đầu tiên -> họ bay lộn flips vòng; hết đà mà hụt -> nằm
    slideStep(g, p, dt) {
      const C = T().slide;
      for (const o of g.teams[1 - p.team].players) {
        if (o.state === 'stun' || o.airZ > 0 || Math.hypot(o.x - p.x, o.y - p.y) > C.reach + (o.radius || 0)) continue;
        p.slideT = 0;
        const d = Math.hypot(o.x - p.x, o.y - p.y) || 1, nx = (o.x - p.x) / d, ny = (o.y - p.y) / d;
        o.hit({ stun: C.stun, launch: C.launch, kbx: nx * 90, kby: ny * 90, source: p, quiet: true });
        g.effects.legendTech(o.id, 'flip', C.stun * 0.9);
        combo(g, p, 'slide', o);
        g.effects.burst(o.x, o.y, 14, '#d8c8a0', 20, 110, 0.5);
        g.effects.shake(4, 0.2);
        g.sfx('tackle');
        return;
      }
      if ((p.slideT -= dt) > 0) return;
      p.slideT = 0;
      if (p.state === 'dash' || p.state === 'normal') { p.state = 'stun'; p.stateT = C.miss; }
    },
    setup(g) { for (const p of g.players) if (def(p)) this.setupOne(g, p); },
    setupOne(g, p) {
      const F = flaw(p);
      p.leg = { n: 0, cd: 0, t: 0, hits: 0, holdT: 0, inBox: false, boost: null };
      if (F && F.kind === 'random' && !g.opts.mirror) {
        const ids = ATTR().order.filter((s) => s !== 'keeper'), up = ids.splice(Math.floor(Math.random() * ids.length), 1)[0];
        const dn = ids[Math.floor(Math.random() * ids.length)];
        addRatings(p, { [up]: F.up, [dn]: F.dn }, 1);
        p.leg.rand = { up, dn };
      }
      this.report(g, p);
    },
    // đổi LEGEND của p giữa trận (phòng test RUN TEST): gỡ chỉ số / khoảnh khắc / nhược điểm random của LEGEND cũ, gắn LEGEND mới
    swap(g, p, id) {
      const old = def(p);
      if (old) {
        if (p.leg && p.leg.t > 0) this.stop(g, p);
        addRatings(p, old.stats, -1);
        if (p.leg && p.leg.rand) addRatings(p, { [p.leg.rand.up]: old.flaw.up, [p.leg.rand.dn]: old.flaw.dn }, -1);
      }
      p.legend = id || undefined;
      p.leg = null;
      const L = def(p);
      if (!L) return;
      addRatings(p, L.stats, 1);
      this.setupOne(g, p);
    },
    // báo trạng thái cho HUD (cả máy khách online)
    report(g, p) {
      const S = p.leg;
      if (S && !g.opts.mirror) g.effects.legendHud(p.id, +S.t.toFixed(2), +S.cd.toFixed(2), S.n, S.hits);
    },
    // trạng thái ô LEGEND trên HUD: { t (giây còn bật, 0 = tắt; final = 9999), dur, cd (giây còn nghỉ), cdMax, n, max, hits, hitsMax, red }
    hud(g, p) {
      const L = def(p), M = LC().moment;
      if (!L) return null;
      const F = flaw(p) || {}, out = { dur: L.moment.on === 'final' ? 0 : M.dur, cdMax: M.cooldown, max: M.max, hitsMax: F.kind === 'red' ? F.hits : 0, red: F.kind === 'red' && p.noActT > 0 };
      const S = p.leg, H = g.effects.V.leghud && g.effects.V.leghud[p.id];
      // khoảnh khắc LEGEND tắt (moment.enabled): ô chỉ hiện hồi chiêu của kỹ thuật (slide / bruiser...) — máy khách online: luôn sẵn sàng
      if (!M.enabled) {
        out.moment = false;
        const cdT = (L.tech && (T()[L.tech] || {}).cd) || 0;
        return Object.assign(out, { t: 0, cd: !g.opts.mirror && cdT ? Math.max(0, (p.techCd || 0) - g.time) : 0, cdMax: cdT || 1, n: 0, hits: S ? S.hits : 0 });
      }
      if (S && !g.opts.mirror) return Object.assign(out, { t: S.t, cd: S.cd, n: S.n, hits: S.hits });
      if (!H) return Object.assign(out, { t: 0, cd: 0, n: 0, hits: 0 });
      const el = Math.max(0, g.time - H.at);
      return Object.assign(out, { t: H.t > 999 ? H.t : Math.max(0, H.t - el), cd: H.t > 0 ? H.cd : Math.max(0, H.cd - el), n: H.n, hits: H.hits });
    },

    // bật khoảnh khắc LEGEND của p (đủ điều kiện: chưa đang bật, hết nghỉ, chưa hết lượt trong trận)
    fire(g, p) {
      const L = def(p), M = LC().moment, S = p.leg;
      if (!M.enabled || !L || !S || g.opts.mirror || g.state === 'ended' || S.t > 0 || S.cd > 0 || S.n >= M.max) return false;
      const fin = L.moment.on === 'final', dur = fin ? 9999 : M.dur;
      S.n++;
      S.t = dur;
      S.boost = L.moment.stats;
      addRatings(p, S.boost, 1);
      const fx = g.effects;
      fx.legendAura(p.id, p.legend, dur);
      fx.ring(p.x, p.y - 6, L.color);
      fx.burst(p.x, p.y - 10, 14, L.color, 30, 120, 0.5);
      // cut-in chân dung: không đè cut-in Tuyệt kỹ, 2 cut-in LEGEND cách nhau cutGap giây
      if (!fx.O.cutins.length && g.time - (g.legCutAt == null ? -1e9 : g.legCutAt) >= M.cutGap) {
        g.legCutAt = g.time;
        fx.legendCut(p.id, p.legend, M.cutT);
      }
      g.sfx('legend');
      this.report(g, p);
      return true;
    },
    stop(g, p) {
      const S = p.leg;
      if (S.boost) addRatings(p, S.boost, -1);
      S.boost = null;
      S.t = 0;
      S.cd = LC().moment.cooldown;
      this.report(g, p);
    },

    update(g, dt) {
      if (g.opts.mirror) return;
      const M = LC().moment, b = g.ball;
      for (const p of g.players) {
        if (p.slideT > 0) this.slideStep(g, p, dt);
        if (p.rainbow) this.rainbowStep(g, p, dt);
        // ENGINE PRESS: nhả phím (human.js thôi gọi engine) -> tắt dáng chạy
        if (p.engineOn && g.time - p.engineAt > 0.06) { p.engineOn = false; g.effects.legendTech(p.id, 'engine', 0); }
        const S = p.leg, L = S && def(p);
        if (!L) continue;
        if (S.t > 0 && (S.t -= dt) <= 0) this.stop(g, p);
        if (S.cd > 0) S.cd = Math.max(0, S.cd - dt);
        const own = b.owner === p;
        S.holdT = own ? S.holdT + dt : 0;
        const box = own && g.inBox(1 - p.team, p);
        switch (L.moment.on) {
          case 'box': if (box && !S.inBox) this.fire(g, p); break;
          case 'hold': if (S.holdT >= M.hold) { S.holdT = -1e9; this.fire(g, p); } break;   // giữ tiếp không tính lại tới khi mất bóng
          case 'final': if (g.finalPush || g.golden) this.fire(g, p); break;
          case 'longShot': if (own && p.charging && g.inOwnHalf(p)) this.fire(g, p); break;
        }
        S.inBox = box;
      }
    },

    // tình huống từ gameplay. x: người nhận (longPass)
    on(g, ev, p, x) {
      const L = def(p);
      if (!L || !p.leg || g.opts.mirror) return;
      const F = flaw(p);
      if (ev === 'hardHit' && F && F.kind === 'red') this.foul(g, p, F);
      if (ev === 'win' && p.sweepUntil > g.time && L.tech === 'sweeper') this.sweeper(g, p);
      if (L.moment.on !== ev) return;
      if (ev === 'longPass' && !(x && Math.hypot(x.x - p.x, x.y - p.y) >= LC().moment.longPass)) return;
      this.fire(g, p);
    },
    // THẺ ĐỎ: đòn nặng thứ hits -> đứng ngoài cuộc (không ra đòn / chuyền / sút, đi bộ) time giây
    foul(g, p, F) {
      const S = p.leg;
      if (++S.hits < F.hits) return this.report(g, p);
      S.hits = 0;
      this.report(g, p);
      p.noActT = Math.max(p.noActT || 0, F.time);
      p.walkT = Math.max(p.walkT || 0, F.time);
      if (g.ball.owner === p) g.looseBall(p, -g.teams[p.team].dir, 0);
      g.effects.burst(p.x, p.y - 34, 8, '#ff3d5a', 14, 60, 0.4);
      g.sfx('whistle');
    },

    // hệ số thời gian choáng khi bị đánh (dive: nằm lâu hơn)
    stunMul(p) {
      const F = flaw(p);
      if (!F || F.kind !== 'dive') return 1;
      return F.stun;
    },
    // hệ số lực đẩy khi bị đánh (light: văng xa hơn)
    knockMul(p) {
      const F = flaw(p);
      return F && F.kind === 'light' ? F.knock : 1;
    },
  };

  /* ---------- hiệu ứng (chỉ để nhìn, tham số nguyên thuỷ -> host ghi lại gửi máy khách, net/sync.js) ---------- */
  // bóng mờ huyền thoại sau lưng cầu thủ pid trong t giây (thế giới: chạy theo thời gian trận)
  E.legendAura = function (pid, id, t) {
    const V = this.V, list = V.legauras || (V.legauras = []);
    for (let i = list.length - 1; i >= 0; i--) if (list[i].pid === pid) list.splice(i, 1);
    list.push({ pid, id, t, max: t });
  };
  // cut-in LEGEND: dải chân dung trượt vào cạnh trái màn hình + tên + danh hiệu (lớp phủ: thời gian thật, không dừng trận)
  E.legendCut = function (pid, id, t) {
    const p = this.g.players.find((q) => q.id === pid);
    this.O.legcuts = [{ pid, id, team: p ? p.team : 0, role: p ? p.role : 'FWD', t, max: t }];
  };
  // trạng thái ô LEGEND trên HUD (máy khách online tự đếm lùi từ g.time lúc nhận)
  E.legendHud = function (pid, t, cd, n, hits) {
    const H = this.V.leghud || (this.V.leghud = {});
    H[pid] = { t, cd, n, hits, at: this.g.time };
  };
  // kỹ thuật LEGEND đang diễn trên người pid (t = 0: dừng) — seq tăng mỗi lần ra (ô LEGEND trên HUD loé)
  E.legendTech = function (pid, id, t) {
    const V = this.V, M = V.legtech || (V.legtech = {});
    if (!t) { delete M[pid]; return; }
    V.legseq = (V.legseq || 0) + 1;
    M[pid] = { id, t, max: t, seq: V.legseq };
  };
  // vệt bóng của kỹ thuật (điểm vết ghi ở render/legenddraw.js)
  E.legendBall = function (id, t) { this.V.legball = { id, t, max: t, pts: [] }; };
  SFC.Effects.COSMETIC.push('legendAura', 'legendCut', 'legendHud', 'legendTech', 'legendBall');
  const baseCosmetic = E.updateCosmetic;
  E.updateCosmetic = function (dt) {
    baseCosmetic.call(this, dt);
    const list = this.V.legauras, M = this.V.legtech, LB = this.V.legball;
    if (list) for (let i = list.length - 1; i >= 0; i--) if ((list[i].t -= dt) <= 0) list.splice(i, 1);
    if (M) for (const k in M) if ((M[k].t -= dt) <= 0) delete M[k];
    if (LB && (LB.t -= dt) <= 0) this.V.legball = null;
  };
  const baseOverlay = E.updateOverlay;
  E.updateOverlay = function (dt) {
    baseOverlay.call(this, dt);
    const o = this.O;
    if (o.legcuts) o.legcuts = o.legcuts.filter((c) => (c.t -= dt) > 0);
  };

  SFC.Legends = Legends;
})();
