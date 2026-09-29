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
      const fx = g.effects, f = g.field, t = g.time;

      ctx.save();
      if (fx.shakeA > 0) ctx.translate(Math.round((Math.random() - 0.5) * fx.shakeA * 2), Math.round((Math.random() - 0.5) * fx.shakeA * 2));
      SFC.VFX.applyZoom(ctx, g);
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

      // vòng chân người đang điều khiển (online: người chơi tại máy = vàng, người cùng đội (co-op) = xanh, đối thủ = đỏ)
      const cp = g.controlled;
      // ảnh xem trước Core (g.preview): không vẽ vòng / mũi tên điều khiển
      const ctrlColor = (p) => (!g.preview && g.isHuman(p.team) && p.isControlled
        ? (p === cp ? '#ffe14f' : p.team === g.humanTeam ? '#3ff6ff' : '#ff5a6e') : null);
      if (!g.preview) g.seats.forEach((s, i) => {
        const c = g.seatPlayer(i);
        if (c) ringPx(ctx, c.x, c.y + 1, 8, ctrlColor(c));
      });

      // assisted passing chạy ngầm; chỉ hiện gợi ý người nhận khi bật showTargetHint (debug)
      const pv = g.state === 'play' && SFC_CONFIG.game.pass.showTargetHint ? g.passPreview : null;
      const pvCol = pv ? PASS_COLORS[pv.mode] : null;
      if (pv && pv.target) ringPx(ctx, pv.target.x, pv.target.y + 1, 9 + Math.round(Math.sin(t * 10)), pvCol);

      // điểm rơi bóng bổng (nằm trên mặt sân, dưới cầu thủ)
      this.landingMarker(ctx, g);

      /* --- entity y-sort --- */
      const list = [];
      for (const p of g.players) list.push({ y: p.y, k: 'p', o: p });
      list.push({ y: g.ball.y + 0.5, k: 'b', o: g.ball });
      for (const d of fx.decoys) list.push({ y: d.y, k: 'd', o: d });
      for (const a of fx.afterimages) list.push({ y: a.y - 0.1, k: 'a', o: a });
      for (const c of SFC.VFX.clones(g)) list.push({ y: c.y, k: 'cl', o: c });
      list.sort((a, b) => a.y - b.y);

      for (const e of list) {
        if (e.k === 'p') {
          const p = e.o;
          // khổng lồ (VFX Kit GI): phóng to quanh bàn chân
          const s = p.sizeMul || 1;
          SFC.VFX.under(ctx, g, p);
          if (s !== 1) { ctx.save(); ctx.translate(p.x, p.y); ctx.scale(s, s); ctx.translate(-p.x, -p.y); }
          const dive = p.atkType === 'diveU' || p.atkType === 'diveD';
          let hy = p.airZ > 0 ? this.airborne(ctx, p, g) : dive ? this.diving(ctx, p, g) : drawPlayer(ctx, p, g);
          if (s !== 1) { ctx.restore(); hy = p.y + (hy - p.y) * s; }
          SFC.VFX.form(ctx, g, p);
          SFC.VFX.arm(ctx, g, p);
          SFC.VFX.look(ctx, g, p, hy);
          if (p.charging) this.chargeBar(ctx, p, hy, g);
          if (p.passMode) this.passBar(ctx, p, hy);
          if (pv && pv.target === p) {
            const ay = hy - 13 + Math.round(Math.sin(t * 10));
            px(ctx, p.x - 3, ay, 7, 1, pvCol); px(ctx, p.x - 2, ay + 1, 5, 1, pvCol); px(ctx, p.x - 1, ay + 2, 3, 1, pvCol);
          }
          const cc = ctrlColor(p);
          if (cc) {
            const ay = hy - 13 + Math.round(Math.sin(t * 8));
            px(ctx, p.x - 3, ay, 7, 1, cc); px(ctx, p.x - 2, ay + 1, 5, 1, cc); px(ctx, p.x - 1, ay + 2, 3, 1, cc);
          }
          if (p === cp && !g.preview) {
            if (p.stamina < SFC_CONFIG.game.player.staminaMax - 1) {
              px(ctx, p.x - 7, p.y + 4, 14, 2, SP().OUT);
              px(ctx, p.x - 6, p.y + 4, Math.round(12 * p.stamina / SFC_CONFIG.game.player.staminaMax), 1, p.stamina > 25 ? '#6bff7a' : '#ff5a4f');
            }
          }
        } else if (e.k === 'b') {
          this.ballTrail(ctx, g.ball);
          SFC.VFX.ballFx(ctx, g.ball);
          drawBall(ctx, g.ball);
        } else if (e.k === 'd') {
          const d = e.o, a = 0.5 + 0.3 * Math.sin(t * 20);
          // ảo ảnh Chạy Giả: áo tím, nhấp nháy
          if (d.runner) drawPlayer(ctx, Object.assign({ x: d.x - Math.cos(d.runner.facing) * 9, y: d.y - Math.sin(d.runner.facing) * 8, vx: d.vx, vy: d.vy, state: 'normal', flash: 0 }, d.runner), g, a * 0.8, '#9d7bff');
          drawBall(ctx, { x: d.x, y: d.y, z: 0, roll: t * 20, fx: {} }, a);
        } else if (e.k === 'a') {
          const a = e.o;
          // bóng mờ khi lướt: mặc áo đội của chính cầu thủ đó, mờ dần
          drawPlayer(ctx, a, g, (a.t / a.max) * 0.5, null, true);
        } else if (e.k === 'cl') {
          SFC.VFX.drawClone(ctx, g, e.o);
        }
      }

      /* --- khung thành (vẽ sau để lưới phủ lên bóng) --- */
      this.goal(ctx, g, -1);
      this.goal(ctx, g, 1);

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
      ctx.font = '8px ' + C.pixelFont;
      ctx.textAlign = 'center';
      for (const tx of fx.texts) {
        ctx.globalAlpha = Math.min(1, (tx.t / tx.max) * 2);
        ctx.fillStyle = SP().OUT;
        ctx.fillText(tx.str, Math.round(tx.x) + 1, Math.round(tx.y) + 1);
        ctx.fillStyle = tx.color;
        ctx.fillText(tx.str, Math.round(tx.x), Math.round(tx.y));
      }
      ctx.globalAlpha = 1;
      // VFX Kit: lỗ đen, luồng tia, tia sét, chiêu bay, chữ comic
      SFC.VFX.top(ctx, g);
      ctx.restore();

      ctx.drawImage(this.vig, 0, 0);
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
      if (p.state === 'stun') ctx.rotate(dir * p.anim * 13);
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
        if (!d || p.airZ > 0) continue;
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

    chargeBar(ctx, p, hy, g) {
      const { px, OUT } = SP();
      const K = SFC_CONFIG.game.kick;
      const w = 18, x = Math.round(p.x - w / 2), y = hy - 16;
      const base = SFC.Actions.shotBasePower(g, p);
      const c = SFC.Actions.shotPower(g, p, p.charge), over = Math.max(0, p.charge - 1) / (K.maxOvercharge - 1);
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

    passBar(ctx, p, hy) {
      const { px, OUT } = SP();
      const w = 18, x = Math.round(p.x - w / 2), y = hy - 16;
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
      if (b.owner || b.speed < 200) return;
      const { px } = SP();
      const col = b.fx.fire ? '255,140,40' : b.fx.thunder ? '120,230,255' : '255,255,255';
      b.trail.forEach((tp, i) => {
        ctx.fillStyle = `rgba(${col},${0.35 - i * 0.045})`;
        px(ctx, tp.x - 1, tp.y - tp.z - 4, 3, 3, ctx.fillStyle);
      });
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
