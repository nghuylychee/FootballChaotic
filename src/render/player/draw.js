/* PlayerSprite · draw.js — Ghép cầu thủ theo hướng mặt: draw(ctx, X, Y, o) ở px game (đứng, chạy, ra đòn, ăn mừng, trạng thái).
 * Nạp theo thứ tự trong scripts/manifest.js (classic script, không module): mỗi file gắn hàm vào SFC.PlayerSprite.
 */
window.SFC = window.SFC || {};

(function () {
  const Sprite = (SFC.PlayerSprite = SFC.PlayerSprite || {});
  const { ARM_DY, ARM_L, ARM_R, BANDAGE, BLOOD, BOB, BODY, FLASH, INK, RUN_L, RUN_R, at, crossLegs, lerp, snapPx,
    discW, drawKickLeg, face, headOf, kickArm, kickArmsOn, kickRest, kickTable, legPose, offArm, offBehind,
    offOn, palette, punch, punchLean, rectW, rowOf, runLeg, shadow, sitLegs, stamp, headerPose, headerLegs, headerArms, headerImpact, diveArms, diveLegs, diveHeadDy, diveArmK, diveCrouch, diveLegPose, flyArms, flyLegs, flyPose } = Sprite;
  /* ---------- cầu thủ theo hướng mặt: đứng yên (đúng v2), chạy, ra đòn, ăn mừng ---------- */
  // o: { facing, skin, shirt, shirtD, shorts, sock, shoe, sole, hair, band, moving, anim, lean,
  //      atk (attackPose), cp (celPose), stun, windup, flash, glove (màu găng thủ môn), inj (chấn thương), cut (kiểu tóc / mũ, hair.js), face (phụ kiện mặt, face.js), shoes (giày, shoes.js), fx (hiệu ứng trang phục; aura vẽ ở đây, fx.js), hit (giây từ lúc bị đấm, hit.js), slam (0..1 giơ tay lúc nhảy slam), noShadow }
  // góc nhìn theo hướng mặt: back (quay lưng) / bdiag (chéo lên: thấy lưng, người xoay về 1 bên) / diag (chéo xuống) / side (ngang) / front (nhìn xuống) ·
  // sd = hướng ngang (0 = nhìn thẳng) · m = nhìn trái (lật hình). player.js dùng để giữ góc nhìn khỏi nháy khi hướng mặt giật qua lại quanh ngưỡng
  function viewOf(facing) {
    const fx = Math.cos(facing), fy = Math.sin(facing);
    const back = fy < -0.35, diag = !back && fy > 0.38 && fy < 0.92, sd = Math.abs(fx) > 0.5 ? Math.sign(fx) : 0;
    return { fx, fy, back, diag, sd, m: fx < 0, view: back ? (sd ? 'bdiag' : 'back') : sd ? (diag ? 'diag' : 'side') : 'front' };
  }
  // chéo lên (user 2026-11-03): mọi tư thế trừ bị đá bay (user bỏ qua, vẽ hình sau lưng như cũ)
  const bdiagOn = (o) => !o.fly;
  function draw(ctx, X, Y, o) {
    const pal = palette(o);
    const V = viewOf(o.facing), { fx, fy, back, diag, sd, m } = V;
    const bd = V.view === 'bdiag' && bdiagOn(o), view = V.view === 'bdiag' && !bd ? 'back' : V.view;
    // giày (shoes.js): mẫu tô theo chân phải / trái của cầu thủ (chân phải = cột trái màn hình, quay lưng thì cột phải), ghi chỗ đế để vẽ đồ dưới đế
    if (Sprite.shoeBegin) Sprite.shoeBegin(X, o, back ? m : !m);
    const atk = o.atk || null, cp = o.cp || null, hand = o.glove || pal.S;
    // thủ môn cầm bóng / đứng dậy sau khi đổ người (gkball.js): tay + bóng vẽ riêng, chân quỳ, thân hạ / ngả, bóng đổ dài lúc nằm
    const gk = o.gk ? Sprite.gkGeom(o.gk, view, m) : null, gkArms = !!(gk && (gk.arms || gk.angles));
    // bước nặng (lấy đà sút mạnh) khi nhìn xuống / lên: bước chạy thường chậm lại 9 khung / s, hạ người lúc đặt chân (dưới)
    const runT = o.gait === 'heavy' ? (o.gaitT || 0) * 0.75 : o.anim || 0;
    const f = o.moving && !o.fly && !(atk && (atk.header || atk.leg != null)) ? Math.floor(runT * 12) % 4 : -1;
    const B = BODY;
    // ra đòn: góc nhìn của tư thế · thân ngả / lao theo cú đấm, cú đá (px; x theo hình nhìn phải)
    const sideView = view === 'side' || view === 'diag' || bd;
    // bước riêng khi nhìn ngang / chéo (sprint.js): chạy nước rút / bước nặng · gfr = khung đang vẽ · gs = hướng ngang (lật khi nhìn trái)
    const gaitOn = !!o.gait && f >= 0 && !atk && !cp && !o.fly && sideView, G = gaitOn ? Sprite.GAITS[o.gait] : null;
    const gfr = gaitOn ? Sprite.gaitFrame(o.gait, o.gaitT || 0) : null, gs = m ? -1 : 1;
    const pe = atk && atk.e != null ? atk.e : null, kickLeg = atk && atk.leg != null;
    const hp = atk && atk.header ? headerPose(view, atk.hk) : null;   // đánh đầu (header.js)
    // Hard attack đá bằng chân phải của cầu thủ (user 2026-11-01). Hình chân trong KICK: chân đá bên trái màn hình khi nhìn ngang (đúng chân phải),
    // bên phải màn hình khi nhìn xuống / lên -> nhìn xuống (cầu thủ quay mặt vào máy quay, chân phải ở bên trái màn hình) lật riêng chân
    const km = view === 'front' ? !m : m;
    // Hard attack: thân lao tới (chỉ nhìn ngang / chéo) + khuỵu xuống (nguyên ô: mọi độ lệch qua snapPx)
    const [lx, ly] = pe != null ? punchLean(view, pe) : kickLeg ? [sideView ? snapPx(atk.kbx) : 0, snapPx(atk.kc)] : hp ? [snapPx(hp.bx), snapPx(hp.c)] : atk && atk.dive ? [0, diveCrouch(atk)] : o.fly ? [0, flyPose(o.fly).c] : [0, 0];
    const step = pe != null && pe > 0.5 && sideView;   // đấm duỗi quá nửa: chân trước bước tới 1 ô, gót chân sau nhấc lên
    const punchArm = atk && atk.fist != null, off = punchArm && offOn(pe, view);   // đấm: tay kia vẽ riêng (offArm) thay cho tay đứng
    // đấm bằng tay trái của cầu thủ (user 2026-11-01): hình đấm vẽ tay bên phải màn hình = tay trái khi nhìn xuống / ngang,
    // nhưng nhìn lên (thấy lưng) bên phải màn hình là tay phải -> nhìn lên lật riêng 2 tay
    // chéo lên: hình đấm vẽ nắm tay ra trước (bên phải hình) như nhìn ngang, tay kia (tay gần bên hướng mặt) vẽ lật (om)
    const pm = view === 'back' ? !m : m, om = bd ? !m : pm;
    // bật nhảy: khop (px: Hard attack, sút, vô-lê, đánh đầu). Bóng thu nhỏ theo độ cao (đánh đầu: theo bậc 0.1)
    const khop = kickLeg || hp ? snapPx(atk.khop) : 0, Yf = Y - khop;
    if (!o.noShadow && gk && gk.shadow === 'long') Sprite.lieShadow(ctx, X, Y, m ? -1 : 1);   // nằm sau khi đổ người: bóng đổ phủ cả thân
    else if (!o.noShadow) shadow(ctx, X, Y, hp ? Math.max(0.6, Math.round((1 - khop / 30) * 10) / 10) : khop >= 2 ? 0.85 : 1);
    if (o.fx === 'aura') Sprite.drawAura(ctx, X, Y, o.anim || 0);   // Golden Aura (fx.js): quầng vàng dưới chân, trên bóng, dưới chân
    // Hard attack đang gồng: hào quang đỏ nhấp nháy giữa thân, vẽ sau người (không che tư thế lấy đà)
    if (o.windup) {
      ctx.globalCompositeOperation = 'lighter';
      discW(ctx, X + (m ? -lx : lx), Yf + ly, 0, -7, 10, `rgba(255,50,80,${0.4 + 0.25 * Math.sin((o.anim || 0) * 40)})`);
      ctx.globalCompositeOperation = 'source-over';
    }
    // chân: trái cột viền -4, phải cột 1 · mũi giày: nghiêng / ngang = theo hướng mặt, nhìn thẳng xuống và sau lưng = không
    const tl = sd, tr = sd, toePart = (t) => (t > 0 ? B.TR : t < 0 ? B.TL : B.TN);
    const feet = {};   // 2 chân đứng / chạy đang vẽ (quấn băng), theo cột màn hình: L = cột -4, R = cột 1 · [bộ phận, X, Y]
    let plantLater = null;   // chéo lên: chân trụ vẽ sau chân đá (chân đá vung ra xa máy quay, khuất sau chân trụ)
    if (o.fly) {
      flyLegs(ctx, X, Yf, B, pal, o.fly, toePart(sd), m);   // bị đá bay (fly.js): văng chân / nằm dạng / khuỵu dậy
    } else if (cp && cp.legs === 'cross') {
      /* xếp bằng: vẽ sau thân (dưới) */
    } else if ((cp && (cp.legs === 'sit' || cp.legs === 'kneel')) || (gk && gk.legs === 'kneel')) {
      /* ngồi: vẽ sau thân · quỳ (ăn mừng, thủ môn đứng dậy): vẽ theo thân đã hạ (dưới) */
    } else if (cp && cp.legs === 'moon' && sideView) {
      // moonwalk (celebrate.js): chân phẳng trượt từ trước ra sau, chân kia kiễng gót (thấy đế) đi từ sau ra trước; mw 0..2, đổi vai mỗi 1
      const u = cp.mw % 1, flat = Math.round(lerp(1, -4, u)), toe = Math.round(lerp(-4, 1, u));
      stamp(ctx, X, Yf, at(B.KICK_F, toe), pal, m); stamp(ctx, X, Yf, at(toePart(1), flat), pal, m);
    } else if (cp && cp.legs === 'split') {
      stamp(ctx, X, Yf, at(B.TL, -8), pal); stamp(ctx, X, Yf, at(B.TR, 5), pal);
    } else if (gk && gk.legs === 'wide') {
      diveLegs(ctx, X, Yf, B, pal, 'wide', toePart(sd), m);   // thủ môn đỡ bóng tại chỗ: 2 chân dạng rộng (gkball.js)
    } else if (atk && atk.dive && diveLegPose(atk) !== 'stand') {
      diveLegs(ctx, X, Yf, B, pal, diveLegPose(atk), toePart(sd), m);   // thủ môn đổ người (keeper.js): đạp đất / khép / co gối đứng dậy
    } else if (hp && hp.legs !== 'stand') {
      headerLegs(ctx, X, Yf, m, view, hp.legs, sd ? B.TR : B.TN, B, pal);
    } else if (kickLeg) {
      // Hard attack: chân trụ (chân trước khi nhìn ngang / chéo, chân trái khi nhìn xuống / lên) bước rộng 1 ô, đặt trên đất; chân đá vẽ theo thân (drawKickLeg)
      // trên không (đá hết tầm): chân trụ co lại tại chỗ (gót nhấc, thấy đế), không đổi bên: nhìn ngang mà co sang chỗ chân đá vừa rời
      // thì trông như 2 chân đổi nhau (user 2026-11-01: thu chân phải lấy đà thì chân phải phải là chân đá)
      const T = kickTable(atk), air = T.tuck === 'always' || (T.tuck && ((atk.kp === 'go' && atk.u >= 0.5) || (atk.kp === 'out' && atk.u < 0.5)));
      if (kickRest(atk)) { stamp(ctx, X, Yf, at(toePart(tl), -4), pal); stamp(ctx, X, Yf, at(toePart(tr), 1, -1), pal); }
      else {
        const plant = air ? (sideView ? at(B.KICK_F, 2) : at(back ? B.LIFT_B : B.LIFT, -4)) : at(sd ? B.TR : B.TN, sideView ? T.plant : -5);
        if (bd) plantLater = () => stamp(ctx, X, Yf, plant, pal, km); else stamp(ctx, X, Yf, plant, pal, km);
      }
    } else if (gaitOn) {
      Sprite.gaitLegs(ctx, X, Yf, gfr, view, pal, m);
    } else if (f < 0) {
      // đứng: chân phải nhấc 1 px (như v2) · đấm: chân trước bước tới, đặt xuống đất; chân sau = gót nhấc (thấy đế, cách đất 1 px)
      feet.L = [step ? (m ? at(toePart(tl), -5) : at(B.KICK_F, -4)) : at(toePart(tl), -4), X, Yf]; stamp(ctx, X, Yf, feet.L[0], pal);
      feet.R = [step ? (m ? at(B.KICK_F, 1) : at(toePart(tr), 2)) : at(toePart(tr), 1, -1), X, Yf]; stamp(ctx, X, Yf, feet.R[0], pal);
    } else {
      const k = sd ? (diag || bd ? 0.5 : 1) : 0;
      const legs = [[RUN_L[f], tl, -4], [RUN_R[f], tr, 1]];
      // chân nhấc / đá sau vẽ trước, chân chạm đất đè lên
      legs.sort((a, b) => ('KL'.includes(b[0]) ? 1 : 0) - ('KL'.includes(a[0]) ? 1 : 0));
      for (const [ph, toe, L] of legs) {
        const [part, dx0, dy0] = runLeg(B, ph, toe, back, sd, k, bd), pt = at(part, L), dx = snapPx(dx0), dy = snapPx(dy0);
        stamp(ctx, X + dx, Yf + dy, pt, pal);
        feet[L === 1 ? 'R' : 'L'] = [pt, X + dx, Yf + dy];
      }
    }
    const lean = snapPx(gaitOn ? gs * G.lean[view] : (o.lean || 0) + ((gk && gk.lean) || 0) + ((cp && cp.lean) || 0)), drop = (cp && cp.drop) || (gk && gk.drop) || 0;
    const heavyDrop = o.gait === 'heavy' && !gaitOn && f >= 0 && f % 2 === 0 ? 1 : 0;
    const Yb = Yf + snapPx((gaitOn ? gfr[2] : f < 0 ? 0 : BOB[f]) + drop) + heavyDrop + ly, Xb = X + lean + (m ? -lx : lx);
    const kLeg = kickLeg && !kickRest(atk) ? legPose(view, atk.kp, atk.u, kickTable(atk)) : null, kArms = kickLeg && kickArmsOn(atk);
    if (off && offBehind(pe, view)) offArm(ctx, Xb, Yb, om, view, pe, pal, hand);   // tay kia nằm sau thân
    if (kLeg && !kLeg.over) drawKickLeg(ctx, Xb, Yb, km, view, atk, kLeg, pal);   // chân đá sau thân (thu ra sau / đá ra xa máy quay)
    if (plantLater) plantLater();
    const far = Sprite.farArm(view);
    if (kArms && far >= 0) kickArm(ctx, Xb, Yb, m, view, atk, far, pal, hand, true);   // nhìn chéo: tay xa sau thân
    if (punchArm && bd) punch(ctx, Xb, Yb, pm, view, pe, atk, pal, hand);   // chéo lên: tay đấm là tay xa, khuất sau thân (chỉ thấy nắm tay)
    if (hp && !hp.rest) headerArms(ctx, Xb, Yb, m, view, hp, pal, hand, true);
    if (gaitOn) Sprite.gaitArms(ctx, Xb, Yb, gfr, view, pal, hand, m, true);   // tay vung ra sau / tay xa (nhìn chéo): sau thân
    // giơ 2 tay (hit.js): bị đấm (o.hit) · nhảy Ground Slam (o.slam = độ giơ theo độ cao)
    const lift = !o.fly && !punchArm && !kickLeg && !hp && !(atk && atk.dive) && !(cp && cp.arms) ? Math.max(Sprite.hitLift(o.hit), o.slam || 0) : 0, hitOn = lift > 0.04;
    if (hitOn && Sprite.farArm(view) >= 0) Sprite.liftArms(ctx, Xb, Yb, m, view, lift, pal, hand, true);
    // chạy thường nhìn ngang / chéo: tay vung quanh vai như chạy nước rút, nhẹ hơn (run.js ARM_A) · rfr = khung tay cho gaitArms
    const runArms = f >= 0 && sideView && !gaitOn && !o.fly && !(hp && !hp.rest) && !hitOn && !kArms && !punchArm && !gkArms && !(atk && atk.dive) && !(cp && (cp.arms || cp.ang));
    const rfr = runArms ? Sprite.runArmFrame(f, m) : null;
    if (runArms) Sprite.gaitArms(ctx, Xb, Yb, rfr, view, pal, hand, m, true);   // tay vung ra sau / tay xa (nhìn chéo): sau thân
    if (cp && cp.legs === 'kneel') Sprite.kneelLegs(ctx, Xb, Yb, pal, view, m);   // quỳ: 2 đầu gối dưới quần (celebrate.js); trượt gối chéo lên thấy đế giày
    else if (gk && gk.legs === 'kneel') Sprite.kneelLegs(ctx, Xb, Yb, pal);
    if (gk) Sprite.gkDraw(ctx, Xb, Yb, m, gk, pal, hand, 'behind');   // nhìn lên: bóng đang ôm nằm sau thân
    // thân chuyển động (torso.js) cho động tác mới: nghiêng theo thân, vặn vai, lai quần nhấc bên chân đang nhấc. Toạ độ màn hình -> nhìn trái đảo dấu / đổi bên
    let torso = bd ? (m ? B.bdiagL : B.bdiag) : back ? B.back : B.front;
    if (gaitOn) {
      const [hl, hr] = Sprite.gaitHem(gfr);
      torso = Sprite.torsoPart(bd, lean, gs * Sprite.gaitTwist(gfr), m ? hr : hl, m ? hl : hr, bd ? gs : 0);
    } else if (kickLeg && (!back || bd) && Sprite.MOVING_TORSO[atk.kt]) {
      const raised = atk.kp === 'go' && atk.u > 0.3;
      torso = Sprite.torsoPart(bd, sideView ? (m ? -lx : lx) : 0, gs * Sprite.kickTwist(atk), raised && !km, raised && km, bd ? gs : 0);
    }
    stamp(ctx, Xb, Yb, torso, pal);
    if (cp && cp.legs === 'sit') sitLegs(ctx, X, Yf, m, pal);
    if (cp && cp.legs === 'cross') crossLegs(ctx, X, Yf + 2, pal);   // xếp bằng: 2 ống chân vắt trước quần, che quần, hạ 2 ô cho giày 2 đầu nằm dưới tay (user 2026-11-01)
    if (kLeg && kLeg.over) drawKickLeg(ctx, Xb, Yb, km, view, atk, kLeg, pal);   // chân đá vung qua trước thân

    // tay: chéo xuống = tay gần đủ + cục da tay xa (lật khi chéo trái) · còn lại 2 tay đủ. Chạy: vung lên xuống 1 px, tay sau ngắn lại
    // thủ môn: 2 hàng da cuối của bàn tay thành găng (chấm sáng góc trên ngoài)
    // đổ người: tay vẽ riêng tới khi gần buông hẳn lúc đứng dậy (lúc đó vẽ tay đứng thường cho khớp khung đứng)
    const dive = atk && atk.dive && diveArmK(atk) >= 0.08, celArms = cp && (cp.arms || cp.ang);
    // pha tay (như chạy) hoặc null = tay buông
    const armOf = (ph) => (!ph ? [B.arm, 0] : [ph === 'B' ? B.armBack : B.arm, ARM_DY[ph]]);
    const arm = (a, dy, mir) => {
      stamp(ctx, Xb, Yb + dy, a, pal, mir);
      if (o.glove) { const r = a.y + a.rows.length - 3; rectW(ctx, Xb, Yb + dy, mir, -7, r, 2, 2, o.glove); rectW(ctx, Xb, Yb + dy, mir, -7, r, 1, 1, '#ffffff'); }
    };
    const wy = { L: 0, R: 0, bump: 0 };   // tay đang vung lên / xuống bao nhiêu (băng cổ tay bám theo): tay trái / phải màn hình, cục da tay xa
    if (o.fly && !dive && !celArms) {
      flyArms(ctx, Xb, Yb, m, o.fly, pal, hand);
    } else if (hp && !hp.rest) {
      headerArms(ctx, Xb, Yb, m, view, hp, pal, hand, false);
    } else if (hitOn) {
      /* giơ tay: vẽ sau đầu (dưới) */
    } else if (gaitOn || runArms) {
      Sprite.gaitArms(ctx, Xb, Yb, gaitOn ? gfr : rfr, view, pal, hand, m, false);
    } else if (gkArms) {
      Sprite.gkDraw(ctx, Xb, Yb, m, gk, pal, hand, 'front');   // thủ môn: tay gập ôm bóng (tay -> bóng -> găng) / tay thẳng chống đất
    } else if (kArms) {
      if (far !== 1) kickArm(ctx, Xb, Yb, m, view, atk, 1, pal, hand, false);
      if (far !== 0) kickArm(ctx, Xb, Yb, m, view, atk, 0, pal, hand, false);
    } else if (!dive && !celArms) {
      if (diag || bd) {
        // chéo lên: tay gần ở bên hướng mặt, cục da tay xa bên kia (ngược chéo xuống) -> lật thêm 1 lần
        const bm = bd ? !m : m;
        const near = f < 0 ? null : (m ? ARM_R : ARM_L)[f], far = f < 0 ? null : (m ? ARM_L : ARM_R)[f];
        if (!off) { const [a, ady] = armOf(near); arm(a, ady, bm); }
        if (!punchArm) {
          const bdy = f < 0 ? 0 : ARM_DY[far]; wy.bump = bdy;
          stamp(ctx, Xb, Yb + bdy, B.bump, pal, bm);
          if (o.glove) rectW(ctx, Xb, Yb + bdy, bm, 6, B.bump.y + 1, 1, B.bump.rows.length - 2, o.glove);
        }
      } else {
        if (!(punchArm && (pm || off))) { const [a, ady] = armOf(f < 0 ? null : ARM_L[f]); arm(a, ady, false); wy.L = ady; }
        if (!(punchArm && (!pm || off))) { const [b, bdy] = armOf(f < 0 ? null : ARM_R[f]); arm(b, bdy, true); wy.R = bdy; }
      }
    }
    if (punchArm && !bd) punch(ctx, Xb, Yb, pm, view, pe, atk, pal, hand);
    if (off && !offBehind(pe, view) && (view === 'diag' || view === 'back' || bd)) offArm(ctx, Xb, Yb, om, view, pe, pal, hand);   // tay gần / tay vung về phía máy quay: đè lên thân
    // GOAT PATH: băng quấn đúng chỗ chấn thương, theo bên của cầu thủ (user 2026-11-01: trái / phải theo cầu thủ, không theo màn hình):
    // cổ tay trái (tay đấm) · cổ chân / ngón chân phải (chân đá) · đùi trái ngay dưới quần.
    // Tay trái = bên phải màn hình, nhìn lên thì bên trái (như pm); chân phải = cột trái màn hình, nhìn lên thì cột phải. Nhìn trái lật theo hình
    // như mọi động tác. Nhìn chéo: tay trái là cục da tay xa (1 ô băng)
    if (o.inj && o.inj.length) {
      const parts = SFC_CONFIG.run && SFC_CONFIG.run.badges, legsBusy = !!(o.fly || kickLeg || hp || dive || gaitOn);
      const rightOnL = back ? m : !m, foot = feet[rightOnL ? 'L' : 'R'], other = feet[rightOnL ? 'R' : 'L'];
      for (const id of o.inj) {
        const part = parts && parts[id] && parts[id].part;
        if (part === 'wrist' && !(dive || celArms || kArms || gaitOn || runArms || gkArms || o.fly || hitOn || (hp && !hp.rest) || punchArm)) {
          if (diag || bd) rectW(ctx, Xb, Yb + wy.bump, bd ? !m : m, 6, B.bump.y + B.bump.rows.length - 2, 1, 1, BANDAGE);
          else {
            const wm = !pm, wY = Yb + (wm ? wy.R : wy.L);
            rectW(ctx, Xb, wY, wm, -8, -7, 3, 2, INK); rectW(ctx, Xb, wY, wm, -7, -7, 2, 1, BANDAGE); rectW(ctx, Xb, wY, wm, -7, -6, 1, 1, BLOOD);
          }
        }
        if (legsBusy) continue;
        // đùi: hàng trên cùng của chân (ngay dưới quần), 2 cột trong
        if (part === 'thigh' && other) {
          const [lp, lx, ly] = other, c = lp.x + lp.rows[0].indexOf('K') + 1;
          rectW(ctx, lx, ly, false, c, lp.y, 2, 1, BANDAGE); rectW(ctx, lx, ly, false, c + 1, lp.y, 1, 1, BLOOD);
        }
        if (!foot) continue;
        // cổ chân: hàng tất · ngón chân: hàng giày; 2 cột trong của chân (không đè viền)
        const [rp, rx, ry] = foot, so = rowOf(rp, 'O'), sh = rowOf(rp, 'G');
        if (part === 'ankle' && so >= 0) { const c = rp.x + rp.rows[so].indexOf('O'); rectW(ctx, rx, ry, false, c, rp.y + so, 2, 1, BANDAGE); rectW(ctx, rx, ry, false, c + 1, rp.y + so, 1, 1, BLOOD); }
        if (part === 'toe' && sh >= 0) { const c = rp.x + rp.rows[sh].indexOf('G'); rectW(ctx, rx, ry, false, c, rp.y + sh, 2, 1, BANDAGE); rectW(ctx, rx, ry, false, c + 1, rp.y + sh, 1, 1, BLOOD); }
      }
    }

    // đầu: choáng = lắc ngang · ăn mừng = headDy · đấm = đầu dẫn trước thân 1 px (nhìn xuống: cúi 1 px)
    const hxo = o.stun && !o.fly ? Math.round(Math.sin((o.anim || 0) * 20)) : 0;
    // đá hết tầm (nhìn ngang / chéo): đầu ngả ra sau 1 px, ngược chiều chân
    const hlx = punchArm && pe > 0.5 && sideView ? (m ? -1 : 1) : kickLeg && sideView && atk.kp === 'go' && atk.u > 0.5 ? (m ? 1 : -1) : 0, hly = punchArm && pe > 0.5 && view === 'front' ? 1 : 0;
    // đánh đầu: đầu ngả sau ở đỉnh nhảy rồi lao tới / cúi xuống lúc gật (nguyên ô)
    const hhx = hp ? snapPx(hp.hx) : 0;
    const Xh = Xb + hxo + hlx + (m ? -hhx : hhx) + (gaitOn ? gs * G.head[view] : 0), Yh = Yb + B.dy + snapPx((cp && cp.headDy) || 0) + hly + (hp ? snapPx(hp.hy) : 0) + (atk && atk.dive ? diveHeadDy(atk) : 0);
    if (celArms && cp.armsBehind) Sprite.celArms(ctx, Xb, Yb, cp, pal, hand);   // tay ra sau đầu (đội thua ôm đầu): vẽ trước đầu
    // tóc / mũ (hair.js): classic (mặc định) = đầu A đã duyệt, kiểu khác = đầu hói + kiểu tóc
    if (o.cut && o.cut !== 'classic') Sprite.drawHead(ctx, Xh, Yh, back, o.cut, o, pal, fx, fy, bd);
    else stamp(ctx, Xh, Yh, headOf(back, bd), pal, bd && m);
    // đổ người: nhìn từ sườn, tay che mặt -> không vẽ mặt
    // đổ người: mắt nhìn về phía bay tới (đầu hình)
    const eyes = o.stun ? 'stun' : dive ? 'up' : (cp && cp.eyes) || null, mouth = !!((cp && cp.mouth) || (o.fly && flyPose(o.fly).mouth));
    if (!back) face(ctx, Xh, Yh, Math.round(fx * 2), pal, eyes, mouth);
    // phụ kiện mặt (face.js): sau mặt và tóc; vài món có cả sau lưng (dây buộc)
    if (o.face && o.face !== 'none') Sprite.drawFace(ctx, Xh, Yh, o.face, { back, bd, fx, fy, anim: o.anim, eyes, mouth, pal, hair: o.hair, skin: o.skin });
    if (hp && hp.impact) headerImpact(ctx, Xh, Yh, m, view);
    if (off && view === 'front' && !offBehind(pe, view)) offArm(ctx, Xb, Yb, m, view, pe, pal, hand);   // nhìn xuống, lúc thu tay đấm: tay kia đưa ra trước
    if (celArms && !cp.armsBehind) Sprite.celArms(ctx, Xb, Yb, cp, pal, hand);   // tay ăn mừng theo luật độ dài (celebrate.js), vẽ sau đầu
    if (dive) diveArms(ctx, Xb, Yb, m, atk, pal, hand);
    if (hitOn) Sprite.liftArms(ctx, Xb, Yb, m, view, lift, pal, hand, false);   // giơ 2 tay (hit.js): vẽ sau đầu như tay thủ môn   // 2 tay vươn lên, găng cạnh đầu (vẽ sau đầu)
    if (o.flash) { ctx.globalCompositeOperation = 'lighter'; stamp(ctx, Xh, Yh, headOf(back, bd), FLASH, bd && m); ctx.globalCompositeOperation = 'source-over'; }
    if (gk) Sprite.gkDraw(ctx, Xb, Yb, m, gk, pal, hand, 'last');   // thủ môn tung bóng: bóng trên không trước lúc chạm chân, vẽ trên cùng (đỉnh cú tung cạnh đầu)
    // choáng: 3 ngôi sao (dấu + vàng, tâm trắng) quay quanh trên đầu
    if (Sprite.shoeEnd) Sprite.shoeEnd(ctx, o);   // đồ dưới đế / quanh giày (bánh xe, đinh, đế gỗ, lửa, phản lực, quầng sáng, lấp lánh)
    if (o.stun) for (let i = 0; i < 3; i++) {
      const a = (o.anim || 0) * 6 + (i * Math.PI * 2) / 3, sx = hxo + Math.round(Math.cos(a) * 9), sy = -28 + Math.round(Math.sin(a) * 2);
      rectW(ctx, Xb, Yh, false, sx - 1, sy, 3, 1, '#ffe14f'); rectW(ctx, Xb, Yh, false, sx, sy - 1, 1, 3, '#ffe14f'); rectW(ctx, Xb, Yh, false, sx, sy, 1, 1, '#ffffff');
    }
  }

  Object.assign(Sprite, { draw, viewOf });
})();
