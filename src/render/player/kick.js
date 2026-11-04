/* PlayerSprite · kick.js — Hard attack (đã duyệt 2026-11-01): lấy đà + đá bay bằng chân phải.
 * Nạp theo thứ tự trong scripts/manifest.js (classic script, không module): mỗi file gắn hàm vào SFC.PlayerSprite.
 */
window.SFC = window.SFC || {};

(function () {
  const Sprite = (SFC.PlayerSprite = SFC.PlayerSprite || {});
  const { blockCells, drawCells, lerp, limbCells, rectW, shade } = Sprite;
  // Hard attack (user 2026-11-01): 2 bước, cả người cùng ra đòn.
  // 1) lấy đà: khuỵu gối, hạ người 1 px, chân đá thu ra sau chân trụ, tay phải giơ lên, tay trái buông.
  // 2) tung cú đá: bật nhảy nhẹ, chân đá vung từ sau chân trụ ra trước tới hết tầm (đế giày ra trước), tay vung ngược chiều, rồi tiếp đất khuỵu nhẹ.
  // Pha (attackPose -> atk.kp): 'in' đứng -> lấy đà · 'go' lấy đà -> hết tầm · 'out' hết tầm -> đứng; atk.u 0..1 (u = 1 ở 'in' / 'go' là tư thế khoá).
  // Chân / tay giữ độ dài lúc đứng (ống chân từ hông 2.5 ô + bàn chân, tay 2.4 ô + nắm tay); tầm với đến từ thân: xoay hông, lao tới, bật nhảy.
  // keys = [đứng, lấy đà, hết tầm], toạ độ theo thân (hình nhìn phải), góc: 0 trước, π/2 xuống, π sau
  // tay ngược chân (user 2026-11-01): lấy đà (chân phải thu về) = tay phải giơ lên, tay trái buông · hết tầm (chân phải đá ra) = tay phải buông, tay trái vung ra trước / lên. arms[k][i]: tay phải = i 0 khi nhìn xuống / chéo / ngang, i 1 khi nhìn lên
  const KLEN = 2.5, ALEN = 2.4, ARM_ROOT = [[-7, -9], [6, -9]];
  const KICK = {
    // ngang / chéo: chân đá = chân sau (bên trái hình), xoay quanh hông. Lấy đà: hông xoay ra sau, gót nhấc cao sau thân;
    // vung: hông trượt lên trước (chân đá ra từ phía chân trụ)
    // tay ngược chân cả trước / sau: lấy đà = tay phải vung ra TRƯỚC + lên (vắt qua ngực về hướng mặt), tay trái buông hơi ra sau;
    // hết tầm = tay phải vung ra SAU + thấp, tay trái ra trước + lên
    side: { hip: [-3, -4, 3], ang: [Math.PI / 2, 0.83 * Math.PI, -0.12 * Math.PI], arms: [[-0.7, 1.75], [Math.PI - 0.7, -0.75]] },
    // xuống: chân phải thu ra sau (khuất sau thân, thấy đế) rồi đá thẳng vào máy quay: đế giày to 4 x 3 đè lên trước thân
    // đế nhìn từ dưới: mũi rộng, gót hẹp
    front: { hip: [2, 2, 2], end: [[2, -4], [2, -5], [2, -5]], foot: [[0, 1, ['GG', 'gg']], [0, 1, ['gg', 'gg']], [0, 0, ['GGGG', 'gggg', 'gggg', '.gg.']]], over: [false, false, true],
      arms: [[Math.PI + 1.0, 1.2], [Math.PI - 1.2, -0.6]] },
    // lên: chân phải thu về phía máy quay (đế giày đè lên mép quần) rồi đá chếch ra cạnh người (đá thẳng ra xa thì thân che hết chân)
    // hết tầm: chân ra xa thêm 1 ô, tay phải buông thẳng -> bàn chân không bị tay che
    back: { hip: [2, 2, 6], end: [[2, -4], [2, -4], [8, -7]], foot: [[0, 1, ['GG', 'gg']], [0, 0, ['gg', 'gg']], [1, -1, ['GG', 'Gg', 'Gg']]], over: [false, true, false],
      arms: [[Math.PI - 1.2, -1.0], [Math.PI + 0.6, Math.PI / 2]] },
  };
  KICK.diag = KICK.side;
  // chéo lên (bdiag): chân như nhìn ngang (chân phải thu ra sau = về phía máy quay bên trái màn hình rồi vung lên trước);
  // thấy lưng nên tay phải của cầu thủ là tay bên phải hình (i 1, tay gần) -> đổi 2 tay của bảng nhìn ngang. Tay xa (i 0) vẽ sau thân
  const bdiagOf = (side) => Object.assign({}, side, { arms: side.arms.map(([a, b]) => [b, a]) });
  KICK.bdiag = bdiagOf(KICK.side);
  // plant = cột chân trụ khi nhìn ngang / chéo (đứng: 1) · tuck = chân trụ co lên lúc trên không
  // inBack = tư thế đầu (lấy đà) nằm sau thân
  KICK.plant = 2; KICK.tuck = true; KICK.inBack = true;
  // bảng tư thế theo động tác (atk.kt): hard ở đây, shoot / volley ở shoot.js. Cùng dạng KICK, keys = [đứng, tư thế đầu, tư thế cuối]
  const KICKS = { hard: KICK };
  const kickTable = (atk) => KICKS[atk.kt || 'hard'];
  // giá trị nội suy theo pha · kn = key gần nhất (hình bàn chân, trước / sau thân)
  const kv = (keys, kp, u) => (kp === 'in' ? lerp(keys[0], keys[1], u) : kp === 'go' ? lerp(keys[1], keys[2], u) : lerp(keys[2], keys[0], u));
  const kn = (keys, kp, u) => (kp === 'in' ? keys[u < 0.5 ? 0 : 1] : kp === 'go' ? keys[u < 0.5 ? 1 : 2] : keys[u < 0.5 ? 2 : 0]);
  // gần đứng: 2 chân / 2 tay vẽ như đứng
  const kickRest = (atk) => (atk.kp === 'in' && atk.u < 0.2) || (atk.kp === 'out' && atk.u >= 0.8);
  const kickArmsOn = (atk) => !((atk.kp === 'in' && atk.u < 0.15) || (atk.kp === 'out' && atk.u >= 0.85));
  // chân đá: hông (hx, hy), đầu ống chân (ex, ey) theo ô thế giới · foot = [dx, dy, hình] tính từ đầu ống chân · over = vẽ đè lên thân
  function legPose(view, kp, u, T = KICK) {
    const K = T[view];
    if (K.ang) {
      const a = kv(K.ang, kp, u), hx = kv(K.hip, kp, u), hy = -5;
      // hất ra trước: đế quay ra trước · dưới hông: giày nằm, mũi về trước · thu ra sau: gót nhấc, đế quay ra sau
      const foot = a < 0.25 * Math.PI ? [1, -1, ['GG', 'Gg', 'Gg']] : a <= 0.6 * Math.PI ? [0, 1, ['GGG', 'ggg']] : [-1, 0, ['gG', 'gG']];
      // chéo lên: chân đá vung ra trước = ra xa máy quay -> luôn vẽ sau thân, thân che đùi (user 2026-11-03)
      return { hx, hy, ex: hx + KLEN * Math.cos(a), ey: hy + KLEN * Math.sin(a), foot, over: view !== 'bdiag' && !(kp === 'in' && T.inBack) && a <= 0.6 * Math.PI };
    }
    return { hx: kv(K.hip, kp, u), hy: -5, ex: kv(K.end.map((q) => q[0]), kp, u), ey: kv(K.end.map((q) => q[1]), kp, u), foot: kn(K.foot, kp, u), over: kn(K.over, kp, u) };
  }
  // vẽ chân đá quanh gốc thân (X, Y): đùi màu quần (lúc nhấc lên trước thân) -> đầu gối da -> tất -> giày.
  // Đang vung: cung sáng theo đường bàn chân + 2 bóng bàn chân tối dần (nhoè), cùng lưới thế giới với tư thế khoá
  function drawKickLeg(ctx, X, Y, mir, view, atk, L, pal) {
    const T = kickTable(atk);
    const col = (k, i, n) => (i / n < 0.22 ? pal.P : i / n < 0.42 ? pal.J : pal.O), [fdx, fdy, rows] = L.foot;
    const hx = Math.round(L.hx), ex = Math.round(L.ex), ey = Math.round(L.ey), cells = new Map();
    if (atk.kp === 'go' && atk.u < 1) {
      // cung sáng: 1 ô mỗi chỗ giữa bàn chân đã đi qua (ô đi qua nhiều lần chỉ tô 1 lần, lấy lần mới nhất), sáng dần về phía bàn chân
      const arc = new Map();
      for (let uu = Math.max(0, atk.u - 0.5); uu < atk.u; uu += 0.025) {
        const q = legPose(view, 'go', uu, T);
        arc.set(Math.round(q.ex + q.foot[0] + q.foot[2][0].length / 2) + ',' + Math.round(q.ey + q.foot[1] + q.foot[2].length / 2), 1 - (atk.u - uu) / 0.5);
      }
      ctx.globalCompositeOperation = 'lighter';
      for (const [kk, k] of arc) {
        const [qx, qy] = kk.split(',').map(Number);
        rectW(ctx, X, Y, mir, qx, qy, 1, 1, `rgba(255,${120 + Math.round(k * 135)},${90 + Math.round(k * 165)},${0.25 + k * 0.6})`);
      }
      ctx.globalCompositeOperation = 'source-over';
      for (const [d, dk] of [[0.3, -0.6], [0.15, -0.3]]) {
        if (atk.u - d <= 0) continue;
        const q = legPose(view, 'go', atk.u - d, T);
        blockCells(cells, Math.round(q.ex) + q.foot[0], Math.round(q.ey) + q.foot[1], q.foot[2].map((r) => r.replace(/g/g, 'G')), { G: shade(pal.G, dk) });
      }
    }
    drawCells(ctx, X, Y, blockCells(limbCells([[hx, L.hy], [ex, ey]], col, cells), ex + fdx, ey + fdy, rows, pal), mir);
    // trúng (tư thế khoá hết tầm): tia sáng hình + như cú đấm, ở mép trước bàn chân (nhìn xuống: góc trên đế giày)
    if (atk.u >= 1 && atk.kp !== 'out' && atk.impact) {
      const fx = ex + fdx, fy = ey + fdy, w = rows[0].length;
      const [ix, iy] = view === 'front' ? [fx + w, fy - 1] : [fx + w + 2, fy + 1];
      rectW(ctx, X, Y, mir, ix - 3, iy, 7, 1, '#fff6a0'); rectW(ctx, X, Y, mir, ix, iy - 3, 1, 7, '#fff6a0');
      for (const [a, b] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) rectW(ctx, X, Y, mir, ix + a, iy + b, 1, 1, '#ffffff');
    }
  }
  // tay xa (vẽ sau thân, da tối) theo góc nhìn: chéo xuống = i 1 · chéo lên = i 0 · còn lại không có (-1)
  const farArm = (view) => (view === 'diag' ? 1 : view === 'bdiag' ? 0 : -1);
  // tay khi đá: i 0 = tay trái, 1 = tay phải (hình nhìn phải), xoay quanh vai, giữ độ dài tay đứng · behind = tay xa nằm sau thân (da tối)
  // bảng có armAt(atk, view, i) (thủ môn tung bóng, gkball.js): góc tay theo thời gian thay cho nội suy 3 khoá; trả null = theo khoá
  function kickArm(ctx, X, Y, mir, view, atk, i, pal, hand, behind) {
    const T = kickTable(atk), K = T[view], ov = T.armAt ? T.armAt(atk, view, i) : null;
    const a = ov != null ? ov : kv([Math.PI / 2, K.arms[0][i], K.arms[1][i]], atk.kp, atk.u);
    armAt(ctx, X, Y, mir, i, a, pal, hand, behind);
  }
  // 1 cánh tay xoay quanh vai i (0 trái / 1 phải hình nhìn phải) góc a, dài như tay đứng; bàn tay làm tròn tới ô thế giới
  function armAt(ctx, X, Y, mir, i, a, pal, hand, behind) {
    const [rx, ry] = ARM_ROOT[i], ex = rx + ALEN * Math.cos(a), ey = ry + ALEN * Math.sin(a), skin = behind ? pal.s : pal.S;
    const col = (k, j, n) => (j === 0 ? pal.t : j === n && hand !== pal.S ? hand : skin);
    drawCells(ctx, X, Y, limbCells([[rx, ry], [Math.round(ex), Math.round(ey)]], col), mir);
  }

  Object.assign(Sprite, { KLEN, ALEN, ARM_ROOT, KICK, KICKS, bdiagOf, farArm, kickTable, kv, kn, kickRest, kickArmsOn, legPose, drawKickLeg, kickArm, armAt });
})();
