/* PlayerSprite · pose.js — Tư thế ra đòn theo thời gian: attackPose(p) đọc atkType / atkT của người chơi.
 * Nạp theo thứ tự trong scripts/manifest.js (classic script, không module): mỗi file gắn hàm vào SFC.PlayerSprite.
 */
window.SFC = window.SFC || {};

(function () {
  const Sprite = (SFC.PlayerSprite = SFC.PlayerSprite || {});
  const { clamp01, easeIO, easeOut, lerp } = Sprite;
  // móc xe đạp: chạm bóng lúc kick s (cores-ult2: bật lên ở lob - 0.4, đá ở lob) · vung chân wind s trước đó · khoá chạm bóng hit s · theo đà go s · về out s
  const BIKE = { kick: 0.4, wind: 0.3, hit: 0.05, go: 0.15, out: 0.3 };
  // nhịp chung của chuyền / sút mạnh (pass.js, power.js): lấy đà w · giữ hold · vung s · giữ hết tầm f · về o (giây).
  // cw khuỵu, lb ngả sau lúc lấy đà, lf lao tới, hop bật (px) · calm = không tia sáng chạm bóng · hold = tiến độ giữ tư thế lấy đà
  function kickTimeline(kt, t, d) {
    const { w, hold = 0, s, f, o, cw = 0, lb = 0, lf = 0, hop = 0 } = d, base = { leg: 0, kt };
    if (t < w) { const u = easeOut(clamp01(t / w)); return Object.assign(base, { kp: 'in', u, kc: cw * u, kbx: -lb * u, khop: 0 }); }
    if (t < w + hold) return Object.assign(base, { kp: 'in', u: 1, kc: cw, kbx: -lb, khop: 0, hold: t - w });
    const ts = t - w - hold;
    if (ts < s + f) {
      const u = easeOut(clamp01(ts / s));
      return Object.assign(base, { kp: 'go', u, kc: cw * (1 - clamp01(ts / (s * 0.6))), kbx: lerp(-lb, lf, u), khop: hop * u, impact: !d.calm && ts >= s * 0.35 && ts < s + 0.06 });
    }
    const to = ts - s - f;
    if (to >= o) return {};
    const u = easeIO(clamp01(to / o)), fall = clamp01(to / (o * 0.6));
    return Object.assign(base, { kp: 'out', u, kc: hop ? Math.max(0, 1 - Math.abs(to / o - 0.7) / 0.3) : 0, kbx: lf * (1 - u), khop: hop * (1 - fall * fall) });
  }
  /* ---------- tư thế ra đòn theo thời gian (như sprite 1x cũ / v2) ---------- */
  function attackPose(p) {
    const C = SFC_CONFIG.game.combat, t = p.atkT || 0;
    if (p.atkType === 'light') {
      const L = C.light, S = L.startup; let fist;
      if (t < S * 0.55) fist = -3 * (t / (S * 0.55));
      else if (t < S) fist = -3 + 15 * easeOut((t - S * 0.55) / (S * 0.45));
      else if (t < S + 0.08) fist = 12;
      else fist = 12 * (1 - clamp01((t - S - 0.08) / Math.max(0.01, L.recover - 0.08)));
      // e: pha đấm của sprite v2 (-1 thu hết · 0 cạnh vai · 1 duỗi hết), suy ra từ fist (-3..12)
      return { fist, e: fist >= 0 ? fist / 12 : fist / 3, streak: t > S * 0.55 && t < S + 0.05, impact: t >= S && t < S + 0.07 };
    }
    if (p.atkType === 'hard') {
      // leg = cờ "đang đá" (draw.js: atk.leg != null). kp / u = pha + tiến độ (xem KICK), kc = khuỵu, kbx = thân lao tới, khop = bật nhảy (px, draw.js làm tròn: nửa px lên 1 px)
      // gồng: nửa đầu khuỵu xuống + thu chân, nửa sau giữ tư thế lấy đà · vung: nửa đầu kickTime tới hết tầm, nửa sau giữ (vẫn trong vùng đá có hiệu lực)
      // về: hạ chân, rơi xuống, tiếp đất khuỵu 1 px rồi đứng thẳng
      const H = C.hard, W = H.windup;
      if (t < W) { const u = easeOut(clamp01(t / (W * 0.5))); return { leg: 0, kp: 'in', u, kc: u, kbx: -u / 2, khop: 0 }; }
      const k = clamp01((t - W) / H.kickTime);
      if (k < 1) {
        const u = easeOut(clamp01(k / 0.5));
        return { leg: 0, kp: 'go', u, kc: 1 - clamp01(k / 0.3), kbx: lerp(-0.5, 1, u), khop: 2 * u, impact: k >= 0.5 && k < 0.75 };
      }
      const back = clamp01((t - W - H.kickTime) / 0.15), fall = clamp01(back / 0.5);
      if (back >= 1) return {};
      return { leg: 0, kp: 'out', u: easeIO(clamp01(back / 0.55)), kc: Math.max(0, 1 - Math.abs(back - 0.7) / 0.3), kbx: 1 - easeIO(clamp01(back / 0.55)), khop: 2 * (1 - fall * fall) };
    }
    if (p.atkType === 'shoot' || p.atkType === 'volley') {
      // sút / vô-lê (shoot.js): 10% đầu chạm bóng (khoá, tia sáng) · tới 40% vung theo đà · giữ tới 70% · 30% cuối về đứng.
      // kc khuỵu · kbx thân (sút chúi tới, vô-lê ngả sau) · khop nhấc người lúc theo đà (px)
      const v = p.atkType === 'volley', G = SFC_CONFIG.game, D = v ? G.firstTime.volley.pose : G.kick.poseTime, k = t / D, hop = v ? 1.5 : 1;
      const base = { leg: 0, kt: p.atkType };
      if (k < 0.1) return Object.assign(base, { kp: 'in', u: 1, kc: v ? 0 : 0.5, kbx: v ? -0.5 : 0.5, khop: 0, impact: true });
      if (k < 0.7) { const u = easeOut(clamp01((k - 0.1) / 0.3)); return Object.assign(base, { kp: 'go', u, kc: v ? 0 : (1 - u) / 2, kbx: v ? -0.5 - u / 2 : 0.5 + u / 2, khop: hop * u }); }
      const u = easeIO(clamp01((k - 0.7) / 0.3));
      return Object.assign(base, { kp: 'out', u, kc: 0, kbx: (v ? -1 : 1) * (1 - u), khop: hop * (1 - u) });
    }
    // chuyền (pass.js): bóng rời chân lúc thả phím -> vẽ từ đầu cú vung · đứng yên giữ phím nạp lực chuyền: tư thế lấy đà (đang chạy: vẫn chạy, chuyền không làm chậm người)
    if (p.atkType === 'pass' || p.atkType === 'lob') { const T = Sprite.PASS_T[p.atkType]; return kickTimeline(p.atkType, t + T.w, T); }
    if (!p.atkType && p.passMode && p.passCharge > 0 && Math.hypot(p.vx || 0, p.vy || 0) <= 12) {
      const kt = p.passMode === 'lob' ? 'lob' : 'pass', T = Sprite.PASS_T[kt];
      return kickTimeline(kt, Math.min(p.passCharge * SFC_CONFIG.game.pass.chargeTime, T.w * 0.999), T);
    }
    // sút mạnh (power.js, kick.powerPose): lấy đà 'pw' tới lúc sút, chọn hình theo vận tốc mỗi khung (game không khoá di chuyển).
    // Đang chạy: mới vào đà = chạm đẩy bóng (bảng push), sau đó bước nặng (gait heavy, gt = giây bước; sprint.js vẽ khi nhìn ngang / chéo).
    // Đứng: thu chân trong kick.powerWind rồi giữ, run dần (jx = lệch ngang theo nửa px, player.js làm tròn: nửa px lên 1 px; đổi chiều mỗi 1/30 s).
    // Vung (power): Actions.shoot đặt atkT giữa cú vung lúc bóng rời chân
    if (p.atkType === 'pw') {
      const T = Sprite.POWER_T, U = Sprite.PASS_T.push, end = U.w + U.s + U.f + U.o;
      if (Math.hypot(p.vx || 0, p.vy || 0) > 12) return t < end ? kickTimeline('push', t, U) : { gait: 'heavy', gt: t - end };
      const a = kickTimeline('power', t, Object.assign({}, T, { w: SFC_CONFIG.game.kick.powerWind, hold: 99 }));
      if (a.hold != null) a.jx = (Math.floor(t * 30) % 2 ? 1 : -1) * Math.round(clamp01(a.hold / T.shakeT) * T.shake * 2) / 2;
      return a;
    }
    if (p.atkType === 'power') return kickTimeline('power', t, Object.assign({}, Sprite.POWER_T, { w: 0, hold: 0 }));
    if (p.atkType === 'header') {
      // đánh đầu (header.js): hk = tiến độ cú nhảy · khop = độ cao (px): đứng tới 12% (khuỵu lấy đà), bay 12% -> 88% (đỉnh 50%, cao H.hop px), rồi tiếp đất
      const H = SFC_CONFIG.game.firstTime.header, k = clamp01(t / H.pose), u = clamp01((k - 0.12) / 0.76);
      return { header: true, hk: k, khop: H.hop * 4 * u * (1 - u) };
    }
    // móc xe đạp (Comet One-Two, cores-ult2): bật lên lúc atkT 0, chạm bóng lúc BIKE.kick s (Renderer.airborne lộn ngược đúng lúc đó: xoay π).
    // Tư thế vô-lê (bảng 'bicycle', chân trụ co suốt, tay giơ lên): đứng tới kick - wind, vung chân lên tới chạm bóng (khoá, tia sáng) · theo đà · về. khop = 0 (Renderer.airborne nâng người)
    if (p.atkType === 'bicycle') {
      const K = BIKE.kick, base = { leg: 0, kt: 'bicycle', kc: 0, khop: 0 };
      if (t < K - BIKE.wind) return Object.assign(base, { kp: 'in', u: 0, kbx: 0 });
      if (t < K) { const u = easeIO((t - K + BIKE.wind) / BIKE.wind); return Object.assign(base, { kp: 'in', u, kbx: -u / 2 }); }
      if (t < K + BIKE.hit) return Object.assign(base, { kp: 'in', u: 1, kbx: -0.5, impact: true });
      if (t < K + BIKE.hit + BIKE.go) { const u = easeOut((t - K - BIKE.hit) / BIKE.go); return Object.assign(base, { kp: 'go', u, kbx: -0.5 - u / 2 }); }
      const u = clamp01((t - K - BIKE.hit - BIKE.go) / BIKE.out);
      return u >= 1 ? {} : Object.assign(base, { kp: 'out', u: easeIO(u), kbx: -(1 - easeIO(u)) });
    }
    // thủ môn đổ người (keeper.js): dk = tiến độ bay · dh = độ cao vòng cung (bay ngắn thì thấp) · ds cất người (0..1)
    if (p.atkType === 'diveU' || p.atkType === 'diveD') {
      // bay p.diveT giây, đứng dậy tới p.poseEnd (Player đặt cả hai; máy khách online không có -> coi như bay hết gkDiveTime)
      const PL = SFC_CONFIG.game.player, D = Sprite.DIVE, flying = p.state === 'dash', fly = p.diveT || PL.gkDiveTime;
      if (flying) return { dive: true, flying, dk: clamp01(t / fly), dh: fly / PL.gkDiveTime, ds: clamp01(t / D.takeoff) };
      // chạm đất rồi: tư thế đứng dậy thật trên lưới px (gkball.js, stage). nằm: tay vẫn vươn qua đầu (dk 1), chân khép · khuỵu: chân dạng khuỵu,
      // tay đứng · bò / nhổm / quỳ: chân quỳ + tay riêng (gkGeom). Chân / khuỵu theo stage (keeper.js diveLegPose / diveCrouch)
      const end = p.poseEnd != null ? p.poseEnd : PL.gkDiveTime + PL.gkDivePose, stage = Sprite.getUpStage(end - t);
      return { dive: true, flying: false, stage, dk: stage === 'land' || stage === 'lie' ? 1 : 0, dh: 1, ds: 1 };
    }
    // thủ môn ôm bóng / đỡ bóng tại chỗ (gkball.js): tay (+ bóng) vẽ riêng theo atkT (gkGeom); ôm bóng thì chân như thường (đứng / chạy)
    if (p.atkType === 'gkHold') return { gkHold: true };
    if (p.atkType === 'gkBlock') return { gkBlock: true };
    // thủ môn tung bóng lên đá: nhịp player.gkRelease, rt = giây từ lúc bắt đầu (góc tay theo thời gian, gkball.js)
    if (p.atkType === 'gkPunt' || p.atkType === 'gkVolley') {
      const a = kickTimeline(p.atkType, t, Sprite.gkTiming(p.atkType));
      if (a.leg != null) a.rt = t;
      return a;
    }
    return {};
  }

  Object.assign(Sprite, { kickTimeline, attackPose });
})();
