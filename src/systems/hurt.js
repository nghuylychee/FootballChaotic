/* Hurt — chấn thương GOAT PATH thấy được trong trận (user 2026-10-26). Chấn thương = BADGE injury trong run (config/run.config.js):
 * trừ chỉ số (Run.statsOf) + p.inj = [id] gắn lúc dựng trận (match.js). Ở đây là KHOẢNH KHẮC chấn thương ra tay, số liệu run.hurt:
 *   stumble (cổ chân / đùi): đang chạy nước rút thì thỉnh thoảng khựng lại, bắt đi bộ một lúc — chữ OUCH!
 *   weak (cổ tay): cú đấm thỉnh thoảng xịt — chỉ đẩy nhẹ, không choáng, không cướp được bóng — chữ POOF
 *   shank (ngón chân): cú sút thỉnh thoảng trượt chân, lệch hướng — chữ SHANK!
 * Băng quấn đúng chỗ (badges[].part) vẽ ở render/sprites.js, dấu thập đỏ trên đầu ở render/rundraw.js.
 * Móc: player.js moveNormal (move) · actions.js lightHit (weak) · actions.js shoot (shank).
 */
window.SFC = window.SFC || {};

(function () {
  const H = () => SFC_CONFIG.run.hurt;
  const B = () => SFC_CONFIG.run.badges;

  const Hurt = {
    // p có chấn thương kiểu kind không
    has(p, kind) {
      if (!p.inj) return false;
      for (const id of p.inj) if (B()[id] && B()[id].hurt === kind) return true;
      return false;
    },
    say(p, word) { p.game.effects.pop(p.x, p.y - 30, word, 'status', H().color); },

    // mỗi bước di chuyển: chạy nước rút đủ every giây thì tung xúc xắc khựng lại
    move(p, dt) {
      if (!p.sprinting || !this.has(p, 'stumble')) { p.hurtT = 0; return; }
      const S = H().stumble;
      p.hurtT = (p.hurtT || 0) + dt;
      if (p.hurtT < S.every) return;
      p.hurtT = 0;
      if (Math.random() >= S.chance) return;
      p.walkT = Math.max(p.walkT || 0, S.walk);
      p.vx *= 0.4; p.vy *= 0.4;
      p.game.effects.burst(p.x, p.y, 6, '#c7ccd6', 6, 50, 0.35);
      this.say(p, 'OUCH!');
    },
    // cú đấm này có xịt không (gọi 1 lần mỗi cú đấm)
    weak(g, p) {
      if (!this.has(p, 'weak') || Math.random() >= H().weak.chance) return false;
      this.say(p, 'POOF');
      return true;
    },
    // độ lệch thêm (radian) của cú sút này: 0 hoặc ±angle
    shank(g, p) {
      if (!this.has(p, 'shank') || Math.random() >= H().shank.chance) return 0;
      this.say(p, 'SHANK!');
      return (Math.random() < 0.5 ? -1 : 1) * (H().shank.angle * Math.PI) / 180;
    },
  };

  SFC.Hurt = Hurt;
})();
