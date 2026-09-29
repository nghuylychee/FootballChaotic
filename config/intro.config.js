/* =========================================================
 * INTRO CONFIG — màn giới thiệu lực lượng 2 đội trước trận (kiểu truyền hình bóng đá). Code: src/ui/intro.js
 * Hiện trước lượt chọn Core đầu trận + giao bóng. Enter / Space / Esc / click: bỏ qua.
 * Thời gian tính bằng giây kể từ lúc mở màn giới thiệu.
 * ========================================================= */
window.SFC_CONFIG = window.SFC_CONFIG || {};

SFC_CONFIG.intro = {
  enabled: true,
  // chế độ có màn giới thiệu: mainPath (Main Path) · training (Luyện tập) · single (trận đơn khác) · online
  // (online: 2 máy cùng chiếu, host giữ trận đứng yên tới khi cả 2 xem xong hoặc quá onlineWait giây)
  modes: ['mainPath', 'online'],
  onlineWait: 4,          // online: host chờ máy kia xem xong thêm tối đa bấy nhiêu giây (sau duration + outro)

  duration: 6.2,          // tự đóng sau bấy nhiêu giây
  skipAfter: 0.35,        // chặn bấm nhầm: chưa cho bỏ qua trong khoảng đầu
  outro: 0.35,            // thời gian trượt ra khi đóng

  // nhịp xuất hiện
  teamIn: 0.25,           // 2 nửa màu áo trượt vào
  vsAt: 0.75,             // chữ VS đập xuống
  cardsAt: 0.9,           // thẻ cầu thủ đầu tiên hiện
  cardGap: 0.22,          // khoảng cách giữa các thẻ (xen kẽ trái / phải)
  statsAt: 1.8,           // thanh chỉ số chạy
  pitchAt: 1.3,           // sơ đồ đội hình: chấm cầu thủ chạy vào vị trí

  // animation sprite trên thẻ cầu thủ
  runIn: 0.55,            // chạy vào (chạy tại chỗ, nhìn vào giữa) rồi quay mặt ra
  poseEvery: 2.4,         // cứ mỗi bấy nhiêu giây tạo dáng 1 lần (FWD: vung chân sút, DEF: tung cú đấm)
  poseTime: 0.35,

  // số áo theo vị trí (character của người chơi: youNumber)
  numbers: { DEF: 4, FWD: 9 },
  youNumber: 10,

  // chỉ số so sánh (key trong stats của đội) + nhãn
  stats: [['speed', 'SPD'], ['power', 'PWR'], ['pass', 'PAS'], ['tackle', 'PHY'], ['dribble', 'DRI'], ['accuracy', 'SHO']],
  // OVR = trung bình chỉ số x ovrScale (1.0 -> 80), giới hạn 1..99. Thanh chỉ số: statMin -> 0%, statMax -> 100%
  ovrScale: 80,
  statMin: 0.7,
  statMax: 1.3,
};
