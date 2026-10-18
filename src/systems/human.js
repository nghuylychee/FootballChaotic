/* Human controller — dịch phím (FC Online style) thành hành động cho cầu thủ đang điều khiển */
window.SFC = window.SFC || {};

(function () {
  const U = SFC.U;
  const PASS_KEYS = [['pass', 'ground'], ['through', 'through'], ['lob', 'lob']];
  // đòi bóng khi đồng đội cầm bóng: A là Hard attack nên không đòi bóng bổng
  const CALL_KEYS = [['pass', 'ground'], ['through', 'through']];
  // phím có đệm (input.buffer): D = đấm, A = Hard attack (khi không cầm bóng), Z = lướt
  const BUF_KEYS = ['shoot', 'lob', 'skill'];

  SFC.Human = {
    // seat: slot người chơi do bộ phím này điều khiển (online: mỗi slot một input; co-op 2 slot cùng đội)
    update(dt, g, input, seat = g.me) {
      const p = g.seatPlayer(seat);
      if (!p) return;
      const team = p.team;
      const Act = SFC.Actions;
      // ĐỆM PHÍM: bấm hơi sớm (đang khựng sau đòn / còn vài frame hồi chiêu) thì phím còn hiệu lực input.buffer giây,
      // ra đòn được là dùng luôn. Lưu theo slot (online: mỗi slot 1 bộ đệm, chạy ở máy mô phỏng)
      const BW = (SFC_CONFIG.game.input || {}).buffer || 0;
      const bufs = g.inputBuf || (g.inputBuf = {});
      const buf = bufs[seat] || (bufs[seat] = {});
      for (const k of BUF_KEYS) buf[k] = input.wasPressed(k) ? BW : Math.max(0, (buf[k] || 0) - dt);
      const pressed = (k) => buf[k] > 0 || input.wasPressed(k);
      // ra đòn thành công -> xoá phím đã đệm (không ra đòn 2 lần từ 1 lần bấm)
      const use = (k, ok) => { if (ok) buf[k] = 0; return ok; };
      const K = SFC_CONFIG.game.kick;
      const P = SFC_CONFIG.game.pass;

      // cần analog (máy này): di chuyển 360°, đẩy nhẹ = đi chậm; không có -> 8 hướng từ phím / D-pad
      const st = input.stick && input.stick();
      let mx, my;
      if (st) { mx = st.x; my = st.y; }
      else {
        mx = (input.isDown('right') ? 1 : 0) - (input.isDown('left') ? 1 : 0);
        my = (input.isDown('down') ? 1 : 0) - (input.isDown('up') ? 1 : 0);
        if (mx && my) { mx *= Math.SQRT1_2; my *= Math.SQRT1_2; }
      }
      p.intent.mx = mx;
      p.intent.my = my;
      p.intent.sprint = input.isDown('sprint');
      // bấm sút ở bước này (Tuyệt kỹ tự điều khiển người chơi đọc được, vd. Bullet Time: bấm sút để kết thúc)
      p.intent.shootTap = input.wasPressed('shoot');
      // hoảng sợ (Panic Ball): hướng nhắm cũng đảo (di chuyển đã đảo trong Player.moveNormal)
      if (p.panicT > 0) { mx = -mx; my = -my; }
      // hướng nhắm (chuyền / sút / lướt) luôn là vector đơn vị như phím mũi tên
      if (st) { const l = Math.hypot(mx, my); mx /= l; my /= l; }

      const b = g.ball;
      const has = b.owner === p;
      const teamHas = !!b.owner && b.owner.team === p.team;
      // đang chờ đá 1 chạm (firstTime): thả D = chốt lực; hướng mũi tên lúc bóng chạm người = hướng sút
      if (p.ot) {
        if (!input.isDown('shoot')) p.ot.held = false;
        p.ot.aim = { x: mx, y: my };
      }
      // Đọc Cú Sút: đã thả W mà hết cửa sổ vẫn chưa có cú sút -> TOO EARLY
      const RD = SFC_CONFIG.game.read, readWin = RD.grades[RD.grades.length - 1].window;
      for (const q of g.teams[team].players) {
        if (q.readAt >= 0 && g.time - q.readAt > readWin) {
          const off = q.readAt - g.time, o = b.owner && b.owner.team !== q.team ? b.owner : null;
          q.readAt = -1;
          Act.read(g, q, off, 0, false, o);
        }
      }
      // W đang giữ ở bước trước? (chỉ nhánh phòng ngự bên dưới giữ lại trạng thái thủ thế)
      const wasBracing = p.bracing;
      p.bracing = false;

      if (input.wasPressed('switch') && !has) g.switchPlayer(team);
      if (g.seatPlayer(seat) !== p) return;
      // TUYỆT KỸ: phím X khi thanh năng lượng đầy
      if (input.wasPressed('ultimate') && g.cores.activateUltimate(team, p)) return;

      if (has) {
        // cầm bóng: D / A là sút / chuyền bổng (không đệm) -> bỏ phím đấm / Hard đã đệm từ lúc chưa có bóng
        buf.shoot = buf.lob = 0;
        // Chuyền: S (pass.quick) = chuyền ngay khi nhấn, tự chọn người nhận + lực.
        // W/A: nhấn bắt đầu nạp lực, giữ để tăng lực, thả để chuyền
        if (!p.passMode && !p.charging) {
          if (P.quick && P.quick.enabled && input.wasPressed('pass')) { Act.quickPass(g, p, mx, my); return; }
          for (const [key, mode] of PASS_KEYS) {
            if (input.wasPressed(key)) { p.cancelPass(); p.passMode = mode; p.passKey = key; break; }
          }
        }
        if (p.passMode) {
          if (input.isDown(p.passKey)) {
            p.passCharge = Math.min(1, p.passCharge + dt / P.chargeTime);
            // chỉ khóa đồng đội nằm trong vùng hướng mũi tên; không có ai -> null (chuyền theo hướng)
            p.passLock = Act.findPassTarget(g, p, mx, my, Act.targetBias(p.passCharge), p.passMode, p.passLock, P.coneAngle);
            p.passBase = Act.passBasePower(g, p, p.passLock, p.passMode);
            if (seat === g.me) g.passPreview = { from: p, target: p.passLock, mode: p.passMode };
          } else {
            Act.pass(g, p, p.passMode, mx, my, p.passCharge);
          }
          return;
        }

        // vừa đấm cướp được bóng: chưa sút được (combat.light.stealShotLock), D giữ từ cú đấm phải thả ra rồi bấm lại
        if (p.shotHold && !input.isDown('shoot')) p.shotHold = false;
        const shotLocked = p.shotHold || p.shotLockT > 0;
        // kick.clearance bật: D ở phần sân nhà và còn đối phương phía trước = phá bóng ngay khi nhấn (kiểu FC Online)
        // Còn lại (mặc định): giữ để nạp lực, thả để sút. Giữ quá lâu -> tự sút (overcharge)
        if (K.clearance && !p.charging && g.shouldClear(p)) {
          if (input.wasPressed('shoot') && !shotLocked) { Act.clearance(g, p, my); return; }
        } else if (input.isDown('shoot')) {
          if (p.state === 'normal' && !(shotLocked && !p.charging)) {
            if (!p.charging) { p.charging = true; p.charge = 0; p.shotTarget = 0; }
            p.charge += dt / g.chargeTime(p);
            if (p.charge >= K.maxOvercharge) Act.shoot(g, p, p.charge, 0, mx || my ? { x: mx, y: my } : null);
          }
        } else if (p.charging) {
          Act.shoot(g, p, p.charge, 0, mx || my ? { x: mx, y: my } : null);
        }
        if (pressed('skill')) use('skill', Act.skill(g, p, mx, my));
        return;
      }

      if (!p.ot) p.charging = false;
      p.cancelPass();

      // Trạng thái nhận bóng: người nhận chủ động chạy tới điểm đón bóng.
      // Mũi tên đang giữ lúc chuyền bị bỏ qua (receiveLock) cho tới khi thả ra; bấm hướng mới -> người chơi tự điều khiển.
      const receiving = b.passTarget === p && !b.owner;
      if (receiving) {
        if (g.receiveLock[team] && !mx && !my) g.receiveLock[team] = false;
        const manual = !g.receiveLock[team] && (mx || my);
        // đang chờ đá 1 chạm: tự chạy tới điểm đón bóng, mũi tên chỉ còn là hướng sút
        if (p.ot) this.meetBall(g, p);
        // chuyền lỗi (S không nhắm): không tự chạy đón, mũi tên còn giữ từ lúc chuyền cũng không kéo người nhận đi
        else if (b.sloppy) { if (!manual) { p.intent.mx = 0; p.intent.my = 0; } }
        else if (P.receiveAssist && !manual && p.state === 'normal') {
          const userSprint = p.intent.sprint;
          Act.receiveMove(g, p);
          p.intent.sprint = p.intent.sprint || userSprint;
        }
        // D khi bóng đang tới: chờ đá 1 chạm (sút 1 chạm / vô-lê / đánh đầu)
        if (!p.ot && pressed('shoot')) use('shoot', Act.armFirstTime(g, p));
        if (pressed('skill')) use('skill', Act.skill(g, p, mx, my));
        return; // đang đón bóng: không kích hoạt tắc/xoạc
      }
      g.receiveLock[team] = false;

      if (teamHas) {
        // đồng đội cầm bóng: S / W đòi bóng (sệt / chọc khe); D / A vẫn ra đòn (A không còn đòi bóng bổng)
        const carrier = b.owner;
        for (const [key, mode] of CALL_KEYS) {
          if (input.wasPressed(key)) { carrier.ai.requestedPass = { target: p, mode }; break; }
        }
        if (pressed('shoot')) use('shoot', Act.lightAttack(g, p));
        else if (pressed('lob')) use('lob', Act.hardAttack(g, p));
      } else {
        // ĐỌC CÚ SÚT: trong vòng cấm nhà giữ W để thủ thế, thả đúng lúc đối phương sút
        const canBrace = RD.enabled && p.state === 'normal' && p.cd.read <= 0 && p.readAt < 0 && g.inKeeperZone(p);
        if (wasBracing ? input.isDown('through') && p.state === 'normal' : canBrace && input.wasPressed('through')) p.bracing = true;
        else if (wasBracing && p.state === 'normal') Act.readRelease(g, p);
        if (!p.bracing) {
          // bóng lỏng đang tới mình (quả tạt / phá bóng của đối phương, bóng bật ra...): D = chờ đá 1 chạm thay vì đấm
          if (p.ot) { buf.shoot = 0; this.meetBall(g, p); }
          else if (pressed('shoot') && Act.canFirstTime(g, p)) use('shoot', Act.armFirstTime(g, p));
          else if (pressed('shoot')) use('shoot', Act.lightAttack(g, p));
          else if (pressed('lob')) use('lob', Act.hardAttack(g, p));
        } else buf.shoot = buf.lob = 0;   // đang thủ thế: không để cú đấm bấm lúc này bật ra sau khi thả W
      }
      if (pressed('skill')) use('skill', Act.skill(g, p, mx, my));
    },

    // chờ đá 1 chạm: chạy tới điểm đón bóng (giữ nước rút nếu người chơi đang giữ phím chạy nhanh)
    meetBall(g, p) {
      const sprint = p.intent.sprint;
      SFC.Actions.receiveMove(g, p);
      p.intent.sprint = p.intent.sprint || sprint;
    },
  };
})();
