/* Human controller — dịch phím (FC Online style) thành hành động cho cầu thủ đang điều khiển */
window.SFC = window.SFC || {};

(function () {
  const U = SFC.U;
  const PASS_KEYS = [['pass', 'ground'], ['through', 'through'], ['lob', 'lob']];

  SFC.Human = {
    // team: đội do bộ phím này điều khiển (PvP: mỗi đội một input)
    update(dt, g, input, team = g.humanTeam) {
      const p = g.ctrl[team];
      if (!p) return;
      const Act = SFC.Actions;
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
      // hướng nhắm (chuyền / sút / lướt) luôn là vector đơn vị như phím mũi tên
      if (st) { const l = Math.hypot(mx, my); mx /= l; my /= l; }

      const b = g.ball;
      const has = b.owner === p;
      const teamHas = !!b.owner && b.owner.team === p.team;
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
      if (g.ctrl[team] !== p) return;
      // TUYỆT KỸ: phím X khi thanh năng lượng đầy
      if (input.wasPressed('ultimate') && g.cores.activateUltimate(team, p)) return;

      if (has) {
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
            if (team === g.humanTeam) g.passPreview = { from: p, target: p.passLock, mode: p.passMode };
          } else {
            Act.pass(g, p, p.passMode, mx, my, p.passCharge);
          }
          return;
        }

        // D ở phần sân nhà và còn đối phương phía trước: phá bóng ngay khi nhấn (kiểu FC Online)
        // Còn lại: giữ để nạp lực, thả để sút. Giữ quá lâu -> tự sút (overcharge)
        if (!p.charging && g.shouldClear(p)) {
          if (input.wasPressed('shoot')) { Act.clearance(g, p, my); return; }
        } else if (input.isDown('shoot')) {
          if (p.state === 'normal') {
            if (!p.charging) { p.charging = true; p.charge = 0; p.shotTarget = 0; }
            p.charge += dt / g.chargeTime(p);
            if (p.charge >= K.maxOvercharge) Act.shoot(g, p, p.charge, 0, mx || my ? { x: mx, y: my } : null);
          }
        } else if (p.charging) {
          Act.shoot(g, p, p.charge, 0, mx || my ? { x: mx, y: my } : null);
        }
        if (input.wasPressed('skill')) Act.skill(g, p, mx, my);
        return;
      }

      p.charging = false;
      p.cancelPass();

      // Trạng thái nhận bóng: người nhận chủ động chạy tới điểm đón bóng.
      // Mũi tên đang giữ lúc chuyền bị bỏ qua (receiveLock) cho tới khi thả ra; bấm hướng mới -> người chơi tự điều khiển.
      const receiving = b.passTarget === p && !b.owner;
      if (receiving) {
        if (g.receiveLock[team] && !mx && !my) g.receiveLock[team] = false;
        const manual = !g.receiveLock[team] && (mx || my);
        // chuyền lỗi (S không nhắm): không tự chạy đón, mũi tên còn giữ từ lúc chuyền cũng không kéo người nhận đi
        if (b.sloppy) { if (!manual) { p.intent.mx = 0; p.intent.my = 0; } }
        else if (P.receiveAssist && !manual && p.state === 'normal') {
          const userSprint = p.intent.sprint;
          Act.receiveMove(g, p);
          p.intent.sprint = p.intent.sprint || userSprint;
        }
        if (input.wasPressed('skill')) Act.skill(g, p, mx, my);
        return; // đang đón bóng: không kích hoạt tắc/xoạc
      }
      g.receiveLock[team] = false;

      if (teamHas) {
        // đòi bóng từ đồng đội AI
        const carrier = b.owner;
        for (const [key, mode] of PASS_KEYS) {
          if (input.wasPressed(key)) { carrier.ai.requestedPass = { target: p, mode }; break; }
        }
      } else {
        // ĐỌC CÚ SÚT: trong vòng cấm nhà giữ W để thủ thế, thả đúng lúc đối phương sút
        const canBrace = RD.enabled && p.state === 'normal' && p.cd.read <= 0 && p.readAt < 0 && g.inKeeperZone(p);
        if (wasBracing ? input.isDown('through') && p.state === 'normal' : canBrace && input.wasPressed('through')) p.bracing = true;
        else if (wasBracing && p.state === 'normal') Act.readRelease(g, p);
        if (!p.bracing) {
          if (input.wasPressed('shoot')) Act.lightAttack(g, p);
          else if (input.wasPressed('lob')) Act.hardAttack(g, p);
        }
      }
      if (input.wasPressed('skill')) Act.skill(g, p, mx, my);
    },
  };
})();
