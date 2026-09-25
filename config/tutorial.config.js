/* =========================================================
 * TUTORIAL CONFIG — nội dung màn Hướng dẫn (menu chính).
 * type: 'controls' = tự sinh bảng phím từ controls.config.js
 *       'cores'    = tự sinh danh sách Core từ cores.config.js
 * lines: các dòng giải thích; dòng bắt đầu bằng '#' là tiêu đề nhỏ.
 * ========================================================= */
window.SFC_CONFIG = window.SFC_CONFIG || {};

SFC_CONFIG.tutorial = {
  pages: [
    {
      title: 'ĐIỀU KHIỂN',
      type: 'controls',
    },
    {
      title: 'CHUYỀN & SÚT',
      lines: [
        '# Chuyền có hỗ trợ',
        'Giữ S / W / A để nạp lực, thả ra để chuyền. Bóng đi theo hướng mũi tên đang giữ.',
        'Có đồng đội trong vùng hướng đó → bóng tự căn vào họ. Không có ai → bóng lăn thẳng theo hướng.',
        'Chạm nhẹ đã đủ lực tới chân. Vạch trắng trên thanh = lực mặc định, giữ vượt vạch → bóng căng hơn.',
        'Người nhận tự chạy tới đón bóng. Bấm hướng mới để tự điều khiển.',
        '# Chọc khe & chuyền bổng',
        'W: bóng vào khoảng trống phía trước đồng đội, giữ lâu → càng sâu.',
        'A: bóng bổng qua đầu hậu vệ.',
        '# Sút',
        'Giữ D để nạp, thả để sút. ↑ / ↓ chỉnh góc. Thanh lực bắt đầu từ mức nhỏ, giữ càng lâu bóng càng mạnh.',
        'Giữ quá lâu (thanh đỏ) → tự sút, bóng bay cao và dễ chệch.',
      ],
    },
    {
      title: 'PHÒNG NGỰ',
      lines: [
        '# Đòn phòng ngự',
        'S: tắc bóng khi đứng sát. D: xoạc — trúng thì đối thủ choáng lâu, trượt thì bạn mất nhịp.',
        'A: va vai — đẩy lùi, có thể cướp bóng.',
        'Giữ W: gọi đồng đội AI lên áp sát người cầm bóng.',
        'Q: đổi sang cầu thủ gần bóng nhất.',
        '# Thủ môn',
        'Thủ môn tự động. Khi ôm bóng trong vòng cấm thì không thể bị tắc.',
        'Bóng càng mạnh, càng vào góc → càng khó bắt.',
      ],
    },
    {
      title: 'LUẬT TRẬN',
      lines: [
        '# Street 3v3',
        'Mỗi đội 3 người: thủ môn, hậu vệ, tiền đạo. Trận đấu dài 2:30.',
        'Bóng nảy tường như futsal đường phố — không có biên.',
        '# Final Push',
        '30 giây cuối: mọi bàn thắng được tính x2, cầu thủ chạy nhanh hơn.',
        '# Golden Goal',
        'Hòa khi hết giờ → bàn thắng tiếp theo quyết định (tối đa 60 giây).',
      ],
    },
    {
      title: 'CORE UPGRADE',
      type: 'cores',
      lines: [
        'Sau mỗi bàn thắng, trong lúc bóng chết, cả 2 đội chọn 1 trong 3 Core (tối đa 4 lần mỗi trận).',
        'Core thay đổi cách chơi: sút lửa, lướt ảo ảnh, khiên khung thành, bóng hỗn loạn...',
      ],
    },
    {
      title: 'ONLINE',
      lines: [
        '# Đối kháng 1 vs 1',
        'Một người TẠO PHÒNG và gửi mã phòng 5 ký tự cho bạn.',
        'Người kia chọn VÀO PHÒNG, gõ mã rồi Enter.',
        'Mỗi người chọn đội của mình, chủ phòng bấm BẮT ĐẦU.',
        '# Kết nối',
        'Trận đấu chạy trên máy chủ phòng; máy kia gửi phím và nhận hình.',
        'Hai máy kết nối trực tiếp (P2P) — cần Internet để bắt tay lúc vào phòng.',
        'Trong trận online Esc chỉ mở menu, trận không tạm dừng.',
      ],
    },
  ],
};
