/* Renderer — vẽ 1 frame: nền → hazard sàn → entity (y-sort) → khung thành → FX → vignette */
window.SFC = window.SFC || {};

(function () {
  const SP = () => SFC.Sprites;
  const U = SFC.U;
  const PASS_COLORS = { ground: '#7fe7ff', through: '#9dff3d', lob: '#ffb13d' };

  const R = {
    init(canvas) {
      const C = SFC_CONFIG.game.render;
      canvas.width = C.width;
      canvas.height = C.height;
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.ctx.imageSmoothingEnabled = false;
      this.vig = SFC.Background.vignette();
      this.bgFor = null;
      this.bg = null;
    },

    render(g) {
      const ctx = this.ctx, { px, disc, ellipse, ringPx, drawPlayer, drawBall } = SP();
      const C = SFC_CONFIG.game.render;
      if (this.bgFor !== g) { this.bg = SFC.Background.build(g); this.bgFor = g; }
      // hết trận (Beat 1 trên sân): mô phỏng đã dừng -> giữ rung màn hình như trước và tự đếm nhịp ăn mừng / thất vọng theo khung vẽ
      if (g.state === 'ended' && !g.preview) {
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const dt = g._endTick ? Math.min(0.05, (now - g._endTick) / 1000) : 0;
        g._endTick = now;
        if (dt > 0) {
          g.time += dt;
          for (const p of g.players) {
            p.anim += dt;
            if (p.celId) p.celT = (p.celT || 0) + dt;
          }
        }
      }
      const fx = g.effects, f = g.field, t = g.time;

      ctx.save();
      if (fx.shakeA > 0) ctx.translate(Math.round((Math.random() - 0.5) * fx.shakeA * 2), Math.round((Math.random() - 0.5) * fx.shakeA * 2));
      SFC.VFX.applyZoom(ctx, g);
      this.goalCam(ctx, g);
      ctx.drawImage(this.bg, 0, 0);
      // khán giả chuyển động (arena.crowd) — đè lên ảnh nền, dưới mọi thứ trên sân
      SFC.Crowd.draw(ctx, g);
      // VFX Kit: vết nứt / hố / cháy xém + vòng sóng chấn trên mặt sân
      SFC.VFX.floor(ctx, g);

      /* --- lớp sàn --- */
      // khiên Aegis trên vạch vôi
      [0, 1].forEach((team) => {
        if (!g.cores.shieldReady(team)) return;
        // khiên lục giác năng lượng dựng trên vạch vôi
        const lx = team === 0 ? f.x : f.x + f.w;
        ctx.globalCompositeOperation = 'lighter';
        const pulse = 0.35 + Math.sin(t * 6) * 0.12;
        ctx.globalAlpha = pulse * 0.5;
        px(ctx, lx - 2, f.gTop - f.goalHeight, 5, f.goalWidth + f.goalHeight, '#7fe7ff');
        ctx.globalAlpha = pulse + 0.25;
        ctx.strokeStyle = '#7fe7ff'; ctx.lineWidth = 1;
        for (let yy = f.gTop - f.goalHeight + 4, i = 0; yy < f.gBot; yy += 7, i++) {
          const ox = i % 2 ? 1 : -1;
          ctx.beginPath();
          ctx.moveTo(lx + ox, yy - 3); ctx.lineTo(lx + ox + 2, yy - 1); ctx.lineTo(lx + ox + 2, yy + 2);
          ctx.lineTo(lx + ox, yy + 4); ctx.lineTo(lx + ox - 2, yy + 2); ctx.lineTo(lx + ox - 2, yy - 1); ctx.closePath(); ctx.stroke();
        }
        const sy = f.gTop - f.goalHeight + ((t * 40) % (f.goalWidth + f.goalHeight));
        px(ctx, lx - 2, Math.round(sy), 5, 2, '#ffffff');
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      });
      // mìn EMP
      for (const m of fx.mines) {
        const armed = m.arm <= 0;
        disc(ctx, m.x, m.y, 4, SP().OUT);
        disc(ctx, m.x, m.y, 3, '#3a4250');
        const blink = armed && Math.floor(t * 4) % 2 === 0;
        px(ctx, m.x - 1, m.y - 1, 2, 2, blink ? '#7fe7ff' : g.teams[m.team].cfg.kit.accent);
        if (armed) {
          ringPx(ctx, m.x, m.y + 1, m.r, 'rgba(127,231,255,0.35)');
          if (blink && Math.random() < 0.3) px(ctx, m.x - 3 + Math.round(Math.random() * 6), m.y - 3 - Math.round(Math.random() * 3), 1, 2, '#bdf4ff');
        }
      }
      // lửa (vết cháy xém bên dưới + ngọn lửa)
      for (const fi of fx.fires) {
        ctx.globalAlpha = Math.min(1, (fi.t / fi.max) * 2) * 0.5;
        disc(ctx, fi.x, fi.y + 1, fi.r, 'rgba(30,18,12,0.7)');
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'lighter';
      for (const fi of fx.fires) {
        const k = fi.t / fi.max;
        const r = Math.max(1, Math.round(fi.r * (0.4 + k * 0.6)));
        disc(ctx, fi.x, fi.y, r, `rgba(255,90,20,${0.25 + k * 0.3})`);
        disc(ctx, fi.x, fi.y - 1, Math.max(1, r - 2), `rgba(255,200,60,${0.2 + k * 0.3})`);
        if (Math.random() < 0.3 * k) px(ctx, fi.x + (Math.random() - 0.5) * r * 2, fi.y - Math.random() * 8, 1, 2, '#ffe070');
      }
      ctx.globalCompositeOperation = 'source-over';

      // hiệu ứng trang phục khi chạy (bụi / neon / lửa) — chỉ để trang trí, tính ở máy vẽ
      this.cosmetics(ctx, g);

      // vòng chân cầu thủ trên sân (1 kiểu viền tối kẹp màu ở giữa):
      // - người đang điều khiển (me): to và dày hơn (thick = 2)
      // - đồng đội (ally): cyan, nhỏ và mảnh hơn (thick = 1)
      // - đối thủ (opp): đỏ, nhỏ và mảnh hơn (thick = 1)
      const cp = g.controlled;
      const CC = C.ctrlColors;
      const ctrlColor = (p) => (!g.preview && g.isHuman(p.team) && p.isControlled
        ? (p === cp ? CC.me : p.team === g.humanTeam ? CC.ally : CC.opp) : null);
      // trận xếp hạng (Main Path): chỉ dấu mũi tên của máy này — người thật khác không khác gì người chơi giả
      // trận co-op (mọi người chơi thật cùng 1 đội: Story / GOAT PATH / phòng riêng đá với bot): cũng chỉ mũi tên của máy này (user 2026-10-31)
      const coop = (g.seats || []).length > 1 && g.seats.every((s) => s.team === g.seats[0].team);
      const rank = !!g.opts.mainPath || coop, seatRing = (c) => c && (!rank || c === cp);
      // Smoke Bomb: người tàng hình (p.ghostT) — đối thủ của máy này không thấy gì (cả bóng ở chân), đội mình thấy bóng mờ
      const unseen = (p) => p.ghostT > 0 && g.humanTeam >= 0 && p.team !== g.humanTeam;
      // luật trận School Ghosts (src/systems/matchmods.js): ma xa bóng mờ dần — vẫn còn bóng hình, chỉ mất vòng chân
      const faint = (p) => (g.mod && SFC.MatchMods ? SFC.MatchMods.alpha(g, p) : 1);

      const drawFootRing = (cx, cy, r, thick, col) => {
        const OUT = SP().OUT;
        ringPx(ctx, cx, cy, r + thick, OUT);
        ringPx(ctx, cx, cy, r - 1, OUT);
        for (let i = 0; i < thick; i++) ringPx(ctx, cx, cy, r + i, col);
      };

      if (!g.preview && g.humanTeam >= 0) {
        const FR = C.footRings || { me: { r: 8, thick: 1 }, other: { r: 7, thick: 1 } };
        for (const p of g.players) {
          if (unseen(p) || faint(p) < 0.6) continue;   // vòng chân không được làm lộ người đang tàng hình / ma đang mờ
          const isMe = p === cp;
          const isAlly = p.team === g.humanTeam;
          const col = isMe ? CC.me : isAlly ? CC.ally : CC.opp;
          const cfg = isMe ? FR.me : FR.other;
          drawFootRing(p.x, p.y + 1, cfg.r, cfg.thick, col);
        }
      }

      // assisted passing chạy ngầm; chỉ hiện gợi ý người nhận khi bật showTargetHint (debug)
      const pv = g.state === 'play' && SFC_CONFIG.game.pass.showTargetHint ? g.passPreview : null;
      const pvCol = pv ? PASS_COLORS[pv.mode] : null;
      if (pv && pv.target) ringPx(ctx, pv.target.x, pv.target.y + 1, 9 + Math.round(Math.sin(t * 10)), pvCol);

      // GOAT PATH SKILL GAME: bia / cổng trên mặt sân (render/rundraw.js)
      if (g.drill && SFC.RunDraw) SFC.RunDraw.floor(ctx, g);
      if (SFC.LegendDraw) SFC.LegendDraw.ballTrail(ctx, g);   // GOAT PATH: vệt bóng của kỹ thuật LEGEND

      // bụi chân khi chạy nước rút / phanh gấp + tiếng bước chân (fx.run) — vẽ sau vòng chân để không bị vòng che
      this.runFeel(ctx, g);

      // điểm rơi bóng bổng (nằm trên mặt sân, dưới cầu thủ)
      this.landingMarker(ctx, g);

      /* --- entity y-sort --- */
      const list = [];
      for (const p of g.players) list.push({ y: p.y, k: 'p', o: p });
      list.push({ y: g.ball.y + 0.5, k: 'b', o: g.ball });
      for (const d of fx.decoys) list.push({ y: d.y, k: 'd', o: d });
      for (const a of fx.afterimages) list.push({ y: a.y - 0.1, k: 'a', o: a });
      for (const c of SFC.VFX.clones(g)) list.push({ y: c.y, k: 'cl', o: c });
      for (const pr of SFC.VFX.props(g)) list.push({ y: pr.y, k: 'pr', o: pr.o, part: pr.part });   // vật thể Tuyệt kỹ (cột đá, đe, gương...)
      list.sort((a, b) => a.y - b.y);
      const marks = [];
      let hidden = null;   // người đang điều khiển đang tàng hình (chữ HIDDEN trên đầu + viền màn hình)

      for (const e of list) {
        if (e.k === 'p') {
          const p = e.o;
          if (unseen(p)) continue;
          // khổng lồ (VFX Kit GI): phóng to quanh bàn chân
          const s = p.sizeMul || 1;
          // Smoke Bomb: đồng đội đang tàng hình -> vẽ mờ sprite (cả bóng đang dắt)
          const ghost = p.ghostT > 0;
          if (ghost && p === cp && !g.preview) hidden = p;
          SFC.VFX.under(ctx, g, p);
          if (p.legend && SFC.LegendDraw) SFC.LegendDraw.under(ctx, g, p);   // GOAT PATH: bóng mờ LEGEND sau lưng (khoảnh khắc LEGEND)
          if (s !== 1) { ctx.save(); ctx.translate(p.x, p.y); ctx.scale(s, s); ctx.translate(-p.x, -p.y); }
          const dive = p.atkType === 'diveU' || p.atkType === 'diveD';
          // drawPlayer tự đặt globalAlpha theo tham số alpha
          // ăn mừng bàn thắng + cuối trận (src/render/celebrate-draw.js): diễn khi 'goal' hoặc 'ended'
          const cel = p.celId && (g.state === 'goal' || g.state === 'ended') && !(p.airZ > 0);
          // King Kong / đứng trên tảng đá / con gà: vật thể Tuyệt kỹ tự vẽ nhân vật (render/vfx.js), bỏ sprite thật
          const swap = SFC.VFX.hides(g, p);
          // hoảng sợ (Panic Ball): run lẩy bẩy
          const shiver = SFC.VFX.has(g, p, 'panic') ? (Math.floor(t * 30) % 2 ? 1 : -1) : 0;
          if (shiver) { ctx.save(); ctx.translate(shiver, 0); }
          // GOAT PATH: kỹ thuật LEGEND đang diễn -> biến đổi quanh sprite (render/legenddraw.js)
          const lx = !swap && !cel && SFC.LegendDraw ? SFC.LegendDraw.begin(ctx, g, p) : false;
          let hy = swap ? p.y - 30 : cel ? SFC.CelebrateDraw.draw(ctx, p, g) : p.airZ > 0 ? this.airborne(ctx, p, g) : dive ? this.diving(ctx, p, g) : drawPlayer(ctx, p, g, ghost ? 0.3 : faint(p));
          ctx.globalAlpha = 1;
          if (lx) { ctx.restore(); SFC.LegendDraw.after(ctx, g, p); }
          if (shiver) ctx.restore();
          if (s !== 1) { ctx.restore(); hy = p.y + (hy - p.y) * s; }
          SFC.VFX.form(ctx, g, p, swap || cel ? null : hy);
          SFC.VFX.arm(ctx, g, p);
          SFC.VFX.look(ctx, g, p, hy);
          if (p.inj && SFC.RunDraw && !swap) SFC.RunDraw.hurt(ctx, g, p, hy);   // GOAT PATH: dấu chấn thương cạnh đầu
          if (p.charging) this.chargeBar(ctx, p, hy, g);
          if (p.passMode) this.passBar(ctx, p, hy);
          // đồng đội AI đang chạy chỗ (ai.runs): mũi tên đôi chỉ hướng chạy trên đầu -> người chơi kịp chuyền / chọc khe
          if (p.ai && p.ai.runT > 0 && p.ai.runTo && !g.preview && g.isHuman(p.team) && !p.isControlled) this.runCue(ctx, p, hy, t);
          if (pv && pv.target === p) {
            const ay = hy - 13 + Math.round(Math.sin(t * 10));
            px(ctx, p.x - 3, ay, 7, 1, pvCol); px(ctx, p.x - 2, ay + 1, 5, 1, pvCol); px(ctx, p.x - 1, ay + 2, 3, 1, pvCol);
          }
          // mũi tên trên đầu: vẽ sau cùng (sau mọi VFX) để hiệu ứng không che mất người mình điều khiển
          const cc = ctrlColor(p);
          if (cc && seatRing(p)) marks.push({ p, hy, cc });
          if (p === cp && !g.preview && g.state !== 'ended') {
            if (p.stamina < SFC_CONFIG.game.player.staminaMax - 1) {
              px(ctx, p.x - 7, p.y + 4, 14, 2, SP().OUT);
              px(ctx, p.x - 6, p.y + 4, Math.round(12 * p.stamina / SFC_CONFIG.game.player.staminaMax), 1, p.stamina > 25 ? '#6bff7a' : '#ff5a4f');
            }
          }
        } else if (e.k === 'b') {
          if (g.ball.owner && unseen(g.ball.owner)) continue;
          const ghostBall = g.ball.owner && g.ball.owner.ghostT > 0;
          if (ghostBall) ctx.globalAlpha = 0.3;
          this.ballTrail(ctx, g.ball);
          SFC.VFX.ballFx(ctx, g.ball);
          drawBall(ctx, g.ball);
          if (ghostBall) ctx.globalAlpha = 1;
        } else if (e.k === 'd') {
          const d = e.o, a = 0.5 + 0.3 * Math.sin(t * 20);
          // ảo ảnh Chạy Giả: áo tím, nhấp nháy
          if (d.legion) { SFC.VFX.legion(ctx, g, d); continue; }   // Clone Legion: phân thân ở lại sân (không bóng)
          if (d.runner) drawPlayer(ctx, Object.assign({ x: d.x - Math.cos(d.runner.facing) * 9, y: d.y - Math.sin(d.runner.facing) * 8, vx: d.vx, vy: d.vy, state: 'normal', flash: 0 }, d.runner), g, a * 0.8, '#9d7bff');
          drawBall(ctx, { x: d.x, y: d.y, z: 0, roll: t * 20, fx: {} }, a);
        } else if (e.k === 'a') {
          const a = e.o;
          // bóng mờ khi lướt: mặc áo đội của chính cầu thủ đó, mờ dần
          drawPlayer(ctx, a, g, (a.t / a.max) * 0.5, null, true);
        } else if (e.k === 'cl') {
          SFC.VFX.drawClone(ctx, g, e.o);
        } else if (e.k === 'pr') {
          SFC.VFX.drawProp(ctx, g, e.o, e.part);
        }
      }

      /* --- khung thành (vẽ sau để lưới phủ lên bóng) --- */
      this.goal(ctx, g, -1);
      this.goal(ctx, g, 1);
      if (g.drill && SFC.RunDraw) SFC.RunDraw.top(ctx, g);   // GOAT PATH SKILL GAME: bia trên khung thành (phủ lên lưới)

      /* --- FX trên cao --- */
      // Cước Phong: lưỡi gió trăng khuyết + bụi bị thổi tung dọc đường
      for (const s of fx.slashes) {
        const k = s.t / s.max, a = Math.atan2(s.dy, s.dx);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(1, k * 3);
        for (let i = -8; i <= 8; i++) {
          const u = i / 8, ang = a + u * 1.2, r = 12 - Math.abs(u) * 4;
          const x = s.x + Math.cos(ang) * r, y = s.y - 6 + Math.sin(ang) * r * 0.75;
          px(ctx, Math.round(x), Math.round(y), 2, 2, Math.abs(u) < 0.5 ? '#ffffff' : '#dffbff');
          px(ctx, Math.round(x - s.dx * 4), Math.round(y - s.dy * 4), 1, 1, 'rgba(127,231,255,0.7)');
        }
        for (let i = 1; i <= 3; i++) px(ctx, Math.round(s.x - s.dx * (8 + i * 7)), Math.round(s.y - 6 - s.dy * (8 + i * 7)), 4 - i, 1, 'rgba(223,251,255,0.6)');
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        if (Math.random() < 0.6) px(ctx, Math.round(s.x - s.dx * 10 + (Math.random() - 0.5) * 16), Math.round(s.y + (Math.random() - 0.5) * 6), 1, 1, 'rgba(217,203,176,0.9)');
      }
      for (const p of fx.particles) {
        ctx.globalAlpha = Math.min(1, (p.t / p.max) * 1.5);
        px(ctx, p.x, p.y - p.z, p.size, p.size, p.color);
      }
      ctx.globalAlpha = 1;
      for (const r of fx.rings) {
        const k = 1 - r.t / r.max;
        ctx.globalAlpha = 1 - k;
        ringPx(ctx, r.x, r.y, 6 + k * 14, r.color);
      }
      ctx.globalAlpha = 1;
      ctx.textAlign = 'center';
      // VFX Kit: lỗ đen, luồng tia, tia sét, chiêu bay, chữ bật ra (Effects.pop)
      SFC.VFX.top(ctx, g);
      for (const m of marks) this.ctrlMark(ctx, m.p, m.hy, m.cc, t);
      if (hidden) this.hiddenMark(ctx, hidden, t);
      ctx.restore();

      ctx.drawImage(this.vig, 0, 0);
      if (hidden) this.stealthVignette(ctx, t);
      if (g.finalPush && g.state === 'play') {
        ctx.globalAlpha = 0.18 + Math.sin(t * 5) * 0.08;
        ctx.strokeStyle = '#ff3d5a'; ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, C.width - 4, C.height - 4);
        ctx.globalAlpha = 1;
      }
      if (fx.flashA > 0) {
        ctx.fillStyle = `rgba(255,255,255,${fx.flashA * (SFC.FXSettings.reduceFlash ? 0.12 : 0.5)})`;
        ctx.fillRect(0, 0, C.width, C.height);
      }
      // VFX Kit: phủ màu, tia tốc độ, cut-in, callout, impact frame (toạ độ màn hình)
      SFC.VFX.overlay(ctx, g);
      if (SFC.LegendDraw) SFC.LegendDraw.overlay(ctx, g);   // GOAT PATH: cut-in LEGEND cạnh trái màn hình
    },

    // Smoke Bomb: mình đang tàng hình — mắt gạch chéo + chữ HIDDEN trên đầu
    hiddenMark(ctx, p, t) {
      const { px, OUT } = SP(), x = Math.round(p.x), y = Math.round(p.y) - 40 + Math.round(Math.sin(t * 4));
      px(ctx, x - 6, y - 3, 13, 7, OUT);
      px(ctx, x - 5, y - 2, 11, 5, '#b9a6d9'); px(ctx, x - 2, y - 2, 5, 5, '#3a2f4a'); px(ctx, x - 1, y - 1, 1, 1, '#ffffff');
      for (let i = 0; i < 9; i++) px(ctx, x - 5 + i, y + 3 - i, 2, 1, i % 2 ? OUT : '#ffffff');   // gạch chéo
      const str = SFC.t('HIDDEN');
      ctx.font = SFC.I18n.isCJK(str) ? '12px ' + SFC.I18n.pxFont() : '8px ' + SFC_CONFIG.game.render.pixelFont;
      ctx.textAlign = 'center';
      ctx.fillStyle = OUT; ctx.fillText(str, x + 1, y - 6);
      ctx.fillStyle = '#d8d0e0'; ctx.fillText(str, x, y - 7);
    },
    // viền màn hình tím than khi mình đang tàng hình (toạ độ màn hình)
    stealthVignette(ctx, t) {
      const C = SFC_CONFIG.game.render;
      if (!this.svig) {
        const cv = document.createElement('canvas');
        cv.width = C.width; cv.height = C.height;
        const c2 = cv.getContext('2d'), gr = c2.createRadialGradient(C.width / 2, C.height / 2, C.height * 0.35, C.width / 2, C.height / 2, C.width * 0.62);
        gr.addColorStop(0, 'rgba(26,18,38,0)'); gr.addColorStop(1, 'rgba(26,18,38,0.85)');
        c2.fillStyle = gr; c2.fillRect(0, 0, C.width, C.height);
        this.svig = cv;
      }
      ctx.globalAlpha = 0.8 + 0.15 * Math.sin(t * 3);
      ctx.drawImage(this.svig, 0, 0);
      ctx.globalAlpha = 1;
    },

    // dấu người mình điều khiển, vẽ sau mọi VFX: nửa trước vòng chân + mũi tên trên đầu.
    // Viền tối 2px để nổi trên cả hiệu ứng vàng / sáng (AURA FARMING: tóc vàng, lửa vàng, vầng sáng dưới chân)
    ctrlMark(ctx, p, hy, col, t) {
      const { px, OUT } = SP();
      const x = Math.round(p.x), y = Math.round(p.y) + 1;
      // nửa trước vòng chân (phía người xem): nằm dưới bàn chân nên không che sprite, nhưng đè lên vầng sáng
      const arc = (r, c) => {
        ctx.fillStyle = c;
        const steps = r * 7;
        for (let i = 0; i <= steps / 2; i++) {
          const a = (i / steps) * Math.PI * 2;
          ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r * 0.5), 1, 1);
        }
      };
      arc(10, OUT); arc(7, OUT); arc(9, col); arc(8, col);
      // mũi tên trên đầu: tam giác 7px, viền tối 2px (nhỏ, nằm dưới thanh lực); AURA FARMING -> nhấc lên khỏi ngọn lửa vàng sau lưng
      const lift = p.auraFarmT > 0 ? 14 : 0;
      const bob = Math.round(Math.sin(t * 8) * 1.5);
      const n = 3;
      const ay = Math.max(4, Math.round(hy - 12 - lift) + bob);
      px(ctx, x - n - 2, ay - 2, 2 * n + 5, 2, OUT);
      for (let i = 0; i <= n + 1; i++) px(ctx, x - (n + 2 - i), ay + i, 2 * (n + 2 - i) + 1, 1, OUT);
      for (let i = 0; i < n; i++) px(ctx, x - (n - i), ay + i, 2 * (n - i) + 1, 1, col);
      px(ctx, x - n + 1, ay, 2 * n - 1, 1, '#ffffff');   // vệt sáng mép trên
    },

    // MÁY QUAY ĂN MỪNG (game.celebration.camera): trận dừng sau bàn thắng -> phóng to bám người ghi bàn đang ăn mừng
    // (phản lưới nhà: bám bóng trong lưới), vào / ra mượt, khung nhìn không lọt ra ngoài ảnh nền. Chỉ vẽ: máy khách online
    // tự tính theo g.state / g.stateT (đã có trong snapshot). Ảnh xem trước Core (g.preview) không dùng
    goalCam(ctx, g) {
      const K = SFC_CONFIG.game.celebration.camera, C = SFC_CONFIG.game.render;
      if (!K || g.preview || g.state !== 'goal') return;
      const total = g.cfg.match.goalCelebration, el = total - g.stateT;
      const k0 = Math.min(U.clamp((el - K.delay) / K.in, 0, 1), U.clamp(g.stateT / K.out, 0, 1));
      if (k0 <= 0) return;
      const k = k0 * k0 * (3 - 2 * k0);
      const p = g.players.find((q) => q.celId);
      const tx = p ? p.x : g.ball.x, ty = p ? p.y - K.lift : g.ball.y;
      const W = C.width, H = C.height, s = 1 + (K.zoom - 1) * k, hw = W / 2 / s, hh = H / 2 / s;
      // tâm khung nhìn trượt từ giữa sân tới người ghi bàn; zoom hết cỡ thì làm tròn pixel cho nét
      let x = U.clamp(W / 2 + (tx - W / 2) * k, hw, W - hw), y = U.clamp(H / 2 + (ty - H / 2) * k, hh, H - hh);
      if (k >= 1) { x = Math.round(x); y = Math.round(y); }
      ctx.translate(W / 2, H / 2);
      ctx.scale(s, s);
      ctx.translate(-x, -y);
    },

    // bị Hard attack đá bay: bóng đổ dưới đất, người lộn vòng trên không + vệt gió
    airborne(ctx, p, g) {
      const { px, ellipse, drawPlayer } = SP();
      const k = Math.max(0.35, 1 - p.airZ / 70);
      ellipse(ctx, Math.round(p.x), Math.round(p.y) + 1, 6 * k, 2.5 * k, 'rgba(0,0,0,0.38)');
      const cy = p.y - p.airZ - 8;
      const dir = (p.kbx || 0) >= 0 ? 1 : -1;
      const sp = Math.hypot(p.kbx || 0, p.kby || 0);
      if (sp > 80) {
        const n = U.norm(p.kbx, p.kby);
        ctx.globalAlpha = Math.min(0.8, sp / 400);
        for (let i = 0; i < 3; i++) {
          const o = (i - 1) * 5;
          px(ctx, Math.round(p.x - n.x * (12 + i * 3) - n.y * o), Math.round(cy - n.y * (12 + i * 3) + n.x * o), 6 - i, 1, '#ffffff');
        }
        ctx.globalAlpha = 1;
      }
      ctx.save();
      ctx.translate(Math.round(p.x), Math.round(cy));
      // bị đá bay (choáng) thì lộn vòng; tự nhảy (Dậm Đất, Thiên Thạch...) thì bay thẳng người
      if (p.state === 'stun' && !(SFC.LegendDraw && SFC.LegendDraw.flipping(g, p))) ctx.rotate(dir * p.anim * 13);   // bị XOẠC (LEGEND): lộn đúng 3 vòng ở legenddraw
      // Comet One-Two: móc xe đạp — lộn ngược ra sau (đầu chúc xuống lúc đá), xoay tiếp cho tròn vòng khi rơi
      else if (p.atkType === 'bicycle') ctx.rotate(-(Math.cos(p.facing) >= 0 ? 1 : -1) * Math.min(2, (p.atkT || 0) / 0.42) * Math.PI);
      drawPlayer(ctx, Object.assign({}, p, { x: 0, y: 8, keeper: false }), g, 0.999);
      ctx.restore();
      return Math.round(cy) - 8;
    },

    // thủ môn đổ người (Actions.dive): bay sang ngang dọc trục y (dọc vạch vôi), mặt vẫn nhìn về phía sân -> camera thấy
    // sườn người: thân dọc theo hướng bay (đầu đi trước), 1 tay vươn qua đầu (drawPlayer, atk.dive), 2 chân khép.
    // Bay xuống (về phía camera) = lật dọc hình bay lên. Lúc lao: bay theo cung; lao xong nằm nghiêng trên sân gkDivePose giây
    diving(ctx, p, g) {
      const { ellipse, drawPlayer } = SP();
      const P = SFC_CONFIG.game.player;
      const flip = p.atkType === 'diveU' ? 1 : -1;
      const side = Math.cos(p.facing) >= 0 ? 1 : -1;
      const flying = p.state === 'dash';
      const k = Math.min(1, (p.atkT || 0) / P.gkDiveTime);
      const lift = flying ? 3 + Math.sin(k * Math.PI) * 6 : 0;
      // ngả nhẹ đầu về phía sân (lúc bay nhiều hơn lúc nằm)
      const rot = side * (flying ? 0.22 : 0.1) * flip;
      // bóng đổ dài theo thân nằm dọc trục y, nhỏ lại khi bay cao
      const sk = 1 - lift / 24;
      ellipse(ctx, Math.round(p.x), Math.round(p.y) + 1, 5 * sk, 8 * sk, 'rgba(0,0,0,0.38)');
      const cy = p.y - lift - 2;
      // thân nằm dọc trục y nhìn từ camera trên cao -> ngắn lại theo phối cảnh (nằm sát đất ngắn hơn lúc bay)
      const squash = flying ? 0.85 : 0.7;
      // vệt gió sau gót chân lúc bay
      if (flying) {
        const { px } = SP();
        ctx.globalAlpha = 0.7;
        for (let i = 0; i < 3; i++) px(ctx, Math.round(p.x - 3 + i * 3), Math.round(cy - flip * (12 + i * 2) * squash + flip * 22), 1, 4 + (i % 2) * 2, '#ffffff');
        ctx.globalAlpha = 1;
      }
      // vẽ thẳng đứng vào bộ đệm rồi xoay cả ảnh (lấy mẫu điểm gần nhất) -> pixel vẫn sắc, không nhoè như xoay từng ô vẽ
      const N = 48, buf = this.diveBuf || (this.diveBuf = document.createElement('canvas'));
      if (buf.width !== N) { buf.width = N; buf.height = N; }
      const bc = buf.getContext('2d');
      bc.clearRect(0, 0, N, N);
      // vx = vy = 0: không nhún chân / vung tay như đang chạy
      drawPlayer(bc, Object.assign({}, p, { x: N / 2, y: N / 2 + 10, vx: 0, vy: 0, keeper: g.inKeeperZone(p) }), g, 0.999);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(Math.round(p.x), Math.round(cy));
      ctx.rotate(rot);
      ctx.scale(1, flip * squash);
      ctx.drawImage(buf, -N / 2, -N / 2);
      ctx.restore();
      return Math.round(cy) - 14;
    },

    cosmetics(ctx, g) {
      const S = SP();
      const now = performance.now();
      const dt = Math.min(0.05, this.cosT ? (now - this.cosT) / 1000 : 0);
      this.cosT = now;
      this.cosClock = (this.cosClock || 0) + dt;
      const list = this.cos || (this.cos = []);
      if (this.cosFor !== g) { list.length = 0; this.cosFor = g; }
      for (const p of g.players) {
        const kind = p.look.fx, d = S.FX[kind];
        if (!d || p.airZ > 0 || p.ghostT > 0) continue;   // tàng hình (Smoke Bomb): không để lại vệt trang phục
        const sp = Math.hypot(p.vx || 0, p.vy || 0);
        if (sp < 40) continue;
        p.cosAcc = (p.cosAcc || 0) + d.rate * dt * (sp > 110 ? 1.6 : 1);
        while (p.cosAcc >= 1) {
          p.cosAcc--;
          const q = S.spawnFx(kind, p, this.cosClock);
          if (q) list.push(q);
        }
      }
      for (const q of list) S.stepFx(q, dt);
      for (let i = list.length - 1; i >= 0; i--) if (list[i].t <= 0) list.splice(i, 1);
      if (list.length > 500) list.splice(0, list.length - 500);
      for (const q of list) S.drawFxParticle(ctx, q, g);
    },

    // CẢM GIÁC CHẠY (fx.run): bụi chân mỗi bước chạy nước rút, nhúm bụi lúc bắt đầu chạy nước rút, bụi trượt khi phanh /
    // bẻ lái gắt + tiếng bước chân của cầu thủ mình điều khiển. Chỉ ở máy vẽ, theo vx / vy (online: có trong snapshot).
    // Bước nào cầu thủ không dời chỗ (tạm dừng, hitstop, khung hình không có bước mô phỏng) thì bỏ qua -> không tung bụi tại chỗ
    runFeel(ctx, g) {
      const R = SFC_CONFIG.game.fx.run, S = SP();
      if (!R) return;
      const now = performance.now();
      const dt = Math.min(0.05, this.runT ? (now - this.runT) / 1000 : 0);
      this.runT = now;
      const list = this.dust || (this.dust = []);
      if (this.dustFor !== g) { list.length = 0; this.dustFor = g; this.runSt = new WeakMap(); }
      // at: px sau gót theo hướng chạy (bụi sinh ngay dưới chân bị sprite che mất)
      const puff = (p, n, back, spread, life, at = 7) => {
        const sp = Math.hypot(p.vx, p.vy) || 1, ux = p.vx / sp, uy = p.vy / sp;
        for (let i = 0; i < n; i++) {
          list.push({
            k: 'run', shape: 'px', add: false, c: R.dust[Math.floor(Math.random() * R.dust.length)],
            x: p.x - ux * at + (Math.random() - 0.5) * 4, y: p.y + 1 - uy * at * 0.6 + (Math.random() - 0.5) * 3, z: 0.5,
            vx: -p.vx * back + (Math.random() - 0.5) * spread, vy: -p.vy * back * 0.6 + (Math.random() - 0.5) * spread * 0.5,
            vz: 6 + Math.random() * 10, g: 40, drift: 0, phase: 0, t: life, max: life, s: Math.random() < 0.3 ? 1 : 2,
          });
        }
      };
      const me = !g.preview && g.state === 'play' ? g.controlled : null;
      for (const p of g.players) {
        let st = this.runSt.get(p);
        if (!st) { st = { x: p.x, y: p.y, hist: [], stride: 0, cd: 0, run: false, ok: false }; this.runSt.set(p, st); }
        const moved = p.x !== st.x || p.y !== st.y;
        st.x = p.x; st.y = p.y;
        if (!moved || dt <= 0) continue;
        st.cd = Math.max(0, st.cd - dt);
        const ok = p.state === 'normal' && !(p.airZ > 0) && !(p.ghostT > 0) && !p.celId;
        const sp = Math.hypot(p.vx || 0, p.vy || 0);
        // vận tốc ~0.08s trước (không lấy khung trước: online vx nhảy theo từng snapshot)
        st.hist.push({ t: now, vx: p.vx || 0, vy: p.vy || 0 });
        while (st.hist.length > 2 && now - st.hist[1].t > 80) st.hist.shift();
        if (!ok || !st.ok) { st.ok = ok; st.run = sp > R.sprint; st.hist.length = 0; continue; }
        const h = st.hist[0], span = (now - h.t) / 1000, hs = Math.hypot(h.vx, h.vy);
        // phanh / bẻ lái: phần gia tốc ngược hướng chạy cũ
        if (span > 0.05 && hs > R.sprint * 0.9 && st.cd <= 0) {
          const brake = -((p.vx - h.vx) * h.vx + (p.vy - h.vy) * h.vy) / hs / span;
          if (brake > R.brake) { puff({ x: p.x, y: p.y, vx: h.vx, vy: h.vy }, 7, -0.25, 34, 0.45, -7); st.cd = 0.35; st.hist.length = 0; }
        }
        if (sp > R.sprint) {
          if (!st.run) { st.run = true; puff(p, 6, 0.35, 28, 0.45); st.stride = R.stride; }   // bắt đầu chạy nước rút
          else if ((st.stride -= dt) <= 0) {
            st.stride += R.stride;
            puff(p, 2 + (Math.random() < 0.4 ? 1 : 0), 0.3, 12, 0.35);
            if (p === me && R.stepVolume > 0) SFC.Audio.step(R.stepVolume);
          }
        } else if (sp < R.sprint * 0.8) st.run = false;
      }
      for (const q of list) S.stepFx(q, dt);
      for (let i = list.length - 1; i >= 0; i--) if (list[i].t <= 0) list.splice(i, 1);
      if (list.length > 200) list.splice(0, list.length - 200);
      for (const q of list) S.drawFxParticle(ctx, q, g, 0.75);
    },

    chargeBar(ctx, p, hy, g) {
      const { px, OUT } = SP();
      const K = SFC_CONFIG.game.kick;
      const w = 18, x = Math.round(p.x - w / 2), y = hy - 22;   // trên mũi tên điều khiển, không bị che
      const base = SFC.Actions.shotBasePower(g, p);
      const c = SFC.Actions.shotPower(g, p, p.charge), over = SFC.Actions.overcharge(p.charge) / (K.maxOvercharge - 1 - (K.overGrace || 0));
      const col = over > 0 ? '#ff3d3d' : c > 0.85 ? '#ffb13d' : '#ffe14f';
      // Đọc Cú Sút: đối phương đang thủ thế đọc cú sút này -> viền xanh (tín hiệu cần nhìn)
      if (g.ball.owner === p && g.teams[1 - p.team].players.some((q) => q.bracing)) px(ctx, x - 2, y - 2, w + 4, 7, '#3ff6ff');
      px(ctx, x - 1, y - 1, w + 2, 5, OUT);
      // lực mặc định theo khoảng cách — mờ; phần giữ thêm — đậm
      ctx.globalAlpha = 0.45;
      px(ctx, x, y, Math.round(w * base), 3, col);
      ctx.globalAlpha = 1;
      if (c > base + 0.01) px(ctx, x, y, Math.round(w * c), 3, col);
      px(ctx, x + Math.round(w * base), y - 1, 1, 5, '#ffffff');
      if (over > 0) px(ctx, x, y, Math.round(w * over), 1, '#ffffff');
      // AI: vạch lực sẽ sút (sút ngay khi thanh chạm vạch) -> người chơi có mốc để căn Đọc Cú Sút.
      // Phần còn phải nạp tô đỏ mờ; còn < 0.2s là sút: vạch loé trắng + mũi tên to hơn
      const tg = p.shotTarget || 0;
      if (tg > 0) {
        const mx = x + Math.min(w - 1, Math.round(w * tg)), fillX = x + Math.round(w * c);
        const left = (tg - c) * g.chargeTime(p) / Math.max(0.01, 1 - base);
        const hot = left < 0.2 && Math.floor(g.time * 20) % 2 === 0, mc = hot ? '#ffffff' : '#ff3d5a';
        if (mx > fillX) { ctx.globalAlpha = 0.35; px(ctx, fillX, y, mx - fillX, 3, '#ff3d5a'); ctx.globalAlpha = 1; }
        px(ctx, mx, y - 2, 1, 7, mc);
        px(ctx, mx - 1, y - 4, 3, 1, mc); px(ctx, mx, y - 3, 1, 1, mc);
        if (left < 0.2) px(ctx, mx - 2, y - 5, 5, 1, mc);
      }
    },

    runCue(ctx, p, hy, t) {
      const { px, OUT } = SP();
      const s = p.ai.runTo.x >= p.x ? 1 : -1, y = Math.round(hy - 10 + Math.sin(t * 12));
      const col = Math.floor(t * 8) % 2 ? '#ffffff' : '#ffe14f';
      const pts = [[0, 0], [1, 1], [2, 2], [1, 3], [0, 4]];
      for (const k of [0, 4]) {
        const bx = Math.round(p.x) + s * (k - 4);
        for (const [dx, dy] of pts) px(ctx, bx + s * dx, y + dy + 1, 1, 1, OUT);
        for (const [dx, dy] of pts) px(ctx, bx + s * dx, y + dy, 1, 1, col);
      }
    },

    passBar(ctx, p, hy) {
      const { px, OUT } = SP();
      const w = 18, x = Math.round(p.x - w / 2), y = hy - 22;   // trên mũi tên điều khiển, không bị che
      const col = PASS_COLORS[p.passMode];
      const base = p.passBase || 0;
      px(ctx, x - 1, y - 1, w + 2, 5, OUT);
      // phần lực mặc định (tự tính theo khoảng cách) — mờ; phần giữ thêm vượt mức đó — đậm
      ctx.globalAlpha = 0.45;
      px(ctx, x, y, Math.round(w * base), 3, col);
      ctx.globalAlpha = 1;
      if (p.passCharge > base) px(ctx, x, y, Math.round(w * p.passCharge), 3, col);
      px(ctx, x + Math.round(w * base), y - 1, 1, 5, '#ffffff');
    },

    // vòng điểm rơi: vòng sáng (dễ thấy trên sân tối) + tâm màu áo đội vừa đá (bóng lỏng: trắng);
    // to khi bóng còn cao, nhỏ dần khi rơi xuống
    landingMarker(ctx, g) {
      const b = g.ball, B = SFC_CONFIG.game.ball, { ringPx, px, OUT } = SP();
      if (!B.landingMarker || g.preview || b.owner || b.z <= B.pickupHeight) return;
      const lp = SFC.Actions.landingPoint(g);
      if (!lp) return;
      const col = b.lastKickTeam >= 0 ? g.teams[b.lastKickTeam].cfg.kit.shirt : '#ffffff';
      const x = Math.round(lp.x), y = Math.round(lp.y);
      const r = Math.round(4 + Math.min(7, b.z / 6));
      ctx.globalAlpha = 0.6;
      ringPx(ctx, x, y + 1, r, OUT);
      ctx.globalAlpha = 0.7 + 0.25 * Math.sin(g.time * 12);
      ringPx(ctx, x, y, r, '#fff6d8');
      ctx.globalAlpha = 1;
      px(ctx, x - 2, y - 1, 5, 3, OUT);
      px(ctx, x - 1, y, 3, 1, col); px(ctx, x, y - 1, 1, 3, col);
    },

    ballTrail(ctx, b) {
      if (b.owner || b.speed < 200 || b.skin === 'ghost') return;   // Vanishing Ball: tàng hình, không để lại vệt
      const { px } = SP();
      const col = b.fx.fire ? '255,140,40' : b.fx.thunder ? '120,230,255' : '255,255,255';
      b.trail.forEach((tp, i) => {
        ctx.fillStyle = `rgba(${col},${0.35 - i * 0.045})`;
        px(ctx, tp.x - 1, tp.y - tp.z - 4, 3, 3, ctx.fillStyle);
      });
      // cú sút rất mạnh (fx.speedLines): 2 vệt tốc độ mảnh kéo dài sau bóng, lệch sang hai bên đường bóng
      const sl = SFC_CONFIG.game.fx.speedLines, sp = b.speed;
      if (!sl || sp < sl) return;
      const k = Math.min(1, (sp - sl) / 120), ux = b.vx / sp, uy = b.vy / sp;
      const len = 14 + Math.round(k * 12), by = b.y - b.z - 3;
      ctx.fillStyle = `rgba(${col},${0.35 + k * 0.3})`;
      for (const o of [-3, 3]) {
        const ox = -uy * o, oy = ux * o;
        for (let i = 4; i < len; i += 2) ctx.fillRect(Math.round(b.x + ox - ux * i), Math.round(by + oy - uy * i), 1, 1);
      }
    },

    goal(ctx, g, side) {
      const { px } = SP();
      const f = g.field, H = f.goalHeight;
      const lx = side < 0 ? f.x : f.x + f.w;
      const bx = lx + side * f.goalDepth;
      const post = '#f2f2f2', shade = '#9aa0ad';
      // mái lưới
      ctx.fillStyle = 'rgba(220,225,235,0.28)';
      const x0 = Math.min(lx, bx), w = f.goalDepth;
      for (let yy = f.gTop - H; yy <= f.gBot - H; yy += 3) ctx.fillRect(x0, yy, w, 1);
      for (let xx = x0; xx <= x0 + w; xx += 3) ctx.fillRect(xx, f.gTop - H, 1, f.goalWidth);
      // lưới hông
      for (const gy of [f.gTop, f.gBot]) {
        for (let k = 0; k <= H; k += 3) ctx.fillRect(x0, gy - k, w, 1);
      }
      // khung sau
      px(ctx, bx - 1, f.gTop - H, 2, f.goalWidth + 1, shade);
      // cột dọc + xà ngang
      px(ctx, lx - 1, f.gTop - H, 3, H + 1, post);
      px(ctx, lx - 1, f.gBot - H, 3, H + 1, post);
      px(ctx, lx - 1, f.gTop - H, 3, f.goalWidth + 1, post);
      px(ctx, lx + (side < 0 ? 1 : -1), f.gTop - H, 1, f.goalWidth + H + 1, shade);
      px(ctx, x0, f.gTop - H - 1, w + 1, 1, shade);
    },
  };

  SFC.Renderer = R;
})();
