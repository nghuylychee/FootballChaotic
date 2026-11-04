/* PlayerSprite · keeper.js — Thủ môn đổ người: cú nhảy vẽ thẳng trên lưới px bằng khung vẽ riêng (DIVE_FRAMES, user 2026-11-04 theo ảnh tham khảo):
 * bay xuống (về phía máy quay) nhìn chéo xuống, bay lên nhìn sau lưng chéo. Thân / tay / găng / chân là ảnh ô riêng của từng khung, không theo luật
 * tay chân của tư thế thường; đầu (tóc, mặt, phụ kiện) vẫn vẽ chung ở draw.js, đặt theo khung.
 * Nạp theo thứ tự trong scripts/manifest.js (classic script, không module): mỗi file gắn hàm vào SFC.PlayerSprite.
 */
window.SFC = window.SFC || {};

(function () {
  const Sprite = (SFC.PlayerSprite = SFC.PlayerSprite || {});
  const { at, drawCells, limbCells, stamp } = Sprite;
  // Game (Actions.dive): bay gkDiveMin 0.12 – gkDiveTime 0.24 s (state dash, tuỳ quãng cần bay, p.diveT), rồi đứng dậy gkDivePose giây (tới p.poseEnd).
  // attackPose trả: dk = tiến độ bay · dh = độ cao vòng cung (diveT / gkDiveTime) · ds = cất người (0.06 s đầu cú bay) · stage = giai đoạn đứng dậy
  // sau khi chạm đất · toward = bay xuống màn hình · khop = độ cao cú nhảy (px) · hold = đang ôm bóng (player.js)
  const P = Math.PI;
  // takeoff = thời gian cất người (s) · jump = đỉnh cú nhảy (px, cú bay đủ gkDiveTime; bay ngắn thấp theo dh)
  const DIVE = { takeoff: 0.06, jump: 14 };
  // Cú đổ người là 1 cú nhảy (user 2026-11-04, thay cú lướt): cả người nâng theo vòng cung parabol, bóng đổ nằm dưới đất thu nhỏ theo độ cao
  // (draw.js dùng như khop của cú sút)
  const diveLift = (atk) => { const u = Math.min(1, atk.dk || 0); return Math.round(DIVE.jump * (atk.dh || 1) * 4 * u * (1 - u)); };
  // khuỵu (nguyên ô): khuỵu ở giai đoạn crouch lúc đứng dậy (lúc bay: khung vẽ riêng; ôm bóng: vẫn quỳ, gkball.js)
  const diveCrouch = (atk) => (atk.flying || atk.hold ? 0 : atk.stage === 'crouch' ? 1 : 0);
  // kiểu chân lúc đứng dậy không có khung riêng: khuỵu = bend, còn lại stand (nhổm / quỳ: chân quỳ vẽ riêng, gkball.js)
  const diveLegPose = (atk) => (atk.stage === 'crouch' ? 'bend' : 'stand');
  // chân theo kiểu (hình nhìn phải, lật theo mir). bend: đứng rộng khuỵu · wide: dạng rộng hơn bend (đỡ bóng tại chỗ, gkball.js)
  function diveLegs(ctx, X, Y, B, pal, pose, toe, mir) {
    const S = (part, dx, dy = 0) => stamp(ctx, X, Y, at(part, dx, dy), pal, mir);
    if (pose === 'bend') { S(toe, -5); S(toe, 2); }
    else if (pose === 'wide') { S(toe, -6); S(toe, 3); }
  }

  /* ---------- khung vẽ riêng của cú đổ người ---------- */
  // Ảnh ô (chữ như bảng màu body.js; Y = màu găng). Hình nhìn phải: vươn về phía bóng (bên phải hình), nhìn trái thì lật cả khung
  const ART = {
    // găng = đúng găng thủ môn của tư thế thường (gkball.js GLOVE: 3 x 3 màu găng, chấm sáng góc trên trái, viền mực không góc) -> 5 x 5
    glove: ['.KKK.', 'KWYYK', 'KYYYK', 'KYYYK', '.KKK.'],
    // thân nhìn trước / sau lưng chéo (như BODY.front / bdiag của body.js: cổ áo sau lệch 1 cột ngược phía bóng)
    torsoF: ['KTKKKKKKKTK', 'KTTTTTTTTtK', 'KTTTTTTTTtK', 'KTTTTTTTTtK', 'KtttttttttK', 'KPPPPPPPPPK', 'KPPPPKPPPPK', '.KKKKKKKKK.'],
    torsoB: ['KTKKKKKKKTK', 'KTtttttTTtK', 'KTTTTTTTTtK', 'KTTTTTTTTtK', 'KtttttttttK', 'KPPPPPPPPPK', 'KPPPPKPPPPK', '.KKKKKKKKK.'],
    // chân buông lơ lửng (thấy gối, mũi giày vào máy quay) · co gối (ngắn)
    legHang: ['KKKK', 'KJJK', 'KOOK', 'KGGK', '.KK.'],
    legTuck: ['KKKK', 'KOOK', 'KGGK', '.KK.'],
    // chân duỗi về phía máy quay (nhìn sau lưng): thấy đế giày xám 2 hàng
    legSole: ['KKKK', 'KJJK', 'KOOK', 'KggK', 'KggK', '.KK.'],
    // quỳ nhìn sau lưng: cẳng chân nằm trên đất chĩa về phía máy quay, ngắn, thấy đế
    legKneel: ['KKKK', 'KOOK', 'KggK', 'KggK', '.KK.'],
    // quỳ nhìn trước: đùi ngắn tới đầu gối chạm đất (cẳng chân khuất sau)
    legKneelF: ['KKKK', 'KJJK', 'KJJK', '.KK.'],
  };
  // dịch mỗi hàng sh[j] ô sang phải (số âm: sang trái), đệm trái cho hàng lệch trái nhất ở cột 0 · trả [ảnh, cột của hàng 0]
  function slant(rows, sh) {
    const lo = Math.min(...sh);
    return [rows.map((r, j) => '.'.repeat(sh[j] - lo) + r), -lo];
  }
  // độ nghiêng thân (cột dịch phải của từng hàng, vai -> đáy quần): ngả nhẹ về phía bóng, chung cho bay xuống / bay lên
  const LEAN = [2, 2, 1, 1, 1, 0, 0, 0], LEAN1 = [1, 1, 1, 0, 0, 0, 0, 0];
  ART.torsoFTilt = slant(ART.torsoF, LEAN)[0];
  // khung: base = khối vẽ trước đầu [ảnh, x, y] (x, y = góc trên trái, ô tính từ chân) · head = đầu dịch [dx, dy] so với chỗ đứng ·
  // base có thể có ['arm', [vai, cổ tay]] (tay dày 3 ô) và ['ball', x, y] (tâm bóng), vẽ theo thứ tự trong base · gloves = găng [x, y] (góc trên trái, vẽ sau đầu) ·
  // ball = chỗ bóng khi đang ôm (tâm) · hold = thay đổi khi đang ôm bóng (2 găng ngang nhau, đè lên 2 mép bóng) · shadow 'wide' (nằm sấp về phía máy quay: elip rộng dưới đầu) | 'long'
  // Bay lên (sau lưng chéo): dựng như bay xuống (fJump) để 2 cú bay là 1 cặp và các khối luôn liền nhau: thân cao như đứng, ngả nhẹ về phía bóng
  // (sh = LEAN...), 2 chân lệch nhau 1 hàng dưới đáy quần (thấy đế), đầu đặt giữa vai trên cùng, tay vươn mọc đúng mép vai.
  // oy = hạ cả người (nằm) · arms = [vai 'R' | 'L', [dx, dy] từ vai tới cổ tay] · legArt = ảnh chân (mặc định duỗi, thấy đế)
  function awayFrame(id, sh, oy, arms, extra, legArt = 'legSole') {
    ART['torso_' + id] = slant(ART.torsoB, sh)[0];
    const ty = -11 + oy, tx = -5;
    // tay vẽ sau chân, trước thân: nhìn sau lưng thì thân che gốc tay (tay không đè lên lưng)
    const legs = [[legArt, tx + 1, ty + 7], [legArt, tx + 6, ty + 6]], torso = ['torso_' + id, tx, ty];
    const f = { base: legs.slice(), head: [tx + sh[0] + 5, ty + 11], gloves: [], hold: { base: legs.slice(), gloves: [] } };
    // vai = ô áo trong viền ở hàng 1 · cổ tay = vai + [ax, ay] · găng nằm quá cổ tay theo hướng ngang, theo chiều dọc chỉ khi tay giơ lên
    // (tay chếch xuống: găng giữa cổ tay, không tụt xuống hông)
    const armAt = (side, [ax, ay]) => {
      const sx = side === 'R' ? tx + sh[1] + 8 : tx + sh[1] + 1, sy = ty + 1, ex = sx + ax, ey = sy + ay;
      return [['arm', [[sx, sy], [ex, ey]]], ['glove', ex - 2 + Math.sign(ax) * 2, ey - 2 + Math.min(0, Math.sign(ay)) * 2]];
    };
    for (const [side, v] of arms) {
      // găng tay kia (L, xa phía bóng) nằm sau đầu và thân như cánh tay của nó; găng tay vươn (R) vẽ sau đầu
      const [arm, glove] = armAt(side, v);
      f.base.push(arm);
      if (side === 'L') f.base.push(glove);
      else f.gloves.push(glove.slice(1));
    }
    // đang ôm bóng. raised (bay / nằm): bắt bóng lúc đang vươn -> 2 tay vẫn giơ, 2 găng 2 bên đầu, bóng giữa 2 găng ở phía xa máy quay (đầu che gần hết) ·
    // không raised (bò, bắt đầu đứng dậy): bóng kéo về trước ngực (thân che) -> 2 tay gập ôm bóng sau thân, 2 găng ló ra 2 bên sườn
    const raised = arms.some(([side, [, ay]]) => side === 'R' && ay < 0) && !(extra && extra.chestHold);
    // giơ: cổ tay chếch ra ngoài để 2 găng ló khỏi 2 bên đầu
    const [ra, rg] = armAt('R', raised ? [3, -4] : [1, 3]), [la, lg] = armAt('L', raised ? [-3, -4] : [-1, 3]);
    if (raised) f.hold.base.push(ra, la, ['ball', (rg[1] + lg[1]) / 2 + 3, rg[2] + 2], rg, lg);
    else f.hold.base.push(ra, rg, la, lg);
    f.base.push(torso); f.hold.base.push(torso);
    return Object.assign(f, extra);
  }
  const LEGS_F = [['legHang', -6, -4], ['legHang', 0, -5]];
  const DIVE_FRAMES = {
    // bay xuống (về phía máy quay), nhìn chéo xuống
    fCrouch: { base: [['legHang', -6, -4], ['legHang', 2, -4], ['torsoF', -5, -10]], head: [0, 1], gloves: [[-9, -8], [6, -9]] },
    fJump: { base: LEGS_F.concat([['torsoFTilt', -5, -11]]), head: [2, 0], gloves: [[-8, -11], [7, -13]], hold: { gloves: [[-6, -10], [5, -10]], ball: [2, -7] } },
    fReach: { base: [['legTuck', -5, -4], ['legTuck', 0, -4], ['torsoFTilt', -5, -11]], head: [2, 0], gloves: [[-6, -10], [6, -12]], hold: { gloves: [[-6, -10], [5, -10]], ball: [2, -7] } },
    // duỗi hết: đầu chúi xuống che thân, 2 găng dưới cằm
    fStretch: { base: [['torsoF', -3, -13]], head: [2, 4], gloves: [[-5, -9], [4, -10]], hold: { gloves: [[-6, -8], [5, -8]], ball: [2, -5] } },
    fLand: { base: [], head: [1, 8], gloves: [[-8, -6], [5, -7]], hold: { gloves: [[-7, -6], [4, -6]], ball: [1, -3] }, shadow: 'wide' },
    fLie: { base: [], head: [1, 7], gloves: [[-8, -6], [5, -7]], hold: { gloves: [[-7, -6], [4, -6]], ball: [1, -3] }, shadow: 'wide' },
    fFours: { base: [], head: [1, 5], gloves: [[-8, -6], [5, -7]], hold: { gloves: [[-7, -6], [4, -6]], ball: [1, -3] }, shadow: 'wide' },
    // bay lên (xa máy quay), nhìn sau lưng chéo
    bCrouch: { base: [['legHang', -6, -4], ['legHang', 2, -4], ['torsoB', -5, -10]], head: [0, 1], gloves: [[-10, -8], [5, -8]] },
    // tay ngắn như tay đứng (vai -> cổ tay ~4 ô, gần thẳng đứng, găng nằm ngay sau cổ tay)
    // tay kia (L) vung dần từ chếch xuống (găng ngang ngực) -> ngang vai -> chếch lên -> lên cao theo cú bay
    bReach1: awayFrame('reach1', LEAN1, 0, [['R', [1, -4]], ['L', [-2, 2]]]),
    bReach2: awayFrame('reach2', LEAN1, 0, [['R', [1, -4]], ['L', [-3, 0]]]),
    bStretch1: awayFrame('stretch1', LEAN, 0, [['R', [2, -4]], ['L', [-4, -2]]]),
    bStretch2: awayFrame('stretch2', LEAN, 0, [['R', [2, -4]], ['L', [-3, -4]]]),
    bLie: awayFrame('lie', LEAN, 4, [['R', [2, -3]], ['L', [-3, -4]]], { shadow: 'long' }),
    // bò: tư thế nằm chống người lên 2 ô, cẳng chân quỳ
    bFours: awayFrame('fours', LEAN, 2, [['R', [2, -2]], ['L', [-3, 3]]], { chestHold: true }, 'legKneel'),
    // ôm bóng đứng dậy (user 2026-11-04: chỉ 2 khung): quỳ thẳng người 2 gối, bóng ôm trước ngực (khung này) -> quỳ 1 gối quay về phía sân
    // (tư thế quỳ ôm bóng của gkball.js) -> đứng ôm bóng (gkHold)
    fKneel: { base: [['legKneelF', -4, -3], ['legKneelF', 1, -3], ['torsoF', -5, -9]], head: [0, 2], gloves: [[-6, -8], [4, -8]], hold: { gloves: [[-6, -8], [4, -8]], ball: [1, -6] } },
    bKneel: awayFrame('kneel', LEAN1, 2, [], { chestHold: true }, 'legKneel'),
  };
  // khung của lúc này, null = tư thế thường (nhổm / quỳ / khuỵu dậy, gkball.js)
  function diveFrameOf(atk) {
    const t = atk.toward, F = DIVE_FRAMES;
    if (atk.flying) {
      if ((atk.ds || 0) < 0.5) return t ? F.fCrouch : F.bCrouch;
      const k = atk.dk || 0;
      return t ? (k < 0.45 ? F.fJump : k < 0.72 ? F.fReach : F.fStretch) : k < 0.25 ? F.bReach1 : k < 0.5 ? F.bReach2 : k < 0.75 ? F.bStretch1 : F.bStretch2;
    }
    if (atk.stage === 'land') return t ? F.fLand : F.bLie;
    if (atk.stage === 'lie') return t ? F.fLie : F.bLie;
    // ôm bóng (atk.hold, player.js): bò + nhổm = quỳ thẳng ôm bóng · không ôm: bò
    if (atk.hold && (atk.stage === 'fours' || atk.stage === 'rise')) return t ? F.fKneel : F.bKneel;
    if (atk.stage === 'fours') return t ? F.fFours : F.bFours;
    return null;
  }
  // hướng mặt vẽ khi có khung riêng (user 2026-11-04: giữ cảm giác chéo, không nhìn thẳng / quay lưng hẳn): bay xuống = chéo xuống, bay lên = chéo lên,
  // về phía hướng mặt thật (phía sân, phía bóng tới)
  const diveFacing = (atk, facing) => (diveFrameOf(atk) ? (Math.cos(facing) < 0 ? P : 0) + (Math.cos(facing) < 0 ? -1 : 1) * (atk.toward ? P / 4 : -P / 4) : null);
  // vẽ 1 lớp của khung quanh gốc chân (X, Y): 'base' trước đầu (chân, tay, thân), 'front' sau đầu (bóng -> găng). mir = nhìn trái (lật cả khung)
  function diveFrameDraw(ctx, X, Y, f, layer, pal, hand, mir, ball) {
    const pal2 = Object.assign({}, pal, { Y: hand });
    const put = (name, x, y) => { const rows = ART[name], w = Math.max(...rows.map((r) => r.length)); stamp(ctx, X, Y, { x: mir ? -(x + w - 1) : x, y, rows: mir ? rows.map((r) => r.padEnd(w, '.').split('').reverse().join('')) : rows }, pal2); };
    const h = ball && f.hold ? Object.assign({}, f, f.hold) : f;
    // tay dày 3 ô như tay đứng (da sáng 2 cột + cột tối bên phải; ô đầu = tay áo)
    const arm = (pts) => {
      const cells = limbCells(pts.map(([x, y]) => [x + 1, y]), (k, i) => (i === 0 ? pal.t : pal.s));
      drawCells(ctx, X, Y, limbCells(pts, (k, i) => (i === 0 ? pal.t : pal.S), cells), mir);
    };
    if (layer === 'base') { h.base.forEach(([n, a, b]) => (n === 'arm' ? arm(a) : n === 'ball' ? Sprite.heldBall(ctx, X, Y, mir, a, b) : put(n, a, b))); return; }
    if (ball && h.ball && Sprite.heldBall) Sprite.heldBall(ctx, X, Y, mir, h.ball[0], h.ball[1]);
    (h.gloves || []).forEach(([x, y]) => put('glove', x, y));
  }

  Object.assign(Sprite, { DIVE, DIVE_FRAMES, diveLegs, diveCrouch, diveLegPose, diveLift, diveFacing, diveFrameOf, diveFrameDraw });
})();
