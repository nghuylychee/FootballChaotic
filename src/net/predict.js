/* Predict — dự đoán cầu thủ của chính mình ở máy khách (client-side prediction), chỉ phần chạy bình thường.
 * Trận "gương" của khách vẽ theo snapshot đã trễ (khứ hồi + đệm nội suy): bấm phím ~0,3 giây sau mới thấy cầu thủ chạy.
 * Ở đây khách tự chạy cầu thủ của mình ngay theo phím, cùng công thức với Player.moveNormal (tăng tốc / giảm tốc tới
 * maxSpeed, xoay theo turnRate, thể lực quyết định có chạy nhanh được không, giữ trong sân), rồi tự sửa theo máy chủ:
 *  - Những gì máy chủ làm chậm cầu thủ mà khách tự biết từ phím của mình thì tính luôn (không chờ snapshot trễ):
 *    thể lực (hết thể lực thì thôi chạy nhanh — tự trừ / hồi như máy chủ), giữ D khi đang có bóng = nạp lực sút (chậm lại),
 *    giữ W trong vòng cấm nhà khi đội không có bóng = thủ thế (chậm lại). Vừa có bóng (chạy chậm hơn chút) thì chỉ biết khi
 *    snapshot tới -> phần lệch được kéo về.
 *  - Mỗi snapshot mới: vị trí (+ thể lực) máy chủ của mình ứng với dự đoán của (ping + net.predict.extra ms) trước: ping chỉ
 *    tính đường đi; phím còn chờ bước mô phỏng kế tiếp, trạng thái chờ snapshot + khung hình vẽ (~25-35 ms). Thiếu phần này thì
 *    lúc chạy luôn thấy mình "đi trước" máy chủ -> bị kéo lùi liên tục, thả phím thì trượt quá chỗ dừng rồi bị kéo về.
 *    So với dự đoán tại thời điểm đó -> lệch quá net.predict.dead px thì kéo dần về (corr / giây).
 *    Lệch quá net.predict.snap px (giao bóng lại, dịch chuyển tức thời) -> nhảy thẳng tới vị trí máy chủ.
 *  - net.predict.lag (ms): vẽ cầu thủ trễ hơn dự đoán bấy nhiêu (phím chậm hơn chút, đổi lại bớt chạy trước thế giới).
 *  - Chỉ dự đoán khi trận đang đá (play) và cầu thủ ở trạng thái normal trên mặt đất. Bị choáng / lướt / sút / bay...:
 *    dừng dự đoán, trượt mượt về vị trí máy chủ (net.predict.blendOut giây).
 *  - Đang dẫn bóng: bóng dời theo cầu thủ đã dự đoán (không bị tụt lại phía sau).
 * Va chạm giữa cầu thủ, buff tốc độ chưa đồng bộ... không dự đoán: phần lệch đó tự được kéo về.
 * Dùng: session.js view() gọi step() sau khi đã áp + nội suy snapshot. Không đụng UI.
 */
window.SFC = window.SFC || {};

(function () {
  const P = () => SFC_CONFIG.net.predict || {};
  const U = () => SFC.U;
  const ACT = { up: 1 << 0, down: 1 << 1, left: 1 << 2, right: 1 << 3, sprint: 1 << 4, through: 1 << 6, shoot: 1 << 8 };   // = thứ tự Sync.ACTIONS

  class Predict {
    constructor() {
      this.on = false;      // đang dự đoán
      this.hist = [];       // [{ t, x, y }] vị trí đã dự đoán theo giờ máy này (ms)
      this.ex = 0; this.ey = 0;   // phần lệch còn phải kéo về
      this.ox = 0; this.oy = 0;   // dừng dự đoán: độ lệch so với máy chủ, giảm dần về 0 (trượt mượt)
      this.lastF = null;
    }

    // mask: phím đang giữ (Sync.encode) · newest: snapshot mới nhất (vị trí máy chủ để sửa) · rtt: ms (null = chưa đo)
    step(g, p, mask, dt, now, rtt, newest) {
      const C = P();
      if (!p || C.enabled === false) { this.on = false; return; }
      // đang chờ đá 1 chạm (thanh lực hiện mà không cầm bóng): máy chủ tự chạy tới điểm đón bóng, phím chỉ là hướng sút -> không dự đoán
      const ok = g.state === 'play' && p.state === 'normal' && !(p.airZ > 0) && dt > 0 && !(p.charging && !p.hasBall);
      if (!ok) { this.stop(g, p, dt); return; }
      if (!this.on) this.start(p);

      this.move(g, p, mask, dt);
      this.hist.push({ t: now, x: this.x, y: this.y, st: this.st });
      while (this.hist.length && now - this.hist[0].t > 1000) this.hist.shift();
      if (newest && newest.f !== this.lastF) { this.lastF = newest.f; this.reconcile(g, p, newest, now, rtt); }

      // kéo dần phần lệch về (dời cả lịch sử để lần so sau không tính lại)
      if (this.ex || this.ey) {
        const k = Math.min(1, dt * (C.corr || 4)), cx = this.ex * k, cy = this.ey * k;
        this.x += cx; this.y += cy; this.ex -= cx; this.ey -= cy;
        for (const h of this.hist) { h.x += cx; h.y += cy; }
        if (Math.abs(this.ex) + Math.abs(this.ey) < 0.05) this.ex = this.ey = 0;
      }
      // lag: vẽ ở vị trí dự đoán của lag ms trước
      const lag = C.lag || 0, at = (lag > 0 && this.at(now - lag)) || this;
      p.stamina = this.st;
      this.draw(g, p, at.x - p.x, at.y - p.y);
    }

    start(p) {
      this.on = true;
      this.x = p.x; this.y = p.y; this.vx = p.vx || 0; this.vy = p.vy || 0; this.facing = p.facing;
      this.sprinting = false;
      this.st = p.stamina;
      this.hist.length = 0;
      this.ex = this.ey = this.ox = this.oy = 0;
    }

    // dừng dự đoán: giữ độ lệch so với vị trí máy chủ rồi giảm dần -> không giật về chỗ cũ
    stop(g, p, dt) {
      if (this.on) { this.on = false; this.ox = this.x - p.x; this.oy = this.y - p.y; this.hist.length = 0; }
      if (!this.ox && !this.oy) return;
      const k = Math.max(0, 1 - dt / (P().blendOut || 0.15));
      this.ox *= k; this.oy *= k;
      if (Math.abs(this.ox) + Math.abs(this.oy) < 0.3) this.ox = this.oy = 0;
      this.draw(g, p, this.ox, this.oy, true);
    }

    // như Player.moveNormal + giữ trong sân, theo phím của máy này (8 hướng như phím gửi đi)
    move(g, p, mask, dt) {
      const C = SFC_CONFIG.game.player, u = U();
      let mx = (mask & ACT.right ? 1 : 0) - (mask & ACT.left ? 1 : 0);
      let my = (mask & ACT.down ? 1 : 0) - (mask & ACT.up ? 1 : 0);
      if (mx && my) { mx *= Math.SQRT1_2; my *= Math.SQRT1_2; }
      const moving = Math.hypot(mx, my) > 0.1;
      // thể lực tự tính như Player.moveNormal (máy chủ thấy hết thể lực sớm hơn snapshot báo về)
      const cores = g.cores;
      this.sprinting = !!(mask & ACT.sprint) && moving && this.st > (this.sprinting ? 0 : C.staminaMinToSprint);
      if (this.sprinting) this.st -= C.staminaDrain * dt;
      else this.st += C.staminaRegen * p.stats.stamina * cores.mod(p.team, 'sprintRegen', p) * dt;
      this.st = u.clamp(this.st, 0, C.staminaMax);
      // chậm lại theo phím của mình (như human.js): giữ D khi có bóng = nạp lực sút · giữ W trong vòng cấm nhà khi đội không có bóng = thủ thế
      const b = g.ball, teamHas = !!b.owner && b.owner.team === p.team;
      const charging = p.charging || (!!(mask & ACT.shoot) && p.hasBall);
      const bracing = p.bracing || (!!(mask & ACT.through) && !teamHas && SFC_CONFIG.game.read.enabled && g.inKeeperZone(p));
      const keep = [p.sprinting, p.charging, p.bracing];
      p.sprinting = this.sprinting; p.charging = charging; p.bracing = bracing;
      const ms = p.maxSpeed();
      [p.sprinting, p.charging, p.bracing] = keep;
      const tx = mx * ms, ty = my * ms, dvx = tx - this.vx, dvy = ty - this.vy, dl = Math.hypot(dvx, dvy);
      const a = (moving ? C.accel : C.decel) * dt;
      if (dl <= a) { this.vx = tx; this.vy = ty; } else { this.vx += (dvx / dl) * a; this.vy += (dvy / dl) * a; }
      if (moving) { const d = u.angleDiff(this.facing, Math.atan2(my, mx)), s = C.turnRate * dt; this.facing += u.clamp(d, -s, s); }
      const f = g.field, r = p.radius;
      this.x = u.clamp(this.x + this.vx * dt, f.x + r, f.x + f.w - r);
      this.y = u.clamp(this.y + this.vy * dt, f.y + r, f.y + f.h - r);
    }

    // vị trí máy chủ trong snapshot mới nhất ~ trạng thái của mình 1 lần khứ hồi trước -> so với lịch sử dự đoán
    reconcile(g, p, newest, now, rtt) {
      const row = newest.s && newest.s.p && newest.s.p[g.players.indexOf(p)];
      if (!row) return;
      const sx = row[0], sy = row[1], C = P();
      const h = this.at(now - (rtt == null ? 100 : rtt) - (C.extra == null ? 30 : C.extra));
      if (!h) return;
      // thể lực: sửa thẳng phần lệch (chỉ quyết định lúc nào hết chạy nhanh, không thấy giật)
      if (typeof row[6] === 'number' && h.st != null) {
        const d = row[6] - h.st;
        if (Math.abs(d) > 2) {
          this.st = SFC.U.clamp(this.st + d, 0, SFC_CONFIG.game.player.staminaMax);
          for (const q of this.hist) if (q.st != null) q.st += d;
        }
      }
      const ex = sx - h.x, ey = sy - h.y, dist = Math.hypot(ex, ey);
      if (dist > (C.snap || 48)) {
        // lệch quá xa: nhảy thẳng tới máy chủ, bỏ lịch sử
        this.x += ex; this.y += ey; this.ex = this.ey = 0;
        this.hist.length = 0;
        return;
      }
      // lệch nhỏ (trễ mạng dao động, làm tròn...): bỏ qua, khỏi rung
      if (dist < (C.dead == null ? 1.5 : C.dead)) { this.ex = this.ey = 0; return; }
      this.ex = ex; this.ey = ey;
    }

    // vị trí đã dự đoán lúc t (nội suy trong lịch sử; ngoài lịch sử -> mốc gần nhất)
    at(t) {
      const H = this.hist;
      if (!H.length) return null;
      if (t <= H[0].t) return H[0];
      for (let i = H.length - 1; i > 0; i--) {
        const a = H[i - 1], b = H[i];
        if (a.t <= t) {
          const k = b.t > a.t ? (t - a.t) / (b.t - a.t) : 0;
          return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, st: a.st + (b.st - a.st) * k };
        }
      }
      return H[H.length - 1];
    }

    // vẽ cầu thủ ở vị trí dự đoán (dx, dy so với vị trí nội suy); bóng đang dẫn dời theo
    draw(g, p, dx, dy, offsetOnly) {
      p.x += dx; p.y += dy;
      if (!offsetOnly) { p.vx = this.vx; p.vy = this.vy; p.facing = this.facing; }
      const b = g.ball;
      if (b.owner === p) { b.x += dx; b.y += dy; }
    }
  }

  SFC.Predict = Predict;
})();
