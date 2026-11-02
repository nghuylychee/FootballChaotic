/* Art NPC · npcs.js — người và thú dùng lại được, vẽ ở lưới px game. Gắn vào SFC.Art.Npc.
 * Người: Npc.person(ctx, x, y, spec, opts). (x, y) = điểm trên mặt đất giữa 2 chân. Người lớn cao 24 px như cầu thủ, trẻ con 18, người già 22.
 *   spec: { age: 'adult'|'teen'|'kid'|'elder', skin, hair, hairStyle: 'short'|'bun'|'long'|'bowl'|'elder'|'buzz', top, topStyle: 'tee'|'shirt'|'aobaba'|'tank'|'stripe'|'floral',
 *           accent, bottom, bottomStyle: 'pants'|'rolled'|'shorts'|'skirt', shoe, hat: null|'non'|'cap'|'scarf', beard, glasses }
 *   opts:  { face: 'front'|'back'|'right'|'left', pose, t, item, seat }
 *     pose trước / sau: stand · walk · cheer · wave · hips · cross · hold · rest (khuỷu tay tì rào) · clap · point · sit (seat = màu ghế nhựa) · squat
 *     pose nghiêng:     stand · walk · hold · rake · pole (gánh) · sit · ride (đạp xe) · squat · bend (cúi cấy / nhổ cỏ)
 *     item: fan · cup · phone · cane · rake · pole · bucket · basket
 * Thú: hen · rooster · chick · duck · buffalo · dog · egret · bird. Npc.<thú>(ctx, x, y, opts) với opts { face: 'right'|'left', pose, t, color }.
 * Mỗi bộ phận vẽ riêng theo pose + t -> thêm khung chuyển động = thêm nhánh pose, không vẽ lại cả hình.
 */
window.SFC = window.SFC || {};

(function () {
  const Art = (SFC.Art = SFC.Art || {});
  const K = Art.Kit, { px, dot, R } = K;
  const N = (Art.Npc = {});

  // khung 1 nhịp: chu kỳ n khung, fps khung / giây
  const frame = (t, n, fps = 6) => Math.floor((t || 0) * fps) % n;

  const DIM = {
    adult: { head: 9, body: 8, leg: 7, bw: 8 },
    teen: { head: 9, body: 7, leg: 6, bw: 8 },
    elder: { head: 9, body: 7, leg: 6, bw: 8 },
    kid: { head: 9, body: 5, leg: 4, bw: 6 },
  };

  /* ---------- đầu: lưới 10 ô, hàng 0 = đỉnh đầu ---------- */
  const HEAD = {
    front: ['..oooooo..', '.oSSSSSSo.', 'oSlSSSSSSo', 'oSSSSSSSso', 'oSSSSSSSso', 'oSSSSSSSso', 'oSSSSSSSso', '.oSSSSSso.', '..oooooo..'],
    side: ['..ooooo...', '.oSSSSSo..', 'oSlSSSSSo.', 'oSSSSSSSSo', 'oSSSSSSSSo', 'oSSSSSSSSSo', 'oSSSSSSSSo', '.osSSSSSo.', '..oooooo..'],
  };
  // tóc: top = hàng bắt đầu so với đỉnh đầu. O viền · H tóc · h tối · L sáng
  const HAIR = {
    short: {
      front: { top: -1, rows: ['..OOOOOO..', '.OLLHHHHO.', 'OLHHHHHHhO', 'OHHHHHHHhO', 'OHhH.HhhhO', 'Oh......hO', 'O........O'] },
      back: { top: -1, rows: ['..OOOOOO..', '.OLLHHHHO.', 'OLHHHHHHhO', 'OHHHHHHHhO', 'OHHHHHHHhO', 'OHHHHHHHhO', 'OhHHHHHhhO', 'OhhhhhhhhO', '.O......O.'] },
      side: { top: -1, rows: ['..OOOOO...', '.OLLHHHO..', 'OLHHHHHHO.', 'OHHHHHHHHO', 'OHHHhhH.O.', 'OHHh......', 'OHh.......', 'Oh........'] },
    },
    buzz: {
      front: { top: 0, rows: ['..OOOOOO..', '.OLhhhhhO.', 'OhhhhhhhhO', 'Oh......hO'] },
      back: { top: 0, rows: ['..OOOOOO..', '.OLhhhhhO.', 'OhhhhhhhhO', 'OhhhhhhhhO', 'OhhhhhhhhO', 'OhhhhhhhhO', '.O......O.'] },
      side: { top: 0, rows: ['..OOOOO...', '.OLhhhhO..', 'Ohhhhhh.O.', 'Ohhh......', 'Ohh.......'] },
    },
    bowl: {
      front: { top: -1, rows: ['..OOOOOO..', '.OLLLHHHO.', 'OLLHHHHHhO', 'OHHHHHHHhO', 'OHHHHHHHhO', 'Oh......hO'] },
      back: { top: -1, rows: ['..OOOOOO..', '.OLLLHHHO.', 'OLLHHHHHhO', 'OHHHHHHHhO', 'OHHHHHHHhO', 'OHHHHHHHhO', 'OhHHHHHhhO', 'OhhhhhhhhO', '.O......O.'] },
      side: { top: -1, rows: ['..OOOOO...', '.OLLLHHO..', 'OLHHHHHHO.', 'OHHHHHHHHO', 'OHHHHHHH.O', 'OHHh......', 'OHh.......', 'Oh........'] },
    },
    bun: {
      front: { top: -3, rows: ['...OOOO...', '..OLHHhO..', '..OOOOOO..', '.OLLHHHHO.', 'OLHHHHHHhO', 'OHHHHHHHhO', 'OHH....HhO', 'OH......hO', 'OH......hO', 'Oh......hO'] },
      back: { top: -3, rows: ['...OOOO...', '..OLHHhO..', '..OOOOOO..', '.OLLHHHHO.', 'OLHHHHHHhO', 'OHHHHHHHhO', 'OHHHHHHHhO', 'OHHHHHHHhO', 'OHHHHHHHhO', 'OhHHHHHhhO', '.OhhhhhhO.'] },
      side: { top: -2, rows: ['OOO.......', 'OLhOOOO...', 'OhOLLHHHO.', '.OLHHHHHHO', 'OHHHHHHHHO', 'OHHHHhh.O.', 'OHHH......', 'OHHh......', 'OHh.......', '.O........'] },
    },
    long: {
      front: { top: -1, rows: ['..OOOOOO..', '.OLLHHHHO.', 'OLHHHHHHhO', 'OHHHHHHHhO', 'OHHHHhHhhO', 'OH......hO', 'OH......hO', 'OH......hO', 'OH......hO', 'Oh......hO', 'Oh......hO', '.O......O.'] },
      back: { top: -1, rows: ['..OOOOOO..', '.OLLHHHHO.', 'OLHHHHHHhO', 'OHHHHHHHhO', 'OHHHHHHHhO', 'OHHHHHHHhO', 'OHHHHHHHhO', 'OHHHHHHHhO', 'OHHHHHHHhO', 'OHHHHHHHhO', 'OhHHHHHhhO', '.OhhhhhhO.'] },
      side: { top: -1, rows: ['..OOOOO...', '.OLLHHHO..', 'OLHHHHHHO.', 'OHHHHHHHHO', 'OHHHHHhh.O', 'OHHHH.....', 'OHHHH.....', 'OHHHh.....', 'OHHhh.....', 'OHhh......', 'OhhO......', '.OO.......'] },
    },
    elder: {
      front: { top: 3, rows: ['OH......HO', 'OH......hO', 'Oh......hO'] },
      back: { top: 2, rows: ['.O......O.', 'OHHHHHHHhO', 'OHHHHHHHhO', 'OhHHHHHhhO', '.OhhhhhhO.'] },
      side: { top: 3, rows: ['OHHH......', 'OHHh......', 'OHh.......'] },
    },
  };
  // nón lá 16 x 9: đáy vành ở hàng 8. r = vòng nan
  const NON = ['.......OO.......', '......OLHO......', '.....OLLHHO.....', '....OLrLHrhO....', '...OLLHHHHhhO...', '..OLrLHrHHrhhO..', '.OLHHHHHHHHHhhO.', 'OhrhhrhhrhhrhhhO', '.OOOOOOOOOOOOOO.'];

  /* ---------- màu người ---------- */
  function colors(s) {
    return {
      S: R(s.skin || '#d9a273'), H: R(s.hair || '#2e2420'), T: R(s.top || '#e6e0cc'), B: R(s.bottom || '#3e4a5e'),
      F: R(s.shoe || '#4a3a30'), A: s.accent || null, hat: R(s.hatColor || '#e8d7a4'),
    };
  }
  const EYE = '#33241f';

  // tay: khối rộng w cao h, sleeve hàng tay áo (từ vai); up = tay giơ lên (tay áo ở dưới, bàn tay ở trên)
  function arm(c, x, y, w, h, sleeve, P, up = false) {
    const fullSleeve = sleeve >= h;
    px(c, x - 1, y - 1, w + 2, h + 2, fullSleeve ? P.T.o : P.S.o);
    for (let j = 0; j < h; j++) {
      const k = up ? h - 1 - j : j, inSleeve = k < sleeve && !(k === h - 1);
      const Rr = inSleeve ? P.T : P.S;
      px(c, x, y + j, w, 1, Rr.m);
      if (w > 1) dot(c, x + w - 1, y + j, Rr.d);
    }
    if (sleeve > 0 && sleeve < h) px(c, x - 1, up ? y + h - sleeve - 1 : y + sleeve, w + 2, 1, P.T.o);
  }
  // tay áo theo kiểu áo (số hàng)
  const sleeveOf = (s, h) => ({ tank: 0, tee: 2, stripe: 2, floral: 2, shirt: h, aobaba: h }[s.topStyle || 'tee'] ?? 2);

  // thân áo + chi tiết theo kiểu
  function torso(c, x, y, w, h, s, P, back, seed) {
    K.block(c, x, y, w, h, P.T, { round: 1 });
    const st = s.topStyle || 'tee';
    if (st === 'stripe' && s.accent) for (let j = 1; j < h - 1; j += 2) px(c, x, y + j, w, 1, K.mix(s.accent, P.T.m, 0.2));
    if (st === 'floral' && s.accent) {
      const r = K.rng(seed);
      for (let i = 0; i < Math.round(w * h / 5); i++) dot(c, x + Math.floor(r() * w), y + 1 + Math.floor(r() * (h - 1)), s.accent);
    }
    if (st === 'tank') { px(c, x, y, 2, 2, P.S.m); px(c, x + w - 2, y, 2, 2, P.S.d); }
    // nếp bên phải + bóng hông
    px(c, x + w - 2, y + 2, 1, h - 3, P.T.d);
    if (back) { px(c, x + 1, y + 1, w - 3, 1, P.T.l); return; }
    const cx = x + w / 2;
    if (st === 'tee' || st === 'stripe' || st === 'floral') { px(c, cx - 1, y, 2, 1, P.S.d); }
    if (st === 'tank') { px(c, cx - 2, y, 4, 1, P.S.m); px(c, cx - 1, y + 1, 2, 1, P.S.d); }
    if (st === 'shirt') {
      px(c, cx - 1, y, 2, 1, P.S.d); dot(c, cx - 2, y, P.T.h); dot(c, cx + 1, y, P.T.h);
      for (let j = 2; j < h - 1; j += 2) dot(c, cx - 1, y + j, P.T.d);
      dot(c, x + 1, y + 2, P.T.d); dot(c, x + 2, y + 2, P.T.d);   // túi ngực
    }
    if (st === 'aobaba') {
      px(c, cx - 1, y, 2, 1, P.S.d);
      px(c, cx, y + 1, 1, h - 1, P.T.d);
      for (let j = 2; j < h; j += 2) dot(c, cx - 1, y + j, P.T.h);
      px(c, x + 1, y + h - 2, 2, 1, P.T.d); px(c, x + w - 3, y + h - 2, 2, 1, P.T.d);   // 2 túi dưới
    }
  }

  // chân trước / sau: 2 ống, quần theo kiểu
  function legsFront(c, x, legTop, feetY, bw, s, P, pose, t) {
    const lw = Math.max(2, bw / 2 - 1), L = x - bw / 2, Rx = x + bw / 2 - lw, st = s.bottomStyle || 'pants';
    const walk = pose === 'walk' ? frame(t, 2, 4) : -1;
    const legs = [[L, walk === 0 ? 1 : 0], [Rx, walk === 1 ? 1 : 0]];
    for (const [lx, lift] of legs) {
      const bot = feetY - lift, h = bot - legTop;
      const pantRows = st === 'pants' ? h : st === 'rolled' ? Math.max(1, h - 2) : st === 'shorts' ? Math.min(h, 2) : st === 'skirt' ? Math.min(h, 2) : h;
      px(c, lx - 1, legTop - 1, lw + 2, h + 2, P.B.o);
      px(c, lx, legTop, lw, pantRows, P.B.m); dot(c, lx + lw - 1, legTop, P.B.d); px(c, lx + lw - 1, legTop + 1, 1, pantRows - 1, P.B.d);
      if (pantRows < h) { px(c, lx, legTop + pantRows, lw, h - pantRows, P.S.m); px(c, lx + lw - 1, legTop + pantRows, 1, h - pantRows, P.S.d); }
      // dép: đế + quai
      px(c, lx - 1, bot, lw + 2, 1, P.F.o); px(c, lx, bot, lw, 1, P.S.d); dot(c, lx + (lx < x ? 0 : lw - 1), bot, P.F.m);
    }
    // hông
    if (st === 'skirt') { px(c, L - 2, legTop - 1, bw + 4, 4, P.B.o); px(c, L - 1, legTop - 1, bw + 2, 3, P.B.m); px(c, L - 1, legTop + 1, bw + 2, 1, P.B.d); }
    else { px(c, L - 1, legTop - 1, bw + 2, 3, P.B.o); px(c, L, legTop - 1, bw, 2, P.B.m); px(c, L, legTop, bw, 1, P.B.d); dot(c, x - 1, legTop, P.B.o); }
  }

  // ghế nhựa (đỏ / xanh) — người ngồi tự vẽ ghế theo hướng nhìn
  N.stool = function (c, x, y, col = '#c8473c', face = 'front') {
    const Rr = R(col);
    K.shadow(c, x, y, 5, 1);
    // chân loe, mặt trước khoét vòm
    px(c, x - 5, y - 6, 10, 6, Rr.o);
    px(c, x - 4, y - 6, 8, 5, Rr.m);
    px(c, x - 4, y - 6, 8, 1, Rr.d);
    px(c, x + 3, y - 5, 1, 4, Rr.d);
    px(c, x - 2, y - 4, 4, 4, Rr.o); px(c, x - 1, y - 5, 2, 1, Rr.o);
    // mặt ghế nhìn từ trên: sáng nhất
    px(c, x - 6, y - 9, 12, 4, Rr.o);
    px(c, x - 5, y - 8, 10, 2, Rr.l); px(c, x - 4, y - 8, 4, 1, Rr.h);
    if (face !== 'back') dot(c, x, y - 8, Rr.m);
  };

  function headFront(c, x, hy, s, P, back, pose, t) {
    K.art(c, x - 5, hy, HEAD.front, { o: P.S.o, S: P.S.m, s: P.S.d, l: P.S.l });
    const st = HAIR[s.hairStyle || 'short'] || HAIR.short, tp = back ? st.back : st.front;
    const map = { O: P.H.o, H: P.H.m, h: P.H.d, L: P.H.l };
    if (!back) {
      // mắt, má, miệng
      const blink = s.blink !== false && frame(t + (s.seed || 0) * 0.37, 23, 6) === 0;
      if (blink) { px(c, x - 3, hy + 5, 1, 1, EYE); px(c, x + 2, hy + 5, 1, 1, EYE); }
      else { px(c, x - 3, hy + 4, 1, 2, EYE); px(c, x + 2, hy + 4, 1, 2, EYE); }
      const blush = K.mix(P.S.m, '#e0705a', 0.3);
      dot(c, x - 4, hy + 6, blush); dot(c, x + 3, hy + 6, blush);
      const open = pose === 'cheer' || pose === 'wave' || pose === 'point';
      if (open) { px(c, x - 1, hy + 6, 2, 2, '#7a3434'); dot(c, x - 1, hy + 7, '#c86a5a'); }
      else px(c, x - 1, hy + 7, 2, 1, P.S.o);
      if (s.beard) { px(c, x - 2, hy + 7, 4, 1, s.beard); px(c, x - 1, hy + 8, 2, 2, s.beard); }
      if (s.glasses) { px(c, x - 4, hy + 4, 3, 1, s.glasses); px(c, x + 1, hy + 4, 3, 1, s.glasses); dot(c, x - 1, hy + 4, s.glasses); }
    }
    K.art(c, x - 5, hy + tp.top, tp.rows, map);
    if (!back && s.age === 'elder' && s.hairStyle === 'elder') { px(c, x - 4, hy + 3, 2, 1, P.H.m); px(c, x + 2, hy + 3, 2, 1, P.H.m); }
    hat(c, x, hy, s, P, back ? 'back' : 'front');
  }

  function hat(c, x, hy, s, P, face) {
    if (!s.hat) return;
    if (s.hat === 'non') {
      // bóng vành nón trên trán
      if (face === 'front') px(c, x - 4, hy + 2, 8, 1, K.rgba(P.S.o, 0.5));
      K.art(c, x - 8, hy - 6, NON, { O: P.hat.o, L: P.hat.h, H: P.hat.m, h: P.hat.d, r: K.tone(P.hat.m, -6) }, face === 'left');
      if (face === 'front') { dot(c, x - 4, hy + 8, P.hat.d); dot(c, x + 3, hy + 8, P.hat.d); }   // quai nón
    } else if (s.hat === 'cap') {
      const C = R(s.hatColor || '#3a6aa8');
      px(c, x - 5, hy - 2, 10, 5, C.o); px(c, x - 4, hy - 1, 8, 3, C.m); px(c, x - 3, hy - 1, 3, 1, C.l);
      if (face === 'front') { px(c, x - 5, hy + 2, 10, 2, C.o); px(c, x - 4, hy + 2, 8, 1, C.d); }
      if (face === 'right') { px(c, x + 3, hy + 1, 5, 2, C.o); px(c, x + 3, hy + 1, 4, 1, C.d); }
      if (face === 'left') { px(c, x - 8, hy + 1, 5, 2, C.o); px(c, x - 7, hy + 1, 4, 1, C.d); }
    } else if (s.hat === 'scarf') {
      // khăn rằn: ô caro 2 màu quấn đầu
      const C = R(s.hatColor || '#6a4a3a');
      px(c, x - 5, hy - 1, 10, 4, C.o); px(c, x - 4, hy, 8, 2, C.m);
      for (let i = 0; i < 8; i += 2) { dot(c, x - 4 + i, hy, '#e8e0d0'); dot(c, x - 3 + i, hy + 1, '#e8e0d0'); }
      if (face === 'back') { px(c, x - 1, hy + 3, 3, 2, C.o); dot(c, x, hy + 3, C.m); }
    }
  }

  function headSide(c, x, hy, s, P, t) {
    K.art(c, x - 5, hy, HEAD.side, { o: P.S.o, S: P.S.m, s: P.S.d, l: P.S.l });
    px(c, x + 2, hy + 4, 1, 2, EYE);
    dot(c, x + 3, hy + 7, P.S.o);
    dot(c, x + 1, hy + 6, K.mix(P.S.m, '#e0705a', 0.3));
    const st = HAIR[s.hairStyle || 'short'] || HAIR.short;
    K.art(c, x - 5, hy + st.side.top, st.side.rows, { O: P.H.o, H: P.H.m, h: P.H.d, L: P.H.l });
    // tai
    px(c, x - 2, hy + 4, 2, 2, P.S.d); dot(c, x - 2, hy + 4, P.S.o);
    if (s.beard) { px(c, x + 1, hy + 7, 3, 1, s.beard); px(c, x + 2, hy + 8, 2, 2, s.beard); }
    if (s.glasses) { px(c, x + 1, hy + 4, 3, 1, s.glasses); px(c, x - 2, hy + 4, 3, 1, s.glasses); }
    hat(c, x, hy, s, P, 'right');
  }

  /* ---------- đồ cầm tay ---------- */
  function item(c, kind, x, y, P, t, face) {
    if (!kind) return;
    if (kind === 'fan') {   // quạt nan: phẩy qua lại
      const f = frame(t, 2, 5), fx = x + (f ? 1 : -1), C = R('#d8c088');
      K.ellipse(c, fx, y - 3, 3, 2, C.o); K.ellipse(c, fx, y - 3, 2, 1, C.m); dot(c, fx - 1, y - 4, C.h); px(c, x, y - 1, 1, 2, C.d);
    } else if (kind === 'cup') {
      px(c, x - 1, y - 2, 3, 3, '#5a6a7a'); px(c, x, y - 2, 1, 2, '#e8ecef'); dot(c, x - 1, y - 2, '#c8d4dc');
    } else if (kind === 'phone') {
      px(c, x - 1, y - 2, 3, 4, '#2a2a34'); px(c, x, y - 1, 1, 2, '#7ab0d8');
    } else if (kind === 'cane') {
      const C = R('#7a5a3a'); px(c, x, y - 1, 1, 14, C.m); dot(c, x - 1, y - 1, C.d);
    } else if (kind === 'basket') {   // thúng tre ôm bên hông
      const C = R('#b08a4a'); px(c, x - 4, y - 3, 8, 6, C.o); px(c, x - 3, y - 3, 6, 5, C.m); px(c, x - 3, y - 3, 6, 1, '#d8c070');
      for (let i = 0; i < 6; i += 2) dot(c, x - 3 + i, y, C.d);
    } else if (kind === 'bucket') {   // xô tôn
      const C = R('#8a98a4'); px(c, x - 3, y, 6, 6, C.o); px(c, x - 2, y + 1, 4, 4, C.m); px(c, x - 2, y + 1, 4, 1, C.l); K.line(c, x - 2, y, x, y - 3, '#4a4a50'); K.line(c, x + 1, y, x, y - 3, '#4a4a50');
    }
  }

  /* ---------- người: nhìn trước / sau ---------- */
  function personFront(c, x, y, s, o, P, D, back) {
    const pose = o.pose || 'stand', t = o.t || 0, bw = D.bw, tx = x - bw / 2;
    const sit = pose === 'sit', squat = pose === 'squat';
    const legH = sit ? D.leg - 1 : squat ? 2 : D.leg, bodyH = D.body;
    const feetY = y - 1, legTop = y - legH, ty = legTop - bodyH, hy = ty - 9;
    const bob = pose === 'cheer' ? frame(t, 2, 4) : 0;
    const sl = sleeveOf(s, bodyH);
    if (sit && o.seat && back) N.stool(c, x, y, o.seat, 'back');
    if (sit && o.seat && !back) N.stool(c, x, y, o.seat, 'front');
    // chân
    if (squat) {
      // ngồi xổm: 2 đầu gối 2 bên hông, bàn chân bè
      for (const kx of [tx - 2, tx + bw - 2]) { px(c, kx - 1, legTop - 3, 5, 6, P.B.o); px(c, kx, legTop - 2, 3, 3, P.B.m); px(c, kx + 2, legTop - 2, 1, 3, P.B.d); px(c, kx, legTop + 1, 3, 1, P.S.d); }
      px(c, tx - 1, legTop - 1, bw + 2, 3, P.B.o); px(c, tx, legTop - 1, bw, 2, P.B.d);
    } else if (sit && !back) {
      // ngồi: đùi hướng vào camera (dải ngắn) rồi 2 ống quyển
      px(c, tx - 1, legTop - 2, bw + 2, 4, P.B.o); px(c, tx, legTop - 1, bw, 2, P.B.l); px(c, tx, legTop, bw, 1, P.B.m);
      legsFront(c, x, legTop + 2, feetY, bw, s, P, 'stand', t);
    } else if (sit && back) {
      px(c, tx - 1, legTop - 1, bw + 2, 3, P.B.o); px(c, tx, legTop - 1, bw, 2, P.B.m);
    } else legsFront(c, x, legTop, feetY, bw, s, P, pose, t);
    if (!sit && !squat) K.shadow(c, x, y, Math.max(4, bw / 2 + 2), 1);
    // tay: buông 2 bên thân, hoặc giơ lên ngoài 2 mép đầu (đầu không che)
    const armH = bodyH - 1;
    const down = (ax) => arm(c, ax, ty + 1, 2, armH, sl, P);
    const up = (ax, lift = 0) => arm(c, ax, hy - 1 - lift + bob, 2, ty + 2 - (hy - 1 - lift + bob), sl, P, true);
    torso(c, tx, ty, bw, bodyH, s, P, back, s.seed || 7);
    const Lx = tx - 2, Rx = tx + bw;
    if (pose === 'cheer') { up(Lx - 1); up(Rx + 1); }
    else if (pose === 'wave') { down(Lx); const sw = frame(t, 2, 3); up(Rx + 1 + sw, 0); }
    else if (pose === 'point') { down(Lx); px(c, Rx - 1, ty, 9, 4, P.T.o); px(c, Rx, ty + 1, 4, 2, P.T.m); px(c, Rx + 4, ty + 1, 3, 2, P.S.m); dot(c, Rx + 7, ty + 1, P.S.m); }
    else if (pose === 'hips') {
      for (const [ex, hx] of [[Lx - 1, tx], [Rx + 1, tx + bw - 2]]) { arm(c, ex, ty + 1, 2, 4, Math.min(sl, 4), P); px(c, Math.min(ex, hx) , ty + 4, 2 + Math.abs(ex - hx), 2, P.S.o); px(c, hx, ty + 4, 2, 1, P.S.m); }
    } else if (pose === 'cross') {
      arm(c, Lx, ty + 1, 2, 3, sl, P); arm(c, Rx, ty + 1, 2, 3, sl, P);
      px(c, tx - 2, ty + 3, bw + 4, 4, (sl >= bodyH ? P.T : P.S).o); px(c, tx - 1, ty + 4, bw + 2, 2, (sl >= bodyH ? P.T : P.S).m); px(c, tx - 1, ty + 5, bw + 2, 1, (sl >= bodyH ? P.T : P.S).d);
    } else if (pose === 'rest') {
      // khuỷu tay tì thanh rào: cẳng tay nằm ngang trước ngực
      px(c, tx - 3, ty + 1, bw + 6, 4, P.S.o); px(c, tx - 2, ty + 2, bw + 4, 2, P.S.m); px(c, tx - 2, ty + 3, bw + 4, 1, P.S.d);
      if (sl >= bodyH) { px(c, tx - 2, ty + 2, 3, 2, P.T.m); px(c, tx + bw - 1, ty + 2, 3, 2, P.T.m); }
    } else if (pose === 'hold' || pose === 'clap' || pose === 'sit' || pose === 'squat') {
      const open = pose === 'clap' && frame(t, 2, 5) === 1;
      arm(c, Lx, ty + 1, 2, 3, sl, P); arm(c, Rx, ty + 1, 2, 3, sl, P);
      const hy2 = pose === 'clap' ? ty + 3 : ty + 4;
      if (!back) {
        if (open) { px(c, tx - 1, hy2 - 1, 3, 3, P.S.o); px(c, tx, hy2, 2, 1, P.S.m); px(c, tx + bw - 2, hy2 - 1, 3, 3, P.S.o); px(c, tx + bw - 2, hy2, 2, 1, P.S.m); }
        else { px(c, tx - 1, hy2 - 1, bw + 2, 3, P.S.o); px(c, tx, hy2, bw, 1, P.S.m); px(c, x - 1, hy2, 2, 1, P.S.l); }
      }
    } else { down(Lx); down(Rx); }
    headFront(c, x, hy, s, P, back, pose, t);
    if (!back) item(c, o.item, x + (o.item === 'fan' ? 5 : 0), ty + 4, P, t, 'front');
    return hy;
  }

  /* ---------- người: nhìn nghiêng (sang phải; trái = lật) ---------- */
  function personSide(c, x, y, s, o, P, D) {
    const pose = o.pose || 'stand', t = o.t || 0, bw = D.bw - 2, tx = x - bw / 2;
    const bodyH = D.body;
    let legH = D.leg;
    if (pose === 'sit' || pose === 'ride') legH = D.leg - 1;
    if (pose === 'squat') legH = 3;
    const feetY = y - 1, legTop = y - legH;
    let ty = legTop - bodyH, hx = x, hy = ty - 9;
    const sl = sleeveOf(s, bodyH);
    if (pose === 'bend') {
      // cúi gập người (cấy, nhổ cỏ): 2 chân thẳng, mông cao phía sau, lưng chúi về trước, đầu thấp hơn hông, tay buông gần đất
      K.shadow(c, x + 3, y, 8, 1);
      const hipY = legTop - 2;
      for (const [lx, d] of [[x - 3, 1], [x - 1, 0]]) {
        const C = d ? P.B.d : P.B.m, h = feetY - hipY, pr = (s.bottomStyle || 'pants') === 'pants' ? h : h - 2;
        px(c, lx - 1, hipY - 1, 4, h + 2, P.B.o); px(c, lx, hipY, 2, pr, C); px(c, lx, hipY + pr, 2, h - pr, d ? P.S.d : P.S.m);
        px(c, lx - 1, feetY, 4, 1, P.F.o); px(c, lx, feetY, 3, 1, P.F.m);
      }
      // mông (quần) + lưng chéo xuống về trước: mỗi cột 1 dải dày 5, viền trước rồi thân
      px(c, x - 5, hipY - 4, 7, 6, P.B.o); px(c, x - 4, hipY - 3, 5, 4, P.B.m); px(c, x - 4, hipY - 3, 5, 1, P.B.l);
      const backY = (i) => hipY - 4 + Math.round(i * 0.55);
      for (let i = 0; i <= 8; i++) px(c, x - 1 + i, backY(i) - 1, 1, 7, P.T.o);
      for (let i = 0; i <= 7; i++) { px(c, x + i, backY(i), 1, 5, P.T.m); dot(c, x + i, backY(i), P.T.l); dot(c, x + i, backY(i) + 4, P.T.d); }
      // tay buông từ vai xuống gần đất
      const ax = x + 6;
      px(c, ax - 1, backY(6) + 2, 4, feetY - backY(6) - 5, (sl > 3 ? P.T : P.S).o); px(c, ax, backY(6) + 3, 2, feetY - backY(6) - 7, sl > 3 ? P.T.m : P.S.m); px(c, ax, feetY - 5, 2, 1, P.S.m);
      const hx2 = x + 12, hy2 = backY(8) - 4;
      headSide(c, hx2, hy2, s, P, t);
      item(c, o.item, ax + 1, feetY, P, t, 'right');
      return hy2;
    }
    // chân
    if (pose === 'ride' || pose === 'sit') {
      const f = pose === 'ride' ? frame(t, 4, 8) : 0, kneeX = x + 3;
      const seatY = legTop;
      // đùi ngang ra trước + ống quyển thẳng xuống (đạp: 2 chân lệch nhịp)
      for (const [ph, dk] of [[f, 1], [(f + 2) % 4, 0]]) {
        const lift = pose === 'ride' ? [0, 1, 2, 1][ph] : 0, C = dk ? P.B.d : P.B.m;
        px(c, x - 2, seatY - 2, kneeX - x + 4, 4, P.B.o); px(c, x - 1, seatY - 1, kneeX - x + 2, 2, C);
        px(c, kneeX - 1, seatY - 1 - lift, 4, feetY - seatY + 3, P.B.o);
        px(c, kneeX, seatY - lift, 2, feetY - seatY - 1, s.bottomStyle === 'pants' ? C : P.S.m);
        px(c, kneeX, feetY - lift, 3, 1, P.F.m);
      }
    } else if (pose === 'squat') {
      // ngồi xổm (giặt giũ, nhặt rau): đầu gối co sát ngực, mông gần đất, thân thấp; tay vươn ra trước
      K.shadow(c, x + 1, y, 6, 1);
      px(c, x - 4, y - 5, 8, 5, P.B.o); px(c, x - 3, y - 4, 6, 3, P.B.m); px(c, x - 3, y - 4, 6, 1, P.B.l);
      px(c, x - 3, feetY, 8, 1, P.F.o); px(c, x - 1, feetY, 5, 1, P.F.m);
      ty = y - 11; hy = ty - 8;
      K.block(c, x - 3, ty, bw, 7, P.T, { round: 1 });
      // đầu gối trước ngực
      px(c, x + 1, ty + 2, 5, 8, P.B.o); px(c, x + 2, ty + 3, 3, 6, P.B.m); px(c, x + 2, ty + 3, 3, 1, P.B.l); px(c, x + 2, feetY - 1, 3, 1, P.S.d);
      px(c, x - 1, ty + 3, 9, 4, (sl > 3 ? P.T : P.S).o); px(c, x, ty + 4, 7, 2, sl > 3 ? P.T.m : P.S.m); px(c, x + 6, ty + 4, 2, 2, P.S.m);
      headSide(c, x + 1, hy, s, P, t);
      if (o.item) item(c, o.item, x + 8, ty + 6, P, t, 'right');
      return hy;
    } else {
      const f = pose === 'walk' ? frame(t, 4, 7) : -1;
      const sw = f < 0 ? [0, 0] : [[-2, 2], [0, 0], [2, -2], [0, 0]][f];
      for (const [i, d] of [[0, 1], [1, 0]]) {
        const lx = x - 1 + sw[i], C = d ? P.B.d : P.B.m, Sk = d ? P.S.d : P.S.m;
        const h = feetY - legTop, pr = (s.bottomStyle || 'pants') === 'pants' ? h : s.bottomStyle === 'rolled' ? h - 2 : 2;
        px(c, lx - 1, legTop - 1, 4, h + 2, P.B.o);
        px(c, lx, legTop, 2, pr, C); px(c, lx, legTop + pr, 2, h - pr, Sk);
        px(c, lx - 1, feetY, 4, 1, P.F.o); px(c, lx, feetY, 3, 1, P.F.m);
      }
      px(c, tx - 1, legTop - 1, bw + 2, 3, P.B.o); px(c, tx, legTop - 1, bw, 2, P.B.m);
      K.shadow(c, x, y, 5, 1);
    }
    torso(c, tx, ty, bw, bodyH, s, P, true, s.seed || 7);
    // tay
    const f = pose === 'walk' ? frame(t, 4, 7) : 0, swing = pose === 'walk' ? [1, 0, -1, 0][f] : 0;
    if (pose === 'hold' || pose === 'rake' || pose === 'ride') {
      const ay = ty + (pose === 'ride' ? 2 : 3);
      px(c, x - 2, ty, 4, 5, (sl > 2 ? P.T : P.S).o); px(c, x - 1, ty + 1, 2, 3, sl > 0 ? P.T.m : P.S.m);
      px(c, x - 1, ay - 1, 8, 4, P.S.o); px(c, x, ay, 6, 2, sl > 3 ? P.T.m : P.S.m); px(c, x + 5, ay, 2, 2, P.S.m);
      if (pose === 'rake') {
        const C = R('#8a6a42');
        K.line(c, x - 6, ay - 6, x + 12, feetY - 1, C.m);
        px(c, x + 10, feetY - 1, 6, 2, C.o); px(c, x + 11, feetY - 1, 4, 1, C.d);
      }
    } else if (pose === 'pole') {
      // gánh: tay đặt lên đòn trên vai
      px(c, x - 1, hy + 8, 4, ty - hy - 4, P.S.o); px(c, x, hy + 9, 2, ty - hy - 6, P.S.m);
      if (sl > 0) px(c, x, ty, 2, 2, P.T.m);
    } else {
      px(c, x - 2 + swing, ty, 4, bodyH + 1, (sl >= bodyH ? P.T : P.S).o);
      px(c, x - 1 + swing, ty + 1, 2, Math.min(sl, bodyH - 2), P.T.m);
      if (sl < bodyH - 1) px(c, x - 1 + swing, ty + 1 + sl, 2, bodyH - 2 - sl, P.S.m);
      px(c, x - 1 + swing, ty + bodyH - 1, 2, 1, P.S.m);
    }
    headSide(c, hx, hy, s, P, t);
    if (pose === 'pole') pole(c, x, ty - 1, t);
    if (o.item && pose !== 'pole') item(c, o.item, x + 6, ty + 4, P, t, 'right');
    return hy;
  }

  // đòn gánh + 2 quang gánh (rau / rơm) đung đưa
  function pole(c, x, y, t) {
    const C = R('#a07a44'), sw = frame(t, 4, 4), d = [0, 1, 0, -1][sw];
    px(c, x - 14, y, 28, 1, C.m); px(c, x - 14, y + 1, 28, 1, C.o);
    for (const bx of [x - 12, x + 12]) {
      K.line(c, bx - 3, y + 1, bx - 3 + d, y + 9, '#5a4a32'); K.line(c, bx + 3, y + 1, bx + 3 + d, y + 9, '#5a4a32');
      const B = R('#b8945a');
      px(c, bx - 5 + d, y + 9, 11, 6, B.o); px(c, bx - 4 + d, y + 10, 9, 4, B.m); px(c, bx - 4 + d, y + 13, 9, 1, B.d);
      for (let i = 0; i < 9; i += 2) dot(c, bx - 4 + d + i, y + 11, B.d);
      // rau trong quang
      const G = R('#5f8a3a');
      px(c, bx - 4 + d, y + 7, 9, 3, G.m); dot(c, bx - 3 + d, y + 7, G.h); dot(c, bx + d, y + 6, G.l); dot(c, bx + 2 + d, y + 7, G.d);
    }
  }

  N.person = function (c, x, y, s, o = {}) {
    const D = DIM[s.age || 'adult'] || DIM.adult, P = colors(s), face = o.face || 'front';
    if (face === 'front' || face === 'back') return personFront(c, x, y, s, o, P, D, face === 'back');
    if (face === 'left') { c.save(); c.translate(2 * x + 1, 0); c.scale(-1, 1); }
    const hy = personSide(c, x, y, s, o, P, D);
    if (face === 'left') c.restore();
    return hy;
  };
  N.height = (s) => { const D = DIM[s.age || 'adult'] || DIM.adult; return 9 + D.body + D.leg; };

  /* ---------- thú ---------- */
  const flipped = (c, x, face, fn) => { if (face === 'left') { c.save(); c.translate(2 * x + 1, 0); c.scale(-1, 1); } fn(); if (face === 'left') c.restore(); };

  // gà mái: 10 x 9, đứng / mổ / đi
  const HEN = {
    stand: ['.......r..', '......rHH.', 'T.....HeHb', 'TT...HHHw.', 'TTHHHHHHH.', '.TWWWWHHH.', '..OWWWHHO.', '...OOOO...', '....l.l...'],
    peck: ['..........', '..........', 'T.........', 'TT........', 'TTHHHHHr..', '.TWWWWHHrH.', '..OWWWHHeHb', '...OOOO.w..', '....l.l...'],
    walk: ['.......r..', '......rHH.', 'T.....HeHb', 'TT...HHHw.', 'TTHHHHHHH.', '.TWWWWHHH.', '..OWWWHHO.', '...OOOO...', '...l...l..'],
  };
  N.hen = function (c, x, y, o = {}) {
    const H = R(o.color || '#a8643a'), t = o.t || 0;
    const pose = o.pose === 'peck' ? (frame(t + (o.seed || 0), 4, 3) < 2 ? 'peck' : 'stand') : o.pose === 'walk' ? (frame(t, 2, 4) ? 'walk' : 'stand') : 'stand';
    K.shadow(c, x, y, 4, 1);
    flipped(c, x, o.face, () => K.art(c, x - 5, y - 9, HEN[pose], { r: '#c8443a', H: H.m, e: '#2a1a14', b: '#e0b040', w: '#b83a30', T: K.tone(H.m, -18), W: H.d, O: H.o, l: '#d09838' }));
    if (pose !== 'peck') flipped(c, x, o.face, () => { dot(c, x - 1, y - 5, H.l); dot(c, x, y - 5, H.h); });
  };
  const ROOSTER = ['........rr.', 'T......rHH.', 'TT.....HeHb', 'TTT...AAHw.', 'TgT..AAAA..', '.TTHHHAAA..', '..TWWWWHH..', '...OWWWHO..', '....OOOO...', '.....l.l...'];
  N.rooster = function (c, x, y, o = {}) {
    const t = o.t || 0, crow = o.pose === 'crow' && frame(t, 6, 3) < 2;
    K.shadow(c, x, y, 5, 1);
    flipped(c, x, o.face, () => {
      K.art(c, x - 5, y - 10 - (crow ? 1 : 0), ROOSTER, { r: '#d63a30', H: '#9a3a22', e: '#2a1a14', b: '#e0b040', w: '#c03028', T: '#26343a', g: '#3c6e52', A: '#d8823a', W: '#74291c', O: '#4a1c14', l: '#d09838' });
      dot(c, x + 1, y - 7, '#f0a850');
      if (crow) { dot(c, x + 5, y - 9, '#e0b040'); dot(c, x + 5, y - 7, '#e0b040'); }
    });
  };
  N.chick = function (c, x, y, o = {}) {
    const hop = frame((o.t || 0) + (o.seed || 0), 3, 5) === 0 ? 1 : 0;
    flipped(c, x, o.face, () => K.art(c, x - 2, y - 4 - hop, ['.YYb', 'YYYY', '.yy.', '.l.l'], { Y: '#f0d060', y: '#d8b040', b: '#e09030', l: '#c88a30' }));
  };
  // vịt: bơi (không chân, gợn nước) / đi lạch bạch
  const DUCK = {
    swim: ['......HH..', '.....HeHbb', 'T....HH...', 'THHHHHHH..', '.HWWWWHH..', '..OOOOO...'],
    walk: ['......HH..', '.....HeHbb', 'T....HH...', 'THHHHHHH..', '.HWWWWHH..', '..OOOOO...', '...l..l...'],
  };
  N.duck = function (c, x, y, o = {}) {
    const B = R(o.color || '#a88458'), hd = o.head || null, t = o.t || 0, swim = o.pose === 'swim';
    const bobY = swim ? frame(t + (o.seed || 0), 4, 3) === 0 ? 1 : 0 : frame(t, 2, 5);
    if (!swim) K.shadow(c, x, y, 4, 1);
    flipped(c, x, o.face, () => {
      const rows = DUCK[swim ? 'swim' : 'walk'];
      K.art(c, x - 5, y - rows.length - (swim ? -2 : 0) - bobY, rows, { H: B.m, e: '#1e1a18', b: '#d89a3a', T: B.d, W: B.d, O: B.o, l: '#d88a2a' });
      if (hd) { px(c, x + 1, y - rows.length - (swim ? -2 : 0) - bobY, 2, 2, hd); dot(c, x + 1, y - rows.length + 1 - (swim ? -2 : 0) - bobY, hd); }
      dot(c, x - 3, y - rows.length + 3 - (swim ? -2 : 0) - bobY, B.h);
      if (swim) { px(c, x - 6, y, 3, 1, 'rgba(235,245,250,0.55)'); px(c, x + 3, y + 1, 3, 1, 'rgba(235,245,250,0.4)'); }
    });
  };
  // trâu: thân khối, sừng cong ngược, đuôi phẩy; graze = cúi gặm cỏ
  N.buffalo = function (c, x, y, o = {}) {
    const B = R(o.color || '#4c4c56'), t = o.t || 0, graze = o.pose === 'graze';
    K.shadow(c, x + 1, y, 15, 2);
    flipped(c, x, o.face, () => {
      const bx = x - 13, by = y - 16;
      // chân sau xa, trước xa (tối)
      for (const lx of [bx + 3, bx + 15]) { px(c, lx - 1, by + 9, 5, 8, B.o); px(c, lx, by + 10, 3, 6, B.d); }
      // thân
      px(c, bx - 1, by - 1, 24, 13, B.o); px(c, bx, by, 22, 11, B.m);
      px(c, bx + 1, by, 20, 2, B.l); px(c, bx + 4, by, 8, 1, B.h);
      px(c, bx, by + 8, 22, 3, B.d); px(c, bx + 6, by + 10, 10, 1, K.tone(B.m, -16));
      // bùn khô loang trên thân
      px(c, bx + 2, by + 6, 6, 3, K.mix(B.m, '#8a7a62', 0.5)); px(c, bx + 14, by + 7, 5, 2, K.mix(B.m, '#8a7a62', 0.45));
      // chân gần
      for (const lx of [bx + 1, bx + 17]) { px(c, lx - 1, by + 9, 5, 8, B.o); px(c, lx, by + 10, 3, 6, B.m); px(c, lx, by + 15, 3, 1, '#2e2a2a'); }
      // đuôi
      const sw = [0, 1, 2, 1][frame(t, 4, 3)];
      K.line(c, bx - 1, by + 1, bx - 3 - sw, by + 9, B.o); px(c, bx - 4 - sw, by + 9, 2, 3, '#2e2a2a');
      // cổ + đầu
      const hx = bx + 20, hy = graze ? by + 6 : by - 3;
      px(c, hx - 2, by - 1, 6, graze ? 10 : 8, B.o); px(c, hx - 1, by, 4, graze ? 8 : 6, B.m);
      px(c, hx + 1, hy - 1, 9, 9, B.o); px(c, hx + 2, hy, 7, 7, B.m); px(c, hx + 2, hy, 6, 1, B.l);
      px(c, hx + 7, hy + 4, 3, 3, '#6a6266'); dot(c, hx + 8, hy + 5, '#2a2428');   // mõm
      dot(c, hx + 5, hy + 2, '#1e1a1c'); dot(c, hx + 5, hy + 1, '#8a8a92');
      px(c, hx, hy + 1, 2, 2, B.d);   // tai
      // sừng lưỡi liềm cong về sau
      const Hn = R('#cfc4a6');
      px(c, hx + 1, hy - 2, 6, 1, Hn.m); px(c, hx - 1, hy - 3, 3, 1, Hn.m); px(c, hx - 2, hy - 2, 1, 2, Hn.d); dot(c, hx + 3, hy - 2, Hn.h);
      if (graze) { px(c, hx + 6, hy + 7, 4, 2, '#5a8a3a'); dot(c, hx + 9, hy + 6, '#6a9a44'); }
    });
  };
  // chó vàng: nằm / đứng, đuôi vẫy
  N.dog = function (c, x, y, o = {}) {
    const Y = R(o.color || '#c89a58'), t = o.t || 0, wag = frame(t, 2, 6);
    K.shadow(c, x, y, 7, 1);
    flipped(c, x, o.face, () => {
      if (o.pose === 'stand') {
        K.art(c, x - 7, y - 10, ['.........OO..', '........OYYOO', 'T.......YYeYn', '.TYYYYYYYYYm.', '..YYYYYYYYY..', '..yyyyyyyy...', '..Y.Y...Y.Y..', '..Y.Y...Y.Y..', '..y.y...y.y..'], { O: Y.o, Y: Y.m, y: Y.d, e: '#1e1614', n: '#2a1e1a', m: Y.l, T: wag ? Y.m : 'rgba(0,0,0,0)' });
        if (!wag) dot(c, x - 7, y - 9, Y.m);
      } else {
        K.art(c, x - 7, y - 6, ['.........OO..', '........OYYOO', '........YYeYn', 'TYYYYYYYYYY..', '.YYYYYYYYYY..', '..yyyyyyyyy..'], { O: Y.o, Y: Y.m, y: Y.d, e: '#1e1614', n: '#2a1e1a', T: wag ? Y.d : Y.m });
        px(c, x - 5, y - 4, 6, 1, Y.l);
      }
    });
  };
  // cò trắng lội ruộng
  N.egret = function (c, x, y, o = {}) {
    const dip = o.pose === 'feed' && frame((o.t || 0) + (o.seed || 0), 5, 2) === 0;
    flipped(c, x, o.face, () => {
      if (dip) K.art(c, x - 3, y - 6, ['......', '.www..', 'wwwwwb', '.ww..', '..l...', '..l...'], { w: '#f2f0e8', b: '#d8a830', l: '#3a3530' });
      else K.art(c, x - 3, y - 8, ['...ww.', '...wwb', '...w..', '.www..', 'wwww..', '..l...', '..l...', '..l...'], { w: '#f2f0e8', b: '#d8a830', l: '#3a3530' });
      dot(c, x - 2, y - 4, '#d8d8d0');
    });
  };
  // chim nhỏ bay xa (2 khung vỗ cánh)
  N.bird = function (c, x, y, o = {}) {
    const f = frame((o.t || 0) + (o.seed || 0), 2, 4), col = o.color || '#5a5a64';
    if (f) { dot(c, x - 2, y - 1, col); dot(c, x - 1, y, col); dot(c, x, y - 0, col); dot(c, x + 1, y, col); dot(c, x + 2, y - 1, col); }
    else { dot(c, x - 2, y, col); dot(c, x - 1, y, col); dot(c, x, y, col); dot(c, x + 1, y, col); dot(c, x + 2, y, col); dot(c, x, y + 1, col); }
  };

  /* ---------- dàn diễn viên làng (spec dùng lại; scene đổi pose / hướng) ---------- */
  N.cast = {
    grandpa: { age: 'elder', skin: '#c99068', hair: '#d8d4cc', hairStyle: 'elder', top: '#e8e2d0', topStyle: 'aobaba', bottom: '#d8d0bc', bottomStyle: 'pants', beard: '#e8e4dc', glasses: '#6a5a4a', seed: 1 },
    grandma: { age: 'elder', skin: '#c08a64', hair: '#cfcac2', hairStyle: 'bun', top: '#5a4a6a', topStyle: 'aobaba', bottom: '#2e2a30', bottomStyle: 'pants', seed: 2 },
    farmer: { age: 'adult', skin: '#b87a52', hair: '#2a2220', hairStyle: 'short', top: '#7a8a9a', topStyle: 'shirt', bottom: '#4a4038', bottomStyle: 'rolled', hat: 'non', seed: 3 },
    farmerW: { age: 'adult', skin: '#c08458', hair: '#2a2220', hairStyle: 'bun', top: '#8a5a48', topStyle: 'aobaba', bottom: '#2e2a2e', bottomStyle: 'rolled', hat: 'non', seed: 4 },
    mother: { age: 'adult', skin: '#d4a07a', hair: '#2e2420', hairStyle: 'long', top: '#d8b8c0', topStyle: 'floral', accent: '#a85a6a', bottom: '#d8b8c0', bottomStyle: 'pants', seed: 5 },
    uncle: { age: 'adult', skin: '#b8784e', hair: '#241e1c', hairStyle: 'buzz', top: '#f0ece0', topStyle: 'tank', bottom: '#3a5a4a', bottomStyle: 'shorts', seed: 6 },
    teenG: { age: 'teen', skin: '#d8a882', hair: '#241c1a', hairStyle: 'long', top: '#f2f0ea', topStyle: 'shirt', bottom: '#2e3a5a', bottomStyle: 'pants', seed: 7 },
    teenB: { age: 'teen', skin: '#c48a60', hair: '#221c1a', hairStyle: 'short', top: '#3a7a6a', topStyle: 'tee', bottom: '#2a2a32', bottomStyle: 'shorts', seed: 8 },
    boy: { age: 'kid', skin: '#c88a5e', hair: '#241e1c', hairStyle: 'bowl', top: '#e8c25a', topStyle: 'stripe', accent: '#c85a3a', bottom: '#3a4a6a', bottomStyle: 'shorts', seed: 9 },
    boy2: { age: 'kid', skin: '#b87a50', hair: '#221c1a', hairStyle: 'buzz', top: '#5a8ac8', topStyle: 'tee', bottom: '#2a2a2e', bottomStyle: 'shorts', hat: 'cap', hatColor: '#c84a3a', seed: 10 },
    girl: { age: 'kid', skin: '#d8a47c', hair: '#2a201c', hairStyle: 'bun', top: '#e88a8a', topStyle: 'floral', accent: '#f8e8e0', bottom: '#e88a8a', bottomStyle: 'shorts', seed: 11 },
    girl2: { age: 'kid', skin: '#c99068', hair: '#2a201c', hairStyle: 'long', top: '#8ac0a0', topStyle: 'tee', bottom: '#4a5a8a', bottomStyle: 'skirt', seed: 12 },
    vendor: { age: 'adult', skin: '#c48a60', hair: '#2a2220', hairStyle: 'bun', top: '#6a8a6a', topStyle: 'aobaba', bottom: '#2a2a2e', bottomStyle: 'pants', hat: 'non', seed: 13 },
    youth: { age: 'adult', skin: '#c08050', hair: '#1e1a1a', hairStyle: 'short', top: '#c84a3a', topStyle: 'tee', bottom: '#3a3a44', bottomStyle: 'pants', seed: 14 },
  };
})();
