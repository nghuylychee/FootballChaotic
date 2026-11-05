/* Cảnh sự kiện ??? PARK PHYSIO (bàn trị liệu ngoài công viên) — khung chung + quy ước: src/ui/evscene.js · cách diễn: docs/ux-screens/screens/event-scenes.json
 * Nền lề đường chung + 1 cây to bên phải + mảng cỏ. Giữa khung: bàn gấp phủ khăn, hộp cứu thương (kiểu KIT VAN) trên bàn, tấm bìa giá dựng dưới
 * chân bàn, chuyên viên đứng cạnh (băng đô trắng, khăn vắt vai). Bên trái: 3 ghế nhựa, mỗi người đang đau ngồi 1 ghế (quay về phía bàn, duỗi chân),
 * băng quấn đúng chỗ đau + dấu ✚ đỏ trên đầu như trong trận. Không ai đau: ghế trống, chuyên viên ngồi trên mép bàn đọc báo.
 * Trỏ Get treated: hộp bật nắp + chuyên viên vẫy tay gọi · thiếu tiền / không ai đau: tấm bìa xám (thiếu tiền: số đỏ).
 * Kết quả: xu bay từ ô tiền xuống tấm bìa, rồi lần lượt từng người: băng bung ra rơi xuống cỏ, ✚ đỏ thành ✓ xanh, đứng dậy vươn vai (~1,4 s, rồi đứng yên).
 * Trỏ chuột vào 1 người đang đau: tên + chấn thương + công dụng (SFC.Tip, dom). */
(function () {
  const O = '#120c16';
  const GY = 152;                    // mặt cỏ: chân ghế, chân bàn, chân người
  const SEAT = [24, 56, 88];         // tâm 3 ghế nhựa (đội 3 người)
  const SY = GY - 9;                 // mặt ghế: mông người ngồi ở đây (hàng 40 của khung sprite)
  const TX = 106, TW = 48, TT = GY - 14;   // bàn gấp: mép trái, rộng, mặt bàn
  const KX = TX + 25, KY = TT - 12;  // hộp cứu thương trên bàn (góc trên trái)
  const PX = 174;                    // tâm chuyên viên đứng
  const CASH = [292, 12];            // ô tiền DOM (góc trên phải) trên canvas: xu bay ra từ đây
  // chuyên viên: tóc kiểu băng đô (băng = màu phụ của áo -> trắng), áo xanh ngọc kiểu áo y tế
  const LOOK = { hair: 'classic', skin: 2, hairColor: 1 };
  const KIT = { shirt: '#3e9c90', shirtDark: '#2a6e66', shorts: '#2a2440', accent: '#f4efe0' };
  const STOOL = ['#3a6ec0', '#2e8c7c', '#3a6ec0'];   // ghế nhựa xanh (không đỏ: đỏ dành cho dấu chấn thương)
  // tư thế ngồi ghế: ngồi quay sang phải (về phía bàn), duỗi chân, 1 tay tì lên gối (tư thế ngồi của động tác thua trận, celebrate-draw.js _lose)
  const SIT = { legs: 'sit', drop: 4, face: 0.35, arms: [[9, 0], [1, -1, 3, 0]], bend: true };
  // chỗ quấn băng trên tư thế ngồi (toạ độ trong khung sprite 40x44): theo bộ phận của chấn thương (run.badges[id].part)
  const WRAP = { wrist: [27, 35], ankle: [22, 37], toe: [25, 37], thigh: [18, 37] };

  /* ---------- chữ số pixel 3x5 + đồng xu + thẻ giá bìa cát-tông (chép từ src/ui/kitvan.js) ---------- */
  const DIG = {
    0: ['###', '#.#', '#.#', '#.#', '###'], 1: ['.#.', '##.', '.#.', '.#.', '###'], 2: ['###', '..#', '###', '#..', '###'], 3: ['###', '..#', '.##', '..#', '###'],
    4: ['#.#', '#.#', '###', '..#', '..#'], 5: ['###', '#..', '###', '..#', '###'], 6: ['###', '#..', '###', '#.#', '###'], 7: ['###', '..#', '.#.', '.#.', '.#.'],
    8: ['###', '#.#', '###', '#.#', '###'], 9: ['###', '#.#', '###', '..#', '###'],
  };
  const textW = (s) => s.length * 4 - 1;
  function text(k, s, x, y, c) {
    for (const ch of s) { (DIG[ch] || DIG[0]).forEach((row, j) => [...row].forEach((v, i) => { if (v === '#') k.P(x + i, y + j, 1, 1, c); })); x += 4; }
  }
  const COIN = ['.ddd.', 'dhyyd', 'dyyyd', 'dyyyd', '.ddd.'];
  function coin(k, x, y, dim) {
    const c = dim ? { d: '#5e5666', y: '#9a90a0', h: '#c8c0cc' } : { d: '#a8760c', y: '#ffd23f', h: '#fff3a8' };
    COIN.forEach((r, j) => [...r].forEach((v, i) => { if (v !== '.') k.P(x + i, y + j, 1, 1, c[v]); }));
  }
  // thẻ giá dựng (không dây): x = mép trái · dim = bìa xám (lựa chọn chưa làm được) · poor = số đỏ (thiếu tiền)
  function tag(k, x, y, price, dim, poor) {
    const label = String(price), w = 12 + textW(label);
    k.P(x, y, w, 9, '#3a2410'); k.P(x + 1, y + 1, w - 2, 7, dim ? '#5a5060' : '#d8b27a'); k.P(x + 1, y + 7, w - 2, 1, dim ? '#3e3646' : '#a8824a');
    coin(k, x + 4, y + 2, dim);
    text(k, label, x + 10, y + 2, poor ? '#ff5a6e' : dim ? '#9a90a0' : '#3a2410');
  }
  // hộp cứu thương 18x11 (+ quai 3 pixel) như KIT VAN · open: nắp lật ra sau (thấy mặt trong xám), trong hộp lộ cuộn băng + lọ thuốc
  function medkit(k, x, y, open) {
    const P = k.P;
    if (open) {
      // nắp lật ra sau: thấy mặt trong (xám) thu ngắn lại, hẹp dần lên trên như đang ngả ra xa
      P(x + 2, y - 5, 14, 1, O); P(x + 1, y - 4, 16, 5, O); P(x + 3, y - 4, 12, 1, '#c8ccd6'); P(x + 2, y - 3, 14, 3, '#9aa0ae');
      k.dc(x + 6, y - 1, 3, O); k.dc(x + 6, y - 1, 2, '#f4efe2'); P(x + 6, y - 1, 1, 1, '#c8c0b4');      // cuộn băng nhô khỏi hộp
      P(x + 11, y - 4, 4, 5, O); P(x + 12, y - 3, 2, 3, '#ff8a3a'); P(x + 12, y - 5, 2, 1, O);            // lọ thuốc
    } else { P(x + 6, y - 3, 6, 1, O); P(x + 5, y - 2, 1, 2, O); P(x + 12, y - 2, 1, 2, O); }
    P(x, y, 18, 11, O); P(x + 1, y + 1, 16, 9, '#f4f4f4'); P(x + 1, y + 8, 16, 2, '#c8ccd6');
    if (open) P(x + 1, y + 1, 16, 1, '#3a3440');   // mép lòng hộp
    P(x + 7, y + 2, 4, 6, '#ff3d5a'); P(x + 5, y + 4, 8, 2, '#ff3d5a');
  }

  /* ---------- người: sprite cầu thủ 1x (drawAvatar, khung 40x44, chân ở hàng 40) qua bộ đệm riêng để truyền thêm tư thế (celPose) ---------- */
  let fb = null;
  function fig(k, lk, x, y, o = {}) {
    fb = fb || Object.assign(document.createElement('canvas'), { width: 40, height: 44 });
    SFC.Sprites.drawAvatar(fb, lk, o.kit || k.kitHome(), o.t != null ? o.t : k.T(), o.facing != null ? o.facing : Math.PI / 2, o.ex || null, true);
    k.X.drawImage(fb, Math.round(x), Math.round(y));
  }
  // băng quấn (tư thế ngồi không vẽ o.inj của sprite nên tự vẽ): khối trắng 3x2 + 1 chấm máu, viền mực
  function wrap(k, x, y) { k.P(x - 1, y - 1, 5, 4, O); k.P(x, y, 3, 2, '#f4efe2'); k.P(x + 1, y + 1, 1, 1, '#e0475e'); }
  const partOf = (id) => { const b = SFC_CONFIG.run.badges[id]; return (b && b.part) || 'ankle'; };
  // dấu ✚ đỏ trên đầu (như RunDraw.hurt trong trận, to hơn: nét 2 pixel để nheo mắt vẫn thấy): 6x6 đỏ + viền mực · x, y = góc trên trái phần đỏ
  function cross(k, x, y) {
    k.P(x - 1, y + 1, 8, 4, O); k.P(x + 1, y - 1, 4, 8, O);
    k.P(x, y + 2, 6, 2, '#ff3d5a'); k.P(x + 2, y, 2, 6, '#ff3d5a');
  }
  // dấu ✓ xanh cùng cỡ, nét 2 pixel (viền mực: tô mực quanh từng điểm trước rồi tô màu) · x, y = điểm thấp nhất của nét
  const TICK = [[-3, -2], [-2, -1], [-1, 0], [0, 0], [1, -1], [2, -2], [3, -3], [4, -4]];
  function tick(k, x, y) {
    TICK.forEach(([i, j]) => k.P(x + i - 1, y + j - 1, 3, 4, O));
    TICK.forEach(([i, j]) => k.P(x + i, y + j, 1, 2, '#6bff4f'));
  }
  // ghế nhựa nhìn thẳng: mặt ghế 16 px (sáng nhất), thân loe xuống, vòm khoét giữa
  function stool(k, cx, col) {
    const P = k.P, lo = mixHex(col, '#000000', 0.35), hi = mixHex(col, '#ffffff', 0.3);
    k.shadow(cx, GY - 1, 10);
    for (let y = SY + 3; y < GY; y++) { const w = 6 + Math.floor((y - SY - 3) / 3); P(cx - w - 1, y, w * 2 + 2, 1, O); P(cx - w, y, w * 2, 1, y < SY + 4 ? lo : col); }
    P(cx - 3, SY + 5, 6, GY - SY - 5, O); P(cx - 2, SY + 6, 4, GY - SY - 6, '#1e2c1a');   // vòm khoét (thấy cỏ tối phía sau)
    P(cx - 8, SY, 16, 4, O); P(cx - 7, SY + 1, 14, 1, hi); P(cx - 7, SY + 2, 14, 1, col);
  }
  function mixHex(a, b, t) {
    const h = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16)), A = h(a), B = h(b);
    return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
  }

  /* ---------- nền tĩnh: phố chung, cây to, mảng cỏ, 3 ghế, bàn gấp phủ khăn ---------- */
  // cây to sát mép phải (tán tràn ra ngoài khung): khung cảnh công viên, tối dịu để không tranh với người đau / hộp cứu thương
  function tree(k) {
    const P = k.P, d = k.d, X = 256;   // X = mép trái thân cây
    // thân + 2 nhánh chui vào tán, rễ loe trên vỉa hè
    P(X, 74, 12, 58, O); P(X + 1, 74, 10, 57, '#3a2a26'); P(X + 1, 74, 3, 57, '#4e3a30'); P(X + 8, 74, 3, 57, '#2a1e1c');
    P(X - 5, 127, 22, 6, O); P(X - 4, 127, 20, 5, '#3a2a26'); P(X - 4, 127, 6, 5, '#4e3a30');
    k.ln(X + 3, 82, X - 12, 66, O); k.ln(X + 4, 82, X - 11, 66, '#3a2a26'); k.ln(X + 9, 80, X + 26, 62, O); k.ln(X + 9, 81, X + 26, 63, '#3a2a26');
    for (let y = 133; y < 136; y++) d(X - 16, y, X + 28, '#0e0a12', 2);
    // tán: các khối tròn chồng nhau, sẫm dưới, sáng nhẹ phía trên trái (ánh trời chiều), viền mực ngoài cùng
    const blobs = [[234, 60, 17], [258, 46, 21], [286, 50, 20], [312, 62, 16], [246, 77, 13], [274, 74, 16], [300, 80, 12], [224, 75, 9]];
    blobs.forEach(([x, y, r]) => k.dc(x, y, r + 1, O));
    blobs.forEach(([x, y, r]) => k.dc(x, y, r, '#1a3022'));
    blobs.forEach(([x, y, r]) => k.dc(x - 2, y - 3, r - 4, '#1f3827'));
    blobs.forEach(([x, y, r]) => { for (let j = -r + 3; j < -r / 3; j++) d(x - r + 4, y + j, x + 2, '#2e4c35', 3); });
    // chùm lá lởm chởm ở mép (chấm sẫm / sáng)
    for (let i = 0; i < 70; i++) {
      const [x, y, r] = blobs[i % blobs.length], a = k.hsh(i * 3.1) * Math.PI * 2, rr = r - 2 - Math.floor(k.hsh(i + 7) * 6);
      P(Math.round(x + Math.cos(a) * rr), Math.round(y + Math.sin(a) * rr), 2, 2, a > Math.PI ? '#2a4830' : '#12261a');
    }
  }
  function grass(k) {
    const P = k.P, d = k.d;
    // mảng cỏ đè lên đường nhựa (mép phải lượn), cỏ lấn lên bó vỉa
    for (let y = 134; y < 180; y++) {
      const r = 232 + Math.round(Math.sin(y * 0.21) * 4) + Math.floor((y - 134) * 0.5);
      P(0, y, r, 1, '#33492d');
      if (y === 134) P(0, y, r, 1, '#3e5634');
      P(r, y, 1, 1, '#24321f');
      if (y > 146) d(0, y, r, '#2c3f27', y > 166 ? 2 : 4);
    }
    for (let i = 0; i < 90; i++) {
      const x = Math.floor(k.hsh(i + 200) * 232), y = 136 + Math.floor(k.hsh(i + 300) * 42);
      P(x, y, 1, 2, k.hsh(i + 400) > 0.5 ? '#4a6a3c' : '#27381f');
    }
    for (let x = 2; x < 232; x += 3 + Math.floor(k.hsh(x) * 4)) P(x, 132 + Math.floor(k.hsh(x + 9) * 2), 1, 3, '#3e5634');   // ngọn cỏ lấn bó vỉa
  }
  function table(k) {
    const P = k.P;
    k.shadow(TX + TW / 2, GY - 1, TW / 2 + 2);
    // 2 chân gập chữ X (kim loại xám) dưới khăn
    k.ln(TX + 7, TT + 6, TX + TW - 8, GY - 1, '#4a4e5a'); k.ln(TX + TW - 8, TT + 6, TX + 7, GY - 1, '#4a4e5a');
    [TX + 3, TX + TW - 7].forEach((x) => { P(x, TT + 5, 4, GY - TT - 5, O); P(x + 1, TT + 5, 2, GY - TT - 6, '#8a909e'); P(x + 1, TT + 5, 1, GY - TT - 6, '#b0b6c2'); P(x, GY - 2, 4, 2, O); });
    // mặt bàn phủ khăn (trắng ngà, tối hơn hộp cứu thương để hộp nổi lên), khăn rủ xuống mép trước, gấu lượn, 1 sọc xanh như khăn tắm
    P(TX - 2, TT - 1, TW + 4, 8, O);
    P(TX - 1, TT, TW + 2, 6, '#d8d0c0'); P(TX - 1, TT, TW + 2, 1, '#e8e2d4');
    P(TX - 1, TT + 3, TW + 2, 1, '#5a98ac');
    for (let x = TX + 7; x < TX + TW; x += 12) P(x, TT + 1, 1, 5, '#bab2a2');   // nếp gấp
    for (let x = TX - 1; x < TX + TW + 1; x += 5) P(x + 2, TT + 6, 2, 1, '#d8d0c0');   // gấu lượn
    P(TX - 1, TT + 5, TW + 2, 1, '#aea694');
  }

  /* ---------- chuyên viên: khăn vắt vai trái (phía gần bàn) · ngồi mép bàn đọc báo khi không ai đau ---------- */
  function towel(k, bx, by) {
    const P = k.P;
    P(bx + 15, by + 28, 5, 2, O); P(bx + 16, by + 29, 3, 1, '#f4efe2');
    P(bx + 15, by + 30, 4, 8, O); P(bx + 16, by + 30, 2, 7, '#f4efe2'); P(bx + 17, by + 31, 1, 6, '#c8c0b4'); P(bx + 16, by + 34, 2, 1, '#5a98ac');
  }
  function newspaper(k, bx, by, flip) {
    const P = k.P, x = bx + 11, y = by + 26;
    P(x, y, 19, 12, O); P(x + 1, y + 1, 17, 10, '#d8d2c2'); P(x + 9, y + 1, 1, 10, '#a8a090');   // 2 trang, nếp gấp giữa
    P(x + 2, y + 2, 6, 3, '#7a7484');                                                            // ảnh
    for (let j = 6; j < 10; j += 2) P(x + 2, y + j, 6, 1, '#9a94a0');
    for (let j = 2; j < 10; j += 2) P(x + 11, y + j, j === 8 ? 4 : 6, 1, '#9a94a0');
    if (flip) { P(x + 10, y + 1, 8, 10, '#e4dece'); P(x + 10, y + 1, 1, 10, '#b8b0a0'); }        // lật trang
    P(x - 1, y + 5, 2, 3, O); P(x + 18, y + 5, 2, 3, O); P(x, y + 6, 1, 1, '#d99a6c'); P(x + 18, y + 6, 1, 1, '#d99a6c');   // 2 bàn tay cầm báo
  }

  // người đang đau trong đội (lúc chọn) -> nhớ lại cho pha kết quả (lúc đó chấn thương đã được chữa, s.team không còn inj)
  let seen = null;
  // tiếng "ting" mỗi người khỏi (1 lần mỗi người, mỗi lần mở cảnh)
  let heard = {};
  const sfx = (key, fn) => { if (heard[key]) return; heard[key] = 1; try { fn(SFC.Audio); } catch (e) { /* không có âm thanh: bỏ qua */ } };
  const hurtOf = (s) => (s.team || []).filter((m) => m.inj && m.inj.length).slice(0, SEAT.length);

  SFC.EvScene.add('physio', {
    paint(k) {
      seen = null; heard = {};
      k.street({ sun: false, lamp: null });
      tree(k);
      grass(k);
      SEAT.forEach((x, i) => stool(k, x, STOOL[i]));
      table(k);
    },
    draw(k, s) {
      const T = k.T(), res = s.phase === 'result';
      if (!res) seen = hurtOf(s);
      const hurt = (res ? seen : hurtOf(s)) || [], can = (s.can || []).includes(0), cost = s.E && s.E.choices[0].cost;
      const point = s.hover === 0 && can && !res, end = 0.35 + hurt.length * 0.3 + 0.25, healing = res && s.tp < end;
      // người ngồi ghế (quay về phía bàn) · kết quả: lần lượt từng người
      hurt.forEach((m, j) => {
        const cx = SEAT[j], bx = cx - 18, by = SY - 40, u = res ? s.tp - (0.35 + j * 0.3) : -1;
        if (u < 0) {
          fig(k, m.look, bx, by, { ex: { celPose: SIT }, t: 0 });
          m.inj.forEach((id) => { const w = WRAP[partOf(id)] || WRAP.ankle; wrap(k, bx + w[0], by + w[1]); });
          cross(k, bx + 17, by + 11 + (Math.floor(T * 1.4 + j * 0.7) % 2));
          return;
        }
        // đứng dậy: bật khỏi ghế xuống cỏ ngay trước ghế (0,2 s), vươn vai (tới 0,55 s), rồi đứng yên
        sfx('heal' + j, (A) => A.pick());
        const f = Math.min(1, u / 0.2), y0 = by - 2, y1 = GY + 1 - 40, y = Math.round(y0 + (y1 - y0) * f - Math.sin(f * Math.PI) * 4);
        const stretch = u > 0.12 && u < 0.55;
        fig(k, m.look, bx + 2, y, { ex: stretch ? { celPose: { arms: [[-4, -9], [4, -9]], eyes: 'happy', mouth: true } } : null, t: 0.3 + j });
        tick(k, bx + 21, y + 13 - (u < 0.1 ? 2 : 0));
        // băng bung ra: mảnh trắng bay lên rồi rơi xuống cỏ, nằm lại đó
        m.inj.forEach((id, q) => {
          const w = WRAP[partOf(id)] || WRAP.ankle, g = Math.min(1, u / 0.45), dir = q % 2 ? -1 : 1;
          const x = bx + w[0] + dir * (2 + g * 8), yy = by + w[1] + (GY + 2 + q - (by + w[1])) * g - Math.sin(g * Math.PI) * 9;
          k.P(Math.round(x) - 1, Math.round(yy) - 1, 5, 3, O); k.P(Math.round(x), Math.round(yy), 3, 1, '#f4efe2'); k.P(Math.round(x) + 1, Math.round(yy), 1, 1, '#e0475e');
        });
      });
      // chuyên viên: không ai đau -> ngồi mép bàn đọc báo (lâu lâu lật trang); còn lại đứng cạnh bàn, khăn vắt vai, trỏ Get treated / đang chữa = vẫy tay gọi
      if (!hurt.length && !res) {
        medkit(k, KX + 6, KY, false);
        const bx = TX - 2, by = TT - 38;
        fig(k, k.look(LOOK), bx, by, { kit: KIT, ex: { celPose: { drop: 3 } }, t: 0 });
        newspaper(k, bx, by, T % 5 > 4.6);
      } else {
        medkit(k, KX, KY, point || healing);
        const bx = PX - 20, by = GY - 40, wave = point || healing;
        fig(k, k.look(LOOK), bx, by, { kit: KIT, facing: Math.PI * 0.62, ex: wave ? { celPose: { arms: [[-7, -4 - (Math.floor(T * 4) % 2) * 2]] } } : null });
        towel(k, bx, by);
      }
      // tấm bìa giá dựng dưới chân bàn: lựa chọn chưa làm được = bìa xám, thiếu tiền = số đỏ
      if (cost) tag(k, TX + 8, GY - 9, cost, !can && !res, !res && hurt.length > 0 && s.cash < cost);
      // kết quả: 3 xu bay từ ô tiền xuống tấm bìa
      if (res) for (let i = 0; i < 3; i++) {
        const f = (s.tp - i * 0.08) / 0.45;
        if (f <= 0 || f >= 1) continue;
        const x0 = CASH[0], y0 = CASH[1], x1 = TX + 13, y1 = GY - 8, cx = 170, cy = -20;
        const x = (1 - f) * (1 - f) * x0 + 2 * f * (1 - f) * cx + f * f * x1, y = (1 - f) * (1 - f) * y0 + 2 * f * (1 - f) * cy + f * f * y1;
        coin(k, Math.round(x) - 2, Math.round(y) - 2, false);
      }
      // lá rơi từ tán cây (chuyển động nhỏ lặp lại)
      const lf = (T % 7) / 7;
      if (lf < 0.55) { const v = lf / 0.55; k.P(Math.round(230 + v * 20 + Math.sin(v * 9) * 4), Math.round(86 + v * 44), 2, 1, '#3e6440'); }
    },
    // trỏ chuột vào 1 người đang đau = tên + chấn thương + công dụng (SFC.Tip); toạ độ px của khung 640x360
    dom(s) {
      if (!s || s.phase !== 'choose') return '';
      const H = SFC.UIHelpers, B = (id) => SFC.Run.badge(id) || {};
      return hurtOf(s).map((m, j) => {
        const tip = H.tip({ name: m.name, color: '#ff8a98', lines: m.inj.map((id) => `${B(id).name} — ${B(id).desc || ''}`) });
        return `<i data-tip="${H.esc(tip)}" style="position:absolute;z-index:1;left:${(SEAT[j] - 12) * 2}px;top:${(SY - 28) * 2}px;width:${26 * 2}px;height:${36 * 2}px"></i>`;
      }).join('');
    },
  });
})();
