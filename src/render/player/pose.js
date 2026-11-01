/* PlayerSprite · pose.js — Tư thế ra đòn theo thời gian: attackPose(p) đọc atkType / atkT của người chơi.
 * Nạp theo thứ tự trong scripts/manifest.js (classic script, không module): mỗi file gắn hàm vào SFC.PlayerSprite.
 */
window.SFC = window.SFC || {};

(function () {
  const Sprite = (SFC.PlayerSprite = SFC.PlayerSprite || {});
  const { clamp01, easeIO, easeOut, lerp } = Sprite;
  // móc xe đạp: chạm bóng lúc kick s (cores-ult2: bật lên ở lob - 0.4, đá ở lob) · vung chân wind s trước đó · khoá chạm bóng hit s · theo đà go s · về out s
  const BIKE = { kick: 0.4, wind: 0.3, hit: 0.05, go: 0.15, out: 0.3 };
  /* ---------- tư thế ra đòn theo thời gian (như sprite 1x cũ / v2) ---------- */
  function attackPose(p) {
    const C = SFC_CONFIG.game.combat, t = p.atkT || 0;
    if (p.atkType === 'light') {
      const L = C.light, S = L.startup; let fist;
      if (t < S * 0.55) fist = -3 * (t / (S * 0.55));
      else if (t < S) fist = -3 + 15 * easeOut((t - S * 0.55) / (S * 0.45));
      else if (t < S + 0.08) fist = 12;
      else fist = 12 * (1 - clamp01((t - S - 0.08) / Math.max(0.01, L.recover - 0.08)));
      // e: pha đấm của sprite 2x (-1 thu hết · 0 cạnh vai · 1 duỗi hết), suy ra từ fist (-3..12)
      return { fist, e: fist >= 0 ? fist / 12 : fist / 3, streak: t > S * 0.55 && t < S + 0.05, impact: t >= S && t < S + 0.07 };
    }
    if (p.atkType === 'hard') {
      // leg = cờ "đang đá" (draw.js: atk.leg != null). kp / u = pha + tiến độ (xem KICK), kc = khuỵu (px mịn), kbx = thân lao tới (px mịn), khop = bật nhảy (px mịn)
      // gồng: nửa đầu khuỵu xuống + thu chân, nửa sau giữ tư thế lấy đà · vung: nửa đầu kickTime tới hết tầm, nửa sau giữ (vẫn trong vùng đá có hiệu lực)
      // về: hạ chân, rơi xuống, tiếp đất khuỵu 1 px rồi đứng thẳng
      const H = C.hard, W = H.windup;
      if (t < W) { const u = easeOut(clamp01(t / (W * 0.5))); return { leg: 0, kp: 'in', u, kc: 2 * u, kbx: -u, khop: 0 }; }
      const k = clamp01((t - W) / H.kickTime);
      if (k < 1) {
        const u = easeOut(clamp01(k / 0.5));
        return { leg: 0, kp: 'go', u, kc: 2 * (1 - clamp01(k / 0.3)), kbx: lerp(-1, 2, u), khop: 4 * u, impact: k >= 0.5 && k < 0.75 };
      }
      const back = clamp01((t - W - H.kickTime) / 0.15), fall = clamp01(back / 0.5);
      if (back >= 1) return {};
      return { leg: 0, kp: 'out', u: easeIO(clamp01(back / 0.55)), kc: 2 * Math.max(0, 1 - Math.abs(back - 0.7) / 0.3), kbx: 2 * (1 - easeIO(clamp01(back / 0.55))), khop: 4 * (1 - fall * fall) };
    }
    if (p.atkType === 'shoot' || p.atkType === 'volley') {
      // sút / vô-lê (shoot.js): 10% đầu chạm bóng (khoá, tia sáng) · tới 40% vung theo đà · giữ tới 70% · 30% cuối về đứng.
      // kc khuỵu · kbx thân (sút chúi tới, vô-lê ngả sau) · khop nhấc người lúc theo đà (px mịn)
      const v = p.atkType === 'volley', G = SFC_CONFIG.game, D = v ? G.firstTime.volley.pose : G.kick.poseTime, k = t / D, hop = v ? 3 : 2;
      const base = { leg: 0, kt: p.atkType };
      if (k < 0.1) return Object.assign(base, { kp: 'in', u: 1, kc: v ? 0 : 1, kbx: v ? -1 : 1, khop: 0, impact: true });
      if (k < 0.7) { const u = easeOut(clamp01((k - 0.1) / 0.3)); return Object.assign(base, { kp: 'go', u, kc: v ? 0 : 1 - u, kbx: v ? -1 - u : 1 + u, khop: hop * u }); }
      const u = easeIO(clamp01((k - 0.7) / 0.3));
      return Object.assign(base, { kp: 'out', u, kc: 0, kbx: (v ? -2 : 2) * (1 - u), khop: hop * (1 - u) });
    }
    if (p.atkType === 'header') {
      // đánh đầu (header.js): hk = tiến độ cú nhảy · khop = độ cao (px mịn): đứng tới 12% (khuỵu lấy đà), bay 12% -> 88% (đỉnh 50%, cao H.hop px), rồi tiếp đất
      const H = SFC_CONFIG.game.firstTime.header, k = clamp01(t / H.pose), u = clamp01((k - 0.12) / 0.76);
      return { header: true, hk: k, khop: 2 * H.hop * 4 * u * (1 - u) };
    }
    // móc xe đạp (Comet One-Two, cores-ult2): bật lên lúc atkT 0, chạm bóng lúc BIKE.kick s (Renderer.airborne lộn ngược đúng lúc đó: xoay π).
    // Tư thế vô-lê (bảng 'bicycle', chân trụ co suốt, tay giơ lên): đứng tới kick - wind, vung chân lên tới chạm bóng (khoá, tia sáng) · theo đà · về. khop = 0 (Renderer.airborne nâng người)
    if (p.atkType === 'bicycle') {
      const K = BIKE.kick, base = { leg: 0, kt: 'bicycle', kc: 0, khop: 0 };
      if (t < K - BIKE.wind) return Object.assign(base, { kp: 'in', u: 0, kbx: 0 });
      if (t < K) { const u = easeIO((t - K + BIKE.wind) / BIKE.wind); return Object.assign(base, { kp: 'in', u, kbx: -u }); }
      if (t < K + BIKE.hit) return Object.assign(base, { kp: 'in', u: 1, kbx: -1, impact: true });
      if (t < K + BIKE.hit + BIKE.go) { const u = easeOut((t - K - BIKE.hit) / BIKE.go); return Object.assign(base, { kp: 'go', u, kbx: -1 - u }); }
      const u = clamp01((t - K - BIKE.hit - BIKE.go) / BIKE.out);
      return u >= 1 ? {} : Object.assign(base, { kp: 'out', u: easeIO(u), kbx: -2 * (1 - easeIO(u)) });
    }
    // thủ môn đổ người (keeper.js): dk = tiến độ bay · ds cất người · dl chạm đất · dg đứng dậy (0..1)
    if (p.atkType === 'diveU' || p.atkType === 'diveD') {
      // nằm tới p.poseEnd (Player đặt lúc chạm đất; máy khách online không có -> coi như bay hết gkDiveTime)
      const PL = SFC_CONFIG.game.player, D = Sprite.DIVE, flying = p.state === 'dash';
      const end = p.poseEnd != null ? p.poseEnd : PL.gkDiveTime + PL.gkDivePose, land = end - PL.gkDivePose;
      return { dive: true, flying, dk: clamp01(t / PL.gkDiveTime), ds: flying ? clamp01(t / D.takeoff) : 1,
        dl: flying ? 0 : clamp01((t - land) / D.land), dg: flying ? 0 : clamp01((t - (end - D.getup)) / D.getup) };
    }
    return {};
  }

  Object.assign(Sprite, { attackPose });
})();
