/* Human controller — dịch phím (FC Online style) thành hành động cho cầu thủ đang điều khiển */
window.SFC = window.SFC || {};

SFC.Human = {
  update(dt, g, input) {
    const p = g.controlled;
    if (!p) return;
    const Act = SFC.Actions;
    const K = SFC_CONFIG.game.kick;

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
    const cp = g.controlled; // có thể đã đổi
    if (cp !== p) return;

    if (has) {
      if (!wasSprint && p.intent.sprint) g.cores.dispatch(p.team, 'onSprintStart', p);

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

      if (!p.charging && p.state === 'normal') {
        if (input.wasPressed('pass')) Act.pass(g, p, 'ground', mx, my);
        else if (input.wasPressed('through')) Act.pass(g, p, 'through', mx, my);
        else if (input.wasPressed('lob')) Act.pass(g, p, 'lob', mx, my);
      }
      if (input.wasPressed('skill')) Act.skill(g, p, mx, my);
      return;
    }

    p.charging = false;
    if (teamHas) {
      // đòi bóng từ đồng đội AI
      const carrier = b.owner;
      if (input.wasPressed('pass')) carrier.ai.requestedPass = { target: p, mode: 'ground' };
      else if (input.wasPressed('through')) carrier.ai.requestedPass = { target: p, mode: 'through' };
      else if (input.wasPressed('lob')) carrier.ai.requestedPass = { target: p, mode: 'lob' };
    } else {
      if (input.wasPressed('pass')) Act.tackle(g, p);
      else if (input.wasPressed('shoot')) Act.slide(g, p);
      else if (input.wasPressed('lob')) Act.bodyCheck(g, p);
    }
    if (input.wasPressed('skill')) Act.skill(g, p, mx, my);
  },
};
