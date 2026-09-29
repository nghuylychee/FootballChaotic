# Đồng đội & Scout — vector nâng cấp thứ 2 (2026-09-30)

> Số liệu: `config/teammates.config.js` · logic: `src/core/teammates.js` (SFC.Mates) · UI: `src/ui/team.js` (NHÂN VẬT → TEAM)

## Quyết định đã chốt
| Chủ đề | Quyết định |
|---|---|
| Core | **Của riêng từng cầu thủ** (cả đối thủ): mỗi lượt chọn Core, người chơi chọn 1 lá cho character; đồng đội + 2 cầu thủ đối thủ tự bốc 1 lá cho mình. Core chỉ kích hoạt từ hành động của người sở hữu, scale theo chỉ số người đó |
| Cộng hưởng | Tính **riêng từng người** (HUD: build kiểu TFT của bạn + dòng MATE; đội kia mỗi người 1 dòng) |
| Tuyệt kỹ | Mỗi người 1 Tuyệt kỹ, năng lượng riêng (`p.res.ult`). AI (kể cả đồng đội) tự dùng Tuyệt kỹ của mình |
| Nhịp (TIKI-TAKA) | Vẫn là tài nguyên **chung của đội** (chạy khi người chuyền / nhận có TIKI-TAKA) |
| Kinh tế | Scout **miễn phí** (chỉ tốn giờ thật) · tuyển mất **phí chuyển nhượng** theo OVR + độ hiếm deck · bán nhận lại 40% |
| Đội hình | Tối đa **5**, ROOKIE (OVR 70, deck cơ bản) miễn phí từ đầu, luôn giữ ≥ 1 người |

## Đồng đội
- **OVR cố định**, 6 chỉ số riêng quanh OVR (trường phái chính của deck cao hơn). Vào trận: chỉ số → hệ số `Player.stats` giống character.
- **Deck Core** 6–9 lá (+ có thể 1 Tuyệt kỹ): ~55% trường phái chính, ~30% trường phái phụ. Độ hiếm theo "bậc deck" = ⌊Area/2⌋ + bonus trạm scout.
- **Hạng** C / B / A / S / SS theo `OVR + 3 × độ hiếm trung bình deck` → màu viền theo độ hiếm.
- Chọn đồng đội ra sân: màn Main Path (mục TEAMMATE) hoặc NHÂN VẬT → TEAM (Enter). Luyện tập 2 người cũng dùng đồng đội đang chọn.

## Scout
- 1 chuyến 1 lúc. Bắt đầu → ứng viên sinh ngay (theo Area xa nhất + cấp trạm), lộ ra khi hết giờ → **báo cáo 3 ứng viên** (chỉ số + deck + phí) → chọn 1 (Enter) hoặc bỏ cả 3 (X 2 lần). Esc = để quyết sau (báo cáo được giữ).
- OVR ứng viên ≈ `66 + 3.2 × Area + bonus trạm ± 5` (6% "ngọc thô" +7).
- **Trạm scout** LV1→5 (gold 400 / 1000 / 2200 / 4000): 20 → 12 → 8 → 5 → 3 phút, OVR +0…+5, bậc deck +0…+2.
- Hình: bản đồ thế giới pixel, máy bay bay vòng quanh khi đang scout, điểm scout nhấp nháy; xong thì đậu tại điểm scout.

## Cân bằng (giả lập AI vs AI, 200 trận)
Core riêng từng người: **5.81 bàn / đội / trận** (trước: 5.76 khi Core dùng chung đội), ~2.5 Tuyệt kỹ / trận, 2 bên 107 / 93 thắng.
