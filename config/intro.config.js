/* =========================================================
 * INTRO CONFIG — màn giới thiệu lực lượng 2 đội trước trận (kiểu truyền hình bóng đá). Code: src/ui/intro.js
 * Hiện trước lượt chọn Core đầu trận + giao bóng. Enter / Space / Esc / click: bỏ qua.
 * Thời gian tính bằng giây kể từ lúc mở màn giới thiệu.
 * ========================================================= */
window.SFC_CONFIG = window.SFC_CONFIG || {};

SFC_CONFIG.intro = {
  enabled: true,
  // chế độ có màn giới thiệu: mainPath (Main Path) · story (FOOTBALL STORY) · training (Luyện tập) · single (trận đơn khác) · online
  // (online: 2 máy cùng chiếu, host giữ trận đứng yên tới khi cả 2 xem xong hoặc quá onlineWait giây)
  modes: ['mainPath', 'story', 'online'],
  onlineWait: 4,          // online: host chờ máy kia xem xong thêm tối đa bấy nhiêu giây (sau duration + outro)

  duration: 6.2,          // tự đóng sau bấy nhiêu giây
  outro: 0.35,            // thời gian trượt ra khi đóng
  // máy chủ đọc đúng các số trên (Room.wantsIntro / holdIntro); nhịp hiện, thẻ cầu thủ, chỉ số: config/view.config.js (máy chủ không nạp)
};
