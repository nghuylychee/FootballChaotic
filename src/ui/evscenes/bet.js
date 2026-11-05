/* Cảnh sự kiện ??? CROSSBAR CHALLENGE (cú sút + 2 chồng xu) — khung chung + quy ước: src/ui/evscene.js · cách diễn: docs/ux-screens/screens/event-scenes.json
 * Nền lề đường chung thành sân đường phố: khung thành tự chế ở xa bên phải (xà lóe sáng mỗi vài giây = đích của thử thách), vạch vôi từ cột cờ góc
 * (phía trước bên trái) chạy tới khung thành, character của bạn đứng cạnh quả bóng. 3 đứa nhóc ngồi trên bờ tường thấp, đứa giữa ôm chồng xu to
 * (thẻ 60 = tiền thắng); dưới chân bạn chồng xu nhỏ (thẻ 25 = tiền cược). Trỏ Bet: chồng xu của bạn nhích về phía chồng 60 · trỏ Pass: bạn quay lưng
 * · thiếu tiền: chồng xu + thẻ của bạn xám.
 * Kết quả (~1,5 s rồi đứng yên): chồng xu của bạn trượt sang chồng của bọn nhóc, bạn sút. Thắng (res có cash): bóng dội xà "keng", xà rung, bọn nhóc
 * ôm má há hốc, cả chồng xu trượt về chân bạn. Thua (res có lost): bóng vọt qua xà ra đường, bọn nhóc ôm bụng cười, bạn ôm đầu. */
(function () {
  const O = '#120c16';
  const GY = 166;                          // chân character của bạn trên mặt đường
  const ME = 22;                           // mép trái khung sprite của bạn (thân ở giữa khung: x + 20)
  const BALL = [ME + 30, GY - 3];          // quả bóng nằm ngay mũi chân phải
  const MINE = [66, GY + 2];               // chồng xu của bạn: mép trái, đáy
  const WT = 113, WX0 = 70, WX1 = 172;     // bờ tường thấp: mặt trên, mép trái / phải
  const KIDS = [92, 121, 150];             // tâm 3 đứa nhóc ngồi trên tường
  const POT = [106, WT + 5];               // chồng xu to trong lòng đứa giữa (thấp, để còn thấy mặt): mép trái, đáy
  const G0 = 244, G1 = 292, GB = 94, GF = 131;   // khung thành: cột trái / phải, xà (mép trên), chân cột
  const HIT = [266, GB - 2];               // chỗ bóng dội xà
  // bọn nhóc (chung khuôn trẻ con với BIGGEST FAN: sprite cầu thủ, áo khác màu)
  const KID = [
    { look: { hair: 'cap', skin: 1, hairColor: 0 }, kit: { shirt: '#d8483c', shirtDark: '#9c2c26', shorts: '#2a2440', accent: '#ffd23f' } },
    { look: { hair: 'bowl', skin: 3, hairColor: 0 }, kit: { shirt: '#3a6ec0', shirtDark: '#264c8a', shorts: '#e8e4d8', accent: '#e8e4d8' } },
    { look: { hair: 'spiky', skin: 0, hairColor: 2 }, kit: { shirt: '#3e9c5a', shirtDark: '#2a6e3e', shorts: '#2a2440', accent: '#e8e4d8' } },
  ];
  // nhịp kết quả (giây từ lúc chọn): xu cược trượt sang · chạm bóng · bóng tới xà · xu thắng trượt về
  const T_STAKE = 0.3, T_KICK = 0.36, T_BAR = 1.0, T_WIN0 = 1.12, T_WIN1 = 1.45;

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
  const GOLD = { d: '#a8760c', y: '#ffd23f', h: '#fff3a8' }, GREY = { d: '#5e5666', y: '#9a90a0', h: '#c8c0cc' };
  function coin(k, x, y, dim) { const c = dim ? GREY : GOLD; COIN.forEach((r, j) => [...r].forEach((v, i) => { if (v !== '.') k.P(x + i, y + j, 1, 1, c[v]); })); }
  // thẻ số (bìa cát-tông, đồng xu + số): cx = tâm · dim = bìa xám, poor = số đỏ
  function tag(k, cx, y, n, dim, poor) {
    const label = String(n), w = 12 + textW(label), x = Math.round(cx - w / 2);
    k.P(x, y, w, 9, '#3a2410'); k.P(x + 1, y + 1, w - 2, 7, dim ? '#5a5060' : '#d8b27a'); k.P(x + 1, y + 7, w - 2, 1, dim ? '#3e3646' : '#a8824a');
    coin(k, x + 4, y + 2, dim);
    text(k, label, x + 10, y + 2, poor ? '#ff5a6e' : dim ? '#9a90a0' : '#3a2410');
  }
  // 1 cọc xu nhìn ngang (rộng 7): n đồng chồng lên nhau, mặt đồng trên cùng sáng · x = mép trái, y = đáy
  function stack(k, x, y, n, dim) {
    const c = dim ? GREY : GOLD, h = n * 2 + 1;
    k.P(x - 1, y - h - 2, 9, h + 3, O);
    for (let i = 0; i < n; i++) { k.P(x, y - 2 - i * 2, 7, 1, c.y); k.P(x, y - 1 - i * 2, 7, 1, c.d); }
    k.P(x, y - h - 1, 7, 1, c.y); k.P(x + 1, y - h - 1, 4, 1, c.h);
  }
  // chồng xu = vài cọc cao thấp đặt sát nhau (cọc giữa cao nhất) · cọc vẽ từ ngoài vào giữa để cọc giữa đè lên
  const SMALL = [[0, 3], [5, 2]], BIG = [[0, 2], [5, 3], [10, 4], [15, 4], [20, 3], [25, 2]];
  function pile(k, x, y, cols, dim) {
    const mid = (cols.length - 1) / 2;
    cols.map((c, i) => [c, i]).sort((a, b) => Math.abs(b[1] - mid) - Math.abs(a[1] - mid)).forEach(([[dx, n]]) => stack(k, x + dx, y, n, dim));
  }

  /* ---------- người: sprite cầu thủ 1x (drawAvatar, khung 40x44, chân ở hàng 40) qua bộ đệm riêng để truyền thêm tư thế (celPose / cú sút) ---------- */
  let fb = null;
  function fig(k, lk, x, y, o = {}) {
    fb = fb || Object.assign(document.createElement('canvas'), { width: 40, height: 44 });
    SFC.Sprites.drawAvatar(fb, lk, o.kit || k.kitHome(), o.t != null ? o.t : k.T(), o.facing != null ? o.facing : Math.PI / 2, o.ex || null, true);
    k.X.drawImage(fb, Math.round(x), Math.round(y));
  }
  // quả bóng 7x7 (trắng, 2 mảng đen, viền mực) · roll: xoay mảng theo nhịp
  function ball(k, x, y, roll) {
    x = Math.round(x); y = Math.round(y);
    k.dc(x, y, 3, O); k.dc(x, y, 2, '#f4f4f4');
    const r = Math.floor(roll || 0) % 2;
    k.P(x - 1 + r, y - 1, 2, 2, '#2a2430'); k.P(x + 1 - r * 2, y + 1, 1, 1, '#2a2430'); k.P(x - 1, y - 2, 2, 1, '#ffffff');
  }

  /* ---------- nền tĩnh: phố chung, vạch vôi, bờ tường, khung thành tự chế, cột cờ góc ---------- */
  function chalk(k) {
    // đường thành sân: xoá vạch kẻ làn xe của nền chung, thay bằng vạch vôi đã mòn (dither): cung góc quanh cột cờ + vạch biên chạy chéo
    // từ cột cờ tới chân cột trái của khung thành
    k.P(0, 170, k.LW, 2, '#2c2632');
    const c = '#b8b0a4';
    for (let a = 0; a <= 16; a++) { const t = (a / 16) * (Math.PI / 2); if (a % 3 !== 2) k.P(Math.round(12 + Math.cos(t) * 12), Math.round(172 - Math.sin(t) * 7), 1, 1, c); }
    const x0 = 12, y0 = 172, x1 = G0, y1 = GF + 3;
    for (let i = 0; i <= 120; i++) { const t = i / 120; if (k.hsh(i * 1.7) > 0.25) k.P(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), 2, 1, c); }
  }
  function wall(k) {
    const P = k.P;
    P(WX0, WT, WX1 - WX0, 134 - WT, O);
    P(WX0 + 1, WT + 3, WX1 - WX0 - 2, 133 - WT - 3, '#4e4054');
    for (let y = WT + 7; y < 133; y += 5) { P(WX0 + 1, y, WX1 - WX0 - 2, 1, '#3e3244'); for (let x = WX0 + 4 + ((y / 5) % 2) * 6; x < WX1 - 2; x += 12) P(x, y - 4, 1, 4, '#3e3244'); }
    P(WX0 + 1, WT + 1, WX1 - WX0 - 2, 2, '#7a6a7e'); P(WX0 + 1, WT + 1, WX1 - WX0 - 2, 1, '#94849a');   // gờ đỉnh tường
    for (let y = 134; y < 137; y++) k.d(WX0 + 2, y, WX1 + 2, '#0e0a12', 2);
  }
  function goalStatic(k) {
    const P = k.P;
    // lưới (lưới cá cũ buộc tạm): khung sau lệch lên phải, mắt lưới dither xám
    const bx = 7, by = -5;
    for (let y = GB + 3; y < GF; y += 3) for (let x = G0 + 3; x < G1 + bx; x += 3) P(x + ((y / 3) % 2), y, 1, 1, '#5a5262');
    k.ln(G0 + bx, GB + by, G1 + bx, GB + by, '#6a6272'); k.ln(G1 + bx, GB + by, G1 + bx, GF - 3, '#6a6272'); k.ln(G1, GF, G1 + bx, GF - 3, '#6a6272');
    for (let y = GF + 1; y < GF + 4; y++) k.d(G0 - 2, y, G1 + 10, '#0e0a12', 2);
    // 2 cọc (ống nhựa trắng ngà, quấn băng keo đỏ ở giữa): xà vẽ mỗi khung (rung khi trúng)
    [G0, G1].forEach((x) => { P(x - 1, GB, 5, GF - GB + 1, O); P(x, GB, 3, GF - GB, '#d4cebe'); P(x, GB, 1, GF - GB, '#ece6d6'); P(x + 2, GB, 1, GF - GB, '#a8a090'); P(x, GB + 18, 3, 3, '#b8423a'); });
  }
  function flag(k) {
    const P = k.P;
    P(11, 150, 3, 23, O); P(12, 151, 1, 21, '#d4cebe');
    P(13, 150, 9, 7, O); P(14, 151, 7, 2, '#ff8a3a'); P(14, 153, 5, 1, '#ff8a3a'); P(14, 154, 3, 1, '#c85a1c'); P(14, 151, 7, 1, '#ffb070');
    k.shadow(12, 172, 3);
  }
  // xà ngang: rung theo dạng cong (giữa xà lệch nhiều nhất) · glint: vệt sáng chạy dọc xà
  function bar(k, wob, glint) {
    const P = k.P;
    for (let x = G0 - 1; x <= G1 + 3; x++) {
      const u = (x - G0) / (G1 - G0), dy = Math.round(wob * Math.sin(Math.max(0, Math.min(1, u)) * Math.PI));
      P(x, GB - 2 + dy, 1, 5, O);
      if (x >= G0 && x <= G1 + 2) { P(x, GB - 1 + dy, 1, 3, '#d4cebe'); P(x, GB - 1 + dy, 1, 1, '#ece6d6'); P(x, GB + 1 + dy, 1, 1, '#a8a090'); }
    }
    if (glint != null) { const gx = Math.round(G0 + glint * (G1 - G0)); P(gx, GB - 1, 3, 1, '#ffffff'); P(gx + 1, GB - 2, 1, 3, '#ffffff'); }
  }

  // bọn nhóc ngồi trên tường: sprite đứng nâng lên cho hông ở mặt tường, chân thòng xuống mặt trước tường
  const KID_Y = WT + 2 - 36;
  function kid(k, i, pose, t) {
    const K = KID[i];
    fig(k, k.look(K.look), KIDS[i] - 20, KID_Y + (pose && pose.bob ? pose.bob : 0), { kit: K.kit, ex: pose && pose.cp ? { celPose: pose.cp } : null, t, facing: Math.PI / 2 + (i - 1) * 0.35 });
  }
  // há hốc: 2 tay ôm má, miệng mở · ôm bụng cười: mắt cười, 2 tay gập ngang bụng, đầu gật theo nhịp cười (headDy)
  const GAPE = { arms: [[-3, -3, -2, -8], [3, -3, 2, -8]], bend: true, mouth: true };
  const LAUGH = (b) => ({ eyes: 'happy', mouth: true, arms: [[2, 3, 5, 3], [-2, 3, -5, 3]], bend: true, headDy: b });

  // tiếng (1 lần mỗi lần mở cảnh): sút · keng · vụt qua
  let heard = {};
  const sfx = (key, fn) => { if (heard[key]) return; heard[key] = 1; try { fn(SFC.Audio); } catch (e) { /* không có âm thanh: bỏ qua */ } };
  const bez = (a, c, b, t) => (1 - t) * (1 - t) * a + 2 * t * (1 - t) * c + t * t * b;
  const ease = (t) => 1 - (1 - t) * (1 - t);

  SFC.EvScene.add('bet', {
    paint(k) {
      heard = {};
      k.street({ sun: false, lamp: null });
      chalk(k);
      wall(k);
      goalStatic(k);
      flag(k);
    },
    draw(k, s) {
      const T = k.T(), res = s.phase === 'result', tp = res ? s.tp : 0, P = k.P;
      const cost = (s.E && s.E.choices[0].cost) || 25, win = (s.E && s.E.choices[0].win && s.E.choices[0].win.cash) || 60;
      const can = (s.can || []).includes(0), poor = !res && !can;
      const won = res && (s.res || []).some((x) => x.kind === 'cash'), lost = res && !won;
      const me = (s.team || []).find((m) => m.you) || (s.team || [])[0];
      const look = me ? me.look : k.look({});
      // xà: lóe sáng mỗi 3,2 giây (lúc chọn) · trúng xà: rung tắt dần 0,5 s
      const gl = !res && T % 3.2 < 0.35 ? (T % 3.2) / 0.35 : null;
      const hitT = tp - T_BAR, wob = won && hitT > 0 && hitT < 0.5 ? Math.sin(hitT * 45) * 2.5 * (1 - hitT / 0.5) : 0;
      bar(k, wob, gl);
      // bọn nhóc: lúc chọn thỉnh thoảng nhún 1 pixel (đứa trái / phải lệch nhịp) · thắng: ôm má há hốc · thua: ôm bụng cười (gật đầu theo nhịp)
      const react = res && tp > T_BAR + 0.05;
      const laughBob = Math.floor(T * 5) % 2;
      for (let i = 0; i < 3; i++) {
        if (i === 1) continue;   // đứa giữa vẽ cùng chồng xu
        const pose = react ? (won ? { cp: GAPE } : { cp: LAUGH((laughBob + i) % 2), bob: (laughBob + i) % 2 }) : { bob: (T * 0.7 + i * 0.4) % 1 < 0.14 ? -1 : 0 };
        kid(k, i, pose, 0.2 + i);
      }
      // chồng xu to: trong lòng đứa giữa · thắng: trượt về chân bạn
      let px = POT[0], py = POT[1];
      if (won && tp > T_WIN0) { const f = ease(Math.min(1, (tp - T_WIN0) / (T_WIN1 - T_WIN0))); px = POT[0] + (MINE[0] - 8 - POT[0]) * f; py = POT[1] + (MINE[1] - POT[1]) * f - Math.sin(f * Math.PI) * 10; }
      const potHere = !(won && tp > T_WIN0);
      kid(k, 1, react ? (won ? { cp: GAPE } : { cp: LAUGH(laughBob), bob: laughBob }) : null, 1.2);
      if (potHere) {
        pile(k, px, py, BIG);
        if (res && tp > T_STAKE) pile(k, px + 31, py, SMALL);   // xu cược của bạn đã nằm cạnh chồng của bọn nhóc
        if (!react || lost) [px - 3, px + 32].forEach((hx) => { P(hx, py - 7, 3, 4, O); P(hx + 1, py - 6, 1, 2, '#6e4428'); });   // 2 bàn tay ôm chồng xu
      }
      tag(k, POT[0] + 16, WT + 9, win, false, false);   // thẻ 60 dán trên mặt tường
      // character của bạn: nhìn về khung thành · trỏ Pass: quay lưng · kết quả: sút, rồi giơ tay (thắng) / ôm đầu (thua)
      let ex = null, facing = 0.25;
      if (!res && s.hover === 1) facing = Math.PI * 1.15;
      if (res) {
        const kt = tp - (T_KICK - 0.04);
        if (kt > -0.25 && kt < 0.3) { facing = 0; ex = { atkType: 'shoot', atkT: Math.max(0, kt) }; }
        if (react) ex = won ? { celPose: { arms: [[-4, -9], [4, -9]], eyes: 'happy', mouth: true } } : { celPose: { arms: [[-4, -6, 3, -13], [4, -6, -3, -13]], bend: true, armsBehind: true, eyes: 'closed' } };
        if (react) facing = Math.PI / 2;
      }
      k.shadow(ME + 20, GY - 1, 7);
      fig(k, look, ME, GY - 40, { facing, ex });
      // chồng xu của bạn + thẻ 25 · trỏ Bet: nhích về phía chồng 60 · thiếu tiền: xám · kết quả: trượt sang chồng của bọn nhóc
      const nudge = !res && s.hover === 0 && can ? Math.round(4.5 + 2.5 * Math.sin(T * 5)) : 0;   // nhích chéo lên phía chồng 60
      if (!res) pile(k, MINE[0] + nudge, MINE[1] - Math.round(nudge * 0.7), SMALL, poor);
      else if (tp < T_STAKE) { const f = ease(tp / T_STAKE); pile(k, bez(MINE[0], 100, POT[0] + 31, f), bez(MINE[1], 84, POT[1], f), SMALL); }
      if (!res) tag(k, MINE[0] + 6, GY + 4, cost, poor, poor && s.cash < cost);
      // thắng: chồng xu to đang trượt / đã về chân bạn
      if (!potHere) { pile(k, px, py, BIG); pile(k, px + 31, py, SMALL); }
      // quả bóng: nằm cạnh chân · bay theo đường cong tới xà (thắng: dội ngược ra, rơi xuống mặt đường; thua: vọt qua xà ra khỏi khung)
      const ft = tp - T_KICK, fd = T_BAR - T_KICK;
      if (!res || ft < 0) ball(k, BALL[0], BALL[1], 0);
      else if (ft < fd) {
        const f = ft / fd, ex1 = won ? HIT : [338, 114], cx = won ? 160 : 176, cy = won ? -4 : 6;
        const x = bez(BALL[0], cx, ex1[0], f), y = bez(BALL[1], cy, ex1[1], f), g = GF + 2 + (GY - GF) * (1 - Math.min(1, (x - BALL[0]) / (G0 - BALL[0])));
        k.shadow(Math.round(x), Math.round(Math.max(GF, g)), 2);
        ball(k, x, y, f * 10);
        sfx('kick', (A) => A.kick(1));
        if (!won && f > 0.72) sfx('whoosh', (A) => A.whoosh());
      } else if (won) {
        // dội xà: bật ngược lên rồi rơi xuống mặt đường trước bờ tường, nảy 1 cái, nằm yên
        sfx('clang', (A) => A.clang());
        const r = ft - fd, f = Math.min(1, r / 0.42), x = bez(HIT[0], 206, 150, f), y = bez(HIT[1], 30, 150, f);
        if (r < 0.12) for (let i = 0; i < 4; i++) { const a = -2.4 + i * 0.75, l = 3 + Math.floor(r * 40); P(Math.round(HIT[0] + Math.cos(a) * l), Math.round(HIT[1] + 2 + Math.sin(a) * l), 2, 1, i % 2 ? '#fff3a8' : '#ffffff'); }
        if (f < 1) ball(k, x, y, 10 + f * 8);
        else { const b = Math.min(1, (r - 0.42) / 0.2), bx = 150 - b * 8, by = 150 - Math.sin(b * Math.PI) * 4; ball(k, bx, by, 18 + b * 3); if (b >= 1) sfx('bounce', (A) => A.bounce(0.4)); }
      }
    },
  });
})();
