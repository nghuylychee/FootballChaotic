/* Human controller — dịch phím (FC Online style) thành hành động cho cầu thủ đang điều khiển */
window.SFC = window.SFC || {};

(function () {
  const U = SFC.U;
  const PASS_KEYS = [['pass', 'ground'], ['through', 'through'], ['lob', 'lob']];

  SFC.Human = {
    update(dt, g, input) {
      g.passPreview = null;
      const p = g.controlled;
      if (!p) return;
      const Act = SFC.Actions;
      const K = SFC_CONFIG.game.kick;
      const P = SFC_CONFIG.game.pass;

      let mx = (input.isDown('right') ? 1 : 0) - (input.isDown('left') ? 1 : 0);
      let my = (input.isDown('down') ? 1 : 0) - (input.isDown('up') ? 1 : 0);
      if (mx && my) { mx *= Math.SQRT1_2; my *= Math.SQRT1_2; }
      const wasSprint = p.intent.sprint;
      p.intent.mx = mx;
      p.intent.my = my;
      p.intent.sprint = input.isDown('sprint');

      const b = g.ball;
      const has = b.owner === p;
      const teamHas = !!b.owner && b.owner.team === p.team;
      g.pressureCall = !teamHas && input.isDown('through');

      // thủ môn chỉ do người chơi điều khiển khi đang ôm bóng
      if ((input.wasPressed('switch') || p.role === 'GK') && !has) g.switchPlayer();
      if (g.controlled !== p) return;

      if (has) {
        if (!wasSprint && p.intent.sprint) g.cores.dispatch(p.team, 'onSprintStart', p);

        // Chuyền: nhấn S/W/A bắt đầu nạp lực, giữ để tăng lực, thả để chuyền
        if (!p.passMode && !p.charging) {
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
            g.passPreview = { from: p, target: p.passLock, mode: p.passMode };
          } else {
            Act.pass(g, p, p.passMode, mx, my, p.passCharge);
          }
          return;
        }

        // Sút: giữ D để nạp lực, thả để sút. Giữ quá lâu -> tự sút (overcharge)
        if (input.isDown('shoot')) {
          if (p.state === 'normal') {
            if (!p.charging) { p.charging = true; p.charge = 0; }
            p.charge += dt / g.chargeTime(p);
            if (p.charge >= K.maxOvercharge) Act.shoot(g, p, p.charge, my);
          }
        } else if (p.charging) {
          Act.shoot(g, p, p.charge, my);
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
        if (g.receiveLock && !mx && !my) g.receiveLock = false;
        const manual = !g.receiveLock && (mx || my);
        if (P.receiveAssist && !manual && p.state === 'normal') {
          const userSprint = p.intent.sprint;
          Act.receiveMove(g, p);
          p.intent.sprint = p.intent.sprint || userSprint;
        }
        if (input.wasPressed('skill')) Act.skill(g, p, mx, my);
        return; // đang đón bóng: không kích hoạt tắc/xoạc
      }
      g.receiveLock = false;

      if (teamHas) {
        // đòi bóng từ đồng đội AI
        const carrier = b.owner;
        for (const [key, mode] of PASS_KEYS) {
          if (input.wasPressed(key)) { carrier.ai.requestedPass = { target: p, mode }; break; }
        }
      } else {
        if (input.wasPressed('pass')) Act.tackle(g, p);
        else if (input.wasPressed('shoot')) Act.slide(g, p);
        else if (input.wasPressed('lob')) Act.bodyCheck(g, p);
      }
      if (input.wasPressed('skill')) Act.skill(g, p, mx, my);
    },
  };
})();
