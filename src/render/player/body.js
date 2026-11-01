/* PlayerSprite · body.js — Thân B + đầu A: bảng màu, bộ phận chân / thân / tay / đầu, mặt, bóng, màu băng quấn và chớp trắng.
 * Nạp theo thứ tự trong scripts/manifest.js (classic script, không module): mỗi file gắn hàm vào SFC.PlayerSprite.
 */
window.SFC = window.SFC || {};

(function () {
  const Sprite = (SFC.PlayerSprite = SFC.PlayerSprite || {});
  const { INK, cell, shade } = Sprite;
  // bảng màu theo vai: K viền · S/s da · J da ống chân (giày cao cổ / tất cao phủ lên, shoes.js) · T/t áo · P quần · O tất · G/g giày / đế · H tóc · B/b băng đô · W trắng · M miệng
  function palette(o) {
    const pal = {
      K: INK, W: '#ffffff', M: '#4a2a1a',
      S: o.skin, s: shade(o.skin, 0.2), J: o.skin,
      T: o.shirt, t: o.shirtD, P: o.shorts,
      O: o.sock, G: o.shoe, g: o.sole,
      H: o.hair, B: o.band, b: shade(o.band, 0.25),
    };
    return Sprite.shoePal ? Sprite.shoePal(o, pal) : pal;   // giày (shoes.js): thay O / G / g / J
  }

  /* ---------- bộ phận: { x: cột trái, y: hàng trên, scale: 1 (mịn) | 2 (thế giới), rows } ---------- */
  // chân như v2 leg(): viền · đầu gối · tất · giày · đế (chìa theo mũi giày) · viền đáy
  const LEG_TR = { x: 0, y: -5, scale: 2, rows: ['KKKK.', 'KJJK.', 'KOOK.', 'KGGK.', 'KgggK', 'KKKKK'] };   // mũi phải, cột viền trái = x
  const LEG_TL = { x: -1, y: -5, scale: 2, rows: ['.KKKK', '.KJJK', '.KOOK', '.KGGK', 'KgggK', 'KKKKK'] };  // mũi trái
  const LEG_TN = { x: 0, y: -5, scale: 2, rows: ['KKKK', 'KJJK', 'KOOK', 'KGGK', 'KggK', 'KKKK'] };        // sau lưng: không mũi
  const at = (part, dx, dy = 0) => Object.assign({}, part, { x: part.x + dx, y: part.y + dy });
  // chạy: chân trụ trước (dài thêm 1 hàng da, bàn chân thấp hơn = gần máy quay hơn)
  const PLANT_TR = { x: 0, y: -5, scale: 2, rows: ['KKKK.', 'KJJK.', 'KJJK.', 'KOOK.', 'KGGK.', 'KgggK', 'KKKKK'] };
  const PLANT_TL = { x: -1, y: -5, scale: 2, rows: ['.KKKK', '.KJJK', '.KJJK', '.KOOK', '.KGGK', 'KgggK', 'KKKKK'] };
  const PLANT_TN = { x: 0, y: -5, scale: 2, rows: ['KKKK', 'KJJK', 'KJJK', 'KOOK', 'KGGK', 'KggK', 'KKKK'] };
  // nhấc gối ra trước: ngắn 1 hàng, mũi giày quay vào máy quay (không chìa ngang, không thấy đế)
  const LIFT = { x: 0, y: -5, scale: 2, rows: ['KKKK', 'KJJK', 'KOOK', 'KGGK', 'KKKK'] };
  // gót đá ra sau: ngắn 1 hàng như nhấc gối nhưng giày màu đế (thấy đế giày) · nhìn sau lưng: đế giày to hơn
  const KICK_F = { x: 0, y: -5, scale: 2, rows: ['KKKK', 'KJJK', 'KOOK', 'KggK', 'KKKK'] };
  const KICK_B = { x: 0, y: -5, scale: 2, rows: ['KKKK', 'KJJK', 'KggK', 'KggK', 'KKKK'] };
  const LIFT_B = { x: 0, y: -5, scale: 2, rows: ['KKKK', 'KJJK', 'KOOK', 'KggK', 'KKKK'] };

  // thân như v2 torso(): viền rộng 11, 2 vai, áo 3 hàng (mép phải tối; sau lưng hàng đầu tối = cổ áo sau), dải tối, quần 2 hàng (hàng cuối có khe ống quần).
  // Nhìn trước không còn vạch cổ áo mực giữa ngực dưới cổ (user 2026-11-01 bỏ)
  const SHIRT = (back) => [back ? 'KTTtttttTtK' : 'KTTTTTTTTtK', 'KTTTTTTTTtK', 'KTTTTTTTTtK'];
  const rep = (s, n) => Array(Math.max(0, n)).fill(s);
  // bỏ hàng đầu gối (hàng 1) của chân: chân ngắn 1 hàng, đỉnh chân hạ 1
  const noKnee = (part) => Object.assign({}, part, { y: part.y + 1, rows: [part.rows[0]].concat(part.rows.slice(2)) });

  // thân cao 24 như sprite hiện tại (user chọn): chân không hàng đầu gối (tất ngay dưới quần), thân 8 hàng từ -11, đáy thân trùng đỉnh chân.
  // Tay + đầu bám theo đỉnh thân
  const BODY = (() => {
    const top = -11, arm = 3;   // đỉnh thân · số hàng da cẳng tay
    const torso = (back) => ({ x: -5, y: top, scale: 2, rows: ['KTKKKKKKKTK'].concat(SHIRT(back), ['KtttttttttK', 'KPPPPPPPPPK', 'KPPPPKPPPPK', 'KKKKKKKKKKK']) });
    return {
      TR: noKnee(LEG_TR), TL: noKnee(LEG_TL), TN: noKnee(LEG_TN),
      PTR: noKnee(PLANT_TR), PTL: noKnee(PLANT_TL), PTN: noKnee(PLANT_TN),
      LIFT: noKnee(LIFT), KICK_F: noKnee(KICK_F), KICK_B: noKnee(KICK_B), LIFT_B: noKnee(LIFT_B),
      front: torso(false), back: torso(true),
      // tay gần như v2 armFull(): góc bo, 1 điểm tay áo, cẳng tay da 2 px (cột trong tối); cột phải là viền thân. Bàn tay chạm hàng quần cuối
      arm: { x: -8, y: top + 1, scale: 2, rows: ['.KK', 'KKt'].concat(rep('KSs', arm), ['.KK']) },
      // chạy: tay vung ra sau -> bàn tay khuất sau thân, ngắn 1 hàng
      armBack: { x: -8, y: top + 1, scale: 2, rows: ['.KK', 'KKt'].concat(rep('KSs', arm - 1), ['.KK']) },
      // tay xa như v2 armBump(): cục da ló ra ngang hông
      bump: { x: 6, y: top + 2, scale: 2, rows: ['K.'].concat(rep('sK', arm - 1), ['K.']) },
      dy: (top + 13) * 2,   // (px mịn) đầu + mặt hạ xuống theo đỉnh thân (đầu khai báo cho thân cao 26)
    };
  })();

  // đầu A (lưới thế giới): rộng 15, cao 13, góc bo gần đầu tròn hiện tại
  const HEAD_A = {
    front: { x: -7, y: -25, scale: 2, rows: [
      '....KKKKKKK....',
      '..KKHHHHHHHKK..',
      '.KHHHHHHHHHHHK.',
      'KBBBBBBBBBBBBBK',
      'KSSSSSSSSSSSSsK',
      'KSSSSSSSSSSSSsK',
      'KSSSSSSSSSSSSsK',
      'KSSSSSSSSSSSSsK',
      'KSSSSSSSSSSSSsK',
      'KKSSSSSSSSSSsKK',
      '.KKSSSSSSSSsKK.',
      '..KKsssssssKK..',
      '....KKKKKKK....',
    ] },
    back: { x: -7, y: -25, scale: 2, rows: [
      '....KKKKKKK....',
      '..KKHHHHHHHKK..',
      '.KHHHHHHHHHHHK.',
      'KBBBBBBBBBBBBBK',
      'KHHHHHHbbHHHHHK',
      'KHHHHHHbbHHHHHK',
      'KHHHHHHHHHHHHHK',
      'KHHHHHHHHHHHHHK',
      'KHHHHHHHHHHHHHK',
      'KKHHHHHHHHHHHKK',
      '.KKSSSSSSSSSKK.',
      '..KKsssssssKK..',
      '....KKKKKKK....',
    ] },
  };
  const headOf = (back) => (back ? HEAD_A.back : HEAD_A.front);

  // mặt, lệch ex px thế giới theo hướng nhìn: mắt vuông 3 x 3 như đầu tròn hiện tại, đáy mắt / mũi / miệng ở hàng -17 / -16 / -15
  // (tính trước khi hạ theo thân, xem BODY.dy)
  function face(ctx, X, Y, ex, pal, kind = null, mouth = false) {
    const H = 3, ey = -17 - H + 1;
    ex = Math.max(-1, ex);   // đầu hẹp: lệch trái 2 px thì mắt trái dính viền (cặp mắt vốn lệch trái nửa px)
    // kind: null mắt mở · 'stun' / 'closed' gạch ngang · 'happy' ^ ^ · 'up' nhìn lên (thấp 1 hàng, chấm sáng giữa)
    for (const x of [-4 + ex, 1 + ex]) {
      if (kind === 'stun' || kind === 'closed') cell(ctx, X, Y, x, ey + H - 2, 3, 1, INK);
      else if (kind === 'happy') { cell(ctx, X, Y, x + 1, ey + 1, 1, 1, INK); cell(ctx, X, Y, x, ey + 2, 1, 1, INK); cell(ctx, X, Y, x + 2, ey + 2, 1, 1, INK); }
      else if (kind === 'up') { cell(ctx, X, Y, x, ey, 3, H - 1, INK); cell(ctx, X, Y, x + 1, ey, 1, 1, pal.W); }
      else { cell(ctx, X, Y, x, ey, 3, H, INK); cell(ctx, X, Y, x, ey, 1, 1, pal.W); }
    }
    cell(ctx, X, Y, ex, -16, 1, 1, pal.s);
    // há miệng (ăn mừng): 4 x 2 mực, lưỡi đỏ · choáng: miệng mực
    if (mouth) { cell(ctx, X, Y, -2 + ex, -15, 4, 2, INK); cell(ctx, X, Y, -1 + ex, -14, 2, 1, '#c0304a'); }
    else cell(ctx, X, Y, -1 + ex, -15, 2, 1, kind === 'stun' ? INK : pal.M);
  }

  // bóng như v2: elip mịn của game vẽ ở lưới thế giới rồi nhân đôi (giữ đúng mép px) · k = thu nhỏ khi nhảy
  const shadowImgs = {};
  function shadow(ctx, X, Y, k = 1) {
    if (typeof document === 'undefined') return;
    let img = shadowImgs[k];
    if (!img) {
      img = shadowImgs[k] = document.createElement('canvas'); img.width = 20; img.height = 8;
      const s = img.getContext('2d');
      s.fillStyle = 'rgba(0,0,0,0.38)'; s.beginPath(); s.ellipse(10, 4, 7 * k, 2.5 * k, 0, 0, Math.PI * 2); s.fill();
    }
    const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, X - 20, Y + 2 - 8, 40, 16);
    ctx.imageSmoothingEnabled = sm;
  }

  // hàng đầu tiên chứa màu ch trong 1 bộ phận (tìm hàng tất / giày của chân để quấn băng)
  const rowOf = (part, ch) => part.rows.findIndex((r) => r.includes(ch));
  const BANDAGE = '#f4efe2', BLOOD = '#e0475e';
  // bảng màu chớp trắng: mọi màu trừ viền
  const FLASH = new Proxy({}, { get: (t, k) => (k === 'K' ? 'rgba(0,0,0,0)' : 'rgba(255,255,255,0.6)') });

  Object.assign(Sprite, { palette, LEG_TR, LEG_TL, LEG_TN, at, PLANT_TR, PLANT_TL, PLANT_TN, LIFT, KICK_F, KICK_B, LIFT_B, SHIRT, rep, noKnee, BODY, HEAD_A, headOf, face, shadow, rowOf, BANDAGE, BLOOD, FLASH });
})();
