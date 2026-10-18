/* StoryCup — khuôn cảnh cut scene của FOOTBALL STORY (docs/FOOTBALL_STORY.md), vẽ procedural như PROLOGUE (src/ui/story.js).
 * Mỗi khuôn nhận tham số từ cảnh (src/ui/cup.js dựng cảnh từ lời thoại trong config/stories.config.js), dùng lại được cho mọi Story:
 *   cupAlley  nơi tổ chức cup (nền theo theme) + cúp trên thùng gỗ, khán giả (zoom: 1 = phóng dần vào cúp)
 *   cupHost   bình luận viên cầm loa trên thùng gỗ, sóng âm, tia màu Story
 *   cupFace   đối mặt VS: màn chia chéo 2 màu áo, character của bạn trái · đội trưởng đối thủ phải, tia sét giữa
 *   cupTalk   cận cảnh người nói (who: you / opp) trên nền tia màu áo
 *   cupSad    đối thủ vừa thua ngồi thất thần dưới đám mây mưa, bạn bỏ đi
 *   cupRival  đội kình địch (team) đè bẹp đối thủ ở nhánh bên kia: trời đỏ, sét, bảng tỉ số
 *   cupLift   nâng cúp: khán giả, đèn quét, pháo giấy, 2 đồng đội nhảy cẫng
 * Tham số chung: team (id đội trong teams.list), color (màu Story), who, theme (nền: alley · rooftop · market · stadium),
 * trophy (cúp: pot = nồi cơm vàng · cup = cúp vàng), fillers (đội lấp của Story: cupRival vẽ 2 đội bị đè bẹp).
 */
window.SFC = window.SFC || {};

(function () {
  const S = SFC.Story;
  const TEAMS = () => SFC_CONFIG.teams.list;
  const GOLD = '#ffd23f', GOLD_D = '#c9a020', GOLD_L = '#fff3a8';
  const HOST_LOOK = { skin: '#d99a6c', hair: '#1a1216', cut: 'cap', face: 'mustache', shoes: 'slides', fx: 'nofx' };
  const HOST_KIT = { shirt: '#ff3d5a', shirtDark: '#a81d30', shorts: '#2a2440', accent: '#ffd23f', hair: ['#1a1216'] };
  // sprite cầu thủ 40x44: thân từ hàng 17 (đỉnh đầu) tới 43 (chân) -> vẽ ở (x, y) cỡ s: đỉnh đầu = y - 23s, miệng ~ y - 17s
  const HEAD = 23, MOUTH = 17;
  const rgb = (hex) => { const n = parseInt(String(hex || '#ffffff').slice(1, 7), 16); return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`; };

  // đội trưởng đội (cầu thủ cuối = ĐÁ CAO): look + kit
  function captain(id, idx = 2) {
    const t = TEAMS()[id];
    if (!t) return null;
    return { look: SFC.MainPath.teamLook(id, idx), kit: t.kit };
  }
  // cúp nồi cơm vàng (đơn vị s px, cx = giữa, by = đáy)
  function pot(H, cx, by, s, t) {
    const R = (x, y, w, h, c) => H.rect(cx + x * s, by + y * s, w * s, h * s, c);
    R(-8, -12, 16, 12, H.INK); R(-7, -11, 14, 10, GOLD); R(-7, -4, 14, 2, GOLD_D);
    R(-10, -14, 20, 3, H.INK); R(-9, -14, 18, 2, GOLD_L);
    R(-11, -10, 3, 4, H.INK); R(8, -10, 3, 4, H.INK); R(-10, -9, 1, 2, GOLD); R(9, -9, 1, 2, GOLD);
    R(2, -8, 3, 2, GOLD_D);                                   // vết méo
    const sh = Math.floor(t * 2) % 6;                        // ánh sáng chạy ngang
    R(-6 + sh * 2, -10, 2, 6, GOLD_L);
  }
  // cúp vàng cổ điển (đơn vị s px, cx = giữa, by = đáy)
  function goldCup(H, cx, by, s, t) {
    const R = (x, y, w, h, c) => H.rect(cx + x * s, by + y * s, w * s, h * s, c);
    R(-7, -3, 14, 3, H.INK); R(-6, -3, 12, 2, GOLD_D);                       // đế
    R(-2, -8, 4, 5, H.INK); R(-1, -8, 2, 5, GOLD);                            // thân
    R(-9, -20, 18, 12, H.INK); R(-8, -19, 16, 10, GOLD); R(-8, -11, 16, 2, GOLD_D); R(-6, -9, 12, 1, GOLD_D);
    R(-12, -18, 3, 7, H.INK); R(9, -18, 3, 7, H.INK); R(-11, -17, 1, 5, GOLD); R(10, -17, 1, 5, GOLD);   // 2 quai
    R(-9, -21, 18, 2, GOLD_L);
    const sh = Math.floor(t * 2) % 6;
    R(-6 + sh * 2, -18, 2, 7, GOLD_L);
  }
  function trophy(H, kind, cx, by, s, t) { if (kind === 'cup') goldCup(H, cx, by, s * 0.8, t); else pot(H, cx, by, s, t); }
  // dây đèn lồng tròn võng giữa 2 điểm (chợ đêm), nhấp nháy
  function lanterns(H, x0, y0, x1, y1, sag, t, n = 14) {
    const ctx = H.ctx;
    ctx.strokeStyle = '#1a0a14'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, y0);
    for (let i = 1; i <= 20; i++) { const k = i / 20; ctx.lineTo(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k + Math.sin(k * Math.PI) * sag); }
    ctx.stroke();
    for (let i = 0; i < n; i++) {
      const k = (i + 0.5) / n, x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k + Math.sin(k * Math.PI) * sag + 8;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; H.glow(x, y, 22, '255,80,60', 0.35 + Math.sin(t * 3 + i) * 0.08); ctx.restore();
      H.rect(x - 7, y - 8, 14, 16, H.INK); H.rect(x - 6, y - 7, 12, 14, '#e8322a'); H.rect(x - 6, y - 2, 12, 2, '#ffd23f'); H.rect(x - 2, y + 7, 4, 4, '#ffd23f');
    }
  }
  /* nền nơi tổ chức theo theme, trả về độ cao mặt sân (y). dim: tối bớt (cảnh buồn) */
  function backdrop(H, t, theme, dim = 0) {
    const ctx = H.ctx;
    if (theme === 'rooftop') {
      H.rect(0, 0, H.W, H.H, H.vgrad(0, 230, ['#03050f', '#0a1430', '#1e3060']));
      for (let i = 0; i < 70; i++) { const tw = Math.sin(t * 3 + i * 1.7) > 0.6; H.rect(H.hash(i) * H.W, H.hash(i + 50) * 120, tw ? 2 : 1, tw ? 2 : 1, '#e8ecf5'); }
      ctx.fillStyle = '#fff3c0'; ctx.beginPath(); ctx.arc(530, 58, 24, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0a1430'; ctx.beginPath(); ctx.arc(541, 52, 21, 0, Math.PI * 2); ctx.fill();   // trăng lưỡi liềm
      // đường chân trời thành phố
      for (let i = 0, x = 0; x < H.W; i++) {
        const w = 26 + H.hash(i + 3) * 40, h = 40 + H.hash(i + 7) * 80;
        H.rect(x, 230 - h, w, h, '#0c1226');
        for (let y = 230 - h + 6; y < 222; y += 9) for (let xx = x + 4; xx < x + w - 4; xx += 7) if (H.hash(xx * 0.3 + y) > 0.62) H.rect(xx, y, 3, 4, '#ffd27a');
        x += w + 2;
      }
      // bồn nước + cột ăng-ten đèn đỏ
      H.rect(40, 120, 4, 110, '#1a2238'); H.rect(84, 120, 4, 110, '#1a2238'); H.rect(30, 80, 68, 44, '#2a3450'); H.rect(30, 76, 68, 6, '#3a4668');
      H.rect(586, 70, 4, 160, '#1a2238'); if (Math.floor(t * 1.5) % 2) { H.glow(588, 70, 14, '255,60,60', 0.8); H.rect(585, 66, 7, 7, '#ff3d3d'); }
      H.rect(0, 230, H.W, H.H - 230, H.vgrad(230, H.H, ['#3a3f4c', '#15171f']));
      for (let x = 0; x < H.W; x += 34) H.rect(x, 216, 3, 16, '#4a5064');
      H.rect(0, 216, H.W, 3, '#5a6078');   // lan can
    } else if (theme === 'market') {
      H.rect(0, 0, H.W, H.H, H.vgrad(0, 230, ['#0e0612', '#2a0e2a', '#4a1830']));
      lanterns(H, 0, 30, 640, 40, 30, t);
      lanterns(H, 0, 86, 640, 76, 22, t + 2, 11);
      // các sạp: mái sọc + quầy + khói bốc
      const cols = [['#e8322a', '#fff3d6'], ['#ffd23f', '#3a8a44'], ['#3ff6ff', '#2046a8'], ['#ff3fb4', '#fff3d6']];
      for (let i = 0; i < 6; i++) {
        const x = i * 112 - 20, c = cols[i % 4];
        for (let k = 0; k < 8; k++) H.rect(x + k * 12, 150, 12, 18, c[k % 2]);
        H.rect(x, 168, 96, 4, H.INK); H.rect(x + 6, 172, 84, 58, '#2a1820'); H.rect(x + 6, 200, 84, 4, '#4a2a30');
        H.rect(x + 14, 186, 10, 14, '#ffd27a'); H.rect(x + 60, 188, 16, 12, '#c9781a');
        for (let k = 0; k < 3; k++) { const y = 140 - ((t * 30 + k * 20 + i * 7) % 60); H.rect(x + 40 + Math.sin(t * 2 + k + i) * 4, y, 6, 6, `rgba(230,230,240,${0.25 - (140 - y) / 260})`); }
      }
      H.rect(0, 230, H.W, H.H - 230, H.vgrad(230, H.H, ['#3a2430', '#140a10']));
      for (let x = 0; x < H.W; x += 40) H.rect(x, 230, 1, H.H - 230, 'rgba(0,0,0,0.25)');
    } else if (theme === 'stadium') {
      H.rect(0, 0, H.W, H.H, H.vgrad(0, H.H, ['#02030c', '#0a1030', '#10183e']));
      H.crowd(t, 50, 196, 8);
      H.rect(0, 46, H.W, 6, '#05060f');
      [70, 570].forEach((x) => { H.rect(x - 2, 0, 4, 46, '#1a1e30'); H.rect(x - 22, 0, 44, 14, '#e8ecf5'); ctx.save(); ctx.globalCompositeOperation = 'lighter'; H.glow(x, 10, 60, '255,250,220', 0.5); ctx.restore(); });
      H.rect(0, 196, H.W, H.H - 196, H.vgrad(196, H.H, ['#1f6a34', '#2a8a44']));
      for (let i = 0; i < 9; i++) H.rect(0, 196 + i * i * 2.2, H.W, 1, 'rgba(255,255,255,0.05)');
      ctx.strokeStyle = 'rgba(236,240,220,0.4)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(320, 290, 140, 30, 0, 0, Math.PI * 2); ctx.stroke();
    } else {
      H.rect(0, 0, H.W, H.H, H.vgrad(0, 230, ['#2a1640', '#7a2e4a', '#ff8a3d']));
      H.glow(320, 200, 160, '255,170,80', 0.5);
      buildings(H, t);
      bunting(H, 0, 40, 640, 64, 34, t, ['#ff3d5a', GOLD, '#3ff6ff', '#9dff3d', '#ff9a3d']);
      bunting(H, 0, 92, 640, 80, 24, t + 1, [GOLD, '#ff3fb4', '#ffffff']);
      H.rect(0, 230, H.W, H.H - 230, H.vgrad(230, H.H, ['#3a2a38', '#140c16']));
      ctx.strokeStyle = 'rgba(236,228,200,0.25)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(320, 300, 150, 26, 0, 0, Math.PI * 2); ctx.stroke();
    }
    if (dim) H.rect(0, 0, H.W, H.H, `rgba(8,10,24,${dim})`);
    return theme === 'stadium' ? 196 : 230;
  }
  // dây cờ đuôi nheo võng giữa 2 điểm, lay theo gió
  function bunting(H, x0, y0, x1, y1, sag, t, cols) {
    const ctx = H.ctx, n = 22;
    ctx.strokeStyle = '#1a1220'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const k = i / n, x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k + Math.sin(k * Math.PI) * sag;
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.stroke();
    for (let i = 0; i < n; i++) {
      const k = (i + 0.5) / n, x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k + Math.sin(k * Math.PI) * sag;
      const sw = Math.sin(t * 3 + i) * 2;
      ctx.fillStyle = cols[i % cols.length];
      ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x + 6, y); ctx.lineTo(x + sw, y + 12); ctx.fill();
    }
  }
  // dãy nhà 2 bên hẻm, cửa sổ sáng đèn (nhấp nháy chậm)
  function buildings(H, t, dark = '#1a1020') {
    const win = (x, y, k) => H.rect(x, y, 10, 12, H.hash(k + Math.floor(t * 0.5) * 0.01) > 0.35 ? '#ffd27a' : '#3a2a40');
    H.rect(0, 30, 150, 250, dark); H.rect(150, 70, 30, 210, H.shade(dark, -0.3));
    H.rect(470, 50, 170, 230, dark); H.rect(455, 90, 20, 190, H.shade(dark, -0.3));
    for (let r = 0; r < 7; r++) for (let c = 0; c < 4; c++) { win(18 + c * 32, 50 + r * 30, r * 7 + c); win(490 + c * 34, 70 + r * 28, 99 + r * 5 + c); }
    // biển hiệu neon nhỏ
    H.rect(150, 120, 26, 40, '#2a1830'); H.rect(153, 123, 20, 34, Math.floor(t * 2) % 2 ? '#ff3fb4' : '#a8247a');
  }
  // mảnh pháo giấy rơi
  function confetti(H, t, n, speed = 50) {
    for (let i = 0; i < n; i++) {
      const x = (H.hash(i) * H.W + Math.sin(t * 2 + i) * 14) % H.W;
      const y = (H.hash(i + 40) * H.H + t * (speed + H.hash(i + 3) * 40)) % H.H;
      H.rect(x, y, 3, 2 + (i % 2), [GOLD, '#ff3fb4', '#3ff6ff', '#ffffff', '#9dff3d'][i % 5]);
    }
  }
  // nền tia toả từ 1 điểm, màu c (hex)
  function burst(H, cx, cy, c, t, dark = 0.72) {
    H.rect(0, 0, H.W, H.H, H.vgrad(0, H.H, [H.shade(c, -dark), H.shade(c, -dark - 0.12)]));
    H.speedLines(cx, cy, 70, t, 0.16, rgb(H.shade(c, 0.2)));
    H.glow(cx, cy, 200, rgb(c), 0.25);
  }

  /* ---------- nơi tổ chức cup + cúp ---------- */
  S.addArt('cupAlley', (t, d, sc, H) => {
    const ctx = H.ctx, z = sc.zoom ? 1 + H.easeOut(H.clamp01(t / Math.max(1, d))) * 0.9 : 1 + t * 0.01;
    ctx.save();
    ctx.translate(320, 245); ctx.scale(z, z); ctx.translate(-320, -245);
    backdrop(H, t, sc.theme);
    // thùng gỗ + cúp toả sáng
    H.rect(286, 232, 68, 36, H.INK); H.rect(289, 235, 62, 30, '#8a5a30'); H.rect(289, 248, 62, 2, '#6a4020'); H.rect(318, 235, 2, 30, '#6a4020');
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    H.glow(320, 214, 70 + Math.sin(t * 4) * 6, '255,210,80', 0.55);
    ctx.restore();
    trophy(H, sc.trophy, 320, 234, 2.2, t);
    // khán giả 2 bên (bóng đầu nhấp nhô)
    for (let i = 0; i < 46; i++) {
      const side = i % 2, x = side ? 470 + H.hash(i) * 170 : H.hash(i) * 170, y = 300 + H.hash(i + 9) * 50;
      const bob = Math.sin(t * 6 + i) > 0.5 ? -2 : 0;
      H.rect(x, y + bob, 12, 12, ['#2a1a30', '#3a2440', '#24182c'][i % 3]); H.rect(x, y + 12 + bob, 14, 30, '#1a1020');
    }
    ctx.restore();
    H.vignette(0.6);
    if (S.cueOnce('crowd', true)) SFC.Audio.crowdApplause(0.5);
  });

  /* ---------- bình luận viên ---------- */
  S.addArt('cupHost', (t, d, sc, H) => {
    const ctx = H.ctx, c = sc.color || '#ff9a3d';
    burst(H, 170, 170, c, t);
    // sóng âm từ loa
    ctx.strokeStyle = `rgba(${rgb(H.shade(c, 0.4))},0.7)`; ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      const r = ((t * 120 + i * 50) % 200) + 30;
      ctx.globalAlpha = 1 - r / 230;
      ctx.beginPath(); ctx.arc(300, 200, r, -0.6, 0.6); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // thùng gỗ + bình luận viên nhún theo nhịp
    H.rect(90, 296, 170, 64, H.INK); H.rect(94, 300, 162, 60, '#8a5a30'); H.rect(94, 322, 162, 3, '#6a4020');
    const bob = Math.floor(t * 4) % 2, hx = 170, hy = 318 + bob, hs = 8;
    H.figure(hx, hy, hs, t, HOST_LOOK, HOST_KIT, 0);
    // loa cầm tay trước miệng
    const mx = hx + 7 * hs, my = hy - (MOUTH - 2) * hs;
    H.rect(mx - 14, my + 6, 12, 8, HOST_LOOK.skin);   // tay cầm loa
    ctx.fillStyle = H.INK; ctx.beginPath(); ctx.moveTo(mx - 4, my - 12); ctx.lineTo(mx + 66, my - 36); ctx.lineTo(mx + 66, my + 36); ctx.lineTo(mx - 4, my + 12); ctx.fill();
    ctx.fillStyle = '#e8ecf5'; ctx.beginPath(); ctx.moveTo(mx, my - 8); ctx.lineTo(mx + 62, my - 31); ctx.lineTo(mx + 62, my + 31); ctx.lineTo(mx, my + 8); ctx.fill();
    H.rect(mx + 56, my - 31, 6, 62, '#ff3d5a');
    H.vignette(0.5);
    if (S.cueOnce('host', true)) SFC.Audio.whistle();
  });

  /* ---------- đối mặt VS ---------- */
  S.addArt('cupFace', (t, d, sc, H) => {
    const ctx = H.ctx, op = captain(sc.team), me = SFC_CONFIG.mainPath.playerTeam.kit;
    const oc = op ? op.kit.shirt : '#888888', mc = me.accent || GOLD;
    // 2 nửa chéo
    ctx.save();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(360, 0); ctx.lineTo(280, 360); ctx.lineTo(0, 360); ctx.clip();
    burst(H, 150, 200, mc, t, 0.62);
    ctx.restore();
    ctx.save();
    ctx.beginPath(); ctx.moveTo(360, 0); ctx.lineTo(640, 0); ctx.lineTo(640, 360); ctx.lineTo(280, 360); ctx.clip();
    burst(H, 490, 200, oc, t + 3, 0.55);
    ctx.restore();
    // 2 người trượt vào từ 2 bên
    const k = H.easeOut(H.clamp01(t / 0.35));
    H.figure(-80 + k * 240, 320, 9, t, SFC.Profile.lookOf(), me, 0);
    if (op) H.figure(720 - k * 240, 320, 9, t, op.look, op.kit, Math.PI);
    // tia sét dọc đường chéo
    if (t > 0.3) {
      ctx.strokeStyle = Math.floor(t * 14) % 2 ? '#ffffff' : '#ffe98a'; ctx.lineWidth = 4;
      ctx.beginPath();
      for (let i = 0; i <= 12; i++) {
        const q = i / 12, x = 360 - q * 80 + (i % 2 ? 1 : -1) * (6 + H.hash(i + Math.floor(t * 10)) * 8);
        if (i) ctx.lineTo(x, q * 360); else ctx.moveTo(x, 0);
      }
      ctx.stroke();
    }
    if (t < 0.12 || (t > 0.32 && t < 0.4)) H.rect(0, 0, H.W, H.H, 'rgba(255,255,255,0.75)');
    H.vignette(0.45);
    if (S.cueOnce('slam', t > 0.32)) { SFC.Audio.hit(); SFC.Audio.crowdRoar(0.6); }
  });

  /* ---------- cận cảnh người nói ---------- */
  S.addArt('cupTalk', (t, d, sc, H) => {
    const you = sc.who !== 'opp', op = captain(sc.team);
    const look = you || !op ? SFC.Profile.lookOf() : op.look, kit = you || !op ? SFC_CONFIG.mainPath.playerTeam.kit : op.kit;
    const c = you ? (kit.accent || GOLD) : kit.shirt, x = you ? 200 : 440;
    burst(H, x, 150, c, t);
    // chấm halftone góc màn
    for (let y = 0; y < H.H; y += 8) for (let xx = you ? 520 : 0; xx < (you ? 640 : 120); xx += 8) {
      const r = (you ? xx - 520 : 120 - xx) / 40;
      if (r > 0.3) H.rect(xx, y, r, r, 'rgba(255,255,255,0.08)');
    }
    const k = H.easeOut(H.clamp01(t / 0.25)), bob = Math.round(Math.sin(t * 3) * 2);
    H.figure(x + (you ? -1 : 1) * (1 - k) * 120, 60 + HEAD * 11 + bob, 11, t, look, kit, you ? 0 : Math.PI);
    H.vignette(0.5);
    if (S.cueOnce('in', true)) SFC.Audio.whoosh();
  });

  /* ---------- đối thủ vừa thua ---------- */
  S.addArt('cupSad', (t, d, sc, H) => {
    const ctx = H.ctx, op = captain(sc.team);
    backdrop(H, t, sc.theme, 0.55);
    // đám mây mưa riêng trên đầu
    const cx = 400, cy = 150 + Math.sin(t * 1.5) * 3;
    ctx.fillStyle = '#3a3f52';
    [[-40, 6, 30], [0, 0, 38], [42, 8, 28], [-10, 14, 30], [22, 16, 26]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(cx + dx, cy + dy, r, 0, Math.PI * 2); ctx.fill(); });
    ctx.strokeStyle = 'rgba(160,190,230,0.6)'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 16; i++) { const x = cx - 50 + H.hash(i) * 100, y = (cy + 30 + H.hash(i + 5) * 60 + t * 240) % 60 + cy + 24; ctx.moveTo(x, y); ctx.lineTo(x - 2, y + 10); }
    ctx.stroke();
    if (op) H.figure(cx, 330, 5, 0.1, op.look, op.kit, Math.PI / 2, null, 0.9);
    // giọt mồ hôi
    H.rect(cx + 34, 330 - HEAD * 5 + 6 + (t * 20) % 16, 5, 7, '#bfe6ff');
    // bạn bỏ đi (quay lưng, nhỏ dần)
    const k = H.clamp01(t / Math.max(1, d));
    H.figure(170 - k * 60, 330, 3.4 - k * 0.6, t, SFC.Profile.lookOf(), SFC_CONFIG.mainPath.playerTeam.kit, -Math.PI / 2);
    H.vignette(0.65);
  });

  /* ---------- kình địch đè bẹp nhánh bên kia ---------- */
  S.addArt('cupRival', (t, d, sc, H) => {
    const ctx = H.ctx, op = captain(sc.team);
    H.rect(0, 0, H.W, H.H, H.vgrad(0, H.H, ['#1a0508', '#4a0e18', '#200810']));
    const flash = H.hash(Math.floor(t * 6)) > 0.82;
    if (flash) H.rect(0, 0, H.W, H.H, 'rgba(255,200,200,0.25)');
    // bảng tỉ số trên tường
    H.rect(420, 40, 170, 70, H.INK); H.rect(426, 46, 158, 58, '#1a1020');
    ctx.fillStyle = '#ff3d5a'; ctx.font = '22px "Press Start 2P"'; ctx.textAlign = 'center';
    ctx.fillText(`${Math.min(7, 1 + Math.floor(t * 2))} - 0`, 505, 86); ctx.textAlign = 'left';
    H.rect(0, 260, H.W, 100, H.vgrad(260, H.H, ['#2a1018', '#0a0406']));
    // 2 đối thủ nằm sóng soài
    [[150, 300], [500, 320]].forEach(([x, y], i) => {
      const v = sc.fillers || ['alley_cats', 'trash_pandas'], f = captain(v[i] || v[0], i) || captain('alley_cats', 0);
      if (!f) return;
      ctx.save(); ctx.translate(x, y); ctx.rotate(i ? -Math.PI / 2 : Math.PI / 2);
      H.figure(0, 0, 3, 0, f.look, f.kit, Math.PI / 2, null, 0.85);
      ctx.restore();
    });
    // đội trưởng kình địch toả sát khí
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    H.glow(320, 220, 140, '255,60,80', 0.45 + Math.sin(t * 6) * 0.1);
    ctx.restore();
    if (op) H.figure(320, 350, 6, t, op.look, op.kit, Math.PI / 2);
    H.speedLines(320, 200, 40, t, 0.1, '255,120,120');
    H.vignette(0.7);
    if (S.cueOnce('boom', true)) SFC.Audio.hit();
  });

  /* ---------- nâng cúp ---------- */
  S.addArt('cupLift', (t, d, sc, H) => {
    const ctx = H.ctx, P = SFC_CONFIG.mainPath.playerTeam;
    backdrop(H, t, sc.theme);
    if (sc.theme !== 'stadium') H.crowd(t, 130, 200, 6);
    H.beams(t, ['255,240,190', '255,200,240', '190,220,255', '255,240,190']);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    H.glow(320, 200, 150, '255,200,60', 0.5 + Math.sin(t * 5) * 0.1);
    ctx.restore();
    // 2 đồng đội nhảy cẫng 2 bên
    [[190, 0], [450, 1]].forEach(([x, i]) => {
      const j = Math.abs(Math.sin(t * 5 + i * 1.3)) * 18;
      H.figure(x, 320 - j, 4, t, SFC.MainPath.teamLook(P.id, i), P.kit, Math.PI / 2);
    });
    // character giơ cúp: cúp nảy lên xuống trên đầu
    const lift = Math.abs(Math.sin(t * 3)) * 10;
    H.hero(320, 330, 6, t, Math.PI / 2);
    trophy(H, sc.trophy, 320, 330 - HEAD * 6 - 4 - lift, 3, t);
    confetti(H, t, 110);
    H.vignette(0.5);
    if (S.cueOnce('roar', true)) { SFC.Audio.goal(); SFC.Audio.crowdRoar(1); }
  });
})();
