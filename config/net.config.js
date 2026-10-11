/* =========================================================
 * NET CONFIG — chế độ online: phòng 4 slot (2 đội x 2 vị trí), versus hoặc co-op.
 * Mô hình host-authoritative: máy chủ phòng chạy toàn bộ mô phỏng,
 * các máy khách gửi phím và vẽ lại trạng thái nhận được (host nối sao tới từng khách).
 * Kết nối: Steam (lobby + relay, bản Electron có Steam) hoặc WebRTC qua PeerJS (bản web / không có Steam),
 * xem src/net/transport.js. PeerJS server chỉ dùng để "bắt tay" lúc vào phòng.
 * ========================================================= */
window.SFC_CONFIG = window.SFC_CONFIG || {};

SFC_CONFIG.net = {
  protocol: 4,                 // tăng khi đổi định dạng gói tin -> 2 bản khác nhau không vào chung phòng
  useSteam: true,              // false = luôn dùng PeerJS, kể cả bản Electron đang có Steam
  pingEvery: 1,                // giây giữa 2 lần đo ping tới máy chạy trận (NETWORK STATS, 0 = tắt)
  // Máy chủ riêng (server/): máy chủ chạy trận, mọi người là khách. url trống = chỉ người chơi làm host (Steam / PeerJS).
  // TẠO PHÒNG thử máy chủ trước, không tới được thì tự chuyển sang người chơi làm host.
  server: {
    url: 'wss://sfc-server.onrender.com',   // máy chủ Render (bản free: ngủ sau 15 phút, ~1 phút để dậy) · chạy thử máy chủ trên máy này: npm run online (tự gắn url, không cần sửa ở đây)
    codeFirst: '23456789',     // ký tự đầu của mã phòng máy chủ riêng (mã Steam luôn bắt đầu A-D, mã PeerJS tránh các ký tự này)
                               // -> mọi mã đều dài codeLength, người chơi không phân biệt được, VÀO PHÒNG tự biết phòng loại nào
    connectTimeout: 5,         // giây chờ 1 lần thử kết nối
    wakeTimeout: 70,           // giây chờ máy chủ đang ngủ dậy (gói miễn phí ~1 phút) trước khi TẠO PHÒNG tự host; Esc bỏ chờ
    keepAlive: 60,             // giây giữa 2 gói giữ máy chủ thức khi đang ở phòng máy chủ riêng (0 = tắt)
    snapshotEvery: 2,          // máy chủ gửi trạng thái 30 lần/giây (đỡ băng thông; khách vẫn nội suy mượt)
    interpDelay: 0.05,         // trễ nội suy tối thiểu ở máy khách phòng máy chủ riêng (đệm tự tăng theo độ giật, tới net.interpMax)
  },
  peerjsUrl: 'lib/peerjs.min.js',   // PeerJS 1.5.4, đóng gói kèm game
  // Tùy chọn PeerJS; để trống = dùng PeerJS Cloud miễn phí.
  // Tự host PeerServer: { host: 'my-server', port: 9000, path: '/sfc', secure: true }
  peerOptions: {},
  roomPrefix: 'sfc-chaos-',    // id peer = prefix + mã phòng
  codeLength: 7,               // Steam: mã = 32 bit của lobby id -> cần 7 ký tự (32 ký tự x 7 = 35 bit). PeerJS dùng chung độ dài
  codeChars: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', // bỏ ký tự dễ nhầm (I, O, 0, 1)
  connectTimeout: 12,          // giây chờ kết nối trước khi báo lỗi
  reconnectGrace: 30,          // giây giữ slot cho người mất kết nối giữa trận (AI đá thay, vào lại được). 0 = tắt

  // Phòng: slot = đội x vị trí (game.config.js -> roles). Người chơi tự nhảy qua lại giữa các slot trống.
  //  - 2 đội đều có người = VERSUS; slot trống của đội có đúng 1 người = đồng đội đang chọn của người đó (AI)
  //  - mọi người cùng 1 đội = CO-OP; đội còn lại = đội bot ngẫu nhiên (bots)
  maxPlayers: 6,               // tối đa người trong phòng (<= 2 x số vị trí: 3v3 = 6)
  minPlayers: 2,               // số người tối thiểu để chủ phòng bấm START
  // Đội bot (co-op): 1 đội thường ngẫu nhiên của 1 Area chủ phòng đã tới (mainPath.config.js -> areas[].teams),
  // độ khó AI = độ khó ở 1 mức Elo ngẫu nhiên trong Area đó (span: phần khoảng Elo, 0 = đầu Area, 1 = cuối Area), sân = sân của Area đó
  bots: { span: [0, 1] },

  // Tìm trận xếp hạng Main Path (PLAY > START khi không có bạn trong phòng) trên máy chủ riêng: src/net/matchmaker.js.
  // Người thật thay người chơi giả; ghế còn trống = người chơi giả (bot). Không có máy chủ / không tới được / máy chủ bận /
  // không ai để ghép -> game tự ghép người chơi giả như chơi một mình (mainPath.matchmaking), người chơi không thấy khác gì.
  queue: {
    range: [100, 400],         // ghép được khi lệch Elo <= khoảng này: nới dần từ range[0] tới range[1] trong widen giây chờ
    widen: 15,
    anyAfter: 20,              // chờ quá bấy nhiêu giây: ghép với bất kỳ ai (ít người chơi thì vẫn gặp được nhau)
    gather: 5,                 // đã có người hợp: người chờ lâu nhất phải chờ ít nhất bấy nhiêu giây (xem có thêm người tới không)
    aloneWait: [6, 12],        // hàng không có ai khác: sau bấy nhiêu giây (ngẫu nhiên trong khoảng) -> đá với người chơi giả
    maxWait: 30,               // chờ tối đa (có người khác nhưng chưa hợp)
    joinWait: 5,               // ghép xong: ai chưa vào phòng sau bấy nhiêu giây -> người chơi giả thế chỗ
  },

  snapshotEvery: 1,            // host gửi trạng thái mỗi N bước mô phỏng (60/N lần/giây; ~0.6KB/gói)
  interpDelay: 0.06,           // giây trễ nội suy ở máy khách (mượt hơn nhưng trễ hơn khi tăng) — mức thấp nhất
  // đệm tự điều chỉnh: máy khách đo độ "giật" của snapshot (gói tới dồn cục / trễ thất thường) trong ~2 giây gần nhất,
  // đệm = độ giật (phân vị jitterPct) + 1 khoảng snapshot + jitterPad, trong [interpDelay, interpMax]. Tăng ngay, giảm từ từ
  interpMax: 0.3,
  // dự đoán cầu thủ của mình ở máy khách (src/net/predict.js): chạy ngay theo phím thay vì chờ 1 lần khứ hồi.
  // corr: tốc độ kéo phần lệch về vị trí máy chủ (/giây; lớn = sửa nhanh nhưng giật) · dead: lệch dưới bấy nhiêu px thì bỏ qua
  // snap: lệch quá bấy nhiêu px thì nhảy thẳng · blendOut: giây trượt về vị trí máy chủ khi hết dự đoán (bị choáng, lướt, sút...)
  // lag: ms vẽ cầu thủ trễ hơn dự đoán (0 = phản hồi ngay; tăng = bớt chạy trước thế giới, phím chậm hơn bấy nhiêu)
  // extra: ms cộng thêm vào ping khi so với máy chủ (phím chờ bước mô phỏng + chờ snapshot + khung hình vẽ)
  predict: { enabled: true, corr: 4, dead: 1.5, snap: 48, blendOut: 0.15, lag: 0, extra: 30 },
  jitterPct: 0.95,
  jitterPad: 0.015,
  draftTimeLimit: 15,          // giây tối đa để chọn Core trong trận online
  difficulty: 'normal',        // độ khó AI đồng đội trong trận online
};
