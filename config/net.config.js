/* =========================================================
 * NET CONFIG — chế độ online: phòng 4 slot (2 đội x 2 vị trí), versus hoặc co-op.
 * Mô hình host-authoritative: máy chủ phòng chạy toàn bộ mô phỏng,
 * các máy khách gửi phím và vẽ lại trạng thái nhận được (host nối sao tới từng khách).
 * Kết nối: Steam (lobby + relay, bản Electron có Steam) hoặc WebRTC qua PeerJS (bản web / không có Steam),
 * xem src/net/transport.js. PeerJS server chỉ dùng để "bắt tay" lúc vào phòng.
 * ========================================================= */
window.SFC_CONFIG = window.SFC_CONFIG || {};

SFC_CONFIG.net = {
  protocol: 8,                 // tăng khi đổi định dạng gói tin -> 2 bản khác nhau không vào chung phòng
  useSteam: true,              // false = luôn dùng PeerJS, kể cả bản Electron đang có Steam
  peerjsUrl: 'lib/peerjs.min.js',   // PeerJS 1.5.4, đóng gói kèm game
  // Tùy chọn PeerJS; để trống = dùng PeerJS Cloud miễn phí.
  // Tự host PeerServer: { host: 'my-server', port: 9000, path: '/sfc', secure: true }
  peerOptions: {},
  roomPrefix: 'sfc-chaos-',    // id peer = prefix + mã phòng
  codeLength: 7,               // Steam: mã = 32 bit của lobby id -> cần 7 ký tự (32 ký tự x 7 = 35 bit). PeerJS dùng chung độ dài
  codeChars: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', // bỏ ký tự dễ nhầm (I, O, 0, 1)
  connectTimeout: 12,          // giây chờ kết nối trước khi báo lỗi

  // Phòng: slot = đội x vị trí (game.config.js -> roles). Người chơi tự nhảy qua lại giữa các slot trống.
  //  - 2 đội đều có người = VERSUS; slot trống của đội có đúng 1 người = đồng đội đang chọn của người đó (AI)
  //  - mọi người cùng 1 đội = CO-OP; đội còn lại = đội bot ngẫu nhiên (bots)
  maxPlayers: 4,               // tối đa người trong phòng (<= 2 x số vị trí)
  minPlayers: 2,               // số người tối thiểu để chủ phòng bấm START
  // Đội bot (co-op): 1 đội thường ngẫu nhiên của 1 Area chủ phòng đã tới (mainPath.config.js -> areas[].teams),
  // độ khó AI = độ khó hạng ngẫu nhiên trong Area đó (divs: khoảng hạng, 0 = thấp nhất), sân = sân của Area đó
  bots: { divs: [0, 2] },

  snapshotEvery: 1,            // host gửi trạng thái mỗi N bước mô phỏng (60/N lần/giây; ~0.6KB/gói)
  interpDelay: 0.06,           // giây trễ nội suy ở máy khách (mượt hơn nhưng trễ hơn khi tăng)
  draftTimeLimit: 15,          // giây tối đa để chọn Core trong trận online
  difficulty: 'normal',        // độ khó AI đồng đội trong trận online
};
