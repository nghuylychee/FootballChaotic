/* =========================================================
 * NET CONFIG — chế độ online PvP (1:1).
 * Mô hình host-authoritative: máy chủ phòng chạy toàn bộ mô phỏng,
 * máy khách gửi phím và vẽ lại trạng thái nhận được.
 * Kết nối P2P qua WebRTC (PeerJS); PeerJS server chỉ dùng để "bắt tay" lúc vào phòng.
 * ========================================================= */
window.SFC_CONFIG = window.SFC_CONFIG || {};

SFC_CONFIG.net = {
  protocol: 1,                 // tăng khi đổi định dạng gói tin -> 2 bản khác nhau không vào chung phòng
  peerjsUrl: 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js',
  // Tùy chọn PeerJS; để trống = dùng PeerJS Cloud miễn phí.
  // Tự host PeerServer: { host: 'my-server', port: 9000, path: '/sfc', secure: true }
  peerOptions: {},
  roomPrefix: 'sfc-chaos-',    // id peer = prefix + mã phòng
  codeLength: 5,
  codeChars: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', // bỏ ký tự dễ nhầm (I, O, 0, 1)
  connectTimeout: 12,          // giây chờ kết nối trước khi báo lỗi

  snapshotEvery: 1,            // host gửi trạng thái mỗi N bước mô phỏng (60/N lần/giây; ~0.6KB/gói)
  interpDelay: 0.06,           // giây trễ nội suy ở máy khách (mượt hơn nhưng trễ hơn khi tăng)
  draftTimeLimit: 15,          // giây tối đa để chọn Core trong trận online
  difficulty: 'normal',        // độ khó AI đồng đội trong trận online
};
