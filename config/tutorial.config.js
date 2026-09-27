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
        '# Chuyền sệt (S)',
        'Nhấn S là chuyền ngay, không cần nạp lực — game tự chọn người nhận và lực.',
        'Giữ mũi tên chỉ vào đồng đội khi nhấn S → đường chuyền chuẩn, người nhận tự chạy đón.',
        'Không bấm hướng hoặc chỉ lệch → bóng đi về phía đồng đội gần nhất nhưng luôn lệch hướng và sai lực, người nhận không tự đón — phải tự chạy theo bóng.',
        '# Chuyền có hỗ trợ (W / A)',
        'Giữ W / A để nạp lực, thả ra để chuyền. Bóng đi theo hướng mũi tên đang giữ.',
        'Có đồng đội trong vùng hướng đó → bóng tự căn vào họ. Không có ai → bóng lăn thẳng theo hướng.',
        'Chạm nhẹ đã đủ lực tới chân. Vạch trắng trên thanh = lực mặc định, giữ vượt vạch → bóng căng hơn.',
        'Người nhận tự chạy tới đón bóng. Bấm hướng mới để tự điều khiển.',
        '# Chọc khe & chuyền bổng',
        'W: bóng vào khoảng trống phía trước đồng đội, giữ lâu → càng sâu.',
        'A: bóng bổng qua đầu hậu vệ.',
        '# Sút',
        'Giữ D để nạp, thả để sút. Bóng đi theo hướng phím đang giữ lúc thả (không giữ phím → sút vào giữa khung). Thanh lực bắt đầu từ mức nhỏ, giữ càng lâu bóng càng mạnh.',
        'Giữ quá lâu (thanh đỏ) → tự sút, bóng bay cao và dễ chệch.',
        'Hướng phím chỉ vào khung thành → sút chuẩn. Chỉ lệch ra ngoài cột dọc → bóng vẫn vào góc gần nhất nhưng tư thế gượng, lệch càng nhiều càng dễ chệch.',
        '# Phá bóng',
        'Cầm bóng ở phần sân nhà mà còn cầu thủ đối phương phía trước (không tính người đang trông khung của họ): nhấn D để phá bóng bổng lên phía trước. ↑ / ↓ chỉnh góc.',
        'Phía trước không còn ai → D là sút như bình thường, kể cả từ phần sân nhà.',
      ],
    },
    {
      title: 'PHÒNG NGỰ',
      lines: [
        '# Đòn phòng ngự',
        'Không có tắc bóng: muốn cướp bóng thì phải ra đòn.',
        'D — LIGHT ATTACK: cú đấm thẳng tầm ngắn. Choáng ngắn + đẩy lùi, có thể làm người cầm bóng rơi bóng. Hồi chiêu ngắn.',
        'A — HARD ATTACK: gồng co chân (hào quang đỏ, xoay được hướng) rồi vung chân đá. Trúng: đối thủ bay rất xa, choáng lâu, chắc chắn rơi bóng. Trượt: khựng lâu. Hồi chiêu dài.',
        'Hồi chiêu hiện trên thanh kỹ năng ở giữa đáy màn hình. Ô mờ = đội mình đang giữ bóng (không đánh được).',
        'Z (lướt) đúng lúc đối thủ ra đòn → né được (DODGE).',
        'Chặn đường chuyền: bóng chuyền đi qua tầm với → có cơ hội cắt. Bóng càng chậm, càng đi thẳng vào người càng dễ cắt. Cắt hụt → bóng chạm người rồi đi tiếp.',
        'Giữ W: gọi đồng đội AI lên áp sát người cầm bóng.',
        'Q: đổi sang cầu thủ gần bóng nhất.',
        '# Trông khung thành',
        'Không có thủ môn cố định: ai đứng trong vòng cấm nhà thì thành thủ môn (đeo găng) — bắt được bóng bổng, có thể cứu thua.',
        'Bắt được bóng trong vòng cấm → không thể bị tắc trong vài giây. Tự rê bóng vào vòng cấm thì không được bảo vệ.',
        'Đồng đội AI tự lùi về trông khung khi đối phương tới gần. Giữ W để gọi họ lên áp sát (bỏ trống khung!).',
        'Bóng càng mạnh, càng vào góc → càng khó bắt.',
      ],
    },
    {
      title: 'LUẬT TRẬN',
      lines: [
        '# Street 2v2',
        'Mỗi đội 2 người, tự chia vị trí công / thủ theo chiến thuật. Trận đấu dài 2:30.',
        '# Chế độ điều khiển (Chơi đơn)',
        'CẢ ĐỘI: Q đổi người, chuyền bóng thì điều khiển luôn người nhận.',
        '1 CẦU THỦ: chỉ điều khiển đúng cầu thủ đã chọn cả trận, đồng đội do AI chơi. Đòi bóng bằng S / W / A, giữ W gọi đồng đội áp sát.',
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
