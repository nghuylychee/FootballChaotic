/* PlayerSprite · face.js — Phụ kiện mặt (slot face, 19 món) trên đầu A, vẽ sau mặt (face() của body.js) và sau tóc: drawFace(ctx, X, Y, id, o).
 * Vẽ lại cho mặt mới (mắt 3 x 3 ở hàng -19..-17, mũi -16, miệng -15), không chuyển thẳng drawFace của sprite 1x cũ (đã xoá).
 * Nạp theo thứ tự trong scripts/manifest.js (classic script, không module): mỗi file gắn hàm vào SFC.PlayerSprite.
 */
window.SFC = window.SFC || {};

(function () {
  const Sprite = (SFC.PlayerSprite = SFC.PlayerSprite || {});
  const { HEAD_A, INK, N4, discW, rectW, shade, mix } = Sprite;
  // ô của đầu A theo gốc đầu (lưới thế giới): 'K' = viền, còn lại = trong đầu
  const HEAD = {};
  for (const k of ['front', 'back']) {
    HEAD[k] = new Map();
    HEAD_A[k].rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] !== '.') HEAD[k].set((HEAD_A[k].x + i) + ',' + (HEAD_A[k].y + j), r[i]); });
  }
  // ô da mặt (từ trán xuống): viền mực của phụ kiện không đè lên đây
  const FACE = new Set([...HEAD.front].filter(([k, ch]) => +k.split(',')[1] >= -21 && ch !== 'K').map(([k]) => k));

  // 1 lớp: cells [[x, y, ký tự]] · clip 'in' = chỉ trong viền đầu, 'head' = cả viền, không có = không cắt · ink = viền mực 4 hướng (trừ lên da mặt)
  // fine = ô là px mịn (nửa ô thế giới, user 2026-11-01: vẽ chi tiết tới từng px), cắt theo ô thế giới chứa nó, không tự viền
  function paint(ctx, X, Y, op, hp, back) {
    const head = HEAD[back ? 'back' : 'front'], keep = new Map();
    if (op.fine) {
      for (const [x, y, ch] of op.cells) {
        const h = head.get(Math.floor(x / 2) + ',' + Math.floor(y / 2));
        if ((op.clip === 'in' && (!h || h === 'K')) || (op.clip === 'head' && !h)) continue;
        ctx.fillStyle = hp[ch] || ch; ctx.fillRect(X + x, Y + y, 1, 1);
      }
      return;
    }
    for (const [x, y, ch] of op.cells) {
      const k = x + ',' + y, h = head.get(k);
      if ((op.clip === 'in' && (!h || h === 'K')) || (op.clip === 'head' && !h)) continue;
      keep.set(k, [x, y, hp[ch] || ch]);
    }
    if (op.ink) for (const [x, y] of keep.values()) for (const [dx, dy] of N4) {
      const k = (x + dx) + ',' + (y + dy);
      if (keep.has(k) || (!back && FACE.has(k))) continue;
      rectW(ctx, X, Y, false, x + dx, y + dy, 1, 1, INK);
    }
    for (const [x, y, c] of keep.values()) rectW(ctx, X, Y, false, x, y, 1, 1, c);
  }
  // bản đồ ô -> cells, góc trên trái (x0, y0)
  const rows = (x0, y0, rs, cells = []) => { rs.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] !== '.') cells.push([x0 + i, y0 + j, r[i]]); }); return cells; };
  // theo bên của cầu thủ: cột i -> x = cx + s * (dx0 + i) (s = -1 lật quanh cx)
  const sided = (cx, s, dx0, y0, rs, cells = []) => { rs.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] !== '.') cells.push([cx + s * (dx0 + i), y0 + j, r[i]]); }); return cells; };
  // thêm bản lật qua trục mặt (giữa 2 mắt, x = ex - 0.5: cặp mắt vốn lệch trái nửa ô)
  const both = (c, cells) => cells.concat(cells.map(([x, y, ch]) => [2 * c.ex - 1 - x, y, ch]));
  const lum = (h) => { const n = parseInt(h.slice(1, 7), 16); return ((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11; };
  const inHead = (x, y, back) => HEAD[back ? 'back' : 'front'].has(x + ',' + y);
  // gọng kính nối ra tai ở hàng y: nhìn thẳng 2 bên, nhìn nghiêng chỉ bên sau đầu (bên kia bị mặt che). x0 / x1 = mép trái / phải của mắt kính
  function temples(c, x0, x1, y, ch, cells) {
    if (c.sd >= 0) for (let x = -6; x < x0; x++) cells.push([x, y, ch]);
    if (c.sd <= 0) for (let x = x1 + 1; x <= 6; x++) cells.push([x, y, ch]);
    return cells;
  }
  // mắt theo kiểu (ăn mừng / choáng / đổ người) cho món thay mắt: o = mở, c = nhắm (gạch giữa), h = ^ ^, u = nhìn lên
  const EYE_KIND = (k) => (k === 'stun' || k === 'closed' ? 'c' : k === 'happy' ? 'h' : k === 'up' ? 'u' : 'o');

  const ITEMS = {
    // băng cá nhân dán ngang sống mũi (kiểu anime thể thao): 2 đầu nâu sẫm, giữa gạc trắng phủ mũi (da sáng vẫn nổi); nhìn nghiêng ngắn lại
    bandaid: {
      pal: { B: '#e9ad6a', b: '#cf8d4c', P: '#fdf3e1', p: '#e6d6bd', d: '#8f5426', o: '#b8783e' },
      draw: (c) => {
        // px mịn (user: chi tiết tới từng px): băng chéo trên má, 12 cột x 4 hàng (viền nâu sẫm · thân băng có lỗ thoáng · gạc trắng giữa có chấm),
        // 2 đầu bo tròn, cứ 4 cột nâng 1 px (dốc lên về phía tai). Nhìn xuống / chéo: má phải màn hình, cắt theo mép đầu (băng vòng qua má);
        // nhìn ngang: má sau miệng (phía tai) = bản lật. Nhìn trái = bản lật của nhìn phải
        const COLS = ['.dd.', 'dBbd', 'doBd', 'dBod', 'dPpd', 'dPPd', 'dpPd', 'dPpd', 'dBod', 'doBd', 'dBbd', '.dd.'];
        const cells = [], e2 = 2 * c.ex, flip = (c.view === 'side') !== c.m;
        COLS.forEach((col, i) => { for (let j = 0; j < 4; j++) if (col[j] !== '.') {
          const x = e2 + 2 + i, y = -30 - Math.floor(i / 4) + j;
          cells.push([flip ? 2 * e2 - 1 - x : x, y, col[j]]);
        } });
        return [{ fine: true, clip: 'in', cells }];
      },
    },
    // ria hải mã màu tóc (px mịn; user 2026-11-01 chọn trong 5 kiểu: ghi đông / chevron / bút chì / hải mã / móng ngựa — miệng nhỏ nên ria nào chừa miệng
    // cũng trông lạ): khối rậm 16 px dưới mũi có viền mực, sợi sáng, che miệng, sợi rủ xuống tới cằm; há miệng thì khoang miệng lưỡi đỏ hiện dưới ria
    mustache: {
      pal: { r: '#c0304a' },
      draw: (c) => moustache(c, -31, ['..KHHHK.', '.KHLHHHH', 'KHHHLHHH', 'KHhHHhHh', 'KhH.hH.h'], -27),
    },
    // má hồng: 2 vệt hồng tròn dưới mắt (giữa đậm), pha theo màu da
    blush: {
      pal: (c) => ({ p: mix(c.skin, '#ff5a7a', 0.45), P: mix(c.skin, '#ff3d6a', 0.7) }),
      draw: (c) => [{ clip: 'in', cells: both(c, rows(c.ex - 5, -16, ['pPp', '.pp'])) }],
    },
    // tàn nhang: 3 chấm mỗi má (da sáng: nâu cam, da tối: sẫm hơn da)
    freckles: {
      pal: (c) => ({ f: lum(c.skin) > 120 ? mix(c.skin, '#7a3a18', 0.55) : shade(c.skin, 0.5) }),
      draw: (c) => [{ clip: 'in', cells: both(c, [[c.ex - 5, -16, 'f'], [c.ex - 3, -16, 'f'], [c.ex - 4, -15, 'f']]) }],
    },
    // râu quai nón màu tóc: tóc mai 2 bên xuống quai hàm, hàng dưới mắt chỉ 2 ô ngoài (chừa má: phủ kín thì trông như khăn trùm), từ hàng miệng xuống phủ kín
    // (chừa miệng, há miệng thì chừa 4 x 2), chòm râu thò dưới cằm có viền;
    // vệt tối / sáng lấm tấm cho ra sợi
    beard: {
      draw: (c) => {
        const eye = (x, y) => y >= -19 && y <= -17 && ((x >= c.EL && x <= c.EL + 2) || (x >= c.ER && x <= c.ER + 2));
        const hole = new Set([c.ex + ',-16']);
        for (let y = -15; y <= (c.mouth ? -14 : -15); y++) for (let x = c.ex - (c.mouth ? 2 : 1); x <= c.ex + (c.mouth ? 1 : 0); x++) hole.add(x + ',' + y);
        const tex = (x, y) => ((x * 7 + y * 3) % 5 === 0 ? 'h' : (x * 3 + y * 11) % 9 === 0 ? 'L' : 'H');
        const a = [];
        for (let y = -20; y <= -17; y++) for (const x of [-6, 6]) a.push([x, y, y < -19 ? 'h' : 'H']);
        for (const x of [-5, 5]) if (!eye(x, -17)) a.push([x, -17, 'H']);
        for (const x of [-5, -4, 4, 5]) a.push([x, -16, 'H']);
        for (let y = -15; y <= -14; y++) for (let x = -6; x <= 6; x++) if (!hole.has(x + ',' + y)) a.push([x, y, tex(x, y)]);
        return [{ clip: 'in', cells: a }, { ink: true, cells: rows(-5, -14, ['hH.......Hh', '.HLhHHHhLH.', '..HHhLHHH..', '...hHLHh...']) }];
      },
    },
    // kính cận gọng tròn đen: tròng kính xanh nhạt trong (không con ngươi) thay mắt, chấm sáng góc trên, gọng nối ra tai
    nerd: {
      pal: { C: '#cfe6ff' },
      draw: (c) => {
        const cells = [];
        // tròng trong, không vẽ con ngươi (user 2026-11-01: bỏ phần đen trong kính), chỉ chấm sáng góc trên
        const lens = ['WCC', 'CCC', 'CCC'];
        for (const e of [c.EL, c.ER]) { rows(e - 1, -20, ['.KKK.', 'K...K', 'K...K', 'K...K', '.KKK.'], cells); rows(e, -19, lens, cells); }
        return [{ clip: 'head', cells: temples(c, c.EL - 1, c.ER + 3, -19, 'K', cells) }];
      },
    },
    // sẹo chéo qua mắt trái của cầu thủ: vết rạch đỏ trên và dưới mắt, 2 mũi khâu ngang sẫm
    scar: {
      pal: { R: '#c8414f', k: '#7e1f2d' },
      draw: (c) => {
        const cx = c.PL + 1, s = c.s;
        return [{ clip: 'in', cells: [[cx + 2 * s, -21, 'R'], [cx, -20, 'k'], [cx + s, -20, 'R'], [cx + 2 * s, -20, 'k'],
          [cx - 2 * s, -16, 'k'], [cx - s, -16, 'R'], [cx, -16, 'k'], [cx - 2 * s, -15, 'R']] }];
      },
    },
    // kính râm: thanh trên liền, 2 tròng xanh đen có chấm sáng và ánh phản chiếu, gọng ra tai; cứ 2.6 s một vệt sáng lướt ngang 2 tròng
    shades: {
      pal: { D: '#1d2240', d: '#3d4c80' },
      draw: (c) => {
        const x0 = c.EL - 1, cells = rows(x0, -19, ['KKKKKKKKKK', 'KWDDKKWDDK', 'KDDdKKDDdK', '.KKK..KKK.']);
        const t = (c.anim % 2.6) / 0.45;
        if (t < 1) {
          const k = Math.floor(t * 12) - 1;
          for (const cl of cells) if ('DdW'.includes(cl[2]) && cl[0] - x0 === k + (cl[1] === -17 ? -1 : 0)) cl[2] = 'W';
        }
        return [{ clip: 'head', cells: temples(c, x0, x0 + 9, -19, 'K', cells) }];
      },
    },
    // khẩu trang trắng: phủ từ dưới mắt tới cằm (trong viền đầu), nếp gấp ngang giữa, gờ mũi sáng, quai đeo vòng lên tai;
    // nhìn nghiêng thấy má bên kia, quai bên sau đầu · sau lưng: quai ở 2 mép đầu
    mask: {
      pal: { W: '#eef1f6', w: '#c3c9d6', V: '#ffffff', g: '#aab1bf' },
      draw: (c) => {
        const cells = [], lo = Math.max(-6, c.ex - 6), hi = Math.min(6, c.ex + 6);
        for (let y = -16; y <= -14; y++) for (let x = lo; x <= hi; x++) cells.push([x, y, y === -15 ? 'w' : y === -16 && x === c.ex ? 'V' : 'W']);
        if (c.sd >= 0) cells.push([Math.min(-5, lo - 1), -17, 'g'], [-6, -18, 'g']);
        if (c.sd <= 0) cells.push([Math.max(5, hi + 1), -17, 'g'], [6, -18, 'g']);
        return [{ clip: 'in', cells }];
      },
      back: () => [{ clip: 'head', cells: [[-7, -17, 'g'], [-7, -16, 'g'], [7, -17, 'g'], [7, -16, 'g']] }],
    },
    // mũi hề: quả cầu đỏ chấm sáng, đáy sẫm, che miệng thường -> miệng dời xuống 1 hàng dưới quả mũi (ăn mừng: há miệng lưỡi đỏ)
    clown: {
      pal: (c) => ({ R: '#ff2f3f', r: '#b8162a', V: '#ffe3e6', v: '#ff8a96', M: c.M, t: '#c0304a' }),
      draw: (c) => {
        // px mịn (user: chi tiết tới từng px): quả cầu 8 x 7 px giữa trục mặt, viền mực, chấm sáng trên trái + vệt sáng, mặt dưới phải sẫm;
        // 2 hàng trên hẹp lọt giữa 2 mắt. Miệng cười chữ U rộng ôm dưới quả mũi (há miệng: khoang miệng lưỡi đỏ)
        const e2 = 2 * c.ex, cells = rows(e2 - 4, -34, ['..KKKK..', '.KvVRRK.', 'KRVVRRrK', 'KRvRRRrK', 'KRRRRrrK', '.KrrrrK.', '..KKKK..']);
        rows(e2 - 5, -29, c.mouth ? ['M........M', '.MKKKKKKM.', '..KttttK..', '...KKKK...'] : ['M........M', '.M......M.', '..MMMMMM..'], cells);
        return [{ fine: true, clip: 'in', cells }];
      },
    },
    // răng vàng: nụ cười nhe 1 hàng răng (1 chiếc vàng), cứ 1.8 s chiếc vàng loé sáng thành ngôi sao 4 cánh (to ra rồi nhỏ lại)
    goldtooth: {
      pal: { T: '#f5f0e6', G: '#ffd23f', V: '#fffbe0', r: '#c0304a', Y: '#fff3a8' },
      draw: (c) => {
        const e = c.ex, t = c.anim % 1.8, fl = t < 0.3, cells = rows(e - 3, -15, [fl ? 'KTTVTK' : 'KTTGTK']);
        if (c.mouth) rows(e - 3, -14, ['KrrrrK'], cells); else rows(e - 2, -14, ['KKKK'], cells);
        const ops = [{ clip: 'in', cells }];
        if (fl) {   // sao loé: tâm trắng ở chiếc răng vàng, cánh dài 2 ô ở giữa lần loé
          const n = t > 0.08 && t < 0.22 ? 2 : 1, sp = [[e, -15, 'W']];
          for (let i = 1; i <= n; i++) sp.push([e - i, -15, 'Y'], [e + i, -15, 'Y'], [e, -15 - i, 'Y'], [e, -15 + i, 'Y']);
          ops.push({ cells: sp });
        }
        return ops;
      },
    },
    // sơn chiến: mỗi má 1 vạch đỏ + 1 vạch trắng ngắn dưới
    warpaint: {
      pal: { R: '#e8243c', W: '#f3ead7' },
      draw: (c) => [{ clip: 'in', cells: both(c, rows(c.ex - 5, -16, ['RRR', '.WW'])) }],
    },
    // bịt mắt cướp biển: miếng da đen bo góc (chấm bóng) che mắt phải của cầu thủ, dây chéo qua trán lên đỉnh đầu bên kia, dây ngang ra tai;
    // sau lưng: dây chéo qua gáy từ tai phải lên đỉnh đầu bên trái
    eyepatch: {
      pal: { g: '#3d3548' },
      draw: (c) => {
        const cx = c.PR + 1, s = c.s, cells = sided(cx, s, -2, -20, ['.KKK.', 'KgKKK', 'KKKKK', 'KKKKK', '.KKK.']);
        for (let k = 1; k <= 9; k++) { const x = cx + s * (2 + k), y = -21 - Math.floor((k - 1) / 2); if (!inHead(x, y, false)) break; cells.push([x, y, 'K']); }
        for (let x = cx - 3 * s; inHead(x, -18, false); x -= s) cells.push([x, -18, 'K']);
        return [{ clip: 'head', cells }];
      },
      back: () => {
        const cells = [];
        for (let x = 6; x >= -5; x--) cells.push([x, Math.round(-18 - ((6 - x) * 5) / 11), 'K']);
        return [{ clip: 'in', cells }];
      },
    },
    // kính một mắt: vòng vàng (chấm sáng trên, đáy sẫm) quanh mắt trái của cầu thủ, dây xích vàng rủ xuống ngực; mày bên kia nhướng lên
    monocle: {
      pal: { G: '#ffd23f', g: '#c9a020', V: '#fff3a8' },
      draw: (c) => {
        const cx = c.PL + 1, s = c.s, ring = rows(cx - 2, -20, ['.GVG.', 'G...G', 'G...G', 'G...G', '.GgG.']);
        const b = c.PR + 1;
        ring.push([b - s, -20, 'H'], [b, -21, 'H'], [b + s, -21, 'H']);
        const chain = [[cx + 3 * s, -16], [cx + 3 * s, -15], [cx + 3 * s, -14], [cx + 3 * s, -13], [cx + 2 * s, -12], [cx + 2 * s, -11], [cx + s, -10]].map(([x, y], i) => [x, y, i % 2 ? 'g' : 'G']);
        return [{ clip: 'in', cells: ring }, { cells: chain }];
      },
    },
    // khăn ninja: dải trán (sọc đỏ trên, khăn tối dưới) đè lên hàng băng đô, khăn che từ mũi xuống cằm (nếp sáng), chừa khe mắt; nút buộc sau đầu với 2 dải đỏ bay phấp phới
    // (nhìn thẳng: ló ra bên phải đầu · nhìn nghiêng: bay ra sau gáy · sau lưng: nút giữa gáy, 2 dải rủ xuống)
    ninja: {
      pal: { N: '#262a36', n: '#3d4458', R: '#d7263d', r: '#8f1424' },
      draw: (c) => {
        const cells = [];
        for (let x = -6; x <= 6; x++) { cells.push([x, -22, 'R'], [x, -21, 'N']); for (let y = -16; y <= -14; y++) cells.push([x, y, (x - c.ex + y) % 4 === 0 && y > -16 ? 'n' : 'N']); }
        const dir = c.sd ? -c.sd : 1;
        return [{ clip: 'in', cells }].concat(ninjaTails(c, dir * 8, -22, dir));
      },
      back: (c) => {
        const cells = [];
        for (let x = -6; x <= 6; x++) cells.push([x, -22, 'R'], [x, -21, 'N']);
        return [{ clip: 'in', cells }].concat(ninjaTails(c, 0, -20, 0), [{ ink: true, cells: [[-1, -22, 'r'], [0, -22, 'r'], [-1, -21, 'r'], [0, -21, 'r']] }]);
      },
    },
    // mắt cyborg: tấm kim loại (mép sáng / sẫm, 2 đinh tán, đèn LED nhấp nháy) phủ quanh mắt trái của cầu thủ ra tới mép đầu,
    // mắt thành ống kính đỏ tâm trắng có quầng đỏ cộng sáng phập phồng
    cyborg: {
      pal: { M: '#6f7890', m: '#3a3f52', V: '#aeb8cc', b: '#1e2130', R: '#ff3d3d', r: '#a3141f', w: '#ffe9e9' },
      draw: (c) => {
        const cx = c.PL + 1, s = c.s, led = Math.floor(c.anim * 3) % 2 ? '#5dff7a' : '#1f6b2d';
        const cells = sided(cx, s, -2, -21, ['mVVVVVm.', 'VMMMMMMm', 'V...MbMm', 'V...MMMm', 'V...MMLm', 'mMbMMMm.']);
        for (const cl of cells) if (cl[2] === 'L') cl[2] = led;
        rows(cx - 1, -19, EYE_KIND(c.eyes) === 'c' ? ['rrr', 'RwR', 'rrr'] : ['rRr', 'RwR', 'rRr'], cells);
        return [{ clip: 'in', cells }];
      },
      fx: (ctx, X, Y, c) => {
        if (c.back) return;
        ctx.globalCompositeOperation = 'lighter'; discW(ctx, X, Y, c.PL + 1, -18, 2, `rgba(255,40,40,${(0.14 + 0.1 * Math.sin(c.anim * 6)).toFixed(3)})`); ctx.globalCompositeOperation = 'source-over';
      },
    },
    // kính neon: gọng tối ôm ngang mắt, kính xanh neon 3 sắc (sáng trên, tối dưới), vệt quét trắng chạy ngang liên tục, quầng xanh cộng sáng;
    // nhìn nghiêng kính lệch về phía mặt, dây ra sau đầu · sau lưng: dây ngang gáy, đèn xanh giữa nhấp nháy
    visor: {
      pal: { F: '#1b1f2e', c: '#c8fdff', C: '#3ff6ff', D: '#14a3c7' },
      draw: (c) => {
        const g0 = Math.max(-6, c.ex - 6), g1 = Math.min(6, c.ex + 6), cells = [];
        const sweep = g0 + Math.floor((c.anim * 14) % (g1 - g0 + 9)) - 4;
        for (let x = g0; x <= g1; x++) {
          cells.push([x, -20, 'F'], [x, -16, x === c.ex ? '.' : 'F']);
          ['c', 'C', 'D'].forEach((ch, j) => cells.push([x, -19 + j, x === sweep ? 'W' : x === sweep - 1 ? 'c' : ch]));
        }
        for (let y = -19; y <= -17; y++) cells.push([g0 - 1, y, 'F'], [g1 + 1, y, 'F']);
        for (let x = -7; x < g0 - 1; x++) cells.push([x, -18, 'F']);
        for (let x = g1 + 2; x <= 7; x++) cells.push([x, -18, 'F']);
        return [{ clip: 'head', cells: cells.filter((cl) => cl[2] !== '.') }];
      },
      fx: (ctx, X, Y, c) => {
        if (c.back) return;
        const g0 = Math.max(-6, c.ex - 6), g1 = Math.min(6, c.ex + 6);
        ctx.globalCompositeOperation = 'lighter';
        const a = `rgba(63,246,255,${(0.16 + 0.06 * Math.sin(c.anim * 9)).toFixed(3)})`;
        rectW(ctx, X, Y, false, g0, -21, g1 - g0 + 1, 1, a); rectW(ctx, X, Y, false, g0, -15, g1 - g0 + 1, 1, a);
        ctx.globalCompositeOperation = 'source-over';
      },
      back: (c) => {
        const cells = [];
        for (let x = -6; x <= 6; x++) cells.push([x, -18, x === -1 || x === 0 ? (Math.floor(c.anim * 4) % 2 ? 'C' : 'D') : 'F']);
        return [{ clip: 'in', cells }];
      },
    },
    // mặt nạ đầu lâu: xương trắng phủ cả mặt trong viền đầu (bên xa tối), hốc mắt đen to hơn mắt có đồng tử đỏ rực phập phồng, mũi 2 lỗ,
    // hàm răng (gạch răng trên / dưới quanh đường miệng; ăn mừng: há 2 hàng), vết nứt trên hốc mắt · sau lưng: quai đen có khoá
    skull: {
      pal: { B: '#eceff6', b: '#b3bacb', R: '#ff3b3b', G: '#9aa2b4' },
      draw: (c) => {
        const e = c.ex, m = new Map(), set = (x, y, ch) => m.set(x + ',' + y, [x, y, ch]);
        for (let y = -21; y <= -14; y++) for (let x = -6; x <= 6; x++) set(x, y, (c.sd > 0 && x <= -5) || (c.sd < 0 && x >= 5) || (!c.sd && Math.abs(x) === 6) || y === -14 ? 'b' : 'B');
        const k = EYE_KIND(c.eyes);
        for (const [x, y, ch] of both(c, rows(e - 5, -20, ['bbbb', 'KKKK', k === 'o' ? 'KKRK' : 'KKKK', '.KK.']))) set(x, y, ch);
        for (const [x, y] of [[e - 1, -17], [e, -17], [e - 2, -16], [e + 1, -16], [e - 2, -14], [e + 1, -14], [e + 3, -21], [e + 2, -20]]) set(x, y, 'K');
        for (let x = e - 3; x <= e + 2; x++) { set(x, -15, 'K'); if (c.mouth) set(x, -14, 'K'); }
        return [{ clip: 'in', cells: [...m.values()] }];
      },
      fx: (ctx, X, Y, c) => {
        if (c.back || EYE_KIND(c.eyes) !== 'o') return;
        const a = `rgba(255,60,60,${(0.3 + 0.18 * Math.sin(c.anim * 7)).toFixed(3)})`;
        ctx.globalCompositeOperation = 'lighter';
        for (const x of [c.ex - 3, c.ex + 2]) discW(ctx, X, Y, x, -18, 1, a);
        ctx.globalCompositeOperation = 'source-over';
      },
      back: () => [{ clip: 'in', cells: rows(-6, -18, ['KKKKKGGKKKKKK']) }],
    },
    // mắt laser: 2 mắt đỏ rực tâm trắng (theo kiểu mắt), quầng đỏ cộng sáng; tia laser bắn theo hướng mặt (lõi hồng trắng, viền đỏ, tia rung độ dài,
    // chớp nổ ở đầu tia) · nhìn thẳng: tia bắn vào máy quay = vệt loé ngang qua 2 mắt · sau lưng: tia ló lên trên đỉnh đầu
    lasereyes: {
      pal: { R: '#ff2a2a', r: '#b3121f', w: '#ffffff' },
      draw: (c) => {
        const k = EYE_KIND(c.eyes), cells = [];
        const eye = k === 'c' ? ['...', 'RRR', '...'] : k === 'h' ? ['.R.', 'R.R', '...'] : k === 'u' ? ['rRr', 'RwR', '...'] : ['rRr', 'RwR', 'rRr'];
        for (const e of [c.EL, c.ER]) rows(e, -19, eye, cells);
        return [{ clip: 'in', cells }];
      },
      fx: (ctx, X, Y, c) => {
        if (EYE_KIND(c.eyes) === 'c') return;
        const fl = Math.sin(c.anim * 20), hot = (a) => `rgba(255,40,40,${a.toFixed(3)})`;
        ctx.globalCompositeOperation = 'lighter';
        const eyes = c.back ? [-3, 2] : [c.EL + 1, c.ER + 1];
        if (!c.back) for (const x of eyes) discW(ctx, X, Y, x, -18, 2, hot(0.3));
        if (!c.back && Math.abs(c.fx) < 0.3) {
          // nhìn thẳng (tia bắn vào máy quay): vệt loé ngang mảnh qua 2 mắt, kéo ra ngoài đầu, mờ dần, dài ra / ngắn lại theo nhịp rung
          const n = 11 + Math.round(fl * 2);
          for (let i = 0; i <= n; i++) { const a = 0.55 * (1 - i / (n + 1)); rectW(ctx, X, Y, false, eyes[0] - 2 - i, -18, 1, 1, hot(a)); rectW(ctx, X, Y, false, eyes[1] + 2 + i, -18, 1, 1, hot(a)); }
        } else {
          // tia: dọc hướng mặt (dọc màn hình ép 0.6 như sprite cũ), bỏ đoạn nằm sau đầu khi quay lưng
          const len = (c.back ? 30 : 16) + Math.round(fl * 2), dx = c.fx, dy = c.fy * 0.6;
          for (const x0 of eyes) {
            let lx = x0, ly = -18;
            for (let i = 2; i <= len; i++) {
              const x = Math.round(x0 + dx * i), y = Math.round(-18 + dy * i);
              if (c.back && inHead(x, y, true)) continue;
              const a = 1 - (i / len) * 0.6;
              rectW(ctx, X, Y, false, x, y, 1, 1, `rgba(255,215,215,${a.toFixed(3)})`);
              if (Math.abs(dx) >= Math.abs(dy)) { rectW(ctx, X, Y, false, x, y - 1, 1, 1, hot(0.5 * a)); rectW(ctx, X, Y, false, x, y + 1, 1, 1, hot(0.5 * a)); }
              else { rectW(ctx, X, Y, false, x - 1, y, 1, 1, hot(0.5 * a)); rectW(ctx, X, Y, false, x + 1, y, 1, 1, hot(0.5 * a)); }
              lx = x; ly = y;
            }
            // chớp nổ đầu tia
            for (const [ex, ey] of N4) rectW(ctx, X, Y, false, lx + ex * (fl > 0 ? 2 : 1), ly + ey * (fl > 0 ? 2 : 1), 1, 1, hot(0.6));
          }
        }
        ctx.globalCompositeOperation = 'source-over';
      },
    },
  };
  // ria (px mịn): half = nửa trái từ ngoài vào trục mặt, lật sang phải; y0 = hàng trên cùng. Ria che miệng, há miệng thì vẽ khoang miệng 4 x 2 ở openY
  function moustache(c, y0, half, openY) {
    const e2 = 2 * c.ex, w = half[0].length, cells = [];
    half.forEach((r, j) => { for (let i = 0; i < w; i++) if (r[i] !== '.') cells.push([e2 - w + i, y0 + j, r[i]], [e2 + w - 1 - i, y0 + j, r[i]]); });
    if (c.mouth) rows(e2 - 2, openY, ['KrrK', 'KKKK'], cells);
    return [{ fine: true, clip: 'in', cells }];
  }
  // 2 dải khăn ninja từ nút (bx, by): mỗi dải 1 lớp có viền riêng (vẽ sau đè viền lên dải trước -> 2 dải tách nhau), uốn sóng theo anim, đầu dải sẫm.
  // dir = hướng bay ra (nhìn nghiêng: ra sau gáy, dải dưới rủ dần) · dir 0 = rủ xuống gáy, 2 dải xoè dần sang 2 bên
  function ninjaTails(c, bx, by, dir) {
    const ops = [];
    for (let t = 0; t < 2; t++) {
      const cells = [];
      for (let i = 0; i < 5; i++) {
        const w = Math.round(Math.sin(c.anim * 9 - i * 0.9 + t * 1.7) * 0.7);
        const x = dir ? bx + dir * i : bx + (t ? 1 : -2) + (t ? 1 : -1) * Math.floor(i / 2) + w, y = dir ? by + t * 2 + w + Math.floor(i * (t ? 0.6 : 0.25)) : by + i;
        cells.push([x, y, i === 4 ? 'r' : 'R']);
      }
      ops.push({ ink: true, cells });
    }
    return ops;
  }

  // o: { back, fx, fy (hướng mặt), anim, eyes (kiểu mắt như face()), mouth (há miệng), pal (bảng màu người), hair, skin }
  function drawFace(ctx, X, Y, id, o) {
    const it = ITEMS[id];
    if (!it) return;
    const fx = o.fx, back = !!o.back, m = fx < 0, ex = Math.max(-1, Math.round(fx * 2));
    const sd = Math.abs(fx) > 0.5 ? Math.sign(fx) : 0, diag = !back && o.fy > 0.38 && o.fy < 0.92;
    const EL = -4 + ex, ER = 1 + ex;
    // mắt phải của cầu thủ = mắt bên trái màn hình khi nhìn xuống / sang phải; nhìn trái là bản lật (như mọi động tác) -> mắt bên phải màn hình
    const c = { back, fx, fy: o.fy, ex, sd, m, s: m ? -1 : 1, view: back ? 'back' : sd ? (diag ? 'diag' : 'side') : 'front', anim: o.anim || 0,
      eyes: o.eyes || null, mouth: !!o.mouth, EL, ER, PR: m ? ER : EL, PL: m ? EL : ER, skin: o.skin || o.pal.S, M: o.pal.M };
    const ops = back ? (it.back ? it.back(c) : []) : it.draw(c);
    const hp = Object.assign({ K: INK, W: '#ffffff', H: o.hair, h: shade(o.hair, 0.3), L: shade(o.hair, -0.35), S: o.pal.S, s: o.pal.s },
      typeof it.pal === 'function' ? it.pal(c) : it.pal || {});
    for (const op of ops) paint(ctx, X, Y, op, hp, back);
    if (it.fx) it.fx(ctx, X, Y, c);
  }

  Object.assign(Sprite, { FACE_ITEMS: ITEMS, drawFace });
})();
