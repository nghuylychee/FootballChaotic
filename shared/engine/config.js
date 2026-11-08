/* DỰNG SFC_CONFIG — chạy 1 lần ngay sau khi nạp xong config/*.config.js, trước mọi code đọc config.
 * File config chỉ là dữ liệu: mỗi file ghi đúng khoá của mình (SFC_CONFIG.game, SFC_CONFIG.stories...), không chạy code, không sửa file khác.
 * Mọi số suy ra và mọi chỗ gộp dữ liệu giữa các file nằm ở đây, nên con số trong file config là giá trị gốc:
 *  - cỡ sân / cỡ người: game.pitchScale, game.render.playerScale -> nhân các số theo sân / theo người (scaleGame)
 *  - đội Main Path / Story / Elite + đội riêng của người chơi -> teams.list; luật trận Elite -> stories.mods; đối thủ Elite -> run.elites
 *  - tắt gacha Core -> bỏ Hộp Core khỏi progression.boxOrder
 * Máy chủ trận riêng nạp file này (đổi = tăng phiên bản máy chủ). Phần chỉ máy người chơi (view, trận mơ PROLOGUE, luật cửa hàng):
 * src/engine/config-client.js. Mỗi khối kiểm tra khoá có mặt: sandbox / máy chủ không nạp đủ mọi file config.
 */
(function () {
  const C = window.SFC_CONFIG;

  // THỬ SÂN TO: áp pitchScale lên khung trận, sân và các số theo chiều dài sân (giá trị trong game.config.js là gốc, pitchScale 1).
  // Số theo khung thành (tầm sút), tầm đấm và Core giữ nguyên; khoảng cách bóng - chân và tầm khống chế bóng theo cỡ người (render.playerScale).
  // Bỏ thử nghiệm: xoá hàm này + game.pitchScale
  function scaleGame(G) {
    const k = G.pitchScale || 1;
    if (k === 1) return;
    const kw = 1 + (k - 1) * 0.75;              // chiều rộng sân to chậm hơn chiều dài (1,2 -> 1,15)
    const even = (v) => 2 * Math.round(v / 2), r = Math.round, mul = (a, f) => a.map((v) => r(v * f));
    const R = G.render, F = G.field, P = G.pass, A = G.ai;
    // khung trận + sân: giữa khung theo chiều ngang. Chiều dọc: chỗ trống ngoài sân + tường trên (46) + viền dưới (18) chia cho trên / dưới
    // đúng tỉ lệ sân gốc (34 : 16) -> chiều rộng sân to chậm hơn khung cũng không dồn hết phần thừa xuống dưới (dải đất trống, user 2026-11-07)
    const W0 = R.width, H0 = R.height, above = F.y - 46, below = H0 - F.y - F.h - 18;
    R.width = even(W0 * k); R.height = even(H0 * k); R.maxView = R.maxView.map((v) => even(v * k));
    F.w = even(F.w * k); F.h = even(F.h * kw); F.x = r((R.width - F.w) / 2);
    F.y = 46 + r((R.height - F.h - 46 - 18) * above / (above + below));
    // tốc độ: tăng ít hơn sân (chạy x 1/4, chuyền x 0,7, phá bóng x 1/2 phần tăng) -> qua sân lâu hơn nhưng không lê thê
    G.player.speed = r(G.player.speed * (1 + (k - 1) * 0.25));
    P.maxSpeed = r(P.maxSpeed * (1 + (k - 1) * 0.7));
    G.kick.clearSpeed = r(G.kick.clearSpeed * (1 + (k - 1) * 0.5));
    // khoảng cách theo chiều dài sân
    P.maxDist = r(P.maxDist * k); P.freeMaxDist = r(P.freeMaxDist * k); P.throughLeadMax = r(P.throughLeadMax * k);
    P.through.runMax = r(P.through.runMax * k); P.through.lead = r(P.through.lead * k);
    A.restDefenseDist = r(A.restDefenseDist * k); A.openSpot.radius = mul(A.openSpot.radius, k);
    A.runs.lane.maxDist = r(A.runs.lane.maxDist * k); A.runs.lane.dist = mul(A.runs.lane.dist, k);
    { const O = A.runs.overlap; for (const key of ['level', 'maxDist', 'back', 'ahead']) O[key] = r(O[key] * k); O.hold.back = r(O.hold.back * k);
      O.out = r(O.out * kw); O.minRoom = r(O.minRoom * kw); O.hold.inside = r(O.hold.inside * kw); }   // chạy chồng biên: dọc x k, ngang x kw
    A.keeperCoverDist = r(A.keeperCoverDist * k); A.mateKeeperCoverDist = r(A.mateKeeperCoverDist * k); A.keeperPressDist = r(A.keeperPressDist * k);
    A.gkPunt.dist = mul(A.gkPunt.dist, k);
    // ÁP SÁT theo cỡ sân (user 2026-11-08: sân to -> cầu thủ đứng thưa, bot hai đội ít lao vào đấm hơn ~20-35%): khoảng cách quyết định
    // lao vào đánh người cầm bóng + khoảng kèm người x k. Tầm đấm / Hard attack (theo thân người) giữ nguyên
    A.press.engage = r(A.press.engage * k); A.press.counterDist = r(A.press.counterDist * k);
    A.helpPress.near = r(A.helpPress.near * k); A.helpPress.ctlNear = r(A.helpPress.ctlNear * k);
    A.markDistance = r(A.markDistance * k);
    if (A.keeperHome) { A.keeperHome.depth = r(A.keeperHome.depth * k); if (A.keeperHome.rush) A.keeperHome.rush.dist = r(A.keeperHome.rush.dist * k); }
    // theo chiều rộng sân
    G.firstTime.cross.wide = r(G.firstTime.cross.wide * kw);
    // THỂ LỰC (user 2026-11-07: sân rộng hơn -> nước rút lâu hơn, hồi nhanh hơn): tiêu hao / pitchScale (30 -> 21), hồi x kw (32 -> 42)
    G.player.staminaDrain = r(G.player.staminaDrain / k); G.player.staminaRegen = r(G.player.staminaRegen * kw);
    // DẪN BÓNG (user 2026-11-07: người to + sân to -> bóng nảy ra xa chân hơn tương ứng): khoảng cách bóng - chân + nhịp chạm theo cỡ người
    // (render.playerScale, 6 -> 8, nước rút 9 -> 12, chạm mỗi 30 -> 39 px), độ nảy ra mỗi nhịp chạm khi nước rút theo cỡ sân (3 -> 4)
    const kp = R.playerScale || 1, B = G.ball, DR = B.dribble;
    B.dribbleOffset = r(B.dribbleOffset * kp); DR.sprintOffset = r(DR.sprintOffset * kp); DR.tapEvery = r(DR.tapEvery * kp);
    DR.tapLead = r(DR.tapLead * k);
    P.firstTouch.max = r(P.firstTouch.max * kp);   // chạm bóng đầu tiên: bóng trôi xa chân theo cỡ người
    // tầm khống chế bóng theo cỡ người (user 2026-11-08: 7 -> 9 px, cao 15 -> 20 px — bóng ngang hông / sát chân người to mà không chạm được)
    B.pickupRange = r(B.pickupRange * kp); B.pickupHeight = r(B.pickupHeight * kp);
  }
  if (C.game) scaleGame(C.game);

  // tắt gacha Core -> ẩn Hộp Core khỏi SHOP
  const PG = C.progression;
  if (PG && !PG.coreGacha) PG.boxOrder = PG.boxOrder.filter((id) => PG.boxes[id].kind !== 'core');

  // mọi đội dùng chung 1 danh sách đội của trận (teams.list; không thêm vào teams.order)
  const list = C.teams && C.teams.list;
  if (list) {
    // đội Main Path + đội riêng của người chơi (tên thật thay vào lúc dựng trận)
    const MP = C.mainPath;
    if (MP) {
      Object.assign(list, MP.teams);
      const P = MP.playerTeam;
      list[P.id] = { name: P.nameFormat.replace('{name}', 'PLAYER'), short: P.short, tagline: P.tagline, desc: P.desc, kit: P.kit, stats: P.stats, coreWeights: P.coreWeights, aiStyle: P.aiStyle, players: P.players };
    }
    // đội FOOTBALL STORY
    if (C.stories) Object.assign(list, C.stories.teams);
    // đội Elite của GOAT PATH
    if (C.elites) Object.assign(list, C.elites.teams);
  }
  // Elite: luật trận dùng chung bảng stories.mods (MatchMods đọc 1 chỗ) · dữ liệu đối thủ như 1 vòng Story -> run.elites (SFC.Run.opp)
  if (C.elites) {
    if (C.stories) Object.assign(C.stories.mods, C.elites.mods);
    if (C.run) C.run.elites = C.elites.opponents;
  }
})();
